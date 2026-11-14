/* ================= 🏯 學習、對戰兩頁的滿版水墨圖（開發者 11/8 定案：📚 學習＝方案 1「千秋翰林書院」（宋代）、⚔ 對戰＝方案 8「徽州深院茶樓」（明代））=================
   規劃：story/gemini_app/34、35 號 md（Gemini 十案）；圖：park/hubmap/（learn_v4、battle_v3 定稿，史學顧問 11/8 核過、局部修圖）→ art/hubmap/（process_art.py 的 HUBMAP）→ data/hubmap/。
   包一層 Home(v,hub)：原本的卡片照舊畫出來（即時狀態、點了做什麼都不變），只是藏起來；上面換成一張滿版圖，每個入口一個金框標籤：
     標籤只有大字＝卡片的圖示＋標題（開發者 11/8：小字都拿掉，進度改由場景表現：燈籠、茶煙、洗墨池、紅榜、大幕、煙火）；點標籤＝按那張卡片。
     卡片「繼續下 ›」（有下到一半的棋）時標籤變紅（hot）；第一次來（沒上過訓練營、沒有對局）新手訓練營、象棋規則變紅。REWARD 關掉時沒有車庫卡片，也就沒有車庫標籤（大門穿堂本來就是茶樓入口，不會空著）。
   學習頁四進（由下往上）：前院【啟蒙】象棋規則＝刻棋盤的石碑、新手訓練營＝老槐樹下的沙盤；中庭【日課】一盞茶殘局＝點茶桌、主題訓練＝掛殘局木板的迴廊、錯棋重練＝洗墨池；
     講堂【考校】棋力測驗＝大考桌、我的戰績＝朱紅榜、我的開局＝矮几上的棋枰（11/8 由木架推演盤改）；藏書閣【典藏】猜著法＝二樓露台、棋譜庫＝閣門。
   學習頁的狀態（都用程式畫）：12 盞素紗燈（11/8 考究清單：朱紅燈籠改白絹紗燈，宋代書院不宜滿掛紅燈）照新手訓練營上完的課數由近到遠點亮（暖黃光）；今天的一盞茶還沒喝完時，點茶桌冒熱氣；洗墨池照「該練的錯棋」多少，墨色由濃到清（清空就是清水）。
   對戰頁：天井八仙桌＝線上對戰（離線版沒有時是 AI 對戰）、靠窗獨桌＝挑戰電腦、「踢館」牌匾下＝朝代擂台、二樓說書台＝千秋盃（角色停在樓梯口）、大門穿堂＝車庫。
   對戰頁的狀態（千秋盃 XQNet.cup().ph）：報名中、報名截止＝換 battle_red（樓梯旁貼紅榜）；點將中、比賽中＝換 battle_curtain（說書台朱紅大幕垂下）＋燈籠亮；擂主揭曉＝天上放煙火（程式）。
   接 07w 的走路（座標表 SHW_HUB，用 shwPage）、07x 的兩指縮放（zmPage）。prefers-reduced-motion：燈火、茶煙、煙火不動，只有靜態樣子。
   開關 HUB_MAP_ON（false＝照舊卡片清單）；樣式在 hbCss */
const HUB_MAP_ON=true;
const HB_IMGV="0700";   /* 圖的版本：data/hubmap 存在不跟版本走的快取，同檔名換圖時把這個數字改掉，手機才會重抓（意見回饋 789 換棋盤；11/8 考究清單：學習頁素紗燈、矮几棋枰，對戰頁燈籠不亮、盆松、窗邊象棋） */
/* 開發者 11/9：兩頁照星槎停靠的朝代換圖（story/朝代場景計畫.md；史學顧問 11/9 核過）。各朝圖跟原圖構圖對齊，標籤、燈、熱氣、洗墨池、矮几棋枰、走路節點的座標都不變。
   有停靠才算（shipDockList() 有值，判斷跟 07z 的 xqHubName 一樣）；沒停靠、學習頁的宋、對戰頁的明都用原圖。
   檔名 learn_<朝>、battle_<朝>、battle_red_<朝>、battle_curtain_<朝>：preload-list.js 的 ERA_RE 認得「_<朝>.」，跟著各朝分批下載 */
