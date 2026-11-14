// 黑洞塔防爽度第二批（開發者 11/14 選定，story/黑洞塔防爽度_Gemini提案與審查_1114.md 第三節；照第二節 Claude 修正版）單元測試，不開瀏覽器、不跑引擎：
//   ① 天賦樹（m/07bht-td.js BHTD.TAL）：7 節點 4 層共 240 星塵、上一層至少一個才能點下一層、全部重置全退；七個天賦接進規則（只動元氣、靈力、破甲，不動盤面）
//   ② 結算：三星、差一點、星塵（主線 3～6＋首通＋三星首達、守關多 4；急襲 6～10）、標題評語（落敗「星局未竟・重整旗鼓」、不提化墨退場）、七星「再來一場」
//   ③ 星淵急襲模板：全部過開局合法檢查（只減子不加子、不照面、沒人被將、兵卒位置合法、紅方七種子都有）、不是一開局就必輸必贏、四種星門變化開得起來、跑幾回合不出錯
//   ④ 接線：存檔鍵 bhtdDust、急襲不給修為、定軌力入口鎖、英文字典
// 用法：node --test xiangqi-lab/tools/test-bhtd-r2.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../.."),M=path.join(ROOT,"xiangqi-db/m");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=f=>fs.readFileSync(path.join(ROOT,f),"utf8").replace(/\r\n/g,"\n");
const SRC=rd("xiangqi-db/m/07bht-td.js");
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(SRC+"\n;this.BHTD=BHTD;",ctx);const B=ctx.BHTD;
const J=x=>JSON.parse(JSON.stringify(x)),sq=(r,c)=>r*9+c;
function custom(fen,o){o=o||{};const P={start:fen,startTurn:"r",board:C.parseFen(fen),turn:"r",moves:[],human:"r"};P.pos=[C.fen(P.board,"r")];
  P.td=B.boot(Object.assign({lv:1,ch:"x_swordboy",L:1,diff:2},o),P,C);return P}
const mv=(P,f,t)=>{const m=C.stateApply(P,f,t);return B.move(P,m,C)};
function quiet(P,side){const L=C.legal(P.board,side).filter(([f,t])=>!P.board[t]);for(const[f,t]of L){const x=C.make(P.board,f,t);if(!C.inCheck(x,side==="r"?"b":"r"))return[f,t]}return L[0]}
function round(P){let e=mv(P,...quiet(P,"r"));if(e)return e;return mv(P,...quiet(P,"b"))}

/* ====================== ① 天賦樹 ====================== */
test("天賦樹：7 節點、4 層、花費 20／20／35／35／40／40／50＝240；名稱照開發者選定", ()=>{
  assert.equal(B.TAL.length,7);assert.equal(B.TAL_ALL,240);
  assert.deepEqual(J(B.TAL.map(x=>[x.id,x.t,x.nm,x.cost])),[["xhcr",1,"星火初燃",20],["htgy",1,"厚土固元",20],["fmbl",2,"鋒芒畢露",35],["xzht",2,"星陣護體",35],["qmls",3,"奇謀連鎖",40],["cyhw",3,"赤焰火網",40],["qxgm",4,"七星共鳴",50]]);
  for(const x of B.TAL)assert.ok(x.d&&x.d.length<=36,"說明白話短句："+x.d);
  assert.ok(!/機率|隨機|%/.test(B.TAL.map(x=>x.d).join("")),"七星共鳴改固定，不用隨機");
});

