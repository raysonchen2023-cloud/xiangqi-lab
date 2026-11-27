/* ---------- W87-2 順炮地底迷宮・第二層「熬波坑道」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的順炮門第二層，照 208 複核（iMac Claude 1）和開發者 11/26 的決定改：
     ・餘溫灰燼（A）：走得過去、不擋光；玩家走進灰燼就激起火星——火星四周 5 格內（照得到的）一下子都看清楚，火星亮 2 回合。
       自動規劃路線不主動踩灰燼（lv.avoid），踩到自動走就停；要激起火星就自己點那一格。
     ・衝刺暗哨（JH_MZ_KIND.flaredash）：平常照第一層鹽道暗哨（JH_MZ_KIND.dash：一回合衝兩格、撞牆花一回合轉身、只看正前方）；
       火星亮著的 2 回合裡，暗哨跟火星在同一條直線上、中間沒被擋住，就放下原路、轉向朝火星衝過去（衝到火星那一格停下查看）。
       所以踩灰燼是兩面刃：照亮路，也會把同一條長廊上的暗哨引過來；反過來，也能用它把暗哨引離你要走的那條路。
     ・廢棄鹽灶（s）照第一層：走到旁邊就撥旺、一直亮著。
     ・機關殘局：棄子搶攻，馬收尾（規格是馬臥槽）；被抓殘局一律殺題（開發者決定），兵收尾（開發者 11/26 選單「換成馬、兵收尾」：用 --multi 出題，最快殺都算對）。
       開發者 11/26 選單：不同派可以重用題目，只在同一派各層之間不重複（出題的 --exclude 只排除順炮自己的各層）。
     ・碑刻：遊戲整理，據嘉靖《兩淮鹽法志》（複核：可用，要寫明用明代版本）。
     ・寶箱：門派貢獻、順炮譜殘頁、頭像「霜鹽結晶」（外觀要出圖，出圖前先問開發者；這版先只記名字）。 */
const JH_MZ_SAME2_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#.###.###.###.#",
"#.............#",
"#C#.###.###.#C#",
"#.#.#.....#.#.#",
"#...#.s.L.#...#",
"###.#.....#.###",
"#.............#",
"#.#A###.###A#.#",
"#.#.#.....#.#.#",
"#...#..P..#...#",
"#.###.....###.#",
"#.............#",
"#C###.###.###.#",
"#T....@......T#",
"###############"];
const JH_MZ_SAME2_GUARDS=[{kind:"flaredash",x:13,y:6,dx:-1,dy:0},{kind:"flaredash",x:1,y:11,dx:1,dy:0}];
/* 火星：踩灰燼那一回合起亮 2 回合（S.flare＝{x,y,at:踩的那一回合}）；四周 JH_MZ_SAME2_FLARE 格內照得到的格子看清楚 */
const JH_MZ_SAME2_FLARE=5;
const jhMzSame2Lit=S=>!!S.flare&&S.turn<=S.flare.at+2;
/* 暗哨跟火星在同一條直線上、中間沒被擋住：回傳朝火星的方向，不然 null */
function jhMzSame2Toward(S,G){if(!jhMzSame2Lit(S))return null;const F=S.flare,dx=Math.sign(F.x-G.x),dy=Math.sign(F.y-G.y);
  if((dx&&dy)||(!dx&&!dy))return null;for(let x=G.x+dx,y=G.y+dy;x!==F.x||y!==F.y;x+=dx,y+=dy)if(jhMzSolid(S,x,y))return null;return[dx,dy]}
JH_MZ_KIND.flaredash={
  sight(S,G){return JH_MZ_KIND.dash.sight(S,G)},
  /* 火星亮著、同一條直線：轉向朝火星衝兩格（衝到火星那一格就停）；不然照第一層 */
  step(S,G){const t=jhMzSame2Toward(S,G);if(!t)return JH_MZ_KIND.dash.step(S,G);G.dx=t[0];G.dy=t[1];const P=S.player;
    for(let i=0;i<2;i++){const nx=G.x+t[0],ny=G.y+t[1];if(jhMzSolid(S,nx,ny))break;G.x=nx;G.y=ny;if(P&&P.x===nx&&P.y===ny)break;if(nx===S.flare.x&&ny===S.flare.y)break}},
  look:{body:"#4a3a2a",head:"#6a5238",eye:0xF0A030}};
/* 走一步之前：走進灰燼就激起火星（記下位置與回合、照亮四周）；然後照第一層撥旺鹽灶 */
function jhMzSame2Ash(S,dx,dy,c){if(c==="A"){const x=S.player.x+dx,y=S.player.y+dy;S.flare={x,y,at:S.turn};
    for(let yy=y-JH_MZ_SAME2_FLARE;yy<=y+JH_MZ_SAME2_FLARE;yy++)for(let xx=x-JH_MZ_SAME2_FLARE;xx<=x+JH_MZ_SAME2_FLARE;xx++){if(xx<0||yy<0||xx>=S.W||yy>=S.H)continue;
      if(Math.hypot(xx-x,yy-y)<=JH_MZ_SAME2_FLARE&&jhMzLos(S,x,y,xx,yy))S.seen.add(yy*S.W+xx)}}
  return jhMzSameStove(S,dx,dy,c)}
