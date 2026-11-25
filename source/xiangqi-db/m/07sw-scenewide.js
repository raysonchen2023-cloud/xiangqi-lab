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
/* 橫式圖上了 CDN 沒有（iMac Claude 2 審查 #155：還沒上 CDN 就開，合併後到上傳前每個寬螢幕開頁都先 404 一次）。
   false＝正式玩家一律照舊原圖，只有開發用開關（localStorage xqScwDev=1）才用橫式圖；發布時圖上傳 CDN 的同一個 PR 改成 true */
let SCW_CDN=false;
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
     fx.boardQ＝題名榜榜面的四角（左上、右上、右下、左下，像素 2560×1600；榜在側牆上有透視，右邊比左邊短，
     11/25 開發者截圖「左邊上面的棋力字都跑掉了」：原本當長方形擺，級名跑出框外，改成照四角貼）；這一頁 07w7 原本就歸室內，不寫天氣範圍 */
  "exammap/exam_day_classic":{ready:true,f:"exammap/exam_day_classic_l1610",w:2560,h:1600,
    S:{ex2S0:[40,53.6],ex2S1:[51,50],ex2S2:[61.5,53.6],ex2Book:[80.8,54.1]},exit:[14,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,el:40,h:[.126,95,.004],look0:[51,62],home:"home",N:{home:[50,97],altar:[50,93],rgt:[80,92]},E:"home-altar altar-rgt",
      HS:{ex2S0:["altar",51,62,"bow"],ex2S1:["altar",51,62,"bow"],ex2S2:["altar",51,62,"bow"],ex2Book:["rgt",81,60,"idle"]}},
    fx:{boardQ:[[200,118],[680,207],[680,668],[200,703]]}},   /* 四角由 Windows Claude 1 在原檔上用細格線量（紙面＝框的內側） */
  /* 挑戰電腦（07z5）經典世界白天：output/w107-ipad/l1610/cpuroom/。沒有走路路網；fx：掌櫃幻影（下緣離圖底、寬，都是圖的 %，照椅背高度換算）、名牌上緣、說明卡上緣和左右留白（圖變寬，卡片不拉滿） */
  "cpuroom/cpuroom_day_classic":{ready:true,f:"cpuroom/cpuroom_day_classic_l1610",w:2560,h:1600,
    S:{crRank:[26,30],crScroll:[74,34],crBlind:[84,47],crRankT:[15,50],crFree:[86,61],crRed:[34,68],crGo:[49,62],crBlack:[65,69]},exit:[14,92],   /* Android 平板預驗（Windows Claude 2）：16:9 時出口跟說明卡疊在一起、卡片下緣被裁；出口移到左下、「開始」移到茶爐上方 */
    safe:{l:.12,r:.12,t:.05,b:.10},
    fx:{ghost:{bottom:36.8,width:20},name:{top:14},card:{top:72,left:25,right:25}}},
  /* 今日推薦（07y5）經典世界白天：output/w107-ipad/l1610/todaymap/。fx 都是像素 2560×1600：notes 五張紙四角（左上、右上、右下、左下；照原本內容槽順序）、
     eave 簷影的簷口兩端（量到的是整片屋簷 538～2074，影子會拖到柱子外的天上；11/25 模擬器上看過改成只跨板面 717～1882）、censer 香篆（中心 x、y、半徑 x、y）、term 節氣牌、seal「圓滿」印；告示的走路小動作由 07y5 照紙的位置算。
     天氣：原本 today 是全戶外（m:"out"），fg＝告示牆連屋簷擋雨雪，原圖的樹（tr）不沿用 */
  "todaymap/today_day_classic":{ready:true,f:"todaymap/today_day_classic_l1610",w:2560,h:1600,
    S:{},exit:[14,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,N:{home:[50,96],mid:[48,89],brd:[50,82]},E:"home-mid mid-brd"},
    fx:{notes:[[[763,654],[920,654],[920,900],[763,900]],[[986,652],[1140,652],[1140,905],[982,905]],[[1212,656],[1368,656],[1368,906],[1210,906]],[[1448,657],[1600,657],[1600,906],[1450,906]],[[1666,662],[1820,662],[1822,904],[1668,904]]],
      eave:[[717,518],[1882,518]],censer:[2163,1236,64,20],term:[1280,590],seal:[1760,940]},
    sw7:{sky:[[[0,0],[2560,0],[2560,1152],[0,1152]]],fg:[[[538,300],[2074,300],[2074,1270],[538,1270]]],tr:null}},
  /* 一盞茶殘局（07c2）經典世界白天：output/w107-ipad/l1610/canjumap/。fx：ves 同 CJM_VES 格式（像素）、spout 壺嘴熱氣（像素）、tag 標籤（%：一口放白杯左邊、一盞放黑盞下方，上方是茶筅、茶碾）、leaf 落葉（%）。
     走路：石茶桌斜放，桌面四角、桌面高度對應、兩個跳點、五樣茶具的障礙；地面路線都在桌腳、凳子前面。朝代組（weijin、tang）沒有橫式圖，照舊原圖 */
  "canjumap/canju_day_classic":{ready:true,f:"canjumap/canju_day_classic_l1610",w:2560,h:1600,
    S:{},exit:[14,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,N:{home:[50,97],mid:[45,93],tbl:[33,93],tl2:[17,94],tt:[66,72]},E:"home-mid mid-tbl tbl-tl2",T:{tt:"tea"},
      TB:{tea:{poly:[[35,47.7],[80,58.4],[69,78.1],[20.5,62.9]],hy:[63,81,1],hops:[["mid",[46,71]],["tl2",[25,63]]],
        ob:[[[37,47],[40.5,47],[40.5,57],[37,57]],[[40.5,45],[55.5,45],[55.5,59],[40.5,59]],[[47.5,57],[57.5,57],[57.5,69.6],[47.5,69.6]],[[36,61],[42,61],[42,68],[36,68]],[[60.5,44],[70.5,44],[70.5,66.4],[60.5,66.4]]]}}},
    fx:{ves:[["sip",998,1011,64,20,998,1037,179,115],["cup",1336,934,108,26,1336,998,282,218],["pot",1677,730,31,10,1677,896,256,358]],spout:[1562,742],
      tag:{sip:[32,64],cup:[52,73],pot:[66,40]},leaf:[28,62]},
    sw7:{sky:[[[0,0],[2560,0],[2560,420],[0,420]]],fg:[[[0,0],[780,0],[780,120],[0,120]],[[480,0],[640,0],[640,700],[480,700]]],tr:null}},
  /* 對戰分頁（07y 雲弈閣）經典世界、白天、沒有季節的那一張：output/w107-ipad/l1610/hubmap/battle。季節、夜景變體沒有橫式圖，照舊原圖。
     走路：從右下前門台階經門洞（隱身）進中庭，主樓右側樓梯上二樓迴廊到左邊；鼓台從樓梯底沿門樓後方過去，原本沒有入口的 hbCar 改站鼓台。
     身高照原本的函式，下限 48.2 改成 34（二樓迴廊在 y 34～40）。fx.fw 千秋盃結束的煙火（%）；fx.cy 朝代殘影（竹林茅亭、雲岡石窟、趙州橋，放天空、讓開煙火） */
  "hubmap/battle_classic":{ready:true,f:"hubmap/battle_classic_l1610",w:2560,h:1600,
    S:{hbCup:[52,10],hbSimul:[20,37.6],hbNet:[54,58.4],hbCpu:[15,70.4],hbPvp:[72,62]},exit:[85,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,h:y=>.07+(Math.max(y,34)-64)*.0007,look0:[50,95],hide:[[66,77,57,72]],
      N:{home:[77,90],th:[72,75],arena:[60,63],n:[54,59],bt:[40,55],tlb:[33,64],cpu:[31,72],drum:[78,49],sf:[66,48.8],s1:[64.5,40],st:[61,34.4],gal:[52,35.2],stage:[43,36],wing:[20,40]},
      E:"home-th th-arena arena-n n-bt bt-tlb tlb-cpu n-sf sf-drum sf-s1 s1-st st-gal gal-stage stage-wing",
      HS:{hbNet:["n",54,55,"bow"],hbCpu:["cpu",15,66,"bow"],hbCup:["stage",52,15,"bow"],hbSimul:["wing",20,34,"bow"],hbPvp:["th",72,60,"bow"],hbCar:["drum",80,40,"wave"]}},
    fx:{fw:[[64,7],[74,5],[84,9],[70,12],[58,6]],cy:[["weijin",22,16,8],["nanbei",76,15,7],["sui",88,19,7]]},
    sw7:{sky:[[[0,0],[2560,0],[2560,320],[0,320]]],fg:null,tr:null}},
  /* 學習分頁（07y 藏譜石窟）經典世界、白天、沒有季節的那一張：output/w107-ipad/l1610/hubmap/learn，取代 HUB_CL_SPOTS.learn、SHW_HUB_CL.learn。
     走路：大卷軸上中庭，進殿門（隱身）從頂上拱洞出來；戰績站木人樁平台抬頭看書塔（書塔底是書堆斜坡站不住）。fx.cy 朝代殘影 [朝代, 左%, 上%, 寬%]，只放天空 */
  "hubmap/learn_classic":{ready:true,f:"hubmap/learn_classic_l1610",w:2560,h:1600,
    S:{hbGuess:[50,15.2],hbDb:[50,28],hbQuiz:[50,44.8],hbTerms:[48,75.2],hbStats:[20,26.4],hbCamp:[19,49.6],hbCanju:[15,71.2],hbOpen:[77,25.6],hbTheme:[80,44.8],hbRedo:[77,69.6]},exit:[86,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,h:[.033,29,.0007],look0:[50,99],hide:[[43,57,22,45]],
      N:{home:[50,92],g:[50,82],c:[50,64],t1:[50,59],exam:[50,53.6],door:[50,47],hb:[50,22.4],guess:[50,20],lc:[37,61],camp:[22,60],canju:[24,82],rc:[64,61],open:[70,60],theme:[82,60],redo:[68,70]},
      E:"home-g g-c c-t1 t1-exam exam-door door-hb hb-guess t1-lc lc-camp g-canju t1-rc rc-open open-theme rc-redo",
      HS:{hbTerms:["g",48,75,"bow"],hbCamp:["camp",19,50,"wave"],hbCanju:["canju",15,71,"bow"],hbRedo:["redo",77,69,"wave"],hbTheme:["theme",80,45,"wave"],hbQuiz:["exam",50,45,"bow"],hbStats:["camp",20,27,"wave"],hbOpen:["open",77,26,"wave"],hbGuess:["guess",50,15,"wave"],hbDb:["door",50,28,"bow"]}},
    fx:{cy:[["tang",10,9,6],["wudai",36,8,7],["song",84,10,6]]},   /* 殘影以中心定位，量到的上 2～3% 會被頂欄切掉一半；11/25 模擬器上看過往下移到 8～9%（還在天空，不壓書塔、書架）；筒車縮成 6% 寬、往下 1%，四張夜景各自畫的新月都不會碰到 */
    sw7:{sky:[[[0,0],[2560,0],[2560,256],[0,256]]],fg:null,tr:null}},
  /* 線上大廳（07x2 千燈天井）經典世界白天：output/w107-ipad/l1610/lobbymap。都是 %（sw7.sky 是像素）。
     燈是功能（亮燈＝線上玩家，點了看玩家），44 盞照 LM_[[14,32.3,2,1],[19,31.1,2,1],[24,29.8,2,1],[29,28.5,2,1],[71,28.5,2,1],[76,29.8,2,1],[81,31.1,2,1],[86,32.3,2,1],[40,22.3,2,1],[45,22.3,2,1],[50,22.3,2,1],[55,22.3,2,1],[60,22.3,2,1],[36,19,2,0],[64,19,2,0],[33,25,2,0],[67,25,2,0],[40,17,2,0],[60,17,2,0],[34,39.2,1,0],[38,39.2,1,0],[42,39.2,1,0],[46,39.2,1,0],[50,39.2,1,0],[54,39.2,1,0],[58,39.2,1,0],[62,39.2,1,0],[66,39.2,1,0],[14,45.8,1,0],[19,44.6,1,0],[24,43.3,1,0],[29,42.0,1,0],[71,42.0,1,0],[76,43.3,1,0],[81,44.6,1,0],[86,45.8,1,0],[20,58,1,1],[24,54,1,1],[28,51,1,1],[80,58,1,1],[76,54,1,1],[72,51,1,1],[37,47,1,1],[63,47,1,1]] 格式 [左%, 上%, 層, 剪影]，新圖沒畫燈籠，燈照樣由程式畫；人影的 top 是腳底（translate -100%），
     二樓 y+10.5、地面柱燈 y+7.5 照舊。棋桌 8 張、鑼（中心、直徑＝圖寬 %）、「＋N 人」「更多棋局」、清靜提示。
     fx.k＝棋桌、燈、人影、聲波的寬度倍數（原本照直圖寬度定的，橫式圖寬很多，11/25 模擬器上看定）。身高照原本的函式，下限 53 改成樓梯腳 58 */
  "lobbymap/lobby_classic":{ready:true,f:"lobbymap/lobby_classic_l1610",w:2560,h:1600,
    S:{lmGong:[51.5,55],lmList:[87,22],lmAi:[14,30]},exit:[14,92],
    safe:{l:.12,r:.12,t:.05,b:.10},
    walk:{W:2560,H:1600,h:y=>.06+(Math.max(y,58)-80)*.0008,look0:[50,60],
      N:{home:[50,96],g:[50,86],l0:[26,76],l1:[24,60],ai:[20,54],r0:[74,76],r1:[72,62],sgn:[76,58],s0:[70,58],s1:[68,43],st:[65.5,31],gal:[60,31],stage:[52,31]},
      E:"home-g g-l0 l0-l1 l1-ai g-r0 r0-r1 r1-sgn r1-s0 s0-s1 s1-st st-gal gal-stage",
      HS:{lmGong:["g",51.5,66,"cheer"],lmList:["sgn",87,22,"bow"],lmAi:["ai",14,30,"bow"]}},
    fx:{k:.38,gong:{x:51.5,y:65.6,d:6.2},tables:[[32,64],[40,64],[60,64],[68,64],[32,74],[40,74],[60,74],[68,74]],lamps:[[14,32.3,2,1],[19,31.1,2,1],[24,29.8,2,1],[29,28.5,2,1],[71,28.5,2,1],[76,29.8,2,1],[81,31.1,2,1],[86,32.3,2,1],[40,22.3,2,1],[45,22.3,2,1],[50,22.3,2,1],[55,22.3,2,1],[60,22.3,2,1],[36,19,2,0],[64,19,2,0],[33,25,2,0],[67,25,2,0],[40,17,2,0],[60,17,2,0],[34,39.2,1,0],[38,39.2,1,0],[42,39.2,1,0],[46,39.2,1,0],[50,39.2,1,0],[54,39.2,1,0],[58,39.2,1,0],[62,39.2,1,0],[66,39.2,1,0],[14,45.8,1,0],[19,44.6,1,0],[24,43.3,1,0],[29,42.0,1,0],[71,42.0,1,0],[76,43.3,1,0],[81,44.6,1,0],[86,45.8,1,0],[20,58,1,1],[24,54,1,1],[28,51,1,1],[80,58,1,1],[76,54,1,1],[72,51,1,1],[37,47,1,1],[63,47,1,1]],more:{people:[87,33],games:[60,93]},quiet:[50,78]},
    sw7:{sky:[[[768,0],[1843,0],[1843,128],[768,128]]],fg:null,tr:null}}};
