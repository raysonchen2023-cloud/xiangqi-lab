// 評比第 6 輪 F4「棋規系統閉環」：裁判測試局例＋原型不計分。
// 行為測試，不比對原始碼：每個局面先驗合法（擺法、沒有王見王、不該被將的一方沒被將），每一步都用 core 的 legal 驗過才走，
// 再用 site/core.js（由 xiangqi-referee.js 建）的 judgeState 實際判，比對兩套棋規：
//   千秋休閒規則（qiqiu_casual，沒有 rc 也是它）、臺灣比賽規程原型（tw_proto）。
// 每個局例另外記下《中華民國象棋規則》113 年修訂版（中華民國象棋文化協會）對同一類循環的條文判法，
// 標明 App 跟條文「一致」或「不同」；不同的地方照實留在測試裡，當成已知差異，不假裝一致。
// 條文來源：https://www.cccs.org.tw/Page?itemid=18&mid=35 （頁面附《中華民國象棋規則113年修訂版》PDF；第二章棋例第二節表 2.2-1、第三節棋例總綱、第四節棋例細則；第三章第四節限著）
// 後半段：原型不計分——晉級賽、線上積分一律千秋休閒規則；local.js 的中途離開扣分（forfeit）也要過同一關。
// 11/12 加第三套：臺灣棋規正式版（tw113，評比第 9 輪 F4）——照 113 年版條文判，三次循環（同一局面第 4 次出現）才判，可計分。
//   每個局例用 tw113 走三輪循環，結論要跟表上記的條文判法（tw113.w）完全一樣；前兩輪不判；第 100 著判和；晉級賽、線上雙方都選才計分。
// 用法：node --test xiangqi-lab/tools/test-ruleset-cases.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const LAB=path.join(__dirname,"..");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const C=require("../site/core.js"),CORE_SRC=rd(path.join(LAB,"site/core.js")),LOCAL=rd(path.join(LAB,"src/local.js"));
const sq=C.parseSq,J=x=>x===undefined?x:JSON.parse(JSON.stringify(x));
const TW=C.ruleConfig("tw_proto","casual"),QQ=C.ruleConfig("qiqiu_casual","casual"),T3=C.ruleConfig("tw113","ranked");

/* ---------- 局面合法性：擺法照象棋規則，不靠 legal() 以外的假設 ---------- */
const name=i=>"abcdefghi"[i%9]+(9-Math.floor(i/9));
const PAL={K:["d0","e0","f0","d1","e1","f1","d2","e2","f2"],k:["d9","e9","f9","d8","e8","f8","d7","e7","f7"],
  A:["d0","f0","e1","d2","f2"],a:["d9","f9","e8","d7","f7"],B:["c0","g0","a2","e2","i2","c4","g4"],b:["c9","g9","a7","e7","i7","c5","g5"]};
const MAX={K:1,A:2,B:2,R:2,N:2,C:2,P:5};
function placementOk(b){
  const n={};for(let i=0;i<90;i++){const p=b[i];if(!p)continue;n[p]=(n[p]||0)+1;const q=name(i),f=q[0],r=+q[1];
    if(PAL[p]&&!PAL[p].includes(q))return p+" 不能在 "+q;
    if(p==="P"&&(r<3||(r<5&&!"acegi".includes(f))))return"紅兵不能在 "+q;
    if(p==="p"&&(r>6||(r>4&&!"acegi".includes(f))))return"黑卒不能在 "+q}
  for(const[p,m]of Object.entries(MAX))if((n[p]||0)>m||(n[p.toLowerCase()]||0)>m)return p+" 太多";
  if(n.K!==1||n.k!==1)return"要剛好一帥一將";
  const K=b.indexOf("K"),k=b.indexOf("k");
  if(K%9===k%9){let blocked=false;for(let i=k+9;i<K;i+=9)if(b[i])blocked=true;if(!blocked)return"王見王"}
  return null}
function start(pieces,side,rc){
  const b=Array(90).fill(null);for(const[q,p]of Object.entries(pieces)){assert.equal(b[sq(q)],null,"重複擺子 "+q);b[sq(q)]=p}
  assert.equal(placementOk(b),null,"擺法要合法");
  assert.equal(C.inCheck(b,C.opp(side)),false,"不輪走的一方不能正被將軍");
  assert.ok(C.legal(b,side).length>0,"輪走的一方要有棋可走");
  const S={start:C.fen(b,side).split(" ")[0],startTurn:side,moves:[]};if(rc)S.rc=rc;C.stateRebuild(S);return S}
