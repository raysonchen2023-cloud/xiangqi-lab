/* ================= 🗺 十州棋館：門派江湖長卷（開發者 11/18；前綴 jh）=================
   開發者原話：「請gemini規劃十個文案，要如何把門派畫出來在首頁或是其他地方，讓遊戲更具有rpg象棋江湖闖蕩感」→ 合併案「雲河棋會」→
   「總共有10個門派，我希望散落在一張大地圖的不同州，大地圖的入口從首頁走到遠山那邊」「門派用城牆感覺好怪，我希望像是那種武當少林峨眉所在地那種場景」
   「地圖要用環景的，然角色可以在地圖上移動」（選橫向 4 屏長卷）「要畫出10個門派的特色」
   「現在就做，畫面切到這個長卷也要有淡入淡出的視覺效果，然後第一次進來要有文字描述歡迎光臨來到什麼地方之類的」。
   規劃與考究：story/十州棋館圖_規劃_1118.md；圖：park/yunhe/pano_final.png（3024×1340，史學顧問 184～187 審過）→ art/yunhe/pano.webp → data/yunhe/。
   地圖固定晚明江淮十州（各朝都有入口）；十派各一座山門駐地，門派旗號、掌門頭像、隨行角色都由程式疊在圖上（圖本身無字）。
   移動沿用首頁的 3D 走路。點道路、石階、橋面或石坪就能走，地面操作不開名帖。只有點門派牌子才會拜訪門派。
   進出：首頁遠山「🗺 十州棋館」、找地方（雲河渡口）、開局棋路總覽與十派掌門頁頂上一顆按鈕；換頁時宣紙色淡出淡入（jhGo）；第一次進來有一段歡迎文字（store jhIntro）。
   不改開局門派與掌門的規則、不加體力與貨幣、不新增匿名資料。不動 07z9-school.js（那一版在組候選版），用它的全域函式（OSC、oscL、oscT、oscSchE、oscNmE、oscJoinAsk、zmStart、zmImg）。
   jhWalkCfg 把長卷道路換成 07w 走路用的百分比座標。 */
const JH_ON=true,JH_IMGV="1118",JH_W=3024,JH_H=1340,JH_FADE=480;
/* 首頁遠山的入口位置（左%、上%）：原圖、iPad 直版、橫版各量一次（左上方的遠山，避開星槎、西市、觀星臺）。
   測試員 1821（iPad 經典首頁）：原圖原本 [22,11] 正好壓在經典世界天上的秦殘影（07y CY_SPOT home qin [21,10.5]，寬 11%）上，往下挪到遠山腰、星槎與雲弈閣之間（375 寬手機：經典首頁上下各隔 8／14px、秦朝首頁約 13／9px；秦殘影下緣約在圖高 13.7%，碰不到） */
const JH_HOME={"":[24,19.5],p34:[26,11],l1610:[32,10]};
/* 以 pano.webp 原圖像素描路。十派共用同一張路網，河道只經橋面通行。 */
const JH_SITE={central:{s:[866,478],f:[857,290]},screen:{s:[179,1172],f:[178,1030]},palace_horse:{s:[2690,1067],f:[2693,760]},
  same_cannon:{s:[1301,316],f:[1300,130]},opposite_cannon:{s:[1900,954],f:[1890,640]},pawn:{s:[1242,800],f:[1240,770]},
  elephant:{s:[530,585],f:[514,430]},horse:{s:[148,643],f:[200,360]},cross_palace:{s:[2163,1153],f:[1950,1100]},advisor_corner:{s:[2420,331],f:[2421,150]}};
