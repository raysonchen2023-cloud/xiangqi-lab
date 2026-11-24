/* ---------- W87 飛相地底迷宮・第一層「水淹考棚」（開發者 11/24 選單：九派先做三派＋中炮門重改；Windows Claude 1 交辦、iMac Claude 1 寫）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的飛相門：守衛照「相」走田字、會被塞象眼，玩家推箱子塞住象眼改變地形。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE、onStep、lv.dyn）；這支只登記飛相這一層，不改共用程式。
   場景：貢院考棚被大雨淹過，號舍一排一排，中庭積水，泡水的考箱東倒西歪。
     ・號舍（上下兩排小隔間）：彎繞的窄道、死路，迷路感（開發者 11/24「更容易迷路的地圖（岔路、死路、暗門）」）；暗門 H、碑刻 L 照 m/07z9m-lore.js。
     ・巡場的相（JH_MZ_KIND.elephant）：照象棋的相走田字（斜走兩格）。中間那格（象眼）被擋就飛不過去；積水 W 是「河」，相不下水（相不過河）。
       它看得到的＝下一步能飛到的田字落點（地上畫紅）；玩家站在落點上就被逮，跟象棋「被相吃」一樣。象眼塞住的那個方向就沒有威脅。
     ・考箱 X：玩家往箱子走、箱子後面是空地，就把箱子推過去（算一步）；推去塞住象眼，相就飛不過來。箱子不能推進水裡、牆裡、別的箱子。
     ・殘局：開發者 11/24「如果有些沒有收尾的棋 例如相 那就換個其他方式設計 不要硬做出錯誤的」——相不能殺將，所以改出「解殺題」：
       黑方下一步就要將死紅方，紅方只有一步解得了圍。開石門的題目一律是「飛相解殺」，被逮的題目是仕、炮解殺。
       題目由 core.js 窮舉產生（紅方所有著法逐一試：只有解答那一步走了以後黑方一步殺不了），測試另外用 core.js 獨立重算；
       Windows Claude 1 用 Pikafish 深度 22 複核（W95），不合格的換題。kind:"defend" 讓殘局視窗把「將死」的說法換成「解圍」（#110）。 */
const JH_MZ_ELE_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T.#...#...#.T#",
"#..#.#.#.#.#..#",
"#.L#.#C..#.#..#",
"#..H.#####.#.##",
"#.....X.......#",
"#..W.......W..#",
"#.....WWW...X.#",
"#T.X..W.W..P.T#",
"#.....WWW.....#",
"#..W.......W..#",
"#....X........#",
"##.###.#.###.##",
"#..#L..#..#..C#",
"#.##.###.##.#.#",
"#.#..#C..#..#.#",
"#.#.##.###H##.#",
"#...#...#..L..#",
"#T.....@......#",
"###############"];
/* 相走田字的四個方向；巡場時照目前方向試，不行就順時針換方向 */
const JH_MZ_ELE_DIR=[[1,1],[1,-1],[-1,-1],[-1,1]];
const JH_MZ_ELE_GUARDS=[{kind:"elephant",x:2,y:9,dx:1,dy:1},{kind:"elephant",x:12,y:13,dx:-1,dy:-1}];
/* 相能不能從 (x,y) 往 (dx,dy) 飛：象眼不擋、落點不擋、落點不是水 */
function jhMzEleCan(S,x,y,dx,dy){return !jhMzSolid(S,x+dx,y+dy)&&!jhMzSolid(S,x+2*dx,y+2*dy)&&jhMzCell(S,x+2*dx,y+2*dy)!=="W"}
JH_MZ_KIND.elephant={
  /* 看得到的＝下一步能飛到的田字落點（象眼塞住、落點是牆或水的那個方向就沒有） */
  sight(S,G){const o=[];for(const[dx,dy]of JH_MZ_ELE_DIR)if(jhMzEleCan(S,G.x,G.y,dx,dy))o.push({x:G.x+2*dx,y:G.y+2*dy});return o},
  /* 巡場：照目前方向飛；不行就順時針換方向，四個方向都不行就原地等 */
  step(S,G){let i=JH_MZ_ELE_DIR.findIndex(([a,b])=>a===(G.dx||1)&&b===(G.dy||1));if(i<0)i=0;
    for(let k=0;k<4;k++){const[dx,dy]=JH_MZ_ELE_DIR[(i+k)%4];if(jhMzEleCan(S,G.x,G.y,dx,dy)){G.x+=2*dx;G.y+=2*dy;G.dx=dx;G.dy=dy;return}}},
  look:{body:"#2e3a4a",head:"#3c4a5c",eye:0xE24A3A}};
