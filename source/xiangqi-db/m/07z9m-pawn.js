/* ---------- W87 仙人指路地底迷宮・第一層「太湖石陣」（開發者 11/24 選單：九派先做三派＋中炮門重改，這一派由 iMac Claude 1 寫）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的仙人指路：兵型守衛（過河前只能往前、過河後可以左右）、太湖石透光。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE）；這支只登記仙人指路這一層，不改共用程式。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・地圖空曠、到處是太湖石（R）：擋路，但「不擋光、不擋視線」（R 放進 solid、不放進 opaque）——躲在石頭後面躲不過兵卒的眼睛，要算準他走到哪一格；
     ・地圖中段一條河（~）：人走得過，兵卒照「過河」改走法；
     ・兵卒守衛（JH_MZ_KIND.pawn）：沒過河只能往前一步一步走、只看得到正前方；過了河就改成左右來回巡，看得到正前方和面向的那一側；
       前面被擋住（沒過河）就原地等，不會往回走（兵不回頭）；
     ・殘局：兵卒的殺法，全部是「紅方先走、兩步將死」，第一步、最後一步都只有一種走法；最後一步一律用兵將死。
       題目由 core.js 窮舉產生並驗證（每一種紅方走法、每一種黑方應著都試過；暫存工具不進倉庫），測試另外用 core.js 獨立重算。
       之後 Windows Claude 1 的 Pikafish 出題工具好了，再用 Pikafish 複核一次。
     ・同一層的題目照 jhMzPuz 輪換：開石門 3 題、被逮 5 題，連續被逮不會出同一題。 */
const JH_MZ_PAWN_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#..R.R...R.R..#",
"#.R.....R..C..#",
"#....R.R....R.#",
"#.R....P...R..#",
"#.R....R....R.#",
"#T.....R.....T#",
"#~~~~~~~~~~~~~#",
"#~~~~~~~~~~~~~#",
"#.............#",
"#..R..R.R..R..#",
"#.R.........R.#",
"#C...R...R....#",
"#..R...R...R..#",
"#.R..R...R..C.#",
"#.....R.R.....#",
"#T...........T#",
"#......@......#",
"###############"];
/* 兵卒：黑方的兵往下（dy=1）走；river＝河的兩行（y 在這兩行之間或之後＝過河） */
const JH_MZ_PAWN_RIVER=[11,12];
const JH_MZ_PAWN_GUARDS=[{kind:"pawn",x:4,y:4,dx:1,dy:1},{kind:"pawn",x:10,y:4,dx:-1,dy:1}];
/* 過河了沒：往下走的兵 y 超過河的最後一行；往上走的兵 y 小於河的第一行 */
const jhMzPawnCrossed=(S,G)=>{const R=S.lv.river||JH_MZ_PAWN_RIVER;return(G.dy||1)>0?G.y>R[1]:G.y<R[0]};
JH_MZ_KIND.pawn={
  /* 視線：正前方 range 格（預設 4）；過了河再加上面向那一側 range 格。太湖石不擋視線，只有牆、石門擋（照 opaque） */
  sight(S,G){const o=[],n=G.range||4,ray=(dx,dy)=>{for(let i=1;i<=n;i++){const x=G.x+dx*i,y=G.y+dy*i;if(jhMzOpaque(S,x,y))break;o.push({x,y})}};
    ray(0,G.dy||1);if(jhMzPawnCrossed(S,G)&&G.dx)ray(G.dx,0);return o},
  /* 走法：沒過河＝往前一步（擋住就原地等）；過了河＝往面向那一側走一步，擋住就掉頭，兩邊都擋住才往前 */
  step(S,G){const fy=G.dy||1;
    if(!jhMzPawnCrossed(S,G)){if(!jhMzSolid(S,G.x,G.y+fy))G.y+=fy;return}
    const dx=G.dx||1;if(!jhMzSolid(S,G.x+dx,G.y)){G.x+=dx;G.dx=dx;return}
    if(!jhMzSolid(S,G.x-dx,G.y)){G.dx=-dx;G.x-=dx;return}
    if(!jhMzSolid(S,G.x,G.y+fy))G.y+=fy},
  look:{body:"#2b3a2a",head:"#3a4a36",eye:0xE24A3A}};
