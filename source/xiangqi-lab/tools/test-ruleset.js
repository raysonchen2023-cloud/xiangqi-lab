// 11/11 Gemini 架構報告第一項（評比循環 F3「多棋規與臺灣棋規可切換原型」）的自動測試。處理紀錄：xiangqi-db/story/100_Gemini架構報告處理.md
// 不開瀏覽器：
//   core（site/core.js，由 xiangqi-referee.js 建）：棋規註冊表 RULESETS、ruleConfig／ruleConfigOf（舊存檔補預設、防手改）、tw_proto 的循環改提示、repetitionWarning 預警事件
//   m/08b-cpugame.js 的 repWarn：只照 core 的預警事件顯示，自己不再重播、不呼叫 judgeState
//   src/local.js 整支放進 vm：挑戰電腦／同機／車輪戰／殘局的 rc、晉級賽一律千秋休閒規則、手改成原型棋規的晉級賽不計分
//   src/net.js 放進 vm（記憶體 transport）：邀請帶 rs、棋規相同才 ranked、不同或原型＝友誼賽不計分、下到一半不能換棋規
// 用法：node --test xiangqi-lab/tools/test-ruleset.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const LAB=path.join(__dirname,".."),DB=path.join(LAB,"../xiangqi-db");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const C=require("../site/core.js"),CORE_SRC=rd(path.join(LAB,"site/core.js")),LOCAL=rd(path.join(LAB,"src/local.js"));
const sq=C.parseSq,J=x=>x===undefined?x:JSON.parse(JSON.stringify(x));
function start(pieces,side="r",rc){
  const b=Array(90).fill(null);for(const [q,p]of Object.entries(pieces))b[sq(q)]=p;
  const S={id:"t",start:C.fen(b,side).split(" ")[0],startTurn:side,moves:[]};if(rc)S.rc=rc;C.stateRebuild(S);return S}
function play(S,list){for(const u of list){const f=sq(u.slice(0,2)),t=sq(u.slice(2));
  assert.ok(C.legal(S.board,S.turn).some(([x,y])=>x===f&&y===t),"棋步要合法："+u);C.stateApply(S,f,t)}return S}
const TW=C.ruleConfig("tw_proto","casual"),QQ=C.ruleConfig("qiqiu_casual","casual");
const perpetual=rc=>start({d0:"K",f9:"k",e7:"R"},"r",rc),pc=["e7f7","f9e9","f7e7","e9f9"];
const chase=rc=>start({d0:"K",f9:"k",c3:"R",b7:"n"},"r",rc),cc=["c3b3","b7c5","b3c3","c5b7"];
const idle=rc=>start({d0:"K",f9:"k",a1:"R",i8:"r"},"r",rc),ic=["a1a2","i8i7","a2a1","i7i8"];
const occ0=rc=>start({d0:"K",f0:"A",e9:"k",c5:"C",e7:"n",c9:"r"},"r",rc),occ=["c5e5","e7c8","e5c5","c8e7"];

/* ---------- 註冊表與棋規設定 ---------- */
test("註冊表：預設千秋休閒規則（可計分）；臺灣規程只是原型（不計分），差異條目分清楚已查證／未查證",()=>{
  assert.equal(C.RULESET_DEFAULT,"qiqiu_casual");assert.deepEqual(Object.keys(C.RULESETS).sort(),["qiqiu_casual","tw113","tw_proto"]);   /* 11/12 加臺灣棋規正式版 tw113（測試在 test-ruleset-cases.js） */
  const Q=C.RULESETS.qiqiu_casual,T=C.RULESETS.tw_proto;
  assert.equal(Q.status,"implemented");assert.equal(Q.rated,true);assert.match(Q.basis,new RegExp(C.REP_RULES.id));
  assert.equal(T.status,"prototype");assert.equal(T.rated,false);assert.match(T.name,/原型/);
  assert.ok(T.diffs.some(d=>d.verified===true&&/經裁判裁決/.test(d.tw)),"查得到的那條要附規程原文");
  assert.ok(T.diffs.filter(d=>!d.verified).every(d=>d.tw==="未查證"),"沒查到的照實寫未查證");
  assert.ok(Object.isFrozen(C.RULESETS)&&Object.isFrozen(T),"註冊表不能被改")});
