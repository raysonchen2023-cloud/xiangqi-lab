// P0（開發者 11/16）：「開新的旅程按跳過也會一樣跑到後園，而不是開頭黑洞對戰」——開新旅程到一半網頁被重新載入（電影途中、略過後還沒按入局），開機掉回舊旅程。
//   修：07bh bhxResume（開機接回）＋05b saveBoot 在不是 xqPrologue 的路上先問它。
// 用法：node --test xiangqi-lab/tools/test-bhx-resume-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const BH=rd("xiangqi-db/m/07bh-blackhole.js"),SV=rd("xiangqi-db/m/05b-save.js");
const RES=BH.slice(BH.indexOf("function bhxResume(){"),BH.indexOf("function bhxLandNew(){"));
function res(st,play){const S=new Map(Object.entries(st)),L=[];const ctx={store:{get:(k,d)=>S.has(k)?S.get(k):d,set:(k,v)=>S.set(k,v)},localStorage:{getItem:k=>k==="xq_play"&&play?JSON.stringify(play):null},
  BHX_ID:"bh:xu",bhxBack:v=>L.push("back:"+v),bhxIntro:()=>L.push("intro"),bhxAfter:()=>L.push("after"),opPre:()=>{},setTimeout:f=>f()};vm.createContext(ctx);vm.runInContext(RES+";this.r=bhxResume();",ctx);return{r:ctx.r,L}}
test("開新旅程到一半重新載入（電影途中、邀局卡）：蓋黑洞底、接回邀局卡（不重播電影）",()=>{
  const a=res({bhxFresh:1,bhxLand:null},{id:"x",journey:null,moves:[],result:null});assert.equal(a.r,true);assert.deepEqual(a.L,["back:true","intro"]);
  assert.deepEqual(res({bhxFresh:1},null).L,["back:true","intro"],"桌上沒有棋也接回");
});
test("正在下序局時重新載入：不接回（對局頁自己接）；序局下完還沒建旅程：接「星盤暫合」",()=>{
  const a=res({bhxFresh:1},{id:"x",journey:"bh:xu",moves:[],result:null});assert.equal(a.r,false);assert.deepEqual(a.L,[]);
  assert.deepEqual(res({bhxFresh:1},{id:"x",journey:"bh:xu",moves:[[22,13]],result:{w:"r"}}).L,["back:true","after"]);
});
test("已落地（bhxLand）、沒在開新旅程：不接回；05b saveBoot 只在不是 xqPrologue（journeyStart 重開）的路上問 bhxResume",()=>{
  assert.equal(res({bhxFresh:1,bhxLand:123},null).r,false);assert.equal(res({bhxFresh:0},null).r,false);
  const fn=SV.slice(SV.indexOf("function saveBoot(){"),SV.indexOf("\nsetTimeout(()=>{try{saveBoot()}"));
  const run=pro=>{const L=[];const ctx={SAVE_OLD:null,store:{get:(k,d)=>d,set(){}},lockFix(){},CHAR_ERA:{},applyEra(){},sessionStorage:{getItem:k=>k==="xqPrologue"&&pro?"1":null,removeItem(){}},
      bhxNeed:()=>false,bhxBack(){},bhxLandNew:()=>{L.push("land");return true},prologue(){},bhxResume:()=>{L.push("resume");return true},titleScreen:()=>L.push("title"),navigator:{},location:{hash:""},setTimeout:f=>f()};
    vm.createContext(ctx);vm.runInContext(fn+";saveBoot();",ctx);return L};
  {const p=run(true);assert.ok(p.includes("land")&&!p.includes("resume"),"journeyStart 重開：走降落，不被接回攔到："+p)}assert.deepEqual(run(false),["resume"],"一般開機：先問接回，接回了就不出開頭畫面");
});
