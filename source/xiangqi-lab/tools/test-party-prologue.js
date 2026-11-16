// 星槎序章（七星改版第二期，開發者 11/15「然後在做序章」；設計書 story/七星陸續加入與各自等級_設計書_1115.md 第七節）：m/07bhg-gatesiege.js 的序章 9 關。不開瀏覽器。
// 用法：node --test xiangqi-lab/tools/test-party-prologue.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../.."),C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const SRC=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07bhg-gatesiege.js"),"utf8").replace(/\r\n/g,"\n");
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(SRC+"\n;this.GSV=GSV;",ctx);const G=ctx.GSV;
const J=x=>JSON.parse(JSON.stringify(x)),PRO=[31,32,33,34,35,36,37,38,39];

test("九關都在序章（第一個分頁）、關名 A1～C3、擺法合法；主線第 1～12 關沒動", ()=>{
  assert.deepEqual(J(G.CHP[0]),{n:0,t:"序章",nm:"星槎序章",lv:PRO});
  assert.deepEqual(PRO.map(n=>G.LV[n].code),["A1","A2","A3","B1","B2","B3","C1","C2","C3"]);
  assert.deepEqual(PRO.map(n=>G.lvName(n)),["序章 A1","序章 A2","序章 A3","序章 B1","序章 B2","序章 B3","序章 C1","序章 C2","序章 C3"]);assert.equal(G.lvName(5),"第 5 關");
  for(const n of PRO){assert.deepEqual(J(G.lvCheck(n,C)),[],G.lvName(n));const V=G.LV[n],pl=G.plan(n);assert.equal(V.pro,1);if(n!==38){assert.deepEqual(J(pl.res),[]);assert.deepEqual(J(pl.dp),[],"序章除了 C2（教部署）沒有後備、補給點")}
    assert.ok(V.depth<=3&&V.hp<=110,"星樞 HP 調低、想得淺");assert.ok(V.say&&V.tip)}
  for(const n of[1,7,12]){assert.equal(G.plan(n).red.length,8);assert.equal(G.plan(n).res.length,8)}
});

test("各階段（11/16 新序章）：A 段齊轍的俥是主角、B 段加駱躍梅的傌、C 段才有沈方庭的帥仕；其他種類是木棋靈",()=>{
  const pcs=n=>[...new Set(G.plan(n).red.map(x=>x[0]))].sort().join("");
  assert.deepEqual(PRO.map(pcs),["CKNR","KPR","KNR","KNR","CKNR","KNR","AKR","AKR","ABCKNPR"]);
  for(const n of PRO.slice(0,3))assert.ok(G.plan(n).red.some(x=>x[0]==="R"),"A 段有俥");for(const n of PRO.slice(3,6))assert.ok(G.plan(n).red.some(x=>x[0]==="N"),"B 段有傌");
  for(const n of PRO.slice(6))assert.ok(G.plan(n).red.some(x=>x[0]==="A"),"C 段有仕")
});

/* 盤面跑 settle：每回合結算前先照 f 改盤（例如把卒清掉），回傳第幾回合結束、結果 */
function runSettle(n,f,max){const P={board:G.startBoard(n),turn:"r",moves:[]};P.td=G.boot({lv:n,ch:"x_swordboy",L:3,sq:null},P,C);
  for(let i=0;i<(max||10);i++){f(P);const r=G.settle(P,C);if(r&&r.end)return{i,end:r.end,td:P.td}}return{i:-1,end:null,td:P.td}}
const clear=k=>P=>{for(let q=0;q<90;q++)if(P.board[q]===k){P.board[q]=null;delete P.td.ids[q]}};
const clearInv=P=>{for(const q in P.td.ids)if(G.tagOf(P.td,P.td.ids[q])==="inv"){P.board[+q]=null;delete P.td.ids[q]}};

