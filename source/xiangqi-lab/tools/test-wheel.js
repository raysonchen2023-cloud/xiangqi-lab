// 黑洞車輪戰・兩盤原型 wheel-v1（開發者 11/15；m/07bhw-wheel.js 的 WHL 純規則，單盤規則是 m/07bhg-gatesiege.js 的 GSV）單元測試。
//   不開瀏覽器、不跑真的引擎（引擎用假的 search 函式模擬：回結果、逾時、出錯、晚到）。
//   共用靈力不疊加、一輪最多一招、招式不串盤、陣眼只封該盤、各盤血量獨立、總輪與本盤回合、沒操作的盤不會自己走、
//   引擎佇列（每盤一個工作、舊結果丟掉、逾時與出錯有合法退路）、兩盤皆勝（need 可設定）、獎勵不重領、存檔接續、接線。
// 用法：node --test xiangqi-lab/tools/test-wheel.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const GSRC=rd("xiangqi-db/m/07bhg-gatesiege.js"),WSRC=rd("xiangqi-db/m/07bhw-wheel.js");
function load(extra){const ctx=Object.assign({console,Math,JSON,Date,setTimeout,clearTimeout,Promise},extra||{});vm.createContext(ctx);vm.runInContext(GSRC+"\n"+WSRC+"\n;this.GSV=GSV;this.WHL=WHL;",ctx);return ctx}
const X=load(),G=X.GSV,W=X.WHL;
const J=x=>JSON.parse(JSON.stringify(x));
const Q=(lu,xi)=>G.LSQ(lu,xi);
/* 最小盤：紅帥 e1、黑將 d10、紅俥 a1（再加自訂的子）；不要援軍 */
const KS=[["K",5,1],["k",4,10],["R",1,1]];
const tiny=(more,o)=>Object.assign({pcs:KS.concat(more||[]),waves:false},o||{});
const match=(o)=>W.newMatch(Object.assign({ch:"x_swordboy",L:1,need:2,id:"t1",boards:[tiny(),tiny()]},o||{}),C);
/* 紅方原地繞（俥 a1→a3→a2→a1，三步一圈）、黑方原地來回（將 d10↔d9）：六個回合才重複一次局面，不會被循環判和 */
const rq=(M,i)=>{const b=M.bs[i].P.board,f=[Q(1,1),Q(1,3),Q(1,2)].find(q=>b[q]==="R"),t=f===Q(1,1)?Q(1,3):f===Q(1,3)?Q(1,2):Q(1,1),r=W.move(M,i,f,t,C);assert.ok(!r.err,"紅方走不了："+r.err);return r};
const bq=(M,i)=>{const b=M.bs[i].P.board,r=b[Q(4,10)]==="k"?W.reply(M,i,Q(4,10),Q(4,9),C):W.reply(M,i,Q(4,9),Q(4,10),C);assert.ok(!r.err,"黑方走不了："+r.err);return r};
const round=M=>{for(const B of M.bs)if(!B.P.result){rq(M,B.i);bq(M,B.i)}};
const seeded=s=>()=>{s=(s*16807)%2147483647;return s/2147483647};

test("兩盤固定短中局：開局合法（沒人被將、不照面、紅方有步）、援軍門開局能落、子數不超過標準；只有一波；不出現在星門圍城選關", ()=>{
  assert.deepEqual(J(W.LVS),[101,102]);assert.deepEqual(J(G.LVN),[1,2,3,4,5,6],"GSV.LVN 開機就算好了，車輪戰的盤不會跑進星門圍城選關");
  for(const lv of W.LVS){const b=G.startBoard(lv),pl=G.plan(lv);assert.ok(!C.inCheck(b,"r")&&!C.inCheck(b,"b"),"開局沒人被將");assert.ok(!G.facing(b));assert.ok(C.legal(b,"r").length>0);
    assert.equal(G.LV[lv].waves.length,1,"較少波次：一波");for(const w of pl.waves)assert.equal(G.spawnOk(b,w.p,w.sq,C),"","援軍落點合法");
    const cnt={};for(const[p]of pl.open)cnt[p]=(cnt[p]||0)+1;for(const w of pl.waves)cnt[w.p]=(cnt[w.p]||0)+1;for(const p in cnt)assert.ok(cnt[p]<=G.STD[p],`${p} 不超過標準子數`);
    assert.ok(pl.open.length+pl.waves.length<16,"短中局：敵方少於 16 子")}
  const M=W.newMatch({ch:"x_swordboy",L:1,id:"a"},C);assert.equal(M.bs.length,2);assert.equal(M.need,2,"兩盤版 need＝2");assert.equal(M.sp.v,W.SP0);assert.equal(M.sp.max,G.stats("x_swordboy",1).sp);
  for(const B of M.bs){assert.equal(B.P.td.pool,1);assert.equal(B.P.td.mode,G.MODE);assert.ok(B.eye)}});

