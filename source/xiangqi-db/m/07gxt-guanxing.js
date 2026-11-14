/* ================= 🔭 觀星臺：黑洞玩法總入口（開發者 11/13 定案；前綴 gxt／GXT，全域先 grep 過沒撞名）=================
   路由 #/guanxing（02-shell）。入口兩個，都通往這一頁：
     ① 首頁橋右側一個「🔭 觀星臺」場景標籤（#hmGxt；包 07z 的 Home／hmwSet，不改 HM_SPOTS，原圖、iPad 直版 p34、橫版 l1610 各一組座標 GXT_HOME）；
     ② 星槎圖上一個「🌌 星淵」熱點（包 07gx 的 gxShipHs，跟「🌌 幻譜星門」同一個時機畫）。
   解鎖：第一次打贏黑洞（07bh bhGameEnd 記的 bhWin＞0，或塔防破過任何一關 bhtd.c；序局 bh:xu 不算）才出現；開發者模式（DEVMODE）一律看得到。網址直接進、還沒解鎖＝回首頁。
   場景圖 data/guanxing/：直幅 gx_tai（768×1376）、寬版 gx_tai_w（1376×768，iPad 橫向、電腦）；白天版 gx_tai_day／gx_tai_day_w（器物位置相同，座標共用）。
     日夜照人間時辰（07w8 clkIdx，頂欄時辰鐘同一個判斷）：卯時～申時（約 05:00～17:00）白天版，酉時～寅時夜景；頁面開著跨過時辰會自己換；白天圖載不到退回夜景（GXT_BAD）。
     直幅／寬版：可用寬 ÷ 可用高 ≥ GXT_LAND 而且畫面短邊 ≥ 600 用寬版（跟首頁寬版同一個短邊門檻；手機橫放照舊直幅＋07t3 側欄選單）；轉向、改視窗大小時原地換圖、換座標。
   標籤只放大字（記憶「場景標籤只放大字」），跟圖上器物對應：
     天頂墨色黑洞＝黑洞車輪戰（星軌未通）、星圖石碑＝十三星系（07gx gxMap）、青銅渾儀＝星淵遠征（07bht bhtdOpen 關卡卡片）、圭表＝今日異象（星軌未通）、石棋桌＝自由擺陣（星軌未通）、
     右側星空＝二十八宿（11/13 晚：花星芒點亮星圖，07dgl-stamina.js dglXiuSheet）。
     星軌未通＝標籤看得到但灰、帶鎖，點了跳一行「星軌未通，敬請期待」。
   出口照場景頁慣例走 07w9 圖上出口（EXITS "/guanxing"，右下石階）：從首頁來寫「🏘 回棋鎮」、從星槎來 07w9 exFix 自動改「↩ 回星槎」；寬版時這裡把出口挪到寬版圖的石階。
   從觀星臺開的塔防：sessionStorage gxtFrom，打完結果視窗的回航鍵改成「🔭 回觀星臺」（07bht bhtdResult 問 gxtBackLb、這裡包 bhReturn）；星槎偏航進黑洞（bhStart）會清掉記號。
   存檔鍵 gxtSeen（第一次進來以前首頁標籤是 .hot；05b JOURNEY_KEYS）。純計算 gxtWon／gxtKind／gxtDay／gxtSrc／gxtSpots 不碰 DOM，測試 xiangqi-lab/tools/test-guanxing.js 用 vm 跑 */
