// 黑洞・陣地塔防 v0.1（開發者 11/13，m/07bht-td.js 的 BHTD 純規則）單元測試。不開瀏覽器、不跑引擎：
//   七星數值與成長曲線、星樞推算步數、擒子扣元氣、開局與星門波次（16 子不變）、過河／九宮星核、炮架火網、陣眼子、護盾、定身、招式效果、勝負，
//   以及 local.js 的 tdRebuild（盤面變化重放後跟現場一樣）。
// 用法：node --test xiangqi-lab/tools/test-bhtd-rules.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const SRC=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07bht-td.js"),"utf8");
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(SRC+"\n;this.BHTD=BHTD;",ctx);const B=ctx.BHTD;
/* local.js 的 tdRebuild 原文拿出來測（同一份程式） */
const LOC=fs.readFileSync(path.join(ROOT,"xiangqi-lab/src/local.js"),"utf8");
const tdRebuild=new Function("C","parseFen","fen","START",LOC.slice(LOC.indexOf("function tdRebuild(S){"),LOC.indexOf("S.repetition=null;return S}")+"S.repetition=null;return S}".length)+";return tdRebuild")(C,C.parseFen,C.fen,C.START);

function game(lv,o){o=o||{};const start=B.startFen(lv,C),P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r"};P.pos=[C.fen(P.board,"r")];
  P.td=B.boot({lv,ch:o.ch||"x_swordboy",L:o.L||1,diff:o.diff||2,sk:o.sk},P,C);return P}
const mv=(P,f,t)=>{const m=C.stateApply(P,f,t);return B.move(P,m,C)};
const sq=(r,c)=>r*9+c,J=x=>JSON.parse(JSON.stringify(x));   /* vm 另一個 realm 的陣列，比對前轉成這邊的 */
function bmove(P){P.turn="b";return mv(P,...quiet(P,"b"))}
/* 不吃子、不將軍的安全步：紅方俥在 a 線上下、黑方找一步不會出事的 */
function quiet(P,side){const L=C.legal(P.board,side).filter(([f,t])=>!P.board[t]);for(const[f,t]of L){const x=C.make(P.board,f,t);if(!C.inCheck(x,side==="r"?"b":"r"))return[f,t]}return L[0]}
function round(P){let e=mv(P,...quiet(P,"r"));if(e)return e;return mv(P,...quiet(P,"b"))}

test("七星數值：初始（ChatGPT 版）、Lv100、成長曲線 G(1)=0、G(100)=1", ()=>{
  const z=B.stats("x_swordboy",1);assert.equal(z.hp,56);assert.equal(z.atk,.92);assert.equal(z.sp,50);assert.equal(z.spRegen,10,"Lv1 每回合回 10");
  const z100=B.stats("x_swordboy",100);assert.equal(z100.hp,100);assert.equal(z100.atk,1.25);assert.equal(z100.sp,70,"11/14 靈力上限拉開＋×10：齊轍 50→70");assert.equal(z100.spRegen,15,"齊轍 Lv100 每回合回 15");
  assert.equal(B.stats("x_shuai",1).sp,60,"沈方庭靈力上限 60");assert.equal(B.stats("x_shuai",1).hp,47);assert.equal(B.stats("x_shi",1).hp,58);assert.equal(B.stats("x_bing",1).atk,1.12);
  const hp={x_shi:58,x_swordboy:56,x_martialgirl:51,x_spiritgirl:50,x_miaogirl:49,x_bing:48,x_shuai:47};for(const k in hp)assert.equal(B.stats(k,1).hp,hp[k],k);
  assert.equal(B.G(1,42),0);assert.ok(Math.abs(B.G(100,42)-1)<1e-12);const m=B.stats("x_bing",50);assert.ok(m.atk>1.12&&m.atk<1.45);
  assert.ok(B.G(30,42)>B.G(30,52),"τ 越小前期長越快")});

test("星樞推算步數：第 1 關 1 步 → 第 6 關 2 步、第 36 關 8 步；難度 −2／0／+1／+2／+3，最少 1、最多 10；同步數失誤率逐關遞減", ()=>{
  assert.equal(B.depthOf(1,2).depth,1);assert.equal(B.depthOf(6,2).depth,2);assert.equal(B.depthOf(36,2).depth,8);
  assert.equal(B.depthOf(1,1).depth,1,"聽書最少 1 步");assert.equal(B.depthOf(6,3).depth,3);assert.equal(B.depthOf(6,4).depth,4);assert.equal(B.depthOf(6,5).depth,5);assert.equal(B.depthOf(36,5).depth,10);
  const e=[1,2,3,4,5].map(n=>B.depthOf(n,2).err);for(let i=1;i<e.length;i++)assert.ok(e[i]<e[i-1],"失誤率遞減 "+e);assert.ok(B.depthOf(6,2).err>B.depthOf(5,2).err,"升到 2 步的那關失誤率回到高點")});

test("擒子扣元氣＝基礎×吃子者倍率×攻擊倍率（陣眼 ×1.5），四捨五入、單次最多 12，破甲多 1", ()=>{
  assert.equal(B.capDmg("r","P",1.12,false,false),11,"步越溪兵吃俥 4×2.5×1.12＝11.2");assert.equal(B.capDmg("r","P",1.12,true,false),12,"陣眼再 ×1.5 封頂 12");
  assert.equal(B.capDmg("p","R",.92,false,false),1,"齊轍俥吃兵");assert.equal(B.capDmg("p","R",.92,false,true),2,"破甲 +1");assert.equal(B.capDmg("c","N",1,false,false),5,"3×1.5×1＝4.5→5");
  assert.equal(B.capDmg("r","P",1.12,true,true),12,"破甲也不超過 12")});

test("開局（第 151 題座標）：第 1 關將、雙士、5 卒原位；每關開局＋星門＝16 子；敵方元氣 28→52；第 5 關星樞半血滿靈", ()=>{
  const P=game(1),nb=P.board.filter(p=>p&&p===p.toLowerCase()).length;assert.equal(nb,8);assert.equal(B.startFen(1,C).split("/")[0],"3aka3");assert.equal(B.startFen(1,C).split("/")[3],"p1p1p1p1p");
  assert.equal(nb+P.td.waves.reduce((a,w)=>a+w.ps.length,0),16);assert.equal(P.td.en.hp,28);assert.equal(P.td.me.hp,56);assert.equal(P.td.me.sp,10);
  assert.equal(P.td.gate.at,5,"後援：第 5 回合才第一波");assert.equal(P.td.eye,"r89","齊轍的陣眼＝右俥");
  for(let n=1;n<=6;n++){const Q=game(n);const k=Q.board.filter(p=>p&&p===p.toLowerCase()).length;assert.equal(k+Q.td.waves.reduce((a,w)=>a+w.ps.length,0),16,"第 "+n+" 關")}
  assert.equal(B.startFen(2,C).split("/")[4],"p1p1p1p1p","第 2 關 5 卒在黑方河岸線（第 6 線）");assert.equal(B.startFen(3,C).split("/").slice(0,6).join("/"),"3aka3/9/9/9/9/9","第 3 關只有將與雙士");
  assert.equal(B.startFen(4,C).split("/")[3],"p7p","第 4 關卒 1/7、9/7");assert.equal(B.startFen(6,C).split("/")[5],"p1p3p2","第 6 關三卒已過河 1/5、3/5、7/5");
  const W3=game(3).td.waves.slice(0,5);assert.deepEqual(J(W3.map(w=>w.at)),[2,4,6,8,10],"第 3 關卒每 2 回合一波");assert.ok(W3.every(w=>w.fake&&w.ps[0][0]==="p"));
  const W4=game(4).td.waves;assert.equal(W4[0].at,2);assert.deepEqual(J(W4[0].ps.map(x=>x[1])),[B.LSQ(3,7),B.LSQ(7,7)],"左右夾：第 2 回合落卒 3/7、7/7");
  const Q5=game(5);assert.equal(Q5.td.en.hp,20);assert.equal(Q5.td.en.max,40);assert.equal(Q5.td.en.sp,50);assert.equal(Q5.td.en.spMax,50);assert.ok(Q5.td.waves.some(w=>w.ps.length===4),"一口氣落 4 顆");
  assert.deepEqual(J(B.LV.map(l=>l.hp)),[28,31,34,37,40,52]);assert.ok(game(6).td.boss,"第 6 關守關");assert.equal(game(1,{ch:"x_bing"}).td.eye,"r58","步越溪的陣眼＝中兵")});

test("開局合法檢查器：6 關全過；抓得到象站錯（ChatGPT 原稿雙象 3/8、7/8）、子數超過、開局將軍、跟紅子重疊", ()=>{
  for(const L of B.LV)assert.deepEqual(J(B.lvCheck(L,C)),[],"第 "+L.n+" 關");
  const base=B.LV[4],bad=o=>B.lvCheck(Object.assign({},base,o),C);
  assert.ok(bad({open:base.open.map(x=>x[0]==="b"?["b",x[1],8]:x)}).some(e=>/象不能站/.test(e)),"象 3/8、7/8 不是象位");
  assert.ok(bad({open:base.open.concat([["p",2,7]])}).some(e=>/卒共 6 顆|超過/.test(e)),"卒 6 顆");
  assert.deepEqual(J(B.lvCheck({open:[["k",5,10],["a",4,10],["a",6,10]],auto:{first:3,every:3}},C)),[],"只有將士＝合法（其餘自動排進星門）");
  assert.ok(B.lvCheck({open:[["k",5,10],["c",5,8]],auto:{first:3,every:3}},C).some(e=>/紅方被將/.test(e)),"中砲隔兵瞄紅帥＝開局將軍");
  assert.ok(B.lvCheck({open:[["k",5,10],["p",1,4]],auto:{first:3,every:3}},C).some(e=>/重疊/.test(e)),"卒擺在紅兵上");
  assert.ok(B.lvCheck({open:[["k",4,10]],auto:{first:3,every:3}},C).some(e=>/不能站/.test(e))===false);
  assert.ok(B.lvCheck({open:[["k",5,7]],auto:{first:3,every:3}},C).some(e=>/將不能站/.test(e)),"將出九宮")});

