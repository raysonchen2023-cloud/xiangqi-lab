// 開發者 11/16：「因為增加觀景台和西市，大地圖千秋總覽也要補上這兩個地點」＋選單：觀星臺放雲河渡口、西市放對弈茶樓；還沒開放的照樣列出、灰掉寫怎麼開
// 用法：node --test xiangqi-lab/tools/test-sitemap-places-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const SRC=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/07z6-sitemap.js"),"utf8");
const load=env=>{const ctx=Object.assign({console,setTop:()=>{}},env||{});vm.createContext(ctx);vm.runInContext(SRC+";this.A=STM_AREAS;this.why=stmLockWhy;",ctx);return ctx};
test("觀星臺在雲河渡口、西市在對弈茶樓；網址、搜尋字、開放條件鍵都對",()=>{
  const c=load(),A=k=>c.A.find(x=>x[0]===k)[4];
  const g=A("ship").find(e=>e[1]==="#/guanxing"),x=A("tea").find(e=>e[1]==="#/ximarket");
  assert.ok(g&&/觀星臺/.test(g[0])&&g[3]==="gxt"&&/黑洞/.test(g[2])&&/觀景台/.test(g[2]),"觀星臺（搜尋「觀景台」也找得到）");
  assert.ok(x&&/西市/.test(x[0])&&x[3]==="xsm"&&/暗棋/.test(x[2]),"西市");
});
test("還沒開放：寫怎麼開；開了＝空字串；模組沒載到當作開著",()=>{
  const lock=load({gxtOpen:()=>false,xsmOpen:()=>false}),open=load({gxtOpen:()=>true,xsmOpen:()=>true}),none=load();
  const g=["🔭 觀星臺","#/guanxing","","gxt"],x=["🏮 西市","#/ximarket","","xsm"];
  assert.equal(lock.why(g),"搭星槎起航會偏航進黑洞，打贏一盤就開放");assert.equal(lock.why(x),"領過七星授印禮後開放");
  assert.equal(open.why(g),"");assert.equal(open.why(x),"");assert.equal(none.why(g),"");assert.equal(lock.why(["棋譜庫","#/db",""]),"","沒有條件的入口一直開著");
  assert.ok(SRC.includes('${lk?"🔒 ":""}${esc(nm)}${lk?"（"+esc(lk)+"）":off?"（要連網路）":""}'),"灰掉的按鈕寫 🔒 和怎麼開");
});
