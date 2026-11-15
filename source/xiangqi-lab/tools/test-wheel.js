// 黑洞車輪戰 wheel-v1（開發者 11/15：兩盤原型 → 三盤版「三盤拿兩勝＋危險預警」；m/07bhw-wheel.js 的 WHL 純規則，單盤規則是 m/07bhg-gatesiege.js 的 GSV）單元測試。
//   不開瀏覽器、不跑真的引擎（引擎用假的 search 函式模擬：回結果、逾時、出錯、晚到）。
//   共用靈力不疊加、一輪最多一招、招式不串盤、陣眼只封該盤、各盤血量獨立、總輪與本盤回合、沒操作的盤不會自己走、
//   引擎佇列（每盤一個工作、舊結果丟掉、逾時與出錯有合法退路）、兩盤皆勝（need 可設定）、獎勵不重領、存檔接續、接線。
//   三盤版：三盤輪轉與跳過下完的盤、兩勝／兩敗／和局判定、危險預警五種（危、將、侵、眼、門）、自動跳盤先去危險盤、「先救」提示、三盤共用靈力、舊的兩盤存檔相容、決定性、縮圖字串。
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
/* match＝舊的兩盤版（兩盤皆勝；也就是舊存檔的樣子）；match3＝三盤版（三盤拿兩勝） */
const match=(o)=>W.newMatch(Object.assign({ch:"x_swordboy",L:1,need:2,id:"t1",lvs:[101,102],boards:[tiny(),tiny()]},o||{}),C);
const match3=(o)=>W.newMatch(Object.assign({ch:"x_swordboy",L:1,id:"m3",boards:[tiny(),tiny(),tiny()]},o||{}),C);
const kinds=(M,i)=>J(W.danger(M,i,C)).map(d=>d.k);
/* 紅方原地繞（俥 a1→a3→a2→a1，三步一圈）、黑方原地來回（將 d10↔d9）：六個回合才重複一次局面，不會被循環判和 */
const rq=(M,i)=>{const b=M.bs[i].P.board,f=[Q(1,1),Q(1,3),Q(1,2)].find(q=>b[q]==="R"),t=f===Q(1,1)?Q(1,3):f===Q(1,3)?Q(1,2):Q(1,1),r=W.move(M,i,f,t,C);assert.ok(!r.err,"紅方走不了："+r.err);return r};
const bq=(M,i)=>{const b=M.bs[i].P.board,r=b[Q(4,10)]==="k"?W.reply(M,i,Q(4,10),Q(4,9),C):W.reply(M,i,Q(4,9),Q(4,10),C);assert.ok(!r.err,"黑方走不了："+r.err);return r};
const round=M=>{for(const B of M.bs)if(!B.P.result){rq(M,B.i);bq(M,B.i)}};
const seeded=s=>()=>{s=(s*16807)%2147483647;return s/2147483647};

test("三盤固定短中局：開局合法（沒人被將、不照面、紅方有步）、援軍門開局能落、子數不超過標準；只有一波；不出現在星門圍城選關；開局三盤都沒有危險", ()=>{
  assert.deepEqual(J(W.LVS),[101,102,103]);
  /* GSV.LVN 開機就算好了，車輪戰的盤不會跑進星門圍城選關。星門圍城自己會再加關卡，這裡不寫死整串：只查第 1～6 關都在、車輪戰的盤不在 */
  for(const n of[1,2,3,4,5,6])assert.ok(G.LVN.includes(n),`星門圍城第 ${n} 關還在`);for(const lv of W.LVS)assert.ok(!G.LVN.includes(lv),`車輪戰的盤 ${lv} 不會跑進星門圍城選關`);
  for(const lv of W.LVS){const b=G.startBoard(lv),pl=G.plan(lv);assert.ok(!C.inCheck(b,"r")&&!C.inCheck(b,"b"),"開局沒人被將");assert.ok(!G.facing(b));assert.ok(C.legal(b,"r").length>0);
    assert.equal(G.LV[lv].waves.length,1,"較少波次：一波");for(const w of pl.waves)assert.equal(G.spawnOk(b,w.p,w.sq,C),"","援軍落點合法");
    const cnt={};for(const[p]of pl.open)cnt[p]=(cnt[p]||0)+1;for(const w of pl.waves)cnt[w.p]=(cnt[w.p]||0)+1;for(const p in cnt)assert.ok(cnt[p]<=G.STD[p],`${p} 不超過標準子數`);
    assert.ok(pl.open.length+pl.waves.length<16,"短中局：敵方少於 16 子")}
  const M=W.newMatch({ch:"x_swordboy",L:1,id:"a"},C);assert.equal(M.bs.length,3);assert.equal(W.NEED,2);assert.equal(M.need,2,"三盤版 need＝2（三盤拿兩勝）");assert.equal(M.sp.v,W.SP0);assert.equal(M.sp.max,G.stats("x_swordboy",1).sp);
  assert.equal(new Set(M.bs.map(B=>B.nm)).size,3,"三盤名稱不一樣");assert.equal(new Set(M.bs.map(B=>B.P.start)).size,3,"三盤擺法不一樣");
  for(const B of M.bs){assert.equal(B.P.td.pool,1);assert.equal(B.P.td.mode,G.MODE);assert.ok(B.eye);assert.deepEqual(kinds(M,B.i),[],"開局沒有危險角標")}
  assert.equal(W.newMatch({ch:"x_swordboy",L:1,id:"a2",lvs:[101,102]},C).need,2,"兩盤（舊版）沒指定 need＝兩盤皆勝")});

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
  const M=W.newMatch({ch:"x_swordboy",L:1,id:"t5",lvs:[101,102]},C),Qu={run:null,list:[]},A=M.bs[0],B=M.bs[1];
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
    for(const i of[0,1,2]){if(W.stOf(A,i)==="me"){const ar=seeded(k*7+i+1),br=seeded(k*7+i+1);red(A,i,ar);red(Bm,i,br)}}}
  assert.equal(A.bs.length,3,"三盤版");assert.ok(W.okSave(JSON.parse(saved)),"三盤的存檔可以接續");assert.equal(JSON.stringify(Bm),JSON.stringify(A),"讀檔接續跟沒存過的完全一樣")});

