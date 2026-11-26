/* ---------- W87-2 列炮地底迷宮・第一層「戲台底閣」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單：先把十派第一層補齊）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的列炮門：入口在戲台鼓架底下的機關，地底是秦淮河畔戲班存放布景、服裝的地下夾層。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE）；這支只登記列炮這一層，不改共用程式。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・地圖被中間一條地下水溝（~，像楚河漢界）分成上下對稱的兩半，只有兩座小橋過得去；水溝擋路、不擋視線。
     ・淨面戲軸（JH_MZ_KIND.king）照將帥的規矩：只在自己那一側的 3×3 九宮裡巡，一回合走一格直線（繞九宮外圈）。
       看得到的＝上下左右緊鄰的四格，再加上「飛將」：跟牠同一條直行（同一欄）、中間沒有戲箱（X）或牆擋著，不管多遠都看得到，隔著水溝也一樣。
       所以穿過九宮那幾欄時，要躲在戲箱後面，或趁牠走到別欄的時候。
     ・冷光柱（M）：戲台地板縫隙透下來的月光。站進光柱，整條直行（上下到被擋住為止，越過水溝）都看得清楚——先看清對岸戲軸在哪一欄再過去。
   還沒做（之後補）：碑刻文書 L 與暗門 H（要先請 Gemini 查史料、iMac Claude 1 複核）、像素材質（每派一套，出圖要先問開發者）。 */
const JH_MZ_OPP_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#..X.......X..#",
"#.M.........M.#",
"#..X.......X..#",
"#C..........P.#",
"#..X..X.X..X..#",
"#.............#",
"####.#~~~#.####",
"#.............#",
"#..X..X.X..X..#",
"#.M.........M.#",
"#..X.......X..#",
"#C...........C#",
"#.............#",
"#T.@.......T..#",
"###############"];
/* 兩個淨面戲軸：上半、下半各一個九宮（左上角 pal＝[x,y]），i＝目前在外圈第幾格 */
const JH_MZ_OPP_RING=[[0,0],[1,0],[2,0],[2,1],[2,2],[1,2],[0,2],[0,1]];
/* 兩個戲軸的步調差 2 格：差 4 格時兩邊的空檔剛好互相封死、走不過去（測試會檢查）；被抓解題後那一個停 4 回合，步調差在 2、6 之間換，都走得過 */
const JH_MZ_OPP_GUARDS=[{kind:"king",pal:[5,5],i:0,x:5,y:5},{kind:"king",pal:[5,14],i:2,x:7,y:14}];
JH_MZ_KIND.king={
  /* 緊鄰四格（擋路的不算）＋飛將：同一欄往上、往下直到被擋光的東西擋住（水溝不擋光） */
  sight(S,G){const o=[];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=G.x+dx,y=G.y+dy;if(!jhMzSolid(S,x,y))o.push({x,y})}
    for(const dy of[-1,1])for(let y=G.y+dy;y>0&&y<S.H-1;y+=dy){if(jhMzOpaque(S,G.x,y))break;if(!jhMzSolid(S,G.x,y)&&Math.abs(y-G.y)>1)o.push({x:G.x,y})}
    return o},
  /* 繞九宮外圈走一格（直線）；下一格被擋（例如推來的東西）就原地等 */
  step(S,G){const P=G.pal||[G.x-1,G.y-1],n=JH_MZ_OPP_RING.length,i=((G.i||0)+1)%n,[a,b]=JH_MZ_OPP_RING[i],nx=P[0]+a,ny=P[1]+b;
    if(jhMzSolid(S,nx,ny))return;G.i=i;G.dx=nx-G.x;G.dy=ny-G.y;G.x=nx;G.y=ny},
  look:{body:"#a8743a",head:"#f2e6cf",eye:0x2b1a10}};
/* 冷光柱：走進光柱那一格，整條直行（上下到被擋光的東西為止）都看得到。在走這一步之前判斷要走進的那一格；撞牆不算 */
function jhMzOppMoon(S,dx,dy){const P=S.player,nx=P.x+dx,ny=P.y+dy;if(jhMzSolid(S,nx,ny)||jhMzCell(S,nx,ny)!=="M")return null;
  for(const d of[-1,1])for(let y=ny;y>0&&y<S.H-1;y+=d){if(y!==ny&&jhMzOpaque(S,nx,y))break;S.seen.add(y*S.W+nx)}return null}
/* 3D：戲箱（朱漆木箱、銅角）、水溝（深色水面）、冷光柱（很淡的光圈）；平面版各自的樣子 */
if(!JH_MZ_OBJ.X)JH_MZ_OBJ.X=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),rd=lam("#8a2e24"),br=lam("#b88a3a");
  g.add(mesh(new T3.BoxGeometry(.8,.56,.6),rd,0,.28,0));g.add(mesh(new T3.BoxGeometry(.84,.06,.64),br,0,.56,0));
  for(const s of[-1,1])g.add(mesh(new T3.BoxGeometry(.06,.5,.62),br,s*.38,.27,0));return g};
