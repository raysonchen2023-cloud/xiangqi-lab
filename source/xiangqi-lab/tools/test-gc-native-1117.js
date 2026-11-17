// 11/17 iOS 原生 App：Game Center 成就與排行榜、今日茶單桌面小工具（xiangqi-db/m/07gc-native.js；原生外掛在 xiangqi-ios/native/）
//   網頁版：整支不做事（不包 store.set、不掛事件、不呼叫外掛）
//   原生版：開 App 把存檔裡已有的進度補報一次；之後只報變多的；沒登入不報、登入後補報；排行榜只送變高的分數
//   小工具：節氣、茶單三題、完成幾題、連續天數、節氣圖路徑；內容沒變不重送，茶單進度變了才再送
//   xqqianqiu:// 只認白名單；成就表格式（10～20 項、點數）；不收資料、不新增存檔鍵
// 用法：node --test xiangqi-lab/tools/test-gc-native-1117.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"..","..");
const SRC=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07gc-native.js"),"utf8");

/* 假的執行環境：o.native＝原生 App；o.auth＝Game Center 已登入；o.ls＝存檔（不含 m_ 前綴，值是物件） */
function mk(o){o=o||{};
  const timers=new Map();let tid=0;const calls=[],lis={},win={};const state={auth:o.auth!==false};
  const LS=new Map();for(const[k,v]of Object.entries(o.ls||{}))LS.set("m_"+k,JSON.stringify(v));
  if(o.rate)LS.set("xq_cpuRate",JSON.stringify({pts:o.rate}));
  const on=(k,cb)=>{(lis[k]=lis[k]||[]).push(cb)};
  const plugins={
    XQGameCenter:{authenticate:async()=>{calls.push(["auth"]);return{ok:state.auth,authenticated:state.auth}},
      reportAchievement:async a=>{calls.push(["ach",a.id,a.percent]);return state.auth?{ok:true}:{ok:false,reason:"notAuthenticated"}},
      submitScore:async a=>{calls.push(["score",a.leaderboardId,a.value]);return state.auth?{ok:true}:{ok:false,reason:"notAuthenticated"}},
      showDashboard:async a=>{calls.push(["dash",a.view]);return{ok:true}},
      addListener:(ev,cb)=>on("gc:"+ev,cb)},
    XQWidgetData:{setToday:async a=>{calls.push(["widget",JSON.parse(a.json),a.imagePath]);return{ok:true}}},
    App:{addListener:(ev,cb)=>on("app:"+ev,cb)}};
  const appended=[];
  const sheetBody={querySelector:()=>appended.find(x=>x.id==="gcnBtn")||null,append:x=>appended.push(x)};
  const ctx={console,__ls:LS,
    setTimeout:(f)=>{const id=++tid;timers.set(id,f);return id},clearTimeout:id=>{timers.delete(id)},
    addEventListener:(ev,cb)=>{(win[ev]=win[ev]||[]).push(cb)},
    document:{readyState:"complete",querySelector:s=>s==="#sheet .sh-b"&&o.sheet?sheetBody:null,createElement:()=>({style:{}})},
    location:{hash:"#/"},localStorage:{getItem:k=>LS.has(k)?LS.get(k):null},toast:()=>{},
    xqNat:()=>!!o.native};
  if((o.native||o.bridge)&&!o.noBridge){ctx.XQ_NATIVE=!!o.native;ctx.XQNative={plug:n=>plugins[n]||null,has:n=>!!plugins[n]}}
  /* 07-legend、07i2-seal、07c-canju、07y5、07w7、07bhg 這些既有函式的替身（o.game＝false 就不給） */
  if(o.game!==false){Object.assign(ctx,{
    relicsData:()=>Promise.resolve(o.R||{}),
    sealAll:()=>o.seals||[],
    xpInfo:x=>({L:o.lv||1,total:x}),
    rankInfo:()=>({p:o.rate||0}),
    GSV:{MODE:"gate-siege-v1",CHP:[{n:0,lv:[31,32,33,34,35,36,37,38,39]},{n:1,lv:[1,2,3,4,5,6]},{n:2,lv:[7,8,9,10,11,12]},{n:3,lv:[13,14]}]},
    tdTerm:()=>"立冬",SW7_HSEA:{"立冬":"winter","立春":"spring"},sw7HomeEra:()=>o.era||"",
    cjDay:()=>"2026-11-17",cjLv:d=>d<=2.5?"入門":d<=4?"初級":d<=5.5?"中級":"中高級",
    cjData:()=>Promise.resolve({byId:{a:{t:"短殺",d:2},b:{t:"中殺",d:5},c:{t:"古譜校錯",d:6}}}),
    cjState:()=>JSON.parse(LS.get("m_cj")||"{}"),cjToday:()=>[],cjStreakNow:S=>({n:(S.st&&S.st.n)|0}),
    sealBook:function(){o.opened=(o.opened|0)+1}})}
  ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext('const store={get(k,d){const v=__ls.get("m_"+k);return v==null?d:JSON.parse(v)},set(k,v){__ls.set("m_"+k,JSON.stringify(v))}};var __set0=store.set;',ctx);
  vm.runInContext(SRC.replace("GCN_LB_ON=false","GCN_LB_ON=true"),ctx,{filename:"07gc-native.js"});   /* 排行榜流程照樣測；預設關（開發者 11/17）另一項驗 */
  const env={ctx,calls,lis,win,timers,state,LS,appended,
    run:s=>vm.runInContext(s,ctx),
    async flush(n){for(let i=0;i<(n||30);i++){const fs_=[...timers.values()];timers.clear();for(const f of fs_)f();await new Promise(r=>setImmediate(r))}},
    ach(){const m={};for(const c of calls)if(c[0]==="ach")m[c[1]]=Math.max(m[c[1]]||0,c[2]);return m},
    fire(k,arg){for(const cb of lis[k]||[])cb(arg)},
    winFire(ev){for(const cb of win[ev]||[])cb({})}};
  return env}

