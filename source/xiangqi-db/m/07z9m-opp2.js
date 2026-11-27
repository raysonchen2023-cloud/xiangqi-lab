/* ---------- W87-2 列炮地底迷宮・第二層「懸木暗層」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的列炮門第二層，照 208 複核（iMac Claude 1）和開發者 11/26 的決定改：
     ・墜落布景：走到觸發格（F，戲台上方吊布景的繩索機關）一次，上方的布景就降下來，落在 JH_MZ_OPP2_DROP 記的那幾格，永久變成擋路、擋光的布景（Y）；
       觸發過的 F 變回一般地面。布景要落的那一格有人或守衛站著就不落那一格。被拖回入口時布景照地圖原樣（重新開始那一趟）。
       自動規劃路線不主動踩觸發格（lv.avoid），踩到自動走就停。
     ・車衛（共用 JH_MZ_KIND.rook）在中間那條長廊來回、看得到整排（range 13）；布景落下來就把長廊切斷，擋住牠的視線、也縮短牠巡的那一段。
     ・將衛照第一層（JH_MZ_KIND.king：只在九宮外圈一格一格走，看緊鄰四格＋飛將）。
     ・機關殘局：側翼突破，馬收尾（有兵的優先；複核：雙馬留給屏風馬、起馬）；被抓殘局一律殺題（開發者決定），兵收尾（開發者 11/26 選單「換成馬、兵收尾」：用 --multi 出題，最快殺都算對）。
       開發者 11/26 選單：不同派可以重用題目，只在同一派各層之間不重複（出題的 --exclude 只排除列炮自己的各層）。
     ・碑刻：遊戲整理，據顧起元《客座贅語》（複核：可用）。
     ・寶箱：門派貢獻、列炮譜殘頁、稱號「粉墨登場」。 */
const JH_MZ_OPP2_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#.###.....###.#",
"#C#...........#",
"#.#........L..#",
"#.#.......#.#C#",
"#.###.#####.#.#",
"#.............#",
"#.#####.#####.#",
"#.#...#.#.F.#.#",
"#...#.....#...#",
"#.#.#.#P#.#.#.#",
"#C........#...#",
"#.###.###.###.#",
"#T...........T#",
"#......@......#",
"###############"];
/* 觸發格「x,y」→ 布景落下的那幾格 */
const JH_MZ_OPP2_DROP={"10,12":[[3,10],[9,10]]};
const JH_MZ_OPP2_GUARDS=[{kind:"rook",x:7,y:10,dx:1,dy:0,range:13},{kind:"king",pal:[5,5],i:0,x:5,y:5}];
/* 走進觸發格：布景落下（有人或守衛站著的那一格不落）、觸發格變回地面。回傳 null＝照預設走進去 */
function jhMzOpp2Drop(S,dx,dy,c){if(c!=="F")return null;const P=S.player,nx=P.x+dx,ny=P.y+dy,L=JH_MZ_OPP2_DROP[nx+","+ny];if(!L)return null;
  for(const[x,y]of L){if(S.grid[y][x]!==".")continue;if(P.x===x&&P.y===y)continue;if((S.guards||[]).some(G=>G.x===x&&G.y===y))continue;S.grid[y][x]="Y"}
  S.grid[ny][nx]=".";S.dropN=(S.dropN||0)+1;return null}
