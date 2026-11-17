/* ================= 🎮 原生 App：Game Center 成就與排行榜、今日茶單桌面小工具（11/17，story/上架原生App待辦.md 第 3、4 項）=================
   只在 iOS 原生 App 裡動（xqNat() 而且有 window.XQNative，由 xiangqi-ios/src/native-bridge.js 設）；網頁版這支檔整個不做事（不包函式、不掛事件、不碰存檔）。
   原生那邊：xiangqi-ios/native/ios/XQGameCenterPlugin.swift（外掛名 XQGameCenter）、XQWidgetDataPlugin.swift（XQWidgetData）、native/ios-widget/XQTodayWidget.swift（小工具）。
   ① 接線（gcnGlue）：native-bridge.js 沒有 XQNative.gc／XQNative.widget 時，這裡補上（都經 XQNative.plug 叫外掛；外掛沒裝、沒登入一律回 {ok:false}，不丟錯）。
      點小工具開 App：xqqianqiu://canju → #/canju（只認 GCN_LINKS 列的幾個）。
   ② Game Center：開 App 載入完 4 秒後在背景問「登入了沒」（不跳登入畫面、不擋遊戲；玩家拒絕也照玩）。登入了就把存檔裡已有的進度全部補報一次（gcnReportAll），
      之後在下面這些時候重算、只報「比這次開 App 已報過的更多」的：存檔寫入 GCN_KEYS 裡的鍵（包一層 store.set）、換頁（hashchange）、回到前景。
      成就對應表 GCN_ACH（id 先用佔位 qianqiu.ach.*，App Store Connect 建好後只改 GCN_PRE 或個別 id）；每一項的 f(C) 回 0～100（多少件的成就回進度百分比）。
      C＝gcnCtx() 從既有的存檔鍵即時算，不新增任何存檔鍵：
        珍品  store "relics"＝{朝代:[珍品 id]}（07-legend.js relicDrop、07v relicSightDrop、07c cjRelic 等都寫這裡），稀有度看 data/relics/relics.json（relicsData()）；
             store "relicSolved"＝{珍品 id:{at,p}}（07c-canju.js 珍品藏局不看答案解開）；一朝 10 件都收到又都解開＝珍品冊朝代名變金色（relicBook 同一條件）。
        千秋印 07i2-seal.js 的 sealLitN()／sealGoldN()（從 shipLearn、xq_arenaStamps、battle*、yuRoute 即時算；鑄成金印時 sealGoldCheck 寫 store "sealGold"）。
        星門圍城 store "gsv"（07bhg-gatesiege.js gsvProg）：c[關].w>0＝破關；章節照 GSV.CHP（序章 31～39、第一章 1～6、第二章 7～12）。
        一盞茶 store "cj".st（07c-canju.js）：best＝最長連續天數。修為 store "xp"、等級 xpInfo()（07-legend.js）。段位分 localStorage xq_cpuRate.pts（rankInfo()）。
      排行榜 GCN_LB：累積修為、段位分（Game Center 只留最高分）。
   ③ 今日茶單小工具：開 App、回到前景、茶單進度（store "cj"）變了，就把今天的節氣（tdTerm，07y5-todaymap.js）、茶單三題（cjToday，07c-canju.js）、
      完成幾題、連續天數，和節氣圖（首頁那一季的圖 data/homemap/home_<朝代_>季.webp，季節照 07w7-seasons.js SW7_HSEA）交給 XQNative.widget.setToday；內容沒變就不送。
   ④ 入口：千秋印譜（sealBook）、珍品冊（relicBook）最下面多一顆「🎮 Game Center 成就」（只有原生 App、外掛在才出現）。
   不收資料：這支檔不連網、不送任何東西到我們的伺服器（成就與分數只交給手機上的 Game Center，小工具資料只寫手機上的 App Group）。
   測試：xiangqi-lab/tools/test-gc-native-1117.js。前綴 gcn／GCN（11/17 grep 過沒撞名）。 */
