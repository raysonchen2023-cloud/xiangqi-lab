/* ---------- W87-3 順炮門地底迷宮・第三層「私鹽暗庫」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：208 號補件的順炮門第三層，照 207、208 複核和開發者 11/26 的決定改：
     ・推移鹽箱（x）：往鹽箱走、鹽箱後面那一格是空地（沒有守衛），就把它推過去一格，人跟著走一步；後面擋住就推不動（撞牆、不算回合）。
       208 複核④：Gemini 寫的「推鹽箱擋火把、躲進暗區守衛就看不到」要改共用的黑暗判定、影響十派；照複核建議改成鹽箱直接擋住暗哨的視線
       （鹽箱擋路也擋光，暗哨的視線碰到就停，跟碰到鹽灶一樣），不動共用規則。被抓拖回入口時，鹽箱照共用規則擺回原位。
       跟中炮門第三層的糧桶區隔：糧桶一推就一路滾到底，鹽箱一次只推一格。
     ・暗哨陣列：三個第一層的衝刺暗哨（JH_MZ_KIND.dash：只看正前方、前面一格擋路就轉身、不然衝兩格），交錯守兩條走道。
     ・機關殘局：208 複核⑥「殺題集中在雙馬」，照建議改成馬兵配合、兵收尾的三步殺；被抓殘局一律殺題（開發者決定），不用炮、車收尾，第三層可以用到四步殺。
     ・碑刻（208 複核②：《明儒學案》是清初的書，不引）：遊戲整理，講泰州安豐場灶丁王艮講學，不引原文。
     ・寶箱：門派貢獻、古譜殘頁、收藏品「灶戶的鹽票」。Gemini 寫的外觀「百年鹽木棋盤」要出圖，出圖前要先問開發者；這一版先用古譜殘頁佔位。
     ・修為 +60、去重鍵 maze:same_cannon:3（jhMzLayer 照開發者決定給）。配樂照第一層同一首。 */
const JH_MZ_SAME3_MAP=[
"###############",
"######.>.######",
"######...######",
"#######D#######",
"#T..L........T#",
"###.#######.###",
"#.............#",
"###.##x#x##.###",
"#C...........C#",
"###.#######.###",
"#.............#",
"###.##x#x##.###",
"#P...........C#",
"#######.#######",
"#......@......#",
"###############"];
/* 三個衝刺暗哨：上面的走道（第 6 列）一個、下面的走道（第 10 列）兩個，交錯來回 */
const JH_MZ_SAME3_GUARDS=[{kind:"dash",x:9,y:6,dx:-1,dy:0},{kind:"dash",x:4,y:10,dx:1,dy:0},{kind:"dash",x:10,y:10,dx:-1,dy:0}];
/* 推鹽箱：往 x 走、x 後面那一格是空地而且沒有守衛就推過去一格；推不動回 wall。回 null 讓共用程式照常走一步、算回合、讓守衛動 */
function jhMzSame3Push(S,dx,dy,c){if(c!=="x"||(!dx&&!dy))return null;const P=S.player,x1=P.x+dx,y1=P.y+dy,x2=x1+dx,y2=y1+dy;
  if(jhMzCell(S,x2,y2)!=="."||(S.guards||[]).some(G=>G.x===x2&&G.y===y2))return{ev:"wall",msg:["鹽箱推不動：後面被擋住了。","The salt crate won't budge: something is behind it."]};
  S.grid[y2][x2]="x";S.grid[y1][x1]=".";return null}