const GXT_ON=true,GXT_IMGV="1113";   /* 圖的版本：同檔名換圖時改掉，手機才會重抓 */
const GXT_LAND=1.5,GXT_LMIN=600;   /* 寬版圖 1.79：可用寬高比 1.43 以上 07t3 ttFill 才會補滿高度（左右裁一點），留一點餘量用 1.5 */
const GXT_OFF="星軌未通，敬請期待";
/* [id, 大字, 直幅左%, 上%, 寬版左%, 上%, 未通？]（量 gx_tai 768×1376、gx_tai_w 1376×768；標籤放在器物上方，不擋主體） */
const GXT_SPOTS=[
  ["gxtSimul","黑洞車輪戰",50,19,50,24,1],   /* 天頂黑洞下方的光柱 */
  ["gxtGx","十三星系",18,32.5,39.5,32,0],   /* 星圖石碑頂上 */
  ["gxtTd","星淵遠征",50,37,50.5,40.5,0],   /* 青銅渾儀頂上 */
  ["gxtOmen","今日異象",76,42,62,50,1],   /* 圭表石柱頂上（寬版在石柱右邊、圭面上方） */
  ["gxtFree","自由擺陣",31,70,44,71,1],   /* 石棋桌上方 */
  ["gxtSky","二十八宿",80,26,80,15,0]];   /* 開發者 11/13 晚：星芒點亮二十八宿星圖（07dgl dglXiuSheet）；直幅在右側山頭上方的星空、寬版在右上星空 */
const GXT_EXIT={p:[86,90],w:[68,86]};   /* 出口（右下石階）：直幅跟 07w9 EXITS 同一組 */
const GXT_HOME={"":[84,56],p34:[82,57],l1610:[75,69]};   /* 首頁橋右側（home 768×1376、home_p34、home_l1610 各量一次；經典世界、季節圖跟原圖同構圖） */
const GXT_BAD={};   /* 這次開 App 載不到的白天圖（p＝直幅、w＝寬版），退回夜景不再試 */
/* ---------- 走路角色（開發者 11/13：「像首頁或其他頁面可以控制角色移動的那種」；用 07w shwPage／shwMount，跟渡口、驛站同一套）----------
   座標表兩組（夜景、白天共用，器物位置一樣）：直幅量 park/guanxing/gx_tai.png（768×1376）、寬版量 gx_tai_w.png（1376×768）；N＝腳踩的青磚地面，E＝走的路
   （避開星圖碑座、渾儀龍柱、圭表與石圭、石桌和石鼓凳、燈桿那一圈欄杆，不出平台）。兩組節點名相同（各自多幾個轉角點），轉向換表時記住的位置照樣用。
   HS 停靠點都在器物前面（腳比器物低）：渾儀前、星圖碑前、圭表前、石桌左邊、平台中央面向天頂黑洞、石階口；未通的三個一樣走過去，到了才跳「星軌未通」。
   身高照「石桌直徑佔圖高」（兩張都約 0.155）換算：首頁石桌 0.078 配身高 0.05，這裡約 0.085～0.095。出口按鈕（07w9 .ex-spot）沒有 id，gxtExPos 補上 gxtExit */
const GXT_WALK_P={W:768,H:1376,el:38,home:"home",look0:[50,95],h:[.085,72,.0012],
  N:{home:[57,73],td:[51,69.5],m1:[38,69.5],simul:[34,66],gx:[19,63],c1:[12,67],free:[10,73],omen:[72,63.5],stair:[67,69.3]},
  E:"home-td home-m1 m1-simul m1-c1 td-simul simul-gx gx-c1 c1-free home-omen omen-stair home-stair",   /* 開發者 11/13 晚截圖：舊的 r1、stair 落在燈桿橫樑和燈籠上，角色像飄在半空；石階口改停在燈桿左邊的平台石板 */
  HS:{gxtTd:["td",50,50,"bow"],gxtGx:["gx",18,45,"wave"],gxtOmen:["omen",73,50,"bow"],gxtFree:["free",28,75,"wave"],gxtSimul:["simul",50,8,"cheer"],gxtExit:["stair",95,86,"wave"],gxtSky:["omen",80,20,"cheer"]}};
