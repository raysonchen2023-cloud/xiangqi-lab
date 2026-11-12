// 11/12 開發者選「甲」：新玩家（從沒下完過任何一盤）的第一盤預設平面棋盤，3D 園子當進階選項；存過 park3d 的照存的值。
// 程式在 xiangqi-db/m/06-cpu.js 的 pkNoGame、pkDef3d、parkOn；設定頁（05-settings.js）、螢幕報讀園子清單（11c-a11ysnd.js）用同一個預設。
// 做法：用 vm 載入 06-cpu.js 那幾行，給假的 localStorage（store 跟 00-util.js 一樣加 m_ 前綴），模擬各種手機裡的紀錄。
// 用法：node --test xiangqi-lab/tools/test-park-firstflat.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const M=path.join(__dirname,"../../xiangqi-db/m");
const rd=f=>fs.readFileSync(path.join(M,f),"utf8").replace(/\r\n/g,"\n");
const CPU=rd("06-cpu.js");
const a=CPU.indexOf("function pkNoGame("),b=CPU.indexOf("const parkOn="),e=CPU.indexOf("\n",b);
assert.ok(a>0&&b>a,"06-cpu.js 找不到 pkNoGame／parkOn");
const CODE=CPU.slice(a,e);
const UTIL=rd("00-util.js").split("\n").find(l=>l.startsWith("const store="));
function boot(init){const mem=new Map(Object.entries(init||{}).map(([k,v])=>[k,typeof v==="string"?v:JSON.stringify(v)]));
  const localStorage={getItem:k=>mem.has(k)?mem.get(k):null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k),key:i=>[...mem.keys()][i]??null,get length(){return mem.size}};
  const ctx={localStorage};vm.createContext(ctx);
  vm.runInContext(UTIL+"\nvar PARK_OFF=false,PARK_LK=false;function focusOn(){return false}\n"+CODE+"\nthis.T={parkOn,pkNoGame,pkDef3d,store};",ctx);
  const T=ctx.T;T.put=(k,v)=>localStorage.setItem(k,JSON.stringify(v));return T}
/* 開機就會寫的東西：一盤空的 xq_play（moves 是空的）、今日茶單 m_cj、看過訓練營 m_campSeen——都不算「下完過一盤」 */
const FRESH={xq_play:{seq:1,id:"g0",moves:[],result:null},m_cj:{day:"2026-11-12"},m_campSeen:true,m_quizLog:[1,2]};
test("全新手機（什麼都沒有）：預設平面棋盤",()=>{
  const T=boot({});assert.equal(T.pkNoGame(k=>null),true);assert.equal(T.parkOn(),false)});
test("只有開機寫的空棋局、茶單、訓練營、測驗紀錄（沒下完過棋）：還是新玩家，預設平面",()=>{
  assert.equal(boot(FRESH).parkOn(),false)});
test("第一盤下到一半（還沒結果）：還是平面",()=>{
  assert.equal(boot({...FRESH,xq_play:{id:"g1",moves:[[70,67],[19,22]],result:null}}).parkOn(),false)});
test("下完過任何一盤就照原本 3D 預設：人機戰績、桌上結束的棋、收納格裡結束的棋、積分、擂台、車輪戰、線上對局",()=>{
  const cases={
    "人機戰績 xq_record":{xq_record:{"3":{w:1,l:0,d:0}}},
    "桌上那盤已結束":{xq_play:{id:"g1",moves:[[70,67]],result:"紅勝"}},
    "收納格 xq_play2 有結束的旅程棋":{xq_play2:{journey:{id:"j1",moves:[[70,67]],result:"黑勝"}}},
    "舊版 xq_play2 單盤格式":{xq_play2:{id:"o1",moves:[[70,67]],result:"和棋"}},
    "電腦積分 xq_cpuRate":{xq_cpuRate:{w:0,l:1,d:0}},
    "電腦積分歷史":{xq_cpuRate:{hist:[1500]}},
    "擂台印章":{xq_arenaStamps:{qin:1}},
    "車輪戰紀錄":{xq_simulRec:{"5":{plays:1,w:2,d:0,l:3,perfect:0}}},
    "線上對局存過":{xq_netSaved:["2026-11-10-abc"]}};
  for(const [nm,v] of Object.entries(cases))assert.equal(boot({...FRESH,...v}).parkOn(),true,nm)});
test("存過 park3d 的照存的值：新玩家自己選 3D 就是 3D；老玩家選平面就是平面",()=>{
  assert.equal(boot({...FRESH,m_park3d:true}).parkOn(),true);
  assert.equal(boot({xq_record:{"3":{w:1,l:0,d:0}},m_park3d:false}).parkOn(),false)});
test("新玩家按頂欄「🌳 去園子下棋（3D）」（store.set(park3d,!parkOn())）：切到 3D 並記住",()=>{
  const T=boot(FRESH);assert.equal(T.parkOn(),false);T.store.set("park3d",!T.parkOn());assert.equal(T.parkOn(),true);
  assert.equal(T.store.get("park3d"),true)});
test("第一盤下完、還在結算畫面（同一盤 id）不會突然跳成 3D；開下一盤（id 換了）才回到 3D 預設",()=>{
  const T=boot({...FRESH,xq_play:{id:"g1",moves:[[70,67]],result:null}});assert.equal(T.parkOn(),false);
  T.put("xq_play",{id:"g1",moves:[[70,67],[19,22]],result:"紅勝"});T.put("xq_record",{"3":{w:1,l:0,d:0}});
  assert.equal(T.parkOn(),false,"同一盤結算時還是平面");
  T.put("xq_play",{id:"g2",moves:[],result:null});assert.equal(T.parkOn(),true,"第二盤回到 3D 預設")});
test("localStorage 壞掉（讀取丟例外）：照原本預設 3D，不當機",()=>{
  const T=boot({});const ctx2={localStorage:{getItem(){throw new Error("x")},setItem(){throw new Error("x")}}};vm.createContext(ctx2);
  vm.runInContext(UTIL+"\nvar PARK_OFF=false,PARK_LK=false;function focusOn(){return false}\n"+CODE+"\nthis.T={parkOn};",ctx2);
  assert.equal(ctx2.T.parkOn(),true);assert.ok(T)});
test("〔原始碼〕設定頁的 3D 開關、螢幕報讀「園子地點清單」用同一個預設（pkDef3d）；頂欄切換鈕名稱照舊「回棋盤模式」／「去園子下棋（3D）」",()=>{
  assert.match(rd("05-settings.js"),/p3\.checked=!!store\.get\("park3d",typeof pkDef3d==="function"\?pkDef3d\(\):true\)/);
  assert.match(rd("11c-a11ysnd.js"),/pk=store\.get\("park3d",typeof pkDef3d==="function"\?pkDef3d\(\):true\)/);
  assert.ok(CPU.includes('parkLabel=()=>parkOn()?"回棋盤模式":"去園子下棋（3D）"'));
  for(const f of fs.readdirSync(M).filter(x=>/\.js$/.test(x)))assert.ok(!/store\.get\("park3d",true\)/.test(rd(f)),f+" 還有寫死 3D 預設")});
