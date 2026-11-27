/* ---------- W87-2 順炮地底迷宮・第一層「煮鹽廢灶」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單：先把十派第一層補齊）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的順炮門：入口在煎鹽灶底下的灰坑，地底是海堤邊私鹽販子挖的長條形走私地道。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE）；這支只登記順炮這一層，不改共用程式。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・鹽道暗哨（JH_MZ_KIND.dash）只在筆直的長廊上來回衝刺：一回合衝兩格（第二格被擋就只走一格、衝到玩家那一格就停），
       撞到牆不會馬上掉頭，要花一回合轉身（那一回合原地不動）；只看正前方，最遠 JH_MZ_SAME_RANGE 格，被牆或鹽灶擋住就看不到。
       中炮門的暗匪一回合一格、撞牆當回合掉頭、看 5 格；這裡快一倍、看得更遠，但轉身慢——趁牠轉身那一回合穿過長廊，或躲進牆邊的凹槽。
     ・廢棄鹽灶（s）還在悶燒：擋路、擋視線；走到鹽灶旁邊（上下左右）就把它撥旺，之後一直亮著，照亮四周（跟點亮的壁燈一樣）。
   還沒做（之後補）：碑刻文書 L 與暗門 H（要先請 Gemini 查史料、iMac Claude 1 複核）、像素材質（每派一套，出圖要先問開發者）。 */
const JH_MZ_SAME_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T.......s..T.#",
"###.#######.###",
"#.............#",
"#.##.#####.##.#",
"#C##.......##C#",
"####.#s#P..####",
"####.#####.####",
"#.............#",
"#.##.#####.##.#",
"#.##...s...##.#",
"####...C...####",
"####.#####.####",
"#.............#",
"####.#####.####",
"#T....@......T#",
"###############"];
/* 三條長廊（第 6、11、16 列）各一個暗哨；dx＝一開始往哪邊衝 */
const JH_MZ_SAME_RANGE=7;
const JH_MZ_SAME_GUARDS=[{kind:"dash",x:13,y:6,dx:-1,dy:0},{kind:"dash",x:1,y:11,dx:1,dy:0},{kind:"dash",x:7,y:16,dx:1,dy:0}];
JH_MZ_KIND.dash={
  /* 只看正前方，碰到擋路的東西（牆、鹽灶、石門）就停；轉身那一回合看的是新的方向 */
  sight(S,G){const o=[],dx=G.dx||0,dy=G.dy||0,n=G.range||JH_MZ_SAME_RANGE;for(let i=1;i<=n;i++){const x=G.x+dx*i,y=G.y+dy*i;if(jhMzSolid(S,x,y))break;o.push({x,y})}return o},
  /* 前面一格就擋路：這一回合只轉身（換方向、不動）；不然衝兩格，第二格擋路就只走一格，衝到玩家那一格就停在那裡 */
  step(S,G){const dx=G.dx||0,dy=G.dy||0,P=S.player;
    if(jhMzSolid(S,G.x+dx,G.y+dy)){G.dx=-dx;G.dy=-dy;return}
    for(let i=0;i<2;i++){const nx=G.x+dx,ny=G.y+dy;if(jhMzSolid(S,nx,ny))break;G.x=nx;G.y=ny;if(P&&P.x===nx&&P.y===ny)break}},
  look:{body:"#6b2e22",head:"#7d3a2c",eye:0xFFB04A}};
/* 鹽灶：走到旁邊（上下左右）就點亮，之後一直亮著（跟壁燈一樣記在 S.lit）。在走這一步之前判斷要走進的那一格；撞牆不算 */
function jhMzSameStove(S,dx,dy){const P=S.player,nx=P.x+dx,ny=P.y+dy;if(jhMzSolid(S,nx,ny))return null;
  for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=nx+a,y=ny+b;if(jhMzCell(S,x,y)==="s")S.lit.add(y*S.W+x)}return null}
/* 鹽灶（3D）：矮土灶上一口鐵鹽盤，灶口一點暗紅的火；平面版：方形土灶加紅點 */
if(!JH_MZ_OBJ["s"])JH_MZ_OBJ["s"]=H=>{const{T3,mesh,lam}=H,g=new T3.Group();
  g.add(mesh(new T3.BoxGeometry(.78,.42,.78),lam("#6e4a36"),0,.21,0));g.add(mesh(new T3.CylinderGeometry(.36,.32,.08,20),lam("#3a3a3a"),0,.46,0));
  g.add(mesh(new T3.BoxGeometry(.26,.16,.04),new T3.MeshBasicMaterial({color:0xD2552A}),0,.14,.4));return g};
