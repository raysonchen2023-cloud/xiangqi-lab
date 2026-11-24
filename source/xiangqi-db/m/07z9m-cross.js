/* ---------- W87 過宮炮地底迷宮・第一層「焙紙暗房」（開發者 11/24 選單：九派先做三派＋中炮門重改，這一派由 Windows Claude 1 寫）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的過宮炮門：涇縣宣紙作坊溪邊焙紙牆後的暗門，底下是烘紙的地下暖閣。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE）；這支只登記過宮炮這一層，不改共用程式。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・紙坊護院照「炮」的規則看人（JH_MZ_KIND.cannon）：沿直線來回巡（跟車一樣走），但看人反過來——
       跟玩家在同一條直線上、中間「剛好隔一座宣紙架（Z）」才看得到；中間什麼都沒有反而看不到（炮沒有炮架打不到人）。
       四個方向都算；紙架離護院最多 6 格，紙架後面最多看 3 格；牆、石門、碑刻擋住就停；隔兩座紙架也看不到。
     ・宣紙架（Z）擋路，但不擋光（紙是半透明的）；
     ・回味感（開發者 11/24：「45 度斜俯視、更容易迷路的地圖（岔路、死路、暗門）、撿得到碑刻文書講漕運歷史」）：
       地圖彎繞、好幾條長得很像的死路；一道暗門 H（藏寶室，iMac Claude 1 的 m/07z9m-lore.js 管開關）、三件碑刻文書 L（內容等史學顧問核過再填）。
       lore.js 還沒合併時，H 當牆、L 當擋路的石碑，地圖照樣走得完（藏寶室那一箱先拿不到）。
     ・殘局：古譜裡紅方先走、2～3 步殺、最後一步用炮將死的題，排除中炮門已經用過的，優先收紅方有雙炮的局；
       Pikafish 驗紅方每一步唯一解、黑方應著撐最久（xiangqi-lab/tools/maze-puzzles.js 產生、--check 重跑）。 */
const JH_MZ_CROSS_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#..Z..Z.Z..Z..#",
"#.............#",
"#.Z...L....Z.C#",
"####.#####.####",
"#..#..#.#C.#..#",
"#.##.##.##.##.#",
"#....#.P.#....#",
"#..####.####..#",
"#Z...........Z#",
"#......Z......#",
"#.............#",
"##.####H####.##",
"#L.#...C...#.L#",
"#..#.......#..#",
"#.###########.#",
"#T...........T#",
"#.....Z.Z.....#",
"#......@......#",
"###############"];
/* 三個護院：上廳一個（第 6 列整排）、中廳兩個（第 14 列被中間的紙架隔成左右兩段，各巡一段，隔著那座紙架看得到對面那半段） */
const JH_MZ_CROSS_GUARDS=[{kind:"cannon",x:1,y:6,dx:1,dy:0},{kind:"cannon",x:1,y:14,dx:1,dy:0},{kind:"cannon",x:13,y:14,dx:-1,dy:0}];
JH_MZ_KIND.cannon={
  /* 視線：四個方向各自往外看；先找紙架（lv.screen，預設 Z，離護院 range 格內，預設 6），紙架後面 fire 格（預設 3）才看得到；
     紙架之前碰到擋路的東西（牆、石門、碑刻）就停；紙架之後碰到擋路的東西（含第二座紙架）也停 */
  sight(S,G){const o=[],R=G.range||6,F=G.fire||3,SC=(S.lv&&S.lv.screen)||"Z";
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let scr=false,k=0;
      for(let i=1;i<=R+F;i++){const x=G.x+dx*i,y=G.y+dy*i,c=jhMzCell(S,x,y);if(c===undefined)break;
        if(!scr){if(SC.includes(c)){if(i>R)break;scr=true;continue}if(jhMzSolid(S,x,y))break;continue}
        if(jhMzSolid(S,x,y))break;o.push({x,y});if(++k>=F)break}}
    return o},
  /* 走法跟車一樣：沿直線來回，碰到擋路的就掉頭 */
  step(S,G){JH_MZ_KIND.rook.step(S,G)},
  look:{body:"#2c3e50",head:"#3b5068",eye:0xE24A3A}};
