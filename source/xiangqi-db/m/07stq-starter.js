/* ================= 🔰 新手練習「先走再學」（開發者 11/15 定案；story/新手任務10案_回覆二與合併_1115.md 最後的「Claude 合併建議」）=================
   第一次開 App 的新玩家：不先選角、不看授印禮、不看第一章電影，直接出現棋盤（#stqPg 全螢幕）。六個任務一條線，畫面上只有一句目標和棋盤：
     1 俥走到亮格（3 格）→ 2 俥吃掉亮著的黑子（3 顆）→ 3 將軍（2 題）→ 4 封住退路（先標出黑將的逃點，一步殺；解開說「這一步封住了退路」）
     → 5 換擺法再解 2 題一步殺（落點、方向都跟第 4 題不同）→ 6 跟最弱的電腦各走四步（4 個雙方回合過關，可以接著下完）。
   題目都是人工挑的固定局面（STQ_T），跟本命棋子無關；解題對不對一律用 XQCore 判斷（將軍＝走完黑將被攻擊；一步殺＝走完黑將被攻擊而且黑方沒有合法著法），不是比對答案格。
   共用規則：💡 提示免費（不用 useHint、不扣提示棋）；答錯可以重試，不扣定軌力（這裡完全不碰 07dgl）；錯兩次自動出藍框。
   每個任務完成：任務格亮燈、addXP（STQ_XP，key＝stq:1～stq:6，同一個 key 只發一次）。經驗值：成長表 07-legend xpNeed(L)＝60＋20×L，Lv 1→2 要 80；
     六個任務 10＋10＋15＋15＋15＋15＝80，剛好是 Lv 1→2 的量（走子小課對齊新手訓練營每課 10、解題和對局對齊千秋殘局 15、下完一盤 15）。addXP 當天第一次另加 20 是成長表本來的規則。
   右上角「我會下棋，直接開始」一直都在：按了就把還沒領的任務經驗一次補齊（stqPay，S.got 記已領，key stq:skip），不點亮沒做的任務格，不寫測驗、殘局、學習紀錄。
   畢業（第六個任務按「完成練習」或按跳過）：mnqGrant("a1") 一次領七星授印禮的入門物品（稱號、提示棋 5、家鄉棋盤、圖鑑第一頁），不演儀式；
     做完六個任務的人蓋「練」字朱印（借 07mnq 的 mnqStamp／mnqRay 動畫，一下就好）；接著選角（05 obCarousel），選完回首頁。
   預設角色：本命棋子是俥的齊轍（x_swordboy）。一開始就用 stqJourney 建一段旅程（跟 05b journeyStart 同樣的鍵，但不走黑洞序局、不出序幕），選角時換人用 05b journeyRepick。
   首頁原本的「⛵ 下一步」：07mnq 的 mnqHomeSync／按鈕先問 stqHome()，改成「更多玩法」清單（stqMore：對弈電腦、一盞茶殘局、棋力測驗、新手訓練營；有遠征令進度的人另有一顆遠征令——11/15 遠征令拿掉，那顆跟著 07mnq MNQ_PANEL_ON 關掉）；
     練習還沒做完（重新整理、從別頁回來）＝「🔰 繼續新手練習」。黑洞塔防不放。
   老玩家（選過角、有對局或解題紀錄、存檔格、舊玩家過渡、做過第一章或授印禮、做過黑洞序局、秒開局…）：stqOldOf 判斷，記 {st:"old"}，不跳任務、不發獎勵。
   存檔 store "stq"（localStorage m_stq；整支手機一份、不在 JOURNEY_KEYS：做過一次，開新旅程也不重來）＝
     {v:版本 STQ_V, st:"run"|"done"|"old", at:開始, n:做到第幾個任務(0～6), done:{任務序:完成時間}, got:{任務序:已領經驗時間}, skip:按跳過的時間, how:"all"|"skip", end:畢業時間, c0:預設角色, c:選的角色, pick:選角時間}。
   開關 STQ_ON（false＝整個退回舊流程）。開發者預覽：本機或開發者模式下 localStorage xq_stqPeek＝"1" 後重新整理＝只看畫面，不建旅程、不發經驗、不寫存檔（用一次就清掉）。
   無頭瀏覽器（navigator.webdriver）不自動開，免得擋到別的自動測試（localStorage xq_stqQa＝"1" 才開）。
   名稱前綴 stq／STQ（11/15 已 grep 整個 m/ 確認沒人用）。新字串的英文在 scratchpad starter-i18n.json，等合併進 07i18n。 */
const STQ_ON=true,STQ_V=1,STQ_C0="x_swordboy";
const STQ_XP=[10,10,15,15,15,15];
/* 六個任務。棋盤格號＝列×9＋行（第 0 列是黑方底線、第 9 列是紅方底線）。
   walk／eat：tg＝依序要走到／吃掉的格；check／mate：ps＝題目（一題一題換）；esc：解題前標出黑將現在能逃去的格；game：n＝要走幾個雙方回合 */
