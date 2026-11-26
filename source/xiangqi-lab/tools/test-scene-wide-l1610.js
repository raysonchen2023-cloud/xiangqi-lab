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
  if (!(extra && extra.__noCdn)) vm.runInContext("SCW_CDN=true", ctx);   // 測座標和行為時當作圖已經上 CDN
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
  assert.equal(scwEntry("redomap/redo_night"), null, "夜景（預設世界）還沒有橫式圖＝原圖");
  assert.equal(scwEntry("redomap/redo_night_classic"), null, "夜景沒有橫式圖＝原圖");
  assert.equal(scwEntry("toString"), null, "原型上的名字不算");
  const C = load(), e = vm.runInContext("SCW_BAD['" + RD + "']=1;scwEntry('" + RD + "')", C);
  assert.equal(e, null, "載不到過＝退回原圖");
  const C2 = load({ localStorage: { getItem: k => k === "xqScwDev" ? "1" : null } });
  vm.runInContext("SCW['" + RD + "'].ready=false", C2);
  assert.ok(vm.runInContext("scwEntry('" + RD + "')", C2), "ready:false 只有開發用開關才用");
  const C3 = load(); vm.runInContext("SCW['" + RD + "'].ready=false", C3);
  assert.equal(vm.runInContext("scwEntry('" + RD + "')", C3), null);
  // 審查 #155：圖還沒上 CDN（SCW_CDN=false）時正式玩家一律原圖，只有開發用開關才用
  const C4 = load({ __noCdn: 1 }); assert.equal(vm.runInContext("SCW_CDN", C4), false, "預設還沒上 CDN"); assert.equal(vm.runInContext("scwEntry('" + RD + "')", C4), null);
  const C5 = load({ __noCdn: 1, localStorage: { getItem: k => k === "xqScwDev" ? "1" : null } }); assert.ok(vm.runInContext("scwEntry('" + RD + "')", C5), "開發用開關照樣看得到");
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
    const e = SCW[k]; assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.match(k, /^[a-z]+\/[a-z_]+$/);
    if (e.base) { assert.ok(SCW[e.base], k + " 的基準條目"); assert.equal(e.S, SCW[e.base].S, k + " 座標跟基準共用"); assert.match(e.f, /_l1610$/); continue }
    assert.equal(e.f, k + "_l1610", k);
    for (const id in e.S) pct(e.S[id], k + " " + id); pct(e.exit, k + " 出口");
    for (const s of ["l", "r", "t", "b"]) assert.ok(e.safe[s] >= 0 && e.safe[s] < .3);
    if (!e.walk) continue;   // 沒有走路角色的頁（挑戰電腦）
    const N = e.walk.N; assert.equal(e.walk.W, 2560); assert.equal(e.walk.H, 1600); assert.ok(N[e.walk.home || "home"]);
    for (const n in N) pct(N[n], k + " 節點 " + n);
    for (const ed of e.walk.E.split(" ")) { const [a, b] = ed.split("-"); assert.ok(N[a] && N[b], k + " 邊 " + ed) }
    if (!e.walk.HS) continue;   // 小動作由各頁自己算（今日推薦照告示紙的位置）
    for (const [id, h] of Object.entries(e.walk.HS)) { assert.ok(N[h[0]], k + " " + id); pct([h[1], h[2]], k + " " + id + " 看的位置") }
    for (const id in e.S) assert.ok(e.walk.HS[id], k + " " + id + " 有角色走過去的設定");   // 多出來的小動作可以（對戰的 hbCar 站鼓台）
  }
  const T = SCW["todaymap/today_day_classic"].fx; assert.equal(T.notes.length, 5, "今日推薦五張告示紙");
  for (const q of T.notes) { assert.equal(q.length, 4); for (const [x, y] of q) assert.ok(x >= 0 && x <= 2560 && y >= 0 && y <= 1600) }
  for (const xy of [T.term, T.seal, T.censer.slice(0, 2), ...T.eave]) assert.ok(xy[0] >= 0 && xy[0] <= 2560 && xy[1] >= 0 && xy[1] <= 1600);
  // 朝代日間：座標沿用經典版的 35 張；學習、錯棋重練原圖另外量，還沒登記
  const ERA = { "hubmap/battle": 12, "lobbymap/lobby": 12, "cpuroom/cpuroom_day": 3, "canjumap/canju_day": 3, "todaymap/today_day": 4, "exammap/exam_day": 1 };
  let n = 0; for (const [p, c] of Object.entries(ERA)) { const ks = Object.keys(SCW).filter(k => (k === p || k.startsWith(p + "_")) && !/classic/.test(k)); assert.equal(ks.length, c, p + " 朝代張數"); n += c;
    for (const k of ks) { assert.equal(SCW[k].f, k + "_l1610"); assert.match(SCW[k].base, /_classic$/) } }
  assert.equal(n, 35);
  // 學習原圖（書院）另一套座標、11 朝共用；錯棋重練原圖加洗墨池、晾冊竹竿
  const LN = scwEntry("hubmap/learn"); assert.ok(LN); assert.equal(LN.fx.lamp.length, 12, "書院 12 盞燈"); assert.equal(LN.fx.qp.length, 4, "矮几棋枰四角");
  for (const e of "qin han sanguo weijin nanbei sui tang wudai yuan ming qing".split(" ")) { const x = scwEntry("hubmap/learn_" + e); assert.ok(x, e); assert.equal(x.ready, true, e); assert.equal(x.base, "hubmap/learn"); assert.equal(x.S, LN.S) }
  assert.equal(SCW["hubmap/learn"].S === SCW["hubmap/learn_classic"].S, false, "書院跟經典版構圖不同，座標不共用");
  const RO = scwEntry("redomap/redo_day"); assert.ok(RO); assert.equal(RO.fx.pole.length, 2); assert.ok(RO.fx.pgW > 1 && RO.fx.pgW < 4.8, "竿子短，冊頁縮小"); assert.match(RO.fx.pond, /^polygon\(/); assert.equal(RO.fx.seasonDy, 10);
  assert.equal(RO.fx.bookText, SCW["redomap/redo_day_classic"].fx.bookText, "書、疊冊、香爐照經典版"); assert.equal(JSON.stringify(RO.S.rd2Pole), "[82,28]");
  assert.equal(SCW["redomap/redo_day_classic"].fx.pole, undefined, "經典版橫式還沒有晾架（等重出）");
  assert.equal(scwEntry("canjumap/canju_day_weijin").fx.ves, SCW["canjumap/canju_day_classic"].fx.ves, "殘局魏晉組用經典版橫式的茶器位置");
  // 季節、夜景：對戰、學習各 9 個變體（夏季對到原圖的橫式圖）
  for (const h of ["battle", "learn"]) {
    const B = "hubmap/" + h + "_classic";
    for (const q of ["night", "spring", "spring_night", "summer", "summer_night", "autumn", "autumn_night", "winter", "winter_night"]) assert.ok(SCW[B + "_" + q], B + "_" + q);
    assert.equal(SCW[B + "_summer"].f, B + "_l1610", "夏季＝原圖的橫式圖"); assert.equal(SCW[B + "_summer_night"].f, B + "_night_l1610");
    assert.equal(SCW[B + "_winter"].f, B + "_winter_l1610"); assert.equal(SCW[B + "_winter"].walk, SCW[B].walk, "走路共用");
  }
  assert.equal(scwKey("data/hubmap/battle_classic_winter.webp?v=0700"), "hubmap/battle_classic_winter"); assert.ok(scwEntry("hubmap/battle_classic_winter"), "冬季對戰查得到橫式圖");
  const base = src => /hubmap\/battle/.test(src) ? { k: "battle", re: /hubmap\/battle/, m: "semi", rg: "s" } : null;
  assert.equal(scwSw7("data/hubmap/battle_classic_winter_l1610.webp", base).k, "battle", "季節橫式圖的天氣照對戰頁");
  const q = SCW["exammap/exam_day_classic"].fx.boardQ; assert.equal(q.length, 4, "題名榜四角");
  for (const [x, y] of q) assert.ok(x >= 0 && x <= 2560 && y >= 0 && y <= 1600, "題名榜是橫式圖像素");
  assert.ok(q[0][0] < q[1][0] && q[3][0] < q[2][0] && q[0][1] < q[3][1] && q[1][1] < q[2][1], "左上、右上、右下、左下的順序");
  // 四角貼圖：方塊四個角要剛好落在四角上
  const scwM3 = vm.runInContext("scwM3", C0), m = scwM3(480, 540, q).match(/matrix3d\(([^)]*)\)/)[1].split(",").map(Number);
  const at = (x, y) => { const X = m[0] * x + m[4] * y + m[12], Y = m[1] * x + m[5] * y + m[13], W = m[3] * x + m[7] * y + m[15]; return [X / W, Y / W] };
  [[0, 0], [480, 0], [480, 540], [0, 540]].forEach(([x, y], i) => { const [X, Y] = at(x, y); assert.ok(Math.abs(X - q[i][0]) < .01 && Math.abs(Y - q[i][1]) < .01, "角 " + i) });
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
function fakeDom(dims, extra) {
  const mk = () => { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c), toggle: (c, on) => { on ? s.add(c) : s.delete(c) }, contains: c => s.has(c) } };
  const img = { tagName: "IMG", dataset: {}, get currentSrc() { return this._src }, _src: "data/redomap/redo_day_classic.webp?v=2411", complete: false, naturalWidth: 0, onerror: null, onerror0: null, L: [], getAttribute() { return this._src }, set src(v) { this._src = v; this.complete = false; this.naturalWidth = 0 }, get src() { return this._src }, addEventListener(t, f) { this.L.push([t, f]) } };
  const spot = id => ({ id, dataset: {}, style: { left: "10%", top: "20%", marginLeft: "" } });
  const spots = { rd2Book: spot("rd2Book"), rd2Stack: spot("rd2Stack"), rd2Pole: spot("rd2Pole"), rd2All: spot("rd2All") }, ex = spot("ex");
  const P = { dataset: {}, classList: mk(), isConnected: true, style: { marginTop: "" }, parentNode: null, getBoundingClientRect: () => ({ top: 0 }),
    querySelector: q => q === ":scope>img" ? img : q === ":scope>.ex-spot" ? ex : spots[q.replace("#", "")] || null, querySelectorAll: () => [] };
  const V = { get clientWidth() { return dims.w }, get clientHeight() { return dims.h }, scrollTop: 0, getBoundingClientRect: () => ({ top: 0 }) };
  P.parentNode = V;
  const ctx = load(Object.assign({ getComputedStyle: () => ({ paddingBottom: "0", paddingLeft: "0", paddingRight: "0" }), document: { documentElement: { get clientHeight() { return dims.h } } }, innerHeight: 0, ttFill: () => { ctx.__tt = (ctx.__tt || 0) + 1 } }, extra || {}));
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
  const F2 = fakeDom({ w: 1180, h: 734 }); vm.runInContext("scwMount", F2.ctx)(F2.P, { key: "redomap/redo_night", src0: F2.img._src, ids: [] });
  assert.equal(vm.runInContext("scwSync", F2.ctx)(F2.V, F2.P), null, "沒登記的變體不換");
});