const GCN_ON=true,GCN_LB_ON=false,GCN_PRE="qianqiu.ach.",GCN_LB_PRE="qianqiu.lb.",GCN_BOOT_MS=4000,GCN_KICK_MS=1500;
/* 成就對應表：k＝id 後半、pt＝Game Center 點數（全部加起來 ≤1000、每項 ≤100）、zh／en＝名稱、dzh／den＝說明、ev＝程式裡什麼時候會變（給人看的）、f(C)＝進度 0～100 */
const gcnPct=(n,N)=>N>0?Math.max(0,Math.min(100,Math.floor(n*100/N))):0;
const GCN_ACH=[
  {k:"relic_first",pt:10,zh:"初得珍品",en:"First Treasure",dzh:"收到第一件朝代珍品。",den:"Collect your first dynasty treasure.",ev:"store relics 第一次有東西（relicDrop／relicSightDrop／cjRelic…）",f:C=>C.rel>=1?100:0},
  {k:"relic_10",pt:20,zh:"珍品十件",en:"Ten Treasures",dzh:"收藏 10 件朝代珍品。",den:"Collect 10 dynasty treasures.",ev:"store relics 總件數",f:C=>gcnPct(C.rel,10)},
  {k:"relic_50",pt:40,zh:"珍品半百",en:"Fifty Treasures",dzh:"收藏 50 件朝代珍品。",den:"Collect 50 dynasty treasures.",ev:"store relics 總件數",f:C=>gcnPct(C.rel,50)},
  {k:"relic_all",pt:100,zh:"百寶齊全",en:"Every Treasure",dzh:"13 個朝代的 130 件珍品全部收齊。",den:"Collect all 130 treasures from the 13 dynasties.",ev:"store relics 總件數＝relics.json 全部",f:C=>gcnPct(C.rel,C.relN)},
  {k:"relic_legend",pt:30,zh:"傳說珍品",en:"A Legendary Find",dzh:"收到一件「傳說」等級的珍品。",den:"Find a treasure of Legendary rarity.",ev:"store relics 裡有 rarity＝legend 的",f:C=>C.relLeg>=1?100:0},
  {k:"relic_puzzle",pt:15,zh:"珍品藏局初解",en:"Hidden Puzzle Solved",dzh:"不看答案解開一局珍品藏局。",den:"Solve a treasure's hidden puzzle without viewing the answer.",ev:"store relicSolved 第一次有東西（07c-canju.js #/canju/z/）",f:C=>C.relSolved>=1?100:0},
  {k:"relic_era_gold",pt:60,zh:"一朝藏局全解",en:"A Dynasty Fully Solved",dzh:"一個朝代的 10 件珍品都收到、藏局也都解開。",den:"Collect all 10 treasures of one dynasty and solve every hidden puzzle.",ev:"珍品冊朝代名變金色的同一條件",f:C=>C.relEraGold>=1?100:0},
  {k:"seal_first",pt:10,zh:"千秋印初亮",en:"First Seal Edge",dzh:"千秋印亮起第一邊。",den:"Light the first edge of a Qianqiu seal.",ev:"sealLitN()≥1（棋理、擂台、古戰場、輿圖任一關）",f:C=>C.sealLit>=1?100:0},
  {k:"seal_gold",pt:30,zh:"鑄成金印",en:"First Gold Seal",dzh:"第一次鑄成金印。",den:"Forge your first gold seal.",ev:"sealGoldN()≥1（sealGoldCheck 寫 store sealGold）",f:C=>C.sealGold>=1?100:0},
  {k:"seal_gold_7",pt:60,zh:"金印七方",en:"Seven Gold Seals",dzh:"鑄成 7 方金印。",den:"Forge 7 gold seals.",ev:"sealGoldN()",f:C=>gcnPct(C.sealGold,7)},
  {k:"seal_master",pt:100,zh:"千秋印主",en:"Master of the Seals",dzh:"13 方千秋印都鑄成金印。",den:"Turn all 13 Qianqiu seals to gold.",ev:"sealGoldN()＝13（稱號「千秋印主」sealTitle）",f:C=>gcnPct(C.sealGold,C.sealN)},
  {k:"siege_prologue",pt:30,zh:"星槎序章結業",en:"Star Raft Graduate",dzh:"星門圍城：打贏序章全部 9 關。",den:"Star Gate Siege: win all 9 prologue stages.",ev:"store gsv.c[31～39].w>0（gsvResult）",f:C=>gcnPct(C.sg[0][0],C.sg[0][1])},
  {k:"siege_ch1",pt:40,zh:"星門入侵",en:"Gate Invasion",dzh:"星門圍城：打贏第一章全部 6 關。",den:"Star Gate Siege: win all 6 stages of Chapter 1.",ev:"store gsv.c[1～6].w>0",f:C=>gcnPct(C.sg[1][0],C.sg[1][1])},
  {k:"siege_ch2",pt:50,zh:"俥路調度",en:"Chariot Maneuvers",dzh:"星門圍城：打贏第二章全部 6 關。",den:"Star Gate Siege: win all 6 stages of Chapter 2.",ev:"store gsv.c[7～12].w>0",f:C=>gcnPct(C.sg[2][0],C.sg[2][1])},
  {k:"tea_7",pt:20,zh:"七日茶香",en:"A Week of Tea",dzh:"一盞茶連續 7 天喝完今日茶單。",den:"Finish the daily tea menu 7 days in a row.",ev:"store cj.st.best（cjStreakHit）",f:C=>gcnPct(C.cjBest,7)},
  {k:"tea_30",pt:50,zh:"月月有茶",en:"A Month of Tea",dzh:"一盞茶連續 30 天喝完今日茶單。",den:"Finish the daily tea menu 30 days in a row.",ev:"store cj.st.best",f:C=>gcnPct(C.cjBest,30)},
  {k:"lv_10",pt:15,zh:"修為十級",en:"Level 10",dzh:"棋道修行升到 Lv 10。",den:"Reach cultivation level 10.",ev:"store xp → xpInfo().L（addXP）",f:C=>gcnPct(C.lv,10)},
  {k:"lv_50",pt:50,zh:"修為五十級",en:"Level 50",dzh:"棋道修行升到 Lv 50（棋豪）。",den:"Reach cultivation level 50.",ev:"store xp → xpInfo().L",f:C=>gcnPct(C.lv,50)}];
