/* ---------- W87-2 仙人指路地底迷宮・第三層「聽泉幽窟」（開發者 11/26「現在開工」做第三層；第三層分工 Windows Claude 1）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的仙人指路第三層，加上 iMac Claude 1 兩份複核與開發者 11/26 選單：
     ・新地形「流水石階」（f）：地下泉水往下游流，踩上去會被水沖往下一格（下面被擋就不動），然後停下（afterMove 回 stop:true）。
       往上游走時一踩就被沖回來，所以一排流水石階就是一道「只能往下過」的關卡，要繞到沒有水的地方上去。自動走不主動踩（lv.avoid）。
       守衛不受水流影響。
     ・守衛「兵衛陣列」：三隻兵卒（走法、視線都照第一層 JH_MZ_KIND.pawn：沒過河只往前看前面，過了河左右來回、看前面加面向那一側），
       比第二層多一隻，要算好三隻的空檔。
     ・殘局照開發者 11/26 選單：被抓一律殺題、殺題不用炮與車收尾、第三層可以到四步殺。石門「兵破防、馬收尾」、被抓「單馬擒王」都是馬收尾的殺題。
       題庫排除十派第二層全部題庫與仙人指路第一層（十派不重複）。
   共用程式在 m/07z9m-maze.js（jhMzLayer、afterMove、avoid）；兵的走法與 jhMzPawnCrossed 在 m/07z9m-pawn.js（m.html 排在前面）。
   修為：第三層 +60（共用）。收尾收藏品「聽泉石座」、外觀「太湖青石棋」出圖前要先問開發者，這一層寶箱先用現有獎勵。 */
const JH_MZ_PAWN3_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#.R..ff.ff..R.#",
"#...C.....L...#",
"#.fff.....fff.#",
"#.....P.R.....#",
"#T....fff....T#",
"#rrrrrrrrrrrrr#",
"#rrrrrrrrrrrrr#",
"#.............#",
"#.ff..R...R.ff#",
"#...ff.....ff.#",
"#.R.....C.....#",
"#..fff...fff..#",
"#C...........C#",
"#T.....@.....T#",
"###############"];
const JH_MZ_PAWN3_RIVER=[10,11];
const JH_MZ_PAWN3_GUARDS=[{kind:"pawn",x:3,y:4,dx:1,dy:1},{kind:"pawn",x:11,y:4,dx:-1,dy:1},{kind:"pawn",x:7,y:6,dx:1,dy:1}];
/* 流水石階：站上去就被沖往下一格（下面不能走、或有守衛就不動），一律停下 */
function jhMzPawn3Flow(S){const P=S.player;if(jhMzCell(S,P.x,P.y)!=="f")return null;const y=P.y+1;
  if(!jhMzSolid(S,P.x,y)&&!(S.guards||[]).some(G=>G.x===P.x&&G.y===y))P.y=y;return{stop:true,flow:true}}
/* 3D：一級一級的石階，上面一層淺淺的流水；平面版 */
JH_MZ_OBJ["f"]=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,.06,1),lam("#7d8a86"),0,.03,0));
  g.add(mesh(new T3.BoxGeometry(.96,.02,.96),lam("#5f97a8"),0,.07,0));for(const z of[-.25,.05,.35])g.add(mesh(new T3.BoxGeometry(.9,.012,.04),lam("#cfe8ee"),0,.085,z));return g};
JH_MZ_TILE["f"]=(cx,px,py,T)=>{cx.fillStyle="#5f97a8";cx.fillRect(px,py,T,T);cx.strokeStyle="rgba(230,245,248,.7)";cx.lineWidth=1.6;
  for(const a of[.3,.5,.7]){cx.beginPath();cx.moveTo(px+a*T-T*.08,py+T*.3);cx.lineTo(px+a*T,py+T*.42);cx.lineTo(px+a*T+T*.08,py+T*.3);cx.stroke();cx.beginPath();cx.moveTo(px+a*T-T*.08,py+T*.6);cx.lineTo(px+a*T,py+T*.72);cx.lineTo(px+a*T+T*.08,py+T*.6);cx.stroke()}};
