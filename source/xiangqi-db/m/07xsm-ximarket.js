/* ================= 🏮 西市：首頁橋左邊的生活場景（開發者 11/13；文案照 story/西市文案定稿草案_1113.md，第五節 18 項全照推薦；前綴 xsm／XSM，11/13 grep 過沒撞名：xm 已被 01-board 的混音器用掉）=================
   路由 #/ximarket（西市外景）、#/ximarket/tea（聽雨茶坊內景）、#/ximarket/dark（茶坊的臺灣暗棋，07xsd）（02-shell）。
   入口：首頁橋左邊一個「🏮 西市」場景標籤（#hmXsm；跟 07gxt 觀星臺一樣包 07z 的 Home／hmwSet，不改 HM_SPOTS、不動 07y；原圖、iPad 直版 p34、橫版 l1610 各一組座標 XSM_HOME，避開左岸告示牌）。
     只在千秋時光之苑（經典世界 hbIsCl）出現（第 1 項 A）；領過七星授印禮（07mnq 存檔 "mnq".gift.a1）才出現（第 2 項 B）；開發者模式一律看得到。網址直接進、還沒解鎖＝回首頁。
     第一次進來以前首頁標籤是 .hot（第 17 項；之後「有禮可領、有人來訪」也要亮，等那兩個玩法做好再接，不加紅點數字）。
   場景圖 data/ximarket/（park/ximarket 轉來，process_art.py MAPS["ximarket"]）：外景白天 xm_day、夜景 xm_night（768×1376，器物位置相同，座標共用）；茶坊內景 xm_tea。只有直幅。
     日夜：11/17 開發者選單改成「全部照實際日落」（取代第 3 項 A 的照時辰）：問 00-util xqNight，跟首頁同一個判斷；頁面開著每分鐘看一次，跨過日落、日出會自己換；一張載不到就換另一張（XSM_BAD）。
     茶坊窗外固定下雨（第 18 項 A，程式畫的雨；減少動態時不動）；茶坊只有一張圖，夜裡蓋一層暗藍（日夜跟著西市換）。
     11/17 冬景：立冬～大寒三張都換 _winter 版（xsmSrc，季節跟首頁同一個判斷 07w7 sw7WinterNow）；茶坊冬天窗外畫的是雪，程式畫的雨改成細小、慢慢飄的雪（data-win）。
   標籤只放大字、不放圖示（第 5 項 A：寫玩法名）：領禮物＝櫃坊、七星來訪＝老槐樹下、找棋子＝棋具攤、暗棋＝聽雨茶坊、聽曲＝樂棚（第 10 項 A）。
     這一版只做場景頁：「暗棋」這一攤可以進茶坊看內景；其他攤灰色帶鎖，點了跳「還沒開張，敬請期待。」（第 12 項 A）。
     11/14 開發者：茶坊中間的暗棋桌第一個開張，點了到 #/ximarket/dark 玩臺灣暗棋（07xsd-xsmdark.js，對電腦）。
   第一次進來跳介紹卡（定位句＋介紹，第一節）。出口照 07w9 圖上出口：外景＝市門「🏘 回棋鎮」，茶坊＝「↩ 回西市」（07w9 EXITS）。
   走路角色：外景接 07w shwPage（座標表 XSM_WALK，量 park/ximarket/xm_day.png）；茶坊內景不放走路角色。
   存檔鍵 xsmSeen（05b JOURNEY_KEYS）。平日體力 07dgl：#/ximarket 不在星槎、也不在「不算」那組，照預設算人間。
   純計算 xsmGot／xsmDay／xsmPickDay／xsmSrc／xsmSpots 不碰 DOM，測試 xiangqi-lab/tools/test-ximarket.js 用 vm 跑。
   還沒做：考究說明卡（出處待史學顧問核）。
   11/16 開發者：其他四攤開張（文案照定稿草案第一節第 5、6 項；第五節第 7、8、9、17 項照推薦），標籤不再帶鎖：
     領禮物（雲河櫃坊）：列出 07mnq 的大禮包——還沒領的（授印禮、破局錦囊、停靠過的每一朝的遠征補給）點了就領（mnqGift 儀式，發的東西照 07mnq），領過的點了再看一次。不另外發新東西、不加新貨幣。
       11/16 晚開發者「領禮物的實用性和樂趣太低」→ 提案 story/gemini_app/173，選單定「開櫃取帖＋飛錢寄櫃的見面禮、遠征補給、每週平安信」（純計算與存檔見 xsmTieDraw 那一段）：
       每天兩張明牌＋一張蓋牌挑一張（星輝 30、星塵 3～5、悔棋符 1、提示棋 1、修為 20；蓋牌 5% 是積灰的小木匣＝將令或珍品），節氣當天多一張節禮帖；沒來的日子替你收三天；
       寄來的包裹點了先合券（xsmQj）再開；07mnq 的舊禮收進「收過的禮」。只用現有資源，不加新貨幣、不加存檔鍵（都在 xsmStall 的 g、p）。
     七星來訪（老槐樹下）：每天保證有一位，只挑已加入的夥伴（07pty ptyHas），不挑陪在身邊的那位（首頁小人 myChar，跟 07j 一樣）；同一天固定同一位（存 xsmStall.v）。
       說一句西市招呼（XSM_V7，主句／備用照日期輪；雷借花主句分日夜）；他手上有 07j 的請託就接 07j 的任務卡（v7Sheet，謝禮照 07j 15 修為），沒有就送一份小禮（每天一次 +10 修為）。
       見到了也記進 07j 的 visit7（算進每天 3 位、來過幾次）。只有自己一個人（還沒有別的夥伴）＝「今天很清靜」。
     找棋子（棋具攤）：每天 1 顆，七顆一副（俥傌帥仕相兵炮，照 07pty 加入順序）；藏點每天從 XSM_HIDE 13 處挑一處（照日期算，同一天同一處、跟前一天不同）；
       外景圖上畫一顆小棋子，點到它 28px 內就算找到（07q bdNear 的做法，量的是畫面上的 px）；+10 修為，湊齊七顆再 +50 修為和一次蓋印。修為紀錄用 xsmf:<日期>、xsmf7:<第幾副> 當鍵，同一顆不會給兩次。
     聽曲（西市樂棚）：停靠過的朝代（shipDockList＋青石園），那一朝 7 首全收（data/bgm/index.json）；點了用 01-board 的背景音樂播（bgmForce「朝代/檔名」），再點一下停＝換回西市的背景配樂。
     西市背景配樂（第 13 項的「西市燈影」「聽雨暗棋」還沒有檔，先借三首；茶坊、暗棋同一組）：白天＝漢 han/paixiao_6（排簫）、唐 tang/pipa_1（琵琶）輪流（漢唐長安的西市）；
       夜裡＝宋 song/qin_3（古琴）、唐 tang/pipa_1 輪流（說明卡寫的「借宋代夜市和唐代上元燈會」）。離開 #/ximarket 就還給朝代配樂（bgmForce(null)）；背景音樂關著就不放。
     首頁「🏮 西市」、外景的「領禮物」「七星來訪」：有禮可領、有人來訪還沒見到時發亮（.hot，第 17 項 A，不加數字）。存檔鍵 xsmStall（05b JOURNEY_KEYS）。 */
const XSM_ON=true,XSM_IMGV="1117";   /* 圖的版本：同檔名換圖時改掉，手機才會重抓（11/17 加冬景三張改 1117） */
const XSM_OFF="還沒開張，敬請期待。";
const XSM_TX={pos:"各朝的貨色，都在這裡湊成一市。",intro:"西市，原本是城西那座市集的名字。漢朝、唐朝的長安城都有。千秋時光之苑不屬於任何朝代，各朝的貨色就都擺到這裡來了。"};
/* [id, 大字, 左%, 上%, 還沒開張？]（量 xm_day 768×1376；標籤放在攤位上方，不擋主體） */
const XSM_SPOTS=[
  ["xsmGift","領禮物",17,39,0],   /* 左邊櫃坊：櫃台上的布簾（11/16 開張） */
  ["xsmMusic","聽曲",64,47.5,0],   /* 樂棚：掛琵琶、拍板的木架上方（11/16 開張） */
  ["xsmTea","暗棋",86,44,0],   /* 右邊聽雨茶坊：竹簾 */
  ["xsmChess","找棋子",38,61,0],   /* 左下棋具攤：棋盒、棋子袋那張桌子上方的簷下（11/16 開張） */
  ["xsmVisit","七星來訪",81,74,0]];   /* 市門右邊的老槐樹：樹下石墩、木凳上方（11/16 開張） */
const XSM_TEA_SPOTS=[["xsmDark","暗棋",50,44,0]];   /* 茶坊中間那張暗棋桌（量 xm_tea 768×1376）；11/14 開張：點了開一盤臺灣暗棋（07xsd-xsmdark.js） */
const XSM_HOME={"":[16,59],p34:[16,60],l1610:[19,71]};   /* 首頁橋左邊（跟觀星臺 GXT_HOME 左右對稱，再往下挪開左岸告示牌；原圖量 home_classic 768×1376，p34 量 1536×2048，l1610 量 2560×1600） */
/* 11/17 測試員 B 第 29 輪 N29-7：茶坊不放走路角色，到處走的小帥（src/bot3d.js）照「禁區」挑空位，整張圖都沒有禁區，就會站到窗框、櫃台茶壺上。
   bot3d 不動（src）：在圖上蓋四塊透明、不攔點選的禁區（data-bot-avoid，bot3d KO_T 會避開），只留暗棋桌前、櫃台左邊那塊地面（左 26～54%、上 50～77%，量 xm_tea 768×1376；冬景同位置）。
   [左, 上, 右, 下] %：上半（牆、窗、花架）、左邊（兩張方桌和條凳）、右邊（櫃台、燈籠）、下面（櫃台前緣和最下面的條凳） */
const XSM_TEA_FLOOR=[26,50,54,77];
const XSM_TEA_NOBOT=(F=>[[0,0,100,F[1]],[0,F[1],F[0],100],[F[2],F[1],100,100],[F[0],F[3],F[2],100]])(XSM_TEA_FLOOR);
const xsmTeaNoBot=()=>XSM_TEA_NOBOT.map(r=>`<i class="xsm-nobot" data-bot-avoid aria-hidden="true" style="left:${r[0]}%;top:${r[1]}%;width:${r[2]-r[0]}%;height:${r[3]-r[1]}%"></i>`).join("");
const XSM_RAIN=[[53,12,60,31],[69.5,14,82,36]];   /* 茶坊窗外看得到雨的兩塊（左、上、右、下 %） */
const XSM_BAD={};   /* 這次開 App 載不到的圖（d＝白天、n＝夜景），換另一張不再試 */
/* ---------- 11/16 四攤的資料 ---------- */
Object.assign(XSM_TX,{
  gift:"櫃坊，是唐朝長安西市替人保管錢財的店。存的人憑著約好的憑據來取，櫃上認得了，才把東西交出去。櫃上每天寫的帖，就是這樣的憑據。",
  v1:"老槐樹下有人停下腳步，像是在等{你}。",v0:"老槐樹下今天很清靜，還沒有人來。",vGot:"今天的小禮收下了。",
  c0:"攤上的棋子散了一地。七種棋子各少一顆，藏在西市的角落裡，幫攤主找回來吧。",c1:"哎呀，少了好幾顆！少一顆，這副棋就下不成了。",c2:"找到了，就是這顆。",c3:"一副棋，一顆都不能少。多謝{你}。",cDone:"今天這顆找到了，明天再來幫我看看。",
  mu:"旅途中聽過的曲子，都收在這裡。想再聽一遍，就來樂棚坐坐。",mu2:"唐朝有一年長安大旱，東市、西市搭樓比賽彈奏求雨。東市請來第一名的琵琶手，西市樓上卻有人彈得更好。",
  muMore:"星槎停靠新的朝代，那一朝的曲子就會收進樂棚。",muOff:"背景音樂關著：到設定 → 聲音打開，才聽得到。"});
