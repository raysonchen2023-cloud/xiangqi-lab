/* ---------- W87-2 仙人指路地底迷宮・第二層「漏月迷陣」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；第二層分工 Windows Claude 1）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的仙人指路第二層，加上 iMac Claude 1 兩份複核（207、208_…_複核.md）與開發者 11/26 選單：
     ・新地形「竹林」（z）：走得進去、擋光擋視線（躲在竹林裡兵卒看不到你），但在竹林裡只能上下直走、不能橫走（進出竹林也一樣：從竹林往旁邊走、從旁邊走進竹林都不行）。
       自動走的路線照這條規則找（lv.canMove，共用 jhMzPath 會問它）；用方向鈕橫走撞到竹林＝撞牆、不算回合。
     ・守衛「巡竹兵卒」（pawn2）：走法照第一層的兵（沒過河只往前、過了河左右來回）；視線比第一層多一點：過了河看得到正前方，加上左右各 1 格。
     ・被抓殘局照開發者 11/26 選單「一律出殺題」：兵收尾的殺題（不做複核裡的防守題）。題庫只排除仙人指路自己各層（開發者 11/26：不同派可以重用題）。
   共用程式在 m/07z9m-maze.js（jhMzLayer 登記第二層、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE）；兵的過河判斷用第一層的 jhMzPawnCrossed（m/07z9m-pawn.js，m.html 排在前面）。
   修為：第二層 +40（共用 JH_MZ_LAYER_XP）。新外觀（頭像框「揚州月」）出圖前要先問開發者，這一層的寶箱先用現有獎勵。 */
const JH_MZ_PAWN2_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T....zzz....T#",
"#.R...zzz...R.#",
"#...C.zzz.L...#",
"#zzz.......zzz#",
"#zzz..P.R..zzz#",
"#zzz.......zzz#",
"#T....zzz....T#",
"#~~~~~~~~~~~~~#",
"#~~~~~~~~~~~~~#",
"#.....zzz.....#",
"#.zzz.zzz.zzz.#",
"#.zzz.....zzz.#",
"#.zzz.zzz.zzz.#",
"#C....zzz....C#",
"#T.....@.....T#",
"###############"];
/* 兵卒往下（dy=1）走；河在第 11、12 行 */
const JH_MZ_PAWN2_RIVER=[11,12];
const JH_MZ_PAWN2_GUARDS=[{kind:"pawn2",x:3,y:4,dx:1,dy:1},{kind:"pawn2",x:11,y:4,dx:-1,dy:1}];
/* 竹林裡只能上下直走：橫走時，起點或終點只要有一格是竹林就不行 */
const jhMzBamboo=(S,x,y)=>{const r=S.grid&&S.grid[y];return!!r&&r[x]==="z"};
const jhMzPawn2CanMove=(S,x,y,dx,dy)=>!(dx&&(jhMzBamboo(S,x,y)||jhMzBamboo(S,x+dx,y+dy)));
JH_MZ_KIND.pawn2={
  /* 視線：正前方 range 格（預設 4）；過了河再加上左右各 1 格。竹林、牆、石門擋視線（照 opaque） */
  sight(S,G){const o=[],n=G.range||4,ray=(dx,dy,m)=>{for(let i=1;i<=m;i++){const x=G.x+dx*i,y=G.y+dy*i;if(jhMzOpaque(S,x,y))break;o.push({x,y})}};
    ray(0,G.dy||1,n);if(jhMzPawnCrossed(S,G)){ray(1,0,1);ray(-1,0,1)}return o},
  step(S,G){return JH_MZ_KIND.pawn.step(S,G)},
  look:{body:"#2f4a2a",head:"#3f5a36",eye:0xE24A3A}};
/* 竹林（3D）：幾根細長的青綠竹竿；平面版：竹竿加竹葉 */
JH_MZ_OBJ["z"]=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),m1=lam("#5f8a4a"),m2=lam("#4a7038");
  for(const[a,z,h,m]of[[-.28,-.2,.95,m1],[.05,-.3,1.1,m2],[.3,-.05,.85,m1],[-.12,.22,1,m2],[.22,.28,.9,m1]]){const o=mesh(new T3.CylinderGeometry(.045,.055,h,6),m,a,h/2,z);g.add(o)}
  return g};
JH_MZ_TILE["z"]=(cx,px,py,T)=>{cx.fillStyle="#24361f";cx.fillRect(px,py,T,T);cx.strokeStyle="#6f9a55";cx.lineWidth=2;
  for(const a of[.22,.5,.78]){cx.beginPath();cx.moveTo(px+a*T,py+T*.95);cx.lineTo(px+a*T,py+T*.05);cx.stroke()}
  cx.fillStyle="#8fbf6a";for(const[a,b]of[[.3,.3],[.6,.55],[.4,.75]]){cx.beginPath();cx.ellipse(px+a*T,py+b*T,T*.1,T*.03,.6,0,7);cx.fill()}};
