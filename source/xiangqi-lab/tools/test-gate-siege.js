// 黑洞・星門圍城 gate-siege-v1 候選（開發者 11/15；m/07bhg-gatesiege.js 的 GSV 純規則）單元測試。不開瀏覽器、不跑引擎：
//   同式傷害與數值盾（提案一第十節的算術例）、關卡子數／星門／補給點合法、紅 8 子＋後備部署（用掉主要行動、local.js tdRebuild 重放換手）、
//   擒子／將軍／入侵／護陣／截援、靈力收入上限、回復總量、冷卻、每回合一招、星核同批次同時歸零判和、八回合無進展、35 招逐招、星樞招、星樞選步分層。
//   11/15 第二章「俥路調度」第 7～12 關：六關資料與學習點、長驅直入、斷路令、護陣車、星樞不長將與留著預告的車、盤上記號、選關分章。
// 用法：node --test xiangqi-lab/tools/test-gate-siege.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const SRC=rd("xiangqi-db/m/07bhg-gatesiege.js");
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(SRC+"\n;this.GSV=GSV;",ctx);const G=ctx.GSV;
const MAIN=G.LVN.filter(n=>n<=12);   /* 11/15 七星改版第二期：主線第 1～12 關；序章 31～39 的斷言在 test-party-prologue.js */
const J=x=>JSON.parse(JSON.stringify(x));
const Q=(lu,xi)=>G.LSQ(lu,xi);
/* local.js 的 tdRebuild 原文拿出來測（同一份程式） */
const LOC=rd("xiangqi-lab/src/local.js");
const tdRebuild=new Function("C","parseFen","fen","START",LOC.slice(LOC.indexOf("function tdRebuild(S){"),LOC.indexOf("S.repetition=null;return S}")+"S.repetition=null;return S}".length)+";return tdRebuild")(C,C.parseFen,C.fen,C.START);

function game(lv,o){o=o||{};const start=G.startFen(lv,C),P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];
  P.td=G.boot({mode:G.MODE,lv,ch:o.ch||"x_swordboy",L:o.L||1,sk:o.sk,hard:o.hard},P,C);return P}
/* 自訂盤面：pcs＝[[子,路,線,標記]…]；開局資料照第 lv 關（數值、波次），盤面換成自訂的；waves:false＝不要援軍 */
function custom(lv,pcs,o){o=o||{};const b=new Array(90).fill(null);for(const[p,lu,xi]of pcs)b[Q(lu,xi)]=p;const start=C.fen(b,"r").split(" ")[0];
  const P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];
  P.td=G.boot({mode:G.MODE,lv,ch:o.ch||"x_swordboy",L:o.L||1,sk:o.sk,hard:o.hard},P,C);for(const[p,lu,xi,tg]of pcs){const id=P.td.ids[Q(lu,xi)];P.td.meta[id].tag=tg||""}
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

test("七星數值（提案一 5.4）＋等級加成：Lv1 原值、Lv100 最多 HP+80%、ATK+35、DEF+18（11/15 七星改版放大，原本 +5%／+5／+5）；開場靈力 35、每回合 4", ()=>{
  const T={x_swordboy:[105,110,20,90],x_spiritgirl:[100,95,45,100],x_martialgirl:[95,115,20,100],x_miaogirl:[95,105,25,100],x_shuai:[90,100,30,110],x_shi:[115,90,50,90],x_bing:[100,105,20,100]};
  for(const k in T){const s=G.stats(k,1),z=G.stats(k,100);assert.deepEqual([s.hp,s.atk,s.def,s.sp],T[k],k);assert.equal(z.hp,Math.round(T[k][0]*1.8));assert.equal(z.atk,T[k][1]+35);assert.equal(z.def,T[k][2]+18);assert.equal(z.sp,T[k][3],"靈力容量不隨修為長");assert.equal(s.sp0,35);assert.equal(s.rg,4)}});

test("關卡：第 1～12 關開局＋星門合法（敵剛好 16 子、紅 8＋後備 8、星門在敵半場、補給點各棋種都有合法點、不照面、沒人被將）", ()=>{
  assert.deepEqual(J(MAIN),[1,2,3,4,5,6,7,8,9,10,11,12],"11/15 補第 2、4、5 關、第二章第 7～12 關");assert.deepEqual(J(G.LVN.filter(n=>n>12)),[31,32,33,34,35,36,37,38,39],"11/15 七星改版：序章 31～39");
  for(const n of MAIN){assert.deepEqual(J(G.lvCheck(n,C)),[],"第 "+n+" 關");const pl=G.plan(n),b=G.startBoard(n);
    assert.equal(pl.red.length,8);assert.equal(pl.res.length,8);assert.equal(pl.open.length+pl.waves.length,16,"敵方總預算 16");
    assert.equal(b.filter(x=>x&&x===x.toLowerCase()).length,pl.open.length);for(const w of pl.waves)assert.equal(G.spawnOk(b,w.p,w.sq,C),"","開局盤上每顆援軍的門都能落")}
  assert.equal(G.plan(1).open.length,8);assert.equal(G.plan(3).open.length,9);assert.equal(G.plan(6).open.length,10);
  assert.ok(G.plan(3).open.filter(x=>x[2]==="guard").length===2,"第 3 關兩顆護陣卒");assert.ok(G.LV[3].open.length>3,"取消空城式開場");
  assert.ok(G.LV[1].waves.some(w=>w.at===2)&&G.LV[1].waves.some(w=>w.at===5),"第 1 關援軍第 2、5 回合");assert.ok(G.LV[1].waves[1].p.some(x=>x[0]==="n"),"第二波帶傌");
  const P=game(1);assert.equal(P.td.me.sp,35);assert.equal(P.td.en.sp,25);assert.equal(game(6).td.en.sp,35);
  assert.deepEqual(J(G.fore(P.td).map(g=>g.at)),[2,5],"開局就看得到前兩波");assert.ok(G.fore(P.td)[0].inR>=2,"至少提前兩個完整回合")});

test("第 2、4、5 關照提案一第七節：數值、開場子數、援軍回合、深度；每關的學習點擺得出來（左先右後、雙門同時、三段解鎖）", ()=>{
  const T={2:[110,95,20,9,[2,4,7],2],4:[135,100,30,10,[2,4,6],3],5:[150,110,40,10,[2,4,6],4]};
  for(const n in T){const V=G.LV[n],pl=G.plan(+n);assert.deepEqual(J([V.hp,V.atk,V.def,pl.open.length,V.waves.map(w=>w.at),V.depth]),T[n],"第 "+n+" 關");assert.deepEqual(J(G.lvCheck(+n,C)),[]);
    assert.ok(V.say&&V.tip&&V.th,"有一句開場、輸了的提示、主題")}
  assert.deepEqual([2,4,5].map(n=>G.LV[n].nm),["墨河微瀾","雙門夾道","星樞列陣"],"關名照提案二第一章");
  /* 第 2 關：入侵卒左翼先到（開場 c7＋第 2 回合左門）、右翼後到（第 4 回合右門） */
  const W2=G.plan(2).waves.filter(w=>w.tag==="inv");assert.deepEqual(J(W2.map(w=>[w.at,G.gateNm(w.sq)])),[[2,"左門"],[4,"右門"]]);
  assert.ok(G.plan(2).open.some(([p,q,t])=>t==="inv"&&G.gateNm(q)==="左門"),"開場那顆入侵卒在左翼");
  /* 第 4 關：每一波都是左右兩扇門同時落；第 2 回合兩顆入侵卒一起來；開場一匹奪靈馬 */
  for(const at of[2,4,6]){const ws=G.plan(4).waves.filter(w=>w.at===at);assert.deepEqual(J(ws.map(w=>G.gateNm(w.sq)).sort()),["右門","左門"],`第 ${at} 回合兩門同時`)}
  assert.equal(G.plan(4).waves.filter(w=>w.at===2&&w.tag==="inv").length,2);assert.deepEqual(J(G.plan(4).open.filter(x=>x[2]==="drain").map(x=>x[0])),["n"],"奪靈馬是一匹馬");
  /* 第 5 關：開場兩顆護陣、第 2 回合兩顆入侵；開局沒有大招，60%／30% 才解鎖 */
  assert.equal(G.plan(5).open.filter(x=>x[2]==="guard").length,2);assert.equal(G.plan(5).waves.filter(w=>w.at===2&&w.tag==="inv").length,2);
  const P5=game(5);assert.deepEqual(J(P5.td.esk),[]);assert.deepEqual(J(P5.td.phs),[{hp:.6,esk:"pao"},{hp:.3,esk:"zjhl"}]);assert.equal(G.defOf(P5.td,"b"),80)});

