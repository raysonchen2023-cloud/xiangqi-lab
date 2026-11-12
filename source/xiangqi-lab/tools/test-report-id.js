// 檢舉追蹤編號（評審「互動安全與營運閉環」：檢舉分 📮排隊中／✅已從手機送出／🛠已處理，給可追查編號）的自動測試。
// 不開瀏覽器：直接從 App 原始碼切出真正的程式放進 vm 跑——
//   xiangqi-db/m/05-settings.js：FEEDBACK_FORM、postForm、flushFeedback、sendRecord（意見回饋的送出與排隊）
//   xiangqi-db/m/07x4-lobbysafe.js：「檢舉追蹤編號」那一段（編號、我的檢舉清單、狀態、包一層 postForm）
//   xiangqi-lab/tools/fixes-export.snippet.js：開發者從回饋表匯出 fixes.json（reports 回推「已處理」）
// 用法：node --test xiangqi-lab/tools/test-report-id.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const DB=path.join(__dirname,"../../xiangqi-db");
const rd=f=>fs.readFileSync(f,"utf8").replace(/\r\n/g,"\n");
const SET=rd(path.join(DB,"m/05-settings.js")),SAFE=rd(path.join(DB,"m/07x4-lobbysafe.js")),SNIP=rd(path.join(__dirname,"fixes-export.snippet.js"));
function cut(src,a,b,name){const i=src.indexOf(a),j=src.indexOf(b,i+1);assert.ok(i>=0&&j>i,"找不到 "+name);return src.slice(i,j)}
const FB_SRC=cut(SET,"const FEEDBACK_FORM=","// 走棋音效選單","05-settings.js 的意見回饋送出");
const RID_SRC=cut(SAFE,"/* ---------- 檢舉追蹤編號（","/* ---------- 檢舉追蹤編號：以上","07x4-lobbysafe.js 的檢舉追蹤編號");

/* 每個測試一份全新的手機：localStorage（store 照 00-util.js 加 m_ 前綴）、網路開關、sendBeacon 紀錄 */
function phone(opt){opt=opt||{};
  const ls=new Map(Object.entries(opt.ls||{})),beacons=[],bells=[];
  const store={get(k,d){const v=ls.get("m_"+k);if(v==null)return d;try{return JSON.parse(v)}catch(e){return d}},set(k,v){ls.set("m_"+k,JSON.stringify(v))}};
  const navigator={onLine:opt.onLine!==false,sendBeacon:(u,body)=>{beacons.push(String(body));return true}};   /* Chrome 沒網路時 sendBeacon 也回 true */
  const rand=opt.rand?opt.rand.slice():null;
  const crypto=rand?{getRandomValues:a=>{a[0]=rand.length?rand.shift():5;return a}}:require("crypto").webcrypto;
  const ctx={store,navigator,crypto,URLSearchParams,Uint8Array,Math,Date,Set,Object,Array,String,Error,Promise,JSON,
    XQNet:{bell:x=>bells.push(x)},fetch:async()=>{throw new Error("不該用 fetch")},ls,beacons,bells};
  ctx.window=ctx;vm.createContext(ctx);   /* 瀏覽器裡 window 就是全域（sendRecord 寫 window.XQNet&&XQNet.bell） */
  vm.runInContext(FB_SRC+"\n"+RID_SRC+"\n;this.T={postForm,sendRecord,flushFeedback,lbsRidNew,lbsMine,lbsMineRid,lbsMineAdd,lbsMineSet,lbsMineSync,lbsMineApply,lbsMineState,LBS_RID_RE,LBS_RID_ABC,LBS_ST};",ctx);
  /* vm 裡的陣列、物件跟外面不是同一個原型，deepStrictEqual 會判不相等：回傳值一律轉成外面的 */
  for(const k of Object.keys(ctx.T))if(typeof ctx.T[k]==="function"){const f=ctx.T[k];ctx.T[k]=(...a)=>{const r=f(...a);return r&&typeof r.then==="function"?Promise.resolve(r).then(J):J(r)}}
  ctx.T.LBS_ST=J(ctx.T.LBS_ST);return ctx}