const STQ_T=[
  {k:"walk",g:"把俥走到發亮的格子",fen:"4k4/9/9/9/9/9/9/9/9/R2K5",tg:[45,53,17]},
  {k:"eat",g:"用俥吃掉發亮的黑子",fen:"4k4/9/2b6/p5n1p/9/9/9/6c2/9/R2K5",tg:[27,33,69]},
  {k:"check",g:"走一步，讓黑將被攻擊",ps:["4k4/9/9/9/9/9/9/9/9/R2K5","3k5/9/9/9/9/7R1/9/9/9/5K3"]},
  {k:"mate",g:"黑將只能逃到綠點，一步將死它",ps:["3k5/9/9/9/9/9/8R/9/9/4K4"],esc:1},
  {k:"mate",g:"換個擺法，一樣封住退路",ps:["4k4/R8/9/9/9/9/9/9/9/3K4R","5k3/R8/9/9/9/2R6/9/9/9/3K5"],esc:1},
  {k:"game",g:"跟電腦各走四步",n:4}];
const STQ_TX={ok:"對了！",done:"完成！",seal:"這一步封住了退路",walk:"不是這格，再試一次",eatOther:"不是這顆，再試一次",eatNone:"要吃掉發亮的那顆",
  noCheck:"這步沒有攻擊到黑將",escape:"將軍了，可是黑將還能逃",hint:"藍框就是答案，點點看",think:"電腦想一下…",pass:"過關！可以接著下完",
  win:"你贏了！",lose:"這盤輸了，再來一次",draw:"和棋",king:"先動俥"};
/* 電腦還沒載好時的提示著法（紅方開局常見的幾步，ICCS） */
const STQ_OPEN=["h2e2","b2e2","h0g2","b0c2","g3g4","c3c4","i0h0","a0b0"];
/* ---------- 存檔 ---------- */
function stqMig(s){if(!s||typeof s!=="object"||!s.v)return null;if(!s.done||typeof s.done!=="object")s.done={};if(!s.got||typeof s.got!=="object")s.got={};s.n=Math.max(0,Math.min(STQ_T.length,s.n|0));return s}   /* 之後改欄位：照 s.v 在這裡轉換，再把 v 改成 STQ_V */
function stqSt0(){try{return stqMig(store.get("stq",null))}catch(e){return null}}
function stqSt(){return stqSt0()||{v:STQ_V,st:"",n:0,done:{},got:{}}}
const stqSave=s=>{try{store.set("stq",s)}catch(e){}};
/* ---------- 純計算 ---------- */
/* 老玩家：有任何一樣就算（E＝stqEnvNow 收集的；測試直接傳） */
function stqOldOf(E){E=E||{};return!!(E.J||E.slots||E.old||E.fw||E.played||E.prog||E.mnq||E.bh||E.restored)}
/* 黑將現在能走去的格（黑方的合法著法裡，從黑將出發的落點） */
function stqEsc(B){const C=XQCore,k=C.kingSq(B,"b");return k<0?[]:C.legal(B,"b").filter(([f])=>f===k).map(([,t])=>t)}
/* 判斷一步：ok＝過了；why＝STQ_TX 的哪一句 */
function stqJudge(T,B,f,t,step){const C=XQCore;if(!C.legal(B,"r").some(([a,b])=>a===f&&b===t))return{ok:false,why:"walk"};
  const nb=C.make(B,f,t);
  if(T.k==="walk")return t===T.tg[step]&&B[f]==="R"?{ok:true}:{ok:false,why:B[f]==="K"?"king":"walk"};
  if(T.k==="eat")return t===T.tg[step]&&B[f]==="R"?{ok:true}:{ok:false,why:B[f]==="K"?"king":B[t]?"eatOther":"eatNone"};
  const ck=C.inCheck(nb,"b");
  if(T.k==="check")return ck?{ok:true}:{ok:false,why:"noCheck"};
  if(T.k==="mate")return ck&&!C.legal(nb,"b").length?{ok:true}:{ok:false,why:ck?"escape":"noCheck"};
  return{ok:false,why:"walk"}}
/* 提示：walk／eat＝俥和要去的格；check／mate＝第一個判斷會過的著法 */
function stqHintMv(T,B,step){const C=XQCore;
  if(T.k==="walk"||T.k==="eat"){const r=B.indexOf("R");return r<0?null:[r,T.tg[step]]}
  if(T.k==="check"||T.k==="mate"){const m=C.legal(B,"r").find(([f,t])=>stqJudge(T,B,f,t,step).ok);return m?[m[0],m[1]]:null}
  return null}
/* 規則內建的電腦（引擎還沒載好、或想太久時用）：一半機會先吃子，其他隨機；rnd 可以傳固定的亂數 */
function stqBotMv(B,rnd){const C=XQCore,R=rnd||Math.random,L=C.legal(B,"b");if(!L.length)return null;
  const cap=L.filter(([,t])=>B[t]);const P=cap.length&&R()<.5?cap:L;return P[Math.floor(R()*P.length)%P.length]}
