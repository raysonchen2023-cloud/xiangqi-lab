// 評比第 17、18 輪第 5 項「背景暫停與按需預載」（開發者 11/14 選）的自動測試，不開瀏覽器：
//   ① 把 m/00-util.js 的背景暫停小工具（bgpHid／bgpOn／bgpEvery／bgpStop）和 m/09b-preload.js 的預載（PRE、preloadAll、preBg、preNeed、preGate…）原樣切出來，
//      放進 vm，給假的 document.hidden／visibilitychange、假的 fetch、假的 Cache Storage、假的計時器（虛擬時鐘），跑「前景 → 背景 → 恢復」三段
//   ② 首次開啟只排首批；沒進觀星臺（黑洞）、西市時那一區的檔不在下載佇列，走進去才排；別的朝代的檔換到那一朝才排
//   ③ 省流量（saveData、2G／3G）不補選讀；preOptWait（大師對局等選讀大檔）在背景不輪詢
//   ④ xiangqi-lab/tools/preload-list.js：分區層級 "z:<分區>"、zones、--retier 只改層級（版本 v、網址、大小、指紋都不變）；舊版 App 的層級規則讀到新清單照樣能用
//   ⑤ 接線：各模組的輪詢計時器改用背景會停的 bgpEvery（沒有 00-util 的測試環境退回 setInterval）；3D 的動畫迴圈在背景不再排下一格
// 用法：node --test xiangqi-lab/tools/test-preload-bg.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), os = require("os");
const ROOT = path.join(__dirname, "../.."), M = path.join(ROOT, "xiangqi-db/m"), SRC = path.join(ROOT, "xiangqi-lab/src");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const UTIL = rd(path.join(M, "00-util.js")), PRE = rd(path.join(M, "09b-preload.js"));
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到：" + a.slice(0, 40)); const j = s.indexOf(b, i); assert.ok(j > i, "找不到：" + b.slice(0, 40)); return s.slice(i, j) };
const BGP_SRC = cut(UTIL, "const BGP=", "const $=s=>");
const PRE_SRC = cut(PRE, "const PRE_KEY=", "setTimeout(()=>{try{preloadAll()");
const PL = require(path.join(__dirname, "preload-list.js"));
const flush = async (n = 6) => { for (let i = 0; i < n; i++) await new Promise(r => setImmediate(r)) };

