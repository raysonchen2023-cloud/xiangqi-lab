#!/usr/bin/env node
// 象棋千秋 CI：抓「假略過」——測試沒跑卻被算成通過（W57／第 21 輪評比 R21-F1，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 兩種寫法會讓 node:test 回報「通過」，其實什麼都沒檢查：
//   1. 空測試：test("…", () => {})，又沒有 { skip: "原因" } 選項
//   2. 缺檔直接 return：if (!fs.existsSync(x)) return;   →  要改成 return t.skip("原因")
// 用法：node .github/scripts/check-fake-skip.cjs [測試資料夾，預設 source/xiangqi-lab/tools]
// 結束代碼：0 沒有；1 有（逐條列出檔名與行號）；2 資料夾不存在
"use strict";
const fs = require("fs"), path = require("path");

const EMPTY = /\btest\(\s*(["'`])(?:(?!\1).)*\1\s*,\s*(?:async\s*)?\(\s*\w*\s*\)\s*=>\s*\{\s*\}\s*\)/;
const BARE_RETURN = /!\s*fs\.existsSync\((?:[^()]|\([^()]*\))*\)\s*\)\s*return\b(?!\s*t\.skip)(?!\s*test\.skip)/;

function scanText(text) {
  const out = [];
  text.split("\n").forEach((line, i) => {
    if (EMPTY.test(line)) out.push({ line: i + 1, kind: "空測試（沒有 skip 選項）", text: line.trim() });
    if (BARE_RETURN.test(line)) out.push({ line: i + 1, kind: "缺檔直接 return（要用 t.skip）", text: line.trim() });
  });
  return out;
}

function scanDir(dir) {
  const out = [];
  for (const f of fs.readdirSync(dir).filter(n => /^test-.*\.js$/.test(n)).sort())
    for (const r of scanText(fs.readFileSync(path.join(dir, f), "utf8"))) out.push({ file: f, ...r });
  return out;
}

if (require.main === module) {
  const dir = process.argv[2] || path.join("source", "xiangqi-lab", "tools");
  if (!fs.existsSync(dir)) { console.error("找不到測試資料夾：" + dir); process.exit(2) }
  const bad = scanDir(dir);
  if (!bad.length) { console.log("假略過檢查：沒有空測試，也沒有缺檔直接 return 的測試"); process.exit(0) }
  console.error(`假略過檢查：${bad.length} 處會讓沒跑的測試被算成通過`);
  for (const b of bad) console.error(`  ${b.file}:${b.line}　${b.kind}　${b.text.slice(0, 120)}`);
  console.error("改法：test(\"…\", { skip: \"原因\" }, () => {}) 或 if (!fs.existsSync(x)) return t.skip(\"原因\")");
  process.exit(1);
}
module.exports = { scanText, scanDir, EMPTY, BARE_RETURN };
