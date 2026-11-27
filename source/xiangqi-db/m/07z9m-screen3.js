/* ---------- W87-3 屏風馬門地底迷宮・第三層「鎮皇祭壇」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：208 號補件的屏風馬門第三層，照 207、208 複核和開發者 11/26 的決定改：
     ・轉向石鼓（U，208 複核⑧「凸起佔哪一格要寫清楚」）：石鼓本身佔一格（擋路、不擋光）；鼓側有一塊凸起，朝東南西北其中一邊，
       凸起蓋住的是石鼓旁邊那一格的地面——那一格人照樣能走、馬也照樣能落，但當馬腿時算被蹩住（跟第一層的石鼓、玩家站在馬腿一樣）。
       往石鼓走＝把它順時針轉 90 度（凸起換到下一邊），花一回合、人留在原地；石鼓朝哪記在 S.drum3（被拖回入口時不變：轉過的還是那個方向）。
     ・連環馬衛（JH_MZ_KIND.linkhorse，208 複核⑧「蹩斷連繫要說清楚」）：兩隻馬衛用鐵鍊連著，每一回合一起往「同一個方向」跳，
       選方向照順時針找「兩隻都跳得過去」的那一個；其中一隻的馬腿被凸起蹩住，那個方向兩隻都不能跳，只好一起換方向（＝蹩斷連繫，整組的巡邏路線跟著改）。
       看得到的格子照第一層馬衛（下一步跳得到的日字落點，被蹩住的方向就沒有）。
     ・機關殘局：雙馬飲泉，馬收尾的三步殺；被抓殘局一律殺題（開發者決定），不用炮、車收尾，第三層可以用到四步殺。
     ・碑刻：遊戲整理，據朱元璋《御製皇陵碑》（208 複核②：這塊碑寫的是他小時候家裡遭災、父母病死沒地方葬，不是罷中都的事）。
     ・寶箱：門派貢獻、古譜殘頁、收藏品「殘局銅盤」（只記在迷宮裡，跟第一層的寶箱一樣，不用出圖）。
     ・修為 +60、去重鍵 maze:screen:3（jhMzLayer 照開發者決定給）。配樂照第一層同一首。 */
const JH_MZ_SCREEN3_MAP=[
"###############",
"######.>.######",
"######...######",
"#######D#######",
"#T..L........T#",
"#.###.#.#.###.#",
"#C..#.....#..C#",
"##.##.d.d.##.##",
"#.............#",
"#.###.d.d.###.#",
"#P..#.....#..C#",
"###.###.###.###",
"#.............#",
"#......@......#",
"###############"];
/* 石鼓的凸起朝哪：0 北、1 東、2 南、3 西（一開始都朝北） */
const JH_MZ_SCREEN3_DIR=[[0,-1],[1,0],[0,1],[-1,0]];
const JH_MZ_SCREEN3_DRUM0={"6,7":0,"8,7":0,"6,9":2,"8,9":2};
const jhMzScreen3Drum=S=>S.drum3||(S.drum3=Object.assign({},JH_MZ_SCREEN3_DRUM0));
/* 這一格有沒有被石鼓的凸起蓋住 */
function jhMzScreen3Bump(S,x,y){const D=jhMzScreen3Drum(S);for(const k in D){if(jhMzCell(S,...k.split(",").map(Number))!=="d")continue;const[a,b]=k.split(",").map(Number),d=JH_MZ_SCREEN3_DIR[D[k]];if(a+d[0]===x&&b+d[1]===y)return true}return false}
/* 馬衛往 (dx,dy) 跳得過去嗎：照第一層（馬腿擋路、玩家站在馬腿、落點擋路都不行），再加上馬腿被凸起蓋住也不行 */
function jhMzScreen3Can(S,x,y,dx,dy,G){const L=jhMzHorseLeg(x,y,dx,dy);if(jhMzScreen3Bump(S,L.x,L.y))return false;return jhMzHorseCan(S,x,y,dx,dy,G)}
const JH_MZ_SCREEN3_GUARDS=[{kind:"linkhorse",x:5,y:8,dx:1,dy:-2},{kind:"linkhorse",x:9,y:8,dx:1,dy:-2}];
JH_MZ_KIND.linkhorse={
  sight(S,G){const o=[];for(const[dx,dy]of JH_MZ_HORSE_DIR)if(jhMzScreen3Can(S,G.x,G.y,dx,dy,G))o.push({x:G.x+dx,y:G.y+dy});return o},
  /* 一組裡第一隻醒著的負責選方向、帶著整組一起跳；其他隻這一回合不再自己動。暈著的不跟（也不擋方向） */
  step(S,G){const A=(S.guards||[]).filter(H=>H.kind==="linkhorse"&&!(H.stun>0));if(A[0]!==G)return;
    let i=JH_MZ_HORSE_DIR.findIndex(([a,b])=>a===(G.dx||1)&&b===(G.dy||-2));if(i<0)i=0;
    for(let k=0;k<8;k++){const[dx,dy]=JH_MZ_HORSE_DIR[(i+k)%8];
      if(A.every(H=>jhMzScreen3Can(S,H.x,H.y,dx,dy,H)&&!A.some(J=>J!==H&&J.x===H.x+dx&&J.y===H.y+dy))){for(const H of A){H.x+=dx;H.y+=dy;H.dx=dx;H.dy=dy}return}}},
  look:{body:"#5a6b5e",head:"#6d7f70",eye:0xE24A3A}};
