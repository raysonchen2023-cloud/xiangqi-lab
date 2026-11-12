/* ================= 🎬 純淨畫面・🙈 老闆鍵・⏸ 中斷恢復（評比循環第 12 輪 F4、X10）=================
   F4 純淨畫面（評比 P38.1、P58.3、P69.4；評審「電競賽事導播」「辦公室摸魚員工」）：
     對局頁（gameLayout 畫的：#view 裡有 #bbox、#acts）右上角多一顆 🎬，點了只留棋盤、雙方名字與棋鐘、著法；
     頂欄、底欄、形勢條、狀態列、工具列、規則小字、小帥、泡泡、頭像裡的角色圖、浮在畫面上的裝飾都收起來；園子 3D 改平面棋盤（朝代擂台固定 3D，照舊）。
     右上角半透明小條：「📜 著法」（著法列開／關，store cleanMoves，預設開）、「✕ 還原」；也可以按 Esc。結果視窗、確認框、卡片照常出現。
     設定 store「cleanUI」（預設 false，開著＝之後每一盤都是純淨畫面）；設定頁 id="cleanSw" 的勾選框由這裡接（document 的 change 事件委派），05-settings 只放勾選框。
   X10 老闆鍵（P58.1）：電腦 0.45 秒內連按兩下 Esc、手機三根手指同時點一下 → 整個畫面換成一張普通的試算表（自己畫的，沒有任何真實公司的名稱或商標），
     分頁標題和小圖示也換掉；全部聲音靜音（音量分類匯流排歸零、背景音樂暫停、語音停、頁面上的影音暫停、不震動）；同機限時局的棋鐘暫停；鍵盤快捷鍵不會傳到底下的棋盤。
     再按一次（Esc 兩下、三指點一下，或長按試算表左上角的「A1」名稱方塊 0.8 秒）回到原畫面、原狀態。老闆畫面上單按一下 Esc 不會回去。
     設定 store「bossKey」（預設 true）；設定頁 id="bossSw" 的勾選框一樣由這裡接。
   X10 中斷恢復（P19.3 隨開即玩）：
     ① 切到背景（接電話、切 App、鎖螢幕）、關分頁（pagehide）時，人在對局／解題頁而且那盤沒下完 → 記下 store「fcmBack」{h 網址,k 種類 play/pvp/pg,id,n 步數,at}；
        不在對局頁（或那盤下完了）就清成 null：最後停在哪裡，回來就是哪裡。
     ② 這個分頁第一次打開（sessionStorage 沒有 fcmBoot）、網址是首頁、記號在 6 小時內、那一盤還在而且還沒下完
        → 02-shell route() 一開始（fcmBootGo）就直接換到那一盤，不出開頭畫面、不出續局小卡，提示「↩ 已接回剛才那一盤」。超過 6 小時照舊：開頭畫面「▶ 接著下」、首頁續局小卡（07m4）。
     ③ 同機限時局（#/pvp 選了時制）：切到背景、關分頁、老闆鍵時棋鐘暫停（xiangqi-lab/src/local.js 的 XQ_pvpPause），回到畫面才接著走。
        以前背景時鐘照走，接完電話回來可能已經超時判負。挑戰電腦、殘局沒有棋鐘；線上對局的鐘不能停（對方在等）。
   前綴 fcm（先 grep 過沒撞名）。樣式由這裡注入 <style id="fcmCss">。所有會被 02-shell route() 在這個檔載入前就呼叫到的（fcmBootGo 那一串）只用 function，不用 const／let。
   文件：art/docs/focus-modes.md、resume-state.md 第 10 節。測試：xiangqi-lab/tools/test-focus-modes.js */
