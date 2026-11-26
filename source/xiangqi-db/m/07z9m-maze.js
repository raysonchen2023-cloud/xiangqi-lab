/* ---------- W71 中炮門地底迷宮・第一層「廢棄漕倉」（開發者 11/23）----------
   開發者原話：「寫md給gemini規劃中炮門的地底迷宮玩法 迷宮有三層樓…要結合象棋」「迷宮地圖是真的黑漆漆的那種要讓玩家真的可以走」。
   選單決定：先做最小可玩版、玩家是隨行七星角色、拿掉排行榜只做單機；自由走，遇到機關或敵人才下棋；先做第一層。
   規格 story/gemini_app/194_中炮門地底迷宮_最小可玩版規格_1123.md；原型 output/maze-proto/地底漕倉原型.html（這裡照原型移植）。
   名稱、人物、劇情、美術全部原創（不用其他遊戲的名稱或樣子）。場景是淮安漕倉地底，入口在中炮門大殿前的拋石車底下。
   玩法：
     ・整張地圖預設全黑，只有手上燈火照得到的一圈看得見；走過的地方留下淡淡的記憶輪廓。牆擋光。走到壁燈旁邊就點亮，之後那一片一直亮著。
     ・回合制：玩家走一步，暗匪走一步；玩家不動，場上就不動。點地面（只能點看過的地方）會自己走過去，也可以用方向鍵或下面的方向鈕。
     ・暗匪照「車」的走法沿著一條橫廊來回巡，面向那一邊看得到 5 格（地上畫紅線）；糧袋、牆擋視線。被看到或撞上＝一題殘局，
       解開暗匪就暈四回合；同一題錯 3 次葛青禾點亮該動的子；錯到第 4 次被拖回入口，撿到的東西保留。
     ・石門刻著拋石車：一題「炮隔子打將」的殘局，解開門就開，門後是往下的樓梯（第二層之後再接）。
     ・三個朱紅箱子：門派貢獻、中炮譜殘頁、朱紅漆盒（目前只記在迷宮裡；遊戲裡還沒有的獎勵之後另開工單換成既有的東西）。
     ・第一次走完第一層：修為 +30（只給一次）。
   殘局：兩題都用 Pikafish 核驗過「一步殺、而且只有這一步殺」（output/maze-proto/verify_puzzles.js）；測試另外用 core.js 獨立重算。
   遠端開關：xqFlag("maze") 關掉時，中炮門門內頁不放入口，直接開 #/jianghu/maze 也退回門內頁（代號表 flags-codes.json 另開計分規則 PR 補）。
   路由：#/jianghu/maze 原本落到十州棋館長卷（02-shell 只分 hall），這裡包一層 Jianghu，遇到 maze 改畫迷宮；不動共用的 02-shell.js。 */
const JH_MZ_MAP=[
"###############",
"#####...#######",
"#####.>.#######",
"#####...#######",
"######D########",
"##T.........T##",
"##..S.....S..##",
"##...........##",
"##..S.....S..##",
"##.....CS....##",
"######.#P######",
"######.########",
"#C...........C#",
"#.#L#.###.###.#",
"#.#...#T..#LH.#",
"#.###.###.###.#",
"#...#...#...#.#",
"###.#S###.#L#.#",
"#...#.....#...#",
"#.#.#.S.#.#.#.#",
"#.#...#...#.#.#",
"###.#####.#####",
"#T.........T..#",
"#.....@.......#",
"###############"];
const JH_MZ_GUARD={x:9,y:12,dx:1};
const JH_MZ_PUZ={
  door:{zh:["石門機關：糧袋當炮架","門上刻著一座拋石車。紅方先走，一步將死黑方，門就會開。提示：炮要隔一個子才打得到。"],
        en:["Stone door: sacks as a cannon screen","A catapult is carved on the door. Red to move: checkmate in one and the door opens. Hint: a cannon needs one piece to jump over."],
        fen:"3rkr3/9/4P4/9/9/9/9/7C1/4A4/4K4",ans:"h2e2"},
  trap:{zh:["被暗匪逮住了","暗匪把你按在糧袋堆旁：「解得開這局，就放你走。」紅方先走，一步將死黑方。"],
        en:["Caught by a granary thief","The thief pins you by the grain sacks: \"Solve this and you can go.\" Red to move: checkmate in one."],
        fen:"3k5/2P1a4/9/9/9/9/9/9/9/R4K3",ans:"a0a9"}};
/* W87a（11/24 開發者：「被暗匪抓住的聯續三題題目居然都一樣！請修正，而且都超簡單一步殺，這樣太無聊了」）：中炮門題庫，2～3 步殺、炮收尾，
   由 xiangqi-lab/tools/maze-puzzles.js 從殘局題庫挑題、Pikafish 驗「紅方每一步唯一解、黑方應著撐最久」後寫進下面這一段（不要手改；--check 可重跑比對） */
