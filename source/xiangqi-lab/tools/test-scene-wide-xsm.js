// W107-L 第 4 批：西市（07xsm-ximarket.js）在 iPad 橫向換成 2560×1600 橫式圖（Windows Claude 1 量，output/w107-ipad/l1610/ximarket/xm_l1610.json）。
// 外景白天、冬景共用座標；茶坊、茶坊冬景共用；夜景沒有橫式圖＝原圖。找棋子的藏點、茶坊小帥禁區照現在用的那張圖；日夜、換季每分鐘換圖時照 07sw 的鍵重選。
// 不開瀏覽器：07sw＋07xsm 在 vm 跑。用法 node --test xiangqi-lab/tools/test-scene-wide-xsm.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), XM = M("m/07xsm-ximarket.js");
const dims = { w: 1180, h: 820 };
function load(dev) {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, addEventListener: () => { }, Math, Object, String, JSON, Set, Date, localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null },
    getComputedStyle: () => ({ paddingBottom: "0", paddingLeft: "0", paddingRight: "0" }), document: { getElementById: id => id === "view" ? V : null, documentElement: { get clientHeight() { return dims.h } } } });
  vm.runInContext(SW, ctx); vm.runInContext(XM, ctx);
  return ctx;
}
const V = { scrollTop: 0, get clientWidth() { return dims.w }, get clientHeight() { return dims.h }, getBoundingClientRect: () => ({ top: 0 }) };
const J = x => JSON.parse(JSON.stringify(x));
/* 照量好的 json 整組寫死（Windows Claude 1）：入口、13 個藏點、走路、茶坊暗棋、小帥禁區 */
const EXP = {"S":{"xsmGift":[18,38],"xsmMusic":[50,36],"xsmTea":[77,33],"xsmChess":[30,72],"xsmVisit":[86,76]},"hide":[[10,21],[29,15],[51,46],[69,42],[46,53],[72,47],[35,45],[29,82],[37,85],[23,89],[55,88],[73,74],[83,81]],"look0":[50,95],"N":{"home":[56,80],"c1":[52,66],"chess":[40,86],"cross":[50,58],"counter":[24,62],"music":[52,58],"tea":[70,52],"gate":[72,84],"g2":[80,92],"tree":[86,86]},"E":"home-chess home-c1 c1-cross cross-counter cross-music music-tea home-gate gate-g2 g2-tree","HS":{"xsmGift":["counter",18,40,"bow"],"xsmChess":["chess",30,74,"bow"],"xsmMusic":["music",50,40,"wave"],"xsmTea":["tea",76,35,"bow"],"xsmVisit":["tree",86,76,"wave"],"xsmExit":["gate",72,94,"wave"]},"teaS":{"xsmDark":[49,48]},"nobot":[[0,0,100,50],[0,50,30,100],[70,50,100,100],[32,50,64,84]]};
const KEYS = ["ximarket/xm_day", "ximarket/xm_day_winter", "ximarket/xm_tea", "ximarket/xm_tea_winter"];

test("條目：外景白天、冬景、茶坊、茶坊冬景四個鍵都登記、各自的圖；外景兩張、茶坊兩張各自共用座標；夜景沒有；SCW_CDN 還是 false＝正式玩家照舊原圖", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), ent = vm.runInContext("scwEntry", C);
  for (const k of KEYS) { const e = SCW[k]; assert.ok(e && e.ready, k); assert.equal(e.f, k + "_l1610"); assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.ok(ent(k)) }
  assert.equal(SCW["ximarket/xm_day"].S, SCW["ximarket/xm_day_winter"].S); assert.equal(SCW["ximarket/xm_day"].fx.hide, SCW["ximarket/xm_day_winter"].fx.hide);
  assert.equal(SCW["ximarket/xm_tea"].fx.nobot, SCW["ximarket/xm_tea_winter"].fx.nobot);
  for (const k of ["ximarket/xm_night", "ximarket/xm_night_winter"]) assert.equal(ent(k), null, k);
  assert.equal(vm.runInContext("scwEntry", load(false))("ximarket/xm_day"), null);
  assert.equal(vm.runInContext("scwKey", C)("data/ximarket/xm_day_winter.webp?v=1117"), "ximarket/xm_day_winter");
});

test("座標整組照量好的值：外景 5 個入口、13 個藏點（數量跟原圖一樣）、走路 look0／N／E／HS；茶坊暗棋、4 塊小帥禁區", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), e = SCW["ximarket/xm_day"], t = SCW["ximarket/xm_tea"];
  assert.deepEqual(J(e.S), EXP.S); assert.deepEqual(J(e.fx.hide), EXP.hide); assert.equal(e.fx.hide.length, vm.runInContext("XSM_HIDE.length", C));
  assert.deepEqual(J(e.walk.look0), EXP.look0); assert.deepEqual(J(e.walk.N), EXP.N); assert.equal(e.walk.E, EXP.E); assert.deepEqual(J(e.walk.HS), EXP.HS);
  assert.deepEqual(J(t.S), EXP.teaS); assert.deepEqual(J(t.fx.nobot), EXP.nobot);
  for (const [x, y] of e.fx.hide) assert.ok(x > 0 && x < 100 && y > 0 && y < 100);
  for (const ed of e.walk.E.split(" ")) { const [a, b] = ed.split("-"); assert.ok(e.walk.N[a] && e.walk.N[b], ed) }
  for (const [id, h] of Object.entries(e.walk.HS)) assert.ok(e.walk.N[h[0]], id);
  assert.deepEqual(J(e.exit), [72, 92]); assert.ok(e.walk.h[0] > vm.runInContext("XSM_WALK.h[0]", C), "茶坊門比較高，小人身高放大");
});

