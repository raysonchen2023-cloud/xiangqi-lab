/* ================= 🔎 滿版圖「點畫裡的東西看說明」（開發者回饋 818：「對所有繪製的圖可以讓玩家點選物件，然後跳出顯示相關文件說明，就像在環景圖或對戰時點桌子上的物件那樣……不要把物件名稱直接寫上去，會太累亂，玩家點了再顯示」）=================
   圖上平常什麼都不標；點到登記過的東西＝跳出小卡（名稱＋兩三句白話介紹，跟 06-cpu.js 的 parkInfo 同一個 sheet 樣式），07w 的角色照舊走過去、轉身看那個東西。
   點選順序：入口標籤／告示紙等按鈕（07w 先攔、或按鈕自己處理）＞這裡登記的物件＞空地（07w 走路）。只在點到「圖本身」時才判斷，按鈕、連結、角色身上的透明按鈕一律不碰；
     不攔、不 stopPropagation，所以 07w 點空地走路照舊（走到路網上最近的點、轉身看點到的地方）。no：裡的形狀＝入口本身的物件（例如英雄帖），點了當空地，不跳卡。
   座標一律是原圖像素（通常 768×1376），點選位置用圖的 getBoundingClientRect 換算，07x 兩指放大後也對得上。圖網址有 _night 就是夜景，物件可分日夜（dn:"d"／"n"）、夜裡另寫一段（tn）。
   提示：每一頁第一次進來，所有物件的輪廓淡淡閃一次（約 2.6 秒）；整個 App 第一次還會在圖上方出一行「點畫裡的東西，看看它的故事」，之後不再出現。
   接法兩種：①各頁資料寫進 07w6b-scenedata.js 的 SCI_REG（圖網址的正規式＋登記資料），sciAuto 看到那張圖就自動接上，頁面模組不用改（11/9 推到全部頁面用這個）；
     ②頁面模組自己呼叫（今日推薦、特級大師、千秋盃試做時的寫法）。面板（名冊抽屜、換手機、書案）用 sciMount(框, 圖, 資料)；off:P=>布林＝暫時停用（例如名冊湊近看客簿）。
   提示時機：828 之後入口有呼吸光，物件提示排在入口之後；面板收在畫面外時等看得到才閃。
   用法（各頁模組在畫好圖、接好 07w 之後呼叫一次）：sciPage(v,{k:"td",nm:"今日推薦",it:[{n:"名稱",t:"說明",tn:"夜裡的說明",dn:"n",on:P=>布林,s:[形狀,…]}],no:[形狀,…]})
     形狀：多邊形 [[x,y],[x,y],…]（三點以上）或圓 [x,y,r]；nh:1＝第一次進頁閃輪廓時不畫它（整片背景這種大範圍，畫出來像一個大框）；W、H 不寫＝768×1376；物件寫 fe:"tang"＝停在比唐早的朝代時不登記這件（sciEraOk）。開關 SCENE_INFO_ON；樣式在 sciCss */
