#!/usr/bin/env node
// 象棋千秋 Android：P0 開跑前的模擬器預檢（W190，2026-11-27）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：0626 那版 Android P0 約 3.6 小時，3D 在 Android 12 跑 4 次有 3 次是模擬器出狀況（socket hang up、CDP 逾時、adb 逾時），
//   都是跑到一半才失敗。check-3d.js 遇到這種情況會判「測試不成立」，但已經白跑了一段。
//   這支在開跑前一次檢查完：模擬器不健康就先擋下（或加 --restart-avd 自動重開再檢查），健康才去跑 P0。
// 只做檢查，不判 P0 過不過：p0-gate.js、check-3d.js 的判斷與「連續 2 輪」規定都不動，這支也不寫任何 P0 報告。
// 檢查依序做，前一項不過就停（後面的檢查靠前面的結果）：
//   adb        adb 能執行
//   online     指定的裝置在線（adb get-state 是 device）
//   shell      15 秒內 shell 回得了 ok（11/23 Android 12 卡死時 get-state 還是 device、之後每一步都逾時，跟 check-3d 的 responsive() 同一個判法）
//   emulator   是模擬器（跟 check-3d 同一支 device-guard.js；--allow-real-device 才准實體手機）；排在 shell 後面，卡死才不會被誤判成實體手機
//   boot       開機完成（sys.boot_completed＝1）
//   webview    系統有可用的 WebView（dumpsys webviewupdate 的 Current WebView package 有名稱和版本；套件被停用就沒有）
//   apk        帶 --aab-apk 時：手機上裝的 App 就是送審 AAB 產生的 APK（跟 check-3d 同一支 apk-bind.js）
//   cdp        啟動 App，經 adb forward 連上 WebView 的 CDP，執行得了 1+1，而且頁面載入完成（有 XQ_BUILD）；帶 --build 時版號要一樣
// 用法：node scripts/emu-ready.js [--serial emulator-5554] [--aab-apk <aab-apk.json>] [--build <YYYYMMDD-HHMM>] [--port 9333]
//         [--restart-avd <AVD 名稱> [--retries 2] [--emulator <emulator 執行檔>]] [--allow-real-device] [--out <預檢結果.json>]
//   --restart-avd：不合格時自動重開這台模擬器再檢查一次（最多 --retries 次）。重開會關掉正在跑的模擬器，
//   照 AGENTS.md「開、關模擬器前先問同機另一位」：跑之前先確認沒有別人在用這台。沒帶就只檢查、不重開。
// 結束代碼：0＝就緒，可以開跑；1＝不就緒（列出是哪一項、為什麼）；2＝用法錯誤
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), os = require("os");
const { checkDevice } = require("./device-guard.js");
const AB = require("./apk-bind.js");

const PKG = "com.raysonchen.xiangqiqianqiu";
/* shell 排在 emulator 前面：模擬器卡死時讀不到 ro.kernel.qemu 等屬性，device-guard.js 會把讀不到當空字串、判成「不是模擬器」，
   變成「重開也不會好」而不重開（11/27 在 emulator-5580 用 emu avd pause 實測發現）。先確認 shell 回得了，再判是不是模擬器 */
const STEPS = ["adb", "online", "shell", "emulator", "boot", "webview", "apk", "cdp"];

/* 純函式：把每一項的結果整理成結論。results＝[{ step, ok, msg }]，照 STEPS 的順序、遇到不過的就停 */
function verdict(results) {
  const fail = results.find((r) => !r.ok);
  return { ready: !fail && results.length > 0, failed: fail ? fail.step : null, why: fail ? fail.msg : "", retryable: fail ? fail.retryable !== false : false };
}
/* 錯誤訊息取最後一個有字的行（adb 的 stderr 常常最後是空行） */
const lastLine = (s) => String(s || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean).pop() || "";

/* 一輪檢查。env 可以替換（自我測試用假的）：
   env.adb(args, timeoutMs)  → 回傳 stdout 字串；失敗丟例外（e.timedOut＝true 表示逾時）
   env.cdpProbe(port, build) → Promise<{ ok, msg }>：連上 WebView、執行 1+1、讀版號
   env.appStart()            → 啟動 App 並 adb forward 好 port；回傳 { ok, msg }
   env.bindApk(file)         → { ok, msg }：手機上的 APK 是不是 aab-apk.json 記的那一個 */
