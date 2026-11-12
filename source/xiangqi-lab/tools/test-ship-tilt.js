// 評比第 14 輪 X2：雲河星槎「傾斜手機看景深」不能一進來就跳「想要取用動作和方向」（開發者 11/13 iPhone 旁白錄影第 5 段）。
// 不開瀏覽器：用 vm 載入 xiangqi-db/m/07f-ship.js 裡陀螺儀那一段（shpGyroOn～shpGyroTry），假 window／document／store／時鐘。
//   ① iOS（DeviceOrientationEvent.requestPermission 存在）：進頁面不聽 deviceorientation、不問權限，就算上次開過也一樣。
//   ② 只有自己按「🌀 立體」才會問；按了先跳說明卡（念「接下來手機會詢問…」），按「繼續」才呼叫 requestPermission；換頁那一下的穿透點擊不算。
//   ③ 螢幕報讀模式預設沒有「🌀 立體」、減少動態一律沒有；設定開關 shpTiltSw 可以自己決定。
//   ④ Android（不用授權）照舊：上次開過就先靜靜聽，有資料才開。
// 用法：node --test xiangqi-lab/tools/test-ship-tilt.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07f-ship.js"), "utf8");
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, a); const j = s.indexOf(b, i); assert.ok(j > i, b); return s.slice(i, j) };
const GYRO = cut(SRC, "function shpGyroOn(e){", "\n\n/* 意見回饋 726");

function el(tag) {
  const e = { tagName: tag, attrs: {}, cls: new Set(), children: [], isConnected: true, style: {}, onclick: null,
    setAttribute(k, v) { this.attrs[k] = String(v) }, getAttribute(k) { return k in this.attrs ? this.attrs[k] : null },
    remove() { this.isConnected = false; if (this.parent) this.parent.children = this.parent.children.filter(x => x !== this) },
    appendChild(c) { c.parent = this; this.children.push(c); return c },
    querySelector(q) { return q === ".shp-gy" ? this.children.find(c => c.cls.has("shp-gy") && c.isConnected) || null : null } };
  Object.defineProperty(e, "className", { get() { return [...e.cls].join(" ") }, set(v) { e.cls = new Set(String(v).split(/\s+/).filter(Boolean)) } });
  e.classList = { toggle: (c, on) => { if (on) e.cls.add(c); else e.cls.delete(c) }, contains: c => e.cls.has(c), add: c => e.cls.add(c) };
  return e;
}
/* 一支手機：ios＝有 requestPermission；perm＝requestPermission 回什麼；o.mem 預先放的 store */
function phone(o) {
  o = o || {}; const mem = Object.assign({}, o.mem || {}), win = {}, docL = {}, timers = [], made = [], log = { modal: [], toast: [], perm: 0 };
  let now = 1e6;
  const DOE = function () { };
  if (o.ios) DOE.requestPermission = () => { log.perm++; return o.permThrow ? (() => { throw new Error("NotAllowedError") })() : Promise.resolve(o.perm || "granted") };
  const document = {
    createElement: t => { const e = el(t); made.push(e); return e },
    querySelectorAll: q => q === ".shp-gy" ? made.filter(e => e.cls.has("shp-gy") && e.isConnected) : [],
    addEventListener: (t, f) => { (docL[t] = docL[t] || []).push(f) },
  };
  const ctx = {
    console, Promise, Math, JSON, Set, Map, Object, Array, String, Number,
    Date: { now: () => now },
    DeviceOrientationEvent: o.noDoe ? undefined : DOE,
    matchMedia: q => ({ matches: /coarse/.test(q) ? o.coarse !== false : /reduced-motion/.test(q) ? !!o.rm : false }),
    store: { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v } },
    toast: t => log.toast.push(t), vibrate: () => { }, esc: s => String(s),
    modal: (html, btns) => { log.modal.push({ html, btns }); return {} },
    addEventListener: (t, f) => { (win[t] = win[t] || []).push(f) },
    removeEventListener: (t, f) => { win[t] = (win[t] || []).filter(x => x !== f) },
    setTimeout: (f, ms) => { timers.push(f); return timers.length }, clearTimeout: id => { timers[id - 1] = null },
    document, shpPxRun: () => { },
  };
  if (o.axm != null) ctx.axmOn = () => !!o.axm;
  ctx.window = ctx; if (o.noDoe) delete ctx.DeviceOrientationEvent;
  vm.createContext(ctx);
  vm.runInContext("const SPX={el:null,ls:[],hl:null,tx:0,ty:0,cx:0,cy:0,k:.06,drag:null,gyro:false,g0:null};\n" + GYRO + "\n;this.X={SPX,shpGyroBtn,shpGyroSet,shpTiltOk,shpTiltPref,shpTiltRow,shpGyroAsk}", ctx, { filename: "07f-ship.js（陀螺儀段）" });
  const M = el("div"); ctx.X.SPX.el = M;
  return { X: ctx.X, ctx, mem, win, docL, log, M, made, timers,
    tilt: (beta = 10, gamma = 5) => (win.deviceorientation || []).slice().forEach(f => f({ beta, gamma })),
    later: ms => { now += ms }, fire: () => { const t = timers.splice(0); t.forEach(f => f && f()) },
    btn: () => M.children.find(c => c.cls.has("shp-gy") && c.isConnected) || null,
    click: (b, trusted = true) => b.onclick({ stopPropagation() { }, isTrusted: trusted }),
    change: (id, checked) => (docL.change || []).forEach(f => f({ target: { id, checked } })) };
}
const tick = () => new Promise(r => setImmediate(r));
const listening = P => (P.win.deviceorientation || []).length;

