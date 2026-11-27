/* ---------- W87-3 仕角炮門地底迷宮・第三層「絕當秘庫」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：208 號補件的仕角炮門第三層，照 207、208 複核和開發者 11/26 的決定改：
     ・鐵柵踏板（g）：踩上去就降下鐵柵（i 收起、I 降下），封住庫房九宮的兩個角（只做一次，被拖回入口時照共用規則收回）。
       降下的鐵柵擋路、不擋光。仕衛巡路（第一層朝奉：中心⇄四個角輪流斜走）碰到封住的角就跳過、直接去下一個角——
       只剩一條斜線可以走，牠會看哪裡就固定下來，另一條斜線上的格子就安全了。
     ・仕衛＋外圍巡衛：庫房裡一個朝奉（JH_MZ_KIND.gateadvisor，看得到的照第一層：牠正在走的那一條斜線），庫房外的長廊有一個車衛巡邏。
     ・機關殘局：牽制成殺，馬收尾的三步殺；被抓殘局一律殺題（開發者決定），不用炮、車收尾，第三層可以用到四步殺。
     ・碑刻（《松窗夢語》那則待查，不引原文）：遊戲整理，講蘇州的典當行與朝奉。
     ・寶箱：門派貢獻、古譜殘頁、收藏品「大明御製棋子」（208 複核：雙龍紋是御用紋樣，碑文寫明是宮裡流出、輾轉當進來的死當品）。
       Gemini 寫的外觀「金絲楠木棋盤」要出圖，出圖前要先問開發者；這一版先用古譜殘頁佔位。
     ・修為 +60、去重鍵 maze:advisor_corner:3（jhMzLayer 照開發者決定給）。配樂照第一層同一首。 */
const JH_MZ_CORNER3_MAP=[
"###############",
"######.>.######",
"######...######",
"#######D#######",
"#T..L........T#",
"#.###########.#",
"#C...i...i...C#",
"#####.....#####",
"#....i...i....#",
"#.###########.#",
"#.............#",
"###.#######.###",
"#P...g.......C#",
"#######.#######",
"#......@......#",
"###############"];
/* 庫房九宮在 (6,6)～(8,8)（room＝左上角），四個角是 (6,6)(8,6)(6,8)(8,8)；九宮左右兩側上下兩排的 i 是收起的鐵柵，降下後只剩中間那一排進得去 */
const JH_MZ_CORNER3_GUARDS=[{kind:"gateadvisor",room:[6,6],i:0,x:7,y:7},{kind:"rook",x:13,y:10,dx:-1,dy:0,range:7}];
/* 踩上鐵柵踏板：降下鐵柵封住九宮的東北、西南兩個角（那兩格變成 I）；只做一次 */
const JH_MZ_CORNER3_SEAL=[[8,6],[6,8]];
function jhMzCorner3After(S){const P=S.player;if(jhMzCell(S,P.x,P.y)!=="g"||S.grid.some(r=>r.includes("I")))return null;
  for(const[x,y]of JH_MZ_CORNER3_SEAL)S.grid[y][x]="I";for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++)if(S.grid[y][x]==="i")S.grid[y][x]="I";
  return{msg:["喀啦啦一陣響，鐵柵從梁上降下來，把庫房的兩個角封住了：<b>朝奉只剩一條斜線可以走。</b>","With a long rattle the iron grilles drop from the beams and seal two corners of the strongroom: <b>the clerk now has only one diagonal to walk.</b>"]}}