test("審查 #155：開頁時就是橫式圖（scwPre），圖載不到要退回原圖；onerror 沒接到、scwSync 看到載完沒寬也一樣退回", () => {
  for (const viaErr of [true, false]) {
    const dims = { w: 1180, h: 734 }, { ctx, P, V, img, spots } = fakeDom(dims), scwPre = vm.runInContext("scwPre", ctx), scwMount = vm.runInContext("scwMount", ctx), scwSync = vm.runInContext("scwSync", ctx);
    const src0 = img._src, pre = scwPre(V, src0); assert.equal(pre.k, "l1610"); assert.match(pre.src, /_l1610\.webp/);
    img._src = pre.src; P.dataset.scw = pre.k;
    const night = () => "夜景退回日景"; img.onerror = night;   // 頁面原本的 onerror（07y、07x2）
    scwMount(P, { key: RD, src0, ids: Object.keys(spots) });
    assert.equal(typeof img.onerror, "function"); assert.notEqual(img.onerror, night, "開頁就是橫式圖也掛上載不到退回");
    img.complete = true; img.naturalWidth = 0;   // 404
    if (viaErr) img.onerror(); else assert.equal(scwSync(V, P), "wait");
    assert.equal(P.dataset.scw, "", "退回原圖"); assert.equal(img._src, src0); assert.equal(vm.runInContext("SCW_BAD['" + RD + "']", ctx), 1);
    assert.equal(img.onerror, night, "換回原圖時還原頁面原本的 onerror");
    img.complete = true; img.naturalWidth = 768; assert.equal(scwSync(V, P), null, "之後照原圖排，不會一直 wait");
  }
});

