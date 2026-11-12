// ChatGPT 數值盤查 11/11（第 15、16、17、37 行）＋十視角重評 v6「下一輪驗收順序」第 1 點的自動測試：
//   ① 同機限時局（src/local.js /pvp）：固定假時鐘測剩 +1／0／−1 ms；逾時不可落子、不可領加秒；落旗後提和、認輸、悔棋改不了結果；
//      悔棋恢復雙鐘快照 cs（快走拿加秒→悔棋→重走，可用時間不增加）；存檔重開（tick＝null）後結果、雙鐘、著數不變，續局第一手不扣時不加秒。
//   ② 線上對局（src/net.js XQNet.tickMove）：同樣的 +1／0／−1 ms 邊界、先判逾時再加秒；再經 local.js netPvp 走一次（逾時那手不會被推進棋譜）。
//   ③ 引擎空結果（site/core.js classifyRaw，抄自 xiangqi-referee.js）：非終局卻沒有 PV＝丟 e.retry、不能回「正著 loss＝0」；紅黑兩邊、最佳著、重試成功、終局（將死）；
//      local.js analyzeList 遇到 retry 跳過這步（保持未評），之後重跑補上。
//   ④ 賽後講解（xiangqi-db/m/05-settings.js talk）：普通分 +1950、實走 +1450、損失 500 不會說「錯過殺棋」；真的有殺棋訊號才說。
// 全部用 vm 載入 App 裡真正的程式，只替換時鐘、計時器、localStorage、IndexedDB、Pikafish 這些外部依賴。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const LAB=path.join(__dirname,"..");
const CORE_SRC=fs.readFileSync(path.join(LAB,"site/core.js"),"utf8");
const LOCAL_SRC=fs.readFileSync(path.join(LAB,"src/local.js"),"utf8");
const NET_SRC=fs.readFileSync(path.join(LAB,"src/net.js"),"utf8");
const SET_SRC=fs.readFileSync(path.join(LAB,"../xiangqi-db/m/05-settings.js"),"utf8").replace(/\r\n/g,"\n");
const C=require("../site/core.js");
const sq=C.parseSq,M=u=>({f:sq(u.slice(0,2)),t:sq(u.slice(2,4))}),MIN10=600000;
const J=x=>JSON.parse(JSON.stringify(x));   // vm 裡的物件原型跟這裡不同，比內容前先轉成這邊的物件

// ---------- 假的外部依賴 ----------
function memStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v))},removeItem:k=>{m.delete(k)},map:m}}
function fakeIDB(){const data=new Map(),later=f=>setImmediate(()=>setImmediate(f));
  return{data,open(){const r={};setImmediate(()=>{r.result={transaction(){const t={},store={
    get(k){const q={result:data.get(k)};setImmediate(()=>q.onsuccess&&q.onsuccess());return q},put(v,k){data.set(k,v);return{}},delete(k){data.delete(k);return{}}};
    t.objectStore=()=>store;later(()=>t.oncomplete&&t.oncomplete());return t}};r.onsuccess&&r.onsuccess()});return r}}}
