#!/usr/bin/env node
// 象棋千秋 Android：送審閘門——三份 P0 報告都要綁在「這一個」要送審的 AAB 上（W69 流程盤點第 3 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：以前 P0 報告只記檔名；送審的 AAB、驗過的 APK、P0-IMG 檢查的 AAB 是不是同一份，靠人記。
// 規則（封測 P0 永久測項：任何一項失敗或缺驗都不能送審）：
//   ・P0-IMG（check-aab-assets.js --cdn --out）、P0-UPD（check-upgrade.js --aab-sha … 的 upgrade.json）、P0-3D（check-3d.js --aab-sha …）三份都要有
//   ・每份的 aabSha256＝要送審的 AAB 實際算出的 SHA-256（P0-UPD／P0-3D 用的 APK 要由 aab-to-apk.js 從這個 AAB 產生）
//   ・每份 pass＝true；P0-IMG 另外要 cdnChecked＝true 且 exitCode＝0（缺驗＝3 也不能送審）
// 報告格式（三支工具共用）：{ tool: "P0-IMG"|"P0-UPD"|"P0-3D", aabSha256: "<64 碼>", pass: true|false, … }
// 用法：node scripts/p0-gate.js --aab <要送審的.aab> --reports <報告1.json> <報告2.json> <報告3.json>
// 結束代碼：0＝可以送審；1＝不行（列出原因）；2＝用法錯誤
"use strict";
const fs = require("fs"), crypto = require("crypto");

const NEED = ["P0-IMG", "P0-UPD", "P0-3D"];
/* 純函式：aabSha＝實際算出的雜湊；reports＝[{file, json}]；回傳 { ok, problems:[…] } */
function gate(aabSha, reports) {
  const problems = [], by = new Map();
  for (const { file, json } of reports) {
    if (!json || typeof json !== "object") { problems.push(`${file}：讀不到 JSON`); continue }
    const t = json.tool;
    if (!NEED.includes(t)) { problems.push(`${file}：tool 欄位不是 ${NEED.join("／")}（是 ${t}）`); continue }
    if (by.has(t)) problems.push(`${t} 有兩份報告（${by.get(t)}、${file}）：只能交一份`);
    by.set(t, file);
    if (!/^[0-9a-f]{64}$/.test(String(json.aabSha256 || ""))) problems.push(`${t}：報告沒有記 AAB 的 SHA-256（aabSha256）`);
    else if (json.aabSha256 !== aabSha) problems.push(`${t}：驗的是另一個 AAB（${json.aabSha256.slice(0, 12)}），不是要送審的這個（${aabSha.slice(0, 12)}）`);
    if (json.pass !== true) problems.push(`${t}：沒有通過（pass＝${json.pass}）`);
    if (t === "P0-IMG" && (json.cdnChecked !== true || json.exitCode !== 0)) problems.push(`P0-IMG：要加 --cdn 且結束代碼 0（cdnChecked＝${json.cdnChecked}、exitCode＝${json.exitCode}）`);
    if (t === "P0-UPD" && json.oldWorker !== true) problems.push("P0-UPD：用 --no-old-worker 跑的不算（封測 P0 規則：舊 Worker 要實際接管過；流程盤點第 5 項）");
  }
  for (const t of NEED) if (!by.has(t)) problems.push(`缺 ${t} 的報告（缺驗不能送審）`);
  return { ok: problems.length === 0, problems };
}

function main() {
  const i = process.argv.indexOf("--aab"), j = process.argv.indexOf("--reports");
  const AAB = i > 0 ? process.argv[i + 1] : null, files = j > 0 ? process.argv.slice(j + 1).filter(x => !x.startsWith("--")) : [];
  if (!AAB || !files.length) { console.error("用法：node scripts/p0-gate.js --aab <要送審的.aab> --reports <報告…>"); process.exit(2) }
  if (!fs.existsSync(AAB)) { console.error("✘ 找不到 AAB：" + AAB); process.exit(2) }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(AAB)).digest("hex");
  const reports = files.map(file => { let json = null; try { json = JSON.parse(fs.readFileSync(file, "utf8")) } catch (e) {} return { file, json } });
  const r = gate(sha, reports);
  console.log(`要送審的 AAB：${AAB}\n  SHA-256 ${sha}`);
  if (r.ok) { console.log("✔ P0-IMG、P0-UPD、P0-3D 三份都綁在這個 AAB 上、都通過：可以送審"); process.exit(0) }
  for (const p of r.problems) console.log("✘ " + p);
  console.log("✘ 不能送審"); process.exit(1);
}
module.exports = { gate, NEED };
if (require.main === module) main();
