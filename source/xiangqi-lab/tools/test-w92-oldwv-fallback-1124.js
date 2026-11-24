/* W92（11/24）舊 WebView 沒有多執行緒時，對局改請備用的 Magellan 走棋：
   Windows Claude 2 在 Android 16 模擬器（WebView 133）發現原生 App 的 crossOriginIsolated＝false，Pikafish（多執行緒 wasm）載不起來，挑戰電腦完全不能下。
   02-shell.js 的降級那一段多設 window.XQ_ENG_FALLBACK；local.js 輪到電腦時看到它就改用 varMove（Magellan，純 JS Worker）。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SHELL = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "02-shell.js"), "utf8");
const LOCAL = fs.readFileSync(path.join(ROOT, "xiangqi-lab", "src", "local.js"), "utf8");
const UA = (app) => "Mozilla/5.0 (Linux; Android 16; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/133.0.6943.137 Mobile Safari/537.36" + (app ? " XQQianqiuApp/1" : "");
function block() { const a = SHELL.indexOf("/* 11/13 Android 舊 WebView 降級提示"), b = SHELL.indexOf("setTimeout(show,2500)}", a); assert.ok(a > 0 && b > a); return SHELL.slice(a, b + 22) }
function run({ app = true, coi = false, sab = true } = {}) {
  const modals = [], ctx = { OFF: true, navigator: { userAgent: UA(app), maxTouchPoints: 5 }, self: { crossOriginIsolated: coi }, window: {}, store: { get: (k, d) => d, set() {} },
    document: { querySelector: () => null }, setTimeout: (f) => f(), modal: (h) => modals.push(h), toast() {}, esc: (s) => String(s), Promise, Error, String, RegExp };
  ctx.window.XQEngine = ctx.XQEngine = { load: () => 1, search: () => 1, prefetch: () => 1 };
  if (!sab) ctx.SharedArrayBuffer = undefined;
  vm.createContext(ctx); vm.runInContext(block(), ctx); return { ctx, modals };
}

test("原生 App、沒有跨來源隔離：設 XQ_ENG_FALLBACK；說明視窗寫挑戰電腦先改用備用的簡易棋手（棋力比較弱），完整棋力、擂台、分析與提示要更新後才能用", () => {
  const r = run();
  assert.equal(r.ctx.window.XQ_ENG_FALLBACK, 1);
  assert.equal(r.modals.length, 1);
  assert.match(r.modals[0], /挑戰電腦先改用備用的簡易棋手陪你下（棋力比較弱）/);
  assert.match(r.modals[0], /要等更新才能用：完整棋力的電腦棋手、擂台、棋局分析與提示/);
  assert.equal(run({ coi: true, sab: false }).ctx.window.XQ_ENG_FALLBACK, 1, "有隔離但沒有 SharedArrayBuffer 也算");
});

test("隔離正常的原生 App、網頁版：不設 XQ_ENG_FALLBACK（照舊用 Pikafish）", () => {
  const ok = { OFF: true, navigator: { userAgent: UA(true) }, self: { crossOriginIsolated: true }, window: {}, SharedArrayBuffer: function () {}, store: { get: (k, d) => d, set() {} }, document: { querySelector: () => null }, setTimeout() {}, modal() {}, toast() {}, esc: String, Promise, Error, String, RegExp };
  vm.createContext(ok); vm.runInContext(block(), ok); assert.equal(ok.window.XQ_ENG_FALLBACK, undefined);
  assert.equal(run({ app: false }).ctx.window.XQ_ENG_FALLBACK, undefined, "網頁版另有自己的重新整理說明，不走這條");
});

test("〔原始碼〕local.js：輪到電腦時，沒有多執行緒就跟棋子數超過一樣改請 Magellan（varMove）；算不出來時說備用棋手算不出、接平台各自的更新說明（iOS 不提 Play 商店）", () => {
  const i = LOCAL.indexOf("if(!P.td&&window.XQ_ENG_FALLBACK){const vm=await varMove(P,lv);");
  assert.ok(i > 0, "沒有多執行緒時改請 Magellan（varMove）");
  assert.ok(LOCAL.indexOf("if(engOver(P.board,P.turn)){const vm=await varMove(P,lv);") < i && i < LOCAL.indexOf("if(P.td&&window.XQ_TD){const TD=window.XQ_TD.engine(P,C)"), "在棋子數超過那一段之後、叫 Pikafish 之前（塔防 P.td 照舊）");
  const line = LOCAL.slice(i, LOCAL.indexOf("delete P.engOver;playApply(vf,vt)", i));
  assert.ok(line.includes('playMsg="⚠ 備用的簡易棋手這一步算不出來。"+(typeof NATIVE_OLDWV==="string"?NATIVE_OLDWV:"")'), "算不出來時的說明接 02-shell 分平台的那句");
  assert.ok(!/Play 商店/.test(line.replace(/\/\*[\s\S]*?\*\//g, "")), "這段程式自己不寫 Play 商店（iOS 審查 2.3.10）");
});
