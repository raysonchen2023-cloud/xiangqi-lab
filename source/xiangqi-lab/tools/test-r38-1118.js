// 11/18 第 34 輪（候選版 0911）P3 與觀察：
//   N34-1 第 1 段電影開頭，星渦（#bhxVx）蓋在「略過」上 → 星渦不攔點擊；
//   沒有多執行緒模式（網頁版 Service Worker 沒裝好）時，engine.js 丟 noCoi、local.js 說清楚而且重整前不再空轉重試（訊息跟 02-shell coiWarn 同一句）。
// 不開瀏覽器：vm 跑 engine.js、local.js 的片段。
// 用法：node --test xiangqi-lab/tools/test-r38-1118.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SRCOK = fs.existsSync(path.join(ROOT, "xiangqi-lab/src/local.js")), NO = "沒有 xiangqi-lab/src（公開副本不含）";
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const MSG = "電腦棋手需要瀏覽器的「多執行緒模式」才能下棋，這次沒有開成功（背景的 Service Worker 沒有裝好）。請重新整理這一頁；還是不行，請換用最新版的 Chrome、Safari 或 Edge 再打開。";

test("N34-1：星渦（#bhxVx）只是畫面，不攔點擊——第 1 段電影開頭它還在淡出時，「略過」照樣按得到", () => {
  const B = rd("xiangqi-db/m/07bh-blackhole.js"), css = /#bhxVx\{[^}]*\}/.exec(B)[0];
  assert.ok(/pointer-events:none/.test(css), css); assert.ok(/z-index:9001/.test(css), "層級照舊（畫面一樣）");
  assert.ok(/#bhxPg \.bx-k\{position:absolute;right:16px/.test(B), "略過鈕在電影裡");
});

test("沒有多執行緒：engine.js 一啟動就丟 noCoi 錯（訊息跟 02-shell coiWarn 同一句）", { skip: SRCOK ? false : NO }, async () => {
  const E = rd("xiangqi-lab/src/engine.js"), ctx = { location: { href: "http://x/" }, self: { crossOriginIsolated: false }, URL, setTimeout, clearTimeout, console, Promise };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(E + ";this.E=XQEngine", ctx);
  await assert.rejects(ctx.E.load(), e => e.noCoi === true && e.message === MSG);
  const C = /COI_TXT="([^"]+)"/.exec(rd("xiangqi-db/m/02-shell.js"))[1]; assert.equal(C + "。", MSG, "02-shell coiWarn 同一句");
});

test("沒有多執行緒：local.js 的 playEngine 說清楚、重整前不再每隔幾秒空轉重試（原生 App 用原生那句）；其他失敗照舊退避重試", { skip: SRCOK ? false : NO }, () => {
  const L = rd("xiangqi-lab/src/local.js");
  assert.ok(L.includes("engFail=0,engWait=false,engNoCoi=false;"));
  assert.ok(L.includes('const ENG_NOCOI_MSG="⚠ ' + MSG + '";'));
  const c = L.slice(L.indexOf("catch(e){engFail++;const off="), L.indexOf("\n  function playState(){"));
  /* 把 catch／finally 那段包成函式跑：e＝丟出來的錯、env＝狀態 */
  const run = (e, env) => { const ctx = Object.assign({ engFail: 0, engWait: false, engNoCoi: false, playMsg: "", P: { id: 1 }, playBusy: true, XQEngine: { ready: false }, navigator: { onLine: true, userAgent: "Mozilla/5.0 Chrome/130" }, self: { crossOriginIsolated: false },
      ENG_NOCOI_MSG: "⚠ " + MSG, timers: [], console: { warn() {} }, addEventListener() {}, playEngine() {} }, env || {});
    ctx.setTimeout = (f, ms) => ctx.timers.push(ms); vm.createContext(ctx);
    vm.runInContext("(function(){try{throw __e}" + c.slice(0, c.lastIndexOf("}")) + "})();this.out={engNoCoi,playMsg,timers}", Object.assign(ctx, { __e: e })); return ctx.out };
  const noCoi = Object.assign(new Error(MSG), { noCoi: true });
  let o = run(noCoi); assert.equal(o.engNoCoi, true); assert.equal(o.playMsg, "⚠ " + MSG); assert.deepEqual(o.timers, [], "不再排下一次重試");
  o = run(new Error("x"), { self: { crossOriginIsolated: false } }); assert.equal(o.engNoCoi, true, "頁面沒有隔離、引擎也沒啟動：一樣認得");
  o = run(new Error("電腦棋手沒有啟動成功，請把 App 完全關掉再重新開啟；若一直失敗，請更新 iOS 或聯絡我們"), { navigator: { onLine: true, userAgent: "Mozilla/5.0 XQQianqiuApp/1.0" } });
  assert.ok(o.engNoCoi && o.playMsg.startsWith("⚠ 電腦棋手沒有啟動成功") && !/Service Worker/.test(o.playMsg), "原生 App：用原生那句");
  o = run(new Error("電腦棋手啟動太久"), { self: { crossOriginIsolated: true } }); assert.equal(o.engNoCoi, false); assert.equal(o.timers.length, 1, "有隔離的其他失敗：照舊隔幾秒重試"); assert.ok(o.timers[0] >= 1500);
  /* 開新局照舊叫 playEngine 一次（不會被擋），失敗了也不會再空轉 */
  assert.ok(L.includes("else if(!engWait&&!engNoCoi)setTimeout(playEngine,Math.min(60000,1500*2**Math.min(engFail,6)))"));
});

test("英文：local.js 的「⚠ …多執行緒模式…」內建翻得出", () => {
  const I = rd("xiangqi-db/m/07i18n.js"), a = I.indexOf("#I18N-PURE-BEGIN"), b = I.indexOf("/* #I18N-PURE-END */"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(I.slice(I.indexOf("\n", a) + 1, b) + ";this.R={i18nText}", ctx);
  const e = ctx.R.i18nText("⚠ " + MSG); assert.ok(e && !/[㐀-鿿]/.test(e) && /multi-threaded/.test(e), e);
});
