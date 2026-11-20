// W24（開發者 11/21）：同桌對弈雙方面對面，棋盤預設不自動轉向輪到的一方；設定裡仍可打開，⇅ 仍可手動翻。
// 用法：node --test xiangqi-lab/tools/test-pvp-faceoff-1121.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"../..");const P=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/09b-preload.js"),"utf8");
const body=P.slice(P.indexOf("function PvpGame(v){"));
test("同桌對弈預設不自動轉向（沒存過設定時為 false）",()=>{
  assert.match(body,/autoFlip=store\.get\("autoFlip",false\)/);
  assert.doesNotMatch(body,/autoFlip=store\.get\("autoFlip",true\)/);
});
test("轉向判斷：遠端座位照座位、同桌只有打開自動轉向才跟著輪到的一方",()=>{
  assert.match(body,/const isFlip=\(\)=>flipMan!=null\?flipMan:seat\?seat==="b":\(autoFlip&&st&&!st\.result\?st\.turn==="b":false\);/);
});
test("設定裡仍可打開自動轉向，⇅ 手動翻轉仍在",()=>{
  assert.match(body,/棋盤自動轉向輪到的一方/);
  assert.match(body,/\["flip","⇅","翻轉",/);
});
