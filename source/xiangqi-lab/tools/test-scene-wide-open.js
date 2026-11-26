// W107-L 第 1 批（開發者 11/25「先做沒做的頁日間」）：我的開局「矮几棋枰＋紅黑兩冊」（07z3）在 iPad 橫向換成 2560×1600 橫式圖，
// 經典版、原圖版共用一套座標（Windows Claude 1 量，output/w107-ipad/l1610/openmap/open_day_classic_l1610.json）；夜景、手機、iPad 直向照舊原圖。
// 棋枰、紙籤照條目 fx 的四角貼；朱印「招」、待補籤的偏移照原本（直圖像素）×(2560/768)；走路地面只走左右兩側，靠 TB.low 跳上桌面連通。
// 不開瀏覽器：07sw＋07z3 在 vm 跑。用法 node --test xiangqi-lab/tools/test-scene-wide-open.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), KJ = M("m/07z3-openmap.js");
function load(dev) {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, addEventListener: () => { }, isFinite, Math, Object, String, JSON, localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null } });
  vm.runInContext(SW, ctx); vm.runInContext(KJ, ctx);
  return ctx;
}
const KC = "openmap/open_day_classic", KO = "openmap/open_day";
const fakeP = scw => ({ dataset: { scw: scw ? "l1610" : "" }, _scw: { key: KC } });

test("條目：經典版、原圖版兩個白天鍵都登記（共用座標、各自的圖）；夜景沒有；SCW_CDN 還是 false＝正式玩家照舊原圖", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), ent = vm.runInContext("scwEntry", C);
  for (const [k, f] of [[KC, "openmap/open_day_classic_l1610"], [KO, "openmap/open_day_l1610"]]) {
    const e = SCW[k]; assert.ok(e && e.ready, k); assert.equal(e.f, f); assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.ok(ent(k));
  }
  assert.equal(SCW[KO].S, SCW[KC].S, "入口座標共用"); assert.equal(SCW[KO].walk, SCW[KC].walk, "走路節點共用");
  assert.equal(ent("openmap/open_night_classic"), null); assert.equal(ent("openmap/open_night"), null);
  assert.equal(vm.runInContext("scwEntry", load(false))(KC), null);
});

test("橫式座標：5 個入口、出口在圖裡；棋枰、紙籤四角是凸四邊形、順時針；兩冊、手卷在圖裡；朱冊在棋枰左、墨冊在棋枰右", () => {
  const e = vm.runInContext("SCW", load(true))[KC];
  assert.deepEqual(Object.keys(e.S).sort(), ["kj2Blk", "kj2Brd", "kj2Red", "kj2Scr", "kj2Slip"]);
  for (const [id, [x, y]] of Object.entries(e.S)) assert.ok(x > 0 && x < 100 && y > 0 && y < 100, id);
  assert.ok(e.exit[0] > 0 && e.exit[0] < 100 && e.exit[1] > 0 && e.exit[1] < 100);
  const cross = q => q.map((p, i) => { const a = q[(i + 1) % 4], b = q[(i + 2) % 4]; return (a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0]) });
  for (const k of ["board", "slip"]) { const q = e.fx[k]; assert.equal(q.length, 4); for (const [x, y] of q) assert.ok(x >= 0 && x <= 2560 && y >= 0 && y <= 1600, k); assert.ok(cross(q).every(c => c > 0), k + " 凸、順時針（左上、右上、右下、左下）") }
  for (const k of ["red", "blk", "scr"]) { const [x, y] = e.fx[k]; assert.ok(x > 0 && x < 2560 && y > 0 && y < 1600, k) }
  const bl = Math.min(...e.fx.board.map(p => p[0])), br = Math.max(...e.fx.board.map(p => p[0]));
  assert.ok(e.fx.red[0] < bl && e.fx.blk[0] > br, "朱冊在棋枰左、墨冊在棋枰右");
  assert.ok(e.fx.slip[0][1] > Math.max(...e.fx.board.map(p => p[1])), "紙籤在棋枰前面");
});

test("走路設定：節點在圖裡、邊與跳點只用到有的節點、點入口要去的節點都有；動作照原本（招牌開局歡呼、其他待機）", () => {
  const C = load(true), e = vm.runInContext("SCW", C)[KC], w = e.walk, S0 = vm.runInContext("SHW_KJ2", C);
  assert.deepEqual([w.W, w.H, w.home], [2560, 1600, "home"]); assert.ok(w.N[w.home]);
  for (const [n, [x, y]] of Object.entries(w.N)) assert.ok(x > 0 && x < 100 && y > 0 && y < 100, n);
  for (const ed of w.E.split(/\s+/)) { const [a, b] = ed.split("-"); assert.ok(w.N[a] && w.N[b], ed) }
  for (const [n] of w.TB.low.hops) assert.ok(w.N[n], "跳點 " + n);
  assert.deepEqual(Object.keys(w.HS).sort(), Object.keys(S0.HS).sort(), "入口跟原本同一組");
  for (const [id, h] of Object.entries(w.HS)) { assert.ok(w.N[h[0]], id); assert.equal(h[3], S0.HS[id][3], id + " 動作照原本") }
  assert.ok(w.h[0] > S0.h[0], "橫式圖物件比較小、小人身高放大");
  /* 走路設定合併（07sw scwWalkCfg）：原本的桌面節點表 T 換成橫式圖的空表，不會留下原圖的 tl／tr */
  const cfg = vm.runInContext("scwWalkCfg", C)({ cfg0: Object.assign({}, S0) }, e);
  assert.equal(cfg.T, w.T); assert.equal(Object.keys(cfg.T).length, 0, "沒有原圖的 tl／tr"); assert.equal(cfg.TB, w.TB); assert.equal(cfg.N, w.N);
});

