// W48-S3 仕角炮門「當鋪算兌子」（開發者 11/22 選單：193 八派第一批）：m/07z9e-shijiao.js
//   用 vm 跑真的模組（互吃窮舉 jhSjSee、題庫 JH_SJ_Q、兌換帳、一輪挑題、每日修為），存檔與修為用假的記下呼叫；畫面另外在預覽站走一輪。
//   題庫由 xiangqi-lab/tools/shijiao-build.js 產生（--check 可重跑比對）。
// 用法：node --test xiangqi-lab/tools/test-zm-shijiao-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9e-shijiao.js"), "utf8");
const J = (x) => JSON.parse(JSON.stringify(x));
function load(day) {
  const mem = {}, xp = [];
  const c = { window: { XQCore: C }, jhL: (zh) => zh, store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = J(v) } },
    addXP: (n, why, key) => xp.push([n, key]), jhWindDay: () => day || "2026-11-22" };
  vm.createContext(c);
  vm.runInContext(SRC + ";this.M={jhSjSee,jhSjVal,JH_SJ_Q,jhSjFinish,jhSjPick,jhSjGet,jhSjLedger,jhSjWhy};", c);
  return { M: c.M, mem, xp, c };
}
const { M } = load();
const sq = (u) => C.parseSq(u);
const uci = (s) => String.fromCharCode(97 + s % 9) + (9 - (s / 9 | 0));
/* 擺子：紅帥 d0、黑將 f9（不同路，不會照面），再放題目要的子 */
function bd(pcs) { const b = Array(90).fill(null); b[sq("d0")] = "K"; b[sq("f9")] = "k"; for (const [p, u] of Object.entries(pcs)) for (const x of u.split(" ")) b[sq(x)] = p; return b }
const see = (b, t) => { const r = M.jhSjSee(C, b, "r", sq(t), true); return r && J({ v: r.v, n: r.pv.length, pv: r.pv.map((x) => uci(x.f) + uci(x.t)) }) };   /* vm 裡做出來的物件跟這邊不是同一個 realm，比對前先轉一次 */

test("手算案例 1～3：沒人保護白吃、有保護吃了虧本、大換小賺", () => {
  /* 1. 紅俥 a0 吃黑卒 a5，黑方沒有子能吃回：+1 */
  assert.deepEqual(see(bd({ R: "a0", p: "a5" }), "a5"), { v: 1, n: 1, pv: ["a0a5"] });
  /* 2. 同上，黑馬 b7 保護 a5：俥吃卒 +1、馬吃俥 −9 ＝ −8 */
  assert.deepEqual(see(bd({ R: "a0", p: "a5", n: "b7" }), "a5"), { v: -8, n: 2, pv: ["a0a5", "b7a5"] });
  /* 3. 紅傌 d3 吃黑車 e5，黑砲 e8（隔 e7 的卒當炮架）吃回傌：+9 −4 ＝ +5 */
  assert.deepEqual(see(bd({ N: "d3", r: "e5", c: "e8", p: "e7" }), "e5"), { v: 5, n: 2, pv: ["d3e5", "e8e5"] });
});

test("手算案例 4：自己停手比較好（再吃回去會被反吃一俥）", () => {
  /* 紅傌吃黑車 +9；黑象（c7）或黑砲（e8，e7 卒當炮架）吃回傌 −4；
     紅俥 e0 能再吃回，但吃完會被另一顆子吃掉俥（−9），所以紅方停手：淨 +5、帳只有 2 步 */
  const r = see(bd({ N: "d3", r: "e5", b: "c7", c: "e8", p: "e7", R: "e0" }), "e5");
  assert.equal(r.v, 5);
  assert.equal(r.n, 2);
  assert.equal(r.pv[0], "d3e5");
});