test("七角色 × 十二關 × Lv1／Lv23 都能開局：有合法起手、帶得到本命招、通用招與部署都在", ()=>{
  for(const ch in G.CH)for(const n of MAIN)for(const L of[1,23]){const P=game(n,{ch,L});assert.ok(C.legal(P.board,"r").length>0);assert.ok(P.td.sk.length>=1&&P.td.sk.length<=4);
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
  mv(P,Q(1,1),Q(1,4));bq(P);assert.equal(G.why(P,"qi2",C),"");castOk(P,{k:"qi2"});assert.equal(td.q[0].raw,G.dmg(6,G.stats("x_swordboy",30).atk,10),"直走 3 格 ×2＝6");
  const P2=custom(1,[["K",5,1],["k",4,10],["R",1,1],["C",2,3],["p",2,6],["n",2,8]],{ch:"x_martialgirl",L:30,sk:["lei2","lei3","lei4"],waves:false});P2.td.me.sp=100;
  assert.deepEqual(J(G.targets(P2,"lei2",[],C)),[Q(2,8)]);castOk(P2,{k:"lei2",tg:[Q(2,8)]});assert.equal(P2.td.q[0].raw,G.dmg(12,G.stats("x_martialgirl",30).atk,10),"炮架是敵子：8＋4");
  const P3=custom(1,[["K",5,1],["k",4,10],["R",1,1],["N",3,3],["p",4,5]],{ch:"x_miaogirl",L:30,sk:["luo2"],waves:false});P3.td.me.sp=100;castOk(P3,{k:"luo2",tg:[Q(4,5)]});assert.equal(P3.td.q[0].raw,G.dmg(10,G.stats("x_miaogirl",30).atk,10));
  const P4=custom(1,[["K",5,1],["k",4,10],["R",1,1],["p",1,5],["n",1,8],["c",1,9],["r",1,10]],{ch:"x_swordboy",L:30,sk:["qi5"],waves:false});P4.td.me.sp=100;
  castOk(P4,{k:"qi5",tg:[Q(1,1),"col"]});assert.equal(P4.td.q[0].raw,G.dmg(18,G.stats("x_swordboy",30).atk,10),"最近 3 顆合成一擊 6×3");
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

test("奪靈馬（第 4 關）：真的擒到子才扣你 8 靈力（不夠就扣到 0）；沒標記的馬不扣；只是走到旁邊不扣", ()=>{
  const pcs=tag=>[["K",5,1],["k",4,10],["R",1,1],["N",3,3],["n",2,5,tag],["p",9,7]];
  const P=custom(4,pcs("drain"),{waves:false}),td=P.td;rq(P);assert.equal(td.me.sp,35);mv(P,Q(2,5),Q(3,3));
  const e=td.ev.find(x=>x.k==="drain");assert.ok(e,"有奪靈事件（跳字用）");assert.equal(e.n,G.DRAIN);assert.equal(e.sq,Q(3,3));assert.equal(td.me.sp,35-8+4,"扣 8、回合結束照常回 4");
  const P2=custom(4,pcs(""),{waves:false});rq(P2);mv(P2,Q(2,5),Q(3,3));assert.ok(!P2.td.ev.some(x=>x.k==="drain"),"普通馬擒子不扣靈");assert.equal(P2.td.me.sp,39);
  const P3=custom(4,pcs("drain"),{waves:false});P3.td.me.sp=3;rq(P3);mv(P3,Q(2,5),Q(3,3));assert.equal(P3.td.ev.find(x=>x.k==="drain").n,3,"靈力不夠 8 就扣到 0");
  const P4=custom(4,pcs("drain"),{waves:false});rq(P4);mv(P4,Q(2,5),Q(1,3));assert.ok(!P4.td.ev.some(x=>x.k==="drain"),"沒擒子不扣");assert.equal(P4.td.me.sp,39)});

test("隔山星砲（第 5 關新大招）：預告一回合、鎖定砲／砲架／目標；三顆都在、只隔這個架、砲能合法吃到才發動；移走目標、吃砲、吃架（換一顆子當架也不算）、多擋一子、砲被定身都取消", ()=>{
  /* 黑砲 i8、砲架黑卒 i6、目標紅傌 i3；a 線的紅俥用來原地來回或跑去破解 */
  const mk=(extra,o)=>{const P=custom(5,[["K",5,1],["k",4,10],["R",1,1],["c",9,8],["p",9,6],["N",9,3],...(extra||[])],Object.assign({waves:false},o));P.td.esk=["pao"];P.td.en.sp=60;return P};
  const P=mk(),td=P.td;round(P);
  assert.ok(td.fx&&td.fx.id==="pao","結算後宣告");assert.equal(td.fx.at,td.rnd+1,"下一回合結束才發動（預告一整回合）");assert.equal(td.en.sp,60+4-40,"付 40 靈");assert.equal(td.ecd.pao,4);
  assert.deepEqual([td.fx.src,td.fx.scr,td.fx.tg],[td.ids[Q(9,8)],td.ids[Q(9,6)],td.ids[Q(9,3)]],"鎖定三顆子的 ID");assert.ok(td.ev.some(e=>e.k==="esk"&&e.id==="pao"&&e.sq===Q(9,8)));
  const pv=G.preview(td,P.board,C);assert.deepEqual(J(pv.L.map(x=>[x.k,x.id,x.sq,x.raw])),[["esk","pao",Q(9,3),G.dmg(30,110,20)]],"畫面「本輪若不處理」跟結算同一個算式");
  const h=td.me.hp;round(P);assert.ok(td.ev.some(e=>e.k==="eskHit"&&e.id==="pao"));assert.equal(h-td.me.hp,G.dmg(30,110,20),"三顆都在：基礎 30");assert.equal(td.fx,null);
  assert.ok(td.ev.some(e=>e.k==="hit"&&e.why==="esk"&&e.id==="pao"),"跳字事件帶招名");
  const off=(P,doIt,msg)=>{round(P);assert.equal(P.td.fx&&P.td.fx.id,"pao");const h=P.td.me.hp;doIt(P);bq(P);assert.equal(P.td.fx,null);assert.ok(P.td.ev.some(e=>e.k==="eskOff"&&e.id==="pao"),msg);assert.equal(P.td.me.hp,h,msg+"：不扣血")};
  off(mk(),P=>mv(P,Q(9,3),Q(8,1)),"目標走開");
  off(mk([["R",1,8]]),P=>mv(P,Q(1,8),Q(9,8)),"吃掉砲");
  off(mk([["R",1,6]]),P=>mv(P,Q(1,6),Q(9,6)),"吃掉砲架：紅俥站上去也是一個架，但不是鎖定的那顆，不換架");
  off(mk([["R",1,5]]),P=>mv(P,Q(1,5),Q(9,5)),"中間多擋一子（炮架數改變）");
  off(mk([],{ch:"x_martialgirl"}),P=>{P.td.me.sp=100;castOk(P,{k:"lei1",tg:[Q(9,8)]});rq(P)},"砲被定身：不能合法吃到目標");
  /* 沒有砲能合法隔一子吃到紅子（帥不算）：不宣告、不扣星樞靈力 */
  const P6=custom(5,[["K",5,1],["k",4,10],["R",1,1],["c",9,8],["N",9,3]],{waves:false});P6.td.esk=["pao"];P6.td.en.sp=60;round(P6);assert.equal(P6.td.fx,null);assert.equal(P6.td.en.sp,64)});

test("分段（第 5 關）：星樞 HP 降到 60% 解鎖隔山星砲、30% 解鎖卒將號令；只解鎖不當下打、不加兵；還沒發動的預告不被蓋掉", ()=>{
  const P=custom(5,[["K",5,1],["k",4,10],["R",1,1],["c",9,8],["p",9,6],["N",9,3],["p",3,5,"inv"]],{waves:false}),td=P.td;td.en.sp=100;
  round(P);assert.deepEqual(J(td.esk),[],"91 以上還在第一段");assert.equal(td.fx,null,"第一段沒有大招（號令卒在場也不放）");
  td.en.hp=91;round(P);assert.deepEqual(J(td.esk),[]);
  td.en.hp=90;const h=td.me.hp,nb=P.board.filter(Boolean).length;round(P);assert.deepEqual(J(td.esk),["pao"],"剛好 60%：解鎖");assert.ok(td.ev.some(e=>e.k==="phase"&&e.n===2&&e.id==="pao"));
  assert.equal(td.me.hp,h-G.dmg(12,110,20),"解鎖那一批只有原本的入侵傷害，沒有大招傷害");assert.equal(P.board.filter(Boolean).length,nb,"不加兵");assert.equal(td.fx&&td.fx.id,"pao","解鎖後照預告規則宣告（下一回合才打）");
  td.en.hp=44;td.fx.at=td.rnd+2;const fx0=J(td.fx);round(P);assert.deepEqual(J(td.esk),["pao","zjhl"],"30%：再解鎖卒將號令");assert.ok(td.ev.some(e=>e.k==="phase"&&e.n===3&&e.id==="zjhl"));
  assert.deepEqual(J(td.fx),fx0,"還沒發動的隔山星砲不被新階段蓋掉");
  /* 一次掉過兩個門檻：兩段一起解鎖 */
  const P2=custom(5,KS,{waves:false});P2.td.en.hp=10;round(P2);assert.deepEqual(J(P2.td.esk),["pao","zjhl"]);assert.equal(P2.td.phn,2);
  /* 舊存檔沒有 phs：照舊 */
  const P3=custom(6,KS,{waves:false});delete P3.td.phs;delete P3.td.phn;P3.td.en.hp=10;assert.doesNotThrow(()=>round(P3));assert.deepEqual(J(P3.td.esk),["zjhl"])});

/* ===== 第二章「俥路調度」第 7～12 關（11/15）===== */
test("第二章「俥路調度」第 7～12 關：章與關名照提案二第 3 節；數值在提案範圍內；每關的學習點擺得出來；深度不超過 4；星樞不長將（arep）十二關都開（第一章由 GSV.AREP1 一個開關管），第 1～6 關的數值沒動", ()=>{
  assert.deepEqual(J(G.CHP.map(c=>[c.n,c.t,c.nm,c.lv])),[[0,"序章","星槎序章",[31,32,33,34,35,36,37,38,39]],[1,"第一章","星門入侵",[1,2,3,4,5,6]],[2,"第二章","俥路調度",[7,8,9,10,11,12]]]);
  assert.deepEqual(J([].concat(...G.CHP.map(c=>c.lv)).sort((a,b)=>a-b)),J(G.LVN),"每一關都在某一章裡、沒有重複");
  /* 關名、星樞 HP／ATK／DEF、開場靈力、會用的招、敵開場子數、援軍回合 */
  const T={7:["直路守口",120,95,25,35,["cqzr"],10,[3,5,7]],8:["橫俥回援",125,100,25,35,["cqzr"],9,[2,4,6]],9:["留一道退路",130,100,25,40,["dll"],9,[2,4,6]],
    10:["交換要道",150,95,25,35,["cqzr"],10,[2,4,6]],11:["一俥兩用",150,100,25,40,["dll","cqzr"],10,[2,4,6]],12:["守關・斷路營",200,100,40,35,["dll","cqzr"],10,[2,4,6]]};
  for(const n in T){const V=G.LV[n],pl=G.plan(+n);assert.deepEqual(J([V.nm,V.hp,V.atk,V.def,V.esp0,V.esk,pl.open.length,V.waves.map(w=>w.at)]),T[n],"第 "+n+" 關");assert.deepEqual(J(G.lvCheck(+n,C)),[]);
    assert.ok(V.depth<=4,"深度不超過 4（手機）");assert.equal(V.arep,1);assert.ok(V.say&&V.tip&&V.th,"有一句開場、輸了的提示、主題");
    assert.ok(V.hp>=100&&V.hp<=(V.boss?220:180)&&(!V.boss||V.hp>=140),"提案二：一般關 100–180、章末 140–220");
    for(const k of V.esk)assert.ok(G.ESK[k].base>=24&&G.ESK[k].base<=36&&G.ESK[k].cost>0&&G.ESK[k].cd>0,"提案一：敵方大招基礎 24～36、要付靈力、有冷卻")}
  /* 11/15 開發者用選單決定：第一章也擋掉星樞長將（封測玩家不能等它自己判負）。第 1～6 關的關卡資料不帶旗標，由 AREP1 一個開關管（改回 0 就是下午的選步） */
  assert.equal(G.AREP1,1);for(const n of[1,2,3,4,5,6]){assert.ok(!G.LV[n].arep);assert.equal(game(n).td.arep,G.AREP1?1:0)}assert.equal(game(7).td.arep,1);assert.ok(G.LV[12].boss&&!G.LV[11].boss);
  assert.deepEqual(J([1,2,3,4,5,6].map(n=>[G.LV[n].hp,G.LV[n].atk,G.LV[n].def,G.LV[n].depth])),[[100,90,10,2],[110,95,20,2],[120,100,25,3],[135,100,30,3],[150,110,40,4],[160,105,30,3]],"第 1～6 關的數值這次沒動");
  const open=(b,q)=>{for(let r=Math.floor(q/9)+1;r<10;r++)if(b[r*9+q%9])return false;return true},gate=(n,f)=>G.plan(n).waves.filter(f);
  /* 7：車落下那一刻直路一路空到你的底線；落下前至少兩回合看得到；入侵卒比車晚到（只考守口一件事） */
  const r7=gate(7,w=>w.p==="r")[0];assert.ok(open(G.startBoard(7),r7.sq));assert.ok(gate(7,w=>w.tag==="inv").every(w=>w.at>r7.at));assert.ok(G.fore(game(7).td)[0].inR>=2);
  /* 8：車（直路也是空的）和一顆入侵卒同一回合落下、在不同翼 */
  const r8=gate(8,w=>w.p==="r")[0],i8=gate(8,w=>w.tag==="inv"&&w.at===r8.at);assert.ok(open(G.startBoard(8),r8.sq));assert.equal(i8.length,1);assert.notEqual(G.gateNm(i8[0].sq),G.gateNm(r8.sq));
  /* 9：兩顆護陣卒引你深入、開場就夠靈力放斷路令 */
  assert.equal(G.plan(9).open.filter(x=>x[2]==="guard"&&x[0]==="p").length,2);assert.ok(G.LV[9].esp0>=G.ESK.dll.cost);
  /* 11：兩招都有、護陣＋入侵；12：兩顆護陣卒，每顆那一路都有一顆車（一顆開場就在、一顆從星門來） */
  assert.ok(G.plan(11).open.some(x=>x[2]==="guard")&&gate(11,w=>w.tag==="inv").length>=1);
  const g12=G.plan(12).open.filter(x=>x[2]==="guard").map(x=>x[1]%9),r12=[...G.plan(12).open.filter(x=>x[0]==="r").map(x=>x[1]),...gate(12,w=>w.p==="r").map(w=>w.sq)];
  assert.equal(g12.length,2);assert.deepEqual(J(r12.map(q=>q%9).sort()),J(g12.slice().sort()));assert.equal(G.plan(12).open.filter(x=>x[0]==="r").length,1)});

test("長驅直入（第二章新大招）：預告一回合、鎖定車和當時的格；車不動、直路一路空到你的底線才發動；擋一子（走棋或部署到補給點）、吃掉車、車離開原位（換到別條空路也不算）、車被定身都取消", ()=>{
  /* 黑車 i8（還沒過河）、i 路一路空到紅方底線；KS 的紅俥在 a 路原地來回 */
  const mk=(extra,o)=>{const P=custom(7,[...KS,["r",9,8],...(extra||[])],Object.assign({waves:false},o));P.td.en.sp=60;return P};
  const P=mk(),td=P.td,S=G.ESK.cqzr;assert.deepEqual(J(td.esk),["cqzr"],"第 7 關星樞帶長驅直入");round(P);
  assert.ok(td.fx&&td.fx.id==="cqzr","結算後宣告");assert.equal(td.fx.at,td.rnd+1,"下一回合結束才發動（預告一整回合）");assert.equal(td.en.sp,60+4-S.cost);assert.equal(td.ecd.cqzr,S.cd);
  assert.deepEqual([td.fx.src,td.fx.sq0],[td.ids[Q(9,8)],Q(9,8)],"鎖定車的 ID 和當時的格");assert.ok(td.ev.some(e=>e.k==="esk"&&e.id==="cqzr"&&e.sq===Q(9,8)));
  const raw=G.dmg(S.base,td.en.atk,td.me.def),pv=G.preview(td,P.board,C);assert.deepEqual(J(pv.L.map(x=>[x.k,x.id,x.sq,x.raw])),[["esk","cqzr",Q(9,1),raw]],"畫面「本輪若不處理」跟結算同一個算式；打在那條路的底線口");
  const h=td.me.hp;round(P);assert.ok(td.ev.some(e=>e.k==="eskHit"&&e.id==="cqzr"));assert.equal(h-td.me.hp,raw,"車沒動、路還空著：發動");assert.equal(td.fx,null);
  /* off：先有預告 → 紅方做一件事（doIt）→ 黑方走一步（預設將原地來回）→ 取消、沒發動；回這一回合掉了多少 HP */
  const off=(P,doIt,msg,blk)=>{round(P);assert.equal(P.td.fx&&P.td.fx.id,"cqzr",msg+"：先有預告");const h=P.td.me.hp;doIt(P);(blk||bq)(P);assert.equal(P.td.fx,null,msg);
    assert.ok(P.td.ev.some(e=>e.k==="eskOff"&&e.id==="cqzr"),msg);assert.ok(!P.td.ev.some(e=>e.k==="eskHit"),msg+"：沒發動");return h-P.td.me.hp};
  assert.equal(off(mk([["C",2,3]]),P=>mv(P,Q(2,3),Q(9,3)),"直路上擋一子"),0);
  assert.equal(off(mk(),P=>{const r=castOk(P,{k:"dep",p:"P",tg:[Q(9,4)]});assert.equal(r.pass,1)},"部署後備兵到那條路的補給點"),0);
  assert.equal(off(mk([["R",1,8]]),P=>mv(P,Q(1,8),Q(9,8)),"吃掉那顆車"),0);
  assert.equal(off(mk(),rq,"車離開原位（還在同一條路上也不算）",P=>mv(P,Q(9,8),Q(9,7))),0);
  assert.equal(off(mk(),rq,"車換到另一條空的直路：不換路",P=>mv(P,Q(9,8),Q(8,8))),0);
  assert.equal(off(mk([],{ch:"x_martialgirl"}),P=>{P.td.me.sp=100;castOk(P,{k:"lei1",tg:[Q(9,8)]});rq(P)},"車被定身"),0);
  /* 不宣告、不扣星樞靈力 */
  const no=(pcs,msg)=>{const P=custom(7,pcs,{waves:false});P.td.en.sp=60;round(P);assert.equal(P.td.fx,null,msg);assert.equal(P.td.en.sp,64,msg+"：不扣靈力")};
  no([...KS,["r",9,5]],"已經過河的車不算（沉到你那邊的車前面沒有格子可以擋）");no([...KS,["r",9,8],["P",9,4]],"直路上有你的子");no([...KS,["r",9,8],["p",9,6]],"直路上有它自己的子");
  /* 兩顆車都符合：挑最靠近河的 */
  const P2=custom(7,[...KS,["r",9,9],["r",6,8]],{waves:false});P2.td.en.sp=60;round(P2);assert.equal(P2.td.fx.sq0,Q(6,8))});

test("斷路令（第二章新大招）：預告一回合、鎖定你最深入的那顆俥；下回合結束還在敵方半場才發動；退回自己半場、俥被吃、飛燕還巢拉回底線都取消，不換目標", ()=>{
  const mk=(extra,o)=>custom(9,[...KS,["R",9,7],...(extra||[])],Object.assign({waves:false},o));
  const P=mk(),td=P.td,S=G.ESK.dll;assert.deepEqual(J(td.esk),["dll"],"第 9 關星樞帶斷路令");assert.ok(td.en.sp>=S.cost,"開場就夠靈力");const sp0=td.en.sp;round(P);
  assert.ok(td.fx&&td.fx.id==="dll","你的俥在敵方半場：結算後宣告");assert.equal(td.fx.at,td.rnd+1);assert.equal(td.fx.src,td.ids[Q(9,7)]);assert.equal(td.en.sp,sp0+4-S.cost);assert.equal(td.ecd.dll,S.cd);
  const raw=G.dmg(S.base,td.en.atk,td.me.def);assert.deepEqual(J(G.preview(td,P.board,C).L.map(x=>[x.k,x.id,x.sq,x.raw])),[["esk","dll",Q(9,7),raw]]);
  const h=td.me.hp;round(P);assert.ok(td.ev.some(e=>e.k==="eskHit"&&e.id==="dll"));assert.equal(h-td.me.hp,raw,"俥還在敵方半場：發動");
  const off=(P,doIt,msg,blk)=>{round(P);assert.equal(P.td.fx&&P.td.fx.id,"dll",msg+"：先有預告");const h=P.td.me.hp;doIt(P);(blk||bq)(P);assert.equal(P.td.fx,null,msg);
    assert.ok(P.td.ev.some(e=>e.k==="eskOff"&&e.id==="dll"),msg);assert.ok(!P.td.ev.some(e=>e.k==="eskHit"),msg+"：沒發動");return h-P.td.me.hp};
  assert.equal(off(mk(),P=>mv(P,Q(9,7),Q(9,5)),"俥退回自己的半場"),0);
  const P3=mk([["r",9,10]]);assert.equal(off(P3,rq,"俥被吃（只扣被擒那一擊，不扣斷路令）",P=>mv(P,Q(9,10),Q(9,7))),G.dmg(14,P3.td.en.atk,P3.td.me.def));
  assert.equal(off(mk([],{ch:"x_spiritgirl"}),P=>{castOk(P,{k:"tian1",tg:[Q(9,7),Q(9,1)]});rq(P)},"飛燕還巢把俥拉回底線"),0);
  /* 兩顆俥都在敵方半場：鎖最深入的那顆（a8）；它退回來就取消，另一顆（i7）還在裡面也不換目標 */
  const P4=custom(9,[["K",5,1],["k",4,10],["R",1,8],["R",9,7]],{waves:false});mv(P4,Q(5,1),Q(5,2));bq(P4);assert.equal(P4.td.fx.src,P4.td.ids[Q(1,8)],"鎖最深入的");
  const h4=P4.td.me.hp;mv(P4,Q(1,8),Q(1,5));bq(P4);assert.ok(P4.td.ev.some(e=>e.k==="eskOff"&&e.id==="dll"));assert.equal(P4.td.me.hp,h4,"不換目標");
  /* 沒有俥在敵方半場：不宣告、不扣靈力 */
  const P5=custom(9,KS,{waves:false}),s5=P5.td.en.sp;round(P5);assert.equal(P5.td.fx,null);assert.equal(P5.td.en.sp,Math.min(100,s5+4))});

test("護陣車（第 10 關）：在場星樞 DEF+20，兌掉就拆陣；開局它有象看著、正捉著你的俥（兌是兌、不兌要另外想辦法）", ()=>{
  const P=custom(10,[...KS,["r",1,8,"guard"],["b",3,10]],{waves:false}),td=P.td,d0=G.LV[10].def;assert.equal(G.defOf(td,"b"),d0+20);assert.equal(G.guards(td),1);
  mv(P,Q(1,1),Q(1,8));assert.equal(G.defOf(td,"b"),d0,"拆陣 DEF−20");assert.ok(td.ev.some(e=>e.k==="guard"));assert.equal(td.q[0].raw,G.dmg(14,td.me.atk,d0+20),"吃護陣車那一擊照吃之前的防禦");
  mv(P,Q(3,10),Q(1,8));assert.ok(td.ev.some(e=>e.k==="cap"&&e.by==="b"&&e.vp==="R"),"象吃回＝兌俥");
  /* 真正的第 10 關開局 */
  const V=G.plan(10),g=V.open.filter(x=>x[2]==="guard");assert.deepEqual(J(g.map(x=>x[0])),["r"],"一顆護陣車");const sq=g[0][1],b=G.startBoard(10),R1=b.indexOf("R");
  assert.ok(C.legal(b,"b").some(([f,t])=>f===sq&&t===R1),"開局它就捉著你的俥");assert.ok(C.legal(b,"r").some(([f,t])=>f===R1&&t===sq),"你的俥也吃得到它");
  assert.ok(C.legal(C.make(b,R1,sq),"b").some(([,t])=>t===sq),"吃了會被吃回（兌）");
  const P10=game(10,{ch:"x_swordboy"});assert.ok(!G.targets(P10,"qi1",[],C).includes(sq),"一劍破甲只移除卒士象，拿不掉護陣車")});

test("第二章星樞選步：不靠將軍把同一個局面走出第三次（長將判負是它自己輸）；自己預告的長驅直入會留著等它發動。十二關都開；不在選關裡的盤（車輪戰登記的 101 以後）沒開、選步照舊", ()=>{
  /* 輪到黑：車 i2 下到 i1 是將軍（+18），其他步沒有傷害 */
  const mkB=lv=>{const P=custom(lv,[["K",5,1],["k",4,10],["R",3,5],["r",9,2]],{waves:false});mv(P,Q(3,5),Q(3,4));return P};
  const P=mkB(7),u=C.iccs(Q(9,2),Q(9,1)),after=C.fen(C.make(P.board,Q(9,2),Q(9,1)),"r"),lines={lines:[{mv:u,v:0}]};
  assert.equal(P.td.arep,1);assert.deepEqual(J(G.engine(P,C).rep),{[P.pos[0]]:1,[P.pos[1]]:1},"第二章：把這盤出現過的局面帶給選步");
  assert.equal(G.pick(lines,G.engine(P,C),()=>0),u,"沒重複過：照常將軍");
  const s0=G.scoreB(G.engine(P,C),Q(9,2),Q(9,1),0);P.pos.push(after);assert.equal(G.scoreB(G.engine(P,C),Q(9,2),Q(9,1),0),s0-G.W_HP*20,"這個將軍會走出第二次同樣的局面：扣分");
  P.pos.push(after);assert.ok(G.scoreB(G.engine(P,C),Q(9,2),Q(9,1),0)<s0-4e6,"第三次：當成快輸");assert.notEqual(G.pick(lines,G.engine(P,C),()=>0),u,"不走那一步將軍");
  const P1=mkB(1);P1.pos.push(after,after);assert.equal(P1.td.arep,1,"第 1 關也開了（AREP1）");assert.notEqual(G.pick(lines,G.engine(P1,C),()=>0),u);
  /* 車輪戰照它自己的做法把盤登記在 GSV.LV 的 101（07bhw-wheel.js）：不在第一章那六關裡，沒開、選步照舊 */
  G.LV[101]=Object.assign({},G.LV[1],{n:101});try{const PW=mkB(101);PW.pos.push(after,after);assert.equal(PW.td.arep,0);assert.equal(G.engine(PW,C).rep,null);assert.equal(G.pick(lines,G.engine(PW,C),()=>0),u,"車輪戰的盤：照舊")}finally{delete G.LV[101]}
  /* 長驅直入：這一步走完會宣告（車留在空的直路上）比車自己過河多一份「預告的大招」威脅分 */
  const P2=custom(7,[["K",5,1],["k",4,10],["R",3,5],["r",9,8]],{waves:false});P2.td.en.sp=60;mv(P2,Q(3,5),Q(3,4));const cfg=G.engine(P2,C);
  const stay=G.scoreB(cfg,Q(4,10),Q(4,9),0),go=G.scoreB(cfg,Q(9,8),Q(9,5),0);assert.equal(stay-go,G.W_HP*G.ESK.cqzr.keep*G.dmg(G.ESK.cqzr.base,P2.td.en.atk,P2.td.me.def));
  assert.ok(!G.ESK.zjhl.keep&&!G.ESK.pao.keep,"第一章的兩招沒有這一項（第 5、6 關選步不變）")});

test("第二章盤上記號：長驅直入＝車標「驅」＋那條路在你底線的口畫紅圈（擋住就不畫圈）；斷路令＝被點名的俥標「斷」＋紅圈；護陣車標「陣」", ()=>{
  const mk=P=>J(ctx.gsvMarks({td:P.td,board:P.board,turn:P.turn,human:"r",result:null}));
  const P=custom(7,[...KS,["r",9,8],["C",2,3]],{waves:false});P.td.en.sp=60;round(P);let L=mk(P);
  assert.ok(L.some(m=>m.sq===Q(9,8)&&m.k==="bd src"&&m.t==="驅"));assert.ok(L.some(m=>m.sq===Q(9,1)&&m.k==="ring"));
  mv(P,Q(2,3),Q(9,3));L=mk(P);assert.ok(L.some(m=>m.t==="驅"),"預告還在");assert.ok(!L.some(m=>m.k==="ring"),"擋住了：口上的紅圈拿掉");
  const P2=custom(9,[...KS,["R",9,7]],{waves:false});round(P2);L=mk(P2);assert.ok(L.some(m=>m.sq===Q(9,7)&&m.k==="bd src"&&m.t==="斷"));assert.ok(L.some(m=>m.sq===Q(9,7)&&m.k==="ring"));
  const P3=custom(10,[...KS,["r",1,8,"guard"]],{waves:false});assert.ok(mk(P3).some(m=>m.sq===Q(1,8)&&m.k==="bd guard"&&m.t==="陣"))});

/* ===== 選關、逐關解鎖、三星、困難版（11/15）共用的小工具：假的畫面零件（modal／store／toast），測完 uiOff 拿掉 ===== */
ctx.esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");
const cardsOf=h=>[...h.matchAll(/class="gsv-card( on| lk)?" data-n="(\d+)"[^>]*><b>([^<]+)<\/b>(?:<span class="gsv-s3" aria-hidden="true">([★☆]+)<\/span>)?/g)].map(m=>[+m[2],m[3],(m[1]||"").trim(),m[4]||""]);
const tabsOf=h=>[...h.matchAll(/class="gsv-chb( on)?" role="tab" aria-selected="(true|false)" data-ch="(\d)"><span>([^<]+)<\/span>・<span>([^<]+)<\/span>/g)].map(m=>[+m[3],m[4],m[5],!!m[1],m[2]]);
const noSpan=h=>String(h).replace(/<span>|<[/]span>/g,"");   /* 目標那一行每個條件包了一層 span（英文介面查字典用），比對時拿掉 */
const REAL_START=ctx.gsvStart;
function uiOn(db){const U={DB:db||{},M:null,hd:null,got:null,toast:"",html:{},js:null};
  ctx.document={getElementById:()=>({})};ctx.store={get:(k,d)=>k in U.DB?J(U.DB[k]):d,set:(k,v)=>{U.DB[k]=J(v)}};ctx.toast=t=>{U.toast=String(t)};ctx.vibrate=()=>{};
  ctx.modal=(h,btns)=>{U.M={h,btns};return{addEventListener:(t,f)=>{U.hd=f},querySelector:s=>({set innerHTML(v){U.html[s]=v}})}};ctx.gsvStart=(n,k,c,sk,f,h)=>{U.got=[n,h?1:0]};
  ctx.jStart=(id,o,cb,f)=>{U.js={id,o,f}};ctx.window={XQCore:C};
  U.click=(sel,ds)=>{U.toast="";U.hd({target:{closest:s=>s===sel?{dataset:ds}:null},preventDefault(){}})};U.go=()=>{U.M.btns[0][1]();return U.got};return U}
function uiOff(){for(const k of["document","store","toast","vibrate","modal","jStart","window","location","DEVMODE"])delete ctx[k];ctx.gsvStart=REAL_START;ctx.gsvAll(null)}

test("〔混合〕選關分章：分頁兩顆（章名照提案二）、每章只列自己的六關、每關只有「第 n 關・關名」加一排星；開打前一行寫這一關的三個目標；新關的獎勵照舊（journey 開頭 bh:gs＝不給修為、不回定軌力）", ()=>{
  const H=ctx.gsvChapHTML,P={c:{3:{w:1,l:2,d:0,best:{rnd:20,hp:30}}}},A={all:true};   /* P＝改版前的舊存檔：沒有 h、勝場沒有 st */
  const h1=H(P,3,1,A);assert.deepEqual(tabsOf(h1),[[0,"序章","星槎序章",false,"false"],[1,"第一章","星門入侵",true,"true"],[2,"第二章","俥路調度",false,"false"]]);
  assert.deepEqual(cardsOf(h1).map(x=>x[0]),[1,2,3,4,5,6]);assert.deepEqual(cardsOf(h1).filter(x=>x[2]==="on").map(x=>x[0]),[3],"選中的那一關亮著");assert.equal(cardsOf(h1)[0][1],"第 1 關・星淵初探");
  const h2=H(P,7,2,A);assert.deepEqual(cardsOf(h2).map(x=>x[1]),[7,8,9,10,11,12].map(n=>`第 ${n} 關・${G.LV[n].nm}`));assert.ok(tabsOf(h2)[2][3]&&!tabsOf(h2)[1][3],"第二章那顆分頁亮著");
  assert.deepEqual(cardsOf(H(P,3,2,A)).filter(x=>x[2]==="on"),[],"看別章時，選中的關不在這一章就沒有卡亮著");assert.deepEqual(cardsOf(H(P,1,9,A)).map(x=>x[0]),[31,32,33,34,35,36,37,38,39],"章號不對就回第一個分頁（11/15 七星改版：序章）");
  /* 極簡：卡上除了關名只有星數和打過的戰績；數值、說明只在讀屏 aria-label */
  assert.ok(!/星樞 HP|ATK|DEF/.test(h2.replace(/aria-label="[^"]*"/g,"")));assert.match(h1,/<small aria-hidden="true">✓ 勝 1・和 0・敗 2<\/small>/);assert.equal((h2.match(/<small/g)||[]).length,0,"沒打過的不顯示戰績");
  assert.deepEqual(cardsOf(h1).map(x=>x[3]),["☆☆☆","☆☆☆","★☆☆","☆☆☆","☆☆☆","☆☆☆"],"舊存檔有勝場、沒有星的紀錄＝1 星");
  assert.match(noSpan(h1),/<p class="gsv-gl">第 3 關：★ 過關　<i>☆ 護陣全部拆掉<\/i>　<i>☆ 剩餘 HP 40% 以上<\/i><\/p>/,"開打前一行：這一關的三個目標");
  assert.match(SRC,/<div class="gsv-chap">\$\{chH\(\)\}<\/div>/);
  /* 獎勵：新關、困難版都不用另外接 */
  assert.match(SRC,/const J="bh:gs"\+n\+\(hard\?"h":""\)/);for(const j of["bh:gs7","bh:gs12","bh:gs7h"])assert.ok(ctx.gsvIs({td:{mode:G.MODE},journey:j}),j);
  assert.match(rd("xiangqi-db/m/07dgl-stamina.js"),/\/\^bh:gs\/\.test\(j\)/);assert.match(rd("xiangqi-db/m/07bht-td.js"),/function bhtdNoXp\(st\)\{[^}]*gsvIs\(st\)/)});

test("逐關解鎖：第 1 關要先破序章 C1（11/15 七星改版；改版前打過主線的存檔不鎖）、破前一關才開下一關（第二章要破第 6 關）、打贏過的關保持開（改版不把老玩家鎖回去）；鎖住的卡只有 🔒 加一句；開發者模式／本機／主控台 gsvAll 全開；主控台直接 gsvStart 鎖住的關不開", ()=>{
  const W=(...ns)=>({c:Object.fromEntries(ns.map(n=>[n,{w:1}]))}),open=(P,h,all)=>MAIN.filter(n=>!G.lockWhy(P,n,h,all));
  assert.deepEqual(J(open({c:{}})),[]);assert.deepEqual(J(open(null)),[],"沒有存檔");assert.equal(G.lockWhy({c:{}},1),"破序章 C1 開放");assert.deepEqual(J(open(W(37))),[1],"破了序章 C1");
  assert.deepEqual(J(open({c:{2:{w:0,l:1,d:0}}})),[1],"改版前打過主線（輸了也算）的存檔，第 1 關不鎖回去");assert.deepEqual(J(open(W(1))),[1,2]);
  assert.deepEqual(J(open(W(1,2,3,4,5))),[1,2,3,4,5,6]);assert.equal(G.lockWhy(W(1,2,3,4,5),7),"破第 6 關開放","第二章要破第 6 關");assert.deepEqual(J(open(W(1,2,3,4,5,6))),[1,2,3,4,5,6,7]);
  assert.deepEqual(J(open(W(3,9))),[1,3,4,9,10],"老玩家跳著打贏過的關還是開的，它的下一關也開");
  assert.equal(G.lockWhy({c:{1:{w:0,l:5,d:2}}},2),"破第 1 關開放","輸過、和過不算破關");assert.equal(open({c:{}},0,true).length,12,"開發者全開");
  assert.deepEqual(J(open(W(1,5),1)),[1,5],"困難版：破了那一關的普通版才開");assert.equal(G.lockWhy(W(1),2,1),"先破普通版");assert.equal(open({c:{}},1,true).length,12);
  assert.equal(G.lockWhy({c:{}},101),"");assert.equal(G.lockWhy({c:{}},101,1),"","不在選關裡的盤（車輪戰的 101 以後）不套解鎖");
  /* 卡片：鎖住的只有「🔒 第 n 關・關名」加一句原因，沒有星、沒有戰績 */
  const h=ctx.gsvChapHTML(W(3),1,1);assert.deepEqual(cardsOf(h).map(x=>[x[0],x[2]]),[[1,"on"],[2,"lk"],[3,""],[4,""],[5,"lk"],[6,"lk"]]);
  assert.match(h,/class="gsv-card lk" data-n="2" data-lk="破第 1 關開放" aria-disabled="true"[^>]*><b>🔒 第 2 關・墨河微瀾<\/b><small aria-hidden="true">破第 1 關開放<\/small><\/button>/);
  const hh=ctx.gsvChapHTML(W(3),3,1,{hard:1});assert.deepEqual(cardsOf(hh).map(x=>[x[0],x[2]]),[[1,"lk"],[2,"lk"],[3,"on"],[4,"lk"],[5,"lk"],[6,"lk"]]);assert.match(hh,/data-lk="先破普通版"/);
  assert.match(hh,/class="gsv-chb gsv-mdb on" data-md="1" aria-pressed="true">困難<\/button>/);assert.match(h,/class="gsv-chb gsv-mdb on" data-md="0" aria-pressed="true">普通<\/button>/);
  const U=uiOn();try{
    /* 開發者全開：自動看開發者模式或本機網址；主控台 gsvAll(true／false／null) 蓋過去 */
    assert.equal(ctx.gsvDevAll(),false,"一般玩家");ctx.location={hostname:"localhost"};assert.equal(ctx.gsvDevAll(),true);ctx.location={hostname:"127.0.0.1"};assert.equal(ctx.gsvDevAll(),true);
    assert.equal(ctx.gsvAll(false),false,"本機要看鎖起來的樣子");assert.equal(ctx.gsvAll(null),true);ctx.location={hostname:"xiangqi.example"};assert.equal(ctx.gsvDevAll(),false);
    ctx.DEVMODE=()=>true;assert.equal(ctx.gsvDevAll(),true,"開發者模式");delete ctx.DEVMODE;assert.equal(ctx.gsvAll(true),true);ctx.gsvAll(null);
    /* 沒打過的玩家：預設停在序章 A1（11/15 七星改版；這裡沒有 ptyHas＝不看加入，三階段的第一關都開）；點鎖住的卡、點第二章、點困難都不會改選 */
    ctx.gsvSelect("classic",false);assert.deepEqual(cardsOf(U.M.h).map(x=>[x[0],x[2]]),[[31,"on"],[32,"lk"],[33,"lk"],[34,""],[35,"lk"],[36,"lk"],[37,""],[38,"lk"],[39,"lk"]]);assert.deepEqual(U.go(),[31,0]);
    U.click(".gsv-card",{n:"2",lk:"破第 1 關開放"});assert.match(U.toast,/第 2 關：破第 1 關開放/);assert.deepEqual(U.go(),[31,0]);
    U.click(".gsv-chb",{ch:"2"});assert.ok(cardsOf(U.html[".gsv-chap"]).every(x=>x[2]==="lk"),"第二章整章鎖著");assert.match(U.html[".gsv-chap"],/<p class="gsv-gl">序章 A1：/);assert.deepEqual(U.go(),[31,0],"還是打序章 A1（下面那一行寫著）");
    U.click(".gsv-mdb",{md:"1"});assert.match(U.toast,/普通版才開困難版/);assert.deepEqual(U.go(),[31,0]);
    /* 破了第 1、6 關的存檔：第 2、7 關開；第 6 關可以切困難版 */
    U.DB.gsv={mv:G.MODE,c:{1:{w:1},6:{w:2,st:[1,1,0]}}};ctx.gsvSelect("classic",false);assert.deepEqual(cardsOf(U.M.h).map(x=>[x[0],x[2],x[3]]),[[1,"on","★☆☆"],[2,"","☆☆☆"],[3,"lk",""],[4,"lk",""],[5,"lk",""],[6,"","★★☆"]]);
    U.click(".gsv-chb",{ch:"2"});assert.deepEqual(cardsOf(U.html[".gsv-chap"]).map(x=>[x[0],x[2]]),[[7,"on"],[8,"lk"],[9,"lk"],[10,"lk"],[11,"lk"],[12,"lk"]]);assert.deepEqual(U.go(),[7,0]);
    U.click(".gsv-mdb",{md:"1"});assert.match(U.toast,/普通版才開困難版/,"第 7 關還沒破");U.click(".gsv-chb",{ch:"1"});assert.deepEqual(U.go(),[1,0],"換回第一章：改選第一個開著的關");
    U.click(".gsv-card",{n:"6"});U.click(".gsv-mdb",{md:"1"});assert.equal(U.toast,"");assert.deepEqual(cardsOf(U.html[".gsv-chap"]).map(x=>[x[0],x[2]]),[[1,""],[2,"lk"],[3,"lk"],[4,"lk"],[5,"lk"],[6,"on"]]);assert.deepEqual(U.go(),[6,1],"出戰：第 6 關困難版");
    U.DB.gsv.last=6;U.DB.gsv.lastH=1;ctx.gsvSelect("classic",false);assert.match(U.M.h,/gsv-mdb on" data-md="1"/,"上次打困難版：打開就停在困難版");assert.deepEqual(U.go(),[6,1]);
    /* 主控台 gsvAll(true)：十二關全開 */
    U.DB={};ctx.gsvAll(true);ctx.gsvSelect("classic",false);assert.ok(cardsOf(U.M.h).every(x=>x[2]!=="lk"));U.click(".gsv-chb",{ch:"2"});U.click(".gsv-card",{n:"12"});assert.deepEqual(U.go(),[12,0]);ctx.gsvAll(null);
    /* 真的 gsvStart：鎖住的關（主控台直接叫也一樣）只跳一句、不開局；開著的照開；困難版 journey 還是 bh:gs 開頭、帶 hard、深度照困難版 */
    REAL_START(5,"classic",false);assert.equal(U.js,null);assert.match(U.toast,/🔒 第 5 關：破第 4 關開放/);REAL_START(1,"classic",false,null,false,1);assert.equal(U.js,null);assert.match(U.toast,/第 1 關困難版：先破普通版/);
    REAL_START(1,"classic",false);assert.equal(U.js,null);assert.match(U.toast,/第 1 關：破序章 C1 開放/,"11/15 七星改版：新存檔要先破序章 C1");U.DB.gsv={mv:G.MODE,c:{37:{w:1}}};
    REAL_START(1,"classic",false);assert.equal(U.js.id,"bh:gs1");assert.equal(U.js.o.td.hard,0);assert.equal(U.js.o.lx,2);assert.equal(U.DB.gsv.last,1);
    ctx.gsvAll(true);REAL_START(5,"classic",false,null,false,1);assert.equal(U.js.id,"bh:gs5h");assert.equal(U.js.o.journey,"bh:gs5h");assert.deepEqual(J(U.js.o.td),{mode:G.MODE,lv:5,ch:"x_swordboy",L:1,sk:["qi1"],hard:1});
    assert.equal(U.js.o.lx,G.lvOf(5,1).depth);assert.equal(U.js.o.lv.fen,G.startFen(5,C),"困難版同一個開局");assert.equal(U.DB.gsv.lastH,1)}finally{uiOff()}});

test("三星：第 1 星＝過關，另外兩顆每關各一個條件（跟那一關的學習點有關）、各自累積；條件逐種判定；舊存檔有勝場沒有星＝1 星；困難版的星另外記", ()=>{
  const TXT={1:["入侵沒扣到血","剩餘 HP 50% 以上"],2:["入侵卒全部清掉","入侵沒扣到血"],3:["護陣全部拆掉","剩餘 HP 40% 以上"],4:["沒被奪靈","截援一次"],5:["護陣全部拆掉","星樞大招一次都沒中"],6:["星樞大招一次都沒中","剩餘 HP 40% 以上"],
    7:["星樞大招一次都沒中","俥沒被吃"],8:["入侵沒扣到血","星樞大招一次都沒中"],9:["星樞大招一次都沒中","護陣全部拆掉"],10:["護陣全部拆掉","過關時場上有俥"],11:["星樞大招一次都沒中","俥沒被吃"],12:["護陣全部拆掉","星樞大招一次都沒中"]};
  for(const n of MAIN){const g=G.goals(n),pl=G.plan(n),V=G.LV[n];assert.deepEqual(J(g.map(x=>x.t)),["過關",...TXT[n]],"第 "+n+" 關");assert.notEqual(g[1].k,g[2].k);
    /* 條件要對得上這一關有的東西：有入侵卒才考入侵、有護陣才考拆陣、有大招（或分段會解鎖）才考大招、有奪靈馬才考奪靈 */
    const has=t=>pl.open.some(x=>x[2]===t)||pl.waves.some(w=>w.tag===t);
    for(const x of g.slice(1)){if(x.k==="inv0"||x.k==="invClr")assert.ok(has("inv"),n+" 入侵");if(x.k==="guard0")assert.ok(has("guard"),n+" 護陣");if(x.k==="drain0")assert.ok(has("drain"),n+" 奪靈");if(x.k==="esk0")assert.ok(V.esk.length||(V.ph||[]).length,n+" 大招")}}
  assert.deepEqual(J(G.goals(101).map(x=>x.t)),["過關"],"沒有設目標的盤（車輪戰）只有過關");
  const ok=(k,P,v)=>G.GOAL[k].ok(P.td,P.board,v);
  /* 入侵沒扣到血：真的被入侵卒扣到才算失敗；盾吸光不算扣到 */
  const mkI=()=>{const P=custom(1,[...KS,["p",3,5,"inv"]],{waves:false});P.td.arm[P.td.ids[Q(3,5)]]=1;return P};
  const I0=custom(1,KS,{waves:false});assert.deepEqual(J(I0.td.tl),{inv:0,n:0,drain:0,lost:""});assert.ok(ok("inv0",I0));
  const I1=mkI();round(I1);assert.equal(I1.td.tl.inv,G.dmg(12,90,20));assert.ok(!ok("inv0",I1));const I2=mkI();I2.td.me.sh={v:30,exp:9};round(I2);assert.equal(I2.td.tl.inv,0);assert.ok(ok("inv0",I2),"盾全吸掉＝沒扣到血");
  /* 星樞大招一次都沒中 */
  const E1=custom(7,[...KS,["r",9,8]],{waves:false});E1.td.en.sp=60;round(E1);assert.ok(ok("esk0",E1),"只是預告");round(E1);assert.equal(E1.td.tl.n,1);assert.ok(!ok("esk0",E1));
  /* 沒被奪靈、俥沒被吃、過關時場上有俥 */
  const D1=custom(4,[["K",5,1],["k",4,10],["R",1,1],["N",3,3],["n",2,5,"drain"]],{waves:false});assert.ok(ok("drain0",D1));rq(D1);mv(D1,Q(2,5),Q(3,3));assert.equal(D1.td.tl.drain,8);assert.ok(!ok("drain0",D1));assert.equal(D1.td.tl.lost,"N");assert.ok(ok("rook",D1),"被吃的是傌");
  const R1=custom(7,[...KS,["R",9,3],["r",9,10]],{waves:false});rq(R1);mv(R1,Q(9,10),Q(9,3));assert.equal(R1.td.tl.lost,"R");assert.ok(!ok("rook",R1));assert.ok(ok("rookOn",R1),"另一隻俥還在");
  assert.ok(!ok("rookOn",{td:R1.td,board:R1.board.map(p=>p==="R"?null:p)}));
  /* 部署過後備、截援一次、護陣全部拆掉、剩餘 HP */
  const G1=custom(3,[...KS,["p",9,7,"guard"]],{waves:false});assert.ok(!ok("dep",G1)&&!ok("icpt",G1)&&!ok("guard0",G1));G1.td.dep=1;G1.td.icpt=1;assert.ok(ok("dep",G1)&&ok("icpt",G1));
  mv(G1,Q(1,1),Q(1,7));mv(G1,Q(4,10),Q(4,9));mv(G1,Q(1,7),Q(9,7));assert.ok(ok("guard0",G1),"吃掉了");
  G1.td.me.hp=42;assert.ok(ok("hp",G1,40));assert.ok(!ok("hp",G1,50));G1.td.me.hp=0;assert.ok(!ok("hp",G1,0));
  /* 改版前存下來、還沒打完的盤沒有 td.tl：靠它的條件算沒達成，不會丟錯 */
  const O1=custom(1,KS,{waves:false});delete O1.td.tl;for(const k of["inv0","esk0","drain0","rook"])assert.ok(!ok(k,O1),k);assert.doesNotThrow(()=>{round(O1);rq(O1)});assert.deepEqual(J(G.stars(O1.td,O1.board)),[1,0,1]);
  /* stars＝這一局拿到的；recStars＝紀錄裡的 */
  const S1=custom(3,KS,{waves:false});assert.deepEqual(J(G.stars(S1.td,S1.board)),[1,1,1]);S1.td.me.hp=10;assert.deepEqual(J(G.stars(S1.td,S1.board)),[1,1,0]);
  assert.deepEqual(J(G.recStars({w:2},3)),[1,0,0],"舊存檔");assert.deepEqual(J(G.recStars({w:0,l:3},3)),[0,0,0]);assert.deepEqual(J(G.recStars(undefined,3)),[0,0,0]);assert.deepEqual(J(G.recStars({w:1,st:[1,0,1]},3)),[1,0,1]);
  /* 結算存檔（真的跑 gsvEnd／gsvResult）：各自累積、同一盤不重複記、輸了不掉星、困難版記在 h */
  const U=uiOn({gsv:{mv:G.MODE,c:{1:{w:2,l:1,d:0}}}});try{const st=(P,id,j,w)=>({id,journey:j,td:P.td,board:P.board,result:w?{w,why:"星樞星核歸零"}:{w:null,why:"和"},human:"r"});
    ctx.gsvEnd(st(S1,"a","bh:gs3","r"));assert.deepEqual(U.DB.gsv.c[3],{w:1,l:0,d:0,st:[1,1,0],best:{rnd:0,hp:10}});
    const S2=custom(3,[...KS,["p",9,7,"guard"]],{waves:false});ctx.gsvEnd(st(S2,"b","bh:gs3","r"));assert.deepEqual(U.DB.gsv.c[3].st,[1,1,1],"第二局沒拆陣但 HP 夠：第 3 顆亮，第 2 顆不掉");assert.equal(U.DB.gsv.c[3].w,2);
    ctx.gsvEnd(st(S2,"b","bh:gs3","r"));assert.equal(U.DB.gsv.c[3].w,2,"同一盤不重複記");ctx.gsvEnd(st(S2,"c","bh:gs3","b"));assert.equal(U.DB.gsv.c[3].l,1);assert.deepEqual(U.DB.gsv.c[3].st,[1,1,1]);ctx.gsvEnd(st(S2,"c2","bh:gs3",null));assert.equal(U.DB.gsv.c[3].d,1);
    /* 舊存檔的第 1 關（2 勝、沒有 st）：卡上 1 星；輸一盤還是 1 星；再贏一盤照新規則補上 */
    assert.equal(cardsOf(ctx.gsvChapHTML(ctx.gsvProg(),1,1))[0][3],"★☆☆");ctx.gsvEnd(st(I0,"d","bh:gs1","b"));assert.equal(U.DB.gsv.c[1].st,undefined);assert.deepEqual(J(G.recStars(U.DB.gsv.c[1],1)),[1,0,0]);
    ctx.gsvEnd(st(I1,"e","bh:gs1","r"));assert.deepEqual(U.DB.gsv.c[1].st,[1,0,1],"這一盤被入侵扣到血、HP 還有一半以上");assert.equal(U.DB.gsv.c[1].w,3);
    const SH=custom(3,KS,{waves:false,hard:1});ctx.gsvEnd(st(SH,"f","bh:gs3h","r"));assert.deepEqual(U.DB.gsv.h[3],{w:1,l:0,d:0,st:[1,1,1],best:{rnd:0,hp:SH.td.me.hp}});assert.equal(U.DB.gsv.c[3].w,2,"困難版不動普通版的紀錄");
    /* 結果視窗：三個目標一行（這一局拿到的加粗、以前拿過的 ★、還沒的 ☆）；再打一次帶著普通／困難 */
    ctx.gsvResult(st(S1,"a","bh:gs3","r"),true,false,"");assert.match(noSpan(U.M.h),/<p class="gsv-gl"><b>★ 過關<\/b>　<b>★ 護陣全部拆掉<\/b>　★ 剩餘 HP 40% 以上<\/p>/);assert.deepEqual(U.go(),[3,0]);
    ctx.gsvResult(st(S2,"c","bh:gs3","b"),false,false,"");assert.match(noSpan(U.M.h),/<p class="gsv-gl">★ 過關　★ 護陣全部拆掉　★ 剩餘 HP 40% 以上<\/p>/,"輸了：只列紀錄裡有的");
    ctx.gsvResult(st(SH,"f","bh:gs3h","r"),true,false,"");assert.match(U.M.h,/第 3 關・星門乍現（困難版）/);assert.deepEqual(U.go(),[3,1]);assert.ok(!/🔓/.test(U.M.h));
    const N1=custom(2,KS,{waves:false});ctx.gsvEnd(st(N1,"g","bh:gs2","r"));ctx.gsvResult(st(N1,"g","bh:gs2","r"),true,false,"");assert.match(U.M.h,/🔓 第 3 關、這一關的困難版開放了/,"第一次破關");
    assert.match(noSpan(U.M.h),/<b>★ 過關<\/b>　<b>★ 入侵卒全部清掉<\/b>　<b>★ 入侵沒扣到血<\/b>/)}finally{uiOff()}});

test("第 2 關第 2 星換成「入侵卒全部清掉」（11/15 開發者決定；原本「部署過後備」太容易）：場上沒有入侵卒、入侵卒的援軍也都落下過或被截掉才算；已經上線過，舊條件下亮過的星不會掉；困難版一起換", ()=>{
  assert.deepEqual(J(G.STG[2]),[["invClr"],["inv0"]]);assert.deepEqual(J(G.goals(2).map(g=>g.t)),["過關","入侵卒全部清掉","入侵沒扣到血"]);assert.ok(!G.LVN.some(n=>G.STG[n].some(x=>x[0]==="dep")),"沒有哪一關還在用「部署過後備」");
  const ok=P=>G.GOAL.invClr.ok(P.td,P.board),star2=P=>G.stars(P.td,P.board)[1];
  /* 真正的第 2 關開局：開場一顆入侵卒在 c7，還有兩顆沒落下（第 2 回合左門、第 4 回合右門） */
  const P=game(2);assert.equal(P.td.waves.filter(w=>w.tag==="inv").length,2);assert.ok(!ok(P),"開場：場上有、後面還有");
  /* 場上的吃掉了，可是右門那一顆還沒落下：不算（太早打完拿不到） */
  const A=custom(2,[...KS,["p",1,5,"inv"]]);A.td.waves=A.td.waves.filter(w=>w.tag==="inv"&&w.at===4);assert.equal(A.td.waves.length,1);assert.ok(!ok(A));mv(A,Q(1,1),Q(1,5));assert.ok(!ok(A),"場上清了，右門那顆還在等");
  A.td.waves[0].st="in";assert.ok(ok(A),"都落下過、場上也沒有了");A.td.waves[0].st="cut";assert.ok(ok(A),"被你截掉的援軍也算處理掉");
  /* 落下來還在場上（不管過河沒有）：不算；吃掉才算。一劍破甲移除的也算清掉 */
  const B=custom(2,[...KS,["p",9,7,"inv"]],{waves:false});assert.ok(!ok(B));assert.equal(star2(B),0);assert.equal(G.stars(B.td,B.board)[2],1,"第 3 星（入侵沒扣到血）是另一回事：沒清掉、但也沒被扣到");
  B.td.me.sp=100;castOk(B,{k:"qi1",tg:[Q(9,7)]});assert.ok(ok(B));assert.equal(star2(B),1);
  /* 反過來：清掉了，可是之前被扣過血——第 2 星有、第 3 星沒有。兩顆不等價 */
  const D=custom(2,[...KS,["p",1,5,"inv"]],{waves:false});D.td.arm[D.td.ids[Q(1,5)]]=1;rq(D);bq(D);assert.ok(D.td.tl.inv>0);mv(D,Q(1,2),Q(1,5));assert.deepEqual(J(G.stars(D.td,D.board)),[1,1,0]);
  /* 不靠 td.tl：改版前存下來的盤也判得出來 */
  const O=custom(2,KS,{waves:false});delete O.td.tl;assert.ok(ok(O));assert.deepEqual(J(G.stars(O.td,O.board)),[1,1,0]);
  /* 舊存檔：第 2 關第 2 星在舊條件下亮過（st[1]＝1）。卡片、目標那一行照樣亮；再贏一盤沒達成新條件也不會掉；普通、困難各記各的 */
  const U=uiOn({gsv:{mv:G.MODE,c:{1:{w:1,st:[1,0,0]},2:{w:2,l:0,d:0,st:[1,1,0]}},h:{2:{w:1,l:0,d:0,st:[1,1,1]}}}});try{const st=(X,id,j)=>({id,journey:j,td:X.td,board:X.board,result:{w:"r",why:"星樞星核歸零"},human:"r"});
    assert.deepEqual(J(G.recStars(U.DB.gsv.c[2],2)),[1,1,0]);const h=ctx.gsvChapHTML(ctx.gsvProg(),2,1);assert.equal(cardsOf(h)[1][3],"★★☆");assert.match(noSpan(h),/<p class="gsv-gl">第 2 關：★ 過關　★ 入侵卒全部清掉　<i>☆ 入侵沒扣到血<\/i><\/p>/);
    const B2=custom(2,[...KS,["p",9,7,"inv"]],{waves:false});assert.deepEqual(J(G.stars(B2.td,B2.board)),[1,0,1]);ctx.gsvEnd(st(B2,"x1","bh:gs2"));assert.deepEqual(U.DB.gsv.c[2].st,[1,1,1],"這一盤沒清掉入侵卒：舊的第 2 星留著，第 3 星補上");assert.equal(U.DB.gsv.c[2].w,3);
    ctx.gsvResult(st(B2,"x1","bh:gs2"),true,false,"");assert.match(noSpan(U.M.h),/<b>★ 過關<\/b>　★ 入侵卒全部清掉　<b>★ 入侵沒扣到血<\/b>/,"以前拿過的不加粗、照樣是 ★");
    const BH=custom(2,[...KS,["p",9,7,"inv"]],{waves:false,hard:1});ctx.gsvEnd(st(BH,"x2","bh:gs2h"));assert.deepEqual(U.DB.gsv.h[2].st,[1,1,1]);assert.equal(U.DB.gsv.h[2].w,2);assert.match(noSpan(ctx.gsvChapHTML(ctx.gsvProg(),2,1,{hard:1})),/第 2 關・困難：★ 過關　★ 入侵卒全部清掉　★ 入侵沒扣到血/,"困難版用同一張條件表");
    /* 還沒拿過的人照新條件：只部署、沒清掉入侵卒，拿不到第 2 星 */
    U.DB.gsv={mv:G.MODE,c:{}};const N=custom(2,[...KS,["p",9,7,"inv"]],{waves:false});N.td.dep=2;ctx.gsvEnd(st(N,"x3","bh:gs2"));assert.deepEqual(U.DB.gsv.c[2].st,[1,0,1])}finally{uiOff()}});

test("困難版：同一關同一個擺法和波次、不加血量；星樞多想一步（最多 4）、不長將、開場靈力 +15、ATK +10，每關再多一招或分段提早；普通版參數原封不動；車輪戰的盤不受解鎖／三星／困難版／不長將影響", ()=>{
  const LV0=JSON.stringify(G.LV);
  /* 深度、開場靈力、ATK、會用的招 */
  const HT={1:[3,40,100,["esh"]],2:[3,40,105,["esh"]],3:[4,40,110,["esh"]],4:[4,40,110,["esh"]],5:[4,40,120,[]],6:[4,50,115,["zjhl","pao"]],7:[4,50,105,["cqzr","dll"]],8:[4,50,110,["cqzr","dll"]],
    9:[4,55,110,["dll","cqzr"]],10:[4,50,105,["cqzr","dll"]],11:[4,55,110,["dll","cqzr","esh"]],12:[4,50,110,["dll","cqzr","esh"]]};
  for(const n of MAIN){const V=G.LV[n],X=G.lvOf(n,1),P=game(n,{hard:1}),P0=game(n);assert.equal(G.lvOf(n,0),V,"普通版就是原本那一份");assert.equal(G.lvOf(n),V);
    assert.deepEqual(J([X.depth,X.esp0,X.atk,X.esk]),HT[n],"第 "+n+" 關困難版");assert.ok(X.depth<=4&&X.depth>=V.depth);assert.deepEqual(J([X.hp,X.def,X.open,X.waves,X.nm]),J([V.hp,V.def,V.open,V.waves,V.nm]),"血量、防禦、擺法、波次不變");
    assert.equal(X.arep,1);assert.equal(X.atk,V.atk+G.HARD.atk);assert.equal(X.esp0,V.esp0+G.HARD.esp0);for(const k of V.esk)assert.ok(X.esk.includes(k),"原本會的招都還在");
    assert.deepEqual(J([P.td.hard,P.td.arep,P.td.depth,P.td.en.sp,P.td.en.atk,P.td.en.max,P.td.esk]),J([1,1,X.depth,X.esp0,X.atk,V.hp,X.esk]));assert.equal(P.start,P0.start,"同一個開局");assert.deepEqual(J(P.td.waves),J(P0.td.waves));
    assert.deepEqual(J([P0.td.hard,P0.td.depth,P0.td.en.sp,P0.td.en.atk,P0.td.esk]),J([0,V.depth,V.esp0,V.atk,V.esk]),"普通版開局不變");assert.equal(G.engine(P,C).depth,X.depth)}
  assert.deepEqual(J(game(5,{hard:1}).td.phs),[{hp:.75,esk:"pao"},{hp:.45,esk:"zjhl"}],"第 5 關困難版：分段提早");assert.deepEqual(J(game(5).td.phs),[{hp:.6,esk:"pao"},{hp:.3,esk:"zjhl"}]);
  assert.equal(JSON.stringify(G.LV),LV0,"開困難版不會改到關卡資料");
  /* 困難版第 1 關：星樞真的會開護盾（受擊 ≥8、20 靈） */
  const S=custom(1,[["K",5,1],["k",4,10],["R",1,1],["r",1,9],["p",9,7]],{waves:false,hard:1});assert.deepEqual(J(S.td.esk),["esh"]);mv(S,Q(1,1),Q(1,9));const A=C.legal(S.board,"b").find(([f,t])=>!S.board[t]);mv(S,A[0],A[1]);
  assert.ok(S.td.ev.some(e=>e.k==="esk"&&e.id==="esh"));assert.equal(S.td.en.sp,40-20+4);
  const S0=custom(1,[["K",5,1],["k",4,10],["R",1,1],["r",1,9],["p",9,7]],{waves:false});mv(S0,Q(1,1),Q(1,9));const B=C.legal(S0.board,"b").find(([f,t])=>!S0.board[t]);mv(S0,B[0],B[1]);assert.ok(!S0.td.ev.some(e=>e.k==="esk"),"普通版第 1 關沒有招");
  /* 車輪戰照它自己的做法登記 101（07bhw-wheel.js）：沒有困難版參數、沒有目標、不鎖、不開不長將；boot 傳 hard 也照普通版 */
  G.LV[101]=Object.assign({},G.LV[1],{n:101,nm:"河口"});try{assert.equal(G.lvOf(101,1),G.LV[101]);assert.equal(G.lockWhy({c:{}},101,0),"");assert.deepEqual(J(G.goals(101).map(g=>g.k)),["win"]);
    const W=game(101),W1=game(101,{hard:1});assert.deepEqual(J([W.td.arep,W.td.hard,W.td.depth,W.td.en.atk,W.td.esk]),[0,0,2,90,[]]);assert.deepEqual(J([W1.td.arep,W1.td.hard,W1.td.en.atk]),[0,0,90]);assert.deepEqual(J(G.stars(W.td,W.board)),[1]);
    assert.ok(!G.LVN.includes(101)&&!G.CHP.some(c=>c.lv.includes(101)))}finally{delete G.LV[101]}});

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
  const run=(seed,lv)=>{let a=seed>>>0;const R=()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296};
    const P=game(lv||3,{ch:"x_martialgirl",L:23});if(lv===5)P.td.en.hp=60;   /* 第 5 關：先壓到 40% 讓分段、隔山星砲進得來 */for(let i=0;i<40&&!P.td.over;i++){const L=C.legal(P.board,P.turn);if(!L.length)break;const m=L[Math.floor(R()*L.length)];const e=mv(P,m[0],m[1]);if(e&&e.end)break;if(C.judgeState(P))break}return JSON.stringify(P.td)};
  assert.equal(run(7),run(7));assert.notEqual(run(7),run(8));
  for(const lv of[2,4,5,7,9,10,11,12])assert.equal(run(11,lv),run(11,lv),"第 "+lv+" 關（奪靈馬、分段、隔山星砲、第二章的長驅直入／斷路令／護陣車）也決定性");
  assert.ok(JSON.parse(run(11,5)).ev.length>0)});

test("〔原始碼〕接線：m.html include、XQ_TD 包一層只轉星門圍城、舊版 bhtdIs 排除、平面棋盤、07bh 結算與結果視窗、入口卡片、local.js 部署換手、testkinds 登記", ()=>{
  assert.match(rd("xiangqi-db/m.html"),/\/\/#include m\/07bhf-bossfx\.js\n\/\/#include m\/07bhg-gatesiege\.js/);
  assert.match(SRC,/window\.XQ_TD=Object\.assign\(\{\},O,\{gsv:1/);assert.match(SRC,/td\.mode===GSV\.MODE/);
  const T=rd("xiangqi-db/m/07bht-td.js");assert.match(T,/st\.td\.mode!=="gate-siege-v1"/);assert.match(T,/gsvFlat\(st\)/);assert.match(T,/gsvCard\(\)/);assert.match(T,/\[data-gsv\]/);
  const B=rd("xiangqi-db/m/07bh-blackhole.js");assert.match(B,/gsvTick\(st\)/);assert.match(B,/gsvEnd\(st\)/);assert.match(B,/gsvResult\(st,win,draw0,XPR\)/);
  assert.match(LOC,/if\(e\.ps\)S\.turn=S\.turn==="r"\?"b":"r"/);assert.match(LOC,/if\(o\.pass&&!P\.result\)setTimeout\(playEngine,0\)/);
  assert.match(rd("xiangqi-lab/tools/testkinds.js"),/"test-gate-siege\.js"/);assert.match(SRC,/存檔鍵 gsv/)});

test("〔原始碼〕11/15 實機驗收：選關視窗加了難度列、三星條件、鎖關之後比螢幕高，「出戰」掉到畫面外又不能捲——視窗可以捲、出戰鈕黏在底部、鎖住的卡片只留一行", () => {
  const GSRC = require("fs").readFileSync(require("path").join(__dirname, "..", "..", "xiangqi-db", "m", "07bhg-gatesiege.js"), "utf8");
  assert.ok(GSRC.includes(".modal.gsv-sel{max-height:100dvh;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:none}"), "選關視窗可以上下捲");
  assert.ok(GSRC.includes(".gsv-sel .mb{display:contents}.gsv-sel .mb>.btn:first-child{position:sticky;bottom:calc(6px + env(safe-area-inset-bottom,0px));"), "出戰鈕黏在視窗底部");
  assert.ok(GSRC.includes(".gsv-card.lk small{display:none}"), "鎖住的卡片不顯示第二行小字（點了才跳原因）");
});