/* 一份「玩到一半」的存檔 */
const R={classic:Array.from({length:10},(_,i)=>({id:"c"+i,rarity:i===9?"legend":i>=6?"rare":"common"})),qin:Array.from({length:10},(_,i)=>({id:"q"+i,rarity:"common"}))};
const SOLVED={};for(let i=0;i<10;i++)SOLVED["c"+i]={at:1,p:1};
const GSVC={};for(const k of [31,32,33,34,35,36,37,38,39,1])GSVC[k]={w:1};GSVC[2]={w:0,l:1};
const SEALS=Array.from({length:13},(_,i)=>i<2?{k:"e"+i,n:4,N:4,gold:true}:i<5?{k:"e"+i,n:1,N:4,gold:false}:{k:"e"+i,n:0,N:4,gold:false});
const CJ={day:"2026-11-17",list:[{slot:"sip",id:"a",st:"done"},{slot:"cup",id:"b",st:"todo"},{slot:"pot",id:"c",st:"todo"}],st:{n:8,best:8,days:20}};
const SAVE={relics:{classic:R.classic.map(x=>x.id),qin:["q0","q1"]},relicSolved:SOLVED,xp:5000,gsv:{mv:"gate-siege-v1",c:GSVC},cj:CJ};
const opts=x=>Object.assign({native:true,ls:JSON.parse(JSON.stringify(SAVE)),R,seals:SEALS,lv:23,rate:420},x||{});

test("網頁版：不包 store.set、不掛事件、不呼叫外掛",async()=>{
  for(const o of [{native:false},{native:false,bridge:true},{native:false,game:false}]){
    const E=mk(Object.assign({ls:SAVE},o));
    assert.equal(E.run("GCN.inst"),false);
    assert.equal(E.run("store.set===__set0"),true,"網頁版不能包 store.set");
    assert.deepEqual(Object.keys(E.win),[],"網頁版不能掛事件");
    assert.equal(E.timers.size,0);
    E.run('store.set("relics",{classic:["c0"]})');await E.flush();
    assert.deepEqual(E.calls,[]);
    assert.equal(E.run("gcnNat()"),false);
  }
});

