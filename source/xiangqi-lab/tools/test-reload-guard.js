// 11/13 開發者 iPhone 回報 P1：晉級賽 3D 棋盤絕殺電腦後，畫面跳回開 App 的載入畫面，接著自己回到晉級賽、直接開第二盤（第一盤勝場有記到）。
// 修法在 xiangqi-db/m/02r-reloadguard.js（前綴 rlg）、02-shell.js 三處重整、00-util.js killFx 的 3D 輕量版、xiangqi-lab/src/local.js 賽後分析等特效播完。
// 量測（無頭 Chromium 390×844、DPR 3、晉級賽 3D、注入一步絕殺局面；Chromium 不會像 iOS 那樣回收頁面，只能比峰值和同時存在的東西）：
//   事件順序：走出絕殺 +2ms 勝負寫進 localStorage（xq_cpuRate／xq_record／xq_play 帶 result）→ +26ms xq-result → +28ms 殺棋特效開始 → +1.5s 存檔格 →
//   +2.8s 結果視窗 → +3.3s 特效結束。修改前賽後分析在 +0.1s（特效剛開始）就開跑；修改後 +3.6s（特效播完）才開始。
//   記憶體：Pikafish Wasm 共用記憶體整盤都在 364 MB（初始 192 MB 長上去，對局中就有）、JS 約 167→176 MB、WebGL 貼圖 48 個約 100 MB（不變）；
//   峰值在特效剛開始（約 +0.1s）：合成圖層 7 層 33 MB → 85 層約 128 MB，GPU 程序 +53 MB。修改後 50 層約 114 MB、GPU 程序 +32 MB。
// 不開瀏覽器：把 App 的程式原樣放進 vm，配假的 localStorage／location／history／document／計時器跑。用法：node --test xiangqi-lab/tools/test-reload-guard.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = f => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const RLG = rd("xiangqi-db/m/02r-reloadguard.js"), SHELL = rd("xiangqi-db/m/02-shell.js"), UTIL = rd("xiangqi-db/m/00-util.js"), MHTML = rd("xiangqi-db/m.html");
const LOCAL = rd("xiangqi-lab/src/local.js"), CORE_SRC = rd("xiangqi-lab/site/core.js"), C = require("../site/core.js"), RESUME = rd("xiangqi-db/m/07m4-resume.js"), I18N = rd("xiangqi-db/m/07i18n.js");

/* ---------- 02r-reloadguard.js 放進假瀏覽器 ---------- */
function page({ hash = "#/", ls = {}, nav = "navigate", now = Date.parse("2026-11-13T04:45:00Z"), sel = [], modalHold = 0, dev = false } = {}) {
  const m = new Map(Object.entries(ls).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  const L = [], timers = [], reps = [], toasts = [], clock = { now };
  class D extends Date { constructor(...a) { if (a.length) super(...a); else super(clock.now) } static now() { return clock.now } }
  const loc = { hash, pathname: "/xiangqi-lab/", search: "" };
  const body = { append: e => toasts.push(e) };
  const ctx = {
    Date: D, JSON, Math, String, Number, Array, Object, RegExp, Error, console,
    localStorage: { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) },
    location: loc, history: { state: { d: 3 }, replaceState: (s, t, u) => { reps.push(u); loc.hash = "#" + (String(u).split("#")[1] || "") } },
    performance: { getEntriesByType: () => [{ type: nav }] },
    document: { hidden: false, body, querySelector: q => sel.some(s => q.split(",").includes(s)) ? {} : null, getElementById: () => null, createElement: () => ({ style: {}, setAttribute() { }, remove() { } }), addEventListener: (t, f) => L.push(["doc:" + t, f]) },
    addEventListener: (t, f) => L.push([t, f]), setTimeout: (f, t) => { timers.push({ f, t }); return timers.length }, setInterval: (f, t) => { timers.push({ f, t, iv: 1 }); return 0 },
    MODAL_HOLD: modalHold, esc: s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]),
    DEVMODE: () => dev, i18nT: (k, z) => z,
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(RLG + "\n;this.R={rlgHold,rlgPrep,rlgMenu,rlgClassify,rlgFxBusy,rlgLogHTML,rlgSetMount,rlgIsGame};", ctx, { filename: "02r-reloadguard.js" });
  const fire = (t, e) => { for (const [k, f] of L) if (k === t) f(e || {}) };
  return { ctx, R: ctx.R, m, reps, timers, toasts, fire, clock, loc, get: k => m.has(k) ? JSON.parse(m.get(k)) : null };
}
const T0 = Date.parse("2026-11-13T04:45:00Z");

