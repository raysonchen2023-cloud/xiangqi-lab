/* ---------- W87-3 列炮門地底迷宮・第三層「舊譜戲箱」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：208 號補件的列炮門第三層，照 207、208 複核和開發者 11/26 的決定改：
     ・機關戲帳（v 收起、w 放下）：踩上機關踏板（u）就把整排戲帳一起放下或收起（每踩上去一次換一次）。
       戲帳放下時只擋視線、不擋路——人和守衛都能鑽過去，但車衛、將衛的視線碰到就停（跟第二層會擋路的墜落布景、反宮馬第二層的墨閘區隔）。
       被抓拖回入口時，戲帳照共用規則回到一開始收起的樣子。
     ・208 複核⑦「第二、三層守衛一樣」：第二層是一個車衛＋一個將衛，第三層換成兩個將衛（第一層的戲軸，繞九宮外圈走、會飛將）加一個看得到整排的車衛。
       車衛（JH_MZ_KIND.stagerook）照第一層的車：直線看，碰到擋路的東西就停；另外放下的戲帳也擋得住它的視線。
     ・機關殘局：馬兵鎖門，兵收尾的三步殺（208 複核⑥：不要再集中在雙馬）；被抓殘局一律殺題（開發者決定），不用炮、車收尾，第三層可以用到四步殺。
     ・碑刻（208 複核②：《金陵瑣事》那則像是杜撰的，不引）：遊戲整理，據張岱《陶庵夢憶》記一個戲班用布景、燈火變出月宮的事，不引原文。
     ・寶箱：門派貢獻、古譜殘頁、收藏品「絕密戲曲殘譜」。外觀照 208 複核改成「戲台木雕棋盤」（原稿「生末淨丑木棋」跟第一層的崑曲生旦棋子重複），要出圖，出圖前要先問開發者；這一版先用古譜殘頁佔位。
     ・修為 +60、去重鍵 maze:opposite_cannon:3（jhMzLayer 照開發者決定給）。配樂照第一層同一首。 */
const JH_MZ_OPP3_MAP=[
"###############",
"######.>.######",
"######...######",
"#######D#######",
"#T..L........T#",
"#.###.###.###.#",
"#C...........C#",
"###.###.###.###",
"#.....v.v.....#",
"#.###.....###.#",
"#.....v.v.....#",
"###.###.###.###",
"#P............#",
"###.#######.###",
"#C...........u#",
"#......@......#",
"###############"];
/* 兩個將衛（第一層的戲軸，pal＝九宮左上角）守中間那一間；車衛在第 12 列來回、看得到整排 */
const JH_MZ_OPP3_GUARDS=[{kind:"king",pal:[5,8],i:0,x:5,y:8},{kind:"king",pal:[7,8],i:4,x:9,y:10},{kind:"stagerook",x:13,y:12,dx:-1,dy:0,range:13}];
JH_MZ_KIND.stagerook={
  /* 照第一層的車：直線看 range 格，碰到擋路的東西停；放下的戲帳（擋光）也擋得住 */
  sight(S,G){const o=[],dx=G.dx||0,dy=G.dy||0,n=G.range||5;for(let i=1;i<=n;i++){const x=G.x+dx*i,y=G.y+dy*i;if(jhMzSolid(S,x,y)||jhMzOpaque(S,x,y))break;o.push({x,y})}return o},
  step(S,G){JH_MZ_KIND.rook.step(S,G)},
  look:{body:"#151515",head:"#222222",eye:0xE24A3A}};
/* 走到機關踏板上：整排戲帳一起放下或收起（照現在地圖上的樣子換；被拖回入口時地圖重擺，戲帳也回到收起） */
function jhMzOpp3After(S){const P=S.player;if(jhMzCell(S,P.x,P.y)!=="u")return null;let down=false;
  for(let y=0;y<S.H;y++)for(let x=0;x<S.W;x++){const c=S.grid[y][x];if(c==="v"){S.grid[y][x]="w";down=true}else if(c==="w")S.grid[y][x]="v"}
  return{msg:down?["喀啦一聲，戲帳整排放了下來：<b>擋得住視線，人照樣鑽得過去。</b>","With a clatter the stage curtains drop all at once: <b>they block sight, but you can still slip through.</b>"]
    :["戲帳又整排收了上去。","The curtains roll back up."]}}
