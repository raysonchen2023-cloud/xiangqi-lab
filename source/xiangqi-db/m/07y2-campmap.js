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
const cpDark=()=>{const t=store.get("pageTheme","auto");return t==="dark"||(t==="auto"&&matchMedia("(prefers-color-scheme: dark)").matches)};
function cpCfg(cur){const N={},E=[];CP_PATH.forEach(([x,y],i)=>{const[a,b]=cpPc(x,y);N["w"+i]=[+a.toFixed(2),+b.toFixed(2)];if(i)E.push(`w${i-1}-w${i}`)});
  const HS={};CP_FLAGS.forEach(([x,y],i)=>{const[a,b]=cpPc(x,y);HS["cpF"+(i+1)]=["w"+CP_NODE[i],+a.toFixed(2),+b.toFixed(2),"bow"]});
  const home="w"+CP_NODE[Math.max(0,Math.min(11,cur-1))],nx=CP_FLAGS[Math.min(11,cur)]||CP_FLAGS[11];
  return{el:52,h:[.03,60,.0004],look0:cpPc(nx[0],nx[1]),home,N,E:E.join(" "),HS}}
function cpCss(){if(document.getElementById("cpCss"))return;const s=document.createElement("style");s.id="cpCss";s.textContent=`
.camp-page{margin:0 0 6px}
.camp-page .shp-spot.cp-flag{width:4.4%;height:2.6%;min-width:0;max-width:none;padding:0;border:0;border-radius:2px;background:none;box-shadow:none;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center}
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
  P.innerHTML=`<img src="${xqClImg(`data/campmap/${cpDark()?"camp_night":"camp_day"}.webp?v=${CP_IMGV}`)}" alt="沙盤兵推圖"><span class="cp-cap">${got>=CAMP.length?"🎉 全部結業":`第 ${Math.min(cur,CAMP.length)} 課・${esc((CAMP[Math.min(cur,CAMP.length)-1]||{}).name||"")}`}</span>`+
    CP_FLAGS.map(([x,y],i)=>{const n=i+1,[a,b]=cpPc(x,y),k=S[n]||0,st=done(n)?"done":open(n)?"cur":"lock";
      return`<button type="button" class="shp-spot cp-flag ${st}" id="cpF${n}" data-nolift="1" style="left:${a.toFixed(2)}%;top:${b.toFixed(2)}%" aria-label="${esc(`第 ${n} 課・${(CAMP[i]||{}).name||""}${st==="lock"?"（還沒開）":k?`（${k} 顆星）`:""}`)}"><b>${st==="lock"?"":CP_GLYPH[i]}</b>${k?`<i>${"<u></u>".repeat(Math.min(3,k))}</i>`:""}</button>`}).join("");
  v.insertBefore(P,pad);
  P.querySelectorAll(".cp-flag").forEach(b=>b.onclick=()=>{const n=+b.id.slice(3);vibrate(5);if(!open(n)){toast(`先完成第 ${n-1} 課「${(CAMP[n-2]||{}).name||""}」`);return}if(typeof jRunSet==="function")jRunSet(null,"jRunC");location.hash="#/camp/"+n});   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：新手訓練營用自己的 jRunC，不洗掉石桌往事的 jRun */
  if(typeof shpFit==="function")shpFit(v);
  try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(v,Object.assign({},SHW_PG0,cpCfg(Math.min(cur,12))),"camp:"+Math.min(cur,12))}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof Camp==="function"){const f0=Camp;Camp=function(v,n){const r=f0.apply(this,arguments);try{if(CAMP_MAP_ON&&!n)campMap(v)}catch(e){}return r}}