function play(S,list){for(const u of list){const f=sq(u.slice(0,2)),t=sq(u.slice(2));
  assert.ok(C.legal(S.board,S.turn).some(([x,y])=>x===f&&y===t),"棋步要合法："+u);C.stateApply(S,f,t)}return S}

/* ---------- 局例 ----------
   app：千秋休閒規則的判決（w：勝方；"pending"＝棋例待核、不結束），why：判詞要符合的字樣
   tw113：《中華民國象棋規則》113 年版對這種循環的判法（條文、細則編號）；same：App 的千秋休閒規則判法跟條文一不一致
   App 是「同一局面第 3 次出現（兩輪循環）」就判；113 年版是「三次循環後裁判介入、再循環一次」才判（第四章裁判員職責 H），次數算法不同，這裡只比結論 */
const CASES=[
  {id:"C1",kind:"長將",title:"單方一子長將（俥四平五、將５平６…）",
    pieces:{d0:"K",f9:"k",e7:"R"},side:"r",cycle:["e7f7","f9e9","f7e7","e9f9"],
    app:{w:"b",why:/紅方長將判負/},tw113:{w:"b",art:"棋例細則 1（圖 2.4-1a）：單方長將者須變著，不變作負"},same:true},
  {id:"C2",kind:"長將",title:"二將一還將：紅方步步將，黑方一將一閒",
    pieces:{e0:"K",e3:"R",d4:"C",e6:"c",e9:"k"},side:"r",cycle:["d4e4","e6d6","e4d4","d6e6"],
    app:{w:"b",why:/紅方長將判負/},tw113:{w:"b",art:"棋例細則 3：二將一還將，長將者犯例"},same:true},
  {id:"C3",kind:"長捉",title:"一子長捉無根子：俥捉無根包",
    pieces:{e0:"K",f9:"k",g3:"R",c7:"c"},side:"r",cycle:["g3c3","c7g7","c3g3","g7c7"],
    app:{w:"b",why:/紅方長捉同一子判負/},tw113:{w:"b",art:"棋例細則 8：除帥（將）、兵（卒）外，一子長捉一無根子犯例"},same:true},
  {id:"C4",kind:"長捉",title:"長捉真根子：俥捉有車保護的包",
    pieces:{e0:"K",f9:"k",i7:"r",g3:"R",c7:"c"},side:"r",cycle:["g3c3","c7g7","c3g3","g7c7"],
    app:{w:null,why:/判和/},tw113:{w:null,art:"棋例細則 13：長捉有根子未犯例；總綱 6：長捉真根子未犯例"},same:true},
  {id:"C5",kind:"長捉",title:"炮長捉有根車",
    pieces:{d0:"K",f9:"k",c3:"C",b5:"P",c5:"P",b7:"r",a7:"r"},side:"r",cycle:["c3b3","b7c7","b3c3","c7b7"],
    app:{w:"b",why:/紅方長捉同一子判負/},tw113:{w:"b",art:"棋例細則 11：傌（馬）、炮（包）長捉一有根車犯例"},same:true},
  {id:"C6",kind:"長捉",title:"帥長捉無根包",
    pieces:{e0:"K",d1:"c",f9:"k"},side:"r",cycle:["e0d0","d1e1","d0e0","e1d1"],
    app:{w:null,why:/判和/},tw113:{w:null,art:"棋例細則 10（圖 2.4-10a）：帥（將）、兵（卒）長捉未犯例，雙方不變作和"},same:true},
  {id:"C7",kind:"長捉",title:"同類子：俥長捉被牽制、不能離線的車",
    pieces:{d0:"K",e2:"R",a6:"R",e7:"r",e9:"k"},side:"r",cycle:["a6a7","e7e6","a7a6","e6e7"],
    app:{w:"pending",why:/同類子/},tw113:{w:"b",art:"棋例總綱 7：長捉同類子未犯例，但該子如受牽制不能離線時，仍作為長捉論，亦犯例"},same:false,
    note:"App 遇到同類子牽制標「待核」、不自動判；113 年版判長捉方不變作負"},
  {id:"C8",kind:"長捉",title:"雙方長捉：紅馬捉車、黑車捉馬",
    pieces:{f0:"K",f9:"k",g6:"N",h6:"r",f5:"N"},side:"r",cycle:["g6f8","h6h8","f8g6","h8h6"],
    app:{w:"pending",why:/互捉/},tw113:{w:null,art:"表 2.2-1、第二節 C-2：雙方長捉，經三次循環仍不變著，可判作和"},same:false,
    note:"App 雙方互捉標「待核」、不自動判；113 年版雙方長捉判和"},
  {id:"C9",kind:"一將一捉",title:"一將一捉：炮將軍、再捉車",
    pieces:{d0:"K",f0:"A",e9:"k",c5:"C",e7:"n",c9:"r"},side:"r",cycle:["c5e5","e7c8","e5c5","c8e7"],
    app:{w:null,why:/判和/},tw113:{w:null,art:"棋例總綱 2、細則 6：一將一捉或多將一捉均未犯例"},same:true},
  {id:"C10",kind:"閒著循環",title:"一將一閒（俥七進一、士５退４…）",
    pieces:{d0:"K",c8:"R",e8:"a",e9:"k"},side:"r",cycle:["c8c9","e8d9","c9c8","d9e8"],
    app:{w:null,why:/判和/},tw113:{w:null,art:"棋例細則 7（圖 2.4-7）：一將一閒未犯例，雙方不變應判和局"},same:true},
  {id:"C11",kind:"閒著循環",title:"雙方閒著來回走",
    pieces:{d0:"K",f9:"k",a1:"R",i8:"r"},side:"r",cycle:["a1a2","i8i7","a2a1","i7i8"],
    app:{w:null,why:/判和/},tw113:{w:null,art:"第二節 C-3：雙方未犯例，經三次循環仍不變著，可判作和"},same:true},
  {id:"C12",kind:"閒著循環",title:"兵長捉無根車（兵是閒）",
    pieces:{e0:"K",f9:"k",c5:"P",d6:"r"},side:"r",cycle:["c5d5","d6c6","d5c5","c6d6"],
    app:{w:null,why:/判和/},tw113:{w:null,art:"棋例細則 10（圖 2.4-10b）：兵長捉無根車未犯例；術語「捉」說明二：兵卒攻擊將帥以外任何一子為閒"},same:true}];
