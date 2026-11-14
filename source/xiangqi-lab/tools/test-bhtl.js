// 黑洞塔防練習賽「星淵試陣」（開發者 11/13 選方案 A；規劃 xiangqi-db/story/黑洞塔防練習賽教學規劃_1113.md）的自動測試。不開瀏覽器、不跑引擎：
//   ① 規則：BHTD.TL 劇本 7 位 × 修為 Lv 1／6／12／17／23／30／60／100（含規劃時模擬的 28 組 Lv 1／6／30／100）——開局合法、每步合法、
//      吃卒扣星樞、第 1 回合結束靈力滿、第 2 回合結束堵住星門、第 1 招放得出來（照 TL.tg）、陣眼子在盤上、收尾前星樞剩 1～5、將軍打光、我方元氣一直 >0；
//      會改盤面的招（一劍破甲、回營、飛燕還巢、神行百里）用 local.js 的 tdRebuild 重放跟現場一樣
//   ② 練習賽不影響星域一 6 關（LV、lvCheck、startFen 照舊）
//   ③ 畫面端（07bhtl-tdlearn.js 在 vm 裡跑，假 store）：第一次才邀請、步驟從盤面算、走錯不送出、放招／選目標只准教學那一步、練完記 done、進階提示每種只跳一次
//   ④ 接線：m.html include 在 07bht-td.js 後面、存檔鍵、黑洞結束與結果視窗、08b 鎖步、關卡卡片、名稱不撞、英文字典都翻得出來
// 用法：node --test xiangqi-lab/tools/test-bhtl.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../.."),M=path.join(ROOT,"xiangqi-db/m");
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const TD=rd("xiangqi-db/m/07bht-td.js"),TL_SRC=rd("xiangqi-db/m/07bhtl-tdlearn.js");
const LOC=rd("xiangqi-lab/src/local.js");
const tdRebuild=new Function("C","parseFen","fen","START",LOC.slice(LOC.indexOf("function tdRebuild(S){"),LOC.indexOf("S.repetition=null;return S}")+"S.repetition=null;return S}".length)+";return tdRebuild")(C,C.parseFen,C.fen,C.START);
const J=x=>JSON.parse(JSON.stringify(x)),sq=u=>C.parseSq(u);

/* 規則＋畫面端一起載進同一個 vm（畫面端用到的 App 函式給假的） */
function kit(o){o=o||{};const mem={},log={toast:[],modal:[],jStart:[],sel:[]};
  const store={get:(k,d)=>k in mem?JSON.parse(mem[k]):d,set:(k,v)=>{mem[k]=JSON.stringify(v)}};for(const k in o.store||{})store.set(k,o.store[k]);
  const ctx={console,Math,JSON,window:{XQCore:C},addEventListener:()=>{},store,esc:s=>String(s),toast:t=>log.toast.push(t),vibrate:()=>{},
    modal:(h,b,c)=>{log.modal.push({h,b,c});return{}},jStart:(id,b,go,f)=>log.jStart.push({id,b,f}),api:()=>Promise.resolve({}),location:{hash:"#/journey/play"}};
  vm.createContext(ctx);vm.runInContext(TD+"\n;this.BHTD=BHTD;",ctx,{filename:"07bht-td.js"});vm.runInContext(TL_SRC,ctx,{filename:"07bhtl-tdlearn.js"});
  ctx.bhtdSelect=(k,c)=>log.sel.push([k,c]);
  return{ctx,B:ctx.BHTD,mem,store,log}}
const K0=kit(),B=K0.B,T=B.TL;

function game(ch,L){const fen=B.startFen("tl",C),P={start:fen,startTurn:"r",board:C.parseFen(fen),turn:"r",moves:[],human:"r",journey:"bh:tl",id:"g1"};P.pos=[C.fen(P.board,"r")];
  P.td=B.boot({lv:"tl",ch,L,diff:2},P,C);return P}