// 一個 vm 環境＝一支手機：自己的 window／localStorage／IndexedDB；時鐘 clock.now 固定，由測試推進；setTimeout／setInterval 只記下來，不自己跑
function phone(clock,o={}){
  const timers=[],intervals=[];
  const ctx={console,URL,URLSearchParams,setImmediate,clock,
    setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},
    setInterval:(fn,ms)=>{intervals.push({fn,ms});return intervals.length},clearInterval(){},
    localStorage:o.storage||memStorage(),indexedDB:o.idb||fakeIDB(),
    location:{href:"http://localhost/",hash:"",pathname:"/",search:""},history:{replaceState(){}},navigator:{onLine:true},
    Event:class{constructor(t){this.type=t}},CustomEvent:class{constructor(t,d){this.type=t;this.detail=d&&d.detail}},
    addEventListener(){},removeEventListener(){},dispatchEvent(){return true},document:{hidden:false,addEventListener(){}},
    atob:s=>Buffer.from(s,"base64").toString("binary"),
    XQEngine:{ready:true,search:async(...a)=>{if(!ctx.engine)throw new Error("測試沒有準備引擎");return ctx.engine(...a)}}};
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext("Date.now=()=>clock.now;",ctx);
  vm.runInContext(CORE_SRC,ctx,{filename:"core.js"});
  return{ctx,timers,intervals,storage:ctx.localStorage,idb:ctx.indexedDB};
}
function loadLocal(clock,o){const P=phone(clock,o);vm.runInContext(LOCAL_SRC,P.ctx,{filename:"local.js"});
  P.api=(u,b)=>P.ctx.XQ.api(u,b);
  P.tryApi=async(u,b)=>{try{return await P.api(u,b)}catch(e){return{err:e.message}}};
  P.state=()=>P.api("/pvp/state");
  P.tick=()=>P.intervals.find(x=>x.fn.name==="pvpClock").fn();   // 模擬每 250 ms 的棋鐘檢查跑了一次
  P.analyze=async()=>{const t=P.timers.find(x=>x.fn.name==="analyzePvp");P.timers.length=0;assert.ok(t,"落子後要排背景評等");await t.fn()};
  return P}
function loadNet(clock,o){const P=phone(clock,o);vm.runInContext(NET_SRC,P.ctx,{filename:"net.js"});P.net=P.ctx.XQNet;return P}

// 開一盤 10＋5 的同機限時局：紅方第一手（不計時）在 T0 走 h2e2，黑方的鐘從 T0 開始走
async function timedGame(){const clock={now:Date.UTC(2026,10,11,8,0,0)},P=loadLocal(clock);
  await P.api("/pvp/new",{tc:"10+5"});const s=await P.api("/pvp/move",M("h2e2"));
  assert.equal(s.moves.length,1);assert.equal(s.running,true);assert.deepEqual({...s.clocks},{r:MIN10,b:MIN10},"第一手不扣時也不加秒");
  return{clock,P}}
// 再讓黑方用 1 秒走 h7e7（拿 5 秒加秒），輪到紅方，紅方的鐘從這一刻開始走
async function redToMove(){const g=await timedGame();g.clock.now+=1000;const s=await g.P.api("/pvp/move",M("h7e7"));
  assert.deepEqual({...s.clocks},{r:MIN10,b:MIN10-1000+5000});return g}

