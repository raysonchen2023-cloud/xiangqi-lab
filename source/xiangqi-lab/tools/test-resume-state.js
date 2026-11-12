// 開頭畫面與續局狀態機（11/11 AI 模擬玩家第二輪問題 1）的自動測試。說明：xiangqi-db/story/88_開頭畫面與續局狀態機.md
// 不開瀏覽器：直接從 App 原始碼切出真正的程式放進 vm 跑——
//   xiangqi-db/m/05b-save.js：「開頭畫面狀態機」那一段（tsmProg／tsmMenu／tsmFirst／tsmContTxt）、JOURNEY_KEYS、saveApply、journeyStart
//   xiangqi-lab/src/local.js：整支跑兩份（兩個分頁）共用一個假 localStorage＋storage 事件：版本號 seq／tab、playSync、崩潰復原 xq_playPrev、換盤備份 xq_playBak、保存紀錄 xq_saveLog（評比循環第 2 輪）
// 用法：node --test xiangqi-lab/tools/test-resume-state.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const DB=path.join(__dirname,"../../xiangqi-db");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const SAVE=rd(path.join(DB,"m/05b-save.js")),LOCAL=rd(path.join(__dirname,"../src/local.js"));
function cut(src,a,b,name){const i=src.indexOf(a),j=src.indexOf(b,i+1);assert.ok(i>=0&&j>i,"找不到 "+name);return src.slice(i,j)}
const TSM_SRC=cut(SAVE,"/* ---------- 開頭畫面狀態機（","/* ---------- 開頭畫面狀態機：以上","05b-save.js 的開頭畫面狀態機");
const JK_SRC=cut(SAVE,"const JOURNEY_KEYS=","\nconst JK=new Set","05b-save.js 的 JOURNEY_KEYS");
const APPLY_SRC=cut(SAVE,"function saveApply(","\nfunction saveMetaNow(","05b-save.js 的 saveApply");
const START_SRC=cut(SAVE,"async function journeyStart(","\nfunction journeyRepick(","05b-save.js 的 journeyStart");
const SYNC_SRC=cut(LOCAL,"function playSync(","/* ---------- 多分頁：以上","local.js 的多分頁 playSync");
const J=x=>x===undefined?x:JSON.parse(JSON.stringify(x));

/* 假的 localStorage：Map 撐著，有 key(i)／length（tsmProgNow 要列全部的鍵） */
function fakeLS(init){const m=new Map(Object.entries(init||{}).map(([k,v])=>[k,typeof v==="string"?v:JSON.stringify(v)]));
  return{m,getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v))},removeItem:k=>{m.delete(k)},key:i=>[...m.keys()][i]??null,get length(){return m.size}}}
/* 一支手機：localStorage＋store（照 00-util.js 加 m_ 前綴），載入狀態機那一段 */
function phone(init,extra){const localStorage=fakeLS(init),calls=[];
  const store={get(k,d){const v=localStorage.getItem("m_"+k);if(v==null)return d;try{return JSON.parse(v)}catch(e){return d}},set(k,v){localStorage.setItem("m_"+k,JSON.stringify(v))}};
  const ctx={localStorage,store,calls,JSON,Object,Array,String,Math,Date,Set,Promise,Error,
    sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},location:{hash:"#/"},
    titleClose:()=>calls.push("titleClose"),goHome:()=>calls.push("goHome"),api:async(p,b)=>{calls.push(["api",p,b])},...(extra||{})};
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(TSM_SRC+"\n;this.T={tsmProg,tsmProgNow,tsmMenu,tsmFirst,tsmContTxt,TSM_PLAYED};",ctx);
  const T={};for(const k of Object.keys(ctx.T))T[k]=typeof ctx.T[k]==="function"?(...a)=>J(ctx.T[k](...a)):J(ctx.T[k]);
  return{ctx,T,ls:localStorage,store}}
const prog=init=>phone(init).T.tsmProgNow();
const G=(n,extra)=>({id:"2026-11-11T09-00-00",human:"r",level:3,result:null,moves:Array.from({length:n},(_,i)=>({f:i,t:i+9,by:i%2?"b":"r"})),...(extra||{})});

/* ---------- 有沒有進度（tsmProg） ---------- */
test("全新手機：什麼都沒有＝沒有進度",()=>{assert.deepEqual(prog({}),{game:false,run:false,rec:false,any:false})});

