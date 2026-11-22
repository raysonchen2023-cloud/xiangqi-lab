#!/usr/bin/env node
// 象棋千秋 Android：送審前的升級測試（W41②，2026-11-21；封測 P0-UPD「一直跳出更新」）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：W01（11/19～20）玩家手機裡還有舊網頁版的 Service Worker 與程式快取，它接管了新 APK，原生版還在跑網頁的更新檢查
//   → 一直跳出更新、或顯示舊畫面。新裝的手機沒有這個狀態，所以只測「全新安裝」永遠看不到。
// 怎麼測（沿用 11/20～21 M05／Android 12 手動矩陣 matrix-5580-upgrade.js 的判斷）：
//   1. 裝上一個版本（預設要求它真的建立舊 Worker 與 xqlab-app- 程式快取，重現玩家手機狀態），寫入一筆測試存檔
//   2. 用新版覆蓋安裝（adb install -r，不清資料）
//   3. 冷啟 N 次（預設 3），每次檢查：版號＝新版、存檔與設定保留、沒有 Service Worker、沒有舊 xqlab-app- 快取、
//      網頁更新檢查關閉、沒有更新提示視窗、「檢查更新」按鈕說由 Google Play 更新
// 用法：node scripts/check-upgrade.js --old <舊.apk> --old-build <舊版號> --new <新.apk> --new-build <新版號> [--serial emulator-5580]
//         [--out <資料夾>] [--cold 3] [--no-old-worker（舊版本身就是原生版、不會有舊 Worker 時）] [--allow-wipe-device（實體手機才要，會刪存檔）]
//         [--aab-sha <要送審 AAB 的 SHA-256>（送審前必帶：新版 APK 要由 aab-to-apk.js 從那個 AAB 產生；upgrade.json 記 tool／aabSha256／pass／oldWorker 給 p0-gate.js）]
//   預設只在模擬器上跑（device-guard.js）：會解除安裝 App。冷啟後看 20 秒，期間跳出過更新視窗就算
//   需要已開好的模擬器或手機、adb（環境變數 ADB 或 PATH）；兩個 APK 要同一把簽章（測試金鑰），不然不能覆蓋安裝
// 結束代碼：0＝通過；1＝升級後有任何一項不符；2＝用法錯誤，或舊版沒能建立要重現的狀態（測試本身不成立，不能當通過）
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { connect } = require("./cdp.js");

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d };
const O = { old: arg("--old"), oldBuild: arg("--old-build"), neu: arg("--new"), newBuild: arg("--new-build"), serial: arg("--serial", "emulator-5580"),
  out: path.resolve(arg("--out", "upgrade-check")), cold: Number(arg("--cold", 3)), oldWorker: !process.argv.includes("--no-old-worker"),
  allowWipe: process.argv.includes("--allow-wipe-device"),
  aabSha: arg("--aab-sha") };   /* W69（流程盤點第 3 項）：新版 APK 要由 aab-to-apk.js 從要送審的 AAB 產生，這裡帶那個 AAB 的 SHA-256，寫進報告給 p0-gate.js 核對 */
const { checkDevice } = require("./device-guard.js");
const DIALOG_WATCH_SEC = 20;
const DIALOGS = `[...document.querySelectorAll('.modal')].filter(x=>/有新版本|新版可用|new version|update available/i.test(x.textContent)).length`;
const PKG = "com.raysonchen.xiangqiqianqiu", ADB = process.env.ADB || "adb", PORT = 9290;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => cp.execFileSync(ADB, ["-s", O.serial, ...a], { encoding: "utf8", timeout: 180000 }).trim();
const R = { tool: "P0-UPD", aabSha256: O.aabSha && /^[0-9a-f]{64}$/i.test(O.aabSha) ? O.aabSha.toLowerCase() : null, oldWorker: O.oldWorker, pass: false, serial: O.serial, old: { apk: O.old && path.basename(O.old), build: O.oldBuild }, new: { apk: O.neu && path.basename(O.neu), build: O.newBuild }, before: null, after: [] };
const save = () => fs.writeFileSync(path.join(O.out, "upgrade.json"), JSON.stringify(R, null, 1) + "\n");
const snap = name => { try { fs.writeFileSync(path.join(O.out, name + ".png"), cp.execFileSync(ADB, ["-s", O.serial, "exec-out", "screencap", "-p"], { maxBuffer: 1e8 })); return name + ".png" } catch (e) { return null } };
function fail(code, msg) { R.result = code === 1 ? "不通過" : "測試不成立"; R.error = msg; R.screenshot = snap("upgrade-error"); save(); console.error("✘ " + msg); process.exit(code) }

