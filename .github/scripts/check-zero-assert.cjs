#!/usr/bin/env node
// 象棋千秋 CI：抓「通過但一次斷言都沒做」的測試（W69 流程盤點第 10 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 讀 assert-count.cjs 在執行期記下的每項測試斷言次數：
//   ・沒有略過、斷言 0 次 → 紅燈（除非列在 .github/zero-assert-allow.json，那份要逐行審）
//   ・用 t.skip() 明列略過的不算（略過本身由 check-test-skips.cjs 對白名單）
//   ・記到的「沒略過」項數要 ≥ 驗證紀錄裡的「通過」項數：少了代表計數器沒掛上或有測試沒被記到，不能當沒問題（缺驗＝紅燈）
// 用法：node .github/scripts/check-zero-assert.cjs <assert-count 資料夾> <驗證紀錄 verify-ci.txt> [白名單，預設 .github/zero-assert-allow.json]
// 結束代碼：0 沒有；1 有 0 次斷言的測試，或記到的項數不夠；2 用法錯誤或讀不到檔
"use strict";
const fs = require("fs"), path = require("path");

/* 純函式：recs＝{檔名: [{name,n,skipped}]}；passed＝驗證紀錄的通過項數；allow＝["檔名：測試名稱", …] */
function judge(recs, passed, allow) {
  const A = new Set(allow || []), zero = [], used = new Set();
  let counted = 0;
  for (const [file, list] of Object.entries(recs)) for (const c of list || []) {
    if (c.skipped) continue;
    counted++;
    if (c.n > 0) continue;
    const key = file + "：" + c.name;
    if (A.has(key)) { used.add(key); continue }
    zero.push(key);
  }
  const short = !(Number.isInteger(passed) && passed > 0) ? "讀不到驗證紀錄的「通過」項數" : counted < passed ? `記到的測試（${counted}）比通過的（${passed}）少：計數器沒掛上或有測試沒被記到` : null;
  return { zero, counted, short, unused: [...A].filter((k) => !used.has(k)), ok: !zero.length && !short };
}
/* 驗證紀錄裡 run-tests 的總結：「四欄合計：通過 N、失敗 …」 */
function passedOf(text) { const m = /四欄合計：通過 (\d+)、/.exec(String(text)); return m ? +m[1] : null }
function readDir(dir) {
  const o = {};
  for (const f of fs.readdirSync(dir).filter((n) => n.endsWith(".json")).sort()) o[f.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
  return o;
}

if (require.main === module) {
  const [dir, verify, allowF = path.join(".github", "zero-assert-allow.json")] = process.argv.slice(2);
  if (!dir || !verify) { console.error("用法：node .github/scripts/check-zero-assert.cjs <assert-count 資料夾> <verify-ci.txt> [白名單]"); process.exit(2) }
  if (!fs.existsSync(dir)) { console.error("✘ 找不到斷言計數資料夾 " + dir + "：計數器沒掛上（NODE_OPTIONS --require assert-count.cjs、XQ_ASSERT_DIR），不能當沒問題"); process.exit(1) }
  if (!fs.existsSync(verify)) { console.error("✘ 找不到驗證紀錄 " + verify); process.exit(2) }
  let allow = [];
  try { allow = JSON.parse(fs.readFileSync(allowF, "utf8")).allow || [] } catch (e) { console.error("✘ 讀不到白名單 " + allowF); process.exit(2) }
  const r = judge(readDir(dir), passedOf(fs.readFileSync(verify, "utf8")), allow);
  console.log(`斷言次數檢查：記到沒略過的測試 ${r.counted} 項，0 次斷言 ${r.zero.length} 項（白名單 ${allow.length} 項）`);
  if (r.short) console.error("✘ " + r.short);
  for (const z of r.zero) console.error("  ✘ " + z + "：通過了，但一次斷言都沒做");
  if (r.zero.length) console.error("注意：只用 t.assert 或自己 throw 錯誤的測試，這裡也會記成 0 次（計數器只算 node:assert）。改法：真的要驗就加斷言（用 node:assert）；這個環境驗不了就用 t.skip(\"原因\") 明列（再到 .github/test-skip-allow.json 登記）。確定不需要斷言才加進 .github/zero-assert-allow.json（改 .github/ 要逐行審）");
  for (const u of r.unused) console.log("  △ 白名單有、這次沒用到（可以拿掉）：" + u);
  process.exit(r.ok ? 0 : 1);
}
module.exports = { judge, passedOf, readDir };
