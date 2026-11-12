// 第 11 輪 X3：可選的雲端匿名健康摘要（xiangqi-db/m/05d-telemetry.js）＋開發者電腦收資料（collect-anon.js 的 saveHlt）
// 行為測試：在模擬的手機環境載入 05c-health.js＋05d-telemetry.js，用假的 XQNet.shareIRT 接住送出的東西，檢查——
//   預設不送、開了才送、兒童模式／家長關大廳／開發者模式不送、一天一次、只送上次之後新增的、送的內容不含名字／裝置代號／存檔／棋譜。
// 用法：node --test xiangqi-lab/tools/test-telemetry.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),os=require("os"),path=require("path"),vm=require("vm");
const LAB=path.join(__dirname,".."),DB=path.join(LAB,"../xiangqi-db");
const HEALTH=fs.readFileSync(path.join(DB,"m/05c-health.js"),"utf8"),TELE=fs.readFileSync(path.join(DB,"m/05d-telemetry.js"),"utf8");
const DAY=864e5,T0=new Date(2026,10,12,10,0,0).getTime();

function phone(init,opt){
  opt=opt||{};const clock={t:T0},ls=new Map(Object.entries(init||{})),H={},obs=[],sent=[],dropped=[],net=[],timers=[];
  const on=(t,f)=>{(H[t]=H[t]||[]).push(f)};
  class FakeDate extends Date{constructor(...a){if(a.length)super(...a);else super(clock.t)}static now(){return clock.t}}
  const ctx={console,Date:FakeDate,Math,JSON,Promise,
    localStorage:{getItem:k=>ls.has(k)?ls.get(k):null,setItem:(k,v)=>ls.set(k,String(v)),removeItem:k=>ls.delete(k)},
    location:{hash:"#/",hostname:"raysonchen2023-cloud.github.io"},addEventListener:on,setInterval:()=>0,setTimeout:(f,ms)=>{timers.push([f,ms]);return 0},
    document:{readyState:"complete",hidden:false,addEventListener:on,body:{append(){}},createElement:()=>({click(){},remove(){}})},
    performance:{now:()=>900,getEntriesByType:t=>t==="navigation"?[{domContentLoadedEventEnd:812.4}]:[]},
    PerformanceObserver:class{constructor(cb){this.cb=cb;obs.push(this)}observe(o){this.type=o.type}},
    navigator:{webdriver:!!opt.webdriver},screen:{width:390,height:844},devicePixelRatio:3,matchMedia:()=>({matches:false}),
    fetch:(...a)=>{net.push(a);return Promise.reject(new Error("不該直接連網"))},XMLHttpRequest:function(){net.push("xhr")},
    XQ_BUILD:"20261112-2200",
    XQNet:opt.noNet?undefined:{shareIRT:x=>sent.push(JSON.parse(JSON.stringify(x))),dropIRT:t=>dropped.push(t)},
    fnDev:()=>"phone",fnTest:()=>!!opt.test,DEVMODE:()=>!!opt.dev};
  if(opt.anonOk)ctx.XQ_ANON_OK=opt.anonOk;
  if(opt.fmNetOff)ctx.fmNetOff=opt.fmNetOff;
  ctx.window=ctx;
  ctx.store={get(k,d){const v=ctx.localStorage.getItem("m_"+k);return v==null?d:JSON.parse(v)},set(k,v){ctx.localStorage.setItem("m_"+k,JSON.stringify(v))}};
  vm.createContext(ctx);vm.runInContext(HEALTH,ctx,{filename:"05c-health.js"});vm.runInContext(TELE,ctx,{filename:"05d-telemetry.js"});
  const fire=(t,e)=>(H[t]||[]).forEach(f=>f(e||{}));
  const hide=()=>{ctx.document.hidden=true;fire("visibilitychange");ctx.document.hidden=false};
  const longs=entries=>obs.filter(o=>o.type==="longtask").forEach(o=>o.cb({getEntries:()=>entries}));
  const res=entries=>obs.filter(o=>o.type==="resource").forEach(o=>o.cb({getEntries:()=>entries}));
  return{ctx,ls,clock,fire,hide,longs,res,sent,dropped,net,timers,optIn:v=>ctx.store.set("teleOptIn",v)}}

test("預設關：沒打開開關，開 App、切到背景、關掉、90 秒計時都不送",()=>{
  const T=phone();T.fire("error",{message:"x",filename:"m.html",lineno:1});
  T.hide();T.fire("pagehide");for(const [f] of T.timers)f();
  assert.equal(T.ctx.store.get("teleOptIn","沒設"),"沒設","App 不會自己寫這個鍵");
  assert.equal(T.sent.length,0);assert.equal(T.ctx.tlmTry(),false);assert.equal(T.net.length,0)});
