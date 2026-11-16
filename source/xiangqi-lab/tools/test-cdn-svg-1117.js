// 11/17 iMac 模擬器 P0：全新 iPhone 第一次打開正式站，新手教學第一關的棋子、棋盤底圖都是「?」，重新整理才好。
// 原因：service worker 還沒接管時圖片直接向 GitHub 要（data/ 大檔只放 CDN）→ 404；00-util.js 的「載入失敗改向 CDN 要」只認 IMG／AUDIO／SOURCE／VIDEO，
// 棋盤是 SVG <image>（tagName 小寫 image）不在名單裡。這裡在 vm 裡載入 00-util 的那一段，觸發假的 error 事件，看網址有沒有換成 CDN。
// 用法：node --test xiangqi-lab/tools/test-cdn-svg-1117.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const SRC=fs.readFileSync(path.join(__dirname,"..","..","xiangqi-db","m","00-util.js"),"utf8");
const a=SRC.indexOf("const XQ_CDN="),b=SRC.indexOf("},true);",a)+"},true);".length;
const PART=SRC.slice(a,b);

function env(){
  const H={};const ctx={URL,location:{href:"https://raysonchen2023-cloud.github.io/xiangqi-lab/#/starter",origin:"https://raysonchen2023-cloud.github.io",pathname:"/xiangqi-lab/"},
    addEventListener:(ty,fn,cap)=>{(H[ty]=H[ty]||[]).push([fn,cap])}};
  vm.createContext(ctx);vm.runInContext(PART,ctx);
  return {fire:t=>{for(const [fn] of H.error||[])fn({target:t})},H,ctx};
}
function svgImage(href){const A={href};return{tagName:"image",dataset:{},getAttribute:k=>A[k]??null,setAttribute:(k,v)=>{A[k]=v},A}}
function img(src){return{tagName:"IMG",dataset:{},src,currentSrc:src}}

test("監聽在捕獲階段（error 不冒泡，SVG <image> 的錯誤也要抓得到）",()=>{
  const E=env();assert.equal(E.H.error.length,1);assert.equal(E.H.error[0][1],true);
});
test("SVG <image> 的棋子、底圖載入失敗 → href 換成 CDN，只試一次",()=>{
  const E=env(),t=svgImage("data/pset/qin/rR.webp");
  E.fire(t);assert.equal(t.A.href,"https://xiangqi-cdn.pages.dev/data/pset/qin/rR.webp");assert.equal(t.dataset.cdnTry,"1");
  t.A.href="data/pset/qin/rR.webp";E.fire(t);assert.equal(t.A.href,"data/pset/qin/rR.webp","CDN 也失敗就不再換（不會無限重試）");
  const u=svgImage("data/pset/qin/board_fit.webp?v=3");E.fire(u);assert.equal(u.A.href,"https://xiangqi-cdn.pages.dev/data/pset/qin/board_fit.webp","?v= 不帶去 CDN");
});
test("SVG 用舊寫法 xlink:href 也接得住；不是 data/、engine/ 的圖不動",()=>{
  const E=env(),t={tagName:"image",dataset:{},A:{"xlink:href":"data/boards/qin.webp"}};t.getAttribute=k=>t.A[k]??null;t.setAttribute=(k,v)=>{t.A[k]=v};
  E.fire(t);assert.equal(t.A.href,"https://xiangqi-cdn.pages.dev/data/boards/qin.webp");
  const o=svgImage("icon-180.png");E.fire(o);assert.equal(o.A.href,"icon-180.png");assert.equal(o.dataset.cdnTry,undefined);
  const x=svgImage("https://example.com/data/a.webp");E.fire(x);assert.equal(x.A.href,"https://example.com/data/a.webp","別的網站的圖不動");
});
test("原本的 <img> 照舊換 src",()=>{
  const E=env(),t=img("https://raysonchen2023-cloud.github.io/xiangqi-lab/data/icons/qin/home.webp");
  E.fire(t);assert.equal(t.src,"https://xiangqi-cdn.pages.dev/data/icons/qin/home.webp");
});