test("更新延後條件：對局結束 60 秒內、結果視窗或底部視窗開著、殺棋特效中都算在忙；60 秒後放行", () => {
  const p = page({ hash: "#/cpu" });
  assert.equal(p.R.rlgHold(), false, "平常不擋");
  p.fire("xq-result", { detail: "win" });
  assert.equal(p.R.rlgHold(), true, "剛下完");
  p.clock.now += 59000; assert.equal(p.R.rlgHold(), true, "59 秒還在擋");
  p.clock.now += 2000; assert.equal(p.R.rlgHold(), false, "61 秒放行");
  assert.equal(page({ sel: [".modal.res"] }).R.rlgHold(), true, "結果視窗開著");
  assert.equal(page({ sel: ["#sheet.show"] }).R.rlgHold(), true, "底部視窗開著");
  assert.equal(page({ sel: [".kx"] }).R.rlgHold(), true, "水墨絕殺元素還在");
  assert.equal(page({ modalHold: T0 + 2700 }).R.rlgHold(), true, "MODAL_HOLD（結果視窗在等特效）");
  const q = page({ hash: "#/cpu" }); q.fire("xq-play"); assert.equal(q.R.rlgFxBusy(), true, "剛走完一步 0.6 秒內也算特效中");
  q.clock.now += 700; assert.equal(q.R.rlgFxBusy(), false);
  /* 換一個分頁（重新載入後）也記得：對局結束時間存在 localStorage */
  const r = page({ hash: "#/", ls: { xq_rlgLast: { h: "#/", a: T0 - 1000, end: T0 - 30000, ph: T0 - 900 } } });
  assert.equal(r.R.rlgHold(), true, "重載後 60 秒內照樣不套用");
});

test("對局頁網址改寫：rlgPrep 重整前把對局頁換成那個模式的選單頁或首頁，記下原因；不是對局頁不動", () => {
  const cases = [["#/cpu", "#/cpuroom"], ["#/arena", "#/"], ["#/journey/play", "#/adventure"], ["#/redo/play", "#/redo"], ["#/pvp", "#/lobby"], ["#/battle/zhan/3", "#/battle"], ["#/canju/z/abc", "#/canju"], ["#/quiz", "#/"]];
  for (const [h, want] of cases) {
    const p = page({ hash: h }); p.R.rlgPrep("upd");
    assert.equal(p.loc.hash, want, h + " → " + want); assert.deepEqual(p.reps, ["/xiangqi-lab/" + want]);
    assert.deepEqual(p.get("xq_rlgWhy"), { w: "upd", t: T0, h });
  }
  const s = page({ hash: "#/settings" }); s.R.rlgPrep("upd"); assert.equal(s.reps.length, 0, "設定頁不改網址"); assert.equal(s.get("xq_rlgWhy").w, "upd");
  const c = page({ hash: "#/cpu" }); c.R.rlgPrep("coi"); assert.equal(c.reps.length, 0, "跨來源隔離重整：沒有剛下完就照舊回到那盤（沒下完的棋接著下）");
  const c2 = page({ hash: "#/cpu" }); c2.fire("xq-result"); c2.R.rlgPrep("coi"); assert.equal(c2.loc.hash, "#/cpuroom", "剛下完就一樣改寫");
});

