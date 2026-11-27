/* ---------- W87-3 過宮炮門地底迷宮・第三層「宣紙窖藏」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：208 號補件的過宮炮門第三層，照 207、208 複核和開發者 11/26 的決定改：
     ・油布（h）：208 複核②「掀油布變永久直線光源」跟仕角炮銅鏡、列炮冷光柱重複，「炮衛盯著光看」又像順炮第二層，照建議改成「掀開只照亮四周 3 格（跟壁燈一樣），炮衛的行為照舊」。
       走道上垂著的油布，對炮衛來說就是一個子（跟第一層的紙架 Z 一樣當炮架）：炮衛隔著油布看得到後面 3 格。
       往油布走＝把它掀起來捲到梁上：花一回合、人留在原地（照「原地等一回合」的共用規則），那一格變成空地、照亮四周 3 格（記在 S.lit，跟壁燈一樣）——炮架沒了，那條線就安全了。
       被抓拖回入口時，油布照共用規則垂回原位。
     ・雙炮衛交錯：兩個第一層的炮衛（JH_MZ_KIND.cannon，隔一子才看得到）在上下兩條走道交錯巡。
     ・機關殘局：208 複核⑥「殺題集中在雙馬」，改成炮作掩護、兵收尾的三步殺；被抓殘局一律殺題（開發者決定），不用炮、車收尾，第三層可以用到四步殺。
     ・碑刻（208 複核②：原稿跟第一層 cp1 重複）：遊戲整理，講涇縣用青檀皮和沙田稻草造紙，不引原文。
     ・寶箱：門派貢獻、古譜殘頁、收藏品「仿澄心堂紙殘卷」（208 複核：澄心堂紙是南唐名紙，到晚明只有仿製）。
       外觀照複核改成「竹簾焙紙棋盤」（原稿「玉版宣紙棋」跟第一層的宣紙水墨棋子重複），要出圖，出圖前要先問開發者；這一版先用古譜殘頁佔位。
     ・修為 +60、去重鍵 maze:cross_palace:3（jhMzLayer 照開發者決定給）。配樂照第一層同一首。 */
const JH_MZ_CROSS3_MAP=[
"###############",
"######.>.######",
"######...######",
"#######D#######",
"#T..L........T#",
"###.#######.###",
"#.....h.......#",
"###.#######.###",
"#C...........C#",
"###.#######.###",
"#.......h.....#",
"###.#######.###",
"#P...........C#",
"#######.#######",
"#......@......#",
"###############"];
/* 兩個炮衛：上面的走道（第 6 列）從右往左，下面的走道（第 10 列）從左往右 */
const JH_MZ_CROSS3_GUARDS=[{kind:"cannon",x:13,y:6,dx:-1,dy:0},{kind:"cannon",x:1,y:10,dx:1,dy:0}];
/* 往油布走：掀起來（變空地、照亮四周）、花一回合、人不動 */
function jhMzCross3Lift(S,dx,dy,c){if(c!=="h"||(!dx&&!dy))return null;const P=S.player,x=P.x+dx,y=P.y+dy;S.grid[y][x]=".";S.lit.add(y*S.W+x);
  const r=jhMzStep(S,0,0);if(r.ev==="move")r.msg=["你把油布掀起來捲到梁上，焙牆的火光透了出來——<b>炮衛少了這個炮架，隔著它就看不到了。</b>","You roll the oilcloth up onto the beam and the drying-wall fire shines through: <b>without it as a screen, the cannon guards can no longer see past that spot.</b>"];
  return r}
