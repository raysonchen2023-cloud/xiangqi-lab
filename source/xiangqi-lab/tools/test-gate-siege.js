// 黑洞・星門圍城 gate-siege-v1 候選（開發者 11/15；m/07bhg-gatesiege.js 的 GSV 純規則）單元測試。不開瀏覽器、不跑引擎：
//   同式傷害與數值盾（提案一第十節的算術例）、關卡子數／星門／補給點合法、紅 8 子＋後備部署（用掉主要行動、local.js tdRebuild 重放換手）、
//   擒子／將軍／入侵／護陣／截援、靈力收入上限、回復總量、冷卻、每回合一招、星核同批次同時歸零判和、八回合無進展、35 招逐招、星樞招、星樞選步分層。
// 用法：node --test xiangqi-lab/tools/test-gate-siege.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const SRC=rd("xiangqi-db/m/07bhg-gatesiege.js");
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(SRC+"\n;this.GSV=GSV;",ctx);const G=ctx.GSV;
const J=x=>JSON.parse(JSON.stringify(x));
const Q=(lu,xi)=>G.LSQ(lu,xi);
/* local.js 的 tdRebuild 原文拿出來測（同一份程式） */
const LOC=rd("xiangqi-lab/src/local.js");
const tdRebuild=new Function("C","parseFen","fen","START",LOC.slice(LOC.indexOf("function tdRebuild(S){"),LOC.indexOf("S.repetition=null;return S}")+"S.repetition=null;return S}".length)+";return tdRebuild")(C,C.parseFen,C.fen,C.START);

function game(lv,o){o=o||{};const start=G.startFen(lv,C),P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];
  P.td=G.boot({mode:G.MODE,lv,ch:o.ch||"x_swordboy",L:o.L||1,sk:o.sk},P,C);return P}
/* 自訂盤面：pcs＝[[子,路,線,標記]…]；開局資料照第 lv 關（數值、波次），盤面換成自訂的；waves:false＝不要援軍 */
function custom(lv,pcs,o){o=o||{};const b=new Array(90).fill(null);for(const[p,lu,xi]of pcs)b[Q(lu,xi)]=p;const start=C.fen(b,"r").split(" ")[0];
  const P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];
  P.td=G.boot({mode:G.MODE,lv,ch:o.ch||"x_swordboy",L:o.L||1,sk:o.sk},P,C);for(const[p,lu,xi,tg]of pcs){const id=P.td.ids[Q(lu,xi)];P.td.meta[id].tag=tg||""}
  if(o.waves===false)P.td.waves=[];return P}
function mv(P,f,t){assert.ok(C.legal(P.board,P.turn).some(([a,b])=>a===f&&b===t),`不合法 ${f}→${t}（${P.turn}）`);const m=C.stateApply(P,f,t);return G.move(P,m,C)}
const castOk=(P,o)=>{const r=G.cast(P,o,C);assert.ok(!r.err,"放招失敗："+r.err);return r};
/* 最小盤：紅帥 e1、黑將 d10、紅俥 a1；quiet＝雙方原地來回的步 */
const KS=[["K",5,1],["k",4,10],["R",1,1]];
const rq=P=>mv(P,...(P.board[Q(1,1)]==="R"?[Q(1,1),Q(1,2)]:[Q(1,2),Q(1,1)]));
const bq=P=>mv(P,...(P.board[Q(4,10)]==="k"?[Q(4,10),Q(4,9)]:[Q(4,9),Q(4,10)]));
const round=P=>{rq(P);return bq(P)};

test("同式傷害與數值盾：提案一第十節算術例（23／17／21、盾 20 損 3、第 1 關入侵 8、第 5 關 10），最少 1 在盾之前、盾可吸到 0", ()=>{
  assert.equal(G.dmg(30,100,30),23);assert.equal(G.dmg(30,100,80),17);assert.equal(G.dmg(30,100,40),21);
  assert.deepEqual(J(G.absorb({v:20},23)),{abs:20,loss:3});assert.equal(G.dmg(12,90,30),8);assert.equal(G.dmg(12,110,30),10);
  assert.equal(G.dmg(1,50,300),1,"至少 1");assert.equal(G.dmg(0,100,0),0,"基礎 0 就是 0");assert.equal(G.dmg(10,100,-50),10,"DEF 最少當 0，不放大");
  assert.deepEqual(J(G.absorb({v:8},8)),{abs:8,loss:0},"盾剛好用完：損血 0，不再保底扣 1");
  assert.equal(Math.round(1000*(1-100/130))/10,23.1,"DEF30 減傷約 23.1%")});

test("七星數值（提案一 5.4）＋修為窄幅加成：Lv1 原值、Lv100 最多 HP+5%、ATK+5、DEF+5；開場靈力 35、每回合 4", ()=>{
  const T={x_swordboy:[105,110,20,90],x_spiritgirl:[100,95,45,100],x_martialgirl:[95,115,20,100],x_miaogirl:[95,105,25,100],x_shuai:[90,100,30,110],x_shi:[115,90,50,90],x_bing:[100,105,20,100]};
  for(const k in T){const s=G.stats(k,1),z=G.stats(k,100);assert.deepEqual([s.hp,s.atk,s.def,s.sp],T[k],k);assert.equal(z.hp,Math.round(T[k][0]*1.05));assert.equal(z.atk,T[k][1]+5);assert.equal(z.def,T[k][2]+5);assert.equal(z.sp,T[k][3],"靈力容量不隨修為長");assert.equal(s.sp0,35);assert.equal(s.rg,4)}});

