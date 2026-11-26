/* ---------- W87-2 反宮馬地底迷宮・第二層「踏板墨閘」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的反宮馬門第二層，照 208 複核（iMac Claude 1）和開發者 11/26 的決定改：
     ・墨閘踏板（J）：每走進去一次，它管的那一組「閘墨池」就切換一次——漲滿（U：墨溢出來，擋路、擋光、站不進去也躲不了，傀儡也落不下去）⇄ 乾涸（變平地）。
       原地等不算走進去。被拖回入口時，墨閘照地圖原樣（重新開始那一趟）。
       複核問「漲滿時還能不能站進去躲」：不能，漲滿就是一塊擋路的墨；第一層那種可以泡進去躲的廢墨池（K）照舊在，兩種分開畫。
     ・墨工傀儡：照第一層（JH_MZ_KIND.inkpuppet，反宮：挑離工坊中心最遠的落點、不踩墨池）；閘墨池一漲一退，牠的落點跟著變，玩家用踏板把牠引開。
     ・石門前唯一的通道是一格閘墨池，一開始漲滿：要先踩墨閘踏板才過得去；同一個踏板也會讓上方工坊裡的一格乾掉，傀儡多一個落點。
     ・機關殘局：馬兵聯攻（複核：「冷著」意思不清，改名），兵收尾、紅方有馬的優先；被抓殘局一律殺題（開發者決定），馬收尾（開發者 11/26 選單「換成馬、兵收尾」：用 --multi 出題，最快殺都算對）。
       開發者 11/26 選單：不同派可以重用題目，只在同一派各層之間不重複（出題的 --exclude 只排除反宮馬自己的各層）。
     ・碑刻：遊戲整理，據胡應麟《少室山房筆叢》談刻書的段落；複核說原典語氣沒那麼誇張，內容收斂成「歙縣刻書越來越精」。
     ・寶箱：門派貢獻、反宮馬譜殘頁、稱號「墨隱刀鋒」。 */
const JH_MZ_PALACE2_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"######U########",
"#C..........#P#",
"#.#.K.U...#...#",
"#.#.......#.#.#",
"#...K...K...#J#",
"#.#.......#.#.#",
"#.#########.#.#",
"#C..........#.#",
"###.#.###.#...#",
"#...#...#.#.#C#",
"#.K...K...L...#",
"#...#...#...#.#",
"##.###.#####.##",
"#T....@......T#",
"###############"];
/* 墨閘：踏板「x,y」→ 它管的那一組閘墨池 */
const JH_MZ_PALACE2_GATE={"13,9":[[6,5],[6,7]]};
const JH_MZ_PALACE2_GUARDS=[{kind:"inkpuppet",zone:[3,12,9,16],x:6,y:14},{kind:"inkpuppet",zone:[3,6,9,10],x:6,y:8}];
/* 走進墨閘踏板：那一組閘墨池切換（漲滿⇄乾涸）；有傀儡站著的那一格不漲（墨漲不上來，免得把牠困在墨裡）。回傳 null＝照預設走進去 */
function jhMzPalace2Gate(S,dx,dy,c){if(c!=="J")return null;const P=S.player,L=JH_MZ_PALACE2_GATE[(P.x+dx)+","+(P.y+dy)];if(!L)return null;
  for(const[x,y]of L){const v=S.grid[y]&&S.grid[y][x];if(v==="U")S.grid[y][x]=".";else if(v==="."&&!(S.guards||[]).some(G=>G.x===x&&G.y===y))S.grid[y][x]="U"}
  S.gateN=(S.gateN||0)+1;return null}
/* 3D：墨閘踏板（地上一塊銅板，中間一個閘門紋）；漲滿的閘墨池（比廢墨池高一截、滿到邊的墨）。平面版各畫一格 */
if(!JH_MZ_OBJ.J)JH_MZ_OBJ.J=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.7,.05,.7),lam("#8a6a3e"),0,.025,0));g.add(mesh(new T3.BoxGeometry(.3,.06,.12),lam("#3a2a18"),0,.04,0));return g};
if(!JH_MZ_OBJ.U)JH_MZ_OBJ.U=H=>{const{T3,mesh}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,.32,1),new T3.MeshLambertMaterial({color:0x140f1c}),0,.16,0));
  g.add(mesh(new T3.BoxGeometry(1.02,.04,1.02),new T3.MeshBasicMaterial({color:0x5b3f78}),0,.32,0));return g};
