#!/usr/bin/env node
// 象棋千秋 Android：送審前的 44 畫面破圖掃描（W41③，2026-11-21；封測 P0-IMG「大破圖」）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：安裝包內容檢查（check-aab-assets.js）看的是「檔在不在」，這支看的是「玩家眼睛看到的」：
//   在模擬器上依序打開各畫面，記錄看得到卻沒解碼成功的圖、背景圖、失敗的 data/ 請求，每頁截圖。
//   沿用 W21（11/20）逐場景掃描的判斷；那次就是這樣找到渡口整片破圖、離線 21 個畫面破圖。
// 流程（--mode both，預設）：先連線掃一輪（玩家正常使用、順便把圖存進快取），再關網路掃一輪（看過的圖離線也要在）。
// 預設先把 App 帶到「封測玩家狀態」（player-state.js：繁中、已開旅程、帶隨行夥伴），畫面跟封測玩家手機一樣；
//   加 --fresh 才用空白存檔（新安裝第一次打開的情況，當額外一項）。開發者 11/21：「我這邊也要精準看到跟 Android 手機的畫面樣子」。
// 用法：node scripts/check-scenes.js [--apk <要測的.apk>（全新安裝）] [--serial emulator-5580] [--mode both|online|offline]
//         [--out <資料夾>] [--wait 5000] [--routes home,lobby,…] [--fresh] [--companion x_miaogirl]
//   需要已開好的模擬器、adb（環境變數 ADB 或 PATH）。預設只在模擬器上跑（device-guard.js：會解除安裝 App、切飛航模式）；實體手機要加 --allow-wipe-device
//   讀取失敗檢查要 WebView 能給讀取狀態碼（Chrome 109 以上）；拿不到時整輪當測不成立
// 結束代碼：0＝所有畫面都沒有破圖、沒有失敗的 data/ 請求；1＝有；2＝用法或環境錯誤（App 沒起來、玩家狀態沒設成、不是模擬器、WebView 太舊等，不能當通過）
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { connect } = require("./cdp.js");
const { setupPlayer, waitPreload } = require("./player-state.js");
const { checkDevice } = require("./device-guard.js");
const { routeCdn, probeOk, summarize } = require("./cdn-route.js");

const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d };
const O = { apk: arg("--apk"), serial: arg("--serial", "emulator-5580"), mode: arg("--mode", "both"), out: path.resolve(arg("--out", "scene-check")),
  wait: Number(arg("--wait", 5000)), routes: arg("--routes"), fresh: process.argv.includes("--fresh"), allowWipe: process.argv.includes("--allow-wipe-device"), companion: arg("--companion", "x_miaogirl"),
  /* W74～W76（11/23，發版回歸驗收規則「上線前相容、開關與 go/no-go」）：--cdn-to 把 CDN 改向到預覽分支網址或本機資料夾（只能連線輪）；
     --flags-file 把遠端開關檔換成這份 JSON；--flags-fail 讓開關檔讀不到 */
  cdnTo: arg("--cdn-to"), flagsFile: arg("--flags-file"), flagsFail: process.argv.includes("--flags-fail") };
O.routing = !!(O.cdnTo || O.flagsFile || O.flagsFail);
const PKG = "com.raysonchen.xiangqiqianqiu", ADB = process.env.ADB || "adb", PORT = 9253;
const ROUTES = (O.routes || [
  "home", "journey", "adventure", "ship", "hub", "lobby", "cpu", "cpuroom", "pvp", "canju", "db", "shelf",
  "redo", "school", "lesson", "openings", "quiz", "daily", "today", "guess", "battle", "arena", "cup",
  "camp", "port", "guanxing", "ximarket", "codex", "legend", "jianghu", "simul", "weekly", "stats", "me",
  "theme", "settings", "feedback", "terms", "watch", "lab", "ouyu", "xiaohan", "hw", "coop",
].join(",")).split(",");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const adbRaw = (...a) => cp.execFileSync(ADB, ["-s", O.serial, ...a], { timeout: 180000, maxBuffer: 1e8, windowsHide: true });
const adb = (...a) => adbRaw(...a).toString().trim();

