/* ================= 🔁 重新載入防護（開發者 11/13 iPhone 回報 P1，前綴 rlg／RLG_）=================
   狀況：晉級賽 3D 棋盤把電腦絕殺以後，畫面突然跳回開 App 的載入畫面，接著自己回到晉級賽、直接開第二盤（第一盤的勝場有記到）。
   兩條可能原因都處理：
     ①新版自動套用（02-shell.js 的 pending／markDone、沒有跨來源隔離的 xqReload 自動重整）剛好在對局結束那一刻重整；
     ②iPhone 記憶體不夠，WebKit 把頁面回收後自己重新載入（3D 園子、殺棋特效、多執行緒引擎同時在跑）。
   重整會保留網址：網址還是 #/cpu，08b-cpugame.js 一進來看到上一盤已經下完，就照規矩直接開新局＝「直接開始第二盤」。
   這支做的事：
     A. rlgHold()：任何對局結束後 60 秒內、結果視窗（.modal.res）或底部視窗（#sheet.show）開著、殺棋特效播放中（MODAL_HOLD／.kx），
        02-shell.js 都不套用 pending 的新版，也不做跨來源隔離的自動重整（等下次換頁、或過一會兒再試）。
        rlgPrep(原因)：02-shell.js 真的要重整前呼叫——記下原因（xq_rlgWhy），目前網址是對局頁就先換成那個模式的選單頁或首頁（rlgMenu），重載後不會直接開新局。
     C. 記下「最後在哪一頁、對局什麼時候結束、是不是 3D」（localStorage xq_rlgLast；畫面開著時每 5 秒更新一次 a，切到背景記 vh，正常卸載記 ph）。
        重新載入時（rlgBoot，在 11-watch.js 第一次 route() 之前跑）：對局剛結束 90 秒內、而且不是使用者按的（沒有正常卸載、或是 A 的重整），
        就停在那個模式的選單頁或首頁，不自動開新局，跳一行大字「剛才畫面重新載入了，上一盤的結果已經記好」（中英文，07i18n.js 的 rlg.reloaded）。
        勝負本來就在 local.js playApply → playEnd 同步寫進 localStorage（xq_cpuRate／xq_record／xq_play），比 08b 的殺棋特效早；test-reload-guard.js 有測。
     紀錄：最近 10 次「不是使用者按的重新載入」存 localStorage xq_rlgLog（時間、頁面、是否 3D、對局是否剛結束、原因），不送網路；
        開發者模式的設定頁（系統分頁）看得到。原因三種：upd＝新版套用（markDone）、coi＝跨來源隔離重整（xqReload）、other＝其他，可能是系統回收記憶體。
   也提供 window.XQ_fxBusy（殺棋特效播放中），local.js 的賽後分析等特效播完才開始（修正 B）。
   測試：xiangqi-lab/tools/test-reload-guard.js。 */