JH_MZ_KIND.gateadvisor={
  sight(S,G){return JH_MZ_KIND.advisor.sight(S,G)},
  /* 照第一層的巡路斜走一格；下一格被鐵柵封住，就跳過那個角（連同回中心那一步），找下一個走得到的；都不行就原地等 */
  step(S,G){const R=G.room,n=JH_MZ_CORNER_PATH.length;
    for(let k=1;k<=n;k++){const i=((G.i||0)+k)%n,[a,b]=JH_MZ_CORNER_PATH[i],nx=R[0]+a,ny=R[1]+b;if(jhMzSolid(S,nx,ny))continue;
      if(k>1&&a===1&&b===1)continue;G.i=i;G.dx=nx-G.x;G.dy=ny-G.y;G.x=nx;G.y=ny;return}},
  look:{body:"#5a4a2a",head:"#c9a24a",eye:0x2b2b2b}};
/* 3D：收起的鐵柵（梁上一排鐵條）；降下的鐵柵（一整片鐵條）；鐵柵踏板（鐵板）；平面版同樣意思 */
if(!JH_MZ_OBJ.i)JH_MZ_OBJ.i=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.9,.08,.08),lam("#3a3a3a"),0,.86,0));return g};
if(!JH_MZ_OBJ.I)JH_MZ_OBJ.I=H=>{const{T3,mesh,lam}=H,g=new T3.Group();for(const x of[-.33,-.11,.11,.33])g.add(mesh(new T3.BoxGeometry(.06,.9,.06),lam("#3a3a3a"),x,.45,0));g.add(mesh(new T3.BoxGeometry(.9,.06,.06),lam("#3a3a3a"),0,.88,0));return g};
if(!JH_MZ_OBJ.g)JH_MZ_OBJ.g=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.6,.05,.6),lam("#4a4a4a"),0,.025,0));return g};
if(!JH_MZ_TILE.i)JH_MZ_TILE.i=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#3a3a3a";cx.fillRect(px,py,T,T*.12)};
if(!JH_MZ_TILE.I)JH_MZ_TILE.I=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#3a3a3a";for(const k of[.2,.4,.6,.8])cx.fillRect(px+T*k-T*.04,py,T*.08,T)};
if(!JH_MZ_TILE.g)JH_MZ_TILE.g=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#4a4a4a";cx.fillRect(px+T*.2,py+T*.2,T*.6,T*.6)};
/* ==JH_MZ_POOL:JH_MZ_POOL_CORNER3== */
const JH_MZ_POOL_CORNER3={door:[
{"id":"sq011c4","src":{"book":"適情雅趣","title":"羣鼠爭穴"},"zh":["石門機關：牽制成殺","門上刻著一門炮守在仕角，一匹馬伺機而動。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: pin and strike","A cannon posted by the advisor's corner and a horse waiting its chance are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"2bk3C1/4P4/1rc1b3c/9/9/9/9/3C1N3/4p1r2/2p2K3","line":["f2d3","c7d7","d3e5","d7c7","e5d7"],"alt":{"f2d3":["c7d7",{"d3e5":["d7c7",{"e5d7":0}],"d3c5":["d7c7",{"c5d7":0}]}]}},
{"id":"sq149c7","src":{"book":"適情雅趣","title":"騰蛟起鳳"},"zh":["石門機關：牽制成殺","門上刻著一門炮守在仕角，一匹馬伺機而動。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: pin and strike","A cannon posted by the advisor's corner and a horse waiting its chance are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"9/9/3kba3/2c6/9/9/4P4/4B1n1r/3CAp3/2N1K4","line":["c0d2","c6d6","d2c4","d6i6","c4d6"],"alt":{"c0d2":["c6d6",{"d2c4":["d6i6",{"c4d6":0}],"d2e4":["d6a6",{"e4d6":0}]}]}},
{"id":"sq171c6","src":{"book":"適情雅趣","title":"贏縮無常"},"zh":["石門機關：牽制成殺","門上刻著一門炮守在仕角，一匹馬伺機而動。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: pin and strike","A cannon posted by the advisor's corner and a horse waiting its chance are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"3k3C1/2P1N4/9/9/9/9/9/5p3/1rrnc2R1/5K1p1","line":["e8g9","e1e9","h1d1","c1d1","g9e8"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CORNER3== */
/* ==JH_MZ_POOL:JH_MZ_POOL_CORNER3_TRAP== */
const JH_MZ_POOL_CORNER3_TRAP={door:[
],
trap:[
{"id":"mr043c4","src":{"book":"夢入神機","title":"黃鸝出谷-02"},"zh":["被守衛押住了","守衛把你押在死當櫃前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a guard","The guard holds you at the forfeit counter: \"Solve the game on this ticket and you can go.\" Red to move: checkmate in 3."],"fen":"1C3kc1c/2N1P4/b8/4P4/9/9/9/9/4p3r/3K5","line":["e8e9","f9f8","b9b8","f8f7","e6f6"],"alt":{"e8e9":["f9f8",{"b9b8":["f8f7",{"e6f6":0,"e6e7":0}]}]}},
{"id":"sq044c5","src":{"book":"適情雅趣","title":"近悅遠來"},"zh":["被守衛押住了","守衛把你押在死當櫃前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a guard","The guard holds you at the forfeit counter: \"Solve the game on this ticket and you can go.\" Red to move: checkmate in 3."],"fen":"9/3P1k3/8b/5P2N/5cb2/2n6/5C3/5A3/4AK3/1r4r2","line":["f6f7","f8f9","f7f8","f9e9","f8e8"],"alt":{"f6f7":["f8f9",{"f7f8":["f9e9",{"f8e8":0,"f8f9":0}]}]}},
{"id":"sq056c8","src":{"book":"適情雅趣","title":"百川匯海"},"zh":["被守衛押住了","守衛把你押在死當櫃前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a guard","The guard holds you at the forfeit counter: \"Solve the game on this ticket and you can go.\" Red to move: checkmate in 3."],"fen":"2P2k3/4P4/b2Pb4/5P3/9/9/3p5/6p2/3K5/C8","line":["c9d9","d3d2","d1d2","g2g1","d9e9"],"alt":{"c9d9":["d3d2",{"d1d2":["g2g1",{"d9e9":0}]}],"a0a4":["d3d2",{"d1d2":["a7c5",{"a4a9":0,"a4f4":0}]}],"f6f7":["d3d2",{"d1d2":["a7c5",{"a0a9":0,"f7f8":0}]}]}},
{"id":"sq150c6","src":{"book":"適情雅趣","title":"呂帥鷹揚"},"zh":["被守衛押住了","守衛把你押在死當櫃前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a guard","The guard holds you at the forfeit counter: \"Solve the game on this ticket and you can go.\" Red to move: checkmate in 3."],"fen":"3a1R3/7CC/c1P1k4/2P1rr3/2N6/9/9/3p5/4p4/1p1K5","line":["c7d7","e7d7","c6c7","d7e7","c7d7"],"alt":{"c7d7":["e7d7",{"c6c7":["d7e7",{"c7d7":0}],"c6d6":["d7e7",{"d6d7":0}]}]}},
{"id":"sq161","src":{"book":"適情雅趣","title":"遠害全身"},"zh":["被守衛押住了","守衛把你押在死當櫃前：「這張當票上的局解得開，就放你走。」紅方先走，4 步將死黑方。"],"en":["Held by a guard","The guard holds you at the forfeit counter: \"Solve the game on this ticket and you can go.\" Red to move: checkmate in 4."],"fen":"9/3k5/R2abN2C/C3P4/2b6/9/9/4p4/2r6/cr1AK4","line":["a6d6","d7e8","a7d7","d8d7","e6e7","d7d8","e7d7"]},
{"id":"sq209c5","src":{"book":"適情雅趣","title":"叄參見佛"},"zh":["被守衛押住了","守衛把你押在死當櫃前：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a guard","The guard holds you at the forfeit counter: \"Solve the game on this ticket and you can go.\" Red to move: checkmate in 3."],"fen":"5a3/3kn4/4b1r2/2pP5/9/3n5/9/3C5/5r1p1/4K3c","line":["d6d7","d8d9","d7d8","d9e9","d8d9"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CORNER3_TRAP== */
jhMzLayer("advisor_corner",3,{map:JH_MZ_CORNER3_MAP,guards:JH_MZ_CORNER3_GUARDS,solid:"#DLI",opaque:"#DL",afterMove:jhMzCorner3After,
  pool:{door:JH_MZ_POOL_CORNER3.door,trap:JH_MZ_POOL_CORNER3_TRAP.trap},puz:{door:JH_MZ_POOL_CORNER3.door[0],trap:JH_MZ_POOL_CORNER3_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"古譜殘頁",en:"Old manual page"},{k:"relic",zh:"收藏品「大明御製棋子」",en:"Keepsake: imperial Ming chess pieces"}],
  lore:[{id:"ac5",kind:"stele",title:["質庫碑","The pawnshop stele"],
    body:["碑上記著蘇州的典當行：城裡當鋪很多，掌櫃叫朝奉，看貨、估價、寫當票都要眼明手快。過了期沒贖回的東西成了死當，就收進最裡面的秘庫——連宮裡流出來、輾轉被人當進來的御用棋子，也在這裡。",
      "The stele tells of Suzhou's pawnshops: the city had many, and the manager, called the chaofeng, had to be sharp-eyed and quick to judge goods, set a price and write the ticket. Anything not redeemed in time was forfeit and went into the innermost vault, even a set of imperial chess pieces that had slipped out of the palace and been pawned by someone along the way."],
    src:"遊戲整理（綜合明代蘇州典當業的常見介紹，不引原文；複核：《松窗夢語》那則待查，所以不引）；碑本身是遊戲虛構"}],
  title:["💰 絕當秘庫","💰 Forfeit vault"],lvName:["絕當秘庫・第三層","Forfeit vault · Level 3"],
  intro:["石階通到當鋪最裡面的秘庫，死當的寶貝都收在這裡，梁上吊著一排鐵柵。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>踩上鐵柵踏板，鐵柵會降下來封住庫房的兩個角</b>。",
    "The steps lead to the pawnshop's innermost vault, where forfeited treasures are kept and a row of iron grilles hangs from the beams. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Step on the grille plate and the grilles drop to seal two corners of the strongroom</b>."],
  warn:["<b>庫房裡有朝奉斜著走，外面長廊有車衛巡邏。</b>紅線是他們看得到的格子。降下鐵柵，朝奉就只剩一條斜線可以走。",
    "<b>A clerk walks the diagonals of the strongroom, and a chariot guard patrols the corridor outside.</b> The red line is what they can see. Drop the grilles and the clerk has only one diagonal left."],
  say:{door:["將死！牽制住了，馬一跳收尾，石門轟隆一聲往上收。","Checkmate! The pin holds, the horse leaps in to finish, and the stone door rumbles open."],trap:["將死！守衛愣在原地，你趁機脫身。","Checkmate! The guard freezes and you slip away."],
    dragged:["守衛把你押回入口，鐵柵也收了回去，還把你最後撿到的東西丟回原來的箱子。","The guard marches you back to the entrance, the grilles go back up, and your last find goes back into its chest."],
    retry:["你被押回了入口。<b>先踩鐵柵踏板封住庫房的角，看準朝奉那一條斜線，再穿過去。</b>","You were marched back. <b>Step on the grille plate to seal the corners, watch the clerk's one diagonal, then cross.</b>"],
    locked:["石門被機關鎖住了。<b>先在秘庫裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the vault first.</b>"],
    spot:["<b>守衛轉過頭來看見你了！</b>趕快離開紅線——下一步還在紅線上就會被逮住。","<b>A guard turns and spots you!</b> Get off the red line now: if you are still on it next turn, you are caught."],
    done:["三層都走完了，當鋪底下已經走到盡頭。","All three levels are done: this is the very bottom beneath the pawnshop."]}});
