/* ---------- W48 其餘八派門內頁（開發者 11/23：「剩下 8 個門派的門內圖請開始繪製」「請盡快完成這項門派任務的工作」）----------
   門內圖：xiangqi-db/park/zmhall/hall_<名>_fix.png（Gemini 出圖，本機清掉匾額、對聯、草叢像字的筆觸）→ data/zmhall/<派>.webp（只放 CDN）。
   史學顧問審查稿：story/gemini_app/192（過宮炮第一版）、193（八派；必改與建議改已照改：起馬拿掉案上馬鞍與石馬、拴馬樁改石柱；仕角炮高櫃台加柵欄；
   反宮馬馬頭牆加青瓦、投石車縮成桌上小模型；列炮改交叉腳架上的單皮鼓、拍板鼓籤放鼓旁、拿掉高凳與空白匾板；順炮木人樁改梅花樁、方格鹽田改煎鹽灶；
   飛相石象改太湖石與銅鶴）。194r、194r2、194r4 複審：八張全部「可以上線」（11/23）。圖還沒上 CDN 時 JhHall 讀圖失敗會退回長卷小卡（JH_HALL_BAD），不會卡住。
   這支只寫資料與入口：每派 JH_HALL（門內圖版本、掌門座位、四個地點）＋一個玩法入口（各派玩法模組開出來的 jhXxxOpen），
   不動 07z9b JhHall 本體、不動各派玩法模組。座標都是門內圖原圖像素（768×1376）。
   掌門立繪：寬 60、cut .42（藏住抱著的大棋子字），seat 量在桌子後緣（193_seats.json）；比中炮、屏風馬的 66 小一點（史學顧問 192：立繪略大）。
   走路動線（JH_HALL_WALK）這一版先不放：沒有動線時 jhHallWalk 直接略過，點標籤一樣會開；動線之後補。 */
const JH_HALLS8={
  cross_palace:{v:"1123",seat:[385,366],spots:{hall:[385,150],study:[280,800],yard:[330,1080],gate:[384,1290]},
    play:{k:"paper",at:[620,880],zh:"📜 焙紙牆・宣紙蓋子位",en:"📜 Drying wall · Paper memory",fn:"jhGongOpen"},
    alt:["過宮炮門門內：門樓、紙坊前院與抄紙棚、講堂、溪邊焙紙牆與長廊橋，對岸最上面是掌門大廳","Inside the Palace-Crossing Cannon: a gatehouse, the paper-mill yard, a lecture hall, the drying wall and covered bridge by the stream, and the master's hall across the water"]},
  horse:{v:"1123",seat:[387,334],spots:{hall:[390,150],study:[390,800],yard:[540,1090],gate:[390,1290]},
    play:{k:"post",at:[215,1040],zh:"🐴 拴馬樁・驛馬繞險路",en:"🐴 Hitching post · Courier's path",fn:"jhQimaOpen"},
    alt:["起馬門門內：驛站門樓、石雕拴馬樁與馬廄、講堂、曲折石階與老松，最上面是掌門大廳","Inside the Horse Opening: a post-station gate, stone hitching posts and a stable, a lecture hall, a winding stairway with an old pine, and the master's hall at the top"]},
  advisor_corner:{v:"1123",seat:[401,379],spots:{hall:[392,170],study:[150,700],yard:[590,900],gate:[390,1250]},
    play:{k:"shop",at:[540,690],zh:"🏮 當鋪・算兌子",en:"🏮 Pawnshop · Count the trade",fn:"jhShijiaoOpen"},
    alt:["仕角炮門門內：水巷牌坊、花窗前院與角亭、講堂、當鋪高櫃台，最上面是掌門大廳，遠處有塔","Inside the Advisor-Corner Cannon: an archway by the canal, a yard with lattice windows and a corner pavilion, a lecture hall, a pawnshop counter, and the master's hall with a distant pagoda"]},
  palace_horse:{v:"1123",seat:[387,301],spots:{hall:[385,150],study:[385,850],yard:[385,1050],gate:[385,1290]},
    play:{k:"desk",at:[540,610],zh:"🖋 雕版案・活字排局陣",en:"🖋 Printing desk · Movable-type openings",fn:"jhFanggongOpen"},
    alt:["反宮馬門門內：石牌坊、石馬與投石車模型、講堂、刻書作坊，沿側廊上去是掌門大廳","Inside the Reverse Palace Horse: a stone archway, a stone horse and a trebuchet model, a lecture hall, a printing workshop, and the master's hall up the side gallery"]},
  opposite_cannon:{v:"1123",seat:[558,287],spots:{hall:[560,110],study:[350,780],yard:[300,960],gate:[370,1290]},
    play:{k:"stage",at:[610,960],zh:"🥁 戲台・擊板記譜局",en:"🥁 Stage · Clapper score",fn:"jhLiepaoOpen"},
    alt:["列炮門門內：牌坊、戲台與鼓架、講堂、山谷兩座樓閣以石橋相連，右上是掌門大廳","Inside the Opposite Cannons: an archway, a stage with a drum stand, a lecture hall, two pavilions joined by a stone bridge, and the master's hall at the upper right"]},
  same_cannon:{v:"1123",seat:[570,382],spots:{hall:[570,120],study:[610,780],yard:[440,1030],gate:[480,1290]},
    play:{k:"posts",at:[220,1000],zh:"🥊 練拳木樁・搶攻算殺步",en:"🥊 Practice post · Count to mate",fn:"jhShunpaoOpen"},
    alt:["順炮門門內：門樓、海堤邊的梅花樁、講堂、煎鹽灶，海邊兩座並排樓閣，右邊是掌門大廳","Inside the Same-Direction Cannons: a gatehouse, training stumps by the sea wall, a lecture hall, salt-boiling stoves, and two towers by the sea, the right one being the master's hall"]},
  elephant:{v:"1123",seat:[385,467],spots:{hall:[385,250],study:[385,740],yard:[385,1020],gate:[380,1300]},
    play:{k:"pavilion",at:[150,960],zh:"🏯 講經亭・築堤擺陣形",en:"🏯 Lecture pavilion · Build the formation",fn:"jhFeixiangOpen"},
    alt:["飛相門門內：門樓、水池與池邊亭子、太湖石與銅鶴、講堂，最上面是掌門大廳，遠處有塔","Inside the Flying Elephant: a gatehouse, a pond with a pavilion, garden rocks and bronze cranes, a lecture hall, and the master's hall with a distant pagoda"]},
  pawn:{v:"1123",seat:[384,287],spots:{hall:[390,110],study:[390,770],yard:[220,1090],gate:[380,1300]},
    play:{k:"rock",at:[370,950],zh:"🪨 指路奇岩・探路猜陣勢",en:"🪨 Signpost rock · Read the path",fn:"jhXianrenOpen"},
    alt:["仙人指路門門內：月洞門、園林前院、岔路口的太湖石、講堂、水池與小橋，最上面是掌門大廳","Inside the Pawn Opening: a moon gate, a garden yard, a tall rock at the fork, a lecture hall, ponds and a small bridge, and the master's hall at the top"]}};