const RLG_KEY="xq_rlgLast",RLG_WHY="xq_rlgWhy",RLG_LOG="xq_rlgLog",RLG_HOLD=60000,RLG_WIN=90000,RLG_N=10;
const RLG_GAME=/^#\/(cpu|arena|pvp|quiz|watch|journey\/play|redo\/play)(\/|$)|^#\/battle\/[a-z]+\/\d+|^#\/canju\/.+|^#\/theme\/.+/;
const rlgLs=k=>{try{return JSON.parse(localStorage.getItem(k)||"null")}catch(e){return null}};
const rlgPut=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const rlgIsGame=h=>RLG_GAME.test(String(h==null?location.hash:h));
/* 對局頁 → 那個模式的選單頁（沒有選單的回首頁）：挑戰電腦回雅間、石桌往事回冒險、錯棋重練回錯棋列表、線上回大廳、古戰場／殘局／主題訓練回各自的列表 */
function rlgMenu(h){const p=String(h||"").replace(/^#\/?/,"").split("/");
  return{cpu:"#/cpuroom",pvp:"#/lobby",journey:"#/adventure",redo:"#/redo",battle:"#/battle",canju:"#/canju",theme:"#/theme"}[p[0]]||"#/"}
let RLG_END=0,RLG_REC=null,RLG_PLAYT=0;
const rlgEnded=()=>{const L=rlgLs(RLG_KEY);return Math.max(RLG_END,L&&+L.end||0)};
/* 殺棋特效播放中：結果視窗在等（MODAL_HOLD）、水墨絕殺的元素還在；剛走完一步的 0.6 秒內也算（local.js 分出勝負到 08b 畫出特效之間，賽後分析不要搶先開始） */
function rlgFxBusy(){try{if(typeof MODAL_HOLD!=="undefined"&&MODAL_HOLD>Date.now())return true;if(Date.now()-RLG_PLAYT<600)return true;return!!document.querySelector(".kx,.kx-dim")}catch(e){return false}}
function rlgHold(){try{if(Date.now()-rlgEnded()<RLG_HOLD)return true;if(document.querySelector(".modal.res,#sheet.show"))return true;return rlgFxBusy()}catch(e){return false}}
function rlgPrep(why){try{const h=location.hash,now=Date.now();rlgPut(RLG_WHY,{w:why,t:now,h});
  if(rlgIsGame(h)&&(why!=="coi"||now-rlgEnded()<RLG_WIN))history.replaceState(history.state,"",location.pathname+location.search+rlgMenu(h))}catch(e){}}
const rlg3d=()=>{try{return!!document.querySelector(".park3d canvas")}catch(e){return false}};
function rlgSave(o){const L=Object.assign(RLG_REC||rlgLs(RLG_KEY)||{},o);RLG_REC=L;rlgPut(RLG_KEY,L);return L}
/* 這次載入算不算「不是使用者按的重新載入」：L＝上一頁最後的紀錄、W＝02-shell 重整前記的原因、nav＝navigation 種類。回 {why,bg} 或 null（正常打開／使用者按的） */
function rlgClassify(L,W,now,nav){const why=W&&now-(+W.t||0)<120000&&(W.w==="upd"||W.w==="coi")?W.w:null;if(why)return{why,bg:false};
  if(!L||!L.a)return null;if(L.ph&&L.ph>=L.a-1)return null;const hid=!!(L.vh&&L.vh>=L.a-1);
  if(!hid&&now-L.a<30000)return{why:"other",bg:false};
  if(hid&&nav==="reload"&&now-L.vh<6*3600e3)return{why:"other",bg:true};return null}
let RLG_SAY=null;
function rlgBoot(){const now=Date.now(),L=rlgLs(RLG_KEY),W=rlgLs(RLG_WHY);try{localStorage.removeItem(RLG_WHY)}catch(e){}
  let nav="";try{const n=performance.getEntriesByType("navigation")[0];nav=n&&n.type||""}catch(e){}
  const c=rlgClassify(L,W,now,nav),ended=!!(L&&+L.end&&now-L.end<RLG_WIN);
  if(c){const G=rlgLs(RLG_LOG),log=Array.isArray(G)?G:[];log.unshift({at:now,h:String(L&&L.h||(W&&W.h)||location.hash||"#/").slice(0,60),d3:!!(L&&L.d3),je:ended?Math.round((now-L.end)/1000):null,why:c.why,bg:c.bg,nav});rlgPut(RLG_LOG,log.slice(0,RLG_N))}
  if(c&&ended&&rlgIsGame(L.h)){RLG_SAY={why:c.why};if(rlgIsGame(location.hash))try{history.replaceState(history.state,"",location.pathname+location.search+rlgMenu(location.hash))}catch(e){}}
  RLG_REC=null;rlgSave({h:location.hash,a:now,ph:0,vh:0,d3:false,end:L&&+L.end||0});return{c,ended}}
/* 大字提示：等開頭的載入畫面收起來；新版套用那次先讓「✓ 已更新到新版」顯示完 */
function rlgSay(){if(!RLG_SAY)return;const s=RLG_SAY;RLG_SAY=null;let n=0;const go=()=>{if(document.getElementById("preov")&&++n<100)return setTimeout(go,400);
  const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.style.cssText="z-index:312;font-size:19px;font-weight:900;line-height:1.5;max-width:min(92vw,520px);padding:14px 18px";
  t.textContent=typeof i18nT==="function"?i18nT("rlg.reloaded","剛才畫面重新載入了，上一盤的結果已經記好"):"剛才畫面重新載入了，上一盤的結果已經記好";document.body.append(t);setTimeout(()=>t.remove(),6000)};
  setTimeout(go,s.why==="upd"?6200:900)}
try{if(typeof window!=="undefined"&&typeof document!=="undefined"&&typeof localStorage!=="undefined"){rlgBoot();rlgSay();window.XQ_fxBusy=rlgFxBusy;
  addEventListener("hashchange",()=>rlgSave({h:location.hash,a:Date.now(),d3:false}));addEventListener("xq-play",()=>{RLG_PLAYT=Date.now()});
  addEventListener("xq-result",()=>{RLG_END=Date.now();if(rlgIsGame(location.hash))rlgSave({h:location.hash,a:RLG_END,end:RLG_END,d3:rlg3d()})});
  document.addEventListener("visibilitychange",()=>{if(document.hidden)rlgSave({vh:Date.now(),d3:rlg3d()});else rlgSave({a:Date.now(),vh:0,ph:0})});
  addEventListener("pagehide",()=>rlgSave({ph:Date.now()}));addEventListener("pageshow",e=>{if(e.persisted)rlgSave({a:Date.now(),ph:0,vh:0})});
  setInterval(()=>{if(!document.hidden)rlgSave({a:Date.now(),h:location.hash,d3:rlg3d()})},5000)}}catch(e){}
/* 開發者模式：設定頁「系統」分頁最下面看得到最近 10 次 */
const RLG_WN={upd:"新版套用（markDone）",coi:"跨來源隔離重整（xqReload）",other:"其他＝可能是系統回收記憶體"};
const rlgT=t=>{const d=new Date(t),z=x=>String(x).padStart(2,"0");return`${d.getMonth()+1}/${d.getDate()} ${z(d.getHours())}:${z(d.getMinutes())}:${z(d.getSeconds())}`};
function rlgLogHTML(){const G=rlgLs(RLG_LOG),L=Array.isArray(G)?G:[];
  return`<details id="rlgSet" class="card" style="margin-top:10px"><summary><b>🔁 不是使用者按的重新載入（開發者，最近 ${L.length} 次）</b></summary>`+
    (L.length?L.map(x=>`<div style="padding:7px 0;border-top:1px solid var(--line);font-size:13.5px;line-height:1.6"><b>${esc(rlgT(x.at))}</b>・${esc(RLG_WN[x.why]||String(x.why||""))}${x.why==="other"?(x.bg?"（App 在背景時）":"（畫面開著時）"):""}<br>`+
      `<span class="muted">頁面 ${esc(String(x.h||""))}・${x.d3?"3D 棋盤":"平面／非棋盤"}・${x.je!=null?"對局剛結束 "+x.je+" 秒":"不是剛下完"}${x.nav?"・"+esc(x.nav):""}</span></div>`).join("")
      :'<p class="muted" style="font-size:13.5px">還沒有紀錄。只存在這支手機，不會送出去。</p>')+`</details>`}
function rlgSetMount(v){try{if(!(typeof DEVMODE==="function"&&DEVMODE()))return;const pane=v.querySelector('[data-pane="more"]');if(!pane||pane.querySelector("#rlgSet"))return;pane.insertAdjacentHTML("beforeend",rlgLogHTML())}catch(e){}}
if(typeof Settings==="function"){const f0=Settings;Settings=function(v){const r=f0.apply(this,arguments);try{rlgSetMount(v)}catch(e){}return r}}
