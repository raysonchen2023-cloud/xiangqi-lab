/* ================= 🔭 觀星臺：黑洞玩法總入口（開發者 11/13 定案；前綴 gxt／GXT，全域先 grep 過沒撞名）=================
   路由 #/guanxing（02-shell）。入口兩個，都通往這一頁：
     ① 首頁橋右側一個「🔭 觀星臺」場景標籤（#hmGxt；包 07z 的 Home／hmwSet，不改 HM_SPOTS，原圖、iPad 直版 p34、橫版 l1610 各一組座標 GXT_HOME）；
     ② 星槎圖上一個「🌌 星淵」熱點（包 07gx 的 gxShipHs，跟「🌌 幻譜星門」同一個時機畫）。
   解鎖：第一次打贏黑洞（07bh bhGameEnd 記的 bhWin＞0，或塔防破過任何一關 bhtd.c；序局 bh:xu 不算）才出現；開發者模式（DEVMODE）一律看得到。網址直接進、還沒解鎖＝回首頁。
   場景圖 data/guanxing/：直幅 gx_tai（768×1376）、寬版 gx_tai_w（1376×768，iPad 橫向、電腦）；白天版 gx_tai_day／gx_tai_day_w（器物位置相同，座標共用）。
     日夜照人間時辰（07w8 clkIdx，頂欄時辰鐘同一個判斷）：卯時～申時（約 05:00～17:00）白天版，酉時～寅時夜景；頁面開著跨過時辰會自己換；白天圖載不到退回夜景（GXT_BAD）。
     直幅／寬版：可用寬 ÷ 可用高 ≥ GXT_LAND 而且畫面短邊 ≥ 600 用寬版（跟首頁寬版同一個短邊門檻；手機橫放照舊直幅＋07t3 側欄選單）；轉向、改視窗大小時原地換圖、換座標。
   標籤只放大字（記憶「場景標籤只放大字」），跟圖上器物對應：
     天頂墨色黑洞＝黑洞車輪戰（11/16 開張：07bhw whlOpen）、星圖石碑＝十三星系（07gx gxMap）、青銅渾儀＝星淵遠征（07bht bhtdOpen 關卡卡片）、圭表＝今日異象、石棋桌＝自由擺陣（11/16 開發者：兩個都開張，07gxd-daily.js gxdOmen／gxdFree）、
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
  ["gxtSimul","天頂黑洞",50,19,50,24,0],   /* 11/16 黑洞新規則：車輪戰拿掉，天頂黑洞改通往星門圍城 */   /* 天頂黑洞下方的光柱；11/16 開發者「車輪戰和星門圍城也都能上線」（選單：解鎖，點了直接開車輪戰 07bhw whlOpen） */
  ["gxtGx","十三星系",18,32.5,39.5,32,0],   /* 星圖石碑頂上 */
  /* 11/16 開發者（觀星臺截圖圈天頂黑洞與渾儀）「紅圈入口內容一樣 請修正和優化」，選單「只留天頂黑洞」：渾儀上的「星門圍城」標籤拿掉（gxtTd 留著，舊連結叫得到） */
  ["gxtOmen","今日異象",76,42,62,50,0],   /* 圭表石柱頂上（寬版在石柱右邊、圭面上方）；11/16 開發者：開張（07gxd gxdOmen，每天所有人同一盤變體陣容） */
  ["gxtFree","自由擺陣",31,70,44,71,0],   /* 石棋桌上方；11/16 開發者：開張（07gxd gxdFree，點數預算自己擺 16 子跟電腦下） */
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
  HS:{gxtGx:["gx",18,45,"wave"],gxtOmen:["omen",73,50,"bow"],gxtFree:["free",28,75,"wave"],gxtSimul:["simul",50,8,"cheer"],gxtExit:["stair",95,86,"wave"],gxtSky:["omen",80,20,"cheer"]}};
