// 第 11 輪 F2：健康紀錄漏斗報告（xiangqi-lab/tools/health-funnel.js）用假資料驗計算
// 用法：node --test xiangqi-lab/tools/test-health-funnel.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),os=require("os"),path=require("path"),vm=require("vm"),cp=require("child_process");
const HF=require("./health-funnel.js");
const LAB=path.join(__dirname,".."),DB=path.join(LAB,"../xiangqi-db");

/* 假的健康紀錄（跟 05c-health.js healExport 同樣的欄位） */
function H(o){o=o||{};return{about:"x",format:"xq-health-v1",app:{version:o.ver||"20261120-1000",exportedAt:(o.exp||"2026-11-30")+"T09:00:00.000Z",recordingSince:o.since||"2026-11-14"},
  usage:{activeDays:o.activeDays!=null?o.activeDays:Object.keys(o.per||{}).length,opens:3,perDay:o.per||{},features:o.feat||{},firstUseDay:o.first||{}},
  onboarding:o.ob===null?null:{steps:o.ob||{open:0},finished:false},health:{},device:{}}}
const FUN=[
  {at:1,iid:"aaaaaa01",s:{open:0},ver:"20261112-0840",dev:"phone"},
  {at:2,iid:"aaaaaa01",s:{open:0,pre:10,pick:40},ver:"20261112-0840",dev:"phone"},
  {at:3,iid:"bbbbbb02",s:{open:0,pick:100,g1:200,g1e:500},ver:"20261112-0840",dev:"desktop"},
  {at:4,iid:"cccccc03",s:{open:0,pick:60,g1:120},ver:"20261112-0840",dev:"phone"},
  {at:5,iid:"dddddd04",s:{open:0},ver:"x",dev:"phone",test:1},
  "不是 JSON",{at:6,iid:"eeeeee05",s:{pre:3}}].map(x=>typeof x==="string"?x:JSON.stringify(x)).join("\n");

test("新手流程檔：同一台取步驟最多的那筆；測試資料、壞行、沒有 open 的不算",()=>{
  const F=HF.loadFunnel(FUN);assert.equal(F.length,3);assert.deepEqual(F.find(r=>r.iid==="aaaaaa01").s,{open:0,pre:10,pick:40});
  assert.equal(HF.loadFunnel(FUN,{test:true}).length,4,"--test 才收 test:1")});
test("漏斗：人數、佔首次開啟、比上一階段、中位耗時",()=>{
  const R=HF.analyze(HF.loadFunnel(FUN),[]),S=Object.fromEntries(R.steps.map(s=>[s.key,s]));
  assert.equal(R.N,3);assert.deepEqual([S.open.n,S.pick.n,S.g1.n,S.g1e.n],[3,3,2,1]);
  assert.equal(S.pick.ofOpen,100);assert.equal(S.g1.ofOpen,66.7);assert.equal(S.g1.ofPrev,66.7);assert.equal(S.g1e.ofPrev,50);
  assert.equal(S.pick.medianSec,60);assert.equal(S.g1.medianSec,160,"偶數筆取中間兩筆平均");assert.equal(S.g1e.medianSec,500)});
test("健康紀錄的新手流程也算進漏斗；兩種來源各幾筆分開寫",()=>{
  const R=HF.analyze(HF.loadFunnel(FUN),[H({ob:{open:0,pick:30,g1:90}}),H({ob:null})]);
  assert.equal(R.N,4);assert.equal(R.sources.fun,3);assert.equal(R.sources.health,2);assert.equal(R.sources.healthWithOnboarding,1);
  assert.equal(R.steps.find(s=>s.key==="g1").n,3)});