/* 殘局題庫：古譜裡兵收尾的 2、3 步殺，出題工具 maze-puzzles.js 挑題、Pikafish（深度 20）驗證紅方每步唯一。只排除仙人指路第一層的題（開發者 11/26：不同派可以重用題）。
   重跑比對（在 source/ 底下，逐字相同才回 0）：
     node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_PAWN2 --out xiangqi-db/m/07z9m-pawn2.js --mate P --door 3 --trap 6 --n 2,3 --max-pieces 24 --allow-games --exclude xiangqi-db/m/07z9m-pawn.js:JH_MZ_POOL_PAWN --check
       （古譜裡沒用過的兵收尾殺題只剩 3 題夠石門，所以放寬到 24 子、加收實戰對局；開發者 11/26 選單的「放寬到不是唯一解」做好後可以再換回古譜）
       （標題、說明參數見本檔的 PZ 段；出題當下的完整指令記在 PR 描述） */
/* ==JH_MZ_POOL:JH_MZ_POOL_PAWN2== */
const JH_MZ_POOL_PAWN2={door:[
{"id":"mr085c5","src":{"book":"夢入神機","title":"七國爭雄"},"zh":["石門機關：老兵搜底","石門上刻著一個推到底線的老兵。紅方先走，3 步將死黑方，門就會開。提示：兵過了河就能橫著走。"],"en":["Stone door: the old soldier's sweep","An old soldier pushed to the last rank is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: once across the river, a soldier can move sideways."],"fen":"4P1b2/2P6/2nkb4/1P2n4/4N4/9/9/4C4/4p1p1r/C4K1c1","line":["a0a7","c7a8","b6b7","a8c7","b7c7"]},
{"id":"mr087c5","src":{"book":"夢入神機","title":"兵機在手"},"zh":["石門機關：老兵搜底","石門上刻著一個推到底線的老兵。紅方先走，3 步將死黑方，門就會開。提示：兵過了河就能橫著走。"],"en":["Stone door: the old soldier's sweep","An old soldier pushed to the last rank is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: once across the river, a soldier can move sideways."],"fen":"2ba1a3/3k1r2r/4NN3/3P5/9/1n2C4/2c6/3p5/4p4/3K5","line":["e7c6","d8e8","d6e6","c9e7","e6e7"]},
{"id":"mr112c8","src":{"book":"夢入神機","title":"雙燕爭飛"},"zh":["石門機關：老兵搜底","石門上刻著一個推到底線的老兵。紅方先走，3 步將死黑方，門就會開。提示：兵過了河就能橫著走。"],"en":["Stone door: the old soldier's sweep","An old soldier pushed to the last rank is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: once across the river, a soldier can move sideways."],"fen":"1P3k2r/4a4/5N3/9/4N4/9/9/5n3/3p1p3/4K4","line":["f7h8","f9e9","e5f7","e9d9","b9c9"]}],
trap:[
{"id":"sq008c6","src":{"book":"適情雅趣","title":"珠藏韞櫃"},"zh":["被巡竹兵卒攔住了","兵卒在竹林邊攔住你：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Stopped by a bamboo patrol","A pawn guard stops you by the bamboo: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"C2a1a1N1/r2k5/4P2n1/1rP6/2N3p2/9/9/2n6/5p3/4Kc3","line":["e7d7","d8d7","c6c7","d7d8","c7d7"],"alt":{"e7d7":["d8d7",{"c6c7":["d7d8",{"c7d7":0}],"c6d6":["d7d8",{"d6d7":0}]}]}},
{"id":"sq030c6","src":{"book":"適情雅趣","title":"國庶兵強"},"zh":["被巡竹兵卒攔住了","兵卒在竹林邊攔住你：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Stopped by a bamboo patrol","A pawn guard stops you by the bamboo: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"5k1P1/c3P4/4b1P1r/6n2/4n1bN1/9/5C3/9/1r1p1p3/4K4","line":["g7f7","e5f3","h9g9","e7g9","e8e9"],"alt":{"g7f7":["e5f3",{"h9g9":["e7g9",{"e8e9":0}],"f7f8":["a8f8",{"h9g9":0}]}],"h9g9":["e7g9",{"g7f7":["e5f3",{"e8e9":0}]}]}},
{"id":"sq044c5","src":{"book":"適情雅趣","title":"近悅遠來"},"zh":["被巡竹兵卒攔住了","兵卒在竹林邊攔住你：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Stopped by a bamboo patrol","A pawn guard stops you by the bamboo: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"9/3P1k3/8b/5P2N/5cb2/2n6/5C3/5A3/4AK3/1r4r2","line":["f6f7","f8f9","f7f8","f9e9","f8e8"],"alt":{"f6f7":["f8f9",{"f7f8":["f9e9",{"f8e8":0,"f8f9":0}]}]}},
{"id":"sq056c8","src":{"book":"適情雅趣","title":"百川匯海"},"zh":["被巡竹兵卒攔住了","兵卒在竹林邊攔住你：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Stopped by a bamboo patrol","A pawn guard stops you by the bamboo: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"2P2k3/4P4/b2Pb4/5P3/9/9/3p5/6p2/3K5/C8","line":["c9d9","d3d2","d1d2","g2g1","d9e9"],"alt":{"c9d9":["d3d2",{"d1d2":["g2g1",{"d9e9":0}]}],"a0a4":["d3d2",{"d1d2":["a7c5",{"a4a9":0,"a4f4":0}]}],"f6f7":["d3d2",{"d1d2":["a7c5",{"a0a9":0,"f7f8":0}]}]}},
{"id":"sq150c6","src":{"book":"適情雅趣","title":"呂帥鷹揚"},"zh":["被巡竹兵卒攔住了","兵卒在竹林邊攔住你：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Stopped by a bamboo patrol","A pawn guard stops you by the bamboo: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"3a1R3/7CC/c1P1k4/2P1rr3/2N6/9/9/3p5/4p4/1p1K5","line":["c7d7","e7d7","c6c7","d7e7","c7d7"],"alt":{"c7d7":["e7d7",{"c6c7":["d7e7",{"c7d7":0}],"c6d6":["d7e7",{"d6d7":0}]}]}},
{"id":"sq336c5","src":{"book":"適情雅趣","title":"伍相奔吳"},"zh":["被巡竹兵卒攔住了","兵卒在竹林邊攔住你：「這局解得開，就放你過去。」紅方先走，3 步將死黑方。"],"en":["Stopped by a bamboo patrol","A pawn guard stops you by the bamboo: \"Solve this and you may pass.\" Red to move: checkmate in 3."],"fen":"4k4/2PP2P1P/5r3/9/4p4/5p3/9/4B4/9/4K2R1","line":["c8c9","f4f3","h0h9","f7f9","c9d9"],"alt":{"c8c9":["f4f3",{"h0h9":["f7f9",{"c9d9":0}],"c9d9":["e9f9",{"h0h9":0}],"g8g9":["e5e4",{"c9d9":0}]}]}}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PAWN2== */
jhMzLayer("pawn",2,{map:JH_MZ_PAWN2_MAP,guards:JH_MZ_PAWN2_GUARDS,river:JH_MZ_PAWN2_RIVER,pool:JH_MZ_POOL_PAWN2,
  puz:{door:JH_MZ_POOL_PAWN2.door[0],trap:JH_MZ_POOL_PAWN2.trap[0]},solid:"#DRHL",opaque:"#DHz",jump:"",canMove:jhMzPawn2CanMove,
  onStep(S,dx,dy){const P=S.player;return dx&&!jhMzPawn2CanMove(S,P.x,P.y,dx,dy)?{ev:"wall",block:"bamboo"}:null},
  title:["🎋 漏月迷陣","🎋 Moonlit bamboo maze"],lvName:["漏月迷陣・第二層","Moonlit bamboo maze · Level 2"],
  intro:["石階再往下，是一片長在地底的竹林，月光從頭頂的石縫漏下來。<b>竹林裡只能上下直走，不能橫著走。</b>點地面一樣會自己找路。",
    "Further down the steps is a bamboo grove growing underground, with moonlight leaking through cracks overhead. <b>Inside the bamboo you can only walk straight up or down, never sideways.</b> Tapping the floor still finds a way for you."],
  warn:["<b>兵卒還在巡邏。</b>這一層的兵過了河，<b>左右兩邊都看得到一格</b>。<b>躲進竹林裡他就看不到你</b>，算好他走開的時候再出來。",
    "<b>Pawn guards are still on patrol.</b> On this level a pawn that has crossed the river <b>sees one square to each side</b>. <b>Hide in the bamboo and it can't see you</b>; step out once it has walked away."],
  lore:[{title:["竹林小記","Notes on bamboo"],
    body:["石上刻著造園的道理：揚州園林好用太湖石，講究石頭透、漏，看起來像天生的一樣；種竹也是一樣，取它疏密有致、風過有聲。（遊戲整理）",
      "A note on garden making: Yangzhou gardens loved lake rocks that are pierced and open, looking as if nature made them; bamboo was planted the same way, spaced to rustle in the wind. (Summarized for the game.)"],
    src:"遊戲整理，據計成《園冶》"}],
  say:{door:["將死！老兵一路推到底，石門往兩旁滑開。","Checkmate! The old soldier pushes all the way in and the stone door slides apart."],
    trap:["將死！兵卒愣在竹林邊，你趁機溜走。","Checkmate! The pawn guard freezes by the bamboo and you slip away."],
    retry:["你被押回了入口。<b>先躲進竹林，等兵卒走開再出來。</b>","You were marched back. <b>Hide in the bamboo first, and come out once the pawn has moved off.</b>"],
    done:["竹林盡頭還有往下的石階，第三層之後再開。","At the end of the bamboo more steps lead down. Level 3 opens later."]}});