async function checkOnce(opt, env) {
  const out = [];
  /* retryable＝false：重開模擬器也不會好（adb 不能用、不是模擬器、裝錯 APK、版號不對），不重開、直接判不就緒 */
  const add = (step, ok, msg, retryable) => { out.push({ step, ok, msg: msg || "", ...(ok || retryable !== false ? {} : { retryable: false }) }); return ok };
  const run = (args, ms) => { try { return { ok: true, s: String(env.adb(args, ms)).trim() } } catch (e) { return { ok: false, s: String((e && (e.stderr || e.message)) || e), timedOut: !!(e && e.timedOut) } } };

  const v = run(["version"], 15000);
  if (!add("adb", v.ok && /Android Debug Bridge/i.test(v.s), v.ok ? (/Android Debug Bridge/i.test(v.s) ? "" : "adb version 的輸出看不懂：" + v.s.slice(0, 80)) : "adb 不能執行（環境變數 ADB 或 PATH）：" + lastLine(v.s).slice(0, 120), false)) return out;
  const st = run(["-s", opt.serial, "get-state"], 15000);
  if (!add("online", st.ok && st.s === "device", st.ok ? (st.s === "device" ? "" : opt.serial + " 的狀態是「" + st.s + "」，不是 device") : opt.serial + " 不在線（模擬器當掉、adb 斷線或還沒開）：" + lastLine(st.s).slice(0, 120))) return out;
  const sh = run(["-s", opt.serial, "shell", "echo", "ok"], 15000);
  if (!add("shell", sh.ok && sh.s === "ok", sh.ok ? (sh.s === "ok" ? "" : "shell 回的不是 ok：" + sh.s.slice(0, 80)) : (sh.timedOut ? "15 秒內 shell 沒回應（模擬器卡死）" : "shell 失敗：" + lastLine(sh.s).slice(0, 120)))) return out;
  const g = checkDevice((...a) => { const r = run(["-s", opt.serial, ...a], 15000); if (!r.ok) throw new Error(r.s); return r.s }, opt.allowReal);
  if (!add("emulator", g.ok, g.message, false)) return out;
  const bt = run(["-s", opt.serial, "shell", "getprop", "sys.boot_completed"], 15000);
  if (!add("boot", bt.ok && bt.s === "1", bt.ok ? (bt.s === "1" ? "" : "還沒開機完成（sys.boot_completed＝「" + bt.s + "」）") : "讀不到開機狀態：" + bt.s.slice(0, 120))) return out;
  /* 看系統實際在用的 WebView（dumpsys webviewupdate 的 Current WebView package），不只看套件裝了沒：套件被停用時版本照樣讀得到 */
  const wv = run(["-s", opt.serial, "shell", "dumpsys", "webviewupdate"], 30000);
  const wm = wv.ok ? /Current WebView package \(name, version\): \(([^,()\s]+), ([^()\s]*\d[^()\s]*)\)/.exec(wv.s) : null;
  if (!wm) {
    /* 沒有可用的 WebView 時再看是不是被停用了（pm disable-user）：停用的重開模擬器也不會好（#245 驗收建議，Windows Claude 1 在 Android 12 實測） */
    const pk = wv.ok ? run(["-s", opt.serial, "shell", "dumpsys", "package", "com.google.android.webview"], 30000) : null;
    const disabled = !!(pk && pk.ok && /\benabled=[23]\b/.test(pk.s));
    add("webview", false, disabled ? "WebView 被停用了：先用 adb shell pm enable com.google.android.webview 打開（重開模擬器也不會好）" :
      (wv.ok ? "系統沒有可用的 WebView（dumpsys webviewupdate 沒有 Current WebView package）" : "讀不到 WebView：" + lastLine(wv.s).slice(0, 120)), disabled ? false : undefined);
    return out;
  }
  add("webview", true, "WebView " + wm[1] + " " + wm[2]);
  if (opt.aabApk) {
    const b = env.bindApk(opt.aabApk);
    if (!add("apk", b.ok, b.msg, b.retryable)) return out;
  } else add("apk", true, "沒帶 --aab-apk：不核對手機上的 APK 是不是送審 AAB 產生的（正式跑 P0 前請帶）");
  const s = await env.appStart();
  if (!s.ok) { add("cdp", false, s.msg); return out }
  const c = await env.cdpProbe(opt.port, opt.build);
  add("cdp", c.ok, c.msg, c.retryable);
  return out;
}