test("天賦樹：上一層至少一個才能點下一層；星塵不夠不能點；點過不能再點；不合法的存檔自動拿掉", ()=>{
  assert.equal(B.talWhy([],"xhcr",20),null);assert.equal(B.talWhy([],"fmbl",999),"先點亮上一層的一個天賦");assert.equal(B.talWhy(["xhcr"],"fmbl",34),"星塵不夠（要 35）");
  assert.equal(B.talWhy(["xhcr"],"xhcr",99),"已經點亮了");assert.equal(B.talWhy([],"nope",99),"沒有這個天賦");
  assert.equal(B.talWhy(["htgy","xzht"],"cyhw",40),null,"第 1 層、第 2 層各有一個就能點第 3 層");assert.equal(B.talWhy(["htgy"],"qxgm",999),"先點亮上一層的一個天賦");
  assert.deepEqual(J(B.talValid(["qxgm","qmls","fmbl"])),[],"沒有第 1 層，上面全拿掉");assert.deepEqual(J(B.talValid(["fmbl","xhcr","xhcr","zz"])),["xhcr","fmbl"]);
  assert.deepEqual(J(B.talValid("x")),[]);assert.deepEqual(J(B.talValid(null)),[]);
  const o={d:100,t:[]};assert.equal(B.talBuy(o,"fmbl").ok,false);assert.equal(o.d,100);
  assert.equal(B.talBuy(o,"xhcr").ok,true);assert.equal(o.d,80);assert.equal(B.talBuy(o,"fmbl").ok,true);assert.equal(o.d,45);assert.deepEqual(J(o.t),["xhcr","fmbl"]);
  const r=B.talBuy(o,"qmls");assert.equal(r.ok,true);assert.equal(o.d,5);assert.equal(B.talBuy(o,"cyhw").why,"星塵不夠（要 40）");
});

test("天賦樹：全部重置星塵全退（免費、可以重複）；全點亮剛好 240", ()=>{
  const o={d:240,t:[]};for(const x of B.TAL)assert.equal(B.talBuy(o,x.id).ok,true,x.id);assert.equal(o.d,0);assert.equal(B.talSpent(o.t),240);
  assert.equal(B.talReset(o),240);assert.equal(o.d,240);assert.deepEqual(J(o.t),[]);assert.equal(B.talReset(o),0);assert.equal(o.d,240,"再重置一次不會多拿");
});

/* 天賦接進規則 */
const KFEN="4k4/9/9/9/9/9/9/9/9/3K5";   /* 只有兩個將（不同路，不照面） */
test("星火初燃：開局靈力 +10（照樣不超過上限）；厚土固元：元氣上限 +8、開局滿；練習賽不帶天賦", ()=>{
  const a=custom(KFEN).td,b=custom(KFEN,{tal:["xhcr","htgy"]}).td;
  assert.equal(b.me.sp,a.me.sp+10);assert.equal(b.me.max,a.me.max+8);assert.equal(b.me.hp,b.me.max);
  for(const ck of Object.keys(B.CH))assert.equal(custom(KFEN,{ch:ck,tal:["htgy"]}).td.me.max,B.stats(ck,1).hp+8,"每位都 +8（鐵連城也有效）："+ck);
  const full=custom(KFEN,{xm:90,tal:["xhcr"]}).td;assert.equal(full.me.sp,full.me.spMax,"不超過靈力上限");
  const P={board:C.parseFen(B.startFen("tl",C)),turn:"r",moves:[],pos:[]};const tl=B.boot({lv:"tl",ch:"x_swordboy",L:1,tal:["xhcr","htgy"]},P,C);assert.deepEqual(J(tl.tal),[],"練習賽照劇本");
  assert.equal(tl.me.max,B.stats("x_swordboy",1).hp);
  assert.deepEqual(J(custom(KFEN,{tal:["qxgm"]}).td.tal),[],"跳層的天賦不生效");
});

test("天賦不動盤面：點亮全部天賦，開局、星門波次（16 子）、合法走法都一樣", ()=>{
  for(let n=1;n<=B.LV.length;n++){const s=B.startFen(n,C),P1={start:s,board:C.parseFen(s),turn:"r",moves:[],pos:[]},P2={start:s,board:C.parseFen(s),turn:"r",moves:[],pos:[]};
    const a=B.boot({lv:n,ch:"x_bing",L:30},P1,C),b=B.boot({lv:n,ch:"x_bing",L:30,tal:B.TAL.map(x=>x.id)},P2,C);
    assert.deepEqual(J(P1.board),J(P2.board));assert.deepEqual(J(a.waves),J(b.waves));assert.deepEqual(J(C.legal(P1.board,"r")),J(C.legal(P2.board,"r")));
    const cnt=P1.board.filter(p=>p&&p===p.toLowerCase()).length+a.waves.reduce((x,w)=>x+w.ps.length,0);assert.equal(cnt,16,"第 "+n+" 關黑方照樣 16 子")}
});

