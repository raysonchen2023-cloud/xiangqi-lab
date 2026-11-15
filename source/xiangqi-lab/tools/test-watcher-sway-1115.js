// 11/15 開發者（線上觀戰截圖，圈起左右圍觀小人胸前的深色直條）「紅圈處會一直旋轉」
// 圈起來的是圍觀小人的腰帶（src/bot3d.js build：一根 1.42 寬的深色直條）。圍觀的人待機時原本整個身體左右晃（B.bot.rotation.z ±.03），
// 圓的身體看不出來，但從上面看腰帶就像蹺蹺板一直轉（本機實測腰帶傾角來回 ±1.7 度）。改成只有頭微微歪、身體不晃（src/park3d.js 每格動作）。
// 這裡只有原始碼比對；畫面在本機候選版手機尺寸量過：四位圍觀者的腰帶傾角固定 0 度，頭 ±.03、身體上下起伏照舊。
// 用法：node --test xiangqi-lab/tools/test-watcher-sway-1115.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const P3 = fs.readFileSync(path.join(__dirname, "..", "src", "park3d.js"), "utf8");
const i0 = P3.indexOf("watchers.forEach(W=>{const B=W.B,ph=W.ph;"), i1 = P3.indexOf("faceApply(B,W.chin", i0), LOOP = P3.slice(i0, i1);

test("〔原始碼〕找得到圍觀者每格動作那一段", () => { assert.ok(i0 > 0 && i1 > i0 && LOOP.length < 2500) });

test("〔原始碼〕圍觀的人待機時身體不左右晃（腰帶才不會一直轉），改成頭微微歪", () => {
  assert.ok(!/B\.bot\.rotation\.z\s*=/.test(LOOP), "身體不再左右晃");
  assert.ok(LOOP.includes("B.head.rotation.z=.03*Math.sin(s*.6+ph);"), "同樣的幅度與節奏改放在頭上");
});

test("〔原始碼〕其他待機動作照舊：身體上下起伏、頭點頭轉頭、被將軍時舉手前傾", () => {
  assert.ok(LOOP.includes("B.torso.position.y=B.torso.userData.y0+.015*Math.sin(s*1.7+ph);"));
  assert.ok(LOOP.includes('lerp(B.head.rotation,"x",.42+.06*Math.sin(s*.5+ph));lerp(B.head.rotation,"y",.15*Math.sin(s*.3+ph));'));
  assert.ok(LOOP.includes("if(W.react>0){W.react-=t;R(B,0,-.5,0,-1.3);R(B,1,-.5,0,1.3);B.bot.rotation.x=-.14*Math.min(1,W.react*2)}"));
});