test("開機就會寫的鍵不算進度：空的 xq_play、今日茶單 m_cj、朝代、遊玩秒數、全 0 的電腦積分、空戰績",()=>{
  const p=prog({xq_play:G(0),m_cj:{day:"2026-11-11",ids:[1,2,3],solved:{}},m_era:"classic",m_jStars:{},m_playSec:0,m_lingN:3,
    xq_cpuRate:{pts:600,w:0,l:0,d:0,hist:[]},xq_record:{},m_record:{},m_firstWin:{at:1,skip:1},m_resumeLast:{r:null,t:{}},m_cjRun:null,m_jRunB:null});
  assert.equal(p.any,false,JSON.stringify(p))});

test("下到一半的對電腦棋（桌上那盤）＝game",()=>{const p=prog({xq_play:G(6)});assert.equal(p.game,true);assert.equal(p.any,true)});
test("下完的那盤還在桌上＝有紀錄（rec），不是 game",()=>{const p=prog({xq_play:G(30,{result:{w:"r",why:"將死"}})});assert.equal(p.game,false);assert.equal(p.rec,true);assert.equal(p.any,true)});
test("收起來的棋 xq_play2：新格式 {cpu,arena,journey,practice} 和舊格式（只有一盤）都認得",()=>{
  assert.equal(prog({xq_play:G(0),xq_play2:{arena:G(4,{arena:"tang"})}}).game,true);
  assert.equal(prog({xq_play2:G(3)}).game,true,"舊格式");
  assert.equal(prog({xq_play2:{cpu:G(0)}}).game,false,"收著的是空盤不算");
  assert.equal(prog({xq_play2:{cpu:G(5,{result:{w:"b"}})}}).game,false,"下完的不算下到一半")});
test("解到一半的殘局、關卡、主題訓練、棋力測驗＝run；解完的不算",()=>{
  assert.equal(prog({m_cjRun:{id:"c1",path:[[1,2]]}}).run,true);
  assert.equal(prog({m_cjRunS:{id:"s1",path:[[1,2]],ans:1}}).run,false,"已經看過答案");
  assert.equal(prog({m_jRunB:{id:"b1",k:2}}).run,true);
  assert.equal(prog({m_jRunB:{id:"b1",k:2,done:1}}).run,false,"關卡過完了");
  assert.equal(prog({m_jpRun:{id:"t",ids:[1,2,3],k:1}}).run,true);
  assert.equal(prog({m_quizRun:{sid:"q",a:[{id:1,ok:1}]}}).run,true);
  assert.equal(prog({m_quizRun:{sid:"q",a:[]}}).run,false)});
test("下過、解過、學過的紀錄＝rec",()=>{
  for(const [k,v] of [["xq_record",{3:{w:1,l:0,d:0}}],["m_record",{a:1}],["xq_arenaStamps",{tang:{at:"x"}}],["xq_cpuRate",{pts:620,w:1,l:0,d:0,hist:[]}],
    ["xq_cpuRate",{pts:600,w:0,l:0,d:0,hist:[{id:"bonus-x",res:"bonus"}]}],["m_cj",{solved:{c9:1}}],["m_campSeen",true],["m_xp",{n:10}],["m_onboard1",true],["m_quizBest",{rank:"業1"}]])
    assert.equal(prog({[k]:v}).rec,true,k+" 應該算紀錄")});
test("壞掉的 JSON 不會讓開頭畫面當掉",()=>{const p=prog({xq_play:"{壞掉",xq_play2:"[[",m_cjRun:"nope",xq_cpuRate:"?"});assert.equal(p.any,false)});

/* ---------- 開頭畫面 menu 的按鈕（tsmMenu） ---------- */
test("狀態表：有旅程／沒選角色有進度／沒選角色沒進度",()=>{const {T}=phone({});
  assert.deepEqual(T.tsmMenu({J:true,prog:true,slots:1,off:true}),["go","new","save"],"有旅程：▶ 繼續（角色）最上面");
  assert.deepEqual(T.tsmMenu({J:true,prog:false,slots:0,off:false}),["go","new","save"]);
  assert.deepEqual(T.tsmMenu({J:false,prog:true,slots:0,off:true}),["cont","story","xf","im"],"沒選角色但有進度：主按鈕是 ▶ 繼續，不逼選角");
  assert.deepEqual(T.tsmMenu({J:false,prog:true,slots:2,off:false}),["cont","story","save","im"]);
  assert.deepEqual(T.tsmMenu({J:false,prog:false,slots:0,off:true}),["new","later","xf","im"],"什麼都沒有：新的旅程，可以先逛逛");
  assert.deepEqual(T.tsmMenu({J:false,prog:false,slots:3,off:false}),["new","later","save","im"])});
