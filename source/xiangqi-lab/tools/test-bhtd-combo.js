// 黑洞塔防爽度第一批（開發者 11/14 選定，story/黑洞塔防爽度_Gemini提案與審查_1114.md）：連擊規則單元測試。
//   ① 純函式：comboOf（奇謀連擊 ×2、陣眼貫穿、單次上限 12）、chkDmg（連環逼宮 5 → 7，中斷重算）；
//   ② 接進 BHTD.move／cast：放招標記敵子後同回合吃掉＝多扣 2、回 1 靈；陣眼子吃破甲目標＝多扣 1；連兩回合將軍＝7；
//   ③ 不改象棋規則：連擊只動元氣與靈力，盤面、子數、走法照舊。
// 用法：node --test xiangqi-lab/tools/test-bhtd-combo.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const SRC=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07bht-td.js"),"utf8");
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(SRC+"\n;this.BHTD=BHTD;",ctx);const B=ctx.BHTD;
const J=x=>JSON.parse(JSON.stringify(x));
/* 自訂開局：照 test-bhtd-rules 的 game()，只是盤面換成指定的 FEN（關卡設定照第 1 關） */
function custom(fen,o){o=o||{};const P={start:fen,startTurn:"r",board:C.parseFen(fen),turn:"r",moves:[],human:"r"};P.pos=[C.fen(P.board,"r")];
  P.td=B.boot({lv:1,ch:o.ch||"x_swordboy",L:o.L||1,diff:2,sk:o.sk},P,C);return P}
const mv=(P,f,t)=>{const m=C.stateApply(P,f,t);return B.move(P,m,C)};
const sq=(r,c)=>r*9+c;
const lastHit=P=>J(P.td.ev.filter(e=>e.k==="hit"&&e.sd==="b").slice(-1)[0]||null);

test("comboOf：奇謀連擊 ×2 多扣 2、回 10 靈；陣眼貫穿多扣 1；兩個都有＝多扣 3", ()=>{
  assert.deepEqual(J(B.comboOf({base:5})),{n:5,sp:0,k:"",bonus:0},"沒有連擊＝原本的數字");
  assert.deepEqual(J(B.comboOf({base:5,mk:true})),{n:7,sp:10,k:"qm",bonus:2});
  assert.deepEqual(J(B.comboOf({base:6,eye:true,pj:true})),{n:7,sp:0,k:"pierce",bonus:1});
  assert.deepEqual(J(B.comboOf({base:4,eye:true,pj:true,mk:true})),{n:7,sp:10,k:"qm+pierce",bonus:3});
  assert.equal(B.comboOf({base:6,eye:true}).bonus,0,"陣眼子吃沒破甲的子不算貫穿");assert.equal(B.comboOf({base:6,pj:true}).bonus,0,"破甲目標被別的子吃不算貫穿");
});

test("comboOf：單次扣元氣上限 12 照舊；原本就 13（12＋破甲）的不會因為連擊變少", ()=>{
  assert.equal(B.CAPMAX,12);
  assert.equal(B.comboOf({base:11,mk:true}).n,12,"11＋2 封頂 12");assert.equal(B.comboOf({base:11,mk:true}).bonus,1);
  assert.equal(B.comboOf({base:12,mk:true}).n,12,"已經 12：連擊不再加");assert.equal(B.comboOf({base:12,mk:true}).sp,10,"靈力照回（11/14 晚 ×10）");
  assert.equal(B.comboOf({base:13,eye:true,pj:true,mk:true}).n,13,"capDmg 的 12＋破甲 1 維持原本的 13");
  for(let b=0;b<=12;b++)for(const mk of[false,true])for(const e of[false,true])assert.ok(B.comboOf({base:b,mk,eye:e,pj:e}).n<=Math.max(12,b),"base "+b);
});

test("chkDmg：連兩回合將軍起 5 → 7；中斷一回合就回到 5", ()=>{
  assert.deepEqual(J(B.chkDmg(-9,0)),{n:5,chain:false});assert.deepEqual(J(B.chkDmg(2,3)),{n:7,chain:true});assert.deepEqual(J(B.chkDmg(1,3)),{n:5,chain:false});
  assert.deepEqual(J(B.chkDmg(3,3)),{n:5,chain:false},"同一回合不算連環");assert.ok(B.chkDmg(5,6).n<=12);
});

