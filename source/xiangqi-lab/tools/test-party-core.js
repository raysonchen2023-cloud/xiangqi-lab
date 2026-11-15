// 七星陸續加入與各自等級（開發者 11/15；m/07pty-party.js 的 PTY 純規則）單元測試。不開瀏覽器：
//   經驗曲線與 07-legend 一致、新旅程只有齊轍、舊存檔轉換、加入起始等級、全隊自動＋星輝、分配上限、這一站要遇到誰、修為只提醒。
// 用法：node --test xiangqi-lab/tools/test-party-core.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const SRC=rd("xiangqi-db/m/07pty-party.js"),LEG=rd("xiangqi-db/m/07-legend.js"),SAVE=rd("xiangqi-db/m/05b-save.js");
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(SRC.slice(0,SRC.indexOf("/* ===== 存檔層"))+"\n;this.PTY=PTY;",ctx);const T=ctx.PTY;
const J=x=>JSON.parse(JSON.stringify(x));

test("經驗曲線跟 07-legend.js 的 xpNeed 一樣；base／lvOf／cap 互相對得上", ()=>{
  assert.ok(LEG.includes("xpNeed=L=>60+20*L"),"07-legend 的曲線沒變");
  for(const L of[1,2,5,9,11,30,99]){assert.equal(T.lvOf(T.base(L)),L);assert.equal(T.lvOf(T.cap(L)),L,"cap 還在 L 級");assert.equal(T.lvOf(T.cap(L)+1),L+1)}
  assert.equal(T.base(1),0);assert.equal(T.base(2),80);assert.equal(T.base(3),180)});

test("新旅程只有齊轍；隊長、首頁小人都是齊轍", ()=>{
  const P=T.fresh(1);assert.deepEqual(J(T.members(P)),["x_swordboy"]);assert.equal(P.lead,"x_swordboy");assert.equal(P.look,"x_swordboy");assert.equal(P.pool,0)});

test("舊存檔轉換：齊轍＋原本選的角色＋停靠過任一主場站的人；每位等級＝當時修為；原角色當隊長和首頁小人", ()=>{
  const P=T.migrate({c:"x_martialgirl"},["classic","song","qin","han"],10,5);
  assert.deepEqual(J(T.members(P)),["x_swordboy","x_miaogirl","x_martialgirl"],"song 是花兒的家鄉、han 是小梅的主場");
  for(const c of T.members(P))assert.equal(T.lv(P,c,10),10);
  assert.equal(P.lead,"x_martialgirl");assert.equal(P.look,"x_martialgirl");assert.equal(P.pool,0);
  for(const c of T.members(P))assert.equal(P.seen[c],1,"舊玩家不重播加入卡");
  const Q=T.migrate({c:"x_shuai"},["classic","ming","qin"],3,0);assert.deepEqual(J(T.members(Q)),["x_swordboy","x_shuai","x_shi"],"明朝是帥仕共同的主場");
  const R=T.migrate({c:"nobody"},[],1,0);assert.deepEqual(J(T.members(R)),["x_swordboy"]);assert.equal(R.lead,"x_swordboy")});

test("加入：從修為 −2 級起步（至少 1）；已經在隊上的不動", ()=>{
  const P=T.fresh(0);assert.ok(T.join(P,"x_miaogirl",9,1));assert.equal(T.lv(P,"x_miaogirl",9),7);
  assert.ok(T.join(P,"x_shuai",2,1));assert.equal(T.lv(P,"x_shuai",2),1,"修為 2 → 起步 1");
  P.m.x_miaogirl.xp+=50;const x=P.m.x_miaogirl.xp;assert.equal(T.join(P,"x_miaogirl",20,1),false);assert.equal(P.m.x_miaogirl.xp,x,"不重設經驗");
  assert.equal(T.join(P,"nobody",5,1),false)});

test("修為加 n：已加入的每位自動 +n×50%，星輝 +n×50%；頂到修為上限的那份轉進星輝", ()=>{
  const P=T.fresh(0);T.join(P,"x_miaogirl",3,0);P.m.x_swordboy.xp=T.base(3);
  const before=J(P.m);T.gain(P,40,3);
  assert.equal(P.m.x_swordboy.xp,before.x_swordboy.xp+20);assert.equal(P.m.x_miaogirl.xp,before.x_miaogirl.xp+20);assert.equal(P.pool,20);
  P.m.x_swordboy.xp=T.cap(3)-5;P.pool=0;T.gain(P,40,3);assert.equal(P.m.x_swordboy.xp,T.cap(3),"頂到上限");assert.equal(P.pool,20+15,"多的 15 轉進星輝");
  assert.equal(T.lv(P,"x_swordboy",3),3,"不超過修為");assert.equal(T.gain(P,0,3),0)});

