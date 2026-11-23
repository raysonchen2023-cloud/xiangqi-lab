// W73 飛相門、起馬門題目的「局面合法」（11/23 Pikafish 棋理驗證：飛相 36% 題目有過河的相或出九宮的仕；起馬約 5% 黑子超量）。
//   vm 跑真的 07z9j、07z9f 與 core.js，用日期模擬每天的題目，另寫一套獨立的合法檢查（不呼叫模組自己的判斷）：
//   各子數量上限、仕在九宮五點、相在七個象眼點、兵卒位置、將帥照面、開局沒有人正被將軍。
// 用法：node --test xiangqi-lab/tools/test-jh-fxqm-legal-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));

function load(file, names) {
  const c = { window: { XQCore: C }, document: undefined, jhL: (zh) => zh, esc: (s) => String(s), jhWindDay: () => "2026-11-23",
    store: { get: (k, d) => d, set() {} }, addXP() {} };
  vm.createContext(c);
  vm.runInContext(rd(file) + `;this.R={${names}}`, c);
  return c.R;
}

/* 獨立的合法檢查（盤面 row 0＝黑方底線、row 9＝紅方底線；格號＝row*9+col） */
const RED_A = [66, 68, 76, 84, 86], BLK_A = [3, 5, 13, 21, 23];
const RED_B = [47, 51, 63, 67, 71, 83, 87], BLK_B = [2, 6, 18, 22, 26, 38, 42];
const MAX = { K: 1, A: 2, B: 2, N: 2, R: 2, C: 2, P: 5 };
function issues(b) {
  const o = [], cnt = {};
  b.forEach((p, i) => {
    if (!p) return; cnt[p] = (cnt[p] || 0) + 1;
    const r = (i / 9) | 0, c = i % 9, red = p === p.toUpperCase(), T = p.toUpperCase();
    if (T === "K" && !(c >= 3 && c <= 5 && (red ? r >= 7 : r <= 2))) o.push(p + "@" + i + " 出九宮");
    if (T === "A" && !(red ? RED_A : BLK_A).includes(i)) o.push(p + "@" + i + " 仕士位置");
    if (T === "B" && !(red ? RED_B : BLK_B).includes(i)) o.push(p + "@" + i + " 相象位置");
    if (T === "P") {
      if (red ? r >= 7 : r <= 2) o.push(p + "@" + i + " 兵卒在兵線後面");
      else if (red ? r >= 5 && c % 2 : r <= 4 && c % 2) o.push(p + "@" + i + " 沒過河的兵卒在單數路");
    }
  });
  for (const p in cnt) if (cnt[p] > MAX[p.toUpperCase()]) o.push(p + " 有 " + cnt[p] + " 顆");
  const rk = b.indexOf("K"), bk = b.indexOf("k");
  if (rk >= 0 && bk >= 0 && rk % 9 === bk % 9) { let between = false; for (let i = bk + 9; i < rk; i += 9) if (b[i]) between = true; if (!between) o.push("將帥照面") }
  if (C.inCheck(b, "r") || C.inCheck(b, "b")) o.push("開局有人被將軍");
  return o;
}
function days(n) { const out = [], d0 = Date.UTC(2026, 10, 23); for (let i = 0; i < n; i++) out.push(new Date(d0 + i * 864e5).toISOString().slice(0, 10)); return out }

test("獨立檢查自己先驗：抓得到報告裡的壞局面（相在 e6、仕在 c1、黑 3 砲），正常局面不誤報", () => {
  assert.ok(issues(C.parseFen("3k5/9/9/4B4/9/2P6/9/9/4A4/4K4 w").board || C.parseFen("3k5/9/9/4B4/9/2P6/9/9/4A4/4K4 w")).some((x) => /相象/.test(x)));
  const pf = (f) => { const x = C.parseFen(f); return x.board || x };
  assert.ok(issues(pf("5k3/9/9/9/9/9/4P4/9/2A6/2B1K4 w")).some((x) => /仕士/.test(x)));
  assert.ok(issues(pf("4k4/5c3/9/9/9/4c4/9/8N/8p/2n1cK3 w")).some((x) => /c 有 3/.test(x)));
  assert.deepEqual(issues(pf("4k4/9/9/9/9/9/9/4B4/4A4/4K4 w")), []);
});

test("飛相門：2026-11-23 起 30 天 × 三級 × 3 題，起始局面全部合法（修正前 36% 不合法）", () => {
  const R = load("xiangqi-db/m/07z9j-feixiang.js", "JH_FX_LV,jhFxRound");
  let n = 0; const bad = [];
  for (const d of days(30)) for (const L of R.JH_FX_LV) for (const q of R.jhFxRound(L, d)) { n++; const o = issues(q.b); if (o.length) bad.push(d + " " + L.k + " " + o.join("、")) }
  assert.ok(n >= 240, "題目幾乎都出得來：" + n);
  assert.deepEqual(bad.slice(0, 5), [], "不合法 " + bad.length + " 題");
});

test("起馬門：2026-11-23 起 365 天 × 三級 × 3 題，黑子數量不超過真實上限、局面合法（修正前約 5% 超量）", () => {
  const R = load("xiangqi-db/m/07z9f-qima.js", "JH_QIMA_LV,jhQimaRound");
  let n = 0; const bad = [];
  for (const d of days(365)) for (const L of R.JH_QIMA_LV) for (const q of R.jhQimaRound(L, d)) { n++; const o = issues(q.b); if (o.length) bad.push(d + " " + L.k + " " + o.join("、")) }
  assert.ok(n >= 3200, "題目幾乎都出得來：" + n);
  assert.deepEqual(bad.slice(0, 5), [], "不合法 " + bad.length + " 題");
});