const GXT_WALK_W={W:1376,H:768,el:38,home:"home",look0:[50,95],h:[.09,72,.0012],
  N:{home:[44,71.5],td:[50.5,72.5],simul:[43,66.5],gx:[38.5,64.5],w1:[36,70],free:[37,76.5],e1:[55.5,69.5],omen:[57,62.5],stair:[54.5,71.5]},
  E:"home-td home-simul home-w1 simul-gx gx-w1 w1-free td-e1 e1-omen e1-stair",
  HS:{gxtGx:["gx",39.5,48,"wave"],gxtOmen:["omen",57,50,"bow"],gxtFree:["free",44,76,"wave"],gxtSimul:["simul",50,12,"cheer"],gxtExit:["stair",68,88,"wave"],gxtSky:["omen",80,12,"cheer"]}};
const gxtWalkCfg=k=>Object.assign({},typeof SHW_PG0!=="undefined"?SHW_PG0:{},k?GXT_WALK_W:GXT_WALK_P);
/* 掛上走路角色；直幅／寬版換了＝收掉舊的（07w 的框一拿掉，畫面迴圈、3D 畫布自己收）、用新的那組重掛（跟 07z hmwWalk 同一個做法） */
function gxtWalk(P,k){if(typeof shwPage!=="function"||typeof SHIP_WALK_ON==="undefined"||!SHIP_WALK_ON)return;const V=P.parentNode;if(!V)return;
  if(P.dataset.shw){if((P._gxtW||"")===k)return;P.querySelectorAll(":scope>.shw,:scope>.shw-me,:scope>.shw-hint,:scope>.shw-say,:scope>.shw-menu").forEach(e=>e.remove());delete P.dataset.shw;P.classList.remove("shw-iso")}
  P._gxtW=k;try{shwPage(V,gxtWalkCfg(k),"gxt")}catch(e){}}
/* 解鎖：打贏過黑洞（w＝bhWin 次數；P＝塔防進度 bhtd，c＝破過的關） */
const gxtWon=(w,P,G)=>(+w||0)>0||!!(P&&P.c&&typeof P.c==="object"&&Object.keys(P.c).length)||gxtGsvWon(G);
/* 11/16 出入口盤查：黑洞只剩星門圍城以後，打贏只寫進存檔 gsv（07sg2 sg2End：c／h＝各關勝敗、v2＝各關各難度），不記 bhWin、bhtd；新玩家觀星臺永遠不出現。G＝gsv 存檔，任何一關贏過就算 */
function gxtGsvWon(G){if(!G||typeof G!=="object")return false;const won=T=>!!T&&typeof T==="object"&&Object.values(T).some(r=>r&&(+r.w||0)>0);
  if(won(G.c)||won(G.h))return true;return!!G.v2&&typeof G.v2==="object"&&Object.values(G.v2).some(won)}
function gxtOpen(){if(!GXT_ON)return false;   /* 11/16 開發者「我把開發者試玩打開，但我還沒啟航掉入黑洞，就可以看到觀星臺」，選單「場景入口照玩家進度」：全部解鎖試玩也不打開觀星臺入口 */
  /* 11/16 hspx P1（開發者「我剛剛才到星槎上……還沒起航偏離軌道就馬上跳出觀星臺和西市的過場動畫」），選單「打贏星門圍城才開」：只算這一趟旅程的勝場——舊黑洞的 bhWin 是整支手機共用（不在存檔清單），舊旅程贏過、新旅程一降落就開，不再算 */
  try{return gxtWon(0,typeof bhtdProg==="function"?bhtdProg():store.get("bhtd",null),store.get("gsv",null))}catch(e){return false}}
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
function gxtTd(){if(gxtBhLock()){toast("🌫 "+gxtBhMsg());return}try{sessionStorage.setItem("gxtFrom","1")}catch(e){}if(typeof gsvOpen==="function"&&typeof SG2G!=="undefined"){gxtFx("td",()=>gsvOpen());return}if(typeof bhtdOpen!=="function"){toast("🌌 "+GXT_OFF);return}gxtFx("td",()=>bhtdOpen())}   /* 11/16：先播渾儀的短過場（gxtFx，下面） */
/* ---------- 星碑共鳴：從星圖石碑進幻譜星門的過場（開發者 11/15）----------
   開發者：「請 gemini 規劃觀星臺有什麼神秘的力量，可以直接通聯或前往 13 星系」→ 規劃 story/gemini_app/157，他選「星碑共鳴」，過場「直接做完整版」。
   設定：幻影棋客開了門、星槎駛出了路，觀星臺的星圖石碑是人間的「錨」；碰了石碑，神識順著天頂黑洞的光柱進幻譜星門，肉身留在臺上。
   完整版（約 4.9 秒）：碑上星點亮起 → 金光從碑腳沿地面匯到渾儀腳下、再沿光柱衝上天頂 → 視角跟著衝進黑洞 → 潑墨蓋滿畫面、一句「觸碑生墨，神識已渡星河。」→ 墨散開就是選星頁。
   簡化版（約 1.5 秒）：墨色淡入、那一句、淡出。系統設「減少動態」的人，或這次開 App 已經看過完整版（sessionStorage gxtGateFx），就用簡化版。過場中點一下畫面＝跳過。
   全部疊在一層蓋住畫面的 .gxt-fx 上（場景用一張替身圖放大，不動原本的頁面）；過場中離開這一頁＝收掉、不開星門。時間表 gxtGatePlan 是純計算，測試用 vm 跑 */
