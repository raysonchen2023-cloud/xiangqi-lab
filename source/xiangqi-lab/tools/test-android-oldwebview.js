// 11/13 Android 舊 WebView 降級提示（xiangqi-db/m/02-shell.js 的兩小段）
//   原生 App（UA 帶 XQQianqiuApp/1）沒有 crossOriginIsolated 或 SharedArrayBuffer：不自動重整、跳一次說明（要更新哪個 App、哪些功能還能用），
//   引擎的下載／載入／搜尋直接回同一句話；網頁版、隔離正常的原生 App 都照舊
// 把 02-shell.js 裡那兩段原樣抽出來，用 vm 配假的 navigator／document／計時器跑，不開瀏覽器、不開模擬器。用法：node --test xiangqi-lab/tools/test-android-oldwebview.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SHELL = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "02-shell.js"), "utf8");
const MSG = "這支手機的 Android System WebView 版本太舊，電腦棋手無法運作；請到 Play 商店更新「Android System WebView」或「Chrome」";
const UA_APP = "Mozilla/5.0 (Linux; Android 16; sdk_gphone64_x86_64 Build/BE2A.250530.026.F3; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/133.0.6943.137 Mobile Safari/537.36 XQQianqiuApp/1";
const UA_WEB = "Mozilla/5.0 (Linux; Android 16) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.6943.137 Mobile Safari/537.36";

/* 抽出降級提示那一段：從說明註解開頭到 setTimeout(show,2500)} */
function oldWvBlock() {
  const a = SHELL.indexOf("/* 11/13 Android 舊 WebView 降級提示"), b = SHELL.indexOf("setTimeout(show,2500)}", a);
  assert.ok(a > 0 && b > a, "02-shell.js 找不到降級提示那一段");
  return SHELL.slice(a, b + "setTimeout(show,2500)}".length);
}
/* 抽出 service worker 註冊後自動重整那一段 */
function reloadBlock() {
  const a = SHELL.indexOf('navigator.serviceWorker.register("sw.js")'), b = SHELL.indexOf("}).catch(()=>{});", a);
  assert.ok(a > 0 && b > a, "02-shell.js 找不到自動重整那一段");
  return SHELL.slice(a, b + "}).catch(()=>{});".length);
}

/* 假環境：計時器手動推進、modal／toast 記下來、store 用記憶體 */
function env({ ua = UA_APP, coi = false, sab = true, off = true, busy = 0, mem = {} } = {}) {
  const timers = [], modals = [], toasts = [], engine = { load: () => Promise.resolve("真的 load"), search: () => Promise.resolve("真的 search"), prefetch: () => Promise.resolve("真的 prefetch") };
  let busyLeft = busy;
  const ctx = {
    OFF: off, navigator: { userAgent: ua }, self: { crossOriginIsolated: coi }, window: {}, XQEngine: engine,
    store: { get: (k, d) => k in mem ? mem[k] : d, set: (k, v) => { mem[k] = v } },
    document: { querySelector: () => busyLeft-- > 0 ? {} : null, body: { classList: { contains: () => false } } },
    setTimeout: (f, t) => { timers.push({ f, t }) },
    modal: (html, buttons, cls) => { modals.push({ html, buttons, cls }) }, toast: m => toasts.push(m),
    esc: s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]),
    Promise, Error, String, RegExp,
  };
  ctx.window.XQEngine = engine;
  if (!sab) ctx.SharedArrayBuffer = undefined;
  vm.createContext(ctx);
  const tick = () => { const t = timers.shift(); if (t) t.f(); return t };
  return { ctx, timers, modals, toasts, engine, mem, tick };
}
const runOld = e => vm.runInContext(oldWvBlock() + "\n;NATIVE_OLDWV", e.ctx);

test("原生 App、WebView 太舊（沒有跨來源隔離）：2.5 秒後跳說明，寫明要更新 Android System WebView 或 Chrome、哪些功能還能用、WebView 版本", () => {
  const e = env();
  assert.equal(runOld(e), MSG);
  assert.equal(e.modals.length, 0, "不要一打開就跳，等畫面先出來");
  assert.equal(e.timers.length, 1); assert.equal(e.timers[0].t, 2500);
  e.tick();
  assert.equal(e.modals.length, 1);
  const h = e.modals[0].html;
  assert.ok(h.includes(MSG), "要有指定的那一句話");
  for (const k of ["同桌對弈", "殘局", "古譜", "測驗", "挑戰電腦", "棋局分析", "完全關掉再打開"]) assert.ok(h.includes(k), "說明缺「" + k + "」");
  assert.ok(h.includes("133.0.6943.137"), "要寫目前的 WebView 版本");
  assert.deepEqual(Array.from(e.modals[0].buttons, b => b[0]), ["知道了", "這個版本不再跳出"]);
  assert.equal(e.timers.length, 0, "跳完就不再排計時器（不會一直跳、不會重整）");
});

test("原生 App、有隔離但沒有 SharedArrayBuffer 也算太舊；引擎的 load／search／prefetch 都直接回那句話（不再叫人關掉重開、不抓引擎檔）", async () => {
  const e = env({ coi: true, sab: false });
  runOld(e);
  for (const k of ["load", "search", "prefetch"]) await assert.rejects(e.engine[k](), err => err.message === MSG, k);
  assert.doesNotMatch(MSG, /關掉重開/);
});

