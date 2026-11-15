// 七星各自等級：黑洞戰鬥規則（開發者 11/15 選單；story/七星各自等級_戰鬥規則草案_1115.md）。不開瀏覽器：
//   每種棋子是誰幾級（07pty-party.js PTY.squadOf）、星門圍城（07bhg GSV：車輪戰共用）擒子看吃子那顆、被擒看被吃那顆、元氣＝七種平均、沒帶設定＝舊規則；
//   塔防（07bht BHTD）同樣的開局與取數值；成長幅度放大。本機未發布，公開證據用 test-party- 前綴排除。
// 用法：node --test xiangqi-lab/tools/test-party-battle.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const load=(f,name)=>{const c={console,Math,JSON};vm.createContext(c);vm.runInContext(rd(f)+`\n;this.${name}=${name};`,c);return c[name]};
const PS=rd("xiangqi-db/m/07pty-party.js"),T=load("xiangqi-db/m/07pty-party.js".replace(/^/,""),"PTY");
const G=load("xiangqi-db/m/07bhg-gatesiege.js","GSV"),B=load("xiangqi-db/m/07bht-td.js","BHTD");
const J=x=>JSON.parse(JSON.stringify(x)),Q=(lu,xi)=>G.LSQ(lu,xi);
const SQ=(o)=>Object.assign({R:{ck:"x_swordboy",L:10},N:{ck:"x_miaogirl",L:30},B:{ck:"x_spiritgirl",L:5,wood:1},A:{ck:"x_shi",L:6},K:{ck:"x_shuai",L:6},C:{ck:"x_martialgirl",L:5,wood:1},P:{ck:"x_bing",L:5,wood:1}},o||{});
function gs(pcs,o){o=o||{};const b=new Array(90).fill(null);for(const[p,lu,xi]of pcs)b[Q(lu,xi)]=p;const start=C.fen(b,"r").split(" ")[0];
  const P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];
  P.td=G.boot({mode:G.MODE,lv:1,ch:o.ch||"x_swordboy",L:o.L||10,sk:[],sq:o.sq},P,C);P.td.waves=[];return P}
const mv=(P,f,t)=>{assert.ok(C.legal(P.board,P.turn).some(([a,b])=>a===f&&b===t),`不合法 ${f}→${t}`);const m=C.stateApply(P,f,t);return G.move(P,m,C)};

test("隊伍：每種棋子是誰、幾級；已加入的用自己的等級，還沒加入的是木棋靈（同一位角色、等級＝修為一半）", ()=>{
  const P=T.fresh(0);T.join(P,"x_miaogirl",10,0);const S=T.squadOf(P,10);
  assert.deepEqual(Object.keys(S).sort(),["A","B","C","K","N","P","R"]);
  assert.deepEqual(J(S.R),{ck:"x_swordboy",L:1});assert.deepEqual(J(S.N),{ck:"x_miaogirl",L:8});
  assert.deepEqual(J(S.C),{ck:"x_martialgirl",L:5,wood:1});assert.deepEqual(J(S.K),{ck:"x_shuai",L:5,wood:1});
  for(const[pc,c]of Object.entries(T.PCOF))assert.ok(T.ORDER.includes(c),pc)});

test("星門圍城：成長放大到跟塔防一樣明顯（Lv 20 元氣約 +32%、攻擊 +14、防禦 +7）", ()=>{
  const a=G.stats("x_swordboy",1),b=G.stats("x_swordboy",20);assert.equal(b.hp,Math.round(105*(1+.8*((1-Math.exp(-19/42))/(1-Math.exp(-99/42))))));
  assert.ok(b.hp-a.hp>=30&&b.hp-a.hp<=36,"元氣約 +32%");assert.equal(b.atk-a.atk,14);assert.equal(b.def-a.def,7)});

test("星門圍城：有 sq 時元氣上限＝七種棋子的平均；招式、靈力仍是隊長那組；沒有 sq＝舊規則（整隊一組）", ()=>{
  const S=SQ(),P=gs([["K",5,1],["k",4,10],["R",1,1]],{sq:S}),td=P.td,avg=Math.round(G.PCS.reduce((s,pc)=>s+G.stats(S[pc].ck,S[pc].L).hp,0)/7);
  assert.equal(td.me.hp,avg);assert.equal(td.me.hpMax!=null?td.me.hpMax:td.me.max!=null?td.me.max:avg,avg);
  assert.equal(td.me.atk,G.stats("x_swordboy",10).atk,"隊長那組給招式用");assert.equal(td.sq.N.atk,G.stats("x_miaogirl",30).atk);assert.equal(td.sq.C.wood,1);
  const O=gs([["K",5,1],["k",4,10],["R",1,1]],{});assert.equal(O.td.sq,null);assert.equal(O.td.me.hp,G.stats("x_swordboy",10).hp)});

test("星門圍城：我方擒子用「吃子那顆」的攻擊（傌吃＝小梅 Lv30）；同一盤沒有 sq 時用隊長的攻擊", ()=>{
  const pcs=[["K",5,1],["k",4,10],["N",3,3],["p",4,5]];
  const P=gs(pcs,{sq:SQ()});mv(P,Q(3,3),Q(4,5));const e=P.td.q.find(x=>x.why==="cap");
  assert.equal(e.raw,G.dmg(G.CAPB.P,G.stats("x_miaogirl",30).atk,P.td.en.def));
  const O=gs(pcs,{});mv(O,Q(3,3),Q(4,5));assert.equal(O.td.q.find(x=>x.why==="cap").raw,G.dmg(G.CAPB.P,G.stats("x_swordboy",10).atk,O.td.en.def))});

