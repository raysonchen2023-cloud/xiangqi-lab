// 開發者 11/12「新增下一步的按鈕讓玩家方便看」：答題後「Pikafish 的後續」可以 ‹ 上一步／下一步 ›／▶ 自動播放，點後續著法直接跳到那一步。
// 原本點後續第 4 步時棋盤還停在題目局面，mvtShow 在當前局面找同名走法、把箭頭畫在錯的地方。
// 這支測試從 01-board.js 抽出 pvSteps、pvMvts 與它們用到的記譜比對函式，配真的棋規核心（site/core.js）跑真的題目。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..");
const B = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "01-board.js"), "utf8");
const C = require("../site/core.js");
const QUIZ = require("../site/data/quiz.json");

/* 抽出要用的函式（照原始碼順序，一起放進同一個範圍執行） */
const grab = re => { const m = B.match(re); if (!m) throw new Error("01-board.js 找不到：" + re); return m[0] };
const src = [
  grab(/const MVT_PC=[\s\S]*?MVT_CN=\{[^}]*\};/), grab(/const mvtTw=s=>[^\n]*/), grab(/const mvtNorm=s=>[^\n]*/),
  grab(/function mvtFind\(b,want\)\{[^\n]*\n[^\n]*/), grab(/function pvSteps\(b0,pv\)\{[\s\S]*?return\{B,L,n:B\.length-1\}\}/),
  grab(/function pvMvts\(note\)\{[^\n]*/)
].join("\n");
const api = new Function("window", src + "\nreturn{pvSteps,pvMvts,mvtFind,mvtNorm};")({ XQCore: C });

const parse = s => s.split(",").map(x => x || null);

test("真的題目：後續 8 步全部推得出來，每一步都是合法走法", () => {
  const q = QUIZ.items.find(x => x.id === "e1");
  assert.ok(q, "題庫找不到 e1");
  const b0 = parse(q.board), S = api.pvSteps(b0, q.pv);
  assert.strictEqual(S.n, q.pv.length, "每一步都要找得到");
  for (let k = 1; k <= S.n; k++) {
    const { f, t } = S.L[k], side = k % 2 ? q.side : (q.side === "r" ? "b" : "r");
    assert.ok(C.legal(S.B[k - 1], side).some(([a, b]) => a === f && b === t), `第 ${k} 步 ${q.pv[k - 1]} 要是合法走法`);
    assert.strictEqual(api.mvtNorm(C.notate(S.B[k - 1], f, t)), api.mvtNorm(q.pv[k - 1]), `第 ${k} 步的記譜要一樣`);
    assert.strictEqual(S.B[k][t], S.B[k - 1][f], "棋子要真的走過去");
    assert.strictEqual(S.B[k][f], null, "原位要空出來");
  }
  assert.deepStrictEqual(S.B[0], b0, "第 0 步＝題目局面，不能被改到");
});

test("題庫裡有後續的題目，後續大多推得完（抽 200 題）", () => {
  const qs = QUIZ.items.filter(x => x.pv && x.pv.length >= 2 && x.board).slice(0, 200);
  let full = 0, first = 0;
  for (const q of qs) { const S = api.pvSteps(parse(q.board), q.pv); if (S.n === q.pv.length) full++; if (S.n >= 1) first++ }
  assert.strictEqual(first, qs.length, "每題至少第 1 步（正解）要推得出來");
  assert.ok(full / qs.length >= 0.95, `推得完的比例 ${full}/${qs.length} 太低`);
});

test("後續中間有一步找不到，就停在那裡，不亂接後面", () => {
  const q = QUIZ.items.find(x => x.id === "e1"), pv = q.pv.slice(0, 3).concat(["炮二平五"], q.pv.slice(3));
  const S = api.pvSteps(parse(q.board), pv);
  assert.strictEqual(S.n, 3);
});

test("〔混合〕點後續的第幾個著法＝跳到第幾步（只算「Pikafish 的後續」那一行）", () => {
  const T = v => ({ nodeType: 3, nodeValue: v }), M = cn => ({ nodeType: 1, classList: { contains: c => c === "mvt" }, cn });
  const note = { childNodes: [T("正解："), M("俥八平七"), T("，走完…\nPikafish 的後續："), M("俥八平七"), T(" "), M("將5退1"), T(" "), M("傌二進三"), T("\n出處："), M("炮二平五")] };
  const L = api.pvMvts(note);
  assert.deepStrictEqual(L.map(x => x.cn), ["俥八平七", "將5退1", "傌二進三"], "正解那一行、出處那一行的著法都不算");
});

test("〔原始碼〕四個地方都接上逐步播放", () => {
  const read = f => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
  assert.match(read("03-home-quiz.js"), /pvStepper\(v\.querySelector\("#note"\),bd,board,q\.pv/);
  assert.match(read("07d-garden.js"), /pvStepper\(n,bd,board,q\.pv/);
  assert.match(read("07-legend.js"), /pvStepper\(v\.querySelector\("#note"\),bd,board,q\.pv/);
  assert.match(read("10d-coach.js"), /pvStepper\(g\("#note"\),bd,board,q\.pv/);
});

test("〔原始碼〕點後續著法時先交給逐步播放，不在當前局面亂找同名走法", () => {
  assert.match(B, /const box=x\.closest\("\[data-pvbox\]"\);if\(box&&box\._pvGo\)/);
});
