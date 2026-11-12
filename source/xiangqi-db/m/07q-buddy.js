/* ================= 🤝 七星遇見玩法（開發者 11/9 選 Gemini 56 號提問兩份回覆；設計與全部台詞 story/七星遇見玩法_設計與台詞_1109.md）=================
   四個功能，總開關 BUDDY_ON；只有雲河七星的旅程才有（說書人的學徒、沒選角的都沒有）。線上對戰完全不受影響。不加新貨幣，獎勵只用修為、珍品。
   1 旅伴闖禍（A 方案 1 找炮架＋B 方案 1 闖禍連鎖）：渡口主人（照 07f shipWho 那套：SHIP_LESSON 的 openBy／doneBy，沒有就 SHIP_STOP.who[0]）頭上冒「！」，
     點她聽她闖的小禍 → 在渡口的畫裡點一樣東西（形狀照 07w6b-scenedata.js 的渡口物件抄一份在 BD_OBJ，點到附近 28px 也算）→ 解一題本命子當主角的 1～3 步殘局
     （解題頁 #/canju/bd/<朝代>，包一層 07e-garden2.js 的 cjXMode）；走錯 2 次亮出第一步要動的子（XM.nudgeN，07c-canju.js stuck() 認這個）。解開她道謝、修為 +20。每個渡口一次。
     主人就是玩家自己（或船艙只有說書人）時，換 BD_EV 裡的下一位代班。3D 主人沒站出來（說書人、載不起來）就在渡口圖下面放一張小卡。
   2 驛站飛書（B 方案 4）：離開某一朝（之後又停靠過別站）以後，驛站信箱收到那一朝主人的求救信（BD_ML，一天最多 BD_ML_DAY 封），信裡一題殘局（#/canju/bl/<朝代>）；
     解開＝自動回信、修為 +15，隔天（手機日期）再打開信箱收到回禮：BD_ML.gift 那件珍品（沒有就那一朝隨機一件還沒有的；都有了＝修為 +25）。
   3 舊象棋、心結（A 方案 5）：每位旅伴一個跟本命子歷史有關的心結（BD_KN），寫在某一封信的附註（ps）裡；那封信的回禮就是解開心結要的珍品（主線一定拿得到）。
     拿到珍品後，在驛站信箱的「💭 心結」或渡口她站著的時候點她，把珍品拿給她看 → 聽一段話、修為 +30。珍品不會被拿走。
   4 七星軍師獻策（B 方案 3）：包一層 07g-battle.js 的 battleCouncil，旗艦戰役三策改由七星旅伴說（BD_PLAN，照 battles2.json 的戰役 id；原本的 who 對得上才換），
     選項標「小名・本命子：特色」；開發者 11/8 定案的史實那一策（ok）內容不變，解說後面補「歷史上提這一策的是誰」和原話；說話的人是玩家自己時，那一策照原本的軍師。
   朝代規矩：停在哪一朝（船艙＝已停靠的最晚那一朝）就不出現更晚的朝代、人物、書：信要寄來的那一朝不晚於現在才送到，心結 at 那一朝以後才能解。
   存檔 store "buddy"（JOURNEY_KEYS 的 m_buddy）＝{ev {朝代:{c 誰,at,f 找到東西的時間,done}},ml {朝代:{at 寄到,r 讀過,s 解開,sd 解開那天,g 收回禮的時間,gi 回禮}},
     kn {角色:{seen 看過附註,done}},md 今天,mn 今天寄到幾封,lb 解信前在哪一頁}；解題進度 store "cjRunBd"（也在 JOURNEY_KEYS）。
   測試：主控台 bdDev.ev("wudai") 重設那一朝的闖禍、bdDev.mail("wudai") 直接寄到那封信、bdDev.gift("wudai") 回禮當作明天、bdDev.kn("x_martialgirl") 看過心結、bdDev.reset() 全清。 */
const BUDDY_ON=true;
const BD_XP={ev:20,ml:15,gift:25,kn:30},BD_ML_DAY=2;
const BD_K={S:"x_swordboy",Y:"x_spiritgirl",H:"x_martialgirl",M:"x_miaogirl",F:"x_shuai",L:"x_shi",X:"x_bing"};
/* 渡口圖上要點的東西：形狀抄自 07w6b-scenedata.js 的各朝渡口物件（原圖像素 768×1376） */
const BD_OBJ={
  classic:{"繫纜樁":[[[678,1004],[714,1004],[714,1066],[678,1066]],[[586,1138],[616,1138],[616,1202],[586,1202]],[[474,1292],[504,1292],[504,1342],[474,1342]]]},
  qin:{"秦直道":[[[596,370],[642,376],[630,412],[584,440],[574,470],[594,496],[562,528],[518,528],[528,490],[524,460],[560,428],[600,400]]],"上岸的石階":[[[300,994],[380,988],[462,1008],[458,1106],[400,1112],[308,1062]]]},
  han:{"漢代烽燧":[[[44,256],[150,248],[150,366],[44,366]],[[180,238],[236,238],[236,314],[180,314]]],"紅柳":[[[608,388],[700,382],[768,392],[768,506],[640,506],[604,470]],[[268,604],[330,598],[382,630],[376,692],[290,702],[264,660]]]},
  sanguo:{"江上的帆船":[[[38,362],[70,318],[88,324],[112,374],[102,388],[38,388]],[[94,452],[130,348],[176,352],[216,420],[206,468],[100,472]]]},
  weijin:{"曲水":[[[228,420],[300,408],[362,428],[352,472],[322,502],[262,522],[240,482]]]},
  nanbei:{"江上的篷船":[[[452,968],[520,984],[604,1012],[604,1046],[540,1048],[466,1004]],[[446,1060],[540,1062],[604,1092],[600,1116],[460,1112]],[[588,1030],[700,1018],[738,1032],[730,1092],[596,1092]],[[46,918],[150,926],[150,966],[50,962]]]},
  sui:{"扁擔和籮筐":[[[212,884],[350,880],[352,912],[290,1012],[214,1012]],[[580,912],[700,896],[700,1052],[578,1052]]],"木板車":[[[300,940],[400,926],[470,940],[516,950],[510,968],[460,1050],[380,1052],[310,1010]]]},
  tang:{"西市":[[[420,330],[500,320],[560,302],[650,300],[768,300],[768,562],[690,562],[600,542],[570,452],[490,422],[420,402]]]},
  wudai:{"空板車":[[[318,800],[380,788],[472,888],[420,906],[328,882]]],"倒塌的土牆":[[[450,930],[560,914],[640,920],[700,958],[768,974],[768,1012],[640,1012],[500,1002],[450,982]]]},
  song:{"磚砌瞭望樓":[[[590,316],[666,316],[674,356],[670,390],[674,500],[584,500],[586,390],[582,356]]],"雷峰塔":[[[200,148],[256,148],[260,236],[198,236]]]},
  yuan:{"木柵欄":[[[398,668],[452,652],[470,700],[478,762],[506,770],[506,800],[398,800]],[[560,792],[650,812],[700,846],[700,880],[560,880]],[[700,792],[768,772],[768,862],[700,882]]],"氈帳":[[[202,596],[266,592],[270,642],[202,642]],[[54,490],[146,490],[146,532],[54,532]],[[534,504],[620,500],[768,522],[768,606],[660,606],[600,566],[534,550]],[[722,884],[768,880],[768,952],[722,952]]]},
  ming:{"篷船":[[[298,618],[350,610],[402,624],[396,658],[304,658]],[[438,572],[502,572],[502,602],[438,602]],[[532,580],[584,580],[584,606],[532,606]],[[428,1108],[572,1112],[572,1188],[438,1168]]],"石拱橋":[[[506,502],[560,486],[640,480],[702,494],[722,520],[716,562],[510,562]]]},
  qing:{"漕運糧船":[[[428,1002],[500,990],[560,900],[640,878],[768,878],[768,1132],[640,1142],[520,1132],[440,1082]]],"湖上的篷船":[[[24,310],[102,310],[102,354],[24,354]]]}};
/* 1 旅伴闖禍：每朝一串，第一位＝這一朝的主人（明朝兩位：學會前方庭、學會後城子），後面＝主人是玩家自己時代班。
   c 誰、o 要點的東西（BD_OBJ 的名字）、pz 題號（canju-set／ship-set，tools/buddy_engine.js 驗過）、t 闖的禍、ask 要找什麼、ok 找到時說、say 解題頁上方那句、oops 走錯第一步時說（沒寫＝她的輸棋台詞）、thx 道謝、n 小知識（有寫才出現）。
   {名}＝她怎麼叫玩家、{你}＝你／妳、{@F}＝某位七星的小名（就是玩家自己時變成「你」） */