function mv(P,u){const f=sq(u.slice(0,2)),t=sq(u.slice(2,4));assert.ok(C.legal(P.board,P.turn).some(([a,b])=>a===f&&b===t),u+" 要合法");const m=C.stateApply(P,f,t);return B.move(P,m,C)}
const LVS=[1,6,12,17,23,30,60,100];

// ====================== ① 規則：劇本 ======================
test("練習賽開局：專用 FEN、紅方七種子都在 EYE0、合法（沒人被將、不照面、紅方有步）；設定照規劃", ()=>{
  const b=C.parseFen(B.startFen("tl",C));
  for(const[p,q]of Object.entries(J(B.EYE0)))assert.equal(b[q],p,`陣眼子 ${p} 要在格 ${q}`);
  assert.ok(!C.inCheck(b,"r")&&!C.inCheck(b,"b"));assert.ok(C.legal(b,"r").length>0);
  assert.equal(T.hp,8);assert.equal(T.red.length,3);assert.equal(T.blk.length,2,"星樞照劇本走 2 步（local.js lv.mirror 上限 4）");
  assert.ok(T.blk.every(u=>/^[a-i][0-9][a-i][0-9]$/.test(u)),"mirror 格式");
  const pl=B.lvPlan(T);assert.equal(pl.waves.length,1,"不補滿 16 子，只有 1 波星門");assert.equal(pl.waves[0].at,2);
  const P=game("x_swordboy",1);assert.equal(P.td.lv,0);assert.equal(P.td.ai.depth,1);assert.equal(P.td.en.spMax,0,"星樞沒有靈力");assert.deepEqual(J(P.td.fsk),[]);
  assert.equal(P.td.me.sp,P.td.me.spMax-20,"開局差 20 靈（11/14 晚 ×10）");assert.deepEqual(J(P.td.sk),["qi1"],"只帶第 1 招");assert.ok(P.td.gate&&P.td.gate.sq[0]===sq("i6"),"星門在路 9 線 7");
});

for(const ch of Object.keys(B.CH))test(`劇本 ${B.CH[ch].n}：Lv ${LVS.join("／")} 每一步都對、將軍打光`, ()=>{
  for(const L of LVS){const P=game(ch,L),td=P.td,id=J(td.sk)[0],tag=`${ch} Lv${L}`;
    assert.equal(B.SKM[id].lv,1,tag+" 帶的是第 1 招");
    const en0=td.en.hp;assert.equal(mv(P,T.red[0]),null,tag);assert.ok(td.en.hp<en0&&en0-td.en.hp>=2&&en0-td.en.hp<=5,tag+" 吃卒扣星樞 2～5："+(en0-td.en.hp));
    assert.equal(mv(P,T.blk[0]),null,tag);assert.equal(td.me.sp,td.me.spMax,tag+" 第 1 回合結束靈力滿");assert.ok(td.ev.some(e=>e.k==="hit"&&e.sd==="r"&&e.why==="被擒"),tag+" 被吃也扣");
    assert.equal(mv(P,T.red[1]),null,tag);const s0=td.seq;assert.equal(mv(P,T.blk[1]),null,tag);
    const E=td.ev.filter(e=>e.s>s0);assert.ok(E.some(e=>e.k==="block"),tag+" 第 2 回合結束堵住星門");assert.ok(E.some(e=>e.k==="hit"&&e.sd==="b"&&e.why==="過河"),tag+" 俥過河咬星樞");
    assert.equal(B.why(P,id,C),null,tag+" 第 1 招放得出來");
    const tg=(T.tg[id]||[]).map(sq);const r=B.cast(P,{k:id,tg},C);assert.ok(r&&!r.err,tag+" 放招："+(r&&r.err));
    if(P.ed&&P.ed.length){const S={start:P.start,startTurn:"r",moves:P.moves.map(m=>({f:m.f,t:m.t})),ed:J(P.ed)};tdRebuild(S);assert.deepEqual(J(S.board),J(P.board),tag+" tdRebuild 重放一樣")}
    assert.ok(B.sqOf(td,td.eye)!=null,tag+" 陣眼子在盤上");
    const h=td.en.hp;assert.ok(h>=1&&h<=5,tag+" 收尾前星樞剩 1～5："+h);
    const e=mv(P,T.red[2]);assert.ok(e&&e.end&&e.end.w==="r",tag+" 將軍打光");assert.equal(e.end.why,"星樞元氣歸零");assert.ok(td.me.hp>0,tag+" 我方元氣 >0");
    assert.ok(td.ev.some(x=>x.k==="hit"&&x.why==="將軍"),tag+" 將軍扣 5")}
});

