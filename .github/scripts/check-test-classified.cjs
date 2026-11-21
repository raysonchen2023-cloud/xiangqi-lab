#!/usr/bin/env node
// 象棋千秋 CI：新增的測試檔一定要分類（W60 第 1 期 A3，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// testkinds.js 把測試分成行為／混合／原始碼比對三類，交接單與評比都引用這三個數字。
// 沒列進 CLASSIFIED 的檔全部算「待分類」，第 21 輪評比時約四成測試沒分類，三類數字就不可信。
// 既有的待分類檔另開工單慢慢清；這支只管「這個 PR 新加的測試檔」：沒列進 CLASSIFIED 就紅燈。
// 用法：node .github/scripts/check-test-classified.cjs <比較基準，例如 origin/main>
// 結束代碼：0 新增的都分類了（或沒有新增）；1 有新增的沒分類；2 git 或 testkinds.js 讀不到
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const TOOLS = path.join("source", "xiangqi-lab", "tools");

/* 從 testkinds.js 原文抽出 CLASSIFIED 裡的檔名（不 require，免得執行到它） */
function classifiedSet(src) {
  const a = src.indexOf("const CLASSIFIED = new Set(["), b = a < 0 ? -1 : src.indexOf("]);", a);
  if (a < 0 || b < 0) return null;
  return new Set([...src.slice(a, b).matchAll(/"(test-[^"]+\.js)"/g)].map(m => m[1]));
}

/* 這個 PR 新增的測試檔（只算新加的，改名、修改不算） */
function addedTests(base, git = (...a) => cp.execFileSync("git", a, { encoding: "utf8" })) {
  const out = git("diff", "--name-only", "--diff-filter=A", base + "...HEAD", "--", TOOLS.split(path.sep).join("/"));
  return out.split("\n").map(s => s.trim()).filter(f => /\/test-[^/]+\.js$/.test(f)).map(f => f.split("/").pop());
}

function check(added, set) { return added.filter(f => !set.has(f)) }

if (require.main === module) {
  const base = process.argv[2];
  if (!base) { console.error("用法：node .github/scripts/check-test-classified.cjs <比較基準>"); process.exit(2) }
  let src, added;
  try { src = fs.readFileSync(path.join(TOOLS, "testkinds.js"), "utf8") } catch (e) { console.error("讀不到 testkinds.js"); process.exit(2) }
  const set = classifiedSet(src);
  if (!set || !set.size) { console.error("testkinds.js 裡找不到 CLASSIFIED 清單：格式可能變了，不能當成通過"); process.exit(2) }
  try { added = addedTests(base) } catch (e) { console.error("git diff 失敗：" + e.message); process.exit(2) }
  const bad = check(added, set);
  console.log(`測試分類：這個 PR 新增 ${added.length} 支測試檔，已分類清單有 ${set.size} 支`);
  if (bad.length) {
    console.error(`新增的測試檔沒分類（${bad.length} 支）：\n` + bad.map(f => "  － " + f).join("\n"));
    console.error("請在 source/xiangqi-lab/tools/testkinds.js 的 CLASSIFIED 加一行，並把每一項的名稱照規則標〔原始碼〕或〔混合〕（行為的不用標），註明各幾項。");
    process.exit(1);
  }
  process.exit(0);
}
module.exports = { classifiedSet, addedTests, check };