test("開了才送：送 t:\"hlt\"，欄位只有允許的那幾個；90 秒計時也會觸發",()=>{
  const T=phone();T.optIn(true);T.longs([{duration:80},{duration:120.6}]);
  T.res([{name:"https://x/a.webp",transferSize:1024,duration:20}]);T.fire("error",{target:{tagName:"IMG",src:"https://x/b.webp"}});
  T.fire("error",{message:"TypeError: boom",filename:"https://h/m.html?x=1",lineno:42});
  const t90=T.timers.find(t=>t[1]===90000);assert.ok(t90,"開 App 90 秒後檢查一次");t90[0]();
  assert.equal(T.sent.length,1);const p=T.sent[0];
  assert.deepEqual(Object.keys(p).sort(),["bt","dev","e","em","lt","rf","t","v","ver"]);
  assert.equal(p.t,"hlt");assert.equal(p.v,1);assert.equal(p.ver,"20261112-2200");assert.equal(p.dev,"phone");
  assert.equal(p.e,1);assert.deepEqual(p.em,[["TypeError: boom","m.html",42]]);assert.deepEqual(p.lt,[2,201]);assert.equal(p.bt,812);assert.deepEqual(p.rf,[1,0,0]);
  assert.equal(T.net.length,0,"只走 XQNet.shareIRT，不自己連網")});
test("一天最多一次；隔天只送上次之後新增的（差值）",()=>{
  const T=phone();T.optIn(true);for(let i=0;i<3;i++)T.fire("error",{message:"e"+i,filename:"a.js",lineno:i});
  T.hide();T.hide();T.fire("pagehide");assert.equal(T.sent.length,1,"同一天切背景好幾次也只送一次");assert.equal(T.sent[0].e,3);
  T.fire("error",{message:"新的錯",filename:"b.js",lineno:9});T.longs([{duration:60}]);T.hide();assert.equal(T.sent.length,1);
  T.clock.t+=DAY;T.hide();assert.equal(T.sent.length,2,"隔天再送");
  const p=T.sent[1];assert.equal(p.e,1);assert.deepEqual(p.em,[["新的錯","b.js",9]]);assert.deepEqual(p.lt,[1,60]);
  T.clock.t+=DAY;T.hide();assert.equal(T.sent[2].e,0,"沒有新錯誤也送（當分母：有開著、沒出錯）");assert.deepEqual(T.sent[2].em,[])});
test("本機紀錄被清掉過：從 0 重新算，不會送負數",()=>{
  const T=phone();T.optIn(true);for(let i=0;i<4;i++)T.fire("error",{message:"e"+i,filename:"a.js",lineno:i});T.hide();assert.equal(T.sent[0].e,4);
  T.ctx.healClear();T.fire("error",{message:"清掉後",filename:"a.js",lineno:1});T.clock.t+=DAY;T.hide();
  assert.equal(T.sent[1].e,1);assert.deepEqual(T.sent[1].lt,[0,0]);assert.deepEqual(T.sent[1].rf,[0,0,0])});
test("錯誤訊息最多 5 筆、每筆 80 字內",()=>{
  const T=phone();T.optIn(true);for(let i=0;i<9;i++)T.fire("error",{message:"錯誤"+i+"："+"長".repeat(200),filename:"a.js",lineno:i});T.hide();
  const p=T.sent[0];assert.equal(p.e,9);assert.equal(p.em.length,5);assert.ok(p.em.every(a=>a[0].length<=80));assert.match(p.em[4][0],/^錯誤8/)});
test("兒童模式不送；家長關閉線上大廳不送；開發者模式、自動化測試不送",()=>{
  for(const [nm,init,opt] of [["兒童模式",{m_fmCfg:JSON.stringify({kid:true})},{}],["家長關大廳",{m_fmCfg:JSON.stringify({net:false})},{}],
    ["fmNetOff 回 true",{},{fmNetOff:()=>true}],["開發者模式",{},{dev:true}],["自動化測試",{},{webdriver:true}]]){
    const T=phone(init,opt);T.optIn(true);T.fire("error",{message:"x",filename:"a.js",lineno:1});T.hide();T.fire("pagehide");
    assert.equal(T.sent.length,0,nm+" 不該送")}});
test("送出端判斷不准（XQ_ANON_OK 回 false）就不送，也不算今天送過",()=>{
  let ok=false;const T=phone({}, {anonOk:x=>ok});T.optIn(true);T.hide();assert.equal(T.sent.length,0);
  assert.equal(T.ctx.store.get("tlmDay",""),"");ok=true;T.hide();assert.equal(T.sent.length,1)});
test("關掉開關：停送，並丟掉手機裡排隊還沒送出的 hlt；從沒送過就不去動排隊清單",()=>{
  const T=phone();T.hide();assert.deepEqual(T.dropped,[],"從沒送過");
  T.optIn(true);T.hide();assert.equal(T.sent.length,1);T.optIn(false);T.clock.t+=DAY;T.hide();
  assert.equal(T.sent.length,1);assert.deepEqual(T.dropped,["hlt"]);T.hide();assert.deepEqual(T.dropped,["hlt"],"丟一次就好")});
