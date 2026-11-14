/* ================= 🏮 西市：首頁橋左邊的生活場景（開發者 11/13；文案照 story/西市文案定稿草案_1113.md，第五節 18 項全照推薦；前綴 xsm／XSM，11/13 grep 過沒撞名：xm 已被 01-board 的混音器用掉）=================
   路由 #/ximarket（西市外景）、#/ximarket/tea（聽雨茶坊內景）、#/ximarket/dark（茶坊的臺灣暗棋，07xsd）（02-shell）。
   入口：首頁橋左邊一個「🏮 西市」場景標籤（#hmXsm；跟 07gxt 觀星臺一樣包 07z 的 Home／hmwSet，不改 HM_SPOTS、不動 07y；原圖、iPad 直版 p34、橫版 l1610 各一組座標 XSM_HOME，避開左岸告示牌）。
     只在千秋時光之苑（經典世界 hbIsCl）出現（第 1 項 A）；領過七星授印禮（07mnq 存檔 "mnq".gift.a1）才出現（第 2 項 B）；開發者模式一律看得到。網址直接進、還沒解鎖＝回首頁。
     第一次進來以前首頁標籤是 .hot（第 17 項；之後「有禮可領、有人來訪」也要亮，等那兩個玩法做好再接，不加紅點數字）。
   場景圖 data/ximarket/（park/ximarket 轉來，process_art.py MAPS["ximarket"]）：外景白天 xm_day、夜景 xm_night（768×1376，器物位置相同，座標共用）；茶坊內景 xm_tea。只有直幅。
     日夜照人間時辰（07w8 clkIdx，頂欄時辰鐘同一個判斷）：卯時～申時白天，酉時～寅時夜景（第 3 項 A）；頁面開著跨過時辰會自己換；一張載不到就換另一張（XSM_BAD）。
     茶坊窗外固定下雨（第 18 項 A，程式畫的雨；減少動態時不動）；茶坊只有一張圖，夜裡蓋一層暗藍（日夜跟著西市換）。
   標籤只放大字、不放圖示（第 5 項 A：寫玩法名）：領禮物＝櫃坊、七星來訪＝老槐樹下、找棋子＝棋具攤、暗棋＝聽雨茶坊、聽曲＝樂棚（第 10 項 A）。
     這一版只做場景頁：「暗棋」這一攤可以進茶坊看內景；其他攤灰色帶鎖，點了跳「還沒開張，敬請期待。」（第 12 項 A）。
     11/14 開發者：茶坊中間的暗棋桌第一個開張，點了到 #/ximarket/dark 玩臺灣暗棋（07xsd-xsmdark.js，對電腦）。
   第一次進來跳介紹卡（定位句＋介紹，第一節）。出口照 07w9 圖上出口：外景＝市門「🏘 回棋鎮」，茶坊＝「↩ 回西市」（07w9 EXITS）。
   走路角色：外景接 07w shwPage（座標表 XSM_WALK，量 park/ximarket/xm_day.png）；茶坊內景不放走路角色。
   存檔鍵 xsmSeen（05b JOURNEY_KEYS）。平日體力 07dgl：#/ximarket 不在星槎、也不在「不算」那組，照預設算人間。
   純計算 xsmGot／xsmDay／xsmPickDay／xsmSrc／xsmSpots 不碰 DOM，測試 xiangqi-lab/tools/test-ximarket.js 用 vm 跑。
   還沒做：配樂（第 13 項：「西市燈影」「聽雨暗棋」還沒有檔）、各攤玩法、考究說明卡（出處待史學顧問核）。 */
const XSM_ON=true,XSM_IMGV="1113";   /* 圖的版本：同檔名換圖時改掉，手機才會重抓 */
const XSM_OFF="還沒開張，敬請期待。";
const XSM_TX={pos:"各朝的貨色，都在這裡湊成一市。",intro:"西市，原本是城西那座市集的名字。漢朝、唐朝的長安城都有。千秋時光之苑不屬於任何朝代，各朝的貨色就都擺到這裡來了。"};
/* [id, 大字, 左%, 上%, 還沒開張？]（量 xm_day 768×1376；標籤放在攤位上方，不擋主體） */
const XSM_SPOTS=[
  ["xsmGift","領禮物",17,39,1],   /* 左邊櫃坊：櫃台上的布簾 */
  ["xsmMusic","聽曲",64,47.5,1],   /* 樂棚：掛琵琶、拍板的木架上方 */
  ["xsmTea","暗棋",86,44,0],   /* 右邊聽雨茶坊：竹簾 */
  ["xsmChess","找棋子",38,61,1],   /* 左下棋具攤：棋盒、棋子袋那張桌子上方的簷下 */
  ["xsmVisit","七星來訪",81,74,1]];   /* 市門右邊的老槐樹：樹下石墩、木凳上方 */
