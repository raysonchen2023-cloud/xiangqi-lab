// 第 10 輪加做（第 9 輪 Gemini 改善單）：效能浮標 xiangqi-db/m/07dw-perfhud.js＋開場電影按鈕放大
// 行為測試：在模擬環境載入浮標模組，手動餵畫格時間，檢查顯示的幀數、10 秒最低幀數、3D 省電狀態、沒有記憶體資訊時的文字、開關。
// 用法：node --test xiangqi-lab/tools/test-perfhud.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const DB=path.join(__dirname,"..","..","xiangqi-db"),rd=f=>fs.readFileSync(path.join(DB,f),"utf8").replace(/\r\n/g,"\n");
const SRC=rd("m/07dw-perfhud.js");

function env(o){o=o||{};const ls=new Map(Object.entries(o.ls||{})),els=[];let now=0,rafCb=null,iv=null;
  const ctx={console,Math,JSON,Date,String,
    store:{get:(k,d)=>ls.has(k)?ls.get(k):d,set:(k,v)=>ls.set(k,v)},DEVMODE:()=>!!o.dev,
    performance:{now:()=>now,...(o.memory?{memory:o.memory}:{})},location:{hash:"#/ship"},
    requestAnimationFrame:f=>{rafCb=f;return 1},cancelAnimationFrame:()=>{rafCb=null},
    setInterval:f=>{iv=f;return 7},clearInterval:()=>{iv=null},setTimeout:()=>0,
    document:{hidden:false,addEventListener(){},body:{append:e=>els.push(e)},createElement:()=>{const e={style:{},attrs:{},setAttribute(k,v){this.attrs[k]=v},remove(){const i=els.indexOf(e);if(i>=0)els.splice(i,1)},textContent:""};return e}},
    window:{}};
  if(o.pk)ctx.window.__PK={perf:o.pk};
  vm.createContext(ctx);vm.runInContext(SRC,ctx,{filename:"07dw-perfhud.js"});
  /* 餵畫格：從現在起 ms 毫秒內每 1000/fps 毫秒一格 */
  const feed=(fps,ms)=>{const step=1000/fps,end=now+ms;while(now+step<=end+1e-6){now+=step;if(rafCb){const f=rafCb;rafCb=null;f(now)}}now=end};
  return{ctx,els,feed,text:()=>{iv&&iv();return els[0]&&els[0].textContent}}}

test("一般玩家（沒開開發者模式）：就算存了開關也不出現",()=>{
  const E=env({dev:false,ls:{perfHud:true}});E.ctx.phudStart();assert.equal(E.els.length,0)});
test("開發者模式＋打開：右上角一個不擋點選、避開瀏海的小框；整頁 60 fps",()=>{
  const E=env({dev:true,ls:{perfHud:true}});E.ctx.phudStart();assert.equal(E.els.length,1);
  const st=E.els[0].style.cssText;assert.match(st,/pointer-events:none/);assert.match(st,/env\(safe-area-inset-top/);assert.equal(E.els[0].attrs["aria-hidden"],"true");
  E.feed(60,2000);assert.match(E.text(),/^頁面 60 fps/)});
test("10 秒最低幀數：中間有一秒掉到 20 幀，要顯示最低 20",()=>{
  const E=env({dev:true,ls:{perfHud:true}});E.ctx.phudStart();E.feed(60,3000);E.feed(20,1000);E.feed(60,3000);
  const t=E.text();assert.match(t,/頁面 6[01] fps/,"畫格時間是浮點累加，邊界差 1 幀");assert.match(t,/10 秒最低 20）/)});
test("3D：顯示 3D 幀數、省電模式開關和原因、畫素比、抗鋸齒；3D 沒在畫時照實說",()=>{
  const E=env({dev:true,ls:{perfHud:true},pk:{live:true,fps:31,power:true,why:["低幀數"],pr:1.5,aa:false}});E.ctx.phudStart();E.feed(30,1500);
  assert.match(E.text(),/3D 31 fps・省電開（低幀數）・畫素比 1\.50/);
  const F=env({dev:true,ls:{perfHud:true},pk:{live:false}});F.ctx.phudStart();F.feed(60,1100);assert.match(F.text(),/3D 沒在畫/)});
test("記憶體：Chrome 有 performance.memory 就顯示 MB；iPhone Safari 沒有就寫不提供（不亂猜）",()=>{
  const E=env({dev:true,ls:{perfHud:true},memory:{usedJSHeapSize:150*1048576,jsHeapSizeLimit:4096*1048576}});E.ctx.phudStart();E.feed(60,1100);assert.match(E.text(),/JS 記憶體 150／4096 MB/);
  const F=env({dev:true,ls:{perfHud:true}});F.ctx.phudStart();F.feed(60,1100);assert.match(F.text(),/JS 記憶體：這個瀏覽器不提供/)});
test("時鐘到 0.1 秒、目前頁面；開關關掉就移除",()=>{
  const E=env({dev:true,ls:{perfHud:true}});E.ctx.phudStart();E.feed(60,1100);assert.match(E.text(),/\d\d:\d\d:\d\d\.\d・#\/ship/);
  assert.equal(E.ctx.phudToggle(),false);assert.equal(E.els.length,0);assert.equal(E.ctx.phudToggle(),true);assert.equal(E.els.length,1)});
test("〔原始碼〕開發者測試台有「效能浮標」開關；m.html 有引入",()=>{
  const D=rd("m/07dv-devtest.js");assert.ok(D.includes('row("dvP"'));assert.ok(D.includes('q("#dvP").onclick=()=>{const on=typeof phudToggle==="function"&&phudToggle();'));
  assert.ok(rd("m.html").includes("//#include m/07dw-perfhud.js"))});
test("〔原始碼〕開場電影「略過」至少 44×44、「下一個鏡頭」52×52，兩顆都有鍵盤焦點外框（第 9 輪 Gemini：過場按鈕太小）",()=>{
  const B=rd("m/07bh-blackhole.js");
  assert.match(B,/\.bx-k\{[^}]*min-width:64px;min-height:44px;/);assert.match(B,/\.fm-nx\{[^}]*width:52px;height:52px;/);
  assert.ok(B.includes(".bx-k:focus-visible,.fm-nx:focus-visible{outline:3px solid #E8C77A;"));
  assert.ok(B.includes('<button class="fm-nx" type="button" aria-label="下一個鏡頭">'),"▶ 有螢幕報讀名稱")});
