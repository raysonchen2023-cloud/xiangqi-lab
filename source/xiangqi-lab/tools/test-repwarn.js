// 開發者 11/11 選「一將一捉自動測試」（規劃書 P01／W05 的驗收證據）：
// 直接載入 App 裡真正的 repWarn（m/08b-cpugame.js），用合法棋步走出循環，檢查「局面第二次出現」時會不會跳警告。
// 重點：合法的一將一捉、閒著循環不可以被警告必輸；真正的長將、長捉才警告，而且警告的判詞要跟裁判一樣。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const C=require("../site/core.js");
const sq=C.parseSq;
const src=fs.readFileSync(path.join(__dirname,"../../xiangqi-db/m/08b-cpugame.js"),"utf8").replace(/\r\n/g,"\n");
const a=src.indexOf("const REPW_SEEN=new Map()"),e=src.indexOf("catch(e){}}\n",a);
assert.ok(a>0&&e>a,"找不到 repWarn");
function load(){   // 每個測試一份全新的 repWarn（提醒過的紀錄不互相影響）
  const shown=[],ctx={Map,Set,Object,shown,window:{XQCore:C},esc:s=>String(s),modal:(html,btns)=>shown.push({html,btns:Array.from(btns,b=>b[0])})};
  vm.createContext(ctx);vm.runInContext(src.slice(a,e+"catch(e){}}\n".length)+";this.repWarn=repWarn",ctx);return ctx;
}
function start(pieces,side="r"){
  const b=Array(90).fill(null);for(const [q,p]of Object.entries(pieces))b[sq(q)]=p;
  const S={id:"t",start:C.fen(b,side).split(" ")[0],startTurn:side,moves:[]};C.stateRebuild(S);return S;
}
function play(S,list){for(const u of list){const f=sq(u.slice(0,2)),t=sq(u.slice(2));
  assert.ok(C.legal(S.board,S.turn).some(([x,y])=>x===f&&y===t),"棋步要合法："+u);C.stateApply(S,f,t)}return S}
const oneCheckOneChase=()=>start({d0:"K",f0:"A",e9:"k",c5:"C",e7:"n",c9:"r"}),occ=["c5e5","e7c8","e5c5","c8e7"];
const perpetual=()=>start({d0:"K",f9:"k",e7:"R"}),pc=["e7f7","f9e9","f7e7","e9f9"];
const chase=()=>start({d0:"K",f9:"k",c3:"R",b7:"n"}),cc=["c3b3","b7c5","b3c3","c5b7"];
const idle=()=>start({d0:"K",f9:"k",a1:"R",i8:"r"}),ic=["a1a2","i8i7","a2a1","i7i8"];

test("一將一捉（亞洲棋例允許）：走的那一方不會被警告",()=>{
  const X=load(),S=play(oneCheckOneChase(),occ);assert.equal(S.turn,"r");
  X.repWarn(S,"r");assert.equal(X.shown.length,0);
});
test("一將一捉：被將被捉的那一方也不會被警告",()=>{
  const X=load(),S=play(oneCheckOneChase(),occ.concat(occ[0]));assert.equal(S.turn,"b");
  X.repWarn(S,"b");assert.equal(X.shown.length,0);
});
test("一將一捉真的再走一圈，裁判判和（跟不警告一致）",()=>{
  const S=play(oneCheckOneChase(),occ.concat(occ)),r=C.judgeState(S);assert.equal(r.w,null);
});
test("閒著循環：不警告",()=>{
  const X=load(),S=play(idle(),ic);X.repWarn(S,"r");assert.equal(X.shown.length,0);
});
test("長將：將軍的那一方收到警告，判詞照抄裁判",()=>{
  const X=load(),S=play(perpetual(),pc);X.repWarn(S,"r");assert.equal(X.shown.length,1);
  const real=C.judgeState(play(perpetual(),pc.concat(pc)));assert.equal(real.w,"b");
  assert.ok(X.shown[0].html.includes(real.why),"警告要引用裁判的判詞");assert.match(X.shown[0].html,/長將/);
  assert.deepEqual(X.shown[0].btns,["我來變著"]);
});
test("長將：被將的那一方不會被警告",()=>{
  const X=load(),S=play(perpetual(),pc.concat(pc[0]));assert.equal(S.turn,"b");
  X.repWarn(S,"b");assert.equal(X.shown.length,0);
});
test("長捉：捉子的那一方收到警告；有提和的對局多一顆提議和局",()=>{
  const X=load(),S=play(chase(),cc);X.repWarn(S,"r",()=>{});assert.equal(X.shown.length,1);
  assert.deepEqual(X.shown[0].btns,["🤝 提議和局","我來變著"]);
});
test("同一盤 8 手內只提醒一次",()=>{
  const X=load(),S=play(perpetual(),pc);X.repWarn(S,"r");X.repWarn(S,"r");assert.equal(X.shown.length,1);
});
test("還沒輪到自己、或對局已結束：不提醒",()=>{
  const X=load(),S=play(perpetual(),pc);X.repWarn(S,"b");X.repWarn({...S,result:{w:"b"}},"r");assert.equal(X.shown.length,0);
});
/* 開發者 11/11 盤查：待核時 judgeState 回 null，待核判詞在 repetition 欄位；以前讀不到，待核提醒永遠不跳 */
const mutual=()=>start({f0:"K",f9:"k",g6:"N",h6:"r",f5:"N"}),mc=["g6f8","h6h8","f8g6","h8h6"];
test("雙方互捉（裁判會判待核）：跳「局面在重複」，判詞照抄裁判，可提和",()=>{
  const X=load(),S=play(mutual(),mc);assert.equal(S.turn,"r");X.repWarn(S,"r",()=>{});assert.equal(X.shown.length,1);
  const T=play(mutual(),mc.concat(mc));assert.equal(C.judgeState(T),null);assert.equal(T.repetition.pending,true);
  assert.match(X.shown[0].html,/局面在重複/);assert.ok(X.shown[0].html.includes(T.repetition.why),"提醒要引用裁判的待核判詞");
  assert.deepEqual(X.shown[0].btns,["🤝 提議和局","我來變著"]);
});
test("雙方互捉：另一方輪到時也會收到待核提醒",()=>{
  const X=load(),S=play(mutual(),mc.concat(mc[0]));assert.equal(S.turn,"b");X.repWarn(S,"b");assert.equal(X.shown.length,1);
  assert.match(X.shown[0].html,/待核/);assert.deepEqual(X.shown[0].btns,["我來變著"]);
});
test("不判長將長捉的關（noPerp）：長將、長捉都不警告會判負",()=>{
  const X=load();X.repWarn({...play(perpetual(),pc),noPerp:true},"r");X.repWarn({...play(chase(),cc),id:"t2",noPerp:true},"r");
  assert.equal(X.shown.length,0);
});
test("不判長將長捉的關（noPerp）：待核照樣提醒",()=>{
  const X=load();X.repWarn({...play(mutual(),mc),noPerp:true},"r");assert.equal(X.shown.length,1);assert.match(X.shown[0].html,/待核/);
});
