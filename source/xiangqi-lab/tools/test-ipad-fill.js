// 11/13 開發者「遊戲畫面都要滿版」（iPad 全尺寸、摺疊 iPhone Duo）：大螢幕上的滿版場景兩側不再是空白宣紙。
// 修法：新模組 xiangqi-db/m/07fl-fill.js 包住 07t3 的 r07Wide／r07Off／ttFill——
//   直向（寬÷可用高 ≤ 0.85）：圖填滿寬度、上下裁一點，入口標籤全部留在看得到的範圍（擺不進就少放大一點，兩側用模糊底補）；
//   橫向：照原本完整顯示，兩側鋪同一張圖的模糊底（#xflBg）。手機直向不進來。07sp-spotfit 改成量「看得到的範圍」。
// 不開瀏覽器：純計算 xflGate／xflPlan 直接在 vm 跑；包裝的行為用假的 #view／圖框跑。用法 node --test xiangqi-lab/tools/test-ipad-fill.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC = M("m/07fl-fill.js");
const NW = 768, NH = 1376;
function load(extra) {
  const ctx = vm.createContext(Object.assign({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, addEventListener: () => { }, isFinite, Math }, extra || {}));
  if (extra && extra.__pre) vm.runInContext(extra.__pre, ctx);
  vm.runInContext(SRC, ctx);
  return ctx;
}
const C0 = load(), { xflGate, xflPlan } = C0, XFL_PORT_MAX = vm.runInContext("XFL_PORT_MAX", C0);
// 每個東西要看得到的那段（跟 xflPlan 同一個規則：中間 min(h/2,30)+6）
const seen = (pl, its, av) => its.every(q => { const e = Math.min(q.h / 2, 30) + 6, c = q.c * pl.H, t = Math.max(0, c - e), b = Math.min(pl.H, c + e); return t >= pl.top - 1 && b <= pl.top + av + 1 });

test("門檻：iPad 直向、Duo 攤開直拿、分割畫面進直向填滿；手機直向、Duo 闔起、小視窗、所有橫向都不進來", () => {
  const av = (h, top = 86, bot = 0) => h - top - bot;
  assert.equal(xflGate(820, av(1180), 820, NW, NH), true, "iPad 直向");
  assert.equal(xflGate(744, av(1133), 744, NW, NH), true, "iPad mini 直向");
  assert.equal(xflGate(1032, av(1376), 1032, NW, NH), true, "iPad Pro 13 直向");
  assert.equal(xflGate(1024, av(1366), 1024, NW, NH), true, "iPad Air 13 直向");
  assert.equal(xflGate(626, av(890, 124), 626, NW, NH), true, "Duo 攤開直拿");
  assert.equal(xflGate(678, av(1024), 678, NW, NH), true, "iPad 分割一半");
  for (const [w, h, n] of [[402, 874, "iPhone 17"], [375, 667, "SE"], [440, 956, "Pro Max"], [466, 678, "Duo 闔起"], [500, 700, "iPad 小視窗"], [320, 1000, "最窄側欄"]])
    assert.equal(xflGate(w, av(h, 120), w, NW, NH), false, n + "（手機直向不能變）");
  for (const [w, h, n] of [[1180, 820, "iPad 橫向"], [1376, 1032, "Pro 13 橫向"], [890, 626, "Duo 攤開橫拿"], [956, 440, "手機橫向"], [1440, 900, "桌面"]])
    assert.equal(xflGate(w, av(h), w, NW, NH), false, n + "（橫向走原本的完整顯示＋模糊底）");
  assert.ok(XFL_PORT_MAX >= 0.8 && XFL_PORT_MAX <= 0.9);
});

test("首頁那種入口集中在中間：填滿寬度（fill=1）、上下裁，入口全部看得到", () => {
  const W = 820, av = 1094, its = [{ c: .14, h: 30 }, { c: .26, h: 30 }, { c: .3, h: 30 }, { c: .5, h: 30 }, { c: .54, h: 30 }];
  const pl = xflPlan({ W, av, nw: NW, nh: NH, items: its });
  assert.equal(pl.w, W); assert.equal(pl.fill, 1);
  assert.ok(pl.crop > 300, "iPad 直向要裁掉 300 多 px：" + pl.crop);
  assert.ok(pl.top >= 0 && pl.top <= pl.crop);
  assert.ok(seen(pl, its, av), "入口都在看得到的範圍");
});