const BD_EV={
  classic:[
    {c:"x_miaogirl",o:"繫纜樁",pz:"gm2013-B84A43K1A3r",t:"{名}！我在船艙前面練跳日字，一跳一拐，把說書人綁在繫纜樁上的纜繩踢鬆了！星槎晃來晃去，好像要漂走了……",ask:"找出渡口邊綁纜繩的「繫纜樁」",ok:"就是它！繩子重新綁好了。嘿嘿，接下來看我的傌！",say:"傌走日字，前面別有子擋住馬腳——跳兩下就到他家門口！",oops:"哎呀，馬腳被蹩住了……換條路再來！",thx:"船不晃了！謝謝{名}，下次我先看清楚再跳。"},
    {c:"x_swordboy",o:"繫纜樁",pz:"lk156",t:"我說繩子要拉直才綁得牢，用力一扯——纜繩從繫纜樁上滑掉了，星槎往雲裡飄了一點點……",ask:"找出渡口邊的「繫纜樁」，把繩子綁回去",ok:"找到了。這回我綁兩圈。",say:"俥走直線，一步就衝到底。先用俥將他一軍！",oops:"……我是不是又衝太快了？",thx:"繩子綁好了，船也穩了。{名}，謝了。下次我先看清楚路。"}],
  qin:[
    {c:"x_swordboy",o:"秦直道",pz:"lk242c4",t:"我幫修長城的民夫推土車，看準了就一直推，結果直直推上了渡口的石階——車輪卡住，一車黃土全撒了！民夫大叔說：車要走車的路。",ask:"找出遠方那條給車走的「秦直道」",ok:"原來車該走這條！又寬又直，一路通到北邊。",say:"俥找直路！兩隻俥輪流將軍，一路把他逼到底。",thx:"土車推上直道了，民夫大叔還分我一塊餅。{名}，路是你找的，謝了。"},
    {c:"x_miaogirl",o:"上岸的石階",pz:"sq125c9",t:"我跟{名}比誰先到渡口，我抄小路拐彎，結果牽著民夫的驢子卡在石階上，上不去也下不來！",ask:"找出驢子卡住的「上岸的石階」",ok:"在這裡！一階一階牽，不要硬跳。",say:"傌拐個彎就到！先跳傌，小心別被蹩了馬腳。",thx:"驢子下來了！{名}，拐彎不是走歪路，是換一條路走——你也幫我找到了路。"}],
  han:[
    {c:"x_miaogirl",o:"紅柳",pz:"lk203c7",t:"老驛騎的馬借我騎一下，我想抄近路，結果牠一頭鑽進紅柳叢，腳被枝條纏住，動都動不了——就像棋盤上的馬被蹩了腳！",ask:"找出纏住馬腳的那一叢「紅柳」",ok:"找到了！把枝條撥開，馬腳就鬆了。",say:"雙傌連環！一匹先跳開，另一匹的馬腳就通了。",thx:"馬兒沒事，老驛騎也沒罵我。原來繞一點路，比硬鑽還快呢，嘿嘿！"},
    {c:"x_swordboy",o:"漢代烽燧",pz:"lk249c4",t:"迷路的老驛騎要去玉門關，我說直直走就對了，結果在沙丘之間繞了一大圈，又回到渡口。",ask:"找個高的地方看清楚路：點那座「漢代烽燧」",ok:"從烽燧那裡看過去，路就清楚了。",say:"俥要先找到通的那一條線，再一直衝。",thx:"老驛騎上路了。看準了再走，才是真的直路。謝了，{名}。"}],
  sanguo:[
    {c:"x_shuai",o:"江上的帆船",pz:"xw056c8",t:"我學將軍站在岸邊揮小旗玩，江上兩艘帆船的船夫以為是號令，跟著我的旗子划——結果划進蘆葦裡卡住了。咳咳……我又不能自己跑過去。",ask:"找到那兩艘「江上的帆船」",ok:"看到了！這次我把旗子拿正。",say:"帥不出九宮，可是站對位置，對面的將就不敢露臉——這一步先動帥！",oops:"咳……下次，我不再躲在後面。",thx:"船都划出來了。原來坐在九宮裡，也幫得上忙。{名}，謝謝你替我跑這一趟。"},
    {c:"x_martialgirl",o:"江上的帆船",pz:"sq203c6",t:"江上起霧，我想大喊一聲給船夫壯膽——結果太大聲了，船夫嚇一跳，把帆繩鬆掉，船歪進蘆葦裡了！",ask:"找到那兩艘「江上的帆船」",ok:"在那裡！這次我小聲一點……盡量。",say:"隔一個，剛剛好！炮要先找好炮架再開。",thx:"船回來了！{名}你看，聲音不用大，打得準才厲害！"}],
  weijin:[
    {c:"x_spiritgirl",o:"曲水",pz:"xh-gm10541-202",t:"我在溪邊石頭上擺星槎石桌的那盤殘局，風一吹，一顆棋子滾進曲水裡漂走了。隔溪的隱士說要幫我撿，可是我不肯過溪——相不過河呀……",ask:"先找到棋子漂走的那條「曲水」",ok:"棋子卡在彎彎的地方，隱士幫我撿回來了。現在，先把這盤守住。",say:"相走田字、不過河。這一步只要守住，別讓他殺進來就好。",oops:"沒關係，我再把家守緊一點。",thx:"守住了，這盤是和棋。隱士隔著溪說：守得住，也是本事。{名}，謝謝你陪我顧家。"},
    {c:"x_swordboy",o:"曲水",pz:"mr022c4",t:"我嫌這條溪彎來彎去，搬石頭想把它堵直，結果隱士們放在水上漂的酒杯全卡住了！",ask:"找到被我堵住的那條「曲水」",ok:"石頭搬開了。……彎的水，也有彎的道理。",say:"俥一路走到底！三步都用俥。",thx:"酒杯又漂起來了。我想，直的跟彎的，可以一起走。謝了，{名}。"}],
  nanbei:[
    {c:"x_spiritgirl",o:"江上的篷船",pz:"xh-gm9532-186",t:"我替擺渡的老兵端茶，船一晃，整碗熱茶倒在他的包袱上——包袱裡是要寄給家人的信……",ask:"找到老兵的那艘「江上的篷船」",ok:"信沒濕，只濕了外面的布。還好。",say:"飛相守住河口，他的馬就過不來。",oops:"沒關係，我再把家守緊一點。",thx:"老兵說，信會送到的。相不過河，可是信會過河。{名}，謝謝你。"},
    {c:"x_miaogirl",o:"江上的篷船",pz:"lk054c7",t:"我想跳上擺渡的篷船，日字沒算好，一腳踩空——船沒翻，可是船上的竹篷被我扯歪了！",ask:"找到被我扯歪的那艘「江上的篷船」",ok:"就是這艘！篷子扶正了。",say:"三步都用傌：一跳、再跳、將軍！",thx:"船家沒生氣，還說我跳得遠。下次我先算好日字！"}],
  sui:[
    {c:"x_bing",o:"扁擔和籮筐",pz:"sq030c6",t:"我幫工匠挑土，只會往前衝，一轉身扁擔甩出去，兩個籮筐滾下河堤，泥土倒了一地！",ask:"找到我甩掉的「扁擔和籮筐」",ok:"撿回來了！這次我挑穩一點。",say:"兵過了河就能橫走——三步都用兵，一步一步擠到他面前！",thx:"工匠說我力氣大，只是要看路。往前走，也要記得看旁邊！"},
    {c:"x_swordboy",o:"木板車",pz:"sq188c6",t:"我推木板車運土，直直往前衝，車輪一下陷進泥溝裡，怎麼推都不動。",ask:"找到陷住的那輛「木板車」",ok:"墊幾塊木板，車就出來了。",say:"俥先直衝下去，再看兵能不能幫忙。",thx:"車推出來了。直路也要先看看有沒有坑。謝了，{名}。"}],
  tang:[
    {c:"x_shi",o:"西市",pz:"lk070c4",t:"我幫胡商顧攤子，只顧擋在攤子前面，誰也不讓靠近——結果客人全被我嚇跑了，胡商的寶刀一把也沒賣出去。",ask:"找到胡商擺攤的「西市」",ok:"我讓開一點，客人就進來了。",say:"仕先讓開，炮的路就通了。護著帥，也可以讓一步。",oops:"是我沒擋好……不對，是我擋太多了。",thx:"讓開一步，攤子反而熱鬧了。……原來不是擋得越多越好。謝謝你，{名}。"},
    {c:"x_miaogirl",o:"西市",pz:"lk024c4",t:"我聽到駱駝鈴，好像回到家裡的驛站，跟著駝隊一路跑，把胡商的香料撞翻了一袋！",ask:"回到「西市」，把香料袋找回來",ok:"找到了！一袋都沒少。",say:"傌跳過來、跳過去，三步就把他圍住！",thx:"胡商說，駱駝鈴也讓他想家。嘿嘿，我們都一樣。謝謝{名}！"}],
  wudai:[
    {c:"x_martialgirl",o:"空板車",pz:"sq243c4",t:"路上有野狗，我把一節竹子丟進火堆，想用響聲把牠嚇跑——「啪」一聲太響了，躲在空板車後面的小孩捂著耳朵哭了……",ask:"找到小孩躲著的那輛「空板車」",ok:"在這裡。我蹲下來，小小聲跟他說對不起。",say:"悶宮！他的將被自己的子堵住了，炮隔一個打過去就好——不用很大聲。",thx:"小孩不哭了，還拉著我的袖子。原來安靜一點，也能打得很準。{名}，謝謝你。",n:"把竹子丟進火裡燒，竹節裂開會「啪」一聲，古人叫它「爆竹」。南北朝的書就記過，過年時在院子前燒竹子，用響聲趕走山裡的怪物（這是古人的習俗和傳說）。"},
    {c:"x_bing",o:"倒塌的土牆",pz:"mr043c4",t:"我追著搶糧的野狗往前衝，一頭撞上那段土牆，牆又塌了一角，差點壓到路邊的人。",ask:"找到被我撞塌的那段「倒塌的土牆」",ok:"還好沒人受傷。我把土塊搬開了。",say:"兵一步一步往前，炮在後面幫我！",thx:"往前衝之前，先看看前面有什麼。謝謝{名}！"}],
  song:[
    {c:"x_martialgirl",o:"磚砌瞭望樓",pz:"sq146c6",t:"元宵夜，我偷試爺爺還沒做完的新煙火——火星飄到花燈上，燒掉一盞！瞭望樓上的人以為失火了，樓下的兵都要跑出來救火了！",ask:"快去「磚砌瞭望樓」跟樓上的人說清楚",ok:"樓上的大哥說，火滅了就好，下次別在燈底下放。",say:"炮在後面，前面那顆子當炮架——隔一個，剛剛好！",thx:"爺爺說，煙火要在空地上放，人要站遠，小孩不能自己點。我記住了！{名}，謝謝你陪我去認錯。"},
    {c:"x_miaogirl",o:"雷峰塔",pz:"mr075c4",t:"燈會上有個小孩跟家人走散了，我說我最會認路，帶著他走——結果我們兩個一起迷路了！",ask:"找一個大家都看得到的東西認方向：點湖對岸的「雷峰塔」",ok:"對著塔走，就是回渡口的路！",say:"傌拐三個彎，就把他圍住了！",thx:"找到他的家人了！認路不是靠跑得快，是靠記住大東西。謝謝{名}！"}],
  yuan:[
    {c:"x_miaogirl",o:"木柵欄",pz:"lk168c9",t:"我想幫驛站把驛馬趕進柵欄，一拐彎跳過頭，把木柵欄撞開一個缺口——三匹驛馬跑到草原上去了！",ask:"找到被我撞開的「木柵欄」",ok:"缺口補好了！馬兒聽到驛站的鈴聲，自己跑回來兩匹。",say:"臥槽馬！傌跳到他將門旁邊，看他往哪裡跑。",thx:"最後一匹也回來了。跑多遠，都看得到家。謝謝{名}！"},
    {c:"x_bing",o:"氈帳",pz:"lk172c7",t:"我第一次看到圓圓的氈帳，往前衝想摸摸看，一腳踩斷了拉氈帳的繩子，氈帳歪了一邊！",ask:"找到被我弄歪的「氈帳」",ok:"繩子接好了，氈帳又站直了。",say:"兵先擠進去，傌幫一步，最後再用兵！",thx:"牧民說氈帳本來就要常常修。往前衝也沒關係，記得回頭修好就行！"}],
  ming:[
    {c:"x_shuai",o:"篷船",pz:"sq351c4",t:"我第一次自己出門，學掌櫃在碼頭指揮卸貨——結果指錯了船，當鋪的一箱舊棋盤被搬上別人的篷船，快要開走了！",ask:"找到載著舊棋盤的那艘「篷船」",ok:"追上了！船家說他也覺得那箱子太重。",say:"這次我親自出手——帥先動，最後讓小兵擒王！",oops:"咳……下次，我不再躲在後面。",thx:"箱子搬回來了。……我自己走出門，也自己把事情收拾好了。謝謝你，{名}。"},
    {c:"x_shi",o:"石拱橋",pz:"sq134c6",t:"{@F}要過橋，我怕人多擠到{@F}，就張開手臂擋在石拱橋中間——結果整座橋的人都過不去，排成一長串在罵人。",ask:"找到被我擋住的那座「石拱橋」",ok:"我讓到旁邊，大家就走過去了。",say:"最後一步，仕讓開，炮就打得到他——讓開，也是一種守護。",oops:"是我沒擋好……不對，是我擋太多了。",thx:"{@F}自己過了橋，還回頭笑了一下。……讓開身子，好像也不錯。謝謝你，{名}。"}],
  qing:[
    {c:"x_bing",o:"漕運糧船",pz:"lk104c4",t:"老船工要我幫忙把一捆貨送上漕船，我只會往前衝，一個沒停住——貨掉進運河裡了！",ask:"找到那艘「漕運糧船」",ok:"貨卡在船邊，撈起來了！",say:"小兵擒王！兵走到他面前，炮在後面撐著。",thx:"老船工說，小卒也能幫大船過河。往前走，絕不退——但也要停得住！"},
    {c:"x_miaogirl",o:"湖上的篷船",pz:"lk148c5",t:"我跟{@X}在水巷送貨，一拐彎把一籃菱角送錯了船，那艘船都划到湖上去了！",ask:"找到湖上那艘「湖上的篷船」",ok:"追到了！菱角一顆都沒掉。",say:"傌連跳三步，跳到最後一步就將死！",thx:"下次轉彎前，我先看清楚是哪條船。謝謝{名}！"}]};
