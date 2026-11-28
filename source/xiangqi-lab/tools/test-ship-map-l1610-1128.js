// #255 第 2 項（11/27 開發者 iPad 實機：「星槎的頭尾都被切斷，重繪製一張橫向的」）：星槎主畫面（07f Voyage）iPad 橫向改用橫式圖 ship_map_l1610（2560×1600）。
// 檢查：條目登記在 07sw SCW（還沒上 CDN 前 ready:false、只有開發用開關才用）；量好的點寫死；入口、走路節點都在圖上、不被 iPad 13／11 吋裁掉；
// 走路路網連通、每個入口都走得到；shpLKind 用真的 07sw scwKind 判斷（iPad 橫向才換，直向、手機橫放、分割畫面照舊）；
// 載不到退回原圖（等 00-util 改 CDN 也失敗才退）；別的模組晚掛的標籤換位置；07w 走路照 shpWalkCfg；改壞驗證。
// 不開瀏覽器。用法 node --test xiangqi-lab/tools/test-ship-map-l1610-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), F = M("m/07f-ship.js"), WALK = M("m/07w-shipwalk.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j) };
const BLOCK = f => cut(f, "const SHP_LKEY=", "/* 意見回饋 726（開發者 11/7）：星槎圖滿版");
const J = x => JSON.parse(JSON.stringify(x));
const HS8 = ["parks", "lesson", "pz", "shelf", "read", "bag", "sail", "port"];

function load(dev, f = F) {
  const ctx = vm.createContext({ localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite, Number });
  vm.runInContext(SW, ctx); vm.runInContext(BLOCK(f), ctx); return ctx;
}

function checkEntry(f) {
  const C = load(false, f), SCW = vm.runInContext("SCW", C), e = SCW["shipmap/ship_map"];
  assert.ok(e, "SCW 要有 shipmap/ship_map");
  assert.equal(e.f, "shipmap/ship_map_l1610"); assert.equal(e.w, 2560); assert.equal(e.h, 1600);
  assert.equal(e.ready, false, "圖還沒上 CDN：ready 要是 false（上 CDN 的那個 PR 才改 true）");
  assert.ok(e.sw7 && typeof e.sw7 === "object", "要有 sw7（07w7 才會照原本的 shipMap 固定顏色，不是改成 m:in）");
  assert.equal(vm.runInContext('scwEntry("shipmap/ship_map")', C), null, "沒開開發用開關：不用橫式圖");
  const D = load(true, f); assert.ok(vm.runInContext('scwEntry("shipmap/ship_map")', D), "開發用開關：用橫式圖");
}
test("條目：登記在 07sw SCW、檔名 ship_map_l1610、2560×1600；還沒上 CDN＝ready:false，只有開發用開關才用", () => checkEntry(F));

function checkPoints(f) {
  const T = vm.runInContext("SHPM_L1610", load(true, f));
  assert.deepEqual(J(T.hs), { parks: [19, 27], lesson: [75, 17], pz: [51, 52], shelf: [33, 47], read: [36, 64], bag: [46, 80], sail: [16, 84], port: [70, 75] });
  assert.deepEqual(J(T.late), { "lk-w": [48.5, 55], "ex-set": [59, 41], "ex-home": [66, 93] });
  assert.deepEqual(J(T.walk.N), { home: [58, 68], pz: [52, 67.5], bag: [49, 71.5], read: [44, 68.5], shelf: [40, 62], parks: [39, 58], d1: [42, 76], sail: [30, 73], g1: [62, 68], port: [66.5, 74], r1: [63, 58], r2: [69, 50], r3: [73, 40.5], lesson: [74, 31.5] });
  assert.equal(T.walk.E, "home-pz pz-bag bag-read read-shelf shelf-parks read-d1 d1-sail home-g1 pz-g1 g1-port g1-r1 r1-r2 r2-r3 r3-lesson");
  assert.equal(T.walk.W, 2560); assert.equal(T.walk.H, 1600); assert.equal(T.walk.home, "home");
}
test("量好的點寫死（抄錯、改錯就紅）：入口標籤、晚掛的標籤、走路節點和路網", () => checkPoints(F));

