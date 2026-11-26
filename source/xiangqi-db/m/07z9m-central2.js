/* ---------- W87-2 中炮門地底迷宮・第二層「漕底淤廊」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的中炮門第二層，照 208 複核（iMac Claude 1）和開發者 11/26 的決定改：
     ・淺水窪（Q）：走進去要多耗一回合（守衛多走一步）；擋路、擋光都不會。自動規劃路線不主動踩（lv.avoid），踩到自動走就停。
       多耗的那一回合照「原地等一回合」的規則（jhMzStep(S,0,0)，#212 審查）：守衛走完才看到你就先提醒（spot）、這一步不走進去；被抓就照被抓；
       那一回合守衛走完以後，水窪落在紅線上（或站著守衛）也一樣先提醒、人不進去（#212 複審：走之前不是紅線的水窪，不能直接被抓）；都沒事才走進水窪。
     ・雙炮衛（JH_MZ_KIND.twincannon）：兩個炮衛在同一條走廊來回巡，面向那一邊看得到 3 格；
       複核選「前衛擋住就看不到」：另一個炮衛擋在前面，後面那一格起就看不到（跟過宮炮門「隔一子才看得到」區隔開）。
       前衛（front）不踩水窪，碰到水窪就掉頭；後衛會走進水窪。兩個炮衛不會走進對方那一格（碰到就掉頭）。
     ・機關殘局：中兵突破，兵收尾（古譜裡沒有兵收尾的兩步殺，用三步殺）；被抓殘局一律殺題（開發者決定），車收尾。
     ・碑刻：遊戲整理，據潘季馴《河防一覽》（複核：可用）。
     ・寶箱：門派貢獻、中炮譜殘頁、稱號「逆水行舟」（外觀出圖前先問開發者，這一層的獎勵本來就是稱號，不用出圖）。
     ・修為 +40、去重鍵 maze:central:2（jhMzLayer 照開發者決定給）。配樂照第一層同一首（環境音之後另做）。 */
const JH_MZ_CENTRAL2_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"######.########",
"#C...#.#...L..#",
"#.#.#..#.#.##.#",
"#.#...##..#...#",
"#.###.#..##.#.#",
"#.....#.#.....#",
"#.Q.........Q.#",
"###.#####.#####",
"#P..#C..#....C#",
"#.###.#.#.##..#",
"#.....#...#...#",
"#####.#####.###",
"#T..........T.#",
"#.....@.......#",
"###############"];
/* 雙炮衛：front＝前衛（不踩水窪）；兩個都往右、前衛在前 */
const JH_MZ_CENTRAL2_GUARDS=[{kind:"twincannon",x:8,y:11,dx:1,dy:0,front:1},{kind:"twincannon",x:6,y:11,dx:1,dy:0}];
/* 這一格站著別的守衛（擋炮衛的視線、炮衛也不走進去） */
function jhMzCentral2Mate(S,G,x,y){return(S.guards||[]).some(H=>H!==G&&H.x===x&&H.y===y)}
JH_MZ_KIND.twincannon={
  /* 面向那一邊看 range（預設 3）格；擋路的東西、或另一個守衛擋住，那一格起就看不到 */
  sight(S,G){const o=[],dx=G.dx||0,dy=G.dy||0,n=G.range||3;for(let i=1;i<=n;i++){const x=G.x+dx*i,y=G.y+dy*i;if(jhMzSolid(S,x,y)||jhMzCentral2Mate(S,G,x,y))break;o.push({x,y})}return o},
  /* 照面向走一格；前面擋路、有守衛、或前衛碰到水窪就掉頭，掉頭後還是過不去就原地等 */
  step(S,G){const blk=(x,y)=>jhMzSolid(S,x,y)||jhMzCentral2Mate(S,G,x,y)||!!G.front&&jhMzCell(S,x,y)==="Q";let dx=G.dx||0,dy=G.dy||0;
    if(blk(G.x+dx,G.y+dy)){dx=-dx;dy=-dy;G.dx=dx;G.dy=dy}if(!blk(G.x+dx,G.y+dy)){G.x+=dx;G.y+=dy}},
  look:{body:"#3a2418",head:"#5a3626",eye:0xE24A3A}};