/* 七星到西市的招呼（定稿草案第一節第 6 項）：[主句, 備用]；雷借花主句分 [夜, 白天]。{名}、{你} 照 07j v7Txt 換 */
const XSM_V7={x_swordboy:["這裡的街橫平豎直，像車轍。好走。","字我認不多。{名}，這價錢，{你}幫我看。"],
  x_miaogirl:["前頭擠？那我從旁邊繞過去，一樣到！","嘿嘿，我聞到燒餅香了！{名}，走嘛！"],
  x_shuai:["{名}，勞{你}稍候。這攤的秤，我想多看一眼。","難得這樣逛市集。原來市集的聲音，這麼熱鬧。"],
  x_shi:["人多。{你}走前頭，我在後面。","方庭在看秤。……沒事。"],
  x_spiritgirl:["人多，{名}，走近些，別走散了。","我想買些鹽，家裡的罐子快空了。"],
  x_bing:["問價、跑腿，我最快！{名}，要問哪一攤？","我不賭錢。翻暗棋就翻暗棋，誰輸了，再來一局！"],
  x_martialgirl:[["{名}！這邊這邊！好多燈，跟臨安的夜市一樣亮！","{名}！這邊攤子好多，我一攤都不想漏！"],"那聲鼓……不是打雷吧？不是就好！"]};
/* ---------- 11/16 櫃坊改版（開發者選單：開櫃取帖＋飛錢寄櫃的見面禮、遠征補給、每週平安信；提案 story/gemini_app/173）的文字 ----------
   掌櫃照唐代櫃坊說話：憑帖取物、合券；不用當鋪、當票、絕當這些明清的詞。{你}、{名} 照 xsmYou（07j v7Txt） */
Object.assign(XSM_TX,{
  gDay:"{你}來啦。今天的帖寫好了：兩張攤開，一張蓋著，挑一張帶走吧。",gNight:"鉦聲響過，市早散了。櫃上還留著一盞燈，今天的帖在這裡，挑一張吧。",
  gMany:"這幾天{你}沒來，帖都替{你}收著。一天一張，慢慢挑。",gDone:"今天的帖收過了。明天再來，櫃上會寫好新的。",
  gPick:"帖收好了。憑這張帖，東西就是{你}的。",gHid:"蓋著的那張，也是{你}自己挑的。打開看看。",gBox:"這只小木匣，是有人託櫃上轉交給{你}的。在櫃底擱久了，積了一層灰。",
  tieHow:"每天櫃上寫一份帖，挑一張帶走。沒來的日子，櫃上替{你}收著三天。",wk0:"這一週，櫃上一切平安。這一份，是櫃上給{你}的一點心意。",
  pkNar:"唐朝的商人出遠門，不扛一箱箱銅錢，先把錢交給各地設在京城的官署，或是富商人家，換一張券；到了地方，兩半券一合，就能取錢，叫作「飛錢」。夥伴從各朝寄來的東西，也照這個法子收在櫃上。",
  qj:"券的一半在櫃上，一半跟著東西寄來。兩半合得上，朱印對齊了，才能開封。",meetNote:"星輝可以在「雲河七星」卡冊分給新夥伴，幫忙追上大家。"});
/* 新夥伴加入的見面禮（齊轍一開始就在，沒有） */
const XSM_MEET_L={x_miaogirl:"嘿嘿，我上船啦！見面禮寄在櫃上了。{名}，等我追上大家，再一起去甲板看星星！",
  x_shuai:"{名}，勞{你}收下這份見面禮。我才剛走出九宮，許多事還不懂，往後還要請{你}指點。",
  x_shi:"見面禮，在櫃上。……收著就好。",
  x_spiritgirl:"剛上船，沒什麼好送的。見面禮寄在櫃上了，{名}記得去拿。路還長，慢慢走。",
  x_bing:"跑腿我最快，這回倒是託櫃坊寄的！{你}幫過我一回，我記著。見面禮，{名}收下啦！",
  x_martialgirl:"{名}！見面禮寄到櫃上啦！記住，我是雷借花——不是打雷的雷，是姓雷！"};
/* 每週平安信：「陪你走」那位寫，兩句照週輪 */
const XSM_WK_L={x_swordboy:["{名}，這七天的路，走得穩。鞋帶繫緊了，{你}也是。","我又認得兩個字了。寫歪了，就再寫一次。這一週，平安。"],
  x_miaogirl:["這一週我跑了好多地方，每次都先回頭喊一聲喔！{名}，{你}也要平平安安！","阿娘說，帽頂的紅珠子，跑多遠都看得見。{名}，我很好，{你}看得見嗎？"],
  x_shuai:["這一週，我問了許多問題，也記下許多答案。{名}，{你}那邊可還安好？","勞{你}掛心。我很好，城子也很好……雖然他不說。"],
  x_shi:["平安。……{你}也是。","方庭很好。我也是。別擔心。"],
  x_spiritgirl:["這一週，我給大家沏了茶，也替{你}留了一碗。{名}，趕路前記得喝口熱的。","累了就坐一下。星槎不會丟下誰，我也不會。這一週，平安。"],
  x_bing:["這一週我跑了七趟腿，一趟都沒迷路！{名}，下回換我替{你}送信啦！","小梅說，坐下來等一等也不會怎樣。我試了……還是好想跑！{名}，平安喔！"],
  x_martialgirl:["{名}！這一週沒打雷！……我是說，我很好！","我這一週都有小聲說話喔！……好啦，大部分的時候。{名}也要平安！"]};
/* 節禮帖：節氣當天掌櫃說的一句（節氣日照 07y5 TD_TERMS）。立春春盤見杜甫〈立春〉；清明掃墓見唐玄宗開元二十年許寒食上墓；鉦聲散市見《唐六典》兩京諸市署（待史學顧問核） */
const XSM_TERM_L={"小寒":"小寒到了，一年裡最冷的日子就要來了。手凍了，就揣在袖子裡想棋。","大寒":"大寒，是二十四節氣的最後一個。冷過這幾天，春天就不遠了。",
  "立春":"今天立春。長安人家要吃春盤，生菜切得細細的，咬一口，春天就來了。","雨水":"雨水，天暖了，下的不再是雪，是雨。","驚蟄":"驚蟄，春雷一響，躲在土裡過冬的蟲子都醒了。",
  "春分":"春分這天，白天和夜晚一樣長，像棋盤上的楚河漢界，兩邊剛好對半。","清明":"寒食、清明這幾天，人們去給先人掃墓，順路到郊外踏青。","穀雨":"穀雨，雨水多了，田裡的穀子喝飽了水，長得最快。",
  "立夏":"立夏了，天一天比一天熱。下棋找個樹蔭坐吧。","小滿":"小滿，麥粒一天天飽滿起來，還沒全滿，所以叫小滿。","芒種":"芒種，麥子帶著尖尖的芒，正好收割；稻子也要趕緊種下。",
  "夏至":"夏至這天，白天最長。太陽下山得晚，可以多下一盤再回家。","小暑":"小暑，熱起來了。櫃上備了涼水，喝一口再走。","大暑":"大暑，一年裡最熱的時候。慢慢想棋，別急出一身汗。",
  "立秋":"今天立秋。早晚吹起涼風，暑氣要慢慢退了。","處暑":"處暑的「處」，是停下來的意思。熱了一整個夏天，到這裡差不多停了。","白露":"白露，清早的草葉上掛著一顆顆露水，白白亮亮的。",
  "秋分":"秋分，白天和黑夜又一樣長了。從今天起，夜一天比一天長。","寒露":"寒露，露水摸起來涼涼的。出門記得多加件衣裳。","霜降":"霜降，清早的屋瓦上結了一層白霜。",
  "立冬":"今天立冬。秋天收的東西都收進倉裡，櫃上也替{你}收好一份。","小雪":"小雪，天冷了，開始飄起小小的雪。","大雪":"大雪，雪下得更大了。外頭冷，進來下盤棋暖暖身子。",
  "冬至":"冬至這天，白天最短、夜最長。過了今天，白天就一天天長回來了。"};
const XSM_VISIT_XP=10,XSM_FIND_XP=10,XSM_SET_XP=50,XSM_TOL=28;   /* 修為：小禮、找到一顆、湊齊一副（照 07j 請託 15、07q 找東西的量級）；點到藏點幾 px 內算找到 */
const XSM_PCS=["俥","傌","帥","仕","相","兵","炮"];   /* 一副七顆，照 07pty 加入順序（俥齊轍、傌駱躍梅、帥沈方庭、仕鐵連城、相田飛燕、兵步越溪、炮雷借花） */
/* 找棋子的藏點 [左%, 上%]（量 park/ximarket/xm_day.png 768×1376，日夜同位置；離五個攤位標籤、出口、市門都遠一點） */
const XSM_HIDE=[[10,20.5],   /* 池邊柳樹根 */
  [26,19.5],   /* 池裡的蘆葦邊 */
  [54,39.8],   /* 中間鋪子桌上的木箱旁 */
  [71,38.5],   /* 市樓的木柱腳 */
  [4.5,53],   /* 櫃坊旁的盆栽 */
  [77.5,56.5],   /* 茶坊門口的石階 */
  [66,58.5],   /* 樂棚木架的腳 */
  [27.5,69],   /* 棋具攤的小鼓凳 */
  [52.5,71],   /* 側放的木棋盤 */
  [15.5,79.5],   /* 棋具攤前的石階 */
  [34,87.5],   /* 夯土牆邊的矮樹叢 */
  [68,82],   /* 市門裡的木桶 */
  [92,91.5]];   /* 老槐樹下的石墩 */
