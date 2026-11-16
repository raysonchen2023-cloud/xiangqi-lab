// 11/16 開發者（紫淵卡在「思考中」）：Pikafish 不收棋子數超過正規的局面（「Unsupported position. BLACK has more than 2 cannons.」），
//   引擎收到就整個停掉，逾時重開後又送同一盤、永遠卡住。src/local.js 送引擎前先數子（engOver），超過就不送、不重試、說明原因。
// 不開瀏覽器：把 local.js 的 PCMAX／engOver 抽出來放進 vm 跑；再查 playEngine、evalPos 有接上。
// 用法：node --test xiangqi-lab/tools/test-eng-over-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "local.js"), "utf8").replace(/\r\n/g, "\n");

function load() {
  const a = SRC.indexOf("const PCMAX="), b = SRC.indexOf("const ENG_OVER_MSG=");
  assert.ok(a > 0 && b > a, "local.js 有 PCMAX、engOver");
  const ctx = { fen: f => f }; vm.createContext(ctx);   // 測試直接把 FEN 字串當盤面傳進去
  vm.runInContext(SRC.slice(a, b) + "\n;this.engOver=engOver;", ctx); return ctx.engOver;
}

test("〔行為〕數子：正規開局、殘局不算超過；四炮、六炮、八馬、三車、六兵都算超過", () => {
  const over = load();
  assert.equal(over("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w"), false, "標準開局");
  assert.equal(over("3k5/9/9/9/9/9/9/9/4A4/4K4 w"), false, "殘局");
  assert.equal(over("rncakacnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w"), true, "紫淵：黑方四門炮");
  assert.equal(over("ccbakabcc/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w"), true, "搖光：六門炮");
  assert.equal(over("1nbakabn1/9/1n7/n1n1n1n1n/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w"), true, "開陽：八匹馬");
  assert.equal(over("rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RRBAKABNR w"), true, "紅方三車");
  assert.equal(over("rnbakabnr/9/1c5c1/p1p1p1p1p/9/P8/P1P1P1P1P/1C5C1/9/RNBAKABNR w"), true, "紅方六兵");
});

test("〔行為〕11/16 兵擺在不可能的位置也算（自由擺陣）：紅兵在底三排、或還沒過河卻在 b、d、f、h 路；黑兵對稱；只看真的 90 格盤面", () => {
  const over = load(), B = (ps) => { const b = Array(90).fill(null); for (const [i, p] of ps) b[i] = p; return b };
  assert.equal(over(B([[6 * 9 + 0, "P"], [3 * 9 + 2, "p"]])), false, "兵在原位（a、c 路）");
  assert.equal(over(B([[2 * 9 + 1, "P"], [7 * 9 + 5, "p"]])), false, "過河的兵哪一路都行");
  assert.equal(over(B([[8 * 9 + 0, "P"]])), true, "紅兵在底三排");
  assert.equal(over(B([[6 * 9 + 1, "P"]])), true, "紅兵沒過河卻在 b 路");
  assert.equal(over(B([[1 * 9 + 4, "p"]])), true, "黑兵在底三排");
  assert.equal(over(B([[4 * 9 + 3, "p"]])), true, "黑兵沒過河卻在 d 路");
});

test("〔原始碼〕電腦走棋超過就停下說明、不送 Pikafish、不重試；分析直接說算不了", () => {
  assert.ok(SRC.includes("if(engOver(P.board,P.turn)){const vm=await varMove(P,lv);"), "playEngine 先數子；超過就改請 Magellan（XQVar）算");
  assert.ok(SRC.includes('if(!vm||!legal(P.board,P.turn).some(([a,b])=>a===vf&&b===vt)){P.engOver=1;playMsg="⚠ "+ENG_OVER_MSG;return}'), "算不出來或不合法才停下說明");
  assert.ok(SRC.includes('VW=new Worker("varengine-worker.js")') && SRC.includes("Math.max(1,Math.min(8,Math.round(lx*8/18)))") && SRC.includes("},20000)"), "背景執行緒、級數換算、20 秒逾時");
  assert.ok(SRC.indexOf("if(engOver(P.board,P.turn))") < SRC.indexOf("if(P.td&&window.XQ_TD){const TD=window.XQ_TD.engine(P,C)"), "在叫 Pikafish 之前");
  assert.ok(SRC.indexOf("if(tdOwn(P)){") < SRC.indexOf("if(engOver(P.board,P.turn))"), "星門圍城（星樞自己算、不叫 Pikafish）不受影響");
  assert.ok(SRC.includes("finally{playBusy=false;if(P&&P.engOver)return;"), "finally 不再排下一次");
  assert.ok(SRC.includes("if(engOver(b,s))throw new Error(ENG_OVER_MSG);"), "evalPos 算不了就說");
});