/* ================= 三盤版（11/15）：三盤拿兩勝、危險預警 ================= */
test("三盤輪轉：三盤都走過、星樞都回完才換輪；下完的盤跳過不再輪到（不能走、不排引擎、自動跳盤不去）", ()=>{
  const M=match3({id:"r1"});assert.deepEqual(J(M.bs.map(B=>W.stOf(M,B.i))),["me","me","me"]);
  rq(M,0);bq(M,0);rq(M,1);bq(M,1);assert.equal(M.R,0,"第 3 盤還沒走：總輪不結束");assert.deepEqual(J(M.bs.map(B=>W.stOf(M,B.i))),["wait","wait","me"]);
  assert.equal(W.hop(M,1,C),2,"下一盤＝還沒走的第 3 盤");rq(M,2);assert.equal(W.stOf(M,2),"think");assert.equal(W.hop(M,2,C),-1,"都走過了：沒有可以去的盤");assert.deepEqual(J(W.needs(M)),[2]);
  bq(M,2);assert.equal(M.R,1,"三盤都走過、星樞都回完：總輪 +1");for(const B of M.bs)assert.equal(B.P.td.rnd,1);
  /* 第 2 盤先下完（勝）：之後一輪只要第 1、3 盤 */
  M.bs[1].P.result={w:"r",why:"測試"};W.advance(M);assert.equal(M.over,null,"一勝：還沒定");assert.equal(W.stOf(M,1),"done");
  assert.equal(W.move(M,1,Q(1,1),Q(1,3),C).err,"這盤已經下完");assert.equal(W.cast(M,1,{k:"gheal"},C).err,"這盤已經下完");assert.equal(W.reply(M,1,Q(4,10),Q(4,9),C).err,"不是星樞的回合");
  assert.equal(W.hop(M,0,C),2,"從第 1 盤跳：略過下完的第 2 盤");rq(M,0);bq(M,0);assert.equal(M.R,1);assert.equal(W.hop(M,0,C),2);
  rq(M,2);assert.deepEqual(J(W.needs(M)),[2],"下完的盤不排引擎");bq(M,2);assert.equal(M.R,2,"剩兩盤：兩盤走完就換輪");
  assert.equal(M.bs[1].P.moves.length,2,"下完的那盤停在原地");assert.equal(M.bs[1].P.td.rnd,1);
  assert.equal(W.hop(M,2,C),0,"繞回第 1 盤（略過第 2 盤）");assert.equal(W.hop(M,-1,C),0,"接續時從第 1 盤找起")});