/* 西市背景配樂（借三首；白天漢唐、夜裡宋夜市＋唐上元燈會，見最上面說明）。同一個陣列物件傳給 bgmForce，才認得出是西市放的 */
const XSM_BGM_D=["han/paixiao_6.mp3","tang/pipa_1.mp3"],XSM_BGM_N=["song/qin_3.mp3","tang/pipa_1.mp3"];
const XSM_MU={f:null};   /* 樂棚正在放的那首（朝代/檔名）；null＝放西市背景配樂 */
const XSM_INS={zheng:"古箏",bianzhong:"編鐘",paixiao:"排簫",xun:"塤",ruan:"阮",konghou:"箜篌",dizi:"笛子",pipa:"琵琶",xiao:"洞簫",qin:"古琴",morinkhuur:"馬頭琴",sanxian:"三弦",erhu:"二胡"};   /* 同 01-board bgmNow */
const XSM_ERAS=["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];   /* 沒有 shipOrder 時的朝代順序 */
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
function xsmOpen(){if(!XSM_ON)return false;   /* 11/16 選單「場景入口照玩家進度」：全部解鎖試玩也不打開西市入口 */
  /* 11/16 hspx P1 選單「打贏星門圍城才開」：跟觀星臺同一個條件（07gxt gxtWon：這一趟旅程的星門圍城或舊塔防贏過）；原本收下七星授印禮就開，新旅程一降落很快就拿到。xsmGot 留著不用 */
  try{return typeof gxtWon==="function"&&gxtWon(0,typeof bhtdProg==="function"?bhtdProg():store.get("bhtd",null),store.get("gsv",null))}catch(e){return false}}
/* 白天？11/17 開發者選單「日夜全部照實際日落」：問 00-util xqNight（跟首頁同一個判斷：07w7 sw7NightNow，當季日落、黃昏結束才入夜）。
   沒有 xqNight 才退回原本的時辰判斷：卯（05–07）～申（15–17）；時辰序號照 07w8 clkIdx（子＝0：23–01） */
function xsmDay(d){try{if(typeof xqNight==="function")return!xqNight(d)}catch(e){}d=d||new Date();let i;try{i=typeof clkIdx==="function"?clkIdx(d):NaN}catch(e){i=NaN}if(!(i>=0))i=Math.floor(((d.getHours()+1)%24)/2);return i>=3&&i<=8}
/* 想要白天／夜景 → 實際用哪一張（那張載不到就換另一張；兩張都壞就照原本那張） */
const xsmPickDay=day=>day?!XSM_BAD.d:(!!XSM_BAD.n&&!XSM_BAD.d);
/* 11/17 冬景（開發者選單「做 7 張、接進 App」）：立冬～大寒換 xm_day_winter、xm_night_winter、xm_tea_winter（gpt-image-2 照原圖換季，標籤、出口、13 個藏點都對齊原圖）；
   季節跟首頁同一個判斷（07w7 sw7WinterNow），日夜照舊 xsmDay（xqNight）。冬景載不到記在 XSM_BAD.wd／wn／wt，退回原圖。win 不給＝問現在是不是冬天 */
const xsmWinter=()=>{try{return typeof sw7WinterNow==="function"&&!!sw7WinterNow()}catch(e){return false}};
const xsmWk=(day,tea)=>"w"+(tea?"t":day?"d":"n");
const xsmSrc=(day,tea,win)=>{if(win===undefined)win=xsmWinter();const d=tea?false:xsmPickDay(day),w=win&&!XSM_BAD[xsmWk(d,tea)]?"_winter":"";
  return tea?`data/ximarket/xm_tea${w}.webp?v=${XSM_IMGV}`:`data/ximarket/xm_${d?"day":"night"}${w}.webp?v=${XSM_IMGV}`};
/* 標籤 [id,左,上,大字,還沒開張] */
const xsmSpots=L=>(L||XSM_SPOTS).map(s=>[s[0],s[2],s[3],s[1],!!s[4]]);
/* ---------- 11/16 四攤的純計算（不碰 DOM；test-xsm-stalls-1116.js 用 vm 跑） ---------- */
/* 字串雜湊（FNV-1a）：照日期挑人、挑藏點、挑句子，同一天算出來都一樣 */
function xsmHash(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
/* 前一天（"YYYY-MM-DD"） */
function xsmPrevDay(day){const m=/^(\d+)-(\d+)-(\d+)$/.exec(String(day||""));if(!m)return"";const d=new Date(+m[1],+m[2]-1,+m[3]-1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
/* 這一天藏在哪一處（XSM_HIDE 的序號）：照日期算；跟前一天同一處就往下挪一格 */
function xsmHideIdx(day){const n=XSM_HIDE.length,raw=d=>xsmHash("hide"+d)%n,i=raw(day),p=xsmPrevDay(day);return p&&raw(p)===i?(i+1)%n:i}
const xsmHideOf=day=>XSM_HIDE[xsmHideIdx(day)];
/* 點到的位置 p（圖上 %）離藏點 s（%）在 tol px 以內？w、h＝圖在畫面上的寬高（px） */
const xsmNear=(s,p,w,h,tol)=>!!(s&&p)&&Math.hypot((p[0]-s[0])*w/100,(p[1]-s[1])*h/100)<=(tol==null?XSM_TOL:tol);
/* 找棋子的進度：n＝這一副找到幾顆、sets＝湊齊幾副、day＝最後一次找到的日期、tot＝總共找到幾顆 */
const xsmFindNorm=F=>{F=F&&typeof F==="object"?F:{};return{n:Math.max(0,Math.min(6,F.n|0)),sets:Math.max(0,F.sets|0),day:typeof F.day==="string"?F.day:"",tot:Math.max(0,F.tot|0)}};
const xsmPieceOf=F=>XSM_PCS[xsmFindNorm(F).n];
/* 這一天找到一顆：同一天找過＝null（不再給）；回 {F 新進度, pc 找到哪顆, full 湊齊了沒, xp 這次總共給多少} */
function xsmFindGo(F,day){F=xsmFindNorm(F);if(!day||F.day===day)return null;const pc=XSM_PCS[F.n],n=F.n+1,full=n>=XSM_PCS.length;
  return{F:{n:full?0:n,sets:F.sets+(full?1:0),day,tot:F.tot+1},pc,full,xp:XSM_FIND_XP+(full?XSM_SET_XP:0)}}
/* 今天誰來老槐樹下：mem＝已加入的夥伴、look＝陪在身邊的那位（不來）；prev＝存檔裡今天已經挑好的 {d,c}（還在名單裡就照舊，同一天不換人） */
function xsmVisitPick(day,mem,look,prev){const L=(mem||[]).filter(c=>c!==look&&XSM_V7[c]);if(!L.length)return null;
  if(prev&&prev.d===day&&L.includes(prev.c))return prev.c;return L[xsmHash("visit"+day)%L.length]}
/* 招呼哪一句：照日期在主句、備用之間輪；雷借花主句分日夜 */
function xsmVisitLine(c,day,isDay){const A=XSM_V7[c];if(!A)return"";let s=A[xsmHash(c+day)%2];if(Array.isArray(s))s=s[isDay?1:0];return s}
/* 樂棚收了哪幾朝：O＝航線順序、D＝停靠過的站（shipDockList；沒有旅程＝null）；青石園一開始就在 */
const xsmMuEras=(O,D)=>(O||XSM_ERAS).filter((e,i,a)=>a.indexOf(e)===i&&(e==="classic"||(Array.isArray(D)&&D.includes(e))));
/* 樂棚的曲目：IX＝data/bgm/index.json；每朝 7 首全收 → ["朝代/檔名"] */
const xsmMuList=(eras,IX)=>(eras||[]).flatMap(e=>((IX||{})[e]||[]).map(f=>e+"/"+f));
/* 櫃坊的禮：S＝07mnq 存檔、E＝mnqEnv()、D＝停靠過的站。還沒領的排前面；授印禮要有角色、破局錦囊要贏過，遠征補給是停靠過的每一朝（青石園沒有） */
function xsmGifts(S,E,D){S=S||{};E=E||{};const G=S.gift||{},A6=G.a6||{},o=[];
  if(G.a1||E.hasChar)o.push({k:"a1",got:!!G.a1});if(G.a2||E.firstWin)o.push({k:"a2",got:!!G.a2});
  const eras=(Array.isArray(D)?D:[]).filter(e=>e!=="classic");for(const e of Object.keys(A6))if(A6[e]&&!eras.includes(e))eras.push(e);
  for(const e of eras)o.push({k:"a6",era:e,got:!!A6[e]});
  return o.filter(g=>!g.got).concat(o.filter(g=>g.got))}
/* ---------- 11/16 櫃坊改版：純計算（test-xsm-counter-1116.js 用 vm 跑）----------
   開櫃取帖：每天一份帖＝兩張明牌（不重複、至少一張星輝或星塵）＋一張蓋牌（剩下三種挑一種；5% 是積灰的小木匣＝將令 1 或一件還沒收的珍品），照日期算，同一天固定、不能重抽；
     節氣當天（07y5 TD_TERMS 的日子）多一張不用選的節禮帖（星輝 60 或星塵 10），跟那天挑的帖一起收下；
     沒來的日子櫃上替你收著：今天往前三天內、還沒收的都還能挑（從第一次收帖那天起算，第一次來只有今天）。
   飛錢寄櫃：見面禮（齊轍以外每位夥伴一份，星輝 80）、遠征補給（07mnq a6，西市開了以後改到這裡領）、每週一封平安信（陪你走那位寫，星輝 30；週一起算，沒拿的那週不補）。
   存檔都在 xsmStall：g＝{s 第一次收帖那天, c 收過的日子, h 最近 30 筆}，p＝{m:{夥伴:收見面禮那天}, w 收過平安信的那一週（週一的日期）} */
const XSM_TIE={hui:["✨","星輝",30],dust:["🌌","星塵",3],undo:["↶","悔棋符",1],hint:["💡","提示棋",1],xp:["🀄","修為",20],ling:["🪙","將令",1],relic:["🏺","珍品",1]};   /* [圖示, 名稱, 份量]；星塵照日期 3～5 */
const XSM_TIE_K=["hui","dust","undo","hint","xp"],XSM_BOX_P=5,XSM_KEEP=3,XSM_TERM={hui:60,dust:10},XSM_MEET=80,XSM_WK=30;
/* 雜湊再打散一次（murmur3 的 fmix32）：FNV-1a 的低位元很不亂，%2、%3 會整排同一邊；櫃坊的抽法都用這個 */
function xsmMix(s){let h=xsmHash(s);h^=h>>>16;h=Math.imul(h,0x85ebca6b);h^=h>>>13;h=Math.imul(h,0xc2b2ae35);h^=h>>>16;return h>>>0}
/* 往後（n 正）或往前（n 負）幾天（"YYYY-MM-DD"） */
function xsmDayAdd(day,n){const m=/^(\d+)-(\d+)-(\d+)$/.exec(String(day||""));if(!m)return"";const d=new Date(+m[1],+m[2]-1,+m[3]+(n|0));return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
/* 這一天的帖：{day, open:[{k,n},{k,n}], hid:{k,n} 或 {k:"box", b:"ling"|"relic", n:1}} */
function xsmTieDraw(day){const h=k=>xsmMix("tie"+k+day),K=XSM_TIE_K,a=["hui","dust"][h(1)%2],R=K.filter(k=>k!==a),b=R[h(2)%R.length],open=h(3)%2?[a,b]:[b,a],L=K.filter(k=>!open.includes(k));
  const amt=k=>k==="dust"?XSM_TIE.dust[2]+h(5)%3:XSM_TIE[k][2],box=h(4)%100<XSM_BOX_P;
  return{day,open:open.map(k=>({k,n:amt(k)})),hid:box?{k:"box",b:h(6)%2?"relic":"ling",n:1}:(k=>({k,n:amt(k)}))(L[h(7)%L.length])}}
/* 這一天是不是節氣：T＝[[月,日,名]]（預設 07y5 TD_TERMS）；是＝節氣名，不是＝"" */
function xsmTermOf(day,T){T=T||(typeof TD_TERMS!=="undefined"?TD_TERMS:null);const m=/^\d+-(\d+)-(\d+)$/.exec(String(day||""));if(!m||!Array.isArray(T))return"";const x=T.find(t=>t[0]===+m[1]&&t[1]===+m[2]);return x?x[2]:""}
/* 節禮帖：星輝 60 或星塵 10（照日期） */
const xsmTermGift=(day,t)=>t?(xsmMix("term"+day)%2?{k:"dust",n:XSM_TERM.dust}:{k:"hui",n:XSM_TERM.hui}):null;
const xsmTieNorm=G=>{G=G&&typeof G==="object"?G:{};return{s:typeof G.s==="string"?G.s:"",c:Array.isArray(G.c)?G.c.filter(x=>typeof x==="string").slice(-12):[],h:Array.isArray(G.h)?G.h.slice(-30):[]}};
/* 還能挑的日子（舊的在前）：今天，加上第一次收帖以後、往前兩天內還沒收的 */
function xsmTieDays(G,today){G=xsmTieNorm(G);const o=[];if(!xsmDayAdd(today,0))return o;
  for(let i=XSM_KEEP-1;i>=0;i--){const d=xsmDayAdd(today,-i);if(d!==today&&(!G.s||d<G.s))continue;if(!G.c.includes(d))o.push(d)}return o}
/* 挑一張：i＝0、1 明牌，2 蓋牌。那天不能挑（收過、太舊）＝null；回 {G 新的存檔, card, term 節禮或 null, draw} */
function xsmTieTake(G,day,i,today,T){G=xsmTieNorm(G);if(!xsmTieDays(G,today).includes(day))return null;const D=xsmTieDraw(day),card=i===2?D.hid:D.open[i];if(!card)return null;
  const term=xsmTermGift(day,xsmTermOf(day,T));G.s=G.s||today;G.c=G.c.concat(day).slice(-12);G.h=G.h.concat([{d:day,k:card.k,b:card.b||"",n:card.n,t:term?term.k:""}]).slice(-30);return{G,card,term,draw:D}}
/* 這一週（週一的日期） */
function xsmWeekOf(day){const m=/^(\d+)-(\d+)-(\d+)$/.exec(String(day||""));if(!m)return"";return xsmDayAdd(day,-((new Date(+m[1],+m[2]-1,+m[3]).getDay()+6)%7))}
const xsmPkNorm=p=>{p=p&&typeof p==="object"?p:{};return{m:p.m&&typeof p.m==="object"?Object.assign({},p.m):{},w:typeof p.w==="string"?p.w:""}};
/* 寄來的包裹：mem＝已加入的夥伴、look＝陪你走那位、a6＝還沒領遠征補給的朝代、p＝xsmStall.p、day＝今天 */
function xsmParcels(mem,look,a6,p,day){p=xsmPkNorm(p);mem=(mem||[]).filter(c=>XSM_V7[c]);const o=[];
  for(const c of mem)if(c!=="x_swordboy"&&!p.m[c])o.push({k:"meet",c,n:XSM_MEET});   /* 齊轍一開始就在（07pty PTY.START） */
  for(const e of a6||[])o.push({k:"a6",era:e});
  /* 平安信：玩家就是「陪你走」那位（07j 的 {名} 照 myChar 叫人），信由別的夥伴寫、照週輪；只有自己一個人＝掌櫃寫一張平安帖（c 空字串） */
  const w=xsmWeekOf(day),L=mem.filter(c=>c!==look),c=L.length?L[xsmMix("wkc"+w)%L.length]:"";if(w&&p.w!==w)o.push({k:"wk",c,w,n:XSM_WK});return o}
/* 平安信寫哪一句（照週輪；掌櫃的平安帖只有一句） */
const xsmWkLine=(c,w)=>{if(!c)return XSM_TX.wk0;const A=XSM_WK_L[c];return A?A[xsmMix("wk"+c+w)%A.length]:""};
/* 信裡的 {名}：寫信的人剛好是陪你走那位（之後換人陪你走），就不叫自己的名字 */
const xsmLetter=(s,c,look)=>xsmYou(c&&c===look?String(s||"").replace(/\{名\}[，！]?/g,""):s,c);
/* ---------- 畫面 ---------- */
function xsmCss(){if(document.getElementById("xsmCss"))return;const s=document.createElement("style");s.id="xsmCss";s.textContent=`
.xsm-page{margin:0 0 6px}.xsm-page .shp-spot{max-width:46%;padding:4px 11px;z-index:3}.xsm-page .shp-spot b{white-space:nowrap;font-size:15px;letter-spacing:.06em}
.xsm-page .shp-spot.lock{border-color:#8a8476;background:rgba(28,26,30,.68);box-shadow:none}.xsm-page .shp-spot.lock b{color:#c9c2b2;font-size:14px}
.xsm-tea .xsm-rain{position:absolute;z-index:1;pointer-events:none;overflow:hidden;opacity:.6;background-image:repeating-linear-gradient(100deg,rgba(255,255,255,0) 0 9px,rgba(232,240,250,.6) 9px 10px,rgba(255,255,255,0) 10px 23px);background-size:46px 58px;animation:xsmRain .55s linear infinite}
@keyframes xsmRain{to{background-position:-10px 58px}}
.xsm-tea[data-win="1"] .xsm-rain{opacity:.85;background-image:radial-gradient(circle,rgba(255,255,255,.95) 0 1.1px,rgba(255,255,255,0) 1.7px),radial-gradient(circle,rgba(246,250,255,.75) 0 .8px,rgba(255,255,255,0) 1.4px);background-size:23px 29px,37px 41px;background-position:0 0,11px 17px;animation:xsmSnow 8s linear infinite}
@keyframes xsmSnow{to{background-position:-23px 58px,-26px 99px}}
.xsm-tea::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:rgba(16,24,58,.4);mix-blend-mode:multiply;opacity:0;transition:opacity .6s}.xsm-tea[data-day=""]::after{opacity:1}
.xsm-tea .xsm-nobot{position:absolute;z-index:0;pointer-events:none;background:none}
@media (prefers-reduced-motion:reduce){.xsm-tea .xsm-rain,.xsm-tea[data-win="1"] .xsm-rain{animation:none}}
.xsm-pc{position:absolute;z-index:2;width:22px;height:22px;margin:-11px 0 0 -11px;box-sizing:border-box;border-radius:50%;background:radial-gradient(circle at 40% 35%,#f6e7c4,#d4b072);border:1.5px solid #7a4a1f;color:#a3271d;font:900 13px/19px var(--serif,serif);text-align:center;pointer-events:none;opacity:.85;transform:rotate(-14deg);box-shadow:0 1px 2px rgba(0,0,0,.4)}
.xsm-pc.glow{animation:xsmGlow 1s ease-in-out 3}.xsm-pc.got{animation:xsmGot .9s ease-out forwards}
@keyframes xsmGlow{50%{opacity:1;box-shadow:0 0 0 6px rgba(242,201,76,.75),0 0 16px rgba(242,201,76,.95)}}@keyframes xsmGot{to{opacity:0;transform:translateY(-26px) scale(1.7)}}
.xsm-ban{position:absolute;left:8px;right:8px;top:8px;z-index:6;display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-radius:12px;background:rgba(28,22,16,.84);color:#fff3d6;font:700 15px/1.4 var(--serif,serif);box-shadow:0 3px 10px rgba(0,0,0,.3)}
.xsm-ban b{flex:1;min-width:0}.xsm-ban button{flex:none;min-height:36px;padding:0 10px;border-radius:99px;border:1px solid rgba(232,199,122,.6);background:rgba(0,0,0,.3);color:#f2e4c4;font:700 14px var(--sans,sans-serif)}
.xsm-nar{margin:0 0 8px;color:var(--muted);font:15px/1.75 var(--serif,serif)}.xsm-say{margin:0 0 10px;font:16px/1.8 var(--serif,serif)}
.xsm-v{display:flex;gap:12px;align-items:center;margin:4px 0 8px}.xsm-v img{width:84px;height:112px;object-fit:contain;flex:none}.xsm-v .xsm-say{margin:0}
#sheet .xsm-v~.btn,#sheet .xsm-say~.btn{width:100%;margin-top:8px}
.xsm-li{display:flex;align-items:center;gap:10px;width:100%;min-height:50px;padding:8px 12px;margin:0 0 8px;border-radius:12px;border:1px solid rgba(138,90,43,.35);background:rgba(246,238,220,.55);color:inherit;font:700 17px/1.3 var(--serif,serif);text-align:left;cursor:pointer}
.xsm-li span{font-size:20px;flex:none}.xsm-li b{flex:1;min-width:0}.xsm-li em{flex:none;font:700 14px var(--sans,sans-serif);font-style:normal;color:#8a5a2b}.xsm-li.new{border:1.5px solid #B5452B}.xsm-li.new em{color:#B5452B}
.xsm-row{display:flex;gap:6px;justify-content:center;margin:10px 0}.xsm-row span{width:36px;height:36px;box-sizing:border-box;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 18px var(--serif,serif);border:2px dashed #b9a684;color:#b9a684}
.xsm-row span.on{border:2px solid #7a4a1f;background:#f3e2bd;color:#a3271d}
.xsm-mu{display:flex;align-items:center;gap:8px;width:100%;min-height:46px;padding:6px 12px;margin:0 0 6px;border-radius:12px;border:1px solid rgba(138,90,43,.3);background:rgba(246,238,220,.5);font:700 17px var(--serif,serif);color:inherit;text-align:left;cursor:pointer}
.xsm-mu b{flex:1;min-width:0;font-weight:700}.xsm-mu small{flex:none;font:13px var(--sans,sans-serif);color:var(--muted)}.xsm-mu.on{border:1.5px solid #B5452B;background:rgba(242,201,76,.18)}
.xsm-ties{display:flex;gap:8px;margin:4px 0 10px}
.xsm-tie{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;align-items:center;gap:4px;padding:14px 4px 10px;border-radius:12px;border:1.5px solid #8a5a2b;background:linear-gradient(#fbf3df,#efdcb2);color:#3b2a1a;font:700 15px/1.25 var(--serif,serif);text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.18)}
button.xsm-tie{cursor:pointer}.xsm-tie>span{font-size:26px;line-height:1}.xsm-tie b{font-size:16px}.xsm-tie em{font:800 15px var(--sans,sans-serif);font-style:normal;color:#B5452B}
.xsm-tie::before{content:"";position:absolute;top:6px;right:6px;width:12px;height:12px;border-radius:3px;background:#c0392b;opacity:.8}
.xsm-tie.hid{background:repeating-linear-gradient(45deg,#7a5530 0 6px,#6b4a29 6px 12px);color:#f3e2bd;border-color:#4a3018}.xsm-tie.hid em{color:#f2c94c}
.xsm-tie.off{opacity:.45;box-shadow:none}.xsm-tie.on{border:2px solid #B5452B;box-shadow:0 0 0 3px rgba(242,201,76,.5)}
.xsm-tie.term{flex-direction:row;flex-wrap:wrap;justify-content:center;gap:6px 8px;margin:0 0 8px;padding:10px 12px;border-style:dashed;background:rgba(242,201,76,.16)}.xsm-tie.term small{flex-basis:100%;font:13px/1.4 var(--sans,sans-serif);color:var(--muted)}
.xsm-got{margin:0 0 10px;padding:8px 12px;border-radius:12px;background:rgba(242,201,76,.18);border:1px solid rgba(181,69,43,.35);font:700 16px/1.7 var(--serif,serif)}.xsm-chip{white-space:nowrap;margin-right:6px}.xsm-chip b{color:#B5452B}
.xsm-li img{width:30px;height:40px;object-fit:contain;flex:none}
#xsmQj{position:fixed;inset:0;z-index:9200;display:flex;align-items:center;justify-content:center;padding:max(24px,calc(12px + env(safe-area-inset-top,0px))) 18px calc(24px + env(safe-area-inset-bottom,0px));background:radial-gradient(circle at 50% 40%,rgba(70,36,10,.95),rgba(0,0,0,.97) 72%);color:#fff7e6;text-align:center;opacity:0;transition:opacity .3s;overflow:auto}
#xsmQj.in{opacity:1}#xsmQj .qj-in{display:flex;flex-direction:column;align-items:center;gap:14px;width:min(360px,92vw)}
#xsmQj h3{margin:0;font:900 24px/1.3 var(--serif,serif);color:#ffe6a8;letter-spacing:.06em}#xsmQj .qj-n{margin:0;font:15px/1.6 var(--sans,sans-serif);color:#e8d9b8}
#xsmQj .xsm-say{margin:0;color:#f3e6c8}#xsmQj img{width:96px;height:128px;object-fit:contain}#xsmQj .xsm-got{color:#3b2a1a;background:rgba(255,236,190,.92)}
#xsmQj button{width:100%;min-height:52px;border-radius:99px;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font:900 20px var(--serif,serif);letter-spacing:.08em}
#xsmQj button.g{min-height:44px;font-size:16px;background:rgba(0,0,0,.35);border-color:rgba(232,199,122,.6);color:#f2e4c4}#xsmQj button:disabled{opacity:.6}#xsmQj button:focus-visible{outline:3px solid #E8C77A;outline-offset:3px}
.xsm-qj{position:relative;width:240px;height:130px;flex:none}
.xsm-qj i{position:absolute;top:0;width:120px;height:130px;box-sizing:border-box;border:2px solid #4a3018;background:repeating-linear-gradient(90deg,#c9a36a 0 9px,#bf9760 9px 18px);transition:transform .75s cubic-bezier(.3,1.35,.5,1)}
.xsm-qj .l{left:0;border-right:2px dashed #4a3018;border-radius:10px 0 0 10px;transform:translateX(-34px) rotate(-5deg)}.xsm-qj .r{right:0;border-left:2px dashed #4a3018;border-radius:0 10px 10px 0;transform:translateX(34px) rotate(5deg)}
.xsm-qj .l::after,.xsm-qj .r::after{content:"";position:absolute;top:35px;width:30px;height:60px;background:#b3261e}.xsm-qj .l::after{right:-2px;border-radius:60px 0 0 60px}.xsm-qj .r::after{left:-2px;border-radius:0 60px 60px 0}
.xsm-qj b{position:absolute;left:50%;top:50%;z-index:1;width:50px;margin:-25px 0 0 -25px;font:900 30px/50px var(--serif,serif);color:#fff3d6;opacity:0;transition:opacity .3s .65s}
.xsm-qj.on .l,.xsm-qj.on .r{transform:none}.xsm-qj.on b{opacity:1}
@media (prefers-reduced-motion:reduce){.xsm-qj i,.xsm-qj b{transition:none}#xsmQj{transition:none}}
.xsm-seal{width:104px;height:104px;margin:4px auto 12px;box-sizing:border-box;border:6px solid #c0392b;border-radius:12px;background:rgba(246,236,214,.9);color:#b3261e;display:flex;align-items:center;justify-content:center;font:900 58px/1 var(--serif,serif);transform:rotate(-6deg)}
@media (prefers-reduced-motion:reduce){.xsm-pc.glow{animation:none;opacity:1;box-shadow:0 0 0 6px rgba(242,201,76,.75)}.xsm-pc.got{animation:none;opacity:0}}`;document.head.append(s)}
/* 標籤按鈕（旁白、Tab 順序＝由上到下、同一列由左到右：07z hmFocusOrder） */
function xsmBtns(L){const S=xsmSpots(L),O=typeof hmFocusOrder==="function"?hmFocusOrder(S):S;
  return O.map(([id,x,y,t,off])=>`<button type="button" class="shp-spot${off?" lock":""}" id="${id}" style="left:${x}%;top:${y}%" aria-label="${esc(t+(off?"，還沒開張":""))}"><b>${off?"🔒 ":""}${esc(t)}</b></button>`).join("")}
const XSM_ACT={xsmTea:()=>{location.hash="#/ximarket/tea"},xsmDark:()=>{location.hash="#/ximarket/dark"},
  xsmGift:()=>xsmGiftSheet(),xsmMusic:()=>xsmMusicSheet(),xsmChess:()=>xsmChessSheet(),xsmVisit:()=>xsmVisitSheet()};   /* 11/16 四攤開張 */
function xsmBind(P,L){for(const s of L){const b=P.querySelector("#"+s[0]);if(!b)continue;b.onclick=e=>{e.stopPropagation();vibrate(5);if(s[4]){toast("🏮 "+XSM_OFF);return}const f=XSM_ACT[s[0]];if(f)f()}}}
/* 圖載好以後：07t3 補滿高度、07sp 標籤推回畫面內、R07 點選範圍；兩指縮放 */
function xsmAfter(v,P){const im=P.querySelector(":scope>img");
  im.addEventListener("load",()=>{if(!P.isConnected)return;try{if(typeof ttFill==="function")ttFill()}catch(e){}try{if(typeof spfSoon==="function")spfSoon(0)}catch(e){}try{if(typeof r07HitSoon==="function")r07HitSoon()}catch(e){}});
  if(typeof shpFit==="function")shpFit(v);try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
/* 換日夜：先載好再換；載不到記下來（下次 xsmSrc 自己換另一張） */
function xsmSwap(P,day){const im=P.querySelector(":scope>img");if(!im)return;const nd=xsmPickDay(day),src=xsmSrc(nd);if(im.getAttribute("src")===src)return;
  const pre=new Image();pre.onload=()=>{if(!P.isConnected)return;P.dataset.day=nd?"1":"";im.src=src};pre.onerror=()=>{if(/_winter\./.test(src))XSM_BAD[xsmWk(nd)]=1;else XSM_BAD[nd?"d":"n"]=1};pre.src=src}   /* 11/17 冬景載不到＝只記冬景那張壞了，下一分鐘換回原圖 */
function xsmIntro(){modal(`<h3>🏮 西市</h3><p><b>${esc(XSM_TX.pos)}</b></p><p>${esc(XSM_TX.intro)}</p>`,[["逛逛西市",null]])}
function xsmWalk(v){if(typeof shwPage!=="function"||typeof SHIP_WALK_ON==="undefined"||!SHIP_WALK_ON)return;try{shwPage(v,xsmWalkCfg(),"xsm")}catch(e){}}
function XsmPage(v,sub){try{if(xsmOpen()){if(sub==="dark"&&typeof xsdBgmOn==="function")xsdBgmOn();else xsmBgmOn()}}catch(e){}   /* 11/16 西市背景配樂（外景、茶坊、暗棋都是這一組） */
  if(sub==="tea")return xsmTea(v);if(sub==="dark"&&typeof xsdPage==="function")return xsdPage(v);
  setTop("🏮 西市","#/");setTabs(true,"#/");v.className="view";
  if(!xsmOpen()){toast("🏮 西市還沒開市");navReplace("#/");return{}}
  xsmCss();let first=false;try{first=!store.get("xsmSeen",0);store.set("xsmSeen",1)}catch(e){}
  const day=xsmDay(),nd=xsmPickDay(day),P=document.createElement("div");P.className="shp-page cq xsm-page";P.dataset.day=nd?"1":"";
  P.innerHTML=`<img src="${xsmSrc(nd)}" alt="西市：市門、夯土市牆、青石路，十字路口四角是櫃坊、棋具攤、樂棚和茶坊，遠處有市樓、水池和柳樹">`+xsmBtns(XSM_SPOTS);
  v.append(P);xsmBind(P,XSM_SPOTS);
  try{xsmMark(P)}catch(e){}try{xsmHuntInit(v,P)}catch(e){}   /* 11/16：有禮、有人來的標籤發亮；今天那顆棋子藏到圖上 */
  const im=P.querySelector(":scope>img");
  im.onerror=()=>{const sh=P.dataset.day==="1";if(/_winter\./.test(im.getAttribute("src")||"")){XSM_BAD[xsmWk(sh)]=1;im.src=xsmSrc(sh);return}   /* 11/17 冬景載不到＝先退回同一個時辰的原圖 */
    XSM_BAD[sh?"d":"n"]=1;const n2=xsmPickDay(sh);if(n2!==sh){P.dataset.day=n2?"1":"";im.src=xsmSrc(n2)}};
  /* 07w9 的出口晚一點才放進來：補 id（走路角色的入口代號 HS.xsmExit） */
  try{const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}const s=P.querySelector(".ex-spot");if(s&&!s.id)s.id="xsmExit"});mo.observe(P,{childList:true})}catch(e){}
  /* 每分鐘看一次：跨過日落、日出就換日夜；11/17 跨過立冬（或大寒過完）換季也換（xsmSwap 網址一樣就不動） */
  {const tm=setInterval(()=>{if(!P.isConnected){clearInterval(tm);return}const d=xsmPickDay(xsmDay());xsmSwap(P,d);
    try{const w=xsmDay()?XSM_BGM_D:XSM_BGM_N;if(typeof BGM!=="undefined"&&(BGM.force===XSM_BGM_D||BGM.force===XSM_BGM_N)&&BGM.force!==w)bgmForce(w)}catch(e){}},60000)}   /* 11/16 配樂也跟著換日夜（樂棚正在放的不動） */
  xsmAfter(v,P);
  xsmWalk(v);   /* 走路角色（3D 載不到、減少動態時 07w 不攔點選，入口照舊直接開） */
  if(first)setTimeout(()=>{if(P.isConnected)xsmIntro()},450);
  return{}}
function xsmTea(v){setTop("🍵 聽雨茶坊","#/ximarket");setTabs(true,"#/");v.className="view";
  if(!xsmOpen()){toast("🏮 西市還沒開市");navReplace("#/");return{}}
  xsmCss();const P=document.createElement("div");P.className="shp-page cq xsm-page xsm-tea";P.dataset.day=xsmDay()?"1":"";
  const s0=xsmSrc(false,1),isW=s=>/_winter\./.test(s||"");P.dataset.win=isW(s0)?"1":"";   /* 11/17 冬景：窗外是雪，XSM_RAIN 那兩塊改畫雪（CSS data-win） */
  P.innerHTML=`<img src="${s0}" alt="聽雨茶坊：方桌、條凳、靠背椅，窗外${isW(s0)?"飄著雪":"下著雨"}，中間一張暗棋桌">`+
    XSM_RAIN.map(r=>`<i class="xsm-rain" style="left:${r[0]}%;top:${r[1]}%;width:${r[2]-r[0]}%;height:${r[3]-r[1]}%"></i>`).join("")+xsmTeaNoBot()+xsmBtns(XSM_TEA_SPOTS);
  v.append(P);xsmBind(P,XSM_TEA_SPOTS);
  const im=P.querySelector(":scope>img");
  im.onerror=()=>{if(isW(im.getAttribute("src"))){XSM_BAD.wt=1;P.dataset.win="";im.src=xsmSrc(false,1)}};   /* 冬景載不到＝原圖＋雨 */
  {const tm=setInterval(()=>{if(!P.isConnected){clearInterval(tm);return}const d=xsmDay()?"1":"";if(d!==P.dataset.day)P.dataset.day=d;
    const s=xsmSrc(false,1);if(im.getAttribute("src")!==s){P.dataset.win=isW(s)?"1":"";im.src=s}},60000)}   /* 11/17 跨過立冬也換季 */
  xsmAfter(v,P);
  return{}}
/* ---------- 11/16 四攤：存檔 ---------- */
/* xsmStall＝{f:找棋子進度（xsmFindNorm）, v:{d 哪天, c 那天誰來, met 哪天見過, gift 哪天收過小禮}} */
function xsmSt(){let S=null;try{S=store.get("xsmStall",null)}catch(e){}S=S&&typeof S==="object"?S:{};S.f=xsmFindNorm(S.f);if(!S.v||typeof S.v!=="object")S.v={};return S}
const xsmSave=S=>{try{store.set("xsmStall",S)}catch(e){}};
function xsmToday(){if(typeof localDay==="function")return localDay();const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
/* {名}、{你}：有 07j 就照它（怎麼叫玩家、玩家是女生換「妳」） */
function xsmYou(s,c){try{if(typeof v7Txt==="function")return v7Txt(s,c||"")}catch(e){}return String(s).replace(/\{名\}/g,"").replace(/\{你\}/g,"你")}
/* 今天誰來（只挑已加入的：07pty ptyHas；沒有 07pty、沒有旅程＝沒人）；挑好就記下來，同一天不換人 */
function xsmVisitWho(){if(typeof ptyHas!=="function")return null;const O=typeof PTY!=="undefined"&&PTY.ORDER?PTY.ORDER:Object.keys(XSM_V7);
  const mem=O.filter(c=>{try{return!!ptyHas(c)}catch(e){return false}});let look="";try{look=(typeof myChar==="function"&&myChar())||(typeof ptyLook==="function"&&ptyLook())||""}catch(e){}
  const day=xsmToday(),S=xsmSt(),c=xsmVisitPick(day,mem,look,S.v);if(c&&(S.v.d!==day||S.v.c!==c)){S.v.d=day;S.v.c=c;xsmSave(S)}return c}
/* 見到了：記今天見過；也記進 07j 的 visit7（來過幾次＋1、今天來過＝算進每天 3 位；07j 今天已經帶他來過就不重算） */
function xsmVisitMet(c,day){const S=xsmSt();if(S.v.met===day)return;S.v.met=day;xsmSave(S);
  try{const V=typeof v7St==="function"?v7St():(store.get("visit7",null)||{});if(!V.n||typeof V.n!=="object")V.n={};if(!V.day||typeof V.day!=="object")V.day={};
    if(V.day[c]!==day){V.n[c]=(V.n[c]||0)+1;V.day[c]=day;store.set("visit7",V)}}catch(e){}}
/* 櫃坊現在的禮（沒有 07mnq＝空） */
function xsmGiftsNow(){try{if(typeof mnqSt!=="function"||typeof mnqEnv!=="function")return[];let D=null;try{D=typeof shipDockList==="function"?shipDockList():null}catch(e){}return xsmGifts(mnqSt(),mnqEnv(),D)}catch(e){return[]}}
/* 11/16 櫃坊改版：已加入的夥伴（照 07pty 加入順序）、陪你走那位、還能挑的帖、寄來的包裹 */
function xsmMem(){if(typeof ptyHas!=="function")return[];const O=typeof PTY!=="undefined"&&PTY.ORDER?PTY.ORDER:Object.keys(XSM_V7);return O.filter(c=>{try{return!!ptyHas(c)}catch(e){return false}})}
function xsmLook(){try{return(typeof ptyLook==="function"&&ptyLook())||(typeof myChar==="function"&&myChar())||""}catch(e){return""}}
function xsmTieNow(){try{return xsmTieDays(xsmSt().g,xsmToday())}catch(e){return[]}}
function xsmParcelsNow(){try{const a6=xsmGiftsNow().filter(g=>g.k==="a6"&&!g.got).map(g=>g.era);return xsmParcels(xsmMem(),xsmLook(),a6,xsmSt().p,xsmToday())}catch(e){return[]}}
/* 發亮：有禮可領、或今天有人來還沒見到（第 17 項 A）；11/16 改版：西市開著時，還有帖可挑、有包裹沒開也亮 */
const xsmHotGift=()=>xsmGiftsNow().some(g=>!g.got)||(xsmOpen()&&(xsmTieNow().length>0||xsmParcelsNow().length>0));
function xsmHotVisit(){try{return xsmSt().v.met!==xsmToday()&&!!xsmVisitWho()}catch(e){return false}}
function xsmHot(){try{return xsmHotGift()||xsmHotVisit()}catch(e){return false}}
/* 外景兩個標籤跟著亮／不亮 */
function xsmMark(P){P=P||document.querySelector(".xsm-page:not(.xsm-tea)");if(!P)return;const g=P.querySelector("#xsmGift"),v=P.querySelector("#xsmVisit");
  if(g)g.classList.toggle("hot",xsmHotGift());if(v)v.classList.toggle("hot",xsmHotVisit())}
/* ---------- 11/16 領禮物：雲河櫃坊 ---------- */
function xsmGiftNm(g){const G=typeof MNQ_GIFT!=="undefined"&&MNQ_GIFT[g.k]||{},el=g.era&&typeof eraLabel==="function"?eraLabel(g.era):(g.era||"");return(G.nm||g.k)+(g.k==="a6"&&el?"・"+el:"")}
/* 11/16 改版：發東西。k＝帖的種類、n＝份量、key＝修為的紀錄鍵（擋重複）；回畫面上那一格 [圖示, 名稱, 份量]。
   星輝進 07pty 的星輝池、星塵進 07sg2（sg2DustAdd）、提示棋和悔棋符進庫存、將令照 07-legend lingAdd；那個系統不在（沒有旅程）就改成修為 20 */
function xsmGive(k,n,key){const T=XSM_TIE[k]||XSM_TIE.xp,r=[T[0],T[1],n],xp=()=>xsmGive("xp",XSM_TIE.xp[2],key);
  try{if(k==="hui"){const P=typeof ptyGet==="function"?ptyGet():null;if(!P)return xp();P.pool=(Math.round(+P.pool)||0)+n;ptySave(P);return r}
    if(k==="dust"){if(typeof sg2DustAdd!=="function")return xp();sg2DustAdd(n);return r}
    if(k==="hint"){store.set("hintBonus",(Math.round(+store.get("hintBonus",0))||0)+n);return r}
    if(k==="undo"){store.set("undoBonus",(Math.round(+store.get("undoBonus",0))||0)+n);return r}
    if(k==="ling"){if(typeof lingAdd!=="function")return xsmGive("hint",1,key);if(typeof lingN==="function")lingN();lingAdd(n);return r}
    if(typeof addXP==="function")addXP(n,"雲河櫃坊",key)}catch(e){}return r}
/* 積灰的小木匣開出珍品：停靠過的朝代（加上古風）裡還沒收的，先挑普通的；一件都沒有＝false（改給將令）。開箱照 07i relicFx */
async function xsmRelic(day){try{if(typeof relicsData!=="function"||typeof relicsMine!=="function")return false;const R=await relicsData(),mine=relicsMine();let D=null;try{D=typeof shipDockList==="function"?shipDockList():null}catch(e){}
  const L=[];for(const e of["classic"].concat(Array.isArray(D)?D:[]).filter((e,i,a)=>a.indexOf(e)===i))for(const it of(R&&R[e])||[])if(it&&it.id&&!(mine[e]||[]).includes(it.id))L.push([e,it]);
  const C=L.filter(x=>x[1].rarity==="common"),P=C.length?C:L;if(!P.length)return false;const[e,it]=P[xsmMix("relic"+day)%P.length];
  mine[e]=(mine[e]||[]).concat(it.id);store.set("relics",mine);store.set("relicAt",Date.now());const en=typeof relicEra==="function"?relicEra(e):e;
  if(typeof relicFx==="function")await relicFx(e,it,{from:"雲河櫃坊的小木匣・"+en+"的珍品",cnt:en+"的珍品 "+mine[e].length+"／"+((R[e]||[]).length)});else toast("🏺 得到一件珍品："+it.name);return true}catch(x){return false}}
/* 挑一張帖（i：0、1 明牌，2 蓋牌）：存檔、發東西（節氣當天連節禮一起）；那天不能挑＝null */
function xsmTieGo(day,i){const S=xsmSt(),r=xsmTieTake(S.g,day,i,xsmToday());if(!r)return null;S.g=r.G;xsmSave(S);const got=[],c=r.card;
  if(c.k==="box"){if(c.b==="relic")xsmRelic(day).then(ok=>{if(!ok){const g=xsmGive("ling",1);try{toast(g[0]+" "+g[1]+" +"+g[2])}catch(e){}}try{saveNow(true)}catch(e){}});else got.push(xsmGive("ling",1))}
  else got.push(xsmGive(c.k,c.n,"xsmg:"+day));
  if(r.term)got.push(xsmGive(r.term.k,r.term.n,"xsmt:"+day));
  try{vibrate([10,30,10])}catch(e){}try{saveNow(true)}catch(e){}try{xsmMark()}catch(e){}
  return{day,i,got,box:c.k==="box"?c.b:"",draw:r.draw,term:r.term}}
/* 開包裹（見面禮、平安信）：先記下來再發，同一份不會給兩次；回 [圖示, 名稱, 份量] 或 null（遠征補給走 07mnq mnqGift） */
function xsmPkTake(pk){if(!pk||(pk.k!=="meet"&&pk.k!=="wk"))return null;const S=xsmSt(),p=xsmPkNorm(S.p);
  if(pk.k==="meet"){if(!XSM_MEET_L[pk.c]||p.m[pk.c])return null;p.m[pk.c]=xsmToday()}else{if(!pk.w||p.w===pk.w||pk.w!==xsmWeekOf(xsmToday()))return null;p.w=pk.w}
  S.p=p;xsmSave(S);const g=xsmGive("hui",pk.k==="meet"?XSM_MEET:XSM_WK,pk.k==="meet"?"xsmp:m:"+pk.c:"xsmp:w:"+pk.w);try{saveNow(true)}catch(e){}try{xsmMark()}catch(e){}return g}
/* 畫面小零件 */
const xsmChip=g=>`<span class="xsm-chip"><span aria-hidden="true">${g[0]}</span> <span>${esc(g[1])}</span> <b>+${g[2]}</b></span>`;
const xsmCkNm=c=>{try{const C=WX_CHARS[c]||{};return C.nk||C.n||""}catch(e){return""}};
function xsmPkNm(p){if(p.k==="a6")return(typeof eraLabel==="function"?eraLabel(p.era):p.era)+"渡口的遠征補給";if(p.k==="wk"&&!p.c)return"櫃上的平安帖";return xsmCkNm(p.c)+(p.k==="meet"?"寄來的見面禮":"寄來的平安信")}
const xsmPkIc=p=>p.k==="a6"?`<span aria-hidden="true">⛵</span>`:!p.c?`<span aria-hidden="true">🏮</span>`:`<img src="data/xs/prev_${p.c}.webp" alt="" onerror="this.remove()">`;
function xsmTieCard(c,i,hid){if(hid)return`<button type="button" class="xsm-tie hid" data-i="${i}"><span aria-hidden="true">？</span><b>蓋著的帖</b><em>翻開看看</em></button>`;
  const T=XSM_TIE[c.k];return`<button type="button" class="xsm-tie" data-i="${i}"><span aria-hidden="true">${T[0]}</span><b>${esc(T[1])}</b><em>+${c.n}</em></button>`}
/* 挑完以後三張都翻開：挑中的亮著，另外兩張淡掉 */
function xsmTieShow(D,i){const one=(c,j)=>{const box=c.k==="box",T=box?["📦","積灰的小木匣"]:XSM_TIE[c.k];return`<div class="xsm-tie${j===i?" on":" off"}"><span aria-hidden="true">${T[0]}</span><b>${esc(T[1])}</b>${box?"":`<em>+${c.n}</em>`}</div>`};
  return`<div class="xsm-ties">${D.open.map(one).join("")}${one(D.hid,2)}</div>`}
function xsmTermCard(day){const t=xsmTermOf(day),g=xsmTermGift(day,t);if(!g)return"";const T=XSM_TIE[g.k];
  return`<div class="xsm-tie term"><span aria-hidden="true">${T[0]}</span><b>${esc(T[1])}</b><em>+${g.n}</em><small><span>節禮</span>・<span>${esc(t)}</span>・<span>不用選，一起收下</span></small></div>`}
function xsmGiftSheet(){xsmCss();let res=null;
  sheet("雲河櫃坊",b=>{const paint=()=>{const L=xsmGiftsNow(),old=L.filter(g=>!g.got&&g.k!=="a6"),done=L.filter(g=>g.got),days=xsmTieNow(),pk=xsmParcelsNow(),today=xsmToday(),day=days[0]||"",term=day?xsmTermOf(day):"";
      const say=res?(res.i===2?(res.box?XSM_TX.gBox:XSM_TX.gHid):XSM_TX.gPick):days.length>1?XSM_TX.gMany:day?(term&&XSM_TERM_L[term]?XSM_TERM_L[term]:xsmDay()?XSM_TX.gDay:XSM_TX.gNight):XSM_TX.gDone;
      let h=`<p class="xsm-nar">${esc(XSM_TX.gift)}</p><p class="xsm-say">掌櫃：「${esc(xsmYou(say))}」</p>`;
      if(res)h+=xsmTieShow(res.draw,res.i)+`<div class="xsm-got"><span>收下了</span> ${res.got.map(xsmChip).join(" ")}${res.box==="relic"?`<span>打開小木匣看看</span>`:""}</div>`;
      if(day){const D=xsmTieDraw(day),md=(+day.slice(5,7))+"/"+(+day.slice(8,10));
        h+=`<div class="sec-t">櫃上的帖</div>`+(day!==today?`<p class="muted"><span>帖上的日子</span> <b>${esc(md)}</b></p>`:"")+`<div class="xsm-ties">${D.open.map((c,i)=>xsmTieCard(c,i)).join("")}${xsmTieCard(D.hid,2,1)}</div>`+xsmTermCard(day)+`<p class="muted">${esc(xsmYou(XSM_TX.tieHow))}</p>`}
      if(pk.length)h+=`<div class="sec-t">寄來的包裹</div>`+pk.map((p,i)=>`<button type="button" class="xsm-li new" data-p="${i}">${xsmPkIc(p)}<b>${esc(xsmPkNm(p))}</b><em>合券</em></button>`).join("")+`<p class="muted">${esc(XSM_TX.pkNar)}</p>`;
      h+=old.map((g,i)=>`<button type="button" class="xsm-li new" data-g="${i}"><span aria-hidden="true">🎁</span><b>${esc(xsmGiftNm(g))}</b><em>領取</em></button>`).join("");
      if(done.length)h+=`<button type="button" class="xsm-li" data-old="1"><span aria-hidden="true">📜</span><b>收過的禮</b><em>再看一次</em></button>`;
      b.innerHTML=h;
      b.querySelectorAll(".xsm-tie[data-i]").forEach(x=>x.onclick=()=>{vibrate(5);const r=xsmTieGo(day,+x.dataset.i);if(!r)return;res=r;paint();try{b.scrollTop=0}catch(e){}});
      b.querySelectorAll("[data-p]").forEach(x=>x.onclick=()=>{vibrate(5);const p=pk[+x.dataset.p];if(!p)return;closeSheet();setTimeout(()=>xsmQj(p),260)});
      b.querySelectorAll("[data-g]").forEach(x=>x.onclick=()=>{vibrate(5);const g=old[+x.dataset.g];if(!g||typeof mnqGift!=="function")return;closeSheet();
        setTimeout(()=>{try{mnqGift(g.k,g.era)}catch(e){}try{xsmMark()}catch(e){}},260)});
      const o=b.querySelector("[data-old]");if(o)o.onclick=()=>{vibrate(5);closeSheet();setTimeout(()=>xsmOldSheet(),260)}};
    paint()})}
/* 收過的禮（07mnq 的授印禮、破局錦囊、遠征補給）：照舊可以再看一次儀式 */
function xsmOldSheet(){xsmCss();const L=xsmGiftsNow().filter(g=>g.got);
  sheet("收過的禮",b=>{b.innerHTML=L.map((g,i)=>`<button type="button" class="xsm-li" data-i="${i}"><span aria-hidden="true">📜</span><b>${esc(xsmGiftNm(g))}</b><em>再看一次</em></button>`).join("")+`<button type="button" class="btn ghost" id="xsmOb">‹ 回櫃上</button>`;
    b.querySelectorAll(".xsm-li").forEach(x=>x.onclick=()=>{vibrate(5);const g=L[+x.dataset.i];if(!g||typeof mnqGift!=="function")return;closeSheet();setTimeout(()=>{try{mnqGift(g.k,g.era)}catch(e){}},260)});
    b.querySelector("#xsmOb").onclick=()=>{vibrate(5);closeSheet();setTimeout(()=>xsmGiftSheet(),260)}})}
/* 合券：兩半木券分在左右，點「合券」兩半自己合起來、朱印對齊（約 0.9 秒；減少動態時直接合上），才開封。遠征補給接 07mnq 的儀式；見面禮、平安信在這裡打開信 */
function xsmQj(pk){if(!pk||typeof document==="undefined")return;xsmCss();const old=document.getElementById("xsmQj");if(old)old.remove();
  const o=document.createElement("div");o.id="xsmQj";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-label",xsmPkNm(pk));
  o.innerHTML=`<div class="qj-in"><h3>${esc(xsmPkNm(pk))}</h3><div class="xsm-qj" aria-hidden="true"><i class="l"></i><i class="r"></i><b data-noi18n>合</b></div><p class="qj-n">${esc(XSM_TX.qj)}</p><button type="button" data-go>合券</button><button type="button" class="g" data-x>待會兒再開</button></div>`;
  document.body.append(o);requestAnimationFrame(()=>o.classList.add("in"));
  const close=f=>{o.classList.remove("in");setTimeout(()=>o.remove(),320);try{xsmMark()}catch(e){}if(f)setTimeout(f,200)};
  const go=o.querySelector("[data-go]");try{go.focus({preventScroll:true})}catch(e){}
  o.querySelector("[data-x]").onclick=()=>close(()=>xsmGiftSheet());
  go.onclick=()=>{go.disabled=true;try{vibrate(8)}catch(e){}o.querySelector(".xsm-qj").classList.add("on");let rm=false;try{rm=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
    setTimeout(()=>{if(!o.isConnected)return;try{vibrate([10,30,10])}catch(e){}
      if(pk.k==="a6"){close(()=>{try{if(typeof mnqGift==="function")mnqGift("a6",pk.era,()=>xsmGiftSheet())}catch(e){}});return}
      const g=xsmPkTake(pk);if(!g){close(()=>xsmGiftSheet());return}
      const line=xsmLetter(pk.k==="meet"?XSM_MEET_L[pk.c]:xsmWkLine(pk.c,pk.w),pk.c,xsmLook()),who=pk.c?xsmCkNm(pk.c):"掌櫃";
      o.querySelector(".qj-in").innerHTML=`<h3>${esc(xsmPkNm(pk))}</h3>${pk.c?`<img src="data/xs/prev_${pk.c}.webp" alt="" onerror="this.remove()">`:""}<p class="xsm-say">${esc(who)}：「${esc(line)}」</p><div class="xsm-got">${xsmChip(g)}</div>`+
        (pk.k==="meet"?`<p class="qj-n">${esc(XSM_TX.meetNote)}</p>`:"")+`<button type="button" data-ok>收下</button>`;
      const ok=o.querySelector("[data-ok]");try{ok.focus({preventScroll:true})}catch(e){}ok.onclick=()=>close(()=>xsmGiftSheet())},rm?60:950)}}
/* ---------- 11/16 七星來訪：老槐樹下 ---------- */
function xsmVisitSheet(){xsmCss();const c=xsmVisitWho();
  if(!c){sheet("老槐樹下",b=>{b.innerHTML=`<p class="xsm-say">${esc(xsmYou(XSM_TX.v0))}</p>`});return}
  const day=xsmToday(),C=(typeof WX_CHARS!=="undefined"&&WX_CHARS[c])||{},nm=C.nk||C.n||"",line=xsmYou(xsmVisitLine(c,day,xsmDay()),c);xsmVisitMet(c,day);try{xsmMark()}catch(e){}
  sheet("老槐樹下",b=>{const paint=()=>{const S=xsmSt();let task=false;
      try{if(typeof v7St==="function"&&typeof v7QNext==="function"&&typeof v7Sheet==="function"){const V=v7St();task=!!((V.q&&V.q.c===c)||(!V.q&&v7QNext(c,V)))}}catch(e){}
      b.innerHTML=`<p class="xsm-nar">${esc(xsmYou(XSM_TX.v1))}</p><div class="xsm-v"><img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><p class="xsm-say">${esc(nm)}：「${esc(line)}」</p></div>`+
        (task?`<button type="button" class="btn" id="xsmVq">🤝 聽${esc(nm)}說說</button>`:S.v.gift===day?`<p class="muted">${esc(XSM_TX.vGot)}</p>`:`<button type="button" class="btn" id="xsmVg">🎁 收下小禮（+${XSM_VISIT_XP} 修為）</button>`)+
        `<button type="button" class="btn ghost" id="xsmVb">👋 待會兒見</button>`;
      const on=(id,fn)=>{const e=b.querySelector(id);if(e)e.onclick=()=>{vibrate(5);fn()}};
      on("#xsmVb",()=>closeSheet());
      on("#xsmVq",()=>{closeSheet();setTimeout(()=>{try{v7Sheet(c,line,false)}catch(e){}},260)});
      on("#xsmVg",()=>{const S2=xsmSt();if(S2.v.gift===day)return;S2.v.gift=day;xsmSave(S2);try{addXP(XSM_VISIT_XP,"羈絆","xsmv:"+day)}catch(e){}try{saveNow(true)}catch(e){}paint()})};
    paint()})}
/* ---------- 11/16 找棋子：棋具攤 ---------- */
const xsmPcRow=n=>`<div class="xsm-row" aria-label="${esc("這一副找到 "+n+" 顆")}">${XSM_PCS.map((p,i)=>`<span class="${i<n?"on":""}" aria-hidden="true">${p}</span>`).join("")}</div>`;
function xsmChessSheet(){xsmCss();const day=xsmToday(),S=xsmSt(),F=S.f,done=F.day===day,pc=xsmPieceOf(F);
  sheet("棋具攤",b=>{b.innerHTML=`<p class="xsm-nar">${esc(XSM_TX.c0)}</p><p class="xsm-say">攤主：「${esc(xsmYou(done?XSM_TX.cDone:XSM_TX.c1))}」</p>${xsmPcRow(F.n)}`+
    `<p class="muted" style="text-align:center">這一副找到 ${F.n} 顆，湊齊 7 顆就是一副${F.sets?`・已經湊齊 ${F.sets} 副`:""}<br>找到一顆 +${XSM_FIND_XP} 修為，湊齊一副再 +${XSM_SET_XP} 修為</p>`+
    (done?"":`<button type="button" class="btn" id="xsmCg">🔎 去找今天這顆「${esc(pc)}」</button>`)+(done||!xsmAxOn()?"":`<button type="button" class="btn" id="xsmCt">直接收下今天這顆「${esc(pc)}」</button>`)+`<button type="button" class="btn ghost" id="xsmCb">${done?"明天再來":"先逛逛"}</button>`;
    const g=b.querySelector("#xsmCg");if(g)g.onclick=()=>{vibrate(5);closeSheet();setTimeout(()=>xsmHuntBan(),260)};
    const tk=b.querySelector("#xsmCt");if(tk)tk.onclick=()=>{vibrate(5);closeSheet();setTimeout(()=>xsmTakePc(),260)};
    b.querySelector("#xsmCb").onclick=()=>{vibrate(5);closeSheet()}})}
/* 外景畫上今天那顆（今天還沒找到才畫）；在 v 上用捕獲先看一眼（比 07w 走路、07w6 物件說明早）：點到它 28px 內就攔下來算找到，點別處照常 */
function xsmHuntInit(v,P){const day=xsmToday(),S=xsmSt();if(S.f.day===day||!v||!P)return;const sp=xsmHideOf(day),I=P.querySelector(":scope>img");if(!I)return;
  const t=document.createElement("i");t.className="xsm-pc";t.setAttribute("aria-hidden","true");t.textContent=xsmPieceOf(S.f);t.style.left=sp[0]+"%";t.style.top=sp[1]+"%";P.append(t);
  let miss=0;const on=e=>{if(!P.isConnected||!t.isConnected){v.removeEventListener("click",on,true);return}const tg=e.target;if(!tg||!P.contains(tg))return;
    const bn=tg.closest(".xsm-ban");if(bn){e.stopPropagation();e.preventDefault();const b=tg.closest("button");if(b&&b.hasAttribute("data-h"))xsmGlow(t);else if(b&&b.hasAttribute("data-x"))bn.remove();return}
    if(tg.closest("button,a,input,select,textarea,label,[role=button]"))return;
    const r=I.getBoundingClientRect();if(!r.width||!r.height)return;const p=[(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100];
    if(xsmNear(sp,p,r.width,r.height)){e.stopPropagation();e.preventDefault();v.removeEventListener("click",on,true);xsmGotPc(P,t);return}
    if(P.querySelector(".xsm-ban")&&++miss===2)xsmGlow(t)};
  v.addEventListener("click",on,true)}
function xsmGlow(t){if(!t||!t.isConnected)return;t.classList.remove("glow");void t.offsetWidth;t.classList.add("glow")}
/* 「去找」：圖上方一條提示（💡 讓那顆亮一下、✕ 收起來） */
function xsmHuntBan(){const P=document.querySelector(".xsm-page:not(.xsm-tea)"),t=P&&P.querySelector(".xsm-pc");if(!P||!t){toast("🔎 "+XSM_TX.cDone);return}
  P.querySelectorAll(".xsm-ban").forEach(x=>x.remove());const ban=document.createElement("div");ban.className="xsm-ban";ban.setAttribute("role","status");
  ban.innerHTML=`<b>🔎 找一顆「${esc(t.textContent)}」</b><button type="button" data-h>💡 提示</button><button type="button" data-x aria-label="先不找了">✕</button>`;P.append(ban);
  try{P.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}}
/* 找到了：存進度、給修為（xsmf:<日期>；湊齊再 xsmf7:<第幾副>）、湊齊跳蓋印 */
function xsmGotPc(P,t){const day=xsmToday(),r=xsmPcAward(day);if(!r)return;
  try{vibrate([10,30,10])}catch(e){}t.classList.add("got");setTimeout(()=>t.remove(),900);
  const ban=P.querySelector(".xsm-ban");if(ban){ban.querySelector("b").textContent="攤主：「"+XSM_TX.c2+"」";ban.querySelectorAll("button").forEach(x=>x.remove());setTimeout(()=>ban.remove(),1900)}else toast("🔎 "+XSM_TX.c2);
  if(r.full)setTimeout(()=>{if(P.isConnected)xsmSetRite()},1100)}
/* 找到一顆的結算（圖上找到、讀螢幕直接收下共用）：存進度、給修為（xsmf:<日期>；湊齊再 xsmf7:<第幾副>）；同一天第二次＝null */
function xsmPcAward(day){const S=xsmSt(),r=xsmFindGo(S.f,day);if(!r)return null;S.f=r.F;xsmSave(S);
  try{addXP(XSM_FIND_XP,"找棋子","xsmf:"+day)}catch(e){}
  if(r.full){try{addXP(XSM_SET_XP,"找棋子","xsmf7:"+r.F.sets)}catch(e){}}
  try{saveNow(true)}catch(e){}return r}
/* 11/16 開發者選單「照現在＋讀螢幕可直接收」：只在 ♿ 螢幕報讀與鍵盤模式（11b axmOn）棋具攤卡片多一顆「直接收下」，效果跟圖上找到一樣；一般模式不出現 */
const xsmAxOn=()=>{try{return typeof axmOn==="function"&&!!axmOn()}catch(e){return false}};
function xsmTakePc(){const day=xsmToday(),r=xsmPcAward(day);if(!r)return null;
  try{const t=document.querySelector(".xsm-page:not(.xsm-tea)>.xsm-pc");if(t)t.remove();document.querySelectorAll(".xsm-ban").forEach(x=>x.remove())}catch(e){}
  try{toast("🔎 "+XSM_TX.c2)}catch(e){}if(r.full)setTimeout(()=>xsmSetRite(),400);return r}
function xsmSetRite(){xsmCss();modal(`<div class="xsm-seal" aria-hidden="true">齊</div><h3>一副棋湊齊了</h3>${xsmPcRow(7)}<p>攤主：「${esc(xsmYou(XSM_TX.c3))}」</p><p class="muted">+${XSM_SET_XP} 修為</p>`,[["收下",null]])}
/* ---------- 11/16 聽曲：西市樂棚 ＋ 西市背景配樂（都走 01-board 的 BGM，不另開播放器） ---------- */
const xsmBgmOk=()=>{try{return!!store.get("bgm",true)&&(typeof sxmGain!=="function"||sxmGain("bgm")>0)}catch(e){return false}};
const xsmBgmMine=f=>!!f&&(f===XSM_BGM_D||f===XSM_BGM_N||f===XSM_MU.f||(typeof XSD_BGM!=="undefined"&&f===XSD_BGM));
/* 進西市（外景、茶坊、暗棋）：樂棚正在放就不動；不然照日夜放那一組 */
function xsmBgmOn(){if(typeof bgmForce!=="function"||typeof BGM==="undefined")return;if(XSM_MU.f&&BGM.force===XSM_MU.f)return;XSM_MU.f=null;try{bgmForce(xsmDay()?XSM_BGM_D:XSM_BGM_N)}catch(e){}}
function xsmMuToggle(rel){if(typeof bgmForce!=="function")return;if(!xsmBgmOk()){toast("♪ "+XSM_TX.muOff);return}
  if(XSM_MU.f===rel){XSM_MU.f=null;bgmForce(xsmDay()?XSM_BGM_D:XSM_BGM_N)}else{XSM_MU.f=rel;bgmForce(rel)}}
function xsmMusicSheet(){xsmCss();let D=null,O=null;try{D=typeof shipDockList==="function"?shipDockList():null}catch(e){}try{O=typeof shipOrder==="function"?shipOrder():null}catch(e){}const E=xsmMuEras(O,D);
  sheet("西市樂棚",b=>{let IX={},T={};const paint=()=>{const n=xsmMuList(E,IX).length;
      b.innerHTML=`<p class="xsm-nar">${esc(XSM_TX.mu)}</p><p class="xsm-say">${esc(XSM_TX.mu2)}</p>`+(xsmBgmOk()?"":`<p class="muted">${esc(XSM_TX.muOff)}</p>`)+(n?`<p class="muted">收了 ${n} 首</p>`:"")+
        E.map(e=>{const L=xsmMuList([e],IX);return L.length?`<div class="sec-t">${esc(typeof eraLabel==="function"?eraLabel(e):e)}</div>`+L.map(rel=>{const f=rel.split("/").pop(),on=XSM_MU.f===rel,tt=T[rel];
          return`<button type="button" class="xsm-mu${on?" on":""}" data-m="${esc(rel)}" aria-pressed="${on}"><span aria-hidden="true">${on?"⏸":"▶"}</span><b>${tt?"《"+esc(tt)+"》":esc(f)}</b><small>${esc(XSM_INS[f.replace(/_\d+\.\w+$/,"")]||"")}</small></button>`}).join(""):""}).join("")+
        `<p class="muted">${esc(XSM_TX.muMore)}</p>`;
      b.querySelectorAll(".xsm-mu").forEach(x=>x.onclick=()=>{vibrate(5);xsmMuToggle(x.dataset.m);paint()})};
    paint();
    Promise.all([typeof bgmList==="function"?bgmList():{},typeof bgmTitles==="function"?bgmTitles():{}]).then(([a,c])=>{IX=a||{};T=c||{};if(b.isConnected)paint()}).catch(()=>{})})}
/* 離開西市（網址不是 #/ximarket…）：西市放的配樂還給朝代配樂 */
if(typeof addEventListener==="function")addEventListener("hashchange",()=>{try{if(/^#\/ximarket(\/|$)/.test(location.hash))return;if(typeof BGM!=="undefined"&&xsmBgmMine(BGM.force)&&typeof bgmForce==="function"){XSM_MU.f=null;bgmForce(null)}else XSM_MU.f=null}catch(e){}});
/* ---------- 首頁橋左邊「🏮 西市」 ---------- */
function xsmHomePos(P){const b=P&&P.querySelector("#hmXsm");if(!b)return;const c=XSM_HOME[P.dataset.hmw||""]||XSM_HOME[""];b.style.left=c[0]+"%";b.style.top=c[1]+"%";delete b.dataset.ttL;b.style.marginLeft=""}
function xsmHomeSpot(v){if(!xsmOpen()||!(typeof hbIsCl==="function"&&hbIsCl()))return;const P=v.querySelector(".home-page");if(!P||P.querySelector("#hmXsm"))return;
  const k=P.dataset.hmw||"",c=XSM_HOME[k]||XSM_HOME[""],b=document.createElement("button");b.type="button";b.id="hmXsm";b.className="shp-spot"+(store.get("xsmSeen",0)&&!xsmHot()?"":" hot");   /* 11/16 第 17 項 A：第一次去以前、有禮可領、有人來訪還沒見到都發亮 */
  b.style.left=c[0]+"%";b.style.top=c[1]+"%";b.setAttribute("aria-label","西市");b.innerHTML="<b>🏮 西市</b>";
  b.onclick=e=>{e.stopPropagation();vibrate(5);location.hash="#/ximarket"};
  /* 焦點順序：照 hmFocusOrder 插在對的位置（觀星臺已經放好就一起算；底部那一條永遠最後） */
  let ref=null;try{const G=P.querySelector("#hmGxt")&&typeof GXT_HOME!=="undefined"?[["hmGxt"].concat(GXT_HOME[k]||GXT_HOME[""])]:[];
    const S=(typeof hmwSpots==="function"?hmwSpots(k):[]).concat(G,[["hmXsm",c[0],c[1]]]),ord=hmFocusOrder(S).map(s=>s[0]),i=ord.indexOf("hmXsm");for(let j=i+1;j<ord.length&&!ref;j++)ref=P.querySelector(":scope>#"+ord[j])}catch(e){}
  if(!ref){const sp=P.querySelectorAll(":scope>.shp-spot");ref=sp.length?sp[sp.length-1].nextSibling:P.querySelector(":scope>.hm-go-bar")}
  P.insertBefore(b,ref||null);try{if(typeof hmClamp==="function")hmClamp(P)}catch(e){}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(!hub)xsmHomeSpot(v)}catch(e){}return r}}
if(typeof hmwSet==="function"){const f1=hmwSet;hmwSet=function(P){const r=f1.apply(this,arguments);try{xsmHomePos(P)}catch(e){}return r}}   /* 首頁原地換寬版圖時跟著換座標 */