const GXT_WALK_W={W:1376,H:768,el:38,home:"home",look0:[50,95],h:[.09,72,.0012],
  N:{home:[44,71.5],td:[50.5,72.5],simul:[43,66.5],gx:[38.5,64.5],w1:[36,70],free:[37,76.5],e1:[55.5,69.5],omen:[57,62.5],stair:[54.5,71.5]},
  E:"home-td home-simul home-w1 simul-gx gx-w1 w1-free td-e1 e1-omen e1-stair",
  HS:{gxtTd:["td",50.5,55,"bow"],gxtGx:["gx",39.5,48,"wave"],gxtOmen:["omen",57,50,"bow"],gxtFree:["free",44,76,"wave"],gxtSimul:["simul",50,12,"cheer"],gxtExit:["stair",68,88,"wave"],gxtSky:["omen",80,12,"cheer"]}};
const gxtWalkCfg=k=>Object.assign({},typeof SHW_PG0!=="undefined"?SHW_PG0:{},k?GXT_WALK_W:GXT_WALK_P);
/* 掛上走路角色；直幅／寬版換了＝收掉舊的（07w 的框一拿掉，畫面迴圈、3D 畫布自己收）、用新的那組重掛（跟 07z hmwWalk 同一個做法） */
function gxtWalk(P,k){if(typeof shwPage!=="function"||typeof SHIP_WALK_ON==="undefined"||!SHIP_WALK_ON)return;const V=P.parentNode;if(!V)return;
  if(P.dataset.shw){if((P._gxtW||"")===k)return;P.querySelectorAll(":scope>.shw,:scope>.shw-me,:scope>.shw-hint,:scope>.shw-say,:scope>.shw-menu").forEach(e=>e.remove());delete P.dataset.shw;P.classList.remove("shw-iso")}
  P._gxtW=k;try{shwPage(V,gxtWalkCfg(k),"gxt")}catch(e){}}
/* 解鎖：打贏過黑洞（w＝bhWin 次數；P＝塔防進度 bhtd，c＝破過的關） */
const gxtWon=(w,P)=>(+w||0)>0||!!(P&&P.c&&typeof P.c==="object"&&Object.keys(P.c).length);
function gxtOpen(){if(!GXT_ON)return false;try{if(typeof DEVMODE==="function"&&DEVMODE())return true}catch(e){}
  try{return gxtWon(store.get("bhWin",0),typeof bhtdProg==="function"?bhtdProg():store.get("bhtd",null))}catch(e){return false}}
/* 直幅 "" 或寬版 "w"：W 可用寬、av 可用高、vw／vh 畫面寬高 */
function gxtKind(W,av,vw,vh){if(!(W>0&&av>=120))return"";return W/av>=GXT_LAND&&Math.min(vw,vh)>=GXT_LMIN?"w":""}
/* 白天？卯（05–07）～申（15–17）；時辰序號照 07w8 clkIdx（子＝0：23–01） */
function gxtDay(d){d=d||new Date();let i;try{i=typeof clkIdx==="function"?clkIdx(d):NaN}catch(e){i=NaN}if(!(i>=0))i=Math.floor(((d.getHours()+1)%24)/2);return i>=3&&i<=8}
const gxtSrc=(k,day)=>`data/guanxing/gx_tai${day&&!GXT_BAD[k?"w":"p"]?"_day":""}${k?"_w":""}.webp?v=${GXT_IMGV}`;
/* 這一版的標籤座標 [id,左,上,大字,未通] */
const gxtSpots=k=>GXT_SPOTS.map(s=>[s[0],k?s[4]:s[2],k?s[5]:s[3],s[1],!!s[6]]);
function gxtMeasure(V){const pb=parseFloat(getComputedStyle(V).paddingBottom)||0;return{W:V.clientWidth,av:V.clientHeight-pb,vw:V.clientWidth,vh:document.documentElement.clientHeight||innerHeight}}
const gxtPick=V=>{try{const m=gxtMeasure(V);return gxtKind(m.W,m.av,m.vw,m.vh)}catch(e){return""}};
function gxtCss(){if(document.getElementById("gxtCss"))return;const s=document.createElement("style");s.id="gxtCss";s.textContent=`
.gxt-page{margin:0 0 6px}.gxt-page .shp-spot{max-width:46%;padding:4px 11px;z-index:3}.gxt-page .shp-spot b{white-space:nowrap;font-size:15px;letter-spacing:.06em}
.gxt-page .shp-spot.lock{border-color:#8a8476;background:rgba(28,26,30,.68);box-shadow:none}.gxt-page .shp-spot.lock b{color:#c9c2b2;font-size:14px}`;document.head.append(s)}
/* 換圖（日夜、直幅／寬版）：先載好再換，連標籤座標一起換；白天圖載不到＝記下來退回夜景 */
function gxtSet(P,k,day){const im=P.querySelector(":scope>img");if(!im)return;const src=gxtSrc(k,day);
  const apply=()=>{if(!P.isConnected)return;P.dataset.gxt=k;P.dataset.day=day&&!GXT_BAD[k?"w":"p"]?"1":"";
    for(const[id,x,y]of gxtSpots(k)){const b=P.querySelector("#"+id);if(!b)continue;b.style.left=x+"%";b.style.top=y+"%";delete b.dataset.ttL;b.style.marginLeft=""}   /* ttL 是 07t3 記的原位，換座標要清掉 */
    gxtExPos(P);if(im.getAttribute("src")!==src)im.src=src;gxtWalk(P,k)};
  if(im.getAttribute("src")===src&&P.dataset.gxt===k)return;const pre=new Image();pre.onload=apply;pre.onerror=()=>{if(day){GXT_BAD[k?"w":"p"]=1;gxtSet(P,k,false)}};pre.src=src}
