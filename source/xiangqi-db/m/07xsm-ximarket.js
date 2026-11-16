/* ================= 🏮 西市：首頁橋左邊的生活場景（開發者 11/13；文案照 story/西市文案定稿草案_1113.md，第五節 18 項全照推薦；前綴 xsm／XSM，11/13 grep 過沒撞名：xm 已被 01-board 的混音器用掉）=================
   路由 #/ximarket（西市外景）、#/ximarket/tea（聽雨茶坊內景）、#/ximarket/dark（茶坊的臺灣暗棋，07xsd）（02-shell）。
   入口：首頁橋左邊一個「🏮 西市」場景標籤（#hmXsm；跟 07gxt 觀星臺一樣包 07z 的 Home／hmwSet，不改 HM_SPOTS、不動 07y；原圖、iPad 直版 p34、橫版 l1610 各一組座標 XSM_HOME，避開左岸告示牌）。
     只在千秋時光之苑（經典世界 hbIsCl）出現（第 1 項 A）；領過七星授印禮（07mnq 存檔 "mnq".gift.a1）才出現（第 2 項 B）；開發者模式一律看得到。網址直接進、還沒解鎖＝回首頁。
     第一次進來以前首頁標籤是 .hot（第 17 項；之後「有禮可領、有人來訪」也要亮，等那兩個玩法做好再接，不加紅點數字）。
   場景圖 data/ximarket/（park/ximarket 轉來，process_art.py MAPS["ximarket"]）：外景白天 xm_day、夜景 xm_night（768×1376，器物位置相同，座標共用）；茶坊內景 xm_tea。只有直幅。
     日夜照人間時辰（07w8 clkIdx，頂欄時辰鐘同一個判斷）：卯時～申時白天，酉時～寅時夜景（第 3 項 A）；頁面開著跨過時辰會自己換；一張載不到就換另一張（XSM_BAD）。
     茶坊窗外固定下雨（第 18 項 A，程式畫的雨；減少動態時不動）；茶坊只有一張圖，夜裡蓋一層暗藍（日夜跟著西市換）。
   標籤只放大字、不放圖示（第 5 項 A：寫玩法名）：領禮物＝櫃坊、七星來訪＝老槐樹下、找棋子＝棋具攤、暗棋＝聽雨茶坊、聽曲＝樂棚（第 10 項 A）。
     這一版只做場景頁：「暗棋」這一攤可以進茶坊看內景；其他攤灰色帶鎖，點了跳「還沒開張，敬請期待。」（第 12 項 A）。
     11/14 開發者：茶坊中間的暗棋桌第一個開張，點了到 #/ximarket/dark 玩臺灣暗棋（07xsd-xsmdark.js，對電腦）。
   第一次進來跳介紹卡（定位句＋介紹，第一節）。出口照 07w9 圖上出口：外景＝市門「🏘 回棋鎮」，茶坊＝「↩ 回西市」（07w9 EXITS）。
   走路角色：外景接 07w shwPage（座標表 XSM_WALK，量 park/ximarket/xm_day.png）；茶坊內景不放走路角色。
   存檔鍵 xsmSeen（05b JOURNEY_KEYS）。平日體力 07dgl：#/ximarket 不在星槎、也不在「不算」那組，照預設算人間。
   純計算 xsmGot／xsmDay／xsmPickDay／xsmSrc／xsmSpots 不碰 DOM，測試 xiangqi-lab/tools/test-ximarket.js 用 vm 跑。
   還沒做：考究說明卡（出處待史學顧問核）。
   11/16 開發者：其他四攤開張（文案照定稿草案第一節第 5、6 項；第五節第 7、8、9、17 項照推薦），標籤不再帶鎖：
     領禮物（雲河櫃坊）：列出 07mnq 的大禮包——還沒領的（授印禮、破局錦囊、停靠過的每一朝的遠征補給）點了就領（mnqGift 儀式，發的東西照 07mnq），領過的點了再看一次。不另外發新東西、不加新貨幣。
     七星來訪（老槐樹下）：每天保證有一位，只挑已加入的夥伴（07pty ptyHas），不挑陪在身邊的那位（首頁小人 myChar，跟 07j 一樣）；同一天固定同一位（存 xsmStall.v）。
       說一句西市招呼（XSM_V7，主句／備用照日期輪；雷借花主句分日夜）；他手上有 07j 的請託就接 07j 的任務卡（v7Sheet，謝禮照 07j 15 修為），沒有就送一份小禮（每天一次 +10 修為）。
       見到了也記進 07j 的 visit7（算進每天 3 位、來過幾次）。只有自己一個人（還沒有別的夥伴）＝「今天很清靜」。
     找棋子（棋具攤）：每天 1 顆，七顆一副（俥傌帥仕相兵炮，照 07pty 加入順序）；藏點每天從 XSM_HIDE 13 處挑一處（照日期算，同一天同一處、跟前一天不同）；
       外景圖上畫一顆小棋子，點到它 28px 內就算找到（07q bdNear 的做法，量的是畫面上的 px）；+10 修為，湊齊七顆再 +50 修為和一次蓋印。修為紀錄用 xsmf:<日期>、xsmf7:<第幾副> 當鍵，同一顆不會給兩次。
     聽曲（西市樂棚）：停靠過的朝代（shipDockList＋青石園），那一朝 7 首全收（data/bgm/index.json）；點了用 01-board 的背景音樂播（bgmForce「朝代/檔名」），再點一下停＝換回西市的背景配樂。
     西市背景配樂（第 13 項的「西市燈影」「聽雨暗棋」還沒有檔，先借三首；茶坊、暗棋同一組）：白天＝漢 han/paixiao_6（排簫）、唐 tang/pipa_1（琵琶）輪流（漢唐長安的西市）；
       夜裡＝宋 song/qin_3（古琴）、唐 tang/pipa_1 輪流（說明卡寫的「借宋代夜市和唐代上元燈會」）。離開 #/ximarket 就還給朝代配樂（bgmForce(null)）；背景音樂關著就不放。
     首頁「🏮 西市」、外景的「領禮物」「七星來訪」：有禮可領、有人來訪還沒見到時發亮（.hot，第 17 項 A，不加數字）。存檔鍵 xsmStall（05b JOURNEY_KEYS）。 */
const XSM_ON=true,XSM_IMGV="1113";   /* 圖的版本：同檔名換圖時改掉，手機才會重抓 */
const XSM_OFF="還沒開張，敬請期待。";
const XSM_TX={pos:"各朝的貨色，都在這裡湊成一市。",intro:"西市，原本是城西那座市集的名字。漢朝、唐朝的長安城都有。千秋時光之苑不屬於任何朝代，各朝的貨色就都擺到這裡來了。"};
/* [id, 大字, 左%, 上%, 還沒開張？]（量 xm_day 768×1376；標籤放在攤位上方，不擋主體） */
const XSM_SPOTS=[
  ["xsmGift","領禮物",17,39,0],   /* 左邊櫃坊：櫃台上的布簾（11/16 開張） */
  ["xsmMusic","聽曲",64,47.5,0],   /* 樂棚：掛琵琶、拍板的木架上方（11/16 開張） */
  ["xsmTea","暗棋",86,44,0],   /* 右邊聽雨茶坊：竹簾 */
  ["xsmChess","找棋子",38,61,0],   /* 左下棋具攤：棋盒、棋子袋那張桌子上方的簷下（11/16 開張） */
  ["xsmVisit","七星來訪",81,74,0]];   /* 市門右邊的老槐樹：樹下石墩、木凳上方（11/16 開張） */
