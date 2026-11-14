/* ================= ⛵ 主線任務「星槎遠征令」＋首頁「下一步」＋三個大禮包（開發者 11/13 新手體驗第一波；定案 story/新手體驗定案_141_兩輪討論.md）=================
   13 朝＝13 章（章名照 ChatGPT 141c 第 7 節），航線亮燈當進度；第 1 章「古典・河圖初渡」完整可玩（開章電影 → 危機解題＋殘局解開儀式 → 章末電影，07mnf-mainfilm.js），其他章「即將開放」。
   首頁常駐「下一步」（07z 底部那一條的最上面，跟現有入口分開不重疊）：一點就帶到現在該做的事（mnqNextOf，純計算）：
     七星授印禮（選角後還沒領）→ 第 1 章三段（看到哪段接哪段）→ 破局錦囊（第一次真的贏電腦）→ 朝代遠征補給（到了新朝代）→ 還沒贏過＝去贏第一盤 → 還沒回過家鄉＝回家鄉 → 遠征令面板（第 2 章起即將開放）。
     第一次玩、選好角色以後：授印禮的大按鈕就是「開始第一章」。
   大禮包（文案照 141c 第 7 節；儀式＝朱印蓋下＋光芒＋大字；給的東西都是現有系統，第一次出現時就發，只發一次 mnqGrant）：
     A1 七星授印禮：稱號「雲河新使」、提示棋 5 顆（hintBonus）、家鄉棋盤（旅程開始時已換成家鄉朝代）、圖鑑入門卷（千秋大百科多一類「星槎遠征札記」，第一頁）、第一章。
     A2 破局錦囊（xq_record 第一次有贏）：稱號「初勝」、一盞茶額外題（題庫裡最簡單、還沒解過的一步殺，#/canju/<題號>）。
     A6 朝代遠征補給（星槎第一次停在某一朝，shipAt）：那一朝 2 首配樂收進收藏（遠征令面板裡聽）、景點線索（首頁那棵千秋松在那一朝的樣子 SCI_PINE）、札記一頁。
   危機解開（mnqSolved）：照玩家本命子出船艙站那一題劇情局（07f SHIP_PLAN.classic，xs-classic-<本命子>），解開就照千秋殘局記一題（shipMark），
     殘局解開儀式的殘譜行數、刻痕段數都照 shipSolved（07mnf mnfRiteCount）；看軍師演示的不記（千秋殘局看答案也不算解開）。
   新手保護：主線裡解題的比例要低（定案 ≤30%）：第 1 章三段只有 1 題 1 步，mnqPuzzleShare 算出來給測試檢查。
   11/14 第二章「秦・日落之前」接上：各章資料集中在 MNQ_CHAP（加一章只加資料），下一步在第一章、禮包之後接「第二章起還沒看完、已開放的章」，沒開放就帶去星槎開船（k:"ship"）。
   存檔 store "mnq"（JOURNEY_KEYS 的 m_mnq，讀檔、開新旅程跟著換）＝{seg:{c1o,c1m,c1e,c2o…:看完時間}, qte:{c1,c2…:{mist,hint,demo,at}}, lamp:{朝代:亮燈時間}, reach:{朝代:星槎第一次停到的時間}, gift:{a1,a2,a6:{朝代:時間}},
     title:{xin,chu}, page:[札記頁朝代], music:["朝代/檔名"], clue:{朝代:線索}, a2cj:額外題號}。
   自動跳禮包（mnqTick）只在首頁、星槎頁、沒有別的視窗時；無頭瀏覽器（navigator.webdriver）不自動跳，免得擋到別的自動測試（localStorage xq_mnqQa＝"1" 才跳，給本模組的實測用）。
   名稱前綴 mnq／MNQ（11/13 已 grep 確認沒人用）。 */
const MNQ_CH=[["classic","古典・河圖初渡"],["qin","秦・日落之前"],["han","漢・長安星火"],["sanguo","三國・赤壁連環"],["weijin","魏晉・竹林清談"],["nanbei","南北朝・飛燕過河"],["sui","隋・運河聽潮"],
  ["tang","唐・長安燈會"],["wudai","五代・驛路風旗"],["song","宋・汴梁點茶"],["yuan","元・草原星路"],["ming","明・徽州當鋪"],["qing","清・揚州急遞"]];
/* 主線各章的資料（11/14 接第二章時整理）：加一章＝這裡加一筆，07mnf 加圖（MNF_IMG）、三段電影（MNF_FILMS）、危機題（MNF_QTE）、儀式圖組（MNF_RITE_SET），流程程式不用改。
   格式說明：story/主線電影_加一章的資料格式.md。
   segs 三段電影（開章、危機、章末）、nm 各段的名字（遠征令、札記、電影的無障礙標籤用）；qte＝MNF_QTE 的危機題代號；set＝MNF_RITE_SET 的儀式圖組；
   rite："solve" 解開當下就演儀式、演完才回電影（第一章）／"end" 危機那段（segs[1]）播完才演、演完接章末（第二章：先看「車有路了」再回船艙）；
   open："start" 一開始就開放（第一章）／"reach" 前面有資料的章都看完、而且星槎停到過這一朝（S.reach，或已領那一朝的遠征補給）才開放（開發者 11/14 定）；
   vn：（11/14 第二章重做）這一章是對話場景（07mnv MNV_CH[vn]），segs＝各場代號、nm＝場名（下面從 MNV_CH 補上），rite:"step"＝儀式照場裡的 {rite:1} 那一步演 */
const MNQ_CHAP_ALL={
  classic:{segs:["c1o","c1m","c1e"],nm:{c1o:"河圖初渡",c1m:"破局",c1e:"古典之印"},qte:"c1",set:"c1",rite:"solve",open:"start"},
  qin:{vn:"qin",qte:"c2",set:"c2",rite:"step",open:"reach",off:1}};   /* off：11/14 開發者看完第二章電影版「很無聊、出戲、不知道角色在幹嘛」，先下架；改成對話場景（新腳本 story/第二章新腳本_初稿_1114.md），開發者試玩過再拿掉 off。舊電影 c2o／c2m／c2e 的資料留在 07mnf */
for(const c of Object.values(MNQ_CHAP_ALL))if(c.vn&&typeof MNV_CH!=="undefined"&&MNV_CH[c.vn]){c.segs=MNV_CH[c.vn].sc.map(x=>x.id);c.nm=Object.fromEntries(MNV_CH[c.vn].sc.map(x=>[x.id,x.nm]))}
/* 開發者試玩下架的章（11/14）：只在開發者模式（02 DEVMODE）或本機（localhost／127.x）才生效；開關是這支手機的 localStorage xq_mnqPeek＝"1"（遠征令面板最下面的「🛠 開發者」按鈕切換，切完重新載入）。
   一般玩家：沒有開發者模式，就算有人手動設了 xq_mnqPeek 也不生效，照樣看到「即將開放」 */