test("鋒芒畢露：以弱克強再回 10 靈（一般擒子不加）；記在 fmR（每回合 1 次）", ()=>{
  const F="4k4/9/9/r8/P8/9/9/9/9/3K5",a=custom(F),b=custom(F,{tal:["xhcr","fmbl"]});const s0a=a.td.me.sp,s0b=b.td.me.sp;
  mv(a,sq(4,0),sq(3,0));mv(b,sq(4,0),sq(3,0));assert.equal(a.td.me.sp-s0a,10,"沒天賦：擒子 +10");assert.equal(b.td.me.sp-s0b,20,"兵吃車再 +10");assert.equal(b.td.fmR,b.td.rnd);
  assert.ok(b.td.ev.some(e=>e.k==="tal"&&e.id==="fmbl"));
  const c=custom("4k4/9/9/p8/R8/9/9/9/9/3K5",{tal:["xhcr","fmbl"]}),s0=c.td.me.sp;mv(c,sq(4,0),sq(3,0));assert.equal(c.td.me.sp-s0,10,"俥吃卒不算以弱克強");
  assert.equal(a.td.en.hp,b.td.en.hp,"扣星樞的元氣不變");
});

test("星陣護體：陣眼子第一次被吃只扣 20 靈、不停招；第二次照舊歸零；沒天賦照舊歸零停招", ()=>{
  const F="4k4/9/9/9/9/r8/P8/9/9/3K5";
  const play=tal=>{const P=custom(F,{ch:"x_bing",xm:30,tal});assert.equal(P.td.eye,"r"+sq(6,0));mv(P,sq(9,3),sq(8,3));const sp0=P.td.me.sp;mv(P,sq(5,0),sq(6,0));return{P,sp0}};
  const n=play([]);assert.equal(n.P.td.me.sp,0);assert.ok(n.P.td.seal>n.P.td.rnd-1&&n.P.td.seal>=n.P.td.rnd,"停招");assert.equal(n.P.td.eyeX,1);
  const t=play(["xhcr","xzht"]);assert.equal(t.P.td.me.sp,Math.max(0,Math.min(t.P.td.me.spMax,t.sp0+t.P.td.me.spRg)-20),"回合回靈後再扣 20");assert.ok(!(t.P.td.seal>=t.P.td.rnd),"不停招");assert.equal(t.P.td.hzU,1);assert.equal(t.P.td.eyeX,1,"三星照樣記陣眼被吃");
  assert.ok(t.P.td.ev.some(e=>e.k==="eye2")&&!t.P.td.ev.some(e=>e.k==="eye"));
});

test("奇謀連鎖：奇謀連擊再多扣 2（共多 4），單次上限 12 照舊；沒有奇謀連擊不加", ()=>{
  assert.deepEqual(J(B.comboOf({base:5,mk:true,qx:true})),{n:9,sp:10,k:"qm",bonus:4});
  assert.equal(B.comboOf({base:10,mk:true,qx:true}).n,12,"封頂 12");assert.equal(B.comboOf({base:5,qx:true}).n,5,"沒放招標記不加");
  assert.equal(B.comboOf({base:13,mk:true,qx:true}).n,13,"原本 13 不會變少");assert.equal(B.comboOf({base:4,eye:true,pj:true,mk:true,qx:true}).n,9);
});