/* 推考箱：往 X 走、X 後面是空地（不是牆、水、箱子、也沒有相站著）就推過去，回 null 讓共用程式照常走一步、算回合、讓相動；推不動回 wall */
function jhMzElePush(S,dx,dy,c){if(c!=="X"||(!dx&&!dy))return null;const P=S.player,x1=P.x+dx,y1=P.y+dy,x2=x1+dx,y2=y1+dy,c2=jhMzCell(S,x2,y2);
  if(c2!=="."||(S.guards||[]).some(G=>G.x===x2&&G.y===y2))return{ev:"wall",msg:["考箱推不動：後面被擋住了。","The chest won't budge: something is behind it."]};
  S.grid[y2][x2]="X";S.grid[y1][x1]=".";return null}
/* 3D：泡水的考箱、積水；平面版 */
if(!JH_MZ_OBJ.X)JH_MZ_OBJ.X=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.62,.42,.5),lam("#6b4a2a"),0,.21,0));g.add(mesh(new T3.BoxGeometry(.66,.05,.54),lam("#4a3220"),0,.44,0));
  g.add(mesh(new T3.BoxGeometry(.64,.06,.52),lam("#3e5a5e"),0,.03,0));return g};
if(!JH_MZ_OBJ.W)JH_MZ_OBJ.W=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,.03,1),lam("#3f6670"),0,.018,0));return g};
if(!JH_MZ_TILE.X)JH_MZ_TILE.X=(cx,px,py,T)=>{cx.fillStyle="#6b4a2a";cx.fillRect(px+T*.18,py+T*.22,T*.64,T*.56);cx.strokeStyle="#2e1f12";cx.lineWidth=2;cx.strokeRect(px+T*.18,py+T*.22,T*.64,T*.56);
  cx.beginPath();cx.moveTo(px+T*.18,py+T*.22);cx.lineTo(px+T*.82,py+T*.78);cx.moveTo(px+T*.82,py+T*.22);cx.lineTo(px+T*.18,py+T*.78);cx.stroke()};
if(!JH_MZ_TILE.W)JH_MZ_TILE.W=(cx,px,py,T)=>{cx.fillStyle="#3f6670";cx.fillRect(px,py,T,T);cx.strokeStyle="rgba(210,235,240,.45)";cx.lineWidth=1.3;cx.beginPath();cx.moveTo(px+T*.15,py+T*.45);cx.quadraticCurveTo(px+T*.35,py+T*.35,px+T*.55,py+T*.45);cx.moveTo(px+T*.4,py+T*.72);cx.quadraticCurveTo(px+T*.6,py+T*.62,px+T*.85,py+T*.72);cx.stroke()};
/* 殘局題庫：解殺題（kind:"defend"）。line 只有一手＝紅方唯一能解圍的那一步。core.js 窮舉產生，Pikafish 複核前先用 */
const JH_MZ_ELE_POOL={
  door:[
    {kind:"defend",zh:["石門機關：飛相解殺","門上刻著一頭石象。黑方下一步就要將死紅方——紅方先走，找出唯一一步解圍的走法，門就會開。提示：相走田字，象眼塞住就飛不過去。"],en:["Stone door: the elephant saves the king","A stone elephant is carved on the door. Black threatens mate next move. Red to move: find the only move that stops it and the door opens. Hint: an elephant moves two squares diagonally and is blocked if the square between is occupied."],
     fen:"4k4/9/9/9/9/2r3B2/n7c/4BK3/9/2n2A3",line:["e2c4"]},
    {kind:"defend",zh:["石門機關：飛相解殺","黑方下一步就要將死紅方。紅方先走，找出唯一一步解圍的走法。"],en:["Stone door: the elephant saves the king","Black threatens mate next move. Red to move: find the only move that stops it."],
     fen:"9/9/4k4/9/n2r5/9/9/B2A5/1c3K3/2B6",line:["c0e2"]},
    {kind:"defend",zh:["石門機關：飛相解殺","黑方下一步就要將死紅方。紅方先走，找出唯一一步解圍的走法。"],en:["Stone door: the elephant saves the king","Black threatens mate next move. Red to move: find the only move that stops it."],
     fen:"9/9/4k4/9/9/2B3B2/c4p2r/9/4A1p2/3A1K3",line:["c4e2"]}],
  trap:[
    {kind:"defend",zh:["被巡場的相攔住了","巡場的相把你堵在號舍前：「解得了這一局，就放你過去。」黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],en:["Stopped by the patrolling elephant","The patrolling elephant blocks you at the exam cells: \"Save this game and you may pass.\" Black threatens mate next move. Red to move: find the only defence."],
     fen:"4k4/9/9/7C1/9/9/2n6/2p2K2B/4r4/9",line:["h6h3"]},
    {kind:"defend",zh:["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],en:["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],
     fen:"4k4/9/9/5C3/9/3r5/3n5/3K4B/9/3n2B2",line:["f6f3"]},
    {kind:"defend",zh:["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],en:["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],
     fen:"9/9/5k3/9/6r2/9/8C/B8/5c1c1/4K4",line:["i3g3"]},
    {kind:"defend",zh:["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],en:["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],
     fen:"4k4/9/9/9/9/9/4p4/5K2C/3r5/2BAr1c2",line:["d0e1"]},
    {kind:"defend",zh:["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],en:["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],
     fen:"9/2Ck5/9/9/6c2/9/3r5/4BA3/8r/4K4",line:["f2e1"]}]};
