// 低段電腦擬人選步（src/local.js 的 HUMANPICK 區塊）自動測試。說明：xiangqi-db/story/98_低段電腦擬人.md
// 不開瀏覽器、不開引擎：把 /* HUMANPICK:BEGIN */～END 切出來跑（跟 tools/human-ai-match.js 同一個抽法），
//   引擎的 MultiPV 結果用「規則算出來的假引擎」代替：走過去會被白吃大子的著法給 -1100 厘兵，吃子照子力給分，其他著法給固定的小分數；
//   亂數用固定種子（mulberry32），每次結果一樣。
// 驗：各等級的行為特徵（最低級見子就吃、會漏看你捉它的子、會貪吃被反吃，但幾乎不會把車平白走到被吃的格子；等級越高越少犯）、
//     業2 以上和笑面掌櫃不受影響、程式接線（挑戰電腦、車輪戰）、速度。
// 用法：node --test xiangqi-lab/tools/test-human-ai.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const LAB=path.join(__dirname,"..");
const LOCAL=fs.readFileSync(path.join(LAB,"src/local.js"),"utf8").replace(/\r\n/g,"\n"),C=require("../site/core.js");
function cut(src,a,b,name){const i=src.indexOf(a),j=src.indexOf(b,i+1);assert.ok(i>=0&&j>i,"找不到 "+name);return src.slice(i,j+b.length)}
const HP_SRC=cut(LOCAL,"/* HUMANPICK:BEGIN */","/* HUMANPICK:END */","local.js 的 HUMANPICK 區塊");
const HP=new Function("C",HP_SRC+"\nreturn HUMANPICK(C);")(C);
const RLV=new Function("return "+LOCAL.match(/const RLV=(\[[\s\S]*?\]);/)[1])();
const rng=seed=>()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const LOW=RLV[0],MID=RLV[2],AM1=RLV[4];   /* 新手、入門2、業1 */

/* 假引擎：每個合法著法一條；v＝吃到的子力×130 − 走完淨虧×130（吃了會被吃回的、走到被白吃的格子，都照規則算），再加一點固定的小差異 */
function fakeLines(fenStr,s,extra){const b=C.parseFen(fenStr);const L=C.legal(b,s).map(([f,t],i)=>{const a=C.make(b,f,t),th=HP.threats(a,s),cap=b[t]?HP.val(b[t],t):0;
    const v=Math.round((cap-HP.maxOf(th))*130)+(i*7)%40;return{mv:C.iccs(f,t),v,mate:null,pv:[C.iccs(f,t)]}});
  if(extra)extra(L);L.sort((x,y)=>y.v-x.v);return{b,r:{best:L[0].mv,lines:L}}}
/* 同一局面用 N 個種子各選一次，回傳每個著法被選的比例 */
function freq(fenStr,lv,N,extra){const{b,r}=fakeLines(fenStr,"r",extra),c={};for(let i=1;i<=N;i++){const m=HP.pick(r,lv,b,"r",rng(i*7919)).mv;c[m]=(c[m]||0)+1}
  const o={};for(const k in c)o[k]=c[k]/N;return o}
const sum=(o,keys)=>keys.reduce((a,k)=>a+(o[k]||0),0);

/* 局面（紅先；黑將 d9、紅帥 e0，不對臉） */
const HANG="3k5/9/9/9/2n6/9/9/9/9/R3K4";         /* 紅車 a0，黑馬 c5 守著 a4、a6：車走到 a4／a6 會被白吃 */
const HANG_MV=["a0a4","a0a6"];
const MISS="3k5/9/9/9/2n6/R8/6P1P/9/9/4K4";      /* 紅車 a4 已經被黑馬捉著（你的威脅）；不動車＝漏看 */
const FREE="3k5/9/9/9/n8/9/9/9/9/R3K4";          /* 紅車 a0 可以白吃 a5 的黑馬 */
const GREED="3k5/9/1n7/9/p8/9/9/9/9/R3K4";       /* 紅車 a0 可以吃 a5 的卒，但黑馬 b7 守著：吃了車被吃回（貪吃） */

