// 象棋千秋 Android：P0 報告綁住「實際測的 APK」與「要送審的 AAB」（W69 流程盤點第 3 項，PR #44 審查後，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：原本 check-upgrade.js／check-3d.js 的 --aab-sha 只是把命令列的雜湊照抄進報告，
//   拿別的 APK 測、再手打雜湊，p0-gate.js 照樣放行（iMac Claude 1 審 PR #44）。
// 做法：讀 aab-to-apk.js 寫的 aab-apk.json（同時記 AAB 與它產生的 APK 的 SHA-256），
//   自己算「實際要裝／已經裝在手機上」那個 APK 的 SHA-256 來比；不符就是測試不成立（結束代碼 2），報告不寫 apkBound。
// 給 check-upgrade.js（算 --new 檔案）與 check-3d.js（從手機拉回實際安裝的 base.apk）用。
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

const HEX64 = /^[0-9a-f]{64}$/;
const sha256File = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");

/* 讀 aab-apk.json；格式不對回傳 { ok:false, msg } */
function readBind(file) {
  if (!file) return { ok: false, msg: "要帶 --aab-apk <aab-to-apk.js 產生的 aab-apk.json>（送審前必帶）" };
  let j = null;
  try { j = JSON.parse(fs.readFileSync(file, "utf8")) } catch (e) { return { ok: false, msg: "讀不到 aab-apk.json：" + file } }
  if (!j || !HEX64.test(String(j.aabSha256 || "")) || !HEX64.test(String(j.apkSha256 || ""))) return { ok: false, msg: "aab-apk.json 缺 aabSha256／apkSha256（要用 aab-to-apk.js 產生的那一份）：" + file };
  return { ok: true, rec: j };
}

/* 純函式：rec＝aab-apk.json 內容；actualApkSha＝實際 APK 算出的雜湊。回傳要寫進報告的欄位，或不成立的原因 */
function bind(rec, actualApkSha, where) {
  const a = String(actualApkSha || "").toLowerCase();
  if (!HEX64.test(a)) return { ok: false, msg: `算不出${where || "APK"}的 SHA-256` };
  if (a !== rec.apkSha256) return { ok: false, msg: `${where || "APK"}（${a.slice(0, 12)}）不是 aab-apk.json 記的那一個（${rec.apkSha256.slice(0, 12)}）：不是從要送審的 AAB 產生的，測試不成立` };
  return { ok: true, fields: { aabSha256: rec.aabSha256, apkSha256: a, apkBound: true, aabApk: rec.aab || null } };
}

/* 從手機拉回實際安裝的 APK（base.apk）算雜湊；adbRaw(args) 要回傳 stdout 字串 */
function installedApkSha(adbRaw, pkg, tmpDir) {
  const line = String(adbRaw(["shell", "pm", "path", pkg])).split(/\r?\n/).map((s) => s.trim()).filter((s) => s.startsWith("package:"));
  if (line.length !== 1) return { ok: false, msg: `手機上的 ${pkg} 有 ${line.length} 個 APK（要單一 universal APK，才比得出是不是從送審 AAB 產生的）` };
  const remote = line[0].slice("package:".length), local = path.join(tmpDir, "installed-base.apk");
  adbRaw(["pull", remote, local]);
  try { return { ok: true, sha: sha256File(local) } } finally { try { fs.unlinkSync(local) } catch (e) { } }
}

module.exports = { readBind, bind, installedApkSha, sha256File, HEX64 };