/* ==JH_MZ_POOL:JH_MZ_POOL_CENTRAL== */
const JH_MZ_POOL_CENTRAL={door:[
{"id":"jc112c7","src":{"book":"橘中秘","title":"一炮兩兵勝雙象"},"zh":["石門機關：炮的殺法","門上刻著一座拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到。"],"en":["Stone door: a cannon's mate","A catapult is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over."],"fen":"6b2/3PP2C1/b2k5/9/9/9/9/9/9/4K4","line":["h8f8","a7c5","f8f9","c5a7","f9d9"]},
{"id":"lk039c4","src":{"book":"爛柯神機","title":"斷汲禁樵"},"zh":["石門機關：炮的殺法","門上刻著一座拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到。"],"en":["Stone door: a cannon's mate","A catapult is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over."],"fen":"3k1aRPr/4nC1n1/4b4/6C2/4N4/9/9/4p4/2r1p1p2/5K3","line":["g9f9","h8f9","g6g9","f9d8","g9i9"]},
{"id":"lk055c9","src":{"book":"爛柯神機","title":"攻守兼施"},"zh":["石門機關：炮的殺法","門上刻著一座拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到。"],"en":["Stone door: a cannon's mate","A catapult is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over."],"fen":"2bk1ab2/4a1N2/4c4/9/4P3C/4N4/3C5/4p4/2rp1p3/4K4","line":["e5d5","e8d7","d5c5","d7e8","i5d5"]}],
trap:[
{"id":"lk140c5","src":{"book":"爛柯神機","title":"請君入甕"},"zh":["被暗匪逮住了","暗匪把你按在糧袋堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a granary thief","The thief pins you by the grain sacks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"c1ba5/4k1N2/3a1R3/9/2b6/9/4C4/9/2p1p4/1p1K5","line":["g8e7","e8d8","f7f8","d9e8","e3d3"]},
{"id":"lk151c4","src":{"book":"爛柯神機","title":"三角同盟-(三角形)"},"zh":["被暗匪逮住了","暗匪把你按在糧袋堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a granary thief","The thief pins you by the grain sacks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"4P4/7NC/3k3C1/9/2b3p2/9/1r7/9/r1p1K1n2/9","line":["h8f7","c5e7","f7e5","d7d8","h7h8"]},
{"id":"lk179c7","src":{"book":"爛柯神機","title":"透脫玲瓏"},"zh":["被暗匪逮住了","暗匪把你按在糧袋堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a granary thief","The thief pins you by the grain sacks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"4ca3/4aP3/3k5/4p4/4P4/1C1C5/9/9/4p1p2/5K3","line":["e5d5","d7e7","d4e4","e7d7","b4d4"]},
{"id":"lk222","src":{"book":"爛柯神機","title":"盈盈一水"},"zh":["被暗匪逮住了","暗匪把你按在糧袋堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a granary thief","The thief pins you by the grain sacks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"9/1P2a2P1/n3ka3/9/8R/1N7/5p3/9/3pp2p1/5K2C","line":["i5e5","e7d7","e5d5","d7e7","i0i7"]},
{"id":"mr074c4","src":{"book":"夢入神機","title":"人海求珠"},"zh":["被暗匪逮住了","暗匪把你按在糧袋堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a granary thief","The thief pins you by the grain sacks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2b1R4/5k3/1N7/C8/c1n2r3/9/P8/9/2pp1p3/c3K4","line":["e9f9","f8f9","b7d8","f9f8","a6a8"]},
{"id":"mr119c6","src":{"book":"夢入神機","title":"單車指壘"},"zh":["被暗匪逮住了","暗匪把你按在糧袋堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a granary thief","The thief pins you by the grain sacks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"1P1a4C/5k3/9/5N3/5P3/C1P6/c8/4p4/2r2p3/4K1R2","line":["f6h7","f8e8","g0g8","e8e7","i9i7"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CENTRAL== */
const JH_MZ_REW=[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"中炮譜殘頁",en:"Central Cannon manual page"},{k:"box",zh:"朱紅漆盒",en:"Vermilion lacquer box"}];
const JH_MZ_XP=30;
/* 專屬配樂「地底漕倉」（開發者 11/23：「找gemini製作迷宮的背景音樂，根據剛剛提到的四大回味感來製作」；聽過回「可以 非常符合我要的」）。
   Gemini lyria-3.5，約 2 分鐘可循環，只放 CDN（data/bgm/maze/maze_1.mp3）。進迷宮頁指定播這首，離開就回到朝代配樂輪播（跟觀星臺 GXD_BGM 同一種做法） */
const JH_MZ_BGM="maze/maze_1.mp3";
/* ===== W87（11/24）九派地底迷宮共用（開發者選單：先做三派＋中炮門重改；九派文案 story/gemini_app/197_…_Gemini回覆.md）=====
   每一派的第一層註冊在 JH_MZ_LV[派]（jhMzDef）；別派寫在自己的檔（m/07z9m-<派>.js），不改這支：
     map        地圖（字元：# 牆、. 地面、@ 起點、> 樓梯、D 石門、P 機關踏板、T 壁燈、C 箱子；其他字元由該派自己定義）
     guards     守衛 [{kind, x, y, dx, dy, …}]：走法與視線照 JH_MZ_KIND[kind]（中炮門是 rook＝車）
     puz/pool   殘局：puz＝固定題；pool＝題庫 {door:[…], trap:[…]}，每題 {zh:[標題,說明], en:[…], fen, line:[紅,黑,紅,…]}（多步殺）或 ans（一步殺）
     solid／opaque  擋路／擋光的字元（預設 "#SD"／"#D"）；jump  可以像炮一樣隔一個跳過去的字元（中炮門 "S"＝糧袋）
     onStep(S,dx,dy,c)  走一步之前的機關（例如推箱子塞象眼），回傳事件物件就照它、回傳 null 照預設走
     rew、xp、xpKey、key（存檔鍵）、title、lvName、intro、warn、hall（門內頁入口）、back（回到哪一派的門內頁）
   守衛走法 JH_MZ_KIND[kind]＝{step(S,G), sight(S,G)→[{x,y}]，look（3D 顏色）}；障礙外觀 JH_MZ_OBJ[字元]＝(T3,helpers)→Group（3D），預設糧袋 */
const JH_MZ_LV={},JH_MZ_KIND={},JH_MZ_OBJ={},JH_MZ_TILE={};   /* JH_MZ_TILE[字元]＝(cx,px,py,T,S,x,y)：3D 載不起來時平面版怎麼畫這一格 */
function jhMzDef(sid,o){return JH_MZ_LV[sid]=jhMzMake(sid,o)}
/* 建一層的設定（預設值＋o）；第一層 jhMzDef 登記在 JH_MZ_LV[派]，第二層以後 jhMzLayer 登記在 JH_MZ_LV[派].layers[層] */
function jhMzMake(sid,o){return Object.assign({sid,layer:1,avoid:"",map:[],guards:[],puz:{},pool:{},solid:"#SD",opaque:"#D",jump:"",onStep:null,rew:JH_MZ_REW,xp:JH_MZ_XP,xpKey:"maze:"+sid+":1",key:"jhMaze_"+sid,
  title:["🕳 地底迷宮","🕳 Underground maze"],lvName:["地底迷宮・第一層","Underground maze · Level 1"],intro:["",""],warn:["",""],hall:null,back:["回門派","Back to the school"]},o)}
/* 車（rook）：沿著直線來回巡（dx 或 dy 其中一個不是 0），碰到擋路的就掉頭；面向那一邊看得到 range 格（預設 5），擋路的東西擋視線 */
JH_MZ_KIND.rook={
  sight(S,G){const o=[],dx=G.dx||0,dy=G.dy||0,n=G.range||5;for(let i=1;i<=n;i++){const x=G.x+dx*i,y=G.y+dy*i;if(jhMzSolid(S,x,y))break;o.push({x,y})}return o},
  step(S,G){const dx=G.dx||0,dy=G.dy||0;let nx=G.x+dx,ny=G.y+dy;if(jhMzSolid(S,nx,ny)){G.dx=-dx;G.dy=-dy;nx=G.x+G.dx;ny=G.y+G.dy}if(!jhMzSolid(S,nx,ny)){G.x=nx;G.y=ny}},
  look:{body:"#151515",head:"#222222",eye:0xE24A3A}};
/* 中炮門第一層「廢棄漕倉」：上面那幾個常數就是它的設定（測試照舊讀 JH_MZ_MAP、JH_MZ_PUZ…） */
jhMzDef("central",{map:JH_MZ_MAP,guards:[Object.assign({kind:"rook",dy:0},JH_MZ_GUARD)],puz:JH_MZ_PUZ,pool:JH_MZ_POOL_CENTRAL,jump:"S",key:"jhMaze",xpKey:"maze:1",
  /* W87（11/24 開發者：「把中炮門地圖整張改成迷路版延到送審之前」）：第 13～20 列改成迷路的地窖——彎繞的岔路、好幾條死路、兩處糧袋跳躍捷徑；
     暗門 H（14 列 12 行）後面藏一塊碑刻；三件碑刻 L 由上到下對應 lore 的順序。石門、踏板、暗匪廊道、起點這些既有測試綁住的部分都不動 */
  solid:"#SDLH",opaque:"#DLH",
  /* W87b 像素材質（11/24 開發者選「重出」的新版：Gemini 直接畫像素、48 色、無損 webp，Windows Claude 2 出圖）：只放 CDN（data/maze/tex/），載不到就用程式畫的；牆頂照舊程式畫 */
  tex:{floor:"data/maze/tex/central_floor.webp",side:"data/maze/tex/central_wall.webp"},
  /* 碑刻文書（11/24 Gemini 查史料、iMac Claude 1 複核，Windows Claude 1 照複核改寫；出處照實寫哪些是史料、哪些是遊戲整理）。
     中炮門地圖改成有 L 的迷路版之前不會出現（#108 的 07z9m-lore.js 照 L 的順序對應） */
  lore:[{id:"cc1",kind:"doc",title:["常盈倉收糧告示","Notice from the Changying Granary"],
      body:["告示寫著淮安常盈倉收漕糧的規矩：糧船到倉，驗糧的官員先看米糧乾不乾、有沒有摻沙土雜質；受潮或成色不好的退回去重曬、重碾，合格的才准進倉。","The notice sets out how the Changying Granary in Huai'an took in tribute grain: when a grain boat arrived, officials first checked whether the grain was dry and free of sand. Damp or poor grain was sent back to be dried or milled again; only good grain went into the granary."],
      src:"常盈倉是明代淮安的漕運轉運倉；驗收細節是遊戲依明代漕規概括，告示本身是遊戲虛構"},
    {id:"cc3",kind:"slip",title:["監守自盜律","The law on stealing what you guard"],
      body:["殘簡抄著《大明律》的條文：看守倉庫的人偷盜錢糧，不分主犯從犯，合計贓物定罪，還要在右小臂刺上字；偷得多的，可以判死罪。","The slip copies an article of the Great Ming Code: a granary keeper who stole money or grain was judged on the total taken, leader and helpers alike, and had words tattooed on the right forearm; a large theft could mean death."],
      src:"《大明律・刑律・賊盜》「監守自盜倉庫錢糧」條；文字是遊戲改寫"},
    {id:"cc2",kind:"stele",title:["倉廒防潮碑","Stele on keeping granaries dry"],
      body:["碑上記著修倉的做法：倉底墊高、鋪木板，板下留空讓風通過；糧堆四周鋪蘆蓆、塞糠粃，擋住地氣和老鼠，漕糧才能久放不壞。","The stele records how granaries were kept: raise the floor, lay planks with an air gap beneath, and line the grain heaps with reed mats packed with chaff to keep out ground damp and rats, so the grain would keep for years."],
      src:"明代官倉常見的防潮做法；碑文是遊戲整理改寫，不是特定碑刻的原文"}],
  title:["🕳 地底漕倉","🕳 Underground granary"],lvName:["地底漕倉・第一層","Underground granary · Level 1"],back:["回中炮門","Back to the Central Cannon School"],
  hall:{at:[530,395],zh:"🕳 拋石車・地底密道",en:"🕳 Catapult · Hidden passage"},
  intro:["你從拋石車底下的暗門爬下來，四周一片漆黑。<b>點地面就會走過去</b>，也可以用下面的方向鈕。走到壁燈旁邊會點亮它。","You climb down through the hatch under the catapult into pitch darkness. <b>Tap the floor to walk there</b>, or use the arrows below. Walk next to a wall lamp to light it."],
  warn:["<b>前面有暗匪在巡邏。</b>紅線是他看得到的地方，從他背後或趁他轉身時過去。","<b>A thief is patrolling ahead.</b> The red line is what he can see. Slip past behind him or while he turns."],
  say:{door:["將死！炮隔著兵打到將，石門轟隆一聲往上收。","Checkmate! The cannon fires over the pawn and the stone door rumbles open."],trap:["將死！暗匪愣在原地，你趁機脫身。","Checkmate! The thief freezes and you slip away."],
    open:["石門開了，<b>往下的樓梯就在門後</b>。","The door is open. <b>The stairs down are right behind it.</b>"],dazed:["暗匪暈頭轉向，<b>四回合內</b>不會動。","The thief is dazed and <b>won't move for four turns</b>."],
    dragged:["暗匪把你拖回入口，還搶走你最後撿到的東西、丟回原來的箱子。","The thief drags you back to the entrance and tosses your last find back into its chest."],
    retry:["你被拖回了入口。<b>這次試試從暗匪背後繞過去。</b>","You were dragged back. <b>Try going around behind the thief.</b>"],
    locked:["石門被機關鎖住了，門縫裡有條繩索往地底延伸。<b>先找到機關踏板踩下去。</b>（糧袋可以當炮架：像炮一樣，隔一個子跳過去）","The stone door is locked by a mechanism; a rope runs from the gap into the floor. <b>Find the pressure plate first.</b> (Grain sacks work as a cannon screen: jump over exactly one, like a cannon.)"],
    jump:["你踩著糧袋當炮架，一躍而過——<b>炮要隔一個子才跳得過</b>，兩袋並排就跳不過去。","You vault over the grain sack like a cannon over its screen. <b>A cannon needs exactly one piece to jump over</b>; two sacks in a row are too many."],
    plate:["喀噠一聲，踏板沉了下去，石門那邊傳來機關鬆開的聲音。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and you hear the stone door’s mechanism unlock. <b>Now you can solve the door puzzle.</b>"],
    done:["樓梯往下通到舊城暗渠底下的漕底淤廊。","The stairs lead down to the silted culverts under the old city."],
    spot:["<b>暗匪轉過頭來看見你了！</b>趕快離開紅線——下一步還在紅線上就會被逮住。","<b>The thief turns and spots you!</b> Get off the red line now: if you are still on it next turn, you are caught."]}});
/* ===== W87-2 換層（11/26 Windows Claude 1 分派；文案 story/gemini_app/207 號「換層與共用機制設計」）=====
   jhMzLayer(派,層,o)：登記第二層以後。沒寫的照第一層：寶箱 rew、回門派 back、門內頁入口 hall、材質 tex、擋路擋光跳躍的字元、說話的人 helper；say 疊在第一層上面。
   不照第一層的（每層自己給）：地圖 map、守衛 guards、題目 puz／pool、機關 onStep、碑刻 lore、標題 title、開場 intro／warn。
   存檔鍵 key＝第一層的鍵＋"_L"＋層（中炮門 jhMaze_L2）；修為去重鍵 xpKey＝"maze:派:層"。
   路由：第一層照舊（#/jianghu/maze、#/jianghu/maze/<派>），第二層以後加 ?l=層（jhMzUrl）；網址沒有 ?l 或那一層沒登記＝第一層。
   最深到過第幾層：store「jhMzDeep」＝{派:層}，跟旅程走（05b-save 的 JOURNEY_KEYS 有 m_jhMzDeep）；舊存檔沒有這個鍵，就看各層的通關次數推（第 N 層走完過＝到過第 N+1 層）。
   新地形（開發者 11/26 選單：點地面自動走保留）：lv.avoid＝自動規劃路線不主動踩的字元（水窪、瓦片、灰燼這類；點的終點就是它可以）；
   走到 avoid 的格子、或機關 onStep 回傳 stop:true（滑完、被強制位移）時，自動走和按住搖桿都會停下，要玩家再點一次。
   第二層以後要在 07z9m-lore.js 之後登記（各派自己的檔都在它後面），碑刻 L、暗門 H 才會包到。 */
/* 修為（第一次走完）：開發者 11/26 選單（Windows Claude 1 轉）第二層 +40、第三層 +60，第一層照舊 JH_MZ_XP（30）；去重鍵一律 maze:<派>:<層>（中炮門也一樣）。沒列的層照第三層 */
const JH_MZ_LAYER_XP=[0,30,40,60];
const JH_MZ_CN=["","一","二","三","四","五","六","七","八","九","十"];
const jhMzCn=n=>JH_MZ_CN[n]||String(n);
function jhMzLayer(sid,n,o){const B=JH_MZ_LV[sid];n=Math.floor(+n);if(!B||!(n>=2))return null;o=o||{};const N=jhMzCn(n);
  const L=jhMzMake(sid,Object.assign({rew:B.rew,back:B.back,hall:B.hall,tex:B.tex,avoid:B.avoid,solid:B.solid,opaque:B.opaque,jump:B.jump,helper:B.helper,
    xp:JH_MZ_LAYER_XP[n]||JH_MZ_LAYER_XP[JH_MZ_LAYER_XP.length-1],key:B.key+"_L"+n,xpKey:"maze:"+sid+":"+n,
    lvName:[String(B.lvName[0]).replace("第一層","第"+N+"層"),String(B.lvName[1]).replace("Level 1","Level "+n)]},o,{layer:n,say:Object.assign({},B.say,o.say)}));
  (B.layers||(B.layers={}))[n]=L;if(typeof jhMzLoreWrap==="function")jhMzLoreWrap(L);return L}
/* 第 n 層的設定（沒有就是第一層）；這一派一共幾層（從第一層往下連續登記的） */
function jhMzLvN(sid,n){const B=jhMzLv(sid),k=Math.floor(+n);return k>=2&&B.layers&&B.layers[k]||B}
function jhMzLayers(sid){const B=JH_MZ_LV[sid];let n=1;while(B&&B.layers&&B.layers[n+1])n++;return n}
const jhMzUrl=(sid,n)=>(sid==="central"?"#/jianghu/maze":"#/jianghu/maze/"+sid)+(n>=2?"?l="+Math.floor(n):"");
const jhMzLayerOf=h=>{const m=String(h||"").match(/[?&]l=(\d+)/);return m?Math.max(1,+m[1]):1};
/* 最深到過第幾層（1～這派的層數）；舊存檔：第 N 層走完過也算到過第 N+1 層 */
function jhMzDeep(sid){if(!JH_MZ_LV[sid])return 1;const N=jhMzLayers(sid);let d=1,o=null;try{o=store.get("jhMzDeep",null)}catch(e){}
  if(o&&typeof o==="object"&&Number.isFinite(+o[sid]))d=Math.floor(+o[sid]);
  for(let k=1;k<N;k++)if(jhMzGet(jhMzLvN(sid,k)).clear>0)d=Math.max(d,k+1);return Math.max(1,Math.min(N,d))}
function jhMzDeepSet(sid,n){let o=null;try{o=store.get("jhMzDeep",null)}catch(e){}o=o&&typeof o==="object"&&!Array.isArray(o)?o:{};const v=Math.floor(+n);
  if(v>=1&&!(+o[sid]>=v)){o[sid]=v;try{store.set("jhMzDeep",o)}catch(e){}}return o}
/* 門內頁點迷宮入口：到過第二層以後，先選要下到第幾層（沒到過的鎖住）；選了就換到那一層（從門內頁來，07z9m-fall.js 會播下墜轉場） */
function jhMzPick(sid){jhMzCss();const N=jhMzLayers(sid),D=jhMzDeep(sid),nm=L=>esc(jhL(L.title[0],L.title[1]).replace(/^[^\p{L}\p{N}]+/u,""));
  let h=`<div class="jh-mz-card" role="dialog" aria-modal="true"><h2>${esc(jhL("要下到第幾層？","Which level?"))}</h2><div class="jh-mz-col">`;
  for(let n=1;n<=N;n++){const L=jhMzLvN(sid,n),lock=n>D;h+=`<button type="button" data-n="${n}"${lock?" disabled":""}>${esc(jhL(`第${jhMzCn(n)}層：`,`Level ${n}: `))}${nm(L)}${lock?" 🔒":""}</button>`}
  h+=`</div><div class="jh-mz-row"><button type="button" data-n="0">${esc(jhL("先不下去","Not now"))}</button></div></div>`;
  const o=document.createElement("div");o.className="jh-mz-ov jh-mz-pick";o.innerHTML=h;
  o.addEventListener("click",e=>{if(e.target===o){o.remove();return}const b=e.target.closest&&e.target.closest("button");if(!b||b.disabled)return;const n=+b.dataset.n;o.remove();if(n)jhGo(jhMzUrl(sid,n))});
  document.body.append(o);return o}
/* 門派的設定（沒有＝中炮門）；路由 #/jianghu/maze/<派>，舊網址 #/jianghu/maze＝中炮門。傳進來的已經是某一層的設定（物件）就直接用 */
const jhMzLv=sid=>sid&&typeof sid==="object"?sid:JH_MZ_LV[sid]||JH_MZ_LV.central;
const jhMzSidOf=h=>{const m=String(h||"").split("?")[0].match(/^#\/jianghu\/maze(?:\/([a-z_]+))?$/);return m?(m[1]&&JH_MZ_LV[m[1]]?m[1]:m[1]?null:"central"):null};
/* 11/23 Windows Claude 2 預驗：bgmForce(null) 解除時會重新隨機挑歌，出迷宮從 zheng_2 變成 zheng_5。
   改成進迷宮前記下原本那首（src／era／last），出來時還原後用 bgmSync(false) 同步＝同朝代、已有曲目就不換歌；暫存被清掉會自己重新下載。
   進迷宮前若已經有別頁的指定配樂（BGM.force 不是空的），不記也不還原，照舊交給 bgmForce(null) */
let JH_MZ_PREV=null;
/* W87：sid＝哪一派（播該派的 bgm，預設中炮門那首）；JH_MZ_CUR＝迷宮現在指定的那首，離開時只在還是它的時候才還原 */
let JH_MZ_CUR=null;
function jhMzBgm(on,sid){try{if(typeof bgmForce!=="function"||typeof BGM==="undefined")return;
  if(on){const tr=jhMzLv(sid).bgm||JH_MZ_BGM;if(BGM.force!==tr){if(!(JH_MZ_CUR&&BGM.force===JH_MZ_CUR))JH_MZ_PREV=!BGM.force&&BGM.src?{src:BGM.src,era:BGM.era,last:BGM.last}:null;bgmForce(tr)}JH_MZ_CUR=tr;return}
  if(!JH_MZ_CUR||BGM.force!==JH_MZ_CUR)return;JH_MZ_CUR=null;const p=JH_MZ_PREV;JH_MZ_PREV=null;
  if(p&&typeof bgmSync==="function"){BGM.force=null;BGM.src=p.src;BGM.era=p.era;BGM.last=p.last;bgmSync(false)}else bgmForce(null)}catch(e){}}
/* 11/23 開發者問 iPad mini 等尺寸是否滿版：實測各尺寸都撐滿，但 --topH 沒有人設定、一直用預設 56px，實際頂欄 59px，
   迷宮頁多出 3px＝出現捲軸、方向鍵底部被裁。改成照 #view 實際可用高度反推（頂欄高度＋其他佔掉的），轉向、縮放時跟著重算 */
function jhMzFit(v){try{const mz=v&&v.querySelector(".jh-mz");if(!mz||typeof getComputedStyle!=="function")return;const s=getComputedStyle(v),av=v.clientHeight-(parseFloat(s.paddingTop)||0)-(parseFloat(s.paddingBottom)||0);
  if(av>0)mz.style.setProperty("--topH",Math.max(0,Math.round(window.innerHeight-av))+"px")}catch(e){}}

/* ===== 角色走路（開發者 11/23：「地底迷宮的腳色不是這種移動方式 太不自然了 要正常的移動」）=====
   原本：一張立繪在格子間用指數滑過去（每格一下就到、再頓 150ms）、只左右翻面、方向鈕按一下走一格。
   改成跟星槎、渡口、門內頁一樣的走法（07w-shipwalk.js）：玩家隊伍領頭那位的 3D 模型（XQBot3D.figure，Tripo 模型），走路播 walk、停下播 idle，往哪走就轉身面向哪（上下左右平滑轉）；
   等速走（每格 JH_MZ_SPD 秒），連著走時一格接一格不停頓；方向鈕、方向鍵按住就一直走，放開就停在下一格。
   回合照舊是「踏進一格＝一步」（jhMzStep 不變），暗匪也是等速走。3D 載不到（沒有 WebGL、模型載失敗）就照舊畫立繪，但一樣等速走、走路時左右晃。 */
const JH_MZ_SPD=.26;
/* 等速往目標格走 dt 秒：回 true＝還沒到（o.fx／o.fy 是畫面上的位置，單位＝格）。
   一次差超過 2.5 格（被拖回入口、暗匪暈倒被推開、再走一次）＝直接放到目標格，不穿牆走過去；跳過糧袋是 2 格，照常等速（W71b，原本門檻 1.5 會讓跳躍變瞬移） */
function jhMzGlide(o,tx,ty,dt){if(o.fy==null)o.fy=ty;if(o.fx==null)o.fx=tx;const dx=tx-o.fx,dy=ty-o.fy,d=Math.hypot(dx,dy),s=Math.max(0,dt)/JH_MZ_SPD;
  if(d>2.5||d<=s||d<1e-4){o.fx=tx;o.fy=ty;return false}o.fx+=dx/d*s;o.fy+=dy/d*s;return true}
/* 往 (dx,dy) 走時 3D 角色的轉向（繞 y 軸；0＝面向鏡頭＝往下走，跟 07w shwYaw 同一個方向） */
const jhMzYaw=(dx,dy)=>Math.atan2(dx,dy);
/* ===== 3D 迷宮（開發者 11/23：「地底迷宮的牆壁看起來是平面 可否做成像3D的強」）=====
   整張迷宮用 three.js 畫成真的 3D（跟角色同一套 three.min.js、bot3d.js、同一張 WebGL 畫布）：
     ・牆＝有高度的石磚方塊（牆頂淺、牆面深、磚紋貼圖），地面＝夯土石板貼圖；糧袋是一堆 3D 麻袋、箱子是朱紅木箱、石門是一扇門板、樓梯往下挖、壁燈是燈柱；
     ・角色（隊伍領頭那位的 3D 模型）真的站在地面上，腳下一圈接地影子；暗匪是黑衣人、紅眼，看得到的地方地上一片紅光；
     ・鏡頭跟著角色、從斜上方往下看（俯角 64°），手機直拿大約看得到 8 格寬；牆高 0.85 格：預覽站實看時 1.05 格高、56° 俯角會把站在牆後面的角色整個擋住（牆擋住後面 h÷tan(俯角)＝0.71 格，角色腳在 0.5 格），改成擋 0.41 格、腳露得出來；
     ・黑暗照舊：每一格亮多少照 jhMzLight（手上的燈半徑約 3 格、牆擋光、點亮的壁燈），沒看過的全黑、走過的留淡淡的輪廓；
       手上的燈另外是一盞暖色點光源、點亮的壁燈各一盞，讓牆面有明暗。
   玩法、回合、殘局、存檔一行都不動；點地面用射線找到點的是哪一格。3D 載不起來（沒有 WebGL、three 載不到）照舊畫平面版（配色＋立繪）。 */
/* ===== W87c 回味感（開發者 11/24：「禮拜四先換像素材質」「45 度斜俯視」「油燈快熄時會閃」）===== */
/* 斜俯視：鏡頭從東南方往西北看（水平轉 45 度）、俯角 38 度，正交投影（遠近一樣大，格子是菱形） */
const JH_MZ_ISO={yaw:Math.PI/4,el:38*Math.PI/180};
/* 方向鈕的字：[鍵, 平面版, 斜俯視]——北（往上）在畫面右上、東在右下、南在左下、西在左上 */
const JH_MZ_PADG=[["u","▲","↗"],["r","▶","↘"],["d","▼","↙"],["l","◀","↖"]];
/* 減少動態：系統設定「減少動態」打開就不閃、火苗不晃 */
const jhMzRM=()=>{try{return!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)}catch(e){return false}};
/* 燈火亮度倍率（1 左右）：細細的不規則晃動，偶爾暗一下（約每 180ms 抽一次，4% 機率暗到 .55、6% 機率暗到 .8）；seed＝哪一盞燈（各閃各的）；rm＝減少動態，固定 1 */
function jhMzFlick(now,seed,rm){if(rm)return 1;const h=i=>{const q=Math.sin(i*127.1+seed*311.7)*43758.5453;return q-Math.floor(q)};
  const k=Math.floor(now/180+seed*13),r=h(k),dip=r<.04?.55:r<.1?.8:1;return dip*(1+Math.sin(now/170+seed)*.05+Math.sin(now/53+seed*2)*.03)}
/* 像素材質：lv.tex＝{floor, side, top}（網址）；載得到就換上（最近點取樣、不做 mipmap、一格對應整張圖一次），載不到就留著程式畫的那張 */
/* W106（11/24 iMac Claude 2 預驗 #139 發現）：TextureLoader 用不掛在頁面上的 img 載圖，沒有 service worker 的網頁版走不到 00-util 的 CDN 補抓，
   材質還沒進網站時一律退回程式畫的磚紋。比照 #129 掉入迷宮轉場：同源載不到，就改向 XQ_CDN＋xqCdnRel 要一次（cdn＝1 是第二次，不再重試） */
function jhMzTexLoad(T3,url,mat,texs,cdn){if(!url||!T3||!T3.TextureLoader||!mat)return false;
  const retry=()=>{if(cdn)return;try{const r=typeof xqCdnRel==="function"&&xqCdnRel(url);if(r&&typeof XQ_CDN==="string")jhMzTexLoad(T3,XQ_CDN+r,mat,texs,1)}catch(e){}};
  try{new T3.TextureLoader().load(url,t=>{t.magFilter=T3.NearestFilter;t.minFilter=T3.NearestFilter;t.generateMipmaps=false;if(t.wrapS!=null){t.wrapS=t.wrapT=T3.ClampToEdgeWrapping}if(t.repeat&&t.repeat.set)t.repeat.set(1,1);
    if(T3.sRGBEncoding!=null)t.encoding=T3.sRGBEncoding;const old=mat.map;mat.map=t;mat.needsUpdate=true;if(texs)texs.push(t);if(old&&old.dispose&&(!texs||!texs.includes(old)))old.dispose()},undefined,retry)}catch(e){return false}return true}
async function jhMzWorld3(box,c,S){
  if(typeof loadScript!=="function")throw 0;const off=typeof OFF!=="undefined"&&OFF;
  await loadScript(off?"three.min.js":"/m/three.min.js");await loadScript((off?"bot3d.js":"/m/bot3d.js")+"?v="+encodeURIComponent(window.XQ_BUILD||""));
  const T3=window.THREE;if(!T3||!window.XQBot3D||!XQBot3D.figure)throw 0;
  if(typeof shwTripo==="function")await shwTripo();if(!box.isConnected)throw 0;
  const era=store.get("era","classic"),tr=c&&typeof TRIPO!=="undefined"&&TRIPO[c];
  const look=tr?{p:typeof myPc==="function"?myPc():undefined,e:era,g:9,glb:`data/tripo_app/${c}.glb`,ring:tr}:((typeof myLook==="function"&&myLook())||{p:typeof botPc==="function"?botPc():undefined,e:era,g:9});
  const B=XQBot3D.figure(look);if(look.glb){if(!B.glbP)throw 0;await B.glbP}if(!box.isConnected)throw 0;
  const r=new T3.WebGLRenderer({antialias:true,powerPreference:"low-power"});r.setPixelRatio(Math.min(2,devicePixelRatio||1));if(T3.sRGBEncoding!=null)r.outputEncoding=T3.sRGBEncoding;r.setClearColor(0x000000,1);
  const cv=r.domElement;cv.className="jh-mz-3d";box.append(cv);
  const col=h=>{const k=new T3.Color(h);return k.convertSRGBToLinear?k.convertSRGBToLinear():k};
  const sc=new T3.Scene(),amb=new T3.AmbientLight(0xFFE6C8,.5);sc.add(amb);const key=new T3.DirectionalLight(0xFFD9A8,.6);key.position.set(-3,9,5);sc.add(key);
  const lamp=new T3.PointLight(0xFFAA55,1.3,7,1.3);sc.add(lamp);
  const texs=[],rr=i=>{const q=Math.sin(i*127.1+11.3)*43758.5453;return q-Math.floor(q)};
  const tx=(w,h,fn)=>{const k=document.createElement("canvas");k.width=w;k.height=h;fn(k.getContext("2d"),w,h);const t=new T3.CanvasTexture(k);if(T3.sRGBEncoding!=null)t.encoding=T3.sRGBEncoding;t.anisotropy=4;texs.push(t);return t};
  /* 地面：亮的暖色夯土石板；牆面：深色石磚；牆頂：淺一點的灰褐石 */
  const floorT=tx(128,128,(g,w,h)=>{g.fillStyle="#9a7f5d";g.fillRect(0,0,w,h);for(let i=0;i<240;i++){const lt=rr(i)>.5;g.fillStyle=lt?`rgba(255,232,190,${.05+rr(i+9)*.07})`:`rgba(40,26,12,${.06+rr(i+9)*.08})`;g.fillRect(rr(i+1)*w,rr(i+2)*h,2+rr(i+3)*5,2+rr(i+4)*3)}
    g.strokeStyle="rgba(60,40,20,.6)";g.lineWidth=5;g.strokeRect(2.5,2.5,w-5,h-5);g.lineWidth=1.5;g.beginPath();g.moveTo(w*.62,5);g.lineTo(w*.7,h*.5);g.stroke()});
  const brickT=tx(128,128,(g,w,h)=>{g.fillStyle="#1e1813";g.fillRect(0,0,w,h);for(let y=0;y<4;y++){const o=y%2?w/4:0;for(let x=-1;x<3;x++){const v=62+rr(y*7+x)*24|0;g.fillStyle=`rgb(${v},${v*.86|0},${v*.72|0})`;g.fillRect(o+x*w/2+3,y*h/4+3,w/2-6,h/4-6)}}});
  const topT=tx(64,64,(g,w,h)=>{g.fillStyle="#6a5e50";g.fillRect(0,0,w,h);g.fillStyle="rgba(0,0,0,.2)";for(let i=0;i<40;i++)g.fillRect(rr(i)*w,rr(i+5)*h,3,2);g.strokeStyle="rgba(170,150,118,.7)";g.lineWidth=3;g.strokeRect(1.5,1.5,w-3,h-3)});
  const shT=tx(64,64,(g,w,h)=>{const gr=g.createRadialGradient(w/2,h/2,0,w/2,h/2,w/2);gr.addColorStop(0,"rgba(0,0,0,.75)");gr.addColorStop(.55,"rgba(0,0,0,.45)");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,w,h)});
  const MAP=S.lv.map,DYN=S.lv.dyn||"",WH=.85,cells=[],walls=[],doorPick=[];for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){const ch=MAP[y][x];if(ch==="#")walls.push([x,y]);else if(ch!==">")cells.push([x,y])}
  const m4=new T3.Matrix4(),cK=new T3.Color();
  const fg=new T3.PlaneGeometry(1,1);fg.rotateX(-Math.PI/2);
  const fl=new T3.InstancedMesh(fg,new T3.MeshLambertMaterial({map:floorT}),cells.length);
  cells.forEach(([x,y],i)=>{m4.makeTranslation(x+.5,0,y+.5);fl.setMatrixAt(i,m4);fl.setColorAt(i,cK.setRGB(0,0,0))});sc.add(fl);
  const wg=new T3.BoxGeometry(1,WH,1);wg.translate(0,WH/2,0);
  const side=new T3.MeshLambertMaterial({map:brickT}),topM=new T3.MeshLambertMaterial({map:topT});
  const flM=fl.material,TX=S.lv.tex||{};jhMzTexLoad(T3,TX.floor,flM,texs);jhMzTexLoad(T3,TX.side,side,texs);jhMzTexLoad(T3,TX.top,topM,texs);
  const wl=new T3.InstancedMesh(wg,[side,side,topM,side,side,side],walls.length);
  walls.forEach(([x,y],i)=>{m4.makeTranslation(x+.5,0,y+.5);wl.setMatrixAt(i,m4);wl.setColorAt(i,cK.setRGB(0,0,0))});sc.add(wl);
  /* 物件：材質記下原色，每一格照亮度乘上去；on()＝現在還在不在（箱子撿走、門開了就不畫） */
  const objs=[],lam=hex=>{const m=new T3.MeshLambertMaterial({color:col(hex)});m.userData.base=m.color.clone();return m};
  const mesh=(geo,mat,x,y,z)=>{const o=new T3.Mesh(geo,mat);o.position.set(x,y,z);return o};
  const add=(g,x,y,on)=>{g.position.set(x+.5,0,y+.5);sc.add(g);const mats=[];g.traverse(o=>{if(o.material&&o.material.userData&&o.material.userData.base&&!mats.includes(o.material))mats.push(o.material)});const it={g,x,y,mats,on};objs.push(it);return it};
  const sackG=new T3.SphereGeometry(.21,14,10),tieG=new T3.CylinderGeometry(.04,.05,.07,8),sackM=lam("#b08850"),tieM=lam("#5a3c18");
  const flames=[],lights={},sparks=[];
  const H3={T3,mesh,lam,WH},dyn=[];
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){const ch=MAP[y][x];
    /* W87：該派自己的障礙外觀（JH_MZ_OBJ[字元]）；會被推動的字元（lv.dyn）另外放進 dyn，每一幀照目前格子擺 */
    if(JH_MZ_OBJ[ch]){const g=JH_MZ_OBJ[ch](H3);if(DYN.includes(ch)){const it=add(g,x,y,()=>true);it.dyn=ch;dyn.push(it)}else add(g,x,y,()=>S.grid[y][x]===ch)}
    else if(ch==="S"){const g=new T3.Group();for(const[a,b,z]of[[-.2,.16,.18],[.2,.16,.18],[0,.16,-.16],[-.11,.43,0],[.14,.41,-.03]]){const s=mesh(sackG,sackM,a,b,z);s.scale.set(1,.78,1);g.add(s);g.add(mesh(tieG,tieM,a,b+.17,z))}add(g,x,y,()=>true)}
    else if(ch==="C"){const g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.6,.34,.42),lam("#8c2a1e"),0,.17,0));g.add(mesh(new T3.BoxGeometry(.63,.07,.45),lam("#a8342a"),0,.36,0));g.add(mesh(new T3.BoxGeometry(.08,.1,.02),lam("#d9a441"),0,.25,.22));
      /* 11/23 Windows Claude 2 預驗 #92：寶箱 (7,9) 南邊是牆，俯角下只看得到紅色頂面、看不出是箱子。
         ①箱蓋頂面加金色十字扣條，從正上方也認得出是箱子；②箱子上方浮一顆小金光（比牆頂 0.85 高），慢慢轉、上下浮，被南牆擋住也看得到；撿走就跟著箱子消失 */
      const gold=lam("#d9a441");g.add(mesh(new T3.BoxGeometry(.64,.025,.09),gold,0,.405,0));g.add(mesh(new T3.BoxGeometry(.09,.025,.48),gold,0,.405,0));
      const gm=new T3.Mesh(new T3.OctahedronGeometry(.085),new T3.MeshBasicMaterial({color:0xFFD36B}));gm.position.set(0,1.05,0);g.add(gm);sparks.push({gm,x});
      add(g,x,y,()=>S.grid[y][x]==="C")}
    else if(ch==="T"){const g=new T3.Group();g.add(mesh(new T3.CylinderGeometry(.05,.07,.9,8),lam("#3a2c1e"),0,.45,0));g.add(mesh(new T3.CylinderGeometry(.13,.08,.09,10),lam("#2b2118"),0,.93,0));
      const fm=new T3.Mesh(new T3.SphereGeometry(.09,10,8),new T3.MeshBasicMaterial({color:0xFFB347}));fm.position.set(0,1.05,0);fm.scale.set(1,1.6,1);g.add(fm);flames.push({fm,k:y*S.W+x,x,y});add(g,x,y,()=>true)}
    else if(ch==="D"){const g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,WH,.3),lam("#4a3220"),0,WH/2,0));const cm=lam("#c9a466");
      const beam=mesh(new T3.BoxGeometry(.06,.62,.02),cm,0,.5,.16);beam.rotation.z=.6;g.add(beam);g.add(mesh(new T3.BoxGeometry(.5,.05,.02),cm,0,.3,.16));g.add(mesh(new T3.BoxGeometry(.05,.3,.02),cm,-.12,.42,.16));
      add(g,x,y,()=>S.grid[y][x]==="D");doorPick.push({g,x,y})}   /* 11/26 開發者 iPad 影片：點門板顯示「走不到那裡」——門板不在點選範圍，射線穿過去打到後面的牆。門板也算進 pick */
    else if(ch==="P"){const g=new T3.Group(),pm=lam("#8a6a3a"),em=lam("#c9a466");g.add(mesh(new T3.BoxGeometry(.72,.05,.72),pm,0,.025,0));const b1=mesh(new T3.BoxGeometry(.05,.02,.4),em,0,.06,0);b1.rotation.y=.6;g.add(b1);g.add(mesh(new T3.BoxGeometry(.4,.02,.05),em,0,.06,.1));
      /* 機關踏板（W71b）：踩下去變金色、沉一點 */
      const it=add(g,x,y,()=>true);it.plate=pm}
    else if(ch===">"){const g=new T3.Group(),sm=lam("#3a2e22"),dm=lam("#120d09");for(let i=0;i<4;i++)g.add(mesh(new T3.BoxGeometry(.84,.14,.25),sm,0,-.07-.14*i,-.38+.25*i));
      g.add(mesh(new T3.BoxGeometry(1,.06,1),dm,0,-.62,0));g.add(mesh(new T3.BoxGeometry(.08,.62,1),dm,-.46,-.31,0));g.add(mesh(new T3.BoxGeometry(.08,.62,1),dm,.46,-.31,0));add(g,x,y,()=>true)}}
  /* 暗匪：黑衣、兜帽、紅眼（暈倒時眼睛變灰）；看得到的格子地上一片紅光 */
  /* W87：每一個守衛一組模型（顏色照 JH_MZ_KIND[kind].look） */
  const gds=(S.guards||[]).map(G=>{const lk=jhMzKind(G).look||JH_MZ_KIND.rook.look,gd=new T3.Group(),gdB=new T3.Group();gd.add(gdB);gdB.add(mesh(new T3.CylinderGeometry(.18,.25,.58,12),lam(lk.body),0,.3,0));gdB.add(mesh(new T3.SphereGeometry(.17,12,10),lam(lk.head),0,.73,0));
    const eyeM=new T3.MeshBasicMaterial({color:lk.eye});for(const ex of[-.06,.06])gdB.add(mesh(new T3.BoxGeometry(.05,.03,.02),eyeM,ex,.75,.16));sc.add(gd);return{G,gd,gdB,eyeM,eye:lk.eye}});
  const sightG=new T3.PlaneGeometry(.9,.9);sightG.rotateX(-Math.PI/2);const sightM=new T3.MeshBasicMaterial({color:0xC83223,transparent:true,opacity:.35,depthWrite:false});
  const sights=[];for(let i=0;i<24;i++){const o=new T3.Mesh(sightG,sightM);o.position.y=.012;o.visible=false;sc.add(o);sights.push(o)}
  /* 角色：照模型實際高度縮到約 1.1 格，腳底踩在地面（y＝0），腳下接地影子 */
  const root=new T3.Group();root.rotation.order="YXZ";root.add(B.bot);sc.add(root);root.updateMatrixWorld(true);
  /* 原點對準「腳」而不是整個模型的中心（iMac Claude 1 iOS 預驗：側身時腳底和影子空了約半格——披風、武器把外框中心拉開，轉身後腳就偏離格子中心）：
     取模型最低 8% 高度裡的頂點，x、z 平均＝兩腳中間；取不到就照舊用外框中心 */
  const bx=new T3.Box3().setFromObject(B.bot),ct=bx.getCenter(new T3.Vector3()),hM=(bx.max.y-bx.min.y)||1;
  try{const v=new T3.Vector3(),lim=bx.min.y+hM*.08;let sx=0,sz=0,n=0;B.bot.updateMatrixWorld(true);
    B.bot.traverse(o=>{const p=o.isMesh&&o.geometry&&o.geometry.attributes&&o.geometry.attributes.position;if(!p)return;const st=Math.max(1,Math.floor(p.count/4000));
      for(let i=0;i<p.count;i+=st){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y<=lim){sx+=v.x;sz+=v.z;n++}}});
    if(n>=6){ct.x=sx/n;ct.z=sz/n}}catch(e){}
  B.bot.position.x-=ct.x;B.bot.position.z-=ct.z;B.bot.position.y-=bx.min.y;const by=B.bot.position.y;
  const wrap=new T3.Group();wrap.add(root);wrap.scale.setScalar(1.1/hM);sc.add(wrap);
  /* 牆不動（開發者 11/23：「為什麼腳色走過去的時候 牆壁也會跟著動」→ 拿掉「前方的牆變矮」）。角色走到牆後面時，被擋住的部分畫成一層淡淡的暖色剪影：
     角色只放在第 1 層：①先畫場景（第 0 層：牆、地、物件）②剪影：只對場景的深度比，角色比場景遠（GreaterDepth）的地方才上色＝被牆擋住的部分 ③再正常畫角色。
     預覽站實看：原本先畫角色再畫剪影，角色自己背面被自己正面擋住也算「被擋」，整個人蓋上一層米色——所以剪影一定要在畫角色之前、只跟場景比。燈也要開第 1 層，不然角色是黑的 */
  wrap.traverse(o=>o.layers.set(1));for(const l of[amb,key,lamp])l.layers.enable(1);r.autoClear=false;
  const sil=new T3.MeshBasicMaterial({color:col("#ffcf8a"),transparent:true,opacity:.5,depthWrite:false,depthFunc:T3.GreaterDepth});
  const shG=new T3.PlaneGeometry(.95,.95);shG.rotateX(-Math.PI/2);const sh=new T3.Mesh(shG,new T3.MeshBasicMaterial({map:shT,transparent:true,depthWrite:false}));sh.position.y=.01;sc.add(sh);
  const clips=B.mixer&&B.clips||null;let cur=null,yawR=0,t=0,tgx=null,tgz=null,cw=0,ch=0;
  const anim=n=>{if(!clips)return;const a=clips[n]||clips.idle;if(!a||a===cur)return;a.reset().fadeIn(n==="idle"?.25:.12).play();if(cur)cur.fadeOut(.15);cur=a};anim("idle");
  /* W87c：正交斜俯視（JH_MZ_ISO）；看得到幾格照原本的「手機至少寬 7.6 格、每格約 72px」 */
  const RM=jhMzRM(),EL=JH_MZ_ISO.el,YW=JH_MZ_ISO.yaw,cam=new T3.OrthographicCamera(-5,5,5,-5,.1,120);
  const ray=new T3.Raycaster(),gp=new T3.Plane(new T3.Vector3(0,1,0),0);
  const bright=(L,x,y)=>{const i=y*S.W+x;if(x<0||y<0||x>=S.W||y>=S.H||!S.seen.has(i))return 0;const q=L[i];return q<.12?.26:Math.min(1.05,.26+q*.85)};
  return{
    draw(dt,now,L,walk,yaw){t+=dt;const w=box.clientWidth,h=box.clientHeight;if(!w||!h)return;
      if(w!==cw||h!==ch){cw=w;ch=h;r.setSize(w,h);const asp=w/h,hh=Math.max(Math.max(7.6,w/72)/(2*asp),Math.max(6.4,h/72)*Math.sin(EL)/2);cam.left=-hh*asp;cam.right=hh*asp;cam.top=hh;cam.bottom=-hh;cam.updateProjectionMatrix()}
      const P=S.player,px=P.fx+.5,pz=P.fy+.5;
      if(tgx===null||Math.hypot(px-tgx,pz-tgz)>3){tgx=px;tgz=pz}else{const k=Math.min(1,dt*7);tgx+=(px-tgx)*k;tgz+=(pz-tgz)*k}
      /* 看得到幾格：手機至少寬 7.6、高 6.4 格；大螢幕照「每格約 72px」放寬（Windows Claude 2 預驗 #92：平板寬鏡頭太近、只看到約 6×5 格） */
      const D=40;cam.position.set(tgx+D*Math.cos(EL)*Math.sin(YW),D*Math.sin(EL),tgz+D*Math.cos(EL)*Math.cos(YW));cam.lookAt(tgx,0,tgz);
      cells.forEach(([x,y],i)=>fl.setColorAt(i,cK.setScalar(bright(L,x,y))));fl.instanceColor.needsUpdate=true;
      walls.forEach(([x,y],i)=>wl.setColorAt(i,cK.setScalar(bright(L,x,y))));wl.instanceColor.needsUpdate=true;
      for(const o of objs){const b=bright(L,o.x,o.y);o.g.visible=b>0&&o.on();if(o.g.visible)for(const m of o.mats)m.color.copy(m.userData.base).multiplyScalar(b)}
      for(const s of sparks){s.gm.rotation.y=now/600+s.x;s.gm.position.y=1.05+Math.sin(now/400+s.x)*.06}
      for(const f of flames){const on=S.lit.has(f.k);f.fm.visible=on;if(on){const fk=jhMzFlick(now,f.k,RM);f.fm.scale.set(fk,(RM?1.6:1.6+Math.sin(now/90+f.x)*.18)*fk,fk);if(!lights[f.k]&&Object.keys(lights).length<4){const pl=new T3.PointLight(0xFFA040,.9,4.2,1.5);pl.position.set(f.x+.5,1.1,f.y+.5);pl.layers.enable(1);sc.add(pl);lights[f.k]=pl}if(lights[f.k])lights[f.k].intensity=.9*fk}}
      let si=0;for(const q of gds){const G=q.G;q.gd.visible=true;   /* W87a：守衛在暗處也看得到（紅眼一直亮） */
        q.gd.position.set(G.fx+.5,0,(G.fy==null?G.y:G.fy)+.5);q.gdB.rotation.y=G.dx>0?Math.PI/2:G.dx<0?-Math.PI/2:G.dy<0?Math.PI:0;q.eyeM.color.setHex(G.stun?0x8A8A8A:q.eye);
        for(const c of jhMzSight(S,G)){if(si>=sights.length)break;const o=sights[si++];o.visible=true;o.position.set(c.x+.5,.012,c.y+.5)}   /* W87a：紅線一律畫（原本只在夠亮的格子畫，暗處被看到時玩家看不到紅線） */}
      for(;si<sights.length;si++)sights[si].visible=false;
      /* 會被推動的障礙：照目前格子重新擺（同一種字元依序對應） */
      if(dyn.length){const at={};for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){const c=S.grid[y][x];if(DYN.includes(c))(at[c]||(at[c]=[])).push([x,y])}const used={};for(const o of dyn){const L2=at[o.dyn]||[],j=used[o.dyn]=(used[o.dyn]||0);used[o.dyn]++;const q2=L2[j];o.g.visible=!!q2&&bright(L,q2[0],q2[1])>0;if(q2){o.x=q2[0];o.y=q2[1];o.g.position.set(q2[0]+.5,0,q2[1]+.5)}}}
      lamp.position.set(px,1.25,pz);lamp.intensity=1.25*jhMzFlick(now,-1,RM);   /* W87c：手上燈火也會偶爾暗一下（減少動態固定） */
      let dw=yaw-yawR;while(dw>Math.PI)dw-=Math.PI*2;while(dw<-Math.PI)dw+=Math.PI*2;yawR+=dw*Math.min(1,dt*(walk?16:9));root.rotation.y=yawR;const jd=Math.hypot(P.x-P.fx,P.y-P.fy);if(P.jump&&jd<.01)P.jump=0;wrap.position.set(px,P.jump?Math.sin(Math.PI*(1-Math.min(1,jd/2)))*.55:0,pz);sh.position.set(px,.01,pz);
      for(const o of objs)if(o.plate){o.plate.userData.base.copy(col(S.plate?"#d9a441":"#8a6a3a"));o.g.position.y=S.plate?-.02:0}
      if(clips){anim(walk?"walk":"idle");if(walk&&cur)cur.timeScale=1.7;B.mixer.update(dt)}
      else{const ph=t*14;root.position.y=walk?Math.abs(Math.sin(ph))*hM*.04:0;root.rotation.z=walk?Math.sin(ph)*.07:0;
        if(B.legs&&B.legs.length===2)B.legs.forEach((l,i)=>l.rotation.x=walk?Math.sin(ph)*.6*(i?1:-1):0);if(B.arms&&B.arms.length===2)B.arms.forEach((a,i)=>a.rotation.x=walk?Math.sin(ph)*.5*(i?-1:1):0)}
      B.bot.position.y=by;r.clear();cam.layers.set(0);r.render(sc,cam);cam.layers.set(1);sc.overrideMaterial=sil;r.render(sc,cam);sc.overrideMaterial=null;r.render(sc,cam);cam.layers.set(0)},
    /* 點畫面：先打牆和地面（點到牆頂就是那面牆），都沒打到再算地面高度 */
    pick(x,y){const b=cv.getBoundingClientRect();if(!b.width)return null;ray.setFromCamera(new T3.Vector2((x-b.left)/b.width*2-1,-((y-b.top)/b.height)*2+1),cam);
      const dg=doorPick.filter(d=>d.g.visible&&S.grid[d.y][d.x]==="D"),hit=ray.intersectObjects([wl,fl,...dg.map(d=>d.g)],true)[0];
      if(hit&&hit.instanceId==null){const d=dg.find(d=>{let o=hit.object;while(o){if(o===d.g)return true;o=o.parent}return false});if(d)return{x:d.x,y:d.y}}
      if(hit&&hit.instanceId!=null){const q=(hit.object===wl?walls:cells)[hit.instanceId];if(q)return{x:q[0],y:q[1]}}
      const p=new T3.Vector3();if(!ray.ray.intersectPlane(gp,p))return null;return{x:Math.floor(p.x),y:Math.floor(p.z)}},
    dispose(){try{cv.remove()}catch(e){}try{texs.forEach(k=>k.dispose());r.dispose();r.forceContextLoss()}catch(e){}}}}

/* ===== 純邏輯（測試用 vm 直接跑這一段）===== */
/* sid＝哪一派（沒給＝中炮門）；run＝這是第幾次走；ptr＝題庫指標 {door,trap}（存檔帶進來：上一輪出到哪一題，這一輪接著出，換輪第一題不會跟上一輪最後一題一樣；沒給就用 run） */
function jhMzNew(sid,run,ptr){const lv=jhMzLv(sid),bag={};for(const r of lv.rew)bag[r.k]=0;
  const S={lv,sid:lv.sid,W:lv.map[0].length,H:lv.map.length,seen:new Set(),lit:new Set(),bag,doorOpen:false,plate:false,got:[],fails:{door:0,trap:0},turn:0,done:false,chests:new Set(),run:Math.max(0,Math.floor(+run||0)),pick:{door:0,trap:0},cur:{},pz:null};
  /* #105 審查建議：ptr 不是物件（null、數字）就當沒給；超過 1e6 的指標當壞值（加 1 會被精度吃掉、一直出同一題） */
  const R=S.run,pp=ptr&&typeof ptr==="object"?ptr:{},okp=v=>v!=null&&v!==""&&Number.isFinite(+v)&&+v>=0&&+v<1e6;S.base={door:okp(pp.door)?Math.floor(+pp.door):R,trap:okp(pp.trap)?Math.floor(+pp.trap):R};
  jhMzReset(S,true);return S}
function jhMzReset(S,full){S.grid=S.lv.map.map(r=>r.split(""));
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){if(S.grid[y][x]==="@"){S.start={x,y};S.grid[y][x]="."}if(full&&S.grid[y][x]==="C")S.chests.add(y*S.W+x)}
  if(full)S.chest0=S.chests.size;
  if(!full)for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++)if(S.grid[y][x]==="C"&&!S.chests.has(y*S.W+x))S.grid[y][x]=".";
  if(S.doorOpen)jhMzOpenDoor(S);
  S.player={x:S.start.x,y:S.start.y,fx:S.start.x,fy:S.start.y,face:1};
  S.guards=S.lv.guards.map(g=>Object.assign({dx:0,dy:0},g,{stun:0,fx:g.x,fy:g.y}));S.guard=S.guards[0]||null;S.pz=null;
  return S}
