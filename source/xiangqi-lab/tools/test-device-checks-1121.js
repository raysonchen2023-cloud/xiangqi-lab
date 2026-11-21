// W41②③（11/21）：送審前的升級測試 check-upgrade.js 與 44 畫面破圖掃描 check-scenes.js 的判斷規則
//   這兩支要開模擬器才跑得完；這裡只驗「怎麼判」：不開模擬器、不連網、不裝 App。
//   P0-UPD（一直跳出更新）：舊網頁快取接管新 APK → 升級後每一項都要判得出來，缺原生修正的舊版也要判紅。
//   P0-IMG（大破圖）：連線時讀取失敗算紅燈；離線只算看得到的破圖，沒下載過的檔讀不到算提醒（開發者 11/21 決定）。
//   測不成立（參數錯、找不到裝置）一律結束代碼 2，不能被當成通過。
// 用法：node --test xiangqi-lab/tools/test-device-checks-1121.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const AND = path.join(__dirname, "..", "..", "xiangqi-android", "scripts");
const UP = path.join(AND, "check-upgrade.js"), SC = path.join(AND, "check-scenes.js"), PS = path.join(AND, "player-state.js");
const { verdict, mergeWatch, PROBE, DIALOG_WATCH_SEC } = require(UP);
const { judge, finalCode, noStatusOf, ROUTES, COLLECT } = require(SC);
const { isEmulatorProps, checkDevice } = require(path.join(AND, "device-guard.js"));
const { PRELOAD_BUSY } = require(PS);
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });

const GOOD = { build: "20261121-0643", raw: "kept", setting: "kept", regs: 0, controller: false, oldKeys: [], webUpdate: false, notify: "undefined", dialogs: 0, manual: "新版由 Google Play 更新" };

test("升級測試：升級後一切正常 → 沒有任何一項不符", () => {
  assert.deepEqual(verdict(GOOD, "20261121-0643"), []);
});

test("升級測試：W01 的狀態（舊 Worker 還接管、舊快取沒清、網頁更新檢查還開著）每一項都列得出來", () => {
  const bad = verdict({ build: "20261118-1740", raw: null, setting: null, regs: 1, controller: true, oldKeys: ["xqlab-app-20261118-1740"], webUpdate: true, notify: "function", dialogs: 1, manual: "✓ 已是最新版" }, "20261121-0643");
  assert.equal(bad.length, 9);
  for (const re of [/載入版號 20261118-1740，應為 20261121-0643/, /存檔或設定沒有保留/, /還有 1 個 Service Worker/, /仍被 Service Worker 接管/, /舊程式快取沒清：xqlab-app-20261118-1740/, /網頁更新檢查還開著/, /網頁新版通知還掛著/, /1 個更新提示視窗/, /沒說由 Google Play 更新/])
    assert.ok(bad.some((b) => re.test(b)), re + "\n" + bad.join("\n"));
});

test("升級測試：單一項不符就要抓到（例如只剩一個舊快取）", () => {
  assert.deepEqual(verdict({ ...GOOD, oldKeys: ["xqlab-app-x"] }, "20261121-0643"), ["舊程式快取沒清：xqlab-app-x"]);
  assert.equal(verdict({ ...GOOD, dialogs: 2 }, "20261121-0643").length, 1);
});

test("〔原始碼〕升級測試：舊版沒有原生修正的函式時要當成「沒關掉」，不能因為函式不存在就跳過", () => {
  assert.match(PROBE, /typeof xqWebUpdateOn==='function'\?xqWebUpdateOn\(\):true/);
  assert.match(PROBE, /typeof updCheck==='function'/);
});

test("破圖掃描：連線時看得到的破圖、背景圖解不開、讀取失敗、畫面錯誤都算紅燈", () => {
  assert.deepEqual(judge({ broken: ["data/a.webp"] }, "online"), { bad: 1, warn: 0 });
  assert.deepEqual(judge({ bgBroken: ["data/b.webp"] }, "online"), { bad: 1, warn: 0 });
  assert.deepEqual(judge({ failed: ["data/c.json（HTTP 404）"] }, "online"), { bad: 1, warn: 0 });
  assert.deepEqual(judge({ error: "CDP 逾時" }, "online"), { bad: 1, warn: 0 });
  assert.deepEqual(judge({}, "online"), { bad: 0, warn: 0 });
});

test("破圖掃描：離線只算看得到的破圖；沒下載過的檔讀不到算提醒（開發者 11/21）", () => {
  assert.deepEqual(judge({ failed: ["data/bgm/yuan/x.mp3（HTTP 404）", "data/hubmap/y.webp（HTTP 404）"] }, "offline"), { bad: 0, warn: 2 });
  assert.deepEqual(judge({ broken: ["data/a.webp"], failed: ["z"] }, "offline"), { bad: 1, warn: 1 });
  assert.deepEqual(judge({ error: "首頁沒有掛載" }, "offline"), { bad: 1, warn: 0 });
});