test("〔混合〕8 個入口都換、名字跟 Voyage 原本的 data-hs 一樣；每個點都在 iPad 13 吋（1366×904）和 11 吋（1194×714）cover 之後看得到的範圍", () => {
  const T = vm.runInContext("SHPM_L1610", load(true));
  assert.deepEqual(Object.keys(T.hs).sort(), HS8.slice().sort());
  for (const h of HS8) assert.match(F, new RegExp('data-hs="' + h + '" style="left:\\d+%;top:\\d+%'), "Voyage 模板照舊寫原圖的 % （" + h + "）");
  /* cover：比例比圖寬（1.6）的裁上下、比圖窄的裁左右；算出每邊裁掉幾 %，點要在裡面再留 1% */
  for (const [W, H] of [[1366, 904], [1194, 714]]) {
    const s = Math.max(W / 2560, H / 1600), cx = (2560 * s - W) / 2 / (2560 * s) * 100, cy = (1600 * s - H) / 2 / (1600 * s) * 100;
    const pts = [...Object.entries(T.hs), ...Object.entries(T.late), ...Object.entries(T.walk.N)];
    for (const [n, [x, y]] of pts) assert.ok(x > cx + 1 && x < 100 - cx - 1 && y > cy + 1 && y < 100 - cy - 1, `${W}×${H}：${n}（${x},${y}）被裁掉`);
  }
});

test("走路：路網連通、每個入口的停靠點都在路網上；HS 對到 8 個入口", () => {
  const T = vm.runInContext("SHPM_L1610", load(true)), N = T.walk.N, adj = {};
  for (const e of T.walk.E.split(" ")) { const [a, b] = e.split("-"); assert.ok(N[a] && N[b], "邊 " + e + " 的兩端都要有節點"); (adj[a] = adj[a] || []).push(b); (adj[b] = adj[b] || []).push(a) }
  const seen = new Set(["home"]), q = ["home"]; while (q.length) for (const b of adj[q.shift()] || []) if (!seen.has(b)) { seen.add(b); q.push(b) }
  assert.deepEqual([...seen].sort(), Object.keys(N).sort(), "每個節點都要從 home 走得到");
  assert.deepEqual(Object.keys(T.walk.HS).sort(), HS8.slice().sort());
  for (const [h, [n]] of Object.entries(T.walk.HS)) assert.ok(N[n], h + " 的停靠點 " + n + " 要在路網上");
  assert.ok(Array.isArray(T.walk.h) && T.walk.h.length === 3, "身高照渡口的 [身高, y, 每 1% 加多少] 寫法");
});

/* 假的畫面：M 是 .shp-map.full；頂欄 63、底部選單在 innerHeight-64 */
function stage(C, vw, vh, tab = true) {
  C.innerWidth = vw; C.innerHeight = vh;
  C.document = { documentElement: { clientWidth: vw, clientHeight: vh }, getElementById: id => id === "tabbar" && tab ? { offsetParent: {}, getBoundingClientRect: () => ({ height: 64, top: vh - 64 }) } : null };
  return { isConnected: true, dataset: {}, getBoundingClientRect: () => ({ width: vw, top: 63 }) };
}
function checkKind(f) {
  const C = load(true, f), k = (w, h) => { const m = stage(C, w, h); return vm.runInContext("shpLKind", C)(m) };
  assert.equal(k(1366, 1024), "l1610", "iPad 13 吋橫向");
  assert.equal(k(1194, 834), "l1610", "iPad 11 吋橫向");
  assert.equal(k(1024, 1366), "", "iPad 13 吋直向");
  assert.equal(k(834, 1194), "", "iPad 11 吋直向");
  assert.equal(k(540, 1024), "", "分割畫面 540 寬");
  assert.equal(k(375, 1024), "", "分割畫面 375 寬");
  assert.equal(k(844, 390), "", "手機橫放（短邊不到 600）");
  const D = load(false, f), m = stage(D, 1366, 1024);
  assert.equal(vm.runInContext("shpLKind", D)(m), "", "沒開開發用開關（條目 ready:false）照舊原圖");
  /* 框還沒放上去：照視窗估 */
  const E = load(true, f); stage(E, 1366, 1024); assert.equal(vm.runInContext("shpLKind", E)(null), "l1610");
  stage(E, 1024, 1366); assert.equal(vm.runInContext("shpLKind", E)(null), "");
}
test("shpLKind 用真的 07sw scwKind：iPad 13、11 吋橫向換橫式圖；直向、分割畫面、手機橫放、沒開開關照舊", () => checkKind(F));

