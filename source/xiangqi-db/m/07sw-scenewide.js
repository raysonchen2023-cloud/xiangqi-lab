/* ================= 🖼 W107-L 場景頁的 iPad 橫向專用圖（l1610；開發者 11/25 選「重畫真正的橫式構圖」「classic 先做 8 張」）=================
   起因：iPad 橫向時直式場景圖（768×1376）只能等高放在中間，兩側是模糊底；試過左右補畫延伸（PR #154，暫停），入口都擠在中間，開發者覺得不協調，改成每頁重畫一張橫式構圖。
   做法照首頁 07z HMW 那套通用化：
   ① 登記表 SCW：鍵＝這一頁原本要用的那張圖（data/ 之後、不含 .webp；經 xqClImg 選好的那張，例如經典世界的 redomap/redo_day_classic），
      值＝橫式條目 {f 檔名, w/h 母圖尺寸, S 入口標籤座標（id→[左%,上%]）, exit 圖上出口座標, safe 每邊最多裁多少, walk 走路節點, fx 各頁疊圖座標, sw7 天氣範圍（可不寫）}。
      預設、季節、夜景、朝代圖查不到條目＝照舊用原圖。
   ② 選圖照 hmwKind 的橫版那一段：可用寬 ÷ 可用高 > 1.04 而且畫面短邊 ≥ 600（手機橫放照舊）。開頁先量（scwPre），一開始就載對的那張；
      07fl 包的 r07Wide 每次排版先問 scwSync：比例跨過門檻＝原地換圖、換入口座標、換出口、重掛走路角色（回 "wait"，圖載好再排一次）；用橫式圖＝07fl xflHmw 用 cover 填滿。
   ③ 橫式圖載不到＝退回原圖，這次開 App 不再試（SCW_BAD，照 HMW_BAD）。
   ④ 橫式圖跟原圖一樣放在同一個圖框（.shp-page.cq）裡，07w7 的晨昏色、飄雲、各頁 fx 層照舊整張蓋到（PR #154 試延伸圖時查到：色調層只蓋原圖，接縫會多一條色帶）。
   ⑤ 共用表：07w7 天氣範圍（sw7Page）遇到橫式圖問 scwSw7——條目有 sw7 就用它（座標是橫式圖像素），沒有就這張圖不下雨雪（m:"in"，晨昏色、飄雲照舊）；
      07w6 物件說明在橫式圖上先關掉（座標是原圖像素）；07w9 出口照條目的 exit 換位置。
   條目 ready:false＝圖還沒到、座標還沒量好，只有開發用開關（localStorage xqScwDev=1）才用，正式玩家照舊原圖。
   橫式圖跟首頁 home_l1610 一樣不在公開倉庫，照發布流程放上網站；網站上還沒有（404）＝退回原圖。
   純計算 scwKind／scwKey 不碰 DOM，自動測試 xiangqi-lab/tools/test-scene-wide-l1610.js 用 vm 跑 */
const SCW_ON=true,SCW_IMGV="1125";
const SCW_SQ=1.04,SCW_LMIN=600;   /* 跟 07z HMW_SQ、HMW_LMIN 同一點 */
/* 錯棋重練（07y8）經典世界白天：output/w107-ipad/l1610/redomap/redo_day_classic_l1610.json（Windows Claude 1 11/25 在 2560×1600 圖上量，誤差約 ±1%）。
   座標都是圖的 %（sw7.sky 是像素）。fx：bookText 攤開冊子右頁中心（直寫今日複習）、stackBase 矮几上已畫那疊冊子的頂、stackStep 每本往上幾 % 圖高、bookW 疊的冊子寬（圖寬 %）、censer 香爐口。
   新圖物件比原圖大（桌面到地板：原圖約 21% 圖高、新圖約 30%），小人身高放大約 1.4 倍（h[0] .1 → .14）。經典世界照舊不畫池水、竹竿上的冊頁 */
