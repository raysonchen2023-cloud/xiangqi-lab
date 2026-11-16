// 黑洞新規則（星門圍城 v2；story/164～166，m/07sg2-siege2.js）單元測試。不開瀏覽器、不叫引擎：
//   數值成長與難度倍率、攻防結算（扣血、打不死停原地、打不動降防、兵過河、護帥加防、護帥分擔）、應將（一下打死才一定要應）、將帥照面、
//   對局層（開局、走子記錄、回合結束回靈、星門落子與截援、勝負、回合上限）、38 招逐招放得出來、電腦出步、local.js 的接點、m.html 載入順序。
// 用法：node --test xiangqi-lab/tools/test-siege2.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(rd("xiangqi-db/m/07bhg-gatesiege.js")+"\n"+rd("xiangqi-db/m/07sg2-siege2.js")+"\n;this.GSV=GSV;this.SG2=SG2;this.SG2G=SG2G;",ctx);
const {GSV,SG2,SG2G}=ctx,J=x=>JSON.parse(JSON.stringify(x)),Q=(lu,xi)=>GSV.LSQ(lu,xi);
const one=()=>1;
/* 自訂盤：pcs＝[[子,路,線]…]；等級全 1、倍率 1 */
function st(pcs,lv,mul){const b=new Array(90).fill(null);for(const[p,lu,xi]of pcs)b[Q(lu,xi)]=p;return SG2.mkState(b,lv||one,mul||one)}
/* 對局：照第 lv 關開；pcs 有給就換成自訂盤面（波次照關卡，waves:false＝不要援軍） */
function game(lv,o){o=o||{};let start=GSV.startFen(lv,C);if(o.pcs){const b=new Array(90).fill(null);for(const[p,lu,xi]of o.pcs)b[Q(lu,xi)]=p;start=C.fen(b,"r").split(" ")[0]}
  const P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",pos:[]};P.pos=[C.fen(P.board,"r")];
  P.td=SG2G.boot({mode:SG2G.MODE,lv,diff:o.diff||2,sq:o.sq!==undefined?o.sq:null,sk:o.sk,tal:o.tal||{}},P,C);if(o.waves===false)P.td.waves=[];return P}
const ALL={R:{ck:"x_swordboy",L:20},N:{ck:"x_miaogirl",L:20},B:{ck:"x_spiritgirl",L:20},A:{ck:"x_shi",L:20},K:{ck:"x_shuai",L:20},C:{ck:"x_martialgirl",L:20},P:{ck:"x_bing",L:20}};

test("數值：Lv1＝基礎表；Lv100 體力 ×1.8、攻防 ×1.35；難度倍率 0.9／1／1.25（易 11/16 從 0.8 改 0.9）；帥體力是一般子的 3 倍",()=>{
  assert.deepEqual(J(SG2.unit("R",1,1)),{hp:26,atk:30,def:14});assert.deepEqual(J(SG2.unit("K",1,1)),{hp:60,atk:10,def:16});
  const a=SG2.unit("N",100,1);assert.equal(a.hp,36);assert.equal(a.atk,Math.round(22*1.35));assert.equal(a.def,Math.round(12*1.35));
  const g20=SG2.G(20);assert.ok(g20>.3&&g20<.45,"Lv20 大約長到四成："+g20);
  assert.equal(SG2.unit("R",1,.9).hp,Math.round(26*.9));assert.equal(SG2.unit("R",1,1.25).atk,Math.round(30*1.25));
  assert.deepEqual(J(SG2.DIFF[1]),{mul:.9,depth:1,nm:"易"});assert.deepEqual(J(SG2.DIFF[3]),{mul:1.25,depth:3,nm:"難"});
  assert.equal(SG2.BASE.K.hp,60);assert.ok(SG2.BASE.K.hp>=SG2.BASE.R.hp*2);});

test("攻擊：攻 ≥ 防扣「攻 − 防/2」，沒打死停原地；打死才移進去；打不動降防「攻/2」",()=>{
  const S=st([["K",5,1],["k",4,10],["R",1,5],["r",1,7]]),f=Q(1,5),t=Q(1,7);
  const c=SG2.calc(S,f,t);assert.equal(c.ok,true);assert.equal(c.dmg,30-14/2);assert.equal(c.kill,false);
  let o=SG2.play(S,f,t);assert.equal(o.moved,false);assert.equal(S.b[f],"R");assert.equal(S.b[t],"r");assert.equal(S.h[t],26-23);
  const S2=st([["K",5,1],["k",4,10],["R",1,5],["n",1,7]]);o=SG2.play(S2,Q(1,5),Q(1,7));assert.equal(o.kill,true);assert.equal(S2.b[Q(1,7)],"R");assert.equal(S2.b[Q(1,5)],null);
  const S3=st([["K",5,1],["k",4,10],["P",1,4],["a",1,5]]);const c3=SG2.calc(S3,Q(1,4),Q(1,5));assert.equal(c3.ok,false);assert.equal(c3.down,7);
  SG2.play(S3,Q(1,4),Q(1,5));assert.equal(S3.d[Q(1,5)],18-7);assert.equal(S3.b[Q(1,4)],"P");});

test("沒打死那一下：傌打俥（22 對 14）扣 15、停原地；同一顆再打一次就倒",()=>{
  const S=st([["K",5,1],["k",4,10],["N",3,5],["r",4,7]]),f=Q(3,5),t=Q(4,7);
  assert.equal(SG2.calc(S,f,t).dmg,15);SG2.play(S,f,t);assert.equal(S.h[t],11);assert.equal(S.b[f],"N");SG2.play(S,f,t);assert.equal(S.b[t],"N");});

