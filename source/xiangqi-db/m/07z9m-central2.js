/* ---------- W87-2 換層示範：中炮門地底迷宮・第二層「漕底淤廊」（11/26 Windows Claude 1 分派給 Windows Claude 2）----------
   這支只證明換層通：第一層樓梯「往下走」→ 下墜轉場「地底・第二層」→ 這一層；門內頁再進來可以選層。
   內容是最小示範：一條暗匪（車）在中間走廊巡、踏板、石門、三個箱子；題目先沿用第一層的題庫（JH_MZ_POOL_CENTRAL）。
   207 號文案的第二層（淺水窪耗兩回合、雙炮衛隔子看、兩步殺「中兵突破」、碑刻、稱號「破浪前行」）等 iMac Claude 1 複核完再照著補，
   到時候地圖、守衛、題庫都換掉；碑刻 L 會自動包到（這支在 07z9m-lore.js 後面）。 */
const JH_MZ_CENTRAL2_MAP=[
"###########",
"####.>.####",
"####...####",
"#####D#####",
"#T.......T#",
"#.#######.#",
"#C.......C#",
"#.#.###.#.#",
"#.#..P..#.#",
"#.###.###.#",
"#C........#",
"#####.#####",
"#....@....#",
"###########"];
jhMzLayer("central",2,{map:JH_MZ_CENTRAL2_MAP,guards:[{kind:"rook",x:5,y:6,dx:1,dy:0}],puz:JH_MZ_PUZ,pool:JH_MZ_POOL_CENTRAL,
  title:["🕳 漕底淤廊","🕳 Silted culvert"],lvName:["漕底淤廊・第二層","Silted culvert · Level 2"],
  intro:["你順著石階往下，腳下的泥越來越濕，這裡是漕倉底下的暗渠。<b>點地面就會走過去</b>，也可以按住搖桿往要去的方向推（拖搖桿右上角的 ✥ 可以換位置）。",
    "You follow the steps down; the mud underfoot grows wetter. This is the culvert under the granary. <b>Tap the floor to walk there</b>, or hold the joystick and push the way you want to go (drag the ✥ on it to move it)."],
  warn:["<b>中間的走廊有暗匪來回巡。</b>紅線是他看得到的地方，等他走到另一頭再過去。","<b>A thief paces the middle corridor.</b> The red line is what he can see. Wait until he reaches the far end, then cross."],
  say:{done:["石階還往下延伸，第三層之後再開。","The steps go on down. Level 3 opens later."]}});