/* 在頁面裡收集：看得到的 <img> 沒解碼、看得到的元素背景圖 data/ 解不開、失敗的 data/ 請求、畫面上的視窗 */
const COLLECT = `(async () => {
  const vis = e => { const b = e.getBoundingClientRect(), s = getComputedStyle(e);
    return b.width > 1 && b.height > 1 && b.right > 0 && b.bottom > 0 && b.left < innerWidth && b.top < innerHeight &&
      s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.02; };
  const rel = u => { const m = String(u || "").match(/\\/(data\\/[^?#"')]+)/); return m ? decodeURI(m[1]) : String(u || "").slice(0, 120); };
  const imgs = [...document.images].filter(vis);
  const broken = imgs.filter(i => (i.currentSrc || i.getAttribute("src")) && i.complete && !i.naturalWidth).map(i => rel(i.currentSrc || i.src));
  const bg = new Set();
  for (const e of document.querySelectorAll("body *")) {
    if (!vis(e)) continue;
    const b = getComputedStyle(e).backgroundImage;
    if (b && b !== "none") for (const m of b.matchAll(/url\\(["']?([^"')]+)["']?\\)/g)) if (/\\/data\\//.test(m[1])) bg.add(m[1]);
  }
  const bgRes = await Promise.all([...bg].map(u => new Promise(res => {
    const i = new Image(); let done = false;
    const fin = ok => { if (!done) { done = true; res({ file: rel(u), ok }); } };
    i.onload = () => fin(i.naturalWidth > 0); i.onerror = () => fin(false); i.src = u; setTimeout(() => fin("逾時"), 8000);
  })));
  const failed = performance.getEntriesByType("resource")
    .filter(r => /\\/data\\//.test(r.name) && (r.responseStatus >= 400 || (r.responseStatus === 0 && r.transferSize === 0 && r.decodedBodySize === 0 && r.duration > 0 && !r.name.startsWith(location.origin + "/data/"))))
    .map(r => rel(r.name) + "（HTTP " + r.responseStatus + "）");
  return { hash: location.hash, statusOk: typeof PerformanceResourceTiming !== "undefined" && "responseStatus" in PerformanceResourceTiming.prototype, images: imgs.length, broken, bgBroken: bgRes.filter(b => b.ok !== true).map(b => b.file + (b.ok === "逾時" ? "（逾時）" : "")),
    bgCount: bgRes.length, failed: [...new Set(failed)], modal: [...document.querySelectorAll(".modal")].filter(vis).map(m => m.innerText.slice(0, 60)) };
})()`;

async function attach() {
  for (let i = 0; i < 60; i++) {
    let c = null;
    try {
      const pid = adb("shell", "pidof", PKG).split(/\s+/)[0];
      if (pid) {
        adb("forward", "tcp:" + PORT, "localabstract:webview_devtools_remote_" + pid);
        c = await connect(PORT);
        if (await c.ev('typeof route==="function"&&Boolean(document.querySelector(".home-page"))')) return c;
      }
    } catch (e) { }
    if (c) c.close();
    await sleep(1000);
  }
  throw new Error("首頁沒有掛載（App 沒起來或卡住）");
}
const net = on => {
  adb("shell", "cmd", "connectivity", "airplane-mode", on ? "disable" : "enable");
  adb("shell", "svc", "wifi", on ? "enable" : "disable");
  adb("shell", "svc", "data", on ? "enable" : "disable");
};

/* 整輪的結束代碼：有紅燈＝1；沒紅燈但拿不到讀取狀態碼（讀取失敗檢查沒做）、或要改向卻沒證明攔截生效（routeBad）＝2 測不成立；其餘＝0 */
function finalCode({ bad, noStatus, routeBad }) { return bad ? 1 : noStatus || routeBad ? 2 : 0 }
/* W74～W76：有要改向時，每一輪都要有改向摘要，而且探測檔讀得到；少一輪就是沒證明，測不成立 */
function routeBadOf(sweeps, routing) { return !!routing && (!sweeps.length || sweeps.some(s => !s.route || s.route.probeOk !== true)) }
/* 首頁掛好了沒（重新載入之後用） */
async function waitHome(c, ms = 60000) {
  for (let t = 0; t < ms; t += 1000) { try { if (await c.ev('typeof route==="function"&&Boolean(document.querySelector(".home-page"))')) return true } catch (e) { } await sleep(1000) }
  return false;
}
/* 連線那一輪有沒有拿不到讀取狀態碼（離線那輪本來就不算讀取失敗） */
function noStatusOf(sweeps) { return sweeps.some(s => s.mode === "online" && s.statusOk === false) }

/* 一個畫面怎麼算（開發者 11/21：離線只算「看得到的破圖」——小包只存連線看過的檔，離線時背景預抓、還沒下載過的檔讀不到是設計限制，列成提醒；連線時讀取失敗照樣算） */
function judge(row, mode) {
  const fails = (row.failed || []).length;
  return { bad: (row.broken || []).length + (row.bgBroken || []).length + (mode === "online" ? fails : 0) + (row.error ? 1 : 0), warn: mode === "offline" ? fails : 0 };
}