const fenOf=c=>{const b=Array(90).fill(null);for(const[q,p]of Object.entries(c.pieces))b[sq(q)]=p;return C.fen(b,c.side)};
const run=(c,rc)=>{const S=play(start(c.pieces,c.side,rc),c.cycle.concat(c.cycle));return{S,j:C.judgeState(S)}};
const verdictOf=({S,j})=>j?{w:j.w,why:j.why}:S.repetition&&S.repetition.pending?{w:"pending",why:S.repetition.why}:null;

test("局例清單：至少 8 個；長將、長捉、一將一捉、閒著循環各至少 1 個；每個都附 FEN 與條文出處",()=>{
  assert.ok(CASES.length>=8);for(const k of["長將","長捉","一將一捉","閒著循環"])assert.ok(CASES.some(c=>c.kind===k),k);
  for(const c of CASES){assert.match(fenOf(c),/^[1-9kKaAbBnNrRcCpP\/]+ [wb]$/);assert.ok(c.tw113.art.length>4,c.id);assert.equal(c.cycle.length,4)}});

for(const c of CASES){
  test(`${c.id}〔${c.kind}〕${c.title}：局面合法、一輪循環還不判、兩輪循環千秋休閒規則判${c.app.w==="pending"?"待核":c.app.w?(c.app.w==="r"?"紅勝":"黑勝"):"和"}`,()=>{
    const one=play(start(c.pieces,c.side),c.cycle);assert.equal(C.judgeState(one),null,"一輪循環（局面第 2 次出現）不判");
    for(const rc of[null,QQ]){const v=verdictOf(run(c,rc));assert.ok(v,"兩輪循環要有判決或待核");
      assert.equal(v.w,c.app.w,c.id+" 勝方");assert.match(v.why,c.app.why,c.id+" 判詞")}
    const{S}=run(c,null);assert.deepEqual(S.repetition.occurrences,[0,4,8],"循環證據：第 0、4、8 手同一局面")});
  test(`${c.id}〔${c.kind}〕臺灣規程原型：${c.app.w==="pending"?"同樣待核":"不自動判，改成提示協議，原判留在 base"}`,()=>{
    const r=run(c,TW);assert.equal(r.j,null,"原型不自動結束對局");const rep=r.S.repetition;assert.equal(rep.pending,true);
    if(c.app.w==="pending"){assert.equal(rep.policy,undefined,"本來就待核的，原型不改判詞");assert.match(rep.why,c.app.why)}
    else{assert.equal(rep.policy,"prompt_agree");assert.equal(rep.ruleset,"tw_proto");assert.equal(rep.base.w,c.app.w);assert.match(rep.base.why,c.app.why);
      assert.match(rep.why,/臺灣規程（原型）/);assert.equal("w" in rep,false)}
    const ev=C.repetitionWarning(play(start(c.pieces,c.side,TW),c.cycle),c.side);
    if(ev)assert.equal(ev.kind,"review","原型的預警只會是提示（review），不會說「會判負」")});
  test(`${c.id}〔${c.kind}〕對照 113 年版條文：${c.same?"一致":"不同（已知差異）"}——${c.tw113.art}`,()=>{
    const v=verdictOf(run(c,null));assert.equal(v.w===c.tw113.w,c.same,c.note||"App 跟條文的結論要跟表上記的一樣");
    if(!c.same)assert.ok(c.note,"不一致的要寫明差在哪")});
}

