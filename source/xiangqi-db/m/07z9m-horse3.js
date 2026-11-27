/* ---------- W87-2 起馬地底迷宮・第三層「急遞暗房」（開發者 11/26「現在開工」做第三層；第三層分工 Windows Claude 1）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的起馬第三層，加上 iMac Claude 1 兩份複核與開發者 11/26 選單：
     ・新地形「單向驛門」：j＝只能往東（右）穿過、k＝只能往北（上）穿過。人走進驛門那一格要照門的方向，反方向撞到＝撞牆、不算回合；
       自動走找路照這條規則（lv.canMove）。野馬不能落在驛門上，馬腿也不能踩在驛門上（驛門是窄窄的門框），所以可以用驛門逼野馬繞路。
     ・守衛「雙野馬」（wildhorse3）：兩匹循足跡追的野馬，一匹慢 2 步、一匹慢 4 步（G.lag），走法同第二層的追跡野馬，多了驛門的限制。
     ・殘局照開發者 11/26 選單：殺題不用炮、車收尾、第三層可到四步殺、被抓一律殺題。石門「臥槽馬」、被抓「蹩腿困馬」都是馬收尾
       （複核：「絆馬索」不是象棋術語、對兒童不好，改名）。題庫排除十派第二層全部、起馬第一層。
   共用程式在 m/07z9m-maze.js（jhMzLayer、onStep、canMove）；日字跳法 jhMzHorseCan、JH_MZ_HORSE_DIR、屏風馬巡法在 m/07z9m-screen.js（m.html 排在前面）。
   修為：第三層 +60（共用）。收尾收藏品「急遞銅匣」、外觀「烽火驛站棋盤」出圖前要先問開發者，這一層寶箱先用現有獎勵。環境音照複核寫「拍板」。 */
const JH_MZ_HORSE3_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#.###.##k##.#.#",
"#.#C......#...#",
"#.#.####.##.#.#",
"#...#L....j...#",
"###.#.##P##.###",
"#.....#...#...#",
"#.###.#k#.###.#",
"#...#.....#...#",
"#.#.#j###.#.#.#",
"#.#...#C....#.#",
"#.#####.#####.#",
"#T......k....T#",
"#.##.#####.##.#",
"#......@......#",
"###############"];
const JH_MZ_HORSE3_GUARDS=[{kind:"wildhorse3",x:12,y:12,dx:-2,dy:-1,lag:2},{kind:"wildhorse3",x:2,y:10,dx:2,dy:-1,lag:4}];
const JH_MZ_HORSE3_GATE={j:[1,0],k:[0,-1]};
const jhMzHorse3Gate=(S,x,y)=>JH_MZ_HORSE3_GATE[jhMzCell(S,x,y)]||null;
/* 人走進驛門：方向要跟門一樣 */
const jhMzHorse3CanMove=(S,x,y,dx,dy)=>{const g=jhMzHorse3Gate(S,x+dx,y+dy);return!g||(g[0]===dx&&g[1]===dy)};
function jhMzHorse3Step(S,dx,dy){if(!dx&&!dy)return null;const P=S.player;if(jhMzHorse3CanMove(S,P.x,P.y,dx,dy))return null;
  return{ev:"wall",msg:["驛門只能從另一邊推開。","This post gate only opens from the other side."]}}
/* 野馬能不能往 (dx,dy) 跳：照日字與蹩馬腿，另外落點與馬腿都不能是驛門 */
function jhMzHorse3Can(S,G,dx,dy){if(!jhMzHorseCan(S,G.x,G.y,dx,dy,G))return false;const lx=Math.abs(dx)===2?G.x+Math.sign(dx):G.x,ly=Math.abs(dy)===2?G.y+Math.sign(dy):G.y;
  return!jhMzHorse3Gate(S,G.x+dx,G.y+dy)&&!jhMzHorse3Gate(S,lx,ly)}
JH_MZ_KIND.wildhorse3={
  sight(S,G){const o=[];for(const[dx,dy]of JH_MZ_HORSE_DIR)if(jhMzHorse3Can(S,G,dx,dy))o.push({x:G.x+dx,y:G.y+dy});return o},
  /* 記下玩家這一格，朝 lag 步以前的足跡跳；足跡不夠長就順時針巡（跳得動的第一個方向）；跳了只會更遠就原地等 */
  step(S,G){const P=S.player,L=G.lag||2,tr=G.tr||(G.tr=[]);if(P)tr.push([P.x,P.y]);while(tr.length>L+1)tr.shift();
    if(tr.length<=L){let i=JH_MZ_HORSE_DIR.findIndex(([a,b])=>a===G.dx&&b===G.dy);if(i<0)i=0;
      for(let k=0;k<8;k++){const[dx,dy]=JH_MZ_HORSE_DIR[(i+k)%8];if(jhMzHorse3Can(S,G,dx,dy)){G.x+=dx;G.y+=dy;G.dx=dx;G.dy=dy;return}}return}
    const[tx,ty]=tr[0];let best=null,bd=1e9;
    for(const[dx,dy]of JH_MZ_HORSE_DIR){if(!jhMzHorse3Can(S,G,dx,dy))continue;const nx=G.x+dx,ny=G.y+dy,d=(nx-tx)*(nx-tx)+(ny-ty)*(ny-ty);if(d<bd){bd=d;best=[dx,dy]}}
    if(!best)return;if(bd>=(G.x-tx)*(G.x-tx)+(G.y-ty)*(G.y-ty))return;
    G.x+=best[0];G.y+=best[1];G.dx=best[0];G.dy=best[1]},
  look:{body:"#5e3e1e",head:"#704a26",eye:0xE24A3A}};
