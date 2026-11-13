/* 11/9 修圖（史學顧問：甲板石桌棋盤、棋子、書頁去字）：甲板圖和分層的網址帶版本，同檔名換圖時改這個數字，手機才會重抓 */
const SHP_IMGV="2300";
/* ================= ⛵ 雲河星槎（意見回饋 674 第一、二期；675 開發者 11/6 定案「開站不擋、每站一個棋理＋一句棋史、五級難度」）=================
   首頁「⛵ 雲河星槎」大卡（03-home-quiz.js 呼叫 shipHomeHTML）；#/adventure＝星槎頁 Voyage，由上到下：
     （意見回饋 709 起：星槎頁只剩水墨圖、航線、下船；下面列的棋理、千秋殘局、下一站、書架、行囊各是一頁滿版水墨圖 #/ship/lesson、pz、sail、shelf、bag，渡口 #/port 上方是那一朝的圖）
     船頭：13 站航線；這一站的棋理卡（SHIP_LESSON：標題、3 行說明、口訣）＋主場角色一句開場＋3 題千秋殘局（3 個解題點）＋解完一句
     這一朝的棋：引用棋史卡 HIST（07d-garden.js）的標題和第一句，點了看整張棋史卡
     下一站：預告卡（說書人預告、下一站的棋理和棋史、建議修為）＋「⛵ 起航」；13 站都停靠過了就換成旅程終點卡 SHIP_END
     下船（697 搬到航線正下方）：一顆「⚓ 下船・〇朝渡口」→ 渡口頁 #/port（Port）三扇門：園子、驛站、擂台；書架：石桌往事、紙譜新局；行囊：棋童資料、人物與年表、存檔、航行難度
   意見回饋 697（開發者 11/6 定案方案 B）：換朝代只在星槎（起航、航線換站、千秋石枰），era 和 shipAt 一起改（shipEra），播千秋穿梭 qianqiu()；
     同一朝的渡口、園子、驛站、擂台之間走步行小卡 walk()（07-legend.js），橫著走用 replace；園子、驛站、擂台的「‹」回渡口，渡口的「‹」回星槎
   開站（675）：不設門檻，按「起航」就往下一站（05b-save.js 的 shipSail、shipDock）。
   千秋殘局：解題頁 #/canju/s/<朝代>/<題號>（07c-canju.js 的解題畫面，07e-garden2.js 的 cjXMode 轉過來），不算今日茶單（shipReserved）。
     解題點：自己解＝實心、用過提示＝空心、看答案不算解開。3 題都解開＝「學會了」，記在旅程鍵 shipLearn；《千秋棋話》補了幾頁＝學會了幾站。
     存檔：shipSolved＝{朝代:{題號:{at,h}}}（h＝1 用過提示；674 版存的是時間數字，當成自己解開）、shipAt＝星槎停在哪一站（697 起＝人在哪一朝，跟 era 一起改）、cjRunS＝正在解的那一題。
   題目只從 shipBuild 挑：一盞茶殘局題庫裡「第一步就是本命子」的題，照難度的 d 範圍（DIFF.band），再優先殺法標籤（SHIP_LESSON.kill）和那一朝的古譜（books）；
     同一個難度裡，同一種本命子的站不重複出題；不夠 3 題的站顯示「題目準備中」（相目前只有 2 題）。
     benming-pool.json 上了網站以後，把 shipBuild 裡收題那一段換成讀它（src＝canju 的題號）就好。
   小帥、小帥妹的舊旅程：說書人的學徒——13 站全開、主場角色不說話，上面有「選雲河七星開新旅程」（存到別格，不蓋掉舊進度）。
   意見回饋 684、685（開發者 11/6 同意 story/雲河七星長篇/關卡設計_第1-4章.md）：船艙、秦、漢、三國四站改成固定的「劇情局＋變化題＋古譜」（SHIP_PLAN）；
     手擺題在 data/canju/ship-set.json（tools/canju/6_ship.js 產生，cjData 只併進 byId、不進茶單）；每題前後各一句台詞（題目的 say、SHIP_SAY_ID）；
     國手、千秋＝劇情局＋2 題古譜，變化題當選做的熱身；船艙學會了以後有「七星同局圖鑑」（選做、不計點、不給修為，存 shipGal）；
     正文《雲河七星》（data/canju/yunhe-novel.json）：每站「📖 讀這一章」和書架上的合集都是 #/ship/read（shipReadPage），［棋局］變成一張解題卡，解完回到正文。 */
const SHIP_PER=3;
const SHIP_STOP={
  classic:{who:[],place:"船艙石桌",meet:"船頭的說書人",img:"擺開棋盤、認清規則",learn:"認識彼此的棋子與時代"},
  qin:{who:["x_swordboy"],place:"咸陽直道",meet:"修長城的民夫",img:"直衝敵陣的車被困死",learn:"再直的路，也擋不住人心的曲折"},
  han:{who:["x_miaogirl"],place:"西域大漠驛站",meet:"迷路的老驛騎",img:"雙馬連環、迂迴包抄",learn:"彎路有時是為了更快到達"},
  sanguo:{who:["x_shuai"],place:"赤壁江面",meet:"演義裡借東風的小道童",img:"隔江對峙、借力打力",learn:"困在九宮，也能觀天下",tbl:1},
  weijin:{who:["x_spiritgirl"],place:"竹林溪畔",meet:"隔溪對弈的隱士",img:"雙相連環、死守不退",learn:"守護不等於畫地自限",tbl:1},
  nanbei:{who:["x_spiritgirl"],place:"長江渡口",meet:"隔江插旗的老兵",img:"楚河漢界、無法逾越",learn:"相不過河，心可以過"},
  sui:{who:["x_bing"],place:"揚州大運河工地",meet:"開鑿運河的工匠",img:"兵卒過河、左右逢源",learn:"過了河才能橫走，看見更大的天地"},
  tang:{who:["x_shi"],place:"長安西市",meet:"賣西域寶刀的胡商",img:"棄士保帥的殘局",learn:"最好的盾牌，是讓對方自己變強"},
  wudai:{who:["x_martialgirl"],place:"戰亂逃荒路",meet:"捂著耳朵的孤兒",img:"悶宮殺法、無處可逃",learn:"安靜的陪伴，比巨大的聲響更有力"},
  song:{who:["x_martialgirl"],place:"臨安元宵",meet:"老煙火匠",img:"當頭炮、借子開花",learn:"退到後面，當別人的炮架"},
  yuan:{who:["x_miaogirl"],place:"草原驛站",meet:"拉胡琴的牧民",img:"臥槽馬、尋找歸宿",learn:"家是會等你回去的地方"},
  ming:{who:["x_shuai","x_shi"],place:"徽州當鋪",meet:"典當棋盤的落魄書生",img:"出帥助攻",learn:"讓開身子，也是一種守護"},
  qing:{who:["x_bing"],place:"揚州運河",meet:"漕船上的老船工",img:"過河卒子當車用",learn:"小卒也能決定大局"},
  /* 第 14 站・終章（關卡設計_第5-14章 元件 C）：不在 SHIP_ROUTE 裡、不算《千秋棋話》頁數；13 站都學會才開（學徒也一樣，shipFinaleOpen） */
  finale:{who:[],place:"千秋石桌",meet:"說書人",img:"七子同局、各歸其位",learn:"每顆棋子都有自己的走法，也有自己的歸途"}};
/* 意見回饋 675：13 站的棋理卡與台詞（定稿：xiangqi-db/story/gemini_app/定稿_25_星槎十三站棋理卡與台詞.md）。要改文字只改這裡。
   t＝卡片標題（棋理）、x＝說明 3 行、k＝口訣、open／done＝主場角色開場、解完的一句（openBy／doneBy＝誰說；沒寫＝主場第一位；"teller"＝說書人）、
   pre＝這一站被預告時說書人說的話（船艙是第一站，沒有預告）；
   挑題用：kill＝優先的殺法標籤、books＝優先的古譜、one＝優先「一步定勝負」；theme＝解完後推薦的主題訓練（07-legend.js THEMES） */
const SHIP_LESSON={
  classic:{t:"認識子力找殺步",x:["象棋之勝負，全在擒獲敵方主帥。","初學不必深究百步，先學看懂眼前的「一步殺」。","認清己方兵力，尋找敵將防守的破綻。"],k:"認清棋子，一眼尋殺",
    open:"客官，千秋一局，咱們先從認識這車馬炮開始。",done:"這尋殺的眼力，客官可是越來越犀利了。",openBy:"teller",doneBy:"teller",pre:"",one:1,theme:"殺棋"},
  qin:{t:"車路求通不求直",x:["車乃三軍之膽，最忌擁擠於本陣，難展其威。","行車不在一直線，而在控制肋道與河界。","若貿然深陷敵陣而無援，反易成甕中之鱉。"],k:"車行要路，忌陷重圍",
    open:"看準了就一直走？但這路堵住了啊！",done:"直衝會被困死，車要先有路才能行。",pre:"客官，下一站咸陽直道——車要走通路，直衝可會被困喔。",kill:["車殺","雙車錯"],theme:"殺棋"},
  han:{t:"雙馬連環宜包抄",x:["馬走日字，最懼前方有子「蹩馬腳」。","雙馬若能連環，互為呼應，則攻守兼備。","進攻時切忌單馬直入，宜迂迴包抄敵陣。"],k:"雙馬連環，迂迴包抄",
    open:"前面堵住了？那我拐個彎繞過去！",done:"彎路有時候真的比直衝還快呢！嘿嘿。",pre:"客官，下一站西域大漠——學學雙馬連環，繞路包抄的妙法。",kill:["馬殺"],theme:"將軍"},
  sanguo:{t:"借帥助攻忌照面",x:["雙方將帥不得在同一直線無子相見。","殘局時，老帥不僅要躲，更能利用此規助攻。","坐鎮中軍，隔空牽制敵方將軍，謂之「借帥」。"],k:"坐鎮中宮，隔空助攻",
    open:"我就在這裡，哪也不去。但我也能觀天下。",done:"原來困在九宮格裡，也能幫上大家的忙。",pre:"客官，下一站赤壁江面——借帥助攻，將帥可是不能照面的。",theme:"牽制"},
  weijin:{t:"士象全時穩如山",x:["相走田字不可過河，主守衛本陣。","雙相相連，互為根基，敵方車馬難以輕入。","殘局若剩士象全，單車也難攻破，常能守成和局。"],k:"雙相連環，死守不退",
    open:"慢慢來，先把家顧好。相連起來最安心。",done:"守護不是只待在原地，要互相照應才行。",pre:"客官，下一站竹林溪畔——雙相連環，教你如何死守成和。"},
  nanbei:{t:"相守河口控渡點",x:["相雖不過河，卻能控制己方河界的要衝。","把相飛到河口，可阻斷敵方馬炮的過河路線。","善用相的防守範圍，讓敵軍難越雷池一步。"],k:"飛相河口，控其要衝",
    open:"這條江過不去……但我要守住這渡口。",done:"相不過河，但我的心可以飛過去。",pre:"客官，下一站長江渡口——相守河口，控制過河點是門大學問。"},
  sui:{t:"過河小兵能橫走",x:["兵未過河只能直進，一旦過河便可左右平移。","過河兵深入敵陣，左右逢源，威力大增。","殘局時，兩三個過河兵往往能左右戰局。"],k:"兵卒過河，左右逢源",
    open:"往前走，絕不退！過河我就不怕了！",done:"過了河能橫著走，小卒也能看見大天地！",pre:"客官，下一站大運河工地——過河兵能橫走，可別小看它。",theme:"捉雙"},
  tang:{t:"棄仕解殺須果斷",x:["仕為貼身護衛，但有時也是絆腳石。","當敵方重兵壓境，自家仕若擋住主帥的退路，","須果斷棄仕，換取主帥逃脫空間，方能解殺。"],k:"棄仕保帥，果斷求生",
    open:"有我在，誰也別想碰他！我來擋刀！",done:"最好的盾牌，是讓出位子讓他自己變強。",pre:"客官，下一站長安西市——該撐仕還是棄仕？這可是生死抉擇。",theme:"引離"},
  wudai:{t:"重炮悶殺顯神威",x:["雙炮疊在同一直線，後炮借前炮為架，謂之重炮。","若敵將被自家士象堵住去路，單炮照將即成「悶殺」。","此二者皆是利用空間局限的凌厲殺招。"],k:"重炮悶宮，無處可逃",
    open:"隔一個，剛剛好！看我把你們全悶在裡面！",done:"聲音再響，也不如安靜的一擊致命。",pre:"客官，下一站戰亂逃荒路——重炮與悶殺，學會便能凌厲致勝。",kill:["重炮","炮殺"],theme:"悶宮"},
  song:{t:"當頭炮巧借炮架",x:["炮須隔子而擊，故炮架存亡即是炮局關鍵。","當頭炮雖能鎮守中路，若無子可借，即失其威。","行棋時當留心炮架之進退，方能連綿發火。"],k:"鎮守中路，保全炮架",
    open:"這煙花得借個火才響！炮架別跑！",done:"煙火放完就安靜了，退在後面當炮架也挺好。",pre:"客官，下一站臨安元宵——當頭炮需巧借子，無架之炮不生威啊。",kill:["馬後炮","炮殺"],theme:"抽將"},
  yuan:{t:"臥槽掛角馬如龍",x:["馬進到對方三、七路的二線，照將又封將門，謂之臥槽馬。","馬跳到對方九宮的角上照將，謂之掛角馬。","此二馬位皆是馬的絕佳殺點，威力無窮。"],k:"臥槽掛角，招招致命",
    open:"前面堵住了？看我跳個臥槽馬，嘿嘿！",done:"跑了這麼多彎路，總算找到能落腳的家了。",pre:"客官，下一站草原驛站——臥槽馬與掛角馬，步步驚心不可防。",kill:["臥槽馬","掛角馬"],theme:"殺棋"},
  ming:{t:"出帥助攻擒敵王",x:["殘局子力稀少，主帥亦須親上火線。","帥不出九宮，卻能平移到四、六路，","借將帥不能照面之規，封住敵將，助車馬炮絕殺。"],k:"出帥助攻，親征擒王",
    open:"我就在這裡……不，這次我親自出手！",done:"盾牌放下吧，他已經能自己站起來了。",openBy:"x_shuai",doneBy:"x_shi",pre:"客官，下一站徽州當鋪——出帥助攻，殘局裡主帥也得親征。",books:["適情雅趣","橘中秘"],theme:"牽制"},
  qing:{t:"小兵擒王辨高低",x:["兵到對方底線叫底兵（老兵），只能橫走，威力最小。","停在二線叫低兵，停在宮頂線叫高兵，高兵最能控將。","善用高兵配合他子，小兵亦能擒得敵王。"],k:"高兵鎖局，小卒擒王",
    open:"往前走，絕不退！就算剩我一個也要衝！",done:"就算是最不起眼的小卒，過了河也能決定大局！",pre:"客官，下一站揚州運河——小兵擒王，高低兵可是大有學問。",kill:["小兵擒王"],books:["竹香齋","蕉竹齋","心武殘編"],theme:"殺棋"},
  finale:{t:"千秋歸位",x:["七個人各說看見什麼，選對了誰先動。","仕讓路、帥照面、俥沉底、傌看格，兩步收局。","最後把七顆紅子，一顆一顆放回原位。"],k:"七子同局，各歸其位",open:"歸位以前，再陪老朽看一局？",done:"船會送你們回到各自上船的年月。",openBy:"teller",doneBy:"teller"}};
/* 意見回饋 675：13 站都停靠過以後的「旅程終點卡」（定稿 25；史實出處 data/gmbios.json） */
const SHIP_END={t:"千秋未完之局",x:["客官，這《千秋棋話》的殘譜，咱們補全了。","象棋的故事，卻還在繼續。","一九五六年，新中國舉辦第一屆全國賽，楊官璘奪冠。","一九八二年，楊官璘與胡榮華獲首批象棋特級大師；","那胡榮華，十五歲參賽便奪冠，一生更拿過十四次全國冠軍！","如今，陪客官下棋的開源引擎 Pikafish，棋力已超越頂尖大師。","星槎已靠岸，千秋無絕局。今天，也來下一盤吧！"]};
/* 秦到五代還沒有今天的象棋（或還沒定型），這幾站的千秋殘局說成「星槎石桌上的千秋殘局」 */
const SHIP_OLD=new Set(["qin","han","sanguo","weijin","nanbei","sui","tang","wudai"]);
/* 建議修為（只顯示、不擋）：照航線第幾站，第 1、2 站（船艙、家鄉）不用 */
const SHIP_LV=[0,0,3,5,6,7,8,9,10,11,12,13,14];
/* 說書人每天換一句（首頁星槎大卡的小字）；有新信的時候先提醒信 */
const SHIP_SAY=["棋盤上的路，走過一次就記得。","慢一點不要緊，星槎不會丟下誰。","今天先下一盤，故事等你回來再講。","輸掉的那一盤，最值得再擺一次。","每一顆子都有自己的走法，也有自己的歸途。",
  "殘譜少一頁，就少一段沒說完的話。","茶涼了再沏，棋輸了再下。","渡口風大，站穩了再過河。","看不懂的棋，多看兩眼就懂了。","一盤棋下完，心裡的結也鬆一點。","別急著贏，先看清楚對方想做什麼。","這一站的人，都在等一盤好棋。","船開得慢，是要讓你把岸上的事看清楚。","石桌上缺的那一塊，要七個人一起補。",
  "古書上說，海邊每年八月有一隻浮槎來去，從不誤期。咱們這艘星槎也一樣，說好哪天到，就哪天到。","有人乘著浮槎漂到天河，看見織女在織布、牽牛人在飲牛。客官，咱們今天也漂一段。",
  "天上要是多了一顆「客星」，就是有凡人乘槎闖進天河了。今晚那顆，說不定就是你。","明朝鄭和下西洋，隨行的人把見聞寫成《星槎勝覽》。咱們把棋話一頁一頁收齊，也算一本星槎勝覽。"];   /* 星槎典故（11/8 開發者要的）：《博物志》浮槎、客星犯牽牛、費信《星槎勝覽》 */
/* 棋話一頁的「星槎小知識」：每一站一則，照航線順序 */
const SHIP_LORE=[["星槎是什麼？","「槎」念作「茶」，是木筏、浮木。「星槎」是傳說中能從海上一路漂到天河的木筏，後來泛指通往遠方、天上的奇船。「雲河」說的就是銀河，取自銀河的古名「雲漢」；古人也叫它天河、星河。"],
  ["浮槎與八月槎","晉代張華的《博物志》記載：海邊有人每年八月看見一隻浮槎來去，從不誤期。他帶足糧食乘上去，十多天後到了有城郭、有織女的地方——原來是天河。所以浮槎又叫「八月槎」。"],
  ["客星犯牽牛","乘槎的人回到人間，去問蜀地的嚴君平。嚴君平說：某年某月，有一顆「客星」靠近了牽牛星。一算日子，正是他到天河的那一天。"],
  ["乘槎","坐上星槎，叫「乘槎」。後來的詩文常用它比喻遠行、出使或求仙。"],
  ["張騫乘槎","後來的傳說把乘槎的人說成漢朝的張騫：他奉命尋找黃河的源頭，一路乘槎到了天河。這是傳說，不是史實，但很受詩人喜愛。"],
  ["博望槎","張騫被封為博望侯，所以「博望槎」就借指出使遠方的船，常出現在送人出使的詩裡。"],
  ["八月槎入詩","唐代杜甫流落夔州時，在〈秋興八首〉裡寫「奉使虛隨八月槎」。他借張騫奉命乘槎的典故，說自己想跟著使者的船回長安，卻落了空，藏著思鄉的心情。"],
  ["海客乘槎","唐代李商隱〈海客〉一開頭就寫「海客乘槎上紫氛」，把乘槎寫成直上雲霄的浪漫畫面。"],
  ["仙槎","仙人乘的筏，叫「仙槎」。詩詞裡常和蓬萊、瑤池這些仙境寫在一起。"],
  ["槎客","乘槎的人叫「槎客」，後來也用來稱呼遠行的旅人和使者。在星槎上的七個孩子，都是槎客。"],
  ["星槎勝覽","古人把朝廷派出的使者比作天上的「使星」，唐宋時就用「星槎」稱使者乘的船。明朝鄭和下西洋，隨行的費信沿用這個說法，把沿途各國的見聞寫成《星槎勝覽》。"],
  ["銀河的名字","銀河在古代有很多名字：天河、天漢、雲漢、星河、銀漢……「雲河星槎」的「雲河」，就是從「雲漢」來的。"],
  ["牛郎織女","乘槎人在天河看見的織女和牽牛，就是七夕故事裡的織女和牛郎。這對星的傳說比《博物志》還早，《詩經》和東漢的詩裡就有了。七夕，正是在秋天。"]];
const SHIP_PC={"俥":"R","傌":"N","相":"B","仕":"A","帥":"K","炮":"C","兵":"P"};
/* 意見回饋 684、685：第 1～4 站每站出哪幾題（關卡設計報告第二節）。每站 3 題＝[劇情局, 第 2 題, 第 3 題]；
   story＝劇情局（五級都一樣）、byDiff＝各難度的第 2、3 題（null＝照舊從題庫自動挑）、warm＝國手、千秋的選做熱身（變化題）、ch＝正文第幾章、who＝正文解題卡上「跟誰一起解」；
   題目不在題庫裡（舊題庫）就退回自動挑。船艙：劇情局＝自己本命子那一版（學徒用俥），第 2 題換齊轍的俥（自己是俥就換小梅的傌），第 3 題照舊自動挑（相、仕先用帥版）。
   pre2／pre3＝第 2、3 題前那一句（題目自己有台詞就用題目的） */
