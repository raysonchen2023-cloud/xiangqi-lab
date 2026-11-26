/* ---------- W87-2 飛相地底迷宮・第三層「絕密號舍」（開發者 11/26「現在開工」做第三層；第三層分工 Windows Claude 1）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的飛相第三層，加上 iMac Claude 1 兩份複核與開發者 11/26 選單：
     ・新地形「小水坑」（Q，號舍裡積的水，不是中間的河 W）：人走不過去。把破桌（X）推進水坑就填平成平地，桌子也沒了。相照舊可以落在水坑上。
       自動走找路不走水坑（lv.canMove）；用方向鈕撞到水坑＝撞牆、不算回合，畫面提示去推桌子。
     ・破桌 X：跟考箱一樣推得動（後面是平地或水坑才推得動），也能拿來塞象眼。
     ・守衛「雙相疊加」：兩隻相（JH_MZ_KIND.elephant：田字、塞象眼、不過河）都在河的上半場，田字路線交錯。
     ・殘局：石門「棄馬破象」照複核寫明兵收尾的殺題（3、4 步，開發者 11/26：第三層可到四步殺）；被抓照開發者選單「飛相照舊出解殺題」，
       取自 W95 大師對局、Pikafish 深度 22 驗過的解殺題，扣掉第一、二層用過的。
   共用程式在 m/07z9m-maze.js（jhMzLayer、onStep、canMove）；相的走法在 m/07z9m-elephant.js（m.html 排在前面）。
   修為：第三層 +60（共用）。收尾收藏品「童生考卷」、外觀「水墨貢院棋盤」出圖前要先問開發者，這一層寶箱先用現有獎勵。 */
const JH_MZ_ELE3_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T...........T#",
"#..X..Q.Q..X..#",
"#.Q.........Q.#",
"#L....X.X....C#",
"#.Q.........Q.#",
"#..X..QPQ..X..#",
"#WWWWWW.WWWWWW#",
"#.............#",
"#..X..Q.Q..X..#",
"#.Q.........Q.#",
"#T...X...X...T#",
"##.###.#.###.##",
"#.....#.#.....#",
"#..L..#.#..C..#",
"#T.....@......#",
"###############"];
const JH_MZ_ELE3_GUARDS=[{kind:"elephant",x:2,y:4,dx:1,dy:1},{kind:"elephant",x:12,y:8,dx:-1,dy:-1}];
/* 推破桌：後面是平地就推過去；後面是水坑就把水坑填平、桌子沒了；後面有相、牆、別的桌子就推不動 */
function jhMzEle3Step(S,dx,dy,c){if(!dx&&!dy)return null;const P=S.player,x1=P.x+dx,y1=P.y+dy;
  if(c==="Q")return{ev:"wall",msg:["水坑太深走不過去。推一張破桌進去填平。","The puddle is too deep to cross. Push a broken desk in to fill it."]};
  if(c!=="X")return null;const x2=x1+dx,y2=y1+dy,c2=jhMzCell(S,x2,y2);
  if((c2!=="."&&c2!=="Q")||(S.guards||[]).some(G=>G.x===x2&&G.y===y2))return{ev:"wall",msg:["破桌推不動：後面被擋住了。","The desk won't budge: something is behind it."]};
  S.grid[y2][x2]=c2==="Q"?".":"X";S.grid[y1][x1]=".";return null}