/* 太湖石（3D）：幾顆灰青色的多面體疊成一座有孔洞感的石峰；河（3D）：一層淡青色水面 */
JH_MZ_OBJ.R=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),m1=lam("#8f9a9a"),m2=lam("#6f7b7c");
  for(const[a,b,z,s,m]of[[-.12,.2,.05,.24,m1],[.13,.3,-.06,.2,m2],[-.02,.52,.02,.17,m1],[.08,.72,.06,.12,m2],[-.16,.62,-.08,.1,m2]]){const o=mesh(new T3.IcosahedronGeometry(s,0),m,a,b,z);o.rotation.set(a*4,z*6,b*3);g.add(o)}
  return g};
JH_MZ_OBJ["~"]=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),w=mesh(new T3.BoxGeometry(1,.03,1),lam("#4f7f8c"),0,.018,0);g.add(w);return g};
/* 平面版（3D 載不起來時） */
JH_MZ_TILE.R=(cx,px,py,T)=>{cx.fillStyle="rgba(0,0,0,.35)";cx.beginPath();cx.ellipse(px+T*.5,py+T*.88,T*.4,T*.09,0,0,7);cx.fill();
  cx.fillStyle="#8f9a9a";cx.strokeStyle="#3f4848";cx.lineWidth=1.8;cx.beginPath();cx.moveTo(px+T*.22,py+T*.85);cx.lineTo(px+T*.3,py+T*.4);cx.lineTo(px+T*.45,py+T*.18);cx.lineTo(px+T*.62,py+T*.3);cx.lineTo(px+T*.78,py+T*.55);cx.lineTo(px+T*.72,py+T*.85);cx.closePath();cx.fill();cx.stroke();
  cx.fillStyle="#3f4848";for(const[a,b,r]of[[.45,.45,.07],[.6,.62,.05]]){cx.beginPath();cx.arc(px+a*T,py+b*T,r*T,0,7);cx.fill()}};
JH_MZ_TILE["~"]=(cx,px,py,T)=>{cx.fillStyle="#4f7f8c";cx.fillRect(px,py,T,T);cx.strokeStyle="rgba(220,240,245,.5)";cx.lineWidth=1.4;cx.beginPath();cx.moveTo(px+T*.15,py+T*.4);cx.quadraticCurveTo(px+T*.35,py+T*.3,px+T*.55,py+T*.4);cx.moveTo(px+T*.45,py+T*.7);cx.quadraticCurveTo(px+T*.65,py+T*.6,px+T*.85,py+T*.7);cx.stroke()};
/* 殘局題庫：全部「紅方先走、兩步將死」；line＝[紅,黑,紅]，第一步、最後一步都只有一種殺法，最後一步用兵將死（core.js 窮舉驗證，測試獨立重算） */
const JH_MZ_PAWN_POOL={
  door:[
    {zh:["石門機關：車兵聯手","石門上刻著一隊過河的兵。紅方先走，兩步將死黑方，門就會開。"],en:["Stone door: rook and pawns","A file of pawns that have crossed the river is carved on the door. Red to move: mate in two and the door opens."],
     fen:"4R4/3k5/b4P3/9/3P5/9/9/p2K5/9/9",line:["d5d6","a7c5","d6d7"]},
    {zh:["石門機關：炮護兵進","炮在後面撐著，兵一步一步逼上去。紅方先走，兩步將死黑方。"],en:["Stone door: the cannon backs the pawn","The cannon covers from behind while the pawn pushes in. Red to move: mate in two."],
     fen:"2b1k1P2/C8/3P5/9/2P6/9/9/5K3/2p6/9",line:["d7d8","c9a7","g9f9"]},
    {zh:["石門機關：馬後兵","馬守住將的退路，兵上去收網。紅方先走，兩步將死黑方。"],en:["Stone door: the pawn behind the horse","The horse cuts off the king's escape and a pawn closes in. Red to move: mate in two."],
     fen:"3k2b2/1PP6/3a5/5N3/9/9/9/4K4/9/9",line:["c8c9","d9d8","b8c8"]}],
  trap:[
    {zh:["被兵卒圍住了","兵卒把你圍在太湖石間：「下得贏這局，就放你走。」紅方先走，兩步將死黑方。"],en:["Surrounded by pawn guards","The pawn guards hem you in among the lake rocks: \"Win this and you can go.\" Red to move: mate in two."],
     fen:"5k3/4P4/b5P2/9/9/9/9/9/5K3/9",line:["g7f7","a7c5","f7f8"]},
    {zh:["被兵卒圍住了：雙兵鎖喉","兩個兵貼著九宮，將已經沒地方走。紅方先走，兩步將死黑方。"],en:["Surrounded: two pawns at the throat","Two pawns press against the palace and the king has nowhere to go. Red to move: mate in two."],
     fen:"6P2/5k3/b2P1a3/5P3/9/9/1p7/9/9/4K4",line:["d7e7","f7e8","e7e8"]},
    {zh:["被兵卒圍住了：兵臨城下","三個兵擠在九宮門口。紅方先走，兩步將死黑方。"],en:["Surrounded: pawns at the gate","Three pawns crowd the palace gate. Red to move: mate in two."],
     fen:"3k1P3/1P7/3a1a2b/8P/9/9/7p1/9/9/4K4",line:["f9e9","d9d8","b8c8"]},
    {zh:["被兵卒圍住了：炮打兵追","炮先叫將，兵跟上去收尾。紅方先走，兩步將死黑方。"],en:["Surrounded: cannon fires, pawn follows","The cannon checks first and a pawn finishes it. Red to move: mate in two."],
     fen:"4k1P2/3P5/5a3/1C4P2/9/9/9/9/9/3K5",line:["b6b9","f7e8","d8d9"]},
    {zh:["被兵卒圍住了：馬引兵入","馬在角上看著，兵從旁邊鑽進去。紅方先走，兩步將死黑方。"],en:["Surrounded: the horse lets the pawn in","The horse watches from the corner as a pawn slips in. Red to move: mate in two."],
     fen:"8N/5P3/3k1P2b/4P4/9/9/9/9/9/4K4",line:["f8e8","i7g5","e6d6"]}]};