/* 自然限著：113 年版「雙方共走 100 著未吃子…經裁判員認同後判和」（第二節 B-2、第三章第四節）；App 是 120 著（60 回合）自動判和 */
function noCaptureWalk(S,plies){const seen=new Set(S.pos);
  for(let i=0;i<plies;i++){const mv=C.legal(S.board,S.turn).find(([f,t])=>!S.board[t]&&!seen.has(C.fen(C.make(S.board,f,t),C.opp(S.turn))));
    assert.ok(mv,"找不到不重複的著法");C.stateApply(S,mv[0],mv[1]);seen.add(S.pos[S.pos.length-1])}return S}
test("C13〔和棋判定〕自然限著：第 100 著未吃子，兩套棋規都還不判和（113 年版此時可經裁判判和＝已知差異）；第 120 著兩套都判和",()=>{
  for(const rc of[null,TW]){const S=noCaptureWalk(start({d0:"K",f9:"k",a1:"R",i8:"r"},"r",rc),100);assert.equal(S.moves.length,100);
    assert.equal(C.judgeState(S),null,"第 100 著不判");noCaptureWalk(S,20);const r=C.judgeState(S);assert.equal(r.w,null);assert.match(r.why,/60 回合/)}});

/* ---------- 原型不計分 ---------- */
test("棋規設定：原型棋規不管怎麼要求、怎麼手改，都拿不到 ranked；計分只認千秋休閒規則的 ranked",()=>{
  for(const m of["ranked","casual","puzzle","x"]){assert.notEqual(C.ruleConfig("tw_proto",m).mode,"ranked");
    assert.notEqual(C.ruleConfigOf({rc:{rulesetId:"tw_proto",mode:m}}).mode,"ranked")}
  assert.equal(C.ruleRated(C.ruleConfig("tw_proto","ranked")),false);assert.equal(C.ruleRated({rulesetId:"tw_proto",mode:"ranked"}),false);
  assert.equal(C.ruleRated({rulesetId:"tw_official",mode:"ranked"}),false,"不認得的棋規也不計分");
  assert.equal(C.ruleConfigOf({rc:{rulesetId:"tw_official",mode:"ranked"}}).mode,"casual");
  assert.equal(C.ruleRated(C.ruleConfig("qiqiu_casual","ranked")),true)});

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
async function rankedSave(){const T=phone({xq_lvFine:1});await T.api("/play/new",{human:"r",lx:6,ranked:true});
  await T.api("/play/move",{f:sq("h2"),t:sq("e2")});await T.cpu();const s=T.stored();assert.equal(s.moves.length,2);assert.equal(s.rc.rulesetId,"qiqiu_casual");return s}

