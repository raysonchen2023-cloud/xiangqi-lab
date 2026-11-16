// 11/16 出入口盤查：黑洞只剩星門圍城以後，打贏只寫進存檔 gsv（07sg2 sg2End），觀星臺的解鎖（07gxt gxtOpen）原本只看 bhWin、bhtd，新玩家永遠看不到觀星臺。
// 不開瀏覽器：模組丟進 vm，用假的 store 驗 gxtOpen；再查 sg2End 確實把勝場寫進 gsv 的 c／h／v2（解鎖看的就是這幾個）。
// 用法 node --test xiangqi-lab/tools/test-gxt-unlock-1116.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = p => fs.readFileSync(path.join(ROOT, "xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC = M("m/07gxt-guanxing.js"), SG2 = M("m/07sg2-siege2.js");
function load(st, g) {
  const ctx = vm.createContext(Object.assign({ setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, addEventListener: () => { }, isFinite, Math, Object, String, JSON, Date,
    store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } } }, g || {}));
  vm.runInContext(SRC, ctx); return ctx;
}

test("星門圍城任何一關贏過（易中記在 c、難記在 h、各難度記在 v2）觀星臺就出現", () => {
  assert.equal(load({ gsv: { mv: 2, c: { 3: { w: 1, l: 0, d: 0 } }, h: {}, g: [] } }).gxtOpen(), true, "易／中贏過第 3 關");
  assert.equal(load({ gsv: { c: {}, h: { 5: { w: 2 } } } }).gxtOpen(), true, "難贏過第 5 關");
  assert.equal(load({ gsv: { c: {}, h: {}, v2: { 31: { 1: { w: 1, l: 0, d: 0, st: [1, 0, 0] } } } } }).gxtOpen(), true, "序章第一關（v2）贏過");
});

test("只輸過、和過、什麼都沒打，觀星臺都不出現；舊的解鎖條件照舊", () => {
  assert.equal(load({ gsv: { c: { 1: { w: 0, l: 3, d: 1 } }, h: {}, v2: { 1: { 2: { w: 0, l: 2 } } } } }).gxtOpen(), false, "只輸過、和過");
  assert.equal(load({ gsv: null }).gxtOpen(), false);
  assert.equal(load({ gsv: "壞掉的存檔" }).gxtOpen(), false);
  assert.equal(load({}).gxtOpen(), false);
  assert.equal(load({ bhWin: 1 }).gxtOpen(), true, "舊玩家 bhWin 照舊");
  assert.equal(load({ bhtd: { c: { 2: 1 } } }).gxtOpen(), true, "舊玩家塔防破關照舊");
  assert.equal(load({}, { DEVMODE: () => true }).gxtOpen(), false, "開發者模式不再一律看得到");
  assert.equal(load({}, { DEVUNLOCK: () => true }).gxtOpen(), true, "測試台「全部解鎖試玩」");
});

test("〔原始碼〕sg2End 把勝場寫進 gsv 的 c／h（易、中進 c，難進 h）和 v2，存檔鍵是 gsv", () => {
  const i = SG2.indexOf("function sg2End("), body = SG2.slice(i, SG2.indexOf("\nfunction ", i + 10));
  assert.ok(i > 0, "07sg2 有 sg2End");
  assert.match(body, /T=d===3\?P\.h:P\.c/, "難進 h、其他進 c");
  assert.match(body, /O\.w\+\+/, "贏了 w 加一");
  assert.match(body, /P\.v2\[n\]\[d\]/, "v2 記各關各難度");
  assert.match(body, /store\.set\("gsv",P\)/, "存檔鍵 gsv");
});
