// 11/17 iPhone 模擬器測試第 2 項：第一次進雲河星槎，底部說明條「🏠 這裡是阿轍的故鄉。下船到驛站，信箱裡好像多了一封信。」
//   （07q-chardiff chdHomeMark → 00-util toast）蓋住左下角的「⛵ 起航」，要等兩秒多消失才點得到。
//   修法：toast 只是說明字、裡面沒有可以點的東西 → m.css .toast 一律 pointer-events:none，點選穿過去按到底下的起航。起航、偏航的流程沒動。
// 不開瀏覽器：讀 m.css、07q、07f、00-util 的原始碼。用法：node --test xiangqi-lab/tools/test-toast-pass-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const CSS = rd("xiangqi-db/m.css"), CHD = rd("xiangqi-db/m/07q-chardiff.js"), SHIP = rd("xiangqi-db/m/07f-ship.js"), UTIL = rd("xiangqi-db/m/00-util.js");
const M = path.join(ROOT, "xiangqi-db", "m"), ALL = fs.readdirSync(M).filter(f => f.endsWith(".js")).map(f => fs.readFileSync(path.join(M, f), "utf8")).join("\n");

test("〔樣式〕.toast 讓點選穿過去（pointer-events:none）", () => {
  const r = /\n\.toast\{([^}]*)\}/.exec(CSS); assert.ok(r, "m.css 有 .toast 規則");
  assert.match(r[1], /pointer-events:none/, "toast 不攔點選");
  assert.ok(!/\n\.toast\{[^}]*pointer-events:auto/.test(CSS), "沒有別的 .toast 規則再把它打開");
});

test("〔接點〕故鄉說明是 toast（#toast，class toast），起航是星槎圖左下角的入口", () => {
  assert.ok(CHD.includes('toast("🏠 這裡是"+chdNk(c)+"的故鄉。下船到驛站，信箱裡好像多了一封信。")'), "07q chdHomeMark 用 toast 講");
  assert.ok(UTIL.includes('t.id="toast";t.className="toast"'), "00-util toast() 的元素 class 是 toast");
  assert.match(SHIP, /data-hs="sail" style="left:\d+%;top:\d+%">⛵ 起航</, "星槎圖上的起航入口");
});

test("〔安全〕沒有任何 toast 掛點選（穿過去不會讓哪顆按鈕失效）", () => {
  assert.ok(!/#toast"\)\.(onclick|addEventListener)|\$\("#toast"\)\.onclick/.test(ALL), "#toast 沒掛點選");
  const btnToast = /createElement\("button"\);t\.className="toast upd";t\.style\.cssText="[^"]*pointer-events:auto/.test(ALL);
  assert.ok(btnToast || !ALL.includes('className="toast upd"'), "唯一做成按鈕的 toast（02-shell 已停用的 if(0)）自己寫了 pointer-events:auto");
});