/* 3D：驛門是一道木門框，門板偏向能推開的那一邊；平面版畫箭頭 */
for(const ch of["j","k"]){const[gx,gy]=JH_MZ_HORSE3_GATE[ch];
  JH_MZ_OBJ[ch]=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),wd=lam("#6b4a2a"),side=gx?0:1;
    for(const s of[-1,1])g.add(mesh(new T3.BoxGeometry(side?.08:.08,.8,.08),wd,side?s*.42:0,.4,side?0:s*.42));
    g.add(mesh(new T3.BoxGeometry(side?.84:.06,.06,side?.06:.84),wd,0,.78,0));
    const door=mesh(new T3.BoxGeometry(side?.7:.04,.62,side?.04:.7),lam("#8a6236"),gx*.15,.32,gy*.15);g.add(door);return g};
  JH_MZ_TILE[ch]=(cx,px,py,T)=>{cx.fillStyle="#3a2a18";cx.fillRect(px+T*.1,py+T*.1,T*.8,T*.8);cx.strokeStyle="#e8c88a";cx.lineWidth=2.5;cx.beginPath();
    const mx=px+T*.5,my=py+T*.5,ax=gx*T*.28,ay=gy*T*.28;cx.moveTo(mx-ax,my-ay);cx.lineTo(mx+ax,my+ay);cx.lineTo(mx+ax*.3-ay*.6,my+ay*.3-ax*.6);cx.moveTo(mx+ax,my+ay);cx.lineTo(mx+ax*.3+ay*.6,my+ay*.3+ax*.6);cx.stroke()}}