const HB_ERAS={learn:"qin han sanguo weijin nanbei sui tang wudai yuan ming qing".split(" "),battle:"qin han sanguo weijin nanbei sui tang wudai song yuan qing".split(" ")};
function hbDockEra(){try{return typeof shipAt==="function"&&typeof shipDockList==="function"&&shipDockList()?shipAt()||"":""}catch(x){return""}}
/* 11/10 經典世界（Gemini 71 比例 C，開發者選）：還沒登船、或星槎停在經典時，學習、對戰換成千秋時光之苑版（learn_classic、battle_classic）；宋朝照舊用原本那套 */
const HB_CLASSIC_ON=true;
/* 經典世界的子頁面（盤查 story/經典世界子頁面盤查_1110.md）：這些頁的底圖網址包一層 xqClImg，經典世界時 xxx_day／xxx_night（含朝代組別後綴）換成 xxx_day_classic／xxx_night_classic；其他朝代照舊 */
const XQ_CL_DIRS=new RegExp("data/(todaymap|canjumap|cupmap|deskmap|rostermap|campmap|exammap|termsmap|thememap|redomap|statmap|openmap|gmmap|cpuroom|studymap|passmap|setmap)/");
function xqClImg(u){try{if(!hbIsCl()||!XQ_CL_DIRS.test(u))return u;return u.replace(/\/([a-z]+_(?:day|night))(?:_[a-z]+)?\.webp/,"/$1_classic.webp")}catch(e){return u}}
function hbIsCl(){if(!HB_CLASSIC_ON)return false;const e=hbDockEra();return !e||e==="classic"}
/* 開發者 11/11「朝代／經典的學習和對戰天氣沒有跟著首頁變化」：學習、對戰底圖跟首頁同一個季節（07w7 sw7SeaNow），檔名 <名>_<季>[_night].webp，26 組×四季×日夜都有（data/hubmap/seasons.json；夏季＝原圖）。拿不到季節時照舊用原圖 */
const HB_SEAS=["spring","summer","autumn","winter"];
const hbImg=(base,hub)=>{const lb=base==="learn"||base==="battle",nt=lb&&typeof sw7NightNow==="function"&&sw7NightNow()?"_night":"";let sq="";if(lb){try{const s=typeof sw7SeaNow==="function"?sw7SeaNow():"";if(HB_SEAS.includes(s))sq="_"+s}catch(x){}}if(lb&&hbIsCl())return base+"_classic"+sq+nt;const e=hbDockEra();return base+((HB_ERAS[hub]||[]).includes(e)?"_"+e:"")+sq+nt};   /* 11/10 日落後換夜景圖 <名>_night（07w7 sw7NightNow） */
/* 11/10 開發者「同桌對弈不應該出現走去園子過場」「挑戰電腦有景點了，不該再出現茅廬」：茶樓裡開的棋（挑戰電腦、同桌對弈），載入畫面用這一朝的對戰茶樓圖＋茶樓名稱，不再是小帥走去園子、茅廬臥龍 */
/* 11/10 開發者「原本在茶坊，場景卻跑到了園子」（Gemini 61 號，開發者選：後花園＋月洞門過場圖、小二招呼、線上對戰一起套）：
   茶坊這邊開的棋（挑戰電腦、同桌對弈、天井配對的線上對局）都在「茶坊的後園」下——載入畫面是穿過月洞門往後園石台走（data/parkgate/yard*.webp），
   園子上方的地點標籤寫「〇〇・後園」，返回鍵寫「走回雅間／走回〇〇」。〇〇＝這一朝對戰頁的名稱（茶坊、酒肆、旗亭…） */
function hbHubN(){try{return typeof xqHubName==="function"?xqHubName("battle").split(" ").slice(1).join(" ")||"茶坊":"茶坊"}catch(e){return"茶坊"}}
/* 開發者 11/11（錄影：首頁橋上石桌點「同桌對弈」，卻穿過月洞門到「茶肆・後園」，返回寫「走回茶肆」）選「從哪進就回哪」：
   首頁的石桌、底部「立即對局／接著下」開的棋，07z 會先記 sessionStorage xqFromHome；在挑戰電腦、同桌對弈頁（中間去看棋譜也算）時：
   不走月洞門過場、場景標籤寫「渡口・石桌」（經典世界「苑中・石桌」）、返回鍵寫「回渡口／回首頁」並回到首頁。
   換到其他頁（例如從地圖去茶肆）就清掉，之後從茶肆開的棋照舊在後園、回茶肆 */