test("赤焰火網：招式打過的破甲多留到下一回合結束（共 2 回合）；沒天賦打一次就消失", ()=>{
  const F="3k5/9/9/9/4p4/9/9/9/9/4K4";
  const run=tal=>{const P=custom(F,{ch:"x_martialgirl",L:12,xm:50,sk:["lei3"],tal});const tag=P.td.pid[sq(4,4)];P.td.pj=[tag];
    const r1=B.cast(P,{k:"lei3"},C);assert.ok(r1&&!r1.err,JSON.stringify(r1));const h1=P.td.ev.filter(e=>e.k==="hit"&&e.sd==="b").slice(-1)[0].n;return{P,tag,h1}};
  const n=run([]);assert.ok(!n.P.td.pj.includes(n.tag),"沒天賦：用掉");
  const t=run(["xhcr","fmbl","cyhw"]);assert.ok(t.P.td.pj.includes(t.tag),"有天賦：留著");assert.equal(t.h1,n.h1,"第一下一樣多");
  round(t.P);assert.ok(t.P.td.pj.includes(t.tag),"下一回合還在");
  const w=B.why({td:t.P.td,board:t.P.board,moves:t.P.moves,turn:"r"},"lei3",C);assert.equal(w,null,"第二回合還能對破甲的子放花火連環");B.cast(t.P,{k:"lei3"},C);const h2=t.P.td.ev.filter(e=>e.k==="hit"&&e.sd==="b").slice(-1)[0].n;assert.equal(h2,t.h1,"第二回合再打照樣 +1");
  round(t.P);assert.ok(!t.P.td.pj.includes(t.tag)||t.P.td.pjT[t.tag]==null,"第 2 回合結束收掉（炮還瞄著才會重新標）");
});

test("七星共鳴（固定、不隨機）：每 2 顆過河的己方子回合結束回 1 元氣，每回合最多 +2；1 顆不回", ()=>{
  const heal=(fen,tal)=>{const P=custom(fen,{tal});P.td.me.hp=P.td.me.max-5;const h0=P.td.me.hp;round(P);return P.td.me.hp-h0};
  const F4="3k5/9/9/P1P1P1P2/9/9/9/9/9/4K4",F3="3k5/9/9/P1P1P4/9/9/9/9/9/4K4",F1="3k5/9/9/P8/9/9/9/9/9/4K4",F6="3k5/9/P1P1P1P1P/P1P6/9/9/9/9/9/4K4";
  const T=["xhcr","fmbl","qmls","qxgm"];
  assert.equal(heal(F4,T),2);assert.equal(heal(F3,T),1);assert.equal(heal(F1,T),0);assert.equal(heal(F6,T),2,"最多 +2");
  assert.equal(heal(F4,[]),0,"沒天賦不回");
  for(let i=0;i<5;i++)assert.equal(heal(F3,T),1,"每次都一樣（不是機率）");
});

/* ====================== ② 結算 ====================== */
test("三星：★1 過關、★2 陣眼子沒被吃、★3 在 r3 回合內；輸了全灰；每關都有 r3", ()=>{
  const td={rnd:9,r3:14,eyeX:0,en:{hp:3}};
  assert.deepEqual(J(B.starsOf(td,true)),[true,true,true]);assert.deepEqual(J(B.starsOf(Object.assign({},td,{rnd:13}),true)),[true,true,true],"第 14 回合過關算");
  assert.deepEqual(J(B.starsOf(Object.assign({},td,{rnd:14}),true)),[true,true,false]);assert.deepEqual(J(B.starsOf(Object.assign({},td,{eyeX:1}),true)),[true,false,true]);
  assert.deepEqual(J(B.starsOf(td,false)),[false,false,false]);
  for(const V of B.LV)assert.ok(V.r3>=8&&V.r3<=30,"第 "+V.n+" 關 r3＝"+V.r3);for(const T of B.RAID)assert.ok(T.r3>=8&&T.r3<=30,T.id);
  const P=custom(KFEN,{lv:3});assert.equal(P.td.r3,B.LV[2].r3);
});

