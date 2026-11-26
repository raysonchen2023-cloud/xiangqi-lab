// W107-L 第 1 批（開發者 11/25「先做沒做的頁日間」）：新手訓練營「沙盤兵推圖」（07y2）在 iPad 橫向換成 2560×1600 橫式圖，
// 經典版、原圖版共用一套座標（Windows Claude 1 量，output/w107-ipad/l1610/campmap/camp_day_classic_l1610.json）；夜景、手機、iPad 直向照舊原圖。
// 13 面旗、31 個路線點；找旗腳最近的路線點時偏移照原本 ×(2560/768)；走路記憶名換成 campL（出口在左下營寨）。
// 不開瀏覽器：07sw＋07y2 在 vm 跑。用法 node --test xiangqi-lab/tools/test-scene-wide-camp.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), CP = M("m/07y2-campmap.js");
function load(dev, exits) {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, addEventListener: () => { }, isFinite, Math, Object, String, JSON, localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null } });
  if (exits) ctx.SHW_EXITS = exits;
  vm.runInContext(SW, ctx); vm.runInContext(CP, ctx);
  return ctx;
}
const KC = "campmap/camp_day_classic", KO = "campmap/camp_day";

test("條目：經典版、原圖版兩個白天鍵都登記（共用座標、各自的圖）；夜景沒有；SCW_CDN 還是 false＝正式玩家照舊原圖", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), ent = vm.runInContext("scwEntry", C);
  for (const [k, f] of [[KC, "campmap/camp_day_classic_l1610"], [KO, "campmap/camp_day_l1610"]]) {
    const e = SCW[k]; assert.ok(e && e.ready, k); assert.equal(e.f, f); assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.ok(ent(k));
  }
  assert.equal(SCW[KO].S, SCW[KC].S); assert.equal(SCW[KO].walk, SCW[KC].walk);
  assert.equal(ent("campmap/camp_night_classic"), null); assert.equal(ent("campmap/camp_night"), null);
  assert.equal(vm.runInContext("scwEntry", load(false))(KC), null);
});

test("橫式座標：13 面旗（跟原本一樣多）、31 個路線點都在圖裡；入口 cpF1～cpF13 照旗面算 %；相鄰路線點不會隔太遠（一條連續的路）", () => {
  const C = load(true), L = vm.runInContext("CP_L", C), F0 = vm.runInContext("CP_FLAGS", C), e = vm.runInContext("SCW", C)[KC];
  assert.equal(L.flags.length, F0.length); assert.equal(L.path.length, 31);
  for (const [x, y] of L.flags.concat(L.path)) assert.ok(x > 0 && x < 2560 && y > 0 && y < 1600, x + "," + y);
  for (let i = 0; i < 13; i++) { const [x, y] = L.flags[i], s = e.S["cpF" + (i + 1)]; assert.ok(Math.abs(s[0] - x / 25.6) < .01 && Math.abs(s[1] - y / 16) < .01, "cpF" + (i + 1)) }
  for (let i = 1; i < 31; i++) { const [a, b] = L.path[i - 1], [c, d] = L.path[i]; assert.ok(Math.hypot(c - a, d - b) < 200, "路線點 " + (i - 1) + "→" + i) }
  assert.ok(e.exit[0] < 20 && e.exit[1] > 70, "出口在左下營寨");
});