/* 每條支路的字串是山門或已命名的岔口，數組是沿路的折點。第三個數字是窄路的點選半徑。 */
const JH_ROADS={
  west:[
    ["horse",[188,650],[221,650],"westFork",[236,681],[262,696],[311,702],[367,702],[410,696],[450,677],[490,661],"elephantFork",[550,636],[545,616,12],[535,600,12],"elephant"],
    ["horse",[129,651],[104,646],[88,633],[75,651,11],[60,668,10],[45,681,9],[32,695,8],[23,705,8]],
    ["westFork",[215,626],[231,605],[266,592],[292,573],[299,544],[304,522],[320,502],[339,482],[346,464]],
    ["elephantFork",[573,630],[602,624],[638,614],[672,603],"westBridge",[699,586],[712,570],[720,546],[724,523],[720,499],[709,480]],
    ["elephant",[521,559,9],[515,539,8],[515,522,8]],
    ["elephantFork",[537,654],[552,668],[566,678,10],[586,692,10],[604,707,8],[616,732,8],[623,746,8],
      [597,756,7],[572,766,7],[548,776,7],[558,793,7],[580,819,7],[608,810,7],[644,799,7],[673,789,7],
      [696,809,7],[709,827,9],[722,849,10],[735,873,12],"southBank",
      [744,915],[731,934],[721,957],[724,976],[737,994],"southFork",
      [807,996],[829,995,10],[855,982,10],[889,977,10],[921,982,10],[955,990],[992,981],[1022,957],[1018,938]],
    ["southBank",[758,878],[776,867],[791,854],[818,834],[848,822],[878,815],[904,816]],
    ["southFork",[737,1039],[723,1062],[716,1089],[723,1120],[735,1154],[745,1183]],
    ["central",[866,496],[849,514],[826,531],[799,551],[780,575],[764,603,10],[744,614,8],[725,608,7],[707,604,7],"westBridge"],
    ["central",[867,449,23],[865,412,24],[864,378,22],[866,343,20],[865,314,20],[866,277,19],[869,242,17],[869,210,16],[870,183,14]],
    [[866,496],[891,488],[910,468,8],[934,442,8],[950,440,7],[971,447,7],[988,455,7]],
    ["pawn",[1230,775,9],[1220,757,9],[1205,749,9],[1186,741,10],"pawnFork",[1118,758],[1095,778],[1076,803],[1064,825],[1077,849],[1067,874],[1042,901],[1018,921],[1018,938],[1039,952],[1064,970],[1087,995],[1111,1025],[1145,1060],[1175,1081],[1204,1105],[1229,1130],[1251,1157],[1282,1183],[1320,1206],[1352,1216],[1382,1227],[1419,1235],[1468,1238],[1506,1226]],
    ["pawnFork",[1158,734],[1171,718],[1179,695],[1180,676]],
    [[1506,1226],[1535,1205],[1546,1176],[1542,1156],[1532,1136],[1522,1110],[1524,1086],[1531,1066],[1554,1051]],
    [[388,702],[367,702],[372,715],[402,707],[427,693],[450,677]],
    [[490,661],[477,676],[458,689,10],[443,707,8]],
    /* 順炮門雙塔與東岸 */
    ["same_cannon",[1338,316],[1375,314],[1412,317],[1451,326],[1470,329]],
    ["same_cannon",[1264,315],[1222,315],[1184,318],[1156,319],[1128,308],[1111,292],[1105,275],[1110,254],[1125,230]],
    [[1105,275],[1113,300],[1102,322],[1089,346,16],[1080,370,15],[1082,394,16],[1074,412,16],[1077,435,15],[1088,454],[1099,476],[1101,502],[1095,526],[1078,548],[1059,570],[1065,590],[1088,609]],
    [[1077,435],[1065,438,10],[1053,445,9],[1049,456,8]],
    ["same_cannon",[1302,285],[1300,265,13],[1300,246,12]],
    [[1264,315],[1255,293],[1253,269,13],[1254,248,11]],
    [[1375,314],[1363,295],[1358,270,12],[1352,249,11]],
    [[1451,326],[1477,344],[1492,368],[1504,392],[1494,418],[1492,442]],
    /* 對面炮門前埕與山腳路 */
    ["opposite_cannon",[1900,980],[1901,998,9],[1903,1020,9],[1906,1045],[1911,1067],[1938,1084],[1969,1098],[2000,1104],[2030,1102]],
    ["opposite_cannon",[1876,950],[1858,945],[1853,935]],
    ["opposite_cannon",[1924,947],[1953,939],[1961,931]],
    [[1911,1067],[1883,1067],[1854,1073],[1827,1087],[1802,1096],[1775,1099],[1749,1088],[1722,1074],[1694,1059],[1671,1054],[1637,1050]],
    /* 沿岸道路連到村邊與對面炮門。 */
    [[1492,442],[1489,468],[1498,493],[1524,515],[1538,538],[1548,552,14],[1530,577,13],
      [1505,598,14],[1475,613,14],[1448,632,14],[1436,656,14],[1446,680,14],[1472,702,14],
    [1489,725,13],[1484,750,12],[1479,774,11],[1498,805,12],[1511,830,12],
    [1524,852,13],[1518,875,13],[1520,902,13],[1546,925,16],[1543,948,17],
      [1536,972,18],[1539,994,18],[1551,1016,19],[1555,1036,16],[1554,1051]],
    [[1554,1051],[1580,1044],[1608,1047],[1637,1050]]
  ],
  screen:[
    ["screen",[223,1171],[251,1168],[282,1156],[301,1138],[320,1110],[339,1092],[368,1076],[380,1054],[391,1023],[381,1004],[383,982],[393,958],[407,934],[416,915],[414,904]],
    ["screen",[174,1150],[171,1133,9],[178,1112,8],[185,1093,8]],
    ["screen",[178,1195],[175,1222],[174,1244]],
    [[178,1195],[149,1196],[122,1200]],
    [[175,1222],[146,1222],[121,1225]],
    [[175,1222],[213,1222],[231,1216]],
    [[414,904],[398,887],[376,874],[350,855],[337,849]]
  ],
  cross_palace:[
    ["cross_palace",[2152,1147],[2147,1132,9],[2153,1118,9]],
    ["cross_palace",[2176,1166,9],[2195,1170],[2214,1160]],
    ["cross_palace",[2157,1170,10],[2135,1189,8],[2106,1192,8],[2066,1193,8],[2026,1193,8],[1986,1193,8],
      [1946,1193,8],[1906,1193,8],[1866,1193,8],[1826,1194,8],[1786,1194,8],[1750,1196,8],[1721,1184,9]]
  ],
  palace_horse:[
    ["palace_horse",[2676,1092],[2695,1111],[2706,1129],[2692,1150],[2668,1152],[2642,1148],[2608,1137],[2579,1125],[2566,1109],[2557,1089],[2537,1074],[2544,1060],[2518,1051],[2494,1036],[2470,1021]],
    [[2668,1152],[2689,1167],[2709,1187],[2712,1210],[2689,1219,9],[2665,1224,8],[2641,1227,8],[2616,1239,8],[2598,1254,8]],
    [[2706,1129],[2732,1135],[2753,1155],[2775,1170],[2799,1182],[2804,1206],[2806,1228],[2812,1250],[2828,1275]],
    [[2689,1167],[2711,1164],[2740,1167],[2775,1170]]
  ],
  advisor_corner:[
    ["advisor_corner",[2441,349],[2455,365],[2452,383],[2440,399],[2447,420],[2463,434],[2487,435],[2510,442]],
    ["advisor_corner",[2404,348],[2387,341],[2375,324]],
    [[2463,434],[2470,449],[2492,456]],
    ["advisor_corner",[2446,328],[2471,338],[2494,352],[2510,366],[2530,366,12],[2548,367,9],[2570,373,9],[2590,386,8],[2606,399,9]]
  ],
  horse_steps:[
    [[203,478,11],[185,460,11],[163,442,11],[180,428,11],[196,412,11],[179,397,11],
      [156,377,10],[174,362,10],[198,345,11],[199,332,11],[169,312,10],[172,300,11],
      [193,278,11],[206,261,10],[194,246,10],[187,229,9]]
  ],
  palace_steps:[
    [[2623,818,10],[2631,839,11],[2640,861,11],[2651,883,11],[2661,905,11],[2672,927,10]]
  ],
  palace_upper:[
    [[2791,685,11],[2800,705,11],[2810,725,10],[2820,745,9]]
  ],
  east_village:[
    [[2823,504],[2850,511],[2880,527],[2907,536],[2939,542],[2972,543],[3001,544]]
  ]
};
/* 跨區接點。新木橋直接畫在岸與岸之間，河面其餘部分維持阻隔。 */
const JH_FOOTBRIDGE=[[385,729,9],[355,831,9]];
/* 原圖路面中斷的山坡加可見的石階，路徑與畫在圖上的階梯共用座標。 */
const JH_STEPS=[
  [[203,478],[216,469],[239,474],[262,474],[287,462],[316,452],[333,453],[346,464]],
  [[2672,927],[2661,936,9],[2633,934,9],[2607,945,9],[2576,955,9],[2554,976,10],
    [2561,994,10],[2567,1015,10],[2549,1034,10],[2534,1048],[2518,1051]],
  [[2820,745,9],[2835,769,9],[2844,797,9],[2849,824,9],[2857,850,9],[2856,879,9],[2843,908,10],
    [2831,941,10],[2819,971,10],[2805,998,10],[2784,1026,12],[2759,1048],[2727,1050],[2690,1067]],
  [[2791,685,11],[2803,661,10],[2815,633,10],[2823,603,9],[2821,574,9],
    [2811,547,9],[2805,525,10],[2823,504]]
];
const JH_LINKS=[
  [[388,702],[386,715],...JH_FOOTBRIDGE,[344,844],[337,849]],
  [[2030,1102],[2054,1088],[2082,1070],[2110,1057],[2141,1041],[2167,1021],[2194,1008],[2221,999],
    [2253,993],[2286,990],[2312,990,10],[2334,983,9],[2355,986,9],[2379,997,10],[2405,1003],[2434,1009],[2454,1016],[2470,1021]],
  [[2167,1021],[2186,1029],[2205,1044],[2230,1058],[2250,1078],[2264,1102],[2260,1129],[2238,1147],[2214,1160]],
  [[2606,399,9],[2632,409],[2657,419],[2686,427],[2716,439],[2743,448],[2770,465,11],
    [2784,478,9],[2800,491,9],[2823,504]],
  ...JH_STEPS
];
const JH_JUNCTIONS={westFork:[218,653],elephantFork:[512,650],westBridge:[691,607],southBank:[742,894],southFork:[769,1007],pawnFork:[1144,744]};
/* 開闊地形用凸多邊形，區內可直接走到點下的位置。每塊用獨立入口接到步行路網。 */
const JH_PLAZAS=[
  ["central",[[849,195],[889,195],[890,239],[847,239]]],
  ["central",[[846,343],[884,343],[885,462],[846,462]]],
  ["elephant",[[519,636],[560,629],[579,645],[539,663],[513,656]]],
  ["horse",[[79,627],[201,640],[213,655],[136,662],[91,650]]],
  ["screen",[[110,1159],[227,1159],[244,1261],[110,1261]]],
  ["advisor_corner",[[2374,302],[2463,312],[2493,348],[2404,356],[2374,334]]],
  ["opposite_cannon",[[1830,924],[1947,924],[1980,969],[1810,969]]],
  ["palace_horse",[[2623,1048],[2759,1048],[2774,1080],[2735,1100],[2642,1097]]],
  ["same_cannon",[[1284,246],[1320,246],[1331,282],[1274,282]]],
  ["pawn",[[1282,1182],[1315,1191],[1359,1211],[1345,1227],[1300,1207]]],
  ["cross_palace",[[2148,1159],[2169,1155],[2203,1167],[2209,1181],[2168,1180],[2148,1172]]],
  ["pawn",[[1239,1141],[1306,1204],[1290,1210],[1227,1156]]],
  ["pawn",[[1338,1208],[1424,1228],[1423,1244],[1342,1231]]],
  ["pawn",[[1420,1227],[1515,1215],[1527,1227],[1486,1246],[1416,1245]]],
  ["pawn",[[1539,922],[1558,926],[1551,953],[1530,952]]],
  ["pawn",[[1530,949],[1551,949],[1548,978],[1527,980]]],
  ["pawn",[[1528,975],[1554,974],[1571,1018],[1542,1020]]],
  ["pawn",[[1543,1014],[1567,1014],[1567,1050],[1541,1054]]]
];
const JH_START="elephant";
const JH_MEM="jianghu:walking";   /* 路段重新編號，舊暫存點回到最近一次到訪的門派。 */
const jhPct=([x,y])=>[x/JH_W*100,y/JH_H*100];
function jhWalkCfg(home){
  const N={},HS={},width={},edges=[],used=new Map();
  const add=(id,p)=>{N[id]=jhPct(p);used.set(p.slice(0,2).join(","),id);return id};
  for(const [id,p] of Object.entries(JH_SITE)){add(id,p.s);HS[id]=[id,...jhPct(p.f)]}
  for(const [id,p] of Object.entries(JH_JUNCTIONS))add(id,p);
  for(const path of [...Object.values(JH_ROADS).flat(),...JH_LINKS]){
      let prev=null;
      for(const p of path){
        let id=p;
        if(Array.isArray(p)){
          const key=p.slice(0,2).join(",");
          id=used.get(key)||add("r"+used.size,p);
        }
        const radius=Array.isArray(p)&&p[2]||24;
        if(prev&&prev.id!==id){const edge=prev.id+"-"+id;edges.push(edge);width[edge]=Math.min(prev.radius,radius)}
        prev={id,radius};
      }
  }
  const plazas=[];
  for(const [,outline] of JH_PLAZAS){
    const poly=outline.map(jhPct),entry=Object.keys(N).find(n=>!n.startsWith("court_")&&shwInPoly(poly,N[n]));
    if(!entry)continue;
    const port="court_"+plazas.length;
    N[port]=N[entry];
    const edge=entry+"-"+port;
    edges.push(edge);width[edge]=0;
    plazas.push({poly,port});
  }
  return {W:JH_W,H:JH_H,el:40,h:[.076,0,0],dmax:8,home,look0:[N[home][0],100],N,E:edges.join(" "),HS,width,plazas,strictRoad:true,walkRetarget:true};
}
function jhGround(cfg,p){
  const plaza=cfg.plazas.find(a=>shwInPoly(a.poly,p));
  if(plaza)return {d:0,p,e:[plaza.port,plaza.port]};
  let best=null;
  for(const edge of shwEdges(cfg)){
    const [a,b]=edge;
    const q=shwNear({W:cfg.W,H:cfg.H,N:cfg.N,_e:[edge]},p);
    if(q.d<=cfg.width[a+"-"+b]&&(!best||q.d<best.d))best=q;
  }
  return best;
}
function jhDrawSteps(map,pc,points){
  const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
  const x=Math.min(...xs)-12,y=Math.min(...ys)-12;
  const c=document.createElement("canvas");
  c.width=Math.max(...xs)-x+12;c.height=Math.max(...ys)-y+12;
  c.className="jh-stairs";c.setAttribute("aria-hidden","true");
  c.style.cssText=pc(x,y)+`;width:${c.width/JH_W*100}%;height:${c.height/JH_H*100}%`;
  const ctx=c.getContext("2d");
  if(!ctx)return;
  ctx.lineJoin="round";ctx.translate(-x,-y);
  ctx.beginPath();
  points.forEach(([a,b],i)=>i?ctx.lineTo(a,b):ctx.moveTo(a,b));
  ctx.lineWidth=15;ctx.strokeStyle="#746b56";ctx.stroke();
  ctx.lineWidth=12;ctx.strokeStyle="#cdbf9f";ctx.stroke();
  ctx.beginPath();
  for(let i=1;i<points.length;i++){
    const [a,b]=points[i-1],[u,v]=points[i],dx=u-a,dy=v-b,len=Math.hypot(dx,dy);
    for(let t=3;t<len-2;t+=6){
      const px=a+dx*t/len,py=b+dy*t/len,sx=dy*5/len,sy=dx*5/len;
      ctx.moveTo(px+sx,py-sy);ctx.lineTo(px-sx,py+sy);
    }
  }
  ctx.lineWidth=1;ctx.strokeStyle="#786e57";ctx.stroke();map.append(c);
}
/* ---------- 文字：中英並列（照 07z9 的 oscL；07z9 沒載到時退回中文） ---------- */
const jhL=(zh,en)=>typeof oscL==="function"?oscL(zh,en):zh;
const jhT=s=>typeof oscT==="function"?oscT(s):s;
const jhSch=sid=>typeof oscSchE==="function"?oscSchE(sid):(typeof OSC!=="undefined"?OSC.sch(sid):null);
const jhNm=c=>typeof oscNmE==="function"?oscNmE(c):c;
const jhLook=()=>{try{const P=typeof ptyGet==="function"?ptyGet():null;return P&&typeof PTY!=="undefined"&&PTY.has(P,P.look)?P.look:""}catch(e){return""}};
const jhCol={central:"#B23A2E",screen:"#2F4E8C",palace_horse:"#5B3E6E",same_cannon:"#A0522D",opposite_cannon:"#B87333",pawn:"#3E8E6E",elephant:"#6FA8A0",horse:"#A88A3C",cross_palace:"#3F7FA6",advisor_corner:"#B8902E"};
function jhCss(){if(document.getElementById("jhCss"))return;const s=document.createElement("style");s.id="jhCss";s.textContent=`
.view.jh-v{padding:0!important;overflow:hidden}
body.jh-on .xqbot{display:none!important}
.jh-wrap{position:relative;flex:1;min-height:0;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-x:contain;background:#EFE6D2;scrollbar-width:thin}
.jh-map{position:relative;height:100%;width:max-content}
.jh-map>img{display:block;height:100%;width:auto;max-width:none;user-select:none;-webkit-user-drag:none}
.jh-stairs{position:absolute;pointer-events:none}
.jh-footbridge{position:absolute;pointer-events:none;transform-origin:left center;box-sizing:border-box;
  border-block:2px solid #674b36;background:repeating-linear-gradient(90deg,#a17a52 0 4px,#77563b 4px 5px);
  box-shadow:0 2px 3px #2b2a283d}
.jh-spot{position:absolute;transform:translate(-50%,-100%);display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:0;padding:0;cursor:pointer;color:#2b2118}
.jh-spot{pointer-events:none}.jh-spot .bn{pointer-events:auto}
.jh-map.shw-iso>.jh-spot{z-index:200}
.jh-spot .bn{display:flex;align-items:center;gap:6px;padding:4px 10px 4px 6px;border-radius:10px;background:rgba(250,244,230,.92);border:2px solid var(--jc,#8a6a3a);box-shadow:0 2px 6px rgba(40,25,10,.25)}
.jh-spot .bn img{width:30px;height:30px;border-radius:50%;object-fit:cover;object-position:50% 12%;background:#efe4cc;border:1.5px solid var(--jc,#8a6a3a)}
.jh-spot .bn b{font:800 15px/1.1 var(--serif,serif);letter-spacing:.04em;white-space:nowrap}
.jh-spot .bn .osc-sym{width:18px;height:18px;color:var(--jc,#8a6a3a)}
.jh-spot .pole{width:3px;height:22px;background:linear-gradient(#6b4a2b,#3b2a1a);border-radius:2px}
.jh-spot.won .bn{box-shadow:0 0 0 3px rgba(255,214,120,.55),0 0 14px rgba(255,190,80,.75)}
.jh-spot.mine .bn{background:#fff6e0;border-width:3px}
.jh-me{position:absolute;width:auto;transform:translate(-50%,-100%);pointer-events:none;filter:drop-shadow(0 3px 2px rgba(30,20,10,.35));transition:none}
.jh-map:has(>.shw.on)>.jh-me{visibility:hidden}
#jhFade{position:fixed;inset:0;z-index:9400;background:#EFE6D2;opacity:0;pointer-events:none;transition:opacity ${JH_FADE}ms ease}
#jhFade.on{opacity:1;pointer-events:auto}
.home-page.jh-zoom{transition:transform ${JH_FADE+120}ms ease-in;transform:scale(1.12)}
#jhIntro{position:fixed;inset:0;z-index:9300;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(20,14,8,.42);opacity:0;transition:opacity .9s ease}
#jhIntro.on{opacity:1}
#jhIntro .cd{max-width:30em;background:rgba(250,244,230,.97);border:1px solid #c9a96b;border-radius:16px;padding:22px 20px 18px;text-align:center;color:#2b2118;box-shadow:0 10px 30px rgba(0,0,0,.35);transform:translateY(12px);transition:transform .9s ease}
#jhIntro.on .cd{transform:none}
#jhIntro small{display:block;font-size:13px;letter-spacing:.25em;color:#9a6b2a;margin-bottom:6px}
#jhIntro h2{font:900 26px/1.25 var(--serif,serif);letter-spacing:.08em;margin:0 0 12px}
#jhIntro p{font:600 15.5px/1.75 var(--serif,serif);margin:0 0 10px;opacity:0;transition:opacity .8s ease}
#jhIntro.on p{opacity:1}#jhIntro.on p:nth-of-type(2){transition-delay:.6s}#jhIntro.on p:nth-of-type(3){transition-delay:1.2s}
#jhIntro .btn{margin-top:8px;min-width:10em}
.jh-card{display:flex;gap:12px;align-items:flex-start}.jh-card img{width:72px;height:96px;object-fit:contain;flex:none}
.jh-card .tx{flex:1;min-width:0}.jh-card b{font:800 17px var(--serif,serif)}.jh-card p{margin:4px 0;line-height:1.6;font-size:14px}
.jh-actions{display:flex;flex-wrap:wrap;gap:6px 8px;margin-top:12px}
.jh-actions .btn{flex:0 1 auto;width:auto;max-width:100%;min-height:44px;padding:8px 13px;margin:0;font-size:14px;line-height:1.25;text-wrap:balance}
.jh-actions .jh-link{min-height:44px;padding:6px 10px;border:0;background:transparent;color:var(--ink);font-size:14px;text-decoration:underline;text-underline-offset:3px}
@media (prefers-reduced-motion:reduce){#jhFade,#jhIntro,#jhIntro .cd,#jhIntro p,.home-page.jh-zoom{transition:opacity .2s!important;transform:none!important}}`;document.head.append(s)}
/* ---------- 換頁的淡出淡入：先蓋一層宣紙色淡入，再換網址；長卷那頁圖載好後把這層淡出 ---------- */
function jhFadeEl(){let f=document.getElementById("jhFade");if(!f){jhCss();f=document.createElement("div");f.id="jhFade";f.setAttribute("aria-hidden","true");document.body.append(f)}return f}
/* 首頁往遠山放大：放大中心＝「十州棋館」入口那一點（測試員 1821 P3-4：原本是畫面正中央） */
function jhGo(hash,from){hash=hash||"#/jianghu";jhCss();const f=jhFadeEl();
  if(from){const b=from.querySelector("#hmJh");if(b){const r=b.getBoundingClientRect(),q=from.getBoundingClientRect();from.style.transformOrigin=`${Math.round(r.left+r.width/2-q.left)}px ${Math.round(r.top+r.height/2-q.top)}px`}from.classList.add("jh-zoom")}
  setTimeout(()=>f.classList.add("on"),20);setTimeout(()=>{location.hash=hash;if(from){from.classList.remove("jh-zoom");from.style.transformOrigin=""}},JH_FADE+40)}
