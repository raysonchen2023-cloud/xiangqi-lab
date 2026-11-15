// 意見回饋 888／889／890（版本 20261113-2301）的回歸測試。不開瀏覽器：模組整份丟進 vm，用假的 DOM／觸控事件跑。
//   888（玩家 iPad 主畫面 App 820×1148）「首頁用兩指放大後就無法縮小，要重開 App」：
//     原因＝iOS 不理 viewport 的 user-scalable=no，手指落在圖框外就整頁放大；整頁放大後畫面幾乎都是圖框，
//     07x 圖框對兩指一律 preventDefault、擋 gesturestart、touch-action:pan-y → 系統的縮小手勢全被擋掉。
//     修法（m/07x-zoom.js）：沒被系統放大時整份文件擋 gesturestart／gesturechange；已經整頁放大就讓出兩指（zm-vvz、touch-action:auto）、
//     出現跟著看得到的範圍走的「還原大小」；雙擊、回首頁（goHome、網址換回 #/）一律回 1 倍（整頁放大用暫時 maximum-scale=1 請 iOS 縮回）。
//     07x 自己的縮放：iPad 寬版 cover（圖比框寬、上緣裁掉）、程式滿版（上下裁）、三屏長卷（鏡頭在右屏、可拖到左右兩屏）都放大到 2 倍再縮回 1 倍。
//   889（iPhone 主畫面 App 669×869）「畫面大小不符螢幕」：可用寬÷可用高約 0.87，原本 0.85～1.3 哪一種寬版都不用、首頁變體也不進 07fl 直向填滿 → 中間一窄條＋兩側模糊。
//     修法：07z hmwKind 0.85～1.04 用直版 p34、1.04 以上用橫版 l1610（短邊 600 以上）；07fl 首頁的直向填滿門檻放寬到 1.04（XFL_HOME_MAX）。
//     這裡照 07fl 包的 r07Wide 的順序（hmwSync → xflHmw cover → xflPort → 原本 r07-fit）模擬各朝代、各變體在各尺寸的結果。
//   890（開發者 iPhone 440×894 動態島）插曲全螢幕頁（.ep-ov：星夜茶話會結算「燈芯結了一朵燈花」、不速之客）最上面一行被狀態列蓋住：上緣讓開 --safeT。
// 測試名稱照規定標類別：只檢查原始碼文字的加〔原始碼〕；混合加〔混合〕；真的執行邏輯的不加。用法：node --test xiangqi-lab/tools/test-fb888.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC_X = M("m/07x-zoom.js"), SRC_Z = M("m/07z-homemap.js"), SRC_FL = M("m/07fl-fill.js"), SRC_P = M("m/07hmp-pano.js"), SRC_T = M("m/07t-episodes.js");
const J = x => JSON.parse(JSON.stringify(x));