/* 對局的提示（引擎沒載好）：開局常見的幾步裡第一個合法的；都不行就第一個合法著法 */
function stqOpenHint(B){const C=XQCore,L=C.legal(B,"r");for(const s of STQ_OPEN){const f=C.parseSq(s.slice(0,2)),t=C.parseSq(s.slice(2,4));if(L.some(([a,b])=>a===f&&b===t))return[f,t]}return L.length?[L[0][0],L[0][1]]:null}
/* 跳過：還沒領的任務經驗一次補齊（改 S.got），回傳這次要發多少；再按一次＝0 */
function stqPay(S,now){let sum=0;S.got=S.got||{};for(let i=0;i<STQ_XP.length;i++)if(!S.got[i]){S.got[i]=now||Date.now();sum+=STQ_XP[i]}return sum}
const stqCount=T=>T.tg?T.tg.length:T.ps?T.ps.length:T.n|0;
/* ---------- 環境 ---------- */
function stqEnvNow(){const E={};try{E.J=!!journey()}catch(e){}try{E.slots=Object.keys(slotMetaAll()).length}catch(e){}try{E.old=!!SAVE_OLD}catch(e){}
  try{E.fw=!!store.get("firstWin",null)}catch(e){}try{E.played=FW_PLAYED.some(k=>localStorage.getItem(k)!=null)}catch(e){}try{E.prog=!!tsmProgNow().any}catch(e){}
  try{const M=mnqSt();E.mnq=!!(M.gift.a1||Object.keys(M.seg).length||Object.keys(M.lamp).length)}catch(e){}
  try{E.bh=!!store.get("bhXuDone",null)}catch(e){}try{E.restored=!!sessionStorage.getItem("xqRestored")}catch(e){}return E}
function stqCan(){try{let qa=false;try{qa=localStorage.getItem("xq_stqQa")==="1"}catch(e){}return(!navigator.webdriver||qa)&&!!window.XQCore&&typeof Board==="function"}catch(e){return false}}
function stqPeekOk(){try{if(/^(localhost|127\.\d+\.\d+\.\d+|\[::1\])$/.test(location.hostname))return true;return typeof DEVMODE==="function"&&!!DEVMODE()}catch(e){return false}}
/* 練習中（還沒畢業）：07mnq 的 mnqTick 看到就不自動跳授印禮 */
function stqHold(){if(!STQ_ON)return false;const S=stqSt0();return!!(S&&S.st==="run")}
/* ---------- 開 App：05b titleScreen 第一行問這裡；回 true＝這裡接手了 ---------- */
function stqBoot(opt){if(!STQ_ON||(opt&&opt.view))return false;opt=opt||{};
  let pk=false;try{pk=stqPeekOk()&&localStorage.getItem("xq_stqPeek")==="1";if(pk)localStorage.removeItem("xq_stqPeek")}catch(e){}
  if(pk){titleClose();stqOpen({peek:true});return true}
  const S=stqSt0();if(S&&S.st==="run"){if(!stqCan())return false;titleClose();stqOpen();return true}
  if(S)return false;
  if(stqOldOf(stqEnvNow())){stqSave({v:STQ_V,st:"old",at:Date.now()});return false}
  if(!stqCan())return false;
  /* 先確定 IndexedDB 裡也沒有存檔（有的話開機會還原，就不是新玩家），跟 05b 新手秒開局同一套 */
  titlePaint("wait",opt);
  fwSaved().then(s=>{if(!TITLE||TITLE.dataset.v!=="wait")return;
    if(s||stqSt0()||stqOldOf(stqEnvNow())){titlePaint(s||!fwNeed()?"menu":typeof bhxNeed==="function"&&bhxNeed()?"xu":"first",opt);return}
    titleClose();stqBegin()}).catch(()=>{if(TITLE&&TITLE.dataset.v==="wait")titlePaint("menu",opt)});
  return true}
/* 預設角色的旅程：跟 05b journeyStart 寫一樣的鍵（角色、性別、棋子、家鄉朝代、停靠站、難度），不走黑洞序局、不出序幕 */
function stqJourney(c){const C=WX_CHARS[c];if(!C||journey())return false;
  store.set("slotCur",curSlot()||1);store.set("pChar",c);store.set("pSex",C.sx);store.set("pStyle","real");store.set("botPiece",C.pc);store.set("onboard1",true);
  const hm=jHomePick(c);store.set("journey",{c,sx:C.sx,born:Date.now(),v:1,era:2,home:hm,re:2,stq:1});
  if(hm){store.set("era",hm);store.set("eraUser",null);store.set("shipDock",["classic",hm]);try{applyEra()}catch(e){}}
  store.set("playSec",0);store.set("diff",2);if(store.get("oppLook",null)==null)store.set("oppLook","real");
  try{if(!myName())setMyName(defaultName())}catch(e){}
  try{saveNow(true)}catch(e){}try{window.dispatchEvent(new Event("xq-look"))}catch(e){}return true}
function stqBegin(){const now=Date.now();stqSave({v:STQ_V,st:"run",at:now,n:0,done:{},got:{},c0:STQ_C0});
  try{store.set("bhXuAsk",now)}catch(e){}   /* 07bh 的「大更新：第〇章與黑洞序局」只問舊玩家；新手練習的人不問 */
  try{stqJourney(STQ_C0)}catch(e){try{console.warn("stqJourney",e)}catch(x){}}
  stqOpen()}
