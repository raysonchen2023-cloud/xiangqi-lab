#!/usr/bin/env node
// 象棋千秋 Android：檢查骨架有沒有 F-Droid 會擋的東西，以及 F-Droid 建置設定草稿的欄位齊不齊
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 不需要 Android SDK、不連網。檢查：
//   Gradle：沒有 Google Play 服務／Firebase／google-services 外掛；關掉 DependencyInfoBlock；androidx.webkit ≥ 1.18.0（跨來源隔離允許清單）
//   原生碼：MainActivity 設允許清單、XQWebViewClient 補 Document-Isolation-Policy、Service Worker 的請求也補（同一份標頭清單）
//   設定：capacitor.config.json 的來源固定 https://localhost（存檔跟著來源走）
//   二進位檔：android/ 裡除了 gradle-wrapper.jar 以外不能有 .jar/.aar/.so/.apk 等（F-Droid 掃描會擋）
//   F-Droid 建置設定（fdroid/*.yml）：必填欄位、授權、建置區塊、反特性（AntiFeatures）
// 用法：node scripts/check-skeleton.js [專案資料夾]    有 ✘ 就以代碼 1 結束
"use strict";
const fs = require("fs"), path = require("path");

const NONFREE = [/com\.google\.gms/, /com\.google\.firebase/, /firebase-/, /play-services/, /com\.google\.android\.gms/, /crashlytics/i];
const BINARY = /\.(jar|aar|so|apk|aab|dex|class|keystore|jks)$/i;
const FDROID_REQUIRED = ["Categories", "License", "AuthorName", "SourceCode", "IssueTracker", "AntiFeatures", "RepoType", "Repo", "Builds", "AutoUpdateMode", "UpdateCheckMode", "CurrentVersion", "CurrentVersionCode"];
const ANTI = new Set(["Ads", "KnownVuln", "NonFreeAdd", "NonFreeAssets", "NonFreeDep", "NonFreeNet", "NoSourceSince", "NSFW", "TetheredNet", "Tracking", "UpstreamNonFree"]);
const BUILD_REQUIRED = ["versionName", "versionCode", "commit", "subdir", "gradle"];

function walk(dir, rel = "", out = []) {
  let list = [];
  try { list = fs.readdirSync(path.join(dir, rel), { withFileTypes: true }) } catch (e) { return out }
  for (const e of list) {
    if (e.isDirectory() && (e.name === "build" || e.name === ".gradle" || e.name === "node_modules")) continue;
    const r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) walk(dir, r, out); else out.push(r);
  }
  return out;
}
const read = p => { try { return fs.readFileSync(p, "utf8") } catch (e) { return null } };
const verGE = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); for (let i = 0; i < 3; i++) { if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0) } return true };