function J(x){return x===undefined?x:JSON.parse(JSON.stringify(x))}
const report=(X,rid,name)=>{X.T.lbsMineAdd(rid,name||"長安小棋童",Date.now());return X.T.sendRecord({type:"🚩 檢舉",text:"["+rid+"] 🚩 檢舉線上玩家\n被檢舉的人："+(name||"長安小棋童"),contact:"",id:"me1",rid})};

test("編號格式：R-月日-四碼，四碼不含 0 O 1 I L",()=>{
  const X=phone();const d=new Date(2026,10,11,9,30);
  for(let i=0;i<300;i++){const r=X.T.lbsRidNew(d);assert.match(r,X.T.LBS_RID_RE);assert.ok(r.startsWith("R-1111-"),r);assert.doesNotMatch(r.slice(7),/[01OIL]/)}
  assert.equal(X.T.LBS_RID_ABC.length,31);assert.equal(new Set(X.T.LBS_RID_ABC).size,31);
  assert.equal(X.T.lbsRidNew(new Date(2026,0,5),()=>0),"R-0105-2222");
  assert.equal(X.T.lbsRidNew(new Date(2026,11,31),()=>30),"R-1231-ZZZZ");
  assert.equal(X.T.lbsRidNew(new Date(2026,11,31),()=>-1),"R-1231-ZZZZ","負數也不會跑出字表外");
  assert.ok(!X.T.LBS_RID_RE.test("R-1111-7K3O")&&!X.T.LBS_RID_RE.test("R-111-7K3Q")&&!X.T.LBS_RID_RE.test("[R-1111-7K3Q]"));
});
test("編號不重複：跟手機裡已有的撞到就重抽",()=>{
  const X=phone({rand:[0,0,0,0,0,0,0,0],ls:{m_lbRepMine:JSON.stringify([{rid:"R-1111-2222",at:1,name:"甲",st:"sent"}])}});
  assert.equal(X.T.lbsMineRid(new Date(2026,10,11)),"R-1111-7777");
});
test("有網路：送出後狀態直接是「已從手機送出」，表單收到 [編號] 開頭的內容、不多送 rid 那一格",async()=>{
  const X=phone(),rid="R-1111-7K3Q";
  assert.equal(await report(X,rid),true);
  const m=X.T.lbsMine();assert.equal(m.length,1);assert.equal(X.T.lbsMineState(m[0]),"sent");assert.ok(m[0].sentAt>0);
  assert.equal(X.beacons.length,1);const body=new URLSearchParams(X.beacons[0]);
  assert.ok(body.get("entry.19788072").startsWith("["+rid+"] 🚩 檢舉線上玩家"));assert.ok(!X.beacons[0].includes("rid="));
  assert.deepEqual(X.store.get("fbQueue",[]),[]);assert.equal(X.bells.length,1);
  assert.deepEqual(Object.keys(m[0]).sort(),["at","name","rid","sentAt","st"],"手機只存編號、時間、名字、狀態");
});
test("沒網路：排隊中（放進 fbQueue）→ 恢復連線 flushFeedback 補送 → 已從手機送出",async()=>{
  const X=phone({onLine:false}),rid="R-1111-ABCD";
  assert.equal(await report(X,rid),false);
  assert.equal(X.beacons.length,0,"沒網路時不要相信 sendBeacon 的 true");
  assert.equal(X.T.lbsMineState(X.T.lbsMine()[0]),"q");
  const q=X.store.get("fbQueue",[]);assert.equal(q.length,1);assert.equal(q[0].rid,rid);
  X.T.lbsMineSync(q,Date.now()+36e5);assert.equal(X.T.lbsMineState(X.T.lbsMine()[0]),"q","還在佇列裡就是排隊中，不會變成沒送出");
  X.navigator.onLine=true;await X.T.flushFeedback();
  assert.equal(X.T.lbsMineState(X.T.lbsMine()[0]),"sent");assert.deepEqual(X.store.get("fbQueue",[]),[]);
  assert.equal(X.beacons.length,1);assert.ok(new URLSearchParams(X.beacons[0]).get("entry.19788072").startsWith("["+rid+"]"));
});
test("一般意見回饋（沒有 rid）照舊：不受檢舉的離線判斷影響",async()=>{
  const X=phone({onLine:false});
  assert.equal(await X.T.sendRecord({type:"🐞 錯誤",text:"按鈕壞了"}),true);
  assert.equal(X.beacons.length,1);assert.deepEqual(X.T.lbsMine(),[]);
});
test("排隊中卻不在佇列裡（佇列只留 30 筆被擠掉）：超過 2 分鐘才老實標「沒送出」；又出現在佇列裡改回排隊中",()=>{
  const now=Date.now(),X=phone({ls:{m_lbRepMine:JSON.stringify([{rid:"R-1111-AAAA",at:now-5e3,name:"甲",st:"q"},{rid:"R-1111-BBBB",at:now-6e5,name:"乙",st:"q"},{rid:"R-1111-CCCC",at:now-6e5,name:"丙",st:"sent"}])}});
  const L=X.T.lbsMineSync([{type:"👤 玩家"}],now),st=r=>X.T.lbsMineState(L.find(x=>x.rid===r));
  assert.equal(st("R-1111-AAAA"),"q","剛送、可能還在送");assert.equal(st("R-1111-BBBB"),"lost");assert.equal(st("R-1111-CCCC"),"sent");
  const L2=X.T.lbsMineSync([{rid:"R-1111-BBBB"}],now);assert.equal(X.T.lbsMineState(L2.find(x=>x.rid==="R-1111-BBBB")),"q");
});
test("回推：fixes.json 的 reports 標 done／seen，只通知一次",()=>{
  const X=phone({ls:{m_lbRepMine:JSON.stringify([{rid:"R-1111-7K3Q",at:1,name:"甲",st:"sent"},{rid:"R-1111-ABCD",at:2,name:"乙",st:"sent"},{rid:"R-1111-WXYZ",at:3,name:"丙",st:"q"}])}});
  const st=r=>X.T.lbsMineState(X.T.lbsMine().find(x=>x.rid===r));
  assert.deepEqual(X.T.lbsMineApply({"R-1111-ABCD":{s:"seen"},"R-0101-2222":{s:"done"}}),[]);
  assert.equal(st("R-1111-ABCD"),"seen");assert.equal(st("R-1111-7K3Q"),"sent");
  assert.deepEqual(X.T.lbsMineApply({"R-1111-7K3Q":{s:"done",at:"11/12"},"R-1111-ABCD":"done","R-1111-WXYZ":{s:"what"}}),["R-1111-7K3Q","R-1111-ABCD"]);
  assert.equal(st("R-1111-7K3Q"),"done");assert.equal(X.T.lbsMine().find(x=>x.rid==="R-1111-7K3Q").dnAt,"11/12");
  assert.equal(st("R-1111-ABCD"),"done");assert.equal(st("R-1111-WXYZ"),"q","不認得的狀態不理");
  assert.deepEqual(X.T.lbsMineApply({"R-1111-7K3Q":{s:"done",at:"11/12"}}),[],"已經通知過的不再通知");
  for(const k of["q","sent","seen","done","lost"])assert.equal(X.T.LBS_ST[k].length,3);
  assert.equal(X.T.LBS_ST.done[1],"已處理");assert.ok(!/已收到/.test(X.T.LBS_ST.sent.join("")),"手機自己知道的只到「送出」，不說已收到");
});
test("舊資料相容：沒有清單、壞掉的清單、舊 fixes.json、舊佇列都不出錯",async()=>{
  assert.deepEqual(phone().T.lbsMine(),[]);
  for(const bad of['{"a":1}','"x"',"不是 JSON",'[null,1,"s",{"name":"沒編號"},{"rid":""}]'])assert.deepEqual(phone({ls:{m_lbRepMine:bad}}).T.lbsMine(),[],bad);
  const X=phone({ls:{m_lbRep:JSON.stringify({u1:123}),m_fbQueue:JSON.stringify([{type:"🚩 檢舉",text:"🚩 檢舉線上玩家（舊版、沒有編號）"},{type:"👤 玩家"}]),m_lbRepMine:JSON.stringify([{rid:"R-1111-2345",at:Date.now()}])}});
  assert.equal(X.T.lbsMineState(X.T.lbsMine()[0]),"q","缺 st 當排隊中");assert.equal(X.T.lbsMineState(null),"q");
  for(const r of[undefined,null,[],"done",{}])assert.deepEqual(X.T.lbsMineApply(r),[]);
  X.T.lbsMineSync(X.store.get("fbQueue",[]));
  await X.T.flushFeedback();assert.equal(X.beacons.length,2,"舊的排隊紀錄照常補送");
  assert.deepEqual(X.store.get("lbRep",{}),{u1:123},"防重複的舊紀錄不動");
});