/* 假的 v：.shp-map.full 已經標 data-shp-l，裡面有 img.shp-base 和 .shp-hl */
function mountStage(C, img) {
  const late = [], obs = [];
  const hl = { querySelector: s => { const c = s.replace(":scope>.", ""); return late.find(e => e.cls === c) || null } };
  const btns = HS8.map(h => ({ dataset: { hs: h }, style: { left: "1%", top: "1%" } }));
  const Mx = { dataset: { shpL: "l1610" }, isConnected: true, querySelector: s => s === "img.shp-base" ? img : s === ".shp-hl" ? hl : null, querySelectorAll: s => s === ".shp-hl>[data-hs]" ? btns : [] };
  const v = { isConnected: true, querySelector: s => s === ".shp-map.full" ? Mx : null };
  C.MutationObserver = function (fn) { this.observe = () => obs.push(fn) }; C.window = { MutationObserver: C.MutationObserver };
  return { v, Mx, late, obs, btns };
}
function checkFallback(f) {
  const C = load(true, f); C.XQ_CDN = "https://cdn.example/";
  const img = { dataset: {}, complete: false, naturalWidth: 0, getAttribute: () => img.src, src: "data/shipmap/ship_map_l1610.webp?v=1125" };
  const S = mountStage(C, img); let painted = 0;
  vm.runInContext("shpLMount", C)(S.v, () => { painted++ });
  assert.equal(typeof img.onerror, "function", "要掛載不到退回");
  /* 第一次錯：00-util 已經把 src 改成 CDN、記 cdnTry，這時要等 CDN 那次 */
  img.src = "https://cdn.example/data/shipmap/ship_map_l1610.webp?v=1125"; img.dataset.cdnTry = "1"; img.onerror();
  assert.equal(painted, 0, "CDN 補抓還在等：不能先退回");
  assert.equal(vm.runInContext('SCW_BAD["shipmap/ship_map"]', C), undefined);
  img.onerror();
  assert.equal(painted, 1, "CDN 也失敗：退回原圖重畫");
  assert.equal(vm.runInContext('SCW_BAD["shipmap/ship_map"]', C), 1, "記 SCW_BAD，這次開 App 不再試");
  assert.equal(S.v._shpL, "");
  /* 開頁時已經載完卻沒有寬（onerror 錯過了）也要退回 */
  const C2 = load(true, f), img2 = { dataset: {}, complete: true, naturalWidth: 0, getAttribute: () => "data/shipmap/ship_map_l1610.webp" };
  let p2 = 0; vm.runInContext("shpLMount", C2)(mountStage(C2, img2).v, () => { p2++ }); assert.equal(p2, 1);
}
test("載不到退回原圖：等 00-util 改 CDN 也失敗才退、記 SCW_BAD、重畫；開頁時已經失敗也退", () => checkFallback(F));

