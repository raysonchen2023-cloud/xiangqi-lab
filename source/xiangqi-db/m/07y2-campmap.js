/* ================= 🔰 新手訓練營「沙盤兵推圖」（開發者 11/8 選定 Gemini 方案 1＋7；考究說明 park/campmap/考究說明.md，史學顧問核過 camp_day_v3）=================
   圖：park/campmap/camp_day_v4.png（Gemini 重畫＋兩次局部修：宋式軍帳、營內 X 小路、豆形燈盞、12 面旗、朱硯、青銅包角）、夜版 camp_night_v1.png → art/campmap/ → data/campmap/。
   書院中庭的地形木案（仿沈括木圖）特寫：地形照棋盤格局、沒有線格——近處我方營寨、中間小溪＝楚河、遠處敵方營寨；營寨裡白色交叉小路＝九宮的 X。
   一條小路從我方營寨蛇行過橋到敵營，路邊 12 面素旗＝12 課：1～7 課在我方這岸，第 8 課「兵」剛過河，9～12 課一路逼近敵營。
   旗上的字、0～3 個朱圈（取代星星）、目前這一課的光都是程式疊的：上完的課旗上寫朱字、旗下畫圈；目前這一課的旗發光、字是淡墨；還沒開的旗素白、點了提示先上前一課。
   點旗＝3D 角色（縮成木案的比例）沿小路走到那面旗，鞠躬後直接開那一課（#/camp/n），鎖住和順序照原本 CAMP／campStars。
   包一層 Camp(v,n)（只換課程清單那一頁，原本的說明和清單留在圖下面）；接 07w 走路（SHW_CAMP）、07x 縮放。開關 CAMP_MAP_ON；圖片網址帶 CP_IMGV */
const CAMP_MAP_ON=true;
const CP_IMGV="2320";
const CP_GLYPH=["帥","仕","相","傌","蹩","俥","炮","兵","將","解","錯","殺","證"];
/* 旗面中心（像素，768×1376）；最後一面＝結業對局，擺在敵方營門前 */
const CP_FLAGS=[[377,815],[304,789],[182,721],[227,675],[294,650],[373,629],[531,561],[406,493],[364,411],[574,356],[526,327],[477,314],[400,268]];
/* 小路上的走路節點（像素）：0＝我方營門 … 8＝木板橋 … 16＝敵方營門 */
const CP_PATH=[[380,930],[264,879],[200,814],[207,750],[279,711],[421,696],[500,650],[436,593],[414,571],[336,529],[257,496],[314,464],[486,450],[543,414],[514,371],[421,350],[393,304]];
const CP_NODE=CP_FLAGS.map(([x,y])=>{const bx=x-12,by=y+45;let k=0,d=1e9;CP_PATH.forEach(([px,py],i)=>{const e=(px-bx)**2+(py-by)**2;if(e<d){d=e;k=i}});return k});
const cpPc=(x,y)=>[x/7.68,y/13.76];
const cpDark=()=>{const t=store.get("pageTheme","auto");return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)||(typeof xqNight==="function"&&xqNight())};   /* 11/17 第 28 輪 N28-2：有夜版圖的頁一律照實際日落（00-util xqNight，跟首頁同一個判斷）；深色主題照舊 */
function cpCfg(cur){const N={},E=[];CP_PATH.forEach(([x,y],i)=>{const[a,b]=cpPc(x,y);N["w"+i]=[+a.toFixed(2),+b.toFixed(2)];if(i)E.push(`w${i-1}-w${i}`)});
  const HS={};CP_FLAGS.forEach(([x,y],i)=>{const[a,b]=cpPc(x,y);HS["cpF"+(i+1)]=["w"+CP_NODE[i],+a.toFixed(2),+b.toFixed(2),"bow"]});
  const home="w"+CP_NODE[Math.max(0,Math.min(11,cur-1))],nx=CP_FLAGS[Math.min(11,cur)]||CP_FLAGS[11];
  return{el:52,h:[.03,60,.0004],look0:cpPc(nx[0],nx[1]),home,N,E:E.join(" "),HS}}
/* W107-L 第 1 批 iPad 橫向專用圖（l1610，2560×1600；Windows Claude 1 11/25 量，output/w107-ipad/l1610/campmap/camp_day_classic_l1610.json）：
   經典版、原圖版共用一套座標；夜景沒有橫式圖＝照舊原圖。新圖是兩條白路連兩座營寨、合成一圈：從左下營寨出發走上面那條（過橋，6 面旗）到右上營寨，
   再沿下面那條回到左下營寨旁（7 面），結業回到出發的營寨旁。flags 13 面旗面、path 31 個行軍路線點都是橫式圖像素；
   找旗腳最近的路線點時，旗腳偏移照原本（直圖像素 x-12、y+45）×(2560/768)。旗在新圖上比較小：旗面約 2.2%×3.6%（原本 4.4%×2.6%）。
   小人身高照旗距換算（原圖相鄰旗約 77px、新圖約 190px）：.03 → .06。出口：新圖起點 w0 在左下營寨，從那裡往左走出去（07w SHW_EXITS 照記憶名 "campL:*"） */
