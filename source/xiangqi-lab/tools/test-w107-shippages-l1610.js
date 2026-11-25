// W107-L 第 4 批：星槎船上各頁（07f 起航、書架、棋話一頁、行囊、幻影指導局）iPad 橫向專用橫式圖。條目寫在 07f 的 SHP_L1610。
// 檢查：5 頁都登記、入口 id 照原表、量好的點照 json 寫死；說明卡、木牌位置；shpScw 用真的 07sw 跑開頁、轉向、載不到退回；大字模式木牌；
// 石桌棋盤頁 #/ship/pz 換圖（四角、星光、viewBox）；m.css 橫式字級。
// 用法 node --test xiangqi-lab/tools/test-w107-shippages-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), F = M("m/07f-ship.js"), CSS = M("m.css");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const ENTRY = cut(F, "const SHP_L1610=", "board:SHP_L1610[pg].board||null}};") + "\n" + cut(F, "function shpBoardFz(o){", 'height:""}}') + "\n" + cut(F, "function shpScw(v,pg){", "apply:place});place()}");
const J = x => JSON.parse(JSON.stringify(x));
function load(dev) {
  const ctx = vm.createContext({ localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); vm.runInContext(ENTRY, ctx); return ctx;
}

test("〔混合〕條目：起航、書架、棋話、行囊、幻影指導局 5 頁都登記、檔名加 _l1610；入口 id 照原表", () => {
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
  assert.deepEqual(J(T.page_sail.S), { ssGo: [67, 78], ssBack: [67, 78], ssDb: [67, 78], ssFin: [67, 88], ssUp: [26, 80] });
  assert.deepEqual(J(T.page_shelf.S), { sb1: [30, 28], sb2: [73, 60], sb3: [37, 63] });
  assert.deepEqual(J(T.page_lesson.S), { slDemo: [24, 78], slHist: [75, 79], slRead: [51, 84] });
  assert.deepEqual(J(T.page_bag.S), { bgDiff: [26, 41], bgCx: [73, 39], bgMe: [29, 70], bgSave: [76, 71] });
  assert.deepEqual(J(T.page_sail.card), { left: "40%", right: "6%", top: "8%", maxHeight: "36%" });
  assert.deepEqual(J(T.page_canju.card), { left: "70%", right: "4%", top: "10%", maxHeight: "40%" });
  assert.deepEqual(J(T.page_lesson.board), { left: "36%", width: "29%", top: "31%", height: "30%" });
});

// 假的 #view 和頁面：寬高照 iPad（橫 1180×820、直 820×1180），讓真的 07sw scwPre／scwMount／scwSet 自己量、自己選
function fakeEl(extra) { const ds = {}, st = {}; return Object.assign({ dataset: ds, style: st, classList: { _c: new Set(), toggle(c, on) { on ? this._c.add(c) : this._c.delete(c) }, add(c) { this._c.add(c) }, contains(c) { return this._c.has(c) } } }, extra || {}) }
function stage(C, wide) {
  const sz = wide ? [1180, 820] : [820, 1180];
  C.getComputedStyle = () => ({ paddingBottom: "0", paddingLeft: "0", paddingRight: "0" });
  C.document = { documentElement: { clientHeight: sz[1], dataset: {} } }; C.innerHeight = sz[1];
  return { clientWidth: sz[0], clientHeight: sz[1], scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }) };
}
function page(C, pg, ids) {
  const img = fakeEl({ src: "", complete: true, naturalWidth: 2560, getAttribute() { return this.src }, addEventListener() { } }), card = fakeEl(), board = fakeEl(), btn = {};
  for (const id of ids) btn[id] = fakeEl();
  const P = fakeEl({ isConnected: true, querySelector: q => q === ":scope>img" ? img : q === ".shs-card" ? card : q === ".shl-board" ? board : q[0] === "#" ? btn[q.slice(1)] || null : null });
  return { P, img, card, board, btn };
}
test("〔混合〕shpScw 用真的 07sw：iPad 橫向開頁就換橫式圖、入口和說明卡照條目；轉成直向換回原圖、清掉 style；橫式圖載不到退回原圖", () => {
  const C = load(true);
  // 棋話一頁：木牌
  let V = stage(C, true), L = page(C, "page_lesson", ["slDemo", "slHist", "slRead"]);
  L.btn.slDemo.style.left = "27%"; L.btn.slDemo.style.top = "77%";
  vm.runInContext("shpScw", C)({ querySelector: () => L.P, clientWidth: V.clientWidth, clientHeight: V.clientHeight, scrollTop: 0, getBoundingClientRect: V.getBoundingClientRect }, "page_lesson");
  assert.equal(L.img.src, "data/shipmap/page_lesson_l1610.webp?v=1125", "開頁換成橫式圖");
  assert.equal(L.P.dataset.scw, "l1610"); assert.ok(L.P.classList.contains("scw-l"));
  assert.equal(L.P._scw.key, "shipmap/page_lesson"); assert.equal(L.P._scw.src0, "data/shipmap/page_lesson.webp");
  assert.equal(L.board.style.left, "36%"); assert.equal(L.board.style.width, "29%"); assert.equal(L.board.style.top, "31%"); assert.equal(L.board.style.height, "30%");
  assert.equal(L.btn.slDemo.style.left, "24%"); assert.equal(L.btn.slDemo.style.top, "78%", "入口照條目");
  vm.runInContext("scwSet", C)(L.P, "");
  assert.equal(L.img.src, "data/shipmap/page_lesson.webp", "轉直向換回原圖"); assert.equal(L.board.style.left, ""); assert.equal(L.board.style.height, "");
  assert.equal(L.btn.slDemo.style.left, "27%", "入口回原位"); assert.equal(L.btn.slDemo.style.top, "77%");
  vm.runInContext("scwSet", C)(L.P, "l1610"); assert.equal(L.board.style.left, "36%", "再轉回橫向");
  L.img.onerror(); assert.equal(L.img.src, "data/shipmap/page_lesson.webp", "載不到退回原圖"); assert.equal(L.P.dataset.scw, ""); assert.equal(L.board.style.left, "");
  // 起航：說明卡、三顆同位入口
  const C2 = load(true); V = stage(C2, true); const A = page(C2, "page_sail", ["ssGo", "ssBack", "ssDb", "ssFin", "ssUp"]);
  vm.runInContext("shpScw", C2)({ querySelector: () => A.P, clientWidth: V.clientWidth, clientHeight: V.clientHeight, scrollTop: 0, getBoundingClientRect: V.getBoundingClientRect }, "page_sail");
  assert.equal(A.card.style.left, "40%"); assert.equal(A.card.style.right, "6%"); assert.equal(A.card.style.maxHeight, "36%");
  for (const id of ["ssGo", "ssBack", "ssDb"]) assert.equal(A.btn[id].style.left + "," + A.btn[id].style.top, "67%,78%", id);
  // 直向開頁：照舊原圖、不寫 style
  const C3 = load(true); V = stage(C3, false); const D = page(C3, "page_lesson", ["slDemo"]); D.img.src = "data/shipmap/page_lesson.webp";
  vm.runInContext("shpScw", C3)({ querySelector: () => D.P, clientWidth: V.clientWidth, clientHeight: V.clientHeight, scrollTop: 0, getBoundingClientRect: V.getBoundingClientRect }, "page_lesson");
  assert.equal(D.img.src, "data/shipmap/page_lesson.webp"); assert.equal(D.P.dataset.scw, ""); assert.equal(D.board.style.left, "");
});
test("〔混合〕大字模式：橫式木牌以板面中心為準、寬度放大 58/45、top 寫中心、高度交回 CSS；一般字級照條目；m.css 字級照 --fz 放大", () => {
  const C = load(true); vm.runInContext(cut(F, "function shpBoardFz(o){", 'height:""}}'), C);
  const B = { left: "36%", width: "29%", top: "31%", height: "30%" };
  C.document = { documentElement: { dataset: {} } }; assert.deepEqual(J(vm.runInContext("shpBoardFz", C)(B)), B);
  for (const fz of ["l", "xl", "xxl", "max"]) { C.document.documentElement.dataset.fz = fz; assert.deepEqual(J(vm.runInContext("shpBoardFz", C)(B)), { left: "31.81%", width: "37.38%", top: "46.00%", height: "" }, fz) }
  C.document.documentElement.dataset.fz = "m"; assert.deepEqual(J(vm.runInContext("shpBoardFz", C)(B)), B);
  assert.match(F, /put\(P\.querySelector\("\.shl-board"\),X&&X\.board&&shpBoardFz\(X\.board\)\)/);
  assert.match(CSS, /html:is\(\[data-fz=l\],\[data-fz=xl\],\[data-fz=xxl\],\[data-fz=max\]\) \.shp-page\.scw-l \.shl-board\{font-size:calc\(1\.55cqw \* var\(--fz\)\)/);
  assert.match(CSS, /html:is\(\[data-fz=l\],\[data-fz=xl\],\[data-fz=xxl\],\[data-fz=max\]\) \.shp-page\.scw-l \.shl-board b\{font-size:calc\(2\.45cqw \* var\(--fz\)\)\}/);
});
test("〔混合〕石桌棋盤頁 #/ship/pz：iPad 橫向用橫式圖，四角、三團星光照 json；換回直圖全部還原；svg 的 viewBox 跟著換、已擺的棋子重畫；載不到退回", () => {
  const C = load(true);
  vm.runInContext(cut(F, "const PZ_TL=", ";") + "\n" + cut(F, "const SHIP_PZ_SPOT=", ";") + "\nconst PZ_CN={K:'帥'};" + cut(F, "const pzP=", "]};") + "\n" + cut(F, "function pzSvg(fen){", '.join("")}') + "\n" + cut(F, "const PZ_L1610=", 'addEventListener("resize",rs);return pre}'), C);
  const R = s => vm.runInContext(s, C), T0 = J(R("[PZ_TL,PZ_TR,PZ_BL,PZ_BR,SHIP_PZ_SPOT]"));
  assert.deepEqual(T0, [[320, 582], [697, 737], [65, 853], [453, 1065], [[17, 42], [80, 37], [64, 85]]]);
  let vb = "", src = "data/shipmap/page_canju_l1610.webp?v=1125";
  const svg = { innerHTML: "<g/>", style: {}, setAttribute: (k, x) => { vb = x } }, img = { onerror: null, getAttribute: () => src, set src(x) { src = x }, get src() { return src } };
  const spots = [0, 1, 2].map(i => ({ dataset: { i: String(i), xqTop0: "60%" }, style: {} })), pg = fakeEl({ querySelector: q => q === ":scope>img" ? img : q === "#pzSvg" ? svg : null, querySelectorAll: () => spots });
  const v = Object.assign({ querySelector: q => q === "#pzPage" ? pg : null, isConnected: true }, stage(C, true));
  C.addEventListener = (n, f) => { C._rs = f }; C.removeEventListener = () => { C._rs = null }; C.setTimeout = f => f(); C.clearTimeout = () => { };
  const pre = R("pzScw")(v);
  assert.equal(pre.k, "l1610"); assert.equal(pre.src, "data/shipmap/page_canju_l1610.webp?v=1125");
  assert.deepEqual(J(R("[PZ_TL,PZ_TR,PZ_BL,PZ_BR,SHIP_PZ_SPOT]")), [[1164, 686], [1718, 836], [798, 1028], [1367, 1285], [[21, 60], [83, 40], [84, 73]]], "照 json page_canju");
  assert.deepEqual(J(R("pzP(0,0)")), [1164, 686]); assert.deepEqual(J(R("pzP(8,9)")), [1367, 1285]);
  assert.equal(R("pzZ()"), 1.408, "棋子照橫式棋盤寬放大"); assert.match(R("pzSvg")("4k4/9/9/9/9/9/9/9/9/4K4 w"), /^<g transform="translate\(1082\.5 1156\.5\) scale\(1\.408\)/);
  // 頁面轉成直向（resize）→ pzSet 換回
  pg.dataset.scw = "l1610"; R("pzSvg")("4k4/9/9/9/9/9/9/9/9/4K4 w");
  Object.assign(v, stage(C, false));
  C._rs();
  assert.equal(pg.dataset.scw, ""); assert.equal(src, "data/shipmap/page_canju.webp"); assert.equal(vb, "0 0 768 1376"); assert.equal(svg.style.aspectRatio, "768/1376");
  assert.deepEqual(J(R("[PZ_TL,PZ_TR,PZ_BL,PZ_BR,SHIP_PZ_SPOT]")), T0, "換回直圖全部還原");
  assert.equal(R("pzZ()"), 1); assert.doesNotMatch(svg.innerHTML, /transform/, "直圖棋子跟原本一樣");
  assert.equal(spots[1].style.left + "," + spots[1].style.top, "80%,37%");
  assert.equal(spots[1].dataset.xqTop0, undefined, "清掉 00-util 記的舊 top（不然又被放回橫式的值）");
  assert.match(svg.innerHTML, /<ellipse cx="259" cy="965.7"/, "棋子照直圖四角重畫（帥 u4v9＝底線 BL、BR 的中點 (259,959)）");
  R("pzSet")(v, "l1610"); assert.equal(src, "data/shipmap/page_canju_l1610.webp?v=1125"); assert.equal(vb, "0 0 2560 1600"); assert.equal(spots[2].style.left, "84%");
  img.onerror(); assert.equal(src, "data/shipmap/page_canju.webp", "載不到退回直圖"); assert.equal(R("SCW_BAD['shipmap/page_canju']"), 1);
  assert.match(F, /const k=shipHere\(\),T=SHIP_STOP\[k\]\|\|\{\},pzPre=pzScw\(v\),\[pzW,pzH\]=pzVB\(!!pzPre\.k\);/);
  assert.match(F, /id="pzPage" data-scw="\$\{pzPre\.k\}"><img src="\$\{pzPre\.src\}" alt="星槎石桌"><svg class="pz-svg" viewBox="0 0 \$\{pzW\} \$\{pzH\}" style="aspect-ratio:\$\{pzW\}\/\$\{pzH\}"/);
});

test("〔原始碼〕5 頁都掛 shpScw；m.css 橫式字級縮小", () => {
  for (const pg of ["page_sail", "page_shelf", "page_lesson", "page_bag", "page_canju"]) assert.equal((F.match(new RegExp('try\\{shpScw\\(v,"' + pg + '"\\)\\}catch\\(e\\)\\{\\}', "g")) || []).length, 1, pg);
  assert.match(CSS, /\.shp-page\.scw-l \.shl-board\{gap:\.32cqw;font-size:1\.55cqw\}/); assert.match(CSS, /\.shp-page\.scw-l \.shs-card\{padding:1\.6cqw 2\.2cqw;font-size:1\.7cqw\}/);
});