if(!JH_MZ_OBJ["~"])JH_MZ_OBJ["~"]=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,.04,1),new T3.MeshLambertMaterial({color:0x1d3346,transparent:true,opacity:.92}),0,.02,0));return g};
if(!JH_MZ_OBJ.M)JH_MZ_OBJ.M=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.CylinderGeometry(.42,.42,.02,24),new T3.MeshBasicMaterial({color:0xcfe0ee,transparent:true,opacity:.35}),0,.012,0));return g};
if(!JH_MZ_TILE.X)JH_MZ_TILE.X=(cx,px,py,T)=>{cx.fillStyle="#8a2e24";cx.fillRect(px+T*.1,py+T*.2,T*.8,T*.6);cx.strokeStyle="#b88a3a";cx.lineWidth=2;cx.strokeRect(px+T*.1,py+T*.2,T*.8,T*.6)};
if(!JH_MZ_TILE["~"])JH_MZ_TILE["~"]=(cx,px,py,T)=>{cx.fillStyle="#1d3346";cx.fillRect(px,py,T,T);cx.strokeStyle="rgba(160,190,210,.5)";cx.beginPath();cx.moveTo(px+T*.15,py+T*.5);cx.quadraticCurveTo(px+T*.5,py+T*.3,px+T*.85,py+T*.5);cx.stroke()};
if(!JH_MZ_TILE.M)JH_MZ_TILE.M=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="rgba(207,224,238,.35)";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.42,0,Math.PI*2);cx.fill()};
/* 殘局題庫（maze-puzzles.js 產生，不要手改），分兩段出：炮收尾的 2～3 步古譜題被前幾派用到只剩 4 題，只夠石門。
   石門（兩翼的炮）＝JH_MZ_POOL_OPP 的 door：--mate C --door 3 --trap 0 --prefer-red C2；
   陷阱（飛將：帥收尾的殺法）＝JH_MZ_POOL_OPP_TRAP 的 trap：--mate K --door 0 --trap 6。兩段都排除中炮、過宮炮、仙人指路、屏風馬、起馬、順炮已用的題，陷阱那段另外排除石門那段。
   重跑／核對（在 source/ 底下；核對加 --check、不用 Pikafish）；EX＝xiangqi-db/m/07z9m-maze.js:JH_MZ_POOL_CENTRAL,…07z9m-cross.js:JH_MZ_POOL_CROSS,…07z9m-pawn.js:JH_MZ_POOL_PAWN,…07z9m-screen.js:JH_MZ_POOL_SCREEN,…07z9m-horse.js:JH_MZ_POOL_HORSE,…07z9m-same.js:JH_MZ_POOL_SAME：
   PIKAFISH=<執行檔> node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_OPP --out xiangqi-db/m/07z9m-opp.js --mate C --n 2,3 --max-pieces 32 --door 3 --trap 0 --prefer-red C2 --exclude EX
     --title-door "石門機關：兩翼的炮" --desc-door "門上刻著兩座相向的拋石車。紅方先走，{n} 步將死黑方，門就會開。提示：炮要隔一個子才打得到，兩翼的炮一起動，對方顧了這邊顧不了那邊。"（英文見下面題庫）
   PIKAFISH=<執行檔> node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_OPP_TRAP --out xiangqi-db/m/07z9m-opp.js --mate R --n 2,3 --max-pieces 20 --door 0 --trap 6 --exclude EX,xiangqi-db/m/07z9m-opp.js:JH_MZ_POOL_OPP
     --title-trap "被淨面戲軸逮住了" --desc-trap "戲軸攔在你面前，唱了一句：「解得開這局，就放你走。」紅方先走，{n} 步將死黑方。提示：兩個將帥不能在同一條直線上照面（飛將），自己的帥也能幫忙看住一條線。"（英文見下面題庫）
   陷阱原本想用帥收尾（飛將），古譜裡 2～3 步帥收尾的題一題都沒有，改用車收尾、題目說明提醒飛將。 */
