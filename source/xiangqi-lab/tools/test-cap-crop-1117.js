// 11/17 Windows 測試員 B-11（P3）：起航頁、棋話頁、星槎頁左上的站名被切或被擋。
//   ① 起航頁「現在停靠：秦」的「現」被切掉、棋話頁「秦・咸陽直道」只剩半邊：手機上 07t3 ttFill 把直式場景圖補滿高度（tt-fillx），圖比畫面寬、左右各裁一截
//      （P 的 marginLeft 是負的）；圖上的標籤會推回看得到的範圍，左上角的站名條 .shp-cap 卻還貼著圖的左緣。
//      修法：ttFill 記下裁掉的寬度 --ttCx（ttCapX），#view.tt-fillx .shp-page>.shp-cap 左右各縮回那一截。
//   ② 星槎頁停靠資訊被「🏠 阿轍的故鄉」標籤擋住：07q chdHomeMark 把標記疊在星槎圖右上角（right:10px top:10px），站名條是整條寬的。
//      修法：chdHomePut 把標記放進站名條最後一行（.in-cap，position:static），沒有站名條才照舊貼右上角。
// 不開瀏覽器：vm 跑 ttCapX、用假的 #view／圖框跑 ttFill；chdHomePut 用假元素。用法：node --test xiangqi-lab/tools/test-cap-crop-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const T3 = rd("xiangqi-db/m/07t3-tabtube.js"), CHD = rd("xiangqi-db/m/07q-chardiff.js");
const grab = (S, head) => { const L = S.split("\n"), i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n") };

/* 假的 #view（手機 375 寬、可用高 760）＋圖框（768×1376 的圖照寬放只有 672 高 → 要補滿高度、左右裁） */
function fillKit(src) {
  const props = {}, cls = new Set(), st = {};
  const P = { isConnected: true, style: Object.assign(st, { setProperty: (k, v) => { props[k] = v }, removeProperty: k => { delete props[k] } }), dataset: {},
    querySelector: () => im, querySelectorAll: () => [], getBoundingClientRect: () => ({ top: 0, left: 0, width: 375, height: 672 }) };
  const im = { complete: true, naturalWidth: 768, naturalHeight: 1376, addEventListener() { } };
  const V = { clientHeight: 760, scrollHeight: 760, classList: { add: c => cls.add(c), remove: c => cls.delete(c) }, querySelector: () => P, getBoundingClientRect: () => ({ top: 0, left: 0, right: 375, width: 375 }) };
  const ctx = { document: { getElementById: id => id === "view" ? V : null }, getComputedStyle: () => ({ paddingBottom: "0" }), TABTUBE_ON: true, r07Wide: () => false, r07Off() { }, requestAnimationFrame() { } };
  vm.createContext(ctx);
  vm.runInContext((src || [grab(T3, "const ttCapX="), grab(T3, "function ttFill(")].join("\n")) + ";this.ttFill=ttFill;", ctx);
  ctx.ttFill();
  return { props, cls, st };
}

test("〔純計算〕ttCapX：圖比畫面寬就回一邊裁掉多少；沒有比較寬回 0", () => {
  const c = vm.createContext({}); vm.runInContext(grab(T3, "const ttCapX=") + ";this.f=ttCapX;", c);
  assert.equal(c.f(375, 424), 24, "跟 marginLeft 一樣的取整（-24.5 → -24）"); assert.equal(c.f(375, 425), 25); assert.equal(c.f(375, 375), 0); assert.equal(c.f(375, 300), 0);
});

test("〔行為〕手機補滿高度：圖左右裁掉，站名條記下同樣的寬度（--ttCx），CSS 用它縮回看得到的範圍", () => {
  const K = fillKit();
  assert.ok(K.cls.has("tt-fillx"), "有補滿高度");
  const w = parseFloat(K.st.width), ml = parseFloat(K.st.marginLeft);
  assert.ok(w > 375 && ml < 0, "圖比畫面寬、往左拉");
  assert.equal(K.props["--ttCx"], -ml + "px");
  assert.equal(parseFloat(K.props["--ttCx"]), -ml, "站名條縮回的量＝圖往左拉出去的量（左緣對齊畫面左緣）");
  assert.ok(T3.includes("#view.tt-fillx .shp-page>.shp-cap{left:var(--ttCx,0px);right:var(--ttCx,0px)}"));
});

test("〔對照〕拿掉修補（舊 ttFill）就沒有 --ttCx，站名條還貼著被裁掉的圖左緣", () => {
  const old = grab(T3, "function ttFill(").replace('P.style.removeProperty("--ttCx");', "").replace(';P.style.setProperty("--ttCx",ttCapX(W,w)+"px")', "");
  assert.notEqual(old, grab(T3, "function ttFill("));
  const K = fillKit(old); assert.ok(K.cls.has("tt-fillx")); assert.equal(K.props["--ttCx"], undefined);
});

function capKit(withCap) {
  const kids = [], capKids = [], cl = new Set();
  const cap = { append: d => capKids.push(d) };
  const m = { querySelector: s => withCap && s === ":scope>.shp-cap" ? cap : null, append: d => kids.push(d) };
  const d = { classList: { add: c => cl.add(c) } };
  const c = vm.createContext({}); vm.runInContext(grab(CHD, "function chdHomePut(") + ";this.f=chdHomePut;", c); c.f(m, d);
  return { kids, capKids, cl };
}

test("〔星槎頁〕「🏠 某某的故鄉」放進站名條最後一行，不再疊在右上角擋住停靠資訊；沒有站名條照舊貼圖上", () => {
  const A = capKit(true); assert.equal(A.capKids.length, 1); assert.equal(A.kids.length, 0); assert.ok(A.cl.has("in-cap"));
  const B = capKit(false); assert.equal(B.kids.length, 1); assert.ok(!B.cl.has("in-cap"));
  assert.ok(CHD.includes(".chd-home.in-cap{position:static;align-self:flex-start;margin-top:4px}"));
  assert.ok(CHD.includes('d.textContent="🏠 "+chdNk(c)+"的故鄉";chdHomePut(m,d);'));
  assert.match(rd("xiangqi-db/m/07f-ship.js"), /<div class="hc shp-cap"><b>⛵ \$\{esc\(shipShort\(k\)\)\}・/, "前提：星槎頁的站名條是 .shp-map.full 底下的 .shp-cap");
});
