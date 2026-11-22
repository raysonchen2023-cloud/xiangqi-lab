#!/usr/bin/env node
// 象棋千秋 Android：送審閘門——P0 報告都要綁在「這一個」要送審的 AAB 與版號上（W69 流程盤點第 3 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：以前 P0 報告只記檔名；送審的 AAB、驗過的 APK、P0-IMG 檢查的 AAB 是不是同一份，靠人記。
// 規則（封測 P0 永久測項：任何一項失敗或缺驗都不能送審）：
//   ・P0-IMG（check-aab-assets.js --cdn --out）一份、P0-UPD（check-upgrade.js --aab-sha 的 upgrade.json）一份、
//     P0-3D（check-3d.js --aab-sha 的 summary.json）Android 12 與 16 各一份（P0 規定兩個版本都要跑）
//   ・每份的 aabSha256＝要送審的 AAB 實際算出的 SHA-256（P0-UPD／P0-3D 用的 APK 要由 aab-to-apk.js 從這個 AAB 產生）
//   ・每份的版號＝--build（網頁版號 XQ_BUILD）：P0-IMG 看 siteVersion、P0-UPD 看 new.build、P0-3D 看 build
//   ・每份 pass＝true；P0-IMG 另外要 cdnChecked＝true 且 exitCode＝0（缺驗＝3 也不能送審）；
//     P0-UPD 不能用 --no-old-worker 跑（oldWorker＝true：舊 Worker 要實際接管過）；
//     P0-3D 要完整跑（full＝true：--only、--self-test 的不算），已知問題清單要用倉庫的 .github/p0-known.json（knownFile.fromRepo＝true）
//     （PR #42 審查後 Windows Claude 2 提的三欄）
// 用法：node scripts/p0-gate.js --aab <要送審的.aab> --build <網頁版號 YYYYMMDD-HHMM> --reports <報告…>
// 結束代碼：0＝可以送審；1＝不行（列出原因）；2＝用法錯誤
"use strict";
const fs = require("fs"), crypto = require("crypto");

const TOOLS = ["P0-IMG", "P0-UPD", "P0-3D"], ANDROID_3D = ["12", "16"];
const verOf = (j) => j.tool === "P0-IMG" ? j.siteVersion : j.tool === "P0-UPD" ? (j.new && j.new.build) : j.build;
/* 純函式：aabSha＝實際算出的雜湊；build＝送審版號；reports＝[{file, json}]；回傳 { ok, problems:[…] } */
function gate(aabSha, build, reports) {
  const problems = [], seen = new Map();
  for (const { file, json } of reports) {
    if (!json || typeof json !== "object") { problems.push(`${file}：讀不到 JSON`); continue }
    const t = json.tool;
    if (!TOOLS.includes(t)) { problems.push(`${file}：tool 欄位不是 ${TOOLS.join("／")}（是 ${t}）`); continue }
    const av = t === "P0-3D" ? String(json.android || "").split(".")[0] : "";
    const key = t === "P0-3D" ? `P0-3D（Android ${av || "?"}）` : t;
    if (seen.has(key)) problems.push(`${key} 有兩份報告（${seen.get(key)}、${file}）：只能交一份`);
    seen.set(key, file);
    if (!/^[0-9a-f]{64}$/.test(String(json.aabSha256 || ""))) problems.push(`${key}：報告沒有記 AAB 的 SHA-256（aabSha256）`);
    else if (json.aabSha256 !== aabSha) problems.push(`${key}：驗的是另一個 AAB（${json.aabSha256.slice(0, 12)}），不是要送審的這個（${aabSha.slice(0, 12)}）`);
    if (verOf(json) !== build) problems.push(`${key}：驗的版號是 ${verOf(json)}，不是要送審的 ${build}`);
    if (json.pass !== true) problems.push(`${key}：沒有通過（pass＝${json.pass}）`);
    if (t === "P0-IMG" && (json.cdnChecked !== true || json.exitCode !== 0)) problems.push(`P0-IMG：要加 --cdn 且結束代碼 0（cdnChecked＝${json.cdnChecked}、exitCode＝${json.exitCode}）`);
    if (t === "P0-UPD" && json.oldWorker !== true) problems.push("P0-UPD：用 --no-old-worker 跑的不算（封測 P0 規則：舊 Worker 要實際接管過；流程盤點第 5 項）");
    if (t === "P0-3D") {
      if (json.full !== true) problems.push(`${key}：不是完整跑（full＝${json.full}；--only、--self-test 的不算）`);
      if (!(json.knownFile && json.knownFile.fromRepo === true)) problems.push(`${key}：已知問題清單不是倉庫的 .github/p0-known.json（knownFile.fromRepo≠true）`);
    }
  }
  if (!seen.has("P0-IMG")) problems.push("缺 P0-IMG 的報告（缺驗不能送審）");
  if (!seen.has("P0-UPD")) problems.push("缺 P0-UPD 的報告（缺驗不能送審）");
  for (const v of ANDROID_3D) if (!seen.has(`P0-3D（Android ${v}）`)) problems.push(`缺 Android ${v} 的 P0-3D 報告（P0 規定 Android 12 與 16 都要跑）`);
  return { ok: problems.length === 0, problems };
}

function main() {
  const a = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
  const j = process.argv.indexOf("--reports"), AAB = a("--aab"), BUILD = a("--build");
  const files = j > 0 ? process.argv.slice(j + 1).filter((x) => !x.startsWith("--")) : [];
  if (!AAB || !BUILD || !files.length) { console.error("用法：node scripts/p0-gate.js --aab <要送審的.aab> --build <網頁版號 YYYYMMDD-HHMM> --reports <報告…>"); process.exit(2) }
  if (!/^\d{8}-\d{4}$/.test(BUILD)) { console.error("✘ --build 要是網頁版號（YYYYMMDD-HHMM）"); process.exit(2) }
  if (!fs.existsSync(AAB)) { console.error("✘ 找不到 AAB：" + AAB); process.exit(2) }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(AAB)).digest("hex");
  const reports = files.map((file) => { let json = null; try { json = JSON.parse(fs.readFileSync(file, "utf8")) } catch (e) {} return { file, json } });
  const r = gate(sha, BUILD, reports);
  console.log(`要送審的 AAB：${AAB}（版號 ${BUILD}）\n  SHA-256 ${sha}`);
  if (r.ok) { console.log("✔ P0-IMG、P0-UPD、P0-3D（Android 12、16）都綁在這個 AAB 與版號上、都通過：可以送審"); process.exit(0) }
  for (const p of r.problems) console.log("✘ " + p);
  console.log("✘ 不能送審"); process.exit(1);
}
module.exports = { gate, TOOLS, ANDROID_3D };
if (require.main === module) main();