/* 往石鼓走：順時針轉 90 度，花一回合（照「原地等一回合」的共用規則：守衛走、先提醒再抓），人不動 */
function jhMzScreen3Turn(S,dx,dy,c){if(c!=="d"||(!dx&&!dy))return null;const P=S.player,k=(P.x+dx)+","+(P.y+dy),D=jhMzScreen3Drum(S);D[k]=((D[k]||0)+1)%4;
  const r=jhMzStep(S,0,0),N=["北","東","南","西"][D[k]],E=["north","east","south","west"][D[k]];
  if(r.ev==="move")Object.assign(r,{msg:[`你推著石鼓轉了一下，凸起轉到<b>${N}邊</b>，蓋住旁邊那一格當馬腿的地方。`,`You turn the stone drum; its knob now faces <b>${E}</b>, covering the square beside it where a horse's leg would go.`]});
  return r}
/* 3D：照第一層的石鼓（JH_MZ_OBJ.G）再加一塊凸起（3D 版凸起不轉，轉的時候用文字說朝哪）；平面版：圓鼓＋一塊指向凸起那一邊的方塊 */
if(!JH_MZ_OBJ.d)JH_MZ_OBJ.d=H=>{const{T3,mesh,lam}=H,g=JH_MZ_OBJ.G?JH_MZ_OBJ.G(H):new T3.Group();g.add(mesh(new T3.BoxGeometry(.22,.2,.22),lam("#5f645c"),0,.1,-.44));return g};
if(!JH_MZ_TILE.d)JH_MZ_TILE.d=(cx,px,py,T,S,x,y)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#7b8077";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.34,0,Math.PI*2);cx.fill();
  const i=S&&S.drum3&&S.drum3[x+","+y],d=JH_MZ_SCREEN3_DIR[i==null?(JH_MZ_SCREEN3_DRUM0[x+","+y]||0):i];cx.fillStyle="#5f645c";cx.fillRect(px+T/2+d[0]*T*.36-T*.12,py+T/2+d[1]*T*.36-T*.12,T*.24,T*.24)};