const SCW={
  "redomap/redo_day_classic":{ready:true,f:"redomap/redo_day_classic_l1610",w:2560,h:1600,
    S:{rd2Book:[46.5,62.1],rd2Stack:[19.5,50.9],rd2Pole:[84,38.4],rd2All:[65.5,78.7]},exit:[14,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,el:40,h:[.14,96,.004],look0:[46.5,70],home:"home",N:{home:[50,97],desk:[44,95],lft:[20,88],rgt:[80,86],mid:[62,95]},E:"home-desk desk-lft home-mid mid-rgt",
      HS:{rd2Book:["desk",46.5,70,"wave"],rd2Stack:["lft",19.5,57,"wave"],rd2Pole:["rgt",84,45,"wave"],rd2All:["mid",65,78,"idle"]}},
    fx:{bookText:[51,70.4],stackBase:[19.5,54.9],stackStep:1.6,bookW:10,censer:[61.2,66.4]},
    sw7:{m:"semi",sky:[[[512,78],[2020,78],[2020,830],[512,830]]],fg:null,tr:null}},
  /* 棋力測驗（07y9）經典世界白天：output/w107-ipad/l1610/exammap/exam_day_classic_l1610.json。S 的三份卷子是標籤位置（中間那份照原圖放高一排）；
     fx.board＝題名榜榜面（左、上、右、下，像素 2560×1600）；這一頁 07w7 原本就歸室內，不寫天氣範圍 */
  "exammap/exam_day_classic":{ready:true,f:"exammap/exam_day_classic_l1610",w:2560,h:1600,
    S:{ex2S0:[40,53.6],ex2S1:[51,50],ex2S2:[61.5,53.6],ex2Book:[80.8,54.1]},exit:[14,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,el:40,h:[.126,95,.004],look0:[51,62],home:"home",N:{home:[50,97],altar:[50,93],rgt:[80,92]},E:"home-altar altar-rgt",
      HS:{ex2S0:["altar",51,62,"bow"],ex2S1:["altar",51,62,"bow"],ex2S2:["altar",51,62,"bow"],ex2Book:["rgt",81,60,"idle"]}},
    fx:{board:[205,123,681,696]}},
  /* 挑戰電腦（07z5）經典世界白天：output/w107-ipad/l1610/cpuroom/。沒有走路路網；fx：掌櫃幻影（下緣離圖底、寬，都是圖的 %，照椅背高度換算）、名牌上緣、說明卡上緣和左右留白（圖變寬，卡片不拉滿） */
  "cpuroom/cpuroom_day_classic":{ready:true,f:"cpuroom/cpuroom_day_classic_l1610",w:2560,h:1600,
    S:{crRank:[26,30],crScroll:[74,34],crBlind:[84,47],crRankT:[15,50],crFree:[86,61],crRed:[34,68],crGo:[49,74],crBlack:[65,69]},exit:[50,96],
    safe:{l:.12,r:.12,t:.05,b:.10},
    fx:{ghost:{bottom:36.8,width:20},name:{top:14},card:{top:78,left:25,right:25}}},
  /* 今日推薦（07y5）經典世界白天：output/w107-ipad/l1610/todaymap/。fx 都是像素 2560×1600：notes 五張紙四角（左上、右上、右下、左下；照原本內容槽順序）、
     eave 簷影的簷口兩端（量到的是整片屋簷 538～2074，影子會拖到柱子外的天上；11/25 模擬器上看過改成只跨板面 717～1882）、censer 香篆（中心 x、y、半徑 x、y）、term 節氣牌、seal「圓滿」印；告示的走路小動作由 07y5 照紙的位置算。
     天氣：原本 today 是全戶外（m:"out"），fg＝告示牆連屋簷擋雨雪，原圖的樹（tr）不沿用 */
  "todaymap/today_day_classic":{ready:true,f:"todaymap/today_day_classic_l1610",w:2560,h:1600,
    S:{},exit:[14,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,N:{home:[50,96],mid:[48,89],brd:[50,82]},E:"home-mid mid-brd"},
    fx:{notes:[[[763,654],[920,654],[920,900],[763,900]],[[986,652],[1140,652],[1140,905],[982,905]],[[1212,656],[1368,656],[1368,906],[1210,906]],[[1448,657],[1600,657],[1600,906],[1450,906]],[[1666,662],[1820,662],[1822,904],[1668,904]]],
      eave:[[717,518],[1882,518]],censer:[2163,1236,64,20],term:[1280,590],seal:[1760,940]},
    sw7:{sky:[[[0,0],[2560,0],[2560,1152],[0,1152]]],fg:[[[538,300],[2074,300],[2074,1270],[538,1270]]],tr:null}}};