/* 3D：戲帳收起＝上方一捲布；放下＝一片深紅布幔（半透明，看得出是布）；平面版：收起是上緣一條、放下是整格紅布 */
if(!JH_MZ_OBJ.v)JH_MZ_OBJ.v=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.9,.12,.12),lam("#7a2a24"),0,.82,0));return g};
if(!JH_MZ_OBJ.w)JH_MZ_OBJ.w=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.9,.84,.06),new T3.MeshLambertMaterial({color:0x7a2a24,transparent:true,opacity:.82}),0,.44,0));return g};
if(!JH_MZ_OBJ.u)JH_MZ_OBJ.u=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.6,.05,.6),lam("#8a6a3a"),0,.025,0));return g};
if(!JH_MZ_TILE.v)JH_MZ_TILE.v=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#7a2a24";cx.fillRect(px,py,T,T*.16)};
if(!JH_MZ_TILE.w)JH_MZ_TILE.w=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="rgba(122,42,36,.85)";cx.fillRect(px+T*.08,py,T*.84,T)};
if(!JH_MZ_TILE.u)JH_MZ_TILE.u=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#8a6a3a";cx.fillRect(px+T*.2,py+T*.2,T*.6,T*.6)};
/* ==JH_MZ_POOL:JH_MZ_POOL_OPP3== */
const JH_MZ_POOL_OPP3={door:[
{"id":"lk173c5","src":{"book":"爛柯神機","title":"歲寒松柏"},"zh":["石門機關：馬兵鎖門","門上刻著戲台的木門，一匹馬和一個兵卒一左一右守著。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: horse and pawn lock the gate","A wooden stage door is carved here, a horse and a pawn standing guard on either side. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"5cb2/3n1P3/2r1k4/2Rc1PN2/4P1b2/2r6/9/2p6/3p1p3/4K4","line":["e5e6","d8e6","f6e6","e7f7","e6f6"]},
{"id":"lk182c5","src":{"book":"爛柯神機","title":"脫帽露頂"},"zh":["石門機關：馬兵鎖門","門上刻著戲台的木門，一匹馬和一個兵卒一左一右守著。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: horse and pawn lock the gate","A wooden stage door is carved here, a horse and a pawn standing guard on either side. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"6Nc1/2PP1k3/4N2n1/9/9/9/9/3p5/2rp1r3/4K4","line":["e7g6","f8f9","g6h8","f9f8","d8e8"]},
{"id":"mr085c5","src":{"book":"夢入神機","title":"七國爭雄"},"zh":["石門機關：馬兵鎖門","門上刻著戲台的木門，一匹馬和一個兵卒一左一右守著。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: horse and pawn lock the gate","A wooden stage door is carved here, a horse and a pawn standing guard on either side. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"4P1b2/2P6/2nkb4/1P2n4/4N4/9/9/4C4/4p1p1r/C4K1c1","line":["a0a7","c7a8","b6b7","a8c7","b7c7"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_OPP3== */
/* ==JH_MZ_POOL:JH_MZ_POOL_OPP3_TRAP== */
const JH_MZ_POOL_OPP3_TRAP={door:[
],
trap:[
{"id":"lk152","src":{"book":"爛柯神機","title":"三子爭先"},"zh":["被守衛逮住了","守衛把你押在戲箱旁：「解得開這局，就放你走。」紅方先走，4 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the costume chests: \"Solve this and you can go.\" Red to move: checkmate in 4."],"fen":"1r1k5/2P1aP3/3aPN3/9/9/9/9/9/4p4/3K5","line":["c8d8","d9d8","e7d7","d8d9","d7d8","d9e9","d8e8"]},
{"id":"lk162","src":{"book":"爛柯神機","title":"牲醴三獻"},"zh":["被守衛逮住了","守衛把你押在戲箱旁：「解得開這局，就放你走。」紅方先走，4 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the costume chests: \"Solve this and you can go.\" Red to move: checkmate in 4."],"fen":"3k2P2/4PP3/4P4/9/9/9/3p3RR/3p5/1nn1p3C/3K5","line":["e8e9","d9e9","g9f9","e9d9","f9e9","d9d8","f8e8"]},
{"id":"mr087c5","src":{"book":"夢入神機","title":"兵機在手"},"zh":["被守衛逮住了","守衛把你押在戲箱旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the costume chests: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2ba1a3/3k1r2r/4NN3/3P5/9/1n2C4/2c6/3p5/4p4/3K5","line":["e7c6","d8e8","d6e6","c9e7","e6e7"]},
{"id":"mr112c8","src":{"book":"夢入神機","title":"雙燕爭飛"},"zh":["被守衛逮住了","守衛把你押在戲箱旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the costume chests: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"1P3k2r/4a4/5N3/9/4N4/9/9/5n3/3p1p3/4K4","line":["f7h8","f9e9","e5f7","e9d9","b9c9"]},
{"id":"sq008c6","src":{"book":"適情雅趣","title":"珠藏韞櫃"},"zh":["被守衛逮住了","守衛把你押在戲箱旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the costume chests: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"C2a1a1N1/r2k5/4P2n1/1rP6/2N3p2/9/9/2n6/5p3/4Kc3","line":["e7d7","d8d7","c6c7","d7d8","c7d7"],"alt":{"e7d7":["d8d7",{"c6c7":["d7d8",{"c7d7":0}],"c6d6":["d7d8",{"d6d7":0}]}]}},
{"id":"sq030c6","src":{"book":"適情雅趣","title":"國庶兵強"},"zh":["被守衛逮住了","守衛把你押在戲箱旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a guard","The guard pins you by the costume chests: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"5k1P1/c3P4/4b1P1r/6n2/4n1bN1/9/5C3/9/1r1p1p3/4K4","line":["g7f7","e5f3","h9g9","e7g9","e8e9"],"alt":{"g7f7":["e5f3",{"h9g9":["e7g9",{"e8e9":0}],"f7f8":["a8f8",{"h9g9":0}]}],"h9g9":["e7g9",{"g7f7":["e5f3",{"e8e9":0}]}]}}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_OPP3_TRAP== */
jhMzLayer("opposite_cannon",3,{map:JH_MZ_OPP3_MAP,guards:JH_MZ_OPP3_GUARDS,solid:"#DXL",opaque:"#DXLw",afterMove:jhMzOpp3After,
  pool:{door:JH_MZ_POOL_OPP3.door,trap:JH_MZ_POOL_OPP3_TRAP.trap},puz:{door:JH_MZ_POOL_OPP3.door[0],trap:JH_MZ_POOL_OPP3_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"古譜殘頁",en:"Old manual page"},{k:"relic",zh:"收藏品「絕密戲曲殘譜」",en:"Keepsake: a secret opera score fragment"}],
  lore:[{id:"op5",kind:"stele",title:["月宮布景碑","The moon-palace scenery stele"],
    body:["碑上記著明末一個戲班的絕活：演唐明皇遊月宮時，台上先一片漆黑，接著布景和燈火一起變出一輪明月和月宮，看戲的人都說像真的一樣。戲台底下藏的，就是這些換景的機關。",
      "The stele tells of a late-Ming troupe's great trick: when they staged the Tang emperor's visit to the Moon Palace, the stage first went pitch dark, then scenery and lamps together conjured up a full moon and its palace, and the audience swore it was real. What lies under a stage is machinery for changing scenes like this."],
    src:"遊戲整理，據張岱《陶庵夢憶》記戲班布景的那一則，不引原文（208 複核：《金陵瑣事》那則像是杜撰，不用）；碑本身是遊戲虛構"}],
  title:["🎭 舊譜戲箱","🎭 Old score chests"],lvName:["舊譜戲箱・第三層","Old score chests · Level 3"],
  intro:["石階通到戲台最底下的戲箱房，梁上垂著一排排收起來的戲帳。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>踩上機關踏板，整排戲帳會放下或收起</b>：放下的戲帳擋得住視線，人照樣鑽得過去。",
    "The steps lead to the costume-chest room at the very bottom of the stage, where rows of rolled-up curtains hang from the beams. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Step on the plate and every curtain drops or rolls up</b>: a dropped curtain blocks sight, but you can still slip through it."],
  warn:["<b>中間那一間有兩個戲軸將衛繞著走，下面的長廊有車衛，看得到整排。</b>紅線是他們看得到的格子。放下戲帳，就能擋住紅線。",
    "<b>Two scroll generals circle the middle hall, and a chariot guard in the lower corridor sees its whole length.</b> The red line is what they can see. Drop the curtains to cut the line."],
  say:{door:["將死！馬兵把門鎖死，石門轟隆一聲往上收。","Checkmate! Horse and pawn lock the gate and the stone door rumbles open."],trap:["將死！守衛愣在原地，你趁機脫身。","Checkmate! The guard freezes and you slip away."],
    dragged:["守衛把你拖回入口，戲帳也收了回去，還把你最後撿到的東西丟回原來的箱子。","The guard drags you back to the entrance, the curtains roll back up, and your last find goes back into its chest."],
    retry:["你被拖回了入口。<b>先踩機關踏板放下戲帳，再從戲帳後面過去。</b>","You were dragged back. <b>Step on the plate to drop the curtains first, then cross behind them.</b>"],
    locked:["石門被機關鎖住了。<b>先在戲箱房裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate in the chest room first.</b>"],
    spot:["<b>守衛轉過頭來看見你了！</b>趕快離開紅線——下一步還在紅線上就會被逮住。","<b>A guard turns and spots you!</b> Get off the red line now: if you are still on it next turn, you are caught."],
    done:["三層都走完了，戲台底下已經走到盡頭。","All three levels are done: this is the very bottom beneath the stage."]}});