test("關卡：第 1、3、6 關開局＋星門合法（敵剛好 16 子、紅 8＋後備 8、星門在敵半場、補給點各棋種都有合法點、不照面、沒人被將）", ()=>{
  assert.deepEqual(J(G.LVN),[1,3,6]);
  for(const n of G.LVN){assert.deepEqual(J(G.lvCheck(n,C)),[],"第 "+n+" 關");const pl=G.plan(n),b=G.startBoard(n);
    assert.equal(pl.red.length,8);assert.equal(pl.res.length,8);assert.equal(pl.open.length+pl.waves.length,16,"敵方總預算 16");
    assert.equal(b.filter(x=>x&&x===x.toLowerCase()).length,pl.open.length);for(const w of pl.waves)assert.equal(G.spawnOk(b,w.p,w.sq,C),"","開局盤上每顆援軍的門都能落")}
  assert.equal(G.plan(1).open.length,8);assert.equal(G.plan(3).open.length,9);assert.equal(G.plan(6).open.length,10);
  assert.ok(G.plan(3).open.filter(x=>x[2]==="guard").length===2,"第 3 關兩顆護陣卒");assert.ok(G.LV[3].open.length>3,"取消空城式開場");
  assert.ok(G.LV[1].waves.some(w=>w.at===2)&&G.LV[1].waves.some(w=>w.at===5),"第 1 關援軍第 2、5 回合");assert.ok(G.LV[1].waves[1].p.some(x=>x[0]==="n"),"第二波帶傌");
  const P=game(1);assert.equal(P.td.me.sp,35);assert.equal(P.td.en.sp,25);assert.equal(game(6).td.en.sp,35);
  assert.deepEqual(J(G.fore(P.td).map(g=>g.at)),[2,5],"開局就看得到前兩波");assert.ok(G.fore(P.td)[0].inR>=2,"至少提前兩個完整回合")});

test("七角色 × 三關 × Lv1／Lv23 都能開局：有合法起手、帶得到本命招、通用招與部署都在", ()=>{
  for(const ch in G.CH)for(const n of G.LVN)for(const L of[1,23]){const P=game(n,{ch,L});assert.ok(C.legal(P.board,"r").length>0);assert.ok(P.td.sk.length>=1&&P.td.sk.length<=4);
    assert.equal(G.SKM[P.td.sk[0]].ch,ch);assert.equal(G.why(P,"dep",C),"",`${ch} 第 ${n} 關開局就能部署`);assert.equal(P.td.me.sp,35)}});

test("檢查器抓得到錯：子數超過、門格有子、落出將軍會被擋", ()=>{
  const L=G.LV[1],bk=J(L.waves);L.waves[0].p.push(["r",5,9]);assert.ok(G.lvCheck(1,C).some(e=>/車共 3 顆/.test(e)));L.waves=bk;
  const b=G.startBoard(1);assert.equal(G.spawnOk(b,"p",Q(3,6),C),"門格有子");assert.equal(G.spawnOk(b,"b",Q(1,9),C),"棋種站不住");
  const x=new Array(90).fill(null);x[Q(5,1)]="K";x[Q(4,10)]="k";assert.equal(G.spawnOk(x,"r",Q(5,9),C),"會落出將軍")});

test("擒子：回合結束一批結算（卒 4…車 14、照被吃的棋種），擒子回靈 6、每回合收入最多 10；紅子過河不自動扣血", ()=>{
  const P=custom(1,[...KS,["p",1,5],["P",9,4]],{waves:false}),td=P.td;
  mv(P,Q(9,4),Q(9,5));bq(P);mv(P,Q(9,5),Q(9,6));const hp0=td.en.hp;bq(P);assert.equal(td.en.hp,hp0,"紅兵過河、站在敵半場都不扣星樞");
  mv(P,Q(1,1),Q(1,5));assert.equal(td.en.hp,hp0,"擒子當下先不扣（等回合結算）");assert.equal(td.q.length,1);assert.equal(td.me.sp,35+4+4+6);
  bq(P);assert.equal(td.en.hp,hp0-G.dmg(4,110,10),"卒 4 × 齊轍 ATK110 ÷ 第 1 關 DEF10");assert.equal(td.me.sp,49+4,"回復 4：這回合收入 6＋4＝10");
  const e=td.ev.filter(x=>x.k==="hit").pop();assert.equal(e.why,"cap");assert.equal(e.loss,4)});

test("將軍 18、同一星核兩個完整回合內最多算一次；入侵卒：進我方半場先預告，下一回合結束還在才扣 12（九宮 20），最多兩顆", ()=>{
  const P=custom(1,[["K",5,1],["k",4,10],["R",1,1],["R",9,1],["p",3,6,"inv"],["p",7,6,"inv"],["p",8,6,"inv"]],{waves:false}),td=P.td,H=()=>td.me.hp;
  rq(P);mv(P,Q(3,6),Q(3,5));assert.equal(td.ev.filter(e=>e.k==="warn").length,1,"進來那回合只預告");const h1=H();assert.equal(h1,105);
  assert.equal(G.preview(td,P.board).raw,G.dmg(12,90,20),"畫面「本輪若不處理」跟結算同一個算式");
  rq(P);mv(P,Q(7,6),Q(7,5));assert.equal(H(),h1-G.dmg(12,90,20),"下一回合結束還在：扣 12 基礎");
  rq(P);mv(P,Q(8,6),Q(8,5));const h3=H();rq(P);bq(P);assert.equal(h3-H(),2*G.dmg(12,90,20),"三顆在半場最多算兩顆");
  /* 九宮 20 */
  const P2=custom(1,[["K",5,1],["k",4,10],["R",1,1],["p",7,3,"inv"]],{waves:false});P2.td.arm[P2.td.ids[Q(7,3)]]=1;const hh=P2.td.me.hp;rq(P2);mv(P2,Q(7,3),Q(6,3));
  assert.equal(hh-P2.td.me.hp,G.dmg(20,90,20),"已預告的入侵卒停進九宮：改基礎 20，不跟 12 疊加");
  /* 將軍 */
  const P3=custom(1,[["K",5,1],["k",4,10],["R",1,1],["R",9,2]],{waves:false}),T=P3.td;mv(P3,Q(9,2),Q(9,10));const e0=T.en.hp;mv(P3,Q(4,10),Q(4,9));assert.equal(e0-T.en.hp,G.dmg(18,110,10),"真正將軍 18");
  mv(P3,Q(9,10),Q(9,9));const e1=T.en.hp;mv(P3,Q(4,9),Q(4,10));assert.equal(e1-T.en.hp,0,"兩回合內第二次將軍不扣");});

