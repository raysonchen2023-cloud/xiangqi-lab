// 第 10 輪 F2：本機使用與健康紀錄（xiangqi-db/m/05c-health.js）
// 行為測試：在模擬的手機環境載入模組，實際觸發換頁、錯誤、資源載入、長任務，檢查匯出的 JSON——
//   有記到該記的；不含名字、裝置代號、存檔、網址參數、玩家打的字；只存在本機（沒有任何網路呼叫）；清除歸零。
// 用法：node --test xiangqi-lab/tools/test-health.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const LAB=path.join(__dirname,".."),DB=path.join(LAB,"../xiangqi-db");
const SRC=fs.readFileSync(path.join(DB,"m/05c-health.js"),"utf8");

function phone(init){
  const ls=new Map(Object.entries(init||{})),H={},obs=[],net=[],modals=[],toasts=[];
  const on=(t,f)=>{(H[t]=H[t]||[]).push(f)};
  const ctx={console,Date,Math,JSON,Promise,Blob,URL,
    localStorage:{getItem:k=>ls.has(k)?ls.get(k):null,setItem:(k,v)=>ls.set(k,String(v)),removeItem:k=>ls.delete(k)},
    location:{hash:"#/"},addEventListener:on,setInterval:()=>0,setTimeout:()=>0,
    document:{readyState:"complete",hidden:false,addEventListener:on,body:{append(){}},createElement:()=>({click(){},remove(){}})},
    performance:{now:()=>900,getEntriesByType:t=>t==="navigation"?[{domContentLoadedEventEnd:812.4}]:[]},
    PerformanceObserver:class{constructor(cb){this.cb=cb;obs.push(this)}observe(o){this.type=o.type}},
    navigator:{storage:{estimate:async()=>({usage:5.5*1048576,quota:1024*1048576})},clipboard:{writeText:async()=>{}}},
    screen:{width:390,height:844},devicePixelRatio:3,matchMedia:()=>({matches:false}),
    fetch:(...a)=>{net.push(a);return Promise.reject(new Error("不該連網"))},XMLHttpRequest:function(){net.push("xhr")},
    toast:t=>toasts.push(t),esc:s=>String(s).replace(/[<>&"]/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;",'"':"&quot;"}[c])),
    modal:(h,b)=>{modals.push({h,b});return{}},appVer:async()=>"20261112-1330"};
  ctx.window=ctx;
  ctx.store={get(k,d){const v=ctx.localStorage.getItem("m_"+k);return v==null?d:JSON.parse(v)},set(k,v){ctx.localStorage.setItem("m_"+k,JSON.stringify(v))}};
  vm.createContext(ctx);vm.runInContext(SRC,ctx,{filename:"05c-health.js"});
  const fire=(t,e)=>(H[t]||[]).forEach(f=>f(e||{}));
  const go=h=>{ctx.location.hash=h;fire("hashchange")};
  const res=entries=>obs.filter(o=>o.type==="resource").forEach(o=>o.cb({getEntries:()=>entries}));
  const longs=entries=>obs.filter(o=>o.type==="longtask").forEach(o=>o.cb({getEntries:()=>entries}));
  return{ctx,ls,fire,go,res,longs,net,modals,toasts,exp:async()=>JSON.parse(JSON.stringify(await ctx.healExport()))}}

test("開 App：記一次開啟、首頁一次、啟動毫秒；格式和版本都有",async()=>{
  const T=phone(),x=await T.exp();
  assert.equal(x.format,"xq-health-v1");assert.equal(x.app.version,"20261112-1330");
  assert.equal(x.usage.opens,1);assert.equal(x.usage.activeDays,1);assert.equal(x.usage.features.home,1);
  assert.equal(x.health.bootMs.median,812);assert.equal(x.health.bootMs.samples,1);
  assert.deepEqual(x.health.storage,{usedMB:5.5,quotaMB:1024});assert.deepEqual(x.device.screen,[390,844])});
test("換頁：只記網址 # 後第一段的頁面名；奇怪的字、大寫、中文、太長的一律不記",async()=>{
  const T=phone();for(const h of["#/journey/3","#/journey","#/canju?id=99","#/db/王小明","#/Hello","#/我的名字","#/"+"a".repeat(30),"#/settings","#/"])T.go(h);
  const f=(await T.exp()).usage.features;
  assert.deepEqual(f,{home:2,journey:2,canju:1,db:1,settings:1});
  assert.equal((await T.exp()).usage.firstUseDay.journey,0,"第一次用到＝安裝後第 0 天")});
test("錯誤：記次數；訊息只留前 80 字，檔名去掉網址參數和路徑",async()=>{
  const T=phone();T.fire("error",{message:"TypeError: "+"x".repeat(200),filename:"https://raysonchen2023-cloud.github.io/xiangqi-lab/m.html?token=SECRET#a",lineno:42});
  T.fire("unhandledrejection",{reason:new Error("讀不到 data/gm.json")});
  const e=(await T.exp()).health.errors;assert.equal(e.count,2);
  assert.equal(e.recent[0].m.length,80);assert.equal(e.recent[0].f,"m.html");assert.equal(e.recent[0].l,42);
  assert.match(e.recent[1].m,/^未處理的 Promise：讀不到/);
  for(let i=0;i<15;i++)T.fire("error",{message:"e"+i,filename:"a.js",lineno:i});
  const e2=(await T.exp()).health.errors;assert.equal(e2.count,17);assert.equal(e2.recent.length,10,"最近 10 筆");assert.equal(e2.recent[9].m,"e14")});
