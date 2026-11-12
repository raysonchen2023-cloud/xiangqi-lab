/* ================= 🚶 3D 角色在滿版水墨圖上走動（開發者 11/8：先做星槎主畫面 #/adventure；同日「渡口和驛站也都要讓 3D 角色可以和在雲河星槎一樣走路活動」）=================
   玩家的角色（myChar() 的 Tripo 3D 模型；說書人的學徒、沒有模型時用 Q 版小人）站在圖上；點圖上的入口，角色轉身、播走路動作，沿量好的路線走到入口旁
   （0.6～1.2 秒，照距離），到了做一個小動作（伸手／鞠躬／歡呼），再開原本的入口；走向入口時再點同一個入口、或在做小動作時點一下＝直接開。
   意見回饋 782：點圖上不是入口的地方＝走過去（點在水、屋頂、天空就走到路網上離那裡最近的點），走到只換待機；走到一半點別處就改走新目標。
   走向哪個入口，那個入口的金框標籤就淡掉（shw-fade，0.25 秒到 0.15），角色才看得到站在門口；停好 1.5 秒後淡回正常（意見回饋 784），其他入口的標籤不動。
   開了哪個入口，回到這張圖時角色就站在那裡（每張圖各記各的，只記在記憶體，重開 App 回到起點）。角色在圖上時，到處走的小帥（.xqbot）先藏起來，離開就回來。
   3D 還沒載好、載不到、prefers-reduced-motion：不攔點選，照舊直接開。角色畫布 pointer-events:none，入口照舊在最上層。
   入口只是被「延後」：走到了用原本按鈕的 click() 再按一次，所以原本掛在入口上的東西（07v 景點掉寶、07u 包的 yzMail、千秋穿梭…）都照常。
   效能：角色另用一張小畫布畫（正交鏡頭）；站著 30fps、走路每格畫；離開頁面自己停並釋放 WebGL。
   共用的是 shwMount(o)：o.cfg＝座標表（見 SHW_SHIP），o.root＝攔點選的範圍，o.frame＝跟原圖一樣大的框（座標的 100%），o.layer＋o.before＝角色插在哪，
     o.sel／o.keyOf＝哪些是入口、入口的代號，o.find＝用代號找回入口，o.mem＝記住位置用的名字，o.gate＝回 false 時先不出現（渡口等下船過場播完）。
   座標表：W、H＝原圖像素；el＝鏡頭俯角（度）；h(y)＝角色身高佔圖高的比例；N＝節點［左%, 上%］（量的是腳底踩的地面）；E＝可以走的路（"a-b"，避開桌子、牆、樹、桅杆，不出地面）；
     HS＝入口 → ［停靠點, 面向的位置 左%, 上%, 動作 bow／wave／cheer］；home＝起點；look0＝站著時面向哪裡。停靠點都選在東西「前面」（腳比東西低），角色疊在圖上才不會像站在桌上。
   開關：SHIP_WALK_ON（星槎，07f-ship.js 的 Voyage 呼叫 shipWalk）、SHW_PORT_ON（渡口，包一層 portWind）、SHW_YZ_ON（驛站，包一層 yzInn）；SHW_PORT／SHW_YZ 有座標表的朝代才走。樣式在 shwCss */
const SHIP_WALK_ON=true,SHW_PORT_ON=true,SHW_YZ_ON=true;   /* 開發者 11/8 說全開 */
/* 回饋 808／816／820（開發者 11/9）：角色矮，遇到桌子就跳上去（820 起桌面是可以走的高台，見 shwTblAt 上面的說明）——座標表多一個 T:{桌面節點:{hy:桌下地板的 y%}}；桌面節點只連一條邊到桌邊的地板節點，
   走那一條邊時不用走的，改成跳（先蹲、空中拉長、落地再蹲一下，約 0.45 秒，程式做的位移和縮放，動作檔照舊只用待機）；站在桌上時身高照桌下地板的透視算（hy），不會變小；
   下一次點別的地方，先跳下來再走。prefers-reduced-motion 時整個走路角色本來就不出現；保險起見那時改成直接滑過去。開關 WALK_HOP_ON */
const WALK_HOP_ON=true;
const WALK_BOT_MERGE=true;   /* 回饋 802（開發者 11/9）：有走路角色的頁面，小帥（.xqbot）不再另外出現，走路角色兼小帥：點角色（或頭上的 💬）開小選單＝問問題、聽棋語、我的角色；小帥的話改說在角色頭上 */
/* 星槎主畫面 ship_map.webp 896×1200。意見回饋 787（開發者 11/8）：棋話一頁要真的走到船頭——從右舷沿船艙右邊的甲板（r2、r3）走到船頭講台前（lesson）；下船停在跳板中段 */
const SHW_SHIP={W:896,H:1200,el:35,h:y=>.088+(y-66)*.001,home:"home",look0:[50,84],
  N:{home:[60.5,70.5],pz:[55.5,69.2],bag:[50,69.8],c2:[44.5,68.6],read:[34.5,66.8],shelf:[31.5,62.5],d1:[26.8,67.6],t1:[22.5,71.5],t2:[24.5,77.5],sail:[23.8,79.2],l1:[30.6,57.5],parks:[32.5,51.5],g1:[65,66.2],port:[77.5,72.5],r1:[69.3,60],r2:[79.5,48],r3:[78.5,37.5],lesson:[74,31.5]},
  E:"home-pz pz-bag bag-c2 c2-read read-shelf read-d1 shelf-d1 d1-t1 t1-t2 t2-sail shelf-l1 l1-parks home-g1 pz-g1 g1-port g1-r1 r1-r2 r2-r3 r3-lesson",
  HS:{pz:["pz",50,58,"bow"],bag:["bag",50,76,"wave"],read:["read",31,71,"bow"],shelf:["shelf",24,58,"wave"],parks:["parks",13,40,"wave"],sail:["sail",17,83,"cheer"],port:["port",86,77,"wave"],lesson:["lesson",77,23,"bow"]}};
/* 渡口 port_<朝代>_f.webp、驛站 data/yizhan/<朝代>_f.webp 都是 768×1376、俯角 38°（沒寫的照 SHW_PG0）；h＝[身高, 在 y 多少時, 每往下 1% 加多少]。
   渡口入口代號＝按鈕 id（poPark 園子、poInn 驛站、poArena 擂台、poBattle 古戰場）、景點＝ps0、ps1…（PORT_SIGHT 的順序）；驛站＝yzTr 旅人、yzSec 秘境棋友、yzMail 信箱、yzLing 點將台（只有雲河驛站）、yzSight 史實小牌。
   開發者 11/8 選「標籤淡掉」：角色走向哪個入口，那個入口的金框標籤就淡掉（shw-fade），所以停靠點直接放在門口、桌前（標籤底下的地面）；開了入口就還原。
   遠方的景點（城樓、塔、山、河上的船）走到最靠近那個方向的空地，轉身看過去。擂台在對岸的（明）走到岸邊。 */
const SHW_PG0={W:768,H:1376,el:38,home:"home",look0:[45,90],h:[.045,60,.0009]};
const SHW_PORT={
  /* hspx 11/10「3D 小人不見了」：經典世界的渡口（port_classic，千秋石桌那一頁）原本沒有座標表，只出現平面小帥。
     起點在右下石階頂，木板橋上到中間石島（千秋石桌），左邊過石拱橋到老松下的石桌（青石園），再沿石階上擂台；右邊走木棧道到雲河驛站門口 */
  classic:{N:{home:[82,80],pl:[70,74.5],cen:[54,71],c1:[44,67],br1:[50,63.5],br2:[40,58.5],br3:[30.5,58.5],l1:[26,55.5],lp:[34,47.5],ar:[46,37.5],in1:[60,62],in2:[68,58.5],inn:[75,56.5]},
    E:"home-pl pl-cen cen-c1 c1-br1 br1-br2 br2-br3 br3-l1 l1-lp lp-ar br1-in1 in1-in2 in2-inn",
    HS:{poPark:["l1",22,50,"wave"],poInn:["inn",84,52,"bow"],poArena:["ar",56,30,"cheer"],poPh:["cen",57,66,"bow"]}},
  qin:{N:{home:[51,67],p1:[50,60.5],park:[31,61],inn:[76,63.5],i1:[64,63.5],battle:[55,51],arena:[52,43],s2:[64,44.5]},E:"home-p1 p1-park home-i1 p1-i1 i1-inn p1-battle battle-arena battle-s2 arena-s2",
    HS:{poPark:["park",29,56,"wave"],poInn:["inn",77.5,58,"bow"],poArena:["arena",52,35,"cheer"],poBattle:["battle",58,40,"wave"],ps0:["park",32,22,"wave"],ps1:["s2",82,26,"wave"],ps2:["s2",75,36,"wave"]}},
  han:{h:[.045,62,.0009],N:{home:[48,71],c:[45,62],park:[27,59.5],i1:[62,68],inn:[75.5,64.5],battle:[49,52],arena:[50,38],n0:[30,45],n1:[68,37]},E:"home-c c-park home-i1 c-i1 i1-inn c-battle battle-arena c-n0 arena-n1",
    HS:{poPark:["park",25,54,"wave"],poInn:["inn",77,59,"bow"],poArena:["arena",50,31,"cheer"],poBattle:["battle",50,42,"wave"],ps0:["n0",17,27,"wave"],ps1:["n1",86,24,"wave"]}},
  sanguo:{N:{home:[52,68],c:[53,60],park:[39,61.5],i1:[66,64],inn:[77,67.5],battle:[60,55],arena:[52,46.5],n1:[44,48],n2:[66,48],n3:[74,57]},E:"home-c c-park home-i1 c-i1 i1-inn c-battle battle-i1 c-n1 n1-arena arena-n2 i1-n3",
    HS:{poPark:["park",30,59,"wave"],poInn:["inn",82,63,"bow"],poArena:["arena",56,40,"cheer"],poBattle:["battle",64,49,"wave"],ps0:["n1",38,28,"wave"],ps1:["n2",80,24,"wave"],ps2:["n3",88,46,"wave"]}},
  weijin:{N:{home:[50,61],c:[45,56],park:[28,56.5],inn:[78,60.5],n1:[60,47],arena:[66,38.5],battle:[66,52],s0:[19,52],s1:[44,46]},E:"home-c c-park c-n1 n1-arena home-inn c-battle park-s0 c-s1",
    HS:{poPark:["park",27,51.5,"wave"],poInn:["inn",80,55,"bow"],poArena:["arena",65,32,"cheer"],poBattle:["battle",70,45,"wave"],ps0:["s0",12,28,"wave"],ps1:["s1",42,31,"wave"]}},
  nanbei:{N:{home:[42,62],c:[48,56],park:[33,58],battle:[62,53],inn:[78,62],n1:[52,45],arena:[60,41],s0:[38,47],s2:[62,62]},E:"home-c c-park c-battle battle-inn c-n1 n1-arena c-s0 home-s2 s2-inn",
    HS:{poPark:["park",33,54,"wave"],poInn:["inn",80,56,"bow"],poArena:["arena",62,34,"cheer"],poBattle:["battle",62,46,"wave"],ps0:["s0",24,30,"wave"],ps1:["n1",56,23,"wave"],ps2:["s2",72,75,"wave"]}},
  sui:{N:{home:[70,73],c:[66,64],inn:[73,64],p1:[52,60],park:[39,61],battle:[52,53],arena:[48,46.5],s0:[36,45]},E:"home-c c-inn c-p1 p1-park p1-battle battle-arena arena-s0",
    HS:{poPark:["park",28,60,"wave"],poInn:["inn",82,59,"bow"],poArena:["arena",55,38,"cheer"],poBattle:["battle",50,46,"wave"],ps0:["s0",24,31,"wave"],ps1:["arena",62,22,"wave"]}},
  tang:{N:{home:[40,66],c:[45,58],park:[26,60.5],inn:[72,68],battle:[42,52.5],arena:[45,41.5],n0:[32,46],n2:[68,38]},E:"home-c c-park home-inn c-inn c-battle battle-arena battle-n0 arena-n2",
    HS:{poPark:["park",24,55,"wave"],poInn:["inn",76,61,"bow"],poArena:["arena",45,35,"cheer"],poBattle:["battle",42,45,"wave"],ps0:["n0",28,16,"wave"],ps1:["arena",79,14,"wave"],ps2:["n2",88,33,"wave"]}},
  wudai:{N:{home:[55,69],r1:[64,62],inn:[76,59.5],r2:[56,51],c:[40,53],park:[31,47],n0:[38,38],s1:[22,57],battle:[58,46],arena:[62,34.5]},E:"home-r1 r1-inn r1-r2 r2-c c-park c-n0 c-s1 r2-battle battle-arena",
    HS:{poPark:["park",26,42,"wave"],poInn:["inn",78,53,"bow"],poArena:["arena",64,28,"cheer"],poBattle:["battle",64,38,"wave"],ps0:["n0",15,18,"wave"],ps1:["s1",12,56,"wave"]}},
  song:{N:{home:[52,71],c:[50,60],park:[28,62],inn:[72,68.5],battle:[55,52],arena:[55,41],n1:[40,46],n2:[74,42]},E:"home-c c-park home-inn c-inn c-battle battle-arena battle-n1 arena-n2",
    HS:{poPark:["park",25,56,"wave"],poInn:["inn",77,62,"bow"],poArena:["arena",55,34,"cheer"],poBattle:["battle",55,45,"wave"],ps0:["n1",30,17,"wave"],ps1:["n1",32,24,"wave"],ps2:["n2",88,38,"wave"]}},
  yuan:{N:{home:[50,68],c:[46,60],park:[32,61.5],inn:[67,63.5],battle:[46,55],arena:[46,44.5],s0:[33,48],m1:[62,44],s1:[78,43.5]},E:"home-c c-park home-inn c-inn c-battle battle-arena battle-s0 arena-m1 m1-s1",
    HS:{poPark:["park",30,57,"wave"],poInn:["inn",70,57,"bow"],poArena:["arena",50,40,"cheer"],poBattle:["battle",46,48,"wave"],ps0:["s0",29,44,"wave"],ps1:["s1",87,46,"wave"]}},
  ming:{N:{home:[42,67],c:[45,60],park:[24,63],inn:[77,70],arena:[42,56],battle:[50,56.5],n0:[26,53],n1:[53,55]},E:"home-c c-park c-arena arena-battle battle-n1 c-n0 home-inn",
    HS:{poPark:["park",34,62,"wave"],poInn:["inn",82,64,"bow"],poArena:["arena",47,36,"cheer"],poBattle:["battle",47,47,"wave"],ps0:["n0",12,30,"wave"],ps1:["n1",68,29,"wave"],ps2:["n1",78,16,"wave"]}},
  qing:{N:{home:[45,61],c:[47,56],park:[34,59.5],inn:[64,52.5],battle:[45,50],arena:[45,39.5],w:[36,38],n1:[32,31],n2:[60,60]},E:"home-c c-park c-inn c-battle battle-arena arena-w w-n1 home-n2 n2-inn",
    HS:{poPark:["park",33,55,"wave"],poInn:["inn",69,47,"bow"],poArena:["arena",50,33,"cheer"],poBattle:["battle",45,43,"wave"],ps0:["arena",86,18,"wave"],ps1:["n1",22,20,"wave"],ps2:["n2",84,82,"wave"]}}};