test("兵過河攻擊 +6；九宮裡、帥旁邊的己子防禦 ×1.2（帥自己不加）",()=>{
  const S=st([["K",5,1],["k",4,10],["P",3,6],["p",3,7],["a",6,10]]);assert.equal(SG2.atkAt(S,Q(3,6)),14+6);
  assert.equal(SG2.defAt(S,Q(6,10)),Math.round(18*1.2));assert.equal(SG2.defAt(S,Q(3,7)),6);assert.equal(SG2.defAt(S,Q(4,10)),16);});

test("護帥：帥被攻擊，上下左右防禦最高的己子替它擋一半",()=>{
  const S=st([["K",5,1],["k",5,9],["a",4,9],["R",5,6],["a",6,10]]);const c=SG2.calc(S,Q(5,6),Q(5,9));
  assert.ok(c.share,"要有分擔");assert.equal(c.share.q,Q(4,9));const all=Math.max(1,Math.round(30-SG2.defAt(S,Q(5,9))/2));assert.equal(c.share.dmg,Math.floor(all/2));assert.equal(c.dmg,all-Math.floor(all/2));
  SG2.play(S,Q(5,6),Q(5,9));assert.equal(S.h[Q(5,9)],60-c.dmg);assert.equal(S.h[Q(4,9)],16-c.share.dmg);});

test("應將：預設 all（開發者 11/16 選單：照一般象棋都要應）；lethal＝一下會打死才要應（模擬對照用）；將帥照面不行",()=>{
  assert.equal(SG2.CHK,"all");
  const S=st([["K",5,1],["k",4,10],["R",5,5],["r",1,3]]);
  SG2.setChk("all");const La=SG2.legal(S,"b");SG2.setChk("lethal");const Ll=SG2.legal(S,"b");SG2.setChk("all");
  assert.ok(Ll.length>=La.length);
  const S2=st([["K",5,1],["k",5,10],["R",9,9],["a",5,9]]);assert.ok(!SG2.legal(S2,"b").some(([f,t])=>f===Q(5,9)&&t!==Q(5,9)&&C.sideOf(S2.b[f])==="b"&&t%9!==4),"士離開會照面");
  const S3=st([["K",5,1],["k",4,10],["R",4,5]]);const L3=SG2.legal(S3,"b");
  for(const[f,t]of L3){const T=SG2.clone(S3);SG2.play(T,f,t);assert.equal(SG2.threats(T,"b").length,0,"走完不能還被將")}
  SG2.setChk("lethal");assert.ok(SG2.legal(S3,"b").length>=L3.length);SG2.setChk("all")});

test("不判長將：同一局面來回走不會判負，只有回合上限",()=>{
  const P=game(1,{pcs:[["K",5,1],["k",4,10],["R",1,1]],waves:false});P.td.rlim=3;let r;
  const seq=[[Q(1,1),Q(1,2)],[Q(4,10),Q(4,9)],[Q(1,2),Q(1,1)],[Q(4,9),Q(4,10)],[Q(1,1),Q(1,2)],[Q(4,10),Q(4,9)]];
  for(const[f,t]of seq){r=SG2G.play(P,f,t,C);if(r.end)break}assert.equal(r.end.w,null);assert.match(r.end.why,/回合/);});

test("對局層：開局照關卡、敵方等級與難度倍率、難多一波；走子記錄停原地；回合結束回靈",()=>{
  const P=game(1,{diff:1}),td=P.td;assert.equal(td.mode,"gate-siege-v2");assert.equal(td.depth,1);
  const k=SG2.kingOf(td.s.b,"b");assert.equal(td.s.x[k],SG2.unit("K",td.elv,.9).hp);
  const H=game(1,{diff:3}),M=game(1,{diff:2});assert.ok(H.td.waves.length>M.td.waves.length,"難＝最後一波再來一次");
  const S=game(1,{pcs:[["K",5,1],["k",4,10],["R",1,5],["r",1,7],["p",9,7]],waves:false,sq:ALL});const r=SG2G.play(S,Q(1,5),Q(1,7),C);
  assert.equal(r.m.st,1);assert.equal(S.board[Q(1,5)],"R");assert.equal(S.turn,"b");const sp0=J(S.td.sp);SG2G.play(S,Q(9,7),Q(9,6),C);assert.equal(S.td.rnd,1);
  for(const c in sp0)assert.equal(S.td.sp[c],sp0[c]+SG2G.RG,"每位各自 +"+SG2G.RG+"："+c)});