test("UA 像原生 App 但沒有 XQNative（橋接檔沒載到）：也不做事",async()=>{
  const E=mk({native:true,noBridge:true,ls:SAVE});
  assert.equal(E.run("GCN.inst"),false);
  assert.equal(E.run("store.set===__set0"),true);
  await E.flush();
  assert.deepEqual(E.calls,[]);
});

test("原生版：開 App 把存檔裡已有的進度補報一次（id 有前綴、只報 >0）",async()=>{
  const E=mk(opts());
  assert.equal(E.run("GCN.inst"),true);
  assert.equal(E.run("store.set===__set0"),false,"原生版要包 store.set");
  await E.flush();
  assert.ok(E.calls.some(c=>c[0]==="auth"),"要先問登入");
  const A=E.ach(),P="qianqiu.ach.";
  assert.equal(A[P+"relic_first"],100);
  assert.equal(A[P+"relic_10"],100);
  assert.equal(A[P+"relic_50"],24);           /* 12 件 */
  assert.equal(A[P+"relic_all"],60);          /* 12／20（relics.json 讀到後用真正總數） */
  assert.equal(A[P+"relic_legend"],100);      /* c9 是傳說 */
  assert.equal(A[P+"relic_puzzle"],100);
  assert.equal(A[P+"relic_era_gold"],100);    /* classic 10 件都收到又都解開 */
  assert.equal(A[P+"seal_first"],100);
  assert.equal(A[P+"seal_gold"],100);
  assert.equal(A[P+"seal_gold_7"],28);        /* 2／7 */
  assert.equal(A[P+"seal_master"],15);        /* 2／13 */
  assert.equal(A[P+"siege_prologue"],100);
  assert.equal(A[P+"siege_ch1"],16);          /* 1／6 */
  assert.equal(A[P+"siege_ch2"],undefined,"0％ 不報");
  assert.equal(A[P+"tea_7"],100);
  assert.equal(A[P+"tea_30"],26);
  assert.equal(A[P+"lv_10"],100);
  assert.equal(A[P+"lv_50"],46);
  for(const id of Object.keys(A))assert.match(id,/^qianqiu\.ach\.[a-z0-9_]+$/);
  const S=E.calls.filter(c=>c[0]==="score");
  assert.deepEqual(S.map(c=>[c[1],c[2]]).sort(),[["qianqiu.lb.rank",420],["qianqiu.lb.xp",5000]]);
});

test("同一次開 App：沒變的不再報；存檔變多了（store.set）才報變多的那幾項",async()=>{
  const E=mk(opts());await E.flush();
  E.calls.length=0;
  E.winFire("hashchange");await E.flush();
  assert.deepEqual(E.calls,[],"沒變就不報");
  const more={classic:R.classic.map(x=>x.id),qin:R.qin.map(x=>x.id)};
  for(let i=0;i<30;i++)more["e"+i]=["x"+i];   /* 50 件 */
  E.run("store.set('relics',"+JSON.stringify(more)+")");await E.flush();
  const A=E.ach();
  assert.deepEqual(Object.keys(A).sort(),["qianqiu.ach.relic_50","qianqiu.ach.relic_all"]);
  assert.equal(A["qianqiu.ach.relic_50"],100);
  assert.equal(E.calls.filter(c=>c[0]==="widget").length,0,"珍品變了不用更新小工具");
  E.calls.length=0;
  E.run("store.set('xp',6000)");await E.flush();
  assert.deepEqual(E.calls.filter(c=>c[0]==="score").map(c=>[c[1],c[2]]),[["qianqiu.lb.xp",6000]],"分數變高才送");
  E.calls.length=0;
  E.run("store.set('otherKey',1)");await E.flush();
  assert.deepEqual(E.calls,[],"不相干的鍵不重算");
});