test("重載後不開新局：上一頁停在晉級賽、剛絕殺 20 秒、沒有正常卸載（系統回收）＝網址在第一次 route() 前換成雅間，跳大字提示，記一筆「其他」", () => {
  const p = page({ hash: "#/cpu", nav: "reload", ls: { xq_rlgLast: { h: "#/cpu", a: T0 - 3000, end: T0 - 20000, d3: true, ph: 0, vh: 0 } } });
  assert.equal(p.loc.hash, "#/cpuroom", "08b-cpugame.js 不會被打開，也就不會自動開第二盤");
  assert.deepEqual(p.reps, ["/xiangqi-lab/#/cpuroom"]);
  const t = p.timers.find(x => !x.iv); assert.ok(t, "排了大字提示"); t.f();
  assert.equal(p.toasts.length, 1); assert.equal(p.toasts[0].textContent, "剛才畫面重新載入了，上一盤的結果已經記好");
  assert.match(p.toasts[0].style.cssText, /font-size:19px;font-weight:900/, "一行大字");
  const log = p.get("xq_rlgLog");
  assert.equal(log.length, 1); assert.deepEqual(log[0], { at: T0, h: "#/cpu", d3: true, je: 20, why: "other", bg: false, nav: "reload" });
  assert.equal(p.get("xq_rlgLast").h, "#/cpuroom", "新的紀錄是這一頁");
  assert.equal(p.get("xq_rlgLast").end, T0 - 20000, "對局結束時間留著（重載後 60 秒內照樣不套用新版）");
});

test("重載判斷：使用者按的（有正常卸載 pagehide）不記、不改網址；新版套用、跨來源隔離各記各的原因；剛下完超過 90 秒只記不改", () => {
  const u = page({ hash: "#/cpu", nav: "reload", ls: { xq_rlgLast: { h: "#/cpu", a: T0 - 3000, end: T0 - 20000, ph: T0 - 2500 } } });
  assert.equal(u.loc.hash, "#/cpu"); assert.equal(u.get("xq_rlgLog"), null); assert.equal(u.timers.filter(x => !x.iv).length, 0, "不跳提示");
  const up = page({ hash: "#/cpuroom", nav: "reload", ls: { xq_rlgLast: { h: "#/cpu", a: T0 - 3000, end: T0 - 20000, ph: T0 - 2000 }, xq_rlgWhy: { w: "upd", t: T0 - 2000, h: "#/cpu" } } });
  assert.equal(up.get("xq_rlgLog")[0].why, "upd"); assert.equal(up.get("xq_rlgWhy"), null, "原因用過就清掉");
  assert.equal(up.timers.find(x => !x.iv).t, 6200, "新版那次等「✓ 已更新到新版」顯示完才跳");
  const co = page({ hash: "#/", ls: { xq_rlgWhy: { w: "coi", t: T0 - 1500, h: "#/" } } });
  assert.equal(co.get("xq_rlgLog")[0].why, "coi"); assert.equal(co.timers.filter(x => !x.iv).length, 0, "沒在下棋就不跳提示");
  const old = page({ hash: "#/cpu", nav: "reload", ls: { xq_rlgLast: { h: "#/cpu", a: T0 - 3000, end: T0 - 120000 } } });
  assert.equal(old.loc.hash, "#/cpu", "超過 90 秒照原本的規矩"); assert.equal(old.get("xq_rlgLog")[0].je, null);
  const bg = page({ hash: "#/cpu", nav: "reload", ls: { xq_rlgLast: { h: "#/cpu", a: T0 - 60000, vh: T0 - 50000, end: T0 - 70000, d3: true } } });
  assert.equal(bg.get("xq_rlgLog")[0].bg, true, "在背景被收掉、回來時重載"); assert.equal(bg.loc.hash, "#/cpuroom");
  const cold = page({ hash: "#/", nav: "navigate", ls: { xq_rlgLast: { h: "#/", a: T0 - 86400000, vh: T0 - 86000000 } } });
  assert.equal(cold.get("xq_rlgLog"), null, "隔天正常打開不算");
  const C2 = page().R.rlgClassify;
  assert.equal(C2(null, null, T0, "reload"), null);
  assert.deepEqual(JSON.parse(JSON.stringify(C2({ a: T0 - 40000 }, null, T0, "reload"))), null, "超過 30 秒沒心跳又沒切背景：不猜");
});