/* 2 驛站飛書：c 寫信的人、pz 題號、tt 信的標題、x 信的內容（一段一行）、say 解題頁上方那句、rp 回信寄到後她托驛騎捎回的話、gl 回禮的話、
   gift 回禮的珍品 [朝代,id]（null＝那一朝隨機一件還沒有的）、ps 附註＝心結（BD_KN）。寫信的人是玩家自己就不寄 */
const BD_ML={
  qin:{c:"x_swordboy",pz:"lk230c7",tt:"直道邊的求救",x:["{名}：","我在直道邊幫一位車夫顧車，他去找水，叫我顧好。我等得無聊，用石子在路邊擺星槎石桌上的那盤殘局。一位大叔湊過來看，說：三步之內將不死，就別擋在路中間。","我只會俥，三步都想用它。你幫我看看，該從哪裡直衝過去？","——阿轍（字是請驛站的人代寫的）"],say:"三步都用俥，直直衝過去！",rp:"照你的走法，三步就將死了！大叔哈哈笑，還幫車夫把車推上直道。",gl:"車夫說謝謝你，託驛騎捎來一件珍品。",gift:["qin","qin_chariot"],ps:1},
  han:{c:"x_miaogirl",pz:"sq253",tt:"大漠驛站的信",x:["{名}：","我在大漠驛站幫老驛騎餵馬，用石子擺星槎上的棋給他看。他聽說棋子裡的馬走日字，笑著說：那你三步都用馬，將得死嗎？","我跳了好幾次都被蹩腳……你幫我想想第一步！","——小梅（旁邊畫了一匹馬）"],say:"三步都用傌！第一步要跳哪裡呢？",rp:"跳對了！老驛騎拍拍我的頭，說我是他見過最會拐彎的小驛騎。",gl:"老驛騎託驛騎捎來一件漢朝的東西。",gift:null},
  sanguo:{c:"x_shuai",pz:"lk147c4",tt:"江邊營寨的信",x:["{名}：","我在江邊營寨的帳篷裡休息，咳得厲害，大家要我別出去。我用石子擺了一盤星槎石桌上的棋，教一位小兵下。他學得很快，說：主帥不必親自衝，可是要動對地方。","第一步要動帥。我想了很久……你能幫我看看嗎？","——方庭"],say:"第一步動帥，傌和炮才接得上。",rp:"帥一動，炮和傌就接上了。小兵說：坐在帳篷裡，也能贏。",gl:"小兵託驛騎捎來一件東西，說是營裡的人送的。",gift:["sanguo","sanguo_fan"],ps:1},
  weijin:{c:"x_spiritgirl",pz:"xh-gm5550-130",tt:"竹林裡的信",x:["{名}：","竹林裡的隱士看我在石板上擺星槎的棋，好奇地湊過來要學。他學得好快，一下子就攻過來了。","相只能在自己這邊走，可是我想守住這盤——你說，這一步該飛到哪裡？","——燕子"],say:"這一步只要守住就好。相，該飛到哪裡？",rp:"相一飛，他就攻不進來了。隱士搖著頭笑：守得這麼穩，這盤只好和棋。",gl:"隱士託驛騎捎來一件東西，說是謝謝你們教他新的棋。",gift:null},
  nanbei:{c:"x_spiritgirl",pz:"xh-gm7789-176",tt:"江邊茶棚的信",x:["{名}：","我回到江邊的茶棚，在桌上擺星槎石桌的殘局給擺渡的老兵看。他看了一會兒，說：紅方已經守不住了。","我不信。相不過河，可是相能守。你幫我找那一步。","——燕子"],say:"相不過河，可是相能守。找那一步。",rp:"守住了！老兵說，守得住家，才等得到人回來。",gl:"老兵託驛騎捎來一件東西，說是軍營裡算帳用的。",gift:["nanbei","nanbei_suanchou"],ps:1},
  sui:{c:"x_bing",pz:"sq209c5",tt:"運河工地的信",x:["{名}：","工匠休息的時候，我在地上畫了星槎的棋盤教他們。一位大哥說：兵最沒用，只會往前走。我氣得跟他賭：三步都用兵，將死給他看。","可是我不會……你幫我！","——溪兒（字寫得歪歪的）"],say:"三步都用兵！往前走，絕不退！",rp:"三個兵擠過去，將死了！大哥說：小兵也能贏，我服了。",gl:"那位大哥託驛騎捎來一件東西，說是賭輸的彩頭。",gift:["sui","sui_armor"],ps:1},
  tang:{c:"x_shi",pz:"lk160c5",tt:"西市的信",x:["{名}：","我在西市的攤子邊擺星槎的棋，一位胡商看得入迷，說：三步將得死，就送一份謝禮。我想贏來送給{@F}。","這盤要帥先退一步，再讓仕往前。我總是習慣擋在帥前面，不知道該怎麼往前……你幫我看看。","——城子"],say:"帥先退一步，仕再往前。這次換我往前。",rp:"帥先退一步，我往前吃掉他的車，俥就將死了。胡商說，原來護人不一定要擋在前面。",gl:"胡商託驛騎捎來一份謝禮。",gift:["tang","tang_yufu"],ps:1},
  wudai:{c:"x_martialgirl",pz:"lk219c6",tt:"逃荒路上的信",x:["{名}：","那個捂著耳朵的小孩，跟我學下棋了！他擺了一盤，說要看我的炮怎麼打。","三步都用炮。我想讓他看看：炮不用很大聲，也打得準。你幫我找第一步！","——花兒（這封信我寫得很小聲）"],say:"三步都用炮。不用大聲，要打得準。",rp:"三炮打完，他笑了，還說要學當炮架。",gl:"小孩託驛騎捎來一件東西，說是撿到的。",gift:null},
  song:{c:"x_martialgirl",pz:"sq206c5",tt:"臨安的信",x:["{名}：","作坊旁邊有人擺棋，說他的帥躲得好好的，誰也打不到。","我的炮最會隔一個打！可是這盤要先找好炮架……你幫我看。","——花兒"],say:"先找好炮架——隔一個，剛剛好！",rp:"砰！隔一個，剛剛好！那個人說，他的帥再也不敢說躲得好了。",gl:"爺爺託驛騎捎來一件東西，說是從作坊的舊箱子裡翻出來的。",gift:["song","song_fish"],ps:1},
  yuan:{c:"x_miaogirl",pz:"lk258c4",tt:"草原驛站的信",x:["{名}：","驛站來了一位拿著牌子的使臣，他換馬的時候跟我下了一盤，說：小姑娘，三步都用馬，你將得死我嗎？","我想給阿爹看看我有多會拐彎！你幫我找第一步。","——小梅"],say:"三步都用傌，拐彎給他看！",rp:"將死了！使臣說，他一路換了好多站的馬，我是最會跳的一匹。",gl:"使臣託驛騎捎來一件東西。",gift:["yuan","yuan_paizi"],ps:1},
  ming:{c:"x_shuai",pz:"mr034c4",tt:"徽州的信",x:["{名}：","我今天自己走到村口的石牌坊下，有位老先生在下棋。他說：帥要親自出來，這盤才贏得了。","我想試試看。帥先動——你幫我看看要往哪裡。","——方庭"],say:"帥先動。這一次，我親自出來。",rp:"帥自己往前走了兩步，俥就將死了！老先生說：小少爺，你走出來了。",gl:"老先生託驛騎捎來一件東西。",gift:null},
  qing:{c:"x_bing",pz:"lk048c6",tt:"揚州運河的信",x:["{名}：","老船工在船頭跟我下棋，說：兵一起過了河，能把他的將擠死。","我數了數，剛好三步！你幫我看第一步。","——溪兒"],say:"三步都用兵，擠到他面前！",rp:"兵擠到他面前，將死了！老船工說，小卒也能決定大局。",gl:"老船工託驛騎捎來一件東西。",gift:null}};
