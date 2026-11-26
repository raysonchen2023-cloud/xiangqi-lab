/* ---------- W87-2 仕角炮地底迷宮・第一層「當鋪秘庫」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單：先把十派第一層補齊）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的仕角炮門：入口在當鋪高櫃台下方的踏板，地底是存放死當貴重物品的九宮格地下金庫。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE）；這支只登記仕角炮這一層，不改共用程式。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・地圖是好幾間 3×3 的小金庫，牆上開門相連。
     ・朝奉機關（JH_MZ_KIND.advisor）照仕（士）的規矩：只在自己那一間的斜線上走——中心↔四個角，一回合斜走一格（中心→左上→中心→右上→中心→右下→中心→左下）。
       看得到的＝牠正在走的那一條斜線（去角落、回中心那兩回合是同一條，接著兩回合換另一條）；中心兩條都經過，所以中心永遠不安全。
       房間每一邊正中間那一格（貼著牆）永遠不在斜線上；要穿過有朝奉的房間，就趁牠在一條斜線上來回時，從另一條斜線的角繞過去。
     ・銅鏡（O）嵌在牆裡，每一面有固定的反射方向（JH_MZ_CORNER_MIRROR）：走到銅鏡旁邊（上下左右），燈火照到鏡面，沿那個方向的整條直線都看得到（被擋光的東西擋住為止）。
   還沒做（之後補）：碑刻文書 L 與暗門 H（要先請 Gemini 查史料、iMac Claude 1 複核）、像素材質（每派一套，出圖要先問開發者）。 */
/* 九間庫房（左上角）：A(1,6) B(5,6) C(9,6)／D(1,10) E(5,10) F(9,10)／G(1,14) H(5,14) I(9,14)。
   必經路線：入口→G（朝奉）→D（踏板）→E（朝奉）→B（朝奉）→上廳→石門；A、C、F、H、I 是繞路拿箱子（C 從上廳右邊的走廊進去） */
const JH_MZ_CORNER_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"######.######.#",
"#C..#...#...#.#",
"#.......#.....#",
"#...#...#...#.#",
"#######.###.###",
"#...O...#...###",
"#.......#...###",
"#..P#...#..C###",
"##.############",
"#...#...#...###",
"#...........###",
"#...#...O.C.###",
"##.############",
"#T....@......T#",
"###############"];
/* 銅鏡：「x,y」→ 反射出去的方向 */
const JH_MZ_CORNER_MIRROR={"4,10":[1,0],"8,16":[-1,0]};
/* 三個朝奉機關各守一間（room＝那一間的左上角）；i＝目前在巡路第幾步 */
const JH_MZ_CORNER_PATH=[[1,1],[0,0],[1,1],[2,0],[1,1],[2,2],[1,1],[0,2]];
/* 朝奉現在走的斜線方向：巡路上一格到這一格（中心⇄角落都在同一條斜線上，所以去角落、回中心那兩回合看同一條） */
function jhMzCornerDir(G){const n=JH_MZ_CORNER_PATH.length,i=((G.i||0)%n+n)%n,p=JH_MZ_CORNER_PATH[(i+n-1)%n],q=JH_MZ_CORNER_PATH[i];return[q[0]-p[0],q[1]-p[1]]}
const JH_MZ_CORNER_GUARDS=[{kind:"advisor",room:[5,6],i:0,x:6,y:7},{kind:"advisor",room:[5,10],i:3,x:7,y:10},{kind:"advisor",room:[1,14],i:5,x:3,y:16}];
JH_MZ_KIND.advisor={
  /* 牠正在走的那一條斜線（照巡路上一步到這一步的方向，往前往後都看，到出了這一間、或碰到擋路的東西為止）；另一條斜線看不到 */
  sight(S,G){const R=G.room||[G.x-1,G.y-1],o=[],inR=(x,y)=>x>=R[0]&&x<=R[0]+2&&y>=R[1]&&y<=R[1]+2,d=jhMzCornerDir(G);
    for(const s of[1,-1])for(let k=1;k<3;k++){const x=G.x+d[0]*s*k,y=G.y+d[1]*s*k;if(!inR(x,y)||jhMzSolid(S,x,y))break;o.push({x,y})}return o},
  /* 照巡路斜走一格；下一格被擋（例如門口站著東西）就原地等 */
  step(S,G){const R=G.room||[G.x-1,G.y-1],n=JH_MZ_CORNER_PATH.length,i=((G.i||0)+1)%n,[a,b]=JH_MZ_CORNER_PATH[i],nx=R[0]+a,ny=R[1]+b;
    if(jhMzSolid(S,nx,ny))return;G.i=i;G.dx=nx-G.x;G.dy=ny-G.y;G.x=nx;G.y=ny},
  look:{body:"#5a4a2a",head:"#c9a24a",eye:0x2b2b2b}};