/* 走進水窪：陷在泥裡多耗一回合——照原地等一回合跑（守衛走、先提醒、被抓都照共用規則）；那一回合沒事，才照預設走進去 */
function jhMzCentral2Mud(S,dx,dy,c){if(c!=="Q")return null;const r=jhMzStep(S,0,0);if(r.ev!=="move")return r;
  /* #212 複審：那一回合守衛走完以後，水窪落在紅線上（或站著守衛）＝也是「走完才看到」，先提醒、人不進去，不直接抓 */
  const x=S.player.x+dx,y=S.player.y+dy;if((S.guards||[]).some(G=>!(G.stun>0)&&(G.x===x&&G.y===y||jhMzSight(S,G).some(q=>q.x===x&&q.y===y)))){S.caughtBy=null;return{ev:"spot"}}
  return null}
/* 3D：淺水窪（地上一層半透明的淡藍水面）；平面版：地面色上一塊淡藍 */
if(!JH_MZ_OBJ.Q)JH_MZ_OBJ.Q=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.96,.03,.96),new T3.MeshLambertMaterial({color:0x4a6a7a,transparent:true,opacity:.75}),0,.015,0));return g};
if(!JH_MZ_TILE.Q)JH_MZ_TILE.Q=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="rgba(90,130,150,.75)";cx.fillRect(px+T*.08,py+T*.08,T*.84,T*.84)};
/* ==JH_MZ_POOL:JH_MZ_POOL_CENTRAL2== */
const JH_MZ_POOL_CENTRAL2={door:[
{"id":"sq209c5","src":{"book":"適情雅趣","title":"叄參見佛"},"zh":["石門機關：中兵突破","門上刻著一隊漕兵頂著水往前推。紅方先走，3 步將死黑方，門就會開。提示：最後一步是兵將死。"],"en":["Stone door: the central pawn breaks through","A file of canal soldiers pushing against the current is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a pawn gives the final mate."],"fen":"5a3/3kn4/4b1r2/2pP5/9/3n5/9/3C5/5r1p1/4K3c","line":["d6d7","d8d9","d7d8","d9e9","d8d9"]},
{"id":"sq351c4","src":{"book":"適情雅趣","title":"老而不倦"},"zh":["石門機關：中兵突破","門上刻著一隊漕兵頂著水往前推。紅方先走，3 步將死黑方，門就會開。提示：最後一步是兵將死。"],"en":["Stone door: the central pawn breaks through","A file of canal soldiers pushing against the current is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a pawn gives the final mate."],"fen":"2bk1Pb2/4P4/3a1a3/4C4/9/9/9/9/1p3p3/3Kp4","line":["d0d1","f1e1","d1d2","e0d0","f9e9"]},
{"id":"sq369c5","src":{"book":"適情雅趣","title":"時堪乘便"},"zh":["石門機關：中兵突破","門上刻著一隊漕兵頂著水往前推。紅方先走，3 步將死黑方，門就會開。提示：最後一步是兵將死。"],"en":["Stone door: the central pawn breaks through","A file of canal soldiers pushing against the current is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a pawn gives the final mate."],"fen":"5aC2/3k1P3/3a5/7C1/9/9/9/3K5/5p3/2p1p4","line":["g9g8","d8d9","h6h9","f9e8","f8f9"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CENTRAL2== */
/* ==JH_MZ_POOL:JH_MZ_POOL_CENTRAL2_TRAP== */
const JH_MZ_POOL_CENTRAL2_TRAP={door:[
],
trap:[
{"id":"lk085c7","src":{"book":"爛柯神機","title":"抉盡藩籬"},"zh":["被炮衛逮住了","炮衛把你按在淤泥邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the mud: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3a1R3/1r1k5/4P4/6Nc1/5C3/9/9/4p1n2/3r1p3/4K2c1","line":["f9f8","d9e8","e7e8","d8d7","f8f7"]},
{"id":"lk091c4","src":{"book":"爛柯神機","title":"力穿七扎"},"zh":["被炮衛逮住了","炮衛把你按在淤泥邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the mud: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3a3NC/3Ra4/3Nnk3/1c7/9/9/9/3Cp4/2r1pr3/3K5","line":["d7e5","b6e6","d2d7","e8d7","d8f8"]},
{"id":"lk094c5","src":{"book":"爛柯神機","title":"聯軍戰勝-(B字形)"},"zh":["被炮衛逮住了","炮衛把你按在淤泥邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the mud: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"9/2P1P4/3k2N2/3cR4/3c5/3p2p2/3r2p2/2pp1K3/9/9","line":["e6d6","d7e7","g7f9","e7e8","d6e6"]},
{"id":"lk103c5","src":{"book":"爛柯神機","title":"馬陵塞道-(紅勝)"},"zh":["被炮衛逮住了","炮衛把你按在淤泥邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the mud: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"c2R2b2/2n1P1r2/4bk3/5c3/9/9/4C4/4p4/3pApr2/4K4","line":["e3f3","f6i6","d9f9","g8f8","f9f8"]},
{"id":"lk116c6","src":{"book":"爛柯神機","title":"排●妥帖"},"zh":["被炮衛逮住了","炮衛把你按在淤泥邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the mud: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"4P1c2/2P1n1N2/3kb4/9/9/9/5r1R1/3p5/4p4/3K1C3","line":["g8f6","f3f6","h3d3","f6d6","d3d6"]},
{"id":"lk208c5","src":{"book":"爛柯神機","title":"野無害馬"},"zh":["被炮衛逮住了","炮衛把你按在淤泥邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the mud: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2n1k4/3P1R3/5nc2/4C4/9/9/3pcN3/3App3/4p3r/3K5","line":["d8e8","e9d9","f8f9","f7e9","f9e9"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CENTRAL2_TRAP== */
jhMzLayer("central",2,{map:JH_MZ_CENTRAL2_MAP,guards:JH_MZ_CENTRAL2_GUARDS,avoid:"Q",onStep:jhMzCentral2Mud,
  pool:{door:JH_MZ_POOL_CENTRAL2.door,trap:JH_MZ_POOL_CENTRAL2_TRAP.trap},puz:{door:JH_MZ_POOL_CENTRAL2.door[0],trap:JH_MZ_POOL_CENTRAL2_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"中炮譜殘頁",en:"Central Cannon manual page"},{k:"title",zh:"稱號「逆水行舟」",en:"Title: Against the Current"}],
  lore:[{id:"cc4",kind:"stele",title:["束水攻沙碑","Stele on narrowing the river"],
    body:["碑上記著治河的道理：潘季馴總理河道時，在淮安築高家堰，把河道收窄，讓水流變急，靠水自己把泥沙沖走，這叫「以堤束水，以水攻沙」。漕船要過淮安，全靠河道通暢。",
      "The stele records a way of taming the river: when Pan Jixun ran the waterways, he built the Gaojia dike at Huai'an and narrowed the channel so the faster water would scour the silt away by itself. Tribute boats could only pass Huai'an if the river stayed open."],
    src:"遊戲整理，據潘季馴《河防一覽》；「以堤束水，以水攻沙」是潘季馴的治河主張，碑本身是遊戲虛構"}],
  title:["🕳 漕底淤廊","🕳 Silted culvert"],lvName:["漕底淤廊・第二層","Silted culvert · Level 2"],
  intro:["你順著石階往下，腳下的泥越來越濕，這裡是漕倉底下的暗渠。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。地上的淺水窪陷腳，<b>走進去要多花一回合</b>，自動走不會主動踩。",
    "You follow the steps down; the mud underfoot grows wetter. This is the culvert under the granary. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). The shallow puddles suck at your feet: <b>stepping into one costs an extra turn</b>, and auto-walk won't step in on its own."],
  warn:["<b>中間的走廊有兩個炮衛一前一後巡邏。</b>紅線是他們看得到的 3 格；後面那個被前面那個擋住就看不到。前面那個不踩水窪，走到水窪前會掉頭。",
    "<b>Two cannon guards patrol the middle corridor, one behind the other.</b> The red line is the 3 squares each can see; the rear one can't see past the front one. The front guard won't step in a puddle and turns back at one."],
  say:{door:["將死！中兵一路衝破防線，石門轟隆一聲往上收。","Checkmate! The central pawn breaks through and the stone door rumbles open."],trap:["將死！炮衛愣在原地，你趁機脫身。","Checkmate! The cannon guard freezes and you slip away."],
    dazed:["炮衛暈頭轉向，<b>四回合內</b>不會動。","The cannon guard is dazed and <b>won't move for four turns</b>."],
    dragged:["炮衛把你拖回入口，還把你最後撿到的東西丟回原來的箱子。","The cannon guard drags you back to the entrance and tosses your last find back into its chest."],
    retry:["你被拖回了入口。<b>等前面的炮衛走到水窪前掉頭，再從他背後過去。</b>","You were dragged back. <b>Wait for the front guard to turn back at a puddle, then cross behind him.</b>"],
    locked:["石門被機關鎖住了。<b>先在淤廊裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the culvert first.</b>"],
    spot:["<b>炮衛轉過頭來看見你了！</b>趕快離開紅線——下一步還在紅線上就會被逮住。","<b>A cannon guard turns and spots you!</b> Get off the red line now: if you are still on it next turn, you are caught."],
    done:["石階還往下延伸，第三層之後再開。","The steps go on down. Level 3 opens later."]}});