const SHIP_PLAN={
  classic:{ch:1,who:"齊轍",story:pc=>"xs-classic-"+(SHIP_PC[pc]||"R"),byDiff:pc=>[pc==="俥"?"xs-classic-N":"xs-classic-R",pc==="相"||pc==="仕"?"xs-classic-K":null],
    pre2:pc=>["說書人",pc==="俥"?"同一盤，換小梅的傌來收。":"同一盤，換阿轍的俥來收。"]},
  qin:{ch:2,who:"齊轍",story:"xs-qin-0",warm:"zx076",byDiff:{1:["zx076","zx075"],2:["zx076","zx075"],3:["zx075","lk094c5"],4:["sq183c6","sq272"],5:["fx-zx223-15-29","lk083"]}},
  han:{ch:3,who:"小梅",story:"xs-han-0",warm:"xs-han-1",byDiff:{1:["xs-han-1","lk129c7"],2:["xs-han-1","lk107c6"],3:["xs-han-1","lk093c4"],4:["sq276c5","sq252"],5:["sq252","sq400"]},pre3:["老驛騎","沒到以前，不能算自己贏。"]},
  sanguo:{ch:4,who:"方庭",story:"xs-sanguo-0",warm:"xs-sanguo-1",byDiff:{1:["xs-sanguo-1","gm1997-1p394p44K4r"],2:["xs-sanguo-1","gm1997-1p394p44K4r"],3:["xs-sanguo-1","lk204c6"],4:["xw056c8","xw057c8"],5:["lk011c4","sq463c6"]},pre3:["道童","叫我看這裡。"]},
  /* 意見回饋（開發者 11/7 同意 story/雲河七星長篇/關卡設計_第5-14章.md）：第 7～13 站。xl- 開頭的是星槎小關（ShipLv，石桌往事的關卡步驟），xs- 是解題頁的手擺題；
     國手、千秋＝劇情局＋2 題古譜，玩法題（xl-）改當選做熱身（決定①）。清站劇情局是跟電腦對弈（xl-qing-play，決定③）。 */
  sui:{ch:7,who:"溪兒",story:"xs-sui-0",warm:"xl-sui-guess",byDiff:{1:["xl-sui-guess","sq030c6"],2:["xl-sui-guess","sq150c6"],3:["xl-sui-guess","sq056c8"],4:["sq056c8","lk142"],5:["lk152","lk244"]}},
  tang:{ch:8,who:"連城",story:"xs-tang-0",warm:"xl-tang-tap",byDiff:{1:["xl-tang-tap","sq384"],2:["xl-tang-tap","sq384"],3:["xl-tang-tap","gm1987-2cCA43A1K3r"],4:["gm1991-44A4r3KAB2r","gm2004-2C1nr2K1B2r"],5:["fx-jc031-0-4","gm1999-P6P7P5K399b"]}},
  wudai:{ch:9,who:"花兒",story:"xs-wudai-0",warm:"xs-wudai-1",byDiff:{1:["xs-wudai-1","sq243c4"],2:["xs-wudai-1","sq369c5"],3:["xs-wudai-1","lk135c7"],4:["sq174","jc112c7"],5:["jc112c7","lk158"]}},
  song:{ch:10,who:"花兒",story:"xs-song-0",warm:"xl-song-lantern",byDiff:{1:["xl-song-lantern","mr018c5"],2:["xl-song-lantern","sq163c6"],3:["xl-song-lantern","sq233c5"],4:["sq195","mr014"],5:["mr014","jc108c8"]}},
  yuan:{ch:11,who:"小梅",story:"xs-yuan-0",warm:"xl-yuan-memory",byDiff:{1:["xl-yuan-memory","gm2013-B84A43K1A3r"],2:["xl-yuan-memory","sq084"],3:["xl-yuan-memory","sq084"],4:["sq084","ys030c6"],5:["lk154","jc099c4"]},pre3:["小梅","跑多遠，我們都看得見妳。"]},
  ming:{ch:12,who:"方庭",story:"xs-ming-0",warm:"xl-ming-compare",byDiff:{1:["xl-ming-compare","sq443"],2:["xl-ming-compare","sq443"],3:["xl-ming-compare","sq423c8"],4:["lk147c4","sq351c4"],5:["jc113","lk202c4"]},pre3:["書生","書是父親留下的，裡頭的殘局很好。"]},
  qing:{ch:13,who:"溪兒",story:"xl-qing-play",warm:"xs-qing-1",byDiff:{1:["xs-qing-1","sq044c5"],2:["xs-qing-1","mr043c4"],3:["xs-qing-1","fx-zx216-24-29"],4:["fx-zx216-24-29","fx-zx216-9-53"],5:["fx-zx216-9-53","fx-zx213-34-13"]},pre3:["老船工","有字的東西，留給願意讀的人。"]},
  /* 魏晉、南北朝（相站，元件 B）：劇情局是守和題（tools/canju/7_hold.js 用 Pikafish 判，兩種正解都算對，決定⑤），第 3 題是 benming-pool.json 轉來的相的實戰守和題（xh-） */
  weijin:{ch:5,who:"燕子",story:"xs-weijin-0",warm:"xl-weijin-hold",byDiff:{1:["xl-weijin-hold","xh-gm10541-202"],2:["xl-weijin-hold","xh-gm11082-128"],3:["xl-weijin-hold","xh-gm5550-130"],4:["xh-gm5550-130","xh-gm7789-176"],5:["xh-gm7789-176","xh-gm23223-162"]}},
  nanbei:{ch:6,who:"燕子",story:"xs-nanbei-0",warm:"xl-nanbei-mouth",byDiff:{1:["xl-nanbei-mouth","xh-gm9532-186"],2:["xl-nanbei-mouth","xh-gm27479-174"],3:["xl-nanbei-mouth","xh-gm27479-174"],4:["xh-gm27479-174","xh-gm10037-108"],5:["xh-gm10037-108","xh-gm9532-186"]},pre3:["老兵","我記性差，畫著認。"]},
  /* 終章（元件 C）：只有一關 xl-finale（七人提議＋兩步殺＋七子歸位）；不在 SHIP_ROUTE，shipBuild 另外放進 stops.finale */
  finale:{ch:14,who:"七個人",story:"xl-finale"}};
/* 題庫題（canju-set.json）在星槎裡的台詞：[誰, 話, 動作]；wrong＝第一步走這手時那一句；more＝解完卡上「想多看一題」 */
const SHIP_SAY_ID={zx076:{pre:[["小梅","這回前面空空的，你直直去呀。"]],done:[["齊轍","路通的時候，就直走。"]]},
  zx075:{pre:[["小梅","阿轍，路堵住了，先叫我。"]],wrong:{c8c9:["小梅","直直撞上去，象一退就把路封了。"]},done:[["齊轍","退一步，路就出來了。"]],
    more:{id:"sq430",t:"《適情雅趣》〈能為必勝〉（1570）幾乎是同一個局面、同一個答案；兩百多年後的《竹香齋》還在研究它。"}}};
/* 這一站這一難度的 3 題（還沒對過題庫）；沒有計畫的站回 null */
function shipPlanIds(k,dn){const Pl=SHIP_PLAN[k];if(!Pl||!Pl.story)return null;const pc=shipPiece(k),st=typeof Pl.story==="function"?Pl.story(pc):Pl.story,bd=typeof Pl.byDiff==="function"?Pl.byDiff(pc):Pl.byDiff[dn]||[null,null];return[st,bd[0]||null,bd[1]||null]}
const shipNum=s=>String(s||"").replace(/\d/g,d=>"〇一二三四五六七八九"[d]);
/* 古譜題前說書人那一句（照出處） */
function shipSrcLine(P){const s=(P&&P.src)||{};if(s.book==="特級大師對局")return P&&P.hold?`這是${shipNum(s.year)}年的實戰，大師也只求守住這一手。`:`這是${shipNum(s.year)}年的實戰，大師也只差這一手。`;if(!s.book||s.book==="星槎石桌")return"先把眼前這一手看清楚。";
  return`這一局出自《${s.book}》。${s.year?shipNum(s.year)+"年的人，也在找這一手。":"古人也在找這一手。"}`}
/* 這一題的台詞 {pre:[[誰,話,動作]…], done:[…], wrong:{著法:[誰,話]}, more}；slot＝第幾題（0 起；-1＝選做）。學徒只聽得到說書人 */
function shipSay(k,id,P,slot){const Pl=SHIP_PLAN[k];if(!Pl||!Pl.story)return{};const S=Object.assign({},(P&&P.say)||{},SHIP_SAY_ID[id]||{});
  if(k==="classic"&&slot===1)S.pre=[Pl.pre2(shipPiece(k))];
  if(!S.pre&&slot!==0)S.pre=[slot===2&&Pl.pre3?Pl.pre3:["說書人",shipSrcLine(P)]];
  if(shipAppr()){const f=a=>(a||[]).filter(x=>x[0]==="說書人"),w={};for(const u in S.wrong||{})if(S.wrong[u][0]==="說書人")w[u]=S.wrong[u];Object.assign(S,{pre:f(S.pre),done:f(S.done),wrong:w})}
  return S}
const shipLine=x=>`${esc(x[0])}${x[2]?esc(x[2]):""}：「${esc(x[1])}」`;
const shipAppr=()=>!!journey()&&!myChar();   /* 有旅程、但不是雲河七星＝說書人的學徒 */
/* 終章（元件 C）：13 站都學會才開，學徒也一樣（開發者 11/7 決定⑥）；開了以後不受停靠限制 */
const shipFinaleOpen=()=>SHIP_ROUTE.every(e=>shipLearned(e)),shipLockedK=k=>k==="finale"?!shipFinaleOpen():eraLocked(k);
const shipShort=k=>k==="finale"?"終章":k==="classic"?"星槎":eraLabel(k).length===2?eraLabel(k).replace(/朝$/,""):eraLabel(k);
const shipDay=()=>Math.floor((Date.now()-4*36e5-new Date().getTimezoneOffset()*6e4)/864e5);
function shipDocked(){const D=shipDockList();return D?shipOrder().filter(e=>e==="classic"||D.includes(e)):SHIP_ROUTE.slice()}
function shipAt(){const D=shipDocked();let a=store.get("shipAt",null);if(a&&D.includes(a))return a;if(!shipAppr()&&shipDockList())return D[D.length-1];const e=store.get("era","classic");return D.includes(e)?e:D[0]}
/* 解題紀錄：{h:0 自己解、1 用過提示}；674 版存的是時間數字＝當成自己解開 */
const shipRec=(k,id)=>{const v=((store.get("shipSolved",{})||{})[k]||{})[id];return v==null?null:typeof v==="object"?v:{at:+v||0,h:0}};
const shipLearned=k=>!!((store.get("shipLearn",{})||{})[k]||(store.get("eraOpen",[])||[]).includes(k));   /* 674 版蓋了站章的站也算學會了 */
const shipPages=()=>SHIP_ROUTE.filter(shipLearned).length;
/* 這一站的本命子：主場角色的棋子；船艙那站用自己的棋子（學徒用俥） */
function shipPiece(k){const T=SHIP_STOP[k];if(!T)return"";if(T.who.length)return WX_CHARS[T.who[0]].pc;const c=myChar();return c?WX_CHARS[c].pc:"俥"}
/* 誰說這句：主場角色（照 SHIP_LESSON 的 openBy／doneBy）或說書人 */
function shipWho(k,by){if(by==="teller")return{n:"說書人",img:"data/actors/teller.webp"};const c=by||(SHIP_STOP[k]||{}).who&&SHIP_STOP[k].who[0];const C=c&&WX_CHARS[c];return C?{n:C.nk||C.n,img:"data/xs/prev_"+c+".webp"}:{n:"說書人",img:"data/actors/teller.webp"}}
function shipQuote(){try{if(typeof npcLetters==="function"&&typeof npcBonds==="function"){const M=npcBonds(),n=npcLetters().filter(x=>!(M[x.id]||{}).r).length;if(n)return`驛站信箱裡有 ${n} 封新信，上岸記得去拿。`}}catch(e){}
  return SHIP_SAY[((shipDay()%SHIP_SAY.length)+SHIP_SAY.length)%SHIP_SAY.length]}
/* 棋史卡（HIST）的第一句 */
const shipHist1=k=>{try{const H=HIST[k];if(!H)return"";const s=String(H.x||"").split("。")[0];return s?s+"。":""}catch(e){return""}};

/* ---------- 千秋殘局題庫（只有這裡決定每站出哪幾題） ---------- */
let SHIP_BANK=null;
const shipKey=()=>diffNow()+"|"+shipPiece("classic");
function shipFirstPiece(P){try{const mv=(P.line||[])[0];if(!mv)return"";const f=mv.charCodeAt(0)-97,r=+mv[1],row=String(P.fen).split(" ")[0].split("/")[9-r]||"";let c=0;
  for(const ch of row){if(/\d/.test(ch)){c+=+ch;continue}if(c===f)return ch.toUpperCase();c++}}catch(e){}return""}
function shipBuild(D){const key=shipKey();if(SHIP_BANK&&SHIP_BANK.D===D&&SHIP_BANK.key===key)return SHIP_BANK;
  /* 換成 benming-pool.json：把下面「by＝每種本命子 → 題目」這段換掉即可（只收一盞茶題庫裡有的題，解題頁才畫得出來） */
  const skip=new Set(typeof cjReserved==="function"?cjReserved():[]),by={};
  for(const P of D.items||[]){if(skip.has(P.id))continue;const pc=shipFirstPiece(P);if(pc)(by[pc]=by[pc]||[]).push(P)}
  const [lo,hi]=diffOf().band,used=new Set(),stops={},extra={},dn=diffNow();
  const pick=(k,pcC,n)=>{n=n||SHIP_PER;const Ls=SHIP_LESSON[k]||{},all=(by[SHIP_PC[pcC]]||[]).filter(P=>!used.has(P.id));
    const sc=P=>((Ls.kill||[]).includes(P.kill)?2:0)+((Ls.books||[]).includes((P.src||{}).book)?1:0)+(Ls.one&&P.t==="一步定勝負"?2:0);
    let out=[];for(let w=0;w<=8&&out.length<n;w++){const c=all.filter(P=>{const d=+P.d||0;return d>=lo-w&&d<hi+1+w});if(c.length>=n||w===8)out=c.sort((a,b)=>sc(b)-sc(a)||(+a.d||0)-(+b.d||0)||String(a.id).localeCompare(String(b.id))).slice(0,n)}
    if(out.length<n)out=[];out.forEach(P=>used.add(P.id));return out.sort((a,b)=>(+a.d||0)-(+b.d||0)).map(P=>P.id)};
  /* 意見回饋 684、685：有 SHIP_PLAN 的站先放計畫裡的題（題庫裡沒有的那格留空，等一下自動補），別的站照舊自動挑；熱身、七星同局圖鑑也先占住，不給別站和示範棋局用 */
  const has=id=>!!(id&&D.byId&&D.byId[id]&&(D.byId[id].tree||D.byId[id].lv)),plan={};   /* lv＝星槎小關（ship-set.json 裡沒有 tree，由 ShipLv 跑） */
  for(const k of SHIP_ROUTE){const L=shipPlanIds(k,dn);if(!L)continue;plan[k]=L.map(id=>has(id)&&!used.has(id)?id:null);plan[k].forEach(id=>id&&used.add(id))}
  for(const k in plan){const Pl=SHIP_PLAN[k],x=[];if(dn>=4&&has(Pl.warm)&&!plan[k].includes(Pl.warm))x.push(Pl.warm);
    if(k==="classic")for(const c of "RNCPKAB"){const id="xs-classic-"+c;if(has(id)&&!plan[k].includes(id))x.push(id)}extra[k]=x;x.forEach(id=>used.add(id))}
  const fill=k=>{const L=plan[k],miss=L.filter(id=>!id).length;if(!miss){stops[k]=L;return}const pc=k==="classic"?shipPiece(k):WX_CHARS[SHIP_STOP[k].who[0]].pc,got=pick(k,pc,miss);stops[k]=got.length?L.map(id=>id||got.shift()):L.filter(Boolean)};
  SHIP_ROUTE.filter(k=>k!=="classic"&&!plan[k]).forEach(k=>{stops[k]=pick(k,WX_CHARS[SHIP_STOP[k].who[0]].pc)});
  if(has("xl-finale")&&!used.has("xl-finale")){stops.finale=["xl-finale"];used.add("xl-finale")}else stops.finale=[];   /* 終章只有一關，不跟任何一站搶題 */
  SHIP_ROUTE.filter(k=>k!=="classic"&&plan[k]).forEach(fill);if(plan.classic)fill("classic");else stops.classic=pick("classic",shipPiece("classic"));   /* 船艙那站排最後，不跟家鄉各站搶題 */
  /* 意見回饋 683：每站另挑一題當「示範棋局」（同本命子、同棋理、偏簡單），不跟任何一站的千秋殘局重複，免得先看到答案 */
  const demo={};[...SHIP_ROUTE].forEach(k=>{const pcC=k==="classic"?shipPiece("classic"):WX_CHARS[SHIP_STOP[k].who[0]].pc,Ls=SHIP_LESSON[k]||{},c=(by[SHIP_PC[pcC]]||[]).filter(P=>!used.has(P.id)&&P.tree&&P.tree.o);
    const nM=P=>{try{const f=(P.line||[])[0];return f?1+(((P.tree.o[f]||[])[0]||"").length/4|0):0}catch(e){return 0}},sc=P=>((Ls.kill||[]).includes(P.kill)?4:0)+((Ls.books||[]).includes((P.src||{}).book)?1:0)-(+P.d||0)*.5+(nM(P)>=3&&nM(P)%2?6:0);   /* 至少三步、最後一步是我方走的（示範才看得到殺棋收尾） */const P=c.sort((a,b)=>sc(b)-sc(a)||String(a.id).localeCompare(String(b.id)))[0];if(P){demo[k]=P.id;used.add(P.id)}});
  return SHIP_BANK={D,key,stops,demo,extra}}
function shipBank(){return cjData().then(shipBuild)}
function shipPuzzles(k){if(!SHIP_BANK||SHIP_BANK.key!==shipKey())return null;return SHIP_BANK.stops[k]||[]}
/* 選做的題（國手、千秋的熱身、船艙的七星同局圖鑑）：不計解題點、不給修為 */
function shipExtras(k){if(!SHIP_BANK||SHIP_BANK.key!==shipKey())return[];return(SHIP_BANK.extra||{})[k]||[]}
function shipReserved(D){try{const B=shipBuild(D),o=[];for(const k in B.stops)o.push(...B.stops[k]);for(const k in B.extra||{})o.push(...B.extra[k]);return o}catch(e){return[]}}
/* 題目清單上的小標：劇情局／換一子／變化題／古譜〈題名〉／實戰〈…〉 */
function shipSlotName(k,i,P){if(!SHIP_PLAN[k]||!SHIP_PLAN[k].story)return`${esc(shipPiece(k))}的妙著`;const s=(P&&P.src)||{};
  if(i===0)return"劇情局";if(P&&P.lv)return"玩法・"+esc(String(s.title||"").replace(/^.*・/,""));if(i===1&&k==="classic")return"換一子";if(i===1&&diffNow()<=3)return"變化題";
  if(s.book==="星槎石桌")return"石桌・"+esc(String(s.title||"").replace(/^.*・/,""))+"版";return(s.book==="特級大師對局"?"實戰":"古譜")+(s.title?"〈"+esc(String(s.title).replace(/-\(.*\)$/,""))+"〉":"")}
/* 3 個解題點：實心＝自己解、空心＝用過提示、空白＝還沒解 */
function shipDots(k,L){L=L||shipPuzzles(k)||[];return`<span class="shp-dots">${(L.length?L:[0,0,0]).map(id=>{const r=id&&shipRec(k,id);return`<i class="${r?r.h?"h":"s":""}"></i>`}).join("")}</span>`}

/* ---------- 解題頁設定（07c-canju.js CanjuPlay 的 XM） ---------- */
/* 意見回饋 762 第零版：這站學會了、還有下一站（不是學徒）＝下一站的代號，結果卡和石桌頁的主按鈕改成「⛵ 起航」 */
const shipSailTo=k=>{try{return shipLearned(k)&&!shipAppr()?shipNextStop():null}catch(e){return null}};
function shipXM(k,id){const rd=/\/read$/.test(id);if(rd)id=id.replace(/\/read$/,"");   /* 意見回饋 685：…/read＝從正文的解題卡來的，解完回到正文 */
  const T=SHIP_STOP[k],Ls=SHIP_LESSON[k]||{},Pl=SHIP_PLAN[k]||{},back=()=>rd?"#/ship/read/"+k+"/mark":"#/adventure";shipBank().catch(()=>{});
  if(!T)return{err:"找不到這一站（航線可能更新了）。",back};
  if(shipIsLvId(id))return{err:"這一題是星槎小關，要從千秋殘局頁打開。",back};
  if(eraLocked(k))return{err:"星槎還沒停靠"+eraLabel(k)+"：到星槎頁按「⛵ 起航」往下開。",back};
  {const M=typeof shipMoreXM==="function"?shipMoreXM(k,id):null;if(M)return M}   /* 意見回饋 762 第一版：石桌續局的題（07o-shipmore.js） */
  {const M=typeof chdHomeXM==="function"?chdHomeXM(k,id):null;if(M)return M}   /* 意見回饋 774 故國舊夢：家鄉那一站信裡夾的殘譜（07q-chardiff.js） */
  const isX=()=>{const L=shipPuzzles(k);return!!L&&!L.includes(id)&&shipExtras(k).includes(id)},L0=shipPuzzles(k);   /* 選做題（直接打開網址時題庫可能還沒挑好，用到時再判斷） */
  if(L0&&!L0.includes(id)&&!isX())return{err:"這一題不在這一站的千秋殘局裡（換了難度或題庫更新了），回星槎頁再點一次。",back};
  const slot=()=>{const L=shipPuzzles(k)||[];return L.includes(id)?L.indexOf(id):-1},say=P=>shipSay(k,id,P,isX()?-1:slot());
  const nx=()=>(shipPuzzles(k)||[]).find(x=>x!==id&&!shipRec(k,x))||null;
  return{id,rk:"cjRunS",back,top:"⛵ 千秋殘局",icon:"⛵",get ans(){return isX()?"看答案這題就不算解開，確定？":"看答案這題就不算解開（也沒有修為），確定？"},get noXP(){return isX()},
    hint1:!isX()&&diffNow()===1&&!!Pl.story&&slot()===0,   /* 聽書：劇情局一開始就打開第一層提示（第一層本來就免費，點還是實心） */
    head:P=>{const i=slot(),S=say(P);return`<b>⛵ ${esc(shipShort(k))}・${esc(Ls.t||T.place)}</b>・${isX()?(k==="classic"?"七星同局圖鑑":"熱身・變化題")+"（選做）":Pl.story&&i>=0?`第 ${i+1} 題・${shipSlotName(k,i,P)}`:`本命子「${esc(shipPiece(k))}」的妙著`}・${cjLv(P.d)}　<span class="muted">${cjSrc(P)}</span>${(S.pre||[]).map(x=>`<div class="shp-psay">${shipLine(x)}</div>`).join("")}${typeof phCardHTML==="function"&&!isX()?phCardHTML(k):""}`},
    wrong:(u,step,P)=>{if(!isX())try{phWrong(k,id,P)}catch(e){}const x=step===0&&(say(P).wrong||{})[u];return x?shipLine(x).replace(/<[^>]+>/g,""):""},
    mark:o=>isX()?shipGalMark(k,id,o):shipMark(k,id,o),done:(o,ans)=>shipDoneHTML(k,o,ans,id,o&&o.gal),
    next:()=>{if(rd)return"#/ship/read/"+k+"/after";const x=nx();return x?shipHref(k,x):shipSailTo(k)?"#/ship/sail":null},nextL:()=>rd?`📖 回到第${CNUM(Pl.ch||1)}章`:nx()?"下一題":shipSailTo(k)?"⛵ 起航去"+shipShort(shipSailTo(k)):"回星槎"}}
/* ---------- 星槎小關（關卡設計_第5-14章 元件 A，開發者 11/7）：一格題目是石桌往事的關卡步驟（relay、judge、guess、memory、talk、arrange、puzzle）----------
   資料在 ship-set.json 的 lv:1 項目（tools/canju/ship_levels.json → 6_ship.js 檢查走法後併進去）：game＝石桌往事關卡格式，byDiff＝各航行難度的覆寫（陣列照位置合併，null＝不改）。
   #/ship/lv/<站>/<題號>[/read]；用 07-legend.js 的 jLevel 跑，進度存 jRunS（不蓋掉石桌往事玩到一半的 jRun）；過關＝解開，用過提示＝空心點（shipRec 的 h）。 */
const shipIsLvId=id=>/^xl-/.test(String(id||""));
const shipHref=(k,id,rd)=>(shipIsLvId(id)?"#/ship/lv/":"#/canju/s/")+k+"/"+encodeURIComponent(id)+(rd?"/read":"");
function shipLvMerge(a,b){for(const x in b){const v=b[x];if(Array.isArray(v)&&Array.isArray(a[x])&&v.some(y=>y===null||(y&&typeof y==="object"))){v.forEach((y,i)=>{if(y==null)return;if(a[x][i]&&typeof a[x][i]==="object"&&!Array.isArray(y))shipLvMerge(a[x][i],y);else a[x][i]=y})}else a[x]=v}return a}
function shipLvGame(P,dn){return shipLvMerge(JSON.parse(JSON.stringify(P.game||{})),(P.byDiff||{})[dn]||{})}
function ShipLv(v,k,id,rd){const T=SHIP_STOP[k],Pl=SHIP_PLAN[k]||{},Ls=SHIP_LESSON[k]||{},back=rd?"#/ship/read/"+k+"/mark":k==="finale"?"#/ship/sail":"#/ship/pz";
  setTop("⛵ 千秋殘局",back);setTabs(false);v.className="view";v.innerHTML='<div class="pad muted">載入中…</div>';
  const bad=msg=>{v.className="view";v.innerHTML=`<div class="pad"><div class="card muted">${esc(msg)}<br><a href="${back}">回去</a></div></div>`};
  if(!T){bad("找不到這一站（航線可能更新了）。");return{}}
  if(k==="finale"&&!shipFinaleOpen()){bad("終章要十三站的棋理都學會以後才會開。");return{}}
  if(k!=="finale"&&eraLocked(k)){bad("星槎還沒停靠"+eraLabel(k)+"：到星槎頁按「⛵ 起航」往下開。");return{}}
  shipBank().then(B=>{if(!v.isConnected)return;const P=B.D.byId[id],L=shipPuzzles(k)||[],isX=!L.includes(id)&&shipExtras(k).includes(id);
    if(!P||!P.lv){bad("找不到這一題（題庫可能更新了）。");return}
    if(!L.includes(id)&&!isX){bad("這一題不在這一站的千秋殘局裡（換了難度或題庫更新了），回星槎頁再點一次。");return}
    const i=L.indexOf(id),G=shipLvGame(P,diffNow());if(shipAppr()){if(!/^說書人/.test(G.intro||""))G.intro="";if(!/^說書人/.test(G.outro||""))G.outro=""}   /* 學徒只聽得到說書人（跟 shipSay 一樣） */const nx=()=>L.find(x=>x!==id&&!shipRec(k,x))||null,W=shipWho(k,Ls.doneBy);let res=null;
    const slot=isX?"熱身・選做（不計點、不給修為）":`第 ${i+1} 題・${String(shipSlotName(k,i,P)).replace(/<[^>]+>/g,"")}`;
    jLevel(v,{id:"ship:"+k+":"+id+":"+diffNow(),name:shipShort(k)+"・"+(G.name||"")},{G,rk:"jRunS",icon:"⛵",back,title:`${shipShort(k)}・${Ls.t||T.place}・${slot}`,
      done:(stars,R)=>{const o={hint:!!(R&&R.hint),perfect:stars>=3};res=isX?shipGalMark(k,id,o):shipMark(k,id,o);
        if(res&&res.learned&&Ls.done&&k!=="finale")G.outro=(G.outro?G.outro+"　":"")+`✅ 學會了：${Ls.t||""}。${W.n}：「${Ls.done}」`;if(res&&res.learned&&k==="finale")setTimeout(()=>typeof qxPlay==="function"?qxPlay(shipFinaleCard):shipFinaleCard(),900);if(res&&res.learned&&k!=="finale"&&typeof qpPlay==="function")setTimeout(()=>qpPlay(k),900);return stars},
      line:()=>!res?"":isX?"🔥 熱身做完了（選做）":k==="finale"?"✅ 千秋歸位・石桌補全了":res.learned?`✅ 學會了：${Ls.t||""}`:`⛵ ${shipShort(k)}・解開 ${res.n}／${res.all}${res.h?"（用過提示，空心點）":""}`,
      get next(){if(rd)return[`📖 回到第${CNUM(Pl.ch||1)}章`,()=>{location.hash="#/ship/read/"+k+"/after"}];if(isX)return["回千秋殘局",()=>goUp("#/ship/pz")];
        if(k==="finale")return["⛵ 回起航頁",()=>goUp("#/ship/sail")];const x=nx();return x?["下一題 ›",()=>{location.hash=shipHref(k,x)}]:shipSailTo(k)?["⛵ 起航去"+shipShort(shipSailTo(k)),()=>goUp("#/ship/sail")]:["回星槎",()=>goUp("#/adventure")]}})}).catch(e=>bad(e&&e.message||"題庫載入失敗"));
  return{}}