test("ruleConfig：欄位齊全、凍結；原型棋規要 ranked 也只給 casual",()=>{
  const r=C.ruleConfig("qiqiu_casual","ranked");
  assert.deepEqual(J(r),{rulesetId:"qiqiu_casual",edition:C.RULESETS.qiqiu_casual.edition,implementationVersion:C.REP_RULES.id,mode:"ranked",unresolvedPolicy:"pending_review"});
  assert.ok(Object.isFrozen(r));assert.equal(C.ruleConfig("tw_proto","ranked").mode,"casual");assert.equal(C.ruleConfig("tw_proto","ranked").unresolvedPolicy,"prompt_agree");
  assert.equal(C.ruleConfig("nope","puzzle").rulesetId,"qiqiu_casual");assert.equal(C.ruleConfig("qiqiu_casual","weird").mode,"casual")});
test("ruleConfigOf：舊存檔沒有 rc 補預設＋目前裁判版本；手改成原型 ranked、不認得的棋規都被擋；舊的裁判版本照存檔留著（指紋）",()=>{
  assert.equal(C.ruleConfigOf({}).rulesetId,"qiqiu_casual");assert.equal(C.ruleConfigOf({}).implementationVersion,C.REP_RULES.id);
  assert.equal(C.ruleConfigOf({ranked:true}).mode,"ranked");assert.equal(C.ruleConfigOf({practice:{}}).mode,"puzzle");
  assert.equal(C.ruleConfigOf({rc:{rulesetId:"tw_proto",mode:"ranked"}}).mode,"casual");
  assert.equal(C.ruleConfigOf({rc:{rulesetId:"china_2099",mode:"ranked"},ranked:false}).rulesetId,"qiqiu_casual");
  assert.equal(C.ruleConfigOf({rc:{rulesetId:"qiqiu_casual",mode:"ranked",implementationVersion:"asian-direct-v1"}}).implementationVersion,"asian-direct-v1");
  assert.equal(C.ruleRated(QQ),true);assert.equal(C.ruleRated(TW),false);assert.equal(C.ruleRated(null),false)});

/* ---------- 判法：預設不變；臺灣原型把循環改成提示 ---------- */
test("千秋休閒規則（沒有 rc 或 rc＝qiqiu_casual）：長將、長捉照判負，閒著判和——跟加棋規以前一樣",()=>{
  for(const rc of[null,QQ]){
    assert.equal(C.judgeState(play(perpetual(rc),pc.concat(pc))).w,"b");
    assert.equal(C.judgeState(play(chase(rc),cc.concat(cc))).w,"b");
    const d=C.judgeState(play(idle(rc),ic.concat(ic)));assert.equal(d.w,null);assert.match(d.why,/判和/)}});
test("臺灣規程（原型）：長將第 3 次重複不判負，改成待核提示（policy＝prompt_agree），原本的判決留在 base 供追溯",()=>{
  const S=play(perpetual(TW),pc.concat(pc));assert.equal(C.judgeState(S),null,"不自動結束");
  const r=S.repetition;assert.equal(r.pending,true);assert.equal(r.policy,"prompt_agree");assert.equal(r.ruleset,"tw_proto");
  assert.equal(r.base.w,"b");assert.match(r.base.why,/紅方長將/);assert.match(r.why,/臺灣規程（原型）/);assert.match(r.why,/經裁判裁決仍不變著/);
  assert.equal("w" in r,false,"待核不帶勝方");assert.deepEqual(r.occurrences,[0,4,8],"循環證據照留")});
test("臺灣規程（原型）：長捉也改提示；閒著、一將一捉的判和條文未查證，也改提示、不自動判和",()=>{
  const c=play(chase(TW),cc.concat(cc));assert.equal(C.judgeState(c),null);assert.equal(c.repetition.base.w,"b");
  const d=play(idle(TW),ic.concat(ic));assert.equal(C.judgeState(d),null);assert.match(d.repetition.why,/未查證/);
  const o=play(occ0(TW),occ.concat(occ));assert.equal(C.judgeState(o),null);assert.equal(o.repetition.pending,true)});