if(typeof JH_HALL!=="undefined")for(const [sid,H] of Object.entries(JH_HALLS8))if(!JH_HALL[sid])
  JH_HALL[sid]={v:H.v,seat:H.seat,w:60,cut:.42,spots:H.spots,extra:{[H.play.k]:H.play.at}};
/* 門內頁畫完後：換圖說、出口改「出山門」（07z9b 預設是中炮門的「搭船」）、補上這一派的玩法入口 */
function jhHalls8Hall(v,sid){const H=JH_HALLS8[sid],P=v&&v.querySelector(".jh-hall");if(!H||!P)return;
  const img=P.querySelector("img");if(img)img.alt=jhL(H.alt[0],H.alt[1]);
  const g=P.querySelector('.jh-hall-spot[data-k="gate"]');if(g)g.innerHTML=`<b>${esc(jhL("‹ 出山門回十州棋館","‹ Out the gate to the Ten Prefectures"))}</b>`;
  /* 順風小字：放在自己的大廳標籤正下方，照當下那套圖算（07z9b jhNoteAt；橫式圖不能再用 768／1376 當除數，審查 #170） */
  const n=P.querySelector(".jh-hall-note");if(n&&typeof jhNoteAt==="function")jhNoteAt(n,H.spots.hall);
  const p=H.play;if(P.querySelector(`.jh-hall-spot[data-k="${p.k}"]`))return;
  if(!jhHalls8On("play_"+sid))return;   /* 遠端開關關掉這一派的玩法：門內頁照常，只是不放玩法入口 */
  const b=document.createElement("button");b.type="button";b.className="shp-spot jh-hall-spot";b.dataset.k=p.k;b.style.cssText=jhHallPc(p.at);b.innerHTML=`<b>${esc(jhL(p.zh,p.en))}</b>`;
  b.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}const f=typeof window!=="undefined"?window[p.fn]:null;if(typeof f==="function")f();else toast(jhL("這裡還在整理，晚點再來。","Not ready yet. Come back later."))};
  P.insertBefore(b,P.querySelector(".jh-hall-spot"))}
/* W72 遠端開關（m/00f-flags.js 的 xqFlag；沒有那支時一律開著）：
   halls8＝整個八派門內頁（關掉時小卡不顯示「走進山門」、直接打網址也退回長卷，跟門內圖讀不到走同一條路 JH_HALL_BAD）；
   play_<派>＝單獨關掉那一派的玩法入口（例如 play_same_cannon）。八派玩法只有這裡有入口，所以關這裡就等於關掉玩法。 */
function jhHalls8On(k){try{return typeof xqFlag!=="function"||xqFlag(k)}catch(e){return true}}
function jhHalls8Gate(){try{if(jhHalls8On("halls8")||typeof JH_HALL_BAD==="undefined")return;for(const sid of Object.keys(JH_HALLS8))JH_HALL_BAD.add(sid)}catch(e){}}
jhHalls8Gate();try{window.addEventListener("xqflags",jhHalls8Gate)}catch(e){}
try{if(typeof JhHall==="function"&&!JhHall.jhH8){const h0=JhHall;JhHall=function(v,sid){
  if(JH_HALLS8[sid]&&!jhHalls8On("halls8")){try{location.hash="#/jianghu"}catch(e){}return{}}
  const r=h0.apply(this,arguments);try{jhHalls8Hall(v,sid)}catch(e){}return r};JhHall.jhH8=1}}catch(e){}