// ====================== ① 同機限時局 ======================
test("同機棋鐘：黑方剩 +1 ms 落子＝及時，這手算數、拿到 5 秒加秒",async()=>{
  const{clock,P}=await timedGame();clock.now+=MIN10-1;
  const s=await P.api("/pvp/move",M("h7e7"));
  assert.equal(s.result,null);assert.equal(s.moves.length,2);assert.equal(s.clocks.b,1+5000);assert.equal(s.clocks.r,MIN10);assert.equal(s.turn,"r");
});
for(const left of[0,-1])test(`同機棋鐘：黑方剩 ${left} ms 落子＝已落旗，判超時負、著數不增、不加秒`,async()=>{
  const{clock,P}=await timedGame();clock.now+=MIN10-left;
  const s=await P.api("/pvp/move",M("h7e7"));
  assert.ok(s.result,"要分出結果");assert.equal(s.result.w,"r");assert.match(s.result.why,/黑方超時判負/);
  assert.equal(s.moves.length,1,"逾時那手不能落子");assert.equal(s.clocks.b,0,"鐘停在 0，不能領加秒");assert.equal(s.clocks.r,MIN10);assert.equal(s.running,false);
  assert.match((await P.tryApi("/pvp/move",M("h7e7"))).err||"",/已經結束/,"之後再落子也不行");
});
for(const left of[1,0,-1])test(`同機棋鐘：紅方（第二次輪到）剩 ${left} ms 落子`,async()=>{
  const{clock,P}=await redToMove();clock.now+=MIN10-left;
  const s=await P.api("/pvp/move",M("h0g2"));
  if(left>0){assert.equal(s.result,null);assert.equal(s.moves.length,3);assert.equal(s.clocks.r,left+5000)}
  else{assert.equal(s.result.w,"b");assert.match(s.result.why,/紅方超時判負/);assert.equal(s.moves.length,2);assert.equal(s.clocks.r,0);assert.equal(s.clocks.b,MIN10+4000)}
});
test("同機棋鐘：每 250 ms 的檢查、讀狀態也用同一條界線（+1 ms 還在走，0 ms 落旗）",async()=>{
  const{clock,P}=await timedGame();clock.now+=MIN10-1;P.tick();
  let s=await P.state();assert.equal(s.result,null);assert.equal(s.clocks.b,1);
  clock.now+=1;P.tick();s=await P.state();assert.equal(s.result.w,"r");assert.equal(s.clocks.b,0);assert.equal(s.moves.length,1);
  const{clock:c2,P:P2}=await timedGame();c2.now+=MIN10+1;s=await P2.state();   // 計時器被暫停（App 在背景），回來第一次讀狀態就判
  assert.equal(s.result.w,"r");assert.equal(s.clocks.b,0);
});
for(const left of[0,-1])test(`同機棋鐘：落旗（剩 ${left} ms）還沒被偵測到時按認輸、同意和棋、悔棋，結果都是超時判負`,async()=>{
  for(const act of["resign","draw","undo"]){
    const{clock,P}=await timedGame();
    if(act==="draw"){await P.api("/pvp/draw",{side:"r"})}   // 紅方先提和，黑方落旗那一刻才按同意
    clock.now+=MIN10-left;
    const r=await P.tryApi("/pvp/"+act,{side:act==="resign"?"r":"b"});
    const s=await P.state();
    assert.ok(s.result,act+"：要有結果");assert.equal(s.result.w,"r",act);assert.match(s.result.why,/黑方超時判負/,act+" 不能改掉超時");
    assert.equal(s.moves.length,1,act+"：悔棋不能救回");assert.equal(s.clocks.b,0,act);assert.equal(s.draw,null,act);
    void r;
  }
});
test("同機棋鐘：已經判超時後再認輸、提和、悔棋、落子，結果不變",async()=>{
  const{clock,P}=await timedGame();clock.now+=MIN10;P.tick();
  const before=JSON.stringify(await P.state());
  await P.tryApi("/pvp/resign",{side:"r"});await P.tryApi("/pvp/resign",{side:"b"});
  await P.tryApi("/pvp/draw",{side:"r"});await P.tryApi("/pvp/draw",{side:"b"});
  assert.match((await P.tryApi("/pvp/undo",{})).err||"",/已經結束/);assert.match((await P.tryApi("/pvp/move",M("h7e7"))).err||"",/已經結束/);
  clock.now+=3600000;assert.equal(JSON.stringify(await P.state()),before);
});
test("同機悔棋：快走拿加秒→悔棋→重走，可用時間不會變多（雙鐘快照 cs）",async()=>{
  const{clock,P}=await redToMove();               // 紅 600000、黑 604000，紅方的鐘在走
  clock.now+=3000;let s=await P.api("/pvp/move",M("h0g2"));
  const once=s.clocks.r;assert.equal(once,MIN10-3000+5000);       // 只走一次這手：紅方剩 602000
  clock.now+=4000;s=await P.api("/pvp/undo",{});
  assert.equal(s.moves.length,2);assert.equal(s.turn,"r");
  assert.deepEqual({...s.clocks},{r:MIN10-3000,b:MIN10+4000},"回到那一手之前：不保留那手的加秒；走那手到按悔棋之間的 4 秒不算任何一方");
  for(let k=1;k<=4;k++){
    clock.now+=1;s=await P.api("/pvp/move",M("h0g2"));
    assert.ok(s.clocks.r<=once,`第 ${k} 次重走：紅方可用時間 ${s.clocks.r} 不能比只走一次（${once}）多`);
    assert.equal(s.clocks.b,MIN10+4000,"黑方的鐘不受影響");
    clock.now+=1;s=await P.api("/pvp/undo",{});assert.ok(s.clocks.r<=MIN10-3000,"悔棋後紅方不能比那手之前多");
  }
  clock.now+=1;await P.api("/pvp/undo",{});clock.now+=1;s=await P.api("/pvp/undo",{});   // 悔到一手都不剩：鐘停、下一手（紅方開局）又不計時
  assert.equal(s.moves.length,0);assert.equal(s.running,false);assert.deepEqual({...s.clocks},{r:MIN10,b:MIN10});
});
test("同機重開：進行中的棋局存檔讀回後（tick＝null），著數、雙鐘、結果不變；鐘先停；續局第一手不扣時不加秒，走完才開始計時",async()=>{
  const{clock,P}=await redToMove();clock.now+=3000;await P.api("/pvp/move",M("h0g2"));   // 紅 602000、黑 604000，輪到黑
  const before=await P.state();assert.equal(before.turn,"b");assert.equal(before.running,true);
  const A=loadLocal(clock,{storage:P.storage});   // App 重開：新的程式、同一份 localStorage
  let s=await A.state();
  assert.equal(s.id,before.id);assert.equal(s.moves.length,3);assert.equal(s.result,null);assert.equal(s.turn,"b");
  assert.deepEqual({...s.clocks},{...before.clocks});assert.equal(s.running,false,"重開後鐘先停");
  clock.now+=3600000;A.tick();s=await A.state();
  assert.deepEqual({...s.clocks},{...before.clocks},"鐘停著：過一小時也不扣、不落旗");assert.equal(s.result,null);
  s=await A.api("/pvp/move",M("h9g7"));
  assert.equal(s.moves.length,4);assert.equal(s.clocks.b,before.clocks.b,"續局第一手：不扣時、不加秒");assert.equal(s.running,true);
  clock.now+=2500;s=await A.state();assert.equal(s.clocks.r,before.clocks.r-2500,"走完才開始計時（輪到紅方）");
  clock.now+=1000;s=await A.api("/pvp/undo",{});   // 重開後悔棋照樣用存下來的快照
  assert.deepEqual({...s.clocks},{...before.clocks});assert.equal(s.moves.length,3);
});
test("同機重開：超時判負的棋局讀回後，結果、雙鐘、著數不變，也不能再落子或悔棋",async()=>{
  const{clock,P}=await timedGame();clock.now+=MIN10;const fin=await P.api("/pvp/move",M("h7e7"));
  assert.equal(fin.result.w,"r");
  const A=loadLocal(clock,{storage:P.storage});clock.now+=86400000;
  const s=await A.state();
  assert.deepEqual(J(s.result),J(fin.result));assert.deepEqual({...s.clocks},{r:MIN10,b:0});assert.equal(s.moves.length,1);assert.equal(s.running,false);
  assert.match((await A.tryApi("/pvp/move",M("h7e7"))).err||"",/已經結束/);assert.match((await A.tryApi("/pvp/undo",{})).err||"",/已經結束/);
  assert.deepEqual(J((await A.state()).result),J(fin.result));
});

