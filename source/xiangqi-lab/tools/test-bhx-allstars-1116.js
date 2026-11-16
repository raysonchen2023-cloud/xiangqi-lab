// 開發者 11/16（主要工作階段轉告）：「開頭的黑洞對戰不能用木棋靈，要用所有七星3D角色」
//   首次開 App 的序局（bh:xu）：07bh bhParkEx 帶 ex.allStars，park3d 的 gntWood 看到就一律回 false（七種紅子都用七星 3D）；其他盤照舊看誰加入了。
// 用法：node --test xiangqi-lab/tools/test-bhx-allstars-1116.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"../..");
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8").replace(/\r\n/g,"\n");
const P3=rd("xiangqi-lab/src/park3d.js"),BH=rd("xiangqi-db/m/07bh-blackhole.js");

test("park3d：ex.allStars 打開時 gntWood 一律 false；每次 draw 照這一盤的 ex 重設",()=>{
  assert.ok(P3.includes("let GALL=false;"));
  assert.ok(P3.includes('gntWood=K=>{if(GALL)return false;try{return typeof window.ptyHas==="function"&&!!GNT_X[K]&&!window.ptyHas(GNT_X[K])}catch(e){return false}}'),"其他盤照舊看 ptyHas");
  assert.ok(P3.includes("function draw(board,o,ex){o=o||{};ex=ex||{};drawn=true;GALL=!!ex.allStars;"),"每次 draw 都照這一盤重設（離開序局就回到照加入）");
  /* 抽出 gntWood 的判斷實際跑一次 */
  const GNT_X={R:"x_swordboy",N:"x_miaogirl",K:"x_shuai"};const mk=(gall,has)=>{const window={ptyHas:c=>has.includes(c)};let GALL=gall;return K=>{if(GALL)return false;try{return typeof window.ptyHas==="function"&&!!GNT_X[K]&&!window.ptyHas(GNT_X[K])}catch(e){return false}}};
  assert.equal(mk(false,["x_swordboy"])("N"),true,"一般盤：駱躍梅沒加入＝木棋靈");assert.equal(mk(true,["x_swordboy"])("N"),false,"序局：一律七星");assert.equal(mk(false,["x_swordboy"])("R"),false);
});

test("07bh：序局（bh:xu）的 bhParkEx 帶 allStars；序局擺法紅方七種子都在",()=>{
  assert.ok(BH.includes("return{giant:true,allStars:st.journey===BHX_ID"));
  const fen=BH.match(/const BHX_ID="bh:xu",BHX_FEN="([^"]+)"/)[1],red=[...new Set(fen.replace(/[^A-Z]/g,""))].sort().join("");
  assert.equal(red,"ABCKNPR","紅方七種子都有，七位都會上場");
});

/* 開發者 11/16 追加：「這個紅圈要拿掉，打完boss才能繼續」（序局頂欄「‹ 回星槎」） */
const B8=rd("xiangqi-db/m/08b-cpugame.js");
test("序局還沒打完：bhxLocked 只在 bh:xu、沒有結果時成立",()=>{
  assert.ok(BH.includes("function bhxLocked(st){return!!(st&&st.journey===BHX_ID&&!st.result)}"));
  const BHX_ID="bh:xu",bhxLocked=st=>!!(st&&st.journey===BHX_ID&&!st.result);
  assert.equal(bhxLocked({journey:"bh:xu",result:null}),true);assert.equal(bhxLocked({journey:"bh:xu",result:{w:"r"}}),false,"打完就解鎖");assert.equal(bhxLocked({journey:"bh:gs1",result:null}),false,"別盤不鎖");
});
test("08b：序局鎖住時沒有返回鈕、沒有新局／認輸／擺盤、等級牌不開新局選單、頂欄沒有全站地圖；打完重畫頂欄",()=>{
  assert.ok(B8.includes('typeof bhxLocked==="function"&&bhxLocked(st)?null:st&&st.journey?jBack(st.journey):"#/adventure"'),"返回鈕＝null（setTop 就藏起來）");
  assert.ok(B8.includes('const jk=(st.journey||null)+(typeof bhxLocked==="function"&&bhxLocked(st)?"|L":"");if(lk!==arenaLock||jk!==jKey){arenaLock=lk;jKey=jk;topBar()}'),"鎖解開也重畫頂欄");
  assert.ok(B8.includes('{const xl=typeof bhxLocked==="function"&&bhxLocked(st);acts.new.hidden=xl;if(xl){acts.resign.hidden=true;acts.setup.hidden=true}}'));
  assert.ok(B8.includes('if(e.target.closest(".cpu-chip")){if(typeof bhxLocked==="function"&&bhxLocked(st))return;'));
  assert.ok(B8.includes('try{if(typeof bhxLocked==="function"&&bhxLocked(st)){const m=document.querySelector("#topRight .stm-btn");if(m)m.remove()}}catch(e){}'));
});
