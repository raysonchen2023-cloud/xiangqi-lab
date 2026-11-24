// 象棋千秋 Android：P0 工具鎖定——報告要記「跑報告的工具本身」的雜湊，送審閘門拿去跟 origin/main 那一版比（2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼（AGENTS.md「P0 出口驗證要難作假」，開發者 11/23）：P0 工具由 Claude 寫、Claude 跑、Claude 報結果。
//   工具在本機改鬆（例如判斷少一條）再跑，報告照樣 pass、照樣綁同一個 AAB，送審閘門看不出來。
// 做法：每支 P0 工具把自己和它載入的共用模組的內容雜湊寫進報告（toolPins）；p0-gate.js 用 git 讀 origin/main 那一版算同一種雜湊來比。
//   雜湊＝CRLF 換成 LF 後內容的 SHA-256：Windows 工作區 core.autocrlf=true 是 CRLF、倉庫是 LF，沒改過也不會被誤判；
//   單獨的 CR 會改變程式意義，保留下來讓雜湊不同（PR #66 複審②）。不靠 git，所以在建包的工作資料夾（不是 git 倉庫）裡跑工具也算得出來。
// 保證範圍（PR #66 複審①）：雜湊是工具自己算、自己填的。擋得住「忘了切回 main 版」「本機改了、沒開 PR 就跑」這類非刻意的情況；
//   擋不住刻意偽造（改過的工具可以直接寫出 main 版的雜湊）。要擋這種，得由 CI 用 main 版工具重算（PR③，規劃中）。
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

/* 每項 P0 報告要釘住哪些檔（倉庫根目錄起算）：工具本身＋它 require 的共用模組。工具改了 require，這裡也要跟著改（自我測試會核對） */
const DIR = "source/xiangqi-android/scripts/";
const TOOL_FILES = {
  "P0-IMG": ["check-aab-assets.js", "bundle-home-assets.js", "tool-pin.js"],
  "P0-UPD": ["check-upgrade.js", "apk-bind.js", "cdp.js", "device-guard.js", "tool-pin.js"],
  "P0-3D": ["check-3d.js", "apk-bind.js", "cdp.js", "device-guard.js", "repo-pin.js", "tool-pin.js"],
  "AAB-DIFF": ["aab-diff.js", "bundle-home-assets.js", "tool-pin.js"],   /* W91（11/24）：新舊 AAB 產物比對接進送審閘門；#102 第十輪起首頁硬規則用 bundle-home-assets.js 的 required 名單，一起鎖 */
};
const HEX64 = /^[0-9a-f]{64}$/;

/* CRLF 換成 LF 後的 SHA-256（單獨的 CR 保留） */
const normSha = (buf) => crypto.createHash("sha256").update(Buffer.from(String(Buffer.isBuffer(buf) ? buf.toString("utf8") : buf).replace(/\r\n/g, "\n"), "utf8")).digest("hex");

/* 工具執行時呼叫：回傳 { "source/xiangqi-android/scripts/xxx.js": 雜湊, … }（一律讀這支模組旁邊、實際被載入的那一份；PR #66 複審①：不給指定資料夾，免得指到乾淨的副本） */
function pinsFor(tool) {
  const out = {};
  for (const f of TOOL_FILES[tool] || []) { try { out[DIR + f] = normSha(fs.readFileSync(path.join(__dirname, f))) } catch (e) { out[DIR + f] = null } }
  return out;
}

/* 閘門呼叫：pins＝報告裡的 toolPins；mainSha(路徑)＝origin/main 那一版的雜湊（讀不到回 null）。回傳問題清單（空＝通過） */
function checkPins(tool, pins, mainSha) {
  const bad = [], want = (TOOL_FILES[tool] || []).map((f) => DIR + f);
  if (!pins || typeof pins !== "object" || Array.isArray(pins)) return ["報告沒有記工具雜湊（toolPins）：不知道是用哪一版工具跑的"];
  for (const p of want) {
    const v = pins[p];
    if (!HEX64.test(String(v || ""))) { bad.push(`報告沒有記 ${p} 的雜湊`); continue }
    const m = mainSha(p);
    if (!m) bad.push(`讀不到 origin/main 的 ${p}：沒辦法確認工具是審過的那一版`);
    else if (m !== v) bad.push(`${p} 跟 origin/main 那一版不一樣（報告 ${v.slice(0, 12)}、main ${m.slice(0, 12)}）：用改過的工具跑的報告不算（要改工具請開 PR）`);
  }
  for (const p of Object.keys(pins)) if (!want.includes(p)) bad.push(`報告多記了不在清單裡的檔 ${p}`);
  return bad;
}

module.exports = { TOOL_FILES, DIR, normSha, pinsFor, checkPins };