/* 意見回饋 782（開發者 11/8）：渡口景點也要走過去——每一朝加幾個路點，走到景點腳下或旁邊能站的地面；在遠山、對岸、水上真的到不了的（秦長城、三國火燒戰船與赤壁、南北朝山寺、宋雷峰塔與斷橋、明的對岸三景、清文峰塔、大雁塔），
   走到最靠近、還在地面上的地方再轉身望過去。N、E 併進 SHW_PORT[朝代]，HS 蓋掉原本的景點停靠點 */
const SHW_PSX={
  qin:{N:{wall:[36,38.5],q1:[70,33],beacon:[79,29],road:[72,35.5]},E:"arena-wall s2-q1 q1-beacon q1-road",HS:{ps0:["wall",32,22,"wave"],ps1:["beacon",82,24,"wave"],ps2:["road",76,34,"wave"]}},
  han:{N:{h1:[22,36],tower:[18,31],h2:[77,32],yumen:[83,29.5]},E:"n0-h1 h1-tower n1-h2 h2-yumen",HS:{ps0:["tower",17,26,"wave"],ps1:["yumen",86,24,"wave"]}},
  sanguo:{N:{ship:[40,43],cliff:[72,43],camp:[84,50]},E:"n1-ship n2-cliff n3-camp",HS:{ps0:["ship",38,28,"wave"],ps1:["cliff",80,24,"wave"],ps2:["camp",88,46,"wave"]}},
  weijin:{N:{bamboo:[17,46],creek:[45,37]},E:"s0-bamboo s1-creek",HS:{ps0:["bamboo",12,28,"wave"],ps1:["creek",42,31,"wave"]}},
  nanbei:{N:{nb1:[36,38],cave:[27,32],temple:[48,31],river:[66,63]},E:"s0-nb1 nb1-cave nb1-temple s2-river",HS:{ps0:["cave",24,27,"wave"],ps1:["temple",56,23,"wave"],ps2:["river",72,75,"wave"]}},
  sui:{N:{bank:[34,38.5],canal:[38,34.5]},E:"s0-bank s0-canal",HS:{ps0:["bank",24,31,"wave"],ps1:["canal",62,22,"wave"]}},
  tang:{N:{t1:[30,34],gate:[28,23.5],t2:[72,28],market:[86,37]},E:"n0-t1 t1-gate n2-t2 n2-market",HS:{ps0:["gate",28,16,"wave"],ps1:["t2",79,14,"wave"],ps2:["market",88,33,"wave"]}},
  wudai:{N:{far:[18,30],ruin:[17,61]},E:"n0-far s1-ruin",HS:{ps0:["far",15,18,"wave"],ps1:["ruin",12,56,"wave"]}},
  song:{N:{lamp:[84,43]},E:"n2-lamp",HS:{ps2:["lamp",88,38,"wave"]}},
  yuan:{N:{yurt:[30,48],zhan:[83,44]},E:"s0-yurt s1-zhan",HS:{ps0:["yurt",29,44,"wave"],ps1:["zhan",87,46,"wave"]}},
  qing:{N:{g1:[55,33],tower:[70,25],lake:[30,29.5],dock:[61,66]},E:"arena-g1 g1-tower n1-lake n2-dock",HS:{ps0:["tower",86,18,"wave"],ps1:["lake",22,20,"wave"],ps2:["dock",84,82,"wave"]}}};
const shwCfg=(B,X)=>{const C=Object.assign({},SHW_PG0,B);if(X){C.N=Object.assign({},B.N,X.N);C.E=B.E+" "+X.E;C.HS=Object.assign({},B.HS,X.HS)}return C};
const SHW_YZ={
  classic:{h:[.06,66,.0012],look0:[50,90],N:{home:[67,74.5],b1:[61,72.2],tr:[54,69.8],c1:[44,69.5],c2:[37.5,63],sec:[31,56],mail:[77,71],ling:[88,65.5]},E:"home-b1 b1-tr tr-c1 c1-c2 c2-sec home-mail b1-mail mail-ling",
    HS:{yzTr:["tr",54.5,62,"bow"],yzSec:["sec",21,51,"wave"],yzMail:["mail",81,66,"wave"],yzLing:["ling",86,55,"cheer"]}},
  qin:{h:[.065,60,.001],N:{home:[55,68],tr:[60,50.5],c:[42,62],sec:[29,60.5],mail:[73,66.5],r:[72,72],sight:[70,84]},E:"home-tr home-c c-sec home-mail home-r r-sight",
    HS:{yzTr:["tr",60,43,"bow"],yzSec:["sec",27,56,"wave"],yzMail:["mail",83,58,"wave"],yzSight:["sight",58,78,"wave"]}},
  han:{h:[.07,60,.001],N:{home:[50,68],tr:[52,59],sec:[24,63.5],mail:[78,72],sight:[30,80]},E:"home-tr home-sec home-mail home-sight",
    HS:{yzTr:["tr",52,50,"bow"],yzSec:["sec",22,57,"wave"],yzMail:["mail",80,64,"wave"],yzSight:["sight",45,80,"wave"]}},
  sanguo:{h:[.06,60,.001],N:{home:[52,64],tr:[55,53],sec:[31,63],mail:[73,67],p:[46,72],sight:[40,79]},E:"home-tr home-sec home-mail home-p p-sight",
    HS:{yzTr:["tr",56,46,"bow"],yzSec:["sec",28,59,"wave"],yzMail:["mail",80,62,"wave"],yzSight:["sight",61,85,"wave"]}},
  weijin:{h:[.065,60,.001],N:{home:[45,68],tr:[60,59.5],sec:[39,62],mail:[70,72],sight:[48,73]},E:"home-tr home-sec home-mail home-sight",
    HS:{yzTr:["tr",58,50,"bow"],yzSec:["sec",24,59,"wave"],yzMail:["mail",78,66,"wave"],yzSight:["sight",54,79,"wave"]}},
  nanbei:{h:[.07,60,.001],N:{home:[45,70],tr:[55,62],sec:[25,69],mail:[76,75],sight:[44,79]},E:"home-tr home-sec home-mail home-sight",
    HS:{yzTr:["tr",55,52,"bow"],yzSec:["sec",21,62,"wave"],yzMail:["mail",82,68,"wave"],yzSight:["sight",54,87,"wave"]}},
  sui:{h:[.07,60,.001],N:{home:[40,68],tr:[58,63],sec:[24,66],mail:[75,70],sight:[60,73]},E:"home-tr home-sec home-mail home-sight tr-mail",
    HS:{yzTr:["tr",56,55,"bow"],yzSec:["sec",16,59,"wave"],yzMail:["mail",85,63,"wave"],yzSight:["sight",67,82,"wave"]}},
  tang:{h:[.075,60,.001],N:{home:[38,68],tr:[55,58],sec:[24,63],n:[65,62],mail:[80,68],w:[42,80],sight:[58,84]},E:"home-tr home-sec home-n tr-n n-mail home-w w-sight",
    HS:{yzTr:["tr",58,48,"bow"],yzSec:["sec",24,57,"wave"],yzMail:["mail",84,61,"wave"],yzSight:["sight",60,76,"wave"]}},
  wudai:{h:[.07,60,.001],N:{home:[45,68],tr:[52,58],sec:[25,66],mail:[70,74],sight:[32,80]},E:"home-tr home-sec home-mail home-sight",
    HS:{yzTr:["tr",52,50,"bow"],yzSec:["sec",22,60,"wave"],yzMail:["mail",78,69,"wave"],yzSight:["sight",45,78,"wave"]}},
  song:{h:[.07,60,.001],N:{home:[45,66],tr:[60,58],sec:[22,67],mail:[80,70],w2:[32,70],sight:[33,80]},E:"home-tr home-sec home-mail home-w2 sec-w2 w2-sight",
    HS:{yzTr:["tr",60,49,"bow"],yzSec:["sec",20,60,"wave"],yzMail:["mail",85,62,"wave"],yzSight:["sight",46,77,"wave"]}},
  yuan:{h:[.065,60,.001],N:{home:[40,72],tr:[60,61],sec:[22,67],mail:[78,68],w:[46,85],sight:[60,88]},E:"home-tr home-sec home-mail home-w w-sight",
    HS:{yzTr:["tr",60,54,"bow"],yzSec:["sec",22,62,"wave"],yzMail:["mail",85,63,"wave"],yzSight:["sight",68,80,"wave"]}},
  ming:{h:[.07,60,.001],N:{home:[45,64],tr:[57,60],sec:[37,66],m1:[72,63],mail:[80,68],sight:[41,83]},E:"home-tr home-sec tr-m1 m1-mail home-sight",
    HS:{yzTr:["tr",57,52,"bow"],yzSec:["sec",34,61,"wave"],yzMail:["mail",86,62,"wave"],yzSight:["sight",55,80,"wave"]}},
  qing:{h:[.065,60,.001],N:{home:[45,62],tr:[60,59.5],sec:[28,63],mail:[85,62.5],sight:[60,70]},E:"home-tr home-sec home-mail home-sight tr-mail",
    HS:{yzTr:["tr",60,52,"bow"],yzSec:["sec",26,57,"wave"],yzMail:["mail",88,53,"wave"],yzSight:["sight",74,78,"wave"]}}};
const SHW_ACT={bow:"bow",wave:"wave_goodbye_01",cheer:"cheer"},SHW_MEM={},SHW_MEMH={};   /* SHW_MEMH：角色現在站在哪個入口前（那個標籤保持淡，開發者 11/8） */
/* 開發者 11/9（Gemini 評估「2D 插畫和 3D 小人要融在一起」，全部都做）：小人的燈光跟著背景走——
   背景換夜景（頁面 class 有 -night 或圖檔名有 _night，跟 07t3 ttNight 同一個判斷）＝月光：整體變暗、偏冷藍；
   白天圖在卯辰時（清晨）偏淡青、酉時（黃昏）偏暖，強弱照 07w7 sw7Tint（跟背景的時辰光影同步）。每秒看一次，有變才改燈 */
function shwLit(S,T,hl,dl){const P=S.box.closest(".shp-page")||document.querySelector("#view .shp-page"),im=P&&P.querySelector("img");
  const nt=!!P&&(/(^|\s)[\w-]*-night(\s|$)/.test(P.className)||!!(im&&/_night/.test(im.currentSrc||im.src||"")));
  const tn=!nt&&typeof sw7Tint==="function"?sw7Tint():null,k=(nt?"n":"d")+(tn?tn.c+Math.round(tn.a*20):"");if(S.litK===k)return;S.litK=k;
  if(nt){hl.color.set(0x8E9CC8);hl.groundColor.set(0x262438);hl.intensity=.78;dl.color.set(0xB4C3F0);dl.intensity=.42}
  else{hl.color.set(0xFFF6E8);hl.groundColor.set(0x6A5A48);hl.intensity=1.15;dl.color.set(0xFFFFFF);dl.intensity=.85}
  if(tn){const a=Math.max(0,Math.min(1,tn.a))*.6;if(tn.c==="dusk"){hl.color.lerp(new T.Color(0xFFD2A6),a);dl.color.lerp(new T.Color(0xFFC08A),a)}else{hl.color.lerp(new T.Color(0xE2EEF6),a);dl.color.lerp(new T.Color(0xE6F0FF),a)}}
  S.box.classList.toggle("nt",nt)}
function shwCss(){if(document.getElementById("shwCss"))return;const s=document.createElement("style");s.id="shwCss";s.textContent=`
.shw{position:absolute;left:0;top:0;width:0;height:0;pointer-events:none;transform-origin:0 0;opacity:0;transition:opacity .35s}
.shw.on{opacity:1}.shw canvas{position:absolute;display:block;pointer-events:none}
.shw-sh{position:absolute;border-radius:50%;background:radial-gradient(ellipse 50% 50% at 47% 52%,rgba(30,28,34,.4),rgba(30,28,34,.2) 52%,rgba(30,28,34,.06) 78%,rgba(30,28,34,0)),radial-gradient(ellipse 34% 42% at 62% 45%,rgba(30,28,34,.16),rgba(30,28,34,0));filter:blur(.7px);mix-blend-mode:multiply;pointer-events:none;transition:opacity 1.2s}
.shw.nt .shw-sh{opacity:.55}   /* 開發者 11/9（Gemini 評估「2D 與 3D 融合」，全部都做）：腳下影子改成淡墨暈開（不規則的兩團墨、邊緣化開、疊色），夜裡月光淡、影子也淡 */
body.shw-on .xqbot{visibility:hidden}
.shw-fade{opacity:.15!important;transition:opacity .25s ease!important}[data-shwnf].shw-fade{opacity:1!important}.shw-ink{position:absolute;width:36px;height:36px;margin:-18px 0 0 -18px;border-radius:50%;pointer-events:none;z-index:5;background:radial-gradient(closest-side,rgba(38,30,24,0) 38%,rgba(38,30,24,.42) 64%,rgba(38,30,24,.12) 86%,rgba(38,30,24,0));animation:shwInk .6s ease-out forwards}@keyframes shwInk{from{transform:scale(.3);opacity:.95}to{transform:scale(1.15);opacity:0}}@keyframes shwInkR{0%,60%{opacity:.7}100%{opacity:0}}@media (prefers-reduced-motion:reduce){.shw-ink{animation:shwInkR .4s linear forwards}}[data-shw-lift]{transition:translate .25s ease}.shw-iso{isolation:isolate}.shw-iso.shw-iso .shp-spot,.shw-iso.shw-iso .po-sight,.shw-iso.shw-iso [data-hs]{z-index:200}.shw-unfade{transition:opacity .6s ease!important}.shw-fade::after{animation:none!important;opacity:0!important}.shw-xt{position:absolute;z-index:4;transform:translate(-50%,-50%);pointer-events:none;white-space:nowrap;padding:3px 10px;border-radius:999px;background:rgba(246,239,223,.88);color:#3a2618;border:1px solid rgba(90,64,30,.3);font:700 13px/1.3 var(--serif,serif);box-shadow:0 1px 4px rgba(0,0,0,.18);opacity:0;animation:shwXt 4.2s ease-in-out forwards}@keyframes shwXt{0%{opacity:0}15%,75%{opacity:.8}100%{opacity:0}}@media (prefers-reduced-motion:reduce){.shw-xt{animation:none;opacity:.6}}`;document.head.append(s)}
const shwHt=(C,y)=>typeof C.h==="function"?C.h(y):C.h[0]+(y-C.h[1])*C.h[2];
const shwPx=(C,a,b)=>Math.hypot((b[0]-a[0])*C.W/100,(b[1]-a[1])*C.H/100);
function shwEdges(C){if(!C._e)C._e=C.E.split(" ").map(s=>s.split("-"));return C._e}
function shwPath(C,a,b){if(a===b)return[a];const N=C.N,D={},P={},Q=new Set(Object.keys(N));for(const k of Q)D[k]=1e9;D[a]=0;
  while(Q.size){let u=null;for(const k of Q)if(u===null||D[k]<D[u])u=k;Q.delete(u);if(u===b||D[u]>=1e9)break;
    for(const[x,y]of shwEdges(C)){const w=x===u?y:y===u?x:null;if(w&&Q.has(w)){const d=D[u]+shwPx(C,N[u],N[w]);if(d<D[w]){D[w]=d;P[w]=u}}}}
  if(D[b]>=1e9)return[a,b];const o=[b];while(o[0]!==a)o.unshift(P[o[0]]);return o}
