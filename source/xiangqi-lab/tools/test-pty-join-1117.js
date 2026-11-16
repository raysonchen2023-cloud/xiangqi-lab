// 11/17 iMac 模擬器第 1 輪（候選版 20261117-0106）七星加入那一段的三項：
//   第 12 項（P3）殘局解開後「完美解開」結算只閃約 2 秒就被加入過場蓋掉：結算是 07c 的卡片（#sheet），07pty ptyJoinCutLater／ptyJoinCardLater 只等 .modal。
//     修法：卡片開著就一直等（不算進 20 次），玩家按了按鈕或關掉卡片才播過場、出加入卡（07pty ptyResOpen）。
//   第 13 項（P3）加入過場每張約 2 秒讀不完字幕：07pjc PJC_DUR 改成 3.8／4.3／4 秒；點畫面提前換下一張、「略過」整段跳過照舊。
//   第 15 項（P3）按「帶她出門」沒有提示：換人成功就 toast「🚶 （名字）陪你走了」，英文句型在 07i18n I18N_PAT。
// 不開瀏覽器：假 DOM、假時鐘（照 test-pjc-joincut-1116.js 的做法）。用法：node --test xiangqi-lab/tools/test-pty-join-1117.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const PTY_SRC = rd("xiangqi-db/m/07pty-party.js"), PJC_SRC = rd("xiangqi-db/m/07pjc-joincut.js");

/* ---------- 假 DOM ---------- */
class El {
  constructor(tag, doc) { this.tagName = String(tag).toUpperCase(); this.doc = doc; this.children = []; this.parentNode = null; this.attrs = {}; this.ls = {}; this.id = ""; this.textContent = ""; this._cls = new Set();
    const st = {}; st.setProperty = (k, v) => { st[k] = v }; this.style = st;
    const me = this; this.classList = { add: (...c) => c.forEach(x => me._cls.add(x)), remove: (...c) => c.forEach(x => me._cls.delete(x)), contains: c => me._cls.has(c), toggle: (c, on) => { if (on === undefined) on = !me._cls.has(c); on ? me._cls.add(c) : me._cls.delete(c); return on } } }
  get className() { return [...this._cls].join(" ") } set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)) }
  get clientWidth() { return 0 } get clientHeight() { return 0 }
  append(...xs) { for (const x of xs) { if (x.parentNode) x.remove(); x.parentNode = this; this.children.push(x) } }
  insertBefore(x, ref) { if (x.parentNode) x.remove(); const i = this.children.indexOf(ref); x.parentNode = this; if (i < 0) this.children.push(x); else this.children.splice(i, 0, x) }
  remove() { const p = this.parentNode; if (!p) return; const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1); this.parentNode = null }
  get isConnected() { let e = this; while (e.parentNode) e = e.parentNode; return e === this.doc.root }
  setAttribute(k, v) { this.attrs[k] = String(v) } getAttribute(k) { return this.attrs[k] } hasAttribute(k) { return k in this.attrs }
  addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f) } removeEventListener(t, f) { this.ls[t] = (this.ls[t] || []).filter(x => x !== f) }
  focus() { }
  click() { let stop = false; const ev = { target: this, stopPropagation() { stop = true }, preventDefault() { } };
    for (let e = this; e && !stop; e = e.parentNode) { if (e.onclick) e.onclick(ev); for (const f of e.ls.click || []) if (!stop) f(ev) } }
  *walk() { for (const c of this.children) { yield c; yield* c.walk() } }
}
function mkDoc() {
  const doc = { ls: {} }; doc.root = new El("html", doc); doc.head = new El("head", doc); doc.body = new El("body", doc); doc.root.append(doc.head, doc.body);
  doc.createElement = t => new El(t, doc);
  doc.all = () => [...doc.root.walk()];
  doc.getElementById = id => doc.all().find(e => e.id === id) || null;
  doc.querySelector = sel => { if (!sel.startsWith(".")) throw new Error("假 DOM 只支援 .class：" + sel); const c = sel.slice(1); return doc.all().find(e => e._cls.has(c)) || null };
  doc.byCls = c => doc.all().filter(e => e._cls.has(c));
  doc.addEventListener = (t, f) => { (doc.ls[t] = doc.ls[t] || []).push(f) }; doc.removeEventListener = (t, f) => { doc.ls[t] = (doc.ls[t] || []).filter(x => x !== f) };
  return doc;
}
/* ---------- 假時鐘 ---------- */
function mkClock() {
  let now = 0, seq = 0; const q = new Map();
  const setTimeout = (f, ms) => { const id = ++seq; q.set(id, { at: now + Math.max(0, +ms || 0), f, id }); return id };
  const clearTimeout = id => { q.delete(id) };
  const tick = ms => { const end = now + ms; for (;;) { let nx = null; for (const t of q.values()) if (t.at <= end && (!nx || t.at < nx.at || (t.at === nx.at && t.id < nx.id))) nx = t; if (!nx) break; q.delete(nx.id); now = nx.at; nx.f() } now = end };
  return { setTimeout, clearTimeout, tick, get now() { return now } };
}
const flush = () => new Promise(r => setImmediate(r));

