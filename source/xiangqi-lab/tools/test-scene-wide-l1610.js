// W107-L（開發者 11/25「重畫真正的橫式構圖」「classic 先做 8 張」）：場景頁在 iPad 橫向換成專門畫的 2560×1600 橫式圖，
// 入口、出口、走路節點、疊圖都照那張圖的座標；手機、iPad 直向、沒登記的變體照舊原圖。第一頁：錯棋重練經典世界白天。
// 修法：新模組 xiangqi-db/m/07sw-scenewide.js（把首頁 07z HMW 通用化）；07fl 的 r07Wide 包裝多問 scwSync；07y8 掛上；07w7 天氣、07w6 物件說明遇到橫式圖換或關。
// 不開瀏覽器：純計算直接在 vm 跑；換圖用假的 #view／圖框跑。用法 node --test xiangqi-lab/tools/test-scene-wide-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC = M("m/07sw-scenewide.js");
function load(extra) {
  const ctx = vm.createContext(Object.assign({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, addEventListener: () => { }, isFinite, Math, Object, String, localStorage: { getItem: () => null } }, extra || {}));
  vm.runInContext(SRC, ctx);
  return ctx;
}
const C0 = load(), [scwKind, scwKey, scwEntry, scwSw7, SCW, SCW_BAD] = vm.runInContext("[scwKind, scwKey, scwEntry, scwSw7, SCW, SCW_BAD]", C0);
const RD = "redomap/redo_day_classic";

test("選圖：iPad 橫向、Duo 攤開橫拿換橫式圖；手機橫放、iPad 直向、接近正方形、太矮都照舊原圖", () => {
  const av = (h, top = 86) => h - top;
  assert.equal(scwKind(1180, av(820), 1180, 820), "l1610", "iPad Air 11 橫向");
  assert.equal(scwKind(1376, av(1032), 1376, 1032), "l1610", "iPad Pro 13 橫向");
  assert.equal(scwKind(890, av(626), 890, 626), "l1610", "Duo 攤開橫拿");
  assert.equal(scwKind(956, av(440), 956, 440), "", "手機橫放（短邊不到 600）");
  assert.equal(scwKind(820, av(1180), 820, 1180), "", "iPad 直向");
  assert.equal(scwKind(800, 790, 800, 900), "", "接近正方形（1.04 以下）");
  assert.equal(scwKind(1180, 100, 1180, 820), "", "可用高太矮");
  assert.equal(scwKind(0, 700, 1180, 820), "");
});

test("圖網址 → 鍵；條目要 ready、或開發用開關，載不到過的不再用", () => {
  assert.equal(scwKey("data/redomap/redo_day_classic.webp?v=2411"), RD);
  assert.equal(scwKey("https://x.test/data/redomap/redo_day_classic_l1610.webp"), RD + "_l1610");
  assert.equal(scwKey("data/redomap/redo_day.png"), "");
  assert.ok(scwEntry(RD), "錯棋重練經典白天已登記、ready");
  assert.equal(scwEntry("redomap/redo_day"), null, "預設世界沒有橫式圖＝原圖");
  assert.equal(scwEntry("redomap/redo_night_classic"), null, "夜景沒有橫式圖＝原圖");
  assert.equal(scwEntry("toString"), null, "原型上的名字不算");
  const C = load(), e = vm.runInContext("SCW_BAD['" + RD + "']=1;scwEntry('" + RD + "')", C);
  assert.equal(e, null, "載不到過＝退回原圖");
  const C2 = load({ localStorage: { getItem: k => k === "xqScwDev" ? "1" : null } });
  vm.runInContext("SCW['" + RD + "'].ready=false", C2);
  assert.ok(vm.runInContext("scwEntry('" + RD + "')", C2), "ready:false 只有開發用開關才用");
  const C3 = load(); vm.runInContext("SCW['" + RD + "'].ready=false", C3);
  assert.equal(vm.runInContext("scwEntry('" + RD + "')", C3), null);
});

