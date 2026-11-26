/* ---------- W87-2 屏風馬地底迷宮・第二層「斷陷神道」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的屏風馬門第二層，照 208 複核（iMac Claude 1）和開發者 11/26 的決定改：
     ・地裂深坑（V）：擋玩家、擋銅人的落點，可是「不擋馬腿」——銅人跳日字時，馬腿那一格是裂縫照樣跳得過去；玩家只能走裂縫上的石橋。
       裂縫很低，擋路不擋光（對面看得到）。石鼓（G）照第一層：擋路、擋馬腿、不擋光。
     ・銅人馬衛（JH_MZ_KIND.pithorse）：照第一層屏風馬銅人的巡法（照目前方向跳，不行就順時針換方向），只差在地裂不擋馬腿；
       看得到的＝下一步跳得到的落點（裂縫上不會有紅格，因為落不下去）。兩隻各巡一廳，都橫跨一條裂縫。
     ・機關殘局：雙馬聯攻（複核：「困馬」是困住對方的馬、不是將殺，改名），雙馬收尾優先（古譜裡扣掉第一層只剩 2 題雙馬，第 3 題是單馬）；被抓殘局一律殺題（開發者決定）。
       開發者 11/26 選單：不同派可以重用題目，只在同一派各層之間不重複（出題的 --exclude 只排除屏風馬自己的各層）。
     ・碑刻：遊戲整理，據《明太祖實錄》洪武二年詔以臨濠為中都（複核：可用）。
     ・寶箱：門派貢獻、屏風馬譜殘頁、頭像框「中都石獸」（外觀要出圖，出圖前先問開發者；這版先只記名字）。 */
const JH_MZ_SCREEN2_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#C..G.....G..C#",
"#.............#",
"#....G...G....#",
"#VVVV.VVVVV.VV#",
"#.............#",
"#..G...P...G..#",
"#....L........#",
"######.#.######",
"#T...........T#",
"#...G.....G...#",
"#C............#",
"#VVV.VVVVVVV.V#",
"#.............#",
"#......@......#",
"###############"];
/* 兩隻銅人馬衛：上廳（第 4～11 列，橫跨第 8 列裂縫）、下廳（第 13～18 列，橫跨第 16 列裂縫） */
const JH_MZ_SCREEN2_GUARDS=[{kind:"pithorse",x:7,y:6,dx:1,dy:2,zy:[4,11]},{kind:"pithorse",x:7,y:14,dx:-2,dy:1,zy:[13,18]}];
/* 銅人能不能從 (x,y) 往 (dx,dy) 跳：落點要在自己那一廳、不擋路（地裂、石鼓、牆都落不下去）；馬腿被擋路的東西擋住就跳不過去——地裂除外；玩家站在馬腿上也跳不過去 */
function jhMzScreen2Can(S,x,y,dx,dy,G){const L=jhMzHorseLeg(x,y,dx,dy),P=S.player,ty=y+dy;
  if(G&&G.zy&&(ty<G.zy[0]||ty>G.zy[1]))return false;
  if(jhMzSolid(S,L.x,L.y)&&jhMzCell(S,L.x,L.y)!=="V")return false;if(P&&P.x===L.x&&P.y===L.y)return false;return !jhMzSolid(S,x+dx,ty)}
JH_MZ_KIND.pithorse={
  sight(S,G){const o=[];for(const[dx,dy]of JH_MZ_HORSE_DIR)if(jhMzScreen2Can(S,G.x,G.y,dx,dy,G))o.push({x:G.x+dx,y:G.y+dy});return o},
  step(S,G){let i=JH_MZ_HORSE_DIR.findIndex(([a,b])=>a===(G.dx||1)&&b===(G.dy||-2));if(i<0)i=0;
    for(let k=0;k<8;k++){const[dx,dy]=JH_MZ_HORSE_DIR[(i+k)%8];if(jhMzScreen2Can(S,G.x,G.y,dx,dy,G)){G.x+=dx;G.y+=dy;G.dx=dx;G.dy=dy;return}}},
  look:{body:"#5a6b5e",head:"#6d7f70",eye:0xE24A3A}};
/* 3D：地裂（地面上一道黑色的深縫，邊緣碎石）；平面版：黑色的縫 */
if(!JH_MZ_OBJ.V)JH_MZ_OBJ.V=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,.02,1),new T3.MeshBasicMaterial({color:0x050505}),0,-.01,0));
  g.add(mesh(new T3.BoxGeometry(1,.06,.12),lam("#6a6258"),0,.03,-.45));g.add(mesh(new T3.BoxGeometry(1,.06,.12),lam("#6a6258"),0,.03,.45));return g};