test("星塵：主線照星數 3／4／6、守關 +4、首通 +10、第一次三星 +8；急襲 6／8／10；輸了 0", ()=>{
  assert.deepEqual(J(B.dustOf({win:true,stars:1})),{n:3,parts:[["過關",3]]});assert.equal(B.dustOf({win:true,stars:2}).n,4);assert.equal(B.dustOf({win:true,stars:3}).n,6);
  assert.equal(B.dustOf({win:true,stars:3,first:true,s3:true}).n,24);assert.equal(B.dustOf({win:true,stars:3,boss:true,first:true,s3:true}).n,28);
  assert.equal(B.dustOf({win:true,stars:2,first:true,s3:true}).n,14,"沒三星不給三星首達");
  for(const s of[1,2,3])assert.equal(B.dustOf({raid:true,win:true,stars:s,first:true,s3:true}).n,[0,6,8,10][s],"急襲不另給首通");
  assert.equal(B.dustOf({win:false,stars:0,first:true}).n,0);
  for(let s=1;s<=3;s++){const n=B.dustOf({win:true,stars:s}).n;assert.ok(n>=3&&n<=6,"一般 3～6");const r=B.dustOf({raid:true,win:true,stars:s}).n;assert.ok(r>=6&&r<=10,"急襲 6～10")}
  /* 刷滿 240 的估算（回報用）：主線 6 關都三星首通＝5×24＋28＝148；剩 92 靠急襲平均 8 點約 12 場；只刷急襲平均 8 點＝30 場 */
  const main=B.LV.reduce((a,V)=>a+B.dustOf({win:true,stars:3,boss:!!V.boss,first:true,s3:true}).n,0);assert.equal(main,148);
  assert.equal(Math.ceil((B.TAL_ALL-main)/8),12);assert.equal(Math.ceil(B.TAL_ALL/8),30);
});

test("差一點：多幾回合、陣眼子被吃、兩個都差、輸了；額外星塵＝拿滿三星多拿的", ()=>{
  const td={rnd:15,r3:14,eyeX:0,en:{hp:4}},fl={first:false,s3:true};
  assert.deepEqual(J(B.nearOf(td,true,fl)),{k:"rnd",d:2,x:10});
  assert.deepEqual(J(B.nearOf(Object.assign({},td,{rnd:3,eyeX:1}),true,fl)),{k:"eye",d:1,x:10});
  assert.equal(B.nearOf(Object.assign({},td,{eyeX:2}),true,fl).k,"both");assert.equal(B.nearOf(Object.assign({},td,{eyeX:2}),true,fl).x,11,"1 星 3 → 三星 6＋8");
  assert.deepEqual(J(B.nearOf(Object.assign({},td,{en:{hp:4,max:28}}),false,fl)),{k:"lose",hp:4,max:28,x:0});assert.equal(B.nearOf({rnd:3,r3:14,eyeX:0,en:{hp:0}},true,fl).k,"");
  assert.equal(B.nearOf(td,true,{raid:true}).x,2,"急襲 2 星 8 → 三星 10");assert.equal(B.nearOf(Object.assign({},td,{eyeX:1}),true,{raid:true}).x,4,"急襲 1 星 6 → 10");
});

test("標題與評語：大勝（≥35 且三星）、險勝（10～34）、慘勝（1～9）、落敗；落敗不用化墨退場；慘勝那句照審查改", ()=>{
  assert.equal(B.gradeOf(true,40,true),"big");assert.equal(B.gradeOf(true,40,false),"close","元氣夠但沒三星＝險勝");assert.equal(B.gradeOf(true,10,true),"close");assert.equal(B.gradeOf(true,9,true),"bare");assert.equal(B.gradeOf(true,1,false),"bare");assert.equal(B.gradeOf(false,50,true),"lose");
  assert.deepEqual(J(B.GRADE),{big:"星淵大捷・完勝歸來",close:"力克星樞・險中求勝",bare:"殘血破陣・絕處逢生",lose:"星局未竟・重整旗鼓"});
  for(const k in B.GSAY)assert.equal(B.GSAY[k].length,3,k);
  assert.ok(B.GSAY.bare.includes("差一點就被星樞翻盤了！好在最後一擊精準命中要害。"));
  assert.ok(!JSON.stringify(J(B.GSAY)).includes("化墨")&&!JSON.stringify(J(B.GRADE)).includes("化墨"),"化墨退場只給平日體力用");
});

test("七星「再來一場」：七位各一句（照開發者給的原句）", ()=>{
  assert.deepEqual(Object.keys(B.AGAIN).sort(),Object.keys(B.CH).sort());
  assert.equal(B.AGAIN.x_martialgirl,"嘿嘿，沒有打雷只有滿天星火，這仗打得真痛快，再放一輪！");assert.equal(B.AGAIN.x_shi,"陣腳已穩，護主之責未盡。只要你還要下，我隨時奉陪到底。");
});

