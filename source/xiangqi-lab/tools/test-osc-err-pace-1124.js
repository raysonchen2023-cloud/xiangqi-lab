"use strict";
/* 11/24 開發者截圖（齊轍・中炮門 第 3 課・看懂失誤）「進來後棋子動太快了，玩家看不清楚」：
   lsnPlay 多一個 opt {first, gap, end}；修行課的常見錯法先停 1.2 秒、每步 1.6 秒，播完可以「重看一次」；自己走錯後的反駁每步 1.4 秒。其他課程頁（不給 opt）照舊。 */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m");
const LSN = fs.readFileSync(path.join(M, "07z7-lesson.js"), "utf8"), SCH = fs.readFileSync(path.join(M, "07z9-school.js"), "utf8");
const grab = (src, name) => { const i = src.indexOf("function " + name + "("), j = src.indexOf("\n/*", i); assert.ok(i >= 0 && j > i, "抓得到 " + name); return src.slice(i, j) };

function load() {
  const timers = [];
  /* 假的棋：每一步都合法、走到哪就記到哪；lsnSq 把 "a0b0" 拆成兩個數字 */
  const C = { legal: () => [[0, 1], [1, 2], [2, 3], [3, 4]], sideOf: () => "r", notate: (b, f, t) => f + "→" + t, make: (b, f, t) => { const n = b.slice(); n[t] = n[f]; n[f] = null; return n } };
  const c = { XQCore: C, lsnSq: (u) => [+u[0], +u[1]], setTimeout: (f, ms) => { timers.push({ f, ms }) } };
  vm.createContext(c); vm.runInContext(grab(LSN, "lsnPlay") + ";this.lsnPlay=lsnPlay;", c);
  /* 照時間依序跑：回傳每一步發生在第幾毫秒 */
  const runAll = () => { let now = 0; const at = []; while (timers.length) { const t = timers.shift(); now += t.ms; t.f(); at.push(now) } return at };
  return { c, timers, runAll };
}
const B0 = ["P", null, null, null, null];
const SEQ = ["01", "12", "23", "34"];

test("不給 opt：照舊立刻走第一步、每步 0.8 秒（其他課程頁不受影響）", () => {
  const T = load(), steps = []; let done = false;
  T.c.lsnPlay({ tok: 0 }, SEQ, B0, (b, mv, tx, cap, i) => steps.push(i), () => { done = true });
  assert.deepEqual(steps, [1], "第一步立刻走");
  assert.equal(T.timers[0].ms, 800); T.runAll(); assert.deepEqual(steps, [1, 2, 3, 4]); assert.ok(done);
});

test("修行課的常見錯法：先停 1.2 秒才走第一步，之後每步 1.6 秒", () => {
  const P = vm.runInNewContext("(" + SCH.match(/const OSC_ERR_PACE=(\{[^}]*\})/)[1] + ")");
  assert.deepEqual({ ...P }, { first: 1200, gap: 1600, end: 700 });
  const T = load(), steps = []; T.c.lsnPlay({ tok: 0 }, SEQ, B0, (b, mv, tx, cap, i) => steps.push(i), () => {}, P);
  assert.deepEqual(steps, [], "一進來先不走，讓玩家看清起始局面");
  assert.equal(T.timers[0].ms, 1200);
  const at = T.runAll(); assert.deepEqual(steps, [1, 2, 3, 4]);
  assert.deepEqual(at.slice(0, 4), [1200, 2800, 4400, 6000], "第 1 步 1.2 秒、之後每 1.6 秒一步");
});

test("快轉（st.fast）照舊一口氣走完，不等", () => {
  const T = load(), steps = []; T.c.lsnPlay({ tok: 0, fast: true }, SEQ, B0, (b, mv, tx, cap, i) => steps.push(i), () => {}, { first: 1200, gap: 1600 });
  assert.deepEqual(steps, [1, 2, 3, 4]); assert.equal(T.timers.length, 0);
});

test("〔原始碼〕修行頁：常見錯法用 OSC_ERR_PACE、播完有「重看一次」；自己走錯後的反駁用 OSC_BAD_PACE", () => {
  assert.match(SCH, /,OSC_BAD_PACE=\{gap:1400,end:600\};/);
  assert.match(SCH, /lsnPlay\(st,\[N\.bad\]\.concat\(N\.l\|\|\[\]\),bb0,[\s\S]{0,700}\},OSC_ERR_PACE\)\};play\(\);return\}/, "常見錯法放慢");
  assert.match(SCH, /\["replay","⟲",oscL\("重看一次","Watch again"\),play\]/, "播完可以重看一次");
  assert.match(SCH, /lsnPlay\(st,\[u\]\.concat\(bad\.l\|\|\[\]\),bb0,[\s\S]{0,700}\},OSC_BAD_PACE\);return\}/, "自己走錯後的反駁放慢");
});