test("星門波次：第 1 關第 5 回合結束落下 1 子、P.ed 記下，tdRebuild 重放跟現場一樣；下一波重新預告", ()=>{
  const P=game(1);for(let i=0;i<5;i++)assert.equal(round(P),null);
  assert.equal(P.td.rnd,5);assert.equal(P.board.filter(p=>p&&p===p.toLowerCase()).length,9);assert.equal(P.ed.length,1);assert.equal(P.ed[0].n,10);
  assert.equal(P.td.gate.at,9);assert.equal(P.td.waves.length,7);
  const S={start:P.start,startTurn:"r",moves:P.moves.map(m=>({f:m.f,t:m.t})),ed:P.ed};tdRebuild(S);assert.deepEqual(J(S.board),J(P.board));assert.equal(S.pos[S.pos.length-1],P.pos[P.pos.length-1]);
  /* 繼續下到下一波 */for(let i=0;i<4;i++)round(P);assert.equal(P.board.filter(p=>p&&p===p.toLowerCase()).length,10)});

test("星門被紅子堵住：延一回合（最多 2 次），之後改落別格", ()=>{
  const P=game(1);P.td.gate.at=1;const g=P.td.gate.sq[0];P.board[g]="R";P.board[89]=null;P.td.pid[g]="r89";delete P.td.pid[89];
  bmove(P);assert.equal(P.td.gate.wait,1);assert.equal(P.td.gate.at,2);assert.ok(P.td.ev.some(e=>e.k==="block"));
  bmove(P);assert.equal(P.td.gate.wait,2);bmove(P);assert.equal(P.td.waves.length,7,"堵兩次以後改落別格");assert.equal(P.board[g],"R")});

test("過河扣 1、九宮星核多扣 2（雙方都算）；被將軍扣 5；護盾整次抵消", ()=>{
  const P=game(1);P.board[sq(6,0)]="p";P.td.pid[sq(6,0)]="bx";P.board[sq(8,4)]=null;   /* 黑卒過河 */
  P.board[sq(1,4)]="P";P.td.pid[sq(1,4)]="ry";   /* 紅兵在黑方九宮 */
  P.turn="b";P.td.rnd=0;B.roundEnd(P,C);assert.equal(P.td.me.hp,55);assert.equal(P.td.en.hp,25,"過河 1＋九宮 2");
  P.td.gd=1;B.roundEnd(P,C);assert.equal(P.td.me.hp,55,"護盾抵消");assert.equal(P.td.gd,0);assert.ok(P.td.ev.some(e=>e.k==="absorb"))});

test("炮架火網：紅炮隔一子瞄到的黑子標破甲，吃它多扣 1", ()=>{
  const P=game(1);P.board[1]="n";P.td.pid[1]="b1";P.board[sq(3,1)]="p";P.td.pid[sq(3,1)]="b28";   /* 左炮 64 → 炮架 28 → 黑馬 1 */
  const h=B.netHits(P.board,false).map(x=>x.t);assert.ok(h.includes(1),""+h);
  P.turn="b";B.roundEnd(P,C);assert.ok(P.td.pj.includes("b1"),"黑馬破甲")});

test("招式：一劍破甲移除卒、耗 40 靈；一回合一招；靈力不夠；帥將不能選", ()=>{
  const P=game(1,{L:30});P.td.me.sp=50;assert.equal(B.why(P,"qi1",C),null);const T=B.targets(P,"qi1",[],C);assert.ok(T.includes(27)&&!T.includes(4),"只有卒士象，沒有將");
  const r=B.cast(P,{k:"qi1",tg:[27]},C);assert.ok(r.ok);assert.equal(P.board[27],null);assert.equal(P.td.me.sp,10);assert.equal(P.ed[0].s[27],null);
  assert.match(B.why(P,"qi2",C)||"",/一回合一招|已經放過/);P.td.castR=-1;assert.match(B.why(P,"qi1",C)||"",/靈力不夠/);
  assert.match(B.cast(P,{k:"qi1",tg:[4]},C).err,/靈力|目標/)});

test("陣眼子：用它吃子 ×1.5；它被吃＝靈力歸零、招式停 1 回合", ()=>{
  const P=game(1,{ch:"x_bing"});const eye=58;P.board[sq(3,4)]=null;delete P.td.pid[31];P.board[sq(5,4)]="r";P.td.pid[sq(5,4)]="bz";   /* 黑車到兵前 */
  const h0=P.td.en.hp;mv(P,eye,sq(5,4));assert.equal(h0-P.td.en.hp,12,"4×2.5×1.12×1.5＝16.8→12");assert.equal(P.td.me.sp,20,"擒子 +10 靈力");
  const Q=game(1,{ch:"x_bing"});Q.td.me.sp=30;Q.board[sq(5,4)]="r";Q.td.pid[sq(5,4)]="bz";Q.turn="b";mv(Q,sq(5,4),58);
  assert.equal(Q.td.me.sp,0);assert.ok(Q.td.seal>Q.td.rnd);assert.match(B.why(Q,"bu1",C)||"",/陣眼/)});

test("定身：煙火震懾的那顆子，星樞這一步不能走（searchmoves），敵方沒別步時照常走", ()=>{
  const P=game(1,{ch:"x_martialgirl"});P.td.me.sp=20;assert.ok(B.cast(P,{k:"lei1",tg:[27]},C).ok);P.turn="b";
  const e=B.engine(P,C);assert.ok(e.sm&&e.sm.length&&e.sm.every(u=>u.slice(0,2)!==C.iccs(27,27).slice(0,2)));assert.equal(e.depth,1);
  const Q={board:Array(90).fill(null),turn:"b",td:{frz:["bk2"],pid:{0:"bk2"},ai:B.depthOf(1,2),lv:1}};Q.board[4]="k";Q.board[85]="K";Q.board[0]="r";Q.board[13]="R";
  assert.equal(B.engine(Q,C).sm,null,"沒有其他子可走就不限制")});

test("小盾、護盾、仕角守門、回營、神行百里換完要合法、回元氣乘（元氣上限÷50）", ()=>{
  const P=game(1,{ch:"x_shi",L:30});P.td.me.sp=50;assert.ok(B.cast(P,{k:"tie1"},C).ok);assert.equal(P.td.gd,1);
  const Q=game(1,{ch:"x_bing"});Q.td.me.sp=10;const T=B.targets(Q,"bu1",[85],C);assert.ok(!T.includes(84)&&!T.includes(86),"帥跟仕換：仕站不了帥的位置");assert.ok(!T.includes(83),"帥不能出九宮");
  const R=game(1,{ch:"x_miaogirl"});R.td.me.sp=50;R.board[sq(5,0)]="r";R.td.pid[sq(5,0)]="bz";R.turn="b";mv(R,sq(5,0),54);assert.equal(R.td.lost.length,1);R.board[54]=null;   /* 黑車吃了兵又被吃掉（直接清掉） */
  delete R.td.pid[54];R.turn="r";assert.deepEqual(J(B.targets(R,"luo1",[],C)),[54]);R.td.castR=-1;assert.ok(B.cast(R,{k:"luo1",tg:[54]},C).ok);assert.equal(R.board[54],"P");assert.equal(R.td.pid[54],"r54");
  const H=game(1,{ch:"x_shuai"});H.td.me.hp=20;H.td.me.sp=30;B.cast(H,{k:"shen1"},C);assert.equal(H.td.me.hp,20+Math.round(15*47/50))});

test("勝負：星樞元氣歸零＝贏；我方歸零＝輸；同時歸零走棋方贏", ()=>{
  const P=game(1,{ch:"x_swordboy",L:30,sk:["qi2"]});P.td.en.hp=1;P.td.me.sp=50;assert.ok(B.cast(P,{k:"qi2"},C).err,"還沒走俥不能放直路衝鋒");
  mv(P,81,63);const r=B.cast(P,{k:"qi2"},C);assert.deepEqual(J(r.end),{w:"r",why:"星樞元氣歸零"},"走俥 2 格再放直路衝鋒，打光星樞");
  const Q=game(1);Q.td.en.hp=1;Q.board[sq(2,0)]="p";Q.td.pid[sq(2,0)]="bq";Q.board[sq(3,0)]=null;   /* 俥直線上有卒 */
  const e=mv(Q,81,sq(2,0));assert.deepEqual(J(e.end),{w:"r",why:"星樞元氣歸零"});
  const Z=game(1);Z.td.me.hp=1;Z.td.en.hp=1;Z.board[sq(4,0)]="P";Z.board[54]="p";Z.td.pid[sq(4,0)]="r54";Z.td.pid[54]="bq";Z.turn="b";B.roundEnd(Z,C);
  assert.ok(Z.td.me.hp===0&&Z.td.en.hp===0);Z.td.rnd=5;Z.turn="b";Z.board[54]=null;Z.board[63]="p";Z.td.pid[63]="bq";delete Z.td.pid[54];Z.td.me.hp=1;Z.td.en.hp=1;
  const e2=mv(Z,63,64-9+9);assert.equal(e2&&e2.end&&e2.end.w,"b","同時歸零：走棋方（星樞）贏")});

