/* ---------- W87-3 反宮馬門地底迷宮・第三層「墨池連通」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：208 號補件的反宮馬門第三層「晾墨暗陣」，照 207、208 複核和開發者 11/26 的決定改：
     ・208 複核③：轉晾墨架跟屏風馬第三層轉石鼓、仕角炮第二層轉銅鏡都是「轉」，踩踏板隔斷視線又跟列炮第三層戲帳一樣，
       照複核的建議改成「墨池連通、傀儡會換到另一片工坊」：
     ・連通墨口（n）：墨口兩兩一對，底下有暗渠連著。人或墨工傀儡停在墨口上，就從同一對的另一個墨口冒出來（人花一步、自動走停下）；
       另一個墨口上有人、有傀儡，就冒不出來、留在原地。傀儡冒出來後換成那一片工坊巡邏（照第一層：挑離工坊中心最遠的落點、不跳回上一格）。
     ・雙速傀儡（JH_MZ_KIND.inkpuppet3）：一隻每回合跳一次，一隻（slow）兩回合才跳一次；看得到的照第一層（下一步跳得到的日字落點，落點是廢墨池就沒有）。
     ・機關殘局：退馬反擊，馬收尾的三步殺；被抓殘局一律殺題（開發者決定），不用炮、車收尾，第三層可以用到四步殺。
     ・碑刻（208 複核②：《虯村黃氏宗譜》書名和年代待查，不引）：遊戲整理，講歙縣虯村黃氏刻工，不引原文。
     ・寶箱：門派貢獻、古譜殘頁、收藏品「萬曆孤本雕版」。Gemini 寫的外觀「徽墨黑檀棋子」要出圖，出圖前要先問開發者；這一版先用古譜殘頁佔位。
     ・修為 +60、去重鍵 maze:palace_horse:3（jhMzLayer 照開發者決定給）。配樂照第一層同一首。 */
const JH_MZ_PALACE3_MAP=[
"###############",
"######.>.######",
"######...######",
"#######D#######",
"#T..L........T#",
"#.###.#####.#.#",
"#C...........n#",
"#..K.......K..#",
"#.............#",
"#n.....C......#",
"######.########",
"#.............#",
"#.K..n....K...#",
"#P...........C#",
"#....n........#",
"######.########",
"#.....@.......#",
"###############"];
/* 三片工坊（x0,y0,x1,y1）與墨口的配對（上面工坊 ↔ 下面工坊） */
const JH_MZ_PALACE3_ZONES=[[1,6,13,9],[1,11,13,14]];
const JH_MZ_PALACE3_PAIR={"13,6":"5,12","5,12":"13,6","1,9":"5,14","5,14":"1,9"};
const JH_MZ_PALACE3_GUARDS=[{kind:"inkpuppet3",x:8,y:8},{kind:"inkpuppet3",x:8,y:12,slow:1}];
/* 傀儡現在在哪一片工坊（墨口換過去之後跟著換） */
const jhMzPalace3Zone=G=>JH_MZ_PALACE3_ZONES.find(Z=>G.x>=Z[0]&&G.x<=Z[2]&&G.y>=Z[1]&&G.y<=Z[3])||JH_MZ_PALACE3_ZONES[0];
/* 從墨口冒到另一個：另一個墨口上有人或傀儡就冒不出來（回 false） */
function jhMzPalace3Warp(S,o){const k=JH_MZ_PALACE3_PAIR[o.x+","+o.y];if(!k||jhMzCell(S,o.x,o.y)!=="n")return false;const[x,y]=k.split(",").map(Number),P=S.player;
  if((P!==o&&P.x===x&&P.y===y)||(S.guards||[]).some(G=>G!==o&&G.x===x&&G.y===y))return false;o.x=x;o.y=y;if(o.fx!=null){o.fx=x;o.fy=y}return true}
JH_MZ_KIND.inkpuppet3={
  sight(S,G){return JH_MZ_KIND.inkpuppet.sight(S,G)},
  /* 慢的那隻只在偶數回合跳；跳的規則照第一層（工坊照現在所在的那一片）；跳到墨口上就從另一頭冒出來 */
  step(S,G){if(G.slow&&(S.turn%2))return;G.zone=jhMzPalace3Zone(G);JH_MZ_KIND.inkpuppet.step(S,G);if(jhMzPalace3Warp(S,G)){G.px=null;G.py=null;G.zone=jhMzPalace3Zone(G)}},
  look:{body:"#2b2233",head:"#4a3a55",eye:0x9b7bd0}};
