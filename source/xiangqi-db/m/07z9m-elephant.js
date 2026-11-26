/* ---------- W87 飛相地底迷宮・第一層「水淹考棚」（開發者 11/24 選單：九派先做三派＋中炮門重改；Windows Claude 1 交辦、iMac Claude 1 寫）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的飛相門：守衛照「相」走田字、會被塞象眼，玩家推箱子塞住象眼改變地形。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE、onStep、lv.dyn）；這支只登記飛相這一層，不改共用程式。
   場景：貢院考棚被大雨淹過，號舍一排一排，中庭積水，泡水的考箱東倒西歪。
     ・號舍（上下兩排小隔間）：彎繞的窄道、死路，迷路感（開發者 11/24「更容易迷路的地圖（岔路、死路、暗門）」）；暗門 H、碑刻 L 照 m/07z9m-lore.js。
     ・巡場的相（JH_MZ_KIND.elephant）：照象棋的相走田字（斜走兩格）。中間那格（象眼）被擋就飛不過去；積水 W 是「河」，相不下水（相不過河）。
       它看得到的＝下一步能飛到的田字落點（地上畫紅）；玩家站在落點上就被逮，跟象棋「被相吃」一樣。象眼塞住的那個方向就沒有威脅。
     ・考箱 X：玩家往箱子走、箱子後面是空地，就把箱子推過去（算一步）；推去塞住象眼，相就飛不過來。箱子不能推進水裡、牆裡、別的箱子。
     ・殘局：開發者 11/24「如果有些沒有收尾的棋 例如相 那就換個其他方式設計 不要硬做出錯誤的」——相不能殺將，所以改出「解殺題」：
       黑方下一步就要將死紅方，紅方只有一步解得了圍。開石門的題目一律是「飛相解殺」，被逮的題目是補相、補仕、車回防。
       題目取自大師實戰對局、Pikafish 深度 22 驗過（見下方題庫說明），測試另外用 core.js 獨立重算。kind:"defend" 讓殘局視窗把「將死」的說法換成「解圍」（#110）。 */
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
/* 殘局題庫：解殺題（kind:"defend"），line 只有一手＝紅方唯一能解圍的那一步。
   題源（Windows Claude 1，W95）：31,531 局大師對局主線、112 萬個紅方該走的局面，core.js 初篩後用 Pikafish 深度 22 複驗：
   紅方不動黑方有殺；解答以外每一手黑方 3 步內殺；解答之後黑方 5 步內殺不了、而且 cp ≥ -300（解完圍局面還下得下去）。
   開石門 3 題都是動相；被逮 5 題是補相、補仕、車回防。古譜殘局多半是殺題、掃不到合格的解殺題，所以用大師實戰對局，src 記對局名、年份、第幾手。
   第一次 core.js 窮舉出的 8 題，Pikafish 判解答之後 2～8 步照樣被殺，已全部換掉。 */
