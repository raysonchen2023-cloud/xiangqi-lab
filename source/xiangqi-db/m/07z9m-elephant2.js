/* ---------- W87-2 飛相地底迷宮・第二層「淤泥闈場」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；第二層分工 Windows Claude 1）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的飛相第二層，加上 iMac Claude 1 兩份複核與開發者 11/26 選單：
     ・新地形「深淤泥」（U）：走進去就一路往同一個方向滑，直到離開淤泥或前面被擋住（牆、考箱、碑、守衛）；滑完自動走停下（afterMove 回 stop:true）。
       淤泥算平地，不是河：相可以落在淤泥上。自動走不主動踩淤泥（lv.avoid），點的終點就是淤泥可以。
     ・考箱 X 可以推進淤泥裡當「煞車」：箱子擋路，滑到箱子前面就停。箱子推開以後，底下原本是淤泥的照樣是淤泥。
     ・守衛照第一層的「相」（JH_MZ_KIND.elephant：田字、塞象眼、不下水 W），中間一排水是「河」，兩隻相各守半場。
     ・殘局：石門是「飛相掩護、馬收尾」的殺題；被抓照開發者 11/26 選單「飛相照舊出解殺題」（kind:"defend"），題目取自 W95 那批大師對局、
       Pikafish 深度 22 驗過的解殺題，扣掉第一層用過的 8 題，挑子少、解法有補仕、車回防、馬回防的 6 題。
   共用程式在 m/07z9m-maze.js（jhMzLayer、onStep、afterMove）；相的走法 JH_MZ_KIND.elephant、jhMzEleCan 在 m/07z9m-elephant.js（m.html 排在前面）。
   修為：第二層 +40（共用）。頭像框等新外觀出圖前要先問開發者，這一層寶箱先用現有獎勵。環境音照複核拿掉「沉重的呼吸聲」，只疊踩泥聲。 */
const JH_MZ_ELE2_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#.UUUU...UUUU.#",
"#.....X.X.....#",
"#L.UUU...UUU.C#",
"#.............#",
"#WWWWW.P.WWWWW#",
"#.............#",
"#.UUUU...UUUU.#",
"#..X.......X..#",
"#.UUU.....UUU.#",
"#T....C......T#",
"###.###.###.###",
"#.....#.#.....#",
"#..L..#.#..C..#",
"#T.....@......#",
"###############"];
const JH_MZ_ELE2_GUARDS=[{kind:"elephant",x:3,y:4,dx:1,dy:1},{kind:"elephant",x:11,y:14,dx:-1,dy:-1}];
/* 格子底下原本是什麼（推走箱子以後還原用）：地圖上是淤泥就是淤泥，其他一律平地 */
const jhMzEle2Under=(S,x,y)=>(S.lv.map[y]||"")[x]==="U"?"U":".";
/* 推考箱：箱子後面是平地或淤泥（沒有相站著）就推過去；箱子離開的格子照原本地形還原 */
function jhMzEle2Push(S,dx,dy,c){if(c!=="X"||(!dx&&!dy))return null;const P=S.player,x1=P.x+dx,y1=P.y+dy,x2=x1+dx,y2=y1+dy,c2=jhMzCell(S,x2,y2);
  if((c2!=="."&&c2!=="U")||(S.guards||[]).some(G=>G.x===x2&&G.y===y2))return{ev:"wall",msg:["考箱推不動：後面被擋住了。","The chest won't budge: something is behind it."]};
  S.grid[y2][x2]="X";S.grid[y1][x1]=jhMzEle2Under(S,x1,y1);return null}
