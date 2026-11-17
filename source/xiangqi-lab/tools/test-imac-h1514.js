// 11/17 iMac 測試員 H（iPhone Duo 466×678pt，狀態列和相機在右側，原生 1514）：P1 左右安全區、P2 商店描述數字、P2 原生版引擎「下載完成」。
// 不開瀏覽器：把 CSS 裡的 env(safe-area-inset-left／right) 換成模擬值（右 84px）算位置。畫面請 iMac 在 Duo 複驗。
// 用法：node --test xiangqi-lab/tools/test-imac-h1514.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const HAS_IOS = fs.existsSync(path.join(ROOT, "xiangqi-ios")), SKIP_IOS = HAS_IOS ? false : "沒有 xiangqi-ios";
const U = M("00-util.js"), CSS = vm.runInNewContext(between(U, "const SAFE_LR_CSS=", "`;   /*").replace("const SAFE_LR_CSS=", "") + "`");   /* 11/17 之後 SAFE_LR_CSS 後面還接了 TAP44_CSS 等，切到樣板字串結尾為止 */
/* 很小的 CSS 計算：calc／min／env，單位 px、vw、%（相對寬 W） */
function px(expr, W, insL, insR) {
  let e = String(expr).replace(/env\(safe-area-inset-left,0px\)/g, insL + "px").replace(/env\(safe-area-inset-right,0px\)/g, insR + "px");
  e = e.replace(/(-?[\d.]+)vw/g, (m, n) => (n * W / 100) + "").replace(/(-?[\d.]+)%/g, (m, n) => (n * W / 100) + "").replace(/(-?[\d.]+)px/g, "$1");
  e = e.replace(/calc\(/g, "(").replace(/min\(/g, "Math.min(").replace(/max\(/g, "Math.max(");
  return vm.runInNewContext(e);
}
const rule = (sel) => { const i = CSS.indexOf(sel + "{"); assert.ok(i >= 0, "有規則：" + sel); return CSS.slice(i + sel.length + 1, CSS.indexOf("}", i)) };
const prop = (body, k) => { const m = body.match(new RegExp("(?:^|;)" + k + ":([^;]+)")); assert.ok(m, k); return m[1] };

test("H P1：右側安全區 84px（iPhone Duo 466 寬）——頂欄右邊的鈕、底部卡片 ✕、滑出面板（全部錯棋）都在安全區外；沒有側邊安全區時位置不變", () => {
  const W = 466, R = 84, safeRight = W - R;
  /* 頂欄：右邊 padding＝6＋右側安全區 → 最右邊的鈕右緣 */
  const tb = rule(".topbar"); assert.equal(px(prop(tb, "padding-right"), W, 0, R), 90); assert.ok(W - px(prop(tb, "padding-right"), W, 0, R) <= safeRight);
  assert.equal(px(prop(tb, "padding-right"), W, 0, 0), 6, "沒有安全區時照舊 6px");
  /* 底部卡片的 ✕：right＝10＋安全區 */
  const sx = rule(".sheet .sh-x"); const xRight = W - px(prop(sx, "right"), W, 0, R); assert.ok(xRight <= safeRight, "✕ 右緣 " + xRight);
  /* 滑出面板（07w .xqs，錯棋重練的「全部錯棋」）：寬＝min(94vw−左右安全區, 520)，中心往左移半個安全區；✕ 在面板右上（right:2px） */
  const xq = rule(".xqs.xqs"), w = px(prop(xq, "width"), W, 0, R), left = px(prop(xq, "left"), W, 0, R) - w / 2;
  assert.ok(left >= 0 && left + w <= safeRight, `面板 ${left.toFixed(0)}～${(left + w).toFixed(0)}，安全區從 ${safeRight}`);
  const w0 = Math.min(0.94 * W, 520), l0 = W / 2 - w0 / 2; assert.ok(l0 + w0 > safeRight, "對照：以前面板右緣 " + (l0 + w0).toFixed(0) + " 被壓到");
  assert.ok(Math.abs(px(prop(xq, "width"), W, 0, 0) - w0) < 1e-6, "沒有安全區時寬度不變"); assert.equal(px(prop(xq, "left"), W, 0, 0), W / 2);
  /* 彈窗、術語碑面板、貼邊的浮窗 */
  assert.equal(px(prop(rule(".modal"), "padding-right"), W, 0, R), 24 + R);
  for (const sel of ["html .dgl-float", "html .cpl-door"]) assert.ok(W - px(prop(rule(sel), "right"), W, 0, R) <= safeRight, sel);
  assert.ok(U.includes("safeLRCss();"), "開機就插");
});
test("H P1：滑出面板可以往下滑關、點外面關（遮罩被別的圖層蓋住也一樣）", () => {
  const S = M("07w-shipwalk.js");
  assert.ok(S.includes('el.addEventListener("touchend",e=>{if(y0==null)return;const dy=e.changedTouches[0].clientY-y0;y0=null;if(dy>70&&S.on())S.close()},{passive:true});'));
  assert.ok(S.includes('document.addEventListener("pointerdown",e=>{if(!el.isConnected||!S.on())return;const t=e.target;if(t&&t.nodeType===1&&(el.contains(t)||t.closest(".modal,#sheet,.toast")))return;S.close()},true)'));
  /* 模擬：開著時點外面 → 收起；點面板裡 → 不收 */
  const src = between(S, "function xqSheet(v,o){", "\n/* 回饋 834");
  const listeners = []; let closed = 0;
  const mkEl = () => ({ cls: new Set(), classList: { add(c) { this._s.add(c) }, remove(c) { this._s.delete(c) }, contains(c) { return this._s.has(c) }, _s: new Set() }, setAttribute() {}, append() {}, addEventListener() {}, querySelector() { return { textContent: "", remove() {}, onclick: null } }, contains: t => !!(t && t.inside), isConnected: true });
  const ctx = { xqSheetCss() {}, xqSheetDup() {}, MutationObserver: class { observe() {} }, setTimeout, document: { createElement: mkEl, addEventListener: (k, f) => listeners.push(f) } };
  vm.createContext(ctx); vm.runInContext(src + "\nthis.S=xqSheet({append(){}},{})", ctx);
  const Sx = ctx.S; const c0 = Sx.close; Sx.close = () => { closed++; c0() };
  Sx.el.classList.add("open"); listeners[0]({ target: { nodeType: 1, closest: () => null } }); assert.equal(closed, 1, "點外面收起");
  Sx.el.classList.add("open"); listeners[0]({ target: { nodeType: 1, inside: true, closest: () => null } }); assert.equal(closed, 1, "點面板裡不收");
});
test("H P2（準則 2.3）：商店描述照畫面寫 18 級（新手～專3・全力），不再寫「入門到大師共八個難度」；其他數字對過", { skip: SKIP_IOS }, () => {
  const md = rd("xiangqi-ios/appstore/metadata.md");
  assert.ok(!/八個難度|eight levels|到大師|to master/.test(md.replace(/- 「18 級」[^\n]*/, "")), "舊說法拿掉");
  assert.ok(md.includes("從「新手」、入門、業餘到「專3・全力」共 18 級。") && md.includes("with 18 levels, from Novice through Beginner and Amateur to Expert 3 (full strength)."));
  const NM = vm.runInNewContext("(" + M("06-cpu.js").match(/FINE_NM=(\[[^\]]+\])/)[1] + ")"); assert.equal(NM.length, 18); assert.equal(NM[0], "新手"); assert.equal(NM[17], "專3・全力");
  const ERAS = M("01-board.js"), i = ERAS.indexOf("const ERAS=["); assert.equal(ERAS.slice(i, ERAS.indexOf("];", i)).match(/k:"[a-z]+"/g).length, 13); assert.ok(md.includes("十二個朝代加上經典風格，共十三套"));
  const cs = JSON.parse(rd("xiangqi-lab/site/data/canju/canju-set.json")), q = JSON.parse(rd("xiangqi-lab/site/data/quiz.json"));
  assert.ok(cs.items.length >= 600 && cs.items.length < 700, "六百多個殘局：" + cs.items.length); assert.ok(q.items.length >= 800 && q.items.length < 900, "八百多題：" + q.items.length);
  assert.ok(md.includes("More than eight hundred rated questions"));
});
test("H P2（準則 2.5.2 觀感）：原生 App 的引擎是從本機讀——進度寫「準備」、讀完不跳「下載完成」；網頁版照舊", () => {
  const S = M("02-shell.js");
  assert.ok(S.includes('if(OFF&&window.XQEngine){let bar=null;const NAT=typeof xqNat==="function"&&xqNat();'));
  assert.ok(S.includes("bar.textContent=NAT?`準備 Pikafish 引擎 ${p}%`:`第一次使用：下載 Pikafish 引擎"));
  assert.ok(S.includes('if(got>=total){bar&&bar.remove();bar=null;if(!NAT)toast("✅ Pikafish 引擎下載完成")}'));
  const I = M("07i18n.js"), ctx = {}; vm.createContext(ctx); const a = I.indexOf("#I18N-PURE-BEGIN"), b = I.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I.slice(I.indexOf("\n", a) + 1, b) + ";this.T=i18nText", ctx); assert.equal(ctx.T("準備 Pikafish 引擎 37%"), "Preparing the Pikafish engine 37%");
});
