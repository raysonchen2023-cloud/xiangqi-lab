/* ---------- W87-2 仕角炮地底迷宮・第二層「質庫暗房」（11/26 Windows Claude 1 改分派給 Windows Claude 2）----------
   規格：story/gemini_app/208_十派地底迷宮第二三層_補件_1126_Gemini回覆.md 的仕角炮門第二層，照 208 複核（iMac Claude 1）和開發者 11/26 的決定改：
     ・可轉銅鏡（B）：嵌在牆裡，擋路擋光。往銅鏡那一格走（撞上去）＝花一回合把它順時針轉 90 度（東→南→西→北），人不動、守衛照走。
       轉完後，光束沿鏡子朝的方向照出一整條直線（被擋光的東西擋住為止），照到的格子都看清楚；
       光束上站著的朝奉機關（不出自己那一間）被強光照到，眩暈 2 回合。平常走到銅鏡旁邊也照得亮那一條（跟第一層銅鏡一樣），只是不會照暈。
       銅鏡朝哪記在 S.mir（被拖回入口時不變：轉過的鏡子還是那個方向）。平面版畫得出朝向；3D 版的鏡面不轉，轉的時候用文字說朝哪。
     ・朝奉機關照第一層（JH_MZ_KIND.advisor：只在自己那一間斜走、只看正在走的那一條斜線）。三面銅鏡一開始都對著牆或走廊，順時針轉一次就射進朝奉那一間。
     ・機關殘局：仕角支點，兵收尾（規格：馬兵進攻）；被抓殘局一律殺題（開發者決定），馬收尾（開發者 11/26 選單「換成馬、兵收尾」：用 --multi 出題，最快殺都算對）。開發者 11/26：只在同一派各層之間不重複。
     ・碑刻：遊戲整理，據沈德符《萬曆野獲編》（複核：可用，待查原典；內容收斂成「徽商在江南開當鋪、庫房防範很嚴」）。
     ・寶箱：門派貢獻、仕角炮譜殘頁、頭像框「算盤珠璣」（外觀要出圖，出圖前先問開發者；這版先只記名字）。
     ・複核提醒：屏風馬、反宮馬第三層也是「轉」東西，三派重複的事第三層再處理。 */
const JH_MZ_CORNER2_MAP=[
"###############",
"#######.>.#####",
"#######...#####",
"########D######",
"#T...........T#",
"#.######.######",
"#.#...#...B..C#",
"#.....#.......#",
"#.#...#...#...#",
"###.###.#######",
"###...#...B...#",
"###...#.......#",
"###C..#...#P..#",
"############.##",
"###...#...B...#",
"###.....L.....#",
"###.C.#...#...#",
"############.##",
"#T......@....T#",
"###############"];
/* 銅鏡「x,y」→ 一開始朝哪（JH_MZ_CORNER2_DIR 的第幾個：0 東、1 南、2 西、3 北） */
const JH_MZ_CORNER2_DIR=[[1,0],[0,1],[-1,0],[0,-1]];
const JH_MZ_CORNER2_MIR0={"10,6":1,"10,10":1,"10,14":3};
const JH_MZ_CORNER2_GUARDS=[{kind:"advisor",room:[7,6],i:0,x:8,y:7},{kind:"advisor",room:[7,10],i:3,x:9,y:10},{kind:"advisor",room:[11,14],i:5,x:13,y:16}];
/* 這一趟的銅鏡朝向（第一次用到時照地圖的初始值） */
const jhMzCorner2Mir=S=>S.mir||(S.mir=Object.assign({},JH_MZ_CORNER2_MIR0));
/* 從銅鏡 (mx,my) 沿它現在的方向照一條：照到的格子看清楚；stun＝要不要照暈光束上的朝奉。回傳照到的格子 */
function jhMzCorner2Beam(S,mx,my,stun){const d=JH_MZ_CORNER2_DIR[jhMzCorner2Mir(S)[mx+","+my]],o=[];
  for(let x=mx+d[0],y=my+d[1];x>0&&y>0&&x<S.W-1&&y<S.H-1;x+=d[0],y+=d[1]){if(jhMzOpaque(S,x,y))break;S.seen.add(y*S.W+x);o.push({x,y});
    if(stun)for(const G of S.guards||[])if(G.kind==="advisor"&&G.x===x&&G.y===y&&!(G.stun>0))G.stun=2}
  return o}
/* 走一步之前：撞向銅鏡＝轉鏡（一回合，守衛照走）；走到銅鏡旁邊＝照亮它現在朝的那一條 */
function jhMzCorner2Step(S,dx,dy,c){const P=S.player,nx=P.x+dx,ny=P.y+dy,M=jhMzCorner2Mir(S);
  if(c==="B"&&(nx+","+ny)in M){const k=nx+","+ny;M[k]=(M[k]+1)%4;jhMzCorner2Beam(S,nx,ny,true);S.turn++;jhMzGuardStep(S);
    const D=["東","南","西","北"][M[k]],E=["east","south","west","north"][M[k]],out={ev:"mirror",torch:false,chest:"",msg:[`你把銅鏡轉向<b>${D}邊</b>，光束照出一整條。`,`You turn the bronze mirror to face <b>${E}</b>; its beam lights a whole line.`]};
    if(jhMzCaught(S)){S.caughtBy=null;out.ev="spot"}return out}
  if(!jhMzSolid(S,nx,ny))for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const k=(nx+a)+","+(ny+b);if(k in M&&jhMzCell(S,nx+a,ny+b)==="B")jhMzCorner2Beam(S,nx+a,ny+b,false)}
  return null}