function jhFadeOut(){const f=document.getElementById("jhFade");if(!f)return;f.classList.add("on");setTimeout(()=>f.classList.remove("on"),40)}
/* ---------- 長卷頁 #/jianghu ---------- */
function Jianghu(v){jhCss();setTop(jhL("🗺 十州棋館","🗺 Ten Prefectures"),"#/");if(typeof setTabs==="function")setTabs(false);v.className="view fixed jh-v";
  document.body.classList.add("jh-on");   /* 小帥吉祥物在長卷上看起來像第二個隨行角色，這一頁藏起來（離開時拿掉） */
  const f=jhFadeEl();
  f.classList.add("on");   /* 沒經過 jhGo（例如直接開網址）也先蓋著，圖好了再淡出 */
  const c=jhLook(),o=typeof oscGet==="function"?oscGet():null,my=c&&o&&typeof OSC!=="undefined"?OSC.act(o,c):"",z=typeof zmGet==="function"?zmGet():null,beat=z&&typeof OSC!=="undefined"?OSC.zmBeaten(z):[];
  let at=JH_START;try{const a=store.get("jhAt",null);if(a&&JH_SITE[a])at=a}catch(e){}
  const wrap=document.createElement("div");wrap.className="jh-wrap";const map=document.createElement("div");map.className="jh-map";wrap.append(map);
  const img=document.createElement("img");img.src=`data/yunhe/pano.webp?v=${JH_IMGV}`;img.alt=jhL("十州棋館圖：晚明江淮十州的十派山門","Map of the ten schools across the Jiang-Huai prefectures");img.draggable=false;map.append(img);
  const pc=(x,y)=>`left:${(x/JH_W*100).toFixed(3)}%;top:${(y/JH_H*100).toFixed(3)}%`;
  const [[bx,by],[ex,ey]]=JH_FOOTBRIDGE,bridge=document.createElement("i");
  bridge.className="jh-footbridge";bridge.setAttribute("aria-hidden","true");
  bridge.style.cssText=pc(bx,by)+`;width:${Math.hypot(ex-bx,ey-by)/JH_W*100}%;height:${15/JH_H*100}%;transform:translateY(-50%) rotate(${Math.atan2(ey-by,ex-bx)}rad)`;
  map.append(bridge);
  for(const points of JH_STEPS)jhDrawSteps(map,pc,points);
  const sch=typeof OSC!=="undefined"?OSC.SCH:[];
  for(const S0 of sch){const sid=S0.id,P=JH_SITE[sid];if(!P)continue;const S=jhSch(sid)||S0,m=typeof OSC!=="undefined"?OSC.MST.find(x=>x.sid===sid):null;
    const b=document.createElement("button");b.type="button";b.className="jh-spot"+(beat.includes(m&&m.id)?" won":"")+(my===sid?" mine":"");b.dataset.sid=sid;b.style.cssText=pc(P.f[0],P.f[1])+`;--jc:${jhCol[sid]||"#8a6a3a"}`;
    b.setAttribute("aria-label",S.nm+(m?jhL("，掌門"+m.nm,", master "+m.en):""));
    b.innerHTML=`<span class="bn">${m?`<img src="data/npc/${m.id}.webp" alt="" onerror="this.remove()">`:""}${typeof oscSym==="function"?oscSym(sid):""}<b>${esc(S.nm)}</b></span><span class="pole" aria-hidden="true"></span>`;
    b.onclick=()=>{if(c&&!map.querySelector(".shw.on"))walkFlat(sid,()=>jhSheet(sid));
      else jhSheet(sid)};map.append(b)}
  const me=document.createElement("img");me.className="jh-me";me.alt="";me.src=c?`data/xs/prev_${c}.webp`:"";if(!c)me.style.display="none";me.onerror=()=>{me.style.display="none"};map.append(me);
  const place=([x,y])=>{me.style.cssText=pc(x,y)+";height:9%"};place(JH_SITE[at].s);
  const scale=()=>map.clientHeight/JH_H,center=x=>{wrap.scrollLeft=x*map.clientWidth/100-wrap.clientWidth/2};
  function follow(x){
    const px=x*map.clientWidth/100,left=wrap.scrollLeft,w=wrap.clientWidth,margin=Math.min(72,w*.20);
    if(px<left+margin)wrap.scrollLeft=px-margin;
    else if(px>left+w-margin)wrap.scrollLeft=px-w+margin;
  }
  const cfg=jhWalkCfg(at),mem=JH_MEM,find=sid=>map.querySelector(`.jh-spot[data-sid="${sid}"]`);
  const walkAt=()=>typeof SHW_MEM!=="undefined"&&SHW_MEM[mem]||at;
  function stay(next){
    if(typeof SHW_MEM!=="undefined")SHW_MEM[mem]=next;
    if(typeof next==="string"){at=next;try{store.set("jhAt",next)}catch(e){}}
    const point=typeof next==="string"?JH_SITE[next].s:[next.p[0]*JH_W/100,next.p[1]*JH_H/100];
    place(point);
  }
  let flatWalk=null,flatHandoff=false,followAfter=0;
  function walkFlat(next,arrive){
    if(flatWalk?.next===next&&typeof next==="string"){flatWalk=null;stay(next);arrive();return}
    const route=shwRoute(cfg,walkAt(),next),pts=route.pts;
    if(!pts.length)return;
    const walk=flatWalk={next};
    const lengths=pts.slice(1).map((p,i)=>shwPx(cfg,pts[i],p)),total=lengths.reduce((a,b)=>a+b,0);
    const duration=shwRM()?0:Math.min(8000,Math.max(220,total*3.2)),start=performance.now();
    function step(now){
      if(flatWalk!==walk||!wrap.isConnected)return;
      if(now-start>=duration||pts.length===1){flatWalk=null;stay(next);if(arrive)arrive();else follow(pts.at(-1)[0]);return}
      let left=total*(now-start)/duration,i=0;
      while(i<lengths.length-1&&left>=lengths[i]){left-=lengths[i];i++}
      const a=pts[i],b=pts[i+1],u=lengths[i]?Math.min(1,left/lengths[i]):0;
      const p=a.map((x,k)=>x+(b[k]-x)*u);
      stay({p,e:route.segE[i]});
      if(!touching&&now>=followAfter)follow(p[0]);
      requestAnimationFrame(step);
    }
    step(start);
  }
  map.addEventListener("click",e=>{
    if(e.target.closest?.(".jh-spot"))followAfter=performance.now()+450;
  },true);
  function walkFallback(e){
    if(!c||!img.naturalWidth||map.querySelector(".shw.on")||e.target!==img)return;
    const r=img.getBoundingClientRect();
    if(!r.width||!r.height)return;
    const q=jhGround(cfg,[(e.clientX-r.left)*100/r.width,(e.clientY-r.top)*100/r.height]);
    if(q)walkFlat({p:q.p,e:q.e});
  }
  map.addEventListener("click",walkFallback);
  let touching=false;
  wrap.addEventListener("touchstart",()=>{touching=true},{passive:true});
  for(const k of["touchend","touchcancel"])wrap.addEventListener(k,e=>{touching=e.touches.length>0},{passive:true});
  /* 牌旗避讓（測試員 1821 P3-1、P3-2）：英文派名長，貼長卷左右邊的會被切掉、捲不到 → 牌子橫推回圖內（旗竿不動）；
     兩面牌旗疊到或只隔 1px、牌旗蓋到山門前隨行角色站的地方 → 能左右讓就左右讓，不行就把上面那面的旗竿拉長往上讓。由下往上排，下面的先定位 */
  function fit(){if(!wrap.isConnected)return;const k=scale(),W=map.clientWidth;if(!k||!W)return;const ar=me.naturalWidth&&me.naturalHeight?me.naturalWidth/me.naturalHeight:.6,th=JH_H*k*.09,R=[];
    for(const b of map.querySelectorAll(".jh-spot")){const P=JH_SITE[b.dataset.sid],bn=b.querySelector(".bn"),po=b.querySelector(".pole");if(!P||!bn||!po)continue;bn.style.transform="";po.style.height="";po.style.visibility="";
      const w=bn.offsetWidth,h=bn.offsetHeight,ax=P.f[0]*k,l=ax-w/2;R.push({bn,po,w,h,ax,ay:P.f[1]*k,ph:22,dx:l<6?6-l:l+w>W-6?W-6-l-w:0})}
    const box=r=>{const x=r.ax-r.w/2+r.dx,y=r.ay-r.ph-2;return[x,y-r.h,x+r.w,y]},hit=(a,c,m)=>a[0]<c[2]+m&&c[0]<a[2]+m&&a[1]<c[3]+m&&c[1]<a[3]+m;
    const tok=Object.values(JH_SITE).map(P=>{const x=P.s[0]*k,y=P.s[1]*k,hw=th*ar/2;return[x-hw,y-th,x+hw,y]});
    R.sort((a,c)=>c.ay-a.ay);
    R.forEach((r,i)=>{for(let n=0;n<20;n++){let up=0;
      for(const t of tok){const a=box(r);if(!hit(a,t,4))continue;const d=(a[0]+a[2])/2>=(t[0]+t[2])/2?t[2]+6-a[0]:t[0]-6-a[2],nd=r.dx+d;
        if(Math.abs(nd)<=r.w/2-20&&a[0]+d>=6&&a[2]+d<=W-6)r.dx=nd;else up=Math.max(up,a[3]-t[1]+6)}
      if(!up)for(let j=0;j<i;j++){const a=box(r),c=box(R[j]);if(hit(a,c,8))up=Math.max(up,a[3]-c[1]+8)}
      if(!up)break;r.ph+=up}});
    const grounds=cfg.plazas.map(({poly})=>{
      const xs=poly.map(p=>p[0]*W/100),ys=poly.map(p=>p[1]*map.clientHeight/100);
      return [Math.min(...xs),Math.min(...ys),Math.max(...xs),Math.max(...ys)];
    });
    for(const r of R){
      const a=box(r),overlap=grounds.filter(g=>hit(a,g,9));
      if(overlap.length){
        const clear=[Math.min(...overlap.map(g=>g[0]))-r.w-12,Math.max(...overlap.map(g=>g[2]))+12]
          .sort((x,y)=>Math.abs(x-a[0])-Math.abs(y-a[0]));
        for(const x of clear){
          const moved=[x,a[1],x+r.w,a[3]];
          if(x<6||x+r.w>W-6||grounds.some(g=>hit(moved,g,9))||tok.some(t=>hit(moved,t,4))||R.some(t=>t!==r&&hit(moved,box(t),8)))continue;
          r.dx+=x-a[0];r.po.style.visibility="hidden";break;
        }
      }
      r.bn.style.transform=r.dx?`translateX(${Math.round(r.dx)}px)`:"";
      r.po.style.height=Math.round(r.ph)+"px";
    }}
  me.onload=()=>fit();
  const onRs=()=>{if(!wrap.isConnected){removeEventListener("resize",onRs);return}fit()};addEventListener("resize",onRs);
  v.innerHTML="";v.append(wrap);
  let mounted=false;
  const ready=()=>{if(!wrap.isConnected||mounted)return;mounted=true;fit();
    const old=typeof SHW_MEM!=="undefined"?SHW_MEM[mem]:null;
    const point=typeof old==="string"?cfg.N[old]:old&&old.p;
    if(point)place([point[0]*JH_W/100,point[1]*JH_H/100]);
    center(point?.[0]??cfg.N[at][0]);
    if(c&&img.naturalWidth&&typeof shwMount==="function")shwMount({v,cfg,root:map,frame:map,layer:map,sel:".jh-spot",keyOf:b=>b.dataset.sid,find,mem,characterActions:false,quickEntry:true,
      ground:(_,p)=>jhGround(cfg,p),
      gate:()=>!flatWalk,
      onPlace:S=>{
        if(!S.ready){flatHandoff=true;return}
        if(flatHandoff){
          flatHandoff=false;S.at=walkAt();
          [S.x,S.y]=typeof S.at==="string"?cfg.N[S.at]:S.at.p;
          S.place();return;
        }
        if(S.go&&!touching&&performance.now()>=followAfter)follow(S.x);
        if(!S.go&&typeof S.at==="string"&&S.at!==at)stay(S.at);
      }});
    jhFadeOut();setTimeout(()=>{
      if(!wrap.isConnected)return;
      jhIntro();
    },JH_FADE+80);
    try{document.fonts.ready.then(fit)}catch(e){}};
  if(img.complete&&img.naturalWidth)setTimeout(ready,0);else{img.onload=ready;img.onerror=ready}
  setTimeout(()=>{if(!f.classList.contains("on"))return;if(wrap.isConnected)ready();else f.classList.remove("on")},6000);   /* 圖很慢也不要一直蓋著；11/18 iMac 驗 1909（P1）：長卷頁在圖好之前就被換掉時，ready() 不會跑，遮罩一直蓋在別頁上、點什麼都沒反應——頁面不在了也要拿掉 */
  /* 英文模式直接開在這一頁：外掛字典（派名、人名）比畫面晚到，到了（07i18n 發 xq-i18n-ext）就照英文重畫一次（讀螢幕標籤才會是英文） */
  try{if(typeof oscEn==="function"&&oscEn()&&!(typeof I18N_EXN!=="undefined"&&I18N_EXN>0)){const H0=location.hash,re=()=>{document.removeEventListener("xq-i18n-ext",re);if(wrap.isConnected&&location.hash===H0)Jianghu(v)};document.addEventListener("xq-i18n-ext",re)}}catch(e){}
  return{}}