test("設定房間那種入口從頂排到底：少放大一點（比畫面窄、兩側補模糊底），但不會比原本的置中小；入口全部看得到", () => {
  const W = 820, av = 1094, its = [{ c: .07, h: 30 }, { c: .14, h: 30 }, { c: .5, h: 30 }, { c: .9, h: 30 }, { c: .93, h: 30 }];
  const pl = xflPlan({ W, av, nw: NW, nh: NH, items: its }), fitW = av * NW / NH;
  assert.ok(pl.w < W, "比畫面窄");
  assert.ok(pl.w >= Math.floor(fitW), "至少跟原本 r07-fit 一樣大");
  assert.ok(pl.w > fitW + 50, "比原本 r07-fit 大：" + pl.w + " vs " + Math.round(fitW));
  assert.ok(seen(pl, its, av));
});

test("入口貼著圖的最上和最下：退回整張圖完整顯示（等於原本 r07-fit），不裁", () => {
  const W = 820, av = 1094, its = [{ c: 0, h: 40 }, { c: 1, h: 40 }];
  const pl = xflPlan({ W, av, nw: NW, nh: NH, items: its });
  assert.ok(Math.abs(pl.w - av * NW / NH) <= 2, pl.w);
  assert.equal(pl.top, 0); assert.ok(pl.crop <= 1);
});

test("圖上面還有別的內容（off>8）：不裁上面，只裁下面；沒有入口時照偏好上下各裁一半", () => {
  const W = 820, av = 1000, its = [{ c: .2, h: 30 }, { c: .6, h: 30 }];
  const a = xflPlan({ W, av, nw: NW, nh: NH, items: its, off: 40 });
  assert.equal(a.top, 0); assert.ok(seen(a, its, av));
  const b = xflPlan({ W, av, nw: NW, nh: NH, items: [] });
  assert.equal(b.w, W); assert.ok(Math.abs(b.top - b.crop / 2) <= 1);
});

test("大入口區（出口那種 17% 高的點選區）只要中間那段看得到，不會讓整張圖縮回去", () => {
  const W = 820, av = 1094, its = [{ c: .3, h: 30 }, { c: .915, h: 250 }];
  const pl = xflPlan({ W, av, nw: NW, nh: NH, items: its });
  assert.equal(pl.w, W); assert.ok(seen(pl, its, av));
});

test("圖照寬度放就比畫面矮（不用裁）：回傳 null，交給原本的排法", () => {
  assert.equal(xflPlan({ W: 400, av: 800, nw: NW, nh: NH, items: [] }), null);
});

// 包裝行為：假的 #view／圖框，手機直向（門檻不過）時完全交給原本的 r07Wide，不碰圖框樣式；iPad 直向時接手、不呼叫原本的
function fakeEnv(vw, vh, pClass) {
  const calls = [], cls = new Set(), style = {}, pst = { setProperty() { }, removeProperty() { } }, pcl = new Set();
  const im = { naturalWidth: NW, naturalHeight: NH, complete: true, currentSrc: "data/homemap/home.webp", src: "data/homemap/home.webp", dataset: {}, addEventListener() { }, isConnected: true };
  const P = { className: pClass || "shp-page cq home-page", style: pst, dataset: {}, classList: { toggle: (c, on) => on ? pcl.add(c) : pcl.delete(c), remove: c => pcl.delete(c), add: c => pcl.add(c) }, isConnected: true,
    getBoundingClientRect: () => ({ left: 0, top: 86, width: vw, height: vw * NH / NW, right: vw, bottom: 86 + vw * NH / NW }), querySelectorAll: () => [], querySelector: () => im };
  const V = { clientWidth: vw, clientHeight: vh - 86, scrollTop: 0, scrollHeight: vw * NH / NW, classList: { add: c => cls.add(c), remove: (...c) => c.forEach(x => cls.delete(x)), contains: c => cls.has(c) },
    getBoundingClientRect: () => ({ left: 0, top: 86, width: vw, height: vh - 86, right: vw, bottom: vh }), querySelector: () => P, contains: () => true, parentNode: { append() { } } };
  const document = { getElementById: id => id === "view" ? V : null, createElement: () => ({ style: {}, dataset: {}, setAttribute() { }, append() { }, firstChild: { style: {} } }), head: { append() { } } };
  const pre = `function r07Off(V){__calls.push("off")}function r07Wide(V,P){__calls.push("wide");return false}function ttFill(){__calls.push("tt")}function r07Push(){}`;
  const ctx = load({ __pre: pre, __calls: calls, document, getComputedStyle: () => ({ paddingBottom: "0", visibility: "visible", position: "absolute", opacity: "1" }), MutationObserver: undefined, window: {} });
  return { ctx, V, P, calls, cls, pcl };
}