test("沒選角色、有任何一種進度，主按鈕一定是 cont（不是 new）",()=>{const {T}=phone({});
  for(const init of [{xq_play:G(4)},{xq_play2:{journey:G(2,{journey:"park"})}},{m_cjRun:{id:1,path:[1]}},{xq_record:{1:{w:1}}},{m_campSeen:true}]){
    const p=prog(init);assert.equal(T.tsmMenu({J:false,prog:p.any,slots:0,off:true})[0],"cont",JSON.stringify(init))}});

/* ---------- 「先試一手」只給什麼都沒有的人（tsmFirst） ---------- */
test("先試一手：全部條件都沒有才出；任何一項（含進度）就不出",()=>{const {T}=phone({});
  assert.equal(T.tsmFirst({}),true);
  for(const k of ["fw","J","slots","old","dev","restored","noBoard","played","prog"])assert.equal(T.tsmFirst({[k]:k==="slots"?1:true}),false,k)});
test("模擬玩家情境：沒選角色、晉級賽下到一半，新分頁打開＝不出教學、主按鈕 ▶ 接著下",()=>{
  const {T}=phone({xq_play:G(12,{ranked:true}),m_saveMig1:1});const p=T.tsmProgNow();
  assert.equal(T.tsmFirst({prog:p.any}),false);assert.equal(T.tsmMenu({J:false,prog:p.any,slots:0,off:true})[0],"cont")});

/* ---------- cont 按鈕的字（tsmContTxt） ---------- */
test("cont 的字：有下到一半的棋＝▶ 接著下＋和誰、第幾回合；殘局＝題名；都沒有＝▶ 繼續",()=>{
  const {T}=phone({},{rsWho:g=>g.k==="cpu"?{who:"冷面國手",tag:"晉級賽"}:{title:"石桌往事"}});
  assert.deepEqual(T.tsmContTxt({g:{...G(7),k:"cpu"}}),{t:"▶ 接著下",s:"和冷面國手（晉級賽）的棋・第 4 回合"});
  assert.deepEqual(T.tsmContTxt({g:{...G(2),k:"journey"}}),{t:"▶ 接著下",s:"「石桌往事」・第 1 回合"});
  assert.deepEqual(T.tsmContTxt({cj:{t:"cj",nm:"🍵 一盞茶第 3 題",n:2}}),{t:"▶ 接著下",s:"「一盞茶第 3 題」還沒解完"});
  assert.deepEqual(T.tsmContTxt({cj:{t:"lv",nm:"守城第二關"}}),{t:"▶ 接著下",s:"「守城第二關」還沒過完"});
  assert.deepEqual(T.tsmContTxt({cj:{t:"qz"}}),{t:"▶ 接著下",s:"棋力測驗還沒做完"});
  assert.deepEqual(T.tsmContTxt(null),{t:"▶ 繼續",s:"回到首頁・戰績和進度都還在"})});

/* ---------- 第一次選角不清掉進度（journeyStart） ---------- */
function startPhone(init){const P=phone(init);const c=P.ctx;
  Object.assign(c,{WX_CHARS:{x_swordboy:{n:"阿轍",sx:"m",pc:"兵"}},fnStep(){},curSlot:()=>c.store.get("slotCur",0)|0,journey:()=>c.store.get("journey",null),
    saveNow:async()=>true,jHomePick:()=>"qin",applyEra(){},setMyName(){},saveReload:()=>c.calls.push("saveReload"),route(){},prologue(){},setTimeout:()=>0,Event:function(n){this.type=n},dispatchEvent(){}});
  vm.runInContext("let SAVE_LOCK=false;\n"+JK_SRC+"\nconst JK=new Set(JOURNEY_KEYS);\n"+APPLY_SRC+"\n"+START_SRC+"\n;this.journeyStart=journeyStart;",c);return P}