test("護陣卒：每顆 DEF+20；吃掉那一擊照吃之前的防禦算，之後的每一擊都用拆掉後的防禦", ()=>{
  const P=custom(3,[["K",5,1],["k",4,10],["R",1,1],["R",9,1],["p",1,7,"guard"],["p",9,7,"guard"]],{waves:false}),td=P.td;
  assert.equal(G.defOf(td,"b"),25+40);mv(P,Q(1,1),Q(1,7));assert.equal(G.defOf(td,"b"),45,"拆陣 DEF−20");assert.ok(td.ev.some(e=>e.k==="guard"));
  assert.equal(td.q[0].raw,G.dmg(4,110,65),"吃護陣卒那一擊照 DEF65");bq(P);
  mv(P,Q(9,1),Q(9,7));assert.equal(td.q[0].raw,G.dmg(4,110,45),"第二顆用拆掉一顆後的 DEF45");});

test("數值盾池：上限 30、兩回合到期、重施取較大剩餘值不相加；冷卻放招那回合不減、每回合最多一招", ()=>{
  const P=custom(1,KS,{ch:"x_shi",sk:["tie1"],waves:false}),td=P.td;td.me.sp=100;
  castOk(P,{k:"tie1"});assert.equal(td.me.sh.v,20);assert.equal(G.why(P,"gheal",C),"這回合已經用過一招（每回合最多一招）");
  round(P);assert.equal(td.cd.tie1,3,"放招那回合結束不減");assert.equal(td.me.sh.v,20);round(P);assert.equal(td.me.sh.v,0,"兩次結算後到期");assert.equal(td.cd.tie1,2);
  /* 重施：取較大 */
  const P2=custom(1,[["K",5,1],["k",4,10],["R",1,1],["A",4,1],["N",5,2]],{waves:false});P2.td.me.sp=100;P2.td.me.sh={v:25,exp:2};
  castOk(P2,{k:"gguard",tg:[Q(5,2)]});assert.equal(P2.td.me.sh.v,25,"剩 25 比新的 20 大：留 25，不是 45");
  const P3=custom(1,[["K",5,1],["k",4,10],["R",1,1],["A",4,1],["N",5,2]],{waves:false});P3.td.me.sh={v:5,exp:2};castOk(P3,{k:"gguard",tg:[Q(5,2)]});assert.equal(P3.td.me.sh.v,20)});

test("盾吸收在一批結算裡：盾 20 吃 23 的擒子只損 3；跳字事件帶「盾吸收／損血」", ()=>{
  const P=custom(1,[["K",5,1],["k",4,10],["R",1,1],["N",9,3],["r",9,10]],{ch:"x_shuai",waves:false}),td=P.td;td.me.sh={v:5,exp:9};
  rq(P);mv(P,Q(9,10),Q(9,3));const e=td.ev.filter(x=>x.k==="hit").pop();assert.equal(e.raw,G.dmg(10,90,30));assert.equal(e.abs,5);assert.equal(e.loss,e.raw-5);assert.equal(td.me.sh.v,0)});

test("部署後備：20 靈、用掉主要行動（換星樞走）、每局最多 2 次、只能從未上場的後備、補給點要合法；local.js tdRebuild 照 ed.ps 重放換手", ()=>{
  const P=game(1),td=P.td;assert.equal(G.why(P,"dep",C),"");assert.ok(G.targets(P,"dep",["R"],C).includes(Q(1,4)));
  assert.ok(!G.targets(P,"dep",["A"],C).includes(Q(1,4)),"仕不能放左右補給點");assert.ok(G.targets(P,"dep",["A"],C).includes(Q(6,1)),"仕有自己的合法點");
  assert.ok(G.cast(P,{k:"dep",p:"K",tg:[Q(1,4)]},C).err,"後備沒有帥");
  const r=castOk(P,{k:"dep",p:"R",tg:[Q(1,4)]});assert.equal(r.pass,1);assert.equal(P.turn,"b","部署用掉這一手");assert.equal(td.me.sp,15);assert.equal(td.res.filter(x=>x==="R").length,0);
  assert.equal(P.board[Q(1,4)],"R");assert.deepEqual(J(P.ed[0]),{n:0,s:{[Q(1,4)]:"R"},ps:1});
  const A=C.legal(P.board,"b")[0];mv(P,A[0],A[1]);assert.equal(td.rnd,1,"星樞走完＝回合結束");
  const S={start:P.start,startTurn:"r",moves:J(P.moves),ed:J(P.ed)};tdRebuild(S);assert.equal(C.fen(S.board,S.turn),C.fen(P.board,P.turn),"重放後盤面、輪到誰都一樣");
  td.me.sp=60;castOk(P,{k:"dep",p:"N",tg:[Q(9,4)]});const B=C.legal(P.board,"b")[0];mv(P,B[0],B[1]);td.me.sp=60;assert.equal(G.why(P,"dep",C),"每局最多部署 2 次");
  const S2={start:P.start,startTurn:"r",moves:J(P.moves),ed:J(P.ed)};tdRebuild(S2);assert.equal(C.fen(S2.board,S2.turn),C.fen(P.board,P.turn));
  const x=custom(1,[["K",5,1],["k",4,10],["R",1,1],["r",1,9]],{waves:false});assert.equal(G.depOk(x,"C",Q(1,4),C),"","擋在俥前面可以");
  const y=custom(1,[["K",5,1],["k",4,10],["R",1,1],["r",5,5]],{waves:false});assert.equal(G.depOk(y,"C",Q(9,4),C),"部署完還被將（主要行動要解將）");
  const z=custom(1,[["K",5,1],["k",9,10],["R",1,1]],{waves:false});assert.equal(G.depOk(z,"R",Q(9,4),C),"部署不能直接將軍")});