test("星樞失誤：照失誤率在差距 margin 內的其他候選裡挑；沒失誤＝最佳著", ()=>{
  const r={best:"a0a1",lines:[{k:1,v:100,mv:"a0a1"},{k:2,v:-50,mv:"b0b1"},{k:3,v:-900,mv:"c0c1"}]};
  assert.equal(B.pick(r,{err:0,margin:300},()=>.5),"a0a1");assert.equal(B.pick(r,{err:1,margin:300},()=>.1),"b0b1","−900 的不挑");
  assert.equal(B.pick({best:"x"},{err:1,margin:300},()=>0),"x")});

test("招式資料表：七位各 5 招（Lv 1、6、12、17、23），第 1 招都有草書圖、不重名", ()=>{
  const ids=new Set();for(const ck in B.CH){const L=B.SK.filter(s=>s.ch===ck);assert.deepEqual(J(L.map(s=>s.lv)),[1,6,12,17,23],ck);assert.ok(L[0].cao&&/cao_x_/.test(L[0].cao),ck)}
  for(const s of B.SK){assert.ok(!ids.has(s.nm),"重名 "+s.nm);ids.add(s.nm);assert.ok(s.cost>=10&&s.cost<=50&&s.cost%10===0,s.id+" 耗靈 ×10")}assert.equal(B.SK.length,35)});

/* ---------- 整合：local.js 整支在沙盒裡跑（假 localStorage、假引擎），接上 BHTD：開局、走棋、星樞回應、星門落子、放招、不能悔棋、重新載入盤面一樣 ---------- */
function fakeIDB(){const data=new Map();return{open(){const r={};setImmediate(()=>{r.result={transaction(){const t={},store={get(k){const q={result:data.get(k)};setImmediate(()=>q.onsuccess&&q.onsuccess());return q},put(v,k){data.set(k,v);return{}},delete(k){data.delete(k);return{}}};t.objectStore=()=>store;setImmediate(()=>setImmediate(()=>t.oncomplete&&t.oncomplete()));return t}};r.onsuccess&&r.onsuccess()});return r}}}
function tab(m){const Q=[],T={ev:[],sm:[],Q};const ls={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};
  const ctx={console:{log(){},warn(){},error(){}},URL,URLSearchParams,setImmediate,Date,Math,JSON,setTimeout:(fn)=>{Q.push(fn);return Q.length},clearTimeout(){},setInterval:()=>0,clearInterval(){},
    localStorage:ls,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},indexedDB:fakeIDB(),location:{href:"http://localhost/",hash:"#/journey/play",pathname:"/",search:""},history:{replaceState(){}},navigator:{onLine:true},
    Event:class{constructor(t){this.type=t}},CustomEvent:class{constructor(t,d){this.type=t;this.detail=d&&d.detail}},addEventListener(){},removeEventListener(){},dispatchEvent:e=>{T.ev.push(e.type);return true},document:{hidden:false,addEventListener(){}},atob:s=>Buffer.from(s,"base64").toString("binary"),
    XQEngine:{ready:true,search:async(q,lim,mpv)=>{if(lim&&lim.searchmoves)T.sm.push(lim.searchmoves.slice());const S0={start:q.fen.split(" ")[0],startTurn:q.fen.split(" ")[1]==="b"?"b":"r",moves:(q.moves||[]).map(u=>({f:C.parseSq(u.slice(0,2)),t:C.parseSq(u.slice(2,4))}))};C.stateRebuild(S0);const b=S0.board,s=S0.turn;let L=C.legal(b,s).map(([f,t])=>C.iccs(f,t));
      if(lim&&lim.searchmoves&&lim.searchmoves.length)L=L.filter(u=>lim.searchmoves.includes(u));const quiet=L.filter(u=>!b[C.parseSq(u.slice(2,4))]);const best=(quiet[0]||L[0]);return{best,lines:[{k:1,v:0,mv:best,pv:[best]}]}}}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"xiangqi-lab/site/core.js"),"utf8"),ctx);vm.runInContext(LOC,ctx);vm.runInContext(SRC,ctx);
  T.api=async(u,b)=>JSON.parse(JSON.stringify(await ctx.XQ.api(u,b)));T.pump=async()=>{for(let i=0;i<120&&Q.length;i++){const f=Q.shift();try{const r=f();if(r&&r.catch)r.catch(()=>{})}catch(e){}for(let k=0;k<6;k++)await new Promise(r=>setImmediate(r))}};return T}   /* 計時器不 await（playEngine 等的 setTimeout 也在佇列裡） */
test("整合：local.js＋BHTD——開局帶 td、星樞照推算步數回應、第 5 回合星門落子、放招不佔走棋、不能悔棋、重新載入盤面一樣", async ()=>{
  const m=new Map(),T=tab(m);const fen=B.startFen(1,C);
  let s=await T.api("/play/new",{human:"r",lx:1,journey:"bh:td1",lv:{fen,turn:"r"},td:{lv:1,ch:"x_martialgirl",L:20,diff:2,sk:["lei1","lei2"]}});
  assert.ok(s.td,"playState 帶 td");assert.equal(s.td.lv,1);assert.deepEqual(s.td.sk,["lei1","lei2"]);assert.equal(s.board.filter(p=>p&&p===p.toLowerCase()).length,8);
  s.td.me.sp=20;await T.pump();
  /* 放招：煙火震懾定住黑馬（1），星樞下一步不能動它 */
  const P0=JSON.parse(m.get("xq_play"));P0.td.me.sp=20;P0.seq+=1;m.set("xq_play",JSON.stringify(P0));
  s=await T.api("/play/td",{k:"lei1",tg:[27]});assert.equal(s.turn,"r","放招不佔走棋");assert.equal(s.td.me.sp,0);assert.ok(s.td.frz.includes("b27"));
  await assert.rejects(T.api("/play/td",{k:"lei1",tg:[27]}),/靈力|一回合/);
  const rq=([f,t])=>!s.board[t];let mv=C.legal(s.board,"r").find(rq);s=await T.api("/play/move",{f:mv[0],t:mv[1]});await T.pump();s=await T.api("/play/state");
  assert.equal(s.turn,"r");assert.equal(s.td.rnd,1);assert.ok(T.sm.length&&T.sm[0].every(u=>!u.startsWith(C.iccs(27,27).slice(0,2))),"定身的卒不在 searchmoves 裡");assert.equal(s.td.frz.length,0,"定身一回合就解");
  await assert.rejects(T.api("/play/undo"),/不能悔棋/);
  for(let i=0;i<4;i++){mv=C.legal(s.board,"r").find(([f,t])=>!s.board[t]&&!C.inCheck(C.make(s.board,f,t),"b"));s=await T.api("/play/move",{f:mv[0],t:mv[1]});await T.pump();s=await T.api("/play/state")}
  assert.equal(s.td.rnd,5);assert.equal(s.board.filter(p=>p&&p===p.toLowerCase()).length,9,"第 5 回合結束星門落下 1 子（後援）");
  const saved=JSON.parse(m.get("xq_play"));assert.ok(saved.ed&&saved.ed.length===1&&saved.td,"存檔帶 ed、td");
  const T2=tab(m),s2=await T2.api("/play/state");assert.deepEqual(s2.board,s.board,"另一個分頁／重新載入：盤面照 ed 重放");assert.deepEqual(s2.td,s.td)});

test("星樞棋兵招：先預告一回合再發動、一回合最多 1 招；守關「引力撕裂」扣 5；卒海過河最多扣 2／3；殘卒反星", ()=>{
  const P=game(6);assert.equal(P.td.en.sp,30);assert.equal(P.td.fx,null);bmove(P);
  assert.equal(P.td.fx&&P.td.fx.id,"ylsl","第 6 關靈力 30 先預告引力撕裂");assert.equal(P.td.fx.at,P.td.rnd+1);assert.equal(P.td.en.sp,0);
  assert.equal(B.foeEst(P.td,P.board),5);const F=B.foeMarks(P.td,P.board);assert.deepEqual(J(F.red),[85],"受影響的是紅帥");
  const n0=P.td.ev.length;P.td.rnd++;B.roundEnd(P,C);assert.ok(P.td.ev.slice(n0).some(e=>e.k==="hit"&&e.why==="引力撕裂"&&e.n===5),"下回合結束扣 5");assert.equal(P.td.fx,null);
  const Q=game(2);Q.td.en.sp=20;for(const c of[0,4,8]){Q.board[sq(5,c)]="p";Q.board[sq(4,c)]=null;Q.td.pid[sq(5,c)]="bq"+c;delete Q.td.pid[sq(4,c)]}
  Q.turn="b";Q.td.rnd=0;B.roundEnd(Q,C);assert.equal(Q.td.fx&&Q.td.fx.id,"zhs");assert.equal(Q.td.fx.est,2,"第 2 關卒海最多 2");Q.td.rnd++;B.roundEnd(Q,C);
  assert.ok(Q.td.ev.some(e=>e.k==="hit"&&e.why==="卒海過河"&&e.n===2));
  const R=game(1);R.td.en.sp=10;R.board[sq(5,0)]="p";R.board[27]=null;R.td.pid[sq(5,0)]="b27";delete R.td.pid[27];R.turn="b";R.td.rnd=0;B.roundEnd(R,C);
  assert.equal(R.td.fx&&R.td.fx.id,"cfx");assert.equal(R.td.fx.tag,"b27");const hr=R.td.me.hp;R.turn="r";mv(R,54,sq(5,0));assert.equal(hr-R.td.me.hp,1,"吃掉點名的卒：你扣 1")});