/* 3D：觸發格（地上一圈繩索和木扣）；落下的布景（一面直立的彩繪木板）。平面版各畫一格 */
if(!JH_MZ_OBJ.F)JH_MZ_OBJ.F=H=>{const{T3,mesh,lam}=H,g=new T3.Group();const m=mesh(new T3.TorusGeometry(.28,.04,6,18),lam("#a8865a"),0,.04,0);m.rotation.x=Math.PI/2;g.add(m);g.add(mesh(new T3.BoxGeometry(.14,.06,.14),lam("#5a3a1e"),0,.05,0));return g};
if(!JH_MZ_OBJ.Y)JH_MZ_OBJ.Y=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.96,1,.14),lam("#7a3a2a"),0,.5,0));g.add(mesh(new T3.BoxGeometry(.8,.7,.16),lam("#3a6a5a"),0,.55,0));return g};
if(!JH_MZ_TILE.F)JH_MZ_TILE.F=(cx,px,py,T)=>{cx.fillStyle="#3b3428";cx.fillRect(px,py,T,T);cx.strokeStyle="#a8865a";cx.lineWidth=3;cx.beginPath();cx.arc(px+T/2,py+T/2,T*.28,0,Math.PI*2);cx.stroke()};
if(!JH_MZ_TILE.Y)JH_MZ_TILE.Y=(cx,px,py,T)=>{cx.fillStyle="#7a3a2a";cx.fillRect(px,py,T,T);cx.fillStyle="#3a6a5a";cx.fillRect(px+T*.15,py+T*.15,T*.7,T*.7)};
/* ==JH_MZ_POOL:JH_MZ_POOL_OPP2== */
const JH_MZ_POOL_OPP2={door:[
{"id":"lk054c7","src":{"book":"爛柯神機","title":"功歸轉軸"},"zh":["石門機關：側翼突破","門上刻著戲台側邊的上場門。紅方先走，3 步將死黑方，門就會開。提示：從側翼繞進去，其中一種解法是最後由馬將死。"],"en":["Stone door: break through the flank","The side entrance to the stage is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: come in from the flank; one solution ends with a horse giving mate."],"fen":"3a1N3/8R/1NC2k3/4p4/9/9/6P2/9/2pp1pp2/r1c1K4","line":["f9h8","f7e7","h8g6","e7d7","b7c9"]},
{"id":"lk072c7","src":{"book":"爛柯神機","title":"季庭舞俏"},"zh":["石門機關：側翼突破","門上刻著戲台側邊的上場門。紅方先走，3 步將死黑方，門就會開。提示：從側翼繞進去，其中一種解法是最後由馬將死。"],"en":["Stone door: break through the flank","The side entrance to the stage is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: come in from the flank; one solution ends with a horse giving mate."],"fen":"9/2NP5/5k3/3n1C3/2r6/9/9/4p4/3pCp3/4K4","line":["c8d6","f7f8","d8e8","f8f9","d6f7"]},
{"id":"lk119c8","src":{"book":"爛柯神機","title":"匹馬盤旋"},"zh":["石門機關：側翼突破","門上刻著戲台側邊的上場門。紅方先走，3 步將死黑方，門就會開。提示：從側翼繞進去，其中一種解法是最後由馬將死。"],"en":["Stone door: break through the flank","The side entrance to the stage is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: come in from the flank; one solution ends with a horse giving mate."],"fen":"3k3C1/4P4/4b3b/3n5/3N5/3C5/8r/4p4/4p4/5K3","line":["d5b6","d6b5","b6d7","b5d4","d7b8"],"alt":{"d5b6":["d6b5",{"b6d7":["b5d4",{"d7b8":0}]}],"d5f6":["d6b5",{"f6d7":["b5d4",{"d7b8":0}]}]}}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_OPP2== */
/* ==JH_MZ_POOL:JH_MZ_POOL_OPP2_TRAP== */
const JH_MZ_POOL_OPP2_TRAP={door:[
],
trap:[
{"id":"lk204c6","src":{"book":"爛柯神機","title":"雪夜擒濟"},"zh":["被戲班守衛逮住了","守衛把你押在布景後面，攤開一張舊戲譜：「譜背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a troupe guard","The guard holds you behind the scenery and unrolls an old score: \"Solve the game on the back and you can go.\" Red to move: checkmate in 3."],"fen":"3k1c3/3nP4/4R3b/9/9/9/9/2pK5/2p2p3/7C1","line":["d2e2","d8b7","e7d7","b7d8","e8d8"],"alt":{"d2e2":["d8b7",{"e7d7":["b7d8",{"e8d8":0,"d7d8":0,"e8e9":0}]}]}},
{"id":"lk220c7","src":{"book":"爛柯神機","title":"意外得勝"},"zh":["被戲班守衛逮住了","守衛把你押在布景後面，攤開一張舊戲譜：「譜背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a troupe guard","The guard holds you behind the scenery and unrolls an old score: \"Solve the game on the back and you can go.\" Red to move: checkmate in 3."],"fen":"6P2/4k2C1/2PN5/9/9/9/9/5K3/3p1p3/9","line":["d7c9","e8d8","h8h9","d1d0","c7d7"],"alt":{"d7c9":["e8d8",{"h8h9":["d1d0",{"c7d7":0}],"c7d7":["d8d9",{"h8h9":0}]}],"g9f9":["d1c1",{"d7f8":["e8e7",{"c7d7":0}]}],"h8h9":["d1c1",{"d7c9":["e8d8",{"c7d7":0}]}]}},
{"id":"lk229c5","src":{"book":"爛柯神機","title":"誘鹿入蕉"},"zh":["被戲班守衛逮住了","守衛把你押在布景後面，攤開一張舊戲譜：「譜背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a troupe guard","The guard holds you behind the scenery and unrolls an old score: \"Solve the game on the back and you can go.\" Red to move: checkmate in 3."],"fen":"5k3/3P2P2/c1Pa1P3/4C4/6b2/9/9/9/3p1Kp2/4p4","line":["f1f2","e0d0","f7f8","f9e9","f8f9"],"alt":{"f1f2":["e0d0",{"f7f8":["f9e9",{"f8f9":0,"f8e8":0}],"d8d9":["a7a0",{"e6f6":0,"f7f8":0,"g8f8":0,"g8g9":0}],"d8e8":["a7a0",{"e6f6":0,"f7f8":0,"g8f8":0,"g8g9":0}]}]}},
{"id":"lk241","src":{"book":"爛柯神機","title":"直搗黃龍-紅勝-01"},"zh":["被戲班守衛逮住了","守衛把你押在布景後面，攤開一張舊戲譜：「譜背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a troupe guard","The guard holds you behind the scenery and unrolls an old score: \"Solve the game on the back and you can go.\" Red to move: checkmate in 3."],"fen":"2P1ka1P1/3PaP2R/2n1b1n2/3NpP3/9/2c6/9/9/4pr3/3K1C1r1","line":["d8d9","e8d9","d6c8","c4c8","c9d9"]},
{"id":"mr002","src":{"book":"夢入神機","title":"弋不射宿"},"zh":["被戲班守衛逮住了","守衛把你押在布景後面，攤開一張舊戲譜：「譜背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a troupe guard","The guard holds you behind the scenery and unrolls an old score: \"Solve the game on the back and you can go.\" Red to move: checkmate in 3."],"fen":"3akab2/Rc1Pn4/7C1/6pN1/1r7/9/9/9/2pC5/3K2B1r","line":["h7e7","e8g7","h6g8","b8g8","d8e8"]},
{"id":"mr043c4","src":{"book":"夢入神機","title":"黃鸝出谷-02"},"zh":["被戲班守衛逮住了","守衛把你押在布景後面，攤開一張舊戲譜：「譜背面這局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a troupe guard","The guard holds you behind the scenery and unrolls an old score: \"Solve the game on the back and you can go.\" Red to move: checkmate in 3."],"fen":"1C3kc1c/2N1P4/b8/4P4/9/9/9/9/4p3r/3K5","line":["e8e9","f9f8","b9b8","f8f7","e6f6"],"alt":{"e8e9":["f9f8",{"b9b8":["f8f7",{"e6f6":0,"e6e7":0}]}]}}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_OPP2_TRAP== */
jhMzLayer("opposite_cannon",2,{map:JH_MZ_OPP2_MAP,guards:JH_MZ_OPP2_GUARDS,solid:"#DoYL",opaque:"#DoYL",avoid:"F",onStep:jhMzOpp2Drop,
  pool:{door:JH_MZ_POOL_OPP2.door,trap:JH_MZ_POOL_OPP2_TRAP.trap},puz:{door:JH_MZ_POOL_OPP2.door[0],trap:JH_MZ_POOL_OPP2_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"列炮譜殘頁",en:"Opposite Cannons manual page"},{k:"title",zh:"稱號「粉墨登場」",en:"Title: Painted and on stage"}],
  lore:[{id:"oc4",kind:"doc",title:["戲班筆記","A troupe's notebook"],
    body:["筆記上記著南京看戲的風氣：萬曆以後，南京的戲班多改唱崑山腔，戲服、扮相越做越講究，看戲的人也越來越多。","The notebook records the theatre-going of Nanjing: after the Wanli years most troupes there switched to the Kunshan style, the costumes and make-up grew ever finer, and ever more people came to watch."],
    src:"遊戲整理，據顧起元《客座贅語》；筆記本身是遊戲虛構"}],
  title:["🎭 懸木暗層","🎭 Hanging-scenery loft"],lvName:["懸木暗層・第二層","Hanging-scenery loft · Level 2"],
  intro:["石階往下，頭頂吊著一片片舊布景，繩索垂到地上。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>踩到地上的繩扣，布景就會落下來</b>；自動走不會主動踩。",
    "Down the steps, old painted scenery hangs overhead with ropes trailing to the floor. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Step on a rope knot and the scenery comes down</b>; auto-walk won't step on one by itself."],
  warn:["<b>中間的長廊有車衛來回巡，一整排都看得到。</b>先去踩繩扣把布景放下來，長廊被截斷，牠就看不到另一頭。上面的九宮還有將衛：同一直行、中間沒東西擋，多遠都看得到。",
    "<b>A chariot guard paces the long middle corridor and sees the whole row.</b> Pull a rope knot first: the scenery drops and cuts the corridor, so it can't see past. In the palace above there's a general guard too: anything in the same column with nothing in between, it sees however far."],
  say:{door:["將死！側翼一擊得手，石門往兩旁滑開。","Checkmate! The flank strike lands and the stone door slides apart."],trap:["將死！守衛愣在原地，你趁機脫身。","Checkmate! The guard freezes and you slip away."],
    dazed:["守衛暈頭轉向，<b>四回合內</b>不會動。","The guard is dazed and <b>won't move for four turns</b>."],
    dragged:["守衛把你拖回入口，布景也吊回去了，你最後撿到的東西放回原來的箱子。","The guard drags you back to the entrance, the scenery is hoisted back up, and your last find goes back in its chest."],
    retry:["你被拖回了入口。<b>先去踩繩扣把布景放下來，截斷長廊再走。</b>","You were dragged back. <b>Pull the rope knot first to cut the corridor, then cross.</b>"],
    locked:["石門被機關鎖住了。<b>先在暗層裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the loft first.</b>"],
    spot:["<b>守衛轉過頭來看見你了！</b>趕快離開紅線——下一步還在紅線上就會被逮住。","<b>A guard turns and spots you!</b> Get off the red line now: if you are still on it next turn, you are caught."],
    done:["石階往下通到舊譜戲箱，第三層之後再開。","The steps lead down to the old score chests. Level 3 opens later."]}});