/* 終章過關：石桌補全的收尾卡（第 14 章：青石嵌回缺槽、刻痕的光連成一片） */
function shipFinaleCard(){try{modal(`<img src="data/actors/teller.webp" alt="" onerror="this.remove()"><h2>🪨 石桌補全了</h2><p style="line-height:1.8">青石嵌回缺槽，河界的刻線依然清楚，刻痕的青玉色光連成一片。《千秋棋話》的書頁翻到了最後。</p><p class="pl-say">說書人：「不是每盤殘局都能贏。可人常把一時的難，當作往後再也沒有路。」</p>`,[["▶ 再看一次七星連珠",()=>setTimeout(()=>qxPlay(shipFinaleCard),250)],["好",null]],"prolog")}catch(e){}}
/* 選做的題解開了：記在 shipGal（不計解題點、不給修為） */
function shipGalMark(k,id,o){const G=store.get("shipGal",{})||{},first=!G[id];G[id]={at:Date.now(),h:o&&o.hint?1:0};store.set("shipGal",G);return{gal:1,first,h:G[id].h,stale1:shipStale1(id)}}
/* 第一次解開困斃題：說書人補一句規則 */
function shipStale1(id){try{const P=SHIP_BANK&&SHIP_BANK.D.byId[id];if(!P||!P.stale||store.get("shipStale",false))return false;store.set("shipStale",true);return true}catch(e){return false}}
/* 解開（看答案的不會呼叫）：記下這題和有沒有用提示；第一次解開修為 +15；3 題都解開＝學會了（shipLearn） */
function shipMark(k,id,o){const A=store.get("shipSolved",{})||{},E=A[k]||(A[k]={}),old=shipRec(k,id),h=o&&o.hint?1:0,first=!old;
  if(first)E[id]={at:Date.now(),h};else if(old.h&&!h)E[id]={at:old.at||Date.now(),h:0,up:Date.now()};store.set("shipSolved",A);
  const L=shipPuzzles(k)||[],n=L.filter(x=>shipRec(k,x)).length;let learned=false;
  if(L.length&&n>=L.length&&!shipLearned(k)){const M=store.get("shipLearn",{})||{};M[k]=Date.now();store.set("shipLearn",M);learned=true}
  if(first&&typeof addXP==="function")setTimeout(()=>addXP(15,"千秋殘局",`ship:${k}:${id}`),1600);
  return{first,h,n,all:L.length,learned,stale1:shipStale1(id)}}
function shipDoneHTML(k,o,ans,id,isX){if(ans||!o)return`<p class="muted">看了答案，這題先不算解開；之後不看答案再解一次就算。</p>`;
  const Ls=SHIP_LESSON[k]||{},W=shipWho(k,Ls.doneBy),P=id&&SHIP_BANK?SHIP_BANK.D.byId[id]:null,S=id?shipSay(k,id,P,-1):{};
  const says=`${(S.done||[]).map(x=>`<p class="shp-say">${shipLine(x)}</p>`).join("")}${P&&P.stale?o.stale1?`<p class="shp-say">說書人：「沒被將軍，卻一步也動不了，這叫困斃，一樣算贏。」</p>`:`<p class="muted">困斃：對方一步都動不了，一樣算贏。</p>`:""}`;
  const more=S.more&&SHIP_BANK&&SHIP_BANK.D.byId[S.more.id]?`<p class="muted">📜 ${esc(S.more.t)}　<a href="#/canju/${encodeURIComponent(S.more.id)}">想多看一題 ›</a></p>`:"";
  if(isX||o.gal){const G=store.get("shipGal",{})||{},X=shipExtras(k),n=X.filter(x=>G[x]).length;
    return`<div class="card shp-done">${k==="classic"?`🖼 <b>七星同局圖鑑</b>　${n}／${X.length}`:"🔥 <b>熱身・變化題</b>"}<br><span class="muted">選做的題：不計解題點、不給修為。</span>${says}${more}</div>`}
  return`<div class="card shp-done">⛵ <b>${esc(shipShort(k))}・${esc(Ls.t||"")}</b>　${shipDots(k)}　${o.n}／${o.all}<br><span class="muted">${o.h?"這題用了提示（空心點）；不看提示再解一次，點就會變實心。":"自己解開的（實心點）。"}${o.first?"修為 +15。":""}</span>
    ${says}${more}
    ${o.learned?`<p class="shp-learn">✅ 學會了：${esc(Ls.t||"")}<br><span class="muted">《千秋棋話》補了 ${shipPages()}／13 頁</span></p>${typeof sealLitHTML==="function"?sealLitHTML(k,"li"):""}${Ls.done?`<p class="shp-say">${esc(W.n)}：「${esc(Ls.done)}」</p>`:""}`:""}</div>`}

/* ---------- 免費悔棋（照難度：星槎、擂台的對局每盤幾次；08b-cpugame.js undoAsk 呼叫） ---------- */
function undoFreeLeft(st){try{const D=diffOf();if(!st||!D.undo||st.ranked||st.practice)return 0;const k=st.kind||(st.journey?"journey":st.arena?"arena":"cpu");if(k!=="journey"&&k!=="arena")return 0;
  if(D.undo<0)return-1;const U=store.get("undoFree",null)||{};return Math.max(0,D.undo-(U.id===st.id?U.n|0:0))}catch(e){return 0}}
function undoFreeUse(st){const U=store.get("undoFree",null)||{};store.set("undoFree",U.id===st.id?{id:st.id,n:(U.n|0)+1}:{id:st.id,n:1})}

/* ---------- 航行難度：選、改（星槎頁行囊、設定都叫這個） ---------- */
function diffSheet(after){sheet("🎚 航行難度",b=>{const cur=diffNow(),sg=diffSuggest();
  b.innerHTML=`<p class="muted" style="margin:0 0 8px">難度只管星槎裡的電腦對手和千秋殘局的題目。隨時可以換；已經停靠的站、學會的棋理都不會收回。</p>${DIFF.map((d,i)=>`<button class="item shp-df${i+1===cur?" on":""}" data-df="${i+1}"><span class="tx"><b>${esc(d.n)}${i+1===cur?"・現在":""}${i===1?'<em class="shp-tag">多數人選這個</em>':""}${sg===i+1?'<em class="shp-tag">依你的棋力測驗建議</em>':""}</b><span>${esc(d.fit)}・練${esc(d.learn)}</span></span></button>`).join("")}`;
  b.querySelectorAll("[data-df]").forEach(x=>x.onclick=()=>{vibrate(5);const n=+x.dataset.df;store.set("diff",n);closeSheet();toast("🎚 航行難度換成「"+DIFF[n-1].n+"」");try{saveNow(true)}catch(e){}if(after)after()})})}

/* ---------- 起航：往下一站開——先播千秋穿梭（只播經過的那幾朝，意見回饋 697），再出停靠封面（2.6 秒、點一下跳過），再看這一站主場角色的開場 ---------- */
function shipSailGo(done){{const N=shipSailNeed();if(N){shipGateSay(N);return}}const from=shipAt(),k=shipSail();if(!k)return;shipEra(k);vibrate([10,40,10]);try{saveNow(true)}catch(e){}
  qianqiu(from,k,()=>{if(typeof bhMaybe==="function")bhMaybe(k,()=>shipDockCover(k,done),true);else shipDockCover(k,done)},"sail")}   /* hspx（開發者 11/12）：穿梭完 10% 偏航進黑洞（07bh-blackhole.js），不下就照常停靠 */
function shipDockCover(k,done){const Ls=SHIP_LESSON[k]||{},T=SHIP_STOP[k],c=document.createElement("div");let fin=false;c.className="ecover";
  c.innerHTML=`<i style="background-image:url(data/inn/${k}_ink.webp),url(data/inn/${k}.webp)"></i><div><span class="es">${esc((ARENA[k]||{}).seal||"⛵")}</span><b>${esc(shipShort(k))}</b><small>⛵ 星槎停靠・${esc(T.place)}</small></div>`;
  document.body.append(c);requestAnimationFrame(()=>c.classList.add("on"));
  const arrive=()=>{if(fin)return;fin=true;c.classList.remove("on");setTimeout(()=>c.remove(),500);const W=shipWho(k,Ls.openBy);
    modal(`<img src="${W.img}" alt="" onerror="this.remove()"><h2>${esc(shipShort(k))}・${esc(T.place)}</h2>${Ls.open?`<p class="pl-say">${esc(W.n)}：「${esc(Ls.open)}」</p>`:""}<p>📘 棋話一頁：<b>${esc(Ls.t||"")}</b></p>`,[["看這一站",()=>{if(done)done()}]],"prolog")};
  c.onclick=arrive;setTimeout(arrive,2600)}

/* ---------- 人在哪一朝（意見回饋 697，開發者 11/6）：只有一個答案——換朝代時 era（園子、驛站、擂台、3D 場景用）和 shipAt（星槎停哪一站）一起改 ---------- */
function shipEra(k){store.set("shipAt",k);if(store.get("era","classic")===k)return;store.set("era",k);store.set("eraUser",null);try{if(typeof PARK!=="undefined"&&PARK){PARK.v.destroy();PARK=null}}catch(e){}try{applyEra()}catch(e){}}
/* 進星槎、渡口、驛站時對一次：舊存檔 era 和 shipAt 不一樣（以前千秋石枰、集章簿、擂台只改 era），以 era 為準把星槎也停過去；era 那一朝還沒停靠才用星槎那一站 */
function shipHere(){const e=store.get("era","classic"),k=shipDocked().includes(e)?e:shipAt();if(e!==k||store.get("shipAt",null)!==k)shipEra(k);return k}
/* 換朝代只在星槎：航線點別站、擂主卡和集章簿的「⛵ 回星槎開往〇朝」都走這裡，播千秋穿梭 */
function shipGoTo(e,after){if(eraLocked(e)){vibrate(8);toast(eraLockMsg(e));return}const k=shipAt();if(e===k){if(after)after();return}shipEra(e);try{saveNow(true)}catch(x){}
  qianqiu(k,e,()=>{const go=()=>{if(after)after();else if(navKey(location.hash)==="/adventure")route()};if(typeof bhMaybe==="function")bhMaybe(e,go,false);else go()},"go")}
function innName(k){return k==="classic"?"雲河驛站":eraLabel(k)+"的驛站"}   /* 意見回饋 697：船艙那一站的驛站叫「雲河驛站」 */
function portName(k){return k==="classic"?"船艙":eraLabel(k)+"的渡口"}
function navPrev(){try{for(let i=NAV_D-1;i>=0;i--){const x=NAV_H[i];if(typeof x==="string"&&x[0]!=="~")return x}}catch(e){}return null}   /* 上一頁的網址（跳過卡片那一層） */
/* ---------- 下船：渡口和三扇門（園子、驛站、擂台）。rep＝同一朝橫著走（園子↔驛站↔擂台），用 replace 不疊上一頁 ---------- */
const shipNav=(h,rep)=>{if(navKey(h)===navKey(location.hash))route();else if(rep)navReplace(h);else location.hash=h};   /* 已經在那一頁（例如在驛站旅人的對局頁去園子）就重畫 */
function shipPort(k){if(eraLocked(k))return toast(eraLockMsg(k));shipEra(k);walk("port",()=>{location.hash="#/port"},k==="classic"?"⚓ 下船・走進":"⚓ 放下跳板，走上")}
function shipPark(k,rep){if(eraLocked(k))return toast(eraLockMsg(k));shipEra(k);store.set("park3d",true);
  jStart("park",{human:"r",level:parkNpcLv(),journey:"park"},()=>{shipNav("#/journey/play",rep);setTimeout(()=>{const r=store.get("parkNpc",null),n=r&&typeof PARK_NPC!=="undefined"&&PARK_NPC.find(x=>x.id===r.id);toast(`🌳 ${parkName(k)}到了${n?"・遇到"+n.name:""}`);if(k==="classic")setTimeout(()=>tellerTalk(),900)},600)})}   /* 意見回饋 674：青石園有說書人 */
function shipInn(k,rep){if(eraLocked(k))return toast(eraLockMsg(k));shipEra(k);walk("inn",()=>shipNav("#/journey/inn",rep))}
function shipArena(k,rep){if(eraLocked(k))return toast(eraLockMsg(k));shipEra(k);store.set("park3d",true);shipNav("#/arena",rep)}

/* ---------- 渡口 #/port（意見回饋 697，開發者 11/6 定案方案 B）：每一朝的中心。星槎「⚓ 下船」到這裡；三扇門 🌳 園子、🏮 驛站、🏯 擂台，另有「⛵ 回星槎」。
   園子、驛站、擂台的「‹」回渡口，渡口的「‹」回星槎；門之間走步行小卡 ---------- */
/* 渡口圖上三扇門的位置 [園子, 驛站, 擂台]（左%, 上%），照每一張圖量的 */
const PORT_SPOT={_:[[25,58],[73,50],[50,30]],classic:[[22,56],[76,57],[44,36]],qin:[[31,62],[75,64],[53,41]],han:[[28,61],[73,67],[52,40]],sanguo:[[28,59],[78,63],[56,41]],weijin:[[27,55],[80,60],[70,38]],
  nanbei:[[33,57],[80,62],[62,40]],sui:[[20,67],[79,63],[49,44]],tang:[[25,60],[70,68],[42,40]],wudai:[[28,46],[75,58],[64,33]],song:[[25,62],[72,67],[55,40]],yuan:[[30,63],[67,62],[46,43]],ming:[[27,59],[80,67],[47,36]],qing:[[34,59],[65,52],[45,38]]};