/* 檢查 Android 專案（proj＝有 capacitor.config.json 和 android/ 的資料夾）；回傳 [{ id, ok, level:"fail"|"warn", msg }] */
function checkProject(proj) {
  const C = [], add = (id, ok, msg, level = "fail") => C.push({ id, ok: !!ok, level, msg });
  const and = path.join(proj, "android"), files = walk(and);
  add("android", files.length > 0, files.length ? `android/ 有 ${files.length} 個檔` : "沒有 android/（先跑 npx cap add android）");
  const gradle = files.filter(f => /\.gradle(\.kts)?$/.test(f));
  const hits = [];
  for (const f of gradle) { const s = read(path.join(and, f)) || ""; for (const re of NONFREE) if (re.test(s.replace(/^\s*\/\/.*$/gm, ""))) hits.push(f + "：" + re.source) }
  add("gradle.nonfree", hits.length === 0, hits.length ? "Gradle 裡有閉源相依：" + hits.join("、") : `Gradle 檔 ${gradle.length} 個，沒有 Google Play 服務、Firebase、google-services`);
  const app = read(path.join(and, "app", "build.gradle")) || "";
  add("gradle.depinfo", /dependenciesInfo\s*\{[^}]*includeInApk\s*=\s*false[^}]*includeInBundle\s*=\s*false/.test(app), "app/build.gradle 關掉 DependencyInfoBlock（includeInApk、includeInBundle = false）");
  const vars = read(path.join(and, "variables.gradle")) || "", wk = (vars.match(/androidxWebkitVersion\s*=\s*'([\d.]+)'/) || [])[1];
  add("gradle.webkit", wk && verGE(wk, "1.18.0"), `androidx.webkit ${wk || "沒設"}（要 1.18.0 以上才有 Profile#setCrossOriginIsolatedAllowlist）`);
  const javaDir = files.filter(f => /\/MainActivity\.java$/.test(f))[0], main = javaDir ? read(path.join(and, javaDir)) || "" : "";
  const client = files.filter(f => /\/XQWebViewClient\.java$/.test(f)).map(f => read(path.join(and, f)) || "")[0] || "";
  add("native.allowlist", /setCrossOriginIsolatedAllowlist/.test(main) && /CROSS_ORIGIN_ISOLATED_ALLOWLIST/.test(main), "MainActivity 先查 WebViewFeature 再設跨來源隔離允許清單");
  add("native.dip", /Document-Isolation-Policy/.test(client), "XQWebViewClient 替自己的檔案補 Document-Isolation-Policy 標頭");
  /* Service Worker 的請求不經過 WebViewClient：MainActivity 要另設 ServiceWorkerClient、呼叫同一個 addIsolationHeaders；標頭清單只能寫一份 */
  const dipCount = (main + "\n" + client).split('"Document-Isolation-Policy"').length - 1;
  add("native.swclient", /setServiceWorkerClient\s*\(/.test(main) && /XQWebViewClient\.addIsolationHeaders\s*\(/.test(main) && dipCount === 1,
    dipCount > 1 ? `隔離標頭寫了 ${dipCount} 份，要只留 XQWebViewClient.ISOLATION_HEADERS 一份` : "MainActivity 替 Service Worker 的請求設 ServiceWorkerClient，跟 WebViewClient 共用 addIsolationHeaders（再開 App 才不會掉隔離）");
  let cfg = null; try { cfg = JSON.parse(read(path.join(proj, "capacitor.config.json"))) } catch (e) { cfg = null }
  const sv = cfg && cfg.server || {};
  add("config.origin", cfg && (sv.androidScheme || "https") === "https" && (sv.hostname || "localhost") === "localhost", `App 來源 ${(sv.androidScheme || "https")}://${sv.hostname || "localhost"}（上架後不能改，存檔跟著它）`);
  const bins = files.filter(f => BINARY.test(f)), wrapper = bins.filter(f => /gradle-wrapper\.jar$/.test(f)), other = bins.filter(f => !/gradle-wrapper\.jar$/.test(f));
  add("binaries", other.length === 0, other.length ? "android/ 裡有二進位檔：" + other.join("、") : "android/ 裡沒有 .jar/.aar/.so 等二進位檔（gradle-wrapper.jar 除外）");
  if (wrapper.length) add("binaries.wrapper", false, "有 gradle-wrapper.jar：F-Droid 用自己的 Gradle、不執行它；送審前可以在 metadata 用 rm 刪掉", "warn");
  return C;
}

/* 很小的 YAML 讀法：只看 F-Droid metadata 會用到的結構（頂層鍵、AntiFeatures 底下的鍵、Builds 第一個區塊的鍵） */
function parseFdroidYml(text) {
  const lines = text.split("\n"), top = {}, anti = [], builds = [];
  let cur = null, b = null;
  for (const ln of lines) {
    if (/^\s*#/.test(ln) || !ln.trim()) continue;
    const t = ln.match(/^([A-Za-z]+):\s*(.*)$/);
    if (t) { cur = t[1]; top[cur] = t[2].trim(); continue }
    if (cur === "AntiFeatures") { const m = ln.match(/^ {2}([A-Za-z]+):\s*$/) || ln.match(/^ {2}- ([A-Za-z]+)\s*$/); if (m) anti.push(m[1]) }
    if (cur === "Builds") {
      const m = ln.match(/^ {2}- ([A-Za-z]+):\s*(.*)$/), k = ln.match(/^ {4}([A-Za-z]+):\s*(.*)$/);
      if (m) { b = {}; builds.push(b); b[m[1]] = m[2].trim() } else if (k && b) b[k[1]] = k[2].trim();
    }
  }
  return { top, anti, builds };
}

function checkFdroidYml(text) {
  const C = [], add = (id, ok, msg, level = "fail") => C.push({ id, ok: !!ok, level, msg });
  add("yml.format", !/\r/.test(text) && !/\t/.test(text), "LF 換行、沒有 tab（YAML 不准 tab 縮排）");
  const { top, anti, builds } = parseFdroidYml(text);
  const miss = FDROID_REQUIRED.filter(k => !(k in top));
  add("yml.required", miss.length === 0, miss.length ? "缺欄位：" + miss.join("、") : `必填欄位 ${FDROID_REQUIRED.length} 個都有`);
  add("yml.license", top.License === "GPL-3.0-or-later", `License：${top.License || "沒寫"}（App 程式碼是 GPL-3.0-or-later）`);
  add("yml.repo", /^https:\/\/\S+\.git$/.test(top.Repo || "") && top.RepoType === "git", `Repo：${top.Repo || "沒寫"}（${top.RepoType || "?"}）`);
  const badAnti = anti.filter(a => !ANTI.has(a));
  add("yml.anti", anti.includes("NonFreeAssets") && anti.includes("NonFreeNet") && badAnti.length === 0,
    `AntiFeatures：${anti.join("、") || "沒有"}` + (badAnti.length ? `（不認得：${badAnti.join("、")}）` : "") + "（至少要 NonFreeAssets、NonFreeNet）");
  add("yml.builds", builds.length > 0, `Builds：${builds.length} 個建置區塊`);
  const b0 = builds[0] || {}, bm = BUILD_REQUIRED.filter(k => !(k in b0));
  add("yml.build0", bm.length === 0, bm.length ? "第一個建置區塊缺：" + bm.join("、") : "第一個建置區塊有 " + BUILD_REQUIRED.join("、"));
  const vc = Number(b0.versionCode), cvc = Number(top.CurrentVersionCode);
  add("yml.versionCode", Number.isInteger(vc) && vc > 0 && vc <= 2100000000, `versionCode ${b0.versionCode || "?"}（Android 上限 2100000000）`);
  add("yml.current", vc === cvc && (top.CurrentVersion || "") === (b0.versionName || ""), `CurrentVersion／CurrentVersionCode 跟最新的建置區塊一致（${top.CurrentVersion || "?"}／${top.CurrentVersionCode || "?"}）`);
  return C;
}

function checkAll(proj) {
  const out = checkProject(proj);
  const dir = path.join(proj, "fdroid"), ymls = walk(dir).filter(f => f.endsWith(".yml"));
  out.push({ id: "yml.exists", ok: ymls.length > 0, level: "fail", msg: ymls.length ? "F-Droid 建置設定草稿：" + ymls.map(f => "fdroid/" + f).join("、") : "fdroid/ 裡沒有 .yml" });
  for (const f of ymls) for (const c of checkFdroidYml(read(path.join(dir, f)))) out.push({ ...c, msg: f + "：" + c.msg });
  return out;
}

module.exports = { checkProject, checkFdroidYml, parseFdroidYml, checkAll, FDROID_REQUIRED };

if (require.main === module) {
  const proj = path.resolve(process.argv[2] || path.join(__dirname, ".."));
  const C = checkAll(proj);
  console.log("Android 骨架檢查：" + proj);
  for (const c of C) console.log(`  ${c.ok ? "✔" : c.level === "warn" ? "△" : "✘"} ${c.msg}`);
  const bad = C.filter(c => !c.ok && c.level === "fail");
  console.log(bad.length ? `\n✘ ${bad.length} 項沒過` : "\n✔ 全部通過（△ 是提醒）");
  process.exit(bad.length ? 1 : 0);
}
