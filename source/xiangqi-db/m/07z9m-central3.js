/* ---------- W87-3 中炮門地底迷宮・第三層「督運密庫」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的中炮門第三層，照 207、208 複核和開發者 11/26 的決定改：
     ・滾動糧桶（K）：往糧桶走、糧桶前面是空地，就把它推出去——糧桶一路滾到底，碰到牆、別的東西、守衛、或不是空地的格子（寶箱、踏板、壁燈這些）就停在前一格；
       人跟著走進糧桶原來那一格（算一回合）。糧桶擋路、擋光，也擋守衛的視線，用來切斷車衛那條長廊。前面一格就推不動＝撞牆（不算回合）。
       被抓拖回入口時，整層照第一層的規則重擺（糧桶也回原位），不會因為推錯卡死。
     ・守衛（208 複核①：炮衛改照車看，糧桶只負責擋線，不跟過宮炮門「隔一子才看得到」重複）：
       車衛（JH_MZ_KIND.rook，看 7 格）在下面的長廊來回巡；雙炮衛（JH_MZ_KIND.twincannon，第二層那一種，前衛擋住就看不到）在上面的長廊一前一後巡。
     ・機關殘局：炮兵協同，兵收尾的三步殺；被抓殘局一律殺題（開發者決定），不用炮、車收尾，第三層可以用到四步殺。
     ・碑刻：遊戲整理，據《明史·河渠志》（清修；開發者 11/26 選「《明史》可以用，寫明清修」）：陳瑄開清江浦，漕船不用再在淮安盤壩過淮。
     ・寶箱：門派貢獻、古譜殘頁、收尾收藏品「鎮河鐵卷」（208 複核：鐵卷上鑄的是鎮水獸，不是水怪）。
       Gemini 寫的外觀「漕運官船棋盤」要出圖，出圖前要先問開發者；這一版先用古譜殘頁佔位，收藏品只記在迷宮裡（跟第一層的朱紅漆盒一樣）。
     ・修為 +60、去重鍵 maze:central:3（jhMzLayer 照開發者決定給）。配樂照第一層同一首（環境音之後另做）。 */
const JH_MZ_CENTRAL3_MAP=[
"###############",
"######.>.######",
"######...######",
"#######D#######",
"#T..L........T#",
"#.###.###.###.#",
"#C..#.....#..C#",
"###.#.#.#.#.###",
"#...#.#.#.#...#",
"#.###.###.###.#",
"#.............#",
"###.###K###.###",
"#P..#.....#..C#",
"###.#.###.#.###",
"#.............#",
"#.###.#K#.###.#",
"#...#..@..#...#",
"###############"];
/* 守衛：車衛在第 14 列（下面的長廊）來回、看 7 格；雙炮衛在第 10 列，前衛在前、兩個都往右 */
const JH_MZ_CENTRAL3_GUARDS=[{kind:"rook",x:13,y:14,dx:-1,dy:0,range:7},{kind:"twincannon",x:9,y:10,dx:1,dy:0,front:1},{kind:"twincannon",x:7,y:10,dx:1,dy:0}];
/* 推糧桶：往 K 走就把它往同一個方向推，一路滾到前面不是空地（或有守衛）的前一格；滾不動＝撞牆。回 null 讓共用程式照常走一步、算回合、讓守衛動 */
function jhMzCentral3Roll(S,dx,dy,c){if(c!=="K"||(!dx&&!dy))return null;const P=S.player,x1=P.x+dx,y1=P.y+dy,free=(x,y)=>jhMzCell(S,x,y)==="."&&!(S.guards||[]).some(G=>G.x===x&&G.y===y);
  let x=x1,y=y1;while(free(x+dx,y+dy)){x+=dx;y+=dy}
  if(x===x1&&y===y1)return{ev:"wall",msg:["糧桶推不動：前面被擋住了。","The grain barrel won't roll: something is in the way."]};
  S.grid[y1][x1]=".";S.grid[y][x]="K";return null}
/* 3D：橫倒的糧桶（木桶身＋兩道鐵箍）；平面版：木色圓桶 */
if(!JH_MZ_OBJ.K)JH_MZ_OBJ.K=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),b=mesh(new T3.CylinderGeometry(.3,.3,.7,14),lam("#7a5530"),0,.3,0);b.rotation.z=Math.PI/2;g.add(b);
  for(const s of[-.22,.22]){const r=mesh(new T3.CylinderGeometry(.315,.315,.06,14),lam("#3a3a3a"),s,.3,0);r.rotation.z=Math.PI/2;g.add(r)}return g};