test("照現在用的那張圖擺：原圖照 KJ2_*（跟改之前 kj2Pc 一樣），橫式圖照條目 fx，偏移 ×(2560/768)", () => {
  const C = load(true), [G, At, Pc, RED, BLK, BRD, SLIP] = vm.runInContext("[kj2G, kj2At, kj2Pc, KJ2_RED, KJ2_BLK, KJ2_BOARD, KJ2_SLIP]", C);
  const g0 = G(fakeP(false));
  assert.deepEqual([g0.W, g0.H, g0.k, g0.board, g0.slip], [768, 1376, 1, BRD, SLIP]);
  assert.deepEqual(At(g0, RED, 22, 40), Pc(RED[0] + 22, RED[1] + 40), "朱印位置跟改之前一樣");
  assert.deepEqual(At(g0, BLK, 56, 30), Pc(BLK[0] + 56, BLK[1] + 30), "待補籤位置跟改之前一樣");
  const g = G(fakeP(true)), e = vm.runInContext("SCW", C)[KC];
  assert.deepEqual([g.W, g.H, g.board, g.slip, g.red, g.blk], [2560, 1600, e.fx.board, e.fx.slip, e.fx.red, e.fx.blk]);
  const [x, y] = At(g, g.red, 22, 40).map(Number);
  assert.ok(Math.abs(x - (832 + 22 * 2560 / 768) / 25.6) < .01 && Math.abs(y - (852 + 40 * 2560 / 768) / 16) < .01, "朱印偏移 ×3.33");
  const C2 = load(false); assert.equal(vm.runInContext("kj2G", C2)(fakeP(true)).W, 768, "沒開開關：就算記號是橫式也照原圖（scwCur 拿不到條目）");
});

test("座標照量好的 json（output/w107-ipad/l1610/openmap/open_day_classic_l1610.json）：抽幾個點寫死比對", () => {
  const e = vm.runInContext("SCW", load(true))[KC], J = x => JSON.parse(JSON.stringify(x));
  assert.deepEqual(J(e.fx.board), [[1032, 584], [1554, 584], [1618, 973], [960, 973]]);
  assert.deepEqual(J(e.fx.slip), [[1050, 1093], [1556, 1093], [1577, 1229], [1032, 1229]]);
  assert.deepEqual(J([e.fx.red, e.fx.blk, e.fx.scr]), [[832, 852], [1784, 934], [2112, 282]]);
  assert.deepEqual(J(e.S), { kj2Brd: [50.5, 34], kj2Red: [32.5, 44], kj2Blk: [69.7, 47], kj2Slip: [50.5, 79], kj2Scr: [82, 9] });
  assert.deepEqual(J(e.walk.N), { home: [14, 92], fl: [17, 80], tl: [14, 72], hr: [86, 92], fr: [84, 82], tr: [86, 60] });
  assert.deepEqual(J(e.exit), [10, 94]);
});

test("〔混合〕07z3 接線：開頁先量（scwPre）、掛 07sw（5 個入口、走路前綴 kj2、換圖時重貼棋枰紙籤和印記）、橫式圖用條目的走路設定；換了走路設定最會輸那一冊照舊揮手", () => {
  assert.match(KJ, /pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(KJ, /<img src="\$\{pre\.src\}"/);
  assert.match(KJ, /ids:\["kj2Brd","kj2Red","kj2Blk","kj2Slip","kj2Scr"\],pfx:"kj2",cfg0:cfg,apply:\(\)=>\{fit\(\);mkDraw\(\)\}/);
  assert.match(KJ, /if\(pre\.k\)\{cfgNow=scwWalkCfg\(o,scwCur\(P\)\);P\._scwW="l"\}/);
  assert.match(KJ, /onCfg:c=>\{cfgNow=c;if\(waveId&&c\.HS&&c\.HS\[waveId\]\)c\.HS\[waveId\]\[3\]="wave"\}/);
  assert.match(KJ, /shwPage\(v,cfgNow,"kj2"\)/);
  assert.match(KJ, /waveId=id;for\(const c of \[cfg,cfgNow\]\)if\(c\.HS&&c\.HS\[id\]\)c\.HS\[id\]\[3\]="wave"/, "開頁就是橫式圖（cfgNow）時，最會輸那一冊也揮手（#159 審查建議 2）");
  /* 換回原圖時走路設定也要回原本的（07sw scwWalk：沒有條目＝cfg0） */
  const C = load(true), o = { cfg0: { HS: { kj2Red: ["tl", 1, 2, "idle"] } } };
  assert.equal(vm.runInContext("scwWalkCfg", C)(o, null), o.cfg0);
});
