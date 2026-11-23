// W73（2026-11-23）順炮、仕角炮、反宮馬三派門內玩法的棋理修正。Windows Claude 1 用 Pikafish 驗出：
//   順炮 90 題有 35 題局面不合法（將帥照面、子數超過上限）、2 題有比連將更快的殺；仕角炮 13 題「吃」實戰大虧；反宮馬 palace_horse_06 例題 b 的步序漏中卒。
//   新檔（不改既有測試）。CI 沒有引擎：引擎結果記在 tools/shunpao-engine.json、shijiao-engine.json（iMac 本機 Pikafish 2026-09-06、nnue sha256 前 16 碼 7d13d73569a9b571，
//   Threads 4、Hash 256、深度 20），這裡核對題庫跟紀錄一致；局面合不合法用本檔自己寫的檢查（不呼叫出題腳本）。
// 用法：node --test xiangqi-lab/tools/test-jh-zm-engine-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const J = (x) => JSON.parse(JSON.stringify(x));
const run = (file, names) => { const c = { window: { XQCore: C }, store: { get: () => null, set() {} }, jhL: (z) => z, esc: (s) => String(s) }; vm.createContext(c); vm.runInContext(rd(file) + ";this.R={" + names + "}", c); return J(c.R) };

/* 獨立的局面合法檢查：子數、九宮、仕相位置、兵卒位置、將帥照面、雙方都沒被將軍 */
const CAP = { K: 1, A: 2, B: 2, N: 2, R: 2, C: 2, P: 5 };
const PAL = { r: [66, 67, 68, 75, 76, 77, 84, 85, 86], b: [3, 4, 5, 12, 13, 14, 21, 22, 23] };
const ADV = { r: [66, 68, 76, 84, 86], b: [3, 5, 13, 21, 23] }, ELE = { r: [47, 51, 63, 67, 71, 83, 87], b: [2, 6, 18, 22, 26, 38, 42] };
function why(b) {
  for (const side of ["r", "b"]) {
    const up = side === "r", is = (p) => p && (p === p.toUpperCase()) === up;
    for (const T of Object.keys(CAP)) { const n = b.filter((p) => is(p) && p.toUpperCase() === T).length; if (n > CAP[T]) return `${side} 的 ${T} 有 ${n} 顆（上限 ${CAP[T]}）` }
    for (let i = 0; i < 90; i++) {
      const p = b[i]; if (!is(p)) continue;
      const T = p.toUpperCase(), r = (i / 9) | 0, c = i % 9;
      if (T === "K" && !PAL[side].includes(i)) return `${side} 的將帥不在九宮（${i}）`;
      if (T === "A" && !ADV[side].includes(i)) return `${side} 的仕士不在九宮五點（${i}）`;
      if (T === "B" && !ELE[side].includes(i)) return `${side} 的相象不在七個象眼點（${i}）`;
      if (T === "P") { const crossed = up ? r <= 4 : r >= 5, home = up ? r === 5 || r === 6 : r === 3 || r === 4; if (!crossed && !(home && c % 2 === 0)) return `${side} 的兵卒沒過河卻在不能站的位置（${i}）` }
    }
    if (b.filter((p) => p === (up ? "K" : "k")).length !== 1) return side + " 沒有將帥";
  }
  const K = b.indexOf("K"), k = b.indexOf("k");
  if (K % 9 === k % 9) { let open = true; for (let i = k + 9; i < K; i += 9) if (b[i]) { open = false; break } if (open) return "將帥照面" }
  if (C.inCheck(b, "r") || C.inCheck(b, "b")) return "有一方被將軍";
  return null;
}