/* 銅鏡：要走進的那一格旁邊（上下左右）有銅鏡，就沿那面鏡子的方向照亮一整條直線。在走這一步之前判斷；撞牆不算 */
function jhMzCornerMirror(S,dx,dy){const P=S.player,nx=P.x+dx,ny=P.y+dy;if(jhMzSolid(S,nx,ny))return null;
  for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const mx=nx+a,my=ny+b,d=JH_MZ_CORNER_MIRROR[mx+","+my];if(!d||jhMzCell(S,mx,my)!=="O")continue;
    for(let x=mx+d[0],y=my+d[1];x>0&&y>0&&x<S.W-1&&y<S.H-1;x+=d[0],y+=d[1]){if(jhMzOpaque(S,x,y))break;S.seen.add(y*S.W+x)}}return null}
/* 3D：銅鏡（牆上一面圓銅鏡，框是木的）；平面版：牆色上一個亮圓 */
if(!JH_MZ_OBJ.O)JH_MZ_OBJ.O=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,.85,1),lam("#2a2018"),0,.425,0));
  const m=mesh(new T3.CylinderGeometry(.3,.3,1.02,24),new T3.MeshBasicMaterial({color:0xd8b36a}),0,.5,0);m.rotation.z=Math.PI/2;g.add(m);return g};