/* 07w9 放的出口：直幅照 EXITS，寬版挪到寬版圖的石階（清掉 07w9 推移記的原位，再請 exIn 推回看得到的範圍） */
function gxtExPos(P){const s=P.querySelector(".ex-spot");if(!s)return;if(!s.id)s.id="gxtExit";const k=P.dataset.gxt||"";   /* id＝走路角色的入口代號（HS.gxtExit） */if(s.dataset.gxtK===k)return;const E=GXT_EXIT[k?"w":"p"];
  delete s.dataset.exL;delete s.dataset.exT;delete s.dataset.ttL;s.style.left=E[0]+"%";s.style.top=E[1]+"%";s.style.marginLeft="";s.dataset.gxtK=k;try{if(typeof exIn==="function")exIn(s)}catch(e){}}
/* 11/14：定軌力用完＝黑洞入口關著（07dgl dglBhLock；設定關掉平日體力的人不受影響），渾儀、星槎「星淵」都先問 */
const gxtBhLock=()=>{try{return typeof dglBhLock==="function"&&dglBhLock()}catch(e){return false}};
const gxtBhMsg=()=>{try{return typeof dglBhLockMsg==="function"?dglBhLockMsg():"定軌力用完了，黑洞入口先關著"}catch(e){return"定軌力用完了，黑洞入口先關著"}};
function gxtTd(){if(gxtBhLock()){toast("🌫 "+gxtBhMsg());return}try{sessionStorage.setItem("gxtFrom","1")}catch(e){}if(typeof bhtdOpen==="function")bhtdOpen();else toast("🌌 "+GXT_OFF)}
const GXT_ACT={gxtTd:gxtTd,gxtGx:()=>{if(typeof gxMap==="function")gxMap();else toast("🌌 "+GXT_OFF)},gxtSky:()=>{if(typeof dglXiuSheet==="function")dglXiuSheet();else toast("🌌 "+GXT_OFF)}};
function GxtPage(v){setTop("🔭 觀星臺","#/");setTabs(true,"#/");v.className="view";
  if(!gxtOpen()){toast("🔭 觀星臺還沒出現");navReplace("#/");return{}}
  gxtCss();try{store.set("gxtSeen",1)}catch(e){}
  const k=gxtPick(v),day=gxtDay(),L=gxtSpots(k),O=typeof hmFocusOrder==="function"?hmFocusOrder(L):L,P=document.createElement("div");   /* 旁白、Tab 順序＝由上到下、同一列由左到右（07z hmFocusOrder） */
  P.className="shp-page cq gxt-page";P.dataset.gxt=k;P.dataset.day=day&&!GXT_BAD[k?"w":"p"]?"1":"";
  P.innerHTML=`<img src="${gxtSrc(k,day)}" alt="觀星臺：天頂一個墨色黑洞，臺上有星圖石碑、青銅渾儀、圭表和石棋桌">`+
    O.map(([id,x,y,t,off])=>`<button type="button" class="shp-spot${off?" lock":""}" id="${id}" style="left:${x}%;top:${y}%" aria-label="${esc(t+(off?"，星軌未通":""))}"><b>${off?"🔒 ":""}${esc(t)}</b></button>`).join("");
  v.append(P);
  const im=P.querySelector(":scope>img");
  im.onerror=()=>{if(P.dataset.day==="1"){const kk=P.dataset.gxt||"";GXT_BAD[kk?"w":"p"]=1;P.dataset.day="";im.src=gxtSrc(kk,false)}};   /* 白天圖還沒上架＝夜景 */
  im.addEventListener("load",()=>{if(!P.isConnected)return;try{if(typeof ttFill==="function")ttFill()}catch(e){}try{if(typeof spfSoon==="function")spfSoon(0)}catch(e){}try{if(typeof r07HitSoon==="function")r07HitSoon()}catch(e){}});
  for(const s of GXT_SPOTS){const b=P.querySelector("#"+s[0]);if(!b)continue;b.onclick=e=>{e.stopPropagation();vibrate(5);if(s[6]){toast("🌌 "+GXT_OFF);return}const f=GXT_ACT[s[0]];if(f)f()}}
  {const b=P.querySelector("#gxtTd");if(b&&gxtBhLock()){b.classList.add("lock");b.setAttribute("aria-label","星淵遠征，定軌力用完，暫時關閉");const t=b.querySelector("b");if(t)t.textContent="🔒 星淵遠征"}}   /* 11/14：定軌力用完時渾儀灰掉、帶鎖（點了跳一句說明） */
  /* 07w9 的出口晚一點才放進來：放進來就照這一版擺好 */
  try{const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}gxtExPos(P)});mo.observe(P,{childList:true})}catch(e){}
  /* 轉向、改視窗大小：跨過門檻就換直幅／寬版；每分鐘看一次時辰，跨過卯時、酉時就換日夜 */
  {let t=0;const rs=()=>{if(!P.isConnected){removeEventListener("resize",rs);return}clearTimeout(t);t=setTimeout(()=>{if(!P.isConnected)return;const k2=gxtPick(v);if(k2!==(P.dataset.gxt||""))gxtSet(P,k2,gxtDay())},250)};addEventListener("resize",rs)}
  {const tm=setInterval(()=>{if(!P.isConnected){clearInterval(tm);return}const d=gxtDay();if(d!==(P.dataset.day==="1")&&!(d&&GXT_BAD[(P.dataset.gxt||"")?"w":"p"]))gxtSet(P,P.dataset.gxt||"",d)},60000)}
  if(typeof shpFit==="function")shpFit(v);
  gxtWalk(P,k);   /* 走路角色（3D 載不到、減少動態時 07w 不攔點選，入口照舊直接開；有角色時小帥照 WALK_BOT_MERGE 不另外出現） */
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}
  return{}}