test("沒選過角色、有下到一半的棋和戰績：第一次選角＝進度留著（不再清掉 xq_play、xq_play2、戰績、積分）",async()=>{
  const P=startPhone({xq_play:G(8),xq_play2:{arena:G(3,{arena:"tang"})},xq_record:{3:{w:2,l:1,d:0}},xq_cpuRate:{pts:640,w:2,l:1,d:0,hist:[]},m_cjRun:{id:"c",path:[1]},m_firstWin:{at:1}});
  await P.ctx.journeyStart(1,"x_swordboy","小明",2);
  for(const k of ["xq_play","xq_play2","xq_record","xq_cpuRate","m_cjRun","m_firstWin"])assert.ok(P.ls.getItem(k)!=null,k+" 不該被清掉");
  assert.equal(JSON.parse(P.ls.getItem("xq_play")).moves.length,8);assert.equal(P.store.get("journey",null).c,"x_swordboy");assert.equal(P.store.get("slotCur",0),1)});
test("全新玩家（沒有進度）第一次選角：照舊先清掉開機寫的旅程鍵，firstWin 留著",async()=>{
  const P=startPhone({xq_play:G(0),m_jStars:{x:1},m_firstWin:{at:1}});
  await P.ctx.journeyStart(2,"x_swordboy",null,3);
  assert.equal(P.ls.getItem("m_jStars"),null,"開機寫的旅程鍵清掉");assert.equal(P.ls.getItem("xq_play"),null);assert.ok(P.ls.getItem("m_firstWin")!=null);assert.equal(P.store.get("diff",0),3)});
test("已經有旅程，再開新的旅程：照舊清掉（舊的那段在原本的存檔格），而且重新開啟",async()=>{
  const P=startPhone({m_journey:{c:"x_swordboy",born:1},m_slotCur:1,xq_play:G(8),xq_record:{3:{w:1}}});
  await P.ctx.journeyStart(2,"x_swordboy",null,2);
  assert.equal(P.ls.getItem("xq_play"),null);assert.equal(P.ls.getItem("xq_record"),null);assert.ok(P.ctx.calls.includes("saveReload"))});

/* ---------- 多分頁、版本號、崩潰復原、保存紀錄（local.js 整支跑兩份，共用同一個假 localStorage）----------
   評比循環第 2 輪 ChatGPT：兩分頁交錯落子不互蓋、幾乎同時落子時舊分頁不覆蓋新盤、寫到一半中斷（setItem 例外、JSON 壞掉）重開回到最後一個完整存檔、保存紀錄的事件順序。
   瀏覽器的 storage 事件只送給「其他」分頁、而且是之後才到：這裡寫入時先排進佇列，測試呼叫 N.flush() 才送（不 flush＝模擬事件還沒到的那幾十毫秒）。
   電腦那一方：假引擎永遠走第一個合法著法；假時鐘每次 Date.now() 跳 2 秒（跳過「至少等 1 秒再落子」），new Date() 每次跳 1 秒（對局 id 不會撞） */
const CORE_SRC=rd(path.join(__dirname,"../site/core.js")),C=require("../site/core.js");
class FD extends Date{constructor(...a){if(a.length)super(...a);else super(FD.t+=1000)}static now(){return FD.t+=2000}}
FD.t=Date.parse("2026-11-11T09:00:00Z");
function fakeIDB(){const data=new Map();return{open(){const r={};setImmediate(()=>{r.result={transaction(){const t={},store={
  get(k){const q={result:data.get(k)};setImmediate(()=>q.onsuccess&&q.onsuccess());return q},put(v,k){data.set(k,v);return{}},delete(k){data.delete(k);return{}}};
  t.objectStore=()=>store;setImmediate(()=>setImmediate(()=>t.oncomplete&&t.oncomplete()));return t}};r.onsuccess&&r.onsuccess()});return r}}}
function shared(init){const m=new Map(Object.entries(init||{})),tabs=[],q=[];let fail=null;
  const send=(from,key,oldValue,newValue)=>{for(const t of tabs)if(t!==from)q.push({t,e:{key,oldValue,newValue,storageArea:t.ls}})};
  return{m,tabs,q,failOn(f){fail=f},flush(){while(q.length){const{t,e}=q.shift();for(const[ty,f]of t.L)if(ty==="storage")f(e)}},
    mk(T){const S={getItem:k=>m.has(k)?m.get(k):null,setItem(k,v){if(fail&&fail(k))throw Object.assign(new Error("QuotaExceededError"),{name:"QuotaExceededError"});const o=S.getItem(k);v=String(v);m.set(k,v);if(o!==v)send(T,k,o,v)},
      removeItem(k){const o=S.getItem(k);if(o==null)return;m.delete(k);send(T,k,o,null)},key:i=>[...m.keys()][i]??null,get length(){return m.size}};return S}}}
