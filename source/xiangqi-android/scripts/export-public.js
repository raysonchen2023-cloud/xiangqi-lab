#!/usr/bin/env node
// 象棋千秋 Android：匯出「公開建置鏈」（評比第 16 輪改善清單第 8 項、第 17 輪 X6：外部能取得全部必要輸入、重建 APK）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 把這個專案「會進版本控制的檔」（照 .gitignore，跟 clean-rebuild.js 一樣用一個暫時的空 git 判斷）原封不動複製到 --out，
// 另外寫 EXPORT-MANIFEST.json：每個檔的 SHA-256、整份的樹雜湊、排除了什麼、為什麼。
//   不放：verify/（開發者實機和模擬器的截圖、logcat、連線紀錄，可能有裝置代號和玩家代號；建置用不到）
//   一定不能有：金鑰與簽章檔（*.jks、*.keystore、*.p12、*.pfx、keystore.properties、signing.properties）、local.properties、
//              node_modules/、www/、android/**/build/、android/.gradle/、android/app/src/main/assets/public/（網頁成品，由 make-www.js 從公開倉庫重做）
//   有任何一個就停（結束代碼 1），不寫半套。
// 檔案逐位元照抄（不改換行）：PNG、gradle-wrapper.jar 是二進位，gradle-wrapper.jar 的 SHA-256 Gradle 會核對；放進 git 時不能做換行轉換。
// 用法：node xiangqi-android/scripts/export-public.js --out <資料夾>     （oss-stage.js 會自動呼叫，放到 source/xiangqi-android/）
//       node xiangqi-android/scripts/export-public.js --list             只列出會匯出的檔
// 結束代碼：0＝寫好；1＝找到不該公開的檔；2＝用法錯誤
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process"), crypto = require("crypto");
const HERE = path.join(__dirname, "..");
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");

/* verify/ 只留公開的 android.md 和 test-android-build.js 會引用的：Service Worker 修法的模擬器截圖（3x-swfix-*.png）和修法 patch */
const EXCLUDE = [{ re: /^verify\/(?!\d\d-swfix-[a-z0-9-]+\.png$|sw-client-isolation\.patch$)/, why: "開發者實機／模擬器的其他截圖、logcat、多人連線紀錄（可能有裝置代號、玩家代號）；建置用不到" },
  /* 11/13 第 17 輪：F-Droid 草稿的 AuthorEmail 是開發者的個人信箱（跟公開 commit 的作者信箱不同），公不公開要開發者決定；APK 建置用不到 */
  { re: /^fdroid\//, why: "F-Droid 建置設定草稿有開發者個人信箱（AuthorEmail），要開發者決定要不要公開；APK 建置用不到" }];
const FORBIDDEN = [/\.(jks|keystore|p12|pfx)$/i, /(^|\/)(keystore|signing|local)\.properties$/i, /(^|\/)node_modules\//, /^www\//, /(^|\/)build\//, /(^|\/)\.gradle\//,
  /^android\/app\/src\/main\/assets\/public\//, /(^|\/)\.env(\..+)?$/i];
/* 建置一定要有的檔（少一個就不是完整的建置鏈） */
const REQUIRED = ["package.json", "package-lock.json", "capacitor.config.json", "REBUILD.md", "scripts/make-www.js", "scripts/clean-rebuild.js", "scripts/repro-check.js",
  "android/build.gradle", "android/app/build.gradle", "android/variables.gradle", "android/settings.gradle", "android/gradle/verification-metadata.xml",
  "android/gradle/wrapper/gradle-wrapper.jar", "android/gradle/wrapper/gradle-wrapper.properties", "android/gradlew", "android/gradlew.bat"];

function trackedFiles(proj) {
  const probe = fs.mkdtempSync(path.join(os.tmpdir(), "xq-andexp-"));
  try {
    cp.execFileSync("git", ["init", "-q", "--bare", probe]);
    const out = cp.execFileSync("git", ["--git-dir=" + probe, "--work-tree=" + proj, "-c", "core.quotepath=false", "ls-files", "-o", "--exclude-standard", "-z"], { encoding: "utf8", maxBuffer: 64e6 });
    return out.split("\0").filter(Boolean).map(f => f.replace(/\\/g, "/")).sort();
  } finally { fs.rmSync(probe, { recursive: true, force: true }) }
}

function plan(proj = HERE) {
  const all = trackedFiles(proj), files = [], excluded = [], bad = [];
  for (const f of all) {
    const ex = EXCLUDE.find(e => e.re.test(f));
    if (ex) { excluded.push(f); continue }
    if (FORBIDDEN.some(re => re.test(f))) bad.push(f);
    files.push(f);
  }
  const missing = REQUIRED.filter(f => !files.includes(f));
  return { files, excluded, bad, missing, excludeRules: EXCLUDE.map(e => ({ pattern: String(e.re), why: e.why, files: excluded.filter(f => e.re.test(f)).length })) };
}

function exportTo(out, proj = HERE) {
  const P = plan(proj);
  if (P.bad.length) { const e = new Error("不該公開的檔：" + P.bad.join("、")); e.bad = P.bad; throw e }
  if (P.missing.length) { const e = new Error("建置鏈缺檔：" + P.missing.join("、")); e.missing = P.missing; throw e }
  fs.rmSync(out, { recursive: true, force: true });
  const hashes = {};
  for (const f of P.files) {
    const b = fs.readFileSync(path.join(proj, f)), d = path.join(out, f);
    fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, b);
    hashes[f] = sha256(b);
  }
  const tree = sha256(P.files.map(f => f + "\0" + hashes[f]).join("\n"));
  const pkg = JSON.parse(fs.readFileSync(path.join(proj, "package.json"), "utf8"));
  const M = { schema: "xq-android-export/1", madeAt: new Date().toISOString(), files: P.files.length, treeSha256: tree,
    note: "樹雜湊＝每個檔「相對路徑＋NUL＋SHA-256」照路徑排序、換行連起來再算 SHA-256（跟 clean-rebuild.js 的 source.treeSha256 同一種算法）",
    excluded: P.excludeRules, capacitor: pkg.dependencies, hashes };
  fs.writeFileSync(path.join(out, "EXPORT-MANIFEST.json"), JSON.stringify(M, null, 1) + "\n");
  return M;
}

module.exports = { plan, exportTo, trackedFiles, EXCLUDE, FORBIDDEN, REQUIRED };

if (require.main === module) {
  const a = process.argv.slice(2), oi = a.indexOf("--out");
  try {
    if (a.includes("--list")) { const P = plan(); console.log(P.files.join("\n")); console.log(`\n共 ${P.files.length} 個；排除 ${P.excluded.length} 個（${P.excludeRules.map(r => r.pattern + " " + r.files).join("、")}）` + (P.bad.length ? `；✘ 不該公開：${P.bad.join("、")}` : "") + (P.missing.length ? `；✘ 缺：${P.missing.join("、")}` : "")); process.exit(P.bad.length || P.missing.length ? 1 : 0) }
    if (oi < 0 || !a[oi + 1]) { console.log("用法：node export-public.js --out <資料夾> | --list"); process.exit(2) }
    const M = exportTo(path.resolve(a[oi + 1]));
    console.log(`匯出 ${M.files} 個檔到 ${a[oi + 1]}，樹雜湊 ${M.treeSha256}；排除 ${M.excluded.map(e => e.pattern + " " + e.files + " 個").join("、")}`);
  } catch (e) { console.log("✘ " + e.message); process.exit(e.bad || e.missing ? 1 : 2) }
}