test("晉級賽：設定選了臺灣原型，晉級賽照樣用千秋休閒規則 ranked；非晉級的挑戰電腦才用原型、而且是 casual",async()=>{
  const T=phone({xq_lvFine:1});T.ctx.XQ_setRulePref("tw_proto");
  await T.api("/play/new",{human:"r",lx:6,ranked:true});let s=await T.api("/play/state");assert.equal(s.rc.rulesetId,"qiqiu_casual");assert.equal(s.rc.mode,"ranked");
  await T.api("/play/new",{human:"r",level:3,ranked:false});s=await T.api("/play/state");assert.equal(s.rc.rulesetId,"tw_proto");assert.equal(s.rc.mode,"casual")});
test("中途離開算輸（forfeit）：正常的晉級賽照扣分；存檔被手改成原型棋規的晉級賽，中途離開也不動積分（跟結束不計分同一關）",async()=>{
  const saved=await rankedSave();
  const A=phone({xq_play:saved,xq_lvFine:1});await A.api("/play/state");await A.api("/play/new",{human:"r",level:3,ranked:false});
  const R=JSON.parse(A.m.get("xq_cpuRate"));assert.equal(R.l,1,"正常晉級賽中途離開＝輸一盤");assert.match(R.hist[0].why,/中途離開/);
  const B=phone({xq_play:{...saved,rc:{...saved.rc,rulesetId:"tw_proto",mode:"ranked"}},xq_lvFine:1});
  assert.equal((await B.api("/play/state")).rc.mode,"casual");await B.api("/play/new",{human:"r",level:3,ranked:false});
  assert.equal(B.m.get("xq_cpuRate"),undefined,"原型棋規的晉級賽：中途離開不扣分");
  const D=phone({xq_play:{...saved,rc:{...saved.rc,rulesetId:"tw_proto",mode:"ranked"}},xq_lvFine:1});await D.api("/play/resign",{});
  assert.equal(D.m.get("xq_cpuRate"),undefined,"原型棋規的晉級賽：認輸也不計分")});
test("舊版晉級賽存檔（沒有 rc）：當千秋休閒規則 ranked，中途離開照扣分",async()=>{
  const saved=await rankedSave();delete saved.rc;
  const A=phone({xq_play:saved,xq_lvFine:1});await A.api("/play/new",{human:"r",level:3,ranked:false});
  assert.equal(JSON.parse(A.m.get("xq_cpuRate")).l,1)});

function net(pref){
  const sent=[],data=new Map(),ctx={XQCore:C,TextEncoder,TextDecoder,URL,console,Date,Math,JSON,
    location:{hash:"",hostname:"raysonchen2023-cloud.github.io"},navigator:{onLine:true},document:{hidden:false,addEventListener(){}},
    localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
    addEventListener(){},dispatchEvent(){},CustomEvent:class{constructor(type){this.type=type}},
    setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},clearInterval(){},
    meInfo:()=>({id:"tester",name:"測試者"}),crypto:require("node:crypto").webcrypto};
  if(pref)ctx.XQ_rulePref=()=>pref;
  ctx.window=ctx;vm.createContext(ctx);
  let src=fs.readFileSync(require.resolve("../src/net.js"),"utf8");
  src=src.replace(/^  return\{\r?$/m,"  window.__t={onMsg,okNext,record,rcRated,getG:()=>G,setGame:x=>{G=x;cur={gid:x.gid}},setTransport:x=>cli=x};\n  return{");
  vm.runInContext(src,ctx);ctx.__t.setTransport({up:true,pub:(topic,msg)=>sent.push({topic,msg:JSON.parse(msg)}),sub(){},unsub(){}});
  return{ctx,sent,data}}
test("線上積分：對局的 rc 不管是原型、手改成 ranked 的原型、還是不認得的棋規，棋規這一關都擋下；能計分的對局一定照千秋休閒規則判",()=>{
  const h=net(),t=h.ctx.__t;
  const forged=[{rulesetId:"tw_proto",mode:"ranked"},{rulesetId:"tw_proto",mode:"casual"},{rulesetId:"tw_official",mode:"ranked"},C.ruleConfig("tw_proto","ranked"),C.ruleConfig("qiqiu_casual","casual")];
  for(const rc of forged)assert.equal(t.rcRated({gid:"g",rules:C.REP_RULES.id,rc}),false,JSON.stringify(rc));
  for(const rc of[...forged,C.ruleConfig("qiqiu_casual","ranked"),undefined]){const G={gid:"g",rules:C.REP_RULES.id,...(rc?{rc}:{})};
    if(t.rcRated(G))assert.equal(C.ruleConfigOf({rc:G.rc}).rulesetId,"qiqiu_casual","會計分的對局，裁判用的一定是千秋休閒規則")}});