test("臺灣規程（原型）：存檔讀回（stateRebuild）得到同一個待核；變著跳出循環，提示就消失",()=>{
  const S=play(perpetual(TW),pc.concat(pc));C.judgeState(S);const R={start:S.start,startTurn:"r",rc:TW,moves:S.moves.map(m=>({f:m.f,t:m.t}))};C.stateRebuild(R);
  assert.equal(R.repetition.pending,true);assert.equal(R.repetition.why,S.repetition.why);
  play(S,["e7d7"]);assert.equal(C.judgeState(S),null);assert.equal(S.repetition,null)});
test("棋規不影響將死、困斃、無進攻子力",()=>{
  const S=start({d0:"K",e9:"k",a8:"R",b7:"R"},"r",TW);play(S,["b7b9"]);const r=C.judgeState(S);assert.equal(r.w,"r");assert.match(r.why,/將死/);
  const N=start({f0:"K",d9:"k",d0:"A",e1:"p"},"r",TW);play(N,["d0e1"]);assert.equal(C.judgeState(N).why,"雙方均無進攻子力")});

/* ---------- 預警事件（預警與判決分離） ---------- */
test("repetitionWarning：長將那方收到 loss 事件，判詞跟裁判再走一圈的判決一字不差；被將的一方、閒著、一將一捉不發",()=>{
  const ev=C.repetitionWarning(play(perpetual(),pc),"r");assert.equal(ev.type,"repetition-warning");assert.equal(ev.kind,"loss");assert.equal(ev.side,"r");
  assert.equal(ev.why,C.judgeState(play(perpetual(),pc.concat(pc))).why);assert.equal(ev.ply,4);
  assert.equal(C.repetitionWarning(play(perpetual(),pc.concat(pc[0])),"b"),null);
  assert.equal(C.repetitionWarning(play(idle(),ic),"r"),null);assert.equal(C.repetitionWarning(play(occ0(),occ),"r"),null)});
test("repetitionWarning：照這盤的棋規——臺灣原型的長將只發 review（提示協議），不發 loss；noPerp 關卡的長將不發",()=>{
  const S=play(perpetual(),pc);const ev=C.repetitionWarning({...S,rc:TW},"r");assert.equal(ev.kind,"review");assert.match(ev.why,/臺灣規程/);
  assert.equal(C.repetitionWarning({...S,noPerp:true},"r"),null);
  assert.equal(C.repetitionWarning({...S,result:{w:"b"}},"r"),null);assert.equal(C.repetitionWarning(S,"b"),null)});
