#!/usr/bin/env node
/* W48-S6 順炮門「搶攻算殺步」出題腳本（不是測試；CI 由 test-jh-shunpao-1122.js 用同一支程式重算核對）。
   用固定種子擺子（雙方將帥在九宮、攻子車馬炮兵卒、仕相放在合法位置），用 m/07z9i-shunpao.js 自己的 jhSpFastest 窮舉
   紅、黑各自最快幾步連將殺（同一支程式，App 和題庫算法一定一樣），寫回模組裡 JH_SP_Q 那一段。
   篩選：雙方都沒被將軍；雙方都有連將殺；同一個盤面不重複。輪誰走交替，每一級「紅先殺到」「黑先殺到」各一半。
     初級：攻子各 2、沒有仕相，步數一方 1、一方 2（不出同快）。
     中級：攻子各 3＋仕相各 0～2，步數都在 2～3，至少有一方 3 步；同快最多 6 題。
     高級：攻子各 4＋仕相各 1～3，步數都在 3～4，至少有一方 4 步；同快最多 6 題。
   每級 20 題。
   用法：node xiangqi-lab/tools/shunpao-build.js           寫回模組
         node xiangqi-lab/tools/shunpao-build.js --check   重跑一次，跟模組裡現在的題庫逐字比對，不一樣就結束碼 1 */
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SITE = fs.existsSync(path.join(ROOT, "xiangqi-lab", "site", "core.js")) ? path.join(ROOT, "xiangqi-lab", "site") : path.join(ROOT, "..");
const C = require(path.join(SITE, "core.js"));
const MOD = path.join(ROOT, "xiangqi-db", "m", "07z9i-shunpao.js");
const SRC = fs.readFileSync(MOD, "utf8");
const CHECK = process.argv.includes("--check");
const a = SRC.indexOf("const JH_SP_LV="), b = SRC.indexOf("/* 題庫：");
if (a < 0 || b < a) { console.log("✘ 模組裡找不到 jhSpFastest"); process.exit(1) }
const X = vm.runInNewContext(SRC.slice(a, b) + ";({jhSpFastest,jhSpWinner})", { window: { XQCore: C }, store: { get: () => null, set() {} } });
const M0 = "/* ==JH_SP_Q== */\n", M1 = "/* ==/JH_SP_Q== */";

let h = 0x9e3779b9;
const R = () => { h ^= h << 13; h >>>= 0; h ^= h >>> 17; h ^= h << 5; h >>>= 0; return h };
const ATT = { r: ["R", "N", "C", "P"], b: ["r", "n", "c", "p"] };
const ADV = { r: [84, 86, 76, 66, 68], b: [3, 5, 13, 21, 23] }, ELE = { r: [83, 87, 63, 67, 71, 47, 51], b: [2, 6, 18, 22, 26, 38, 42] };
const KING = { r: [84, 85, 86, 75, 76, 77, 66, 67, 68], b: [3, 4, 5, 12, 13, 14, 21, 22, 23] };
const pawnOk = (p, s) => { const r = (s / 9) | 0, c = s % 9; return p === "P" ? (r <= 4 || (r <= 6 && c % 2 === 0)) : (r >= 5 || (r >= 3 && c % 2 === 0)) };
const LV = {
  easy: { att: 2, def: [0, 0], ok: (r, k) => (r === 1 && k === 2) || (r === 2 && k === 1), max: 2, tie: 0 },
  mid: { att: 3, def: [0, 2], ok: (r, k) => r >= 2 && k >= 2 && r <= 3 && k <= 3 && (r === 3 || k === 3 || r === k), max: 3, tie: 6 },
  hard: { att: 4, def: [1, 3], ok: (r, k) => r >= 3 && k >= 3 && r <= 4 && k <= 4 && (r === 4 || k === 4 || r === k), max: 4, tie: 6 },
};
function gen(L) {
  const b = Array(90).fill(null);
  b[KING.b[R() % 9]] = "k"; b[KING.r[R() % 9]] = "K";
  const put = (p, list) => { for (let k = 0; k < 60; k++) { const s = list ? list[R() % list.length] : R() % 90; if (!b[s] && (!/p/i.test(p) || pawnOk(p, s))) { b[s] = p; return true } } return false };
  for (const s of ["r", "b"]) {
    for (let i = 0; i < L.att; i++) if (!put(ATT[s][R() % 4])) return null;
    const nd = L.def[0] + R() % (L.def[1] - L.def[0] + 1);
    for (let i = 0; i < nd; i++) { const A = R() % 2; if (!put(A ? (s === "r" ? "A" : "a") : (s === "r" ? "B" : "b"), A ? ADV[s] : ELE[s])) return null }
  }
  if (C.inCheck(b, "r") || C.inCheck(b, "b")) return null;
  return b;
}
const Q = [];
for (const [lv, L] of Object.entries(LV)) {
  const seen = new Set(), got = { r: 0, b: 0 }; let ties = 0, n = 0, tries = 0;
  while (n < 20 && tries < 2e6) {
    tries++;
    const bd = gen(L); if (!bd) continue;
    const fen = C.fen(bd).split(" ")[0]; if (seen.has(fen)) continue;
    const r = X.jhSpFastest(bd, "r", L.max); if (!r) continue;
    const k = X.jhSpFastest(bd, "b", L.max); if (!k || !L.ok(r, k)) continue;
    if (r === k && ties >= L.tie) continue;
    const turn = n % 2 ? "b" : "r", q = { lv, fen, turn, r, b: k }, w = X.jhSpWinner(q);
    if (got[w] >= 10) continue;
    seen.add(fen); got[w]++; if (r === k) ties++; n++; Q.push(q);
  }
  if (n < 20) { console.log(`✘ ${lv} 只出了 ${n} 題`); process.exit(1) }
  console.log(`${lv}：20 題（紅先殺 ${got.r}、黑先殺 ${got.b}、同快 ${ties}；擺了 ${tries} 盤）`);
}
const body = "const JH_SP_Q=[\n" + Q.map((q) => "  " + JSON.stringify(q)).join(",\n") + "];\n";
const i0 = SRC.indexOf(M0), i1 = SRC.indexOf(M1);
if (i0 < 0 || i1 < i0) { console.log("✘ 模組裡找不到題庫標記"); process.exit(1) }
const OUT = SRC.slice(0, i0 + M0.length) + body + SRC.slice(i1);
if (CHECK) { if (OUT !== SRC) { console.log("✘ 重跑出來的題庫跟模組裡的不一樣"); process.exit(1) } console.log("✔ 題庫跟重跑結果逐字相同"); process.exit(0) }
fs.writeFileSync(MOD, OUT); console.log("✔ 寫回 " + path.relative(ROOT, MOD) + "：" + Q.length + " 題");
