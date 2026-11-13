// 11/13 hspx 1098 開發者 iPhone 截圖：英文模式設定房間的入口標籤 Board preview／Font and language／🔒 疊在一起，「🔇 Tap anywhere to enable sound」蓋住頂欄「第 2 天」那行。
// 修法：新模組 xiangqi-db/m/07sp-spotfit.js（場景標籤畫好後量框、交疊就上下推開，用 CSS translate）；01-board.js 的 sndPillAt 非對局頁一律放在頂欄下緣下面、不換行。
// 這裡用假元素（只有框）把 spfFit 原樣拿來跑：用法 node --test xiangqi-lab/tools/test-spotfit.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC = M("m/07sp-spotfit.js");
const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, addEventListener: () => { } });
vm.runInContext(SRC, ctx);
const { spfFit } = ctx;

// 假標籤：base＝原位框；translate 照 style.translate 的第二個值上下移
function spot(x, y, w, h, t) {
  const b = { t, base: { x, y, w, h }, style: { translate: "" }, dataset: {}, getClientRects: () => [1],
    getBoundingClientRect() { const m = /^0 (-?[\d.]+)px$/.exec(b.style.translate), d = m ? +m[1] : 0; return { left: x, top: y + d, width: w, height: h, right: x + w, bottom: y + d + h } } };
  return b;
}
function page(bs, H = 800, W = 400, scale = 1) {
  return { offsetHeight: H, querySelectorAll: () => bs, getBoundingClientRect: () => ({ left: 0, top: 0, width: W * scale, height: H * scale, right: W * scale, bottom: H * scale }) };
}
const R = b => b.getBoundingClientRect();
const overlaps = bs => { const o = []; for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) { const a = R(bs[i]), c = R(bs[j]); if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 1 && Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 1) o.push(bs[i].t + "⟷" + bs[j].t) } return o };

test("開發者截圖那一團（402 寬英文）：Board preview、Font and language、🔒 推開後互不交疊，其他沒碰到的不動", () => {
  const bs = [spot(137, 300, 129, 24, "Board preview"), spot(232, 304, 155, 24, "Font and language"), spot(356, 317, 44, 24, "🔒"), spot(2, 136, 136, 24, "Dynasty colors"), spot(176, 442, 95, 24, "Ambience"), spot(264, 449, 109, 24, "Voice calls")];
  assert.ok(overlaps(bs).length >= 3, "測試資料一開始就要有重疊");
  const n = spfFit(page(bs));
  assert.ok(n >= 3);
  assert.deepEqual(overlaps(bs), []);
  assert.equal(bs[3].style.translate, "", "沒疊到的不動");
  for (const b of bs) assert.ok(R(b).top >= 0 && R(b).bottom <= 800, b.t + " 推出畫面了");
});
test("推移量從目前位置扣回原位算：再跑一次不改任何東西（不會抖）；原本就沒疊的一律不寫", () => {
  const bs = [spot(100, 300, 150, 30, "A"), spot(120, 310, 150, 30, "B")];
  const P = page(bs); spfFit(P);
  const t0 = bs.map(b => b.style.translate);
  assert.equal(spfFit(P), 0); assert.equal(spfFit(P), 0);
  assert.deepEqual(bs.map(b => b.style.translate), t0);
  const far = [spot(10, 10, 100, 30, "X"), spot(10, 200, 100, 30, "Y")];
  assert.equal(spfFit(page(far)), 0); assert.deepEqual(far.map(b => b.style.translate), ["", ""]);
});
test("左右沒交疊的同一列不推；貼在上下緣的往內收、不推出場景頁", () => {
  const row = [spot(0, 100, 100, 30, "L"), spot(120, 105, 100, 30, "R")];
  assert.equal(spfFit(page(row)), 0);
  const edge = [spot(50, 2, 120, 30, "上"), spot(60, 12, 120, 30, "下")];
  spfFit(page(edge));
  assert.deepEqual(overlaps(edge), []);
  for (const b of edge) assert.ok(R(b).top >= 0, b.t);
});
test("場景頁被兩指縮放（畫面框是 offsetHeight 的 2 倍）時，寫進去的推移量換回未縮放的 px", () => {
  const bs = [spot(100, 600, 150, 60, "A"), spot(120, 620, 150, 60, "B")];
  const P = page(bs, 800, 400, 2);
  // 假元素的 translate 不會被縮放，所以只看寫入值：兩個合計推開量（未縮放）約等於 (交疊 40＋縫 4)/2
  spfFit(P);
  const d = bs.map(b => +(/^0 (-?[\d.]+)px$/.exec(b.style.translate) || [0, 0])[1]);
  assert.ok(Math.abs(d[1] - d[0] - 22) < 1.5, "推開量 " + d.join("／"));
});
test("原始碼：m.html 有引入 07sp（在 07i18n 之後）；只用 translate、不動 transform／margin；聲音提示放在頂欄下、不換行", () => {
  const H = M("m.html"), a = H.indexOf("//#include m/07i18n.js"), b = H.indexOf("//#include m/07sp-spotfit.js");
  assert.ok(a > 0 && b > a);
  assert.ok(!/style\.(transform|margin)/.test(SRC.slice(0, SRC.indexOf("function spfShip"))), ".shp-spot 那段（spfFit）只用 translate；星槎 .shp-hs（spfShip）刻意用 marginTop，見下面星槎的測試");
  assert.match(SRC, /MutationObserver/); assert.match(SRC, /characterData:true/);
  const B = M("m/01-board.js");
  assert.match(B, /querySelectorAll\("\.topbar"\)[^\n]*p\.style\.top=Math\.round\(t\+8\)/);
  assert.match(B, /#sndPill\{[^}]*white-space:nowrap/);
});

// 11/13 hspx 開發者「盤查圖示和文字換行的問題，這樣很醜，直接一行，但也要避免跟別人重疊的邊界風險」：星槎甲板的 .shp-hs
function hs(x, y, w, h, t, mt) {
  const b = { t, style: { marginTop: mt || "", translate: "" }, dataset: {}, getClientRects: () => [1],
    getBoundingClientRect() { const d = parseFloat(b.style.marginTop) || 0; return { left: x, top: y + d, width: w, height: h, right: x + w, bottom: y + d + h } } };
  return b;
}
const shipMap = (bs, H = 800, cap = 0) => ({ isConnected: true, getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: H, right: 400, bottom: H }),
  querySelector: s => s === ".shp-cap" ? { offsetHeight: cap } : null, querySelectorAll: () => bs });
