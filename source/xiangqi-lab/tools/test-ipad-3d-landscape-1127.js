// #255（11/27 開發者 iPad 實機：「3D場景切換沒有滿版 重新設計」）：iPad 橫向對局頁兩欄時，3D 要撐滿左欄高度、左欄把寬度讓給 3D。
// ① park3d.js 的 room()：只扣跟棋盤框（#bbox）同一欄的兄弟元素；右欄的名牌、狀態、按鈕不扣。原本全扣，1180×820 時 3D 只有 556 高、下面空一截。
//    做法：從 park3d.js 抽出 room() 原文，在假的 DOM 上真的執行（不是只比對字串）。
// ② m.css：寬螢幕兩欄、3D 顯示中時，#bbox 改用剩下的寬度；切回平面棋盤（.park3d 只是 style display:none）照原本 560:620。
// 不開瀏覽器。用法 node --test xiangqi-lab/tools/test-ipad-3d-landscape-1127.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const rd = p => fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8").replace(/\r\n/g, "\n");
const PARK = rd("xiangqi-lab/src/park3d.js"), CSS = rd("xiangqi-db/m.css");

/* 抽出 const room=()=>{…}; 整段（大括號配對） */
function roomSrc() {
  const i = PARK.indexOf("const room=()=>{"); assert.ok(i >= 0, "park3d.js 找不到 room()");
  let d = 0, j = PARK.indexOf("{", i);
  for (; j < PARK.length; j++) { if (PARK[j] === "{") d++; else if (PARK[j] === "}" && --d === 0) break; }
  return PARK.slice(i, j + 1);
}
/* 假的版面：view 是 overflow:hidden 的容器；box（#bbox）在左欄 x 12～678、上下 padding 各 6；其他兄弟照給的位置 */
function run(sibs, { viewH = 761, boxLeft = 12, boxRight = 678 } = {}) {
  const css = new Map();
  const mk = (o) => Object.assign({ offsetHeight: 0, getBoundingClientRect: () => ({ left: o.left || 0, right: o.right || 0, width: (o.right || 0) - (o.left || 0) }) }, o);
  const box = mk({ left: boxLeft, right: boxRight, offsetHeight: viewH });
  const kids = sibs.map(mk);
  const view = { clientHeight: viewH, children: [kids[0], box, ...kids.slice(1)].filter(Boolean) };
  box.parentElement = view;
  const el = { parentElement: box };
  css.set(view, { overflow: "hidden", position: "static", flexGrow: "0" });
  css.set(box, { position: "relative", paddingTop: "6px", paddingBottom: "6px", flexGrow: "0" });
  for (const k of kids) css.set(k, { flexGrow: k.grow || "0", position: "static" });
  const getComputedStyle = (e) => css.get(e) || { flexGrow: "0", position: "static" };
  const f = new Function("el", "getComputedStyle", roomSrc() + "\nreturn room();");
  return f(el, getComputedStyle);
}

test("room()：兩欄（iPad 橫向 1180×820）右欄的名牌、狀態、按鈕不扣，3D 撐滿左欄 749 高", () => {
  const right = (h) => ({ left: 694, right: 1168, offsetHeight: h });
  const h = run([right(49), right(6), right(49), right(18), right(28), right(43)]);
  assert.equal(h, 761 - 12, "只扣 #bbox 自己的上下 padding");
});

test("room()：單欄（手機直向）上下的兄弟照舊扣掉；藏起來的（寬 0）不影響；撐開空白的 flex:1 不扣", () => {
  const col = (h, extra) => Object.assign({ left: 0, right: 390, offsetHeight: h }, extra);
  const h = run([col(49), col(49), col(43), { left: 0, right: 0, offsetHeight: 0 }, col(120, { grow: "1" })], { boxLeft: 0, boxRight: 390, viewH: 800 });
  assert.equal(h, 800 - 49 - 49 - 43 - 12);
});

test("反證：把「不同欄就不扣」那段拿掉，兩欄時就會少掉右欄的高度（測試抓得到退回原本寫法）", () => {
  const src = roomSrc();
  assert.match(src, /cR\.left>=bR\.right\|\|cR\.right<=bR\.left/, "room() 要比對左右有沒有重疊");
});