// ====================== ② 線上對局 net.js tickMove ======================
const T0=Date.UTC(2026,10,11,9,0,0);
// 黑方要走（棋譜一手）、黑方鐘 left 毫秒、這手開始的時間 tk＝T0
const netG=(left,extra)=>({gid:"g1",id:"2026-11-11T09-00-00",rules:C.REP_RULES.id,rev:3,red:{id:"R",name:"紅"},black:{id:"B",name:"黑"},
  moves:[[sq("h2"),sq("e2")]],result:null,draw:null,at:T0,tc:10,clk:{r:MIN10,b:left},tk:T0,tkN:1,...(extra||{})});
for(const inc of[0,5000])for(const left of[1,0,-1])test(`線上棋鐘 tickMove：剩 ${left} ms${inc?"、每步加 5 秒":""}`,()=>{
  const clock={now:T0},X=loadNet(clock).net,n=netG(60000,inc?{inc}:null);clock.now=T0+60000-left;
  const ok=X.tickMove(n,"b");
  if(left>0){assert.equal(ok,true);assert.equal(n.result,null);assert.equal(n.clk.b,left+inc,"及時：扣到剩 1 ms 再加秒");assert.equal(n.tk,clock.now);assert.equal(n.tkN,2);
    assert.equal(n.lft,left);assert.equal(n.lfN,2)}
  else{assert.equal(ok,false);assert.deepEqual({...n.result},{w:"r",timeout:true,why:"黑方時間用完，超時判負"});assert.equal(n.clk.b,0,"先判逾時：不加秒");
    assert.equal(n.moves.length,1);assert.equal(n.tk,T0);assert.equal(n.tkN,1);assert.equal(n.lft,undefined)}
});
test("線上棋鐘 tickMove：紅方同樣的邊界；沒有棋鐘的對局不判逾時",()=>{
  const clock={now:T0},X=loadNet(clock).net;
  const mk=()=>({...netG(0),moves:[[sq("h2"),sq("e2")],[sq("h7"),sq("e7")]],clk:{r:30000,b:MIN10},tkN:2});
  let n=mk();clock.now=T0+29999;assert.equal(X.tickMove(n,"r"),true);assert.equal(n.clk.r,1);
  n=mk();clock.now=T0+30000;assert.equal(X.tickMove(n,"r"),false);assert.equal(n.result.w,"b");assert.equal(n.clk.r,0);
  n=mk();delete n.clk;clock.now=T0+999999;assert.equal(X.tickMove(n,"r"),true);assert.equal(n.result,null);
});
// local.js 的 netPvp 走一次：XQNet 換成假的伺服器狀態，tickMove 用 net.js 真正的那支
function netPhone(clock,left,extra){const N=loadNet(clock),P=loadLocal(clock);let G=netG(left,extra);
  P.ctx.XQNet={active:()=>true,side:()=>"b",game:()=>G,update(fn){const n=JSON.parse(JSON.stringify(G));fn(n);n.rev=G.rev+1;n.at=clock.now;G=n;return G},
    tickMove:N.net.tickMove,isOn:()=>true,emotes:()=>[],watchers:()=>0,status:()=>"up",pendingSend:()=>false,clocks:()=>null,on(){},me:()=>({id:"B"})};
  return{P,get G(){return G}}}