/* 意見回饋 782：位置可以是節點名字，或 {p:[左%,上%], e:[節點a,節點b]}（路網某一段上的一點）；暫時把起點、終點接進路網再找最短路 */
function shwRoute(C,from,to){const N=Object.assign({},C.N),E=shwEdges(C).slice(),TE={},k=e=>e.slice().sort().join("|");
  const add=(id,q)=>{if(typeof q==="string")return q;N[id]=q.p;TE[id]=q.e;E.push([id,q.e[0]],[id,q.e[1]]);return id};
  const a=add("_a",from),b=add("_b",to);if(TE._a&&TE._b&&k(TE._a)===k(TE._b))E.push(["_a","_b"]);
  const ids=shwPath({W:C.W,H:C.H,N,_e:E},a,b),segE=[];for(let i=1;i<ids.length;i++)segE.push(TE[ids[i-1]]||TE[ids[i]]||[ids[i-1],ids[i]]);
  return{pts:ids.map(n=>N[n]),segE}}
function shwNear(C,p){let best=null;const W=C.W/100,H=C.H/100;for(const[a,b]of shwEdges(C)){const A=C.N[a],B=C.N[b];if(!A||!B)continue;if(C.T&&(C.T[a]||C.T[b]))continue;   /* 808：點空地不會停在跳上桌的那一段半空中 */
  const dx=(B[0]-A[0])*W,dy=(B[1]-A[1])*H,t=Math.max(0,Math.min(1,((p[0]-A[0])*W*dx+(p[1]-A[1])*H*dy)/(dx*dx+dy*dy||1))),d=Math.hypot((p[0]-A[0])*W-t*dx,(p[1]-A[1])*H-t*dy);
  if(!best||d<best.d)best={d,p:[A[0]+(B[0]-A[0])*t,A[1]+(B[1]-A[1])*t],e:[a,b]}}return best}
/* 點選位置換成原圖的百分比：星槎的入口層 .shp-hl 每格有位移＋轉動（立體視差、起伏），反算回去 */
function shwPt(S,e){const I=S.I,r=I.getBoundingClientRect();let x=(e.clientX-r.left)*I.clientWidth/(r.width||1),y=(e.clientY-r.top)*I.clientHeight/(r.height||1);const L=S.o.layer;   /* 意見回饋 785：圖可能被 07x 兩指放大，先除掉縮放 */
  if(L!==I){try{const cs=getComputedStyle(L),tf=cs.transform;if(tf&&tf!=="none"){const o=cs.transformOrigin.split(" ").map(parseFloat),M=new DOMMatrix().translate(o[0],o[1]).multiply(new DOMMatrix(tf)).translate(-o[0],-o[1]),q=M.inverse().transformPoint(new DOMPoint(x,y));x=q.x;y=q.y}}catch(err){}}
  return[x/I.clientWidth*100,y/I.clientHeight*100]}
/* 只有點在圖本身（圖、畫布、圖層容器）才算「點空地」；按鈕、連結、驛路小圓印、七星來訪等都不攔 */
function shwFreeOk(S,e){const t=e.target;if(!t||!t.closest||!S.M.contains(t))return false;if(t.closest("button,a,input,select,textarea,label,[role=button],[tabindex],.v7"))return false;
  return t===S.M||t===S.I||t.tagName==="IMG"||t.tagName==="CANVAS"||!!t.closest(".shp-hl,.px-sw,.shp-px,.ifx")}