/* 3D：可轉銅鏡（牆裡一面圓鏡，框是銅的、比第一層的大一圈）；平面版畫出鏡子朝哪 */
if(!JH_MZ_OBJ.B)JH_MZ_OBJ.B=H=>{const{T3,mesh,lam}=H,g=new T3.Group();g.add(mesh(new T3.BoxGeometry(1,.85,1),lam("#2a2018"),0,.425,0));
  const m=mesh(new T3.CylinderGeometry(.36,.36,1.02,24),new T3.MeshBasicMaterial({color:0xe0b860}),0,.5,0);m.rotation.z=Math.PI/2;g.add(m);return g};
if(!JH_MZ_TILE.B)JH_MZ_TILE.B=(cx,px,py,T,S,x,y)=>{cx.fillStyle="#2a2018";cx.fillRect(px,py,T,T);cx.fillStyle="#e0b860";cx.beginPath();cx.arc(px+T/2,py+T/2,T*.32,0,Math.PI*2);cx.fill();
  const i=S&&S.mir&&S.mir[x+","+y],d=JH_MZ_CORNER2_DIR[i==null?(JH_MZ_CORNER2_MIR0[x+","+y]||0):i];cx.strokeStyle="#fff7d8";cx.lineWidth=3;cx.beginPath();cx.moveTo(px+T/2,py+T/2);cx.lineTo(px+T/2+d[0]*T*.45,py+T/2+d[1]*T*.45);cx.stroke()};