/* ---------- 假的手機：虛擬時鐘、計時器、DOM、網路、快取 ---------- */
function phone(o = {}) {
  let now = 1e6, seq = 0;
  const timers = new Map(), fires = [], reqs = [], cache = new Map(), store = new Map(Object.entries(o.store || {})), L = { doc: {}, win: {} };
  const at = () => now;
  const addT = (fn, ms, iv) => { const id = ++seq; timers.set(id, { fn, t: now + Math.max(0, +ms || 0), ms: Math.max(1, +ms || 0), iv }); return id };
  const on = (B, t, f) => { (B[t] = B[t] || []).push(f) };
  class El {
    constructor(tag) { this.tag = tag; this.style = {}; this.dataset = {}; this.kids = []; this.parent = null; this.cls = new Set(); this.textContent = ""; this.hidden = false; this._id = "" }
    set id(v) { this._id = v } get id() { return this._id }
    set className(v) { this.cls = new Set(String(v).split(/\s+/).filter(Boolean)) } get className() { return [...this.cls].join(" ") }
    get classList() { const c = this.cls; return { add: (...a) => a.forEach(x => c.add(x)), remove: (...a) => a.forEach(x => c.delete(x)), contains: x => c.has(x), toggle: (x, f) => (f === undefined ? !c.has(x) : f) ? c.add(x) : c.delete(x) } }
    set innerHTML(v) { this._html = v; this.kids = [] } get innerHTML() { return this._html || "" }
    get isConnected() { let e = this; while (e) { if (e === D.body || e === D.head) return true; e = e.parent } return false }
    get firstChild() { return this.kids[0] || (this.kids[0] = Object.assign(new El("i"), { parent: this })) }
    querySelector() { const e = new El("x"); e.parent = this; return e }
    querySelectorAll() { return [this.querySelector(), this.querySelector()] }
    append(...a) { for (const e of a) { e.parent = this; this.kids.push(e) } }
    remove() { if (this.parent) this.parent.kids = this.parent.kids.filter(x => x !== this); this.parent = null }
    setAttribute() { } addEventListener() { }
  }
  const find = (e, id) => { for (const k of e.kids) { if (k.id === id) return k; const r = find(k, id); if (r) return r } return null };
  const D = { hidden: false, visibilityState: "visible", head: new El("head"), body: new El("body"), createElement: t => new El(t), getElementById: id => find(D.body, id) || find(D.head, id),
    querySelector: () => null, querySelectorAll: () => [], addEventListener: (t, f) => on(L.doc, t, f), fonts: { add() { } } };
  const conn = { saveData: !!o.saveData, effectiveType: o.effectiveType || "4g", addEventListener() { } };
  const nav = { onLine: true, connection: conn };
  const base = "http://t/app/", rel = u => String(u).replace(base, "").replace(/\?.*$/, "");
  const delayOf = o.delay || (() => 200);
  const ctx = {
    console, URL, Math, JSON, Object, Array, String, Number, Set, Map, Promise, Error, RegExp, isFinite, AbortController,
    Date: class extends Date { static now() { return now } },
    performance: { now: () => now - 1e6 },
    setTimeout: (f, ms) => addT(f, ms, false), clearTimeout: id => timers.delete(id),
    setInterval: (f, ms) => addT(f, ms, true), clearInterval: id => timers.delete(id),
    addEventListener: (t, f) => on(L.win, t, f), document: D, navigator: nav, location: { hash: "#/", href: base },
    sessionStorage: { getItem: () => null, removeItem() { } }, matchMedia: () => ({ matches: true }), innerWidth: 390,
    store: { get: (k, d) => store.has(k) ? JSON.parse(store.get(k)) : d, set: (k, v) => store.set(k, JSON.stringify(v)) },
    OFF: true, keepAwake() { }, psetBoard: () => false, parkLoad: () => Promise.resolve(), loadScript: () => Promise.resolve(),
    Image: class { set src(v) { this._s = v } get src() { return this._s } decode() { return Promise.resolve() } },
    FontFace: undefined,
    caches: { open: async () => ({ keys: async () => [...cache.keys()].map(url => ({ url })), match: async u => cache.has(u) ? { headers: { get: () => null } } : undefined, put: async (u) => { cache.set(u, 1) }, delete: async u => cache.delete(u) }) },
    fetch: (u, op) => {
      if (rel(u) === "data/preload.json") return Promise.resolve({ ok: true, json: async () => JSON.parse(JSON.stringify(o.list)) });
      const r = { u: rel(u), t: now, hidden: D.hidden };
      reqs.push(r);
      return new Promise((ok, no) => {
        const id = addT(() => { r.done = now; ok({ ok: true, status: 200, headers: { get: () => null } }) }, delayOf(r.u), false);
        timers.get(id).net = true;
        if (op && op.signal) op.signal.addEventListener("abort", () => { timers.delete(id); r.aborted = now; no(new Error("AbortError")) });
      });
    }
  };
  vm.createContext(ctx); vm.runInContext("this.window=this;", ctx);
  vm.runInContext(BGP_SRC + "\n;this.__B={BGP,bgpHid,bgpOn,bgpEvery,bgpStop,bgpSet};", ctx);
  vm.runInContext(PRE_SRC + "\n;this.__P={PRE,preloadAll,preNeed,preGate,preStat,preBgText,preOpt,preOptWait,preKind,PRE_IDLE_WAIT,PRE_IDLE_IN};", ctx);
  const P = ctx.__P, B = ctx.__B;
  ctx.route = () => { const p = (ctx.location.hash.replace(/^#/, "") || "/").split("/").filter(Boolean); P.preGate(p) };
  /* 跑虛擬時間：每 10 毫秒推一格，到時間的計時器照順序觸發（net＝假網路的延遲，不算 App 的計時器），每格清一次微任務 */
  const run = async ms => {
    const end = now + ms;
    while (now < end) {
      now = Math.min(end, now + 10);
      for (; ;) {
        let best = null; for (const [id, x] of timers) if (x.t <= now && (!best || x.t < best[1].t)) best = [id, x];
        if (!best) break; const [id, x] = best;
        if (x.iv) x.t += x.ms; else timers.delete(id);
        if (!x.net) fires.push({ t: now, hidden: D.hidden });
        try { x.fn() } catch (e) { }
        await flush(2);
      }
      await flush(2);
    }
  };
  const setHidden = h => { D.hidden = h; D.visibilityState = h ? "hidden" : "visible"; for (const f of L.doc.visibilitychange || []) f() };
  const input = () => { for (const f of L.win.pointerdown || []) f() };
  return { ctx, P, B, run, reqs, fires, cache, store, setHidden, input, at, D, nav, conn, timers };
}

/* 測試用的清單：首批（0）、目前朝代首批（classic）、別的朝代（qin 的首批與背景）、選讀（1）、黑洞分區、西市分区 */
const LIST = {
  v: "t1", items: [
    ["data/icons/ui_a.webp", 1000, "a1", 0], ["data/fonts/f.woff2", 3000, "a2", 0], ["data/loading/ld01.webp", 2000, "a3", 0],
    ["data/boards/classic.webp", 4000, "b1", "classic"],
    ["data/boards/qin.webp", 4000, "q1", "qin"], ["data/hubmap/learn_qin.webp", 4000, "q2", 1],
    ["data/levels/lv1.webp", 5000, "o1", 1], ["data/levels/lv2.webp", 5000, "o2", 1], ["data/shipmap/book1.webp", 5000, "o3", 1], ["data/hubmap/learn_classic_autumn.webp", 5000, "o4", 1],
    ["data/gxground/beichen.webp", 6000, "z1", "z:bh"], ["data/guanxing/gx_tai.webp", 6000, "z2", "z:bh"],
    ["data/ximarket/xm_day.webp", 6000, "x1", "z:xm"]
  ],
  pages: { guanxing: ["^data/guanxing/"], ximarket: ["^data/ximarket/"] },
  zones: { bh: { pages: ["guanxing"] }, xm: { pages: ["ximarket"] } }
};
const FIRST = ["data/icons/ui_a.webp", "data/fonts/f.woff2", "data/loading/ld01.webp", "data/boards/classic.webp"];
const OPT = ["data/levels/lv1.webp", "data/levels/lv2.webp", "data/shipmap/book1.webp", "data/hubmap/learn_classic_autumn.webp"];
const ZBH = ["data/gxground/beichen.webp", "data/guanxing/gx_tai.webp"], ZXM = ["data/ximarket/xm_day.webp"], QIN = ["data/boards/qin.webp", "data/hubmap/learn_qin.webp"];
const urls = R => R.map(r => r.u), J = x => JSON.parse(JSON.stringify(x));
const boot = async (H, ms) => { H.P.preloadAll(); await H.run(ms || 2000) };

test("首次開啟只排首批（不分朝代的 0＋目前朝代）；首批好了 30 秒內、選讀一個都不排", async () => {
  const H = phone({ list: LIST });
  await boot(H, 3000);
  assert.equal(H.P.PRE.first, true, "首批好了");
  assert.deepEqual(urls(H.reqs).sort(), FIRST.slice().sort(), "開 App 只下載首批");
  await H.run(25000);
  assert.deepEqual(urls(H.reqs).sort(), FIRST.slice().sort(), "首批好了 25 秒內還是只有首批（選讀等閒置 30 秒）");
  const S = H.P.preStat(); assert.equal(S.left, OPT.length, "還能補的＝選讀 4 個"); assert.equal(S.later, QIN.length + ZBH.length + ZXM.length, "先不下載的＝別的朝代＋兩個分區");
  assert.equal(H.P.preBgText(S), "還有 4 個檔在背景下載（約 1 MB）");
});

test("閒置後才慢慢補選讀（一次最多 2 個）；玩家一直在點就先不補；別的朝代、沒進過的分區始終不在佇列", async () => {
  const H = phone({ list: LIST, delay: u => /levels|shipmap|hubmap/.test(u) ? 5000 : 200 });
  await boot(H, 3000);
  for (let i = 0; i < 12; i++) { await H.run(2500); H.input() }   /* 首批後 30 秒都在點畫面 */
  assert.equal(urls(H.reqs).filter(u => OPT.includes(u)).length, 0, "玩家在點畫面時不補選讀");
  await H.run(6000);
  const fly = H.reqs.filter(r => OPT.includes(r.u) && !r.done && !r.aborted).length;
  assert.ok(fly >= 1 && fly <= 2, "閒置 4 秒以後開始補，同時最多 2 個（現在 " + fly + "）");
  await H.run(15000);
  assert.deepEqual(urls(H.reqs).filter(u => OPT.includes(u)).sort(), OPT.slice().sort(), "選讀都補齊了，每個只下載一次");
  for (const u of [...QIN, ...ZBH, ...ZXM]) assert.ok(!urls(H.reqs).includes(u), "沒進去就不下載：" + u);
  assert.equal(H.P.preBgText(H.P.preStat()), "常用的都下載好了；其他朝代、西市、觀星臺第一次去時才下載");
  const n0 = H.fires.length; await H.run(60000);
  assert.ok(H.fires.length - n0 <= 1, "剩下的都是先不下載的：背景下載整個停下，不再輪詢（60 秒內 App 計時器觸發 " + (H.fires.length - n0) + " 次）");
});

test("前景 → 背景 → 恢復：背景 20 秒預載請求 0、可暫停的計時器不觸發；正在下載的中斷不算失敗，恢復後接著下載、下載好的不重下", async () => {
  const H = phone({ list: LIST, delay: u => /levels|shipmap|hubmap/.test(u) ? 4000 : 200 });
  let tick = 0; H.B.bgpEvery(() => tick++, 1000);
  await boot(H, 3000);
  await H.run(32000);   /* 閒置 30 秒：開始補選讀，這時有 2 個正在下載 */
  const fly = H.reqs.filter(r => OPT.includes(r.u) && !r.done);
  assert.equal(fly.length, 2, "切背景前正在下載 2 個選讀");
  const done0 = H.reqs.filter(r => r.done).map(r => r.u);
  /* 前景 */
  const t0 = tick; assert.ok(t0 >= 30, "前景時 bgpEvery 照常每秒觸發（" + t0 + "）");
  /* 背景 20 秒 */
  H.setHidden(true);
  const r0 = H.reqs.length, f0 = H.fires.length; await H.run(20000);
  assert.equal(H.reqs.length - r0, 0, "背景 20 秒：預載請求 0");
  assert.equal(tick, t0, "背景 20 秒：bgpEvery 的計時器一次都沒觸發");
  assert.equal(H.fires.length - f0, 0, "背景 20 秒：App 的計時器（預載輪詢、存記錄、逾時）一次都沒觸發");
  for (const r of fly) assert.ok(r.aborted && !r.done, "切背景時正在下載的中斷：" + r.u);
  for (const r of fly) { const x = H.P.PRE.pend.get(r.u); assert.ok(x && !(x.tries > 0) && !(x.wait > 0), "中斷的不算失敗、不等 30 秒重試：" + r.u) }
  /* 恢復 20 秒 */
  H.setHidden(false); await H.run(20000);
  assert.ok(tick - t0 >= 18, "回前景 bgpEvery 接著跑（" + (tick - t0) + "）");
  const after = H.reqs.slice(r0);
  for (const r of fly) assert.ok(after.some(x => x.u === r.u), "回前景重新下載中斷的：" + r.u);
  for (const u of done0) assert.ok(!after.some(x => x.u === u), "下載好的不重下：" + u);
  assert.equal(H.P.preStat().left, 0, "選讀都補齊");
  assert.ok(H.reqs.every(r => !r.hidden), "所有預載請求都是在前景發出的");
});

test("首批下載到一半切到背景：首批也停（不開新的、正在下載的中斷），回前景接著把首批下載完才進首頁", async () => {
  const H = phone({ list: LIST, delay: () => 3000 });
  H.P.preloadAll(); await H.run(500);
  const r0 = H.reqs.length; assert.ok(r0 >= 1);
  H.setHidden(true); await H.run(20000);
  assert.equal(H.reqs.length, r0, "背景不開新的下載");
  assert.equal(H.P.PRE.first, false, "首批還沒好");
  H.setHidden(false); await H.run(8000);
  assert.equal(H.P.PRE.first, true, "回前景接著下載完首批");
  for (const u of FIRST) assert.ok(H.P.PRE.pend.get(u) === undefined, "首批都到了：" + u);
  assert.ok(H.reqs.slice(r0).every(r => !r.hidden));
});

test("第一次走進觀星臺：整個黑洞分區才排進下載（水墨等待畫面），記在 preZ；西市照樣不排；之後再進不用等", async () => {
  const H = phone({ list: LIST });
  await boot(H, 3000);
  const need0 = J(H.P.preNeed([]).map(x => x.u)); for (const u of [...ZBH, ...ZXM]) assert.ok(!need0.includes(u), "首頁不需要分區的檔：" + u);
  H.ctx.location.hash = "#/guanxing";
  const need = J(H.P.preNeed(["guanxing"]).map(x => x.u)).sort();
  assert.deepEqual(need, ZBH.slice().sort(), "進觀星臺＝整個黑洞分區（觀星臺＋星系地面），不含西市");
  assert.deepEqual(H.store.get("preZ") && JSON.parse(H.store.get("preZ")), ["bh"], "記下進過黑洞分區");
  assert.equal(H.P.preGate(["guanxing"]), true, "還沒下載到：先蓋等待畫面");
  await H.run(3000);
  for (const u of ZBH) assert.ok(urls(H.reqs).includes(u), "等待畫面下載了：" + u);
  for (const u of ZXM) assert.ok(!urls(H.reqs).includes(u), "西市沒進去就不下載：" + u);
  assert.equal(H.P.preGate(["guanxing"]), false, "都到了：直接進");
  H.ctx.location.hash = "#/ximarket";
  assert.deepEqual(J(H.P.preNeed(["ximarket"]).map(x => x.u)), ZXM, "走進西市才排西市");
});

test("進過的分區在背景補齊（必要，不等閒置）；換到別的朝代時那一朝的首批才排", async () => {
  const H = phone({ list: LIST, store: { preZ: JSON.stringify(["bh"]) } });
  await boot(H, 3000);
  for (const u of ZBH) assert.ok(urls(H.reqs).includes(u), "上次進過黑洞：開 App 後在背景補（不用等閒置）：" + u);
  for (const u of QIN) assert.ok(!urls(H.reqs).includes(u), "別的朝代不下載：" + u);
  H.store.set("era", JSON.stringify("qin"));
  const need = J(H.P.preNeed(["port"]).map(x => x.u));
  assert.ok(need.includes("data/boards/qin.webp"), "換到秦：秦的首批要先有（照原本的規則）");
  assert.ok(!need.includes("data/hubmap/learn_qin.webp"), "秦的背景圖不用等");
  assert.equal(H.P.preKind({ u: "data/hubmap/learn_qin.webp", t: 1 }, "qin"), 1, "換到秦以後，秦的背景圖變成選讀");
});

for (const [name, o] of [["saveData", { saveData: true }], ["2G", { effectiveType: "2g" }], ["3G", { effectiveType: "3g" }]]) {
  test("省流量（" + name + "）：首批照下載，選讀一個都不補；設定頁寫暫停", async () => {
    const H = phone({ list: LIST, ...o });
    await boot(H, 3000); await H.run(90000);
    assert.deepEqual(urls(H.reqs).sort(), FIRST.slice().sort(), "只有首批");
    assert.equal(H.P.preOpt().ok, false);
    assert.equal(H.P.preBgText(H.P.preStat()), "省流量中：還有 4 個檔暫停下載（約 1 MB）");
    H.conn.saveData = false; H.conn.effectiveType = "4g";
    await H.run(10000);
    assert.equal(H.P.preOpt().ok, true, "網路恢復：可以補");
  });
}

test("preOptWait（大師對局、各朝外觀預覽）：首批好了 30 秒、閒置才放行；在背景不輪詢", async () => {
  const H = phone({ list: LIST });
  await boot(H, 3000);
  let ok = false; H.P.preOptWait().then(() => { ok = true });
  await H.run(10000); assert.equal(ok, false, "首批好了 10 秒：還不行");
  H.setHidden(true); const f0 = H.fires.length; await H.run(40000);
  assert.equal(ok, false, "在背景不放行"); assert.ok(H.fires.length - f0 <= 1, "在背景不輪詢（" + (H.fires.length - f0) + "）");
  H.setHidden(false); await H.run(2000); assert.equal(ok, true, "回前景、閒置：放行");
});

test("bgpEvery／bgpStop：前景照跑、背景停、回前景重新起算；bgpStop 之後不再觸發；一開 App 就在背景的，回前景才開始", async () => {
  const H = phone({ list: LIST });
  let a = 0, b = 0; const k = H.B.bgpEvery(() => a++, 500);
  await H.run(2000); assert.equal(a, 4);
  H.setHidden(true); await H.run(5000); assert.equal(a, 4, "背景不觸發");
  H.setHidden(false); await H.run(1000); assert.equal(a, 6, "回前景重新起算");
  H.B.bgpStop(k); await H.run(2000); assert.equal(a, 6, "停掉就不再觸發");
  H.setHidden(true); H.B.bgpEvery(() => b++, 500); await H.run(3000); assert.equal(b, 0, "在背景時登記的先不跑");
  H.setHidden(false); await H.run(1000); assert.equal(b, 2);
});

test("〔混合〕舊版 App 讀到新清單（分區層級 \"z:bh\"）：當成背景檔照舊下載，不會當成首批、也不會出錯", () => {
  /* 舊版（20261114-1407 線上版）09b-preload.js 的層級規則，逐字抄在這裡：沒有第四格或 0 或目前朝代＝首批，其餘＝背景 */
  const oldFirst = (t, e) => t === undefined || t === 0 || t === e;
  const oldRank = (u, e) => { const m = /[/_.](classic|qin|han|sanguo|weijin|nanbei|sui|tang|wudai|song|yuan|ming|qing)([/_.-]|$)/.exec(u); return (m && m[1] === e ? 0 : 2) + (/^data\/(battles|relics|tripo_app|qa|inkfx)\//.test(u) ? 1 : 0) };
  for (const [u, , , t] of LIST.items.filter(x => typeof x[3] === "string" && x[3].startsWith("z:"))) {
    assert.equal(oldFirst(t, "classic"), false, u + " 不是首批"); assert.ok(Number.isFinite(oldRank(u, "classic")), u + " 排得進背景佇列");
  }
  assert.ok(PRE.includes('const preFirstOf=(t,e)=>t===undefined||t===0||t===e;'), "新版也沿用同一條首批規則");
});

test("preload-list.js：分區層級、zones；--retier 以線上清單為底只改層級（版本、網址、大小、指紋、檔數都不變）", () => {
  assert.equal(PL.tierOf("data/gxground/beichen.webp", 100), "z:bh"); assert.equal(PL.tierOf("data/guanxing/gx_tai.webp", 100), "z:bh");
  assert.equal(PL.tierOf("data/ximarket/xm_day.webp", 100), "z:xm"); assert.equal(PL.tierOf("data/icons/ui.webp", 100), 0); assert.equal(PL.tierOf("data/levels/lv.webp", 100), 1);
  assert.equal(PL.tierOf("data/boards/qin.webp", 100), "qin");
  const M0 = { v: "abc", n: 4, items: [["data/icons/a.webp", 10, "h1", 0], ["data/gxground/x.webp", 20, "h2", 1], ["data/ximarket/y.webp", 30, "h3", 1], ["data/levels/z.webp", 40, "h4", 1]], big: [], pages: { guanxing: ["^data/guanxing/"] } };
  const M1 = PL.retier(M0);
  assert.equal(M1.v, M0.v); assert.equal(M1.items.length, M0.items.length);
  M1.items.forEach((x, i) => assert.deepEqual(x.slice(0, 3), M0.items[i].slice(0, 3)));
  assert.deepEqual(M1.items.map(x => x[3]), [0, "z:bh", "z:xm", 1]);
  assert.deepEqual(M1.zones, { bh: { pages: ["guanxing"] }, xm: { pages: ["ximarket"] } });
  assert.deepEqual(M0.items[1][3], 1, "不改到輸入");
  /* makePreload 對一個小 site 資料夾 */
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pbg-"));
  try {
    for (const f of ["data/icons/a.webp", "data/guanxing/gx.webp", "data/levels/l.webp"]) { fs.mkdirSync(path.join(dir, path.dirname(f)), { recursive: true }); fs.writeFileSync(path.join(dir, f), f) }
    const MK = PL.makePreload(dir), t = Object.fromEntries(MK.items.map(x => [x[0], x[3]]));
    assert.deepEqual(t, { "data/guanxing/gx.webp": "z:bh", "data/icons/a.webp": 0, "data/levels/l.webp": 1 });
    assert.deepEqual(MK.zones, M1.zones); assert.equal(MK.first0, "data/icons/a.webp".length);
  } finally { fs.rmSync(dir, { recursive: true, force: true }) }
});

test("〔原始碼〕接線：各模組的輪詢計時器改用背景會停的 bgpEvery（沒有 00-util 的測試環境退回 setInterval）；3D 動畫迴圈在背景不排下一格；大師對局等選讀大檔走 preOptWait", () => {
  const G = '(typeof bgpEvery==="function"?bgpEvery:setInterval)';
  const want = {
    "02r-reloadguard.js": [G + "(()=>{if(!document.hidden)rlgSave("], "04-stats.js": [G + '(()=>{try{if(document.visibilityState!=="visible"'],
    "07z-homemap.js": ["const t=" + G + "(()=>{if(!P.isConnected){(typeof bgpStop"], "07w-shipwalk.js": ["const it=" + G + "(()=>{if(!P.isConnected){(typeof bgpStop", 'if(typeof bgpHid==="function"&&bgpHid()){last=now;const off=bgpOn(h=>{if(!h){off();requestAnimationFrame(loop)}});return}requestAnimationFrame(loop);',
      "const it=" + G + "(()=>{if(!S.box.isConnected||!M.isConnected){(typeof bgpStop", 'return()=>{mo.disconnect();(typeof bgpStop==="function"?bgpStop:clearInterval)(it)}'],
    "11b-a11y.js": ["{const last={};" + G], "11c-a11ysnd.js": [G + "(()=>{try{axsWrapEngine()", G + "(()=>{if(document.hidden||!axmOn())"],
    "07lh-lefty.js": [G + "(()=>{if(lhOn())lhKick()},1500)"], "07w7-seasons.js": [G + '(()=>{try{if(document.querySelector("#title .sw7-hd"))'],
    "07w8-shichen.js": [G + "(()=>{try{if(CLK.el"], "07h-qqev.js": [G + "(()=>{try{qqStashBadge()}catch(e){}},30000)"], "07bh-blackhole.js": [G + "(bhxQuestTick,15000)"],
    "07dgl-stamina.js": ["DGL.wt=" + G + "(dglWalkTick,300)", '(typeof bgpStop==="function"?bgpStop:clearInterval)(DGL.wt)', G + "(dglTick,2000)"],
    "00-util.js": ["bgpEvery(()=>{if(wakeLk||Object.keys(WAKE).length)wakeSync()},3000)"],
    "07m4-resume.js": ['const tick=async()=>{if(typeof bgpHid==="function"&&bgpHid()){const off=bgpOn(h=>{if(!h){off();tick()}});return}'],
    "02-shell.js": ['if(typeof preOptWait==="function")await preOptWait();', 'if(typeof preOptWait==="function"){await preOptWait();if(await c.match(new URL("data/gmgames.json"']
  };
  for (const [f, L] of Object.entries(want)) { const s = rd(path.join(M, f)); for (const x of L) assert.ok(s.includes(x), f + "：" + x) }
  for (const f of ["park3d.js", "map3d.js", "bot3d.js"]) {
    const s = rd(path.join(SRC, f));
    assert.match(s, /function frame\(now\)\{if\(stopped\)return;(if\(!document\.body\.contains\(el\)\)\{destroy\(\);return\})?if\(document\.hidden\)\{last=now;[^{}]*if\(!frz\)\{frz=1;document\.addEventListener\("visibilitychange",onVis\)\}return\}requestAnimationFrame\(frame\);/, f + "：背景不排下一格");
    assert.ok(s.includes('document.addEventListener("visibilitychange",onVis)') && s.includes('document.removeEventListener("visibilitychange",onVis)'), f + "：回前景接著畫、關掉時拿掉監聽");
  }
  /* 改成 bgpEvery 的計時器，id 是 bgpEvery 的編號：同一檔裡不能再直接 clearInterval(它)（07w-shipwalk 的收尾差點漏掉） */
  const SG = '(typeof bgpStop==="function"?bgpStop:clearInterval)';
  for (const f of fs.readdirSync(M).filter(f => f.endsWith(".js"))) {
    const s = rd(path.join(M, f));
    for (const m of s.matchAll(/(?:const |let |)([\w.]+)=\(typeof bgpEvery===/g)) assert.ok(!s.split(SG).join("").includes("clearInterval(" + m[1] + ")"), f + "：" + m[1] + " 要用 bgpStop 停");
  }
  const B3 = rd(path.join(SRC, "bot3d.js")); assert.ok(B3.includes("const boardT=(window.bgpEvery||setInterval)(") && B3.includes("(window.bgpStop||clearInterval)(boardT)"));
});