test("審查 #155 複審：載入 00-util 真正的 CDN 補抓監聽；橫式圖同源 404 時先等 CDN 那次，CDN 也失敗才退回原圖，退回後原圖還能再去 CDN 補抓", () => {
  const U = M("m/00-util.js").split("\n"), pick = re => { const l = U.find(x => re.test(x)); assert.ok(l, String(re)); return l };
  const SRC0 = [pick(/^const XQ_CDN=/), pick(/^function xqNat\(\)/), pick(/^const xqCdnRel=/), pick(/^addEventListener\("error"/)].join("\n");
  let H = null; const loc = { href: "https://x.test/m/x.html", origin: "https://x.test", pathname: "/m/x.html" };
  const { ctx, P, V, img, spots } = fakeDom({ w: 1180, h: 734 }, { addEventListener: (t, f) => { if (t === "error") H = f }, location: loc, URL, navigator: { userAgent: "" }, window: {} });
  vm.runInContext(SRC0, ctx); assert.equal(typeof H, "function", "00-util 掛上了監聽"); const CDN = vm.runInContext("XQ_CDN", ctx);
  const fire = () => { H({ target: img }); if (img.onerror) img.onerror() };   // 擷取監聽先跑，再輪到元素自己的 onerror（瀏覽器的順序）
  const scwPre = vm.runInContext("scwPre", ctx), scwMount = vm.runInContext("scwMount", ctx), scwSync = vm.runInContext("scwSync", ctx);
  const src0 = img._src, pre = scwPre(V, src0); img._src = pre.src; P.dataset.scw = pre.k;
  scwMount(P, { key: RD, src0, ids: Object.keys(spots) });
  img.complete = true; img.naturalWidth = 0; fire();   // 同源 404
  assert.ok(img._src.startsWith(CDN), "00-util 改去 CDN 補抓：" + img._src); assert.match(img._src, /_l1610\.webp/); assert.equal(img.dataset.cdnTry, "1");
  assert.equal(P.dataset.scw, "l1610", "還在等 CDN，不能馬上退回（退回會蓋掉補抓）");
  img.complete = false; assert.equal(scwSync(V, P), "wait", "CDN 那次還在載");
  img.complete = true; img.naturalWidth = 0; fire();   // CDN 也 404
  assert.equal(P.dataset.scw, "", "CDN 也失敗才退回原圖"); assert.equal(img._src, src0); assert.equal(img.dataset.cdnTry, undefined, "換網址清掉 cdnTry");
  img.complete = true; img.naturalWidth = 0; H({ target: img });   // 原圖同源也 404（經典版原圖只在 CDN）
  assert.ok(img._src.startsWith(CDN) && /redo_day_classic\.webp/.test(img._src), "原圖還能去 CDN 補抓，不會破圖：" + img._src);
  // 對照：CDN 那次成功＝留在橫式圖
  const F = fakeDom({ w: 1180, h: 734 }, { addEventListener: (t, f) => { if (t === "error") F.H = f }, location: loc, URL, navigator: { userAgent: "" }, window: {} });
  vm.runInContext(SRC0, F.ctx); const p2 = vm.runInContext("scwPre", F.ctx)(F.V, F.img._src), s0 = F.img._src; F.img._src = p2.src; F.P.dataset.scw = p2.k;
  vm.runInContext("scwMount", F.ctx)(F.P, { key: RD, src0: s0, ids: [] }); F.img.complete = true; F.img.naturalWidth = 0; F.H({ target: F.img }); F.img.onerror();
  F.img.complete = true; F.img.naturalWidth = 2560; assert.equal(vm.runInContext("scwSync", F.ctx)(F.V, F.P), "l1610", "CDN 補抓成功就照橫式圖排");
});

test("Android 平板預驗：開頁就是橫式圖、圖還在載時，載好要叫 07fl 再排一次（不然停在未排版、標籤看起來偏掉）", () => {
  const { ctx, P, V, img, spots } = fakeDom({ w: 1280, h: 714 }), scwPre = vm.runInContext("scwPre", ctx), scwMount = vm.runInContext("scwMount", ctx), scwSync = vm.runInContext("scwSync", ctx);
  const src0 = img._src, pre = scwPre(V, src0); img._src = pre.src; P.dataset.scw = pre.k; img.complete = false;
  scwMount(P, { key: RD, src0, ids: Object.keys(spots) });
  assert.equal(scwSync(V, P), "wait", "圖還在載，07fl 先不排");
  const L = img.L.filter(([t]) => t === "load"); assert.equal(L.length, 1, "掛上載好重排");
  img.complete = true; img.naturalWidth = 2560; const t0 = ctx.__tt || 0; L[0][1]();
  assert.equal(ctx.__tt, t0 + 1, "載好呼叫 ttFill 重排"); assert.equal(scwSync(V, P), "l1610", "重排時照橫式圖排");
  const F = fakeDom({ w: 1280, h: 714 }); F.img.complete = true; F.img.naturalWidth = 2560; const p2 = vm.runInContext("scwPre", F.ctx)(F.V, F.img._src); F.img._src = p2.src; F.P.dataset.scw = p2.k;
  vm.runInContext("scwMount", F.ctx)(F.P, { key: RD, src0: "x", ids: [] }); assert.equal(F.img.L.filter(([t]) => t === "load").length, 0, "已經載好（快取）就不用掛");
});

test("審查 #155：手機、直向從來沒換過圖時，07sw 不動標籤和出口（不清 00-util、07w9 記的原位）", () => {
  const { ctx, P, V, img, spots, ex } = fakeDom({ w: 402, h: 760 }), scwMount = vm.runInContext("scwMount", ctx), scwSync = vm.runInContext("scwSync", ctx);
  ex.style.top = "calc(87% - 26px)"; ex.dataset.xqTop0 = "87%"; spots.rd2Book.dataset.ttL = "10%";
  scwMount(P, { key: RD, src0: img._src, ids: Object.keys(spots) }); assert.equal(scwSync(V, P), null);
  assert.equal(ex.style.top, "calc(87% - 26px)"); assert.equal(ex.dataset.xqTop0, "87%"); assert.equal(spots.rd2Book.dataset.ttL, "10%");
  assert.equal(ex.dataset.scwL, undefined, "沒記原位");
});

test("走路設定：橫式圖換節點、邊、小動作，其他照原圖那份；原圖那份不被改到", () => {
  const scwWalkCfg = vm.runInContext("scwWalkCfg", C0), cfg0 = { el: 38, home: "home", N: { home: [1, 2] }, HS: { rd2Book: ["desk", 1, 2, "wave"], x: ["a", 1, 1, "idle"] } };
  const c = scwWalkCfg({ cfg0 }, SCW[RD]);
  assert.equal(c.W, 2560); assert.deepEqual(c.N, SCW[RD].walk.N); assert.equal(c.HS.rd2Book[0], "desk"); assert.equal(c.HS.rd2Stack[0], "lft"); assert.ok(c.HS.x, "沒覆蓋的小動作留著");
  c.HS.rd2Book[3] = "cheer"; assert.equal(cfg0.HS.rd2Book[3], "wave"); assert.equal(SCW[RD].walk.HS.rd2Book[3], "wave", "改歡呼不能改到原本那份");
  assert.equal(scwWalkCfg({ cfg0 }, null), cfg0);
});

test("〔混合〕原始碼：07fl 排版前先問 scwSync、安全區照條目；07w7、07w6、07y8 接上；m.html 在 07fl 前面載入", () => {
  const FL = M("m/07fl-fill.js"), W7 = M("m/07w7-seasons.js"), W6 = M("m/07w6-sceneinfo.js"), Y8 = M("m/07y8-redomap.js"), H = M("m.html");
  assert.match(FL, /const sk=typeof scwSync==="function"\?scwSync\(V,P\):null;if\(sk==="wait"\)\{xflR07Off\(V\);return true\}if\(sk&&xflHmw\(V,P,nw,nh,sk,typeof scwSafe==="function"\?scwSafe\(P\):null\)\)return true/);
  assert.match(FL, /function xflHmw\(V,P,nw,nh,k,sf0\)/); assert.match(FL, /const sf=sf0\|\|\(/);
  assert.ok(FL.indexOf("hmwSync(V,P)") < FL.indexOf("scwSync(V,P)") && FL.indexOf("scwSync(V,P)") < FL.indexOf("if(xflPort(V,P,nw,nh))return true"), "首頁先、場景頁其次、最後才直向填滿");
  assert.match(W7, /function sw7Page\(src\)\{if\(\/_l1610\\\.webp\/\.test\(src\|\|""\)&&typeof scwSw7==="function"\)\{const r=scwSw7\(src,sw7Page0\);if\(r!==undefined\)return r\}return sw7Page0\(src\)\}/);
  assert.match(W6, /const off=\(\)=>\{if\(P\.dataset\.scw&&!D\.wide\)return true;/);   /* W165（11/26）：頁面給了橫式座標 D.wide 就照它判斷，沒給才在橫式圖自己關 */
  assert.match(Y8, /const pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\}/);
  assert.match(Y8, /<img src="\$\{pre\.src\}"/);
  assert.match(Y8, /ids:\["rd2Book","rd2Stack","rd2Pole","rd2All"\],pfx:"rd2"/);
  const Y9 = M("m/07y9-exammap.js");
  assert.match(Y9, /pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\}/); assert.match(Y9, /<img src="\$\{pre\.src\}"/);
  assert.match(Y9, /ids:\["ex2S0","ex2S1","ex2S2","ex2Book"\],pfx:"ex2",cfg0:cfg,apply:brd/);
  assert.match(Y9, /shwPage\(v,cfgNow,"ex2"\)/);
  assert.match(Y9, /function ex2BoardSVG\(W0,H0\)\{const W=W0\|\|558,H=H0\|\|385/, "原圖照舊 558×385");
  assert.match(Y9, /transform:scwM3\(W0,H0,q\)/, "橫式圖的題名榜照四角貼");
  const Z5 = M("m/07z5-cpuroom.js"), CR = vm.runInContext("SCW['cpuroom/cpuroom_day_classic']", C0);
  assert.match(Z5, /pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\}/); assert.match(Z5, /<img src="\$\{pre\.src\}" alt="茶坊深處/);
  assert.match(Z5, /scwMount\(P,\{key:scwKey\(src\),src0:src,ids:Object\.keys\(CR_SPOT\),apply:lay\}\)/);
  assert.deepEqual(Object.keys(CR.S).sort(), vm.runInContext("Object.keys", C0)(JSON.parse(Z5.match(/const CR_SPOT=(\{[^}]*\})/)[1].replace(/(\w+):/g, '"$1":'))).sort(), "挑戰電腦八個入口都有橫式座標");
  const Y5 = M("m/07y5-todaymap.js");
  assert.match(Y5, /const TD_GM0=\{W:768,H:1376,notes:TD_NOTES,eave:TD_EAVE,censer:TD_CENSER,term:TD_TERM_AT,seal:\[560,690\]\}/, "原圖照舊用原本的像素");
  assert.match(Y5, /const tdPc=\(x,y\)=>\[x\/TD_GM\.W\*100,y\/TD_GM\.H\*100\]/);
  assert.ok(!/\/7\.68|\/13\.76/.test(Y5), "今日推薦不再寫死原圖尺寸");
  assert.match(Y5, /scwMount\(P,\{key:scwKey\(src\),src0:src,ids:\[\],apply:/);
  // 殘局、對戰、學習、大廳
  const C2 = M("m/07c2-canjumap.js"), YH = M("m/07y-hubmap.js"), X2 = M("m/07x2-lobbymap.js");
  for (const [n, S] of [["07c2", C2], ["07y", YH], ["07x2", X2]]) { assert.match(S, /scwPre\(v,src\)/, n + " 開頁先選圖"); assert.match(S, /scwMount\(P,/, n + " 交給 07sw") }
  assert.match(C2, /scwMount\(P,\{key:scwKey\(src\),src0:src,ids:\[\],apply:render\}\)/, "殘局換圖後整組重畫");
  assert.match(YH, /onWalk:c=>hbHide\(P,c\.hide\)/, "對戰、學習重掛走路角色後照新的隱身範圍");
  assert.match(YH, /P\._hbAlt=alt&&!hbIsCl\(\)\?alt:"";hbCupSwap\(P\);/, "千秋盃狀態圖交給 hbCupSwap（經典世界不換）");
  assert.match(YH, /if\(hub==="battle"\)try\{hbCupSwap\(P\);hbCupPlace\(P\)\}catch\(x\)\{\}\}/, "橫直切換後（apply）再換一次狀態圖、燈重放");
  assert.match(YH, /if\(hub==="learn"\)try\{hbFxLearn\(P\)\}catch\(x\)\{\}if\(hub==="battle"\)try\{hbCupSwap\(P\);hbCupPlace\(P\)\}catch\(x\)\{\}\}/, "開頁就是橫式圖：掛上 07sw 後也換一次（hbFxBattle 在 scwMount 前面跑）");
  assert.match(YH, /const LAMP=G\?G\.lamp:HUB_LAMP\.learn,STEAM=G\?G\.steam:HUB_STEAM,QP=G\?G\.qp:HUB_QP,QW=G\?e\.w:768,POND=G\?G\.pond:HUB_POND;/, "書院疊圖照條目");
  assert.match(YH, /if\(pre\.k\)\{cfg=scwWalkCfg\(o,scwCur\(P\)\);P\._scwW="l";if\(hub==="learn"\)try\{hbFxLearn\(P\)\}catch\(x\)\{\}/, "開頁就是橫式圖：掛上 07sw 後再畫一次疊圖");
  const Y8b = M("m/07y8-redomap.js"); assert.match(Y8b, /const nP=L&&!L\.pole\?0:/, "原圖版橫式圖有竹竿就晾"); assert.match(Y8b, /\.scw-l:not\(\.rd2-pondl\) \.rd2-pond\{display:none\}/, "有池面才顯示洗墨池");
  assert.match(YH, /const lw=\/_l1610\\\.webp\/\.test\(src\),E=lw&&typeof scwByF==="function"\?scwByF\(src\):null/, "朝代殘影照橫式條目");
  assert.match(X2, /function lmFar\(s,used,G\)/); assert.match(X2, /gap:44\/pw\*100/, "橫式圖的亮燈間距照螢幕 44px");
  assert.match(X2, /class="lm-fig\$\{f===2\?" f2":""\}"/); assert.match(X2, /\.scw-l \.lm-fig\.f2\{-webkit-mask-image:linear-gradient/, "橫式圖二樓人影下半部淡出");
  assert.equal(JSON.stringify(SCW["cpuroom/cpuroom_day_classic"].exit), "[14,92]"); assert.equal(SCW["cpuroom/cpuroom_day_classic"].fx.card.top, 72);
  const LB = SCW["lobbymap/lobby_classic"].fx; assert.equal(LB.lamps.length, 44, "大廳 44 盞燈（燈是線上玩家，不能少）"); assert.equal(LB.tables.length, 8);
  for (const [x, y, f, g] of LB.lamps) { assert.ok(x >= 0 && x <= 100 && y >= 0 && y <= 100 && (f === 1 || f === 2) && (g === 0 || g === 1)); if (g) assert.ok(y + (f === 2 ? 10.5 : 7.5) <= 100, "人影腳底在圖內") }
  assert.equal(SCW["hubmap/learn_classic"].fx.cy.length, 3, "藏譜石窟三個朝代殘影");
  assert.equal(SCW["hubmap/battle_classic"].fx.cy.length, 3, "雲弈閣三個朝代殘影");
  for (const k of ["hubmap/learn_classic", "hubmap/battle_classic"]) for (const [, x, y, w] of SCW[k].fx.cy) assert.ok(x > 0 && x < 100 && y >= 8 && w > 0, k + " 殘影上緣留 8% 以上（中心定位，太上面會被頂欄切掉）");
  assert.equal(SCW["canjumap/canju_day_classic"].fx.ves.length, 3, "殘局三個茶具");
  // 開機時 11-watch 最後一行就呼叫 route() 畫第一頁（直接開 #/cpuroom、重新整理場景頁）：07sw 要在那之前載好，
  // 不然各頁 typeof scwPre 是 function（宣告會提早），但裡面用到的 const（scwKey、SCW）還沒初始化，整頁丟錯變空白（11/25 瀏覽器實測抓到）
  const i7 = H.indexOf("//#include m/07sw-scenewide.js"), iu = H.indexOf("//#include m/00-util.js"), iw = H.indexOf("//#include m/11-watch.js");
  assert.ok(i7 > iu && i7 < iw, "07sw 在 00-util 之後、11-watch（開機 route()）之前");
  assert.match(M("m/11-watch.js"), /^route\(\);$/m, "開機的 route() 還在 11-watch");
  for (const f of fs.readdirSync(path.join(__dirname, "../../xiangqi-db/m")).filter(f => /\.js$/.test(f) && f !== "11-watch.js")) assert.doesNotMatch(M("m/" + f), /^route\(\);$/m, f + " 也在載入時呼叫 route()，07sw 要在它前面");
});

test("千秋盃報名紅幔、垂簾布幕：直式換直圖、iPad 橫向換 _l1610；圖載好時橫直已經切換就不換；垂簾的燈照條目 fx.lamp，原圖照 HUB_LAMP.battle", () => {
  const YH = M("m/07y-hubmap.js"), cut = (a, b) => { const i = YH.indexOf(a), j = YH.indexOf(b, i); assert.ok(i >= 0 && j > i, a); return YH.slice(i, j) };
  const SRC_CUP = cut("const hbCupSrc=", "/* 千秋盃結束的煙火");
  const mk = () => {
    const imgs = [];
    const ctx = vm.createContext({ SCW_IMGV: "S", HB_IMGV: "H", HUB_LAMP: { battle: [[3, 30.5], [22.5, 29], [50, 26.5], [65, 25.5], [26.5, 42.5], [51, 39], [91, 64.5], [62, 72]] },
      hbImg: (b) => b + "_tang", scwCur: P => P.dataset.scw ? { fx: { lamp: SCW["hubmap/battle_tang"].fx.lamp } } : null,
      Image: function () { imgs.push(this) } });
    vm.runInContext(SRC_CUP, ctx);
    const img = { isConnected: true, _s: "data/hubmap/battle_tang.webp?v=H0", getAttribute() { return this._s }, set src(v) { this._s = v }, get src() { return this._s } };
    const lamps = Array.from({ length: 8 }, () => ({ style: {} })), cls = new Set();
    const P = { dataset: {}, _hbAlt: "battle_red", querySelector: () => img, querySelectorAll: q => q === ".hb-cl" ? lamps : [], classList: { toggle: (c, on) => on ? cls.add(c) : cls.delete(c) } };
    return { ctx, imgs, img, P, lamps, cls, R: n => vm.runInContext(n, ctx) };
  };
  // 直式：換直的狀態圖（先載好才換）
  let E = mk(); E.R("hbCupSwap")(E.P);
  assert.equal(E.imgs.length, 1); assert.equal(E.imgs[0].src, "data/hubmap/battle_red_tang.webp?v=H"); assert.equal(E.img._s, "data/hubmap/battle_tang.webp?v=H0", "還沒載好不換");
  E.imgs[0].onload(); assert.equal(E.img._s, "data/hubmap/battle_red_tang.webp?v=H");
  // 橫式：換 _l1610
  E = mk(); E.P.dataset.scw = "l1610"; E.R("hbCupSwap")(E.P); E.imgs[0].onload();
  assert.equal(E.img._s, "data/hubmap/battle_red_tang_l1610.webp?v=S", "橫式圖換橫式狀態圖（以前是不換，iPad 上看不到報名紅榜）");
  // 開頁先用直圖去載、載好前已經掛上橫式圖：不換（不然直圖蓋掉橫式圖）
  E = mk(); E.R("hbCupSwap")(E.P); E.P.dataset.scw = "l1610"; E.imgs[0].onload();
  assert.equal(E.img._s, "data/hubmap/battle_tang.webp?v=H0", "要的網址變了，晚到的直圖不蓋");
  // 已經是要的那張就不再載
  E = mk(); E.P.dataset.scw = "l1610"; E.img._s = "data/hubmap/battle_red_tang_l1610.webp?v=S"; E.R("hbCupSwap")(E.P); assert.equal(E.imgs.length, 0);
  // 沒有狀態（_hbAlt 空）不動
  E = mk(); E.P._hbAlt = ""; E.R("hbCupSwap")(E.P); assert.equal(E.imgs.length, 0);
  // 燈：橫式照條目、加 hb-l1610 縮小；轉回直式照 HUB_LAMP.battle、拿掉 hb-l1610
  E = mk(); E.P.dataset.scw = "l1610"; E.R("hbCupPlace")(E.P);
  assert.equal(E.lamps[0].style.left, "16.8%"); assert.equal(E.lamps[7].style.top, "60.5%"); assert.ok(E.cls.has("hb-l1610"));
  E.P.dataset.scw = ""; E.R("hbCupPlace")(E.P);
  assert.equal(E.lamps[0].style.left, "3%"); assert.equal(E.lamps[6].style.top, "64.5%"); assert.ok(!E.cls.has("hb-l1610"));
  // 條目：原圖、11 朝都共用經典版那 8 盞燈
  for (const k of ["hubmap/battle", "hubmap/battle_tang", "hubmap/battle_song"]) assert.equal(SCW[k].fx.lamp, SCW["hubmap/battle_classic"].fx.lamp, k);
  assert.equal(SCW["hubmap/battle_classic"].fx.lamp.length, 8);
  for (const [x, y] of SCW["hubmap/battle_classic"].fx.lamp) assert.ok(x > 0 && x < 100 && y > 0 && y < 100);
});
