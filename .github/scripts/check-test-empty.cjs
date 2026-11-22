#!/usr/bin/env node
// 象棋千秋 CI：0 項測試的檔要報錯，沒跑到的測試檔也要報錯（W69 流程盤點第 18 項，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：testkinds.js 逐檔跑 node --test，只數 TAP 裡的項目。一支測試檔如果一項都沒跑出來
//   （test() 全被包在條件裡、整段被註解掉、寫成別的呼叫），它的三類都是 0/0，不算失敗，CI 照樣綠。
//   另外 testkinds.js 的 SKIP 清單整支不跑；在那裡加一個檔名，那支測試就從 CI 消失，也不會有人發現。
// 做法：讀完整驗證的逐項結果（verify-all.js --tally-out 的 JSON）：
//   - 結果裡有一支檔 0 項 → 紅燈（要嘛補測試，要嘛刪掉那支檔）
//   - 測試資料夾裡的 test-*.js 有一支不在結果裡（被 SKIP 或用別的方法跳掉）→ 紅燈；
//     唯一准不跑的是下面 EXEMPT 那幾支，要多加得改這支，改 .github/ 要逐行審
//   - 讀不到結果、格式不對 → 測不成立（結束代碼 2），不能當成通過
//   只全部略過（skip）或全部預期失敗（todo）的檔不算 0 項：那兩種各有略過稽核、todo 稽核管。
// 用法：node .github/scripts/check-test-empty.cjs <tally.json> [--dir source/xiangqi-lab/tools]
// 結束代碼：0 每支都有跑到、都至少 1 項；1 有 0 項的檔或沒跑到的檔；2 讀不到、格式不對、資料夾不存在
"use strict";
const fs = require("fs"), path = require("path");
const DIR = path.join("source", "xiangqi-lab", "tools");
/* 准不跑的測試檔：test-home-focus.js 會開無頭 Chrome（CI 與本機統計都不跑；testkinds.js 的 SKIP）。testkinds.js 自己不叫 test-*.js，不在比對範圍 */
const EXEMPT = new Set(["test-home-focus.js"]);

/* 逐項結果 → 每支檔的項數；格式不對回 null */
function fileCounts(t) {
  if (!t || !Array.isArray(t.files)) return null;
  const out = [];
  for (const f of t.files) {
    if (!f || typeof f.file !== "string" || !Array.isArray(f.items)) return null;
    /* 檔裡一項 test() 都沒跑時，node --test 會把「這支檔本身」報成一項通過（名稱＝檔名）。testkinds.js 會還原成 0 項，
       這裡不靠它、自己再認一次：基準版守門跑的是 main 那一版 testkinds.js */
    const it = f.items, self = it.length === 1 && it[0] && it[0].ok && !it[0].skip && !it[0].todo && it[0].name === f.file;
    out.push({ file: f.file, n: self ? 0 : it.length });
  }
  return out;
}

/* empty＝結果裡 0 項的檔；missing＝資料夾有、結果沒有的檔（扣掉 EXEMPT） */
function compare(counts, onDisk, exempt = EXEMPT) {
  const seen = new Set(counts.map((c) => c.file));
  return {
    empty: counts.filter((c) => c.n === 0).map((c) => c.file),
    missing: onDisk.filter((f) => /^test-.*\.js$/.test(f) && !exempt.has(f) && !seen.has(f)).sort(),
  };
}

/* 主流程（可注入讀檔與列資料夾，自我測試用）：回傳結束代碼 */
function run({ tallyFile, dir = DIR, read = (f) => fs.readFileSync(f, "utf8"), list = (d) => fs.readdirSync(d), log = console.log, err = console.error }) {
  let t, onDisk;
  try { t = JSON.parse(read(tallyFile)) } catch (e) { err("讀不到逐項結果：" + tallyFile + "（測試可能沒跑，不能當成通過）"); return 2 }
  const counts = fileCounts(t);
  if (!counts) { err("逐項結果格式不對（缺 files，或某支檔缺 file、items）：不能當成通過"); return 2 }
  try { onDisk = list(dir) } catch (e) { err("找不到測試資料夾：" + dir); return 2 }
  const r = compare(counts, onDisk);
  log(`0 項檢查：結果裡 ${counts.length} 支測試檔，資料夾裡 ${onDisk.filter((f) => /^test-.*\.js$/.test(f)).length} 支（准不跑 ${[...EXEMPT].join("、")}）`);
  let bad = 0;
  if (r.empty.length) {
    bad = 1;
    err(`有 ${r.empty.length} 支測試檔一項都沒跑出來（0/0 不算失敗，會讓 CI 照樣綠）：\n` + r.empty.map((f) => "  － " + f).join("\n"));
    err("要嘛補上真的會跑的測試，要嘛刪掉那支檔；跑不了的項目用 { skip: \"原因\" }，會進略過稽核。");
    err("如果那支檔只有一項、名稱剛好跟檔名一樣：TAP 裡跟「一項都沒跑」長得一樣，分不出來，寧可紅燈；把那一項改名就好（PR #60 Codex 審查）。");
  }
  if (r.missing.length) {
    bad = 1;
    err(`有 ${r.missing.length} 支測試檔沒跑到（可能被加進 testkinds.js 的 SKIP）：\n` + r.missing.map((f) => "  － " + f).join("\n"));
    err("准不跑的只有 .github/scripts/check-test-empty.cjs 的 EXEMPT；要加得改那支，改 .github/ 要逐行審（W69 流程盤點第 18 項）。");
  }
  if (!bad) log("✔ 每支測試檔都有跑到，而且至少 1 項");
  return bad;
}

module.exports = { fileCounts, compare, run, EXEMPT, DIR };
if (require.main !== module) return;

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d };
const tallyFile = args.find((x, i) => !x.startsWith("--") && args[i - 1] !== "--dir");
if (!tallyFile) { console.error("用法：node .github/scripts/check-test-empty.cjs <tally.json> [--dir 測試資料夾]"); process.exit(2) }
process.exit(run({ tallyFile, dir: opt("--dir", DIR) }));