test("線上積分：手改成 ranked 的原型對局下完，record 不寫積分",()=>{
  const h=net("tw_proto");h.ctx.XQNet.invite({id:"peer",name:"對手"});const inv=h.sent.find(x=>x.msg.type==="invite");
  h.ctx.__t.onMsg("xqlab-r7k2q/v1/i/tester",JSON.stringify({type:"accept",gid:inv.msg.gid,from:{id:"peer",name:"對手",rules:C.REP_RULES.id,rs:"tw_proto"},at:Date.now()}));
  const G=h.ctx.__t.getG();assert.ok(G);assert.equal(G.rc.rulesetId,"tw_proto");assert.equal(G.rc.mode,"casual");
  G.rc={...G.rc,mode:"ranked"};G.moves=[[sq("h2"),sq("e2")],[sq("h7"),sq("e7")]];G.result={w:"r",why:"測試"};h.ctx.__t.record();
  assert.equal(h.data.get("xq_rate"),undefined)});

/* ---------- 臺灣棋規正式版（tw113）：照 113 年版條文判、三輪循環、可計分 ---------- */
const run3=(c,k)=>{const S=start(c.pieces,c.side,T3);for(let i=0;i<k;i++)play(S,c.cycle);return{S,j:C.judgeState(S)}};
test("臺灣棋規正式版：註冊表標「已實作、可計分」，條文出處寫明；原型標 hidden（設定頁不列），仍不計分",()=>{
  const R=C.RULESETS.tw113;assert.equal(R.status,"implemented");assert.equal(R.rated,true);assert.match(R.basis,/113 年修訂版/);assert.match(R.basis,/cccs\.org\.tw/);
  assert.equal(C.TW_RULES.occurrences,4,"三次循環＝同一局面第 4 次出現");assert.ok(Object.isFrozen(R));
  assert.equal(C.RULESETS.tw_proto.hidden,true);assert.equal(C.RULESETS.tw_proto.rated,false);
  assert.equal(T3.mode,"ranked");assert.equal(C.ruleRated(T3),true);assert.equal(C.ruleConfigOf({rc:{rulesetId:"tw113",mode:"ranked"}}).mode,"ranked")});
for(const c of CASES){
  test(`${c.id}〔${c.kind}〕臺灣棋規正式版：一輪、兩輪循環不判，三輪循環判${c.tw113.w?(c.tw113.w==="r"?"紅勝":"黑勝"):"和"}，跟 113 年版條文一致——${c.tw113.art}`,()=>{
    for(const k of[1,2]){const r=run3(c,k);assert.equal(r.j,null,k+" 輪循環不判");assert.equal(r.S.repetition,null,k+" 輪循環不待核")}
    const{S,j}=run3(c,3);assert.ok(j,"三輪循環要判");assert.equal(j.w,c.tw113.w,c.id+" 勝方要跟條文一樣");assert.match(j.why,/^臺灣棋規：/);assert.match(j.why,/三次循環/);
    assert.deepEqual(S.repetition.occurrences,[0,4,8,12],"證據：第 0、4、8、12 手同一局面");assert.equal(S.repetition.ruleset,"tw113");
    if(c.id==="C7")assert.match(j.why,/總綱 7/,"同類子受牽制要寫出總綱 7");
    if(c.id==="C8")assert.match(j.why,/雙方長捉/)});}
test("臺灣棋規正式版：兩輪循環後輪到犯例方走，預警「再走就判負」；沒犯例的循環不預警",()=>{
  for(const id of["C1","C2","C3","C5","C7"]){const c=CASES.find(x=>x.id===id),S=run3(c,2).S;const w=C.repetitionWarning(S,c.side);
    assert.ok(w,id+" 要預警");assert.equal(w.kind,"loss");assert.match(w.why,/臺灣棋規/);
    assert.equal(C.repetitionWarning(run3(c,1).S,c.side),null,id+" 一輪循環還不預警")}
  for(const id of["C4","C6","C11"]){const c=CASES.find(x=>x.id===id);assert.equal(C.repetitionWarning(run3(c,2).S,c.side),null,id)}});
