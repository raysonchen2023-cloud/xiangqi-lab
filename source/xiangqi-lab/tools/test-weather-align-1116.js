// 開發者 11/16（船艙截圖）：「這邊的天氣錯了，要跟首頁對齊天氣」
//   m/07w7-seasons.js sw7Rg：雲河自己的地方（船艙渡口 portClassic、船艙驛站 yz_classic、航線圖 shipMap、甲板 shipDeck，rg "cl"）一律跟首頁同一個地區；
//   雨雪是用「日期＋地區」當種子算的（sw7Precip），地區一樣＝同一時間同一種天氣。首頁停靠某一朝時跟那一朝渡口走（原本的規則），雲河這幾頁也跟著。
// 這裡把 07w7 的 SW7_PAGES～sw7Rg 那一段放進 vm 跑（不碰畫面）。
// 用法：node --test xiangqi-lab/tools/test-weather-align-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07w7-seasons.js"), "utf8").replace(/\r\n/g, "\n");

function load(dock) {
  const a = SRC.indexOf("const SW7_PAGES="), b = SRC.indexOf("function sw7WxFor(");
  assert.ok(a > 0 && b > a, "07w7 有 SW7_PAGES、sw7Rg");
  const ctx = { hbDockEra: () => dock || "" }; vm.createContext(ctx);
  vm.runInContext(SRC.slice(a, b) + "\n;this.__X={SW7_PAGES,sw7Rg};", ctx); return ctx.__X;
}
const P = (X, k) => X.SW7_PAGES.find(x => x.k === k);

test("〔行為〕雲河的地方（船艙渡口、船艙驛站、航線圖、甲板）跟首頁同一個地區", () => {
  for (const dock of ["", "classic", "qin", "han"]) {
    const X = load(dock), home = X.sw7Rg(P(X, "home"));
    for (const k of ["portClassic", "yz_classic", "shipMap", "shipDeck"]) assert.equal(X.sw7Rg(P(X, k)), home, `停靠「${dock || "沒有"}」時 ${k} 跟首頁一樣`);
  }
  assert.equal(load("qin").sw7Rg(P(load("qin"), "portClassic")), "n", "停在秦：首頁跟秦渡口（北方），船艙也跟著");
  assert.equal(load("").sw7Rg(P(load(""), "portClassic")), "s", "沒停靠：首頁南方，船艙也是");
});

test("〔行為〕別朝自己的渡口照舊用自己的地區", () => {
  const X = load("qin");
  assert.equal(X.sw7Rg(P(X, "port_han")), "nw", "漢渡口照舊西北");
  assert.ok(SRC.includes('if(o.rg==="cl"){const h=SW7_PAGES.find(x=>x.k==="home");if(h&&h!==o)return sw7Rg(h)}'));
});