/* 淤泥：站在淤泥上就照剛才的方向一直滑，前面是牆、箱子、碑或有相站著就停；離開淤泥那一格停下 */
function jhMzEle2Slide(S,dx,dy){const P=S.player;let n=0;
  while(jhMzCell(S,P.x,P.y)==="U"){const x=P.x+dx,y=P.y+dy;if(jhMzSolid(S,x,y)||(S.guards||[]).some(G=>G.x===x&&G.y===y))break;P.x=x;P.y=y;if(++n>40)break}
  return jhMzCell(S,P.x,P.y)==="U"||n?{stop:true,slide:n}:null}
/* 3D：淤泥是一層深褐色、帶幾個泥泡；平面版 */
JH_MZ_OBJ.U=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,.04,1),lam("#4a3a26"),0,.02,0));
  for(const[a,z,s]of[[-.2,.15,.07],[.22,-.12,.05],[.05,.3,.04]])g.add(mesh(new T3.SphereGeometry(s,6,4),lam("#5e4a32"),a,.04,z));return g};
JH_MZ_TILE.U=(cx,px,py,T)=>{cx.fillStyle="#4a3a26";cx.fillRect(px,py,T,T);cx.fillStyle="#6a5338";
  for(const[a,b,r]of[[.3,.35,.08],[.65,.6,.06],[.45,.78,.05]]){cx.beginPath();cx.arc(px+a*T,py+b*T,r*T,0,7);cx.fill()}};
/* 被抓的解殺題（kind:"defend"）：line 只有一手＝紅方唯一能解圍的那一步。題源同第一層（W95：大師對局主線、Pikafish 深度 22），扣掉第一層 8 題 */
/* ==ELE2_TRAP== */
const JH_MZ_ELE2_TRAP=[
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍——補仕、車馬回防都有可能。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"9/4ak3/5a3/2NR5/9/2P6/9/2pA1A3/3K5/4r4","line":["d2e1"],"src":{"book":"大師對局","title":"廣東-許銀川-勝-開灤-宋國強","year":2005,"ply":142},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":0}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"4k4/9/9/9/6b1R/6B1P/7r1/3K5/9/9","line":["i5i9"],"src":{"book":"大師對局","title":"07-LS0019","year":2007,"ply":164},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":0}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"3k5/9/9/9/9/9/9/3p1A1N1/6n2/2BK1A3","line":["h2f1"],"src":{"book":"大師對局","title":"楊官璘-(先和)柳大華","year":1985,"ply":310},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":-4}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"3aka3/9/4b4/R8/2b2NP2/9/2c1P4/4r4/4N4/3AKA3","line":["a6a0"],"src":{"book":"大師對局","title":"19810501-錢洪發和柳大華","year":1981,"ply":62},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":0}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"3k1ab2/9/b4a3/9/9/9/6R2/3AB4/2r1p1nN1/2BK5","line":["g3d3"],"src":{"book":"大師對局","title":"湖北-洪智-和-四川-鄭惟桐","year":2012,"ply":120},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":-89}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"2bak4/4a4/4b4/9/1P5P1/3N5/9/4B1n1C/3p5/c1BAKA3","line":["d4c2"],"src":{"book":"大師對局","title":"04-LS0504","year":2004,"ply":86},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":9}}}];
/* ==/ELE2_TRAP== */
/* 石門題庫：「馬收尾」的 2、3 步殺（飛相掩護、馬收尾；古譜加實戰對局、子數放寬到 24，因為沒用過的馬收尾題很少），出題工具 maze-puzzles.js、Pikafish 深度 20 驗唯一解。
   重跑比對（在 source/ 底下）：見 PR 描述的完整指令（--name JH_MZ_POOL_ELE2 --mate N --n 2,3 --door 3 --trap 0 --max-pieces 24 --allow-games … --check） */
