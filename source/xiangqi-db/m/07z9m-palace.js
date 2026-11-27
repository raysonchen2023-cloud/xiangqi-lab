/* ---------- W87-2 反宮馬地底迷宮・第一層「藏版墨窟」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單：先把十派第一層補齊）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的反宮馬門：入口在刻書作坊的投石車模型下方，地底是徽州書坊存放廢棄雕版與徽墨的陰暗地窖，木架錯綜。
   共用程式在 m/07z9m-maze.js；「馬」的日字跳法與蹩馬腿用屏風馬門的 jhMzHorseCan、JH_MZ_HORSE_DIR（m/07z9m-screen.js，m.html 排在這支前面）。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・墨工傀儡（JH_MZ_KIND.inkpuppet）照馬走日字，帶「反宮」的脾氣：每回合在跳得過去的方向裡，挑落點離自己那一片工坊中心最遠的（不跳出工坊、不跳回上一格、不踩墨池）；
       一樣遠就照 JH_MZ_HORSE_DIR 的順序挑。所以牠老在工坊外圈打轉，難得回到中間。看得到的＝下一步跳得到的日字落點；馬腿被木架擋住、或玩家站在馬腿上，那個方向就看不到。
     ・廢墨池（K）：走得過去，可是光照到就被吸掉——燈火照得到墨池本身，照不到墨池後面（墨池擋光），轉角後面是一片黑。
       傀儡怕墨不踩墨池，也看不見泡在墨池裡的人：站進墨池，牠的日字落點就算正好是你，也抓不到。
   還沒做（之後補）：碑刻文書 L 與暗門 H（要先請 Gemini 查史料、iMac Claude 1 複核）、像素材質（每派一套，出圖要先問開發者）。 */
const JH_MZ_PALACE_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"####.#####.####",
"#C..........#.#",
"#.#.K...K.#...#",
"#.#.......#.#.#",
"#...K...K...#P#",
"#.#.......#.#.#",
"#.#########.#.#",
"#C..........#.#",
"###.#.###.#...#",
"#...#...#.#.#C#",
"#.K...K...K...#",
"#...#...#...#.#",
"##.###.#####.##",
"#T....@......T#",
"###############"];
/* 兩個傀儡各管一片工坊（zone＝[左,上,右,下]，含邊）；px、py＝上一格（不跳回去） */
const JH_MZ_PALACE_GUARDS=[{kind:"inkpuppet",zone:[3,12,9,16],x:6,y:14},{kind:"inkpuppet",zone:[3,6,9,10],x:6,y:8}];
/* 傀儡那一片工坊的中心 */
const jhMzPalaceMid=G=>[(G.zone[0]+G.zone[2])/2,(G.zone[1]+G.zone[3])/2];
/* 傀儡能不能往 (dx,dy) 跳：屏風馬門的蹩馬腿規則，加上落點要在自己的工坊裡、不是墨池 */
function jhMzPalaceCan(S,G,dx,dy){const Z=G.zone,nx=G.x+dx,ny=G.y+dy;
  if(Z&&(nx<Z[0]||nx>Z[2]||ny<Z[1]||ny>Z[3]))return false;if(jhMzCell(S,nx,ny)==="K")return false;return jhMzHorseCan(S,G.x,G.y,dx,dy,null)}
JH_MZ_KIND.inkpuppet={
  /* 看得到的＝下一步跳得到的日字落點（出了工坊也算；馬腿被擋就沒有；落點是墨池就看不到） */
  sight(S,G){const o=[];for(const[dx,dy]of JH_MZ_HORSE_DIR){const x=G.x+dx,y=G.y+dy;if(jhMzCell(S,x,y)==="K")continue;if(jhMzHorseCan(S,G.x,G.y,dx,dy,null))o.push({x,y})}return o},
  /* 反宮：挑落點離工坊中心最遠的；不跳回上一格（只剩那一格可跳才回去）；都跳不了就原地等 */
  step(S,G){const[cx,cy]=jhMzPalaceMid(G);let best=null,bd=-1,back=null;
    for(const[dx,dy]of JH_MZ_HORSE_DIR){if(!jhMzPalaceCan(S,G,dx,dy))continue;const nx=G.x+dx,ny=G.y+dy;
      if(nx===G.px&&ny===G.py){back=[dx,dy];continue}const d=(nx-cx)*(nx-cx)+(ny-cy)*(ny-cy);if(d>bd){bd=d;best=[dx,dy]}}
    const m=best||back;if(!m)return;G.px=G.x;G.py=G.y;G.x+=m[0];G.y+=m[1];G.dx=m[0];G.dy=m[1]},
  look:{body:"#2b2233",head:"#4a3a55",eye:0x9b7bd0}};