/* 檢查；不合格而且給了 restart（重開模擬器），就重開再檢查，最多 retries 次。回傳 { ready, rounds:[{results, verdict}], restarted } */
async function checkReady(opt, env) {
  const rounds = []; let restarted = 0;
  for (let i = 0; ; i++) {
    const results = await checkOnce(opt, env), vd = verdict(results);
    rounds.push({ results, verdict: vd });
    if (vd.ready || !vd.retryable || !env.restart || i >= opt.retries) return { ready: vd.ready, rounds, restarted };
    const r = await env.restart(vd);
    restarted++;
    if (!r.ok) { rounds.push({ results: [{ step: "restart", ok: false, msg: r.msg }], verdict: { ready: false, failed: "restart", why: r.msg } }); return { ready: false, rounds, restarted } }
  }
}

/* ---------- 命令列 ---------- */
function parseArgs(argv) {
  const VAL = ["--serial", "--aab-apk", "--build", "--port", "--restart-avd", "--retries", "--emulator", "--out"], FLAG = ["--allow-real-device"];
  const o = { serial: process.env.ANDROID_SERIAL || "emulator-5554", aabApk: null, build: null, port: 9333, avd: null, retries: 2, emulator: null, allowReal: false, out: null };
  const given = new Set();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (FLAG.includes(a)) { o.allowReal = true; continue }
    if (!VAL.includes(a)) return { err: "不認得的參數：" + a };
    const v = argv[++i];
    if (v === undefined || v.startsWith("--")) return { err: a + " 後面要給值" };
    given.add(a);
    if (a === "--serial") o.serial = v; else if (a === "--aab-apk") o.aabApk = v; else if (a === "--build") o.build = v;
    else if (a === "--port") o.port = Number(v); else if (a === "--restart-avd") o.avd = v; else if (a === "--retries") o.retries = Number(v);
    else if (a === "--emulator") o.emulator = v; else if (a === "--out") o.out = v;
  }
  if (!Number.isInteger(o.port) || o.port < 1024 || o.port > 65535) return { err: "--port 要是 1024～65535 的整數" };
  if (!Number.isInteger(o.retries) || o.retries < 0 || o.retries > 5) return { err: "--retries 要是 0～5 的整數" };
  if (o.build && !/^\d{8}-\d{4}$/.test(o.build)) return { err: "--build 要是 YYYYMMDD-HHMM" };
  if ((given.has("--retries") || given.has("--emulator")) && !o.avd) return { err: "--retries、--emulator 要搭配 --restart-avd" };
  if (o.avd && !/^emulator-\d+$/.test(o.serial)) return { err: "--restart-avd 只能用在模擬器（--serial 要是 emulator-<埠號>）" };
  return { opt: o };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ADB = process.env.ADB || "adb";
function realAdb(args, ms) {
  try { return cp.execFileSync(ADB, args, { encoding: "utf8", timeout: ms, maxBuffer: 30e6, stdio: ["ignore", "pipe", "pipe"] }) }
  catch (e) { if (e && (e.code === "ETIMEDOUT" || e.signal === "SIGTERM")) e.timedOut = true; throw e }
}

