#!/usr/bin/env node
// 象棋千秋 Android：遠端開關真的關得掉（W76，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：遠端開關（W72）是上線後唯一的止血手段，沒驗過的開關等於沒有開關（11/23 外部評論；開發者選「P0 加回退與開關測項」）。
//   規則寫在發版回歸驗收規則「上線前相容、開關與 go/no-go」W76：每個開關各關一次，冷啟一次、切到背景再回前景一次；再試讀不到開關檔。
// 做法：用 cdn-route.js 攔 App 讀開關檔的請求，回指定內容（只關一個代號），照代號表 flags-codes.json 開對應的畫面、看入口在不在。
//   代號表由開關作者維護（W72／#71）；這支是驗收方的工具，寫、驗分開。
// 每個代號跑四段：
//   ① 基準（全開）：入口都要在。入口本來就不在的話，「關掉後不見」不算數 → 測不成立。
//   ② 冷啟關掉：開關檔只關這個代號，冷啟後入口不見、其他派照常。
//   ③ 回前景關掉：先全開、App 放背景（超過 App 的 60 秒不重抓），把開關檔改成關、叫回前景，入口不見。
//   ④（只做一次）讀不到開關檔：手上有上一次的「關」就照舊關；從沒抓到過就全開。
// 用法：node scripts/check-flags.js [--apk <要測的.apk>] [--serial emulator-5580] [--codes <flags-codes.json>] [--only halls8,play_horse]
//         [--out <資料夾>] [--wait 4000] [--fg-wait 65] [--allow-wipe-device]
// 結束代碼：0＝每個開關都關得掉、其他功能不受影響；1＝有開關關不掉、或關了影響到別的、或 App 沒去讀開關檔；
//   2＝測不成立（基準時入口就不在、攔截沒生效、代號表有工具不認得的代號、App 沒有 xqFlag、不是模擬器等），不能當通過
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const { connect } = require("./cdp.js");
const { setupPlayer, waitPreload } = require("./player-state.js");
const { checkDevice } = require("./device-guard.js");
const { routeCdn, probeOk, summarize, FLAGS_URL } = require("./cdn-route.js");

const PKG = "com.raysonchen.xiangqiqianqiu", PORT = 9254;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* 一個代號要看哪些畫面（純函式，測試直接呼叫）。off＝這個代號關著時的預期；on＝全開時的預期。
   代號表裡有 sid＋spot 的是「某一派的玩法入口」；halls8 是整個八派門內頁（表裡的 check 是給人看的文字，判法寫在這裡）。
   不認得的代號回 null → 測不成立（新代號要先在這裡補判法，不能默默不驗） */
function planFor(code, codes) {
  const hall = (sid) => "#/jianghu/hall/" + sid, spot = (k) => `.jh-hall-spot[data-k="${k}"]`;
  const plays = codes.filter((c) => c.sid && c.spot);
  if (code === "halls8") {
    const any = plays[0];
    if (!any) return null;
    return {
      on: [{ go: hall(any.sid), has: [".jh-hall"] }],
      off: [{ go: hall(any.sid), hashIs: "#/jianghu", not: [".jh-hall"], why: "八派門內頁要被導回江湖頁" },
        { go: hall("central"), has: [".jh-hall"], why: "中炮門不受影響" }, { go: hall("screen"), has: [".jh-hall"], why: "屏風馬門不受影響" }],
    };
  }
  const me = plays.find((c) => c.code === code);
  if (!me) return null;
  const other = plays.find((c) => c.code !== code);
  const on = [{ go: hall(me.sid), has: [".jh-hall", spot(me.spot)] }];
  const off = [{ go: hall(me.sid), has: [".jh-hall"], not: [spot(me.spot)], why: "門內頁照常、只有這一派的玩法入口不見" }];
  if (other) { on.push({ go: hall(other.sid), has: [spot(other.spot)] }); off.push({ go: hall(other.sid), has: [spot(other.spot)], why: "別派的玩法入口照常" }) }
  return { on, off };
}

/* 一步的結果怎麼判（純函式）。o＝頁面回報 { hash, has: { 選擇器: true/false } } */
function judgeStep(step, o) {
  const miss = [];
  if (!o || typeof o !== "object") return ["沒拿到畫面狀態"];
  if (step.hashIs && o.hash !== step.hashIs) miss.push(`網址要變成 ${step.hashIs}，實際 ${o.hash}`);
  for (const s of step.has || []) if (!(o.has && o.has[s] === true)) miss.push("少了 " + s);
  for (const s of step.not || []) if (!(o.has && o.has[s] === false)) miss.push("還在 " + s);
  return miss;
}