function mnqPeekOk(){try{if(typeof location!=="undefined"&&/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname))return true;return typeof DEVMODE==="function"&&!!DEVMODE()}catch(e){return false}}
const MNQ_PEEK=(()=>{try{return mnqPeekOk()&&localStorage.getItem("xq_mnqPeek")==="1"}catch(e){return false}})();
const MNQ_CHAP=Object.fromEntries(Object.entries(MNQ_CHAP_ALL).filter(([,c])=>!c.off||MNQ_PEEK));   /* 上線中的章；下架的章在各處都當成「即將開放」（開發者試玩開著時例外） */
const MNQ_SEGS=Object.fromEntries(Object.entries(MNQ_CHAP).map(([e,c])=>[e,c.segs]));
const MNQ_SEG_NM=Object.assign({},...Object.values(MNQ_CHAP).map(c=>c.nm));
const MNQ_CN=["一","二","三","四","五","六","七","八","九","十","十一","十二","十三"];
const mnqChN=era=>MNQ_CH.findIndex(c=>c[0]===era)+1;
const mnqShort=era=>String((MNQ_CH.find(c=>c[0]===era)||[0,era])[1]).split("・")[0];
const MNQ_GIFT={a1:{nm:"七星授印禮",seal:"授",say:"七星授印已成，雲河星槎為你點亮第一段航路。"},a2:{nm:"破局錦囊",seal:"勝",say:"你破開第一局迷霧，這份錦囊記下你的初勝。"},
  a6:{nm:"朝代遠征補給",seal:"補",say:"新朝渡口已至，請收下此地的樂聲、線索與圖鑑。"}};
const MNQ_HINT_A1=5;
/* ---------- 存檔、環境 ---------- */
function mnqSt(){let s=null;try{s=store.get("mnq",null)}catch(e){}s=s&&typeof s==="object"?s:{};for(const k of["seg","qte","lamp","gift","title","clue","reach","vn"])if(!s[k]||typeof s[k]!=="object")s[k]={};
  if(!s.gift.a6||typeof s.gift.a6!=="object")s.gift.a6={};for(const k of["page","music"])if(!Array.isArray(s[k]))s[k]=[];return s}
const mnqSave=s=>{try{store.set("mnq",s)}catch(e){}};
function mnqWins(){try{const R=JSON.parse(localStorage.getItem("xq_record")||"null")||{};return Object.values(R).reduce((a,v)=>a+((v&&v.w)|0),0)}catch(e){return 0}}
function mnqEnv(){const E={hasChar:false,firstWin:false,home:"",at:"",homeLabel:""};
  try{const c=typeof myChar==="function"?myChar():"";E.hasChar=!!c;const J=typeof journey==="function"?journey():null;E.home=(J&&(J.home||(typeof CHAR_ERA!=="undefined"&&CHAR_ERA[J.c])))||""}catch(e){}
  E.firstWin=mnqWins()>0;try{E.at=store.get("shipAt",null)||""}catch(e){}try{E.homeLabel=E.home&&typeof eraLabel==="function"?eraLabel(E.home):""}catch(e){}return E}
/* ---------- 純計算：章的進度、下一步 ---------- */
function mnqDone(S,era){const L=MNQ_SEGS[era],seg=(S&&S.seg)||{};return!!L&&L.every(id=>seg[id])}
/* 這一章開放了沒：要有資料；open:"start" 一開始就開；"reach" 要前面有資料的章都看完，而且星槎停到過這一朝（S.reach／領過那一朝的遠征補給／現在就停在那一朝） */
function mnqOpen(S,E,era){const C=MNQ_CHAP[era];if(!C)return false;if(C.open==="start")return true;S=S||{};const i=MNQ_CH.findIndex(c=>c[0]===era);
  for(let j=0;j<i;j++){const e=MNQ_CH[j][0];if(MNQ_CHAP[e]&&!mnqDone(S,e))return false}
  return!!((S.reach||{})[era]||((S.gift||{}).a6||{})[era]||(E&&E.at===era))}
function mnqNextOf(S,E){S=S||{seg:{},gift:{a6:{}},lamp:{}};E=E||{};const G=S.gift||{},A6=G.a6||{},seg=S.seg||{};
  if(E.hasChar&&!G.a1)return{k:"gift",g:"a1",t:"七星授印"};
  for(const id of MNQ_SEGS.classic)if(!seg[id])return{k:"film",era:"classic",id,t:MNQ_SEG_NM[id]};
  if(E.firstWin&&!G.a2)return{k:"gift",g:"a2",t:"破局錦囊"};
  if(E.at&&E.at!=="classic"&&MNQ_CH.some(c=>c[0]===E.at)&&!A6[E.at])return{k:"gift",g:"a6",era:E.at,t:"遠征補給"};
  /* 第二章起：照章序找第一個還沒看完的章；開放了就接著看（看到哪段接哪段），還沒開放就停下來（後面再看要不要叫玩家開船過去） */
  for(const[e]of MNQ_CH){if(e==="classic"||!MNQ_CHAP[e]||mnqDone(S,e))continue;if(!mnqOpen(S,E,e))break;const id=MNQ_SEGS[e].find(x=>!seg[x]);return{k:"film",era:e,id,t:MNQ_SEG_NM[id]}}
  if(!E.firstWin)return{k:"cpu",t:"贏第一盤"};
  if(E.home&&E.at!==E.home&&!A6[E.home])return{k:"home",era:E.home,t:"回"+(E.homeLabel||"家鄉")};
  const nx=MNQ_CH.find(([e])=>MNQ_CHAP[e]&&!mnqDone(S,e));
  if(nx)return{k:"ship",era:nx[0],t:"開往"+mnqShort(nx[0])+"・第"+MNQ_CN[mnqChN(nx[0])-1]+"章"};   /* 下一章有資料、還沒停到那一朝：帶去星槎開船 */
  const soon=MNQ_CH.findIndex(([e])=>!MNQ_CHAP[e]);
  return soon<0?{k:"panel",t:"星槎遠征令"}:{k:"panel",t:"星槎遠征令",soon:soon+1}}
