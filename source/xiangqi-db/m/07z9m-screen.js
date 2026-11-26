/* ---------- W87-2 屏風馬地底迷宮・第一層「皇陵神道」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單：先把十派第一層補齊、材質每派一套）----------
   九派文案 story/gemini_app/197_…_Gemini回覆.md 的屏風馬門：入口在院門前一對石馬底下的暗門，地底是明中都皇陵廢棄的地下神道，兩側有沒做完的石像生。
   共用程式在 m/07z9m-maze.js（jhMzDef、JH_MZ_KIND、JH_MZ_OBJ、JH_MZ_TILE）；這支只登記屏風馬這一層，不改共用程式。
   玩法跟中炮門一樣（全黑、燈火一圈、回合制、踩機關踏板才解得開石門、三個箱子），不一樣的地方：
     ・守陵銅人照「馬」的規則走（JH_MZ_KIND.horse）：每次走日字（直兩格、橫一格，或橫兩格、直一格），兩隻銅人在上、下兩廳巡。
       看得到的＝下一步跳得到的那幾個落點（地上畫紅格）。
     ・蹩馬腿：日字那一步「先直走一格」的那一格叫馬腿。馬腿被石鼓（G）擋住、或玩家自己站在馬腿上，那個方向就跳不過去、也看不到。
       所以躲銅人的辦法是利用石鼓，或乾脆貼著牠站在馬腿上。
     ・石鼓（G）擋路、不擋光（矮）。
   還沒做（之後補）：碑刻文書 L 與暗門 H（要先請 Gemini 查史料、iMac Claude 1 複核）、白玉磚反光擴大視野、像素材質（每派一套，出圖要先問開發者）。 */
const JH_MZ_SCREEN_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#..G.......G..#",
"#......G......#",
"#.G...C...G...#",
"######.#.######",
"#C..#.....#..C#",
"#...#.G.G.#...#",
"#.......P.....#",
"#...#.G.G.#...#",
"#...#.....#...#",
"######.#.######",
"#T...........T#",
"#..G...G...G..#",
"#.............#",
"#......@......#",
"###############"];
/* 兩隻守陵銅人：上廳一隻（守石門前）、下廳一隻（入口那一廳）；初始方向＝下一步先試的日字方向 */
/* #196 審查（iMac Claude 1 第 3 點）：上廳銅人原本只在 (2,5)、(3,7) 之間來回，沒去守石門前；第一步改往 (1,2)，巡 (1,5)(3,4)(5,5)(6,7)(4,6)(2,5)(3,7) 七點、經過石門前一帶。
   zy＝這隻銅人巡的那一廳（上下列的範圍）：馬只看馬腿、不看中間的牆，不限制的話會從上廳越過牆跳進中間那間 */
const JH_MZ_SCREEN_GUARDS=[{kind:"horse",x:3,y:4,dx:1,dy:2,zy:[4,7]},{kind:"horse",x:11,y:17,dx:-2,dy:-1,zy:[15,18]}];
/* 馬的八個日字方向（順時針）；巡場時照目前方向試，不行就順時針換下一個 */
const JH_MZ_HORSE_DIR=[[1,-2],[2,-1],[2,1],[1,2],[-1,2],[-2,1],[-2,-1],[-1,-2]];
/* 馬腿：直兩格的那一步，腿在直的方向第一格；橫兩格的那一步，腿在橫的方向第一格 */
const jhMzHorseLeg=(x,y,dx,dy)=>Math.abs(dy)===2?{x,y:y+Math.sign(dy)}:{x:x+Math.sign(dx),y};
/* 馬能不能從 (x,y) 往 (dx,dy) 跳：馬腿沒被擋（擋路的東西、或玩家站在上面）、落點不擋路、落點在自己巡的那一廳（G.zy） */
function jhMzHorseCan(S,x,y,dx,dy,G){const L=jhMzHorseLeg(x,y,dx,dy),P=S.player,ty=y+dy;
  if(G&&G.zy&&(ty<G.zy[0]||ty>G.zy[1]))return false;
  if(jhMzSolid(S,L.x,L.y))return false;if(P&&P.x===L.x&&P.y===L.y)return false;return !jhMzSolid(S,x+dx,ty)}