/* ---------- 樣式 ---------- */
function stqCss(){if(document.getElementById("stqCss"))return;try{if(typeof mnqCss==="function")mnqCss()}catch(e){}const s=document.createElement("style");s.id="stqCss";s.textContent=`
#stqPg{--text:#2a2018;--muted:#6f5f4c;--card:#FFF8EC;--line:#d8c8b0;position:fixed;inset:0;z-index:9300;display:flex;flex-direction:column;align-items:center;gap:8px;padding:calc(10px + env(safe-area-inset-top,0px)) 8px calc(12px + env(safe-area-inset-bottom,0px));background:#f3ead7;color:#3b2a1a;opacity:0;transition:opacity .3s;overflow-x:hidden;overflow-y:auto}   /* 畢業的放射光 380px 比窄手機寬：只准上下捲，不出水平捲軸 */
#stqPg.on{opacity:1}
#stqPg .stq-top{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px;width:min(560px,100%)}
@media (max-width:350px){#stqPg .stq-top{justify-content:center}}
#stqPg .stq-lp{display:flex;gap:5px;flex:none}
#stqPg .stq-lp span{width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:800 13px/1 var(--serif,serif);background:#cdbb98;color:#5b4a3a}
#stqPg .stq-lp span.on{background:radial-gradient(circle,#fff3c4,#f2b33d 60%,#b8741a);color:#7a3a10;box-shadow:0 0 10px rgba(242,179,61,.85)}
#stqPg .stq-lp span.cur{box-shadow:0 0 0 2px #b3261e;color:#b3261e;background:#f8f0dc}
#stqPg .stq-sk{flex:0 1 auto;min-height:44px;padding:6px 12px;border-radius:99px;border:1.5px solid #8a5a2b;background:#fffaf0;color:#5b3a1a;font:800 14px/1.2 var(--serif,serif);white-space:nowrap}
#stqPg .stq-g{margin:4px 0 0;min-height:2.6em;display:flex;align-items:center;justify-content:center;text-align:center;font:900 clamp(19px,5.6vw,24px)/1.3 var(--serif,serif);letter-spacing:.04em;text-wrap:balance;max-width:min(560px,100%)}
#stqPg .stq-g.ok{color:#9e1b15}#stqPg .stq-g.no{color:#7a3b12}
#stqPg .stq-c{min-height:20px;font:700 15px var(--serif,serif);color:#8a6a3b}
#stqPg .stq-bd{width:min(560px,100%,calc((100dvh - 230px)*.9032));flex:none}
#stqPg .stq-bd svg{display:block;width:100%;height:auto;touch-action:none}
#stqPg .stq-ft{display:flex;gap:10px;justify-content:center;width:min(420px,100%)}
#stqPg .stq-ft button{flex:1;min-height:48px;border-radius:99px;border:2px solid #8a5a2b;background:#fffaf0;color:#3b2a1a;font:900 17px var(--serif,serif)}
#stqPg .stq-ft .stq-nx{background:linear-gradient(#b3261e,#7d1611);border-color:#f2c94c;color:#fff6dc}
#stqPg .stq-end{display:flex;flex-direction:column;align-items:center;gap:14px;margin:auto 0;text-align:center}
#stqPg .stq-st{position:relative;width:150px;height:150px}
#stqPg .gf-ray{position:absolute;left:50%;top:50%;width:380px;height:380px;margin:-190px;border-radius:50%;background:repeating-conic-gradient(rgba(242,179,61,.45) 0 7deg,transparent 7deg 20deg);-webkit-mask:radial-gradient(circle,#000 0 12%,transparent 62%);mask:radial-gradient(circle,#000 0 12%,transparent 62%);opacity:0;animation:mnqRay .8s .5s ease-out forwards;pointer-events:none}
#stqPg .stq-seal{position:absolute;inset:18px;border:7px solid #c0392b;border-radius:14px;background:rgba(255,250,240,.95);color:#b3261e;display:flex;align-items:center;justify-content:center;font:900 66px/1 var(--serif,serif);transform:scale(2.6) rotate(-16deg);opacity:0;animation:mnqStamp .55s .15s ease forwards}
#stqPg .stq-end h2{margin:0;font:900 clamp(26px,8vw,36px)/1.2 var(--serif,serif);letter-spacing:.12em;color:#7d1611}
#stqPg .stq-it{display:flex;flex-direction:column;gap:6px;width:min(340px,92vw)}
#stqPg .stq-it div{padding:8px 14px;border-radius:12px;background:#fffaf0;border:1px solid rgba(138,90,43,.35);text-align:left;font:800 17px/1.3 var(--serif,serif)}
#stqPg .stq-go{width:min(340px,92vw);min-height:54px;border-radius:99px;border:2px solid #f2c94c;background:linear-gradient(#b3261e,#7d1611);color:#fff6dc;font:900 20px var(--serif,serif);letter-spacing:.08em}
#stqPg .stq-pk{width:min(420px,100%)}
#stqPg button:focus-visible{outline:3px solid #f2c94c;outline-offset:3px}
.stq-more{display:grid;gap:8px}.stq-more .item{width:100%;text-align:left;cursor:pointer;color:inherit;font:inherit}
@media (prefers-reduced-motion:reduce){#stqPg *{animation:none!important}#stqPg .stq-seal{opacity:1;transform:rotate(-6deg)}}`;document.head.append(s)}
/* ---------- 畫面 ---------- */
let STQ_UI=null;
function stqOpen(o){o=o||{};if(document.getElementById("stqPg")||!window.XQCore||typeof Board!=="function")return;stqCss();try{navClear()}catch(e){}
  const pg=document.createElement("div");pg.id="stqPg";pg.setAttribute("role","dialog");pg.setAttribute("aria-modal","true");pg.setAttribute("aria-label","新手練習");
  pg.innerHTML=`<div class="stq-top"><div class="stq-lp" role="img" aria-label="新手練習進度">${STQ_T.map((x,i)=>`<span>${i+1}</span>`).join("")}</div><button type="button" class="stq-sk">我會下棋，直接開始</button></div>
    <p class="stq-g" role="status" aria-live="polite"></p><div class="stq-c" aria-hidden="true"></div><div class="stq-bd"></div><div class="stq-ft"><button type="button" class="stq-h">💡 提示</button><button type="button" class="stq-nx" hidden>完成練習</button></div>`;
  document.body.append(pg);requestAnimationFrame(()=>pg.classList.add("on"));
  const U=STQ_UI={pg,peek:!!o.peek,bd:Board(x=>stqTap(x)),n:0,B:null,step:0,sel:-1,busy:false,miss:0,hk:null,mark:-1,esc:[],sealed:[],turn:"r",rounds:0,ply:0,end:false,passed:false,last:null,ck:-1,gid:0};
  pg.querySelector(".stq-bd").append(U.bd.svg);
  pg.querySelector(".stq-sk").onclick=()=>{try{vibrate(6)}catch(e){}stqGrad("skip")};
  pg.querySelector(".stq-h").onclick=()=>{try{vibrate(5)}catch(e){}stqHint()};
  pg.querySelector(".stq-nx").onclick=()=>{try{vibrate(8)}catch(e){}stqGrad("all")};
  const n0=U.peek?(o.n|0):stqSt().n|0;stqLoad(Math.min(STQ_T.length-1,n0));if(!U.peek&&n0>=STQ_T.length){stqGrad("all");return}   /* 六個都做完、還沒按「完成練習」就關掉了：直接到畢業 */
  try{pg.querySelector(".stq-bd svg").focus({preventScroll:true})}catch(e){}}