test("異常紀錄：最多留 10 筆、只存在 localStorage（不送網路）；開發者模式設定頁看得到，一般玩家看不到", () => {
  const log = Array.from({ length: 10 }, (_, i) => ({ at: T0 - (i + 1) * 60000, h: "#/", d3: false, je: null, why: "coi", bg: false, nav: "reload" }));
  const p = page({ hash: "#/cpu", nav: "reload", dev: true, ls: { xq_rlgLog: log, xq_rlgLast: { h: "#/cpu", a: T0 - 2000, end: T0 - 5000, d3: true } } });
  const L = p.get("xq_rlgLog"); assert.equal(L.length, 10); assert.equal(L[0].why, "other"); assert.equal(L[9].at, T0 - 9 * 60000, "最舊的擠掉");
  const html = p.R.rlgLogHTML();
  for (const k of ["其他＝可能是系統回收記憶體", "（畫面開著時）", "3D 棋盤", "對局剛結束 5 秒", "跨來源隔離重整（xqReload）", "#/cpu"]) assert.ok(html.includes(k), "設定頁缺「" + k + "」");
  const pane = { inner: "", querySelector: q => q === "#rlgSet" && pane.inner ? {} : null, insertAdjacentHTML: (w, h) => { pane.inner += h } };
  const v = { querySelector: q => q === '[data-pane="more"]' ? pane : null };
  p.R.rlgSetMount(v); assert.ok(pane.inner.includes('id="rlgSet"')); p.R.rlgSetMount(v); assert.equal((pane.inner.match(/rlgSet/g) || []).length, 1, "不重複放");
  const q = page({ dev: false }), pane2 = { inner: "", querySelector: () => null, insertAdjacentHTML: (w, h) => { pane2.inner += h } };
  q.R.rlgSetMount({ querySelector: () => pane2 }); assert.equal(pane2.inner, "", "一般玩家看不到");
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon|shareIRT|XQNet/.test(RLG), "02r-reloadguard.js 不送網路");
});