test("星門：門格被紅子擋＝延遲一次；延遲後還擋著＝取消（截援：星樞靈力 −10、第一次截援回 6 靈）；子數合計不超過預算", ()=>{
  const P=custom(1,[...KS,["R",9,1]],{waves:false}),td=P.td;td.waves=[{id:"t1",wv:1,at:1,p:"p",sq:Q(9,8),tag:"",dl:0,st:"wait"},{id:"t2",wv:1,at:1,p:"n",sq:Q(2,10),tag:"",dl:0,st:"wait"}];
  mv(P,Q(9,1),Q(9,8));bq(P);assert.equal(P.board[Q(2,10)],"n","沒擋的門照常落");assert.equal(td.waves[0].st,"wait");assert.equal(td.waves[0].at,2,"擋住的延遲一回合");
  assert.equal(P.ed[P.ed.length-1].s[Q(2,10)],"n","落子記在 ed（重放用）");const sp0=td.me.sp,esp=td.en.sp;
  rq(P);bq(P);assert.equal(td.waves[0].st,"cut","延遲後還擋著＝取消");assert.equal(td.icpt,1);assert.equal(td.en.sp,Math.max(0,esp-10)+4);assert.equal(td.me.sp,Math.min(td.me.spMax,sp0+6+4),"截援 6＋回復 4＝收入上限 10");
  assert.ok(td.ev.some(e=>e.k==="icpt"&&e.gain===6),"第一次截援回 6");
  td.waves.push({id:"t3",wv:2,at:td.rnd+1,p:"p",sq:Q(9,8),tag:"",dl:1,st:"wait"});round(P);const e=td.ev.filter(x=>x.k==="icpt").pop();assert.equal(e.gain,0,"之後的截援不回靈")});

test("星核同一批結算同時歸零＝和局（不沿用走棋方勝）；只有一方歸零照常分勝負；八回合無進展判和", ()=>{
  const P=custom(1,[["K",5,1],["k",4,10],["R",1,1],["p",1,6],["n",9,3],["N",8,1]],{waves:false}),td=P.td;td.me.hp=3;td.en.hp=3;
  mv(P,Q(1,1),Q(1,6));const r=mv(P,Q(9,3),Q(8,1));assert.equal(r&&r.end&&r.end.w,null);assert.match(r.end.why,/同時歸零，判和/);assert.equal(td.over.w,null);assert.ok(td.ev.some(e=>e.k==="end"));
  const P2=custom(1,[["K",5,1],["k",4,10],["R",1,1],["p",1,6]],{waves:false});P2.td.en.hp=3;mv(P2,Q(1,1),Q(1,6));const r2=bq(P2);assert.equal(r2.end.w,"r");
  const P3=custom(1,KS,{waves:false});let e=null;for(let i=0;i<8&&!e;i++)e=round(P3);assert.ok(e&&e.end);assert.equal(e.end.w,null);assert.match(e.end.why,/8 回合沒有進展/);assert.equal(P3.td.rnd,8)});

test("回復總量每局最多最大 HP 的 40%（所有回復一起算）；緊急回復 40 靈回 16、冷卻 5、每局 2 次", ()=>{
  const P=custom(1,KS,{ch:"x_shuai",sk:["shen1"],waves:false}),td=P.td;td.me.hp=20;td.me.sp=110;assert.equal(td.me.healMax,36);
  castOk(P,{k:"gheal"});assert.equal(td.me.hp,36);round(P);td.me.sp=110;castOk(P,{k:"shen1"});assert.equal(td.me.hp,51,"回 15");round(P);td.me.sp=110;
  assert.equal(td.me.heal,31);td.cd={};castOk(P,{k:"gheal"});assert.equal(td.me.hp,56,"預算只剩 5");round(P);td.cd={};td.me.sp=110;
  assert.match(G.why(P,"gheal",C),/每局最多 2 次|回復總量已經用完/);assert.match(G.why(P,"shen1",C),/回復總量已經用完/)});

test("集火：要兩顆己子都能合法擒到（蹩腳馬不算），當回合真的擒下＋8 基礎、每回合一次；改走別步不退費", ()=>{
  const P=custom(1,[["K",5,1],["k",4,10],["R",1,1],["R",3,1],["N",2,3],["P",2,4],["p",3,5]],{waves:false}),td=P.td;
  assert.ok(G.targets(P,"gfocus",[],C).length===0,"只有俥打得到、馬被自己的兵蹩腿：不成立");
  const P2=custom(1,[["K",5,1],["k",4,10],["R",1,1],["R",3,1],["N",2,3],["p",3,5]],{waves:false});assert.deepEqual(J(G.targets(P2,"gfocus",[],C)),[Q(3,5)]);
  castOk(P2,{k:"gfocus",tg:[Q(3,5)]});assert.equal(P2.td.me.sp,5);mv(P2,Q(3,1),Q(3,5));assert.equal(P2.td.q[0].raw,G.dmg(4+8,110,10),"擒子基礎 4＋集火 8");
  const P3=custom(1,[["K",5,1],["k",4,10],["R",1,1],["R",3,1],["N",2,3],["p",3,5]],{waves:false});castOk(P3,{k:"gfocus",tg:[Q(3,5)]});rq(P3);assert.equal(P3.td.me.sp,5,"沒擒也不退費");bq(P3);assert.equal(P3.td.fc,null,"回合結束失效")});