test("手算案例 5：對方停手比較好（吃回來會被吃車）", () => {
  /* 黑卒 c5；紅俥 a5 橫吃、紅炮 c2（c3 兵當炮架）直吃都行。黑車 c9 可以吃回，但吃完紅方還有一顆能吃回車，黑方算一算不划算就停手：紅淨 +1、帳 1 步 */
  const r = see(bd({ R: "a5", C: "c2", P: "c3", p: "c5", r: "c9" }), "c5");
  assert.equal(r.v, 1);
  assert.equal(r.n, 1);
});

test("手算案例 6～7：過河卒算 2 分；被牽制的俥不能吃", () => {
  /* 6. 黑卒已過河在 e4（算 2），黑車 e9 保護：傌吃卒 +2、車吃傌 −4 ＝ −2 */
  assert.deepEqual(see(bd({ N: "d2", p: "e4", r: "e9" }), "e4"), { v: -2, n: 2, pv: ["d2e4", "e9e4"] });
  assert.equal(M.jhSjVal("p", sq("e4")), 2);
  assert.equal(M.jhSjVal("p", sq("e5")), 1);
  assert.equal(M.jhSjVal("P", sq("e5")), 2);
  assert.equal(M.jhSjVal("P", sq("e4")), 1);
  /* 7. 紅俥 d1 被黑車 d9 牽制在帥前，離開 d 路就送將：吃不到 c1 的卒（forced 回 null） */
  assert.equal(M.jhSjSee(C, bd({ R: "d1", r: "d9", p: "c1" }), "r", sq("c1"), true), null);
  /* 不強迫吃時，停手＝0 */
  assert.equal(M.jhSjSee(C, bd({ R: "d1", r: "d9", p: "c1" }), "r", sq("c1"), false).v, 0);
});

test("題庫：60 題、每級 20 題吃不吃各 10、id 依序、局面不重複、同一級同一種誰吃誰最多 3 題；每題用同一支程式重算，答案、分數、帳都對得上", () => {
  const Q = M.JH_SJ_Q;
  assert.equal(Q.length, 60);
  assert.deepEqual(J(Q.map((q) => q.id)), Array.from({ length: 60 }, (_, i) => "s" + String(i + 1).padStart(2, "0")));
  for (const lv of [1, 2, 3]) for (const a of ["y", "n"]) assert.equal(Q.filter((q) => q.lv === lv && q.ans === a).length, 10, "級" + lv + " " + a);
  const src = new Set(), pos = new Set(), pair = {};
  for (const q of Q) {
    assert.ok(!pos.has(q.fen + "|" + q.t), q.id + " 跟前面的題目是同一個局面同一格");
    pos.add(q.fen + "|" + q.t);
    const p = q.fen.split(" ");
    assert.equal(p.length, 6, q.id);
    assert.equal(p[1], "w", q.id + " 一律輪紅走");
    const b = C.parseFen(p[0]);
    assert.equal(C.fen(b, "r"), p[0] + " w", q.id + " FEN 讀寫一致");
    assert.ok(!C.inCheck(b, "r") && !C.inCheck(b, "b"), q.id + " 開題時沒人被將軍");
    assert.ok(b[q.t] && C.sideOf(b[q.t]) === "b" && b[q.t] !== "k", q.id + " 被捉的是黑方非將的子");
    const r = M.jhSjSee(C, b, "r", q.t, true);
    assert.ok(r, q.id + " 要吃得到");
    assert.equal(r.chk, false, q.id + " 帳裡不能有將軍");
    assert.equal(r.v, q.v, q.id + " 淨得失");
    assert.deepEqual(J(r.pv.map((x) => uci(x.f) + uci(x.t))), J(q.pv), q.id + " 帳");
    assert.equal(q.ans, q.v > 0 ? "y" : "n", q.id + " 答案");
    assert.notEqual(q.v, 0, q.id);
    const n = q.pv.length, caps = r.pv.map((x) => x.cap.toUpperCase());
    if (q.lv === 1) assert.ok(n >= 1 && n <= 2, q.id + " 初級 1～2 步");
    if (q.lv === 2) assert.ok(n >= 2 && n <= 3 && r.pv.some((x) => (x.cap.toUpperCase() === "P" && x.val === 2) || /[AB]/.test(x.cap.toUpperCase())), q.id + " 中級 2～3 步含過河兵或仕象");
    if (q.lv === 3) assert.ok(n >= 3 && n <= 4 && caps.some((x) => x === "C" || x === "R"), q.id + " 高級 3～4 步含炮或車");
    const pk = q.lv + ":" + r.pv[0].p.toUpperCase() + r.pv[0].cap.toUpperCase();
    pair[pk] = (pair[pk] || 0) + 1;
    assert.ok(pair[pk] <= 3, q.id + " 同一級同一種誰吃誰（" + pk + "）超過 3 題");
    const L = M.jhSjLedger(q);
    assert.equal(L.sum, q.v, q.id + " 兌換帳加總");
    assert.match(q.src, /^gm\d+@\d+$/);
    const g = q.src.split("@")[0];
    assert.ok(!src.has(g), q.id + " 同一盤棋出兩題");
    src.add(g);
  }
});