for(const left of[1,0,-1])test(`線上對局（local.js → XQNet.update）：黑方剩 ${left} ms 落子`,async()=>{
  const clock={now:T0},W=netPhone(clock,60000,{inc:5000});clock.now=T0+60000-left;
  const s=await W.P.api("/pvp/move",M("h7e7"));
  if(left>0){assert.equal(W.G.moves.length,2);assert.equal(W.G.result,null);assert.equal(W.G.clk.b,left+5000);assert.equal(s.moves.length,2)}
  else{assert.equal(W.G.moves.length,1,"逾時那手不推進棋譜");assert.equal(W.G.result.w,"r");assert.equal(W.G.result.timeout,true);assert.equal(W.G.clk.b,0);
    assert.equal(s.result.w,"r");assert.equal(s.moves.length,1)}
});

// ====================== ③ 引擎空結果（core.js classifyRaw） ======================
// 每個測試一份新的 core：evalPos 照真的一樣先看有沒有合法著（沒有＝dead，不問引擎），有才問假引擎 eng(第幾次問引擎, …)
function coreWith(eng){const calls=[];let n=0;
  const ctx={evalPos:async(b,s,ms,mpv)=>{const dead=!C.legal(b,s).length;calls.push({fen:C.fen(b,s),s,ms,mpv,dead});if(dead)return{lines:[],dead:true};return eng(++n,b,s,ms,mpv)}};
  vm.createContext(ctx);vm.runInContext(CORE_SRC,ctx,{filename:"core.js"});return{X:ctx.XQCore,calls}}