function openTab(N,ss){const T={L:[],ev:[],timers:[],ss:ss||new Map()};T.ls=N.mk(T);N.tabs.push(T);
  const ctx={console,URL,URLSearchParams,setImmediate,Date:FD,setTimeout:(fn,ms)=>{T.timers.push({fn,ms});return T.timers.length},clearTimeout(){},setInterval:()=>0,clearInterval(){},
    localStorage:T.ls,sessionStorage:{getItem:k=>T.ss.has(k)?T.ss.get(k):null,setItem:(k,v)=>{T.ss.set(k,String(v))},removeItem:k=>{T.ss.delete(k)}},
    indexedDB:fakeIDB(),location:{href:"http://localhost/",hash:"",pathname:"/",search:""},history:{replaceState(){}},navigator:{onLine:true},
    Event:class{constructor(t){this.type=t}},CustomEvent:class{constructor(t,d){this.type=t;this.detail=d&&d.detail}},
    addEventListener:(t,f)=>{T.L.push([t,f])},removeEventListener(){},dispatchEvent:e=>{T.ev.push({type:e.type,detail:J(e.detail)});return true},
    document:{hidden:false,addEventListener(){}},atob:s=>Buffer.from(s,"base64").toString("binary"),
    XQEngine:{ready:true,search:async q=>{const S={moves:q.moves.map(u=>({f:C.parseSq(u.slice(0,2)),t:C.parseSq(u.slice(2,4))}))};C.stateRebuild(S);const[f,t]=C.legal(S.board,S.turn)[0];return{best:C.iccs(f,t),lines:[]}}}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(CORE_SRC,ctx,{filename:"core.js"});vm.runInContext(LOCAL,ctx,{filename:"local.js"});
  T.api=async(u,b)=>{const r=J(await ctx.XQ.api(u,b));if(r&&Array.isArray(r.legal))T.last=r;return r};T.log=ctx.XQ_saveLog;
  T.cpu=async()=>{const t=T.timers.filter(x=>x.fn.name==="playEngine");T.timers.length=0;for(const x of t)await x.fn()};
  /* 玩家照「這個分頁畫面上最後一次看到的盤面」點一步（T.last；還沒看過才先讀一次）——這樣才模擬得出舊分頁拿舊盤面落子 */
  T.move=async i=>{const s=T.last&&T.last.legal.length?T.last:await T.api("/play/state");const[f,t]=s.legal[i||0];return T.api("/play/move",{f,t})};
  return T}
const stored=N=>JSON.parse(N.m.get("xq_play"));
const evs=N=>JSON.parse(N.m.get("xq_saveLog")||"[]").map(x=>x.ev);
const others=T=>T.ev.filter(e=>e.type==="xq-play-other"),newer=T=>T.ev.filter(e=>e.type==="xq-play-newer");

test("多分頁：兩個分頁都掛 storage 事件；存檔最前面是 seq、tab（各分頁代號不同），每寫一次 seq +1",async()=>{
  const N=shared(),A=openTab(N),B=openTab(N);assert.equal(A.L.filter(([t])=>t==="storage").length,1);
  await A.api("/play/new",{human:"r",lx:3});const s1=stored(N);assert.match(N.m.get("xq_play"),/^\{"seq":\d+,"tab":"[\w-]+","id":"/);
  await A.move();const s2=stored(N);assert.equal(s2.seq,s1.seq+1);assert.equal(s2.tab,s1.tab);
  N.flush();await B.api("/play/state");await A.cpu();N.flush();
  const s3=stored(N);assert.equal(s3.moves.length,2);assert.equal(s3.seq,s2.seq+1);
  await B.move();const s4=stored(N);assert.notEqual(s4.tab,s3.tab,"B 分頁有自己的代號");assert.equal(s4.seq,s3.seq+1)});

test("多分頁：兩分頁交錯落子（A 走、B 接著走、A 再走…）不會互蓋：步數一路增加、兩邊看到同一盤",async()=>{
  const N=shared(),A=openTab(N),B=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});N.flush();await B.api("/play/state");
  const seen=[];
  for(let r=0;r<4;r++){const T=r%2?B:A,O=r%2?A:B;await T.move();await T.cpu();N.flush();
    const s=await O.api("/play/state");seen.push(s.moves.length);assert.equal(s.moves.length,stored(N).moves.length,"另一個分頁讀到最新的");
    assert.deepEqual(s.moves.map(m=>[m.f,m.t]),stored(N).moves.map(m=>[m.f,m.t]))}
  assert.deepEqual(seen,[2,4,6,8],"每一輪都多兩步（人一步、電腦一步），沒有被舊的蓋回去");
  assert.equal(newer(A).length+newer(B).length,0,"照順序交錯下不會誤報衝突");
  assert.ok(evs(N).includes("take"),"換分頁接著下＝記一筆「從另一個分頁接手」")});

test("多分頁：兩分頁幾乎同時落子（B 還沒收到 storage 事件）＝B 那一步不算、不覆蓋，提示「另一個分頁剛下了一步」並改看最新",async()=>{
  const N=shared(),A=openTab(N),B=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});N.flush();await B.api("/play/state");
  await A.move(0);const a=stored(N);
  const sb=await B.move(1);
  assert.deepEqual(stored(N),a,"localStorage 還是 A 那一版（seq、tab、步都沒變）");
  assert.equal(sb.moves.length,1);assert.deepEqual([sb.moves[0].f,sb.moves[0].t],[a.moves[0].f,a.moves[0].t],"B 畫面改成 A 下的那一步");
  assert.equal(newer(B).length,1,"B 收到 xq-play-newer（畫面提示）");assert.equal(evs(N)[0],"clash");
  N.flush();assert.equal(newer(A).length,0)});

