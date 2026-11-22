#!/usr/bin/env node
// 象棋千秋 Android：送審閘門——P0 報告都要綁在「這一個」要送審的 AAB 與版號上（W69 流程盤點第 3 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：以前 P0 報告只記檔名；送審的 AAB、驗過的 APK、P0-IMG 檢查的 AAB 是不是同一份，靠人記。
// 規則（封測 P0 永久測項：任何一項失敗或缺驗都不能送審）：
//   ・P0-IMG（check-aab-assets.js --cdn --out）一份、P0-UPD（check-upgrade.js --aab-apk 的 upgrade.json）一份、
//     P0-3D（check-3d.js --aab-apk 的 summary.json）Android 12 與 16 各一份（P0 規定兩個版本都要跑）
//   ・P0-UPD／P0-3D 要 apkBound＝true：工具自己算過實際測的 APK（--new 檔／手機上安裝的 base.apk），等於 aab-apk.json 記的 apkSha256（PR #44 審查：不能只照抄雜湊）
//   ・每份的 aabSha256＝要送審的 AAB 實際算出的 SHA-256（P0-UPD／P0-3D 用的 APK 要由 aab-to-apk.js 從這個 AAB 產生）
//   ・每份的版號＝--build（網頁版號 XQ_BUILD）：P0-IMG 看 siteVersion、P0-UPD 看 new.build、P0-3D 看 build
//   ・每份 pass＝true；P0-IMG 另外要 cdnChecked＝true 且 exitCode＝0（缺驗＝3 也不能送審）；
//     P0-UPD 不能用 --no-old-worker 跑（oldWorker＝true：舊 Worker 要實際接管過）；
//     P0-3D 要完整跑（full＝true：--only、--self-test 的不算），已知問題清單要用倉庫的 .github/p0-known.json（knownFile.fromRepo＝true）
//     （PR #42 審查後 Windows Claude 2 提的三欄）
//   ・P0-3D 要同一次執行連續 2 輪全過（rounds≥2 且 roundsPassed＝rounds；W69 流程盤點第 5 項，開發者 11/23 選「連續 2 輪」）；
//     之前失敗過的嘗試（failedBefore）照實列出，不擋但看得到
// 例外（W69 流程盤點第 5 項，開發者 11/23 選「寫進倉庫豁免檔」）：
//   只有 WAIVABLE 列的四種能豁免，而且要寫在倉庫的 .github/p0-waivers.json（走 PR、iMac Claude 2 逐行審）；
//   每筆要綁同一個 AAB 的 SHA-256、寫原因（≥4 字）、決定人、決定日期（YYYY-MM-DD）。別處轉述的決定一律不算。
//   AAB 不符、版號不符、缺報告、沒通過、沒綁 APK、交兩份——這些不能豁免。
// 用法：node scripts/p0-gate.js --aab <要送審的.aab> --build <網頁版號 YYYYMMDD-HHMM> [--waivers <檔，預設倉庫 .github/p0-waivers.json>] --reports <報告…>
// 結束代碼：0＝可以送審；1＝不行（列出原因）；2＝用法錯誤
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const TOOLS = ["P0-IMG", "P0-UPD", "P0-3D"], ANDROID_3D = ["12", "16"], ROUNDS_3D = 2;
const WAIVABLE = ["P0-IMG/cdn", "P0-UPD/old-worker", "P0-3D/partial", "P0-3D/rounds"];
const HEX64 = /^[0-9a-f]{64}$/;
const verOf = (j) => j.tool === "P0-IMG" ? j.siteVersion : j.tool === "P0-UPD" ? (j.new && j.new.build) : j.build;

/* 一筆豁免要齊全才算數（純函式） */
function validWaiver(w, aabSha) {
  return !!w && typeof w === "object" && WAIVABLE.includes(w.code) && HEX64.test(String(w.aabSha256 || "")) && w.aabSha256 === aabSha &&
    String(w.reason || "").trim().length >= 4 && String(w.decidedBy || "").trim().length > 0 && /^\d{4}-\d{2}-\d{2}$/.test(String(w.decidedAt || ""));
}