/* ====================== ③ 星淵急襲 ====================== */
test("急襲模板：10～15 組，每組過開局合法檢查（只減子不加子、不照面、沒人被將、兵卒位置合法、雙方 9～11 子、紅方七種子都有）", ()=>{
  assert.ok(B.RAID.length>=10&&B.RAID.length<=15,"模板數 "+B.RAID.length);assert.equal(new Set(B.RAID.map(T=>T.id)).size,B.RAID.length,"id 不重複");
  for(const T of B.RAID){const e=B.raidCheck(T,C);assert.deepEqual(J(e),[],T.id+" "+T.nm+"："+e.join("；"))}
  const STD={K:1,A:2,B:2,N:2,R:2,C:2,P:5};
  for(const T of B.RAID){const cnt={};for(const[p]of T.b.concat(...T.w.map(w=>w.p))){const k=p.toUpperCase();cnt[k]=(cnt[k]||0)+1}for(const k in cnt)assert.ok(cnt[k]<=STD[k],T.id+" 黑"+k);
    assert.ok(T.b.length+T.w.reduce((a,w)=>a+w.p.length,0)<16,T.id+" 黑方比標準少（只減不加）")}
});

test("急襲檢查器會抓錯：照面、開局將軍、兵卒站錯、多一顆車、星門落點不合法", ()=>{
  const T0=B.RAID[0],cp=o=>Object.assign(J(T0),o);
  assert.ok(B.raidCheck(cp({r:T0.r.concat([["P",2,1]])}),C).some(e=>/不能站/.test(e)),"兵站在自己底線");
  assert.ok(B.raidCheck(cp({b:T0.b.concat([["r",1,10],["r",2,10]])}),C).some(e=>/超過/.test(e)),"黑車 3 顆");
  assert.ok(B.raidCheck(cp({w:[{at:3,p:[["p",5,4]]}]}),C).some(e=>/星門/.test(e)),"星門落在紅方半場");
  const fc={id:"x",nm:"x",r3:12,r:[["K",5,1],["A",4,1],["B",3,1],["N",2,1],["R",1,1],["C",8,3],["P",1,4],["A",6,1],["B",7,1]],b:[["k",5,10],["a",4,10],["a",6,10],["b",3,10],["b",7,10],["n",2,10],["r",1,10],["c",8,8],["p",1,7]],w:[]};
  assert.ok(B.raidCheck(fc,C).some(e=>/照面/.test(e)),"將帥照面");
  const ck=J(fc);ck.r.push(["R",5,5]);ck.r=ck.r.filter(x=>!(x[0]==="R"&&x[1]===1));assert.ok(B.raidCheck(ck,C).some(e=>/被將/.test(e)),"開局黑方被將");
});

test("急襲不是一開局就必輸／必贏（規則檢查：沒有一步殺、紅方不會怎麼走都被一步殺、沒有白吃大子、子力差 ≤ 8）", ()=>{
  for(const T of B.RAID){const e=B.raidSane(T,C);assert.deepEqual(J(e),[],T.id+" "+T.nm+"："+e.join("；"))}
  const bad=J(B.RAID[0]);bad.b=bad.b.filter(x=>x[0]!=="r"&&x[0]!=="c"&&x[0]!=="n");assert.ok(B.raidSane(bad,C).some(e=>/子力差/.test(e)),"抓得到子力差太多");
});