test("解鎖：A1 一開始就開；B1 要駱躍梅加入、C1 要沈方庭和鐵連城加入；階段內破前一關；第 1 關要先破 C1，改版前打過主線的存檔不鎖", ()=>{
  const W=(...ns)=>({c:Object.fromEntries(ns.map(n=>[n,{w:1}]))}),has=L=>c=>L.includes(c),open=(P,h)=>G.LVN.filter(n=>!G.lockWhy(P,n,0,0,h));
  assert.deepEqual(J(open({c:{}},has(["x_swordboy"]))),[31],"新玩家只開 A1");
  assert.equal(G.lockWhy({c:{}},34,0,0,has(["x_swordboy"])),"駱躍梅加入後開放");assert.equal(G.lockWhy({c:{}},37,0,0,has(["x_swordboy","x_miaogirl"])),"沈方庭、鐵連城加入後開放");
  assert.equal(G.lockWhy({c:{}},37,0,0,has(["x_swordboy","x_miaogirl","x_shuai"])),"沈方庭、鐵連城加入後開放","兩位都要");
  assert.equal(G.lockWhy({c:{}},32),"破序章 A1 開放");   /* 11/17 B-9：補空格（test-sg2-select-1117.js） */
  assert.deepEqual(J(open(W(31,32,33),has(["x_swordboy","x_miaogirl"]))),[31,32,33,34],"駱躍梅加入：B1 開，不用等 A3（快的玩家不被卡）");
  assert.deepEqual(J(open({c:{}},has(["x_swordboy","x_miaogirl"]))),[31,34]);
  assert.equal(G.lockWhy({c:{}},1),"破序章 C1 開放");assert.equal(G.lockWhy(W(37),1),"");assert.equal(G.lockWhy({c:{5:{w:0,l:2,d:0}}},1),"","改版前打過主線（輸也算）");
  assert.equal(G.lockWhy(W(37),2),"破第 1 關開放","第 2 關以後照舊");assert.equal(open({c:{}},null).length,3,"沒給 has＝不看加入：三個階段的第一關都開");
  assert.equal(G.lockWhy({c:{}},31,1),"先破普通版");assert.equal(open({c:{}},null).includes(1),false);assert.equal(G.LVN.filter(n=>!G.lockWhy({c:{}},n,0,true)).length,33,"開發者全開（11/16 加急襲殘陣 12 關）");
});