/* 等 App 載到指定版號（網頁 XQ_BUILD）、主程式就緒，回傳 CDP 連線 */
async function launch(expected) {
  adb("shell", "am", "force-stop", PKG);
  adb("shell", "am", "start", "--user", "0", "-n", PKG + "/.MainActivity");
  let last = null;
  for (let i = 0; i < 90; i++) {
    let c = null;
    try {
      const pid = adb("shell", "pidof", PKG).split(/\s+/)[0];
      if (!pid) throw new Error("App 還沒起來");
      adb("forward", "tcp:" + PORT, "localabstract:webview_devtools_remote_" + pid);
      c = await connect(PORT);
      last = JSON.parse(await c.ev(`JSON.stringify({build:window.XQ_BUILD,url:location.href,ready:typeof store!=="undefined"})`));
      if (last.build === expected && last.ready) return c;
    } catch (e) { /* 重啟中，WebView 可能換掉 */ }
    if (c) c.close();
    await sleep(800);
  }
  R.lastObserved = last;
  throw new Error(`App 沒有載到 ${expected}（最後看到 ${last ? last.build : "無"}）`);
}

/* 升級後每次冷啟要檢查的項目；fn 不存在（沒有原生修正的版本）一律當成「沒關掉」 */
const PROBE = `(async()=>{
  const b=document.createElement('button');let manual=null;
  if(typeof updCheck==='function'){try{await updCheck(b);manual=b.textContent}catch(e){manual='錯誤：'+e}}
  return {build:XQ_BUILD,raw:localStorage.getItem('qa_upg_keep'),setting:store.get('qaUpgKeep',null),
    regs:(await navigator.serviceWorker.getRegistrations()).length,controller:!!navigator.serviceWorker.controller,
    oldKeys:(await caches.keys()).filter(k=>k.startsWith('xqlab-app-')),
    webUpdate:typeof xqWebUpdateOn==='function'?xqWebUpdateOn():true,notify:typeof XQ_notifyNew,manual,
    dialogs:[...document.querySelectorAll('.modal')].filter(x=>/有新版本|新版可用|new version|update available/i.test(x.textContent)).length}
})()`;
/* 冷啟後 DIALOG_WATCH_SEC 秒內看過的更新視窗數，併進最後那次檢查（取較大的）：視窗跳出後被關掉也算 */
function mergeWatch(row, seen) { return { ...row, dialogs: Math.max(+row.dialogs || 0, +seen || 0) } }
function verdict(row, newBuild = O.newBuild) {
  const bad = [];
  if (row.build !== newBuild) bad.push(`載入版號 ${row.build}，應為 ${newBuild}`);
  if (row.raw !== "kept" || row.setting !== "kept") bad.push("測試存檔或設定沒有保留");
  if (row.regs) bad.push(`還有 ${row.regs} 個 Service Worker`);
  if (row.controller) bad.push("頁面仍被 Service Worker 接管");
  if (row.oldKeys.length) bad.push("舊程式快取沒清：" + row.oldKeys.join("、"));
  if (row.webUpdate) bad.push("網頁更新檢查還開著（原生版應關閉）");
  if (row.notify !== "undefined") bad.push("網頁新版通知還掛著（XQ_notifyNew）");
  if (row.dialogs) bad.push(`畫面上有 ${row.dialogs} 個更新提示視窗`);
  if (!/Google Play/.test(row.manual || "")) bad.push(`「檢查更新」沒說由 Google Play 更新（${row.manual}）`);
  return bad;
}