if(!JH_MZ_TILE.J)JH_MZ_TILE.J=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#8a6a3e";cx.fillRect(px+T*.15,py+T*.15,T*.7,T*.7);cx.fillStyle="#3a2a18";cx.fillRect(px+T*.35,py+T*.44,T*.3,T*.12)};
if(!JH_MZ_TILE.U)JH_MZ_TILE.U=(cx,px,py,T)=>{cx.fillStyle="#140f1c";cx.fillRect(px,py,T,T);cx.strokeStyle="#5b3f78";cx.lineWidth=3;cx.strokeRect(px+2,py+2,T-4,T-4)};
/* ==JH_MZ_POOL:JH_MZ_POOL_PALACE2== */
const JH_MZ_POOL_PALACE2={door:[
{"id":"lk035c4","src":{"book":"爛柯神機","title":"獨具爐錘"},"zh":["石門機關：馬兵聯攻","門上刻著一匹馬和一個小卒並肩往前。紅方先走，3 步將死黑方，門就會開。提示：最後一步是兵將死，馬在旁邊撐著。"],"en":["Stone door: horse and pawn together","A horse and a pawn advancing side by side are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a pawn gives the final mate with the horse in support."],"fen":"3k3C1/1P4P2/4bN2b/4P4/9/9/9/5p3/3cp4/3p1K3","line":["f7g9","d9d8","b8c8","d8d7","e6d6"]},
{"id":"lk058c5","src":{"book":"爛柯神機","title":"海底藏珍"},"zh":["石門機關：馬兵聯攻","門上刻著一匹馬和一個小卒並肩往前。紅方先走，3 步將死黑方，門就會開。提示：最後一步是兵將死，馬在旁邊撐著。"],"en":["Stone door: horse and pawn together","A horse and a pawn advancing side by side are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a pawn gives the final mate with the horse in support."],"fen":"9/4aR3/2Nak4/2p2P3/9/9/9/3K2p1B/1p1r5/2p2p3","line":["d2d1","b1c1","d1d2","c0b0","f6e6"]},
{"id":"lk172c7","src":{"book":"爛柯神機","title":"送往迎來"},"zh":["石門機關：馬兵聯攻","門上刻著一匹馬和一個小卒並肩往前。紅方先走，3 步將死黑方，門就會開。提示：最後一步是兵將死，馬在旁邊撐著。"],"en":["Stone door: horse and pawn together","A horse and a pawn advancing side by side are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a pawn gives the final mate with the horse in support."],"fen":"3P2P2/4nk1P1/b8/9/2b1P4/9/7N1/9/2p1pr3/3K3C1","line":["h8g8","f8f7","h3g5","f7e7","e5e6"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PALACE2== */
/* ==JH_MZ_POOL:JH_MZ_POOL_PALACE2_TRAP== */
const JH_MZ_POOL_PALACE2_TRAP={door:[
],
trap:[
{"id":"lk093c4","src":{"book":"爛柯神機","title":"連環甲馬"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"9/5k3/5a2b/9/9/9/5N3/9/1rrp1C3/c3K1N2","line":["f3g5","f7e8","g5f7","f8f7","g0f2"]},
{"id":"lk105c7","src":{"book":"爛柯神機","title":"馬嵬埋玉-(方環形)-正和"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"4R4/3k5/3N5/2p3p2/5r3/4C4/5r3/2p3n2/3p1p3/4K4","line":["e4d4","f5d5","e9e8","d8d9","d7b8"],"alt":{"e4d4":["f5d5",{"e9e8":["d8d9",{"d7b8":0}],"e9d9":["d8d9",{"d7b8":0,"d7f8":0}]}]}},
{"id":"lk107c6","src":{"book":"爛柯神機","title":"馬躍檀溪"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"9/1r2k4/4b2N1/9/6b2/9/9/4N4/2p1C2n1/3K2Br1","line":["e2f4","e7g9","f4e6","g5e7","e6c7"],"alt":{"e2f4":["e7g9",{"f4e6":["g5e7",{"e6c7":0}]}],"e2c3":["e7c5",{"c3e4":["c5e7",{"e4f6":0}]}],"e2g3":["e7c5",{"g3e4":["c5e7",{"e4f6":0}]}]}},
{"id":"lk118c6","src":{"book":"爛柯神機","title":"鵬搏十萬"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"5Rb2/2N1k1r2/9/4C4/4n4/4r4/5N3/2p6/1nc1p4/3K1p3","line":["c8e7","e8e7","e6e4","e5f7","f3e5"]},
{"id":"lk119c8","src":{"book":"爛柯神機","title":"匹馬盤旋"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"3k3C1/4P4/4b3b/3n5/3N5/3C5/8r/4p4/4p4/5K3","line":["d5b6","d6b5","b6d7","b5d4","d7b8"],"alt":{"d5b6":["d6b5",{"b6d7":["b5d4",{"d7b8":0}]}],"d5f6":["d6b5",{"f6d7":["b5d4",{"d7b8":0}]}]}},
{"id":"lk120c8","src":{"book":"爛柯神機","title":"匹馬突圍"},"zh":["被墨工傀儡纏住了","墨工傀儡用墨線把你纏住，攤開一塊刻了棋局的雕版：「解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Tangled by an ink puppet","The ink puppet tangles you in inked string and unrolls a woodblock carved with a chess problem: \"Solve it and you can go.\" Red to move: checkmate in 3."],"fen":"5CbcN/2PP4n/3k5/6N2/6c2/9/9/9/r3p2r1/5K3","line":["f9d9","h9d9","g6e5","d7e7","i9g8"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PALACE2_TRAP== */
jhMzLayer("palace_horse",2,{map:JH_MZ_PALACE2_MAP,guards:JH_MZ_PALACE2_GUARDS,solid:"#DUL",opaque:"#DKUL",onStep:jhMzPalace2Gate,
  pool:{door:JH_MZ_POOL_PALACE2.door,trap:JH_MZ_POOL_PALACE2_TRAP.trap},puz:{door:JH_MZ_POOL_PALACE2.door[0],trap:JH_MZ_POOL_PALACE2_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"反宮馬譜殘頁",en:"Reverse Palace Horse manual page"},{k:"title",zh:"稱號「墨隱刀鋒」",en:"Title: Blade hidden in ink"}],
  lore:[{id:"ph4",kind:"doc",title:["書坊雜記","Notes from a print shop"],
    body:["紙上抄著一段談刻書的話：各地刻的書各有好壞，近年來歙縣刻的書越來越精，字畫清楚，連外地的書商都來訂。","The page copies a passage on printing: books cut in different places vary in quality, and in recent years those cut in She county have grown finer and finer, the characters crisp, so that booksellers come from elsewhere to order them."],
    src:"遊戲整理，據胡應麟《少室山房筆叢》談刻書的段落（萬曆年間）；抄本本身是遊戲虛構"}],
  title:["🖋 踏板墨閘","🖋 Ink sluice"],lvName:["踏板墨閘・第二層","Ink sluice · Level 2"],
  intro:["石階往下，地窖更深了，墨池接著墨閘，地上有一塊銅踏板。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>每走上銅踏板一次，閘墨池就漲滿或乾掉一次。</b>",
    "Down the steps the cellar goes deeper; the ink pools here are fed by a sluice, and there is a bronze plate on the floor. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Each time you step onto the bronze plate, the sluice pools fill or drain.</b>"],
  warn:["<b>漲滿的閘墨池是一整塊墨，擋路也擋光，站不進去也躲不了；</b>乾掉就是平地。原本那種矮矮的廢墨池照舊可以泡進去躲傀儡。墨工傀儡老往離工坊中間最遠的地方跳，墨閘一變，牠的落點就跟著變。",
    "<b>A full sluice pool is a solid block of ink: it blocks the way and the light, and you can't stand in it or hide there.</b> Drained, it's plain floor. The low waste-ink pools from before still let you hide from the puppets. The puppets always jump as far from the middle of their workshop as they can, so when the sluice changes, so do their landing squares."],
  say:{door:["將死！馬兵聯手，石門往兩旁滑開。","Checkmate! Horse and pawn close in together and the stone door slides apart."],
    locked:["石門被機關鎖住了。<b>先在墨窟裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the cellar first.</b>"],
    retry:["你被拖回了入口，墨閘也回到原樣。<b>看紅格：那是傀儡下一步跳得到的地方；躲到牠的馬腿上、或泡進矮的廢墨池。</b>","You were dragged back, and the sluice is back as it was. <b>Watch the red squares: they're where the puppet can jump next. Stand on its leg, or in a low ink pool.</b>"],
    done:["石階往下通到晾墨的暗室，第三層之後再開。","The steps lead down to the drying room. Level 3 opens later."]}});