test("回訪：第 2 天＝第一次開啟的隔天有開；第 7 天；還沒到那天不算進分母",()=>{
  assert.equal(HF.returnOf(H({since:"2026-11-14",per:{"2026-11-14":2,"2026-11-15":1}}),1),true);
  assert.equal(HF.returnOf(H({since:"2026-11-14",per:{"2026-11-14":2,"2026-11-16":1}}),1),false,"第 3 天才回來不算第 2 天");
  assert.equal(HF.returnOf(H({since:"2026-11-14",per:{"2026-11-14":2,"2026-11-20":1}}),6),true);
  assert.equal(HF.returnOf(H({since:"2026-11-14",per:{"2026-11-14":2},exp:"2026-11-14"}),1),null,"當天就匯出：還看不到隔天");
  assert.equal(HF.returnOf(H({since:"2026-11-14",per:{"2026-11-14":2},exp:"2026-11-17"}),6),null,"第 7 天還沒到");
  assert.equal(HF.returnOf(H({since:"2026-11-14",per:{"2026-12-20":1},activeDays:40,exp:"2026-12-31"}),1),null,"perDay 只留 30 天，被截掉的那天看不到");
  assert.equal(HF.return7(H({since:"2026-11-14",per:{"2026-11-14":1,"2026-11-19":1}})),true);
  assert.equal(HF.return7(H({since:"2026-11-14",per:{"2026-11-14":1},exp:"2026-11-30"})),false)});
test("回訪率只算確定是新裝的（有新手流程、recordingSince 晚於健康紀錄上線那天）",()=>{
  const L=[H({since:"2026-11-14",per:{"2026-11-14":1,"2026-11-15":1}}),H({since:"2026-11-15",per:{"2026-11-15":1}}),
    H({since:"2026-11-12",per:{"2026-11-12":1,"2026-11-13":1}}),H({since:"2026-11-16",per:{"2026-11-16":1,"2026-11-17":1},ob:null})];
  assert.deepEqual(L.map(h=>HF.isNewDevice(h)),[true,true,false,false]);
  const R=HF.analyze([],L),d2=R.ret.find(r=>r.key==="d2");assert.equal(d2.eligible,2);assert.equal(d2.n,1);assert.equal(d2.rate,50);
  assert.equal(R.allRet.find(r=>r.key==="d2").eligible,4,"全部的另外算")});
test("功能觸達：用過那組任一頁就算；第一次用到取最早那頁的中位數",()=>{
  const L=[H({feat:{journey:3,canju:1},first:{journey:0,canju:2}}),H({feat:{legend:1,ship:2},first:{legend:4,ship:1}}),H({feat:{home:5},first:{home:0}}),H({feat:{canju:0}})];
  const F=Object.fromEntries(HF.analyze([],L).feats.map(f=>[f.pages[0],f]));
  assert.equal(F.journey.n,2);assert.equal(F.journey.of,4);assert.equal(F.journey.rate,50);assert.equal(F.journey.medianFirstDay,2);
  assert.equal(F.canju.n,1,"次數 0 不算用過");assert.equal(F.ship.n,1);assert.equal(F.cpu.n,0);assert.equal(F.cpu.rate,0)});
test("讀健康紀錄：一份、陣列、每行一份都收；不是 xq-health-v1 的不收",()=>{
  assert.equal(HF.parseHealth(JSON.stringify(H())).length,1);assert.equal(HF.parseHealth(JSON.stringify([H(),H(),{format:"xq-health-v2"}])).length,2);
  assert.equal(HF.parseHealth(JSON.stringify(H())+"\n"+JSON.stringify(H())+"\n亂碼").length,2);assert.equal(HF.parseHealth("").length,0)});
