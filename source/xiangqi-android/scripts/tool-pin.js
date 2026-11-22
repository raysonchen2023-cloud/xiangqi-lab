// 象棋千秋 Android：P0 工具鎖定——報告要記「跑報告的工具本身」的雜湊，送審閘門拿去跟 origin/main 那一版比（2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼（AGENTS.md「P0 出口驗證要難作假」，開發者 11/23）：P0 工具由 Claude 寫、Claude 跑、Claude 報結果。
//   工具在本機改鬆（例如判斷少一條）再跑，報告照樣 pass、照樣綁同一個 AAB，送審閘門看不出來。
// 做法：每支 P0 工具把自己和它載入的共用模組的內容雜湊寫進報告（toolPins）；p0-gate.js 用 git 讀 origin/main 那一版算同一種雜湊來比。
//   雜湊＝去掉 CR 後內容的 SHA-256：Windows 工作區 core.autocrlf=true 是 CRLF、倉庫是 LF，沒改過也不會被誤判；
//   不靠 git，所以在建包的工作資料夾（不是 git 倉庫）裡跑工具也算得出來。
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

/* 每項 P0 報告要釘住哪些檔（倉庫根目錄起算）：工具本身＋它 require 的共用模組。工具改了 require，這裡也要跟著改（自我測試會核對） */
const DIR = "source/xiangqi-android/scripts/";
const TOOL_FILES = {
  "P0-IMG": ["check-aab-assets.js", "bundle-home-assets.js", "tool-pin.js"],
  "P0-UPD": ["check-upgrade.js", "apk-bind.js", "cdp.js", "device-guard.js", "tool-pin.js"],
  "P0-3D": ["check-3d.js", "apk-bind.js", "cdp.js", "device-guard.js", "repo-pin.js", "tool-pin.js"],
};
const HEX64 = /^[0-9a-f]{64}$/;

/* 去掉 CR 後的 SHA-256 */
const normSha = (buf) => crypto.createHash("sha256").update(Buffer.from(String(Buffer.isBuffer(buf) ? buf.toString("utf8") : buf).replace(/\r/g, ""), "utf8")).digest("hex");

/* 工具執行時呼叫：回傳 { "source/xiangqi-android/scripts/xxx.js": 雜湊, … }（讀這支模組旁邊的檔，也就是實際被載入的那一份） */
function pinsFor(tool, dir = __dirname) {
  const out = {};
  for (const f of TOOL_FILES[tool] || []) { try { out[DIR + f] = normSha(fs.readFileSync(path.join(dir, f))) } catch (e) { out[DIR + f] = null } }
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