test("多分頁：事件已經到了但 B 畫面還是舊的（還沒重新讀）＝一樣不算那一步",async()=>{
  const N=shared(),A=openTab(N),B=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});N.flush();await B.api("/play/state");
  await A.move(0);N.flush();const sb=await B.move(1);assert.equal(sb.moves.length,1);assert.equal(stored(N).moves.length,1);assert.equal(newer(B).length,1)});

test("多分頁：兩個分頁都替電腦算了一步（寫入的那一刻才撞）＝後寫的不覆蓋（版本號擋下），丟掉自己那份",async()=>{
  const N=shared(),A=openTab(N),B=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});await A.move();N.flush();await B.api("/play/state");
  await A.cpu();const a=stored(N);assert.equal(a.moves.length,2);
  await B.cpu();assert.deepEqual(stored(N),a,"B 的電腦著法沒寫進去（seq、tab 還是 A 的）");assert.equal(newer(B).length,1);
  const sb=await B.api("/play/state");assert.equal(sb.moves.length,2);assert.equal(sb.id,a.id)});

test("多分頁：另一個分頁在同一盤走了一步＝不提示換盤；開了別盤（同一種）＝提示一次、原本那盤留備份、紀錄有「被另一個分頁換盤」可以 ↩ 回去",async()=>{
  const N=shared(),A=openTab(N),B=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});await A.move();await A.cpu();const old=stored(N);N.flush();
  await B.move();await B.cpu();N.flush();assert.equal(others(A).length,0,"同一盤：不提示");
  await B.api("/play/new",{human:"r",lx:5});const nw=stored(N);assert.notEqual(nw.id,old.id);N.flush();
  assert.deepEqual(others(A),[{type:"xq-play-other",detail:{id:nw.id,was:old.id}}]);
  const bak=JSON.parse(N.m.get("xq_playBak"));assert.equal(bak[0].id,old.id);assert.equal(bak[0].moves.length,4,"備份是被換掉前的最後一版（B 下過的也在）");
  const L=await A.api("/play/log");assert.equal(L.log[0].ev,"swap");assert.equal(L.log[0].id,old.id);assert.equal(L.log[0].to,nw.id);assert.deepEqual(L.can,[old.id]);
  await B.move();N.flush();
  const r=await A.api("/play/restore",{id:old.id});assert.equal(r.id,old.id);assert.equal(r.moves.length,4);
  const S2=JSON.parse(N.m.get("xq_play2"));assert.equal(S2.cpu.id,nw.id,"桌上那盤（B 開的、下了一步）收進收納格，沒丟");
  assert.deepEqual(JSON.parse(N.m.get("xq_playBak")),[]);assert.equal(evs(N)[0],"back");
  assert.deepEqual((await A.api("/play/log")).can,[],"已經回來了，不再顯示 ↩")});