test("三盤拿兩勝：任兩盤贏＝馬上過關、任兩盤輸＝馬上未過關（第三盤不用下完）；一勝一敗看第三盤", ()=>{
  const mk=(id,rs)=>{const M=match3({id});rs.forEach((w,i)=>{if(w!==undefined)M.bs[i].P.result={w,why:"測試"}});return M};
  for(const[a,b]of[[0,1],[0,2],[1,2]]){const rs=[];rs[a]="r";rs[b]="r";const M=mk("w"+a+b,rs),v=W.verdict(M);assert.equal(v.win,true,`第 ${a+1}、${b+1} 盤贏`);assert.equal(v.w,2);
    W.advance(M);assert.ok(M.over&&M.over.win);const o=[0,1,2].find(i=>i!==a&&i!==b);assert.equal(M.bs[o].P.result,null,"第三盤沒下完");assert.equal(W.stOf(M,o),"done","整場結束：全部停住");assert.equal(W.move(M,o,Q(1,1),Q(1,3),C).err,"這場已經結束")}
  for(const[a,b]of[[0,1],[0,2],[1,2]]){const rs=[];rs[a]="b";rs[b]="b";const M=mk("l"+a+b,rs),v=W.verdict(M);assert.equal(v.win,false,`第 ${a+1}、${b+1} 盤輸`);assert.equal(v.l,2);W.advance(M);assert.ok(M.over&&!M.over.win);assert.deepEqual(J(W.needs(M)),[])}
  const M=mk("wl",["r","b"]);assert.equal(W.verdict(M),null,"一勝一敗：看第三盤");W.advance(M);assert.equal(M.over,null);assert.deepEqual(J(W.tally(M)),{w:1,l:1,d:0,open:1,n:3});
  assert.equal(W.verdict(mk("wlw",["r","b","r"])).win,true);assert.equal(W.verdict(mk("wll",["r","b","b"])).win,false);
  assert.equal(W.verdict(mk("w",["r"])),null);assert.equal(W.verdict(mk("l",[undefined,"b"])),null,"只輸一盤：還有機會");
  /* 真的下出來：第 1、3 盤各一步將死（俥 a1→a10 橫掃底線；黑將 d10 被自己的士 e10、卒 d9 堵住） */
  const mate=tiny([["a",5,10],["p",4,9]]);
  const N=match3({id:"mate",boards:[mate,tiny(),mate]});assert.ok(!W.move(N,0,Q(1,1),Q(1,10),C).err);assert.equal(N.bs[0].P.result&&N.bs[0].P.result.w,"r","第 1 盤將死");assert.equal(N.over,null);
  rq(N,1);assert.ok(!W.move(N,2,Q(1,1),Q(1,10),C).err);assert.ok(N.over&&N.over.win,"拿到第二勝：馬上過關");assert.equal(N.bs[1].P.result,null);assert.equal(N.bs[1].P.turn,"b","第 2 盤星樞還沒回，也不用回了");assert.deepEqual(J(W.needs(N)),[])});

test("和局規則（我訂的）：和局那盤不算勝也不算敗；還可能拿到兩勝就繼續，不可能了（一敗一和、兩和）馬上未過關", ()=>{
  const mk=(id,rs)=>{const M=match3({id});rs.forEach((w,i)=>{if(w!==undefined)M.bs[i].P.result={w,why:"測試"}});return M};
  assert.equal(W.verdict(mk("d",[null])),null,"一和：另外兩盤都贏還能過關");assert.equal(W.verdict(mk("dw",[null,"r"])),null,"一和一勝：看第三盤");
  assert.equal(W.verdict(mk("dww",[null,"r","r"])).win,true,"一和兩勝：過關");
  for(const rs of[[null,"b"],[null,null],[null,"r","b"],[null,null,"r"],[null,null,null]]){const M=mk("x"+JSON.stringify(rs),rs),v=W.verdict(M);assert.equal(v&&v.win,false,JSON.stringify(rs)+" 拿不到兩勝");W.advance(M);assert.ok(M.over&&!M.over.win)}
  assert.deepEqual(J(W.tally(mk("t",[null,"r","b"]))),{w:1,l:1,d:1,open:0,n:3});
  const v=W.verdict(mk("v",[null,"b"]));assert.equal(v.d,1);assert.equal(v.l,1);assert.equal(v.w,0);
  /* 真的下出來：三盤都原地繞，連續 8 回合沒進展 → 第 1 盤先判和（還有機會）、第 2 盤再和（拿不到兩勝）＝整場結束，第 3 盤不用下完 */
  const M=match3({id:"np"});for(let k=0;k<G.NOPROG-1;k++)round(M);assert.equal(M.over,null);assert.equal(M.R,G.NOPROG-1);
  rq(M,0);bq(M,0);assert.deepEqual(J(M.bs[0].P.result&&M.bs[0].P.result.w),null);assert.match(M.bs[0].P.result.why,/判和/);assert.equal(M.over,null,"一和：繼續");
  rq(M,1);bq(M,1);assert.ok(M.over&&!M.over.win,"兩和：未過關");assert.equal(M.bs[2].P.result,null);
  const rec=W.record({},M);assert.equal(rec.prog.c.l,1,"未過關記一敗");assert.equal(rec.prog.c.w,0)});

