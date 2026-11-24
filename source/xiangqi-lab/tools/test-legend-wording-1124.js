"use strict";
/* 開發者 11/24 實機截圖（石桌往事・第二回）：「她去掰」看不懂。正本改放 source/xiangqi-db/park-legend.json（build-site.js 會複製到 site/data/），
   改成「她想把孩子的手指一根一根扳開…把那顆棋子攥得更緊」。這裡守住：正本是合法 JSON、新句子在、舊句子不在、除了這一句跟網站上的 data/park-legend.json 一模一樣（發布時才換過去） */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
/* 正本跟其他測試一樣從 tools/../../xiangqi-db 找（CI 的 run-tests 只把 source/ 底下抄到暫存資料夾）；網站上那份在倉庫根目錄 data/，有才比 */
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "park-legend.json"), "utf8");
const ROOT = path.join(__dirname, "..", "..", "..");
/* 成對的 [舊, 新]：第二回正文一句，加上「桌子底下」三題記盤題的 ask（Windows Claude 1 11/24：開發者以為第 4 步問的是黑車——棋盤上同名的子好幾顆，改成寫明是哪一步吃掉的那顆；答案不動） */
const PAIRS = [
  ["她去掰，孩子醒了，哇地哭起來，攥得更緊。", "她想把孩子的手指一根一根扳開，孩子醒了，哇地哭起來，把那顆棋子攥得更緊。"],
  ["\"這顆黑卒剛才站在哪一格？點對了才能舉手還回去。\"", "\"紅炮七進四吃掉的那顆黑卒，就是剛才掉到你腳邊那顆。它被吃之前站在哪一格？點對了才能舉手還回去。（路數看棋盤邊上的小數字）\""],
  ["\"這顆紅兵剛才站在哪一格？\"", "\"黑象1進3吃掉的那顆紅兵，就是剛才「咚」一聲掉下來那顆。它被吃之前站在哪一格？（路數看棋盤邊上的小數字）\""],
  ["\"這顆黑砲剛才站在哪一格？\"", "\"紅俥八進七吃掉的那顆黑砲，就是剛才「咚」一聲掉下來那顆。它被吃之前站在哪一格？（路數看棋盤邊上的小數字）\""]];
test("〔混合〕石桌往事第二回：「她去掰」和三題記盤題改成看得懂的句子，其他內容不動", () => {
  const d = JSON.parse(SRC);
  assert.ok(Array.isArray(d.chapters) && d.chapters.length > 1, "正本讀得出章回");
  for (const [o, n] of PAIRS) { assert.ok(SRC.includes(n), "新句子在：" + n.slice(0, 20)); assert.ok(!SRC.includes(o), "舊句子不在：" + o.slice(0, 20)) }
  assert.ok(!SRC.includes("她去掰"));
  const site = path.join(ROOT, "data", "park-legend.json");
  if (fs.existsSync(site)) { let S = fs.readFileSync(site, "utf8"); for (const [o, n] of PAIRS) if (S.includes(o)) S = S.replace(o, n); assert.equal(SRC, S, "除了這四句，跟網站上那份一樣") }
});