function jhMzOpenDoor(S){for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++)if(S.grid[y][x]==="D")S.grid[y][x]=".";S.doorOpen=true}
function jhMzCell(S,x,y){return S.grid[y]&&S.grid[y][x]}
function jhMzSolid(S,x,y){const c=jhMzCell(S,x,y);return c===undefined||(S.lv?S.lv.solid:"#SD").includes(c)}
function jhMzOpaque(S,x,y){const c=jhMzCell(S,x,y);return c===undefined||(S.lv?S.lv.opaque:"#D").includes(c)}
/* 視線（Bresenham）：中間格不能擋光，起點、終點不算 */
function jhMzLos(S,x0,y0,x1,y1){let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,e=dx-dy,x=x0,y=y0;
  while(!(x===x1&&y===y1)){const e2=2*e;if(e2>-dy){e-=dy;x+=sx}if(e2<dx){e+=dx;y+=sy}if(x===x1&&y===y1)break;if(jhMzOpaque(S,x,y))return false}return true}
/* 光度 0～1：手上的燈（半徑約 3 格，會微微閃）＋點亮的壁燈 */
function jhMzLight(S,x,y,now){let v=0;const t=now||0,R=3.2+Math.sin(t/170)*.12+Math.sin(t/53)*.05,P=S.player;
  const d=Math.hypot(x-P.fx,y-P.fy);if(d<R+1&&jhMzLos(S,P.x,P.y,x,y))v=Math.max(v,Math.min(1,(R+.6-d)/1.6));
  for(const k of S.lit){const lx=k%S.W,ly=(k/S.W)|0,dd=Math.hypot(x-lx,y-ly);if(dd<3.6&&jhMzLos(S,lx,ly,x,y))v=Math.max(v,Math.min(1,(3.9-dd)/1.5)*.9)}
  return Math.max(0,v)}