/* 排行榜：v(C)＝要送的分數（0＝不送） */
const GCN_LB=[
  {k:"xp",zh:"累積修為",en:"Total Cultivation",ev:"store xp（addXP）",v:C=>C.xp},
  {k:"rank",zh:"段位分",en:"Rank Points",ev:"localStorage xq_cpuRate.pts（晉級賽，local.js 寫）",v:C=>C.rank}];
/* 存檔寫入這些鍵時重算成就（"cj" 另外會更新小工具） */
const GCN_KEYS=new Set(["relics","relicSolved","sealGold","gsv","cj","xp","yuRoute","shipLearn","shipSolved","eraOpen","battleSeal","battleTitle","battleVol","battleVolY","battleGrand","battleVolLegacy","chd"]);
const GCN_LINKS={"":"#/","home":"#/","canju":"#/canju","today":"#/today"};
/* 小工具的英文（跟 07i18n.js 同一套譯名） */
const GCN_TERM_EN={"小寒":"Minor Cold","大寒":"Major Cold","立春":"Start of Spring","雨水":"Rain Water","驚蟄":"Awakening of Insects","春分":"Spring Equinox","清明":"Clear and Bright","穀雨":"Grain Rain",
  "立夏":"Start of Summer","小滿":"Grain Buds","芒種":"Grain in Ear","夏至":"Summer Solstice","小暑":"Minor Heat","大暑":"Major Heat","立秋":"Start of Autumn","處暑":"End of Heat",
  "白露":"White Dew","秋分":"Autumn Equinox","寒露":"Cold Dew","霜降":"Frost's Descent","立冬":"Start of Winter","小雪":"Minor Snow","大雪":"Major Snow","冬至":"Winter Solstice"};
const GCN_SLOT={sip:["☕","一口","One sip"],cup:["🍵","一盞","One cup"],pot:["🫖","一壺","One pot"]};
const GCN_TYPE_EN={"一步定勝負":"One move decides","短殺":"Short mate","中殺":"Medium mate","大師收官":"Master finish","古譜校錯":"Old manual corrections"};
const GCN_LV_EN={"入門":"Beginner","初級":"Elementary","中級":"Intermediate","中高級":"Upper intermediate","高級":"Advanced"};
const GCN={inst:false,auth:false,done:{},lb:{},busy:false,again:false,kickT:0,wDirty:false,wLast:"",R:null,rAsk:false};

function gcnNat(){try{return GCN_ON&&typeof xqNat==="function"&&!!xqNat()&&!!window.XQNative&&typeof window.XQNative.plug==="function"}catch(e){return false}}
const gcnLang=()=>{try{return typeof i18nLang==="function"&&i18nLang()==="en"?"en":"zh"}catch(e){return"zh"}};
const gcnId=a=>GCN_PRE+a.k,gcnLbId=b=>GCN_LB_PRE+b.k;

/* ---------- ① 接線 ---------- */
function gcnCall(name,m,o){const N=window.XQNative;try{if(!N||typeof N.plug!=="function"||(typeof N.has==="function"&&!N.has(name)))return Promise.resolve({ok:false,reason:"unavailable"});
    const P=N.plug(name);if(!P||typeof P[m]!=="function")return Promise.resolve({ok:false,reason:"unavailable"});
    return Promise.resolve(P[m](o||{})).then(r=>r||{ok:true},e=>({ok:false,reason:String((e&&(e.message||e.errorMessage))||e||"error")}))}catch(e){return Promise.resolve({ok:false,reason:"error"})}}