test("陣眼子＝本命子那一種（帥改仕），七位都找得到；各盤各一顆", ()=>{
  const want={x_swordboy:"R",x_spiritgirl:"B",x_martialgirl:"C",x_miaogirl:"N",x_shuai:"A",x_shi:"A",x_bing:"P"};
  for(const ch in want){const M=W.newMatch({ch,L:1,id:"e"+ch},C);for(const B of M.bs){const td=B.P.td,q=G.sqOfId(td,B.eye);assert.equal(B.P.board[q],want[ch],ch)}}});

test("共用靈力不疊加：兩盤都走完一輪只回一次（+6），GSV 每盤結算不再各回 4；擒子回靈兩盤合計受同一個收入上限 10", ()=>{
  const M=match();round(M);assert.equal(M.R,1);assert.equal(M.sp.v,W.SP0+W.RG,"一個總輪只回一次");
  for(const B of M.bs)assert.equal(B.P.td.rnd,1,"兩盤各下了一個本盤回合");
  /* 對照：同一串走法，沒有 pool 的單盤星門圍城每回合回 4 */
  const P={start:M.bs[0].P.start,startTurn:"r",board:C.parseFen(M.bs[0].P.start),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];P.td=G.boot({mode:G.MODE,lv:101,ch:"x_swordboy",L:1},P,C);P.td.waves=[];
  G.move(P,C.stateApply(P,Q(1,1),Q(1,2)),C);G.move(P,C.stateApply(P,Q(4,10),Q(4,9)),C);assert.equal(P.td.me.sp,35+4,"單盤照舊");
  /* 兩盤同一輪各擒一子：+6、+4（上限 10），回合結束不再回 */
  const N=match({id:"t2",boards:[tiny([["p",1,5]]),tiny([["p",1,5]])]});
  assert.ok(!W.move(N,0,Q(1,1),Q(1,5),C).err);assert.equal(N.sp.v,46);assert.equal(N.sp.inc,6);bq(N,0);
  assert.ok(!W.move(N,1,Q(1,1),Q(1,5),C).err);assert.equal(N.sp.v,50,"第二盤擒子只回 4（兩盤合計 10）");bq(N,1);
  assert.equal(N.R,1);assert.equal(N.sp.v,50,"收入上限用完：總輪回靈 0");assert.equal(N.sp.inc,0,"下一輪收入重算");
  for(const i of[0,1]){assert.ok(!W.move(N,i,Q(5,1),Q(5,2),C).err);bq(N,i)}assert.equal(N.sp.v,56,"下一輪照常回 6")});

test("一輪最多一招、招式只作用在目前這盤；冷卻與每局次數全場共用", ()=>{
  const M=match({ch:"x_shi",L:6,id:"t3",boards:[tiny([["A",4,1]]),tiny([["A",4,1]])]});
  assert.ok(M.sk.includes("tie1")&&M.sk.includes("tie2"));
  const r=W.cast(M,0,{k:"tie1"},C);assert.ok(!r.err,r.err);assert.equal(M.bs[0].P.td.me.sh.v,20,"A 盤得盾");assert.equal(M.bs[1].P.td.me.sh.v,0,"B 盤沒有");assert.equal(M.sp.v,W.SP0-20,"從共用池扣");
  assert.equal(W.cast(M,1,{k:"tie2"},C).err,"這一輪已經放過一招");assert.equal(W.why(M,1,"tie2",C),"這一輪已經放過一招");
  assert.equal(W.why(M,0,"dep",C),"","部署不是招，同一輪還能用");
  round(M);assert.equal(M.R,1);
  assert.match(W.why(M,1,"tie1",C),/冷卻中（還要 3 回合）/,"在 A 盤放過的招，B 盤也在冷卻");
  const r2=W.cast(M,1,{k:"tie2"},C);assert.ok(!r2.err,r2.err);assert.ok(M.bs[1].P.td.ctl.trap,"B 盤有守門點");assert.equal(M.bs[0].P.td.ctl.trap,null,"A 盤沒有");
  assert.equal(M.sp.v,W.SP0-20+W.RG-20);
  for(let k=0;k<3;k++)round(M);assert.equal(M.R,4);assert.equal(W.why(M,0,"tie1",C),"","放招那一輪不減，之後每總輪減 1，第 4 輪可以再放");
  /* 每局次數：緊急回復每局 2 次，算全場 */
  assert.equal(G.SKM.gheal.max,2)});