function stqClose(){const U=STQ_UI;STQ_UI=null;if(!U)return;U.gid++;U.pg.classList.remove("on");setTimeout(()=>U.pg.remove(),320);try{mnqHomeSync()}catch(e){}}
function stqSay(t,c){const U=STQ_UI;if(!U)return;const e=U.pg.querySelector(".stq-g");if(!e)return;e.textContent=t;e.className="stq-g"+(c?" "+c:"")}
function stqGoal(){const U=STQ_UI;if(!U)return;const T=STQ_T[U.n];stqSay(T.g);const c=U.pg.querySelector(".stq-c"),N=stqCount(T);if(c)c.textContent=N>1?Math.min(N,(T.k==="game"?U.rounds:U.step)+(T.k==="game"?0:1))+"／"+N:""}
function stqLamps(){const U=STQ_UI;if(!U)return;const S=U.peek?{done:{}}:stqSt();U.pg.querySelectorAll(".stq-lp span").forEach((x,i)=>{x.className=S.done[i]?"on":i===U.n?"cur":""})}
function stqLoad(n){const U=STQ_UI;if(!U)return;const C=XQCore,T=STQ_T[n];U.n=n;U.step=0;U.miss=0;U.hk=null;U.sel=-1;U.mark=-1;U.busy=false;U.end=false;U.passed=false;U.sealed=[];U.gid++;
  U.B=C.parseFen(T.k==="game"?C.START:T.fen||T.ps[0]);U.turn="r";U.rounds=0;U.ply=0;U.esc=T.esc?stqEsc(U.B):[];
  const nx=U.pg.querySelector(".stq-nx");if(nx)nx.hidden=true;stqLamps();stqGoal();stqDraw()}
/* 棋盤上加畫的東西（viewBox 560×620，第一格中心 40,40，每格 60）：亮格、綠色逃點、封住後的 ✗（05b fwX） */
function stqMarkSq(svg,i,kind){const NS="http://www.w3.org/2000/svg",x=40+i%9*60,y=40+(i/9|0)*60;let e;
  if(kind==="esc"){e=document.createElementNS(NS,"circle");e.setAttribute("cx",x);e.setAttribute("cy",y);e.setAttribute("r","22");e.setAttribute("fill","rgba(46,180,96,.55)");e.setAttribute("stroke","#15803d");e.setAttribute("stroke-width","5");e.setAttribute("stroke-dasharray","7 4")}   /* 11/15 逃點原本 r17、四成透明，手機上偏小偏淡：放大到 r22（棋子半徑 26 以內，不壓到格線外）、顏色加深 */
  else{e=document.createElementNS(NS,"rect");e.setAttribute("x",x-28);e.setAttribute("y",y-28);e.setAttribute("width","56");e.setAttribute("height","56");e.setAttribute("rx","10");e.setAttribute("fill","rgba(242,201,76,.38)");e.setAttribute("stroke","#d08a00");e.setAttribute("stroke-width","5")}
  e.setAttribute("pointer-events","none");e.setAttribute("aria-hidden","true");svg.append(e)}