const shwYaw=(C,a,b)=>Math.atan2((b[0]-a[0])*C.W/100,(b[1]-a[1])*C.H/100/Math.sin(C.el*Math.PI/180));
const shwWrap=d=>{while(d>Math.PI)d-=2*Math.PI;while(d<-Math.PI)d+=2*Math.PI;return d};
const shwRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
/* 816：點在哪張桌面上——回傳那張桌上離點最近的桌面節點 */
function shwInPoly(P,p){if(!P)return false;let c=false;for(let i=0,j=P.length-1;i<P.length;j=i++){const a=P[i],b=P[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c}
/* 回饋 820（開發者 11/9）：桌面是一塊可以走的高台——座標表 TB:{桌名:{poly:桌面, ob:[桌上不能踩的東西], hy:[桌面 y, 對應的地板 y, 每 1% 變多少], hops:[[地板節點,[桌上的落點]],...]}}；
   T:{桌上的入口節點:桌名}。在桌上照可見圖繞過障礙走（障礙的角往外推一點當轉角點，最短路）；上下桌從離目標最近的那個跳點跳 */
function shwTblAt(C,p){for(const k in C.TB||{})if(shwInPoly(C.TB[k].poly,p))return k;return null}
const shwSegPx=(C,p,a,b)=>{const W=C.W/100,H=C.H/100,ax=a[0]*W,ay=a[1]*H,dx=(b[0]-a[0])*W,dy=(b[1]-a[1])*H,px=p[0]*W,py=p[1]*H,t=Math.max(0,Math.min(1,((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(px-ax-t*dx,py-ay-t*dy)};
function shwPolyPx(C,P,p){let d=1e9;for(let i=0,j=P.length-1;i<P.length;j=i++)d=Math.min(d,shwSegPx(C,p,P[j],P[i]));return d}
function shwTOk(C,tb,p){if(!shwInPoly(tb.poly,p)||shwPolyPx(C,tb.poly,p)<5)return false;for(const o of tb.ob||[])if(shwInPoly(o,p)||shwPolyPx(C,o,p)<6)return false;return true}
function shwTStand(C,tb,p){if(shwTOk(C,tb,p))return p;const W=C.W/100,H=C.H/100;for(let r=4;r<=300;r+=4)for(let k=0;k<24;k++){const a=k/24*Math.PI*2,q=[p[0]+Math.cos(a)*r/W,p[1]+Math.sin(a)*r/H];if(shwTOk(C,tb,q))return q}return null}
function shwTSeg(C,tb,a,b){const n=Math.max(1,Math.ceil(shwPx(C,a,b)/3));for(let i=1;i<n;i++){const t=i/n;if(!shwTOk(C,tb,[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]))return false}return true}
function shwTPath(C,tb,a,b){if(shwTSeg(C,tb,a,b))return[a,b];const V=[a,b],W=C.W/100,H=C.H/100;
  for(const o of tb.ob||[]){const cx=o.reduce((s,q)=>s+q[0],0)/o.length,cy=o.reduce((s,q)=>s+q[1],0)/o.length;for(const q of o){const dx=(q[0]-cx)*W,dy=(q[1]-cy)*H,l=Math.hypot(dx,dy)||1;for(const r of[12,22]){const v=[q[0]+dx/l*r/W,q[1]+dy/l*r/H];if(shwTOk(C,tb,v)){V.push(v);break}}}}
  const n=V.length,D=Array(n).fill(1e9),P=Array(n).fill(-1),U=Array(n).fill(false);D[0]=0;
  for(;;){let u=-1;for(let i=0;i<n;i++)if(!U[i]&&(u<0||D[i]<D[u]))u=i;if(u<0||D[u]>=1e9||u===1)break;U[u]=true;
    for(let w=0;w<n;w++)if(!U[w]){const d=D[u]+shwPx(C,V[u],V[w]);if(d<D[w]&&shwTSeg(C,tb,V[u],V[w])){D[w]=d;P[w]=u}}}
  if(D[1]>=1e9)return null;const o=[1];while(o[0]!==0)o.unshift(P[o[0]]);return o.map(i=>V[i])}
/* 走不到 q（被桌上的東西圍住）：改走到「從 q 往起點方向」第一個走得到的可站處 */
function shwTReach(C,tb,a,q){if(!shwTOk(C,tb,a)){const a2=shwTStand(C,tb,a);if(a2){const P2=shwTReach(C,tb,a2,q);return[a].concat(P2)}}   /* 825：起點卡在障礙裡或桌邊外：先挪到最近的可站處 */
  let P=shwTPath(C,tb,a,q);if(P)return P;for(let k=1;k<=24;k++){const t=k/24,r=shwTStand(C,tb,[q[0]+(a[0]-q[0])*t,q[1]+(a[1]-q[1])*t]);if(r&&(P=shwTPath(C,tb,a,r)))return P}return[a]}
const shwTHy=(tb,p)=>tb.hy[1]+(p[1]-tb.hy[0])*tb.hy[2];
const shwLen=(C,pts)=>{let L=0;for(let i=1;i<pts.length;i++)L+=shwPx(C,pts[i-1],pts[i]);return L};
/* 一段一段做：走（地板或桌面）、跳 */
function shwNext(S){const g=S.go;if(!g)return;const ph=g.seq.shift();if(!ph)return;const C=S.C;
  if(ph.k==="h"){g.ph="hop";g.a=ph.a;g.b=ph.b;g.up=ph.up;g.tb=ph.tb;g.fn=ph.fn;g.th=0;S.curE=null;S.x=ph.a[0];S.y=ph.a[1];
    g.h0=ph.up?ph.a[1]:shwTHy(C.TB[ph.tb],ph.a);g.h1=ph.up?shwTHy(C.TB[ph.tb],ph.b):ph.b[1];return}
  if(g.fd==="in"){S.box.style.opacity="";S.box.style.transition=""}g.fd=ph.fade||null;g.ph=null;g.pts=ph.pts;g.segE=ph.segE||[];g.onT=ph.onT||null;g.L=shwLen(C,ph.pts);g.t=0;g.dur=g.L?Math.max(g.free?.35:.6,Math.min(1.2,.3+g.L/650)):0;if(g.fd){S.box.style.transition="none";if(g.dur)g.dur=Math.max(.7,g.dur)}}
/* 808：一跳（u 0→1）：先蹲（0～0.16）、空中照弧線走並拉長（0.16～0.86）、落地蹲一下；身高參考的 y 從 h0 換到 h1 */
function shwHop(S,a,b,u,h0,h1){S.hy=h0+(h1-h0)*u;if(shwRM()){S.x=a[0]+(b[0]-a[0])*u;S.y=a[1]+(b[1]-a[1])*u;S.sq=null;return}const p0=.16,p1=.86;
  if(u<p0){const k=u/p0;S.x=a[0];S.y=a[1];S.sq=[1+.12*k,1-.16*k];S.hy=h0}
  else if(u<p1){const v=(u-p0)/(p1-p0),s=Math.sin(Math.PI*v),hA=2.2+Math.abs(b[1]-a[1])*.35;S.x=a[0]+(b[0]-a[0])*v;S.y=a[1]+(b[1]-a[1])*v-hA*s;S.sq=[1-.08*s,1+.12*s];S.hy=h0+(h1-h0)*v}
  else{const k=(u-p1)/(1-p1),s=Math.sin(Math.PI*k);S.x=b[0];S.y=b[1];S.sq=[1+.1*s,1-.12*s];S.hy=h1}}
/* 星槎主畫面（07f-ship.js 的 Voyage 呼叫） */
function shipWalk(v,k){if(!SHIP_WALK_ON)return;const M=v.querySelector(".shp-map.full"),hl=M&&M.querySelector(".shp-hl");if(!hl)return;
  shwMount({v,cfg:SHW_SHIP,root:M,frame:M.querySelector(".shp-in"),layer:hl,before:hl.firstChild,sel:"[data-hs]",keyOf:b=>b.dataset.hs,find:h=>v.querySelector(`[data-hs="${h}"]`),mem:"ship"})}
/* 渡口、驛站：滿版圖 .shp-page.cq（圖寬 100%，框＝圖的大小），入口是 .shp-spot（id）和 .po-sight（渡口 data-ps、驛站 id） */
function shwPage(v,cfg,mem,gate){const P=v&&v.querySelector(".shp-page.cq");if(!P||!cfg)return;
  const kOf=b=>b.id||(b.dataset.ps!=null?"ps"+b.dataset.ps:""),fd=h=>/^ps\d+$/.test(h)?P.querySelector(`[data-ps="${h.slice(2)}"]`):P.querySelector("#"+h);
  shwMount({v,cfg,root:P,frame:P,layer:P,before:P.querySelector(".shp-spot,.po-sight"),sel:".shp-spot,.po-sight",keyOf:kOf,find:fd,mem,gate})}
const SHW_PORT_K=1.35;   /* 開發者 11/8：渡口的角色原本約圖高 3～4%，放大 1.35 倍 */
function shwPort(v,k){if(!SHW_PORT_ON||!SHW_PORT[k])return;const C=shwCfg(SHW_PORT[k],SHW_PSX[k]);if(Array.isArray(C.h))C.h=[C.h[0]*SHW_PORT_K,C.h[1],C.h[2]*SHW_PORT_K];shwPage(v,C,"port:"+k,()=>{const P=v.querySelector(".shp-page.cq");return!!P&&!P.classList.contains("pc-run")&&!document.querySelector(".walkc")})}   /* 07p 下船過場（pc-run）、步行小卡（.walkc）播完才出現 */
function shwYz(v,k){if(!SHW_YZ_ON||!SHW_YZ[k])return;shwPage(v,Object.assign({},SHW_PG0,SHW_YZ[k]),"yz:"+k,()=>!document.querySelector(".walkc"))}
if(typeof portWind==="function"){const f0=portWind;portWind=function(v,k){const r=f0.apply(this,arguments);try{shwPort(v,k)}catch(e){}return r}}
if(typeof yzInn==="function"){const f0=yzInn;yzInn=function(v,k){const r=f0.apply(this,arguments);try{shwYz(v,k)}catch(e){}return r}}
function shwMount(o){if(shwRM()||!o.root||!o.frame||o.root.dataset.shw)return;o.root.dataset.shw="1";shwCss();o.root.classList.add("shw-iso");
  const C=o.cfg,box=document.createElement("div");box.className="shw";box.setAttribute("aria-hidden","true");box.innerHTML='<i class="shw-sh"></i>';o.layer.insertBefore(box,o.before&&o.before.parentNode===o.layer?o.before:o.layer.firstChild);
  const at=SHW_MEM[o.mem],okAt=typeof at==="string"?!!C.N[at]:!!(at&&at.p&&at.e&&C.N[at.e[0]]&&C.N[at.e[1]]),S={o,C,v:o.v,M:o.root,I:o.frame,box,ready:false,pass:false,go:null,at:okAt?at:C.home};
  o.root.addEventListener("click",e=>shwClick(S,e),true);
  shwLoad(S).then(()=>{try{if(WALK_BOT_MERGE)shwBotHook(S)}catch(e){}}).catch(()=>{box.remove();S.ready=false;document.body.classList.remove("shw-on")})}
function shwClick(S,e){if(S.pass||!S.ready||!S.box.isConnected)return;const g=S.go;let b=e.target.closest&&e.target.closest(S.o.sel),tk=null;
  /* 回饋 816：桌上的東西本身（例如信房的信箋）也算入口：座標表 TS:{選擇器:入口代號}，先跳上桌再打開 */
  if(!b&&WALK_HOP_ON&&S.C.TS&&e.target.closest)for(const k in S.C.TS){const x=e.target.closest(k);if(x&&S.M.contains(x)){b=x;tk=S.C.TS[k];x.dataset.shwnf="1";break}}
  if(g&&!g.free&&(g.act>=0||(b&&b===g.btn))){e.stopPropagation();e.preventDefault();if(e.isTrusted)shwOpen(S);else setTimeout(()=>{if(S.go===g)shwOpen(S)},0);return}   /* 走向入口時再點同一個入口、或已經在做小動作：直接開 */
  /* 回饋 834（開發者 11/9：棋史卡沒反應、盤查入口點選）：別的東西用 入口.click() 轉過來的點選（一盞茶的茶碗 .cjm-hit、渡口碼頭 .ph4-pz）不是使用者真的點，
     這時入口自己的 click 還在進行中，shwOpen 裡再呼叫同一顆的 click() 會被瀏覽器直接略過（HTML 規定），結果走路被取消、什麼都沒開；所以這種點選延到下一輪再開 */
  if(b){const h=tk||S.o.keyOf(b),H=S.C.HS[h];if(!H||!S.C.N[H[0]])return;e.stopPropagation();e.preventDefault();vibrate(5);
    if(tk&&S.C.TB){const p=shwPt(S,e),tn=shwTblAt(S.C,p);if(tn){shwGo(S,{hs:h,btn:b,H,tbl:tn,tap:p});return}}   /* 820：點桌上的東西本身＝走到它旁邊最近的可站處再打開 */
    shwGo(S,{hs:h,btn:b,H});return}
  /* 開發者 11/12 hspx「在圖上快速點兩下角色，3D 角色會快速移動」：點到小人自己的 3D 畫布（「我的角色」按鈕沒蓋到的邊緣）被當成點空地，
     往旁邊最近的路點衝一小段（短路程最少 0.35 秒）；連點兩下就衝兩次。點到小人身上＝點角色（開選單），不走路；0.4 秒內在同一處再點一下也不重走 */
  {const cv=S.box.querySelector("canvas"),r=cv&&cv.getBoundingClientRect();   /* 小人是 pointer-events:none，點選會穿到底圖：用位置判斷是不是點在小人身上（畫布中間 70% 寬、85% 高） */
    if(r&&r.width>0&&!(e.target.closest&&e.target.closest(".shw-me,.shw-hint,.shw-menu"))&&e.clientX>=r.left+r.width*.15&&e.clientX<=r.right-r.width*.15&&e.clientY>=r.top+r.height*.1&&e.clientY<=r.bottom-r.height*.05){e.stopPropagation();e.preventDefault();const h=S.o.layer.querySelector(".shw-me");if(h&&h.style.display!=="none"&&e.isTrusted)h.click();return}}
  if(!shwFreeOk(S,e))return;const p=shwPt(S,e);if(!(p[0]>=0&&p[0]<=100&&p[1]>=0&&p[1]<=100))return;
  {const now=Date.now(),L=S.lastTap;S.lastTap={t:now,p};if(L&&now-L.t<400&&Math.hypot(p[0]-L.p[0],p[1]-L.p[1])<6){e.stopPropagation();e.preventDefault();return}}
  /* 回饋 816／820：點到桌面＝走到最近的桌邊跳上去、再在桌面上繞過障礙走到點的地方（點在障礙上＝走到旁邊最近的可站處）；人已經在桌上＝直接在桌面上走過去；不觸發別的 */
  if(WALK_HOP_ON&&S.C.TB){const tn=shwTblAt(S.C,p);if(tn){e.stopPropagation();e.preventDefault();shwInk(S,p);vibrate(5);shwGo(S,{free:1,tbl:tn,tap:p});return}}const q=shwNear(S.C,p);if(!q)return;shwInk(S,p);shwGo(S,{free:1,q,tap:p})}   /* 意見回饋 782：點空地＝走到路網上離那裡最近的點，走到只換待機 */
function shwGo(S,o){shwDrop();const C=S.C,g0=S.go;if(g0&&g0.btn&&g0.btn!==o.btn)g0.btn.classList.remove("shw-fade");
  if(S.stay&&S.stay!==o.btn){S.stay.classList.remove("shw-fade");S.stay=null;SHW_MEMH[S.o.mem]=null}
  /* 825：位置記錄不一致（記的是桌上的點、卻不在桌上；或桌上的點卡在障礙裡）時先修正，免得找路出錯、點哪裡都不動 */
  if(S.at&&typeof S.at==="object"&&!S.at.e){if(S.at.t&&C.TB&&C.TB[S.at.t]&&!(g0&&g0.ph))S.onT=S.at.t;else if(!S.onT)S.at=C.home}
  if(S.onT&&C.TB&&C.TB[S.onT]&&!(g0&&g0.ph)&&!shwTOk(C,C.TB[S.onT],[S.x,S.y])){const q=shwTStand(C,C.TB[S.onT],[S.x,S.y]);if(q){S.x=q[0];S.y=q[1]}}
  if(g0&&g0.ph==="hop"){S.x=g0.b[0];S.y=g0.b[1];S.sq=null;S.curE=null;if(g0.up){S.onT=g0.tb;S.hy=g0.h1}else{S.onT=null;S.hy=null;S.at=g0.fn}}   /* 跳到一半又點別處：先算跳完 */
  const fromF=()=>g0&&!g0.ph&&!g0.onT&&S.curE?{p:[S.x,S.y],e:S.curE}:S.at,flo=(f,t)=>{const R=shwRoute(C,f,t);return{k:"w",pts:R.pts,segE:R.segE}};
  let dT=null,dP=null,to;const seq=[];if(WALK_HOP_ON&&C.TB){if(o.tbl&&o.tap){dT=o.tbl;dP=o.tap}else if(!o.free&&C.T&&C.T[o.H[0]]){dT=C.T[o.H[0]];dP=C.N[o.H[0]]}}
  if(dT){const tb=C.TB[dT],q=shwTStand(C,tb,dP)||dP,ex=P=>shwPx(C,P[P.length-1],q)<10,tw2=P=>({k:"w",pts:P,onT:dT});
    /* 從各跳點跳上來、走到 q 的最好走法（走得到 q 的優先） */
    const up=f=>{let best=null;for(const[fn,tp]of tb.hops){const w=flo(f,fn),P=shwTReach(C,tb,tp,q),c=shwLen(C,w.pts)+shwLen(C,P)+(ex(P)?0:5000);if(!best||c<best.c)best={c,fn,tp,w,P}}return best};
    if(S.onT===dT){const P=shwTReach(C,tb,[S.x,S.y],q);let alt=null;
      if(!ex(P))for(const[fn,tp]of tb.hops){const P1=shwTPath(C,tb,[S.x,S.y],tp);if(!P1)continue;const b=up(fn);if(b&&ex(b.P)){const c=shwLen(C,P1)+b.c;if(!alt||c<alt.c)alt={c,fn,tp,P1,b}}}   /* 桌上被東西隔開：跳下去繞過來再跳上去 */
      if(alt)seq.push(tw2(alt.P1),{k:"h",a:alt.tp,b:C.N[alt.fn],up:0,tb:dT,fn:alt.fn},alt.b.w,{k:"h",a:C.N[alt.b.fn],b:alt.b.tp,up:1,tb:dT,fn:alt.b.fn},tw2(alt.b.P));else seq.push(tw2(P))}
    else{const b=up(fromF());seq.push(b.w,{k:"h",a:C.N[b.fn],b:b.tp,up:1,tb:dT,fn:b.fn},tw2(b.P))}
    {const L=seq[seq.length-1];to={p:L.pts[L.pts.length-1],t:dT}}}
  else{to=o.free?{p:o.q.p,e:o.q.e}:o.H[0];
    if(S.onT&&C.TB&&C.TB[S.onT]){const tb=C.TB[S.onT];let best=null;for(const[fn,tp]of tb.hops){const w=flo(fn,to),P=shwTPath(C,tb,[S.x,S.y],tp),c=(P?shwLen(C,P):5000+shwPx(C,[S.x,S.y],tp))+shwLen(C,w.pts);if(!best||c<best.c)best={c,fn,tp,w,P}}
      seq.push({k:"w",pts:best.P||[[S.x,S.y],best.tp],onT:S.onT},{k:"h",a:best.tp,b:C.N[best.fn],up:0,tb:S.onT,fn:best.fn},best.w)}
    else seq.push(flo(fromF(),to))}
  const last=seq[seq.length-1],end=last.k==="w"?last.pts[last.pts.length-1]:last.b;
  if(o.btn)o.btn.classList.add("shw-fade");
  S.go={free:!!o.free,hs:o.hs,btn:o.btn,to,seq,pts:[end],segE:[],L:0,dur:0,t:0,act:-1,
    look:o.tap&&(o.free||o.tbl)?(shwPx(C,end,o.tap)>14?shwYaw(C,end,o.tap):null):o.free?null:shwYaw(C,end,[o.H[1],o.H[2]]),A:o.free?null:o.H[3]};
  shwNext(S)}
{const f0=shwGo;shwGo=function(S,o){try{return f0(S,o)}catch(e){try{S.go=null;S.onT=null;S.hy=null;S.at=S.C.home;S.x=S.C.N[S.C.home][0];S.y=S.C.N[S.C.home][1];return f0(S,o)}catch(e2){}}}}   /* 825：萬一找路出錯，回到起點重找，不要整個卡住 */
/* 回饋 824（開發者 11/9）：每張有走路角色、頂欄有「‹返回」的滿版圖都有「出口」：點出口＝角色走過去、走出畫面（邊走邊淡出），再照頂欄返回一樣回上一頁（有面板開著就先關面板，同 xqPanelNav）。
   第一次進這一頁（還沒記位置）角色從出口走進來（邊走邊淡入）；平常不標字，每頁每次開 App 第一次進來，出口那裡淡淡閃一下「‹ 出去」（約 4 秒，不擋點選）。
   點選順序：入口標籤、桌上的東西（TS）＞出口＞07w6 點物件（我們 preventDefault，它就不跳卡）＞空地走路。走出去途中再點畫面＝直接出去（回饋 835，開發者 11/9 選：過場點兩下跳過）；走進來途中點別處＝先站到出口前的點再照常走。
   出口表 SHW_EXITS 照 mem 名字（"camp:*" 這種＝同一類各頁共用）：at＝出口前站的點（［左%,上%］新加的節點 _x，或現成節點名；不寫＝起點）、ln＝_x 接到哪些節點、out＝走出去的終點（可在圖外）、r＝點這一塊算出口［左,上,右,下］%（不寫＝不攔點選、不閃提示，只做走進來）；boat:1＝out 用 07w4 PH4_PIER 那一朝的船。
   沒寫的頁：起點在圖下緣（上% ≥ 85）＝從起點往下走出畫面，r＝起點左右各 10%、從腳下 1% 到圖底；起點在中間又沒寫＝不做。false＝不做（疊在頁上的面板 sj／mf／hq、星槎分頁）。
   頂欄沒有返回鍵（分頁首頁）時整個不出現：不走進來、不攔點選。座標表只加在這裡，各頁自己的座標表（07w6、07y5～07y7 等）不動。開關 SHW_EXIT_ON。 */
const SHW_EXIT_ON=true;
const SHW_EXITS={ship:false,sj:false,mf:false,hq:false,
  fbp:{at:[10,86],ln:"mid lft",out:[-8,88],r:[0,79,18,95]},   /* 信房：左下角跨過門檻往左出去 */
  gm2:{out:[53,82],r:[28,80,68,100]},   /* 特級大師畫廊：廊道盡頭是直欞窗不是門，往鏡頭這邊（來時的樓梯方向）走出去 */
  lib:{at:[88,75],ln:"stack",out:[106,75.5],r:[86,72.5,100,79]},   /* 書閣：書案後、書櫃下的走道往右走出去 */
  "camp:*":{at:"w0",out:[51,74],r:[36,68,64,81]},   /* 沙盤：沿小路走回我方營寨的營帳 */
  "port:*":{at:"pier",boat:1},   /* 渡口：806 已有碼頭盡頭的「⛵ 上星槎」標籤和點碼頭那一塊（07w4 PH4_PIER，量好的 pier 點和船），出口就用它，這裡不另攔點選；只加從船上走進來 */
  "yz:classic":{at:[73,81],ln:"home",out:[78,97],r:[68,80,88,99]},"yz:qin":{at:[64,90],ln:"sight",out:[60,104],r:[50,89,80,100]},
  "yz:han":{at:[72,88],ln:"mail",out:[74,104],r:[62,87,90,100]},"yz:sanguo":{at:[30,82],ln:"sight",out:[14,94],r:[6,80,36,100]},
  "yz:weijin":{at:[16,79],ln:"home",out:[42,100],r:[10,78,46,100]},"yz:nanbei":{at:[22,80],ln:"home",out:[10,98],r:[4,79,30,100]},
  "yz:sui":{at:[20,82],ln:"home",out:[8,98],r:[2,80,30,100]},"yz:tang":{at:[28,86],ln:"w",out:[18,100],r:[10,84,40,100]},
  "yz:wudai":{at:[50,86],ln:"sight",out:[42,100],r:[34,85,62,100]},"yz:song":{at:[25,85],ln:"sight",out:[14,100],r:[6,83,36,100]},
  "yz:yuan":{at:[32,88],ln:"w",out:[22,100],r:[14,86,42,100]},"yz:ming":{at:[30,74],ln:"home",out:[10,88],r:[4,72,36,92]},
  "yz:qing":{at:[38,67],ln:"home",out:[10,80],r:[4,65,42,82]}};   /* 驛站：石階、木橋、碼頭往下（往渡口）走出去 */
const SHW_XT={};
function shwExitOn(){const b=document.querySelector("#topbar #back");return!!(b&&!b.hidden&&b.getClientRects().length)}
function shwExitCfg(o){if(!SHW_EXIT_ON||!o||!o.cfg||!o.mem)return o;const m=o.mem,K=SHW_EXITS;let X=K[m];if(X===undefined)X=K[m.split(":")[0]+":*"];if(X===false)return o;
  const C=o.cfg,hP=C.N&&C.N[C.home];if(!hP)return o;if(!X){if(hP[1]<85)return o;X={out:[hP[0],108],r:[hP[0]-10,hP[1]-1,hP[0]+10,100]}}
  if(X.boat){const A=typeof PH4_PIER!=="undefined"&&PH4_PIER[m.split(":")[1]];if(!A||!A.boat)return o;X=Object.assign({},X,{out:A.boat})}
  let n=C.home,N=C.N,E=C.E;if(typeof X.at==="string"){if(!N[X.at])return o;n=X.at}else if(X.at){n="_x";N=Object.assign({},N,{_x:X.at});E=E+" "+(X.ln||C.home).split(" ").filter(k=>N[k]&&k!=="_x").map(k=>k+"-_x").join(" ")}
  return Object.assign({},o,{cfg:Object.assign({},C,{N,E,_e:null}),X:{n,out:X.out,r:X.r}})}
const SHW_XR=[];   /* 各頁出口點區（給 07t3 籤筒讓位用）：{f:圖框, r:[左,上,右,下]%} */
{const f0=shwMount;shwMount=function(o){let o2=o;try{o2=shwExitCfg(o)}catch(e){o2=o}try{if(o2&&o2.X&&o2.X.r&&o2.frame){for(let i=SHW_XR.length-1;i>=0;i--)if(!SHW_XR[i].f.isConnected)SHW_XR.splice(i,1);SHW_XR.push({f:o2.frame,r:o2.X.r})}}catch(e){}return f0(o2)}}
/* 11/12 ChatGPT UI 冗餘盤查（story/104 號）第 3 項：原本第一次進頁在出口附近放一個「‹ 出去」（不能點、4 秒消失，但長得像按鈕），跟 07w9 真的出口標籤同時出現＝兩個出口。
   改成只讓真的出口（圖上的 .ex-spot；沒有圖上出口的頁才是頂欄返回鍵）外框短暫亮起（07w9 的 .ex-hi，約 4 秒），不另外放假按鈕。出口標籤晚一點才長出來，最多等 5 秒 */
function shwXTip(S){const X=S.o.X,m=S.o.mem;if(SHW_XT[m]||!X.r)return;SHW_XT[m]=1;try{shwXHi(S.o.frame||S.o.root,0)}catch(err){}}
function shwXHi(F,n){const P=F&&F.isConnected?(F.closest&&F.closest(".shp-page"))||F:null,ex=P?P.querySelector(".ex-spot"):null,bk=document.querySelector("#topbar #back");
  const b=ex||(n>=6&&bk&&!bk.hidden&&bk.getClientRects().length?bk:null);
  if(!b){if(n<25&&P)setTimeout(()=>shwXHi(F,n+1),200);return null}
  try{if(typeof exCss==="function")exCss()}catch(e){}b.classList.remove("ex-hi");void b.offsetWidth;b.classList.add("ex-hi");setTimeout(()=>b.classList.remove("ex-hi"),4200);
  /* 11/12 真人玩家 P1（第一次下象棋）：「回到首頁的出入口第一次會不知道在哪邊，多點幾次就還好」。只亮框不夠明顯：前 3 次再加一句泡泡指著出口（別的泡泡、面板開著就不搶） */
  try{const k=+store.get("exTipN",0)||0;if(k<3&&!document.querySelector(".tmx-bub,#sheet.show,.modal")&&typeof tmxBub==="function"&&tmxBub(b,"要回去，點這裡",3800))store.set("exTipN",k+1)}catch(e){}
  return b}
function shwWin(S){const X=S.o.X,C=S.C;if(!X||S.o.win0||!shwExitOn())return;S.o.win0=1;shwXTip(S);if(SHW_MEM[S.o.mem]!=null||S.at!==C.home||S.go)return;
  const A=C.N[X.n],R=shwRoute(C,X.n,C.home),seq=[{k:"w",pts:[X.out,A],fade:"in"}];if(R.pts.length>1)seq.push({k:"w",pts:R.pts,segE:R.segE});
  S.x=X.out[0];S.y=X.out[1];S.box.style.transition="none";S.box.style.opacity="0";
  S.go={free:true,win:1,to:C.home,seq,pts:[C.N[C.home]],segE:[],L:0,dur:0,t:0,act:-1,look:shwYaw(C,C.N[C.home],C.look0),A:null};shwNext(S);S.place()}
shwStay=function(S){try{shwWin(S)}catch(e){}};
/* 開發者選定（Gemini 第二次評估 47 第 7 節第 1 項「略過走路動畫」）：點入口後角色照常走過去；走到之前再點同一個入口（或同一個標籤、器物）就立刻打開（shwClick 本來就這樣接，
   這裡補上淡出淡入和桌上狀態）。整個 App 第一次走向入口時，標籤下面出一行小字「再點一次，直接進去」（約 3 秒，只出一次，記在 store 的 shwTapTip）。 */
function shwTapTip(S,b){if(typeof store==="undefined"||store.get("shwTapTip",0))return;store.set("shwTapTip",1);const L=S.o.layer,lr=L.getBoundingClientRect(),br=b.getBoundingClientRect();if(!lr.width||!lr.height)return;
  const e=document.createElement("i");e.className="shw-xt shw-tt";e.setAttribute("aria-hidden","true");e.textContent="再點一次，直接進去";
  e.style.left=Math.max(16,Math.min(84,(br.left+br.width/2-lr.left)/lr.width*100)).toFixed(2)+"%";e.style.top=Math.min(95,(br.bottom-lr.top)/lr.height*100+2.4).toFixed(2)+"%";L.append(e);setTimeout(()=>e.remove(),3400)}
/* 開發者選定（同上第 3 項「地圖熱點視覺提示」）：入口淡淡呼吸光。光暈畫在入口對應的器物上（座標表 HS 的「面向位置」），不是標籤上；
   第一次進頁：全部入口依序淡淡亮一次（約 1.3 秒）；之後 20 秒沒碰畫面，才每 7 秒輪一個入口亮一下，一碰畫面就重新計時。角色在走、頁面藏起來時不亮。
   光暈比器物大一圈（約圖寬 28%，標籤蓋在器物上時外圈仍看得到），日景是暖黃淡光帶一圈淡墨邊、夜景是燈火色（screen 疊色）；pointer-events:none 不擋點選；prefers-reduced-motion 整個不出現。
   07w6 物件第一次閃輪廓（.sci-fx.hint）讓入口先：入口亮的那 1.8 秒先等，再閃物件（只用 CSS 延後，不動 07w6）。開關 SHW_BR_ON */
const SHW_BR_ON=true;
function shwBrCss(){if(document.getElementById("shwBrCss"))return;const s=document.createElement("style");s.id="shwBrCss";s.textContent=`
.shw-br{position:absolute;width:var(--d);height:var(--d);margin:calc(var(--d) / -2) 0 0 calc(var(--d) / -2);border-radius:50%;pointer-events:none;z-index:3;opacity:0;
  background:radial-gradient(closest-side,rgba(255,232,160,.42),rgba(255,214,120,.34) 52%,rgba(168,112,40,.3) 76%,rgba(168,112,40,0));animation:shwBr 1.3s ease-in-out forwards}
.shw-br.n{background:radial-gradient(closest-side,rgba(255,214,140,.5),rgba(255,190,100,.3) 52%,rgba(255,170,80,.18) 76%,rgba(255,170,80,0));mix-blend-mode:screen}
@keyframes shwBr{0%{opacity:0;transform:scale(.82)}45%{opacity:.9;transform:scale(1)}100%{opacity:0;transform:scale(1.08)}}
.shw-brfirst .sci-fx.hint{animation-delay:1.8s!important;animation-fill-mode:both!important}
.shw-tt{animation-duration:3.2s}
@media (prefers-reduced-motion:reduce){.shw-br{display:none}}`;document.head.append(s)}
function shwBreath(S){if(!SHW_BR_ON||shwRM())return;const C=S.C,L=S.o.layer,I=S.I,M=S.M;if(!C.HS||!L||!I)return;shwBrCss();
  const night=()=>{const im=I.tagName==="IMG"?I:I.querySelector("img");return!!(im&&/_night/.test(im.currentSrc||im.src||""))||/(^|[ -])(night|dk)( |$)|-night|hq-dk/.test(M.className)};
  const keys=()=>Object.keys(C.HS).filter(h=>{const e=S.o.find(h);return e&&e.isConnected&&e.getClientRects().length>0&&getComputedStyle(e).visibility!=="hidden"&&C.HS[h][1]!=null});
  const glow=(h,dl)=>{const H=C.HS[h];if(!H||!I.clientWidth||!L.isConnected)return;const e=document.createElement("i");e.className="shw-br"+(night()?" n":"");e.setAttribute("aria-hidden","true");
    e.style.setProperty("--d",Math.round(Math.max(80,I.clientWidth*.28))+"px");e.style.left=(H[1]*I.clientWidth/100).toFixed(1)+"px";e.style.top=(H[2]*I.clientHeight/100).toFixed(1)+"px";if(dl)e.style.animationDelay=dl+"ms";
    L.insertBefore(e,S.box.parentNode===L?S.box:L.firstChild);setTimeout(()=>e.remove(),1500+(dl||0))};
  M.classList.add("shw-brfirst");setTimeout(()=>M.classList.remove("shw-brfirst"),4800);
  setTimeout(()=>{if(!document.hidden)keys().forEach((h,i)=>glow(h,i*140))},500);
  let last=Date.now(),i=0,nx=0;M.addEventListener("pointerdown",()=>{last=Date.now()},true);
  const it=setInterval(()=>{if(!S.box.isConnected||!M.isConnected){clearInterval(it);return}const now=Date.now();if(document.hidden||S.go||now-last<20000||now<nx)return;
    const K=keys();if(!K.length)return;glow(K[i++%K.length]);nx=now+7000},1000)}
{const f1=shwStay;shwStay=function(S){f1(S);try{if(!S.o.br0){S.o.br0=1;shwBreath(S)}}catch(e){}}}
{const f0=shwOpen;shwOpen=function(S){const g=S.go,X=S.o.X;try{if(g&&!g.free&&(g.ph==="hop"||g.t<g.dur||(g.seq&&g.seq.length))){const C=S.C;S.sq=null;S.curE=null;   /* 走到一半再點同一個入口＝直接開：角色淡一下站到入口前，不卡在半路（Gemini 第二次評估第 7 節第 1 項，開發者選定） */
    if(g.to&&g.to.t&&C.TB&&C.TB[g.to.t]){S.onT=g.to.t;S.hy=shwTHy(C.TB[g.to.t],g.to.p)}else{S.onT=null;S.hy=null}
    S.box.style.transition="none";S.box.style.opacity="0";requestAnimationFrame(()=>requestAnimationFrame(()=>{S.box.style.transition="";S.box.style.opacity=""}))}}catch(e){}const r=f0(S);try{if(g&&X&&g.to===X.n)delete SHW_MEM[S.o.mem]}catch(e){}return r}}   /* 從出口那個點的入口離開（渡口「⛵ 上星槎」）也算走了，下次進來照樣從船上走進來 */
function shwExitDo(S){const C=S.C,P=C.N[C.home];S.go=null;S.curE=null;S.onT=null;S.hy=null;S.sq=null;S.at=C.home;delete SHW_MEM[S.o.mem];SHW_MEMH[S.o.mem]=null;S.box.style.transition="none";S.box.style.opacity="0";S.anim("idle",1);
  const bk=document.querySelector("#topbar #back");try{if(bk&&!bk.hidden)bk.click();else history.back()}catch(e){}
  setTimeout(()=>{if(!S.box.isConnected||S.go)return;S.x=P[0];S.y=P[1];S.yaw=shwYaw(C,P,C.look0);S.place();S.box.style.transition="";S.box.style.opacity=""},1500)}
{const f0=shwGo;shwGo=function(S,o){const g0=S.go;if(g0&&g0.fd){S.box.style.opacity="";S.box.style.transition=""}const r=f0(S,o);try{if(o&&o.free&&o.tap&&S.go)S.go.tap=o.tap}catch(e){}   /* 回饋 835：記下點空地的那一點，再點同一處＝直接到（shwFinish） */
  try{if(o&&o.btn&&!o.free&&!o.ex)shwTapTip(S,o.btn)}catch(e){}try{const X=S.o.X;if(o&&o.ex&&X&&S.go){S.go.seq.push({k:"w",pts:[S.C.N[X.n],X.out],fade:"out"});S.go.ex=1}}catch(e){}return r}}
{const f0=shwClick;shwClick=function(S,e){try{const X=S.o.X,g=S.go,t0=e.target;
    /* 回饋 835（開發者 11/9 選：過場點兩下跳過）：點空地走路途中，再點同一個地方（離目標 SHW_FF_PX 原圖像素內）＝角色直接到那裡；點別處照舊改走新目標 */
    if(g&&g.free&&!g.win&&!g.ex&&g.tap&&!S.pass&&S.ready&&S.box.isConnected&&shwFreeOk(S,e)&&!(t0.closest&&t0.closest(S.o.sel))){const p=shwPt(S,e);if(shwPx(S.C,p,g.tap)<SHW_FF_PX){e.stopPropagation();e.preventDefault();shwInk(S,p);shwFinish(S);return}}
    if(X&&!S.pass&&S.ready&&S.box.isConnected){
    if(g&&g.ex){e.stopPropagation();e.preventDefault();shwExitDo(S);return}   /* 回饋 835（開發者 11/9 選：過場點兩下跳過）：往出口走、走出畫面途中再點一下＝不等角色走完，直接出去（原本淡出那段點了不理） */
    if(g&&g.fd==="in"){const A=S.C.N[X.n];S.go=null;S.curE=null;S.x=A[0];S.y=A[1];S.at=X.n;S.box.style.opacity="";S.box.style.transition="";S.place()}
    const t=e.target,TS=S.C.TS;if(X.r&&shwExitOn()&&shwFreeOk(S,e)&&!(t.closest&&t.closest(S.o.sel))&&!(TS&&t.closest&&Object.keys(TS).some(k=>t.closest(k)))){const p=shwPt(S,e),r=X.r;
      if(p[0]>=r[0]&&p[0]<=r[2]&&p[1]>=r[1]&&p[1]<=r[3]){e.stopPropagation();e.preventDefault();vibrate(5);shwInk(S,p);shwGo(S,{H:[X.n,X.out[0],X.out[1],null],ex:1});return}}}}catch(err){}return f0(S,e)}}
/* 回饋 835（開發者 11/9 選：過場點兩下跳過）：把正在走的這一趟一口氣做完——跳桌的每一跳、每一段路都直接算到終點，結果跟走完一樣（位置記憶 SHW_MEM、桌上狀態、面向）；
   走向入口＝shwOpen 打開、走向出口＝shwExitDo 出去、點空地＝站到那裡。SHW_FF_PX＝「點同一處」的範圍（原圖像素） */
const SHW_FF_PX=60;
function shwFinish(S){const C=S.C;for(let n=0;n<60&&S.go;n++){const g=S.go;
  if(g.ph==="hop"){S.sq=null;S.curE=null;S.x=g.b[0];S.y=g.b[1];if(g.up){S.onT=g.tb;S.hy=g.h1}else{S.onT=null;S.hy=null;S.at=g.fn}g.ph=null;g.pts=[g.b];g.segE=[];g.onT=g.up?g.tb:null;g.t=g.dur=g.L=0;if(g.seq&&g.seq.length)shwNext(S);continue}
  const q=g.pts&&g.pts[g.pts.length-1];if(q){S.x=q[0];S.y=q[1]}if(g.onT&&C.TB&&C.TB[g.onT]){S.curE=null;S.hy=shwTHy(C.TB[g.onT],[S.x,S.y])}
  if(g.seq&&g.seq.length){shwNext(S);continue}
  if(g.fd){S.box.style.opacity="";S.box.style.transition=""}
  if(g.ex){shwExitDo(S);return}
  if(g.free){S.go=null;S.curE=null;S.at=SHW_MEM[S.o.mem]=g.to;if(g.look!=null)S.yaw=g.look;S.anim("idle",1);S.place();return}
  shwOpen(S);return}}
function shwOpen(S){const g=S.go;if(!g||g.free)return;S.go=null;S.curE=null;S.at=SHW_MEM[S.o.mem]=g.to;{const P=typeof g.to==="string"?S.C.N[g.to]:g.to.p;S.x=P[0];S.y=P[1]}S.yaw=g.look;S.anim("idle",1);S.place();
  let b=g.btn;if(!b||!b.isConnected)b=S.o.find(g.hs);if(!b)return;S.pass=true;try{b.click()}finally{S.pass=false;if(g.btn!==b)g.btn.classList.remove("shw-fade");b.classList.add("shw-fade");S.stay=b;SHW_MEMH[S.o.mem]=null;shwUnfade(S,b,1500)}}
/* 意見回饋 784（開發者 11/8）：走路途中標籤淡到 0.15；角色停好 1.5 秒後標籤淡回正常，回到這一頁時標籤一律照常（不再一直保持淡，免得像被藏起來） */
function shwInk(S,p){try{const L=S.o.layer,I=S.I;if(!L||!I.clientWidth)return;const e=document.createElement("i");e.className="shw-ink";e.setAttribute("aria-hidden","true");
  e.style.left=(p[0]*I.clientWidth/100).toFixed(1)+"px";e.style.top=(p[1]*I.clientHeight/100).toFixed(1)+"px";L.append(e);setTimeout(()=>e.remove(),800)}catch(err){}}   /* 開發者 11/8：點空地時點到的地方淡淡暈開一個水墨圈（約 36px、0.6 秒擴散淡出；prefers-reduced-motion 只閃一下） */
function shwLift(S,b){try{const cv=S.box.querySelector("canvas");if(!cv||!b.isConnected||b.dataset.nolift)return;const r=b.getBoundingClientRect(),c=cv.getBoundingClientRect(),hx=c.left+c.width*.3,hx2=c.right-c.width*.3,top=c.top+c.height*.08;
  if(r.right<hx||r.left>hx2||r.top>c.bottom||r.bottom<top)return;const sc=b.offsetHeight?r.height/b.offsetHeight:1,d=Math.ceil((r.bottom-top+4)/(sc||1));if(d>0){b.style.translate="0 -"+d+"px";b.dataset.shwLift="1"}}catch(err){}}   /* 開發者 11/8：角色放大後，站定時標籤不要被角色蓋住：往上挪到角色頭頂 */
function shwDrop(){document.querySelectorAll("[data-shw-lift]").forEach(x=>{x.style.translate="";delete x.dataset.shwLift})}
function shwUnfade(S,b,ms){clearTimeout(S.uf);S.uf=setTimeout(()=>{if(!b.isConnected||(S.go&&S.go.btn===b))return;shwLift(S,b);b.classList.add("shw-unfade");b.classList.remove("shw-fade");if(S.stay===b)S.stay=null;setTimeout(()=>b.classList.remove("shw-unfade"),700)},ms)}
function shwStay(S){}
/* 回饋 803：滿版頁上的全螢幕面板（碑林拓片、信房大箋…）也登記一筆上一頁紀錄：按左上「‹返回」、手機的返回鍵、瀏覽器上一頁＝先收起面板，回到場景；
   用 xqPanel 記號（不用 sheet 的 xqSheet，免得關掉面板上的小卡片時被一起退掉）。回傳一個「用按鈕收起時」要呼叫的函式（把那一筆退掉） */
/* 回饋 822／823（開發者 11/9，iPhone 有瀏海）：場景頁的面板要放在頂欄和底部導覽中間。量頂欄下緣、底欄上緣（沒有底欄就用 safe-area），寫成 CSS 變數 --xqT、--xqB，
   面板用 top:var(--xqT)、bottom:var(--xqB)；頂欄、底欄變高變矮（換頁、轉向、字型載好）都重量 */
function xqBars(){try{const R=document.documentElement,t=document.getElementById("topbar"),b=document.getElementById("tabbar"),vh=window.innerHeight||R.clientHeight;
  let pr=document.getElementById("xqSafeProbe");if(!pr){pr=document.createElement("div");pr.id="xqSafeProbe";pr.style.cssText="position:fixed;left:0;top:0;width:0;height:0;visibility:hidden;pointer-events:none;padding-top:var(--safeT,0px);padding-bottom:var(--safeB,0px)";document.body.append(pr)}
  const cs=getComputedStyle(pr),sT=parseFloat(cs.paddingTop)||0,sB=parseFloat(cs.paddingBottom)||0,vis=e=>e&&e.offsetParent!==null&&e.offsetHeight>0;
  const T=vis(t)?Math.max(sT,t.getBoundingClientRect().bottom):sT,B=vis(b)?Math.max(sB,vh-b.getBoundingClientRect().top):sB;
  R.style.setProperty("--xqT",Math.round(T)+"px");R.style.setProperty("--xqB",Math.round(B)+"px")}catch(e){}}
{let q=0;const go=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;xqBars()})};addEventListener("resize",go);addEventListener("orientationchange",()=>[0,150,400,800,1500].forEach(t=>setTimeout(go,t)));try{if(window.visualViewport)visualViewport.addEventListener("resize",go)}catch(e){}   /* hspx 第 1035 列：轉向後 iPhone 的高度要一陣子才更新，分幾次重量 */addEventListener("hashchange",()=>{go();setTimeout(go,300)});
  const init=()=>{go();try{const ro=new ResizeObserver(go);["topbar","tabbar"].forEach(id=>{const e=document.getElementById(id);if(e)ro.observe(e)});new MutationObserver(go).observe(document.getElementById("tabbar")||document.body,{attributes:true,attributeFilter:["style","class","hidden"]})}catch(e){}try{document.fonts.ready.then(go)}catch(e){}};
  if(document.readyState==="loading")addEventListener("DOMContentLoaded",init);else init()}
let XQP_N=0;addEventListener("popstate",()=>{if(!(history.state||{}).xqPanel||XQP_N>0)return;setTimeout(()=>{if((history.state||{}).xqPanel&&XQP_N<=0)history.back()},0)});   /* 面板已經不在（開著面板直接換頁留下的）那一筆：自動再退一格 */
function xqPanelNav(close){let on=true;XQP_N++;try{const d=NAV_D+1;history.pushState({xqPanel:1,d},"",location.href);NAV_D=d;if(typeof navMark==="function")navMark(d,true,true)}catch(e){}
  const done=()=>{if(!on)return false;on=false;XQP_N=Math.max(0,XQP_N-1);removeEventListener("popstate",pop);removeEventListener("hashchange",gone);return true};
  const pop=()=>{const st=history.state||{};if(st.xqPanel)return;if(done())try{close()}catch(e){}};const gone=()=>{done()};addEventListener("popstate",pop);addEventListener("hashchange",gone);
  return()=>{if(!done())return;try{if(history.state&&history.state.xqPanel)history.back()}catch(e){}}}
/* ---------- 回饋 828（開發者 11/9「我的戰績那一頁也是只有滿版繪圖，底下的額外跳新的視窗，比照修正紀錄的做法」）----------
   滿版場景頁圖下面原本接的內容（清單、卡片、按鈕、說明）一律收進一張面板，照 812 修正紀錄榜文的做法：夾在頂欄與底欄之間（--xqT／--xqB）、可以捲、
   返回鍵／點面板外面／✕ 都收起；顏色跟 App 的日夜主題走（--bg／--ink，深色主題＝深色面板），字不會跟底色撞在一起。頁面本身只剩滿版圖。
   xqSheet(v,{t:標題,cap:小字}) → S：S.open(要捲到的元素或選擇器，null＝捲到最上面；第二個參數＝換標題)、S.close()、S.on()、S.title(t)、S.b＝捲動區。
   xqSheetMove(v,P,S)：把 #view 裡排在滿版圖 P 後面的內容（不含 fixed／absolute 的浮層）整塊「搬」進 S.b——是同一批節點，按鈕、事件、之後重畫都照舊；
   之後才加進來的也自動搬。各頁只要把原本「捲到圖下某一塊」的入口改成 S.open(那一塊)。 */
function xqSheetCss(){if(document.getElementById("xqsCss"))return;const s=document.createElement("style");s.id="xqsCss";s.textContent=`
.xqs-s{position:fixed;inset:0;z-index:948;background:rgba(20,14,8,.35);display:none}.xqs-s.open{display:block}
.xqs{position:fixed;left:50%;top:calc(var(--xqT,56px) + 8px);bottom:calc(var(--xqB,64px) + 8px);width:min(94vw,520px);z-index:949;display:flex;flex-direction:column;box-sizing:border-box;
  transform:translate(-50%,10px) scale(.97);opacity:0;visibility:hidden;pointer-events:none;transition:transform .25s ease,opacity .2s,visibility 0s linear .25s;border-radius:3px;color:var(--ink);background:var(--bg);
  border:2px solid rgba(58,42,28,.8);box-shadow:inset 0 0 0 5px var(--bg),inset 0 0 0 6px rgba(140,104,64,.6),0 12px 32px rgba(0,0,0,.45)}
.xqs.open{transform:translate(-50%,0);opacity:1;visibility:visible;pointer-events:auto;transition:transform .25s ease,opacity .2s}
.xqs-h{position:relative;flex:none;display:flex;align-items:center;justify-content:center;padding:14px 46px 6px;font:900 19px/1.25 var(--kai,var(--serif,serif));letter-spacing:4px;color:var(--accent);text-align:center}
.xqs-h button{position:absolute;right:2px;top:2px;border:0;background:none;font-size:22px;line-height:1;color:var(--ink);cursor:pointer;padding:6px 8px;letter-spacing:0;min-width:44px;min-height:44px;display:flex;align-items:center;justify-content:center}
.xqs-c{flex:none;text-align:center;font:600 13px/1.5 var(--serif,serif);color:var(--muted);padding:0 14px 6px;margin:0 12px;border-bottom:1px solid var(--line)}
.xqs-b{flex:1;min-height:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;padding:6px 4px 14px;border-top:1px solid var(--line);margin:0 6px}
.xqs-b>*{margin-top:0}.xqs-b .xqs-dup{display:none}
@media (prefers-reduced-motion:reduce){.xqs,.xqs.open{transition:none}}`;document.head.append(s)}
function xqSheet(v,o){xqSheetCss();o=o||{};const sc=document.createElement("div");sc.className="xqs-s";const el=document.createElement("div");el.className="xqs";el.setAttribute("role","dialog");
  el.innerHTML='<div class="xqs-h"><b></b><button type="button" aria-label="收起">✕</button></div><div class="xqs-c"></div><div class="xqs-b"></div>';
  const c=el.querySelector(".xqs-c");if(o.cap)c.textContent=o.cap;else c.remove();v.append(sc,el);let un=null;const b=el.querySelector(".xqs-b");
  const shut=()=>{el.classList.remove("open");sc.classList.remove("open")};
  const S={el,b,on:()=>el.classList.contains("open"),title(t){el.querySelector(".xqs-h b").textContent=t||"";el.setAttribute("aria-label",t||"")},
    close(){shut();if(un){const f=un;un=null;f()}},
    go(sel){let n=0;const f=()=>{if(sel==null){b.scrollTop=0;return}const t=typeof sel==="string"?b.querySelector(sel):sel;
      if(t&&b.contains(t)){b.scrollTop=Math.max(0,b.scrollTop+t.getBoundingClientRect().top-b.getBoundingClientRect().top-6)}else if(++n<25)setTimeout(f,120)};setTimeout(f,40)},
    open(sel,t){if(t!=null)S.title(t);if(!S.on()){el.classList.add("open");sc.classList.add("open");if(typeof xqPanelNav==="function")un=xqPanelNav(()=>{un=null;shut()})}S.go(sel);xqSheetDup(S)}};
  el._S=S;S.title(o.t);{let q=0;new MutationObserver(()=>{clearTimeout(q);q=setTimeout(()=>xqSheetDup(S),80)}).observe(b,{childList:true,subtree:true})}el.querySelector(".xqs-h button").onclick=()=>S.close();sc.onclick=()=>S.close();return S}
/* 回饋 834（開發者 11/9 截圖：面板標題「語音報棋」底下又一行「語音報子」，「太冗餘重複，盤查所有類似頁面」）：
   面板一打開（或內容換了），看面板裡「第一個看得到的東西」：如果是一行小標（.sec-t，裡面沒有按鈕或連結），而且
   ①整張面板只有這一個小標，或 ②小標跟面板標題的漢字一樣／互相包含（例如「🕯 氛圍」底下的「氛圍」），就把那行小標藏起來，標題已經說了。
   有好幾段的面板（例如「棋盤與走棋特效」底下的「棋盤風格」「走棋顯示與特效」）各段小標照留。只在面板裡藏（.xqs-b .xqs-dup），內容搬回原頁就恢復 */
function xqSheetDup(S){try{const b=S.b;b.querySelectorAll(".xqs-dup").forEach(x=>x.classList.remove("xqs-dup"));if(!S.on())return;
  const cj=s=>(s||"").replace(/[^㐀-鿿]/g,""),T=cj(S.el.querySelector(".xqs-h b").textContent);
  const see=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=="hidden";
  const H=[...b.querySelectorAll(".sec-t")].filter(see);if(!H.length)return;
  let f=null;for(const e of b.querySelectorAll("*")){if(!see(e))continue;if(e.matches("img,svg,canvas,input,select,button,textarea")||[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())){f=e;break}}
  const h=H[0];if(!f||!h.contains(f)||h.querySelector("button,a,input,select"))return;
  const c=cj(h.textContent);if(H.length===1||(c&&T&&(T.includes(c)||c.includes(T))))h.classList.add("xqs-dup")}catch(e){}}
function xqSheetMove(v,P,S){const V=document.getElementById("view")||v,F=Node.DOCUMENT_POSITION_FOLLOWING;
  const ok=c=>{if(c===S.el||c.classList.contains("xqs")||c.classList.contains("xqs-s")||c.matches("script,style,template,link"))return false;const cs=getComputedStyle(c);return cs.position!=="fixed"&&cs.position!=="absolute"&&cs.display!=="none"};   /* 藏起來的（display:none）先不搬，等它出現（每秒看一次）再搬 */
  const mv=()=>{if(!P.isConnected)return;const L=[];const walk=el=>{for(const c of[...el.children]){if(c===P)continue;if(c.contains(P)){walk(c);continue}if((P.compareDocumentPosition(c)&F)&&ok(c))L.push(c)}};walk(V);L.forEach(c=>S.b.append(c))};
  mv();const it=setInterval(()=>{if(!P.isConnected){clearInterval(it);return}mv()},1000);const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}mv()});let e=P.parentNode;while(e&&V.contains(e)){mo.observe(e,{childList:true});if(e===V)break;e=e.parentNode}
  return()=>{mo.disconnect();clearInterval(it)}}