jhMzDef("pawn",{map:JH_MZ_PAWN_MAP,guards:JH_MZ_PAWN_GUARDS,river:JH_MZ_PAWN_RIVER,pool:JH_MZ_PAWN_POOL,
  puz:{door:JH_MZ_PAWN_POOL.door[0],trap:JH_MZ_PAWN_POOL.trap[0]},solid:"#DR",opaque:"#D",jump:"",
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"仙人指路譜殘頁",en:"Immortal Points the Way manual page"},{k:"box",zh:"青瓷棋罐",en:"Celadon piece jar"}],
  title:["🪨 太湖石陣","🪨 Lake-rock maze"],lvName:["太湖石陣・第一層","Lake-rock maze · Level 1"],back:["回仙人指路門","Back to the Immortal Points the Way School"],
  hall:{at:[560,930],zh:"🪨 太湖石・石陣入口",en:"🪨 Lake rock · Maze entrance"},
  intro:["你從假山的石洞鑽下去，底下是一片漆黑的石林。<b>點地面就會走過去</b>，也可以用下面的方向鈕。走到壁燈旁邊會點亮它。","You squeeze through a hole in the rockery into a pitch-dark stone forest. <b>Tap the floor to walk there</b>, or use the arrows below. Walk next to a wall lamp to light it."],
  warn:["<b>前面有兵卒在巡邏。</b>沒過河的兵只會往前走、只看前面；過了河就左右來回、也看得到身旁。<b>太湖石擋路，但擋不住視線</b>，躲在石頭後面也會被看到。","<b>Pawn guards are on patrol.</b> Before the river a pawn only walks and looks straight ahead; after crossing it paces sideways and can see to its side too. <b>Lake rocks block your path but not their sight</b>, so hiding behind a rock won't help."],
  say:{door:["將死！兵一步一步推上去，石門往兩旁滑開。","Checkmate! The pawns push in step by step and the stone door slides apart."],trap:["將死！兵卒愣在原地，你趁機溜走。","Checkmate! The pawn guard freezes and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["兵卒頭昏眼花，<b>四回合內</b>不會動。","The pawn guard is dizzy and <b>won't move for four turns</b>."],
    dragged:["兵卒把你押回入口，還把你最後撿到的東西放回原來的箱子。","The pawn guard marches you back to the entrance and puts your last find back in its chest."],
    retry:["你被押回了入口。<b>沒過河的兵只看正前方，從他旁邊繞過去。</b>","You were marched back. <b>A pawn that hasn't crossed the river only looks straight ahead: go around beside it.</b>"],
    locked:["石門被機關鎖住了。<b>先在石陣裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the rock maze first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的石窟。第二、三層之後再開。","The steps lead down to deeper grottoes. Levels 2 and 3 open later."]}});