/* ==JH_MZ_POOL:JH_MZ_POOL_SCREEN3== */
const JH_MZ_POOL_SCREEN3={door:[
{"id":"lk107c6","src":{"book":"爛柯神機","title":"馬躍檀溪"},"zh":["石門機關：雙馬飲泉","門上刻著兩匹石馬低頭飲水。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: two horses at the spring","Two stone horses drinking with lowered heads are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"9/1r2k4/4b2N1/9/6b2/9/9/4N4/2p1C2n1/3K2Br1","line":["e2f4","e7g9","f4e6","g5e7","e6c7"],"alt":{"e2f4":["e7g9",{"f4e6":["g5e7",{"e6c7":0}]}],"e2c3":["e7c5",{"c3e4":["c5e7",{"e4f6":0}]}],"e2g3":["e7c5",{"g3e4":["c5e7",{"e4f6":0}]}]}},
{"id":"lk129c7","src":{"book":"爛柯神機","title":"千里雙龍"},"zh":["石門機關：雙馬飲泉","門上刻著兩匹石馬低頭飲水。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: two horses at the spring","Two stone horses drinking with lowered heads are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"4k4/4a4/9/2N1N4/9/9/4C4/r2p5/4p1p2/5K3","line":["e6c7","e8f9","c6e7","f9e8","e7g8"],"alt":{"e6c7":["e8f9",{"c6e7":["f9e8",{"e7g8":0}]}],"e6g5":["e8d7",{"g5f7":["e9d9",{"c6b8":0}]}]}},
{"id":"lk203c7","src":{"book":"爛柯神機","title":"玄機善轉"},"zh":["石門機關：雙馬飲泉","門上刻著兩匹石馬低頭飲水。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: two horses at the spring","Two stone horses drinking with lowered heads are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"4k4/4a4/9/4N1N2/9/9/4C4/9/r1r1p4/3K5","line":["e6g7","e8f9","g6e7","f9e8","e7c8"],"alt":{"e6g7":["e8f9",{"g6e7":["f9e8",{"e7c8":0}]}],"e6c5":["e8d7",{"c5d7":["e9d9",{"e3d3":0}]}]}}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SCREEN3== */
/* ==JH_MZ_POOL:JH_MZ_POOL_SCREEN3_TRAP== */
const JH_MZ_POOL_SCREEN3_TRAP={door:[
],
trap:[
{"id":"lk035c4","src":{"book":"爛柯神機","title":"獨具爐錘"},"zh":["被馬衛逮住了","兩隻馬衛把你夾在石鼓中間：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the horse guards","The horse guards pin you between the drums: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3k3C1/1P4P2/4bN2b/4P4/9/9/9/5p3/3cp4/3p1K3","line":["f7g9","d9d8","b8c8","d8d7","e6d6"]},
{"id":"lk048c6","src":{"book":"爛柯神機","title":"峯蠆肆毒"},"zh":["被馬衛逮住了","兩隻馬衛把你夾在石鼓中間：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the horse guards","The horse guards pin you between the drums: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"1C3k3/4a1c2/3N5/6P2/9/9/9/3pBC3/2p1r4/3K2R2","line":["g6f6","e8f7","f6f7","g8f8","f7f8"],"alt":{"g6f6":["e8f7",{"f6f7":["g8f8",{"f7f8":0,"d7c9":0,"g0g9":0}],"d7c9":["f9f8",{"g0g8":0}]}]}},
{"id":"lk058c5","src":{"book":"爛柯神機","title":"海底藏珍"},"zh":["被馬衛逮住了","兩隻馬衛把你夾在石鼓中間：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the horse guards","The horse guards pin you between the drums: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"9/4aR3/2Nak4/2p2P3/9/9/9/3K2p1B/1p1r5/2p2p3","line":["d2d1","b1c1","d1d2","c0b0","f6e6"]},
{"id":"lk104c4","src":{"book":"爛柯神機","title":"馬首是瞻"},"zh":["被馬衛逮住了","兩隻馬衛把你夾在石鼓中間：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the horse guards","The horse guards pin you between the drums: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"4k1c2/2P1a1n2/b3P4/3r5/9/6BC1/4P4/9/4C1p2/r2p1K3","line":["e7e8","e9d9","h4h9","g8e9","e8e9"]},
{"id":"lk137c6","src":{"book":"爛柯神機","title":"巧用連環-(連環形)"},"zh":["被馬衛逮住了","兩隻馬衛把你夾在石鼓中間：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the horse guards","The horse guards pin you between the drums: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"9/4k4/3R1P3/6p2/2P6/4n4/3C1p3/2p3r2/3p1p3/4K4","line":["d7e7","e8d8","c5d5","e4d6","d5d6"]},
{"id":"lk141c5","src":{"book":"爛柯神機","title":"屈乘假道"},"zh":["被馬衛逮住了","兩隻馬衛把你夾在石鼓中間：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the horse guards","The horse guards pin you between the drums: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"C1bak4/3R5/5cr2/9/4P4/9/9/9/2r1p4/3K5","line":["d8d9","e9e8","d9d8","e8e7","e5e6"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SCREEN3_TRAP== */
jhMzLayer("screen",3,{map:JH_MZ_SCREEN3_MAP,guards:JH_MZ_SCREEN3_GUARDS,solid:"#DGdL",opaque:"#DL",onStep:jhMzScreen3Turn,
  pool:{door:JH_MZ_POOL_SCREEN3.door,trap:JH_MZ_POOL_SCREEN3_TRAP.trap},puz:{door:JH_MZ_POOL_SCREEN3.door[0],trap:JH_MZ_POOL_SCREEN3_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"古譜殘頁",en:"Old manual page"},{k:"relic",zh:"收藏品「殘局銅盤」",en:"Keepsake: the bronze endgame tray"}],
  lore:[{id:"sh5",kind:"stele",title:["皇陵碑","The imperial tomb stele"],
    body:["碑文是朱元璋自己寫的，講他小時候的事：家鄉遭了旱災和蝗災，父母和兄長接連病死，家裡窮得連葬地都沒有，靠鄰人給了一塊地才下葬。後來他在這裡為父母修了皇陵。",
      "Zhu Yuanzhang wrote this inscription himself about his boyhood: drought and locusts struck his home, his parents and elder brother fell ill and died one after another, and the family was too poor even to own a grave plot until a neighbour gave them one. Years later he built the imperial tomb here for his parents."],
    src:"遊戲整理，據朱元璋《御製皇陵碑》；碑在鳳陽明皇陵，這裡的碑是遊戲虛構的仿刻"}],
  title:["🗿 鎮皇祭壇","🗿 Altar of the imperial tomb"],lvName:["鎮皇祭壇・第三層","Altar of the imperial tomb · Level 3"],
  intro:["石階通到神道底下的祭壇，地上立著幾個帶凸起的石鼓。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>往石鼓走就會把它轉 90 度</b>，凸起蓋住的那一格，馬衛當馬腿就會被蹩住。",
    "The steps lead to an altar beneath the spirit way, where stone drums with a jutting knob stand on the floor. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Walk into a drum to turn it a quarter turn</b>: a horse whose leg would pass over the square under the knob is blocked."],
  warn:["<b>兩隻銅人馬衛用鐵鍊連著，每回合一起往同一個方向跳。</b>紅點是牠們下一步跳得到的地方。轉石鼓蹩住其中一隻的馬腿，兩隻就都得換方向。",
    "<b>Two bronze horse guards are chained together and leap the same way every turn.</b> The red dots are where they can land next. Turn a drum to block one horse's leg, and both must change direction."],
  say:{door:["將死！雙馬一前一後收網，石門轟隆一聲往上收。","Checkmate! The two horses close the net and the stone door rumbles open."],trap:["將死！馬衛愣在原地，你趁機脫身。","Checkmate! The horse guards freeze and you slip away."],
    dazed:["馬衛暈頭轉向，<b>四回合內</b>不會動。","The horse guard is dazed and <b>won't move for four turns</b>."],
    dragged:["馬衛把你拖回入口，還把你最後撿到的東西丟回原來的箱子。","The horse guards drag you back to the entrance and toss your last find back into its chest."],
    retry:["你被拖回了入口。<b>先轉石鼓蹩住馬腿，讓兩隻馬衛換條路線，再過去。</b>","You were dragged back. <b>Turn a drum to block a leg so the chained horses change course, then cross.</b>"],
    locked:["石門被機關鎖住了。<b>先在祭壇裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere around the altar first.</b>"],
    spot:["<b>馬衛轉過頭來看見你了！</b>趕快離開紅點——下一步還在紅點上就會被逮住。","<b>A horse guard turns and spots you!</b> Get off the red dots now: if you are still on one next turn, you are caught."],
    done:["三層都走完了，神道底下已經走到盡頭。","All three levels are done: this is the very bottom of the spirit way."]}});
