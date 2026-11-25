// W107-L 第 4 批：星槎船上各頁（07f 起航、書架、棋話一頁、行囊、幻影指導局）iPad 橫向專用橫式圖。條目寫在 07f 的 SHP_L1610。
// 檢查：5 頁都登記、入口 id 照原表、量好的點照 json 寫死；說明卡、木牌位置；shpScw 掛在 5 頁、place 換回原圖時清掉 style；m.css 橫式字級縮小。
// 用法 node --test xiangqi-lab/tools/test-w107-shippages-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), F = M("m/07f-ship.js"), CSS = M("m.css");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const ENTRY = cut(F, "const SHP_L1610=", "board:SHP_L1610[pg].board||null}};") + "\n" + cut(F, "function shpScw(v,pg){", "apply:place});place()}");
const J = x => JSON.parse(JSON.stringify(x));
function load(dev) {
  const ctx = vm.createContext({ localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); vm.runInContext(ENTRY, ctx); return ctx;
}

test("條目：起航、書架、棋話、行囊、幻影指導局 5 頁都登記、檔名加 _l1610；入口 id 照原表", () => {
  const C = load(), SCW = vm.runInContext("SCW", C);
  const want = { page_sail: ["ssGo", "ssBack", "ssDb", "ssFin", "ssUp"], page_shelf: ["sb1", "sb2", "sb3"], page_lesson: ["slDemo", "slHist", "slRead"], page_bag: ["bgDiff", "bgCx", "bgMe", "bgSave"], page_canju: [] };
  for (const [pg, ids] of Object.entries(want)) {
    const e = SCW["shipmap/" + pg]; assert.ok(e, pg); assert.equal(e.f, "shipmap/" + pg + "_l1610"); assert.equal(e.ready, true);
    assert.deepEqual(Object.keys(e.S).sort(), ids.slice().sort(), pg + " 入口");
    for (const id of ids) { assert.match(F, new RegExp('\\["' + id + '",'), pg + " 原表有 " + id); const p = e.S[id]; assert.ok(p[0] > e.safe.l * 100 - 1 && p[0] < 100 - e.safe.r * 100 + 1 && p[1] > 0 && p[1] < 100, pg + " " + id + " 在安全區") }
  }
});

test("量好的點照 json 寫死（抄錯就紅）；說明卡、木牌的位置", () => {
  const C = load(), T = vm.runInContext("SHP_L1610", C);
  assert.deepEqual(J(T.page_sail.S.ssGo), [67, 78]); assert.deepEqual(J(T.page_sail.S.ssFin), [67, 88]); assert.deepEqual(J(T.page_sail.S.ssUp), [26, 80]);
  assert.deepEqual(J(T.page_shelf.S), { sb1: [30, 28], sb2: [73, 60], sb3: [37, 63] });
  assert.deepEqual(J(T.page_lesson.S), { slDemo: [24, 78], slHist: [75, 79], slRead: [51, 84] });
  assert.deepEqual(J(T.page_bag.S), { bgDiff: [26, 41], bgCx: [73, 39], bgMe: [29, 70], bgSave: [76, 71] });
  assert.deepEqual(J(T.page_sail.card), { left: "40%", right: "6%", top: "8%", maxHeight: "36%" });
  assert.deepEqual(J(T.page_canju.card), { left: "70%", right: "4%", top: "10%", maxHeight: "40%" });
  assert.deepEqual(J(T.page_lesson.board), { left: "36%", width: "29%", top: "31%", height: "30%" });
});

test("shpScw：橫式圖時說明卡、木牌照條目寫在 style；換回原圖清掉（交回 CSS）", () => {
  const C = load(true);
  const st = () => ({}), card = { style: st() }, board = { style: st() }, img = { src: "data/shipmap/page_lesson.webp" };
  const P = { _scw: { key: "shipmap/page_lesson" }, dataset: { scw: "l1610" }, classList: { add() { } }, querySelector: q => q === ":scope>img" ? img : q === ".shs-card" ? card : q === ".shl-board" ? board : null };
  C.scwPre = () => ({ src: "x", k: "" }); C.scwMount = (p, o) => { C._o = o };
  vm.runInContext("shpScw", C)({ querySelector: () => P }, "page_lesson");
  assert.equal(board.style.left, "36%"); assert.equal(board.style.width, "29%"); assert.equal(board.style.height, "30%");
  assert.deepEqual(J(C._o.ids).sort(), ["slDemo", "slHist", "slRead"]);
  P.dataset.scw = ""; C._o.apply(); assert.equal(board.style.left, "", "換回原圖清掉"); assert.equal(board.style.width, "");
});

test("〔原始碼〕5 頁都掛 shpScw；石桌棋盤頁 #/ship/pz 不掛；m.css 橫式字級縮小", () => {
  for (const pg of ["page_sail", "page_shelf", "page_lesson", "page_bag", "page_canju"]) assert.equal((F.match(new RegExp('try\\{shpScw\\(v,"' + pg + '"\\)\\}catch\\(e\\)\\{\\}', "g")) || []).length, 1, pg);
  assert.match(F, /id="pzPage"><img src="data\/shipmap\/page_canju\.webp"/, "石桌棋盤頁照舊直圖（長捲動頁、沒有 cq）");
  assert.match(CSS, /\.shp-page\.scw-l \.shl-board\{gap:\.32cqw;font-size:1\.55cqw\}/); assert.match(CSS, /\.shp-page\.scw-l \.shs-card\{padding:1\.6cqw 2\.2cqw;font-size:1\.7cqw\}/);
});
