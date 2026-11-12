// ChatGPT 評審 11/11（Metacritic 報告第 50 行）的自動測試：
//   ① 失著的具體後果（site/core.js classifyRaw，抄自 xiangqi-referee.js）：第二查（走完這步的局面）對方的最佳回應存成 rr＝{m,c,x,k,mt}，
//      吃子、將軍、殺棋都用規則（legal／make／inCheck）算；走的就是最佳著、終局、引擎給的著法不合法 → rr＝null（不猜）；stateRebuild 保留 rr。
//   ② 文字（xiangqi-db/m/05-settings.js mflRisk）：分析線有吃子才說「這手讓對方下一手可以吃你的俥（…）」，子名照紅黑；沒有吃子、沒有 rr（舊存檔）就不說；
//      有盤面就用規則重驗（rr 說吃子但盤面沒吃到、或那手不合法 → 不說）；殺棋只在引擎說有殺（mt）、而且最佳著不是也被殺時才說。
//   ③ 未評完的狀態（src/local.js）：對局紀錄清單多帶 pend＝我方還有幾步沒評；/db/grades 把後來評好的補進存檔（f、t 對不上不補、已評的不動）；舊存檔沒有 rr 照常讀。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const LAB=path.join(__dirname,"..");
const CORE_SRC=fs.readFileSync(path.join(LAB,"site/core.js"),"utf8");
const LOCAL_SRC=fs.readFileSync(path.join(LAB,"src/local.js"),"utf8");
const SET_SRC=fs.readFileSync(path.join(LAB,"../xiangqi-db/m/05-settings.js"),"utf8").replace(/\r\n/g,"\n");
const C=require("../site/core.js");
const sq=C.parseSq,mv=u=>[sq(u.slice(0,2)),sq(u.slice(2,4))];
const J=x=>JSON.parse(JSON.stringify(x));

// ---------- 局面：紅俥 a4、黑車 a9；紅走 a4a5（俥九進一）送到黑車嘴邊；黑方 a9a5 吃俥、a9d9 將軍 ----------
// 黑方版本＝整盤轉 180 度、紅黑對調（同樣的事發生在黑方身上）
const flipU=u=>{const f=c=>String.fromCharCode(202-c.charCodeAt(0)),r=d=>String(9-(+d));return f(u[0])+r(u[1])+f(u[2])+r(u[3])};
function pos(side){const b=Array(90).fill(null);b[sq("d0")]="K";b[sq("e9")]="k";b[sq("a4")]="R";b[sq("a9")]="r";b[sq("i3")]="P";b[sq("i6")]="p";
  if(side==="r")return{b,U:u=>u};
  const n=Array(90).fill(null);b.forEach((p,i)=>{if(p)n[89-i]=p===p.toUpperCase()?p.toLowerCase():p.toUpperCase()});return{b:n,U:flipU}}
const L=(m,v,o)=>({mv:m,v,mate:null,depth:12,pv:[m],...(o||{})});
function coreWith(eng){const calls=[];let n=0;
  const ctx={evalPos:async(b,s,ms,mpv)=>{const dead=!C.legal(b,s).length;calls.push({s,mpv,dead});if(dead)return{lines:[],dead:true};return eng(++n,b,s,ms,mpv)}};
  vm.createContext(ctx);vm.runInContext(CORE_SRC,ctx,{filename:"core.js"});return{X:ctx.XQCore,calls}}
const NAME={r:"俥",b:"車"};

