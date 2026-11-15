// 11/16 開發者「玩家看不懂閃電的意思」（黑洞選關「其他玩法」的星淵急襲卡）：原本「⚡ 贏的次數」，改成「贏 N 次」／「還沒打過」。不開瀏覽器。
// 用法：node --test xiangqi-lab/tools/test-raid-label-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const SRC=fs.readFileSync(path.join(__dirname,"../../xiangqi-db/m/07bht-td.js"),"utf8").replace(/\r\n/g,"\n");

test("急襲卡的戰績寫字，不再只放一個閃電加數字", ()=>{
  const m=SRC.match(/<small class="ok" aria-hidden="true">\$\{(rdOk\?[^}]*\}[^}]*)\}<\/small><\/button>`\};/);assert.ok(m,"找得到急襲卡的戰績那一格");
  const f=(rdOk,D)=>Function("rdOk","D","return "+m[1])(rdOk,D);
  assert.equal(f(true,{r:{n:0,w:0}}),"還沒打過");assert.equal(f(true,{r:{n:3,w:2}}),"贏 2 次");assert.equal(f(true,{r:{n:2,w:0}}),"贏 0 次");assert.equal(f(false,{r:{n:0,w:0}}),"🔒 未解鎖");
  assert.ok(!SRC.includes('"⚡ "+D.r.w'),"拿掉閃電加數字");
});