if(!JH_MZ_TILE.K)JH_MZ_TILE.K=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#7a5530";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.36,0,Math.PI*2);cx.fill();
  cx.strokeStyle="#2e2418";cx.lineWidth=2;cx.beginPath();cx.arc(px+T/2,py+T/2,T*.36,0,Math.PI*2);cx.moveTo(px+T*.2,py+T/2);cx.lineTo(px+T*.8,py+T/2);cx.stroke()};
/* ==JH_MZ_POOL:JH_MZ_POOL_CENTRAL3== */
const JH_MZ_POOL_CENTRAL3={door:[
{"id":"jc108c8","src":{"book":"橘中秘","title":"炮兵能勝士象全"},"zh":["石門機關：炮兵協同","門上刻著一門炮守住中路，兵卒往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: cannon and pawn together","A cannon holding the centre while pawns push forward is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"3ak4/4aP3/b3b4/9/9/9/2C6/9/4K4/9","line":["c3e3","a7c5","e1f1","c5a7","f8f9"]},
{"id":"jc133c5","src":{"book":"橘中秘","title":"雙兵破雙缺士"},"zh":["石門機關：炮兵協同","門上刻著一門炮守住中路，兵卒往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: cannon and pawn together","A cannon holding the centre while pawns push forward is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"6b2/2P1k4/5P2b/9/9/9/9/9/9/3K5","line":["c8d8","e8e9","f7f8","i7g5","d8e8"],"alt":{"c8d8":["e8e9",{"f7f8":["i7g5",{"d8e8":0,"d8d9":0}]}]}},
{"id":"lk019c6","src":{"book":"爛柯神機","title":"出其不意"},"zh":["石門機關：炮兵協同","門上刻著一門炮守住中路，兵卒往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: cannon and pawn together","A cannon holding the centre while pawns push forward is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"2rk2NcC/3n1P3/9/9/9/9/3R5/9/3p1p3/4K1p2","line":["g9h7","h9h8","f8f9","h8h9","f9e9"],"alt":{"g9h7":["h9h8",{"f8f9":["h8h9",{"f9e9":0,"h7f8":0}]}]}}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CENTRAL3== */
/* ==JH_MZ_POOL:JH_MZ_POOL_CENTRAL3_TRAP== */
const JH_MZ_POOL_CENTRAL3_TRAP={door:[
],
trap:[
{"id":"jc099c4","src":{"book":"橘中秘","title":"馬兵攻雙士炮卒"},"zh":["被守衛逮住了","守衛把你押在糧桶堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the barrels: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3ak1P2/3ca4/9/5N3/9/9/9/p8/9/4K4","line":["f6g4","a2a1","g4h6","a1a0","h6f7"]},
{"id":"jz039c6","src":{"book":"蕉竹齋","title":"回騎進兵"},"zh":["被守衛逮住了","守衛把你押在糧桶堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the barrels: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3ak1P2/3P5/3a4N/9/9/9/9/9/1p7/3Kp4","line":["d0d1","b1c1","d1d2","e0d0","i7g8"]},
{"id":"lk001c4","src":{"book":"爛柯神機","title":"八蠻獻寶"},"zh":["被守衛逮住了","守衛把你押在糧桶堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the barrels: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3kc1cn1/4P3N/9/9/9/3r5/9/4BC3/4p1p2/3p1K3","line":["f2f9","e9e2","f9h9","g9g8","i8g9"]},
{"id":"lk024c4","src":{"book":"爛柯神機","title":"單騎徇敵"},"zh":["被守衛逮住了","守衛把你押在糧桶堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the barrels: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3C1k3/4P4/4b3c/9/7N1/9/5C3/9/1np1pcr2/3K1n3","line":["h5f6","i7f7","f6d7","f7i7","d7e9"]},
{"id":"lk054c7","src":{"book":"爛柯神機","title":"功歸轉軸"},"zh":["被守衛逮住了","守衛把你押在糧桶堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the barrels: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3a1N3/8R/1NC2k3/4p4/9/9/6P2/9/2pp1pp2/r1c1K4","line":["f9h8","f7e7","h8g6","e7d7","b7c9"]},
{"id":"lk072c7","src":{"book":"爛柯神機","title":"季庭舞俏"},"zh":["被守衛逮住了","守衛把你押在糧桶堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the barrels: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"9/2NP5/5k3/3n1C3/2r6/9/9/4p4/3pCp3/4K4","line":["c8d6","f7f8","d8e8","f8f9","d6f7"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CENTRAL3_TRAP== */
jhMzLayer("central",3,{map:JH_MZ_CENTRAL3_MAP,guards:JH_MZ_CENTRAL3_GUARDS,solid:"#SDKL",opaque:"#DK",onStep:jhMzCentral3Roll,
  pool:{door:JH_MZ_POOL_CENTRAL3.door,trap:JH_MZ_POOL_CENTRAL3_TRAP.trap},puz:{door:JH_MZ_POOL_CENTRAL3.door[0],trap:JH_MZ_POOL_CENTRAL3_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"古譜殘頁",en:"Old manual page"},{k:"relic",zh:"收藏品「鎮河鐵卷」",en:"Keepsake: the river-guard iron scroll"}],
  lore:[{id:"cc5",kind:"stele",title:["清江浦碑","Qingjiangpu stele"],
    body:["碑上記著淮安的漕運：明朝初年，漕船到了淮安要把船拖過土壩才進得了淮河，又慢又容易出事。陳瑄奉命管漕運，開了清江浦這條河道，船可以直接從運河駛進淮河，再往北運糧。",
      "The stele tells of the grain fleet at Huai'an. In the early Ming, tribute boats had to be hauled over an earthen dam to reach the Huai River: slow work, and dangerous. Chen Xuan, put in charge of the grain transport, cut the Qingjiangpu channel so boats could sail straight from the canal into the Huai and on north."],
    src:"遊戲整理，據《明史·河渠志》（清修）；碑本身是遊戲虛構"}],
  title:["🕳 督運密庫","🕳 Grain commissioner's vault"],lvName:["督運密庫・第三層","Grain commissioner's vault · Level 3"],
  intro:["石階盡頭是督運官藏帳冊的密庫，地上橫著一個個糧桶。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>往糧桶走就會把它推出去</b>，糧桶會一路滾到底，停下來就能擋住守衛的視線。",
    "At the bottom of the steps lies the vault where the grain commissioner kept his ledgers; barrels lie on their sides across the floor. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Walk into a barrel to push it</b>: it rolls all the way until something stops it, and where it stops it blocks the guards' view."],
  warn:["<b>下面的長廊有車衛巡邏，看得到 7 格；上面的長廊有兩個炮衛一前一後。</b>紅線是他們看得到的格子。把糧桶滾進長廊，就能擋住紅線。",
    "<b>A chariot guard patrols the lower corridor and sees 7 squares; two cannon guards walk the upper corridor one behind the other.</b> The red line is what they can see. Roll a barrel into a corridor to cut the line."],
  say:{door:["將死！炮鎮中路、兵卒收尾，石門轟隆一聲往上收。","Checkmate! The cannon holds the centre, the pawn finishes, and the stone door rumbles open."],trap:["將死！守衛愣在原地，你趁機脫身。","Checkmate! The guard freezes and you slip away."],
    dazed:["守衛暈頭轉向，<b>四回合內</b>不會動。","The guard is dazed and <b>won't move for four turns</b>."],
    dragged:["守衛把你拖回入口，糧桶也都被擺回原位，還把你最後撿到的東西丟回原來的箱子。","The guard drags you back to the entrance, rolls the barrels back where they were, and tosses your last find back into its chest."],
    retry:["你被拖回了入口。<b>先把糧桶滾進長廊擋住車衛，再從糧桶後面過去。</b>","You were dragged back. <b>Roll a barrel into the corridor to block the chariot guard first, then cross behind it.</b>"],
    locked:["石門被機關鎖住了。<b>先在密庫裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the vault first.</b>"],
    spot:["<b>守衛轉過頭來看見你了！</b>趕快離開紅線——下一步還在紅線上就會被逮住。","<b>A guard turns and spots you!</b> Get off the red line now: if you are still on it next turn, you are caught."],
    done:["三層都走完了，漕倉底下已經走到盡頭。","All three levels are done: this is the very bottom of the granary."]}});