test("目標表：TL.tg 每一格都在那一招當下的候選裡（只亮教學指定的格也一定點得到）", ()=>{
  for(const ch of Object.keys(B.CH)){const P=game(ch,1);for(let i=0;i<2;i++){mv(P,T.red[i]);mv(P,T.blk[i])}const id=J(P.td.sk)[0],L=(T.tg[id]||[]).map(sq);
    if(!B.SKM[id].tg){assert.equal(L.length,0,id);continue}assert.equal(L.length,B.SKM[id].steps,id+" 步數對");
    for(let k=0;k<L.length;k++)assert.ok(J(B.targets(P,id,L.slice(0,k),C)).includes(L[k]),`${id} 第 ${k+1} 步 ${L[k]} 在候選裡`)}
});

// ====================== ② 不影響 6 關 ======================
test("練習賽不影響星域一 6 關：LV 6 關、lvCheck 全過、startFen 照舊有 16 子規劃", ()=>{
  assert.equal(B.LV.length,6);for(const L of B.LV)assert.deepEqual(J(B.lvCheck(L,C)),[],"第 "+L.n+" 關");
  const P={board:C.parseFen(B.startFen(1,C)),moves:[]};const td=B.boot({lv:1,ch:"x_bing",L:1},P,C);assert.equal(td.lv,1);assert.equal(td.en.spMax,50);assert.ok(td.waves.length>1);
});