test("〔混合〕畫面的 repWarn 只照 core 的預警事件顯示：不自己重播、不呼叫 judgeState／stateRebuild、不看每步 ck／ch",()=>{
  const src=rd(path.join(DB,"m/08b-cpugame.js")),a=src.indexOf("function repWarn("),e=src.indexOf("catch(e){}}\n",a);assert.ok(a>0&&e>a);
  const body=src.slice(a,e).replace(/\/\*[\s\S]*?\*\//g,"");
  assert.match(body,/C\.repetitionWarning\(st,me\)/);assert.doesNotMatch(body,/judgeState|stateRebuild|\.ck\b|\.ch\b/);
  const shown=[],ctx={Map,Set,Object,window:{XQCore:C},esc:s=>String(s),modal:(html,btns)=>shown.push({html,btns:Array.from(btns,b=>b[0])})};vm.createContext(ctx);
  const s0=src.indexOf("const REPW_SEEN=new Map()");vm.runInContext(src.slice(s0,e+"catch(e){}}\n".length)+";this.repWarn=repWarn",ctx);
  ctx.repWarn({...play(perpetual(),pc),rc:TW},"r",()=>{});assert.equal(shown.length,1);assert.match(shown[0].html,/局面在重複/);assert.match(shown[0].html,/臺灣規程/);
  assert.deepEqual(shown[0].btns,["🤝 提議和局","我來變著"])});
test("〔原始碼〕全 App 沒有地方再用每步的 ck／ch 標記推輸贏（Gemini 說的「ck || ch 判負」）",()=>{
  const files=fs.readdirSync(path.join(DB,"m")).filter(f=>f.endsWith(".js")).map(f=>path.join(DB,"m",f)).concat(["src/local.js","src/net.js","src/park3d.js"].map(f=>path.join(LAB,f)));
  for(const f of files){const s=fs.readFileSync(f,"utf8");assert.doesNotMatch(s,/\.ck\s*\|\|\s*[\w.]*\.ch\b|\.ch\s*\|\|\s*[\w.]*\.ck\b/,path.basename(f))}});

/* ---------- local.js：本機對局、同機、車輪戰的 rc ---------- */
function fakeIDB(){const data=new Map();return{open(){const r={};setImmediate(()=>{r.result={transaction(){const t={},store={
  get(k){const q={result:data.get(k)};setImmediate(()=>q.onsuccess&&q.onsuccess());return q},put(v,k){data.set(k,v);return{}},delete(k){data.delete(k);return{}}};
  t.objectStore=()=>store;setImmediate(()=>setImmediate(()=>t.oncomplete&&t.oncomplete()));return t}};r.onsuccess&&r.onsuccess()});return r}}}
function phone(init){const m=new Map(Object.entries(init||{}).map(([k,v])=>[k,typeof v==="string"?v:JSON.stringify(v)])),eng=[];
  const LS={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v))},removeItem:k=>{m.delete(k)},key:i=>[...m.keys()][i]??null,get length(){return m.size}};
  const ctx={console,URL,URLSearchParams,setImmediate,Date,
    setTimeout:(fn,ms)=>{if(fn&&(fn.name==="playEngine"||fn.name==="analyzePlay"||fn.name==="smEngine"))eng.push(fn);else{const h=setTimeout(fn,Math.min(+ms||0,5));if(h.unref)h.unref()}return 1},clearTimeout(){},setInterval:()=>0,clearInterval(){},
    localStorage:LS,sessionStorage:{getItem:()=>null,setItem(){},removeItem(){}},indexedDB:fakeIDB(),location:{href:"http://localhost/",hash:"",pathname:"/",search:""},history:{replaceState(){}},navigator:{onLine:true},
    Event:class{constructor(t){this.type=t}},CustomEvent:class{constructor(t,d){this.type=t;this.detail=d&&d.detail}},addEventListener(){},removeEventListener(){},dispatchEvent:()=>true,
    document:{hidden:false,addEventListener(){}},atob:s=>Buffer.from(s,"base64").toString("binary"),fetch:async()=>({ok:false,status:404,json:async()=>({})}),
    XQEngine:{ready:true,search:async q=>{const S={moves:q.moves.map(u=>({f:C.parseSq(u.slice(0,2)),t:C.parseSq(u.slice(2,4))}))};C.stateRebuild(S);
      const L=C.legal(S.board,S.turn).slice(0,1);return{best:C.iccs(...L[0]),lines:L.map(([f,t])=>({k:1,mv:C.iccs(f,t),v:0,pv:[C.iccs(f,t)],mate:null,depth:1}))}}}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(CORE_SRC,ctx,{filename:"core.js"});vm.runInContext(LOCAL,ctx,{filename:"local.js"});
  return{ctx,m,api:async(u,b)=>J(await ctx.XQ.api(u,b)),stored:k=>JSON.parse(m.get(k||"xq_play")),
    cpu:async()=>{const t=eng.splice(0);for(const fn of t)if(fn.name==="playEngine")await fn()}}}
const OLD={id:"2026-11-01T09-00-00",human:"r",level:5,ranked:false,result:null,moves:[]};

test("舊存檔（沒有 rc）：讀回來補千秋休閒規則＋目前裁判版本",async()=>{
  const T=phone({xq_play:OLD});const s=await T.api("/play/state");
  assert.equal(s.rc.rulesetId,"qiqiu_casual");assert.equal(s.rc.implementationVersion,C.REP_RULES.id);assert.equal(s.rc.mode,"casual")});