/* 828：各頁原本「點圖上標籤＝捲到圖下某一塊」的寫法不用改——那一塊搬進面板後，玩家剛點過（1.5 秒內）時對它 scrollIntoView＝打開面板並捲到那裡；
   不是玩家點的（頁面自己捲）就不打開，也不捲動整頁。 */
let XQS_UT=0;addEventListener("click",()=>{XQS_UT=Date.now()},true);
{const f0=Element.prototype.scrollIntoView;Element.prototype.scrollIntoView=function(){try{const x=this.closest&&this.closest(".xqs");if(x&&x._S){if(x._S.on())x._S.go(this);else if(Date.now()-XQS_UT<1500)x._S.open(this);return}}catch(e){}return f0.apply(this,arguments)}}
/* 828：所有滿版場景頁（#view 裡的 .shp-page）自動套用：圖下面有內容就整塊搬進面板，頂欄右邊加一顆「📜」打開（標題＝頁名）；圖下沒東西就什麼都不做。
   各頁自己做了面板（例如 07z2 我的戰績）就不重複套。開關 XQS_AUTO_ON */
const XQS_AUTO_ON=true;let XQS_CUR=null;
const XQS_NOTB=["#/gm","#/openings","#/redo","#/cup"];   /* 回饋 830：這幾頁圖上的標籤本來就會打開面板並捲到那一塊（特級大師的畫像長廊、開局各節、錯棋清單、千秋盃各欄），頂欄就不再放 📜，免得同一個面板兩個入口 */
function xqSheetAuto(){if(!XQS_AUTO_ON)return;const V=document.getElementById("view");if(!V)return;const P=V.querySelector(".shp-page");if(!P||V.querySelector(".xqs")||P.closest(".xqs"))return;
  const tt=document.getElementById("title"),S=xqSheet(V,{t:tt?tt.textContent.trim():"清單"});xqSheetMove(V,P,S);
  const vis=c=>c.offsetHeight>4&&[c,...c.querySelectorAll("*")].some(e=>e.getClientRects().length>0&&(e.matches("img,canvas,svg,input")?e.offsetHeight>4:[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())));   /* 真的看得到字或圖才算（面板收著時 innerText 是空的，不能用） */
  const tb=()=>{if(!S.el.isConnected){mo.disconnect();return}const tr=document.getElementById("topRight");if(!tr)return;let any=[...S.b.children].some(vis);let b=tr.querySelector(".xqs-tb");
    if(any&&XQS_NOTB.some(h=>location.hash===h||location.hash.startsWith(h+"?")))any=false;
    if(any&&!b){b=document.createElement("button");b.type="button";b.className="ib xqs-tb";b.textContent="📜";b.title="清單與說明";b.setAttribute("aria-label","打開清單與說明");b.onclick=()=>{if(!S.el.isConnected){b.remove();return}if(typeof vibrate==="function")vibrate(5);S.open(null)};tr.prepend(b)}
    else if(!any&&b)b.remove()};
  const mo=new MutationObserver(()=>{clearTimeout(S._tb);S._tb=setTimeout(tb,60)});mo.observe(S.b,{childList:true,subtree:true,attributes:true,attributeFilter:["style","hidden","class"]});S._tbf=tb;XQS_CUR=S;tb()}