const XSM_TEA_SPOTS=[["xsmDark","暗棋",50,44,0]];   /* 茶坊中間那張暗棋桌（量 xm_tea 768×1376）；11/14 開張：點了開一盤臺灣暗棋（07xsd-xsmdark.js） */
const XSM_HOME={"":[16,59],p34:[16,60],l1610:[19,71]};   /* 首頁橋左邊（跟觀星臺 GXT_HOME 左右對稱，再往下挪開左岸告示牌；原圖量 home_classic 768×1376，p34 量 1536×2048，l1610 量 2560×1600） */
const XSM_RAIN=[[53,12,60,31],[69.5,14,82,36]];   /* 茶坊窗外看得到雨的兩塊（左、上、右、下 %） */
const XSM_BAD={};   /* 這次開 App 載不到的圖（d＝白天、n＝夜景），換另一張不再試 */
/* ---------- 走路角色（外景）：N＝腳踩的青石路面，E＝走的路（避開櫃坊、中間鋪子、左下棋具攤的屋子和桌子、樂棚木架、茶坊、市門兩根柱子的腳、木桶、老槐樹、石墩木凳）。
   home＝市門裡面；市門外的石板路通到老槐樹下（七星來訪）。身高照茶坊門高約圖高 14% 換算 ---------- */
const XSM_WALK={W:768,H:1376,el:38,home:"home",look0:[50,95],h:[.09,60,.0006],
  N:{home:[52,80],c1:[55,72.5],chess:[42,76],cross:[55,61],n1:[56,52],counter:[40,49.2],music:[64,63],tea:[75,59.5],gate:[64,86.5],g2:[69,92.5],tree:[79,90.5]},
  E:"home-chess home-c1 c1-cross cross-n1 n1-counter cross-music music-tea home-gate gate-g2 g2-tree",
  HS:{xsmGift:["counter",18,45,"bow"],xsmChess:["chess",36,66,"bow"],xsmMusic:["music",65,54,"wave"],xsmTea:["tea",86,47,"bow"],xsmVisit:["tree",88,80,"wave"],xsmExit:["gate",72,97,"wave"]}};
const xsmWalkCfg=()=>Object.assign({},typeof SHW_PG0!=="undefined"?SHW_PG0:{},XSM_WALK);
/* ---------- 純計算 ---------- */
/* 解鎖：領過七星授印禮（M＝07mnq 的存檔 "mnq"） */
const xsmGot=M=>!!(M&&typeof M==="object"&&M.gift&&typeof M.gift==="object"&&M.gift.a1);
function xsmOpen(){if(!XSM_ON)return false;try{if(typeof DEVMODE==="function"&&DEVMODE())return true}catch(e){}
  try{return xsmGot(store.get("mnq",null))}catch(e){return false}}
/* 白天？卯（05–07）～申（15–17）；時辰序號照 07w8 clkIdx（子＝0：23–01） */
function xsmDay(d){d=d||new Date();let i;try{i=typeof clkIdx==="function"?clkIdx(d):NaN}catch(e){i=NaN}if(!(i>=0))i=Math.floor(((d.getHours()+1)%24)/2);return i>=3&&i<=8}
/* 想要白天／夜景 → 實際用哪一張（那張載不到就換另一張；兩張都壞就照原本那張） */
const xsmPickDay=day=>day?!XSM_BAD.d:(!!XSM_BAD.n&&!XSM_BAD.d);
const xsmSrc=(day,tea)=>tea?`data/ximarket/xm_tea.webp?v=${XSM_IMGV}`:`data/ximarket/xm_${xsmPickDay(day)?"day":"night"}.webp?v=${XSM_IMGV}`;
/* 標籤 [id,左,上,大字,還沒開張] */
const xsmSpots=L=>(L||XSM_SPOTS).map(s=>[s[0],s[2],s[3],s[1],!!s[4]]);
/* ---------- 畫面 ---------- */
function xsmCss(){if(document.getElementById("xsmCss"))return;const s=document.createElement("style");s.id="xsmCss";s.textContent=`
.xsm-page{margin:0 0 6px}.xsm-page .shp-spot{max-width:46%;padding:4px 11px;z-index:3}.xsm-page .shp-spot b{white-space:nowrap;font-size:15px;letter-spacing:.06em}
.xsm-page .shp-spot.lock{border-color:#8a8476;background:rgba(28,26,30,.68);box-shadow:none}.xsm-page .shp-spot.lock b{color:#c9c2b2;font-size:14px}
.xsm-tea .xsm-rain{position:absolute;z-index:1;pointer-events:none;overflow:hidden;opacity:.6;background-image:repeating-linear-gradient(100deg,rgba(255,255,255,0) 0 9px,rgba(232,240,250,.6) 9px 10px,rgba(255,255,255,0) 10px 23px);background-size:46px 58px;animation:xsmRain .55s linear infinite}
@keyframes xsmRain{to{background-position:-10px 58px}}
.xsm-tea::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:rgba(16,24,58,.4);mix-blend-mode:multiply;opacity:0;transition:opacity .6s}.xsm-tea[data-day=""]::after{opacity:1}
@media (prefers-reduced-motion:reduce){.xsm-tea .xsm-rain{animation:none}}`;document.head.append(s)}
/* 標籤按鈕（旁白、Tab 順序＝由上到下、同一列由左到右：07z hmFocusOrder） */
function xsmBtns(L){const S=xsmSpots(L),O=typeof hmFocusOrder==="function"?hmFocusOrder(S):S;
  return O.map(([id,x,y,t,off])=>`<button type="button" class="shp-spot${off?" lock":""}" id="${id}" style="left:${x}%;top:${y}%" aria-label="${esc(t+(off?"，還沒開張":""))}"><b>${off?"🔒 ":""}${esc(t)}</b></button>`).join("")}