const XSM_TEA_SPOTS=[["xsmDark","暗棋",50,44,0]];   /* 茶坊中間那張暗棋桌（量 xm_tea 768×1376）；11/14 開張：點了開一盤臺灣暗棋（07xsd-xsmdark.js） */
const XSM_HOME={"":[16,59],p34:[16,60],l1610:[19,71]};   /* 首頁橋左邊（跟觀星臺 GXT_HOME 左右對稱，再往下挪開左岸告示牌；原圖量 home_classic 768×1376，p34 量 1536×2048，l1610 量 2560×1600） */
const XSM_RAIN=[[53,12,60,31],[69.5,14,82,36]];   /* 茶坊窗外看得到雨的兩塊（左、上、右、下 %） */
const XSM_BAD={};   /* 這次開 App 載不到的圖（d＝白天、n＝夜景），換另一張不再試 */
/* ---------- 11/16 四攤的資料 ---------- */
Object.assign(XSM_TX,{
  gift:"櫃坊，是古時替人寄放財物的店。旅途中送到的禮，都先收在這裡，想看、想領，隨時可以來。",g1:"{你}的禮，櫃上都收好了，一樣不少。",g0:"禮都領了。下回有新的，再來櫃上看看。",
  v1:"老槐樹下有人停下腳步，像是在等{你}。",v0:"老槐樹下今天很清靜，還沒有人來。",vGot:"今天的小禮收下了。",
  c0:"攤上的棋子散了一地。七種棋子各少一顆，藏在西市的角落裡，幫攤主找回來吧。",c1:"哎呀，少了好幾顆！少一顆，這副棋就下不成了。",c2:"找到了，就是這顆。",c3:"一副棋，一顆都不能少。多謝{你}。",cDone:"今天這顆找到了，明天再來幫我看看。",
  mu:"旅途中聽過的曲子，都收在這裡。想再聽一遍，就來樂棚坐坐。",mu2:"唐朝有一年長安大旱，東市、西市搭樓比賽彈奏求雨。東市請來第一名的琵琶手，西市樓上卻有人彈得更好。",
  muMore:"星槎停靠新的朝代，那一朝的曲子就會收進樂棚。",muOff:"背景音樂關著：到設定 → 聲音打開，才聽得到。"});
/* 七星到西市的招呼（定稿草案第一節第 6 項）：[主句, 備用]；雷借花主句分 [夜, 白天]。{名}、{你} 照 07j v7Txt 換 */
const XSM_V7={x_swordboy:["這裡的街橫平豎直，像車轍。好走。","字我認不多。{名}，這價錢，{你}幫我看。"],
  x_miaogirl:["前頭擠？那我從旁邊繞過去，一樣到！","嘿嘿，我聞到燒餅香了！{名}，走嘛！"],
  x_shuai:["{名}，勞{你}稍候。這攤的秤，我想多看一眼。","難得這樣逛市集。原來市集的聲音，這麼熱鬧。"],
  x_shi:["人多。{你}走前頭，我在後面。","方庭在看秤。……沒事。"],
  x_spiritgirl:["人多，{名}，走近些，別走散了。","我想買些鹽，家裡的罐子快空了。"],
  x_bing:["問價、跑腿，我最快！{名}，要問哪一攤？","我不賭錢。翻暗棋就翻暗棋，誰輸了，再來一局！"],
  x_martialgirl:[["{名}！這邊這邊！好多燈，跟臨安的夜市一樣亮！","{名}！這邊攤子好多，我一攤都不想漏！"],"那聲鼓……不是打雷吧？不是就好！"]};
const XSM_VISIT_XP=10,XSM_FIND_XP=10,XSM_SET_XP=50,XSM_TOL=28;   /* 修為：小禮、找到一顆、湊齊一副（照 07j 請託 15、07q 找東西的量級）；點到藏點幾 px 內算找到 */
const XSM_PCS=["俥","傌","帥","仕","相","兵","炮"];   /* 一副七顆，照 07pty 加入順序（俥齊轍、傌駱躍梅、帥沈方庭、仕鐵連城、相田飛燕、兵步越溪、炮雷借花） */
/* 找棋子的藏點 [左%, 上%]（量 park/ximarket/xm_day.png 768×1376，日夜同位置；離五個攤位標籤、出口、市門都遠一點） */
const XSM_HIDE=[[10,20.5],   /* 池邊柳樹根 */
  [26,19.5],   /* 池裡的蘆葦邊 */
  [54,39.8],   /* 中間鋪子桌上的木箱旁 */
  [71,38.5],   /* 市樓的木柱腳 */
  [4.5,53],   /* 櫃坊旁的盆栽 */
  [77.5,56.5],   /* 茶坊門口的石階 */
  [66,58.5],   /* 樂棚木架的腳 */
  [27.5,69],   /* 棋具攤的小鼓凳 */
  [52.5,71],   /* 側放的木棋盤 */
  [15.5,79.5],   /* 棋具攤前的石階 */
  [34,87.5],   /* 夯土牆邊的矮樹叢 */
  [68,82],   /* 市門裡的木桶 */
  [92,91.5]];   /* 老槐樹下的石墩 */