test("危險預警・將與危：被將軍；已預告的入侵就會歸零（sure）、加上星樞最痛的一步才歸零（可能）；差 1 點血就不算", ()=>{
  /* 將：黑車 e8 對著紅帥 e1 */
  const A=match3({id:"d1",boards:[tiny([["r",5,8]]),tiny(),tiny()]});assert.deepEqual(kinds(A,0),["chk"]);assert.equal(W.danger(A,0,C)[0].rank,W.DG.chk);assert.deepEqual(kinds(A,1),[]);
  /* 危（可能）：黑車 a7 下一步吃俥 a1 還帶將軍 → 擒子＋將軍兩筆；HP 剛好等於這一擊＝危，多 1 點就只剩「眼」 */
  const B=match3({id:"d2",boards:[tiny([["r",1,7]]),tiny(),tiny()]}),td=B.bs[0].P.td,hit=G.dmg(G.CAPB.R,td.en.atk,td.me.def)+G.dmg(G.CHK,td.en.atk,td.me.def);
  assert.deepEqual(kinds(B,0),["eye"],"滿血：只有陣眼受威脅");td.me.hp=hit;assert.deepEqual(kinds(B,0),["core","eye"]);assert.equal(W.danger(B,0,C)[0].sure,false,"要星樞真的走那一步才歸零");assert.equal(W.danger(B,0,C)[0].loss,hit);
  td.me.hp=hit+1;assert.deepEqual(kinds(B,0),["eye"]);td.me.hp=hit;td.me.sh={v:1,exp:99};assert.deepEqual(kinds(B,0),["eye"],"盾吸掉 1 點就不會歸零");
  td.me.sh={v:0,exp:0};td.me.lastChk=td.rnd;assert.deepEqual(kinds(B,0),["eye"],"剛被將軍扣過（兩回合內不重複扣）：少一筆就不到");
  /* 危（sure）：入侵卒已預告，下一次結算的入侵傷害 ≥ HP */
  const D=match3({id:"d3",boards:[tiny([["p",3,5,"inv"]]),tiny(),tiny()]});rq(D,0);bq(D,0);const t3=D.bs[0].P.td,inv=G.dmg(G.INV,t3.en.atk,t3.me.def);
  assert.deepEqual(kinds(D,0),["inv"]);t3.me.hp=inv;assert.deepEqual(kinds(D,0),["core","inv"]);assert.equal(W.danger(D,0,C)[0].sure,true,"光是已預告的入侵就歸零");
  /* 真的結算：不處理就輸掉這一盤 */
  for(const i of[1,2]){rq(D,i);bq(D,i)}rq(D,0);bq(D,0);assert.equal(D.bs[0].P.result&&D.bs[0].P.result.w,"b","預警說會歸零，不處理真的歸零")});

test("危險預警・侵、眼、門：入侵卒預告後才算、盾吸光不算；陣眼子要星樞下一步真的吃得到（定身就不算）；援軍這回合結束落下才標", ()=>{
  /* 侵：入侵卒在我方半場，第一次結算只預告（還不會扣）；預告後＝下一次結算要扣 */
  const M=match3({id:"d4",boards:[tiny([["p",3,5,"inv"]]),tiny(),tiny()]}),td=M.bs[0].P.td;assert.deepEqual(kinds(M,0),[],"還沒預告：下一次結算不會扣");
  rq(M,0);assert.deepEqual(kinds(M,0),[],"星樞還在想的盤不標（局面未定）");bq(M,0);assert.equal(W.stOf(M,0),"wait");
  const d=W.danger(M,0,C);assert.deepEqual(J(d.map(x=>x.k)),["inv"],"這輪走過的盤也標（下一輪要先救）");assert.equal(d[0].loss,G.dmg(G.INV,td.en.atk,td.me.def));assert.equal(d[0].loss,G.preview(td,M.bs[0].P.board,C).loss,"跟星門圍城的結算預覽同一個數");
  td.me.sh={v:30,exp:99};assert.deepEqual(kinds(M,0),[],"盾吸光就不會扣血");td.me.sh={v:0,exp:0};
  const hp0=td.me.hp;for(const i of[1,2]){rq(M,i);bq(M,i)}assert.equal(W.stOf(M,0),"me");assert.deepEqual(kinds(M,0),["inv"]);rq(M,0);bq(M,0);assert.equal(td.me.hp,hp0-d[0].loss,"不處理：真的扣這麼多");
  /* 眼：黑車 a7 能吃俥 a1（齊轍的陣眼）；被定身就吃不到；陣眼不在了就不標 */
  const E=match3({id:"d5",boards:[tiny(),tiny([["r",1,7]]),tiny()]}),B=E.bs[1],te=B.P.td;assert.deepEqual(kinds(E,1),["eye"]);assert.equal(W.danger(E,1,C)[0].sq,Q(1,1));
  te.ctl.frz.push({id:te.ids[Q(1,7)],until:te.rnd+1});assert.deepEqual(kinds(E,1),[],"定身的子吃不到");te.ctl.frz=[];
  const F=match3({id:"d6",boards:[tiny(),tiny([["r",1,7],["P",1,4]]),tiny()]});assert.deepEqual(kinds(F,1),[],"中間有子擋住：吃不到");
  B.eye=null;assert.deepEqual(kinds(E,1),[],"沒有陣眼子（已經被吃）");
  /* 門：第 3 盤（援門）援軍第 2 回合結束落下 → 第 1 回合不標、第 2 回合標、落下後不標 */
  const T=match3({id:"d7",boards:[tiny(),tiny(),undefined]}),t3=T.bs[2].P.td;assert.equal(G.fore(t3)[0].inR,2);assert.deepEqual(kinds(T,2),[]);
  t3.rnd=1;assert.deepEqual(kinds(T,2),["gate"]);assert.equal(W.danger(T,2,C)[0].n,2,"兩顆援軍");t3.waves.forEach(w=>{w.st="in"});assert.deepEqual(kinds(T,2),[]);
  /* 排序與分級：危 > 將 > 侵 > 眼 > 門；門只是提醒（不到立即危險） */
  assert.deepEqual(J(W.DG),{core:5,chk:4,inv:3,eye:2,gate:1});assert.equal(W.DG_HOT,2);
  /* 下完的盤、整場結束：不標 */
  const Z=match3({id:"d8",boards:[tiny([["r",5,8]]),tiny(),tiny()]});assert.deepEqual(kinds(Z,0),["chk"]);Z.bs[0].P.result={w:"b",why:"測試"};assert.deepEqual(kinds(Z,0),[]);
  /* 純函式：不改狀態、叫幾次都一樣 */
  const s0=JSON.stringify(E),a=JSON.stringify(W.danger(E,1,C)),b=JSON.stringify(W.danger(E,1,C));W.hop(E,0,C);W.dgAlert(E,0,C);assert.equal(a,b);assert.equal(JSON.stringify(E),s0,"危險判斷不改任何狀態")});