const XSM_ACT={xsmTea:()=>{location.hash="#/ximarket/tea"},xsmDark:()=>{location.hash="#/ximarket/dark"}};
function xsmBind(P,L){for(const s of L){const b=P.querySelector("#"+s[0]);if(!b)continue;b.onclick=e=>{e.stopPropagation();vibrate(5);if(s[4]){toast("🏮 "+XSM_OFF);return}const f=XSM_ACT[s[0]];if(f)f()}}}
/* 圖載好以後：07t3 補滿高度、07sp 標籤推回畫面內、R07 點選範圍；兩指縮放 */
function xsmAfter(v,P){const im=P.querySelector(":scope>img");
  im.addEventListener("load",()=>{if(!P.isConnected)return;try{if(typeof ttFill==="function")ttFill()}catch(e){}try{if(typeof spfSoon==="function")spfSoon(0)}catch(e){}try{if(typeof r07HitSoon==="function")r07HitSoon()}catch(e){}});
  if(typeof shpFit==="function")shpFit(v);try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
/* 換日夜：先載好再換；載不到記下來（下次 xsmSrc 自己換另一張） */
function xsmSwap(P,day){const im=P.querySelector(":scope>img");if(!im)return;const nd=xsmPickDay(day),src=xsmSrc(nd);if(im.getAttribute("src")===src)return;
  const pre=new Image();pre.onload=()=>{if(!P.isConnected)return;P.dataset.day=nd?"1":"";im.src=src};pre.onerror=()=>{XSM_BAD[nd?"d":"n"]=1};pre.src=src}
function xsmIntro(){modal(`<h3>🏮 西市</h3><p><b>${esc(XSM_TX.pos)}</b></p><p>${esc(XSM_TX.intro)}</p>`,[["逛逛西市",null]])}
function xsmWalk(v){if(typeof shwPage!=="function"||typeof SHIP_WALK_ON==="undefined"||!SHIP_WALK_ON)return;try{shwPage(v,xsmWalkCfg(),"xsm")}catch(e){}}
function XsmPage(v,sub){if(sub==="tea")return xsmTea(v);if(sub==="dark"&&typeof xsdPage==="function")return xsdPage(v);
  setTop("🏮 西市","#/");setTabs(true,"#/");v.className="view";
  if(!xsmOpen()){toast("🏮 西市還沒開市");navReplace("#/");return{}}
  xsmCss();let first=false;try{first=!store.get("xsmSeen",0);store.set("xsmSeen",1)}catch(e){}
  const day=xsmDay(),nd=xsmPickDay(day),P=document.createElement("div");P.className="shp-page cq xsm-page";P.dataset.day=nd?"1":"";
  P.innerHTML=`<img src="${xsmSrc(nd)}" alt="西市：市門、夯土市牆、青石路，十字路口四角是櫃坊、棋具攤、樂棚和茶坊，遠處有市樓、水池和柳樹">`+xsmBtns(XSM_SPOTS);
  v.append(P);xsmBind(P,XSM_SPOTS);
  const im=P.querySelector(":scope>img");
  im.onerror=()=>{const sh=P.dataset.day==="1";XSM_BAD[sh?"d":"n"]=1;const n2=xsmPickDay(sh);if(n2!==sh){P.dataset.day=n2?"1":"";im.src=xsmSrc(n2)}};
  /* 07w9 的出口晚一點才放進來：補 id（走路角色的入口代號 HS.xsmExit） */
  try{const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}const s=P.querySelector(".ex-spot");if(s&&!s.id)s.id="xsmExit"});mo.observe(P,{childList:true})}catch(e){}
  /* 每分鐘看一次時辰，跨過卯時、酉時就換日夜 */
  {const tm=setInterval(()=>{if(!P.isConnected){clearInterval(tm);return}const d=xsmPickDay(xsmDay());if(d!==(P.dataset.day==="1"))xsmSwap(P,d)},60000)}
  xsmAfter(v,P);
  xsmWalk(v);   /* 走路角色（3D 載不到、減少動態時 07w 不攔點選，入口照舊直接開） */
  if(first)setTimeout(()=>{if(P.isConnected)xsmIntro()},450);
  return{}}