/* 對戰、學習分頁的季節、夜景圖（07y hbImg：<名>_classic_<季>[_night]，夏季＝原圖）也有橫式圖（開發者 11/25「要」）：
   Windows Claude 1 拿 classic 橫式圖當構圖基準、季節原圖當樣貌參考，只換天空、光線、植物、積雪、燈火，入口、走路、疊圖座標都跟 classic 條目共用。
   夏季跟原圖逐位元一樣：_summer 用 classic 的橫式圖、_summer_night 用 _night 的橫式圖。夜景沒有綁在月亮位置的東西（月亮熱區只在首頁） */
const SCW_SEA=["night","spring","spring_night","summer","summer_night","autumn","autumn_night","winter","winter_night"];
for(const b of["hubmap/battle_classic","hubmap/learn_classic"]){const B=SCW[b];if(!B)continue;
  for(const q of SCW_SEA)SCW[b+"_"+q]=Object.assign({},B,{f:q==="summer"?B.f:q==="summer_night"?b+"_night_l1610":b+"_"+q+"_l1610",base:b})}
/* 朝代日間（開發者 11/25「13個朝代都要做」「先做日間 48 張」）：Windows Claude 1 拿經典版橫式圖當構圖基準、朝代原圖當參考重畫，
   座標沿用經典版條目；檔名＝<原圖鍵>_l1610。這裡先登記座標能沿用的 35 張（對戰、大廳各 12，挑戰電腦 3，殘局 3，今日推薦 4，棋力測驗 1）。
   學習（書院構圖跟經典版不同，另外量一套座標）、錯棋重練原圖（要加回洗墨池、晾冊竹竿）等座標到了再接。
   殘局魏晉、唐兩組：茶器照經典版橫式（條目有 ves，07c2 用橫式圖時就不套 CJM_VES_G）。夜景、四季之後再說 */