/* 西市背景配樂（借三首；白天漢唐、夜裡宋夜市＋唐上元燈會，見最上面說明）。同一個陣列物件傳給 bgmForce，才認得出是西市放的 */
const XSM_BGM_D=["han/paixiao_6.mp3","tang/pipa_1.mp3"],XSM_BGM_N=["song/qin_3.mp3","tang/pipa_1.mp3"];
const XSM_MU={f:null};   /* 樂棚正在放的那首（朝代/檔名）；null＝放西市背景配樂 */
const XSM_INS={zheng:"古箏",bianzhong:"編鐘",paixiao:"排簫",xun:"塤",ruan:"阮",konghou:"箜篌",dizi:"笛子",pipa:"琵琶",xiao:"洞簫",qin:"古琴",morinkhuur:"馬頭琴",sanxian:"三弦",erhu:"二胡"};   /* 同 01-board bgmNow */
const XSM_ERAS=["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];   /* 沒有 shipOrder 時的朝代順序 */
/* ---------- 走路角色（外景）：N＝腳踩的青石路面，E＝走的路（避開櫃坊、中間鋪子、左下棋具攤的屋子和桌子、樂棚木架、茶坊、市門兩根柱子的腳、木桶、老槐樹、石墩木凳）。
   home＝市門裡面；市門外的石板路通到老槐樹下（七星來訪）。身高照茶坊門高約圖高 14% 換算 ---------- */
const XSM_WALK={W:768,H:1376,el:38,home:"home",look0:[50,95],h:[.09,60,.0006],
  N:{home:[52,80],c1:[55,72.5],chess:[42,76],cross:[55,61],n1:[56,52],counter:[40,49.2],music:[64,63],tea:[75,59.5],gate:[64,86.5],g2:[69,92.5],tree:[79,90.5]},
  E:"home-chess home-c1 c1-cross cross-n1 n1-counter cross-music music-tea home-gate gate-g2 g2-tree",
  HS:{xsmGift:["counter",18,45,"bow"],xsmChess:["chess",36,66,"bow"],xsmMusic:["music",65,54,"wave"],xsmTea:["tea",86,47,"bow"],xsmVisit:["tree",88,80,"wave"],xsmExit:["gate",72,97,"wave"]}};
const xsmWalkCfg=()=>Object.assign({},typeof SHW_PG0!=="undefined"?SHW_PG0:{},XSM_WALK);
/* ---------- 純計算 ---------- */
/* 解鎖：領過七星授印禮（M＝07mnq 的存檔 "mnq"） */
const xsmGot=M=>!!(M&&typeof M==="object"&&M.gift&&typeof M.gift==="object"&&M.gift.a1);
function xsmOpen(){if(!XSM_ON)return false;   /* 11/16 選單「場景入口照玩家進度」：全部解鎖試玩也不打開西市入口 */
  /* 11/16 hspx P1 選單「打贏星門圍城才開」：跟觀星臺同一個條件（07gxt gxtWon：這一趟旅程的星門圍城或舊塔防贏過）；原本收下七星授印禮就開，新旅程一降落很快就拿到。xsmGot 留著不用 */
  try{return typeof gxtWon==="function"&&gxtWon(0,typeof bhtdProg==="function"?bhtdProg():store.get("bhtd",null),store.get("gsv",null))}catch(e){return false}}
/* 白天？卯（05–07）～申（15–17）；時辰序號照 07w8 clkIdx（子＝0：23–01） */
function xsmDay(d){d=d||new Date();let i;try{i=typeof clkIdx==="function"?clkIdx(d):NaN}catch(e){i=NaN}if(!(i>=0))i=Math.floor(((d.getHours()+1)%24)/2);return i>=3&&i<=8}
/* 想要白天／夜景 → 實際用哪一張（那張載不到就換另一張；兩張都壞就照原本那張） */
const xsmPickDay=day=>day?!XSM_BAD.d:(!!XSM_BAD.n&&!XSM_BAD.d);
const xsmSrc=(day,tea)=>tea?`data/ximarket/xm_tea.webp?v=${XSM_IMGV}`:`data/ximarket/xm_${xsmPickDay(day)?"day":"night"}.webp?v=${XSM_IMGV}`;
/* 標籤 [id,左,上,大字,還沒開張] */
const xsmSpots=L=>(L||XSM_SPOTS).map(s=>[s[0],s[2],s[3],s[1],!!s[4]]);
/* ---------- 11/16 四攤的純計算（不碰 DOM；test-xsm-stalls-1116.js 用 vm 跑） ---------- */
/* 字串雜湊（FNV-1a）：照日期挑人、挑藏點、挑句子，同一天算出來都一樣 */
function xsmHash(s){let h=2166136261;s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
/* 前一天（"YYYY-MM-DD"） */
function xsmPrevDay(day){const m=/^(\d+)-(\d+)-(\d+)$/.exec(String(day||""));if(!m)return"";const d=new Date(+m[1],+m[2]-1,+m[3]-1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
/* 這一天藏在哪一處（XSM_HIDE 的序號）：照日期算；跟前一天同一處就往下挪一格 */
function xsmHideIdx(day){const n=XSM_HIDE.length,raw=d=>xsmHash("hide"+d)%n,i=raw(day),p=xsmPrevDay(day);return p&&raw(p)===i?(i+1)%n:i}
const xsmHideOf=day=>XSM_HIDE[xsmHideIdx(day)];
/* 點到的位置 p（圖上 %）離藏點 s（%）在 tol px 以內？w、h＝圖在畫面上的寬高（px） */
const xsmNear=(s,p,w,h,tol)=>!!(s&&p)&&Math.hypot((p[0]-s[0])*w/100,(p[1]-s[1])*h/100)<=(tol==null?XSM_TOL:tol);
/* 找棋子的進度：n＝這一副找到幾顆、sets＝湊齊幾副、day＝最後一次找到的日期、tot＝總共找到幾顆 */
const xsmFindNorm=F=>{F=F&&typeof F==="object"?F:{};return{n:Math.max(0,Math.min(6,F.n|0)),sets:Math.max(0,F.sets|0),day:typeof F.day==="string"?F.day:"",tot:Math.max(0,F.tot|0)}};
const xsmPieceOf=F=>XSM_PCS[xsmFindNorm(F).n];
/* 這一天找到一顆：同一天找過＝null（不再給）；回 {F 新進度, pc 找到哪顆, full 湊齊了沒, xp 這次總共給多少} */
function xsmFindGo(F,day){F=xsmFindNorm(F);if(!day||F.day===day)return null;const pc=XSM_PCS[F.n],n=F.n+1,full=n>=XSM_PCS.length;
  return{F:{n:full?0:n,sets:F.sets+(full?1:0),day,tot:F.tot+1},pc,full,xp:XSM_FIND_XP+(full?XSM_SET_XP:0)}}
/* 今天誰來老槐樹下：mem＝已加入的夥伴、look＝陪在身邊的那位（不來）；prev＝存檔裡今天已經挑好的 {d,c}（還在名單裡就照舊，同一天不換人） */
function xsmVisitPick(day,mem,look,prev){const L=(mem||[]).filter(c=>c!==look&&XSM_V7[c]);if(!L.length)return null;
  if(prev&&prev.d===day&&L.includes(prev.c))return prev.c;return L[xsmHash("visit"+day)%L.length]}
/* 招呼哪一句：照日期在主句、備用之間輪；雷借花主句分日夜 */
function xsmVisitLine(c,day,isDay){const A=XSM_V7[c];if(!A)return"";let s=A[xsmHash(c+day)%2];if(Array.isArray(s))s=s[isDay?1:0];return s}
/* 樂棚收了哪幾朝：O＝航線順序、D＝停靠過的站（shipDockList；沒有旅程＝null）；青石園一開始就在 */
const xsmMuEras=(O,D)=>(O||XSM_ERAS).filter((e,i,a)=>a.indexOf(e)===i&&(e==="classic"||(Array.isArray(D)&&D.includes(e))));
/* 樂棚的曲目：IX＝data/bgm/index.json；每朝 7 首全收 → ["朝代/檔名"] */
const xsmMuList=(eras,IX)=>(eras||[]).flatMap(e=>((IX||{})[e]||[]).map(f=>e+"/"+f));
/* 櫃坊的禮：S＝07mnq 存檔、E＝mnqEnv()、D＝停靠過的站。還沒領的排前面；授印禮要有角色、破局錦囊要贏過，遠征補給是停靠過的每一朝（青石園沒有） */
function xsmGifts(S,E,D){S=S||{};E=E||{};const G=S.gift||{},A6=G.a6||{},o=[];
  if(G.a1||E.hasChar)o.push({k:"a1",got:!!G.a1});if(G.a2||E.firstWin)o.push({k:"a2",got:!!G.a2});
  const eras=(Array.isArray(D)?D:[]).filter(e=>e!=="classic");for(const e of Object.keys(A6))if(A6[e]&&!eras.includes(e))eras.push(e);
  for(const e of eras)o.push({k:"a6",era:e,got:!!A6[e]});
  return o.filter(g=>!g.got).concat(o.filter(g=>g.got))}
/* ---------- 畫面 ---------- */
function xsmCss(){if(document.getElementById("xsmCss"))return;const s=document.createElement("style");s.id="xsmCss";s.textContent=`
.xsm-page{margin:0 0 6px}.xsm-page .shp-spot{max-width:46%;padding:4px 11px;z-index:3}.xsm-page .shp-spot b{white-space:nowrap;font-size:15px;letter-spacing:.06em}
.xsm-page .shp-spot.lock{border-color:#8a8476;background:rgba(28,26,30,.68);box-shadow:none}.xsm-page .shp-spot.lock b{color:#c9c2b2;font-size:14px}
.xsm-tea .xsm-rain{position:absolute;z-index:1;pointer-events:none;overflow:hidden;opacity:.6;background-image:repeating-linear-gradient(100deg,rgba(255,255,255,0) 0 9px,rgba(232,240,250,.6) 9px 10px,rgba(255,255,255,0) 10px 23px);background-size:46px 58px;animation:xsmRain .55s linear infinite}
@keyframes xsmRain{to{background-position:-10px 58px}}
.xsm-tea::after{content:"";position:absolute;inset:0;z-index:1;pointer-events:none;background:rgba(16,24,58,.4);mix-blend-mode:multiply;opacity:0;transition:opacity .6s}.xsm-tea[data-day=""]::after{opacity:1}
@media (prefers-reduced-motion:reduce){.xsm-tea .xsm-rain{animation:none}}
.xsm-pc{position:absolute;z-index:2;width:22px;height:22px;margin:-11px 0 0 -11px;box-sizing:border-box;border-radius:50%;background:radial-gradient(circle at 40% 35%,#f6e7c4,#d4b072);border:1.5px solid #7a4a1f;color:#a3271d;font:900 13px/19px var(--serif,serif);text-align:center;pointer-events:none;opacity:.85;transform:rotate(-14deg);box-shadow:0 1px 2px rgba(0,0,0,.4)}
.xsm-pc.glow{animation:xsmGlow 1s ease-in-out 3}.xsm-pc.got{animation:xsmGot .9s ease-out forwards}
@keyframes xsmGlow{50%{opacity:1;box-shadow:0 0 0 6px rgba(242,201,76,.75),0 0 16px rgba(242,201,76,.95)}}@keyframes xsmGot{to{opacity:0;transform:translateY(-26px) scale(1.7)}}
.xsm-ban{position:absolute;left:8px;right:8px;top:8px;z-index:6;display:flex;align-items:center;gap:8px;padding:6px 8px 6px 12px;border-radius:12px;background:rgba(28,22,16,.84);color:#fff3d6;font:700 15px/1.4 var(--serif,serif);box-shadow:0 3px 10px rgba(0,0,0,.3)}
.xsm-ban b{flex:1;min-width:0}.xsm-ban button{flex:none;min-height:36px;padding:0 10px;border-radius:99px;border:1px solid rgba(232,199,122,.6);background:rgba(0,0,0,.3);color:#f2e4c4;font:700 14px var(--sans,sans-serif)}
.xsm-nar{margin:0 0 8px;color:var(--muted);font:15px/1.75 var(--serif,serif)}.xsm-say{margin:0 0 10px;font:16px/1.8 var(--serif,serif)}
.xsm-v{display:flex;gap:12px;align-items:center;margin:4px 0 8px}.xsm-v img{width:84px;height:112px;object-fit:contain;flex:none}.xsm-v .xsm-say{margin:0}
#sheet .xsm-v~.btn,#sheet .xsm-say~.btn{width:100%;margin-top:8px}
.xsm-li{display:flex;align-items:center;gap:10px;width:100%;min-height:50px;padding:8px 12px;margin:0 0 8px;border-radius:12px;border:1px solid rgba(138,90,43,.35);background:rgba(246,238,220,.55);color:inherit;font:700 17px/1.3 var(--serif,serif);text-align:left;cursor:pointer}
.xsm-li span{font-size:20px;flex:none}.xsm-li b{flex:1;min-width:0}.xsm-li em{flex:none;font:700 14px var(--sans,sans-serif);font-style:normal;color:#8a5a2b}.xsm-li.new{border:1.5px solid #B5452B}.xsm-li.new em{color:#B5452B}
.xsm-row{display:flex;gap:6px;justify-content:center;margin:10px 0}.xsm-row span{width:36px;height:36px;box-sizing:border-box;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 18px var(--serif,serif);border:2px dashed #b9a684;color:#b9a684}
.xsm-row span.on{border:2px solid #7a4a1f;background:#f3e2bd;color:#a3271d}
.xsm-mu{display:flex;align-items:center;gap:8px;width:100%;min-height:46px;padding:6px 12px;margin:0 0 6px;border-radius:12px;border:1px solid rgba(138,90,43,.3);background:rgba(246,238,220,.5);font:700 17px var(--serif,serif);color:inherit;text-align:left;cursor:pointer}
.xsm-mu b{flex:1;min-width:0;font-weight:700}.xsm-mu small{flex:none;font:13px var(--sans,sans-serif);color:var(--muted)}.xsm-mu.on{border:1.5px solid #B5452B;background:rgba(242,201,76,.18)}
.xsm-seal{width:104px;height:104px;margin:4px auto 12px;box-sizing:border-box;border:6px solid #c0392b;border-radius:12px;background:rgba(246,236,214,.9);color:#b3261e;display:flex;align-items:center;justify-content:center;font:900 58px/1 var(--serif,serif);transform:rotate(-6deg)}
@media (prefers-reduced-motion:reduce){.xsm-pc.glow{animation:none;opacity:1;box-shadow:0 0 0 6px rgba(242,201,76,.75)}.xsm-pc.got{animation:none;opacity:0}}`;document.head.append(s)}
/* 標籤按鈕（旁白、Tab 順序＝由上到下、同一列由左到右：07z hmFocusOrder） */
function xsmBtns(L){const S=xsmSpots(L),O=typeof hmFocusOrder==="function"?hmFocusOrder(S):S;
  return O.map(([id,x,y,t,off])=>`<button type="button" class="shp-spot${off?" lock":""}" id="${id}" style="left:${x}%;top:${y}%" aria-label="${esc(t+(off?"，還沒開張":""))}"><b>${off?"🔒 ":""}${esc(t)}</b></button>`).join("")}
const XSM_ACT={xsmTea:()=>{location.hash="#/ximarket/tea"},xsmDark:()=>{location.hash="#/ximarket/dark"},
  xsmGift:()=>xsmGiftSheet(),xsmMusic:()=>xsmMusicSheet(),xsmChess:()=>xsmChessSheet(),xsmVisit:()=>xsmVisitSheet()};   /* 11/16 四攤開張 */
function xsmBind(P,L){for(const s of L){const b=P.querySelector("#"+s[0]);if(!b)continue;b.onclick=e=>{e.stopPropagation();vibrate(5);if(s[4]){toast("🏮 "+XSM_OFF);return}const f=XSM_ACT[s[0]];if(f)f()}}}
/* 圖載好以後：07t3 補滿高度、07sp 標籤推回畫面內、R07 點選範圍；兩指縮放 */
function xsmAfter(v,P){const im=P.querySelector(":scope>img");
  im.addEventListener("load",()=>{if(!P.isConnected)return;try{if(typeof ttFill==="function")ttFill()}catch(e){}try{if(typeof spfSoon==="function")spfSoon(0)}catch(e){}try{if(typeof r07HitSoon==="function")r07HitSoon()}catch(e){}});
  if(typeof shpFit==="function")shpFit(v);try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
/* 換日夜：先載好再換；載不到記下來（下次 xsmSrc 自己換另一張） */
function xsmSwap(P,day){const im=P.querySelector(":scope>img");if(!im)return;const nd=xsmPickDay(day),src=xsmSrc(nd);if(im.getAttribute("src")===src)return;
  const pre=new Image();pre.onload=()=>{if(!P.isConnected)return;P.dataset.day=nd?"1":"";im.src=src};pre.onerror=()=>{XSM_BAD[nd?"d":"n"]=1};pre.src=src}
function xsmIntro(){modal(`<h3>🏮 西市</h3><p><b>${esc(XSM_TX.pos)}</b></p><p>${esc(XSM_TX.intro)}</p>`,[["逛逛西市",null]])}
function xsmWalk(v){if(typeof shwPage!=="function"||typeof SHIP_WALK_ON==="undefined"||!SHIP_WALK_ON)return;try{shwPage(v,xsmWalkCfg(),"xsm")}catch(e){}}
function XsmPage(v,sub){try{if(xsmOpen())xsmBgmOn()}catch(e){}   /* 11/16 西市背景配樂（外景、茶坊、暗棋都是這一組） */
  if(sub==="tea")return xsmTea(v);if(sub==="dark"&&typeof xsdPage==="function")return xsdPage(v);
  setTop("🏮 西市","#/");setTabs(true,"#/");v.className="view";
  if(!xsmOpen()){toast("🏮 西市還沒開市");navReplace("#/");return{}}
  xsmCss();let first=false;try{first=!store.get("xsmSeen",0);store.set("xsmSeen",1)}catch(e){}
  const day=xsmDay(),nd=xsmPickDay(day),P=document.createElement("div");P.className="shp-page cq xsm-page";P.dataset.day=nd?"1":"";
  P.innerHTML=`<img src="${xsmSrc(nd)}" alt="西市：市門、夯土市牆、青石路，十字路口四角是櫃坊、棋具攤、樂棚和茶坊，遠處有市樓、水池和柳樹">`+xsmBtns(XSM_SPOTS);
  v.append(P);xsmBind(P,XSM_SPOTS);
  try{xsmMark(P)}catch(e){}try{xsmHuntInit(v,P)}catch(e){}   /* 11/16：有禮、有人來的標籤發亮；今天那顆棋子藏到圖上 */
  const im=P.querySelector(":scope>img");
  im.onerror=()=>{const sh=P.dataset.day==="1";XSM_BAD[sh?"d":"n"]=1;const n2=xsmPickDay(sh);if(n2!==sh){P.dataset.day=n2?"1":"";im.src=xsmSrc(n2)}};
  /* 07w9 的出口晚一點才放進來：補 id（走路角色的入口代號 HS.xsmExit） */
  try{const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();return}const s=P.querySelector(".ex-spot");if(s&&!s.id)s.id="xsmExit"});mo.observe(P,{childList:true})}catch(e){}
  /* 每分鐘看一次時辰，跨過卯時、酉時就換日夜 */
  {const tm=setInterval(()=>{if(!P.isConnected){clearInterval(tm);return}const d=xsmPickDay(xsmDay());if(d!==(P.dataset.day==="1"))xsmSwap(P,d);
    try{const w=xsmDay()?XSM_BGM_D:XSM_BGM_N;if(typeof BGM!=="undefined"&&(BGM.force===XSM_BGM_D||BGM.force===XSM_BGM_N)&&BGM.force!==w)bgmForce(w)}catch(e){}},60000)}   /* 11/16 配樂也跟著換日夜（樂棚正在放的不動） */
  xsmAfter(v,P);
  xsmWalk(v);   /* 走路角色（3D 載不到、減少動態時 07w 不攔點選，入口照舊直接開） */
  if(first)setTimeout(()=>{if(P.isConnected)xsmIntro()},450);
  return{}}
function xsmTea(v){setTop("🍵 聽雨茶坊","#/ximarket");setTabs(true,"#/");v.className="view";
  if(!xsmOpen()){toast("🏮 西市還沒開市");navReplace("#/");return{}}
  xsmCss();const P=document.createElement("div");P.className="shp-page cq xsm-page xsm-tea";P.dataset.day=xsmDay()?"1":"";
  P.innerHTML=`<img src="${xsmSrc(false,1)}" alt="聽雨茶坊：方桌、條凳、靠背椅，窗外下著雨，中間一張暗棋桌">`+
    XSM_RAIN.map(r=>`<i class="xsm-rain" style="left:${r[0]}%;top:${r[1]}%;width:${r[2]-r[0]}%;height:${r[3]-r[1]}%"></i>`).join("")+xsmBtns(XSM_TEA_SPOTS);
  v.append(P);xsmBind(P,XSM_TEA_SPOTS);
  {const tm=setInterval(()=>{if(!P.isConnected){clearInterval(tm);return}const d=xsmDay()?"1":"";if(d!==P.dataset.day)P.dataset.day=d},60000)}
  xsmAfter(v,P);
  return{}}
/* ---------- 11/16 四攤：存檔 ---------- */
/* xsmStall＝{f:找棋子進度（xsmFindNorm）, v:{d 哪天, c 那天誰來, met 哪天見過, gift 哪天收過小禮}} */
function xsmSt(){let S=null;try{S=store.get("xsmStall",null)}catch(e){}S=S&&typeof S==="object"?S:{};S.f=xsmFindNorm(S.f);if(!S.v||typeof S.v!=="object")S.v={};return S}
const xsmSave=S=>{try{store.set("xsmStall",S)}catch(e){}};
function xsmToday(){if(typeof localDay==="function")return localDay();const d=new Date();return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")}
/* {名}、{你}：有 07j 就照它（怎麼叫玩家、玩家是女生換「妳」） */
function xsmYou(s,c){try{if(typeof v7Txt==="function")return v7Txt(s,c||"")}catch(e){}return String(s).replace(/\{名\}/g,"").replace(/\{你\}/g,"你")}
/* 今天誰來（只挑已加入的：07pty ptyHas；沒有 07pty、沒有旅程＝沒人）；挑好就記下來，同一天不換人 */
function xsmVisitWho(){if(typeof ptyHas!=="function")return null;const O=typeof PTY!=="undefined"&&PTY.ORDER?PTY.ORDER:Object.keys(XSM_V7);
  const mem=O.filter(c=>{try{return!!ptyHas(c)}catch(e){return false}});let look="";try{look=(typeof myChar==="function"&&myChar())||(typeof ptyLook==="function"&&ptyLook())||""}catch(e){}
  const day=xsmToday(),S=xsmSt(),c=xsmVisitPick(day,mem,look,S.v);if(c&&(S.v.d!==day||S.v.c!==c)){S.v.d=day;S.v.c=c;xsmSave(S)}return c}
/* 見到了：記今天見過；也記進 07j 的 visit7（來過幾次＋1、今天來過＝算進每天 3 位；07j 今天已經帶他來過就不重算） */
function xsmVisitMet(c,day){const S=xsmSt();if(S.v.met===day)return;S.v.met=day;xsmSave(S);
  try{const V=typeof v7St==="function"?v7St():(store.get("visit7",null)||{});if(!V.n||typeof V.n!=="object")V.n={};if(!V.day||typeof V.day!=="object")V.day={};
    if(V.day[c]!==day){V.n[c]=(V.n[c]||0)+1;V.day[c]=day;store.set("visit7",V)}}catch(e){}}
/* 櫃坊現在的禮（沒有 07mnq＝空） */
function xsmGiftsNow(){try{if(typeof mnqSt!=="function"||typeof mnqEnv!=="function")return[];let D=null;try{D=typeof shipDockList==="function"?shipDockList():null}catch(e){}return xsmGifts(mnqSt(),mnqEnv(),D)}catch(e){return[]}}
/* 發亮：有禮可領、或今天有人來還沒見到（第 17 項 A） */
const xsmHotGift=()=>xsmGiftsNow().some(g=>!g.got);
function xsmHotVisit(){try{return xsmSt().v.met!==xsmToday()&&!!xsmVisitWho()}catch(e){return false}}
function xsmHot(){try{return xsmHotGift()||xsmHotVisit()}catch(e){return false}}
/* 外景兩個標籤跟著亮／不亮 */
function xsmMark(P){P=P||document.querySelector(".xsm-page:not(.xsm-tea)");if(!P)return;const g=P.querySelector("#xsmGift"),v=P.querySelector("#xsmVisit");
  if(g)g.classList.toggle("hot",xsmHotGift());if(v)v.classList.toggle("hot",xsmHotVisit())}
/* ---------- 11/16 領禮物：雲河櫃坊 ---------- */
function xsmGiftNm(g){const G=typeof MNQ_GIFT!=="undefined"&&MNQ_GIFT[g.k]||{},el=g.era&&typeof eraLabel==="function"?eraLabel(g.era):(g.era||"");return(G.nm||g.k)+(g.k==="a6"&&el?"・"+el:"")}
function xsmGiftSheet(){xsmCss();const L=xsmGiftsNow(),pend=L.some(g=>!g.got);
  sheet("雲河櫃坊",b=>{b.innerHTML=`<p class="xsm-nar">${esc(XSM_TX.gift)}</p><p class="xsm-say">掌櫃：「${esc(xsmYou(pend?XSM_TX.g1:XSM_TX.g0))}」</p>`+
    L.map((g,i)=>`<button type="button" class="xsm-li${g.got?"":" new"}" data-i="${i}"><span aria-hidden="true">${g.got?"📜":"🎁"}</span><b>${esc(xsmGiftNm(g))}</b><em>${g.got?"再看一次":"領取"}</em></button>`).join("");
    b.querySelectorAll(".xsm-li").forEach(x=>x.onclick=()=>{vibrate(5);const g=L[+x.dataset.i];if(!g||typeof mnqGift!=="function")return;closeSheet();
      setTimeout(()=>{try{mnqGift(g.k,g.era)}catch(e){}try{xsmMark()}catch(e){}},260)})})}
/* ---------- 11/16 七星來訪：老槐樹下 ---------- */
function xsmVisitSheet(){xsmCss();const c=xsmVisitWho();
  if(!c){sheet("老槐樹下",b=>{b.innerHTML=`<p class="xsm-say">${esc(xsmYou(XSM_TX.v0))}</p>`});return}
  const day=xsmToday(),C=(typeof WX_CHARS!=="undefined"&&WX_CHARS[c])||{},nm=C.nk||C.n||"",line=xsmYou(xsmVisitLine(c,day,xsmDay()),c);xsmVisitMet(c,day);try{xsmMark()}catch(e){}
  sheet("老槐樹下",b=>{const paint=()=>{const S=xsmSt();let task=false;
      try{if(typeof v7St==="function"&&typeof v7QNext==="function"&&typeof v7Sheet==="function"){const V=v7St();task=!!((V.q&&V.q.c===c)||(!V.q&&v7QNext(c,V)))}}catch(e){}
      b.innerHTML=`<p class="xsm-nar">${esc(xsmYou(XSM_TX.v1))}</p><div class="xsm-v"><img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><p class="xsm-say">${esc(nm)}：「${esc(line)}」</p></div>`+
        (task?`<button type="button" class="btn" id="xsmVq">🤝 聽${esc(nm)}說說</button>`:S.v.gift===day?`<p class="muted">${esc(XSM_TX.vGot)}</p>`:`<button type="button" class="btn" id="xsmVg">🎁 收下小禮（+${XSM_VISIT_XP} 修為）</button>`)+
        `<button type="button" class="btn ghost" id="xsmVb">👋 待會兒見</button>`;
      const on=(id,fn)=>{const e=b.querySelector(id);if(e)e.onclick=()=>{vibrate(5);fn()}};
      on("#xsmVb",()=>closeSheet());
      on("#xsmVq",()=>{closeSheet();setTimeout(()=>{try{v7Sheet(c,line,false)}catch(e){}},260)});
      on("#xsmVg",()=>{const S2=xsmSt();if(S2.v.gift===day)return;S2.v.gift=day;xsmSave(S2);try{addXP(XSM_VISIT_XP,"羈絆","xsmv:"+day)}catch(e){}try{saveNow(true)}catch(e){}paint()})};
    paint()})}
/* ---------- 11/16 找棋子：棋具攤 ---------- */
const xsmPcRow=n=>`<div class="xsm-row" aria-label="${esc("這一副找到 "+n+" 顆")}">${XSM_PCS.map((p,i)=>`<span class="${i<n?"on":""}" aria-hidden="true">${p}</span>`).join("")}</div>`;
function xsmChessSheet(){xsmCss();const day=xsmToday(),S=xsmSt(),F=S.f,done=F.day===day,pc=xsmPieceOf(F);
  sheet("棋具攤",b=>{b.innerHTML=`<p class="xsm-nar">${esc(XSM_TX.c0)}</p><p class="xsm-say">攤主：「${esc(xsmYou(done?XSM_TX.cDone:XSM_TX.c1))}」</p>${xsmPcRow(F.n)}`+
    `<p class="muted" style="text-align:center">這一副找到 ${F.n} 顆，湊齊 7 顆就是一副${F.sets?`・已經湊齊 ${F.sets} 副`:""}<br>找到一顆 +${XSM_FIND_XP} 修為，湊齊一副再 +${XSM_SET_XP} 修為</p>`+
    (done?"":`<button type="button" class="btn" id="xsmCg">🔎 去找今天這顆「${esc(pc)}」</button>`)+(done||!xsmAxOn()?"":`<button type="button" class="btn" id="xsmCt">直接收下今天這顆「${esc(pc)}」</button>`)+`<button type="button" class="btn ghost" id="xsmCb">${done?"明天再來":"先逛逛"}</button>`;
    const g=b.querySelector("#xsmCg");if(g)g.onclick=()=>{vibrate(5);closeSheet();setTimeout(()=>xsmHuntBan(),260)};
    const tk=b.querySelector("#xsmCt");if(tk)tk.onclick=()=>{vibrate(5);closeSheet();setTimeout(()=>xsmTakePc(),260)};
    b.querySelector("#xsmCb").onclick=()=>{vibrate(5);closeSheet()}})}
/* 外景畫上今天那顆（今天還沒找到才畫）；在 v 上用捕獲先看一眼（比 07w 走路、07w6 物件說明早）：點到它 28px 內就攔下來算找到，點別處照常 */
function xsmHuntInit(v,P){const day=xsmToday(),S=xsmSt();if(S.f.day===day||!v||!P)return;const sp=xsmHideOf(day),I=P.querySelector(":scope>img");if(!I)return;
  const t=document.createElement("i");t.className="xsm-pc";t.setAttribute("aria-hidden","true");t.textContent=xsmPieceOf(S.f);t.style.left=sp[0]+"%";t.style.top=sp[1]+"%";P.append(t);
  let miss=0;const on=e=>{if(!P.isConnected||!t.isConnected){v.removeEventListener("click",on,true);return}const tg=e.target;if(!tg||!P.contains(tg))return;
    const bn=tg.closest(".xsm-ban");if(bn){e.stopPropagation();e.preventDefault();const b=tg.closest("button");if(b&&b.hasAttribute("data-h"))xsmGlow(t);else if(b&&b.hasAttribute("data-x"))bn.remove();return}
    if(tg.closest("button,a,input,select,textarea,label,[role=button]"))return;
    const r=I.getBoundingClientRect();if(!r.width||!r.height)return;const p=[(e.clientX-r.left)/r.width*100,(e.clientY-r.top)/r.height*100];
    if(xsmNear(sp,p,r.width,r.height)){e.stopPropagation();e.preventDefault();v.removeEventListener("click",on,true);xsmGotPc(P,t);return}
    if(P.querySelector(".xsm-ban")&&++miss===2)xsmGlow(t)};
  v.addEventListener("click",on,true)}
function xsmGlow(t){if(!t||!t.isConnected)return;t.classList.remove("glow");void t.offsetWidth;t.classList.add("glow")}
/* 「去找」：圖上方一條提示（💡 讓那顆亮一下、✕ 收起來） */
function xsmHuntBan(){const P=document.querySelector(".xsm-page:not(.xsm-tea)"),t=P&&P.querySelector(".xsm-pc");if(!P||!t){toast("🔎 "+XSM_TX.cDone);return}
  P.querySelectorAll(".xsm-ban").forEach(x=>x.remove());const ban=document.createElement("div");ban.className="xsm-ban";ban.setAttribute("role","status");
  ban.innerHTML=`<b>🔎 找一顆「${esc(t.textContent)}」</b><button type="button" data-h>💡 提示</button><button type="button" data-x aria-label="先不找了">✕</button>`;P.append(ban);
  try{P.scrollIntoView({behavior:"smooth",block:"start"})}catch(e){}}
/* 找到了：存進度、給修為（xsmf:<日期>；湊齊再 xsmf7:<第幾副>）、湊齊跳蓋印 */
function xsmGotPc(P,t){const day=xsmToday(),r=xsmPcAward(day);if(!r)return;
  try{vibrate([10,30,10])}catch(e){}t.classList.add("got");setTimeout(()=>t.remove(),900);
  const ban=P.querySelector(".xsm-ban");if(ban){ban.querySelector("b").textContent="攤主：「"+XSM_TX.c2+"」";ban.querySelectorAll("button").forEach(x=>x.remove());setTimeout(()=>ban.remove(),1900)}else toast("🔎 "+XSM_TX.c2);
  if(r.full)setTimeout(()=>{if(P.isConnected)xsmSetRite()},1100)}
/* 找到一顆的結算（圖上找到、讀螢幕直接收下共用）：存進度、給修為（xsmf:<日期>；湊齊再 xsmf7:<第幾副>）；同一天第二次＝null */
function xsmPcAward(day){const S=xsmSt(),r=xsmFindGo(S.f,day);if(!r)return null;S.f=r.F;xsmSave(S);
  try{addXP(XSM_FIND_XP,"找棋子","xsmf:"+day)}catch(e){}
  if(r.full){try{addXP(XSM_SET_XP,"找棋子","xsmf7:"+r.F.sets)}catch(e){}}
  try{saveNow(true)}catch(e){}return r}
/* 11/16 開發者選單「照現在＋讀螢幕可直接收」：只在 ♿ 螢幕報讀與鍵盤模式（11b axmOn）棋具攤卡片多一顆「直接收下」，效果跟圖上找到一樣；一般模式不出現 */
const xsmAxOn=()=>{try{return typeof axmOn==="function"&&!!axmOn()}catch(e){return false}};
function xsmTakePc(){const day=xsmToday(),r=xsmPcAward(day);if(!r)return null;
  try{const t=document.querySelector(".xsm-page:not(.xsm-tea)>.xsm-pc");if(t)t.remove();document.querySelectorAll(".xsm-ban").forEach(x=>x.remove())}catch(e){}
  try{toast("🔎 "+XSM_TX.c2)}catch(e){}if(r.full)setTimeout(()=>xsmSetRite(),400);return r}
function xsmSetRite(){xsmCss();modal(`<div class="xsm-seal" aria-hidden="true">齊</div><h3>一副棋湊齊了</h3>${xsmPcRow(7)}<p>攤主：「${esc(xsmYou(XSM_TX.c3))}」</p><p class="muted">+${XSM_SET_XP} 修為</p>`,[["收下",null]])}
/* ---------- 11/16 聽曲：西市樂棚 ＋ 西市背景配樂（都走 01-board 的 BGM，不另開播放器） ---------- */
const xsmBgmOk=()=>{try{return!!store.get("bgm",true)&&(typeof sxmGain!=="function"||sxmGain("bgm")>0)}catch(e){return false}};
const xsmBgmMine=f=>!!f&&(f===XSM_BGM_D||f===XSM_BGM_N||f===XSM_MU.f);
/* 進西市（外景、茶坊、暗棋）：樂棚正在放就不動；不然照日夜放那一組 */
function xsmBgmOn(){if(typeof bgmForce!=="function"||typeof BGM==="undefined")return;if(XSM_MU.f&&BGM.force===XSM_MU.f)return;XSM_MU.f=null;try{bgmForce(xsmDay()?XSM_BGM_D:XSM_BGM_N)}catch(e){}}
function xsmMuToggle(rel){if(typeof bgmForce!=="function")return;if(!xsmBgmOk()){toast("♪ "+XSM_TX.muOff);return}
  if(XSM_MU.f===rel){XSM_MU.f=null;bgmForce(xsmDay()?XSM_BGM_D:XSM_BGM_N)}else{XSM_MU.f=rel;bgmForce(rel)}}
function xsmMusicSheet(){xsmCss();let D=null,O=null;try{D=typeof shipDockList==="function"?shipDockList():null}catch(e){}try{O=typeof shipOrder==="function"?shipOrder():null}catch(e){}const E=xsmMuEras(O,D);
  sheet("西市樂棚",b=>{let IX={},T={};const paint=()=>{const n=xsmMuList(E,IX).length;
      b.innerHTML=`<p class="xsm-nar">${esc(XSM_TX.mu)}</p><p class="xsm-say">${esc(XSM_TX.mu2)}</p>`+(xsmBgmOk()?"":`<p class="muted">${esc(XSM_TX.muOff)}</p>`)+(n?`<p class="muted">收了 ${n} 首</p>`:"")+
        E.map(e=>{const L=xsmMuList([e],IX);return L.length?`<div class="sec-t">${esc(typeof eraLabel==="function"?eraLabel(e):e)}</div>`+L.map(rel=>{const f=rel.split("/").pop(),on=XSM_MU.f===rel,tt=T[rel];
          return`<button type="button" class="xsm-mu${on?" on":""}" data-m="${esc(rel)}" aria-pressed="${on}"><span aria-hidden="true">${on?"⏸":"▶"}</span><b>${tt?"《"+esc(tt)+"》":esc(f)}</b><small>${esc(XSM_INS[f.replace(/_\d+\.\w+$/,"")]||"")}</small></button>`}).join(""):""}).join("")+
        `<p class="muted">${esc(XSM_TX.muMore)}</p>`;
      b.querySelectorAll(".xsm-mu").forEach(x=>x.onclick=()=>{vibrate(5);xsmMuToggle(x.dataset.m);paint()})};
    paint();
    Promise.all([typeof bgmList==="function"?bgmList():{},typeof bgmTitles==="function"?bgmTitles():{}]).then(([a,c])=>{IX=a||{};T=c||{};if(b.isConnected)paint()}).catch(()=>{})})}
/* 離開西市（網址不是 #/ximarket…）：西市放的配樂還給朝代配樂 */
if(typeof addEventListener==="function")addEventListener("hashchange",()=>{try{if(/^#\/ximarket(\/|$)/.test(location.hash))return;if(typeof BGM!=="undefined"&&xsmBgmMine(BGM.force)&&typeof bgmForce==="function"){XSM_MU.f=null;bgmForce(null)}else XSM_MU.f=null}catch(e){}});
/* ---------- 首頁橋左邊「🏮 西市」 ---------- */
function xsmHomePos(P){const b=P&&P.querySelector("#hmXsm");if(!b)return;const c=XSM_HOME[P.dataset.hmw||""]||XSM_HOME[""];b.style.left=c[0]+"%";b.style.top=c[1]+"%";delete b.dataset.ttL;b.style.marginLeft=""}
function xsmHomeSpot(v){if(!xsmOpen()||!(typeof hbIsCl==="function"&&hbIsCl()))return;const P=v.querySelector(".home-page");if(!P||P.querySelector("#hmXsm"))return;
  const k=P.dataset.hmw||"",c=XSM_HOME[k]||XSM_HOME[""],b=document.createElement("button");b.type="button";b.id="hmXsm";b.className="shp-spot"+(store.get("xsmSeen",0)&&!xsmHot()?"":" hot");   /* 11/16 第 17 項 A：第一次去以前、有禮可領、有人來訪還沒見到都發亮 */
  b.style.left=c[0]+"%";b.style.top=c[1]+"%";b.setAttribute("aria-label","西市");b.innerHTML="<b>🏮 西市</b>";
  b.onclick=e=>{e.stopPropagation();vibrate(5);location.hash="#/ximarket"};
  /* 焦點順序：照 hmFocusOrder 插在對的位置（觀星臺已經放好就一起算；底部那一條永遠最後） */
  let ref=null;try{const G=P.querySelector("#hmGxt")&&typeof GXT_HOME!=="undefined"?[["hmGxt"].concat(GXT_HOME[k]||GXT_HOME[""])]:[];
    const S=(typeof hmwSpots==="function"?hmwSpots(k):[]).concat(G,[["hmXsm",c[0],c[1]]]),ord=hmFocusOrder(S).map(s=>s[0]),i=ord.indexOf("hmXsm");for(let j=i+1;j<ord.length&&!ref;j++)ref=P.querySelector(":scope>#"+ord[j])}catch(e){}
  if(!ref){const sp=P.querySelectorAll(":scope>.shp-spot");ref=sp.length?sp[sp.length-1].nextSibling:P.querySelector(":scope>.hm-go-bar")}
  P.insertBefore(b,ref||null);try{if(typeof hmClamp==="function")hmClamp(P)}catch(e){}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(!hub)xsmHomeSpot(v)}catch(e){}return r}}
if(typeof hmwSet==="function"){const f1=hmwSet;hmwSet=function(P){const r=f1.apply(this,arguments);try{xsmHomePos(P)}catch(e){}return r}}   /* 首頁原地換寬版圖時跟著換座標 */