test("沒登入：不報、不擋；登入後（authChange）才補報",async()=>{
  const E=mk(opts({auth:false}));await E.flush();
  assert.ok(E.calls.some(c=>c[0]==="auth"));
  assert.equal(E.calls.filter(c=>c[0]==="ach"||c[0]==="score").length,0);
  assert.ok(E.calls.some(c=>c[0]==="widget"),"沒登入 Game Center 也照樣更新小工具");
  E.state.auth=true;E.fire("gc:authChange",{authenticated:true});await E.flush();
  assert.equal(E.ach()["qianqiu.ach.relic_first"],100);
  assert.ok(E.calls.some(c=>c[0]==="score"));
});

test("回到前景（xq-native-resume）重問登入，登入了就補報",async()=>{
  const E=mk(opts({auth:false}));await E.flush();
  E.state.auth=true;E.winFire("xq-native-resume");await E.flush();
  assert.ok(Object.keys(E.ach()).length>5,"回前景發現登入了就補報");
});

test("小工具：節氣、茶單三題、完成幾題、連續天數、節氣圖；內容沒變不重送，茶單進度變了才再送",async()=>{
  const E=mk(opts());await E.flush();
  const W=E.calls.filter(c=>c[0]==="widget");
  assert.equal(W.length,1);
  const[,d,img]=W[0];
  assert.equal(img,"data/homemap/home_winter.webp");
  assert.equal(d.termZh,"立冬");assert.equal(d.termEn,"Start of Winter");
  assert.equal(d.day,"2026-11-17");assert.equal(d.lang,"zh");
  assert.equal(d.items.length,3);
  assert.deepEqual(d.items[0],{ic:"☕",zh:"一口・短殺・入門",en:"One sip · Short mate · Beginner",done:true});
  assert.equal(d.items[2].en,"One pot · Old manual corrections · Upper intermediate");
  assert.equal(d.doneN,1);assert.equal(d.streak,8);
  E.calls.length=0;E.winFire("xq-native-resume");await E.flush();
  assert.equal(E.calls.filter(c=>c[0]==="widget").length,0,"內容沒變不重送");
  const cj=JSON.parse(JSON.stringify(CJ));cj.list[1].st="done";
  E.run("store.set('cj',"+JSON.stringify(cj)+")");await E.flush();
  const W2=E.calls.filter(c=>c[0]==="widget");
  assert.equal(W2.length,1);assert.equal(W2[0][1].doneN,2);
});

test("小工具的節氣圖：停靠朝代用那一朝的首頁圖",async()=>{
  const E=mk(opts({era:"tang"}));await E.flush();
  assert.equal(E.calls.find(c=>c[0]==="widget")[2],"data/homemap/home_tang_winter.webp");
});

test("xqqianqiu:// 只認白名單；點小工具（appUrlOpen）開今日茶單",async()=>{
  const E=mk(opts());
  const h=u=>E.run("gcnLinkHash("+JSON.stringify(u)+")");
  assert.equal(h("xqqianqiu://canju"),"#/canju");
  assert.equal(h("xqqianqiu://canju/"),"#/canju");
  assert.equal(h("xqqianqiu://today"),"#/today");
  assert.equal(h("xqqianqiu://"),"#/");
  assert.equal(h("xqqianqiu://settings"),"");
  assert.equal(h("xqqianqiu://canju/../x"),"");
  assert.equal(h("https://evil.example/canju"),"");
  assert.equal(h("javascript:alert(1)"),"");
  E.fire("app:appUrlOpen",{url:"xqqianqiu://canju"});await E.flush();
  assert.equal(E.ctx.location.hash,"#/canju");
});