/* ---------- 首頁橋右側「🔭 觀星臺」 ---------- */
function gxtHomePos(P){const b=P&&P.querySelector("#hmGxt");if(!b)return;const c=GXT_HOME[P.dataset.hmw||""]||GXT_HOME[""];b.style.left=c[0]+"%";b.style.top=c[1]+"%";delete b.dataset.ttL;b.style.marginLeft=""}
/* 開發者 11/13：首頁的觀星臺入口只在千秋時光之苑（經典世界，hbIsCl）才有，其他朝代的棋鎮首頁沒有；星槎的「星淵」熱點不分朝代照舊 */
function gxtHomeSpot(v){if(!gxtOpen()||!(typeof hbIsCl==="function"&&hbIsCl()))return;const P=v.querySelector(".home-page");if(!P||P.querySelector("#hmGxt"))return;
  const k=P.dataset.hmw||"",c=GXT_HOME[k]||GXT_HOME[""],b=document.createElement("button");b.type="button";b.id="hmGxt";b.className="shp-spot"+(store.get("gxtSeen",0)?"":" hot");
  b.style.left=c[0]+"%";b.style.top=c[1]+"%";b.setAttribute("aria-label","觀星臺");b.innerHTML="<b>🔭 觀星臺</b>";
  b.onclick=e=>{e.stopPropagation();vibrate(5);location.hash="#/guanxing"};
  /* 第 14 輪焦點順序：照 hmFocusOrder 插在對的位置（底部那一條永遠最後） */
  let ref=null;try{const S=(typeof hmwSpots==="function"?hmwSpots(k):[]).concat([["hmGxt",c[0],c[1]]]),ord=hmFocusOrder(S).map(s=>s[0]),i=ord.indexOf("hmGxt");for(let j=i+1;j<ord.length&&!ref;j++)ref=P.querySelector(":scope>#"+ord[j])}catch(e){}
  if(!ref){const sp=P.querySelectorAll(":scope>.shp-spot");ref=sp.length?sp[sp.length-1].nextSibling:P.querySelector(":scope>.hm-go-bar")}
  P.insertBefore(b,ref||null);try{if(typeof hmClamp==="function")hmClamp(P)}catch(e){}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(!hub)gxtHomeSpot(v)}catch(e){}return r}}