JH_MZ_KIND.horse={
  /* 看得到的＝下一步跳得到的日字落點（馬腿被蹩住、落點擋路的那個方向就沒有） */
  sight(S,G){const o=[];for(const[dx,dy]of JH_MZ_HORSE_DIR)if(jhMzHorseCan(S,G.x,G.y,dx,dy,G))o.push({x:G.x+dx,y:G.y+dy});return o},
  /* 巡場：照目前方向跳；不行就順時針換方向，八個方向都不行就原地等 */
  step(S,G){let i=JH_MZ_HORSE_DIR.findIndex(([a,b])=>a===(G.dx||1)&&b===(G.dy||-2));if(i<0)i=0;
    for(let k=0;k<8;k++){const[dx,dy]=JH_MZ_HORSE_DIR[(i+k)%8];if(jhMzHorseCan(S,G.x,G.y,dx,dy,G)){G.x+=dx;G.y+=dy;G.dx=dx;G.dy=dy;return}}},
  look:{body:"#5a6b5e",head:"#6d7f70",eye:0xE24A3A}};
/* 石鼓（3D）：矮圓鼓形的青石墩，鼓面兩圈鉚釘紋；平面版：俯視的圓 */
if(!JH_MZ_OBJ.G)JH_MZ_OBJ.G=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),st=lam("#7b8077"),dk=lam("#5f645c");
  g.add(mesh(new T3.CylinderGeometry(.3,.34,.08,20),dk,0,.04,0));g.add(mesh(new T3.CylinderGeometry(.33,.33,.36,20),st,0,.26,0));
  g.add(mesh(new T3.CylinderGeometry(.29,.33,.06,20),dk,0,.47,0));return g};
if(!JH_MZ_TILE.G)JH_MZ_TILE.G=(cx,px,py,T)=>{cx.fillStyle="#7b8077";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.34,0,Math.PI*2);cx.fill();
  cx.strokeStyle="#4f544c";cx.lineWidth=2;cx.stroke();cx.beginPath();cx.arc(px+T/2,py+T/2,T*.2,0,Math.PI*2);cx.stroke()};
/* 殘局題庫（maze-puzzles.js 產生，不要手改）。重跑／核對（在 source/ 底下；核對加 --check、不用 Pikafish）：
   PIKAFISH=<執行檔> node xiangqi-lab/tools/maze-puzzles.js --name JH_MZ_POOL_SCREEN --out xiangqi-db/m/07z9m-screen.js --mate N --door 3 --trap 6 --prefer-red N2
     --exclude xiangqi-db/m/07z9m-maze.js:JH_MZ_POOL_CENTRAL,xiangqi-db/m/07z9m-cross.js:JH_MZ_POOL_CROSS,xiangqi-db/m/07z9m-pawn.js:JH_MZ_POOL_PAWN
     --title-door "石門機關：馬的殺法" --title-door-en "Stone door: a horse's mate"
     --desc-door "門上刻著一對石馬。紅方先走，{n} 步將死黑方，門就會開。提示：馬走日字，馬腿被擋住就跳不過去，跟這裡的銅人一樣。"
     --desc-door-en "A pair of stone horses is carved on the door. Red to move: checkmate in {n} and the door opens. Hint: a horse jumps in an L and can't jump if its leg is blocked, just like the guards here."
     --title-trap "被守陵銅人逮住了" --title-trap-en "Caught by a bronze tomb guard" --desc-trap "銅人一步跳到你面前：「解得開這局，就放你走。」紅方先走，{n} 步將死黑方。"
     --desc-trap-en "The guard leaps right in front of you: \"Solve this and you can go.\" Red to move: checkmate in {n}."
   古譜題、最後一步用馬將死、雙馬題（--prefer-red N2）先取；Pikafish 驗紅方每一步唯一解，sq253、sq291c4 有兩種殺法被剔除。 */
