/* ---------- W87-2 起馬地底迷宮・第一層「地下驛道」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單：先把十派第一層補齊）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的起馬門：入口在拴馬樁與馬廄下方的草堆底，地底是運河驛站藏緊急信件與快馬的暗道。
   共用程式在 m/07z9m-maze.js；「馬」的日字跳法與蹩馬腿用屏風馬門的 jhMzHorseCan、JH_MZ_HORSE_DIR（m/07z9m-screen.js，m.html 排在這支前面）。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・無韁野馬（JH_MZ_KIND.wildhorse）沒有固定路線，會循著玩家的足跡追：每回合記下玩家站的格子，朝「LAG 步以前」的那一格跳日字，
       挑八個方向裡落點離那一格最近的；還沒有足跡時照屏風馬門的方式順時針巡。足跡慢 LAG 步，所以繞得夠快就甩得掉。
     ・蹩馬腿照舊：馬腿被牆擋住、或玩家站在馬腿上，那個方向就跳不過去、也看不到；地圖是曲折的日字岔路，繞到牆角讓牠卡住。
   還沒做（之後補）：驛站紙燈籠（點亮後跟著玩家飄 3 回合、視野擴大到 5 格）、碑刻文書 L 與暗門 H、像素材質。 */
const JH_MZ_HORSE_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T.....#.....T#",
"#.##..#.####..#",
"#.#C.....#....#",
"#.#.###.##.##.#",
"#...#.....#...#",
"###.#.##P.#.###",
"#...#.#..##...#",
"#.###.#.#...#.#",
"#.....#.#.#.#C#",
"#.#####...#...#",
"#.#...#.###.#.#",
"#...#.....#...#",
"##.##.#C#.##.##",
"#T.....#.....T#",
"#......@......#",
"###############"];
/* 野馬：從中間偏右的岔路出發；LAG＝足跡慢幾步 */
const JH_MZ_HORSE_LAG=3;
const JH_MZ_HORSE_GUARDS=[{kind:"wildhorse",x:12,y:10,dx:-2,dy:1}];
JH_MZ_KIND.wildhorse={
  /* 視線跟屏風馬門的銅人一樣：下一步跳得到的日字落點 */
  sight(S,G){return JH_MZ_KIND.horse.sight(S,G)},
  /* 記下玩家這一格，朝 LAG 步以前的足跡跳；沒有足跡、或八個方向都跳不過去，就照屏風馬門的巡法 */
  step(S,G){const P=S.player,tr=G.tr||(G.tr=[]);if(P)tr.push([P.x,P.y]);while(tr.length>JH_MZ_HORSE_LAG+1)tr.shift();
    if(tr.length<=JH_MZ_HORSE_LAG)return JH_MZ_KIND.horse.step(S,G);
    const[tx,ty]=tr[0];let best=null,bd=1e9;
    for(const[dx,dy]of JH_MZ_HORSE_DIR){if(!jhMzHorseCan(S,G.x,G.y,dx,dy,G))continue;const nx=G.x+dx,ny=G.y+dy,d=(nx-tx)*(nx-tx)+(ny-ty)*(ny-ty);if(d<bd){bd=d;best=[dx,dy]}}
    if(!best)return;const cur=(G.x-tx)*(G.x-tx)+(G.y-ty)*(G.y-ty);if(bd>=cur)return;   /* 跳了只會更遠：原地等 */
    G.x+=best[0];G.y+=best[1];G.dx=best[0];G.dy=best[1]},
  look:{body:"#7a5a2e",head:"#8d6a38",eye:0xE24A3A}};
/* 殘局題庫（maze-puzzles.js 產生，不要手改）。重跑／核對（在 source/ 底下；核對加 --check、不用 Pikafish）：
   PIKAFISH=<執行檔> node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_HORSE --out xiangqi-db/m/07z9m-horse.js --mate N --door 3 --trap 6
     --exclude xiangqi-db/m/07z9m-maze.js:JH_MZ_POOL_CENTRAL,xiangqi-db/m/07z9m-cross.js:JH_MZ_POOL_CROSS,xiangqi-db/m/07z9m-pawn.js:JH_MZ_POOL_PAWN,xiangqi-db/m/07z9m-screen.js:JH_MZ_POOL_SCREEN
     --title-door "石門機關：馬的殺法" --title-door-en "Stone door: a horse's mate"
     --desc-door "門上刻著一匹路邊的石馬。紅方先走，{n} 步將死黑方，門就會開。提示：馬走日字，馬腿被擋住就跳不過去。"
     --desc-door-en "A roadside stone horse is carved on the door. Red to move: checkmate in {n} and the door opens. Hint: a horse jumps in an L and can't jump if its leg is blocked."
     --title-trap "被無韁野馬撞倒了" --title-trap-en "Knocked down by the unbridled horse"
     --desc-trap "野馬撞過來，背上掉下一封急件，裡頭是一局棋：「解得開，就放你走。」紅方先走，{n} 步將死黑方。"
     --desc-trap-en "The horse barrels into you and an urgent letter falls from its saddle. Inside is a chess problem: \"Solve it and you can go.\" Red to move: checkmate in {n}."
   古譜題、最後一步用馬將死；屏風馬門用掉的雙馬題已排除。 */