if(!JH_MZ_TILE["s"])JH_MZ_TILE["s"]=(cx,px,py,T)=>{cx.fillStyle="#6e4a36";cx.fillRect(px+T*.12,py+T*.12,T*.76,T*.76);
  cx.fillStyle="#3a3a3a";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.26,0,Math.PI*2);cx.fill();cx.fillStyle="#d2552a";cx.fillRect(px+T*.4,py+T*.74,T*.2,T*.1)};
/* 殘局題庫（maze-puzzles.js 產生，不要手改）。重跑／核對（在 source/ 底下；核對加 --check、不用 Pikafish）：
   PIKAFISH=<執行檔> node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_SAME --out xiangqi-db/m/07z9m-same.js --mate C --door 3 --trap 6 --prefer-red C2
     --exclude xiangqi-db/m/07z9m-maze.js:JH_MZ_POOL_CENTRAL,xiangqi-db/m/07z9m-cross.js:JH_MZ_POOL_CROSS,xiangqi-db/m/07z9m-pawn.js:JH_MZ_POOL_PAWN,xiangqi-db/m/07z9m-screen.js:JH_MZ_POOL_SCREEN,xiangqi-db/m/07z9m-horse.js:JH_MZ_POOL_HORSE
   古譜題、最後一步用炮將死、雙炮題（--prefer-red C2，順炮＝兩邊都架中炮）先取；Pikafish 驗紅方每一步唯一解。 */