test("局面合法檢查本身：照面、子數超過、仕相兵站錯位置都抓得到（對照組）", () => {
  assert.equal(why(C.parseFen("4k4/9/9/9/9/9/9/9/9/4K4")), "將帥照面");
  assert.equal(why(C.parseFen("3k5/9/9/9/9/9/9/9/9/4K4")), null);
  assert.match(why(C.parseFen("3k5/9/9/9/9/9/9/9/RRR6/4K4")), /R 有 3 顆/);
  assert.match(why(C.parseFen("3k5/9/9/9/9/9/9/9/A8/4K4")), /仕士不在九宮/);
  assert.match(why(C.parseFen("3k5/9/9/9/9/9/9/1P7/9/4K4")), /兵卒沒過河/);
  /* W73 回報的舊題（舊題庫第 128、46 行）：黑方 3 士 3 馬、紅方 3 炮；將帥照面 */
  assert.match(String(why(C.parseFen("3k1an2/r8/3a1a1N1/9/9/4C4/2C4n1/3KBn1C1/4A4/5A3"))), /有 3 顆/);
  assert.equal(why(C.parseFen("9/P4k3/7c1/9/9/9/r8/3C1K3/9/9")), "將帥照面");
});

test("順炮門 90 題：每一題局面都合法（子數上限、九宮、仕相兵位置、將帥不照面、雙方都沒被將軍）", () => {
  const { JH_SP_Q } = run("xiangqi-db/m/07z9i-shunpao.js", "JH_SP_Q");
  assert.equal(JH_SP_Q.length, 90);
  for (const q of JH_SP_Q) assert.equal(why(C.parseFen(q.fen)), null, q.fen);
});

test("順炮門：每一題都有引擎紀錄，Pikafish 的最短殺（不限連將）正好等於答案——沒有比連將更快的殺；W73 回報的兩題不在題庫", () => {
  const { JH_SP_Q } = run("xiangqi-db/m/07z9i-shunpao.js", "JH_SP_Q"), E = JSON.parse(rd("xiangqi-lab/tools/shunpao-engine.json"));
  for (const q of JH_SP_Q) { const k = q.fen + " " + q.turn; assert.ok(k in E, "沒有引擎紀錄：" + k); assert.equal(E[k], q.n, "引擎最短殺跟答案不同：" + k) }
  const fens = new Set(JH_SP_Q.map((q) => q.fen));
  for (const f of ["9/7P1/5k3/1r7/9/9/9/8r/1N7/3K5", "1Pb3N2/9/b2ak3c/6C2/9/9/6p2/5Kc2/2r1A1C2/9"]) assert.ok(!fens.has(f), "舊題（引擎 2 步殺）還在：" + f);
});