test("隱私：送的內容不含名字、裝置代號、存檔、棋譜、網址參數、功能使用、日期",()=>{
  const me={id:"k3j9x2q8w7e5r1t0",name:"王小明"};
  const T=phone({xq_me:JSON.stringify(me),m_slot1:JSON.stringify({moves:["h2e2","h9g7"]}),m_journey:JSON.stringify({c:"lin"}),m_anonId:JSON.stringify("ab12cd34"),
    m_funnel:JSON.stringify({id:"abc123xyz9",t0:1,s:{open:0}})});
  T.optIn(true);T.ctx.location.hash="#/journey/3";T.fire("hashchange");
  T.fire("error",{message:"王小明 的存檔 k3j9x2q8w7e5r1t0 讀不到 https://h/m.html?name=王小明 token=ab12cd34ef",filename:"https://h/m.html?name=王小明",lineno:7});
  T.fire("unhandledrejection",{reason:new Error("h2e2 失敗 player-a1b2c3d4e5")});T.hide();
  const s=JSON.stringify(T.sent[0]);
  for(const bad of["王小明","k3j9x2q8w7e5r1t0","ab12cd34","abc123xyz9","name=","https://","journey","lin","2026-11","a1b2c3d4e5"])assert.ok(!s.includes(bad),"不該出現："+bad+" → "+s);
  assert.ok(!/"(id|iid|aid|sid|name|nm|slot|save|moves|feat|features|days|screen)"/.test(s),"沒有任何識別或存檔欄位："+s)});
test("沒有 XQNet（大廳程式沒載入）：不送、不算今天送過、不出錯",()=>{
  const T=phone({}, {noNet:true});T.optIn(true);assert.equal(T.ctx.tlmTry(),false);assert.equal(T.ctx.store.get("tlmDay",""),"")});
test("測試機（xq_netRoot、本機）加 test:1",()=>{
  const T=phone({}, {test:true});T.optIn(true);T.hide();assert.equal(T.sent[0].test,1)});
test("開發者電腦 collect-anon.js：收 t:\"hlt\" 存成一行；夾範圍、丟掉多的欄位；保留 90 天",()=>{
  const CA=require("./collect-anon.js"),dir=fs.mkdtempSync(path.join(os.tmpdir(),"xqhlt-")),f=path.join(dir,"h.jsonl");
  const log=console.log;console.log=()=>{};
  try{
    const r=CA.saveHlt({t:"hlt",v:1,ver:"20261112-2200",dev:"phone",e:3,em:[["TypeError: x".repeat(20),"../m.html?q=1",42],["b","a.js",-5],[1],[2],[3],[4]],lt:[2,201],bt:812,rf:[1,0,2],
      name:"王小明",id:"k3j9x2q8",save:{a:1}},f);
    const L=fs.readFileSync(f,"utf8").trim().split("\n");assert.equal(L.length,1);const x=JSON.parse(L[0]);
    assert.deepEqual(Object.keys(x).sort(),["at","bt","dev","e","em","lt","rf","v","ver"]);assert.equal(x.em.length,5);assert.equal(x.em[0][0].length,80);
    assert.equal(x.em[0][1],"..m.htmlq1");assert.equal(x.em[1][2],0);assert.deepEqual(x.lt,[2,201]);assert.deepEqual(x.rf,[1,0,2]);assert.equal(x.bt,812);
    assert.equal(CA.saveHlt({t:"hlt",v:9},f),null,"不認得的格式版本不收");
    const K=Object.fromEntries(CA.KEEP.map(([p,d])=>[path.basename(p),d]));assert.equal(K["health-telemetry.jsonl"],90);assert.equal(K["health-telemetry.test.jsonl"],90);
    assert.equal(path.basename(CA.HLT_FILE),"health-telemetry.jsonl");assert.equal(path.dirname(CA.HLT_FILE),path.resolve(DB));
  }finally{console.log=log;fs.rmSync(dir,{recursive:true,force:true})}});
test("〔原始碼〕m.html 在 05c-health.js 後面引入 05d-telemetry.js；開關讀 store \"teleOptIn\"（預設 false）",()=>{
  const M=fs.readFileSync(path.join(DB,"m.html"),"utf8");const a=M.indexOf("//#include m/05c-health.js"),b=M.indexOf("//#include m/05d-telemetry.js");
  assert.ok(a>0&&b>a,"順序：05c 再 05d");assert.match(TELE,/store\.get\("teleOptIn",false\)/)});
test("〔原始碼〕兩份隱私說明一樣，寫了匿名健康摘要、預設關、90 天",()=>{
  const P=fs.readFileSync(path.join(DB,"art/docs/privacy.md"),"utf8");assert.equal(fs.readFileSync(path.join(LAB,"site/data/docs/privacy.md"),"utf8"),P);
  assert.match(P,/匿名健康摘要/);assert.match(P,/預設關/);assert.match(P,/匿名健康摘要（開發者電腦）：90 天/)});