function gcnGlue(){const N=window.XQNative;if(!N)return;const has=n=>{try{return typeof N.has==="function"?!!N.has(n):!!N.plug(n)}catch(e){return false}};
  if(!N.gc)N.gc={available:()=>has("XQGameCenter"),
    authenticate:()=>gcnCall("XQGameCenter","authenticate",{}),
    reportAchievement:(id,p)=>gcnCall("XQGameCenter","reportAchievement",{id:String(id||""),percent:Math.max(0,Math.min(100,+p||0))}),
    submitScore:(lb,v)=>gcnCall("XQGameCenter","submitScore",{leaderboardId:String(lb||""),value:Math.max(0,Math.floor(+v||0))}),
    showDashboard:(view,lb)=>gcnCall("XQGameCenter","showDashboard",lb?{view:String(view||"dashboard"),leaderboardId:String(lb)}:{view:String(view||"dashboard")}),
    onAuth:cb=>{try{const P=has("XQGameCenter")&&N.plug("XQGameCenter");if(P&&typeof P.addListener==="function")P.addListener("authChange",st=>{try{cb(st||{})}catch(e){}})}catch(e){}}};
  if(!N.widget)N.widget={available:()=>has("XQWidgetData"),
    setToday:(json,img)=>gcnCall("XQWidgetData","setToday",{json:typeof json==="string"?json:JSON.stringify(json||{}),imagePath:String(img||"")})}}