const SCW_BAD={};   /* 這次開 App 載不到的橫式圖（鍵＝原圖鍵），退回原圖不再試 */
/* 圖網址 → 鍵（data/ 之後、不含 .webp 和 ?v=） */
const scwKey=src=>{const m=/(?:^|\/)data\/([^?#]+?)\.webp(?:[?#]|$)/.exec(src||"");return m?m[1]:""};
const scwDev=()=>{try{return localStorage.getItem("xqScwDev")==="1"}catch(e){return false}};
function scwEntry(key){const e=SCW_ON&&key&&Object.prototype.hasOwnProperty.call(SCW,key)?SCW[key]:null;return e&&(e.ready||scwDev())&&!SCW_BAD[key]?e:null}
const scwSrc=e=>"data/"+e.f+".webp?v="+SCW_IMGV;
/* 純計算：W 可用寬、av 可用高、vw #view 寬、vh 畫面高 → "l1610"／""（原圖） */
function scwKind(W,av,vw,vh){if(!SCW_ON||!(W>0&&av>=120))return"";return W/av>SCW_SQ&&Math.min(vw,vh)>=SCW_LMIN?"l1610":""}
/* 量 #view 的可用寬高（圖框還沒放進去時 top＝0：各頁都把圖框插在 #view 最上面） */
function scwMeasure(V,P){const cs=getComputedStyle(V),pb=parseFloat(cs.paddingBottom)||0,pl=parseFloat(cs.paddingLeft)||0,pr=parseFloat(cs.paddingRight)||0;
  let top=0;if(P&&P.isConnected){const vr=V.getBoundingClientRect(),r=P.getBoundingClientRect();top=r.top-vr.top+V.scrollTop+(parseFloat(P.style.marginTop)||0)}
  return{W:V.clientWidth-pl-pr,av:V.clientHeight-pb-Math.max(0,top),vw:V.clientWidth,vh:document.documentElement.clientHeight||innerHeight}}
const scwPick=(V,P,key)=>{const e=scwEntry(key);if(!e||!V)return"";const m=scwMeasure(V,P);return scwKind(m.W,m.av,m.vw,m.vh)};
/* 開頁前：這一頁（原圖 src）該不該一開始就用橫式圖；回傳 {src, k} */
function scwPre(V,src){const key=scwKey(src),k=scwPick(V,null,key);return k?{src:scwSrc(SCW[key]),k}:{src,k:""}}
/* 各頁掛上：P＝圖框（.shp-page.cq），o={key 原圖鍵, src0 原圖網址, ids 入口標籤的 id, pfx 走路角色前綴, cfg0 原圖的走路設定, apply(e) 換圖後各頁重畫疊圖, onCfg(cfg) 換了走路設定} */
function scwMount(P,o){if(!P||!o||!o.key)return;P._scw=o;if(P.dataset.scw==null)P.dataset.scw="";P.classList.toggle("scw-l",!!P.dataset.scw);scwPlace(P)}
const scwOn=P=>!!(P&&P._scw&&P.dataset.scw);
const scwCur=P=>scwOn(P)?scwEntry(P._scw.key):null;
/* 入口標籤、圖上出口照現在用的那張圖擺；原位記在 data-scw-l／data-scw-t（07t3 ttL、07w9 exL/exT、00-util xqTop0 是它們自己記的原位，換位置時清掉，不然會被還原回上一張圖的位置） */
function scwPut(b,xy){if(!b)return false;if(b.dataset.scwL==null){b.dataset.scwL=b.dataset.exL!=null?b.dataset.exL:b.style.left;b.dataset.scwT=b.dataset.exT!=null?b.dataset.exT:b.style.top}
  const L=xy?xy[0]+"%":b.dataset.scwL,T=xy?xy[1]+"%":b.dataset.scwT;if(b.dataset.scwAt===L+","+T)return false;
  b.dataset.scwAt=L+","+T;b.style.left=L;b.style.top=T;b.style.marginLeft="";delete b.dataset.ttL;delete b.dataset.exL;delete b.dataset.exT;delete b.dataset.xqTop0;return true}
function scwPlace(P){const o=P&&P._scw;if(!o)return;const e=scwCur(P);
  for(const id of o.ids||[])scwPut(P.querySelector("#"+id),e&&e.S?e.S[id]:null);
  const x=P.querySelector(":scope>.ex-spot");if(x&&scwPut(x,e&&e.exit?e.exit:null)&&typeof exIn==="function")try{exIn(x)}catch(z){}}
/* 原地換圖（k＝"l1610"／""）、換座標、各頁疊圖、走路角色 */
function scwSet(P,k){const o=P&&P._scw,im=P&&P.querySelector(":scope>img");if(!o||!im)return;const e=k?scwEntry(o.key):null;if(!e)k="";
  P.dataset.scw=k;P.classList.toggle("scw-l",!!k);
  const src=k?scwSrc(e):o.src0;
  if(im.getAttribute("src")!==src){im.onerror=()=>{if(P.dataset.scw){SCW_BAD[o.key]=1;scwSet(P,"")}};
    im.addEventListener("load",()=>{if(!P.isConnected)return;try{if(typeof ttFill==="function")ttFill()}catch(x){}try{if(typeof spfSoon==="function")spfSoon(0)}catch(x){}},{once:true});
    im.src=src}
  scwPlace(P);try{if(o.apply)o.apply(e)}catch(x){}scwWalk(P,e)}
/* 走路角色掛的是哪一組節點（P._scwW）跟現在不同＝收掉舊的，用新的那組重掛（照 07z hmwWalk） */
function scwWalkCfg(o,e){const c0=o.cfg0||{};if(!e||!e.walk)return c0;const H={};for(const n in c0.HS||{})H[n]=(c0.HS[n]||[]).slice();for(const n in e.walk.HS||{})H[n]=e.walk.HS[n].slice();return Object.assign({},c0,e.walk,{HS:H})}
function scwWalk(P,e){const o=P._scw;if(!o||!o.cfg0)return;const key=e?"l":"";if((P._scwW||"")===key)return;P._scwW=key;const cfg=scwWalkCfg(o,e);try{if(o.onCfg)o.onCfg(cfg)}catch(x){}
  if(!P.dataset.shw)return;const V=P.parentNode;if(!V)return;
  P.querySelectorAll(":scope>.shw,:scope>.shw-me,:scope>.shw-hint,:scope>.shw-say,:scope>.shw-menu").forEach(x=>x.remove());delete P.dataset.shw;P.classList.remove("shw-iso");
  try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON)shwPage(V,cfg,o.pfx)}catch(x){}}
/* 07fl 包的 r07Wide 每次排版前問這裡：沒掛＝null；比例跨過門檻＝原地換掉、回 "wait"（圖載好會再排一次）；用橫式圖＝"l1610"；原圖＝null（照原本排） */
function scwSync(V,P){const o=P&&P._scw;if(!o||!V)return null;const k=scwPick(V,P,o.key),cur=P.dataset.scw||"";
  if(k!==cur){scwSet(P,k);return"wait"}
  scwPlace(P);if(!k)return null;const im=P.querySelector(":scope>img");if(!im||!im.complete||!im.naturalWidth)return"wait";return k}
const scwSafe=P=>{const e=scwCur(P);return e&&e.safe||null};
/* 07w7 sw7Page 遇到橫式圖：不是登記表裡的（例如首頁 home_l1610）回 undefined，照原本找；是的話條目有 sw7 用它，沒有就不下雨雪 */
function scwSw7(src,base){const f=scwKey(src);if(!f)return undefined;for(const key in SCW){const e=SCW[key];if(e.f!==f)continue;const o=base("data/"+key+".webp");if(!o)return null;
    return e.sw7?Object.assign({},o,e.sw7,{W:e.w,H:e.h}):{k:o.k,re:o.re,rg:o.rg,m:"in"}}
  return undefined}