test("iOS：上次開過「🌀 立體」，再進星槎也不聽 deviceorientation、不問權限、不跳說明卡（原本會被當成要權限）", async () => {
  const P = phone({ ios: true, mem: { shpGyro: 1 } });
  P.X.shpGyroBtn(P.M); await tick();
  assert.ok(P.btn(), "按鈕還在，可以自己按"); assert.equal(listening(P), 0, "沒有偷聽"); assert.equal(P.log.perm, 0); assert.equal(P.log.modal.length, 0);
  assert.equal(P.X.SPX.gyro, false); assert.equal(P.btn().getAttribute("aria-pressed"), "false"); assert.equal(P.btn().getAttribute("aria-label"), "傾斜手機看景深");
});

test("iOS：換頁那一下的穿透點擊（0.7 秒內）、程式假點（isTrusted false）都不理；真的按了先跳說明卡，按「繼續」才問", async () => {
  const P = phone({ ios: true }); P.X.shpGyroBtn(P.M); const b = P.btn();
  P.click(b); assert.equal(P.log.modal.length, 0, "0.7 秒內不理");
  P.later(800); P.click(b, false); assert.equal(P.log.modal.length, 0, "isTrusted false 不理");
  P.click(b); assert.equal(P.log.modal.length, 1); assert.equal(P.log.perm, 0, "說明卡還沒按，不能先問");
  const m = P.log.modal[0]; assert.match(m.html, /接下來手機會詢問是否允許讀取「動作與方向」/); assert.match(m.html, /用手指在圖上拖動一樣看得到/);
  assert.deepEqual(JSON.parse(JSON.stringify(m.btns.map(x => x[0]))), ["繼續", "先不要"]); assert.equal(m.btns[1][1], null, "先不要＝什麼都不做");
  m.btns[0][1](); assert.equal(P.log.perm, 1, "按「繼續」當下就問（同一個使用者手勢裡）");
  await tick(); await tick(); assert.equal(listening(P), 1, "允許了才開始聽");
  P.tilt(); await tick(); assert.equal(P.X.SPX.gyro, true); assert.equal(P.mem.shpGyro, 1); assert.equal(b.getAttribute("aria-pressed"), "true");
  P.click(b); assert.equal(P.X.SPX.gyro, false, "再按一下關掉"); assert.equal(listening(P), 0);
  P.click(b); assert.equal(P.log.modal.length, 1, "同一次開啟允許過，不再跳說明卡"); assert.equal(P.log.perm, 1);
  await tick(); P.tilt(); await tick(); assert.equal(P.X.SPX.gyro, true);
});

test("iOS：不允許、或 requestPermission 丟錯 → 提示用手指拖動，不留監聽", async () => {
  for (const o of [{ perm: "denied" }, { permThrow: true }]) {
    const P = phone(Object.assign({ ios: true }, o)); P.X.shpGyroBtn(P.M); P.later(800); P.click(P.btn()); P.log.modal[0].btns[0][1]();
    await tick(); await tick(); assert.equal(listening(P), 0); assert.equal(P.X.SPX.gyro, false); assert.match(P.log.toast.join(), /用手指在圖上拖動/);
  }
});