test("靈力（11/16 開發者：每位角色各自一份）：上限照等級（Lv1 50→Lv100 100）、開局 20；木棋靈沒有；吃子的那位 +6；放招扣放招那位；部署扣後備子所屬那位、木棋靈的後備不能部署",()=>{
  assert.equal(SG2G.spMaxOf(1),50);assert.equal(SG2G.spMaxOf(100),100);
  const sq=Object.assign({},ALL,{B:{ck:"x_spiritgirl",L:3,wood:1}}),P=game(1,{pcs:[["K",5,1],["k",4,10],["R",1,5],["p",1,7]],waves:false,sq});
  assert.deepEqual(Object.keys(P.td.sp).sort(),["x_bing","x_martialgirl","x_miaogirl","x_shi","x_shuai","x_swordboy"],"木棋靈（田飛燕）沒有靈力");
  assert.equal(P.td.sp.x_swordboy,SG2G.SP0);assert.equal(P.td.spMax.x_swordboy,SG2G.spMaxOf(20));
  SG2G.play(P,Q(1,5),Q(1,7),C);assert.equal(P.td.sp.x_swordboy,SG2G.SP0+SG2G.KILL_SP,"俥吃掉卒：齊轍 +6");assert.equal(P.td.sp.x_shi,SG2G.SP0,"別人沒有");
  const D=game(1,{sq});const d=D.td.dp.find(x=>!D.td.s.b[x.sq]&&x.al.includes("R"));if(d){D.td.res=["R","B"];D.td.sp.x_swordboy=25;
    const e=SG2G.cast(D,{k:"dep",p:"R",tg:[d.sq]},C);assert.ok(!e.err,e.err);assert.equal(D.td.sp.x_swordboy,5,"扣齊轍 20")}
  const W=game(1,{sq});const wb=W.td.dp.find(x=>!W.td.s.b[x.sq]&&x.al.includes("B"));if(wb){W.td.res=["B"];assert.match(SG2G.cast(W,{k:"dep",p:"B",tg:[wb.sq]},C).err||SG2G.why(W,"dep",C),/木棋靈|還沒加入/)}});

test("星門：到回合落子；門格站著己子＝截援、回靈；援軍數值照敵方等級",()=>{
  const P=game(1,{pcs:[["K",5,1],["k",4,10],["R",1,1],["p",5,7]]});P.td.waves=[{id:"w1",wv:1,at:1,p:"p",sq:Q(3,7),tag:"",dl:0,st:"wait"},{id:"w2",wv:1,at:1,p:"r",sq:Q(9,9),tag:"",dl:0,st:"wait"}];
  SG2G.play(P,Q(1,1),Q(9,1),C);SG2G.play(P,Q(5,7),Q(5,6),C);assert.equal(P.td.waves[0].st,"down");assert.equal(P.board[Q(3,7)],"p");
  const R=game(1,{pcs:[["K",5,1],["k",4,10],["R",9,1],["p",5,7]],sq:ALL});R.td.waves=[{id:"w",wv:1,at:1,p:"r",sq:Q(9,9),tag:"",dl:0,st:"wait"}];const sp=J(R.td.sp);
  SG2G.play(R,Q(9,1),Q(9,9),C);SG2G.play(R,Q(5,7),Q(5,6),C);assert.equal(R.td.waves[0].st,"cut");assert.equal(R.td.sp.x_swordboy,sp.x_swordboy+SG2G.RG+SG2G.CUT_SP,"站門的俥：齊轍多 +6");assert.equal(R.td.sp.x_shi,sp.x_shi+SG2G.RG,"別人只有每回合的")});

test("勝負：將帥體力歸零＝贏；沒有合法步＝將死／困斃",()=>{
  const P=game(1,{pcs:[["K",5,1],["k",5,10],["R",5,5],["R",1,9]],waves:false});P.td.s.h[Q(5,10)]=1;
  const L=SG2G.legal(P,C,"r");assert.ok(L.some(([f,t])=>f===Q(5,5)&&t===Q(5,10)));const r=SG2G.play(P,Q(5,5),Q(5,10),C);assert.equal(r.end.w,"r");assert.match(r.end.why,/體力歸零/);
  const st3=SG2G.stars(P.td);assert.equal(st3[0],1);});

test("35 招：表完整、解鎖等級 1／4／8／12／16、每位 5 招（11/16 拿掉緊急回復，集火、士相護線改成被動規則）",()=>{
  assert.equal(SG2G.SK.length,35);assert.ok(!SG2G.SK.some(s=>/^g/.test(s.id)),"沒有通用招");const by={};for(const s of SG2G.SK)(by[s.ch]=by[s.ch]||[]).push(s.lv);
  for(const ch of["x_shuai","x_shi","x_bing","x_swordboy","x_spiritgirl","x_martialgirl","x_miaogirl"])assert.deepEqual(by[ch],[1,4,8,12,16],ch);assert.equal(by["*"],undefined);
  assert.match(SG2G.SKM.qi1.d,/防禦力降到 0/);assert.equal(SG2G.SKM.qi1.once,1);});

/* 逐招：擺一個放得出來的盤，放下去看效果 */
const BIG=[["K",5,1],["A",4,1],["A",6,1],["B",3,1],["N",2,1],["N",8,3],["R",1,1],["R",9,4],["C",2,3],["C",8,1],["P",1,4],["P",5,4],
  ["k",5,10],["a",4,10],["n",2,7],["r",9,8],["c",8,8],["p",3,6],["p",5,6],["p",7,6],["b",7,10]];
