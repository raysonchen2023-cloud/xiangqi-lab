#!/usr/bin/env node
// 象棋千秋 CI：略過稽核——這次跑出來的每一條「略過」都要在白名單裡（W57／第 21 輪評比 R21-F1，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 讀完整驗證的輸出（verify-all.js --out 的檔，裡面有 testkinds 印的「略過的項目」逐條清單），跟 .github/test-skip-allow.json 比對：
//   - 有一條略過不在白名單 → 紅燈（新冒出來的略過＝有東西沒測到，要嘛修好、要嘛經審查加進白名單）
//   - 找不到測試總結那一行（「四欄合計」）→ 測不成立，也算紅燈（不能因為沒跑到就當通過）
//   - 白名單裡有、這次沒略過的 → 只提醒（代表那項現在真的跑了，白名單可以刪掉）
// 白名單只能經過 .github/ 逐行審的 PR 修改。
// 用法：node .github/scripts/check-test-skips.cjs <驗證輸出檔> [白名單，預設 .github/test-skip-allow.json]
// 結束代碼：0 全部在白名單；1 有新的略過；2 輸出檔或白名單讀不到、格式不對、找不到測試總結
"use strict";
const fs = require("fs"), path = require("path");

const HEAD = "略過的項目";
/* 從驗證輸出抽出略過清單：每行「  ﹣ 檔名：項目（原因）」，整行內容就是比對的鍵 */
function parseSkips(text) {
  if (!/四欄合計：通過 \d+、失敗 \d+、略過 \d+/.test(text)) return null;
  const m = /四欄合計：通過 \d+、失敗 \d+、略過 (\d+)/.exec(text), n = Number(m[1]);
  const lines = text.split("\n"), out = [];
  const i = lines.findIndex(l => l.trimStart().startsWith(HEAD));   /* verify-all.js 的紀錄會把每一步的輸出縮排兩格（PR #17 第一次 CI 就是卡在這裡） */
  if (i >= 0) for (let j = i + 1; j < lines.length; j++) { const s = /^\s*﹣ (.+)$/.exec(lines[j]); if (!s) break; out.push(s[1].trim()) }
  return { total: n, items: out };
}

function compare(skips, allow) {
  const A = new Set(allow), S = new Set(skips.items);
  return { added: skips.items.filter(x => !A.has(x)), gone: allow.filter(x => !S.has(x)), countMismatch: skips.items.length !== skips.total };
}

if (require.main === module) {
  const [outFile, allowFile = path.join(".github", "test-skip-allow.json")] = process.argv.slice(2);
  if (!outFile) { console.error("用法：node .github/scripts/check-test-skips.cjs <驗證輸出檔> [白名單]"); process.exit(2) }
  let text, allow;
  try { text = fs.readFileSync(outFile, "utf8") } catch (e) { console.error("讀不到驗證輸出：" + outFile); process.exit(2) }
  try { allow = JSON.parse(fs.readFileSync(allowFile, "utf8")).allow } catch (e) { console.error("白名單讀不到或格式不對：" + allowFile); process.exit(2) }
  if (!Array.isArray(allow)) { console.error("白名單缺 allow 陣列"); process.exit(2) }
  const sk = parseSkips(text);
  if (!sk) { console.error("驗證輸出裡找不到測試總結（四欄合計）：測試可能沒跑，不能當成通過"); process.exit(2) }
  const r = compare(sk, allow);
  if (r.countMismatch) { console.error(`略過總數 ${sk.total} 跟逐條清單 ${sk.items.length} 條對不上：輸出格式可能變了，不能當成通過`); process.exit(2) }
  console.log(`略過稽核：這次略過 ${sk.total} 項，白名單 ${allow.length} 項`);
  if (r.gone.length) console.log(`提醒：白名單有 ${r.gone.length} 項這次沒有略過（現在真的跑了，可以從白名單刪掉）：\n` + r.gone.map(x => "  ＋ " + x).join("\n"));
  if (r.added.length) {
    console.error(`略過稽核：${r.added.length} 項新的略過不在白名單（沒跑的測試不能悄悄增加）：\n` + r.added.map(x => "  － " + x).join("\n"));
    console.error("要嘛讓它真的跑；確定這個環境跑不了，才在 .github/test-skip-allow.json 加一行（改 .github/ 要逐行審）。");
    process.exit(1);
  }
  process.exit(0);
}
module.exports = { parseSkips, compare };