function stqDraw(B2){const U=STQ_UI;if(!U)return;const C=XQCore,T=STQ_T[U.n],B=B2||U.B;
  const tg=!B2&&U.sel>=0?C.legal(U.B,"r").filter(([f])=>f===U.sel).map(x=>x[1]):[];
  U.bd.draw(B,{sel:B2?-1:U.sel,targets:tg,...(U.last?{last:U.last}:{}),check:U.ck>=0?U.ck:-1,...(U.hk&&!B2?{hint:U.hk}:{})});U.last=null;U.ck=-1;
  const svg=U.bd.svg;if((T.k==="walk"||T.k==="eat")&&!B2&&U.step<T.tg.length)stqMarkSq(svg,T.tg[U.step],"tg");
  if(T.esc&&!B2)for(const q of U.sealed.length?[]:U.esc)stqMarkSq(svg,q,"esc");
  if(U.sealed.length&&typeof fwX==="function")for(const q of U.sealed)fwX(svg,q);
  if(U.mark>=0&&typeof fwX==="function")fwX(svg,U.mark)}
function stqTap(x){const U=STQ_UI;if(!U||U.busy||U.end&&STQ_T[U.n].k!=="game")return;const C=XQCore,T=STQ_T[U.n];if(T.k==="game"&&(U.turn!=="r"||U.end))return;
  const L=C.legal(U.B,"r");if(U.sel>=0&&L.some(([f,t])=>f===U.sel&&t===x))return stqMove(U.sel,x);
  U.sel=L.some(([f])=>f===x)?x:-1;if(U.sel>=0)try{vibrate(5)}catch(e){}stqDraw()}
function stqMove(f,t){const U=STQ_UI,C=XQCore,T=STQ_T[U.n];U.sel=-1;if(T.k==="game")return stqGameMove(f,t);
  const r=stqJudge(T,U.B,f,t,U.step),nb=C.make(U.B,f,t),ck=C.inCheck(nb,"b"),g=U.gid;U.busy=true;
  if(r.ok){U.B=nb;U.hk=null;U.miss=0;U.last={f,t};U.ck=ck?C.kingSq(nb,"b"):-1;if(T.k==="mate"){U.sealed=U.esc.slice();try{vibrate([20,60,40])}catch(e){}}stqDraw();
    stqSay(T.k==="mate"?STQ_TX.seal:STQ_TX.ok,"ok");setTimeout(()=>{if(STQ_UI!==U||U.gid!==g)return;U.busy=false;stqNext()},T.k==="mate"?2300:800);return}
  U.miss++;U.mark=t;U.last={f,t};U.ck=ck?C.kingSq(nb,"b"):-1;stqDraw(nb);U.mark=-1;try{vibrate([20,40,20])}catch(e){}stqSay(STQ_TX[r.why]||STQ_TX.walk,"no");
  setTimeout(()=>{if(STQ_UI!==U||U.gid!==g)return;U.busy=false;if(U.miss>=2)U.hk=stqHintMv(T,U.B,U.step);stqDraw();if(U.hk&&U.miss>=2)stqSay(STQ_TX.hint);else stqGoal()},1400)}
/* 一題過了：walk／eat 換下一格（棋盤接著用），check／mate 換下一題；都做完＝任務完成 */
function stqNext(){const U=STQ_UI;if(!U)return;const C=XQCore,T=STQ_T[U.n];U.step++;
  if(U.step<stqCount(T)){if(T.ps){U.B=C.parseFen(T.ps[U.step]);U.esc=T.esc?stqEsc(U.B):[];U.sealed=[]}stqGoal();stqDraw();return}
  stqDone(U.n);stqSay(STQ_TX.done,"ok");U.busy=true;const g=U.gid;setTimeout(()=>{if(STQ_UI!==U||U.gid!==g)return;stqLoad(U.n+1)},1000)}
/* 任務完成：亮燈、發經驗（只發一次） */
function stqDone(n){const U=STQ_UI;if(U&&U.peek){U.pg.querySelectorAll(".stq-lp span")[n].className="on";return}
  const S=stqSt();if(S.st!=="run")return;const now=Date.now();if(!S.done[n])S.done[n]=now;const pay=!S.got[n];if(pay)S.got[n]=now;S.n=Math.max(S.n|0,n+1);stqSave(S);
  if(pay)try{addXP(STQ_XP[n],"新手練習","stq:"+(n+1))}catch(e){}stqLamps();if(U){const L=U.pg.querySelectorAll(".stq-lp span")[n];if(L)L.className="on"}}
function stqHint(){const U=STQ_UI;if(!U||U.busy)return;const T=STQ_T[U.n];
  if(T.k==="game"){if(U.turn!=="r"||U.end)return;stqGameHint();return}
  U.hk=stqHintMv(T,U.B,U.step);stqDraw();stqSay(STQ_TX.hint)}
