// 開發者 11/12：「我的戰績五邊形的殺法都是—」。殺法軸只從棋力測驗的殺法、戰術題算（tlIRT：滿 3 題才估得出 θ），
// 沒分數時原本只寫「—」，按鈕還叫人去主題訓練（練了也不會有殺法分數）。改成：寫「未測」、說已做幾題還差幾題、按鈕改「做棋力測驗」。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const S = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "04-stats.js"), "utf8");

/* 抽出「數 quizLog 裡殺法＋戰術題」那段式子，用假的 quizLog 實際跑 */
const m = S.match(/const KQ=\(store\.get\("quizLog",\[\]\)\|\|\[\]\)(\.reduce\([\s\S]*?,0\)),KQ_MIN=3;/);
const countKQ = m ? new Function("QL", "return (QL||[])" + m[1] + ";") : null;
/* quizLog 每題：[階, 對錯, 殺棋題, 毫秒, 類別, id, …]；舊紀錄沒有類別時，殺棋題算殺法 */
const LOG = [
  { a: [[5, 1, 1, 900, "殺法", "q1"], [6, 0, 0, 900, "局面", "q2"], [7, 1, 0, 900, "戰術", "q3"]] },
  { a: [[4, 0, 1, 800, "", "q4"], [5, 1, 0, 800, "殘局", "q5"]] }
];

test("〔混合〕數得出棋力測驗裡的殺法、戰術題（含舊紀錄沒有類別的殺棋題）", () => {
  assert.ok(countKQ, "04-stats.js 找不到計算 KQ 的式子");
  assert.strictEqual(countKQ(LOG), 3, "殺法 1＋戰術 1＋沒類別的殺棋題 1＝3 題；局面、殘局不算");
  assert.strictEqual(countKQ([]), 0);
  assert.strictEqual(countKQ([{}, { a: null }]), 0, "壞掉的紀錄不能讓整頁出錯");
});

test("〔混合〕門檻跟估功力的 tlIRT 一致：少於 3 題估不出來", () => {
  assert.match(S, /const est=A=>\{if\(A\.length<3\)return null;/, "tlIRT 的門檻變了，KQ_MIN 要跟著改");
  assert.match(S, /KQ_MIN=3;/);
});

test("〔原始碼〕殺法沒分數時寫「未測」（列表與五邊形都是）", () => {
  assert.match(S, /a\.v==null\?\(a\.k==="殺法"\?"未測":"—"\)/, "列表右邊的分數");
  assert.match(S, /a\.k==="殺法"&&a\.v==null\?"未測":""/, "傳給五邊形的軸文字");
  assert.match(S, /x\[1\]==null\?\(x\[3\]\|\|"—"\)/, "五邊形空值要用傳進來的文字");
});

test("〔原始碼〕殺法沒分數時按鈕改「做棋力測驗」，有分數才去主題訓練", () => {
  assert.match(S, /a\.k==="殺法"\?\(a\.v==null\?\["#\/quiz","做棋力測驗"\]:\["#\/theme\//);
});

test("〔原始碼〕說明寫出已做幾題、還差幾題", () => {
  assert.match(S, /棋力測驗做了 \$\{KQ\} 題殺法、戰術題，滿 \$\{KQ_MIN\} 題才算得出來/);
  assert.match(S, /殺法只從「棋力測驗」的殺法、戰術題算，還沒做過/);
});
