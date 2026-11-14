/* ================= 💾 開頭畫面、存檔、選角鎖定（意見回饋 668，開發者 11/6 核准 RPG 設計師提案第一期）=================
   開頭畫面：每次冷啟動（這個分頁第一次打開）蓋在首頁上、藏在載入畫面底下，載入畫面淡出就看到；網址是深連結（#/canju/… 等）就跳過。
   存檔：3 格，放在 IndexedDB「xqlab-slots」（不放 localStorage：免得被 XQSave 再備份一份，也不佔那 5 MB）。
        只存「旅程類」的鍵（JOURNEY_KEYS）；棋手本人（線上身分、棋力測驗、天賦、棋譜紀錄）和偏好（音效、畫面）各格共用，讀檔不會動到。
   自動存檔：切到背景、每 3 分鐘、換頁（20 秒內最多一次）、每盤棋下完，存到「使用中」那一格。
   讀檔、開新旅程：只換 JOURNEY_KEYS，等 XQSave 把刪改寫進 IndexedDB（XQSave.flush）才重新開啟，免得開機時被舊資料「還原」回去。
   store（不跟存檔走）：slotCur＝使用中的格；slotMeta＝{格:摘要}（開頭畫面直接用）；exportAt＝上次匯出；saveMig1＝舊玩家過渡做完的時間
   store（旅程類）：journey＝{c:角色,sx,born,v,re}（有它就代表角色已鎖定；re=1 舊玩家還能改選一次、2＝用掉或放棄了）；playSec＝這段旅程遊玩秒數
   以後加新的進度鍵（修為、收集、故事…），記得補進 JOURNEY_KEYS，不然讀檔、開新旅程時不會跟著換 */