test("星碎格：踩上去扣自己 3 元氣（敵我都算）", ()=>{
  const P=game(2),s0=P.td.shard[0];assert.equal(s0,B.LSQ(2,6));P.board[s0+18]="R";P.td.pid[s0+18]="rx";const h=P.td.me.hp;mv(P,s0+18,s0);assert.equal(h-P.td.me.hp,3);assert.ok(P.td.ev.some(e=>e.k==="shard"));
  const Q=game(2),q=Q.td.shard[0];Q.board[q-9]="n";Q.td.pid[q-9]="bn";Q.turn="b";const he=Q.td.en.hp;mv(Q,q-9,q);assert.ok(Q.td.ev.some(e=>e.k==="hit"&&e.sd==="b"&&e.why==="星碎格"&&e.n===3))});

test("星樞性格：搶過河／愛吃子在差不多好的候選裡挑合性格的；沒有性格＝最佳著", ()=>{
  const b=Array(90).fill(null);b[4]="k";b[85]="K";b[sq(4,0)]="p";b[sq(2,4)]="r";b[sq(6,4)]="P";
  const r={best:"x",lines:[{v:30,mv:C.iccs(sq(2,4),sq(1,4))},{v:0,mv:C.iccs(sq(4,0),sq(5,0))},{v:-10,mv:C.iccs(sq(2,4),sq(6,4))}]};
  assert.equal(B.pick(r,{err:0,margin:300,ps:"搶過河",b},()=>.9),r.lines[1].mv,"卒過河");assert.equal(B.pick(r,{err:0,margin:300,ps:"愛吃子",b},()=>.9),r.lines[2].mv,"吃兵");
  assert.equal(B.pick(r,{err:0,margin:300,ps:"",b},()=>.9),r.lines[0].mv,"沒有性格＝最佳著")});

test("靈力：每回合回 spRegen（Lv1＝10）、擒子再 +10（開發者 11/13；11/14 晚 ×10）；不超過上限；陣眼被擒封靈的下一回合不加", ()=>{
  const P=game(1),s0=P.td.me.sp;assert.equal(P.td.me.spRg,10);round(P);assert.equal(P.td.me.sp,Math.min(P.td.me.spMax,s0+10),"一回合 +10");
  for(let i=0;i<8&&!P.result;i++)round(P);assert.equal(P.td.me.sp,P.td.me.spMax,"加滿就停在上限");
  P.td.me.sp=0;P.td.seal=P.td.rnd+1;round(P);assert.equal(P.td.me.sp,0,"封靈那一回合不加");round(P);assert.equal(P.td.me.sp,10,"封靈過後照加")});

/* ---------- 11/13 十八招去重定稿（story/十八招程式修改清單_1113.md）：七星 17 招＋殘卒反星，每招至少一個斷言驗新效果 ---------- */
const put=(P,q,p,tag)=>{P.board[q]=p;if(p)P.td.pid[q]=tag||(p===p.toLowerCase()?"b":"r")+"x"+q;else delete P.td.pid[q]};
const sk=(ch,id)=>{const P=game(1,{ch,L:30,sk:[id]});P.td.me.sp=P.td.me.spMax;return P};
const nextR=(P)=>{P.td.rnd++;B.roundEnd(P,C)};   /* 模擬星樞走了一步別的子（rnd+1、回合結束） */
/* 黑方只剩一步、而且是吃子（星樞被將軍，只能用車吃掉將軍的俥；將往旁邊走都被俥看住） */
function onlyCap(td){const b=Array(90).fill(null);b[4]="k";b[13]="R";b[9]="r";b[84]="R";b[86]="R";b[85]="K";return{board:b,turn:"b",td:Object.assign({v:3,frz:[],pid:{9:"bq",13:"rR"},noCap:[],noTake:[],rnd:0,ai:B.depthOf(1,2),lv:1},td)}}

test("td v3：舊存檔（v2）讀進來補新欄位", ()=>{
  const P=game(1);const o=J(P.td);o.v=2;for(const k of["hot","frzQ","trap","lockW","run","noCross","noCap","noTake","pair","revB","lastR","thr"])delete o[k];o.rf={chk:0,hurt:0};
  const f=B.tdFix(o);assert.equal(f.v,3);assert.deepEqual(J(f.frzQ),[]);assert.equal(f.noCross,-1);assert.equal(f.rf.dmg,0);assert.equal(P.td.v,3)});

test("九宮守心：帥在九宮正中心才能放；之後 3 回合每回合結束回 4；帥離開正中心就停", ()=>{
  const P=sk("x_shuai","shen5");P.td.me.hp=20;assert.match(B.why(P,"shen5",C)||"",/正中心/);
  put(P,85,null);put(P,76,"K","r85");assert.ok(B.cast(P,{k:"shen5"},C).ok);const a=Math.round(4*P.td.me.max/50);
  for(let i=0;i<3;i++){const h=P.td.me.hp;nextR(P);assert.equal(P.td.me.hp-h,a,"第 "+(i+1)+" 回合回 4")}
  let h=P.td.me.hp;nextR(P);assert.equal(P.td.me.hp,h,"3 回合後停");
  P.td.castR=-1;P.td.me.sp=60;assert.ok(B.cast(P,{k:"shen5"},C).ok);put(P,76,null);put(P,67,"K","r85");h=P.td.me.hp;nextR(P);assert.equal(P.td.me.hp,h,"帥離開正中心就不回");assert.equal(P.td.hot.length,0)});

test("仕角守門：仕斜角的空點變守門點，黑子走進去下回合定身（不在 searchmoves）；2 回合後失效", ()=>{
  const P=sk("x_shi","tie2");assert.ok(B.cast(P,{k:"tie2"},C).ok);assert.deepEqual(J(P.td.trap.map(o=>o.sq)),[74,76,78]);
  put(P,57,"n","bn");P.turn="b";mv(P,57,76);assert.ok(P.td.frz.includes("bn"),"走進守門點就定身");
  P.turn="b";const e=B.engine(P,C);assert.ok(e.sm&&e.sm.every(u=>!u.startsWith(C.iccs(76,76).slice(0,2))),"定身的馬不在 searchmoves");
  nextR(P);assert.ok(!P.td.frz.includes("bn"),"定身 1 回合");nextR(P);assert.equal(P.td.trap.length,0,"2 回合後守門點消失")});

test("銅鎖止步：鎖住的子下回合走了 → 定身 2 回合；沒走就沒事", ()=>{
  const P=sk("x_shi","tie3");assert.ok(B.cast(P,{k:"tie3",tg:[27]},C).ok);assert.equal(P.td.lockW.tag,"b27");
  P.turn="b";mv(P,27,36);assert.ok(P.td.frz.includes("b27"),"走完定身");nextR(P);assert.ok(P.td.frz.includes("b27"),"第 2 回合還定身");nextR(P);assert.ok(!P.td.frz.includes("b27"),"2 回合後解開");
  const Q=sk("x_shi","tie3");assert.ok(B.cast(Q,{k:"tie3",tg:[27]},C).ok);Q.turn="b";mv(Q,3,13);assert.equal(Q.td.frz.length,0,"沒走就沒事");assert.equal(Q.td.lockW,null,"鎖只看下回合")});

test("近侍護帥：開局仕不在帥斜角不能放；帥進九宮正中、兩仕在斜角 → 護盾 +2", ()=>{
  const P=sk("x_shi","tie4");assert.match(B.why(P,"tie4",C)||"",/斜角/);assert.equal(B.SKM.tie4.steps,0);
  put(P,85,null);put(P,76,"K","r85");assert.ok(B.cast(P,{k:"tie4"},C).ok);assert.equal(P.td.gd,2)});

test("盾陣回靈：這回合被扣不到 4 不能放；被扣 9 → 得 20 靈力；被扣的元氣記在 rf.dmg", ()=>{
  const P=sk("x_shi","tie5");P.td.me.sp=10;assert.match(B.why(P,"tie5",C)||"",/不到 4/);
  put(P,sq(5,0),"p","bq");P.turn="b";P.td.rnd=0;B.roundEnd(P,C);assert.equal(P.td.rf.dmg,1,"過河扣 1 記進 rf.dmg");
  P.td.rf.dmg=9;assert.ok(B.cast(P,{k:"tie5"},C).ok);assert.equal(P.td.me.sp,20)});

test("跑腿賺錢：元氣滿也能放；3 回合內兵往前走 1 步回 4（最多 3 次），第 4 次不回", ()=>{
  const P=sk("x_bing","bu3");assert.equal(B.why(P,"bu3",C),null,"元氣滿也能先放");P.td.me.hp=20;assert.ok(B.cast(P,{k:"bu3"},C).ok);const a=Math.round(4*P.td.me.max/50);
  for(const f of[54,56,58]){const h=P.td.me.hp;mv(P,f,f-9);assert.equal(P.td.me.hp-h,a,"兵 "+f+" 前進回 4");bmove(P)}
  const h=P.td.me.hp;mv(P,60,51);assert.equal(P.td.me.hp,h,"第 4 次不回");assert.equal(P.td.run,null)});