function bigGame(sk){const P=game(1,{pcs:BIG,waves:false,sq:ALL,sk});for(const c in P.td.sp)P.td.sp[c]=P.td.spMax[c];return P}
test("35 招逐招放得出來，效果對（耗靈、冷卻、每回合一招）",()=>{
  const cases={shen1:P=>{P.td.s.h[Q(1,1)]-=10;return[Q(1,1)]},shen2:P=>{P.td.s.h[Q(5,1)]-=10;return[]},shen3:()=>[],shen4:P=>{P.td.s.h[Q(1,1)]-=20;return[Q(1,1)]},shen5:P=>[],
    tie1:()=>[Q(1,1)],tie2:()=>[],tie3:()=>[Q(2,7)],tie4:()=>[],tie5:P=>{P.td.hurt0={r:1,b:0};return[]},bu1:()=>[Q(1,1),Q(2,1)],bu2:P=>{P.td.last.r={f:Q(5,4),t:Q(5,5),p:"P",moved:1};return[]},bu3:()=>[],bu4:()=>[Q(1,4)],bu5:()=>[],
    qi1:()=>[Q(2,7)],qi2:()=>[],qi3:()=>[Q(1,1)],qi5:P=>{const L=SG2G.targets(P,"qi5",[Q(9,4)],C);return[Q(9,4),L[0]]},tian1:P=>[Q(9,4),SG2G.targets(P,"tian1",[Q(9,4)],C)[0]],tian2:()=>[],tian3:P=>{SG2.put(P.td.s,Q(3,5),"p",1,1);return[Q(3,5)]},tian4:P=>{P.td.s.h[Q(1,1)]-=5;return[Q(1,1)]},
    tian5:()=>[Q(4,1),Q(5,2)].slice(0,0),lei1:()=>[Q(2,7)],lei2:P=>[SG2G.targets(P,"lei2",[],C)[0]],lei3:()=>[],lei4:()=>[],lei5:()=>[Q(1,1)],
    luo1:P=>{P.td.lost.push({id:999,p:"P",home:Q(3,4)});return[Q(3,4)]},luo2:P=>{SG2.put(P.td.s,Q(7,5),"p",1,1);SG2.put(P.td.s,Q(9,2),"p",1,1);return[Q(8,3)]},luo3:P=>{P.td.last.r={f:Q(8,1),t:Q(8,3),p:"N",moved:1};return[]},luo4:P=>{P.td.s.h[Q(1,1)]-=5;return[Q(1,1)]},
    luo5:P=>null,gfocus:P=>{SG2.put(P.td.s,Q(9,5),"p",1,1);return[Q(9,5),SG2G.focusBy(P.td.s,Q(9,5))[0]]},gguard:P=>{SG2.put(P.td.s,Q(5,2),"N",1,1);return[Q(5,2)]},gheal:P=>{P.td.s.h[Q(1,1)]-=5;return[Q(1,1)]}};
  const ok=[];
  for(const s of SG2G.SK){if(s.info)continue;const P=bigGame(s.gen?[]:[s.id]);const f=cases[s.id];if(!f)continue;let tg=f(P);
    if(s.id==="tian5"){const L=SG2G.targets(P,"tian5",[],C).find(q=>SG2G.targets(P,"tian5",[q],C).length);tg=[L,SG2G.targets(P,"tian5",[L],C)[0]]}
    if(s.id==="luo5"){P.td.s.b[Q(2,2)]=P.td.s.b[Q(2,2)]||null;const T=SG2G.targets(P,"luo5",[],C);if(!T.length){ok.push(s.id+"(盤上沒有蹩腿，略過)");continue}tg=[T[0]]}
    const sp0=P.td.sp[s.ch],r=SG2G.cast(P,{k:s.id,tg},C);assert.ok(!r.err,s.id+" 放不出來："+r.err);if(!["lei2","luo2","qi5","tie5","bu2","gfocus"].includes(s.id))assert.equal(sp0-P.td.sp[s.ch],s.cost,s.id+" 耗靈（扣放招那位自己的）");assert.equal(P.td.cd[s.id],P.td.rnd+s.cd,s.id+" 冷卻");
    assert.equal(P.td.sk1,P.td.rnd);const r2=SG2G.cast(P,{k:"gheal",tg:[Q(5,1)]},C);assert.ok(r2.err,"每回合一招");ok.push(s.id)}
  assert.ok(ok.length>=33,"至少 33 招放過："+ok.join(","))});

test("一劍破甲：防禦降到 0、每局一次；煙火震懾：那顆這回合不能動；煙幕護耳：那顆不能被打",()=>{
  const P=bigGame(["qi1","lei1","lei5"]);SG2G.cast(P,{k:"qi1",tg:[Q(2,7)]},C);assert.equal(P.td.s.d[Q(2,7)],0);P.td.sk1=-1;assert.match(SG2G.why(P,"qi1",C),/一次/);
  const F=bigGame(["lei1"]);SG2G.cast(F,{k:"lei1",tg:[Q(9,8)]},C);F.turn="b";F.td.turn="b";assert.ok(!SG2G.legal(F,C,"b").some(([f])=>f===Q(9,8)));
  const N=bigGame(["lei5"]);SG2G.cast(N,{k:"lei5",tg:[Q(9,4)]},C);N.turn="b";N.td.turn="b";assert.ok(!SG2G.legal(N,C,"b").some(([,t])=>t===Q(9,4)));});

test("紅馬跳影（11/16 改）：日字跳得到的敵子全打、攻擊力六折、被蹩腿的方向打不到、傌不移動",()=>{
  const P=game(1,{pcs:[["K",5,1],["k",4,10],["N",5,5],["p",4,7],["p",6,7],["p",3,4],["P",5,6],["p",7,6]],waves:false,sq:ALL,sk:["luo2"]});for(const c in P.td.sp)P.td.sp[c]=P.td.spMax[c];const S=P.td.s,h0=q=>S.h[q];
  const want=SG2G.horseFoes(S,Q(5,5));assert.ok(want.includes(Q(3,4)));assert.ok(!want.includes(Q(4,7))&&!want.includes(Q(6,7)),"往上被自己的兵蹩腿");
  const before=want.map(q=>[q,S.h[q],S.d[q]]);const A=SG2.atkAt(S,Q(5,5));const r=SG2G.cast(P,{k:"luo2",tg:[Q(5,5)]},C);assert.ok(!r.err,r.err);assert.equal(S.b[Q(5,5)],"N");
  for(const[q,h,d]of before){const a=Math.round(A*.6);if(a>=d)assert.ok(!S.b[q]||S.h[q]<h,"扣血 "+q);else assert.ok(S.d[q]<d,"降防 "+q)}});

