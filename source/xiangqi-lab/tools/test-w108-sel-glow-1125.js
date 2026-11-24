/* W108（11/25 玩家英文回饋：選中的棋子加一點高光或光暈，快棋時比較清楚；開發者排在送審前）：光暈用暖金色。
   平面棋盤選中的棋子底下加一圈柔和光暈。棋盤元件要瀏覽器才畫得出來，這裡用原始碼比對鎖住關鍵寫法（標〔原始碼〕），畫面效果在預覽站截圖驗收。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "01-board.js"), "utf8");

test("〔原始碼〕defs 有選中光暈的放射漸層：暖金色（亮起來，不是深色像影子），外圈淡到透明", () => {
  const m = /<radialGradient id=\\?"psel\$\{u\}\\?">([\s\S]*?)<\/radialGradient>/.exec(SRC);
  assert.ok(m, "找不到 psel 漸層");
  const stops = [...m[1].matchAll(/stop-color=\\?"([^"\\]+)\\?" stop-opacity=\\?"([.\d]+)\\?"/g)];
  assert.ok(stops.length >= 2, "至少兩個漸層停點");
  /* 預覽站實測：用主題強調色 T.mv（例如 #2F6B4F）畫出來像影子；光暈要比棋盤亮，顏色亮度要高 */
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255 };
  assert.ok(stops.every((x) => /^#[0-9A-Fa-f]{6}$/.test(x[1]) && lum(x[1]) > .75), "光暈顏色要是亮色（亮度 > .75）：" + stops.map((x) => x[1]).join(","));
  assert.equal(+stops[stops.length - 1][2], 0, "最外圈要淡到透明（柔和，不是一圈硬邊）");
  assert.ok(Math.max(...stops.map((x) => +x[2])) <= .9, "最濃不超過 .9（中心會被棋子蓋住，外圈才看得到）");
});

test("〔原始碼〕只有選中的棋子畫光暈，畫在棋子底下、跟著抬起 7px，不擋點擊、不加動畫", () => {
  const i = SRC.indexOf("board.forEach((p,i)=>{if(!p)return;const up=i===o.sel;"), seg = SRC.slice(i, i + 400);
  assert.ok(i > 0, "找不到畫棋子的迴圈");
  assert.match(seg, /if\(up\)svg\.append\(el\("circle",\{class:"bd-selglow",cx:X\(i\),cy:Y\(i\)-7,r:46,fill:`url\(#psel\$\{uid\}\)`,"pointer-events":"none"\}\)\);const pg=piece\(/, "光暈先 append、再畫棋子（在棋子底下）");
  assert.equal((SRC.match(/bd-selglow/g) || []).length, 1, "光暈只在這一處畫");
  assert.ok(!/bd-selglow[^;]*(animation|transition)/.test(SRC), "不加閃爍或動畫");
});

test("〔原始碼〕defs 和畫棋子用的是同一個編號（boardBG 收到的就是 uid）", () => {
  assert.match(SRC, /bgG\.innerHTML=boardBG\(T,eR,eD,uid,flip,imgK\)/);
  assert.match(SRC, /function boardBG\(T,eR,eD,u,flip,imgK\)/);
});
