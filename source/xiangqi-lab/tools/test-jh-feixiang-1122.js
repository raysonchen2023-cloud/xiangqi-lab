// W48-S8 飛相門門內玩法「築堤擺陣形」（擺陣）：m/07z9j-feixiang.js。
//   定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 5 節＋_Claude審稿.md（最少步數用 BFS 在 CI 驗）。
//   出題用模組自己的 IDA*；這裡另寫一套「雙向 BFS」重算最少步數（不呼叫模組的搜尋），兩套要一樣（流程盤點第 11 項：出題與驗題不要同一支程式）。
//   用 vm 跑真的 07z9j 與 core.js；畫面（sheet、Board）在預覽站驗。
// 用法：node --test xiangqi-lab/tools/test-jh-feixiang-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SRC = rd("xiangqi-db/m/07z9j-feixiang.js");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const J = (x) => JSON.parse(JSON.stringify(x));

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { xp: [] };
  const c = {
    window: { XQCore: C }, document: undefined, jhL: (zh) => zh, esc: (s) => String(s), jhWindDay: () => o.day || "2026-11-22",
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = v == null ? v : J(v) } },
    addXP: (n, why, key) => calls.xp.push([n, key]),
  };
  vm.createContext(c);
  vm.runInContext(SRC + ";this.R={JH_FX_LV,JH_FX_NM,jhFxTargets,jhFxMoves,jhFxMove,jhFxDone,jhFxSolve,jhFxMake,jhFxRound,jhFxDayXP,jhFxGet,jhFxNearest}", c);
  return { R: c.R, mem, calls };
}

/* 獨立實作：雙向 BFS（正走＝紅子合法著法、不吃子、不動帥；倒走＝把子放回某空格、要能正走回來） */
const fwd = (b) => C.legal(b, "r").filter(([f, t]) => b[f] && b[f] !== "K" && !b[t]).map(([f, t]) => { const x = b.slice(); x[t] = x[f]; x[f] = null; return x });
function bwd(b) {
  const out = [];
  for (let s = 0; s < 90; s++) {
    if (!b[s] || b[s] === "K" || b[s] === "k") continue;
    for (let q = 0; q < 90; q++) { if (b[q]) continue; const x = b.slice(); x[q] = x[s]; x[s] = null; if (C.legal(x, "r").some(([f, t]) => f === q && t === s)) out.push(x) }
  }
  return out;
}
function biBfs(start, goal, max) {
  const key = (b) => b.map((v) => v || ".").join("");
  if (key(start) === key(goal)) return 0;
  let A = new Map([[key(start), start]]), B = new Map([[key(goal), goal]]);
  const seenA = new Map([[key(start), 0]]), seenB = new Map([[key(goal), 0]]);
  for (let da = 0, db = 0; da + db < max;) {
    const growA = A.size <= B.size, F = growA ? A : B, seen = growA ? seenA : seenB, other = growA ? seenB : seenA, step = growA ? fwd : bwd, d = (growA ? da : db) + 1;
    const N = new Map();
    for (const b of F.values()) for (const x of step(b)) { const k = key(x); if (seen.has(k)) continue; seen.set(k, d); if (other.has(k)) return d + other.get(k); N.set(k, x) }
    if (growA) { A = N; da = d } else { B = N; db = d }
    if (!N.size) return -1;
  }
  return -1;
}
const goalOf = (q) => { const g = q.b.map((v) => (v === "K" || v === "k" ? v : null)); q.T.forEach((x) => { g[x.s] = x.p }); return g };

test("三級設定：子數、步數範圍跟定稿一致（初 3 子 2～3 步、中 4～5 子 3～4 步、高 5～6 子 4～6 步）", () => {
  const { R } = load();
  const [e, m, h] = R.JH_FX_LV;
  assert.deepEqual(J([e.d, m.d, h.d]), [[2, 3], [3, 4], [4, 6]]);
  for (const [L, lo, hi] of [[e, 3, 3], [m, 4, 5], [h, 5, 6]]) for (const t of L.tpl) {
    const n = R.jhFxTargets(t).length; assert.ok(n >= lo && n <= hi, L.k + " 模板 " + JSON.stringify(t) + " 有 " + n + " 子");
  }
  for (const t of e.tpl) assert.deepEqual(Object.keys(t).sort(), ["A", "B", "P"], "初級是相仕兵");
});