/* ==JH_MZ_POOL:JH_MZ_POOL_ELE2== */
const JH_MZ_POOL_ELE2={door:[
{"id":"lk200c7","src":{"book":"爛柯神機","title":"挾彈馳驅"},"zh":["石門機關：飛相掩護、馬收尾","門上刻著一頭石象和一匹馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the elephant covers, the horse finishes","An elephant and a horse are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse delivers the final blow."],"fen":"2b6/4k1P2/4b4/9/4N4/4C4/9/7r1/4p4/3K5","line":["e5g6","e7g9","g8f8","e8e9","g6e7"]},
{"id":"lk236","src":{"book":"爛柯神機","title":"運實於虛"},"zh":["石門機關：飛相掩護、馬收尾","門上刻著一頭石象和一匹馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the elephant covers, the horse finishes","An elephant and a horse are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse delivers the final blow."],"fen":"4ka3/3Pn4/5R3/5N3/9/9/1r1n5/9/4p4/3K5","line":["d8d9","e9d9","f7d7","d9e9","f6g8"]},
{"id":"lk252c5","src":{"book":"爛柯神機","title":"縱橫馳驟"},"zh":["石門機關：飛相掩護、馬收尾","門上刻著一頭石象和一匹馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the elephant covers, the horse finishes","An elephant and a horse are carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse delivers the final blow."],"fen":"3n5/3N1k3/9/9/9/9/9/3n5/3r1r3/C3K4","line":["a0a8","d9b8","d8e6","f8f9","e6g7"]}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_ELE2== */
const JH_MZ_ELE2_POOL={door:JH_MZ_POOL_ELE2.door,trap:JH_MZ_ELE2_TRAP};
jhMzLayer("elephant",2,{map:JH_MZ_ELE2_MAP,guards:JH_MZ_ELE2_GUARDS,pool:JH_MZ_ELE2_POOL,puz:{door:JH_MZ_ELE2_POOL.door[0],trap:JH_MZ_ELE2_POOL.trap[0]},
  solid:"#DXHL",opaque:"#DH",jump:"",dyn:"X",avoid:"U",onStep:jhMzEle2Push,afterMove:jhMzEle2Slide,
  title:["🐘 淤泥闈場","🐘 Mud-choked exam yard"],lvName:["淤泥闈場・第二層","Mud-choked exam yard · Level 2"],
  intro:["石階再往下，是被淤泥灌滿的考場。<b>踩進深淤泥會一路滑到底</b>，前面有考箱、牆擋住才停。考箱可以推進淤泥裡當煞車。",
    "Further down, the exam yard is choked with mud. <b>Step into deep mud and you slide all the way</b> until a chest or a wall stops you. Push a chest into the mud to use it as a brake."],
  warn:["<b>巡場的相還在。</b>相走田字，地上紅色的是牠下一步能落的地方；<b>象眼塞住的方向牠就飛不過來</b>。中間那一排水是河，相不過河。",
    "<b>The patrolling elephants are still here.</b> An elephant moves two squares diagonally; red marks where it can land next. <b>Block the middle square and it can't fly that way.</b> The water in the middle is the river; elephants never cross it."],
  lore:[{title:["泗州水患","Floods at Sizhou"],
    body:["萬曆年間，淮水屢次漲溢，泗州城一帶常被水淹，街巷泥濘不堪。（遊戲整理）","In the Wanli years the Huai River flooded again and again; Sizhou was often under water and its streets deep in mud. (Summarized for the game.)"],
    src:"遊戲整理，據曾惟誠《帝鄉紀略》"}],
  say:{door:["將死！相把路讓開，馬一躍收尾，石門往兩旁滑開。","Checkmate! The elephant clears the way, the horse leaps in to finish, and the door slides apart."],
    trap:["解圍了！巡場的相愣在原地，你趁機溜走。","Defended! The patrolling elephant stands stunned and you slip away."],
    retry:["你被押回了入口。<b>淤泥會讓你停不下來，先把考箱推進去當煞車。</b>","You were marched back. <b>Mud won't let you stop: push a chest in first as a brake.</b>"],
    done:["考場盡頭還有往下的石階，第三層之後再開。","At the far end of the yard more steps lead down. Level 3 opens later."]}});
