// 11/16 iMac 到貨：iOS 原生 App 的修補 N2～N5（xiangqi-ios/patches/README.md）
// App 網址是 http://127.0.0.1:47821，以前被當成電腦本機測試；橋接檔 native-bridge.js 設 window.XQ_NATIVE=true 時要照正式玩家的規則。
//   N2 05-settings reportPlayer：127.x 不送玩家登記 → App 裡照送
//   N3 05b-save fnTest：127.x 當測試機 → App 裡不是測試機（設了測試房 xq_netRoot 照舊是測試機）
//   N4 05-settings updCheck：App 裡說明「新版由 App Store 更新」
//   N5 05-settings wipeAllData：刪除全部資料時一併取消每日提醒
// 網頁版、電腦本機（沒有 XQ_NATIVE）的行為不變。
// 用法：node --test xiangqi-lab/tools/test-ios-native-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const DB=path.join(__dirname,"..","..","xiangqi-db");
const SET=fs.readFileSync(path.join(DB,"m/05-settings.js"),"utf8"),SAVE=fs.readFileSync(path.join(DB,"m/05b-save.js"),"utf8");

function fnTestOf(host,native,root){
  const line=SAVE.split("\n").find(l=>l.startsWith("function fnTest(){"));assert.ok(line,"找不到 fnTest");
  const ls={getItem:k=>k==="xq_netRoot"?root:null};
  return new Function("localStorage","location","window",line+"\nreturn fnTest()")(ls,{hostname:host},native?{XQ_NATIVE:true}:{});
}

test("N3 fnTest：App 裡（XQ_NATIVE）127.0.0.1 不是測試機",()=>{
  assert.equal(fnTestOf("127.0.0.1",true,null),false);
});
test("N3 fnTest：電腦本機與設了測試房照舊是測試機",()=>{
  assert.equal(fnTestOf("127.0.0.1",false,null),true);
  assert.equal(fnTestOf("localhost",false,null),true);
  assert.equal(fnTestOf("127.0.0.1",true,'"xq_test"'),true);
  assert.equal(fnTestOf("xiangqi.example.org",false,null),false);
});
test("N2 reportPlayer：本機網址不送的判斷要排除 App",()=>{
  const i=SET.indexOf("async function reportPlayer(){");assert.ok(i>=0);
  const body=SET.slice(i,SET.indexOf("\n}",i)>0?SET.indexOf("sendRecord",i):i+3000);
  assert.ok(body.includes("if(!window.XQ_NATIVE&&/^(localhost|127"),"本機網址判斷沒有排除 XQ_NATIVE");
});
test("N4 updCheck：App 裡說明由 App Store 更新",()=>{
  const i=SET.indexOf("async function updCheck(b){");assert.ok(i>=0);
  const head=SET.slice(i,i+200);
  assert.ok(head.includes("if(window.XQ_NATIVE){")&&head.includes("新版由 App Store 更新"));
});
test("N5 wipeAllData：一併取消每日提醒",()=>{
  assert.ok(SET.includes("try{window.XQNative&&XQNative.daily&&XQNative.daily.disable()}catch(e){}"));
});
test("App 首頁不顯示「📲 加到主畫面」（11/16 iMac 實機）：isStandalone() 認得原生 App 的 UA，首頁兩處改用它",()=>{
  const SH=fs.readFileSync(path.join(DB,"m/02-shell.js"),"utf8");
  const line=SH.split("\n").find(l=>l.startsWith("const isStandalone="));assert.ok(line,"找不到 isStandalone");
  const def=line.slice(0,line.indexOf(";")+1);
  const run=(ua,sa)=>new Function("matchMedia","navigator",def+"\nreturn isStandalone()")(()=>({matches:sa}),{userAgent:ua});
  assert.equal(run("Mozilla/5.0 (iPhone) XQQianqiuApp/1",false),true);
  assert.equal(run("Mozilla/5.0 (iPhone) Safari",false),false);
  assert.equal(run("Mozilla/5.0 (iPhone) Safari",true),true);
  for(const f of ["m/07z-homemap.js","m/03-home-quiz.js"]){
    const s=fs.readFileSync(path.join(DB,f),"utf8");
    assert.ok(s.includes("standalone=isStandalone()"),f+" 沒改用 isStandalone()");
  }
  assert.ok(SET.includes('(/XQQianqiuApp\\//.test(navigator.userAgent)?"・原生App":'),"意見回饋的裝置欄要分得出原生 App");
});