/* 3 心結：rl 要拿給她看的珍品 [朝代,id]（就是寫附註那封信的回禮）、at 停在這一朝以後才解得開（內容提到的最晚朝代）、ask 心結（也是信的附註）、ans 拿給她看以後她說的話、thx 最後一句 */
const BD_KN={
  x_swordboy:{rl:["qin","qin_chariot"],at:"qin",ask:"附：其實我一直有件事想不通。我爹趕的是運糧的車，可是象棋裡的「車」，大家都說是打仗的戰車。是不是只有戰車才算數？",
    ans:["你拿來的是始皇陵旁邊的銅車馬？……兩輛車，一輛在前面開路，一輛跟在後面載人。","原來車有好多種。打仗的車、載人的車、運糧的車——少了哪一種，大軍都走不遠。","象棋的車，一般說是從古時候打仗的車來的。可是不管哪一種車，都要先找到通的路，才能一直走。"],thx:"我爹的車也算數。……我想回去跟他說。"},
  x_spiritgirl:{rl:["nanbei","nanbei_suanchou"],at:"nanbei",ask:"附：有一件事我一直想不通。我是「相」，可是棋盤那一邊寫的是「象」。象……是大象嗎？",
    ans:["算籌？用小木棍排數字的那個？","我聽說北邊有一位皇帝寫過一本《象經》，講的是一種叫「象戲」的棋，跟今天的象棋不一樣。替這本書寫序的人說，象戲裡有天文、地理、算數……一盤棋，好像把天下的萬物都擺了上去。","所以「象」也可以是「萬象」的象。不過這只是其中一種說法，到底怎麼來的，古書沒有說清楚。"],thx:"大象也好，萬象也好——我守在自己這一邊，也能看見很多東西。"},
  x_martialgirl:{rl:["song","song_fish"],at:"song",ask:"附：我一直想問。我的炮是火字旁，可是對面黑的那一顆，常寫成石頭旁的「砲」。以前的「砲」，到底是什麼？",
    ans:["指南魚？……這是《武經總要》裡記的東西！","那本書是北宋朝廷叫人編的兵書，裡面畫了好多「砲」：用木頭搭的大架子，很多人一起拉繩，把石頭拋出去打城牆——所以是石頭旁。","書裡還記了火藥的做法，把火藥包成火球，也放在砲上拋出去。石頭旁、火字旁，原來是一家人！"],thx:"有人說，炮隔一個子打過去，就像把石頭拋過城牆。我喜歡這個說法！"},
  x_miaogirl:{rl:["yuan","yuan_paizi"],at:"yuan",ask:"附：驛馬一站換一站，跑得好快。可是棋盤上的傌，一次只能跳一個日字，還會被蹩腳——傌是不是很沒用？",
    ans:["這面牌子！驛站常常有拿著牌子的使臣來，阿爹說，他們是替皇帝傳話、辦事的人。","他們不是騎一匹馬跑到天邊，是到了一站就換一匹馬，一站一站接力跑過去的。","傌也一樣呀：一次一個日字，跳一步、再跳一步，也能跳遍整個棋盤。"],thx:"嘿嘿，那我就是棋盤上的驛馬！"},
  x_shuai:{rl:["sanguo","sanguo_fan"],at:"weijin",ask:"附：我常想，帥一步都不能走出九宮，就像我被關在院子裡。這樣的帥，到底有什麼用？",
    ans:["羽扇……我聽過一個故事。","後來有人記下來，說諸葛亮打仗的時候，坐在車上、拿著白羽扇指揮三軍。這是後人寫的，不一定真是這樣。","可是我懂了：坐在中間的人，也能讓整個陣都動起來。帥守在九宮裡，大家才知道要護著誰、往哪裡打。"],thx:"九宮不是籠子……是大家的中心。咳，我好像沒那麼喘了。"},
  x_shi:{rl:["tang","tang_yufu"],at:"tang",ask:"附：我常想，我只是個擋刀的。仕在棋盤上，到底算什麼？",
    ans:["銅魚符……分成兩半，一半在宮裡，一半在官員身上，兩半對得上，才算數。","拿著另一半的人，一定是被信任的人。","仕守在帥旁邊，不是因為只會擋刀，是因為帥最信任他。"],thx:"……被信任，跟當盾牌，好像不一樣。我想慢慢學會前面那一個。"},
  x_bing:{rl:["sui","sui_armor"],at:"sui",ask:"附：我身上那塊布繡的是「卒」，可我的棋子寫的是「兵」。紅的叫兵，黑的叫卒——卒是不是比兵低一等？",
    ans:["明光鎧！胸口兩塊圓圓的護片，太陽一照亮晶晶。","上了戰場，大家都是拿著兵器往前走的人。「兵」本來是兵器的意思，後來也指拿兵器打仗的人；「卒」常常說的是走路打仗的步兵。","紅方寫兵、黑方寫卒，一般說只是讓兩邊分得清楚，誰也不比誰低。"],thx:"那我的「卒」字布，跟我的「兵」，是一家人！"}};
