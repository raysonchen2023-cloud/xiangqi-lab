// W107-L 第 3 批：棋譜庫（10b「崇文書閣」／經典世界「藏譜石窟」）iPad 橫向專用橫式圖。條目寫在 10b 自己：書閣 LB_L1610（原圖＋11 朝共用）、石窟 LB_L1610_CL。
// 檢查：13 張都登記、檔名對；量好的點照 json 寫死；六部古譜順序、石窟 10 片玉冊（左 4 特級大師、右 6 古譜）；走路路網和小動作；出口記憶名；
// lbGeo 照當下的圖給座標組（走 07sw 真正的 scwCur）；開頁照 scwPre 選圖、place 照 lbGeo 重放、掛 scwMount（apply＝place）。
// 用法 node --test xiangqi-lab/tools/test-w107-libmap-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), LB = M("m/10b-libmap.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const PRE = ["const LB_ERAS=", "const LB_CELLS=", "const LB_BOX=", "const LB_CL="].map(a => cut(LB, a, ";")).join("\n") + "\n" + cut(LB, "const LB_SPOTS=", "]];") + "\n";
const ENTRY = cut(LB, "const LB_L1610=", 'SHW_EXITS.libCL={at:[10,80],ln:"shelf",out:[-8,82],r:[0,72,14,90]}}') + "\n" + cut(LB, "const lbGeo=", "shelf:[4.2,50.8,22.6,16.2]}};");
const J = x => JSON.parse(JSON.stringify(x));
function load(dev, exits) {
  const ctx = vm.createContext({ localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  if (exits) ctx.SHW_EXITS = exits;
  vm.runInContext(SW, ctx); vm.runInContext(PRE + ENTRY, ctx);
  return ctx;
}

test("條目：書閣＋11 朝共用一套、石窟另一套，13 張都登記、檔名加 _l1610；10b 的圖網址找得到", () => {
  const C = load(), SCW = vm.runInContext("SCW", C), A = SCW["libmap/lib"], K = SCW["libmap/lib_classic"], ERAS = vm.runInContext("LB_ERAS", C);
  assert.equal(A.f, "libmap/lib_l1610"); assert.equal(K.f, "libmap/lib_classic_l1610"); assert.equal(A.ready, true); assert.equal(K.ready, true);
  assert.equal(ERAS.length, 11);
  for (const e of ERAS) { const B = SCW["libmap/lib_" + e]; assert.ok(B, e); assert.equal(B.f, "libmap/lib_" + e + "_l1610"); assert.equal(B.fx, A.fx); assert.equal(B.S, A.S); assert.equal(B.base, "libmap/lib") }
  assert.notEqual(K.fx, A.fx, "石窟構圖不同，另一套");
  assert.equal(vm.runInContext('scwKey("data/libmap/lib_tang.webp?v=0700")', C), "libmap/lib_tang");
});

test("量好的點照 json 寫死（抄錯就紅）：書閣六格、三口箱、入口；石窟六片古譜、10 片玉冊、整捆竹簡、入口", () => {
  const C = load(), A = vm.runInContext("LB_L1610", C), K = vm.runInContext("LB_L1610_CL", C);
  assert.deepEqual(J(A.fx.cells), [[16.4, 52.5], [25, 52.5], [16.4, 61.5], [25, 61.5], [16.4, 69.5], [25, 69.5]]);
  assert.deepEqual(J(A.fx.box), [[64.4, 28.5], [76.1, 29], [88.6, 29.5]]);
  assert.deepEqual(J(A.S), { lbGm: [80.6, 59], lbBio: [24, 17], lbTour: [76, 24], lbRead: [50, 79.5], lbMine: [66, 78] });
  assert.deepEqual(J(K.fx.cells), [[22.7, 17.5], [25.2, 17.5], [28.1, 17.5], [30.7, 17.5], [33.2, 17.5], [35.5, 17.5]]);
  assert.equal(K.fx.slips.length, 10, "新圖玉冊 10 片"); assert.deepEqual(J(K.fx.one), [76, 26.5]);
  assert.deepEqual(J(K.S), { lbBio: [15.3, 17.5], lbGm: [79.7, 52.5], lbTour: [76, 23], lbRead: [40.6, 76.5], lbMine: [78, 74] });
});

test("石窟玉冊：右 6 片＝六部古譜（cells 就是 slips 的後 6 片）、左 4 片中間是特級大師入口；古譜點選區只蓋右 6 片、不蓋到特級大師", () => {
  const C = load(), K = vm.runInContext("LB_L1610_CL", C), sl = K.fx.slips;
  assert.deepEqual(J(K.fx.cells), J(sl.slice(4)));
  const bio = K.S.lbBio[0]; assert.ok(bio > sl[0][0] && bio < sl[3][0], "lbBio 在左 4 片之間");
  const [l, t, w, h] = K.fx.shelf;
  for (const [x, y] of K.fx.cells) assert.ok(x > l && x < l + w && y > t && y < t + h, "點選區蓋到古譜 " + x);
  assert.ok(l > bio + 3, "點選區不蓋到特級大師");
  const A = vm.runInContext("LB_L1610", C), [l2, t2, w2, h2] = A.fx.shelf;
  for (const [x, y] of A.fx.cells) assert.ok(x > l2 && x < l2 + w2 && y > t2 && y < t2 + h2, "書閣點選區蓋到書櫥格 " + x);
});

test("走路：兩套的邊、小動作站點都是節點、從 home 走得到；六格古譜都有小動作；石窟沒有燈檠節點也不用；人物二樓比一樓小", () => {
  const C = load();
  for (const n of ["LB_L1610", "LB_L1610_CL"]) {
    const W = vm.runInContext(n, C).walk, N = Object.keys(W.N), Ed = W.E.split(" ").map(e => e.split("-"));
    for (const [a, b] of Ed) { assert.ok(N.includes(a), n + " " + a); assert.ok(N.includes(b), n + " " + b) }
    for (const [id, h] of Object.entries(W.HS)) assert.ok(N.includes(h[0]), n + " " + id + " 的站點 " + h[0]);
    for (let i = 0; i < 6; i++) assert.ok(W.HS["lbC" + i], n + " lbC" + i);
    const seen = new Set(["home"]); let g = true;
    while (g) { g = false; for (const [a, b] of Ed) { if (seen.has(a) && !seen.has(b)) { seen.add(b); g = true } if (seen.has(b) && !seen.has(a)) { seen.add(a); g = true } } }
    assert.deepEqual([...seen].sort(), N.slice().sort(), n);
    const [h0, y0, k] = W.h, hy = y => h0 + (y - y0) * k; assert.ok(hy(W.N.box[1]) < hy(W.N.home[1]) && hy(W.N.box[1]) > .05, n + " 二樓比一樓小、但看得到");
  }
  assert.equal(vm.runInContext("LB_L1610_CL", C).walk.N.lamp, undefined); assert.equal(vm.runInContext("LB_L1610_CL", C).walk.HS.lbFind[0], "book");
});

test("出口：橫式圖的記憶名 libL（書閣往右）、libCL（石窟往左）登記自己的出口，不動直圖的 lib；接的節點都在各自的路網裡", () => {
  const X0 = { lib: { at: [88, 75], ln: "stack", out: [106, 75.5], r: [86, 72.5, 100, 79] } };
  const C = load(false, X0), X = vm.runInContext("SHW_EXITS", C);
  assert.deepEqual(J(X.lib.at), [88, 75], "直圖的出口不動");
  assert.ok(X.libL.out[0] > 100, "書閣往右出去"); assert.ok(X.libCL.out[0] < 0, "石窟往左出去");
  assert.ok(vm.runInContext("LB_L1610", C).walk.N[X.libL.ln]); assert.ok(vm.runInContext("LB_L1610_CL", C).walk.N[X.libCL.ln]);
});

test("lbGeo：橫式圖給條目 fx；原圖書閣給 LB_CELLS、LB_BOX 和原本的點選區；原圖石窟給 LB_CL", () => {
  const C = load(true), geo = vm.runInContext("lbGeo", C), fr = (key, w) => ({ _scw: { key }, dataset: { scw: w ? "l1610" : "" } });
  assert.equal(geo(fr("libmap/lib_han", true), false), vm.runInContext("LB_L1610.fx", C));
  assert.equal(geo(fr("libmap/lib_classic", true), true), vm.runInContext("LB_L1610_CL.fx", C));
  const g0 = geo(fr("libmap/lib", false), false); assert.equal(g0.cells, vm.runInContext("LB_CELLS", C)); assert.equal(g0.box, vm.runInContext("LB_BOX", C)); assert.deepEqual(J(g0.shelf), [4.2, 50.8, 22.6, 16.2]);
  const g1 = geo(fr("libmap/lib_classic", false), true); assert.equal(g1.cells, vm.runInContext("LB_CL.cells", C)); assert.equal(g1.shelf, null, "石窟原圖的點選區交回 CSS");
});

test("〔原始碼〕開頁照 scwPre 選圖；place 照 lbGeo 重放古譜、木箱、點選區、小棋盤、厚度；掛 scwMount（apply＝place，記憶名照圖換）", () => {
  assert.match(LB, /src=`data\/libmap\/\$\{lbImg\(\)\}\.webp\?v=\$\{LB_IMGV\}`,pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(LB, /<img src="\$\{pre\.src\}" alt="崇文書閣">/);
  const pl = cut(LB, "const place=()=>{", "P._lbPlace=place;place();");
  for (const sel of [".lb-cell", ".lb-box", ".lb-shelf", ".lb-mini", ".lb-thick"]) assert.ok(pl.includes('"' + sel + '"'), "place 重放 " + sel);
  assert.match(pl, /const G=lbGeo\(P,CLB\),wide=!!\(typeof scwCur==="function"&&scwCur\(P\)\)/);
  assert.match(LB, /ids:LB_SPOTS\.map\(z=>z\[0\]\),pfx:"lib",cfg0:cfg,apply:place,onCfg:x=>\{o\.pfx=x\.W===2560\?\(CLB\?"libCL":"libL"\):"lib"\}\};/);
  assert.match(LB, /if\(pre\.k\)\{cfgNow=scwWalkCfg\(o,scwCur\(P\)\);mem=o\.pfx=CLB\?"libCL":"libL";P\._scwW="l"\}\}\n  place\(\);/);
  assert.match(LB, /shwPage\(v,cfgNow,mem,null\)/);
  assert.match(LB, /if\(P\._lbPlace\)P\._lbPlace\(\);lbSeal\(P,bs\)/, "厚度晚到也照當下的圖放");
  assert.doesNotMatch(LB, /if\(!CLB\)Object\.assign\(sh\.style,\{left:"4\.2%"/, "點選區不在開頁時寫死");
});