const SCENE_INFO_ON=true;
function sciCss(){if(document.getElementById("sciCss"))return;const s=document.createElement("style");s.id="sciCss";s.textContent=`
.sci-fx{position:absolute;pointer-events:none;overflow:visible;z-index:3}
.sci-fx .o{fill:rgba(255,236,190,.14);stroke:rgba(255,224,150,.95);stroke-width:2.5px;vector-effect:non-scaling-stroke;filter:drop-shadow(0 0 3px rgba(255,210,120,.9))}
.sci-fx.tap{animation:sciTap .75s ease-out forwards}.sci-fx.hint{animation:sciHint 2.6s ease-in-out forwards}
.sci-fx.hint .o{fill:rgba(255,240,205,.08);stroke-dasharray:7 5;stroke-width:1.8px}
@keyframes sciTap{0%{opacity:0}20%{opacity:1}100%{opacity:0}}@keyframes sciHint{0%{opacity:0}30%{opacity:.75}55%{opacity:.35}75%{opacity:.7}100%{opacity:0}}
.sci-tip{position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:4;pointer-events:none;white-space:nowrap;padding:5px 14px;border-radius:999px;background:rgba(246,239,223,.92);color:#3a2618;border:1px solid rgba(90,64,30,.35);font:700 13px/1.3 var(--serif,serif);box-shadow:0 2px 6px rgba(0,0,0,.2);animation:sciTip 4.2s ease-in-out forwards}
@keyframes sciTip{0%{opacity:0;transform:translate(-50%,-6px)}12%,78%{opacity:1;transform:translate(-50%,0)}100%{opacity:0}}
.sci-sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);clip-path:inset(50%);white-space:nowrap}
@media (prefers-reduced-motion:reduce){.sci-fx.tap,.sci-fx.hint,.sci-tip{animation:none;opacity:.6}}`;document.head.append(s)}
const sciIn=(s,p)=>{if(typeof s[0]==="number")return Math.hypot(p[0]-s[0],p[1]-s[1])<=s[2];let c=false;for(let i=0,j=s.length-1;i<s.length;j=i++){const a=s[i],b=s[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c}return c};
const sciArea=s=>{if(typeof s[0]==="number")return Math.PI*s[2]*s[2];let a=0;for(let i=0,j=s.length-1;i<s.length;j=i++)a+=(s[j][0]+s[i][0])*(s[j][1]-s[i][1]);return Math.abs(a/2)};
const sciNight=I=>/_night/.test(I.currentSrc||I.src||"");
/* 11/9 史學顧問盤查（story/不分朝代頁面_時代錯置盤查_1109.md）的 B 類：物件寫 fe:"tang"＝從唐開始才登記。
   停在比 fe 早的朝代：這件點不到、不算進「還有 N 件沒看過」；沒停靠（雲河）或停在 fe 當朝以後照常。停靠的判斷跟 07z 的 xqHubName 一樣 */
const SCI_ERAS=["qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];
function sciDock(){try{return typeof shipAt==="function"&&typeof shipDockList==="function"&&shipDockList()?shipAt()||"":""}catch(e){return""}}
function sciEraOk(x,at){if(!x||!x.fe)return true;const i=SCI_ERAS.indexOf(at===undefined?sciDock():at),f=SCI_ERAS.indexOf(x.fe);return i<0||f<0||i>=f}
/* 11/9 開發者（停五代點百刻香看到「宋代的《香譜》」）：停在某一朝時，說明不能提到比這一朝更晚的朝代、人物、書、事件。說明（t、tn、名稱）裡的分段語法：
   {{song:…}}＝停在宋或宋以後、或沒停靠時才顯示；{{<song:…}}＝停在宋以前（秦～五代）才顯示，放只講到當朝為止的替代說法。可以巢狀，裡面那層先處理。
   沒停靠、停在船艙（classic）或不認得的朝代：{{朝:…}} 顯示、{{<朝:…}} 不顯示（跟 sciEraOk 一樣，不認得就當沒停靠）。標記裡寫錯的朝代名同樣處理。
   所有顯示說明的地方（sciShow 的卡片標題和內文、讀螢幕用的按鈕）都經過這裡；「還有 N 件沒看過」用的是原始名稱 n，不受影響。
   名稱本身提到後代（明式亮格櫃、徽州茶樓）：另寫 nd＝顯示用的名稱（可用分段語法），n 照舊當「看過了沒」的鍵，玩家已記下的看過紀錄不會跑掉 */
function sciEraText(t,at){t=t==null?"":String(t);if(t.indexOf("{{")<0)return t;const i=SCI_ERAS.indexOf(at===undefined?sciDock():at);let s=t,p;
  do{p=s;s=s.replace(/\{\{(<?)([a-z]+):([^{}]*)\}\}/g,(m,lt,e,x)=>{const f=SCI_ERAS.indexOf(e);return(i<0||f<0?!lt:lt?i<f:i>=f)?x:""})}while(s!==p);return s}
/* 這一頁現在看得到的物件（日夜、條件、fe 朝代門檻） */
const sciLive=(D,P,I)=>{const n=sciNight(I),at=sciDock();return(D.it||[]).filter(x=>sciEraOk(x,at)&&(!x.dn||(x.dn==="n")===n)&&(!x.on||(()=>{try{return!!x.on(P)}catch(e){return false}})()))};
/* 點到哪一件：重疊時取面積最小的那個形狀（香爐在桌上、畫心在掛軸裡） */
function sciHit(D,P,I,p){if((D.no||[]).some(s=>sciIn(s,p)))return null;let best=null,ba=1e12;
  for(const x of sciLive(D,P,I))for(const s of x.s){if(!sciIn(s,p))continue;const a=sciArea(s);if(a<ba){ba=a;best={x,s}}}return best}
/* 疊一張跟圖一樣大的 SVG，把形狀描出來（點到時亮一下、第一次進頁時全部淡淡閃一次） */
function sciDraw(P,I,D,S,cls,ms){const W=D.W||768,H=D.H||1376,ns="http://www.w3.org/2000/svg",g=document.createElementNS(ns,"svg");g.setAttribute("class","sci-fx "+cls);g.setAttribute("aria-hidden","true");
  g.setAttribute("viewBox",`0 0 ${W} ${H}`);g.setAttribute("preserveAspectRatio","none");Object.assign(g.style,{left:I.offsetLeft+"px",top:I.offsetTop+"px",width:I.offsetWidth+"px",height:I.offsetHeight+"px"});
  g.innerHTML=S.map(s=>typeof s[0]==="number"?`<circle class="o" cx="${s[0]}" cy="${s[1]}" r="${s[2]}"/>`:`<polygon class="o" points="${s.map(q=>q.join(",")).join(" ")}"/>`).join("");P.append(g);setTimeout(()=>g.remove(),ms)}
function sciShow(D,x,night,P,I){if(typeof vibrate==="function")vibrate(5);const t=sciEraText(night&&x.tn?x.tn:x.t);
  const sh=sheet("🔎 "+sciEraText(x.nd||x.n),b=>{b.innerHTML=`<div class="muted" style="margin:-4px 0 8px">${esc(D.nm||"")}${D.nm?"・":""}畫裡的東西</div><p style="line-height:1.8;margin:0;font-size:16px">${esc(t)}</p>`});
  try{if(P&&I&&sciMark(D,x))sciAfter(D,P,I,sh)}catch(e){}}
/* 回饋 839（開發者 11/9 從 Gemini 第三次評估選：「讓小帥說『這頁還有 3 件東西沒看過』」）：
   記住每頁看過哪些物件（store.sciLook＝{頁 k:{名稱:1}}，同名的算一件；日夜各自看得到的才算）。
   ①看了一件「新的」，卡片收起來後，小帥在角色頭上說「這頁還有 N 件東西沒看過」，全看完說「這頁的東西都看過了！」；
   ②再次進到看過提示的頁面，還有沒看過的，就說一次「這頁還有 N 件東西沒看過，點點畫裡的東西吧」，每頁一天最多一次。
   話走 07w 的 xq-bot-said 泡泡（只有走路角色的頁面看得到；沒有角色的面板頁就不說、也不算今天說過）；圖上不加任何記號 */
function sciMark(D,x){const L=store.get("sciLook",{})||{},m=L[D.k]||{};if(m[x.n])return false;m[x.n]=1;L[D.k]=m;store.set("sciLook",L);return true}
function sciLeft(D,P,I){const m=(store.get("sciLook",{})||{})[D.k]||{};return[...new Set(sciLive(D,P,I).map(x=>x.n))].filter(n=>!m[n]).length}
let SCI_SAY=["",0];   /* 小帥說完這句的 4 秒內，其他閒聊（bot3d 的隨口一句）先不蓋掉它：在 window 上用捕獲先攔（同一個目標上捕獲的監聽先跑） */
addEventListener("xq-bot-said",e=>{if(Date.now()<SCI_SAY[1]&&String(e.detail||"")!==SCI_SAY[0])e.stopImmediatePropagation()},true);
function sciSay(t){if(!document.body.classList.contains("shw-on"))return false;SCI_SAY=[t,Date.now()+4000];try{window.dispatchEvent(new CustomEvent("xq-bot-said",{detail:t}))}catch(e){return false}return true}
function sciAfter(D,P,I,sh){const t0=Date.now(),w=()=>{if(!P.isConnected)return;const cur=document.getElementById("sheet");if(cur&&cur!==sh)return;if(cur===sh&&!sh.dataset.closing&&Date.now()-t0<600000){setTimeout(w,400);return}
  setTimeout(()=>{if(!P.isConnected||document.getElementById("sheet"))return;const n=sciLeft(D,P,I);sciSay(n?`這頁還有 ${n} 件東西沒看過`:"這頁的東西都看過了！")},500)};setTimeout(w,400)}
function sciNag(P,I,D){const day=new Date().toDateString(),G=store.get("sciNag",{})||{};if(G[D.k]===day)return;const t0=Date.now();
  const w=()=>{if(!P.isConnected||Date.now()-t0>30000)return;if(!sciSeenNow(P,I)||document.getElementById("sheet")||!document.body.classList.contains("shw-on")||P.closest(".shw-brfirst")||Date.now()-t0<3500){setTimeout(w,500);return}
    const n=sciLeft(D,P,I);if(!n)return;if(sciSay(`這頁還有 ${n} 件東西沒看過，點點畫裡的東西吧`)){G[D.k]=day;store.set("sciNag",G)}};
  if(I.complete&&I.naturalWidth)w();else I.addEventListener("load",w,{once:true})}
/* 828 之後入口有「呼吸光」（07w shwBreath）：物件提示排在入口之後。有走路角色的頁先等 07w 掛上 shw-brfirst（07w 的 CSS 再把 .sci-fx.hint 延後 1.8 秒），一行提示也一起延後；
   面板（換手機、書案、名冊抽屜）收在畫面外時先不閃，等真的看得到才閃（不然閃在看不到的地方，還被記成看過了） */
const sciSeenNow=(P,I)=>{if(!P.isConnected||!I.offsetWidth)return false;const r=I.getBoundingClientRect(),vw=innerWidth,vh=innerHeight;if(r.bottom<40||r.top>vh-40||r.right<40||r.left>vw-40)return false;
  const x=Math.min(vw-2,Math.max(2,r.left+r.width/2)),y=Math.min(vh-2,Math.max(2,Math.max(r.top,0)+Math.min(r.height,vh)/2)),el=document.elementFromPoint(x,y);return!!el&&(P.contains(el)||el.contains(P)||!!(P.parentElement&&P.parentElement.contains(el)))};
function sciHint(P,I,D){const seen=store.get("sciSeen",{})||{};if(seen[D.k]){sciNag(P,I,D);return}const t0=Date.now();
  const go=()=>{if(!P.isConnected||!I.offsetWidth)return;const L=sciLive(D,P,I);if(!L.length)return;seen[D.k]=1;store.set("sciSeen",seen);const br=!!P.closest(".shw-brfirst");   /* 回饋 835（開發者 11/9「偶爾會出現金色線條」）：第一次進頁不再描金色虛線輪廓，只留一行文字提示 */
    if(!store.get("sciTip",false)){store.set("sciTip",true);const t=document.createElement("div");t.className="sci-tip";t.setAttribute("aria-hidden","true");t.textContent="點畫裡的東西，看看它的故事";t.style.top=(Math.max(0,-I.getBoundingClientRect().top+P.getBoundingClientRect().top)+I.offsetTop+12)+"px";if(br){t.style.animationDelay="1.8s";t.style.animationFillMode="both"}P.append(t);setTimeout(()=>t.remove(),br?6400:4600)}};
  /* 等：看得到、不在 off 狀態；有走路角色就再等呼吸光開場（最多 6 秒，3D 載不到就不等） */
  const wait=()=>{if(!P.isConnected)return;const dt=Date.now()-t0;if(dt>120000)return;
    if(!sciSeenNow(P,I)||(D.off&&(()=>{try{return D.off(P)}catch(e){return false}})())){setTimeout(wait,500);return}
    if(P.querySelector(".shw")&&!P.closest(".shw-brfirst")&&!P.dataset.sciW){P.dataset.sciW=String(Date.now())}
    if(P.dataset.sciW&&!P.closest(".shw-brfirst")&&Date.now()-+P.dataset.sciW<6000){setTimeout(wait,200);return}go()};
  const later=()=>setTimeout(wait,900);if(I.complete&&I.naturalWidth)later();else I.addEventListener("load",later,{once:true})}
/* P＝圖的框（座標 100% 的那一層，入口和角色都在裡面），I＝圖。滿版頁是 .shp-page.cq＞img；名冊抽屜、換手機、書案面板是各自的框＞img */
function sciMount(P,I,D){if(!SCENE_INFO_ON||!P||!I||!D||!D.it||P.dataset.sci)return;P.dataset.sci="1";sciCss();
  const W=D.W||768,H=D.H||1376;
  const pt=e=>{const r=I.getBoundingClientRect();if(!r.width||!r.height)return null;return[(e.clientX-r.left)/r.width*W,(e.clientY-r.top)/r.height*H]};
  const off=()=>{try{return!!(D.off&&D.off(P))}catch(e){return false}};
  const onImg=t=>!!t&&!!t.closest&&P.contains(t)&&!t.closest("button,a,input,select,textarea,label,[role=button],[tabindex],.v7")&&!P.classList.contains("pc-run")&&!off();
  P._sci={D,I,pt,onImg};
  P.addEventListener("click",e=>{if(e.__sci||e.defaultPrevented||!onImg(e.target))return;const p=pt(e);if(!p||p[0]<0||p[1]<0||p[0]>W||p[1]>H)return;const h=sciHit(D,P,I,p);if(!h)return;
    sciShow(D,h.x,sciNight(I),P,I)});   /* 回饋 833（開發者 11/9）：點物件時不再描金邊框，直接跳說明卡 */
  /* 電腦滑鼠移到物件上換成手指游標（手機沒有游標，不影響） */
  P.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const p=onImg(e.target)?pt(e):null,on=!!(p&&sciHit(D,P,I,p));if(P.dataset.sciCur!==(on?"1":"")){P.dataset.sciCur=on?"1":"";P.style.cursor=on?"pointer":""}});
  /* 讀螢幕的人：一排看不見的按鈕（同名的只列一次），一樣開小卡（只開現在看得到的那一件） */
  const nm=[...new Set((D.it||[]).filter(x=>sciEraOk(x)).map(x=>x.n))],sr=document.createElement("div");sr.className="sci-sr";sr.innerHTML=`<span>畫裡可以點的東西：</span>`+nm.map((n,i)=>`<button type="button" data-i="${i}">${esc(sciEraText(((D.it||[]).find(y=>y.n===n)||{}).nd||n))}</button>`).join("");P.append(sr);
  sr.onclick=e=>{const b=e.target.closest("button");if(!b)return;e.stopPropagation();const n=nm[+b.dataset.i],L=sciLive(D,P,I),x=L.find(y=>y.n===n);if(x)sciShow(D,x,sciNight(I),P,I)};
  sciHint(P,I,D)}