/* 4 七星軍師獻策：BD_PLAN[戰役 id]＝{w:原本三策的 who（對得上才換）, o:[[誰, 本命子：特色, 她說的話]…]}；史實那一策只換說話的人和口吻 */
const BD_PLAN={
  qin_1:{w:["田忌","一位謀士","孫臏"],o:[["x_swordboy","俥：直線強攻","趙國快撐不住了！看準邯鄲，一直衝過去救人！"],["x_spiritgirl","相：先求和","先派人去魏國，好好說，請他們別再打趙國了吧。"],["x_martialgirl","炮：隔山打","別去邯鄲！魏國的兵都在外面，家裡空空的。我們隔一個打——去打他們的都城大梁，他們一定得回頭救家！"]]},
  han_1:{w:["一位將軍","韓信","一位謀士"],o:[["x_spiritgirl","相：守住本陣","我們人少，先在山上紮好營，把家守緊，等他們來。"],["x_miaogirl","傌：繞到後面","先派一隊騎兵，每人帶一面紅旗躲進山裡。大軍背著河擺陣，把他們引出營，騎兵再繞進空營，插滿我們的紅旗！"],["x_swordboy","俥：直線強攻","全軍衝出井陘口，跟他們正面打！"]]},
  sanguo_15:{w:["一位將軍","一位謀士","荀攸"],o:[["x_swordboy","俥：直線強攻","白馬快撐不住了！全軍直奔白馬，跟顏良拚了！"],["x_spiritgirl","相：退回守家","白馬太遠了，我們退回官渡，把家守好就好。"],["x_miaogirl","傌：聲東擊西","先往延津走，假裝要渡河繞到袁紹後面。他一分兵來擋，我們再拐個彎，用輕兵快跑去白馬，打顏良一個措手不及！"]]},
  sanguo_2:{w:["張昭等大臣","一位將軍","黃蓋"],o:[["x_shi","仕：保住大家","對面的兵太多了……投降的話，大家都能平安吧？"],["x_swordboy","俥：正面硬拚","我們也把戰船全拿出來，一艘對一艘，硬拚到底！"],["x_martialgirl","炮：一點就著","你們看，他們的船一艘接一艘連在一起！只要點著一艘，火就會一路燒過去！"]]},
  weijin_1:{w:["一位將軍","一位謀士","杜預"],o:[["x_spiritgirl","相：穩穩守著","夏天快到了，江水要漲，又容易生病。先停下來，等冬天再打吧。"],["x_shi","仕：先講和","我們先停在江陵，派人去勸吳主投降，就不用再打了。"],["x_bing","兵：絕不後退","現在大家正往前衝，一停下來就洩氣了！各路一起往前推，水軍順著江直下建業！"]]},
  weijin_4:{w:["一位將軍","謝玄","一位謀士"],o:[["x_spiritgirl","相：守在河邊","我們守住這邊河岸，等他們渡河渡到一半，再衝過去。"],["x_martialgirl","炮：借對面的勢","去跟他們說：你們往後退一點，讓我們過河，痛痛快快打一場！他們一動，我們就有機會。"],["x_miaogirl","傌：夜裡繞過去","趁天黑偷偷渡河，繞到他們營後面偷襲！"]]},
  nanbei_6:{w:["群臣","一位謀士","拓跋燾"],o:[["x_swordboy","俥：正面攻城","等攻城的器械和步兵都到齊，再一口氣正面攻上去！"],["x_spiritgirl","相：圍住慢慢等","把城圍起來，等他們糧食吃完，自己就會出來投降。"],["x_miaogirl","傌：先退再跳","攻城最吃虧！我們只帶少少的騎兵到城下，裝作又累又少，把他們整個引出城，再回頭打！"]]},
  nanbei_4:{w:["一位將軍","一位謀士","韋孝寬"],o:[["x_swordboy","俥：衝出去","打開城門衝出去，跟他們拚了！"],["x_shi","仕：保住性命","外面說不會有援兵了……投降的話，至少大家能活下來。"],["x_spiritgirl","相：守城有法","沿著城牆裡面挖一條又長又深的溝。他們的地道一挖到溝邊，我們就丟柴草進去，用火和煙把他們逼回去。家，要這樣守。"]]},
  sui_1:{w:["一位將軍","高熲","一位謀士"],o:[["x_swordboy","俥：直線強攻","把大軍全集合起來，一口氣渡江打過去！"],["x_martialgirl","炮：虛晃一招","每到江南要收成的時候，我們就在江邊集合兵馬，假裝要打。來好幾次，他們就不信了——那時候再真的打！"],["x_spiritgirl","相：守好北岸","長江太難過了，我們守好北邊就好。"]]},
  tang_1:{w:["蕭瑀、屈突通等人","薛收","一位將軍"],o:[["x_spiritgirl","相：先退守","兩邊都是敵人，太危險了，先退到新安守著吧。"],["x_shuai","帥：親自出馬","留一部分兵繼續圍住洛陽，主帥親自帶精兵，搶先守住虎牢關，擋住竇建德！"],["x_swordboy","俥：全力直衝","全部兵馬一起去打竇建德，洛陽先不管了！"]]},
  wudai_2:{w:["李存勗","一位謀士","周德威"],o:[["x_swordboy","俥：速戰速決","我們是遠道來救人的，最好馬上打，速戰速決！"],["x_spiritgirl","相：退回守家","梁軍太強了，我們先撤回晉陽，以後再說。"],["x_miaogirl","傌：拐彎拖住他","先退到高邑，把他們引出營。他們追，我們就退；他們回去，我們就出。再派騎兵去搶他們的糧草，等他們又餓又累再打！"]]},
  wudai_4:{w:["馮道等大臣","柴榮","一位將軍"],o:[["x_shi","仕：護住主帥","主帥剛登基，太危險了，請待在京城，派大將去就好。"],["x_shuai","帥：親自出九宮","對方就是看主帥年輕，才敢打過來。這一次，主帥要親自上陣！"],["x_spiritgirl","相：守城等著","先把城守好，等敵人自己累了就會退。"]]},
  song_6:{w:["一位將軍","一位謀士","樊若水"],o:[["x_swordboy","俥：一船一船衝","造很多戰船，一船一船載著兵直接衝過江！"],["x_spiritgirl","相：守在北岸","長江太難過，我們在北岸紮營，等他們自己投降。"],["x_bing","兵：過了河就能橫走","江面有多寬，我已經偷偷量好了！只要在采石用船連成一座浮橋，大軍就能一步一步走過去——過了河，什麼路都能走！"]]},
  song_1:{w:["王欽若","寇準","陳堯叟"],o:[["x_shi","仕：先護主帥離開","京城太危險了，先護著皇上搬到南邊的金陵去吧。"],["x_shuai","帥：主帥上前線","皇上要親自到澶州前線！將士看到主帥來了，膽子就大了。"],["x_miaogirl","傌：繞到大後方","搬到四川的成都吧，那裡有高山擋著，最安全。"]]},
  yuan_6:{w:["一位將軍","一位謀士","哲別"],o:[["x_swordboy","俥：正面強攻","集中全部兵力，從正面攻上關口！"],["x_shi","仕：先勸降","先派人去勸守關的將軍投降吧。"],["x_miaogirl","傌：先退再回頭","我們假裝打不下來，往後退。他們一定會出關來追，等他們離開關口，我們再拐回來打！"]]},
  yuan_5:{w:["一位將軍","一位謀士","郭興"],o:[["x_swordboy","俥：正面對撞","我們也把船排成一大排，跟他的大船正面撞！"],["x_spiritgirl","相：回家守著","洪都太遠了，別救了，先回應天守住老家。"],["x_martialgirl","炮：火攻","他的大船連在一起，又大又笨重——用火燒！一燒起來，想躲都躲不開！"]]},
  ming_1:{w:["常遇春","一位謀士","朱元璋"],o:[["x_swordboy","俥：直搗中宮","直接打進大都！首都一拿下，其他地方就會跟著投降。"],["x_spiritgirl","相：先守家","北方太遠了，我們先守住江南，等他們自己亂。"],["x_bing","兵：一步一步推進","先拿山東，再拿黃河南北，再守住潼關——像小兵一步一步往前推，等大都四面都空了，就拿得下來！"]]},
  ming_2:{w:["徐珵","一位大臣","于謙"],o:[["x_miaogirl","傌：往南繞開","天上的星星都變了，我們把京城搬到南方去吧！"],["x_shi","仕：先救主帥","皇上被抓走了！送很多金銀過去，把皇上贖回來吧！"],["x_shuai","帥：守住九宮","京城不能丟！從各地調兵進來，修好城牆、備好兵器，在城門外擺好陣等他們。"]]},
  qing_1:{w:["一位將軍","一位謀士","努爾哈赤"],o:[["x_spiritgirl","相：處處都守","四路都要擋！我們也分成四隊，每一路都派人去守。"],["x_shi","仕：守在城裡","躲在城裡守著，等他們走累了自己回去。"],["x_swordboy","俥：集中一路","南邊那路是要騙我們分兵的，從西邊來的才是主力！把全部的兵集中起來，先直直打垮那一路！"]]}};

/* ---------- 共用 ---------- */
function bdOk(){try{return BUDDY_ON&&!!journey()&&!!myChar()&&!shipAppr()}catch(e){return false}}
function bdSt(){const S=store.get("buddy",null)||{};for(const k of["ev","ml","kn"])if(!S[k]||typeof S[k]!=="object")S[k]={};return S}
const bdSave=S=>store.set("buddy",S);
const bdMe=()=>{try{return myChar()}catch(e){return""}};
const bdDay=()=>{try{return localDay()}catch(e){return new Date().toDateString()}};
const bdPc=c=>(WX_CHARS[c]||{}).pc||"";
/* 小名（小梅叫燕子「燕子姊姊」）；by＝誰在說 */
const bdNk=(c,by)=>by===BD_K.M&&c===BD_K.Y?"燕子姊姊":((WX_CHARS[c]||{}).nk||(WX_CHARS[c]||{}).n||"");
function bdTx(s,by){const me=bdMe(),M=WX_CHARS[me]||{},you=M.sx==="f"?"妳":"你";return String(s||"").replace(/\{@([SYHMFLX])\}/g,(m,k)=>BD_K[k]===me?you:bdNk(BD_K[k],by)).replace(/\{名\}/g,bdNk(me,by)).replace(/\{你\}/g,you)}
const bdOops=c=>((WX_CHARS[c]||{}).lose||[])[0]||"再想想……";
/* 現在停在哪一朝（照年代排第幾）；船艙＝已停靠的站裡最晚的那一朝 */
function bdNowCh(){let k="classic";try{k=shipAt()}catch(e){}if(k!=="classic")return SHIP_ROUTE.indexOf(k);let m=0;try{for(const e of shipDocked())m=Math.max(m,SHIP_ROUTE.indexOf(e))}catch(e){}return m}
const bdCan=e=>SHIP_ROUTE.indexOf(e)>=0&&SHIP_ROUTE.indexOf(e)<=bdNowCh();
function bdCss(){if(document.getElementById("bdCss"))return;const s=document.createElement("style");s.id="bdCss";s.textContent=`
.bd-mark{position:absolute;z-index:151;transform:translate(-50%,-100%);width:28px;height:28px;border-radius:50%;background:#C0392B;color:#fff;font:900 18px/28px var(--serif,serif);text-align:center;box-shadow:0 0 0 2px #fff,0 2px 6px rgba(0,0,0,.35);pointer-events:none;animation:bdBob 1.4s ease-in-out infinite}
.bd-mark.kn{background:#C8962E;font-size:15px}
@keyframes bdBob{0%,100%{margin-top:0}50%{margin-top:-6px}}
.bd-card{display:flex;gap:10px;align-items:center;width:100%;text-align:left;margin-top:10px;border:1.5px solid #C0392B;cursor:pointer;font:inherit;color:inherit}
.bd-face{width:52px;height:52px;border-radius:50%;object-fit:cover;object-position:top;background:#efe6d6;flex:none}
.bd-say{display:flex;gap:10px;align-items:flex-start;margin:8px 0;text-align:left}.bd-say p{margin:0;line-height:1.8;font-size:15.5px}
.bd-ban{position:absolute;z-index:160;left:8px;right:8px;top:8px;display:flex;gap:6px;align-items:center;padding:6px 8px;border-radius:12px;background:rgba(251,246,234,.96);border:1.5px solid #3a2618;color:#2f2216;font:700 13.5px/1.5 var(--serif,serif);box-shadow:0 2px 8px rgba(0,0,0,.25)}
.bd-ban b{flex:1;min-width:0}.bd-ban img{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:top;flex:none}
.bd-ban button{flex:none;border:1px solid #3a2618;background:#fff;color:#2f2216;border-radius:99px;padding:3px 9px;font:700 12.5px/1.3 var(--serif,serif);cursor:pointer}
.bd-fx{position:absolute;pointer-events:none;z-index:4;overflow:visible}
.bd-fx polygon{fill:rgba(255,236,190,.28);stroke:#ffd36b;stroke-width:3px;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 6px rgba(255,200,80,.95))}
.bd-fx.hint{animation:bdGlow 1.3s ease-in-out 2}
@keyframes bdGlow{0%,100%{opacity:.15}50%{opacity:1}}
.bd-lt{background:#fbf6ea;color:#2f2216;border:1px solid #d9c9a8;border-radius:10px;padding:10px 12px;line-height:1.9;font-family:var(--serif,serif);text-align:left}.bd-lt p{margin:0 0 6px}
.bd-ps{color:#7a4a2a;font-size:14.5px}.bd-note{font-size:13.5px;line-height:1.7;text-align:left}
.bd-rl{display:flex;gap:10px;align-items:center;margin:8px 0;text-align:left}.bd-rl .im{width:64px;height:64px;flex:none;display:flex;align-items:center;justify-content:center;font-size:36px}
@media (prefers-reduced-motion:reduce){.bd-mark,.bd-fx.hint{animation:none}}`;document.head.append(s)}
const bdFace=c=>`<img class="bd-face" src="data/xs/prev_${c}.webp" alt="" onerror="this.style.visibility='hidden'">`;
const bdSay=(c,line)=>`<div class="bd-say">${bdFace(c)}<p><b>${esc(bdNk(c))}</b>「${esc(bdTx(line,c))}」</p></div>`;

