// 開發者 11/12：錯棋重練點「前炮平九」只看到白話說明、棋盤上沒有箭頭。
// 原因：對局頁每 1.5 秒輪詢重畫棋盤（o 裡沒有 sugg），把點記譜時畫的箭頭洗掉。
// 修法（01-board.js）：mvtShow 畫箭頭時記 svg._mvtHold＝{hit, bk 盤面, until 15 秒}；draw() 在盤面沒變、還沒過期時把 hit 併回 sugg。
// 這支測試從原始碼抽出 draw() 開頭那段與 mvtShow 設 hold 的寫法實際執行，屬〔混合〕：真的跑邏輯，但不是在瀏覽器畫 SVG。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const BOARD = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "01-board.js"), "utf8");

/* 抽出 draw() 一開頭處理 _mvtHold 的那句，包成函式：輸入 svg、盤面、o，回傳實際拿去畫的 o */
const m = BOARD.match(/function draw\(board,o\)\{(o=o\|\|\{\};if\(!o\._mvt\)\{[\s\S]*?svg\._o=o\})/);
const prelude = m ? new Function("svg", "board", "o", m[1] + ";return o;") : null;
const B0 = Array(90).fill(null); B0[1] = "C"; B0[4] = "k";
const B1 = B0.slice(); B1[0] = "C"; B1[1] = null;   /* 走了一步之後的盤面 */
const HIT = { f: 1, t: 0 };

test("〔混合〕找得到 draw() 開頭處理記譜箭頭保留的那段", () => {
  assert.ok(prelude, "01-board.js 的 draw() 開頭沒有 _mvtHold 的處理");
});

test("〔混合〕點過記譜後，輪詢重畫（o 沒有 sugg）仍保留那支箭頭", () => {
  const svg = { _mvtHold: { hit: HIT, bk: B0.join(","), until: Date.now() + 15000 } };
  const o = prelude(svg, B0, { flip: false, last: { f: 80, t: 81 } });
  assert.deepStrictEqual(o.sugg, [HIT], "重畫時要把點過的箭頭併回去");
  assert.strictEqual(o.last.f, 80, "原本的上一步箭頭也要留著");
  assert.ok(svg._mvtHold, "還沒過期、盤面沒變，保留紀錄不能被清掉");
});

test("〔混合〕本來就有建議箭頭時，記譜箭頭是加上去，不是取代", () => {
  const svg = { _mvtHold: { hit: HIT, bk: B0.join(","), until: Date.now() + 15000 } };
  const o = prelude(svg, B0, { sugg: [{ f: 4, t: 5 }] });
  assert.strictEqual(o.sugg.length, 2);
  assert.deepStrictEqual(o.sugg[1], HIT);
});

test("〔混合〕一走棋（盤面變了），記譜箭頭就收掉", () => {
  const svg = { _mvtHold: { hit: HIT, bk: B0.join(","), until: Date.now() + 15000 } };
  const o = prelude(svg, B1, {});
  assert.ok(!o.sugg || !o.sugg.length, "盤面變了不該再畫舊的記譜箭頭");
  assert.strictEqual(svg._mvtHold, null, "盤面變了要清掉保留紀錄");
});

test("〔混合〕超過 15 秒，記譜箭頭收掉", () => {
  const svg = { _mvtHold: { hit: HIT, bk: B0.join(","), until: Date.now() - 1 } };
  const o = prelude(svg, B0, {});
  assert.ok(!o.sugg || !o.sugg.length);
  assert.strictEqual(svg._mvtHold, null);
});

test("〔混合〕畫記譜箭頭那一次（_mvt）不碰保留紀錄，也不覆蓋記住的盤面", () => {
  const H = { hit: HIT, bk: B0.join(","), until: Date.now() + 15000 }, svg = { _mvtHold: H, _b: "舊", _o: "舊" };
  const o = prelude(svg, B0, { sugg: [HIT], _mvt: 1 });
  assert.strictEqual(svg._mvtHold, H);
  assert.strictEqual(svg._b, "舊", "_mvt 那次不能改掉記住的盤面（下次點記譜要用）");
  assert.deepStrictEqual(o.sugg, [HIT]);
});

test("〔原始碼〕mvtShow 畫箭頭時設定 15 秒的保留紀錄", () => {
  assert.match(BOARD, /s\._mvtHold=\{hit,bk:b\.join\(","\),until:Date\.now\(\)\+15000\}/);
});