const GXT_GATE={p:{st:[18,43],ft:[18,58],mid:[50,65],bh:[50,8]},w:{st:[40,44],ft:[40,58],mid:[50,66],bh:[50,12]}};   /* 場景圖上的位置（%）：碑上星圖、碑腳、渾儀腳下、天頂黑洞（直幅量 gx_tai、寬版量 gx_tai_w） */
const gxtRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const gxtGatePlan=(rm,seen)=>rm||seen?{kind:"lite",ink:0,say:260,open:950,end:1500}:{kind:"full",beam:700,rise:1800,ink:2650,say:3250,open:4200,end:4900};   /* 各段開始的時間（毫秒） */
function gxtGateCss(){if(document.getElementById("gxtGateCss"))return;const s=document.createElement("style");s.id="gxtGateCss";s.textContent=`
.gxt-fx{position:fixed;inset:0;z-index:9600;overflow:hidden;touch-action:none}
.gxt-fx-s{position:absolute;background-size:100% 100%;opacity:0;will-change:transform}
.gxt-fx-d{position:absolute;width:7px;height:7px;margin:-3.5px;border-radius:50%;background:#ffe9a8;box-shadow:0 0 8px 3px rgba(255,206,96,.9);opacity:0}
.gxt-fx svg{position:absolute;inset:0;width:100%;height:100%}
.gxt-fx-k{position:absolute;border-radius:50%;background:radial-gradient(closest-side,#05060d 58%,rgba(5,6,13,.85) 70%,rgba(5,6,13,0) 100%);transform:translate(-50%,-50%) scale(0)}
.gxt-fx-b{position:absolute;inset:0;background:#05060d;opacity:0}
.gxt-fx-r{position:absolute;border:3px solid #ffe9a8;border-radius:50%;box-shadow:0 0 14px 2px rgba(255,206,96,.95),inset 0 0 10px rgba(255,206,96,.7);opacity:0;transform:translate(-50%,-50%)}
.gxt-fx-g{position:absolute;border-radius:50%;background:radial-gradient(closest-side,#eaf4ff,rgba(120,170,255,.75) 45%,rgba(120,170,255,0));opacity:0;transform:translate(-50%,-50%)}
.gxt-fx-m{position:absolute;inset:0;background:#05060d;opacity:0}
.gxt-fx-t.sky{text-shadow:0 0 6px #05060d,0 0 12px #05060d,0 0 12px rgba(255,206,96,.5)}
.gxt-fx-t{position:absolute;left:0;right:0;top:44%;text-align:center;padding:0 20px;font:900 clamp(19px,5.6vw,26px)/1.5 var(--serif,serif);color:#ffe08a;letter-spacing:.12em;opacity:0;text-shadow:0 0 12px rgba(255,206,96,.5)}`;document.head.append(s)}
function gxtGate(){if(typeof gxMap!=="function"){toast("🌌 "+GXT_OFF);return}
  const P=document.querySelector(".gxt-page"),im=P&&P.querySelector(":scope>img"),open=()=>gxMap({from:"stele"});
  if(!P||!im||gxtGate.busy||typeof document.body.animate!=="function"){open();return}
  let seen=false;try{seen=sessionStorage.getItem("gxtGateFx")==="1";sessionStorage.setItem("gxtGateFx","1")}catch(e){}
  const T=gxtGatePlan(gxtRM(),seen),C=GXT_GATE[P.dataset.gxt?"w":"p"],R=im.getBoundingClientRect(),pt=a=>[R.left+R.width*a[0]/100,R.top+R.height*a[1]/100],st=pt(C.st),ft=pt(C.ft),mid=pt(C.mid),bh=pt(C.bh);
  const D=Math.hypot(innerWidth,innerHeight),tm=[],line=typeof GX_TXT!=="undefined"&&GX_TXT.stele||"觸碑生墨，神識已渡星河。";let opened=false,done=false,h="";
  gxtGateCss();gxtGate.busy=true;const fx=document.createElement("div");fx.className="gxt-fx";fx.setAttribute("aria-hidden","true");
  if(T.kind==="full"){h+=`<div class="gxt-fx-s" style="left:${R.left}px;top:${R.top}px;width:${R.width}px;height:${R.height}px;background-image:url('${im.currentSrc||im.src}');transform-origin:${C.bh[0]}% ${C.bh[1]}%"></div>`;
    for(let i=0;i<7;i++){const a=i/7*Math.PI*2,r=R.width*(.018+.022*((i*37)%10)/10);h+=`<i class="gxt-fx-d" style="left:${st[0]+Math.cos(a)*r}px;top:${st[1]+Math.sin(a)*r}px"></i>`}
    h+=`<svg><path d="M${ft[0]} ${ft[1]} L${mid[0]} ${mid[1]} L${bh[0]} ${bh[1]}" pathLength="1" fill="none" stroke="#ffe08a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 6px rgba(255,206,96,.95))"/></svg>`;
    for(let i=0;i<5;i++)h+=`<i class="gxt-fx-k" style="left:${bh[0]+(i%2?1:-1)*D*.05*i}px;top:${bh[1]+D*.07*i}px;width:${D*(1.1+.35*i)}px;height:${D*(1.1+.35*i)}px"></i>`}
  fx.innerHTML=h+`<div class="gxt-fx-b"></div><div class="gxt-fx-t">${esc(line)}</div>`;document.body.append(fx);
  const q=s=>fx.querySelector(s),qa=s=>[...fx.querySelectorAll(s)],A=(el,kf,o)=>{try{return el.animate(kf,Object.assign({fill:"forwards",easing:"ease"},o))}catch(e){return null}};
  const at=(ms,f)=>tm.push(setTimeout(()=>{if(!done)try{f()}catch(e){}},ms));
  const end=()=>{tm.forEach(clearTimeout);removeEventListener("hashchange",bail);fx.remove();gxtGate.busy=false};
  const bail=()=>{if(done)return;done=true;end()};   /* 過場中離開這一頁＝收掉，不開星門 */
  const finish=fast=>{if(done)return;done=true;const a=A(fx,[{opacity:1},{opacity:0}],{duration:fast?180:T.end-T.open,easing:"ease-out"});if(a&&a.finished)a.finished.then(end,end);else end()};
  const doOpen=()=>{if(opened)return;opened=true;try{open()}catch(e){}};
  addEventListener("hashchange",bail);fx.onclick=()=>{vibrate(5);doOpen();finish(true)};   /* 點一下＝跳過 */
  if(T.kind==="full"){
    qa(".gxt-fx-d").forEach((d,i)=>A(d,[{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"scale(1.25)",offset:.6},{opacity:.85,transform:"scale(1)"}],{duration:420,delay:i*85}));
    at(T.beam,()=>A(q("path"),[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:T.rise-T.beam,easing:"cubic-bezier(.5,0,.3,1)"}));
    at(T.rise,()=>{const s=q(".gxt-fx-s");A(s,[{opacity:0},{opacity:1}],{duration:140});A(s,[{transform:"scale(1)"},{transform:"scale(7)"}],{duration:T.ink-T.rise+350,easing:"cubic-bezier(.6,0,.9,.5)"});
      qa(".gxt-fx-d").forEach(d=>A(d,[{opacity:.85},{opacity:0}],{duration:200}));A(q("svg"),[{opacity:1},{opacity:0}],{duration:500,delay:250})});
    at(T.ink,()=>{qa(".gxt-fx-k").forEach((k,i)=>A(k,[{transform:"translate(-50%,-50%) scale(0)"},{transform:"translate(-50%,-50%) scale(1)"}],{duration:520,delay:i*70,easing:"cubic-bezier(.2,.7,.3,1)"}));A(q(".gxt-fx-b"),[{opacity:0},{opacity:1}],{duration:380,delay:330})})}
  else at(T.ink,()=>A(q(".gxt-fx-b"),[{opacity:0},{opacity:1}],{duration:240}));
  at(T.say,()=>A(q(".gxt-fx-t"),[{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:420}));
  at(T.open,()=>{doOpen();finish(false)})}
/* ---------- 其他入口的短過場（開發者 11/16）----------
   開發者：「點擊這一頁每一個入口後，可以先有個動畫過場或是其他方式來說明怎麼進到這個對應入口的頁面，不然玩家會覺得怎麼進來的」
   → Gemini 討論 story/gemini_app/158，他選「每個入口短過場＋回來站在器物前」。每件器物一種看得出差別的演出，加一句話：
     青銅渾儀＝星淵遠征：三道金環繞著渾儀轉、中間的光漲開，墨色蓋上來，「撥轉渾儀，定軌星淵之途。」
     天頂黑洞＝黑洞車輪戰：視角朝天頂的黑洞衝上去，墨色蓋上來，「仰觀天頂，身入萬劫星漩。」
     右側星空＝二十八宿：星空裡幾顆星亮起、連成一線，「引星連脈，喚醒四方真靈。」（不蓋黑，星圖面板直接滑上來）
   這次開 App 每件器物第一次約 2.7 秒，之後約 1.7 秒（同一段演出快轉）；系統設「減少動態」只淡入那一句（約 1.1 秒）。點一下跳過；離開這一頁就收掉。
   回來站在器物前：走路角色的位置 07w 本來就記著（SHW_MEM "gxt"），從玩法回到觀星臺時人還站在那件器物前。
   時間表 gxtFxPlan 是純計算。
   11/16 開發者（今日異象、自由擺陣開張）再加兩段：
     圭表＝今日異象：石柱頂亮起一團星光，金色的「圭影」沿著地上的石圭畫過去，墨色蓋上來，「圭影移轉，今日異象現形。」
     石棋桌＝自由擺陣：十六顆星點（金八、藍八）從桌心散開，再落回桌上排成兩列，墨色蓋上來，「拂開石桌，親手重排星陣。」 */
const GXT_FXT={td:"撥轉渾儀，定軌星淵之途。",simul:"仰觀天頂，身入萬劫星漩。",sky:"引星連脈，喚醒四方真靈。",omen:"圭影移轉，今日異象現形。",free:"拂開石桌，親手重排星陣。"};
const GXT_FXP={p:{td:[50,52,15],sky:[80,17,9],omen:[73,46,4],gui:[74,57,95,59.5],free:[31,75,13]},w:{td:[50.5,51.5,5],sky:[80,11,5],omen:[57.4,47,2],gui:[58,58.6,65.4,62.2],free:[44,77,4.4]}};   /* 場景圖上的位置：[左%, 上%, 半徑佔圖寬 %]（渾儀的球心、右側星空、圭表石柱頂、石棋桌桌心）；gui＝石圭（地上的刻度石）從柱腳到尾端 [左,上,左,上]（11/16 量 gx_tai 768×1376、gx_tai_w 1376×768） */
const gxtFxPlan=(rm,seen)=>rm?{kind:"min",say:120,open:750,end:1150}:seen?{kind:"lite",say:600,open:1250,end:1700}:{kind:"full",say:1150,open:2150,end:2750};   /* 各段開始的時間（毫秒）：那一句話、開畫面、收掉 */
function gxtFx(id,open){let P=null,im=null,ok=false;try{P=document.querySelector(".gxt-page");im=P&&P.querySelector(":scope>img");ok=!!(P&&im&&GXT_FXT[id]&&!gxtFx.busy&&!gxtGate.busy&&typeof document.body.animate==="function")}catch(e){}
  if(!ok){open();return}
  let seen=false;try{seen=sessionStorage.getItem("gxtFx:"+id)==="1";sessionStorage.setItem("gxtFx:"+id,"1")}catch(e){}
  const T=gxtFxPlan(gxtRM(),seen),k=P.dataset.gxt?"w":"p",R=im.getBoundingClientRect(),pt=a=>[R.left+R.width*a[0]/100,R.top+R.height*a[1]/100],tm=[];let opened=false,done=false,h="";
  gxtGateCss();gxtFx.busy=true;const fx=document.createElement("div");fx.className="gxt-fx";fx.setAttribute("aria-hidden","true");
  if(T.kind!=="min"){
    if(id==="td"){const c=GXT_FXP[k].td,p=pt(c),r=R.width*c[2]/100;for(let i=0;i<3;i++)h+=`<i class="gxt-fx-r" style="left:${p[0]}px;top:${p[1]}px;width:${r*2}px;height:${r*2}px"></i>`;h+=`<i class="gxt-fx-g" style="left:${p[0]}px;top:${p[1]}px;width:${r*.7}px;height:${r*.7}px"></i>`}
    else if(id==="simul")h+=`<div class="gxt-fx-s" style="left:${R.left}px;top:${R.top}px;width:${R.width}px;height:${R.height}px;background-image:url('${im.currentSrc||im.src}');transform-origin:${GXT_GATE[k].bh[0]}% ${GXT_GATE[k].bh[1]}%"></div>`;
    else if(id==="sky"){const c=GXT_FXP[k].sky,p=pt(c),r=R.width*c[2]/100,S=[[-1,-.3],[-.45,.35],[.05,-.15],[.5,.4],[1,-.2],[.55,-.75],[.05,-.15]].map(q=>[p[0]+q[0]*r,p[1]+q[1]*r]);
      h+=`<svg><polyline points="${S.map(q=>q[0].toFixed(1)+","+q[1].toFixed(1)).join(" ")}" pathLength="1" fill="none" stroke="#ffe08a" stroke-width="2.2" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 4px rgba(255,206,96,.9))"/></svg>`+S.slice(0,6).map(q=>`<i class="gxt-fx-d" style="left:${q[0]}px;top:${q[1]}px"></i>`).join("")}
    else if(id==="omen"){const c=GXT_FXP[k].omen,g=GXT_FXP[k].gui,p=pt(c),r=R.width*c[2]/100,a=pt([g[0],g[1]]),z=pt([g[2],g[3]]);   /* 11/16：圭表石柱頂一團星光＋石圭上一道金色圭影 */
      h+=`<i class="gxt-fx-g" style="left:${p[0]}px;top:${p[1]}px;width:${r*2}px;height:${r*2}px"></i><svg><path d="M${a[0].toFixed(1)} ${a[1].toFixed(1)} L${z[0].toFixed(1)} ${z[1].toFixed(1)}" pathLength="1" fill="none" stroke="#ffe08a" stroke-width="4" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 6px rgba(255,206,96,.95))"/></svg>`}
    else if(id==="free"){const p=pt(GXT_FXP[k].free);for(let i=0;i<16;i++)h+=`<i class="gxt-fx-d" style="left:${p[0]}px;top:${p[1]}px${i>7?";background:#cfe0ff;box-shadow:0 0 8px 3px rgba(140,180,255,.9)":""}"></i>`}}   /* 11/16：石棋桌桌心十六顆星點（前八金＝紅方、後八藍＝黑方） */
  fx.innerHTML=(id==="simul"?"":`<div class="gxt-fx-m"></div>`)+h+(id==="sky"?"":`<div class="gxt-fx-b"></div>`)+`<div class="gxt-fx-t${id==="sky"?" sky":""}">${esc(GXT_FXT[id])}</div>`;document.body.append(fx);   /* 渾儀、星空兩段先把場景壓暗一半（.gxt-fx-m 墊在金環、星線底下）：觀星臺白天是淺色的圖，不壓暗金色看不見；星空那一段不全黑，就停在這個暗度 */
  const q=s=>fx.querySelector(s),qa=s=>[...fx.querySelectorAll(s)],A=(el,kf,o)=>{try{return el.animate(kf,Object.assign({fill:"forwards",easing:"ease"},o))}catch(e){return null}};
  const at=(ms,f)=>tm.push(setTimeout(()=>{if(!done)try{f()}catch(e){}},ms));
  const end=()=>{tm.forEach(clearTimeout);removeEventListener("hashchange",bail);fx.remove();gxtFx.busy=false};
  const bail=()=>{if(done)return;done=true;end()};
  const finish=fast=>{if(done)return;done=true;const a=A(fx,[{opacity:1},{opacity:0}],{duration:fast?180:T.end-T.open,easing:"ease-out"});if(a&&a.finished)a.finished.then(end,end);else end()};
  const doOpen=()=>{if(opened)return;opened=true;try{open()}catch(e){}};
  addEventListener("hashchange",bail);fx.onclick=()=>{vibrate(5);doOpen();finish(true)};   /* 點一下＝跳過 */
  if(T.kind!=="min"){
    if(id==="td"){qa(".gxt-fx-r").forEach((r,i)=>A(r,[{opacity:0,transform:`translate(-50%,-50%) rotate(${i*60}deg) scaleY(.35)`},{opacity:1,offset:.1,transform:`translate(-50%,-50%) rotate(${i*60+20}deg) scaleY(.35)`},{opacity:1,transform:`translate(-50%,-50%) rotate(${i*60+220}deg) scaleY(.35)`}],{duration:T.open,easing:"ease-in"}));
      A(q(".gxt-fx-g"),[{opacity:0,transform:"translate(-50%,-50%) scale(.4)"},{opacity:1,offset:.5,transform:"translate(-50%,-50%) scale(1)"},{opacity:1,transform:"translate(-50%,-50%) scale(9)"}],{duration:T.say+250,easing:"ease-in"})}
    else if(id==="simul"){const s=q(".gxt-fx-s");A(s,[{opacity:0},{opacity:1}],{duration:120});A(s,[{transform:"scale(1)"},{transform:"scale(6)"}],{duration:T.say+200,easing:"cubic-bezier(.5,0,.8,.6)"})}
    else if(id==="sky"){qa(".gxt-fx-d").forEach((d,i)=>A(d,[{opacity:0,transform:"scale(.3)"},{opacity:1,transform:"scale(1.25)"},{opacity:.9,transform:"scale(1)"}],{duration:300,delay:i*T.say/8}));A(q("polyline"),[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:T.say,easing:"ease-in-out"})}
    else if(id==="omen"){A(q(".gxt-fx-g"),[{opacity:0,transform:"translate(-50%,-50%) scale(.3)"},{opacity:1,offset:.35,transform:"translate(-50%,-50%) scale(1.25)"},{opacity:.9,transform:"translate(-50%,-50%) scale(1)"}],{duration:T.say});
      A(q("path"),[{strokeDashoffset:1},{strokeDashoffset:0}],{duration:Math.round(T.say*.75),delay:Math.round(T.say*.2),easing:"ease-in-out"})}
    else if(id==="free"){const r=R.width*GXT_FXP[k].free[2]/100;qa(".gxt-fx-d").forEach((d,i)=>{const a=i/16*Math.PI*2,ox=Math.cos(a)*r*1.6,oy=Math.sin(a)*r*.9,gx=((i%8)-3.5)*r*.24,gy=(i>7?1:-1)*r*.16;   /* 先散成一圈，再落回桌面排成兩列（桌面是斜看的，上下壓扁） */
      A(d,[{opacity:0,transform:"translate(0,0) scale(.4)"},{opacity:1,offset:.4,transform:`translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) scale(1.2)`},{opacity:1,transform:`translate(${gx.toFixed(1)}px,${gy.toFixed(1)}px) scale(1)`}],{duration:T.say,easing:"ease-in-out"})})}}
  if(id!=="sky")at(Math.max(0,T.say-380),()=>A(q(".gxt-fx-b"),[{opacity:0},{opacity:1}],{duration:340}));
  if(id!=="simul")A(q(".gxt-fx-m"),[{opacity:0},{opacity:.55}],{duration:260});
  at(T.say,()=>A(q(".gxt-fx-t"),[{opacity:0,transform:"translateY(6px)"},{opacity:1,transform:"none"}],{duration:300}));
  at(T.open,()=>{doOpen();finish(id==="sky")})}   /* 星圖面板是從底下滑上來的，過場層要收得快，那句話才不會壓在面板上 */
/* 天頂黑洞＝黑洞車輪戰：跟渾儀一樣，定軌力用完時黑洞入口關著 */
function gxtWheel(){if(gxtBhLock()){toast("🌫 "+gxtBhMsg());return}if(typeof gsvOpen==="function"&&typeof SG2G!=="undefined"){gxtFx("simul",()=>gsvOpen());return}if(typeof whlOpen!=="function"){toast("🌌 "+GXT_OFF);return}gxtFx("simul",()=>whlOpen())}   /* 11/16：天頂黑洞也開星門圍城選關 */
const GXT_ACT={gxtTd:gxtTd,gxtSimul:()=>{try{sessionStorage.setItem("gxtFrom","1")}catch(e){}gxtWheel()},gxtGx:()=>gxtGate(),gxtSky:()=>{if(typeof dglXiuSheet!=="function"){toast("🌌 "+GXT_OFF);return}gxtFx("sky",()=>dglXiuSheet())},
  gxtOmen:()=>{if(typeof gxdOmen!=="function"){toast("🌌 "+GXT_OFF);return}gxtFx("omen",()=>gxdOmen())},gxtFree:()=>{if(typeof gxdFree!=="function"){toast("🌌 "+GXT_OFF);return}gxtFx("free",()=>gxdFree())}};   /* 11/16 開發者：今日異象、自由擺陣（07gxd-daily.js）；不是黑洞入口，定軌力用完也照開 */
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
/* 意見回饋 897（開發者 11/15 截圖：黑洞對局頁左上角「‹ 回星槎」圈起來，「不應該出現這個入口」）：黑洞對局頁的返回鈕原本一律回星槎（07-legend.js jBack），
   還沒登船的人、開場序局、從觀星臺進來的人都會看到一顆通往星槎的鈕。改成照實際從哪裡來：從觀星臺開的回觀星臺；開場序局回首頁；
   星槎偏航進來的（bhRet.cover）而且真的有航程才回星槎；其餘回首頁。字由 02-shell.js 照去處自動寫（回觀星臺／回首頁／回星槎） */
function gxtBhBack(j){try{if(gxtFromTd())return"#/guanxing";if(String(j||"")==="bh:xu")return"#/";const R=store.get("bhRet",null);if(R&&R.cover&&typeof shipDockList==="function"&&shipDockList())return"#/adventure"}catch(e){}return"#/"}
if(typeof bhReturn==="function"){const f3=bhReturn;bhReturn=function(){if(!gxtFromTd())return f3.apply(this,arguments);try{sessionStorage.removeItem("gxtFrom")}catch(e){}store.set("bhRet",null);location.hash="#/guanxing"}}
if(typeof bhStart==="function"){const f4=bhStart;bhStart=function(){try{sessionStorage.removeItem("gxtFrom")}catch(e){}return f4.apply(this,arguments)}}   /* 星槎偏航進黑洞＝照舊回星槎 */
