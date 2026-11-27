/* ---------- W87 仙人指路地底迷宮・第一層「太湖石陣」（開發者 11/24 選單：九派先做三派＋中炮門重改，這一派由 iMac Claude 1 寫）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的仙人指路：兵型守衛（過河前只能往前、過河後可以左右）、太湖石透光。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE）；這支只登記仙人指路這一層，不改共用程式。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・地圖空曠、到處是太湖石（R）：擋路，但「不擋光、不擋視線」（R 放進 solid、不放進 opaque）——躲在石頭後面躲不過兵卒的眼睛，要算準他走到哪一格；
     ・地圖中段一條河（r）：人走得過，兵卒照「過河」改走法；
     ・兵卒守衛（JH_MZ_KIND.pawn）：沒過河只能往前一步一步走、只看得到正前方；過了河就改成左右來回巡，看得到正前方和面向的那一側；
       前面被擋住（沒過河）就原地等，不會往回走（兵不回頭）；
     ・殘局：古譜裡兵卒收尾的殺法（開發者 11/24：「你也可以從古譜找題目 比較可靠 古譜+pikafish」），全部「紅方先走、3 步將死」，每題記出處；
       Pikafish 驗紅方每步唯一、黑方應著撐最久，測試另外用 core.js 獨立重算（照主變走完將死、最後一步用兵）。
     ・同一層的題目照 jhMzPuz 輪換：開石門 3 題、被逮 5 題，連續被逮不會出同一題。 */
const JH_MZ_PAWN_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T.....#.....T#",
"#.R..R.#.R..R.#",
"#..R...#...R..#",
"#.R....H....R.#",
"#..R..P#.R..C.#",
"#.R....#L...R.#",
"#T.....R.....T#",
"#rrrrrrrrrrrrr#",
"#rrrrrrrrrrrrr#",
"#.............#",
"#.###.###.###.#",
"#.#L..#C..#...#",
"#.#.###.#.#.#.#",
"#...#...#...#.#",
"###.#.#####.#.#",
"#C..#.H.L#..R.#",
"#...#.####...T#",
"#T....@.......#",
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
JH_MZ_OBJ["r"]=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),w=mesh(new T3.BoxGeometry(1,.03,1),lam("#4f7f8c"),0,.018,0);g.add(w);return g};
/* 平面版（3D 載不起來時） */
JH_MZ_TILE.R=(cx,px,py,T)=>{cx.fillStyle="rgba(0,0,0,.35)";cx.beginPath();cx.ellipse(px+T*.5,py+T*.88,T*.4,T*.09,0,0,7);cx.fill();
  cx.fillStyle="#8f9a9a";cx.strokeStyle="#3f4848";cx.lineWidth=1.8;cx.beginPath();cx.moveTo(px+T*.22,py+T*.85);cx.lineTo(px+T*.3,py+T*.4);cx.lineTo(px+T*.45,py+T*.18);cx.lineTo(px+T*.62,py+T*.3);cx.lineTo(px+T*.78,py+T*.55);cx.lineTo(px+T*.72,py+T*.85);cx.closePath();cx.fill();cx.stroke();
  cx.fillStyle="#3f4848";for(const[a,b,r]of[[.45,.45,.07],[.6,.62,.05]]){cx.beginPath();cx.arc(px+a*T,py+b*T,r*T,0,7);cx.fill()}};
JH_MZ_TILE["r"]=(cx,px,py,T)=>{cx.fillStyle="#4f7f8c";cx.fillRect(px,py,T,T);cx.strokeStyle="rgba(220,240,245,.5)";cx.lineWidth=1.4;cx.beginPath();cx.moveTo(px+T*.15,py+T*.4);cx.quadraticCurveTo(px+T*.35,py+T*.3,px+T*.55,py+T*.4);cx.moveTo(px+T*.45,py+T*.7);cx.quadraticCurveTo(px+T*.65,py+T*.6,px+T*.85,py+T*.7);cx.stroke()};
/* 殘局題庫：古譜（橘中秘、爛柯神機）裡兵收尾的 3 步殺，Windows Claude 1 的出題工具 maze-puzzles.js 挑題、Pikafish（深度 20）驗證紅方每步唯一、黑方應著撐最久；
   標記中間那一段由工具產生，標題、說明照仙人指路的兵卒守衛改過字。重跑比對（在 source/ 底下，逐字相同才回 0）：
     node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_PAWN --out xiangqi-db/m/07z9m-pawn.js --mate P --door 3 --trap 5 --check
       --title-door "石門機關：兵卒的殺法" --title-door-en "Stone door: a soldier's mate"
       --desc-door "石門上刻著一隊過河的兵。紅方先走，{n} 步將死黑方，門就會開。提示：兵過了河就能橫著走。"
       --desc-door-en "A file of soldiers that have crossed the river is carved on the door. Red to move: checkmate in {n} and the door opens. Hint: once across the river, a soldier can move sideways."
       --title-trap "被兵卒圍住了" --title-trap-en "Surrounded by pawn guards"
       --desc-trap "兵卒把你圍在太湖石間：「這局解得開，就放你過去。」紅方先走，{n} 步將死黑方。"
       --desc-trap-en 'The pawn guards hem you in among the lake rocks: "Solve this and you may pass." Red to move: checkmate in {n}.' */