/* ---------- 第六個任務：跟最弱的電腦下 ---------- */
/* 電腦的一步：引擎已經載好＝照最弱一級（深度 1、多看 10 條、差 700 分內隨機挑，同 local.js 第 1 級）；引擎沒載好、出錯、2.5 秒沒回＝規則內建的 stqBotMv。不等引擎下載，所以不會卡在「想一下」 */
async function stqBotPlay(B){const C=XQCore;
  try{if(typeof XQEngine!=="undefined"&&XQEngine&&XQEngine.ready){const r=await Promise.race([XQEngine.search({fen:C.fen(B,"b")},{depth:1},10),new Promise((_,j)=>setTimeout(()=>j(new Error("tmo")),2500))]);
    const mv=r&&C.pickMove(r,{margin:700});if(typeof mv==="string"&&mv.length>=4){const f=C.parseSq(mv.slice(0,2)),t=C.parseSq(mv.slice(2,4));if(C.legal(B,"b").some(([a,b])=>a===f&&b===t))return[f,t]}}}catch(e){}
  return stqBotMv(B)}
async function stqGameHint(){const U=STQ_UI,C=XQCore,g=U.gid,B=U.B;let m=null;
  try{if(typeof XQEngine!=="undefined"&&XQEngine&&XQEngine.ready){const r=await Promise.race([XQEngine.search({fen:C.fen(B,"r")},{depth:4},1),new Promise((_,j)=>setTimeout(()=>j(new Error("tmo")),1500))]);
    const mv=r&&r.best;if(typeof mv==="string"&&mv.length>=4){const f=C.parseSq(mv.slice(0,2)),t=C.parseSq(mv.slice(2,4));if(C.legal(B,"r").some(([a,b])=>a===f&&b===t))m=[f,t]}}}catch(e){}
  if(STQ_UI!==U||U.gid!==g||U.B!==B)return;U.hk=m||stqOpenHint(B);stqDraw();stqSay(STQ_TX.hint)}
function stqGameMove(f,t){const U=STQ_UI,C=XQCore,T=STQ_T[U.n],g=U.gid;U.B=C.make(U.B,f,t);U.turn="b";U.ply++;U.hk=null;U.last={f,t};U.ck=C.inCheck(U.B,"b")?C.kingSq(U.B,"b"):-1;stqDraw();
  if(!C.legal(U.B,"b").length)return stqGameEnd("w");if(U.ply>=300)return stqGameEnd("d");
  stqSay(STQ_TX.think);const t0=Date.now();
  stqBotPlay(U.B).then(mv=>new Promise(ok=>setTimeout(()=>ok(mv),Math.max(0,450-(Date.now()-t0))))).then(mv=>{if(STQ_UI!==U||U.gid!==g)return;
    if(!mv)return stqGameEnd("w");U.B=C.make(U.B,mv[0],mv[1]);U.turn="r";U.ply++;U.rounds++;U.last={f:mv[0],t:mv[1]};U.ck=C.inCheck(U.B,"r")?C.kingSq(U.B,"r"):-1;stqDraw();
    if(!C.legal(U.B,"r").length)return stqGameEnd("l");
    if(U.rounds>=T.n&&!U.passed){U.passed=true;stqDone(U.n);const nx=U.pg.querySelector(".stq-nx");if(nx){nx.hidden=false;try{nx.focus({preventScroll:true})}catch(e){}}stqSay(STQ_TX.pass,"ok");stqGoalCount();return}
    if(U.passed){stqSay(STQ_TX.pass);stqGoalCount();return}stqGoal()})}
function stqGoalCount(){const U=STQ_UI;if(!U)return;const c=U.pg.querySelector(".stq-c");if(c)c.textContent=U.rounds+"／"+STQ_T[U.n].n}
/* 對局結束：過關以後＝說結果、留著「完成練習」；還沒過關就輸了＝重來一盤 */
function stqGameEnd(w){const U=STQ_UI;if(!U)return;U.end=true;const g=U.gid;
  if(U.passed||w==="w"){if(!U.passed){U.passed=true;stqDone(U.n);const nx=U.pg.querySelector(".stq-nx");if(nx)nx.hidden=false}stqSay(w==="w"?STQ_TX.win:w==="d"?STQ_TX.draw:STQ_TX.lose.split("，")[0],w==="w"?"ok":"");return}
  stqSay(w==="d"?STQ_TX.draw:STQ_TX.lose,"no");U.busy=true;setTimeout(()=>{if(STQ_UI!==U||U.gid!==g)return;stqLoad(U.n)},1800)}
