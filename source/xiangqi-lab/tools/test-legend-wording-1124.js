"use strict";
/* 開發者 11/24 實機截圖（石桌往事・第二回）：「她去掰」看不懂。正本改放 source/xiangqi-db/park-legend.json（build-site.js 會複製到 site/data/），
   改成「她想把孩子的手指一根一根扳開…把那顆棋子攥得更緊」。這裡守住：正本是合法 JSON、新句子在、舊句子不在、除了這一句跟網站上的 data/park-legend.json 一模一樣（發布時才換過去） */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", "..", "..");
const SRC = fs.readFileSync(path.join(ROOT, "source", "xiangqi-db", "park-legend.json"), "utf8");
const OLD = "她去掰，孩子醒了，哇地哭起來，攥得更緊。", NEW = "她想把孩子的手指一根一根扳開，孩子醒了，哇地哭起來，把那顆棋子攥得更緊。";
test("〔混合〕石桌往事第二回：「她去掰」改成看得懂的句子，其他內容不動", () => {
  const d = JSON.parse(SRC);
  assert.ok(Array.isArray(d.chapters) && d.chapters.length > 1, "正本讀得出章回");
  assert.ok(SRC.includes(NEW)); assert.ok(!SRC.includes("她去掰"));
  const site = path.join(ROOT, "data", "park-legend.json");
  if (fs.existsSync(site)) { const S = fs.readFileSync(site, "utf8"); assert.equal(SRC, S.includes(OLD) ? S.replace(OLD, NEW) : S, "除了這一句，跟網站上那份一樣") }
});