/* ---------- 02-shell.js 的三處重整 ---------- */
function shellCut(a, b) { const i = SHELL.indexOf(a), j = SHELL.indexOf(b, i); assert.ok(i > 0 && j > i, "02-shell.js 找不到 " + a.slice(0, 30)); return SHELL.slice(i, j + b.length) }
async function runCoi(hold) {
  const ss = {}, reloads = [], timers = [], preps = [];
  const ctx = {
    navigator: { userAgent: "Mozilla/5.0 (iPhone)", serviceWorker: { register: () => Promise.resolve(), ready: Promise.resolve(), controller: {}, addEventListener() { } } },
    self: { crossOriginIsolated: false }, sessionStorage: { getItem: k => ss[k] || null, setItem: (k, v) => { ss[k] = v } },
    location: { reload: () => reloads.push(1) }, setTimeout: (f, t) => { timers.push({ f, t }) }, String,
    rlgHold: () => hold.v, rlgPrep: w => preps.push(w),
  };
  vm.createContext(ctx); vm.runInContext(shellCut('navigator.serviceWorker.register("sw.js")', "}).catch(()=>{});"), ctx);
  for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r));
  return { ss, reloads, timers, preps };
}
test("〔混合〕跨來源隔離自動重整（02-shell.js 第 176 行）：在忙時每 3 秒再看一次，不忙才重整，重整前叫 rlgPrep(\"coi\")", async () => {
  const hold = { v: true }, r = await runCoi(hold);
  let t = r.timers.shift(); t.f();
  assert.equal(r.reloads.length, 0, "剛下完不重整"); assert.equal(r.timers.length, 1); assert.equal(r.timers[0].t, 3000);
  hold.v = false; r.timers.shift().f();
  assert.deepEqual([r.reloads.length, r.ss.xqReload, r.preps.join()], [1, "1", "coi"]);
  assert.match(SHELL, /const go=\(\)=>\{if\(typeof rlgHold==="function"&&rlgHold\(\)\)return setTimeout\(go,3000\);/);
});
test("〔混合〕新版 pending：換頁時剛下完（60 秒內）不套用；過了才 reload，重整前 rlgPrep(\"upd\")；馬上套用那條的 busyNow 也看 rlgHold", () => {
  const line = SHELL.split("\n").find(l => l.startsWith('  addEventListener("hashchange",e=>{if(pending&&'));
  const segL = SHELL.split("\n").find(l => l.includes("let pending=false;const seg="));
  const inG = SHELL.split("\n").find(l => l.includes("const inGame=(h)=>"));
  assert.ok(line && segL && inG);
  const L = [], reloads = [], preps = [], marks = [], hold = { v: true };
  const ctx = { location: { hash: "#/", reload: () => reloads.push(1) }, addEventListener: (t, f) => L.push(f), String, markDone: () => marks.push(1), rlgHold: () => hold.v, rlgPrep: w => preps.push(w) };
  vm.createContext(ctx); vm.runInContext(inG + "\n" + segL.trim() + "\n" + line + "\npending=true;", ctx);
  const go = (o, n) => L[0]({ oldURL: "http://x/#" + o, newURL: "http://x/#" + n });
  go("/cpuroom", "/"); assert.equal(reloads.length, 0, "剛下完回首頁不套用");
  hold.v = false; go("/", "/cpu"); assert.equal(reloads.length, 0, "換到對局頁不套用（原本的規矩）");
  go("/cpuroom", "/stats"); assert.deepEqual([reloads.length, marks.length, preps.join()], [1, 1, "upd"]);
  const bn = SHELL.split("\n").find(l => l.includes("const busyNow=()=>")); assert.ok(bn.includes('||(typeof rlgHold==="function"&&rlgHold())'), "busyNow 要含 rlgHold");
  assert.ok(SHELL.includes('markDone();setTimeout(()=>{if(typeof rlgPrep==="function")rlgPrep("upd");location.reload()},900);return}'), "馬上套用那條重整前也改寫網址");
  assert.equal((SHELL.match(/location\.reload\(\)/g) || []).length, 3, "02-shell.js 只有這三處重整，全都經過 rlgPrep");
  assert.equal((SHELL.match(/rlgPrep\("(upd|coi)"\);location\.reload\(\)/g) || []).length, 3);
});
test("〔原始碼〕02r-reloadguard.js 在 02-shell.js 後面、第一次 route()（11-watch.js）前面組進 m.html；一行程式裡沒有 // 註解", () => {
  const a = MHTML.indexOf("//#include m/02-shell.js\n//#include m/02r-reloadguard.js"), b = MHTML.indexOf("//#include m/11-watch.js");
  assert.ok(a > 0 && b > a);
  for (const ln of RLG.split("\n")) assert.ok(!/[^:"'`]\/\/ /.test(ln.replace(/https?:\/\//g, "")), "不能有 // 註解：" + ln.slice(0, 60));
  assert.ok(/"rlg\.reloaded":"The screen just reloaded\. Your last game's result has been saved\."/.test(I18N), "英文在 07i18n.js 的 I18N_KEY");
  assert.ok(RLG.includes('i18nT("rlg.reloaded","剛才畫面重新載入了，上一盤的結果已經記好")'));
});

/* ---------- local.js：勝負一定在殺棋特效之前寫進存檔；賽後分析等特效播完 ---------- */
function fakeIDB() { const data = new Map(); return { open() { const r = {}; setImmediate(() => { r.result = { transaction() { const t = {}, store = { get(k) { const q = { result: data.get(k) }; setImmediate(() => q.onsuccess && q.onsuccess()); return q }, put(v, k) { data.set(k, v); return {} }, delete(k) { data.delete(k); return {} } }; t.objectStore = () => store; setImmediate(() => setImmediate(() => t.oncomplete && t.oncomplete())); return t } }; r.onsuccess && r.onsuccess() }); return r } } }
function localTab() {
  const m = new Map(), T = { L: [], ev: [], timers: [], searches: 0, clock: { now: Date.parse("2026-11-13T04:40:00Z") } };
  class D extends Date { constructor(...a) { if (a.length) super(...a); else super(T.clock.now += 1000) } static now() { return T.clock.now } }
  const ls = { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k), key: i => [...m.keys()][i] ?? null, get length() { return m.size } };
  const ctx = {
    console, URL, URLSearchParams, setImmediate, Date: D, setTimeout: (fn, ms) => { T.timers.push({ fn, ms }); return T.timers.length }, clearTimeout() { }, setInterval: () => 0, clearInterval() { },
    localStorage: ls, sessionStorage: { getItem: () => null, setItem() { }, removeItem() { } }, indexedDB: fakeIDB(), location: { href: "http://localhost/", hash: "#/cpu", pathname: "/", search: "" }, history: { replaceState() { } }, navigator: { onLine: true },
    Event: class { constructor(t) { this.type = t } }, CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d && d.detail } },
    addEventListener: (t, f) => T.L.push([t, f]), removeEventListener() { },
    dispatchEvent: e => { T.ev.push({ type: e.type, ls: { rate: m.get("xq_cpuRate") || null, rec: m.get("xq_record") || null, play: m.get("xq_play") || null } }); return true },
    document: { hidden: false, addEventListener() { } }, atob: s => Buffer.from(s, "base64").toString("binary"),
    XQEngine: { ready: true, search: async q => { T.searches++; const S = q.fen ? { start: q.fen.split(" ")[0], startTurn: q.fen.split(" ")[1] === "b" ? "b" : "r", moves: [] } : { moves: [] }; for (const u of q.moves || []) S.moves.push({ f: C.parseSq(u.slice(0, 2)), t: C.parseSq(u.slice(2, 4)) }); C.stateRebuild(S); const L = C.legal(S.board, S.turn); return { best: L.length ? C.iccs(L[0][0], L[0][1]) : "(none)", lines: [] } } },
  };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(CORE_SRC, ctx, { filename: "core.js" }); vm.runInContext(LOCAL, ctx, { filename: "local.js" });
  T.ctx = ctx; T.m = m; T.api = async (u, b) => JSON.parse(JSON.stringify(await ctx.XQ.api(u, b)));
  T.run = async name => { const t = T.timers.filter(x => x.fn.name === name); T.timers = T.timers.filter(x => x.fn.name !== name); for (const x of t) await x.fn(); for (let i = 0; i < 30; i++) await new Promise(r => setImmediate(r)); return t.length };
  return T;
}
/* 晉級賽一盤：黑將從 e8 躲到 e9（已經走過一步），輪到紅方 a0→a9 一步絕殺（b8 的車封住第 8 橫線） */
async function mateGame(T) {
  await T.api("/play/new", { human: "r", ranked: true });
  const P = JSON.parse(T.m.get("xq_play")); Object.assign(P, { seq: P.seq + 50, start: "9/1R2k4/9/9/9/9/9/9/9/R2K5", startTurn: "b", moves: [{ f: 13, t: 4, by: "b" }], result: null, hint: null });
  T.m.set("xq_play", JSON.stringify(P));
  const s = await T.api("/play/state"); assert.equal(s.ranked, true); assert.equal(s.turn, "r"); assert.ok(s.legal.some(([f, t]) => f === 81 && t === 0), "a0→a9 合法");
  T.timers.length = 0; T.ev.length = 0; T.searches = 0;
  return T.api("/play/move", { f: 81, t: 0 });
}
test("勝負先寫入：絕殺那一步在 xq-play 通知畫面（之後才畫結果、放殺棋特效）之前，晉級賽積分、這一級戰績、帶 result 的桌上那盤都已經寫進 localStorage", async () => {
  const T = localTab(); const s = await mateGame(T);
  assert.deepEqual(s.result, { w: "r", why: "將死" });
  const e = T.ev.find(x => x.type === "xq-play"); assert.ok(e, "有通知畫面");
  const rate = JSON.parse(e.ls.rate); assert.equal(rate.w, 1, "晉級賽勝場"); assert.ok(rate.pts > 0); assert.equal(rate.hist[0].res, "w");
  assert.equal(JSON.parse(e.ls.rec)[0].w, 1, "record 也記了");
  assert.deepEqual(JSON.parse(e.ls.play).result, { w: "r", why: "將死" }, "桌上那盤已經帶結果（重新載入後讀得到、不會被當成沒下完）");
  assert.equal(T.ev.filter(x => x.type === "xq-play").length, 1);
  const B8 = rd("xiangqi-db/m/08b-cpugame.js"), i = B8.indexOf("killFx(bd.svg,win"), j = B8.indexOf("const onPlay=()=>{if(!busy&&opened)api(\"/play/state\")");
  assert.ok(i > 0 && j > 0, "08b：殺棋特效在 render 裡、render 由 xq-play 之後讀 /play/state 觸發");
});
test("賽後分析等殺棋特效播完：XQ_fxBusy 為真時不開始（每 0.5 秒再看），播完才分析；最多等 20 秒；沒有 XQ_fxBusy（舊頁面、測試）照舊馬上分析", async () => {
  const T = localTab(); let busy = true; T.ctx.XQ_fxBusy = () => busy;
  await mateGame(T);
  assert.equal(await T.run("analyzePlay"), 1);
  assert.equal(T.searches, 0, "特效中不搜尋");
  assert.deepEqual(T.timers.filter(x => x.fn.name === "analyzePlay").map(x => x.ms), [500], "0.5 秒後再看");
  await T.run("analyzePlay"); assert.equal(T.searches, 0);
  busy = false; await T.run("analyzePlay");
  assert.ok(T.searches > 0, "特效播完就分析");
  const U = localTab(); U.ctx.XQ_fxBusy = () => true; await mateGame(U);
  await U.run("analyzePlay"); assert.equal(U.searches, 0); U.clock.now += 21000; await U.run("analyzePlay");
  assert.ok(U.searches > 0, "一直說在忙也最多等 20 秒");
  const V = localTab(); await mateGame(V); await V.run("analyzePlay"); assert.ok(V.searches > 0, "沒有 XQ_fxBusy 照舊");
});