test("分星輝：不超過星輝、不超過修為上限；沒加入的人分不到", ()=>{
  const P=T.fresh(0);P.pool=500;assert.equal(T.give(P,"x_swordboy",100,5),100);assert.equal(P.pool,400);
  const room=T.cap(5)-P.m.x_swordboy.xp;assert.equal(T.give(P,"x_swordboy",9999,5),Math.min(400,room));
  assert.equal(T.lv(P,"x_swordboy",5),5);assert.equal(T.give(P,"x_bing",10,5),0,"還沒加入");
  P.pool=3;assert.equal(T.give(P,"x_swordboy",10,99),3,"星輝只剩 3")});

test("這一站要遇到誰：漢＝小梅、三國＝庭哥和城子、五代＝花兒；已加入的不再遇到", ()=>{
  const P=T.fresh(0);assert.deepEqual(J(T.pendingAt(P,"han")),["x_miaogirl"]);assert.deepEqual(J(T.pendingAt(P,"sanguo")),["x_shuai","x_shi"]);
  assert.deepEqual(J(T.pendingAt(P,"wudai")),["x_martialgirl"]);assert.deepEqual(J(T.pendingAt(P,"tang")),[],"唐朝是城子的主場，但不是加入站");
  T.join(P,"x_miaogirl",4,0);assert.deepEqual(J(T.pendingAt(P,"han")),[]);
  assert.deepEqual(J(Object.values(T.JOIN).map(j=>j.st)),["han","sanguo","sanguo","weijin","sui","wudai"]);
  for(const[c,j]of Object.entries(T.JOIN))if(c!=="x_shi")assert.ok(T.HOMES[c].includes(j.st),c+" 的加入站是他的主場");
  assert.ok(!T.HOMES.x_shi.includes("sanguo"),"城子是跟著庭哥在三國加入，三國不是他的主場")});

test("舊存檔轉換：停靠過三國的舊玩家，庭哥和城子一起在隊上（城子是跟著庭哥加入的）", ()=>{
  const P=T.migrate({c:"x_miaogirl"},["classic","yuan","qin","han","sanguo"],6,0);
  assert.deepEqual(J(T.members(P)),["x_swordboy","x_miaogirl","x_shuai","x_shi"])});

test("修為只提醒、不自動加入：到了等級才列出、照加入順序、提醒過的不再列", ()=>{
  const P=T.fresh(0);assert.deepEqual(J(T.hints(P,3)),[]);assert.deepEqual(J(T.hints(P,5)),["x_miaogirl","x_shuai","x_shi"]);
  P.hint.x_miaogirl=1;assert.deepEqual(J(T.hints(P,5)),["x_shuai","x_shi"]);assert.deepEqual(J(T.members(P)),["x_swordboy"],"提醒不會加入");
  assert.equal(T.next(P),"x_miaogirl")});

test("木棋靈等級＝修為的一半（至少 1）；沒加入的角色等級是 0", ()=>{
  assert.equal(T.wood(1),1);assert.equal(T.wood(9),4);assert.equal(T.wood(20),10);assert.equal(T.lv(T.fresh(0),"x_bing",20),0)});

test("讀進來的壞資料會整理：不認得的角色丟掉、缺齊轍補回、隊長／首頁小人不在隊上就改回", ()=>{
  const P=T.norm({m:{x_miaogirl:{xp:"120"},bad:{xp:5}},pool:-3,lead:"x_bing",look:"x_miaogirl",seen:{x_miaogirl:true,zz:1}});
  assert.deepEqual(J(T.members(P)),["x_swordboy","x_miaogirl"]);assert.equal(P.m.x_miaogirl.xp,120);assert.equal(P.pool,0);
  assert.equal(P.lead,"x_swordboy");assert.equal(P.look,"x_miaogirl");assert.deepEqual(J(P.seen),{x_miaogirl:1});assert.equal(T.norm(null),null)});

test("〔原始碼〕主場表跟 05b-save.js 的 CHAR_HOMES 一樣；pty 前綴只在這支檔定義", ()=>{
  const m=/CHAR_HOMES=(\{[^}]*\})/.exec(SAVE);assert.ok(m);const H=new Function("return "+m[1])();assert.deepEqual(J(T.HOMES),H);
  const dir=path.join(ROOT,"xiangqi-db/m");for(const f of fs.readdirSync(dir).filter(f=>f.endsWith(".js")&&f!=="07pty-party.js")){
    const s=fs.readFileSync(path.join(dir,f),"utf8");assert.ok(!/(?:function|const|let|var)\s+(?:pty|PTY)[A-Za-z_$]/.test(s),f+" 不能另外定義 pty 開頭的名字")}});

