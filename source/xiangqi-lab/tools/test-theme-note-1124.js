"use strict";
/* 開發者 11/24 截圖（主題訓練・殺棋答錯後）：說明框跟下面的空白 div 平分高度，說明只拿到一半就出捲軸。空白 div 改成 flex-grow .001，剩下的高度給說明。
   版面要在瀏覽器才量得到（iMac Claude 1 本機量過：402×874 手機尺寸，原本 note 134px／內容 189px 要捲，改後 259px 全部放得下），這裡守住寫法不被改回去。 */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const LG = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07-legend.js"), "utf8");
test("〔原始碼〕對局頁（主題訓練、古戰場…共用的 boardPage）：說明 #note 後面的空白 div 是 flex-grow .001，不再跟說明平分高度", () => {
  assert.ok(LG.includes('<div class="boardbox" id="bbox" style="flex-shrink:8"></div><div class="status" id="stat"></div><div class="note" id="note" style="white-space:pre-wrap;flex:1 1 auto"></div><div style="flex:.001 1 0"></div>'), "說明照內容要高度、放不下先縮棋盤、空白 div 幾乎不分高度");
  assert.ok(!LG.includes('<div class="note" id="note" style="white-space:pre-wrap"></div><div style="flex:1"></div>'));
});