test("錯棋重練條目：座標都在圖內、走路的邊和小動作都接得到節點、入口四個都有", () => {
  const e = SCW[RD], pct = (xy, n) => { assert.ok(Array.isArray(xy) && xy.length === 2 && xy.every(v => v >= 0 && v <= 100), n + "：" + JSON.stringify(xy)) };
  assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.equal(e.f, RD + "_l1610");
  for (const id of ["rd2Book", "rd2Stack", "rd2Pole", "rd2All"]) pct(e.S[id], id);
  pct(e.exit, "出口");
  for (const k of ["bookText", "stackBase", "censer"]) pct(e.fx[k], k);
  assert.ok(e.fx.stackStep > 0 && e.fx.stackStep < 5); assert.ok(e.fx.bookW > 2 && e.fx.bookW < 20);
  for (const s of ["l", "r", "t", "b"]) assert.ok(e.safe[s] >= 0 && e.safe[s] < .3);
  const N = e.walk.N; for (const n in N) pct(N[n], "節點 " + n);
  assert.ok(N[e.walk.home], "起點在節點裡");
  for (const ed of e.walk.E.split(" ")) { const [a, b] = ed.split("-"); assert.ok(N[a] && N[b], "邊 " + ed) }
  for (const [id, h] of Object.entries(e.walk.HS)) { assert.ok(N[h[0]], id + " 走到的節點 " + h[0]); pct([h[1], h[2]], id + " 看的位置") }
  assert.deepEqual(Object.keys(e.walk.HS).sort(), Object.keys(e.S).sort(), "每個入口都有角色走過去的設定");
  assert.ok(e.walk.h[0] > .1, "新圖物件比原圖大，小人要放大");
  for (const [x, y] of e.sw7.sky[0]) assert.ok(x >= 0 && x <= e.w && y >= 0 && y <= e.h, "天氣範圍是橫式圖像素");
});

test("每一頁條目：檔名是原圖加 _l1610、2560×1600、入口出口在圖內、走路的邊和小動作接得到節點、每個入口都有角色走過去（有走路角色的頁）", () => {
  const pct = (xy, n) => { assert.ok(Array.isArray(xy) && xy.length === 2 && xy.every(v => v >= 0 && v <= 100), n + "：" + JSON.stringify(xy)) };
  const keys = Object.keys(SCW); assert.ok(keys.length >= 2, "錯棋重練、棋力測驗都登記了");
  for (const k of keys) {
    const e = SCW[k]; assert.equal(e.f, k + "_l1610", k); assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.match(k, /_classic$/, "先只做經典世界");
    for (const id in e.S) pct(e.S[id], k + " " + id); pct(e.exit, k + " 出口");
    for (const s of ["l", "r", "t", "b"]) assert.ok(e.safe[s] >= 0 && e.safe[s] < .3);
    if (!e.walk) continue;   // 沒有走路角色的頁（挑戰電腦）
    const N = e.walk.N; assert.equal(e.walk.W, 2560); assert.equal(e.walk.H, 1600); assert.ok(N[e.walk.home || "home"]);
    for (const n in N) pct(N[n], k + " 節點 " + n);
    for (const ed of e.walk.E.split(" ")) { const [a, b] = ed.split("-"); assert.ok(N[a] && N[b], k + " 邊 " + ed) }
    if (!e.walk.HS) continue;   // 小動作由各頁自己算（今日推薦照告示紙的位置）
    for (const [id, h] of Object.entries(e.walk.HS)) { assert.ok(N[h[0]], k + " " + id); pct([h[1], h[2]], k + " " + id + " 看的位置") }
    assert.deepEqual(Object.keys(e.walk.HS).sort(), Object.keys(e.S).sort(), k + " 每個入口都有角色走過去的設定");
  }
  const T = SCW["todaymap/today_day_classic"].fx; assert.equal(T.notes.length, 5, "今日推薦五張告示紙");
  for (const q of T.notes) { assert.equal(q.length, 4); for (const [x, y] of q) assert.ok(x >= 0 && x <= 2560 && y >= 0 && y <= 1600) }
  for (const xy of [T.term, T.seal, T.censer.slice(0, 2), ...T.eave]) assert.ok(xy[0] >= 0 && xy[0] <= 2560 && xy[1] >= 0 && xy[1] <= 1600);
  const b = SCW["exammap/exam_day_classic"].fx.board; assert.ok(b[0] >= 0 && b[2] <= 2560 && b[1] >= 0 && b[3] <= 1600 && b[0] < b[2] && b[1] < b[3], "題名榜是橫式圖像素");
});