/* ---------- 駐地小卡：拜師／繼續修行、挑戰掌門、這一派的棋友 ---------- */
function jhSheet(sid){if(typeof sheet!=="function"||typeof OSC==="undefined")return;const S=jhSch(sid),m=OSC.MST.find(x=>x.sid===sid),c=jhLook(),o=typeof oscGet==="function"?oscGet():null,act=c&&o?OSC.act(o,c):"";
  const mates=Object.values(OSC.NPC).filter(x=>x[0]===sid).map(x=>jhT(x[2])).slice(0,5);
  sheet(`${S.nm}`,b=>{b.innerHTML=`<div class="jh-card">${m?`<img src="data/npc/${m.id}.webp" alt="" onerror="this.remove()">`:""}<div class="tx">
      ${m?`<b>${esc(jhL(m.nm,m.en))}</b><p class="muted">${esc(jhL(S.nm+"掌門","Master of the "+S.nm))}</p><p>${esc(jhL("「"+m.say+"」",'"'+jhT(m.say)+'"'))}</p>`:""}
      <p class="muted">${esc(jhL(`慣用${S.op}：${S.say}`,`Plays ${S.op}: ${S.say}`))}</p>${mates.length?`<p class="muted">${esc(jhL("門下棋友：","Players of this school: ")+mates.join(jhL("、",", ")))}</p>`:""}</div></div>
    ${c?"":`<p class="muted">${esc(jhL("開始旅程、有了隊伍以後才能拜師和挑戰。","Start a journey and form a party to learn or challenge."))}</p>`}
    <div class="jh-actions">
      ${c?`<button class="btn" id="jhLearn">${esc(act===sid?jhL(`繼續${jhNm(c)}的修行`,`Continue ${jhNm(c)}'s training`):jhL(`${jhNm(c)}拜入${S.nm}`,`${jhNm(c)} joins the ${S.nm}`))}</button>`:""}
      ${c&&m?`<button class="btn ghost" id="jhZm">${esc(jhL(`🏯 挑戰${m.nm}`,`🏯 Challenge ${m.en}`))}</button>`:""}
      <button class="jh-link" id="jhAll">${esc(jhL("看十派總覽","See all ten schools"))}</button></div>`;
    const q=s=>b.querySelector(s);
    if(q("#jhLearn"))q("#jhLearn").onclick=()=>{try{closeSheet()}catch(e){}if(act===sid){location.hash="#/school/"+c;return}if(typeof oscJoinAsk==="function")setTimeout(()=>oscJoinAsk(c,sid,()=>{location.hash="#/school/"+c}),80)};
    if(q("#jhZm"))q("#jhZm").onclick=()=>{try{closeSheet()}catch(e){}if(typeof zmStart==="function")zmStart(m,c)};
    q("#jhAll").onclick=()=>{try{closeSheet()}catch(e){}location.hash="#/school"}})}