/* 守衛看得到的格子 [{x,y}]（照 JH_MZ_KIND[kind].sight；暈的時候看不到）。G 沒給＝第一個守衛 */
const jhMzKind=G=>JH_MZ_KIND[G&&G.kind]||JH_MZ_KIND.rook;
function jhMzSight(S,G){G=G||S.guard;if(!G||G.stun>0)return[];return jhMzKind(G).sight(S,G)}
function jhMzGuardStep(S){for(const G of S.guards||[]){if(G.stun>0){G.stun--;continue}jhMzKind(G).step(S,G)}}
/* 被逮到：任何一個沒暈的守衛跟玩家同一格、或看得到玩家；逮到的那一個記在 S.caughtBy（解開陷阱時暈的是它） */
/* #105 審查建議：多個守衛時先找「站在玩家那格」的，再找看得到的（不然第一個只是看到、第二個已經踩到玩家時會判成 spot） */
function jhMzCaught(S){const P=S.player,L=(S.guards||[]).filter(G=>!(G.stun>0));
  const on=L.find(G=>G.x===P.x&&G.y===P.y)||L.find(G=>jhMzSight(S,G).some(q=>q.x===P.x&&q.y===P.y));if(on){S.caughtBy=on;return true}return false}
/* 走一步（dx,dy＝0,0 是原地等一回合）。回傳事件：wall 撞牆不算回合；door 碰到石門（開殘局）；finish 走到樓梯；trap 被暗匪逮到；move 一般 */
function jhMzStep(S,dx,dy){if(S.done)return{ev:"done"};const P=S.player,nx=P.x+dx,ny=P.y+dy,c=jhMzCell(S,nx,ny),out={ev:"move",torch:false,chest:""};
  if(dx)P.face=dx;
  /* W71b（開發者 11/23「列成 W71 下一步」→「好，接著做」）：石門先要踩過機關踏板才解得開；沒踩過碰門＝locked（不算回合、不開殘局） */
  if(c==="D")return S.plate?{ev:"door"}:{ev:"locked"};
  /* W87：該派自己的機關（例如推箱子）先判斷；回傳事件就照它（它自己負責移動與算回合），null＝照下面預設走 */
  if(typeof S.lv.onStep==="function"&&(dx||dy)){const h=S.lv.onStep(S,dx,dy,c);if(h)return h}
  /* 糧袋當炮架：往糧袋走、糧袋後面那一格走得進去，就像炮一樣「隔一個子」跳過去（算一步）；兩袋並排、後面是牆或石門都跳不過（W87：跳得過的字元照該派 jump 設定，中炮門是 S） */
  if(dx||dy){if(c&&S.lv.jump.includes(c)&&!jhMzSolid(S,nx+dx,ny+dy)){P.x=nx+dx;P.y=ny+dy;P.jump=1;out.ev="jump"}else if(jhMzSolid(S,nx,ny))return c&&S.lv.jump.includes(c)?{ev:"wall",block:"jump"}:{ev:"wall"};   /* W71e①：撞到跳不過的糧袋，畫面改說「炮只能隔一個子跳」 */else{P.x=nx;P.y=ny}}
  S.turn++;
  for(const[a,b]of[[0,0],[1,0],[-1,0],[0,1],[0,-1]]){const x=P.x+a,y=P.y+b;if(jhMzCell(S,x,y)==="T"&&!S.lit.has(y*S.W+x)){S.lit.add(y*S.W+x);out.torch=true}}
  const k=P.y*S.W+P.x;
  if(S.chests.has(k)){S.chests.delete(k);S.grid[P.y][P.x]=".";const RW=S.lv.rew,r=RW[Math.max(0,(S.chest0||RW.length)-S.chests.size-1)%RW.length];S.bag[r.k]++;out.chest=r.k;(S.got||(S.got=[])).push({k,r:r.k})}
  if(jhMzCell(S,P.x,P.y)==="P"&&!S.plate){S.plate=true;out.plate=true}
  if(jhMzCell(S,P.x,P.y)===">"){S.done=true;out.ev="finish";return out}
  if(jhMzCaught(S)){out.ev="trap";return out}
  /* #105 審查（iMac Claude 1 的新代理人）：守衛碰牆掉頭、正好走到玩家那格時，掉頭前地上沒有紅線，玩家沒有預警就被抓。
     改成：守衛這一步會踩到玩家、而且走之前看不到玩家（沒有紅線），這一回合只轉身、不前進（保留新朝向），給 spot；下一回合玩家還在紅線上才抓 */
  const pre=(S.guards||[]).map(G=>({x:G.x,y:G.y,saw:G.stun>0?false:jhMzSight(S,G).some(q=>q.x===P.x&&q.y===P.y)}));
  jhMzGuardStep(S);
  let held=false;(S.guards||[]).forEach((G,i)=>{const b=pre[i];if(G.stun>0||!b||b.saw)return;if(G.x===P.x&&G.y===P.y&&(b.x!==P.x||b.y!==P.y)){G.x=b.x;G.y=b.y;held=true}});
  if(held){S.caughtBy=null;out.ev="spot";return out}
  /* W87a（開發者：「玩家沒有走到暗匪那邊 就會觸發被暗匪抓住」）：守衛走這一步（轉身、往前）之後才看到玩家，先提醒（spot），不直接抓——
     玩家下一步還留在視線裡（或原地等）才抓；守衛走之前就看得到玩家、這一步走到玩家那一格才直接抓（看不到的話見上面：只轉身、給提醒）。自己走進視線照舊直接抓（上面那一行） */
  if(jhMzCaught(S)){const G=S.caughtBy;if(G&&G.x===P.x&&G.y===P.y)out.ev="trap";else{S.caughtBy=null;out.ev="spot"}}
  return out}