test("07w7 天氣：登記表裡的橫式圖用自己的範圍（像素＝橫式圖），首頁 home_l1610 照原本找", () => {
  const base = src => /data\/redomap\/redo_/.test(src) ? { k: "redo", re: /data\/redomap\/redo_/, m: "semi", rg: "s", sky: [[[0, 0]]], fg: [[[1, 1]]] } : null;
  const o = scwSw7("data/redomap/redo_day_classic_l1610.webp?v=1125", base);
  assert.equal(o.k, "redo"); assert.equal(o.W, 2560); assert.equal(o.H, 1600); assert.equal(o.fg, null, "原圖前景遮擋的像素不能沿用");
  assert.deepEqual(o.sky, SCW[RD].sw7.sky);
  assert.equal(scwSw7("data/homemap/home_l1610.webp?v=0910", base), undefined, "首頁寬版不歸這裡管");
  const C = load(); vm.runInContext("delete SCW['" + RD + "'].sw7", C);
  const o2 = vm.runInContext("scwSw7", C)("data/redomap/redo_day_classic_l1610.webp", base);
  assert.equal(o2.m, "in", "沒寫天氣範圍＝這張不下雨雪");
});

// 假的 #view／圖框：量到的寬高由 dims 決定
function fakeDom(dims) {
  const mk = () => { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), toggle: (c, on) => { on ? s.add(c) : s.delete(c) }, contains: c => s.has(c) } };
  const img = { _src: "data/redomap/redo_day_classic.webp?v=2411", complete: false, naturalWidth: 0, onerror: null, L: [], getAttribute() { return this._src }, set src(v) { this._src = v; this.complete = false; this.naturalWidth = 0 }, get src() { return this._src }, addEventListener(t, f) { this.L.push([t, f]) } };
  const spot = id => ({ id, dataset: {}, style: { left: "10%", top: "20%", marginLeft: "" } });
  const spots = { rd2Book: spot("rd2Book"), rd2Stack: spot("rd2Stack"), rd2Pole: spot("rd2Pole"), rd2All: spot("rd2All") }, ex = spot("ex");
  const P = { dataset: {}, classList: mk(), isConnected: true, style: { marginTop: "" }, parentNode: null, getBoundingClientRect: () => ({ top: 0 }),
    querySelector: q => q === ":scope>img" ? img : q === ":scope>.ex-spot" ? ex : spots[q.replace("#", "")] || null, querySelectorAll: () => [] };
  const V = { get clientWidth() { return dims.w }, get clientHeight() { return dims.h }, scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }) };
  P.parentNode = V;
  const ctx = load({ getComputedStyle: () => ({ paddingBottom: "0", paddingLeft: "0", paddingRight: "0" }), document: { documentElement: { get clientHeight() { return dims.h } } }, innerHeight: 0, ttFill: () => { ctx.__tt = (ctx.__tt || 0) + 1 } });
  return { ctx, P, V, img, spots, ex };
}