test("C13〔和棋判定〕臺灣棋規正式版：第 99 著不判，第 100 著未吃子判和（第三章第四節，App 代替裁判審查）",()=>{
  const S=noCaptureWalk(start({d0:"K",f9:"k",a1:"R",i8:"r"},"r",T3),99);assert.equal(C.judgeState(S),null);
  noCaptureWalk(S,1);const r=C.judgeState(S);assert.equal(r.w,null);assert.match(r.why,/100 著/);assert.match(r.why,/第三章第四節/)});
test("晉級賽：設定選臺灣棋規正式版，晉級賽就用它、而且計分（ranked）；中途離開照扣分",async()=>{
  const T=phone({xq_lvFine:1});T.ctx.XQ_setRulePref("tw113");
  await T.api("/play/new",{human:"r",lx:6,ranked:true});const s=await T.api("/play/state");assert.equal(s.rc.rulesetId,"tw113");assert.equal(s.rc.mode,"ranked");
  await T.api("/play/move",{f:sq("h2"),t:sq("e2")});await T.cpu();await T.api("/play/new",{human:"r",level:3,ranked:false});
  assert.equal(JSON.parse(T.m.get("xq_cpuRate")).l,1,"正式版晉級賽中途離開＝輸一盤");
  const s2=await T.api("/play/state");assert.equal(s2.rc.rulesetId,"tw113");assert.equal(s2.rc.mode,"casual","一般挑戰電腦不計分")});
test("線上：雙方都選臺灣棋規正式版＝計分局（棋規這一關放行）；只有一方選＝友誼賽、照千秋休閒規則判、不計分",()=>{
  const go=(mine,peer)=>{const h=net(mine);h.ctx.XQNet.invite({id:"peer",name:"對手"});const inv=h.sent.find(x=>x.msg.type==="invite");
    h.ctx.__t.onMsg("xqlab-r7k2q/v1/i/tester",JSON.stringify({type:"accept",gid:inv.msg.gid,from:{id:"peer",name:"對手",rules:C.REP_RULES.id,rs:peer},at:Date.now()}));return h};
  const a=go("tw113","tw113"),G=a.ctx.__t.getG();assert.equal(G.rc.rulesetId,"tw113");assert.equal(G.rc.mode,"ranked");assert.equal(a.ctx.__t.rcRated(G),true);   /* 棋規這一關放行；會不會真的寫積分還要過簽名那關（假對手沒有金鑰，test-net-sign.js 另測） */
  for(const[m,p]of[["tw113","qiqiu_casual"],["qiqiu_casual","tw113"],["tw113",undefined]]){const h=go(m,p),g=h.ctx.__t.getG();
    assert.equal(g.rc.rulesetId,"qiqiu_casual",m+"/"+p);assert.equal(g.rc.mode,"casual");assert.equal(h.ctx.__t.rcRated(g),false);
    g.moves=[[sq("h2"),sq("e2")],[sq("h7"),sq("e7")]];g.result={w:"r",why:"測試"};h.ctx.__t.record();assert.equal(h.data.get("xq_rate"),undefined)}});

/* ---------- 文件 ---------- */
test("〔原始碼〕〔文件〕rules.md 兩份一樣，寫了 113 年版來源、差異表、這支測試",()=>{
  const DB=path.join(LAB,"../xiangqi-db"),a=fs.readFileSync(path.join(DB,"art/docs/rules.md")),b=fs.readFileSync(path.join(LAB,"site/data/docs/rules.md"));
  assert.ok(a.equals(b),"兩份要同步");const s=a.toString("utf8");
  assert.match(s,/113 年修訂版/);assert.match(s,/cccs\.org\.tw/);assert.match(s,/test-ruleset-cases\.js/);
  for(const c of CASES)assert.ok(s.includes(c.id+"｜")||s.includes("| "+c.id+" |"),"差異表／局例表要列 "+c.id)});