async function main() {
  if (!O.old || !O.neu || !O.oldBuild || !O.newBuild || !fs.existsSync(O.old) || !fs.existsSync(O.neu) || !(O.cold > 0))
    { console.error("用法：node scripts/check-upgrade.js --old <舊.apk> --old-build <舊版號> --new <新.apk> --new-build <新版號> [--serial emulator-5580] [--out 資料夾] [--cold 3] [--no-old-worker] [--allow-wipe-device]"); process.exit(2) }
  fs.mkdirSync(O.out, { recursive: true });
  try { R.device = { model: adb("shell", "getprop", "ro.product.model"), android: adb("shell", "getprop", "ro.build.version.release") } }
  catch (e) { fail(2, `找不到裝置 ${O.serial}（adb devices 看看）`) }
  { const g = checkDevice(adb, O.allowWipe); R.device.emulator = g.emulator; if (!g.ok) fail(2, g.message); if (g.message) console.log(g.message) }

  // 1. 舊版：乾淨安裝、寫存檔、等舊 Worker 與程式快取建立
  try { adb("uninstall", PKG) } catch (e) { /* 本來就沒裝 */ }
  adb("install", "-r", "-d", O.old);
  let c;
  try { c = await launch(O.oldBuild) } catch (e) { fail(2, "舊版沒有啟動：" + e.message) }
  try {
    await c.ev(`(()=>{localStorage.setItem('xq_netRoot',JSON.stringify('xq_test'));localStorage.setItem('qa_upg_keep','kept');store.set('qaUpgKeep','kept')})()`);
    const until = Date.now() + 65000;
    while (Date.now() < until) {
      try { R.before = await c.ev(`(async()=>({build:XQ_BUILD,regs:(await navigator.serviceWorker.getRegistrations()).length,controller:!!navigator.serviceWorker.controller,keys:await caches.keys()}))()`) } catch (e) { }
      if (!O.oldWorker || R.before && R.before.regs && R.before.controller && R.before.keys.some(k => k.startsWith("xqlab-app-"))) break;
      await sleep(1000);
    }
  } finally { c.close() }
  R.before.screenshot = snap("before-upgrade"); save();
  if (O.oldWorker && !(R.before.regs && R.before.controller && R.before.keys.some(k => k.startsWith("xqlab-app-"))))
    fail(2, "舊版沒有建立舊 Worker 與 xqlab-app- 程式快取，重現不了玩家手機的狀態（舊版是原生版就加 --no-old-worker）");

  // 2. 覆蓋安裝新版（不清資料）
  adb("install", "-r", O.neu);
  R.installedVersion = (adb("shell", "dumpsys", "package", PKG).match(/^\s*versionName=(\S+)\s*$/m) || [])[1] || null; save();

  // 3. 冷啟 N 次
  for (let i = 1; i <= O.cold; i++) {
    let c2;
    try { c2 = await launch(O.newBuild) } catch (e) { fail(1, `第 ${i} 次冷啟：${e.message}`) }
    try {
      /* PR #12 審查：更新視窗要等大廳連線送來 version 才會跳，冷啟後持續看 DIALOG_WATCH_SEC 秒，期間出現過就算 */
      let seen = 0;
      for (let t = 0; t < DIALOG_WATCH_SEC; t++) { try { seen = Math.max(seen, await c2.ev(DIALOGS)) } catch (e) { } await sleep(1000) }
      const row = mergeWatch(await c2.ev(PROBE), seen);
      row.bad = verdict(row); row.pass = !row.bad.length; row.screenshot = snap("after-cold-" + i);
      R.after.push(row); save();
      console.log(`${row.pass ? "✔" : "✘"} 第 ${i} 次冷啟：${row.pass ? "通過" : row.bad.join("；")}`);
    } finally { c2.close() }
  }
  const bad = R.after.filter(r => !r.pass);
  R.result = bad.length ? "不通過" : "通過"; R.pass = !bad.length; save();   /* pass 給 p0-gate.js 看；用 --no-old-worker 跑的，閘門另外擋（規則：舊 Worker 要實際接管過） */
  console.log(bad.length ? `✘ 不能送審：${bad.length}／${O.cold} 次冷啟不符（P0-UPD）` : `✔ 升級測試通過：${O.oldBuild} → ${O.newBuild}，冷啟 ${O.cold} 次都符合`);
  process.exit(bad.length ? 1 : 0);
}
module.exports = { verdict, mergeWatch, PROBE, DIALOG_WATCH_SEC };
if (require.main === module) main().catch(e => fail(2, e.stack || String(e)));