test("自動跳盤先去有立即危險的盤；「先救」提示只在別的盤比現在這盤嚴重時出現；門不搶順序", ()=>{
  /* 第 3 盤被將軍：走完第 1 盤先跳第 3 盤（不是照順序的第 2 盤） */
  const M=match3({id:"h1",boards:[tiny(),tiny(),tiny([["r",5,8]])]});assert.equal(W.hop(M,0,C),2);assert.deepEqual(J(W.dgAlert(M,0,C)),{i:2,k:"chk",rank:4});assert.deepEqual(J(W.dgAlert(M,1,C)),{i:2,k:"chk",rank:4});
  assert.equal(W.dgAlert(M,2,C),null,"已經在最危險的盤：不提示");
  /* 兩盤都有危險：先去嚴重的（將 > 眼）；一樣嚴重照順序 */
  const N=match3({id:"h2",boards:[tiny(),tiny([["r",1,7]]),tiny([["r",5,8]])]});assert.equal(W.hop(N,0,C),2);assert.deepEqual(J(W.dgAlert(N,1,C)),{i:2,k:"chk",rank:4},"現在這盤只是陣眼受威脅，別盤被將軍");assert.equal(W.dgAlert(N,2,C),null);
  const S=match3({id:"h3",boards:[tiny([["r",1,7]]),tiny([["r",1,7]]),tiny([["r",1,7]])]});assert.equal(W.hop(S,0,C),1,"一樣嚴重：照順序");assert.equal(W.hop(S,1,C),2);assert.equal(W.hop(S,2,C),0);assert.equal(W.dgAlert(S,0,C),null,"現在這盤一樣嚴重：不提示");
  /* 危險的盤這輪走過了（不能再走）：不跳、不提示；下一輪又能走才提示 */
  const A=match3({id:"h4",boards:[tiny(),tiny(),tiny([["r",1,7]])]});assert.equal(W.hop(A,0,C),2);
  assert.ok(!W.move(A,2,Q(5,1),Q(5,2),C).err);assert.ok(!W.reply(A,2,Q(4,10),Q(4,9),C).err);assert.equal(W.stOf(A,2),"wait");assert.deepEqual(kinds(A,2),["eye"],"角標還在");
  assert.equal(W.hop(A,0,C),1,"走過的盤不跳");assert.equal(W.dgAlert(A,0,C),null);
  /* 只有門（提醒）：照順序、不提示 */
  const T=match3({id:"h5",boards:[tiny(),tiny(),undefined]});T.bs[2].P.td.rnd=1;assert.deepEqual(kinds(T,2),["gate"]);assert.equal(W.hop(T,0,C),1,"門不搶順序");assert.equal(W.dgAlert(T,0,C),null);
  /* 現在這盤走完、星樞回完、換輪後自己最危險：留在這盤 */
  const K=match3({id:"h6",boards:[tiny([["r",5,8]]),tiny(),tiny()]});assert.equal(W.hop(K,0,C),0,"自己最危險：留著");assert.equal(W.hop(K,2,C),0);
  /* 整場結束：不跳、不提示 */
  M.bs[0].P.result={w:"b",why:"x"};M.bs[1].P.result={w:"b",why:"x"};W.advance(M);assert.equal(W.hop(M,0,C),-1);assert.equal(W.dgAlert(M,0,C),null)});