/* ==JH_MZ_POOL:JH_MZ_POOL_HORSE== */
const JH_MZ_POOL_HORSE={door:[
{"id":"jc099c4","src":{"book":"橘中秘","title":"馬兵攻雙士炮卒"},"zh":["石門機關：馬的殺法","門上刻著一匹路邊的石馬。紅方先走，3 步將死黑方，門就會開。提示：馬走日字，馬腿被擋住就跳不過去。"],"en":["Stone door: a horse's mate","A roadside stone horse is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a horse jumps in an L and can't jump if its leg is blocked."],"fen":"3ak1P2/3ca4/9/5N3/9/9/9/p8/9/4K4","line":["f6g4","a2a1","g4h6","a1a0","h6f7"]},
{"id":"jz039c6","src":{"book":"蕉竹齋","title":"回騎進兵"},"zh":["石門機關：馬的殺法","門上刻著一匹路邊的石馬。紅方先走，3 步將死黑方，門就會開。提示：馬走日字，馬腿被擋住就跳不過去。"],"en":["Stone door: a horse's mate","A roadside stone horse is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a horse jumps in an L and can't jump if its leg is blocked."],"fen":"3ak1P2/3P5/3a4N/9/9/9/9/9/1p7/3Kp4","line":["d0d1","b1c1","d1d2","e0d0","i7g8"]},
{"id":"lk001c4","src":{"book":"爛柯神機","title":"八蠻獻寶"},"zh":["石門機關：馬的殺法","門上刻著一匹路邊的石馬。紅方先走，3 步將死黑方，門就會開。提示：馬走日字，馬腿被擋住就跳不過去。"],"en":["Stone door: a horse's mate","A roadside stone horse is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a horse jumps in an L and can't jump if its leg is blocked."],"fen":"3kc1cn1/4P3N/9/9/9/3r5/9/4BC3/4p1p2/3p1K3","line":["f2f9","e9e2","f9h9","g9g8","i8g9"]}],
trap:[
{"id":"lk024c4","src":{"book":"爛柯神機","title":"單騎徇敵"},"zh":["被無韁野馬撞倒了","野馬撞過來，背上掉下一封急件，裡頭是一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by the unbridled horse","The horse barrels into you and an urgent letter falls from its saddle. Inside is a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"3C1k3/4P4/4b3c/9/7N1/9/5C3/9/1np1pcr2/3K1n3","line":["h5f6","i7f7","f6d7","f7i7","d7e9"]},
{"id":"lk072c7","src":{"book":"爛柯神機","title":"季庭舞俏"},"zh":["被無韁野馬撞倒了","野馬撞過來，背上掉下一封急件，裡頭是一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by the unbridled horse","The horse barrels into you and an urgent letter falls from its saddle. Inside is a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"9/2NP5/5k3/3n1C3/2r6/9/9/4p4/3pCp3/4K4","line":["c8d6","f7f8","d8e8","f8f9","d6f7"]},
{"id":"lk200c7","src":{"book":"爛柯神機","title":"挾彈馳驅"},"zh":["被無韁野馬撞倒了","野馬撞過來，背上掉下一封急件，裡頭是一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by the unbridled horse","The horse barrels into you and an urgent letter falls from its saddle. Inside is a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"2b6/4k1P2/4b4/9/4N4/4C4/9/7r1/4p4/3K5","line":["e5g6","e7g9","g8f8","e8e9","g6e7"]},
{"id":"lk236","src":{"book":"爛柯神機","title":"運實於虛"},"zh":["被無韁野馬撞倒了","野馬撞過來，背上掉下一封急件，裡頭是一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by the unbridled horse","The horse barrels into you and an urgent letter falls from its saddle. Inside is a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"4ka3/3Pn4/5R3/5N3/9/9/1r1n5/9/4p4/3K5","line":["d8d9","e9d9","f7d7","d9e9","f6g8"]},
{"id":"lk252c5","src":{"book":"爛柯神機","title":"縱橫馳驟"},"zh":["被無韁野馬撞倒了","野馬撞過來，背上掉下一封急件，裡頭是一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by the unbridled horse","The horse barrels into you and an urgent letter falls from its saddle. Inside is a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"3n5/3N1k3/9/9/9/9/9/3n5/3r1r3/C3K4","line":["a0a8","d9b8","d8e6","f8f9","e6g7"]},
{"id":"mr001","src":{"book":"夢入神機","title":"由中應外"},"zh":["被無韁野馬撞倒了","野馬撞過來，背上掉下一封急件，裡頭是一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by the unbridled horse","The horse barrels into you and an urgent letter falls from its saddle. Inside is a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"1RN1k4/3P3rC/6n2/9/9/9/9/4p4/3p5/c1rAK4","line":["d8e8","e9d9","e8e9","d9e9","c9d7"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_HORSE== */
jhMzDef("horse",{map:JH_MZ_HORSE_MAP,guards:JH_MZ_HORSE_GUARDS,pool:JH_MZ_POOL_HORSE,
  puz:{door:JH_MZ_POOL_HORSE.door[0],trap:JH_MZ_POOL_HORSE.trap[0]},solid:"#D",opaque:"#D",jump:"",
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"起馬譜殘頁",en:"Horse Opening manual page"},{k:"box",zh:"稱號「御風驛卒」",en:"Title: Wind-riding Courier"}],
  title:["🐴 地下驛道","🐴 Underground post road"],lvName:["地下驛道・第一層","Underground post road · Level 1"],back:["回起馬門","Back to the Horse Opening School"],
  hall:{at:[600,880],zh:"🐴 馬廄・草堆底的暗道",en:"🐴 Stable · Tunnel under the hay"},
  intro:["你撥開馬廄下方的草堆，底下是驛站藏急件和快馬的暗道，岔路彎來彎去。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。走到壁燈旁邊會點亮它。",
    "You push aside the hay under the stable. Below is the post station's hidden road for urgent letters and fast horses, twisting and branching. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). Walk next to a wall lamp to light it."],
  warn:["<b>無韁野馬聞到你的足跡了：</b>牠會循著你幾步以前走過的地方追來，每一步跳日字，地上的紅格是牠下一步跳得到、也看得到的地方。<b>蹩馬腿</b>：馬腿被牆擋住、或你站在馬腿上，牠就跳不過去。繞進曲折的岔路，讓牠卡在牆角。",
    "<b>The unbridled horse has caught your scent:</b> it follows where you walked a few steps ago, jumping in an L each turn. The red squares are where it can land next, and what it can see. <b>Block the leg:</b> if a wall blocks the first square of its jump, or you stand on it, it can't jump that way. Lead it into the twisting side paths and let it get stuck in a corner."],
  say:{door:["將死！馬踏到將的面前，石門往兩旁滑開。","Checkmate! The horse leaps up to the general and the stone door slides apart."],trap:["將死！野馬嘶了一聲停下來，你趁機溜走。","Checkmate! The horse rears and stops, and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["野馬喘著氣，<b>四回合內</b>不會動。","The horse is out of breath. <b>It won't move for four turns.</b>"],
    dragged:["野馬把你撞回入口，你最後撿到的東西也掉回原來的箱子。","The horse knocks you back to the entrance, and your last find falls back into its chest."],
    retry:["你被撞回了入口。<b>野馬是循著你的足跡追的，繞個圈、轉進彎路，讓牠的馬腿卡在牆角。</b>","You were knocked back. <b>The horse follows your trail. Loop around and turn into a bend so a wall blocks its leg.</b>"],
    locked:["石門被機關鎖住了。<b>先在暗道裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the tunnels first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的驛道。第二、三層之後再開。","The steps lead down to the deeper post road. Levels 2 and 3 open later."],
    spot:["<b>野馬轉過來，下一步就跳得到你！</b>趕快離開紅格，下一步還在紅格上就會被撞倒。","<b>The horse turns: its next jump can reach you!</b> Get off the red squares now. If you are still on one next turn, you'll be knocked down."]}});
