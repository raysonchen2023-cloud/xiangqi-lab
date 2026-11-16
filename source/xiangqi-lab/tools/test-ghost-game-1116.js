// 開發者 11/16「這邊怎麼有人在下棋...請修正」（觀戰頁：兩位雲遊棋客都寫「對方暫時離線」、時鐘還在跑）＋選單「四項都做」
//   成因：大廳角色程式關掉時沒下完的盤留在伺服器（保留訊息），這支手機以前看過、cur 沒清，從首頁石桌進 #/pvp 又被叫回來。
//   A net.js ghost()／ghTick；B local.js 鬼局停錶；C 09b 觀戰名牌寫「離線」、狀態列「這盤已中斷」、第一次問回大廳；D 07z 首頁石桌先放掉舊觀戰
// 用法：node --test xiangqi-lab/tools/test-ghost-game-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const NET=rd("xiangqi-lab/src/net.js");
const CUT=NET.slice(NET.indexOf("  let ghAt=0,ghWas=false;"),NET.indexOf("  function staleCheck(){"));
function kit(o){const c={cur:{gid:"g1"},G:{gid:"g1",result:null,red:{id:"R"},black:{id:"B"},tk:0,at:0},seat:null,up:true,upAt:0,on:{},now:0,ev:0,...o};
  const ctx={Date:{now:()=>c.now},side:()=>c.seat,onl:id=>!!c.on[id],emit:()=>{c.ev++}};vm.createContext(ctx);
  vm.runInContext("var cur,G,cli,upAt;"+CUT+";this.ghost=ghost;this.ghTick=ghTick;",ctx);
  const sync=()=>{ctx.cur=c.cur;ctx.G=c.G;ctx.cli={up:c.up};ctx.upAt=c.upAt};sync();return{c,ctx,sync}}
const MIN=60000;
test("鬼局：觀眾、沒結果、兩位都離線，最後一步超過 10 分鐘＝中斷；剛連上 15 秒內不判",()=>{
  const K=kit({now:30*MIN,G:{gid:"g1",result:null,red:{id:"R"},black:{id:"B"},tk:5*MIN}});
  assert.equal(K.ctx.ghost(),true);
  K.c.upAt=30*MIN-5000;K.sync();assert.equal(K.ctx.ghost(),false,"剛連上，名單還沒到齊");
});
test("不算鬼局：有一位棋手在線、我是棋手、已經有結果、最後一步才 2 分鐘",()=>{
  const base={now:30*MIN,G:{gid:"g1",result:null,red:{id:"R"},black:{id:"B"},tk:5*MIN}};
  assert.equal(kit({...base,on:{R:true}}).ctx.ghost(),false);
  assert.equal(kit({...base,seat:"r"}).ctx.ghost(),false,"自己在下：交給 staleCheck／timeoutCheck");
  assert.equal(kit({...base,G:{...base.G,result:{w:"r"}}}).ctx.ghost(),false);
  assert.equal(kit({...base,G:{...base.G,tk:28*MIN}}).ctx.ghost(),false);
});
test("看著兩邊都離線滿 10 分鐘也算（tk 被對方手機時鐘弄亂時的後備）；狀態一變才 emit 一次",()=>{
  const K=kit({now:30*MIN,G:{gid:"g1",result:null,red:{id:"R"},black:{id:"B"},tk:30*MIN}});
  K.ctx.ghTick();assert.equal(K.c.ev,0);
  K.c.now=41*MIN;K.ctx.ghTick();assert.equal(K.c.ev,1);K.ctx.ghTick();assert.equal(K.c.ev,1,"沒變不再 emit");
  K.c.on.B=true;K.ctx.ghTick();assert.equal(K.c.ev,2,"有人回來：解除");
});
test("接線：2 秒計時器跑 ghTick、對外 XQNet.ghost；local 停錶；09b 名牌、狀態列、回大廳；07z 首頁石桌先放掉舊觀戰",()=>{
  assert.ok(NET.includes("timeoutCheck();ghTick();syncRoster();"));assert.ok(NET.includes("    ghost:()=>ghost(),"));
  assert.ok(rd("xiangqi-lab/src/local.js").includes("running:!!g.clk&&!g.result&&!(XQNet.ghost&&XQNet.ghost()),ghost:!!(XQNet.ghost&&XQNet.ghost()),"));
  const P=rd("xiangqi-db/m/09b-preload.js");
  assert.ok(P.includes('NET&&seat==="w"?PLAYER[x]+((st.online||{})[x]?"・🟢 線上":"・⚪ 離線")'),"觀戰：不寫「對方」");
  assert.ok(P.includes('"⏸ 這盤已中斷（兩位棋手都離線）"'));assert.ok(P.includes('confirmBox("這盤已中斷（兩位棋手都離線）",()=>{try{XQNet.leave()}catch(e){}location.hash="#/lobby"},"回大廳")'));
  assert.ok(rd("xiangqi-db/m/07z-homemap.js").includes('try{if(window.XQNet&&XQNet.active&&XQNet.active()&&!XQNet.playing())XQNet.leave()}catch(e){}location.hash="#/pvp"'));
});