test("三盤共用靈力：三盤走完一輪只回一次（+6）；三盤同一輪各擒一子合計只回 10；招式一輪一招、冷卻三盤共用", ()=>{
  const M=match3({id:"s1"});round(M);assert.equal(M.R,1);assert.equal(M.sp.v,W.SP0+W.RG,"三盤一個總輪只回一次");
  const N=match3({id:"s2",boards:[tiny([["p",1,5]]),tiny([["p",1,5]]),tiny([["p",1,5]])]});
  assert.ok(!W.move(N,0,Q(1,1),Q(1,5),C).err);assert.equal(N.sp.v,W.SP0+6);bq(N,0);assert.ok(!W.move(N,1,Q(1,1),Q(1,5),C).err);assert.equal(N.sp.v,W.SP0+10,"第二盤只回 4");bq(N,1);
  assert.ok(!W.move(N,2,Q(1,1),Q(1,5),C).err);assert.equal(N.sp.v,W.SP0+10,"第三盤擒子不再回（三盤合計上限 10）");bq(N,2);assert.equal(N.R,1);assert.equal(N.sp.v,W.SP0+10,"總輪回靈 0");assert.equal(N.sp.inc,0);
  for(const B of N.bs)assert.equal(B.P.td.me.hp,B.P.td.me.max,"各盤血量各算各的");
  const S=match3({ch:"x_shi",L:6,id:"s3",boards:[tiny([["A",4,1]]),tiny([["A",4,1]]),tiny([["A",4,1]])]});
  assert.ok(!W.cast(S,2,{k:"tie1"},C).err);assert.equal(S.bs[2].P.td.me.sh.v,20);assert.equal(S.bs[0].P.td.me.sh.v,0);assert.equal(S.bs[1].P.td.me.sh.v,0);assert.equal(S.sp.v,W.SP0-20);
  for(const i of[0,1])assert.equal(W.cast(S,i,{k:"tie2"},C).err,"這一輪已經放過一招");
  round(S);for(const i of[0,1,2])assert.match(W.why(S,i,"tie1",C),/冷卻中/,"在第 3 盤放的招，三盤都在冷卻")});