test("星門圍城：我方被擒用「被吃那顆」的防禦（俥被吃＝齊轍）；入侵、將軍這類沒有特定棋子的用帥的防禦", ()=>{
  const S=SQ({R:{ck:"x_swordboy",L:1},K:{ck:"x_shuai",L:40}});
  const P=gs([["K",5,1],["k",4,10],["R",1,5],["r",1,8]],{sq:S});mv(P,Q(5,1),Q(5,2));mv(P,Q(1,8),Q(1,5));
  const e=P.td.ev.find(x=>x.k==="cap"&&x.by==="b");assert.ok(e,"黑方擒子有記事件");assert.equal(e.raw,G.dmg(G.CAPB.R,P.td.en.atk,G.stats("x_swordboy",1).def));
  assert.equal(G.defR(P.td,"K"),G.stats("x_shuai",40).def);assert.equal(G.atkR(P.td,"N"),G.stats("x_miaogirl",30).atk)});

test("塔防：有 sq 時元氣上限＝七種的平均（天賦照樣套）；練習賽不帶；沒有 sq＝舊規則", ()=>{
  const S=SQ(),P={board:C.parseFen(B.startFen(1,C)),turn:"r",moves:[],pos:[]};const td=B.boot({lv:1,ch:"x_swordboy",L:10,diff:2,sq:S},P,C);
  const avg=Math.round(B.PCS?0:0)+Math.round(["R","N","B","A","K","C","P"].reduce((s,pc)=>s+B.stats(S[pc].ck,S[pc].L,{}).hp,0)/7);
  assert.equal(td.me.max,avg);assert.equal(B.atkR(td,"N"),B.stats("x_miaogirl",30,{}).atk);assert.equal(B.defR(td,"A"),B.stats("x_shi",6,{}).def);
  assert.equal(td.me.atk,B.stats("x_swordboy",10,{}).atk,"隊長那組給招式、畫面");
  const tl=B.boot({lv:"tl",ch:"x_swordboy",L:1,sq:S},{board:C.parseFen(B.startFen("tl",C)),turn:"r",moves:[],pos:[]},C);assert.equal(tl.sq,null,"練習賽照劇本");
  const O=B.boot({lv:1,ch:"x_swordboy",L:10,diff:2},{board:C.parseFen(B.startFen(1,C)),turn:"r",moves:[],pos:[]},C);assert.equal(O.sq,null);assert.equal(O.me.max,B.stats("x_swordboy",10,{diff:2}).hp)});

test("〔原始碼〕扣血接點：兩種規則的擒子／被擒／將軍／入侵／星樞招都改看各自棋子；開局沒帶設定就問 ptySquad；開局呼叫原樣不動", ()=>{
  const GS=rd("xiangqi-db/m/07bhg-gatesiege.js"),TD=rd("xiangqi-db/m/07bht-td.js");
  assert.ok(GS.includes("{vp,cp:pt,fc:fc?1:0,tag:gtag,def:def0,atk:atkR(td,pt)}"));assert.ok(GS.includes('queue(td,"r",CAPB[vp],"cap",{vp,cp:pt,def:defR(td,vp)})'));
  assert.ok(GS.includes('const defOf=(td,side)=>side==="b"?td.en.def+GUARD*guards(td):defR(td,"K");'));
  assert.ok(GS.includes('squad((cfg.sq!==undefined?cfg.sq:(typeof ptySquad==="function"?ptySquad():null)))'));assert.ok(GS.includes("td:{mode:GSV.MODE,lv:n,ch:ck,L,sk:P.sk[ck],hard}}"),"星門圍城開局呼叫原樣");
  assert.ok(TD.includes("capDmg(m.cap,pc,atkR(td,up(pc)),"));assert.ok(TD.includes("*CAPM[up(pc)])),defR(td,up(m.cap)))"));assert.ok(TD.includes('defDmg(CHK_HIT,defR(td,"K"))'));
  assert.ok(TD.includes('squad((cfg.sq!==undefined?cfg.sq:(typeof ptySquad==="function"?ptySquad():null)),cfg)'));assert.ok(TD.includes("td:{lv:n,ch:ck,L,diff,sk,xm,tal}"),"塔防開局呼叫原樣");
  assert.ok(!/td\.me\.def\),b\.indexOf\("K"\)/.test(TD),"被將軍不再用整隊防禦");
  assert.ok(PS.includes("function ptySquad(){const P=ptyGet();return P?PTY.squadOf(P,ptyL()):null}"))});

test("星門圍城：結算後的扣血事件帶吃子那顆（cp）與被吃那顆（vp），跳字才放得了頭像；三種跳字函式都多一個頭像參數", ()=>{
  const P=gs([["K",5,1],["k",4,10],["N",3,3],["p",4,5]],{sq:SQ()});mv(P,Q(3,3),Q(4,5));mv(P,Q(4,10),Q(4,9));
  const h=P.td.ev.find(x=>x.k==="hit"&&x.why==="cap");assert.ok(h,"有擒子扣血事件");assert.equal(h.cp,"N");assert.equal(h.vp,"P");
  const TD=rd("xiangqi-db/m/07bht-td.js"),GS=rd("xiangqi-db/m/07bhg-gatesiege.js"),WH=rd("xiangqi-db/m/07bhw-wheel.js");
  assert.ok(TD.includes("function bhtdFloat(t,p,cls,fs,av){"));assert.ok(TD.includes('hitMe(td,n,m.t,"被擒",{vp:up(m.cap)})'));assert.ok(TD.includes("const av=typeof ptyAv===\"function\"?ptyAv(e.cp):null"));
  assert.ok(GS.includes("ptyAv(e.to===\"b\"?e.cp:e.vp)"));assert.ok(WH.includes("function whlFloat(t,sq,cls,av){"));assert.ok(WH.includes("function whl3Float(t,sq,cls,av){"))});