const JH_MZ_ELE_POOL={
  door:[
    {"kind": "defend", "zh": ["石門機關：飛相解殺", "門上刻著一頭石象。黑方下一步就要將死紅方——紅方先走，找出唯一一步解圍的走法，門就會開。提示：相走田字，象眼塞住就飛不過去。"], "en": ["Stone door: the elephant saves the king", "A stone elephant is carved on the door. Black threatens mate next move. Red to move: find the only move that stops it and the door opens. Hint: an elephant moves two squares diagonally and is blocked if the square between is occupied."], "fen": "5k3/2N1a4/9/3P4c/9/5CB2/5p3/3A5/4AK1n1/9", "line": ["g4i2"], "src": {"book": "大師對局", "title": "中院杭州分院-王天一-勝-龍江棋牌中心-郝繼超", "year": 2018, "ply": 152}, "verify": {"engine": "Pikafish", "depth": 22, "after": {"cp": 128}}},
    {"kind": "defend", "zh": ["石門機關：飛相解殺", "黑方下一步就要將死紅方。紅方先走，找出唯一一步解圍的走法。"], "en": ["Stone door: the elephant saves the king", "Black threatens mate next move. Red to move: find the only move that stops it."], "fen": "2bakab1C/9/4cc3/pC1r2p2/2p3P2/9/P3P3P/9/1n2AR3/2BAK1R2", "line": ["c0e2"], "src": {"book": "大師對局", "title": "1999年-11月10日莊玉庭先勝尚威-鎮江市", "year": 1999, "ply": 50}, "verify": {"engine": "Pikafish", "depth": 22, "after": {"cp": 234}}},
    {"kind": "defend", "zh": ["石門機關：飛相解殺", "黑方下一步就要將死紅方。紅方先走，找出唯一一步解圍的走法。"], "en": ["Stone door: the elephant saves the king", "Black threatens mate next move. Red to move: find the only move that stops it."], "fen": "4k4/2P3P2/3a1a3/8N/5c3/3p5/9/9/3K5/6B2", "line": ["g0e2"], "src": {"book": "大師對局", "title": "13-輪-6場-1臺-廣東碧桂園-許國義-先勝-杭州協會-郭鳳達", "year": 2016, "ply": 174}, "verify": {"engine": "Pikafish", "depth": 22, "after": {"cp": 9}}}],
  trap:[
    {"kind": "defend", "zh": ["被巡場的相攔住了", "巡場的相把你堵在號舍前：「解得了這一局，就放你過去。」黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍——補相、補仕、車馬回防都有可能。"], "en": ["Stopped by the patrolling elephant", "The patrolling elephant blocks you at the exam cells: \"Save this game and you may pass.\" Black threatens mate next move. Red to move: find the only defence. It might be an elephant, an advisor, or a piece coming back to defend."], "fen": "2baka3/9/2n1b1n2/p3p1C1p/9/2R2NP2/P1P1P3P/4B1C1R/Nr7/1cBcK4", "line": ["e2g0"], "src": {"book": "大師對局", "title": "第02輪-北京-雲南1-第01臺-唐丹-先勝-趙冠芳", "year": 2011, "ply": 36}, "verify": {"engine": "Pikafish", "depth": 22, "after": {"cp": -64}}},
    {"kind": "defend", "zh": ["被巡場的相攔住了", "黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"], "en": ["Stopped by the patrolling elephant", "Black threatens mate next move. Red to move: find the only defence."], "fen": "2ba1kb2/4a4/2c1c1n2/p4NR1p/5rC2/2P6/P5p1P/4B4/4A2N1/2BAK4", "line": ["c0a2"], "src": {"book": "大師對局", "title": "第02輪-第05臺-上海隊-謝靖-先和-大連隊-趙金成", "year": 2013, "ply": 50}, "verify": {"engine": "Pikafish", "depth": 22, "after": {"cp": -23}}},
    {"kind": "defend", "zh": ["被巡場的相攔住了", "黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"], "en": ["Stopped by the patrolling elephant", "Black threatens mate next move. Red to move: find the only defence."], "fen": "4kab2/4a4/6c2/p8/4P1R1p/9/P3R3P/4B3N/3r5/2rAKAB2", "line": ["f0e1"], "src": {"book": "大師對局", "title": "吉林-陶漢明-勝-河北-申鵬", "year": 2005, "ply": 52}, "verify": {"engine": "Pikafish", "depth": 22, "after": {"cp": 125}}},
    {"kind": "defend", "zh": ["被巡場的相攔住了", "黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"], "en": ["Stopped by the patrolling elephant", "Black threatens mate next move. Red to move: find the only defence."], "fen": "9/4ak3/4Na3/3R5/9/2P6/9/2pA1A3/3K5/4r4", "line": ["d2e1"], "src": {"book": "大師對局", "title": "廣東-許銀川-勝-開灤-宋國強", "year": 2005, "ply": 132}, "verify": {"engine": "Pikafish", "depth": 22, "after": {"cp": 0}}},
    {"kind": "defend", "zh": ["被巡場的相攔住了", "黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"], "en": ["Stopped by the patrolling elephant", "Black threatens mate next move. Red to move: find the only defence."], "fen": "3k1ab2/4a4/9/C5p2/5r3/6P2/Pn2c4/C3B2R1/4A4/2BAK4", "line": ["h2f2"], "src": {"book": "大師對局", "title": "1-輪-1臺-5局-北方隊-趙國榮-先和-南方隊-鄭惟桐", "year": 2016, "ply": 56}, "verify": {"engine": "Pikafish", "depth": 22, "after": {"cp": 0}}}]};
/* 碑刻、殘簡、文書（m/07z9m-lore.js 讀 lore，照地圖上 L 由上到下對應）：Gemini 11/24 初稿，iMac Claude 1 依史學複核修正——號舍、搜檢寫明是明清／清代制度；
   搜檢拿掉沒根據的「割鞋底」改「衣服鞋襪只准單層」；天順七年貢院火災拿掉「大門緊鎖」。title／body 是遊戲整理的白話，src 是查得到的史料 */