const SCW_ERA={"hubmap/battle_classic":["hubmap/battle",..."qin han sanguo weijin nanbei sui tang wudai song yuan qing".split(" ").map(e=>"hubmap/battle_"+e)],
  "lobbymap/lobby_classic":["lobbymap/lobby",..."qin han sanguo weijin nanbei sui tang wudai song yuan qing".split(" ").map(e=>"lobbymap/lobby_"+e)],
  "cpuroom/cpuroom_day_classic":["cpuroom/cpuroom_day","cpuroom/cpuroom_day_han","cpuroom/cpuroom_day_song"],
  "canjumap/canju_day_classic":["canjumap/canju_day","canjumap/canju_day_weijin","canjumap/canju_day_tang"],
  "todaymap/today_day_classic":["todaymap/today_day","todaymap/today_day_han","todaymap/today_day_weijin","todaymap/today_day_tang"],
  "exammap/exam_day_classic":["exammap/exam_day"]};
for(const b in SCW_ERA){const B=SCW[b];if(!B)continue;for(const k of SCW_ERA[b])if(!SCW[k])SCW[k]=Object.assign({},B,{f:k+"_l1610",base:b})}
const SCW_BAD={};   /* 這次開 App 載不到的橫式圖（鍵＝原圖鍵），退回原圖不再試 */
/* 圖網址 → 鍵（data/ 之後、不含 .webp 和 ?v=） */
const scwKey=src=>{const m=/(?:^|\/)data\/([^?#]+?)\.webp(?:[?#]|$)/.exec(src||"");return m?m[1]:""};
const scwDev=()=>{try{return localStorage.getItem("xqScwDev")==="1"}catch(e){return false}};
function scwEntry(key){const e=SCW_ON&&key&&Object.prototype.hasOwnProperty.call(SCW,key)?SCW[key]:null;return e&&((e.ready&&SCW_CDN)||scwDev())&&!SCW_BAD[key]?e:null}
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
/* 載不到橫式圖：記 SCW_BAD（這次開 App 不再試），退回原圖 */
/* 00-util 在 window 用擷取監聽：同源圖片載不到時先把 src 改成 XQ_CDN、記 cdnTry=1，再交給這裡的 onerror。
   這時候還在等 CDN 那次的結果，不能馬上退回（退回會把 CDN 補抓蓋掉；經典版原圖只在 CDN，同源網址又 404，cdnTry 已設就破圖）——
   記住正在等的網址，CDN 那次也失敗（同一個網址再錯一次）才退回（iMac Claude 2 複審 #155） */
function scwFail(P){const o=P&&P._scw;if(!o||!P.dataset.scw)return;const im=P.querySelector(":scope>img"),u=im?String(im.getAttribute("src")||im.src||""):"";
  if(im&&im.dataset&&im.dataset.cdnTry&&typeof XQ_CDN==="string"&&u.indexOf(XQ_CDN)===0&&im._scwCdn!==u){im._scwCdn=u;return}
  SCW_BAD[o.key]=1;scwSet(P,"")}
function scwMount(P,o){if(!P||!o||!o.key)return;P._scw=o;if(P.dataset.scw==null)P.dataset.scw="";P.classList.toggle("scw-l",!!P.dataset.scw);
  /* 頁面原本的 onerror（07y、07x2：夜景載不到退回日景）記下來，換回原圖時還原；開頁就是橫式圖（scwPre）也要掛載不到退回（審查 #155 擋合併那項，照 07z:209） */
  const im=P.querySelector(":scope>img");if(im){o.err0=im.onerror;if(P.dataset.scw){im.onerror=()=>scwFail(P);if(im.complete&&!im.naturalWidth&&im.getAttribute("src"))scwFail(P);
      /* 圖還在載：07fl 第一次排版時 scwSync 回 "wait"、先照未排版顯示，圖載好要叫它再排一次（原地換圖那條路 scwSet 有掛，開頁這條以前漏了：
         Android 平板直接開 #/canju，橫式圖放得很大、標籤照圖框 % 擺，看起來偏到左下，要等別的事觸發重排才對） */
      if(!im.complete&&im.addEventListener)im.addEventListener("load",scwRelay(P),{once:true})}}
  scwPlace(P)}
const scwOn=P=>!!(P&&P._scw&&P.dataset.scw);
const scwCur=P=>scwOn(P)?scwEntry(P._scw.key):null;
/* 入口標籤、圖上出口照現在用的那張圖擺；原位記在 data-scw-l／data-scw-t（07t3 ttL、07w9 exL/exT、00-util xqTop0 是它們自己記的原位，換位置時清掉，不然會被還原回上一張圖的位置） */
function scwPut(b,xy){if(!b)return false;if(!xy&&b.dataset.scwL==null)return false;   /* 從來沒換過位置的不碰（手機、直向照舊，不清 00-util、07w9 記的原位；審查 #155 第 2 項） */
  if(b.dataset.scwL==null){b.dataset.scwL=b.dataset.exL!=null?b.dataset.exL:b.style.left;b.dataset.scwT=b.dataset.exT!=null?b.dataset.exT:b.style.top}
  const L=xy?xy[0]+"%":b.dataset.scwL,T=xy?xy[1]+"%":b.dataset.scwT;if(b.dataset.scwAt===L+","+T)return false;
  b.dataset.scwAt=L+","+T;b.style.left=L;b.style.top=T;b.style.marginLeft="";delete b.dataset.ttL;delete b.dataset.exL;delete b.dataset.exT;delete b.dataset.xqTop0;return true}
function scwPlace(P){const o=P&&P._scw;if(!o)return;const e=scwCur(P);
  for(const id of o.ids||[])scwPut(P.querySelector("#"+id),e&&e.S?e.S[id]:null);
  const x=P.querySelector(":scope>.ex-spot");if(x&&scwPut(x,e&&e.exit?e.exit:null)&&typeof exIn==="function")try{exIn(x)}catch(z){}}
/* 圖載好叫 07t3 ttFill 再排一次（07fl 包的 r07Wide 會再問 scwSync） */
const scwRelay=P=>()=>{if(!P.isConnected)return;try{if(typeof ttFill==="function")ttFill()}catch(x){}try{if(typeof spfSoon==="function")spfSoon(0)}catch(x){}};
/* 原地換圖（k＝"l1610"／""）、換座標、各頁疊圖、走路角色 */
function scwSet(P,k){const o=P&&P._scw,im=P&&P.querySelector(":scope>img");if(!o||!im)return;const e=k?scwEntry(o.key):null;if(!e)k="";
  P.dataset.scw=k;P.classList.toggle("scw-l",!!k);
  const src=k?scwSrc(e):o.src0;
  if(im.getAttribute("src")!==src){im.onerror=k?()=>scwFail(P):(o.err0||null);if(im.dataset)delete im.dataset.cdnTry;im._scwCdn="";   /* 換網址就清掉 00-util 的 cdnTry，新網址載不到時它才會再去 CDN 補抓 */   /* 換回原圖時還原頁面原本的 onerror（審查 #155 第 4 項） */
    im.addEventListener("load",scwRelay(P),{once:true});
    im.src=src}
  scwPlace(P);try{if(o.apply)o.apply(e)}catch(x){}scwWalk(P,e)}
/* 走路角色掛的是哪一組節點（P._scwW）跟現在不同＝收掉舊的，用新的那組重掛（照 07z hmwWalk） */
function scwWalkCfg(o,e){const c0=o.cfg0||{};if(!e||!e.walk)return c0;const H={};for(const n in c0.HS||{})H[n]=(c0.HS[n]||[]).slice();for(const n in e.walk.HS||{})H[n]=e.walk.HS[n].slice();return Object.assign({},c0,e.walk,{HS:H})}
function scwWalk(P,e){const o=P._scw;if(!o||!o.cfg0)return;const key=e?"l":"";if((P._scwW||"")===key)return;P._scwW=key;const cfg=scwWalkCfg(o,e);try{if(o.onCfg)o.onCfg(cfg)}catch(x){}
  if(!P.dataset.shw)return;const V=P.parentNode;if(!V)return;
  P.querySelectorAll(":scope>.shw,:scope>.shw-me,:scope>.shw-hint,:scope>.shw-say,:scope>.shw-menu").forEach(x=>x.remove());delete P.dataset.shw;P.classList.remove("shw-iso");
  try{if(typeof shwPage==="function"&&typeof SHIP_WALK_ON!=="undefined"&&SHIP_WALK_ON){shwPage(V,cfg,o.pfx);if(o.onWalk)o.onWalk(cfg)}}catch(x){}}   /* onWalk：重掛之後各頁要補的（07y 的隱身範圍 hbHide） */
/* 07fl 包的 r07Wide 每次排版前問這裡：沒掛＝null；比例跨過門檻＝原地換掉、回 "wait"（圖載好會再排一次）；用橫式圖＝"l1610"；原圖＝null（照原本排） */
function scwSync(V,P){const o=P&&P._scw;if(!o||!V)return null;const k=scwPick(V,P,o.key),cur=P.dataset.scw||"";
  if(k!==cur){scwSet(P,k);return"wait"}
  scwPlace(P);if(!k)return null;const im=P.querySelector(":scope>img");if(!im)return"wait";
  if(im.complete&&!im.naturalWidth&&im.getAttribute("src")){scwFail(P);return"wait"}   /* 載完了卻沒有寬＝載不到（onerror 沒接到也一樣退回，不會一直等） */
  if(!im.complete)return"wait";return k}
/* 把 w×h 的方塊貼到四角 q（左上、右上、右下、左下，圖框內的 px）上的 CSS transform（transform-origin 要 0 0；跟 07y5 tdM3 同一套） */
function scwM3(w,h,q){const[[x0,y0],[x1,y1],[x2,y2],[x3,y3]]=q,dx1=x1-x2,dx2=x3-x2,dx3=x0-x1+x2-x3,dy1=y1-y2,dy2=y3-y2,dy3=y0-y1+y2-y3,den=dx1*dy2-dx2*dy1;
  const g=(dx3*dy2-dx2*dy3)/den,hh=(dx1*dy3-dx3*dy1)/den,a=x1-x0+g*x1,b=x3-x0+hh*x3,d=y1-y0+g*y1,e=y3-y0+hh*y3;
  return`matrix3d(${a/w},${d/w},0,${g/w},${b/h},${e/h},0,${hh/h},0,0,1,0,${x0},${y0},0,1)`}
/* 橫式圖網址 → 它的條目（07y 朝代殘影這種「照圖網址找座標」的共用表用；不是登記表裡的回 null） */
function scwByF(src){const f=scwKey(src);if(!f)return null;for(const k in SCW)if(SCW[k].f===f)return SCW[k];return null}
const scwSafe=P=>{const e=scwCur(P);return e&&e.safe||null};
/* 07w7 sw7Page 遇到橫式圖：不是登記表裡的（例如首頁 home_l1610）回 undefined，照原本找；是的話條目有 sw7 用它，沒有就不下雨雪 */
function scwSw7(src,base){const f=scwKey(src);if(!f)return undefined;for(const key in SCW){const e=SCW[key];if(e.f!==f)continue;const o=base("data/"+key+".webp");if(!o)return null;
    return e.sw7?Object.assign({},o,e.sw7,{W:e.w,H:e.h}):{k:o.k,re:o.re,rg:o.rg,m:"in"}}
  return undefined}