/* ==JH_MZ_POOL:JH_MZ_POOL_SCREEN== */
const JH_MZ_POOL_SCREEN={door:[
{"id":"lk054c7","src":{"book":"爛柯神機","title":"功歸轉軸"},"zh":["石門機關：馬的殺法","門上刻著一對石馬。紅方先走，3 步將死黑方，門就會開。提示：馬走日字，馬腿被擋住就跳不過去，跟這裡的銅人一樣。"],"en":["Stone door: a horse's mate","A pair of stone horses is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a horse jumps in an L and can't jump if its leg is blocked, just like the guards here."],"fen":"3a1N3/8R/1NC2k3/4p4/9/9/6P2/9/2pp1pp2/r1c1K4","line":["f9h8","f7e7","h8g6","e7d7","b7c9"]},
{"id":"lk093c4","src":{"book":"爛柯神機","title":"連環甲馬"},"zh":["石門機關：馬的殺法","門上刻著一對石馬。紅方先走，3 步將死黑方，門就會開。提示：馬走日字，馬腿被擋住就跳不過去，跟這裡的銅人一樣。"],"en":["Stone door: a horse's mate","A pair of stone horses is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a horse jumps in an L and can't jump if its leg is blocked, just like the guards here."],"fen":"9/5k3/5a2b/9/9/9/5N3/9/1rrp1C3/c3K1N2","line":["f3g5","f7e8","g5f7","f8f7","g0f2"]},
{"id":"lk118c6","src":{"book":"爛柯神機","title":"鵬搏十萬"},"zh":["石門機關：馬的殺法","門上刻著一對石馬。紅方先走，3 步將死黑方，門就會開。提示：馬走日字，馬腿被擋住就跳不過去，跟這裡的銅人一樣。"],"en":["Stone door: a horse's mate","A pair of stone horses is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: a horse jumps in an L and can't jump if its leg is blocked, just like the guards here."],"fen":"5Rb2/2N1k1r2/9/4C4/4n4/4r4/5N3/2p6/1nc1p4/3K1p3","line":["c8e7","e8e7","e6e4","e5f7","f3e5"]}],
trap:[
{"id":"lk120c8","src":{"book":"爛柯神機","title":"匹馬突圍"},"zh":["被守陵銅人逮住了","銅人一步跳到你面前：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a bronze tomb guard","The guard leaps right in front of you: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"5CbcN/2PP4n/3k5/6N2/6c2/9/9/9/r3p2r1/5K3","line":["f9d9","h9d9","g6e5","d7e7","i9g8"]},
{"id":"lk148c5","src":{"book":"爛柯神機","title":"入後必窮"},"zh":["被守陵銅人逮住了","銅人一步跳到你面前：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a bronze tomb guard","The guard leaps right in front of you: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3k4C/4P2N1/9/9/7c1/9/9/9/2nr1pp2/4K1BN1","line":["h8f9","h5h9","f9g7","h9h8","g7h9"]},
{"id":"lk258c4","src":{"book":"爛柯神機","title":"作繭自縛"},"zh":["被守陵銅人逮住了","銅人一步跳到你面前：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a bronze tomb guard","The guard leaps right in front of you: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"1cR6/r4n2C/3ak4/5N3/9/1N7/9/5p3/4p3r/3p1K3","line":["b4c6","e7f7","c6e5","f7e7","f6d5"]},
{"id":"mr003","src":{"book":"夢入神機","title":"存沒無累"},"zh":["被守陵銅人逮住了","銅人一步跳到你面前：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a bronze tomb guard","The guard leaps right in front of you: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"2RNk4/9/1N7/9/1n7/9/C7r/9/2c1p4/2c2K3","line":["d9c7","c1c9","a3a9","c9c8","b7c9"]},
{"id":"mr075c4","src":{"book":"夢入神機","title":"並轡朝闕"},"zh":["被守陵銅人逮住了","銅人一步跳到你面前：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a bronze tomb guard","The guard leaps right in front of you: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"3a5/c1r1ak1N1/b1N6/9/6b2/9/5C3/4Bp3/4p3r/5K3","line":["c7e6","g5e7","h8f7","f8f7","e6f4"]},
{"id":"sq066","src":{"book":"適情雅趣","title":"見危致命"},"zh":["被守陵銅人逮住了","銅人一步跳到你面前：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by a bronze tomb guard","The guard leaps right in front of you: \"Solve this and you can go.\" Red to move: checkmate in 3."],"fen":"1rbak3r/1N1Ra4/cR2b1N2/9/9/9/9/9/5p3/4K4","line":["d8d9","e8d9","b7e7","c9e7","b8d7"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_SCREEN== */
jhMzDef("screen",{map:JH_MZ_SCREEN_MAP,guards:JH_MZ_SCREEN_GUARDS,pool:JH_MZ_POOL_SCREEN,
  puz:{door:JH_MZ_POOL_SCREEN.door[0],trap:JH_MZ_POOL_SCREEN.trap[0]},solid:"#DG",opaque:"#D",jump:"",
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"屏風馬譜殘頁",en:"Screen Horses manual page"},{k:"box",zh:"鳳陽青花石棋盤",en:"Fengyang blue-and-white stone board"}],
  title:["🗿 皇陵神道","🗿 Imperial spirit way"],lvName:["皇陵神道・第一層","Imperial spirit way · Level 1"],back:["回屏風馬門","Back to the Screen Horses School"],
  hall:{at:[560,1080],zh:"🗿 石馬・地底神道",en:"🗿 Stone horses · Spirit way below"},
  intro:["你從院門前那對石馬底下的暗門爬下去，底下是一條廢棄的地下神道，兩旁站著沒刻完的石像生。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。走到壁燈旁邊會點亮它。",
    "You climb down through the hidden door under the pair of stone horses at the gate. Below is an abandoned spirit way, lined with half-carved stone guardians. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). Walk next to a wall lamp to light it."],
  warn:["<b>守陵銅人在巡，牠照馬的規矩走：</b>每一步跳日字，地上的紅格是牠下一步跳得到、也看得到的地方。<b>蹩馬腿</b>：日字先直走的那一格被石鼓擋住、或你自己站在那一格上，牠就跳不過去、也看不到。",
    "<b>Bronze tomb guards are on patrol, and they move like a horse:</b> each step is an L-shaped jump. The red squares are where they can land next, and what they can see. <b>Block the leg:</b> if the first square of that jump is blocked by a stone drum, or you are standing on it, the guard can't jump or see that way."],
  say:{door:["將死！馬踏到將的面前，石門往兩旁滑開。","Checkmate! The horse leaps up to the general and the stone door slides apart."],trap:["將死！銅人僵在原地，你趁機溜走。","Checkmate! The bronze guard freezes and you slip away."],
    open:["石門開了，<b>往下的石階就在門後</b>。","The door is open. <b>The stone steps down are right behind it.</b>"],dazed:["銅人的機括卡住了，<b>四回合內</b>不會動。","The guard's mechanism jams. <b>It won't move for four turns.</b>"],
    dragged:["銅人把你推回入口，還把你最後撿到的東西放回原來的箱子。","The guard shoves you back to the entrance and puts your last find back in its chest."],
    retry:["你被推回了入口。<b>試試站在銅人的馬腿上，或躲到石鼓後面，讓牠跳不過來。</b>","You were shoved back. <b>Try standing on the guard's leg square, or behind a stone drum, so it can't jump your way.</b>"],
    locked:["石門被機關鎖住了。<b>先在神道裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere along the spirit way first.</b>"],
    plate:["喀噠一聲，踏板沉了下去，石門那邊的機關鬆開了。<b>現在可以去解石門的殘局了。</b>","Click. The plate sinks and the door's mechanism loosens. <b>Now you can solve the door puzzle.</b>"],
    done:["石階往下通到更深的陵寢。第二、三層之後再開。","The steps lead down into the deeper tomb chambers. Levels 2 and 3 open later."],
    spot:["<b>銅人轉過來，下一步就跳得到你！</b>趕快離開紅格，下一步還在紅格上就會被逮住。","<b>The guard turns: its next jump can reach you!</b> Get off the red squares now. If you are still on one next turn, you are caught."]}});
