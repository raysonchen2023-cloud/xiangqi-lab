// 第 12 輪 F3「快棋模式、動畫最短化、預走」的可重現量測（不開瀏覽器，Node 直接跑）：
//   ① 預走反應時間：用 vm 載入 xiangqi-db/m/07pm-premove.js，配一個照 08b-cpugame.js 掛勾寫的假對局畫面（tap／draw／render／post／xq-play 輪詢，跟 08b 同一套流程），
//      棋規用 site/core.js 的真棋規；電腦隨機走合法步、玩家每回合在電腦思考時排一步預走（隨機挑自己的子、隨機挑可排的落點），固定亂數種子。
//      量：「電腦落子（xq-play 事件）→ 畫面輪到你（render）」與「電腦落子 → 預走那步送進對局（玩家的步已經套到盤面）」的毫秒數；也統計走出／不合法取消／子被吃取消各幾次。
//      注意：量的是程式邏輯（事件、非同步 api、預走判斷、送出），不含瀏覽器重畫棋盤的時間（不准開無頭瀏覽器）；實機可以在主控台打 pmvStats() 看真的數字。
//   ② 電腦思考時間：local.js 的 THINKPACE 原樣切出來，60 個固定局面（fixtures/ai-batch-positions.json）各算擬真、快速；快棋模式打開時 cpuPace() 一律回「快速」。
//   ③ 動畫：01-board.js 的 openFx、checkFx、kaijuFx、capFx 原樣切出來在 vm 跑（假 DOM、記下 setTimeout 的毫秒數），快棋開／關各跑一次；走子滑動等 CSS 時間從原始碼讀；跟 blzTab() 對照。
// 用法：node xiangqi-lab/tools/blitz-measure.js [回合數，預設 400]
// 測試 test-blitz.js 也用這裡的 load()、game()、fxRun()、pace()。
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), { performance } = require("perf_hooks");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const C = require("../site/core.js");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const PM = rd(path.join(M, "07pm-premove.js")), BOARD = rd(path.join(M, "01-board.js")), LOCAL = rd(path.join(LAB, "src", "local.js"));
const lcg = s => { let x = s >>> 0 || 1; return () => (x = (x * 16807) % 2147483647) / 2147483647 };

/* 載入 07pm-premove.js：假的 store、toast、vibrate、axSay、document；計時器、時鐘用真的（重試 25 毫秒要真的等） */
function load(opt) {
  opt = opt || {};
  const st = Object.assign({}, opt.store || {}), toasts = [], says = [], vibs = [], winL = {}, docL = {}, cls = new Set(), elems = {};
  const ctx = {
    console, JSON, Math, Object, Array, Number, String, Set, Map, Error, isFinite,
    Date, performance, setTimeout, clearTimeout,
    store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } },
    toast: m => toasts.push(m), vibrate: p => { vibs.push(p); return true }, axSay: t => says.push(t),
    XQCore: C,
    document: {
      documentElement: { classList: { toggle: (c, on) => { if (on) cls.add(c); else cls.delete(c) }, contains: c => cls.has(c) } },
      getElementById: id => elems[id] || null, createElement: t => ({ tag: t }), head: { append: e => { elems[e.id] = e } },
      addEventListener: (t, f) => { docL[t] = f }
    },
    addEventListener: (t, f) => { (winL[t] || (winL[t] = [])).push(f) }
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(PM, ctx, { filename: "07pm-premove.js" });
  return { X: ctx, st, toasts, says, vibs, docL, cls, elems, emit: t => { for (const f of winL[t] || []) f({ type: t }) }, on: (t, f) => ctx.addEventListener(t, f) };
}

/* 假的挑戰電腦畫面：tap、draw、render、post、pmFire 照 08b-cpugame.js 的掛勾寫（test-blitz.js 另外比對 08b 原始碼裡真的有這幾個掛勾）；
   後端照 local.js：玩家走完 thinking＝true、電腦落子時 playApply 發 xq-play、畫面收到再 api("/play/state") */