/* 意見回饋 669（開發者 11/6）：選角時照角色背景決定棋盤朝代（靈魂設定的十三朝主場）；朝代跟著存檔走，各格各自記得 */
/* 意見回饋 673（開發者 11/6）：選定雲河七星後，棋盤朝代跟著星槎航程解鎖——一開始只有家鄉朝代；過渡期修為每升一級，星槎照航線往下停靠一站（之後改成通過那一站的主場關卡）。小帥、小帥妹的舊旅程不鎖 */
const SHIP_ROUTE=["classic","qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];
/* 意見回饋 675（開發者 11/6 定案，評審 24）：星槎不再照修為自動停靠，改成玩家在星槎頁按「⛵ 起航」才往下一站開（不設門檻、沒有每天上限）。
   已停靠的站記在旅程鍵 shipDock（照停靠先後）；新旅程一開始是［船艙、家鄉］。舊旅程第一次讀到時，照 674 版的舊規則（shipLegacyN）把已經停靠的站算出來存進去，一站都不收回。
   eraOpen 是 674 版「蓋了站章的站」，現在只在換算舊旅程時讀 */
/* 意見回饋 674（開發者 11/6）：青石園＝星槎的船艙，每個角色一開始就能去（航線第一站固定是船艙，第二站才是家鄉朝代） */
/* hspx 11/10：開新旅程時，從角色的兩個主場（星槎航線上他當主場的站）隨機抽一個當起點，存在 journey.home；阿轍只有秦一站。舊旅程沒有 home 就照 CHAR_ERA */
const CHAR_HOMES={x_swordboy:["qin"],x_spiritgirl:["weijin","nanbei"],x_martialgirl:["wudai","song"],x_miaogirl:["han","yuan"],x_shuai:["sanguo","ming"],x_shi:["tang","ming"],x_bing:["sui","qing"]};
const jHomePick=c=>{const L=CHAR_HOMES[c]||(CHAR_ERA[c]?[CHAR_ERA[c]]:[]);return L.length?L[Math.random()*L.length|0]:null};
const jHome=J=>J?((J.home&&(CHAR_HOMES[J.c]||[]).includes(J.home))?J.home:CHAR_ERA[J.c]):null;
function shipOrder(){const J=store.get("journey",null),home=jHome(J);return home?["classic",home,...SHIP_ROUTE.filter(e=>e!==home&&e!=="classic")]:SHIP_ROUTE.slice()}
function shipLegacyN(){const O=shipOrder(),C=store.get("eraOpen",[])||[];let n=2,L=1;try{L=xpInfo().L||1}catch(e){}n=Math.max(n,L+1);O.forEach((e,i)=>{if(C.includes(e))n=Math.max(n,i+2)});return Math.min(O.length,n)}
function shipDockList(){const J=store.get("journey",null);if(!J||!WX_CHARS[J.c]||!CHAR_ERA[J.c])return null;const O=shipOrder();let D=store.get("shipDock",null);
  if(!Array.isArray(D)||!D.length){D=O.slice(0,shipLegacyN());for(const e of store.get("eraOpen",[])||[])if(O.includes(e)&&!D.includes(e))D.push(e);store.set("shipDock",D)}
  return D.filter(e=>O.includes(e))}
function shipNextStop(){const D=shipDockList();return D?shipOrder().find(e=>!D.includes(e))||null:null}
function shipSail(){const k=shipNextStop();if(!k)return null;store.set("shipDock",[...shipDockList(),k]);return k}
function eraOpenSet(){try{const D=shipDockList();return D?new Set(["classic",...D]):null}catch(e){return null}}
const eraLocked=k=>{const s=eraOpenSet();return!!(s&&!s.has(k))};
const eraLockMsg=k=>"🔒 星槎還沒停靠"+eraLabel(k)+"：到「⛵ 雲河星槎」按「起航」，星槎就會往下一站開";
/* 意見回饋 675：五級航行難度（旅程鍵 diff，1～5，預設 2＝入局；舊旅程沒有這個鍵也當入局）。隨時可以在星槎頁行囊、設定裡改。
   dx＝星槎裡的電腦對手（園子路人、驛站旅人、秘境棋友、擂主、章回棋路對弈關）加減幾段（local.js 細分 18 級的段）；
   band＝千秋殘局題目難度 d 的範圍（07f-ship.js shipBuild）；hint＝每天多送幾顆提示棋；undo＝星槎、擂台對局每盤免費悔棋次數（-1＝不限，0＝照舊用悔棋符）；
   挑戰電腦（自選）、積分挑戰、獎勵模式、線上、千秋盃、今日茶單、棋力測驗都不受影響 */
const DIFF=[{n:"聽書",fit:"新手～入門1",learn:"子力、一步殺、不漏子",dx:-3,band:[0,3],hint:2,undo:-1},
  {n:"入局",fit:"入門2～業1",learn:"2～3 步殺、捉雙、抽將",dx:0,band:[2,4],hint:1,undo:3},
  {n:"破陣",fit:"業2～業4",learn:"多步殺、棄子攻殺、基本殘局",dx:2,band:[3,5],hint:0,undo:1},
  {n:"國手",fit:"業5～業7",learn:"長殺、大師收官、防守妙手",dx:4,band:[4,6],hint:0,undo:0},
  {n:"千秋",fit:"業8 以上",learn:"大師實戰的關鍵著、古譜校錯",dx:6,band:[5,99],hint:0,undo:0}];
const diffNow=()=>{const n=+store.get("diff",2)|0;return n>=1&&n<=5?n:2},diffOf=()=>DIFF[diffNow()-1],diffDx=()=>diffOf().dx;
/* 棋力測驗的段位 → 建議難度（只在選難度畫面標「建議」，預設仍是入局） */
function diffSuggest(){try{const q=store.get("quizBest",null),r=q&&q.rank;if(!r)return 0;if(/^新手|^入門1/.test(r))return 1;if(/^入門|^業1/.test(r))return 2;const m=/^業([0-9])/.exec(r);if(m)return +m[1]<=4?3:+m[1]<=7?4:5;if(/^專/.test(r))return 5}catch(e){}return 0}
const CHAR_ERA={x_swordboy:"qin",x_spiritgirl:"nanbei",x_martialgirl:"song",x_miaogirl:"yuan",x_shuai:"ming",x_shi:"ming",x_bing:"qing"};   /* 開發者 11/6 改：世界觀定為「雲河星槎」，七人各來自自己的朝代（帥、仕同在明代徽州），棋盤就是他的家鄉朝代 */
const JOURNEY_KEYS=["sw7Box","pSex","pChar","pStyle","botPiece","onboard1","journey","playSec","era","eraOpen","xp","xpDay","xpKeys","record","hintBonus","hintUse","undoBonus","undoDropIds","bag","jarGot","lingN","giftGames","dropMiss",
  "legend","legendGame","legBook","legRead","jStars","jPending","jPrev","jRun","jScene","jHid","jMig36","jpSeen","novelRead","sceneDone","storyEraTip","eraUser","study","campSeen","campStars",
  "npcBond","npcAsk","npcAskSeen","parkNpc","parkNpcLast","npcPity","parkAdj","visitGone","secrets","secretClue","secretSpots","secretWins","relics","relicSolved","relicAt","histSeen","histSolved","histTitle",
  "innCur","innDrop","innAdj","innGuest","resumeLast","xhMake","xhMei","xhTitle","yuDay","yuHint","yuRoute","yuTitle","cupDrop","cupGot","cj","cjRun","shipAt","shipSolved","shipGames","shipLessonSeen","shipWins","shipArena","cjRunS","jRunS","battleSeal","battleTitle","battleVol","battleGrand","battleVolY","battleVolLegacy","battleMig","battleSeal0","cjRunB","jRunB","battlePlan","diff","shipDock","shipLearn","undoFree","shipGal","shipStale","shipRead","shipMore","evLog","evPawn","evHeld","evStash","jRunE","cjRunE","rdLog","firstWin","wkRead","visit7","chd","ep","cjRunEp","wmDays","wmPg","wmBm","wmScr","wmEcho","jRunW","sealGold","sealIntro","jRunC","rsHint","buddy","cjRunBd","ouyu","jRunO","mnq","xsdRec","xsdRun","xsdLv","bhtdDust","bhtd","bhtdFx","bhtl","xsmSeen","dgl","gxtSeen"].map(k=>"m_"+k)   /* 黑洞塔防爽度第二批（07bht-td.js，開發者 11/14）：bhtdDust＝星塵、點亮的天賦、各關最佳星數、星淵急襲場數、發過星塵的盤（排在 bhtd 前面：test-bhtl 要 "bhtd","bhtdFx","bhtl" 相連） */   /* 聽雨茶坊的臺灣暗棋（07xsd-xsmdark.js，開發者 11/14）：xsdRec＝勝、和、負局數；xsdRun＝下到一半的那一盤（離開自動保留）；xsdLv＝電腦難度（新手／一般，沒選過＝新手） */   /* 西市（07xsm-ximarket.js，開發者 11/13）：xsmSeen＝去過西市了沒（首頁「🏮 西市」不再發亮、第一次的介紹卡只跳一次） */   /* 平日體力（07dgl-stamina.js，開發者 11/13）：dgl＝身上的星芒、第一次下船的說明看過了沒（定軌力本身不存，關 App 再開回滿） */   /* 黑洞陣地塔防（07bht-td.js，開發者 11/13）：bhtd＝破過哪幾關、各關輸贏、每位角色帶的 4 招；bhtdFx＝戰鬥演出（完整／簡化／關閉）；bhtl＝塔防練習賽練過／跳過、練了幾次、進階機制第一次的提示看過哪些（07bhtl-tdlearn.js） */   /* 七星遇見玩法（07q-buddy.js，開發者 11/9）：buddy＝旅伴闖禍、驛站飛書、心結的進度，cjRunBd＝這兩種殘局解到一半的那一題 */   /* 回饋 856（開發者 11/9：女棋手分普通／稀有／傳說、機率加保底）：npcPity＝稀有、傳說女棋手的保底計數（06-cpu.js parkNpcNew） */   /* 回饋 838（開發者 11/9 選：全模式中斷接續）：jRunC＝新手訓練營玩到一半的那一課、rsHint＝對局裡用掉的提示棋黃框（主題訓練 jpRun、棋力測驗 quizRun 跟 themeStat、quizLog 一樣是棋手本人的，各格共用，不放這裡） */   /* 千秋印（07i2-seal.js，開發者 11/9）：sealGold＝各朝第一次鑄成金印的時間與修為已發、sealIntro＝看過「集章簿換成千秋印譜」說明卡。Gemini 遊玩樂趣評估（開發者 11/8 核准）：visit7＝七星來訪的次數、說過的話、小任務（07j-visit.js）；evStash＝千秋穿梭收進囊中、12 小時內再處理的突發事件（07h-qqev.js）；firstWin＝新手秒開局下過（或跳過）了；wkRead＝學習週報每天記一筆讀懂地圖比例，算「比上週」。意見回饋 737 第二期：rdLog＝讀過哪些棋譜、猜著法每盤答對幾手（壓縮成字串）。意見回饋 674：星槎在看哪一站、千秋殘局解開的題、正在解的那一題；675：航行難度、已停靠的站、學會的棋理、這盤用了幾次免費悔棋；685：七星同局圖鑑與熱身解開的題、看過困斃說明、讀過《雲河七星》哪幾章 */
  .concat(["cpuRate","bonusKeys","record","arenaStamps","play","play2","playPrev","playBak"].map(k=>"xq_"+k));   /* 評比循環第 2 輪：playPrev（上一版，存檔壞掉時讀）、playBak（被別的分頁換掉的棋）跟著存檔格走；保存紀錄 xq_saveLog 是這支手機的，不跟格子走 */
const JK=new Set(JOURNEY_KEYS),SLOT_N=3;
/* 意見回饋 668：舊玩家判斷要在首頁畫出來以前做（首頁會順手寫一些旅程鍵，例如 lingN），所以這裡直接讀 localStorage；null＝已經過渡過了 */
/* 開發者 11/6 修：全新玩家第一次打開，開機時就會寫進 era、jStars、playSec 這些鍵，原本的判斷會把新玩家當成舊玩家，跳出「存檔功能上線了、角色是小帥Q版」。改成只看真的玩過才會有的鍵（新手引導做完、修為、戰績、故事進度） */
const SAVE_OLD=(()=>{try{if(localStorage.getItem("m_saveMig1")!=null)return null;return["m_onboard1","m_xp","m_record","xq_record","m_legend","m_legendGame","xq_play"].some(k=>localStorage.getItem(k)!=null)}catch(e){return null}})();
const curSlot=()=>store.get("slotCur",0)|0,journey=()=>store.get("journey",null),slotMetaAll=()=>store.get("slotMeta",{})||{};
let SAVE_LOCK=false,SAVE_HC=0,TITLE=null,ME_HI=null,ME_CAP=null;

/* ---------- 存檔格（IndexedDB xqlab-slots／slot，鍵 1～3，值 {v,at,meta,data:{localStorage 鍵:字串}}） ---------- */
let SLOT_DB=null;
function slotDB(){return SLOT_DB||(SLOT_DB=new Promise((ok,no)=>{let r;try{r=indexedDB.open("xqlab-slots",1)}catch(e){SLOT_DB=null;return no(e)}
  r.onupgradeneeded=()=>{try{r.result.createObjectStore("slot")}catch(e){}};r.onsuccess=()=>ok(r.result);r.onerror=()=>{SLOT_DB=null;no(r.error)}}))}
async function slotIdb(mode,fn){const db=await slotDB();return new Promise((ok,no)=>{const t=db.transaction("slot",mode),r=fn(t.objectStore("slot"));t.oncomplete=()=>ok(r&&r.result);t.onerror=t.onabort=()=>no(t.error||new Error("存檔失敗"))})}
const slotGet=n=>slotIdb("readonly",s=>s.get(n)),slotSet=(n,v)=>slotIdb("readwrite",s=>s.put(v,n)),slotRm=n=>slotIdb("readwrite",s=>s.delete(n));
async function slotAll(){const o={};for(let n=1;n<=SLOT_N;n++){try{const v=await slotGet(n);if(v)o[n]=v}catch(e){}}return o}
/* 換手機轉移碼收到資料時：用舊手機的存檔格整組取代（舊手機還沒有存檔格就全部清掉，開機時舊玩家過渡會把收到的進度存成第 1 格） */
async function slotPutAll(o){for(let n=1;n<=SLOT_N;n++){try{if(o&&o[n]&&o[n].data)await slotSet(n,o[n]);else await slotRm(n)}catch(e){}}}
function saveSnap(){const d={};for(const k of JOURNEY_KEYS){const v=localStorage.getItem(k);if(v!=null)d[k]=v}return d}
function saveApply(data){for(const k of JOURNEY_KEYS)if(localStorage.getItem(k)!=null)localStorage.removeItem(k);for(const k in data||{})if(JK.has(k)&&typeof data[k]==="string")localStorage.setItem(k,data[k])}
function saveMetaNow(){const J=journey()||{};let I={L:1,title:""},R={name:""},st=0;try{I=xpInfo()}catch(e){}try{R=rankInfo()}catch(e){}try{st=legendState().n}catch(e){}
  return{c:J.c||myChar()||mySex(),nm:meName(),pc:myPc(),lv:I.L,lt:I.title||"",rk:R.name||"",st,sec:store.get("playSec",0)|0,born:J.born||0,df:diffNow(),at:Date.now()}}   /* 意見回饋 675：存檔格顯示航行難度 */
async function saveNow(quiet){if(SAVE_LOCK)return false;const n=curSlot();if(!n||!journey())return false;let meta,data;try{meta=saveMetaNow();data=saveSnap()}catch(e){return false}
  try{await slotSet(n,{v:1,at:meta.at,meta,data})}catch(e){if(!quiet)toast("存檔失敗："+(e&&e.message||e));return false}
  if(SAVE_LOCK)return true;const M=slotMetaAll();M[n]=meta;store.set("slotMeta",M);return true}
/* 等 XQSave 把剛才的刪改寫進 IndexedDB 再重新開啟（不然開機時看到 localStorage 少了一堆鍵，會把舊資料「還原」回來）；等太久就這一次先不還原 */
function saveReload(flags){try{sessionStorage.setItem("xqTitleShown","1");for(const k in flags||{})sessionStorage.setItem(k,flags[k])}catch(e){}
  let done=false;const go=ok=>{if(done)return;done=true;if(!ok){try{sessionStorage.setItem("xqRestored","1")}catch(e){}}location.replace(location.pathname+"#/");setTimeout(()=>location.reload(),80)};
  try{if(window.XQSave&&XQSave.flush)XQSave.flush(go);else setTimeout(()=>go(false),900)}catch(e){setTimeout(()=>go(false),900)}setTimeout(()=>go(false),4000)}

/* ---------- 顯示用的小工具 ---------- */
const slotImg=c=>/^x_/.test(c||"")?"data/xs/prev_"+c+".webp":c==="f"?"data/xs/xs_girl_idle.webp":"data/xs/xs_idle.webp";
const fmtSec=s=>{s=s|0;const h=Math.floor(s/3600),m=Math.floor(s%3600/60);return h?`${h} 小時 ${m} 分`:`${m} 分鐘`};
const fmtAt=t=>{if(!t)return"—";const d=new Date(t),n=new Date(),hm=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");if(d.toDateString()===n.toDateString())return"今天 "+hm;if(d.toDateString()===new Date(n-864e5).toDateString())return"昨天 "+hm;return`${d.getMonth()+1}/${d.getDate()} ${hm}`};
function slotCardHTML(n,M,cur){if(!M)return`<div class="sv-c empty"><div class="sv-t"><div class="sv-n">第 ${n} 格</div><div class="sv-e">空白存檔</div></div></div>`;
  return`<div class="sv-c${cur?" cur":""}"><img src="${slotImg(M.c)}" alt="" onerror="this.style.visibility='hidden'"><div class="sv-t"><div class="sv-n">第 ${n} 格${cur?'<span class="sv-cur">使用中</span>':""}</div><b>${esc(M.pc||"")}・${esc(M.nm||"")}</b><small>修為 Lv ${M.lv|0}${M.lt?"・"+esc(M.lt):""}${M.rk?"・"+esc(M.rk):""}${M.df&&DIFF[M.df-1]?"・🎚 "+esc(DIFF[M.df-1].n):""}</small><small>故事 ${M.st|0}／36・遊玩 ${fmtSec(M.sec)}・存檔 ${fmtAt(M.at)}</small></div></div>`}
const obPicks=()=>Object.entries(WX_CHARS).map(([k,c])=>({k,img:"data/xs/prev_"+k+".webp",n:c.n,nk:c.nk||c.n,pc:c.pc||"",s:c.s||"雲河七星",say:c.say||"",bio:c.bio||c.t||""}));   /* 雲河七星（意見回饋 668：開發者 11/6 後三位也就緒，七位都能選；小帥、小帥妹不再列出，舊存檔照用） */

/* ---------- 第一人稱：對局台詞、稱呼、說書框架（意見回饋 668 第一期） ---------- */
/* 每位的 start／cap／win／lose／draw 台詞寫在 WX_CHARS（06-cpu.js） */
/* 「問小帥」的名字：扮演雲河七星時固定是小帥（嚮導），小帥、小帥妹舊存檔照原本的小人名字 */
const ASKN=()=>myChar()?"小帥":BOTN();
const pickOne=a=>a&&a.length?a[Math.floor(Math.random()*a.length)]:"";
/* 給 bot3d.js 用：me＝小名；win／lose／draw＝贏輸和的一句話（小帥、小帥妹沒有，維持原本的台詞） */
window.XQ_MELINE=k=>{const c=myChar();if(!c)return null;if(k==="me")return WX_CHARS[c].nk||WX_CHARS[c].n;const L=WX_CHARS[c];return L&&Array.isArray(L[k])?pickOne(L[k]):null};
/* 對局畫面每畫一次叫一次（08b-cpugame.js）：新的一盤開局說一句；你吃掉對方的子，一半機率說一句 */
function meGameTalk(st){try{if(!st||!myChar()||typeof BOT==="undefined"||!BOT||!BOT.say)return;const L=WX_CHARS[myChar()];if(!L||!Array.isArray(st.board))return;
  if(!st.moves.length&&!st.result&&ME_HI!==st.id){ME_HI=st.id;setTimeout(()=>{try{if(BOT&&BOT.say)BOT.say(pickOne(L.start),2.6,{auto:1})}catch(e){}},2400)}   /* 11/11 模擬玩家問題 2：對局中的閒話標成 auto，有棋盤時 bot3d 不冒泡泡 */
  const opp=st.human==="b"?/[A-Z]/:/[a-z]/,n=st.board.filter(p=>p&&opp.test(p)).length;
  if(ME_CAP&&ME_CAP.id===st.id&&n<ME_CAP.n&&st.moves.length>ME_CAP.m&&!st.result&&Math.random()<.5)setTimeout(()=>{try{if(BOT&&BOT.say)BOT.say(pickOne(L.cap),1.8,{auto:1})}catch(e){}},350);
  ME_CAP={id:st.id,n,m:st.moves.length}}catch(e){}}
/* 園子路人打招呼時叫你的小名（雲河七星才叫；小帥、小帥妹照舊） */
function meHi(s){try{const c=myChar();if(!c||!s)return s;const nk=WX_CHARS[c].nk||WX_CHARS[c].n;if(String(s).includes(nk)||Math.random()>=.7)return s;return nk+"，"+String(s).replace(/^「|」$/g,"")}catch(e){return s}}
/* 驛站旅人看你一眼：依你的角色是男是女稱呼 */
const innCall=x=>`${x.name}抬頭看了你一眼：「這位${mySex()==="f"?"姑娘":"小哥"}，來得正好。」`;
/* 石桌往事每回開頭：你扮演的那位坐在「雲河」星槎的船頭聽說書人講（故事正文不改；開發者 11/6 定案世界觀「雲河星槎」） */
function jFrame(){try{const c=myChar();if(!c)return"";const nk=WX_CHARS[c].nk||WX_CHARS[c].n;return`<p class="jframe">（${esc(nk)}坐在「雲河」星槎的船頭，聽說書人往下講。）</p>`}catch(e){return""}}
/* 選了雲河七星，小人身上的棋子就是本命棋子（舊存檔換過棋子的，在這裡改回來） */
function lockFix(){try{const c=myChar();if(c&&WX_CHARS[c].pc&&store.get("botPiece","")!==WX_CHARS[c].pc)store.set("botPiece",WX_CHARS[c].pc)}catch(e){}}
function pieceLock(){const c=myChar();if(!c)return;const C=WX_CHARS[c];modal(`<div class="em">🔒</div><h2>${esc(C.n)}就是「${esc(C.pc)}」</h2><p class="muted">雲河七星每個人都是一顆棋子：棋子跟著角色，這段旅程不能換。</p>`,[["好",null]])}
function journeyLock(){const J=journey();if(!J)return titleScreen({});
  modal(`<div class="em">🔒</div><h2>${esc(meName())}的旅程正在進行</h2><p class="muted">這段旅程選定的角色不能更換。想用別人的身分出發，請回開頭畫面開始「新的旅程」——可以存到另一格，不會蓋掉這段。</p>`,
    [["回開頭畫面",()=>titleScreen({})],["💾 存檔與讀檔",saveSheet,true],["好",null,true]])}   /* 11/13 晚：「最後改選一次」拿掉，見 titleScreen */
/* 入局序幕：開新旅程選好角色後看到的三句話 */
function prologue(){const c=myChar();if(!c)return;if(typeof bhxNeed==="function"&&bhxNeed()&&typeof bhXuStart==="function"){bhXuStart(false);return}   /* hspx 開發者 11/12：建好角色先從星渦掉進黑洞下序局（07bh-blackhole.js），下完才回到這裡 */
  const C=WX_CHARS[c],era=store.get("era","classic"),nk=C.nk||C.n;
  const place=era==="classic"?"船艙裡的石桌亮了起來，風裡多了千年前的聲音。":`船艙裡那張刻著棋盤的石桌亮了起來——窗外是${eraLabel(era)}的園子。`;
  modal(`<img src="data/xs/prev_${c}.webp" alt="" onerror="this.remove()"><h2>${esc(C.pc)}・${esc(C.n)}</h2><p class="pl-say">「${esc(C.say||"")}」</p><p>一艘叫「雲河」的星槎靠了岸。船頭的說書人一拍醒木：「上船吧，${esc(nk)}。」${esc(nk)}踏上船板，在船艙的石桌上擺下第一顆子——</p><p>${esc(place)}</p>`,[["入局",()=>{try{if(typeof BGM!=="undefined"&&BGM.force==="bh_2.mp3")bgmForce(null)}catch(e){}let nx=0;try{nx=+sessionStorage.getItem("xqFwNext")||0;sessionStorage.removeItem("xqFwNext")}catch(e){}
    /* 開發者 11/11 選 v3 規劃書 B01：第一課選了「下一盤簡單的棋」——看完序幕直接開練功房第 1 級（不算分）；開不了就照舊進首頁 */
    if(nx&&Date.now()-nx<9e5){api("/play/new",{human:"r",lx:1,ranked:false}).then(()=>{location.hash="#/cpu"}).catch(()=>{try{route()}catch(e){}});return}
    try{route()}catch(e){}}]],"prolog")}

/* ---------- 新的旅程、讀檔、改選 ---------- */
async function journeyStart(n,c,nm,df){const C=WX_CHARS[c];if(!C)return;fnStep("pick");const had=!!journey(),cur=curSlot();
  if(had&&cur&&cur!==n)await saveNow(true);SAVE_LOCK=true;
  store.set("slotCur",n);if(had||!tsmProgNow().any){const fw=localStorage.getItem("m_firstWin"),fr=!!store.get("bhxFresh",0),xu=fr?localStorage.getItem("m_bhXuDone"):null,xp=fr?localStorage.getItem("m_bhxPick"):null;saveApply({});if(fw!=null)localStorage.setItem("m_firstWin",fw);if(xu!=null)localStorage.setItem("m_bhXuDone",xu);if(xp!=null)localStorage.setItem("m_bhxPick",xp)}   /* 序局下過了（先下序局才選角的新玩家）：新旅程不再重下一次 */else try{if(window.XQ_saveLog)XQ_saveLog("keep")}catch(e){}   /* 新手秒開局的旗標跟著新旅程存進這一格 */   /* 11/11 第二輪問題 1：還沒選過角色、但手機裡已有進度（下到一半的棋、戰績、殘局）＝第一次選角，進度留著跟這位角色走，不清掉（原本會連 xq_play、xq_play2 一起清，多分頁時那盤就不見了） */
  store.set("pChar",c);store.set("pSex",C.sx);store.set("pStyle","real");store.set("botPiece",C.pc);store.set("onboard1",true);const hm=jHomePick(c);store.set("journey",{c,sx:C.sx,born:Date.now(),v:1,era:2,home:hm});if(hm){store.set("era",hm);store.set("eraUser",null);try{applyEra()}catch(e){}}store.set("playSec",0);store.set("diff",df>=1&&df<=5?df|0:2);if(hm)store.set("shipDock",["classic",hm]);   /* 意見回饋 675：新旅程的難度、一開始停靠船艙和家鄉 */
  if(store.get("oppLook",null)==null)store.set("oppLook","real");if(nm){try{setMyName(nm)}catch(e){}}
  SAVE_LOCK=false;await saveNow(true);
  if(had){SAVE_LOCK=true;saveReload({xqPrologue:"1",xqDarkLoad:"1"});return}   /* 11/12 開發者實機錄影：重開時的載入頁改深色（09b 的 pv-dark），接在開場電影後不突兀 */
  try{window.dispatchEvent(new Event("xq-look"))}catch(e){}
  if(typeof bhxNeed==="function"&&bhxNeed()&&typeof bhXuStart==="function"){bhXuStart(false);titleClose();location.hash="#/adventure";return}
  if(typeof bhxLandNew==="function"&&bhxLandNew())return;   /* 先下序局、在流星裡選角的新玩家：降落經典星槎再出序幕 */   /* hspx 11/12「開頭過場頓一下」：背後不建首頁 3D 園子（很重），改開星槎頁（下完序局本來就降落在星槎） */   /* 開發者 11/12「開頭會跳到首頁才接到黑洞對戰」：先蓋上星渦再關開頭畫面，首頁不露出來 */
  titleClose();try{route()}catch(e){}setTimeout(prologue,500)}
function journeyRepick(c){const C=WX_CHARS[c],J=journey();if(!C||!J||J.re!==1)return;store.set("pChar",c);store.set("pSex",C.sx);store.set("botPiece",C.pc);const hm=jHomePick(c);store.set("journey",{...J,c,sx:C.sx,re:2,era:2,home:hm});store.set("shipDock",null);   /* 意見回饋 675：換了角色＝家鄉換了，已停靠的站照舊規則重算一次（不會變少） */if(hm){store.set("era",hm);store.set("eraUser",null);try{applyEra()}catch(e){}}
  try{window.dispatchEvent(new Event("xq-look"))}catch(e){}saveNow(true);toast("換好了："+C.n+"（之後就鎖定了）")}
async function slotLoad(n){let S=null;try{S=await slotGet(n)}catch(e){}
  if(!S||!S.data){const M=slotMetaAll();delete M[n];store.set("slotMeta",M);return toast("這格讀不到資料")}
  if(journey()&&curSlot()&&curSlot()!==n)await saveNow(true);SAVE_LOCK=true;store.set("slotCur",n);saveApply(S.data);toast("讀取中…");saveReload()}
async function slotDel(n){try{await slotRm(n)}catch(e){}const M=slotMetaAll();delete M[n];store.set("slotMeta",M)}
function slotCopyAsk(from,after){const M=slotMetaAll(),L=[1,2,3].filter(n=>n!==from);
  modal(`<div class="em">📋</div><h2>把第 ${from} 格複製到…</h2><p class="muted">複製一份當備份。被選到的那格原本的進度會被蓋掉。</p>`,
    L.map(n=>[`第 ${n} 格`+(M[n]?`（蓋掉 ${M[n].nm}・Lv ${M[n].lv|0}）`:"（空白）"),async()=>{if(from===curSlot())await saveNow(true);let S=null;try{S=await slotGet(from)}catch(e){}if(!S)return toast("這格讀不到資料");
      const at=Date.now(),T={...S,at,meta:{...S.meta,at}};try{await slotSet(n,T)}catch(e){return toast("複製失敗")}const M2=slotMetaAll();M2[n]=T.meta;store.set("slotMeta",M2);toast(`已複製到第 ${n} 格`);after&&after()},M[n]?"wide":false]).concat([["取消",null,true]]))}
/* ---------- 匯出、讀入檔案（檔案是外來資料：只收 JOURNEY_KEYS 裡、值是字串的鍵） ----------
   評審 P22.3（11/12）存檔檔案完整性：匯出格式升到 v2，多一個 sha＝檔案裡「slot 那一段」JSON 的 SHA-256（16 進位，crypto.subtle 算）。讀入時（saveFileRead）先驗：
     不是 JSON（沒下載完、被截斷）→ 拒收；版本比這版 App 新 → 請先更新；v2 檢查碼對不上（被改過、壞掉）→ 拒收；
     v1 舊檔（沒有檢查碼）照收，但標「未驗證」；這支瀏覽器不能算 SHA-256：匯出時 sha 寫 null、讀入時不驗，一樣標「未驗證」。
   檢查碼防的是「檔案壞掉、被截斷、被不小心改到」，不是防偽造（誰都能改完內容再重算一次；存檔本來就是自己的）。測試：xiangqi-lab/tools/test-save-file.js */
const SAVE_FILE_V=2;
async function saveFileSha(s){try{if(!(window.crypto&&crypto.subtle))return null;const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return Array.from(new Uint8Array(b),x=>x.toString(16).padStart(2,"0")).join("")}catch(e){return null}}
async function saveFilePack(S,at){return JSON.stringify({app:"象棋千秋",kind:"xqsave",v:SAVE_FILE_V,at:at||Date.now(),sha:await saveFileSha(JSON.stringify(S)),slot:S})}
/* 讀入的檔案內容（字串）→ {ok:true,S（整理過的這一格）,verified,note（未驗證的原因）} 或 {ok:false,why（給玩家看的話）} */
async function saveFileRead(text){let o=null;try{o=JSON.parse(String(text))}catch(e){}
  if(!o||typeof o!=="object")return{ok:false,why:"這個檔案不完整或已經損壞（可能沒下載完、或被截斷了），讀不進來。請回原來的手機重新匯出一次。"};
  if(o.kind!=="xqsave")return{ok:false,why:"這個檔案不是象棋千秋的存檔。"};
  const v=Number.isInteger(o.v)?o.v:1;if(v>SAVE_FILE_V)return{ok:false,why:"這個存檔是比較新版的 App 匯出的，請先更新 App 再讀入。"};
  let note="";
  if(v>=2){if(typeof o.sha==="string"&&o.sha){const h=await saveFileSha(JSON.stringify(o.slot));if(h==null)note="這個瀏覽器不能核對檢查碼";else if(h!==o.sha.toLowerCase())return{ok:false,why:"這個存檔的內容被改過或已經損壞（檢查碼對不上）。為了保護你的進度，不讀入。請回原來的手機重新匯出一次。"}}else note="匯出時沒有檢查碼"}
  else note="舊版存檔，沒有檢查碼";
  const S=saveSanitize(o);if(!S)return{ok:false,why:"這個檔案裡沒有讀得懂的進度，不像是象棋千秋的存檔。"};
  return{ok:true,S,verified:!note,note}}
async function slotExport(n){if(n===curSlot())await saveNow(true);let S=null;try{S=await slotGet(n)}catch(e){}if(!S)return toast("這格是空的");
  const d=new Date(),ymd=d.getFullYear()+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0"),fn=`象棋千秋存檔_${String(S.meta&&S.meta.nm||"").replace(/[\\/:*?"<>|\s]/g,"")}_${ymd}.json`;
  const f=new File([await saveFilePack(S)],fn,{type:"application/json"}),ok=()=>{store.set("exportAt",Date.now());toast("已匯出："+fn)};
  try{if(matchMedia("(pointer:coarse)").matches&&navigator.canShare&&navigator.canShare({files:[f]})){await navigator.share({files:[f],title:"象棋千秋存檔"});ok();return}}catch(e){if(e&&e.name==="AbortError")return}
  const a=document.createElement("a");a.href=URL.createObjectURL(f);a.download=fn;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000);ok()}
function saveSanitize(o){if(!o||o.kind!=="xqsave"||!o.slot||!o.slot.data||typeof o.slot.data!=="object")return null;const d={};
  for(const k in o.slot.data)if(JK.has(k)&&typeof o.slot.data[k]==="string"&&o.slot.data[k].length<4e6)d[k]=o.slot.data[k];if(!Object.keys(d).length)return null;
  const m=o.slot.meta||{},num=x=>Number.isFinite(+x)?+x:0,str=(x,n)=>String(x==null?"":x).slice(0,n);
  const meta={c:/^(x_[a-z]+|m|f)$/.test(m.c)?m.c:"m",nm:str(m.nm,20),pc:str(m.pc,1),lv:num(m.lv),lt:str(m.lt,12),rk:str(m.rk,12),st:num(m.st),sec:num(m.sec),born:num(m.born),at:num(m.at)||Date.now()};
  return{v:1,at:meta.at,meta,data:d}}
function slotImportPick(n,after,loadAfter){const inp=document.createElement("input");inp.type="file";inp.accept=".json,application/json,text/plain";inp.style.display="none";document.body.append(inp);
  inp.onchange=async()=>{const f=inp.files&&inp.files[0];inp.remove();if(!f)return;if(f.size>20*1048576)return toast("檔案太大，不像是象棋千秋的存檔");let R=null;try{R=await saveFileRead(await f.text())}catch(e){R={ok:false,why:"讀不到這個檔案，請再試一次。"}}
    if(!R.ok)return modal(`<div class="em">⚠️</div><h2>沒有讀入</h2><p class="muted">${esc(R.why)}</p>`,[["好",null]]);   /* 評審 P22.3：被改過、截斷、太新的版本，說清楚為什麼不收 */
    const S=R.S,uv=R.note?`（${R.note}，未驗證）`:"",M=slotMetaAll(),live=n===curSlot()&&!!journey();
    const go=async()=>{try{await slotSet(n,S)}catch(e){return toast("寫入失敗")}const M2=slotMetaAll();M2[n]=S.meta;store.set("slotMeta",M2);
      if(loadAfter||live){SAVE_LOCK=true;store.set("slotCur",n);saveApply(S.data);toast("讀取中…"+uv);saveReload();return}toast(`已讀入第 ${n} 格：${S.meta.nm}`+uv);after&&after()};
    if(M[n]||live)modal(`<div class="em">📂</div><h2>用檔案蓋掉第 ${n} 格？</h2><p class="muted">檔案裡是「${esc(S.meta.pc)}・${esc(S.meta.nm)}・Lv ${S.meta.lv|0}」（${fmtAt(S.at)} 存的）。第 ${n} 格原本的進度會被換掉。</p>${R.verified?"":`<p class="muted">ⓘ ${esc(R.note)}：無法確認檔案在路上沒有被改過或損壞。</p>`}`,[["蓋掉",go],["取消",null,true]]);else go()};
  inp.click()}

/* ---------- 📱 換手機轉移碼補強（評比第 12 輪 X11，評審「連線與雲端架構師」P22.3 資料存儲與無縫轉移；測試 xiangqi-lab/tools/test-xfer2.js）----------
   原本的流程在 05-settings.js 的 XFER 區段（xfUpload／xfDownload，畫面 xfSend／xfRecv）。這裡的 XFER2 區段是兩個同樣用法的新版本，最後一行把畫面用的換成新版本
   （05-settings.js 先載入、05b-save.js 後載入；xfSend、xfRecv 呼叫時才找 xfUpload／xfDownload，所以拿到的是新版本）。補的缺口：
   ① 完整性：說明（x/<碼雜湊>/m）升到 v3，多帶 h＝每一段密文的 SHA-256（前 24 個 16 進位字）、ha＝整份密文的 SHA-256。新手機每收一段就核對，對不上的那段重抓；
      AES-GCM 本來就會擋改過的密文，但以前只能說「解不開」，現在說得出是第幾段壞了、可以重抓。
   ② 中斷可以重試：上傳每一段失敗自動再試 2 次；下載每一段收不到或對不上，自動再試 2 次；還是不行就停下來說「第幾段」，已經核對過的分段留在記憶體（XF2_GOT），
      同一組碼再按一次「下載資料」從斷掉那段接著下。上傳改成「先傳分段、最後才放說明」：說明在＝分段到齊，新手機不會在上傳途中讀到半套。
   ③ 用過、過期、兩台同時：新手機解開後清掉分段，說明換成「回條」{v:3, done 收下的時間, ah, exp 24 小時}——ah＝SHA-256("xqlab-xfer-ack:"+轉移碼)，
      只有拿到碼的人做得出來；別支手機再輸入同一組碼會看到「已經在 hh:mm 轉到另一支手機」，不會兩台都拿到半套。
   ④ 舊手機知道「已轉到新手機」：產生碼時記 xq_xfOut={id, ah, exp}（不記碼本身）。之後每 45 秒（碼還有效時）、下次打開 App（24 小時內）讀一次說明：
      看到 ah 對得上的回條＝跳「進度已經轉到新手機」，清掉回條；說明不見了（作廢、過期、或新手機是舊版 App 沒留回條）＝安靜收掉，不跳。
   相容：v3 說明照樣帶 n、iv、gz、exp，舊版 App 的新手機照樣下載得了（只是不留回條）；新版的新手機收舊版舊手機的 v2 說明照樣解得開（沒有 h 就只靠 AES-GCM）。
   沒有用任何帳號或金鑰：轉移碼本身推出的 AES-GCM 金鑰照舊（xfKeys）。 */
/* XFER2:BEGIN（只用 crypto、XQNet、XQSave、localStorage 和 05-settings 的 XFER 區段；test-xfer2.js 把兩段一起切出來在 node 跑） */
const XF2_TRY=3,XF2_ACK_TTL=864e5,XF2_GOT=new Map();
const xf2Hex=async s=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s))),x=>x.toString(16).padStart(2,"0")).join("");
const xf2Wait=ms=>new Promise(r=>setTimeout(r,ms));
const xf2Ah=code=>xf2Hex("xqlab-xfer-ack:"+xfNorm(code));
const xf2Hm=t=>{const d=new Date(+t);return String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0")};
async function xf2Put(t,s){for(let k=0;k<XF2_TRY;k++){if(await XQNet.putRetained(t,s))return true;if(k<XF2_TRY-1)await xf2Wait(800*(k+1))}return false}
/* 舊手機：同 xfUpload（回 {K,exp,n,kb,games}），另外記 xq_xfOut 等回條 */
async function xf2Upload(code){const K=await xfKeys(code);let games={};try{games=await xfGamesAll()}catch(e){}
  const dump=XQSave.dump();delete dump.xq_xfOut;delete dump.xq_xfMoved;
  const raw=new TextEncoder().encode(JSON.stringify({v:2,at:Date.now(),data:dump,slots:await slotAll(),games})),zip=await xfZip(raw),iv=crypto.getRandomValues(new Uint8Array(12));
  const enc=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv},K.key,zip)),b64=xfB64(enc),parts=[];for(let i=0;i<b64.length;i+=XF_CH)parts.push(b64.slice(i,i+XF_CH));
  const h=[];for(const p of parts)h.push((await xf2Hex(p)).slice(0,24));const ha=await xf2Hex(b64),ah=await xf2Ah(code);
  for(let i=0;i<parts.length;i++)if(!await xf2Put(K.topic(i),parts[i])){xfWipe(K,parts.length);throw new Error("上傳到一半斷線了，已上傳的部分已經清掉，請再按一次產生轉移碼")}
  const exp=Date.now()+XF_TTL;
  if(!await xf2Put(K.topic("m"),JSON.stringify({v:3,n:parts.length,iv:xfB64(iv),gz:!!window.CompressionStream,exp,h,ha}))){xfWipe(K,parts.length);throw new Error("連不上線上伺服器，等一下再試")}
  try{localStorage.setItem("xq_xfOut",JSON.stringify({id:K.id,ah,exp,at:Date.now()}))}catch(e){}
  try{if(typeof xf2Watch==="function")xf2Watch()}catch(e){}
  return{K,exp,n:parts.length,kb:Math.ceil(b64.length/1024),games:Object.values(games).reduce((a,l)=>a+l.length,0)}}
/* 新手機：同 xfDownload（回解開的資料，錯誤丟 Error、訊息直接給使用者看） */
async function xf2Download(code,prog){const K=await xfKeys(code);let m=null;for(let k=0;k<2&&!m;k++)m=await XQNet.getRetained(K.topic("m"),k?6000:10000);
  if(!m)throw new Error("找不到這組轉移碼：可能打錯、過期，或已經用過了");
  let M=null;try{M=JSON.parse(m)}catch(e){}
  if(M&&M.done){if(typeof M.ah==="string"&&M.ah===await xf2Ah(code))throw new Error(`這組轉移碼已經用過了：${xf2Hm(M.done)} 已經轉到另一支手機。要再搬一次，請在舊手機重新產生`);throw new Error("找不到這組轉移碼：可能打錯、過期，或已經用過了")}
  if(!M||typeof M.iv!=="string")throw new Error("資料不完整，請在舊手機重新產生轉移碼");const n=Math.max(0,Math.min(500,+M.n|0));
  if(!(+M.exp>0)||Date.now()>+M.exp){await xfWipe(K,n);XF2_GOT.delete(K.id);throw new Error("這組轉移碼已經過期，請在舊手機重新產生")}
  const H=Array.isArray(M.h)&&M.h.length===n?M.h.map(String):null;let got=XF2_GOT.get(K.id);if(!got||got.iv!==M.iv){got={iv:M.iv,p:[]};XF2_GOT.set(K.id,got)}
  for(let i=0;i<n;i++){if(prog)prog(i+1,n);if(typeof got.p[i]==="string")continue;let ok=null,bad=false;
    for(let k=0;k<XF2_TRY&&ok==null;k++){const p=await XQNet.getRetained(K.topic(i),k?6000:10000);if(p&&(!H||(await xf2Hex(p)).slice(0,24)===H[i]))ok=p;else{if(p)bad=true;if(k<XF2_TRY-1)await xf2Wait(600*(k+1))}}
    if(ok==null)throw new Error(`第 ${i+1}／${n} 段${bad?"對不上檢查碼（可能在路上壞掉了）":"收不到"}。已收好的 ${i} 段先留著：轉移碼到 ${xf2Hm(M.exp)} 前都有效，網路穩一點再按一次「下載資料」，會從這段接著下。`);
    got.p[i]=ok}
  const b64=got.p.join("");if(typeof M.ha==="string"&&(await xf2Hex(b64))!==M.ha){XF2_GOT.delete(K.id);throw new Error("整份資料對不上檢查碼，請在舊手機重新產生轉移碼")}
  let D=null;try{let u=new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:xfUnB64(M.iv)},K.key,xfUnB64(b64)));if(M.gz)u=await xfZip(u,true);D=JSON.parse(new TextDecoder().decode(u))}catch(e){XF2_GOT.delete(K.id);throw new Error("解不開：轉移碼不對，或資料已經被換掉了")}
  XF2_GOT.delete(K.id);const a=[];for(let i=0;i<n;i++)a.push(XQNet.putRetained(K.topic(i),""));await Promise.all(a);
  await XQNet.putRetained(K.topic("m"),JSON.stringify({v:3,done:Date.now(),ah:await xf2Ah(code),exp:Date.now()+XF2_ACK_TTL}));
  return D}
/* 舊手機查回條：回 "moved"（{at}）、"pending"（碼還在等新手機）、"gone"（作廢、過期，或新手機是舊版沒留回條）、"none"（沒有在等的）、"unknown"（這次讀不到，下次再看） */
async function xf2Check(){let O=null;try{O=JSON.parse(localStorage.getItem("xq_xfOut")||"null")}catch(e){}
  if(!O||typeof O.id!=="string"||!/^[0-9a-f]{20}$/.test(O.id)){try{localStorage.removeItem("xq_xfOut")}catch(e){}return{st:"none"}}
  const drop=()=>{try{localStorage.removeItem("xq_xfOut")}catch(e){}};if(Date.now()>(+O.exp||0)+XF2_ACK_TTL){drop();return{st:"gone"}}
  const t=`${XQNet.root()}/x/${O.id}/m`,m=await XQNet.getRetained(t,6000);let M=null;try{M=m?JSON.parse(m):null}catch(e){}
  if(M&&M.done&&M.ah===O.ah){drop();try{localStorage.setItem("xq_xfMoved",JSON.stringify({at:+M.done||Date.now()}))}catch(e){}XQNet.putRetained(t,"");return{st:"moved",at:+M.done||Date.now()}}
  if(M&&(typeof M.iv==="string"||typeof M.c==="string")&&Date.now()<=+M.exp)return{st:"pending",exp:+M.exp};   /* v4 的說明是 {v:4,n,exp,c}（c＝加密過的說明），沒有 iv */
  if(!m&&!(XQNet.status&&XQNet.status()==="up"))return{st:"unknown"};
  drop();return{st:"gone"}}
/* XFER2:END */
/* 舊手機：碼還有效時每 45 秒查一次回條；之後只在打開 App 時查一次（24 小時內）。看到回條跳「進度已經轉到新手機」 */
let XF2_T=null;
function xf2Watch(){clearTimeout(XF2_T);XF2_T=null;let O=null;try{O=JSON.parse(localStorage.getItem("xq_xfOut")||"null")}catch(e){}if(!O||!window.XQNet)return;
  xf2Check().then(r=>{if(r.st==="moved"){modal(`<div class="em">📱</div><h2>進度已經轉到新手機</h2><p class="muted">新手機在 ${fmtAt(r.at)} 收下了這支手機的進度（修為、戰績、存檔、棋譜）。之後請用新手機玩：這支手機的進度不會再跟新手機同步，兩支一起玩會各記各的。這支手機的資料沒有被刪掉。</p>`,[["知道了",null]]);return}
    if(r.st==="pending"||(r.st==="unknown"&&Date.now()<=(+O.exp||0)))XF2_T=setTimeout(xf2Watch,45000)}).catch(()=>{XF2_T=setTimeout(xf2Watch,45000)})}
if(typeof xfUpload==="function"&&typeof xfDownload==="function"){xfUpload=xf2Upload;xfDownload=xf2Download}
/* ---------- 📱 轉移碼 v4（紅藍隊 r15 R03＝威脅模型 I5，11/13；測試 xiangqi-lab/tools/test-xfer4.js、重現 review_loop/rounds/r15/redblue/repro-xfer-topic-bruteforce-v4.js）----------
   v3 的毛病：主題 id＝SHA-256("xqlab-xfer-id:"+碼) 前 80 位元，只算一次、沒有鹽；碼 8 碼（31^8≈2^39.6），看得到主題名就能用 GPU 幾分鐘反推出碼。
   說明（n、exp、h）是明文、分段雜湊也是明文，知道碼的人還能在新手機下載前把整份換掉。
   v4：① xf4Keys 只做一次 PBKDF2-HMAC-SHA512（30 萬次，鹽 "xqlab-xfer-v4"）deriveBits 512 位元：前 256 位元＝AES-GCM 金鑰，後 256 位元切成主題 id（80 位元）和回條 ah（176 位元）。
      猜一次碼就要算一次完整的 PBKDF2，主題 id、回條都不能拿來快速比對。SHA-512 一個區塊剛好 512 位元，攻擊的人不能只算一半省時間。
   ② 碼 10 碼（31^10≈2^49.5），xf4Code 用拒絕取樣（不偏向前幾個字）；字元集照舊（沒有 I、L、O、0、1）。
   ③ 說明 {v:4,n,exp,c}：c＝AES-GCM 加密的 {sid（這次上傳的隨機代號）,gz,at}，AAD＝版本、種類、段數、期限；每一段各自加密（自己的 iv），AAD 再加 sid 和第幾段。
      改說明的 n 或 exp、換掉、調換順序、拿別次上傳的段來混、截短，都解不開；期限沒有金鑰就改不了。
   ④ 一次性：新手機收完清掉各段、說明換成回條；這支手機記住收過的 sid（xq_xfUsed，存檔取代後也留著），同一份資料被人重放也不收；過期的不收、順手清掉。
   ⑤ 舊的 8 碼（v3）到 XF4_V3_UNTIL 前照收（走 xf2Download），回傳的資料帶 xfWarn，畫面提示「安全性較低，建議重新產生」；之後一律拒收。 */
/* XFER4:BEGIN（只用 crypto、XQNet、XQSave、localStorage、05-settings 的 XFER 區段和上面的 XFER2 區段；test-xfer4.js 三段一起切出來在 node 跑） */
const XF4_LEN=10,XF4_IT=300000,XF4_SALT="xqlab-xfer-v4",XF4_PB=90000,XF4_USED="xq_xfUsed",XF4_GOT=new Map();
const XF4_V3_UNTIL=Date.UTC(2026,11,31,16);   /* 舊 8 碼收到臺灣時間 2027-01-01 00:00 為止（開發者可改） */
const XF4_WARN="這組是舊版 App 產生的 8 碼轉移碼，安全性較低（比較容易被猜出來）。建議兩支手機都更新 App，在舊手機重新產生 10 碼的轉移碼再搬一次。";
const xf4Hx=u=>Array.from(u,x=>x.toString(16).padStart(2,"0")).join("");
function xf4Code(){const a=[],N=XF_ABC.length,lim=256-256%N;while(a.length<XF4_LEN)for(const x of crypto.getRandomValues(new Uint8Array(16)))if(x<lim&&a.length<XF4_LEN)a.push(XF_ABC[x%N]);return a.join("")}
async function xf4Keys(code){const te=new TextEncoder(),c=xfNorm(code),base=await crypto.subtle.importKey("raw",te.encode(c),"PBKDF2",false,["deriveBits"]);
  const b=new Uint8Array(await crypto.subtle.deriveBits({name:"PBKDF2",salt:te.encode(XF4_SALT),iterations:XF4_IT,hash:"SHA-512"},base,512));
  const key=await crypto.subtle.importKey("raw",b.slice(0,32),{name:"AES-GCM"},false,["encrypt","decrypt"]),id=xf4Hx(b.slice(32,42)),ah=xf4Hx(b.slice(42,64));b.fill(0);
  return{v:4,id,ah,key,topic:k=>`${XQNet.root()}/x/${id}/${k}`}}
const xf4Aad=(kind,n,exp,sid,i)=>new TextEncoder().encode(`xqlab-xfer|v4|${kind}|n=${n}|exp=${exp}`+(kind==="p"?`|sid=${sid}|i=${i}`:""));
async function xf4Seal(K,u,aad){const iv=crypto.getRandomValues(new Uint8Array(12)),c=new Uint8Array(await crypto.subtle.encrypt({name:"AES-GCM",iv,additionalData:aad},K.key,u)),o=new Uint8Array(12+c.length);o.set(iv);o.set(c,12);return xfB64(o)}
async function xf4Open(K,s,aad){const u=xfUnB64(String(s));if(u.length<28)throw new Error("太短");return new Uint8Array(await crypto.subtle.decrypt({name:"AES-GCM",iv:u.subarray(0,12),additionalData:aad},K.key,u.subarray(12)))}
function xf4UsedAll(){let o=null;try{o=JSON.parse(localStorage.getItem(XF4_USED)||"null")}catch(e){}const t=Date.now(),r={};if(o&&typeof o==="object")for(const k in o)if(/^[0-9a-f]{32}$/.test(k)&&+o[k]>t)r[k]=+o[k];return r}
/* 舊手機：同 xfUpload（回 {K,exp,n,kb,games}），另外記 xq_xfOut 等回條。code 要是 10 碼（xf4Code 產生） */
async function xf4Upload(code){const c=xfNorm(code);if(c.length!==XF4_LEN)throw new Error("轉移碼要 10 碼");const K=await xf4Keys(c);let games={};try{games=await xfGamesAll()}catch(e){}
  const dump=XQSave.dump();delete dump.xq_xfOut;delete dump.xq_xfMoved;delete dump[XF4_USED];
  const te=new TextEncoder(),zip=await xfZip(te.encode(JSON.stringify({v:2,at:Date.now(),data:dump,slots:await slotAll(),games}))),n=Math.max(1,Math.ceil(zip.length/XF4_PB));
  if(n>500)throw new Error("資料太大，轉移碼帶不動：請改用「匯出成檔案」");
  const exp=Date.now()+XF_TTL,sid=xf4Hx(crypto.getRandomValues(new Uint8Array(16))),parts=[];
  for(let i=0;i<n;i++)parts.push(await xf4Seal(K,zip.subarray(i*XF4_PB,(i+1)*XF4_PB),xf4Aad("p",n,exp,sid,i)));
  for(let i=0;i<n;i++)if(!await xf2Put(K.topic(i),parts[i])){xfWipe(K,n);throw new Error("上傳到一半斷線了，已上傳的部分已經清掉，請再按一次產生轉移碼")}
  const meta=JSON.stringify({v:4,n,exp,c:await xf4Seal(K,te.encode(JSON.stringify({sid,gz:!!window.CompressionStream,at:Date.now()})),xf4Aad("m",n,exp))});
  if(!await xf2Put(K.topic("m"),meta)){xfWipe(K,n);throw new Error("連不上線上伺服器，等一下再試")}
  try{localStorage.setItem("xq_xfOut",JSON.stringify({id:K.id,ah:K.ah,exp,at:Date.now()}))}catch(e){}
  try{if(typeof xf2Watch==="function")xf2Watch()}catch(e){}
  return{K,exp,n,kb:Math.ceil(parts.reduce((a,p)=>a+p.length,0)/1024),games:Object.values(games).reduce((a,l)=>a+l.length,0)}}
/* 新手機：10 碼走 v4；8 碼是舊版（v3），期限內照收但帶 xfWarn。回解開的資料，錯誤丟 Error（訊息直接給使用者看） */
async function xf4Download(code,prog){const c=xfNorm(code);
  if(c.length===8){if(Date.now()>XF4_V3_UNTIL)throw new Error("這是舊版 App 的 8 碼轉移碼，已經停止支援：請把舊手機的 App 更新到最新版，再重新產生 10 碼的轉移碼");
    const D=await xf2Download(c,prog);if(D&&typeof D==="object")D.xfWarn=XF4_WARN;return D}
  if(c.length!==XF4_LEN)throw new Error("轉移碼是 10 碼（舊版 App 產生的是 8 碼）");
  const K=await xf4Keys(c),lost="找不到這組轉移碼：可能打錯、過期，或已經用過了",fake="說明對不上：轉移碼不對，或資料已經被換掉了。請在舊手機重新產生轉移碼";
  let m=null;for(let k=0;k<2&&!m;k++)m=await XQNet.getRetained(K.topic("m"),k?6000:10000);if(!m)throw new Error(lost);
  let M=null;try{M=JSON.parse(m)}catch(e){}
  if(M&&M.done){if(typeof M.ah==="string"&&M.ah===K.ah)throw new Error(`這組轉移碼已經用過了：${xf2Hm(M.done)} 已經轉到另一支手機。要再搬一次，請在舊手機重新產生`);throw new Error(lost)}
  if(!M||M.v!==4||typeof M.c!=="string")throw new Error(fake);
  const n=+M.n,exp=+M.exp;if(!(Number.isInteger(n)&&n>=1&&n<=500&&exp>0))throw new Error(fake);
  let I=null;try{I=JSON.parse(new TextDecoder().decode(await xf4Open(K,M.c,xf4Aad("m",n,exp))))}catch(e){}
  if(!I||typeof I.sid!=="string"||!/^[0-9a-f]{32}$/.test(I.sid))throw new Error(fake);
  if(Date.now()>exp){await xfWipe(K,n);XF4_GOT.delete(K.id);throw new Error("這組轉移碼已經過期，請在舊手機重新產生")}
  const U=xf4UsedAll();if(U[I.sid])throw new Error("這份資料這支手機已經收過了，不再收第二次。要再搬一次，請在舊手機重新產生轉移碼");
  let got=XF4_GOT.get(K.id);if(!got||got.sid!==I.sid){got={sid:I.sid,p:[]};XF4_GOT.set(K.id,got)}
  for(let i=0;i<n;i++){if(prog)prog(i+1,n);if(got.p[i])continue;let ok=null,bad=false;
    for(let k=0;k<XF2_TRY&&!ok;k++){const p=await XQNet.getRetained(K.topic(i),k?6000:10000);if(p){try{ok=await xf4Open(K,p,xf4Aad("p",n,exp,I.sid,i))}catch(e){bad=true}}if(!ok&&k<XF2_TRY-1)await xf2Wait(600*(k+1))}
    if(!ok)throw new Error(`第 ${i+1}／${n} 段${bad?"對不上（被改過，或在路上壞掉了）":"收不到"}。已收好的 ${i} 段先留著：轉移碼到 ${xf2Hm(exp)} 前都有效，網路穩一點再按一次「下載資料」，會從這段接著下。`);
    got.p[i]=ok}
  let D=null;try{const all=new Uint8Array(got.p.reduce((a,p)=>a+p.length,0));let o=0;for(const p of got.p){all.set(p,o);o+=p.length}
    D=JSON.parse(new TextDecoder().decode(I.gz?await xfZip(all,true):all))}catch(e){XF4_GOT.delete(K.id);throw new Error("解不開：資料不完整，請在舊手機重新產生轉移碼")}
  if(!D||typeof D!=="object"||!D.data||typeof D.data!=="object"){XF4_GOT.delete(K.id);throw new Error("收到的資料格式不對，請在舊手機重新產生轉移碼")}
  XF4_GOT.delete(K.id);U[I.sid]=exp+XF2_ACK_TTL;const us=JSON.stringify(U);try{localStorage.setItem(XF4_USED,us)}catch(e){}D.data[XF4_USED]=us;   /* 存檔取代（XQSave.load 會清 localStorage）後也記得收過 */
  const a=[];for(let i=0;i<n;i++)a.push(XQNet.putRetained(K.topic(i),""));await Promise.all(a);
  await XQNet.putRetained(K.topic("m"),JSON.stringify({v:4,done:Date.now(),ah:K.ah,exp:Date.now()+XF2_ACK_TTL}));
  return D}
/* XFER4:END */
if(typeof xf4Upload==="function"&&typeof xf4Download==="function"){xfUpload=xf4Upload;xfDownload=xf4Download}
setTimeout(()=>{try{if(localStorage.getItem("xq_xfOut"))xf2Watch()}catch(e){}},9000);

/* ---------- 存檔與讀檔（開頭畫面、設定、我的頁共用） ---------- */
function saveList(box,inTitle){const M=slotMetaAll(),cur=curSlot(),J=journey(),ex=store.get("exportAt",0),paint=()=>saveList(box,inTitle);
  box.innerHTML=`<p class="sv-h">自動存檔：切到背景、每 3 分鐘、換頁、每盤棋下完，都會存到「使用中」的那一格。<br>上次匯出成檔案：${ex?fmtAt(ex):"從未"}${!ex||Date.now()-ex>14*864e5?'<br><b class="sv-w">刪掉主畫面上的 App，存檔會一起不見；建議偶爾匯出一份放到「檔案」。</b>':""}</p>${inTitle?"":'<div class="sv-a"><button data-rl="1">🧾 對局保存紀錄</button></div>'}`
    +[1,2,3].map(n=>{const m=M[n],me=n===cur&&!!J;return slotCardHTML(n,m,me)+`<div class="sv-a">${me?`<button data-sa="save" data-n="${n}" class="main">立即存檔</button><button data-sa="exp" data-n="${n}">⬇ 匯出成檔案</button><button data-sa="copy" data-n="${n}">複製到別格</button>`
      :m?`<button data-sa="load" data-n="${n}" class="main">讀取</button><button data-sa="exp" data-n="${n}">⬇ 匯出</button><button data-sa="imp" data-n="${n}">⬆ 讀入檔案</button><button data-sa="del" data-n="${n}" class="warn">刪除</button>`
      :`<button data-sa="new" data-n="${n}">⚔ 在這格開始新的旅程</button><button data-sa="imp" data-n="${n}">⬆ 讀入檔案</button>`}</div>`}).join("")
    +(inTitle?'<button class="btn ghost xqt-bk" data-tb="menu">‹ 返回</button>':"");
  box.querySelectorAll("[data-sa]").forEach(x=>x.onclick=async()=>{vibrate(5);const n=+x.dataset.n,a=x.dataset.sa,m=M[n];
    if(a==="save"){x.disabled=true;if(await saveNow(false)){toast("已存檔・"+fmtAt(Date.now()));paint()}else x.disabled=false}
    else if(a==="exp")slotExport(n);
    else if(a==="copy")slotCopyAsk(n,paint);
    else if(a==="load")modal(`<div class="em">💾</div><h2>讀取第 ${n} 格？</h2><p class="muted">「${esc(m.pc)}・${esc(m.nm)}・Lv ${m.lv|0}」。${J&&cur?`目前的進度會先存回第 ${cur} 格。`:""}</p>`,[["讀取",()=>slotLoad(n)],["取消",null,true]]);
    else if(a==="del")modal(`<div class="em">🗑</div><h2>刪除第 ${n} 格？</h2><p class="muted">「${esc(m.pc)}・${esc(m.nm)}・Lv ${m.lv|0}・遊玩 ${fmtSec(m.sec)}」會被刪掉，無法復原。</p>`,[["刪除",async()=>{await slotDel(n);toast(`已刪除第 ${n} 格`);paint()}],["取消",null,true]]);
    else if(a==="imp")slotImportPick(n,paint,!J);
    else if(a==="new"){if(inTitle)titlePaint("pick",{mode:"new",slot:n});else{closeSheet();titleScreen({view:"pick",mode:"new",slot:n})}}});
  {const rl=box.querySelector("[data-rl]");if(rl)rl.onclick=()=>{vibrate(5);if(typeof rsLogSheet==="function")rsLogSheet()}}   /* 評比循環第 2 輪：🧾 對局保存紀錄（07m4-resume.js） */
  if(inTitle)box.querySelectorAll("[data-tb]").forEach(x=>x.onclick=()=>{vibrate(5);titlePaint(x.dataset.tb,{})})}
function saveSheet(){sheet("💾 存檔與讀檔",b=>saveList(b,false))}

/* ---------- 開頭畫面狀態機（11/11 AI 模擬玩家第二輪問題 1；全表見 story/88_開頭畫面與續局狀態機.md，測試 xiangqi-lab/tools/test-resume-state.js）----------
   原本只看「有沒有旅程（選過角色）」：沒選過角色的人，手機裡就算有下到一半的棋、戰績、殘局進度，新分頁也先跳「先試一手」，開頭畫面只有「新的旅程」；
   按「新的旅程」還會把這些進度（xq_play、xq_play2、戰績、電腦積分…都在 JOURNEY_KEYS 裡）整批清掉。改成先看「手機裡有沒有任何進度」：
   tsmProg(get,keys)：只讀 localStorage（get＝鍵→字串或 null，keys＝全部的鍵），回 {game 下到一半的對電腦棋, run 解到一半的殘局／關卡／主題訓練／測驗, rec 下過、解過、學過的紀錄, any}；
     xq_play 開機就會寫一盤空的（moves 是空的），m_cj 開機就會寫今日茶單——所以只認「走過棋」「解開過」，不認鍵在不在。
   tsmMenu(o)：開頭畫面 menu 有哪些按鈕（第一顆是主按鈕）；tsmFirst(o)：要不要先出「先試一手」（只給什麼都沒有的人） */
const TSM_PLAYED=["m_onboard1","m_xp","m_legend","m_legendGame","m_quizLog","m_quizBest","m_campSeen"];
const tsmJ=(get,k)=>{try{const v=get(k);return v==null?null:JSON.parse(v)}catch(e){return null}};
const tsmUnf=G=>!!(G&&typeof G==="object"&&!G.result&&Array.isArray(G.moves)&&G.moves.length>0);
const tsmRun=R=>!!(R&&typeof R==="object"&&((Array.isArray(R.path)&&R.path.length>0&&!R.ans)||(R.k>0&&!R.done)||(Array.isArray(R.a)&&R.a.length>0)));
const tsmNz=v=>!!(v&&typeof v==="object"&&Object.keys(v).length>0);
function tsmProg(get,keys){const o={game:false,run:false,rec:false,any:false},P=tsmJ(get,"xq_play"),R=tsmJ(get,"xq_cpuRate"),cj=tsmJ(get,"m_cj");let S=tsmJ(get,"xq_play2");
  if(tsmUnf(P))o.game=true;if(S&&S.moves)S={old:S};if(S&&typeof S==="object")for(const k in S)if(tsmUnf(S[k]))o.game=true;
  for(const k of keys||[])if(/^m_(cjRun|jRun)[A-Za-z]*$|^m_(jpRun|quizRun)$/.test(k)&&tsmRun(tsmJ(get,k)))o.run=true;
  if((P&&P.result&&Array.isArray(P.moves)&&P.moves.length)||tsmNz(tsmJ(get,"xq_record"))||tsmNz(tsmJ(get,"m_record"))||tsmNz(tsmJ(get,"xq_arenaStamps"))||(R&&((R.w|0)+(R.l|0)+(R.d|0)>0||(Array.isArray(R.hist)&&R.hist.length>0)))||(cj&&tsmNz(cj.solved))||TSM_PLAYED.some(k=>get(k)!=null))o.rec=true;
  o.any=o.game||o.run||o.rec;return o}
function tsmProgNow(){try{const K=[];for(let i=0;i<localStorage.length;i++)K.push(localStorage.key(i));return tsmProg(k=>localStorage.getItem(k),K)}catch(e){return{game:false,run:false,rec:false,any:false}}}
/* o＝{J 有旅程, prog 有進度, slots 存檔格數, off 能搬手機}。按鈕：go＝▶ 繼續（有旅程，顯示角色）；cont＝▶ 繼續／▶ 接著下（沒選角色但有進度：不建旅程、不選角、不改朝代，直接回那盤或首頁）；
   new＝⚔ 新的旅程；story＝選角色開始故事（沒選角色但有進度：進度留著、跟著那位角色）；later＝先逛逛（沒選角色也沒進度，之後再選）；save＝💾 存檔與讀檔；xf＝📱 從舊手機搬資料；im＝📂 讀入存檔檔案 */
function tsmMenu(o){if(o.J)return["go","new","save"];const L=o.prog?["cont","story"]:["new","later"];if(o.slots)L.push("save");if(o.off)L.push("xf");L.push("im");return L}
/* 「先試一手」：沒看過（firstWin）、沒旅程、沒存檔格、不是舊玩家、不是開發者模式、不是剛從雙份存檔還原、棋盤程式在、而且沒有任何進度 */
function tsmFirst(o){return!(o.fw||o.J||o.slots||o.old||o.dev||o.restored||o.noBoard||o.played||o.prog)}
/* cont 那顆按鈕的字：有下到一半的棋＝▶ 接著下（和誰、第幾回合）；殘局、關卡做到一半＝▶ 接著下（題名）；都沒有＝▶ 繼續（回首頁）。L＝07m4 rsLatest() */
function tsmContTxt(L){try{if(L&&L.g){const g=L.g,W=typeof rsWho==="function"?rsWho(g):{},n=Math.ceil(((g.moves||[]).length)/2);return{t:"▶ 接著下",s:(W.who?`和${W.who}${W.tag?"（"+W.tag+"）":""}的棋`:`「${W.title||"這盤棋"}」`)+`・第 ${n} 回合`}}
  if(L&&L.cj){const r=L.cj,nm=r.t==="cj"?String(r.nm||"").replace(/^\S*\s/,""):String(r.nm||"");return{t:"▶ 接著下",s:r.t==="qz"?"棋力測驗還沒做完":`「${nm||"上次那題"}」還沒${r.t==="lv"?"過完":r.t==="tm"?"做完":"解完"}`}}}catch(e){}
  return{t:"▶ 繼續",s:"回到首頁・戰績和進度都還在"}}
function tsmLatest(){try{return typeof rsLatest==="function"?rsLatest():null}catch(e){return null}}
/* 按 cont：回那一盤（rsGo 會先換到桌上、記成「問過了」，進對局頁不會再問一次）／那一題；都沒有就留在首頁 */
function tsmGoOn(){const L=tsmLatest();titleClose();try{if(L&&L.g&&typeof rsGo==="function"){rsGo(L.g);return}if(L&&L.cj&&L.cj.h){if(typeof rsAsk==="function")rsAsk(L.cj.t+":"+(L.cj.rk||"")+":"+L.cj.id);location.hash=L.cj.h;return}}catch(e){}if(!/^(#\/?)?$/.test(location.hash||""))goHome()}
/* 之後再選：關掉開頭畫面進首頁（第一課選了「下一盤簡單的棋」就照樣開練功房第 1 級——只在沒有下到一半的棋時開，免得蓋掉） */
function tsmLater(){titleClose();let nx=0;try{nx=+sessionStorage.getItem("xqFwNext")||0;sessionStorage.removeItem("xqFwNext")}catch(e){}
  if(nx&&Date.now()-nx<9e5&&!tsmProgNow().game){api("/play/new",{human:"r",lx:1,ranked:false}).then(()=>{location.hash="#/cpu"}).catch(()=>{});return}
  if(!/^(#\/?)?$/.test(location.hash||""))goHome()}
/* ---------- 開頭畫面狀態機：以上 ---------- */

/* ---------- 開頭畫面 ---------- */
function titleClose(){const o=TITLE;TITLE=null;document.body.classList.remove("xqt-on");if(!o)return;o.classList.add("out");setTimeout(()=>o.remove(),380)}
function titleScreen(opt){opt=opt||{};try{navClear()}catch(e){}try{sessionStorage.setItem("xqTitleShown","1")}catch(e){}
  if(!TITLE){const o=document.createElement("div");o.id="xqTitle";o.setAttribute("role","dialog");o.setAttribute("aria-label","象棋千秋 開頭畫面");
    o.innerHTML=`<div class="ld-img"><img alt=""><img alt=""></div><div class="ld-q"><div class="ld-tt"></div><div class="ld-qt"></div><div class="ld-src"></div></div><div class="xqt-in"><div class="xqt-logo">象棋千秋</div><div class="xqt-sub">雲河七星・千秋棋話</div><div class="xqt-b"></div></div>`;
    document.body.append(o);TITLE=o;document.body.classList.add("xqt-on");try{ldShow(o)}catch(e){}
    /* 開發者 11/11「這個莫名其妙的紅圈按扭拿掉」：標題畫面右上角的 ⚙ 設定鈕拿掉（設定從星槎天字客房進） */}
  const J=journey();
  if(!opt.view&&fwNeed()){titlePaint("wait",opt);fwSaved().then(s=>{if(TITLE&&TITLE.dataset.v==="wait")titlePaint(s||!fwNeed()?"menu":typeof bhxNeed==="function"&&bhxNeed()?"xu":"first",opt)});return}   /* 新手秒開局：先確定 IndexedDB 裡也沒有存檔（不然開機會從存檔還原），才出一步殺 */
  if(!opt.view&&J&&J.re===1){store.set("journey",{...J,re:2});try{saveNow(true)}catch(e){}}   /* 開發者 11/13 晚（iPad 舊存檔更新後一開就被帶去選角）：拿掉「存檔功能上線了＋最後改選一次」公告，舊存檔直接當「就是這位」；換角色請開新的旅程（從開場流星選） */
  titlePaint(opt.view||"menu",opt)}
function titlePaint(view,opt){const o=TITLE;if(!o)return;opt=opt||{};const inn=o.querySelector(".xqt-in"),b=o.querySelector(".xqt-b"),J=journey(),M=slotMetaAll();o.dataset.v=view;
  inn.classList.toggle("full",/^(pick|diff|confirm|save|slots|first)$/.test(view));inn.scrollTop=0;
  if(view==="wait"){b.innerHTML="";return}if(view==="first"){fwPaint(b);return}
  /* hspx 開發者 11/12「讓遊戲一進去，把選角放到七星降落後才讓玩家選角，黑洞對戰直接放最一開頭」：全新玩家的開頭畫面只有一顆「入局」（手機要先點一下才能放音樂），
     按下去就是星渦 → 第〇章 → 黑洞序局 → 七星流星裡點一顆星選角（07bh-blackhole.js）；原本選角前的「新手秒開局」一步殺拿掉（開發者選，序局本身就是一步殺）。換手機的人留讀入存檔、搬資料 */
  if(view==="xu"){try{if(typeof opPre==="function")opPre()}catch(e){}   /* 開場三首先下載好（按「入局」那一下就能出聲） */
    b.innerHTML=`<button class="btn xqt-main" id="tXu">入局</button><div class="xqt-lk"><button type="button" id="tIm">📂 讀入存檔檔案</button><button type="button" id="tXf">📱 從舊手機搬資料</button></div>`;
    b.querySelector("#tXu").onclick=()=>{vibrate(10);if(typeof bhXuStart==="function"){bhXuStart(false);titleClose();location.hash="#/adventure"}else titlePaint("menu",{})};   /* 先蓋星渦再關開頭畫面；背後開星槎頁（首頁 3D 園子太重，會讓過場頓一下） */
    b.querySelector("#tXf").onclick=()=>{vibrate(6);titleClose();xfRecv()};b.querySelector("#tIm").onclick=()=>{vibrate(6);slotImportPick(1,null,true)};return}const back=v=>`<button class="btn ghost xqt-bk" data-tb="${v||"menu"}">‹ 返回</button>`;
  if(view==="news"){const nm=meName();
    b.innerHTML=`<div class="xqt-msg"><h3>💾 存檔功能上線了</h3><p>你目前的進度已經存在第 1 格，角色是「${esc(nm)}」。從今天起，角色選定後就不能再換；想玩別的角色，可以在開頭畫面開始「新的旅程」，存到第 2、3 格。</p><p class="muted">這次更新送你一次「最後改選」：只換角色，修為、官階、故事進度都保留。</p></div><button class="btn" id="tKeep">就是${esc(nm)}</button><button class="btn ghost" id="tRe">最後改選一次</button>`;
    b.querySelector("#tKeep").onclick=()=>{vibrate(8);const j=journey();if(j){store.set("journey",{...j,re:2});saveNow(true)}titlePaint("menu",{})};
    b.querySelector("#tRe").onclick=()=>{vibrate(5);titlePaint("pick",{mode:"repick"})}}
  else if(view==="menu"){   /* 11/11 第二輪問題 1：按鈕照 tsmMenu（狀態機）排；沒選角色但手機裡有進度＝主按鈕「▶ 繼續／▶ 接著下」，不逼選角 */
    const BL=tsmMenu({J:!!J,prog:!J&&tsmProgNow().any,slots:Object.keys(M).length,off:!!OFF}),lk=[];let h="";
    for(const k of BL){if(k==="go"){const m=saveMetaNow(),n=curSlot();h+=`<button class="xqt-go" id="tGo"><img src="${slotImg(m.c)}" alt="" onerror="this.style.visibility='hidden'"><span><b>▶ 繼續</b><small>${esc(m.pc)}・${esc(m.nm)}　修為 Lv ${m.lv}${m.rk?"・"+esc(m.rk):""}</small><small>故事 ${m.st}／36・遊玩 ${fmtSec(m.sec)}${n?`・第 ${n} 格`:""}</small></span></button>`}
      else if(k==="cont"){const T=tsmContTxt(tsmLatest());h+=`<button class="xqt-go" id="tCont"><img src="${slotImg(myChar()||mySex())}" alt="" onerror="this.style.visibility='hidden'"><span><b>${esc(T.t)}</b><small>${esc(T.s)}</small><small>還沒選角色也能玩；想聽故事時再選</small></span></button>`}
      else if(k==="new")h+=`<button class="btn ${J?"ghost":"xqt-main"}" id="tNew">⚔ 新的旅程</button>`;
      else if(k==="story")h+=`<button class="btn ghost" id="tNew">🎭 選一位角色，開始故事</button>`;
      else if(k==="later")h+=`<button class="btn ghost" id="tLater">先逛逛，之後再選角色</button>`;
      else if(k==="save")h+=`<button class="btn ghost" id="tSv">💾 存檔與讀檔</button>`;
      else if(k==="xf")lk.push('<button type="button" id="tXf">📱 從舊手機搬資料</button>');
      else if(k==="im")lk.push('<button type="button" id="tIm">📂 讀入存檔檔案</button>')}
    b.innerHTML=h+(lk.length?`<div class="xqt-lk">${lk.join("")}</div>`:"");
    const on=(id,fn)=>{const e=b.querySelector(id);if(e)e.onclick=()=>{vibrate(6);fn()}};
    on("#tGo",()=>{titleClose();if(!/^(#\/?)?$/.test(location.hash||""))goHome()});on("#tCont",tsmGoOn);on("#tLater",tsmLater);
    on("#tNew",()=>{if(J)titlePaint("slots",{mode:"new"});else{const e=[1,2,3].find(n=>!M[n])||1;titlePaint("pick",{mode:"new",slot:e})}});
    on("#tSv",()=>titlePaint("save",{}));on("#tXf",()=>{titleClose();xfRecv()});on("#tIm",()=>slotImportPick([1,2,3].find(n=>!M[n])||1,null,true))}
  else if(view==="slots"){const cur=curSlot();if(opt.mode==="new"&&typeof opPre==="function")try{opPre()}catch(e){}   /* 11/13 晚：新旅程一定從開場來，選格這幾秒先下載開場曲與圖 */
    b.innerHTML=`<p class="xqt-h">新的旅程要存在哪一格？</p>`+[1,2,3].map(n=>slotCardHTML(n,M[n],n===cur&&!!J)+`<div class="sv-a">${M[n]?`<button data-ns="${n}" class="warn">覆蓋這格</button>`:`<button data-ns="${n}" class="main">用這格</button>`}</div>`).join("")+back();
    b.querySelectorAll("[data-ns]").forEach(x=>x.onclick=()=>{vibrate(5);const n=+x.dataset.ns,m=M[n];if(!m)return titlePaint("pick",{mode:"new",slot:n,c:opt.c});
      modal(`<div class="em">⚠</div><h2>覆蓋第 ${n} 格？</h2><p class="sv-w">「${esc(m.pc)}・${esc(m.nm)}・Lv ${m.lv|0}・遊玩 ${fmtSec(m.sec)}」會被清掉，無法復原。</p>`,[["清掉並開始",()=>titlePaint("pick",{mode:"new",slot:n,c:opt.c})],["取消",null,true]])})}
  else if(view==="pick"){if(opt.mode==="new"&&!opt.c&&typeof bhxNewJourney==="function"){bhxNewJourney(opt.slot||1);return}   /* 開發者 11/12「點選新的旅程不會從開頭開始」：新旅程一律從開頭的黑洞序局來，在七星流星裡選角 */
    const L=obPicks(),re=opt.mode==="repick",cur=myChar();
    b.innerHTML=`<p class="xqt-h">${re?"最後一次改選：選定後就鎖住了":"選一位，用他的眼睛走進千秋棋局"}</p><div id="tPk"></div>${!J&&!re?'<button class="btn ghost" id="tLater">之後再選，先逛逛 ›</button>':""}${back(re?"news":J?"slots":"menu")}`;   /* 11/11 第二輪問題 1：還沒有旅程的人可以先不選（之後從「我的角色」頁的「🔒 旅程」、或下次開頭畫面再選） */
    {const e=b.querySelector("#tLater");if(e)e.onclick=()=>{vibrate(5);tsmLater()}}
    obCarousel(b.querySelector("#tPk"),L,Math.max(0,L.findIndex(x=>x.k===(opt.c||(re?cur:"")))),x=>{vibrate(10);titlePaint(re?"confirm":"diff",{...opt,c:x.k})},re&&cur?cur:null)}
  else if(view==="diff"){const C=WX_CHARS[opt.c];if(!C)return titlePaint("pick",opt);const cur=opt.diff||2,sg=diffSuggest();   /* 意見回饋 675：選角之後選航行難度（預設入局） */
    b.innerHTML=`<p class="xqt-h">這趟星槎，想練到哪裡？</p><p class="muted xqt-nml">難度只管星槎裡的電腦對手和千秋殘局的題目，之後隨時可以在行囊、設定裡換。</p>`+DIFF.map((d,i)=>`<button class="xqt-df${i+1===cur?" on":""}" data-df="${i+1}"><b>${esc(d.n)}${i===1?'<em>多數人選這個</em>':""}${sg===i+1?'<em>依你的棋力測驗建議</em>':""}</b><small>${esc(d.fit)}・練${esc(d.learn)}</small></button>`).join("")+back("pick");
    b.querySelectorAll("[data-df]").forEach(x=>x.onclick=()=>{vibrate(8);titlePaint("confirm",{...opt,diff:+x.dataset.df})});
    b.querySelectorAll("[data-tb]").forEach(x=>x.onclick=()=>{vibrate(5);titlePaint(x.dataset.tb,opt)});return}
  else if(view==="confirm"){const c=opt.c,C=WX_CHARS[c],re=opt.mode==="repick";if(!C)return titlePaint("pick",opt);
    b.innerHTML=`<div class="xqt-cf"><img src="data/xs/prev_${c}.webp" alt=""><div><b>${esc(C.pc)}・${esc(C.n)}</b><small>小名${esc(C.nk||C.n)}・${esc(C.s||"")}</small><small>「${esc(C.say||"")}」</small></div></div>
      <p class="xqt-warn">${re?`改成${esc(C.n)}之後，修為、官階、故事進度都保留；這是最後一次改選，之後就鎖定了。`:"🔒 選定之後，這段旅程就不能再換角色。想換，要回到開頭畫面開始新的旅程（可以存到別格，不會蓋掉）。"}</p>
      ${re?"":!myName()?`<label class="xqt-l" for="tNm">幫自己取個名字（線上大廳會顯示）</label><input id="tNm" class="xqt-nm" maxlength="16" value="${esc(defaultName())}" placeholder="例如：雲河小棋手">`:`<p class="muted xqt-nml">線上名字：${esc(myName())}（設定裡可以改）</p>`}
      ${re?"":`<p class="muted xqt-nml">航行難度：${esc(DIFF[(opt.diff||2)-1].n)}（之後隨時可以改）</p>`}${!re&&!J&&tsmProgNow().any?'<p class="muted xqt-nml">你現在的戰績、下到一半的棋都會留著，跟著這位角色；首頁會換成他家鄉朝代的園子。</p>':""}<button class="btn xqt-main" id="tOk">${re?"就改成"+esc(C.nk||C.n):"以"+esc(C.n)+"出發"}</button>${back(re?"pick":"diff")}`;
    b.querySelector("#tOk").onclick=async e=>{vibrate(10);const btn=e.currentTarget;btn.disabled=true;
      if(re){journeyRepick(c);titlePaint("menu",{});return}const ip=b.querySelector("#tNm"),nm=ip?(ip.value||"").trim()||defaultName():null;
      try{await journeyStart(opt.slot||curSlot()||1,c,nm,opt.diff||2)}catch(err){btn.disabled=false;toast("開始失敗："+(err&&err.message||err))}};
    b.querySelectorAll("[data-tb]").forEach(x=>x.onclick=()=>{vibrate(5);titlePaint(x.dataset.tb,opt)});return}
  else if(view==="save"){saveList(b,true);return}
  b.querySelectorAll("[data-tb]").forEach(x=>x.onclick=()=>{vibrate(5);titlePaint(x.dataset.tb,x.dataset.tb==="pick"?opt:{})})}

/* ---------- 新手秒開局（Gemini 遊玩樂趣評估，開發者 11/8 核准） ----------
   第一次打開、什麼存檔都沒有的玩家，開頭畫面先出一題「一步殺」，走對了才進選角和序幕；有「跳過」。
   不出現：已經有旅程或存檔格、IndexedDB 裡有存檔（開機會還原）、舊玩家、開發者模式、已經下過或跳過（firstWin）。
   局面：黑將在 4 路底線，紅帥坐鎮中路（黑將不能跟帥面對面），紅俥九平六＝唯一的一步殺 */
const FW_FEN="3k5/9/9/9/9/9/9/9/9/R3K4",FW_PLAYED=["m_onboard1","m_xp","m_record","xq_record","m_legend","m_legendGame","m_quizLog","m_quizBest"];   /* xq_play、m_cj 開機就會寫（首頁的未下完棋局、今日茶單），不能拿來認舊玩家；殘局改看有沒有解開過的題 */
/* 11/11 第二輪問題 1：判斷搬到狀態機 tsmFirst；多看 tsmProgNow（下到一半的棋、解到一半的殘局、積分、擂台章、訓練營…有任何一樣就不是第一次） */
function fwNeed(){try{return tsmFirst({fw:!!store.get("firstWin",null),J:!!journey(),slots:Object.keys(slotMetaAll()).length,old:!!SAVE_OLD,dev:typeof DEVMODE==="function"&&!!DEVMODE(),
  restored:!!sessionStorage.getItem("xqRestored"),noBoard:!window.XQCore||typeof Board!=="function",played:FW_PLAYED.some(k=>localStorage.getItem(k)!=null),prog:tsmProgNow().any})}catch(e){return false}}
/* 存檔格（xqlab-slots）或雙份存檔（xqlab-save，m.html 開頭那段）裡已經有旅程＝不是新玩家；資料庫不存在時不建立它（onupgradeneeded 就放棄） */
async function fwSaved(){try{if(Object.keys(await slotAll()).length)return true}catch(e){}if(!window.XQSave||!window.indexedDB)return false;
  return new Promise(ok=>{let done=false;const end=v=>{if(!done){done=true;ok(v)}};setTimeout(()=>end(false),1500);let r;try{r=indexedDB.open("xqlab-save")}catch(e){return end(false)}
    r.onupgradeneeded=()=>{try{r.transaction.abort()}catch(e){}};r.onerror=r.onblocked=()=>end(false);
    r.onsuccess=()=>{const db=r.result;try{if(!db.objectStoreNames.contains("kv")){db.close();return end(false)}const q=db.transaction("kv","readonly").objectStore("kv").get("m_journey");
      q.onsuccess=()=>{end(q.result!=null);db.close()};q.onerror=()=>{end(false);db.close()}}catch(e){try{db.close()}catch(x){}end(false)}}})}
function fwCSS(){if(document.getElementById("fw-css"))return;const s=document.createElement("style");s.id="fw-css";s.textContent=`
#xqTitle .fw-say{display:flex;gap:10px;align-items:center;background:#FFF8EC;border:1px solid #d8c8b0;border-radius:14px;padding:10px 12px;line-height:1.6;font-size:15.5px;text-align:left}
#xqTitle .fw-say img{width:54px;height:54px;border-radius:50%;object-fit:cover;object-position:top;flex:none;background:#E8DCC6}
#xqTitle .fw-say p{margin:0}#xqTitle .fw-say b{display:block;font-size:12.5px;color:#9E1B15;letter-spacing:.1em}
#xqTitle .fw-bd svg{display:block;width:100%;max-width:400px;margin:0 auto;height:auto;touch-action:none}
#xqTitle .fw-st{margin:0;text-align:center;font-size:15px;line-height:1.6;min-height:3.2em;color:#3B2A1A}
#xqTitle .fw-st.ok{color:#9E1B15;font-weight:900;font-size:17px}#xqTitle .fw-st.no{color:#7A3B12}
#xqTitle .fw-sk{width:100%;min-height:46px}#xqTitle .fw-go{width:100%;min-height:56px;font-size:19px;animation:fwPop .5s ease-out}
@keyframes fwPop{0%{transform:scale(.85);opacity:0}70%{transform:scale(1.04)}100%{transform:none;opacity:1}}`;document.head.append(s)}
/* 錯的那一步：落點畫一個紅色 ✗（棋盤 viewBox 560×620，左上第一格中心 40,40，每格 60） */
function fwX(svg,i){const NS="http://www.w3.org/2000/svg",x=40+i%9*60,y=40+(i/9|0)*60,g=document.createElementNS(NS,"g");g.setAttribute("pointer-events","none");
  for(const d of[`M${x-15} ${y-15}L${x+15} ${y+15}`,`M${x+15} ${y-15}L${x-15} ${y+15}`]){const p=document.createElementNS(NS,"path");p.setAttribute("d",d);p.setAttribute("stroke","#C0392B");p.setAttribute("stroke-width","7");p.setAttribute("stroke-linecap","round");p.setAttribute("opacity",".85");g.append(p)}svg.append(g)}
function fwChime(){try{withAudio(()=>{const t=AC.currentTime+.05;[523,659,784,1047].forEach((f,i)=>bellHit(t+i*.13,f))})}catch(e){}}
/* 開發者 11/11 選 v3 規劃書 B01：第一課走對以後，不再只有「選角色」一條路，給三個選擇——
   🤖 下一盤簡單的棋（選完角色、看完序幕直接開練功房第 1 級，不算分）、🧩 再練一題（FW_FEN2：兩顆俥的一步殺，唯一解 俥一進九）、先逛逛（照舊進首頁）。
   三條路都會先選角色（旅程、存檔格都跟著角色）；選了哪條記在 sessionStorage xqFwNext（15 分鐘內有效），序幕按「入局」時才用。
   第二題（more）不改 firstWin，走對記 fwok2；漏斗多記 nxcpu／nxmore／nxhome */
const FW_FEN2="4k4/R8/9/9/9/9/9/9/9/3K4R";
function fwPaint(box,more){fwCSS();const C=window.XQCore,B0=C.parseFen(more?FW_FEN2:FW_FEN),RK=B0.indexOf("R"),slot=()=>[1,2,3].find(n=>!slotMetaAll()[n])||1;
  const MT=C.legal(B0,"r").find(([f,t])=>{const nb=C.make(B0,f,t);return C.inCheck(nb,"b")&&!C.legal(nb,"b").length})||[RK,RK+3];
  let sel=-1,busy=false,miss=0,mark=-1,hk=null,done=false;
  box.innerHTML=`<div class="fw-say"><img src="data/actors/teller.webp" alt="" onerror="this.remove()"><p><b>說書人</b>「${more?"再來一手：這回紅方有兩顆俥。一顆已經擋住黑將下面那一排，另一顆走哪裡，能把黑將困住？":"客官，先試一手：紅俥走哪裡，能把黑將困住？"}」</p></div>
    <div class="fw-bd" id="fwBd"></div><p class="fw-st" id="fwSt" role="status" aria-live="polite">先點紅色的「俥」，再點它要去的地方。</p><button class="btn ghost fw-sk" id="fwSk" type="button">${more?"不練了，選一位角色出發 ›":"跳過，我會下棋了 ›"}</button>`;
  const bd=Board(x=>tap(x));box.querySelector("#fwBd").append(bd.svg);
  const st=(t,c)=>{const e=box.querySelector("#fwSt");if(e){e.innerHTML=t;e.className="fw-st"+(c?" "+c:"")}};
  const draw=()=>{bd.draw(B0,{sel,targets:sel>=0?C.legal(B0,"r").filter(([f])=>f===sel).map(x=>x[1]):[],...(hk?{hint:hk}:{})});if(mark>=0)fwX(bd.svg,mark)};
  const go=()=>{vibrate(10);if(TITLE)titlePaint("pick",{mode:"new",slot:slot()})};
  const nx=k=>{try{if(k==="cpu")sessionStorage.setItem("xqFwNext",String(Date.now()));else sessionStorage.removeItem("xqFwNext")}catch(e){}fnStep(k==="cpu"?"nxcpu":"nxhome");go()};
  box.querySelector("#fwSk").onclick=()=>{if(done||more)return go();vibrate(5);store.set("firstWin",{at:Date.now(),skip:1});fnStep("fwskip");titlePaint("menu",{})};
  function tap(x){if(busy||done)return;const L=C.legal(B0,"r");if(sel>=0&&L.some(([f,t])=>f===sel&&t===x))return move(sel,x);sel=L.some(([f])=>f===x)?x:-1;if(sel>=0)vibrate(5);draw()}
  function move(f,t){const nb=C.make(B0,f,t),tx=C.notate(B0,f,t),ck=C.inCheck(nb,"b"),mate=ck&&!C.legal(nb,"b").length;sel=-1;busy=true;
    if(mate){done=true;mark=-1;hk=null;vibrate(20);bd.draw(nb,{last:{f,t},check:C.kingSq(nb,"b"),fx:true});if(!more)store.set("firstWin",{at:Date.now(),miss});fnStep(more?"fwok2":"fwok");
      st(`✔ ${esc(tx)}——將死！`,"ok");setTimeout(fwChime,900);
      setTimeout(()=>{if(!TITLE||TITLE.dataset.v!=="first")return;const sk=box.querySelector("#fwSk");if(sk){sk.className="btn xqt-main fw-go";sk.textContent="選一位角色，出發 ›"}
        if(more)st(`說書人一拍醒木：「漂亮！兩顆俥一上一下，把黑將夾在中間——棋手管這一手叫『雙俥錯』。」`,"ok");else st(`說書人一拍醒木：「好眼力！${miss?"試了幾次就找到了，":"一出手就找到了，"}黑將上下左右都沒路走——這就叫『將死』。」`,"ok");
        if(more)modal(`<div class="em">🎉</div><h2>又將死了！</h2><p>一顆俥守住下面那一排，另一顆俥衝到底將軍——黑將往下、往旁邊都逃不掉。</p><p><b>要不要直接下一盤簡單的棋？</b></p><p class="muted" style="font-size:13px">下棋、逛逛之前，會先請你選一位角色。下的那一盤是練功房第 1 級，不算分。</p>`,[["🤖 下一盤簡單的棋 ›",()=>nx("cpu")],["先逛逛",()=>nx("home"),true]]);
        else modal(`<div class="em">🎉</div><h2>將死！漂亮的第一手</h2><p>俥一平過去，黑將往下走還在俥的直線上，往旁邊走又會跟紅帥面對面——無路可逃。</p><p>象棋比的就是：誰先把對方的將（帥）困住。${miss?"多想幾次就找到答案，這就是下棋的樂趣。":"一次就找到，眼力真好！"}</p><p><b>要再練一題，還是直接下一盤簡單的棋？</b></p><p class="muted" style="font-size:13px">下棋、逛逛之前，會先請你選一位角色。下的那一盤是練功房第 1 級，不算分。</p>`,[["🤖 下一盤簡單的棋 ›",()=>nx("cpu")],["🧩 再練一題",()=>{fnStep("nxmore");vibrate(5);fwPaint(box,1)},true],["先逛逛",()=>nx("home"),true]])},2600);return}
    miss++;mark=t;vibrate([20,40,20]);bd.draw(nb,{last:{f,t},check:ck?C.kingSq(nb,"b"):-1});fwX(bd.svg,t);
    const why=ck?"將軍了！可是黑將還能躲開。":"這步沒有將到黑將，它還能自由走動。";st(`✘ ${esc(tx)}：${why}`,"no");
    setTimeout(()=>{if(!TITLE||TITLE.dataset.v!=="first"||done)return;busy=false;hk=miss>=2?[MT[0],MT[1]]:[MT[0]];draw();
      st(`✘ 剛才走的是 ${esc(tx)}（紅色 ✗）。💡 ${miss>=2?"藍框就是俥和它要去的位置，點點看！":more?"靠近黑將的那顆俥已經封住它往下的路；藍框這顆俥要去將軍，讓黑將往旁邊也逃不掉。":"紅帥守著中間這一路，黑將不能跟帥面對面；俥要去封住黑將「那一條直線」。"}`,"no")},1500)}
  draw()}

/* ---------- 新手流失數據（開發者 11/8 核准）：新玩家從打開到下完第一盤，每一步距離第一次打開幾秒 ----------
   只記全新裝置（沒有旅程、存檔格、舊玩家資料、IndexedDB 存檔；不是開發者模式、不是自動化測試），每台只記第一次，下完第一盤或 14 天後停。
   匿名：只送隨機安裝 id、步驟秒數、版本、裝置類型；不送名字、線上 id、存檔。走測驗答題那條匿名管道（XQNet.shareIRT → 大廳 irt 頻道），
   開發者電腦的 lobby-bots.js 收到 t:"fun" 存進 xiangqi-db/onboard-funnel.jsonl，漏斗用 node xiangqi-lab/tools/onboard-funnel.js 看。
   每次多一步就把目前全部的步驟整份送一次（掉了一筆也不要緊，腳本取同一個 id 最完整的那筆）。本機、設了 xq_netRoot 的測試機加 test:1。
   步驟：open 打開、pre 預載完成、fw 秒開局出現、fwok 秒開局走對／fwskip 按跳過、pick 選角完成、pro 序幕看完、home 進首頁、g1 第一盤開始（第一步）、g1e 第一盤下完。
   store "funnel"（整支手機一份，不在存檔清單裡：開新旅程、讀檔都不會重來） */
let FN=null,FN_T=0,FN_PRE=0,FN_PM=0;
function fnDev(){const u=navigator.userAgent||"";return/iPad|Tablet/i.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1)?"tablet":/Mobi|Android|iPhone|iPod/i.test(u)?"phone":"desktop"}
function fnTest(){try{return localStorage.getItem("xq_netRoot")!=null||/^(localhost|127\.|\[::1\])|\.localhost$/.test(location.hostname)}catch(e){return false}}
function fnSend(){try{if(!FN||!window.XQNet||!XQNet.shareIRT)return;XQNet.shareIRT({t:"fun",v:1,iid:FN.id,s:{...FN.s},ver:String(window.XQ_BUILD||"").slice(0,20),dev:FN.dev,...(FN.test?{test:1}:{})})}catch(e){}}
function fnStep(k){try{if(!FN||FN.end||FN.s[k]!=null)return;FN.s[k]=Math.max(0,Math.round((Date.now()-FN.t0)/1000));if(k==="g1e"||Date.now()-FN.t0>14*864e5)FN.end=1;store.set("funnel",FN);fnSend();if(FN.end&&FN_T){clearInterval(FN_T);FN_T=0}}catch(e){}}
function fnTick(){try{if(!FN||FN.end)return;const pv=document.getElementById("preov");if(pv)FN_PRE=1;
  if(FN.s.pre==null&&!pv&&(FN_PRE||performance.now()>8000))fnStep("pre");   /* 載入畫面出現過又關掉＝預載完成；8 秒都沒出現＝不用下載 */
  if(FN.s.pre!=null&&FN.s.fw==null&&TITLE&&TITLE.dataset.v==="first")fnStep("fw");
  if(FN.s.pick!=null&&FN.s.pro==null){if(document.querySelector(".modal.prolog"))FN_PM=1;else if(FN_PM)fnStep("pro")}
  if(FN.s.pro!=null&&FN.s.home==null&&!TITLE&&/^(#\/?)?$/.test(location.hash||""))fnStep("home")}catch(e){}}
function fnRun(){if(FN_T||!FN||FN.end)return;FN_T=setInterval(fnTick,500);addEventListener("xq-play",()=>fnStep("g1"));addEventListener("xq-result",()=>{fnStep("g1");fnStep("g1e")})}
function fnBoot(){try{FN=store.get("funnel",null);if(FN){if(!FN.end&&FN.s){if(Date.now()-FN.t0>14*864e5){FN.end=1;store.set("funnel",FN)}else fnRun()}return}
  if(SAVE_OLD!==false||journey()||Object.keys(slotMetaAll()).length||sessionStorage.getItem("xqRestored")||navigator.webdriver||(typeof DEVMODE==="function"&&DEVMODE()))return;
  const t0=Math.round(performance.timeOrigin||Date.now());
  fwSaved().then(s=>{if(s||store.get("funnel",null))return;const a=new Uint8Array(8);crypto.getRandomValues(a);
    FN={id:[...a].map(x=>(x%36).toString(36)).join(""),t0,dev:fnDev(),s:{open:0},...(fnTest()?{test:1}:{})};store.set("funnel",FN);fnSend();fnRun()}).catch(()=>{})}catch(e){}}
setTimeout(fnBoot,0);

/* ---------- 開機：舊玩家過渡、開頭畫面、自動存檔 ---------- */
function saveMigrateOld(){const c=myChar()||(mySex()==="f"?"f":"m");store.set("journey",{c,sx:mySex(),born:Date.now(),v:1,re:2,mig:1});
  if(store.get("playSec",null)==null){let s=0;try{s=Math.round(practiceTotal()*60)}catch(e){}store.set("playSec",s)}store.set("slotCur",1);lockFix();saveNow(true)}
function saveBoot(){if(SAVE_OLD!==null){store.set("saveMig1",Date.now());if(SAVE_OLD)saveMigrateOld()}lockFix();
  try{const J=store.get("journey",null);if(J&&CHAR_ERA[J.c]&&J.era!==2){store.set("era",CHAR_ERA[J.c]);store.set("eraUser",null);store.set("journey",{...J,era:2});setTimeout(()=>{try{applyEra()}catch(e){}},300)}}catch(e){}   /* 意見回饋 669 補：1200 版以前就選好角色的旅程，開 App 時補套一次角色主場的朝代（之後自己換的照自己的） */
  let pro=false,shown=false;try{pro=!!sessionStorage.getItem("xqPrologue");if(pro)sessionStorage.removeItem("xqPrologue");shown=!!sessionStorage.getItem("xqTitleShown")}catch(e){}
  if(pro){if(typeof bhxNeed==="function"&&bhxNeed()&&typeof bhxBack==="function")bhxBack(true);setTimeout(()=>{if(typeof bhxLandNew==="function"&&bhxLandNew())return;prologue()},1500)}   /* 有舊旅程的人在開頭選好角色：換格會重新載入，載入後一樣降落經典星槎 */   /* 換格開新旅程會重新載入：等序幕的 1.5 秒先蓋黑洞底，不露出首頁 */
  if(shown||navigator.webdriver||!/^(#\/?)?$/.test(location.hash||""))return;titleScreen({})}
setTimeout(()=>{try{saveBoot()}catch(e){console.warn("saveBoot",e)}},0);
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="hidden")saveNow(true)});
addEventListener("pagehide",()=>{saveNow(true)});
addEventListener("hashchange",()=>{if(Date.now()-SAVE_HC>20000){SAVE_HC=Date.now();saveNow(true)}});
addEventListener("xq-result",()=>setTimeout(()=>saveNow(true),1500));
setInterval(()=>{if(document.visibilityState==="visible")saveNow(true)},180000);
setInterval(()=>{try{if(document.visibilityState==="visible"&&!TITLE&&journey())store.set("playSec",(store.get("playSec",0)|0)+15)}catch(e){}},15000);
/* hspx 11/11「讀檔的時候沒有切到正確的檔案」：選了哪位角色（pChar）原本不在存檔清單裡，讀別格時角色、名字、小人造型還是上一格的。
   pChar 已加進 JOURNEY_KEYS；舊存檔沒有 pChar 的，開機時照這一格旅程記的角色（journey.c）校正，順便重存一次，存檔格的名字也跟著改對 */
function saveFixChar(){try{const J=journey();if(!J||typeof WX_CHARS==="undefined"||!WX_CHARS[J.c]||store.get("pChar","")===J.c)return;const C=WX_CHARS[J.c];
  store.set("pChar",J.c);if(C.sx)store.set("pSex",C.sx);if(C.pc)store.set("botPiece",C.pc);try{window.dispatchEvent(new Event("xq-look"))}catch(e){}try{if(typeof route==="function")route()}catch(e){}setTimeout(()=>saveNow(true),1500)}catch(e){}}
setTimeout(saveFixChar,0);
/* ---------- 卡關訊號（開發者 11/11 照 Claude 方案核准：預設開、八種訊號）----------
   每次開 App 算一段，用臨時亂數 sid（不用裝置代號、名字，跟玩家登記對不起來），記：
   p＝走過的頁（頁名＋秒數，最近 30 段）；e＝卡住訊號 [種類, 頁名, 第幾秒, 細節]：
     idle 同一頁 2 分鐘沒操作（細節＝後來停了幾秒）、rage 不能點的地方 2 秒內連點 3 下（細節＝點到的樣式名）、bounce 進一頁不到 5 秒就退回、
     mvt 點了藍色著法（四個字＋箭頭／卡片）、miss 新手課（章回關卡）同一步錯第 3 次、hint 用了提示、quit 對局 10 手內認輸或離開、err 程式出錯（種類＋行號）；
   last＝送出時停在哪一頁。不收名字、裝置代號、棋譜、存檔、打的字、截圖、位置。
   切到背景或關掉時整包送（XQNet.shareIRT → 大廳 irt 頻道，t:"stk"），開發者電腦的 collect-anon.js 存進 xiangqi-db/stuck-signals.jsonl，
   彙整：node xiangqi-lab/tools/stuck-report.js。同一頁 3 分鐘沒動先送一包 live:1，收資料的分頁會即時跳一行。
   關法：設定 → 隱私「📍 匿名記錄卡住的地方」（store stkOff）；家長關閉線上大廳時本來就連不上大廳、不會送。開發者模式不記（測試機、本機例外，加 test:1） */
const STK={sid:"",t0:Date.now(),p:[],e:[],pg:"",h:"",pgT:Date.now(),act:Date.now(),idle:-1,live:0,taps:[],rageAt:0,errN:0,miss:{}};
function stkOn(){try{return!store.get("stkOff",false)&&!navigator.webdriver&&(!(typeof DEVMODE==="function"&&DEVMODE())||fnTest())}catch(e){return false}}
const stkSec=()=>Math.round((Date.now()-STK.t0)/1000);
/* usePlace 沒對照的頁會回英文路徑，補常見的中文名 */
const STK_PN={feedback:"意見回饋",lobby:"線上大廳",pvp:"同桌對弈",cpu:"挑戰電腦",camp:"新手訓練營",hub:"書院／茶樓",settings:"設定",db:"棋譜庫",quiz:"測驗",guess:"猜著法",me:"我的角色",today:"今日推薦",stats:"戰績",openings:"開局",redo:"錯棋重練",terms:"規則碑林",canju:"殘局",cup:"千秋盃",cpuroom:"練功房",arena:"擂台",theme:"主題練習",gm:"大師對局",simul:"車輪戰"};
function stkPg(h){try{const r=typeof usePlace==="function"?usePlace(h):(String(h||"").split("/")[1]||"首頁");return/^[\x00-\x7f]+$/.test(r)?(STK_PN[r]||r):r}catch(e){return"?"}}
function stkEv(k,d,pg){try{if(!stkOn())return-1;STK.e.push([k,pg||stkPg(location.hash),stkSec(),...(d!=null?[String(d).slice(0,40)]:[])]);if(STK.e.length>60)STK.e.splice(0,STK.e.length-60);return STK.e.length-1}catch(e){return-1}}
/* 對局 10 手內認輸或離開：離開對局頁、或 App 切到背景時查一次那盤 */
function stkGame(why){try{if(typeof api!=="function")return;api("/play/state").then(st=>{if(!st||!st.moves)return;const n=st.moves.length;if(!n||n>=20)return;
  if(st.result&&/認輸/.test(String(st.result.why||"")))stkEv("quit",`認輸・第 ${n} 手`,"對局");else if(!st.result&&why)stkEv("quit",`${why}・第 ${n} 手`,"對局")}).catch(()=>{})}catch(e){}}
function stkNav(){try{const now=Date.now(),h=location.hash,pg=stkPg(h);if(STK.pg){const s=Math.round((now-STK.pgT)/1000);STK.p.push([STK.pg,s]);if(STK.p.length>30)STK.p.shift();
    const q=STK.p[STK.p.length-2];if(s<5&&q&&q[0]===pg&&pg!==STK.pg)stkEv("bounce",STK.pg,STK.pg);   /* A → B → 又回 A，B 待不到 5 秒 */
    if(/^#\/cpu/.test(STK.h)&&!/^#\/cpu/.test(h))stkGame("離開")}
  STK.pg=pg;STK.h=h;STK.pgT=now;STK.act=now;STK.idle=-1;STK.live=0}catch(e){}}
function stkAct(){const now=Date.now();if(STK.idle>=0){const x=STK.e[STK.idle];if(x&&x[0]==="idle")x[3]=String(Math.round((now-STK.act)/1000))+" 秒";STK.idle=-1}STK.act=now}
/* 點到不能點的地方：一路往上找，有按鈕、連結、輸入框、棋盤、3D 畫面或掛了點選的元素就算能點 */
function stkDead(el){for(let n=0;el&&el!==document.body&&n<12;el=el.parentElement,n++){if(el.matches&&el.matches("button,a,input,select,textarea,label,summary,option,[role],[tabindex],svg,canvas,video,.mvt,[contenteditable]"))return false;if(el.onclick||el.onpointerdown||el.onpointerup||el.ontouchstart)return false}return true}
function stkSend(live){try{if(!stkOn()||!window.XQNet||!XQNet.shareIRT)return;const now=Date.now(),cur=STK.pg?[[STK.pg,Math.round((now-STK.pgT)/1000)]]:[];
  if(!live&&!STK.e.length&&STK.p.length<2)return;
  XQNet.shareIRT({t:"stk",v:1,sid:STK.sid,sec:stkSec(),p:STK.p.concat(cur).slice(-30),e:STK.e.slice(),last:STK.pg,ver:String(window.XQ_BUILD||"").slice(0,20),dev:fnDev(),...(live?{live:1}:{}),...(fnTest()?{test:1}:{})});
  if(!live){STK.p=[];STK.e=[];STK.pgT=now}}catch(e){}}
function stkBoot(){try{if(STK.sid)return;const a=new Uint8Array(8);crypto.getRandomValues(a);STK.sid=[...a].map(x=>(x%36).toString(36)).join("");stkNav();
  addEventListener("hashchange",stkNav);
  for(const k of["keydown","wheel","touchmove"])addEventListener(k,stkAct,{passive:true,capture:true});
  addEventListener("pointerdown",e=>{stkAct();try{if(!stkOn()||!stkDead(e.target))return;const now=Date.now();STK.taps=STK.taps.filter(t=>now-t[0]<2000&&Math.hypot(t[1]-e.clientX,t[2]-e.clientY)<40);STK.taps.push([now,e.clientX,e.clientY]);
    if(STK.taps.length>=3&&now-STK.rageAt>5000){STK.rageAt=now;STK.taps=[];const c=e.target&&typeof e.target.className==="string"?e.target.className.split(" ")[0]:"";stkEv("rage",(e.target&&e.target.tagName||"").toLowerCase()+(c?"."+c:""))}}catch(x){}},{passive:true,capture:true});
  document.addEventListener("click",e=>{const x=e.target&&e.target.closest&&e.target.closest(".mvt");if(!x)return;const cn=x.dataset.mv;setTimeout(()=>{const t=document.querySelector("#sheet");stkEv("mvt",cn+(t&&/看懂這一步/.test(t.textContent||"")?"・卡片":"・箭頭"))},400)},true);
  addEventListener("error",e=>{if(STK.errN>=3)return;STK.errN++;stkEv("err",String(e.message||"錯誤").replace(/[^\w\s.:()'"-]/g,"").slice(0,26)+" @"+(e.lineno||0))});
  addEventListener("unhandledrejection",e=>{if(STK.errN>=3)return;STK.errN++;const r=e.reason;stkEv("err","promise "+String(r&&r.message||r||"").replace(/[^\w\s.:()'"-]/g,"").slice(0,20))});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){if(/^#\/cpu/.test(location.hash))stkGame("關掉");setTimeout(()=>stkSend(),300)}else STK.act=Date.now()});
  addEventListener("pagehide",()=>stkSend());
  setInterval(()=>{try{if(document.hidden||!stkOn())return;const idle=Date.now()-STK.act;if(idle>120000&&STK.idle<0){STK.idle=stkEv("idle",null)}if(idle>180000&&!STK.live){STK.live=1;stkSend(1)}}catch(e){}},5000)}catch(e){}}
stkBoot();
/* ---------- 跟電腦下完一盤的匿名評分資料 t:"cpu"（開發者 11/11 照三方審查：「同時開始收新的匿名對局資料」）＋影子模式的背景存檔 ----------
   為什麼要：新算法（05-settings.js 的 MXS、mxShadowReport，影子模式）的勝率曲線 k、評語門檻、殺棋分界、S／A／B 門檻，都要用真人（孩子）的對局分段位校正
     （tools/calibrate-wdl.js、tools/calibrate-grades.js 讀 xiangqi-db/cpu-games.jsonl）。三方審查一致：不可用引擎自對局校正。
   什麼時候：跟電腦下完一盤（08b-cpugame.js 發 xq-result）後，每 3 秒問一次 /play/state，等我方每一步都評完等（最多約 5 分鐘）；
     換到下一盤或逾時，就送已經評好的部分（full:0）。錯棋重練、練習題（practice）不送；同一盤只處理一次（store cpaSent 記最近 60 盤的編號，只存在手機裡）。
     線上對戰結束也會發 xq-result（02-shell.js），那時 /play/state 是電腦那一盤：處理過就略過、還沒結束就不送。
   送什麼（只有數字和段位名）：aid（App 自己亂數產生的匿名碼 anonId，跟成長曲線 t:"tal" 同一個，同一個人的很多盤才能放在一起校正）、g（這盤另外亂數 8 碼，後台去重用）、
     App 版本 ver、裝置類型 dev、新算法常數版本 mx、對局種類 kind、電腦級數 lv／練功房 rlv／積分挑戰 rk＋對手段位 ork、我方 hu、勝負 res、結束原因 why（12 字內）、總手數 n、
     是不是標準開局 std、提示 hn／悔棋 un 次數、盲棋 bl、玩家段位（電腦積分段位 crk、積分 pts、這盤積分變化 d、線上段位 nrk）、舊算法總分 o、新算法總分 s、
     我方每一步 m＝[手數, 階段 0開局1中局2殘局, 最佳著法評估原值, 實際走完評估原值, 最佳原值是否確定(1)或還原(0), loss, 舊評語, 新評語, 殺棋 0／1送殺／2漏殺]
     （評估都是走的那一方視角、「夾 ±2000 之前」的原值，校正殺棋分界要用；夾過的值用 ±2000 自己夾就有。評語是 妙著0 正著1 穩著2 緩著3 失著4 敗著5）。
   不送：名字、裝置代號、線上 id、棋譜（著法本身）、存檔。
   開關：設定 → 隱私「📊 匿名送出對局評分」（store cpuAnonOff，預設開）。沒有跟「📍 匿名記錄卡住的地方」共用一個開關，理由：
     ①是不同的資料（每一步的評估分數 vs 停在哪一頁），家長看開關名稱就要知道送了什麼；②卡關訊號每次開 App 換一組亂數，這個用固定的匿名碼，性質不同，要能分開關。
   開發者模式不送（測試機、本機例外，加 test:1，collect-anon.js 存到 cpu-games.test.jsonl）；家長關閉線上大廳時連不上大廳，本來就不會送（XQNet.shareIRT 只在連上時送，最多排 20 則）。
   不管送不送，新舊總分都存在手機的 store "mxShadow"（最近 200 盤，影子模式的「背景存著」；每一步的新評語隨時可以從棋譜重算，不另外存）。 */
const CPA_Q=["妙著","正著","穩著","緩著","失著","敗著"];let CPA_W=0,CPA_RE=0;
function cpaOn(){try{return!store.get("cpuAnonOff",false)&&!navigator.webdriver&&(!(typeof DEVMODE==="function"&&DEVMODE())||fnTest())}catch(e){return false}}
/* ---------- 「📈 匿名送出學習進度」開關（開發者 11/11 核准資料保留期限；store learnAnonOff，預設開） ----------
   涵蓋走 XQNet.shareIRT 的學習資料：新手流程 t:"fun"（本檔 fnSend）、成長曲線 t:"tal"（04-stats.js）、測驗作答（沒有 t，後台記成 quiz；03-home-quiz.js）、讀譜 t:"rd"（04-stats.js）、殘局 t:"cj"（07c-canju.js）。
   卡關訊號 stk、對局評分 cpu 各有自己的開關（stkOn、cpaOn），不算在這裡。判斷放在送出端 net.js 的 shareIRT／flushIRT（window.XQ_ANON_OK），各呼叫處不用改；
   關掉時設定頁用 XQNet.dropIRT(lrnAnonType) 丟掉排隊中的這幾類。後台 collect-anon.js 收到後保留一年。xiangqi-lab/tools/test-retention.js 有測 */
function lrnAnonType(x){const t=x&&x.t;return t!=="stk"&&t!=="cpu"}
function lrnAnonOn(){try{return!store.get("learnAnonOff",false)}catch(e){return false}}
window.XQ_ANON_OK=x=>!lrnAnonType(x)||lrnAnonOn();
function cpaRnd(n){const a=new Uint8Array(n);crypto.getRandomValues(a);return[...a].map(x=>(x%36).toString(36)).join("")}
function cpaDone(st,full){try{if(!st||!st.id||!st.result)return;const sent=store.get("cpaSent",[])||[];if(sent.includes(st.id))return;store.set("cpaSent",sent.concat(st.id).slice(-60));
  if(typeof gameReport!=="function"||typeof mxShadowReport!=="function"||!window.XQCore)return;
  const hu=st.human,rep=gameReport(XQCore.parseFen(st.start||XQCore.START),st.moves||[]),R=rep.sides[hu],X=mxShadowReport(rep)[hu];if(!R||R.score==null||!X)return;
  const all=store.get("mxShadow",{})||{};all[st.id]={o:[R.score,R.grade[0]],n:[X.score,X.grade],v:MXS.ver,at:Date.now()};const ks=Object.keys(all);if(ks.length>200)for(const k of ks.sort((a,b)=>all[a].at-all[b].at).slice(0,ks.length-200))delete all[k];store.set("mxShadow",all);
  if(!cpaOn()||!window.XQNet||!XQNet.shareIRT||X.n<4)return;
  let aid=store.get("anonId",null);if(!aid){aid=Math.random().toString(36).slice(2,10);store.set("anonId",aid)}
  const PH={open:0,mid:1,end:2},rd=v=>v==null||!isFinite(+v)?null:Math.round(+v),C=st.cpuRate||{},GI=g=>"SABCD".indexOf(g);let nrk=null;try{nrk=XQNet.rating?XQNet.rating().rank:null}catch(e){}
  XQNet.shareIRT({t:"cpu",v:1,aid,g:cpaRnd(8),ver:String(window.XQ_BUILD||"").slice(0,20),dev:fnDev(),mx:MXS.ver,kind:String(st.kind||"cpu").slice(0,10),
    lv:+st.level||0,...(st.rlv!=null?{rlv:+st.rlv}:{}),rk:st.ranked?1:0,...(st.ranked&&st.rkName?{ork:String(st.rkName).slice(0,8)}:{}),hu,res:!st.result.w?"d":st.result.w===hu?"w":"l",why:String(st.result.why||"").slice(0,12),
    n:(st.moves||[]).length,std:st.start?0:1,hn:+st.hintN||0,un:+st.undoN||0,bl:st.blind?1:0,full:full?1:0,
    crk:C.rank?String(C.rank).slice(0,8):null,pts:rd(C.pts),...(st.rate&&isFinite(+st.rate.d)?{d:+st.rate.d}:{}),nrk:nrk?String(nrk).slice(0,8):null,
    o:[R.score,GI(R.grade[0]),Math.round(R.base*10)/10],s:[X.score,GI(X.grade),Math.round(X.base*10)/10],
    m:X.mv.slice(0,150).map(v=>[v.ply,PH[v.ph]!=null?PH[v.ph]:1,rd(v.b),rd(v.p),v.bk?1:0,rd(v.loss),CPA_Q.indexOf(v.q0),CPA_Q.indexOf(v.q),v.mt]),...(fnTest()?{test:1}:{})})}catch(e){}}
function cpaWatch(){if(typeof api!=="function")return;if(CPA_W){CPA_RE=1;return}CPA_W=1;let n=0,gid=null,last=null;
  const end=(st,full)=>{CPA_W=0;if(st)cpaDone(st,full);if(CPA_RE){CPA_RE=0;setTimeout(cpaWatch,500)}};
  const tick=()=>{n++;api("/play/state").then(st=>{if(!st||!st.id)return end(null);
      if(gid==null){if(!st.result||st.practice||(store.get("cpaSent",[])||[]).includes(st.id))return end(null);gid=st.id}
      if(st.id!==gid)return end(last,0);last=st;
      if((st.moves||[]).filter(m=>m.by===st.human).every(m=>m.q))return end(st,1);
      if(n>=100)return end(st,0);setTimeout(tick,3000)}).catch(()=>{if(n<100)setTimeout(tick,3000);else end(last,0)})};
  setTimeout(tick,2000)}
addEventListener("xq-result",()=>{try{cpaWatch()}catch(e){}});
