// W107-L 第 3 批：渡口（07f Port）iPad 橫向專用橫式圖，只有全彩版 port_<朝>_f_l1610（13 張，每朝構圖不同，各一套座標，條目寫在 07f 的 PORT_L1610）。
// 檢查：13 朝都登記（鍵＝全彩直圖 port_<朝>_f）；三扇門、景點、碼頭盡頭的格式和數量跟原本的表一樣、在圖內；路網接得起來、碼頭盡頭接進路網、景點和門都有小動作；
// 明朝繞開內湖（home-m1-i1）；開頁照 scwPre 選全彩圖；上色過場、風、船艙動態、走路、渡口主人、碼頭標籤在橫式圖時的處理。
// 用法 node --test xiangqi-lab/tools/test-w107-port-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), F = M("m/07f-ship.js"), WK = M("m/07w-shipwalk.js"), W4 = M("m/07w4-porthost.js"), PC = M("m/07p-portcolor.js"), PW = M("m/07r-portwind.js"), PF = M("m/07n-portfx.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const ENTRY = cut(F, "const PORT_L1610=", 'fx:{sight:T.sight||[],pier:T.pier}}}');
const ERAS = ["classic", "qin", "han", "sanguo", "weijin", "nanbei", "sui", "tang", "wudai", "song", "yuan", "ming", "qing"];
const J = x => JSON.parse(JSON.stringify(x));
function load() {
  const ctx = vm.createContext({ localStorage: { getItem: () => null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); vm.runInContext(cut(F, "const PORT_SIGHT=", "};") + "\n" + ENTRY, ctx);
  return ctx;
}

test("條目：13 朝都登記，鍵是全彩直圖 port_<朝>_f、檔名加 _l1610；船艙有千秋石桌、其他朝有古戰場；夜景、淡彩沒有登記", () => {
  const C = load(), SCW = vm.runInContext("SCW", C);
  for (const k of ERAS) {
    const e = SCW["shipmap/port_" + k + "_f"]; assert.ok(e, k); assert.equal(e.f, "shipmap/port_" + k + "_f_l1610"); assert.equal(e.w, 2560); assert.equal(e.ready, true);
    for (const id of ["poPark", "poInn", "poArena"]) assert.ok(e.S[id], k + " " + id);
    if (k === "classic") { assert.ok(e.S.poPh); assert.equal(e.S.poBattle, undefined) } else { assert.ok(e.S.poBattle); assert.equal(e.S.poPh, undefined) }
    assert.equal(SCW["shipmap/port_" + k + "_c"], undefined, k + " 淡彩沒有"); assert.equal(SCW["shipmap/port_" + k], undefined, k + " 原圖鍵不用");
  }
  assert.equal(vm.runInContext('scwKey("data/shipmap/port_tang_f.webp")', C), "shipmap/port_tang_f");
});

test("座標：三扇門 3 個、景點數量跟 PORT_SIGHT 一樣、碼頭盡頭跟 PH4_PIER 同格式；都在圖內", () => {
  const C = load(), T = vm.runInContext("PORT_L1610", C), PS = vm.runInContext("PORT_SIGHT", C);
  assert.deepEqual(Object.keys(T).sort(), ERAS.slice().sort());
  const inImg = ([x, y]) => x > 0 && x < 100 && y > 0 && y < 100;
  for (const k of ERAS) {
    const t = T[k]; assert.equal(t.spot.length, 3, k); for (const p of t.spot) assert.ok(inImg(p), k + " 門 " + p);
    assert.equal((t.sight || []).length, (PS[k] || []).length, k + " 景點數"); for (const p of t.sight || []) assert.ok(inImg(p), k + " 景點 " + p);
    const P = t.pier; assert.ok(P.N.pier && P.E && P.at && P.boat, k + " 碼頭盡頭"); for (const p of [P.at, P.boat, ...Object.values(P.N)]) assert.ok(inImg(p), k + " 碼頭 " + p);
  }
  assert.deepEqual(J(T.tang.spot), [[22, 62], [75, 74], [46, 54]], "唐（照 json 寫死）"); assert.deepEqual(J(T.classic.poPh), [53, 66]);
  assert.deepEqual(J(T.han.spot), [[34, 68], [71, 78], [48, 46]], "han 門"); assert.deepEqual(J(T.han.pier.at), [20, 74]); assert.deepEqual(J(T.han.pier.boat), [14, 84]);
  assert.deepEqual(J(T.sui.spot), [[25, 66], [86, 70], [63, 52]], "sui 門"); assert.deepEqual(J(T.sui.pier.at), [18, 84]); assert.deepEqual(J(T.sui.pier.boat), [14, 90]);
  assert.deepEqual(J(T.song.spot), [[28, 64], [75, 82], [58, 54]], "song 門"); assert.deepEqual(J(T.song.pier.at), [16, 82]); assert.deepEqual(J(T.song.pier.boat), [10, 88]);
  assert.deepEqual(J(T.qing.spot), [[42, 70], [74, 62], [54, 48]], "qing 門"); assert.deepEqual(J(T.qing.pier.at), [16, 86]); assert.deepEqual(J(T.qing.pier.boat), [10, 90]);
  assert.deepEqual(J(T.classic.spot), [[24, 52], [80, 50], [52, 28]], "classic 門"); assert.deepEqual(J(T.classic.pier.at), [18, 74]); assert.deepEqual(J(T.classic.pier.boat), [12, 84]);
});

test("路網：13 朝的邊都接在節點上、從 home 走得到每個節點（含碼頭盡頭）；門、景點、上星槎都有小動作", () => {
  const C = load(), SCW = vm.runInContext("SCW", C), T = vm.runInContext("PORT_L1610", C);
  for (const k of ERAS) {
    const W = SCW["shipmap/port_" + k + "_f"].walk, N = Object.keys(W.N), Ed = W.E.split(" ").map(e => e.split("-"));
    for (const [a, b] of Ed) { assert.ok(N.includes(a), k + " 邊 " + a); assert.ok(N.includes(b), k + " 邊 " + b) }
    const seen = new Set(["home"]); let g = true;
    while (g) { g = false; for (const [a, b] of Ed) { if (seen.has(a) && !seen.has(b)) { seen.add(b); g = true } if (seen.has(b) && !seen.has(a)) { seen.add(a); g = true } } }
    assert.deepEqual([...seen].sort(), N.slice().sort(), k + " 都接得到 home");
    for (const [id, h] of Object.entries(W.HS)) assert.ok(N.includes(h[0]), k + " " + id + " 站點 " + h[0]);
    assert.ok(W.HS.poBoard && W.HS.poBoard[0] === "pier", k + " 上星槎");
    for (const id of ["poPark", "poInn", "poArena"]) assert.ok(W.HS[id], k + " " + id);
    (T[k].sight || []).forEach((_, i) => assert.ok(W.HS["ps" + i], k + " ps" + i));
    for (const p of Object.values(W.N)) assert.ok(p[0] > 0 && p[0] < 100 && p[1] > 0 && p[1] < 100);
  }
});

test("明朝：home 不直接連 i1（會擦到內湖），改經石堤頂沙路的 m1", () => {
  const C = load(), W = vm.runInContext('SCW["shipmap/port_ming_f"].walk', C), Ed = W.E.split(" ");
  assert.ok(!Ed.includes("home-i1") && !Ed.includes("i1-home")); assert.ok(Ed.includes("home-m1") && Ed.includes("m1-i1"));
  assert.deepEqual(J(W.N.m1), [46.5, 76.5]);
});

test("走路出口（上星槎）：渡口橫式圖（路網 W＝2560）走出去上橫式圖的船，直圖照舊上 PH4_PIER 的船（審查 #165 第 1 項）", () => {
  const ctx = vm.createContext({ SHW_EXIT_ON: true, Object, Array, String });
  vm.runInContext(ENTRY.replace(/if\(typeof SCW!=="undefined"\)[\s\S]*$/, "") + "\n" + cut(W4, "const PH4_PIER={", "}};\n") + "\n" + "const SHW_EXITS={" + cut(WK, '"port:*":', "},") + "};\n" + cut(WK, "function shwExitCfg(o){", "X:{n,out:X.out,r:X.r}})}"), ctx);
  const T = vm.runInContext("PORT_L1610", ctx), H = vm.runInContext("PH4_PIER", ctx), f = vm.runInContext("shwExitCfg", ctx);
  for (const k of ["han", "tang", "classic"]) {
    const wide = f({ mem: "port:" + k, cfg: { W: 2560, home: "home", N: Object.assign({}, T[k].walk.N, T[k].pier.N), E: "" } });
    assert.deepEqual(J(wide.X.out), J(T[k].pier.boat), k + " 橫式圖上橫式的船");
    const port = f({ mem: "port:" + k, cfg: { W: 768, home: "home", N: Object.assign({ home: [50, 70] }, H[k].N), E: "" } });
    assert.deepEqual(J(port.X.out), J(H[k].boat), k + " 直圖照舊");
  }
  assert.notDeepEqual(J(T.han.pier.boat), J(H.han.boat), "漢的兩條船位置不同（以前橫式圖會走去直圖的船、走進水裡）");
});

test("上色過場：轉成橫式圖（圖框 data-scw 有值）時 pcSet 不換圖；直圖照舊換上全彩", () => {
  const ctx = vm.createContext({ pcIfx: () => { } });
  vm.runInContext(cut(PC, "function pcSet(img,src,orig){", "img.src=L[0]}"), ctx);
  const mk = scw => ({ src: "data/shipmap/port_tang_f_l1610.webp", closest: () => ({ dataset: { scw } }) });
  const a = mk("l1610"); vm.runInContext("pcSet", ctx)(a, ["data/shipmap/port_tang_f.webp"], "x"); assert.equal(a.src, "data/shipmap/port_tang_f_l1610.webp", "橫式圖不被換回直圖");
  const b = mk(""); vm.runInContext("pcSet", ctx)(b, ["data/shipmap/port_tang_f.webp"], "x"); assert.equal(b.src, "data/shipmap/port_tang_f.webp");
});

test("〔原始碼〕開頁照 scwPre 選全彩圖；上色過場、風、船艙動態在橫式圖不掛（轉成橫式時藏起來）；走路、渡口主人照條目；景點、碼頭標籤走 scwPut", () => {
  assert.match(F, /src0="data\/shipmap\/port_"\+k\+\(full\?"_f":""\)\+"\.webp",pre=scwPre\(v,src0\);/);
  assert.match(F, /try\{portScw\(v,k\)\}catch\(e\)\{\}shpFit\(v\);if\(typeof portColor==="function"\)portColor\(v,k\);/, "portScw 在上色前跑");
  assert.match(F, /scwMount\(P,\{key:scwKey\(src0\),src0,ids:\["poPark","poInn","poArena","poBattle","poPh"\],pfx:"port:"\+k,cfg0:C,apply:place\}\)/);
  assert.match(F, /P\.querySelectorAll\("\.po-sight"\)\.forEach\(b=>\{const s=X&&X\.sight\[\+b\.dataset\.ps\];scwPut\(b,s\|\|null\)\}\);/);
  assert.match(F, /if\(b\)scwPut\(b,X\?X\.pier\.at:null\);/);
  assert.match(F, /\.shp-page\.scw-l \.pw-gl,\.shp-page\.scw-l \.pfx-gl,\.shp-page\.scw-l \.shp-gldev\{display:none!important\}/);
  for (const [src, name] of [[PC, "portColor"], [PW, "portWind"], [PF, "portFx"]]) assert.match(cut(src, "function " + name + "(v,k){", "\n  if(P.dataset.scw)return;"), /if\(P\.dataset\.scw\)return;$/, name + " 橫式圖不掛");
  assert.match(WK, /if\(e&&e\.walk&&P\._scw\)\{C=scwWalkCfg\(P\._scw,e\);P\._scwW="l"\}/, "shwPort 用條目路網");
  assert.match(W4, /const C=ph4Cfg\(P,k\);P\._ph4L=C\.W===2560;/, "渡口主人站位照 ph4Cfg（橫式圖用條目）");
  assert.match(W4, /P\.append\(b\);if\(P\._portPlace\)P\._portPlace\(\)\}/, "碼頭標籤晚加也照條目放");
  assert.match(W4, /if\(!at\)at=\(C\.W===2560\?null:PH4_AT\[k\]\)\|\|ph4Spot\(P,C,hFr\);/, "橫式圖不用直圖寫死的主人站位（審查 #165 第 2 項）");
  assert.match(W4, /P\._ph4L=C\.W===2560;/, "記下主人是照哪一種圖站的");
  assert.match(F, /if\(P\.dataset\.ph4&&P\._ph4L!=null&&P\._ph4L!==!!X&&typeof ph4Mount==="function"\)\{P\.querySelectorAll\(":scope>\.ph4"\)\.forEach\(e=>e\.remove\(\)\);delete P\.dataset\.ph4;/, "轉向換了圖就重掛主人");
});

// 假的元素：只做 portScwStop、pcRun 開頭會碰到的部分
function fakeEl(cls) {
  const c = new Set(cls || []);
  return { removed: false, style: {}, dataset: {}, isConnected: true, classList: { add: (...a) => a.forEach(x => c.add(x)), remove: (...a) => a.forEach(x => c.delete(x)), contains: x => c.has(x) }, has: x => c.has(x), remove() { this.removed = true } };
}
test("〔混合〕轉成橫式圖收掉直圖的動態：上色過場停播、疊層和風／WebGL 畫布拿掉、底圖恢復可見（不再 hidden、沒有灰階濾鏡）、按鈕位移清掉、SPX 放手", () => {
  const P = fakeEl(["pc-run", "pw-on", "pfx-on", "scw-l"]), img = fakeEl(), col = fakeEl(), wind = fakeEl(), gl = fakeEl(), spot = fakeEl(), sight = fakeEl();
  img.style.visibility = "hidden"; img.style.filter = "grayscale(1)"; spot.style.translate = "3px 2px"; sight.style.translate = "1px 1px";
  let stopped = 0; P._pcStop = () => { stopped++ };
  P.querySelectorAll = sel => sel.includes(".pc-col") ? [col, wind, gl] : sel.includes(".shp-spot") ? [spot, sight] : [];
  const ctx = vm.createContext({ SPX: { el: P } });
  vm.runInContext(cut(F, "function portScwStop(P,img){", "b.style.translate=\"\")}"), ctx);
  vm.runInContext("portScwStop", ctx)(P, img);
  assert.equal(stopped, 1, "上色過場停播");
  assert.ok(col.removed && wind.removed && gl.removed, "疊層、風、WebGL 畫布拿掉");
  for (const c of ["pc-run", "pw-on", "pfx-on"]) assert.ok(!P.has(c), "拿掉 " + c);
  assert.ok(P.has("scw-l"), "橫式的 class 留著");
  assert.equal(img.style.visibility, ""); assert.equal(img.style.filter, "");
  assert.equal(spot.style.translate, ""); assert.equal(sight.style.translate, "");
  assert.equal(vm.runInContext("SPX.el", ctx), null, "船艙動態迴圈看到 SPX.el 換掉就停");
  // 沒有 SPX、沒有過場也不出錯
  const P2 = fakeEl(); P2.querySelectorAll = () => [];
  const c2 = vm.createContext({}); vm.runInContext(cut(F, "function portScwStop(P,img){", "b.style.translate=\"\")}"), c2); vm.runInContext("portScwStop", c2)(P2, fakeEl());
  assert.match(F, /const place=\(\)=>\{const e=typeof scwCur==="function"\?scwCur\(P\):null,X=e&&e\.fx;\n[^\n]*\n\s*if\(X\)portScwStop\(P,img\);/, "place 換成橫式圖時呼叫");
});
test("〔混合〕上色過場：圖框已是橫式圖就不播、拿掉 pc-run；播的時候留 _pcStop 給轉向收掉（停迴圈、拿掉疊層）", () => {
  const head = cut(PC, "function pcRun(P,img,src,orig,full){", "\n");
  const ctx = vm.createContext({ made: 0, document: { createElement: () => { vm.runInContext("made++", ctx); return fakeEl() } } });
  vm.runInContext(head + "return \"直圖照播\"}", ctx);
  const P = fakeEl(["pc-run"]); P.dataset.scw = "l1610";
  assert.equal(vm.runInContext("pcRun", ctx)(P, fakeEl()), undefined); assert.ok(!P.has("pc-run")); assert.equal(vm.runInContext("made", ctx), 0, "沒有疊上上色圖");
  const Q = fakeEl(["pc-run"]); Q.dataset.scw = "";
  assert.equal(vm.runInContext("pcRun", ctx)(Q, fakeEl()), "直圖照播");
  assert.match(cut(PC, "function pcRun(", "\nconst YZC_ON"), /P\._pcStop=\(\)=>\{done=true;cancelAnimationFrame\(raf\);P\.removeEventListener\("click",skip,true\);o\.remove\(\);if\(o2\)o2\.remove\(\);/);
});
test("〔混合〕風、船艙動態的素材載完時：圖框已換成橫式圖、或畫布已被收掉，就不再把底圖藏起來（直向開頁、素材載到一半轉橫向；審查 #165 第三輪）", () => {
  for (const [src, a] of [[PF, '"port_classic.webp"].map(ld)).then(im=>{'], [PW, '["sm_mist_ink.webp","sm_mist_fog.webp"].map(ld)).then(im=>{']]) {
    const i = src.indexOf(a); assert.ok(i >= 0, a); const j = src.indexOf("return;", i); const guard = src.slice(i + a.length, j + 7);
    const f = vm.runInContext("(P,cv)=>{" + guard + "return \"往下\"}", vm.createContext({}));
    assert.equal(f({ isConnected: true, dataset: { scw: "" } }, { isConnected: true }), "往下", "直向照舊往下跑");
    assert.equal(f({ isConnected: true, dataset: { scw: "l1610" } }, { isConnected: true }), undefined, "已換成橫式圖");
    assert.equal(f({ isConnected: true, dataset: { scw: "" } }, { isConnected: false }), undefined, "畫布已被 portScwStop 拿掉");
    assert.equal(f({ isConnected: false, dataset: { scw: "" } }, { isConnected: true }), undefined, "離開頁面");
  }
});

test("〔混合〕ph4Cfg：直圖照 SHW_PORT（身高乘 SHW_PORT_K）、橫式圖照條目路網（W 2560、home 照條目）；主人泡泡 ph4Line、07w5 偶遇的信 oyCfg 都走 ph4Cfg（審查 #165 第四輪）", () => {
  const C = load(); C.localStorage = { getItem: k => k === "xqScwDev" ? "1" : null };
  vm.runInContext("const SHW_PORT={sui:{N:{home:[70,80],a:[60,70]},E:'home-a',home:'home',h:[.1,80,.001]}},SHW_PSX={},SHW_PORT_K=1.5;function shwCfg(a){return JSON.parse(JSON.stringify(a))}\n" + cut(W4, "function ph4Cfg(P,k){", "return C}"), C);
  const ph4Cfg = vm.runInContext("ph4Cfg", C), E = vm.runInContext("SCW['shipmap/port_sui_f']", C);
  const tall = ph4Cfg({ dataset: { scw: "" } }, "sui");
  assert.deepEqual(J(tall.N.home), [70, 80]); assert.deepEqual(J(tall.h), [.15000000000000002, 80, .0015], "直圖身高乘 SHW_PORT_K"); assert.equal(tall.W, undefined);
  const P = { dataset: { scw: "l1610" }, _scw: { key: "shipmap/port_sui_f", cfg0: tall } };
  const wide = ph4Cfg(P, "sui");
  assert.equal(wide.W, 2560, "橫式路網"); assert.deepEqual(J(wide.N.home), J(E.walk.N.home), "home 照條目（不是直圖的 70%）"); assert.notDeepEqual(J(wide.N.home), [70, 80]);
  assert.equal(ph4Cfg(P, "nope"), null);
  assert.match(cut(W4, "function ph4Line(v,k){", "setTimeout(go,900)}"), /const C=ph4Cfg\(P,k\),H=C&&C\.N\[C\.home\]\|\|\[50,70\],Ih=P\.clientHeight,Iw=P\.clientWidth,hh=C\?shwHt\(C,H\[1\]\)\*Ih:Ih\*\.06;/, "泡泡照 ph4Cfg（身高已乘過，不再乘一次）");
  const W5 = M("m/07w5-ouyu.js");
  const oy = vm.runInContext("var SHW_YZ;" + cut(W5, "function oyCfg(place,k,P){", "catch(e){return null}}") + ";oyCfg", C);
  assert.equal(oy("port", "sui", P).W, 2560, "偶遇的信：橫式圖用條目路網"); assert.deepEqual(J(oy("port", "sui", { dataset: { scw: "" } }).N.home), [70, 80]);
  assert.equal((W5.match(/oyCfg\(place,k,P\)/g) || []).length, 4, "定義一處、三個呼叫處（信、小人、轉向重掛）都傳 P"); assert.doesNotMatch(W5, /oyCfg\(place,k\)/);
});

test("〔混合〕07w5 偶遇轉向重放：信照當下的路網重找位置；3D 小人收掉舊的、照新路網重掛；07f place 只在直橫換了才叫（審查 #165 第五輪）", () => {
  const W5 = M("m/07w5-ouyu.js"), src = cut(W5, "function oyPage(v,k,place){", "\n  mount()}");
  const mkEl = () => { const e = { style: {}, dataset: {}, isConnected: false, children: [], className: "", _c: new Set(), setAttribute() { }, remove() { this.isConnected = false } };
    e.classList = { add: c => e._c.add(c), remove: c => e._c.delete(c), toggle: (c, on) => on ? e._c.add(c) : e._c.delete(c), contains: c => e._c.has(c) }; return e };
  const run = (letter) => {
    const figs = [], P = mkEl(); P.isConnected = true;
    P.append = (...c) => c.forEach(x => { x.isConnected = true; P.children.push(x) }); P.insertBefore = (x) => P.append(x); P.querySelector = () => null;
    const v = { querySelector: q => q === ".shp-page.cq" ? P : null };
    const ctx = vm.createContext({ OUYU_ON: true, OY_LETTER: letter, document: { createElement: mkEl, querySelector: () => null }, setTimeout: f => f(), requestAnimationFrame: f => f(),
      oyBackVisit: () => null, oyRoll: () => ({ w: "x" }), oyCss() { }, oySt: () => ({}), oyName: () => "路人", OY_WHO: { x: { ic: "?", pc: 1 } }, esc: s => s, oyModel: () => "m",
      oyCfg: (pl, k, p) => ({ W: p.dataset.scw ? 2560 : 768 }), oySpot: (p, C) => C.W === 2560 ? [44, 70] : [46, 75], XQBot3D: {}, shwRM: () => false,
      oyFig: (p, C, k, m, pc, box) => { figs.push([C.W, box]); return Promise.resolve() } });
    vm.runInContext(src, ctx); vm.runInContext("oyPage", ctx)(v, "tang", "port");
    return { P, figs };
  };
  // 信
  let { P } = run(true); const env = P.children.find(x => x.className === "oy-env");
  assert.equal(env.style.left + "," + env.style.top, "46%,75%");
  P.dataset.scw = "l1610"; P._oyRe(); assert.equal(env.style.left + "," + env.style.top, "44%,70%", "轉橫式照條目路網重放");
  P.dataset.scw = ""; P._oyRe(); assert.equal(env.style.left, "46%", "轉回直向還原");
  // 3D 小人
  const R = run(false); assert.deepEqual(R.figs.map(f => f[0]), [768]); const box0 = R.figs[0][1];
  R.P.dataset.scw = "l1610"; R.P._oyRe();
  assert.equal(box0.isConnected, false, "舊的小人收掉（3D 迴圈看到框不在了自己停）"); assert.deepEqual(R.figs.map(f => f[0]), [768, 2560], "照新路網重掛"); assert.equal(R.figs[1][1].isConnected, true);
  // 07f：只在直橫換了才叫
  const line = cut(F, "if(P._oyL!=null&&P._oyL!==!!X&&", "P._oyL=!!X;");
  const f = vm.runInContext("(P,X)=>{" + line + "}", vm.createContext({ setTimeout: g => g() }));
  let n = 0; const Q = { isConnected: true, _oyRe: () => n++ };
  f(Q, null); f(Q, null); assert.equal(n, 0, "第一次和沒換都不叫"); f(Q, { sight: [] }); assert.equal(n, 1, "直→橫叫一次"); f(Q, { sight: [] }); assert.equal(n, 1); f(Q, null); assert.equal(n, 2, "橫→直再叫");
  assert.match(F, /const place=\(\)=>\{[^]*?if\(P\._oyL!=null&&P\._oyL!==!!X&&typeof P\._oyRe==="function"\)/, "在 portScw 的 place 裡");
});