test("資源：圖片、程式、資料檔分開算個數、KB、失敗、最慢；不認得的類型不記",async()=>{
  const T=phone();
  T.res([{name:"https://x/art/a.webp?v=3",transferSize:10240,duration:120},{name:"https://x/park3d.js",transferSize:204800,duration:340},
    {name:"https://cdn/pikafish.nnue",transferSize:5*1048576,duration:2600},{name:"https://x/data/gm.json",transferSize:0,duration:15},{name:"https://x/",transferSize:3000,duration:50}]);
  T.fire("error",{target:{tagName:"IMG",src:"https://x/art/b.webp"}});
  const r=(await T.exp()).health.resources;
  assert.deepEqual(r.img,{count:2,kb:10,failed:1,slowestMs:120});assert.deepEqual(r.js,{count:1,kb:200,failed:0,slowestMs:340});
  assert.deepEqual(r.data,{count:2,kb:5120,failed:0,slowestMs:2600});
  assert.equal((await T.exp()).health.errors.count,0,"圖片載入失敗算資源失敗，不算程式錯誤")});
test("卡頓：長任務次數和總毫秒",async()=>{
  const T=phone();T.longs([{duration:80},{duration:120.6}]);assert.deepEqual((await T.exp()).health.longTasks,{count:2,totalMs:201})});
test("隱私：匯出不含名字、裝置代號、存檔、網址參數；整個過程沒有任何網路呼叫",async()=>{
  const T=phone({m_name:JSON.stringify("王小明"),m_devId:JSON.stringify("dev-8f3k2"),m_slot1:JSON.stringify({moves:["h2e2"]}),m_funnel:JSON.stringify({id:"abc123xyz",t0:1,s:{open:0,g1e:300},end:1})});
  T.go("#/journey");T.fire("error",{message:"x",filename:"https://h/m.html?name=王小明",lineno:1});
  const s=JSON.stringify(await T.exp());
  for(const bad of["王小明","dev-8f3k2","h2e2","SECRET","abc123xyz","name="])assert.ok(!s.includes(bad),"不該出現："+bad);
  assert.deepEqual(JSON.parse(s).onboarding,{steps:{open:0,g1e:300},finished:true},"新手流程只拿步驟秒數，不拿匿名碼");
  assert.equal(T.net.length,0,"不連網")});
test("存在本機：store \"health\" 寫進 localStorage；重開 App 接著累計；清除歸零",async()=>{
  const T=phone();T.go("#/canju");T.ctx.healSave();const raw=T.ls.get("m_health");assert.ok(raw);
  const T2=phone({m_health:raw});const x=await T2.exp();assert.equal(x.usage.opens,2,"兩次開 App");assert.equal(x.usage.features.canju,1);assert.equal(x.usage.features.home,2);
  T2.ctx.healClear();const y=await T2.exp();assert.equal(y.usage.opens,0);assert.deepEqual(y.usage.features,{});assert.equal(y.health.errors.count,0)});
test("使用天數只留最近 60 天",async()=>{
  const days={};for(let i=0;i<70;i++)days["2026-08-"+String(i).padStart(2,"0")]=1;
  const T=phone({m_health:JSON.stringify({v:1,since:Date.now(),feat:{},first:{},days,err:{n:0,last:[]},res:{img:[0,0,0,0],js:[0,0,0,0],data:[0,0,0,0]},boot:[],lt:[0,0]})});
  assert.equal((await T.exp()).usage.activeDays,60)});
test("畫面：設定 → 隱私的按鈕打開摘要，有複製、存成檔案、清除、關閉；功能名稱翻成中文",async()=>{
  const T=phone();T.go("#/journey");await T.ctx.healShow();const m=T.modals.pop();
  assert.match(m.h,/本機使用與健康紀錄/);assert.match(m.h,/App 不會自動送出/);assert.match(m.h,/雲河棋路/);
  assert.deepEqual(JSON.parse(JSON.stringify(m.b.map(b=>b[0]))),["📋 複製","💾 存成檔案","🗑 清除","關閉"]);
  m.b[2][1]();assert.equal((await T.exp()).usage.opens,0)});
test("〔原始碼〕設定頁隱私卡片有按鈕、m.html 有引入；隱私說明寫了這一項",()=>{
  const S=fs.readFileSync(path.join(DB,"m/05-settings.js"),"utf8");assert.ok(S.includes('id="healB"'));assert.ok(S.includes("healShow()"));
  assert.ok(fs.readFileSync(path.join(DB,"m.html"),"utf8").includes("//#include m/05c-health.js"));
  const P=fs.readFileSync(path.join(DB,"art/docs/privacy.md"),"utf8");assert.match(P,/本機使用與健康紀錄/);assert.match(P,/xq-health-v1/);
  assert.equal(fs.readFileSync(path.join(LAB,"site/data/docs/privacy.md"),"utf8"),P,"兩份隱私說明要同步")});
test("〔文件〕隱私說明裡的匯出範例，欄位跟 App 真正匯出的一模一樣（兩層）",async()=>{
  const P=fs.readFileSync(path.join(DB,"art/docs/privacy.md"),"utf8"),m=P.match(/```json\n([\s\S]*?)\n```/);assert.ok(m,"要有 json 範例");
  const ex=JSON.parse(m[1]),T=phone();T.go("#/journey");const x=await T.exp();
  const keys=o=>Object.keys(o).sort(),two=o=>Object.fromEntries(keys(o).map(k=>[k,o[k]&&typeof o[k]==="object"&&!Array.isArray(o[k])?keys(o[k]):null]));
  x.onboarding=ex.onboarding;assert.deepEqual(two(ex),two(x))});
