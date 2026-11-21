// 功能 PR 的發布產物守門（W36 第二輪審查 1，iMac Claude 2）：
//   GitHub Pages 從 main 根目錄直接發布，功能 PR 若改到網站檔（index.html、sw.js、release.json、data/、engine/、根目錄的 js…），
//   合併就等於上線，繞過發布 PR。功能模式又會先用原始碼組出 index.html，蓋掉 PR 自己改的 index.html，檢查看不出來。
//   所以功能 PR 只准改 source/、.github/、releases/；其他路徑（含刪除、改名）一律擋下，要改請走 release/ 分支的發布 PR。
// 用法：node .github/scripts/guard-release-files.cjs [比較基準，預設 origin/main]
"use strict";
const { execFileSync } = require("child_process");
const base = process.argv[2] || "origin/main";
const ALLOW = /^(source|\.github|releases)\//;
const files = execFileSync("git", ["-c", "core.quotePath=false", "diff", "--name-only", "-z", "--no-renames", `${base}...HEAD`])
  .toString().split("\0").filter(Boolean);
const bad = files.filter(f => !ALLOW.test(f));
console.log(`本 PR 改到 ${files.length} 個檔（比較基準 ${base}；改名算成刪除＋新增，兩個路徑都檢查）`);
if (bad.length) {
  console.log("✘ 功能 PR 只能改 source/、.github/、releases/。下列是會直接上線的網站檔，請改走 release/ 分支的發布 PR：\n  " + bad.join("\n  "));
  process.exit(1);
}
console.log("✔ 沒有動到會直接上線的網站檔");