if(!JH_MZ_TILE.V)JH_MZ_TILE.V=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#050505";cx.fillRect(px+T*.12,py+T*.12,T*.76,T*.76)};
/* ==JH_MZ_POOL:JH_MZ_POOL_SCREEN2== */
const JH_MZ_POOL_SCREEN2={door:[
{"id":"sq091c5","src":{"book":"適情雅趣","title":"六國抗秦"},"zh":["石門機關：雙馬聯攻","門上刻著神道兩側的一對石馬。紅方先走，3 步將死黑方，門就會開。提示：兩匹馬要互相照應，最後一步是馬將死。"],"en":["Stone door: the two horses together","The pair of stone horses from the spirit road is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the two horses cover each other; a horse gives the final mate."],"fen":"2b1R4/3k1rNn1/1n2b4/9/2p3p2/1NB1C4/9/4B4/1r1p5/c3KC3","line":["b4c6","d8d7","e9d9","b7d8","c6e5"]},
{"id":"ys095","src":{"book":"淵深海闊","title":"囊沙阻水"},"zh":["石門機關：雙馬聯攻","門上刻著神道兩側的一對石馬。紅方先走，3 步將死黑方，門就會開。提示：兩匹馬要互相照應，最後一步是馬將死。"],"en":["Stone door: the two horses together","The pair of stone horses from the spirit road is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the two horses cover each other; a horse gives the final mate."],"fen":"3k1a2N/4a4/2n5r/N2C1P3/9/C8/9/3A1c3/3pAr1n1/4K3c","line":["a6c7","i7c7","a4d4","d9e9","i9g8"]},
{"id":"jc099c4","src":{"book":"橘中秘","title":"馬兵攻雙士炮卒"},"zh":["石門機關：雙馬聯攻","門上刻著神道兩側的一對石馬。紅方先走，3 步將死黑方，門就會開。提示：兩匹馬要互相照應，最後一步是馬將死。"],"en":["Stone door: the two horses together","The pair of stone horses from the spirit road is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the two horses cover each other; a horse gives the final mate."],"fen":"3ak1P2/3ca4/9/5N3/9/9/9/p8/9/4K4","line":["f6g4","a2a1","g4h6","a1a0","h6f7"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SCREEN2== */
/* ==JH_MZ_POOL:JH_MZ_POOL_SCREEN2_TRAP== */
const JH_MZ_POOL_SCREEN2_TRAP={door:[
],
trap:[
{"id":"sq187c7","src":{"book":"適情雅趣","title":"螢惑退舍"},"zh":["被銅人馬衛撞倒了","銅人馬衛把你撞倒在裂縫邊，石座上刻著一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by a bronze horse","The bronze horse knocks you down by a crack. A chess problem is carved on its plinth: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"1C1ac2R1/R3ak3/4r4/4N4/9/9/9/5p3/4p4/5K3","line":["a8e8","d9e8","h9h8","f8f7","e6g5"]},
{"id":"sq192","src":{"book":"適情雅趣","title":"兩地關心"},"zh":["被銅人馬衛撞倒了","銅人馬衛把你撞倒在裂縫邊，石座上刻著一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by a bronze horse","The bronze horse knocks you down by a crack. A chess problem is carved on its plinth: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"2bak3C/4aP2N/4b4/5C3/9/9/9/3p5/4p2r1/3K5","line":["i8g9","e8f9","f6e6","d9e8","g9h7"]},
{"id":"sq197c4","src":{"book":"適情雅趣","title":"投命仇門"},"zh":["被銅人馬衛撞倒了","銅人馬衛把你撞倒在裂縫邊，石座上刻著一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by a bronze horse","The bronze horse knocks you down by a crack. A chess problem is carved on its plinth: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"2b1kc1NC/4a4/9/9/9/9/8P/6n1B/3R5/4KA2r","line":["h9g7","f9f8","d1d9","e9d9","g7f9"]},
{"id":"sq207c8","src":{"book":"適情雅趣","title":"菱葉穿萍"},"zh":["被銅人馬衛撞倒了","銅人馬衛把你撞倒在裂縫邊，石座上刻著一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by a bronze horse","The bronze horse knocks you down by a crack. A chess problem is carved on its plinth: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"2bk3C1/3na4/3a1N3/4C4/1n6r/9/9/3p5/4p4/3K5","line":["f7e9","e8f9","e9d7","f9e8","d7b8"]},
{"id":"sq221c7","src":{"book":"適情雅趣","title":"野馬舞風"},"zh":["被銅人馬衛撞倒了","銅人馬衛把你撞倒在裂縫邊，石座上刻著一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by a bronze horse","The bronze horse knocks you down by a crack. A chess problem is carved on its plinth: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"5a3/4a2C1/3k4b/9/3N2b2/1r7/9/2C6/4p3r/c4K3","line":["c2d2","b4d4","d5f6","d7e7","f6g8"]},
{"id":"sq307c8","src":{"book":"適情雅趣","title":"寬一步勝"},"zh":["被銅人馬衛撞倒了","銅人馬衛把你撞倒在裂縫邊，石座上刻著一局棋：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Knocked down by a bronze horse","The bronze horse knocks you down by a crack. A chess problem is carved on its plinth: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"1Rb1k1C2/4a4/3a2N2/6p2/2p3n2/9/9/4n4/4Ac3/5K3","line":["b9c9","e8d9","c9d9","e9d9","g7f9"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SCREEN2_TRAP== */
jhMzLayer("screen",2,{map:JH_MZ_SCREEN2_MAP,guards:JH_MZ_SCREEN2_GUARDS,solid:"#DGVL",opaque:"#DL",
  pool:{door:JH_MZ_POOL_SCREEN2.door,trap:JH_MZ_POOL_SCREEN2_TRAP.trap},puz:{door:JH_MZ_POOL_SCREEN2.door[0],trap:JH_MZ_POOL_SCREEN2_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"屏風馬譜殘頁",en:"Screen Horses manual page"},{k:"frame",zh:"頭像框「中都石獸」",en:"Avatar frame: Zhongdu stone beast"}],
  lore:[{id:"sm4",kind:"doc",title:["中都詔書抄本","Copy of the Zhongdu edict"],
    body:["抄本寫著：洪武二年，朝廷下詔以臨濠為中都，照京城的規制營建皇城。工匠、軍士從各地調來，日夜不停，勞役很重。皇陵前的神道，也是那幾年一起修的。",
      "The copy records that in the second year of Hongwu the court decreed Linhao the Middle Capital and ordered a palace city built there on the capital's plan. Craftsmen and soldiers were brought in from everywhere and worked day and night; the labour was heavy. The spirit road before the imperial tombs was built in the same years."],
    src:"遊戲整理，據《明太祖實錄》洪武二年以臨濠為中都；抄本本身是遊戲虛構"}],
  title:["🗿 斷陷神道","🗿 Collapsed spirit road"],lvName:["斷陷神道・第二層","Collapsed spirit road · Level 2"],
  intro:["石階往下，神道的地面裂開好幾道深縫，只剩幾座石橋連著。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>裂縫走不過去，要找石橋。</b>",
    "Down the steps, the spirit road has split into deep cracks with only a few stone bridges across. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>You can't cross a crack: find a bridge.</b>"],
  warn:["<b>銅人馬衛照馬走日字，裂縫擋不住牠的馬腿</b>——牠跨得過裂縫，你只能走橋。紅格是牠下一步跳得到的地方；裂縫上落不下去，所以裂縫旁邊比較安全。石鼓照樣蹩得住馬腿。",
    "<b>The bronze horse guards jump like a horse, and a crack doesn't block their leg:</b> they can leap a crack, you can only use a bridge. The red squares are where they can land next; they can't land on a crack, so squares beside one are safer. A stone drum still blocks the leg."],
  say:{door:["將死！雙馬聯手，石門往兩旁滑開。","Checkmate! The two horses close in together and the stone door slides apart."],trap:["將死！銅人馬衛僵在原地，你趁機溜走。","Checkmate! The bronze horse freezes and you slip away."],
    retry:["你被拖回了入口。<b>銅人落不到裂縫上：貼著裂縫走，或站在牠的馬腿上。</b>","You were dragged back. <b>The horse can't land on a crack: keep beside one, or stand on its leg.</b>"],
    locked:["石門被機關鎖住了。<b>先在神道裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere on the spirit road first.</b>"],
    done:["石階往下通到祭壇，第三層之後再開。","The steps lead down to the altar. Level 3 opens later."]}});