/* 宣紙架（3D）：兩根木柱一根橫桿，掛三張米白的紙；碑刻（3D）：灰石碑；暗門（3D）：跟牆一樣的青磚塊（lore.js 有自己的畫法就用它的） */
JH_MZ_OBJ.Z=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),wd=lam("#6b4a2e"),pp=lam("#efe8d6");
  for(const a of[-.42,.42])g.add(mesh(new T3.BoxGeometry(.06,.9,.06),wd,a,.45,0));g.add(mesh(new T3.BoxGeometry(.92,.05,.05),wd,0,.88,0));
  for(const a of[-.27,0,.27])g.add(mesh(new T3.BoxGeometry(.24,.62,.015),pp,a,.54,0));return g};
if(!JH_MZ_OBJ.L)JH_MZ_OBJ.L=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.5,.12,.3),lam("#5d5a55"),0,.06,0));g.add(mesh(new T3.BoxGeometry(.42,.7,.12),lam("#7d7a73"),0,.47,0));return g};
if(!JH_MZ_OBJ.H)JH_MZ_OBJ.H=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,1,1),lam("#3a3a3e"),0,.5,0));return g};
/* 平面版（3D 載不起來時） */
JH_MZ_TILE.Z=(cx,px,py,T)=>{cx.fillStyle="#6b4a2e";cx.fillRect(px+T*.08,py+T*.12,T*.08,T*.8);cx.fillRect(px+T*.84,py+T*.12,T*.08,T*.8);cx.fillRect(px+T*.08,py+T*.12,T*.84,T*.07);
  cx.fillStyle="rgba(239,232,214,.85)";for(const a of[.2,.42,.64])cx.fillRect(px+T*a,py+T*.2,T*.16,T*.55)};
if(!JH_MZ_TILE.L)JH_MZ_TILE.L=(cx,px,py,T)=>{cx.fillStyle="#5d5a55";cx.fillRect(px+T*.2,py+T*.78,T*.6,T*.12);cx.fillStyle="#7d7a73";cx.fillRect(px+T*.28,py+T*.18,T*.44,T*.62);cx.strokeStyle="#4a4844";cx.lineWidth=1;cx.strokeRect(px+T*.28,py+T*.18,T*.44,T*.62)};
if(!JH_MZ_TILE.H)JH_MZ_TILE.H=(cx,px,py,T)=>{cx.fillStyle="#2a2a2e";cx.fillRect(px,py,T,T)};
/* 殘局題庫（maze-puzzles.js 產生，不要手改）。重跑／核對（在 source/ 底下；核對加 --check、不用 Pikafish）：
   node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_CROSS --out xiangqi-db/m/07z9m-cross.js --mate C --door 3 --trap 6 --prefer-red C2
     --exclude xiangqi-db/m/07z9m-maze.js:JH_MZ_POOL_CENTRAL --title-door "石門機關：炮的殺法" --title-door-en "Stone door: a cannon's mate"
     --desc-door "門上刻著廊下的拋石車。紅方先走，{n} 步將死黑方，門就會開。提示：炮要隔一個子才打得到，跟這裡的護院一樣。"
     --desc-door-en "A catapult under a covered walkway is carved on the door. Red to move: checkmate in {n} and the door opens. Hint: a cannon needs one piece to fire over, just like the guards here."
     --title-trap "被紙坊護院逮住了" --title-trap-en "Caught by a workshop guard" --desc-trap "護院隔著宣紙架看見了你：「解得開這局，就放你走。」紅方先走，{n} 步將死黑方。"
     --desc-trap-en "The guard saw you through a paper rack: \"Solve this and you can go.\" Red to move: checkmate in {n}."
   雙炮題（--prefer-red C2）先取，通過 Pikafish 的只有 6 題，另外 3 題是單炮題。 */
