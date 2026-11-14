// 11/13 開發者截圖「⚠ 引擎給出不合法著法 g3g4（稍後自動再試）」＋「這是什麼，對玩家來說會看不懂，修正吧」：
//   ① 章回棋路從殘局開始的盤（P.start），以前送給引擎的是「標準開局＋走過的步」，引擎回了這盤不存在的走法、電腦一直卡住
//      → local.js engPos()＝起始局面＋走過的步；engine.js 的 position 指令 fen 後面也接 moves
//   ② 畫面上不再出現技術訊息（e.message），細節只留在 P.engErr 和主控台
// 不開瀏覽器、不載引擎：把那幾行原樣切出來跑。用法：node --test xiangqi-lab/tools/test-engine-start.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const SRC = path.join(__dirname, "..", "src"), rd = f => fs.readFileSync(path.join(SRC, f), "utf8").replace(/\r\n/g, "\n");
const LOCAL = rd("local.js"), ENG = rd("engine.js");

/* engine.js 送出的 position 指令（把 send 那一行包成函式） */
const sendLine = ENG.split("\n").find(l => l.includes('send("position fen "'));
const posCmd = pos => { let out = ""; new Function("pos", "XQCore", "send", sendLine.replace(/\/\*[\s\S]*$/, ""))(pos, { START: "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR" }, s => { out = s }); return out };
/* local.js 的 engPos（ucis 用假的） */
const engLine = LOCAL.split("\n").find(l => l.startsWith("  const engPos="));
const engPos = (P, mv) => new Function("P", "ucis", engLine.trim() + ";return engPos()")(P, () => mv);

test("標準開局：照舊是「標準局面＋走過的步」", () => {
  const p = engPos({ start: null }, ["h2e2", "h9g7"]);
  assert.equal(posCmd(p), "position fen rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1 moves h2e2 h9g7");
  assert.equal(posCmd({ moves: [] }), "position fen rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR w - - 0 1");
});
test("從殘局開始（章回棋路 P.start）：送「起始局面＋走過的步」，誰先走照 startTurn", () => {
  const S = "3ak4/9/4b4/9/9/9/9/9/4R4/4K4";
  assert.equal(posCmd(engPos({ start: S, startTurn: "r" }, ["e1e8"])), "position fen " + S + " w - - 0 1 moves e1e8");
  assert.equal(posCmd(engPos({ start: S, startTurn: "b" }, [])), "position fen " + S + " b - - 0 1");
});
test("局面分析（只帶 fen、沒有 moves）照舊", () => {
  assert.equal(posCmd({ fen: "4k4/9/9/9/9/9/9/9/9/4K4 b" }), "position fen 4k4/9/9/9/9/9/9/9/9/4K4 b - - 0 1");
});
test("〔原始碼〕挑戰電腦落子、提示都用 engPos；畫面訊息不放 e.message，細節留在 P.engErr", () => {
  assert.ok(!LOCAL.includes("XQEngine.search({moves:ucis()}"), "不能再只送標準局面＋步數");
  assert.equal((LOCAL.match(/XQEngine\.search\(engPos\(\),/g) || []).length, 3, "落子、提示、黑洞陣地塔防的星樞（11/13）三處");
  const msg = LOCAL.split("\n").find(l => l.includes("電腦棋手一時沒想好"));
  assert.ok(msg && !/playMsg=[^;]*e\.message/.test(msg), "畫面訊息不能接技術訊息");
  assert.match(msg, /if\(P\)P\.engErr=em;console\.warn\("\[engine\]",em\)/);
});