test("多分頁：另一個分頁開了別種棋＝原本那盤收進 xq_play2（不另存備份），一樣可以 ↩ 回去",async()=>{
  const N=shared(),A=openTab(N),B=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});await A.move();await A.cpu();const old=stored(N);N.flush();await B.api("/play/state");
  await B.api("/play/switch",{kind:"arena",level:3});N.flush();
  assert.equal(others(A).length,1);assert.equal(N.m.get("xq_playBak")||null,null);assert.equal(JSON.parse(N.m.get("xq_play2")).cpu.id,old.id);
  const L=await A.api("/play/log");assert.deepEqual(L.can,[old.id]);assert.deepEqual(evs(N).slice(0,2),["swap","stash"]);
  const r=await A.api("/play/restore",{id:old.id});assert.equal(r.kind,"cpu");assert.equal(r.moves.length,2)});

test("多分頁：被清掉（讀檔、開新旅程、localStorage.clear）＝提示、記「清掉了」，不留備份；別的鍵、sessionStorage 的事件、本來就沒載入的分頁都不動",async()=>{
  const N=shared(),A=openTab(N),B=openTab(N),Cx=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});await A.move();N.flush();await B.api("/play/state");
  for(const[t,f]of B.L)if(t==="storage"){f({key:"m_era",oldValue:null,newValue:'"tang"',storageArea:B.ls});f({key:"xq_play",oldValue:null,newValue:"{}",storageArea:{tag:"ss"}})}
  assert.equal(others(B).length,0);
  B.ls.removeItem("xq_play");N.flush();assert.equal(others(A).length,1);assert.equal(others(A)[0].detail.id,null);assert.equal(evs(N)[0],"gone");assert.equal(N.m.get("xq_playBak")||null,null);
  assert.equal(others(Cx).length,0,"沒載入過桌上那盤的分頁不提示");
  for(const[t,f]of A.L)if(t==="storage")f({key:null,oldValue:null,newValue:null,storageArea:A.ls});assert.equal(others(A).length,1,"已經提示過、現在也不知道哪一盤＝不重複提示")});

test("崩潰：寫入時 setItem 丟例外（空間不足）＝舊的那版原封不動；重開回到最後一個完整存檔，紀錄有「存檔失敗」「重開後接續」",async()=>{
  const N=shared(),A=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});await A.move();await A.cpu();const good=N.m.get("xq_play");
  N.failOn(k=>k==="xq_play");await A.move().catch(()=>{});assert.equal(N.m.get("xq_play"),good,"中斷的那一步沒寫進去，舊版完整");assert.equal(evs(N)[0],"fail");
  N.failOn(null);const R=openTab(N),s=await R.api("/play/state");assert.equal(s.id,JSON.parse(good).id);assert.equal(s.moves.length,2);
  assert.equal(evs(N)[0],"reopen")});

test("崩潰：xq_play 壞掉（JSON 斷在一半）＝重開改讀 xq_playPrev（上一個完整存檔）、寫回去，紀錄有「改讀上一份完整存檔」；兩份都壞＝開新的、不當掉",async()=>{
  const N=shared(),A=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});await A.move();await A.cpu();await A.move();
  const last=stored(N),prev=JSON.parse(N.m.get("xq_playPrev"));assert.equal(last.moves.length,3);assert.equal(prev.moves.length,2);
  const raw=N.m.get("xq_play");N.m.set("xq_play",raw.slice(0,raw.length>>1));
  const R=openTab(N),s=await R.api("/play/state");assert.equal(s.id,last.id);assert.equal(s.moves.length,2,"回到上一個完整存檔");
  assert.equal(stored(N).moves.length,2,"已經寫回一份好的");assert.equal(evs(N)[0],"fix");assert.equal(JSON.parse(N.m.get("xq_playPrev")).moves.length,2,"上一版沒被壞掉的那份蓋掉");
  await R.move();assert.equal(stored(N).moves.length,3,"之後照常存");
  N.m.set("xq_play","{壞");N.m.set("xq_playPrev","[[");const R2=openTab(N),s2=await R2.api("/play/state");assert.equal(s2.moves.length,0);assert.ok(stored(N).id)});