test("35 招都有定義（七位各 5 招、修為 1／6／12／17／23、最多帶 4 招）；費用與冷卻照提案二第 11 節", ()=>{
  const own=G.SK.filter(s=>s.ch!=="*");assert.equal(own.length,35);for(const k in G.CH){const L=own.filter(s=>s.ch===k);assert.deepEqual(J(L.map(s=>s.lv)),[1,6,12,17,23],k)}
  const T={shen1:[30,4],shen2:[20,3],shen3:[20,2],shen4:[30,4],shen5:[30,5],tie1:[20,3],tie2:[20,3],tie3:[30,4],tie4:[30,4],tie5:[0,4],bu1:[30,4],bu2:[0,3],bu3:[20,5],bu4:[15,3],bu5:[5,4],
    qi1:[40,5],qi2:[20,3],qi3:[20,3],qi4:[0,0],qi5:[35,5],tian1:[30,4],tian2:[20,4],tian3:[20,3],tian4:[20,3],tian5:[30,4],lei1:[20,3],lei2:[20,3],lei3:[30,4],lei4:[20,3],lei5:[20,3],
    luo1:[50,5],luo2:[20,3],luo3:[20,3],luo4:[20,4],luo5:[20,3]};
  for(const id in T)assert.deepEqual([G.SKM[id].cost,G.SKM[id].cd],T[id],id);
  assert.deepEqual(J(G.skOf("x_bing",1)),["bu1"]);assert.deepEqual(J(G.skPick("x_bing",30,["bu5","bu4","bu3","bu2","bu1"])),["bu5","bu4","bu3","bu2"],"最多 4 招");
  assert.deepEqual(J(G.skPick("x_bing",1,["bu5"])),["bu1"],"沒解鎖的不能帶");
  const P=game(1,{ch:"x_shuai",L:30,sk:["shen3"]});assert.match(G.why(P,"shen3",C),/沒有控制招/);const P2=game(1,{ch:"x_bing",L:30,sk:["bu4"]});P2.td.me.sp=100;assert.match(G.why(P2,"bu4",C),/沒有虛空鎖/)});

test("招式：一劍破甲（每局一次、拆護陣）、回營（同一顆子回原位）、神行百里（換完不能照面）、飛燕還巢、馬腿解圍", ()=>{
  const P=custom(3,[["K",5,1],["k",4,10],["R",1,1],["p",9,7,"guard"]],{waves:false,sk:["qi1"]}),td=P.td;td.me.sp=100;
  castOk(P,{k:"qi1",tg:[Q(9,7)]});assert.equal(P.board[Q(9,7)],null);assert.equal(G.defOf(td,"b"),25);assert.equal(td.en.hp,120,"移除不算擒子、不扣星核");
  round(P);td.cd={};td.me.sp=100;assert.equal(G.why(P,"qi1",C),"每局只能用一次");
  /* 回營 */
  const P2=custom(1,[["K",5,1],["k",4,10],["R",1,1],["B",3,1],["N",2,1],["r",2,5]],{ch:"x_miaogirl",waves:false}),t2=P2.td;const nid=t2.ids[Q(2,1)];rq(P2);mv(P2,Q(2,5),Q(2,1));
  assert.equal(t2.lost.length,1);mv(P2,Q(1,2),Q(1,1));mv(P2,Q(2,1),Q(2,5));t2.me.sp=100;castOk(P2,{k:"luo1",tg:[Q(2,1)]});assert.equal(P2.board[Q(2,1)],"N");assert.equal(t2.ids[Q(2,1)],nid,"同一顆子 ID");
  /* 神行百里 */
  const P3=custom(1,[["K",5,1],["k",4,10],["R",1,1],["P",5,4],["N",6,2]],{ch:"x_bing",waves:false});P3.td.me.sp=100;
  const pk=G.targets(P3,"bu1",[Q(1,1)],C);assert.ok(!pk.includes(Q(5,4)),"俥換走兵、兵到 a1 不能站");
  const P4=custom(1,[["K",5,1],["k",5,10],["R",1,1],["N",5,5]],{ch:"x_bing",waves:false});assert.ok(!G.targets(P4,"bu1",[Q(5,5)],C).includes(Q(1,1)),"傌離開 e 線會將帥照面");
  /* 飛燕還巢 */
  const P5=custom(1,[["K",5,1],["k",4,10],["R",1,5],["A",4,1]],{ch:"x_spiritgirl",waves:false});P5.td.me.sp=100;const bk=G.targets(P5,"tian1",[Q(1,5)],C);assert.ok(bk.includes(Q(1,1))&&!bk.includes(Q(4,1)));
  castOk(P5,{k:"tian1",tg:[Q(1,5),Q(9,1)]});assert.equal(P5.board[Q(9,1)],"R");
  /* 馬腿解圍 */
  const P6=custom(1,[["K",5,1],["k",4,10],["R",1,1],["N",2,3],["C",2,4]],{ch:"x_miaogirl",L:30,sk:["luo5"],waves:false});P6.td.me.sp=100;assert.deepEqual(J(G.targets(P6,"luo5",[],C)),[Q(2,3)],"炮蹩住傌腿");
  castOk(P6,{k:"luo5",tg:[Q(2,3)]});assert.equal(P6.board[Q(2,4)],null,"蹩腿的炮移走");const to=P6.board.indexOf("C");assert.ok(to>=45,"移到己方半場");assert.ok(Math.floor(to/9)>=Math.floor(Q(2,4)/9),"只往左右或後方")});