/* 主線解題比例（定案 ≤30%）：每段電影的秒數 vs 危機題預估秒數 */
function mnqPuzzleShare(era){const C=MNQ_CHAP[era||"classic"];if(C&&C.vn&&typeof mnvShare==="function")return mnvShare(MNV_CH[C.vn]);const L=MNQ_SEGS[era||"classic"]||[];let film=0,pz=0;for(const id of L){const F=MNF_FILMS[id];if(!F)continue;film+=F.end;for(const q of mnfQteIn(F))pz+=(MNF_QTE[q]&&MNF_QTE[q].est)||20}return{film,pz,share:pz/Math.max(1,film+pz)}}
/* ---------- 大禮包：發東西（只發一次；回傳 false＝已經發過） ---------- */
function mnqGrant(k,era){const S=mnqSt(),now=Date.now();
  if(k==="a1"){if(S.gift.a1)return false;S.gift.a1=now;S.title.xin=now;if(!S.page.includes("classic"))S.page.push("classic");mnqSave(S);
    try{store.set("hintBonus",(store.get("hintBonus",0)||0)+MNQ_HINT_A1)}catch(e){}return true}
  if(k==="a2"){if(S.gift.a2)return false;S.gift.a2=now;S.title.chu=now;mnqSave(S);return true}
  if(k==="a6"){if(!era||S.gift.a6[era])return false;S.gift.a6[era]=now;if(!S.page.includes(era))S.page.push(era);
    try{if(typeof SCI_PINE!=="undefined"&&SCI_PINE[era])S.clue[era]=SCI_PINE[era]}catch(e){}mnqSave(S);return true}
  return false}
/* A6 配樂：那一朝曲目清單（data/bgm/index.json）的前 2 首收進收藏 */
async function mnqMusicAdd(era){let L=[];try{L=((await bgmList())||{})[era]||[]}catch(e){}const S=mnqSt(),add=L.slice(0,2).map(f=>era+"/"+f).filter(x=>!S.music.includes(x));if(add.length){S.music.push(...add);mnqSave(S)}return add}
/* A2 一盞茶額外題：題庫裡最簡單、還沒解過的「一步定勝負」 */
async function mnqA2Pick(){const S=mnqSt();if(S.a2cj)return S.a2cj;try{const D=await cjData(),sv=(typeof cjState==="function"?cjState().solved:{})||{},res=new Set(typeof cjReserved==="function"?cjReserved()||[]:[]);
  const L=D.items.filter(x=>x.t==="一步定勝負"&&!sv[x.id]&&!res.has(x.id)).sort((a,b)=>(+a.d||0)-(+b.d||0)),id=L.length?L[0].id:"";if(id){const S2=mnqSt();S2.a2cj=id;mnqSave(S2)}return id}catch(e){return""}}