/* ---------------- 888：假 DOM ---------------- */
function cls() { const s = new Set(); return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), toggle: (c, on) => { if (on === undefined) on = !s.has(c); if (on) s.add(c); else s.delete(c); return on }, contains: c => s.has(c) } }
function mkEl(tag) {
  const L = {}, e = {
    tagName: String(tag).toUpperCase(), dataset: {}, style: {}, classList: cls(), children: [], parentNode: null, isConnected: true, hidden: false, L,
    addEventListener(t, f) { (L[t] = L[t] || []).push(f) }, removeEventListener(t, f) { if (L[t]) L[t] = L[t].filter(x => x !== f) },
    append(...cs) { for (const c of cs) { c.parentNode = e; e.children.push(c) } }, setAttribute(k, v) { e["@" + k] = String(v) }, getAttribute(k) { return e["@" + k] == null ? null : e["@" + k] },
    contains(x) { for (let n = x; n; n = n.parentNode) if (n === e) return true; return false },
    fire(t, ev) { for (const f of (L[t] || []).slice()) f(ev); return ev }
  };
  return e;
}
const pts = a => a.map(([x, y]) => ({ clientX: x, clientY: y }));
const tev = (now, ch) => ({ touches: pts(now), changedTouches: pts(ch || now), cancelable: true, dp: false, preventDefault() { this.dp = true }, stopPropagation() { } });
function env(o) {
  o = o || {};
  const timers = [], winL = {}, docL = {}, home = [], toasts = [], conts = [];
  const vvL = {}, vv = { scale: 1, offsetLeft: 0, offsetTop: 0, width: o.vw || 820, height: o.vh || 1148, addEventListener(t, f) { (vvL[t] = vvL[t] || []).push(f) } };
  const meta = mkEl("meta"); meta.setAttribute("content", "width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no");
  const head = mkEl("head"), body = mkEl("body"), html = mkEl("html");
  const all = () => [...head.children, ...body.children];
  const document = {
    head, body, documentElement: html, createElement: t => mkEl(t), getElementById: id => all().find(e => e.id === id) || null,
    querySelector: s => s === 'meta[name="viewport"]' ? meta : null, querySelectorAll: s => s === ".zm-c" ? conts.filter(c => c.classList.contains("zm-c")) : [],
    addEventListener(t, f) { (docL[t] = docL[t] || []).push(f) }, removeEventListener(t, f) { if (docL[t]) docL[t] = docL[t].filter(x => x !== f) }
  };
  const location = { hash: "#/hub/learn" };
  const ctx = vm.createContext({
    window: { visualViewport: vv }, document, location, innerWidth: vv.width, Date, Math, Object, String, JSON, isFinite, __home: home,
    setTimeout: (f, ms) => { timers.push({ f, ms: ms || 0 }); return timers.length }, clearTimeout: () => { },
    requestAnimationFrame: f => { timers.push({ f, ms: 16 }); return timers.length }, cancelAnimationFrame: () => { },
    addEventListener: (t, f) => { (winL[t] = winL[t] || []).push(f) }, removeEventListener: () => { },
    navKey: h => String(h || "").replace(/^#/, "").split("?")[0] || "/", toast: t => toasts.push(t)
  });
  vm.runInContext("function goHome(){__home.push(location.hash)}", ctx);
  vm.runInContext(SRC_X, ctx);
  const run = () => { while (timers.length) timers.shift().f() };
  // C＝看得到的框（W×H），E＝被縮放的圖層（左上 ox,oy，寬高 ew×eh，iPad 寬版／程式滿版時比框大、左右或上面被裁）
  const frame = (W, H, ox, oy, ew, eh, opt) => {
    const C = mkEl("div"), E = mkEl("div"); C.clientWidth = W; C.clientHeight = H; C.getBoundingClientRect = () => ({ left: 0, top: 0, width: W, height: H, right: W, bottom: H });
    Object.assign(E, { offsetLeft: ox, offsetTop: oy, offsetWidth: ew, offsetHeight: eh }); C.append(E); conts.push(C); ctx.zmAttach(C, E, opt); return { C, E };
  };
  return { ctx, vv, vvL, meta, html, body, docL, winL, home, toasts, location, run, frame };
}
// 兩指：a0,b0 起手 → a1,b1 → 兩指先後放開
function pinch(C, a0, b0, a1, b1) { const s = C.fire("touchstart", tev([a0, b0])), m = C.fire("touchmove", tev([a1, b1])); C.fire("touchend", tev([a1], [b1])); C.fire("touchend", tev([], [a1])); return { s, m } }
function tap(C, x, y) { C.fire("touchstart", tev([[x, y]])); C.fire("touchend", tev([], [[x, y]])) }
const out = C => pinch(C, [310, 500], [510, 500], [210, 500], [610, 500]);   // 200 → 400：放大 2 倍
const inn = C => pinch(C, [210, 500], [610, 500], [360, 500], [460, 500]);   // 400 → 100：縮到最小（1 倍）

test("888 純計算 zmNat：系統縮放倍數超過 1.01 才算整頁放大（1、1.005 不算；1.2、2 算）", () => {
  const { ctx } = env();
  assert.equal(ctx.zmNat(1), false); assert.equal(ctx.zmNat(1.005), false); assert.equal(ctx.zmNat(1.2), true); assert.equal(ctx.zmNat(2), true);
  assert.equal(ctx.zmNat(), false, "沒給倍數＝看 visualViewport（1 倍）");
});

test("888 07x 自己的兩指縮放：iPad 寬版 cover、程式滿版（上下裁）、三屏長卷鏡頭在右屏，放大 2 倍後都縮得回 1 倍，transform 清乾淨、「還原大小」收起來", () => {
  const cases = [
    ["iPad 820×1148 寬版直版 p34（cover：圖 820×1093、上面裁 37）", [820, 1018, 0, -37, 820, 1093]],
    ["iPad 820×1148 季節變體程式滿版（圖 820×1469、上面裁 200）", [820, 1018, 0, -200, 820, 1469]],
    ["寬版橫版 l1610 cover（左右裁：圖 1312×820、左邊裁 66）", [1180, 690, -66, 0, 1312, 820]],
  ];
  for (const [nm, g] of cases) {
    const e = env(), { C, E } = e.frame(...g);
    const a = out(C);
    assert.equal(a.s.dp, true, nm + "：沒整頁放大時兩指由 07x 接（擋掉系統的）");
    assert.ok(Math.abs(C.zm.s - 2) < 1e-6, nm + "：放大到 2 倍（" + C.zm.s + "）");
    assert.match(E.style.transform, /scale\(2\.000\)/, nm); assert.equal(C.classList.contains("zm-on"), true);
    inn(C);
    assert.equal(C.zm.s, 1, nm + "：縮回 1 倍"); assert.equal(E.style.transform, "", nm + "：transform 清掉"); assert.equal(C.classList.contains("zm-on"), false, nm + "：「還原大小」收起來");
  }
  // 三屏長卷：鏡頭在右屏（P 的 left＝-820），放大後可以拖到左右兩屏（ext），縮回 1 倍後鏡頭還在右屏
  const e = env(), { C, E } = e.frame(820, 1018, -820, -200, 820, 1469, { ext: () => ({ l: 820, r: 820 }) });
  out(C); assert.ok(C.zm.s > 1.9);
  C.fire("touchstart", tev([[400, 500]])); C.fire("touchmove", tev([[700, 520]])); C.fire("touchend", tev([], [[700, 520]]));   // 放大時單指拖
  inn(C); assert.equal(C.zm.s, 1); assert.equal(E.style.transform, "", "長卷縮回 1 倍：transform 清掉（鏡頭位置在 P 的 left，不受影響）");
});

test("888 保險：放大時雙擊回 1 倍；沒放大、也沒整頁放大時雙擊不做事（不動 viewport）；「還原大小」按了回 1 倍", () => {
  const e = env(), { C } = e.frame(820, 1018, 0, -37, 820, 1093);
  out(C); assert.ok(C.zm.s > 1.9);
  tap(C, 400, 400); tap(C, 405, 402);
  assert.equal(C.zm.s, 1, "雙擊還原");
  tap(C, 400, 400); tap(C, 405, 402);
  assert.equal(C.zm.s, 1); assert.equal(e.meta.getAttribute("content").includes("maximum-scale"), false, "1 倍時雙擊不碰 viewport");
  out(C); const rs = C.children.find(x => x.className === "zm-rs"); assert.ok(rs, "有「還原大小」");
  rs.fire("click", { preventDefault() { }, stopPropagation() { } }); assert.equal(C.zm.s, 1);
  out(C); C.fire("dblclick", { preventDefault() { } }); assert.equal(C.zm.s, 1, "電腦雙按也還原");
});

test("888 已經被系統整頁放大（visualViewport.scale 1.8）：兩指不搶（不 preventDefault、07x 倍數不動）、gesturestart 不擋，系統才縮得回去；沒放大時照舊擋", () => {
  const e = env(), { C } = e.frame(820, 1018, 0, -37, 820, 1093);
  const gs = () => { const ev = { dp: false, preventDefault() { this.dp = true } }; C.fire("gesturestart", ev); const d = { dp: false, preventDefault() { this.dp = true } }; for (const f of e.docL.gesturestart || []) f(d); return [ev.dp, d.dp] };
  assert.deepEqual(gs(), [true, true], "1 倍：圖框和整份文件都擋 gesturestart（一開始就不會整頁放大）");
  assert.ok((e.docL.gesturechange || []).length, "gesturechange 也擋");
  e.vv.scale = 1.8;
  const a = out(C);
  assert.equal(a.s.dp, false, "兩指起手不 preventDefault"); assert.equal(a.m.dp, false); assert.equal(C.zm.s, 1, "07x 不跟著放大");
  assert.deepEqual(gs(), [false, false], "整頁放大時都不擋");
  e.vv.scale = 1;
  assert.equal(out(C).s.dp, true, "縮回來以後照舊由 07x 接");
});

test("888 整頁放大的救援：html 加 zm-vvz（圖框改 touch-action:auto）、出現跟著看得到的範圍走的「還原大小」；按了請 iOS 縮回（暫時 maximum-scale=1、0.4 秒後換回），還是放大就提示兩指往內捏", () => {
  const e = env();
  e.vv.scale = 1.8; e.vv.offsetLeft = 300; e.vv.offsetTop = 420; e.vv.width = 820 / 1.8;
  for (const f of e.vvL.resize) f(); e.run();
  assert.equal(e.html.classList.contains("zm-vvz"), true);
  const b = e.body.children.find(x => x.id === "zmVvb"); assert.ok(b, "還原大小按鈕"); assert.equal(b.hidden, false);
  assert.equal(b.style.left, (300 + 820 / 1.8 / 2).toFixed(1) + "px", "在看得到的範圍正中間"); assert.equal(b.style.top, (420 + 10 / 1.8).toFixed(1) + "px");
  assert.match(b.style.transform, /scale\(0\.556\)/, "反向縮放，看起來是原本大小");
  assert.equal(b.textContent, "⤢ 還原大小");
  b.fire("click", { preventDefault() { }, stopPropagation() { } });
  assert.equal(e.meta.getAttribute("content"), "width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no,maximum-scale=1");
  e.run();
  assert.equal(e.meta.getAttribute("content"), "width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no", "換回原本的 viewport");
  assert.deepEqual(e.toasts, ["兩指往內捏，就能縮回原本大小"], "（假環境不會真的縮回）還是放大＝提示");
  e.vv.scale = 1; for (const f of e.vvL.scroll) f(); e.run();
  assert.equal(e.html.classList.contains("zm-vvz"), false); assert.equal(b.hidden, true, "縮回來按鈕就收起來");
  assert.match(SRC_X, /html\.zm-vvz \.zm-c,html\.zm-vvz \.zm-c\.zm-on\{touch-action:auto\}/);
});

test("888 回首頁一律回 1 倍：goHome（底部首頁、🏠）先把圖框和整頁放大都還原再回去；網址換回 #/ 也還原，換到別頁不動", () => {
  const e = env(), { C } = e.frame(820, 1018, 0, -37, 820, 1093);
  out(C); e.vv.scale = 1.5;
  e.ctx.goHome();
  assert.equal(C.zm.s, 1); assert.deepEqual(e.home, ["#/hub/learn"], "原本的 goHome 照樣呼叫");
  assert.ok(e.meta.getAttribute("content").includes("maximum-scale=1"), "整頁放大也請 iOS 縮回");
  e.run(); assert.deepEqual(e.toasts, [], "回首頁不跳提示");
  e.vv.scale = 1; out(C); e.location.hash = "#/hub/battle"; for (const f of e.winL.hashchange) f();
  assert.ok(C.zm.s > 1.9, "去別頁不動");
  e.location.hash = "#/"; for (const f of e.winL.hashchange) f();
  assert.equal(C.zm.s, 1, "網址回 #/：回 1 倍");
});

test("〔原始碼〕888 接線：07hmp 整頁放大時不接單指換屏；07x 兩指起手先看 zmNat、雙擊也還原整頁；07x 沒有 // 行內註解；新名字沒跟別的模組撞名", () => {
  assert.match(SRC_P, /const start=\(x,y,ed\)=>\{if\(!hmpOn\(P\)\|\|zs\(\)>1\.001\|\|\(typeof zmNat==="function"&&zmNat\(\)\)\)\{D=null;return\}/);
  assert.match(SRC_X, /if\(t\.length>=2\)\{if\(zmNat\(\)\)\{T=null;return\}/);
  assert.match(SRC_X, /reset\(\);zmVVReset\(\);return\}/);
  assert.equal(/(^|[^:"'])\/\/(?!#)/m.test(SRC_X.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "")), false, "07x 裡不要有 // 註解");
  const dir = path.join(__dirname, "../../xiangqi-db/m"), names = ["zmVV", "zmNat", "zmVVReset", "zmFixAll", "zmVvSync", "ZM_VV_EPS", "HMW_SQ", "XFL_HOME_MAX"];
  for (const f of fs.readdirSync(dir).filter(f => /\.js$/.test(f))) {
    const s = fs.readFileSync(path.join(dir, f), "utf8");
    for (const n of names) { const re = new RegExp("(function|const|let|var)\\s+" + n + "\\b"); if (re.test(s)) assert.ok(["07x-zoom.js", "07z-homemap.js", "07fl-fill.js"].includes(f), n + " 在 " + f + " 又宣告了一次") }
  }
});

/* ---------------- 889：選圖、排版 ---------------- */
function loadHome(g) {
  const ctx = vm.createContext(Object.assign({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, cancelAnimationFrame: () => { }, addEventListener: () => { }, isFinite, Math, Object, String, JSON }, g || {}));
  vm.runInContext("const SHW_PG0={W:768,H:1376,el:38,home:'home',look0:[45,90],h:[.045,60,.0009]};", ctx);
  vm.runInContext(SRC_Z, ctx); vm.runInContext(SRC_FL, ctx); vm.runInContext(SRC_P, ctx);
  return ctx;
}
const WORLD = { wv: "", cl: false };
const HC = loadHome({ sw7HomeWx: () => WORLD.wv, hbIsCl: () => WORLD.cl }), HR = s => vm.runInContext(s, HC);
const hmwPick = HR("hmwPick"), HMW = J(HR("HMW")), HM_SPOTS = J(HR("HM_SPOTS")), CY_HOME = [[5, 6, 12], [21, 10.5, 11], [36.5, 6.5, 10], [47.5, 3, 10]];   // 07y CY_SPOT.home（經典世界天上的朝代殘影，07fl 也量）
const XFL_HOME_MAX = HR("XFL_HOME_MAX"), XFL_PORT_MAX = HR("XFL_PORT_MAX");
// 首頁可點的東西在圖高的比例（07fl xflItems 量的）：五個入口標籤約 30px 高；經典世界多天上的殘影（約寬度的 w% 見方）
const homeItems = (W, cl) => HM_SPOTS.map(s => ({ c: s[2] / 100 + 0.011, h: 30 })).concat(cl ? CY_HOME.map(([, y, w]) => ({ c: (y + w * W / 1376 * 0.5 * 768 / W) / 100, h: w / 100 * W })) : []);
// 照 07fl 包的 r07Wide：hmwSync（07z 挑寬版）→ 寬版 xflHmw（cover）→ 原圖 xflPort（直向填滿）→ 原本 r07Wide（縮到等高置中＋兩側模糊／長卷左右兩屏）
function homeLayout(w, h, top, wv, cl) {
  WORLD.wv = wv; WORLD.cl = cl;
  const W = w, av = h - top, m = { W, av, vw: W, vh: h }, hk = hmwPick(m);
  if (hk) { const H = HMW[hk], pl = HC.xflCover({ W, av, nw: H.w, nh: H.h, safe: H.safe }); return { img: hk, how: "cover", fill: Math.min(1, pl.w / W) * Math.min(1, pl.h / av), sides: pl.gx > 1 || pl.gy > 1 ? "模糊" : "" } }
  const img = wv ? "home_" + wv : cl ? "home_classic" : "home", pano = HC.hmpVar("", wv, cl);
  if (HC.xflGate(W, av, W, 768, 1376, XFL_HOME_MAX)) { const pl = HC.xflPlan({ W, av, nw: 768, nh: 1376, items: homeItems(W, cl) }); return { img, how: "填滿寬度", fill: pl.w / W, sides: pl.w < W - 1 ? (pano ? "長卷" : "模糊") : "", pano: !!pano, top: pl.top, crop: pl.crop } }
  if (!(w >= 600 || w > av) || W * 1376 / 768 - av < 2) return { img, how: "手機照舊", fill: 1, sides: "", pano: !!pano };
  const fit = Math.floor(av * 768 / 1376); return { img, how: "等高置中", fill: fit / W, sides: pano ? "長卷" : "模糊", pano: !!pano };
}
const ERAS = ["qin", "han", "sanguo", "weijin", "nanbei", "sui", "tang", "wudai", "yuan", "ming", "qing"];
// 每個世界、每種變體（07w7 sw7HomeWx 的回傳格式）：[說明, wv, 經典世界]
const WORLDS = [["沒有季節變體（原圖）", "", false], ["經典世界白天（原圖）", "", true], ["經典世界秋夜", "classic_autumn_night", true], ["經典世界冬", "classic_winter", true],
  ["宋（沒朝代圖）春", "spring", false], ["宋夜", "summer_night", false], ["下雪", "snow", false], ["下雨", "rain", false]]
  .concat(ERAS.flatMap(e => [[e + " 冬夜", e + "_winter_night", false], [e + " 春晨", e + "_spring_dawn", false], [e + " 秋", e + "_autumn", false]]));

test("889 回報的 iPhone 669×869（主畫面 App，頂欄＋安全區約 96）：各朝代、各變體首頁都蓋滿畫面寬度，不再是中間一窄條＋兩側模糊", () => {
  const before = Math.floor((869 - 96) * 768 / 1376) / 669;
  assert.ok(before < 0.65, "修之前：原圖縮到等高只有畫面寬的 " + before.toFixed(2));
  for (const [nm, wv, cl] of WORLDS) {
    const r = homeLayout(669, 869, 96, wv, cl);
    assert.equal(r.fill, 1, `${nm}（${wv || "原圖"}）：${r.how} 蓋了 ${r.fill}`); assert.equal(r.sides, "", nm + " 沒有模糊兩側");
    if (wv) assert.equal(r.img, "home_" + wv, nm + " 照樣用那張季節／夜景／朝代圖（跟學習、對戰同一季）");
  }
  assert.equal(homeLayout(669, 869, 96, "", false).img, "p34", "沒有變體＝iPad 直版寬圖 cover");
  assert.equal(homeLayout(669, 869, 96, "yuan_winter_night", false).how, "填滿寬度", "回報截圖那種元朝夜景＝原圖填滿寬度、上下裁");
  assert.equal(homeLayout(669, 869, 96, "classic_autumn_night", true).pano, true, "經典世界的變體照舊有三屏長卷（左右滑看西市、觀星臺）");
  // 頂欄高度估不準也一樣：可用高 700～800（比例 0.84～0.96）都蓋滿；沒變體時 0.89 以下用直版寬圖 cover、以上原圖填滿寬度
  for (const top of [70, 96, 130, 169]) for (const [nm, wv, cl] of WORLDS) { const r = homeLayout(669, 869, top, wv, cl); assert.equal(r.fill, 1, `頂欄 ${top}：${nm}（${r.img}、${r.how}）`) }
});

test("889 填滿寬度時首頁入口都看得到：669×869 元朝冬夜、經典世界秋夜，五個入口（和天上殘影）都在看得到的範圍裡", () => {
  for (const [wv, cl] of [["yuan_winter_night", false], ["classic_autumn_night", true], ["han_spring_dawn", false]]) {
    const W = 669, av = 869 - 96, pl = HC.xflPlan({ W, av, nw: 768, nh: 1376, items: homeItems(W, cl) });
    for (const q of homeItems(W, cl)) { const e = Math.min(q.h / 2, 30) + 6, c = q.c * pl.H; assert.ok(c - e >= pl.top - 1 && c + e <= pl.top + av + 1, `${wv} c=${q.c.toFixed(3)} 看得到（上裁 ${pl.top}、總裁 ${pl.crop}）`) }
  }
});

test("889 各尺寸選圖結果：iPad 820×1148（888 那台）、iPad 直橫、分割畫面、摺疊機、桌面接近正方形的視窗都蓋滿；手機直向照舊不動", () => {
  const T = [   // [說明, 寬, 高, 頂欄, 沒變體時的圖, 期待蓋滿的比例下限]
    ["iPhone 669×869（回饋 889）", 669, 869, 96, "p34", 1], ["iPad 820×1148（回饋 888）", 820, 1148, 130, "p34", 1], ["iPad 820×1180", 820, 1180, 130, "p34", 1],
    ["iPad mini 744×1133", 744, 1133, 130, "p34", 1], ["iPad Pro 13 直", 1032, 1376, 130, "p34", 1], ["iPad 分割一半 678×1024", 678, 1024, 130, "p34", 1],
    ["iPad 橫 1180×820", 1180, 820, 130, "l1610", 1], ["Duo 攤開直拿 626×890", 626, 890, 120, "p34", 1], ["方形視窗 900×1000（0.98：原圖填滿寬度）", 900, 1000, 86, "home", 1],
    ["桌面 1000×900（1.23）", 1000, 900, 86, "l1610", 1], ["視窗 1100×1000（1.20：橫版上下留一點模糊）", 1100, 1000, 86, "l1610", 0.95],["桌面 1440×900", 1440, 900, 86, "l1610", 1]
  ];
  for (const [nm, w, h, top, k, min] of T) {
    const r0 = homeLayout(w, h, top, "", false); assert.equal(r0.img, k, nm + " 沒變體的圖"); assert.ok(r0.fill >= min, `${nm} 原圖蓋了 ${r0.fill.toFixed(3)}`);
  }
  for (const [nm, w, h, top] of [["iPhone 17 402×874", 402, 874, 96], ["iPhone SE 375×667", 375, 667, 20], ["Pro Max 440×956", 440, 956, 96], ["Duo 闔起 466×678", 466, 678, 96]]) {
    for (const [, wv, cl] of WORLDS) { const r = homeLayout(w, h, top, wv, cl); assert.equal(r.how, "手機照舊", nm + " " + wv); assert.equal(r.img === "p34" || r.img === "l1610", false) }
  }
  // 888 那台 iPad 有變體時：照 11/15 上線的做法（變體＋程式填滿寬度，經典世界多長卷）
  for (const [nm, wv, cl] of WORLDS.filter(x => x[1])) { const r = homeLayout(820, 1148, 130, wv, cl); assert.equal(r.how, "填滿寬度", nm); assert.equal(r.fill, 1, nm) }
});

test("889 門檻：首頁的直向填滿放寬到 1.04、別的場景頁照舊 0.85；寬版 0.89 以下直版、0.89～1.04 原圖、1.04 以上橫版", () => {
  assert.equal(XFL_PORT_MAX, 0.85); assert.equal(XFL_HOME_MAX, 1.04); assert.equal(HR("HMW_SQ"), 1.04, "07z 跟 07fl 同一點");
  assert.equal(HC.xflGate(669, 773, 669, 768, 1376), false, "別的場景頁：0.87 照舊不填滿");
  assert.equal(HC.xflGate(669, 773, 669, 768, 1376, XFL_HOME_MAX), true, "首頁：0.87 填滿");
  assert.equal(HC.xflGate(1100, 1000, 1100, 768, 1376, XFL_HOME_MAX), false, "首頁 1.1 以上照原本（橫向）");
  assert.equal(HC.xflGate(402, 778, 402, 768, 1376, XFL_HOME_MAX), false, "手機直向不進來");
  assert.equal(HC.hmwKind(669, 773, 669, 869), "p34", "0.865：直版"); assert.equal(HC.hmwKind(669, 739, 669, 869), "", "0.905：原圖填滿寬度");
  assert.equal(HC.hmwKind(1040, 1000, 1040, 1100), ""); assert.equal(HC.hmwKind(1050, 1000, 1050, 1100), "l1610");
});

test("〔原始碼〕889 接線：07fl xflPort 首頁傳 XFL_HOME_MAX；07z hmwKind 用 HMW_SQ", () => {
  assert.match(SRC_FL, /if\(!xflGate\(vw,av,W,nw,nh,\/\(\^\|\\s\)home-page\(\\s\|\$\)\/\.test\(P\.className\|\|""\)\?XFL_HOME_MAX:0\)\)return false;/);
  assert.match(SRC_Z, /const HMW_PORT=\[0\.6,0\.89\]/); assert.match(SRC_Z, /r>=HMW_PORT\[0\]&&r<=HMW_PORT\[1\]&&\(vw>=600\|\|vw>av\)/); assert.match(SRC_Z, /if\(r>HMW_SQ&&Math\.min\(vw,vh\)>=HMW_LMIN\)/);
});

/* ---------------- 890：插曲全螢幕頁讓開狀態列 ---------------- */
test("890 插曲全螢幕頁（.ep-ov）上緣讓開安全區：--safeT＋10px，新版 iOS gapfix 多讓；左右讓開瀏海；底部照舊", () => {
  let css = ""; const head = { append: s => { css += s.textContent } };
  const ctx = vm.createContext({ window: { addEventListener() { } }, document: { getElementById: () => null, createElement: () => ({}), head, addEventListener() { } }, setTimeout: () => 0, clearTimeout() { }, addEventListener() { }, Math, Object, String, JSON, Date, isFinite });
  vm.runInContext(SRC_T, ctx); ctx.epCss();
  const rule = (css.match(/(^|\n)\.ep-ov\{[^}]*\}/) || [""])[0];
  assert.match(rule, /padding:calc\(10px \+ var\(--safeT,env\(safe-area-inset-top,0px\)\)\) max\(12px,env\(safe-area-inset-right,0px\)\) calc\(14px \+ env\(safe-area-inset-bottom\)\) max\(12px,env\(safe-area-inset-left,0px\)\)/);
  assert.match(css, /html\.gapfix \.ep-ov\{padding-top:calc\(34px \+ var\(--safeT,env\(safe-area-inset-top,0px\)\)\)\}/);
  // 用 440×894 動態島的 --safeT（59）算：第一行字的上緣在狀態列下面
  const padTop = safeT => 10 + safeT; assert.ok(padTop(59) >= 59 + 8, "第一行在狀態列＋動態島底下");
  assert.ok(SRC_T.includes("燈芯結了一朵燈花") && SRC_T.includes('ov.className="ep-ov"'), "就是回報截圖那一頁（ep4 結算、ep3 不速之客都用 .ep-ov）");
});

test("〔原始碼〕890 同一種全螢幕故事／對話頁都讓開上緣安全區：插曲 .ep-ov、主線遠征令卡 #mnqCard、黑洞超展開 #bhxPg、主線劇情 #mnvPg、星河 .gx-ov、新手練習 #stqPg", () => {
  const has = (f, sel) => { const s = M("m/" + f), i = s.indexOf(sel + "{"); assert.ok(i >= 0, f + " 找不到 " + sel); return s.slice(i, s.indexOf("}", i)).includes("safe-area-inset-top") || s.slice(i, s.indexOf("}", i)).includes("--safeT") };
  assert.ok(has("07t-episodes.js", ".ep-ov"), ".ep-ov");
  assert.ok(has("07mnq-mainquest.js", "#mnqGf,#mnqCard"), "#mnqCard");
  assert.ok(has("07bh-blackhole.js", "#bhxPg"), "#bhxPg");
  assert.ok(M("m/07mnv-mainvn.js").includes("padding-top:calc(20px + env(safe-area-inset-top,0px))"), "#mnvPg 原本就有");
  assert.ok(M("m/07gx-galaxy.js").includes("padding:max(10px,env(safe-area-inset-top)) 12px 6px"), ".gx-ov 原本就有");
  assert.ok(M("m/07stq-starter.js").includes("padding:calc(10px + env(safe-area-inset-top,0px))"), "#stqPg 原本就有");
});