function game(R, opt) {
  opt = opt || {};
  const B = { id: opt.id || "g1", board: C.parseFen(opt.fen || C.START), turn: opt.turn || "r", human: opt.human || "r", moves: [], result: null, thinking: false };
  const H = { B, st: null, sel: -1, busy: false, o: null, fires: [], flat: opt.flat !== false, renderAt: 0, errs: [], opened: false };
  const judge = () => { if (!C.legal(B.board, B.turn).length) B.result = { w: C.opp(B.turn), why: "困斃" } };
  const stateOf = () => ({ id: B.id, board: B.board.slice(), turn: B.turn, human: B.human, moves: B.moves.map(m => ({ ...m })), result: B.result, thinking: B.thinking && B.turn !== B.human,
    legal: !B.result && B.turn === B.human ? C.legal(B.board, B.turn) : [] });
  const apply = (f, t) => { B.board = C.make(B.board, f, t); B.moves.push({ f, t, by: B.turn }); H.appliedAt = performance.now(); B.turn = C.opp(B.turn); judge(); R.emit("xq-play") };
  const api = async (u, b) => { await null;
    if (u === "/play/move") { if (B.result) throw new Error("這局已經結束"); if (B.turn !== B.human) throw new Error("還沒輪到你");
      if (!C.legal(B.board, B.turn).some(([x, y]) => x === b.f && y === b.t)) throw new Error("這步不合法"); apply(b.f, b.t); if (!B.result) B.thinking = true }
    return stateOf() };
  async function post(u, b) { if (H.busy) return false; H.busy = true; try { render(await api(u, b)); return true } catch (e) { H.errs.push(e.message); return false } finally { H.busy = false } }
  function draw() { const st = H.st, o = { sel: H.sel, targets: H.sel >= 0 ? st.legal.filter(([f]) => f === H.sel).map(x => x[1]) : [] }; R.X.pmvOpts(st, st.human, o, H.flat); H.o = o }
  const pmFire = () => { if (H.st) { const r = R.X.pmvFire(H.st, H.st.human, (f, t) => { if (H.busy) return false; H.sel = f; tap(t); return true }, pmFire); if (r !== "none" && r !== "wait") H.fires.push(r) } };
  function tap(i) { const st = H.st;
    if (st && !st.result && (st.turn !== st.human || st.thinking) && R.X.pmvTap(st, st.human, i, { flat: H.flat, redraw: () => { if (H.st) render(H.st) } })) return;
    if (!st || st.result || st.turn !== st.human || st.thinking) return;
    if (H.sel >= 0 && st.legal.some(([f, t]) => f === H.sel && t === i)) { const f = H.sel; H.sel = -1; return post("/play/move", { f, t: i }) }
    H.sel = i === H.sel ? -1 : st.legal.some(([f]) => f === i) ? i : -1; draw() }
  function render(s) { H.st = s; if (!s.legal.some(([f]) => f === H.sel)) H.sel = -1; draw(); if (s.turn === s.human && !s.thinking && !s.result) H.renderAt = performance.now(); pmFire() }
  R.on("xq-play", () => { if (!H.busy && H.opened) api("/play/state").then(s => { if (!H.busy && s) render(s) }).catch(() => {}) });
  H.open = async () => { H.opened = true; render(await api("/play/state")) };
  H.close = () => { H.opened = false };   /* 離開對局頁（08b 的 stop 拿掉 xq-play 監聽） */
  H.tap = tap; H.render = render; H.post = post; H.stateOf = stateOf;
  /* 電腦落子（後端 playEngine 算完）：thinking 結束、套上這步、發 xq-play */
  H.cpu = (f, t) => { B.thinking = false; apply(f, t) };
  H.undo = n => { for (let k = 0; k < (n || 2) && B.moves.length; k++) B.moves.pop(); B.board = C.parseFen(opt.fen || C.START); B.turn = opt.turn || "r"; const ms = B.moves.slice(); B.moves = [];
    for (const m of ms) { B.board = C.make(B.board, m.f, m.t); B.moves.push(m); B.turn = C.opp(B.turn) } B.thinking = false; R.emit("xq-play") };
  return H;
}
const flush = async n => { for (let i = 0; i < (n || 8); i++) await new Promise(r => setImmediate(r)) };