/* ---------- 1 旅伴闖禍 ---------- */
/* 這一朝渡口的主人（07f shipWho 那一套；說書人＝空字串）。跟 07w4 ph4Who 一樣，只是不排除玩家自己 */
function bdHost(k){try{const Ls=SHIP_LESSON[k]||{},T=SHIP_STOP[k]||{};const by=shipLearned(k)&&Ls.done?Ls.doneBy:Ls.openBy;if(by==="teller")return"";return by||(T.who||[])[0]||""}catch(e){return""}}
/* 這一朝誰闖禍：開始過就固定那一位；否則主人（不是玩家自己），再不然代班 */
function bdEvent(k){const L=BD_EV[k];if(!L)return null;const me=bdMe(),R=bdSt().ev[k];if(R&&R.c){const e=L.find(x=>x.c===R.c);if(e&&e.c!==me)return e}const h=bdHost(k);return L.find(x=>x.c===h&&x.c!==me)||L.find(x=>x.c!==me)||null}
/* 秦到五代還沒有今天的象棋：跟 07f 千秋殘局一樣說明這是星槎石桌上的殘局 */
const bdOldTip=k=>typeof SHIP_OLD!=="undefined"&&SHIP_OLD.has(k)?'<div class="muted" style="font-size:12px;margin-top:2px">這一朝還沒有今天的象棋；這是星槎石桌上的殘局，題目出自後世的棋譜。</div>':"";
const bdGoPz=k=>{location.hash="#/canju/bd/"+k};
function bdEvOpen(v,k,E){bdCss();const S=bdSt();if(!S.ev[k]){S.ev[k]={c:E.c,at:Date.now()};bdSave(S)}const f=!!(bdSt().ev[k]||{}).f,nk=bdNk(E.c),pc=bdPc(E.c);
  sheet("❗ "+nk+"闖禍了",b=>{b.innerHTML=`${bdSay(E.c,E.t)}<p class="muted" style="font-size:13.5px;line-height:1.7;margin:4px 0 8px">♟ ${esc(pc)}：${esc((typeof WX_PC_RULE!=="undefined"&&WX_PC_RULE[pc])||"")}</p>
    ${f?"":`<p style="line-height:1.8;margin:0 0 10px;font-size:14.5px">① 在渡口的畫裡，${esc(bdTx(E.ask,E.c))}。<br>② 用${esc(nk)}的${esc(pc)}，解一題 1～3 步的殘局。</p>`}
    <button class="btn" id="bdGo" style="width:100%">${f?"♟ 繼續幫"+esc(nk)+"解圍":"🔎 好，我來幫忙！"}</button><button class="btn ghost" id="bdNo" style="width:100%;margin-top:8px">等一下再說</button>`;
    b.querySelector("#bdGo").onclick=()=>{closeSheet();if(f)bdGoPz(k);else setTimeout(()=>bdFind(v,k,E),280)};b.querySelector("#bdNo").onclick=()=>closeSheet()})}
/* 點在形狀裡、或離邊不到 tol 像素（原圖座標） */
function bdIn(s,p){let c=false;for(let i=0,j=s.length-1;i<s.length;j=i++){const[xi,yi]=s[i],[xj,yj]=s[j];if((yi>p[1])!==(yj>p[1])&&p[0]<(xj-xi)*(p[1]-yi)/(yj-yi||1e-9)+xi)c=!c}return c}
function bdSeg(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],L=dx*dx+dy*dy||1,t=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/L));return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy)}
function bdNear(S,p,tol){return S.some(s=>bdIn(s,p)||s.some((a,i)=>bdSeg(p,a,s[(i+1)%s.length])<tol))}
function bdDraw(P,I,S,cls,ms){const ns="http://www.w3.org/2000/svg",g=document.createElementNS(ns,"svg");g.setAttribute("class","bd-fx "+cls);g.setAttribute("aria-hidden","true");g.setAttribute("viewBox","0 0 768 1376");g.setAttribute("preserveAspectRatio","none");
  Object.assign(g.style,{left:I.offsetLeft+"px",top:I.offsetTop+"px",width:I.offsetWidth+"px",height:I.offsetHeight+"px"});g.innerHTML=S.map(s=>`<polygon points="${s.map(q=>q.join(",")).join(" ")}"/>`).join("");P.append(g);setTimeout(()=>g.remove(),ms)}