/* #FCM-PURE-BEGIN：不碰畫面的純函式 */
function fcmBackMax(){return 6*36e5}
function fcmPlayHash(h){return/^#\/(cpu|arena|journey\/play|redo\/play)$/.test(String(h||""))}
function fcmFlatHash(h){return/^#\/(cpu|arena|pvp|journey\/play|redo\/play)$/.test(String(h||""))}
function fcmHomeHash(h){return/^(#\/?(home)?)?$/.test(String(h||""))}
function fcmJ(get,k){try{const v=get(k);return v==null?null:JSON.parse(v)}catch(e){return null}}
function fcmUnf(G){return!!(G&&typeof G==="object"&&!G.result&&Array.isArray(G.moves)&&G.moves.length>0&&G.id)}
/* 頁面型進度（殘局 cj、關卡 lv、主題訓練 tm、棋力測驗 qz）存在哪個鍵：跟 07m4 RS_PGK 一樣 */
function fcmPgKey(r){return r&&(r.rk||{tm:"jpRun",qz:"quizRun"}[r.t])||""}
/* 那一份還在、還沒做完：跟 07m4 rsPgOk 同一套判斷 */
function fcmPgOk(r,R){if(!r||!R||typeof R!=="object")return false;
  if(r.t==="cj")return R.id===r.id&&Array.isArray(R.path)&&R.path.length>0&&!R.ans;
  if(r.t==="lv")return R.id===r.id&&!R.done&&!!(R.k>0||R.intro||R.si);
  if(r.t==="tm")return R.id===r.id&&Array.isArray(R.ids)&&R.k<R.ids.length;
  if(r.t==="qz")return R.sid===r.id&&Array.isArray(R.a);
  return false}
/* 被打斷的這一刻要記什麼：h＝現在的網址，get＝localStorage.getItem，net＝正在線上對局。沒下到一半的就回 null */
function fcmMarkOf(h,get,now,net){h=String(h||"");
  if(fcmPlayHash(h)){const P=fcmJ(get,"xq_play");return fcmUnf(P)?{h,k:"play",id:P.id,n:P.moves.length,at:now}:null}
  if(h==="#/pvp"){if(net||fcmJ(get,"m_pvpSeat")||fcmJ(get,"xq_pvpOnline"))return null;const V=fcmJ(get,"xq_pvp");return fcmUnf(V)?{h,k:"pvp",id:V.id,n:V.moves.length,at:now}:null}
  const D=fcmJ(get,"m_resumeLast"),r=D&&D.r;
  if(r&&r.t&&r.t!=="play"&&r.h===h&&r.id!=null&&/^#\/\S{1,200}$/.test(h)&&fcmPgOk(r,fcmJ(get,"m_"+fcmPgKey(r))))return{h,k:"pg",t:r.t,id:r.id,n:r.n|0,at:now};
  return null}
/* 開 App 時這個記號還能不能用：6 小時內、那一盤（同一個 id）還在、還沒下完 */
function fcmBackOk(m,get,now){if(!m||typeof m!=="object"||typeof m.h!=="string"||!/^#\/\S{1,200}$/.test(m.h)||!(m.at>0))return false;
  const age=now-m.at;if(age<-60000||age>fcmBackMax())return false;
  if(m.k==="play"){if(!fcmPlayHash(m.h))return false;const P=fcmJ(get,"xq_play"),D=fcmJ(get,"m_resumeLast");return fcmUnf(P)&&P.id===m.id&&!(D&&Array.isArray(D.x)&&D.x.includes(m.id))}
  if(m.k==="pvp"){if(m.h!=="#/pvp"||fcmJ(get,"m_pvpSeat")||fcmJ(get,"xq_pvpOnline"))return false;const V=fcmJ(get,"xq_pvp");return fcmUnf(V)&&V.id===m.id}
  if(m.k==="pg"){const D=fcmJ(get,"m_resumeLast"),r=D&&D.r;return!!(r&&r.t===m.t&&r.h===m.h&&r.id===m.id)&&fcmPgOk(r,fcmJ(get,"m_"+fcmPgKey(r)))}
  return false}
/* 冷啟動要不要直接回那一盤：o＝{first 這個分頁第一次打開, wd 自動化瀏覽器, hash 現在的網址, mark 記號, get, now}；回要去的記號或 null */
function fcmBootPick(o){if(!o||!o.first||o.wd||!fcmHomeHash(o.hash))return null;return fcmBackOk(o.mark,o.get,o.now)?o.mark:null}
/* Esc：S＝{last}；c＝{clean 純淨畫面開著且在對局頁, card 有卡片／視窗, boss 老闆畫面開著, on 老闆鍵可用}。
   回 "boss"＝切換老闆畫面；"wait"＝先等 0.45 秒看有沒有第二下（沒有才還原純淨畫面）；"clean"＝馬上還原純淨畫面；"none"＝不管 */
function fcmEscStep(S,now,c){c=c||{};const d=now-(S.last||0),dbl=S.last>0&&d>=0&&d<=450;
  if(dbl&&c.on){S.last=0;return"boss"}S.last=now;
  if(c.boss)return"none";
  if(c.clean&&!c.card)return c.on?"wait":"clean";
  return"none"}
/* 三指點一下：S 記這一次觸控；ev＝{t:start/move/end/cancel, n 現在還按著幾根, at, x, y}。
   成立＝同時最多正好 3 根、0.6 秒內全部放開、第一根沒移動超過 30px；4 根以上、拖動、按太久、被取消都不算。回 true＝成立 */
function fcmT3Step(S,ev){if(!S||!ev)return false;
  if(ev.t==="start"){if(!S.n0){S.at=ev.at;S.max=0;S.bad=false;S.x=ev.x;S.y=ev.y}S.n0=ev.n;S.max=Math.max(S.max||0,ev.n);if(ev.n>3)S.bad=true;return false}
  if(ev.t==="move"){if(S.n0&&(Math.abs(ev.x-S.x)>30||Math.abs(ev.y-S.y)>30))S.bad=true;return false}
  if(ev.t==="end"||ev.t==="cancel"){S.n0=ev.n;if(ev.n>0){if(ev.t==="cancel")S.bad=true;return false}const ok=ev.t==="end"&&!S.bad&&S.max===3&&ev.at-S.at>=0&&ev.at-S.at<=600;S.max=0;S.at=0;S.bad=false;return ok}
  return false}
/* 老闆畫面的試算表：[項目, 負責人, 預算, 已支出, 備註]（虛構的部門預算，不是任何真實公司） */
function fcmSheetRows(){return[["辦公用品","林組長",48000,31250,"第三季補貨"],["教育訓練","陳專員",120000,86400,"兩梯次已完成"],["國內差旅","王副理",90000,57320,""],
  ["軟體授權","張工程師",156000,156000,"年約已付"],["設備維護","李技術員",64000,28750,"影印機保養"],["印刷費","黃專員",36000,12880,"型錄改版"],["會議餐費","吳秘書",24000,19640,""],
  ["郵資運費","周助理",18000,9315,""],["顧問費","許經理",200000,120000,"期中款"],["廣告宣傳","鄭企劃",150000,98500,"展覽攤位"],["員工活動","蔡專員",80000,15200,"尾牙籌備中"],["雜支","林組長",12000,7425,""]]}
function fcmNum(n){return String(Math.round(+n||0)).replace(/\B(?=(\d{3})+(?!\d))/g,",")}
function fcmBossTitle(){return"第四季部門預算追蹤 - 試算表"}
function fcmBossHTML(){const R=fcmSheetRows(),C=["A","B","C","D","E","F","G","H"],td=(x,cl)=>`<td${cl?` class="${cl}"`:""}>${x}</td>`;
  let b=0,s=0,rows=[`<tr><th>1</th>${td("第四季部門預算追蹤","b")}${td("")}${td("")}${td("")}${td("")}${td("")}${td("單位：元","n")}${td("")}</tr>`,
    `<tr><th>2</th>${["項目","負責人","預算","已支出","剩餘","執行率","備註",""].map(x=>td(x,"h")).join("")}</tr>`];
  R.forEach((r,i)=>{b+=r[2];s+=r[3];rows.push(`<tr><th>${i+3}</th>${td(r[0])}${td(r[1])}${td(fcmNum(r[2]),"n")}${td(fcmNum(r[3]),"n")}${td(fcmNum(r[2]-r[3]),"n")}${td(Math.round(r[3]/r[2]*100)+"%","n")}${td(r[4])}${td("")}</tr>`)});
  rows.push(`<tr><th>${R.length+3}</th>${td("合計","b")}${td("")}${td(fcmNum(b),"n b")}${td(fcmNum(s),"n b")}${td(fcmNum(b-s),"n b")}${td(Math.round(s/b*100)+"%","n b")}${td("")}${td("")}</tr>`);
  for(let i=R.length+4;i<=40;i++)rows.push(`<tr><th>${i}</th>${C.map(()=>td("")).join("")}</tr>`);
  return`<div class="fb-top"><span class="fb-ic" aria-hidden="true"></span><span class="fb-fn">第四季部門預算追蹤</span><span class="fb-sv">已儲存所有變更</span></div>
<div class="fb-menu">${["檔案","編輯","檢視","插入","格式","資料","工具","說明"].map(x=>`<span>${x}</span>`).join("")}</div>
<div class="fb-tool"><span>↶</span><span>↷</span><span class="fb-sep"></span><span>100% ▾</span><span class="fb-sep"></span><span>新細明體 ▾</span><span>10 ▾</span><span class="fb-sep"></span><b>B</b><i>I</i><u>U</u><span class="fb-sep"></span><span>$</span><span>%</span><span>.0</span><span>.00</span></div>
<div class="fb-fx"><span class="fb-nb" id="fcmNb">A1</span><span class="fb-f">fx</span><span class="fb-fv">第四季部門預算追蹤</span></div>
<div class="fb-grid"><table><thead><tr><th></th>${C.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table></div>
<div class="fb-tabs"><span class="fb-add">＋</span><span class="on">預算</span><span>明細</span><span>工作表3</span></div>`}
/* 分頁小圖示：一個普通的灰藍格子（不是任何真實產品的圖示） */
function fcmIcon(){return"data:image/svg+xml,"+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="1" y="1" width="14" height="14" rx="2" fill="#5f6b7a"/><path d="M4 5.5h8M4 8.5h8M4 11.5h8M7 4v9" stroke="#fff" stroke-width="1"/></svg>')}
/* #FCM-PURE-END */

/* ---------- 冷啟動直接回那一盤（02-shell route() 一開始呼叫；這個檔還沒載入時就會被叫到，只能用 function） ---------- */
function fcmLsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function fcmBootGo(){let first=false;try{first=!sessionStorage.getItem("fcmBoot");sessionStorage.setItem("fcmBoot","1")}catch(e){return false}
  if(!first)return false;let wd=false;try{wd=!!navigator.webdriver}catch(e){}
  const m=fcmBootPick({first,wd,hash:location.hash,mark:fcmJ(fcmLsGet,"m_fcmBack"),get:fcmLsGet,now:Date.now()});if(!m)return false;
  try{if(m.k==="play"&&typeof rsAsk==="function")rsAsk(m.id)}catch(e){}   /* 07m4：記成問過了，進對局頁不再跳「要繼續嗎」 */
  try{if(typeof navReplace==="function")navReplace(m.h);else location.replace(m.h)}catch(e){return false}
  const n=Math.ceil((m.n|0)/2);setTimeout(()=>{try{toast(m.k==="pg"?"↩ 已接回剛才那一題":"↩ 已接回剛才那一盤"+(n?"（第 "+n+" 回合）":""))}catch(e){}},900);
  return true}

/* ---------- 狀態 ---------- */
var FCM={boss:false,sv:null,media:[],esc:{last:0},escT:0,t3:{},pz:false,lp:0};
function fcmCleanOn(){try{return!!store.get("cleanUI",false)}catch(e){return false}}
function fcmBossEnabled(){try{return store.get("bossKey",true)!==false}catch(e){return true}}
function fcmBoardPage(){try{const v=document.getElementById("view");return!!(v&&v.querySelector(":scope>#bbox")&&v.querySelector(":scope>#acts"))}catch(e){return false}}

/* ---------- 中斷恢復：被打斷時記下、棋鐘暫停 ---------- */
function fcmMarkNow(){try{let net=false;try{net=!!(window.XQNet&&XQNet.active&&XQNet.active())}catch(e){}store.set("fcmBack",fcmMarkOf(location.hash,fcmLsGet,Date.now(),net))}catch(e){}}
/* 該停（在背景或老闆畫面）就停，回來才走；只解除這裡停的（local.js XQ_pvpPause） */
function fcmClock(){let hid=false;try{hid=!!document.hidden}catch(e){}const want=hid||FCM.boss;
  try{if(typeof XQ_pvpPause!=="function")return;if(want&&!FCM.pz){if(XQ_pvpPause(true))FCM.pz=true}else if(!want&&FCM.pz){FCM.pz=false;XQ_pvpPause(false)}}catch(e){}}

/* ---------- 純淨畫面 ---------- */
function fcmSync(){try{const de=document.documentElement,bp=fcmBoardPage(),on=fcmCleanOn()&&bp;
  de.toggleAttribute("data-fcmclean",on);de.toggleAttribute("data-fcmnomv",on&&store.get("cleanMoves",true)===false);fcmBar(on);fcmBtn(bp)}catch(e){}}
function fcmBtn(show){const tr=document.getElementById("topRight");if(!tr)return;let b=document.getElementById("fcmBtn");if(!show){if(b)b.remove();return}if(b&&b.parentNode===tr)return;
  if(!b){b=document.createElement("button");b.id="fcmBtn";b.type="button";b.className="ib";b.textContent="🎬";b.title="純淨畫面（直播、截圖用）";b.setAttribute("aria-label","純淨畫面：只留棋盤、名字和棋鐘");
    b.onclick=()=>{try{vibrate(5)}catch(e){}fcmClean(true)}}
  tr.append(b)}
function fcmBar(on){let b=document.getElementById("fcmBar");if(!on){if(b)b.remove();return}const mv=store.get("cleanMoves",true)!==false;
  if(!b){b=document.createElement("div");b.id="fcmBar";b.setAttribute("role","toolbar");b.setAttribute("aria-label","純淨畫面");
    b.innerHTML='<button type="button" data-fcm="mv">📜 著法</button><button type="button" data-fcm="x" aria-label="還原一般畫面">✕ 還原</button>';
    b.querySelector('[data-fcm="mv"]').onclick=()=>{store.set("cleanMoves",store.get("cleanMoves",true)===false);fcmSync()};
    b.querySelector('[data-fcm="x"]').onclick=()=>fcmClean(false);document.body.append(b)}
  const m=b.querySelector('[data-fcm="mv"]');if(m){m.setAttribute("aria-pressed",mv?"true":"false");m.title=mv?"收起著法":"顯示著法"}}
/* 開／關：園子 3D 和平面棋盤會因此改變時重畫這一頁（狀態都在 local.js，重畫不影響那一盤） */
function fcmClean(on,src){on=!!on;const was=fcmCleanOn();let p0=null,p1=null;try{if(typeof parkOn==="function")p0=parkOn()}catch(e){}
  store.set("cleanUI",on);fcmSync();try{if(typeof parkOn==="function")p1=parkOn()}catch(e){}
  if(p0!==p1&&fcmBoardPage())try{route()}catch(e){}
  try{if(on!==was||src==="set")toast(src==="set"?(on?"已打開純淨畫面：之後進對局只留棋盤、名字和棋鐘（Esc 或右上角 ✕ 還原）":"已關閉純淨畫面"):on?"🎬 純淨畫面：只留棋盤、名字和棋鐘。右上角 ✕ 或按 Esc 還原":"已還原一般畫面")}catch(e){}}

/* ---------- 老闆鍵 ---------- */
function fcmMute(on){try{if(typeof sxmApply==="function")sxmApply()}catch(e){}
  if(on){FCM.media=[];try{document.querySelectorAll("audio,video").forEach(a=>{if(!a.paused)try{a.pause();FCM.media.push(a)}catch(e){}})}catch(e){}try{if(window.speechSynthesis)speechSynthesis.cancel()}catch(e){}}
  else{for(const a of FCM.media)try{const p=a.play();if(p&&p.catch)p.catch(()=>{})}catch(e){}FCM.media=[]}}
function fcmBossBind(o){const nb=o.querySelector("#fcmNb"),stop=()=>{if(FCM.lp){clearTimeout(FCM.lp);FCM.lp=0}};
  if(nb){nb.addEventListener("pointerdown",()=>{stop();FCM.lp=setTimeout(()=>{FCM.lp=0;fcmBoss(false)},800)});for(const t of["pointerup","pointercancel","pointerleave"])nb.addEventListener(t,stop)}
  o.addEventListener("contextmenu",e=>e.preventDefault())}
function fcmBoss(on){on=!!on;if(on===FCM.boss)return false;FCM.boss=on;const de=document.documentElement;let app=null;try{app=document.querySelector(".app")}catch(e){}
  if(on){const S=FCM.sv={title:document.title,ic:[],tc:null,foc:null,app:null};try{S.foc=document.activeElement}catch(e){}
    try{document.querySelectorAll('link[rel~="icon"]').forEach(l=>{S.ic.push([l,l.getAttribute("href")]);l.setAttribute("href",fcmIcon())})}catch(e){}
    try{const m=document.querySelector('meta[name="theme-color"]');if(m){S.tc=[m,m.getAttribute("content")];m.setAttribute("content","#ffffff")}}catch(e){}
    try{document.title=fcmBossTitle()}catch(e){}
    let o=document.getElementById("fcmBoss");if(!o){o=document.createElement("div");o.id="fcmBoss";o.setAttribute("tabindex","-1");o.innerHTML=fcmBossHTML();document.body.append(o);fcmBossBind(o)}
    de.setAttribute("data-fcmboss","");if(app){S.app=[app.getAttribute("aria-hidden"),app.hasAttribute("inert")];app.setAttribute("inert","");app.setAttribute("aria-hidden","true")}
    try{o.focus()}catch(e){}}
  else{if(FCM.lp){clearTimeout(FCM.lp);FCM.lp=0}const o=document.getElementById("fcmBoss");if(o)o.remove();de.removeAttribute("data-fcmboss");const S=FCM.sv||{};
    if(app&&S.app){if(!S.app[1])app.removeAttribute("inert");if(S.app[0]==null)app.removeAttribute("aria-hidden");else app.setAttribute("aria-hidden",S.app[0])}
    try{if(S.title!=null)document.title=S.title}catch(e){}for(const[l,h]of S.ic||[])try{if(h==null)l.removeAttribute("href");else l.setAttribute("href",h)}catch(e){}
    if(S.tc)try{S.tc[0].setAttribute("content",S.tc[1])}catch(e){}try{if(S.foc&&S.foc.focus&&S.foc.isConnected)S.foc.focus()}catch(e){}FCM.sv=null}
  fcmMute(on);fcmClock();return true}

/* ---------- 鍵盤、觸控、設定頁勾選框 ---------- */
function fcmKey(e){const k=e.key;
  if(FCM.boss&&k!=="Escape"){if(!e.ctrlKey&&!e.metaKey&&!e.altKey)e.preventDefault();e.stopImmediatePropagation();return}   /* 老闆畫面上：快捷鍵（B、方向鍵、Enter…）不能傳到底下的棋盤 */
  if(k!=="Escape"||e.repeat)return;let card=false;try{card=!!document.querySelector("#sheet.show,.modal")}catch(x){}
  const a=fcmEscStep(FCM.esc,Date.now(),{clean:fcmCleanOn()&&fcmBoardPage(),card,boss:FCM.boss,on:fcmBossEnabled()||FCM.boss});
  if(FCM.escT){clearTimeout(FCM.escT);FCM.escT=0}
  if(a==="boss"){e.preventDefault();e.stopImmediatePropagation();fcmBoss(!FCM.boss);return}
  if(FCM.boss){e.preventDefault();e.stopImmediatePropagation();return}
  if(a==="clean"){fcmClean(false);return}
  if(a==="wait"){const t0=FCM.esc.last;FCM.escT=setTimeout(()=>{FCM.escT=0;if(FCM.esc.last===t0&&!FCM.boss)fcmClean(false)},460)}}
function fcmTouch(e){const ty=e.type,t=(e.touches&&e.touches[0])||(e.changedTouches&&e.changedTouches[0]);
  const ev={t:ty==="touchstart"?"start":ty==="touchmove"?"move":ty==="touchend"?"end":"cancel",n:e.touches?e.touches.length:0,at:Date.now(),x:t?t.clientX:0,y:t?t.clientY:0};
  if(fcmT3Step(FCM.t3,ev)&&(fcmBossEnabled()||FCM.boss))fcmBoss(!FCM.boss)}
function fcmSwSync(){try{const c=document.getElementById("cleanSw");if(c)c.checked=fcmCleanOn();const b=document.getElementById("bossSw");if(b)b.checked=fcmBossEnabled()}catch(e){}}
function fcmChange(e){const t=e&&e.target;if(!t)return;
  if(t.id==="cleanSw")fcmClean(!!t.checked,"set");
  else if(t.id==="bossSw"){store.set("bossKey",!!t.checked);try{toast(t.checked?"已打開老闆鍵：電腦連按兩下 Esc、手機三根手指點一下":"已關閉老闆鍵")}catch(x){}}}

/* ---------- 樣式 ---------- */
function fcmCssText(){return`html[data-fcmclean] #topbar,html[data-fcmclean] #tabbar{display:none!important}
html[data-fcmclean] #view>:not(#pTop):not(#bbox):not(#pBot):not(#strip){display:none!important}
html[data-fcmclean][data-fcmnomv] #view>#strip{display:none!important}
html[data-fcmclean] .player .nm span,html[data-fcmclean] .player .av img,html[data-fcmclean] .tmx-bub,html[data-fcmclean] .emo,html[data-fcmclean] .xqbot,html[data-fcmclean] #sndPill{display:none!important}
html[data-fcmclean] body>:not(.app):not(.modal):not(#sheet):not(#scrim):not(#toast):not(#fcmBar):not(#fcmBoss):not(.ax-sr):not([role=dialog]):not([role=alertdialog]):not(#preov):not(#pgate):not(script):not(style){display:none!important}
#fcmBar{position:fixed;z-index:60;top:calc(env(safe-area-inset-top,0px) + 6px);right:calc(env(safe-area-inset-right,0px) + 6px);display:flex;gap:6px;opacity:.3;transition:opacity .2s}
#fcmBar:hover,#fcmBar:focus-within{opacity:1}
#fcmBar button{min-width:44px;min-height:40px;border-radius:20px;border:1px solid var(--line);background:var(--card);color:var(--ink);font:inherit;font-size:13px;padding:0 12px;cursor:pointer}
#fcmBar button[aria-pressed=false]{opacity:.65;text-decoration:line-through}
html[data-fcmboss] body>:not(#fcmBoss){visibility:hidden!important}
#fcmBoss{position:fixed;inset:0;z-index:2147483647;background:#fff;color:#202124;font:13px/1.45 system-ui,-apple-system,"Segoe UI","Microsoft JhengHei","PingFang TC",sans-serif;display:flex;flex-direction:column;overflow:hidden;-webkit-user-select:none;user-select:none;outline:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)}
#fcmBoss .fb-top{display:flex;align-items:center;gap:10px;padding:8px 12px 2px}
#fcmBoss .fb-ic{width:22px;height:26px;border-radius:3px;background:#5f6b7a;box-shadow:inset 0 0 0 4px #5f6b7a,inset 0 -9px 0 4px #fff;flex:none}
#fcmBoss .fb-fn{font-size:17px;color:#202124;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#fcmBoss .fb-sv{font-size:12px;color:#5f6368;white-space:nowrap}
#fcmBoss .fb-menu{display:flex;gap:14px;padding:2px 12px 6px 44px;color:#3c4043;overflow:hidden;white-space:nowrap}
#fcmBoss .fb-tool{display:flex;align-items:center;gap:12px;margin:0 8px;padding:5px 12px;background:#edf2fa;border-radius:20px;color:#444746;overflow:hidden;white-space:nowrap}
#fcmBoss .fb-sep{width:1px;height:18px;background:#c7c7c7}
#fcmBoss .fb-fx{display:flex;align-items:center;gap:0;border-bottom:1px solid #e1e1e1;margin-top:6px}
#fcmBoss .fb-nb{min-width:64px;padding:4px 10px;border-right:1px solid #e1e1e1;color:#202124;cursor:default;touch-action:none}
#fcmBoss .fb-f{padding:4px 10px;color:#80868b;font-style:italic}
#fcmBoss .fb-fv{padding:4px 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#fcmBoss .fb-grid{flex:1;overflow:auto;-webkit-overflow-scrolling:touch}
#fcmBoss table{border-collapse:collapse;table-layout:fixed;min-width:760px}
#fcmBoss th{position:sticky;top:0;background:#f8f9fa;color:#5f6368;font-weight:400;border:1px solid #e1e1e1;height:22px;width:110px}
#fcmBoss tbody th{position:sticky;left:0;width:40px;text-align:center}
#fcmBoss thead th:first-child{width:40px;left:0;z-index:1}
#fcmBoss td{border:1px solid #e9e9e9;height:22px;padding:0 6px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#fcmBoss td.n{text-align:right;font-variant-numeric:tabular-nums}#fcmBoss td.b{font-weight:700}#fcmBoss td.h{background:#f1f3f4;font-weight:700}
#fcmBoss tbody tr:first-child td:first-child{box-shadow:inset 0 0 0 2px #1a73e8}
#fcmBoss .fb-tabs{display:flex;gap:2px;align-items:center;border-top:1px solid #e1e1e1;background:#f8f9fa;padding:4px 8px;color:#444746;white-space:nowrap;overflow:hidden}
#fcmBoss .fb-tabs span{padding:4px 14px;border-radius:6px}#fcmBoss .fb-tabs .on{background:#e1e9f7;color:#0b57d0;font-weight:700}#fcmBoss .fb-add{font-size:16px}`}

/* ---------- 掛上去 ---------- */
(function fcmInit(){try{const s=document.createElement("style");s.id="fcmCss";s.textContent=fcmCssText();document.head.append(s)}catch(e){}
  /* 老闆畫面時：音量分類一律當成「全部靜音」（01-board sxmMix；不改使用者存的設定）、不震動（07hp hapOn）；純淨畫面在對局頁時一律平面棋盤（05-settings focusOn → 06-cpu parkOn） */
  try{if(typeof sxmMix==="function"){const f0=sxmMix;sxmMix=function(){const m=f0.apply(this,arguments);return FCM.boss?Object.assign({},m&&typeof m==="object"?m:{},{all:true}):m}}}catch(e){}
  try{if(typeof hapOn==="function"){const f0=hapOn;hapOn=function(){return!FCM.boss&&f0.apply(this,arguments)}}}catch(e){}
  try{if(typeof focusOn==="function"){const f0=focusOn;focusOn=function(){let h="";try{h=location.hash}catch(e){}return(fcmCleanOn()&&fcmFlatHash(h))||f0.apply(this,arguments)}}}catch(e){}
  document.addEventListener("visibilitychange",()=>{if(document.hidden)fcmMarkNow();fcmClock()});
  addEventListener("pagehide",()=>{fcmMarkNow();fcmClock()});
  addEventListener("keydown",fcmKey,true);
  for(const t of["touchstart","touchmove","touchend","touchcancel"])document.addEventListener(t,fcmTouch,{capture:true,passive:true});
  document.addEventListener("change",fcmChange);
  addEventListener("hashchange",()=>setTimeout(()=>{fcmSync();fcmSwSync()},0));
  try{if(typeof MutationObserver==="function"){let q=0;const kick=()=>{if(q)return;q=1;setTimeout(()=>{q=0;fcmSync();fcmSwSync()},0)};
    const v=document.getElementById("view"),tr=document.getElementById("topRight");if(v)new MutationObserver(kick).observe(v,{childList:true});if(tr)new MutationObserver(kick).observe(tr,{childList:true})}}catch(e){}
  fcmSync();fcmSwSync();
  /* 深連結直接打開對局頁時，這頁比這個檔早畫好：純淨畫面開著、畫的卻是園子 3D，就重畫一次成平面 */
  try{if(fcmCleanOn()&&fcmBoardPage()&&fcmFlatHash(location.hash)&&document.querySelector("#bbox canvas")&&typeof parkOn==="function"&&!parkOn())route()}catch(e){}
  /* 保險：02-shell route() 的掛勾沒叫到（例如這個檔被拆成另一個 script）時，這裡補叫一次；叫過了 sessionStorage 有記號，不會重複 */
  try{fcmBootGo()}catch(e){}})();
