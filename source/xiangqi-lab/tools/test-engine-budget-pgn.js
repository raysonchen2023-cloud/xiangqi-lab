// 引擎分析預算敏感度（PGN 版）tools/engine-budget-pgn.js 的回歸測試：讀 App 匯出的 PGN（ICCS 著法＋賽後評語）、從 [FEN] 局面開始評、
//   手機評語 vs 電腦各檔的比對與報表。全部用自己編的小棋譜和假的評估函式（分數只跟局面與節點數有關），不啟動引擎、不讀任何真實對局。
// 測試由開發用的 AI 撰寫，不等於第三方驗證。名稱沒有標籤＝行為測試（真的執行工具與 App 的 classifyRaw、gameReport、pgnNote）；「〔原始碼〕」＝只比對原始碼文字。
"use strict";
const test=require("node:test"),assert=require("node:assert"),fs=require("fs"),path=require("path"),os=require("os");
const EBP=path.join(__dirname,"engine-budget-pgn.js"),EBC=path.join(__dirname,"engine-budget-check.js"),NO="沒有 engine-budget-pgn.js／engine-budget-check.js（這個副本沒帶離線分析工具）",HAVE=fs.existsSync(EBP)&&fs.existsSync(EBC);
const C=require("../site/core.js");
const mkRnd=seed=>{let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}};
/* 自己編的棋譜：邊兵互進、吃卒、車吃兵；第二盤是自己擺的殘局（黑先） */
const SAMPLE=[
'[Game "Chinese Chess"]','[Event "甲 對 乙\\"丙\\""]','[Site "象棋千秋"]','[Red "甲"]','[Black "幻影棋客・第2級「入門1」"]','[Result "1-0"]','[Format "ICCS"]','',
'{自編的說明} 1. A3-A4 {正著；走完後均勢，雙方差不多} 1... A6-A5 (1... I6-I5 {這是變著} 2. I3-I4) 2. a4a5',
'{緩著；Pikafish 建議 俥九進一；差約 0.9 兵；走完後黑方稍好，約領先 1.1 個兵} 2... A9-A5 1-0','',
'[Game "Chinese Chess"]','[Event "甲 對 石桌往事・幻影棋客・第1級「新手」"]','[Red "甲"]','[Black "石桌往事・幻影棋客・第1級「新手」"]','[Result "0-1"]','[FEN "3k5/9/9/9/9/9/9/9/4R4/4K4 b - - 0 1"]','[Format "ICCS"]','',
'1... D9-D8 {正著；走完後紅方有殺（能將死對方）} 0-1',''].join("\n");
test("讀 PGN：標籤（含跳脫的引號）、ICCS 著法（大小寫、有沒有連字號）、評語貼在對的那一步、開頭的說明、變著整段跳過、兩盤分開；不合規則的著法記下來不硬讀",t=>{
  if(!HAVE)return t.skip(NO);const T=require(EBP),G=T.parsePgn(SAMPLE);assert.equal(G.length,2);const a=G[0];
  assert.equal(a.event,'甲 對 乙"丙"');assert.equal(a.red,"甲");assert.equal(a.res,"1-0");assert.equal(a.result,"紅勝");assert.equal(a.err,null);assert.equal(a.fen,null);assert.equal(a.std,true);assert.equal(a.startTurn,"r");assert.equal(a.note0,"自編的說明");
  assert.deepEqual(a.moves.map(m=>m.u),["a3a4","a6a5","a4a5","a9a5"]);assert.deepEqual(a.moves.map(m=>m.by),["r","b","r","b"]);
  assert.equal(a.moves[0].c,"正著；走完後均勢，雙方差不多");assert.equal(a.moves[1].c,null,"變著裡的評語不算主線的");assert.match(a.moves[2].c,/^緩著；Pikafish 建議 俥九進一；差約 0\.9 兵/);assert.equal(a.moves[3].c,null);
  assert.equal(a.moves[2].f,C.parseSq("a4"));assert.equal(a.moves[2].t,C.parseSq("a5"));
  const bad=T.parsePgn('[Result "1-0"]\n\n1. A0-A5 {正著} 1... A9-A8 1-0\n');assert.equal(bad.length,1);assert.match(bad[0].err,/第 1 步不合規則/);assert.equal(bad[0].moves.length,0);assert.equal(T.runnable(bad[0]),false);
  assert.equal(T.runnable(a),true);assert.equal(T.runnable(T.parsePgn('[Result "*"]\n\n1. A3-A4 *\n')[0]),false,"沒有勝負和的盤不重評");
  /* CRLF、BOM 也讀得懂 */
  const crlf=T.parsePgn("﻿"+SAMPLE.replace(/\n/g,"\r\n"));assert.deepEqual(crlf[0].moves.map(m=>m.u),a.moves.map(m=>m.u));assert.equal(crlf[1].moves.length,1);
});
test("讀 PGN：有 [FEN] 的盤從那個局面開始（黑先也可以），不是標準開局；FEN 缺將帥的盤記成讀不懂",t=>{
  if(!HAVE)return t.skip(NO);const T=require(EBP),G=T.parsePgn(SAMPLE),b=G[1];assert.equal(b.err,null);assert.equal(b.std,false);assert.equal(b.startTurn,"b");assert.equal(b.result,"黑勝");
  assert.equal(b.start[C.parseSq("d9")],"k");assert.equal(b.start[C.parseSq("e1")],"R");assert.equal(b.start.filter(Boolean).length,3);assert.deepEqual(b.moves.map(m=>[m.u,m.by]),[["d9d8","b"]]);
  const it=T.asItem(b);assert.equal(it.startTurn,"b");assert.equal(it.start.length,90);assert.deepEqual(it.lines[0].moves,[[C.parseSq("d9"),C.parseSq("d8")]]);assert.equal(T.asItem(G[0]).start,null,"標準開局不帶起始盤面");
  const nok=T.parsePgn('[FEN "9/9/9/9/9/9/9/9/4R4/4K4 w - - 0 1"]\n[Result "1-0"]\n\n1. E1-E2 1-0\n');assert.match(nok[0].err,/FEN/);
  /* 起始局面寫成 FEN、其實就是標準開局紅先＝算標準開局 */
  const std=T.parsePgn('[FEN "'+C.START+' w - - 0 1"]\n[Result "1-0"]\n\n1. A3-A4 1-0\n');assert.equal(std[0].std,true);
});
test("讀評語：評等、建議著法、差約幾個兵、走完後的形勢（均勢、半個兵、幾個兵、領先非常多、有殺）；舊名字翻成新的；App 真正的 pgnNote 寫出來的字讀得回來",t=>{
  if(!HAVE)return t.skip(NO);const T=require(EBP),p=T.parseNote("失著；Pikafish 建議 馬2進3；差約 2.1 兵；走完後紅方明顯好，約領先 2.4 個兵");
  assert.equal(p.q,"失著");assert.equal(p.bc,"馬2進3");assert.equal(p.lossP,2.1);assert.equal(p.ev,240);assert.equal(p.mate,0);assert.deepEqual(p.rest,[]);
  assert.deepEqual(T.evOf("均勢，雙方差不多"),{ev:0,mate:0});assert.deepEqual(T.evOf("黑方稍好，約領先半個兵"),{ev:-50,mate:0});assert.deepEqual(T.evOf("黑方大占上風，領先非常多"),{ev:-2000,mate:0});assert.deepEqual(T.evOf("紅方有殺（能將死對方）"),{ev:null,mate:1});assert.deepEqual(T.evOf("黑方有殺（能將死對方）"),{ev:null,mate:-1});
  assert.equal(T.parseNote(null),null);assert.equal(T.parseNote("  "),null);assert.equal(T.parseNote("良著；差約 0.5 兵").q,"緩著","舊版的評等名字照 core.js qName 翻成新的");
  const x=T.parseNote("書上的批註：好棋");assert.equal(x.q,null);assert.deepEqual(x.rest,["書上的批註：好棋"]);
  assert.equal(T.evCat("紅方大占上風，約領先 4.4 個兵"),"紅方大占上風");assert.equal(T.evCat("均勢，雙方差不多"),"均勢");assert.equal(T.evCat("黑方有殺（能將死對方）"),"黑方有殺");
  /* App 的 pgnNote（m/10d-coach.js 原檔）＋evt（m/00-util.js 原檔） */
  const N=T.loadNote();assert.match(N.sha,/^[0-9a-f]{64}$/);
  assert.equal(N.pgnNote({q:"正著",bc:"炮二平五",loss:12,ev:10}),"正著；走完後均勢，雙方差不多");
  assert.equal(N.pgnNote({q:"失著",bc:"馬2進3",loss:212,ev:240}),"失著；Pikafish 建議 馬2進3；差約 2.1 兵；走完後紅方明顯好，約領先 2.4 個兵");
  assert.equal(N.pgnNote({q:"失著",bc:"馬2進3",loss:212,ev:-310}),"失著；Pikafish 建議 馬2進3；差約 2.1 兵；走完後黑方大占上風，約領先 3.1 個兵");
  assert.equal(N.pgnNote({q:"敗著",bc:"將5進1",loss:4000,ev:29990}),"敗著；Pikafish 建議 將5進1；走完後紅方有殺（能將死對方）","差 20 個兵以上不寫差約");
  for(const m of[{q:"穩著",bc:"傌八進七",loss:45,ev:-60},{q:"緩著",bc:"前炮平三",loss:149,ev:-433},{q:"妙著",bc:"俥一進一",loss:0,ev:2600},{q:"敗著",bc:"將5平4",loss:1077,ev:-29985}]){const r=T.parseNote(N.pgnNote(m));
    assert.equal(r.q,m.q);assert.equal(r.bc,["正著","妙著"].includes(m.q)?null:m.bc);assert.equal(r.lossP,m.loss>=30&&m.loss<2000&&m.q!=="妙著"?+(m.loss/100).toFixed(1):null);assert.equal(r.mate,Math.abs(m.ev)>=20000?Math.sign(m.ev):0);if(!r.mate)assert.ok(Math.abs(r.ev-Math.max(-2000,Math.min(2000,m.ev)))<=50,"形勢還原到半個兵以內")}
});
test("舊分界線的盤認得出來、照「差約」換成現在的分界線；一方的評級上限跟 App 賽後報告算的一樣；對手類型與「匯出的人是誰」",async t=>{
  if(!HAVE)return t.skip(NO);const T=require(EBP),X=require(EBC),pn=s=>T.parseNote(s);
  assert.equal(T.oldStyle([pn("緩著；Pikafish 建議 兵七進一；差約 0.9 兵"),pn("正著"),pn("敗著；Pikafish 建議 帥五平四；走完後黑方有殺（能將死對方）"),null]),false,"現在的分界線：緩著 0.6～1.5、敗著「差很多」沒有差約也正常");
  assert.equal(T.oldStyle([pn("緩著；Pikafish 建議 兵七進一；差約 0.5 兵")]),true,"0.5 兵現在是穩著");assert.equal(T.oldStyle([pn("穩著；Pikafish 建議 兵七進一")]),true,"不是正著卻沒有差約＝差不到 0.3 兵，舊分界線才有");assert.equal(T.oldStyle([pn("失著；Pikafish 建議 兵七進一；差約 1.5 兵")]),false,"四捨五入剛好在線上的不算");
  assert.equal(T.normOld(pn("緩著；Pikafish 建議 兵七進一；差約 0.5 兵")),"穩著");assert.equal(T.normOld(pn("穩著；Pikafish 建議 兵七進一")),"正著");assert.equal(T.normOld(pn("敗著；Pikafish 建議 兵七進一；差約 3.2 兵")),"失著");assert.equal(T.normOld(pn("妙著")),"妙著");assert.equal(T.normOld(null),null);
  /* capOf 跟 gameReport 的 cap 對照（假的評估函式跑幾盤） */
  const A=X.loadReport(),seen=new Set(),g0=fakeGame(40,44).lines[0].moves;
  /* 紅方每一步少掉的分數照清單給（黑方都是 0），評等照現在的分界線；看四種上限都對得上 */
  for(const losses of[[0,10,20],[0,0,0,0,0,0,0,0,0,0,500],[0,0,0,0,0,0,0,0,0,0,200],[200,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,450],[200,300,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,450],[200,200,500,0,0],[500,500,500,500,500,500,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]]){
    const mv=[];let s="r",ri=0;for(const[f,t]of g0.slice(0,losses.length*2)){const loss=s==="r"?losses[ri++]:0;mv.push({f,t,by:s,q:C.gradeLoss(loss),loss,ev:0});s=C.opp(s)}
    const rep=A.gameReport(C.parseFen(C.START),mv);for(const k of["r","b"]){assert.equal(T.capOf(mv.filter(m=>m.by===k).map(m=>m.q)),rep.sides[k].cap,k+"："+losses.join(","));seen.add(rep.sides[k].cap)}}
  assert.deepEqual([...seen].sort((a,b)=>a-b),[69,79,89,100],"四種上限都碰到");assert.equal(T.capOf(["正著","敗著","正著","正著","正著","正著","正著","正著","正著","正著","正著"]),89);assert.equal(T.capOf([]),100);
  assert.deepEqual(T.oppKind("幻影棋客・第3級「入門2」"),{kind:"幻影棋客第 3 級",lv:3,story:false});assert.equal(T.oppKind("石桌往事・幻影棋客・第1級「新手」").kind,"石桌往事・幻影棋客第 1 級");assert.equal(T.oppKind("幻影棋客・晉級賽（新手）").kind,"晉級賽");assert.equal(T.oppKind("某某棋友").kind,"其他對手（大廳棋友等）");
  assert.equal(T.kindGroup(T.oppKind("幻影棋客・第3級「入門2」"),true),"幻影棋客第 1～3 級");assert.equal(T.kindGroup(T.oppKind("石桌往事・幻影棋客・第6級「業餘2級」"),true),"石桌往事・幻影棋客第 4 以上 級");assert.equal(T.kindGroup(T.oppKind("石桌往事・幻影棋客・第1級「新手」"),false),"殘局或中局開始（有 [FEN]）");
  assert.equal(T.whoIsMe([{red:"甲",black:"乙"},{red:"丙",black:"甲"},{red:"甲",black:"丁"}]),"甲");assert.equal(T.whoIsMe([{red:"甲",black:"乙"}],"乙"),"乙");
});
/* 一盤真的合法的棋（隨機走），配假的評估函式：分數只跟局面與「雜訊量」有關 */
function fakeGame(seed,plies,start,turn){const rnd=mkRnd(seed);let b=start?start.slice():C.parseFen(C.START),s=turn||"r";const mv=[];for(let i=0;i<plies;i++){const L=C.legal(b,s);if(!L.length)break;const[f,t]=L[Math.floor(rnd()*L.length)];mv.push([f,t]);b=C.make(b,f,t);s=C.opp(s)}return{id:"fake"+seed,name:"合成",result:"和局",start:start||null,startTurn:turn||"r",lines:[{moves:mv}]}}
const hash=s=>{let x=2166136261;for(let i=0;i<s.length;i++){x^=s.charCodeAt(i);x=Math.imul(x,16777619)}return(x>>>0)/4294967296};
function scoreLines(b,s,noise,mpv){const fen=C.fen(b,s);return C.legal(b,s).map(([f,t])=>{const u=C.iccs(f,t);return{mv:u,v:Math.round((hash(fen+u)-.5)*300+(hash(fen+u+"n"+noise)-.5)*noise)}}).sort((p,q)=>q.v-p.v).slice(0,mpv||1).map((x,i)=>({k:i+1,v:x.v,mv:x.mv,pv:[x.mv],depth:10,mate:null}))}
function fakeEval(noise){return async(b,s,ms,mpv)=>{if(!C.legal(b,s).length)return{lines:[],dead:true};return{lines:scoreLines(b,s,noise,mpv),nodes:1000,depth:10}}}
/* 假的引擎：節點數越多雜訊越小（跟 newEngine 的 search 同一個介面） */
const fakeEngine=()=>({n:0,ng:0,newGame(){this.ng++;return Promise.resolve()},search(pos,lim,mpv){this.n++;const[bd,sd]=pos.fen.split(" "),b=C.parseFen(bd),s=sd==="w"?"r":"b",L=scoreLines(b,s,Math.round(400000/lim.nodes),mpv);return Promise.resolve({best:L[0]&&L[0].mv,lines:L,nopv:!L.length,nodes:lim.nodes,depth:10})}});
test("從 [FEN] 的局面開始評（engine-budget-check.js analyzeGame 認得 g.start／g.startTurn）：第一步是該走的那一方、賽後報告用那個起始盤面；沒給就跟原本一樣是標準開局",async t=>{
  if(!HAVE)return t.skip(NO);const X=require(EBC),A=X.loadReport(),start=C.parseFen("3k5/4a4/9/9/2n6/9/4P4/4C4/4A4/3K1R3"),g=fakeGame(5,24,start,"b"),r=await X.analyzeGame(g,fakeEval(0),A);
  assert.equal(r.moves.length,g.lines[0].moves.length);assert.ok(r.moves.length>=10);assert.equal(r.moves[0].by,"b");assert.equal(r.moves[1].by,"r");assert.equal(C.sideOf(start[r.moves[0].f]),"b","第一步動的是黑子");
  assert.equal(r.sides.b.n,Math.ceil(r.moves.length/2));assert.equal(r.sides.r.n,Math.floor(r.moves.length/2));assert.equal(g.start.filter(Boolean).length,8,"起始盤面沒被改到");
  /* 同一串著法當成標準開局會對不上（黑先的第一步在標準開局不合法或不是同一顆子），所以起始盤面真的有用到；標準開局的盤結果跟沒有 start 欄位時完全一樣 */
  const s1=fakeGame(9,30),s2={...s1,start:null,startTurn:undefined},a=await X.analyzeGame(s1,fakeEval(50),A),b=await X.analyzeGame(s2,fakeEval(50),A);assert.deepEqual(a.moves,b.moves);assert.deepEqual(a.sides,b.sides);assert.equal(a.moves[0].by,"r");
});
/* 把合成的盤寫成 App 匯出的 PGN 格式；notes[i]＝第 i 步的評語（null＝不寫） */
function toPgn(g,o){const H=[["Game","Chinese Chess"],["Event",o.event],["Site","象棋千秋"],["Red",o.red],["Black",o.black],["Result",o.res]];let b=g.start?g.start.slice():C.parseFen(C.START),s=g.startTurn||"r";if(g.start)H.push(["FEN",C.fen(b,s)+" - - 0 1"]);H.push(["Format","ICCS"]);
  const tk=[];let n=1;g.lines[0].moves.forEach(([f,t],i)=>{tk.push(s==="r"?n+".":n+"...");tk.push(C.iccs(f,t).toUpperCase().replace(/^(..)/,"$1-"));if(o.notes&&o.notes[i])tk.push("{"+o.notes[i]+"}");if(s==="b")n++;s=C.opp(s)});tk.push(o.res);
  const L=[];let cur="";for(const x of tk){if(cur&&(cur+" "+x).length>80){L.push(cur);cur=x}else cur=cur?cur+" "+x:x}if(cur)L.push(cur);return H.map(([k,v])=>"["+k+' "'+v+'"]').join("\n")+"\n\n"+L.join("\n")+"\n"}
