/* ---------- W87-2 起馬地底迷宮・第二層「烽火暗驛」（開發者 11/26 下一版目標②：十派地底迷宮都做到三層；第二層分工 Windows Claude 1）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的起馬第二層，加上 iMac Claude 1 兩份複核與開發者 11/26 選單：
     ・守衛「追跡野馬」（wildhorse2）：走法同第一層的野馬（循玩家足跡跳日字、蹩馬腿照舊），但足跡只慢 2 步（第一層 3 步），追得更緊。
     ・新地形「碎瓦片」（V）：踩上去會碎、發出聲響，野馬聽到那一回合會多跳一步、直接朝玩家現在的位置（等於一下子又近了一步）；瓦片踩過就碎成平地。
       自動走不主動踩瓦片（lv.avoid），點的終點就是瓦片可以；踩到會停下（afterMove 回 stop:true）。
     ・殘局照開發者 11/26 選單「一律出殺題」：石門「掛角馬」與被抓都是馬收尾的殺題；題庫只排除起馬自己各層（不同派可以重用）。
   共用程式在 m/07z9m-maze.js（jhMzLayer、afterMove、avoid）；日字跳法 jhMzHorseCan、JH_MZ_HORSE_DIR 在 m/07z9m-screen.js，屏風馬巡法 JH_MZ_KIND.horse（m.html 排在前面）。
   修為：第二層 +40（共用）。頭像「徐州快馬」出圖前要先問開發者，這一層寶箱先用現有獎勵。 */
const JH_MZ_HORSE2_MAP=[
"###############",
"#####.>.#######",
"#####...#######",
"######D########",
"#T....V.V....T#",
"#.###.#.#.###.#",
"#.#C..#.#..L#.#",
"#.#.###V###.#.#",
"#...#.....#...#",
"###.#.#P#.#.###",
"#...V.#.#.V...#",
"#.###.#.#.###.#",
"#.#.....V.....#",
"#.#.##.###.##.#",
"#...#C.....#..#",
"##V.#.##.##.#V#",
"#T..........#.#",
"#.##.#####.##.#",
"#......@......#",
"###############"];
const JH_MZ_HORSE2_LAG=2;
/* 朝 (tx,ty) 跳一步日字：挑八個方向裡落點最近的；跳了不會更近就不跳 */
function jhMzHorse2Toward(S,G,tx,ty){let best=null,bd=1e9;for(const[dx,dy]of JH_MZ_HORSE_DIR){if(!jhMzHorseCan(S,G.x,G.y,dx,dy,G))continue;const nx=G.x+dx,ny=G.y+dy,d=(nx-tx)*(nx-tx)+(ny-ty)*(ny-ty);if(d<bd){bd=d;best=[dx,dy]}}
  if(!best||bd>=(G.x-tx)*(G.x-tx)+(G.y-ty)*(G.y-ty))return false;G.x+=best[0];G.y+=best[1];G.dx=best[0];G.dy=best[1];return true}
const JH_MZ_HORSE2_GUARDS=[{kind:"wildhorse2",x:7,y:8,dx:2,dy:1}];
JH_MZ_KIND.wildhorse2={
  sight(S,G){return JH_MZ_KIND.horse.sight(S,G)},
  /* 跟第一層的野馬一樣：記下玩家這一格，朝 LAG 步以前的足跡跳日字；足跡不夠長或跳了只會更遠就照屏風馬巡法／原地等 */
  step(S,G){const rush=G.rush>0;G.rush=0;const P=S.player,L=G.lag||JH_MZ_HORSE2_LAG,tr=G.tr||(G.tr=[]);if(P)tr.push([P.x,P.y]);while(tr.length>L+1)tr.shift();
    if(tr.length<=L)return JH_MZ_KIND.horse.step(S,G);
    const[tx,ty]=tr[0];let best=null,bd=1e9;
    for(const[dx,dy]of JH_MZ_HORSE_DIR){if(!jhMzHorseCan(S,G.x,G.y,dx,dy,G))continue;const nx=G.x+dx,ny=G.y+dy,d=(nx-tx)*(nx-tx)+(ny-ty)*(ny-ty);if(d<bd){bd=d;best=[dx,dy]}}
    if(!best)return;const cur=(G.x-tx)*(G.x-tx)+(G.y-ty)*(G.y-ty);if(bd>=cur)return;
    G.x+=best[0];G.y+=best[1];G.dx=best[0];G.dy=best[1];
    /* 剛聽到瓦片碎裂：這一回合再朝玩家現在的位置跳一步（跳了會更近才跳），玩家看得到牠被聲音引過來 */
    if(rush&&P)jhMzHorse2Toward(S,G,P.x,P.y)},
  look:{body:"#6e4a24",head:"#80582c",eye:0xE24A3A}};