test("答錯說明指出哪一步沒算到；一輪 3 題同一級不重複", () => {
  for (const q of M.JH_SJ_Q) {
    const w = M.jhSjWhy(q, q.ans === "y" ? "n" : "y");
    assert.ok(w.length > 8, q.id);
    if (q.ans === "n") assert.match(w, /^第 \d+ 步.+吃回你的.+要扣 [\d.]+ 分；整串算下來淨賠 [\d.]+ 分。$/, q.id + "：" + w);
    else assert.match(w, /淨賺 [\d.]+ 分|白賺 [\d.]+ 分/, q.id + "：" + w);
    assert.ok(!/-/.test(w), q.id + " 說明裡不能出現負號：" + w);
  }
  for (const lv of [1, 2, 3]) for (const seed of ["a", "b", "2026-11-22|1|5"]) {
    const P = M.jhSjPick(lv, seed);
    assert.equal(P.length, 3);
    assert.equal(new Set(P).size, 3);
    assert.ok(P.every((q) => q.lv === lv));
  }
});

test("一輪 3 題要打散：1000 輪裡三題連號的不超過純隨機的兩倍（約 16 輪），每題都抽得到", () => {
  for (const lv of [1, 2, 3]) {
    const cnt = {};
    let run = 0;
    for (let i = 0; i < 1000; i++) {
      const P = M.jhSjPick(lv, "2026-11-22|" + lv + "|" + (1795300000000 + i * 37));
      P.forEach((q) => { cnt[q.id] = (cnt[q.id] || 0) + 1 });
      const n = P.map((q) => +q.id.slice(1)).sort((x, y) => x - y);
      if (n[1] - n[0] === 1 && n[2] - n[1] === 1) run++;
    }
    assert.ok(run <= 32, "級" + lv + " 三題連號 " + run + " 輪");
    assert.equal(Object.keys(cnt).length, 20, "級" + lv + " 每題都要抽得到");
  }
});

test("每天修為：一輪全對 +10，同一天再全對不給；沒全對不給；換日再給", () => {
  const A = load("2026-11-22");
  assert.equal(A.M.jhSjFinish(2, 3), 0);
  assert.equal(A.M.jhSjFinish(3, 3), 10);
  assert.equal(A.M.jhSjFinish(3, 3), 0);
  assert.deepEqual(A.xp, [[10, "sj:2026-11-22"]]);
  assert.equal(A.M.jhSjGet().best, 3);
  A.c.jhWindDay = () => "2026-11-23";
  assert.equal(A.M.jhSjFinish(3, 3), 10);
  assert.equal(A.xp.length, 2);
  /* 壞掉的存檔不會讓它當掉 */
  A.mem.jhShijiao = { lv: "x", d: 5, best: 99 };
  assert.deepEqual(J(A.M.jhSjGet()), { lv: 1, d: "", best: 3 });
});
