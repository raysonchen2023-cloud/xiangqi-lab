// 11/15 開發者（首頁截圖）「把回報問題移到快速對戰下面」「回報問題的按鈕也用快速對戰／更多玩法的 UI 風格」「回報問題／快速對戰／更多玩法都用有透明度」
// （m/07z-homemap.js hmGoBar 與樣式）。這裡只有原始碼比對；畫面在本機候選版手機尺寸看過（三顆同寬 220、由上到下：更多玩法、快速對局、回報問題）。
// 用法：node --test xiangqi-lab/tools/test-home-bar-1115.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const rd = (...p) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8");
const HM = rd("xiangqi-db", "m", "07z-homemap.js"), MNQ = rd("xiangqi-db", "m", "07mnq-mainquest.js");
const css = sel => { let i = HM.indexOf("\n" + sel + "{"); i = i >= 0 ? i + 1 : HM.indexOf(sel + "{");   /* 先找寫在行首的那一條（.hm-go 前面還有 .hm-go-bar .hm-go 的覆蓋） */ assert.ok(i >= 0, "找不到樣式 " + sel); return HM.slice(i + sel.length + 1, HM.indexOf("}", i)) };
const px = (s, k) => { const m = s.match(new RegExp("(?:^|;)" + k + ":(\\d+)px")); return m ? +m[1] : null };

test("〔原始碼〕順序：加到主畫面（有才放）→ 快速對局 → 回報問題；回報問題不再跟加到主畫面擠同一列", () => {
  assert.ok(HM.includes("if(ib)bar.append(row);bar.append(b);bar.append(fb);P.append(bar);"));
  assert.ok(!HM.includes("row.append(fb)"), "回報問題不放進上面那列");
  assert.ok(MNQ.includes("bar.insertBefore(b,bar.firstChild);"), "更多玩法插在最上面，所以由上到下是：更多玩法、快速對局、回報問題");
});

test("〔原始碼〕回報問題跟上面兩顆同一家：一樣寬、同一個圓角變數、粗邊、大字，本身就夠點（不小於 44）", () => {
  const fb = css(".hm-go-bar .hm-fb"), go = css(".hm-go"), mn = MNQ.slice(MNQ.indexOf(".mnq-next{") + 10, MNQ.indexOf("}", MNQ.indexOf(".mnq-next{")));
  assert.equal(px(fb, "min-width"), 220); assert.equal(px(go, "min-width"), 220); assert.equal(px(mn, "min-width"), 220);
  assert.ok(px(fb, "min-height") >= 44); assert.ok(fb.includes("border:2px solid #f2c94c") && go.includes("border:2px solid #f2c94c"), "跟快速對局同樣的金邊");
  assert.ok(fb.includes("border-radius:var(--btn-r,10px)"), "圓角跟快速對局用同一個變數"); assert.ok(fb.includes("font:900 17px/1.2 var(--serif,serif)"));
  assert.ok(HM.includes('.hm-go-bar .hm-fb::before{content:none}'), "44 高不用再撐透明點選範圍");
  assert.ok(HM.includes('fb.className="hm-inst hm-fb";fb.id="hmFb";') && HM.includes('fb.setAttribute("aria-label","回報問題")'), "按鈕本身沒換");
});

test("〔原始碼〕三顆的底都帶透明度（0.7～0.85 之間）", () => {
  const a = css(".hm-go-bar .hm-fb").match(/background:rgba\(20,16,12,(\.\d+)\)/), b = css(".hm-go-bar .hm-go").match(/background:color-mix\(in srgb,var\(--btn-main,#A8321F\) (\d+)%,transparent\)/), c = css(".hm-go-bar .mnq-next").match(/background:linear-gradient\(rgba\(248,240,220,(\.\d+)\),rgba\(230,211,166,(\.\d+)\)\)/);
  assert.ok(a && b && c, "三條都在");
  for (const v of [+a[1], b[1] / 100, +c[1], +c[2]]) assert.ok(v >= .7 && v <= .85, "透明度 " + v);
});