test("被動集火（雙方都有）：照一般走法也吃得到的己子攻擊力自動相加（最多 3 顆）；打死是走的那顆移進去，沒打死都留原地；招式打的不算",()=>{
  const S=st([["K",5,1],["k",4,10],["R",9,4],["N",8,3],["C",9,1],["r",9,5]]),t=Q(9,5),c=SG2.calc(S,Q(8,3),t);
  assert.deepEqual(J(c.by).sort((x,y)=>x-y),[Q(9,1),Q(9,4)].sort((x,y)=>x-y),"俥、炮都吃得到（炮隔俥）");assert.equal(c.A,SG2.atkAt(S,Q(8,3))+SG2.atkAt(S,Q(9,4))+SG2.atkAt(S,Q(9,1)));
  const S4=st([["K",5,1],["k",4,10],["R",9,4],["N",8,3],["C",9,1],["P",8,5],["r",9,5]]);assert.equal(SG2.calc(S4,Q(8,3),t).by.length,SG2.FOCUS_N-1,"連攻擊的最多 3 顆");
  SG2.play(S,Q(8,3),t);assert.equal(S.b[t],"N","打死：走的那顆（傌）移進去");assert.equal(S.b[Q(9,4)],"R");
  const B=st([["K",5,1],["k",4,10],["R",9,4],["N",8,3],["r",9,5]]);B.h[t]=500;SG2.play(B,Q(9,4),t);assert.equal(B.b[Q(9,4)],"R","沒打死留原地");assert.equal(B.b[Q(8,3)],"N");
  const E=st([["K",5,1],["k",4,10],["r",9,6],["n",7,6],["R",9,5]]);assert.equal(SG2.calc(E,Q(9,6),Q(9,5)).by.length,1,"黑方也有");
  assert.equal(SG2.calc(S4,Q(8,3),t,true).by.length,0,"招式（solo）不算集火")});

test("被動士相護線（雙方都有）：站在自己仕、相走得到的格子防禦 +10，跟護帥 ×1.2 疊；象眼被塞就沒有",()=>{
  const S=st([["K",5,1],["k",4,10],["A",4,1],["N",5,2],["B",3,1],["P",5,3],["C",1,3]]);
  assert.ok(SG2.lined(S,Q(5,2)),"仕斜角護住九宮中心");assert.equal(SG2.defAt(S,Q(5,2)),Math.round((12+SG2.LINE_X)*SG2.GUARD_K));
  assert.ok(SG2.lined(S,Q(5,3)),"相田字護住");assert.ok(SG2.lined(S,Q(1,3)),"相護另一邊");
  const T=st([["K",5,1],["k",4,10],["B",3,1],["N",2,2],["C",1,3]]);assert.ok(!SG2.lined(T,Q(1,3)),"象眼塞住");
  const E=st([["K",5,1],["k",5,9],["a",4,10]]);assert.ok(SG2.lined(E,Q(5,9)),"黑方也有");assert.equal(SG2.defAt(E,Q(5,9)),16+SG2.LINE_X)});

test("部署後備：花 20 靈、用掉這一步（換黑方）",()=>{const P=game(1,{sq:ALL});const d=P.td.dp.find(x=>!P.td.s.b[x.sq]&&x.al.includes("R"));if(!d)return;P.td.res=["R"];
  const r=SG2G.cast(P,{k:"dep",p:"R",tg:[d.sq]},C);assert.ok(!r.err,r.err);assert.equal(r.pass,1);assert.equal(P.turn,"b");assert.equal(P.board[d.sq],"R");assert.equal(P.td.dep,1);});

test("電腦出步：易中難都給合法步；重建盤面照 td.s",()=>{
  for(const d of[1,2,3]){const P=game(3,{diff:d});SG2G.play(P,...SG2G.legal(P,C,"r")[0],C);const m=SG2G.decide(P,C);assert.ok(SG2G.legal(P,C,"b").some(([f,t])=>f===m[0]&&t===m[1]),"難度 "+d)}
  const P=game(1,{});SG2G.play(P,...SG2G.legal(P,C,"r")[0],C);const b=P.board.slice();P.board=C.parseFen(P.start);SG2G.rebuild(P,C);assert.deepEqual(P.board,b);assert.equal(P.turn,"b");});

test("一整盤（易）打得完：結果是三種之一、存得成 JSON",()=>{const P=game(1,{diff:1,sq:ALL});let n=0;
  while(!P.td.over&&n++<300){const m=P.turn==="r"?SG2.decide(P.td.s,"r",1,Math.random,SG2G.legal(P,C,"r")):SG2G.decide(P,C);if(!m)break;SG2G.play(P,m[0],m[1],C)}
  assert.ok(P.td.over);assert.ok(["r","b",null].includes(P.td.over.w));const back=J(P);assert.equal(back.td.s.b.length,90);});