test("直路衝鋒：上一步要是俥；扣「格數×2」乘攻擊倍率，最多 10", ()=>{
  const P=sk("x_swordboy","qi2");assert.match(B.why(P,"qi2",C)||"",/俥/);mv(P,81,63);const h=P.td.en.hp;assert.ok(B.cast(P,{k:"qi2"},C).ok);
  assert.equal(h-P.td.en.hp,Math.round(4*P.td.me.atk),"俥走 2 格扣 4×倍率");
  const Q=sk("x_swordboy","qi2");put(Q,54,null);put(Q,sq(1,0),null);mv(Q,81,9);const h2=Q.td.en.hp;assert.ok(B.cast(Q,{k:"qi2"},C).ok);assert.equal(h2-Q.td.en.hp,Math.round(10*Q.td.me.atk),"走 8 格也最多 10");
  const R=sk("x_swordboy","qi2");mv(R,82,65);assert.match(B.why(R,"qi2",C)||"",/俥/,"上一步走傌不能放")});

test("認轍尋路：標出下一步擒得到俥的敵子；紅方走下一步標記就清掉", ()=>{
  const P=sk("x_swordboy","qi4");assert.ok(B.why(P,"qi4",C),"沒人追俥不能放");put(P,71,"r","bq");
  assert.ok(B.cast(P,{k:"qi4"},C).ok);assert.deepEqual(J(P.td.thr.q),[71]);const e=P.td.ev.find(x=>x.k==="thr");assert.deepEqual(J(e.sq),[71]);
  mv(P,54,45);assert.equal(P.td.thr,null)});

test("青玉護棚：2 回合內敵子過河不扣、九宮星核那 2 照扣；第 3 回合照扣", ()=>{
  const P=sk("x_spiritgirl","tian2");assert.equal(B.why(P,"tian2",C),null);for(const c of[0,4,8])put(P,sq(5,c),"p","bp"+c);put(P,76,"n","bn");
  assert.ok(B.cast(P,{k:"tian2"},C).ok);let h=P.td.me.hp;nextR(P);assert.equal(h-P.td.me.hp,2,"第 1 回合只扣九宮 2");h=P.td.me.hp;nextR(P);assert.equal(h-P.td.me.hp,2);
  h=P.td.me.hp;nextR(P);assert.equal(h-P.td.me.hp,6,"第 3 回合照扣：過河 4＋九宮 2")});

test("象眼迷煙：那顆子 2 回合內吃子的步不在 searchmoves、其他步還在；只剩吃子步時照常", ()=>{
  const P=sk("x_spiritgirl","tian3");put(P,45,"r","bq");assert.ok(B.cast(P,{k:"tian3",tg:[45]},C).ok);P.turn="b";
  let e=B.engine(P,C);assert.ok(!e.sm.includes(C.iccs(45,54)),"不能吃兵");assert.ok(e.sm.includes(C.iccs(45,36)),"還可以走");
  nextR(P);P.turn="b";e=B.engine(P,C);assert.ok(e.sm&&!e.sm.includes(C.iccs(45,54)),"第 2 回合還不能吃");nextR(P);P.turn="b";assert.equal(B.engine(P,C).sm,null,"2 回合後解除");
  const Q=onlyCap({noCap:[{tag:"bq",until:5}]});assert.equal(C.legal(Q.board,"b").length,1);assert.equal(B.engine(Q,C).sm,null,"只剩吃子步就照常")});

test("渡口清茶：這回合己方擒過子不能放；下一步沒擒子就可以", ()=>{
  const P=sk("x_spiritgirl","tian4");P.td.me.hp=20;put(P,45,"p","bq");mv(P,54,45);assert.match(B.why(P,"tian4",C)||"",/擒過子/);
  bmove(P);mv(P,56,47);assert.equal(B.why(P,"tian4",C),null);const h=P.td.me.hp;assert.ok(B.cast(P,{k:"tian4"},C).ok);assert.equal(P.td.me.hp-h,Math.round(10*P.td.me.max/50))});

test("雙燕斜護：結對的一顆被擒，另一顆下一次被擒不扣元氣", ()=>{
  const P=sk("x_spiritgirl","tian5");assert.ok(B.cast(P,{k:"tian5",tg:[54,64]},C).ok);assert.equal(P.td.pair.length,1);
  put(P,45,"r","bq");P.turn="b";let h=P.td.me.hp;mv(P,45,54);assert.ok(h-P.td.me.hp>=1,"第一顆被擒照扣");assert.equal(P.td.pair.length,0);
  put(P,63,"r","bq2");P.turn="b";const n0=P.td.ev.length;mv(P,63,64);assert.ok(!P.td.ev.slice(n0).some(e=>e.k==="hit"&&e.why==="被擒"),"另一顆被擒不扣");assert.ok(P.td.ev.slice(n0).some(e=>e.k==="shuse"))});

test("隔子星花：炮隔一子打目標扣 8；炮架也是敵子再扣它 4", ()=>{
  const P=sk("x_martialgirl","lei2");put(P,46,"p","bs");put(P,28,"n","bt");assert.ok(B.targets(P,"lei2",[],C).includes(28));const n0=P.td.ev.length;
  assert.ok(B.cast(P,{k:"lei2",tg:[28]},C).ok);const H=P.td.ev.slice(n0).filter(e=>e.k==="hit"&&e.why==="隔子星花");assert.deepEqual(J(H.map(e=>[e.sq,e.n])),[[28,Math.round(8*P.td.me.atk)],[46,Math.round(4*P.td.me.atk)]]);
  const Q=sk("x_martialgirl","lei2");put(Q,46,"P","rs");put(Q,28,"n","bt");const m0=Q.td.ev.length;assert.ok(B.cast(Q,{k:"lei2",tg:[28]},C).ok);assert.equal(Q.td.ev.slice(m0).filter(e=>e.k==="hit").length,1,"炮架是己方子就只打目標")});

test("煙幕護耳：下回合黑方吃那顆子的步被拿掉；只剩那一步時照常", ()=>{
  const P=sk("x_martialgirl","lei5");put(P,45,"r","bq");assert.ok(B.cast(P,{k:"lei5",tg:[54]},C).ok);P.turn="b";
  const e=B.engine(P,C);assert.ok(e.sm&&!e.sm.includes(C.iccs(45,54))&&e.sm.includes(C.iccs(45,36)));nextR(P);P.turn="b";assert.equal(B.engine(P,C).sm,null,"只撐 1 回合");
  assert.equal(B.engine(onlyCap({noTake:[{tag:"rR",until:5}]}),C).sm,null,"沒有別步就照常")});

test("拐彎避風：上一步走傌 → 護盾 +1；上一步走別的不能放", ()=>{
  const P=sk("x_miaogirl","luo3");assert.match(B.why(P,"luo3",C)||"",/傌/);mv(P,82,65);assert.ok(B.cast(P,{k:"luo3"},C).ok);assert.equal(P.td.gd,1);
  bmove(P);mv(P,81,72);P.td.castR=-1;assert.match(B.why(P,"luo3",C)||"",/傌/)});

test("驛鈴回氣：回 6；之後回營復活時再回 10（只一次）", ()=>{
  const P=game(1,{ch:"x_miaogirl",L:30,sk:["luo1","luo4"]});P.td.me.sp=P.td.me.spMax;P.td.me.hp=20;const mx=P.td.me.max;
  assert.ok(B.cast(P,{k:"luo4"},C).ok);assert.equal(P.td.me.hp,20+Math.round(6*mx/50));assert.equal(P.td.revB,1);
  put(P,45,"r","bz");P.turn="b";mv(P,45,54);put(P,54,null);P.turn="r";P.td.castR=-1;P.td.me.sp=P.td.me.spMax;const h=P.td.me.hp;
  assert.ok(B.cast(P,{k:"luo1",tg:[54]},C).ok);assert.equal(P.td.me.hp-h,Math.round(10*mx/50),"回營時多回 10");assert.equal(P.td.revB,0)});

test("馬腿解圍：蹩住傌腿的己方子瞬移到己方半場左右或後方最近的合法空位（不往前），傌那個方向的日字步變合法", ()=>{
  const P=sk("x_miaogirl","luo5");put(P,64,null);put(P,73,"C","r64");assert.ok(!C.legal(P.board,"r").some(([f,t])=>f===82&&t===63),"腿被炮蹩住");
  assert.ok(B.targets(P,"luo5",[],C).includes(73));assert.ok(B.cast(P,{k:"luo5",tg:[73]},C).ok);assert.equal(P.board[73],null);assert.equal(P.board[72],"C","移到最近的空位（同距離取左）");assert.equal(P.board[64],null,"往前那格（b2）不去");
  assert.ok(C.legal(P.board,"r").some(([f,t])=>f===82&&t===63),"日字步變合法");assert.equal(B.SKM.luo5.cls,"輔助")});

test("馬腿解圍（開發者 11/13）：只能往前才挪得開的子不能選；都沒有就不能放", ()=>{
  const P=sk("x_miaogirl","luo5");assert.equal(B.targets(P,"luo5",[],C).length,0,"開局：俥、相要挪只能往前");assert.equal(B.why(P,"luo5",C),B.SKM.luo5.none);
  put(P,67,"N","rN");assert.ok(!B.targets(P,"luo5",[],C).includes(58),"e3 兵左右都是兵、往前不行 → 不能選");
  put(P,56,null);assert.ok(B.targets(P,"luo5",[],C).includes(58));assert.ok(B.cast(P,{k:"luo5",tg:[58]},C).ok);assert.equal(P.board[56],"P","兵橫移到 c3");assert.equal(P.board[49],null,"不往前到 e4");
  assert.ok(C.legal(P.board,"r").some(([f,t])=>f===67&&t===48),"e2 傌往前的日字步變合法")});