test("設定選臺灣原型：挑戰電腦（非晉級賽）用原型、同機對下、車輪戰也是；晉級賽、擂台、石桌往事一律千秋休閒規則",async()=>{
  const T=phone({xq_lvFine:1});assert.equal(T.ctx.XQ_rulePref(),"qiqiu_casual");assert.equal(T.ctx.XQ_setRulePref("tw_proto"),"tw_proto");
  await T.api("/play/new",{human:"r",level:3,ranked:false});let s=await T.api("/play/state");assert.equal(s.rc.rulesetId,"tw_proto");assert.equal(s.rc.mode,"casual");
  assert.equal(T.stored().rc.rulesetId,"tw_proto","存檔帶 rc");
  await T.api("/play/new",{human:"r",lx:6,ranked:true});s=await T.api("/play/state");assert.equal(s.rc.rulesetId,"qiqiu_casual");assert.equal(s.rc.mode,"ranked");
  await T.api("/play/new",{human:"r",level:3,arena:"tang"});assert.equal((await T.api("/play/state")).rc.rulesetId,"qiqiu_casual");
  await T.api("/play/new",{human:"r",level:3,journey:"park"});assert.equal((await T.api("/play/state")).rc.rulesetId,"qiqiu_casual");
  await T.api("/pvp/new",{});const v=await T.api("/pvp/state");assert.equal(v.rc.rulesetId,"tw_proto");assert.equal(T.stored("xq_pvp").rc.rulesetId,"tw_proto");
  const sm=await T.api("/simul/new",{n:3,lx:5});assert.equal(sm.rc.rulesetId,"tw_proto");assert.equal(T.stored("xq_simul").rc.rulesetId,"tw_proto");
  T.ctx.XQ_setRulePref("bogus");assert.equal(T.ctx.XQ_rulePref(),"qiqiu_casual","不認得的值回預設")});
test("開局後改設定不影響這盤（rc 是開局時寫死的指紋）",async()=>{
  const T=phone({xq_lvFine:1});T.ctx.XQ_setRulePref("tw_proto");await T.api("/play/new",{human:"r",level:3,ranked:false});
  T.ctx.XQ_setRulePref("qiqiu_casual");await T.api("/play/move",{f:sq("h2"),t:sq("e2")});await T.cpu();
  const T2=phone(Object.fromEntries(T.m));assert.equal((await T2.api("/play/state")).rc.rulesetId,"tw_proto")});
test("晉級賽照常計分；存檔被手改成臺灣原型的晉級賽，讀回變 casual、結束不計分",async()=>{
  const T=phone({xq_lvFine:1});await T.api("/play/new",{human:"r",lx:6,ranked:true});await T.api("/play/move",{f:sq("h2"),t:sq("e2")});await T.cpu();
  const saved=T.stored(),bad={...saved,rc:{...saved.rc,rulesetId:"tw_proto",mode:"ranked"}};
  const A=phone({xq_play:saved,xq_lvFine:1});await A.api("/play/resign",{});assert.ok(A.m.get("xq_cpuRate"),"正常的晉級賽要記分");
  const B=phone({xq_play:bad,xq_lvFine:1});const s=await B.api("/play/state");assert.equal(s.rc.mode,"casual");await B.api("/play/resign",{});
  assert.equal(B.m.get("xq_cpuRate"),undefined,"原型棋規不計分")});

/* ---------- net.js：握手 ---------- */
function net(pref){
  const sent=[],events=[],data=new Map(),ctx={XQCore:C,TextEncoder,TextDecoder,URL,console,Date,Math,JSON,
    location:{hash:"",hostname:"raysonchen2023-cloud.github.io"},navigator:{onLine:true},document:{hidden:false,addEventListener(){}},
    localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
    addEventListener(){},dispatchEvent:e=>events.push(e.type),CustomEvent:class{constructor(type){this.type=type}},
    setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},clearInterval(){},
    meInfo:()=>({id:"tester",name:"測試者"}),crypto:require("node:crypto").webcrypto};
  if(pref)ctx.XQ_rulePref=()=>pref;
  ctx.window=ctx;vm.createContext(ctx);
  let src=fs.readFileSync(require.resolve("../src/net.js"),"utf8");
  src=src.replace(/^  return\{\r?$/m,"  window.__t={onMsg,okNext,record,rcRated,getG:()=>G,setGame:x=>{G=x;cur={gid:x.gid}},setTransport:x=>cli=x};\n  return{");
  vm.runInContext(src,ctx);ctx.__t.setTransport({up:true,pub:(topic,msg)=>sent.push({topic,msg:JSON.parse(msg)}),sub(){},unsub(){}});
  const friendly=[];ctx.XQNet.on("friendly",x=>friendly.push(x));
  const accept=rs=>{const inv=sent.find(x=>x.msg.type==="invite");ctx.__t.onMsg("xqlab-r7k2q/v1/i/tester",JSON.stringify({type:"accept",gid:inv.msg.gid,from:{id:"peer",name:"對手",rules:C.REP_RULES.id,...(rs?{rs}:{})},at:Date.now()}))};
  return{ctx,sent,data,friendly,accept}}