/* 07w 在框上用捕獲攔點選：點到桌面（TB）＝走到桌上、點出口那一塊＝走出去，都會擋掉後面的點選，桌上的東西（茶碾、筆架……）就跳不出卡。
   這裡在 07w 的 shwClick 前面先看一眼（不改 07w，也不擋它）：點到登記的物件就先跳卡（記 e.__sci，框上的處理就不再跳一次），07w 照舊讓角色走過去。
   出口那一塊、角色正在入口前做小動作（再點＝直接開入口）、程式自己按的 click 都不跳卡，讓 07w 先 */
function sciPre(S,e){const P=S&&S.I,Z=P&&P._sci;if(!Z||S.pass||e.__sci||!S.ready)return;const g=S.go;if(g&&!g.free&&g.act>=0)return;if(!Z.onImg(e.target))return;
  const p=Z.pt(e),W=Z.D.W||768,H=Z.D.H||1376;if(!p||p[0]<0||p[1]<0||p[0]>W||p[1]>H)return;
  const X=S.o&&S.o.X;if(X&&X.r&&typeof shwExitOn==="function"&&shwExitOn()){const x=p[0]/W*100,y=p[1]/H*100;if(x>=X.r[0]&&x<=X.r[2]&&y>=X.r[1]&&y<=X.r[3])return}
  const h=sciHit(Z.D,P,Z.I,p);if(!h)return;e.__sci=1;sciShow(Z.D,h.x,sciNight(Z.I),P,Z.I)}