test("藏點、茶坊禁區照現在用的那張圖：原圖照 XSM_HIDE、XSM_TEA_NOBOT，橫式圖照條目", () => {
  const C = load(true), [tab, nb, H0, N0] = vm.runInContext("[xsmHideTab, xsmTeaNoBot, XSM_HIDE, XSM_TEA_NOBOT]", C);
  const P = (key, scw) => ({ dataset: { scw: scw ? "l1610" : "" }, _scw: { key } });
  assert.equal(tab(P("ximarket/xm_day", false)), H0); assert.deepEqual(J(tab(P("ximarket/xm_day_winter", true))), EXP.hide);
  assert.equal(tab(P("ximarket/xm_night", true)), H0, "夜景沒有條目＝原圖藏點");
  const cnt = s => (s.match(/class="xsm-nobot"/g) || []).length, box = s => [...s.matchAll(/left:([\d.]+)%;top:([\d.]+)%/g)].map(m => [+m[1], +m[2]]);
  assert.equal(cnt(nb()), 4); assert.deepEqual(box(nb()), J(N0).map(r => [r[0], r[1]]), "沒給圖框＝原圖（既有呼叫照舊）");
  assert.deepEqual(box(nb(P("ximarket/xm_tea", true))), EXP.nobot.map(r => [r[0], r[1]]), "橫式圖照條目");
});

test("日夜、換季換圖（xsmScwTo）：橫向白天→換成橫式圖；轉夜景（沒條目）→ 07sw 退回原圖；冬景↔白天都是橫式圖時直接換成另一張橫式圖；沒掛 07sw＝照舊原圖網址", () => {
  const C = load(true), to = vm.runInContext("xsmScwTo", C);
  vm.runInContext("this.__set=[];scwSet=function(P,k){__set.push(k);P.dataset.scw=k}", C);   /* 只記 07sw 被叫去換成哪一種，不真的換圖 */
  const P = { dataset: { scw: "" }, style: {}, _scw: { key: "ximarket/xm_night", src0: "data/ximarket/xm_night.webp?v=1117" }, isConnected: true,
    parentNode: { scrollTop: 0, clientWidth: 1180, clientHeight: 2182, getBoundingClientRect: () => ({ top: 0 }) },   /* 圖框的父節點是內層容器（整頁內容高 2182，瀏覽器實測），選圖要量 #view 不是它 */ getBoundingClientRect: () => ({ top: 0 }) };
  dims.w = 1180; dims.h = 820;
  assert.equal(to(P, "data/ximarket/xm_day.webp?v=1117"), null, "要換成橫式圖：交給 07sw"); assert.deepEqual(J(C.__set), ["l1610"]); assert.equal(P._scw.key, "ximarket/xm_day"); assert.equal(P._scw.src0, "data/ximarket/xm_day.webp?v=1117");
  assert.equal(to(P, "data/ximarket/xm_day_winter.webp?v=1117"), "data/ximarket/xm_day_winter_l1610.webp?v=" + vm.runInContext("SCW_IMGV", C), "都是橫式：直接換成冬景的橫式圖");
  assert.equal(to(P, "data/ximarket/xm_night.webp?v=1117"), null); assert.deepEqual(J(C.__set), ["l1610", ""], "夜景沒有條目：退回原圖");
  dims.w = 820; dims.h = 1180; P.dataset.scw = "";
  assert.equal(to(P, "data/ximarket/xm_day.webp?v=1117"), "data/ximarket/xm_day.webp?v=1117", "直向：原圖網址");
  assert.equal(to({ dataset: {} }, "data/ximarket/xm_day.webp"), "data/ximarket/xm_day.webp", "沒掛 07sw");
});

test("〔原始碼〕07xsm 接線：外景、茶坊開頁先量（scwPre）、圖照 pre.src、掛 07sw（入口、apply 重擺棋子／重畫禁區）；每分鐘換圖走 xsmScwTo；找棋子照當下的藏點；橫式茶坊不畫雨", () => {
  assert.match(XM, /const src0=xsmSrc\(nd\),pre=typeof scwPre==="function"\?scwPre\(v,src0\):\{src:src0,k:""\};/);
  assert.match(XM, /const pre=typeof scwPre==="function"\?scwPre\(v,s0\):\{src:s0,k:""\};/);
  assert.match(XM, /ids:\["xsmGift","xsmMusic","xsmTea","xsmChess","xsmVisit"\],pfx:"xsm",cfg0:cfg,apply:\(\)=>\{if\(P\._xsmPc\)P\._xsmPc\(\)\}\}/);
  assert.match(XM, /scwMount\(P,\{key:scwKey\(s0\),src0:s0,ids:\["xsmDark"\],apply:nb\}\);nb\(\)/);
  assert.match(XM, /src0=xsmSrc\(nd\),src=xsmScwTo\(P,src0\);if\(src==null\)/);
  assert.match(XM, /if\(P\._scw\)\{const a=xsmSrc\(false,1\),t=xsmScwTo\(P,a\);/);
  assert.match(XM, /spOf=\(\)=>xsmHideTab\(P\)\[hi\]/); assert.match(XM, /if\(xsmNear\(spOf\(\),p,r\.width,r\.height\)\)\{/);
  assert.match(XM, /\.xsm-tea\.scw-l \.xsm-rain\{display:none\}/);
  assert.match(XM, /xsmWalk\(v,cfgNow\);/);
});