function hbFromHome(){try{return !!sessionStorage.getItem("xqFromHome")&&/^#\/(cpu|pvp)(\/|$)/.test(location.hash)}catch(e){return false}}
function hbHomeBack(){try{if(!hbFromHome())return;const b=document.getElementById("back");if(!b)return;b.innerHTML="<b>‹</b>"+(typeof hbIsCl==="function"&&hbIsCl()?"回首頁":"回渡口");b.hidden=false;b.dataset.to="#/";b.onclick=()=>goHome()}catch(e){}}   /* 11/11 模擬玩家問題 3：寫「回首頁」就真的回首頁（goHome），中間去過棋譜也不會先退回那一頁；data-to 給分析頁沿用（02-shell bkSet） */
addEventListener("hashchange",()=>{try{if(!/^#\/(cpu|pvp|db)(\/|$)/.test(location.hash))sessionStorage.removeItem("xqFromHome")}catch(e){}});
const hbYardName=()=>hbFromHome()?(typeof hbIsCl==="function"&&hbIsCl()?"苑中・石桌":"渡口・石桌"):hbHubN()+"・後園";
const HB_YARD_G=e=>["qin","han","sanguo","weijin","nanbei","sui","tang"].includes(e)?"_han":["wudai","song","yuan"].includes(e)?"_song":"";
/* 開發者 11/11 hspx：上一版從首頁進來時回傳 null（不走月洞門），park3d 就掉回預設的「小帥（妹）走路去園子」舊載入動畫。
   改成給一個過場：背景是首頁那張圖（經典世界用時光之苑），標題「橋上石桌」／「苑中石桌」，不走路、只慢慢拉近 */
function hbHomeGate(){const cl=typeof hbIsCl==="function"&&hbIsCl();return{img:[cl?"data/homemap/home_classic.webp":"data/homemap/home.webp"],icon:"",title:cl?"苑中石桌":"橋上石桌",sub:"坐下來，就在這張石桌下一盤",bg:"#1f2a22"}}
function hbYardGate(kind){if((kind==="cpu"||kind==="pvp")&&hbFromHome())return hbHomeGate();const h=hbHubN();let e="";try{e=hbDockEra()}catch(x){}const k=store.get("era","classic"),p=(typeof PW!=="undefined"&&PW[k])||"園子",g=HB_YARD_G(e||k);
  const T={cpu:["移步後園",`客官請移步，${h}後方的${p}風景正好！`],pvp:["移步後園","裡頭太擠，咱們去後頭寬敞處切磋！"],net:["移步後園",`棋友到了，雙方移步${h}後院石台`]}[kind]||["移步後園",""];
  let n="battle";try{n=hbImg("battle","battle")}catch(x){}
  return{img:["data/parkgate/yard"+g+".webp","data/parkgate/yard.webp","data/hubmap/"+n+".webp"],icon:"🚪",title:T[0],sub:T[1],bg:"#1f2a22",walk:3800,qk:(e||k)}}   /* hspx 11/10：過場也像以前一樣抽一句那一朝跟象棋有關的詩詞（06-cpu parkQuote） */   /* 開發者「過場太快、沒有味道」：停 3.8 秒、慢慢走進門洞（park3d 的 G.walk） */
function hbGate(icon,title,sub){let n="battle",h="";try{n=hbImg("battle","battle")}catch(e){}try{h=typeof xqHubName==="function"?xqHubName("battle").replace(/^\S+\s/,""):""}catch(e){}return{img:["data/hubmap/"+n+".webp","data/hubmap/battle.webp"],icon,title,sub:(h?h+"・":"")+sub,bg:"#1f2a22"}}
/* 入口：[標籤 id（也是 07w 的入口代號）, 卡片的選擇器, 標籤左%, 上%]（量 768×1376 的定稿圖，標籤放在東西上方，角色站在東西前面） */
const HUB_DEF={
  /* 11/10 開發者：我的戰績、一盞茶殘局的標籤往下挪（戰績貼到牆上紅榜、一盞茶貼到茶几上方） */
  learn:{img:"learn",cap:"📚 學習",sub:"千秋翰林書院・前院啟蒙、中庭日課、講堂考校、藏書閣典藏",spots:[
    ["hbTerms",'[data-go="#/terms"]',15,75.5],["hbCamp",'[data-go="#/camp"]',82,76.5],
    ["hbCanju",'[data-go="#/canju"]',24,58],["hbRedo",'[data-go="#/redo"]',68,59.5],["hbTheme",'[data-go="#/theme"]',88,54],
    ["hbQuiz",'[data-go="#/quiz"]',50,45.5],["hbStats",'[data-go="#/stats"]',12,48],["hbOpen",'[data-go="#/openings"]',70,40],
    ["hbGuess",'[data-go="#/guess"]',50,13],["hbDb",'[data-go="#/db"]',50,24.5]]},
  battle:{img:"battle",cap:"⚔ 對戰",sub:"徽州深院茶樓・天井對弈、靠窗挑戰、踢館擂台、二樓千秋盃",spots:[
    ["hbNet",'[data-go="#/lobby"],[data-go="#/watch/ai"]',50,48.5],["hbCpu",'[data-go="#/cpu"]',19,58],
    ["hbCup",'[data-go="#/cup"]',36,21.5],["hbSimul",'[data-go="#/simul"]',17,31],   /* 開發者 11/11 hspx：車輪戰＝二樓左邊廂房（好幾張桌子） */
    ["hbPvp",'[data-go="#/pvp"]',18,72.5]]}};   /* 11/10 開發者：拿掉右邊「朝代擂台」入口（擂台走渡口那邊）。回饋 840：同桌對弈＝左邊房間下面那張放棋盒、有凳子的桌子（上面那張擺棋盤的是挑戰電腦） */
/* 經典版學習頁（藏譜石窟，learn_classic）：構圖跟書院不同，入口另外量（768×1376）：
   猜著法＝最上方石窟小亭、棋譜庫＝飄著古籍的洞口、我的戰績／我的開局＝左右兩幅垂掛長卷、棋力測驗＝白玉講台、錯棋重練＝墨池、主題訓練＝右側墨瀑、
   新手訓練營＝左邊大石、一盞茶殘局＝左前方星紋紙台、象棋規則＝最前面攤開的大長卷。燈籠、矮几棋盤、熱氣、洗墨池這些書院才有的疊圖不放 */
const HUB_CL_SPOTS={learn:{hbTerms:[50,72.5],hbCamp:[13,61],hbCanju:[25,77],hbRedo:[69,58.5],hbTheme:[87,44.5],hbQuiz:[50,47.5],hbStats:[24,36],hbOpen:[76,36],hbGuess:[50,14],hbDb:[50,31.5]}};
/* 學習頁 12 盞燈籠（由近到遠，照課數點亮）、點茶桌熱氣、洗墨池水面；對戰頁的燈籠 */
const HUB_LAMP={learn:[[1.7,39],[98.3,39],[21.7,40.5],[38.7,40.5],[61.7,40.5],[78.7,40.5],[12.5,33.7],[87.5,33.7],[21.7,28.8],[78.7,28.8],[38.3,16.5],[61.7,16.5]],
  battle:[[3,30.5],[22.5,29],[50,26.5],[65,25.5],[26.5,42.5],[51,39],[91,64.5],[62,72]]};
/* 回饋 849（11/9 修圖）：學習頁矮几上的棋枰圖上改成空白木面，棋盤由程式照透視畫上去（四角＝原圖像素 768×1376） */
const HUB_QP=[[507.9,643.6],[564.8,643.6],[570.6,664.6],[514.3,664.6]];
function hbQpSVG(){const W=180,H=200,ox=10,oy=10,cw=(W-2*ox)/8,ch=(H-2*oy)/9;let g=`<rect x="3" y="3" width="${W-6}" height="${H-6}" fill="none" stroke="rgba(70,45,22,.55)" stroke-width="3"/>`;
  for(let j=0;j<10;j++)g+=`<line x1="${ox}" y1="${(oy+j*ch).toFixed(1)}" x2="${W-ox}" y2="${(oy+j*ch).toFixed(1)}"/>`;
  for(let i=0;i<9;i++){const x=(ox+i*cw).toFixed(1);g+=(i===0||i===8)?`<line x1="${x}" y1="${oy}" x2="${x}" y2="${(oy+9*ch).toFixed(1)}"/>`:`<line x1="${x}" y1="${oy}" x2="${x}" y2="${(oy+4*ch).toFixed(1)}"/><line x1="${x}" y1="${(oy+5*ch).toFixed(1)}" x2="${x}" y2="${(oy+9*ch).toFixed(1)}"/>`}
  const X=i=>ox+i*cw,Y=j=>oy+j*ch;g+=`<line x1="${X(3)}" y1="${Y(0)}" x2="${X(5)}" y2="${Y(2)}"/><line x1="${X(5)}" y1="${Y(0)}" x2="${X(3)}" y2="${Y(2)}"/><line x1="${X(3)}" y1="${Y(7)}" x2="${X(5)}" y2="${Y(9)}"/><line x1="${X(5)}" y1="${Y(7)}" x2="${X(3)}" y2="${Y(9)}"/>`;
  return`<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><g stroke="rgba(60,38,18,.7)" stroke-width="2.2" fill="none">${g}</g></svg>`}
const HUB_STEAM=[23,63],HUB_POND="polygon(60% 62.3%,73.5% 62.3%,77.5% 68.4%,61% 68.4%)";
/* 07w 的座標表（腳底的位置）。學習頁：從大門口的石階進來，穿過門樓（門樓屋頂那一段角色先隱身）到中庭；石桌、洗墨池、迴廊木板在中庭兩旁；
   講堂月台只有正中間一道台階。意見回饋 790：去藏書閣（棋譜庫、猜著法）一律從大考桌左邊繞過、穿過講堂正中間敞開的門（門內到講堂後面隱身），再走到閣門；
   原本沿左側迴廊上去、從中庭斜穿月台磚牆的路都拿掉了。
   對戰頁：從大門石階進穿堂，穿過門樓（屋頂那一段隱身）到天井；八仙桌右邊是線上對戰、左後方是挑戰電腦。意見回饋 791：千秋盃走右邊木樓梯上二樓——
   樓梯腳→下段樓梯→轉角平台→上段樓梯→樓梯頂→二樓迴廊→說書台旁；在樓上時身高照樓梯腳算，不再照 y 縮小（h 用函式）。
   hide：[左%,右%,上%,下%] 範圍內角色隱身（07y 的 hbHide 照角色位置改透明度） */
const SHW_HUB={
  learn:{el:45,h:[.033,29,.0007],look0:[50,99],hide:[[40,60,70.9,77.6],[44,56,30.4,44.6]],
    N:{home:[50,95],fl:[31,93],stele:[16,92],fr:[69,93],sand:[80,91],g:[50,86],c:[50,69.5],tea:[25,71],pond:[56,67],r1:[70,73],r2:[84,73],theme:[85,65],
      t1:[50,57],exam:[50,52.5],open:[64.5,52.8],tL:[34,52.6],tl:[22,52],tLb:[34.5,47.3],hd:[50,46.7],hin:[50,44.2],hb:[50,30],guess:[42,29.5],door:[50,28.8]},
    E:"home-fl fl-stele home-fr fr-sand home-g g-c c-tea c-pond c-r1 r1-r2 r2-theme c-t1 t1-exam exam-open exam-tL tL-tl tL-tLb tLb-hd hd-hin hin-hb hb-door hb-guess",
    HS:{hbTerms:["stele",19,80,"bow"],hbCamp:["sand",80,79,"wave"],hbCanju:["tea",23,60,"bow"],hbRedo:["pond",74,64,"wave"],hbTheme:["theme",95,60,"wave"],
      hbQuiz:["exam",50,48,"bow"],hbStats:["tl",10,47,"wave"],hbOpen:["open",70,44,"wave"],hbGuess:["guess",48,18,"wave"],hbDb:["door",50,24,"bow"]}},
  battle:{el:40,h:y=>.07+(Math.max(y,48.2)-64)*.0007,look0:[40,95],hide:[[68,92,57.3,65.6]],
    N:{home:[80,88],th:[80,76],arena:[73,56],n:[65,53.5],bt:[50,49],tlb:[38,49.3],cpu:[35,52.5],sf:[58,48.2],s1:[64,43.3],sl:[69.5,39.3],s2:[66.2,36.3],st:[59.5,31.6],gal:[53,32.5],stage:[44.5,32.8],wing:[24,33.5]},
    E:"home-th th-arena arena-n n-bt n-sf bt-sf bt-tlb tlb-cpu sf-s1 s1-sl sl-s2 s2-st st-gal gal-stage stage-wing",
    HS:{hbNet:["n",52,53,"bow"],hbCpu:["cpu",15,64,"bow"],hbCup:["stage",35,32,"bow"],hbSimul:["wing",12,31,"bow"],hbCar:["th",84,72,"wave"],hbPvp:["cpu",9,80,"bow"]}}};
/* 經典版學習頁的走路：從前面大長卷走上中庭、講台前；進洞口（隱身）再從上方小亭出來；左邊大石、星紋紙台，右邊長卷、墨瀑沿墨池上緣繞過去 */
const SHW_HUB_CL={learn:{el:45,h:[.033,29,.0007],look0:[50,99],hide:[[38,62,30,46]],
    N:{home:[50,95],g:[50,80],c:[50,66],redo:[56,65],t1:[50,58.5],exam:[50,54],door:[50,47.5],hb:[50,40],guess:[50,27.5],
      lc:[36,60],stats:[27,58.5],camp:[22,72],canju:[26,81],rc:[64,58],open:[73,58.5],theme:[84,60]},
    E:"home-g g-c c-redo c-t1 t1-exam exam-door door-hb hb-guess t1-lc lc-stats lc-camp camp-canju t1-rc rc-open open-theme",
    HS:{hbTerms:["g",50,74,"bow"],hbCamp:["camp",14,66,"wave"],hbCanju:["canju",24,82,"bow"],hbRedo:["redo",68,65,"wave"],hbTheme:["theme",90,55,"wave"],
      hbQuiz:["exam",50,50,"bow"],hbStats:["stats",27,46,"wave"],hbOpen:["open",73,46,"wave"],hbGuess:["guess",50,20,"wave"],hbDb:["door",50,40,"bow"]}}};
/* 角色走進 hide 範圍（穿過門樓、講堂裡面）就淡出，走出來再出現：看 07w 每格寫的 translate 換成百分比 */
function hbHide(P,Z){const b=P.querySelector(".shw");if(!b||!Z||!Z.length)return;b.style.transition="opacity .18s";
  const mo=new MutationObserver(()=>{if(!b.isConnected){mo.disconnect();return}const m=/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(b.style.transform),W=P.clientWidth,H=P.clientHeight;if(!m||!W||!H)return;
    const x=+m[1]/W*100,y=+m[2]/H*100,o=Z.some(z=>x>=z[0]&&x<=z[1]&&y>=z[2]&&y<=z[3])?"0":"";if(b.style.opacity!==o)b.style.opacity=o});
  mo.observe(b,{attributes:true,attributeFilter:["style"]})}
function hbCss(){if(document.getElementById("hbCss"))return;const s=document.createElement("style");s.id="hbCss";s.textContent=`
.hub-page{margin:0 0 6px}.hub-page .shp-spot{max-width:46%;padding:4px 11px}.hub-page .shp-spot b{white-space:nowrap;font-size:14px}.hub-page .shp-spot.hot{padding:5px 13px}.hub-page .shp-spot.hot b{font-size:15px}.hb-hidden{display:none!important}
.hb-fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}.hb-qp{position:absolute;left:0;top:0;width:180px;height:200px;transform-origin:0 0}.hb-qp svg{display:block;width:100%;height:100%}
.hb-lamp{position:absolute;width:9%;aspect-ratio:1;margin:-4.5% 0 0 -4.5%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,226,150,.9),rgba(255,196,96,.45) 45%,rgba(255,170,60,0));mix-blend-mode:screen;opacity:0;transition:opacity .8s}
.hb-lamp.on{opacity:1;animation:hbFlick 2.8s ease-in-out infinite alternate}.hb-lamp:nth-child(3n){animation-delay:-1.1s}.hb-lamp:nth-child(3n+1){animation-delay:-2s}
@keyframes hbFlick{0%{opacity:.8;transform:scale(.96)}50%{opacity:1;transform:scale(1.04)}100%{opacity:.86;transform:scale(1)}}
.hb-steam{position:absolute;width:9%;height:10%;margin:-10% 0 0 -4.5%}.hb-steam i{position:absolute;bottom:0;left:40%;width:34%;height:100%;border-radius:50%;background:radial-gradient(closest-side,rgba(255,255,255,.98),rgba(255,255,255,.55) 55%,rgba(255,255,255,0));filter:blur(1px) drop-shadow(0 0 1.5px rgba(70,60,50,.45));animation:hbSteam 3.2s ease-in infinite;opacity:0}
.hb-steam i:nth-child(2){left:15%;animation-delay:-1.1s}.hb-steam i:nth-child(3){left:62%;animation-delay:-2.1s}
@keyframes hbSteam{0%{transform:translateY(40%) scaleX(.6);opacity:0}25%{opacity:.85}100%{transform:translateY(-70%) scaleX(1.4) rotate(8deg);opacity:0}}
.hb-ink{position:absolute;inset:0;background:radial-gradient(ellipse 10.5% 4.4% at 68.5% 65.4%,rgba(28,24,22,.72),rgba(28,24,22,.42) 60%,rgba(28,24,22,0) 100%);transition:opacity 1.2s}   /* 11/10：iPhone 上 multiply 不作用，深色整塊蓋住、邊又硬；改成中間濃、往池邊淡開，不靠混色 */
.hb-clear{position:absolute;inset:0;background:linear-gradient(115deg,rgba(150,205,215,0),rgba(170,220,230,.55) 45%,rgba(150,205,215,0) 60%);mix-blend-mode:screen;animation:hbGlint 4s ease-in-out infinite}
@keyframes hbGlint{0%,100%{opacity:.35}50%{opacity:.8}}
.hb-fw{position:absolute;width:22%;aspect-ratio:1;margin:-11% 0 0 -11%;border-radius:50%;background:repeating-conic-gradient(from 0deg,rgba(255,200,70,1) 0 4deg,transparent 4deg 15deg,rgba(225,60,45,1) 15deg 19deg,transparent 19deg 30deg);
  -webkit-mask:radial-gradient(circle,transparent 16%,#000 22% 44%,transparent 50%);mask:radial-gradient(circle,transparent 16%,#000 22% 44%,transparent 50%);filter:drop-shadow(0 0 3px rgba(255,170,60,.9));animation:hbFw 2.6s ease-out infinite;opacity:0}
@keyframes hbFw{0%{transform:scale(.15);opacity:0}12%{opacity:1}70%{opacity:.9}100%{transform:scale(1.15);opacity:0}}
@media (prefers-reduced-motion:reduce){.hb-lamp.on,.hb-steam i,.hb-clear,.hb-fw{animation:none}.hb-steam i{opacity:.55}.hb-fw{opacity:.9;transform:scale(1)}}`;document.head.append(s)}
/* 卡片的標題 */
const hbCard=(v,sel)=>{for(const q of sel.split(",")){const c=v.querySelector(".home "+q.trim()+",.home"+q.trim());if(c)return c}return null};
/* 11/10 開發者「書院這一頁都轉成朝代的詞彙，不能把原意扭曲，必須 100% 符合原本詞彙的意義」（照 story/書院入口朝代用詞_草案_1110.md，開發者選定）：
   停靠哪一朝就換那一朝的說法，意思不變；猜著法、一盞茶殘局本來就是古代說法不換；沒停靠（棋鎮）照用原詞。
   五組：秦漢三國／魏晉南北朝隋／唐五代／宋元／明清 */
const HB_ERA_GRP={qin:0,han:0,sanguo:0,weijin:1,nanbei:1,sui:1,tang:2,wudai:2,song:3,yuan:3,ming:4,qing:4};
const HB_ERA_WORD={"棋譜庫":["棋譜石室","棋譜祕閣","棋譜書樓","棋譜閣","棋譜閣"],"我的開局":["我的起手","我的起手","我的起手","我的起手","我的開局"],
  "棋力測驗":["棋力考校","棋力考校","棋力考校","棋力考校","棋力考校"],"我的戰績":["我的勝負簿","我的勝負簿","我的勝負簿","我的勝負簿","我的勝負簿"],
  "主題訓練":["分門習練","分門習練","分門習練","分門習練","分門習練"],"錯棋重練":["錯著重習","錯著重習","錯著重習","錯著重習","錯著重習"],
  "象棋規則":["象戲規則","象戲規則","象戲規則","象棋規則","象棋規則"],"新手訓練營":["初學講武場","初學講武場","初學教場","初學教場","初學校場"]};
function hbEraWord(t){let e="";try{e=hbDockEra()}catch(x){}const g=HB_ERA_GRP[e];if(g==null)return t;for(const k in HB_ERA_WORD)if(t.includes(k))return t.replace(k,HB_ERA_WORD[k][g]);return t}
const hbTitle=c=>{const ic=c.querySelector(".ic,span[style*='font-size:30px']"),t=c.querySelector(".t,b");return((ic?ic.textContent+" ":"")+(t?t.childNodes[0]&&t.childNodes[0].nodeType===3?t.childNodes[0].textContent:t.textContent:"")).trim()};
const hbHot=c=>/繼續/.test((c.querySelector(".go,:scope>b")||{}).textContent||"");
/* 11/12 ChatGPT UI 冗餘盤查（story/104 號）第 2 項：第一次來學習頁只把「新手訓練營」標成主行動（hot），象棋規則照一般入口；回訪照既有進度（fresh 跟首頁 hmNew 同一套）。
   第 4 項：對戰頁頂端常駐的「想算段位…就進〇〇正式上桌」拿掉（人已經在這裡）；第一次進對戰頁用 toast 短暫提示一次（store hbBtlTip） */
const hbFirstHot=(id,fresh)=>!!fresh&&id==="hbCamp";
const HB_BTL_TIP="找真人選「線上對戰」；自己練選「挑戰電腦」";
function hbBtlTip(){try{if(store.get("hbBtlTip",0))return false;store.set("hbBtlTip",1);setTimeout(()=>{if(/^#\/hub\/battle/.test(location.hash))toast(HB_BTL_TIP)},900);return true}catch(e){return false}}
let HB_REDO=null;   /* {n, at}：洗墨池的墨色，一分鐘內不重算 */
async function hbRedoN(){if(HB_REDO&&Date.now()-HB_REDO.at<6e4)return HB_REDO.n;let n=0;
  try{const gs=await myGames(120),done=store.get("redoDone",{})||{},now=Date.now();
    for(const g of gs){if(!isStdStart(g.it.board))continue;g.moves.forEach((m,i)=>{if(m.by===g.side&&QBAD.includes(qNow(m))){const d=done[g.c+"/"+g.id+"/"+(i+1)];if(!d||!d.ok||(d.due&&d.due<=now))n++}})}}catch(e){return null}
  HB_REDO={n,at:Date.now()};return n}
function hbFxLearn(P){const fx=P.querySelector(".hb-fx");if(!fx||hbIsCl())return;
  let lit=0;try{lit=Object.keys(campStars()).length}catch(e){}lit=Math.max(0,Math.min(12,lit));
  fx.insertAdjacentHTML("beforeend",HUB_LAMP.learn.map((p,i)=>`<i class="hb-lamp${i<lit?" on":""}" style="left:${p[0]}%;top:${p[1]}%"></i>`).join(""));
  let tea=false;try{const S=cjState(),L=S.day===cjDay()?S.list:null;tea=!cjCleared(L)}catch(e){}
  if(tea)fx.insertAdjacentHTML("beforeend",`<span class="hb-steam" style="left:${HUB_STEAM[0]}%;top:${HUB_STEAM[1]}%"><i></i><i></i><i></i></span>`);
  try{if(typeof jz2M3==="function"){const q=document.createElement("span");q.className="hb-qp";q.innerHTML=hbQpSVG();fx.append(q);const fit=()=>{const k=P.clientWidth/768;if(!k)return;q.style.transform=jz2M3(180,200,HUB_QP.map(([x,y])=>[x*k,y*k]))};   /* 849：矮几棋枰（jz2M3＝07z2 的透視矩陣） */
    if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!P.isConnected){ro.disconnect();return}fit()});ro.observe(P)}fit()}}catch(e){}
  const pond=document.createElement("span");pond.style.cssText=`position:absolute;inset:0;clip-path:${HUB_POND};-webkit-clip-path:${HUB_POND}`;fx.append(pond);
  hbRedoN().then(n=>{if(n==null||!pond.isConnected)return;pond.innerHTML=n>0?`<i class="hb-ink" style="opacity:${Math.min(.85,.3+n*.06).toFixed(2)}"></i>`:'<i class="hb-clear"></i>'})}
function hbFxBattle(P,img){let ph="";try{const S=window.XQNet&&XQNet.cup&&XQNet.cup();ph=S&&S.ph||""}catch(e){}
  const alt=ph==="reg"||ph==="wait"?"battle_red":ph==="ck"||ph==="play"?"battle_curtain":"";
  if(alt&&!hbIsCl()){const im=new Image();im.onload=()=>{if(img.isConnected)img.src=im.src};im.src="data/hubmap/"+hbImg(alt,"battle")+".webp?v="+HB_IMGV}   /* 換圖前先載好，載不到就留原圖 */
  const fx=P.querySelector(".hb-fx");if(!fx)return;
  if(alt==="battle_curtain")fx.insertAdjacentHTML("beforeend",HUB_LAMP.battle.map(p=>`<i class="hb-lamp on" style="left:${p[0]}%;top:${p[1]}%"></i>`).join(""));
  if(ph==="done")fx.insertAdjacentHTML("beforeend",[[64,14,0],[81,11,-.9],[95,15,-1.7],[72,18,-.4],[57,12,-2.2]].map(([x,y,d])=>`<i class="hb-fw" style="left:${x}%;top:${y}%;animation-delay:${d}s"></i>`).join(""))}
/* 開發者 11/11 選 ChatGPT 13 號方案 1「快下 vs 選場」：首頁大按鈕是「快速對局」、橋上石桌是「同桌對弈」（11/12 統一名稱）；
   茶肆這頁上方原本有一條常駐說明，11/12 UI 冗餘盤查第 4 項拿掉、改成第一次進來的短暫提示（hbBtlTip）。入口不加小字（開發者 11/11：畫面太雜；場景標籤一律只放大字） */
function hubMap(v,hub){const D=HUB_DEF[hub],home=v.querySelector(".home");if(!D||!home||v.querySelector(".hub-page"))return;hbCss();
  const fresh=!store.get("campSeen",false)&&!Object.keys(campStars()).length&&!Object.keys(store.get("record",{})).length&&!(typeof tsmProgNow==="function"&&tsmProgNow().any);
  const CL=hbIsCl()&&HUB_CL_SPOTS[hub],sp=D.spots.map(([id,sel,x,y])=>{const c=hbCard(v,sel);if(CL&&CL[id])[x,y]=CL[id];return c?{id,c,x,y}:null}).filter(Boolean);
  const d=document.createElement("div");
  d.innerHTML=`<div class="shp-page cq hub-page"><img src="data/hubmap/${hbImg(D.img,hub)}.webp?v=${HB_IMGV}" alt="${esc(D.cap)}" onerror="this.onerror=null;this.src=this.src.replace('_night.','.')"><div class="hb-fx" aria-hidden="true"></div>${sp.map(o=>`<button class="shp-spot${hbHot(o.c)||hbFirstHot(o.id,fresh)?" hot":""}" id="${o.id}" style="left:${o.x}%;top:${o.y}%"><b>${esc(hbEraWord(hbTitle(o.c)))}</b></button>`).join("")}</div>`;
  const P=d.firstElementChild;v.insertBefore(P,home);home.classList.add("hb-hidden");
  for(const o of sp){const b=P.querySelector("#"+o.id);if(!b)continue;b.onclick=()=>o.c.click();
    const upd=()=>{if(!b.isConnected){mo.disconnect();return}const h=hbHot(o.c)||hbFirstHot(o.id,fresh);if(b.classList.contains("hot")!==h)b.classList.toggle("hot",h)};
    const mo=new MutationObserver(upd);mo.observe(o.c,{subtree:true,childList:true,characterData:true})}
  try{(hub==="learn"?hbFxLearn:hbFxBattle)(P,P.querySelector(":scope>img"))}catch(e){}
  if(hub==="battle")hbBtlTip();
  if(typeof shpFit==="function")shpFit(v);
  try{const SW=hbIsCl()&&SHW_HUB_CL[hub]||SHW_HUB[hub];if(typeof shwPage==="function"&&SHIP_WALK_ON&&SW){shwPage(v,Object.assign({},SHW_PG0,SW),"hub:"+hub+(SW===SHW_HUB[hub]?"":":cl"));hbHide(P,SW.hide)}}catch(e){}
  try{if(typeof zmPage==="function")zmPage(v)}catch(e){}}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(HUB_MAP_ON&&(hub==="learn"||hub==="battle"))hubMap(v,hub)}catch(e){}return r}}

/* ================= 🏯 十三朝殘影（Gemini 71 比例 C「殘影為星」，開發者 11/10 選分散四頁、學會變清楚＋淡金光）=================
   經典世界的首頁、觀星閣、藏譜石窟、棋譜庫，天上（棋譜庫是洞口和岩壁）淡淡浮著那一朝的地標剪影（data/canying/<朝代>.webp，白底水墨轉成透明）：
   還沒學會那一站＝很淡（15%）；學會了＝清楚（70%）＋淡金光。點一下說是哪一朝的什麼。夜景圖時改淡白色。
   四頁照朝代順序分：首頁（經典、秦、漢、三國）、觀星閣窗外（魏晉、南北朝、隋）、藏譜石窟（唐、五代、宋）、棋譜庫（元、明、清）。
   位置＝[朝代, 左%, 上%, 寬%]（量 768×1376 的定稿圖，只放在天空、洞口、岩壁，不壓入口標籤）。用 MutationObserver 找頁面，不用改各頁的程式 */
const CY_ON=true,CY_V="2215";
const CY_SPOT={home:[["classic",5,6,12],["qin",21,10.5,11],["han",36.5,6.5,10],["sanguo",47.5,3,10]],   /* 11/14 r17 B2：夜景首頁的月亮（07w6c 熱區 x 146～270、y 4～128，原圖 768×1376）原本壓在秦、漢殘影上，點不準；秦移到月亮正下方，其餘左右讓開 */battle:[["weijin",11,5,13],["nanbei",81,5,13],["sui",93,16,10]],
  learn:[["tang",10,6,13],["wudai",50,3.5,9],["song",89,6,13]],lib:[["yuan",71,12,11],["ming",14,34,13],["qing",89,47,11]]};
const CY_NM={classic:"千秋石桌與古松",qin:"秦長城與烽火台",han:"漢闕",sanguo:"赤壁樓船",weijin:"竹林茅亭",nanbei:"雲岡石窟",sui:"趙州橋",tang:"大雁塔",wudai:"山水座屏",song:"水轉筒車",yuan:"草原大帳",ming:"紫禁城角樓",qing:"古戲台"};
function cyCss(){if(document.getElementById("cyCss"))return;const s=document.createElement("style");s.id="cyCss";s.textContent=`.cy-l{position:absolute;inset:0;pointer-events:none;z-index:1}
.cy{position:absolute;transform:translate(-50%,-50%);pointer-events:auto;background:none;border:0;padding:0;margin:0;opacity:.15;transition:opacity 1.2s;animation:cyF 7s ease-in-out infinite}
.cy img{width:100%;display:block}.cy.ln{opacity:.7}.cy.ln img{filter:drop-shadow(0 0 3px rgba(240,200,110,.95)) drop-shadow(0 0 9px rgba(240,200,110,.55))}
.cy-l.nt .cy img{filter:invert(1) brightness(.9)}.cy-l.nt .cy.ln img{filter:invert(1) brightness(.95) drop-shadow(0 0 4px rgba(240,200,110,.9))}
@keyframes cyF{0%,100%{margin-top:0}50%{margin-top:-.6%}}@media (prefers-reduced-motion:reduce){.cy{animation:none}}`;document.head.append(s)}
function cyPage(src){return/homemap\/home_classic/.test(src)?"home":/hubmap\/battle_classic/.test(src)?"battle":/hubmap\/learn_classic/.test(src)?"learn":/libmap\/lib_classic/.test(src)?"lib":""}
function cyMount(P,img){const src=img.getAttribute("src")||"",pg=cyPage(src),nt=/_night/.test(src);let L=P.querySelector(":scope>.cy-l");
  if(!pg||!(typeof hbIsCl==="function"&&hbIsCl())){if(L)L.remove();return}
  const key=pg+"|"+nt;if(L&&L.dataset.k===key)return;cyCss();
  if(!L){L=document.createElement("div");L.className="cy-l";img.after(L)}L.dataset.k=key;L.classList.toggle("nt",nt);
  L.innerHTML=CY_SPOT[pg].map(([e,x,y,w],i)=>{let ln=false;try{ln=typeof shipLearned==="function"&&shipLearned(e)}catch(x){}
    return`<button class="cy${ln?" ln":""}" data-cy="${e}" style="left:${x}%;top:${y}%;width:${w}%;animation-delay:${-i*1.7}s" aria-label="${esc(CY_NM[e])}"><img src="data/canying/${e}.webp?v=${CY_V}" alt=""></button>`}).join("");
  L.querySelectorAll("[data-cy]").forEach(b=>b.onclick=ev=>{ev.stopPropagation();const e=b.dataset.cy,ln=b.classList.contains("ln");let nm=e;try{nm=eraLabel(e)}catch(x){}
    toast(`🏯 ${nm}的殘影・${CY_NM[e]}：${ln?"這一站學會了，殘影清楚起來了":"在雲河裡學會這一站，殘影就會變清楚"}`)})}
function cyScan(){if(!CY_ON)return;try{document.querySelectorAll(".shp-page.cq>img").forEach(img=>cyMount(img.parentElement,img))}catch(e){}}
if(CY_ON&&typeof MutationObserver==="function"){let q=0;new MutationObserver(()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;cyScan()})}).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]})}