/* ---------- 樣式 ---------- */
function mnqCss(){if(document.getElementById("mnqCss"))return;const s=document.createElement("style");s.id="mnqCss";s.textContent=`
.mnq-next{display:flex;align-items:center;justify-content:center;gap:6px;min-width:220px;max-width:100%;min-height:50px;padding:8px 22px;border:2px solid #8a5a2b;border-radius:14px;background:linear-gradient(#f8f0dc,#e6d3a6);color:#3b2a1a;font:900 19px/1.2 var(--serif,serif);letter-spacing:.06em;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.35);cursor:pointer;-webkit-tap-highlight-color:transparent;animation:mnqGlow 2.4s ease-in-out infinite}
.mnq-next:active{transform:translateY(1px)}.mnq-next:focus-visible{outline:3px solid #f2c94c;outline-offset:3px}
@keyframes mnqGlow{50%{box-shadow:0 4px 14px rgba(0,0,0,.35),0 0 0 4px rgba(242,201,76,.45)}}
#mnqGf,#mnqCard{position:fixed;inset:0;z-index:9200;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px 18px calc(24px + env(safe-area-inset-bottom,0px));text-align:center;color:#fff7e6;background:radial-gradient(circle at 50% 38%,rgba(70,36,10,.95),rgba(0,0,0,.97) 72%);opacity:0;transition:opacity .35s;overflow:auto}
#mnqGf.on,#mnqCard.on{opacity:1}
#mnqGf .gf-st{position:relative;width:180px;height:180px;flex:none}
#mnqGf .gf-ray{position:absolute;left:50%;top:50%;width:440px;height:440px;margin:-220px;border-radius:50%;background:repeating-conic-gradient(rgba(255,214,120,.5) 0 7deg,transparent 7deg 20deg);-webkit-mask:radial-gradient(circle,#000 0 12%,transparent 62%);mask:radial-gradient(circle,#000 0 12%,transparent 62%);opacity:0;animation:mnqRay .8s .5s ease-out forwards,mnqSpin 18s .5s linear infinite;pointer-events:none}
#mnqGf .gf-seal{position:absolute;inset:22px;border:7px solid #c0392b;border-radius:14px;background:rgba(246,236,214,.9);color:#b3261e;display:flex;align-items:center;justify-content:center;font:900 76px/1 var(--serif,serif);box-shadow:0 0 34px rgba(255,200,120,.7);transform:scale(2.6) rotate(-16deg);opacity:0;animation:mnqStamp .55s .15s ease forwards}
@keyframes mnqStamp{60%{opacity:1;transform:scale(.9) rotate(-7deg)}100%{opacity:1;transform:rotate(-6deg)}}@keyframes mnqRay{to{opacity:.6}}@keyframes mnqSpin{to{transform:rotate(360deg)}}
#mnqGf h2{margin:0;font:900 clamp(28px,8.5vw,40px)/1.2 var(--serif,serif);letter-spacing:.14em;color:#ffe6a8;text-shadow:0 0 18px rgba(255,190,90,.5)}
#mnqGf .gf-say{margin:0;max-width:360px;text-wrap:balance;font:700 17px/1.6 var(--serif,serif);color:#f3e6c8}
#mnqGf .gf-it{display:flex;flex-direction:column;gap:8px;width:min(360px,92vw);opacity:0;animation:mnqIn .5s .9s ease forwards}
#mnqGf .gf-it div{display:flex;align-items:center;gap:12px;padding:9px 14px;border-radius:12px;background:rgba(255,236,190,.1);border:1px solid rgba(232,199,122,.35);text-align:left;font:800 19px/1.3 var(--serif,serif)}
#mnqGf .gf-it span{font-size:24px;flex:none;width:30px;text-align:center}
@keyframes mnqIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
#mnqGf .gf-b,#mnqCard .gf-b{display:flex;flex-direction:column;gap:10px;align-items:center;width:min(340px,92vw)}
#mnqGf button,#mnqCard button{width:100%;min-height:54px;border-radius:99px;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font:900 21px var(--serif,serif);letter-spacing:.08em}
#mnqGf button.g,#mnqCard button.g{min-height:46px;font-size:17px;background:rgba(0,0,0,.35);border-color:rgba(232,199,122,.6);color:#f2e4c4}
#mnqGf button:focus-visible,#mnqCard button:focus-visible{outline:3px solid #E8C77A;outline-offset:3px}
#mnqCard b{font:900 clamp(30px,9vw,46px)/1.3 var(--serif,serif);letter-spacing:.12em;color:#ffe6a8;text-shadow:0 0 18px rgba(255,190,90,.5)}
#mnqCard .cd-k{font:800 18px var(--serif,serif);color:#e8c77a;letter-spacing:.3em}
.mnq-rt{display:flex;flex-direction:column;gap:6px;margin:4px 0 10px}
.mnq-ln{display:flex;align-items:center;gap:10px;width:100%;min-height:48px;padding:6px 12px;border-radius:12px;border:1px solid rgba(138,90,43,.35);background:rgba(246,238,220,.6);color:inherit;font:800 18px/1.25 var(--serif,serif);text-align:left;cursor:pointer}
.mnq-ln .lp{flex:none;width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:17px;background:#5b4a3a;color:#d8c8a8;box-shadow:inset 0 0 0 2px rgba(0,0,0,.2)}
.mnq-ln.on .lp{background:radial-gradient(circle,#fff3c4,#f2b33d 60%,#b8741a);color:#7a3a10;box-shadow:0 0 12px rgba(242,179,61,.8)}
.mnq-ln.cur{border-color:#b3261e;box-shadow:0 0 0 2px rgba(179,38,30,.35)}.mnq-ln.cur .lp{background:#b3261e;color:#fff;animation:mnqGlow 2s infinite}
.mnq-ln.off{opacity:.6;cursor:default}.mnq-ln em{margin-left:auto;flex:none;font-style:normal;font-size:14px;color:#8a5a2b}
.mnq-pg{width:100%;text-align:left;cursor:pointer;color:inherit;font:inherit}.mnq-pg .tx{min-width:0}.mnq-pg-go{margin-left:auto;padding-left:8px;font:700 22px var(--serif,serif);color:#a0712f}
.mnq-note-tx{margin:0 0 12px;font:500 17px/1.75 var(--serif,serif);white-space:pre-wrap}
.mnq-note-ev{list-style:none;margin:0;padding:0 0 0 14px;border-left:2px solid rgba(160,113,47,.4)}.mnq-note-ev li{position:relative;margin:0 0 10px;padding-left:6px}
.mnq-note-ev li::before{content:"";position:absolute;left:-21px;top:6px;width:10px;height:10px;border-radius:50%;background:#c8963e;box-shadow:0 0 0 3px rgba(200,150,62,.25)}
.mnq-note-ev b{display:block;font-size:13px;color:#8a6a3b;font-weight:700}.mnq-note-ev span{font:600 16px var(--serif,serif)}
.mnq-mu{display:flex;align-items:center;gap:8px;width:100%;min-height:46px;padding:6px 12px;margin:0 0 6px;border-radius:12px;border:1px solid rgba(138,90,43,.3);background:rgba(246,238,220,.5);font:700 17px var(--serif,serif);color:inherit;text-align:left}
#mnqGf{justify-content:safe center}
@media (max-height:740px){#mnqGf{gap:10px;padding-top:14px}#mnqGf .gf-st{width:120px;height:120px}#mnqGf .gf-seal{inset:14px;font-size:50px;border-width:5px}#mnqGf h2{font-size:27px}#mnqGf .gf-say{font-size:15px}#mnqGf .gf-it{gap:6px}#mnqGf .gf-it div{padding:6px 12px;font-size:17px}#mnqGf button{min-height:48px;font-size:19px}#mnqGf button.g{min-height:44px}}
@media (prefers-reduced-motion:reduce){.mnq-next,#mnqGf *{animation:none!important}#mnqGf .gf-seal,#mnqGf .gf-it{opacity:1;transform:rotate(-6deg)}#mnqGf .gf-it{transform:none}}`;document.head.append(s)}
/* ---------- 大禮包儀式 ---------- */
function mnqGift(k,era,after){mnqCss();const G=MNQ_GIFT[k];if(!G)return;const got=mnqGrant(k,era),E=mnqEnv(),S=mnqSt();
  const el=era&&typeof eraLabel==="function"?eraLabel(era):"";let items=[],btn=null;
  if(k==="a1"){items=[["🏠","家鄉棋盤・"+(E.homeLabel||"經典")],["🏅","稱號「雲河新使」"],["💡","提示棋 ×"+MNQ_HINT_A1],["📜","圖鑑入門卷"],["⛵","第一章・河圖初渡"]];btn=["⛵ 開始第一章",()=>mnqChapter("classic")]}
  if(k==="a2"){items=[["🏅","稱號「初勝」"],["🍵","一盞茶額外題"]];btn=["🍵 去解額外題",async()=>{const id=await mnqA2Pick();location.hash=id?"#/canju/"+encodeURIComponent(id):"#/canju"}]}
  if(k==="a6"){items=[["♪",el+"的配樂"],["🌲","景點線索"],["📜","札記一頁・"+el]];btn=["♪ 打開遠征令",()=>mnqPanel()];if(got)mnqMusicAdd(era)}
  if(k==="a2"&&got)mnqA2Pick();
  const o=document.createElement("div");o.id="mnqGf";o.setAttribute("role","dialog");o.setAttribute("aria-modal","true");o.setAttribute("aria-label",G.nm);
  o.innerHTML=`<div class="gf-st"><div class="gf-ray"></div><div class="gf-seal">${esc(G.seal)}</div></div><h2>${esc(G.nm)}${el&&k==="a6"?"・"+esc(el):""}</h2><p class="gf-say">${esc(G.say)}</p>
    <div class="gf-it">${items.map(([i,t])=>`<div><span>${i}</span>${esc(t)}</div>`).join("")}</div><div class="gf-b"><button type="button" id="mnqGf1">${esc(btn[0])}</button><button type="button" class="g" id="mnqGf2">收下</button></div>`;
  document.body.append(o);requestAnimationFrame(()=>o.classList.add("on"));try{if(typeof rfxSound==="function")rfxSound(false);else mnfSfx("bell")}catch(e){}
  const close=f=>{o.classList.remove("on");setTimeout(()=>o.remove(),360);mnqHomeSync();if(f)f();else if(after)setTimeout(after,200)};   /* 按鈕的事直接做（iPhone 要在點選當下開始放配樂） */
  o.querySelector("#mnqGf1").onclick=()=>{if(typeof vibrate==="function")vibrate(8);close(btn[1])};o.querySelector("#mnqGf2").onclick=()=>close(null);
  try{o.querySelector("#mnqGf1").focus({preventScroll:true})}catch(e){}return got}
