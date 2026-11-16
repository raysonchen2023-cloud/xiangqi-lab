// 黑洞新規則（星門圍城 v2）跟 local.js 的整合測試：local.js 整支在沙盒裡跑（假 localStorage、假引擎；助手照 test-bhtd-rules.js 那一份），
//   載 07bht（舊塔防 BHTD）、07bhg（星門圍城 GSV）、07sg2（v2）——跟 App 同樣的包法。
//   ① v2 的盤：開局、走子、攻擊沒打死停原地、星樞照新規則出步（不叫引擎）、合法步照新規則、重新載入盤面一樣。
//   ② 不是 v2 的盤（挑戰電腦、殘局起手、舊版塔防）：合法步跟 core.js 一樣、電腦照舊叫引擎、XQ_TD.own 回 false。
// 用法：node --test xiangqi-lab/tools/test-siege2-local.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const LOC=rd("xiangqi-lab/src/local.js"),SRCS=["xiangqi-db/m/07bht-td.js","xiangqi-db/m/07bhg-gatesiege.js","xiangqi-db/m/07sg2-siege2.js"].map(rd);
function fakeIDB(){const data=new Map();return{open(){const r={};setImmediate(()=>{r.result={transaction(){const t={},store={get(k){const q={result:data.get(k)};setImmediate(()=>q.onsuccess&&q.onsuccess());return q},put(v,k){data.set(k,v);return{}},delete(k){data.delete(k);return{}}};t.objectStore=()=>store;setImmediate(()=>setImmediate(()=>t.oncomplete&&t.oncomplete()));return t}};r.onsuccess&&r.onsuccess()});return r}}}
function tab(m){const Q=[],T={ev:[],sm:[],Q};const ls={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}};
  const ctx={console:{log(){},warn(){},error(){}},URL,URLSearchParams,setImmediate,Date,Math,JSON,setTimeout:(fn)=>{Q.push(fn);return Q.length},clearTimeout(){},setInterval:()=>0,clearInterval(){},
    localStorage:ls,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},indexedDB:fakeIDB(),location:{href:"http://localhost/",hash:"#/journey/play",pathname:"/",search:""},history:{replaceState(){}},navigator:{onLine:true},
    Event:class{constructor(t){this.type=t}},CustomEvent:class{constructor(t,d){this.type=t;this.detail=d&&d.detail}},addEventListener(){},removeEventListener(){},dispatchEvent:e=>{T.ev.push(e.type);return true},document:{hidden:false,addEventListener(){}},atob:s=>Buffer.from(s,"base64").toString("binary"),
    XQEngine:{ready:true,search:async(q,lim,mpv)=>{T.calls=(T.calls||0)+1;if(lim&&lim.searchmoves)T.sm.push(lim.searchmoves.slice());const S0={start:q.fen.split(" ")[0],startTurn:q.fen.split(" ")[1]==="b"?"b":"r",moves:(q.moves||[]).map(u=>({f:C.parseSq(u.slice(0,2)),t:C.parseSq(u.slice(2,4))}))};C.stateRebuild(S0);const b=S0.board,s=S0.turn;let L=C.legal(b,s).map(([f,t])=>C.iccs(f,t));
      if(lim&&lim.searchmoves&&lim.searchmoves.length)L=L.filter(u=>lim.searchmoves.includes(u));const quiet=L.filter(u=>!b[C.parseSq(u.slice(2,4))]);const best=(quiet[0]||L[0]);return{best,lines:[{k:1,v:0,mv:best,pv:[best]}]}}}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(ROOT,"xiangqi-lab/site/core.js"),"utf8"),ctx);vm.runInContext(LOC,ctx);for(const s of SRCS)vm.runInContext(s,ctx);vm.runInContext("this.GSV=GSV;this.BHTD=BHTD;this.SG2G=SG2G;this.SG2=SG2;",ctx);T.ctx=ctx;
  T.api=async(u,b)=>JSON.parse(JSON.stringify(await ctx.XQ.api(u,b)));T.pump=async()=>{for(let i=0;i<120&&Q.length;i++){const f=Q.shift();try{const r=f();if(r&&r.catch)r.catch(()=>{})}catch(e){}for(let k=0;k<6;k++)await new Promise(r=>setImmediate(r))}};return T}   /* 計時器不 await（playEngine 等的 setTimeout 也在佇列裡） */