test("奇謀連擊（接 move／cast）：雷借花放煙火震懾定住卒，同回合俥吃掉它＝多扣 2、回 10 靈（擒子本身 +10，共 +20）", ()=>{
  const P=custom("3ak4/9/9/9/9/2p6/9/2R6/9/3K5 w",{ch:"x_martialgirl",sk:["lei1"]}),q=sq(5,2);P.td.me.sp=50;const n0=P.board.filter(Boolean).length;
  const r=B.cast(P,{k:"lei1",tg:[q]},C);assert.ok(r&&r.ok,JSON.stringify(r));assert.deepEqual(J(P.td.cmb),{r:0,tags:["b"+q]},"標記被點名的卒");
  assert.equal(P.td.me.sp,30);const h0=P.td.en.hp;mv(P,sq(7,2),q);
  const e=lastHit(P);assert.equal(e.combo,"qm");assert.equal(e.n,B.capDmg("p","R",P.td.me.atk,false,false)+2);assert.equal(h0-P.td.en.hp,e.n);
  assert.equal(P.td.me.sp,50,"擒子 +10、奇謀連擊再 +10");assert.equal(P.td.cmb,null,"用掉就清掉");
  assert.equal(P.board.filter(Boolean).length,n0-1,"盤面只少了被吃的那顆（不生子、不移位）");
});

test("奇謀連擊：要同一回合；放招標記後隔一回合才吃＝沒有連擊", ()=>{
  const P=custom("3ak4/9/9/9/9/2p6/9/2R6/9/3K5 w",{ch:"x_martialgirl",sk:["lei1"]}),q=sq(5,2);P.td.me.sp=50;
  assert.ok(B.cast(P,{k:"lei1",tg:[q]},C).ok);P.td.rnd=1;   /* 假裝過了一回合 */
  mv(P,sq(7,2),q);const e=lastHit(P);assert.equal(e.combo,"");assert.equal(e.n,B.capDmg("p","R",P.td.me.atk,false,false));
});

test("陣眼貫穿（接 move）：齊轍的陣眼俥吃掉破甲的卒＝原本（陣眼 ×1.5＋破甲 1）再多扣 1", ()=>{
  const P=custom("3ak4/9/9/9/9/8p/9/9/9/3K4R w",{ch:"x_swordboy"}),q=sq(5,8);assert.equal(P.td.eye,"r89");P.td.pj.push(P.td.pid[q]);
  const base=B.capDmg("p","R",P.td.me.atk,true,true);mv(P,89,q);const e=lastHit(P);
  assert.equal(e.combo,"pierce");assert.equal(e.n,Math.min(12,base+1));assert.equal(e.eye,1);assert.equal(e.pj,1);assert.equal(e.why,"陣眼擒子");
});

test("弱吃強、連續擒子：事件帶棋種（演出用），兵吃俥標 weak；連兩回合擒子 streak＝2", ()=>{
  const P=custom("3ak4/9/9/9/9/2r6/2P6/9/9/3K5 w",{ch:"x_bing"});mv(P,sq(6,2),sq(5,2));let e=lastHit(P);
  assert.equal(e.cp,"P");assert.equal(e.vp,"R");assert.equal(e.weak,1);assert.equal(e.streak,1);
  const Q=custom("3ak4/9/9/9/9/2p6/9/2R6/9/3K5 w");mv(Q,sq(7,2),sq(5,2));e=lastHit(Q);assert.equal(e.weak,0,"俥吃卒不是弱吃強");
  Q.turn="r";Q.td.rnd=1;Q.td.capR=0;Q.td.capN=1;Q.board[sq(4,2)]="p";Q.td.pid[sq(4,2)]="b"+sq(4,2);mv(Q,sq(5,2),sq(4,2));e=lastHit(Q);assert.equal(e.streak,2,"連著兩回合擒子");
});

test("連環逼宮（接 move）：俥連兩回合將軍，第二次扣 7；中間停一回合沒將軍，再將軍回到 5", ()=>{
  const P=custom("4k4/9/9/9/9/R8/9/9/9/5K3 w");const hp=()=>P.td.en.hp;
  let h=hp();mv(P,sq(5,0),sq(5,4));let e=lastHit(P);assert.equal(e.why,"將軍");assert.equal(h-hp(),5);
  mv(P,sq(0,4),sq(0,3));h=hp();mv(P,sq(5,4),sq(5,3));e=lastHit(P);assert.equal(e.why,"連環逼宮");assert.equal(e.chain,1);assert.equal(h-hp(),7);
  mv(P,sq(0,3),sq(0,4));mv(P,sq(9,5),sq(8,5));mv(P,sq(0,4),sq(1,4));h=hp();mv(P,sq(5,3),sq(5,4));e=lastHit(P);assert.equal(e.why,"將軍","中斷一回合");assert.equal(h-hp(),5);
});

test("舊盤（沒有連擊欄位）讀進來照樣能走：tdFix 補上 cmb／ckR／capR／capN", ()=>{
  const P=custom("4k4/9/9/9/9/R8/9/9/9/5K3 w");for(const k of["cmb","ckR","capR","capN"])delete P.td[k];
  const h=P.td.en.hp;mv(P,sq(5,0),sq(5,4));assert.equal(h-P.td.en.hp,5);assert.equal(P.td.ckR,0);
});