test("舊的兩盤存檔相容：進行中的兩盤對局照舊能下完（兩盤皆勝）；格式不對的存檔不接", ()=>{
  /* 舊存檔＝兩盤、need 2（兩盤原型 whlNew 存的樣子）。欄位名單照兩盤原型抄下來，改了格式這裡會叫 */
  const old=W.newMatch({ch:"x_swordboy",L:1,need:2,id:"old2",lvs:[101,102]},C);
  assert.deepEqual(Object.keys(old).sort(),["L","R","bs","cd","cdAt","ch","cn","id","log","mode","mv","need","over","pc","sk","sk1","sp","used"].sort(),"整場的欄位跟兩盤原型一樣（沒有新增必填欄位）");
  assert.deepEqual(Object.keys(old.bs[0]).sort(),["P","acted","eye","i","lv","nm","seal"].sort());assert.equal(old.mode,"wheel-v1");assert.equal(old.mv,1);
  const red=(M,i,rnd)=>{const P=M.bs[i].P,L=C.legal(P.board,"r"),x=L[Math.floor(rnd()*L.length)];return W.move(M,i,x[0],x[1],C)};
  red(old,0,seeded(3));const M=JSON.parse(JSON.stringify(old));assert.ok(W.okSave(M),"舊的兩盤存檔可以接續");assert.equal(M.bs.length,2);assert.equal(M.need,2);
  assert.deepEqual(J(W.needs(M)),[0],"讀回來：輪星樞的盤會排進引擎");assert.equal(W.hop(M,0,C),1,"自動跳盤照舊");assert.deepEqual(J(W.tally(M)),{w:0,l:0,d:0,open:2,n:2});
  for(const B of M.bs)assert.ok(Array.isArray(W.danger(M,B.i,C)),"危險預警在兩盤也能算");
  M.bs[0].P.result={w:"r",why:"測試"};W.advance(M);assert.equal(M.over,null,"兩盤版：一勝還不算過關");M.bs[1].P.result={w:"r",why:"測試"};W.advance(M);assert.ok(M.over.win,"兩盤皆勝");
  const rec=W.record({mv:W.MODE,c:{w:1,l:2,best:{R:9}},g:["x"],sk:{x_swordboy:["qi1"]},auto:false},M);assert.equal(rec.prog.c.w,2,"舊的戰績保留、接著算");assert.equal(rec.prog.c.l,2);assert.equal(rec.prog.auto,false);assert.deepEqual(J(rec.prog.sk),{x_swordboy:["qi1"]});
  assert.equal(rec.prog.c.best3,undefined,"兩盤版的最快輪數不混進三盤版");
  const L2=JSON.parse(JSON.stringify(old));L2.bs[1].P.result={w:"b",why:"測試"};W.advance(L2);assert.ok(L2.over&&!L2.over.win,"兩盤版：輸一盤就未過關（照舊）");
  /* 三盤版的最快輪數另外記 */
  const T=match3({id:"b3"});T.bs[0].P.result={w:"r",why:"x"};T.bs[2].P.result={w:"r",why:"x"};W.advance(T);T.R=5;const r3=W.record(J(rec.prog),T);assert.deepEqual(J(r3.prog.c.best3),{R:5});assert.deepEqual(J(r3.prog.c.best),J(rec.prog.c.best),"兩盤版的紀錄不動");
  /* 不接的存檔 */
  const bad=f=>{const x=JSON.parse(JSON.stringify(old));f(x);return W.okSave(x)};
  assert.equal(W.okSave(null),false);assert.equal(W.okSave({}),false);assert.equal(bad(x=>{x.mode="wheel-v0"}),false);assert.equal(bad(x=>{x.mv=9}),false);assert.equal(bad(x=>{x.bs=[]}),false);
  assert.equal(bad(x=>{x.bs=x.bs.concat(x.bs)}),false,"超過三盤");assert.equal(bad(x=>{x.bs[1].lv=999}),false,"關卡不存在");assert.equal(bad(x=>{delete x.bs[0].P.td}),false);assert.equal(bad(x=>{delete x.sp}),false)});

test("決定性：同樣的走法、同樣的亂數種子，三盤版下出來一模一樣（含危險預警、跳盤順序）", async()=>{
  const run=async()=>{const M=W.newMatch({ch:"x_martialgirl",L:6,id:"det"},C),Qu={run:null,list:[]},ra=seeded(21),trace=[];let cur=0;
    for(let k=0;k<30&&!M.over;k++){if(W.stOf(M,cur)==="me"){const P=M.bs[cur].P,L=C.legal(P.board,"r"),x=L[Math.floor(ra()*L.length)];W.move(M,cur,x[0],x[1],C)}
      for(let z=0;z<3;z++)await W.step(()=>M,Qu,C,{rnd:seeded(500+k*3+z)});
      trace.push([cur,M.bs.map(B=>W.danger(M,B.i,C).map(d=>d.k).join("")),J(W.dgAlert(M,cur,C))]);const j=W.hop(M,cur,C);if(j>=0)cur=j}
    return JSON.stringify([M,trace])};
  const a=await run(),b=await run();assert.equal(a,b);assert.ok(JSON.parse(a)[1].length>=6,"至少走了幾輪")});

