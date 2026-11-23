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

/* 從 testkinds.js 原文取出 CLASSIFIED 裡的檔名（不 require、不執行它）。
   2026-11-23 起不再用正規式掃原文：原本註解裡的 "test-*.js" 也算「已登記」——登記行被單行註解或區塊註解吃掉時 CI 照樣綠
   （#74 就是：testkinds 一行註解結尾少一個 /，後面的登記整段被吃進註解；iMac Claude 2 審 #85 時發現）。
   現在照 JavaScript 的規則逐字掃：從檔頭開始跳過字串與註解，找到「程式碼裡」（不在註解、字串裡）的 `const CLASSIFIED = new Set([`，
   再掃到對應的 `]`，途中拿掉註解；剩下的必須是純字串陣列（JSON，允許最後一個逗號），每一項都是 test-*.js。
   註解沒結束、字串沒結束、陣列裡有字串以外的東西（程式碼、巢狀陣列）、找不到清單：一律回 null＝讀不懂，不能當通過。 */
function classifiedSet(src) {
  const MARK = "const CLASSIFIED = new Set([";
  src = String(src);
  const n = src.length;
  let i = 0, inArr = false, out = "";
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === "/" && d === "/") { const e = src.indexOf("\n", i); i = e < 0 ? n : e; continue }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); if (e < 0) return null; i = e + 2; if (inArr) out += " "; continue }
    if (c === '"' || c === "'" || c === "`") {
      let j = i + 1;
      while (j < n && src[j] !== c) { if (src[j] === "\\") j++; else if (c !== "`" && src[j] === "\n") return null; j++ }
      if (j >= n) return null;
      if (inArr) out += src.slice(i, j + 1);
      i = j + 1; continue;
    }
    if (!inArr) { if (src.startsWith(MARK, i)) { inArr = true; i += MARK.length } else i++; continue }
    if (c === "]") {
      /* #95 審查（iMac Claude 2）：`]` 後面（跳過空白與註解）一定要緊接 `)` 再 `;`，也就是清單原封不動交給 new Set。
         否則寫成 [ … ].filter(…)、.slice(…)、.concat(…) 就能在執行時拿掉登記，靜態讀到的清單卻還算已登記 */
      let k = i + 1;
      const skipWs = () => { for (;;) { while (k < n && /\s/.test(src[k])) k++;
        if (src[k] === "/" && src[k + 1] === "*") { const e = src.indexOf("*/", k + 2); if (e < 0) return false; k = e + 2; continue }
        if (src[k] === "/" && src[k + 1] === "/") { const e = src.indexOf("\n", k); k = e < 0 ? n : e; continue }
        return true } };
      if (!skipWs() || src[k] !== ")") return null;
      k++;
      if (!skipWs() || src[k] !== ";") return null;
      let arr;
      try { arr = JSON.parse("[" + out.replace(/,\s*$/, "") + "]") } catch (e) { return null }
      if (!arr.every(x => typeof x === "string" && /^test-[^/\\]+\.js$/.test(x))) return null;
      return new Set(arr);
    }
    out += c; i++;
  }
  return null;
}

/* 這個 PR 新增的測試檔（只算新加的，改名、修改不算） */
function addedTests(base, git = (...a) => cp.execFileSync("git", a, { encoding: "utf8" })) {
  /* --no-renames：PR #19 審查（iMac）——把已分類的檔改名成新名字，原本會被當成「改名」而不算新增，可以繞過分類檢查 */
  const out = git("diff", "--name-only", "--no-renames", "--diff-filter=A", base + "...HEAD", "--", TOOLS.split(path.sep).join("/"));
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