test("招式：控制不能排空星樞合法步；定身／迷煙／煙幕照 engine 的 searchmoves 濾掉；銅鎖動了才定身、守門點走進去定身", ()=>{
  const P=custom(1,[["K",5,1],["k",4,10],["R",1,1],["c",9,10]],{ch:"x_martialgirl",waves:false}),td=P.td;td.me.sp=100;
  assert.ok(G.targets(P,"lei1",[],C).includes(Q(9,10)));castOk(P,{k:"lei1",tg:[Q(9,10)]});rq(P);const E=G.engine(P,C);assert.ok(E.sm&&E.sm.every(u=>!u.startsWith("i9")),"定身的砲不在 searchmoves");
  const P2=custom(1,[["K",5,1],["k",5,10],["R",1,1],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["r",9,10]],{ch:"x_martialgirl",waves:false});
  /* 黑將被自己士象圍住、只剩車能動：定身車會排空合法步 */
  const P2b=custom(1,[["K",5,1],["k",4,10],["R",1,9],["r",9,10]],{ch:"x_martialgirl",waves:false});assert.ok(C.legal(P2b.board,"b").every(([f])=>f===Q(9,10)),"黑將沒步、只剩車能動");
  assert.ok(!G.targets(P2b,"lei1",[],C).includes(Q(9,10)),"定身會排空星樞合法步：不能選");assert.match(G.why(P2b,"lei1",C),/沒有合適的目標|靈力不夠/);
  /* 迷煙：不能擒子 */
  const P3=custom(1,[["K",5,1],["k",4,10],["R",1,1],["N",3,3],["p",3,5]],{ch:"x_spiritgirl",L:30,sk:["tian3"],waves:false});P3.td.me.sp=100;castOk(P3,{k:"tian3",tg:[Q(3,5)]});rq(P3);
  const E3=G.engine(P3,C);assert.ok(!E3.sm||!E3.sm.includes(C.iccs(Q(3,5),Q(3,4))));
  /* 煙幕：這顆不能被擒 */
  const P4=custom(1,[["K",5,1],["k",4,10],["R",1,1],["N",3,4],["p",3,5],["c",8,8]],{ch:"x_martialgirl",L:30,sk:["lei5"],waves:false});P4.td.me.sp=100;castOk(P4,{k:"lei5",tg:[Q(3,4)]});rq(P4);
  const E4=G.engine(P4,C);assert.ok(E4.sm&&!E4.sm.includes(C.iccs(Q(3,5),Q(3,4))));
  /* 銅鎖 */
  const P5=custom(1,[["K",5,1],["k",4,10],["R",1,1],["c",9,10]],{ch:"x_shi",L:30,sk:["tie3"],waves:false});P5.td.me.sp=100;castOk(P5,{k:"tie3",tg:[Q(9,10)]});rq(P5);mv(P5,Q(9,10),Q(9,9));
  assert.ok(P5.td.ctl.frz.some(o=>o.until===P5.td.rnd+2),"動了＝定身兩回合");
  /* 守門點 */
  const P6=custom(1,[["K",5,1],["k",4,10],["R",1,1],["A",4,1],["n",4,4]],{ch:"x_shi",L:30,sk:["tie2"],waves:false});P6.td.me.sp=100;castOk(P6,{k:"tie2"});assert.ok(P6.td.ctl.trap.sqs.includes(Q(5,2)));
  const nid=P6.td.ids[Q(4,4)];rq(P6);mv(P6,Q(4,4),Q(5,2));assert.ok(P6.td.ctl.frz.some(o=>o.id===nid&&o.until===P6.td.rnd+1),"走進守門點：下一回合不能動");
  rq(P6);assert.ok(!G.engine(P6,C).sm||G.engine(P6,C).sm.every(u=>!u.startsWith(C.iccs(Q(5,2),Q(5,2)).slice(0,2))),"engine 濾掉定身的馬")});

test("招式：攻擊招走同一個傷害算式（直路衝鋒、隔子星花、紅馬跳影、長街破陣、花火連環）；回靈招占招、受收入上限，收入滿了不能放", ()=>{
  const P=custom(1,[["K",5,1],["k",4,10],["R",1,1],["p",1,7]],{ch:"x_swordboy",L:30,sk:["qi2","qi5"],waves:false}),td=P.td;td.me.sp=100;
  mv(P,Q(1,1),Q(1,4));bq(P);assert.equal(G.why(P,"qi2",C),"");castOk(P,{k:"qi2"});assert.equal(td.q[0].raw,G.dmg(6,110,10),"直走 3 格 ×2＝6");
  const P2=custom(1,[["K",5,1],["k",4,10],["R",1,1],["C",2,3],["p",2,6],["n",2,8]],{ch:"x_martialgirl",L:30,sk:["lei2","lei3","lei4"],waves:false});P2.td.me.sp=100;
  assert.deepEqual(J(G.targets(P2,"lei2",[],C)),[Q(2,8)]);castOk(P2,{k:"lei2",tg:[Q(2,8)]});assert.equal(P2.td.q[0].raw,G.dmg(12,115,10),"炮架是敵子：8＋4");
  const P3=custom(1,[["K",5,1],["k",4,10],["R",1,1],["N",3,3],["p",4,5]],{ch:"x_miaogirl",L:30,sk:["luo2"],waves:false});P3.td.me.sp=100;castOk(P3,{k:"luo2",tg:[Q(4,5)]});assert.equal(P3.td.q[0].raw,G.dmg(10,105,10));
  const P4=custom(1,[["K",5,1],["k",4,10],["R",1,1],["p",1,5],["n",1,8],["c",1,9],["r",1,10]],{ch:"x_swordboy",L:30,sk:["qi5"],waves:false});P4.td.me.sp=100;
  castOk(P4,{k:"qi5",tg:[Q(1,1),"col"]});assert.equal(P4.td.q[0].raw,G.dmg(18,110,10),"最近 3 顆合成一擊 6×3");
  /* 回靈：勇往直前 */
  const P5=custom(1,[["K",5,1],["k",4,10],["R",1,1],["P",3,4]],{ch:"x_bing",L:30,sk:["bu2"],waves:false}),t5=P5.td;mv(P5,Q(3,4),Q(3,5));bq(P5);const s0=t5.me.sp;castOk(P5,{k:"bu2"});assert.equal(t5.me.sp,s0+6);
  assert.equal(G.why(P5,"gheal",C),"這回合已經用過一招（每回合最多一招）","零費回靈招也占這回合的招");
  t5.me.inc=10;t5.sk1=-1;t5.cd={};assert.match(G.why(P5,"bu2",C),/收入已滿/)});