for(const side of["r","b"]){const who=side==="r"?"紅":"黑";
  const run=async(reply,o)=>{const{b,U}=pos(side),[f,t]=mv(U(o&&o.played||"a4a5"));assert.ok(C.legal(b,side).some(([x,y])=>x===f&&y===t),"棋步要合法");
    const{X,calls}=coreWith(i=>i===1?{best:U("a4b4"),lines:[L(U("a4b4"),0),L(U("a4c4"),-10)]}:{best:"x",lines:reply?[reply(U)]:[]});
    return{r:await X.classifyRaw(b,side,f,t),calls,b,U,f,t}};
  test(`失著的後果（${who}方）：對方最佳回應吃子 → rr 記下吃到「${NAME[side]}」、中文記譜、沒將軍`,async()=>{
    const{r,calls,b,U,f,t}=await run(U=>L(U("a9a5"),900));
    assert.equal(calls.length,2);assert.equal(r.q,"敗著");assert.equal(r.loss,900);
    const a=C.make(b,f,t),[rf,rt]=mv(U("a9a5"));
    assert.deepEqual(J(r.rr),{m:U("a9a5"),c:C.notate(a,rf,rt),x:side==="r"?"R":"r",k:false,mt:null});
    assert.equal(r.pmt,null);
  });
  test(`失著的後果（${who}方）：對方最佳回應是將軍、沒吃子 → x＝null、k＝true`,async()=>{
    const{r}=await run(U=>L(U("a9d9"),300));
    assert.equal(r.rr.x,null);assert.equal(r.rr.k,true);assert.equal(r.rr.mt,null);
  });
  test(`失著的後果（${who}方）：引擎說對方 3 步殺 → rr.mt＝3、pmt＝−3`,async()=>{
    const{r}=await run(U=>L(U("a9a5"),29990,{mate:3}));
    assert.equal(r.rr.mt,3);assert.equal(r.pmt,-3);assert.equal(r.rr.x,side==="r"?"R":"r");
  });
  test(`失著的後果（${who}方）：引擎給的回應在規則上不合法 → rr＝null（不猜），評等照舊`,async()=>{
    const{r}=await run(()=>L("a0a1",500));
    assert.equal(r.rr,null);assert.equal(r.q,"敗著");assert.equal(r.loss,500);
  });
  test(`失著的後果（${who}方）：走的就是最佳著 → 只查一次、rr＝null`,async()=>{
    const{r,calls}=await run(null,{played:"a4b4"});
    assert.equal(calls.length,1);assert.equal(r.q,"正著");assert.equal(r.rr,null);
  });
}
test("stateRebuild（存檔讀回）保留 rr；舊存檔沒有 rr 也照常重建",()=>{
  const rr={m:"h7e7",c:"砲8平5",x:null,k:false,mt:null};
  const S={moves:[{f:sq("h2"),t:sq("e2"),q:"失著",loss:200,rr:J(rr)},{f:sq("h7"),t:sq("e7")}]};C.stateRebuild(S);
  assert.deepEqual(J(S.moves[0].rr),rr);assert.equal(S.moves[1].rr,undefined);assert.equal(S.moves[0].q,"失著");
  const O={moves:[{f:sq("h2"),t:sq("e2"),q:"正著",loss:0}]};C.stateRebuild(O);assert.equal(O.moves[0].rr,undefined);assert.equal(O.moves.length,1);
});
test("gameItem（存起來的棋譜）帶出 rr；舊存檔沒有 rr 是 undefined",()=>{
  const rr={m:"h7e7",c:"砲8平5",x:null,k:true,mt:null};
  const it=C.gameItem({id:"2026-11-11T01-00-00",red:"你",black:"電腦",result:{w:"b",why:"認輸"},moves:[{f:sq("h2"),t:sq("e2"),by:"r",q:"失著",loss:200,rr},{f:sq("h7"),t:sq("e7"),by:"b",q:"正著"}]},false);
  assert.deepEqual(J(it.lines[0].moves[0].rr),rr);assert.equal(it.lines[0].moves[1].rr,undefined);
});

// ====================== ② 05-settings.js mflRisk ======================
const a0=SET_SRC.indexOf("function mflRisk("),e0=SET_SRC.indexOf("\n/* 一句白話的「為什麼」",a0);
assert.ok(a0>0&&e0>a0,"找不到 mflRisk");
function loadRisk(){const ctx={};ctx.window=ctx;ctx.XQCore=C;vm.createContext(ctx);vm.runInContext(SET_SRC.slice(a0,e0)+";this.mflRisk=mflRisk;",ctx,{filename:"05-settings.js(mflRisk)"});return ctx.mflRisk}
const risk=loadRisk();
for(const side of["r","b"]){const who=side==="r"?"紅":"黑",{b,U}=pos(side),[f,t]=mv(U("a4a5")),a=C.make(b,f,t),m={f,t};
  const rrOf=(u,o)=>{const[rf,rt]=mv(U(u)),nb=C.make(a,rf,rt);return{m:U(u),c:C.notate(a,rf,rt),x:a[rt]&&C.sideOf(a[rt])===side?a[rt]:null,k:C.inCheck(nb,side),mt:null,...(o||{})}};
  test(`後果文字（${who}方）：分析線吃子才說「可以吃你的${NAME[side]}」，帶對方那手的記譜`,()=>{
    const g={q:"敗著",rr:rrOf("a9a5")};
    for(const s of[risk(b,side,m,g),risk(null,side,null,g)])assert.equal(s,`這手讓對方下一手可以吃你的${NAME[side]}（${g.rr.c}）。`);
  });
  test(`後果文字（${who}方）：沒有吃子、沒將軍、沒殺 → 不說；舊存檔沒有 rr → 不說`,()=>{
    const quiet=rrOf("a9a8");assert.equal(quiet.x,null);assert.equal(quiet.k,false);
    assert.equal(risk(b,side,m,{q:"失著",rr:quiet}),"");
    assert.equal(risk(b,side,m,{q:"失著",loss:300,ev:-200,bm:"a4b4"}),"","舊存檔：沒有 rr 欄位");
    assert.equal(risk(b,side,m,{q:"失著",rr:null}),"","走的就是最佳著：rr＝null");
    assert.equal(risk(b,side,m,null),"");assert.equal(risk(null,side,null,{rr:"亂寫"}),"");
  });
  test(`後果文字（${who}方）：有盤面就用規則重驗——rr 說吃子但盤面沒吃到、或那手不合法，都不說`,()=>{
    const fake={...rrOf("a9a8"),x:side==="r"?"R":"r"};
    assert.equal(risk(b,side,m,{rr:fake}),"","盤面上 a8 沒有子，不能說吃到俥");
    assert.match(risk(null,side,null,{rr:fake}),/可以吃你的/,"沒有盤面時才照 rr 說（著法條泡泡）");
    assert.equal(risk(b,side,m,{rr:{...rrOf("a9a5"),m:U("a9b8")}}),"","車不能斜走：不合法就不說");
    assert.equal(risk(b,side==="r"?"b":"r",m,{rr:rrOf("a9a5")}),"","走這步的不是這一方：不說");
  });
  test(`後果文字（${who}方）：將軍、將死`,()=>{
    const ck=rrOf("a9d9");assert.equal(ck.k,true);
    assert.equal(risk(b,side,m,{rr:ck}),`這手讓對方下一手可以將軍你（${ck.c}）。`);
    assert.equal(risk(b,side,m,{rr:{...ck,mt:1}}),`這手讓對方下一手就能將死你（${ck.c}）。`);
    assert.equal(risk(b,side,m,{rr:rrOf("a9a5",{mt:3})}),`這手讓對方 3 步內就能將死你，從「${rrOf("a9a5").c}」開始。`);
    assert.equal(risk(b,side,m,{rr:rrOf("a9a5",{mt:3}),bmt:-5}),`這手讓對方下一手可以吃你的${NAME[side]}（${rrOf("a9a5").c}）。`,"最佳著也被殺：不怪這步、不說將死，只說吃子");
  });
}