test("包裝：手機直向（402×874）照原本的 r07Wide 走、圖框樣式不動；iPad 直向（820×1180）由 07fl 接手、填滿寬度", () => {
  const ph = fakeEnv(402, 874);
  ph.ctx.r07Wide(ph.V, ph.P, ph.V.getBoundingClientRect(), ph.P.getBoundingClientRect(), NW, NH);
  assert.deepEqual(ph.calls, ["wide"]);
  assert.equal(ph.P.style.width, undefined); assert.equal(ph.cls.has("xfl-port"), false);
  const ip = fakeEnv(820, 1180);
  const r = ip.ctx.r07Wide(ip.V, ip.P, ip.V.getBoundingClientRect(), ip.P.getBoundingClientRect(), NW, NH);
  assert.equal(r, true); assert.ok(!ip.calls.includes("wide"), "不呼叫原本的 r07Wide（不會變回置中留白）");
  assert.equal(ip.P.style.width, "820px"); assert.ok(ip.cls.has("xfl-port"));
  assert.ok(parseFloat(ip.P.style.marginTop) < 0, "上面裁一點");
  ip.ctx.r07Off(ip.V);
  assert.equal(ip.cls.has("xfl-port"), false, "r07Off 一併還原");
});

test("意見回饋 885：「我的角色」書齋牆（.mz-wall）在 iPad 直向不縮成一屏、照手機滿寬往下捲；橫向照原本的 r07Wide", () => {
  const ip = fakeEnv(820, 1148, "shp-page cq mz-wall");
  const r = ip.ctx.r07Wide(ip.V, ip.P, ip.V.getBoundingClientRect(), ip.P.getBoundingClientRect(), NW, NH);
  assert.equal(r, true); assert.deepEqual(ip.calls, ["off"], "只收掉寬螢幕排法，不呼叫原本的 r07Wide");
  assert.equal(ip.P.style.width, undefined, "不設寬度＝滿寬"); assert.equal(ip.cls.has("xfl-port"), false);
  const ls = fakeEnv(1180, 820, "shp-page cq mz-wall");
  ls.ctx.r07Wide(ls.V, ls.P, ls.V.getBoundingClientRect(), ls.P.getBoundingClientRect(), NW, NH);
  assert.ok(ls.calls.includes("wide"), "橫向照舊");
});

test("〔原始碼〕m.html 在 07t3 和 07sp 後面載入 07fl；07sp 量看得到的範圍；07fl 沒有 // 行內註解", () => {
  const html = M("m.html"), i = s => html.indexOf("//#include m/" + s);
  assert.ok(i("07fl-fill.js") > i("07t3-tabtube.js") && i("07t3-tabtube.js") > 0);
  assert.ok(i("07fl-fill.js") > i("07sp-spotfit.js") && i("07sp-spotfit.js") > 0);
  assert.match(M("m/07sp-spotfit.js"), /xflVis\(P,pr\)/);
  assert.equal(/(^|[^:"'])\/\/(?!#)/m.test(SRC.replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, "")), false, "07fl 裡不要有 // 註解");
  assert.match(SRC, /filter:blur\(/); assert.doesNotMatch(SRC, /backdrop-filter:/, "用 filter（靜態）不用 backdrop-filter（每幀重算）");
});