/* 殘局題庫（maze-puzzles.js 產生）：馬收尾的 3、4 步殺，Pikafish 驗證、--multi（最快殺都算對）。重跑指令見 PR 描述。 */
/* ==JH_MZ_POOL:JH_MZ_POOL_PAWN3== */
const JH_MZ_POOL_PAWN3={door:[
{"id":"gm2004-A1p14A44K4r","src":{"book":"特級大師對局","title":"象棋甲級聯賽"},"zh":["石門機關：兵破防、馬收尾","門上刻著一個兵和一匹馬。紅方先走，4 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the soldier breaks in, the horse finishes","A soldier and a horse are carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the horse delivers the final blow."],"fen":"3k5/4P4/3Nb4/3n5/2b6/6B2/3cC4/4BA1p1/4A4/4K4","line":["d7b8","d6c8","b8c6","e7c9","e8d8","d9e9","c6e7"]},
{"id":"lk043","src":{"book":"爛柯神機","title":"二馬盤宮-紅勝-02"},"zh":["石門機關：兵破防、馬收尾","門上刻著一個兵和一匹馬。紅方先走，4 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the soldier breaks in, the horse finishes","A soldier and a horse are carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the horse delivers the final blow."],"fen":"Nc2ka3/1Nc1a4/4b4/9/9/5R3/9/4C4/4p1p2/3p1K3","line":["f4f9","b9f9","a9c8","e9d9","c8e7","d9d8","e7c6"]},
{"id":"lk047","src":{"book":"爛柯神機","title":"風馳電掣"},"zh":["石門機關：兵破防、馬收尾","門上刻著一個兵和一匹馬。紅方先走，4 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the soldier breaks in, the horse finishes","A soldier and a horse are carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the horse delivers the final blow."],"fen":"5k3/4P4/b1Rcba3/3N5/9/C1R6/2P6/9/4p4/4cK3","line":["c7c9","a7c9","c4c9","e7c9","a4f4","f7e8","d6f7"]}],
trap:[
{"id":"lk190","src":{"book":"爛柯神機","title":"物換星移"},"zh":["被兵衛陣列圍住了","三隻兵卒把你圍在泉水邊：「單馬也能擒王，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Surrounded by the pawn formation","Three pawn guards hem you in by the spring: \"A lone horse can still take the king. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"5kb2/4P2c1/4b4/3NP4/9/9/9/5A3/ppp3R1C/3K1p3","line":["g1g9","e7g9","e8f8","f9e9","i1i9","h8h9","d6c8"],"alt":{"g1g9":["e7g9",{"e8f8":["f9e9",{"i1i9":["h8h9",{"d6c8":0}]}],"i1f1":["h8f8",{"e8f8":["f9e9",{"d6c8":0}]}]}]}},
{"id":"mr011","src":{"book":"夢入神機","title":"劣馬奔泉"},"zh":["被兵衛陣列圍住了","三隻兵卒把你圍在泉水邊：「單馬也能擒王，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Surrounded by the pawn formation","Three pawn guards hem you in by the spring: \"A lone horse can still take the king. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"1c1k1P3/4PC3/4cN3/9/9/4C4/9/4p1n2/3r5/4K4","line":["f9e9","e7e9","e8d8","d1d8","f8f9","e9e5","f7e9"]},
{"id":"sq068","src":{"book":"適情雅趣","title":"鴻門碎鬥"},"zh":["被兵衛陣列圍住了","三隻兵卒把你圍在泉水邊：「單馬也能擒王，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Surrounded by the pawn formation","Three pawn guards hem you in by the spring: \"A lone horse can still take the king. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"2Ck1a3/2R1aR3/9/5N3/r8/r8/9/3C5/4p1n2/3K5","line":["f8f9","e8f9","f6d7","a4d4","d7f8","d9e9","f8d9"],"alt":{"f8f9":["e8f9",{"f6d7":["a4d4",{"d7f8":["d9e9",{"f8d9":0}]}]}],"f6d7":["a4d4",{"f8f9":["e8f9",{"d7f8":["d9e9",{"f8d9":0}]}]}]}},
{"id":"sq082","src":{"book":"適情雅趣","title":"禍不單行"},"zh":["被兵衛陣列圍住了","三隻兵卒把你圍在泉水邊：「單馬也能擒王，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Surrounded by the pawn formation","Three pawn guards hem you in by the spring: \"A lone horse can still take the king. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"4k4/4a4/2P5n/5N3/9/5R3/9/9/2p2p2r/C3K4","line":["f6d7","e9d9","a0d0","c1d1","f4f9","e8f9","d7f8"],"alt":{"f6d7":["e9d9",{"a0d0":["c1d1",{"f4f9":["e8f9",{"d7f8":0}]}],"f4f9":["d9d8",{"a0d0":["c1d1",{"c7c8":0}]}]}]}},
{"id":"sq084","src":{"book":"適情雅趣","title":"雙蜓點水"},"zh":["被兵衛陣列圍住了","三隻兵卒把你圍在泉水邊：「單馬也能擒王，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Surrounded by the pawn formation","Three pawn guards hem you in by the spring: \"A lone horse can still take the king. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"1C3k3/1N2P4/1nN1b4/9/9/9/9/4p4/3p1p3/4K4","line":["c7d9","e7c9","e8f8","f9e9","d9c7","c9e7","b8d7"]},
{"id":"sq103","src":{"book":"適情雅趣","title":"雙鷺窺魚"},"zh":["被兵衛陣列圍住了","三隻兵卒把你圍在泉水邊：「單馬也能擒王，解得開就放你走。」紅方先走，4 步將死黑方。"],"en":["Surrounded by the pawn formation","Three pawn guards hem you in by the spring: \"A lone horse can still take the king. Solve it and you may go.\" Red to move: checkmate in 4."],"fen":"3ak3N/4aP3/8R/1rr5N/9/9/9/9/5p3/4K4","line":["f8f9","e9f9","i7f7","e8f7","i6h8","f9f8","i9h7"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_PAWN3== */
jhMzLayer("pawn",3,{map:JH_MZ_PAWN3_MAP,guards:JH_MZ_PAWN3_GUARDS,river:JH_MZ_PAWN3_RIVER,pool:JH_MZ_POOL_PAWN3,
  puz:{door:JH_MZ_POOL_PAWN3.door[0],trap:JH_MZ_POOL_PAWN3.trap[0]},solid:"#DRHL",opaque:"#DH",jump:"",avoid:"f",afterMove:jhMzPawn3Flow,
  title:["🌊 聽泉幽窟","🌊 Grotto of the listening spring"],lvName:["聽泉幽窟・第三層","Grotto of the listening spring · Level 3"],
  intro:["最底下是一座地下泉窟，泉水順著石階往下流。<b>踩上流水石階會被沖往下一格</b>，往上游走過不去，要繞到沒有水的地方上去。",
    "At the very bottom is an underground spring; water runs down a flight of stone steps. <b>Step onto the flowing steps and the water pushes you one square down</b>, so you can't climb against it: go around where it's dry."],
  warn:["<b>三隻兵卒排成陣在巡邏。</b>沒過河的兵只看前面；過了河左右來回，也看得到面向的那一側。算好三隻的空檔再走。",
    "<b>Three pawn guards patrol in formation.</b> Before the river a pawn only looks ahead; after crossing it paces sideways and also sees the side it faces. Time your moves between all three."],
  lore:[{title:["廣陵園池","Ponds of Guangling"],
    body:["揚州富商好造園林，多鑿池引水、疊石成山，庭院幽深，曲折不盡。（遊戲整理）","Yangzhou's rich merchants loved building gardens, digging ponds, channelling water and piling rocks into hills, with courtyards that wind on and on. (Summarized for the game.)"],
    src:"遊戲整理，據《揚州府志》"}],
  say:{door:["將死！兵破開防線，馬一躍收尾，石門往兩旁滑開。","Checkmate! The soldier breaks the line, the horse leaps in to finish, and the door slides apart."],
    trap:["將死！兵卒愣在泉水邊，你趁機溜走。","Checkmate! The pawn guard freezes by the spring and you slip away."],
    retry:["你被押回了入口。<b>流水石階只能往下過，往上要繞路。</b>","You were marched back. <b>The flowing steps only let you go downstream; go around to climb.</b>"],
    done:["你走到泉窟最深處，仙人指路門的三層都走完了。","You reach the deepest part of the grotto: all three levels of the Immortal Points the Way School are done."]}});