/* 找東西：圖上方一條提示；在 v 上用捕獲先看一眼（比 07w 走路、07w6 物件說明早）——點到要找的東西就攔下來，點別處照常（角色照走、說明照跳） */
function bdFind(v,k,E){const P=v&&v.querySelector(".shp-page.cq"),I=P&&P.querySelector(":scope>img"),S0=(BD_OBJ[k]||{})[E.o];if(!P||!I||!S0||!P.isConnected){bdGoPz(k);return}
  bdCss();P.querySelectorAll(".bd-ban").forEach(x=>x.remove());const nk=bdNk(E.c);
  const ban=document.createElement("div");ban.className="bd-ban";ban.setAttribute("role","status");ban.innerHTML=`<img src="data/xs/prev_${E.c}.webp" alt="" onerror="this.remove()"><b>🔎 ${esc(bdTx(E.ask,E.c))}</b><button type="button" data-h>💡 提示</button><button type="button" data-x aria-label="先不找了">✕</button>`;P.append(ban);P.dataset.bdFind="1";
  try{P.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}
  let miss=0,done=false;const pt=e=>{const r=I.getBoundingClientRect();if(!r.width||!r.height)return null;return[(e.clientX-r.left)/r.width*768,(e.clientY-r.top)/r.height*1376]};
  const glow=c=>{if(P.isConnected)bdDraw(P,I,S0,c,c==="ok"?1900:2800)};
  const hintT=setTimeout(()=>{if(!done&&ban.isConnected)glow("hint")},12000);
  const off=()=>{done=true;clearTimeout(hintT);v.removeEventListener("click",on,true);delete P.dataset.bdFind};
  const on=e=>{if(done)return;if(!P.isConnected){off();return}const t=e.target;if(!t||!P.contains(t))return;
    if(t.closest(".bd-ban")){e.stopPropagation();e.preventDefault();const b=t.closest("button");if(b&&b.hasAttribute("data-h")){glow("hint")}else if(b&&b.hasAttribute("data-x")){off();ban.remove()}return}
    if(t.closest("button,a,input,select,textarea,label,[role=button]"))return;
    const p=pt(e);if(!p)return;
    if(bdNear(S0,p,28)){e.stopPropagation();e.preventDefault();off();if(typeof vibrate==="function")vibrate([10,30,10]);glow("ok");
      ban.querySelector("b").textContent=`${nk}：「${bdTx(E.ok,E.c)}」`;ban.querySelectorAll("button").forEach(x=>x.remove());
      const S=bdSt();(S.ev[k]=S.ev[k]||{c:E.c,at:Date.now()}).f=Date.now();bdSave(S);setTimeout(()=>{ban.remove();if(v.isConnected&&/^#\/port/.test(location.hash))bdGoPz(k)},1900);return}
    if(++miss===2)glow("hint")};
  v.addEventListener("click",on,true);
  const watch=setInterval(()=>{if(done||!P.isConnected){clearInterval(watch);if(!done)off()}},1000)}
/* 渡口：主人頭上冒「！」（或心結的 🎁）；3D 主人沒站出來就在圖下面放一張小卡 */
function bdPort(v,k){if(!bdOk())return;const P=v&&v.querySelector(".shp-page.cq"),pad=v&&v.querySelector(".pad.port");if(!P||!pad)return;
  const E=bdEvent(k),evOn=!!E&&!((bdSt().ev[k]||{}).done),kc=evOn?"":bdKnHere(k);if(!evOn&&!kc)return;bdCss();
  const who=evOn?E.c:kc,nk=bdNk(who),act=()=>{if(evOn&&!((bdSt().ev[k]||{}).done))bdEvOpen(v,k,E);else if(kc)bdKnOpen(kc)};
  let card=null;const addCard=()=>{if(card||!pad.isConnected)return;card=document.createElement("button");card.type="button";card.className="card bd-card";
    card.innerHTML=`${bdFace(who)}<span style="flex:1;min-width:0"><b>${evOn?"❗ "+esc(nk)+"闖禍了！":"🎁 "+esc(nk)+"在等你"}</b><br><span class="muted" style="font-size:13px">${evOn?"點這裡聽她說，幫她解圍":"把找到的珍品拿給她看"}</span></span><span class="muted">›</span>`;
    card.onclick=()=>{if(typeof vibrate==="function")vibrate(5);act()};const say=pad.querySelector(".port-say");if(say)say.after(card);else pad.prepend(card)};
  const hit=P.querySelector(".ph4-hit");let stand=false;try{stand=typeof ph4Who==="function"&&ph4Who(k)===who}catch(e){}
  if(!hit||!stand){addCard();return}
  const mk=document.createElement("div");mk.className="bd-mark"+(evOn?"":" kn");mk.setAttribute("aria-hidden","true");mk.textContent=evOn?"！":"🎁";mk.style.display="none";P.append(mk);
  hit.setAttribute("aria-label",nk+(evOn?"：她闖禍了，點她聽她說":"：她在等你"));
  const cap=e=>{if(!mk.isConnected){v.removeEventListener("click",cap,true);return}if(e.target!==hit||P.dataset.bdFind)return;e.stopPropagation();e.preventDefault();if(typeof vibrate==="function")vibrate(5);act()};
  v.addEventListener("click",cap,true);
  let n=0;const stop=()=>{mk.remove();v.removeEventListener("click",cap,true)};
  const tick=()=>{if(!P.isConnected||!mk.isConnected){stop();return}if(evOn&&(bdSt().ev[k]||{}).done){stop();return}if(!hit.isConnected){stop();addCard();return}
    const on=hit.style.display!=="none"&&!P.classList.contains("pc-run")&&!document.querySelector(".walkc");
    if(on){mk.style.display="";mk.style.left=(parseFloat(hit.style.left)+parseFloat(hit.style.width)/2)+"px";mk.style.top=(parseFloat(hit.style.top)-2)+"px"}else{mk.style.display="none";if(++n===50)addCard()}
    setTimeout(tick,400)};
  tick()}
/* 解題頁設定（07c-canju.js CanjuPlay 的 XM） */
function bdEvXM(k){const back=()=>"#/port";if(!bdOk())return{err:"雲河七星的旅程才有旅伴闖禍。",back};const R=bdSt().ev[k],E=R&&(BD_EV[k]||[]).find(x=>x.c===R.c);
  if(!E)return{err:"這件事還沒發生：先到渡口點她，聽她說闖了什麼禍。",back};const nk=bdNk(E.c),pc=bdPc(E.c);
  return{id:E.pz,rk:"cjRunBd",back,top:"❗ 旅伴闖禍",icon:"❗",noXP:true,nudgeN:2,ans:"看答案這一題就不算幫她解圍（也沒有修為），確定？",
    head:P=>`<b>❗ ${esc(nk)}闖的禍・${esc(pc)}當主角</b>・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span><div class="shp-psay">${esc(nk)}：「${esc(bdTx(E.say,E.c))}」</div>${bdOldTip(k)}`,
    wrong:(u,step)=>step===0?nk+"："+bdTx(E.oops||bdOops(E.c),E.c):"",
    mark:()=>{const S=bdSt(),R2=S.ev[k]||(S.ev[k]={c:E.c,at:Date.now()}),first=!R2.done;if(first){R2.done=Date.now();bdSave(S);if(typeof addXP==="function")setTimeout(()=>addXP(BD_XP.ev,"旅伴解圍","bd:ev:"+k),1200)}return{first}},
    done:(x,ans)=>{if(ans||!x)return`<p class="muted">看了答案，這次先不算幫她解圍；不看答案再解一次就算。</p>`;bdCss();return bdSay(E.c,E.thx)+(E.n?`<p class="muted bd-note">📜 ${esc(E.n)}</p>`:"")+(x.first?`<p>✨ 修為 +${BD_XP.ev}</p>`:"")},
    next:()=>"#/port",nextL:()=>"回渡口"}}

/* ---------- 2 驛站飛書 ---------- */
/* 寄到：那一朝停靠過、現在不在那裡、之後又停靠過別站，而且不比現在停的朝代晚；一天最多 BD_ML_DAY 封 */
function bdArrive(){if(!bdOk())return;const S=bdSt(),me=bdMe(),day=bdDay();let D=[],here="";try{D=shipDockList()||[];here=shipAt()}catch(e){return}if(S.md!==day){S.md=day;S.mn=0}let ch=false;
  for(const e of SHIP_ROUTE){const L=BD_ML[e];if(!L||L.c===me||S.ml[e])continue;if((S.mn|0)>=BD_ML_DAY)break;const i=D.indexOf(e);if(i<0||e===here||i>=D.length-1||!bdCan(e))continue;S.ml[e]={at:Date.now()};S.mn=(S.mn|0)+1;ch=true}
  if(ch)bdSave(S)}
const bdMlShown=(S,e)=>!!S.ml[e]&&!!BD_ML[e]&&BD_ML[e].c!==bdMe()&&bdCan(e);
const bdGiftReady=M=>!!M&&!!M.s&&!M.g&&M.sd!==bdDay();
function bdUnread(){if(!bdOk())return 0;const S=bdSt();let n=0;for(const e in S.ml){if(!bdMlShown(S,e))continue;const M=S.ml[e];if(!M.r||bdGiftReady(M))n++}return n}
function bdKnReady(c,S){const K=BD_KN[c],R=(S||bdSt()).kn[c];return!!K&&!!R&&R.seen&&!R.done&&c!==bdMe()&&bdCan(K.at)&&bdCan(K.rl[0])}
function bdHas(e,id){try{return(relicsMine()[e]||[]).includes(id)}catch(e2){return false}}
/* 驛站信箱最上面一段：旅伴的信、心結 */
function bdMailInject(){if(!bdOk())return;bdArrive();const b=document.querySelector("#sheet .sh-b");if(!b||b.querySelector(".bd-mail"))return;const S=bdSt();
  const row=(ic,t,s,a)=>`<button class="item" ${a}><span class="lb" style="font-size:22px">${ic}</span><span class="tx"><b>${t}</b><span>${s}</span></span><span class="muted">›</span></button>`;
  const ls=SHIP_ROUTE.filter(e=>bdMlShown(S,e)).map(e=>{const L=BD_ML[e],M=S.ml[e],nk=esc(bdNk(L.c));const st=!M.r?"🆕 新信":!M.s?"還沒回信":bdGiftReady(M)?"🎁 回禮到了":!M.g?"回信寄出了，回禮明天到":"已收回禮";
    return row("💌",`${nk}的信・${esc(L.tt)}`,`寄自${esc(eraLabel(e))}・${st}`,`data-bdm="${e}"`)});
  const ks=Object.keys(BD_KN).filter(c=>bdKnReady(c,S)).map(c=>{const K=BD_KN[c];return row("💭",`${esc(bdNk(c))}的心結`,bdHas(K.rl[0],K.rl[1])?"🎁 可以把珍品拿給她看了":"還在找那件珍品",`data-bdk="${c}"`)});
  if(!ls.length&&!ks.length)return;bdCss();
  const d=document.createElement("div");d.className="bd-mail";d.innerHTML=`<div class="sec-t">🕊 旅伴的飛書</div><p class="muted" style="font-size:12.5px;line-height:1.6;margin:0 0 6px">星槎停靠時，旅伴有時下船幫當地的人。信在驛路上走得慢，常常等你離開那一朝才送到；把解法寫進回信，隔天回禮就寄來了。</p><div class="items" style="padding:0">${ls.join("")}${ks.join("")}</div>`;
  b.prepend(d);d.querySelectorAll("[data-bdm]").forEach(y=>y.onclick=()=>{const e=y.dataset.bdm;closeSheet();setTimeout(()=>bdMlOpen(e),260)});d.querySelectorAll("[data-bdk]").forEach(y=>y.onclick=()=>{const c=y.dataset.bdk;closeSheet();setTimeout(()=>bdKnOpen(c),260)})}
function bdMlOpen(e){const L=BD_ML[e];if(!L||!bdOk())return;const S=bdSt(),M=S.ml[e];if(!M)return;bdCss();M.r=M.r||Date.now();if(L.ps&&BD_KN[L.c]){const R=S.kn[L.c]||(S.kn[L.c]={});R.seen=R.seen||Date.now()}bdSave(S);const nk=bdNk(L.c);
  sheet("💌 "+nk+"寄自"+eraLabel(e)+"的信",b=>{const K=L.ps&&BD_KN[L.c];
    const st=!M.s?`<button class="btn" id="bdGo" style="width:100%">♟ 幫${esc(nk)}解這一題（${esc(bdPc(L.c))}當主角）</button>`:bdGiftReady(M)?`<button class="btn" id="bdGift" style="width:100%">🎁 收下回禮</button>`:!M.g?`<p class="muted" style="text-align:center">📨 回信寄出了，回禮明天會寄到這裡。</p>`:`<p class="muted" style="text-align:center">🎁 回禮收到了${M.gi&&M.gi!=="xp"?"，放在「我的角色 → 🏺 珍品」":""}。</p>`;
    b.innerHTML=`<div style="display:flex;justify-content:center;margin-bottom:6px">${bdFace(L.c)}</div><div class="bd-lt">${L.x.map(p=>`<p>${esc(bdTx(p,L.c))}</p>`).join("")}${K?`<p class="bd-ps">${esc(bdTx(K.ask,L.c))}</p>`:""}</div>
      ${M.s?`<p style="line-height:1.8;font-size:14.5px;margin:10px 0 6px">📨 驛騎捎回${esc(nk)}的話：「${esc(bdTx(L.rp,L.c))}」</p>`:""}<div style="margin-top:10px">${st}</div><button class="btn ghost" id="bdBk" style="width:100%;margin-top:8px">回信箱</button>`;
    const g=b.querySelector("#bdGo");if(g)g.onclick=()=>{const S2=bdSt();S2.lb=/^#\/canju/.test(location.hash)?"#/journey/inn":location.hash;bdSave(S2);closeSheet();location.hash="#/canju/bl/"+e};
    const gf=b.querySelector("#bdGift");if(gf)gf.onclick=()=>{gf.disabled=true;closeSheet();bdGift(e)};
    b.querySelector("#bdBk").onclick=()=>{closeSheet();setTimeout(()=>{try{yzMail(store.get("era","classic"))}catch(x){}},260)}})}
/* 回禮：gift 那件（還沒有的話）＞那一朝隨機一件還沒有的（先挑普通）＞修為 */
async function bdGift(e){const S=bdSt(),M=S.ml[e],L=BD_ML[e];if(!L||!bdGiftReady(M))return null;M.g=Date.now();bdSave(S);const nk=bdNk(L.c);
  let R={};try{R=await relicsData()}catch(x){}const mine=typeof relicsMine==="function"?relicsMine():{};let pick=null;
  if(L.gift&&bdCan(L.gift[0])&&!(mine[L.gift[0]]||[]).includes(L.gift[1])&&(R[L.gift[0]]||[]).some(x=>x.id===L.gift[1]))pick=L.gift;
  if(!pick&&bdCan(e)){const left=(R[e]||[]).filter(x=>!(mine[e]||[]).includes(x.id)),c=left.filter(x=>x.rarity==="common"),P=c.length?c:left;if(P.length)pick=[e,P[Math.floor(Math.random()*P.length)].id]}
  const S2=bdSt(),M2=S2.ml[e];
  if(pick){const it=(R[pick[0]]||[]).find(x=>x.id===pick[1]);mine[pick[0]]=(mine[pick[0]]||[]).concat(it.id);store.set("relics",mine);M2.gi=pick;bdSave(S2);
    const tell=()=>sheet("🎁 "+nk+"的回禮",b=>{b.innerHTML=`${bdSay(L.c,L.gl)}<div class="bd-rl"><div class="im">${typeof relicImg==="function"?relicImg(pick[0],it.id):"🏺"}</div><div><b>${esc(it.name)}</b><div class="muted" style="font-size:13px">${esc(typeof relicEra==="function"?relicEra(pick[0]):eraLabel(pick[0]))}的珍品・收進「我的角色 → 🏺 珍品」</div></div></div>
      ${BD_KN[L.c]&&BD_KN[L.c].rl[1]===it.id&&bdKnReady(L.c)?`<p style="line-height:1.8;font-size:14.5px">💭 這件珍品，正好可以解開${esc(nk)}信裡說的心結。到驛站信箱的「💭 ${esc(nk)}的心結」拿給她看吧。</p>`:""}<button class="btn" id="bdOk" style="width:100%">收下</button>`;b.querySelector("#bdOk").onclick=()=>closeSheet()});
    if(typeof relicFx==="function")Promise.resolve(relicFx(pick[0],it,{from:nk+"的回禮",cnt:`${typeof relicEra==="function"?relicEra(pick[0]):eraLabel(pick[0])}的珍品 ${mine[pick[0]].length}／${(R[pick[0]]||[]).length}`})).then(tell,tell);else tell();return{era:pick[0],it}}
  M2.gi="xp";bdSave(S2);if(typeof addXP==="function")addXP(BD_XP.gift,"飛書回禮","bd:gift:"+e);toast(`🎁 ${nk}的回禮：修為 +${BD_XP.gift}`);return{xp:BD_XP.gift}}
function bdMlXM(e){const S=bdSt(),back=()=>bdSt().lb||"#/journey/inn",L=BD_ML[e],M=S.ml[e];if(!bdOk()||!L||!M||L.c===bdMe())return{err:"這封信還沒寄到。",back};const nk=bdNk(L.c),pc=bdPc(L.c);
  return{id:L.pz,rk:"cjRunBd",back,top:"🕊 驛站飛書",icon:"🕊",noXP:true,nudgeN:2,ans:"看答案的話，這封回信先不寄出（也沒有修為），確定？",
    head:P=>`<b>🕊 ${esc(nk)}的求救信・${esc(pc)}當主角</b>・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span><div class="shp-psay">${esc(nk)}：「${esc(bdTx(L.say,L.c))}」</div>${bdOldTip(e)}`,
    wrong:(u,step)=>step===0?nk+"："+bdTx(bdOops(L.c),L.c):"",
    mark:()=>{const S2=bdSt(),M2=S2.ml[e]||(S2.ml[e]={at:Date.now(),r:Date.now()}),first=!M2.s;if(first){M2.s=Date.now();M2.sd=bdDay();bdSave(S2);if(typeof addXP==="function")setTimeout(()=>addXP(BD_XP.ml,"驛站飛書","bd:ml:"+e),1200)}return{first}},
    done:(x,ans)=>{if(ans||!x)return`<p class="muted">看了答案，回信先不寄出；不看答案解開，回信就會寄出。</p>`;bdCss();return`<div class="bd-lt"><p><b>📨 你的回信寄出了</b></p><p>驛騎捎回${esc(nk)}的話：「${esc(bdTx(L.rp,L.c))}」</p></div>`+(x.first?`<p>✨ 修為 +${BD_XP.ml}　🎁 明天打開驛站信箱，會收到${esc(nk)}的回禮。</p>`:"")},
    next:()=>back(),nextL:()=>"回去"}}

/* ---------- 3 心結 ---------- */
/* 渡口站著的主人有沒有可以解的心結（看過附註、已經有那件珍品） */
function bdKnHere(k){let c="";try{c=typeof ph4Who==="function"?ph4Who(k):""}catch(e){}if(!c||!bdKnReady(c))return"";const K=BD_KN[c];return bdHas(K.rl[0],K.rl[1])?c:""}
async function bdKnOpen(c){const K=BD_KN[c];if(!K||!bdOk())return;bdCss();let R={};try{R=await relicsData()}catch(e){}const it=(R[K.rl[0]]||[]).find(x=>x.id===K.rl[1])||{name:K.rl[1]},nk=bdNk(c),en=typeof relicEra==="function"?relicEra(K.rl[0]):eraLabel(K.rl[0]);
  const S=bdSt(),done=!!(S.kn[c]||{}).done,has=bdHas(K.rl[0],K.rl[1]),ok=done||bdKnReady(c,S);if(!ok)return toast("這件事，等星槎再往後走一點再說吧。");
  const img=`<div class="bd-rl"><div class="im">${typeof relicImg==="function"?relicImg(K.rl[0],K.rl[1]):"🏺"}</div><div><b>${esc(it.name)}</b><div class="muted" style="font-size:13px">${esc(en)}的珍品${has?"・你已經有了":"・還沒找到"}</div></div></div>`;
  const tail=()=>K.ans.map(a=>bdSay(c,a)).join("")+bdSay(c,K.thx);
  sheet("💭 "+nk+"的心結",b=>{b.innerHTML=bdSay(c,K.ask.replace(/^附：/,""))+img+(done?tail()+`<p class="muted">這個心結已經解開了。</p>`:has?`<button class="btn" id="bdKn" style="width:100%">🏺 把〈${esc(it.name)}〉拿給${esc(nk)}看</button>`
      :`<p class="muted" style="line-height:1.7;font-size:13.5px">還沒有〈${esc(it.name)}〉。${esc(nk)}寄來的那封信，解開以後的回禮就是它；在${esc(en)}的渡口景點、驛站史實小牌、園子長卷，也有機會撿到。</p>`)+`<button class="btn ghost" id="bdKnX" style="width:100%;margin-top:8px">關閉</button>`;
    b.querySelector("#bdKnX").onclick=()=>closeSheet();const g=b.querySelector("#bdKn");
    if(g)g.onclick=()=>{const S2=bdSt(),R2=S2.kn[c]||(S2.kn[c]={seen:Date.now()});const first=!R2.done;R2.done=R2.done||Date.now();bdSave(S2);if(typeof vibrate==="function")vibrate([15,30,15]);
      g.remove();const d=document.createElement("div");d.innerHTML=tail()+(first?`<p>✨ 心結解開了！修為 +${BD_XP.kn}</p>`:"");b.querySelector("#bdKnX").before(d);if(first&&typeof addXP==="function")setTimeout(()=>addXP(BD_XP.kn,"解開心結","bd:kn:"+c),600)}})}

/* ---------- 4 七星軍師獻策 ---------- */
function bdPlanCard(c){if(!BUDDY_ON||!c||!c.flag||!Array.isArray(c.flag.opts)||!BD_PLAN[c.id]||!bdOk())return null;const D=BD_PLAN[c.id],me=bdMe();let n=0;
  const opts=c.flag.opts.map((o,j)=>{const d=D.o[j];if(!d||D.w[j]!==o.who||d[0]===me||!WX_CHARS[d[0]])return o;n++;
    const re=o.ok?`${o.re}　📜 歷史上提這一策的是${o.who}：${String(o.say||"")}`:/^一位/.test(o.who)?o.re:`${o.re}　📜 當時這樣主張的是${o.who}。`;
    return{...o,who:bdNk(d[0])+"・"+d[1],say:bdTx(d[2],d[0]),re}});
  return n?{...c,flag:{...c.flag,opts}}:null}
function bdPlanDom(v){try{setTop("⭐ 七星獻策","^#/battle")}catch(e){}let n=0;const fix=()=>{if(!v.isConnected)return;const h=v.querySelector(".bt-cn .lvh b"),p=[...v.querySelectorAll(".bt-cn p b")].find(b=>/三位軍師/.test(b.textContent));
  if(h)h.textContent=h.textContent.replace("軍師獻策","七星獻策");if(p){p.textContent="三位旅伴照自己本命子的脾氣各獻一策，你採用哪一策？";return}if(++n<40)setTimeout(fix,150)};fix()}

/* ---------- 掛勾（都是包一層，不改原函式） ---------- */
if(typeof portWind==="function"){const bdPw0=portWind;portWind=function(v,k){const r=bdPw0.apply(this,arguments);try{bdPort(v,k)}catch(e){console.warn(e)}return r}}
if(typeof cjXMode==="function"){const bdXm0=cjXMode;cjXMode=function(id){let m=/^bd\/(\w+)$/.exec(id);if(m)return bdEvXM(m[1]);m=/^bl\/(\w+)$/.exec(id);if(m)return bdMlXM(m[1]);return bdXm0.apply(this,arguments)}}
if(typeof yzMail==="function"){const bdYm0=yzMail;yzMail=function(k){const r=bdYm0.apply(this,arguments);try{bdMailInject(k)}catch(e){console.warn(e)}return r}}
if(typeof yzUnread==="function"){const bdYu0=yzUnread;yzUnread=function(k){let n=bdYu0.apply(this,arguments)|0;try{if(bdOk()&&(k==="classic"||k===shipAt())){bdArrive();n+=bdUnread()}}catch(e){}return n}}
if(typeof battleCouncil==="function"){const bdBc0=battleCouncil;battleCouncil=function(v,k,i,c,B){let c2=null;try{c2=bdPlanCard(c)}catch(e){c2=null}const r=bdBc0.call(this,v,k,i,c2||c,B);if(c2)try{bdPlanDom(v)}catch(e){}return r}}
/* 測試用（主控台）：不擋任何規則以外的東西，只改這個功能自己的存檔 */
const bdDev={
  ev(k){const S=bdSt();delete S.ev[k];bdSave(S);return"已重設 "+k+" 的闖禍，回渡口就會冒「！」"},
  mail(e){const S=bdSt();if(!BD_ML[e])return"沒有這一朝的信";S.ml[e]={at:Date.now()};bdSave(S);return"已寄到 "+e+" 的信（停在比它早的朝代看不到），打開驛站信箱"},
  gift(e){const S=bdSt(),M=S.ml[e];if(!M||!M.s)return"這封信還沒解開";M.sd="1999-01-01";delete M.g;bdSave(S);return"回禮當作明天了，打開信箱收"},
  kn(c){const S=bdSt();(S.kn[c]=S.kn[c]||{}).seen=Date.now();delete S.kn[c].done;bdSave(S);return"已看過 "+c+" 的心結"},
  reset(){store.set("buddy",null);store.set("cjRunBd",null);return"已清空 buddy"}};