// ====================== ③ 畫面端 ======================
function tlKit(o){o=Object.assign({},o);o.store=Object.assign({pChar:o.ch||"x_swordboy"},o.store);return kit(o)}   /* bhtdChar 等是 const，讀 store pChar */
const run=(K,s)=>vm.runInContext(s,K.ctx);
test("第一次才邀請：沒練過、沒跳過、塔防沒輸贏＝邀請；練過、跳過、玩過 v0.1 都不邀請", ()=>{
  assert.equal(run(tlKit(),"bhtlNeed()"),true);
  assert.equal(run(tlKit({store:{bhtl:{done:1}}}),"bhtlNeed()"),false);assert.equal(run(tlKit({store:{bhtl:{skip:1}}}),"bhtlNeed()"),false);
  assert.equal(run(tlKit({store:{bhtd:{c:{},w:{},l:{1:1}}}}),"bhtlNeed()"),false,"輸過第 1 關＝玩過");
  const K=tlKit();run(K,'bhtlOffer("tang",true)');const m=K.log.modal[0];assert.match(m.h,/第一次來星淵/);assert.ok(m.b.some(x=>x[0]==="▶ 先練一盤"));
  m.b.find(x=>x[0]==="我會了，直接選關")[1]();assert.ok(JSON.parse(K.mem.bhtl).skip,"記 skip");assert.deepEqual(K.log.sel,[["tang",true]],"開關卡卡片");
  m.b.find(x=>x[0]==="▶ 先練一盤")[1]();const j=K.log.jStart[0];assert.equal(j.id,"bh:tl");assert.equal(j.b.td.lv,"tl");assert.deepEqual(J(j.b.lv.mirror),J(T.blk));assert.equal(j.f,undefined,"不傳 force");
  assert.equal(K.mem.park3d,undefined,"不動玩家的 park3d 設定");assert.equal(JSON.parse(K.mem.bhRet).k,"tang");
});
test("步驟從盤面算、說明看過才往下；走錯不送出（第 2 次給黃框）；放招、選目標只准教學那一步", ()=>{
  const K=tlKit({ch:"x_martialgirl"}),c=K.ctx;const P=game("x_martialgirl",1);const st=()=>Object.assign({},P,{id:"g1",journey:"bh:tl",human:"r",thinking:false,result:P.result||null});
  c.__st=st;const step=()=>run(K,"bhtlStep(__st())"),guard=(f,t)=>{c.__g=[f,t];return run(K,"bhtlGuard(__st(),__g[0],__g[1])")};
  assert.equal(step(),"t0");assert.ok(guard(sq("e3"),sq("e4")),"說明還沒看完不能走");run(K,'bhtlMark(__st(),"t0")');assert.equal(step(),"t1");
  const g1=guard(sq("i0"),sq("i1"));assert.ok(g1&&!g1.hint,"走錯第 1 次：不送出");const g2=guard(sq("i0"),sq("i1"));assert.deepEqual(J(g2.hint),[sq("e3"),sq("e4")],"第 2 次給黃框");
  assert.equal(guard(sq("e3"),sq("e4")),null,"劇本那一步照常送出");assert.equal(run(K,"bhtlCastOk(__st())"),false,"t1 不能放招");
  mv(P,T.red[0]);assert.equal(P.turn,"b");assert.equal(step(),"w1","星樞在想");mv(P,T.blk[0]);assert.equal(step(),"t1b");run(K,'bhtlMark(__st(),"t1b")');assert.equal(step(),"t2");
  mv(P,T.red[1]);assert.equal(step(),"w2");mv(P,T.blk[1]);assert.equal(step(),"t2b");run(K,'bhtlMark(__st(),"t2b")');assert.equal(step(),"t3");
  assert.ok(guard(sq("i6"),sq("e6")),"還沒放招不能收尾");assert.equal(run(K,"bhtlCastOk(__st())"),true,"t3 可以放招");
  assert.equal(run(K,'bhtlTgOk(__st(),{id:"lei1",pk:[]},'+sq("d3")+")"),true);assert.equal(run(K,'bhtlTgOk(__st(),{id:"lei1",pk:[]},'+sq("c3")+")"),false,"只亮教學指定的格");
  B.cast(P,{k:"lei1",tg:[sq("d3")]},C);assert.equal(step(),"t4");assert.ok(guard(sq("i6"),sq("e6")),"先回答問題");run(K,'bhtlMark(__st(),"t4")');assert.equal(step(),"t5");
  assert.equal(guard(sq("i6"),sq("e6")),null,"收尾那一步送出");const e=mv(P,T.red[2]);P.result={w:e.end.w,why:e.end.why};assert.equal(step(),"end");
  run(K,"bhtlEnd(__st())");const S=JSON.parse(K.mem.bhtl);assert.ok(S.done);assert.equal(S.n,1);assert.equal(S.cur,null);
});
test("平面棋盤與提示靜音：只有練習賽那一盤用平面；沒有泡泡、不在練習時不靜音", ()=>{
  const K=tlKit();assert.equal(run(K,'bhtlFlat({journey:"bh:tl",td:{}})'),true);assert.equal(run(K,'bhtlFlat({journey:"bh:td1",td:{}})'),false);assert.equal(run(K,'bhtlFlat({journey:"bh:tl"})'),false);
  assert.equal(run(K,"bhtlHush()"),false);run(K,'BHTL_ST={journey:"bh:tl",td:{}}');assert.equal(run(K,"bhtlHush()"),true);run(K,"bhtlHide(1)");assert.equal(run(K,"bhtlHush()"),false);
});
test("不是練習賽：鎖步、放招、目標都不管；進階提示每種只跳一次、練習賽裡不跳", ()=>{
  const K=tlKit(),c=K.ctx;c.__o={journey:"bh:td1",td:{},moves:[],turn:"r",human:"r",board:[]};
  assert.equal(run(K,"bhtlGuard(__o,1,2)"),null);assert.equal(run(K,"bhtlCastOk(__o)"),true);assert.equal(run(K,'bhtlTgOk(__o,{id:"lei1",pk:[]},3)'),true);
  run(K,'bhtlTip({k:"mark"},__o);bhtlTip({k:"mark"},__o)');assert.ok(JSON.parse(K.mem.bhtl).tip.pj,"破甲記下");
  c.__p={journey:"bh:tl",td:{},moves:[]};run(K,'bhtlTip({k:"fore"},__p)');assert.ok(!JSON.parse(K.mem.bhtl).tip.fore,"練習賽裡不跳");
  const b=Array(90).fill(null);b[sq("e1")]="p";c.__o.board=b;run(K,'bhtlTip({k:"hit",sd:"r",why:"過河"},__o)');assert.ok(JSON.parse(K.mem.bhtl).tip.pal,"黑子進九宮");
  run(K,'bhtlLvTips({td:{shard:[1],gate:{fk:[2]},boss:{k:"P"}}})');const t=JSON.parse(K.mem.bhtl).tip;assert.ok(t.shard&&t.fake&&t.boss);
});
test("結果視窗：贏了三個鈕（開始第 1 關、再練一次、回航）；跳過練習＝直接開關卡卡片", ()=>{
  const K=tlKit();K.store.set("bhRet",{k:"song",cover:true});run(K,"bhtlResult({},true)");const m=K.log.modal[0];assert.match(m.h,/練習賽・過關/);
  assert.deepEqual(J(m.b.map(x=>x[0])),["⚔ 開始第 1 關","↻ 再練一次","⛵ 星槎回航"]);m.b[0][1]();assert.deepEqual(J(K.log.sel),[["song",true]]);
  run(K,"BHTL_SKIP=true;bhtlResult({},false)");assert.equal(K.log.modal.length,1,"跳過不跳結果視窗");assert.equal(K.log.sel.length,2);
});