test("跟 App 真正匯出的格式對得上：在模擬手機跑 05c-health.js 匯出，再丟進報告",async()=>{
  const ls=new Map(),on=()=>{};const ctx={console,Date,Math,JSON,Promise,localStorage:{getItem:k=>ls.has(k)?ls.get(k):null,setItem:(k,v)=>ls.set(k,String(v))},
    location:{hash:"#/canju"},addEventListener:on,setInterval:()=>0,setTimeout:()=>0,document:{readyState:"complete",addEventListener:on},
    performance:{now:()=>1,getEntriesByType:()=>[]},navigator:{},screen:{width:1,height:1},devicePixelRatio:1,matchMedia:()=>({matches:false}),appVer:async()=>"20261120-1000"};
  ctx.window=ctx;ctx.store={get(k,d){const v=ls.get("m_"+k);return v==null?d:JSON.parse(v)},set(k,v){ls.set("m_"+k,JSON.stringify(v))}};
  ls.set("m_funnel",JSON.stringify({id:"zz",t0:1,s:{open:0,pick:20,g1:50},end:0}));
  vm.createContext(ctx);vm.runInContext(fs.readFileSync(path.join(DB,"m/05c-health.js"),"utf8"),ctx);
  const x=JSON.parse(JSON.stringify(await ctx.healExport())),L=HF.parseHealth(JSON.stringify(x));assert.equal(L.length,1);
  const R=HF.analyze([],L);assert.equal(R.N,1);assert.equal(R.steps.find(s=>s.key==="g1").medianSec,50);
  assert.equal(R.feats.find(f=>f.pages.includes("canju")).n,1)});
test("報告：樣本少於 30 筆要寫「樣本只有 N 筆，不能下結論」；沒有健康紀錄就寫算不出來，不編數字",()=>{
  const md=HF.renderMd(HF.analyze(HF.loadFunnel(FUN),[]),null);
  assert.match(md,/樣本只有 3 筆，不能下結論/);assert.match(md,/\| 首次開啟 \| 3 \| 100% \|/);assert.match(md,/\| 第 2 天回訪 \| — \| — \|/);
  assert.match(md,/觸達率算不出來/);assert.ok(!/NaN|undefined|Infinity/.test(md),md)});
test("匿名健康摘要彙整：依版本分、有出錯比例、測試資料不算",()=>{
  const T=HF.analyzeTele([{at:1,v:1,ver:"A",e:2,em:[["boom","m.html",3]],lt:[4,300],bt:900,rf:[1,0,0]},{at:2,v:1,ver:"A",e:0,em:[],lt:[0,0],bt:1100,rf:[0,0,0]},
    {at:3,v:1,ver:"B",e:1,em:[["boom","m.html",3]],lt:[2,100],bt:null,rf:[0,0,1]},{at:4,v:1,ver:"A",e:9,test:1}].map(x=>JSON.stringify(x)).join("\n"));
  assert.equal(T.n,3);const A=T.byVer.find(v=>v.ver==="A");assert.equal(A.n,2);assert.equal(A.withErrRate,50);assert.equal(A.errors,2);assert.equal(A.medianBootMs,1000);assert.equal(A.medianLongTasks,2);
  assert.deepEqual(T.topErrors[0],["boom @m.html:3",2])});
test("指令列：讀指定的新手流程檔和健康紀錄資料夾，--out 寫出 LF 的報告",()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"xqhf-"));
  try{const ff=path.join(dir,"f.jsonl"),hd=path.join(dir,"exp"),out=path.join(dir,"r.md");fs.writeFileSync(ff,FUN);fs.mkdirSync(hd);
    fs.writeFileSync(path.join(hd,"a.json"),JSON.stringify(H({since:"2026-11-14",per:{"2026-11-14":1,"2026-11-15":2},feat:{canju:1}})));
    cp.execFileSync(process.execPath,[path.join(__dirname,"health-funnel.js"),"--funnel",ff,hd,"--out",out],{encoding:"utf8"});
    const md=fs.readFileSync(out,"utf8");assert.ok(!md.includes("\r"));assert.match(md,/匿名新手流程 3 台裝置/);assert.match(md,/健康紀錄 1 份/);assert.match(md,/\| 第 2 天回訪 \| 1／1 \| 100% \|/)}
  finally{fs.rmSync(dir,{recursive:true,force:true})}});
test("〔原始碼〕漏斗報告兩份逐字相同、LF",()=>{
  const a=fs.readFileSync(path.join(DB,"art/docs/funnel.md"),"utf8");assert.equal(fs.readFileSync(path.join(LAB,"site/data/docs/funnel.md"),"utf8"),a);
  assert.ok(!a.includes("\r"));assert.match(a,/不能下結論|樣本/)});
