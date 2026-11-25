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
const EXP = {"S":{"xsmGift":[18,38],"xsmMusic":[44,33],"xsmTea":[77,33],"xsmChess":[30,72],"xsmVisit":[86,76]},"hide":[[10,21],[29,15],[51,46],[69,42],[46,53],[72,47],[35,45],[29,82],[37,85],[23,89],[55,88],[73,74],[83,81]],"look0":[50,95],"N":{"home":[56,80],"c1":[52,66],"chess":[40,86],"cross":[50,58],"counter":[24,62],"music":[47,58],"tea":[70,52],"gate":[72,84],"g2":[80,92],"tree":[86,86]},"E":"home-chess home-c1 c1-cross cross-counter cross-music music-tea home-gate gate-g2 g2-tree","HS":{"xsmGift":["counter",18,40,"bow"],"xsmChess":["chess",30,74,"bow"],"xsmMusic":["music",44,40,"wave"],"xsmTea":["tea",76,35,"bow"],"xsmVisit":["tree",86,76,"wave"],"xsmExit":["gate",72,94,"wave"]},"teaS":{"xsmDark":[49,48]},"nobot":[[0,0,100,50],[0,50,30,100],[70,50,100,100],[32,50,64,84]]};
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
  assert.match(XM, /const src0=xsmSrc\(nd\),pre=xsmPre\(v,P,src0\);\n  P\.innerHTML=xsmImg\(pre,"西市：/, "外景開頁先量、圖照 pre（xsmPre、xsmImg 下面實跑）");
  assert.match(XM, /const pre=xsmPre\(v,P,s0\);/); assert.match(XM, /P\.innerHTML=xsmImg\(pre,`聽雨茶坊：/, "茶坊也是");
  assert.match(XM, /const cfgNow=xsmPageScw\(P,src0,pre,xsmWalkCfg\(\)\);/, "外景用原圖 src0 掛 07sw（xsmPageScw 下面實跑）");
  assert.match(XM, /scwMount\(P,\{key:scwKey\(s0\),src0:s0,ids:\["xsmDark"\],apply:nb\}\);nb\(\)/);
  assert.match(XM, /src0=xsmSrc\(nd\),src=xsmCdnAs\(im,xsmScwTo\(P,src0\)\);if\(src==null\)/);
  assert.match(XM, /\{const tm=setInterval\(\(\)=>\{if\(!P\.isConnected\)\{clearInterval\(tm\);return\}xsmTeaTick\(P,im\)\},60000\)\}/, "茶坊每分鐘交給 xsmTeaTick（下面實跑）");
  assert.match(XM, /pre\.onerror=\(\)=>xsmSwapBad\(P,src,nd\);pre\.src=src\}/, "外景換圖預載失敗交給 xsmSwapBad（下面實跑）");
  assert.match(XM, /const spOf=\(\)=>xsmHideOf\(day,xsmHideTab\(P\)\),/); assert.match(XM, /if\(xsmNear\(spOf\(\),p,r\.width,r\.height\)\)\{/);
  assert.match(XM, /\.xsm-tea\.scw-l \.xsm-rain\{display:none\}/);
  assert.match(XM, /xsmWalk\(v,cfgNow\);/);
});

/* ---- #169 Windows Claude 2 審查第 1、3、4 項：實跑 07sw＋07xsm，不只比對原始碼 ---- */
const mkImg = src => ({ _src: src, complete: true, naturalWidth: 2560, dataset: {}, onerror: null, getAttribute(k) { return k === "src" ? this._src : null }, addEventListener() { }, set src(v) { this._src = v }, get src() { return this._src } });
const mkP = (scw, img, cls) => { const el = {}; return { el, P: { dataset: scw == null ? {} : { scw }, style: {}, isConnected: true, parentNode: V, getBoundingClientRect: () => ({ top: 0 }),
  classList: { toggle(c, on) { on ? cls.add(c) : cls.delete(c) }, add(c) { cls.add(c) }, remove(c) { cls.delete(c) }, contains: c => cls.has(c) },
  querySelector: s => s === ":scope>img" ? img : s.startsWith("#") ? (el[s] || (el[s] = { style: { left: "1%", top: "2%" }, dataset: {} })) : null, querySelectorAll: () => [] } } };

test("〔混合〕外景開頁就是橫式圖：xsmScwO 建的設定交給真的 07sw scwMount → 5 個入口照條目擺、走路照條目、apply 重擺棋子；橫式圖載不到退回原圖 src0、記 SCW_BAD", () => {
  dims.w = 1180; dims.h = 820;
  const C = load(true), mk = vm.runInContext("xsmScwO", C), SRC = "data/ximarket/xm_day.webp?v=1117", cfg = { home: "home", HS: {} };
  const L = vm.runInContext("SCW", C)["ximarket/xm_day"], img = mkImg(vm.runInContext("scwSrc", C)(L)), { P, el } = mkP("l1610", img, new Set(["shp-page"]));
  let pc = 0; P._xsmPc = () => pc++;
  const o = mk(P, SRC, cfg); assert.equal(o.key, "ximarket/xm_day"); assert.equal(o.src0, SRC); assert.equal(o.cfg0, cfg); assert.equal(o.pfx, "xsm");
  vm.runInContext("scwMount", C)(P, o);
  assert.equal(P._scw, o); assert.ok(P.classList.contains("scw-l"));
  for (const [id, [x, y]] of Object.entries(EXP.S)) { assert.equal(el["#" + id].style.left, x + "%", id); assert.equal(el["#" + id].style.top, y + "%", id) }
  const w = vm.runInContext("scwWalkCfg", C)(o, vm.runInContext("scwCur", C)(P)); assert.deepEqual(J(w.N), EXP.N); assert.deepEqual(J(w.HS.xsmMusic), EXP.HS.xsmMusic);
  o.apply(); assert.equal(pc, 1, "apply 重擺今天那顆棋子");
  /* 原圖：入口不動 */
  const r = mkP("", mkImg(SRC), new Set()); vm.runInContext("scwMount", C)(r.P, mk(r.P, SRC, cfg)); assert.equal(r.el["#xsmMusic"].style.left, "1%");
  /* 開頁就是橫式圖、但圖載不到（載完沒有寬） → 07sw scwFail → 退回 src0、這次開 App 不再試 */
  const bad = mkImg(img.src); bad.naturalWidth = 0; const b = mkP("l1610", bad, new Set());
  vm.runInContext("scwMount", C)(b.P, mk(b.P, SRC, cfg));
  assert.equal(bad.src, SRC); assert.equal(b.P.dataset.scw, ""); assert.equal(vm.runInContext("SCW_BAD", C)["ximarket/xm_day"], 1);
});

test("外景換圖預載失敗（xsmSwapBad）：橫式冬景圖壞了＝記 SCW_BAD、退回原圖，不把白天原圖記成壞的；原圖冬景壞了才照 11/17 記 XSM_BAD.wd、白天原圖壞了記 d", () => {
  dims.w = 1180; dims.h = 820;
  const C = load(true), bad = vm.runInContext("xsmSwapBad", C), SCW = vm.runInContext("SCW", C), src = vm.runInContext("scwSrc", C);
  const SW0 = "data/ximarket/xm_day_winter.webp?v=1117", img = mkImg(src(SCW["ximarket/xm_day"])), { P } = mkP("l1610", img, new Set(["scw-l"]));
  P._scw = { key: "ximarket/xm_day_winter", src0: SW0, ids: [] };
  bad(P, src(SCW["ximarket/xm_day_winter"]), true);
  assert.equal(vm.runInContext("SCW_BAD", C)["ximarket/xm_day_winter"], 1, "橫式冬景記進 07sw 的 SCW_BAD");
  assert.deepEqual(J(vm.runInContext("XSM_BAD", C)), {}, "原圖沒壞，不記 XSM_BAD（不會讓整天變夜景）");
  assert.equal(P.dataset.scw, ""); assert.equal(img.src, SW0, "退回原圖冬景");
  bad({ dataset: {} }, SW0, true); assert.equal(vm.runInContext("XSM_BAD.wd", C), 1, "原圖冬景壞了：只記冬景");
  bad({ dataset: {} }, "data/ximarket/xm_day.webp?v=1117", true); assert.equal(vm.runInContext("XSM_BAD.d", C), 1, "原圖白天壞了");
});

test("茶坊每分鐘（xsmTeaTick）：沒掛 07sw＝原圖網址；掛著、橫向＝照鍵換成冬景的橫式圖、記冬天；要 07sw 換的（回 null）不自己動 img；網址一樣不動", () => {
  dims.w = 1180; dims.h = 820;
  const C = load(true), tick = vm.runInContext("xsmTeaTick", C), src = vm.runInContext("scwSrc", C), SCW = vm.runInContext("SCW", C);
  vm.runInContext("this.__w=true;this.__set=[];this.sw7WinterNow=function(){return __w};this.xqNight=function(){return false};this.sw7Kick=function(){};scwSet=function(P,k){__set.push(k);P.dataset.scw=k}", C);
  C.__a = vm.runInContext("xsmSrc(false,1)", C); assert.equal(C.__a, "data/ximarket/xm_tea_winter.webp?v=1117");
  const im0 = mkImg("data/ximarket/xm_tea.webp?v=1117"), p0 = mkP("", im0, new Set()).P; tick(p0, im0);
  assert.equal(im0.src, C.__a, "沒掛 07sw：換成原圖冬景"); assert.equal(p0.dataset.win, "1"); assert.equal(p0.dataset.day, "1");
  const im = mkImg(src(SCW["ximarket/xm_tea"])), { P } = mkP("l1610", im, new Set(["scw-l"])); P._scw = { key: "ximarket/xm_tea", src0: "data/ximarket/xm_tea.webp?v=1117", ids: [] };
  tick(P, im); assert.equal(im.src, src(SCW["ximarket/xm_tea_winter"]), "橫向：換成茶坊冬景的橫式圖"); assert.equal(P.dataset.win, "1"); assert.equal(P._scw.key, "ximarket/xm_tea_winter");
  const before = im.src; tick(P, im); assert.equal(im.src, before, "網址一樣不動"); assert.deepEqual(J(C.__set), []);
  dims.w = 820; dims.h = 1180; C.__w = false; tick(P, im);
  assert.deepEqual(J(C.__set), [""], "轉直向：交給 07sw 換回原圖"); assert.equal(im.src, before, "07sw 換的，tick 不自己動 img"); assert.equal(P.dataset.win, "");
});

/* ---- #169 複審（Windows Claude 2）第 1、2 項 ---- */
test("開頁（xsmPre、xsmImg、xsmPageScw）實跑：橫向＝圖框帶 data-scw、圖一開始就是橫式圖、入口照條目、走路照條目、擺今天那顆棋子；直向＝原圖、入口不動", () => {
  const C = load(true), [pre, img, ps] = vm.runInContext("[xsmPre, xsmImg, xsmPageScw]", C), SRC = "data/ximarket/xm_day.webp?v=1117", cfg = { home: "home", HS: {} };
  const L = vm.runInContext("scwSrc(SCW['ximarket/xm_day'])", C);
  dims.w = 1180; dims.h = 820;
  { const cls = new Set(), im = mkImg(""), { P, el } = mkP(undefined, im, cls); let pc = 0; P._xsmPc = () => pc++;
    const r = pre(V, P, SRC); assert.equal(r.src, L); assert.equal(P.dataset.scw, "l1610"); assert.ok(cls.has("scw-l"));
    assert.equal(img(r, "西市"), `<img src="${L}" alt="西市">`, "圖一開始就載橫式圖"); im._src = r.src;
    const c = ps(P, SRC, r, cfg); assert.equal(P._scw.src0, SRC, "07sw 記的是原圖"); assert.equal(P._scwW, "l");
    assert.deepEqual(J(c.N), EXP.N, "走路照條目"); assert.equal(pc, 1, "擺今天那顆棋子");
    for (const [id, [x, y]] of Object.entries(EXP.S)) assert.equal(el["#" + id].style.left + "," + el["#" + id].style.top, x + "%," + y + "%", id) }
  dims.w = 820; dims.h = 1180;
  { const cls = new Set(), im = mkImg(SRC), { P, el } = mkP(undefined, im, cls); let pc = 0; P._xsmPc = () => pc++;
    const r = pre(V, P, SRC); assert.equal(r.src, SRC); assert.ok(!P.dataset.scw); assert.ok(!cls.has("scw-l"));
    const c = ps(P, SRC, r, cfg); assert.equal(c, cfg, "原圖走路設定"); assert.equal(pc, 1); assert.equal(el["#xsmMusic"].style.left, "1%", "入口不動") }
});

test("00-util 補抓過 CDN 之後（cdnTry、src 是 XQ_CDN＋相對路徑）：外景 xsmSwap、茶坊 xsmTeaTick 每分鐘不會把好好的圖當壞圖；換季照 CDN 網址預載、換上", () => {
  dims.w = 1180; dims.h = 820;
  const C = load(true), CDN = "https://cdn.test/";
  vm.runInContext(`this.XQ_CDN=${JSON.stringify(CDN)};this.__w=false;this.__pre=[];this.sw7WinterNow=function(){return __w};this.xqNight=function(){return false};this.sw7Kick=function(){};
    this.Image=function(){const me=this;__pre.push(me);Object.defineProperty(me,"src",{set(u){me._u=u;(u.indexOf(XQ_CDN)===0?me.onload:me.onerror)()},get(){return me._u}})}`, C);   /* 同源都 404、只有 CDN 有圖 */
  const [swap, tick, src] = vm.runInContext("[xsmSwap, xsmTeaTick, scwSrc]", C), SCW = vm.runInContext("SCW", C), cdnOf = u => CDN + u.split("?")[0];
  const mount = (key, src0) => { const im = mkImg(cdnOf(src(SCW[key]))); im.dataset.cdnTry = "1"; const { P } = mkP("l1610", im, new Set(["scw-l"])); P._scw = { key, src0, ids: [] }; return { P, im } };
  const o = mount("ximarket/xm_day", "data/ximarket/xm_day.webp?v=1117");
  swap(o.P, true); swap(o.P, true);
  assert.equal(C.__pre.length, 0, "網址一樣（CDN 那張）不預載"); assert.deepEqual(J(vm.runInContext("SCW_BAD", C)), {}); assert.deepEqual(J(vm.runInContext("XSM_BAD", C)), {});
  assert.equal(o.im.src, cdnOf(src(SCW["ximarket/xm_day"])), "還是橫式圖"); assert.equal(o.P.dataset.scw, "l1610");
  C.__w = true; swap(o.P, true);
  assert.equal(C.__pre[0]._u, cdnOf(src(SCW["ximarket/xm_day_winter"])), "換季照 CDN 網址預載"); assert.equal(o.im.src, C.__pre[0]._u); assert.deepEqual(J(vm.runInContext("SCW_BAD", C)), {});
  C.__w = false; const t = mount("ximarket/xm_tea", "data/ximarket/xm_tea.webp?v=1117"), t0 = t.im.src;
  tick(t.P, t.im); assert.equal(t.im.src, t0, "茶坊：CDN 那張不動"); assert.equal(t.P.dataset.scw, "l1610");
  C.__w = true; tick(t.P, t.im); assert.equal(t.im.src, cdnOf(src(SCW["ximarket/xm_tea_winter"])), "茶坊換季也走 CDN");
  /* CDN 上的橫式圖也壞了才記 SCW_BAD、退回原圖 */
  const b = mount("ximarket/xm_day", "data/ximarket/xm_day.webp?v=1117"); C.__w = false;
  vm.runInContext("xsmSwapBad", C)(b.P, cdnOf(src(SCW["ximarket/xm_day"])), true);
  assert.equal(vm.runInContext("SCW_BAD", C)["ximarket/xm_day"], 1); assert.deepEqual(J(vm.runInContext("XSM_BAD", C)), {});
  /* 沒補抓過（沒有 cdnTry）照舊相對網址 */
  const cdnAs = vm.runInContext("xsmCdnAs", C); assert.equal(cdnAs(mkImg("data/ximarket/xm_day.webp?v=1117"), "data/ximarket/xm_day_winter.webp?v=1117"), "data/ximarket/xm_day_winter.webp?v=1117");
  assert.equal(cdnAs(o.im, null), null, "07sw 已經換好（null）照傳");
});