async function sweep(mode) {
  const dir = path.join(O.out, mode); fs.mkdirSync(dir, { recursive: true });
  net(mode === "online");
  adb("shell", "am", "force-stop", PKG);
  adb("shell", "am", "start", "-n", PKG + "/.MainActivity");
  await sleep(4000);
  const c = await attach();
  /* W74～W76：先開攔截，再重新載入一次，冷啟時在接上之前就發出的請求也會重來一遍、經過攔截 */
  let routeLog = null;
  if (O.routing) {
    routeLog = await routeCdn(c, { to: O.cdnTo, flags: O.flagsFail ? "fail" : O.flags });
    await c.send("Page.reload", {});
    await sleep(2000);
    if (!(await waitHome(c))) { c.close(); throw new Error("改向後重新載入，首頁 60 秒沒有掛好") }
  }
  if (!(await waitPreload(c, 180000))) { c.close(); throw new Error("預載頁 3 分鐘還沒收掉") }   /* 封測玩家打開時素材早就下載好；等收掉再掃，不然每張截圖都是載入畫面 */
  const rep = { mode, build: await c.ev("XQ_BUILD"), online: await c.ev("navigator.onLine"), routes: [] };
  if (routeLog) { rep.route = summarize(routeLog, await probeOk(c)); console.log(`改向：探測檔${rep.route.probeOk ? "讀得到（攔截生效）" : "讀不到（攔截沒生效，這輪不算）"}、攔到 ${rep.route.intercepted} 個請求`) }
  await c.ev(`(() => { localStorage.setItem('xq_netRoot',JSON.stringify('xq_test')); ${O.fresh ? "" : 'store.set("lang","zh");'} if (typeof titleClose === "function") titleClose(); if (document.querySelector(".modal") && typeof closeModal === "function") closeModal(); performance.setResourceTimingBufferSize(5000); })()`);
  await sleep(3000);
  for (const r of ROUTES) {
    const row = { route: r };
    try {
      await c.ev(`(() => { performance.clearResourceTimings(); if (document.querySelector(".modal") && typeof closeModal === "function") closeModal(); const h = "#/${r}"; if (location.hash === h) route(); else location.hash = h; })()`);
      await sleep(O.wait);
      Object.assign(row, await c.ev(COLLECT));
      fs.writeFileSync(path.join(dir, r + ".png"), adbRaw("exec-out", "screencap", "-p"));
      row.screenshot = mode + "/" + r + ".png";
    } catch (e) { row.error = String(e.message || e) }
    const fails = (row.failed || []).length;
    Object.assign(row, judge(row, mode));
    rep.routes.push(row);
    console.log(`[${mode === "online" ? "連線" : "離線"}] ${r.padEnd(10)} 圖 ${row.images ?? "-"}｜破 ${(row.broken || []).length}｜背景破 ${(row.bgBroken || []).length}｜讀取失敗 ${fails}${mode === "offline" && fails ? "（提醒）" : ""}${row.error ? "｜錯誤 " + row.error : ""}${row.bad ? "  ✘" : row.warn ? "  △" : ""}`);
  }
  if (routeLog) rep.route = summarize(routeLog, rep.route.probeOk);   /* 掃完再算一次，把 44 個畫面期間攔到的也算進去 */
  c.close();
  rep.badRoutes = rep.routes.filter(r => r.bad).map(r => r.route);
  /* PR #12 審查：讀取狀態碼（responseStatus）要 Chrome 109 以上；WebView 91 這類舊版拿不到，讀取失敗會被看成沒事 → 標記出來，最後當成測不成立 */
  rep.statusOk = rep.routes.filter(r => !r.error).every(r => r.statusOk !== false);
  rep.warnRoutes = rep.routes.filter(r => !r.bad && r.warn).map(r => r.route);
  return rep;
}

