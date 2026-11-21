// PR 改到的文字檔檢查（W36）：不能有控制字元（Tab、換行除外）；同一個檔不能 CRLF 與 LF 混用。
// 過去出過的事：Bash 吃掉反斜線變成控制字元，整個 App 打不開；Python 改檔把換行變成 CRLF，組版比對失敗。
// 用法：node .github/scripts/check-text.cjs [比較基準，預設 origin/main]
"use strict";
const { execFileSync } = require("child_process");
const fs = require("fs");
const base = process.argv[2] || "origin/main";
// 審查 #2-1（iMac Claude 2）：git 預設會把中文路徑跳脫成 "\344\270\255…"，existsSync 找不到就整個跳過 → 關掉 quotePath、用 NUL 分隔
// W38（iMac 審查不擋建議）：diff-filter 加 R，改名同時改內容的檔也要檢查（--name-only 只列新路徑）
const files = execFileSync("git", ["-c", "core.quotePath=false", "diff", "--name-only", "-z", "--diff-filter=AMR", `${base}...HEAD`]).toString().split("\0").filter(Boolean);
// 審查 #2-2：補 iOS 專案檔（pbxproj、storyboard、xib、xcprivacy、entitlements、xcconfig、strings）與腳本檔（sh、py、ps1、bat）
// W38：再補 CocoaPods 與 Swift 套件（rb、podspec、resolved）、圖示與網站設定（svg、webmanifest）
const TEXT = /\.(js|cjs|mjs|ts|css|html|md|json|yml|yaml|txt|java|kt|swift|gradle|plist|xml|properties|pbxproj|storyboard|xib|xcprivacy|entitlements|xcconfig|strings|sh|py|ps1|bat|rb|podspec|resolved|svg|webmanifest)$/i;
const bad = [];
let n = 0;
for (const f of files) {
  if (!TEXT.test(f) || !fs.existsSync(f)) continue;
  n++;
  const s = fs.readFileSync(f, "utf8");
  const m = s.match(/[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]/);
  if (m) bad.push(`${f}：有控制字元 0x${m[0].charCodeAt(0).toString(16).padStart(2, "0")}（第 ${s.slice(0, m.index).split("\n").length} 行）`);
  const crlf = (s.match(/\r\n/g) || []).length, lf = (s.match(/(^|[^\r])\n/g) || []).length;
  if (crlf && lf) bad.push(`${f}：CRLF ${crlf} 行與 LF ${lf} 行混用`);
}
console.log(`檢查了 ${n} 個改到的文字檔（比較基準 ${base}）`);
if (bad.length) { console.log("✘ " + bad.join("\n✘ ")); process.exit(1); }
console.log("✔ 沒有控制字元，也沒有換行混用");