/* 點地面自動走：只走看過的格子；終點可以是石門（走到門前開殘局） */
/* 這一格是不是自動走要避開、走到就要停的新地形（lv.avoid） */
function jhMzAvoid(S,x,y){const a=S.lv&&S.lv.avoid,c=jhMzCell(S,x,y);return!!a&&c!==undefined&&a.includes(c)}
function jhMzPath(S,tx,ty){const P=S.player,K=(x,y)=>y*S.W+x,isDoor=(x,y)=>jhMzCell(S,x,y)==="D";
  if(jhMzSolid(S,tx,ty)&&!isDoor(tx,ty))return null;const prev=new Map([[K(P.x,P.y),null]]),q=[[P.x,P.y]];
  while(q.length){const[x,y]=q.shift();if(x===tx&&y===ty)break;
    for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+a,ny=y+b,kk=K(nx,ny),end=nx===tx&&ny===ty;if(prev.has(kk))continue;
      if(jhMzSolid(S,nx,ny)&&!(end&&isDoor(nx,ny)))continue;if(!S.seen.has(kk)&&!end)continue;if(!end&&jhMzAvoid(S,nx,ny))continue;prev.set(kk,[x,y]);q.push([nx,ny])}}
  if(!prev.has(K(tx,ty)))return null;const o=[];let cur=[tx,ty];while(cur&&!(cur[0]===P.x&&cur[1]===P.y)){o.unshift(cur);cur=prev.get(K(cur[0],cur[1]))}return o}
/* 殘局：走一步。回傳 ok（解開）、bad（不是答案）、back（陷阱錯第 4 次，拖回入口） */
/* W87：這一題是哪一題——有題庫（pool[id]）就照「第幾次走＋這一層換過幾題」輪著挑（同一層換題不重複，題庫夠大才不重複），沒有就用固定題 puz[id] */
function jhMzPuz(S,id){const L=S.lv.pool&&S.lv.pool[id];if(Array.isArray(L)&&L.length){const i=S.cur&&Number.isInteger(S.cur[id])?S.cur[id]:((S.base&&S.base[id])||0)+((S.pick&&S.pick[id])||0);return L[i%L.length]}return S.lv.puz[id]||null}
/* W87a（開發者：「被暗匪抓住的聯續三題題目居然都一樣」）：每一次遇到（被抓、碰石門）開始時才定這一次出哪一題，指標往後推一格——
   同一次答錯重來還是同一題；下一次被抓換下一題；題庫有 N 題時連續 N 次都不一樣。回傳下一輪該從哪裡接（存檔用） */
function jhMzEncounter(S,id){if(!S.cur)S.cur={};S.cur[id]=((S.base&&S.base[id])||0)+((S.pick&&S.pick[id])||0);S.pick[id]=(S.pick[id]||0)+1;S.pz=null;
  return{door:(S.base.door||0)+(S.pick.door||0),trap:(S.base.trap||0)+(S.pick.trap||0)}}
/* 題庫指標的存檔（跟 jhMzGet 的通關紀錄分開放，舊存檔格式不變） */
function jhMzPtrGet(sid){let o=null;try{o=store.get(jhMzLv(sid).key+"Ptr",null)}catch(e){}o=o&&typeof o==="object"?o:{};const n=v=>Number.isFinite(+v)&&+v>=0&&+v<1e6?Math.floor(+v):0;return{door:n(o.door),trap:n(o.trap)}}   /* 超過 1e6 歸 0（#105 審查建議） */
function jhMzPtrSet(sid,p){try{store.set(jhMzLv(sid).key+"Ptr",{door:p.door,trap:p.trap})}catch(e){}}
/* 這一題的著法序列：line＝[紅,黑,紅,…]（多步殺，最後一步是紅方將死）；只有 ans＝一步殺 */
const jhMzLine=P=>P?(Array.isArray(P.line)&&P.line.length?P.line:[P.ans]):[];
/* 黑方剛應的那一步（alt 分支記在 S.pz.reply，舊題照主變）；現在該走的那一步（提示用：主變還在這一層可以走就提示主變，不然提示這一層第一個可以走的） */
const jhMzReply=(P,pz)=>pz&&pz.reply||jhMzLine(P)[pz?pz.i-1:0];
function jhMzNow(P,pz){const L=jhMzLine(P);if(!pz)return L[0];if(P.alt&&pz.node){const k=Object.keys(pz.node);return k.includes(L[pz.i])?L[pz.i]:k[0]}return L[pz.i]||L[0]}
/* W87：多步殺一步一步走——走對了、還沒將死回 next（S.pz 記到第幾手，對方照 line 應一步）；最後一步走對回 ok；
   走錯回 bad（從頭再來）或 back（陷阱錯第 4 次）。一步殺跟原本一樣 */
/* W87-2（11/26 開發者選單「放寬到不是唯一解，只要走的那步仍是最快殺就算對」）：題目有 alt 就照 alt 判斷——
   alt＝{紅方這一步可以走的著法: 0（這一步就將死）或 [黑方照撐最久的方式應的那一步, 下一層 alt]}，maze-puzzles.js --multi 預先收錄每一步所有最快殺的著法；
   每條分支都是最快殺，步數一樣，所以「還要幾步殺」照舊用主變長度算。S.pz.node＝現在走到 alt 的哪一層、S.pz.reply＝黑方剛應的那一步。
   沒有 alt 的舊題（唯一解）照舊只認主變 line。 */
function jhMzTry(S,id,mv){const P=jhMzPuz(S,id);if(!P)return"bad";const L=jhMzLine(P),i=S.pz&&S.pz.id===id?S.pz.i:0;
  if(P.alt&&typeof P.alt==="object"){const node=i&&S.pz.node||P.alt,v=node&&Object.prototype.hasOwnProperty.call(node,mv)?node[mv]:undefined;
    if(v===0){S.pz=null;return"ok"}if(Array.isArray(v)&&v.length===2){S.pz={id,i:i+2,node:v[1],reply:v[0]};return"next"}}
  else if(mv===L[i]){if(i+1>=L.length){S.pz=null;return"ok"}S.pz={id,i:i+2};return"next"}
  S.pz=null;S.fails[id]=(S.fails[id]||0)+1;return id==="trap"&&S.fails.trap>=4?"back":"bad"}
function jhMzSolved(S,id){S.pz=null;if(id==="door"){jhMzOpenDoor(S);return}
  const G=S.caughtBy||S.guard,P=S.player;S.caughtBy=null;S.fails.trap=0;if(S.cur)delete S.cur.trap;if(!G)return;G.stun=4;
  if(G.x===P.x&&G.y===P.y){if(G.dy&&!G.dx)G.y=Math.max(1,Math.min(S.H-2,G.y+(P.y<S.H/2?3:-3)));else G.x=Math.max(1,Math.min(S.W-2,G.x+(P.x<7?3:-3)))}}
/* 拖回入口（W71b）：最後撿到的那件被暗匪搶走、丟回原來的箱子（箱子重新出現，可以再去撿；不會永久不見，對兒童友善）；回傳被丟回的獎勵代號（沒有＝""） */
function jhMzCaughtBack(S){S.fails.trap=0;S.pz=null;S.caughtBy=null;if(S.cur)delete S.cur.trap;let lost="";const g=S.got&&S.got.pop();if(g){S.bag[g.r]=Math.max(0,(S.bag[g.r]||0)-1);S.chests.add(g.k);lost=g.r}jhMzReset(S,false);return lost}

/* ===== 存檔：第一次走完、最佳步數、累計箱子 ===== */
/* W87：每一派各存一份（鍵照該派設定；中炮門照舊 jhMaze，舊存檔不用搬） */
function jhMzGet(sid){const lv=jhMzLv(sid);let o=null;try{o=store.get(lv.key,null)}catch(e){}o=o&&typeof o==="object"?o:{};
  const n=v=>Number.isFinite(+v)&&+v>=0?Math.floor(+v):0,R={clear:n(o.clear),best:n(o.best)};for(const r of lv.rew)R[r.k]=n(o[r.k]);return R}
/* W97（11/24 開發者選單「每趟免費 1 次、之後花貢獻」）：掌門提示——走一趟迷宮第一次免費，之後每次花 1 點門派貢獻（先扣存檔裡的，不夠再扣這一趟撿到的）；
   沒有「門派貢獻」這種獎勵的門派就只有免費那一次。提示只亮「要動哪顆子」、不亮落點；答錯 3 次不再自動亮 */
const JH_MZ_HINT_COST=1;
function jhMzMerit(S){const has=S.lv.rew.some(r=>r.k==="gong");return has?jhMzGet(S.lv).gong+(S.bag.gong||0):0}
function jhMzHintCost(S){return S.hintUsed?JH_MZ_HINT_COST:0}
function jhMzUseHint(S){if(!S.hintUsed){S.hintUsed=true;return{ok:true,cost:0}}
  const have=jhMzMerit(S);if(have<JH_MZ_HINT_COST)return{ok:false,need:JH_MZ_HINT_COST,have};
  let left=JH_MZ_HINT_COST;const G=jhMzGet(S.lv),a=Math.min(left,G.gong);if(a){G.gong-=a;left-=a;try{store.set(S.lv.key,G)}catch(e){}}if(left)S.bag.gong-=left;
  return{ok:true,cost:JH_MZ_HINT_COST}}
function jhMzSave(S){const lv=S.lv,G=jhMzGet(lv),first=!G.clear;G.clear++;G.best=G.best?Math.min(G.best,S.turn):S.turn;for(const r of lv.rew)G[r.k]+=S.bag[r.k]||0;
  try{store.set(lv.key,G)}catch(e){}
  if(first&&typeof addXP==="function")try{addXP(lv.xp,jhL(lv.lvName[0],lv.lvName[1]),lv.xpKey)}catch(e){}
  return{first,G}}
const jhMzOn=()=>{try{return typeof xqFlag!=="function"||xqFlag("maze")}catch(e){return true}};

