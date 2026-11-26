/* ---------- W87-2 過宮炮地底迷宮・第二層「烘焙暗道」（11/26 Windows Claude 1 改分派給 Windows Claude 2）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的過宮炮門第二層，照 208 複核（iMac Claude 1）和開發者 11/26 的決定改：
     ・間歇蒸氣：蒸氣口（E）從隔壁蒸料房漏氣，每 2 回合噴一次（奇數回合噴，噴的時候畫成 e）。噴著的蒸氣擋光、擋炮衛的視線，不擋路；
       沒噴的時候就是地面。自動規劃路線不主動踩蒸氣口（lv.avoid），踩到自動走就停。
     ・炮衛（JH_MZ_KIND.steamcannon）：照第一層紙坊護院（JH_MZ_KIND.cannon：沿直線來回，跟玩家在同一條直線上、中間剛好隔一座宣紙架才看得到），
       只差在視線穿不過噴著的蒸氣；算準蒸氣噴的那一回合從炮衛的火線上穿過去。
       蒸氣跟著回合數走（jhMzCross2Sync）：玩家每走一步、炮衛每走一步都對一次，所以原地等也會換。
     ・機關殘局：炮牽制馬殺，馬收尾；被抓殘局一律殺題（開發者決定）。開發者 11/26：只在同一派各層之間不重複。
     ・碑刻：遊戲整理，據文震亨《長物志》談紙的一卷（複核：待查原典，內容收斂成「宣紙要細、要焙乾」，不寫涇縣火候細節）。
     ・寶箱：門派貢獻、過宮炮譜殘頁、稱號「紙背透匣」。 */
const JH_MZ_CROSS2_MAP=[
"###############",
"#######.>.#####",
"#######...#####",
"########D######",
"#T...........T#",
"#..Z.......Z..#",
"#.....EZE.....#",
"#C.Z....L...Z.#",
"####.#####.####",
"#..#.C#.#..#..#",
"#.##.##.##.##.#",
"#......P......#",
"#######.#######",
"######...######",
"#.....EZE.....#",
"#.............#",
"##.####.####.##",
"#..#...C...#..#",
"#..#.......#..#",
"#.###########.#",
"#T...........T#",
"#.....Z.Z.....#",
"#......@......#",
"###############"];
/* 上廳一個（第 6 列右半，被中間的紙架擋住只巡右半）、中廳兩個（第 14 列左右各半，隔著中間的紙架看對面）。中廳往上只開中間三格（第 13 列）：一定要從紙架旁邊的蒸氣口上去 */
const JH_MZ_CROSS2_GUARDS=[{kind:"steamcannon",x:13,y:6,dx:-1,dy:0},{kind:"steamcannon",x:1,y:14,dx:1,dy:0},{kind:"steamcannon",x:13,y:14,dx:-1,dy:0}];
/* 第 t 回合蒸氣噴不噴（奇數回合噴） */
const jhMzCross2On=t=>t%2===1;
/* 把地圖上每個蒸氣口照第 t 回合設成噴（e）或不噴（E） */
function jhMzCross2Sync(S,t){const on=jhMzCross2On(t);S.lv.map.forEach((r,y)=>{for(let x=0;x<r.length;x++)if(r[x]==="E"&&S.grid[y])S.grid[y][x]=on?"e":"E"})}
JH_MZ_KIND.steamcannon={
  /* 第一層護院的看法（隔一座紙架才看得到），碰到噴著的蒸氣就看不過去（蒸氣那一格也看不到） */
  sight(S,G){const o=[],R=G.range||6,F=G.fire||3,SC=(S.lv&&S.lv.screen)||"Z";
    for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let scr=false,k=0;
      for(let i=1;i<=R+F;i++){const x=G.x+dx*i,y=G.y+dy*i,c=jhMzCell(S,x,y);if(c===undefined||c==="e")break;
        if(!scr){if(SC.includes(c)){if(i>R)break;scr=true;continue}if(jhMzSolid(S,x,y))break;continue}
        if(jhMzSolid(S,x,y))break;o.push({x,y});if(++k>=F)break}}
    return o},
  /* 走法照第一層（跟車一樣沿直線來回）；走之前把蒸氣對到這一回合 */
  step(S,G){jhMzCross2Sync(S,S.turn);JH_MZ_KIND.rook.step(S,G)},
  look:{body:"#2c3e50",head:"#3b5068",eye:0xE24A3A}};