/* 3D：廢墨池（地上一灘墨紫色的池子，邊上一圈淡光）；平面版：墨色方格 */
if(!JH_MZ_OBJ.K)JH_MZ_OBJ.K=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.CylinderGeometry(.46,.46,.03,28),new T3.MeshLambertMaterial({color:0x140f1c}),0,.015,0));
  g.add(mesh(new T3.TorusGeometry(.46,.025,6,28),new T3.MeshBasicMaterial({color:0x5b3f78}),0,.03,0)).rotation.x=Math.PI/2;return g};
if(!JH_MZ_TILE.K)JH_MZ_TILE.K=(cx,px,py,T)=>{cx.fillStyle="#2a2018";cx.fillRect(px,py,T,T);cx.fillStyle="#140f1c";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.44,0,Math.PI*2);cx.fill();cx.strokeStyle="#5b3f78";cx.lineWidth=2;cx.stroke()};
/* ==JH_MZ_POOL:JH_MZ_POOL_PALACE== */
const JH_MZ_POOL_PALACE={door:[
{"id":"sq171c6","src":{"book":"適情雅趣","title":"贏縮無常"},"zh":["石門機關：炮馬聯手","門上刻著一匹馬和一座投石車。紅方先走，3 步將死黑方，門就會開。提示：馬和炮要配合，別讓自己的子把路擋住。"],"en":["Stone door: cannon and horse together","A horse and a trebuchet are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse and cannon work together; don't let your own pieces block the way."],"fen":"3k3C1/2P1N4/9/9/9/9/9/5p3/1rrnc2R1/5K1p1","line":["e8g9","e1e9","h1d1","c1d1","g9e8"]},
{"id":"sq172c6","src":{"book":"適情雅趣","title":"動行網羅"},"zh":["石門機關：炮馬聯手","門上刻著一匹馬和一座投石車。紅方先走，3 步將死黑方，門就會開。提示：馬和炮要配合，別讓自己的子把路擋住。"],"en":["Stone door: cannon and horse together","A horse and a trebuchet are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse and cannon work together; don't let your own pieces block the way."],"fen":"3akc1NC/4a4/9/9/9/9/9/6p2/1n1p5/2p1K1C1c","line":["g0c0","d1d0","e0e1","d0c0","h9f8"]},
{"id":"sq184c4","src":{"book":"適情雅趣","title":"蛇龍混海"},"zh":["石門機關：炮馬聯手","門上刻著一匹馬和一座投石車。紅方先走，3 步將死黑方，門就會開。提示：馬和炮要配合，別讓自己的子把路擋住。"],"en":["Stone door: cannon and horse together","A horse and a trebuchet are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse and cannon work together; don't let your own pieces block the way."],"fen":"C2k1Nr1C/4P4/r2cb4/9/9/9/9/6p2/4p4/5K3","line":["f9d8","g9g8","d8b9","e7c9","b9c7"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PALACE== */
/* ==JH_MZ_POOL:JH_MZ_POOL_PALACE_TRAP== */
const JH_MZ_POOL_PALACE_TRAP={door:[
],
trap:[
{"id":"lk173c5","src":{"book":"爛柯神機","title":"歲寒松柏"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"5cb2/3n1P3/2r1k4/2Rc1PN2/4P1b2/2r6/9/2p6/3p1p3/4K4","line":["e5e6","d8e6","f6e6","e7f7","e6f6"]},
{"id":"lk241","src":{"book":"爛柯神機","title":"直搗黃龍-紅勝-01"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"2P1ka1P1/3PaP2R/2n1b1n2/3NpP3/9/2c6/9/9/4pr3/3K1C1r1","line":["d8d9","e8d9","d6c8","c4c8","c9d9"]},
{"id":"mr002","src":{"book":"夢入神機","title":"弋不射宿"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"3akab2/Rc1Pn4/7C1/6pN1/1r7/9/9/9/2pC5/3K2B1r","line":["h7e7","e8g7","h6g8","b8g8","d8e8"]},
{"id":"mr085c5","src":{"book":"夢入神機","title":"七國爭雄"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"4P1b2/2P6/2nkb4/1P2n4/4N4/9/9/4C4/4p1p1r/C4K1c1","line":["a0a7","c7a8","b6b7","a8c7","b7c7"]},
{"id":"mr087c5","src":{"book":"夢入神機","title":"兵機在手"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"2ba1a3/3k1r2r/4NN3/3P5/9/1n2C4/2c6/3p5/4p4/3K5","line":["e7c6","d8e8","d6e6","c9e7","e6e7"]},
{"id":"mr112c8","src":{"book":"夢入神機","title":"雙燕爭飛"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"1P3k2r/4a4/5N3/9/4N4/9/9/5n3/3p1p3/4K4","line":["f7h8","f9e9","e5f7","e9d9","b9c9"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PALACE_TRAP== */
jhMzDef("palace_horse",{map:JH_MZ_PALACE_MAP,guards:JH_MZ_PALACE_GUARDS,pool:{door:JH_MZ_POOL_PALACE.door,trap:JH_MZ_POOL_PALACE_TRAP.trap},
  puz:{door:JH_MZ_POOL_PALACE.door[0],trap:JH_MZ_POOL_PALACE_TRAP.trap[0]},solid:"#D",opaque:"#DK",jump:"",
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"反宮馬譜殘頁",en:"Reverse Palace Horse manual page"},{k:"box",zh:"歙硯墨錠",en:"She inkstone ink stick"}],
  title:["🖋 藏版墨窟","🖋 Ink-block cellar"],lvName:["藏版墨窟・第一層","Ink-block cellar · Level 1"],back:["回反宮馬門","Back to the Reverse Palace Horse School"],
  hall:{at:[590,1150],zh:"🖋 投石車模型下・藏版墨窟",en:"🖋 Under the trebuchet model · Ink-block cellar"},
  intro:["你在刻書作坊的投石車模型底下摸到一塊鬆動的地磚，掀開是書坊存放廢棄雕版和徽墨的地窖，木架一排一排。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。地上的廢墨池會吸光，墨池後面照不到。",
    "Under the trebuchet model in the printing workshop you find a loose floor tile. Below is the cellar where the printers keep old woodblocks and Huizhou ink, shelf after shelf. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). The pools of waste ink swallow light: you can't see past them."],
  warn:["<b>墨工傀儡照馬走日字，脾氣是「反宮」：</b>老往離工坊中間最遠的地方跳，看得到的是牠下一步跳得到的日字落點（地上的紅格）。馬腿被木架擋住、或你站在牠的馬腿上，那個方向就看不到；牠也不踩墨池，<b>站進墨池就看不見你</b>。",
    "<b>The ink puppets move like a horse, with a 'reverse palace' streak:</b> they always jump as far from the middle of their workshop as they can, and see the L-shaped squares they could jump to next (the red squares). If a shelf blocks the horse's leg, or you stand on its leg, it can't see that way. They won't step in ink either: <b>stand in an ink pool and they can't see you</b>."],
  say:{door:["將死！馬後一炮，石門往兩旁滑開。","Checkmate! Cannon behind the horse, and the stone door slides apart."],trap:["將死！墨工傀儡的線斷了，軟倒在地上，你趁機溜走。","Checkmate! The ink puppet's strings snap, it slumps to the floor, and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["墨工傀儡的線鬆了，<b>四回合內</b>不會動。","The puppet's strings have gone slack. <b>It won't move for four turns.</b>"],
    dragged:["墨工傀儡把你拖回入口，還把你最後撿到的東西放回原來的箱子。","The puppet drags you back to the entrance and puts your last find back in its chest."],
    retry:["你被拖回了入口。<b>看紅格：那是傀儡下一步跳得到的地方；躲到牠的馬腿上、或站進墨池。</b>","You were dragged back. <b>Watch the red squares: they're where the puppet can jump next. Stand on its leg, or in an ink pool.</b>"],
    locked:["石門被機關鎖住了。<b>先在墨窟裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the cellar first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的版庫。第二、三層之後再開。","The steps lead down to deeper block stores. Levels 2 and 3 open later."],
    spot:["<b>墨工傀儡轉過頭來，你站在牠的日字落點上！</b>趕快離開紅格，下一步還在紅格上就會被逮住。","<b>The puppet turns its head: you're on a square it can jump to!</b> Get off the red squares now. If you are still on one next turn, you are caught."]}});