test("換圖：iPad 橫向原地換成橫式圖、入口和出口換座標；圖載好才排；轉回直向換回原圖、座標還原；載不到退回原圖", () => {
  const dims = { w: 1180, h: 734 }, { ctx, P, V, img, spots, ex } = fakeDom(dims);
  const scwMount = vm.runInContext("scwMount", ctx), scwSync = vm.runInContext("scwSync", ctx);
  let applied = 0;
  scwMount(P, { key: RD, src0: img._src, ids: Object.keys(spots), apply: () => applied++ });
  assert.equal(scwSync(V, P), "wait", "比例跨過門檻＝換圖、等圖載好");
  assert.match(img._src, /redo_day_classic_l1610\.webp/);
  assert.equal(P.dataset.scw, "l1610"); assert.ok(P.classList.contains("scw-l")); assert.equal(applied, 1, "各頁重畫疊圖");
  assert.equal(spots.rd2Book.style.left, SCW[RD].S.rd2Book[0] + "%"); assert.equal(spots.rd2Book.style.top, SCW[RD].S.rd2Book[1] + "%");
  assert.equal(ex.style.left, SCW[RD].exit[0] + "%", "出口換位置");
  assert.equal(scwSync(V, P), "wait", "圖還沒載好");
  img.complete = true; img.naturalWidth = 2560;
  assert.equal(scwSync(V, P), "l1610", "圖好了＝cover 填滿");
  dims.w = 820; dims.h = 1094;
  assert.equal(scwSync(V, P), "wait", "轉直向＝換回原圖");
  assert.equal(img._src, "data/redomap/redo_day_classic.webp?v=2411"); assert.equal(P.dataset.scw, "");
  assert.equal(spots.rd2Book.style.left, "10%", "座標還原"); assert.equal(ex.style.top, "20%");
  img.complete = true; img.naturalWidth = 768;
  assert.equal(scwSync(V, P), null, "原圖照原本排");
  dims.w = 1180; dims.h = 734; scwSync(V, P); img.onerror();
  assert.equal(P.dataset.scw, ""); assert.match(img._src, /redo_day_classic\.webp/, "載不到＝退回原圖");
  assert.equal(vm.runInContext("SCW_BAD['" + RD + "']", ctx), 1);
  assert.equal(scwSync(V, P), null, "這次開 App 不再試，照原圖排"); assert.equal(P.dataset.scw, "");
  const d2 = { w: 956, h: 354 }, F = fakeDom(d2); vm.runInContext("scwMount", F.ctx)(F.P, { key: RD, src0: F.img._src, ids: [] });
  assert.equal(vm.runInContext("scwSync", F.ctx)(F.V, F.P), null, "手機橫放不換");
  const F2 = fakeDom({ w: 1180, h: 734 }); vm.runInContext("scwMount", F2.ctx)(F2.P, { key: "redomap/redo_day", src0: F2.img._src, ids: [] });
  assert.equal(vm.runInContext("scwSync", F2.ctx)(F2.V, F2.P), null, "沒登記的變體不換");
});

test("走路設定：橫式圖換節點、邊、小動作，其他照原圖那份；原圖那份不被改到", () => {
  const scwWalkCfg = vm.runInContext("scwWalkCfg", C0), cfg0 = { el: 38, home: "home", N: { home: [1, 2] }, HS: { rd2Book: ["desk", 1, 2, "wave"], x: ["a", 1, 1, "idle"] } };
  const c = scwWalkCfg({ cfg0 }, SCW[RD]);
  assert.equal(c.W, 2560); assert.deepEqual(c.N, SCW[RD].walk.N); assert.equal(c.HS.rd2Book[0], "desk"); assert.equal(c.HS.rd2Stack[0], "lft"); assert.ok(c.HS.x, "沒覆蓋的小動作留著");
  c.HS.rd2Book[3] = "cheer"; assert.equal(cfg0.HS.rd2Book[3], "wave"); assert.equal(SCW[RD].walk.HS.rd2Book[3], "wave", "改歡呼不能改到原本那份");
  assert.equal(scwWalkCfg({ cfg0 }, null), cfg0);
});