test("急襲開局：四種星門變化都開得起來；星樞元氣 25、推算步數照前段關卡、td.lv＝0、td.rd 記模板與變化；跑 12 回合星門照常落、局面都合法", ()=>{
  for(const T of B.RAID)for(let v=0;v<4;v++){const fen=B.raidFen(T.id,C),P=custom(fen,{raid:{id:T.id,v},ch:"x_bing",tal:["xhcr"]}),td=P.td;
    assert.equal(td.lv,0);assert.deepEqual(J(td.rd),{id:T.id,v});assert.equal(td.en.hp,25);assert.equal(td.en.max,25);assert.equal(td.nm,"星淵急襲・"+T.nm);
    assert.equal(td.ai.depth,B.depthOf(B.RAID_AI,2).depth);assert.equal(td.r3,T.r3);assert.ok(B.sqOf(td,td.eye)!=null,"陣眼子在場上");
    assert.equal(P.board.filter(Boolean).length,T.r.length+T.b.length);
    let end=null;for(let i=0;i<12&&!end;i++){end=round(P);const b=P.board;assert.ok(b.indexOf("K")>=0&&b.indexOf("k")>=0);if(!end){assert.ok(!C.inCheck(b,"b"),T.id+" v"+v+" 第 "+i+" 回合輪紅方時黑方被將");}}
    const blk=P.board.filter(p=>p&&p===p.toLowerCase()).length;assert.ok(blk<=16)}
  const bad=custom(B.raidFen("r01",C),{raid:{id:"zz",v:1}});assert.equal(bad.td.rd,null,"不認得的模板＝照一般關卡");
  for(const T of B.RAID)for(const ck of Object.keys(B.CH)){const P=custom(B.raidFen(T.id,C),{raid:{id:T.id,v:0},ch:ck}),q=B.sqOf(P.td,P.td.eye);assert.equal(P.board[q],B.CH[ck].pc,T.id+" "+ck+" 的陣眼子要是本命子那一種（不是剛好站在原位的別的子）")}
});

test("急襲 raidLv：星門變化會換位置（鏡像／換一道門），落點都在黑方半場、站得住", ()=>{
  for(const T of B.RAID){const s=new Set();for(let v=0;v<4;v++){const W=J(B.raidWaves(T,v));s.add(JSON.stringify(W));for(const w of W)for(const[p,lu,xi]of w.p){assert.ok(xi>=6&&lu>=1&&lu<=9);assert.ok(B.canStand(p,B.LSQ(lu,xi)))}}
    assert.ok(s.size>=2,T.id+" 至少兩種星門位置")}
  const L=J(B.raidLv("r01",1));assert.equal(L.hp,25);assert.equal(L.nofill,1);assert.deepEqual(L.fsk,["zhs","cfx"]);
});