test("說明對齊定稿（11/13）：當票回春、勇往直前、步步為營、火網標記", ()=>{
  assert.equal(B.SKM.shen4.d,"回 12；己方元氣低於一半再回 5");assert.equal(B.SKM.bu2.d,"上一回合有己方兵往前走，得 20 靈力");
  assert.equal(B.SKM.bu4.d,"己方 1 顆兵，下一次虛空鎖鎖不住它");assert.equal(B.SKM.lei4.d,"2 回合內，炮架火網隔兩子瞄到的敵子也標成破甲")});

test("殘卒反星（去重定稿）：點名的卒吃子扣的跟平常一樣；只點名紅方吃得到的卒（咬得到紅子但吃不到的不點）", ()=>{
  const R=game(1);R.td.en.sp=10;put(R,27,null);put(R,45,"p","b27");R.turn="b";R.td.rnd=0;B.roundEnd(R,C);assert.equal(R.td.fx&&R.td.fx.tag,"b27");
  R.turn="b";const n0=R.td.ev.length;mv(R,45,54);const hit=R.td.ev.slice(n0).find(e=>e.k==="hit"&&e.why==="被擒");assert.equal(hit.n,Math.round(B.CAPB.P*B.CAPM.P),"沒有多扣 1");
  assert.ok(!/多 1/.test(B.FSK.cfx.d));
  const Q=game(1);Q.td.en.sp=10;put(Q,55,"p","bq");Q.turn="b";Q.td.rnd=0;B.roundEnd(Q,C);assert.notEqual(Q.td.fx&&Q.td.fx.id,"cfx","紅方吃不到就不放");
  R.td.fx={id:"cfx",tag:"b27",at:9};put(R,54,null);put(R,45,"p","b27");const M=B.foeMarks(R.td,R.board,C);assert.deepEqual(J(M.blk),[45]);assert.ok(M.red.length>=1,"紅框＝吃得到那顆卒的紅子")});

/* ===== 11/14 防禦（開發者：修為／攻擊力／防禦／紅血／藍血）：BHTD.stats 的 def、defDmg；只套我方被擒子、被將軍 ===== */
const DEF={x_swordboy:[.97,.82],x_spiritgirl:[.92,.76],x_martialgirl:[1,.85],x_miaogirl:[.95,.80],x_shuai:[.94,.79],x_shi:[.90,.72],x_bing:[1,.85]};
test("防禦曲線：七人 Lv1／Lv100 照常數表；跟攻擊同一條 G(L)；隨修為變硬（越來越小）；鐵連城每一級都最硬；天賦倍率是除", ()=>{
  for(const k in DEF){assert.equal(B.stats(k,1).def,DEF[k][0],k+" Lv1");assert.equal(B.stats(k,100).def,DEF[k][1],k+" Lv100");
    let p=9;for(let L=1;L<=100;L++){const s=B.stats(k,L),g=B.G(L,42),want=DEF[k][0]+(DEF[k][1]-DEF[k][0])*g;assert.ok(Math.abs(s.def-want)<=0.005+1e-9,k+" L"+L);assert.ok(s.def<=p,k+" 不會變軟");p=s.def}}
  for(const L of[1,25,50,75,100])for(const k in DEF)if(k!=="x_shi")assert.ok(B.stats("x_shi",L).def<B.stats(k,L).def,"鐵連城最硬 L"+L+" vs "+k);
  assert.ok(B.stats("x_bing",50).def>B.stats("x_spiritgirl",50).def,"攻擊型稍軟");
  assert.equal(B.stats("x_shi",100,{tal:1.15}).def,Math.round(.72/1.15*100)/100,"天賦倍率：防禦÷tal（越小越硬）");assert.equal(B.stats("x_shi",100,{tal:["htgy"]}).def,.72,"cfg.tal 是天賦陣列時不影響")});
test("defDmg：原本扣的 × 防禦，四捨五入、至少扣 1、單次最多 12；0 還是 0；防禦不合法當 ×1", ()=>{
  assert.equal(B.defDmg(10,.72),7);assert.equal(B.defDmg(5,.72),4);assert.equal(B.defDmg(5,.85),4);assert.equal(B.defDmg(5,.95),5);assert.equal(B.defDmg(3,.80),2);
  assert.equal(B.defDmg(1,.72),1,"至少扣 1");assert.equal(B.defDmg(2,.2),1,"至少扣 1");assert.equal(B.defDmg(0,.72),0);assert.equal(B.defDmg(-3,.72),0);
  assert.equal(B.defDmg(20,1),12,"上限 12");assert.equal(B.defDmg(12,.99),12);assert.equal(B.defDmg(30,.72),12,"超過的也最多 12");
  assert.equal(B.defDmg(8,undefined),8);assert.equal(B.defDmg(8,0),8);assert.equal(B.defDmg(8,"x"),8);assert.equal(B.CHK_HIT,5)});
const defGame=(ch,L)=>{const P=game(1,{ch,L});P.td.rnd=0;return P};
const hurt=(P,n0,why)=>P.td.ev.slice(n0).filter(e=>e.k==="hit"&&e.sd==="r"&&e.why===why).reduce((a,e)=>a+e.n,0);   /* 這段期間某一種原因扣了我方幾點 */
test("防禦只套我方被擒子：卒吃俥原本 10 → 鐵連城 Lv100 扣 7、步越溪 Lv1 扣 10；開局 td.me.def 照 stats", ()=>{
  for(const[ch,L,want]of[["x_shi",100,7],["x_bing",1,10],["x_spiritgirl",50,8]]){const P=defGame(ch,L);assert.equal(P.td.me.def,B.stats(ch,L).def);put(P,72,"p","bq");P.turn="b";const h=P.td.me.hp,n0=P.td.ev.length;mv(P,72,81);
    const hit=P.td.ev.slice(n0).find(e=>e.k==="hit"&&e.why==="被擒");assert.equal(hit.n,want,ch+" L"+L);assert.equal(h-P.td.me.hp,want+1,"另外回合結束卒過河扣 1（不套防禦）")}
  const Q=defGame("x_shi",100);put(Q,45,"r","bq");Q.turn="b";const q0=Q.td.ev.length;mv(Q,45,54);assert.equal(hurt(Q,q0,"被擒"),1,"原本 1 點的照樣至少扣 1")});
test("防禦只套我方被將軍：5 × 防禦（鐵連城 Lv100 → 4、步越溪 Lv1 → 5）；免將照樣先擋", ()=>{
  const chk=(ch,L,ci)=>{const P=defGame(ch,L);put(P,31,null);put(P,58,null);put(P,18,"r","bc");if(ci)P.td.ci=[{until:null}];P.turn="b";const h=P.td.me.hp,n0=P.td.ev.length;const m=C.stateApply(P,18,22);assert.ok(m.ck,"要是將軍");B.move(P,m,C);return{d:h-P.td.me.hp,ev:P.td.ev.slice(n0)}};
  assert.equal(chk("x_shi",100).d,4);assert.equal(chk("x_bing",1).d,5);assert.equal(chk("x_miaogirl",100).d,4);
  const c=chk("x_shi",100,1);assert.equal(c.d,0,"免將擋掉");assert.ok(c.ev.some(e=>e.k==="ci"))});
test("防禦也套星樞三招（開發者 11/14 選 B）：引力撕裂 5、卒海過河、殘卒反星都乘防禦（至少 1）；預估跟實際一樣；護盾照樣整次抵消；說明看得出防禦可減少", ()=>{
  const ylsl=(ch,L,gd)=>{const Y=defGame(ch,L);if(gd)Y.td.gd=1;Y.td.fx={id:"ylsl",at:0};const est=B.foeEst(Y.td,Y.board),n0=Y.td.ev.length;B.roundEnd(Y,C);return{n:hurt(Y,n0,"引力撕裂"),est,ev:Y.td.ev.slice(n0)}};
  let r=ylsl("x_shi",100);assert.equal(r.n,4,"5×0.72＝3.6→4");assert.equal(r.est,4,"預估照防禦");
  r=ylsl("x_bing",1);assert.equal(r.n,5,"步越溪 Lv1 防禦 ×1.00 照扣 5");assert.equal(r.est,5);
  r=ylsl("x_shi",100,1);assert.equal(r.n,0,"護盾整次抵消");assert.equal(r.est,0);assert.ok(r.ev.some(e=>e.k==="absorb"&&e.why==="引力撕裂"));
  const Z=defGame("x_shi",100);Z.td.zcap=3;for(const q of[45,47,49])put(Z,q,"p","bz"+q);Z.td.fx={id:"zhs",at:0};assert.equal(B.foeEst(Z.td,Z.board),2);let n0=Z.td.ev.length;B.roundEnd(Z,C);
  assert.equal(hurt(Z,n0,"卒海過河"),2,"卒海過河 3×0.72＝2.16→2");assert.equal(hurt(Z,n0,"過河"),3,"過河 3 照扣");
  const Z1=defGame("x_shi",100);put(Z1,45,"p","bz");put(Z1,47,"p","bz2");Z1.td.zcap=2;Z1.td.fx={id:"zhs",at:0};n0=Z1.td.ev.length;B.roundEnd(Z1,C);assert.equal(hurt(Z1,n0,"卒海過河"),1,"2×0.72＝1.44→1");
  const R=defGame("x_shi",100);R.td.en.sp=10;put(R,27,null);put(R,45,"p","b27");R.turn="b";B.roundEnd(R,C);assert.equal(R.td.fx&&R.td.fx.id,"cfx");R.turn="r";n0=R.td.ev.length;mv(R,54,45);assert.equal(hurt(R,n0,"殘卒反星"),1,"殘卒反星 1 已是最少，照扣 1");
  const d=B.foeDecide({td:Object.assign(defGame("x_shi",100).td,{fsk:["ylsl"],en:{sp:50}}),board:defGame(6).board},C);assert.equal(d&&d.est,4,"放招時記的預估也照防禦");
  assert.match(B.FSK.ylsl.d,/防禦可減少/);assert.match(B.FSK.zhs.d,/防禦可減少/);assert.match(B.FSK.cfx.d,/防禦/);assert.match(B.LV[5].tip,/防禦可減少/);
  assert.ok(SRC.includes("你的子被吃、被將軍，還有星樞招式扣你的元氣，都會被你的防禦力減少（至少扣 1）；過河、九宮、星碎格照原本扣。"),"陣地規則那句跟著改（不寫倍數）")});