test("千秋印譜最下面有「🎮 Game Center 成就」，按了開 Game Center",async()=>{
  const o=opts({sheet:true});const E=mk(o);await E.flush();
  E.run("sealBook()");await E.flush();
  assert.equal(o.opened,1,"原本的千秋印譜照開");
  const b=E.appended.find(x=>x.id==="gcnBtn");assert.ok(b,"要有按鈕");
  assert.match(b.textContent,/Game Center/);
  b.onclick();await E.flush();
  assert.ok(E.calls.some(c=>c[0]==="dash"&&c[1]==="achievements"));
});

test("成就表：10～20 項、id 不重複、點數 ≤100 且總和 ≤1000、中英名稱與說明都有；排行榜 1～2 個",()=>{
  const E=mk({native:false});
  const A=E.run("GCN_ACH"),L=E.run("GCN_LB");
  assert.ok(A.length>=10&&A.length<=20,"成就 "+A.length+" 項");
  assert.equal(new Set(A.map(a=>a.k)).size,A.length);
  for(const a of A){
    assert.match(a.k,/^[a-z0-9_]+$/);
    assert.ok(a.pt>0&&a.pt<=100,a.k+" 點數");
    for(const f of ["zh","en","dzh","den","ev"])assert.ok(typeof a[f]==="string"&&a[f].length>1,a.k+" 缺 "+f);
    assert.equal(typeof a.f,"function");
  }
  assert.ok(A.reduce((s,a)=>s+a.pt,0)<=1000,"Game Center 一個 App 最多 1000 點");
  assert.ok(L.length>=1&&L.length<=2);
  assert.equal(E.run("GCN_PRE"),"qianqiu.ach.");
});