const jhMzEle3CanMove=(S,x,y,dx,dy)=>jhMzCell(S,x+dx,y+dy)!=="Q";
/* 3D：破桌是一張缺腳的木桌；小水坑是一片淺水；平面版 */
JH_MZ_OBJ.Q=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(.9,.03,.9),lam("#3f6670"),0,.016,0));return g};
JH_MZ_TILE.Q=(cx,px,py,T)=>{cx.fillStyle="#3f6670";cx.beginPath();cx.ellipse(px+T*.5,py+T*.5,T*.44,T*.38,0,0,7);cx.fill();cx.strokeStyle="rgba(210,235,240,.45)";cx.lineWidth=1.3;cx.beginPath();cx.moveTo(px+T*.25,py+T*.48);cx.quadraticCurveTo(px+T*.45,py+T*.38,px+T*.65,py+T*.48);cx.stroke()};
/* 被抓的解殺題（kind:"defend"）：題源同第一、二層（W95），扣掉前兩層用過的 */
/* ==ELE3_TRAP== */
const JH_MZ_ELE3_TRAP=[
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"3ak4/4a4/4b4/9/7P1/6c2/1R7/4r4/4A4/3CKA3","line":["b3g3"],"src":{"book":"大師對局","title":"20090221-第一輪第三臺許銀川先和柳大華","year":2009,"ply":126},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":0}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"2b1k4/4C4/6N2/1P7/6b2/9/5n3/4p4/4AK3/3A2B1c","line":["g0i2"],"src":{"book":"大師對局","title":"19930700-林宏敏和莊玉騰","year":1993,"ply":98},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":-81}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"2bak4/4a4/4b4/5P3/9/6N2/4N1n2/4B4/2n1A1p2/5KB2","line":["e3g2"],"src":{"book":"大師對局","title":"第一輪-湖北-李雪松-先和-大連-苗永鵬","year":2002,"ply":126},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":-7}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"2bak4/4a4/4b4/8p/9/5n3/5R3/4B4/3p2C2/1r1AKAB2","line":["f0e1"],"src":{"book":"大師對局","title":"第1輪-河北-申鵬-負-浙江-趙鑫鑫","year":2016,"ply":98},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":-16}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"2baka3/9/4b4/8R/p3c4/6P2/P2r4P/N3B4/5K3/2B6","line":["i6f6"],"src":{"book":"大師對局","title":"第12局-北京-張強-先負-湖北-李智屏","year":1997,"ply":68},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":-195}}},
{"kind":"defend","zh":["被巡場的相攔住了","黑方下一步就要將死紅方，紅方先走，找出唯一一步解圍。"],"en":["Stopped by the patrolling elephant","Black threatens mate next move. Red to move: find the only defence."],"fen":"2baka3/9/4b4/R7p/9/2P6/8P/4B4/5r3/1RBAKAr2","line":["d0e1"],"src":{"book":"大師對局","title":"07-GR0310","year":2007,"ply":66},"verify":{"engine":"Pikafish","depth":22,"after":{"cp":6}}}];
/* ==/ELE3_TRAP== */
/* 石門題庫（maze-puzzles.js 產生）：兵收尾的 3、4 步殺（棄馬破象），--multi。重跑指令見 PR 描述。 */
/* ==JH_MZ_POOL:JH_MZ_POOL_ELE3== */
const JH_MZ_POOL_ELE3={door:[
{"id":"gm1988-C54A44KAB2r","src":{"book":"特級大師對局","title":"全國象棋團體賽女子組"},"zh":["石門機關：棄馬破象","門上刻著一匹倒下的馬和一個兵。紅方先走，4 步將死黑方，門就會開。提示：最後一步由兵將死。"],"en":["Stone door: sacrifice the horse, break the elephants","A fallen horse and a soldier are carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the soldier delivers the final blow."],"fen":"3k1ab2/6N2/1r1a5/p1P5p/6C2/3R5/P2cr3P/3C5/4A4/4KAB2","line":["g5d5","d3d5","d2d5","d7e8","c6d6","e8d7","d6d7"]},
{"id":"lk026","src":{"book":"爛柯神機","title":"當頭一喝"},"zh":["石門機關：棄馬破象","門上刻著一匹倒下的馬和一個兵。紅方先走，4 步將死黑方，門就會開。提示：最後一步由兵將死。"],"en":["Stone door: sacrifice the horse, break the elephants","A fallen horse and a soldier are carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the soldier delivers the final blow."],"fen":"9/3ka4/4Pa3/2p2C3/4N4/9/9/9/3pp2p1/5K3","line":["f6d6","e1e0","f0e0","d1d0","e0d0","h1h0","e7d7"],"alt":{"f6d6":["e1e0",{"f0e0":["d1d0",{"e0d0":["h1h0",{"e7d7":0,"e5d7":0}],"e0e1":["c6c5",{"e5d7":0,"e7d7":0}]}],"f0f1":["d1e1",{"f1e1":["c6c5",{"e5d7":0,"e7d7":0}],"f1f2":["c6c5",{"e5d7":0,"e7d7":0}]}]}]}},
{"id":"lk142","src":{"book":"爛柯神機","title":"去其蝥賊"},"zh":["石門機關：棄馬破象","門上刻著一匹倒下的馬和一個兵。紅方先走，4 步將死黑方，門就會開。提示：最後一步由兵將死。"],"en":["Stone door: sacrifice the horse, break the elephants","A fallen horse and a soldier are carved on the door. Red to move: checkmate in 4 and the door opens. Hint: the soldier delivers the final blow."],"fen":"3k5/4PP3/4bN3/9/9/9/9/3n5/4r1p2/2R2K3","line":["e8d8","d9d8","f8e8","d8d9","c0c9","e7c9","e8d8"],"alt":{"e8d8":["d9d8",{"f8e8":["d8d9",{"c0c9":["e7c9",{"e8d8":0}]}]}],"e8e9":["d9e9",{"f8e8":["e9d9",{"c0c9":["e7c9",{"e8d8":0}]}]}]}}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_ELE3== */
const JH_MZ_ELE3_POOL={door:JH_MZ_POOL_ELE3.door,trap:JH_MZ_ELE3_TRAP};
jhMzLayer("elephant",3,{map:JH_MZ_ELE3_MAP,guards:JH_MZ_ELE3_GUARDS,pool:JH_MZ_ELE3_POOL,puz:{door:JH_MZ_ELE3_POOL.door[0],trap:JH_MZ_ELE3_POOL.trap[0]},
  solid:"#DXHL",opaque:"#DH",jump:"",dyn:"X",onStep:jhMzEle3Step,canMove:jhMzEle3CanMove,
  title:["📜 絕密號舍","📜 The sealed exam cells"],lvName:["絕密號舍・第三層","The sealed exam cells · Level 3"],
  intro:["最底下是封起來的號舍，地上積著一窪一窪的小水坑。<b>水坑走不過去，把破桌推進去就能填平。</b>破桌也能拿來塞象眼。",
    "At the bottom are sealed exam cells, with small puddles on the floor. <b>You can't cross a puddle, but pushing a broken desk into it fills it in.</b> Desks also block an elephant's eye."],
  warn:["<b>兩隻相在上半場交錯巡場。</b>地上紅色的是牠們下一步能落的地方；象眼塞住的方向飛不過來。相不過河。",
    "<b>Two elephants patrol the upper half, crossing each other's paths.</b> Red marks where they can land next; a blocked eye stops that jump. Elephants never cross the river."],
  lore:[{title:["泗州祖陵","The ancestral tombs at Sizhou"],
    body:["泗州屢遭水患，城外明祖陵也受到威脅，朝廷為治水爭論不休。（遊戲整理）","Sizhou was flooded again and again; even the Ming ancestral tombs outside the city were threatened, and the court argued endlessly over how to tame the water. (Summarized for the game.)"],
    src:"遊戲整理，據《明史・河渠志》（清修）"}],
  say:{door:["將死！棄了馬撕開相陣，兵一步收尾，石門往兩旁滑開。","Checkmate! The horse is sacrificed to tear open the elephants, a soldier finishes, and the door slides apart."],
    trap:["解圍了！巡場的相愣在原地，你趁機溜走。","Defended! The patrolling elephant stands stunned and you slip away."],
    retry:["你被押回了入口。<b>先把破桌推進水坑開出路，再用桌子塞象眼。</b>","You were marched back. <b>Push desks into the puddles to open a way, then use desks to block the elephants' eyes.</b>"],
    done:["你走到號舍最深處，飛相門的三層都走完了。","You reach the deepest cell: all three levels of the Elephant School are done."]}});