/* ==JH_MZ_POOL:JH_MZ_POOL_CROSS== */
const JH_MZ_POOL_CROSS={door:[
{"id":"sq055c8","src":{"book":"適情雅趣","title":"背水戰勝"},"zh":["石門機關：炮的殺法","門上刻著廊下的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，跟這裡的護院一樣。"],"en":["Stone door: a cannon's mate","A catapult under a covered walkway is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to fire over, just like the guards here."],"fen":"3C5/3PP4/4k4/9/3n2bN1/1n3N3/9/5C3/r3p4/3K5","line":["f4g6","e7f7","g6e5","f7e7","d9e9"]},
{"id":"sq069c6","src":{"book":"適情雅趣","title":"舉趾觸罝"},"zh":["石門機關：炮的殺法","門上刻著廊下的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，跟這裡的護院一樣。"],"en":["Stone door: a cannon's mate","A catapult under a covered walkway is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to fire over, just like the guards here."],"fen":"C1P2C3/1N2ak3/1n4P2/6N2/9/9/9/3p5/4r2r1/3K5","line":["g7g8","f8f7","g8f8","e8f9","a9f9"]},
{"id":"sq113c5","src":{"book":"適情雅趣","title":"威鎮四海"},"zh":["石門機關：炮的殺法","門上刻著廊下的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，跟這裡的護院一樣。"],"en":["Stone door: a cannon's mate","A catapult under a covered walkway is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to fire over, just like the guards here."],"fen":"2b1R4/3k5/4b4/4C1N2/9/9/3nP4/6C2/3rAp3/c1nAK4","line":["e9d9","d8d9","g6f8","d9d8","g2g8"]}],
trap:[
{"id":"sq141c4","src":{"book":"適情雅趣","title":"細柳屯兵"},"zh":["被紙坊護院逮住了","護院隔著宣紙架看見了你：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a workshop guard","The guard saw you through a paper rack: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2Pak4/CR3P3/9/9/9/1C7/4c4/9/2nr1p3/1r1cK1B2","line":["b8e8","d9e8","b4e4","e8f9","a8e8"]},
{"id":"sq163c6","src":{"book":"適情雅趣","title":"選將練兵"},"zh":["被紙坊護院逮住了","護院隔著宣紙架看見了你：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a workshop guard","The guard saw you through a paper rack: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"c3ka3/3P4C/b2N3c1/4C4/6b2/9/9/9/4p3r/5K3","line":["i8e8","g5e7","d8d9","e9d9","e6d6"]},
{"id":"sq183c6","src":{"book":"適情雅趣","title":"遠遁邊境"},"zh":["被紙坊護院逮住了","護院隔著宣紙架看見了你：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a workshop guard","The guard saw you through a paper rack: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"C4R3/2CP5/1P2k3b/9/9/9/9/4B4/1p1K1r3/2B6","line":["f9f1","b1c1","d1d2","c1c0","a9a7"]},
{"id":"sq146c6","src":{"book":"適情雅趣","title":"遠獵山林"},"zh":["被紙坊護院逮住了","護院隔著宣紙架看見了你：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a workshop guard","The guard saw you through a paper rack: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3a5/4a4/3k5/9/4P4/3C5/9/B2ABA1r1/3pNp3/rc2K4","line":["d4d1","d7e7","e5e6","e7f7","d1f1"]},
{"id":"sq179c4","src":{"book":"適情雅趣","title":"邊烽驚虜"},"zh":["被紙坊護院逮住了","護院隔著宣紙架看見了你：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a workshop guard","The guard saw you through a paper rack: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2C6/4k4/bP1N1R2n/9/9/9/5c3/3p5/4p4/3K5","line":["f7f8","e8e7","c9c7","e7d7","c7a7"]},
{"id":"sq203c6","src":{"book":"適情雅趣","title":"遠近驚駭"},"zh":["被紙坊護院逮住了","護院隔著宣紙架看見了你：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a workshop guard","The guard saw you through a paper rack: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"9/4a4/5k3/1N2p4/9/5C3/4P4/cr1AKA3/5r3/2n6","line":["f4f1","f7e7","b6c8","e7d7","f1d1"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CROSS== */
jhMzDef("cross_palace",{map:JH_MZ_CROSS_MAP,guards:JH_MZ_CROSS_GUARDS,pool:JH_MZ_POOL_CROSS,screen:"Z",
  puz:{door:JH_MZ_POOL_CROSS.door[0],trap:JH_MZ_POOL_CROSS.trap[0]},solid:"#DZLH",opaque:"#DLH",jump:"",
  /* W87b 像素材質（Windows Claude 2 出圖，新版）：只放 CDN；#110 之前的版本不認得 tex，會照舊用程式畫的 */
  tex:{floor:"data/maze/tex/cross_palace_floor.webp",side:"data/maze/tex/cross_palace_wall.webp"},
  /* 碑刻文書（11/24 Gemini 查史料、iMac Claude 1 複核，Windows Claude 1 照複核改寫）：順序＝地圖上 L 由上到下、由左到右（#108 的 07z9m-lore.js 照這個順序對應）。
     出處照實寫：哪些是史料記載、哪些是遊戲整理或虛構 */
  lore:[{id:"cp1",kind:"stele",title:["焙牆控火訣","Rules for the drying wall"],
      body:["碑上刻著焙紙的訣竅：砌兩道磚牆，中間夾著燒火的巷道，把牆面燒得溫熱；匠人用軟刷把濕紙一張張貼上牆烘乾。火太旺，紙會焦脆；火太弱，紙乾不了，全靠多年的手感。","The stele records how paper was dried: two brick walls with a fire lane between them kept the wall faces warm, and craftsmen brushed the wet sheets onto the wall one by one. Too hot and the paper turns brittle; too cool and it never dries. It all came down to years of feel."],
      src:"宋應星《天工開物・殺青》記載用夾牆焙紙的做法；碑文是遊戲改寫，不是原文"},
    {id:"cp2",kind:"doc",title:["涇縣宣紙","Xuan paper of Jingxian"],
      body:["文書寫著涇縣（明代屬寧國府）出的好紙：潔白細密，久藏不容易蟲蛀，文人拿來寫字作畫。「宣紙」這個名字，唐代張彥遠的《歷代名畫記》裡就已經出現。","The document describes the fine paper of Jingxian (part of Ningguo Prefecture in the Ming): white, fine and slow to be eaten by insects, it was what scholars wrote and painted on. The name \"Xuan paper\" already appears in Zhang Yanyuan's Tang-dynasty Records of Famous Painters."],
      src:"張彥遠《歷代名畫記》提到宣紙；涇縣明代屬寧國府；文書本身是遊戲虛構"},
    {id:"cp3",kind:"slip",title:["汲古閣購紙帳","A paper ledger from the Jigu Pavilion"],
      body:["殘帳記著常熟汲古閣主人毛晉買紙印書的帳目。他刻印的書多用江西產的厚竹紙；相傳「毛邊紙」這個名字就是從他來的。","The ledger records paper bought by Mao Jin, owner of the Jigu Pavilion in Changshu, for printing books. He mostly used thick bamboo paper from Jiangxi, and tradition says the name \"maobian paper\" comes from him."],
      src:"葉德輝《書林清話》記毛晉向江西訂紙；毛邊紙得名於毛晉是相傳；帳目是遊戲虛構"}],
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"過宮炮譜殘頁",en:"Palace Cannon manual page"},{k:"box",zh:"宣紙水墨棋子",en:"Ink-on-paper chess pieces"}],
  title:["📜 焙紙暗房","📜 Paper-drying vault"],lvName:["焙紙暗房・第一層","Paper-drying vault · Level 1"],back:["回過宮炮門","Back to the Palace Cannon School"],
  hall:{at:[560,1180],zh:"📜 焙紙牆・暗門",en:"📜 Drying wall · Hidden door"},
  intro:["你推開溪邊焙紙牆後的暗門走下去，底下是烘紙的地下暖閣，一排排宣紙架掛在黑暗裡。<b>點地面就會走過去</b>，也可以用下面的方向鈕。走到壁燈旁邊會點亮它。","You push open the hidden door behind the drying wall by the stream and climb down into the warm vaults where the paper is dried. Rows of paper racks hang in the dark. <b>Tap the floor to walk there</b>, or use the arrows below. Walk next to a wall lamp to light it."],
  warn:["<b>紙坊護院在巡夜，他照炮的規矩看人：</b>跟你在同一條直線上、中間<b>剛好隔一座宣紙架</b>才看得到你；中間空空的反而看不到。紅線是他看得到的地方。","<b>The workshop guards are on night watch, and they see the way a cannon fires:</b> only when you are on the same straight line with <b>exactly one paper rack</b> between you. With nothing in between, they can't see you. The red line shows what they can see."],
  say:{door:["將死！炮隔著一個子打到將，石門往兩旁滑開。","Checkmate! The cannon fires over one piece and the stone door slides apart."],trap:["將死！護院愣在原地，你趁機溜走。","Checkmate! The guard freezes and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["護院看得眼花，<b>四回合內</b>不會動。","The guard is dazzled and <b>won't move for four turns</b>."],
    dragged:["護院把你押回入口，還把你最後撿到的東西放回原來的箱子。","The guard marches you back to the entrance and puts your last find back in its chest."],
    retry:["你被押回了入口。<b>別站在跟護院隔著一座紙架的那一線上，空曠的地方反而安全。</b>","You were marched back. <b>Don't stand in line with a guard with one paper rack between you. Open ground is safer.</b>"],
    locked:["石門被機關鎖住了。<b>先在暖閣裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the vaults first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的紙庫。第二、三層之後再開。","The steps lead down to the deeper paper stores. Levels 2 and 3 open later."],
    spot:["<b>護院隔著紙架看見你了！</b>趕快離開紅線，下一步還在紅線上就會被逮住。","<b>A guard spots you through a paper rack!</b> Get off the red line now. If you are still on it next turn, you are caught."]}});