/* ① 預走反應時間：N 回合（每回合＝玩家排預走→電腦落子→看結果） */
async function premoveRun(N, seed) {
  const R = load(), rnd = lcg(seed || 12345), pick = a => a[Math.floor(rnd() * a.length)];
  const lat = [], put = [], ren = [], kinds = { fire: 0, illegal: 0, gone: 0, stale: 0 };
  let g = null, gi = 0;
  const fresh = async () => { if (g) g.close(); g = game(R, { id: "m" + (++gi) }); await g.open() };
  await fresh();
  for (let k = 0; k < N; k++) {
    if (g.B.result || g.B.moves.length > 150) await fresh();
    /* 輪到玩家：隨機走一步（一般點選：先點子、再點落點） */
    if (g.B.turn === g.B.human) { const L = C.legal(g.B.board, g.B.turn); const [f, t] = pick(L); g.tap(f); g.tap(t); await flush(); if (g.B.result) continue }
    /* 電腦思考中：玩家排一步預走（隨機挑有可排落點的子、隨機挑落點） */
    const me = g.B.human, mine = g.B.board.map((p, i) => p && C.sideOf(p) === me && R.X.pmvReach(g.B.board, i).length ? i : -1).filter(i => i >= 0);
    if (!mine.length) { await fresh(); continue }
    const f = pick(mine), t = pick(R.X.pmvReach(g.B.board, f)); g.tap(f); g.tap(t);
    if (!R.X.pmvSt().q) throw new Error("預走沒有排上");
    const nF = g.fires.length, n0 = g.B.moves.length;
    const L = C.legal(g.B.board, g.B.turn), [cf, ct] = pick(L);
    const t0 = performance.now(); g.renderAt = 0; g.cpu(cf, ct); await flush();
    const r = g.fires.slice(nF).find(x => x !== "retry") || "none";
    if (g.renderAt) ren.push(g.renderAt - t0);
    if (r === "fire") { kinds.fire++; if (g.B.moves.length !== n0 + 2) throw new Error("預走走出了但盤面沒有多一步"); lat.push(R.X.pmvSt().hist[0]); put.push(g.appliedAt - t0) }
    else if (kinds[r] != null) kinds[r]++;
    else throw new Error("預走沒有結果：" + r);
  }
  return { N, kinds, lat: stat(lat), put: stat(put), render: stat(ren), toasts: R.toasts.length };
}
function stat(a) { const s = a.slice().sort((x, y) => x - y), q = p => s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null;
  return { n: s.length, avg: s.length ? s.reduce((x, y) => x + y, 0) / s.length : null, med: q(.5), p95: q(.95), max: s.length ? s[s.length - 1] : null } }

/* ② 電腦思考時間（THINKPACE 原樣切出來） */
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b); if (i < 0 || j <= i) throw new Error("找不到 " + a); return src.slice(i, j) };
function pace() {
  const HP = new Function("C", cut(LOCAL, "/* HUMANPICK:BEGIN */", "/* HUMANPICK:END */") + "\nreturn HUMANPICK(C);")(C);
  const TP = new Function("C", "HP", "CPU_MIN_MS", cut(LOCAL, "/* THINKPACE:BEGIN */", "/* THINKPACE:END */") + "\nreturn THINKPACE(C,HP,CPU_MIN_MS);")(C, HP, 1000);
  const line = LOCAL.split("\n").find(l => l.includes("cpuPace=()=>"));
  const src = line.slice(line.indexOf("cpuPace=") + 8, line.lastIndexOf(";"));
  const cpuPaceWith = ls => new Function("localStorage", "return (" + src + ")")({ getItem: k => (k in ls ? ls[k] : null) })();
  return { HP, TP, cpuPaceWith };
}
function paceRun(seed) {
  const { TP, cpuPaceWith } = pace(), RLV = new Function("return " + LOCAL.match(/const RLV=(\[[\s\S]*?\]);/)[1])(), MID = RLV[7];
  const POS = require("./fixtures/ai-batch-positions.json").positions, out = {};
  const modes = { real: cpuPaceWith({ m_cpuPace: '"real"' }), fast: cpuPaceWith({ m_cpuPace: '"fast"' }), blitz: cpuPaceWith({ m_cpuPace: '"real"', m_blitz: "true" }) };
  for (const [k, pc] of Object.entries(modes)) { const rnd = lcg(seed || 7), a = [];
    for (const p of POS) { const [b, s] = p.fen.split(" "), tn = s === "b" ? "b" : "r", S = { board: C.parseFen(b), turn: tn, moves: Array.from({ length: p.phase === "開局" ? 6 : 40 }, () => ({ f: 0, t: 0 })) };
      a.push(TP.ms(S, null, null, MID, pc, rnd)) }
    out[k] = { pace: pc, ...stat(a) } }
  return out;
}