test("星槎標籤（.shp-hs）：疊到的用 marginTop 上下推開；保留 07f 原本夾邊的 marginTop；重算不越推越遠；不推進標題列", () => {
  const { spfShip } = ctx;
  const bs = [hs(120, 470, 140, 30, "千秋殘局"), hs(150, 480, 120, 30, "天字客房", "6px"), hs(10, 10, 100, 30, "遠的")];
  assert.ok(overlaps(bs).length >= 1);
  assert.ok(spfShip(shipMap(bs)) >= 2);
  assert.deepEqual(overlaps(bs), []);
  assert.equal(bs[2].style.marginTop, "", "沒疊到的不動");
  const m1 = bs.map(b => b.style.marginTop);
  assert.equal(spfShip(shipMap(bs)), 0, "再算一次不變"); assert.deepEqual(bs.map(b => b.style.marginTop), m1);
  const add = +bs[1].dataset.spfM; assert.equal(parseFloat(bs[1].style.marginTop), 6 + add, "原本夾邊的 6px 留著，自己加的另外記在 data-spf-m");
  const top = [hs(50, 60, 120, 30, "上"), hs(60, 66, 120, 30, "下")]; spfShip(shipMap(top, 800, 50));
  for (const b of top) assert.ok(R(b).top >= 50 + 8 - 0.5, b.t + " 不推進標題列（.shp-cap）");
});
test("原始碼：圖示不再被 .shp-map img 撐成一整行；07f shpMapFit／07x zmShipPush 排完之後才推；百科拿掉「再看一次開箱」；清弦圖不用五線譜", () => {
  const CSS = M("m.css");
  assert.ok(CSS.includes(".shp-map img:not(.eic){display:block;width:100%;height:auto}"), "大圖照舊，小圖示排除");
  assert.ok(!/\.shp-map img\{display:block/.test(CSS), "舊的寫法不能留著");
  assert.match(SRC, /if\(typeof shpMapFit==="function"\)\{const f0=shpMapFit;shpMapFit=function/);
  assert.match(SRC, /if\(typeof zmShipPush==="function"\)\{const f1=zmShipPush;zmShipPush=function/);
  const H = M("m.html"); assert.ok(H.indexOf("//#include m/07sp-spotfit.js") > H.indexOf("//#include m/07x-zoom.js") && H.indexOf("//#include m/07sp-spotfit.js") > H.indexOf("//#include m/07f-ship.js"), "07sp 要排在 07f、07x 後面才包得到");
  const CX = M("m/07i-codex.js"); assert.ok(!CX.includes('id="cxReplay"') && !CX.includes("再看一次開箱</button>"), "再看一次開箱拿掉了");
  const W = M("m/07u-women.js"); assert.ok(!W.includes("🎼"), "清弦圖不再用西洋五線譜圖示"); assert.match(W, /rel:"清弦帛書",ic:"📜"/);
});

test("書房亮格：經典世界換成 _classic 圖（768×1376）時用經典版自己量的格線，換算回原版座標（hspx 11/13 藍色破圖）", () => {
  const Z = M("m/07z4-studymap.js");
  const g = new Function(Z.split("\n").filter(l => /^const (MZ_W|MZ_CX|mzGrid|MZ_CELLS|MZ_CELLS_CL)\b/.test(l) || l.startsWith("const MZ_W=")).join("\n") + ";return{MZ_CELLS,MZ_CELLS_CL,MZ_W,MZ_H}")();
  assert.equal(g.MZ_CELLS.length, 12); assert.equal(g.MZ_CELLS_CL.length, 12);
  const pct = (c, W, H) => [c[0] / W, c[1] / H, c[2] / W, c[3] / H].map(v => Math.round(v * 1000) / 1000);
  assert.deepEqual(pct(g.MZ_CELLS_CL[0], g.MZ_W, g.MZ_H), pct([51, 445, 118, 533], 768, 1376), "左上格：經典圖的百分比位置");
  assert.deepEqual(pct(g.MZ_CELLS_CL[11], g.MZ_W, g.MZ_H), pct([258, 623, 324, 708], 768, 1376), "右下格");
  assert.ok(g.MZ_CELLS_CL[0][1] > g.MZ_CELLS[0][1] * 1.2, "經典版櫃子比較低（原本整排往上錯位）");
  assert.match(Z, /CELLS=\/_classic\\.webp\/\.test\(src\)\?MZ_CELLS_CL:MZ_CELLS,/, "照實際用的圖挑格線");
  assert.match(Z, /<div class="mz-g">\$\{CELLS\.map\(/); assert.match(Z, /const c=CELLS\[i\];/);
});