/* ---------- 07m4-resume.js：已經下完的盤不能當成沒下完 ---------- */
test("中途可接續（07m4）：已經下完（帶 result）的盤不算沒下完，冷啟動、回到對局頁都不問「要繼續嗎」；畫面看過結果後也不會被當成「離開後才分出勝負」", () => {
  const m = new Map(), mem = {};
  const ctx = {
    JSON, Math, Date, Object, Array, String, Number, isNaN,
    localStorage: { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, String(v)) },
    sessionStorage: { getItem: () => "1", setItem() { }, removeItem() { } },
    store: { get: (k, d) => k in mem ? mem[k] : d, set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } },
    addEventListener() { }, setTimeout() { }, modal: () => { throw new Error("不該跳卡") }, toast() { }, api: async () => ({}), location: { hash: "#/cpu" }, document: { getElementById: () => null, querySelector: () => null, body: { classList: { contains: () => false } } },
  };
  vm.createContext(ctx); vm.runInContext(RESUME + "\n;this.T={rsGames,rsTouch,rsWasOpen,rsEntry,rsUnf};", ctx);
  const id = "2026-11-13T04-40-00", G = { id, human: "r", ranked: true, moves: [{ f: 81, t: 0, by: "r" }, { f: 4, t: 13, by: "b" }], result: null };
  ctx.T.rsTouch(G); assert.equal(ctx.T.rsWasOpen(id), true, "下到一半時記著");
  const done = { ...G, result: { w: "r", why: "將死" } };
  m.set("xq_play", JSON.stringify(done));
  assert.equal(ctx.T.rsUnf(done), false); assert.equal(ctx.T.rsGames().length, 0, "下完的不在「沒下完」清單");
  ctx.T.rsTouch(done); assert.equal(ctx.T.rsWasOpen(id), false, "結果畫出來後清掉，重新進對局頁不會再補跑一次結算");
  ctx.T.rsEntry(done, "cpu", () => { }); /* 已下完：不跳「要繼續嗎」（modal 會丟錯） */
});

test("〔原始碼〕殺棋特效蓋在 3D 園子上（P3）：不對 WebGL 畫面套灰階濾鏡、只震一下，金光不用混色，墨點／金星／彩紙減量；白閃播完就拿掉", () => {
  assert.ok(UTIL.includes('const P3=!!(svg.classList&&svg.classList.contains("park3d"));'));
  assert.ok(UTIL.includes('svg.classList.add(P3?"kx-board3d":"kx-board");if(lose&&!P3)svg.classList.add("lose");'));
  assert.ok(/\.kx-board3d\{animation:kxshake \.45s ease\}/.test(UTIL) && /\.kx\.p3 \.gleam\{mix-blend-mode:normal/.test(UTIL));
  for (const k of ["i<(P3?8:18)", "i<(P3?6:14)", "i<(P3?10:26)"]) assert.ok(UTIL.includes(k), k);
  assert.ok(UTIL.includes('const fl=mk("kx-flash");fl.addEventListener("animationend",()=>fl.remove(),{once:true})'));
  assert.ok(UTIL.includes('svg.classList.remove("kx-board","kx-board3d")},3250)'), "播完兩種 class 都拿掉");
});