const sameSet=(a,b)=>{const k=x=>x.map(m=>m.join(",")).sort().join(" ");return k(a)===k(b)};
test("v2 的盤：開局、走子、星樞照新規則出步（不叫引擎）、合法步照新規則、重新載入一樣",async()=>{
  const m=new Map(),T=tab(m);const G=T.ctx.GSV,X=T.ctx.XQ_TD;assert.ok(X.sg2&&X.gsv,"XQ_TD 包了兩層（07bhg、07sg2）");
  const fen=G.startFen(1,C);let s=await T.api("/play/new",{human:"r",lx:2,journey:"bh:gs1",lv:{fen,turn:"r",noPerpetual:true},td:{mode:"gate-siege-v2",lv:1,diff:1,sq:null}});
  assert.equal(s.td.mode,"gate-siege-v2");assert.equal(s.td.depth,1);
  const P0=JSON.parse(m.get("xq_play"));assert.ok(X.own(P0));
  const L0=T.ctx.SG2G.legal(P0,C,"r");assert.ok(L0.length>0&&sameSet(s.legal,L0),"playState 的合法步＝v2 的合法步");
  const calls0=T.calls||0;const mv=s.legal.find(([f,t])=>!s.board[t]);s=await T.api("/play/move",{f:mv[0],t:mv[1]});await T.pump();s=await T.api("/play/state");
  assert.equal(s.turn,"r","星樞走完了");assert.equal(s.moves.length,2);assert.equal(T.calls||0,calls0,"v2 不叫 Pikafish");assert.equal(s.td.rnd,1);
  const T2=tab(m),s2=await T2.api("/play/state");assert.deepEqual(s2.board,s.board,"重新載入：盤面照 td.s");assert.equal(s2.turn,s.turn);
  await assert.rejects(T.api("/play/move",{f:0,t:1}),/不合法|輪到/);await assert.rejects(T.api("/play/undo"),/不能悔棋/)});
test("v2：攻擊沒打死停在原地（盤面不動、換手），local.js 不拿 core.js 的走法去改盤面",async()=>{
  const m=new Map(),T=tab(m);const b=new Array(90).fill(null),Q=(lu,xi)=>(10-xi)*9+(lu-1);for(const[p,lu,xi]of[["K",5,1],["k",4,10],["R",1,5],["r",1,7],["p",9,7]])b[Q(lu,xi)]=p;
  const fen=C.fen(b,"r").split(" ")[0];await T.api("/play/new",{human:"r",lx:2,journey:"bh:gs1",lv:{fen,turn:"r",noPerpetual:true},td:{mode:"gate-siege-v2",lv:1,diff:2,sq:null}});
  const P=JSON.parse(m.get("xq_play"));P.td.waves=[];P.seq=(P.seq||0)+1;m.set("xq_play",JSON.stringify(P));
  let s=await T.api("/play/move",{f:Q(1,5),t:Q(1,7)});assert.equal(s.board[Q(1,5)],"R","俥留在原地");assert.equal(s.board[Q(1,7)],"r","黑車還在");
  const P1=JSON.parse(m.get("xq_play"));const E=P1.td.ev.filter(e=>e.k==="att").pop();assert.ok(E&&E.ok===1&&!E.kill,"存檔的事件記著這一下打中但沒打死");assert.equal(P1.td.s.b[Q(1,5)],"R")});
test("不是 v2 的盤：挑戰電腦照舊（合法步＝core.js、電腦叫引擎、XQ_TD.own 回 false）",async()=>{
  const m=new Map(),T=tab(m),X=T.ctx.XQ_TD;let s=await T.api("/play/new",{human:"r",level:1});
  assert.ok(sameSet(s.legal,C.legal(s.board,"r")),"合法步跟 core.js 一樣");const P=JSON.parse(m.get("xq_play"));assert.equal(X.own(P),false);
  const c0=T.calls||0;s=await T.api("/play/move",{f:64,t:67});for(let i=0;i<5;i++)await T.pump();s=await T.api("/play/state");assert.ok((T.calls||0)>c0,"一般對局電腦照舊叫引擎");
  assert.equal(s.board[67],"C","一般走子照 core.js 移動（b3 炮平到 e3）");const P1=JSON.parse(m.get("xq_play"));assert.equal(P1.moves[0].st,undefined,"一般走法沒有 st 欄位")});
test("不是 v2 的盤：殘局起手、舊版塔防照舊（own 回 false、合法步＝core.js）",async()=>{
  const m=new Map(),T=tab(m),X=T.ctx.XQ_TD,fen="4k4/9/9/9/9/9/9/9/4R4/3K5";let s=await T.api("/play/new",{human:"r",lx:1,journey:"park",lv:{fen,turn:"r"}});
  assert.ok(sameSet(s.legal,C.legal(s.board,"r")));assert.equal(X.own(JSON.parse(m.get("xq_play"))),false);
  const m2=new Map(),T2=tab(m2),B=T2.ctx.BHTD,f2=B.startFen(1,C);s=await T2.api("/play/new",{human:"r",lx:1,journey:"bh:td1",lv:{fen:f2,turn:"r"},td:{lv:1,ch:"x_martialgirl",L:20,diff:2,sk:["lei1"]}});
  assert.ok(s.td&&s.td.mode!=="gate-siege-v2");assert.equal(T2.ctx.XQ_TD.own(JSON.parse(m2.get("xq_play"))),false);assert.ok(sameSet(s.legal,C.legal(s.board,"r")))});
