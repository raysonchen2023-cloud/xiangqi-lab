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
  for(const n of PRO){assert.deepEqual(J(G.lvCheck(n,C)),[],G.lvName(n));const V=G.LV[n],pl=G.plan(n);assert.equal(V.pro,1);assert.deepEqual(J(pl.res),[]);assert.deepEqual(J(pl.dp),[],"序章沒有後備、補給點");
    assert.ok(V.depth<=3&&V.hp<=110,"星樞 HP 調低、想得淺");assert.ok(V.say&&V.tip)}
  for(const n of[1,7,12]){assert.equal(G.plan(n).red.length,8);assert.equal(G.plan(n).res.length,8)}
});

test("各階段只放已加入的角色：A 只有俥（木帥），B 加傌，C 才有帥仕", ()=>{
  const pcs=n=>[...new Set(G.plan(n).red.map(x=>x[0]))].sort().join("");
  assert.deepEqual(PRO.slice(0,3).map(pcs),["KR","KR","KR"]);assert.deepEqual(PRO.slice(3,6).map(pcs),["KN","KNR","AKNR"]);
  assert.deepEqual(PRO.slice(6).map(pcs),["AKR","AKR","AKNR"]);
});

test("純殘局四關（A2、A3、B2、C2）的擺法＝引擎驗過紅方先走有殺的那幾盤", ()=>{
  /* 11/15 用 App 的 Pikafish 深度 28 搜：A2 殺 2 步、A3 殺 7 步、B2 殺 5 步、C2 殺 4 步（scratchpad pro_verify.js）。改擺法要重驗 */
  assert.deepEqual(J([32,33,35,38].map(n=>G.startFen(n,C))),["9/9/4k4/9/9/R8/9/9/9/3K5","3a1a3/4k4/9/9/9/9/9/9/9/3K4R","3aka3/9/9/9/9/9/9/9/9/1N1K4R","3a5/4k4/9/9/9/9/9/9/4A4/4K3R"]);
  for(const n of[32,33,35,38])assert.deepEqual(J(G.LV[n].waves),[],"沒有波次，將死就是過關方法");
});

/* 盤面跑 settle：每回合結算前先照 f 改盤（例如把卒清掉），回傳第幾回合結束、結果 */
function runSettle(n,f,max){const P={board:G.startBoard(n),turn:"r",moves:[]};P.td=G.boot({lv:n,ch:"x_swordboy",L:3,sq:null},P,C);
  for(let i=0;i<(max||10);i++){f(P);const r=G.settle(P,C);if(r&&r.end)return{i,end:r.end,td:P.td}}return{i:-1,end:null,td:P.td}}
const clear=k=>P=>{for(let q=0;q<90;q++)if(P.board[q]===k){P.board[q]=null;delete P.td.ids[q]}};
const clearInv=P=>{for(const q in P.td.ids)if(G.tagOf(P.td,P.td.ids[q])==="inv"){P.board[+q]=null;delete P.td.ids[q]}};

test("過關條件 clr（A1、B1）：盤上的卒吃光、而且星門沒有還沒落的卒，才算過關", ()=>{
  assert.deepEqual(J(G.LV[31].win),{clr:"p"});assert.deepEqual(J(G.LV[34].win),{clr:"p"});
  const a=runSettle(31,clear("p"));assert.equal(a.end.w,"r");assert.match(a.end.why,/卒全部清光/);
  assert.ok(a.td.waves.every(w=>w.st!=="wait"),"星門那一顆落下來、也被吃掉以後才過關");assert.ok(a.i>=1,"第一回合清光也不算（第 2 回合還會落一顆）");
  const b=runSettle(34,clear("p"));assert.equal(b.end.w,"r");assert.equal(b.i,0,"B1 沒有波次：清光那一回合就過關");
  const c=runSettle(31,()=>{},3);assert.equal(c.end,null,"卒還在就不算");
});