async function main() {
  if (!/^(both|online|offline)$/.test(O.mode) || O.apk && !fs.existsSync(O.apk) || !(O.wait > 0)) {
    console.error("用法：node scripts/check-scenes.js [--apk <.apk>] [--serial emulator-5580] [--mode both|online|offline] [--out 資料夾] [--wait 5000] [--routes …] [--fresh] [--companion x_miaogirl] [--cdn-to <預覽網址或本機資料夾>] [--flags-file <開關.json> | --flags-fail]"); process.exit(2) }
  const why = routeArgError(O);
  if (why) { console.error("✘ " + why); process.exit(2) }
  if (O.flagsFile) O.flags = JSON.parse(fs.readFileSync(O.flagsFile, "utf8"));
  fs.mkdirSync(O.out, { recursive: true });
  const R = { serial: O.serial, apk: O.apk && path.basename(O.apk), state: O.fresh ? "空白存檔（新安裝第一次打開）" : "封測玩家狀態", startedAt: new Date().toISOString(), sweeps: [] };
  if (O.routing) R.routing = { cdnTo: O.cdnTo || null, flags: O.flagsFail ? "讀不到" : O.flagsFile ? path.basename(O.flagsFile) : null };
  const save = () => fs.writeFileSync(path.join(O.out, "scenes.json"), JSON.stringify(R, null, 1) + "\n");
  try {
    R.device = { model: adb("shell", "getprop", "ro.product.model"), android: adb("shell", "getprop", "ro.build.version.release") };
    { const g = checkDevice(adb, O.allowWipe); R.device.emulator = g.emulator; if (!g.ok) throw new Error(g.message); if (g.message) console.log(g.message) }
    if (O.apk) { net(true); try { adb("uninstall", PKG) } catch (e) { } adb("install", "-r", "-d", O.apk) }
    R.installed = (adb("shell", "dumpsys", "package", PKG).match(/^\s*versionName=(\S+)\s*$/m) || [])[1] || null;
    if (O.fresh) { try { adb("shell", "cmd", "locale", "set-app-locales", PKG, "--locales", "zh-TW") } catch (e) { } }   /* 新安裝也照臺灣玩家：手機語言繁中 */
    else { R.player = await setupPlayer({ adb: ADB, serial: O.serial, companion: O.companion }); save(); console.log("封測玩家狀態：" + JSON.stringify(R.player)) }
    for (const m of O.mode === "both" ? ["online", "offline"] : [O.mode]) { R.sweeps.push(await sweep(m)); save() }
  } catch (e) { R.error = String(e.message || e); save(); try { net(true) } catch (e2) { } console.error("✘ " + R.error); process.exit(2) }
  try { net(true) } catch (e) { }
  R.finishedAt = new Date().toISOString();
  const bad = R.sweeps.flatMap(s => s.badRoutes.map(r => (s.mode === "online" ? "連線 " : "離線 ") + r));
  const warn = R.sweeps.flatMap(s => (s.warnRoutes || []).map(r => "離線 " + r));
  const noStatus = noStatusOf(R.sweeps), routeBad = routeBadOf(R.sweeps, O.routing);
  R.result = bad.length ? "不通過" : noStatus || routeBad ? "測不成立" : "通過"; R.warnRoutes = warn; R.statusOk = !noStatus; if (O.routing) R.routeOk = !routeBad; save();
  if (!bad.length && routeBad) { console.log("△ 測不成立：要改向，可是探測檔讀不到（CDP 攔截沒接上），看到的還是正式 CDN，不能當成 W74／W76 通過"); process.exit(2) }
  if (finalCode({ bad: bad.length, noStatus }) === 2) { console.log("△ 測不成立：這台的 WebView 太舊，拿不到讀取狀態碼（要 Chrome 109 以上），讀取失敗檢查沒有做。看得到的破圖已檢查、沒有發現；請換新一點的模擬器再跑"); process.exit(2) }
  console.log(bad.length ? `✘ 不能送審：${bad.length} 個畫面有破圖或讀取失敗（${bad.join("、")}）`
    : `✔ 破圖掃描通過：${R.sweeps.map(s => (s.mode === "online" ? "連線" : "離線") + " " + s.routes.length + " 個畫面").join("、")}看得到的圖都沒有破（${R.sweeps[0] && R.sweeps[0].build}）`);
  if (warn.length) console.log(`△ 提醒：離線時 ${warn.length} 個畫面有還沒下載過的檔讀不到（${warn.join("、")}），細節在 scenes.json；不擋送審`);
  process.exit(finalCode({ bad: bad.length, noStatus, routeBad }));
}
/* 改向參數對不對（W74～W76）：--cdn-to 只能連線輪（離線時 App 本來就讀不到 CDN，改向會把離線測成連線）；要是 https 網址或存在的資料夾；
   --flags-file 跟 --flags-fail 只能擇一，檔案要是 {"off":{…}} 的 JSON */
function routeArgError(o) {
  if ((o.cdnTo || o.flagsFile || o.flagsFail) && o.mode !== "online") return "--cdn-to、--flags-file、--flags-fail 只能配 --mode online（離線輪不改向：攔截會讓離線的 App 讀得到東西）";
  if (o.cdnTo) {
    if (!/^https:\/\//.test(o.cdnTo) && !(fs.existsSync(o.cdnTo) && fs.statSync(o.cdnTo).isDirectory())) return "--cdn-to 要是 https 網址或存在的資料夾：" + o.cdnTo;
  }
  if (o.flagsFile && o.flagsFail) return "--flags-file 跟 --flags-fail 只能擇一";
  if (o.flagsFile) {
    let j; try { j = JSON.parse(fs.readFileSync(o.flagsFile, "utf8")) } catch (e) { return "--flags-file 讀不到或不是 JSON：" + o.flagsFile }
    if (!j || typeof j.off !== "object" || j.off === null || Array.isArray(j.off)) return "--flags-file 要有 \"off\": {…}";
  }
  return null;
}
module.exports = { judge, finalCode, noStatusOf, routeBadOf, routeArgError, waitHome, ROUTES, COLLECT };
if (require.main === module) main();