if(!JH_MZ_TILE.O)JH_MZ_TILE.O=(cx,px,py,T)=>{cx.fillStyle="#2a2018";cx.fillRect(px,py,T,T);cx.fillStyle="#d8b36a";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.3,0,Math.PI*2);cx.fill()};
/* ==JH_MZ_POOL:JH_MZ_POOL_CORNER== */
const JH_MZ_POOL_CORNER={door:[
{"id":"mr008c4","src":{"book":"夢入神機","title":"潛魚戀藻"},"zh":["石門機關：炮架馬殺","門上刻著一座當鋪的高櫃台，櫃角架著一門炮，炮後拴著一匹馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步是馬將死；炮在後面撐著。"],"en":["Stone door: cannon and horse","A pawnshop's high counter is carved on the door: a cannon at its corner and a horse tethered behind. Red to move: checkmate in 3 and the door opens. Hint: the horse gives the final mate, with the cannon backing it up."],"fen":"5k1N1/4a4/4Pa3/9/9/5n3/5C3/3A1p3/3p5/5K3","line":["e7e8","f2f1","f0f1","d1d0","h9g7"]},
{"id":"mr073c4","src":{"book":"夢入神機","title":"老當益壯"},"zh":["石門機關：炮架馬殺","門上刻著一座當鋪的高櫃台，櫃角架著一門炮，炮後拴著一匹馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步是馬將死；炮在後面撐著。"],"en":["Stone door: cannon and horse","A pawnshop's high counter is carved on the door: a cannon at its corner and a horse tethered behind. Red to move: checkmate in 3 and the door opens. Hint: the horse gives the final mate, with the cannon backing it up."],"fen":"2P5C/3ka4/3N1a3/3R5/9/9/9/3n1p3/r3p4/5K3","line":["d7f8","e8d7","i9i8","f7e8","f8e6"]},
{"id":"mr088c5","src":{"book":"夢入神機","title":"遊魚翻藻"},"zh":["石門機關：炮架馬殺","門上刻著一座當鋪的高櫃台，櫃角架著一門炮，炮後拴著一匹馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步是馬將死；炮在後面撐著。"],"en":["Stone door: cannon and horse","A pawnshop's high counter is carved on the door: a cannon at its corner and a horse tethered behind. Red to move: checkmate in 3 and the door opens. Hint: the horse gives the final mate, with the cannon backing it up."],"fen":"4k4/5RN2/3ab4/9/9/9/9/5C3/3p1p3/2p1K4","line":["f8d8","e9f9","d8d9","f9f8","g8f6"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CORNER== */
/* ==JH_MZ_POOL:JH_MZ_POOL_CORNER_TRAP== */
const JH_MZ_POOL_CORNER_TRAP={door:[
],
trap:[
{"id":"mr042","src":{"book":"夢入神機","title":"黃鸝出谷"},"zh":["被朝奉機關押住了","朝奉機關把你押在櫃台前：「這張當票上的局解得開，就放你走。」紅方先走，2 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you at the counter: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 2."],"fen":"5kc1c/1C2P4/b4N3/4P4/9/9/9/9/4p3r/2RK5","line":["c0c9","g9c9","f7h8"]},
{"id":"mr094c5","src":{"book":"夢入神機","title":"鼓噪勒兵-(第二種著法)"},"zh":["被朝奉機關押住了","朝奉機關把你押在櫃台前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you at the counter: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"5aP2/1N1k5/4P1P2/1rp6/9/4C4/7C1/9/3p1p2r/4K4","line":["e7d7","d8e8","h3e3","e8f8","b8d9"]},
{"id":"sq013","src":{"book":"適情雅趣","title":"目視橫流"},"zh":["被朝奉機關押住了","朝奉機關把你押在櫃台前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you at the counter: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"4k4/3P2P2/b2N2R2/7r1/2b6/9/9/3n5/4p3r/2R2K3","line":["g7e7","c5e7","d8e8","e9d9","d7b8"]},
{"id":"sq091c5","src":{"book":"適情雅趣","title":"六國抗秦"},"zh":["被朝奉機關押住了","朝奉機關把你押在櫃台前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you at the counter: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"2b1R4/3k1rNn1/1n2b4/9/2p3p2/1NB1C4/9/4B4/1r1p5/c3KC3","line":["b4c6","d8d7","e9d9","b7d8","c6e5"]},
{"id":"sq123c5","src":{"book":"適情雅趣","title":"逢山開路"},"zh":["被朝奉機關押住了","朝奉機關把你押在櫃台前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you at the counter: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"7n1/3Na1P2/4bk3/1P3rn2/6b2/9/9/C8/3p1r3/c3K4","line":["a2a7","e7g9","d8b7","g9e7","b7d6"]},
{"id":"sq140c8","src":{"book":"適情雅趣","title":"引龍出水"},"zh":["被朝奉機關押住了","朝奉機關把你押在櫃台前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you at the counter: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"6P1c/3Rak3/3a5/9/2b1N4/9/9/3KC4/1nr1p4/5r3","line":["e5d7","c5e7","d8e8","f8f7","d7e5"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CORNER_TRAP== */
jhMzDef("advisor_corner",{map:JH_MZ_CORNER_MAP,guards:JH_MZ_CORNER_GUARDS,pool:{door:JH_MZ_POOL_CORNER.door,trap:JH_MZ_POOL_CORNER_TRAP.trap},
  puz:{door:JH_MZ_POOL_CORNER.door[0],trap:JH_MZ_POOL_CORNER_TRAP.trap[0]},solid:"#DO",opaque:"#DO",jump:"",onStep:jhMzCornerMirror,
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"仕角炮譜殘頁",en:"Advisor-corner Cannon manual page"},{k:"box",zh:"陳年死當票",en:"Old forfeited pawn ticket"}],
  title:["🗝 當鋪秘庫","🗝 Pawnshop vault"],lvName:["當鋪秘庫・第一層","Pawnshop vault · Level 1"],back:["回仕角炮門","Back to the Advisor-corner Cannon School"],
  hall:{at:[540,790],zh:"🗝 高櫃台下・當鋪秘庫",en:"🗝 Under the counter · Pawnshop vault"},
  intro:["你踩下當鋪高櫃台下方的踏板，地板滑開，底下是存放死當貴重物品的地下金庫，一間一間 3×3 的小庫房用門連著。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。走到牆上的銅鏡旁邊，燈火會沿鏡子照出一整條直線。",
    "You step on the plate under the pawnshop's high counter. The floor slides open onto the vault for forfeited valuables: small 3×3 strongrooms joined by doors. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). Walk next to a bronze mirror on the wall and your lamp's light shoots down a whole line."],
  warn:["<b>朝奉機關照仕的規矩巡：</b>只在自己那一間的斜線上走，看得到牠正在走的那一條斜線（地上的紅格）。每一邊正中間貼著牆的那一格永遠安全；要穿過那一間，就趁牠在一條斜線上來回時，從另一條斜線的角繞過去。",
    "<b>The clerk automatons patrol like an advisor:</b> only along the diagonals of their own room, seeing the diagonal they're moving along (the red squares). The middle square of each wall is always safe. To get through a room, wait while it paces one diagonal and slip past via a corner of the other."],
  say:{door:["將死！角上的炮配著仕一擊得手，石門往兩旁滑開。","Checkmate! The corner cannon and the advisor strike together and the stone door slides apart."],trap:["將死！朝奉機關喀一聲停住，你趁機溜走。","Checkmate! The clerk automaton clicks to a stop and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["朝奉機關的發條鬆了，<b>四回合內</b>不會動。","The automaton's spring has run down. <b>It won't move for four turns.</b>"],
    dragged:["朝奉機關把你押回入口，還把你最後撿到的東西放回原來的箱子。","The automaton marches you back to the entrance and puts your last find back in its chest."],
    retry:["你被押回了入口。<b>貼著每一邊正中間走；要過那一間，看紅格在哪一條斜線，從另一條斜線的角繞過去。</b>","You were marched back. <b>Keep to the middle of each wall; to cross a room, see which diagonal is red and go round by a corner of the other one.</b>"],
    locked:["石門被機關鎖住了。<b>先在金庫裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the vault first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的庫房。第二、三層之後再開。","The steps lead down to deeper strongrooms. Levels 2 and 3 open later."],
    spot:["<b>朝奉機關轉過來，你站在牠的斜線上！</b>趕快離開紅格，下一步還在紅格上就會被逮住。","<b>The automaton turns: you're on its diagonal!</b> Get off the red squares now. If you are still on one next turn, you are caught."]}});