test("邀請帶上自己的棋規 rs（預設千秋休閒規則）",()=>{
  const h=net();h.ctx.XQNet.invite({id:"peer",name:"對手"});assert.equal(h.sent[0].msg.from.rs,"qiqiu_casual");assert.equal(h.sent[0].msg.from.rules,C.REP_RULES.id);
  const t=net("tw_proto");t.ctx.XQNet.invite({id:"peer",name:"對手"});assert.equal(t.sent[0].msg.from.rs,"tw_proto")});
/* 計不計分另外還要看別的條件（例如 net.js 的對局簽名），這裡只驗棋規這一關：rcRated */
test("雙方都是千秋休閒規則（或對方是沒帶 rs 的舊版）：ranked，棋規這一關放行、不跳友誼賽提示；沒有 rc 的舊對局也放行",()=>{
  for(const rs of["qiqiu_casual",undefined]){const h=net();h.ctx.XQNet.invite({id:"peer",name:"對手"});h.accept(rs);
    const G=h.ctx.__t.getG();assert.ok(G,"有開局");assert.equal(G.rc.rulesetId,"qiqiu_casual");assert.equal(G.rc.mode,"ranked");assert.equal(h.friendly.length,0);
    assert.equal(h.ctx.__t.rcRated(G),true)}
  assert.equal(net().ctx.__t.rcRated({gid:"old",rules:C.REP_RULES.id}),true)});
test("棋規不同、或雙方都選原型：照樣開局但只算友誼賽（casual），跳一次提示，結束不計分",()=>{
  for(const [mine,peer,id] of[["qiqiu_casual","tw_proto","qiqiu_casual"],["tw_proto","qiqiu_casual","qiqiu_casual"],["tw_proto","tw_proto","tw_proto"]]){
    const h=net(mine);h.ctx.XQNet.invite({id:"peer",name:"對手"});h.accept(peer);const G=h.ctx.__t.getG();
    assert.equal(G.rc.rulesetId,id);assert.equal(G.rc.mode,"casual");assert.equal(h.friendly.length,1,mine+"/"+peer);
    assert.equal(h.ctx.__t.rcRated(G),false,"棋規這一關擋下");
    G.moves=[[sq("h2"),sq("e2")],[sq("h7"),sq("e7")]];G.result={w:"r",why:"測試"};h.ctx.__t.record();assert.equal(h.data.get("xq_rate"),undefined,"友誼賽不計分")}});
test("下到一半棋規設定被換掉：拒收；裁判版本不同照舊拒收",()=>{
  const h=net(),a={rules:C.REP_RULES.id,rc:C.ruleConfig("qiqiu_casual","ranked")};
  assert.equal(h.ctx.__t.okNext(a,{...a,rc:C.ruleConfig("qiqiu_casual","casual")}),false);
  assert.equal(h.ctx.__t.okNext(a,{...a,rc:C.ruleConfig("tw_proto","casual")}),false);
  assert.equal(h.ctx.__t.okNext(a,{...a,rules:"old"}),false)});
test("線上對局的判法照 G.rc：XQ_netCheck 帶 rc 時用那盤的棋規",async()=>{
  const T=phone({});const mv=[];const S={moves:[]};C.stateRebuild(S);
  for(const u of["h2e2","h7e7","e2e6","e7e3"]){mv.push([sq(u.slice(0,2)),sq(u.slice(2))])}
  assert.equal(T.ctx.XQ_netCheck(mv,C.ruleConfig("tw_proto","casual")).ok,true);assert.equal(T.ctx.XQ_netCheck(mv).ok,true)});

/* ---------- 文件 ---------- */
test("〔原始碼〕rules.md：art/docs 與 site/data/docs 兩份一樣，有寫棋規註冊表、原型不計分",()=>{
  const a=fs.readFileSync(path.join(DB,"art/docs/rules.md")),b=fs.readFileSync(path.join(LAB,"site/data/docs/rules.md"));assert.ok(a.equals(b),"兩份要同步");
  const t=a.toString("utf8");assert.match(t,/qiqiu_casual/);assert.match(t,/tw_proto/);assert.match(t,/不計積分/);assert.match(t,/test-ruleset\.js/)});