/* 建一個環境：img＝每張圖的結果（"ok"｜"404"｜"hang"），預設全 ok；pz＝cjData 給什麼（null＝沒有這題；"throw"＝抓不到） */
function env(o) {
  o = o || {};
  const doc = mkDoc(), clk = mkClock(), log = [], modals = [], boards = [], toasts = [];
  const img = o.img || {};
  class FakeImage { set src(u) { this._u = u; log.push("img:" + u); const k = Object.keys(img).find(n => u.includes(n)), r = k ? img[k] : "ok"; if (r === "hang") return; clk.setTimeout(() => { if (r === "ok") this.onload && this.onload(); else this.onerror && this.onerror() }, 20) } get src() { return this._u } }
  const party = { v: 1, m: { x_swordboy: { xp: 0, at: 0, how: "start" } }, pool: 0, lead: "x_swordboy", look: o.look || "x_swordboy", seen: { x_swordboy: 1 }, hint: {} };
  const db = { party };
  const store = { get: (k, d) => (k in db ? JSON.parse(JSON.stringify(db[k])) : d), set: (k, v) => { db[k] = JSON.parse(JSON.stringify(v)) } };
  const WX = { x_swordboy: { n: "齊轍", sx: "m", pc: "俥" }, x_miaogirl: { n: "駱躍梅", sx: "f", pc: "傌" }, x_shuai: { n: "沈方庭", sx: "m", pc: "帥" }, x_shi: { n: "鐵連城", sx: "m", pc: "仕" },
    x_spiritgirl: { n: "田飛燕", sx: "f", pc: "相" }, x_bing: { n: "步越溪", sx: "f", pc: "兵" }, x_martialgirl: { n: "雷借花", sx: "f", pc: "炮" } };
  const pzData = o.pz === undefined ? { "xs-han-0": { id: "xs-han-0", fen: "4ka3/4a4/9/2N6/2N6/9/8p/9/9/4K4", side: "r" } } : o.pz;
  const ctx = {
    console, Math, JSON, Date, Promise, Object, Array, String, Number, Set, Map,
    document: doc, Image: FakeImage, setTimeout: clk.setTimeout, clearTimeout: clk.clearTimeout,
    addEventListener() { }, removeEventListener() { }, innerWidth: 390, innerHeight: 844,
    matchMedia: () => ({ matches: !!o.rm }),
    store, WX_CHARS: WX, xpInfo: () => ({ L: 5, need: 100, rest: 0 }),
    esc: s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
    modal: (html, btns, cls) => { modals.push({ html, btns, at: clk.now }); log.push("modal") },
    vibrate() { }, toast: t => toasts.push(t),
    cjData: () => pzData === "throw" ? Promise.reject(new Error("offline")) : Promise.resolve({ byId: pzData || {} }),
    parseFen: f => { const b = Array(90).fill(null); let r = 0, c = 0; for (const ch of f) { if (ch === "/") { r++; c = 0 } else if (ch >= "0" && ch <= "9") c += +ch; else { b[r * 9 + c] = ch; c++ } } return b },
    Board: (tap) => { const svg = new El("svg", doc); return { svg, draw: (b, O) => boards.push(b) } },
  };
  vm.createContext(ctx);
  vm.runInContext(PTY_SRC + "\n" + (o.noPjc ? "" : PJC_SRC) + "\n;this.__X={PTY,ptyOnSolve,ptyGet,ptyHas:typeof ptyHas==='function'?ptyHas:null,pjcPlay:typeof pjcPlay==='function'?pjcPlay:null,PJC_SC:typeof PJC_SC!=='undefined'?PJC_SC:null,pjcMeet:typeof pjcMeet==='function'?pjcMeet:null,pjcSay:typeof pjcSay==='function'?pjcSay:null,PJC_DUR:typeof PJC_DUR!=='undefined'?PJC_DUR:null};", ctx, { filename: "pty+pjc.js" });
  const X = ctx.__X;
  const pg = () => doc.getElementById("pjcPg");
  return { doc, clk, log, modals, boards, toasts, X, db, pg, sub: () => { const p = pg(); return p ? [...p.walk()].find(e => e._cls.has("pjc-sub")) : null } };
}

/* 解題結算卡（07c 用 sheet）：假 DOM 裡放一個 id="sheet" 的元素當作開著 */
const openSheet = E => { const s = E.doc.createElement("div"); s.id = "sheet"; E.doc.body.append(s); return s };

