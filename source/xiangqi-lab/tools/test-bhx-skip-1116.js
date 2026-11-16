// P0（開發者 11/16）：「我開新的旅程 接到最後一手黑洞第一場，會跑到園子下棋」「覆蓋後新的旅程的角色一開始不是齊角，而是駱角，存檔讀檔開新的旅程都亂掉了」
//   根因（主工作階段查到）：bhxPick 只在序章電影流星裡才記，按「略過」或減少動態就沒記 → bhxAfter 走 prologue()、舊旅程原封不動。
//   修：07bh bhxAfter 按「循著茶香」時，開新旅程（bhxFresh）又還沒記角色就先記齊轍。
// 用法：node --test xiangqi-lab/tools/test-bhx-skip-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");const BH=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07bh-blackhole.js"),"utf8");
const CUT=BH.slice(BH.indexOf("function bhxAfter(){"),BH.indexOf("\n/* 星渦裡的七顆紅星"));
function run(o){const S=new Map(Object.entries(o.store||{})),L={js:[],pro:0,back:[],hash:null,film:0};let btns=null;
  const ctx={store:{get:(k,d)=>S.has(k)?S.get(k):d,set:(k,v)=>S.set(k,v)},MODAL_HOLD:0,BHX_TXT:{win:"贏"},esc:x=>x,
    modal:(h,b)=>{btns=b},opVol(){},opPlay(){},opStop(){},bhxEnd(){},toast(){},applyEra(){},shipEra(){},
    journey:()=>!!o.journey,bhxBack:v=>L.back.push(v),location:{set hash(h){L.hash=h},get hash(){return L.hash}},
    matchMedia:()=>({matches:!!o.reduce}),setTimeout:f=>f(),OP_FILM2:{},
    bhxFilm:(F,done)=>{L.film++;done()},bhxPages:(K,done)=>{L.film++;done()},
    journeyStart:(n,c,nm,df)=>{L.js.push([n,c,df]);return Promise.resolve()},myName:()=>"舊名",defaultName:()=>"預設",prologue:()=>{L.pro++}};
  vm.createContext(ctx);vm.runInContext(CUT+";bhxAfter();",ctx);btns[0][1]();return{L,S}}
test("開新旅程、按「略過」跳過序章電影（bhxPick 沒記）：照樣建新旅程（齊轍、存進選的那一格），不走舊旅程的序幕",()=>{
  const{L,S}=run({journey:true,store:{bhxFresh:1,bhxSlot:2,bhxPick:null,bhXuOld:0}});
  assert.deepEqual(L.js,[[2,"x_swordboy",2]]);assert.equal(L.pro,0,"不走 prologue（舊角色開場卡）");
  assert.equal(S.get("bhxPick"),"x_swordboy","bhxLandNew 要看它才降落星槎");assert.ok(!L.back.includes(false),"底幕留著直接重開，不閃出舊主場");assert.equal(L.hash,"#/adventure");
});
test("減少動態（走 bhxPages）一樣建新旅程；空白格（還沒有旅程）也一樣",()=>{
  assert.deepEqual(run({journey:true,reduce:true,store:{bhxFresh:1,bhxSlot:3,bhxPick:null}}).L.js,[[3,"x_swordboy",2]]);
  assert.deepEqual(run({journey:false,store:{bhxFresh:1,bhxSlot:1,bhxPick:null}}).L.js,[[1,"x_swordboy",2]]);
  const nw=run({journey:false,store:{bhxPick:null}});assert.deepEqual(nw.L.js,[[1,"x_swordboy",2]],"全新玩家（開頭畫面直接進序局、沒有 bhxFresh）略過也建");assert.equal(nw.L.pro,0);
});
test("序局把 3D 打開（bhxGo 記下原本的 park3d），循著茶香時還原：沒設過＝回到預設（新手平面）、平面、3D 各回原樣；沒打完再開一次不覆蓋",()=>{
  const a=run({journey:true,store:{bhxFresh:1,bhxSlot:2,bhxPick:null,park3d:true,bhxP3:{v:null}}});assert.equal(a.S.get("park3d"),null);assert.equal(a.S.get("bhxP3"),null);
  assert.equal(run({journey:true,store:{bhXuOld:1,park3d:true,bhxP3:{v:false}}}).S.get("park3d"),false,"舊玩家只看序章也還原");
  assert.equal(run({journey:true,store:{bhxFresh:1,bhxPick:null,park3d:true,bhxP3:{v:true}}}).S.get("park3d"),true);
  const G=BH.slice(BH.indexOf("function bhxGo(){"),BH.indexOf("\nconst BHX_CAM")),S=new Map([["park3d",false]]);
  const ctx={store:{get:(k,d)=>S.has(k)?S.get(k):d,set:(k,v)=>S.set(k,v)},opPlay(){},jStart(){},BHX_ID:"bh:xu",BHX_FEN:"",BHX_W:0};vm.createContext(ctx);vm.runInContext("var BHX_W=0;"+G+";bhxGo();",ctx);
  assert.equal(S.get("bhxP3").v,false);assert.equal(S.get("park3d"),true);vm.runInContext("bhxGo();",ctx);assert.equal(S.get("bhxP3").v,false,"再開一次不覆蓋成 true");
});
test("沒略過（電影裡記了 bhxPick）照舊；舊玩家只看序章（bhXuOld）、沒開新旅程都不建、不記角色",()=>{
  assert.deepEqual(run({journey:true,store:{bhxFresh:1,bhxSlot:2,bhxPick:"x_swordboy"}}).L.js,[[2,"x_swordboy",2]]);
  const o=run({journey:true,store:{bhxFresh:1,bhxSlot:2,bhxPick:null,bhXuOld:1}});assert.equal(o.L.js.length,0);assert.equal(o.S.get("bhxPick"),null);assert.equal(o.L.hash,"#/");
  const n=run({journey:true,store:{bhxFresh:0,bhxPick:null}});assert.equal(n.L.js.length,0);assert.equal(n.S.get("bhxPick"),null);
});