test("陣眼子被吃：只封該盤招式一輪（下一個總輪），不動共用靈力；各盤血量獨立", ()=>{
  const M=match({id:"t4",boards:[tiny([["R",1,5],["r",1,7]]),tiny()]}),A=M.bs[0],B=M.bs[1];const eyeSq=G.sqOfId(A.P.td,A.eye);
  assert.equal(eyeSq,Q(1,5),"齊轍的陣眼是俥（盤上掃到的第一顆：a5）");
  assert.ok(!W.move(M,0,Q(5,1),Q(5,2),C).err);const sp0=J(M.sp),hpB=B.P.td.me.hp;
  const r=W.reply(M,0,Q(1,7),Q(1,5),C);assert.ok(r.ok&&r.eye,"黑車吃掉陣眼");assert.deepEqual(J(M.sp),sp0,"共用靈力不動");
  assert.ok(A.P.td.me.hp<A.P.td.me.max,"A 盤被擒扣血");assert.equal(B.P.td.me.hp,hpB,"B 盤血量不受影響");assert.equal(A.seal,1);
  rq(M,1);bq(M,1);assert.equal(M.R,1);
  assert.equal(W.why(M,0,"gheal",C),"陣眼被吃：這盤封招一輪");assert.equal(W.cast(M,0,{k:"gheal"},C).err,"陣眼被吃：這盤封招一輪");
  assert.notEqual(W.why(M,1,"gheal",C),"陣眼被吃：這盤封招一輪","另一盤不封");assert.equal(W.why(M,0,"dep",C),"","封的是招式，部署照常");
  W.move(M,0,Q(5,2),Q(5,1),C);W.reply(M,0,Q(4,10),Q(4,9),C);round2(M,1);assert.equal(M.R,2);assert.equal(W.why(M,0,"gheal",C),"","封一輪就解");
  function round2(M,i){rq(M,i);bq(M,i)}});

test("總輪與本盤回合：每盤每輪一個主要行動；入侵、波次照本盤回合；沒操作的盤不會自己走、也不排引擎", async()=>{
  const M=W.newMatch({ch:"x_swordboy",L:1,id:"t5"},C),Qu={run:null,list:[]},A=M.bs[0],B=M.bs[1];
  const L=C.legal(A.P.board,"r");const[f,t]=L.find(([a,b])=>!A.P.board[b]);assert.ok(!W.move(M,0,f,t,C).err);
  assert.equal(W.stOf(M,0),"think");assert.deepEqual(J(W.needs(M)),[0],"只有 A 盤要算");
  const s=await W.step(()=>M,Qu,C,{rnd:seeded(3)});assert.ok(s.ok,"退路也有合法步");assert.equal(A.P.td.rnd,1);assert.equal(B.P.td.rnd,0);assert.equal(M.R,0,"B 盤還沒走：總輪不結束");
  assert.equal(W.stOf(M,0),"wait");const L2=C.legal(A.P.board,"r");assert.equal(W.move(M,0,L2[0][0],L2[0][1],C).err,"這盤這輪走過了");
  for(let k=0;k<5;k++){const z=await W.step(()=>M,Qu,C,{});assert.ok(z.idle,"沒有工作")}
  assert.equal(B.P.moves.length,0,"B 盤沒操作就不會自己走");assert.equal(B.P.td.rnd,0);assert.ok(B.P.td.waves.every(w=>w.st==="wait"),"B 盤的援軍不會自己推進");
  const LB=C.legal(B.P.board,"r").find(([a,b])=>!B.P.board[b]);assert.ok(!W.move(M,1,LB[0],LB[1],C).err);await W.step(()=>M,Qu,C,{rnd:seeded(5)});
  assert.equal(M.R,1,"兩盤都走過、星樞都回完：總輪 +1");assert.equal(W.stOf(M,0),"me");assert.equal(W.stOf(M,1),"me");
  /* 一盤先結束：剩下那盤每走一輪就是一個總輪 */
  A.P.result={w:"r",why:"測試"};const R0=M.R;rq2(M,1);await W.step(()=>M,Qu,C,{rnd:seeded(7)});assert.equal(M.R,R0+1,"只剩一盤：那盤走完就換輪");
  function rq2(M,i){const P=M.bs[i].P,x=C.legal(P.board,"r").find(([a,b])=>!P.board[b]);assert.ok(!W.move(M,i,x[0],x[1],C).err)}});