/* ====================== ④ 接線 ====================== */
test("〔原始碼〕存檔鍵 bhtdDust（排在 bhtd 前面，其他測試要的順序不動）；急襲不給修為；定軌力入口鎖；結果視窗兩顆鈕", ()=>{
  const SV=rd("xiangqi-db/m/05b-save.js");assert.ok(SV.includes('"xsdLv","bhtdDust","bhtd","bhtdFx","bhtl","xsmSeen","dgl","gxtSeen"].map(k=>"m_"+k)'));
  assert.ok(rd("xiangqi-db/m/07-legend.js").includes('&&!(typeof bhtdNoXp==="function"&&bhtdNoXp(st)))addXP(st.result.w===st.human?40:15,"對局","g:"+st.id)'),"急襲不給修為");
  assert.ok(SRC.includes('function bhtdNoXp(st){return!!(st&&st.td&&st.td.rd&&String(st.journey||"")==="bh:rd")}'));
  assert.ok(SRC.includes('jStart("bh:rd"')&&SRC.includes("td:{raid:{id:T.id,v},ch:ck,L,diff,sk,xm,tal}"),"急襲開局帶模板、變化、天賦");
  assert.ok(/function bhtdStart\(n,k,cover,sk,how,q\)\{[^\n]*\n  if\(how!=="old"\)\{const lk=bhtdLock\(\);if\(lk\)/.test(SRC),"開新盤先問定軌力");
  assert.ok(/function bhtdRaid\(k,cover,sk,q\)\{[^\n]*const lk=bhtdLock\(\);if\(lk\)/.test(SRC));assert.ok(SRC.includes('function bhtdOpen(){const lk=bhtdLock();if(lk)'));
  assert.ok(rd("xiangqi-db/m/07bh-blackhole.js").includes('function bhStart(k,cover){{const lk=typeof bhtdLock==="function"?bhtdLock():"";if(lk)'),"星槎偏航也關");
  const G=rd("xiangqi-db/m/07gxt-guanxing.js");assert.ok(G.includes('function gxtTd(){if(gxtBhLock()){toast("🌫 "+gxtBhMsg());return}')&&G.includes('if(gxtBhLock()){toast("🌫 "+gxtBhMsg());return}location.hash="#/guanxing"'),"觀星臺渾儀、星槎星淵");
  assert.ok(SRC.includes('["返回星盤",()=>bhtdSelect(k,cv,{after:1,rd}),"bt-back"],["↻ 再刷一場（＋星塵）"'),"返回星盤＋再刷一場");
  assert.ok(SRC.includes('if(rd)bhtdRaid(k,cv,sk,1);else bhtdStart(n,k,cv,sk,"new",1)'),"再刷直接重開、不播長台詞");
  assert.ok(SRC.includes('"星局未竟・重整旗鼓"')&&!/化墨退場・重整旗鼓/.test(SRC));
  assert.ok(SRC.includes('if(typeof bhtlNeed==="function"&&bhtlNeed()){bhtlOffer(k,cover);return}'));
});

test("〔原始碼〕07bht 沒有 CR、控制字元、長行 // 註解；新的全域名稱沒跟別的模組撞名；英文字典有新字", ()=>{
  const raw=fs.readFileSync(path.join(M,"07bht-td.js"),"utf8");assert.ok(!raw.includes("\r"));assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(raw));
  assert.ok(!raw.split("\n").some(l=>/[;}]\s*\/\/[^\n]*\S/.test(l)&&!/^\s*\/\//.test(l)),"長行不插 // 註解");
  const decl=[...raw.matchAll(/(?:^|[;\s])(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)].map(m=>m[1]).filter(n=>/^(bhtd|BHTD_)/.test(n));
  const others=fs.readdirSync(M).filter(f=>/\.js$/.test(f)&&f!=="07bht-td.js").map(f=>rd("xiangqi-db/m/"+f)).join("\n");
  for(const n of new Set(decl))assert.ok(!new RegExp("(?:const|let|var|function)\\s+"+n.replace(/\$/g,"\\$")+"\\b").test(others),"撞名："+n);
  const I=rd("xiangqi-db/m/07i18n.js"),i=I.indexOf("#I18N-PURE-BEGIN"),j=I.indexOf("/* #I18N-PURE-END */"),c2={};vm.createContext(c2);vm.runInContext(I.slice(I.indexOf("\n",i)+1,j)+";this.T=i18nText",c2);
  const S=[...B.TAL.map(x=>x.nm),...B.TAL.map(x=>x.d),...Object.values(B.GRADE),...[].concat(...Object.values(B.GSAY)),...Object.values(B.AGAIN),...B.RAID.map(T=>T.nm),...B.RAID.map(T=>"星淵急襲・"+T.nm),
    "星塵天賦","返回星盤","↻ 再刷一場（＋星塵）","最高一擊","最高連擊","陣眼擒子","陣眼子沒被吃","回合內","第 3 層","星塵 35","最佳 2 星","兵吃車","差一點！再少 2 回合就三星，額外 +8 星塵","差一點！陣眼子別被吃，就能三星，額外 +10 星塵",
    "差一點！陣眼子別被吃、再少 1 回合，就能三星，額外 +11 星塵","差一點！星樞只剩 4 元氣，打光就過關","中局殘陣・3～5 分鐘・星塵 6～10","⚡ 星淵急襲・雙炮巡河——星樞元氣 25","↺ 天賦全部重置，退回 40 星塵",
    "要點下一層，先點亮上一層的一個。","天賦只在黑洞有用，線上和一般對局不受影響。","不在對局裡時，可以免費全部重置，星塵全退。","✧ 星塵不夠（要 35）","✧ 先點亮上一層的一個天賦",
    "人間黑洞會用，星槎會回","人間・黑洞","黑洞過關回定軌力，一天最多 20。","定軌力用完時，黑洞入口也會關。","🌫 定軌力用完了，黑洞入口先關著：在星槎歇到 15 再來","今天靠黑洞回的定軌力已經滿 20 了","星淵遠征，定軌力用完，暫時關閉"];
  for(const s of S){const t=c2.T(s);assert.ok(t&&!/[㐀-鿿]/.test(t),s+" → "+t)}
});