/* 碎瓦片：踩上去碎成平地；每一匹追跡野馬這一回合多跳一步（rush），回 stop:true 讓自動走停下 */
function jhMzHorse2Shard(S){const P=S.player;if(jhMzCell(S,P.x,P.y)!=="V")return null;S.grid[P.y][P.x]=".";
  for(const G of S.guards||[])if(G.kind==="wildhorse2")G.rush=1;
  return{stop:true,shard:true}}
/* 3D：散落的幾片青灰瓦片；平面版 */
JH_MZ_OBJ.V=H=>{const{T3,mesh,lam}=H,g=new T3.Group(),m=lam("#6f7a80");
  for(const[a,z,r]of[[-.2,.1,.4],[.15,-.15,1.2],[.05,.25,2.1],[.25,.15,.8]]){const o=mesh(new T3.BoxGeometry(.24,.03,.14),m,a,.02,z);o.rotation.y=r;g.add(o)}return g};
JH_MZ_TILE.V=(cx,px,py,T)=>{cx.fillStyle="#6f7a80";for(const[a,b,r]of[[.3,.4,.4],[.6,.35,1.2],[.45,.65,2.1],[.7,.7,.8]]){cx.save();cx.translate(px+a*T,py+b*T);cx.rotate(r);cx.fillRect(-T*.12,-T*.06,T*.24,T*.12);cx.restore()}};
/* 殘局題庫（maze-puzzles.js 產生）：馬收尾的 2、3 步殺，Pikafish 深度 20 驗唯一解；只排除起馬第一層（開發者 11/26：不同派可以重用題）。
   重跑比對（在 source/ 底下）：見 PR 描述的完整指令（--name JH_MZ_POOL_HORSE2 --mate N --n 2,3 --door 3 --trap 6 --max-pieces 24 --allow-games
     --exclude xiangqi-db/m/07z9m-horse.js:JH_MZ_POOL_HORSE … --check） */