test("螢幕報讀模式預設沒有「🌀 立體」；設定開關自己打開就有；減少動態一律沒有", () => {
  let P = phone({ ios: true, axm: true }); P.X.shpGyroBtn(P.M); assert.equal(P.btn(), null, "螢幕報讀模式預設不出現");
  P = phone({ ios: true, mem: { axMode: true } }); P.X.shpGyroBtn(P.M); assert.equal(P.btn(), null, "沒有 axmOn 時看 store axMode");
  P = phone({ ios: true, axm: true, mem: { shpTilt: 1 } }); P.X.shpGyroBtn(P.M); assert.ok(P.btn(), "自己在設定打開就出現");
  P = phone({ ios: true, rm: true, mem: { shpTilt: 1 } }); P.X.shpGyroBtn(P.M); assert.equal(P.btn(), null, "減少動態一律不出現");
  P = phone({ ios: true, mem: { shpTilt: 0 } }); P.X.shpGyroBtn(P.M); assert.equal(P.btn(), null, "設定關掉不出現");
  P = phone({ ios: true, coarse: false }); P.X.shpGyroBtn(P.M); assert.equal(P.btn(), null, "電腦（沒有觸控）照舊不出現");
  P = phone({ noDoe: true }); P.X.shpGyroBtn(P.M); assert.equal(P.btn(), null, "瀏覽器沒有 DeviceOrientationEvent 不出現");
});

test("設定開關 shpTiltSw：關掉＝收起按鈕、停掉陀螺儀、記住；打開＝星槎頁補上按鈕（還是要按了才問）", async () => {
  const P = phone({}); P.X.shpGyroBtn(P.M); P.later(800); P.click(P.btn()); await tick(); P.tilt(); await tick();
  assert.equal(P.X.SPX.gyro, true, "Android 不用說明卡");
  P.change("shpTiltSw", false); assert.equal(P.mem.shpTilt, 0); assert.equal(P.btn(), null); assert.equal(P.X.SPX.gyro, false); assert.equal(listening(P), 0);
  P.change("shpTiltSw", true); assert.equal(P.mem.shpTilt, 1); assert.ok(P.btn(), "打開就補上按鈕"); assert.equal(P.log.modal.length, 0);
  P.change("別的開關", false); assert.equal(P.mem.shpTilt, 1, "別的勾選框不理");
  let h = phone({}).X.shpTiltRow(); assert.match(h, /id="shpTiltSw" checked/); assert.match(h, /現在跟著螢幕報讀模式/); assert.match(h, /📱 傾斜手機看景深/);
  h = phone({ axm: true }).X.shpTiltRow(); assert.doesNotMatch(h, /checked/, "螢幕報讀模式預設沒勾");
  h = phone({ mem: { shpTilt: 0 } }).X.shpTiltRow(); assert.doesNotMatch(h, /checked/); assert.doesNotMatch(h, /現在跟著/);
});

test("Android（不用授權）照舊：上次開過就先靜靜聽，有傾斜資料才自動開；沒資料就不開", async () => {
  let P = phone({ mem: { shpGyro: 1 } }); P.X.shpGyroBtn(P.M); assert.equal(listening(P), 1); P.tilt(); await tick();
  assert.equal(P.X.SPX.gyro, true); assert.equal(P.log.modal.length, 0); assert.equal(P.log.perm, 0);
  P = phone({ mem: { shpGyro: 1 } }); P.X.shpGyroBtn(P.M); P.fire(); await tick(); assert.equal(P.X.SPX.gyro, false); assert.equal(listening(P), 0, "1.2 秒沒資料就收掉");
});

test("〔原始碼〕07f-ship.js 只有 shpGyroReq 會呼叫 requestPermission；deviceorientation 只在 shpGyroSet／shpGyroTry 掛；渡口照舊用 shpGyroBtn", () => {
  assert.equal((SRC.match(/requestPermission\(/g) || []).length, 1); assert.match(SRC, /function shpGyroReq\(\)\{[^\n]*\n[^\n]*DeviceOrientationEvent\.requestPermission\(\)/);
  assert.equal((SRC.match(/addEventListener\("deviceorientation",/g) || []).length, 2);
  assert.match(SRC, /if\(!shpGyroAsk\(\)&&!SPX\.gyro&&store\.get\("shpGyro",0\)\)shpGyroTry\(\)/, "自動試聽只限不用授權的瀏覽器");
  const PF = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07n-portfx.js"), "utf8"); assert.match(PF, /shpGyroBtn\(P\)/);
  assert.ok(![...SRC].some(c => { const x = c.codePointAt(0); return x < 32 && x !== 10 }), "07f-ship.js 有 CR 或控制字元");
  for (const f of ["recordings.md"]) assert.equal(fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "art", "docs", f), "utf8"), fs.readFileSync(path.join(__dirname, "..", "site", "data", "docs", f), "utf8"), f + " 兩份要一樣");
});
