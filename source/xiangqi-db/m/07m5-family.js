/* ================= 👁 護眼提醒＋👪 家長時段（回饋 843（開發者 11/9 選：護眼提醒＋家長時段））=================
   護眼提醒：畫面亮著、而且 2 分鐘內有操作的時間（FM_E.acc）累積到 30 分鐘（FM_EYE_MIN），等「安全的時機」才跳小卡：
     換頁時（route 畫完 0.8 秒、5 秒內）、對局下完（08b-cpugame.js 的 xq-result 後 3 秒）、殘局這一題解完（解題頁出現 #cjNext）、
     或停在不是對局／解題的頁面上而且沒有開著的視窗。線上對戰（#/pvp）一律不跳；開頭畫面、載入畫面蓋著時也不跳。
     小卡＝遠山水墨＋小帥一句話；按「好，我休息一下」播 20 秒（FM_EYE_SEC）看遠方倒數，播完重新算 30 分鐘；略過＝15 分鐘後再提醒（FM_EYE_SNOOZE）。
     切到背景超過 5 分鐘（FM_EYE_GAP）＝眼睛已經休息過，重新算。有走路角色的頁面同時用 xq-bot-said 讓角色頭上冒泡泡（BOT.say 會自己發這個事件）。
     計時存在 store "fmEye"＝{acc,due,at}，重新整理不會歸零。
   家長時段：store "fmCfg"＝{eye 護眼提醒（預設開）, lim 每天最多幾分鐘（0＝不限，預設）, late "21:00"＝幾點以後到早上 6 點（FM_WAKE）不能玩（""＝不限，預設）}；
     整支手機一份，不跟 3 格存檔走（不在 JOURNEY_KEYS）。
     今天玩了幾分鐘＝沿用 05-settings.js useTick 記的 useDay（每天畫面開著的毫秒），再加上還沒記進去的那一段（useT 到現在，最多 1 分鐘）。
     時間到：正在下的那盤、正在解的那題照常下完（不打斷、不換頁）；下完（同上的安全時機）跳收尾畫面「今天的棋下完了，明天見」，可以看今天學了什麼（04c-weekly.js wkData 只算今天）。
     之後換頁，除了首頁、設定、週報、意見回饋，都擋下來回首頁（02-shell.js route() 開頭呼叫 fmRouteGate）並提示「今天的時間到了」；首頁上方掛一條小橫幅。
     剩 5 分鐘時小提示一次（FM_WARN）。家長答對確認題（兩位數乘一位數）可以再加 15／30 分鐘：store "fmX"＝{d 日期, add 今天加了幾分鐘, lateUntil 晚上放寬到什麼時候（時間戳）}。
     改設定也要過確認題。
   設定 UI：包一層 Settings(v)，在「系統」分頁「隱私」標題前面插一段「👪 家長與護眼」（.sec-t#fmSecT＋.card#fmSet）；
     這個檔在 m.html 排在 07s2-setmap.js 前面，07s2 包 Settings 時看得到這一段（07s2 的 SM_EP 選擇器要接：sec:#fmSet）。
   前綴 fm；開關 FM_ON（false＝全部不做，route 照舊）；樣式在 fmCss */
const FM_ON=true;
const FM_EYE_MIN=30,FM_EYE_SNOOZE=15,FM_EYE_GAP=5,FM_EYE_SEC=20,FM_IDLE=12e4,FM_WAKE=6,FM_WARN=5;
const FM_LIM_OPT=[0,20,30,45,60,90,120],FM_LATE_OPT=["","19:30","20:00","20:30","21:00","21:30","22:00"],FM_FREE=["","settings","weekly","feedback","fbadmin"];
const FM_KID_SES=[20,30,45,60],FM_KID_NIGHT="21:30",FM_NT_OPT=["21:00","21:30","22:00",""],FM_SES_RE=10,FM_SES_GAP=5,FM_GEN_MIN=60;
const FM_E={acc:0,due:FM_EYE_MIN*6e4,last:Date.now(),hid:0,act:Date.now(),done:0,pc:0};
{const s=store.get("fmEye",null);if(s&&Date.now()-(s.at||0)<FM_EYE_GAP*6e4){FM_E.acc=+s.acc||0;FM_E.due=+s.due||FM_EYE_MIN*6e4}}
const fmSaveE=()=>store.set("fmEye",{acc:Math.round(FM_E.acc),due:Math.round(FM_E.due),at:Date.now()});
function fmCfg(){const c=store.get("fmCfg",null)||{};return{eye:c.eye!==false,lim:Math.max(0,+c.lim||0),late:/^\d{1,2}:\d{2}$/.test(c.late||"")?c.late:"",net:c.net!==false,
  kid:c.kid===true,ses:FM_KID_SES.includes(+c.ses)?+c.ses:30,night:c.night===""?"":/^\d{1,2}:\d{2}$/.test(c.night||"")?c.night:FM_KID_NIGHT}}   /* 評比第 4 輪 P20：kid 兒童模式、ses 每次玩幾分鐘提醒休息、night 晚上幾點提醒早點睡（""＝不提醒）；說明在下面「兒童模式核心」 */
/* 開發者 11/9（Gemini 第 54 份 iOS 上架評估，全部都做）：家長可以整個關掉線上大廳（fmCfg.net＝false）。關掉＝07x4-lobbysafe.js 把大廳換成說明頁、
   src/net.js 照「停權中」處理（不公開在線狀態、不能邀請配對、別人的邀請一律婉拒）；單機功能、版本更新通知照常 */