/* ==JH_MZ_POOL:JH_MZ_POOL_HORSE2== */
const JH_MZ_POOL_HORSE2={door:[
{"id":"lk054c7","src":{"book":"爛柯神機","title":"功歸轉軸"},"zh":["石門機關：掛角馬","門上刻著一匹掛在九宮角上的馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the corner horse","A horse at the corner of the palace is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse delivers the final blow."],"fen":"3a1N3/8R/1NC2k3/4p4/9/9/6P2/9/2pp1pp2/r1c1K4","line":["f9h8","f7e7","h8g6","e7d7","b7c9"]},
{"id":"lk093c4","src":{"book":"爛柯神機","title":"連環甲馬"},"zh":["石門機關：掛角馬","門上刻著一匹掛在九宮角上的馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the corner horse","A horse at the corner of the palace is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse delivers the final blow."],"fen":"9/5k3/5a2b/9/9/9/5N3/9/1rrp1C3/c3K1N2","line":["f3g5","f7e8","g5f7","f8f7","g0f2"]},
{"id":"lk118c6","src":{"book":"爛柯神機","title":"鵬搏十萬"},"zh":["石門機關：掛角馬","門上刻著一匹掛在九宮角上的馬。紅方先走，3 步將死黑方，門就會開。提示：最後一步由馬將死。"],"en":["Stone door: the corner horse","A horse at the corner of the palace is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: the horse delivers the final blow."],"fen":"5Rb2/2N1k1r2/9/4C4/4n4/4r4/5N3/2p6/1nc1p4/3K1p3","line":["c8e7","e8e7","e6e4","e5f7","f3e5"]}],
trap:[
{"id":"gm2013-B84A43K1A3r","src":{"book":"特級大師對局","title":"“QQ遊戲天下棋弈”全國象棋甲級聯賽"},"zh":["被追跡野馬追上了","野馬把你堵在烽火燈籠堆旁：「解得開這局，就放你走。」紅方先走，2 步將死黑方。"],"en":["Caught by the tracking horse","The wild horse corners you by the beacon lanterns: \"Solve this and you may go.\" Red to move: checkmate in 2."],"fen":"5k3/4PN3/5c2b/7P1/2b6/9/4pCn2/B8/4A4/3K1A3","line":["f8h9","e3f3","h9g7"]},
{"id":"lk120c8","src":{"book":"爛柯神機","title":"匹馬突圍"},"zh":["被追跡野馬追上了","野馬把你堵在烽火燈籠堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the tracking horse","The wild horse corners you by the beacon lanterns: \"Solve this and you may go.\" Red to move: checkmate in 3."],"fen":"5CbcN/2PP4n/3k5/6N2/6c2/9/9/9/r3p2r1/5K3","line":["f9d9","h9d9","g6e5","d7e7","i9g8"]},
{"id":"lk148c5","src":{"book":"爛柯神機","title":"入後必窮"},"zh":["被追跡野馬追上了","野馬把你堵在烽火燈籠堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the tracking horse","The wild horse corners you by the beacon lanterns: \"Solve this and you may go.\" Red to move: checkmate in 3."],"fen":"3k4C/4P2N1/9/9/7c1/9/9/9/2nr1pp2/4K1BN1","line":["h8f9","h5h9","f9g7","h9h8","g7h9"]},
{"id":"lk258c4","src":{"book":"爛柯神機","title":"作繭自縛"},"zh":["被追跡野馬追上了","野馬把你堵在烽火燈籠堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the tracking horse","The wild horse corners you by the beacon lanterns: \"Solve this and you may go.\" Red to move: checkmate in 3."],"fen":"1cR6/r4n2C/3ak4/5N3/9/1N7/9/5p3/4p3r/3p1K3","line":["b4c6","e7f7","c6e5","f7e7","f6d5"]},
{"id":"mr003","src":{"book":"夢入神機","title":"存沒無累"},"zh":["被追跡野馬追上了","野馬把你堵在烽火燈籠堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the tracking horse","The wild horse corners you by the beacon lanterns: \"Solve this and you may go.\" Red to move: checkmate in 3."],"fen":"2RNk4/9/1N7/9/1n7/9/C7r/9/2c1p4/2c2K3","line":["d9c7","c1c9","a3a9","c9c8","b7c9"]},
{"id":"mr008c4","src":{"book":"夢入神機","title":"潛魚戀藻"},"zh":["被追跡野馬追上了","野馬把你堵在烽火燈籠堆旁：「解得開這局，就放你走。」紅方先走，3 步將死黑方。"],"en":["Caught by the tracking horse","The wild horse corners you by the beacon lanterns: \"Solve this and you may go.\" Red to move: checkmate in 3."],"fen":"5k1N1/4a4/4Pa3/9/9/5n3/5C3/3A1p3/3p5/5K3","line":["e7e8","f2f1","f0f1","d1d0","h9g7"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_HORSE2== */
jhMzLayer("horse",2,{map:JH_MZ_HORSE2_MAP,guards:JH_MZ_HORSE2_GUARDS,pool:JH_MZ_POOL_HORSE2,puz:{door:JH_MZ_POOL_HORSE2.door[0],trap:JH_MZ_POOL_HORSE2.trap[0]},
  avoid:"V",afterMove:jhMzHorse2Shard,
  title:["🏮 烽火暗驛","🏮 Beacon post vault"],lvName:["烽火暗驛・第二層","Beacon post vault · Level 2"],
  intro:["石階再往下，是驛站存放烽火燈籠的地窖，地上散著碎瓦片。<b>踩到瓦片會碎、會響</b>，點地面自動走會繞開它們。",
    "Further down is the cellar where the post station kept its beacon lanterns; broken roof tiles litter the floor. <b>Step on a tile and it cracks loudly.</b> Tapping the floor will route you around them."],
  warn:["<b>這裡的野馬追得更緊</b>，只落後你兩步。<b>踩碎瓦片牠會聽到，一下子又追近一步。</b>馬腿被牆擋住就跳不過來，繞到牆角甩掉牠。",
    "<b>The wild horse here follows closer</b>, only two steps behind you. <b>If you crack a tile it hears you and closes in at once.</b> A blocked leg stops its jump: lose it around a corner."],
  lore:[{title:["驛傳","Post relays"],
    body:["驛站傳遞文書，騎馬傳送叫「驛」，步行傳送叫「急遞舖」。徐州水陸要衝，驛傳不能廢。（遊戲整理）","Official dispatches went by horse through relay stations and on foot through courier posts. Xuzhou sat on key land and water routes, so its relays could never close. (Summarized for the game.)"],
    src:"遊戲整理，據《明史・兵志》（清修）"}],
  say:{door:["將死！馬掛角一將，石門往兩旁滑開。","Checkmate! The horse checks from the corner and the door slides apart."],
    trap:["將死！野馬愣在原地，你趁機溜走。","Checkmate! The wild horse freezes and you slip away."],
    retry:["你被拖回了入口。<b>別踩瓦片，繞到牆角讓馬腿被擋住。</b>","You were dragged back. <b>Avoid the tiles and use a corner to block the horse's leg.</b>"],
    done:["地窖盡頭還有往下的石階，第三層之後再開。","At the end of the cellar more steps lead down. Level 3 opens later."]}});