/* ---------- 第一次進來的歡迎文字（整個帳號只播一次，store jhIntro；點按鈕或背景收起） ---------- */
function jhIntro(force){let seen=0;try{seen=store.get("jhIntro",0)}catch(e){}if(seen&&!force)return;if(document.getElementById("jhIntro"))return;jhCss();
  const c=jhLook(),nm=c?jhNm(c):"";const d=document.createElement("div");d.id="jhIntro";d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.setAttribute("aria-labelledby","jhIntroT");
  d.innerHTML=`<div class="cd"><small>${esc(jhL("初入江湖","INTO THE JIANGHU"))}</small><h2 id="jhIntroT">${esc(jhL("歡迎來到江淮十州","Welcome to the Ten Prefectures"))}</h2>
    <p>${esc(jhL("萬曆年間，淮水、運河與長江，把江淮十州串成一條棋路。","In the Wanli years, the Huai River, the Grand Canal and the Yangtze linked ten prefectures into one road of chess."))}</p>
    <p>${esc(jhL("雲河棋會的十個門派各據一方山水、開館授棋；每一派有自己的棋路，也有一位等你登門挑戰的掌門。","The ten schools of the Cloud River Chess Club each hold their own hills and waters. Every school has its own way of playing, and a master waiting for your challenge."))}</p>
    <p>${esc(nm?jhL("點路面移動，連點門派牌子可快速進入。","Tap a path to move, or tap a gate twice to enter quickly."):jhL("點一座山門，看看那一派的掌門和棋路。","Tap a gate to meet that school's master."))}</p>
    <button class="btn" id="jhIntroGo">${esc(jhL("開始遊歷","Start the journey"))}</button></div>`;
  document.body.append(d);setTimeout(()=>d.classList.add("on"),40);
  const close=()=>{try{store.set("jhIntro",1)}catch(e){}d.classList.remove("on");setTimeout(()=>d.remove(),500)};
  d.querySelector("#jhIntroGo").onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}close()};d.onclick=e=>{if(e.target===d)close()};
  setTimeout(()=>{try{d.querySelector("#jhIntroGo").focus()}catch(e){}},400)}