function realEnv(opt) {
  const sadb = (args, ms = 120000) => realAdb(["-s", opt.serial, ...args], ms);
  return {
    adb: realAdb,
    bindApk: (file) => {
      const rb = AB.readBind(file); if (!rb.ok) return { ...rb, retryable: false };
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xq-emu-ready-"));
      try {
        const ia = AB.installedApkSha((args) => sadb(args, 300000), PKG, tmp); if (!ia.ok) return { ...ia, retryable: false };
        const bd = AB.bind(rb.rec, ia.sha, "手機上實際安裝的 APK"); return bd.ok ? { ok: true, msg: "手機上的 App 就是送審 AAB（" + rb.rec.aabSha256.slice(0, 12) + "）產生的 APK" } : { ...bd, retryable: false };
      } catch (e) { return { ok: false, msg: "拉不回手機上的 APK：" + lastLine(e.message || e).slice(0, 120) } }
      finally { fs.rmSync(tmp, { recursive: true, force: true }) }
    },
    appStart: async () => {
      try {
        sadb(["shell", "am", "force-stop", PKG], 30000); await sleep(800);
        sadb(["shell", "am", "start", "-n", PKG + "/.MainActivity"], 30000);
        let pid = "";
        for (let i = 0; i < 30 && !pid; i++) { await sleep(500); try { pid = sadb(["shell", "pidof", PKG], 15000).trim().split(" ")[0] } catch (e) { } }
        if (!pid) return { ok: false, msg: "App 開不起來（15 秒內沒有程序）" };
        sadb(["forward", "tcp:" + opt.port, "localabstract:webview_devtools_remote_" + pid], 15000);
        return { ok: true, msg: "" };
      } catch (e) { return { ok: false, msg: "啟動 App 或 adb forward 失敗：" + lastLine(e.message || e).slice(0, 120) } }
    },
    cdpProbe: async (port, build) => {
      const { connect } = require("./cdp.js");
      let last = "";
      for (let i = 0; i < 40; i++) {   /* 最多約 60 秒：WebView 起來要一點時間 */
        let c;
        try {
          c = await Promise.race([connect(port), sleep(10000).then(() => { throw new Error("CDP 連線 10 秒沒回應") })]);
          const two = await c.ev("1+1");
          if (two !== 2) { last = "CDP 執行 1+1 回的是 " + JSON.stringify(two); continue }
          const b = await c.ev(`typeof XQ_BUILD==="string"&&typeof store!=="undefined"?XQ_BUILD:""`);
          if (!b) { last = "頁面還沒載入完成（沒有 XQ_BUILD）"; continue }
          if (build && b !== build) return { ok: false, retryable: false, msg: "App 版號是 " + b + "，不是要驗的 " + build + "（裝錯 APK，重開模擬器也不會好）" };
          return { ok: true, msg: "CDP 就緒，App 版號 " + b };
        } catch (e) { last = String(e.message || e).slice(0, 120) }
        finally { try { c && c.close() } catch (e) { } await sleep(1500) }
      }
      return { ok: false, msg: "CDP 約 60 秒內沒就緒：" + last };
    },
    restart: opt.avd ? makeRestart(opt, realRestartDeps()) : null,
  };
}

/* 重開模擬器。d 可以替換（自我測試用假的）：
   d.exists(file)、d.listAvds(exe)→[名稱]、d.adb(args, ms)、d.spawn(exe, args)→{ error, exited(), tail() }、d.sleep(ms)、d.log(s)、d.emuDefault
   先確認開得回來（執行檔在、AVD 在清單上）才關舊的：11/27 實測時 AVD 不在預設位置、--emulator 給了 Git Bash 路徑，
   舊版先關掉才發現開不回來，模擬器整台沒了 */
function makeRestart(opt, d) {
  return async () => {
    const port = opt.serial.replace(/^emulator-/, ""), exe = opt.emulator || d.emuDefault;
    if (!exe || !d.exists(exe)) return { ok: false, msg: "找不到 emulator 執行檔「" + (exe || "") + "」（設 ANDROID_HOME，或加 --emulator；Windows 要用 C:\\ 開頭的路徑）。沒有關掉模擬器" };
    let avds;
    try { avds = d.listAvds(exe) } catch (e) { return { ok: false, msg: "列不出 AVD：" + lastLine(e.message || e).slice(0, 120) + "。沒有關掉模擬器" } }
    if (!avds.includes(opt.avd)) return { ok: false, msg: "找不到 AVD「" + opt.avd + "」（列得到的：" + (avds.join("、") || "沒有") + "；AVD 不在預設位置時要設 ANDROID_AVD_HOME）。沒有關掉模擬器" };
    d.log("↻ 重開模擬器 " + opt.avd + "（" + opt.serial + "）");
    try { d.adb(["-s", opt.serial, "emu", "kill"], 30000) } catch (e) { }
    for (let i = 0; i < 30; i++) { await d.sleep(1000); try { if (String(d.adb(["-s", opt.serial, "get-state"], 5000)).trim() !== "device") break } catch (e) { break } }
    const child = d.spawn(exe, ["-avd", opt.avd, "-port", port, "-no-snapshot-load"]);
    if (child.error) return { ok: false, msg: "開不了模擬器（" + exe + "）：" + child.error };
    for (let i = 0; i < 150; i++) {   /* 最多 5 分鐘等開機 */
      await d.sleep(2000);
      if (child.exited()) return { ok: false, msg: "模擬器一啟動就結束了：" + (child.tail() || "（沒有輸出）") };
      try { if (String(d.adb(["-s", opt.serial, "shell", "getprop", "sys.boot_completed"], 10000)).trim() === "1") { await d.sleep(5000); return { ok: true, msg: "" } } } catch (e) { }
    }
    return { ok: false, msg: "重開後 5 分鐘內沒開機完成" + (child.tail() ? "；模擬器最後輸出：" + child.tail() : "") };
  };
}

