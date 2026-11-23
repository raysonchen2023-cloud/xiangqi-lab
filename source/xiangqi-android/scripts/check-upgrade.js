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
//         [--aab-apk <aab-to-apk.js 產生的 aab-apk.json>（送審前必帶：安裝前核對 --new 的 SHA-256＝json 的 apkSha256，不符＝測試不成立；upgrade.json 記 tool／aabSha256／apkSha256／apkBound／pass／oldWorker 給 p0-gate.js）]
//   預設只在模擬器上跑（device-guard.js）：會解除安裝 App。冷啟後看 20 秒，期間跳出過更新視窗就算
//   需要已開好的模擬器或手機、adb（環境變數 ADB 或 PATH）；兩個 APK 要同一把簽章（測試金鑰），不然不能覆蓋安裝
// 金絲雀（2026-11-23，AGENTS.md「P0 出口驗證要難作假」「壞樣本自己做、測深層判斷」）：冷啟 N 次之後再冷啟一次，走同一個 20 秒觀察迴圈，
//   冷啟後第 3 秒用 App 自己的 modal() 跳出「有新版本」，同一套偵測要在觀察期間抓到；
//   抓不到＝偵測失靈，報告 pass＝false、結束代碼 1。報告另記 toolPins（tool-pin.js），送審閘門拿去跟 origin/main 比
// 結束代碼：0＝通過；1＝升級後有任何一項不符，或金絲雀沒抓到；2＝用法錯誤，或舊版沒能建立要重現的狀態（測試本身不成立，不能當通過）
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { connect } = require("./cdp.js");

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d };
const O = { old: arg("--old"), oldBuild: arg("--old-build"), neu: arg("--new"), newBuild: arg("--new-build"), serial: arg("--serial", "emulator-5580"),
  out: path.resolve(arg("--out", "upgrade-check")), cold: Number(arg("--cold", 3)), oldWorker: !process.argv.includes("--no-old-worker"),
  allowWipe: process.argv.includes("--allow-wipe-device"),
  aabApk: arg("--aab-apk") };   /* W69（流程盤點第 3 項，PR #44 審查後）：帶 aab-to-apk.js 的 aab-apk.json；安裝前算 --new 的 SHA-256 比對，對上才把 AAB 雜湊寫進報告給 p0-gate.js */