/* 離開長卷頁：歡迎文字還開著就收掉（不記看過） */
if(typeof addEventListener==="function")addEventListener("hashchange",()=>{if(/^#\/jianghu/.test(location.hash))return;document.body.classList.remove("jh-on");const d=document.getElementById("jhIntro");if(d)d.remove();
  const f=document.getElementById("jhFade");if(f)f.classList.remove("on")});   /* 圖載入前先離開，也要收起宣紙色遮罩。 */
/* ---------- 首頁遠山「🗺 十州棋館」（照 07xsm 西市入口的掛法；各朝首頁都有） ---------- */
function jhHomePos(P){const b=P&&P.querySelector("#hmJh");if(!b)return;const c=JH_HOME[P.dataset.hmw||""]||JH_HOME[""];b.style.left=c[0]+"%";b.style.top=c[1]+"%";delete b.dataset.ttL;b.style.marginLeft=""}
function jhHomeSpot(v){if(!JH_ON)return;const P=v.querySelector(".home-page");if(!P||P.querySelector("#hmJh"))return;jhCss();
  const k=P.dataset.hmw||"",c=JH_HOME[k]||JH_HOME[""],b=document.createElement("button");b.type="button";b.id="hmJh";b.className="shp-spot";
  b.style.left=c[0]+"%";b.style.top=c[1]+"%";b.setAttribute("aria-label",jhL("十州棋館","Ten Prefectures"));b.innerHTML=`<b>${esc(jhL("🗺 十州棋館","🗺 Ten Prefectures"))}</b>`;
  b.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}jhGo("#/jianghu",P)};
  let ref=null;try{const ord=hmFocusOrder((typeof hmwSpots==="function"?hmwSpots(k):[]).concat([["hmJh",c[0],c[1]]])).map(s=>s[0]),i=ord.indexOf("hmJh");for(let j=i+1;j<ord.length&&!ref;j++)ref=P.querySelector(":scope>#"+ord[j])}catch(e){}
  if(!ref){const sp=P.querySelectorAll(":scope>.shp-spot");ref=sp.length?sp[0]:P.querySelector(":scope>.hm-go-bar")}
  P.insertBefore(b,ref||null);try{if(typeof hmClamp==="function")hmClamp(P)}catch(e){}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(!hub)jhHomeSpot(v)}catch(e){}return r}}