/* ==JH_MZ_POOL:JH_MZ_POOL_PAWN== */
const JH_MZ_POOL_PAWN={door:[
{"id":"jc108c8","src":{"book":"橘中秘","title":"炮兵能勝士象全"},"zh":["石門機關：兵卒的殺法","石門上刻著一隊過河的兵。紅方先走，3 步將死黑方，門就會開。提示：兵過了河就能橫著走。"],"en":["Stone door: a soldier's mate","A file of soldiers that have crossed the river is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: once across the river, a soldier can move sideways."],"fen":"3ak4/4aP3/b3b4/9/9/9/2C6/9/4K4/9","line":["c3e3","a7c5","e1f1","c5a7","f8f9"]},
{"id":"lk035c4","src":{"book":"爛柯神機","title":"獨具爐錘"},"zh":["石門機關：兵卒的殺法","石門上刻著一隊過河的兵。紅方先走，3 步將死黑方，門就會開。提示：兵過了河就能橫著走。"],"en":["Stone door: a soldier's mate","A file of soldiers that have crossed the river is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: once across the river, a soldier can move sideways."],"fen":"3k3C1/1P4P2/4bN2b/4P4/9/9/9/5p3/3cp4/3p1K3","line":["f7g9","d9d8","b8c8","d8d7","e6d6"]},
{"id":"lk058c5","src":{"book":"爛柯神機","title":"海底藏珍"},"zh":["石門機關：兵卒的殺法","石門上刻著一隊過河的兵。紅方先走，3 步將死黑方，門就會開。提示：兵過了河就能橫著走。"],"en":["Stone door: a soldier's mate","A file of soldiers that have crossed the river is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: once across the river, a soldier can move sideways."],"fen":"9/4aR3/2Nak4/2p2P3/9/9/9/3K2p1B/1p1r5/2p2p3","line":["d2d1","b1c1","d1d2","c0b0","f6e6"]}],
trap:[
{"id":"lk104c4","src":{"book":"爛柯神機","title":"馬首是瞻"},"zh":["被兵卒圍住了","兵卒把你圍在太湖石間：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Surrounded by pawn guards","The pawn guards hem you in among the lake rocks: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"4k1c2/2P1a1n2/b3P4/3r5/9/6BC1/4P4/9/4C1p2/r2p1K3","line":["e7e8","e9d9","h4h9","g8e9","e8e9"]},
{"id":"lk137c6","src":{"book":"爛柯神機","title":"巧用連環-(連環形)"},"zh":["被兵卒圍住了","兵卒把你圍在太湖石間：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Surrounded by pawn guards","The pawn guards hem you in among the lake rocks: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"9/4k4/3R1P3/6p2/2P6/4n4/3C1p3/2p3r2/3p1p3/4K4","line":["d7e7","e8d8","c5d5","e4d6","d5d6"]},
{"id":"lk141c5","src":{"book":"爛柯神機","title":"屈乘假道"},"zh":["被兵卒圍住了","兵卒把你圍在太湖石間：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Surrounded by pawn guards","The pawn guards hem you in among the lake rocks: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"C1bak4/3R5/5cr2/9/4P4/9/9/9/2r1p4/3K5","line":["d8d9","e9e8","d9d8","e8e7","e5e6"]},
{"id":"lk172c7","src":{"book":"爛柯神機","title":"送往迎來"},"zh":["被兵卒圍住了","兵卒把你圍在太湖石間：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Surrounded by pawn guards","The pawn guards hem you in among the lake rocks: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"3P2P2/4nk1P1/b8/9/2b1P4/9/7N1/9/2p1pr3/3K3C1","line":["h8g8","f8f7","h3g5","f7e7","e5e6"]},
{"id":"lk182c5","src":{"book":"爛柯神機","title":"脫帽露頂"},"zh":["被兵卒圍住了","兵卒把你圍在太湖石間：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Surrounded by pawn guards","The pawn guards hem you in among the lake rocks: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"6Nc1/2PP1k3/4N2n1/9/9/9/9/3p5/2rp1r3/4K4","line":["e7g6","f8f9","g6h8","f9f8","d8e8"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PAWN== */
const JH_MZ_PAWN_POOL=JH_MZ_POOL_PAWN;
/* 碑刻、殘簡、文書（m/07z9m-lore.js 讀 lore，照地圖上 L 由上到下對應）：Gemini 11/24 寫的初稿，iMac Claude 1 依史學複核修正——出處改杜綰《雲林石譜》、
   「瘦皺漏透」照實寫成清代鄭板橋題畫時歸給米芾。title／body 是遊戲整理的白話，src 是查得到的史料 */
const JH_MZ_PAWN_LORE=[
  {id:"tl1",kind:"slip",title:["水下採石記","Raising stones from the lake"],
   body:["殘簡上抄著採石的苦差：石工帶著錘鑿潛入深水，看準形狀奇巧的石頭才下鑿，再用粗索綑好，船上架起木架絞盤，把太湖石從湖底一點一點拉出水面。",
     "Masons dove into deep water with hammer and chisel, cut only the strangest stones, bound them with thick ropes, and winched them up from the lakebed on frames built atop large boats."],
   src:"杜綰《雲林石譜》・太湖石"},
  {id:"tl2",kind:"doc",title:["花石綱運石牒","The Flower-and-Rock Convoys"],
   body:["文書記著北宋徽宗年間的「花石綱」：朱勔在江南搜羅奇石，造大船運往汴京。船過之處，遇水門、橋梁太低，城牆太窄，竟拆橋鑿城而過，沿途百姓苦不堪言。",
     "Under Emperor Huizong, Zhu Mian gathered rare stones across the south and shipped them to Kaifeng. Where water gates, bridges or city walls stood in the way, they were torn down so the boats could pass."],
   src:"《宋史・佞幸傳・朱勔》"},
  {id:"tl3",kind:"stele",title:["瘦皺漏透","Thin, wrinkled, pierced, open"],
   body:["石上刻著品石四字：瘦、皺、漏、透。北宋米芾愛石成癡，傳說曾對奇石下拜；這四個字則是清代鄭板橋題畫時說「米元章論石」，後人便都歸給米芾。",
     "Four words for judging stones: thin, wrinkled, pierced, open. Mi Fu of the Northern Song was said to bow to strange rocks; the four words come from a Qing painting inscription by Zheng Banqiao that credits them to Mi Fu."],
   src:"《宋史・文苑傳・米芾》；鄭燮題畫石"}];
jhMzDef("pawn",{map:JH_MZ_PAWN_MAP,guards:JH_MZ_PAWN_GUARDS,river:JH_MZ_PAWN_RIVER,pool:JH_MZ_PAWN_POOL,
  puz:{door:JH_MZ_PAWN_POOL.door[0],trap:JH_MZ_PAWN_POOL.trap[0]},solid:"#DRHL",opaque:"#DH",jump:"",
  tex:{floor:"data/maze/tex/pawn_floor.webp",side:"data/maze/tex/pawn_wall.webp"},lore:JH_MZ_PAWN_LORE,   /* 像素材質（11/24 新版，發布時上 CDN）；碑刻內容 */
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"仙人指路譜殘頁",en:"Immortal Points the Way manual page"},{k:"box",zh:"青瓷棋罐",en:"Celadon piece jar"}],
  title:["🪨 太湖石陣","🪨 Lake-rock maze"],lvName:["太湖石陣・第一層","Lake-rock maze · Level 1"],back:["回仙人指路門","Back to the Immortal Points the Way School"],
  hall:{at:[560,860],zh:"🪨 太湖石・石陣入口",en:"🪨 Lake rock · Maze entrance"},
  intro:["你從假山的石洞鑽下去，底下是一片漆黑的石林。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。走到壁燈旁邊會點亮它。","You squeeze through a hole in the rockery into a pitch-dark stone forest. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). Walk next to a wall lamp to light it."],
  warn:["<b>前面有兵卒在巡邏。</b>沒過河的兵只會往前走、只看前面；過了河就左右來回、也看得到身旁。<b>太湖石擋路，但擋不住視線</b>，躲在石頭後面也會被看到。","<b>Pawn guards are on patrol.</b> Before the river a pawn only walks and looks straight ahead; after crossing it paces sideways and can see to its side too. <b>Lake rocks block your path but not their sight</b>, so hiding behind a rock won't help."],
  say:{door:["將死！兵一步一步推上去，石門往兩旁滑開。","Checkmate! The pawns push in step by step and the stone door slides apart."],trap:["將死！兵卒愣在原地，你趁機溜走。","Checkmate! The pawn guard freezes and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["兵卒頭昏眼花，<b>四回合內</b>不會動。","The pawn guard is dizzy and <b>won't move for four turns</b>."],
    dragged:["兵卒把你押回入口，還把你最後撿到的東西放回原來的箱子。","The pawn guard marches you back to the entrance and puts your last find back in its chest."],
    retry:["你被押回了入口。<b>沒過河的兵只看正前方，從他旁邊繞過去。</b>","You were marched back. <b>A pawn that hasn't crossed the river only looks straight ahead: go around beside it.</b>"],
    locked:["石門被機關鎖住了。<b>先在石陣裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the rock maze first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的石窟。第二、三層之後再開。","The steps lead down to deeper grottoes. Levels 2 and 3 open later."]}});