/* ---------- 畢業：一次領入門物品 → 選角 → 回首頁 ---------- */
function stqGrad(how){const U=STQ_UI;if(!U)return;U.gid++;U.busy=true;U.end=true;const all=how==="all";
  if(!U.peek){const S=stqSt(),now=Date.now();if(S.st==="run"||!S.st){S.v=STQ_V;
      if(!all){const sum=stqPay(S,now);S.skip=now;stqSave(S);if(sum)try{addXP(sum,"新手練習","stq:skip")}catch(e){}}
      S.st="done";S.how=all?"all":"skip";S.end=now;stqSave(S)}
    try{if(typeof mnqGrant==="function")mnqGrant("a1")}catch(e){}}
  let nh=5;try{nh=MNQ_HINT_A1}catch(e){}
  U.pg.innerHTML=`<div class="stq-end">${all?`<div class="stq-st"><div class="gf-ray"></div><div class="stq-seal" data-noi18n>練</div></div>`:""}<h2>${all?"新手練習完成":"入門物品領好了"}</h2>
    <div class="stq-it"><div>🏅 稱號「雲河新使」</div><div>💡 提示棋 ×${nh}</div><div>🏠 家鄉棋盤</div><div>📜 圖鑑第一頁</div></div><button type="button" class="stq-go">選一位角色</button></div>`;
  if(all)try{if(typeof rfxSound==="function")rfxSound(false);else if(typeof mnfSfx==="function")mnfSfx("bell")}catch(e){}
  const b=U.pg.querySelector(".stq-go");b.onclick=()=>{try{vibrate(8)}catch(e){}stqPickView()};try{b.focus({preventScroll:true})}catch(e){}}
function stqPickView(){const U=STQ_UI;if(!U)return;
  U.pg.innerHTML=`<p class="stq-g">選一位角色</p><div class="stq-pk"></div>`;
  let L=[];try{L=obPicks()}catch(e){}const box=U.pg.querySelector(".stq-pk");
  if(!L.length||typeof obCarousel!=="function"){stqPick(null);return}
  let c0=STQ_C0;try{c0=(journey()||{}).c||STQ_C0}catch(e){}
  obCarousel(box,L,Math.max(0,L.findIndex(x=>x.k===c0)),x=>stqPick(x.k),null)}
/* 選好角色：跟預設角色不同就用 05b journeyRepick 換（它只認 re:1，先標一下；換完它自己改回 re:2），停靠站照新旅程一樣只有船艙和家鄉 */
function stqPick(c){const U=STQ_UI;
  if(U&&!U.peek&&c){try{const J=journey();if(J&&J.c!==c&&WX_CHARS[c]){store.set("journey",{...J,re:1});journeyRepick(c);const J2=journey();if(J2&&J2.re===1)store.set("journey",{...J2,re:2});if(J2&&J2.home)store.set("shipDock",["classic",J2.home])}}catch(e){}
    const S=stqSt();if(S.st==="done"){S.c=c;S.pick=Date.now();stqSave(S)}try{if(typeof fnStep==="function")fnStep("pick")}catch(e){}try{saveNow(true)}catch(e){}try{window.dispatchEvent(new Event("xq-look"))}catch(e){}}
  stqClose();try{if(/^(#\/?)?$/.test(location.hash||""))route();else goHome()}catch(e){}}
/* ---------- 首頁按鈕（07mnq mnqHomeSync／按鈕先問這裡）：{t:字}；null＝照 07mnq 原本的「下一步」 ---------- */
function stqHome(){if(!STQ_ON)return null;const S=stqSt0();if(S&&S.st==="run")return{k:"run",t:"🔰 繼續新手練習"};return{k:"more",t:"更多玩法"}}
function stqHomeGo(){const h=stqHome();if(!h)return false;if(h.k==="run"){if(stqCan())stqOpen();return true}stqMore();return true}
function stqMore(){stqCss();let mq=false;if(typeof MNQ_PANEL_ON!=="undefined"&&MNQ_PANEL_ON)try{const M=mnqSt();mq=!!(M.gift.a1||Object.keys(M.seg).length)}catch(e){}   /* 11/15 遠征令拿掉（07mnq MNQ_PANEL_ON＝false）：不放「⛵ 星槎遠征令」那顆 */
  const L=[["🤖","對弈電腦",typeof CpuRoom==="function"?"#/cpuroom":"#/cpu"],["🍵","一盞茶殘局","#/canju"],["📝","棋力測驗","#/quiz"],["🔰","新手訓練營","#/camp"]];
  sheet("更多玩法",b=>{b.innerHTML=`<div class="stq-more">${L.map(([i,t,h])=>`<button type="button" class="item" data-h="${h}"><span class="lb" style="font-size:22px">${i}</span><span class="tx"><b>${esc(t)}</b></span></button>`).join("")}${mq?`<button type="button" class="btn ghost" data-k="mnq" style="width:100%">⛵ 星槎遠征令</button>`:""}</div>`;
    b.querySelectorAll("[data-h]").forEach(x=>x.onclick=()=>{try{vibrate(6)}catch(e){}closeSheet();location.hash=x.dataset.h});
    const m=b.querySelector("[data-k=mnq]");if(m)m.onclick=()=>{closeSheet();setTimeout(()=>{try{mnqPanel()}catch(e){}},250)}})}
/* 重新整理、或開 App 時開頭畫面沒出來（同一個分頁已經看過）：練習還沒做完、人在首頁、沒有別的視窗，就接著開 */
function stqAuto(){try{if(!STQ_ON||STQ_UI||!stqHold()||!stqCan())return;if(typeof TITLE!=="undefined"&&TITLE)return;if(!/^(#\/?)?$/.test(location.hash||""))return;if(document.querySelector(".modal,#sheet,#mnqGf,#mnfPg,#bhxPg,#bhxVx"))return;stqOpen()}catch(e){}}
if(typeof window!=="undefined"&&typeof document!=="undefined"&&typeof navigator!=="undefined")setTimeout(stqAuto,1500);