/* ===== 畫面 ===== */
function jhMzCss(){if(document.getElementById("jhMzCss"))return;const s=document.createElement("style");s.id="jhMzCss";s.textContent=`
.jh-mz{display:flex;flex-direction:column;height:calc(100dvh - var(--topH,56px));background:#000;color:#e9dfc9}
.jh-mz-cv{flex:1;min-height:0;position:relative;overflow:hidden}.jh-mz-cv canvas{width:100%;height:100%;display:block;touch-action:none}
.jh-mz-cv canvas.jh-mz-3d{position:absolute;left:0;top:0;pointer-events:none;touch-action:auto}
.jh-mz-msg{min-height:3.2em;padding:8px 12px;font-size:15px;line-height:1.5;background:#140f0a;border-top:1px solid #3a2c1e}
.jh-mz-bag{display:flex;gap:8px;flex-wrap:wrap;padding:4px 12px;font-size:13px;color:#9b8a6e;background:#140f0a}.jh-mz-bag .on{color:#e8b75a}
.jh-mz-pad{display:grid;grid-template-columns:repeat(3,56px);grid-template-rows:repeat(3,48px);gap:4px;justify-content:center;padding:8px 0 calc(8px + env(safe-area-inset-bottom));background:#140f0a}
.jh-mz-pad button{border:1px solid #5a4630;border-radius:10px;background:#2a2016;color:#e9dfc9;font-size:20px;min-height:44px;touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.jh-mz-pad button:active{background:#3a2c1e}
.jh-mz-pad .u{grid-area:1/2}.jh-mz-pad .l{grid-area:2/1}.jh-mz-pad .r{grid-area:2/3}.jh-mz-pad .d{grid-area:3/2}
.jh-mz.iso .jh-mz-pad .u{grid-area:1/3}.jh-mz.iso .jh-mz-pad .r{grid-area:3/3}.jh-mz.iso .jh-mz-pad .d{grid-area:3/1}.jh-mz.iso .jh-mz-pad .l{grid-area:1/1}
.jh-mz-ov{position:fixed;inset:0;background:rgba(0,0,0,.72);display:flex;align-items:center;justify-content:center;padding:12px 12px calc(12px + env(safe-area-inset-bottom));z-index:60}
.jh-mz-lore{line-height:1.65;margin:8px 0 12px;font-size:15px}
.jh-mz-esc{margin-top:10px;border-top:1px dashed #b9a27a;padding-top:8px}.jh-mz-esc p{margin:0 0 6px;line-height:1.6;font-size:14px}.jh-mz-esc>button{width:100%}
.jh-mz-card{background:#f6ecd6;color:#2a1d10;border-radius:14px;padding:14px;max-width:420px;width:100%;max-height:calc(100dvh - 24px);overflow:auto}
.jh-mz-card svg{max-height:52dvh}
.jh-mz-card h2{margin:0 0 6px;font-size:18px}.jh-mz-card p{margin:4px 0 8px;font-size:15px;line-height:1.5}
.jh-mz-card svg{width:100%;height:auto;display:block;background:#e9c98f;border-radius:8px}
.jh-mz-res{min-height:1.6em;margin:6px 0;font-size:15px}.jh-mz-res.ok{color:#1f6e3c;font-weight:700}.jh-mz-res.bad{color:#a2281d}
.jh-mz-row{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}.jh-mz-row button{min-height:44px;padding:0 14px;border-radius:10px;border:1px solid #8a6a3e;background:#fff8e8;font-size:15px}
.jh-mz-row .main{background:#8a2a1e;color:#fff;border-color:#8a2a1e}
.jh-mz-col{display:flex;flex-direction:column;gap:8px;margin:10px 0 12px}
.jh-mz-col button{min-height:48px;padding:0 14px;border-radius:10px;border:1px solid #8a6a3e;background:#fff8e8;font-size:16px;text-align:left}
.jh-mz-col button:disabled{opacity:.45}
.jh-mz-shake{animation:jhMzShake .3s}@keyframes jhMzShake{25%{transform:translateX(-6px)}75%{transform:translateX(6px)}}`;document.head.append(s)}
const JH_MZ_PN={r:{K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},b:{k:"將",a:"士",b:"象",n:"馬",r:"車",c:"砲",p:"卒"}};
function jhMzFen(f){const b=[];f.split("/").forEach((row,r)=>{let c=0;for(const ch of row){if(/\d/.test(ch))c+=+ch;else{b.push({p:ch,r,c});c++}}});return b}
function jhMzSq(u){return{c:"abcdefghi".indexOf(u[0]),r:9-(+u[1])}}
/* 點的兩格（盤面第 r 列、第 c 行，r=0 是上面黑方那一邊）換成著法字串，例如 {c:0,r:9}→{c:0,r:0} 是 "a0a9"。#83 審查：抽出來測（原本寫在點擊裡，算錯玩家永遠解不開） */
/* W87a（11/24 開發者 iPhone 截圖：「棋盤少了L型標誌兵和炮的位置」）：殘局小棋盤的格線——10 條橫線、9 條直線（河界斷開）、兩個九宮斜線、
   4 個炮位與 10 個兵位的 L 型記號（第 0、8 路只畫朝內那一半）、河界寫「楚河　漢界」。Z＝格寬，ox、oy＝左上角 */
function jhMzGrid(Z,ox,oy){const L=(x1,y1,x2,y2)=>`<line x1="${ox+x1*Z}" y1="${oy+y1*Z}" x2="${ox+x2*Z}" y2="${oy+y2*Z}" stroke="#5a3a1a" stroke-width="1.3"/>`;let s="";
  for(let r=0;r<10;r++)s+=L(0,r,8,r);for(let c=0;c<9;c++)s+=c===0||c===8?L(c,0,c,9):L(c,0,c,4)+L(c,5,c,9);s+=L(3,0,5,2)+L(5,0,3,2)+L(3,7,5,9)+L(5,7,3,9);
  const MK=(c,r)=>{const g=Z*.1,l=Z*.2,x=ox+c*Z,y=oy+r*Z;let t="";for(const dx of[-1,1]){if((c===0&&dx<0)||(c===8&&dx>0))continue;for(const dy of[-1,1])t+=`<path class="mk" d="M${x+dx*g} ${y+dy*(g+l)}V${y+dy*g}H${x+dx*(g+l)}" fill="none" stroke="#5a3a1a" stroke-width="1.3"/>`}return t};
  for(const[c,r]of[[1,2],[7,2],[1,7],[7,7]])s+=MK(c,r);for(const r of[3,6])for(const c of[0,2,4,6,8])s+=MK(c,r);
  const ty=oy+4.5*Z+Z*.17;s+=`<text x="${ox+2*Z}" y="${ty}" text-anchor="middle" font-size="${Z*.42|0}" fill="#7a5a34" pointer-events="none">${esc(jhL("楚河","Chu River"))}</text><text x="${ox+6*Z}" y="${ty}" text-anchor="middle" font-size="${Z*.42|0}" fill="#7a5a34" pointer-events="none">${esc(jhL("漢界","Han Border"))}</text>`;
  return s}
function jhMzMv(a,b){return"abcdefghi"[a.c]+(9-a.r)+"abcdefghi"[b.c]+(9-b.r)}
/* 第 22 輪評比 P2（11/25）：手滑點到不合棋規的位置（例：選紅車後點斜線空格）也被當成解題失敗、扣嘗試次數、陷阱題還會拖回入口。
   改成：落子前先用 XQCore 規則核對紅方這一步合不合法（含走完自己被將）；不合法只提示原因、不算答錯；合法但不是正解才照原本算一次。XQCore 不在（理論上不會）就照舊全部交給 jhMzTry */
function jhMzLegal(pcs,mv){try{if(typeof XQCore==="undefined"||!XQCore.legal)return true;const b=Array(90).fill(null);for(const q of pcs)b[q.r*9+q.c]=q.p;const f=XQCore.parseSq(mv.slice(0,2)),t=XQCore.parseSq(mv.slice(2,4));return XQCore.legal(b,"r").some(([a,z])=>a===f&&z===t)}catch(e){return true}}