function xsmTea(v){setTop("🍵 聽雨茶坊","#/ximarket");setTabs(true,"#/");v.className="view";
  if(!xsmOpen()){toast("🏮 西市還沒開市");navReplace("#/");return{}}
  xsmCss();const P=document.createElement("div");P.className="shp-page cq xsm-page xsm-tea";P.dataset.day=xsmDay()?"1":"";
  P.innerHTML=`<img src="${xsmSrc(false,1)}" alt="聽雨茶坊：方桌、條凳、靠背椅，窗外下著雨，中間一張暗棋桌">`+
    XSM_RAIN.map(r=>`<i class="xsm-rain" style="left:${r[0]}%;top:${r[1]}%;width:${r[2]-r[0]}%;height:${r[3]-r[1]}%"></i>`).join("")+xsmBtns(XSM_TEA_SPOTS);
  v.append(P);xsmBind(P,XSM_TEA_SPOTS);
  {const tm=setInterval(()=>{if(!P.isConnected){clearInterval(tm);return}const d=xsmDay()?"1":"";if(d!==P.dataset.day)P.dataset.day=d},60000)}
  xsmAfter(v,P);
  return{}}
/* ---------- 首頁橋左邊「🏮 西市」 ---------- */
function xsmHomePos(P){const b=P&&P.querySelector("#hmXsm");if(!b)return;const c=XSM_HOME[P.dataset.hmw||""]||XSM_HOME[""];b.style.left=c[0]+"%";b.style.top=c[1]+"%";delete b.dataset.ttL;b.style.marginLeft=""}
function xsmHomeSpot(v){if(!xsmOpen()||!(typeof hbIsCl==="function"&&hbIsCl()))return;const P=v.querySelector(".home-page");if(!P||P.querySelector("#hmXsm"))return;
  const k=P.dataset.hmw||"",c=XSM_HOME[k]||XSM_HOME[""],b=document.createElement("button");b.type="button";b.id="hmXsm";b.className="shp-spot"+(store.get("xsmSeen",0)?"":" hot");
  b.style.left=c[0]+"%";b.style.top=c[1]+"%";b.setAttribute("aria-label","西市");b.innerHTML="<b>🏮 西市</b>";
  b.onclick=e=>{e.stopPropagation();vibrate(5);location.hash="#/ximarket"};
  /* 焦點順序：照 hmFocusOrder 插在對的位置（觀星臺已經放好就一起算；底部那一條永遠最後） */
  let ref=null;try{const G=P.querySelector("#hmGxt")&&typeof GXT_HOME!=="undefined"?[["hmGxt"].concat(GXT_HOME[k]||GXT_HOME[""])]:[];
    const S=(typeof hmwSpots==="function"?hmwSpots(k):[]).concat(G,[["hmXsm",c[0],c[1]]]),ord=hmFocusOrder(S).map(s=>s[0]),i=ord.indexOf("hmXsm");for(let j=i+1;j<ord.length&&!ref;j++)ref=P.querySelector(":scope>#"+ord[j])}catch(e){}
  if(!ref){const sp=P.querySelectorAll(":scope>.shp-spot");ref=sp.length?sp[sp.length-1].nextSibling:P.querySelector(":scope>.hm-go-bar")}
  P.insertBefore(b,ref||null);try{if(typeof hmClamp==="function")hmClamp(P)}catch(e){}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(!hub)xsmHomeSpot(v)}catch(e){}return r}}
if(typeof hmwSet==="function"){const f1=hmwSet;hmwSet=function(P){const r=f1.apply(this,arguments);try{xsmHomePos(P)}catch(e){}return r}}   /* 首頁原地換寬版圖時跟著換座標 */