test("m.css：寬螢幕兩欄、3D 顯示中，#bbox 用剩下的寬度（右欄 320～400）；平面棋盤（.park3d display:none）不套", () => {
  const blk = CSS.slice(CSS.indexOf("@media (orientation:landscape) and (min-width:900px) and (min-height:600px){"));
  const end = blk.indexOf("\n}\n"); const media = blk.slice(0, end);
  assert.ok(media.length > 0, "找不到平板橫向那段 @media");
  assert.match(media, /\.view\.fixed:has\(> #bbox > \.park3d:not\(\[style\*="display: none"\]\):not\(\[style\*="display:none"\]\)\)>#bbox\{width:calc\(100cqw - 24px - 16px - clamp\(320px, 30cqw, 400px\)\)\}/);
  assert.match(media, /\.view\.fixed:has\(> #bbox\)>#bbox\{grid-column:1;grid-row:1 \/ span 30;align-self:start;padding:6px 0;height:calc\(100cqh - 12px\);width:calc\(\(100cqh - 24px\) \* 560 \/ 620\)\}/, "平面棋盤原本的 560:620 規則還在");
});

// ③ 07f shpCapL：寬版圖往左裁掉時（iPad 13 吋橫向星槎書架 page_shelf_l1610 寬 1544、marginLeft −84），標題條照 --pcL 往內縮（跟渡口 portScw 同一招，審查 #165 決定不改 07fl）
test("07f shpCapL：shpFit 每頁都掛；照 marginLeft 算 --pcL、直圖 0；渡口掛過就不重掛；07fl 不改", () => {
  const F = rd("xiangqi-db/m/07f-ship.js");
  assert.match(F, /function shpFit\(v\)\{try\{shpCapL\(v\.querySelector\("\.shp-page\.cq"\)\)\}catch\(e\)\{\}/);
  assert.match(F, /\.shp-page\.scw-l>\.shp-cap\{padding-left:calc\(16px \+ var\(--pcL,0px\)\)\}/);
  const src = F.slice(F.indexOf("function shpCapL("), F.indexOf("function shpFit("));
  let obs = null; const props = {}; const doc = { getElementById: () => 1, createElement: () => ({}), head: { append() { } } };
  const fn = new Function("window", "document", "MutationObserver", src + "\nreturn shpCapL;")({ MutationObserver: 1 }, doc, function (f) { obs = f; this.observe = () => { } });
  const P = { dataset: { scw: "l1610" }, style: { marginLeft: "-84px", getPropertyValue: k => props[k] || "", setProperty: (k, v) => { props[k] = v } } };
  fn(P); assert.equal(props["--pcL"], "84px", "13 吋橫向：左邊裁掉 84");
  P.dataset.scw = ""; obs(); assert.equal(props["--pcL"], "0px", "直圖不縮");
  const Q = { _pcLmo: 1, dataset: { scw: "l1610" }, style: { marginLeft: "-50px", getPropertyValue: () => "", setProperty: () => { throw new Error("不該重掛") } } }; fn(Q);
  assert.doesNotMatch(rd("xiangqi-db/m/07fl-fill.js"), /--xflL/, "07fl 不改（審查 #165）");
});

// ④ 對局 2D／3D 右欄：平板橫向著法條改成直式兩欄、撐到右欄底（11/27 開發者選「直式著法紀錄撐滿」）
test("m.css＋05 stripFitV：平板橫向 #strip 排右欄最後、紅黑兩欄、黑先走放右欄、空的寫提示；高度量到右欄底", () => {
  const blk = CSS.slice(CSS.indexOf("@media (orientation:landscape) and (min-width:900px) and (min-height:600px){")); const media = blk.slice(0, blk.indexOf("\n}\n"));
  assert.match(media, /\.view\.fixed:has\(> #bbox\)>#strip\{order:1;display:grid;grid-template-columns:1fr 1fr;/);
  assert.match(media, /#strip>\.chip\.b:first-child\{grid-column:2\}/);
  assert.match(media, /#strip:empty::before\{content:"著法會記在這裡"/);
  const S = rd("xiangqi-db/m/05-settings.js");
  assert.match(S, /const STRIP_V_MQ="\(orientation:landscape\) and \(min-width:900px\) and \(min-height:600px\)";/, "跟 m.css 同一個 @media 條件");
  assert.ok(media.length && CSS.includes("@media (orientation:landscape) and (min-width:900px) and (min-height:600px){"));
  const rs = S.slice(S.indexOf("function renderStrip("), S.indexOf("function actionBar("));
  assert.match(rs, /stripFitV\(box,on\)\}/, "renderStrip 每次換內容都量一次");
  /* 實跑 stripFitV：右欄 view 上緣 59、高 761、padding-bottom 0；#strip 上緣 260 → 高 820-260-8＝552；不是直式就還原 */
  const fn = new Function("matchMedia", "getComputedStyle", S.slice(S.indexOf("const STRIP_V_MQ="), S.indexOf('if(typeof addEventListener==="function")addEventListener("resize"')) + "\nreturn stripFitV;");
  const mk = (grid, mq) => { const v = { clientHeight: 761, getBoundingClientRect: () => ({ top: 59 }) }; const box = { parentElement: v, style: { height: "" }, scrollTop: 0, clientHeight: 552, lastElementChild: null, getBoundingClientRect: () => ({ top: 260 }) };
    const f = fn(() => ({ matches: mq }), (e) => e === box ? { display: grid ? "grid" : "flex" } : { paddingBottom: "0px" }); return { f, box }; };
  { const { f, box } = mk(true, true); f(box); assert.equal(box.style.height, "552px"); }
  { const { f, box } = mk(false, true); box.style.height = "300px"; f(box); assert.equal(box.style.height, "", "不是直式（手機、平板直向）就還原"); }
  { const { f, box } = mk(true, false); box.style.height = "300px"; f(box); assert.equal(box.style.height, ""); }
});