const AB = require("./apk-bind.js");
const TOOL_PINS = require("./tool-pin.js").pinsFor("P0-UPD");   /* 啟動就先算（PR #66 審查） */
const { checkDevice } = require("./device-guard.js");
const DIALOG_WATCH_SEC = 20;
const DIALOGS = `[...document.querySelectorAll('.modal')].filter(x=>/有新版本|新版可用|new version|update available/i.test(x.textContent)).length`;
const PKG = "com.raysonchen.xiangqiqianqiu", ADB = process.env.ADB || "adb", PORT = 9290;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adb = (...a) => cp.execFileSync(ADB, ["-s", O.serial, ...a], { encoding: "utf8", timeout: 180000 }).trim();
const R = { tool: "P0-UPD", aabSha256: null, apkSha256: null, apkBound: false, oldWorker: O.oldWorker, pass: false, serial: O.serial, old: { apk: O.old && path.basename(O.old), build: O.oldBuild }, new: { apk: O.neu && path.basename(O.neu), build: O.newBuild }, before: null, after: [] };
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
  if (process.argv.includes("--aab-sha")) { console.error("✘ --aab-sha 已停用（只會照抄雜湊、核對不到實際 APK）：改帶 --aab-apk <aab-to-apk.js 產生的 aab-apk.json>"); process.exit(2) }
  fs.mkdirSync(O.out, { recursive: true });
  if (O.aabApk) {
    const rb = AB.readBind(O.aabApk); if (!rb.ok) fail(2, rb.msg);
    const bd = AB.bind(rb.rec, AB.sha256File(O.neu), "--new 的 APK"); if (!bd.ok) fail(2, bd.msg);
    Object.assign(R, bd.fields); console.log(`✔ --new 就是從送審 AAB（${R.aabSha256.slice(0, 12)}）產生的 APK`);
  } else console.log("⚠ 沒帶 --aab-apk：這份報告沒綁送審 AAB，p0-gate.js 不收");
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
      const row = await coldWatch(c2); row.screenshot = snap("after-cold-" + i);
      R.after.push(row); save();
      console.log(`${row.pass ? "✔" : "✘"} 第 ${i} 次冷啟：${row.pass ? "通過" : row.bad.join("；")}`);
    } finally { c2.close() }
  }
  /* 4. 金絲雀（AGENTS.md「P0 出口驗證要難作假」＋「壞樣本自己做、測深層判斷」，2026-11-23）：再冷啟一次，走同一個 coldWatch（同一個 20 秒觀察迴圈、同一個 verdict），
     冷啟後第 CANARY_AT_SEC 秒用 App 自己的 modal()（跟真的更新提示同一個函式、同一種畫面）跳出「有新版本」，要在觀察期間被抓到；抓不到＝這支偵測失靈，整份不算通過 */
  R.canary = { dialog: false };
  { let c3;
    try { c3 = await launch(O.newBuild) } catch (e) { fail(2, "金絲雀那次冷啟沒起來：" + e.message) }
    try {
      const has = await c3.ev(`typeof modal==="function"`);
      if (!has) R.canary.error = "App 沒有 modal()：金絲雀做不出來";
      else {
        await c3.ev(CANARY_JS);
        const row = await coldWatch(c3);
        R.canary = { ...canaryVerdict(row.dialogs, row.bad), via: "App modal()", at: CANARY_AT_SEC };
        R.canary.screenshot = snap("canary-dialog");
      }
    } catch (e) { R.canary.error = String(e.message || e).slice(0, 200) } finally { c3.close() }
  }
  console.log(R.canary.dialog ? "✔ 金絲雀：假的更新視窗被抓到" : "✘ 金絲雀：假的更新視窗沒被抓到，這支偵測失靈了，結果不可信");
  R.toolPins = TOOL_PINS;
  const bad = R.after.filter(r => !r.pass);
  R.result = !R.canary.dialog ? "金絲雀沒抓到（工具失靈）" : bad.length ? "不通過" : "通過"; R.pass = !bad.length && R.canary.dialog === true; save();
  if (!R.canary.dialog) process.exit(1);   /* pass 給 p0-gate.js 看；用 --no-old-worker 跑的，閘門另外擋（規則：舊 Worker 要實際接管過） */
  console.log(bad.length ? `✘ 不能送審：${bad.length}／${O.cold} 次冷啟不符（P0-UPD）` : `✔ 升級測試通過：${O.oldBuild} → ${O.newBuild}，冷啟 ${O.cold} 次都符合`);
  process.exit(bad.length ? 1 : 0);
}
/* 冷啟一次：持續看 DIALOG_WATCH_SEC 秒（PR #12 審查：更新視窗要等大廳連線送來 version 才會跳，期間出現過就算），再取 PROBE 判斷；正式冷啟與金絲雀共用 */
async function coldWatch(c, sec = DIALOG_WATCH_SEC, wait = sleep) {   /* sec、wait 可注入：自我測試不用真的等 20 秒 */
  let seen = 0;
  for (let t = 0; t < sec; t++) { try { seen = Math.max(seen, await c.ev(DIALOGS)) } catch (e) { } await wait(1000) }
  const row = mergeWatch(await c.ev(PROBE), seen);
  row.bad = verdict(row); row.pass = !row.bad.length;
  return row;
}
/* 金絲雀：冷啟後第 CANARY_AT_SEC 秒，用 App 自己的 modal() 跳出跟真的更新提示一樣的視窗（02-shell.js 的「有新版本」） */
const CANARY_AT_SEC = 3;
const CANARY_JS = `setTimeout(()=>{try{modal('<div class="em">🆕</div><h2>有新版本</h2><p class="muted">P0 金絲雀（升級測試故意跳出）</p>',[["知道了",()=>{}]])}catch(e){}},${CANARY_AT_SEC * 1000})`;
/* 金絲雀判斷（純函式）：假視窗要被 DIALOGS 數到，而且 verdict 要因此判出「更新提示視窗」那一條 */
function canaryVerdict(seen, bad) { const caught = Number(seen) >= 1 && (bad || []).some(b => /更新提示視窗/.test(b)); return { dialog: caught, seen: Number(seen) || 0 } }
module.exports = { verdict, mergeWatch, canaryVerdict, coldWatch, PROBE, DIALOGS, DIALOG_WATCH_SEC, CANARY_JS, CANARY_AT_SEC };
if (require.main === module) main().catch(e => fail(2, e.stack || String(e)));
