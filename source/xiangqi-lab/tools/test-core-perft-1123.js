// W79 主規則 Perft＋鏡射不變式（開發者 11/23 看外部測試手法清單後選單選「主規則 Perft＋鏡射測試」）：core.js
//   Perft＝從固定局面窮舉 1～3 層的合法步總數。標準答案由 Pikafish 2026-09-06 的「go perft」算（不是用 core.js 自己算），
//   走法產生器只要錯一點（蹩馬腿、塞象眼、炮架、將帥照面、被將軍時的應著），數字就對不上。
//   局面：開局、固定種子從開局隨機走出來的 8 個局面、7 個專門考規則的手擺局面（含將帥照面、被將死）；數字是 11/23 實算後寫死在這裡。
//   重算標準答案：在 xiangqi-db/engine 底下對每個局面送
//     position fen <局面> - - 0 1
//     go perft <1、2、3>
//   給 Pikafish 原生版，讀「Nodes searched: N」。局面要合法（不輪走的一方不能正被將軍），否則 Pikafish 會拒絕（Unsupported position）。
//   不變式（不需要標準答案）：左右鏡射後、紅黑互換（轉 180 度＋換顏色＋換人走）後，各層合法步數不變；走一步再退回，盤面完全相同。
// 用法：node --test xiangqi-lab/tools/test-core-perft-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), path = require("path");
const C = require(path.join(__dirname, "../..", "xiangqi-lab", "site", "core.js"));

const GOLD = [
  ["開局", "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w", [44, 1920, 79666]],
  ["隨機走 3 步", "rnbakabnr/9/1c5c1/p1p1p1p2/6C1p/9/P1P1P1P1P/7C1/9/RNBAKABNR b", [46, 1944, 81754]],
  ["隨機走 8 步", "1nbakabnr/r8/1c4c2/p1p3p1p/4p4/P8/2P1P1P1P/R5CCN/9/1NBAKAB1R w", [37, 1733, 67419]],
  ["隨機走 15 步", "r2ak1bn1/4a3r/1cn6/p1p1p1p1p/2b6/9/PcP1P1P1P/BC7/4R2C1/1N1AKABNR b", [36, 1269, 46302]],
  ["隨機走 24 步", "rn1a1abnr/2C1k4/4b4/1cp1p1p1p/p8/2B1P2C1/P2c2P1P/9/R3K4/3A1ABNR w", [35, 1426, 50909]],
  ["隨機走 36 步", "r1cak4/3n1n3/br1ab4/p1p1p1p1p/1R7/9/PcP1P1P1P/4C2CN/9/1NBAKABR1 w", [43, 1369, 58563]],
  ["隨機走 50 步", "3aknb2/2r1a4/2n6/2p3p2/1P1N2bPp/2c6/p3P3P/BC4R2/4AC3/R3KABN1 w", [55, 1701, 90045]],
  ["隨機走 70 步", "1n1aka2r/8r/b2c4b/pP2n4/C4Cp1p/4R4/2P1p1PcP/7R1/4K4/1NBA1ABN1 w", [61, 2549, 145823]],
  ["隨機走 95 步", "r1b1k1b1r/4a2C1/n8/6p1p/p1p2nP2/8P/2N1p2R1/1c1A2N2/6C2/2RAK1B2 b", [41, 2251, 88173]],
  ["俥在中路、帥將不同路（俥可以自由走）", "3k5/9/9/9/4R4/9/9/9/9/4K4 w", [18, 16, 295]],
  ["將帥照面：帥將同一路，中間只有一個炮（炮只能沿這一路走）", "4k4/9/9/9/4C4/9/9/9/9/4K4 w", [10, 27, 420]],
  ["黑方被將死：沒有任何合法步", "R2k5/2P1a4/9/9/9/9/9/9/9/5K3 b", [0, 0, 0]],
  ["炮架：炮隔一子吃、沒架不能吃", "4k4/9/4c4/9/9/4p4/9/4C4/9/3K5 w", [14, 170, 2749]],
  ["蹩馬腿、塞象眼", "3k5/9/9/9/9/2P6/2n2n3/2N1B4/9/4K4 w", [10, 150, 1264]],
  ["過河兵橫走、沒過河不能橫走", "3k5/9/9/2P3P2/9/4P4/9/9/9/4K4 w", [9, 18, 175]],
  ["黑方走：被將軍時只能解將", "4k4/9/9/9/9/9/9/9/4R4/3K5 b", [1, 19, 26]]];

const load = (fen) => { const [b, s] = fen.split(" "); return [C.parseFen(b), s === "w" ? "r" : "b"] };
const other = (s) => (s === "r" ? "b" : "r");
function perft(b, s, d) { if (d === 0) return 1; const L = C.legal(b, s); if (d === 1) return L.length; let n = 0; for (const [f, t] of L) n += perft(C.make(b, f, t), other(s), d - 1); return n }
const mirror = (b) => b.map((_, i) => b[(i / 9 | 0) * 9 + (8 - i % 9)]);
const swapColor = (b) => b.map((_, i) => { const p = b[89 - i]; return p ? (p === p.toUpperCase() ? p.toLowerCase() : p.toUpperCase()) : null });

for (const [name, fen, want] of GOLD) {
  test("Perft 對 Pikafish：" + name + "（" + want.join("／") + "）", () => {
    const [b, s] = load(fen);
    assert.deepEqual([1, 2, 3].map((d) => perft(b, s, d)), want, fen);
  });
}

test("左右鏡射、紅黑互換後，每個局面 1～2 層合法步數都不變（不需要標準答案）", () => {
  for (const [name, fen] of GOLD) {
    const [b, s] = load(fen), base = [perft(b, s, 1), perft(b, s, 2)];
    assert.deepEqual([perft(mirror(b), s, 1), perft(mirror(b), s, 2)], base, name + " 鏡射");
    assert.deepEqual([perft(swapColor(b), other(s), 1), perft(swapColor(b), other(s), 2)], base, name + " 紅黑互換");
  }
});

test("走一步再退回，盤面完全相同；每一步都不會讓自己的帥（將）被將軍、也不會讓將帥照面", () => {
  for (const [name, fen] of GOLD) {
    const [b, s] = load(fen);
    for (const [f, t] of C.legal(b, s)) {
      const n = C.make(b, f, t), back = n.slice(); back[f] = n[t]; back[t] = b[t];
      assert.deepEqual(back, b, name + " 退回");
      assert.ok(!C.inCheck(n, s), name + " 走完自己被將軍：" + f + "→" + t);
      const rk = n.indexOf("K"), bk = n.indexOf("k");
      if (rk % 9 === bk % 9) { let between = false; for (let i = bk + 9; i < rk; i += 9) if (n[i]) between = true; assert.ok(between, name + " 走完將帥照面") }
    }
  }
});