test("防禦不套的：過河、九宮星核、星碎格照原本扣；星樞那邊（擒子、將軍）也不套", ()=>{
  const P=defGame("x_shi",100);P.board[sq(6,0)]="p";P.td.pid[sq(6,0)]="bx";P.board[sq(8,4)]="p";P.td.pid[sq(8,4)]="by";P.turn="b";const h=P.td.me.hp;B.roundEnd(P,C);assert.equal(h-P.td.me.hp,1+1+2,"過河 2 顆＋九宮 2");
  let h2;
  const S=game(2,{ch:"x_shi",L:100}),s0=S.td.shard[0];S.board[s0+18]="R";S.td.pid[s0+18]="rx";h2=S.td.me.hp;mv(S,s0+18,s0);assert.equal(h2-S.td.me.hp,3,"星碎格照扣 3");
  const E=defGame("x_shi",100);put(E,27,"p","bq");put(E,36,"R","rq");const e0=E.td.en.hp;mv(E,36,27);assert.equal(e0-E.td.en.hp,B.capDmg("p","R",E.td.me.atk,false,false),"我方擒子照攻擊算，不乘防禦")});
test("防禦與護盾的順序：先乘防禦（至少 1）→ 再扣小盾 → 最後護盾整次抵消；雙燕斜護照樣全擋", ()=>{
  const P=defGame("x_shi",100);P.td.sh=[{tag:"r81",v:2,until:9}];put(P,72,"p","bq");P.turn="b";let n0=P.td.ev.length;mv(P,72,81);assert.equal(hurt(P,n0,"被擒"),5,"10×0.72＝7，再扣小盾 2＝5（不是 (10−2)×0.72＝6）");
  const Q=defGame("x_shi",100);Q.td.sh=[{tag:"r54",v:1,until:9}];put(Q,45,"r","bq");Q.turn="b";n0=Q.td.ev.length;mv(Q,45,54);assert.equal(hurt(Q,n0,"被擒"),0,"至少 1 被小盾 1 抵掉");assert.ok(Q.td.ev.slice(n0).some(e=>e.k==="shuse"&&e.n===1));
  const G2=defGame("x_shi",100);G2.td.gd=1;put(G2,72,"p","bq");G2.turn="b";n0=G2.td.ev.length;mv(G2,72,81);assert.equal(hurt(G2,n0,"被擒"),0,"護盾整次抵消");assert.ok(G2.td.ev.slice(n0).some(e=>e.k==="absorb"&&e.why==="被擒"));assert.equal(G2.td.gd,0);
  const K=defGame("x_shi",100);K.td.gd=1;put(K,31,null);put(K,58,null);put(K,18,"r","bc");K.turn="b";n0=K.td.ev.length;mv(K,18,22);assert.equal(hurt(K,n0,"被將軍"),0,"被將軍也是護盾擋");assert.ok(K.td.ev.slice(n0).some(e=>e.k==="absorb"&&e.why==="被將軍"));
  const T=sk("x_spiritgirl","tian5");assert.ok(B.cast(T,{k:"tian5",tg:[54,64]},C).ok);put(T,45,"r","bq");T.turn="b";mv(T,45,54);put(T,63,"r","bq2");T.turn="b";n0=T.td.ev.length;mv(T,63,64);assert.equal(hurt(T,n0,"被擒"),0,"雙燕斜護全擋")});
test("防禦：舊盤沒有 def 由 tdFix 照角色與修為補；天賦厚土固元只加元氣上限、不動防禦；單次上限 12 照舊", ()=>{
  const P=defGame("x_shi",100);delete P.td.me.def;B.tdFix(P.td);assert.equal(P.td.me.def,.72);
  const a=game(1,{ch:"x_shi",L:100}),b=(()=>{const st=B.startFen(1,C),Q={start:st,startTurn:"r",board:C.parseFen(st),turn:"r",moves:[],human:"r"};Q.pos=[C.fen(Q.board,"r")];Q.td=B.boot({lv:1,ch:"x_shi",L:100,tal:["htgy"]},Q,C);return Q})();
  assert.equal(b.td.me.max,a.td.me.max+8);assert.equal(b.td.me.def,a.td.me.def);
  const X=defGame("x_bing",1);X.td.me.def=1;put(X,72,"p","bq");X.turn="b";const n0=X.td.ev.length;mv(X,72,81);assert.equal(hurt(X,n0,"被擒"),10,"防禦 ×1＝舊規則");
  for(const k in DEF)for(const L of[1,50,100])for(const v of["P","R","C","N","B","A"])for(const c of["P","R","C","N","B","A","K"]){const raw=Math.min(B.CAPMAX,Math.round(B.CAPB[v]*B.CAPM[c])),n=B.defDmg(raw,B.stats(k,L).def);assert.ok(n>=1&&n<=raw&&n<=B.CAPMAX,k+" "+c+"吃"+v)}});