function fmNetOff(){try{const c=fmCfg();return!c.net||c.kid}catch(e){return false}}   /* 兒童模式也走這條：大廳關、net.js 照停權處理 */
function fmX(){const x=store.get("fmX",null)||{},d=localDay();if(x.d!==d){x.d=d;x.add=0}return x}
const fmP=h=>String(h==null?location.hash:h).replace(/^#\/?/,"").split("/").filter(Boolean);
function fmBusy(h){const p=fmP(h),a=p[0]||"",b=p[1]||"";return["cpu","arena","pvp","qqev","quiz","guess","legend"].includes(a)||((a==="journey"||a==="redo")&&b==="play")||(["canju","battle","camp","theme"].includes(a)&&!!b)||(a==="ship"&&(b==="lv"||b==="pz"))}
const fmFree=h=>{const a=fmP(h)[0]||"";return FM_FREE.includes(a)||a.startsWith("connect=")};
function fmUsed(){let ms=0;try{ms=(store.get("useDay",null)||{})[localDay()]||0;if(!document.hidden&&typeof useT==="number")ms+=Math.max(0,Math.min(Date.now()-useT,6e4))}catch(e){}return ms/6e4}
const fmMin=s=>{const m=/^(\d{1,2}):(\d{2})$/.exec(s||"");return m?(+m[1])*60+(+m[2]):null};
const fmNowMin=()=>{const d=new Date();return d.getHours()*60+d.getMinutes()};
function fmLateNow(c){const t=fmMin(c.late);if(t==null)return false;const n=fmNowMin();return n>=t||n<FM_WAKE*60}
function fmLock(){if(!FM_ON)return null;const c=fmCfg(),x=fmX();if(c.lim>0&&fmUsed()>=c.lim+(x.add||0))return"lim";if(c.late&&fmLateNow(c)&&!((x.lateUntil||0)>Date.now()))return"late";return null}
/* 離時間到還有幾分鐘（沒設限制＝null） */
function fmLeft(){const c=fmCfg(),x=fmX();let L=null;if(c.lim>0)L=c.lim+(x.add||0)-fmUsed();
  if(c.late){const t=fmMin(c.late),n=fmNowMin();let m;if(fmLateNow(c))m=(x.lateUntil||0)>Date.now()?((x.lateUntil-Date.now())/6e4):0;else m=t-n;L=L==null?m:Math.min(L,m)}return L}
const fmNm=()=>{try{return typeof ASKN==="function"?ASKN():"小帥"}catch(e){return"小帥"}};
const fmPc=()=>{try{const n=fmNm();return n!=="小帥"&&typeof botPc==="function"?botPc():"帥"}catch(e){return"帥"}};
function fmSay(t){try{if(typeof BOT!=="undefined"&&BOT&&BOT.say){BOT.say(t,5);return}}catch(e){}try{window.dispatchEvent(new CustomEvent("xq-bot-said",{detail:t}))}catch(e){}}

/* ---------- 👧 兒童模式＋防沉迷（評比第 4 輪 P20「嚴格把關臺灣家長」：兒童家長模式與資料零收集、線上大廳安全與防沉迷）----------
   兒童模式 fmCfg.kid（開、關都要過 fmGate 家長確認題；設定 UI 在下面 fmKidEdit）：
     資料零收集：fmNetOff() 回 true → 07x4 大廳換成說明頁、src/net.js 照停權處理（shareIRT／flushIRT 不送也不排隊、不公開在線狀態和戰績摘要、不能邀請配對、
       別人的邀請一律婉拒、千秋盃報名不送）、05-settings.js reportPlayer 不送玩家登記；window.XQ_ANON_OK 也一律回 false（net.js 送出端再擋一次）；
       開啟時 fmKidPurge：丟掉排隊中的匿名資料（XQNet.dropIRT）、fbQueue 裡的玩家登記，排隊中的意見回饋拿掉 ID、名字、段位、聯絡方式、截圖、頁面（fmKidRec），
       並請伺服器清掉自己的在線狀態和戰績摘要（XQNet.forget）。之後意見回饋只送文字（postForm 包一層 fmKidRec）；表單上的截圖、檔案、聯絡方式藏起來（body.fm-kid）。
       檢舉、刪除請求原樣送（要靠裝置代號處理）。
     無陌生人互動：fmKidGate——#/cup 千秋盃、#/join 線上入座、#/coop/lobby 殘篇閣、#/watch 觀戰 一律轉到 #/lobby（兒童模式說明頁）；同桌對弈 #/pvp 照常。
     不顯示外連：問小帥的 Google／Gemini 按鈕藏起來、天氣和維基百科不查（worldAsk／chessWiki 包一層，只用 App 內的內容），xqExtOpen 不開外站，頁面上的外站連結變純文字。
   防沉迷（每次遊玩 store "fmSes"＝{d 日期, acc 毫秒, at 最後一次有操作, due 兒童模式下次提醒, gen 一般提醒過了}）：
     遊玩時間＝畫面開著、2 分鐘內有操作（跟護眼同一個 FM_IDLE）；切到背景或停著不動超過 FM_SES_GAP（5 分鐘）＝休息過，重新算；跨日也重新算。
     兒童模式：玩到家長設的 fmCfg.ses（20／30／45／60 分鐘）→ 安全時機（fmSafe：下完這盤、換頁，不打斷棋局）跳「休息一下吧」；按了以後 FM_SES_RE（10 分鐘）再提醒。
     一般玩家：連續 FM_GEN_MIN（60 分鐘）提醒一次（同一段只一次），設定可關（store fmGenOff＝true）。
     兒童模式晚上提示 fmCfg.night（預設 21:30，""＝不提示）：過了那個時間到早上 FM_WAKE 點，每晚溫和提示一次（store "fmNt"＝那一晚的日期），不擋；要擋用上面的 late。
     每日總量上限沿用 lim（時間到只剩首頁、設定、週報、意見回饋）。
   這一段到「兒童模式核心：以上」只用 store、Date、window、localStorage，xiangqi-lab/tools/test-family.js 切出來測 */
const fmKid=()=>{try{return FM_ON&&fmCfg().kid}catch(e){return false}};
const fmDayOf=t=>{const d=new Date(t);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0")};
function fmSesGet(now){now=now||Date.now();const s=store.get("fmSes",null);if(!s||typeof s!=="object"||s.d!==fmDayOf(now)||now-(+s.at||0)>=FM_SES_GAP*6e4)return{d:fmDayOf(now),acc:0,at:now,due:0,gen:0};return s}
function fmSesAdd(dt,now){now=now||Date.now();const s=fmSesGet(now);s.acc=(+s.acc||0)+Math.max(0,+dt||0);s.at=now;store.set("fmSes",s);return s}
function fmSesDue(now){const s=fmSesGet(now),c=fmCfg();if(c.kid)return s.acc>=(+s.due||c.ses*6e4)?"kid":null;if(store.get("fmGenOff",false)||s.gen)return null;return s.acc>=FM_GEN_MIN*6e4?"gen":null}
function fmSesDone(k,now){now=now||Date.now();const s=fmSesGet(now);if(k==="kid")s.due=s.acc+FM_SES_RE*6e4;else s.gen=1;s.at=now;store.set("fmSes",s);return s}
const fmNtKey=now=>fmDayOf((now||Date.now())-FM_WAKE*36e5);
function fmNtDue(now){now=now||Date.now();const c=fmCfg();if(!c.kid||!c.night)return false;const t=fmMin(c.night),d=new Date(now),n=d.getHours()*60+d.getMinutes();if(t==null||!(n>=t||n<FM_WAKE*60))return false;return store.get("fmNt","")!==fmNtKey(now)}
const fmNtDone=now=>store.set("fmNt",fmNtKey(now));
function fmKidGate(h){if(!fmKid())return null;const p=fmP(h),a=p[0]||"";return a==="cup"||a==="join"||(a==="coop"&&p[1]==="lobby")||(a==="watch"&&p[1]!=="ai")?"#/lobby":null}
/* 兒童模式送出意見回饋：玩家登記不送（回 null）；檢舉、刪除請求原樣；其他只留文字、類型、版本、裝置類型 */
function fmKidRec(r){if(!r||typeof r!=="object")return r;const ty=String(r.type||"");if(/玩家/.test(ty))return null;if(/檢舉|刪除/.test(ty))return r;return Object.assign({},r,{id:"",name:"",rank:"",contact:"",img:"",page:""})}
function fmKidPurge(){let n=0;try{if(window.XQNet&&XQNet.dropIRT)XQNet.dropIRT(()=>true)}catch(e){}try{if(localStorage.getItem("xq_irtQ"))localStorage.setItem("xq_irtQ","[]")}catch(e){}
  try{const q=store.get("fbQueue",[]),o=[];for(const r of(Array.isArray(q)?q:[])){const x=fmKidRec(r);if(x)o.push(x);else n++}store.set("fbQueue",o)}catch(e){}
  try{if(window.XQNet){if(XQNet.forget)XQNet.forget();if(XQNet.refresh)XQNet.refresh()}}catch(e){}return n}
{const a0=window.XQ_ANON_OK;window.XQ_ANON_OK=x=>{if(fmKid())return false;try{return typeof a0!=="function"||!!a0(x)}catch(e){return true}}}
/* ---------- 兒童模式核心：以上 ---------- */

function fmCss(){if(document.getElementById("fmCss"))return;const s=document.createElement("style");s.id="fmCss";s.textContent=`
.fm-ov{position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(20,14,8,.55);animation:fmIn .25s ease-out backwards}
.fm-ov.fm-top{z-index:10002}
.fm-card{position:relative;background:var(--card);color:var(--ink);border-radius:22px;width:100%;max-width:360px;max-height:calc(100vh - 32px);overflow:auto;padding:0 0 16px;text-align:center;box-shadow:0 10px 34px rgba(0,0,0,.35);border:1px solid var(--line)}
.fm-card h2{font:900 21px var(--serif,serif);margin:12px 16px 4px}.fm-card p{margin:6px 18px;line-height:1.7}
.fm-pad{padding-top:18px}
.fm-sky{display:block;width:100%;height:auto;border-radius:22px 22px 0 0}
.fm-cl{animation:fmCloud 26s linear infinite}.fm-cl2{animation:fmCloud 38s linear infinite reverse}
.fm-bird{animation:fmBird 9s ease-in-out infinite}
.fm-say{display:flex;gap:10px;align-items:flex-start;text-align:left;margin:12px 16px 0}
.fm-say p{margin:2px 0 0;font-size:16px}
.fm-pc{flex:none;width:44px;height:44px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 24px var(--serif,serif);color:#B3261E;background:#FBF3E4;border:3px solid #B3261E;box-shadow:0 2px 6px rgba(0,0,0,.2)}
.fm-ring{position:relative;width:112px;height:112px;margin:10px auto 0}.fm-ring svg{width:100%;height:100%;transform:rotate(-90deg)}
.fm-ring b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:900 34px var(--serif,serif);color:var(--accent)}
.fm-ring .fm-rg{stroke:var(--accent);stroke-linecap:round;transition:stroke-dashoffset 1s linear}
.fm-btns{display:flex;flex-direction:column;gap:8px;margin:14px 16px 0}.fm-btns .btn{width:100%;min-height:48px;font-size:16px}
.fm-par{margin:12px auto 0;display:block;border:0;background:none;color:var(--muted);font-size:13.5px;text-decoration:underline;cursor:pointer;padding:6px}
.fm-learn{margin:8px 16px 0;text-align:left}.fm-learn ul{margin:6px 0 0;padding:10px 12px 10px 30px;background:color-mix(in srgb,var(--accent) 7%,var(--card));border-radius:12px;border:1px solid var(--line);line-height:1.7;font-size:14.5px}
.fm-q{font:900 30px var(--serif,serif);margin:8px 0 6px!important;letter-spacing:1px}
.fm-in{width:140px;font-size:26px;text-align:center;padding:8px;border-radius:12px;border:2px solid var(--line);background:var(--bg);color:var(--ink)}
.fm-err{color:#C0392B;min-height:1.4em;font-size:14px}.fm-shake{animation:fmShake .35s}
.fm-rib{position:fixed;left:12px;right:12px;top:calc(var(--xqT,56px) + 8px);z-index:900;display:flex;align-items:center;gap:8px;padding:8px 10px 8px 14px;border-radius:14px;background:color-mix(in srgb,var(--card) 92%,transparent);color:var(--ink);border:1.5px solid color-mix(in srgb,var(--accent) 45%,var(--line));box-shadow:0 4px 14px rgba(0,0,0,.18);font-size:14.5px}
.fm-rib b{flex:1;min-width:0}.fm-rib button{flex:none;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:6px 10px;font-size:13px;cursor:pointer}
.fm-rib.fm-pulse{animation:fmPulse .9s ease-out 1}
.fm-row{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:1px dashed var(--line);font-size:14.5px}.fm-row:last-of-type{border-bottom:0}.fm-row b{text-align:right}
.fm-ed{text-align:left;padding:4px 16px 0}.fm-ed .sec-t{margin:12px 0 6px}.fm-ed .opt{flex-wrap:wrap}
.fm-kidl{margin:6px 0 0;padding-left:1.3em;font-size:13px;line-height:1.7;text-align:left}.fm-kidl li{margin-bottom:2px}
.fm-sw{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px dashed var(--line);font-size:14.5px}
.fm-kidb{width:100%;margin-top:10px}
body.fm-kid #aiB{display:none!important}
body.fm-kid .fbw>div:has(.fba),body.fm-kid .fbw>div:has(>#fc){display:none!important}
body.fm-kid .fbw .fbn{font-size:0!important}
body.fm-kid .fbw .fbn::before{content:"👧 兒童模式：只送出你寫的文字、App 版本和裝置類型；不附截圖、檔案、聯絡方式、名字和線上 ID。需要開發者回覆，請家長幫忙寫。";font-size:12px;line-height:1.6}
body.fm-kid a[href^="http://"],body.fm-kid a[href^="https://"]{pointer-events:none;color:inherit!important;text-decoration:none!important}
@keyframes fmIn{from{opacity:0}}@keyframes fmCloud{from{transform:translateX(-90px)}to{transform:translateX(380px)}}
@keyframes fmBird{0%,100%{transform:translate(0,0)}50%{transform:translate(26px,-8px)}}
@keyframes fmShake{20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}
@keyframes fmPulse{0%{box-shadow:0 0 0 0 rgba(181,69,43,.6)}100%{box-shadow:0 0 0 12px rgba(181,69,43,0)}}
@media (prefers-reduced-motion:reduce){.fm-ov,.fm-cl,.fm-cl2,.fm-bird,.fm-rib.fm-pulse{animation:none}.fm-ring .fm-rg{transition:none}}`;document.head.append(s)}

/* 遠山水墨（程式畫，不用載圖）：night＝夜裡（月亮、深色天空）；照真實時間，晚上 6 點到早上 6 點畫夜景 */
const fmNight=()=>{const h=new Date().getHours();return h>=18||h<FM_WAKE};
function fmHills(night){const sky=night?["#26304d","#4a4f6b"]:["#cfe3ee","#f6efdf"],sun=night?'<circle cx="250" cy="34" r="13" fill="#f3e7c4"/><circle cx="256" cy="30" r="12" fill="#26304d" opacity=".55"/>':'<circle cx="250" cy="38" r="17" fill="#f2b37a" opacity=".85"/>',ink=night?"#0d1222":"#2a1f15";
  return`<svg class="fm-sky" viewBox="0 0 320 150" aria-hidden="true"><defs><linearGradient id="fmSk" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${sky[0]}"/><stop offset="1" stop-color="${sky[1]}"/></linearGradient></defs>
    <rect width="320" height="150" fill="url(#fmSk)"/>${sun}
    <g class="fm-cl" opacity=".75"><ellipse cx="40" cy="30" rx="26" ry="7" fill="#fff"/><ellipse cx="58" cy="26" rx="16" ry="6" fill="#fff"/></g>
    <g class="fm-cl2" opacity=".55"><ellipse cx="160" cy="50" rx="30" ry="6" fill="#fff"/></g>
    <path d="M0 96 C30 70 52 62 78 80 C98 58 120 44 148 70 C170 52 196 40 222 66 C246 50 272 58 296 72 C306 68 314 70 320 74 V150 H0Z" fill="${ink}" opacity=".16"/>
    <path d="M0 110 C24 92 44 88 66 100 C90 80 112 76 136 96 C160 84 182 82 206 100 C232 86 262 90 288 104 C300 100 312 102 320 106 V150 H0Z" fill="${ink}" opacity=".3"/>
    <path d="M0 128 C30 114 58 112 92 122 C130 108 170 110 204 124 C236 114 280 116 320 126 V150 H0Z" fill="${ink}" opacity=".5"/>
    <path class="fm-bird" d="M104 40 q5 -5 10 0 q5 -5 10 0" stroke="${ink}" stroke-width="1.6" fill="none" opacity=".6"/>
    <path class="fm-bird" d="M128 52 q4 -4 8 0 q4 -4 8 0" stroke="${ink}" stroke-width="1.4" fill="none" opacity=".5"/></svg>`}

/* 疊層：id fmOv＝提醒／收尾，fmOv2＝家長確認題、修改設定（蓋在 fmOv 上面） */
function fmOverlay(html,top){fmCss();const id=top?"fmOv2":"fmOv",o=document.getElementById(id);if(o)o.remove();const d=document.createElement("div");d.id=id;d.className="fm-ov keep"+(top?" fm-top":"");d.setAttribute("role","dialog");d.setAttribute("aria-modal","true");d.innerHTML=html;document.body.append(d);return d}
const fmClose=top=>{const o=document.getElementById(top?"fmOv2":"fmOv");if(o)o.remove()};

/* 什麼時候可以跳出來：不在對局、解題中間 */
function fmSafe(){const now=Date.now(),pg=fmP()[0]||"";if(pg==="pvp")return false;
  if(document.body.classList.contains("xqt-on")||document.getElementById("preov"))return false;
  if(FM_E.done&&now-FM_E.done>=2500)return true;
  if(document.querySelector(".modal,#sheet,.sm-dw.open"))return false;
  if(FM_E.pc&&now-FM_E.pc<5000)return true;
  return!fmBusy()}
function fmTick(){if(!FM_ON)return;const now=Date.now();if(document.hidden){FM_E.last=now;return}
  const dt=Math.max(0,Math.min(now-FM_E.last,15e3));FM_E.last=now;if(now-FM_E.act<FM_IDLE){FM_E.acc+=dt;fmSesAdd(dt,now)}fmSaveE();
  if(fmBusy()&&!FM_E.done&&document.querySelector(".modal.res,#cjNext"))FM_E.done=now;
  fmWarn();fmRibbon();fmTry()}
function fmTry(){if(!FM_ON||document.getElementById("fmOv")||document.getElementById("fmOv2"))return;const lk=fmLock(),c=fmCfg(),eye=c.eye&&FM_E.acc>=FM_E.due;
  if(lk){if(fmFree()&&store.get("fmEnd","")===localDay()+lk)return;if(!fmSafe())return;fmEnd(lk,fmFree());return}
  const nt=fmNtDue(),sd=nt?null:fmSesDue();if(!nt&&!sd&&!eye)return;if(!fmSafe())return;
  if(nt){fmNtCard();return}if(sd){fmSesCard(sd);return}fmEye()}
function fmWarn(){const L=fmLeft();if(L==null||L>FM_WARN||L<=0)return;const k=localDay()+"|"+fmCfg().lim+"|"+fmCfg().late+"|"+(fmX().add||0);if(store.get("fmWarn","")===k)return;store.set("fmWarn",k);
  const t=`再 ${Math.max(1,Math.ceil(L))} 分鐘今天的時間就到囉，把這盤下完就休息吧！`;toast("⏳ "+t);fmSay(t)}

/* ---------- 護眼小卡 ---------- */
function fmEye(){const m=Math.round(FM_E.acc/6e4),nm=fmNm(),say="看看遠方的山，休息一下眼睛吧！";fmSay(say);
  const C=2*Math.PI*48,ov=fmOverlay(`<div class="fm-card fm-eye">${fmHills(fmNight())}
    <div class="fm-say"><span class="fm-pc">${esc(fmPc())}</span><div><b>${esc(nm)}</b><p id="fmEyeT">你已經專心玩了 ${m} 分鐘囉。<br>${say}</p></div></div>
    <div class="fm-ring" id="fmRing" hidden><svg viewBox="0 0 112 112"><circle cx="56" cy="56" r="48" fill="none" stroke="var(--line)" stroke-width="8"/><circle class="fm-rg" cx="56" cy="56" r="48" fill="none" stroke-width="8" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="0"/></svg><b id="fmEyeN">${FM_EYE_SEC}</b></div>
    <div class="fm-btns" id="fmEyeB"><button class="btn" id="fmRest">好，我休息一下</button><button class="btn ghost" id="fmSkip">等一下再說</button></div></div>`);
  const T=ov.querySelector("#fmEyeT"),B=ov.querySelector("#fmEyeB");let tm=0;
  ov.querySelector("#fmSkip").onclick=()=>{vibrate(5);FM_E.due=FM_E.acc+FM_EYE_SNOOZE*6e4;fmSaveE();fmClose();toast(`好，${FM_EYE_SNOOZE} 分鐘後再提醒你`)};
  ov.querySelector("#fmRest").onclick=()=>{vibrate(8);FM_E.acc=0;FM_E.due=FM_EYE_MIN*6e4;fmSaveE();const R=ov.querySelector("#fmRing"),N=ov.querySelector("#fmEyeN"),G=ov.querySelector(".fm-rg");R.hidden=false;
    T.innerHTML="把眼睛看向窗外最遠的地方，<br>找一找有沒有山、樹或雲……";B.innerHTML='<button class="btn ghost" id="fmEarly">提早結束</button>';let n=FM_EYE_SEC;
    const step=()=>{if(!ov.isConnected){clearInterval(tm);return}n--;N.textContent=String(Math.max(0,n));G.style.strokeDashoffset=(C*(FM_EYE_SEC-n)/FM_EYE_SEC).toFixed(1);
      if(n===10)T.innerHTML="眨眨眼睛，慢慢地深呼吸……";
      if(n<=0){clearInterval(tm);vibrate([20,40,20]);T.innerHTML="眼睛休息好了 ✨<br>謝謝你照顧自己的眼睛！";B.innerHTML='<button class="btn" id="fmBack">繼續玩</button>';B.querySelector("#fmBack").onclick=()=>fmClose();fmSay("眼睛休息好了，繼續加油！")}};
    tm=setInterval(step,1000);B.querySelector("#fmEarly").onclick=()=>{clearInterval(tm);FM_E.due=FM_E.acc+FM_EYE_SNOOZE*6e4;fmSaveE();fmClose()}}}

/* ---------- 防沉迷：每次遊玩提醒（兒童模式 kid／一般玩家 gen）＋兒童模式晚上提示（只在 fmSafe 的時機跳，不打斷棋局） ---------- */
function fmSesCard(k){const s=fmSesGet(),m=Math.max(1,Math.round(s.acc/6e4)),kid=k==="kid",nm=fmNm(),say=kid?"休息一下吧！站起來走一走、喝口水。":"已經玩很久囉，起來動一動吧！";fmSay(say);
  FM_E.due=Math.max(FM_E.due,FM_E.acc+FM_EYE_SNOOZE*6e4);fmSaveE();
  const ov=fmOverlay(`<div class="fm-card fm-ses">${fmHills(fmNight())}<h2>${kid?"🍵 休息一下吧":`⏰ 已經連續玩 ${m} 分鐘了`}</h2>
    <div class="fm-say"><span class="fm-pc">${esc(fmPc())}</span><div><b>${esc(nm)}</b><p>你已經連續玩了 ${m} 分鐘囉。${say}看看窗外遠的地方，讓眼睛也休息。</p></div></div>
    <div class="fm-btns"><button class="btn" id="fmSesR">好，我去休息</button><button class="btn ghost" id="fmSesL">${kid?`再玩一下（${FM_SES_RE} 分鐘後再提醒）`:"知道了"}</button></div>
    ${kid?`<p class="muted" style="font-size:12.5px;margin:10px 16px 0">👪 家長設定：每玩 ${fmCfg().ses} 分鐘提醒休息一次</p>`:'<button class="fm-par" id="fmSesOff">不用再提醒我（設定裡可以再打開）</button>'}</div>`);
  ov.querySelector("#fmSesR").onclick=()=>{vibrate(8);fmSesDone(k);FM_E.acc=0;FM_E.due=FM_EYE_MIN*6e4;fmSaveE();fmClose();toast("👍 去走一走、喝口水，等一下再回來下棋")};
  ov.querySelector("#fmSesL").onclick=()=>{vibrate(5);fmSesDone(k);fmClose()};
  const off=ov.querySelector("#fmSesOff");if(off)off.onclick=()=>{store.set("fmGenOff",true);fmSesDone(k);fmClose();toast("好，不再提醒；「設定 → 👪 家長與護眼」可以再打開");const sb=document.getElementById("fmSet");if(sb)fmSetFill(sb)}}
function fmNtCard(){fmNtDone();const c=fmCfg(),d=new Date(),hm=String(d.getHours()).padStart(2,"0")+":"+String(d.getMinutes()).padStart(2,"0");fmSay("很晚了，早點休息，明天再一起下棋！");
  const ov=fmOverlay(`<div class="fm-card fm-nt">${fmHills(true)}<h2>🌙 很晚了，早點休息吧</h2><p>現在 ${hm}。睡飽了，明天腦袋更靈光，下棋也更厲害！</p>
    <p class="muted" style="font-size:12.5px">👪 家長設定：${esc(c.night)} 以後提醒早點睡</p><div class="fm-btns"><button class="btn" id="fmNtOk">好，晚安</button><button class="btn ghost" id="fmNtL">再一下下就去睡</button></div></div>`);
  ov.querySelector("#fmNtOk").onclick=()=>{vibrate(8);fmClose();try{if(fmP()[0])goHome()}catch(e){}};ov.querySelector("#fmNtL").onclick=()=>{vibrate(5);fmClose()}}

/* ---------- 時間到：收尾畫面 ---------- */
function fmEnd(lk,free){store.set("fmEnd",localDay()+lk);const c=fmCfg(),used=Math.round(fmUsed()),late=lk==="late",nm=fmNm();
  fmSay(late?"很晚了，該睡覺囉，明天見！":"今天的棋下完了，明天見！");
  const ov=fmOverlay(`<div class="fm-card fm-end">${fmHills(late||fmNight())}
    <h2>${late?"🌙 很晚了，該休息囉":"🍵 今天的棋下完了"}</h2>
    <p>${esc(nm)}：「明天見！${late?"早點睡，明天腦袋更靈光。":"今天辛苦了，明天再一起下棋。"}」</p>
    <p class="muted" style="font-size:13.5px">今天玩了 ${used} 分鐘${late?`・${esc(c.late)} 以後到早上 ${FM_WAKE} 點是休息時間`:`・家長設定每天 ${c.lim} 分鐘`}</p>
    <div class="fm-learn" id="fmLearn"><button class="btn ghost" id="fmLearnB" style="width:100%">📖 今天學了什麼</button></div>
    <div class="fm-btns">${free?'<button class="btn" id="fmOk">好</button>':'<button class="btn" id="fmHome">🏠 回首頁</button>'}<button class="btn ghost" id="fmWk">📊 本週學習週報</button></div>
    <button class="fm-par" id="fmPar">👪 家長：再玩一下</button></div>`);
  ov.querySelector("#fmLearnB").onclick=()=>{vibrate(5);fmLearnFill(ov.querySelector("#fmLearn"))};
  const ok=ov.querySelector("#fmOk"),hm=ov.querySelector("#fmHome");if(ok)ok.onclick=()=>{fmClose();fmRibbon(true)};
  if(hm)hm.onclick=()=>{fmClose();try{goHome()}catch(e){navReplace("#/")}};
  ov.querySelector("#fmWk").onclick=()=>{fmClose();location.hash="#/weekly"};
  ov.querySelector("#fmPar").onclick=()=>fmGate("家長答對這一題，就可以讓孩子再玩一下。",fmMore)}
async function fmLearnFill(box){box.innerHTML='<p class="muted">正在整理今天的紀錄…</p>';let L=[];
  try{const d=new Date();d.setHours(0,0,0,0);const R=await wkData({t0:d.getTime(),t1:Date.now(),ks:[localDay()],noRead:true});
    for(const x of R.lessons||[])L.push(`📜 學會棋話〈${x.t}〉`);
    if(R.cj)L.push(`🧩 解開 ${R.cj} 題殘局${R.cjP?`（${R.cjP} 題完美）`:""}`);
    if(R.kills&&R.kills.length)L.push(`⚔ 練了殺法：${R.kills.slice(0,4).map(x=>x.k+(x.nu?"（新學會）":"")).join("、")}`);
    if(R.g&&R.g.n)L.push(`♟ 下了 ${R.g.n} 盤棋${R.g.w?`，贏了 ${R.g.w} 盤`:""}`);
    for(const x of R.arena||[])L.push(`🏯 打敗擂主「${x.n}」`);
    if(R.battles&&R.battles.length)L.push(`🏹 打下古戰場：${R.battles.slice(0,3).join("、")}`);
    if(R.qz)L.push(`🎯 棋力測驗 ${R.qz} 題，答對 ${R.qzOk} 題`);
    if(R.gs)L.push(`👀 猜大師的著法：猜了 ${R.gsN} 步，猜中 ${R.gsHit} 步`);
    if(R.themes&&R.themes.length)L.push(`🧠 主題訓練：${R.themes.join("、")}`);
    if(R.pm)L.push(`⏱ 專心下棋、做題 ${R.pm} 分鐘`)}catch(e){}
  if(!box.isConnected)return;if(!L.length)L=["🌱 今天輕鬆玩、到處逛逛，明天再一起學新招！"];box.innerHTML=`<b>📖 今天學了什麼</b><ul>${L.map(s=>`<li>${esc(s)}</li>`).join("")}</ul>`}

/* 時間到以後首頁上方的小橫幅 */
function fmRibbon(pulse){const lk=FM_ON&&fmLock(),home=!(fmP()[0]),o=document.getElementById("fmRib");if(!lk||!home){if(o)o.remove();return}
  fmCss();let r=o;if(!r){r=document.createElement("div");r.id="fmRib";r.className="fm-rib";r.setAttribute("role","status");document.body.append(r)}
  const t=lk==="late"?"🌙 休息時間到了，明天見！":"🌙 今天的時間到了，明天見！";if(r.dataset.t!==t){r.dataset.t=t;r.innerHTML=`<b>${t}</b><button id="fmRibL">📖 今天</button><button id="fmRibP">👪 家長</button>`;
    r.querySelector("#fmRibL").onclick=()=>{store.set("fmEnd","");fmEnd(lk,true)};r.querySelector("#fmRibP").onclick=()=>fmGate("家長答對這一題，就可以讓孩子再玩一下。",fmMore)}
  if(pulse){r.classList.remove("fm-pulse");void r.offsetWidth;r.classList.add("fm-pulse")}}
/* 02-shell.js route() 開頭呼叫：時間到了，除了首頁、設定、週報、意見回饋，其他頁都擋下來回首頁 */
function fmRouteGate(){try{if(!FM_ON)return false;const kg=fmKidGate();if(kg){setTimeout(()=>toast("👧 兒童模式：線上大廳、千秋盃、觀戰都關著；同桌對弈照常可以玩"),450);navReplace(kg);return true}
    if(fmFree())return false;const lk=fmLock();if(!lk)return false;
    setTimeout(()=>{toast(lk==="late"?"🌙 休息時間到了，明天再來玩！":"🌙 今天的時間到了，明天再來玩！");fmRibbon(true)},450);navReplace("#/");return true}catch(e){return false}}

/* ---------- 家長確認題（兩位數乘一位數） ---------- */
function fmGate(why,ok){let a=0,b=0,bad=0;const ov=fmOverlay(`<div class="fm-card fm-gate fm-pad"><div style="font-size:40px">👪</div><h2>家長確認</h2><p class="muted" style="font-size:14px">${esc(why||"這一步要請家長來做。")}</p>
    <p class="fm-q" id="fmQ"></p><input class="fm-in" id="fmAns" type="text" inputmode="numeric" pattern="[0-9]*" autocomplete="off" maxlength="4" aria-label="答案"><p class="fm-err" id="fmErr"></p>
    <div class="fm-btns"><button class="btn" id="fmGo">確定</button><button class="btn ghost" id="fmNo">取消</button></div></div>`,true);
  const Q=ov.querySelector("#fmQ"),I=ov.querySelector("#fmAns"),E=ov.querySelector("#fmErr"),nq=()=>{a=12+Math.floor(Math.random()*88);b=3+Math.floor(Math.random()*7);Q.textContent=`${a} × ${b} ＝ ?`;I.value=""};nq();
  const go=()=>{const v=+String(I.value).replace(/[^0-9]/g,"");if(String(I.value).trim()&&v===a*b){fmClose(true);ok();return}bad++;vibrate([30,30,30]);const cd=ov.querySelector(".fm-card");cd.classList.remove("fm-shake");void cd.offsetWidth;cd.classList.add("fm-shake");
    if(bad>=3){fmClose(true);toast("答錯太多次了，請家長來操作");return}E.textContent="答錯了，換一題試試";nq();I.focus()};
  ov.querySelector("#fmGo").onclick=go;ov.querySelector("#fmNo").onclick=()=>fmClose(true);I.addEventListener("keydown",e=>{if(e.key==="Enter")go()});setTimeout(()=>{try{I.focus()}catch(e){}},80)}
/* 加時間：+15／+30 分鐘（每天上限加在 fmX.add；晚上的休息時間放寬到現在＋N 分鐘） */
function fmMore(){const ov=fmOverlay(`<div class="fm-card fm-pad"><div style="font-size:40px">⏳</div><h2>再玩一下</h2><p class="muted" style="font-size:14px">今天已經玩了 ${Math.round(fmUsed())} 分鐘。</p>
    <div class="fm-btns"><button class="btn" data-add="15">再玩 15 分鐘</button><button class="btn" data-add="30">再玩 30 分鐘</button><button class="btn ghost" id="fmNo">先不要</button></div></div>`,true);
  ov.querySelector("#fmNo").onclick=()=>fmClose(true);
  ov.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{const n=+b.dataset.add,c=fmCfg(),x=fmX();
    if(c.lim>0)x.add=Math.max(0,fmUsed()-c.lim)+n;
    if(c.late&&fmLateNow(c))x.lateUntil=Math.max(Date.now(),x.lateUntil||0)+n*6e4;
    store.set("fmX",x);store.set("fmEnd","");fmClose(true);fmClose();fmRibbon();vibrate([15,30,15]);toast(`👪 家長加了 ${n} 分鐘，好好玩！`);const sb=document.getElementById("fmSet");if(sb)fmSetFill(sb)})}

/* ---------- 設定頁「系統」分頁：👪 家長與護眼 ---------- */
function fmSetBody(){const c=fmCfg(),u=Math.round(fmUsed()),L=fmLeft();
  return`<div class="fm-row"><span>👧 兒童模式</span><b>${c.kid?"開（不連線、資料不送出）":"關"}</b></div>
    ${c.kid?`<div class="fm-row"><span>⏰ 每次玩多久提醒休息</span><b>${c.ses} 分鐘</b></div><div class="fm-row"><span>🌙 晚上提醒早點睡</span><b>${c.night?esc(c.night)+" 以後":"不提醒"}</b></div>`
      :`<label class="fm-sw"><span>⏰ 連續玩 ${FM_GEN_MIN} 分鐘提醒休息</span><input type="checkbox" class="sw" id="fmGen"${store.get("fmGenOff",false)?"":" checked"}></label>`}
    <div class="fm-row"><span>👁 護眼提醒</span><b>${c.eye?`開（每玩 ${FM_EYE_MIN} 分鐘，看遠方 ${FM_EYE_SEC} 秒）`:"關"}</b></div>
    <div class="fm-row"><span>⏱ 每天最多玩</span><b>${c.lim?c.lim+" 分鐘":"不限制"}</b></div>
    <div class="fm-row"><span>🌙 幾點以後不能玩</span><b>${c.late?`${esc(c.late)} 到早上 ${FM_WAKE} 點`:"不限制"}</b></div>
    <div class="fm-row"><span>🌐 線上大廳</span><b>${c.kid?"關（兒童模式）":c.net?"開":"關（家長關閉）"}</b></div>
    <div class="fm-row"><span class="muted">今天玩了</span><b>${u} 分鐘${L!=null?(L>0?`・還可以玩 ${Math.floor(L)} 分鐘`:"・今天的時間到了"):""}</b></div>
    <button class="btn fm-kidb" id="fmKidB">${c.kid?"👧 兒童模式設定（家長）":"👧 開啟兒童模式（家長）"}</button>
    <button class="btn ghost" id="fmEdit" style="width:100%;margin-top:8px">🔒 家長修改</button>
    <div class="xqd-g" style="margin-top:8px"><button type="button" class="btn ghost" data-xqdoc="family" style="font-size:13px;padding:8px 6px">👨‍👩‍👧 兒童模式說明</button><button type="button" class="btn ghost" id="fmLbI" style="font-size:13px;padding:8px 6px">🛡 大廳安全須知</button></div>
    <p class="muted" style="font-size:12.5px;line-height:1.7;margin:8px 0 0">時間到了，正在下的那盤可以下完，下完就回首頁休息；明天自動重新算。家長答對確認題，可以再加 15 或 30 分鐘。遊玩時間＝App 畫面開著的時間。</p>`}
function fmSetFill(card){card.innerHTML=fmSetBody();card.querySelector("#fmEdit").onclick=()=>{vibrate(5);fmGate("修改「家長與護眼」設定前，請家長先答一題。",()=>fmEdit(card))};
  card.querySelector("#fmKidB").onclick=()=>{vibrate(5);fmGate(fmKid()?"修改或關閉兒童模式前，請家長先答一題。":"開啟兒童模式前，請家長先答一題。",()=>fmKidEdit(card))};
  const g=card.querySelector("#fmGen");if(g)g.onchange=()=>{vibrate(5);store.set("fmGenOff",!g.checked);toast(g.checked?`⏰ 連續玩 ${FM_GEN_MIN} 分鐘會提醒你休息`:"好，不再提醒連續遊玩時間")};
  const li=card.querySelector("#fmLbI");if(li)li.onclick=()=>{vibrate(5);if(typeof lbsIntro==="function")lbsIntro(true)}}
/* 👧 兒童模式設定（過了 fmGate 才開）：開關、每次玩多久提醒、每天最多玩（跟上面共用 lim）、晚上提醒早點睡 */
function fmKidEdit(card){const c=fmCfg(),N={kid:c.kid?1:0,ses:c.ses,lim:c.lim,night:c.night};
  const opt=(k,L)=>`<div class="opt" data-k="${k}">${L.map(([v,l])=>`<button data-v="${v}"${String(N[k])===String(v)?' class="on"':""}>${l}</button>`).join("")}</div>`;
  const ov=fmOverlay(`<div class="fm-card fm-pad"><div style="font-size:40px">👧</div><h2>兒童模式</h2><div class="fm-ed">
    ${opt("kid",[[1,"開"],[0,"關"]])}
    <ul class="fm-kidl"><li>🔒 資料零收集：匿名資料、玩家登記都不送，手機裡排隊中的也丟掉</li><li>🙅 不跟陌生人互動：線上大廳、千秋盃、觀戰關閉；同桌對弈照常</li><li>🌐 不開外站：問小帥只用 App 裡的內容，不顯示 Google、Gemini、維基百科</li><li>✉ 意見回饋只送文字，不附截圖、聯絡方式</li></ul>
    <div class="sec-t">⏰ 每次玩多久提醒休息</div>${opt("ses",FM_KID_SES.map(v=>[v,v+" 分"]))}
    <p class="muted" style="font-size:12.5px;margin:4px 0 0">時間到了會等這盤下完，才溫和提醒「休息一下吧」，不會打斷棋局。</p>
    <div class="sec-t">⏱ 每天最多玩（可不設）</div>${opt("lim",FM_LIM_OPT.map(v=>[v,v?v+" 分":"不限制"]))}
    <p class="muted" style="font-size:12.5px;margin:4px 0 0">到了以後只能看週報和設定，不能開新局；明天自動重新算。</p>
    <div class="sec-t">🌙 晚上幾點提醒早點睡</div>${opt("night",FM_NT_OPT.map(v=>[v,v||"不提醒"]))}</div>
    <div class="fm-btns"><button class="btn" id="fmSave">存好</button><button class="btn ghost" id="fmNo">取消</button></div></div>`,true);
  ov.querySelectorAll(".opt[data-k]").forEach(g=>g.querySelectorAll("button").forEach(b=>b.onclick=()=>{vibrate(5);const k=g.dataset.k;N[k]=k==="night"?b.dataset.v:+b.dataset.v;g.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b))}));
  ov.querySelector("#fmNo").onclick=()=>fmClose(true);
  ov.querySelector("#fmSave").onclick=()=>{const was=c.kid,on=!!N.kid;store.set("fmCfg",Object.assign({},store.get("fmCfg",null)||{},{kid:on,ses:N.ses,lim:N.lim,night:N.night}));
    let n=0;if(on)n=fmKidPurge();else try{if(window.XQNet&&XQNet.refresh)XQNet.refresh()}catch(e){}fmKidSync();store.set("fmEnd","");store.set("fmWarn","");
    try{if(/^#\/lobby/.test(location.hash)&&typeof route==="function")route()}catch(e){}fmClose(true);if(card&&card.isConnected)fmSetFill(card);fmRibbon();
    toast(on?(was?"✅ 兒童模式設定存好了":`👧 兒童模式開啟了${n?`（丟掉 ${n} 筆排隊中的玩家登記）`:""}`):(was?"兒童模式關閉了":"✅ 存好了"))}}
function fmKidSync(){try{const on=fmKid();if(on)fmCss();document.body.classList.toggle("fm-kid",on)}catch(e){}}
function fmEdit(card){const c=fmCfg();const ov=fmOverlay(`<div class="fm-card fm-pad"><h2>👪 家長與護眼</h2><div class="fm-ed">
    <div class="sec-t">👁 護眼提醒</div><div class="opt" data-k="eye">${[[1,"開"],[0,"關"]].map(([v,l])=>`<button data-v="${v}"${(c.eye?1:0)===v?' class="on"':""}>${l}</button>`).join("")}</div>
    <p class="muted" style="font-size:12.5px;margin:4px 0 0">每玩 ${FM_EYE_MIN} 分鐘，${esc(fmNm())}會在下完一盤或換頁時，提醒看遠方 ${FM_EYE_SEC} 秒。</p>
    <div class="sec-t">⏱ 每天最多玩</div><div class="opt" data-k="lim">${FM_LIM_OPT.map(v=>`<button data-v="${v}"${c.lim===v?' class="on"':""}>${v?v+" 分":"不限制"}</button>`).join("")}</div>
    <div class="sec-t">🌙 幾點以後不能玩</div><div class="opt" data-k="late">${FM_LATE_OPT.map(v=>`<button data-v="${v}"${c.late===v?' class="on"':""}>${v||"不限制"}</button>`).join("")}</div>
    <p class="muted" style="font-size:12.5px;margin:4px 0 0">設了時間，從那時候到早上 ${FM_WAKE} 點都不能玩。</p>
    <div class="sec-t">🌐 線上大廳</div><div class="opt" data-k="net">${[[1,"開"],[0,"關"]].map(([v,l])=>`<button data-v="${v}"${(c.net?1:0)===v?' class="on"':""}>${l}</button>`).join("")}</div>
    <p class="muted" style="font-size:12.5px;margin:4px 0 0">關掉以後，孩子不會出現在線上大廳，也不能跟陌生人下棋、收邀請；挑戰電腦、故事、殘局、棋譜照常可以玩。${c.kid?"<b>兒童模式開著時，線上大廳一律關閉。</b>":""}</p></div>
    <div class="fm-btns"><button class="btn" id="fmSave">存好</button><button class="btn ghost" id="fmNo">取消</button></div></div>`,true);
  const N={eye:c.eye?1:0,lim:c.lim,late:c.late,net:c.net?1:0};
  ov.querySelectorAll(".opt[data-k]").forEach(g=>g.querySelectorAll("button").forEach(b=>b.onclick=()=>{vibrate(5);const k=g.dataset.k;N[k]=k==="late"?b.dataset.v:+b.dataset.v;g.querySelectorAll("button").forEach(x=>x.classList.toggle("on",x===b))}));
  ov.querySelector("#fmNo").onclick=()=>fmClose(true);
  ov.querySelector("#fmSave").onclick=()=>{store.set("fmCfg",Object.assign({},store.get("fmCfg",null)||{},{eye:!!N.eye,lim:N.lim,late:N.late,net:!!N.net}));   /* 合併：兒童模式的 kid／ses／night 留著 */try{if(window.XQNet&&XQNet.refresh)XQNet.refresh();if(/^#\/lobby/.test(location.hash)&&typeof route==="function")route()}catch(e){}store.set("fmEnd","");store.set("fmWarn","");fmClose(true);if(card&&card.isConnected)fmSetFill(card);fmRibbon();toast("✅ 家長設定存好了")}}
function fmSetMount(v){const pane=v.querySelector('[data-pane="more"]');if(!pane||pane.querySelector("#fmSet"))return;fmCss();
  const t=document.createElement("div");t.className="sec-t";t.id="fmSecT";t.textContent="👪 家長與護眼";const card=document.createElement("div");card.className="card";card.id="fmSet";fmSetFill(card);
  const priv=[...pane.querySelectorAll(".sec-t")].find(x=>x.textContent.trim()==="隱私");if(priv)priv.before(t,card);else pane.append(t,card)}
if(typeof Settings==="function"){const f0=Settings;Settings=function(v){const r=f0.apply(this,arguments);try{if(FM_ON)fmSetMount(v)}catch(e){}return r}}

/* ---------- 掛事件 ---------- */
if(FM_ON){
  const act=()=>{FM_E.act=Date.now()};addEventListener("pointerdown",act,{passive:true,capture:true});addEventListener("keydown",act,{passive:true,capture:true});
  document.addEventListener("visibilitychange",()=>{const now=Date.now();if(document.hidden){FM_E.hid=now;fmSaveE();return}
    if(FM_E.hid&&now-FM_E.hid>=FM_EYE_GAP*6e4){FM_E.acc=0;FM_E.due=FM_EYE_MIN*6e4;fmSaveE()}FM_E.hid=0;FM_E.last=now;setTimeout(fmTick,1500)});
  addEventListener("hashchange",()=>{FM_E.done=0;FM_E.pc=Date.now();setTimeout(()=>{fmRibbon();fmTry()},800)});
  addEventListener("xq-result",()=>{FM_E.done=Date.now();setTimeout(fmTry,3000)});
  addEventListener("xq-play",()=>{if(FM_E.done&&Date.now()-FM_E.done>1500)FM_E.done=0});
  setInterval(fmTick,3000);setTimeout(()=>{fmRibbon();fmTry()},4000);
  fmKidSync();setTimeout(()=>{if(fmKid())fmKidPurge()},3500)}   /* 兒童模式：開 App 時再丟一次排隊中的資料（XQNet 連上以後） */

/* ---------- 開發者 11/9（Gemini 第 54 份 iOS 上架評估，全部都做）：要離開 App 去別的網站，先請家長答一題 ----------
   xqExtOpen(u)：萬事通的「Google AI 回答」「問 Gemini」用；頁面上連到別的網站的 <a>（萬事通「看全文」、棋手生平的參考連結）在 click 捕獲階段攔下來改走這裡。
   答對後 10 分鐘內（store fmExtOk）再開外部網站不用再答。下載檔案（a[download]、blob:）和 App 自己的網址不攔 */
const FM_EXT_FREE=10*60e3;
function xqExtOpen(u){if(fmKid()){toast("👧 兒童模式不打開 App 以外的網站；要打開請家長先關掉兒童模式");return}const go=()=>{store.set("fmExtOk",Date.now());const w=window.open(u,"_blank","noopener");if(!w)location.href=u};
  if(Date.now()-(+store.get("fmExtOk",0)||0)<FM_EXT_FREE){go();return}fmGate("要打開 App 以外的網站，請家長先答一題（答對後 10 分鐘內不用再答）。",go)}
document.addEventListener("click",e=>{const a=e.target&&e.target.closest&&e.target.closest("a[href]");if(!a||a.hasAttribute("download"))return;let u;try{u=new URL(a.getAttribute("href"),location.href)}catch(x){return}
  if(!/^https?:$/.test(u.protocol)||u.origin===location.origin)return;e.preventDefault();e.stopPropagation();xqExtOpen(u.href)},true);

/* ---------- 👧 兒童模式：意見回饋只送文字、玩家登記不送（包 05-settings.js 的 postForm；07x4 之後還會再包一層，照樣經過這裡） ---------- */
if(typeof postForm==="function"){const f0=postForm;postForm=async function(rec){if(fmKid()){const r=fmKidRec(rec);if(!r)return;return f0.call(this,r)}return f0.apply(this,arguments)}}
/* ---------- 👧 兒童模式：問小帥只用 App 內的內容（09-askbot.js 的天氣、維基百科不查；時間、計算、背詩照常；Google／Gemini 按鈕由 body.fm-kid 藏起來） ---------- */
const FM_KID_ASK={title:"這題要上網查",text:"兒童模式下，小帥只回答 App 裡有的內容（象棋術語、開局、殺法、棋手、棋譜、App 怎麼用），不會上網查。\n\n可以問我：「馬怎麼走」「屏風馬是什麼」「胡榮華是誰」「背一首詩」「35×12」。"};
if(typeof worldAsk==="function"){const f0=worldAsk;worldAsk=async function(kind,q){if(fmKid()&&kind!=="time"&&kind!=="calc"){if(kind==="poem"){try{const p=worldPoem(q);if(p)return p}catch(e){}}return FM_KID_ASK}return f0.apply(this,arguments)}}
if(typeof chessWiki==="function"){const f0=chessWiki;chessWiki=async function(){if(fmKid())return null;return f0.apply(this,arguments)}}
