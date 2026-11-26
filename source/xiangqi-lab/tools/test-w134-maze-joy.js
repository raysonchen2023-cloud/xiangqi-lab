// W134（開發者 11/26「重新設計地底迷宮的方向鍵，太醜了，不直觀也怪怪的」，選「B 虛擬搖桿」）：xiangqi-db/m/07z9m-joy.js。
// 不開瀏覽器：純計算 jhMzJoyDir、jhMzJoySide 丟進 vm 跑；另外查迷宮頁有掛上搖桿、原本的方向鈕和鍵盤處理還在。
// 測試名稱照規定標類別：只檢查原始碼文字的加〔原始碼〕；真的執行邏輯的不加。
// 用法：node --test xiangqi-lab/tools/test-w134-maze-joy.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const DB = path.join(__dirname, "..", "..", "xiangqi-db");
const M = p => fs.readFileSync(path.join(DB, p), "utf8").replace(/\r\n/g, "\n");
const SRC = M("m/07z9m-joy.js"), MAZE = M("m/07z9m-maze.js"), HTML = M("m.html");
const ctx = vm.createContext({ Math, Object });
vm.runInContext(SRC, ctx);
const dir = vm.runInContext("jhMzJoyDir", ctx), side = vm.runInContext("jhMzJoySide", ctx), J = JSON.parse(JSON.stringify(vm.runInContext("JH_MZ_JOY", ctx)));
const at = (deg, r) => [Math.cos(deg * Math.PI / 180) * r, Math.sin(deg * Math.PI / 180) * r];

test("中間死區不算推：拇指剛按下、還沒推出去不會走", () => {
  assert.equal(dir(0, 0, false, null), null);
  assert.equal(dir(...at(30, J.DEAD - 1), false, null), null);
  assert.equal(dir(...at(30, J.DEAD - 1), true, "u"), null, "推回中間＝放開，原本的方向也不留");
  assert.notEqual(dir(...at(30, J.DEAD + 1), false, null), null);
});

test("平面版：上下左右（畫面座標往下為正）", () => {
  const R = 50;
  assert.equal(dir(...at(-90, R), false, null), "u");
  assert.equal(dir(...at(0, R), false, null), "r");
  assert.equal(dir(...at(90, R), false, null), "d");
  assert.equal(dir(...at(180, R), false, null), "l");
  assert.equal(dir(...at(-60, R), false, null), "u", "偏一點還是往上");
  assert.equal(dir(...at(-30, R), false, null), "r");
});

test("斜俯視：北在右上、東在右下、南在左下、西在左上（跟畫面上的菱形格子同方向）", () => {
  const R = 50;
  assert.equal(dir(...at(-45, R), true, null), "u");
  assert.equal(dir(...at(45, R), true, null), "r");
  assert.equal(dir(...at(135, R), true, null), "d");
  assert.equal(dir(...at(-135, R), true, null), "l");
  assert.equal(dir(...at(-90, R), true, "u"), "u", "正上方剛好在交界：維持原方向");
  assert.equal(dir(...at(-90, R), true, "l"), "l");
});

test("換方向有黏性：在交界附近抖動不會一直換，推過交界夠多才換", () => {
  const R = 50, hysDeg = J.HYS * 180 / Math.PI;
  assert.equal(dir(...at(-90 + 45 + hysDeg / 2, R), false, "u"), "u", "剛過交界一點點：維持往上");
  assert.equal(dir(...at(-90 + 45 + hysDeg + 2, R), false, "u"), "r", "過交界超過黏性：換成往右");
  assert.equal(dir(...at(-90 + 45 + hysDeg / 2, R), false, null), "r", "剛按下沒有原方向：照最近的");
});

test("橫的畫面放右下（右手拇指），直的放左下", () => {
  assert.equal(side(390, 844), "l");
  assert.equal(side(820, 1180), "l");
  assert.equal(side(1180, 820), "r");
  assert.equal(side(844, 390), "r");
  assert.equal(side(500, 400), "l", "很小的橫窗（分割畫面）照直的放");
});

test("〔原始碼〕迷宮頁掛上搖桿；原本的方向鈕、鍵盤方向鍵照舊；m.html 在迷宮後面載入", () => {
  assert.match(MAZE, /const joy=typeof jhMzJoy==="function"\?jhMzJoy\(v,\{iso:\(\)=>!!h3,go:k=>\{if\(DIR\[k\]\)go\(DIR\[k\]\)\},stop:\(\)=>\{held=null\}\}\):null;/);
  assert.match(MAZE, /isoPad\(true\);try\{if\(joy\)joy\.arrows\(\)\}catch\(e\)\{\}/);
  assert.match(MAZE, /v\.querySelectorAll\("\.jh-mz-pad button"\)\.forEach/, "四顆方向鈕的處理還在（給旁白、切換控制）");
  assert.match(MAZE, /const keys=\{ArrowUp:DIR\.u,ArrowDown:DIR\.d,ArrowLeft:DIR\.l,ArrowRight:DIR\.r\}/, "鍵盤方向鍵照舊");
  assert.ok(HTML.indexOf("//#include m/07z9m-joy.js") > HTML.indexOf("//#include m/07z9m-maze.js"));
  assert.match(SRC, /\.jh-mz\.joy \.jh-mz-pad\{position:absolute;width:1px;height:1px/, "方向鈕收到畫面外，不是 display:none（旁白還念得到）");
  assert.match(SRC, /setAttribute\("aria-hidden","true"\)/, "搖桿本身不進旁白（旁白用方向鈕）");
  assert.equal(/(^|[^:"'])\/\/(?!#)/m.test(SRC.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "")), false, "07z9m-joy.js 裡不要有 // 註解");
});
