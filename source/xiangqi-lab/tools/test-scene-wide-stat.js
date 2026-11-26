// W107-L 第 1 批（開發者 11/25「先做沒做的頁日間」）：我的戰績「書院朱紅榜」（07z2）在 iPad 橫向換成 2560×1600 橫式圖，
// 經典版、原圖版共用一套座標（Windows Claude 1 量，output/w107-ipad/l1610/statmap/stat_day_classic_l1610.json）；夜景、手機、iPad 直向照舊原圖。
// 榜面、榜面熱區、棋桌透視棋盤、棋桌熱區、紗燈段位字都照現在用的那張圖擺。不開瀏覽器：07sw＋07z2 在 vm 跑。用法 node --test xiangqi-lab/tools/test-scene-wide-stat.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), JZ = M("m/07z2-statmap.js");
function load(dev) {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, addEventListener: () => { }, isFinite, Math, Object, String, JSON, localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null } });
  vm.runInContext(SW, ctx); vm.runInContext(JZ, ctx);
  return ctx;
}
const KC = "statmap/stat_day_classic", KO = "statmap/stat_day";
const fakeP = scw => ({ dataset: { scw: scw ? "l1610" : "" }, _scw: { key: KC } });

test("條目：經典版、原圖版兩個白天鍵都登記（共用座標、各自的圖）；夜景沒有；SCW_CDN 還是 false＝正式玩家照舊原圖", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), ent = vm.runInContext("scwEntry", C);
  for (const [k, f] of [[KC, "statmap/stat_day_classic_l1610"], [KO, "statmap/stat_day_l1610"]]) {
    const e = SCW[k]; assert.ok(e && e.ready, k); assert.equal(e.f, f); assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.ok(ent(k));
  }
  assert.equal(SCW[KO].S, SCW[KC].S); assert.equal(SCW[KO].fx, SCW[KC].fx);
  assert.equal(ent("statmap/stat_night_classic"), null); assert.equal(ent("statmap/stat_night"), null);
  assert.equal(vm.runInContext("scwEntry", load(false))(KC), null);
});

test("橫式座標：5 個入口、出口在圖裡；榜面是長方形、比例跟原圖榜面相近（SVG 不會被壓扁太多）；棋桌四角凸、順時針、在榜面右下；棋桌熱區蓋住棋桌；紗燈在榜面右上", () => {
  const C = load(true), e = vm.runInContext("SCW", C)[KC], B0 = vm.runInContext("JZ2_BOARD", C);
  assert.deepEqual(Object.keys(e.S).sort(), ["jz2Book", "jz2Lamp", "jz2Rank", "jz2Scroll", "jz2Tbl"]);
  for (const [id, [x, y]] of Object.entries(e.S)) assert.ok(x > 0 && x < 100 && y > 0 && y < 100, id);
  const [l, t, r, b] = e.fx.board; assert.ok(0 <= l && l < r && r <= 2560 && 0 <= t && t < b && b <= 1600);
  const ar = (r - l) / (b - t), ar0 = (B0[2] - B0[0]) / (B0[3] - B0[1]); assert.ok(Math.abs(ar / ar0 - 1) < .1, "榜面寬高比跟原圖差不到一成：" + ar.toFixed(2) + " vs " + ar0.toFixed(2));
  const q = e.fx.table, cross = q.map((p, i) => { const a = q[(i + 1) % 4], c = q[(i + 2) % 4]; return (a[0] - p[0]) * (c[1] - a[1]) - (a[1] - p[1]) * (c[0] - a[0]) });
  assert.ok(cross.every(c => c > 0), "棋桌四角凸、順時針"); assert.ok(Math.min(...q.map(p => p[0])) > r && Math.min(...q.map(p => p[1])) > b, "棋桌在榜面右下");
  const [hl, ht, hw, hh] = e.fx.hitTbl, px = q.map(([x, y]) => [x / 25.6, y / 16]);
  for (const [x, y] of px) assert.ok(x >= hl - 2 && x <= hl + hw + 2 && y >= ht - 2 && y <= ht + hh + 2, "棋桌熱區蓋住桌面角 " + x.toFixed(1) + "," + y.toFixed(1));
  assert.ok(e.fx.lamp[0] > r && e.fx.lamp[1] < b, "紗燈在榜面右邊、上半");
});

