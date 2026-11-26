/* W107（11/24 開發者：「因為是棋藝類的遊戲 想為大螢幕好好設計」）第一步：有棋盤的對局頁在 iPad 直向放大、橫向改兩欄。
   重點是手機完全不受影響：從 m.css 讀出 W107 那兩條 @media 的條件，用一組手機、分割畫面、平板尺寸去套（行為）；
   只套有棋盤的頁、棋盤高度用容器查詢這幾件用原始碼比對（標〔原始碼〕）。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const CSS = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m.css"), "utf8");
const at = CSS.indexOf("/* W107 iPad 大螢幕"), seg = at >= 0 ? CSS.slice(at, CSS.indexOf("\n}\n", at) + 3) : "";
/* 取出 W107 段裡每條 @media 的條件 */
const medias = [...seg.matchAll(/@media ([^{]+)\{/g)].map((m) => m[1].trim());
function matches(q, w, h) {
  return q.split(/\s+and\s+/).every((c) => {
    c = c.replace(/[()]/g, "").trim();
    if (c === "orientation:portrait") return h >= w;
    if (c === "orientation:landscape") return w > h;
    const m = /^(min|max)-(width|height):(\d+)px$/.exec(c); if (!m) throw new Error("看不懂的條件：" + c);
    const v = m[2] === "width" ? w : h; return m[1] === "min" ? v >= +m[3] : v <= +m[3];
  });
}
const portraitQ = () => medias.find((q) => /portrait/.test(q)), landscapeQ = () => medias.find((q) => /landscape/.test(q));

test("m.css 有 W107 段，裡面一條直向、一條橫向的 @media", () => {
  assert.ok(at >= 0, "找不到 W107 段");
  assert.equal(medias.length, 2, "W107 段的 @media：" + medias.join("｜"));
  assert.ok(portraitQ() && landscapeQ());
});

test("手機（直向、橫放）和分割畫面：兩條都套不到，版面跟以前一樣", () => {
  assert.equal(medias.length, 2, "要先讀得到 W107 的兩條 @media，不然這項會空轉通過");
  for (const [w, h, name] of [[390, 844, "iPhone 直向"], [430, 932, "大 iPhone 直向"], [844, 390, "iPhone 橫放"], [932, 430, "大 iPhone 橫放"], [540, 820, "iPad 分割畫面一半"], [375, 667, "小 iPhone"]])
    for (const q of medias) assert.equal(matches(q, w, h), false, `${name} ${w}×${h} 不該套到「${q}」`);
});

test("平板：直向套直向那條、橫向套橫向那條，不會兩條同時套到", () => {
  assert.equal(medias.length, 2, "要先讀得到 W107 的兩條 @media");
  for (const [w, h] of [[820, 1180], [768, 1024], [1024, 1366]]) {
    assert.equal(matches(portraitQ(), w, h), true, `直向 ${w}×${h} 要放大棋盤`);
    assert.equal(matches(landscapeQ(), w, h), false);
  }
  for (const [w, h] of [[1180, 820], [1024, 768], [1366, 1024]]) {
    assert.equal(matches(landscapeQ(), w, h), true, `橫向 ${w}×${h} 要兩欄`);
    assert.equal(matches(portraitQ(), w, h), false);
  }
});

test("〔原始碼〕只套有棋盤的頁、棋盤高度用容器查詢、寬度照 560:620", () => {
  assert.match(seg, /\.view\.fixed:has\(> #bbox\)\{container-type:size;display:grid;/, "橫向兩欄只套有 #bbox 的頁，並當尺寸容器");
  assert.match(seg, />#bbox\{grid-column:1;[^}]*height:calc\(100cqh - 12px\);width:calc\(\(100cqh - 24px\) \* 560 \/ 620\)\}/, "棋盤在左欄、高度用 100cqh");
  assert.match(seg, /\.view\.fixed:has\(> #bbox\)>\*\{grid-column:2;/, "其他區塊排右欄");
  assert.ok(!/\/\/[^\n]*\n/.test(seg.replace(/https?:\/\/\S+/g, "")), "樣式段裡不能有 // 註解");
});