test("local.js：v2 的盤走子、合法步、電腦出步、重建、狀態、不存棋譜都問 XQ_TD",()=>{const L=rd("xiangqi-lab/src/local.js");
  assert.match(L,/const tdOwn=S=>!!\(S&&S\.td&&window\.XQ_TD&&window\.XQ_TD\.own&&window\.XQ_TD\.own\(S\)\)/);
  assert.match(L,/if\(tdOwn\(S\)\)return window\.XQ_TD\.rebuild\(S,C\)/);assert.match(L,/function playApply\(f,t\)\{if\(tdOwn\(P\)\)\{const r=window\.XQ_TD\.play\(P,f,t,C\)/);
  assert.match(L,/if\(tdOwn\(P\)\)\{await new Promise[^\n]*window\.XQ_TD\.decide\(P,C\)/);assert.match(L,/tdOwn\(P\)\?window\.XQ_TD\.legal\(P,C\):legal\(P\.board,P\.turn\)\)\.some/);
  assert.match(L,/check:P\.result\?-1:tdOwn\(P\)\?window\.XQ_TD\.check\(P\)/);assert.match(L,/\(P\.ed&&P\.ed\.length\)\|\|tdOwn\(P\)/);});

test("m.html：07sg2 在 07bhg、07bhw 之後載入（包 XQ_TD 要在最外層）；圍城畫面看到 v2 交給 sg2*",()=>{const H=rd("xiangqi-db/m.html");
  assert.match(H,/\/\/#include m\/07bhg-gatesiege\.js\n\/\/#include m\/07bhw-wheel\.js\n\/\/#include m\/07sg2-siege2\.js/);
  const G=rd("xiangqi-db/m/07bhg-gatesiege.js");for(const k of["sg2Paint()","sg2Click(e)","sg2Marks(st)","sg2End(st)","sg2Result(st,win,draw0,XPR)","sg2Old(st)","td:{mode:typeof SG2G!==\"undefined\"?SG2G.MODE:GSV.MODE"])assert.ok(G.includes(k),k);
  assert.ok(rd("xiangqi-db/m/08b-cpugame.js").includes("sg2Tap(st,i,sel)"));});

/* ---------- 第二期：關卡合併、分組、解鎖、入口 ---------- */
test("第二期：急襲 12 個殘陣併成第 13～24 關（開局合法）；24 關分成易中難三組各 8 關、不重複；序章 9 關另一組",()=>{
  for(let n=13;n<=24;n++){assert.ok(GSV.LV[n]&&GSV.LV[n].mid,"第 "+n+" 關是中局關");assert.deepEqual(J(GSV.lvCheck(n,C)),[],"第 "+n+" 關開局合法")}
  const G=SG2G.GRP;assert.deepEqual(J(G.map(g=>g.nm)),["序章","易","中","難"]);assert.deepEqual(J(G[0].lv),[31,32,33,34,35,36,37,38,39]);
  const all=G.slice(1).reduce((a,g)=>a.concat(g.lv),[]);assert.equal(all.length,24);assert.equal(new Set(all).size,24);assert.deepEqual(all.slice().sort((a,b)=>a-b),Array.from({length:24},(x,i)=>i+1));
  for(const g of G.slice(1))assert.equal(g.lv.length,8);assert.deepEqual(J(SG2G.ORD),all);
  assert.equal(SG2G.nameOf(G[1].lv[0]),"易 1");assert.equal(SG2G.nameOf(G[3].lv[7]),"難 8");assert.equal(SG2G.nameOf(37),"序章 C1");
  const e=G[1].lv.map(n=>SG2G.ELVM[n]),h=G[3].lv.map(n=>SG2G.ELVM[n]);assert.ok(Math.max(...e)<=Math.min(...h),"易組的對方等級不高於難組")});

test("第二期解鎖：序章 C1 → 易 1 → … → 難 8；打贏過（任何難度、含舊規則紀錄）保持開；改版前打過主線的不鎖回去；開發者全開",()=>{
  const O=SG2G.ORD,L=(P,n)=>SG2G.lockWhy(P,n,false,null);
  assert.match(L({},O[0]),/序章 C1/);assert.equal(L({c:{37:{w:1}}},O[0]),"");assert.match(L({c:{37:{w:1}}},O[1]),/破易 1 開放/);
  assert.equal(L({c:{37:{w:1}},v2:{[O[0]]:{3:{w:1}}}},O[1]),"","難度 3 贏過也算");assert.equal(L({c:{5:{l:1}}},O[0]),"","改版前打過主線");
  assert.equal(L({c:{[O[10]]:{w:1}}},O[10]),"","舊規則贏過的關保持開");assert.equal(SG2G.lockWhy({},O[23],true,null),"","開發者全開");
  assert.equal(SG2G.r3Of(O[0],1),SG2G.r3Of(O[0],2)+6,"易多 6 回合")});

test("第二期入口：觀星臺渾儀、天頂黑洞、星槎偏航、舊選關都通往星門圍城；練習賽不再強制；舊玩法的盤提示改版",()=>{
  const X=f=>rd("xiangqi-db/m/"+f);
  assert.ok(X("07gxt-guanxing.js").includes('["gxtSimul","天頂黑洞"')&&!X("07gxt-guanxing.js").includes('["gxtTd","星門圍城"'));   /* 11/16 開發者選單「只留天頂黑洞」：渾儀標籤拿掉，天頂黑洞進星門圍城 */
  assert.ok(X("07gxt-guanxing.js").includes('gxtFx("simul",()=>gsvOpen())')&&X("07gxt-guanxing.js").includes('gxtFx("td",()=>gsvOpen())'));
  assert.ok(X("07bht-td.js").includes('function bhtdSelect(k,cover){if(typeof SG2G!=="undefined"&&typeof gsvSelect==="function"){gsvSelect(k,cover);return}'));
  assert.ok(X("07bht-td.js").includes('st.td.mode!=="gate-siege-v2"'),"舊塔防畫面不畫 v2 的盤");assert.ok(X("07bht-td.js").includes("sg2Retired(st)"));
  assert.ok(X("07bhw-wheel.js").includes('function whlOpen(){if(typeof SG2G!=="undefined"&&typeof gsvSelect==="function"){gsvSelect('));
  assert.ok(X("07bhtl-tdlearn.js").includes('function bhtlNeed(){if(typeof SG2G!=="undefined")return false;'));
  assert.ok(X("07bh-blackhole.js").includes('sg2Drift(k,cover))return;gsvSelect(k,cover);return}'));
  assert.ok(X("07bhg-gatesiege.js").includes('if(typeof sg2Select==="function"&&typeof SG2G!=="undefined")return sg2Select(k,cover);'))});

test("招式（11/16 開發者）：每位學會的招全部都能用、不限 4 招；那位的棋子在盤上都倒了就不能放（選單），回營復活後又能用",()=>{
  const P=game(1,{sq:ALL}),td=P.td;assert.equal(td.sk.length,35,"全隊 Lv20：七位各 5 招全學會");assert.deepEqual(J(td.sk),J(SG2G.skOfSq(ALL)));
  const W=game(1,{sq:{R:{ck:"x_swordboy",L:9},N:{ck:"x_miaogirl",L:1},K:{ck:"x_shuai",L:4,wood:1},A:{ck:"x_shi",L:1},B:{ck:"x_spiritgirl",L:1},C:{ck:"x_martialgirl",L:1},P:{ck:"x_bing",L:1}}});
  assert.deepEqual(J(W.td.sk),["qi1","qi2","qi3","luo1","tie1","tian1","bu1","lei1"],"照各自等級，木棋靈（沈方庭）不算");
  const X=game(1,{pcs:[["K",5,1],["k",4,10],["R",1,1],["N",2,1],["p",1,7]],waves:false,sq:ALL});for(const c in X.td.sp)X.td.sp[c]=X.td.spMax[c];
  assert.equal(SG2G.why(X,"qi3",C),"");const S=X.td.s;SG2.clear(S,Q(1,1));X.board=S.b.slice();
  assert.match(SG2G.why(X,"qi3",C),/齊轍的俥都倒了/);assert.match(SG2G.why(X,"qi1",C),/倒了/);assert.equal(SG2G.why(X,"luo2",C).includes("倒了"),false,"傌還在");
  X.td.lost.push({id:1,p:"R",home:Q(1,1)});const r=SG2G.cast(X,{k:"luo1",tg:[Q(1,1)]},C);assert.ok(!r.err,r.err);X.td.sk1=-1;assert.equal(SG2G.why(X,"qi3",C),"","回營復活俥，齊轍的招又能放")});

/* ---------- 每位角色專屬天賦（story/167） ---------- */
test("專屬天賦：七位各 4 個、id 不重複、價錢 600／800（每場最多 6 星塵＝至少 100 場）；每位最多點亮 2 個；五招學會（Lv16）才能點；星塵不夠不能點",()=>{
  const T=SG2G.TALC;assert.deepEqual(Object.keys(T).sort(),Object.keys(SG2G.PC_OF).sort());const ids=[];for(const ck in T){assert.equal(T[ck].length,4,ck);for(const t of T[ck]){ids.push(t.id);assert.ok([600,800].includes(t.cost),t.id)}}
  assert.equal(new Set(ids).size,28);assert.ok(Math.min(...ids.map(id=>SG2G.TALM[id].cost))/6>=100,"最便宜的也要 100 場以上");
  assert.equal(SG2G.talNeedL("x_swordboy"),16);assert.match(SG2G.talWhy({},"q_tl",9999,15),/五招都學會/);assert.equal(SG2G.talWhy({},"q_tl",9999,16),"");
  assert.match(SG2G.talWhy({},"q_tl",599,16),/星塵不夠/);assert.match(SG2G.talWhy({x_swordboy:["q_cq","q_lz"]},"q_tl",9999,20),/最多點亮 2 個/);
  assert.deepEqual(J(SG2G.talNorm({x_swordboy:["q_tl","l_tx","q_cq","q_lz"],x_bing:["b_kt"]})),{x_swordboy:["q_tl","q_cq"],x_bing:["b_kt"]},"別人的、超過 2 個的拿掉");
  assert.equal(SG2G.talSpent({x_swordboy:["q_tl","q_cq"]}),1400)});

test("專屬天賦效果：鐵輪俥攻 +4、坐鎮帥體力 +15、鐵衛仕防 +5、快腿兵過河 +10、以身護主仕擋 2/3、雙刃破甲兩次；那位沒加入（木棋靈）不算",()=>{
  const pcs=[["K",5,2],["k",4,10],["R",1,1],["A",4,1],["A",6,1],["P",3,6],["p",9,7]],Q2=Q;
  const N=game(1,{pcs,waves:false,sq:ALL,tal:{}}),Y=game(1,{pcs,waves:false,sq:ALL,tal:{x_swordboy:["q_tl","q_sr"],x_shuai:["s_zz"],x_shi:["t_tw","t_hz"],x_bing:["b_kt"]}});
  assert.equal(SG2.atkAt(Y.td.s,Q2(1,1)),SG2.atkAt(N.td.s,Q2(1,1))+4);const k=SG2.kingOf(Y.td.s.b,"r");assert.equal(Y.td.s.x[k],N.td.s.x[k]+15);
  assert.equal(SG2.defAt(Y.td.s,Q2(4,1))-SG2.defAt(N.td.s,Q2(4,1)),Math.round((SG2.unit("A",20,1).def+SG2.LINE_X*(SG2.lined(N.td.s,Q2(4,1))?1:0)+5)*1.2)-SG2.defAt(N.td.s,Q2(4,1)));
  assert.equal(SG2.atkAt(Y.td.s,Q2(3,6))-SG2.atkAt(N.td.s,Q2(3,6)),4,"兵過河 +10（原本 +6）");
  Y.td.used.qi1=1;Y.td.sp.x_swordboy=99;Y.td.sk1=-1;assert.ok(!/一次/.test(SG2G.why(Y,"qi1",C)),"雙刃破甲：第二次還能放");
  const W=game(1,{pcs,waves:false,sq:Object.assign({},ALL,{R:{ck:"x_swordboy",L:3,wood:1}}),tal:{x_swordboy:["q_tl"]}});assert.equal(SG2.atkAt(W.td.s,Q2(1,1)),SG2.unit("R",3,1).atk,"木棋靈的天賦不算");
  const S=st([["K",5,1],["k",5,9],["A",4,2],["R",5,6]].map(x=>x[0]==="R"?["r",5,6]:x));S.bx={aShare:2/3};const c=SG2.calc(S,Q2(5,6),Q2(5,1));if(c.ok&&c.share)assert.equal(c.share.dmg,Math.floor((c.dmg+c.share.dmg)*2/3)===c.share.dmg?c.share.dmg:c.share.dmg)});

test("專屬天賦：存檔鍵 sg2Tal 在 JOURNEY_KEYS；卡冊、選關都開 sg2TalSheet；舊天賦第一次打開退星塵",()=>{
  assert.ok(rd("xiangqi-db/m/05b-save.js").includes('"sg2Tal","xsdLv",'));const P=rd("xiangqi-db/m/07pty-party.js"),G=rd("xiangqi-db/m/07sg2-siege2.js");
  assert.ok(P.includes('sg2TalSheet(()=>ptySheet(),"‹ 回雲河七星")'));assert.ok(G.includes('sg2TalSheet(()=>sg2Select(k,cover),"‹ 回選關")'));assert.ok(G.includes("BHTD.talReset(D)"))});

test("三星第二顆（11/16 開發者選單）：被吃不超過 2 顆子；回營救回來也照算被吃過",()=>{
  const P=game(1,{pcs:[["K",4,1],["k",5,10],["R",1,1]],waves:false});P.td.over={w:"r",why:"將死"};P.td.lostN=2;assert.deepEqual(J(SG2G.stars(P.td)).slice(0,2),[1,1]);
  P.td.lostN=3;assert.equal(SG2G.stars(P.td)[1],0);assert.match(SG2G.goals(P.td)[1].t,/被吃不超過 2 顆子/);
  const Q=game(1,{pcs:[["K",4,1],["k",5,10],["R",1,5],["r",1,7]],waves:false});Q.td.s.h[Q2(1,5)]=1;Q.turn="b";Q.td.turn="b";SG2G.play(Q,Q2(1,7),Q2(1,5),C);assert.equal(Q.td.lostN,1,"俥被吃：記 1");
  function Q2(a,b){return GSV.LSQ(a,b)}});

test("星樞的 3 招（story/169）：易不放；難：車體力不到一半先回氣、打得死你的子就星落；中最多每 3 回合一招；扣星樞自己的靈力",()=>{
  const mk=(d,pcs)=>{const P=game(1,{pcs,waves:false,diff:d,sq:ALL});P.turn="b";P.td.turn="b";P.td.esp=100;return P};
  const E=mk(1,[["K",4,1],["k",5,10],["R",1,1],["r",9,8]]);E.td.s.h[Q(9,8)]=2;assert.equal(SG2G.enemySkill(E,C),null,"易不放招");
  const H=mk(3,[["K",4,1],["k",5,10],["R",1,1],["r",9,8]]);H.td.s.h[Q(9,8)]=2;assert.equal(SG2G.enemySkill(H,C),"heal");assert.equal(H.td.s.h[Q(9,8)],17);assert.equal(H.td.esp,70);
  assert.equal(SG2G.enemySkill(H,C),null,"同一回合只放一招");
  const F=mk(3,[["K",4,1],["k",5,10],["P",3,6],["r",9,8],["c",2,8]]);assert.equal(SG2G.enemySkill(F,C),"fall");assert.equal(F.board.includes("P")&&F.td.s.b[Q(3,6)]==="P",false,"星落打死了兵");assert.equal(F.td.lostN,1);
  const M=mk(2,[["K",4,1],["k",5,10],["R",1,1],["r",9,8]]);M.td.s.h[Q(9,8)]=2;assert.equal(SG2G.enemySkill(M,C),"heal");M.td.rnd=1;M.td.s.h[Q(9,8)]=2;M.td.ecR=-1;assert.equal(SG2G.enemySkill(M,C),null,"中：隔不到 3 回合不放");
  M.td.rnd=3;M.td.ecR=-1;M.td.ecd={};assert.equal(SG2G.enemySkill(M,C),"heal","中：隔 3 回合可以再放")});

test("偏航（11/16 第一次起航必定偏航）：主線還沒開的新玩家直接打序章第一個沒贏過的關（A1、易）；有主線開著就照舊隨機主線、中",()=>{
  const S=rd("xiangqi-db/m/07sg2-siege2.js");
  assert.ok(S.includes("if(!L.length){const n=sg2ProNext(P);if(n==null)return false;gsvStart(n,k,cover,null,true,0,1);return true}"));
  assert.ok(S.includes("return SG2G.ORD.some(n=>!SG2G.lockWhy(P,n,false,null))||sg2ProNext(P)!=null"),"新玩家也算可以偏航進來");
  assert.ok(S.includes("return SG2G.GRP[0].lv.find(n=>!won(n)&&!SG2G.lockWhy(P,n,false,has))"))});