test("過關條件 wv（B3）：三波都落下、盤上沒有入侵卒才過關；只清一半不算", ()=>{
  assert.deepEqual(J(G.LV[36].win),{wv:1});
  const a=runSettle(36,clearInv);assert.equal(a.end.w,"r");assert.match(a.end.why,/援軍都擋下來/);assert.ok(a.td.waves.every(w=>w.st!=="wait"));
  assert.ok(a.i>=4,"最後一波第 5 回合才落");
  const b=runSettle(36,()=>{},4);assert.equal(b.end,null);
});

test("殘局關放寬「連續沒進展判和」到 14 回合；主線照舊 8", ()=>{
  for(const n of[31,32,33,35,38])assert.equal(G.LV[n].noprog,14);assert.equal(G.LV[34].noprog,20,"B1 傌追卒要更久");
  const P={board:G.startBoard(32),turn:"r",moves:[]};P.td=G.boot({lv:32,ch:"x_swordboy",L:3,sq:null},P,C);assert.equal(P.td.noprog,14);
  const Q={board:G.startBoard(1),turn:"r",moves:[]};Q.td=G.boot({lv:1,ch:"x_swordboy",L:3,sq:null},Q,C);assert.equal(Q.td.noprog,G.NOPROG);
  assert.match(SRC,/td\.np>=\(td\.noprog\|\|NOPROG\)/);
});

test("解鎖：A1 一開始就開；B1 要駱躍梅加入、C1 要沈方庭和鐵連城加入；階段內破前一關；第 1 關要先破 C1，改版前打過主線的存檔不鎖", ()=>{
  const W=(...ns)=>({c:Object.fromEntries(ns.map(n=>[n,{w:1}]))}),has=L=>c=>L.includes(c),open=(P,h)=>G.LVN.filter(n=>!G.lockWhy(P,n,0,0,h));
  assert.deepEqual(J(open({c:{}},has(["x_swordboy"]))),[31],"新玩家只開 A1");
  assert.equal(G.lockWhy({c:{}},34,0,0,has(["x_swordboy"])),"駱躍梅加入後開放");assert.equal(G.lockWhy({c:{}},37,0,0,has(["x_swordboy","x_miaogirl"])),"沈方庭、鐵連城加入後開放");
  assert.equal(G.lockWhy({c:{}},37,0,0,has(["x_swordboy","x_miaogirl","x_shuai"])),"沈方庭、鐵連城加入後開放","兩位都要");
  assert.equal(G.lockWhy({c:{}},32),"破序章 A1開放");
  assert.deepEqual(J(open(W(31,32,33),has(["x_swordboy","x_miaogirl"]))),[31,32,33,34],"駱躍梅加入：B1 開，不用等 A3（快的玩家不被卡）");
  assert.deepEqual(J(open({c:{}},has(["x_swordboy","x_miaogirl"]))),[31,34]);
  assert.equal(G.lockWhy({c:{}},1),"破序章 C1 開放");assert.equal(G.lockWhy(W(37),1),"");assert.equal(G.lockWhy({c:{5:{w:0,l:2,d:0}}},1),"","改版前打過主線（輸也算）");
  assert.equal(G.lockWhy(W(37),2),"破第 1 關開放","第 2 關以後照舊");assert.equal(open({c:{}},null).length,3,"沒給 has＝不看加入：三個階段的第一關都開");
  assert.equal(G.lockWhy({c:{}},31,1),"先破普通版");assert.equal(open({c:{}},null).includes(1),false);assert.equal(G.LVN.filter(n=>!G.lockWhy({c:{}},n,0,true)).length,21,"開發者全開");
});