/* 3D：結鹽的木箱（木箱＋箱頂一層白鹽）；平面版：木箱上一塊白 */
if(!JH_MZ_OBJ.x)JH_MZ_OBJ.x=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.66,.5,.6),lam("#6b5034"),0,.25,0));g.add(mesh(new T3.BoxGeometry(.6,.06,.54),lam("#e8e4da"),0,.53,0));return g};
if(!JH_MZ_TILE.x)JH_MZ_TILE.x=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#6b5034";cx.fillRect(px+T*.16,py+T*.18,T*.68,T*.64);cx.fillStyle="#e8e4da";cx.fillRect(px+T*.2,py+T*.22,T*.6,T*.18)};
/* ==JH_MZ_POOL:JH_MZ_POOL_SAME3== */
const JH_MZ_POOL_SAME3={door:[
{"id":"lk172c7","src":{"book":"爛柯神機","title":"送往迎來"},"zh":["石門機關：馬兵聯手","門上刻著一匹馬護著一個鹽丁往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: horse and pawn together","A horse guarding a salt worker as he pushes forward is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"3P2P2/4nk1P1/b8/9/2b1P4/9/7N1/9/2p1pr3/3K3C1","line":["h8g8","f8f7","h3g5","f7e7","e5e6"]},
{"id":"lk220c7","src":{"book":"爛柯神機","title":"意外得勝"},"zh":["石門機關：馬兵聯手","門上刻著一匹馬護著一個鹽丁往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: horse and pawn together","A horse guarding a salt worker as he pushes forward is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"6P2/4k2C1/2PN5/9/9/9/9/5K3/3p1p3/9","line":["d7c9","e8d8","h8h9","d1d0","c7d7"],"alt":{"d7c9":["e8d8",{"h8h9":["d1d0",{"c7d7":0}],"c7d7":["d8d9",{"h8h9":0}]}],"g9f9":["d1c1",{"d7f8":["e8e7",{"c7d7":0}]}],"h8h9":["d1c1",{"d7c9":["e8d8",{"c7d7":0}]}]}},
{"id":"lk241","src":{"book":"爛柯神機","title":"直搗黃龍-紅勝-01"},"zh":["石門機關：馬兵聯手","門上刻著一匹馬護著一個鹽丁往前推。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: horse and pawn together","A horse guarding a salt worker as he pushes forward is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"2P1ka1P1/3PaP2R/2n1b1n2/3NpP3/9/2c6/9/9/4pr3/3K1C1r1","line":["d8d9","e8d9","d6c8","c4c8","c9d9"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SAME3== */
/* ==JH_MZ_POOL:JH_MZ_POOL_SAME3_TRAP== */
const JH_MZ_POOL_SAME3_TRAP={door:[
],
trap:[
{"id":"lk200c7","src":{"book":"爛柯神機","title":"挾彈馳驅"},"zh":["被暗哨逮住了","暗哨把你按在鹽箱堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a sentry","The sentry pins you by the salt crates: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2b6/4k1P2/4b4/9/4N4/4C4/9/7r1/4p4/3K5","line":["e5g6","e7g9","g8f8","e8e9","g6e7"]},
{"id":"lk236","src":{"book":"爛柯神機","title":"運實於虛"},"zh":["被暗哨逮住了","暗哨把你按在鹽箱堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a sentry","The sentry pins you by the salt crates: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"4ka3/3Pn4/5R3/5N3/9/9/1r1n5/9/4p4/3K5","line":["d8d9","e9d9","f7d7","d9e9","f6g8"]},
{"id":"lk251c5","src":{"book":"爛柯神機","title":"自相踐踏"},"zh":["被暗哨逮住了","暗哨把你按在鹽箱堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a sentry","The sentry pins you by the salt crates: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3knRC2/4n4/4N4/9/9/9/9/5p3/4p4/r2p1K3","line":["f9f2","e9g8","f2d2","d9e9","e7g8"],"alt":{"f9f2":["e9g8",{"f2d2":["d9e9",{"e7g8":0,"e7c8":0}]}]}},
{"id":"lk252c5","src":{"book":"爛柯神機","title":"縱橫馳驟"},"zh":["被暗哨逮住了","暗哨把你按在鹽箱堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a sentry","The sentry pins you by the salt crates: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3n5/3N1k3/9/9/9/9/9/3n5/3r1r3/C3K4","line":["a0a8","d9b8","d8e6","f8f9","e6g7"]},
{"id":"lk258c4","src":{"book":"爛柯神機","title":"作繭自縛"},"zh":["被暗哨逮住了","暗哨把你按在鹽箱堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a sentry","The sentry pins you by the salt crates: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"1cR6/r4n2C/3ak4/5N3/9/1N7/9/5p3/4p3r/3p1K3","line":["b4c6","e7f7","c6e5","f7e7","f6d5"]},
{"id":"mr001","src":{"book":"夢入神機","title":"由中應外"},"zh":["被暗哨逮住了","暗哨把你按在鹽箱堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a sentry","The sentry pins you by the salt crates: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"1RN1k4/3P3rC/6n2/9/9/9/9/4p4/3p5/c1rAK4","line":["d8e8","e9d9","e8e9","d9e9","c9d7"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SAME3_TRAP== */
jhMzLayer("same_cannon",3,{map:JH_MZ_SAME3_MAP,guards:JH_MZ_SAME3_GUARDS,solid:"#DsLx",opaque:"#DsLx",dyn:"x",onStep:jhMzSame3Push,
  pool:{door:JH_MZ_POOL_SAME3.door,trap:JH_MZ_POOL_SAME3_TRAP.trap},puz:{door:JH_MZ_POOL_SAME3.door[0],trap:JH_MZ_POOL_SAME3_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"古譜殘頁",en:"Old manual page"},{k:"relic",zh:"收藏品「灶戶的鹽票」",en:"Keepsake: a salt-boiler's salt ticket"}],
  lore:[{id:"sm5",kind:"stele",title:["灶丁講學碑","The salt-boiler teacher's stele"],
    body:["碑上記著泰州安豐場的一個灶丁：他叫王艮，從小跟著家裡煮鹽，沒讀過幾年書，後來卻開門講學，說道理不在書本裡，挑水砍柴、日常過日子就是學問，來聽的有讀書人，也有灶丁和農夫。",
      "The stele tells of a salt-boiler from the Anfeng saltworks at Taizhou. His name was Wang Gen; he boiled salt with his family as a boy and had little schooling, yet he later opened his doors to teach that the Way is not shut up in books: fetching water and chopping wood, everyday living, is learning. Scholars came to listen, and so did salt workers and farmers."],
    src:"遊戲整理（綜合泰州學派王艮的常見介紹，不引原文；208 複核：《明儒學案》是清初的書，所以不引）；碑本身是遊戲虛構"}],
  title:["🧂 私鹽暗庫","🧂 Smugglers' salt store"],lvName:["私鹽暗庫・第三層","Smugglers' salt store · Level 3"],
  intro:["石階通到私鹽販子藏貨的暗庫，地上堆著結了白鹽的木箱。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>往鹽箱走就會把它推一格</b>，暗哨的視線碰到鹽箱就看不過去。",
    "The steps lead to the store where salt smugglers hid their goods; wooden crates crusted with white salt stand about. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Walk into a crate to push it one square</b>: a sentry's line of sight stops at a crate."],
  warn:["<b>三個暗哨守著走道，只看正前方，一次衝兩格。</b>紅線是他們看得到的格子。把鹽箱推進走道，就能擋住紅線。",
    "<b>Three sentries guard the passages; each looks straight ahead and dashes two squares at a time.</b> The red line is what they can see. Push a crate into a passage to cut the line."],
  say:{door:["將死！馬兵一前一後收網，石門轟隆一聲往上收。","Checkmate! Horse and pawn close the net and the stone door rumbles open."],trap:["將死！暗哨愣在原地，你趁機脫身。","Checkmate! The sentry freezes and you slip away."],
    dragged:["暗哨把你拖回入口，鹽箱也都被擺回原位，還把你最後撿到的東西丟回原來的箱子。","The sentry drags you back to the entrance, puts the crates back where they were, and tosses your last find back into its chest."],
    retry:["你被拖回了入口。<b>先把鹽箱推進走道擋住暗哨，再從鹽箱後面過去。</b>","You were dragged back. <b>Push a crate into the passage to block the sentry first, then cross behind it.</b>"],
    locked:["石門被機關鎖住了。<b>先在暗庫裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the store first.</b>"],
    done:["三層都走完了，鹽灶底下已經走到盡頭。","All three levels are done: this is the very bottom beneath the salt stoves."]}});