const L=(mv,v,o)=>({mv,v,mate:null,depth:12,pv:[mv],...(o||{})});
const EMPTY={best:"a0a1",lines:[],nopv:true};
const afterH2E2=()=>{const S={moves:[M("h2e2")]};C.stateRebuild(S);return S.board};
const CASES={
  r:{b:()=>C.parseFen(C.START),s:"r",best:"h2e2",second:"b2e2",played:"c3c4",bv:120},
  b:{b:afterH2E2,s:"b",best:"h7e7",second:"b7e7",played:"h9g7",bv:80}};
for(const[side,K]of Object.entries(CASES)){
  const first=()=>({best:K.best,lines:[L(K.best,K.bv),L(K.second,K.bv-20)]});
  test(`引擎空結果（${side==="r"?"紅":"黑"}方）：第二查非終局又缺 PV，重查一次還是空 → 丟 e.retry，不能變成正著 loss＝0`,async()=>{
    const{X,calls}=coreWith(i=>i===1?first():EMPTY),p=M(K.played);
    await assert.rejects(X.classifyRaw(K.b(),K.s,p.f,p.t),e=>e.retry===true&&e.code==="XQ_NO_PV");
    assert.equal(calls.length,3);assert.equal(calls[1].mpv,1);assert.equal(calls[1].dead,false);assert.equal(calls[2].ms,C.ANALYZE_MS*2,"重查用兩倍時間");
  });
  test(`引擎空結果（${side==="r"?"紅":"黑"}方）：第二查空、重查成功 → 照常評等`,async()=>{
    const reply=side==="r"?-50:200;   // 對方視角：紅走完黑方 −50（紅 +50）；黑走完紅方 +200（黑方吃虧）
    const{X,calls}=coreWith(i=>i===1?first():i===2?EMPTY:{best:"x",lines:[L("a9a8",reply)]}),p=M(K.played);
    const r=await X.classifyRaw(K.b(),K.s,p.f,p.t);
    assert.equal(calls.length,3);
    if(side==="r"){assert.equal(r.loss,70);assert.equal(r.q,"緩著");assert.equal(r.ev,50)}
    else{assert.equal(r.loss,280);assert.equal(r.q,"失著");assert.equal(r.ev,200)}
    assert.equal(r.bm,K.best);assert.equal(r.bmt,null);assert.equal(r.pmt,null);
  });
  test(`引擎空結果（${side==="r"?"紅":"黑"}方）：走的就是最佳著 → 只查一次，正著 loss＝0`,async()=>{
    const{X,calls}=coreWith(i=>i===1?first():EMPTY),p=M(K.best);
    const r=await X.classifyRaw(K.b(),K.s,p.f,p.t);
    assert.equal(calls.length,1);assert.equal(r.loss,0);assert.equal(r.q,"正著");assert.equal(r.ev,side==="r"?K.bv:-K.bv);
  });
  test(`引擎空結果（${side==="r"?"紅":"黑"}方）：第一查（走之前）非終局卻缺 PV → 也是 e.retry，不能變成「—」`,async()=>{
    const{X,calls}=coreWith(()=>EMPTY),p=M(K.played);
    await assert.rejects(X.classifyRaw(K.b(),K.s,p.f,p.t),e=>e.retry===true&&e.code==="XQ_NO_PV");
    assert.ok(calls.every(c=>!c.dead));assert.equal(calls[calls.length-1].ms,C.ANALYZE_MS*2,"先用兩倍時間重查一次");
  });
}
// 終局：這步直接將死對方（走完沒有合法著＝dead）→ 走原本的終局分支（30000、pmt＝1），不重查、不丟 retry
function mateBoard(side){const b=Array(90).fill(null);
  if(side==="r"){b[sq("e9")]="k";b[sq("d0")]="K";b[sq("a8")]="R";b[sq("b0")]="R";return{b,played:"b0b9",best:"a8a9"}}
  b[sq("e0")]="K";b[sq("d9")]="k";b[sq("a1")]="r";b[sq("b9")]="r";return{b,played:"b9b0",best:"a1a0"}}