/* ===== 存檔層（整支模組＋假的 store）：舊存檔轉換、經驗分配、換首頁小人、起航閘門、解題加入 ===== */
function world(o){o=o||{};const S=new Map(Object.entries(o.store||{}).map(([k,v])=>[k,JSON.parse(JSON.stringify(v))]));const ev=[];
  const c={console,Math,JSON,Date,setTimeout:()=>0,store:{get:(k,d)=>S.has(k)?JSON.parse(JSON.stringify(S.get(k))):d,set:(k,v)=>{S.set(k,v==null?v:JSON.parse(JSON.stringify(v)))}},
    window:{dispatchEvent:e=>ev.push(e.type)},Event:function(t){this.type=t},document:{querySelector:()=>null},
    WX_CHARS:{x_swordboy:{n:"齊轍",pc:"俥",sx:"m"},x_miaogirl:{n:"駱躍梅",pc:"傌",sx:"f"},x_martialgirl:{n:"雷借花",pc:"炮",sx:"f"},x_shuai:{n:"沈方庭",pc:"帥",sx:"m"},x_shi:{n:"鐵連城",pc:"仕",sx:"m"},x_spiritgirl:{n:"田飛燕",pc:"相",sx:"f"},x_bing:{n:"步越溪",pc:"兵",sx:"f"}},
    shipDockList:()=>S.get("shipDock")||[],shipFront:()=>{const D=S.get("shipDock")||[];return D[D.length-1]||null},shipRec:(k,id)=>((S.get("shipSolved")||{})[k]||{})[id]||null,esc:x=>String(x)};
  vm.createContext(c);vm.runInContext(SRC+"\n;this.PTY=PTY;",c);c.xpInfo=()=>({L:c.PTY.lvOf(S.get("xp")||0)});return{c,S,ev}}

test("〔行為〕存檔層：沒有旅程就沒有隊伍、等級照修為；舊存檔第一次讀到就轉換並存起來，之後不再轉", ()=>{
  const A=world({store:{xp:500}});assert.equal(A.c.ptyGet(),null);assert.equal(A.c.ptyLv("x_bing"),A.c.PTY.lvOf(500));
  const B=world({store:{journey:{c:"x_martialgirl"},shipDock:["classic","song","qin","han"],xp:T.base(6)}});const P=B.c.ptyGet();
  assert.deepEqual(J(B.c.PTY.members(P)),["x_swordboy","x_miaogirl","x_martialgirl"]);assert.ok(B.S.get("party"),"轉換完存起來");
  assert.equal(B.c.ptyLv("x_martialgirl"),6);assert.equal(B.c.ptyLead(),"x_martialgirl");
  B.S.set("shipDock",["classic","song","qin","han","sanguo"]);assert.deepEqual(J(B.c.PTY.members(B.c.ptyGet())),["x_swordboy","x_miaogirl","x_martialgirl"],"已經有隊伍就不再照停靠站重算");
  assert.equal(B.c.ptyLv("x_bing"),3,"沒加入的（木棋靈）＝修為的一半")});

test("〔行為〕存檔層：修為加了就分給全隊與星輝；換首頁小人會同步 pChar、本命棋子並通知小人換人；不在隊上的不能當隊長", ()=>{
  const W=world({store:{journey:{c:"x_swordboy"},party:T.fresh(0),xp:T.base(3)}});W.c.ptyJoin("x_miaogirl");
  const x0=J(W.S.get("party").m);W.c.ptyOnXp(40);const P=W.S.get("party");
  assert.equal(P.m.x_swordboy.xp,x0.x_swordboy.xp+20);assert.equal(P.m.x_miaogirl.xp,x0.x_miaogirl.xp+20);assert.equal(P.pool,20);
  assert.ok(W.c.ptySetLook("x_miaogirl"));assert.equal(W.S.get("pChar"),"x_miaogirl");assert.equal(W.S.get("botPiece"),"傌");assert.ok(W.ev.includes("xq-look"));
  assert.equal(W.c.ptySetLead("x_bing"),false);assert.ok(W.c.ptySetLead("x_miaogirl"));assert.equal(W.c.ptyLead(),"x_miaogirl");
  assert.equal(W.c.ptySetLook("x_bing"),false,"還沒加入的不能陪你走")});