/* W87：sid＝哪一派（路由 #/jianghu/maze/<派> 帶進來；沒有＝中炮門） */
function JhMaze(v,sid,n){jhCss();jhMzCss();const LV=jhMzLvN(sid,n||jhMzLayerOf(location.hash)),HALL="#/jianghu/hall/"+LV.sid,ZS=k=>{const a=LV.say&&LV.say[k];return a?jhL(a[0],a[1]):""},HELP=LV.helper||["葛青禾","Ge Qinghe"];
  if(!jhMzOn()){location.hash=HALL;return{}}
  setTop(jhL(LV.title[0],LV.title[1]),"^"+HALL);if(typeof setTabs==="function")setTabs(false);
  v.className="view";document.body.classList.add("jh-on");
  const S=jhMzNew(LV,jhMzGet(LV).clear,jhMzPtrGet(LV)),c0=typeof jhLook==="function"&&jhLook()||"x_swordboy";
  v.innerHTML=`<div class="jh-mz"><div class="jh-mz-cv"><canvas aria-label="${esc(jhL("地底漕倉地圖：點地面走過去","Granary map: tap the floor to walk"))}"></canvas></div>
    <div class="jh-mz-msg" aria-live="polite"></div><div class="jh-mz-bag"></div>
    <div class="jh-mz-pad">${[["u","▲",jhL("往上","Up")],["l","◀",jhL("往左","Left")],["r","▶",jhL("往右","Right")],["d","▼",jhL("往下","Down")]].map(([k,t,a])=>`<button type="button" class="${k}" data-k="${k}" aria-label="${esc(a)}">${esc(t)}</button>`).join("")}</div></div>`;
  const cv=v.querySelector("canvas"),cx=cv.getContext("2d"),box=v.querySelector(".jh-mz-cv"),fog=document.createElement("canvas"),fx=fog.getContext("2d");fog.width=S.W;fog.height=S.H;
  const hero=new Image();hero.src=`data/xs/prev_${c0}.webp`;
  let T=48,camX=0,camY=0,dpr=1,path=[],busy=false,warned=false,held=null,h3=null,lastT=0,pWalk=false;
  /* 3D 迷宮（h3）：載好之前（或載不到）畫平面版＋立繪；載好後平面畫布藏起來（透明，但照舊收點選） */
  /* W87c：3D 是斜俯視，畫面上地圖的「北」在右上；方向鈕跟著擺到四個斜角、箭頭改成斜的（平面版照舊上下左右） */
  const isoPad=on=>{const m=v.querySelector(".jh-mz");if(m)m.classList.toggle("iso",!!on);for(const[k,a,b]of JH_MZ_PADG){const e=v.querySelector('.jh-mz-pad [data-k="'+k+'"]');if(e)e.textContent=on?b:a}};
  jhMzWorld3(box,c0,S).then(w=>{if(alive()){h3=w;cv.style.opacity="0";isoPad(true)}else w.dispose()}).catch(()=>{});
  /* 畫面上還在走（離目標格超過 0.12 格）＝還不能踏下一格；剩一點點就先接下一格，連著走不停頓 */
  const moving=()=>{const P=S.player;return Math.hypot(P.x-P.fx,P.y-P.fy)>.12};
  const say=h=>{v.querySelector(".jh-mz-msg").innerHTML=h};
  const bag=()=>{v.querySelector(".jh-mz-bag").innerHTML=S.lv.rew.map(r=>`<span class="${S.bag[r.k]?"on":""}">${esc(jhL(r.zh,r.en))} ${S.bag[r.k]}</span>`).join("")};
  const resize=()=>{jhMzFit(v);const r=box.getBoundingClientRect();dpr=Math.min(2,window.devicePixelRatio||1);cv.width=Math.max(1,r.width*dpr);cv.height=Math.max(1,r.height*dpr);T=Math.max(34,Math.min(64,Math.floor(r.width/8.5)))};
  const alive=()=>cv.isConnected;
  const rnd=(x,y,s)=>{const q=Math.sin(x*127.1+y*311.7+s*74.7)*43758.5453;return q-Math.floor(q)};
  /* 11/23 開發者：「地底迷宮的圖太難分別是可以走得或是不能走 請修正配色或是其他方式」。原本牆 #241d17、地面約 #3d3226，都是暗棕、在燈光邊緣幾乎一樣。改成：
     ・可以走的地面＝亮的暖色夯土石板（約 #9a7f5d），石板縫明顯；
     ・牆＝深灰褐的牆頂＋朝走道那一面畫出很深的「牆面」（下面是地面的那一格，牆頂與牆面交界一條受光邊），看起來是凸起來的石牆；
     ・牆腳在地面上投一道影子（地面上方或左右是牆），地面像一條凹下去的路；
     ・糧袋（擋路）堆滿一格、袋口紮繩、下緣有影子，不像散在地上可以踩過去的小東西；石門本來就擋，照舊。
     記憶裡（走過、現在燈照不到）的地方霧稍微淡一點（.86→.8），走過的路跟牆分得出來。 */
  const tile=(x,y,px,py)=>{const c=S.grid[y][x],up=jhMzCell(S,x,y-1),dn=jhMzCell(S,x,y+1),lf=jhMzCell(S,x-1,y),rt=jhMzCell(S,x+1,y),isW=k=>k===undefined||k==="#";
    if(c==="#"){cx.save();cx.beginPath();cx.rect(px,py,T,T);cx.clip();cx.fillStyle="#3b342d";cx.fillRect(px,py,T,T);cx.fillStyle="#463e35";
      for(let i=0;i<2;i++){const yy=py+i*T/2,off=(y+i)%2?T/2:0;for(let j=-1;j<2;j++)cx.fillRect(px+off+j*T+2,yy+2,T-4,T/2-4)}
      if(!isW(dn)){const fh=T*.4,fy=py+T-fh;cx.fillStyle="#161009";cx.fillRect(px,fy,T,fh);cx.fillStyle="#241910";for(let j=0;j<3;j++)cx.fillRect(px+j*T/3+2,fy+fh*.45,T/3-4,2);
        cx.fillStyle="#7c6c58";cx.fillRect(px,fy-2,T,2)}
      cx.restore();return}
    /* 糧袋那格不鋪亮地面、改深色底（Windows Claude 2 預驗 #91：地面調亮後糧袋對地面對比 2.24→1.13，像能撿的東西；深底讓米色麻袋跳出來、看得出是一堆擋路的） */
    const r1=rnd(x,y,1),R=150+r1*16|0;cx.fillStyle=c==="S"?"#2a2018":`rgb(${R},${R*.83|0},${R*.6|0})`;cx.fillRect(px,py,T,T);
    cx.strokeStyle="rgba(70,48,24,.5)";cx.lineWidth=1.5;cx.strokeRect(px+.75,py+.75,T-1.5,T-1.5);
    if(rnd(x,y,2)>.55){cx.strokeStyle="rgba(70,48,24,.35)";cx.lineWidth=1;cx.beginPath();const sx=px+T*(.25+rnd(x,y,3)*.5);cx.moveTo(sx,py+2);cx.lineTo(sx+T*.08,py+T*.5);cx.stroke()}
    if(isW(up)){const gd=cx.createLinearGradient(0,py,0,py+T*.32);gd.addColorStop(0,"rgba(0,0,0,.5)");gd.addColorStop(1,"rgba(0,0,0,0)");cx.fillStyle=gd;cx.fillRect(px,py,T,T*.32)}
    if(isW(lf)){cx.fillStyle="rgba(0,0,0,.25)";cx.fillRect(px,py,T*.1,T)}if(isW(rt)){cx.fillStyle="rgba(0,0,0,.25)";cx.fillRect(px+T*.9,py,T*.1,T)}
    /* W87：該派自己的格子（JH_MZ_TILE）；沒登記的擋路格子畫成一塊深色障礙，不會看起來像地面 */
    if(JH_MZ_TILE[c]){JH_MZ_TILE[c](cx,px,py,T,S,x,y);return}
    if(c!=="S"&&c!=="D"&&S.lv.solid.includes(c)){cx.fillStyle="#2a2018";cx.fillRect(px+T*.1,py+T*.1,T*.8,T*.8);cx.strokeStyle="#6b5536";cx.lineWidth=2;cx.strokeRect(px+T*.1,py+T*.1,T*.8,T*.8);return}
    if(c==="S"){cx.fillStyle="rgba(0,0,0,.4)";cx.beginPath();cx.ellipse(px+T*.5,py+T*.9,T*.46,T*.1,0,0,7);cx.fill();
      for(const[a,b,s]of[[.27,.66,.27],[.73,.66,.27],[.5,.68,.28],[.36,.36,.25],[.64,.36,.25]]){cx.fillStyle="#b08850";cx.beginPath();cx.ellipse(px+a*T,py+b*T,s*T,s*T*.8,0,0,7);cx.fill();cx.strokeStyle="#3e2a12";cx.lineWidth=1.8;cx.stroke();
        cx.strokeStyle="#5a3c18";cx.lineWidth=1.2;cx.beginPath();cx.moveTo(px+(a-s*.35)*T,py+(b-s*.45)*T);cx.lineTo(px+(a+s*.35)*T,py+(b-s*.45)*T);cx.stroke()}}
    if(c==="T"){const on=S.lit.has(y*S.W+x);cx.fillStyle="#3a2c1e";cx.fillRect(px+T*.42,py+T*.2,T*.16,T*.5);
      if(on){const f=1+Math.sin(performance.now()/90+x)*.12;cx.fillStyle="#ffcf6a";cx.beginPath();cx.ellipse(px+T*.5,py+T*.17,T*.12*f,T*.2*f,0,0,7);cx.fill();cx.fillStyle="#ff8a2a";cx.beginPath();cx.ellipse(px+T*.5,py+T*.2,T*.07,T*.12,0,0,7);cx.fill()}
      else{cx.fillStyle="#1a140f";cx.beginPath();cx.arc(px+T*.5,py+T*.2,T*.09,0,7);cx.fill()}}
    if(c==="C"){cx.fillStyle="#7d1f17";cx.fillRect(px+T*.18,py+T*.34,T*.64,T*.44);cx.fillStyle="#a8342a";cx.fillRect(px+T*.18,py+T*.3,T*.64,T*.14);cx.fillStyle="#d9a441";cx.fillRect(px+T*.46,py+T*.42,T*.08,T*.12)}
    if(c==="D"){cx.fillStyle="#3c2a1a";cx.fillRect(px+2,py,T-4,T);cx.strokeStyle="#6b4a2a";cx.lineWidth=2;for(let i=1;i<4;i++){cx.beginPath();cx.moveTo(px+i*T/4,py);cx.lineTo(px+i*T/4,py+T);cx.stroke()}
      cx.strokeStyle="#c9a466";cx.lineWidth=1.6;cx.beginPath();cx.moveTo(px+T*.3,py+T*.72);cx.lineTo(px+T*.5,py+T*.42);cx.lineTo(px+T*.7,py+T*.72);cx.moveTo(px+T*.36,py+T*.36);cx.lineTo(px+T*.72,py+T*.52);cx.stroke()}
    if(c==="P"){const on=S.plate;cx.fillStyle=on?"#d9a441":"#8a6a3a";cx.fillRect(px+T*.15,py+T*.15,T*.7,T*.7);cx.strokeStyle=on?"#fff3c4":"#4e3a1f";cx.lineWidth=2;cx.strokeRect(px+T*.15,py+T*.15,T*.7,T*.7);cx.beginPath();cx.moveTo(px+T*.3,py+T*.7);cx.lineTo(px+T*.5,py+T*.35);cx.lineTo(px+T*.7,py+T*.7);cx.stroke()}
    if(c===">")for(let i=0;i<4;i++){cx.fillStyle=`rgb(${40-i*8},${32-i*7},${24-i*5})`;cx.fillRect(px+T*.12,py+T*(.15+i*.18),T*.76,T*.16)}};
  const frame=now=>{if(!alive()){if(h3){h3.dispose();h3=null}return}const dt=lastT?Math.min(.05,(now-lastT)/1000):0;lastT=now;
    const P=S.player,vw=cv.width/dpr,vh=cv.height/dpr;
    pWalk=jhMzGlide(P,P.x,P.y,dt);for(const G of S.guards)jhMzGlide(G,G.x,G.y,dt);tick(now);pWalk=pWalk||moving();
    camX+=(P.fx*T+T/2-vw/2-camX)*.2;camY+=(P.fy*T+T/2-vh/2-camY)*.2;
    cx.setTransform(dpr,0,0,dpr,0,0);cx.fillStyle="#000";cx.fillRect(0,0,vw,vh);cx.save();cx.translate(-Math.round(camX),-Math.round(camY));
    const L=new Float32Array(S.W*S.H);for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){const q=jhMzLight(S,x,y,now);L[y*S.W+x]=q;if(q>.12)S.seen.add(y*S.W+x)}
    if(h3){cx.restore();const d=P.dir||[0,1];try{h3.draw(dt,now,L,pWalk,jhMzYaw(d[0],d[1]))}catch(e){h3.dispose();h3=null;cv.style.opacity="";isoPad(false)}requestAnimationFrame(frame);return}
    for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++)if(S.seen.has(y*S.W+x))tile(x,y,x*T,y*T);
    for(const G of S.guards){for(const q of jhMzSight(S,G)){cx.fillStyle="rgba(200,50,35,.28)";cx.fillRect(q.x*T+2,q.y*T+2,T-4,T-4);cx.fillStyle="rgba(230,70,50,.7)";cx.fillRect(q.x*T+4,q.y*T+T/2-1.5,T-8,3)}
    {const gx=G.fx*T+T/2,gy=(G.fy==null?G.y:G.fy)*T+T/2;cx.fillStyle="#141414";cx.beginPath();cx.ellipse(gx,gy+T*.05,T*.3,T*.36,0,0,7);cx.fill();cx.fillStyle="#2b2b2b";cx.beginPath();cx.arc(gx,gy-T*.2,T*.17,0,7);cx.fill();
      cx.fillStyle=G.stun?"#8a8a8a":"#e24a3a";cx.fillRect(gx+G.dx*T*.04-T*.09,gy-T*.23,T*.06,T*.04);cx.fillRect(gx+G.dx*T*.04+T*.03,gy-T*.23,T*.06,T*.04)}}
    /* 平面版（3D 載不起來時）：立繪腳下一圈明顯的柔邊接地影子（開發者 11/23「腳色看起來是漂起來」） */
    const hx=P.fx*T+T/2,hy=P.fy*T+T/2,ft=hy+T*.38;
    /* 預覽站量：影子半徑 .42 格時跟披風一樣寬、上下只有 12px，幾乎全被身體蓋住 → 放大到 .55 格、往下挪一點，左右和腳下都露得出來 */
    cx.save();cx.translate(hx,ft+T*.04);cx.scale(1,.4);const sg=cx.createRadialGradient(0,0,0,0,0,T*.55);sg.addColorStop(0,"rgba(0,0,0,.72)");sg.addColorStop(.5,"rgba(0,0,0,.45)");sg.addColorStop(1,"rgba(0,0,0,0)");
    cx.fillStyle=sg;cx.beginPath();cx.arc(0,0,T*.55,0,7);cx.fill();cx.restore();
    /* 立繪也一樣等速走，走路時腳下一點一點、左右晃 */
    {const bob=pWalk?-Math.abs(Math.sin(now/95))*T*.06:Math.sin(now/220)*1.5,sw=pWalk?Math.sin(now/95)*.09:0;
      if(hero.complete&&hero.naturalWidth){const h=T*1.05,w=h*hero.width/hero.height;cx.save();cx.translate(hx,hy+T*.38);cx.rotate(sw);cx.scale(P.face<0?-1:1,1);cx.drawImage(hero,-w/2,-T*.38-h*.62+bob,w,h);cx.restore()}
      else{cx.fillStyle="#e8b75a";cx.beginPath();cx.arc(hx,hy-T*.05+bob,T*.24,0,7);cx.fill()}}
    const id=fx.createImageData(S.W,S.H);for(let i=0;i<S.W*S.H;i++){const q=L[i],a=!S.seen.has(i)?1:q<.12?.8:Math.max(0,1-q*.95);id.data[i*4+3]=Math.round(a*255)}
    fx.putImageData(id,0,0);cx.imageSmoothingEnabled=true;cx.drawImage(fog,0,0,S.W*T,S.H*T);
    const gr=cx.createRadialGradient(hx,hy,T*.3,hx,hy,T*3.4);gr.addColorStop(0,"rgba(255,170,80,.14)");gr.addColorStop(1,"rgba(255,170,80,0)");cx.fillStyle=gr;cx.fillRect(hx-T*4,hy-T*4,T*8,T*8);
    cx.restore();
    requestAnimationFrame(frame)};
  /* W87c：別的檔（例如 m/07z9m-lore.js 的暗門、碑刻）用 onStep 回傳的事件，可以多帶 msg:[zh,en]（照 say 顯示）、card:{title:[zh,en],body:[zh,en]}（開一張卡片）；
     ev 不認得的照一般走一步處理；走了卻沒動（撞到暗門、碑刻）就停下自動走與按住 */
  const card=c=>{const o=ov(`<h2>${esc(jhL(c.title[0],c.title[1]))}</h2><div class="jh-mz-lore">${jhL(c.body[0],c.body[1])}</div><div class="jh-mz-row"><button type="button" class="main" data-a="ok">${esc(jhL("收好","Keep it"))}</button></div>`);o.querySelector('[data-a="ok"]').onclick=()=>shut(o)};
  const act=(dx,dy)=>{if(busy||S.done)return false;if(dx||dy)S.player.dir=[dx,dy];const x0=S.player.x,y0=S.player.y,r=jhMzStep(S,dx,dy);
    if(r.msg)say(jhL(r.msg[0],r.msg[1]));
    if(r.stop||(S.player.x!==x0||S.player.y!==y0)&&jhMzAvoid(S,S.player.x,S.player.y)){path=[];held=null}
    if(r.card&&r.card.title&&r.card.body){path=[];held=null;card(r.card);return false}
    if((dx||dy)&&S.player.x===x0&&S.player.y===y0&&!["wall","door","locked","trap","spot","finish","done"].includes(r.ev)){path=[];held=null;return false}
    if(r.ev==="wall"){say(esc(r.block==="jump"?jhL("炮只能隔一個子跳：這袋糧後面還有東西擋著（另一袋、牆或石門），跳不過去。","A cannon jumps over exactly one piece: something is right behind this sack (another sack, a wall or the stone door), so you can't jump it."):jhL("前面過不去。","Can't go that way.")));return false}
    if(r.ev==="door"){path=[];puzzle("door");return false}
    if(r.ev==="locked"){path=[];say(ZS("locked"));return false}
    if(r.ev==="jump")say(ZS("jump"));
    if(r.plate)say(ZS("plate"));
    if(r.torch)say(jhL("你點亮了一盞壁燈，<b>照得到的地方會一直亮著</b>。","You light a wall lamp. <b>Everything it reaches stays lit.</b>"));
    if(r.chest){const w=S.lv.rew.find(x=>x.k===r.chest);say(jhL(`打開箱子：得到 <b>${esc(w.zh)}</b>。`,`You open a chest: <b>${esc(w.en)}</b>.`));bag()}
    if(r.ev==="finish"){path=[];finish();return false}
    if(r.ev==="trap"){path=[];puzzle("trap");return false}
    if(r.ev==="spot"){path=[];held=null;say(ZS("spot")||jhL("<b>被看到了！</b>守衛轉過來看見你，<b>趕快離開紅線</b>，下一步還在紅線上就會被抓。","<b>Spotted!</b> The guard turned and sees you. <b>Get off the red line now</b>: if you are still on it next turn, you are caught."));return false}
    return true};
  /* 上一格快走到了才踏下一格：點地面排好的路，或按住的方向 */
  const tick=now=>{if(busy||S.done||moving())return;let m=null;if(path.length){const[nx,ny]=path.shift();m=[nx-S.player.x,ny-S.player.y]}else if(held)m=held;if(!m)return;
    if(!act(m[0],m[1])){path=[];held=null;return}
    const lg=Math.max(0,...S.guards.map(G=>jhMzLight(S,G.x,G.y,now)));if(lg>.25&&!warned){warned=true;path=[];say(jhL(S.lv.warn[0],S.lv.warn[1]))}if(lg<=.25)warned=false};
  /* 殘局、通關視窗蓋住整個畫面（預覽站實點：原本只蓋地圖那一塊，手機上提示鈕被擠到卡片外要捲動）；放在 .jh-mz 裡，換頁時跟著頁面一起清掉 */
  const ov=(html)=>{const o=document.createElement("div");o.className="jh-mz-ov";o.innerHTML=`<div class="jh-mz-card" role="dialog" aria-modal="true">${html}</div>`;v.querySelector(".jh-mz").append(o);busy=true;return o};
  /* W99（11/24 開發者選單「講清楚＋加逃跑鈕」）：被抓的殘局可以逃跑，但要先講清楚代價——這一層撿到的東西全部丟掉、下次從入口重來（迷宮只在走完一層時存檔）。
     殘局開著時多推一筆瀏覽紀錄，Android 返回手勢、瀏覽器上一頁會先停在這裡、跳確認；頁首返回鍵、回首頁鍵也一樣先確認。確認都在卡片裡，不跳瀏覽器的確認對話框 */
  let trapO=null,escIgn=false;
  const escPush=()=>{try{const d=(typeof NAV_D==="number"?NAV_D:0)+1;history.pushState({d,jhMzEsc:1},"",location.href);if(typeof NAV_D==="number")NAV_D=d}catch(e){}};
  const escPop=()=>{try{if(history.state&&history.state.jhMzEsc){escIgn=true;history.back()}}catch(e){}};
  const escIdle=()=>`<p class="muted">${esc(jhL("解開這一局才能脫身。也可以逃跑，但這一層撿到的東西會全部丟掉，下次從入口重來。","Solve this to get free. You can also run away, but you lose everything you picked up on this level and start again from the entrance."))}</p><button type="button" data-a="esc">${esc(jhL("逃跑（放棄這一層）","Run away (give up this level)"))}</button>`;
  const escBind=()=>{const box=trapO&&trapO.querySelector(".jh-mz-esc");if(!box)return;const b=box.querySelector('[data-a="esc"]');if(b)b.onclick=escAsk};
  function escAsk(){const o=trapO,box=o&&o.querySelector(".jh-mz-esc");if(!box)return;
    box.innerHTML=`<p><b>${esc(jhL("確定要逃跑嗎？","Run away?"))}</b> ${esc(jhL("這一層撿到的東西會全部丟掉，下次從入口重來。","You will lose everything you picked up on this level and start again from the entrance."))}</p><div class="jh-mz-row"><button type="button" class="main" data-a="esc-no">${esc(jhL("留下來解題","Stay and solve it"))}</button><button type="button" data-a="esc-yes">${esc(jhL("確定逃跑","Run away"))}</button></div>`;
    box.querySelector('[data-a="esc-no"]').onclick=()=>{box.innerHTML=escIdle();escBind()};
    box.querySelector('[data-a="esc-yes"]').onclick=()=>{trapO=null;o.remove();busy=false;escPop();setTimeout(()=>upTo(HALL),80)};
    const n=box.querySelector('[data-a="esc-no"]');if(n)n.focus()}
  const shut=o=>{if(o===trapO){trapO=null;escPop()}o.remove();busy=false};
  /* W87c（飛相門解殺題，iMac Claude 1 寫題）：題目 kind:"defend"＝解殺題——紅方找唯一一步解圍，不是殺棋：不顯示「N 步殺」那行，答對說「解圍了」、答錯說「解不了圍」（派別的 say.door／say.trap 照舊優先）
     W87：題目照該派題庫挑（jhMzPuz）；多步殺一步一步走：走對、還沒將死＝棋盤上照解答走黑方那一步、再換玩家；走錯＝回到開局重來。提示點亮的是「現在」該走的那一步 */
  const puzzle=id=>{S.hintOn=null;jhMzPtrSet(LV,jhMzEncounter(S,id));const P=jhMzPuz(S,id);if(!P)return;const L=jhMzLine(P),N=(L.length+1)>>1,DEF=P.kind==="defend",t=jhL(P.zh[0],P.en[0]),p=jhL(P.zh[1],P.en[1]);let pcs=jhMzFen(P.fen),sel=null,won=false,mzLost=false,last=null;S.pz=null;
    const o=ov(`<h2>${esc(t)}</h2><p>${esc(p)}</p>${N>1&&!DEF?`<p class="muted">${esc(jhL(`紅方先走，${N} 步殺：每一步都要將軍或逼著對方，黑方會照最頑強的方式應。`,`Red to move: mate in ${N}. Black answers with the toughest defence.`))}</p>`:""}<div class="jh-mz-bd"></div><div class="jh-mz-res" aria-live="polite">${esc(jhL("點紅方的棋子，再點要走到的位置。","Tap a red piece, then tap where it goes."))}</div>
      <div class="jh-mz-row"><button type="button" data-a="hint">${esc(jhL(HELP[0]+"的提示",HELP[1]+"'s hint"))}</button>${id==="door"?`<button type="button" data-a="back">${esc(jhL("先退開","Step back"))}</button>`:""}</div>${id==="trap"?`<div class="jh-mz-esc">${escIdle()}</div>`:""}`);
    if(id==="trap"){trapO=o;escPush();escBind()}
    const res=(m,c)=>{const e=o.querySelector(".jh-mz-res");e.textContent=m;e.className="jh-mz-res "+(c||"")};
    const now=()=>jhMzNow(P,S.pz&&S.pz.id===id?S.pz:null);
    const apply=mv=>{const a=jhMzSq(mv.slice(0,2)),b=jhMzSq(mv.slice(2));pcs=pcs.filter(x=>!(x.c===b.c&&x.r===b.r));const me=pcs.find(x=>x.c===a.c&&x.r===a.r);if(me){me.c=b.c;me.r=b.r}last=[a,b]};
    const restart=()=>{pcs=jhMzFen(P.fen);last=null};
    const draw=()=>{const Z=40,ox=24,oy=24,Wd=ox*2+Z*8,Hd=oy*2+Z*9;
      let s=`<svg viewBox="0 0 ${Wd} ${Hd}" role="img" aria-label="${esc(jhL("象棋殘局","Xiangqi puzzle"))}">`+jhMzGrid(Z,ox,oy);const hint=S.hintOn===id&&!won,mv=now(),a=jhMzSq(mv.slice(0,2)),b=jhMzSq(mv.slice(2));
      for(let r=0;r<10;r++)for(let c=0;c<9;c++)s+=`<rect x="${ox+c*Z-Z/2}" y="${oy+r*Z-Z/2}" width="${Z}" height="${Z}" fill="transparent" data-c="${c}" data-r="${r}"/>`;
      if(last)for(const q of last)s+=`<rect x="${ox+q.c*Z-Z/2+3}" y="${oy+q.r*Z-Z/2+3}" width="${Z-6}" height="${Z-6}" fill="none" stroke="#c9a466" stroke-width="2" stroke-dasharray="4 3" pointer-events="none"/>`;
      for(const q of pcs){const red=q.p===q.p.toUpperCase(),ch=red?JH_MZ_PN.r[q.p]:JH_MZ_PN.b[q.p],on=sel&&sel.r===q.r&&sel.c===q.c,hi=hint&&q.r===a.r&&q.c===a.c;
        s+=`<g data-c="${q.c}" data-r="${q.r}"><circle cx="${ox+q.c*Z}" cy="${oy+q.r*Z}" r="17" fill="#f3e3c0" stroke="${on?"#2a7":hi?"#3f8f5f":red?"#b3261e":"#222"}" stroke-width="${on||hi?4:2}"/><text x="${ox+q.c*Z}" y="${oy+q.r*Z+6.5}" text-anchor="middle" font-size="19" font-weight="900" fill="${red?"#b3261e":"#1a1a1a"}" pointer-events="none">${ch}</text></g>`}
      const bd=o.querySelector(".jh-mz-bd");bd.innerHTML=s+"</svg>";bd.querySelectorAll("[data-c]").forEach(el=>el.addEventListener("click",ev=>{ev.stopPropagation();pick(+el.dataset.c,+el.dataset.r)}))};
    const row=h=>{const r=o.querySelector(".jh-mz-row");r.innerHTML=h;return r};
    const pick=(c,r)=>{if(won||mzLost)return;   /* 11/25 審核：陷阱題第 4 次答錯、叫你回入口之後，棋盤原本還能下；再走正解按「繼續」就留在原地、保住寶物、守衛反被暈眩。判負後（mzLost；不叫 lost，下面「回到入口」那段有 const lost＝丟回箱子的寶物）不再接受落子 */const q=pcs.find(x=>x.c===c&&x.r===r);if(q&&q.p===q.p.toUpperCase()){sel={c,r};draw();return}
      if(!sel){res(jhL("先點一顆紅方的棋子。","Tap a red piece first."));return}
      const mv=jhMzMv(sel,{c,r});if(!jhMzLegal(pcs,mv)){sel=null;draw();res(jhL("這一步不合棋規，不算答錯。換一個位置，或改點別顆紅子。","That move isn't legal, so it doesn't count. Pick another square or another red piece."),"bad");return}const got=jhMzTry(S,id,mv);sel=null;
      if(got==="next"){S.hintOn=null;if(typeof hl==="function")hl();apply(mv);apply(jhMzReply(P,S.pz));draw();const left=(L.length-S.pz.i+1)>>1;res(jhL(`走對了。黑方應了一步（虛線框），還要 ${left} 步殺。`,`Good. Black replied (dashed squares); mate in ${left} more.`),"ok");return}
      if(got==="ok"){won=true;{const eb=o.querySelector(".jh-mz-esc");if(eb)eb.remove()}   /* W99 預驗建議：解開了就不留逃跑鈕（誤按白丟整層） */
        apply(mv);draw();
        res(ZS(id)||(DEF?jhL("解圍了！","Threat stopped!"):jhL("將死！","Checkmate!")),"ok");
        const b=row(`<button type="button" class="main">${esc(jhL("繼續","Continue"))}</button>`).querySelector("button");b.onclick=()=>{shut(o);jhMzSolved(S,id);say(ZS(id==="door"?"open":"dazed"))};b.focus();return}
      restart();draw();const card=o.querySelector(".jh-mz-card");card.classList.remove("jh-mz-shake");void card.offsetWidth;card.classList.add("jh-mz-shake");
      if(got==="back"){{const eb=o.querySelector(".jh-mz-esc");if(eb)eb.remove()}mzLost=true;try{const h=o.querySelector('[data-a="hint"]');if(h)h.disabled=true}catch(e){}res(ZS("dragged"),"bad");
        row(`<button type="button" class="main">${esc(jhL("回到入口","Back to the entrance"))}</button>`).querySelector("button").onclick=()=>{shut(o);const lost=jhMzCaughtBack(S),w=S.lv.rew.find(x=>x.k===lost);bag();say((w?jhL(`<b>${esc(w.zh)}</b>被丟回箱子裡了，再去拿一次。`,`Your <b>${esc(w.en)}</b> was tossed back into its chest. Go get it again.`):"")+ZS("retry"))};return}
      res((S.fails[id]||0)>=3&&S.hintOn!==id?jhL(`這步不對，從頭再來。卡住了可以請${HELP[0]}提示。`,`Not that one; start over. Stuck? Ask ${HELP[1]} for a hint.`):jhL(N>1?"這步不對，從頭再來。":DEF?"這步解不了圍，黑方下一步還是殺得到，再想想。":"這步沒有將死黑方，再想想。",N>1?"Not that one; start over.":DEF?"That doesn't stop the threat. Black still mates next move. Think again.":"That doesn't checkmate Black. Think again."),"bad")};
    const hb=o.querySelector('[data-a="hint"]'),hl=()=>{const c=jhMzHintCost(S);hb.textContent=S.hintOn===id?jhL(HELP[0]+"已經提示了",HELP[1]+" has given a hint"):jhL(`${HELP[0]}的提示（${c?`${c} 點門派貢獻`:"這一趟免費 1 次"}）`,`${HELP[1]}'s hint (${c?`${c} school merit`:"1 free this run"})`);hb.disabled=S.hintOn===id};hl();
    hb.onclick=()=>{if(S.hintOn===id)return;const u=jhMzUseHint(S);if(!u.ok){res(jhL(`門派貢獻不夠：還要 ${u.need} 點，你有 ${u.have} 點。在迷宮的箱子裡撿得到。`,`Not enough school merit: you need ${u.need} and have ${u.have}. You can find it in the chests.`),"bad");return}
      S.hintOn=id;if(u.cost)bag();draw();hl();res(jhL(`${HELP[0]}：「這一步，動亮起來的那顆子。走到哪裡，你自己想。」`,`${HELP[1]}: "This move, use the highlighted piece. Where it goes is up to you."`))};
    const bk=o.querySelector('[data-a="back"]');if(bk)bk.onclick=()=>{S.pz=null;shut(o)};draw()};
  /* 走到樓梯：存檔；有下一層就記「到過下一層」、多一顆「往下走」 */
  const finish=()=>{const R=jhMzSave(S),n=LV.layer||1,nx=jhMzLayers(LV.sid)>n?jhMzLvN(LV.sid,n+1):null;if(nx)jhMzDeepSet(LV.sid,n+1);
    const o=ov(`<h2>${esc(jhL(`第${jhMzCn(n)}層走完了`,`Level ${n} cleared`))}</h2>
      <p>${esc(ZS("done")||(nx?jhL("石階繼續往下。","The steps go on down."):jhL("更深的地方之後再開。","Deeper levels open later.")))}</p>
      <p>${esc(jhL(`這次帶出來：${S.lv.rew.map(r=>r.zh+" "+S.bag[r.k]).join("、")}；走了 ${S.turn} 步。`,`Brought out: ${S.lv.rew.map(r=>r.en+" "+S.bag[r.k]).join(", ")}; ${S.turn} steps.`))}</p>
      ${R.first?`<p><b>${esc(jhL(`第一次走完：修為 +${S.lv.xp}`,`First clear: +${S.lv.xp} XP`))}</b></p>`:`<p>${esc(jhL(`最佳：${R.G.best} 步`,`Best: ${R.G.best} steps`))}</p>`}
      <div class="jh-mz-row"><button type="button" data-a="again">${esc(jhL("再走一次","Play again"))}</button><button type="button"${nx?"":' class="main"'} data-a="out">${esc(jhL(LV.back[0],LV.back[1]))}</button>${nx?`<button type="button" class="main" data-a="down">${esc(jhL(`往下走・第${jhMzCn(n+1)}層`,`Go down · Level ${n+1}`))}</button>`:""}</div>`);
    o.querySelector('[data-a="again"]').onclick=()=>{shut(o);const n2=jhMzNew(LV,R.G.clear,jhMzPtrGet(LV));Object.assign(S,n2);bag();say(intro)};
    if(nx)o.querySelector('[data-a="down"]').onclick=()=>{shut(o);jhGo(jhMzUrl(LV.sid,n+1))};
    o.querySelector('[data-a="out"]').onclick=()=>{shut(o);upTo(HALL)}};
  cv.addEventListener("click",e=>{if(busy||S.done)return;const r=cv.getBoundingClientRect(),q=h3?h3.pick(e.clientX,e.clientY):{x:Math.floor((e.clientX-r.left+camX)/T),y:Math.floor((e.clientY-r.top+camY)/T)};if(!q)return;const x=q.x,y=q.y;
    if(x===S.player.x&&y===S.player.y)return;if(!S.seen.has(y*S.W+x)){say(jhL("那裡還是一片黑，<b>先走近一點照亮它</b>。","It's still pitch dark there. <b>Get closer to light it up.</b>"));return}
    const p=jhMzPath(S,x,y);if(!p){say(esc(jhL("走不到那裡。","You can't get there.")));return}path=p;held=null});
  /* 方向鈕、方向鍵：按下就走、按住一直走（每格踏到才接下一格）、放開停在下一格。鍵盤在按鈕上按 Enter／空白鍵＝走一格。
     11/26 開發者看 iPad 影片問「等」是什麼意思，選「拿掉」：畫面上不再放「等」（原地等一回合）鈕；想讓暗匪先走，往旁邊走一步再走回來（每一步都算一回合）。jhMzStep(S,0,0) 規則照舊保留 */
  const DIR={u:[0,-1],d:[0,1],l:[-1,0],r:[1,0]};
  const go=m=>{path=[];held=m;if(!busy&&!S.done&&!moving()&&!act(m[0],m[1]))held=null};
  v.querySelectorAll(".jh-mz-pad button").forEach(b=>{const m=DIR[b.dataset.k];
    if(!m)return;
    let pd=false;b.addEventListener("pointerdown",e=>{pd=true;try{b.setPointerCapture(e.pointerId)}catch(e2){}go(m)});
    const up=()=>{if(held===m)held=null};for(const n of["pointerup","pointercancel","lostpointercapture"])b.addEventListener(n,up);
    b.addEventListener("click",()=>{if(pd){pd=false;return}go(m);held=null});b.addEventListener("contextmenu",e=>e.preventDefault())});
  const keys={ArrowUp:DIR.u,ArrowDown:DIR.d,ArrowLeft:DIR.l,ArrowRight:DIR.r};
  const onPop=()=>{if(!alive()){off();return}if(escIgn){escIgn=false;return}if(trapO){escPush();escAsk()}};
  const onHome=e=>{if(!trapO||!alive())return;const t=e.target&&e.target.closest&&e.target.closest('#back,[data-home="1"]');if(!t)return;e.preventDefault();e.stopImmediatePropagation();escAsk()};
  const off=()=>{window.removeEventListener("popstate",onPop);document.removeEventListener("click",onHome,true);document.removeEventListener("keydown",onKey);document.removeEventListener("keyup",onKeyUp);window.removeEventListener("resize",resize);window.removeEventListener("blur",onBlur)};
  const onKey=e=>{if(!alive()){off();return}if(busy)return;const m=keys[e.key];if(m){e.preventDefault();if(!e.repeat)go(m)}};
  const onKeyUp=e=>{if(!alive()){off();return}const m=keys[e.key];if(m&&held===m)held=null};
  const onBlur=()=>{held=null};
  window.addEventListener("popstate",onPop);document.addEventListener("click",onHome,true);document.addEventListener("keydown",onKey);document.addEventListener("keyup",onKeyUp);window.addEventListener("resize",resize);window.addEventListener("blur",onBlur);
  const intro=jhL(LV.intro[0],LV.intro[1]);
  bag();say(intro);requestAnimationFrame(()=>{resize();requestAnimationFrame(frame)});
  /* 從門內頁按入口進來走的是 jhGo（先蓋上淡出遮罩再換頁），目的頁要自己淡出；直接開網址時沒有遮罩，呼叫也沒關係 */
  setTimeout(()=>{try{if(typeof jhFadeOut==="function")jhFadeOut()}catch(e){}},0);
  return{}}