const GAMES=()=>[[fakeGame(101,36),"幻影棋客・第1級「新手」","1-0"],[fakeGame(102,44),"幻影棋客・晉級賽（新手）","1-0"],[fakeGame(103,28),"幻影棋客・第5級「業餘1級」","0-1"],[fakeGame(104,40),"石桌往事・幻影棋客・第2級「入門1」","1-0"],
  [fakeGame(105,12,C.parseFen("3k5/4a4/9/9/2n6/9/4P4/4C4/4A4/3K1R3"),"r"),"石桌往事・幻影棋客・第1級「新手」","1-0"],[fakeGame(106,32),"幻影棋客・第2級「入門1」","0-1"]];
test("重評（假的引擎）：每盤每檔存成 g###.json、時間到會存進度下次接著做、結果跟一次跑完一樣；沒有結果的盤標成沒評；認不得的檔位直接報錯",async t=>{
  if(!HAVE)return t.skip(NO);const T=require(EBP),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ebp-")),pgn=path.join(tmp,"in.pgn"),G=GAMES();t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  fs.writeFileSync(pgn,G.map(([g,opp,res])=>toPgn(g,{event:"甲 對 "+opp,red:"甲",black:opp,res})).join("\n")+"\n"+'[Game "Chinese Chess"]\n[Red "甲"]\n[Black "乙"]\n[Result "*"]\n[Format "ICCS"]\n\n1. A3-A4 *\n');
  const log=console.log;console.log=()=>{};t.after(()=>{console.log=log});
  const base={pgn,app:4000,tiers:["quarter","app","high"],pi:1,pn:1},d1=path.join(tmp,"one"),r1=await T.run({...base,out:d1,maxMs:6e5,engine:fakeEngine()});assert.equal(r1.did,6);assert.equal(r1.stopped,false);
  const R=T.loadRun(d1);assert.equal(R.games.length,7);assert.equal(R.cfg.app,4000);assert.deepEqual(R.cfg.tiers,["quarter","app","high"]);assert.equal(R.cfg.games,7);assert.match(R.cfg.pgnSha,/^[0-9a-f]{64}$/);assert.equal(R.games[6].skip,"沒有勝負和的結果");
  for(const g of R.games.slice(0,6)){assert.deepEqual(Object.keys(g.tiers),["quarter","app","high"]);for(const k of["quarter","app","high"])assert.equal(g.tiers[k].moves.length,g.plies);assert.equal(g.mv.length,g.plies);assert.equal(g.phone.length,g.plies)}
  assert.equal(R.games[4].std,false);assert.equal(R.games[4].startTurn,"r");assert.match(R.games[4].fen,/^3k5\//);assert.equal(R.games[0].std,true);
  /* 分兩個程序、中途時間到：做完的結果一模一樣 */
  const d2=path.join(tmp,"two");let E=fakeEngine();const p1=await T.run({...base,out:d2,maxMs:6e5,pi:1,pn:2,engine:E});assert.equal(p1.did,3);
  const slow=fakeEngine(),s0=slow.search.bind(slow);let calls=0;slow.search=(...a)=>{calls++;return calls>40?new Promise(r=>setTimeout(()=>r(s0(...a)),30)):s0(...a)};
  const p2=await T.run({...base,out:d2,maxMs:60,pi:2,pn:2,engine:slow});assert.equal(p2.stopped,true);assert.ok(fs.readdirSync(d2).some(f=>/^p\d+\.json$/.test(f)),"做到一半的盤存成 p###.json");
  const p3=await T.run({...base,out:d2,maxMs:6e5,pi:2,pn:2,engine:fakeEngine()});assert.equal(p3.stopped,false);assert.ok(!fs.readdirSync(d2).some(f=>/^p\d+\.json$/.test(f)));
  const R2=T.loadRun(d2);for(let i=0;i<6;i++)for(const k of["quarter","app","high"]){assert.deepEqual(R2.games[i].tiers[k].moves,R.games[i].tiers[k].moves);assert.deepEqual(R2.games[i].tiers[k].sides,R.games[i].tiers[k].sides)}
  await assert.rejects(()=>T.run({...base,out:path.join(tmp,"bad"),tiers:["huge"],maxMs:1e4,engine:fakeEngine()}),/不認得的檔位/);
});
test("手機評語 vs 電腦各檔：把「app÷4 那一檔」的結果寫成手機評語，報表就該說手機最像 app÷4（評等、整段評語都 100% 相同，其他檔比較低）；沒評到的步、舊分界線的盤不進主表；分組與混淆表的合計對得起來",async t=>{
  if(!HAVE)return t.skip(NO);const T=require(EBP),N=T.loadNote(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ebp-")),G=GAMES(),tiers=["quarter","app","high"];t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const log=console.log;console.log=()=>{};t.after(()=>{console.log=log});
  const mk=(file,notesOf)=>fs.writeFileSync(file,G.map(([g,opp,res],i)=>toPgn(g,{event:"甲 對 "+opp,red:i===5?opp:"甲",black:i===5?"甲":opp,res,notes:notesOf?notesOf(i):null})).join("\n"));
  const p0=path.join(tmp,"plain.pgn"),d0=path.join(tmp,"d0");mk(p0);await T.run({pgn:p0,out:d0,app:4000,tiers,pi:1,pn:1,maxMs:6e5,engine:fakeEngine()});const R0=T.loadRun(d0);
  /* 「手機」＝quarter 檔；第 1 盤最後 3 步假裝還沒評到；第 6 盤改成舊分界線的字樣（緩著 0.5 兵） */
  const notesOf=i=>{const g=R0.games[i];let b=g.fen?C.parseFen(g.fen.split(" ")[0]):C.parseFen(C.START);return g.tiers.quarter.moves.map((m,k)=>{const bc=C.notate(b,C.parseSq(m.bm.slice(0,2)),C.parseSq(m.bm.slice(2,4))),s=N.pgnNote({q:m.q,bc,loss:m.loss,ev:m.ev});b=C.make(b,m.f,m.t);
    if(i===0&&k>=g.plies-3)return null;if(i===5&&k===0)return"緩著；Pikafish 建議 "+bc+"；差約 0.5 兵；走完後均勢，雙方差不多";return s})};
  const p1=path.join(tmp,"noted.pgn"),d1=path.join(tmp,"d1");mk(p1,notesOf);await T.run({pgn:p1,out:d1,app:4000,tiers,pi:1,pn:1,maxMs:6e5,engine:fakeEngine()});
  const rep=T.report(d1,{boot:300}),O=rep.out,total=G.reduce((s,[g])=>s+g.lines[0].moves.length,0);assert.equal(rep.me,"甲");assert.equal(O.done,6);assert.equal(O.plies,total);
  const main=rep.rows.filter(r=>r.pq&&!r.old);assert.equal(rep.rows.filter(r=>!r.pq).length,3,"沒評到的 3 步");assert.equal(rep.rows.filter(r=>r.old).length,G[5][0].lines[0].moves.length,"舊分界線那一盤整盤標起來");assert.equal(main.length,total-3-G[5][0].lines[0].moves.length);
  const V=O.phone.vs;assert.equal(V.quarter.n,main.length);assert.equal(V.quarter.samePct,100);assert.equal(V.quarter.notePct,100);assert.equal(V.quarter.off2Pct,0);assert.equal(V.quarter.knownPct,100);assert.equal(V.quarter.okAgreePct,100);assert.equal(V.quarter.evCatPct,100);assert.equal(V.quarter.loss.mean,0);assert.equal(V.quarter.lossPhoneOnly+V.quarter.lossPcOnly,0);
  assert.ok(V.app.samePct<98&&V.high.samePct<98,"別檔沒那麼像："+V.app.samePct+"／"+V.high.samePct);assert.ok(V.app.notePct<V.quarter.notePct&&V.high.notePct<V.quarter.notePct);assert.ok(V.high.knownPct<100);
  for(const k of tiers){const cf=V[k].conf;let s=0;for(const a in cf)for(const b in cf[a])s+=cf[a][b];assert.equal(s,main.length,"混淆表合計＝步數");assert.equal(V[k].sug.both+V[k].sug.phoneOnly+V[k].sug.pcOnly+V[k].sug.neither,main.length)}
  const M=O.phone.matrix.q.M;assert.equal(M.phone.quarter,100);assert.equal(M.quarter.phone,100);assert.equal(M.phone.app,M.quarter.app,"手機＝quarter，所以手機對 app 就是 quarter 對 app");assert.equal(M.app.high,M.high.app);
  const Bq=O.phone.boot.q;assert.equal(Bq.tier.quarter.pct,100);assert.deepEqual(Bq.tier.quarter.ci,[100,100]);assert.ok(Bq.diff["quarter>app"].d>0&&Bq.diff["quarter>app"].ci[0]>0,"quarter 比 app 像，區間不含 0");assert.ok(Bq.diff["quarter>high"].d>0);assert.equal(Bq.diff["quarter>app"].pPos,100);
  assert.deepEqual(T.report(d1,{boot:300}).out.phone.boot,O.phone.boot,"重抽用固定種子，重跑一樣");
  const S=O.phone.split;assert.ok(S.n>0);assert.equal(S.with.quarter,S.n);assert.equal(S.none,0);assert.ok(S.only.quarter>0);
  assert.equal(O.phone.cap.same.quarter,O.phone.cap.sides);assert.ok(O.phone.cap.sides>=6);
  /* 第一節沿用 engine-budget-check.js 的 compare；分三組；一方至少 10 步的另外算 */
  assert.equal(O.budget["全部"].all.length,3);assert.equal(O.budget["全部"].all[0].ply.n,total);assert.equal(O.budget["標準開局"].all[0].ply.n,total-G[4][0].lines[0].moves.length);assert.equal(O.budget["有 [FEN]"].all[0].ply.n,G[4][0].lines[0].moves.length);
  assert.equal(O.budget["全部"].all[0].sides,12);assert.equal(O.budget["全部"].min[0].sides,10,"12 手那一盤每方只有 6 步，不進「至少 10 步」");assert.ok(O.budget["全部"].all[1].ply.labelSame<100);
  const grp=O.groups["對局類型"];assert.equal(Object.values(grp).reduce((s,x)=>s+x.n,0),total);assert.equal(grp["殘局或中局開始（有 [FEN]）"].games,1);assert.equal(grp["晉級賽"].n,44);assert.equal(grp["幻影棋客第 1～3 級"].games,2);
  const who=O.groups["哪一方"];assert.equal(who["匯出的人自己下的步"].n+who["對手（電腦）下的步"].n,total);assert.equal(who["匯出的人自己下的步"].n,total/2,"第 6 盤匯出的人拿黑");
  for(const k of[/# 引擎分析預算敏感度（PGN 版）：結果/,/重評完的 \*\*6 盤\*\*/,/app÷4（1000 節點）、app（4000 節點）、app×4（16000 節點）/,/## 一、預算敏感度/,/### 標準開局（5 盤/,/### 有 \[FEN\]（1 盤、12 步）/,/## 二、手機當時的評語 vs 電腦重評/,/\*\*主表不算這幾盤\*\*/,/手機比較像哪一檔/,/混淆表：手機（列）× app÷4/,/一盤一方的評級上限/,/把舊分界線的 1 盤/,/## 三、分組看/,/### 依對局類型/,/### 依哪一方/,/（樣本太少）/,/## 檔案雜湊/])assert.match(rep.md,k);
  assert.doesNotMatch(rep.md,/[A-I]\d-[A-I]\d/,"報表不印棋步");
});
test("〔原始碼〕PGN 版工具只讀 App 的檔、不連網、不內嵌任何棋譜；沿用 engine-budget-check.js 的引擎與評等；寫檔只寫到 --out 與使用者指定的報表",t=>{
  if(!HAVE)return t.skip(NO);const s=fs.readFileSync(EBP,"utf8"),c=fs.readFileSync(EBC,"utf8");
  assert.doesNotMatch(s,/fetch\(|https?:\/\/|XQNet|child_process|writeFileSync\([^)]*(MDIR|DBD|LAB)/,"不連網、不開別的程式、不寫 App 的檔");assert.doesNotMatch(s,/\[Event "|\[Red "|\d+\.\s+[A-I]\d-[A-I]\d/,"檔裡沒有棋譜");
  assert.match(s,/X=require\(path\.join\(__dirname,"engine-budget-check\.js"\)\)/);assert.match(s,/X\.analyzeGame\(it,X\.evalWith\(E,o\.app\*MULT\(t\)\)/);assert.match(s,/const EBP_VER=1,TIERX=\{sixteenth:1\/16,quarter:\.25,app:1,high:4,x16:16\},KEEPX=\{sixteenthTT:1\/16,quarterTT:\.25,appTT:1,highTT:4\}/);assert.match(s,/它回答的還是「分析可靠不可靠」/);
  assert.match(c,/B0=\(\)=>g\.start\?g\.start\.slice\(\):C\.parseFen\(C\.START\)/);assert.match(c,/s=g\.startTurn\|\|"r"/);assert.match(c,/A\.gameReport\(B0\(\),moves\)/);
  /* 留雜湊表是另外開的選項；不給選項時每次搜尋前照舊清雜湊表 */
  assert.match(c,/const KEEP=!!\(o&&o\.keepHash\);/);assert.match(c,/if\(!KEEP\)\{send\("ucinewgame"\);await ask\("isready",l=>l==="readyok"\)\}st\.n\+\+;/);assert.match(s,/X\.newEngine\(\{keepHash:true\}\)/);assert.match(s,/await EK\.newGame\(\);r=await X\.analyzeGame\(it,X\.evalWith\(EK,o\.app\*MULT\(t\)\),A,\{\}\)/);
});
test("之後再加檔位：同一個資料夾補跑新的檔位，做過的不重做、結果不變；「留雜湊表」的對照檔用另一個引擎、每盤開始清一次，只出現在手機比對、不進預算互比；別的棋譜不能混進同一個資料夾",async t=>{
  if(!HAVE)return t.skip(NO);const T=require(EBP),tmp=fs.mkdtempSync(path.join(os.tmpdir(),"ebp-")),pgn=path.join(tmp,"in.pgn"),G=GAMES().slice(0,3),d=path.join(tmp,"d");t.after(()=>fs.rmSync(tmp,{recursive:true,force:true}));
  const log=console.log;console.log=()=>{};t.after(()=>{console.log=log});
  fs.writeFileSync(pgn,G.map(([g,opp,res])=>toPgn(g,{event:"甲 對 "+opp,red:"甲",black:opp,res,notes:g.lines[0].moves.map(()=>"正著；走完後均勢，雙方差不多")})).join("\n"));
  const base={pgn,out:d,app:4000,pi:1,pn:1,maxMs:6e5},E1=fakeEngine();await T.run({...base,tiers:["quarter","app"],engine:E1});const R1=T.loadRun(d);assert.deepEqual(R1.cfg.tiers,["quarter","app"]);const n1=E1.n;assert.ok(n1>0);
  const E2=fakeEngine(),EK=fakeEngine(),r2=await T.run({...base,tiers:["app","x16","quarterTT","appTT"],engine:E2,engineKeep:EK});assert.equal(r2.did,3);const R2=T.loadRun(d);
  assert.deepEqual(R2.cfg.tiers,["quarter","app","x16","quarterTT","appTT"],"config 記做過的全部檔位，照固定順序");for(let i=0;i<3;i++){assert.deepEqual(Object.keys(R2.games[i].tiers),["quarter","app","x16","quarterTT","appTT"]);assert.deepEqual(R2.games[i].tiers.app,R1.games[i].tiers.app);assert.deepEqual(R2.games[i].tiers.quarter,R1.games[i].tiers.quarter)}
  assert.equal(EK.ng,6,"留雜湊表的檔位每盤開始清一次（兩個對照檔 × 3 盤）");assert.ok(EK.n>0&&E2.n>0);assert.ok(E2.n<n1,"app 那一檔沒有重做（只做了 x16）");
  const E3=fakeEngine(),r3=await T.run({...base,tiers:["quarter","app","x16","quarterTT","appTT"],engine:E3,engineKeep:E3});assert.equal(r3.did,0);assert.equal(E3.n,0,"都做過了，什麼都不跑");
  const rep=T.report(d,{boot:100});assert.deepEqual(Object.keys(rep.out.phone.vs),["quarter","app","x16","quarterTT","appTT"]);assert.deepEqual(rep.out.budget["全部"].all.map(c=>c.lo+">"+c.hi),["quarter>app","app>x16"]);
  assert.match(rep.md,/app＋留雜湊表（4000 節點）/);assert.match(rep.md,/app×16（64000 節點）/);assert.match(rep.md,/「留雜湊表」的檔位是對照用/);assert.ok(["quarter","app","x16","quarterTT","appTT"].includes(rep.out.phone.boot.q.best));assert.match(rep.md,/評等相同的比例，最高的 /);
  /* 留雜湊表的對照檔自己互比一節；同樣節點數「清 vs 留」另外一行（假引擎沒有雜湊表，所以兩邊一模一樣） */
  assert.deepEqual(rep.out.budget["留雜湊表"].all.map(c=>c.lo+">"+c.hi),["quarterTT>appTT"]);assert.match(rep.md,/### 留雜湊表的對照檔互比（全部 3 盤/);assert.deepEqual(rep.out.budget["留不留"].map(c=>[c.lo,c.hi,c.ply.labelSame]),[["quarter","quarterTT",100],["app","appTT",100]]);assert.match(rep.md,/同樣的節點數，清雜湊表 vs 留雜湊表的評語相同 %：app÷4 100%/);
  const only=T.report(d,{boot:50,tiers:["quarter","app"]});assert.deepEqual(Object.keys(only.out.phone.vs),["quarter","app"],"--tiers 可以只用幾檔出報表");assert.equal(only.out.budget["留雜湊表"],undefined);
  const other=path.join(tmp,"other.pgn");fs.writeFileSync(other,toPgn(G[0][0],{event:"甲 對 丁",red:"甲",black:"丁",res:"1-0"}));await assert.rejects(()=>T.run({...base,pgn:other,tiers:["app"],engine:fakeEngine()}),/別的棋譜或別的 --app/);await assert.rejects(()=>T.run({...base,app:8000,tiers:["app"],engine:fakeEngine()}),/別的棋譜或別的 --app/);
});
