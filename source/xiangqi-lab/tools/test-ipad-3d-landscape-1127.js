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