test("招式：九宮守心、近侍護帥、揚州快步、輪牌護身、青玉護棚、雙燕斜護、拐彎避風、驛鈴回氣、跑腿賺錢、盾陣回靈、庭院小息、當票回春", ()=>{
  /* 九宮守心：帥在九宮正中心才能放，之後每回合結束回 4、最多 3 次，離開就停 */
  const A=custom(1,[["K",5,2],["k",4,10],["R",1,1]],{ch:"x_shuai",L:30,sk:["shen5","shen2","shen4"],waves:false}),a=A.td;a.me.hp=50;castOk(A,{k:"shen5"});
  for(let i=0;i<4;i++)round(A);assert.equal(a.me.hp,62,"回 4 ×3 次");
  a.me.hp=80;a.cd={};a.me.sp=100;castOk(A,{k:"shen4"});assert.equal(a.me.hp,Math.min(a.me.max,92),"HP 一半以上回 12");
  const A2=custom(1,[["K",5,1],["k",4,10],["R",1,1]],{ch:"x_shuai",L:30,sk:["shen4","shen2"],waves:false});A2.td.me.hp=40;A2.td.me.sp=100;castOk(A2,{k:"shen4"});assert.equal(A2.td.me.hp,57,"不到一半回 17");
  A2.td.last.b={ck:true};A2.td.sk1=-1;castOk(A2,{k:"shen2"});assert.equal(A2.td.me.hp,57+12,"上一步被將軍：庭院小息回 12");
  /* 近侍護帥：帥斜角相鄰的仕各 12 */
  const B=custom(1,[["K",5,2],["k",4,10],["R",1,1],["A",4,1],["A",6,3]],{ch:"x_shi",L:30,sk:["tie4","tie5"],waves:false});B.td.me.sp=100;castOk(B,{k:"tie4"});assert.equal(B.td.me.sh.v,24);
  B.td.me.lastLoss=3;B.td.sk1=-1;assert.match(G.why(B,"tie5",C),/沒被扣到 4/);B.td.me.lastLoss=4;const s0=B.td.me.sp;castOk(B,{k:"tie5"});assert.equal(B.td.me.sp,s0+6);
  /* 揚州快步：下一個其他付費招 −15、最低 10 */
  const D=custom(1,[["K",5,1],["k",4,10],["R",1,1],["P",3,4]],{ch:"x_bing",L:30,sk:["bu5","bu1","bu3"],waves:false});D.td.me.sp=100;castOk(D,{k:"bu5"});assert.equal(D.td.me.sp,95);round(D);
  assert.equal(G.costOf(D.td,"bu1"),15);assert.equal(G.costOf(D.td,"bu3"),10,"最低 10");castOk(D,{k:"bu3"});assert.equal(D.td.me.sp,95+4-10+0,"跑腿賺錢只付 10");assert.equal(G.costOf(D.td,"bu1"),30,"用過一次就沒了");
  D.td.me.hp=80;mv(D,Q(3,4),Q(3,5));assert.equal(D.td.me.hp,84,"兵往前走一步回 4");
  /* 輪牌護身：這顆俥被擒少 10；雙燕斜護：一顆被擒，另一顆下次被擒少 10 */
  const E=custom(1,[["K",5,1],["k",4,10],["R",1,1],["R",9,3],["r",9,10]],{ch:"x_swordboy",L:30,sk:["qi3"],waves:false});E.td.me.sp=100;castOk(E,{k:"qi3",tg:[Q(9,3)]});rq(E);mv(E,Q(9,10),Q(9,3));
  const he=E.td.ev.filter(x=>x.k==="hit").pop();assert.equal(he.raw,Math.max(0,G.dmg(14,90,E.td.me.def)-10),"輪牌護身少 10");assert.equal(he.cut,Math.min(10,G.dmg(14,90,E.td.me.def)));
  const F=custom(1,[["K",5,1],["k",4,10],["R",1,1],["N",7,3],["C",8,4],["r",7,10],["r",8,10]],{ch:"x_spiritgirl",L:30,sk:["tian5","tian2"],waves:false});F.td.me.sp=100;
  castOk(F,{k:"tian5",tg:[Q(7,3),Q(8,4)]});rq(F);mv(F,Q(7,10),Q(7,3));rq(F);mv(F,Q(8,10),Q(8,4));
  const g0=F.td.ev.filter(x=>x.k==="cap"&&x.by==="b");assert.equal(g0.length,2);assert.equal(g0[0].cut,0,"第一顆被擒照扣");assert.equal(g0[1].cut,Math.min(10,G.dmg(10,90,F.td.me.def)),"結對的另一顆下次被擒少 10");
  /* 青玉護棚：入侵傷害先扣 18 額度 */
  const H=custom(1,[["K",5,1],["k",4,10],["R",1,1],["p",3,5,"inv"]],{ch:"x_spiritgirl",L:30,sk:["tian2"],waves:false});H.td.arm[H.td.ids[Q(3,5)]]=1;H.td.me.sp=100;castOk(H,{k:"tian2"});const hh=H.td.me.hp;round(H);
  assert.equal(H.td.me.hp,hh,"9 點入侵全被減傷額度吃掉");assert.equal(H.td.buf.qyhp.left,18-G.dmg(12,90,H.td.me.def));
  /* 拐彎避風／驛鈴回氣 */
  const K=custom(1,[["K",5,1],["k",4,10],["R",1,1],["N",2,1]],{ch:"x_miaogirl",L:30,sk:["luo3","luo4"],waves:false});K.td.me.sp=100;assert.match(G.why(K,"luo3",C),/不是傌/);mv(K,Q(2,1),Q(3,3));bq(K);castOk(K,{k:"luo3"});assert.equal(K.td.me.sh.v,20);
  round(K);K.td.me.hp=80;castOk(K,{k:"luo4"});assert.equal(K.td.me.hp,86);assert.equal(K.td.buf.luo4,1,"下一次復活再回 10")});