test("保存紀錄：事件順序（新的在前）、連續自動存檔合成一筆、最多 20 筆、不存棋譜",async()=>{
  const N=shared(),A=openTab(N);
  await A.api("/play/new",{human:"r",lx:3});await A.move();await A.cpu();await A.move();await A.cpu();
  let L=JSON.parse(N.m.get("xq_saveLog"));assert.deepEqual(L.map(x=>x.ev),["auto"]);assert.equal(L[0].n,4);assert.equal(L[0].c,4);assert.equal(L[0].k,"cpu");
  const B=openTab(N);await B.api("/play/state");await B.move();
  await B.api("/play/switch",{kind:"arena",level:3});
  B.log("drop",{id:"x1",journey:"park",moves:[{f:1,t:2}]});B.log("keep");B.log("hack",{id:"z"});
  L=JSON.parse(N.m.get("xq_saveLog"));
  assert.deepEqual(L.map(x=>x.ev),["keep","drop","stash","take","reopen","auto"],"選角保留→放棄→收起來→從另一個分頁接手→重開後接續→自動存檔");
  assert.equal(L[3].n,5);assert.equal(L[1].k,"journey");assert.equal(L[1].jn,"park");assert.equal(L[0].id,undefined,"選角時桌上沒有下到一半的棋（剛換成空的擂台）＝不記哪一盤");
  for(let i=1;i<L.length;i++)assert.ok(L[i-1].at>=L[i].at,"時間由新到舊");
  for(const x of L)for(const k of Object.keys(x))assert.ok(["at","ev","id","k","n","rkd","ar","jn","pt","dr","end","to","tk","c","tab"].includes(k),"沒有多存別的欄位："+k);
  assert.ok(!N.m.get("xq_saveLog").includes('"moves"'),"不存棋譜");
  for(let i=0;i<30;i++)B.log("drop",{id:"g"+i,moves:[]});assert.equal(JSON.parse(N.m.get("xq_saveLog")).length,20)});

/* ---------- 原始碼有接上（防止之後改壞） ---------- */
test("〔原始碼〕開頭畫面 menu 照 tsmMenu 排、fwNeed 走 tsmFirst、journeyStart 只在 had 或沒進度時清、local.js 舊分頁不寫回",()=>{
  assert.match(SAVE,/view==="menu"\)\{[^\n]*\n\s*const BL=tsmMenu\(/);
  assert.match(SAVE,/function fwNeed\(\)\{try\{return tsmFirst\(/);
  assert.match(START_SRC,/if\(had\|\|!tsmProgNow\(\)\.any\)\{const fw=localStorage\.getItem\("m_firstWin"\),fr=!!store\.get\("bhxFresh",0\),xu=fr\?localStorage\.getItem\("m_bhXuDone"\):null,xp=fr\?localStorage\.getItem\("m_bhxPick"\):null;saveApply\(\{\}\)/,"開發者 11/12：只有在這一趟開頭選好角色（bhxFresh）才把序局紀錄帶進新旅程；一般新旅程從開頭來");
  assert.match(LOCAL,/analyzeList\(S,\(\)=>\{if\(P===S\)savePlay\(\)\},\(\)=>P!==S\|\|/);
  assert.match(LOCAL,/function savePlay\(\)\{return playWrite\(true\)\}/);
  assert.match(LOCAL,/if\(VER!=null&&v!==VER\)\{const G=P;P=null;VER=null;saveLog\("clash",G\)/);
  assert.match(LOCAL,/async function playPostIn\(p,b\)\{if\(ensureP\(\)&&PLAY_MUT\.has\(p\)\)/);
  assert.match(LOCAL,/navigator\.locks\.request\("xq-play-write",\(\)=>playPostIn\(p,b\)\)/);   /* 評比第 3 輪：會改盤面的動作用 Web Locks 排隊 */
  const RS=rd(path.join(DB,"m/07m4-resume.js"));
  assert.ok(RS.includes('addEventListener("xq-play-other",rsOther)'));assert.ok(RS.includes('addEventListener("xq-play-newer"'));assert.ok(RS.includes('XQ_saveLog("drop",g)'));
  assert.match(SAVE,/data-rl="1">🧾 對局保存紀錄/);assert.match(START_SRC,/else try\{if\(window\.XQ_saveLog\)XQ_saveLog\("keep"\)\}/);
  assert.match(JK_SRC,/"play","play2","playPrev","playBak"\]/)});