test("「這個版本不再跳出」：同一個 WebView 版本之後只出一行提示；WebView 版本換了（例如更新到一半）再跳完整說明", () => {
  const mem = {}, e = env({ mem });
  runOld(e); e.tick();
  e.modals[0].buttons[1][1]();
  assert.equal(mem.oldWvMute, "133.0.6943.137");
  const e2 = env({ mem });
  runOld(e2); e2.tick();
  assert.equal(e2.modals.length, 0);
  assert.deepEqual(e2.toasts, ["⚠ " + MSG]);
  const e3 = env({ mem, ua: UA_APP.replace("133.0.6943.137", "134.0.6998.39") });
  runOld(e3); e3.tick();
  assert.equal(e3.modals.length, 1);
});

test("畫面上有預載畫面、別的視窗、卡片時先等（每 3 秒看一次），最多等 30 次就照樣跳", () => {
  let e = env({ busy: 2 });
  runOld(e); e.tick();
  assert.equal(e.modals.length, 0); assert.equal(e.timers[0].t, 3000);
  e.tick(); e.tick();
  assert.equal(e.modals.length, 1);
  e = env({ busy: 999 });
  runOld(e);
  let n = 0;
  while (e.tick() && n < 100) n++;
  assert.equal(e.modals.length, 1);
  assert.ok(n <= 31, "不能無限等：" + n);
});

test("隔離正常的原生 App、網頁版（就算沒有隔離）、不是離線版：都不跳、引擎不動", async () => {
  for (const o of [{ coi: true }, { ua: UA_WEB }, { ua: UA_WEB, coi: true }, { off: false }]) {
    const e = env(o);
    runOld(e);
    assert.equal(e.timers.length, 0, JSON.stringify(o));
    assert.equal(await e.engine.search(), "真的 search");
  }
});

/* 自動重整那一段：service worker 就緒後沒有隔離就重整（同一次最多兩次）；原生 App 不重整 */
async function runReload({ ua, coi, n = 0, controller = true }) {
  const ss = { xqReload: n ? String(n) : null }, reloads = [], timers = [], listeners = [];
  const ctx = {
    navigator: { userAgent: ua, serviceWorker: { register: () => Promise.resolve(), ready: Promise.resolve(), controller: controller ? {} : null, addEventListener: (k, f) => listeners.push(k) } },
    self: { crossOriginIsolated: coi }, sessionStorage: { getItem: k => ss[k], setItem: (k, v) => { ss[k] = v } },
    location: { reload: () => reloads.push(1) }, setTimeout: (f, t) => { timers.push(t); f() }, String,
  };
  vm.createContext(ctx);
  vm.runInContext(reloadBlock(), ctx);
  for (let i = 0; i < 5; i++) await new Promise(r => setImmediate(r));
  return { reloads: reloads.length, ss, listeners };
}

test("自動重整：網頁版沒有隔離照舊重整（最多兩次）；原生 App 不管有沒有隔離都不重整（隔離靠原生碼，重整也不會好）", async () => {
  let r = await runReload({ ua: UA_WEB, coi: false });
  assert.equal(r.reloads, 1); assert.equal(r.ss.xqReload, "1");
  r = await runReload({ ua: UA_WEB, coi: false, n: 2 });
  assert.equal(r.reloads, 0, "網頁版第三次不再重整");
  r = await runReload({ ua: UA_WEB, coi: true });
  assert.equal(r.reloads, 0);
  for (const n of [0, 1]) {
    r = await runReload({ ua: UA_APP, coi: false, n });
    assert.equal(r.reloads, 0, "原生 App 不能重整");
    assert.equal(r.ss.xqReload, n ? String(n) : null);
  }
  r = await runReload({ ua: UA_APP, coi: false, controller: false });
  assert.deepEqual([r.reloads, r.listeners.length], [0, 0], "還沒接管時也不掛 controllerchange 重整");
});

test("〔原始碼〕只改 02-shell.js 那兩小段：判斷用 UA 的 XQQianqiuApp/、說明只在 OFF（離線版）跑；一行程式裡沒有 // 註解", () => {
  const blk = oldWvBlock();
  assert.match(blk, /if\(OFF&&\/XQQianqiuApp\\\/\/\.test\(navigator\.userAgent\)&&\(!self\.crossOriginIsolated\|\|typeof SharedArrayBuffer==="undefined"\)\)/);
  assert.match(reloadBlock(), /if\(self\.crossOriginIsolated\|\|n>=2\|\|\/XQQianqiuApp\\\/\/\.test\(navigator\.userAgent\)\)return;/);
  for (const ln of blk.split("\n").concat(reloadBlock().split("\n"))) assert.ok(!/[^:"'`]\/\/ /.test(ln.replace(/https?:\/\//g, "")), "不能有 // 註解：" + ln.slice(0, 60));
  assert.equal((SHELL.match(/const NATIVE_OLDWV=/g) || []).length, 1);
});