/* 殘局題庫（maze-puzzles.js 產生）：馬收尾 3、4 步殺，--multi。重跑指令見 PR 描述。 */
/* ==JH_MZ_POOL:JH_MZ_POOL_HORSE3== */
const JH_MZ_POOL_HORSE3={door:[
{"id":"sq126","src":{"book":"適情雅趣","title":"葉落歸秋"},"zh":["石門機關：臥槽馬","門上刻著一匹臥在槽位的馬。紅方先走，4 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the horse in the trough","A horse resting in the trough square is carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the horse delivers the final blow."],"fen":"2ba2n2/4ak3/4b4/4R4/4N4/9/9/5C3/3rAp3/c1rAK4","line":["e6f6","e8f7","f6g6","f8e8","g6g8","e8e9","e5f7"]},
{"id":"sq265","src":{"book":"適情雅趣","title":"入穴取虎"},"zh":["石門機關：臥槽馬","門上刻著一匹臥在槽位的馬。紅方先走，4 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the horse in the trough","A horse resting in the trough square is carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the horse delivers the final blow."],"fen":"3k1a3/9/3a5/3rRN2C/9/9/9/6n2/5r3/4K4","line":["e6e9","d9d8","e9d9","d8d9","i6d6","d7e8","f6d7"]},
{"id":"sq323","src":{"book":"適情雅趣","title":"臨難忘軀"},"zh":["石門機關：臥槽馬","門上刻著一匹臥在槽位的馬。紅方先走，4 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the horse in the trough","A horse resting in the trough square is carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the horse delivers the final blow."],"fen":"3ak4/3RaP1N1/5c1Cc/9/1rb6/9/9/5C3/1p2r1p2/3K5","line":["h7h1","e1e0","d0e0","c5e7","f8f9","e8f9","h8f7"]}],
trap:[
{"id":"sq333","src":{"book":"適情雅趣","title":"策馬入城"},"zh":["被兩匹野馬堵住了","兩匹野馬把你堵在驛門邊：「蹩住腿也能困住馬，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Cornered by two wild horses","Two wild horses corner you by a post gate: \"Block a leg and you can trap a horse. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"2bak1C2/3caP3/4b4/3N1Cn2/9/9/9/8n/4p4/5K3","line":["f8f9","e9f9","d6f7","g6f8","f7h8","f9e9","h8f9"]},
{"id":"sq361","src":{"book":"適情雅趣","title":"視死如歸"},"zh":["被兩匹野馬堵住了","兩匹野馬把你堵在驛門邊：「蹩住腿也能困住馬，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Cornered by two wild horses","Two wild horses corner you by a post gate: \"Block a leg and you can trap a horse. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"r2k5/9/2P6/9/6bN1/4R4/9/2np1pn2/4K4/9","line":["e4e9","d9d8","c7c8","d8d7","e9e7","g5e7","h5f6"]},
{"id":"sq429c8","src":{"book":"適情雅趣","title":"上陵下替"},"zh":["被兩匹野馬堵住了","兩匹野馬把你堵在驛門邊：「蹩住腿也能困住馬，解得開就放你走。」紅方先走，3 步將死黑方。"],"en":["Cornered by two wild horses","Two wild horses corner you by a post gate: \"Block a leg and you can trap a horse. Solve it and you may go.\" Red to move: checkmate in 3."],"fen":"3k5/5P3/3Nb4/9/6b2/9/9/9/9/3K5","line":["f8e8","g5i7","d0e0","e7c5","d7b8"]},
{"id":"ys030c6","src":{"book":"淵深海闊","title":"假途滅虢"},"zh":["被兩匹野馬堵住了","兩匹野馬把你堵在驛門邊：「蹩住腿也能困住馬，解得開就放你走。」紅方先走，3 步將死黑方。"],"en":["Cornered by two wild horses","Two wild horses corner you by a post gate: \"Block a leg and you can trap a horse. Solve it and you may go.\" Red to move: checkmate in 3."],"fen":"2bak1P2/2Nca4/9/2p6/9/9/9/9/3p3p1/4K4","line":["c8d6","d1d0","e0e1","d0c0","d6f7"]},
{"id":"ys061c7","src":{"book":"淵深海闊","title":"火毀晉宮"},"zh":["被兩匹野馬堵住了","兩匹野馬把你堵在驛門邊：「蹩住腿也能困住馬，解得開就放你走。」紅方先走，3 步將死黑方。"],"en":["Cornered by two wild horses","Two wild horses corner you by a post gate: \"Block a leg and you can trap a horse. Solve it and you may go.\" Red to move: checkmate in 3."],"fen":"r2aR1b2/4a4/3kbR3/2c6/9/9/4P4/4BA1r1/3CAp3/2N1K3c","line":["c0d2","c6d6","d2c4","d6i6","c4d6"],"alt":{"c0d2":["c6d6",{"d2c4":["d6i6",{"c4d6":0}],"d2e4":["d6a6",{"e4d6":0}]}]}},
{"id":"ys096","src":{"book":"淵深海闊","title":"三打採石"},"zh":["被兩匹野馬堵住了","兩匹野馬把你堵在驛門邊：「蹩住腿也能困住馬，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Cornered by two wild horses","Two wild horses corner you by a post gate: \"Block a leg and you can trap a horse. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"3ak2N1/4a4/7Pc/r4C2C/5PN1P/r8/6n1P/2n2A3/3p2p1c/4KA3","line":["g5f7","i7f7","i6i9","f7f9","h9g7","f9f8","g7f9"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_HORSE3== */
jhMzLayer("horse",3,{map:JH_MZ_HORSE3_MAP,guards:JH_MZ_HORSE3_GUARDS,pool:JH_MZ_POOL_HORSE3,puz:{door:JH_MZ_POOL_HORSE3.door[0],trap:JH_MZ_POOL_HORSE3.trap[0]},
  onStep:jhMzHorse3Step,canMove:jhMzHorse3CanMove,
  title:["📮 急遞暗房","📮 The express-courier vault"],lvName:["急遞暗房・第三層","The express-courier vault · Level 3"],
  intro:["最底下是驛站存放急遞文書的暗房，裡面裝了幾道單向的驛門。<b>驛門只能照箭頭的方向穿過</b>，反方向推不開。",
    "At the bottom is the vault where the post station kept urgent dispatches, fitted with one-way post gates. <b>A gate only lets you through in the direction of its arrow.</b>"],
  warn:["<b>兩匹野馬追著你的足跡</b>，一匹只慢兩步，另一匹慢四步。<b>野馬過不了驛門</b>，穿過驛門就能逼牠們繞路。",
    "<b>Two wild horses follow your tracks</b>, one only two steps behind, the other four. <b>Horses can't pass a post gate</b>: go through one to make them take the long way round."],
  lore:[{title:["整頓驛傳","Reforming the post relays"],
    body:["萬曆初年，張居正整頓驛傳，嚴禁官員濫用驛馬驛船，驛站的負擔才稍微減輕。（遊戲整理）","In the early Wanli years Zhang Juzheng reformed the post relays and forbade officials from misusing relay horses and boats, easing the stations' burden a little. (Summarized for the game.)"],
    src:"遊戲整理，據《萬曆起居注》"}],
  say:{door:["將死！馬臥槽一將，石門往兩旁滑開。","Checkmate! The horse checks from the trough square and the door slides apart."],
    trap:["將死！兩匹野馬愣在原地，你趁機溜走。","Checkmate! Both wild horses freeze and you slip away."],
    retry:["你被拖回了入口。<b>穿過驛門，野馬就得繞遠路。</b>","You were dragged back. <b>Go through a post gate and the horses must take the long way.</b>"],
    done:["你走到暗房最深處，起馬門的三層都走完了。","You reach the deepest room of the vault: all three levels of the Horse School are done."]}});