jhMzDef("elephant",{map:JH_MZ_ELE_MAP,guards:JH_MZ_ELE_GUARDS,pool:JH_MZ_ELE_POOL,puz:{door:JH_MZ_ELE_POOL.door[0],trap:JH_MZ_ELE_POOL.trap[0]},
  solid:"#DXHL",opaque:"#DH",jump:"",dyn:"X",onStep:jhMzElePush,
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"飛相譜殘頁",en:"Elephant Opening manual page"},{k:"box",zh:"考籃",en:"Examination basket"}],
  title:["🐘 水淹考棚","🐘 Flooded exam halls"],lvName:["水淹考棚・第一層","Flooded exam halls · Level 1"],back:["回飛相門","Back to the Elephant Opening School"],
  hall:{at:[560,860],zh:"🐘 考棚・地底號舍",en:"🐘 Exam halls · Underground cells"},
  intro:["你從考棚的排水溝鑽下去，底下的號舍淹過水，一片漆黑。<b>點地面就會走過去</b>，也可以用下面的方向鈕。走到壁燈旁邊會點亮它。","You crawl down the drain of the exam halls into flooded, pitch-dark cells. <b>Tap the floor to walk there</b>, or use the arrows below. Walk next to a wall lamp to light it."],
  warn:["<b>中庭有相在巡場。</b>相走田字，地上的紅格是它下一步飛得到的地方，站上去就會被逮。<b>把考箱推到它的象眼上</b>，那個方向就飛不過來；相也不下水。","<b>An elephant patrols the courtyard.</b> It moves two squares diagonally; the red squares are where it can land next, and standing on one gets you caught. <b>Push a chest onto the square in between</b> to block that direction. Elephants also avoid the water."],
  say:{door:["解圍了！相一飛擋住殺著，石門往兩旁滑開。","Saved! The elephant blocks the mate and the stone door slides apart."],trap:["解圍了！巡場的相愣住了，你趁機溜走。","Saved! The patrolling elephant freezes and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The steps down are right behind it.</b>"],dazed:["巡場的相頭昏眼花，<b>四回合內</b>不會動。","The elephant is dazed and <b>won't move for four turns</b>."],
    dragged:["相把你押回入口，還把你最後撿到的東西放回原來的箱子。","The elephant marches you back to the entrance and puts your last find back in its chest."],
    retry:["你被押回了入口。<b>相只能斜飛田字：別站在紅格上，或先把考箱推去塞住象眼。</b>","You were marched back. <b>An elephant only lands two squares diagonally: stay off the red squares, or push a chest onto the square in between first.</b>"],
    locked:["石門被機關鎖住了。<b>先在考棚裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate in the exam halls first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的號舍。第二、三層之後再開。","The steps lead down to deeper cells. Levels 2 and 3 open later."]}});