/* ==JH_MZ_POOL:JH_MZ_POOL_CORNER2== */
const JH_MZ_POOL_CORNER2={door:[
{"id":"jc108c8","src":{"book":"橘中秘","title":"炮兵能勝士象全"},"zh":["石門機關：仕角支點","門上刻著當鋪的櫃台，櫃角撐著一根柱子。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: the advisor-corner pivot","A pawnshop counter propped on a corner post is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"3ak4/4aP3/b3b4/9/9/9/2C6/9/4K4/9","line":["c3e3","a7c5","e1f1","c5a7","f8f9"]},
{"id":"jc133c5","src":{"book":"橘中秘","title":"雙兵破雙缺士"},"zh":["石門機關：仕角支點","門上刻著當鋪的櫃台，櫃角撐著一根柱子。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: the advisor-corner pivot","A pawnshop counter propped on a corner post is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"6b2/2P1k4/5P2b/9/9/9/9/9/9/3K5","line":["c8d8","e8e9","f7f8","i7g5","d8e8"],"alt":{"c8d8":["e8e9",{"f7f8":["i7g5",{"d8e8":0,"d8d9":0}]}]}},
{"id":"lk019c6","src":{"book":"爛柯神機","title":"出其不意"},"zh":["石門機關：仕角支點","門上刻著當鋪的櫃台，櫃角撐著一根柱子。紅方先走，3 步將死黑方，門就會開。提示：其中一種解法是最後由兵將死。"],"en":["Stone door: the advisor-corner pivot","A pawnshop counter propped on a corner post is carved on the door. Red to move: checkmate in 3 and the door opens. Hint: one solution ends with a pawn giving mate."],"fen":"2rk2NcC/3n1P3/9/9/9/9/3R5/9/3p1p3/4K1p2","line":["g9h7","h9h8","f8f9","h8h9","f9e9"],"alt":{"g9h7":["h9h8",{"f8f9":["h8h9",{"f9e9":0,"h7f8":0}]}]}}],
trap:[
]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CORNER2== */
/* ==JH_MZ_POOL:JH_MZ_POOL_CORNER2_TRAP== */
const JH_MZ_POOL_CORNER2_TRAP={door:[
],
trap:[
{"id":"sq207c8","src":{"book":"適情雅趣","title":"菱葉穿萍"},"zh":["被朝奉機關押住了","朝奉機關把你押在質庫裡：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you in the strongroom: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"2bk3C1/3na4/3a1N3/4C4/1n6r/9/9/3p5/4p4/3K5","line":["f7e9","e8f9","e9d7","f9e8","d7b8"]},
{"id":"sq221c7","src":{"book":"適情雅趣","title":"野馬舞風"},"zh":["被朝奉機關押住了","朝奉機關把你押在質庫裡：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you in the strongroom: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"5a3/4a2C1/3k4b/9/3N2b2/1r7/9/2C6/4p3r/c4K3","line":["c2d2","b4d4","d5f6","d7e7","f6g8"]},
{"id":"sq253","src":{"book":"適情雅趣","title":"斃馬僕途"},"zh":["被朝奉機關押住了","朝奉機關把你押在質庫裡：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you in the strongroom: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"3a3nC/1R4c2/2C1k2r1/9/9/r6N1/9/9/4p4/3K5","line":["h4g6","e7f7","g6e5","f7e7","e5d7"],"alt":{"h4g6":["e7f7",{"g6e5":["f7e7",{"e5d7":0}],"b8f8":["h9f8",{"i9f9":0}]}]}},
{"id":"sq291c4","src":{"book":"適情雅趣","title":"丹山起鳳"},"zh":["被朝奉機關押住了","朝奉機關把你押在質庫裡：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you in the strongroom: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"r1P1k4/5P3/9/6c2/9/9/9/9/2p3p2/1p1KCNNrc","line":["f0e2","g6e6","e2f4","e6i6","f4e6"],"alt":{"f0e2":["g6e6",{"e2f4":["e6i6",{"f4e6":0}],"e2d4":["e6a6",{"d4e6":0}]}]}},
{"id":"sq307c8","src":{"book":"適情雅趣","title":"寬一步勝"},"zh":["被朝奉機關押住了","朝奉機關把你押在質庫裡：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you in the strongroom: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"1Rb1k1C2/4a4/3a2N2/6p2/2p3n2/9/9/4n4/4Ac3/5K3","line":["b9c9","e8d9","c9d9","e9d9","g7f9"]},
{"id":"sq405c4","src":{"book":"適情雅趣","title":"雙鵲投林"},"zh":["被朝奉機關押住了","朝奉機關把你押在質庫裡：「這張當票上的局解得開，就放你走。」紅方先走，3 步將死黑方。"],"en":["Held by a clerk automaton","The clerk automaton holds you in the strongroom: \"Solve the game on this pawn ticket and you can go.\" Red to move: checkmate in 3."],"fen":"2P1ka3/6P2/N4a3/9/9/9/9/8p/3p1K3/2B1p4","line":["g8f8","d1e1","f1f2","e0d0","a7c8"]}]};
/* ==/JH_MZ_POOL:JH_MZ_POOL_CORNER2_TRAP== */
jhMzLayer("advisor_corner",2,{map:JH_MZ_CORNER2_MAP,guards:JH_MZ_CORNER2_GUARDS,solid:"#DBL",opaque:"#DBL",onStep:jhMzCorner2Step,
  pool:{door:JH_MZ_POOL_CORNER2.door,trap:JH_MZ_POOL_CORNER2_TRAP.trap},puz:{door:JH_MZ_POOL_CORNER2.door[0],trap:JH_MZ_POOL_CORNER2_TRAP.trap[0]},
  rew:[{k:"gong",zh:"門派貢獻",en:"School merit"},{k:"page",zh:"仕角炮譜殘頁",en:"Advisor-corner Cannon manual page"},{k:"frame",zh:"頭像框「算盤珠璣」",en:"Avatar frame: Abacus beads"}],
  lore:[{id:"ac4",kind:"doc",title:["典當行規","Pawnshop rules"],
    body:["紙上抄著一段記載：徽州商人很多到江南開當鋪，本錢雄厚，庫房防範得很嚴，鎖、柵、守夜一樣都不少。","The page copies an account: many Huizhou merchants opened pawnshops in Jiangnan, with deep capital and strongrooms guarded with great care: locks, grilles and night watchmen, nothing left out."],
    src:"遊戲整理，據沈德符《萬曆野獲編》；抄本本身是遊戲虛構"}],
  title:["🗝 質庫暗房","🗝 Pawn strongrooms"],lvName:["質庫暗房・第二層","Pawn strongrooms · Level 2"],
  intro:["石階往下，是當鋪更深的質庫，牆上嵌著幾面可以轉的大銅鏡。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。<b>往銅鏡走一步，就把它轉 90 度</b>，光束照出一整條。",
    "Down the steps lie the pawnshop's deeper strongrooms, with large bronze mirrors set in the walls that can be turned. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it). <b>Step toward a mirror to turn it 90 degrees</b>, and its beam lights a whole line."],
  warn:["<b>朝奉機關照仕的規矩巡</b>，看得到牠正在走的那一條斜線。轉銅鏡的那一刻，光束照到牠就會<b>眩暈兩回合</b>，趁機穿過那一間。",
    "<b>The clerk automatons patrol like an advisor</b>, seeing the diagonal they're moving along. When you turn a mirror and its beam hits one, it is <b>dazzled for two turns</b>: slip through its room then."],
  say:{door:["將死！仕角撐住、兵一路推上去，石門往兩旁滑開。","Checkmate! The advisor-corner holds and the pawn pushes through; the stone door slides apart."],
    locked:["石門被機關鎖住了。<b>先在質庫裡找到機關踏板踩下去。</b>","The stone door is locked by a mechanism. <b>Find the pressure plate somewhere in the strongrooms first.</b>"],
    retry:["你被押回了入口。<b>先轉銅鏡把朝奉照暈，再穿過那一間。</b>","You were marched back. <b>Turn a mirror to dazzle the automaton first, then cross its room.</b>"],
    done:["石階往下通到絕當秘庫，第三層之後再開。","The steps lead down to the forfeited vault. Level 3 opens later."]}});