test("走路：每面旗對到離旗腳最近的路線點（偏移 ×2560/768），旗腳點大致沿著路線前進；這一課的起點、看的方向照原本的規則", () => {
  const C = load(true), [L, NL, cfgL, cfg0, NODE0] = vm.runInContext("[CP_L, CP_NODE_L, cpCfgL, cpCfg, CP_NODE]", C), k = 2560 / 768;
  NL.forEach((n, i) => {
    const [x, y] = L.flags[i], bx = x - 12 * k, by = y + 45 * k, d = ([px, py]) => (px - bx) ** 2 + (py - by) ** 2;
    assert.ok(L.path.every(p => d(p) >= d(L.path[n])), "第 " + (i + 1) + " 面旗");
  });
  for (let i = 1; i < 12; i++) assert.ok(NL[i] >= NL[i - 1], "第 1～12 課旗腳點沿路線往前：" + NL.join(","));
  for (const cur of [1, 5, 12]) {
    const c = cfgL(cur), o = cfg0(cur);
    assert.equal(c.home, "w" + NL[Math.max(0, Math.min(11, cur - 1))]); assert.ok(c.N[c.home]);
    assert.deepEqual(Object.keys(c.HS).sort(), Object.keys(o.HS).sort(), "入口跟原本同一組"); for (const h of Object.values(c.HS)) { assert.ok(c.N[h[0]]); assert.equal(h[3], "bow") }
    assert.equal(c.N.w0[0], +(L.path[0][0] / 25.6).toFixed(2)); assert.equal(Object.keys(c.N).length, 31); assert.equal(c.E.split(" ").length, 31);   /* 31 段：環線 30 段＋W164（11/26）補上最後一段 w30-w0，結業不再繞大半圈 */
    assert.deepEqual([c.W, c.H, c.el], [2560, 1600, o.el]); assert.ok(c.h[0] > o.h[0], "小人身高放大");
  }
  assert.deepEqual(cfg0(3).home, "w" + NODE0[2], "原圖照舊");
});

test("出口：橫式圖記憶名 campL:*，從 w0（左下營寨）往左走出去；原圖的 camp:* 不動", () => {
  const X = { "camp:*": { at: "w0", out: [51, 74], r: [36, 68, 64, 81] } }, C = load(true, X);
  assert.deepEqual(JSON.parse(JSON.stringify(X["campL:*"])), { at: "w0", out: [10, 82], r: [4, 74, 18, 90] });
  assert.deepEqual(X["camp:*"].out, [51, 74], "原圖出口不變");
  const e = vm.runInContext("SCW", C)[KC], [rl, rt, rr, rb] = X["campL:*"].r;
  assert.ok(e.exit[0] >= rl && e.exit[0] <= rr && e.exit[1] >= rt && e.exit[1] <= rb, "出口標籤在出口點區裡");
  const X2 = { "campL:*": false }; load(true, X2); assert.equal(X2["campL:*"], false, "已經有的不蓋掉");
});

test("座標照量好的 json（output/w107-ipad/l1610/campmap/camp_day_classic_l1610.json）：頭尾和中間幾個點寫死比對", () => {
  const L = vm.runInContext("CP_L", load(true)), J = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(J([L.flags[0], L.flags[5], L.flags[12]]), [[862, 866], [1716, 292], [736, 1062]]);
  assert.deepEqual(J([L.path[0], L.path[15], L.path[30]]), [[666, 1167], [1926, 376], [750, 1177]]);
});

test("〔混合〕07y2 接線：開頁先量（scwPre）、掛 07sw（13 面旗）、換圖重掛走路時換成這一課的 cpCfgL 和記憶名；旗在橫式圖上換小一點", () => {
  assert.match(CP, /pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(CP, /<img src="\$\{pre\.src\}"/);
  assert.match(CP, /ids:CP_FLAGS\.map\(\(_,i\)=>"cpF"\+\(i\+1\)\),pfx:mem,cfg0:cfg,/);
  assert.match(CP, /onCfg:x=>cpOnCfg\(o,c,x\)\}/);
  assert.match(CP, /if\(pre\.k\)\{cfgNow=Object\.assign\(scwWalkCfg\(o,scwCur\(P\)\),cpCfgL\(c\)\);mem=o\.pfx="campL:"\+c;P\._scwW="l"\}/);
  assert.match(CP, /shwPage\(v,cfgNow,mem\)/);
  assert.match(CP, /\.camp-page\.scw-l \.shp-spot\.cp-flag\{width:2\.2%;height:3\.6%\}/);
  /* 07y2 的 cpOnCfg 實際跑（#159 審查建議 5：不抄進測試）：橫式設定補上這一課的起點、記憶名換 campL；換回原圖記憶名換回 camp、設定不動 */
  const C = load(true), [cfgL, on] = vm.runInContext("[cpCfgL, cpOnCfg]", C), o = { pfx: "camp:3" }, x = { W: 2560 };
  on(o, 3, x); assert.equal(o.pfx, "campL:3"); assert.equal(x.home, cfgL(3).home); assert.equal(Object.keys(x.N).length, 31);
  const y = { W: 768, home: "w2" }; on(o, 3, y); assert.equal(o.pfx, "camp:3"); assert.equal(y.home, "w2");
});