/* 人走到墨口上：從另一頭冒出來，自動走停下 */
function jhMzPalace3After(S){if(jhMzPalace3Warp(S,S.player))return{stop:true,msg:["你踩進墨口，被暗渠捲著，從另一片工坊的墨口冒了出來。","You step into the ink well; the channel below carries you to the well in the other workshop."]};return null}
/* 3D：墨口（地上一圈石沿，中間黑亮的墨水）；平面版：石沿＋墨色圓心 */
if(!JH_MZ_OBJ.n)JH_MZ_OBJ.n=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.CylinderGeometry(.42,.44,.08,24),lam("#5a5560"),0,.04,0));
  g.add(mesh(new T3.CylinderGeometry(.32,.32,.09,24),new T3.MeshLambertMaterial({color:0x0b0812}),0,.05,0));return g};
if(!JH_MZ_TILE.n)JH_MZ_TILE.n=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.fillStyle="#5a5560";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.42,0,Math.PI*2);cx.fill();
  cx.fillStyle="#0b0812";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.3,0,Math.PI*2);cx.fill()};
/* ==JH_MZ_POOL:JH_MZ_POOL_PALACE3== */
const JH_MZ_POOL_PALACE3={door:[
{"id":"lk093c4","src":{"book":"爛柯神機","title":"連環甲馬"},"zh":["石門機關：退馬反擊","門上刻著一匹往後退的木刻馬。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: the horse steps back to strike","A carved wooden horse stepping backwards is cut into the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"9/5k3/5a2b/9/9/9/5N3/9/1rrp1C3/c3K1N2","line":["f3g5","f7e8","g5f7","f8f7","g0f2"]},
{"id":"lk105c7","src":{"book":"爛柯神機","title":"馬嵬埋玉-(方環形)-正和"},"zh":["石門機關：退馬反擊","門上刻著一匹往後退的木刻馬。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: the horse steps back to strike","A carved wooden horse stepping backwards is cut into the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"4R4/3k5/3N5/2p3p2/5r3/4C4/5r3/2p3n2/3p1p3/4K4","line":["e4d4","f5d5","e9e8","d8d9","d7b8"],"alt":{"e4d4":["f5d5",{"e9e8":["d8d9",{"d7b8":0}],"e9d9":["d8d9",{"d7b8":0,"d7f8":0}]}]}},
{"id":"lk118c6","src":{"book":"爛柯神機","title":"鵬搏十萬"},"zh":["石門機關：退馬反擊","門上刻著一匹往後退的木刻馬。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由馬將死。"],"en":["Stone door: the horse steps back to strike","A carved wooden horse stepping backwards is cut into the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a horse giving mate."],"fen":"5Rb2/2N1k1r2/9/4C4/4n4/4r4/5N3/2p6/1nc1p4/3K1p3","line":["c8e7","e8e7","e6e4","e5f7","f3e5"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PALACE3== */
/* ==JH_MZ_POOL:JH_MZ_POOL_PALACE3_TRAP== */
const JH_MZ_POOL_PALACE3_TRAP={door:[
],
trap:[
{"id":"lk119c8","src":{"book":"爛柯神機","title":"匹馬盤旋"},"zh":["被墨工傀儡逮住了","傀儡把你按在墨口邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by an ink puppet","The puppet pins you by the ink well: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3k3C1/4P4/4b3b/3n5/3N5/3C5/8r/4p4/4p4/5K3","line":["d5b6","d6b5","b6d7","b5d4","d7b8"],"alt":{"d5b6":["d6b5",{"b6d7":["b5d4",{"d7b8":0}]}],"d5f6":["d6b5",{"f6d7":["b5d4",{"d7b8":0}]}]}},
{"id":"lk120c8","src":{"book":"爛柯神機","title":"匹馬突圍"},"zh":["被墨工傀儡逮住了","傀儡把你按在墨口邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by an ink puppet","The puppet pins you by the ink well: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"5CbcN/2PP4n/3k5/6N2/6c2/9/9/9/r3p2r1/5K3","line":["f9d9","h9d9","g6e5","d7e7","i9g8"]},
{"id":"lk147c4","src":{"book":"爛柯神機","title":"濡首龍潭"},"zh":["被墨工傀儡逮住了","傀儡把你按在墨口邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by an ink puppet","The puppet pins you by the ink well: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2b1k4/1r1Rn4/c2ab3N/1C7/9/9/9/B8/5Kp2/2p1p4","line":["f1f2","b8d8","b6b9","d8d9","i7g8"],"alt":{"f1f2":["b8d8",{"b6b9":["d8d9",{"i7g8":0}],"i7g8":["e9d9",{"b6b9":0}]}]}},
{"id":"lk148c5","src":{"book":"爛柯神機","title":"入後必窮"},"zh":["被墨工傀儡逮住了","傀儡把你按在墨口邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by an ink puppet","The puppet pins you by the ink well: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3k4C/4P2N1/9/9/7c1/9/9/9/2nr1pp2/4K1BN1","line":["h8f9","h5h9","f9g7","h9h8","g7h9"]},
{"id":"lk168c9","src":{"book":"爛柯神機","title":"雙獅滾球"},"zh":["被墨工傀儡逮住了","傀儡把你按在墨口邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by an ink puppet","The puppet pins you by the ink well: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2b2a1r1/1N1k5/b8/5N3/9/9/9/4cp3/3C1pr2/2p1K3c","line":["b8c6","d8d9","f6d7","e2d2","d7f8"],"alt":{"b8c6":["d8d9",{"f6d7":["e2d2",{"d7f8":0,"d7b8":0}]}]}},
{"id":"lk171c5","src":{"book":"爛柯神機","title":"四面楚歌"},"zh":["被墨工傀儡逮住了","傀儡把你按在墨口邊：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by an ink puppet","The puppet pins you by the ink well: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"C2k4C/2NNR4/n3b4/9/6b2/9/2r6/9/4p1p2/5K3","line":["e8e9","d9e9","d8f9","e9e8","c8d6"],"alt":{"e8e9":["d9e9",{"d8f9":["e9e8",{"c8d6":0,"a9a8":0}]}]}}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PALACE3_TRAP== */
jhMzLayer("palace_horse",3,{map:JH_MZ_PALACE3_MAP,guards:JH_MZ_PALACE3_GUARDS,solid:"#DL",opaque:"#DKL",avoid:"n",afterMove:jhMzPalace3After,
  pool:{door:JH_MZ_POOL_PALACE3.door,trap:JH_MZ_POOL_PALACE3_TRAP.trap},puz:{door:JH_MZ_POOL_PALACE3.door[0],trap:JH_MZ_POOL_PALACE3_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"古譜殘頁",en:"Old manual page"},{k:"relic",zh:"收藏品「萬曆孤本雕版」",en:"Keepsake: a unique Wanli-era woodblock"}],
  lore:[{id:"pl5",kind:"stele",title:["刻工碑","Carvers' stele"],
    body:["碑上記著歙縣虯村的黃氏刻工：一家好幾代都靠刻書版過活，萬曆前後替各地書坊刻了不少有插圖的書，線條細得像用筆畫出來的。刻一塊版要好幾天，手指常年沾著墨。",
      "The stele tells of the Huang family of carvers from Qiucun in She county: generation after generation made their living cutting printing blocks, and around the Wanli years they carved many illustrated books for printers far and wide, with lines as fine as brushwork. One block took days, and their fingers were always stained with ink."],
    src:"遊戲整理（綜合徽派刻書的常見介紹，不引原文；複核建議《虯村黃氏宗譜》待查，所以不引）；碑本身是遊戲虛構"}],
  title:["🖋 墨池連通","🖋 Linked ink wells"],lvName:["墨池連通・第三層","Linked ink wells · Level 3"],
  intro:["石階通到藏版墨窟最底下，兩片工坊之間只有一條窄道，地上開著幾個墨口。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>踩進墨口，會從另一片工坊的墨口冒出來</b>，自動走不會主動踩。",
    "The steps lead to the very bottom of the printing-block cave: two workshops joined by one narrow passage, with ink wells set in the floor. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Step into an ink well and you come up out of its twin in the other workshop</b>; auto-walk won't step in on its own."],
  warn:["<b>兩片工坊各有一隻墨工傀儡，一隻每回合跳、一隻兩回合才跳一次。</b>紅點是牠們下一步跳得到的地方。傀儡停在墨口上，也會被捲到另一片工坊。",
    "<b>Each workshop has an ink puppet: one leaps every turn, the other only every second turn.</b> The red dots are where they can land next. A puppet that lands on an ink well is carried to the other workshop too."],
  say:{door:["將死！退一步的馬殺回來，石門轟隆一聲往上收。","Checkmate! The horse that stepped back strikes home and the stone door rumbles open."],trap:["將死！傀儡愣在原地，你趁機脫身。","Checkmate! The puppet freezes and you slip away."],
    dazed:["傀儡暈頭轉向，<b>四回合內</b>不會動。","The puppet is dazed and <b>won't move for four turns</b>."],
    dragged:["傀儡把你拖回入口，還把你最後撿到的東西丟回原來的箱子。","The puppet drags you back to the entrance and tosses your last find back into its chest."],
    retry:["你被拖回了入口。<b>看準傀儡被墨口捲走的時候，再穿過那一片工坊。</b>","You were dragged back. <b>Wait for a puppet to be carried off by an ink well, then cross its workshop.</b>"],
    locked:["石門被機關鎖住了。<b>先在工坊裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate in the workshops first.</b>"],
    spot:["<b>傀儡轉過頭來看見你了！</b>趕快離開紅點——下一步還在紅點上就會被逮住。","<b>A puppet turns and spots you!</b> Get off the red dots now: if you are still on one next turn, you are caught."],
    done:["三層都走完了，墨窟底下已經走到盡頭。","All three levels are done: this is the very bottom of the ink cave."]}});