for(const side of["r","b"])test(`引擎空結果（${side==="r"?"紅":"黑"}方）：走完是將死 → 原本的終局分支`,async()=>{
  const{b,played,best}=mateBoard(side),p=M(played);
  assert.ok(C.legal(b,side).some(([x,y])=>x===p.f&&y===p.t),"棋步要合法");assert.equal(C.legal(C.make(b,p.f,p.t),C.opp(side)).length,0,"走完對方沒有合法著");
  const{X,calls}=coreWith(i=>i===1?{best,lines:[L(best,29990,{mate:5}),L("x",100)]}:EMPTY);
  const r=await X.classifyRaw(b,side,p.f,p.t);
  assert.equal(calls.length,2);assert.equal(calls[1].dead,true);
  assert.equal(r.q,"正著");assert.equal(r.loss,0);assert.equal(r.ev,side==="r"?30000:-30000);assert.equal(r.pmt,1);assert.equal(r.bmt,5);
});
test("analyzeList（local.js 同機對局）：缺 PV 的那步保持未評、別步照評；之後重跑補上",async()=>{
  const clock={now:T0},P=loadLocal(clock);let round=1;const seen=[];
  const START_FEN=C.fen(C.parseFen(C.START),"r");
  P.ctx.engine=async(req,opt,mpv)=>{seen.push({fen:req.fen,ms:opt.movetime,mpv});
    if(req.fen===START_FEN)return{best:"h2e2",lines:[L("h2e2",120),L("b2e2",100)]};   // 紅方開局：最佳 h2e2，紅方走 c3c4
    if(mpv===2)return req.fen.endsWith(" b")?{best:"h7e7",lines:[L("h7e7",30)]}:{best:"h0g2",lines:[L("h0g2",10)]};   // 其他步都走最佳著（只查一次）
    return round===1?EMPTY:{best:"h7e7",lines:[L("h7e7",-50)]}};        // 只有紅方 c3c4 走完的局面會第二查：第一輪缺 PV
  await P.api("/pvp/new",{});await P.api("/pvp/move",M("c3c4"));await P.api("/pvp/move",M("h7e7"));
  await P.analyze();
  let s=await P.state();
  assert.equal(s.moves[0].q,undefined,"缺 PV：紅方這步保持未評（不是正著、也不是「—」）");assert.equal(s.moves[0].loss,undefined);
  assert.equal(s.moves[1].q,"正著","缺 PV 不擋住後面的步");
  assert.equal(seen.filter(x=>x.mpv===1).length,2,"第二查重查過一次");
  round=2;await P.api("/pvp/move",M("h0g2"));   // 下一手觸發背景評等＝重跑
  await P.analyze();s=await P.state();
  assert.equal(s.moves[0].q,"緩著");assert.equal(s.moves[0].loss,70);assert.equal(s.moves[0].ev,50);assert.equal(s.moves[0].bmt,null);
  assert.equal(s.moves[1].q,"正著");assert.equal(s.moves[2].q,"正著");
});

test("analyzeList（local.js）：第一查缺 PV 也保持未評（不寫「—」），重跑補上",async()=>{
  const clock={now:T0},P=loadLocal(clock);let round=1;
  P.ctx.engine=async(req,opt,mpv)=>round===1?EMPTY:{best:"h2e2",lines:[L("h2e2",20),L("c3c4",10)]};
  await P.api("/pvp/new",{});await P.api("/pvp/move",M("h2e2"));
  await P.analyze();let s=await P.state();assert.equal(s.moves[0].q,undefined,"不能變成「—」（舊版：永遠不再評）");
  round=2;await P.api("/pvp/move",M("h7e7"));P.ctx.engine=(o=>async(req,opt,mpv)=>req.fen.endsWith(" b")?{best:"h7e7",lines:[L("h7e7",0)]}:o(req,opt,mpv))(P.ctx.engine);
  await P.analyze();s=await P.state();assert.equal(s.moves[0].q,"正著");assert.equal(s.moves[1].q,"正著");
});