test("〔行為〕星槎：停在漢朝、還沒幫小梅就不能起航；解開下船那一題她就加入；題目先在聽書裡解過，起航時補加入、不擋", ()=>{
  const W=world({store:{journey:{c:"x_swordboy"},party:T.fresh(0),shipDock:["classic","qin","han"],xp:T.base(4)}});
  const N=W.c.ptySailBlock();assert.equal(N.k,"han");assert.equal(N.pty,"x_miaogirl");
  W.c.ptyOnSolve("han","xs-han-1");assert.equal(W.c.ptyHas("x_miaogirl"),false,"別題不算");
  W.c.ptyOnSolve("han","xs-han-0");assert.ok(W.c.ptyHas("x_miaogirl"));assert.equal(W.c.ptySailBlock(),null);
  assert.equal(W.c.ptyLv("x_miaogirl"),2,"修為 4 → 起步 2");
  const V=world({store:{journey:{c:"x_swordboy"},party:T.fresh(0),shipDock:["classic","qin","han","sanguo"],shipSolved:{sanguo:{"xs-sanguo-0":{at:1}}}}});
  assert.equal(V.c.ptySailBlock(),null);assert.ok(V.c.ptyHas("x_shuai")&&V.c.ptyHas("x_shi"),"庭哥和城子一起補加入");
  const U=world({store:{journey:{c:"x_swordboy"},party:T.fresh(0),shipDock:["classic","qin"]}});assert.equal(U.c.ptySailBlock(),null,"秦朝站沒有人要加入")});

test("〔行為〕修為到了只提醒一次、不加入", ()=>{
  const W=world({store:{journey:{c:"x_swordboy"},party:T.fresh(0),xp:T.base(5)}});W.c.ptyOnXp(10);const P=W.S.get("party");
  assert.deepEqual(J(Object.keys(P.hint)),["x_miaogirl","x_shuai","x_shi"]);assert.deepEqual(J(W.c.PTY.members(P)),["x_swordboy"])});

test("〔原始碼〕接線：新旅程一律齊轍並建隊伍、party 跟存檔格走、修為分給全隊、黑洞三玩法看隊長與他的等級、序局不讓選角、新手畢業直接出發、星槎三個接點、卡冊入口、m.html 有這支檔", ()=>{
  const M=f=>rd("xiangqi-db/m/"+f);
  assert.match(SAVE,/async function journeyStart\(n,c,nm,df\)\{c="x_swordboy";/);assert.ok(SAVE.includes('if(typeof ptyFresh==="function")ptyFresh()'));
  assert.ok(SAVE.includes('const JOURNEY_KEYS=["sw7Box","pSex","pChar","pStyle","party",'));assert.ok(SAVE.includes("if(P&&P.look)want=P.look"),"開機修正 pChar 改看首頁小人");
  assert.ok(LEG.includes('if(typeof ptyOnXp==="function")ptyOnXp(n+bonus)'));assert.ok(LEG.includes('if(typeof ptySheet==="function"&&journey())return ptySheet()'));
  for(const[f,ch,lv]of[["07bht-td.js","bhtdChar","bhtdL"],["07bhg-gatesiege.js","gsvChar","gsvL"],["07bhw-wheel.js","whlCk","whlL"]]){const s=M(f);
    assert.ok(s.includes(`const ${ch}=()=>{let c="";try{c=typeof ptyLead==="function"?ptyLead():`),f+" 取隊長");assert.ok(s.includes(`const ${lv}=c=>{try{if(typeof ptyLv==="function")return ptyLv(c||${ch}());`),f+" 取那位的等級")}
  const BH=M("07bh-blackhole.js");assert.match(BH,/function bhxPick\(o,cap,cb\)\{const k="x_swordboy";/);assert.ok(BH.includes("function bhxPickChoose(o,cap,cb)"),"舊的點星選角留著");
  const STQ=M("07stq-starter.js");assert.ok(STQ.includes('class="stq-go">出發</button>'));assert.ok(STQ.includes("stqPick(STQ_C0)"));
  const SH=M("07f-ship.js");assert.ok(SH.includes('if(first&&typeof ptyOnSolve==="function")ptyOnSolve(k,id)'));assert.ok(SH.includes('if(pb){ptyGateSay(pb);return}'));assert.ok(SH.includes('if(typeof ptyArrive==="function"&&ptyArrive(k,done))return;'));
  assert.ok(M("07dgl-stamina.js").includes('id="dglPty">雲河七星</button>'));
  assert.match(rd("xiangqi-db/m.html"),/\/\/#include m\/07-legend\.js\n\/\/#include m\/07pty-party\.js\n/)});

test("〔行為〕跳字頭像：已加入的回他的頭像（大小寫都認）、還沒加入的（木棋靈）不顯示", ()=>{
  const W=world({store:{journey:{c:"x_swordboy"},party:T.fresh(0)}});assert.equal(W.c.ptyAv("R"),"data/xs/prev_x_swordboy.webp");assert.equal(W.c.ptyAv("n"),null);
  W.c.ptyJoin("x_miaogirl");assert.equal(W.c.ptyAv("n"),"data/xs/prev_x_miaogirl.webp");assert.equal(W.c.ptyAv("Z"),null)});