if(typeof shwClick==="function"){const f0=shwClick;shwClick=function(S,e){try{sciPre(S,e)}catch(x){}return f0.apply(this,arguments)}}
function sciPage(v,D){const P=v&&v.querySelector(".shp-page.cq"),I=P&&P.querySelector(":scope>img");sciMount(P,I,D)}
/* 自動接：07w6b-scenedata.js 的 SCI_REG（[{re:圖網址的正規式, img:找圖的選擇器（不寫＝.shp-page.cq>img）, D:登記資料}]）。
   畫面有變動就看一下（最多 0.4 秒一次）：找到網址對得上、框還沒接過的圖就接上。各頁模組不用改（07f、07m、07s2、07s3 這些別人在改的檔也不用碰） */
function sciAuto(){if(!SCENE_INFO_ON||typeof SCI_REG==="undefined")return;for(const R of SCI_REG){for(const I of document.querySelectorAll(R.img||".shp-page.cq>img")){const P=I.parentElement;if(!P||P.dataset.sci)continue;
  const src=I.getAttribute("src")||"";if(!R.re.test(src))continue;try{sciMount(P,I,R.D)}catch(e){}}}}
{let busy=0;const kick=()=>{if(busy)return;busy=1;setTimeout(()=>{busy=0;try{sciAuto()}catch(e){}},400)};
  const init=()=>{try{new MutationObserver(kick).observe(document.body,{childList:true,subtree:true})}catch(e){}addEventListener("hashchange",kick);kick()};
  if(document.readyState==="loading")addEventListener("DOMContentLoaded",init);else init()}