/* ==JH_MZ_POOL:JH_MZ_POOL_OPP== */
const JH_MZ_POOL_OPP={door:[
{"id":"mr125c5","src":{"book":"夢入神機","title":"龍馬負圖"},"zh":["石門機關：兩翼的炮","門上刻著兩座相向的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，兩翼的炮一起動，對方顧了這邊顧不了那邊。"],"en":["Stone door: cannons on both wings","Two catapults facing each other are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over. Use the cannons on both wings together so the defense can't cover both."],"fen":"C3k1b2/1PRca3n/4N4/9/1nb2P3/4C4/2p6/4BA3/3p1p1N1/c1rAK1Br1","line":["b8b9","d8d9","c8e8","e9f9","e4f4"]},
{"id":"sq243c4","src":{"book":"適情雅趣","title":"禍生肘腋"},"zh":["石門機關：兩翼的炮","門上刻著兩座相向的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，兩翼的炮一起動，對方顧了這邊顧不了那邊。"],"en":["Stone door: cannons on both wings","Two catapults facing each other are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over. Use the cannons on both wings together so the defense can't cover both."],"fen":"1RC1k4/3na1R2/4b4/4c4/9/9/9/9/4r4/5K3","line":["c9c8","e8d9","g8e8","e6e8","c8c9"]},
{"id":"sq276c5","src":{"book":"適情雅趣","title":"雙騎追敵"},"zh":["石門機關：兩翼的炮","門上刻著兩座相向的拋石車。紅方先走，3 步將死黑方，門就會開。提示：炮要隔一個子才打得到，兩翼的炮一起動，對方顧了這邊顧不了那邊。"],"en":["Stone door: cannons on both wings","Two catapults facing each other are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a cannon needs one piece to jump over. Use the cannons on both wings together so the defense can't cover both."],"fen":"9/7NC/1P1Nk4/9/9/9/9/3p5/r3p4/3K5","line":["h8f9","e7e8","f9g7","e8e7","i8i7"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_OPP== */
/* ==JH_MZ_POOL:JH_MZ_POOL_OPP_TRAP== */
const JH_MZ_POOL_OPP_TRAP={door:[
],
trap:[
{"id":"lk009c7","src":{"book":"爛柯神機","title":"幣重言甘"},"zh":["被淨面戲軸逮住了","戲軸攔在你面前，唱了一句：「解得開這局，就放你走。」紅方先走，3 步將死黑方。提示：兩個將帥不能在同一條直線上照面（飛將），自己的帥也能幫忙看住一條線。"],"en":["Caught by a painted-face puppet","The puppet blocks your way and sings: \"Solve this and you can go.\" Red to move: checkmate in 3. Hint: the two generals may never face each other on an open file, so your own general can help guard a line."],"fen":"3a5/3P1kr2/5a3/9/9/9/5R3/5C3/2p2p3/rc1K5","line":["d8e8","f8f9","f3f7","g8f8","f7f8"]},
{"id":"lk017c6","src":{"book":"爛柯神機","title":"車馳兵奔"},"zh":["被淨面戲軸逮住了","戲軸攔在你面前，唱了一句：「解得開這局，就放你走。」紅方先走，3 步將死黑方。提示：兩個將帥不能在同一條直線上照面（飛將），自己的帥也能幫忙看住一條線。"],"en":["Caught by a painted-face puppet","The puppet blocks your way and sings: \"Solve this and you can go.\" Red to move: checkmate in 3. Hint: the two generals may never face each other on an open file, so your own general can help guard a line."],"fen":"6cC1/3k1Pn2/5a3/3P5/9/9/9/3pR4/2r1r4/3K1p3","line":["d6d7","d8d7","e2d2","d7e7","d2d7"]},
{"id":"lk020c5","src":{"book":"爛柯神機","title":"春風芳草"},"zh":["被淨面戲軸逮住了","戲軸攔在你面前，唱了一句：「解得開這局，就放你走。」紅方先走，3 步將死黑方。提示：兩個將帥不能在同一條直線上照面（飛將），自己的帥也能幫忙看住一條線。"],"en":["Caught by a painted-face puppet","The puppet blocks your way and sings: \"Solve this and you can go.\" Red to move: checkmate in 3. Hint: the two generals may never face each other on an open file, so your own general can help guard a line."],"fen":"7r1/8R/r4k3/9/6p2/6N2/6P2/5n3/4p4/3K5","line":["g4e5","f7e7","e5g6","e7f7","i8f8"]},
{"id":"lk033c5","src":{"book":"爛柯神機","title":"疊投巨餌"},"zh":["被淨面戲軸逮住了","戲軸攔在你面前，唱了一句：「解得開這局，就放你走。」紅方先走，3 步將死黑方。提示：兩個將帥不能在同一條直線上照面（飛將），自己的帥也能幫忙看住一條線。"],"en":["Caught by a painted-face puppet","The puppet blocks your way and sings: \"Solve this and you can go.\" Red to move: checkmate in 3. Hint: the two generals may never face each other on an open file, so your own general can help guard a line."],"fen":"3ak3C/4a2N1/3nb4/7C1/9/9/2R4r1/9/2nc1pp2/4K3c","line":["h8f7","e8f7","h6h9","e9e8","c3c8"]},
{"id":"lk037c8","src":{"book":"爛柯神機","title":"獨探驪珠"},"zh":["被淨面戲軸逮住了","戲軸攔在你面前，唱了一句：「解得開這局，就放你走。」紅方先走，3 步將死黑方。提示：兩個將帥不能在同一條直線上照面（飛將），自己的帥也能幫忙看住一條線。"],"en":["Caught by a painted-face puppet","The puppet blocks your way and sings: \"Solve this and you can go.\" Red to move: checkmate in 3. Hint: the two generals may never face each other on an open file, so your own general can help guard a line."],"fen":"2b2a3/4k4/3a5/3C5/9/3R1N3/9/5A1n1/1n2C1p2/crB2K3","line":["f4e6","c9e7","e6g7","e8f8","d4f4"]},
{"id":"lk084","src":{"book":"爛柯神機","title":"捐軀成義"},"zh":["被淨面戲軸逮住了","戲軸攔在你面前，唱了一句：「解得開這局，就放你走。」紅方先走，3 步將死黑方。提示：兩個將帥不能在同一條直線上照面（飛將），自己的帥也能幫忙看住一條線。"],"en":["Caught by a painted-face puppet","The puppet blocks your way and sings: \"Solve this and you can go.\" Red to move: checkmate in 3. Hint: the two generals may never face each other on an open file, so your own general can help guard a line."],"fen":"7C1/3k3C1/3a1P3/9/9/9/9/9/2nr1r3/1R2K4","line":["f7f8","d7e8","f8e8","d8d9","b0b9"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_OPP_TRAP== */
jhMzDef("opposite_cannon",{map:JH_MZ_OPP_MAP,guards:JH_MZ_OPP_GUARDS,pool:{door:JH_MZ_POOL_OPP.door,trap:JH_MZ_POOL_OPP_TRAP.trap},
  puz:{door:JH_MZ_POOL_OPP.door[0],trap:JH_MZ_POOL_OPP_TRAP.trap[0]},solid:"#DX~",opaque:"#DX",jump:"",onStep:jhMzOppMoon,
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"列炮譜殘頁",en:"Opposite Cannons manual page"},{k:"box",zh:"崑曲生旦棋子",en:"Kunqu opera character pieces"}],
  title:["🎭 戲台底閣","🎭 Under the opera stage"],lvName:["戲台底閣・第一層","Under the opera stage · Level 1"],back:["回列炮門","Back to the Opposite Cannons School"],
  hall:{at:[600,1060],zh:"🎭 鼓架下・戲台底閣",en:"🎭 Below the drum · Under the stage"},
  intro:["你從戲台鼓架底下的機關鑽下去，底下是戲班存放布景、戲服的地下夾層，中間一條水溝把它分成兩半。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。站進地上的冷光柱，就看得清那一整條直行。",
    "You squeeze down through the mechanism under the opera stage's drum stand. Below is the troupe's hidden storey for scenery and costumes, cut in two by a water channel. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). Step into a shaft of moonlight to see that whole column clearly."],
  warn:["<b>淨面戲軸照將帥的規矩巡：</b>只在九宮裡一格一格走，看得到緊鄰的四格。小心<b>飛將</b>：跟牠在同一條直行、中間沒有戲箱擋著，隔多遠、隔著水溝都會被看到。躲在戲箱後面再過那幾行。",
    "<b>The painted-face puppets patrol like a general:</b> one step at a time inside their palace, seeing the four squares next to them. Beware the <b>flying general</b>: if you're in the same column with no costume chest between you, it sees you from any distance, even across the water. Hide behind a chest before crossing those columns."],
  say:{door:["將死！兩翼的炮同時開火，石門往兩旁滑開。","Checkmate! The cannons on both wings fire together and the stone door slides apart."],trap:["將死！戲軸卡住了，你趁機溜走。","Checkmate! The puppet jams and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["戲軸的機關卡住了，<b>四回合內</b>不會動。","The puppet's mechanism jams. <b>It won't move for four turns.</b>"],
    dragged:["戲軸把你押回入口，還把你最後撿到的東西放回原來的箱子。","The puppet marches you back to the entrance and puts your last find back in its chest."],
    retry:["你被押回了入口。<b>過戲軸那幾行之前，先站進冷光柱看清牠在哪一行，或躲到戲箱後面。</b>","You were marched back. <b>Before crossing the puppet's columns, step into a moonlight shaft to see which column it's in, or hide behind a chest.</b>"],
    locked:["石門被機關鎖住了。<b>先在夾層裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the storey first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的後台。第二、三層之後再開。","The steps lead down to the deeper backstage. Levels 2 and 3 open later."],
    spot:["<b>戲軸轉過來，你跟牠在同一條線上！</b>趕快離開紅格，下一步還在紅格上就會被逮住。","<b>The puppet turns and you're in its line!</b> Get off the red squares now. If you are still on one next turn, you are caught."]}});