const JH_MZ_ELE_LORE=[
  {id:"kp1",kind:"doc",title:["貢院號舍圖","Plan of the exam cells"],
   body:["文書畫著明清貢院的號舍：一間寬約三尺、深約四尺，沒有門。牆上兩道磚托架兩塊木板，白天一高一低當桌椅寫卷，夜裡拼平了，考生就蜷在上面過夜。",
     "Exam cells in Ming and Qing examination halls were about three feet wide and four deep, with no door. Two boards on brick ledges served as desk and seat by day, and were laid flat as a bed at night."],
   src:"《清稗類鈔・考試類》"},
  {id:"kp2",kind:"slip",title:["入場搜檢條規","Search rules at the gate"],
   body:["殘簡抄著清代入場搜檢的規矩：衣服鞋襪只准單層，硯台不許太厚，筆管要鏤空，糕餅都得切開，防的是夾帶小抄。查出夾帶的，要枷號示眾。",
     "Qing rules for entering the exam: clothes and shoes single-layered only, inkstones not too thick, brush handles hollowed, cakes cut open, all to stop hidden notes. Anyone caught was put in the cangue for all to see."],
   src:"《欽定科場條例》搜檢；《清史稿・選舉志》"},
  {id:"kp3",kind:"stele",title:["天順貢院大火","The Tianshun exam-hall fire"],
   body:["碑上記著明英宗天順七年（1463）會試，貢院失火，舉子死了九十多人。朝廷下詔收葬死者，會試改到秋天重考。",
     "In 1463, during the metropolitan exam, the examination hall in Beijing caught fire and more than ninety candidates died. The court had them buried and held the exam again that autumn."],
   src:"《明史・五行志》；《明英宗實錄》"}];
jhMzDef("elephant",{map:JH_MZ_ELE_MAP,guards:JH_MZ_ELE_GUARDS,pool:JH_MZ_ELE_POOL,puz:{door:JH_MZ_ELE_POOL.door[0],trap:JH_MZ_ELE_POOL.trap[0]},
  solid:"#DXHL",opaque:"#DH",jump:"",dyn:"X",onStep:jhMzElePush,
  tex:{floor:"data/maze/tex/elephant_floor.webp",side:"data/maze/tex/elephant_wall.webp"},lore:JH_MZ_ELE_LORE,   /* 像素材質（11/24 新版，發布時上 CDN）；碑刻內容 */
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"飛相譜殘頁",en:"Elephant Opening manual page"},{k:"box",zh:"考籃",en:"Examination basket"}],
  title:["🐘 水淹考棚","🐘 Flooded exam halls"],lvName:["水淹考棚・第一層","Flooded exam halls · Level 1"],back:["回飛相門","Back to the Elephant Opening School"],
  hall:{at:[560,860],zh:"🐘 考棚・地底號舍",en:"🐘 Exam halls · Underground cells"},
  intro:["你從考棚的排水溝鑽下去，底下的號舍淹過水，一片漆黑。<b>點地面就會走過去</b>，也可以按住角落的搖桿，往要去的方向推。走到壁燈旁邊會點亮它。","You crawl down the drain of the exam halls into flooded, pitch-dark cells. <b>Tap the floor to walk there</b>, or hold the joystick in the corner and push the way you want to go. Walk next to a wall lamp to light it."],
  warn:["<b>中庭有相在巡場。</b>相走田字，地上的紅格是它下一步飛得到的地方，站上去就會被逮。<b>把考箱推到它的象眼上</b>，那個方向就飛不過來；相也不下水。","<b>An elephant patrols the courtyard.</b> It moves two squares diagonally; the red squares are where it can land next, and standing on one gets you caught. <b>Push a chest onto the square in between</b> to block that direction. Elephants also avoid the water."],
  say:{door:["解圍了！相一飛擋住殺著，石門往兩旁滑開。","Saved! The elephant blocks the mate and the stone door slides apart."],trap:["解圍了！巡場的相愣住了，你趁機溜走。","Saved! The patrolling elephant freezes and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The steps down are right behind it.</b>"],dazed:["巡場的相頭昏眼花，<b>四回合內</b>不會動。","The elephant is dazed and <b>won't move for four turns</b>."],
    dragged:["相把你押回入口，還把你最後撿到的東西放回原來的箱子。","The elephant marches you back to the entrance and puts your last find back in its chest."],
    retry:["你被押回了入口。<b>相只能斜飛田字：別站在紅格上，或先把考箱推去塞住象眼。</b>","You were marched back. <b>An elephant only lands two squares diagonally: stay off the red squares, or push a chest onto the square in between first.</b>"],
    locked:["石門被機關鎖住了。<b>先在考棚裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate in the exam halls first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的號舍。第二、三層之後再開。","The steps lead down to deeper cells. Levels 2 and 3 open later."]}});