/* ---------- 任務卡（章末、跳過後）：大字寫現在要做什麼 ---------- */
function mnqNextCard(n){n=n||mnqNextOf(mnqSt(),mnqEnv());return{t:mnqNextTxt(n),b:"出發",g:"回首頁"}}
const mnqNextTxt=n=>n.k==="panel"?(n.soon?"第"+MNQ_CN[n.soon-1]+"章即將開放":n.t):n.t;
function mnqTaskCard(n){mnqCss();n=n||mnqNextOf(mnqSt(),mnqEnv());const old=document.getElementById("mnqCard");if(old)old.remove();
  const o=document.createElement("div");o.id="mnqCard";o.setAttribute("role","dialog");o.setAttribute("aria-label","下一步："+mnqNextTxt(n));
  o.innerHTML=`<div class="cd-k">下一步</div><b>${esc(mnqNextTxt(n))}</b><div class="gf-b"><button type="button">出發</button><button type="button" class="g">回首頁</button></div>`;document.body.append(o);requestAnimationFrame(()=>o.classList.add("on"));
  const[b1,b2]=o.querySelectorAll("button"),close=()=>{o.classList.remove("on");setTimeout(()=>o.remove(),360);mnqHomeSync()};
  b1.onclick=()=>{close();mnqGo(n)};b2.onclick=()=>{close();if(!/^#?\/?$/.test(location.hash||""))location.hash="#/"};try{b1.focus({preventScroll:true})}catch(e){}}
/* ---------- 一章：開章 → 危機（解題＋儀式）→ 章末；照 MNQ_CHAP[朝代] 的資料走 ---------- */
/* 危機題題號：SHIP_PLAN[朝代].story 是函式＝照本命子換題（第一章船艙站）、是字串＝固定那一題（第二章 xs-qin-0）；都沒有就用 MNF_QTE 的預設題 */
function mnqQteId(era){era=era||"classic";const C=MNQ_CHAP[era]||MNQ_CHAP.classic;let pc="俥";try{const c=typeof myChar==="function"&&myChar();pc=(c&&WX_CHARS[c].pc)||store.get("botPiece","俥")||"俥"}catch(e){}
  let id=MNF_QTE[C.qte].id,byPc=false;try{const PL=typeof SHIP_PLAN!=="undefined"&&SHIP_PLAN[era];
    if(PL&&typeof PL.story==="function"){id=PL.story(pc);byPc=true}else if(PL&&typeof PL.story==="string")id=PL.story;else if(era==="classic"&&typeof SHIP_PC!=="undefined"&&SHIP_PC[pc]){id="xs-classic-"+SHIP_PC[pc];byPc=true}}catch(e){}return{id,pc,byPc}}
/* 危機題＝那一站的劇情局（一盞茶題庫 cjData 併進來的 ship-set.json）；載不到就用預設那題（記進度時會對題號，不會記錯題）；固定題而且就是預設題＝直接用 MNF_QTE（含 alt 兩解、wrong 台詞） */
async function mnqQteFor(era){era=era||"classic";const C=MNQ_CHAP[era]||MNQ_CHAP.classic,base=Object.assign({},MNF_QTE[C.qte]),{id,pc,byPc}=mnqQteId(era);if(id===base.id&&!byPc)return base;
  try{const D=await Promise.race([cjData(),new Promise((_,j)=>setTimeout(()=>j(0),6000))]),X=D&&D.byId&&D.byId[id];
    if(X&&X.fen&&X.line){const o={id,fen:X.fen,side:X.side||"r",line:X.line};if(id!==base.id){o.alt=null;o.wrong=null}if(byPc)o.hint=`看你的本命棋子「${pc}」！`;return Object.assign(base,o)}}catch(e){}
  return base}
/* 危機解開：記千秋殘局（看演示不記）→ 殘局解開儀式（rite:"solve" 當下演完才回電影；"end" 先回電影，回傳儀式資料給 mnqChapter 等危機那段播完再演） */
/* 熟手挑戰紀錄（11/14 主線玩法多樣化）：best＝歷來最好（最少手數、有沒有過「不用幫忙、沒試看、一次走對」），解第二次也會更新 */
function mnqBest(q,r){const B=Object.assign({},q&&q.best);const m=r.moves|0;if(m&&(!B.moves||m<B.moves))B.moves=m;if(r.perfect)B.perfect=B.perfect||Date.now();if(!r.help&&!r.walk&&!r.hint)B.solo=B.solo||Date.now();if((r.trial||[]).length)B.trial=1;return B}
function mnqSolved(era,P,r,go){const C=MNQ_CHAP[era]||MNQ_CHAP.classic,S=mnqSt(),old=S.qte[C.qte];S.qte[C.qte]={mist:r.mist|0,hint:!!r.hint,demo:!!r.demo,lv:r.lv|0,walk:r.walk|0,help:!!r.help,trial:(r.trial||[]).slice(),moves:r.moves|0,perfect:!!r.perfect,solo:!r.hint&&!r.demo&&!r.walk,best:mnqBest(old,r),at:Date.now()};mnqSave(S);   /* solo＝獨立完成（沒用幫我看、沒陪走；走錯、試看不算）；perfect＝連試看都沒看、一次走對 */
  let state="demo";if(!r.demo&&!r.skip&&P.id===mnqQteId(era).id){state="old";try{if(typeof shipMark==="function"){const m=shipMark(era,P.id,{hint:r.hint});state=m&&m.first?"new":"old"}}catch(e){}}
  let L=null;try{L=typeof shipPuzzles==="function"?shipPuzzles(era):null}catch(e){}
  const R={k:era,id:P.id,cn:r.cn,state,L,set:C.set};if(C.rite!=="solve"){go();return R}   /* "end"／"step"：先回去，儀式之後再演 */
  mnfSolveRite(Object.assign(R,{onDone:go}));return R}
function mnqChapter(era){era=era||"classic";const C=MNQ_CHAP[era],segs=C&&C.segs;if(!segs)return toast("這一章即將開放");if(C.vn)return mnqVn(era);const S=mnqSt();
  let i=segs.findIndex(id=>!S.seg[id]);if(i<0)i=0;try{mnfMusic(MNF_FILMS[segs[i]].mus)}catch(e){}   /* 點選當下先開配樂（iPhone） */
  const P=Object.assign({},MNF_QTE[C.qte]);mnqQteFor(era).then(x=>Object.assign(P,x)).catch(()=>{});segs.forEach(id=>mnfPre(id,C.set));
  const N="第"+MNQ_CN[mnqChN(era)-1]+"章・";let rite=null;
  const play=j=>{const id=segs[j],lastSeg=j===segs.length-1;
    mnfPlay(id,{label:N+MNQ_SEG_NM[id],keepMusic:!lastSeg,qte:{[C.qte]:P},onQte:(q,r,go)=>{const R=mnqSolved(era,P,r,go);if(C.rite==="end")rite=R},card:lastSeg?()=>{mnqMark(id,era);return mnqNextCard()}:null,
      onDone:res=>{mnqMark(id,era);
        if(rite&&!lastSeg){const R=rite;rite=null;try{mnfVol(.45,1)}catch(e){}mnfSolveRite(Object.assign(R,{onDone:()=>play(j+1)}));return}   /* rite:"end"：危機那段播完才演儀式，儀式淡出時章末在底下溶進來 */
        if(!lastSeg)return play(j+1);mnfMusicStop(1);const n=mnqNextOf(mnqSt(),mnqEnv());
        if(res.skipped){if(res.card===1)mnqGo(n);else if(!/^#?\/?$/.test(location.hash||""))location.hash="#/";mnqHomeSync();return}mnqTaskCard(n)}})};
  play(i)}
/* 對話場景的章（07mnv）：從第一場還沒看完的接著看；每看完一場記一次（S.seg）、每場花幾秒（S.vn[朝代].tm，開發者看節奏用）、選了哪個選項（S.vn[朝代].ch） */
function mnqVn(era){const C=MNQ_CHAP[era],S=mnqSt(),CH=typeof MNV_CH!=="undefined"&&MNV_CH[C.vn];if(!CH||typeof mnvPlay!=="function")return toast("這一章即將開放");
  let i=C.segs.findIndex(id=>!S.seg[id]);if(i<0)i=0;const sc=CH.sc[i];if(sc&&sc.mus)try{mnfMusic(sc.mus[0],sc.mus[1])}catch(e){}   /* 點選當下先開配樂（iPhone） */
  const P=Object.assign({},MNF_QTE[C.qte]);mnqQteFor(era).then(x=>Object.assign(P,x)).catch(()=>{});try{mnvPre(C.vn)}catch(e){}
  const V=()=>{const S2=mnqSt();return[S2,S2.vn[era]||(S2.vn[era]={})]};
  mnvPlay(C.vn,{from:i,label:"第"+MNQ_CN[mnqChN(era)-1]+"章・"+String((MNQ_CH.find(c=>c[0]===era)||[0,""])[1]),pz:P,
    onScene:(id,ms,sk)=>{mnqMark(id,era);const[S2,X]=V();(X.tm||(X.tm={}))[id]=ms;X.sk=X.sk||{};if(sk)X.sk[id]=1;else delete X.sk[id];mnqSave(S2)},
    onChoice:(k,v)=>{const[S2,X]=V();(X.ch||(X.ch={}))[k]=v;mnqSave(S2)},
    onSolved:(P2,r)=>mnqSolved(era,P2,r,()=>{}),
    onRetry:(P2,r)=>{const[S2]=V(),q=S2.qte[C.qte]||(S2.qte[C.qte]={});q.retry=(q.retry|0)+1;if(!r.hint&&!r.walk)q.solo=true;q.best=mnqBest(q,r);mnqSave(S2);
      if(!r.walk&&P2.id===mnqQteId(era).id)try{if(typeof shipMark==="function")shipMark(era,P2.id,{hint:r.hint})}catch(e){}},
    onEnd:k=>{mnqHomeSync();if(k===1)location.hash="#/adventure"},onLeave:()=>mnqHomeSync()})}
function mnqMark(id,era){const S=mnqSt();if(!S.seg[id])S.seg[id]=Date.now();if(MNQ_SEGS[era]&&MNQ_SEGS[era].every(x=>S.seg[x])&&!S.lamp[era])S.lamp[era]=Date.now();mnqSave(S)}
/* ---------- 下一步：照 mnqNextOf 的結果去做 ---------- */
function mnqGo(n){n=n||mnqNextOf(mnqSt(),mnqEnv());if(typeof vibrate==="function")vibrate(8);
  if(n.k==="gift")return mnqGift(n.g,n.era);
  if(n.k==="film")return mnqChapter(n.era||"classic");
  if(n.k==="cpu"){const go=()=>{location.hash="#/cpu"};try{api("/play/new",{human:"r",lx:1,ranked:false}).then(go,go)}catch(e){go()}return}
  if(n.k==="home"||n.k==="ship"){location.hash="#/adventure";setTimeout(()=>{try{shipGoTo(n.era)}catch(e){}},700);return}   /* ship：下一章要星槎停到那一朝才開放（航線還沒開到那一站時 shipGoTo 自己會說） */
  mnqPanel()}
/* ---------- 首頁「下一步」：包一層 07z homeMap，放在底部那一條的最上面（同一個直排容器，不會跟入口標籤、大按鈕疊在一起） ---------- */
function mnqHomeBtn(v){const P=v&&v.querySelector&&v.querySelector(".home-page"),bar=P&&P.querySelector(".hm-go-bar");if(!bar||bar.querySelector(".mnq-next"))return;mnqCss();
  const b=document.createElement("button");b.type="button";b.className="mnq-next";b.id="mnqNext";bar.insertBefore(b,bar.firstChild);
  b.onclick=e=>{e.stopPropagation();mnqGo()};mnqHomeSync();
  const dg=()=>{if(!P.isConnected)return;try{mnqDodge(P,bar)}catch(e){}},rs=()=>{if(!P.isConnected){removeEventListener("resize",rs);return}setTimeout(dg,320)};addEventListener("resize",rs);requestAnimationFrame(dg);setTimeout(dg,90);setTimeout(dg,760)}
/* 11/13 第 16 輪 device-fit：iPhone Duo 闔起（466×678）等矮螢幕，底部那條多了「下一步」變高，蓋到圖上的「同桌對弈」標籤。
   被底部那條蓋到的標籤用 marginTop 往上推到它上面（跟 07z hmClamp 用 marginLeft 推左右同一套，先歸零再量，不會越推越多），推完通知 r07HitSoon 重算點選範圍 */
function mnqDodge(P,bar){const R=bar.getBoundingClientRect();if(!R.height)return;let mv=0;
  P.querySelectorAll(".shp-spot").forEach(s=>{if(bar.contains(s))return;const was=s.classList.contains("mnq-dg");if(was){s.style.marginTop="";s.classList.remove("mnq-dg")}const q=s.getBoundingClientRect();if(!q.width)return;
    if(q.bottom>R.top-6&&q.top<R.bottom&&q.right>R.left-4&&q.left<R.right+4){s.style.marginTop=-Math.ceil(q.bottom-R.top+6)+"px";s.classList.add("mnq-dg");mv++}});   /* 11/14 r17 B1：mnq-dg＝這裡推的，05 fzPull 看到就不清（以前 0.4 秒後被它清掉又疊回去）；沒推過的不動別人的 marginTop */
  if(mv&&typeof r07HitSoon==="function")try{r07HitSoon()}catch(e){}}
function mnqHomeSync(){const b=document.getElementById("mnqNext");if(!b)return;const n=mnqNextOf(mnqSt(),mnqEnv()),t="⛵ 下一步・"+mnqNextTxt(n);
  if(b.dataset.t!==t){b.dataset.t=t;b.textContent=t;b.setAttribute("aria-label","下一步："+mnqNextTxt(n))}if(n.k==="film")try{const C=MNQ_CHAP[n.era]||{};if(C.vn)mnvPre(C.vn);else mnfPre(n.id,C.set)}catch(e){}}
if(typeof homeMap==="function"){const f0=homeMap;homeMap=function(v){const r=f0.apply(this,arguments);try{mnqHomeBtn(v)}catch(e){}return r}}
/* ---------- 星槎遠征令面板 ---------- */
let MNQ_AU=null;
function mnqPanel(){mnqCss();const S=mnqSt(),E=mnqEnv(),n=mnqNextOf(S,E);
  sheet("⛵ 星槎遠征令",b=>{const lit=MNQ_CH.filter(c=>S.lamp[c[0]]).length;
    b.innerHTML=`<p style="margin:0 0 8px;font:800 17px var(--serif,serif)">航線亮了 ${lit}／13 盞</p><div class="mnq-rt">${MNQ_CH.map(([e,nm],i)=>{const on=!!S.lamp[e],has=!!MNQ_SEGS[e],pk=MNQ_PEEK&&has&&!!(MNQ_CHAP_ALL[e]&&MNQ_CHAP_ALL[e].off),ok=on||pk||mnqOpen(S,E,e),cur=ok&&!on;
      return`<button type="button" class="mnq-ln ${on?"on":cur?"cur":"off"}" data-e="${e}"${ok?"":' aria-disabled="true"'}><span class="lp">${on?"🏮":i+1}</span>${esc(nm)}<em>${pk&&!on?"🛠 試玩":on?"再看一次":cur?"前往":has?"停靠"+esc(mnqShort(e))+"後開放":"即將開放"}</em></button>`}).join("")}</div>
      ${S.music.length?`<div class="sec-t">♪ 配樂收藏</div>${S.music.map(m=>`<button type="button" class="mnq-mu" data-m="${esc(m)}">▶ <span class="mnq-mt">${esc(m)}</span></button>`).join("")}`:""}
      ${S.page.length?`<div class="sec-t">📜 星槎遠征札記</div>${S.page.map(e=>`<button type="button" class="item mnq-pg" data-pg="${e}"><span class="lb" style="font-size:20px">📜</span><span class="tx"><b>${esc((MNQ_CH.find(c=>c[0]===e)||[0,e])[1])}</b><span>${esc(S.clue[e]||(e==="classic"?MNQ_NOTE0:""))}</span></span><span class="mnq-pg-go" aria-hidden="true">›</span></button>`).join("")}`:""}`;
    b.querySelectorAll(".mnq-pg").forEach(x=>x.onclick=()=>mnqNote(x.dataset.pg));
    b.querySelectorAll(".mnq-ln").forEach(x=>x.onclick=()=>{const e=x.dataset.e;if(!MNQ_SEGS[e]){toast("這一章即將開放");return}if(!S.lamp[e]&&!(MNQ_PEEK&&MNQ_CHAP_ALL[e].off)&&!mnqOpen(S,E,e)){toast(MNQ_CH.slice(0,mnqChN(e)-1).every(([p])=>!MNQ_CHAP[p]||mnqDone(S,p))?"星槎停靠"+mnqShort(e)+"，這一章就開放":"先看完上一章");return}closeSheet();setTimeout(()=>mnqChapter(e),250)});
    if(S.music.length&&typeof bgmTitles==="function")bgmTitles().then(T=>b.querySelectorAll(".mnq-mu").forEach(x=>{const t=(T||{})[x.dataset.m];if(t)x.querySelector(".mnq-mt").textContent="《"+t+"》"})).catch(()=>{});
    b.querySelectorAll(".mnq-mu").forEach(x=>x.onclick=()=>mnqListen(x));mnqDevRow(b)})}
/* 遠征令最下面的開發者列（開發者模式或本機才有）：試玩下架的章（開關＋重新載入）、把下架的章進度清掉從頭試 */
function mnqDevRow(b){if(!mnqPeekOk())return;const off=Object.entries(MNQ_CHAP_ALL).filter(([,c])=>c.off).map(([e])=>e);if(!off.length)return;const d=document.createElement("div");d.className="mnq-dev";
  d.innerHTML=`<div class="sec-t">🛠 開發者</div><button type="button" class="mnq-mu" data-k="pk">${MNQ_PEEK?"✅":"⬜"} 試玩下架的章（${esc(off.map(mnqShort).join("、"))}）：${MNQ_PEEK?"開":"關"}</button>${MNQ_PEEK?`<button type="button" class="mnq-mu" data-k="rs">↺ 下架的章從頭試（清掉這幾章的進度）</button>`:""}`;b.append(d);
  d.querySelector("[data-k=pk]").onclick=()=>{try{if(MNQ_PEEK)localStorage.removeItem("xq_mnqPeek");else localStorage.setItem("xq_mnqPeek","1")}catch(e){}toast(MNQ_PEEK?"已關閉試玩，重新載入…":"已打開試玩，重新載入…");setTimeout(()=>location.reload(),600)};
  const rs=d.querySelector("[data-k=rs]");if(rs)rs.onclick=()=>{const S=mnqSt();for(const e of off){const C=MNQ_CHAP_ALL[e];for(const id of C.segs||[])delete S.seg[id];delete S.lamp[e];delete S.vn[e];delete S.qte[C.qte]}mnqSave(S);toast("已清掉，重新打開遠征令");closeSheet();setTimeout(mnqPanel,300)}}
/* 札記頁（開發者 11/13 晚：遠征令裡的札記卡片看起來點得開、其實點不開）：章名、札記全文、星路歷程（收禮、到站、看完電影、亮燈，照時間排） */
const MNQ_NOTE0="解開一盤，殘譜就多一行字，桌邊的刻痕也亮回一小段。";
function mnqNoteEv(S,e){const ev=[],add=(t,s)=>{if(+t>0)ev.push([+t,s])},nm=(MNQ_CH.find(c=>c[0]===e)||[0,e])[1];
  if(e==="classic"){add(S.gift.a1,"收下七星授印禮，星槎遠征令開始");add(S.title.chu,"第一次下贏電腦，收下破局錦囊")}
  else add(S.gift.a6[e],"星槎停到"+String(nm).split("・")[0]+"，收下遠征補給");
  const sg=MNQ_SEGS[e]||[];if(MNQ_CHAP[e]&&MNQ_CHAP[e].vn){if(sg.length){add(S.seg[sg[0]],"看完第一場「"+(MNQ_SEG_NM[sg[0]]||"")+"」");add(S.seg[sg[sg.length-1]],"看完最後一場「"+(MNQ_SEG_NM[sg[sg.length-1]]||"")+"」")}}   /* 對話場景一章八場：札記只記頭尾 */
  else for(const id of sg)add(S.seg[id],"看完「"+(MNQ_SEG_NM[id]||id)+"」");
  add(S.lamp[e],"航線亮燈");return ev.sort((a,b)=>a[0]-b[0])}
function mnqNote(e){mnqCss();const S=mnqSt(),nm=(MNQ_CH.find(c=>c[0]===e)||[0,e])[1],tx=S.clue[e]||(e==="classic"?MNQ_NOTE0:""),ev=mnqNoteEv(S,e);
  const d=t=>{const x=new Date(t);return`${x.getMonth()+1}月${x.getDate()}日 ${String(x.getHours()).padStart(2,"0")}:${String(x.getMinutes()).padStart(2,"0")}`};
  sheet("📜 "+nm,b=>{b.innerHTML=`<div class="mnq-note">${tx?`<p class="mnq-note-tx">${esc(tx)}</p>`:""}
    <div class="sec-t">✦ 星路歷程</div>${ev.length?`<ol class="mnq-note-ev">${ev.map(x=>`<li><b>${esc(d(x[0]))}</b><span>${esc(x[1])}</span></li>`).join("")}</ol>`:`<p class="muted">這一朝還沒有留下足跡。</p>`}
    <button type="button" class="btn" id="mnqNoteBack" style="width:100%;margin-top:10px">↩ 回星槎遠征令</button></div>`;
    b.querySelector("#mnqNoteBack").onclick=()=>mnqPanel()})}
function mnqListen(x){const rel=x.dataset.m;if(MNQ_AU&&MNQ_AU.rel===rel&&!MNQ_AU.a.paused){MNQ_AU.a.pause();x.firstChild.textContent="▶ ";mnfBgmBack();return}
  if(MNQ_AU)try{MNQ_AU.a.pause()}catch(e){}const a=new Audio();MNQ_AU={a,rel};MNF.on=true;try{if(typeof BGM!=="undefined"&&BGM.a)BGM.a.pause()}catch(e){}a.volume=mnfLevel();
  mnfBlob(rel).then(u=>{if(!u||MNQ_AU.a!==a)return;a.src=u;a.play().catch(()=>{})});a.onended=()=>mnfBgmBack();document.querySelectorAll(".mnq-mu").forEach(y=>{y.firstChild.textContent=y===x?"⏸ ":"▶ "})}
/* ---------- 接進現有系統：千秋大百科一類、稱號 ---------- */
try{if(typeof CODEX!=="undefined"&&Array.isArray(CODEX)&&!CODEX.some(c=>c.id==="mnq"))CODEX.push({id:"mnq",g:"story",ic:"⛵",nm:"星槎遠征札記",
  say:"主線「星槎遠征令」的札記：收下七星授印禮就有第一頁，每到一個新朝代多一頁，還有那一朝的配樂收藏。",v:()=>{const S=mnqSt();return{x:S.page.length,y:13,u:"頁",s:`航線亮燈 ${Object.keys(S.lamp).length}／13・配樂 ${S.music.length} 首`}},go:()=>mnqPanel()})}catch(e){}
if(typeof cxTitles==="function"){const f1=cxTitles;cxTitles=function(){const L=f1.apply(this,arguments);try{const T=mnqSt().title;L.push({t:"雲河新使",how:"選好角色，收下七星授印禮",got:!!T.xin,g:"etc"},{t:"初勝",how:"第一次跟電腦下贏，收下破局錦囊",got:!!T.chu,g:"etc"})}catch(e){}return L}}
if(typeof window!=="undefined"&&typeof window.XQ_TITLE==="function"){const f2=window.XQ_TITLE;window.XQ_TITLE=()=>{let r="";try{r=f2()}catch(e){}if(r)return r;try{const T=mnqSt().title;return T.chu?"初勝":T.xin?"雲河新使":""}catch(e){return""}}}
/* ---------- 自動跳禮包：首頁、星槎頁，沒有別的視窗時 ---------- */
function mnqIdle(){try{if(typeof TITLE!=="undefined"&&TITLE)return false;if(document.hidden)return false;if(!/^(#\/?|#\/adventure\/?)?$/.test(location.hash||""))return false;
  const pv=document.getElementById("preov");if(pv&&getComputedStyle(pv).display!=="none"&&pv.getBoundingClientRect().height>0)return false;   /* 開 App 的下載畫面還在 */
  return!document.querySelector(".modal,#sheet,#mnfPg,#mnvPg,#mnfRite,#mnqGf,#mnqCard,#bhxPg,#bhxVx,.rfx,.qp-ov")}catch(e){return false}}
function mnqReach(){try{const E=mnqEnv();if(!E.at||!MNQ_CHAP[E.at])return;const S=mnqSt();if(S.reach[E.at])return;S.reach[E.at]=Date.now();mnqSave(S)}catch(e){}}   /* 星槎第一次停到有主線資料的那一朝：記下來，那一章就開放（之後開走也不會再關） */
function mnqTick(auto){try{mnqReach();const v=document.getElementById("view");if(v&&!document.getElementById("mnqNext"))mnqHomeBtn(v);mnqHomeSync();if(!auto||!mnqIdle())return;const n=mnqNextOf(mnqSt(),mnqEnv());if(n.k==="gift")mnqGift(n.g,n.era)}catch(e){}}
/* 首頁第一次畫出來時（m.html 載入途中就 route 了）這個模組還沒包到 homeMap：計時器順便補上按鈕 */
if(typeof window!=="undefined"&&typeof document!=="undefined"){let qa=false;try{qa=localStorage.getItem("xq_mnqQa")==="1"}catch(e){}const auto=!navigator.webdriver||qa;setInterval(()=>mnqTick(auto),2500);setTimeout(()=>mnqTick(false),0)}