test("破圖掃描：預設掃 44 個畫面，包含首頁、雲河星槎、十州棋館、對局與設定", () => {
  assert.equal(ROUTES.length, 44);
  for (const r of ["home", "ship", "jianghu", "cpu", "settings", "lobby"]) assert.ok(ROUTES.includes(r), r);
});

test("〔原始碼〕封測玩家狀態：等預載頁收掉的判斷看的是畫面上的「正在準備棋盤」", () => {
  assert.match(PRELOAD_BUSY, /正在準備棋盤/);
});

test("PR #12 審查：只准在模擬器上跑——實體手機會被解除安裝、刪掉存檔，要加 --allow-wipe-device 才放行並警告", () => {
  assert.equal(isEmulatorProps({ "ro.kernel.qemu": "1" }), true);
  assert.equal(isEmulatorProps({ "ro.boot.qemu": "1" }), true);
  assert.equal(isEmulatorProps({ "ro.hardware": "ranchu" }), true);
  assert.equal(isEmulatorProps({ "ro.kernel.qemu": "", "ro.boot.qemu": "", "ro.hardware": "qcom" }), false);
  const phone = (...a) => (a[2] === "ro.hardware" ? "qcom" : "");
  const no = checkDevice(phone, false);
  assert.equal(no.ok, false); assert.match(no.message, /不是模擬器.*--allow-wipe-device/);
  const yes = checkDevice(phone, true);
  assert.equal(yes.ok, true); assert.match(yes.message, /⚠ 警告：這是實體手機/);
  const emu = checkDevice((...a) => (a[2] === "ro.kernel.qemu" ? "1" : ""), false);
  assert.deepEqual(emu, { ok: true, emulator: true, message: "" });
});

test("PR #12 審查：更新視窗要等大廳送 version 才跳，冷啟後至少看 15 秒", () => {
  assert.ok(DIALOG_WATCH_SEC >= 15, String(DIALOG_WATCH_SEC));
});

test("PR #12 再審：冷啟後 20 秒內跳出過、後來被關掉的更新視窗也要判紅", () => {
  const atEnd = { ...GOOD, dialogs: 0 };   /* 最後那次檢查時視窗已經不在 */
  const merged = mergeWatch(atEnd, 1);
  assert.equal(merged.dialogs, 1);
  assert.deepEqual(verdict(merged, "20261121-0643"), ["畫面上有 1 個更新提示視窗"]);
  assert.deepEqual(verdict(mergeWatch(atEnd, 0), "20261121-0643"), []);
  assert.equal(mergeWatch({ ...GOOD, dialogs: 2 }, 1).dialogs, 2, "取較大的，不能被觀察期的較小值蓋掉");
});

test("PR #12 再審：拿不到讀取狀態碼又沒有紅燈 → 結束代碼 2（測不成立）；有紅燈照樣 1；都正常 0", () => {
  assert.equal(finalCode({ bad: 0, noStatus: true }), 2);
  assert.equal(finalCode({ bad: 3, noStatus: true }), 1);
  assert.equal(finalCode({ bad: 2, noStatus: false }), 1);
  assert.equal(finalCode({ bad: 0, noStatus: false }), 0);
  /* 從掃描結果算出 noStatus：只看連線那一輪 */
  assert.equal(noStatusOf([{ mode: "online", statusOk: false }, { mode: "offline", statusOk: true }]), true);
  assert.equal(noStatusOf([{ mode: "online", statusOk: true }, { mode: "offline", statusOk: false }]), false);
  assert.equal(finalCode({ bad: 0, noStatus: noStatusOf([{ mode: "online", statusOk: false }]) }), 2);
});

test("〔原始碼〕PR #12 審查：掃描會回報 WebView 能不能給讀取狀態碼（舊 WebView 拿不到時整輪當測不成立）", () => {
  assert.match(COLLECT, /"responseStatus" in PerformanceResourceTiming\.prototype/);
});

test("測不成立就回 2：沒帶參數、模式寫錯、找不到裝置都不能被當成通過", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-devchk-")); made.push(d);
  const apk = path.join(d, "fake.apk"); fs.writeFileSync(apk, "x");
  const run = (file, args, env) => cp.spawnSync(process.execPath, [file, ...args], { encoding: "utf8", env: { ...process.env, ...env }, timeout: 30000 });
  const a = run(UP, []);
  assert.equal(a.status, 2, a.stdout + a.stderr); assert.match(a.stderr, /用法/);
  const b = run(UP, ["--old", apk, "--old-build", "1", "--new", apk, "--new-build", "2", "--serial", "emulator-9", "--out", path.join(d, "up")], { ADB: path.join(d, "沒有這支-adb") });
  assert.equal(b.status, 2, b.stdout + b.stderr); assert.match(b.stderr, /找不到裝置/);
  const c = run(SC, ["--mode", "sideways"]);
  assert.equal(c.status, 2, c.stdout + c.stderr); assert.match(c.stderr, /用法/);
  const e = run(SC, ["--serial", "emulator-9", "--out", path.join(d, "sc"), "--fresh"], { ADB: path.join(d, "沒有這支-adb") });
  assert.equal(e.status, 2, e.stdout + e.stderr);
});