function realRestartDeps() {
  const home = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || "";
  return {
    emuDefault: home ? path.join(home, "emulator", process.platform === "win32" ? "emulator.exe" : "emulator") : "",
    exists: (f) => { try { return fs.statSync(f).isFile() } catch (e) { return false } },
    listAvds: (exe) => String(cp.execFileSync(exe, ["-list-avds"], { encoding: "utf8", timeout: 30000 })).split(/\r?\n/).map((s) => s.trim()).filter((s) => s && !/^(INFO|WARNING|ERROR)\b/.test(s)),
    adb: realAdb, sleep, log: (s) => console.log(s),
    spawn: (exe, args) => {
      const logf = path.join(os.tmpdir(), "xq-emu-ready-emulator-" + process.pid + ".log");
      let exited = false, error = "";
      try {
        const fd = fs.openSync(logf, "w");
        const ch = cp.spawn(exe, args, { detached: true, stdio: ["ignore", fd, fd] });
        ch.on("error", (e) => { error = e.message; exited = true }); ch.on("exit", () => { exited = true });
        ch.unref(); fs.closeSync(fd);
      } catch (e) { return { error: e.message, exited: () => true, tail: () => "" } }
      const tail = () => { try { return fs.readFileSync(logf, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(-3).join(" ／ ").slice(0, 300) } catch (e) { return "" } };
      return { get error() { return error }, exited: () => exited, tail };
    },
  };
}

function report(R, opt) {
  for (const [i, rd] of R.rounds.entries()) {
    if (R.rounds.length > 1) console.log("── 第 " + (i + 1) + " 次檢查");
    for (const r of rd.results) console.log((r.ok ? "✔ " : "✘ ") + r.step + (r.msg ? "：" + r.msg : ""));
  }
  const last = R.rounds[R.rounds.length - 1].verdict;
  console.log(R.ready ? "✔ 模擬器就緒，可以開跑 P0" + (R.restarted ? "（重開過 " + R.restarted + " 次）" : "") : "✘ 模擬器不就緒：卡在 " + last.failed + "（" + last.why + "）" +
    (last.failed === "restart" ? "；自動重開沒成功，請手動處理模擬器" : !last.retryable ? "；這種情況重開模擬器也不會好，要先修好再跑" : opt.avd ? "" : "；要自動重開請加 --restart-avd <AVD 名稱>（先確認沒有別人在用這台）"));
}

if (require.main === module) {
  const p = parseArgs(process.argv.slice(2));
  if (p.err) { console.error("✘ " + p.err); process.exit(2) }
  const opt = p.opt;
  checkReady(opt, realEnv(opt)).then((R) => {
    report(R, opt);
    if (opt.out) { fs.mkdirSync(path.dirname(path.resolve(opt.out)), { recursive: true }); fs.writeFileSync(opt.out, JSON.stringify({ tool: "emu-ready", at: new Date().toISOString(), serial: opt.serial, build: opt.build, ...R }, null, 2)) }
    process.exit(R.ready ? 0 : 1);
  }).catch((e) => { console.error("✘ 預檢本身出錯：" + (e && e.stack || e)); process.exit(1) });
}

module.exports = { STEPS, verdict, checkOnce, checkReady, parseArgs, makeRestart };
