// 3D 盤邊「被吃的子」以這盤的開局局面當基準（開發者 11/13：十三星系「紫淵・破軍幻影」重炮陣一開局盤邊就排著兩顆象；黑洞塔防星門還沒落下的援軍也被當成被吃）。
// park3d.js 的 CAPBASE 標記段（純函式）抽出來測；另外檢查 08b-cpugame 有傳 ex.start、park3d 桌邊排法和巨盤星軌都改用這個基準。
// 用法：node --test xiangqi-lab/tools/test-park3d-capbase.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"../.."),rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const PARK=rd("xiangqi-lab/src/park3d.js"),GAME=rd("xiangqi-db/m/08b-cpugame.js"),GX=rd("xiangqi-db/m/07gx-galaxy.js");
const C=require("../site/core.js");
const blk=PARK.slice(PARK.indexOf("/*CAPBASE{"),PARK.indexOf("/*}CAPBASE*/"));
const K=new Function(blk+";return{capCnt,capFen,capPeak,capBase,capLost}")();
const J=x=>JSON.parse(JSON.stringify(x));
const ZIYUAN=(GX.match(/id:"ziyuan"[^}]*fen:"([^"]+)"/)||[])[1];

test("十三星系重炮陣（黑方兩象換成炮）：開局盤邊是空的；吃掉一門砲後只有一門砲", ()=>{
  assert.ok(ZIYUAN&&ZIYUAN.includes("c"),"從 07gx-galaxy.js 讀到紫淵的開局");
  const b=C.parseFen(ZIYUAN);let pk=K.capPeak(null,b),base=K.capBase(ZIYUAN,pk);
  assert.deepEqual(J(K.capLost(b,base)),{r:[],b:[]},"開局什麼都沒被吃");
  assert.deepEqual(J(K.capLost(b,K.capBase(null,K.capPeak(null,b)))).b,["b","b"],"舊做法（照標準全副）會多出兩顆象——這就是開發者看到的問題");
  const i=b.indexOf("c");b[i]=null;pk=K.capPeak(pk,b);base=K.capBase(ZIYUAN,pk);
  assert.deepEqual(J(K.capLost(b,base)),{r:[],b:["c"]},"吃掉一門砲：盤邊只有一門砲")});

test("沒傳開局（一般對局）：照標準全副，跟以前一樣", ()=>{
  const b=C.parseFen(C.START);b[81]=null;const base=K.capBase(null,K.capPeak(null,b));assert.deepEqual(J(K.capLost(b,base)),{r:["R"],b:[]})});

test("黑洞塔防：星門還沒落下的援軍不算被吃；落下之後被吃才算", ()=>{
  const start="3aka3/9/9/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR",b=C.parseFen(start);let pk=K.capPeak(null,b);
  assert.deepEqual(J(K.capLost(b,K.capBase(start,pk))),{r:[],b:[]},"開局 8 子：其餘 8 子還在星門後面");
  b[1]="n";pk=K.capPeak(pk,b);assert.deepEqual(J(K.capLost(b,K.capBase(start,pk))),{r:[],b:[]},"馬從星門落下");
  b[1]=null;pk=K.capPeak(pk,b);assert.deepEqual(J(K.capLost(b,K.capBase(start,pk))),{r:[],b:["n"]},"落下的馬被吃了才排到盤邊");
  b[27]=null;pk=K.capPeak(pk,b);assert.deepEqual(J(K.capLost(b,K.capBase(start,pk))).b,["n","p"])});

test("石桌往事自訂局面（殘局）：少的子不算被吃", ()=>{
  const start="4k4/4a4/2N1R1N2/4C4/8P/9/9/9/9/4KAB2",b=C.parseFen(start);assert.deepEqual(J(K.capLost(b,K.capBase(start,K.capPeak(null,b)))),{r:[],b:[]})});

test("〔原始碼〕對局頁傳 ex.start；桌邊排法、巨盤星軌都用 CAPBASE；換盤（gid／開局不同）就重算", ()=>{
  assert.match(GAME,/parkDraw\(v\.querySelector\("#bbox"\),bd,st\.board,o,\{tap,gid:st\.id\?"cpu:"\+st\.id:null,start:st\.start\|\|null,/);
  assert.match(PARK,/const LOST=capLost\(board,CAPBS\|\|capBase\(null,null\)\)/,"桌邊");
  assert.match(PARK,/const gntStarLay=board=>\{const B0=CAPBS\|\|capBase\(null,null\)/,"巨盤星軌");
  assert.match(PARK,/BLZ=!!ex\.blitz;LBK=\(board\|\|\[\]\)\.join\(","\);\{const ck=\(ex\.gid\|\|""\)\+"\|"\+\(ex\.start\|\|""\);if\(ck!==CAPKEY\)\{CAPKEY=ck;CAPPK=null\}CAPPK=capPeak\(CAPPK,board\);CAPBS=capBase\(ex\.start\|\|null,CAPPK\)/,"draw 一開始就算好基準");
  assert.ok(!/\(START\[s\]\[k\]\|\|0\)-\(cnt\[s\]\[k\]\|\|0\)/.test(PARK),"舊的照標準全副算法拿掉了")});