/* 開發者 11/12「棋力測驗右上角卷軸按了沒作用」：開始頁是場景（有面板、頂欄放 📜），按開始後換成棋盤、面板被拿掉，頁面沒重設頂欄，📜 留著卻指向已經不在的面板。畫面一換就檢查，面板不在了就收掉 📜 */
function xqsTbGc(){const b=document.querySelector("#topRight .xqs-tb");if(b&&!(XQS_CUR&&XQS_CUR.el.isConnected))b.remove()}
{let q=0;const run=()=>{clearTimeout(q);try{xqsTbGc()}catch(e){}q=setTimeout(()=>{try{xqSheetAuto()}catch(e){}},0);setTimeout(()=>{try{xqSheetAuto();if(XQS_CUR&&XQS_CUR.el.isConnected)XQS_CUR._tbf()}catch(e){}},700)};
  const init=()=>{const V=document.getElementById("view");if(!V)return;new MutationObserver(run).observe(V,{childList:true});addEventListener("hashchange",run);run()};
  if(document.readyState==="loading")addEventListener("DOMContentLoaded",init);else init()}
/* ---------- 回饋 802：走路角色兼小帥 ----------
   角色身上一顆透明按鈕、頭上一個小 💬：點了在角色旁邊開水墨小選單（問問題＝askSheet、聽棋語＝讓小帥講一句（BOT.act）、我的角色＝#/me）；
   小帥講的話（bot3d 的 xq-bot-said 事件）在角色頭上用宣紙小泡泡顯示。位置跟著 07w 每格寫的 translate／scale 和畫布大小（跟 07z 的 hmMe 同一算法） */