/* 門內頁的迷宮入口（遠端開關 maze 關掉就不放）。W87：有登記 hall 的門派都放；中炮門照舊在大殿前的拋石車、網址照舊 #/jianghu/maze */
function jhMzHall(v,sid){const lv=JH_MZ_LV[sid];if(!lv||!lv.hall||!jhMzOn())return;const P=v&&v.querySelector(".jh-hall");if(!P||P.querySelector('.jh-hall-spot[data-k="maze"]'))return;
  const b=document.createElement("button");b.type="button";b.className="shp-spot jh-hall-spot";b.dataset.k="maze";b.style.cssText=jhHallPc(lv.hall.at);
  b.innerHTML=`<b>${esc(jhL(lv.hall.zh,lv.hall.en))}</b>`;
  b.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}if(jhMzLayers(sid)>1&&jhMzDeep(sid)>1)jhMzPick(sid);else jhGo(jhMzUrl(sid,1))};P.insertBefore(b,P.querySelector(".jh-hall-spot"))}
try{if(typeof JhHall==="function"&&!JhHall.jhMz){const h0=JhHall;JhHall=function(v,sid){const r=h0.apply(this,arguments);try{jhMzHall(v,sid)}catch(e){}return r};JhHall.jhMz=1}}catch(e){}
if(typeof addEventListener==="function")addEventListener("hashchange",()=>{try{if(jhMzSidOf(location.hash)===null)jhMzBgm(false)}catch(e){}});
try{if(typeof Jianghu==="function"&&!Jianghu.jhMz){const j0=Jianghu;Jianghu=function(v){try{const sid=jhMzSidOf(location.hash);if(sid){if(jhMzOn())jhMzBgm(true,sid);return JhMaze(v,sid)}}catch(e){}return j0.apply(this,arguments)};Jianghu.jhMz=1}}catch(e){}