// ====================== ③ local.js：清單的 pend、/db/grades 補存檔 ======================
function memStorage(){const m=new Map();return{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>{m.set(k,String(v))},removeItem:k=>{m.delete(k)}}}
function fakeIDB(data){const later=f=>setImmediate(()=>setImmediate(f));
  return{data,open(){const r={};setImmediate(()=>{r.result={transaction(){const t={},store={
    get(k){const q={result:data.get(k)};setImmediate(()=>q.onsuccess&&q.onsuccess());return q},put(v,k){data.set(k,v);return{}},delete(k){data.delete(k);return{}}};
    t.objectStore=()=>store;later(()=>t.oncomplete&&t.oncomplete());return t}};r.onsuccess&&r.onsuccess()});return r}}}
function loadLocal(data,eng){const timers=[];
  const ctx={engine:eng||null,console,URL,URLSearchParams,setImmediate,setTimeout:(fn,ms)=>{timers.push({fn,ms});return timers.length},clearTimeout(){},setInterval:()=>0,clearInterval(){},
    localStorage:memStorage(),indexedDB:fakeIDB(data),location:{href:"http://localhost/",hash:"",pathname:"/",search:""},history:{replaceState(){}},navigator:{onLine:true},
    Event:class{constructor(t){this.type=t}},CustomEvent:class{constructor(t,d){this.type=t;this.detail=d&&d.detail}},
    addEventListener(){},removeEventListener(){},dispatchEvent(){return true},document:{hidden:false,addEventListener(){}},atob:s=>Buffer.from(s,"base64").toString("binary"),
    XQEngine:{ready:true,search:async(...a)=>{if(!ctx.engine)throw new Error("這個測試不用引擎");return ctx.engine(...a)}}};
  ctx.window=ctx;vm.createContext(ctx);vm.runInContext(CORE_SRC,ctx,{filename:"core.js"});vm.runInContext(LOCAL_SRC,ctx,{filename:"local.js"});
  return{ctx,api:(u,b)=>ctx.XQ.api(u,b),timers,
    runAnalyze:async()=>{const t=timers.filter(x=>x.fn.name==="analyzePlay");timers.length=0;assert.ok(t.length,"要排背景評等");await t[t.length-1].fn()}}}