test("畫面數值（開發者 11/14）：攻擊力＝四捨五入(倍率×100)、防禦力＝四捨五入(100÷倍率)，100 為基準越大越強；選關卡片與塔防 HUD 用這兩個函式、不再顯示倍數", ()=>{
  assert.equal(B.atkPt(1.05),105);assert.equal(B.atkPt(.92),92);assert.equal(B.atkPt(1.45),145);assert.equal(B.atkPt(undefined),100);
  assert.equal(B.defPt(.95),105);assert.equal(B.defPt(.72),139);assert.equal(B.defPt(1),100);assert.equal(B.defPt(.85),118);assert.equal(B.defPt(0),100);assert.equal(B.defPt("x"),100);
  for(const k in DEF){let pa=0,pd=0;for(let L=1;L<=100;L++){const s=B.stats(k,L),a=B.atkPt(s.atk),d=B.defPt(s.def);assert.ok(a>=pa&&d>=pd,k+" 修為越高數值不會變小");pa=a;pd=d}}
  for(const L of[1,50,100])for(const k in DEF)if(k!=="x_shi")assert.ok(B.defPt(B.stats("x_shi",L).def)>B.defPt(B.stats(k,L).def),"鐵連城防禦力最高");
  assert.ok(SRC.includes("・攻擊力 <b>${BHTD.atkPt(st.atk)}</b>・防禦力 <b>${BHTD.defPt(st.def)}</b>・"),"選關卡片");
  assert.ok(SRC.includes("<span>攻擊力</span> ${BHTD.atkPt(td.me.atk)}<br><span>防禦力</span> ${BHTD.defPt(td.me.def)}"),"塔防 HUD");
  assert.ok(!/攻擊 ×\$\{|防禦 ×\$\{|×\$\{\(\+td\.me\.(atk|def)/.test(SRC),"不再顯示攻擊／防禦倍數")});
/* ===== 11/14 靈力上限拉開＋早晚熟（spCurve）===== */
const SPT={x_martialgirl:[50,90,"avg"],x_shuai:[60,90,"early"],x_bing:[40,90,"late"],x_miaogirl:[50,80,"avg"],x_spiritgirl:[50,80,"early"],x_swordboy:[50,70,"avg"],x_shi:[50,60,"late"]};
test("靈力上限：七人 Lv1／Lv100 與成長型照表；平均＝G、早熟＝√G、晚熟＝((L−1)/99)^1.8；整數、不會變少；轉折點", ()=>{
  for(const k in SPT){const[a,b,t]=SPT[k];assert.equal(B.CH[k].spT,t,k);assert.equal(B.stats(k,1).sp,a,k+" Lv1");assert.equal(B.stats(k,100).sp,b,k+" Lv100");
    let p=0;for(let L=1;L<=100;L++){const v=B.stats(k,L).sp;assert.ok(Number.isInteger(v)&&v>=p,k+" L"+L);assert.equal(v,Math.round(a+(b-a)*B.spCurve(t,L,42)),k+" L"+L);p=v}}
  assert.equal(B.spCurve("avg",37,42),B.G(37,42));assert.equal(B.spCurve("early",37,42),Math.sqrt(B.G(37,42)));assert.ok(Math.abs(B.spCurve("late",37,42)-Math.pow(36/99,1.8))<1e-12);
  for(const t of["avg","early","late"]){assert.equal(B.spCurve(t,1,42),0);assert.ok(Math.abs(B.spCurve(t,100,42)-1)<1e-12)}
  for(const L of[10,30,50])assert.ok(B.spCurve("early",L,42)>B.spCurve("avg",L,42)&&B.spCurve("avg",L,42)>B.spCurve("late",L,42),"早熟＞平均＞晚熟 L"+L);
  const at=(k,L)=>B.stats(k,L).sp;
  assert.deepEqual([1,25,50,75,100].map(L=>at("x_bing",L)),[40,44,54,70,90],"步越溪晚熟：起點最低、後期暴衝");assert.deepEqual([1,25,50,75,100].map(L=>at("x_shuai",L)),[60,81,86,89,90],"沈方庭早熟");
  assert.deepEqual([1,25,50,75,100].map(L=>at("x_shi",L)),[50,51,53,56,60],"鐵連城晚熟、上限最低");assert.deepEqual([1,25,50,75,100].map(L=>at("x_swordboy",L)),[50,60,65,68,70])});
test("靈力上限 × 招式：每一招在解鎖那個修為都放得出來（耗靈 ≤ 上限）；步越溪 Lv1 只有 40 也放得出前幾招；星芒換的開局靈力最多補到上限", ()=>{
  for(const s of B.SK)for(const L of[s.lv,s.lv+5,100])assert.ok(B.stats(s.ch,Math.min(100,L)).sp>=s.cost,s.id+" Lv"+L+" 耗 "+s.cost);
  for(const id of["bu1","bu2","bu3","bu4","bu5"])assert.ok(B.SKM[id].cost<=40,id);
  const P=game(1,{ch:"x_bing",L:1});assert.equal(P.td.me.spMax,40);
  const st=B.startFen(1,C),Q={start:st,startTurn:"r",board:C.parseFen(st),turn:"r",moves:[],human:"r"};Q.pos=[C.fen(Q.board,"r")];Q.td=B.boot({lv:1,ch:"x_bing",L:1,xm:100},Q,C);assert.equal(Q.td.me.sp,40,"星芒換 100 點靈力也只補到上限 40");
  const R={start:st,startTurn:"r",board:C.parseFen(st),turn:"r",moves:[],human:"r"};R.pos=[C.fen(R.board,"r")];R.td=B.boot({lv:1,ch:"x_shuai",L:100,xm:100},R,C);assert.equal(R.td.me.sp,90,"沈方庭 Lv100 補到 90")});
/* ===== 11/14 晚（1106 上線後）開發者「數字放大＋回靈隨修為長」：靈力全部 ×10、每回合回靈 spRegen ===== */
const RG={x_shuai:[18,"early"],x_spiritgirl:[18,"early"],x_martialgirl:[18,"avg"],x_miaogirl:[18,"avg"],x_bing:[20,"late"],x_swordboy:[15,"avg"],x_shi:[12,"late"]};
test("每回合回靈 spRegen：Lv1 都是 10；Lv100 照成長型（早熟／平均 18、步越溪晚熟 20、齊轍 15、鐵連城 12）；同一條 spCurve、四捨五入、不會變少", ()=>{
  for(const k in RG){const[b,t]=RG[k];assert.equal(B.CH[k].spT,t);assert.equal(B.stats(k,1).spRegen,10,k+" Lv1");assert.equal(B.stats(k,100).spRegen,b,k+" Lv100");
    let p=0;for(let L=1;L<=100;L++){const v=B.stats(k,L).spRegen;assert.equal(v,Math.round(10+(b-10)*B.spCurve(t,L,42)),k+" L"+L);assert.ok(v>=p);p=v}}
  const at=(k,L)=>B.stats(k,L).spRegen;
  assert.deepEqual([1,25,50,75,100].map(L=>at("x_bing",L)),[10,11,13,16,20],"步越溪晚熟：後期暴衝");assert.deepEqual([1,25,50,75,100].map(L=>at("x_shuai",L)),[10,16,17,18,18],"沈方庭早熟");
  assert.deepEqual([1,25,50,75,100].map(L=>at("x_shi",L)),[10,10,11,11,12]);assert.deepEqual([1,25,50,75,100].map(L=>at("x_swordboy",L)),[10,12,14,15,15]);
  const P=game(1,{ch:"x_bing",L:100});assert.equal(P.td.me.spRg,20);const s0=P.td.me.sp;round(P);assert.equal(P.td.me.sp,Math.min(P.td.me.spMax,s0+20),"Lv100 步越溪一回合回 20")});
test("靈力 ×10：七星 35 招、星樞三招耗靈都是 10 的倍數；擒子 +10、星樞吃子 +10、星樞上限 50、第 5／6 關星樞開局 50／30；揚州快步 −20（最少 10）；盾陣回靈每 4 點得 10", ()=>{
  assert.equal(B.SPK,10);assert.equal(B.CAP_SP,10);assert.equal(B.ESP_GAIN,10);assert.equal(B.ESP_MAX,50);assert.equal(B.XM_CAP,200);
  const cost={qi1:40,tian1:30,lei1:20,luo1:50,shen1:30,tie1:20,bu1:10,bu5:10,tie5:10,lei3:30,shen5:30};for(const id in cost)assert.equal(B.SKM[id].cost,cost[id],id);
  assert.deepEqual(J([B.FSK.zhs.cost,B.FSK.cfx.cost,B.FSK.ylsl.cost]),[20,10,30]);
  assert.equal(game(5).td.en.sp,50);assert.equal(game(6).td.en.sp,30);assert.equal(game(1).td.en.sp,0);assert.equal(game(1).td.en.spMax,50);
  const R=game(1);put(R,45,"r","bq");R.turn="b";mv(R,45,54);assert.equal(R.td.en.sp,10,"星樞吃子 +10");assert.ok(R.td.ev.some(e=>e.k==="esp"&&e.n===10));
  R.td.en.sp=45;put(R,63,"r","bq2");R.turn="b";mv(R,63,64);assert.equal(R.td.en.sp,50,"不超過 50");
  const Q=sk("x_bing","bu5");assert.ok(B.cast(Q,{k:"bu5"},C).ok);assert.equal(Q.td.disc,20);assert.equal(B.costOf(Q.td,"bu1"),10,"10−20 最少 10");Q.td.disc=20;assert.equal(B.costOf(Q.td,"bu3"),10);
  assert.match(B.SKM.bu5.d,/−20（最少 10）/);assert.match(B.SKM.tie5.d,/得 10 靈力（最多 30）/);
  assert.equal(B.TAL_SP,10);assert.equal(B.TAL_EYE_SP,20);assert.match(B.TALM.xhcr.d,/\+10/);assert.match(B.TALM.fmbl.d,/10 靈力/);assert.match(B.TALM.xzht.d,/只扣 20/)});
test("舊盤（1106 以前存的，沒有 spk）：靈力、上限、星樞靈力、折扣自動 ×10，補上每回合回靈；新盤不會再乘一次", ()=>{
  const P=game(1,{ch:"x_miaogirl",L:50});assert.equal(P.td.spk,10);const sp=P.td.me.sp,mx=P.td.me.spMax;B.tdFix(P.td);assert.equal(P.td.me.sp,sp);assert.equal(P.td.me.spMax,mx);
  const O=game(1,{ch:"x_miaogirl",L:50});delete O.td.spk;delete O.td.me.spRg;O.td.me.sp=3;O.td.me.spMax=7;O.td.en.sp=2;O.td.en.spMax=5;O.td.disc=2;B.tdFix(O.td);
  assert.deepEqual(J([O.td.me.sp,O.td.en.sp,O.td.en.spMax,O.td.disc,O.td.spk]),[30,2*10,50,20,10]);assert.equal(O.td.me.spMax,B.stats("x_miaogirl",50).sp,"上限照新表（不比舊的 ×10 小）");assert.equal(O.td.me.spRg,B.stats("x_miaogirl",50).spRegen)});
test("〔原始碼〕畫面：塔防頂部靈力＝藍條＋數字（不再一顆一顆圓點）、星樞也是細條＋數字；招式鈕寫「N 靈」；選關卡片有靈力上限與每回合回靈；星芒換靈力的提示", ()=>{
  assert.ok(SRC.includes('<div class="bt-sp" title="靈力 ${td.me.sp}／${td.me.spMax}・每回合回 ${+td.me.spRg||BHTD.SPK}"><i style="width:${Math.round(100*td.me.sp/Math.max(1,td.me.spMax))}%"></i><b><span class="ax-sr">靈力 </span>${td.me.sp}／${td.me.spMax}</b></div>'),"我方靈力條");
  assert.ok(SRC.includes('<b><span class="ax-sr">星樞靈力 </span>${td.en.sp}／${td.en.spMax}</b></span>'),"星樞靈力條");
  assert.ok(!/Array\.from\(\{length:td\.(me|en)\.spMax\}/.test(SRC),"不再畫圓點");assert.ok(SRC.includes("<small>${c} 靈</small>")&&!SRC.includes('"●".repeat(c)'),"招式鈕只寫數字");
  assert.ok(SRC.includes("・靈力上限 <b>${st.sp}</b>・每回合回靈 <b>${st.spRegen}</b>・"),"選關卡片");
  assert.ok(SRC.includes("toast(`✦ 帶進 ${Math.ceil(xm/BHTD.SPK)} 點星芒，開局靈力 +${xm}`)"),"星芒幾點、換到幾點靈力");
  assert.ok(SRC.includes("還 +10 靈力；每回合也會自動回靈力（修為越高回越多）。"),"陣地規則")});