test("8 個入口換到橫式圖的位置；別的模組晚掛的標籤（07w8 爛柯懸棋、07w9 天字客房、回首頁）掛上來時也換", () => {
  const C = load(true), img = { dataset: {}, complete: true, naturalWidth: 2560, getAttribute: () => "x" }, S = mountStage(C, img);
  vm.runInContext("shpLMount", C)(S.v, () => {});
  assert.equal(S.obs.length, 1, "要看 .shp-hl 的子元素");
  for (const c of ["lk-w", "ex-set", "ex-home"]) S.late.push({ cls: c, dataset: {}, style: { left: "1%", top: "1%" } });
  S.obs[0]();
  const T = vm.runInContext("SHPM_L1610", C);
  for (const b of S.btns) { assert.equal(b.style.left, T.hs[b.dataset.hs][0] + "%", b.dataset.hs); assert.equal(b.style.top, T.hs[b.dataset.hs][1] + "%", b.dataset.hs) }
  for (const e of S.late) { assert.equal(e.style.left, T.late[e.cls][0] + "%", e.cls); assert.equal(e.style.top, T.late[e.cls][1] + "%", e.cls) }
});

test("〔原始碼〕Voyage 用橫式圖時：不掛 WebGL 視差、.shp-in 標 data-scw（07w6 物件說明先關）、圖照 scwSrc；shpMapFit 尺寸照圖、跨門檻整頁重畫並叫 07w9 再放出口；07w 走路照 shpWalkCfg", () => {
  assert.ok(F.includes('${LE?"":shpPxHtml()}'), "橫式圖不放視差層");
  assert.ok(F.includes(`<div class="shp-in"\${LE?' data-scw="l1610"':""}>`), ".shp-in 標 data-scw");
  assert.ok(F.includes('src="${LE?scwSrc(LE):"data/shipmap/ship_map.webp?v="+SHP_IMGV}"'));
  assert.ok(F.includes("const s=Math.max(W/IW,H/IH),w=IW*s,h=IH*s;"), "shpMapFit 照圖的尺寸 cover");
  assert.match(F, /k!==\(M\.dataset\.shpL\|\|""\)\)\{V\._shpL=k;V\._shpPaint\(\);try\{if\(typeof exSync==="function"\)exSync\(\)\}catch\(e\)\{\}return\}/);
  assert.ok(F.includes("v._shpPaint=paint;shpLMount(v,paint);shpMapFit(v);"));
  assert.ok(WALK.includes('cfg:(typeof shpWalkCfg==="function"&&shpWalkCfg(M))||SHW_SHIP'), "07w shipWalk 照 shpWalkCfg");
  const C = load(true), cfg = vm.runInContext("shpWalkCfg", C);
  assert.equal(cfg({ dataset: { shpL: "l1610" } }).W, 2560); assert.equal(cfg({ dataset: {} }), null);
});

test("改壞驗證：條目改 ready:true、點抄錯、判斷門檻放寬、退回不等 CDN，都會被抓到", () => {
  const bad = [
    ["ready:true", F.replace("SCW[SHP_LKEY]={ready:false,", "SCW[SHP_LKEY]={ready:true,"), checkEntry],
    ["入口點抄錯", F.replace("pz:[51,52]", "pz:[50,43]"), checkPoints],
    ["直向也換（不問 scwKind）", F.replace("return scwKind(r.width,Math.max(320,Math.round(bot-r.top)),vw,vh)}", 'return "l1610"}'), checkKind],
    ["不等 CDN 就退回", F.replace('im._scwCdn=u;return}\n      if(typeof SCW_BAD!=="undefined")SCW_BAD[SHP_LKEY]=1;', 'im._scwCdn=u}\n      if(typeof SCW_BAD!=="undefined")SCW_BAD[SHP_LKEY]=1;'), checkFallback],
    ["載不到不記 SCW_BAD", F.replace("SCW_BAD[SHP_LKEY]=1;", ""), checkFallback],
  ];
  for (const [why, f, fn] of bad) { assert.notEqual(f, F, why + "：改壞沒套上"); assert.throws(() => fn(f), why + " 應該被抓到") }
});