test("縮圖與提示（字串）：三張縮圖、盤號、狀態、危險角標（字和形狀都不一樣）、封招、「先救」鈕、比數用的 tally", ()=>{
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const U=load({window:{XQCore:C},esc}),run=(M,code)=>{U.M_=M;return vm.runInContext(code,U)};
  const M=U.WHL.newMatch({ch:"x_swordboy",L:1,id:"u1",boards:[tiny(),tiny([["r",1,7]]),tiny([["r",5,8]])]},C);
  const h=run(M,"whlThumbs(M_)");assert.equal((h.match(/<button /g)||[]).length,3,"三張縮圖");for(const n of[1,2,3])assert.ok(h.includes(`<b class="whl-no">${n}</b>`),"盤號 "+n);
  assert.equal((h.match(/class="whl-tb me on"/g)||[]).length,1,"目前這盤只有一張標 on");assert.equal((h.match(/class="whl-mini"/g)||[]).length,3);assert.equal((h.match(/class="whl-hp"/g)||[]).length,3,"每盤我方血條");assert.equal((h.match(/class="whl-hp en"/g)||[]).length,3,"每盤星樞血條");
  assert.ok(h.includes('<i class="whl-dg eye">眼</i>'));assert.ok(h.includes('<i class="whl-dg chk">將</i>'));assert.equal((h.match(/whl-dg /g)||[]).length,2,"沒危險的盤沒有角標");assert.equal((h.match(/ hot"/g)||[]).length,2,"立即危險的盤外框會亮");
  assert.match(h,/aria-label="第 3 盤，輪到我・被將軍，/);
  assert.equal(run(M,"whlMsg(M_,0)"),"輪到你・第 1 盤");assert.equal(run(M,"whlMsg(M_,2)"),"被將軍！");assert.equal(run(M,"whlMsg(M_,1)"),"陣眼受威脅！");
  const al=run(M,"whlAlert(M_,0)");assert.match(al,/class="whl-al" data-go="2"/);assert.equal(al.replace(/<[^>]+>/g,""),"3被將軍","先救鈕只有盤號和一句");assert.equal(run(M,"whlAlert(M_,2)"),"");
  /* 狀態字：已走、思考中、勝敗和；封招角標 */
  const N=U.WHL.newMatch({ch:"x_swordboy",L:1,id:"u2",boards:[tiny(),tiny(),tiny()]},C);U.WHL.move(N,0,Q(1,1),Q(1,3),C);let t=run(N,"whlThumbs(M_)");assert.ok(t.includes('<span class="whl-st">思考中</span>'));
  U.WHL.reply(N,0,Q(4,10),Q(4,9),C);N.bs[1].seal=N.R;N.bs[2].P.result={w:"r",why:"x"};t=run(N,"whlThumbs(M_)");
  assert.ok(t.includes('<span class="whl-st">已走</span>'));assert.ok(t.includes('<i class="whl-sl">封</i>'));assert.ok(t.includes('<span class="whl-st w">勝</span>'));assert.equal((t.match(/whl-sl/g)||[]).length,1);
  N.bs[2].P.result={w:"b",why:"x"};assert.ok(run(N,"whlThumbs(M_)").includes('<span class="whl-st l">敗</span>'));N.bs[2].P.result={w:null,why:"x"};assert.ok(run(N,"whlThumbs(M_)").includes('<span class="whl-st">和</span>'));
  /* 五種角標：字都不一樣、樣式各有一條規則 */
  const DGU=vm.runInContext("WHL_DG",U),chars=Object.keys(U.WHL.DG).map(k=>DGU[k][0]);assert.equal(new Set(chars).size,5);for(const k of Object.keys(U.WHL.DG)){assert.equal(DGU[k][0].length,1);assert.ok(WSRC.includes(".whl-dg."+k+"{"),"角標樣式 "+k)}});

test("〔原始碼〕三盤版畫面：縮圖三欄（舊兩盤兩欄）、比數、開場一句「三盤拿兩勝」、新對局用 WHL.NEED、減少動態時不閃", ()=>{
  assert.ok(WSRC.includes(".whl-ths{flex:none;display:grid;grid-template-columns:repeat(3,minmax(0,1fr))"));assert.ok(WSRC.includes(".whl-ths.n2{grid-template-columns:repeat(2,minmax(0,1fr))}"));
  assert.ok(WSRC.includes('ths.className="whl-ths n"+M.bs.length'));assert.ok(WSRC.includes('<span class="a">${T.w}</span>：<span class="b">${T.l}</span>'),"比數 我：星樞");
  assert.ok(WSRC.includes('<p class="muted">三盤拿兩勝</p>'));assert.ok(!WSRC.includes("兩盤都贏才過關"),"舊的一句話拿掉了");assert.ok(WSRC.includes("WHL.newMatch({ch:ck,L,sk,need:WHL.NEED},C)"));
  assert.ok(WSRC.includes("cur:WHL.okSave(P.cur)?P.cur:null"),"存檔先驗過才接續");assert.ok(/function whlNext\(i\)\{[^\n]*WHL\.hop\(M,i,C\)\}/.test(WSRC),"自動跳盤走 WHL.hop");
  assert.ok(/prefers-reduced-motion:reduce\)\{[^}]*\.whl-tb\.hot,\.whl-al\{animation:none\}/.test(WSRC));
  const I=rd("xiangqi-db/m/07i18n.js");for(const k of["三盤拿兩勝","星核危急","入侵卒要扣血","陣眼受威脅","援軍將至","已走","比數","敗"])assert.ok(I.includes(`"${k}":"`),"英文字典有「"+k+"」")});

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

test("〔原始碼〕11/15 開發者決定擋掉星樞長將判負的漏洞：車輪戰三盤（GSV.LV 101～103）也開 arep", () => {
  const W = require("fs").readFileSync(require("path").join(__dirname, "..", "..", "xiangqi-db", "m", "07bhw-wheel.js"), "utf8");
  for (const n of [101, 102, 103]) { const i = W.indexOf("    " + n + ":{nm:"), line = i < 0 ? "" : W.slice(i, W.indexOf("\n", i)); assert.ok(line.includes("esk:[],depth:2,rs:8,arep:1,"), "第 " + n + " 盤要有 arep:1：" + line.slice(0, 80)); }
});