/* 純函式：aabSha＝實際算出的雜湊；build＝送審版號；reports＝[{file, json}]；waivers＝豁免檔的 items
   回傳 { ok, problems:[還擋著的…], waived:[豁免掉的…], notes:[不擋、照實列出的…] } */
function gate(aabSha, build, reports, waivers = []) {
  const found = [], notes = [], seen = new Map();
  const add = (msg, code = null, android = null) => found.push({ msg, code, android });
  for (const { file, json } of reports) {
    if (!json || typeof json !== "object") { add(`${file}：讀不到 JSON`); continue }
    const t = json.tool;
    if (!TOOLS.includes(t)) { add(`${file}：tool 欄位不是 ${TOOLS.join("／")}（是 ${t}）`); continue }
    const av = t === "P0-3D" ? String(json.android || "").split(".")[0] : "";
    const key = t === "P0-3D" ? `P0-3D（Android ${av || "?"}）` : t;
    if (seen.has(key)) add(`${key} 有兩份報告（${seen.get(key)}、${file}）：只能交一份`);
    seen.set(key, file);
    if (!HEX64.test(String(json.aabSha256 || ""))) add(`${key}：報告沒有記 AAB 的 SHA-256（aabSha256）`);
    else if (json.aabSha256 !== aabSha) add(`${key}：驗的是另一個 AAB（${json.aabSha256.slice(0, 12)}），不是要送審的這個（${aabSha.slice(0, 12)}）`);
    if (verOf(json) !== build) add(`${key}：驗的版號是 ${verOf(json)}，不是要送審的 ${build}`);
    /* P0-IMG 缺驗（結束代碼 3）時 pass 一定是 false：歸在可豁免的 P0-IMG/cdn 那一條，不另算「沒有通過」 */
    const imgMissing = t === "P0-IMG" && json.exitCode === 3;
    if (json.pass !== true && !imgMissing) add(`${key}：沒有通過（pass＝${json.pass}）`);
    if ((t === "P0-UPD" || t === "P0-3D") && !(json.apkBound === true && HEX64.test(String(json.apkSha256 || ""))))
      add(`${key}：沒核對實際測的 APK 是從這個 AAB 產生的（要用 --aab-apk 跑，報告要有 apkBound＝true 與 apkSha256）`);
    if (t === "P0-IMG" && (json.cdnChecked !== true || json.exitCode !== 0)) add(`P0-IMG：要加 --cdn 且結束代碼 0（cdnChecked＝${json.cdnChecked}、exitCode＝${json.exitCode}）`, "P0-IMG/cdn");
    if (t === "P0-UPD" && json.oldWorker !== true) add("P0-UPD：用 --no-old-worker 跑的不算（封測 P0 規則：舊 Worker 要實際接管過；流程盤點第 5 項）", "P0-UPD/old-worker");
    if (t === "P0-3D") {
      if (json.full !== true) add(`${key}：不是完整跑（full＝${json.full}；--only、--self-test 的不算）`, "P0-3D/partial", av);
      if (!(json.knownFile && json.knownFile.fromRepo === true)) add(`${key}：已知問題清單不是倉庫的 .github/p0-known.json（knownFile.fromRepo≠true）`);
      if (!(Number(json.rounds) >= ROUNDS_3D && json.roundsPassed === json.rounds))
        add(`${key}：要同一次執行連續 ${ROUNDS_3D} 輪全過（rounds＝${json.rounds}、roundsPassed＝${json.roundsPassed}；失敗後重跑到過的不算）`, "P0-3D/rounds", av);
      if (Number(json.failedBefore) > 0) notes.push(`${key}：這個 AAB 之前失敗過 ${json.failedBefore} 次（這份是第 ${json.attempt} 次嘗試）`);
    }
  }
  if (!seen.has("P0-IMG")) add("缺 P0-IMG 的報告（缺驗不能送審）");
  if (!seen.has("P0-UPD")) add("缺 P0-UPD 的報告（缺驗不能送審）");
  for (const v of ANDROID_3D) if (!seen.has(`P0-3D（Android ${v}）`)) add(`缺 Android ${v} 的 P0-3D 報告（P0 規定 Android 12 與 16 都要跑）`);
  const ok3 = (waivers || []).filter((w) => validWaiver(w, aabSha));
  const problems = [], waived = [];
  for (const f of found) {
    const w = f.code && ok3.find((x) => x.code === f.code && (!f.android || !x.android || String(x.android) === f.android));
    if (w) waived.push(`${f.msg}——已豁免：${w.reason}（${w.decidedBy}，${w.decidedAt}）`); else problems.push(f.msg);
  }
  return { ok: problems.length === 0, problems, waived, notes };
}