// ====================== ④ 賽後講解 talk（05-settings.js） ======================
const a=SET_SRC.indexOf("function talkMate("),e=SET_SRC.indexOf("// 報告畫面",a);
assert.ok(a>0&&e>a,"找不到 talkMate／talk");
/* 評比循環第 1 輪：talk 的兵數、「走完整盤誰好」改用 00-util.js 的 pawnAbout／evLink（evt 照舊用假的） */
const UTIL_SRC=fs.readFileSync(path.join(LAB,"../xiangqi-db/m/00-util.js"),"utf8").replace(/\r\n/g,"\n"),u0=UTIL_SRC.indexOf("function pawnN("),u1=UTIL_SRC.indexOf("\n/*",UTIL_SRC.indexOf("function evLink("));
assert.ok(u0>0&&u1>u0,"找不到 pawnN／evLink");
function loadTalk(){const ctx={MXS:{mate:20000},gradeFor:()=>["B","","","整體不錯"],rnd:p=>Math.ceil(p/2),evt:v=>"評估 "+v,isFinite};
  vm.createContext(ctx);vm.runInContext(UTIL_SRC.slice(u0,u1)+"\n"+SET_SRC.slice(a,e)+";this.talk=talk;this.talkMate=talkMate;",ctx,{filename:"05-settings.js(talk)"});return ctx}
const say=(s,m)=>{const X=loadTalk(),mv={ply:s==="r"?21:22,by:s,cn:"某著",bc:"建議著",...m};return X.talk(s,[mv],[mv],{open:null,mid:null,end:null},70).filter(t=>t.bad)};
for(const s of["r","b"]){const sg=s==="r"?1:-1,who=s==="r"?"紅":"黑";
  test(`賽後講解（${who}方）：普通分 +1950、實走 +1450、損失 500，新存檔沒有殺棋訊號 → 不說錯過殺棋`,()=>{
    const T=say(s,{q:"敗著",loss:500,ev:sg*1450,bv:sg*1950,bmt:null,pmt:null});
    assert.equal(T.length,1);assert.equal(T[0].t,"敗著");assert.doesNotMatch(T[0].t+T[0].x,/殺/);
  });
  test(`賽後講解（${who}方）：只有 bv（今天稍早的存檔）、+1950 不到殺棋分界 → 不說錯過殺棋`,()=>{
    const T=say(s,{q:"敗著",loss:500,ev:sg*1450,bv:sg*1950});
    assert.equal(T[0].t,"敗著");assert.doesNotMatch(T[0].t+T[0].x,/殺/);
  });
  test(`賽後講解（${who}方）：舊存檔什麼訊號都沒有 → 說「錯失明顯優勢」，不說有殺`,()=>{
    const T=say(s,{q:"敗著",loss:500,ev:sg*1450});
    assert.equal(T[0].t,"錯失明顯優勢");assert.doesNotMatch(T[0].x,/殺/);
  });
  test(`賽後講解（${who}方）：引擎說最佳著是殺棋（bmt＞0）、實走不是 → 才說錯過殺棋`,()=>{
    let T=say(s,{q:"敗著",loss:1200,ev:sg*800,bv:sg*29990,bmt:5,pmt:null});
    assert.equal(T[0].t,"錯過殺棋");assert.match(T[0].x,/已經有殺棋/);
    T=say(s,{q:"敗著",loss:1200,ev:sg*800,bv:sg*29990});   // 只有 bv（原值到殺棋分界）也算
    assert.equal(T[0].t,"錯過殺棋");
    T=say(s,{q:"失著",loss:200,ev:sg*29980,bv:sg*29990,bmt:3,pmt:4});   // 還在殺（只是慢一點）不算錯過
    assert.notEqual(T[0].t,"錯過殺棋");
  });
}