test("引擎佇列：每盤最多一個工作、一次只算一盤；結果交給 GSV.pick", async()=>{
  const M=match({id:"t6"}),Qu={run:null,list:[]};rq(M,0);rq(M,1);
  W.queue(Qu,M);W.queue(Qu,M);assert.equal(Qu.list.length,2,"兩盤各一個，重複排不會多");
  let live=0,peak=0;const mv=C.iccs(Q(4,10),Q(4,9));
  const search=()=>{live++;peak=Math.max(peak,live);return new Promise(z=>setTimeout(()=>{live--;z({best:mv,lines:[{k:1,mv,v:0,pv:[mv]}]})},15))};
  const p1=W.step(()=>M,Qu,C,{search,rnd:()=>0}),p2=W.step(()=>M,Qu,C,{search,rnd:()=>0});const[a,b]=await Promise.all([p1,p2]);
  assert.ok(a.ok);assert.equal(a.via,"eng");assert.ok(b.busy,"同時第二個叫 step：正在算就不再開");assert.equal(peak,1,"一次只算一盤");
  W.queue(Qu,M);assert.equal(Qu.list.length,1,"算完的那盤不再排");assert.equal(Qu.list[0].i,1);
  const c=await W.step(()=>M,Qu,C,{search,rnd:()=>0});assert.ok(c.ok);assert.equal(c.i,1);assert.equal(M.R,1)});

test("引擎佇列：重開、盤面被改過的舊結果丟掉；逾時、出錯、沒有引擎都有合法退路，不會卡在思考中", async()=>{
  /* 重開：算到一半換成新的一場 */
  let cur=match({id:"old"});const Qu={run:null,list:[]};rq(cur,0);
  const late=()=>new Promise(z=>setTimeout(()=>z({best:"d0d1",lines:[{k:1,mv:"d0d1",v:0}]}),20));
  const pr=W.step(()=>cur,Qu,C,{search:late});const old=cur;cur=match({id:"new"});const r=await pr;
  assert.ok(r.drop,"舊結果丟掉");assert.equal(old.bs[0].P.moves.length,1,"舊那場沒被套用");assert.equal(cur.bs[0].P.moves.length,0,"新那場也沒被套用");
  /* 同一場、等結果時這盤已經換了樣子（例如別的路徑先回了一步） */
  const M=match({id:"t7"}),Q2={run:null,list:[]};rq(M,0);const p=W.step(()=>M,Q2,C,{search:late});bq(M,0);const r2=await p;assert.ok(r2.drop,"盤面跟排隊時不一樣就丟");assert.equal(M.bs[0].P.moves.length,2);
  /* 逾時：引擎永遠不回 */
  rq(M,1);const t0=Date.now(),r3=await W.step(()=>M,Q2,C,{search:()=>new Promise(()=>{}),tmo:30,rnd:seeded(9)});
  assert.ok(r3.ok,"逾時照樣走");assert.equal(r3.via,"tmo");assert.equal(r3.src,"rule","用規則評估挑步");assert.ok(Date.now()-t0<1000);assert.equal(M.bs[1].P.turn,"r","回到玩家");
  /* 出錯、沒有引擎 */
  assert.equal(M.R,1);rq(M,0);const r4=await W.step(()=>M,Q2,C,{search:()=>Promise.reject(new Error("壞了"))});assert.ok(r4.ok);assert.equal(r4.via,"err");
  rq(M,1);const r5=await W.step(()=>M,Q2,C,{});assert.ok(r5.ok);assert.equal(r5.via,"none");assert.equal(M.R,2);
  /* 引擎給了不合法的步：choose 退回規則評估 */
  rq(M,0);const P=M.bs[0].P;assert.equal(P.turn,"b");W.sync(M,0);const cfg=G.engine(P,C),ch=W.choose({best:"a0a9",lines:[{k:1,mv:"a0a9",v:0}]},cfg,P,C,()=>0);
  assert.notEqual(ch[2],"first","照樣走 GSV.pick 的評估");assert.ok(C.legal(P.board,"b").some(([f,t])=>f===ch[0]&&t===ch[1]),"不合法的引擎步不會被套用")});

