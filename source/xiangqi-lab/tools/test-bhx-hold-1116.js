// 開發者選單（11/16，主工作階段轉）：序局還沒打完——① 手機返回鍵／瀏覽器上一頁「直接拿掉返回鍵不給按」：留在這盤、不跳提示；② 右上頭像點了沒反應。打完恢復。
//   m/07bh-blackhole.js bhxHold／popstate／click 攔截；08b 每次重畫叫 bhxHold(bhxLocked(st))
// 用法：node --test xiangqi-lab/tools/test-bhx-hold-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const BH=rd("xiangqi-db/m/07bh-blackhole.js");
const CUT=BH.slice(BH.indexOf("let BHX_HOLD=false;"),BH.indexOf("function bhxLocked(st){"));
/* 模擬瀏覽器歷史：同網址 pushState 不觸發 hashchange，back 只發 popstate */
function kit(hash){const H=[{url:"#/adventure",state:{d:0}},{url:hash,state:{d:1}}];let i=1;const L={};
  const location={get hash(){return H[i].url},get href(){return"x"+H[i].url}};
  const history={get state(){return H[i].state},pushState(s,t,u){H.splice(i+1);H.push({url:H[i].url,state:s});i++},replaceState(s){H[i]={url:H[i].url,state:s}},back(){if(i>0){i--;(L.popstate||[]).forEach(f=>f({}))}}};
  const ctx={location,history,addEventListener:(k,f)=>{(L[k]=L[k]||[]).push(f)}};vm.createContext(ctx);vm.runInContext(CUT+";this.hold=bhxHold;",ctx);
  return{ctx,H,L,at:()=>i,click(sel){let stop=false;const e={target:{closest:q=>q.split(",").includes(sel)?{}:null},stopPropagation(){stop=true},preventDefault(){}};(L.click||[]).forEach(f=>f(e));return stop}}}
test("序局鎖著：上一頁按幾次都留在這盤（網址不變、不換頁）；打完拿掉墊層，上一頁照常",()=>{
  const K=kit("#/journey/play/bhx");K.ctx.hold(true);assert.equal(K.H.length,3);assert.ok(K.ctx.history.state.bhxHold);
  K.ctx.hold(true);assert.equal(K.H.length,3,"每次重畫不會一直墊");
  for(let n=0;n<4;n++){K.ctx.history.back();assert.equal(K.ctx.location.hash,"#/journey/play/bhx");assert.ok(K.ctx.history.state.bhxHold,"又墊回去")}
  K.ctx.hold(false);assert.ok(!K.ctx.history.state.bhxHold,"打完：標記拿掉");assert.equal(K.ctx.history.state.d,1,"d 保留");
  K.ctx.history.back();K.ctx.history.back();assert.equal(K.ctx.location.hash,"#/adventure","打完以後退得回去");
});
test("卡片疊在上面：返回照樣關卡片、不重墊；別的頁、沒鎖都不墊",()=>{
  const K=kit("#/journey/play/bhx");K.ctx.hold(true);K.ctx.history.pushState({xqSheet:1,d:2},"");K.ctx.hold(true);assert.equal(K.H.length,4,"開著卡片時重畫不墊");
  K.ctx.history.back();assert.ok(K.ctx.history.state.bhxHold);assert.equal(K.H.length,4,"關卡片落回墊層，不再多墊");
  const K2=kit("#/journey/play/x");K2.ctx.hold(false);assert.equal(K2.H.length,2);K2.ctx.history.back();assert.equal(K2.ctx.location.hash,"#/adventure");
  const K3=kit("#/cpu");K3.ctx.hold(true);assert.equal(K3.H.length,2,"不是對局頁不墊");
});
test("右上頭像：序局鎖著點了沒反應（#meChip、#dglLoc），其他按鈕不管；打完恢復",()=>{
  const K=kit("#/journey/play/bhx");K.ctx.hold(true);assert.equal(K.click("#meChip"),true);assert.equal(K.click("#dglLoc"),true);assert.equal(K.click("#other"),false);
  K.ctx.hold(false);assert.equal(K.click("#meChip"),false);
});
test("08b 每次重畫都問 bhxHold(bhxLocked(st))；07bh 不碰 hashchange／02-shell",()=>{
  assert.ok(rd("xiangqi-db/m/08b-cpugame.js").includes('try{if(typeof bhxHold==="function")bhxHold(typeof bhxLocked==="function"&&bhxLocked(st))}catch(e){}'));
  assert.ok(!/hashchange/.test(CUT));assert.ok(BH.includes("let BHX_W=0;\nfunction bhxGuard"),"test-story0 要的順序不動");
});
