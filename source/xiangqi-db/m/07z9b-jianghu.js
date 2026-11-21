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
const JH_TAP_PX=44;   /* W23：點在路旁一個指尖（約 44px）內就吸到最近的路，手機上不必剛好點中路面 */
const jhPct=([x,y])=>[x/JH_W*100,y/JH_H*100];
/* 仙人指路門東側的岸路有一片淡色的路肩。點路肩時落在相鄰步道，水面不算。 */
const JH_COAST_SHOULDER=[[1459,746],[1479,756],[1493,776],[1487,790],[1462,782],[1448,765]].map(jhPct);
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
function jhGround(cfg,p,tol){
  const plaza=cfg.plazas.find(a=>shwInPoly(a.poly,p));
  if(plaza)return {d:0,p,e:[plaza.port,plaza.port]};
  const shoulder=shwInPoly(JH_COAST_SHOULDER,p);
  let best=null;
  for(const edge of shwEdges(cfg)){
    const [a,b]=edge;
    const q=shwNear({W:cfg.W,H:cfg.H,N:cfg.N,_e:[edge]},p);
    if(q.d<=Math.max(shoulder?32:cfg.width[a+"-"+b],tol||0)&&(!best||q.d<best.d))best=q;
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
.jh-spot.wind .bn{border-color:#c9971c;box-shadow:0 0 0 3px rgba(255,214,90,.65),0 0 18px 5px rgba(255,196,60,.8);animation:jhWindGlow 2.6s ease-in-out infinite}
.jh-spot.wind .wd{font:900 16px/1 var(--serif,serif);font-style:normal;letter-spacing:.08em;color:#fffaf0;background:linear-gradient(#e8b62e,#b07f10);padding:4px 7px;border-radius:7px;white-space:nowrap;text-shadow:0 1px 1px rgba(90,55,0,.5)}
@keyframes jhWindGlow{0%,100%{box-shadow:0 0 0 3px rgba(255,214,90,.55),0 0 12px 3px rgba(255,196,60,.6)}50%{box-shadow:0 0 0 4px rgba(255,222,110,.85),0 0 24px 8px rgba(255,196,60,.95)}}
.jh-windnote{margin:10px 0 0;padding:8px 10px;border-radius:10px;background:#fff3cf;border:1px solid #e2b64a;color:#6b4a0c;font-size:14px;line-height:1.55}
@media (prefers-reduced-motion:reduce){.jh-spot.wind .bn{animation:none}}
.jh-intel{margin:10px 0 0;padding:8px 10px;border-radius:10px;background:#e8f1ec;border:1px solid #7fae95;color:#1f4a35;font-size:14px;line-height:1.55}
.jh-intel-hint{margin:10px 0 0;font-size:13.5px;line-height:1.55;color:var(--muted,#6b6257)}
.jh-me{position:absolute;width:auto;transform:translate(-50%,-100%);pointer-events:none;filter:drop-shadow(0 3px 2px rgba(30,20,10,.35));transition:none}
.jh-map:has(>.shw.on)>.jh-me{visibility:hidden}
.jh-destination{position:absolute;z-index:6;width:16px;height:16px;box-sizing:border-box;border:2px solid #74542d;
  border-radius:50%;background:#fff2cb80;box-shadow:0 0 0 1px #fff6df;transform:translate(-50%,-50%);pointer-events:none}
.jh-miss{position:absolute;z-index:6;width:30px;height:30px;box-sizing:border-box;border:2px dashed #74542dcc;border-radius:50%;
  display:flex;align-items:center;justify-content:center;color:#74542d;font:700 14px/1 system-ui,sans-serif;
  transform:translate(-50%,-50%);pointer-events:none;animation:jhMiss .65s ease-out forwards}
@keyframes jhMiss{0%{opacity:0;transform:translate(-50%,-50%) scale(.6)}25%{opacity:1;transform:translate(-50%,-50%) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) scale(1.2)}}
@media (prefers-reduced-motion:reduce){.jh-miss{animation:none}}
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
  const wind=jhWindNow().ids;   /* W45 風向標：這個時段順風的 2～3 派，旗號發金光、掛大字「順風」 */
  for(const S0 of sch){const sid=S0.id,P=JH_SITE[sid];if(!P)continue;const S=jhSch(sid)||S0,m=typeof OSC!=="undefined"?OSC.MST.find(x=>x.sid===sid):null,wd=wind.includes(sid);
    const b=document.createElement("button");b.type="button";b.className="jh-spot"+(beat.includes(m&&m.id)?" won":"")+(my===sid?" mine":"")+(wd?" wind":"");b.dataset.sid=sid;b.style.cssText=pc(P.f[0],P.f[1])+`;--jc:${jhCol[sid]||"#8a6a3a"}`;
    b.setAttribute("aria-label",S.nm+(m?jhL("，掌門"+m.nm,", master "+m.en):"")+(wd?jhL("，正順風",", fair wind now"):""));
    b.innerHTML=`<span class="bn">${m?`<img src="data/npc/${m.id}.webp" alt="" onerror="this.remove()">`:""}${typeof oscSym==="function"?oscSym(sid):""}<b>${esc(S.nm)}</b>${wd?`<em class="wd" aria-hidden="true">${esc(jhL("順風","Fair wind"))}</em>`:""}</span><span class="pole" aria-hidden="true"></span>`;
    b.onclick=()=>{if(c&&!map.querySelector(".shw.on"))walkFlat(sid,()=>jhSheet(sid));
      else jhSheet(sid)};map.append(b)}
  const me=document.createElement("img");me.className="jh-me";me.alt="";me.src=c?`data/xs/prev_${c}.webp`:"";if(!c)me.style.display="none";me.onerror=()=>{me.style.display="none"};map.append(me);
  const destination=document.createElement("i");destination.className="jh-destination";destination.hidden=true;destination.setAttribute("aria-hidden","true");map.append(destination);
  const place=([x,y])=>{me.style.cssText=pc(x,y)+";height:9%"};place(JH_SITE[at].s);
  const scale=()=>map.clientHeight/JH_H,center=x=>{wrap.scrollLeft=x*map.clientWidth/100-wrap.clientWidth/2};
  function follow(x){
    const px=x*map.clientWidth/100,left=wrap.scrollLeft,w=wrap.clientWidth,margin=Math.min(72,w*.20);
    if(px<left||px>left+w)return;
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
  function pickGround(p){
    const q=jhGround(cfg,p,JH_TAP_PX*JH_W/Math.max(1,map.clientWidth));
    if(q){
      destination.style.cssText=pc(q.p[0]*JH_W/100,q.p[1]*JH_H/100);
      destination.hidden=false;
    }
    return q;
  }
  function walkFlat(next,arrive){
    if(flatWalk?.next===next&&typeof next==="string"){flatWalk=null;stay(next);arrive();return}
    const route=shwRoute(cfg,walkAt(),next),pts=route.pts;
    if(!pts.length)return;
    const walk=flatWalk={next};
    const lengths=pts.slice(1).map((p,i)=>shwPx(cfg,pts[i],p)),total=lengths.reduce((a,b)=>a+b,0);
    const duration=shwRM()?0:Math.min(8000,Math.max(220,total*3.2)),start=performance.now();
    function step(now){
      if(flatWalk!==walk||!wrap.isConnected)return;
      if(now-start>=duration||pts.length===1){flatWalk=null;stay(next);destination.hidden=true;if(arrive)arrive();return}
      let left=total*(now-start)/duration,i=0;
      while(i<lengths.length-1&&left>=lengths[i]){left-=lengths[i];i++}
      const a=pts[i],b=pts[i+1],u=lengths[i]?Math.min(1,left/lengths[i]):0;
      const p=a.map((x,k)=>x+(b[k]-x)*u);
      stay({p,e:route.segE[i]});
      if(arrive&&!touching&&now>=followAfter)follow(p[0]);
      requestAnimationFrame(step);
    }
    step(start);
  }
  map.addEventListener("click",e=>{
    if(e.target.closest?.(".jh-spot")){followAfter=performance.now()+450;destination.hidden=true}
  },true);
  function walkFallback(e){
    /* W23：點到長卷上的台階、橋、角色等裝飾也算點地面；門派牌旗與按鈕另外處理 */
    if(!c||!img.naturalWidth||map.querySelector(".shw.on")||!map.contains(e.target)||e.target.closest?.(".jh-spot,button,a"))return;
    const r=img.getBoundingClientRect();
    if(!r.width||!r.height)return;
    const p=[(e.clientX-r.left)*100/r.width,(e.clientY-r.top)*100/r.height];
    const q=pickGround(p);
    if(q){walkFlat({p:q.p,e:q.e});return}
    missAt(p);
  }
  /* W23：點到離路太遠的地方（山、屋頂、水面）原地閃一下「這裡沒有路」並輕震，不再毫無反應 */
  function missAt(p){
    map.querySelectorAll(".jh-miss").forEach(x=>x.remove());
    const m=document.createElement("i");m.className="jh-miss";m.textContent="✕";m.setAttribute("aria-hidden","true");
    m.style.left=p[0]+"%";m.style.top=p[1]+"%";map.append(m);setTimeout(()=>m.remove(),700);
    try{vibrate(8)}catch(e){}
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
      ground:(_,p)=>pickGround(p),
      miss:p=>missAt(p),   /* W23：立體走路模式點到離路太遠也原地提示（iMac 回報） */
      gate:()=>!flatWalk,
      onPlace:S=>{
        if(!S.ready){flatHandoff=true;return}
        if(flatHandoff){
          flatHandoff=false;S.at=walkAt();
          [S.x,S.y]=typeof S.at==="string"?cfg.N[S.at]:S.at.p;
          S.place();return;
        }
        /* 點地時保留玩家正看的目的地，角色從畫面外走進來。 */
        if(!S.go)destination.hidden=true;
        if(S.go&&!S.go.free&&!touching&&performance.now()>=followAfter)follow(S.x);
        if(!S.go&&typeof S.at==="string"&&S.at!==at)stay(S.at);
      }});
    jhFadeOut();setTimeout(()=>{
      if(!wrap.isConnected)return;
      jhIntro();
      if(!document.getElementById("jhIntro"))jhWindToast();
    },JH_FADE+80);
    try{document.fonts.ready.then(fit)}catch(e){}};
  if(img.complete&&img.naturalWidth)setTimeout(ready,0);else{img.onload=ready;img.onerror=ready}
  setTimeout(()=>{if(!f.classList.contains("on"))return;if(wrap.isConnected)ready();else f.classList.remove("on")},6000);   /* 圖很慢也不要一直蓋著；11/18 iMac 驗 1909（P1）：長卷頁在圖好之前就被換掉時，ready() 不會跑，遮罩一直蓋在別頁上、點什麼都沒反應——頁面不在了也要拿掉 */
  /* 英文模式直接開在這一頁：外掛字典（派名、人名）比畫面晚到，到了（07i18n 發 xq-i18n-ext）就照英文重畫一次（讀螢幕標籤才會是英文） */
  try{if(typeof oscEn==="function"&&oscEn()&&!(typeof I18N_EXN!=="undefined"&&I18N_EXN>0)){const H0=location.hash,re=()=>{document.removeEventListener("xq-i18n-ext",re);if(wrap.isConnected&&location.hash===H0)Jianghu(v)};document.addEventListener("xq-i18n-ext",re)}}catch(e){}
  return{}}
/* ---------- 駐地小卡：拜師／繼續修行、挑戰掌門、這一派的棋友 ---------- */
function jhSheet(sid){if(typeof sheet!=="function"||typeof OSC==="undefined")return;const S=jhSch(sid),m=OSC.MST.find(x=>x.sid===sid),c=jhLook(),o=typeof oscGet==="function"?oscGet():null,act=c&&o?OSC.act(o,c):"";
  const mates=Object.values(OSC.NPC).filter(x=>x[0]===sid).map(x=>jhT(x[2])).slice(0,5),inHall=location.hash==="#/jianghu/hall/"+sid;   /* 已經在門內就不再顯示「走進山門」 */
  sheet(`${S.nm}`,b=>{b.innerHTML=`<div class="jh-card">${m?`<img src="data/npc/${m.id}.webp" alt="" onerror="this.remove()">`:""}<div class="tx">
      ${m?`<b>${esc(jhL(m.nm,m.en))}</b><p class="muted">${esc(jhL(S.nm+"掌門","Master of the "+S.nm))}</p><p>${esc(jhL("「"+m.say+"」",'"'+jhT(m.say)+'"'))}</p>`:""}
      <p class="muted">${esc(jhL(`慣用${S.op}：${S.say}`,`Plays ${S.op}: ${S.say}`))}</p>${mates.length?`<p class="muted">${esc(jhL("門下棋友：","Players of this school: ")+mates.join(jhL("、",", ")))}</p>`:""}</div></div>
    ${c?"":`<p class="muted">${esc(jhL("開始旅程、有了隊伍以後才能拜師和挑戰。","Start a journey and form a party to learn or challenge."))}</p>`}
    ${jhWindOn(sid)?`<p class="jh-windnote">${esc(jhL("眼下順風：在這一派上課、挑戰掌門，修為多給。","Fair wind now: lessons and master challenges in this school give extra XP."))}</p>`:""}
    ${m?jhIntelHTML(sid,m,mates):""}${typeof jhKickHTML==="function"?jhKickHTML(sid,c):""}
    <div class="jh-actions">
      ${JH_HALL[sid]&&!inHall&&!JH_HALL_BAD.has(sid)?`<button class="btn" id="jhHallGo">${esc(jhL("🚪 走進山門","🚪 Enter the gate"))}</button>`:""}
      ${c?`<button class="btn${JH_HALL[sid]&&!inHall&&!JH_HALL_BAD.has(sid)?" ghost":""}" id="jhLearn">${esc(act===sid?jhL(`繼續${jhNm(c)}的修行`,`Continue ${jhNm(c)}'s training`):jhL(`${jhNm(c)}拜入${S.nm}`,`${jhNm(c)} joins the ${S.nm}`))}</button>`:""}
      ${c&&m?`<button class="btn ghost" id="jhZm">${esc(jhL(`🏯 挑戰${m.nm}`,`🏯 Challenge ${m.en}`))}</button>`:""}
      <button class="jh-link" id="jhAll">${esc(jhL("看十派總覽","See all ten schools"))}</button></div>`;
    const q=s=>b.querySelector(s);if(typeof jhKickBind==="function")jhKickBind(b,c);
    if(q("#jhHallGo"))q("#jhHallGo").onclick=()=>{try{closeSheet()}catch(e){}jhGo("#/jianghu/hall/"+sid)};
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
/* ---------- W45 風向標（開發者 11/21 選 Gemini 188 案 9）----------
   「門派地圖目前有點太單調，想增加玩家的樂趣」：照全 App 共用的天氣（07w7 sw7Precip，首頁那一區），讓 2～3 派的旗號發金光、掛大字「順風」。
   晴、雨、雪、夜各有一組候選門派；每 4 小時一段（跟 sw7Precip 下雨下雪的時段同一套）換一次，同一天同一時段大家看到的一樣。
   在順風的派上課或挑戰掌門：第一次完成的修為照原本的 1.5 倍給；已經拿過的課、再下的掌門盤，每派每天多給一次 10 修為（addXP 的 key 去重）。
   修為照 addXP 原本的規則分給隊伍、轉星輝。倍率不寫在畫面上（只寫「修為多給」）；不扣修為、不改棋局與掌門強度。
   Claude 核對時拿掉原案的「花修為切換關注州府」（門派系統不扣修為）與「對局先手優勢」（改棋局、不公平）。 */
const JH_WIND={sun:["central","same_cannon","opposite_cannon","horse","elephant"],rain:["screen","pawn","cross_palace"],snow:["elephant","advisor_corner","palace_horse"],night:["horse","palace_horse","advisor_corner","screen"]};
const JH_WIND_NM={sun:["晴","Clear"],rain:["雨","Rain"],snow:["雪","Snow"],night:["夜","Night"]};
const JH_WIND_MUL=1.5,JH_WIND_GIFT=10;
function jhWindDay(d){return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
function jhWindHash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
/* 這個時段的天氣：雪、雨照共用天氣；沒下雨雪時，日落後到日出前算夜（07w7 sw7HomeNightA），其餘算晴 */
function jhWindState(d){d=d||new Date();
  try{if(typeof sw7Precip==="function"&&typeof SW7_PAGES!=="undefined"){const o=SW7_PAGES.find(x=>x.k==="home"),p=sw7Precip(sw7TermFor(null,o),sw7Rg(o),d);if(p&&p.t==="snow")return"snow";if(p&&p.t==="rain")return"rain"}}catch(e){}
  let night=null;try{if(typeof sw7HomeNightA==="function")night=sw7HomeNightA(d,typeof sw7SeaNow==="function"?sw7SeaNow():"autumn")>0}catch(e){night=null}
  if(night==null){const h=d.getHours();night=h<6||h>=19}
  return night?"night":"sun"}
/* 從那一組候選裡挑 2～3 派（同一天、同一段、同一種天氣，結果固定） */
function jhWindPick(st,d){const pool=(JH_WIND[st]||JH_WIND.sun).slice();let s=jhWindHash(jhWindDay(d)+"|"+Math.floor(d.getHours()/4)+"|"+st);
  const n=Math.min(pool.length,2+(s%2));const out=[];
  while(out.length<n){s=(Math.imul(s,1103515245)+12345)>>>0;out.push(pool.splice(s%pool.length,1)[0])}
  return out}
function jhWindNow(d){d=d||new Date();const st=jhWindState(d);return{st,ids:jhWindPick(st,d),key:jhWindDay(d)+"|"+Math.floor(d.getHours()/4)+"|"+st}}
function jhWindOn(sid,d){return !!sid&&jhWindNow(d).ids.includes(sid)}
/* 進長卷時提示一次（同一段時間只提示一次，store jhWindSeen） */
function jhWindToast(){const W=jhWindNow();if(!W.ids.length||typeof toast!=="function")return;let seen="";try{seen=store.get("jhWindSeen","")}catch(e){}if(seen===W.key)return;
  try{store.set("jhWindSeen",W.key)}catch(e){}const nm=W.ids.map(id=>{const S=jhSch(id);return S?S.nm:id}),w=JH_WIND_NM[W.st]||JH_WIND_NM.sun;
  toast(jhL(`${w[0]}・順風：${nm.join("、")}`,`${w[1]} · fair wind: ${nm.join(", ")}`))}
/* 修為加成：xp＝原本要給的修為（第一次完成才有）；done＝這次確實完成了一個例子或下完一盤；on＝開局時記下的順風與否（掌門盤），沒給才照現在的天氣算 */
function jhWindXp(xp,sid,done,d,on){d=d||new Date();if(!(on===undefined?jhWindOn(sid,d):on))return xp;if(xp>0)return Math.round(xp*JH_WIND_MUL);
  if(done&&typeof addXP==="function")try{addXP(JH_WIND_GIFT,jhL("十州順風","Fair wind"),"jhw:"+jhWindDay(d)+":"+sid)}catch(e){}
  return xp}
/* 包住 07z9 的兩個發修為函式（不改 07z9）：修行頁 finish、掌門結算 zmGameEnd 都是呼叫 OSC.reward／OSC.zmReward */
try{if(typeof OSC!=="undefined"&&!OSC.jhWind){const r0=OSC.reward,z0=OSC.zmReward;
  OSC.reward=function(claim,sid,n,res,now){return jhWindXp(r0.apply(this,arguments),sid,!!(res&&res.ok))};
  OSC.zmReward=function(claim,m,res,now){return jhWindXp(z0.apply(this,arguments),m&&m.sid,!!res,null,jhWindAt(m))};OSC.jhWind=1}}catch(e){}
/* PR #15 審查（iMac Claude 2）：日出、日落落在 4 小時段中間時，順風的派會在段內換掉——開局看到順風、結算時卻沒加成。
   掌門盤開局（zmStart）與再下一盤（zmAgainArgs）時，把「這一刻順不順風」記進 zmCur.jw，結算照開局那一刻算 */
function jhWindMark(m){try{const C=store.get("zmCur",null);if(m&&C&&C.id===m.id)store.set("zmCur",{...C,jw:jhWindOn(m.sid)?1:0})}catch(e){}}
function jhWindAt(m){try{const C=store.get("zmCur",null);if(m&&C&&C.id===m.id&&"jw" in C)return !!C.jw}catch(e){}return undefined}
try{if(typeof zmStart==="function"&&!zmStart.jhw){const s0=zmStart;zmStart=function(m){const r=s0.apply(this,arguments);jhWindMark(m);return r};zmStart.jhw=1}
  if(typeof zmAgainArgs==="function"&&!zmAgainArgs.jhw){const a0=zmAgainArgs;zmAgainArgs=function(j){const r=a0.apply(this,arguments);if(r)jhWindMark(OSC.mst(j));return r};zmAgainArgs.jhw=1}}catch(e){}
/* ---------- W48 案 4「掌門暗樁」（開發者 11/21 選 Gemini 189 案 4）----------
   在驛站、園子、秘境贏了某一派的門下棋友（OSC.NPC 主修是這一派，雙方合計至少 10 步），就打聽到這派掌門「今天」打算走主修還是副修的棋路。
   情報是真的：引擎端 xiangqi-lab/src/local.js 的 zmLeanOrd 用同一套算法決定掌門盤用主修或副修的開局表（每三天約一天走副修）。
   只給情報，不改掌門強度、不改棋局、不加修為；同一天打聽過的派記在 store jhIntel＝{d:日期, s:[派]}，隔天要重新打聽。 */
function jhIntelLean(sid,d){d=d||new Date();const s=jhWindDay(d)+"|inn:zm_"+sid;return jhWindHash(s)%3===0?1:0}
function jhIntelSch(sid,d){const m=typeof OSC!=="undefined"?OSC.MST.find(x=>x.sid===sid):null;if(!m)return"";return jhIntelLean(sid,d)?m.sec:m.sid}
function jhIntelGot(d){d=d||new Date();let r=null;try{r=store.get("jhIntel",null)}catch(e){}return r&&r.d===jhWindDay(d)&&Array.isArray(r.s)?r.s:[]}
function jhIntelOn(sid,d){return jhIntelGot(d).includes(sid)}
function jhIntelGet(sid,mate){if(!sid||jhIntelOn(sid))return false;const m=OSC.MST.find(x=>x.sid===sid);if(!m)return false;
  const day=jhWindDay(new Date()),s=jhIntelGot().concat(sid);try{store.set("jhIntel",{d:day,s})}catch(e){return false}
  const T=jhSch(jhIntelSch(sid));if(typeof toast==="function"&&T)setTimeout(()=>{try{toast(jhL(`${mate}悄悄說：掌門${m.nm}今天打算走${T.op}。`,`${mate} whispers: Master ${m.en} plans to play ${T.op} today.`))}catch(e){}},2600);
  return true}
/* 駐地小卡上的一段：打聽到了＝寫出今天的棋路；還沒＝告訴玩家去贏哪幾位門人 */
function jhIntelHTML(sid,m,mates){if(jhIntelOn(sid)){const T=jhSch(jhIntelSch(sid));if(!T)return"";
    return`<p class="jh-intel">${esc(jhL(`打聽到了：${m.nm}今天打算走${T.op}（${T.nm}的路子）。`,`Word is out: ${m.en} plans to play ${T.op} today (the ${T.nm} way).`))}</p>`}
  return mates&&mates.length?`<p class="jh-intel-hint">${esc(jhL(`先贏一位門下棋友（${mates.slice(0,3).join("、")}），就能打聽到掌門今天的棋路。`,`Beat one of this school's players (${mates.slice(0,3).join(", ")}) to learn the master's plan for today.`))}</p>`:""}
/* 包住 07-legend 的 journeyGameEnd（不改 07-legend）：下完一盤先判斷對手是哪一派的門人，原本的結算照跑，贏了再記情報 */
try{if(typeof journeyGameEnd==="function"&&!journeyGameEnd.jhIntel){const g0=journeyGameEnd;
  journeyGameEnd=function(st){let k="";try{k=typeof oscNpcKey==="function"?oscNpcKey(st):""}catch(e){k=""}
    const r=g0.apply(this,arguments);
    try{if(k&&!/^zm:/.test(k)&&st&&st.result&&st.result.w===st.human&&(st.moves||[]).length>=10){const x=OSC.NPC[k];if(x)jhIntelGet(x[0],jhT(x[2]))}}catch(e){}
    return r};journeyGameEnd.jhIntel=1}}catch(e){}
/* ---------- W48 十派門內場景（開發者 11/21 選「先做門內場景頁面，先用中炮門」）----------
   開發者原話：「十個門派入口進去後，根據該門派的場景繪製放大版的場景，裡面會有掌門人坐在掌門房」。
   路由 #/jianghu/hall/<派>：一張滿版門內圖（story/gemini_app/189、190；圖上不畫人、不寫字），掌門用已驗收的坐姿立繪疊在大廳主位（開發者選「圖畫空座＋程式疊立繪」）。
   可點：掌門大廳（＝駐地小卡：拜師、挑戰）、講棋堂（＝開局課程）、前院（門下棋友在哪裡找得到）、山門（回長卷）。掌門立繪本身也能點。
   座標都是門內圖原圖像素（768×1376）；圖讀不到（還沒放上 CDN、或史學顧問還沒審完）就退回長卷並打開原本的小卡，不出現壞畫面。
   JH_HALL 只列有圖的派；其他派沿用原本的小卡。
   11/22 中炮門換第 7 版圖（史學顧問三回審定，story/gemini_app/190_*）：佈局照長卷改成長石階＋四座方亭＋頂上大殿，最下方是碼頭階埠與漕船；
   座標依新圖重量——講棋堂＝左上方亭、前院＝碼頭石平台、出口在碼頭邊（搭船回長卷）。v 一併改成 1122，讓舊快取的第 2 版圖失效。 */
const JH_HALL={
  central:{v:"1122",seat:[387,297],w:72,spots:{hall:[384,112],study:[226,458],yard:[384,1008],gate:[384,1330]}}
};
const JH_HALL_W=768,JH_HALL_H=1376;
const JH_HALL_BAD=new Set();   /* 這次開 App 讀圖失敗過的派：小卡不再顯示「走進山門」，免得一直繞回來 */
const jhHallPc=([x,y])=>`left:${(x/JH_HALL_W*100).toFixed(2)}%;top:${(y/JH_HALL_H*100).toFixed(2)}%`;
/* 門下棋友在哪裡找得到：驛站（inn:）、園子（npc:）、秘境（secret:） */
function jhHallMates(sid){if(typeof OSC==="undefined")return[];const P={inn:jhL("驛站","Post Inn"),npc:jhL("園子","the Park"),secret:jhL("秘境","a hidden place")};
  return Object.entries(OSC.NPC).filter(([k,x])=>x[0]===sid).map(([k,x])=>({k,nm:jhT(x[2]),at:P[k.split(":")[0]]||""}))}
function jhHallYard(sid){const S=jhSch(sid),L=jhHallMates(sid);
  sheet(jhL(`${S.nm}・前院`,`${S.nm} · Front yard`),b=>{b.innerHTML=`<p class="muted">${esc(jhL("門下棋友平常不在山門裡，分散在各處下棋：","The school's players are usually out playing elsewhere:"))}</p>
    ${L.length?`<ul class="jh-mates">${L.map(x=>`<li><b>${esc(x.nm)}</b><span class="muted">${esc(x.at)}</span></li>`).join("")}</ul>`:`<p class="muted">${esc(jhL("這一派目前沒有登記的門人。","No players are listed for this school yet."))}</p>`}
    ${typeof jhIntelHTML==="function"&&OSC.MST.find(x=>x.sid===sid)?jhIntelHTML(sid,OSC.MST.find(x=>x.sid===sid),L.map(x=>x.nm)):""}`})}
function jhHallStudy(sid){const c=jhLook(),o=typeof oscGet==="function"?oscGet():null,act=c&&o?OSC.act(o,c):"";
  if(!c){toast(jhL("開始旅程、有了隊伍以後才能拜師。","Start a journey and form a party first."));return}
  if(act===sid){location.hash="#/school/"+c;return}
  if(typeof oscJoinAsk==="function")oscJoinAsk(c,sid,()=>{location.hash="#/school/"+c})}
function JhHall(v,sid){jhCss();const H=JH_HALL[sid],S=jhSch(sid),m=typeof OSC!=="undefined"?OSC.MST.find(x=>x.sid===sid):null;
  if(!H||!S){location.hash="#/jianghu";return{}}
  setTop(jhL(`🚪 ${S.nm}`,`🚪 ${S.nm}`),"#/jianghu");if(typeof setTabs==="function")setTabs(false);v.className="view";document.body.classList.add("jh-on");
  const f=jhFadeEl();f.classList.add("on");
  const P=document.createElement("div");P.className="shp-page cq jh-hall";v.innerHTML="";v.append(P);
  const img=document.createElement("img");img.src=`data/zmhall/${sid}.webp?v=${H.v}`;img.alt=jhL(`${S.nm}門內：碼頭、長石階、四座方亭，最上面是掌門大廳`,`Inside the ${S.nm}: the pier, a long stairway, four pavilions, and the master's hall at the top`);img.draggable=false;P.append(img);
  const back=()=>{f.classList.remove("on");location.hash="#/jianghu";setTimeout(()=>{try{jhSheet(sid)}catch(e){}},700)};
  img.onerror=()=>{JH_HALL_BAD.add(sid);back()};   /* 圖還沒上 CDN、史學顧問還沒審完：退回長卷、開原本的小卡 */
  if(m){const z=document.createElement("img");z.className="jh-hall-zm";z.src=`data/npc/${m.id}.webp`;z.alt=jhL(`掌門${m.nm}坐在大廳主位`,`Master ${m.en} seated in the hall`);
    z.style.cssText=jhHallPc(H.seat)+`;width:${(H.w/JH_HALL_W*100).toFixed(2)}%`;z.onclick=()=>jhSheet(sid);z.onerror=()=>z.remove();P.append(z)}
  const spot=(k,label,go)=>{const p=H.spots[k];if(!p)return;const b=document.createElement("button");b.type="button";b.className="shp-spot jh-hall-spot"+(k==="gate"?" ex-spot":"");b.dataset.k=k;b.style.cssText=jhHallPc(p);b.innerHTML=`<b>${esc(label)}</b>`;b.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}go()};P.append(b)};
  spot("hall",m?jhL(`🏯 掌門大廳・${m.nm}`,`🏯 Master's hall · ${m.en}`):jhL("🏯 掌門大廳","🏯 Master's hall"),()=>jhSheet(sid));
  spot("study",jhL("📖 講棋堂","📖 Lecture hall"),()=>jhHallStudy(sid));
  spot("yard",jhL("👥 前院・門下棋友","👥 Front yard"),()=>jhHallYard(sid));
  spot("gate",jhL("‹ 搭船回十州棋館","‹ Take a boat back to the Ten Prefectures"),()=>jhGo("#/jianghu"));
  if(typeof jhWindOn==="function"&&jhWindOn(sid)){const n=document.createElement("p");n.className="jh-windnote jh-hall-note";n.textContent=jhL("眼下順風：在這一派上課、挑戰掌門，修為多給。","Fair wind now: lessons and master challenges here give extra XP.");P.append(n)}
  const ready=()=>{if(P.isConnected)jhFadeOut()};if(img.complete&&img.naturalWidth)setTimeout(ready,0);else img.onload=ready;
  setTimeout(()=>{if(f.classList.contains("on")&&P.isConnected&&img.naturalWidth)jhFadeOut()},6000);
  return{}}
/* 樣式：掌門立繪＝坐在主位（腳底對齊桌面）；地點標籤沿用 .shp-spot */
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhHallCss";s.textContent=`
.jh-hall{position:relative}.jh-hall>img:first-child{display:block;width:100%;height:auto;user-select:none;-webkit-user-drag:none}
.jh-hall-zm{position:absolute;transform:translate(-50%,-100%);height:auto;cursor:pointer;filter:drop-shadow(0 2px 2px rgba(30,20,10,.35))}
.jh-hall-note{position:absolute;left:4%;right:4%;top:2%;margin:0}
.jh-mates{list-style:none;padding:0;margin:8px 0}.jh-mates li{display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid rgba(0,0,0,.08)}`;
  if(!document.getElementById("jhHallCss"))document.head.append(s)})();
/* ---------- W48 前院門下棋友（開發者 11/21：「門下棋友也站在前院給玩家點選和對話，增加一些和門下棋友的互動」）----------
   前院站最多 3 位這一派的門人（用現成立繪：園子棋友 data/npc/<id>.webp、驛站與秘境人物 data/actors/<id>.webp），點了開互動卡：
     💬 聊聊：園子棋友用 07d NPC_BOND 的閒聊與文化小知識，驛站、秘境人物用自己那句話；每點一次換一句
     📖 請教本門棋路：用門人的口吻講這一派開局的要點（OSC 的 op、say）
     🔍 打聽掌門：今天打聽到了就照實說（案 4 情報）；還沒有就說「贏我一盤就告訴你」
     ⚔ 切磋一盤：園子棋友指定由他坐下（包住 06-cpu parkNpcNew 的 keep），驛站旅人照驛站原本的開法；秘境人物要在秘境遇過才能下
   不加修為、不改強度與棋局；贏了照案 4 規則解鎖情報（journeyGameEnd 包裝本來就會判斷）。 */
JH_HALL.central.mates=[[296,1150],[472,1150]];   /* 11/22 第 7 版：站在碼頭平台、靠石階底端，左右對稱；前院標籤在石階上，不壓到人頭；左右拉開到 296／472，兩個五字名牌在 375 寬手機上也不相碰。
   PR #22 審查後開發者決定（iMac 轉達）：前院最多只站 2 位——站位只留兩格（jhHallMatesDraw 照格數畫）；門人超過 2 位時照 jhMatesShown 的排序每天換一批（能切磋的優先，其餘照每日雜湊）。 */
const JH_MATE_W=54;   /* 11/22 開發者看實機畫面說「放上門下棋友的畫面變得好怪」：88 比遠處的掌門還大、像巨人；對照三案後選「縮小靠石階、有名牌」 */
let jhMateKeep=null;   /* {id,t}：從前院點「切磋一盤」指定的園子棋友；用掉就清，45 秒內才算數，到期也清 */
const JH_MATE_KEEP_MS=45000;
/* 一位門人的資料：k＝OSC.NPC 的鍵（inn:／npc:／secret:）；回傳名字、立繪、在哪、台詞清單、能不能下 */
function jhMateInfo(k){if(typeof OSC==="undefined")return null;const x=OSC.NPC[k];if(!x)return null;const [kind,id]=k.split(":");
  const at={inn:jhL("驛站","Post Inn"),npc:jhL("園子","the Park"),secret:jhL("秘境","a hidden place")}[kind]||"";
  let lines=[],can=false,why="";
  if(kind==="npc"){const n=typeof PARK_NPC!=="undefined"?PARK_NPC.find(z=>z.id===id):null,B=typeof NPC_BOND!=="undefined"?NPC_BOND[id]:null;
    if(n&&n.say)lines.push(n.say);if(B){(B.l||[]).forEach(s=>lines.push(s));(B.c||[]).forEach(s=>lines.push(s))}can=!!n}
  else if(kind==="inn"){const n=typeof INN!=="undefined"?INN.find(z=>z.id===id):null;if(n&&n.say)lines.push(n.say);can=!!n}
  else if(kind==="secret"){const n=typeof SECRETS!=="undefined"?SECRETS.find(z=>z.id===id):null;if(n){if(n.say)lines.push(String(n.say).replace(/^「|」$/g,""));if(n.who)lines.push(n.who)}
    let met=false;try{met=typeof jSecrets==="function"&&!!jSecrets()[id]}catch(e){}can=!!n&&met;if(n&&!met)why=jhL("要先在秘境遇到他，才能切磋。","You need to meet them in a hidden place first.")}
  return{k,kind,id,sid:x[0],nm:jhT(x[2]),at,img:kind==="npc"?`data/npc/${id}.webp`:`data/actors/${id}.webp`,lines:lines.map(s=>jhT(s)),can,why}}
function jhMatesOf(sid){if(typeof OSC==="undefined")return[];return Object.keys(OSC.NPC).filter(k=>OSC.NPC[k][0]===sid).map(jhMateInfo).filter(Boolean)}
/* 前院站誰：可以下的優先（園子、驛站），其次秘境；每天換一批（同一天固定） */
function jhMatesShown(sid,n,d){const L=jhMatesOf(sid);const day=typeof jhWindDay==="function"?jhWindDay(d||new Date()):"";
  const key=m=>(m.can?0:1)*1e10+(typeof jhWindHash==="function"?jhWindHash(day+"|"+m.k):0);return L.slice().sort((a,b)=>key(a)-key(b)).slice(0,n)}
function jhMateTip(sid,M){const S=jhSch(sid);return jhL(`我們${S.nm}講究${S.op}：${S.say}`,`In the ${S.nm} we play ${S.op}: ${jhT(S.say)}`)}
function jhMateIntel(sid,M){const m=OSC.MST.find(x=>x.sid===sid);if(!m)return"";
  if(typeof jhIntelOn==="function"&&jhIntelOn(sid)){const T=jhSch(jhIntelSch(sid));return jhL(`悄悄告訴你：掌門${m.nm}今天打算走${T.op}。`,`Between us: Master ${m.en} plans to play ${T.op} today.`)}
  return jhL(`掌門今天的打算？贏我一盤，我就告訴你。`,`The master's plan today? Beat me in a game and I'll tell you.`)}
function jhMatePlay(M){if(!M||!M.can)return;
  /* PR #21 審查（iMac，兩輪）：jStart 不一定會呼叫 parkNpcNew——已有沒下完的園子棋直接接續、選單按取消、API 出錯時，指定會留著、蓋掉之後的園子抽人與攔路棋客；
     但別的旅程沒下完時 jStart 只跳選單就 return，玩家之後按「放棄，開新的」才抽人，不能在 jStart 結束時就清。
     所以：用掉就清（parkNpcNew 包裝裡）＋45 秒內才算數＋到期由計時器清（只清同一次的指定） */
  if(M.kind==="npc"){const K={id:M.id,t:Date.now()};jhMateKeep=K;setTimeout(()=>{if(jhMateKeep===K)jhMateKeep=null},JH_MATE_KEEP_MS);const lv=typeof parkNpcLv==="function"?parkNpcLv():3;
    jStart("park",{human:"r",level:lv,journey:"park"},()=>{location.hash="#/journey/play"});return}
  if(M.kind==="inn"){const x=INN.find(z=>z.id===M.id);if(!x)return;const lv=typeof innLvN==="function"?innLvN(x):3,rl=typeof innRlv==="function"?innRlv(x):null;
    if(rl!=null)store.set("innCur",{id:x.id,rl});
    jStart("inn:"+x.id,rl==null?{human:"r",level:lv,journey:"inn:"+x.id}:{human:"r",level:Math.max(1,Math.min(6,1+Math.floor(rl/3))),rlv:rl,journey:"inn:"+x.id},()=>{location.hash="#/journey/play"});return}
  if(M.kind==="secret"){const x=SECRETS.find(z=>z.id===M.id);if(!x)return;const lv=typeof secretLv==="function"?secretLv(x):5;
    jStart("inn:"+x.id,{human:"r",level:lv,journey:"inn:"+x.id},()=>{location.hash="#/journey/play"})}}
/* 互動卡 */
function jhMateCard(sid,k){const M=jhMateInfo(k);if(!M)return;let i=0;
  sheet(`${M.nm}`,b=>{const say=t=>{const p=b.querySelector("#jhMateSay");if(p)p.textContent=t};
    b.innerHTML=`<div class="jh-card"><img src="${M.img}" alt="" onerror="this.remove()"><div class="tx"><b>${esc(M.nm)}</b><p class="muted">${esc(jhL(`${jhSch(sid).nm}門下・平常在${M.at}`,`${jhSch(sid).nm} · usually at ${M.at}`))}</p>
      <p id="jhMateSay" class="jh-mate-say">${esc(M.lines[0]||jhL("……（點點頭）","... (nods)"))}</p></div></div>
      <div class="jh-actions"><button class="btn ghost" id="jhMTalk">${esc(jhL("💬 聊聊","💬 Chat"))}</button><button class="btn ghost" id="jhMTip">${esc(jhL("📖 請教本門棋路","📖 Ask about the school"))}</button>
      <button class="btn ghost" id="jhMIntel">${esc(jhL("🔍 打聽掌門","🔍 Ask about the master"))}</button>
      ${M.can?`<button class="btn" id="jhMPlay">${esc(jhL("⚔ 切磋一盤","⚔ Play a game"))}</button>`:""}</div>${M.why?`<p class="muted">${esc(M.why)}</p>`:""}`;
    const q=s=>b.querySelector(s);
    q("#jhMTalk").onclick=()=>{if(!M.lines.length)return;i=(i+1)%M.lines.length;say(M.lines[i])};
    q("#jhMTip").onclick=()=>say(jhMateTip(sid,M));
    q("#jhMIntel").onclick=()=>say(jhMateIntel(sid,M));
    if(q("#jhMPlay"))q("#jhMPlay").onclick=()=>{try{closeSheet()}catch(e){}jhMatePlay(M)}})}
/* 包住 06-cpu 的 parkNpcNew：從前院點「切磋一盤」時，指定這位園子棋友坐下（只用一次） */
try{if(typeof parkNpcNew==="function"&&!parkNpcNew.jhMate){const p0=parkNpcNew;parkNpcNew=function(game,lv,keep){const K=jhMateKeep;jhMateKeep=null;const k=K&&Date.now()-K.t<JH_MATE_KEEP_MS?K.id:null;return p0.call(this,game,lv,keep||k)};parkNpcNew.jhMate=1}}catch(e){}
/* 前院站人：在 JhHall 畫完之後補上（JhHall 本身不動） */
try{if(typeof JhHall==="function"&&!JhHall.jhMate){const h0=JhHall;JhHall=function(v,sid){const r=h0.apply(this,arguments);try{jhHallMatesDraw(v,sid)}catch(e){}return r};JhHall.jhMate=1}}catch(e){}
function jhHallMatesDraw(v,sid){const H=JH_HALL[sid],P=v&&v.querySelector(".jh-hall");if(!H||!H.mates||!P)return;
  jhMatesShown(sid,H.mates.length).forEach((M,i)=>{const p=H.mates[i],z=document.createElement("img");z.className="jh-hall-mate";z.dataset.k="m"+i;z.src=M.img;z.alt=jhL(`門下棋友${M.nm}`,`${M.nm}, a player of this school`);
    z.style.cssText=jhHallPc(p)+`;width:${(JH_MATE_W/JH_HALL_W*100).toFixed(2)}%`;z.onerror=()=>z.remove();z.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}jhMateCard(sid,M.k)};
    const tag=document.createElement("span");tag.className="jh-hall-mate-tag";tag.style.cssText=jhHallPc([p[0],p[1]+14]);tag.textContent=M.nm;
    P.insertBefore(tag,P.querySelector(".jh-hall-spot"));P.insertBefore(z,tag)})}
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhMateCss";s.textContent=`
.jh-hall-mate{position:absolute;transform:translate(-50%,-100%);height:auto;cursor:pointer;filter:drop-shadow(0 2px 2px rgba(30,20,10,.35))}
.jh-hall-mate-tag{position:absolute;transform:translate(-50%,0);font:700 12px/1.2 var(--serif,serif);color:#2b2118;background:rgba(250,244,230,.88);border:1px solid #c9a96b;border-radius:8px;padding:2px 6px;white-space:nowrap;pointer-events:none}
.jh-mate-say{margin:8px 0 0;padding:8px 10px;border-radius:10px;background:#f6efe0;border:1px solid #d8c49a;color:#3b2a14;line-height:1.6}`;
  if(!document.getElementById("jhMateCss"))document.head.append(s)})();
/* ---------- W48 門內 3D 走路（開發者 11/22：「3D角色在這一頁也是要能跟在首頁一樣的移動操作方式」）----------
   沿用 07w 的 shwMount（星槎、渡口、驛站同一套）：玩家的 3D 角色站在碼頭；點地面＝沿中軸石階走過去，點離路太遠的地方就走到最近的路；
   點地點標籤、門下棋友、掌門＝先走到門口做個小動作，再開原本的東西（按鈕原本的 click 照常）。3D 沒載好、載不到、減少動態效果時不攔點選，照舊直接開。
   座標表的百分比照 768×1376 原圖（JH_HALL 的像素 ÷7.68／÷13.76）；石階中軸 x＝50%。俯角、身高照驛站 SHW_PG0，近大遠小調小一點（大殿比碼頭遠很多，但不能小到看不見）。
   門人、掌門是立繪，不跟標籤一起淡掉（shw-fade 只給文字標籤用）。JhHall 本體不動：在門人包裝之後再包一層，圖載好才掛上。 */
const JH_HALL_WALK={
  central:{h:[.052,84,.00025],look0:[50,70],dmax:4,
    N:{home:[50,87],dock:[50,90.5],mA:[44.3,86.6],mB:[55.7,86.6],s0:[50,79.5],s1:[50,61],mid:[50,44],hall:[50,27.5],study:[29.4,41.6]},
    E:"home-dock home-mA home-mB home-s0 s0-s1 s1-mid mid-hall mid-study",
    /* 入口代號＝data-k：四個地點、掌門 zm、前院門人 m0／m1（PR #22：最多 2 位，站 [296,1150]、[472,1150]；停在門人內側、面向門人） */
    HS:{hall:["hall",50.4,21,"bow"],zm:["hall",50.4,21,"bow"],study:["study",29.4,35,"wave"],yard:["s0",50,74,"wave"],gate:["dock",50,96,"wave"],
      m0:["mA",38.5,83,"wave"],m1:["mB",61.5,83,"wave"]}}
};
/* PR #23 審查（iMac）：門內頁原本沒寫出口，套到 07w 的預設出口，第一次進門亮的是頂欄返回鍵、「要回去，點這裡」也指著返回鍵。
   出口就是圖上的「‹ 搭船回十州棋館」：搭船標籤加 ex-spot（07w shwXHi 找它亮框、放泡泡），這裡寫明出口：從碼頭下方走進來、點碼頭下緣空地＝走出去 */
if(typeof SHW_EXITS!=="undefined"&&SHW_EXITS&&!("jhhall:*" in SHW_EXITS))SHW_EXITS["jhhall:*"]={out:[50,104],r:[38,90,62,100]};
function jhHallWalk(v,sid){const W=JH_HALL_WALK[sid],P=v&&v.querySelector(".jh-hall"),img=P&&P.querySelector("img");
  if(!W||!P||!img||typeof shwMount!=="function"||typeof SHW_PG0==="undefined")return;
  const zm=P.querySelector(".jh-hall-zm");if(zm)zm.dataset.k="zm";
  const go=()=>{if(!P.isConnected||!img.naturalWidth)return;
    try{shwMount({v,cfg:Object.assign({},SHW_PG0,W,{home:"dock"}),root:P,frame:P,layer:P,before:P.querySelector(".jh-hall-spot"),
      sel:".jh-hall-spot,.jh-hall-mate,.jh-hall-zm",keyOf:b=>b.dataset.k||"",find:h=>P.querySelector(`[data-k="${h}"]`),mem:"jhhall:"+sid})}catch(e){}};
  if(img.complete&&img.naturalWidth)setTimeout(go,0);else img.addEventListener("load",go,{once:true})}
try{if(typeof JhHall==="function"&&!JhHall.jhWalk){const h0=JhHall;JhHall=function(v,sid){const r=h0.apply(this,arguments);try{jhHallWalk(v,sid)}catch(e){}return r};JhHall.jhWalk=1}}catch(e){}
(function(){if(typeof document==="undefined")return;const s=document.createElement("style");s.id="jhHallWalkCss";s.textContent=`
.jh-hall .jh-hall-mate.shw-fade,.jh-hall .jh-hall-zm.shw-fade{opacity:1!important}
.jh-hall .jh-hall-mate-tag{z-index:4}`;   /* 門人名牌是文字標示，角色走到門人旁邊也不能蓋住 */
  if(!document.getElementById("jhHallWalkCss"))document.head.append(s)})();
/* ---------- W45② 十州踢館令（Gemini 188 案 4；開發者 11/22 選單：配對照表、贏了給印記＋棋譜＋修為 30、戰書旗先用程式畫）----------
   打敗 A 派掌門（任何一位角色都算）→ 相剋的 B 派山門插戰書旗；用 A 派的開局挑戰 B 派掌門：雙方前三步照定式擺好（lv.fen＝從定式走完的局面開下），玩家執 A 派那一方。
   定式 10 組都用 App 網頁版 Pikafish 核驗（Node 裡跑 WASM、深度 18；走完輪紅走，紅方觀點 +14～+61，都是均勢），合法性用 core.js 檢查。
   走驛站掌門那條路（journey inn:zm_<B>）：頭像、結算、戰績、強度浮動都照舊；有起始局面時掌門開局庫不用（local.js npcKeyOf 遇到 G.start 回空），由引擎照強度下。
   贏了：B 的山門掛朱紅「已破陣」印；第一次破陣那一盤的局號記下來（#/db/play/<局號> 看棋譜）；每一組帳號第一次贏修為 +30（oscClaim 的 kick:A>B）。
   存檔 jhKick（跟旅程走，05b-save.js JOURNEY_KEYS 的 m_jhKick）＝{w:{"A>B":{t,g,c}}}；zmCur 多一個 kick＝"A>B"（這一盤是踢館）。 */
const JH_KICK=[
  {a:"central",b:"screen",mv:"h2e2 h9g7 h0g2 i9h9 i0h0 b9c7",fen:"r1bakabr1/9/1cn3nc1/p1p1p1p1p/9/9/P1P1P1P1P/1C2C1N2/9/RNBAKABR1"},   /* 屏風馬破當頭炮：中炮直車對屏風馬 +36 */
  {a:"screen",b:"central",mv:"h2e2 h9g7 h0g2 i9h9 i0h0 b9c7",fen:"r1bakabr1/9/1cn3nc1/p1p1p1p1p/9/9/P1P1P1P1P/1C2C1N2/9/RNBAKABR1"},   /* 同一盤定式，玩家改執黑 +36 */
  {a:"palace_horse",b:"central",mv:"h2e2 b9c7 h0g2 h7f7 i0h0 h9g7",fen:"r1bakab1r/9/1cn2cn2/p1p1p1p1p/9/9/P1P1P1P1P/1C2C1N2/9/RNBAKABR1"},   /* 中炮對反宮馬 +38 */
  {a:"same_cannon",b:"central",mv:"h2e2 h7e7 h0g2 h9g7 i0h0 i9i8",fen:"rnbakab2/8r/1c2c1n2/p1p1p1p1p/9/9/P1P1P1P1P/1C2C1N2/9/RNBAKABR1"},   /* 順炮直車對橫車 +40 */
  {a:"opposite_cannon",b:"central",mv:"h2e2 b7e7 h0g2 h9g7 i0h0 i9h9",fen:"rnbakabr1/9/4c1nc1/p1p1p1p1p/9/9/P1P1P1P1P/1C2C1N2/9/RNBAKABR1"},   /* 中炮對列炮 +45 */
  {a:"cross_palace",b:"central",mv:"h2d2 h7e7 h0g2 h9g7 i0h0 i9h9",fen:"rnbakabr1/9/1c2c1n2/p1p1p1p1p/9/9/P1P1P1P1P/1C1C2N2/9/RNBAKABR1"},   /* 過宮炮對中炮 +54 */
  {a:"pawn",b:"elephant",mv:"c3c4 c9e7 h0g2 h9g7 b0c2 b9a7",fen:"r2akab1r/9/nc2b1nc1/p1p1p1p1p/9/2P6/P3P1P1P/1CN3NC1/9/R1BAKAB1R"},   /* 仙人指路對飛象 +61 */
  {a:"elephant",b:"cross_palace",mv:"g0e2 h7d7 h0g2 h9g7 i0h0 i9h9",fen:"rnbakabr1/9/1c1c2n2/p1p1p1p1p/9/9/P1P1P1P1P/1C2B1NC1/9/RNBAKA1R1"},   /* 飛相對過宮炮 +14 */
  {a:"horse",b:"pawn",mv:"h0g2 g6g5 c3c4 h9g7 b0c2 b9c7",fen:"r1bakab1r/9/1cn3nc1/p1p1p3p/6p2/2P6/P3P1P1P/1CN3NC1/9/R1BAKAB1R"},   /* 起馬對挺卒 +29 */
  {a:"advisor_corner",b:"horse",mv:"b2d2 h9g7 b0c2 g6g5 h0g2 b9c7",fen:"r1bakab1r/9/1cn3nc1/p1p1p3p/6p2/9/P1P1P1P1P/2NC2NC1/9/R1BAKAB1R"}];   /* 仕角炮對起馬 +32 */
const jhKickK=k=>k.a+">"+k.b;
const jhKickOf=key=>JH_KICK.find(k=>jhKickK(k)===key)||null;
function jhKickGet(){let o=null;try{o=store.get("jhKick",null)}catch(e){}const R={w:{}};if(!o||!o.w||typeof o.w!=="object")return R;
  for(const k of JH_KICK){const x=o.w[jhKickK(k)];if(x&&typeof x==="object")R.w[jhKickK(k)]={t:Math.max(0,+x.t||0),g:typeof x.g==="string"?x.g.slice(0,60):"",c:typeof x.c==="string"?x.c.slice(0,24):""}}return R}
function jhKickBeat(){try{return OSC.zmBeaten(zmGet())}catch(e){return[]}}
/* sid 這一派山門收到的戰書（下帖的是 sid＝B）：A 派掌門被打敗過才出現；won＝破陣紀錄 */
function jhKickAt(sid,beat,W){beat=beat||jhKickBeat();W=W||jhKickGet().w;return JH_KICK.filter(k=>k.b===sid&&beat.includes("zm_"+k.a)).map(k=>Object.assign({},k,{won:W[jhKickK(k)]||null}))}
/* 定式寫成記譜：中文用 core.js notate；英文介面轉 WXF（07i18n i18nWxf） */
function jhKickCn(k){try{const C=window.XQCore;let b=C.parseFen(C.START.split(" ")[0]);const o=[];
    for(const u of k.mv.split(" ")){const f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4)),cn=C.notate(b,f,t);o.push(typeof oscEn==="function"&&oscEn()&&typeof i18nWxf==="function"?(i18nWxf(cn)||cn):cn);b=C.make(b,f,t)}
    return o.join(" ")}catch(e){return k.mv}}
const jhKickFlag=()=>`<svg class="jh-kflag" viewBox="0 0 20 22" aria-hidden="true"><rect x="2" y="1" width="2" height="20" rx="1" fill="#5a3a1e"/><path d="M4 2h13l-4 4.5 4 4.5H4z" fill="#c0281e" stroke="#7a1410" stroke-width=".8"/><text x="9.4" y="9.1" font-size="6.2" font-weight="900" text-anchor="middle" fill="#fff6e0" font-family="serif">戰</text></svg>`;
function jhKickHTML(sid,c){const L=jhKickAt(sid);if(!L.length)return"";const B=jhSch(sid);jhKickCss();
  return`<div class="jh-kick">${L.map(k=>{const A=jhSch(k.a),key=jhKickK(k);return`<div class="jh-kick-row${k.won?" won":""}">
    <p class="jh-kick-h">${k.won?`<span class="jh-kseal-s" aria-hidden="true">${esc(jhL("已破陣","Broken"))}</span>`:jhKickFlag()}<b>${esc(jhL(`${B.nm}下帖：敢用你學的${A.op}來破嗎？`,`The ${B.nm} challenges you: break us with the ${A.op}!`))}</b></p>
    <p class="muted">${esc(jhL(`前三步照定式擺好，你執${OSC.side(k.a)==="r"?"紅":"黑"}：`,`The first three moves are set; you play ${OSC.side(k.a)==="r"?"Red":"Black"}: `))}${esc(jhKickCn(k))}</p>
    ${k.won?`<p class="muted">${esc(jhL("已經破陣，再下只記戰績。","Already broken; replays only count in your record."))}</p>`:""}
    <div class="jh-actions">${c?`<button class="btn${k.won?" ghost":""}" data-kick="${esc(key)}">${esc(k.won?jhL("再踢一次館","Challenge again"):jhL(`📜 接下戰書（用${A.op}）`,`📜 Accept (play the ${A.op})`))}</button>`:""}
      ${k.won&&k.won.g?`<button class="jh-link" data-kickg="${esc(k.won.g)}">${esc(jhL("看破陣那一盤","See the winning game"))}</button>`:""}</div></div>`}).join("")}</div>`}
function jhKickBind(box,c){if(!box)return;
  box.querySelectorAll("[data-kick]").forEach(x=>{x.onclick=()=>{try{closeSheet()}catch(e){}jhKickStart(x.dataset.kick,c)}});
  box.querySelectorAll("[data-kickg]").forEach(x=>{x.onclick=()=>{try{closeSheet()}catch(e){}location.hash="#/db/play/"+encodeURIComponent(x.dataset.kickg)}})}
/* 開局參數：照掌門那一盤（zmArgs），改成玩家執 A 派那一方、從定式走完的局面開始（輪紅走） */
function jhKickArgs(k,m,rl,dx){return Object.assign(zmArgs(m,rl,dx),{human:OSC.side(k.a),lv:{fen:k.fen,turn:"r"}})}
function jhKickStart(key,c0){const k=jhKickOf(key),m=k&&OSC.MST.find(x=>x.sid===k.b);if(!k||!m||typeof zmArgs!=="function"||typeof jStart!=="function")return;
  const P=typeof ptyGet==="function"?ptyGet():null,c=c0||(P&&P.look);
  if(!c||!P||!PTY.has(P,c)){toast(jhL("要先有修行角色：已加入隊伍的七星才能踢館","You need a training character first: only Seven Stars in your party can take a challenge"));return}
  const rl=OSC.zmRlv(zmGet(),m);store.set("zmCur",{id:m.id,rl,c,kick:key});
  jStart("inn:"+m.id,jhKickArgs(k,m,rl),fresh=>{
    if(!fresh){try{const C=store.get("zmCur",null);if(C&&C.kick){delete C.kick;store.set("zmCur",C)}}catch(e){}}   /* 接著下原本那一盤（不是踢館的局面）：不算踢館 */
    location.hash="#/journey/play";
    if(fresh)setTimeout(()=>{try{toast(jhL(`📜 ${m.nm}：「你學的${jhSch(k.a).op}，就在這裡驗一驗。」`,`📜 ${m.en}: "Let's see your ${jhSch(k.a).op}."`))}catch(e){}},500)})}
/* 下完：先讓原本的掌門結算跑完（戰績、強度、帳號第一次贏掌門的修為），是踢館而且贏了才記破陣 */
function jhKickEnd(st,P,C){const m=OSC.mst(P&&P.id);if(!m||!C||!C.kick||C.id!==m.id||!st||!st.result||st.result.w!==st.human)return 0;
  const k=jhKickOf(C.kick);if(!k||k.b!==m.sid)return 0;
  const S=jhKickGet();if(!S.w[C.kick])S.w[C.kick]={t:Date.now(),g:String(st.id||"").slice(0,60),c:String(C.c||"").slice(0,24)};store.set("jhKick",S);
  let xp=0;try{const cl=store.get("oscClaim",{})||{};if(!cl["kick:"+C.kick]){cl["kick:"+C.kick]=Date.now();xp=30;store.set("oscClaim",cl)}}catch(e){}
  if(xp&&typeof addXP==="function")try{addXP(xp,jhL("十州踢館","Gate challenge"),"kick:"+st.id)}catch(e){}
  setTimeout(()=>{try{toast(jhL(`🔴 已破陣！${jhSch(k.b).nm}的山門掛上了你的印記`,`🔴 Broken! Your seal now hangs on the ${jhSch(k.b).nm} gate`))}catch(e){}},3400);return xp||1}
try{if(typeof zmGameEnd==="function"&&!zmGameEnd.jhKick){const g0=zmGameEnd;zmGameEnd=function(st,P){let C=null;try{C=store.get("zmCur",null)}catch(e){}const r=g0.apply(this,arguments);if(r)try{jhKickEnd(st,P,C)}catch(e){}return r};zmGameEnd.jhKick=1}}catch(e){}
/* 再下一盤：上一盤是踢館就照樣從定式局面開、玩家執同一方（原本的 zmAgainArgs 會重寫 zmCur、拿掉 kick，這裡補回去） */
try{if(typeof zmAgainArgs==="function"&&!zmAgainArgs.jhKick){const a0=zmAgainArgs;zmAgainArgs=function(j,dx){let C=null;try{C=store.get("zmCur",null)}catch(e){}const r=a0.apply(this,arguments);
    try{const k=r&&C&&C.kick?jhKickOf(C.kick):null,m=k?OSC.mst(j):null;if(k&&m&&C.id===m.id&&k.b===m.sid){const C2=store.get("zmCur",null);if(C2){C2.kick=C.kick;store.set("zmCur",C2)}return Object.assign(r,{human:OSC.side(k.a),lv:{fen:k.fen,turn:"r"}})}}catch(e){}return r};zmAgainArgs.jhKick=1}}catch(e){}
/* 長卷：有戰書的山門標籤插一面小紅旗；破陣過的掛朱紅印（Jianghu 本體不動，畫完再補上） */
function jhKickDeco(v){const map=v&&v.querySelector&&v.querySelector(".jh-map");if(!map)return;jhKickCss();const beat=jhKickBeat(),W=jhKickGet().w;
  for(const b of map.querySelectorAll(".jh-spot[data-sid]")){const L=jhKickAt(b.dataset.sid,beat,W),bn=b.querySelector(".bn");if(!bn||!L.length)continue;
    const open=L.some(k=>!k.won),won=L.some(k=>k.won);b.classList.toggle("kick",open);b.classList.toggle("broke",won);
    if(open&&!bn.querySelector(".jh-kflag"))bn.insertAdjacentHTML("afterbegin",jhKickFlag());if(!open){const f=bn.querySelector(".jh-kflag");if(f)f.remove()}
    if(won&&!bn.querySelector(".jh-kseal")){const s=document.createElement("i");s.className="jh-kseal";s.setAttribute("aria-hidden","true");s.textContent=jhL("已破陣","Broken");bn.append(s)}   /* 印掛在牌子右上角（.bn 才是看得到的牌子；整個 .jh-spot 比牌子寬） */
    if(!b.dataset.kickAria){b.dataset.kickAria=1;b.setAttribute("aria-label",(b.getAttribute("aria-label")||"")+(open?jhL("，有戰書",", challenge posted"):"")+(won?jhL("，已破陣",", broken"):""))}}}
try{if(typeof Jianghu==="function"&&!Jianghu.jhKick){const j0=Jianghu;Jianghu=function(v){const r=j0.apply(this,arguments);try{jhKickDeco(v)}catch(e){}setTimeout(()=>{try{jhKickDeco(v)}catch(e){}},400);return r};Jianghu.jhKick=1}}catch(e){}
function jhKickCss(){if(typeof document==="undefined"||document.getElementById("jhKickCss"))return;const s=document.createElement("style");s.id="jhKickCss";s.textContent=`
.jh-spot .bn .jh-kflag{width:20px;height:22px;flex:none;margin-right:-2px;filter:drop-shadow(0 1px 1px rgba(40,20,10,.35))}
.jh-spot.kick .bn{border-color:#b3261e}
.jh-spot.broke .bn{position:relative}
.jh-spot .jh-kseal{position:absolute;right:-12px;top:-15px;font:900 11px/1 var(--serif,serif);font-style:normal;letter-spacing:.06em;color:#b3261e;border:2px solid #b3261e;border-radius:4px;padding:3px 4px;background:rgba(255,248,236,.9);transform:rotate(-12deg);white-space:nowrap;pointer-events:none}
.jh-kick{margin:10px 0 0;display:flex;flex-direction:column;gap:10px}
.jh-kick-row{padding:10px 12px;border-radius:12px;background:#fbf3e3;border:1.5px solid #c9a96b;color:#2b2118}
.jh-kick-row .muted{color:#5c4a32}
.jh-kick-row.won{border-color:#b3261e}
.jh-kick-h{display:flex;align-items:center;gap:8px;margin:0 0 4px}.jh-kick-h .jh-kflag{width:20px;height:22px;flex:none}
.jh-kseal-s{flex:none;font:900 11px/1 var(--serif,serif);color:#b3261e;border:2px solid #b3261e;border-radius:4px;padding:3px 4px;transform:rotate(-8deg)}`;document.head.append(s)}
/* ---------- W46 十州漕運殘局（Gemini 188 案 1；開發者 11/22「門派任務版」範圍）----------
   長卷的運河上有一艘掛紅燈籠的漕船，每個時辰（兩小時）沿運河往南換一州停靠：徐州（起馬門）→ 泗州（飛相門）→ 淮安（中炮門）→ 揚州（仙人指路門），到揚州再回徐州。
   點漕船：小卡寫「漕船擱淺，N 步內替船老大解開這盤死棋」→ 登船＝進殘局頁（07c-canju.js 的外掛模式 XM，網址 #/canju/cy/<派>/<日>/<題號>）。
   題目：殘局題庫 canju-set.json 裡「殺棋」而且一～三步殺（n≤3）、帶這一州門派殺法標籤（th）的題；同一天、同一州固定一題（照日期＋州的雜湊挑，cjDay 早上 4 點換日）。
     徐州（起馬）＝臥槽馬、掛角馬、馬殺；泗州（飛相：大子要出）＝雙車錯、車殺；淮安（中炮）＝重炮、炮殺、悶宮；揚州（仙人指路）＝小兵擒王。
   獎勵：殘局頁本來就給的修為 5；另外每天每一州第一次不看答案解開，再加修為 15（跟輿圖遊歷一站一樣）。星輝照 07pty 的規則從修為分出去，不另外給。
   漕船標記：開發者 11/22「這船太醜了 找gemini畫圖」→ Gemini 出 1 張（xiangqi-db/tools/art_canal.json，參考長卷上原有的帆船；綠幕去背；原檔 xiangqi-db/art/canal/barge.webp，build-site 複製成 data/canal/barge.webp，跟門內圖一樣只放 CDN、不進 GitHub，發布時照 P0-IMG 確認）；讀不到才退回程式畫的 SVG。
   存檔 jhCanal（跟旅程走，05b-save.js JOURNEY_KEYS 的 m_jhCanal）＝{d:日, s:{派:{t,p}}, pick:{"日/派":題號}}；換日就清掉前一天的。 */
/* 停靠點＝長卷原圖（data/yunhe/pano.webp，3024×1340）的水面：用顏色找各派附近半徑 30 像素內大多是藍灰水面的點，再畫在圖上逐一看過（11/22） */
const JH_CANAL=[
  {sid:"horse",zh:"徐州",en:"Xuzhou",at:[200,720],th:["臥槽馬","掛角馬","馬殺"]},
  {sid:"elephant",zh:"泗州",en:"Sizhou",at:[528,712],th:["雙車錯","車殺"]},
  {sid:"central",zh:"淮安",en:"Huai'an",at:[900,552],th:["重炮","炮殺","悶宮"]},
  {sid:"pawn",zh:"揚州",en:"Yangzhou",at:[1580,650],th:["小兵擒王"]}];
const JH_CANAL_XP=15;
/* 時辰：子時 23～1 點＝0、丑時 1～3 點＝1 …；漕船停的州＝時辰 % 4 */
const jhShichen=d=>Math.floor(((d.getHours()+1)%24)/2);
function jhCanalStop(d){return JH_CANAL[jhShichen(d||new Date())%JH_CANAL.length]}
const jhCanalOf=sid=>JH_CANAL.find(x=>x.sid===sid)||null;
const jhCanalDay=t=>typeof cjDay==="function"?cjDay(t):new Date(t==null?Date.now():t).toISOString().slice(0,10);
/* 這一州的題庫：殺棋、一～三步殺、帶這一州的殺法標籤；照題號排好（挑題要穩定） */
function jhCanalPool(items,st){return(items||[]).filter(x=>x&&x.n>=1&&x.n<=3&&Array.isArray(x.th)&&x.th.includes("殺棋")&&x.th.some(t=>st.th.includes(t))).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0)}
function jhCanalPick(items,st,day){const L=jhCanalPool(items,st);if(!L.length)return null;const h=typeof jhWindHash==="function"?jhWindHash("canal:"+day+":"+st.sid):0;return L[h%L.length]}
function jhCanalGet(day){let o=null;try{o=store.get("jhCanal",null)}catch(e){}const R={d:day,s:{},pick:{}};if(!o||o.d!==day||typeof o!=="object")return R;
  for(const st of JH_CANAL){const x=o.s&&o.s[st.sid];if(x&&typeof x==="object")R.s[st.sid]={t:Math.max(0,+x.t||0),p:x.p?1:0};const k=day+"/"+st.sid,q=o.pick&&o.pick[k];if(typeof q==="string"&&q.length<40)R.pick[k]=q}
  return R}
const jhCanalNm=st=>jhL(st.zh,st.en);
/* 點漕船：挑好這一班的題（題庫要先載入），記下來，再開小卡 */
async function jhCanalOpen(){const st=jhCanalStop(),day=jhCanalDay();let D=null;try{D=await cjData()}catch(e){toast(jhL("殘局題庫載入失敗，等一下再試。","Couldn't load the puzzles. Try again shortly."));return}
  const P=jhCanalPick(D.items,st,day);if(!P){toast(jhL("這一班漕船沒有題目。","No puzzle on this boat."));return}
  const S=jhCanalGet(day);S.pick[day+"/"+st.sid]=P.id;store.set("jhCanal",S);jhCanalSheet(st,P,day,S)}
function jhCanalSheet(st,P,day,S){if(typeof sheet!=="function")return;jhCanalCss();const done=S.s[st.sid],sc=jhSch(st.sid),nx=JH_CANAL[(JH_CANAL.indexOf(st)+1)%JH_CANAL.length];
  sheet(jhL("🏮 漕運殘局","🏮 Canal Puzzle"),b=>{b.innerHTML=`<div class="jh-canal-card"><div class="jh-canal-ic">${jhCanalImg()}</div><div>
      <p class="jh-canal-h">${esc(jhL(`漕船擱淺在${st.zh}，${P.n}步內替船老大解開這盤死棋`,`The grain barge is stuck at ${st.en}: break this deadlock in ${P.n} move${P.n>1?"s":""}`))}</p>
      <p class="muted">${esc(jhL(`停在${sc.nm}一帶，題目是${sc.nm}的殺法：${st.th.join("、")}。`,`Docked near the ${sc.nm}; the puzzle uses its mating patterns.`))}</p>
      ${done?`<p class="jh-windnote">${esc(jhL("這一班今天已經解開了，再解只練手。","Already solved today; replay is practice only."))}</p>`:`<p class="muted">${esc(jhL(`不看答案解開，修為多給 ${JH_CANAL_XP}。`,`Solve it without the answer for +${JH_CANAL_XP} XP.`))}</p>`}
      <p class="muted">${esc(jhL(`每個時辰漕船沿運河換一州停靠，下一站：${nx.zh}。`,`Every double-hour the barge moves to another prefecture on the canal. Next stop: ${nx.en}.`))}</p></div></div>
    <div class="jh-actions"><button class="btn" id="jhCanalGo">${esc(jhL("⛵ 登船解題","⛵ Board and solve"))}</button></div>`;
    const g=b.querySelector("#jhCanalGo");if(g)g.onclick=()=>{try{closeSheet()}catch(e){}location.hash="#/canju/cy/"+st.sid+"/"+day+"/"+encodeURIComponent(P.id)}})}
/* 殘局頁的外掛模式（照 07e-garden2 cjXMode 的寫法包一層）：網址的題號要跟這一天這一州挑好的那題一樣 */
function jhCanalXM(sid,day,pid){const st=jhCanalOf(sid),back=()=>"#/jianghu";if(!st)return{err:jhL("找不到這一州的碼頭。","Unknown dock."),back};
  if(day!==jhCanalDay())return{err:jhL("這一班漕船已經開走了，回十州棋館看看船現在停在哪裡。","That barge has sailed. Go back to see where it is now."),back};
  const S=jhCanalGet(day);if(S.pick[day+"/"+sid]!==pid)return{err:jhL("這一題跟今天這一班漕船對不上，回十州棋館點漕船再登船。","This puzzle doesn't match today's barge. Tap the barge on the map again."),back};
  const re=!!S.s[sid];
  return{id:pid,rk:"cjRunCy",back,top:jhL("🏮 漕運殘局","🏮 Canal Puzzle"),icon:"🏮",
    ans:re?jhL("這一班今天已經解開了，看答案不影響。確定？","Already solved today; viewing the answer changes nothing. Sure?"):jhL("看答案這一班就不算解開、沒有額外修為，確定？","Viewing the answer means no extra XP for this barge. Sure?"),
    head:P=>`<b>🏮 ${esc(jhL(`漕船・${st.zh}`,`Barge at ${st.en}`))}</b>・${esc(P.t)}・${typeof cjLv==="function"?cjLv(P.d):""}`,
    mark:o=>jhCanalMark(sid,day,o),done:(xs)=>xs&&xs.first?`<p class="jh-windnote">${esc(jhL(`漕船脫困！修為 +${JH_CANAL_XP}`,`The barge is free! +${JH_CANAL_XP} XP`))}</p>`:"",
    next:back,nextL:()=>jhL("回十州棋館","Back to the Ten Prefectures")}}
function jhCanalMark(sid,day,o){if(day!==jhCanalDay())return{first:false};const S=jhCanalGet(day);if(S.s[sid])return{first:false};
  S.s[sid]={t:Date.now(),p:o&&o.perfect?1:0};store.set("jhCanal",S);
  if(typeof addXP==="function")setTimeout(()=>{try{addXP(JH_CANAL_XP,jhL("漕運殘局","Canal puzzle"),"cy:"+day+":"+sid)}catch(e){}},1600);
  return{first:true}}
try{if(typeof cjXMode==="function"&&!cjXMode.jhCanal){const x0=cjXMode;cjXMode=function(id){const m=/^cy\/(\w+)\/(\d{4}-\d{2}-\d{2})\/(.+)$/.exec(String(id||""));if(m)return jhCanalXM(m[1],m[2],decodeURIComponent(m[3]));return x0.apply(this,arguments)};cjXMode.jhCanal=1}}catch(e){}
const JH_CANAL_IMG="data/canal/barge.webp";
/* 漕船圖：讀不到（還沒上 CDN、離線缺檔）就換成程式畫的 SVG，不留破圖 */
const jhCanalImg=()=>`<img class="jh-canal-img" src="${JH_CANAL_IMG}" alt="" draggable="false" onerror="this.outerHTML=jhCanalSvg()">`;
const jhCanalSvg=()=>`<svg class="jh-canal-svg" viewBox="0 0 48 34" aria-hidden="true"><path d="M3 22h42l-6 8H9z" fill="#6b4425" stroke="#3b2414" stroke-width="1.2"/><rect x="22" y="4" width="2" height="18" fill="#4a2f1a"/><path d="M24 5l12 14H24z" fill="#efe3c6" stroke="#8a6a3a" stroke-width=".8"/><line x1="12" y1="10" x2="12" y2="22" stroke="#4a2f1a" stroke-width="1.2"/><ellipse cx="12" cy="13" rx="4.2" ry="5" fill="#d12a1f" stroke="#7a1410" stroke-width=".8"/><rect x="10.6" y="7.6" width="2.8" height="1.2" fill="#3b2414"/><rect x="10.6" y="17.2" width="2.8" height="1.2" fill="#3b2414"/></svg>`;
/* 長卷：漕船畫在這個時辰停的州的水面上；過了時辰（頁面一直開著）自己移到下一州 */
function jhCanalDeco(v){const map=v&&v.querySelector&&v.querySelector(".jh-map");if(!map||typeof JH_W==="undefined")return;jhCanalCss();
  const st=jhCanalStop(),day=jhCanalDay(),done=!!jhCanalGet(day).s[st.sid];let b=map.querySelector(".jh-canal");
  if(!b){b=document.createElement("button");b.type="button";b.className="jh-canal";b.innerHTML=jhCanalImg();b.onclick=e=>{e.stopPropagation();try{vibrate(5)}catch(e2){}jhCanalOpen()};map.append(b)}
  b.style.left=(st.at[0]/JH_W*100).toFixed(2)+"%";b.style.top=(st.at[1]/JH_H*100).toFixed(2)+"%";b.classList.toggle("done",done);b.dataset.sid=st.sid;
  b.setAttribute("aria-label",jhL(`漕運殘局：漕船停在${st.zh}`,`Canal puzzle: barge at ${st.en}`)+(done?jhL("，今天解開了",", solved today"):""));
  if(!map.dataset.canalT){map.dataset.canalT=1;const t=setInterval(()=>{if(!map.isConnected){clearInterval(t);return}try{jhCanalDeco(v)}catch(e){}},60000)}}
try{if(typeof Jianghu==="function"&&!Jianghu.jhCanal){const j0=Jianghu;Jianghu=function(v){const r=j0.apply(this,arguments);try{jhCanalDeco(v)}catch(e){}return r};Jianghu.jhCanal=1}}catch(e){}
function jhCanalCss(){if(typeof document==="undefined"||document.getElementById("jhCanalCss"))return;const s=document.createElement("style");s.id="jhCanalCss";s.textContent=`
.jh-canal{position:absolute;transform:translate(-50%,-70%);width:66px;height:46px;padding:0;border:0;background:none;cursor:pointer;z-index:3;filter:drop-shadow(0 2px 3px rgba(30,20,10,.45));animation:jhCanalBob 3.2s ease-in-out infinite}
.jh-canal .jh-canal-svg,.jh-canal .jh-canal-img{width:100%;height:100%;display:block;object-fit:contain;-webkit-user-drag:none;user-select:none}
.jh-canal.done{opacity:.6}
@keyframes jhCanalBob{0%,100%{translate:0 0}50%{translate:0 -3px}}
@media (prefers-reduced-motion:reduce){.jh-canal{animation:none}}
.jh-canal-card{display:flex;gap:12px;align-items:flex-start}.jh-canal-ic{flex:none;width:64px}.jh-canal-ic svg,.jh-canal-ic img{width:64px;height:46px;object-fit:contain}
.jh-canal-h{font:800 16px/1.5 var(--serif,serif);margin:0 0 4px}`;document.head.append(s)}