/* ==JH_MZ_POOL:JH_MZ_POOL_SAME== */
const JH_MZ_POOL_SAME={door:[
{"id":"lk016c7","src":{"book":"爛柯神機","title":"殘騎誘敵"},"zh":["石門機關：雙炮的殺法","門上刻著兩座同向的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，兩門炮疊在同一條線上，前面那門就是後面那門的炮架。"],"en":["Stone door: a two-cannon mate","Two catapults facing the same way are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over. With two cannons on one line, the front one is the screen for the back one."],"fen":"1r7/2Pnak1N1/3a5/4CC3/6b2/9/4P4/4rA3/2p1An2c/3K1p3","line":["h8f7","f8f7","f6f1","f7e7","e6e2"]},
{"id":"lk113c4","src":{"book":"爛柯神機","title":"泥丸封關"},"zh":["石門機關：雙炮的殺法","門上刻著兩座同向的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，兩門炮疊在同一條線上，前面那門就是後面那門的炮架。"],"en":["Stone door: a two-cannon mate","Two catapults facing the same way are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over. With two cannons on one line, the front one is the screen for the back one."],"fen":"2rc1C3/2P2P3/3kbn3/2P2n3/9/9/9/4B4/2rp1c3/4KCp2","line":["c6d6","d9d6","f9f7","f1f7","f0f7"]},
{"id":"lk135c7","src":{"book":"爛柯神機","title":"強弩射潮"},"zh":["石門機關：雙炮的殺法","門上刻著兩座同向的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，兩門炮疊在同一條線上，前面那門就是後面那門的炮架。"],"en":["Stone door: a two-cannon mate","Two catapults facing the same way are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over. With two cannons on one line, the front one is the screen for the back one."],"fen":"3a5/2P3cP1/2P1ka1c1/6p2/2n1r4/9/8r/4n4/4C1p2/3pCK3","line":["e0e2","i3e3","e1e3","c5e4","e2e4"]}],
trap:[
{"id":"mr105c7","src":{"book":"夢入神機","title":"擁眾拒險"},"zh":["被鹽道暗哨逮住了","暗哨把你按在鹽灶邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a salt-road sentry","The sentry pins you against a salt stove: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"C7C/6PP1/4ka1r1/9/4N4/2P6/9/3A5/3nR1p2/c1rA1K3","line":["e5c6","e7d7","c6b8","d7d8","a9a8"]},
{"id":"sq035c4","src":{"book":"適情雅趣","title":"龍翻潭底"},"zh":["被鹽道暗哨逮住了","暗哨把你按在鹽灶邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a salt-road sentry","The sentry pins you against a salt stove: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"1CbnR4/5k3/4b4/2N1C4/9/9/4P1r2/8B/4Ar1n1/2BAK3c","line":["e9f9","f8f9","c6d8","f9f8","b9b8"]},
{"id":"lk192c7","src":{"book":"爛柯神機","title":"先軫免胄"},"zh":["被鹽道暗哨逮住了","暗哨把你按在鹽灶邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a salt-road sentry","The sentry pins you against a salt stove: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"4k2c1/3Pa4/n3Na3/9/2b3b2/4C1B2/9/8B/4p1rnc/3K5","line":["d8d9","h9d9","e7c8","e9f9","e4f4"]},
{"id":"lk219c6","src":{"book":"爛柯神機","title":"以退為進"},"zh":["被鹽道暗哨逮住了","暗哨把你按在鹽灶邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a salt-road sentry","The sentry pins you against a salt stove: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"5k3/2N6/4b1n2/5Cp2/4pcb2/5p3/4PRP2/5r3/4rNp2/3K1p3","line":["f6f4","f5f3","f4f2","f3f1","f2f0"]},
{"id":"sq206c5","src":{"book":"適情雅趣","title":"孤星墜地"},"zh":["被鹽道暗哨逮住了","暗哨把你按在鹽灶邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a salt-road sentry","The sentry pins you against a salt stove: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"9/5k3/3aPa3/1N7/9/9/3C5/1p2KA1rc/2c1A4/5p3","line":["d3f3","f7e8","e7f7","f8f7","f3f0"]},
{"id":"sq233c5","src":{"book":"適情雅趣","title":"停車絆馬"},"zh":["被鹽道暗哨逮住了","暗哨把你按在鹽灶邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a salt-road sentry","The sentry pins you against a salt stove: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"nR7/4ak3/9/9/4N4/2C2c3/5n3/9/r5p1r/4K4","line":["c4c8","e8f9","e5d7","f8f7","c8c7"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SAME== */
jhMzDef("same_cannon",{map:JH_MZ_SAME_MAP,guards:JH_MZ_SAME_GUARDS,pool:JH_MZ_POOL_SAME,
  puz:{door:JH_MZ_POOL_SAME.door[0],trap:JH_MZ_POOL_SAME.trap[0]},solid:"#Ds",opaque:"#Ds",jump:"",onStep:jhMzSameStove,
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"順炮譜殘頁",en:"Same-Direction Cannons manual page"},{k:"box",zh:"稱號「破浪鹽丁」",en:"Title: Wave-breaking Salter"}],
  title:["🧂 煮鹽廢灶","🧂 Abandoned salt stoves"],lvName:["煮鹽廢灶・第一層","Abandoned salt stoves · Level 1"],back:["回順炮門","Back to the Same-Direction Cannons School"],
  hall:{at:[600,600],zh:"🧂 煎鹽灶・灰坑暗道",en:"🧂 Salt stove · Tunnel in the ash pit"},
  intro:["你從煎鹽灶底下的灰坑鑽下去，底下是私鹽販子挖的走私地道，幾條長廊又直又窄。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。走到壁燈或還在悶燒的鹽灶旁邊，會把它點亮。",
    "You squeeze down through the ash pit under the salt stove. Below are the smugglers' tunnels: a few long, straight, narrow corridors. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). Walk next to a wall lamp or a smoldering salt stove to light it up."],
  warn:["<b>鹽道暗哨在長廊上來回衝刺：</b>一回合衝兩格，只看正前方（地上的紅線）。牠衝到盡頭要<b>花一回合轉身</b>，那一回合不會動。趁牠轉身時穿過長廊，或躲進牆邊的凹槽。",
    "<b>Salt-road sentries dash back and forth along the corridors:</b> two squares a turn, looking only straight ahead (the red line on the floor). At the end of a corridor a sentry <b>spends a turn turning around</b> and doesn't move. Cross while it turns, or duck into a notch in the wall."],
  say:{door:["將死！兩門炮架在同一條線上，石門往兩旁滑開。","Checkmate! The two cannons line up and the stone door slides apart."],trap:["將死！暗哨愣住了，你趁機溜走。","Checkmate! The sentry freezes and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["暗哨衝昏了頭，<b>四回合內</b>不會動。","The sentry is dizzy from dashing. <b>It won't move for four turns.</b>"],
    dragged:["暗哨把你押回入口，還把你最後撿到的東西放回原來的箱子。","The sentry marches you back to the entrance and puts your last find back in its chest."],
    retry:["你被押回了入口。<b>暗哨衝到盡頭要花一回合轉身，那時候穿過長廊最安全。</b>","You were marched back. <b>A sentry spends a turn turning around at the end of a corridor. That's the safest moment to cross.</b>"],
    locked:["石門被機關鎖住了。<b>先在地道裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the tunnels first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的鹽倉。第二、三層之後再開。","The steps lead down into the deeper salt stores. Levels 2 and 3 open later."],
    spot:["<b>暗哨轉過來，紅線照到你了！</b>趕快離開紅線，下一步還在紅線上就會被逮住。","<b>The sentry turns and its red line is on you!</b> Get off it now. If you are still on it next turn, you are caught."]}});