test("不收資料：不連網、不送伺服器、不新增存檔鍵",()=>{
  assert.doesNotMatch(SRC,/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket|XQNet\b|shareIRT|anonId/);
  assert.doesNotMatch(SRC,/store\.set\(|localStorage\.setItem|sessionStorage\.setItem/,"只讀存檔、不寫");
  assert.doesNotMatch(SRC,/(^|[^:"'\\])\/\/(?!#)/m,"一行程式裡不准有 // 註解（會吃掉後面的程式）");
});

test("建置：加進 m.html 後整份程式語法正確、名稱不撞",()=>{
  const {parts}=require(path.join(ROOT,"xiangqi-db/tools/mhtml.js"));
  const L=parts();
  const all=(L.includes("m/07gc-native.js")?L:L.concat(["m/07gc-native.js"])).map(f=>fs.readFileSync(path.join(ROOT,"xiangqi-db",f),"utf8")).join("\n");
  assert.doesNotThrow(()=>new vm.Script(all,{filename:"m-all.js"}));
});

test("開發者 11/17 選單：排行榜預設不開（會顯示 Game Center 暱稱給其他玩家，客群有兒童），成就照常", () => {
  assert.ok(SRC.includes("GCN_LB_ON=false"), "排行榜開關預設 false");
  assert.ok(/if\(GCN_LB_ON&&GCN\.auth\)/.test(SRC), "送分數要先過 GCN_LB_ON");
});

test("上架原生 App 待辦 N3／N4（11/17）：鑄成金印的觸覺回饋、每日同題提醒開關，都只在原生版裝上", () => {
  assert.ok(SRC.includes("gcnGlue();gcnHookStore();gcnWrapUI();gcnLinks();gcnWrapGold();gcnWrapDaily();"), "開機時才包（原生版 gcnInstall）");
  assert.ok(/if\(Array\.isArray\(r\)&&r\.length&&o&&o\.fx\)gcnGoldBuzz\(\)/.test(SRC), "有新金印而且要播動畫才震");
  assert.ok(/typeof hapOn==="function"&&!hapOn\(\)\)return false/.test(SRC), "照設定的觸覺開關");
  assert.ok(SRC.includes("const GCN_DQ_DEF={on:false,h:19,m:30};") && !SRC.includes("dqRemind"), "提醒預設關、19:30；不新增存檔鍵，狀態看系統排定的通知");
  assert.ok(SRC.includes("D.status()"), "開關狀態向系統查");
  assert.ok(SRC.includes("D.enable(h,m):D.disable()"), "開關接 XQNative.daily");
  assert.ok(/min-height:44px/.test(SRC.slice(SRC.indexOf("function gcnDqCard"))), "開關列與時間選單至少 44 高");
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(SRC), "不連網、不收資料");
});

test("E 第 19 輪：兒童模式不回報成就；提醒時間不落在家長禁玩時段；英文通知；提醒卡讓開 Home 指示條", () => {
  assert.ok(/if\(!gcnNat\(\)\|\|!G\|\|!GCN\.auth\|\|gcnKid\(\)\)return 0;/.test(SRC), "兒童模式不回報");
  assert.ok(SRC.includes("function gcnDqEnd()") && /c\.kid\?mn\(c\.night\):null/.test(SRC) && /mn\(c\.late\)/.test(SRC), "禁玩：late、兒童 night");
  assert.ok(/if\(t>=wake&&t<end\)o\.push/.test(SRC), "選項只在起床後、禁玩前");
  assert.ok(SRC.includes('title:"Xiangqi Qianqiu · Daily Puzzle"') && /if\(en\)gcnDqEn\(h,m\)/.test(SRC), "英文介面重排英文通知");
  assert.ok(SRC.includes("env(safe-area-inset-bottom,0px)"), "safe-area");
});

/* E 第 20 輪：給環境裝上家長設定、每日提醒（XQNative.daily）的替身 */
function mkDq(o){const env=mk(opts({sheet:true}));const cfg=Object.assign({late:"",kid:false,night:""},o.cfg||{});env.ctx.__cfg=cfg;
  env.run("function fmCfg(){return __cfg}function fmKid(){return !!__cfg.kid}var FM_WAKE=6;");
  const sch={on:!!o.on,h:o.h|0,m:o.m|0},dq=[];env.ctx.__sch=sch;
  env.ctx.XQNative.daily={status:async()=>sch.on?{on:true,schedule:{on:{hour:sch.h,minute:sch.m}}}:{on:false},enable:async(h,m)=>{dq.push([h,m]);sch.on=true;sch.h=h;sch.m=m;return{ok:true}},disable:async()=>{sch.on=false;return{ok:true}}};
  env.dq=dq;env.sch=sch;return env}

test("E 第 20 輪 N20-4：已排的提醒落在禁玩時段就改排到還允許的最後一格；沒落在裡面不動", async () => {
  const A = mkDq({on:true,h:21,m:30,cfg:{late:"20:00"}});
  assert.equal(await A.run("gcnDqFix()"), "19:30", "21:30 在 20:00 以後禁玩 → 改到 19:30");
  assert.deepEqual(JSON.parse(JSON.stringify(A.dq)), [[19,30]]); assert.equal(A.sch.h, 19);
  const B = mkDq({on:true,h:19,m:0,cfg:{late:"21:00"}});
  assert.equal(await B.run("gcnDqFix()"), "", "沒落在禁玩時段不重排"); assert.equal(B.dq.length, 0);
  const C = mkDq({on:false,cfg:{late:"20:00"}});
  assert.equal(await C.run("gcnDqFix()"), "", "提醒關著不動"); assert.equal(C.dq.length, 0);
  const K = mkDq({on:true,h:21,m:0,cfg:{kid:true,night:"20:30"}});
  assert.equal(await K.run("gcnDqFix()"), "20:00", "兒童模式「提醒早點睡」20:30 → 最後一格 20:00");
});

test("E 第 20 輪 N20-4：家長事後改禁玩時間（store.set fmCfg）就重排；開機、回前景、打開提醒卡也會檢查", async () => {
  const A = mkDq({on:true,h:21,m:30});
  A.ctx.__cfg.late = "21:00"; A.run('store.set("fmCfg",{late:"21:00"})'); await A.flush();
  assert.deepEqual(JSON.parse(JSON.stringify(A.dq)), [[20,30]], "改完設定就把 21:30 改排到 20:30");
  assert.ok(/addEventListener\("xq-native-resume",\(\)=>\{gcnAuth\(\);gcnWidgetPush\(\);gcnDqFix\(\)\}\)/.test(SRC), "回前景檢查");
  assert.ok(/setTimeout\(\(\)=>\{gcnAuth\(\);gcnWidgetPush\(\);gcnDqFix\(\)\},GCN_BOOT_MS\)/.test(SRC), "開機檢查");
  assert.ok(/gcnDqFix\(\)\.then\(moved=>/.test(SRC) && SRC.includes("已改到 "), "提醒卡先修正再畫，並寫明改到幾點");
});

test("E 第 20 輪 N20-5：兒童模式不登入 Game Center、不放「🎮 Game Center 成就」鈕；切成兒童模式時把鈕拿掉", async () => {
  const K = mkDq({cfg:{kid:true}});
  assert.equal(await K.run("gcnAuth()"), false, "兒童模式不登入");
  assert.ok(!K.calls.some(c => c[0] === "auth"), "沒呼叫 authenticate");
  K.run("gcnSheetBtn()"); assert.equal(K.appended.length, 0, "兒童模式不放鈕");
  const N = mkDq({cfg:{kid:false}});
  N.run("gcnSheetBtn()"); assert.equal(N.appended.length, 1, "一般模式照放");
  let removed = 0; N.appended[0].remove = () => { removed++ };
  N.ctx.document.querySelector = s => s === "#gcnBtn" ? N.appended[0] : null;
  N.ctx.__cfg.kid = true; N.run('store.set("fmCfg",{kid:true})'); await N.flush();
  assert.equal(removed, 1, "切成兒童模式時把鈕拿掉");
});

test("E 第 21 輪 R21-1：改排過的「已改到 hh:mm」每次畫提醒卡都寫（頁面重畫也看得到），有人動了提醒才拿掉", async () => {
  const A = mkDq({on:true,h:21,m:30,cfg:{late:"20:00"}});
  assert.equal(await A.run("gcnDqFix()"), "19:30");
  const cb = {checked:true}, sel = {value:"19:30"}, box = {innerHTML:"", querySelector:q => q === "#gcnDqOn" ? cb : sel};
  A.ctx.__box = box;
  A.run("gcnDqPaint(__box,XQNative.daily,{on:true,h:19,m:30})");
  assert.ok(box.innerHTML.includes("已改到 19:30"), "第一次畫卡有寫");
  A.run("gcnDqPaint(__box,XQNative.daily,{on:true,h:19,m:30})");
  assert.ok(box.innerHTML.includes("已改到 19:30"), "頁面重畫換了一張卡也還有寫");
  cb.onchange(); await A.flush();
  A.run("gcnDqPaint(__box,XQNative.daily,{on:true,h:19,m:30})");
  assert.ok(!box.innerHTML.includes("已改到"), "動過提醒之後就不再寫");
});

test("E 第 22 輪 R22-1：在提醒卡改時間或開關，「已改到」那行當場拿掉", async () => {
  const A = mkDq({on:true,h:21,m:30,cfg:{late:"20:00"}});
  await A.run("gcnDqFix()");
  let removed = 0; const p = {remove(){ removed++ }};
  const cb = {checked:true}, sel = {value:"18:30"}, box = {innerHTML:"", querySelector:q => q === "#gcnDqOn" ? cb : q === "p" ? p : sel};
  A.ctx.__box = box;
  A.run("gcnDqPaint(__box,XQNative.daily,{on:true,h:19,m:30})");
  assert.ok(box.innerHTML.includes("已改到 19:30"));
  sel.onchange(); await A.flush();
  assert.equal(removed, 1, "改時間時當場拿掉提示");
  assert.deepEqual(JSON.parse(JSON.stringify(A.dq.slice(-1))), [[18,30]], "照新選的時間排");
});