test("〔原始碼〕HUMANPICK 區塊是純函式：BEGIN／END 各一個、不碰存檔／畫面／引擎；亂數只用傳進來的 rnd（沒傳才退回 Math.random）",()=>{
  assert.equal(LOCAL.split("/* HUMANPICK:BEGIN */").length,2);assert.equal(LOCAL.split("/* HUMANPICK:END */").length,2);
  for(const k of["on","mpvOf","pick","threats","val","look"])assert.equal(typeof HP[k],"function",k);
  assert.doesNotMatch(HP_SRC.replace(/\/\*[\s\S]*?\*\//g,""),/\bP\.(board|moves|turn|id|human|level)\b|\b(ls|localStorage|XQEngine|fetch|window|document)\s*[.(\[]|(?<!rnd\|\|)Math\.random/,"區塊裡不能碰存檔、引擎、畫面、Math.random");
  assert.ok(LOCAL.indexOf("/* HUMANPICK:END */")<LOCAL.indexOf("/* STYLEPICK:BEGIN */"),"跟笑面掌櫃的區塊分開、不重疊")});

test("分級：新手～業1（RLV 0～4）擬人，業2 以上、每步想幾秒的、笑面掌櫃都照舊",()=>{
  for(let i=0;i<RLV.length;i++)assert.equal(HP.on(RLV[i]),i<5,"RLV "+i);
  assert.equal(HP.on({movetime:6000}),false);assert.equal(HP.on(null),false);
  assert.deepEqual(RLV.slice(0,5).map(x=>x.hm),[0,1,2,3,4]);
  assert.deepEqual(RLV.slice(0,5).map(x=>x.depth),[1,1,2,2,3],"看幾步照舊：新手、入門1 只看一步");
  assert.deepEqual(RLV.slice(0,5).map(HP.mpvOf),[40,36,32,28,24]);assert.equal(HP.mpvOf(RLV[5]),6);assert.equal(HP.mpvOf({movetime:300}),1);
  /* 參數單調：等級越高越會注意、越不貪、越不亂 */
  const P=HP.PROF;for(let i=1;i<P.length;i++)for(const k of["old","maj","min","disc","recap","see","mate","mated"]){assert.ok(P[i][k]>=P[i-1][k],k+" 第 "+i+" 級")}
  for(let i=1;i<P.length;i++){assert.ok(P[i].greed<P[i-1].greed);assert.ok(P[i].T<P[i-1].T)}
  for(const p of P)assert.ok(p.maj>=0.97&&p.maj>p.old+0.1,p.name+"：自己走過去的大子比較會注意（送大子遠少於漏看）")});

test("規則：威脅淨虧（白吃＝整顆、吃了吃得回來＝扣掉；兵過河 2）",()=>{
  const b=C.parseFen(HANG);assert.deepEqual(HP.threats(b,"r"),{});
  const a=C.make(b,C.parseSq("a0"),C.parseSq("a4"));assert.deepEqual(HP.threats(a,"r"),{[C.parseSq("a4")]:9},"車被馬白吃");
  const g=C.make(C.parseFen(GREED),C.parseSq("a0"),C.parseSq("a5"));assert.equal(HP.threats(g,"r")[C.parseSq("a5")],9,"吃卒後車被馬吃回");
  assert.equal(HP.val("P",C.parseSq("a5")),2);assert.equal(HP.val("P",C.parseSq("a3")),1);assert.equal(HP.val("p",C.parseSq("a4")),2)});

test("同一個種子同一個結果（測試入口可注入亂數）",()=>{
  const{b,r}=fakeLines(C.START,"r");for(const lv of RLV.slice(0,5)){const a=[1,2,3,4,5].map(s=>HP.pick(r,lv,b,"r",rng(s)).mv),c=[1,2,3,4,5].map(s=>HP.pick(r,lv,b,"r",rng(s)).mv);assert.deepEqual(a,c)}});

test("見子就吃：有白吃的大子，新手 ≥60%、業1 ≥90% 會吃",()=>{
  const lo=freq(FREE,LOW,600)["a0a5"]||0,hi=freq(FREE,AM1,600)["a0a5"]||0;
  assert.ok(lo>=0.6,"新手吃子率 "+lo);assert.ok(hi>=0.9,"業1 吃子率 "+hi);assert.ok(hi>lo)});

test("不會平白送車：車走到沒人捉、卻會被白吃的格子，新手 <1%、業1 幾乎 0",()=>{
  const lo=sum(freq(HANG,LOW,3000),HANG_MV),hi=sum(freq(HANG,AM1,3000),HANG_MV);
  assert.ok(lo<0.01,"新手送車率 "+lo);assert.ok(hi<=0.002,"業1 送車率 "+hi)});

test("漏看你的威脅：車被捉著，新手常常沒看到（≥8%，而且是送車率的 5 倍以上）、等級越高越少",()=>{
  const b=C.parseFen(MISS),stay=C.legal(b,"r").map(([f,t])=>C.iccs(f,t)).filter(u=>u.slice(0,2)!=="a4");
  const rate=lv=>sum(freq(MISS,lv,2000),stay);
  const lo=rate(LOW),mid=rate(MID),hi=rate(AM1),hang=sum(freq(HANG,LOW,3000),HANG_MV);
  assert.ok(lo>=0.08,"新手漏看率 "+lo);assert.ok(lo>=5*Math.max(hang,0.002),"漏看 "+lo+" vs 送車 "+hang);
  assert.ok(lo>mid&&mid>hi,`漏看率 新手 ${lo}、入門2 ${mid}、業1 ${hi}`)});

test("貪吃被反吃：吃有人守的卒，新手常吃（≥20%），業1 少一半以上",()=>{
  const lo=freq(GREED,LOW,2000)["a0a5"]||0,hi=freq(GREED,AM1,2000)["a0a5"]||0;
  assert.ok(lo>=0.2,"新手貪吃率 "+lo);assert.ok(hi<=lo/2,"業1 貪吃率 "+hi)});

test("一步殺：新手有時沒看到（看到的 45%～85%），業1 幾乎都看到（≥90%）",()=>{
  const mate=L=>{const x=L.find(l=>l.mv==="a0a1");x.v=29999;x.mate=1};
  const lo=freq(HANG,LOW,1000,mate)["a0a1"]||0,hi=freq(HANG,AM1,1000,mate)["a0a1"]||0;
  assert.ok(lo>=0.45&&lo<=0.85,"新手 "+lo);assert.ok(hi>=0.9,"業1 "+hi)});

test("不看比分：同一個局面，雙方子力差多少（引擎分數整體平移 ±800，沒碰到 ±2500 夾值）選的著法都一樣——不會因為你快輸了就突然下出好棋",()=>{
  const{b,r}=fakeLines(MISS,"r"),sh=d=>({best:r.best,lines:r.lines.map(x=>({...x,v:x.v+d}))});
  for(const lv of[LOW,AM1])for(let s=1;s<=40;s++){const a=HP.pick(r,lv,b,"r",rng(s)).mv;for(const d of[-800,800])assert.equal(HP.pick(sh(d),lv,b,"r",rng(s)).mv,a)}});

test("候選太少／沒有 hm：照引擎第一步；回傳的著法一定在候選裡",()=>{
  const{b,r}=fakeLines(C.START,"r");assert.equal(HP.pick({best:"h2e2",lines:[r.lines[0]]},LOW,b,"r",rng(1)).mv,r.lines[0].mv);
  assert.equal(HP.pick(r,RLV[6],b,"r",rng(1)).why,"single");
  for(let s=1;s<=50;s++)assert.ok(r.lines.some(x=>x.mv===HP.pick(r,LOW,b,"r",rng(s)).mv))});

test("速度：開局 44 條候選，選一步 < 60 毫秒（手機上每步本來就至少等 1 秒）",()=>{
  const{b,r}=fakeLines(C.START,"r");HP.pick(r,LOW,b,"r",rng(1));const t0=process.hrtime.bigint();for(let s=0;s<20;s++)HP.pick(r,LOW,b,"r",rng(s));
  const ms=Number(process.hrtime.bigint()-t0)/1e6/20;assert.ok(ms<60,"平均 "+ms.toFixed(1)+" ms")});

test("〔原始碼〕接線：挑戰電腦、車輪戰用 HP（笑面掌櫃優先、業2 以上照 pickMove）；難度說明用 HP.DESC",()=>{
  assert.match(LOCAL,/const hp=!zg&&HP\.on\(lv\),zl=zg\?zgLv\(P,lv\):lv;/);
  assert.match(LOCAL,/zg\?SP\.mpvOf\(zl\):hp\?HP\.mpvOf\(lv\):lv\.multipv\|\|1/);
  assert.match(LOCAL,/zg\?SP\.pick\(r,zl,P\.board,P\.turn,Math\.random\)\.mv:hp\?HP\.pick\(r,lv,P\.board,P\.turn,Math\.random\)\.mv:pickMove\(r,lv\)/);
  assert.match(LOCAL,/zl\.nodes\?\{nodes:zl\.nodes\}:lv\.movetime/,"掌櫃真功夫（開發者 11/12）：固定節點數，跟訓練循環一樣");
  assert.match(LOCAL,/const ZG_X_NODES=553,zgLv=\(G,lv\)=>G&&G\.zgx\?\{nodes:ZG_X_NODES\}:lv;/,"訓練循環第 10 輪正式輪校準的 553 節點");
  assert.match(LOCAL,/hp\?HP\.pick\(r,lv,t\.board,t\.turn,Math\.random\)\.mv:pickMove\(r,lv\)/,"車輪戰");
  assert.match(LOCAL,/HP\.on\(x\)\?HP\.DESC\[x\.hm\]/);assert.equal(HP.DESC.length,5);
  assert.ok(LOCAL.indexOf("const HP=HUMANPICK(C);")<LOCAL.indexOf("const LVDESC="),"HP 要在難度表之前建好")});