const CP_LK=2560/768;
const CP_L={W:2560,H:1600,flags:[[862,866],[1037,796],[1275,656],[1380,530],[1562,418],[1716,292],[1800,558],[1590,698],[1485,782],[1338,1020],[1156,992],[974,1034],[736,1062]],
  path:[[666,1167],[848,1146],[883,1048],[855,964],[932,901],[1058,866],[1184,817],[1240,775],[1310,719],[1408,656],[1492,600],[1520,523],[1618,460],[1688,390],[1800,348],[1926,376],[1954,446],[1968,516],[1898,579],[1800,642],[1744,712],[1632,768],[1562,803],[1478,859],[1380,908],[1324,957],[1240,1006],[1114,1041],[1002,1090],[876,1146],[750,1177]]};
const CP_NODE_L=CP_L.flags.map(([x,y])=>{const bx=x-12*CP_LK,by=y+45*CP_LK;let k=0,d=1e9;CP_L.path.forEach(([px,py],i)=>{const e=(px-bx)**2+(py-by)**2;if(e<d){d=e;k=i}});return k});
const cpPcL=(x,y)=>[x/25.6,y/16];
function cpCfgL(cur){const N={},E=[];CP_L.path.forEach(([x,y],i)=>{const[a,b]=cpPcL(x,y);N["w"+i]=[+a.toFixed(2),+b.toFixed(2)];if(i)E.push(`w${i-1}-w${i}`)});
  E.push(`w${CP_L.path.length-1}-w0`);   /* W164（11/26 外部複審）：路線是一圈（最後一點回到出發營寨旁），原本少接這一段，結業路線要繞大半圈（約 14.6 倍） */
  const HS={};CP_L.flags.forEach(([x,y],i)=>{const[a,b]=cpPcL(x,y);HS["cpF"+(i+1)]=["w"+CP_NODE_L[i],+a.toFixed(2),+b.toFixed(2),"bow"]});
  const home="w"+CP_NODE_L[Math.max(0,Math.min(11,cur-1))],nx=CP_L.flags[Math.min(11,cur)]||CP_L.flags[11];
  return{W:2560,H:1600,el:52,h:[.06,60,.0008],look0:cpPcL(nx[0],nx[1]),home,N,E:E.join(" "),HS}}
/* 換圖重掛走路時（07sw scwWalk 叫 onCfg）：橫式圖的設定補上這一課的起點、看的方向，記憶名換成 campL（出口不同）；換回原圖記憶名換回 camp */
function cpOnCfg(o,c,x){const L=x&&x.W===2560;if(L)Object.assign(x,cpCfgL(c));o.pfx=(L?"campL:":"camp:")+c}
if(typeof SHW_EXITS!=="undefined"&&SHW_EXITS&&!("campL:*" in SHW_EXITS))SHW_EXITS["campL:*"]={at:"w0",out:[10,82],r:[4,74,18,90]};
if(typeof SCW!=="undefined"){const S={};CP_L.flags.forEach(([x,y],i)=>{const[a,b]=cpPcL(x,y);S["cpF"+(i+1)]=[+a.toFixed(2),+b.toFixed(2)]});
  const e={ready:true,f:"campmap/camp_day_classic_l1610",w:2560,h:1600,S,exit:[11,82],safe:{l:.12,r:.12,t:.05,b:.10},walk:cpCfgL(1)};
  SCW["campmap/camp_day_classic"]=e;SCW["campmap/camp_day"]=Object.assign({},e,{f:"campmap/camp_day_l1610"})}