/* 意見回饋 712（開發者 11/6）：渡口圖上當朝的歷史景點 [名字, 左%, 上%, 介紹]，照 Gemini 畫進每張圖的東西量的；點了 15% 機率先撿到那一朝的珍品（relicDrop，跟園子點長卷一樣），沒撿到就看介紹。開發者 11/8：改走 07v-relicdrop.js 的 relicSightDrop（5%、每個景點每天抽一次、分等級；RELIC_DROP_ON 關掉就退回這裡的舊規則） */
const PORT_SIGHT={"qin":[["萬里長城",32,22,"秦始皇統一六國後，派蒙恬把燕、趙、秦原本各自修的長城連起來，西起臨洮、東到遼東，用來擋匈奴。秦長城多用黃土一層層夯實，山上就地堆石塊，沒有磚砌的城垛和敵樓；我們常看到的磚長城，大多是明朝修的。"],["烽火台",82,26,"長城沿線每隔一段路就有一座烽火台。白天燒柴冒煙、晚上點火，敵人一來，一台接一台傳下去，邊關的消息很快就能傳到遠方。"],["秦直道",75,36,"秦始皇命大將蒙恬修的軍用大道，從咸陽北邊的雲陽一路往北通到九原（今天內蒙古包頭一帶），長七百多公里，又寬又直，大軍可以很快開到北方邊境。"]],"han":[["漢代烽燧",17,27,"漢朝在河西走廊和往西域的路上修了許多烽燧，也就是守望台，士兵在上面守望、傳遞軍情。考古學家在這些遺址挖出大量木簡，叫「漢簡」，記下了戍守士兵的日常生活。"],["玉門關",86,27,"漢武帝時設在敦煌西北的關口，是河西走廊通往西域的大門。相傳西域的美玉從這裡運進中原，所以叫玉門關。漢代的關城是黃土夯成的方形小城，出了關就是大漠，是絲綢之路上的重要關卡。"]],"sanguo":[["火燒戰船",38,28,"曹操的戰船首尾相連，吳將黃蓋假裝投降，帶著裝滿乾柴、澆了油的船衝向曹營，順著東南風點火，戰船燒成一片。這就是有名的「火燒赤壁」。"],["赤壁",80,24,"西元 208 年，孫權和劉備的聯軍在長江赤壁一帶大敗曹操。這一仗之後，魏、蜀、吳三分天下的局面慢慢成形。"],["北岸營寨",86,46,"曹操大軍駐紮在長江北岸，孫劉聯軍在南岸。北方來的士兵不習慣坐船打仗，軍中又流行疾病，這些都是曹軍戰敗的原因。"]],"weijin":[["竹林",12,28,"魏晉之際，嵇康、阮籍、山濤等七位名士常在竹林下喝酒、彈琴、談天說理，被稱為「竹林七賢」。他們不愛官場的規矩，嚮往自然自在的生活。"],["曲水",42,31,"東晉永和九年（353 年），王羲之和朋友在蘭亭的溪邊玩「曲水流觴」：酒杯順著彎彎的溪水漂，停在誰面前，誰就要作詩。王羲之為這些詩寫的序，就是有名的〈蘭亭集序〉。"]],"nanbei":[["棲霞山千佛崖",24,30,"南京棲霞山的石窟，從南朝開始在山崖上鑿佛龕，最大的一龕是無量壽佛，兩旁站著菩薩。北方有雲岡、龍門那樣的大石窟，南方的石窟很少，棲霞山是南朝留下來最重要的一處，就在長江邊上。"],["山寺佛塔",56,23,"南朝的皇帝和貴族很信佛，梁武帝甚至幾次捨身出家。杜牧寫「南朝四百八十寺」，說的就是當年建康城一帶寺廟林立的樣子。"],["長江",72,75,"南北朝時，南方和北方的政權大致隔著長江、淮河對峙了一百多年。長江又寬又急，北方的大軍很難渡江南下。"]],"sui":[["隋煬帝的龍舟",24,31,"運河開通後，隋煬帝坐著四層高的大龍舟南下江都（今天的揚州）巡遊，跟隨的船隊前後連綿兩百多里。這樣勞民傷財，也是隋朝很快滅亡的原因之一。"],["大運河",62,22,"隋煬帝動員上百萬民工，以洛陽為中心開鑿運河，北到涿郡、南到餘杭，把海河、黃河、淮河、長江、錢塘江五大水系連在一起。從此南方的糧食可以用船運到北方。"]],"tang":[["長安城門",28,16,"唐代的長安是當時世界上最大的城市之一，四周有高大的城牆。城裡的大街像棋盤一樣橫平豎直，劃分成一百多個「坊」。"],["大雁塔",79,14,"玄奘從天竺取經回來後，在長安的慈恩寺建了這座塔，收藏他帶回來的經書和佛像。新考上的進士會到塔下題名，叫「雁塔題名」。"],["西市",88,33,"長安有東市和西市。西市靠近絲綢之路的起點，西域來的胡商很多，賣珠寶、香料、胡餅。據說我們說「買東西」，就是從逛東市、西市來的。"]],"wudai":[["遠方的戰火",15,18,"五代只有短短五十多年，中原就換了後梁、後唐、後晉、後漢、後周五個朝代，戰爭幾乎沒有停過。遠方常常看得見村子被戰火燒起的黑煙，百姓只好扶老攜幼逃難。"],["荒村",12,56,"連年打仗，許多百姓離開家鄉逃難，田地荒廢、村子成了廢墟。直到宋太祖趙匡胤建立宋朝，天下才慢慢安定下來。"]],"song":[["雷峰塔",30,17,"吳越國王錢俶在西湖邊建的塔，因為蓋在雷峰上而得名。後來流傳的《白蛇傳》裡，白娘子就被法海壓在雷峰塔下。"],["斷橋",32,24,"西湖白堤東頭的石拱橋。冬天下雪後，橋面向陽的雪先融化，遠看橋像斷了一樣，叫「斷橋殘雪」，南宋時就列入西湖十景。《白蛇傳》裡許仙和白娘子也在這裡相遇。"],["元宵花燈",88,38,"宋朝的元宵節非常熱鬧，臨安城家家掛燈，街上有燈山、煙火和舞隊，一連好幾夜。辛棄疾寫「東風夜放花千樹」，寫的就是元宵夜的燈火。"]],"yuan":[["蒙古包",29,44,"蒙古人跟著水草放牧遷徙，住的是可以拆開、搬走的圓形氈帳。元朝人叫它「穹廬」或「氈帳」，「蒙古包」是清朝以後才有的叫法。元朝的皇帝每年夏天也會到草原上的上都避暑。"],["站赤",87,46,"元朝在全國設了一千多處驛站，蒙古話叫「站赤」。官員和信使拿著牌子，就能在驛站換馬、吃住，消息可以從大都一路傳到很遠的地方。馬可・波羅的遊記也寫到這套驛站制度。"]],"ming":[["馬頭牆",12,30,"徽州民居的白牆高出屋頂，一層一層像昂起的馬頭，所以叫馬頭牆。房子挨得很近，高牆可以擋住火勢，又叫「封火牆」。明朝徽商在外做生意致富，回鄉蓋起這樣的大宅。"],["石牌坊",68,29,"徽州的村口常立著石牌坊，表彰考上功名的讀書人，或是孝順、守節的人。歙縣棠樾村有一整排的牌坊群。"],["黃山",78,16,"徽州境內的名山，以奇松、怪石、雲海出名。明朝的旅行家徐霞客兩次登上黃山，留下了遊記。"]],"qing":[["文峰塔",86,18,"揚州城南古運河邊的八角七層寶塔，明朝萬曆十年（1582 年）建造。塔名「文峰」，是希望地方文風興盛、多出讀書人。運河上的船老遠就能看到它，像是揚州的路標。"],["瘦西湖",22,20,"揚州城西北細長的湖，兩岸是鹽商修的園林。乾隆皇帝南巡時來過，湖上有五座亭子的五亭橋（1757 年）和像寶瓶一樣的白塔（1784 年），都是乾隆年間鹽商出錢修的。"],["漕運糧船",84,82,"清朝每年要從江南用船把幾百萬石糧食，經過大運河運到北京，叫「漕運」。揚州正好在運河和長江交會的地方，糧船、鹽商都聚在這裡，城市非常繁華。"]]};
function portSight(k,i){const s=(PORT_SIGHT[k]||[])[i];if(!s)return;vibrate(5);(typeof relicSightDrop==="function"?relicSightDrop("p",k,s[0]):relicDrop(k,.15)).then(got=>{if(got)return;const T=SHIP_STOP[k]||{};sheet("📍 "+s[0],b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(eraLabel(k))}・${esc(T.place||"")}</div><p style="line-height:1.8;margin:0;font-size:16px">${esc(s[3])}</p>`})}).catch(()=>{})}
function Port(v){const k=shipHere(),T=SHIP_STOP[k]||SHIP_STOP.classic,Ls=SHIP_LESSON[k]||{},ap=shipAppr(),AS=typeof arenaStamps==="function"?arenaStamps():{},A=ARENA[k]||{},lrn=shipLearned(k);
  setTop("⚓ "+portName(k),"^#/adventure");   /* hspx 11/11：標題列右上的 ⛵ 拿掉，回星槎走圖上的「⛵ 上星槎／回星槎」（07w4 PH4_PIER） */setTabs(false);v.className="view";
  const byT=ap||!Ls.open,W=byT?shipWho(k,"teller"):shipWho(k,lrn&&Ls.done?Ls.doneBy:Ls.openBy),say=byT?shipQuote():lrn&&Ls.done?Ls.done:Ls.open;
  const Q=PORT_SPOT[k]||PORT_SPOT._;   /* 意見回饋 709：渡口上方＝那一朝的滿版水墨圖（data/shipmap/port_<朝代>.webp），三扇門是圖上的金色入口 */
  v.innerHTML=shpPage("port_"+k,"⚓ "+esc(portName(k)),(k==="classic"?"雲河星槎":esc(eraLabel(k)))+"・"+esc(T.place),[["poPark",Q[0][0],Q[0][1],"🌳 "+esc(parkName(k)),"路人棋友"],["poInn",Q[1][0],Q[1][1],"🏮 "+esc(innName(k)),"旅人・秘境棋友"],["poArena",Q[2][0],Q[2][1],"🏯 "+esc(A.name||"擂主")+(AS[k]?" ✓":""),"擂台"],...(k==="classic"?[["poPh",47,65,"🀄 千秋石桌","幻影指導局"]]:[["poBattle",Q[2][0],Math.min(90,Q[2][1]+11),"⚔ 古戰場"+((typeof sealSideOn==="function"?sealSideOn(k,"battle"):(store.get("battleTitle",{})||{})[k])?" ✓":""),""]])],   /* 意見回饋 725：擂台旁的「⚔ 古戰場」（07g-battle.js），船艙沒有 */(PORT_SIGHT[k]||[]).map((s,i)=>`<button class="po-sight" data-ps="${i}" style="left:${s[1]}%;top:${s[2]}%">📍 ${esc(s[0])}</button>`).join(""))+`<div class="pad port">
    <div class="card port-say"><img src="${W.img}" alt="" onerror="this.remove()"><p><b>${esc(W.n)}</b>「${esc(say)}」</p></div>
    <div id="poRes"></div>${typeof sealDraw==="function"?(()=>{const S=sealOf(k);return`<button class="card qs-port" id="poSeal">${sealDraw(k)}<span style="flex:1;min-width:0"><b>🏮 ${esc(sealNm(k))}</b><br><span class="muted" style="font-size:13px">${S.gold?"已鑄成金印":`亮了 ${S.n}／${S.N} 邊：${S.need.map(s=>SEAL_SIDE[s][1]+(S.on[s]?"✔":"・")).join(" ")}`}</span></span><span class="muted">›</span></button>`})():""}
    <button class="btn ghost" id="poShip" style="width:100%;margin-top:12px">⛵ 回星槎</button></div>`;
  const on=(q,fn)=>{const e=v.querySelector(q);if(e)e.onclick=()=>{vibrate(5);fn()}};
  on("#poPark",()=>walk("park",()=>shipPark(k)));on("#poInn",()=>shipInn(k));shpOn(v,"#poPh",()=>{location.hash="#/ship/phantom"});on("#poArena",()=>shipArena(k));on("#poBattle",()=>{location.hash="#/battle"});on("#poShip",()=>goUp("#/adventure"));on("#poSeal",()=>sealEraSheet(k));v.querySelectorAll("[data-ps]").forEach(b=>b.onclick=()=>portSight(k,+b.dataset.ps));
  jResume(v.querySelector("#poRes"));shpFit(v);if(typeof portColor==="function")portColor(v,k);if(typeof portFx==="function")portFx(v,k);if(typeof portWind==="function")portWind(v,k);   /* 意見回饋 765：船艙圖的 WebGL 動態（07n-portfx.js）；769：12 朝渡口換上色圖、下船時顏色暈開（07p-portcolor.js） */
  if(typeof v7Try==="function")v7Try(v,"port");return{}}

/* ---------- 想換成雲河七星：開新旅程，存到空的那一格（沒有空格就到開頭畫面挑） ---------- */
function shipNewJourney(pc){const M=slotMetaAll(),cur=curSlot(),e=[1,2,3].find(n=>!M[n]&&n!==cur),c0=pc&&WX_CHARS[pc]?{c:pc}:{};   /* pc＝選角畫面預選哪一位（意見回饋 774 破關卡的「用〇〇再走一次」） */
  if(e)return titleScreen({view:"pick",mode:"new",slot:e,...c0});
  modal(`<div class="em">💾</div><h2>三格存檔都有人了</h2><p class="muted">現在這段旅程在第 ${cur||1} 格。要開新的旅程，請在開頭畫面挑另一格覆蓋（別選第 ${cur||1} 格，舊進度就不會被蓋掉）。</p>`,[["去開頭畫面",()=>titleScreen({view:"slots",mode:"new",...c0})],["取消",null,true]])}

/* ---------- 首頁大卡 ---------- */
function shipHomeHTML(){try{const ap=shipAppr(),k=shipAt(),T=SHIP_STOP[k]||SHIP_STOP.classic,L=legendState();
  /* Gemini 評估 11/8（介面圖示化）：首頁大卡只留一句「停在哪一站」，棋話頁數、說書人、石桌往事進度進星槎頁看（螢幕閱讀器從 aria-label 讀得到） */
  return`<button class="tile hubc ha shpc" data-go="#/adventure" aria-label="雲河星槎：${ap?"說書人的學徒，十三站都能去":`${esc(shipShort(k))}・${esc(T.place)}，棋話 ${shipPages()}／13 頁`}，石桌往事讀到第${CNUM(L.n)}回"><span class="hi">⛵</span><span class="tx"><span class="t">雲河星槎</span>
    <span class="s" id="hLegend">${ap?"說書人學徒・13 站":`⛵ ${esc(shipShort(k))}・${esc(T.place)}`}</span>${(q=>q?`<span class="s">✉ ${q[1]} 封新信</span>`:"")(String(shipQuote()).match(/有 (\d+) 封新信/))}</span><b class="go">›</b></button>`}catch(e){return`<button class="tile hubc ha" data-go="#/adventure"><span class="hi">⛵</span><span class="tx"><span class="t">雲河星槎</span><span class="s" id="hLegend">船頭、下船、書架</span></span><b class="go">›</b></button>`}}


/* 意見回饋 709（開發者 11/6）：星槎頁的入口各開一頁滿版水墨圖，圖上再點下去就到棋盤。先做千秋殘局：石桌特寫，三團金色星光＝這一站的三題 */
const SHIP_PZ_SPOT=[[17,42],[80,37],[64,85]];
/* 石桌棋盤在圖上的位置（圖 768×1376；路 u＝0..8、橫線 v＝0..9，黑方底線 v＝0），照 page_canju.webp 量的 */
const PZ_TL=[320,582],PZ_TR=[697,737],PZ_BL=[65,853],PZ_BR=[453,1065];
const pzP=(u,v)=>{const s=u/8,t=v/9;return[(1-s)*(1-t)*PZ_TL[0]+s*(1-t)*PZ_TR[0]+(1-s)*t*PZ_BL[0]+s*t*PZ_BR[0],(1-s)*(1-t)*PZ_TL[1]+s*(1-t)*PZ_TR[1]+(1-s)*t*PZ_BL[1]+s*t*PZ_BR[1]]};
const PZ_CN={r:"車",n:"馬",b:"象",a:"士",k:"將",c:"砲",p:"卒",R:"俥",N:"傌",B:"相",A:"仕",K:"帥",C:"炮",P:"兵"};
function pzSvg(fen){const L=[];String(fen||"").split(" ")[0].split("/").forEach((row,v)=>{let u=0;for(const c of row){if(/\d/.test(c)){u+=+c;continue}if(PZ_CN[c])L.push([u,v,c]);u++}});
  L.sort((a,b)=>pzP(a[0],a[1])[1]-pzP(b[0],b[1])[1]);const rx=21.4,ry=17.6,th=6.7;
  return L.map(([u,v,c])=>{const[x,y]=pzP(u,v),red=c===c.toUpperCase(),sd=red?"#78100a":"#080808",tp=red?"#d6221a":"#1d1d1d",hi=red?"#ff7864":"#787878",tc=red?"#ffecd6":"#e8e8e4";
    return`<g><ellipse cx="${x+4.6}" cy="${y+th+4.6}" rx="${rx}" ry="${ry}" fill="rgba(0,0,0,.28)"/><ellipse cx="${x}" cy="${y+th}" rx="${rx}" ry="${ry}" fill="${sd}"/><rect x="${x-rx}" y="${y}" width="${rx*2}" height="${th}" fill="${sd}"/><ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${tp}" stroke="${sd}" stroke-width="2"/><ellipse cx="${x}" cy="${y}" rx="${rx*.78}" ry="${ry*.78}" fill="none" stroke="${hi}" stroke-width="1.4"/><text x="${x}" y="${y+8.6}" text-anchor="middle" font-size="25" font-family="var(--serif),serif" font-weight="700" fill="${tc}">${PZ_CN[c]}</text></g>`}).join("")}
function ShipPz(v){setTop("♟ 千秋殘局","#/adventure");setTabs(false);v.className="view";const k=shipHere(),T=SHIP_STOP[k]||{};
  v.innerHTML=`<div class="shp-page" id="pzPage"><img src="data/shipmap/page_canju.webp" alt="星槎石桌"><svg class="pz-svg" viewBox="0 0 768 1376" preserveAspectRatio="xMidYMid meet" id="pzSvg"></svg><div class="shp-cap"><b>♟ 千秋殘局・${esc(shipShort(k))}</b><small id="pzCap">${esc(T.place||"")}</small></div><div id="pzSpots"></div><button class="btn pz-go" id="pzGo" style="display:none">♟ 開始下棋</button></div><div id="pzMore"></div>`;
  shipBank().then(()=>{if(!v.isConnected)return;const Lz=(shipPuzzles(k)||[]).slice(0,3),B=SHIP_BANK.D.byId,sp=v.querySelector("#pzSpots"),more=v.querySelector("#pzMore"),svg=v.querySelector("#pzSvg"),cap=v.querySelector("#pzCap"),go=v.querySelector("#pzGo");
    if(!Lz.length){sp.innerHTML=`<div class="shp-pznone">🧩 這一站的千秋殘局還在準備中</div>`;return}
    sp.innerHTML=Lz.map((id,i)=>{const P=B[id]||{},r=shipRec(k,id),nm=(typeof shipSlotName==="function"?shipSlotName(k,i,P):"")||`第 ${i+1} 題`,[x,y]=SHIP_PZ_SPOT[i]||[50,50];
      return`<button class="shp-spot${r?" ok":""}" data-i="${i}" style="left:${x}%;top:${y}%"><b>${r?(r.h?"◐":"●"):"★"} 第 ${i+1} 題</b><small>${esc(String(nm).replace(/^第\s*\d+\s*題・?/,""))}</small></button>`}).join("");
    let cur=-1;const pick=i=>{cur=i;const P=B[Lz[i]]||{};svg.style.opacity=0;setTimeout(()=>{svg.innerHTML=pzSvg(P.fen);svg.style.opacity=1},160);
      sp.querySelectorAll(".shp-spot").forEach(b=>b.classList.toggle("sel",+b.dataset.i===i));cap.textContent=`第 ${i+1} 題・${String(P.task||P.t||"").split("：")[0]}${P.side==="b"?"・黑方先走":"・紅方先走"}`;go.style.display=""};
    sp.querySelectorAll(".shp-spot").forEach(b=>b.onclick=()=>{vibrate(5);pick(+b.dataset.i)});
    go.onclick=()=>{if(cur<0)return;vibrate(8);const pg=v.querySelector("#pzPage");pg.classList.add("zoom");setTimeout(()=>{location.hash=shipHref(k,Lz[cur])},430)};
    /* 意見回饋 762 第零版：3 題都解開了＝不再自動擺回第 1 題；標「✅ 學會了」，主按鈕換「⛵ 起航」，點星光才擺那一題、多一顆「重溫」 */
    if(Lz.every(id=>shipRec(k,id))&&typeof shipMoreOn==="function"&&shipMoreOn())shipMorePz(v,k,Lz,B);   /* 意見回饋 762 第一版：學會以後換成石桌續局（07o-shipmore.js） */
    else if(Lz.every(id=>shipRec(k,id))){const nxS=shipSailTo(k),hb=v.querySelector(".shp-cap b"),bs="pointer-events:auto;width:auto;margin:0;padding:12px 20px;font-size:16px;border-radius:99px;box-shadow:0 4px 16px rgba(0,0,0,.45)",w=document.createElement("div");
      if(hb)hb.textContent+="・✅ 學會了";cap.textContent="這站的 3 題都解開了・點星光可以重溫";go.remove();
      w.style.cssText="position:absolute;left:0;right:0;bottom:4%;display:flex;justify-content:center;gap:10px;z-index:3;pointer-events:none";
      w.innerHTML=`<button class="btn ghost" id="pzRe" style="${bs};display:none">♟ 重溫</button><button class="btn" id="pzSail" style="${bs}">${nxS?"⛵ 起航去"+esc(shipShort(nxS)):"‹ 回星槎"}</button>`;v.querySelector("#pzPage").append(w);
      const re=w.querySelector("#pzRe");sp.querySelectorAll(".shp-spot").forEach(b=>b.addEventListener("click",()=>{re.style.display="";re.textContent="♟ 重溫第 "+(+b.dataset.i+1)+" 題"}));
      re.onclick=()=>go.onclick();w.querySelector("#pzSail").onclick=()=>{vibrate(8);location.hash=nxS?"#/ship/sail":"#/adventure"}}
    else pick(Math.max(0,Lz.findIndex(id=>!shipRec(k,id))));
    const X=(typeof shipExtras==="function"?shipExtras(k):[])||[];
    more.innerHTML=`<p class="muted shp-pzhint">點石桌旁的星光看那一題，石桌上就換成那一盤；${Lz.every(id=>shipRec(k,id))?"再按下面的按鈕":"再按「開始下棋」"}・● 自己解開　◐ 用過提示　★ 還沒解</p>`+(X.length?`<div class="items" style="padding:0">${X.map(id=>{const P=B[id]||{};return`<button class="item" data-pz="${esc(id)}"><span class="lb">🔥</span><span class="tx"><b>選做・${esc(String((P.src||{}).title||"").replace(/^.*・/,""))}</b><span>不計點、不給修為</span></span><span class="muted">›</span></button>`}).join("")}</div>`:"");
    more.querySelectorAll("[data-pz]").forEach(b=>b.onclick=()=>{vibrate(5);location.hash=shipHref(k,b.dataset.pz)})})}

/* 意見回饋 709（開發者 11/6）：星槎其他入口也各開一頁滿版水墨圖（圖 768×1376，規格 tools/art_shippages.json），圖上的金色入口位置用百分比，照圖量的。
   右下角有固定的小助手圖示，入口不放那裡。shpPage(圖, 標題, 小字, 入口[[id,左%,上%,大字,小字,class]], 疊在圖上的 HTML) */
function shpPage(img,cap,sub,spots,over){return`<div class="shp-page cq"><img src="data/shipmap/${img}.webp" alt="">${over||""}<div class="shp-cap"><b>${cap}</b><small>${sub}</small></div>${spots.map(([id,x,y,b,sm,cl])=>`<button class="shp-spot${cl?" "+cl:""}" id="${id}" style="left:${x}%;top:${y}%"><b>${b}</b>${sm?`<small>${sm}</small>`:""}</button>`).join("")}</div>`}
const shpOn=(v,q,fn)=>{const e=v.querySelector(q);if(e)e.onclick=()=>{vibrate(5);fn()}};
/* 入口按鈕靠圖邊時往裡推，不超出圖（字長短不一，例如擂主名字） */
function shpFit(v){requestAnimationFrame(()=>{const P=v.querySelector(".shp-page.cq");if(!P||P.dataset.hmc)return;const R=P.getBoundingClientRect();if(!R.width)return;P.querySelectorAll(".shp-spot,.po-sight").forEach(b=>{const r=b.getBoundingClientRect(),m=6;let d=0;if(r.left<R.left+m)d=R.left+m-r.left;else if(r.right>R.right-m)d=R.right-m-r.right;if(d)b.style.left="calc("+b.style.left+" + "+Math.round(d)+"px)"})})}
/* 棋話一頁 #/ship/lesson（意見回饋 732：原名「這站棋理」）：船頭、說書人的燈籠和木牌；木牌上寫棋理卡，三團星光＝看示範棋局、這一朝的棋、讀這一章 */
function ShipLesson(v){setTop("📘 棋話一頁","#/adventure");setTabs(false);v.className="view";const k=shipHere(),_ls=(()=>{try{const L=store.get("shipLessonSeen",{})||{};if(!L[k]){L[k]=Date.now();store.set("shipLessonSeen",L)}}catch(e){}})(),T=SHIP_STOP[k]||{},Ls=SHIP_LESSON[k]||{},ap=shipAppr(),lrn=shipLearned(k),H=typeof HIST!=="undefined"?HIST[k]:null,ch=SHIP_PLAN[k]&&SHIP_PLAN[k].ch,Wo=shipWho(k,Ls.openBy),Wd=shipWho(k,Ls.doneBy);
  const board=`<div class="shl-board"><b>${esc(Ls.t||T.img||"")}${lrn?" ✅":""}</b>${(Ls.x||[]).map(x=>`<p>${esc(x)}</p>`).join("")}${Ls.k?`<p class="shl-k">口訣：${esc(Ls.k)}</p>`:""}</div>`;
  const sp=[["slDemo",27,77,"▶ 看示範棋局","同棋理的古譜殘局"]];if(H)sp.push(["slHist",73,77,"📜 這一朝的棋",H.t]);if(ch)sp.push(["slRead",50,88,"📖 讀這一章","《雲河七星》第"+CNUM(ch)+"章"+((store.get("shipRead",{})||{})[k]?"・讀過了":"")]);
  v.innerHTML=shpPage("page_lesson","📘 棋話一頁・"+esc(shipShort(k)),esc(T.place||"")+(lrn?"・✅ 學會了":""),sp,board)+`<div class="pad shl-more">
    ${!ap&&Ls.open?`<div class="card port-say"><img src="${Wo.img}" alt="" onerror="this.remove()"><p><b>${esc(Wo.n)}</b>「${esc(Ls.open)}」</p></div>`:""}
    ${lrn&&!ap&&Ls.done?`<div class="card port-say"><img src="${Wd.img}" alt="" onerror="this.remove()"><p><b>${esc(Wd.n)}</b>「${esc(Ls.done)}」</p></div>`:""}
    ${(L=>L?`<div class="card shl-lore"><b>🌌 星槎小知識・${esc(L[0])}</b><p>${esc(L[1])}</p></div>`:"")(SHIP_LORE[Math.max(0,SHIP_ROUTE.indexOf(k))%SHIP_LORE.length])}
    ${SHIP_OLD.has(k)?'<p class="muted shp-old">這一朝還沒有今天的象棋；星槎石桌上的千秋殘局，題目出自明清古譜。</p>':""}
    <p class="muted shp-pzhint">${lrn?"✅ 這站的 3 題千秋殘局都解開了":"千秋殘局 3 題都自己解開，就算學會這一頁棋話"}</p>${typeof shipMoreLesson==="function"?shipMoreLesson(k):""}
    ${lrn&&typeof qpCardHTML==="function"?qpCardHTML(k):""}
    ${lrn&&Ls.theme?`<button class="lk" id="slTheme">想多練？主題訓練・${esc(Ls.theme)} 10 題 ›</button>`:""}</div>`;
  shpOn(v,"#slDemo",()=>shipDemo(k));shpOn(v,"#slHist",()=>{if(typeof histCard==="function")histCard(k)});shpOn(v,"#slRead",()=>{SHIP_RD_BACK="#/ship/lesson";location.hash="#/ship/read/"+k});
  shpOn(v,"#slTheme",()=>{location.hash="#/theme/"+encodeURIComponent(Ls.theme)});shpOn(v,"#qpReplay",()=>{if(typeof qpPlay==="function")qpPlay(k)});shpFit(v);
  try{if(typeof lsnShipAdd==="function")lsnShipAdd(v,k)}catch(e){}   /* ChatGPT 改善單 I01：有棋理體驗的站（07z7-lesson.js LSN_SET）多一顆「動手試這一頁棋理」 */
  return{}}
/* 書架 #/ship/shelf：船艙書架特寫，三本書＝石桌往事、紙譜新局（第一集都過了才開）、雲河七星合集 */
function ShipShelf(v){setTop("📚 書架","#/adventure");setTabs(false);v.className="view";const L=legendState(),S=jStars(),J=jStages(),J2=jStages2(),b1=book1Done(),p1=J.filter(x=>S[x.id]).length,p2=J2.filter(x=>S[x.id]).length;
  v.innerHTML=shpPage("page_shelf","📚 船艙書架","說書人講的故事",[
    ["sb1",SHELF_SPOT[0][0],SHELF_SPOT[0][1],"🪨 第一集・石桌往事","讀到第"+CNUM(L.n)+"回・"+esc(ROAD_NAME)+" "+p1+"／"+J.length+" 關"],
    ["sb2",SHELF_SPOT[1][0],SHELF_SPOT[1][1],(b1?"📜":"🔒")+" 第二集・紙譜新局",b1?"明朝隆慶・過了 "+p2+"／"+J2.length+" 關":"第一集 "+J.length+" 關都過了才會打開",b1?"":"lk"],
    ["sb3",SHELF_SPOT[2][0],SHELF_SPOT[2][1],"🌌 雲河七星・合集","第 1～14 章・全書"]]);
  shpOn(v,"#sb1",()=>{location.hash="#/shelf/1"});shpOn(v,"#sb2",()=>{if(!book1Done()&&!DEVMODE())return toast("🔒 讀完第一集、36 關都過了，第二集就會打開");location.hash="#/shelf/2"});
  shpOn(v,"#sb3",()=>{SHIP_RD_BACK="#/ship/shelf";location.hash="#/ship/read"});shpFit(v);return{}}
const SHELF_SPOT=[[31,36],[66,57],[31,80]];
/* 行囊 #/ship/bag：羅盤＝航行難度、包袱＝棋童資料、木箱＝存檔與讀檔（意見回饋 735：人物與年表只留在《石桌往事》書末附錄，卷軸不再是入口；BAG_SPOT[1] 現在放 📚 千秋大百科 #/codex，07i-codex.js） */
function ShipBag(v){setTop("🎒 行囊","#/adventure");setTabs(false);v.className="view";const B=BAG_SPOT;
  v.innerHTML=shpPage("page_bag","🎒 行囊","旅途帶著走的東西",[["bgDiff",B[0][0],B[0][1],"🎚 航行難度",esc(diffOf().n)+"・隨時可換"],["bgMe",B[2][0],B[2][1],"🎒 棋童資料","棋盤・棋譜・棋友"],...(typeof Codex==="function"?[["bgCx",B[1][0],B[1][1],"📚 千秋大百科","所有收藏的總目錄"]]:[]),["bgSave",B[3][0],B[3][1],"💾 存檔與讀檔",curSlot()?"第 "+curSlot()+" 格":"3 格存檔"],...(typeof qqPending==="function"&&qqPending().length?[["bgQq",50,60,"🌀 雲河怪事",qqPending().length+" 件還沒了結","hot"]]:[])]);
  shpOn(v,"#bgDiff",()=>diffSheet(()=>{if(v.isConnected)ShipBag(v)}));shpOn(v,"#bgMe",()=>{location.hash="#/profile"});shpOn(v,"#bgSave",()=>saveSheet());shpOn(v,"#bgQq",()=>qqPendingSheet());shpOn(v,"#bgCx",()=>{location.hash="#/codex"});shpFit(v);return{}}   /* 千秋穿梭突發事件（07h-qqev.js）：押走、扣著的東西 */
const BAG_SPOT=[[28,50],[73,47],[26,77],[73,71]];
/* 意見回饋 856（開發者 11/10「一直按起航就破關」）→ 開發者「只解千秋殘局太簡單，1 小時就破關」→ Gemini 66 定案「星槎歷練清單 5 選 3」：
   航線最前面那一站（第 3 站起）列 5 件事，完成 3 件才能起航：解局（這站 2 題千秋殘局）、對弈（這一朝贏 1 盤，或下滿 3 盤 20 手以上的棋）、
   聽書（讀這一站的故事一章，並解開章末那一局）、打擂（這一朝的擂主：贏，或撐過 30 手）、修為（到這站的建議修為）。
   第 1 站船艙、第 2 站家鄉看過《棋話》那一頁就能走；已經停靠的站不收回；說書人的學徒不設門檻；終章照舊要 13 站都學會。
   文案（開發者選 Gemini 第 1、2、6 案）：起航頁「【本站歷練】完成 3 件事即可起航（n/3）」、沒達成按起航時旅伴「等一下啦，我們還沒逛完這裡呢！」、3 件都完成時旅伴「行李收好啦！星槎準備出發！」 */
const SAIL_GATE_ON=true,SAIL_NEED=3;
function shipGameDone(st){try{if(!st||st.practice||!st.moves||!st.result)return;const e=store.get("era","classic"),n=st.moves.length,win=!!(st.human&&st.result.w&&st.result.w===st.human),
  up=(key,f)=>{const G=store.get(key,{})||{};G[e]=f(G[e]);store.set(key,G)};
  if(n>=20)up("shipGames",x=>(x|0)+1);if(win)up("shipWins",x=>(x|0)+1);if(st.arena&&(win||n>=30))up("shipArena",()=>Date.now())}catch(x){}}
function shipFront(){const D=shipDockList();return D&&D.length?D[D.length-1]:null}
function shipBuddy(){try{const c=myChar(),W=c&&WX_CHARS[c];return W?(W.nk||W.n):"小帥"}catch(e){return"小帥"}}
function shipTasks(k){const S=(store.get("shipSolved",{})||{})[k]||{},sv=Object.keys(S).length,G=(store.get("shipGames",{})||{})[k]|0,Wn=(store.get("shipWins",{})||{})[k]|0,
  Pl=SHIP_PLAN[k]||{},sid=Pl.story?(typeof Pl.story==="function"?Pl.story(shipPiece(k)):Pl.story):null,rd=!!(store.get("shipRead",{})||{})[k],sd=!!(sid&&(S[sid]||(store.get("shipGal",{})||{})[sid])),
  ar=!!(store.get("shipArena",{})||{})[k],lv=SHIP_LV[shipOrder().indexOf(k)]||0;let L=1;try{L=xpInfo().L|0}catch(e){}
  return[{ic:"♟",t:"解局",d:"解開這一站 2 題千秋殘局",p:Math.min(sv,2)+"/2",ok:sv>=2,go:"#/ship/pz"},
    {ic:"🌳",t:"對弈",d:"在這一朝贏 1 盤棋，或下滿 3 盤（20 手以上，輸贏都算）",p:Wn?"贏了":Math.min(G,3)+"/3 盤",ok:Wn>=1||G>=3,go:"#/journey/park"},
    {ic:"📖",t:"聽書",d:"讀這一站的故事一章，並解開章末那一局",p:((rd?1:0)+(sd?1:0))+"/2",ok:rd&&sd,go:"#/ship/read/"+k},
    {ic:"🏯",t:"打擂",d:"挑戰這一朝的擂主：贏，或撐過 30 手",p:ar?"✓":"0/1",ok:ar,go:"#/arena"},
    {ic:"⭐",t:"修為",d:"修為到 Lv "+lv+"（下棋、解題都會加）",p:"Lv "+Math.min(L,lv)+"/"+lv,ok:L>=lv,go:null}]}
function shipSailNeed(){try{if(!SAIL_GATE_ON||shipAppr()||!shipNextStop())return null;const k=shipFront();if(!k)return null;const i=shipOrder().indexOf(k);
  if(i<=1)return(store.get("shipLessonSeen",{})||{})[k]||Object.keys((store.get("shipSolved",{})||{})[k]||{}).length?null:{k,first:true};
  const T=shipTasks(k),n=T.filter(x=>x.ok).length;return n>=SAIL_NEED?null:{k,T,n}}catch(e){return null}}
function shipTaskList(N,go){return'<ul style="list-style:none;margin:6px 0 0;padding:0">'+N.T.map((x,i)=>'<li style="display:flex;gap:6px;align-items:baseline;padding:3px 0;'+(x.ok?'opacity:.7':'')+'"><span>'+(x.ok?"✅":"⬜")+'</span><span style="flex:1"><b>'+x.ic+" "+x.t+'</b>　'+esc(x.d)+'</span><span class="muted" style="white-space:nowrap">'+esc(x.p)+'</span>'+(go&&!x.ok&&x.go?'<button class="btn ghost" data-sg="'+i+'" style="padding:2px 10px;font-size:13px">去</button>':'')+'</li>').join("")+'</ul>'}
function shipGoalHTML(N){if(!N)return"";const nm=esc(shipShort(N.k));
  if(N.first)return'<p class="shs-goal"><b>【本站目標】</b>翻開'+nm+'的《棋話》，看一頁棋理（0/1）</p>';
  return'<div class="shs-goal"><b>【本站歷練】完成 '+SAIL_NEED+' 件事即可起航（'+N.n+'/'+SAIL_NEED+'）</b><br><span class="muted">挑選你喜歡的任務，下棋、解題、看故事都可以喔！</span><br>'+N.T.map(x=>(x.ok?"✅":"⬜")+x.t).join("　")+'<br><span class="muted">按「起航」看每一件怎麼做</span></div>'}
function shipReadyHTML(){try{const k=shipFront();if(!k||shipAppr()||shipOrder().indexOf(k)<2||shipSailNeed())return"";return'<p class="shp-say">'+esc(shipBuddy())+'：「行李收好啦！星槎準備出發！」</p><p>我們已經在這裡大顯身手了，快按起航鍵吧！</p>'}catch(e){return""}}
function shipGateSay(N){vibrate([20,40,20]);const here=shipHere()===N.k;sheet(N.first?"⚓ 船錨卡住了":"⛵ 還不能起航",b=>{
  b.innerHTML=(N.first?'<p class="shp-say">說書人：「先翻開這一站的《棋話》看一頁，船錨就拉得起來。」</p>'+shipGoalHTML(N)+(here?'<div class="row" style="gap:8px;margin-top:10px"><button class="btn" id="sgL">📘 看《棋話》</button></div>':'')
    :'<p class="shp-say">'+esc(shipBuddy())+'：「等一下啦，我們還沒逛完這裡呢！」</p><p>清單上還有好多好玩的事，陪我再解一題殘局嘛。</p><p><b>【本站歷練】（'+N.n+'/'+SAIL_NEED+'）</b></p>'+shipTaskList(N,here))+
    (here?"":'<p class="muted">先在航線上點回「'+esc(shipShort(N.k))+'」那一站。</p>');
  const e=b.querySelector("#sgL");if(e)e.onclick=()=>{closeSheet();location.hash="#/ship/lesson"};
  b.querySelectorAll("[data-sg]").forEach(x=>x.onclick=()=>{const t=N.T[+x.dataset.sg];closeSheet();if(t&&t.go)location.hash=t.go})})}
/* 起航 #/ship/sail：船尾舵與帆；天上寫下一站（說書人預告、棋理、這一朝的棋、建議修為），舵旁的星光＝起航。十三站都停靠過＝旅程終點卡 */
function ShipSail(v){setTop("⛵ 起航","#/adventure");setTabs(false);v.className="view";const ap=shipAppr(),k=shipHere(),nx=ap?null:shipNextStop(),allIn=!ap&&!nx&&!!shipDockList(),I=xpInfo(),[sx,sy]=SAIL_SPOT;
  let card,sp=[],cap,sub;
  if(nx){const Ln=SHIP_LESSON[nx]||{},Hn=typeof HIST!=="undefined"?HIST[nx]:null,lvH=SHIP_LV[shipOrder().indexOf(nx)]||0;cap="⛵ 下一站・"+esc(shipShort(nx));sub="現在停靠："+esc(shipShort(k));
    card=`<b>${esc(shipShort(nx))}・${esc(SHIP_STOP[nx].place)}</b>${Ln.pre?`<p class="shp-say">說書人：「${esc(Ln.pre)}」</p>`:""}<p>📘 棋理：${esc(Ln.t||"")}${Hn?`<br>📜 這一朝的棋：${esc(Hn.t)}`:""}</p>${lvH?`<p class="muted">建議修為 Lv ${lvH}（你現在 Lv ${I.L}；只是建議，隨時都能開）</p>`:""}`;
    const N=shipSailNeed();if(N)card+=shipGoalHTML(N);else card+=shipReadyHTML();sp=[["ssGo",sx,sy,"⛵ 起航",N?"還差一步・"+esc(shipShort(nx)):"開往"+esc(shipShort(nx)),N?"":"hot"]]}
  else if(allIn){cap="🏁 旅程終點";sub="十三站都停靠過了";card=`<b>${esc(SHIP_END.t)}</b><p>${SHIP_END.x.map(esc).join("<br>")}</p>`+(shipFinaleOpen()?"":`<p class="shp-say">說書人：「雲河到了盡頭，但好多渡口走馬看花呢。」</p><p>點航線回到舊朝代，把沒解完的殘局補齊，才能看見真正的終局！</p>`);sp=[["ssDb",sx,sy,"🏆 看特級大師對局","棋譜"],...(typeof chdEndSpot==="function"?chdEndSpot():[])]}   /* 意見回饋 774 破關卡（07q-chardiff.js） */
  else{cap="⛵ 起航";sub=ap?"說書人的學徒":"";card=ap?`<b>📜 十三站都能去</b><p>說書人的學徒不用照順序起航；回星槎頁，在航線上點想去的那一站。</p>`:`<b>還沒選角色</b><p>回星槎頁，從頭開始這段旅程。</p>`;sp=[["ssBack",sx,sy,"🌌 看航線","回星槎頁"]]}
  if(shipFinaleOpen()){const fd=shipLearned("finale");sp.push(["ssFin",FIN_SPOT[0],FIN_SPOT[1],"♟ 千秋歸位",fd?"✅ 石桌已補全":"終章・七人共局",fd?"":"hot"]);card+=fd?`<p class="muted">✅ 石桌已補全：七顆棋子都歸位了。</p>`:`<p class="shp-say">說書人：「歸位以前，再陪老朽看一局？」</p>`}   /* 終章（元件 C）：13 站都學會才出現 */
  v.innerHTML=shpPage("page_sail",cap,sub,sp,`<div class="shs-card">${card}</div>`);
  shpOn(v,"#ssFin",()=>{location.hash="#/ship/lv/finale/xl-finale"});shpOn(v,"#ssGo",()=>shipSailGo(()=>goUp("#/adventure")));shpOn(v,"#ssDb",()=>{location.hash="#/db"});shpOn(v,"#ssBack",()=>goUp("#/adventure"));if(allIn&&typeof chdEndBind==="function")chdEndBind(v);shpFit(v);return{}}
const SAIL_SPOT=[52,72],FIN_SPOT=[52,86];
const SHIP_PG={lesson:ShipLesson,shelf:ShipShelf,bag:ShipBag,sail:ShipSail};

/* 開發者 11/7：星槎主畫面「假 3D 視差」——原圖切成四層（art/shipmap/layers：雲海星河 bg、船身＋碼頭 ship、帆桅旗燈 fg、金色星光 star），
   手指拖動、滑鼠移動、手機傾斜（按「🌀 立體」才開陀螺儀，iOS 才不會一進來就跳權限）時各層位移不同，放開慢慢回正；
   熱點包在 .shp-hl 裡跟著船身層走；圖層沒載到就留原本的單張圖；有設 prefers-reduced-motion 就不切層、不動 */
const SHP_PX=[["star",1.25],["mote",1.1]],SHP_PXM=12,SHP_SHIPD=.3,SPX={el:null,ls:[],hl:null,tx:0,ty:0,cx:0,cy:0,k:.06,drag:null,gyro:false,g0:null};
/* 意見回饋 748／757（開發者 11/8）：航行感＋立體改用 WebGL「兩層深度位移」（素材由 tools/shipmap_layers/depth.py 產生）——
   背景 sm_bg（船挖掉後鏡射補洞）＋船層 sm_ship（船身、碼頭、繩、帆桅旗燈合成一層），船層照深度圖 sm_depth 逐像素位移：桅杆越高位移越大、
   船身慢慢起伏搖擺、桅頂跟著橫搖；帆桅和船身不再分層，所以沒有接縫、灰影、疊影。雲霧帶往後流、船邊雲浪也畫在同一支著色器裡。
   熱點 .shp-hl 每格套上跟船層一樣的位移和轉動；金色星光、光點仍用 DOM 疊在最上面。WebGL 不能用或圖載不到就留原本的單張圖；
   prefers-reduced-motion 時 shpPxHtml 不輸出，完全不動；離開這頁迴圈自己停並釋放 WebGL */
const SHP_MOTE=[[78,12,0],[95,32,2.6],[67,7,5.1],[98,50,1.3],[54,21,3.9],[91,68,6.2]];
function shpPxHtml(){if(matchMedia("(prefers-reduced-motion: reduce)").matches)return"";
  const dots=SHP_MOTE.map(([x,y,d])=>`<i class="px-mo" style="left:${x}%;top:${y}%;animation-delay:${d}s"></i>`).join("");
  return`<div class="shp-px" aria-hidden="true"><canvas class="px-gl"></canvas><div class="px-fl"><img class="px-L px-star" data-k="star" src="data/shipmap/layers/sm_star.webp" alt="" draggable="false"></div><div class="px-D" data-k="mote">${dots}</div></div>`}
function shpPxApply(){const t=d=>`translate3d(${(d*SHP_PXM*SPX.cx).toFixed(2)}px,${(d*SHP_PXM*SPX.cy).toFixed(2)}px,0)`;for(const[i,d]of SPX.ls)i.style.transform=t(d)}
function shpPxRun(){}   /* 動畫迴圈在 shpPx 裡一直跑（每格讀 SPX.tx／ty），這裡不用另外啟動 */
const SHP_VS="attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5)*vec2(896.,1200.);gl_Position=vec4(a,0.,1.);}";
const SHP_FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D A,B,Dp,Mi,Mf;uniform vec2 par,roll;uniform float bob,rot,t;varying vec2 v;
const vec2 S=vec2(896.,1200.),C=vec2(448.,744.),E1=vec2(-.594,.805),E2=vec2(-.805,-.594);
vec2 mir(vec2 u){u=abs(u);return 1.-abs(1.-u);}
float dep(vec2 p){return texture2D(Dp,clamp(p/S,0.,1.)).r*1.6-.6;}
vec2 off(float d,vec2 p){vec2 q=p-C;float c=cos(rot),s=sin(rot);return d*par+vec2(0.,bob)+vec2(c*q.x-s*q.y,s*q.x+c*q.y)-q+max(d-.3,0.)/.6*roll;}
void main(){vec2 p=v;
  vec3 col=texture2D(A,mir((p-(-.6+.25*p.y/S.y)*par)/S)).rgb;
  vec2 q=p+.25*par-S*.5,r=vec2(dot(q,E1),dot(q,E2))/1658.;
  col=mix(col,vec3(.275,.282,.306),texture2D(Mi,r-vec2(t/110.,0.)).a*.9);
  col=mix(col,vec3(1.),texture2D(Mf,r+vec2(.37-t/62.,.21)).a*.85);
  vec2 sp=p-off(dep(p),p);sp=p-off(dep(sp),p);
  float wk=texture2D(Dp,clamp(sp/S,0.,1.)).g*smoothstep(.04,.45,texture2D(Mf,r*2.3+vec2(-t/13.,.5)).a);
  col=mix(col,vec3(1.),wk*.8);
  vec4 b=texture2D(B,mir(sp/S));gl_FragColor=vec4(mix(col,b.rgb,b.a),1.);}`;
/* 意見回饋 760（11/8）：iPhone 上船頭、帆一帶破圖，先關掉 WebGL 立體、退回原本的單張圖，修好再打開 */
const SHP_GL_ON=true;   /* 意見回饋 764：開發者手機測過，預設打開 */
/* 意見回饋 760 查到的原因：1511 版沿用舊檔名 sm_bg／sm_ship，手機快取（xqlab-look）裡還是 11/7 分層版的舊圖（960x1264、船層沒有帆桅），
   預載在背景換新以前星槎頁就先用了舊圖，帆桅那塊變成舊背景的模糊補洞。修法：新素材改名 sm2_*（手機裡不可能有舊的）、載入後檢查尺寸、
   第一格用靜止姿勢畫一次跟原圖比對幾個點（舊圖、轉色、精度不對都會對不上），不對就退回單張圖。
   測試開關：SHP_GL_ON 仍是 false；localStorage m_shpGL 為 1 才開（開發者模式時星槎頁左下有「🧪 新立體」可切換） */
const shpGlOn=()=>SHP_GL_ON,   /* 意見回饋 781（開發者）：立體效果定案，拿掉開發者切換、也不再看 m_shpGL */SHP_GLSZ=[[896,1200],[896,1200],[448,600],[512,512],[512,512]],SHP_GLPT=[[674,382],[811,217],[550,556],[742,282],[424,864],[176,936]];
function shpGlTest(gl,U,bw,bh,base){gl.uniform2f(U.par,0,0);gl.uniform2f(U.roll,0,0);gl.uniform1f(U.bob,0);gl.uniform1f(U.rot,0);gl.uniform1f(U.t,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
  const c=document.createElement("canvas");c.width=896;c.height=1200;const x=c.getContext("2d");x.drawImage(base,0,0,896,1200);const px=new Uint8Array(4);let d=0;
  for(const[a,b]of SHP_GLPT){gl.readPixels(Math.min(bw-1,Math.floor((a+.5)*bw/896)),Math.max(0,bh-1-Math.floor((b+.5)*bh/1200)),1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);const q=x.getImageData(a,b,1,1).data;d+=(Math.abs(px[0]-q[0])+Math.abs(px[1]-q[1])+Math.abs(px[2]-q[2]))/3}
  return d/SHP_GLPT.length}   /* 抽樣點都在帆、燈籠、船艙、船頭、甲板、船身的平坦處；正確時平均差 < 10，舊快取約 180 */
function shpGlDev(M){return;if(!(typeof DEVMODE==="function"&&DEVMODE())||M.querySelector(".shp-gldev"))return;const on=shpGlOn();   /* 只有開發者模式看得到：切換 WebGL 新立體（存在 m_shpGL） */
  const b=document.createElement("button");b.type="button";b.className="shp-gldev"+(on?" on":"");b.textContent=on?"🧪 新立體：開":"🧪 新立體：關";M.appendChild(b);
  b.onclick=e=>{e.stopPropagation();vibrate(5);store.set("shpGL",on?0:1);toast(on?"已關掉 WebGL 新立體":"已打開 WebGL 新立體（測試中）");route()}}
function shpGl(cv,im){if(!shpGlOn())return null;const gl=cv.getContext("webgl",{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:"low-power"});if(!gl)return null;
  const hp=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);if(!hp||hp.precision<16)return null;   /* 座標用 0～1200 像素，片段著色器沒有 highp 就不用 WebGL */
  if(im.some((m,i)=>m.naturalWidth!==SHP_GLSZ[i][0]||m.naturalHeight!==SHP_GLSZ[i][1]))return null;   /* 尺寸不對＝拿到舊圖或壞圖 */
  const sh=(ty,src)=>{const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  const pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,SHP_VS));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,SHP_FS));gl.linkProgram(pg);if(!gl.getProgramParameter(pg,gl.LINK_STATUS))throw new Error("link");gl.useProgram(pg);
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const al=gl.getAttribLocation(pg,"a");gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  ["A","B","Dp","Mi","Mf"].forEach((n,i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,i>1?gl.NONE:gl.BROWSER_DEFAULT_WEBGL);   /* 深度圖、雲霧是資料，不能被轉色 */
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,im[i]);
    const w=i>2?gl.REPEAT:gl.CLAMP_TO_EDGE;gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(gl.getUniformLocation(pg,n),i)});
  const U={};["par","roll","bob","rot","t"].forEach(n=>U[n]=gl.getUniformLocation(pg,n));return{gl,U}}
function shpPx(M){const box=M&&M.querySelector(".shp-px");if(!box)return;const cv=box.querySelector(".px-gl"),I=M.querySelector(".shp-in"),hl=M.querySelector(".shp-hl");
  shpGlDev(M);if(!shpGlOn()){box.remove();return}
  const ld=s=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src="data/shipmap/"+s+"?v="+SHP_IMGV});
  Promise.all(["layers/sm2_bg.webp","layers/sm2_ship.webp","layers/sm2_depth.png","layers/sm_mist_ink.webp","layers/sm_mist_fog.webp","ship_map.webp"].map(ld)).then(im=>{if(!M.isConnected)return;const G=shpGl(cv,im.slice(0,5));if(!G)throw 0;
    SPX.el=M;SPX.hl=hl;SPX.ls=[...box.querySelectorAll("[data-k]")].map(i=>[i,SHP_PX.find(p=>p[0]===i.dataset.k)[1]]);SPX.cx=SPX.cy=SPX.tx=SPX.ty=0;
    const{gl,U}=G,t0=performance.now();let W=0,H=0,bw=0,bh=0,first=true;const meas=()=>{W=I.clientWidth;H=I.clientHeight};meas();
    if(window.ResizeObserver)new ResizeObserver(meas).observe(I);
    const step=now=>{if(!M.isConnected||SPX.el!==M){const x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext();return}
      if(!window.ResizeObserver)meas();SPX.cx+=(SPX.tx-SPX.cx)*SPX.k;SPX.cy+=(SPX.ty-SPX.cy)*SPX.k;
      if(W){const w=Math.round(Math.min(W*(devicePixelRatio||1),1120)),h=Math.round(w*H/W);if(w!==bw||h!==bh){cv.width=bw=w;cv.height=bh=h;gl.viewport(0,0,w,h)}
        if(first){const d=shpGlTest(gl,U,bw,bh,im[5]);SPX.glDiff=d;if(!(d<40)){SPX.el=null;box.remove();if(hl)hl.style.transform="";const x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext();
          if(typeof DEVMODE==="function"&&DEVMODE())toast("🧪 新立體自我檢查沒過（差 "+Math.round(d)+"），先用單張圖");return}}
        /* 起伏 2.6px、轉動 ±0.33°、桅頂橫搖 5px（都以 CSS px 計），週期 7.4 秒；視差最大 12px，兩者相加也不會拉破（depth.py 已檢查） */
        const s=W/896,t=(now-t0)/1000,ph=t*2*Math.PI/7.4,bob=2.6*Math.sin(ph),rot=.0058*Math.sin(ph+.9),rl=5*Math.sin(ph+.5),px=SHP_PXM*SPX.cx,py=SHP_PXM*SPX.cy;
        gl.uniform2f(U.par,px/s,py/s);gl.uniform2f(U.roll,.805*rl/s,.594*rl/s);gl.uniform1f(U.bob,bob/s);gl.uniform1f(U.rot,rot);gl.uniform1f(U.t,t%88660);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        if(hl)hl.style.transform=`translate3d(${(SHP_SHIPD*px).toFixed(2)}px,${(SHP_SHIPD*py+bob).toFixed(2)}px,0) rotate(${rot.toFixed(5)}rad)`;
        shpPxApply();if(first){first=false;M.classList.add("px-on")}}
      requestAnimationFrame(step)};
    requestAnimationFrame(step);
    const cl=v=>Math.max(-1,Math.min(1,v)),go=(x,y,k)=>{SPX.tx=cl(x);SPX.ty=cl(y);SPX.k=k;shpPxRun()};
    M.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const r=M.getBoundingClientRect();go((e.clientX-r.left)/r.width*2-1,(e.clientY-r.top)/r.height*2-1,.08)});
    M.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")go(0,0,.035)});
    /* 手指拖動用被動的 touch 事件：不擋住頁面捲動，也不影響點熱點 */
    M.addEventListener("touchstart",e=>{const t=e.touches[0];SPX.drag={x:t.clientX,y:t.clientY}},{passive:true});
    M.addEventListener("touchmove",e=>{const t=e.touches[0],d=SPX.drag;if(d)go((t.clientX-d.x)/110,(t.clientY-d.y)/110,.18)},{passive:true});
    const up=()=>{SPX.drag=null;SPX.g0=null;go(0,0,.035)};M.addEventListener("touchend",up,{passive:true});M.addEventListener("touchcancel",up,{passive:true});
    shpGyroBtn(M)}).catch(()=>{box.remove();M.classList.remove("px-on");if(hl)hl.style.transform=""})}
function shpGyroOn(e){if(!SPX.el||!SPX.el.isConnected||SPX.drag)return;const b=e.beta,g=e.gamma;if(b==null||g==null)return;
  if(!SPX.g0)SPX.g0={b,g};const o=SPX.g0;o.b+=(b-o.b)*.004;o.g+=(g-o.g)*.004;   /* 基準角度慢慢跟上：拿久了自動回正 */
  SPX.tx=Math.max(-1,Math.min(1,(g-o.g)/18));SPX.ty=Math.max(-1,Math.min(1,(b-o.b)/18));SPX.k=.1;shpPxRun()}
function shpGyroSet(on){SPX.gyro=on;SPX.g0=null;store.set("shpGyro",on?1:0);
  if(on)addEventListener("deviceorientation",shpGyroOn);else{removeEventListener("deviceorientation",shpGyroOn);SPX.tx=SPX.ty=0;SPX.k=.035;shpPxRun()}
  document.querySelectorAll(".shp-gy").forEach(b=>{b.classList.toggle("on",on);b.setAttribute("aria-pressed",on?"true":"false")})}
/* 評比第 14 輪 X2（開發者 11/13 iPhone 旁白錄影，recordings.md 第 5 段）：一進星槎就跳「想要取用動作和方向」，用旁白的人突然被打斷。
   原因：上次按過「🌀 立體」（store shpGyro＝1），再進星槎時 shpGyroTry 會自動 addEventListener("deviceorientation") 試聽；
   iOS 這時如果還在「點入口」那一下的使用者手勢有效期間（圖從快取載入很快），Safari 就把它當成要權限、跳出詢問。改成：
   ① 要授權的瀏覽器（iOS：DeviceOrientationEvent.requestPermission 存在）一律不自動聽，只有使用者自己按「🌀 立體」才可能問；
   ② 按了先跳一張說明卡（modal 會用 axSay 念出來）：「接下來手機會詢問是否允許讀取動作與方向…」，按「繼續」才真的問（這一按就是使用者手勢）；同一次開啟允許過就不再跳說明；
   ③ 減少動態（prefers-reduced-motion）不出現「🌀 立體」；螢幕報讀模式（axMode）預設不出現；設定開關 shpTiltSw「📱 傾斜手機看景深」（store shpTilt：沒選過＝跟著螢幕報讀模式，1／0＝自己決定）；
   ④ 擋掉換頁那一下的穿透點擊：按鈕出現 0.7 秒內、或不是真的點（isTrusted 為 false）都不理。
   不用授權的瀏覽器（Android）照舊：上次開過就先靜靜聽一下，真的有傾斜資料才開。測試：xiangqi-lab/tools/test-ship-tilt.js */
function shpGyroAsk(){try{return typeof DeviceOrientationEvent!=="undefined"&&typeof DeviceOrientationEvent.requestPermission==="function"}catch(e){return false}}
function shpTiltPref(){let p=null;try{p=store.get("shpTilt",null)}catch(e){}if(p!=null)return!!+p;try{return!(typeof axmOn==="function"?axmOn():store.get("axMode",false))}catch(e){return true}}
function shpTiltOk(){try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return false}catch(e){}return shpTiltPref()}
function shpGyroNo(){try{toast("沒有開陀螺儀；用手指在圖上拖動也看得到立體")}catch(e){}}
function shpGyroReq(){const go=()=>shpGyroTry().then(y=>y?shpGyroSet(true):shpGyroNo());if(!shpGyroAsk()||SPX.okd)return go();
  const ask=()=>{let p;try{p=DeviceOrientationEvent.requestPermission()}catch(e){return shpGyroNo()}Promise.resolve(p).then(r=>{if(r==="granted"){SPX.okd=1;go()}else shpGyroNo()}).catch(()=>shpGyroNo())};
  modal(`<h2 style="font-size:19px">📱 傾斜手機看景深</h2><p style="line-height:1.7;margin:6px 0 0">接下來手機會詢問是否允許讀取「動作與方向」。允許後，傾斜手機就能看到星槎的前後景深；不允許也沒關係，用手指在圖上拖動一樣看得到。</p>`,[["繼續",ask],["先不要",null,true]])}
function shpGyroBtn(M){if(!("DeviceOrientationEvent"in window)||!matchMedia("(pointer: coarse)").matches||M.querySelector(".shp-gy"))return;
  if(!shpTiltOk()){if(SPX.gyro){SPX.gyro=false;removeEventListener("deviceorientation",shpGyroOn)}return}
  const t0=Date.now(),b=document.createElement("button");b.type="button";b.className="shp-gy"+(SPX.gyro?" on":"");b.textContent="🌀 立體";b.title="傾斜手機看立體";b.setAttribute("aria-label","傾斜手機看景深");b.setAttribute("aria-pressed",SPX.gyro?"true":"false");M.appendChild(b);
  b.onclick=e=>{e.stopPropagation();if(e.isTrusted===false||Date.now()-t0<700)return;vibrate(5);if(SPX.gyro)return shpGyroSet(false);shpGyroReq()};
  if(!shpGyroAsk()&&!SPX.gyro&&store.get("shpGyro",0))shpGyroTry().then(y=>{if(y&&!SPX.gyro&&b.isConnected)shpGyroSet(true)})}   /* 上次開過：只有不用授權的瀏覽器（Android）才先靜靜聽一下，真的有傾斜資料才開；iOS 一律等使用者再按 */
/* 設定頁開關（05-settings 放進「系統」或「無障礙」那一區：${typeof shpTiltRow==="function"?shpTiltRow():""}）；勾選框 id＝shpTiltSw */
function shpTiltRow(){return`<label class="row" style="justify-content:space-between;padding:8px 2px;gap:10px"><span style="min-width:0"><b>📱 傾斜手機看景深</b><br><span class="muted" style="font-size:12.5px">雲河星槎、渡口出現「🌀 立體」按鈕，按了才會詢問「動作與方向」權限；螢幕報讀模式預設不出現${store.get("shpTilt",null)==null?"（現在跟著螢幕報讀模式）":""}</span></span><input type="checkbox" class="sw" id="shpTiltSw"${shpTiltPref()?" checked":""} aria-label="傾斜手機看景深"></label>`}
try{document.addEventListener("change",e=>{const t=e.target;if(!t||t.id!=="shpTiltSw")return;const on=!!t.checked;store.set("shpTilt",on?1:0);
  if(!on){if(SPX.gyro)shpGyroSet(false);document.querySelectorAll(".shp-gy").forEach(b=>b.remove())}else if(SPX.el&&SPX.el.isConnected)shpGyroBtn(SPX.el);
  try{toast(on?"📱 傾斜手機看景深：開（到星槎按「🌀 立體」才會詢問權限）":"📱 傾斜手機看景深：關")}catch(x){}})}catch(e){}
function shpGyroTry(){return new Promise(ok=>{const f=e=>{if(e.beta==null)return;clearTimeout(t);removeEventListener("deviceorientation",f);ok(true)},
  t=setTimeout(()=>{removeEventListener("deviceorientation",f);ok(false)},1200);addEventListener("deviceorientation",f)})}   /* 電腦或沒有陀螺儀的手機收不到資料，就提示改用拖動 */

/* 意見回饋 726（開發者 11/7）：星槎圖滿版——圖（3:4）蓋滿頂欄到底部選單之間，左右多出來的裁掉；入口照圖的百分比放在 .shp-in 裡，裁到邊的入口往內推，一律看得到 */
function shpMapFit(v){requestAnimationFrame(()=>{const M=v.querySelector&&v.querySelector(".shp-map.full");if(!M||!M.isConnected)return;const I=M.querySelector(".shp-in");
  const tb=document.getElementById("tabbar"),r=M.getBoundingClientRect(),bot=tb&&tb.offsetParent!==null&&tb.getBoundingClientRect().height?tb.getBoundingClientRect().top:innerHeight;
  const W=r.width,H=Math.max(320,Math.round(bot-r.top));M.style.height=H+"px";const s=Math.max(W/896,H/1200),w=896*s,h=1200*s;
  Object.assign(I.style,{width:w+"px",height:h+"px",left:Math.round((W-w)/2)+"px",top:Math.round((H-h)/2)+"px"});
  const R=M.getBoundingClientRect(),m=8,capH=(M.querySelector(".shp-cap")||{}).offsetHeight||0;I.querySelectorAll(".shp-hs").forEach(b=>{b.style.marginLeft="";b.style.marginTop="";const q=b.getBoundingClientRect();let dx=0,dy=0;
    if(q.left<R.left+m)dx=R.left+m-q.left;else if(q.right>R.right-m)dx=R.right-m-q.right;if(q.top<R.top+capH+m)dy=R.top+capH+m-q.top;else if(q.bottom>R.bottom-m)dy=R.bottom-m-q.bottom;
    if(dx)b.style.marginLeft=Math.round(dx)+"px";if(dy)b.style.marginTop=Math.round(dy)+"px"})})}

/* ---------- 星槎頁 #/adventure ---------- */
function Voyage(v){setTop("⛵ 雲河星槎","#/");setTabs(true,"#/");v.className="view";
  const paint=()=>{const ap=shipAppr(),D=shipDocked(),k=shipHere(),T=SHIP_STOP[k],O=ap?SHIP_ROUTE:shipOrder(),I=xpInfo(),nx=ap?null:shipNextStop();
    v.innerHTML=`<div class="pad shp">
      <div class="shp-map full"><div class="shp-in"><img class="shp-base" src="data/shipmap/ship_map.webp?v=${SHP_IMGV}" alt="雲河星槎">${shpPxHtml()}<div class="px-sw px-hw"><div class="shp-hl"><button class="shp-hs" data-hs="parks" style="left:13%;top:37%">🪨 千秋石枰</button><button class="shp-hs" data-hs="lesson" style="left:80%;top:17%">📘 棋話一頁</button><button class="shp-hs${shipLearned(k)?"":" hot"}" data-hs="pz" style="left:50%;top:43%${typeof shipMoreGold==="function"?shipMoreGold(k):""}">♟ 千秋殘局${shipLearned(k)?(typeof shipMoreHs==="function"?shipMoreHs(k):" ✓"):""}</button><button class="shp-hs" data-hs="shelf" style="left:22%;top:53%">📚 書架</button><button class="shp-hs" data-hs="read" style="left:33%;top:73%">📖 讀這一章</button><button class="shp-hs" data-hs="bag" style="left:52%;top:79%">🎒 行囊</button><button class="shp-hs${shipLearned(k)&&nx?" hot":""}" data-hs="sail" style="left:17%;top:85%">⛵ 起航</button><button class="shp-hs" data-hs="port" style="left:80%;top:73%">⚓ 下船</button></div></div></div><div class="hc shp-cap"><b>⛵ ${esc(shipShort(k))}・${esc(T.place)}</b><small>🀄 Lv ${I.L}・《千秋棋話》${shipPages()}／13 頁・停靠 ${D.length}／13・🎚 ${esc(diffOf().n)}</small></div></div>
      ${ap?`<div class="card shp-ap"><b>📜 你是說書人的學徒</b><p class="muted">十三站都能去，各站的主場角色不會跟你說話。想用雲河七星的眼睛走一趟？開新的旅程會存到另一格，這段旅程不會被蓋掉。</p><button class="btn" id="spNew" style="width:100%">⛵ 選雲河七星開新旅程</button></div>`:""}
      <div class="shp-route-x" hidden>${O.map((e,i)=>{const dk=D.includes(e),on=e===k,ok=shipLearned(e),isN=e===nx;return`<button class="shp-st${dk?" dk":" lk"}${on?" on":""}${ok?" ok":""}${isN?" nx":""}" data-st="${e}"><i>${dk?esc((ARENA[e]||{}).seal||"棋"):isN?"⛵":"🔒"}</i><span>${i+1}・${esc(shipShort(e))}</span></button>`}).join("")}</div>
      ${mainDoneHTML()}<div id="spRes"></div>
    </div>`;
    const on=(q,fn)=>{const e=v.querySelector(q);if(e)e.onclick=()=>{vibrate(5);fn()}};
    if(typeof gxShipHs==="function")try{gxShipHs(v)}catch(e){}   /* 從黑洞回來以後：星槎圖上多一顆「🌌 幻譜星門」（07gx-galaxy.js） */
    /* 意見回饋 709：圖上的入口各開一頁滿版水墨圖（#/ship/lesson、pz、shelf、bag、sail）；下船、千秋石枰、讀這一章直接去 */
    v.querySelectorAll("[data-hs]").forEach(b=>b.onclick=()=>{vibrate(5);const h=b.dataset.hs;
      if({lesson:1,pz:1,shelf:1,bag:1,sail:1}[h]){location.hash="#/ship/"+h;return}
      if(h==="port"){shipPort(k);return}
      if(h==="parks"){if(typeof qqGateGo==="function")qqGateGo();else location.hash="#/journey/park";return}   /* 開發者 11/8：先播「墨滴入局＋十三星芒」過場，再到擇石門口（07s-qqgate.js） */
      if(h==="read"){if(SHIP_PLAN[k]&&SHIP_PLAN[k].ch){SHIP_RD_BACK="#/adventure";location.hash="#/ship/read/"+k}else location.hash="#/ship/shelf";return}
      const e=v.querySelector("#spRoute");if(e)e.scrollIntoView({block:"center"})});
    on("#spNew",shipNewJourney);on("#spPort",()=>shipPort(k));on("#spParks",()=>{location.hash="#/journey/park"});
    if(typeof chdHomeMark==="function")chdHomeMark(v,k);   /* 意見回饋 774 故國舊夢：家鄉那一站的「🏠 故鄉」小標記 */
    if(typeof shipWalk==="function")shipWalk(v,k);   /* 開發者 11/8：玩家角色在甲板上走到入口再開（07w-shipwalk.js） */
    shpMapFit(v);shpPx(v.querySelector(".shp-map.full"));if(!Voyage.rs){Voyage.rs=1;addEventListener("resize",()=>{const w=document.querySelector(".shp-map.full");if(w)shpMapFit(w.closest(".view")||document)})}
    v.querySelectorAll("[data-st]").forEach(b=>b.onclick=()=>{const e=b.dataset.st;if(!D.includes(e)){vibrate(8);return toast(e===nx?"⛵ 圖上的「起航」就能開往"+shipShort(e):eraLockMsg(e))}vibrate(5);if(e===k)return;shipGoTo(e,()=>{if(v.isConnected)paint()})});   /* 意見回饋 697：航線換站＝換朝代（era 跟著換），播千秋穿梭 */
    {const r=v.querySelector("#spRoute .on");if(r)try{r.scrollIntoView({block:"nearest",inline:"center"})}catch(e){}}
    mainDoneBind(v);jResume(v.querySelector("#spRes"));if(typeof v7Try==="function")v7Try(v,"ship")};   /* 七星來訪（07j-visit.js）：沒選的六位偶爾來串門子 */
  paint();return{}}

/* 意見回饋 674（開發者 11/6）：說書人在青石園（船艙）說書——每天第一次進青石園，說書人先拍醒木講一段，可以去書架聽這一回，或先下棋 */
function tellerTalk(force){try{const day=new Date().toDateString();if(!force&&store.get("tellerDay","")===day)return;store.set("tellerDay",day);const L=legendState(),done=!!L.epi;
  sheet("🪭 船艙裡的說書人",b=>{b.innerHTML=`<div class="tlr"><img src="data/actors/teller.webp" alt="" onerror="this.remove()"><div><p class="tlr-q">「${esc(shipQuote())}」</p><p class="muted">醒木一拍：${done?"「《石桌往事》講完了，今天換《紙譜新局》。」":`「今天接著講《石桌往事》第${CNUM(L.n)}回。」`}</p></div></div><button class="btn" id="tl1" style="width:100%;margin-top:10px">📖 去書架聽這一回</button><button class="btn ghost" id="tl2" style="width:100%;margin-top:8px">♟ 先下這盤棋</button>`;
    b.querySelector("#tl1").onclick=()=>{closeSheet();location.hash=done?SHELF(2):"#/shelf/1/"+L.n};   /* 意見回饋 735：直接到那一回 */b.querySelector("#tl2").onclick=()=>closeSheet()})}catch(e){}}

/* 意見回饋 683（開發者 11/6）：棋理卡的「看示範棋局」——用小棋盤一步一步播放同棋理的一題古譜殘局（正解＋對方最頑強的應法），看懂了再去解千秋殘局 */
async function shipDemo(k){let B;try{B=await shipBank()}catch(e){return toast("示範棋局載入失敗")}const id=B.demo&&B.demo[k],P=id&&B.D.byId[id];if(!P)return toast("這一站的示範棋局還在準備");
  const first=(P.line||[])[0];if(!first)return toast("這一站的示範棋局還在準備");const rest=((P.tree.o[first]||[])[0]||"").match(/.{4}/g)||[],mv=[first,...rest].slice(0,15);
  const C=window.XQCore,boards=[parseFen(String(P.fen).split(" ")[0])],lasts=[null],cns=[];for(const u of mv){const f=sqI(u.slice(0,2)),tt=sqI(u.slice(2,4)),bb=boards[boards.length-1];if(!bb[f])break;let cn="";try{cn=C?C.notate(bb,f,tt):""}catch(e){}const nb=bb.slice();nb[tt]=nb[f];nb[f]=null;boards.push(nb);lasts.push({f,t:tt});cns.push(cn)}
  const Ls=SHIP_LESSON[k]||{},src=P.src||{},flip=P.side==="b",who=P.side==="b"?"黑方":"紅方";
  sheet("▶ 示範棋局",b=>{b.innerHTML=`<p class="muted" style="text-align:center;margin:0 0 4px;line-height:1.6">📘 ${esc(Ls.t||"")}${src.book?`<br>出自《${esc(src.book)}》${src.title?"「"+esc(src.title)+"」":""}`:""}</p><p id="dmM" style="text-align:center;margin:0 0 6px;font-weight:700"></p><div id="dmB"></div><div class="pv-ctl"><button class="pill" id="dmP">◀ 上一步</button><button class="pill" id="dmG">▶ 自動播放</button><button class="pill" id="dmN">下一步 ▶</button></div><p id="dmL" style="font-size:14px;line-height:1.8;margin:8px 0 0"></p><p class="muted" style="font-size:12.5px;line-height:1.6;margin:8px 0 0">這是另一題同棋理的古譜殘局，不是這一站的千秋殘局。看懂了，再去解那 3 題。</p>`;
    const mb=Board(()=>{});b.querySelector("#dmB").append(mb.svg);let i=0,tm=null;
    const show=()=>{mb.draw(boards[i],{flip,last:lasts[i]});b.querySelector("#dmM").textContent=i?`第 ${i} 步：${cns[i-1]}${i===1?"（妙著）":""}${i===boards.length-1?"・結束":""}`:`起點・${who}先走，按「自動播放」看怎麼下`;
      b.querySelector("#dmL").innerHTML=cns.map((c,j)=>`<span style="${j===i-1?"font-weight:900;color:var(--accent)":""}">${j+1}. ${esc(c)}</span>`).join("　")};
    b.querySelector("#dmP").onclick=()=>{clearInterval(tm);i=Math.max(0,i-1);show()};b.querySelector("#dmN").onclick=()=>{clearInterval(tm);i=Math.min(boards.length-1,i+1);show()};
    b.querySelector("#dmG").onclick=()=>{clearInterval(tm);i=0;show();tm=setInterval(()=>{if(!b.isConnected||i>=boards.length-1)return clearInterval(tm);i++;show()},1100)};show()})}

/* ---------- 意見回饋 685（開發者 11/6：正文兩邊都放）：《雲河七星》正文 data/canju/yunhe-novel.json（tools/yunhe_novel_export.js 產生）----------
   #/ship/read＝船艙書架上的合集（目錄）；#/ship/read/<站>＝那一章（星槎每一站的「📖 讀這一章」也到這裡，兩邊讀同一份）；…/mark、…/after＝捲到解題卡、解題卡的下一段。
   正文的［棋局］換成一張解題卡：「♟ 解這一局」→ #/canju/s/<站>/<題號>/read，解完卡的「📖 回到第 n 章」回到下一段；「先往下讀」不解也能讀完，不擋人、不動解題點。卡上不寫著法。 */
let YUNHE_P=null,SHIP_RD_BACK=null,YUNHE_POV_P=null;
function yunheData(){return YUNHE_P||(YUNHE_P=fetch("data/canju/yunhe-novel.json").then(r=>{if(!r.ok)throw new Error("正文載入失敗（"+r.status+"）");return r.json()}).catch(e=>{YUNHE_P=null;throw e}))}
/* 意見回饋 688：依選角而不同的第一人稱故事線 data/canju/yunhe-pov.json（tools/yunhe_pov_export.js 產生）。選了雲河七星的某一位（myChar()）：他當主角的 2 章換成第一人稱整章，其他 12 章在原章後面加「我在旁邊看見的」；
   學徒、小帥舊旅程、沒選角的照舊讀原章。yunheOrig＝true 看原本（第三人稱）的版本（只存在這台裝置）。載不到這份檔就照舊顯示原章，不擋讀。 */
function yunhePov(){return YUNHE_POV_P||(YUNHE_POV_P=fetch("data/canju/yunhe-pov.json").then(r=>r.ok?r.json():null).catch(()=>null).then(x=>{if(!x)YUNHE_POV_P=null;return x}))}
const YUNHE_POV_ON=false;   /* 意見回饋 742（開發者 11/7）：不用第一人稱說故事，一律讀原版；第一人稱稿留在 yunhe-pov.json，要再開就改成 true */
function yunheMine(P){if(!YUNHE_POV_ON)return null;const me=typeof myChar==="function"?myChar():"";return me&&P&&P.chars&&P.chars[me]?P.chars[me]:null}
const yunheOrig=()=>!!store.get("yunheOrig",false);
/* 這一章照目前的設定要怎麼讀：{c 章（title、paras、marks）, pov＝1 第一人稱整章, side＝旁觀段落 or null} */
function yunheView(c,M){if(!M||yunheOrig())return{c,pov:0,side:null};const F=M.full&&M.full[c.n];if(F)return{c:{...c,title:F.title,paras:F.paras,marks:F.marks},pov:1,side:null};return{c,pov:0,side:(M.side&&M.side[c.n])||null}}
/* 意見回饋 763：重點句 data/canju/yunhe-keylines.json（main＝{章:[句子]}，pov＝{稿子裡的名字:{章:[句子]}}；tools/yunhe_keylines_check.js 檢查每句都在正文裡）。
   閱讀頁把這些句子包成 <strong class="kl">（朱紅粗體）；頁首「重點句：開／關」存在這台裝置（yunheKL，預設開）。載不到、句子找不到就照舊顯示，不報錯 */
let YUNHE_KL_P=null;
function yunheKL(){return YUNHE_KL_P||(YUNHE_KL_P=fetch("data/canju/yunhe-keylines.json").then(r=>r.ok?r.json():null).catch(()=>null).then(x=>{if(!x)YUNHE_KL_P=null;return x}))}
const yunheKLon=()=>store.get("yunheKL",true)!==false;
/* W＝原本把段落轉成 HTML 的函式（會跳脫、標名詞小辭典）；重點句裡外分段各自交給 W，所以照樣跳脫 */
function yunheKLW(W,L){if(!L||!L.length)return W;return p=>{p=String(p);const M=[];L.forEach(s=>{const j=s?p.indexOf(s):-1;if(j>=0)M.push([j,s.length])});if(!M.length)return W(p);
  M.sort((a,b)=>a[0]-b[0]);let o="",k=0;for(const[j,n]of M){if(j<k)continue;if(j>k)o+=W(p.slice(k,j));o+='<strong class="kl">'+W(p.slice(j,j+n))+"</strong>";k=j+n}return o+(k<p.length?W(p.slice(k)):"")}}
/* 意見回饋 728：《雲河七星》合集的章節插畫。[原版第幾段之前, 圖檔, 圖說]；第一人稱版段數不同，照比例換算位置 */
const YUNHE_PICS={classic:[[3,"ch01_1","齊轍跌進渭水，星槎上伸下一隻溫暖的手"],[58,"ch01_2","七碗熱茶：七個孩子第一次見面"],[152,"ch01_3","石桌邊的一小段刻痕，泛起極淡的微光"]],
  qin:[[2,"ch02_1","黃土坡上，秦直道正一夯一夯鋪開"],[64,"ch02_2","齊轍削木楔，小梅抱著木板蹲在一旁"],[119,"ch02_3","腰牌擱在掌心，齊轍重新看棋盤"]],
  han:[[37,"ch03_1","風沙撲來，驚馬在乾河道邊停住"],[85,"ch03_2","小梅按住桌沿，等心裡的急躁過去"],[101,"ch03_3","紅柳旁的窄門前，老驛騎替馬拍沙"]],
  sanguo:[[27,"ch04_1","江煙裡，燕子替人拾起散落的博棋和竹箸"],[46,"ch04_2","船樓上，方庭望見舉七星旗的小道童"],[98,"ch04_3","方庭按著金鎖，看清桌上的牽制"]],
  weijin:[[44,"ch05_1","雨後溪漲，對岸竹蔭下有人擺著博局"],[89,"ch05_2","燕子把白披帛搭在發冷的孩子肩上"],[127,"ch05_3","燕子收起披帛，靜靜守住這一局"]],
  nanbei:[[16,"ch06_1","茶棚塌了半邊，燕子摸著柱上的身高痕"],[48,"ch06_2","歪柳下，老兵遞來一封輾轉多時的信"],[116,"ch06_3","燕子把信交給花兒，空出手按著桌沿"]],
  sui:[[33,"ch07_1","船外，隋代河渠剛挖開，滿是濕泥"],[48,"ch07_2","小梅一把抓住溪兒，兩人在泥地上站穩"],[111,"ch07_3","溪兒坐穩了，才伸手下這一步"]],
  tang:[[19,"ch08_1","西市街口，駝鈴聲裡走過一隊胡商"],[52,"ch08_2","皮帶攤前，連城伸手扶住翻倒的舊盾"],[110,"ch08_3","連城看清全局，才把手放回桌邊"]],
  wudai:[[34,"ch09_1","戰後的淮南，塌牆邊長出新芽"],[51,"ch09_2","花兒不出聲，把披肩放在乾石上"],[98,"ch09_3","說書人把燈移近，花兒慢慢放鬆手"]],
  song:[[14,"ch10_1","煙火亮起，小梅握住花兒的手"],[51,"ch10_2","花兒站到爺爺右邊，爺爺搭上她的肩"],[121,"ch10_3","花兒先把整個局面看清，才做決定"]],
  yuan:[[42,"ch11_1","帽頂的紅珠越過草梢，老駱看見了"],[95,"ch11_2","小梅摘下帽子，把每一處牽制看明白"],[111,"ch11_3","燈下，兩塊舊布的花紋接上了"]],
  ming:[[33,"ch12_1","方庭在矮桌旁坐下，先把書看清楚"],[70,"ch12_2","「城子，這次換我來。」"],[107,"ch12_3","庫房裡，說書人摸著拓片上的水波紋"]],
  qing:[[6,"ch13_1","雪落揚州碼頭，溪兒認出老船工"],[68,"ch13_2","溪兒和管事對坐，先把整盤棋看一遍"],[107,"ch13_3","青石擦過旗角，斷開的舊絲接上了"]],
  finale:[[20,"ch14_1","七雙眼睛圍著桌邊，誰也不催誰"],[25,"ch14_2","青石嵌回缺槽，桌上的光連成一片"],[125,"ch14_3","連城跟上商隊，回頭用力揮手"]]};
/* 換過圖的插圖（同檔名）帶版本，手機才會重抓：11/10 第 4、5 章的圍棋改成六博 */
const YUNHE_PICV={ch04_1:"1110",ch05_1:"1110"};
function yunhePics(k,n0,n){const L=YUNHE_PICS[k]||[],P={};L.forEach(([a,f,cap])=>{const j=Math.min(n-1,Math.max(0,Math.round(a*n/Math.max(1,n0))));P[j]=(P[j]||"")+`<figure class="shp-fig"><img src="data/shipmap/novel/${f}.webp${YUNHE_PICV[f]?"?v="+YUNHE_PICV[f]:""}" alt="${esc(cap)}" loading="lazy"><figcaption>${esc(cap)}</figcaption></figure>`});return P}
function ShipRead(v,k,at){setTabs(false);v.className="view";v.innerHTML='<div class="pad muted">正文載入中…</div>';setTop("📖 雲河七星",k?SHIP_RD_BACK||"#/ship/read":"#/adventure");
  Promise.all([yunheData(),yunhePov(),k?rdAidQ():null,k?yunheKL():null]).then(([N,PV,RA,KL])=>{if(!v.isConnected)return;   /* RA＝閱讀輔助（07-legend.js：百字精華、名詞小辭典），載不到是 null */const R=store.get("shipRead",{})||{},kz=c=>Math.round(c.paras.join("").length/100)/10,M=yunheMine(PV),org=yunheOrig(),me=M?WX_CHARS[myChar()]:null,meN=me?(me.nk||me.n):"";
    const sw=M?`<button class="lk shp-povsw" id="rdOrig">${org?`👤 換回${esc(meN)}的視角`:"📜 看原本的版本"}</button>`:"";
    const mkDone=c=>{const m=c.marks[0];return!!(m&&(shipRec(m.k,m.id)||(store.get("shipGal",{})||{})[m.id]))};
    if(!k){v.innerHTML=`<div class="pad shp-rd"><div class="card shp-rdi"><b>🌌 ${esc(N.title||"雲河七星")}</b><p class="muted">${esc(N.note||"")}</p>${M?`<p class="muted shp-povn">${org?"📜 現在讀的是原本的版本（第三人稱）。":`👤 你是${esc(meN)}：標「你的視角」的兩章，是${esc(meN)}自己說的故事；其他章的最後，多一段「我在旁邊看見的」。`}</p>${sw}`:""}</div>
      <div class="items" style="padding:0">${N.chapters.map(c=>{const V=yunheView(c,M);return`<button class="item${V.pov?" shp-povi":""}" data-rk="${esc(c.k)}"><span class="lb">${V.pov?"👤":R[c.k]?"📖":"📘"}</span><span class="tx"><b style="white-space:normal;line-height:1.5">${esc(V.c.title)}${V.pov?'<em class="shp-povt">你的視角</em>':""}</b><span>⛵ ${esc(shipShort(c.k))}・約 ${kz(V.c)} 千字${R[c.k]?"・讀過了":""}${mkDone(c)?"・♟ 解開了":""}</span></span><span class="muted">›</span></button>`}).join("")}</div>
      </div>`;
      {const o=v.querySelector("#rdOrig");if(o)o.onclick=()=>{vibrate(5);store.set("yunheOrig",!org);route()}}
      v.querySelectorAll("[data-rk]").forEach(b=>b.onclick=()=>{vibrate(5);SHIP_RD_BACK="#/ship/read";location.hash="#/ship/read/"+b.dataset.rk});return}
    const i=N.chapters.findIndex(c=>c.k===k);if(i<0){navReplace("#/ship/read");return}
    const V=yunheView(N.chapters[i],M),c=V.c,m=c.marks[0]||null,Pl=SHIP_PLAN[k]||{},lock=shipLockedK(k),done=mkDone(c),pv=N.chapters[i-1],nx=N.chapters[i+1];
    if(!R[k]){R[k]=Date.now();store.set("shipRead",R)}setTop("📖 第"+CNUM(c.n)+"章",SHIP_RD_BACK||"#/ship/read");
    const mk=m?`<div class="card shp-mk" id="rdMk"><b>♟ 跟${esc(Pl.who||"大家")}一起解這一局</b><span class="muted">${esc(m.label)}</span>
      ${lock?`<p class="muted">${k==="finale"?"十三站的棋理都學會以後，就能在這裡解這一局。":"星槎停靠"+esc(eraLabel(k))+"以後，就能在這裡解這一局。"}</p>`:`<button class="btn" id="rdGo">${done?"✅ 解開了・再看一次":"♟ 解這一局"}</button>`}<button class="lk" id="rdSkip">先往下讀 ›</button></div>`:"";
    const KP=(KL&&M&&KL.pov&&KL.pov[M.n])||{},Lc=KL?(V.pov?KP[c.n]:KL.main&&KL.main[c.n]):null,klOn=yunheKLon(),klT=o=>"✒ 重點句："+(o?"開":"關");
    v.innerHTML=`<div class="pad shp-rd${klOn?"":" kl-off"}"><h2 class="shp-rh">${esc(c.title)}</h2><p class="muted shp-rs">${provChip(c.tags?c:{tags:N.tags||["fiction"]})}《${esc(N.title||"雲河七星")}》・⛵ ${esc(shipShort(k))}・${esc((SHIP_STOP[k]||{}).place||"")}${V.pov?`・<em class="shp-povt">👤 你的視角：${esc(meN)}</em>`:""}</p>${KL?`<div class="shp-klbar"><button class="lk shp-klsw" id="rdKl" aria-pressed="${klOn}" title="重點句用朱紅粗體標出來">${klT(klOn)}</button></div>`:""}${M?`<div class="shp-povbar">${sw}</div>`:""}${rdGistHTML(RA,"yh",c.n)}
      ${((PIC,mkW)=>c.paras.map((p,j)=>(PIC[j]||"")+(m&&m.at===j?mk:"")+`<p${m&&m.at===j?' id="rdAfter"':""}>${mkW(p)}</p>`).join(""))(yunhePics(k,N.chapters[i].paras.length,c.paras.length),yunheKLW(rdMarker(RA,"yh"),Lc))}${m&&m.at>=c.paras.length?mk:""}
      ${V.side&&V.side.length?`<div class="shp-side"><h3>我在旁邊看見的</h3><p class="muted shp-sidew">——${esc(meN)}</p>${(W=>V.side.map(p=>`<p>${W(p)}</p>`).join(""))(yunheKLW(esc,KP[c.n]))}</div>`:""}
      <div class="row" style="gap:8px;margin-top:16px">${pv?'<button class="btn ghost" id="rdP" style="flex:1">‹ 上一章</button>':""}${nx?'<button class="btn" id="rdN" style="flex:1">下一章 ›</button>':""}</div>
      <button class="lk" id="rdShip" style="margin-top:6px">⛵ 回星槎頁 ›</button></div>`;
    rdBind(v.querySelector(".shp-rd"),RA,"yh");const on=(q,fn)=>{const e=v.querySelector(q);if(e)e.onclick=()=>{vibrate(5);fn()}},to=(q,blk)=>{const e=v.querySelector(q);if(e)try{e.scrollIntoView({block:blk||"start",behavior:"smooth"})}catch(x){e.scrollIntoView()}};
    on("#rdGo",()=>{location.hash=shipHref(k,m.id,true)});on("#rdOrig",()=>{store.set("yunheOrig",!org);route()});on("#rdSkip",()=>to("#rdAfter"));
    on("#rdKl",()=>{const o=!yunheKLon(),b=v.querySelector("#rdKl"),r=v.querySelector(".shp-rd");store.set("yunheKL",o);if(r)r.classList.toggle("kl-off",!o);if(b){b.textContent=klT(o);b.setAttribute("aria-pressed",String(o))}});
    on("#rdP",()=>{location.hash="#/ship/read/"+pv.k});on("#rdN",()=>{location.hash="#/ship/read/"+nx.k});on("#rdShip",()=>{goUp("#/adventure")});
    if(at==="mark")setTimeout(()=>to("#rdMk","center"),60);else if(at==="after")setTimeout(()=>to("#rdAfter"),60)}).catch(e=>{if(v.isConnected)v.innerHTML=`<div class="pad"><div class="card muted">${esc(e.message||String(e))}<br>正文要先下載才能讀（連上網路再打開一次）。</div></div>`});
  return{}}

/* ---------- 首頁「⭐ 今日推薦」（Gemini 評估 11/8，開發者核准）：大卡上面一顆按鈕，一鍵到今天最該做的一件事 ----------
   判斷順序：① 線上對局下到一半→回到對局 ② 下到一半的棋（挑戰電腦、朝代擂台、石桌往事；先看正在下的那盤，再看暫存的）→繼續下
            ③ 今日茶單沒喝完→茶單 ④ 星槎這一站還有沒解的千秋殘局→千秋殘局；這站學會了、還有下一站→起航 ⑤ 都做完了→跟電腦下一盤
   03-home-quiz.js 的 Home() 插入 homeRecHTML()、畫完呼叫 homeRecBind(v)；先用同步看得到的狀態畫字，再等對局狀態、題庫載入後改字 */
function homeRecHTML(){return`<button class="hrec" id="hRec" data-go="#/cpu"><span class="hrec-s">⭐</span><span class="hrec-t"><small>今日推薦</small><b id="hRecT">跟電腦下一盤</b></span><b class="go">›</b></button>${mainDoneHTML()}`}
/* Gemini 評估 11/8（開發者核准）：主線走完後的引導——13 站都停靠過（雲河七星的旅程）、13 站的千秋殘局都學會了，或第一集 36 關都過了，
   星槎頁（Voyage）和首頁（接在今日推薦下面）多一句溫和的引導和兩顆按鈕：錯棋重練、千秋盃。今日推薦的最後一項也改成推薦這兩個：週六推千秋盃，其他天推錯棋重練 */
function mainDone(){try{if(!shipAppr()&&shipDockList()&&!shipNextStop())return"13 站都走完了！";if(SHIP_ROUTE.every(e=>shipLearned(e)))return"13 站的千秋殘局都解開了！";if(typeof book1Done==="function"&&book1Done())return"《石桌往事》第一集都過關了！"}catch(e){}return""}
const mainDoneCup=()=>new Date().getDay()===6;
function mainDoneHTML(){const t=mainDone();if(!t)return"";return`<div class="mdone" id="mdone"><p>🎉 ${esc(t)}接下來可以去錯棋重練把舊帳清一清，或參加${mainDoneCup()?"今天":"週六"}的千秋盃。</p><div class="mdone-b"><button class="btn ghost" data-go="#/redo">🔁 錯棋重練</button><button class="btn ghost" data-go="#/cup">🏆 千秋盃</button></div></div>`}
function mainDoneBind(v){const b=v&&v.querySelector("#mdone");if(!b)return;b.querySelectorAll("[data-go]").forEach(x=>x.onclick=e=>{e.stopPropagation();vibrate(5);location.hash=x.dataset.go})}
function mainDoneRec(){if(!mainDone())return null;return mainDoneCup()?{go:"#/cup",t:"🏆 今天打千秋盃"}:{go:"#/redo",t:"🔁 錯棋重練"}}
function homeRecShipK(){try{const e=store.get("era","classic");return shipDocked().includes(e)?e:shipAt()}catch(e){return null}}
function homeRecTea(){try{const S=cjState(),L=S.day===cjDay()?S.list:null;if(L&&cjCleared(L))return null;const left=L?L.filter((x,i)=>!(x.st==="done"||(i===2&&x.st==="skip"))).length:3;return left>0?{go:"#/canju",t:`🍵 茶單還差 ${left} 題`}:null}catch(e){return null}}
function homeRecShip(){try{const k=homeRecShipK();if(!k)return null;const T=SHIP_STOP[k]||{},L=shipPuzzles(k);
  if(!shipLearned(k)){if(!L)return{wait:1};const left=L.slice(0,SHIP_PER).filter(id=>!shipRec(k,id)).length;if(left>0)return{go:"#/ship/pz",t:`⛵ ${shipShort(k)}還有 ${left} 題殘局`}}
  const nx=shipAppr()?null:shipNextStop();return nx?{go:"#/ship/sail",t:`⛵ 起航去${shipShort(nx)}`}:null}catch(e){return null}}
const HREC_KIND={cpu:["#/cpu","挑戰電腦"],arena:["#/arena","朝代擂台"],journey:["#/journey/play",null]};
function homeRecGame(st){try{if(!st)return null;const nm=(k,j)=>k==="journey"?(typeof jName==="function"?jName(j):"石桌往事"):HREC_KIND[k][1];
  if(st.moves&&st.moves.length&&!st.result&&HREC_KIND[st.kind])return{go:HREC_KIND[st.kind][0],t:`♟ 接著下：${nm(st.kind,st.journey)}`,park:st.kind==="journey"&&st.journey==="park"};
  const o=(st.others||[]).find(z=>z&&z.n&&HREC_KIND[z.kind]);return o?{go:HREC_KIND[o.kind][0],t:`♟ 接著下：${nm(o.kind,o.journey)}`,sw:o.kind,park:o.kind==="journey"&&o.journey==="park"}:null}catch(e){return null}}
/* 11/11 AI 模擬玩家五人都找不到兩個小實驗：今日推薦在茶單之後先推沒去過的小實驗（去過就記在 labSeen，不再推） */
function hrecLab(){try{const s=store.get("labSeen",{});if(!s.grab)return{go:"#/lab/grab",t:"⚖️ 小實驗：先吃子還是先解圍？"};if(!s.tang)return{go:"#/lesson/tang",t:"🧩 小實驗：唐站棋理體驗"};return null}catch(e){return null}}
addEventListener("hashchange",()=>{try{const m=/^#\/(lab\/grab|lesson\/tang)/.exec(location.hash);if(m){const s=store.get("labSeen",{});s[m[1]==="lab/grab"?"grab":"tang"]=1;store.set("labSeen",s)}}catch(e){}});
function homeRecBind(v){const b=v&&v.querySelector("#hRec");if(!b)return;let R={go:"#/cpu",t:"🤖 跟電腦下一盤"};
  const set=r=>{if(!r||!b.isConnected)return;R=r;const t=b.querySelector("#hRecT");if(t)t.textContent=r.t;b.dataset.go=r.go;b.setAttribute("aria-label","今日推薦："+r.t);
    {const cj=v.querySelector("#cjHome");if(cj)cj.hidden=r.go==="#/canju"}};   /* 意見回饋 751：推薦的就是茶單時，下面的「今日茶單」小卡先藏起來，不重複 */
  const pick=(st,onl)=>onl||homeRecGame(st)||homeRecTea()||hrecLab()||(s=>s&&!s.wait?s:null)(homeRecShip())||mainDoneRec()||{go:"#/cpu",t:"🤖 跟電腦下一盤"};
  let onl=null;try{if(window.XQNet&&XQNet.playing&&XQNet.playing())onl={go:"#/pvp",t:"⚔ 回線上對局"}}catch(e){}
  set(pick(null,onl));mainDoneBind(v);
  b.onclick=async e=>{e.stopPropagation();vibrate(5);if(R.sw)try{await api("/play/switch",{kind:R.sw})}catch(err){}if(R.park)store.set("park3d",true);location.hash=R.go};
  Promise.all([api("/play/state").catch(()=>null),typeof cjData==="function"?cjData().then(D=>{try{cjToday(D,cjState())}catch(e){}}).catch(()=>null):null,homeRecShipK()?shipBank().catch(()=>null):null]).then(([st])=>set(pick(st,onl))).catch(()=>{})}
/* 11/10 開發者（渡口「黃山」「石牌坊」「馬頭牆」小旗）：「這樣破壞畫面美感了，玩家自己點再出現說明就好，不用一開始就標好物件」——
   渡口的景點（.po-sight[data-ps]，只是看說明、不是入口）平常完全看不見，留一塊比原本大的透明點選範圍，點到那一帶才跳出說明（portSight，角色照舊走過去）。
   驛站的 .po-sight 是入口（旅人、秘境棋友、信箱…），照舊顯示 */
(()=>{try{const s=document.createElement("style");s.id="poSightHide";s.textContent=".po-sight[data-ps]{opacity:0!important;min-width:20cqw;min-height:12cqw;border:0!important;box-shadow:none!important;background:transparent!important;color:transparent!important;animation:none!important}";document.head.append(s)}catch(e){}})();

/* ================= 🀄 青石園・千秋石桌（開發者 11/10 hspx；Gemini 67 定案：方案 1 幻影指導局＋方案 8 歸位之兆；觸發只用「同一題錯 3 次」）=================
   在某一朝的千秋殘局同一題走錯 3 次，旅伴提議「回星槎的青石園找找靈感」；經典渡口多一個「🀄 千秋石桌」：石桌對面坐著水墨幻影（前朝棋手留在《千秋棋話》裡的一縷棋意），
   擺一題「同一招殺法、步數少」的簡單殘局（canju-set 同 kill、n≤2，挑最簡單、還沒練過的）；解開得到那一站的口訣卡（SHIP_LESSON[k].k），回原題時題目上方會顯示，不直接給答案。
   歸位之兆：石桌上七顆紅子（終章千秋歸位要放回的俥傌相仕帥炮兵）隨進度凝實——學會的站數＋幻影教過的次數×0.5，每 2 點凝實一顆，13 站學完正好七顆。
   請幻影要人在經典（shipAt()==="classic"）；從提示按「回青石園」會直接開到經典再進來 */
const PH_ON=true,PH_PC=["俥","傌","相","仕","帥","炮","兵"];
const phGet=()=>{const S=store.get("phState",null)||{};S.wrong=S.wrong||{};S.cards=S.cards||{};S.used=S.used||[];S.helps=S.helps|0;return S};
function phKill(P,k){return(P&&P.kill)||((SHIP_LESSON[k]||{}).kill||[])[0]||"殺棋"}
function phWrong(k,id,P){try{if(!PH_ON||shipRec(k,id))return;const S=phGet(),key=k+"/"+id,n=(S.wrong[key]|0)+1;S.wrong[key]=n;
    if(n%3===0){S.need={k,id,kill:phKill(P,k),at:Date.now()};store.set("phState",S);setTimeout(()=>phAsk(S.need),900)}else store.set("phState",S)}catch(e){}}
function phAsk(N){if(!N||!/^#\/canju\/s\//.test(location.hash))return;const nm=typeof shipBuddy==="function"?shipBuddy():"小帥";
  sheet("🀄 找找靈感",b=>{b.innerHTML='<p class="shp-say">'+esc(nm)+'：「這題好難，我們回星槎的青石園找找靈感吧！」</p><p>青石園的千秋石桌對面，坐著一位水墨幻影。他會擺一題用同一招「'+esc(N.kill)+'」的簡單題給你練，練完帶一句口訣回來再試。</p><div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" id="phGo">⛵ 回青石園</button><button class="btn ghost" id="phNo">再想一下</button></div>';
    b.querySelector("#phGo").onclick=()=>{closeSheet();try{shipEra("classic")}catch(e){}setTimeout(()=>{location.hash="#/ship/phantom"},60)};b.querySelector("#phNo").onclick=()=>closeSheet()})}
async function phPick(N){const d=await cjData(),own=new Set(Object.values((typeof SHIP_BANK!=="undefined"&&SHIP_BANK&&SHIP_BANK.stops)||{}).flat()),S=phGet(),used=new Set(S.used);
  const ok=x=>x&&x.kill===N.kill&&(x.n|0)<=2&&!own.has(x.id)&&x.tree;let L=d.items.filter(ok);if(!L.length)L=d.items.filter(x=>x&&(x.n|0)===1&&!own.has(x.id)&&x.tree);
  L.sort((a,b)=>(a.d||9)-(b.d||9));return(L.find(x=>!used.has(x.id))||L[0]||{}).id||null}
function phSolid(){let L=0;try{L=typeof shipPages==="function"?shipPages():0}catch(e){}const P=L+phGet().helps*.5;return PH_PC.map((c,i)=>Math.max(0,Math.min(1,(P-2*i)/2)))}
function phTableHTML(){return'<div class="ph-tb">'+phSolid().map((s,i)=>'<span class="ph-pc'+(s>=1?" on":"")+'" style="opacity:'+(.18+.82*s).toFixed(2)+'">'+PH_PC[i]+'</span>').join("")+'</div>'}
function phCardHTML(k){const C=phGet().cards[k];if(!C)return"";const Ls=SHIP_LESSON[k]||{};return'<div class="shp-psay">📜 幻影的口訣卡：「'+esc(Ls.k||"")+'」（'+esc(C.kill||"")+'）</div>'}
function phCss(){if(document.getElementById("phCss"))return;const s=document.createElement("style");s.id="phCss";s.textContent=`
.ph-tb{display:flex;justify-content:center;gap:6px;margin:8px 0 4px}.ph-pc{width:34px;height:34px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font:900 18px var(--serif,serif);color:#b3141b;background:radial-gradient(circle at 40% 35%,#fff7e6,#e8d2a8 70%,#cdb07a);box-shadow:inset 0 0 0 2px #b3141b,0 2px 3px rgba(0,0,0,.3);transition:opacity .8s}
.ph-pc.on{box-shadow:inset 0 0 0 2px #b3141b,0 0 10px #f2c94c,0 2px 3px rgba(0,0,0,.3)}.ph-pc.glow{animation:phGlow 1.6s ease 2}@keyframes phGlow{50%{transform:scale(1.25);box-shadow:inset 0 0 0 2px #b3141b,0 0 18px #f2c94c}}
.ph-ghost{display:flex;gap:10px;align-items:center}.ph-ghost img{width:64px;height:64px;object-fit:contain;opacity:.55;filter:grayscale(1) contrast(1.1);flex:none}`;document.head.append(s)}
function ShipPhantom(v){setTop("🀄 千秋石桌","#/port");setTabs(false);v.className="view";phCss();const S=phGet(),N=S.need,here=shipHere()==="classic",nm=typeof shipBuddy==="function"?shipBuddy():"小帥",glow=S.glow;
  const gh='<div class="ph-ghost"><img src="'+(typeof PIKA_DIR==="function"?PIKA_DIR():"data/pika2/")+'idle.webp" alt=""><div>';
  let card;
  if(!here)card='<b>🀄 千秋石桌</b><p>石桌在星槎的青石園裡。先到航線上點「船艙」那一站，再過來。</p>';
  else if(N)card=gh+'<b>幻影</b><p class="shp-say">「我是《千秋棋話》裡留下的一縷棋意。你在'+esc(shipShort(N.k))+'卡住的那一題，關鍵是「'+esc(N.kill)+'」——先試試這一題簡單的。」</p></div></div><div class="row" style="gap:8px;margin-top:8px;flex-wrap:wrap"><button class="btn" id="phPlay">♟ 跟幻影練一題</button></div>';
  else{const k=S.lastK,C=k&&S.cards[k];card=gh+'<b>幻影</b><p class="shp-say">「'+(C?'記住這句口訣：「'+esc((SHIP_LESSON[k]||{}).k||"")+'」。帶回'+esc(shipShort(k))+'，再試一次吧！':'石桌上的紅子，要等七位旅伴都走過自己的路，才會全部回來。卡住的時候，再來找我。')+'」</p></div></div>'+(C?'<div class="row" style="gap:8px;margin-top:8px"><button class="btn" id="phBack">⛵ 回'+esc(shipShort(k))+'再試一次</button></div>':'')}
  const solid=phSolid().filter(s=>s>=1).length;
  card+='<p style="margin:10px 0 0"><b>歸位之兆</b>　石桌上的紅子：'+solid+'／7</p>'+phTableHTML()+'<p class="muted" style="font-size:12.5px;margin:2px 0 0">每學會一站、每次跟幻影練過，紅子就更清楚一點；七顆都回來，就是「千秋歸位」的時候。</p>';
  v.innerHTML=shpPage("page_canju","🀄 千秋石桌","青石園・幻影指導局",[],'<div class="shs-card">'+card+'</div>');
  if(glow!=null){const e=v.querySelectorAll(".ph-pc")[glow];if(e)e.classList.add("glow");const T=phGet();delete T.glow;store.set("phState",T)}
  const pl=v.querySelector("#phPlay");if(pl)pl.onclick=async()=>{vibrate(5);pl.disabled=true;let id=null;try{id=await phPick(N)}catch(e){}if(!id){pl.disabled=false;toast("題目還在載入，再按一次");return}location.hash="#/canju/ph/"+N.k+"/"+id};
  const bk=v.querySelector("#phBack");if(bk)bk.onclick=()=>{const k=S.lastK,id=S.lastId;vibrate(5);try{shipEra(k)}catch(e){}setTimeout(()=>{location.hash=id?shipHref(k,id):"#/ship/pz"},60)};
  shpFit(v);return{}}
SHIP_PG.phantom=ShipPhantom;
function phXM(k,pid){const S=phGet(),N=S.need,back=()=>"#/ship/phantom";if(!N||N.k!==k)return{err:"幻影已經收起棋盤了，回千秋石桌看看。",back};
  return{id:pid,rk:"cjRunPh",back,top:"🀄 幻影指導局",icon:"🀄",ans:"看答案就拿不到口訣卡，確定？",noXP:true,
    head:P=>'<b>🀄 幻影指導局・'+esc(N.kill)+'</b>・'+cjLv(P.d)+'<div class="shp-psay">幻影：「跟你卡住的那一題，用的是同一招。先在這裡把它看清楚。」</div>',
    mark:()=>phDone(k,pid),done:(o,ans)=>ans?'<p>幻影搖搖頭：「看了答案，口訣就記不牢。再試一次吧。」</p>':'<p>幻影點點頭：「記住這句口訣：『'+esc((SHIP_LESSON[k]||{}).k||"")+'』。帶回'+esc(shipShort(k))+'，再試一次吧！」</p>',
    next:()=>"#/ship/phantom",nextL:()=>"回千秋石桌"}}
function phDone(k,pid){const S=phGet(),N=S.need;if(!N)return;const before=phSolid().filter(s=>s>=1).length;S.cards[k]={kill:N.kill,at:Date.now()};S.helps=(S.helps|0)+1;S.used=[...S.used,pid].slice(-200);S.lastK=k;S.lastId=N.id;delete S.need;S.wrong[k+"/"+N.id]=0;store.set("phState",S);
  const after=phSolid();let g=after.findIndex(s=>s<1);if(g<0)g=6;const T=phGet();T.glow=after.filter(s=>s>=1).length>before?after.filter(s=>s>=1).length-1:g;store.set("phState",T);return null}

/* ================= 📖 千秋棋話補頁動畫（開發者 11/10 hspx；Gemini 68 定案：方案 1 古籍修復＋方案 10 終章七星連珠）=================
   自己解開一站 3 題＝學會了（shipMark learned），播「古籍修復」：泛黃殘頁從四角水墨暈開，浮出這一朝的水墨小品插畫（data/qpage/qp_<朝代>.webp），
   程式疊上棋理標題＋口訣（SHIP_LESSON），朱印（篆書朝代字）蓋下，書頁縮小飛向書架。點一下跳過。之後在書架《千秋棋話》翻這一頁再看。
   補頁插圖：xiangqi-db/park/qpage（art_qpage1～3.json，13 朝各一件那一朝的器物或風景，照那一站的棋理畫）→ data/qpage/qp_<朝代>.webp。
   之後在「📘 棋話一頁」學會的那一站，下面會有這張圖和「▶ 再看一次補頁」。終章「七星連珠」見下面 qxPlay（11/10）。 */
const QP_ON=true,QP_IMGV="1940";   /* 圖的版本：同檔名換圖時改掉（11/10 史學顧問：宋改人力砲車、經典棋子紅黑、明拿掉天窗、唐鞍、元鞍） */
const QP_SEAL={classic:"雲河",qin:"秦",han:"漢",sanguo:"三國",weijin:"魏晉",nanbei:"南北朝",sui:"隋",tang:"唐",wudai:"五代",song:"宋",yuan:"元",ming:"明",qing:"清"};
function qpCss(){if(document.getElementById("qpCss"))return;const s=document.createElement("style");s.id="qpCss";s.textContent=`
.qp-ov{position:fixed;inset:0;z-index:974;background:rgba(20,14,8,.55);display:flex;align-items:center;justify-content:center;padding:20px;opacity:0;transition:opacity .4s}.qp-ov.on{opacity:1}
.qp-pg{position:relative;width:min(360px,86vw);aspect-ratio:1/1.04;background:#efe3c6 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.8' numOctaves='2'/%3E%3CfeColorMatrix values='0 0 0 0 .5 0 0 0 0 .4 0 0 0 0 .28 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='120' height='120' filter='url(%23n)'/%3E%3C/svg%3E");border-radius:3px;box-shadow:0 14px 34px rgba(0,0,0,.45),inset 0 0 36px rgba(140,100,50,.3),inset 0 0 0 1px rgba(120,80,40,.3);overflow:hidden}
.qp-pg.fly{transition:transform 1s cubic-bezier(.6,0,.9,.5),opacity 1s}
.qp-art{position:absolute;inset:14% 10% 25%;background:center/contain no-repeat;mix-blend-mode:multiply;-webkit-mask:radial-gradient(circle at 50% 46%,#000 0,#000 var(--r,0%),transparent calc(var(--r,0%) + 14%));mask:radial-gradient(circle at 50% 46%,#000 0,#000 var(--r,0%),transparent calc(var(--r,0%) + 14%))}
.qp-ttl{position:absolute;left:0;right:0;top:7%;text-align:center;font:900 20px var(--serif,serif);color:#3a2618;letter-spacing:.12em;opacity:0}
.qp-k{position:absolute;left:0;right:0;bottom:15%;text-align:center;font:700 14.5px var(--serif,serif);color:#5a3a20;opacity:0}
.qp-ttl.on,.qp-k.on{opacity:1;transition:opacity .6s}
.qp-seal{position:absolute;left:50%;bottom:3%;transform:translateX(-50%) scale(2.4);opacity:0;width:38px;height:38px;border:2.5px solid #a4331f;color:#a4331f;border-radius:4px;display:flex;align-items:center;justify-content:center;font:900 15px/1 var(--serif,serif);background:rgba(246,236,214,.5);box-shadow:0 1px 3px rgba(0,0,0,.3)}
.qp-seal.stamp{animation:qpStamp .5s ease forwards}@keyframes qpStamp{0%{opacity:0;transform:translateX(-50%) scale(2.4) rotate(-14deg)}60%{opacity:1;transform:translateX(-50%) scale(.92) rotate(-8deg)}100%{opacity:1;transform:translateX(-50%) scale(1) rotate(-6deg)}}
.qp-seal.two{font-size:11px;line-height:1.05}
.qp-cap{position:fixed;left:0;right:0;bottom:12%;text-align:center;color:#f6ead2;font:600 15px/1.6 var(--serif,serif);padding:0 24px;opacity:0;z-index:975;text-shadow:0 2px 8px rgba(0,0,0,.7)}.qp-cap.on{opacity:1;transition:opacity .5s}
.qp-tip{position:fixed;right:14px;bottom:5%;color:rgba(246,234,210,.7);font:600 12px sans-serif;z-index:975}
@media (prefers-reduced-motion:reduce){.qp-pg.fly,.qp-art,.qp-ttl,.qp-k,.qp-cap{transition:none}.qp-seal.stamp{animation:none;opacity:1;transform:translateX(-50%) rotate(-6deg)}}`;document.head.append(s)}
function qpPlay(k,done){if(!QP_ON||!["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"].includes(k)){done&&done();return}
  qpCss();const Ls=SHIP_LESSON[k]||{},sealTxt=QP_SEAL[k]||"",ov=document.createElement("div");ov.className="qp-ov";
  ov.innerHTML=`<div class="qp-pg"><div class="qp-art" style="background-image:url('data/qpage/qp_${k}.webp?v=${QP_IMGV}')"></div><div class="qp-ttl">${esc(Ls.t||"")}</div><div class="qp-k">${esc(Ls.k||"")}</div><div class="qp-seal${sealTxt.length>=3?" two":""}">${esc(sealTxt)}</div></div><div class="qp-cap">墨痕重連，《千秋棋話》補上了${esc(shipShort(k))}這一頁！</div><span class="qp-tip">點一下跳過 ›</span>`;
  document.body.append(ov);const pg=ov.querySelector(".qp-pg"),art=ov.querySelector(".qp-art");let dead=false;const tm=[];
  const fin=()=>{if(dead)return;dead=true;tm.forEach(clearTimeout);ov.classList.remove("on");setTimeout(()=>{ov.remove();done&&done()},400)};
  ov.addEventListener("pointerdown",fin,{once:true});
  requestAnimationFrame(()=>{ov.classList.add("on");
    const reduce=(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}})();
    if(reduce){art.style.setProperty("--r","120%");ov.querySelector(".qp-ttl").classList.add("on");ov.querySelector(".qp-k").classList.add("on");ov.querySelector(".qp-seal").classList.add("stamp","on");ov.querySelector(".qp-cap").classList.add("on");tm.push(setTimeout(fin,2600));return}
    let r=0;const grow=()=>{if(dead)return;r+=3.2;art.style.setProperty("--r",r+"%");if(r<120)requestAnimationFrame(grow)};tm.push(setTimeout(grow,350));
    tm.push(setTimeout(()=>{if(!dead)ov.querySelector(".qp-ttl").classList.add("on")},900));
    tm.push(setTimeout(()=>{if(!dead)ov.querySelector(".qp-k").classList.add("on")},1400));
    tm.push(setTimeout(()=>{if(!dead){ov.querySelector(".qp-seal").classList.add("stamp","on");try{vibrate(12)}catch(e){}}},2100));
    tm.push(setTimeout(()=>{if(!dead)ov.querySelector(".qp-cap").classList.add("on")},2500));
    tm.push(setTimeout(()=>{if(dead)return;pg.classList.add("fly");pg.style.transform="translate(40vw,-42vh) scale(.12) rotate(12deg)";pg.style.opacity="0";ov.querySelector(".qp-cap").classList.remove("on")},4200));
    tm.push(setTimeout(fin,5300))})}
function qpCardHTML(k){return`<div class="card qp-card" style="text-align:center"><img src="data/qpage/qp_${k}.webp?v=${QP_IMGV}" alt="" loading="lazy" style="width:min(240px,70%);border-radius:4px;box-shadow:0 4px 12px rgba(0,0,0,.18)" onerror="this.remove()"><p class="muted" style="margin:6px 0">《千秋棋話》補上的這一頁</p><button class="btn ghost" id="qpReplay" style="width:auto;margin:0 auto">▶ 再看一次補頁</button></div>`}
/* ================= ✨ 終章「七星連珠・千秋歸位」（Gemini 68 方案 10，開發者 11/10「終章」）=================
   學會終章 xl-finale 後先播這段，再出原本的結尾卡（shipFinaleCard）。全程式畫，不另外出圖：夜色裡浮出千秋石桌（桌面淡刻棋盤），
   七個空位排成北斗七星（天樞→搖光）；七位旅伴依序出現（立繪 data/xs/prev_x_*.webp＋一句照各自身世寫的話），對應的紅子落進空位，那顆星亮起、金線連成北斗；
   七子到齊，石桌金光沖天，說書人：「七子歸位，千秋局成！」。點一下跳過；結尾卡有「▶ 再看一次」。紅子照下面的星序出場（天樞→搖光：俥相傌帥仕炮兵），不是歸位之兆 PH_PC 的俥傌相仕帥炮兵（七子合法性、形狀不鏡像由 tools/test-qixing.js 檢查） */
/* 11/12 開發者決定換成不鏡像的擺法（原 11/10 B 案「傌九5、相九3、仕六3、兵五4、帥四3、炮二3、俥一1」是北斗左右鏡像）：
   七子照北斗七星的真實星位（仰望天空、東在左；可以整體轉一個角度，不左右翻），全部落在合法交叉點上——
   同日再選「換成更像的」：天樞＝俥九1、天璇＝相九3、天璣＝傌七4、天權＝帥六3、玉衡＝仕四3、開陽＝炮三3、搖光＝兵一4（正投影形狀殘差在所有合法擺法裡最小；俥九1、兵一4 是開局原位）。
   旅伴跟著自己的子走（炮＝花兒、兵＝溪兒），台詞不改。
   出場照星序；每顆落下「叩」一聲落子音（App 的木棋子聲，不管落子音開關）＋一圈金色墨暈；七子落完，一條金線從天樞一筆畫到搖光，北斗一起亮。
   棋盤座標 QX_P＝[由左數第幾條直線 1～9, 由下數第幾條橫線 1～10]（紅方在下；紅方視角路數＝10−c） */
const QX_ON=true;
const QX_P=[[1,1],[1,3],[3,4],[4,3],[6,3],[7,3],[9,4]];
const QX_STAR=["天樞","天璇","天璣","天權","玉衡","開陽","搖光"];
const QX_WHO=[["x_swordboy","阿轍","俥","直道走到底，就是回家的路——俥，歸位！"],["x_spiritgirl","燕子","相","我一直守著的家，原來就在這裡——相，歸位。"],["x_miaogirl","小梅","傌","跑多遠，大家都看得見我——傌，回來囉！"],
  ["x_shuai","方庭","帥","我真的走出那道門了——帥，歸位！"],["x_shi","城子","仕","這一次，我不只是盾牌，我也走到遠方了——仕，歸位。"],["x_martialgirl","花兒","炮","爺爺，你聽見了嗎？炮——歸位啦！"],["x_bing","溪兒","兵","這一次，我敢回頭看了——兵，歸位。"]];
const QX_X=c=>18+(c-1)*8,QX_Y=r=>14+(10-r)*8;   /* 棋盤在石桌上的位置（%）：直線間距 8、橫線間距 8 */
function qxCss(){if(document.getElementById("qxCss"))return;const s=document.createElement("style");s.id="qxCss";s.textContent=`
.qx-ov{position:fixed;inset:0;z-index:974;background:radial-gradient(ellipse at 50% 40%,#1d2a48 0%,#0d1428 60%,#070b18 100%);display:flex;flex-direction:column;align-items:center;justify-content:center;opacity:0;transition:opacity .5s;overflow:hidden}.qx-ov.on{opacity:1}
.qx-ttl{color:#f2d58a;font:900 22px var(--serif,serif);letter-spacing:.3em;text-shadow:0 0 12px rgba(242,201,76,.6);margin-bottom:14px;opacity:0;transition:opacity .8s}.qx-ttl.on{opacity:1}
.qx-tb{position:relative;width:min(320px,80vw);aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 42% 38%,#a9b4ad,#7d8a84 60%,#5d6863);box-shadow:0 0 0 6px #6b7670,0 0 0 9px #4e5853,0 18px 40px rgba(0,0,0,.6),inset 0 0 30px rgba(0,0,0,.35)}
.qx-tb svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible}
.qx-slot{position:absolute;width:9%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);border:2px dashed rgba(242,213,138,.7);animation:qxBlink 1.2s ease-in-out infinite}
@keyframes qxBlink{50%{border-color:rgba(242,213,138,.2)}}
.qx-pc{position:absolute;width:9.5%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;font:900 clamp(11px,3.4vw,16px)/1 var(--serif,serif);color:#b3141b;background:radial-gradient(circle at 40% 35%,#fff7e6,#e8d2a8 70%,#cdb07a);box-shadow:inset 0 0 0 2px #b3141b,0 3px 5px rgba(0,0,0,.45);opacity:0;z-index:2}
.qx-pc.drop{animation:qxDrop .5s cubic-bezier(.5,0,.75,0) forwards}@keyframes qxDrop{0%{opacity:0;transform:translate(-50%,-300%) scale(1.6)}85%{opacity:1;transform:translate(-50%,-50%) scale(.9)}100%{opacity:1;transform:translate(-50%,-50%) scale(1)}}
.qx-pc.lit{box-shadow:inset 0 0 0 2px #b3141b,0 0 12px 4px rgba(242,201,76,.85),0 3px 5px rgba(0,0,0,.45);transition:box-shadow .5s}
.qx-halo{position:absolute;width:9%;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%) scale(.6);background:radial-gradient(circle,rgba(255,226,140,.85) 0%,rgba(212,160,60,.45) 45%,rgba(120,80,20,0) 72%);opacity:0;pointer-events:none;z-index:1}
.qx-halo.on{animation:qxHalo 1.1s ease-out forwards}@keyframes qxHalo{0%{opacity:.95;transform:translate(-50%,-50%) scale(.6)}100%{opacity:0;transform:translate(-50%,-50%) scale(3.2)}}
.qx-ln{fill:none;stroke:#f2d58a;stroke-width:1;stroke-linecap:round;stroke-linejoin:round;filter:drop-shadow(0 0 1.5px #f2c94c);stroke-dasharray:100;stroke-dashoffset:100}
.qx-ln.on{transition:stroke-dashoffset 1.8s ease-in-out;stroke-dashoffset:0}
.qx-who{display:flex;align-items:center;gap:10px;min-height:96px;margin-top:16px;padding:0 18px;max-width:460px;opacity:0;transform:translateY(8px);transition:opacity .35s,transform .35s}.qx-who.on{opacity:1;transform:none}
.qx-who img{width:72px;height:96px;object-fit:contain;flex:none;filter:drop-shadow(0 0 6px rgba(242,201,76,.5))}
.qx-who b{display:block;color:#f2d58a;font:900 15px var(--serif,serif)}.qx-who p{margin:2px 0 0;color:#f6ead2;font:600 15px/1.55 var(--serif,serif)}
.qx-burst{position:absolute;left:50%;top:50%;width:10px;height:10px;border-radius:50%;transform:translate(-50%,-50%);background:radial-gradient(circle,rgba(255,236,170,.95),rgba(242,201,76,.5) 40%,transparent 70%);opacity:0;pointer-events:none;z-index:3}
.qx-burst.on{animation:qxBurst 1.8s ease-out forwards}@keyframes qxBurst{0%{opacity:0;width:10px;height:10px}25%{opacity:1}100%{opacity:0;width:240vmax;height:240vmax}}
.qx-tip{position:fixed;right:14px;bottom:5%;color:rgba(246,234,210,.65);font:600 12px sans-serif}
@media (prefers-reduced-motion:reduce){.qx-slot,.qx-pc.drop,.qx-burst.on,.qx-halo.on{animation:none}.qx-pc.drop{opacity:1}.qx-ln.on{transition:none}}`;document.head.append(s)}
function qxBoardSvg(){const X=QX_X,Y=QX_Y,ln=(a,b,c,d)=>`<line x1="${a}" y1="${b}" x2="${c}" y2="${d}"/>`;let g="";
  for(let r=1;r<=10;r++)g+=ln(X(1),Y(r),X(9),Y(r));
  for(let c=1;c<=9;c++)g+=c===1||c===9?ln(X(c),Y(1),X(c),Y(10)):ln(X(c),Y(1),X(c),Y(5))+ln(X(c),Y(6),X(c),Y(10));
  g+=ln(X(4),Y(1),X(6),Y(3))+ln(X(6),Y(1),X(4),Y(3))+ln(X(4),Y(8),X(6),Y(10))+ln(X(6),Y(8),X(4),Y(10));
  const P=QX_P.map(([c,r])=>X(c)+" "+Y(r));   /* 一筆：天樞→天璇→天璣→天權→天樞（斗），再從天權→玉衡→開陽→搖光（柄） */
  return`<svg viewBox="0 0 100 100" aria-hidden="true"><g stroke="rgba(40,48,46,.4)" stroke-width=".45">${g}</g><path class="qx-ln" pathLength="100" d="M${P[0]} L${P[1]} L${P[2]} L${P[3]} L${P[0]} M${P[3]} L${P[4]} L${P[5]} L${P[6]}"/></svg>`}
function qxClack(){try{if(typeof moveSound0==="function"&&typeof withAudio==="function")withAudio(()=>moveSound0(false))}catch(e){}try{if(typeof vibrate==="function")vibrate(12)}catch(e){}}
function qxPlay(done){if(!QX_ON){done&&done();return}qxCss();const ov=document.createElement("div");ov.className="qx-ov";
  ov.innerHTML=`<div class="qx-ttl">終章・七星連珠</div><div class="qx-tb">${qxBoardSvg()}${QX_P.map(([c,r],i)=>{const st=`left:${QX_X(c)}%;top:${QX_Y(r)}%`;return`<i class="qx-slot" style="${st}"></i><i class="qx-halo" style="${st}"></i><span class="qx-pc" style="${st}">${QX_WHO[i][2]}</span>`}).join("")}<i class="qx-burst"></i></div><div class="qx-who"><img alt=""><div><b></b><p></p></div></div><span class="qx-tip">點一下跳過 ›</span>`;
  document.body.append(ov);let dead=false;const tm=[],at=(ms,f)=>tm.push(setTimeout(()=>{if(!dead)f()},ms));
  const fin=()=>{if(dead)return;dead=true;tm.forEach(clearTimeout);ov.classList.remove("on");setTimeout(()=>{ov.remove();done&&done()},500)};
  ov.addEventListener("pointerdown",fin,{once:true});
  const who=ov.querySelector(".qx-who"),wi=who.querySelector("img"),wb=who.querySelector("b"),wp=who.querySelector("p"),pcs=ov.querySelectorAll(".qx-pc"),slots=ov.querySelectorAll(".qx-slot"),halos=ov.querySelectorAll(".qx-halo"),line=ov.querySelector(".qx-ln");
  QX_WHO.forEach(([w])=>{const im=new Image();im.src=`data/xs/prev_${w}.webp`});
  requestAnimationFrame(()=>ov.classList.add("on"));at(300,()=>ov.querySelector(".qx-ttl").classList.add("on"));
  const T0=1300,DT=1500;
  QX_WHO.forEach(([w,nk,pc,say],i)=>{const t=T0+i*DT;
    at(t,()=>{who.classList.remove("on");setTimeout(()=>{if(dead)return;wi.src=`data/xs/prev_${w}.webp`;wb.textContent=`${nk}・${QX_STAR[i]}`;wp.textContent=say;who.classList.add("on")},180)});
    at(t+450,()=>{pcs[i].classList.add("drop");slots[i].style.display="none"});
    at(t+880,()=>{halos[i].classList.add("on");qxClack()})});
  const TE=T0+7*DT;
  at(TE,()=>{who.classList.remove("on");line.classList.add("on")});
  at(TE+1800,()=>{pcs.forEach(p=>p.classList.add("lit"));ov.querySelector(".qx-burst").classList.add("on")});
  at(TE+2400,()=>{wi.src="data/actors/teller.webp";wb.textContent="說書人";wp.textContent="「七子歸位，千秋局成！」";who.classList.add("on")});
  at(TE+5400,fin)}