test("仕角炮門 60 題：每一題都有引擎紀錄；答案「吃」的吃要是最佳或差 50 cp 內，答案「不吃」的不吃最佳比吃好 100 cp 以上；W73 回報的 13 題不在題庫", () => {
  const src = rd("xiangqi-db/m/07z9e-shijiao.js"), Q = JSON.parse(src.slice(src.indexOf("const JH_SJ_Q=[") + "const JH_SJ_Q=".length, src.indexOf("];", src.indexOf("const JH_SJ_Q=[")) + 1));
  const E = JSON.parse(rd("xiangqi-lab/tools/shijiao-engine.json"));
  assert.equal(Q.length, 60);
  for (const q of Q) {
    const k = q.fen.replace(/ - - 0 1$/, "") + "|" + q.t, e = E[k];
    assert.ok(e, "沒有引擎紀錄：" + q.id);
    if (q.ans === "y") assert.ok(e.alt - e.cap <= 50, `${q.id} 答案「吃」，但不吃比吃好 ${e.alt - e.cap} cp`);
    else assert.ok(e.alt - e.cap >= 100, `${q.id} 答案「不吃」，但不吃只比吃好 ${e.alt - e.cap} cp`);
  }
  const bad = ["r2akab2/9/1cn1b1c2/p1C4rp/5n3/2PNp4/P3P1P1P/1C2B3N/4A4/3RKAB1R w|49", "2nakab2/5R3/nrR1C2r1/p3p3p/9/6P2/P8/9/4A4/2BA1KB2 w|19",
    "r2akab2/1R7/c2rb1n2/p1n1p3p/1N4p2/7R1/P3P1P1P/4C1N2/9/2BAKAB2 w|18", "4kab2/4a4/n3b1c2/1Rc6/8P/p1n1P1B2/2r3PC1/4B1N2/4A4/1N2KA3 w|47",
    "2baka3/6r2/nR2bRn2/2N1p1p1p/pr7/P8/2P1c1P1P/2C1B2C1/4A4/2BAK4 w|18", "1n2kab2/4a4/4b4/p7p/2c5n/4C1P1P/P3N4/C5c2/9/2BAKAB2 w|44",
    "2bak4/2c1a4/n3b4/2p1p1p1p/p2r2n2/2P1P1PR1/P3r3P/N3C1N2/4A4/2B1KAB2 w|42", "4kabr1/4a4/6n2/p3p3p/2Pn2p2/9/Pc1r2PcP/1CN1C4/4A4/R1B1KABR1 w|39",
    "1r2kabr1/3na4/4b1n2/pCp1p1p1p/9/2c2NP2/P3P3P/N3C4/7c1/1RBAKABR1 w|31", "4kab2/4a4/n3b3n/1Rc3c1C/3r5/4C3P/4P3N/4B4/2N1A4/4KAB2 w|29",
    "2c1kab2/4a4/4b2c1/p8/2nCp1pnp/1NR6/Pr2P1P1P/4B3N/4A4/2CAK1B2 w|38", "3akab2/9/2n1b1n2/p1p1p3p/3NP1p2/2P6/P3c1r1c/C1N1C4/4AR3/1rB1KAB2 w|58",
    "4kab2/4a4/4b4/p2r4p/3np2r1/P1R1c4/2P1N1P1n/C3C3B/1R2A4/2B1KA3 w|49"];
  const have = new Set(Q.map((q) => q.fen.replace(/ - - 0 1$/, "") + "|" + q.t));
  for (const b of bad) assert.ok(!have.has(b), "W73 回報實戰大虧的舊題還在：" + b);
});

test("反宮馬門：palace_horse_06 例題 b（炮二平五 砲8平6…第 2 手漏中卒）不再出成題目", () => {
  const R = run("xiangqi-db/m/07z9g-fanggong.js", "jhFgLines,JH_FG_SKIP:[...JH_FG_SKIP]");
  const D = JSON.parse(fs.readFileSync(path.join(ROOT, "xiangqi-lab", "site", "data", "opening-school", "palace_horse.json"), "utf8"));
  const ex = D.lessons.find((l) => l.id === "palace_horse_06").ex.find((e) => e.id === "b");
  assert.deepEqual(ex.pre, ["h2e2", "h7f7", "h0g2", "b9c7", "i0h0"], "前提：課程資料裡那一條還是這個前置步序");
  assert.deepEqual(R.JH_FG_SKIP, ["palace_horse_06/b"]);
  const vm2 = { window: { XQCore: C }, store: { get: () => null, set() {} } }; vm.createContext(vm2); vm.runInContext(rd("xiangqi-db/m/07z9g-fanggong.js") + ";this.L=jhFgLines(" + JSON.stringify(D) + ")", vm2);
  const lines = J(vm2.L);
  assert.ok(lines.length > 30, "其他主線照舊");
  assert.ok(!lines.some((m) => m.slice(0, 5).join(" ") === ex.pre.join(" ")), "那一條不能出現在主線裡");
});

test("〔原始碼〕出題腳本：順炮有子數上限、照面、引擎紀錄等於答案；仕角炮有引擎條件 50／100 cp", () => {
  const sp = rd("xiangqi-lab/tools/shunpao-build.js"), sj = rd("xiangqi-lab/tools/shijiao-build.js");
  assert.match(sp, /const CAP = \{ k: 1, a: 2, b: 2, n: 2, r: 2, c: 2, p: 5 \};/);
  assert.match(sp, /return !facing\(b\) && !C\.inCheck\(b, "r"\) && !C\.inCheck\(b, "b"\);/);
  assert.match(sp, /if \(ENG\[key\] !== m\) continue;/);
  assert.match(sj, /if \(ans === "y" \? e\.alt - e\.cap > 50 : e\.alt - e\.cap < 100\) continue;/);
});