function cpCss(){if(document.getElementById("cpCss"))return;const s=document.createElement("style");s.id="cpCss";s.textContent=`
.camp-page{margin:0 0 6px}
.camp-page .shp-spot.cp-flag{width:4.4%;height:2.6%;min-width:0;max-width:none;padding:0;border:0;border-radius:2px;background:none;box-shadow:none;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center}
.camp-page.scw-l .shp-spot.cp-flag{width:2.2%;height:3.6%}
.camp-page .cp-flag b{font:900 13px/1 var(--serif,serif);color:rgba(60,44,30,.38);text-shadow:none;letter-spacing:0}
.camp-page .cp-flag.done b{color:#b23a26}
.camp-page .cp-flag.cur b{color:rgba(40,28,18,.75)}
.camp-page .cp-flag.cur{box-shadow:0 0 0 2px rgba(242,201,76,.9),0 0 10px 3px rgba(255,214,120,.75);animation:cpGlow 1.8s ease-in-out infinite alternate}
.camp-page .cp-flag.lock{opacity:.85}
.camp-page .cp-flag i{position:absolute;left:50%;top:118%;transform:translateX(-50%);display:flex;gap:1px;pointer-events:none}
.camp-page .cp-flag i u{display:block;width:5px;height:5px;border:1.2px solid #b23a26;border-radius:50%}
@keyframes cpGlow{from{box-shadow:0 0 0 2px rgba(242,201,76,.6),0 0 6px 2px rgba(255,214,120,.45)}to{box-shadow:0 0 0 2px rgba(242,201,76,1),0 0 12px 4px rgba(255,214,120,.85)}}
.cp-cap{position:absolute;left:50%;top:2.2%;transform:translateX(-50%);z-index:4;background:rgba(30,24,18,.72);color:#f6e7c8;font:800 13px/1 var(--serif,serif);padding:6px 12px;border-radius:999px;white-space:nowrap;pointer-events:none}
@media (prefers-reduced-motion:reduce){.camp-page .cp-flag.cur{animation:none}}`;document.head.append(s)}
function campMap(v){if(v.querySelector(".camp-page"))return;const pad=v.querySelector(".pad");if(!pad)return;cpCss();
  const S=campStars(),done=n=>(S[n]||0)>0,open=n=>n===1||done(n-1);let cur=1;while(cur<=CAMP.length&&done(cur))cur++;
  const got=CAMP.filter(c=>done(c.n)).length;
  const P=document.createElement("div");P.className="shp-page cq camp-page";
  /* W107-L：iPad 橫向有專用橫式圖（07sw SCW，條目在上面）就一開始載那張；旗照條目擺、走路照 cpCfgL（換圖時 onCfg 換成這一課的起點和記憶名） */
  const src=xqClImg(`data/campmap/${cpDark()?"camp_night":"camp_day"}.webp?v=${CP_IMGV}`),pre=typeof scwPre==="function"?scwPre(v,src):{src,k:""};if(pre.k){P.dataset.scw=pre.k;P.classList.add("scw-l")}
  P.innerHTML=`<img src="${pre.src}" alt="沙盤兵推圖"><span class="cp-cap">${got>=CAMP.length?"🎉 全部結業":`第 ${Math.min(cur,CAMP.length)} 課・${esc((CAMP[Math.min(cur,CAMP.length)-1]||{}).name||"")}`}</span>`+
    CP_FLAGS.map(([x,y],i)=>{const n=i+1,[a,b]=cpPc(x,y),k=S[n]||0,st=done(n)?"done":open(n)?"cur":"lock";
      return`<button type="button" class="shp-spot cp-flag ${st}" id="cpF${n}" data-nolift="1" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%" aria-label="${esc(`第 ${n} 課・${(CAMP[i]||{}).name||""}${st==="lock"?"（還沒開）":k?`（${k} 顆星）`:""}`)}"><b>${st==="lock"?"":CP_GLYPH[i]}</b>${k?`<i>${"<u></u>".repeat(Math.min(3,k))}</i>`:""}</button>`}).join("");
  v.insertBefore(P,pad);
  P.querySelectorAll(".cp-flag").forEach(b=>b.onclick=()=>{const n=+b.id.slice(3);vibrate(5);if(!open(n)){toast(`先完成第 ${n-1} 課「${(CAMP[n-2]||{}).name||""}」`);return}if(typeof jRunSet==="function")jRunSet(null,"jRunC");location.hash="#/camp/"+n});   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：新手訓練營用自己的 jRunC，不洗掉石桌往事的 jRun */
  const c=Math.min(cur,12),cfg=Object.assign({},SHW_PG0,cpCfg(c));let cfgNow=cfg,mem="camp:"+c;
  if(typeof scwMount==="function"){const o={key:scwKey(src),src0:src,ids:CP_FLAGS.map((_,i)=>"cpF"+(i+1)),pfx:mem,cfg0:cfg,
      onCfg:x=>cpOnCfg(o,c,x)};
    scwMount(P,o);if(pre.k){cfgNow=Object.assign(scwWalkCfg(o,scwCur(P)),cpCfgL(c));mem=o.pfx="campL:"+c;P._scwW="l"}}
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,cfgNow,mem)}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof Camp==="function"){const f0=Camp;Camp=function(v,n){const r=f0.apply(this,arguments);try{if(CAMP_MAP_ON&&!n)campMap(v)}catch(e){}return r}}