/* 走一步之前：蒸氣先對到「走完這一步」那一回合 */
function jhMzCross2Step(S,dx,dy,c){jhMzCross2Sync(S,S.turn+1);return null}
/* 3D：蒸氣口（地上一塊鐵柵）、噴著的蒸氣（一團白霧）；平面版各畫一格 */
if(!JH_MZ_OBJ.E)JH_MZ_OBJ.E=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.7,.04,.7),lam("#4a4a48"),0,.02,0));for(const a of[-.2,0,.2])g.add(mesh(new T3.BoxGeometry(.05,.06,.66),lam("#2a2a28"),a,.03,0));return g};
if(!JH_MZ_OBJ.e)JH_MZ_OBJ.e=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.CylinderGeometry(.42,.3,1.1,16),new T3.MeshBasicMaterial({color:0xe8ece8,transparent:true,opacity:.7}),0,.55,0));return g};
if(!JH_MZ_TILE.E)JH_MZ_TILE.E=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#4a4a48";cx.fillRect(px+T*.15,py+T*.15,T*.7,T*.7);cx.fillStyle="#2a2a28";for(const a of[.3,.5,.7])cx.fillRect(px+T*a-1,py+T*.15,2,T*.7)};
if(!JH_MZ_TILE.e)JH_MZ_TILE.e=(cx,px,py,T)=>{cx.fillStyle="#d8dcd8";cx.fillRect(px,py,T,T)};
/* ==JH_MZ_POOL:JH_MZ_POOL_CROSS2== */
const JH_MZ_POOL_CROSS2={door:[
{"id":"lk001c4","src":{"book":"爛柯神機","title":"八蠻獻寶"},"zh":["石門機關：炮牽制馬殺","門上刻著焙紙牆和一門炮、一匹馬。紅方先走，3 步將死黑方，門就會開。提示：炮先牽住，最後一步是馬將死。"],"en":["Stone door: cannon pins, horse mates","A drying wall with a cannon and a horse is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the cannon pins first; a horse gives the final mate."],"fen":"3kc1cn1/4P3N/9/9/9/3r5/9/4BC3/4p1p2/3p1K3","line":["f2f9","e9e2","f9h9","g9g8","i8g9"]},
{"id":"lk024c4","src":{"book":"爛柯神機","title":"單騎徇敵"},"zh":["石門機關：炮牽制馬殺","門上刻著焙紙牆和一門炮、一匹馬。紅方先走，3 步將死黑方，門就會開。提示：炮先牽住，最後一步是馬將死。"],"en":["Stone door: cannon pins, horse mates","A drying wall with a cannon and a horse is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the cannon pins first; a horse gives the final mate."],"fen":"3C1k3/4P4/4b3c/9/7N1/9/5C3/9/1np1pcr2/3K1n3","line":["h5f6","i7f7","f6d7","f7i7","d7e9"]},
{"id":"lk054c7","src":{"book":"爛柯神機","title":"功歸轉軸"},"zh":["石門機關：炮牽制馬殺","門上刻著焙紙牆和一門炮、一匹馬。紅方先走，3 步將死黑方，門就會開。提示：炮先牽住，最後一步是馬將死。"],"en":["Stone door: cannon pins, horse mates","A drying wall with a cannon and a horse is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the cannon pins first; a horse gives the final mate."],"fen":"3a1N3/8R/1NC2k3/4p4/9/9/6P2/9/2pp1pp2/r1c1K4","line":["f9h8","f7e7","h8g6","e7d7","b7c9"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CROSS2== */
/* ==JH_MZ_POOL:JH_MZ_POOL_CROSS2_TRAP== */
const JH_MZ_POOL_CROSS2_TRAP={door:[
],
trap:[
{"id":"lk009c7","src":{"book":"爛柯神機","title":"幣重言甘"},"zh":["被炮衛逮住了","炮衛把你押在焙紙牆邊，抽出一張寫了棋局的紙：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard holds you by the drying wall and pulls out a sheet with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"3a5/3P1kr2/5a3/9/9/9/5R3/5C3/2p2p3/rc1K5","line":["d8e8","f8f9","f3f7","g8f8","f7f8"]},
{"id":"lk017c6","src":{"book":"爛柯神機","title":"車馳兵奔"},"zh":["被炮衛逮住了","炮衛把你押在焙紙牆邊，抽出一張寫了棋局的紙：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard holds you by the drying wall and pulls out a sheet with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"6cC1/3k1Pn2/5a3/3P5/9/9/9/3pR4/2r1r4/3K1p3","line":["d6d7","d8d7","e2d2","d7e7","d2d7"]},
{"id":"lk020c5","src":{"book":"爛柯神機","title":"春風芳草"},"zh":["被炮衛逮住了","炮衛把你押在焙紙牆邊，抽出一張寫了棋局的紙：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard holds you by the drying wall and pulls out a sheet with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"7r1/8R/r4k3/9/6p2/6N2/6P2/5n3/4p4/3K5","line":["g4e5","f7e7","e5g6","e7f7","i8f8"]},
{"id":"lk033c5","src":{"book":"爛柯神機","title":"疊投巨餌"},"zh":["被炮衛逮住了","炮衛把你押在焙紙牆邊，抽出一張寫了棋局的紙：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard holds you by the drying wall and pulls out a sheet with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"3ak3C/4a2N1/3nb4/7C1/9/9/2R4r1/9/2nc1pp2/4K3c","line":["h8f7","e8f7","h6h9","e9e8","c3c8"]},
{"id":"lk037c8","src":{"book":"爛柯神機","title":"獨探驪珠"},"zh":["被炮衛逮住了","炮衛把你押在焙紙牆邊，抽出一張寫了棋局的紙：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard holds you by the drying wall and pulls out a sheet with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"2b2a3/4k4/3a5/3C5/9/3R1N3/9/5A1n1/1n2C1p2/crB2K3","line":["f4e6","c9e7","e6g7","e8f8","d4f4"]},
{"id":"lk084","src":{"book":"爛柯神機","title":"捐軀成義"},"zh":["被炮衛逮住了","炮衛把你押在焙紙牆邊，抽出一張寫了棋局的紙：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard holds you by the drying wall and pulls out a sheet with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"7C1/3k3C1/3a1P3/9/9/9/9/9/2nr1r3/1R2K4","line":["f7f8","d7e8","f8e8","d8d9","b0b9"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CROSS2_TRAP== */
jhMzLayer("cross_palace",2,{map:JH_MZ_CROSS2_MAP,guards:JH_MZ_CROSS2_GUARDS,solid:"#DZL",opaque:"#DLe",avoid:"Ee",onStep:jhMzCross2Step,
  pool:{door:JH_MZ_POOL_CROSS2.door,trap:JH_MZ_POOL_CROSS2_TRAP.trap},puz:{door:JH_MZ_POOL_CROSS2.door[0],trap:JH_MZ_POOL_CROSS2_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"過宮炮譜殘頁",en:"Cross-Palace Cannon manual page"},{k:"title",zh:"稱號「紙背透匣」",en:"Title: Through the back of the paper"}],
  lore:[{id:"cp4",kind:"doc",title:["論紙殘頁","A torn page on paper"],
    body:["殘頁談的是紙：好紙要細薄、光潤，造好之後要好好焙乾，才不會起皺、受潮。","The torn page is about paper: good paper should be thin, fine and lustrous, and once made it must be dried properly so it won't wrinkle or take damp."],
    src:"遊戲整理，據文震亨《長物志》談紙的一卷；殘頁本身是遊戲虛構"}],
  title:["🧻 烘焙暗道","🧻 Drying tunnels"],lvName:["烘焙暗道・第二層","Drying tunnels · Level 2"],
  intro:["石階往下，隔壁蒸料房的蒸氣從地上的鐵柵漏出來，一陣一陣地噴。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>蒸氣每兩回合噴一次</b>，自動走不會主動踩蒸氣口。",
    "Down the steps, steam from the next-door vat room leaks through iron grates in the floor in bursts. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>The steam bursts every other turn</b>; auto-walk won't step on a vent by itself."],
  warn:["<b>炮衛照炮的規矩看人：中間剛好隔一座紙架才看得到。</b>可是噴著的蒸氣擋住他的視線——算準蒸氣噴的那一回合，從他的火線上穿過去。",
    "<b>The cannon guards see like a cannon: only across exactly one paper rack.</b> But a burst of steam blocks their view, so time your crossing for the turn the steam is up."],
  say:{door:["將死！炮牽住，馬補上一刀，石門往兩旁滑開。","Checkmate! The cannon pins, the horse finishes, and the stone door slides apart."],trap:["將死！炮衛愣在原地，你趁機脫身。","Checkmate! The cannon guard freezes and you slip away."],
    dazed:["炮衛暈頭轉向，<b>四回合內</b>不會動。","The cannon guard is dazed and <b>won't move for four turns</b>."],
    dragged:["炮衛把你拖回入口，還把你最後撿到的東西丟回原來的箱子。","The cannon guard drags you back to the entrance and tosses your last find back into its chest."],
    retry:["你被拖回了入口。<b>看準蒸氣噴的那一回合，再從炮衛的火線上穿過去。</b>","You were dragged back. <b>Wait for the steam to burst, then cross the guard's line of fire.</b>"],
    locked:["石門被機關鎖住了。<b>先在暗道裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the tunnels first.</b>"],
    spot:["<b>炮衛隔著紙架看見你了！</b>趕快離開紅線——下一步還在紅線上就會被逮住。","<b>A cannon guard sees you across a rack!</b> Get off the red line now: if you are still on it next turn, you are caught."],
    done:["石階往下通到宣紙窖藏，第三層之後再開。","The steps lead down to the paper store. Level 3 opens later."]}});