if(typeof hmwSet==="function"){const f1=hmwSet;hmwSet=function(P){const r=f1.apply(this,arguments);try{gxtHomePos(P)}catch(e){}return r}}   /* 首頁原地換寬版圖時跟著換座標 */
/* ---------- 星槎「🌌 星淵」 ---------- */
function gxtShipHs(v){if(!gxtOpen())return;const hl=v.querySelector(".shp-hl");if(!hl||hl.querySelector("[data-gxths]"))return;const b=document.createElement("button");b.className="shp-hs";b.type="button";b.dataset.gxths="1";
  b.style.cssText="left:14%;top:22%";b.textContent="🌌 星淵";b.setAttribute("aria-label","星淵：前往觀星臺");b.onclick=e=>{e.stopPropagation();vibrate(5);if(gxtBhLock()){toast("🌫 "+gxtBhMsg());return}location.hash="#/guanxing"};hl.append(b)}   /* 左上星河、幻譜星門（30%,12%）左下方、千秋石枰（13%,37%）上方 */
if(typeof gxShipHs==="function"){const f2=gxShipHs;gxShipHs=function(v){const r=f2.apply(this,arguments);try{gxtShipHs(v)}catch(e){}return r}}
/* ---------- 從觀星臺開的塔防：打完回觀星臺 ---------- */
function gxtFromTd(){try{return sessionStorage.getItem("gxtFrom")==="1"}catch(e){return false}}
function gxtBackLb(){return gxtFromTd()?"🔭 回觀星臺":"⛵ 星槎回航"}
if(typeof bhReturn==="function"){const f3=bhReturn;bhReturn=function(){if(!gxtFromTd())return f3.apply(this,arguments);try{sessionStorage.removeItem("gxtFrom")}catch(e){}store.set("bhRet",null);location.hash="#/guanxing"}}
if(typeof bhStart==="function"){const f4=bhStart;bhStart=function(){try{sessionStorage.removeItem("gxtFrom")}catch(e){}return f4.apply(this,arguments)}}   /* 星槎偏航進黑洞＝照舊回星槎 */