test("原始碼：07fl 排版前先問 scwSync、安全區照條目；07w7、07w6、07y8 接上；m.html 在 07fl 前面載入", () => {
  const FL = M("m/07fl-fill.js"), W7 = M("m/07w7-seasons.js"), W6 = M("m/07w6-sceneinfo.js"), Y8 = M("m/07y8-redomap.js"), H = M("m.html");
  assert.match(FL, /const sk=typeof scwSync==="function"\?scwSync\(V,P\):null;if\(sk==="wait"\)\{xflR07Off\(V\);return true\}if\(sk&&xflHmw\(V,P,nw,nh,sk,typeof scwSafe==="function"\?scwSafe\(P\):null\)\)return true/);
  assert.match(FL, /function xflHmw\(V,P,nw,nh,k,sf0\)/); assert.match(FL, /const sf=sf0\|\|\(/);
  assert.ok(FL.indexOf("hmwSync(V,P)") < FL.indexOf("scwSync(V,P)") && FL.indexOf("scwSync(V,P)") < FL.indexOf("if(xflPort(V,P,nw,nh))return true"), "首頁先、場景頁其次、最後才直向填滿");
  assert.match(W7, /function sw7Page\(src\)\{if\(\/_l1610\\\.webp\/\.test\(src\|\|""\)&&typeof scwSw7==="function"\)\{const r=scwSw7\(src,sw7Page0\);if\(r!==undefined\)return r\}return sw7Page0\(src\)\}/);
  assert.match(W6, /const off=\(\)=>\{if\(P\.dataset\.scw\)return true;/);
  assert.match(Y8, /const pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\}/);
  assert.match(Y8, /<img src="\$\{pre\.src\}"/);
  assert.match(Y8, /ids:\["rd2Book","rd2Stack","rd2Pole","rd2All"\],pfx:"rd2"/);
  assert.match(Y8, /const nP=L\?0:/, "橫式圖不晾冊頁");
  const Y9 = M("m/07y9-exammap.js");
  assert.match(Y9, /pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\}/); assert.match(Y9, /<img src="\$\{pre\.src\}"/);
  assert.match(Y9, /ids:\["ex2S0","ex2S1","ex2S2","ex2Book"\],pfx:"ex2",cfg0:cfg,apply:brd/);
  assert.match(Y9, /shwPage\(v,cfgNow,"ex2"\)/);
  const Z5 = M("m/07z5-cpuroom.js"), CR = vm.runInContext("SCW['cpuroom/cpuroom_day_classic']", C0);
  assert.match(Z5, /pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\}/); assert.match(Z5, /<img src="\$\{pre\.src\}" alt="茶坊深處/);
  assert.match(Z5, /scwMount\(P,\{key:scwKey\(src\),src0:src,ids:Object\.keys\(CR_SPOT\),apply:lay\}\)/);
  assert.deepEqual(Object.keys(CR.S).sort(), vm.runInContext("Object.keys", C0)(JSON.parse(Z5.match(/const CR_SPOT=(\{[^}]*\})/)[1].replace(/(\w+):/g, '"$1":'))).sort(), "挑戰電腦八個入口都有橫式座標");
  const Y5 = M("m/07y5-todaymap.js");
  assert.match(Y5, /const TD_GM0=\{W:768,H:1376,notes:TD_NOTES,eave:TD_EAVE,censer:TD_CENSER,term:TD_TERM_AT,seal:\[560,690\]\}/, "原圖照舊用原本的像素");
  assert.match(Y5, /const tdPc=\(x,y\)=>\[x\/TD_GM\.W\*100,y\/TD_GM\.H\*100\]/);
  assert.ok(!/\/7\.68|\/13\.76/.test(Y5), "今日推薦不再寫死原圖尺寸");
  assert.match(Y5, /scwMount\(P,\{key:scwKey\(src\),src0:src,ids:\[\],apply:/);
  const i7 = H.indexOf("//#include m/07sw-scenewide.js"), iy = H.indexOf("//#include m/07y8-redomap.js"), ifl = H.indexOf("//#include m/07fl-fill.js");
  assert.ok(i7 > iy && i7 < ifl, "07sw 在 07y8 後、07fl 前");
});