test("〔第 12 項〕殘局「完美解開」結算卡開著：過場不播、加入卡不出，等多久都一樣；玩家關掉卡片才播", async () => {
  const E = env(); const sh = openSheet(E);
  E.X.ptyOnSolve("han", "xs-han-0"); assert.ok(E.db.party.m.x_miaogirl, "加入的資料照舊當下就記");
  E.clk.tick(2600); await flush(); assert.equal(E.pg(), null, "2.5 秒：結算卡還開著，不蓋上去");
  E.clk.tick(60000); await flush(); assert.equal(E.pg(), null, "一分鐘後（超過以前 20 次的等）還是不搶"); assert.equal(E.modals.length, 0);
  sh.remove(); E.clk.tick(1600); await flush(); assert.ok(E.pg(), "關掉卡片 1.5 秒內開始播過場");
  for (let t = 0; t < 16000 && E.pg(); t += 100) { E.clk.tick(100); await flush() }
  E.clk.tick(1000); await flush(); assert.equal(E.modals.length, 1, "播完出加入卡"); assert.ok(E.modals[0].html.includes("駱躍梅加入了"));
});

test("〔第 12 項〕沒有過場的站：加入卡也等結算卡關掉；沒有卡片時照舊 2.5 秒出", async () => {
  let E = env({ noPjc: true }); const sh = openSheet(E); E.X.ptyOnSolve("han", "xs-han-0");
  E.clk.tick(40000); await flush(); assert.equal(E.modals.length, 0, "結算卡開著：加入卡不蓋上去");
  sh.remove(); E.clk.tick(1600); await flush(); assert.equal(E.modals.length, 1);
  E = env({ noPjc: true }); E.X.ptyOnSolve("han", "xs-han-0"); E.clk.tick(2600); await flush(); assert.equal(E.modals.length, 1, "照舊");
});

test("〔第 13 項〕每張至少 3.5 秒（字幕淡入後還留 3 秒以上）；點畫面提前換下一張；「略過」整段跳過", async () => {
  { const D = [...env().X.PJC_DUR]; assert.ok(D.length === 3 && D.every(x => x >= 3.5), "PJC_DUR＝" + JSON.stringify(D)) }
  let E = env(); const seen = []; let n = 0;
  E.X.pjcPlay("han", ["x_miaogirl"], () => n++); await flush();
  const shot = () => { const p = E.pg(); if (!p) return null; const ims = [...p.walk()].filter(e => e._cls.has("pjc-sh") && e._cls.has("on")).map(e => e.children[0].style.backgroundImage); return ims[ims.length - 1] || null };
  E.clk.tick(200); await flush(); const s1 = shot(); assert.ok(/han_j1/.test(s1), "第 1 張");
  E.clk.tick(3200); await flush(); assert.equal(shot(), s1, "3.4 秒還在第 1 張（以前 2.6 秒就換）");
  E.pg().click(); E.clk.tick(200); await flush(); assert.ok(/han_j2/.test(shot()), "點一下就換第 2 張");
  E.pg().click(); E.clk.tick(200); await flush(); assert.ok(/han_j3/.test(shot()), "再點換第 3 張");
  E.clk.tick(3300); await flush(); assert.ok(E.pg(), "第 3 張也至少 3.5 秒");
  E = env(); n = 0; const C = E.X.pjcPlay("han", ["x_miaogirl"], () => n++); E.clk.tick(500); await flush();
  const k = [...E.pg().walk()].find(e => e._cls.has("pjc-k")); k.click(); E.clk.tick(800); await flush();
  assert.equal(E.pg(), null, "略過：整段結束"); assert.equal(n, 1);
});

test("〔第 15 項〕加入卡按「帶她出門」：換成她陪你走，並且 toast「🚶 駱躍梅陪你走了」；按「好」不換、不說", async () => {
  const E = env({ noPjc: true }); E.X.ptyOnSolve("han", "xs-han-0"); E.clk.tick(2600); await flush();
  const M = E.modals[0]; assert.equal(M.btns[0][0], "帶她出門");
  M.btns[1][1] && M.btns[1][1](); assert.deepEqual(E.toasts, [], "按「好」：不提示");
  M.btns[0][1](); assert.equal(E.db.party.look, "x_miaogirl", "陪你走的換成駱躍梅"); assert.deepEqual(E.toasts, ["🚶 駱躍梅陪你走了"]);
  assert.ok(!E.toasts.some(t => /上限/.test(t)));
});

test("〔第 15 項〕英文：07i18n 句型把「（名字）陪你走了」翻成「… is traveling with you now」，七位都翻得出名字", () => {
  const I = rd("xiangqi-db/m/07i18n.js"), i = I.indexOf("#I18N-PURE-BEGIN"), j = I.indexOf("/* #I18N-PURE-END */"); const ctx = {}; vm.createContext(ctx);
  vm.runInContext(I.slice(I.indexOf("\n", i) + 1, j) + ";this.R={i18nText}", ctx);
  const W = { 駱躍梅: "Luo Yuemei", 齊轍: "Qi Zhe", 沈方庭: "Shen Fangting", 鐵連城: "Tie Liancheng", 田飛燕: "Tian Feiyan", 步越溪: "Bu Yuexi", 雷借花: "Lei Jiehua" };
  for (const [zh, en] of Object.entries(W)) assert.equal(ctx.R.i18nText("🚶 " + zh + "陪你走了"), "🚶 " + en + " is traveling with you now");
});
