/* 回饋 845（開發者 11/9 選：折衷先載）：產生 data/preload.json（開 App 要檢查／下載的外觀檔清單）。
   原本寫在 build-site.js 5.9 節，抽出來成函式：build-site.js 照樣呼叫；也可以單獨對 site/ 跑一次、輸出到別處驗證：
     node xiangqi-lab/tools/preload-list.js <site 資料夾> <輸出的 preload.json>
   每一項是 [網址, 大小, 內容指紋前 8 碼, 層級]：
     層級 0      ＝首批（開 App 先載好才進首頁），不分朝代
     層級 "<朝代>" ＝首批，但只有玩家目前在這個朝代時才算首批（例如 icons/yuan/、boards/yuan.webp）
     層級 1      ＝背景（進首頁以後慢慢下載）
   舊版 App 只讀前三格，第四格會被忽略（舊版照舊全部載完才進首頁）。
   pages：哪一頁要先有哪些檔（資料夾規則，{e}＝玩家目前的朝代，{1}＝網址第二段）；玩家走進一頁而那些檔還沒下載到，App 只為那一頁蓋等待畫面、優先下載。 */
const fs=require("fs"),path=require("path"),crypto=require("crypto");
/* 只列「外觀快取」那些資料夾（跟 sw.js 的 xqlab-look 規則一樣）；特級大師對局、全國比賽、神經網路這些大型選購資料不在裡面 */
const DIRS=["qianqiu","shipmap","battles","canju","fonts","lines","boards","pieces","glyphs","sfx","voice","qa","park","park3d","pika2","path","inn","map","stonetable","treasure","legend","champ","stones","seat","pano","journey","xs","people","icons","arenagate","parkgate","pset","map3d","levels","npc","loading","pika","blind","actors","tripo_app","eramap","relics","inkfx","yizhan","hubmap","homemap","lobbymap","setmap","libmap","tabink","feedback","campmap","canjumap","thememap","termsmap","todaymap","gmmap","cupmap","redomap","exammap","statmap","studymap","openmap","deskmap","rostermap","passmap","seasonbox","tabtube","ximarket","gxground","guanxing"];   /* 開發者 11/4：開 App 時全部載好；真實 3D 和地圖由 App 照設定挑 */
const ERAS=["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];
const ERA_RE=new RegExp("[/_.](" + ERAS.join("|") + ")([/_.-]|$)");
const eraOf=u=>{const m=ERA_RE.exec(u);return m?m[1]:null};
/* 首批＝進首頁和第一盤棋需要的：介面圖示、字型、首頁和底欄、目前朝代的渡口和驛站、棋盤、棋子、走棋音效、3D 小人（對手立繪、小帥、棋童）、載入畫面的水墨畫，以及小的清單檔 */
const FIRST=[
  /^data\/(icons|fonts|homemap|tabink|hubmap|loading|sfx|voice|glyphs|boards|pieces|pset|champ|npc|actors|journey|pika|pika2|xs|seat|stones|pano|park3d|parkgate|arenagate|inn|yizhan|seasonbox|lines)\//,
  /^data\/(lobbymap|setmap|libmap|feedback|campmap|canjumap|thememap|termsmap|todaymap|gmmap|cupmap|redomap|exammap|statmap|studymap|openmap|deskmap|rostermap|passmap|tabtube)\//,   /* 各頁的滿版圖（日、夜版，每頁約 250 KB）：底欄、學習／對戰各頁一點就到，放首批免得一直等 */
  /^data\/park\/(?!j)/,                         /* 目前朝代的園子（j 開頭是石桌往事各章的園子，背景） */
  /^data\/eramap\//,                            /* 朝代地圖（App 只挑手機版或電腦版） */
  /^data\/shipmap\/(port_|layers\/sm_mist)/,    /* 渡口 */
  /^data\/tripo_app\/(c_|me_|k_pika|[^/]+\.json$)/   /* 真實 3D（只有選了真實版才下載）：擂主、棋童、小帥 */
];
const SMALL_LIST=300*1024;   /* 300 KB 以下的 .json／.txt 清單也放首批（大的題庫、問答在背景） */
/* 11/11 學習、對戰四季日夜圖（<名>_<季>[_night].webp，208 張）放背景：首批只等原圖，不然每個人開 App 要多等十幾 MB */
const tierOf=(u,size)=>{if(/^data\/hubmap\/[a-z_]+_(spring|summer|autumn|winter)(_night)?\.webp$/.test(u))return 1;if(/^data\/homemap\/home_[a-z_]+_pano_[lr]\.webp$/.test(u))return 1;   /* 11/14 首頁三屏長卷的左右屏（18 張約 2.9 MB）放背景：晚到只是左右兩屏晚一點出現 */const first=FIRST.some(r=>r.test(u))||(/\.(json|txt)$/.test(u)&&size<=SMALL_LIST);if(!first)return 1;return eraOf(u)||0};
/* 各頁要先有的檔（資料夾規則）。鍵＝網址第一段，或「第一段/第二段」；""＝首頁。
   對局頁（cpu、arena…）要的棋盤、棋子、園子都在目前朝代的首批裡——App 進每一頁前都會順便確認目前朝代的首批（玩家換了朝代時才會用到） */
const PAGES={
  "":["^data/(tabink|seasonbox)/","^data/homemap/home(_(snow|rain|spring|summer|autumn|winter)(_(dawn|dusk))?)?\\.webp","^data/homemap/home_{e}_(?![a-z_]*pano_)"],   /* 11/9 首頁照停靠朝代換圖：只等宋代那套和目前朝代的四季，其他朝代的在背景下載 */
  "today":["^data/todaymap/"],"gm":["^data/gmmap/"],"feedback":["^data/feedback/"],
  "hub":["^data/hubmap/(learn|battle|battle_red|battle_curtain)\\.webp","^data/hubmap/[a-z_]+_{e}\\.webp"],   /* 11/9 學習、對戰照停靠朝代換圖：只等原圖和目前朝代的 learn_<朝>／battle_*_<朝>，其他朝代的在背景下載（各朝檔名靠 ERA_RE 分到各朝層級） */
  "arena":["^data/arenagate/{e}"],
  "journey/play":["^data/park/j"],
  "port":["^data/shipmap/port_{e}","^data/shipmap/layers/sm_mist"],
  "adventure":["^data/shipmap/(ship_map|qq_ship)","^data/shipmap/layers/(sm_star|sm2_)"],
  "ship":["^data/shipmap/(page_|layers/)"],
  "ship/read":["^data/shipmap/(novel/|book)"],
  "shelf":["^data/shipmap/book","^data/stonetable/","^data/levels/b{1}"],"shelf/1":["^data/levels/(cg|lv|item)"],   /* 第一集也沿用舊的 cg、lv 插畫 */
  "journey":["^data/stonetable/","^data/shipmap/book","^data/(path|map)/","^data/levels/(cg|lv|item)"],
  "legend":["^data/(qianqiu|people|stonetable|legend)/"],
  "battle":["^data/shipmap/port_[a-z]+\\.webp","^data/battles/{1}_","^data/inkfx/"],
  "qqev":["^data/shipmap/qq_ship"],
  "lobby":["^data/lobbymap/(lobby|table_empty|table_game|lantern_on|lantern_off|fig_sit|fig_lean|fig_fan)\\.webp","^data/lobbymap/[a-z_]+_{e}\\.webp","^data/rostermap/"],"cup":["^data/(cupmap|arenagate)/"],   /* 11/9 線上大廳照停靠朝代換圖：只等原圖、原素材和目前朝代的 <素材>_<朝>（各朝檔名靠 ERA_RE 分到各朝層級），其他朝代的在背景下載 */
  "settings":["^data/(setmap|passmap)/"],"db":["^data/libmap/lib\\.webp","^data/libmap/lib_{e}\\.webp","^data/deskmap/"],"camp":["^data/campmap/"],"theme":["^data/thememap/"],"terms":["^data/termsmap/"],
  "canju":["^data/canjumap/"],"redo":["^data/redomap/"],"openings":["^data/openmap/"],"stats":["^data/statmap/"],"quiz":["^data/exammap/"],
  "guanxing":["^data/guanxing/"],"ximarket":["^data/ximarket/"],"me":["^data/studymap/"],"profile":["^data/studymap/"],"me/relics":["^data/(studymap|relics)/"]
};
function makePreload(SITE){
  const items=[];const walk=(d,rel)=>{if(!fs.existsSync(d))return;for(const f of fs.readdirSync(d,{withFileTypes:true}).sort((x,y)=>x.name<y.name?-1:1)){const p=path.join(d,f.name),r=rel+"/"+f.name;
    if(f.isDirectory())walk(p,r);else if(!/\.old|^\./.test(f.name)){const u=r.slice(1),sz=fs.statSync(p).size;items.push([u,sz,crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0,8),tierOf(u,sz)])}}};   /* 第三格是內容指紋：圖換了但檔名一樣，手機靠它知道要重新下載（秦、漢黑棋換新圖後手機還是舊的） */
  for(const k of DIRS)walk(path.join(SITE,"data",k),"/data/"+k);
  /* 版本只看網址、大小、指紋（跟以前一樣），只改層級不會讓手機以為檔案換了 */
  const ph=crypto.createHash("sha1");for(const[u,s,x]of items)ph.update(u+":"+s+":"+x+";");
  /* 存在「不跟版本走」快取的大檔（特級大師對局）：記大小和指紋，App 發現內容換了就把手機裡的舊檔刪掉，下次用到時重抓 */
  const big=["data/gmgames.json"].filter(u=>fs.existsSync(path.join(SITE,u))).map(u=>{const p=path.join(SITE,u);return[u,fs.statSync(p).size,crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0,8)]});
  const first=items.filter(x=>x[3]!==1);
  return{v:ph.digest("hex").slice(0,10),n:items.length,bytes:items.reduce((t,x)=>t+x[1],0),first0:first.filter(x=>x[3]===0).reduce((t,x)=>t+x[1],0),items,big,pages:PAGES}}
/* 某個朝代的玩家用手機、Q 版（沒有真實 3D、朝代地圖只抓手機版）時，首批的檔（跟 App 09b-preload.js 的篩法一樣） */
const firstItems=(M,e)=>M.items.filter(x=>(x[3]===0||x[3]===e)&&!/^data\/tripo_app\//.test(x[0])&&!(/^data\/eramap\/.+\.webp$/.test(x[0])&&!/_m\.webp$/.test(x[0])));
const firstBytes=(M,e)=>firstItems(M,e).reduce((t,x)=>t+x[1],0);
module.exports={makePreload,eraOf,ERAS,PAGES,firstItems,firstBytes};
if(require.main===module){const[site,out]=process.argv.slice(2);if(!site||!out){console.log("用法：node preload-list.js <site 資料夾> <輸出檔>");process.exit(1)}
  const M=makePreload(site);fs.writeFileSync(out,JSON.stringify(M));
  const MB=b=>(b/1048576).toFixed(1)+" MB";console.log("全部",M.n,"個檔",MB(M.bytes),"；首批（不分朝代）",MB(M.first0));
  for(const e of ERAS)console.log("  朝代",e.padEnd(7),"手機首批",firstItems(M,e).length,"個檔",MB(firstBytes(M,e)))}