test("開戰：序章不判長將（noPerpetual）、關名照 lvName；11/16 取消隊長、全隊招式：gsvCapt（換隊長）拿掉，B1 只有傌也照樣帶全隊已學會的招", ()=>{
  assert.match(SRC,/lv:\{fen:GSV\.startFen\(n,C\),turn:"r",noPerpetual:true\}/,"11/16 黑洞新規則：每一關都不判長將長捉");
  assert.match(SRC,/toast\(`🌠 星門圍城・\$\{typeof SG2G!=="undefined"\?SG2G\.nameOf\(n\):GSV\.lvName\(n\)\}・/,"11/16：v2 的關名照分組（易 1…）");
  assert.equal(ctx.gsvCapt,undefined,"gsvCapt 整段拿掉");assert.ok(!SRC.includes("gsvCapt")&&!SRC.includes("當隊長"),"不再換隊長、不再講誰當隊長");
  assert.ok(SRC.includes('P.sk["*"]=typeof ptyPick==="function"?ptyPick(GSV.SK,sk):GSV.skPick(ck,L,sk);'),"gsvStart 存全隊那一份 P.sk[\"*\"]");
  assert.ok(SRC.includes('td:{mode:typeof SG2G!=="undefined"?SG2G.MODE:GSV.MODE,lv:n,diff,sk:P.sk["*"]}}'),"開局帶 P.sk[\"*\"]（11/16 黑洞新規則：開 v2、帶難度）");
  const S={R:{ck:"x_swordboy",L:6},N:{ck:"x_miaogirl",L:4},B:{ck:"x_spiritgirl",L:1,wood:1},A:{ck:"x_shi",L:1,wood:1},K:{ck:"x_shuai",L:1,wood:1},C:{ck:"x_martialgirl",L:1,wood:1},P:{ck:"x_bing",L:1,wood:1}};
  const fen=G.startFen(34,C),P={start:fen,startTurn:"r",board:C.parseFen(fen),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];
  assert.ok(P.board.includes("R")&&P.board.includes("N"),"B1（集火）俥傌都在");
  const td=G.boot({mode:G.MODE,lv:34,ch:"x_swordboy",L:6,sk:[],sq:S},P,C),pool=J(G.skOfSq(td.sq));
  assert.deepEqual(J(td.sk),pool.slice(0,4),"招式池＝已加入的每一位照自己等級學會的，最多 4 招");assert.equal(td.ch,"x_swordboy","畫面上的名字、頭像照首頁小人，不換人");
  for(const id of pool){const k=G.SKM[id];assert.ok(["x_swordboy","x_miaogirl"].includes(k.ch),id+" 只有已加入的兩位")}
  for(const id of td.sk){const k=G.SKM[id];assert.ok(k.lv<=S[k.ch==="x_swordboy"?"R":"N"].L,id+" 照各自等級")}
});

test("第一次在大星盤上看到木棋靈：齊轍說一句，每個存檔只說一次（party.wood，norm 保留）", ()=>{
  const PS=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07pty-party.js"),"utf8").replace(/\r\n/g,"\n"),c2={console,Math,JSON};vm.createContext(c2);
  vm.runInContext(PS.slice(0,PS.indexOf("/* ===== 存檔層"))+"\n;this.PTY=PTY;",c2);const T=c2.PTY,P0=T.fresh?T.fresh(0):T.norm({});
  assert.equal(T.norm(Object.assign(J(P0),{wood:1})).wood,1);assert.equal(T.norm(J(P0)).wood,undefined,"沒說過就沒有這個欄位");
  assert.match(PS,/function ptyWoodSay\(pcs\)\{[^\n]*S\[pc\]&&S\[pc\]\.wood[^\n]*if\(P\.wood\)return"";P\.wood=1;ptySave\(P\)/);
  assert.match(PS,/星辰之力還沒補齊，這些棋靈先幫我們卡位，我們去把大家找回來。/);
  assert.match(SRC,/ptyWoodSay\(GSV\.plan\(n\)\.red\.map\(/,"星門圍城開戰時問一次");
});

test("11/16 結果畫面的解鎖提示：用關名（序章 C1，不是「第 37 關」），只列這一局之前鎖著、贏了才開的（照誰加入了）", ()=>{
  assert.ok(!/第 \$\{n\+1\} 關、/.test(SRC),"不再寫死 n+1");
  assert.match(SRC,/GSV\.LVN\.filter\(k=>k!==n&&GSV\.lockWhy\(P0,k,0,false,has\)&&!GSV\.lockWhy\(P1,k,0,false,has\)\)\.map\(k=>GSV\.lvName\(k\)\)/);
  /* 同一套比對直接跑：破 B3（36）時帥仕還沒加入 → C1 不算開；破 C1（37）→ 第 1 關開 */
  const has=L=>c=>L.includes(c),open=(P,n,h)=>{const R0=P.c[n]||{},at=o=>Object.assign({},P,{c:Object.assign({},P.c,{[n]:Object.assign({},R0,o)})}),P0=at({w:0,l:Math.max(1,R0.l||0)}),P1=at({w:Math.max(1,R0.w||0)});
    return G.LVN.filter(k=>k!==n&&G.lockWhy(P0,k,0,false,h)&&!G.lockWhy(P1,k,0,false,h)).map(k=>G.lvName(k))};
  const W=(...ns)=>({c:Object.fromEntries(ns.map(n=>[n,{w:1}]))});
  assert.deepEqual(J(open(W(31,32,33,34,35,36),36,has(["x_swordboy","x_miaogirl"]))),[],"帥仕還沒加入：破 B3 不說 C1 開放");
  assert.deepEqual(J(open(W(31,32,33,34,35,36),36,()=>true)),[],"C 階段第一關只看加入、不用破 B3：帥仕加入時就開了，破 B3 不會多開");
  assert.deepEqual(J(open(W(37),37,()=>true)),["第 1 關","序章 C2"]);
});

test("新序章（story/168）：只有「打倒將帥」一個勝利條件（沒有 win、noprog）、每關有 say／tip；B2 開局靈力 50；C2 有後備傌兵和兩個補給點",()=>{
  for(const n of PRO){const V=G.LV[n];assert.equal(V.win,undefined,G.lvName(n)+" 沒有特別過關條件");assert.equal(V.noprog,undefined);assert.ok(V.say&&V.tip&&V.th)}
  assert.equal(G.LV[35].sp0,50);assert.deepEqual(J(G.plan(38).res),["N","P"]);assert.equal(G.plan(38).dp.length,2);
  assert.deepEqual(PRO.map(n=>G.LV[n].nm),["攻擊不是吃子","打不動就降防","將軍一定要應","集火","一步一招","星門援軍","護帥","部署後備","結業：小星門圍城"]);
});