function shwBotCss(){if(document.getElementById("shwBotCss"))return;const s=document.createElement("style");s.id="shwBotCss";s.textContent=`
.shw-me{position:absolute;z-index:150;background:transparent;border:0;padding:0;border-radius:40%;cursor:pointer;-webkit-tap-highlight-color:transparent}
.shw-hint{position:absolute;z-index:151;transform:translate(-50%,-100%);border:1px solid rgba(60,40,24,.55);border-radius:10px 10px 10px 2px;background:#f6efdf;color:#3a2618;font:700 11px/1 var(--serif,serif);padding:3px 5px;cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.25);opacity:.92;pointer-events:none}
.shw-say{position:absolute;z-index:210;transform:translate(-50%,-100%);max-width:62%;width:max-content;background:#fbf6ea;color:#2f2216;border:1.5px solid #3a2618;border-radius:12px;padding:5px 10px;font:700 12.5px/1.45 var(--serif,serif);text-align:center;box-shadow:0 2px 6px rgba(0,0,0,.22);pointer-events:none;opacity:0;transition:opacity .25s}
.shw-say.on{opacity:1}.shw-say.side::after{display:none}.shw-say.low{z-index:190}.shw-say::after{content:"";position:absolute;left:50%;bottom:-7px;margin-left:-6px;border:6px solid transparent;border-top-color:#3a2618;border-bottom:0}
.shw-menu{position:absolute;z-index:211;pointer-events:auto;display:flex;flex-direction:column;gap:4px;padding:6px;background:#f6efdf url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Cfilter id='n'%3E%3CfeTurbulence baseFrequency='.9'/%3E%3CfeColorMatrix values='0 0 0 0 .4 0 0 0 0 .3 0 0 0 0 .2 0 0 0 .06 0'/%3E%3C/filter%3E%3Crect width='80' height='80' filter='url(%23n)'/%3E%3C/svg%3E");border:1.5px solid #3a2618;border-radius:10px;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.shw-menu button{border:1px solid rgba(60,40,24,.35);border-radius:999px;background:rgba(255,255,255,.55);color:#2f2216;font:800 13px/1 var(--serif,serif);padding:7px 12px;white-space:nowrap;text-align:left;cursor:pointer}
.shw-menu button:active{background:#e9d9b4}`;document.head.append(s)}
/* 回饋 804：泡泡別蓋住標籤（⚔ 古戰場等）：疊到標籤就往有空的那一邊挪，再不行就放到腳下；都擠，才沉到標籤底下（z 190＜標籤 200） */
function shwSayFit(el,L,below){try{el.style.marginLeft=el.style.marginTop=el.style.maxWidth="";el.classList.remove("side","low");const labs=[...L.querySelectorAll(".shp-spot,.po-sight")].filter(b=>b.offsetParent&&getComputedStyle(b).opacity!=="0").map(b=>b.getBoundingClientRect());
  const LR=L.getBoundingClientRect(),cl=()=>{const a=Math.max(LR.left,0)+4,b=Math.min(LR.right,innerWidth)-4;if(el.getBoundingClientRect().width>b-a)el.style.maxWidth=Math.floor(b-a)+"px";const q=el.getBoundingClientRect();let d=0;if(q.left<a)d=a-q.left;else if(q.right>b)d=b-q.right;if(d){el.style.marginLeft=((parseFloat(el.style.marginLeft)||0)+d)+"px";el.classList.add("side")}};   /* 11/9 開發者截圖：角色站在左邊說長句，泡泡超出畫面左邊被切掉；最後一律推回畫面裡 */
  for(const mw of["","44%","34%"]){el.style.maxWidth=mw;const r=el.getBoundingClientRect(),w=r.width,hit=(dx,dy)=>labs.filter(q=>!(q.right<r.left+dx+2||q.left>r.right+dx-2||q.bottom<r.top+dy+2||q.top>r.bottom+dy-2));
    const h0=hit(0,0);if(!h0.length){if(mw)el.classList.add("side");cl();return}
    const up=Math.min(...h0.map(q=>q.top))-r.bottom-6,C=[[-(w/2+24),0],[w/2+24,0],[-(w+30),0],[w+30,0],[0,up],[-w/3,up],[w/3,up]];if(below)C.push([0,below],[-w/3,below],[w/3,below],[-w/2,below],[w/2,below]);
    for(const[dx,dy]of C){if(r.left+dx<LR.left+2||r.right+dx>LR.right-2||r.bottom+dy>LR.bottom-2||r.top+dy<LR.top+2)continue;if(!hit(dx,dy).length){el.style.marginLeft=dx+"px";el.style.marginTop=dy+"px";el.classList.add("side");cl();return}}}
  el.style.maxWidth="";el.classList.add("low");cl()}catch(e){}}
/* 11/11 模擬玩家問題 2（#/theme「↩ 走回書院」被自己的角色蓋住，點了變成開「問問題／聽棋語／我的角色」）：角色身上那顆透明按鈕（.shw-me，z 150）
   不能蓋到圖上其他可點的東西——出口標籤（07w9 的 .ex-spot 只有 z 4）、入口標籤、船頭點區（.ex-bow）、其他按鈕連結。量它們在 L 裡的位置（0.5 秒內用快取），
   重疊就把按鈕切掉那一塊（上下左右四種切法留面積最大的）；剩不到 16px 就回 null（整顆收起來，點角色身上照舊是走路／開入口）。回傳 [左,上,寬,高]（L 裡的 px） */
function shwHitCut(L,box,l,t,w,h){try{const now=performance.now();let K=L._shwKo;
  if(!K||now-K.t>500){const LR=L.getBoundingClientRect(),k=L.offsetWidth?LR.width/L.offsetWidth:1,R=[];
    for(const e of L.querySelectorAll(".shp-spot,.po-sight,[data-hs],.shp-hs,.ex-bow,button,a[href]")){if(box.contains(e)||e.closest(".shw-me,.shw-hint,.shw-menu"))continue;const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.width*r.height>LR.width*LR.height*.5)continue;   /* 蓋半張圖以上的點選層不算 */
      if(e.checkVisibility&&!e.checkVisibility({opacityProperty:true,visibilityProperty:true}))continue;R.push([(r.left-LR.left)/k-3,(r.top-LR.top)/k-3,(r.right-LR.left)/k+3,(r.bottom-LR.top)/k+3])}
    K=L._shwKo={t:now,R}}
  let a=[l,t,l+w,t+h];for(const q of K.R){if(q[2]<=a[0]||q[0]>=a[2]||q[3]<=a[1]||q[1]>=a[3])continue;
    const C=[[a[0],a[1],Math.min(a[2],q[0]),a[3]],[Math.max(a[0],q[2]),a[1],a[2],a[3]],[a[0],a[1],a[2],Math.min(a[3],q[1])],[a[0],Math.max(a[1],q[3]),a[2],a[3]]];
    let b=a,ba=-1;for(const c of C){const ar=Math.max(0,c[2]-c[0])*Math.max(0,c[3]-c[1]);if(ar>ba){ba=ar;b=c}}a=b}
  const W2=a[2]-a[0],H2=a[3]-a[1];return W2<16||H2<16?null:[a[0],a[1],W2,H2]}catch(e){return[l,t,w,h]}}
