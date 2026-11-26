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
  assert.ok(F.lamp[0][0] < F.scr[0][0][0], "左燈在左扇屏風外側"); assert.ok(F.lamp[1][0] > F.brd[0][0] && Math.abs(F.lamp[1][0] - F.brd[1][0]) < 40, "右燈在大掛板右上角附近（掛環在台口橫樑上）");
});

test("〔混合〕燈掛在帳額兩端的掛環正下方（json 的燈鉤），燈寬 2.6%；右燈只蓋到大掛板右上角的留白（不超過 60×50px）", () => {
  const C = load(), F = vm.runInContext("CP2_L1610.fx", C);
  assert.match(Y7, /\.cp2-page\.scw-l \.cp2-lamp\{width:2\.6%\}/);
  assert.deepEqual(JSON.parse(JSON.stringify(F.lamp)), [[480, 282], [2102, 282]], "照 json 的燈鉤（掛環中心 480、2102）");
  const w = 2560 * .026, h = w * 70 / 30, [x, y] = F.lamp[1], bTop = Math.min(F.brd[0][1], F.brd[1][1]), bRight = Math.max(F.brd[1][0], F.brd[2][0]);
  const ox = Math.min(x + w / 2, bRight) - Math.max(x - w / 2, F.brd[0][0]), oy = y + h - bTop;
  assert.ok(ox <= 60 && oy <= 50, "重疊 " + ox.toFixed(0) + "×" + oy.toFixed(0) + "px");
});

test("量好的點照 json 寫死：屏風中扇左上、大掛板左上、英雄帖左上、綵球、入口、出口（抄錯就紅）", () => {
  const C = load(), E = vm.runInContext("CP2_L1610", C), F = E.fx, J = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(J(F.scr[1][0]), [1069, 419]); assert.deepEqual(J(F.scr[0][3]), [869, 877]); assert.deepEqual(J(F.scr[2][2]), [1651, 877]);
  assert.deepEqual(J(F.brd[0]), [1766, 410]); assert.deepEqual(J(F.brd[2]), [2106, 888]);
  assert.deepEqual(J(F.book[0]), [1226, 862]); assert.deepEqual(J(F.ball), [1294, 250]);
  assert.deepEqual(J(E.S), { cp2Book: [49, 53], cp2Scr: [50, 38], cp2Brd: [76, 38] });
  assert.deepEqual(J(E.exit), [14, 92], "出口離安全區邊界留 2%（#162 審查第 4 項）");
  assert.ok(E.exit[0] > E.safe.l * 100);
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

test("〔原始碼〕開頁照 scwPre 選圖；fit、燈、綵球照 cp2Geo；掛 scwMount（apply＝draw，換圖時 onCfg 換走路設定並馬上 draw）", () => {
  assert.match(Y7, /const src=cp2Img\(dk,grp\),pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(Y7, /P\.innerHTML=`<img src="\$\{pre\.src\}" alt=/);
  assert.match(Y7, /fit=\(\)=>\{const G=cp2Geo\(P\),k=P\.clientWidth\/G\.W;/);
  assert.match(Y7, /if\(day\)\{const G=cp2Geo\(P\);h\+=G\.LAMP\.map/);
  assert.match(Y7, /ids:\["cp2Scr","cp2Book","cp2Brd"\],pfx:"cp2",cfg0:cfg,apply:draw,onCfg:x=>\{P\._shwCfg=x;draw\(\)\}\};scwMount\(P,o\);/);
  assert.match(Y7, /shwPage\(v,cfgNow,"cp2"\)/);
  assert.doesNotMatch(Y7, /const k=P\.clientWidth\/768/, "fit 不再寫死 768");
  assert.match(Y7, /G\.SCR\.forEach\(\(q,i\)=>\{Q\("s"\+i\)\.style\.transform=cp2M3\(i===1\?300:100,i===1\?260:380,sc\(q\)\)\}\);Q\("b"\)\.style\.transform=cp2M3\(200,450,sc\(G\.BRD\)\);Q\("k"\)\.style\.transform=cp2M3\(120,60,sc\(G\.BOOK\)\)/, "屏風、大掛板、英雄帖都照 cp2Geo");
  assert.match(Y7, /left:\$\{G\.pc\(x,y\)\[0\]\}%;top:\$\{G\.pc\(x,y\)\[1\]\}%/, "燈照 G.pc"); assert.match(Y7, /cp2-ball" style="left:\$\{G\.pc\(\.\.\.G\.BALL\)\[0\]\}%/, "綵球照 G.pc");
  assert.doesNotMatch(Y7, /cp2Pc\(x,y\)\[0\]\}%;top:\$\{cp2Pc\(x,y\)/, "燈不再用 cp2Pc");
  assert.match(Y7, /onCfg:x=>\{P\._shwCfg=x;draw\(\)\}\};scwMount\(P,o\);if\(pre\.k\)\{cfgNow=scwWalkCfg\(o,scwCur\(P\)\);P\._shwCfg=cfgNow;P\._scwW="l"\}\}/, "開頁就是橫式圖時記下走路設定和 _scwW");
  assert.match(Y7, /P\._scwW="l"\}\}[^\n]*\n  draw\(\);\n/, "掛上 07sw 後再畫一次（燈、綵球照橫式圖）");
});