test("兩盤皆勝才過關；need 可設定（三盤拿兩勝）；判定後全場停住", ()=>{
  const M=match({id:"t8"});const set=(i,w)=>{M.bs[i].P.result={w,why:"測試"}};
  set(0,"r");assert.equal(W.verdict(M),null,"一勝一未完：還沒定");set(1,"r");assert.equal(W.verdict(M).win,true);
  set(1,"b");assert.equal(W.verdict(M).win,false,"一勝一敗：未過關");set(0,null);M.bs[1].P.result=null;assert.equal(W.verdict(M).win,false,"一盤和：已經不可能兩盤皆勝");
  const T=W.newMatch({ch:"x_swordboy",L:1,need:2,id:"t9",lvs:[101,102,101]},C);assert.equal(T.need,2);const s3=(i,w)=>{T.bs[i].P.result={w,why:"測試"}};
  s3(0,"r");s3(1,"b");assert.equal(W.verdict(T),null,"三盤拿兩勝：一勝一敗還沒定");s3(2,"r");assert.equal(W.verdict(T).win,true);
  s3(2,"b");assert.equal(W.verdict(T).win,false,"兩敗就不可能");
  /* 走到判定：A 盤將死黑方、B 盤先輸 → 整場結束、全部停住 */
  const N=match({id:"t10",boards:[tiny(),tiny()]});N.bs[1].P.result={w:"b",why:"測試"};W.advance(N);assert.equal(N.over.win,false);
  assert.equal(W.stOf(N,0),"done");assert.equal(W.move(N,0,Q(1,1),Q(1,2),C).err,"這場已經結束");assert.deepEqual(J(W.needs(N)),[])});