/* 整輪的結束代碼（純函式）：rows＝每段的結果 { code, phase, ok, invalid?, problems[] } */
function verdict(rows, { unknown = [], routeOk = true } = {}) {
  if (!routeOk || unknown.length || !rows.length || rows.some((r) => r.invalid)) return 2;
  return rows.every((r) => r.ok) ? 0 : 1;
}

/* 在頁面上依序開畫面、看選擇器 */
function stepJs(step, waitMs) {
  const sels = [...(step.has || []), ...(step.not || [])];
  return `(async () => { if (document.querySelector(".modal") && typeof closeModal === "function") closeModal();
    location.hash = ${JSON.stringify(step.go)}; await new Promise(r => setTimeout(r, ${waitMs}));
    const has = {}; for (const s of ${JSON.stringify(sels)}) has[s] = Boolean(document.querySelector(s));
    return { hash: location.hash, has }; })()`;
}

async function main() {
  const arg = (k, d = null) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d };
  const O = { apk: arg("--apk"), serial: arg("--serial", "emulator-5580"), out: path.resolve(arg("--out", "flags-check")), wait: Number(arg("--wait", 4000)),
    fgWait: Number(arg("--fg-wait", 65)), only: arg("--only"), allowWipe: process.argv.includes("--allow-wipe-device"),
    codes: arg("--codes", path.join(__dirname, "..", "..", "xiangqi-lab", "tools", "flags-codes.json")) };
  if (!(O.wait > 0) || !(O.fgWait > 60) || O.apk && !fs.existsSync(O.apk)) {
    console.error("用法：node scripts/check-flags.js [--apk <.apk>] [--serial emulator-5580] [--codes flags-codes.json] [--only 代號,…] [--out 資料夾] [--wait 4000] [--fg-wait 65（要大於 60：App 60 秒內不重抓開關）]"); process.exit(2) }
  let table; try { table = JSON.parse(fs.readFileSync(O.codes, "utf8")) } catch (e) { console.error("✘ 讀不到代號表：" + O.codes); process.exit(2) }
  const codes = Array.isArray(table.codes) ? table.codes : [];
  const want = O.only ? O.only.split(",") : codes.map((c) => c.code);
  const unknown = want.filter((c) => !codes.some((x) => x.code === c) || !planFor(c, codes));
  const ADB = process.env.ADB || "adb";
  const adbRaw = (...a) => cp.execFileSync(ADB, ["-s", O.serial, ...a], { timeout: 180000, maxBuffer: 1e8, windowsHide: true });
  const adb = (...a) => adbRaw(...a).toString().trim();
  fs.mkdirSync(O.out, { recursive: true });
  const R = { serial: O.serial, apk: O.apk && path.basename(O.apk), codes: path.basename(O.codes), startedAt: new Date().toISOString(), unknown, rows: [] };
  const save = () => fs.writeFileSync(path.join(O.out, "flags.json"), JSON.stringify(R, null, 1) + "\n");
  if (unknown.length) { R.result = "測不成立"; save(); console.error("✘ 代號表有工具不認得、或判不了的代號：" + unknown.join("、") + "（先在 check-flags.js 的 planFor 補判法）"); process.exit(2) }

  /* 開 App、接上 CDP、開攔截、重新載入一次（冷啟時接上之前發出的請求也重來） */
  const ro = { flags: { v: 1, off: {} } };
  let c = null, log = null;
  const attach = async () => {
    for (let i = 0; i < 60; i++) {
      let x = null;
      try { const pid = adb("shell", "pidof", PKG).split(/\s+/)[0]; if (pid) { adb("forward", "tcp:" + PORT, "localabstract:webview_devtools_remote_" + pid); x = await connect(PORT); if (await x.ev('typeof route==="function"&&Boolean(document.querySelector(".home-page"))')) return x } } catch (e) { }
      if (x) x.close(); await sleep(1000);
    }
    throw new Error("首頁沒有掛載（App 沒起來或卡住）");
  };
  const waitHome = async () => { for (let t = 0; t < 60; t++) { try { if (await c.ev('typeof route==="function"&&Boolean(document.querySelector(".home-page"))')) return true } catch (e) { } await sleep(1000) } return false };
  /* restore：要寫回的 localStorage.xqFlags（字串）。11/28 26112801 實跑發現：am start 到接上攔截之間（--wait 那幾秒），App 已向真網址讀到 main 的開關檔，
     存進 xqFlags 蓋掉上一次的「關」；之後 reload 才讀不到，App 沿用的是剛存的全開 → ④「沿用上一次」誤判失敗。所以接上攔截後、reload 前把上一次的值寫回去。
     beforeRestore 記下寫回前讀到的值，寫進報告當證據 */
  let beforeRestore = null;
  const cold = async (clearSaved, restore) => {
    if (c) { try { c.close() } catch (e) { } }
    adb("shell", "am", "force-stop", PKG); adb("shell", "am", "start", "-n", PKG + "/.MainActivity"); await sleep(4000);
    c = await attach(); log = await routeCdn(c, ro);
    if (clearSaved) await c.ev('localStorage.removeItem("xqFlags")');
    if (typeof restore === "string") { beforeRestore = await c.ev('localStorage.getItem("xqFlags")'); await c.ev(`localStorage.setItem("xqFlags",${JSON.stringify(restore)})`) }
    await c.send("Page.reload", {}); await sleep(2000);
    if (!(await waitHome())) throw new Error("重新載入後首頁 60 秒沒掛好");
    if (!(await waitPreload(c, 180000))) throw new Error("預載頁 3 分鐘還沒收掉");
    await c.ev('(() => { localStorage.setItem("xq_netRoot", JSON.stringify("xq_test")); if (typeof titleClose === "function") titleClose(); if (document.querySelector(".modal") && typeof closeModal === "function") closeModal(); })()');
  };
  /* App 真的拿到開關了沒：xqFlag(code) 等於預期 */
  const flagIs = async (code, on, ms = 20000) => { for (let t = 0; t < ms; t += 500) { try { if (await c.ev(`typeof xqFlag==="function"&&xqFlag(${JSON.stringify(code)})===${on}`)) return true } catch (e) { } await sleep(500) } return false };
  const flagReq = () => (log || []).filter((r) => r.url.startsWith(FLAGS_URL)).length;
  const runSteps = async (code, phase, steps) => {
    const row = { code, phase, ok: true, problems: [], steps: [] };
    for (const [i, s] of steps.entries()) {
      let o = null; try { o = await c.ev(stepJs(s, O.wait)) } catch (e) { o = null; row.problems.push(s.go + "：" + e.message) }
      const miss = judgeStep(s, o);
      const shot = `${code}-${phase}-${i}.png`; try { fs.writeFileSync(path.join(O.out, shot), adbRaw("exec-out", "screencap", "-p")) } catch (e) { }
      row.steps.push({ go: s.go, why: s.why || null, seen: o, miss, screenshot: shot });
      if (miss.length) { row.ok = false; row.problems.push(s.go + "：" + miss.join("、")) }
    }
    return row;
  };

  try {
    R.device = { model: adb("shell", "getprop", "ro.product.model"), android: adb("shell", "getprop", "ro.build.version.release") };
    { const g = checkDevice(adb, O.allowWipe); R.device.emulator = g.emulator; if (!g.ok) throw new Error(g.message) }
    if (O.apk) { try { adb("uninstall", PKG) } catch (e) { } adb("install", "-r", "-d", O.apk) }
    R.installed = (adb("shell", "dumpsys", "package", PKG).match(/^\s*versionName=(\S+)\s*$/m) || [])[1] || null;
    R.player = await setupPlayer({ adb: ADB, serial: O.serial }); save();
    await cold(true);
    R.probeOk = await probeOk(c);
    R.hasFlagFn = await c.ev('typeof xqFlag==="function"');
    if (!R.probeOk || !R.hasFlagFn) { R.result = "測不成立"; save(); console.error(R.probeOk ? "✘ App 沒有 xqFlag（這包沒有 W72 遠端開關）" : "✘ 攔截沒生效（探測檔讀不到）"); process.exit(2) }
    if (!flagReq()) { R.rows.push({ code: "*", phase: "基準", ok: false, problems: ["App 冷啟沒去讀開關檔"] }) }

    for (const code of want) {
      const plan = planFor(code, codes);
      /* ① 基準：全開 */
      ro.flags = { v: 1, off: {} }; await cold(true);
      let row = await runSteps(code, "基準", plan.on);
      if (!row.ok) { row.invalid = true; row.problems.unshift("全開時入口就不在：關掉後不見不能算數") }
      R.rows.push(row); save(); console.log(`[${code}] 基準（全開）${row.ok ? "✔" : "✘ " + row.problems.join("；")}`);
      if (row.invalid) continue;
      /* ② 冷啟關掉 */
      ro.flags = { v: 1, off: { [code]: "W76 驗證" } }; await cold(false);
      const got = await flagIs(code, false);
      row = await runSteps(code, "冷啟關掉", plan.off);
      if (!got) { row.ok = false; row.problems.unshift("冷啟後 xqFlag 還是開著（App 沒套用開關檔）") }
      R.rows.push(row); save(); console.log(`[${code}] 冷啟關掉 ${row.ok ? "✔" : "✘ " + row.problems.join("；")}`);
      /* ③ 回前景關掉：先全開、確認開著，放背景超過 60 秒，改成關、叫回前景 */
      ro.flags = { v: 1, off: {} }; await cold(true);
      const wasOn = await flagIs(code, true);
      adb("shell", "input", "keyevent", "KEYCODE_HOME");
      await sleep(O.fgWait * 1000);
      ro.flags = { v: 1, off: { [code]: "W76 驗證（回前景）" } };
      const before = flagReq();
      adb("shell", "am", "start", "-n", PKG + "/.MainActivity");
      const got2 = await flagIs(code, false, 30000);
      row = await runSteps(code, "回前景關掉", plan.off);
      if (!wasOn) { row.invalid = true; row.ok = false; row.problems.unshift("放背景前開關不是開著：這段不成立") }
      else if (flagReq() <= before) { row.ok = false; row.problems.unshift("回前景沒有重讀開關檔") }
      else if (!got2) { row.ok = false; row.problems.unshift("回前景後 xqFlag 還是開著") }
      R.rows.push(row); save(); console.log(`[${code}] 回前景關掉 ${row.ok ? "✔" : "✘ " + row.problems.join("；")}`);
    }

    /* ④ 讀不到開關檔：拿第一個代號 */
    const k = want[0], plan = planFor(k, codes);
    ro.flags = { v: 1, off: { [k]: "W76 驗證（上一次）" } }; await cold(true);
    const setOff = await flagIs(k, false);
    const saved = setOff ? await c.ev('localStorage.getItem("xqFlags")') : null;
    ro.flags = "fail"; await cold(false, saved || undefined);
    R.staleFlags = { savedOff: saved, readBeforeRestore: beforeRestore };   /* 寫回前讀到的值跟 saved 不同＝App 在接上攔截前已讀到真網址 */
    let row = await runSteps(k, "讀不到・沿用上一次", plan.off);
    if (!setOff || !saved || !String(saved).includes(JSON.stringify(k))) { row.invalid = true; row.ok = false; row.problems.unshift("上一次的「關」沒套上或沒存進 xqFlags：這段不成立") }
    else if (!(await flagIs(k, false, 5000))) { row.ok = false; row.problems.unshift("讀不到時沒沿用上一次的「關」") }
    R.rows.push(row); save(); console.log(`[${k}] 讀不到・沿用上一次 ${row.ok ? "✔" : "✘ " + row.problems.join("；")}`);
    await cold(true);
    row = await runSteps(k, "讀不到・從沒抓到過", plan.on);
    if (!(await flagIs(k, true, 5000))) { row.ok = false; row.problems.unshift("從沒抓到過又讀不到時，應該全開") }
    R.rows.push(row); save(); console.log(`[${k}] 讀不到・從沒抓到過 ${row.ok ? "✔" : "✘ " + row.problems.join("；")}`);
    R.route = summarize(log || [], R.probeOk);
  } catch (e) { R.error = String(e.message || e); R.result = "測不成立"; save(); console.error("✘ " + R.error); process.exit(2) }
  finally { try { c && c.close() } catch (e) { } }

  const code = verdict(R.rows, { unknown, routeOk: R.probeOk });
  R.result = code === 0 ? "通過" : code === 1 ? "不通過" : "測不成立"; R.finishedAt = new Date().toISOString(); save();
  const bad = R.rows.filter((r) => !r.ok).map((r) => `${r.code}／${r.phase}`);
  console.log(code === 0 ? `✔ W76：${want.length} 個開關都關得掉（冷啟、回前景），讀不到時沿用上一次、從沒抓到過就全開`
    : code === 1 ? `✘ W76 不通過：${bad.join("、")}` : `△ W76 測不成立：${bad.join("、")}（看 flags.json）`);
  process.exit(code);
}
module.exports = { planFor, judgeStep, verdict, stepJs };
if (require.main === module) main();
