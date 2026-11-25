// W107-L 第 2 批：千秋盃頁（07y7「說書台」）iPad 橫向專用橫式圖。條目寫在 07y7 自己（CP2_L1610），經典、原圖、漢、唐、魏晉 5 張共用。
// 檢查：5 張都登記進 07sw 的 SCW；屏風、大掛板、英雄帖、燈、綵球跟原本常數同格式、在圖內、左右順序對；右燈不蓋大掛板；
// cp2Geo 照當下的圖給座標組（走 07sw 真正的 scwCur）；開頁照 scwPre 選圖、掛 scwMount（apply＝draw）。
// 用法 node --test xiangqi-lab/tools/test-w107-cupmap-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), Y7 = M("m/07y7-cupmap.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const PRE = ["const CP2_SCR=", "const CP2_BRD=", "const CP2_BOOK=", "const CP2_LAMP="].map(a => cut(Y7, a, ";")).join("\n") + "\n";
const ENTRY = cut(Y7, "const CP2_L1610=", 'base:"cupmap/cup_day_classic"})}') + "\n" + cut(Y7, "const cp2Geo=", "BALL:F?F.ball:CP2_BALL}};");
function load(dev) {
  const ctx = vm.createContext({ localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); vm.runInContext(PRE + ENTRY, ctx);
  return ctx;
}
const frame = (key, wide) => ({ _scw: { key }, dataset: { scw: wide ? "l1610" : "" } });

test("條目：經典、原圖、漢、唐、魏晉 5 張都登記、共用座標；檔名各自加 _l1610；07y7 的圖網址找得到；夜版沒有登記", () => {
  const C = load(), SCW = vm.runInContext("SCW", C), A = SCW["cupmap/cup_day_classic"];
  assert.ok(A); assert.equal(A.f, "cupmap/cup_day_classic_l1610"); assert.equal(A.ready, true); assert.equal(A.w, 2560);
  for (const g of ["", "_han", "_tang", "_weijin"]) { const B = SCW["cupmap/cup_day" + g]; assert.ok(B, g); assert.equal(B.f, "cupmap/cup_day" + g + "_l1610"); assert.equal(B.fx, A.fx); assert.equal(B.S, A.S); assert.equal(B.base, "cupmap/cup_day_classic") }
  assert.equal(vm.runInContext('scwKey("data/cupmap/cup_day_han.webp?v=2370")', C), "cupmap/cup_day_han");
  for (const k of ["cupmap/cup_night", "cupmap/cup_night_classic", "cupmap/cup_day_song"]) assert.equal(SCW[k], undefined, k);
});

test("疊圖座標：跟原本常數同格式；三扇屏風左中右、中扇最大；大掛板在屏風右邊；英雄帖在中扇下方；都在圖內", () => {
  const C = load(), F = vm.runInContext("CP2_L1610.fx", C), S0 = vm.runInContext("CP2_SCR", C);
  assert.equal(F.scr.length, S0.length); assert.equal(F.brd.length, 4); assert.equal(F.book.length, 4); assert.equal(F.lamp.length, 2); assert.equal(F.ball.length, 2);
  const inImg = ([x, y]) => x > 0 && x < 2560 && y > 0 && y < 1600;
  for (const q of [...F.scr, F.brd, F.book]) for (const p of q) assert.ok(inImg(p), String(p));
  for (const p of [...F.lamp, F.ball]) assert.ok(inImg(p));
  const w = q => q[1][0] - q[0][0];
  assert.ok(F.scr[0][1][0] <= F.scr[1][0][0] && F.scr[1][1][0] <= F.scr[2][0][0], "左中右不重疊");
  assert.ok(w(F.scr[1]) > w(F.scr[0]) && w(F.scr[1]) > w(F.scr[2]), "中扇最大");
  assert.ok(F.brd[0][0] > F.scr[2][1][0], "大掛板在右扇右邊");
  assert.ok(F.book[0][0] > F.scr[1][0][0] && F.book[1][0] < F.scr[1][1][0] && F.book[0][1] > F.scr[1][2][1] - 20, "英雄帖在中扇下方");
  assert.ok(F.lamp[0][0] < F.scr[0][0][0] && F.lamp[1][0] > F.brd[1][0], "兩盞燈在屏風、大掛板外側");
});

test("右燈不蓋大掛板：燈寬 3.2%（≈82px）時，右燈左緣跟大掛板右上角的重疊不到 20px（json 提醒原本會蓋到）", () => {
  const C = load(), F = vm.runInContext("CP2_L1610.fx", C);
  assert.match(Y7, /\.cp2-page\.scw-l \.cp2-lamp\{width:3\.2%\}/);
  const half = 2560 * .032 / 2, left = F.lamp[1][0] - half, edge = Math.max(F.brd[1][0], F.brd[2][0]);
  assert.ok(edge - left < 20, "重疊 " + (edge - left).toFixed(0) + "px");
});

test("cp2Geo：橫式圖給條目 fx 和 2560×1600；原圖給原本的常數和 768×1376", () => {
  const C = load(true), geo = vm.runInContext("cp2Geo", C);
  let g = geo(frame("cupmap/cup_day_tang", true));
  assert.equal(g.W, 2560); assert.equal(g.SCR, vm.runInContext("CP2_L1610.fx.scr", C)); assert.equal(g.LAMP, vm.runInContext("CP2_L1610.fx.lamp", C)); assert.deepEqual(JSON.parse(JSON.stringify(g.pc(1280, 800))), ["50.00", "50.00"]);
  g = geo(frame("cupmap/cup_day_tang", false));
  assert.equal(g.W, 768); assert.equal(g.SCR, vm.runInContext("CP2_SCR", C)); assert.equal(g.BRD, vm.runInContext("CP2_BRD", C)); assert.equal(g.LAMP, vm.runInContext("CP2_LAMP", C));
});

test("走路：邊的兩端、小動作的站點都是節點；從 home 走得到每個節點；入口都在安全區內", () => {
  const C = load(), E = vm.runInContext("CP2_L1610", C), W = E.walk, N = Object.keys(W.N), Ed = W.E.split(" ").map(e => e.split("-"));
  for (const [a, b] of Ed) { assert.ok(N.includes(a)); assert.ok(N.includes(b)) }
  for (const [id, h] of Object.entries(W.HS)) { assert.ok(N.includes(h[0]), id); assert.ok(E.S[id], "入口 " + id) }
  const seen = new Set(["home"]); let g = true;
  while (g) { g = false; for (const [a, b] of Ed) { if (seen.has(a) && !seen.has(b)) { seen.add(b); g = true } if (seen.has(b) && !seen.has(a)) { seen.add(a); g = true } } }
  assert.deepEqual([...seen].sort(), N.slice().sort());
  for (const [x, y] of Object.values(E.S)) assert.ok(x > E.safe.l * 100 && x < 100 - E.safe.r * 100 && y > E.safe.t * 100 && y < 100 - E.safe.b * 100);
  const [h0, y0, k] = W.h; assert.ok(h0 - (y0 - Math.min(...Object.values(W.N).map(p => p[1]))) * k > .03, "台上最遠的節點人物不會太小");
});

test("〔原始碼〕開頁照 scwPre 選圖；fit、燈、綵球照 cp2Geo；掛 scwMount（apply＝draw，換圖時走路設定照 onCfg 換）", () => {
  assert.match(Y7, /const src=cp2Img\(dk,grp\),pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(Y7, /P\.innerHTML=`<img src="\$\{pre\.src\}" alt=/);
  assert.match(Y7, /fit=\(\)=>\{const G=cp2Geo\(P\),k=P\.clientWidth\/G\.W;/);
  assert.match(Y7, /if\(day\)\{const G=cp2Geo\(P\);h\+=G\.LAMP\.map/);
  assert.match(Y7, /ids:\["cp2Scr","cp2Book","cp2Brd"\],pfx:"cp2",cfg0:cfg,apply:draw,onCfg:x=>\{P\._shwCfg=x\}\};scwMount\(P,o\);/);
  assert.match(Y7, /shwPage\(v,cfgNow,"cp2"\)/);
  assert.doesNotMatch(Y7, /const k=P\.clientWidth\/768/, "fit 不再寫死 768");
});
