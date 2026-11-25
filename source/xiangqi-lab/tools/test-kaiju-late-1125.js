/* 11/25 開發者截圖：練功房下到第 5、6 步時，突然跳出開局特效（「開局」大字＋「紅先」印）。
   原因：kaijuFx 遇到載入畫面或朝代過場（#preov、.ecover）會每 0.4 秒重試、最多 40 次（16 秒），3D 開著時還先等 kjWait；
   排程的那一刻棋局還沒走子，真正播的時候卻已經走了好幾步，播之前沒再檢查。
   改法（m/01-board.js）：kaijuFx 多一個 ok 參數，真正要播時（含每次重試）先問 ok()，不能播就取消；
   練功房（m/08b-cpugame.js）帶「同一盤、沒結果、還沒走子」，線上對局（m/09b-preload.js）再加「同一場（gid）」。
   kaijuFx 抽出來在 vm 跑（行為）；兩個呼叫處有沒有帶 ok 用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const BOARD = rd("xiangqi-db/m/01-board.js"), CPU = rd("xiangqi-db/m/08b-cpugame.js"), PRE = rd("xiangqi-db/m/09b-preload.js");

function kit(busy) {
  const a = BOARD.indexOf("function kaijuFx("), m = /\n(?:function |const |let |\/\*)/.exec(BOARD.slice(a + 10)), b = m ? a + 10 + m.index : -1;   /* 抓到下一個頂層宣告為止（後面還有鼓聲那段） */
  assert.ok(a > 0 && b > a, "抓得到整個 kaijuFx");
  const timers = [], shown = [];
  const svg = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 330 }) };
  const c = {
    store: { get: (k, d) => d }, focusOn: () => false, fxBusy: () => busy.on, fxHost: s => s, loadKaiju() { }, vibrate() { }, withAudio() { }, KJ_GLY: null,
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length },
    Math, JSON, String,
    document: {
      querySelectorAll: () => [],
      createElement: () => ({ style: {}, className: "", innerHTML: "", remove() { } }),
      body: { append: d => shown.push(d) }
    }
  };
  vm.createContext(c); vm.runInContext(BOARD.slice(a, b) + ";this.kaijuFx=kaijuFx;", c);
  const run = () => { const t = timers.shift(); if (t) t.f(); return !!t };
  return { fx: c.kaijuFx, timers, shown, run, svg };
}

test("ok() 說不能播：一開始就不播，也不排重試", () => {
  const K = kit({ on: false });
  K.fx(K.svg, "r", 0, () => false);
  assert.equal(K.shown.length, 0); assert.equal(K.timers.length, 0);
});

test("ok() 說可以播、沒有過場擋住：照常播一次（紅先）", () => {
  const K = kit({ on: false });
  K.fx(K.svg, "r", 0, () => true);
  assert.equal(K.shown.length, 1); assert.match(K.shown[0].innerHTML, /紅先/);
});

test("等過場收掉的期間棋局開始走了：重試時取消，不會在對局中途跳出來", () => {
  const busy = { on: true }, st = { moves: [] }, K = kit(busy);
  K.fx(K.svg, "r", 0, () => st.moves.length === 0);
  assert.equal(K.shown.length, 0); assert.equal(K.timers.length, 1, "過場還在：0.4 秒後再看");
  K.run(); K.run();
  st.moves.push("h2e2", "h9g7", "b2c2");                    /* 玩家已經走了 */
  busy.on = false; K.run();
  assert.equal(K.shown.length, 0, "過場收掉時已經在下棋了：不播");
  assert.equal(K.timers.length, 0, "也不再排重試");
});

test("過場一直不收、等滿 40 次（16 秒）上限：棋局已經開始就不播（原本這時會照播）", () => {
  const st = { moves: [] }, K = kit({ on: true });
  K.fx(K.svg, "r", 0, () => st.moves.length === 0);
  let n = 0; while (K.timers.length && n < 39) { K.run(); n++ }
  st.moves.push("h2e2", "h9g7", "b2c2", "b9c7", "a1b1", "h7f7");
  while (K.run()) { }
  assert.equal(K.shown.length, 0);
});

test("過場收掉時還沒走子：照常播（修正沒有把正常的開局特效拿掉）", () => {
  const busy = { on: true }, st = { moves: [] }, K = kit(busy);
  K.fx(K.svg, "r", 0, () => st.moves.length === 0);
  K.run(); busy.on = false; K.run();
  assert.equal(K.shown.length, 1);
});

test("舊的呼叫沒帶 ok：行為跟以前一樣（沒擋住就播）", () => {
  const K = kit({ on: false });
  K.fx(K.svg, "b");
  assert.equal(K.shown.length, 1); assert.match(K.shown[0].innerHTML, /黑先/);
});

test("〔原始碼〕練功房、線上對局呼叫 kaijuFx 都帶 ok：同一盤、還沒走子（線上再比 gid）", () => {
  assert.match(CPU, /kok=\(\)=>!!st&&st\.id===kid&&!st\.result&&st\.moves\.length<=klim,kj=\(\)=>kaijuFx\(bd\.svg,"r",0,kok\)/);
  assert.match(PRE, /kaijuFx\(bd\.svg,"r",0,\(\)=>!!st&&!st\.result&&!st\.moves\.length&&!!window\.XQNet&&!!XQNet\.gid&&XQNet\.gid\(\)===gk\)/);
  assert.match(BOARD, /setTimeout\(\(\)=>kaijuFx\(svg,side,\(k\|\|0\)\+1,ok\),400\)/, "重試時把 ok 一起帶下去");
});