const gcnGC=()=>{try{return window.XQNative&&window.XQNative.gc||null}catch(e){return null}};
const gcnWG=()=>{try{return window.XQNative&&window.XQNative.widget||null}catch(e){return null}};
/* 小工具網址 → 頁面（只認 GCN_LINKS） */
function gcnLinkHash(u){const m=/^xqqianqiu:\/\/([a-z]*)\/?(?:[?#].*)?$/i.exec(String(u||""));if(!m)return"";const k=m[1].toLowerCase();return Object.prototype.hasOwnProperty.call(GCN_LINKS,k)?GCN_LINKS[k]:""}
function gcnGoLink(u){const h=gcnLinkHash(u);if(!h)return"";const run=()=>{try{if(location.hash!==h)location.hash=h}catch(e){}};
  if(document.readyState==="complete")setTimeout(run,300);else addEventListener("load",()=>setTimeout(run,800));return h}
function gcnLinks(){try{const A=window.XQNative.plug("App");if(A&&typeof A.addListener==="function")A.addListener("appUrlOpen",ev=>gcnGoLink(ev&&ev.url))}catch(e){}}

/* ---------- ② Game Center ---------- */
function gcnSiege(){const D=[[31,32,33,34,35,36,37,38,39],[1,2,3,4,5,6],[7,8,9,10,11,12]];let L=D;
  try{if(typeof GSV!=="undefined"&&GSV&&Array.isArray(GSV.CHP))L=[0,1,2].map(n=>{const c=GSV.CHP.find(x=>x.n===n);return c&&Array.isArray(c.lv)&&c.lv.length?c.lv:D[n]})}catch(e){}
  let P=null;try{P=store.get("gsv",null)}catch(e){}const mode=typeof GSV!=="undefined"&&GSV&&GSV.MODE?GSV.MODE:"gate-siege-v1";
  const c=P&&typeof P==="object"&&P.mv===mode&&P.c&&typeof P.c==="object"?P.c:{};
  return L.map(lv=>[lv.filter(k=>c[k]&&c[k].w>0).length,lv.length])}
function gcnCtx(){const C={rel:0,relN:130,relLeg:0,relSolved:0,relEraGold:0,sealLit:0,sealGold:0,sealN:13,lv:1,xp:0,cjBest:0,rank:0,sg:[[0,9],[0,6],[0,6]]};
  let M={},Z={};try{M=store.get("relics",{})||{};for(const e in M)C.rel+=Array.isArray(M[e])?M[e].length:0}catch(e){}
  try{Z=store.get("relicSolved",{})||{};C.relSolved=Object.keys(Z).length}catch(e){}
  const R=GCN.R;if(R&&typeof R==="object"){try{let n=0;for(const e of Object.keys(R)){const L=Array.isArray(R[e])?R[e]:[],h=Array.isArray(M[e])?M[e]:[];n+=L.length;
      C.relLeg+=L.filter(x=>x&&x.rarity==="legend"&&h.includes(x.id)).length;if(L.length&&L.every(x=>x&&Z[x.id]&&h.includes(x.id)))C.relEraGold++}if(n)C.relN=n}catch(e){}}
  try{if(typeof sealAll==="function"){const L=sealAll()||[];C.sealLit=L.reduce((a,S)=>a+(+S.n||0),0);C.sealGold=L.filter(S=>S&&S.gold).length;C.sealN=L.length||13}   /* 等於 sealLitN()／sealGoldN()，只算一次 */
    else{if(typeof sealLitN==="function")C.sealLit=+sealLitN()||0;if(typeof sealGoldN==="function")C.sealGold=+sealGoldN()||0}}catch(e){}
  try{C.xp=Math.max(0,+store.get("xp",0)||0);C.lv=typeof xpInfo==="function"?(+xpInfo(C.xp).L||1):1}catch(e){}
  try{const T=(store.get("cj",null)||{}).st||{};C.cjBest=Math.max(+T.best||0,+T.n||0)}catch(e){}
  try{C.rank=typeof rankInfo==="function"?Math.max(0,+rankInfo().p||0):Math.max(0,+((JSON.parse(localStorage.getItem("xq_cpuRate")||"null")||{}).pts)||0)}catch(e){}
  try{C.sg=gcnSiege()}catch(e){}
  return C}
/* 每一項成就現在的進度：[[id,百分比]]，只列 >0 的 */
function gcnEval(C){C=C||gcnCtx();const out=[];for(const a of GCN_ACH){let p=0;try{p=Math.max(0,Math.min(100,Math.floor(+a.f(C)||0)))}catch(e){p=0}if(p>0)out.push([gcnId(a),p])}return out}
/* 稀有度、一朝全解要 relics.json：第一次用到時讀（安裝包裡的本機檔），讀好再算一次 */
function gcnRelicData(){if(GCN.R||GCN.rAsk||typeof relicsData!=="function")return;GCN.rAsk=true;
  try{Promise.resolve(relicsData()).then(R=>{GCN.R=R&&typeof R==="object"?R:{};gcnKick()},()=>{})}catch(e){}}
/* 補報＋新進度：只報比這次開 App 已報過的更多的（同一項已經 100％ 的，原生那邊也會跳過，不會一直跳橫幅） */
function gcnKid(){try{return typeof fmKid==="function"&&!!fmKid()}catch(e){return false}}   /* 兒童模式：不回報成就（E 第 19 輪 N2，跟家長說明「一次關掉所有資料上傳」一致） */
async function gcnReportAll(){const G=gcnGC();if(!gcnNat()||!G||!GCN.auth||gcnKid())return 0;if(GCN.busy){GCN.again=true;return 0}GCN.busy=true;let n=0;
  try{gcnRelicData();const C=gcnCtx();
    for(const[id,p]of gcnEval(C)){if(p<=(GCN.done[id]||0))continue;let r=null;try{r=await G.reportAchievement(id,p)}catch(e){r=null}
      if(r&&r.ok){GCN.done[id]=p;n++}else if(r&&r.reason==="notAuthenticated"){GCN.auth=false;break}}
    if(GCN_LB_ON&&GCN.auth)for(const b of GCN_LB){let v=0;try{v=Math.floor(+b.v(C)||0)}catch(e){}const id=gcnLbId(b);if(v<=0||v<=(GCN.lb[id]||0))continue;
      let r=null;try{r=await G.submitScore(id,v)}catch(e){r=null}if(r&&r.ok){GCN.lb[id]=v;n++}}}
  finally{GCN.busy=false}
  if(GCN.again){GCN.again=false;gcnKick()}return n}
function gcnAuth(){const G=gcnGC();if(!gcnNat()||!G||gcnKid())return Promise.resolve(false);   /* E 第 20 輪 N20-5：兒童模式不登入 Game Center（登入畫面、儀表板有社交功能） */
  return Promise.resolve(G.authenticate()).then(r=>{GCN.auth=!!(r&&(r.authenticated||r.ok));if(GCN.auth)gcnKick();return GCN.auth},()=>false)}
function gcnRun(){gcnReportAll();if(GCN.wDirty){GCN.wDirty=false;gcnWidgetPush()}}
function gcnKick(k){if(!GCN.inst)return;if(k==="cj")GCN.wDirty=true;clearTimeout(GCN.kickT);GCN.kickT=setTimeout(gcnRun,GCN_KICK_MS)}
/* 包一層 store.set：寫到 GCN_KEYS 的鍵就排一次重算（原本的寫入照舊、先做） */
function gcnHookStore(){if(GCN.hooked||typeof store!=="object"||!store||typeof store.set!=="function")return;GCN.hooked=true;const s0=store.set;
  store.set=function(k){const r=s0.apply(this,arguments);try{if(GCN_KEYS.has(k))gcnKick(k)}catch(e){}try{if(k==="fmCfg")setTimeout(gcnFmChanged,0)}catch(e){}return r}}
function gcnFmChanged(){gcnDqFix();try{if(gcnKid()){const x=document.querySelector("#gcnBtn");if(x&&x.remove)x.remove()}else if(!GCN.auth)gcnAuth()}catch(e){}}

/* ---------- ③ 今日茶單小工具 ---------- */
function gcnTermImg(t){const sea=(typeof SW7_HSEA!=="undefined"&&SW7_HSEA&&SW7_HSEA[t])||"spring";let pre="";
  try{if(typeof hbIsCl==="function"&&hbIsCl())pre="classic_";else if(typeof sw7HomeEra==="function")pre=sw7HomeEra()?sw7HomeEra()+"_":""}catch(e){pre=""}
  return"data/homemap/home_"+pre+sea+".webp"}
async function gcnWidgetData(){const term=(()=>{try{return typeof tdTerm==="function"?tdTerm(new Date()):""}catch(e){return""}})();
  const o={v:1,day:"",lang:gcnLang(),termZh:term,termEn:GCN_TERM_EN[term]||term,items:[],doneN:0,streak:0};
  try{o.day=typeof cjDay==="function"?cjDay():""}catch(e){}
  try{if(typeof cjData==="function"&&typeof cjState==="function"){const D=await cjData(),S=cjState();
      const L=S.day===o.day&&Array.isArray(S.list)&&S.list.length?S.list:(typeof cjToday==="function"?cjToday(D,S):[]);
      o.items=(L||[]).slice(0,3).map(x=>{const P=(D&&D.byId&&D.byId[x.id])||{},s=GCN_SLOT[x.slot]||["🍵",String(x.slot||""),String(x.slot||"")],t=String(P.t||"");let lv="";
        try{lv=P.d!=null&&typeof cjLv==="function"?String(cjLv(P.d)||""):""}catch(e){lv=""}
        return{ic:s[0],zh:s[1]+(t?"・"+t:"")+(lv?"・"+lv:""),en:s[2]+(t?" · "+(GCN_TYPE_EN[t]||t):"")+(lv?" · "+(GCN_LV_EN[lv]||lv):""),done:x.st==="done"||x.st==="skip"}});
      o.doneN=o.items.filter(x=>x.done).length;try{o.streak=typeof cjStreakNow==="function"?(cjStreakNow(S).n|0):0}catch(e){}}}catch(e){}
  return o}
async function gcnWidgetPush(force){const W=gcnWG();if(!gcnNat()||!W||typeof W.setToday!=="function")return null;let o;try{o=await gcnWidgetData()}catch(e){return null}
  const img=gcnTermImg(o.termZh),js=JSON.stringify(o),key=js+"|"+img;if(!force&&key===GCN.wLast)return null;
  let r=null;try{r=await W.setToday(js,img)}catch(e){r=null}if(r&&r.ok)GCN.wLast=key;return r}

/* ---------- ④ 入口：千秋印譜、珍品冊最下面 ---------- */
function gcnSheetBtn(){try{const b=document.querySelector("#sheet .sh-b"),G=gcnGC();if(gcnKid()||!b||b.querySelector("#gcnBtn")||!G||(typeof G.available==="function"&&!G.available()))return;
    const en=gcnLang()==="en",x=document.createElement("button");x.type="button";x.className="btn ghost";x.id="gcnBtn";x.style.cssText="width:100%;margin-top:8px";
    x.textContent=en?"🎮 Game Center achievements":"🎮 Game Center 成就";
    x.onclick=()=>{Promise.resolve(G.showDashboard("achievements")).then(r=>{if(!r||!r.ok){try{toast(en?"Game Center isn't available. Sign in under Settings → Game Center.":"Game Center 現在用不了：可以到 iPhone「設定 → Game Center」登入")}catch(e){}}})};
    b.append(x)}catch(e){}}
function gcnWrapUI(){try{if(typeof sealBook==="function"){const f0=sealBook;sealBook=function(){const r=f0.apply(this,arguments);setTimeout(gcnSheetBtn,0);return r}}}catch(e){}
  try{if(typeof relicBook==="function"){const f1=relicBook;relicBook=function(){const r=f1.apply(this,arguments);Promise.resolve(r).then(()=>setTimeout(gcnSheetBtn,0),()=>{});return r}}}catch(e){}}

/* ---------- 上架原生 App 待辦 N3：鑄成金印的觸覺回饋（11/17） ---------- */
const GCN_GOLD_BUZZ=[40,60,40,60,160];
function gcnGoldBuzz(){try{if(typeof hapOn==="function"&&!hapOn())return false;if(typeof navigator==="undefined"||typeof navigator.vibrate!=="function")return false;navigator.vibrate(GCN_GOLD_BUZZ.slice());return true}catch(e){return false}}
function gcnWrapGold(){try{if(typeof sealGoldCheck!=="function"||sealGoldCheck.__gcn)return;const f0=sealGoldCheck;sealGoldCheck=function(o){const r=f0.apply(this,arguments);try{if(Array.isArray(r)&&r.length&&o&&o.fx)gcnGoldBuzz()}catch(e){}return r};sealGoldCheck.__gcn=1}catch(e){}}

/* ---------- 上架原生 App 待辦 N4：每日同題提醒開關（11/17；原生 XQNative.daily 早就有，缺開關） ---------- */
const GCN_DQ_DEF={on:false,h:19,m:30};   /* 不新增存檔鍵：狀態一律看系統裡排定的通知 */
function gcnDqApi(){try{return window.XQNative&&XQNative.daily&&typeof XQNative.daily.enable==="function"?XQNative.daily:null}catch(e){return null}}
function gcnDqOf(st){const S=Object.assign({},GCN_DQ_DEF);try{const on=st&&st.schedule&&st.schedule.on;if(st&&st.on){S.on=true;if(on){S.h=Math.max(0,Math.min(23,on.hour|0));S.m=Math.max(0,Math.min(59,on.minute|0))}}}catch(e){}return S}
function gcnDqCard(){try{const D=gcnDqApi(),v=document.getElementById("view");if(!D||!v||v.querySelector("#gcnDq")||!/^#\/daily(\/|$)/.test(location.hash||""))return;
  const box=document.createElement("div");box.id="gcnDq";box.className="card";box.setAttribute("data-noi18n","");box.style.cssText="margin:10px 12px calc(14px + env(safe-area-inset-bottom,0px));display:flex;align-items:center;gap:10px;flex-wrap:wrap";   /* E 第 19 輪 P3-1：讓開 Home 指示條 */v.append(box);
  gcnDqFix().then(moved=>Promise.resolve(typeof D.status==="function"?D.status():null).then(st=>gcnDqPaint(box,D,gcnDqOf(st),moved),()=>gcnDqPaint(box,D,gcnDqOf(null),moved)))}catch(e){}}
/* 提醒時間不能落在家長的禁玩時段（E 第 19 輪 N3）：晚上「幾點以後不能玩」late、兒童模式「提醒早點睡」night 以後，以及早上 FM_WAKE 點以前 */
function gcnDqEnd(){let end=23*60;try{if(typeof fmCfg==="function"){const c=fmCfg(),mn=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec(t||"");return m?(+m[1])*60+(+m[2]):null};const a=mn(c.late),b=c.kid?mn(c.night):null;for(const x of[a,b])if(x!=null&&x>0)end=Math.min(end,x)}}catch(e){}return end}
function gcnDqWake(){try{return typeof FM_WAKE==="number"?FM_WAKE*60:360}catch(e){return 360}}
function gcnDqOpts(){const pad=n=>String(n).padStart(2,"0"),o=[],end=gcnDqEnd(),wake=gcnDqWake();for(let h=6;h<=22;h++)for(const m of [0,30]){const t=h*60+m;if(t>=wake&&t<end)o.push(pad(h)+":"+pad(m))}
  if(!o.length)o.push(pad(Math.floor(wake/60))+":"+pad(wake%60));return o}
/* 已排好的提醒落在禁玩時段（家長事後改了時間、或舊版排的）：改排到還允許的最後一格；回傳改成的「hh:mm」，沒改回傳 ""（E 第 20 輪 N20-4）。開機、改設定同時觸發時排隊一個一個查（GCN.dqP），不會重複排 */
function gcnDqFix(){const D=gcnDqApi();if(!gcnNat()||!D||typeof D.status!=="function")return Promise.resolve("");
  return GCN.dqP=(GCN.dqP||Promise.resolve()).catch(()=>{}).then(()=>D.status()).then(st=>{const S=gcnDqOf(st),pad=n=>String(n).padStart(2,"0"),O=gcnDqOpts();if(!S.on||O.includes(pad(S.h)+":"+pad(S.m)))return"";
    const t=O[O.length-1],[h,m]=t.split(":").map(Number);return Promise.resolve(D.enable(h,m)).then(r=>{if(!(r&&r.ok))return"";if(gcnLang()==="en")gcnDqEn(h,m);GCN.dqMoved=t;return t})}).catch(()=>"")}
function gcnDqPaint(box,D,S,moved){try{if(!moved&&S.on&&GCN.dqMoved)moved=GCN.dqMoved;   /* E 第 21 輪 R21-1：改排過就一直寫「已改到」，直到有人動了提醒 */
  const en=gcnLang()==="en",pad=n=>String(n).padStart(2,"0"),opts=gcnDqOpts();
  let cur=pad(S.h)+":"+pad(S.m);const bad=!opts.includes(cur);if(bad)cur=opts[opts.length-1];
  box.innerHTML=`<label style="display:flex;align-items:center;gap:8px;min-height:44px;flex:1 1 200px"><input type="checkbox" id="gcnDqOn" ${S.on?"checked":""} style="width:22px;height:22px"><span>${en?"🔔 Remind me about the Daily Puzzle":"🔔 每天提醒我做每日同題"}</span></label><select id="gcnDqT" style="min-height:44px;font-size:16px" aria-label="${en?"Reminder time":"提醒時間"}">${opts.map(t=>`<option value="${t}"${t===cur?" selected":""}>${t}</option>`).join("")}</select>${S.on&&(bad||moved)?`<p style="flex-basis:100%;margin:0;font-size:13px;color:#b03a2e">${moved?(en?"The reminder fell in the parental rest hours, so it was moved to "+moved+".":"提醒時間落在家長設定的休息時段，已改到 "+moved+"。"):(en?"The current reminder time falls in the parental rest hours. Pick an earlier time.":"現在的提醒時間落在家長設定的休息時段，請改早一點。")}</p>`:""}`;
  const cb=box.querySelector("#gcnDqOn"),sel=box.querySelector("#gcnDqT");
  const apply=()=>{GCN.dqMoved="";try{const pm=box.querySelector("p");if(pm&&typeof pm.remove==="function")pm.remove()}catch(e){}   /* E 第 22 輪 R22-1：動了提醒就當場拿掉「已改到」那行，不用離開再回來 */
    const on=cb.checked,[h,m]=sel.value.split(":").map(Number);
    Promise.resolve(on?D.enable(h,m):D.disable()).then(r=>{if(on&&!(r&&r.ok)){cb.checked=false;try{toast(en?"Notifications are off for this app. Turn them on in iPhone Settings → Notifications.":(r&&r.why)||"沒有通知權限，可到 iPhone 設定 → 通知 打開")}catch(e){}return}
      if(on){if(en)gcnDqEn(h,m);try{toast(en?"Reminder set for "+pad(h)+":"+pad(m)+" every day":"每天 "+pad(h)+":"+pad(m)+" 提醒你")}catch(e){}}},()=>{cb.checked=false})};
  cb.onchange=apply;sel.onchange=()=>{if(cb.checked)apply()}}catch(e){}}
/* 英文介面：bridge 排的通知內容寫死中文，排好之後用同一個 id（1001）重排一次英文內容（E 第 19 輪 P3-2） */
function gcnDqEn(h,m){try{const N=window.XQNative.plug("LocalNotifications");if(!N||typeof N.schedule!=="function")return;Promise.resolve(N.cancel({notifications:[{id:1001}]})).catch(()=>{}).then(()=>N.schedule({notifications:[{id:1001,title:"Xiangqi Qianqiu · Daily Puzzle",body:"Today's puzzles are ready. Pick a sip, a cup or a pot and solve them!",schedule:{on:{hour:h,minute:m},allowWhileIdle:true},extra:{hash:"#/daily"}}]})).catch(()=>{})}catch(e){}}
function gcnWrapDaily(){try{if(typeof DailyPage!=="function"||DailyPage.__gcn)return;const f0=DailyPage;DailyPage=function(){const r=f0.apply(this,arguments);setTimeout(gcnDqCard,0);setTimeout(gcnDqCard,600);return r};DailyPage.__gcn=1}catch(e){}}

/* ---------- 開機 ---------- */
function gcnInstall(){if(GCN.inst)return false;GCN.inst=true;gcnGlue();gcnHookStore();gcnWrapUI();gcnLinks();gcnWrapGold();gcnWrapDaily();
  const G=gcnGC();try{if(G&&typeof G.onAuth==="function")G.onAuth(st=>{GCN.auth=!!(st&&st.authenticated);if(GCN.auth)gcnKick()})}catch(e){}
  addEventListener("hashchange",()=>gcnKick());
  addEventListener("xq-native-resume",()=>{gcnAuth();gcnWidgetPush();gcnDqFix()});
  const go=()=>setTimeout(()=>{gcnAuth();gcnWidgetPush();gcnDqFix()},GCN_BOOT_MS);
  if(document.readyState==="complete")go();else addEventListener("load",go);return true}
if(gcnNat())gcnInstall();