if(typeof hmwSet==="function"){const f1=hmwSet;hmwSet=function(P){const r=f1.apply(this,arguments);try{jhHomePos(P)}catch(e){}return r}}
/* ---------- 開局棋路總覽、十派掌門頁頂上一顆按鈕（包一層 OscPage，不改 07z9） ---------- */
if(typeof OscPage==="function"){const f2=OscPage;OscPage=function(v,c,lk){const r=f2.apply(this,arguments);try{if(!lk&&(!c||c==="masters"))setTimeout(()=>jhSchoolBtn(v),0)}catch(e){}return r}}
function jhSchoolBtn(v){const pad=v.querySelector(".pad.osc");if(!pad||pad.querySelector("#jhOpen"))return;const b=document.createElement("button");b.type="button";b.id="jhOpen";b.className="btn";
  b.textContent=jhL("🗺 走進十州棋館","🗺 Enter the Ten Prefectures");b.onclick=()=>{try{vibrate(5)}catch(e){}jhGo("#/jianghu")};pad.prepend(b)}
/* 開局棋路的修行頁換畫時（oscHome 的 draw 會重畫 innerHTML）不加；總覽和掌門頁也會重畫 → 用 MutationObserver 不划算，改在重畫後的下一個點擊補上 */
if(typeof document!=="undefined")document.addEventListener("click",()=>{if(!/^#\/school(\/masters)?$/.test(location.hash))return;setTimeout(()=>{const v=document.getElementById("view");if(v)jhSchoolBtn(v)},0)},true);
/* ---------- 找地方（07z6）：雲河渡口加「十州棋館」、練棋書院加「開局棋路」 ---------- */
try{if(typeof STM_AREAS!=="undefined"){const A=k=>STM_AREAS.find(a=>a[0]===k);const sh=A("ship"),ac=A("acad");
  if(sh&&!sh[4].some(e=>e[1]==="#/jianghu"))sh[4].push([jhL("十州棋館","Ten Prefectures"),"#/jianghu","十州 門派 江湖 地圖 掌門 長卷 棋館 山門"]);
  if(ac&&!ac[4].some(e=>e[1]==="#/school"))ac[4].push([jhL("開局棋路","Opening Paths"),"#/school","開局 門派 拜師 修行 中炮 屏風馬"])}}catch(e){}