/* 3D：垂掛的油布（黃褐色半透明布幔）；平面版：黃褐色布條 */
if(!JH_MZ_OBJ.h)JH_MZ_OBJ.h=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.86,.86,.05),new T3.MeshLambertMaterial({color:0x9a7a3a,transparent:true,opacity:.85}),0,.45,0));return g};
if(!JH_MZ_TILE.h)JH_MZ_TILE.h=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="rgba(154,122,58,.85)";cx.fillRect(px+T*.1,py,T*.8,T);cx.strokeStyle="#5a4520";cx.lineWidth=1.5;cx.strokeRect(px+T*.1,py,T*.8,T)};
/* ==JH_MZ_POOL:JH_MZ_POOL_CROSS3== */
const JH_MZ_POOL_CROSS3={door:[
{"id":"lk204c6","src":{"book":"爛柯神機","title":"雪夜擒濟"},"zh":["石門機關：炮掩兵進","門上刻著一門炮架在紙架後面，兵卒往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: the cannon covers, the pawn advances","A cannon set behind a paper rack, with pawns pushing forward, is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"3k1c3/3nP4/4R3b/9/9/9/9/2pK5/2p2p3/7C1","line":["d2e2","d8b7","e7d7","b7d8","e8d8"],"alt":{"d2e2":["d8b7",{"e7d7":["b7d8",{"e8d8":0,"d7d8":0,"e8e9":0}]}]}},
{"id":"lk229c5","src":{"book":"爛柯神機","title":"誘鹿入蕉"},"zh":["石門機關：炮掩兵進","門上刻著一門炮架在紙架後面，兵卒往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: the cannon covers, the pawn advances","A cannon set behind a paper rack, with pawns pushing forward, is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"5k3/3P2P2/c1Pa1P3/4C4/6b2/9/9/9/3p1Kp2/4p4","line":["f1f2","e0d0","f7f8","f9e9","f8f9"],"alt":{"f1f2":["e0d0",{"f7f8":["f9e9",{"f8f9":0,"f8e8":0}],"d8d9":["a7a0",{"e6f6":0,"f7f8":0,"g8f8":0,"g8g9":0}],"d8e8":["a7a0",{"e6f6":0,"f7f8":0,"g8f8":0,"g8g9":0}]}]}},
{"id":"mr002","src":{"book":"夢入神機","title":"弋不射宿"},"zh":["石門機關：炮掩兵進","門上刻著一門炮架在紙架後面，兵卒往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: the cannon covers, the pawn advances","A cannon set behind a paper rack, with pawns pushing forward, is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"3akab2/Rc1Pn4/7C1/6pN1/1r7/9/9/9/2pC5/3K2B1r","line":["h7e7","e8g7","h6g8","b8g8","d8e8"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CROSS3== */
/* ==JH_MZ_POOL:JH_MZ_POOL_CROSS3_TRAP== */
const JH_MZ_POOL_CROSS3_TRAP={door:[
],
trap:[
{"id":"mr003","src":{"book":"夢入神機","title":"存沒無累"},"zh":["被炮衛逮住了","炮衛把你押在紙窖的木架旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the paper racks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2RNk4/9/1N7/9/1n7/9/C7r/9/2c1p4/2c2K3","line":["d9c7","c1c9","a3a9","c9c8","b7c9"]},
{"id":"mr008c4","src":{"book":"夢入神機","title":"潛魚戀藻"},"zh":["被炮衛逮住了","炮衛把你押在紙窖的木架旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the paper racks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"5k1N1/4a4/4Pa3/9/9/5n3/5C3/3A1p3/3p5/5K3","line":["e7e8","f2f1","f0f1","d1d0","h9g7"]},
{"id":"mr068c5","src":{"book":"夢入神機","title":"周旋中矩"},"zh":["被炮衛逮住了","炮衛把你押在紙窖的木架旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the paper racks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"5a3/6C2/3k1a3/p1N6/9/9/9/8B/4K1ppc/3p5","line":["g8a8","g1f1","e1e2","d0c0","c6b8"],"alt":{"g8a8":["g1f1",{"e1e2":["d0c0",{"c6b8":0}]}],"e1e2":["a6a5",{"g8a8":["a5a4",{"c6b8":0}]}]}},
{"id":"mr073c4","src":{"book":"夢入神機","title":"老當益壯"},"zh":["被炮衛逮住了","炮衛把你押在紙窖的木架旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the paper racks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2P5C/3ka4/3N1a3/3R5/9/9/9/3n1p3/r3p4/5K3","line":["d7f8","e8d7","i9i8","f7e8","f8e6"]},
{"id":"mr075c4","src":{"book":"夢入神機","title":"並轡朝闕"},"zh":["被炮衛逮住了","炮衛把你押在紙窖的木架旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the paper racks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3a5/c1r1ak1N1/b1N6/9/6b2/9/5C3/4Bp3/4p3r/5K3","line":["c7e6","g5e7","h8f7","f8f7","e6f4"]},
{"id":"mr088c5","src":{"book":"夢入神機","title":"遊魚翻藻"},"zh":["被炮衛逮住了","炮衛把你押在紙窖的木架旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a cannon guard","The cannon guard pins you by the paper racks: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"4k4/5RN2/3ab4/9/9/9/9/5C3/3p1p3/2p1K4","line":["f8d8","e9f9","d8d9","f9f8","g8f6"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CROSS3_TRAP== */
jhMzLayer("cross_palace",3,{map:JH_MZ_CROSS3_MAP,guards:JH_MZ_CROSS3_GUARDS,solid:"#DZL",opaque:"#DL",screen:"Zh",onStep:jhMzCross3Lift,
  pool:{door:JH_MZ_POOL_CROSS3.door,trap:JH_MZ_POOL_CROSS3_TRAP.trap},puz:{door:JH_MZ_POOL_CROSS3.door[0],trap:JH_MZ_POOL_CROSS3_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"古譜殘頁",en:"Old manual page"},{k:"relic",zh:"收藏品「仿澄心堂紙殘卷」",en:"Keepsake: a scrap of imitation Chengxintang paper"}],
  lore:[{id:"cp5",kind:"stele",title:["紙窖碑","The paper cellar stele"],
    body:["碑上記著涇縣造紙的門道：剝青檀樹皮、配上沙田長的稻草，反覆蒸煮、日曬漂白，再撈成一張張濕紙，貼到燒熱的焙牆上烘乾。好紙要藏在乾燥的窖裡慢慢放，放得越久越好用。",
      "The stele records how paper was made at Jingxian: blue sandalwood bark was stripped and mixed with straw from sandy rice fields, steamed and sun-bleached over and over, then lifted out sheet by sheet and pressed onto heated walls to dry. Good paper was laid down in dry cellars to age, and the longer it rested, the better it wrote."],
    src:"遊戲整理（綜合宣紙製法的常見介紹，不引原文；208 複核：原稿跟第一層碑刻重複，所以換題）；碑本身是遊戲虛構"}],
  title:["📜 宣紙窖藏","📜 Paper cellar"],lvName:["宣紙窖藏・第三層","Paper cellar · Level 3"],
  intro:["石階通到焙紙房底下的紙窖，走道上垂著一片片油布，擋住焙牆的火光。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>往油布走就會把它掀起來</b>，花一回合，四周會亮起來。",
    "The steps lead to the paper cellar beneath the drying room, where sheets of oilcloth hang across the passages, hiding the glow of the drying walls. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Walk into an oilcloth to roll it up</b>: it takes a turn, and the area around lights up."],
  warn:["<b>兩個炮衛在走道上巡邏，跟炮一樣要隔一個子才看得到。</b>垂著的油布就是那個子：炮衛隔著油布，看得到後面 3 格。掀掉油布，那條線就安全了。",
    "<b>Two cannon guards patrol the passages and, like a cannon, can only see past one piece in between.</b> A hanging oilcloth is that piece: through it they see the next 3 squares. Roll the cloth up and that line is safe."],
  say:{door:["將死！炮在後面撐著，兵卒收尾，石門轟隆一聲往上收。","Checkmate! The cannon covers from behind, the pawn finishes, and the stone door rumbles open."],trap:["將死！炮衛愣在原地，你趁機脫身。","Checkmate! The cannon guard freezes and you slip away."],
    dragged:["炮衛把你拖回入口，油布也垂了回去，還把你最後撿到的東西丟回原來的箱子。","The cannon guard drags you back to the entrance, the oilcloths drop back down, and your last find goes back into its chest."],
    retry:["你被拖回了入口。<b>先掀掉油布，讓炮衛少一個炮架，再過去。</b>","You were dragged back. <b>Roll up an oilcloth to take away the guard's screen, then cross.</b>"],
    locked:["石門被機關鎖住了。<b>先在紙窖裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the cellar first.</b>"],
    done:["三層都走完了，焙紙房底下已經走到盡頭。","All three levels are done: this is the very bottom beneath the drying room."]}});