/* 3D：餘溫灰燼（地上一層灰，夾著幾點暗紅的餘火）；平面版：灰底紅點 */
if(!JH_MZ_OBJ.A)JH_MZ_OBJ.A=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.9,.04,.9),new T3.MeshLambertMaterial({color:0x5a5650}),0,.02,0));
  for(const[a,b]of[[-.2,-.15],[.18,.1],[-.05,.25]])g.add(mesh(new T3.BoxGeometry(.08,.05,.08),new T3.MeshBasicMaterial({color:0xc8501e}),a,.04,b));return g};
if(!JH_MZ_TILE.A)JH_MZ_TILE.A=(cx,px,py,T)=>{cx.fillStyle="#5a5650";cx.fillRect(px,py,T,T);cx.fillStyle="#c8501e";for(const[a,b]of[[.3,.35],[.68,.6],[.45,.75]])cx.fillRect(px+T*a,py+T*b,T*.1,T*.1)};
/* ==JH_MZ_POOL:JH_MZ_POOL_SAME2== */
const JH_MZ_POOL_SAME2={door:[
{"id":"jz039c6","src":{"book":"蕉竹齋","title":"回騎進兵"},"zh":["石門機關：棄子搶攻","門上刻著一座大灶，灶口的火往外撲。紅方先走，3 步將死黑方，門就會開。提示：捨得丟子才搶得到先手，最後一步是馬將死。"],"en":["Stone door: sacrifice and strike","A great stove with flames leaping from its mouth is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: give up a piece to seize the initiative; a horse gives the final mate."],"fen":"3ak1P2/3P5/3a4N/9/9/9/9/9/1p7/3Kp4","line":["d0d1","b1c1","d1d2","e0d0","i7g8"]},
{"id":"lk001c4","src":{"book":"爛柯神機","title":"八蠻獻寶"},"zh":["石門機關：棄子搶攻","門上刻著一座大灶，灶口的火往外撲。紅方先走，3 步將死黑方，門就會開。提示：捨得丟子才搶得到先手，最後一步是馬將死。"],"en":["Stone door: sacrifice and strike","A great stove with flames leaping from its mouth is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: give up a piece to seize the initiative; a horse gives the final mate."],"fen":"3kc1cn1/4P3N/9/9/9/3r5/9/4BC3/4p1p2/3p1K3","line":["f2f9","e9e2","f9h9","g9g8","i8g9"]},
{"id":"lk024c4","src":{"book":"爛柯神機","title":"單騎徇敵"},"zh":["石門機關：棄子搶攻","門上刻著一座大灶，灶口的火往外撲。紅方先走，3 步將死黑方，門就會開。提示：捨得丟子才搶得到先手，最後一步是馬將死。"],"en":["Stone door: sacrifice and strike","A great stove with flames leaping from its mouth is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: give up a piece to seize the initiative; a horse gives the final mate."],"fen":"3C1k3/4P4/4b3c/9/7N1/9/5C3/9/1np1pcr2/3K1n3","line":["h5f6","i7f7","f6d7","f7i7","d7e9"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SAME2== */
/* ==JH_MZ_POOL:JH_MZ_POOL_SAME2_TRAP== */
const JH_MZ_POOL_SAME2_TRAP={door:[
],
trap:[
{"id":"lk048c6","src":{"book":"爛柯神機","title":"峯蠆肆毒"},"zh":["被鹽道暗哨押住了","暗哨把你押在灶邊：「鹽票背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a salt-road runner","The runner holds you by the stove: \"Solve the game on the back of this salt ticket and you can go.\" Red to move: checkmate in 3."],"fen":"1C3k3/4a1c2/3N5/6P2/9/9/9/3pBC3/2p1r4/3K2R2","line":["g6f6","e8f7","f6f7","g8f8","f7f8"],"alt":{"g6f6":["e8f7",{"f6f7":["g8f8",{"f7f8":0,"d7c9":0,"g0g9":0}],"d7c9":["f9f8",{"g0g8":0}]}]}},
{"id":"lk104c4","src":{"book":"爛柯神機","title":"馬首是瞻"},"zh":["被鹽道暗哨押住了","暗哨把你押在灶邊：「鹽票背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a salt-road runner","The runner holds you by the stove: \"Solve the game on the back of this salt ticket and you can go.\" Red to move: checkmate in 3."],"fen":"4k1c2/2P1a1n2/b3P4/3r5/9/6BC1/4P4/9/4C1p2/r2p1K3","line":["e7e8","e9d9","h4h9","g8e9","e8e9"]},
{"id":"lk137c6","src":{"book":"爛柯神機","title":"巧用連環-(連環形)"},"zh":["被鹽道暗哨押住了","暗哨把你押在灶邊：「鹽票背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a salt-road runner","The runner holds you by the stove: \"Solve the game on the back of this salt ticket and you can go.\" Red to move: checkmate in 3."],"fen":"9/4k4/3R1P3/6p2/2P6/4n4/3C1p3/2p3r2/3p1p3/4K4","line":["d7e7","e8d8","c5d5","e4d6","d5d6"]},
{"id":"lk141c5","src":{"book":"爛柯神機","title":"屈乘假道"},"zh":["被鹽道暗哨押住了","暗哨把你押在灶邊：「鹽票背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a salt-road runner","The runner holds you by the stove: \"Solve the game on the back of this salt ticket and you can go.\" Red to move: checkmate in 3."],"fen":"C1bak4/3R5/5cr2/9/4P4/9/9/9/2r1p4/3K5","line":["d8d9","e9e8","d9d8","e8e7","e5e6"]},
{"id":"lk173c5","src":{"book":"爛柯神機","title":"歲寒松柏"},"zh":["被鹽道暗哨押住了","暗哨把你押在灶邊：「鹽票背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a salt-road runner","The runner holds you by the stove: \"Solve the game on the back of this salt ticket and you can go.\" Red to move: checkmate in 3."],"fen":"5cb2/3n1P3/2r1k4/2Rc1PN2/4P1b2/2r6/9/2p6/3p1p3/4K4","line":["e5e6","d8e6","f6e6","e7f7","e6f6"]},
{"id":"lk182c5","src":{"book":"爛柯神機","title":"脫帽露頂"},"zh":["被鹽道暗哨押住了","暗哨把你押在灶邊：「鹽票背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a salt-road runner","The runner holds you by the stove: \"Solve the game on the back of this salt ticket and you can go.\" Red to move: checkmate in 3."],"fen":"6Nc1/2PP1k3/4N2n1/9/9/9/9/3p5/2rp1r3/4K4","line":["e7g6","f8f9","g6h8","f9f8","d8e8"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SAME2_TRAP== */
jhMzLayer("same_cannon",2,{map:JH_MZ_SAME2_MAP,guards:JH_MZ_SAME2_GUARDS,solid:"#DsL",opaque:"#DsL",avoid:"A",onStep:jhMzSame2Ash,
  pool:{door:JH_MZ_POOL_SAME2.door,trap:JH_MZ_POOL_SAME2_TRAP.trap},puz:{door:JH_MZ_POOL_SAME2.door[0],trap:JH_MZ_POOL_SAME2_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"順炮譜殘頁",en:"Same-Direction Cannons manual page"},{k:"face",zh:"頭像「霜鹽結晶」",en:"Avatar: Frost-salt crystal"}],
  lore:[{id:"sc4",kind:"stele",title:["灶戶苦役碑","Stele of the salt-boilers' toil"],
    body:["碑上記著兩淮鹽場的事：灶戶在海邊煎鹽，引海水上灶，大火日夜不停，一年到頭都在灶前，工作非常辛苦。","The stele tells of the Lianghuai salt fields: by the sea, the salt-boiling households drew seawater onto their stoves and kept the great fires going day and night, all year round. It was very hard work."],
    src:"遊戲整理，據嘉靖《兩淮鹽法志》；碑本身是遊戲虛構"}],
  title:["🧂 熬波坑道","🧂 Brine-boiling tunnels"],lvName:["熬波坑道・第二層","Brine-boiling tunnels · Level 2"],
  intro:["石階往下，坑道裡還有熬鹽留下的灰燼，摸上去是溫的。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>踩進灰燼會激起火星，四周一下子都照亮</b>；自動走不會主動踩。",
    "Down the steps, the tunnels still hold ash from the brine fires, warm to the touch. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Stepping into the ash throws up sparks that light everything around</b>; auto-walk won't step in on its own."],
  warn:["<b>火星亮著的兩回合裡，同一條長廊上的暗哨會轉頭朝火星衝過來。</b>踩灰燼可以照路，也可以故意把暗哨引開，再從另一邊走。",
    "<b>For two turns while the sparks glow, a runner on the same corridor turns and dashes toward them.</b> Use the ash to light your way, or to lure a runner off and slip past on the other side."],
  say:{door:["將死！棄子搶攻一擊得手，石門往兩旁滑開。","Checkmate! The sacrifice pays off and the stone door slides apart."],
    locked:["石門被機關鎖住了。<b>先在坑道裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the tunnels first.</b>"],
    retry:["你被押回了入口。<b>暗哨轉身要花一回合；火星會把同一條長廊上的暗哨引過去。</b>","You were marched back. <b>A runner needs a turn to turn around, and sparks draw runners on the same corridor.</b>"],
    done:["石階往下通到私鹽暗庫，第三層之後再開。","The steps lead down to the smugglers' store. Level 3 opens later."]}});