/* ③ 動畫：把 01-board 的特效函式原樣切出來跑 */
function fnSrc(src, name) { const i = src.indexOf("function " + name + "("); if (i < 0) throw new Error("找不到 " + name);
  const m = /\n(?=function |const |let |var |\/\/|\/\*)/g; m.lastIndex = i + 10; const r = m.exec(src); return src.slice(i, r ? r.index : src.length) }
const STOP = new Error("stop");
function fxRun(name, args, opt) {
  opt = opt || {}; const R = load({ store: { blitz: !!opt.blitz } }), timers = [], made = [];
  const st = Object.assign({ capSound: false, mvSound: false }, opt.store || {});
  let rect = 0;
  const doc = { querySelectorAll: () => ({ forEach() {} }), createElement: t => { const e = { tag: t, style: {}, className: "", innerHTML: "", remove() {}, querySelector: () => null, append() {} }; made.push(e); return e }, body: { append() {} } };
  const ctx = { store: { get: (k, d) => (k in st ? st[k] : d) }, focusOn: () => false, fxHost: s => s, document: doc, esc: s => String(s), setTimeout: (f, ms) => { timers.push(ms || 0); return 1 },
    vibrate() {}, jjGlyphs: () => "", loadKaiju() {}, KJ_GLY: null, fxBusy: () => false, blzSkip: R.X.blzSkip, Math, String, JSON, matchMedia: () => ({ matches: false }), requestAnimationFrame() {}, performance: { now: () => 0 } };
  vm.createContext(ctx); vm.runInContext(fnSrc(BOARD, name) + "\nthis.__f=" + name + ";", ctx);
  const svg = { getBoundingClientRect: () => { rect++; if (opt.stopAtRect) throw STOP; return { left: 0, top: 0, width: 560, height: 620, right: 560, bottom: 620 } } };
  try { ctx.__f(svg, ...args) } catch (e) { if (e !== STOP) throw e }
  return { made: made.length, timers, rect };
}
/* 01-board.draw 裡快棋／一般兩種 CSS 時間（秒字串）→ 毫秒 */
function cssPairs() {
  const sec = s => Math.round(parseFloat(s) * 1000), g = re => { const m = BOARD.match(re); if (!m) throw new Error("找不到 " + re); return m };
  const sl = g(/transition=BZ\?"transform (\.\d+)s ease-out":"transform (\.\d+)s ease-out"/), cf = g(/transition=BZ\?"opacity (\.\d+)s":"opacity (\.\d+)s"/),
    rg = g(/transition=BZ\?"opacity (\.\d+)s (\.\d+)s":"opacity (\.\d+)s (\.\d+)s"/);
  return { slide: [sec(sl[2]), sec(sl[1])], capFade: [sec(cf[2]), sec(cf[1])], ring: [sec(rg[3]) + sec(rg[4]), sec(rg[1]) + sec(rg[2])] };
}
function animRun() {
  const T = load().X.blzTab(), css = cssPairs(), rows = [];
  for (const k of ["slide", "capFade", "ring"]) rows.push({ k, name: T[k][0], normal: css[k][0], blitz: css[k][1], table: [T[k][1], T[k][2]], how: "01-board.js 的 CSS transition" });
  /* 開局名稱：08b 走完一步 350 毫秒後叫 openFx；將軍、吃子：01-board 落子 200 毫秒後叫 */
  const run = (k, name, args, delay, extra) => { const a = fxRun(name, args, extra), b = fxRun(name, args, Object.assign({ blitz: true }, extra));
    const life = x => x.made ? delay + Math.max(0, ...x.timers) : 0;
    rows.push({ k, name: T[k][0], normal: life(a), blitz: life(b), table: [T[k][1], T[k][2]], how: name + "() 在 vm 實跑（建了幾個畫面元素、幾毫秒後移除）", madeN: a.made, madeB: b.made }) };
  run("openFx", "openFx", ["中炮", "紅方開局"], 350);
  run("checkFx", "checkFx", [""], 200);
  run("kaiju", "kaijuFx", ["r"], 0);
  { const a = fxRun("capFx", [280, 310, 40], { stopAtRect: true }), b = fxRun("capFx", [280, 310, 40], { stopAtRect: true, blitz: true });
    const keep = +(BOARD.match(/setTimeout\(\(\)=>d\.remove\(\),rm\?1000:(\d+)\)/) || [])[1];
    rows.push({ k: "capFx", name: T.capFx[0], normal: a.rect ? 200 + keep : 0, blitz: b.rect ? 200 + keep : 0, table: [T.capFx[1], T.capFx[2]], how: "capFx() 在 vm 實跑到量棋盤大小那一步（快棋在開頭就返回）；長度讀原始碼 setTimeout" }) }
  { const B8 = rd(path.join(M, "08b-cpugame.js")), hold = +(B8.match(/MODAL_HOLD=Date\.now\(\)\+(\d+);killFx/) || [])[1], R = load({ store: { blitz: true } }), R0 = load();
    rows.push({ k: "killFx", name: T.killFx[0], normal: R0.X.blzSkip("killFx") ? 0 : hold, blitz: R.X.blzSkip("killFx") ? 0 : hold, table: [T.killFx[1], T.killFx[2]], how: "08b MODAL_HOLD 讀原始碼；blzSkip 實跑" }) }
  { const CSS = rd(path.join(DB, "m.css")), a = CSS.match(/\.modal\{animation:mdIn \.(\d+)s/), b = CSS.match(/\.modal \.box\{animation:mdBox \.(\d+)s/), PC = PM.match(/html\.blz \.modal \.box\{animation-duration:\.(\d+)s/);
    rows.push({ k: "modal", name: T.modal[0], normal: Math.max(+a[1], +b[1]) * 10, blitz: +PC[1] * 10, table: [T.modal[1], T.modal[2]], how: "m.css 與 07pm 注入的樣式（讀原始碼）" }) }
  return rows;
}

module.exports = { load, game, flush, premoveRun, paceRun, pace, fxRun, fnSrc, cssPairs, animRun, stat, lcg, C, PM, BOARD, LOCAL };

if (require.main === module) (async () => {
  const N = +process.argv[2] || 400, f1 = x => x == null ? "—" : x.toFixed(1), f0 = x => x == null ? "—" : Math.round(x);
  /* 先暖機一輪（JIT），再正式量 */
  await premoveRun(40, 99);
  const P = await premoveRun(N, 12345);
  console.log(`## ① 預走反應時間（${N} 回合，種子 12345，Node ${process.version}）`);
  console.log(`走出 ${P.kinds.fire} 次、不合法取消 ${P.kinds.illegal} 次、子被吃取消 ${P.kinds.gone} 次、其他清掉 ${P.kinds.stale} 次`);
  console.log(`| 量什麼 | 次數 | 平均 | 中位數 | 95% | 最大 |\n|---|---|---|---|---|---|`);
  console.log(`| 電腦落子 → 畫面輪到你（render） | ${P.render.n} | ${f1(P.render.avg)} ms | ${f1(P.render.med)} ms | ${f1(P.render.p95)} ms | ${f1(P.render.max)} ms |`);
  console.log(`| 電腦落子 → 送出預走（pmvStats 記的） | ${P.lat.n} | ${f1(P.lat.avg)} ms | ${f1(P.lat.med)} ms | ${f1(P.lat.p95)} ms | ${f1(P.lat.max)} ms |`);
  console.log(`| 電腦落子 → 預走那步套到盤面 | ${P.put.n} | ${f1(P.put.avg)} ms | ${f1(P.put.med)} ms | ${f1(P.put.p95)} ms | ${f1(P.put.max)} ms |`);
  const Q = paceRun(7);
  console.log(`\n## ② 電腦思考時間（60 個固定局面，業級第 8 級，種子 7）`);
  console.log(`| 節奏 | cpuPace() | 平均 | 中位數 | 95% | 最長 |\n|---|---|---|---|---|---|`);
  for (const [k, n] of [["real", "擬真（預設）"], ["fast", "快速（設定頁）"], ["blitz", "快棋模式（設定頁仍是擬真）"]]) { const x = Q[k]; console.log(`| ${n} | ${x.pace} | ${f0(x.avg)} ms | ${f0(x.med)} ms | ${f0(x.p95)} ms | ${f0(x.max)} ms |`) }
  const A = animRun();
  console.log(`\n## ③ 動畫（一般 → 快棋）`);
  console.log(`| 動畫 | 一般 | 快棋 | 省下 | 量法 |\n|---|---|---|---|---|`);
  for (const r of A) console.log(`| ${r.name} | ${r.normal} ms | ${r.blitz ? r.blitz + " ms" : "略過"} | ${r.normal - r.blitz} ms | ${r.how} |`);
})();