// ====================== ④ 接線 ======================
test("〔原始碼〕接線：include 順序、存檔鍵、黑洞結束、結果視窗、08b 鎖步、關卡卡片、HUD 標題", ()=>{
  const H=rd("xiangqi-db/m.html");const a=H.indexOf("//#include m/07bht-td.js"),b=H.indexOf("//#include m/07bhtl-tdlearn.js");assert.ok(a>0&&b>a,"07bhtl-tdlearn.js 在 07bht-td.js 後面");
  const SV=rd("xiangqi-db/m/05b-save.js");assert.ok(/"bhtd","bhtdFx","bhtl",(?:"[a-zA-Z]+",)*"gxtSeen"\]\.map\(k=>"m_"\+k\)/.test(SV),"JOURNEY_KEYS 有 bhtl（gxtSeen 照舊在最後）");
  assert.ok(/const DVT_KEYS=\[[^\]]*"bhtl"/.test(rd("xiangqi-db/m/07dv-devtest.js")),"DVT_KEYS 有 bhtl");
  const BH=rd("xiangqi-db/m/07bh-blackhole.js");assert.ok(BH.includes('if(st&&st.journey==="bh:tl"){if(typeof bhtlEnd==="function")bhtlEnd(st);return}'),"bhGameEnd 不記黑洞次數");
  assert.ok(BH.indexOf('st.journey==="bh:tl"')<BH.indexOf('store.set("bhCount"'),"在記 bhCount 之前就轉走");
  assert.ok(BH.includes('if(st&&st.journey==="bh:tl"&&typeof bhtlResult==="function"){bhtlResult(st,win,draw0,XPR);return}'));
  assert.ok(rd("xiangqi-db/m/08b-cpugame.js").includes('{const g=typeof bhtlGuard==="function"?bhtlGuard(st,f,i):null;if(g){'),"08b tap 問 bhtlGuard");
  assert.ok(TD.includes('function bhtdSelect(k,cover){if(typeof bhtlNeed==="function"&&bhtlNeed()){bhtlOffer(k,cover);return}'));
  assert.ok(TD.includes('typeof bhtlCard==="function"?bhtlCard():""')&&TD.includes('data-tl="1"'),"練習賽卡、再玩一次");
  assert.ok(TD.includes('if(typeof bhtlCastOk==="function"&&!bhtlCastOk(st))return;')&&TD.includes("bhtlTgOk(st,T,q)")&&TD.includes("bhtlTip(e,st)")&&TD.includes("bhtlTick(st)"));
  assert.ok(TD.includes('const bhtdName=td=>td.lv?`第 ${td.lv} 關・${td.nm}`:td.rd?td.nm:"練習賽・"+td.nm;')&&TD.includes("${esc(bhtdName(td))}"),"HUD 標題（11/14 第二批：練習賽、星淵急襲共用 bhtdName）");
  const G=rd("xiangqi-db/m/08b-cpugame.js");assert.ok(G.includes('const pr=!!st.practice||(typeof bhtlFlat==="function"&&bhtlFlat(st));if(pr!==PARK_OFF)'),"練習賽整盤平面棋盤（PARK_OFF）");
  assert.ok(!TL_SRC.includes('store.set("park3d"'),"練習賽不改玩家的 park3d 設定");
  const BD=rd("xiangqi-db/m/01-board.js");assert.ok(BD.includes('function tmxFirst(box){if(typeof bhtlHush==="function"&&bhtlHush())return;')&&BD.includes('function tmxMvtHint(){if(TMX_MV||TMX_MVT||(typeof bhtlHush==="function"&&bhtlHush()))return;'),"練習賽中先壓住術語、記譜提示");
});
test("〔原始碼〕前綴 bhtl／BHTL 沒跟別的模組撞名；長行沒有 // 註解", ()=>{
  const mine=[...TL_SRC.matchAll(/^(?:function\s+(\w+)|(?:const|let)\s+(\w+)\s*=)/gm)].map(m=>m[1]||m[2]);
  for(const n of mine)assert.ok(/^(bhtl|BHTL)/.test(n),n+" 要用 bhtl 前綴");
  const others=fs.readdirSync(M).filter(f=>f.endsWith(".js")&&f!=="07bhtl-tdlearn.js").map(f=>rd("xiangqi-db/m/"+f)).join("\n");
  for(const n of mine)assert.ok(!new RegExp("(function\\s+|(const|let|var)\\s+)"+n+"\\b").test(others),n+" 撞名");
  for(const L of TL_SRC.split("\n"))assert.ok(!/[;})]\s*\/\/(?!#)/.test(L),"一行程式中間不插 // 註解："+L.slice(0,60));
});
test("英文介面：練習賽的旁白、按鈕、提示都翻得出英文", ()=>{
  const I=rd("xiangqi-db/m/07i18n.js"),i=I.indexOf("#I18N-PURE-BEGIN"),j=I.indexOf("/* #I18N-PURE-END */");const ctx={};vm.createContext(ctx);
  vm.runInContext(I.slice(I.indexOf("\n",i)+1,j)+";this.R={i18nText}",ctx);const T2=s=>ctx.R.i18nText(s);
  const K=tlKit();const X=K.ctx.BHTL_TX||vm.runInContext("BHTL_TX",K.ctx),SK=vm.runInContext("BHTL_SK",K.ctx),TP=vm.runInContext("BHTL_TIP",K.ctx);
  const all=[];const add=v=>{if(typeof v==="string")all.push(v);else if(Array.isArray(v))v.forEach(add);else if(v&&typeof v==="object")Object.values(v).forEach(add)};add(X);add(SK);add(TP);
  all.push("練習賽・星淵試陣","星淵試陣","練習賽","約 2 分鐘・不算輸贏","吃過河的卒、堵星門、放招、認陣眼子","✓ 已練過","推薦先練","第一次來星淵？","▶ 先練一盤","我會了，直接選關","跳過練習","繼續",
    "練習賽・過關","⚔ 開始第 1 關","↻ 再練一次","練習賽先到這裡","直接選關","跳過","繼續練","▶ 再玩一次練習賽","鐵連城","練習賽說明");
  const miss=all.filter(s=>{const r=T2(s);return r==null||/[㐀-鿿]/.test(r)});assert.deepEqual(miss,[],"翻不出來的："+miss.join("｜"));
});