function shwBotHook(S){if(S.botHook||!S.box||!S.box.isConnected)return;S.botHook=1;shwBotCss();const L=S.o.layer,box=S.box;
  const hit=document.createElement("button");hit.type="button";hit.className="shw-me";hit.setAttribute("aria-label","我的角色：問問題、聽棋語");
  const hint=document.createElement("button");hint.type="button";hint.className="shw-hint";hint.textContent="💬";hint.setAttribute("aria-label","問問題、聽棋語");
  const say=document.createElement("div");say.className="shw-say";say.setAttribute("aria-live","polite");
  for(const e of[hit,hint,say])e.style.display="none";L.append(hit,hint,say);
  let menu=null,head=[0,0],sayT=0;
  const shut=()=>{if(menu){menu.remove();menu=null}};
  const open=e=>{e.stopPropagation();e.preventDefault();if(typeof vibrate==="function")vibrate(5);if(menu){shut();return}
    menu=document.createElement("div");menu.className="shw-menu";const bot=typeof BOT!=="undefined"&&BOT&&BOT.act;
    menu.innerHTML=`<button type="button" data-a="ask">💬 問問題</button>${bot?'<button type="button" data-a="tale">📜 聽棋語</button>':""}<button type="button" data-a="me">🙂 我的角色</button>`;
    L.append(menu);const W=L.clientWidth||S.I.clientWidth,left=head[0]>W*.6;Object.assign(menu.style,{top:Math.max(4,head[1]-10)+"px",left:left?"":(head[0]+18)+"px",right:left?(W-head[0]+18)+"px":""});
    menu.querySelectorAll("button").forEach(b=>b.onclick=ev=>{ev.stopPropagation();const a=b.dataset.a;shut();
      if(a==="ask"){if(typeof askSheet==="function")askSheet();else try{window.dispatchEvent(new CustomEvent("xq-bot-ask"))}catch(err){}}
      else if(a==="tale"){try{BOT.act(Math.random()*(BOT.count||1)|0)}catch(err){}}
      else location.hash="#/me"})};
  hit.onclick=open;hint.onclick=open;
  const outside=e=>{if(!box.isConnected){document.removeEventListener("click",outside,true);return}if(menu&&!menu.contains(e.target)&&e.target!==hit&&e.target!==hint)shut()};document.addEventListener("click",outside,true);
  const upd=()=>{if(!box.isConnected){mo.disconnect();shut();return}const m=/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([\d.]+)\)/.exec(box.style.transform),cv=box.querySelector("canvas");
    if(!m||!cv||!box.classList.contains("on")||box.style.opacity==="0"){hit.style.display=hint.style.display="none";say.style.display="none";return}
    const k=+m[3],cw=parseFloat(cv.style.width)||cv.clientWidth,ch=parseFloat(cv.style.height)||cv.clientHeight,Lf=parseFloat(cv.style.left)||0,T=parseFloat(cv.style.top)||0,x=+m[1],y=+m[2],top=y+(T+ch*.12)*k;
    head=[x,top];{const w0=cw*.44*k,wm=Math.max(44,w0),hc=shwHitCut(L,box,x+(Lf+cw*.28)*k-(wm-w0)/2,top-22,wm,Math.max(0,-T-ch*.12)*k+22);   /* 11/12 第 11 輪觸控測試：角色按鈕至少 44px 寬、往上包住頭上的 💬（.shw-hint 改成不接點選），兩個疊在一起的目標合成一個 */   /* 11/11 模擬玩家問題 2：按鈕切掉蓋到出口、入口標籤的那一塊 */
      if(hc)Object.assign(hit.style,{display:"",left:hc[0].toFixed(1)+"px",top:hc[1].toFixed(1)+"px",width:hc[2].toFixed(1)+"px",height:hc[3].toFixed(1)+"px"});else hit.style.display="none"}
    {const hx=x+cw*.16*k,hy=top+2,hb=shwHitCut(L,box,hx-12,hy-22,24,22);Object.assign(hint.style,{display:say.classList.contains("on")||!hb||hb[2]<24||hb[3]<22?"none":"",left:hx.toFixed(1)+"px",top:hy.toFixed(1)+"px"})}   /* 💬 疊到標籤就先不出現（點角色身上照樣開選單） */Object.assign(say.style,{display:"",left:x.toFixed(1)+"px",top:(top-4).toFixed(1)+"px"});if(say.classList.contains("on")&&performance.now()-(say._ft||0)>300){say._ft=performance.now();shwSayFit(say,L,Math.max(0,-(T+ch*.12)*k)+say.offsetHeight+14)}};
  const mo=new MutationObserver(upd);mo.observe(box,{attributes:true,attributeFilter:["style","class"]});upd();
  const said=e=>{if(!box.isConnected){window.removeEventListener("xq-bot-said",said);return}if(!document.body.classList.contains("shw-on"))return;const t=String(e.detail||"").trim();if(!t)return;
    if(/^[♪♫\s]+/.test(t))return;   /* 回饋 804：動作、舞蹈的小標不進泡泡（bot3d 也不再送出） */
    say.textContent=t;say.classList.add("on");hint.style.display="none";say._ft=0;upd();clearTimeout(sayT);sayT=setTimeout(()=>{say.classList.remove("on");upd()},Math.max(2000,Math.min(5000,t.length*150)))};
  window.addEventListener("xq-bot-said",said)}
/* 意見回饋 795（開發者 11/8）：冷啟動時 3D 模型清單（tripo.json）還沒抓回來，myLook() 會退成預設小人（綠色），標題列頭像卻已經是選的角色。
   載入前先等清單（最多 3 秒）；之後每秒比一次要用的模型，存檔或清單晚到、換了角色，就在同一個框裡換模型（只在站著時換，不打斷走路；S.gen 讓舊的畫布和迴圈自己收掉） */
function shwTripo(){return new Promise(res=>{let n=0;const k=()=>{if(typeof TRIPO==="undefined"||Object.keys(TRIPO).length||++n>30)res();else setTimeout(k,100)};k()})}
function shwLookG(){try{return((typeof myLook==="function"&&myLook())||{}).glb||""}catch(e){return""}}
async function shwLoad(S){
  await loadScript(OFF?"three.min.js":"/m/three.min.js");await loadScript((OFF?"bot3d.js":"/m/bot3d.js")+"?v="+encodeURIComponent(window.XQ_BUILD||""));
  const T=window.THREE;if(!T||!window.XQBot3D||!XQBot3D.figure)throw 0;if(!S.box.isConnected)return;
  const G=S.gen=(S.gen||0)+1;await shwTripo();if(!S.box.isConnected||S.gen!==G)return;
  const look=(typeof myLook==="function"&&myLook())||{p:botPc(),e:store.get("era","classic"),g:9},B=XQBot3D.figure(look);S.lg=look.glb||"";if(look.glb){if(!B.glbP)throw 0;await B.glbP}
  if(!S.box.isConnected||S.gen!==G)return;
  const C=S.C,EL=C.el*Math.PI/180,r=new T.WebGLRenderer({antialias:true,alpha:true,powerPreference:"low-power"});r.setPixelRatio(Math.min(2,devicePixelRatio||1));if(look.glb&&T.sRGBEncoding!=null)r.outputEncoding=T.sRGBEncoding;
  const cv=r.domElement,sh=S.box.querySelector(".shw-sh");S.box.append(cv);
  const sc=new T.Scene(),hl=new T.HemisphereLight(0xFFF6E8,0x6A5A48,1.15);sc.add(hl);const dl=new T.DirectionalLight(0xFFFFFF,.85);dl.position.set(-3,6,5);sc.add(dl);S.litK="";S.lit=()=>{try{shwLit(S,T,hl,dl)}catch(e){}};S.lit();
  const root=new T.Group();root.rotation.order="YXZ";root.add(B.bot);sc.add(root);root.updateMatrixWorld(true);
  const bx=new T.Box3().setFromObject(B.bot),c=bx.getCenter(new T.Vector3()),hM=(bx.max.y-bx.min.y)||1;B.bot.position.x-=c.x;B.bot.position.z-=c.z;B.bot.position.y-=bx.min.y;const by=B.bot.position.y;
  const vh=hM*1.45,cam=new T.OrthographicCamera(-vh*.375,vh*.375,vh/2,-vh/2,hM*.1,hM*20),tg=new T.Vector3(0,hM*.6,0);cam.position.set(0,tg.y+Math.sin(EL)*hM*6,Math.cos(EL)*hM*6);cam.lookAt(tg);cam.updateMatrixWorld(true);
  const ft=new T.Vector3(0,0,0).project(cam),ftF=(1-ft.y)/2,YMAX=Math.max(...Object.values(C.N).map(p=>p[1]));let cw=0,ch=0,Iw=0,Ih=0;
  const fit=()=>{Iw=S.I.clientWidth;Ih=S.I.clientHeight;if(!Ih)return;const h=Math.round(shwHt(C,YMAX)*Ih/(Math.cos(EL)/1.45)),w=Math.round(h*.75);if(h!==ch||w!==cw){ch=h;cw=w;r.setSize(cw,ch);
    Object.assign(cv.style,{left:-cw/2+"px",top:-Math.round(ftF*ch)+"px"});Object.assign(sh.style,{width:Math.round(ch*.34)+"px",height:Math.round(ch*.1)+"px",left:-Math.round(ch*.17)+"px",top:-Math.round(ch*.05)+"px"})}S.place()};
  const P0=typeof S.at==="string"?C.N[S.at]:S.at.p,HS0=typeof S.at==="string"&&Object.values(C.HS).find(h=>h[0]===S.at);S.x=P0[0];S.y=P0[1];S.onT=S.at&&S.at.t&&C.TB&&C.TB[S.at.t]?S.at.t:null;S.hy=S.onT?shwTHy(C.TB[S.onT],P0):null;S.sq=null;   /* 825：換造型重載角色時，站在桌上的照舊算在桌上 */S.yaw=S.at===C.home||!HS0?shwYaw(C,P0,typeof S.at==="string"?C.look0:[P0[0],P0[1]+5]):shwYaw(C,P0,[HS0[1],HS0[2]]);
  S.place=()=>{if(!Ih)return;const k=shwHt(C,S.hy!=null?S.hy:S.y)/shwHt(C,YMAX);S.box.style.transform=`translate(${(S.x*Iw/100).toFixed(1)}px,${(S.y*Ih/100).toFixed(1)}px) scale(${k.toFixed(4)})`;
    cv.style.transformOrigin=`50% ${(ftF*100).toFixed(1)}%`;cv.style.transform=S.sq?`scale(${S.sq[0].toFixed(3)},${S.sq[1].toFixed(3)})`:""};   /* 808：站在桌上照桌下地板的透視（hy）；跳的時候蹲、拉長（sq） */
  const clips=B.mixer&&B.clips||null;let cur=null,yawR=S.yaw;
  S.anim=(n,ts)=>{if(!clips){S.pn=n;return}const a=clips[n]||clips.idle;if(!a)return;a.timeScale=ts||1;if(a===cur)return;a.reset().fadeIn(n==="idle"?.25:.12).play();if(cur)cur.fadeOut(.15);cur=a};
  S.anim("idle",1);
  const a0=B.arms&&B.arms[1]?B.arms[1].rotation.z:0,proc=(t,walk,act,p)=>{if(clips)return;const ph=t*14;root.position.y=walk?Math.abs(Math.sin(ph))*hM*.04:act==="cheer"?Math.abs(Math.sin(p*Math.PI*2))*hM*.12:0;root.rotation.z=walk?Math.sin(ph)*.07:0;root.rotation.x=act==="bow"?Math.sin(Math.min(1,p*1.6)*Math.PI/2)*.45:0;
    if(B.legs&&B.legs.length===2)B.legs.forEach((l,i)=>l.rotation.x=walk?Math.sin(ph)*.6*(i?1:-1):0);if(B.arms&&B.arms.length===2){B.arms.forEach((a,i)=>a.rotation.x=walk?Math.sin(ph)*.5*(i?-1:1):0);B.arms[1].rotation.z=act==="wave"||act==="cheer"?a0+Math.min(1,p*3)*2.5:a0}};
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!S.box.isConnected||S.gen!==G){ro.disconnect();return}fit()});ro.observe(S.I)}fit();
  let last=performance.now(),acc=0,fr=0,t0=last;
  const end=()=>{try{cv.remove()}catch(e){}if(S.gen!==G)return void(()=>{try{r.dispose();r.forceContextLoss()}catch(e){}})();S.ready=false;S.go=null;if(!document.querySelector(".shw.on"))document.body.classList.remove("shw-on");try{r.dispose();r.forceContextLoss()}catch(e){}};
  const loop=now=>{if(!S.box.isConnected||!S.M.isConnected||S.gen!==G){end();return}requestAnimationFrame(loop);if(document.hidden){last=now;return}
    if(!S.ready){if(S.o.gate&&!S.o.gate()){last=now;return}S.ready=true;fit();shwStay(S)}
    if(!S.go&&now-(S.lk||0)>1000){S.lk=now;S.lit();const g2=shwLookG();if(g2!==S.lg){S.lg=g2;shwLoad(S).catch(()=>{S.box.remove();S.ready=false;document.body.classList.remove("shw-on")});return}}
    const dt=Math.min(.05,(now-last)/1000);last=now;acc+=dt;const g=S.go;let walk=false;
    if(g&&g.ph==="hop"){g.th+=dt;const u=Math.min(1,g.th/(shwRM()?.25:.45));shwHop(S,g.a,g.b,u,g.h0,g.h1);S.yaw=shwYaw(C,g.a,g.b);S.anim("idle",1);
      if(u>=1){S.sq=null;S.x=g.b[0];S.y=g.b[1];if(g.up){S.onT=g.tb;S.hy=g.h1}else{S.onT=null;S.hy=null;S.at=g.fn}shwNext(S)}S.place()}   /* 808／820：跳上桌、跳下桌 */
    else if(g){g.t+=dt;if(g.t<g.dur){walk=true;const u=g.t/g.dur,s=.65*u+.35*(.5-.5*Math.cos(Math.PI*u));let d=s*g.L,i=1;
        for(;i<g.pts.length;i++){const sl=shwPx(C,g.pts[i-1],g.pts[i]);if(d<=sl||i===g.pts.length-1){const f=sl?Math.min(1,d/sl):1,a=g.pts[i-1],b=g.pts[i];S.x=a[0]+(b[0]-a[0])*f;S.y=a[1]+(b[1]-a[1])*f;S.curE=g.segE[i-1]||null;if(sl)S.yaw=shwYaw(C,a,b);break}d-=sl}
        if(g.onT){S.curE=null;S.hy=shwTHy(C.TB[g.onT],[S.x,S.y])}if(g.fd)S.box.style.opacity=(g.fd==="out"?1-u:u).toFixed(3);   /* 820：在桌面上走，身高照該點對應的地板 */
        S.anim("walk",Math.max(1.3,Math.min(2.4,g.L/g.dur/220)))}
      else if(g.seq&&g.seq.length)shwNext(S)
      else if(g.ex)shwExitDo(S);else if(g.free){if(g.win){S.box.style.opacity="";S.box.style.transition=""}S.go=null;S.curE=null;const q=g.pts[g.pts.length-1];S.x=q[0];S.y=q[1];S.at=SHW_MEM[S.o.mem]=g.to;if(g.look!=null)S.yaw=g.look;S.anim("idle",1)}
      else{if(g.act<0){g.act=g.t;S.curE=null;{const P=typeof g.to==="string"?C.N[g.to]:g.to.p;S.x=P[0];S.y=P[1]}S.yaw=g.look;S.anim(SHW_ACT[g.A]||"idle",g.A==="bow"?2.2:1.8)}if(g.t-g.act>.62)shwOpen(S)}
      S.place()}
    yawR+=shwWrap(S.yaw-yawR)*Math.min(1,dt*(walk?16:9));root.rotation.y=yawR;
    proc((now-t0)/1000,walk,g&&g.act>=0?g.A:null,g&&g.act>=0?(g.t-g.act)/.62:0);
    if(!g&&(fr++&1))return;if(clips)B.mixer.update(acc);acc=0;B.bot.position.y=by;r.render(sc,cam);
    if(!S.box.classList.contains("on")){S.box.classList.add("on");document.body.classList.add("shw-on")}};
  requestAnimationFrame(loop)}