test("整場結算一次：同一場第二次不重算、不重領；試玩不給星塵、修為、定軌力", ()=>{
  const M=match({id:"t11"});M.bs[0].P.result={w:"r",why:"x"};M.bs[1].P.result={w:"r",why:"x"};W.advance(M);assert.ok(M.over.win);M.R=7;
  const a=W.record({mv:W.MODE,c:{w:0,l:0},g:[]},M);assert.equal(a.dup,false);assert.deepEqual(J(a.rw),{dust:0,xp:0,sta:0});assert.equal(a.prog.c.w,1);assert.deepEqual(J(a.prog.c.best),{R:7});
  const b=W.record(J(a.prog),M);assert.equal(b.dup,true);assert.equal(b.prog.c.w,1,"不重算");assert.deepEqual(J(b.rw),{dust:0,xp:0,sta:0});
  const L=match({id:"t12"});L.bs[0].P.result={w:"b",why:"x"};W.advance(L);const c=W.record(J(b.prog),L);assert.equal(c.prog.c.l,1);assert.equal(c.prog.c.w,1);
  assert.equal(W.record(J(c.prog),match({id:"t13"})).none,true,"還沒下完不結算");
  assert.ok(!/xpAdd|dglAdd|dglBhEnd|bhtdDust|store\.set\("xp"/.test(WSRC),"〔原始碼〕車輪戰不碰修為、定軌力、黑洞星塵")});

test("存檔接續：存成 JSON 再讀回來接著下，跟一直沒存的那份完全一樣；讀回來時輪星樞的盤會重新排進引擎", async()=>{
  const A=W.newMatch({ch:"x_miaogirl",L:12,id:"t14"},C),QA={run:null,list:[]};
  const red=(M,i,rnd)=>{const P=M.bs[i].P,L=C.legal(P.board,"r");const x=L[Math.floor(rnd()*L.length)];return W.move(M,i,x[0],x[1],C)};
  const ra=seeded(11);for(let k=0;k<3&&!A.over;k++)for(const B of A.bs){if(W.stOf(A,B.i)!=="me")continue;red(A,B.i,ra);await W.step(()=>A,QA,C,{rnd:seeded(100+k)})}
  if(!A.over)red(A,0,ra);
  const saved=JSON.stringify(A),Bm=JSON.parse(saved),QB={run:null,list:[]};assert.deepEqual(J(W.needs(Bm)),J(W.needs(A)));if(!A.over&&A.bs[0].P.turn==="b")assert.ok(W.needs(Bm).includes(0),"輪星樞的盤會再排");
  const r1=seeded(42),r2=seeded(42);
  for(let k=0;k<4;k++){const sa=await W.step(()=>A,QA,C,{rnd:r1}),sb=await W.step(()=>Bm,QB,C,{rnd:r2});assert.equal(!!sa.ok,!!sb.ok);
    for(const i of[0,1]){if(W.stOf(A,i)==="me"){const ar=seeded(k*7+i+1),br=seeded(k*7+i+1);red(A,i,ar);red(Bm,i,br)}}}
  assert.equal(JSON.stringify(Bm),JSON.stringify(A),"讀檔接續跟沒存過的完全一樣")});

test("〔原始碼〕接線：m.html 在星門圍城後面 include；關卡卡片只在開發者模式出現、只寫名稱；主控台 whlOpen；JOURNEY_KEYS 有 whl；GSV 共用靈力掛勾；testkinds 有登記", ()=>{
  const H=rd("xiangqi-db/m.html");assert.ok(H.indexOf("//#include m/07bhw-wheel.js")>H.indexOf("//#include m/07bhg-gatesiege.js"));
  const TD=rd("xiangqi-db/m/07bht-td.js");assert.ok(TD.includes('${typeof whlCard==="function"?whlCard():""}'));assert.ok(/\[data-whl\][^\n]*whlOpen\(\)/.test(TD));
  assert.ok(WSRC.includes("window.whlOpen=whlOpen"));
  assert.ok(/"gsv","whl","xsmSeen","dgl","gxtSeen"\]\.map\(k=>"m_"\+k\)/.test(rd("xiangqi-db/m/05b-save.js")));
  assert.ok(GSRC.includes("if(!td.pool)spGain(M,RG)")&&GSRC.includes("if(!td.pool)M.inc=0"));
  assert.ok(rd("xiangqi-lab/tools/testkinds.js").includes('"test-wheel.js"'));
  assert.ok(!/\r/.test(fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07bhw-wheel.js"),"utf8")),"LF");
  assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(WSRC),"沒有控制字元")});

test("關卡卡片：11/15 開發者「可以上線」→ 所有玩家都看得到，卡上只有「車輪戰」", ()=>{
  const on=load({DEVMODE:()=>true}),off=load({DEVMODE:()=>false});
  const h=vm.runInContext("whlCard()",on);assert.match(h,/data-whl="1"/);assert.equal(h.replace(/<[^>]+>/g,""),"車輪戰");
  assert.equal(vm.runInContext("whlCard()",off),h,"不是開發者也一樣");assert.equal(vm.runInContext("whlCard()",load()),h,"沒有 DEVMODE 也出現")});

test("名稱不撞：07bhw-wheel.js 宣告的頂層名字，m/ 和 src/ 其他檔都沒有宣告", ()=>{
  const names=new Set();for(const m of WSRC.matchAll(/^(?:const|let|function|var)\s+([A-Za-z_$][\w$]*)/gm))names.add(m[1]);for(const m of WSRC.matchAll(/^let ([^;]+);/gm))for(const x of m[1].matchAll(/(?:^|,)\s*([A-Za-z_$][\w$]*)\s*=/g))names.add(x[1]);
  assert.ok(names.has("WHL")&&names.has("whlOpen")&&names.has("WHL_M"));
  const dirs=["xiangqi-db/m","xiangqi-lab/src"];for(const d of dirs)for(const f of fs.readdirSync(path.join(ROOT,d)).filter(f=>/\.(js|mjs)$/.test(f)&&f!=="07bhw-wheel.js")){const s=rd(d+"/"+f);
    for(const n of names)assert.ok(!new RegExp("(?:^|[\\s;{}(,])(?:const|let|var|function)\\s+"+n.replace(/\$/g,"\\$")+"\\b").test(s),`${d}/${f} 也宣告了 ${n}`)}});