function main() {
  const a = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
  const j = process.argv.indexOf("--reports"), AAB = a("--aab"), BUILD = a("--build");
  const files = j > 0 ? process.argv.slice(j + 1).filter((x) => !x.startsWith("--")) : [];
  if (!AAB || !BUILD || !files.length) { console.error("用法：node scripts/p0-gate.js --aab <要送審的.aab> --build <網頁版號 YYYYMMDD-HHMM> [--waivers <檔>] --reports <報告…>"); process.exit(2) }
  if (!/^\d{8}-\d{4}$/.test(BUILD)) { console.error("✘ --build 要是網頁版號（YYYYMMDD-HHMM）"); process.exit(2) }
  if (!fs.existsSync(AAB)) { console.error("✘ 找不到 AAB：" + AAB); process.exit(2) }
  /* 豁免檔：預設倉庫 .github/p0-waivers.json（scripts 在 source/xiangqi-android/scripts）；指定了卻讀不到或格式錯＝用法錯誤 */
  const REPO_W = path.join(__dirname, "..", "..", "..", ".github", "p0-waivers.json"), WF = a("--waivers") || REPO_W;
  let waivers = [];
  if (fs.existsSync(WF)) { try { const wj = JSON.parse(fs.readFileSync(WF, "utf8")); if (!Array.isArray(wj.items)) throw 0; waivers = wj.items } catch (e) { console.error("✘ 豁免檔格式錯（要有 items 陣列）：" + WF); process.exit(2) } }
  else if (a("--waivers")) { console.error("✘ 找不到豁免檔：" + WF); process.exit(2) }
  const fromRepo = fs.existsSync(REPO_W) && path.resolve(WF) === path.resolve(REPO_W);
  /* PR #58 審查：只比路徑不夠——本機直接改、沒開 PR 的豁免也會算數；要跟 origin/main 那份逐位元組一樣 */
  if (fromRepo) { const pin = require("./repo-pin.js").sameAsMain(REPO_W); if (!pin.ok) { console.error("✘ " + pin.msg); process.exit(2) } }
  const sha = crypto.createHash("sha256").update(fs.readFileSync(AAB)).digest("hex");
  const reports = files.map((file) => { let json = null; try { json = JSON.parse(fs.readFileSync(file, "utf8")) } catch (e) {} return { file, json } });
  const r = gate(sha, BUILD, reports, fromRepo ? waivers : []);
  console.log(`要送審的 AAB：${AAB}（版號 ${BUILD}）\n  SHA-256 ${sha}`);
  if (a("--waivers") && !fromRepo) console.log("⚠ 豁免檔不是倉庫的 .github/p0-waivers.json：沒經過逐行審，裡面的豁免一律不算");
  for (const n of r.notes) console.log("⚠ " + n);
  for (const w of r.waived) console.log("△ " + w);
  if (r.ok) { console.log("✔ P0-IMG、P0-UPD、P0-3D（Android 12、16）都綁在這個 AAB 與版號上、都通過" + (r.waived.length ? `（其中 ${r.waived.length} 項照倉庫豁免檔放行）` : "") + "：可以送審"); process.exit(0) }
  for (const p of r.problems) console.log("✘ " + p);
  console.log("✘ 不能送審"); process.exit(1);
}
module.exports = { gate, validWaiver, TOOLS, ANDROID_3D, ROUNDS_3D, WAIVABLE };
if (require.main === module) main();