test("三星：殘局關看快不快、靠不靠招（星樞沒有傷害來源，HP 星一定拿到）；困難版只套通用的 HARD", ()=>{
  for(const n of PRO){const g=G.goals(n);assert.equal(g.length,3);assert.notEqual(g[1].k,g[2].k)}
  assert.deepEqual(J(G.goals(32).map(g=>g.t)),["過關","4 回合內過關","不用招也過關"]);assert.deepEqual(J(G.goals(36).map(g=>g.t)),["過關","入侵沒扣到血","剩餘 HP 60% 以上"]);
  assert.equal(G.GOAL.fast.ok({rnd:4},null,4),true);assert.equal(G.GOAL.fast.ok({rnd:5},null,4),false);
  assert.equal(G.GOAL.nosk.ok({used:{}}),true);assert.equal(G.GOAL.nosk.ok({used:{qi1:1}}),false);
  for(const n of PRO){const V=G.LV[n],X=G.lvOf(n,1);assert.equal(X.hard,1);assert.equal(X.depth,Math.min(4,V.depth+1));assert.equal(X.esp0,V.esp0+15);assert.equal(X.atk,V.atk+10);assert.equal(X.hp,V.hp,"不加血");assert.deepEqual(J(X.red),J(V.red))}
  assert.equal(G.lvOf(32,0),G.LV[32]);
});

test("開戰：序章不判長將（noPerpetual）、關名照 lvName；隊長的本命棋子不在盤上就換人（B1 只有傌→駱躍梅）", ()=>{
  assert.match(SRC,/lv:Object\.assign\(\{fen:GSV\.startFen\(n,C\),turn:"r"\},V\.pro\?\{noPerpetual:true\}:\{\}\)/);
  assert.match(SRC,/toast\(`🌠 星門圍城・\$\{GSV\.lvName\(n\)\}・/);
  assert.equal(ctx.gsvCapt(34,"x_swordboy"),null,"沒有 07pty-party.js 就不換");
  ctx.ptySquad=()=>({R:{ck:"x_swordboy",L:6},N:{ck:"x_miaogirl",L:4},B:{ck:"x_spiritgirl",L:1,wood:1},A:{ck:"x_shi",L:1,wood:1},K:{ck:"x_shuai",L:1,wood:1},C:{ck:"x_martialgirl",L:1,wood:1},P:{ck:"x_bing",L:1,wood:1}});
  try{assert.deepEqual(J(ctx.gsvCapt(34,"x_swordboy")),{ck:"x_miaogirl",L:4,from:"x_swordboy"});
    assert.equal(ctx.gsvCapt(31,"x_swordboy"),null,"俥在盤上就不換");assert.equal(ctx.gsvCapt(35,"x_swordboy"),null);
    assert.equal(ctx.gsvCapt(31,"x_miaogirl").ck,"x_swordboy","隊長是駱躍梅、A 關沒有傌：換成齊轍");
    assert.equal(ctx.gsvCapt(1,"x_swordboy"),null,"主線關紅方一定有俥")}finally{delete ctx.ptySquad}
  assert.match(SRC,/const sw=gsvCapt\(n,ck\);if\(sw\)\{ck=sw\.ck;L=sw\.L\}/);assert.match(SRC,/改由\$\{GSV\.CH\[ck\]\.n\}當隊長/);
});

test("第一次在大星盤上看到木棋靈：齊轍說一句，每個存檔只說一次（party.wood，norm 保留）", ()=>{
  const PS=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07pty-party.js"),"utf8").replace(/\r\n/g,"\n"),c2={console,Math,JSON};vm.createContext(c2);
  vm.runInContext(PS.slice(0,PS.indexOf("/* ===== 存檔層"))+"\n;this.PTY=PTY;",c2);const T=c2.PTY,P0=T.fresh?T.fresh(0):T.norm({});
  assert.equal(T.norm(Object.assign(J(P0),{wood:1})).wood,1);assert.equal(T.norm(J(P0)).wood,undefined,"沒說過就沒有這個欄位");
  assert.match(PS,/function ptyWoodSay\(pcs\)\{[^\n]*S\[pc\]&&S\[pc\]\.wood[^\n]*if\(P\.wood\)return"";P\.wood=1;ptySave\(P\)/);
  assert.match(PS,/星辰之力還沒補齊，這些棋靈先幫我們卡位，我們去把大家找回來。/);
  assert.match(SRC,/ptyWoodSay\(GSV\.plan\(n\)\.red\.map\(/,"星門圍城開戰時問一次");
});