test("走路設定：節點在圖裡、邊只用到有的節點、點入口要去的節點都有；動作照原本（待機）", () => {
  const C = load(true), w = vm.runInContext("SCW", C)[KC].walk, S0 = vm.runInContext("SHW_JZ2", C);
  assert.deepEqual([w.W, w.H, w.home], [2560, 1600, "home"]); assert.ok(w.N[w.home]);
  for (const [n, [x, y]] of Object.entries(w.N)) assert.ok(x > 0 && x < 100 && y > 0 && y < 100, n);
  for (const ed of w.E.split(/\s+/)) { const [a, b] = ed.split("-"); assert.ok(w.N[a] && w.N[b], ed) }
  assert.deepEqual(Object.keys(w.HS).sort(), Object.keys(S0.HS).sort());
  for (const [id, h] of Object.entries(w.HS)) { assert.ok(w.N[h[0]], id); assert.equal(h[3], S0.HS[id][3], id + " 動作照原本") }
  assert.ok(w.h[0] > S0.h[0], "小人身高放大");
});

test("照現在用的那張圖擺：原圖照 JZ2_*（榜面位置跟改之前 /7.68、/13.76 一樣，棋桌熱區照原本 74.7／71.5／24.2／7.8），橫式圖照條目 fx", () => {
  const C = load(true), [G, Box, B0, T0, L0] = vm.runInContext("[jz2G, jz2Box, JZ2_BOARD, JZ2_TABLE, JZ2_LAMP]", C);
  const g0 = G(fakeP(false)), [bl, bt, br, bb] = B0;
  assert.deepEqual([g0.W, g0.H, g0.board, g0.table, g0.lamp], [768, 1376, B0, T0, L0]); assert.deepEqual([...g0.hitTbl], [74.7, 71.5, 24.2, 7.8]);
  assert.equal(Box(g0, B0), `left:${(bl / 7.68).toFixed(2)}%;top:${(bt / 13.76).toFixed(2)}%;width:${((br - bl) / 7.68).toFixed(2)}%;height:${((bb - bt) / 13.76).toFixed(2)}%`, "榜面位置跟改之前一樣");
  const e = vm.runInContext("SCW", C)[KC], g = G(fakeP(true));
  assert.deepEqual([g.W, g.H, g.board, g.table, g.hitTbl, g.lamp], [2560, 1600, e.fx.board, e.fx.table, e.fx.hitTbl, e.fx.lamp]);
  assert.equal(Box(g, e.fx.board), "left:30.00%;top:18.38%;width:39.69%;height:32.50%");
  assert.equal(vm.runInContext("jz2G", load(false))(fakeP(true)).W, 768, "沒開開關照原圖");
});

test("〔混合〕07z2 接線：開頁先量（scwPre）、掛 07sw（5 個入口、走路前綴 jz2、換圖時重擺榜面熱區棋桌、重畫紗燈字）、橫式圖用條目的走路設定", () => {
  assert.match(JZ, /pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(JZ, /<img src="\$\{pre\.src\}"/);
  assert.match(JZ, /ids:\["jz2Rank","jz2Book","jz2Scroll","jz2Tbl","jz2Lamp"\],pfx:"jz2",cfg0:cfg,apply:\(\)=>\{place\(\);fit\(\);paint\(\)\}/);
  assert.match(JZ, /if\(pre\.k\)\{cfgNow=scwWalkCfg\(o,scwCur\(P\)\);P\._scwW="l"\}/);
  assert.match(JZ, /shwPage\(v,cfgNow,"jz2"\)/);
  assert.match(JZ, /const G=jz2G\(P\),a=\(G\.lamp\[0\]\/G\.W\*100\)/, "紗燈字照現在用的那張圖");
  const C = load(true); assert.equal(vm.runInContext("SCW", C)[KC].walk.N.home[1], 96);
});