test("出題：每題局面合法、紅子都有同種子的目標格、兵不在自己兵線後面、最少步數落在範圍；同一天同一級固定", () => {
  const { R } = load();
  for (const L of R.JH_FX_LV) for (const day of ["2026-12-01", "2026-12-02", "2026-12-03"]) {
    const Q = R.jhFxRound(L, day), Q2 = R.jhFxRound(L, day);
    assert.equal(Q.length, 3, L.k + " " + day);
    assert.deepEqual(J(Q.map((q) => q.b)), J(Q2.map((q) => q.b)), "同一天同一級要固定");
    for (const q of Q) {
      assert.ok(!C.inCheck(q.b, "r") && !C.inCheck(q.b, "b"), "沒有被將軍");
      assert.equal(q.b.filter((v) => v === "K").length, 1); assert.equal(q.b.filter((v) => v === "k").length, 1);
      const red = q.b.map((v, i) => [v, i]).filter(([v]) => v && v !== "K" && v !== "k");
      assert.ok(red.every(([v]) => v === v.toUpperCase()), "只有紅子會動，黑方只剩將");
      const need = {}, have = {}; q.T.forEach((x) => (need[x.p] = (need[x.p] || 0) + 1)); red.forEach(([v]) => (have[v] = (have[v] || 0) + 1));
      assert.deepEqual(have, need, "每顆紅子都有同種子的目標格");
      for (const [v, i] of red) if (v === "P") assert.ok((i / 9 | 0) <= 6, "兵在兵線或前面：" + i);
      assert.ok(!R.jhFxDone(q.b, q.T), "一開始還沒擺好");
      assert.ok(q.d >= L.d[0] && q.d <= L.d[1], L.k + " 最少 " + q.d + " 步");
    }
  }
});

test("最少步數：模組的 IDA* 跟這裡另寫的雙向 BFS 一樣（三級、各兩天）", () => {
  const { R } = load();
  let n = 0;
  for (const L of R.JH_FX_LV) for (const day of ["2026-12-04", "2026-12-05"]) for (const q of R.jhFxRound(L, day)) {
    assert.equal(biBfs(q.b, goalOf(q), 7), q.d, L.k + " " + day + " 種子 " + q.seed); n++;
  }
  assert.equal(n, 18);
});

test("走法：照 core.js 的合法著法、不吃子、帥不動；擺好的判斷要同種子各就各位", () => {
  const { R } = load();
  const b = C.parseFen("3k5/9/9/9/9/6r2/9/4B4/9/4K4");   /* 相在 e2；黑車放在 g4（相飛得到的格子） */
  const mv = R.jhFxMoves(b), e2 = C.parseSq("e2"), g4 = C.parseSq("g4");
  assert.ok(C.legal(b, "r").some(([f, t]) => f === e2 && t === g4), "前提：相吃 g4 是合法著法");
  assert.ok(!mv.some(([f, t]) => f === e2 && t === g4), "不吃子");
  assert.ok(mv.some(([f, t]) => f === e2 && t === C.parseSq("c4")), "其他空格照走");
  assert.ok(mv.every(([f, t]) => b[f] !== "K" && !b[t]), "帥不動、不吃子");
  const T = R.jhFxTargets({ B: [67, 83] });
  const g = new Array(90).fill(null); g[67] = "B"; g[83] = "B";
  assert.ok(R.jhFxDone(g, T));
  g[83] = null; g[87] = "B"; assert.ok(!R.jhFxDone(g, T), "同種子也要各就各位");
});

test("提示：指出還沒到位、離空著的目標格最近的那顆子", () => {
  const { R } = load();
  const T = R.jhFxTargets({ B: [67], A: [76] });
  const b = new Array(90).fill(null); b[85] = "K"; b[3] = "k"; b[83] = "B"; b[84] = "A";   /* 相在家 1 步到 67；仕在家 1 步到 76 */
  const n = R.jhFxNearest(b, T);
  assert.ok(n && [83, 84].includes(n.at) && n.d === 1);
  b[67] = "B"; b[83] = null;
  assert.equal(R.jhFxNearest(b, T).at, 84, "已到位的相不算");
});

test("每天修為：一輪全對 +10，同一天再全對不給；換日再給", () => {
  const a = load({ day: "2026-11-22" });
  assert.equal(a.R.jhFxDayXP(), 10); assert.equal(a.R.jhFxDayXP(), 0);
  assert.deepEqual(J(a.calls.xp), [[10, "feixiang:2026-11-22"]]);
  const b = load({ day: "2026-11-23", store: { jhFeixiang: a.mem.jhFeixiang } });
  assert.equal(b.R.jhFxDayXP(), 10);
});

test("〔原始碼〕只開一個全域入口 jhFeixiangOpen；防同一顆子來回走；沒有行內 // 註解；m.html、存檔鍵、testkinds 各一行", () => {
  assert.match(SRC, /function jhFeixiangOpen\(/);
  assert.match(SRC, /last\[0\]===x&&last\[1\]===sel/, "同一顆子剛走過來又走回去要擋");
  for (const l of SRC.split("\n")) if (/[;})]\s*\/\/(?!#)/.test(l) && !/https?:\/\//.test(l)) assert.fail("一行程式後面接 // 註解會吃掉後面的程式：" + l.slice(0, 80));
  assert.match(rd("xiangqi-db/m.html"), /\/\/#include m\/07z9j-feixiang\.js/);
  assert.match(rd("xiangqi-db/m/05b-save.js"), /JOURNEY_KEYS\.push\("m_jhFeixiang"\)/);
});