/* ---------- 開發者匯出（fixes-export.snippet.js）：檢舉列只進 reports，不進修正紀錄、不帶 ID 雜湊 ---------- */
const csvRow=r=>r.map(v=>/[",\n]/.test(v)?'"'+String(v).replace(/"/g,'""')+'"':String(v)).join(",");
async function exportSheet(rows){   /* rows：[A..J 欄, L..O 欄] */
  let clip="";const A=rows.map(r=>csvRow(r[0])).join("\n"),B=rows.map(r=>csvRow(r[1])).join("\n");
  const ctx={location:{pathname:"/spreadsheets/d/SHEETID/edit"},crypto:require("crypto").webcrypto,TextEncoder,Uint8Array,JSON,Date,Object,
    navigator:{clipboard:{writeText:async t=>{clip=t}}},fetch:async u=>({text:async()=>/range=A2/.test(u)?A:B})};
  vm.createContext(ctx);const msg=await vm.runInContext(SNIP,ctx);return{msg,json:JSON.parse(clip)}}
test("匯出：已處理／不處理＝done（日期取版本號）、核准＝seen、沒決定或沒編號的不列；修正紀錄照舊",async()=>{
  const row=(ty,text,id,fixed,note,dec)=>[["2026/11/11 上午 9:30:00",ty,text,"",id,"","","","",""],["玩家",fixed?"TRUE":"FALSE",note||"",dec||""]];
  const {msg,json}=await exportSheet([
    row("🐞 錯誤","按鈕壞了","me1",true,"20261111-1200 修好：按鈕"),
    row("🚩 檢舉","[R-1111-7K3Q] 🚩 檢舉線上玩家\n被檢舉的人：壞名字, 真的\n對方 ID：x9","me1",true,"20261112-0930 已停權"),
    row("🚩 檢舉","[R-1111-ABCD] 🚩 檢舉線上玩家","me2",false,"","核准"),
    row("🚩 檢舉","[R-1111-WXYZ] 🚩 檢舉線上玩家","me3",false,"","不處理"),
    row("🚩 檢舉","[R-1111-QQQQ] 🚩 檢舉線上玩家","me4",false,"",""),
    row("🚩 檢舉","🚩 檢舉線上玩家（舊版沒有編號）","me5",true,"已處理"),
  ]);
  assert.match(msg,/1 筆修正、3 筆檢舉狀態/);
  assert.equal(json.items.length,1);assert.equal(json.items[0].ty,"🐞 錯誤");
  assert.deepEqual(json.reports,{"R-1111-7K3Q":{s:"done",at:"11/12"},"R-1111-ABCD":{s:"seen"},"R-1111-WXYZ":{s:"done"}});
  assert.ok(!/me[1-5]|壞名字|x9|"h"/.test(JSON.stringify(json.reports)),"reports 只有編號和狀態");
  /* 接回手機：匯出的 reports 直接能用 */
  const X=phone({ls:{m_lbRepMine:JSON.stringify([{rid:"R-1111-7K3Q",at:1,name:"甲",st:"sent"},{rid:"R-1111-ABCD",at:2,name:"乙",st:"sent"}])}});
  assert.deepEqual(X.T.lbsMineApply(json.reports),["R-1111-7K3Q"]);
  assert.equal(X.T.lbsMineState(X.T.lbsMine()[1]),"seen");
});