test("星樞招：護盾（受擊 ≥8 開，20 靈、冷卻 3；目前沒有關卡用）；卒將號令預告一回合、號令卒被吃就取消（不換目標）", ()=>{
  const P=custom(3,[["K",5,1],["k",4,10],["R",1,1],["r",1,9],["p",9,7]],{waves:false}),td=P.td;assert.deepEqual(J(td.esk),[],"第 3 關星樞不放招（11/15 版本 B）");td.esk=["esh"];mv(P,Q(1,1),Q(1,9));assert.ok(td.q[0].raw>=8);
  const A=C.legal(P.board,"b").find(([f,t])=>!P.board[t]);mv(P,A[0],A[1]);assert.ok(td.ev.some(e=>e.k==="esk"&&e.id==="esh"));assert.equal(td.ecd.esh,3);
  const P2=custom(6,[["K",5,1],["k",4,10],["R",1,1],["R",3,1],["p",3,5,"inv"]],{waves:false}),t2=P2.td;t2.en.sp=60;rq(P2);bq(P2);
  assert.ok(t2.fx&&t2.fx.id==="zjhl","有號令卒在你的半場：結算後宣告");assert.equal(t2.fx.at,t2.rnd+1,"下一回合結束發動");
  mv(P2,Q(3,1),Q(3,5));bq(P2);assert.equal(t2.fx,null);assert.ok(t2.ev.some(e=>e.k==="eskOff"),"號令卒被吃：取消");
  const P3=custom(6,[["K",5,1],["k",4,10],["R",1,1],["p",3,5,"inv"]],{waves:false}),t3=P3.td;t3.en.sp=60;round(P3);const h=t3.me.hp;round(P3);assert.ok(t3.ev.some(e=>e.k==="eskHit"));assert.ok(h-t3.me.hp>=G.dmg(28,105,20))});

test("星樞選步：一步能打空你的星核就打；會被你下一步將死的步不走；全部合法步都評（不在 Pikafish 前幾名也算）", ()=>{
  const P=custom(1,[["K",5,1],["k",4,10],["R",9,9],["N",6,3],["r",6,9],["p",1,7]],{waves:false}),td=P.td;td.me.hp=2;mv(P,Q(9,9),Q(9,8));
  const cfg=G.engine(P,C),u=G.pick({lines:[{mv:C.iccs(Q(1,7),Q(1,6)),v:50}]},cfg,()=>0);assert.equal(u,C.iccs(Q(6,9),Q(6,3)),"擒傌把你的星核打空（不在引擎給的候選裡也找得到）");
  /* 會被將死的步不走：黑將 d10、砲 c10 擋住底線；紅俥 i9 封住 d9、a5 的俥等著沉底。砲離開底線（還有幾步卒）會讓紅方一步將死 */
  const b=new Array(90).fill(null);for(const[p,lu,xi]of[["K",5,1],["k",4,10],["R",9,9],["R",1,5],["p",9,6],["c",3,10]])b[Q(lu,xi)]=p;
  const P2={board:b,turn:"r",moves:[],human:"r",ed:[]};P2.pos=[C.fen(b,"r")];P2.td=G.boot({mode:G.MODE,lv:1,ch:"x_swordboy",L:1},P2,C);P2.td.waves=[];P2.turn="b";P2.pos=[C.fen(b,"b")];
  const cfg2=G.engine(P2,C),bad=C.legal(b,"b").filter(([f,t])=>G.lethalR(G.simB(cfg2,f,t).P2,C).mate).map(([f,t])=>C.iccs(f,t));
  assert.ok(bad.length>=3&&bad.length<C.legal(b,"b").length,"這個局面有會被將死的步、也有安全的步");const u2=G.pick({lines:bad.map((mv,i)=>({mv,v:200-i}))},cfg2,()=>0);
  assert.ok(!bad.includes(u2),"引擎把會被將死的步排前面也不選："+u2)});

test("決定性重播：同一個種子、同一串動作，td 完全一樣（傷害、靈力、冷卻、波次、事件 ID）", ()=>{
  const run=seed=>{let a=seed>>>0;const R=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
    const P=game(3,{ch:"x_martialgirl",L:23});for(let i=0;i<40&&!P.td.over;i++){const L=C.legal(P.board,P.turn);if(!L.length)break;const m=L[Math.floor(R()*L.length)];const e=mv(P,m[0],m[1]);if(e&&e.end)break;if(C.judgeState(P))break}return JSON.stringify(P.td)};
  assert.equal(run(7),run(7));assert.notEqual(run(7),run(8))});

test("〔原始碼〕接線：m.html include、XQ_TD 包一層只轉星門圍城、舊版 bhtdIs 排除、平面棋盤、07bh 結算與結果視窗、入口卡片、local.js 部署換手、testkinds 登記", ()=>{
  assert.match(rd("xiangqi-db/m.html"),/\/\/#include m\/07bhf-bossfx\.js\n\/\/#include m\/07bhg-gatesiege\.js/);
  assert.match(SRC,/window\.XQ_TD=Object\.assign\(\{\},O,\{gsv:1/);assert.match(SRC,/td\.mode===GSV\.MODE/);
  const T=rd("xiangqi-db/m/07bht-td.js");assert.match(T,/st\.td\.mode!=="gate-siege-v1"/);assert.match(T,/gsvFlat\(st\)/);assert.match(T,/gsvCard\(\)/);assert.match(T,/\[data-gsv\]/);
  const B=rd("xiangqi-db/m/07bh-blackhole.js");assert.match(B,/gsvTick\(st\)/);assert.match(B,/gsvEnd\(st\)/);assert.match(B,/gsvResult\(st,win,draw0,XPR\)/);
  assert.match(LOC,/if\(e\.ps\)S\.turn=S\.turn==="r"\?"b":"r"/);assert.match(LOC,/if\(o\.pass&&!P\.result\)setTimeout\(playEngine,0\)/);
  assert.match(rd("xiangqi-lab/tools/testkinds.js"),/"test-gate-siege\.js"/);assert.match(SRC,/存檔鍵 gsv/)});