test("下完才評好的步、缺 PV 之後重評好的步，都補進存起來的棋譜（gamePatch）；缺 PV 會再排一次重評",async()=>{
  const data=new Map();let round=1;
  const P=loadLocal(data,async(req,opt,mpv)=>{if(mpv===2)return{best:"h0g2",lines:[L("h0g2",40),L("b0c2",35)]};return round===1?{best:"a0a1",lines:[],nopv:true}:{best:"h7e7",lines:[L("h7e7",150)]}});
  await P.api("/play/new",{human:"r",lx:3});const s0=await P.api("/play/move",{f:sq("h2"),t:sq("e2")});const id=s0.id;
  await P.api("/play/resign",{});await new Promise(r=>setTimeout(r,20));
  let rec=data.get("games:play").find(g=>g.id===id);assert.equal(rec.moves[0].q,undefined,"認輸那一刻這步還沒評");
  await P.runAnalyze();await new Promise(r=>setTimeout(r,20));
  rec=data.get("games:play").find(g=>g.id===id);assert.equal(rec.moves[0].q,undefined,"缺 PV：保持未評，不寫成正著");
  assert.equal((await P.api("/db/items?c=play")).items[0].pend,1,"清單寫還有 1 步沒評");
  assert.ok(P.timers.some(x=>x.fn.name==="analyzePlay"&&x.ms===5000),"缺 PV 的步 5 秒後再評一次");
  round=2;await P.runAnalyze();await new Promise(r=>setTimeout(r,20));
  rec=data.get("games:play").find(g=>g.id===id);assert.equal(rec.moves[0].q,"失著");assert.equal(rec.moves[0].loss,190);
  assert.deepEqual(J(rec.moves[0].rr),{m:"h7e7",c:"砲8平5",x:null,k:false,mt:null});
  assert.equal((await P.api("/db/items?c=play")).items[0].pend,undefined,"評完清單就不再寫");
  assert.ok(!P.timers.some(x=>x.fn.name==="analyzePlay"),"都評好了不再排重評");
});
const ID="2026-11-11T02-00-00";
const g0=()=>({id:ID,date:"2026-11-11",level:3,human:"r",result:{w:"b",why:"認輸"},moves:[
  {f:sq("h2"),t:sq("e2"),by:"r",q:"正著",loss:0},{f:sq("h7"),t:sq("e7"),by:"b",q:"正著"},
  {f:sq("h0"),t:sq("g2"),by:"r"},{f:sq("h9"),t:sq("g7"),by:"b"},{f:sq("i0"),t:sq("h0"),by:"r"}]});
test("對局紀錄清單：pend＝我方還有幾步沒評（對方的步不算）；舊存檔沒有 rr 照常讀",async()=>{
  const P=loadLocal(new Map([["games:play",[g0()]]]));
  const d=await P.api("/db/items?c=play");assert.equal(d.items.length,1);assert.equal(d.items[0].pend,2);
  const it=await P.api("/db/item?c=play&id="+ID);assert.equal(it.lines[0].moves.length,5);assert.equal(it.lines[0].moves[0].rr,undefined);
});
test("/db/grades：後來評好的補進存檔（帶 rr）；f、t 對不上的不補、已經有評等的不動；補完清單的 pend 跟著少",async()=>{
  const data=new Map([["games:play",[g0()]]]),P=loadLocal(data);
  const rr={m:"b9c7",c:"馬2進3",x:null,k:false,mt:null};
  const r=await P.api("/db/grades",{c:"play",id:ID,g:{
    3:{f:sq("h0"),t:sq("g2"),q:"失著",loss:200,ev:-150,rr,bmt:null,pmt:null,bm:"b0c2"},
    5:{f:sq("a0"),t:sq("a1"),q:"敗著",loss:500},           // f、t 跟存檔那一步不同：不補
    1:{f:sq("h2"),t:sq("e2"),q:"敗著",loss:999}}});         // 已經評過：不動
  assert.equal(r.n,1);
  const st=data.get("games:play")[0];assert.equal(st.moves[2].q,"失著");assert.deepEqual(J(st.moves[2].rr),rr);
  assert.equal(st.moves[4].q,undefined);assert.equal(st.moves[0].q,"正著");assert.equal(st.moves[0].loss,0);
  const d=await P.api("/db/items?c=play");assert.equal(d.items[0].pend,1);
  const it=await P.api("/db/item?c=play&id="+ID);assert.deepEqual(J(it.lines[0].moves[2].rr),rr);
  await assert.rejects(P.api("/db/grades",{c:"study",id:ID,g:{}}),/不能補評等/);
});
test("線上對局一步都沒評過：清單不寫「在分析」（本來就不會自動評）；有評過一部分才寫",async()=>{
  const pv=o=>({id:"2026-11-11T03-00-00",date:"2026-11-11",red:"甲",black:"乙",tc:"none",result:{w:"r",why:"認輸"},net:true,mine:"b",moves:[
    {f:sq("h2"),t:sq("e2"),by:"r",...(o?{q:"正著"}:{})},{f:sq("h7"),t:sq("e7"),by:"b"}]});
  let P=loadLocal(new Map([["games:pvp",[pv(false)]]]));assert.equal((await P.api("/db/items?c=pvp")).items[0].pend,undefined);
  P=loadLocal(new Map([["games:pvp",[pv(true)]]]));assert.equal((await P.api("/db/items?c=pvp")).items[0].pend,1);
});
