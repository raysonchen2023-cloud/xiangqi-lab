/* ---------- 掉入地底迷宮的轉場（iMac Claude 1，開發者 11/24「做一個掉入迷宮的轉場」）----------
   從門派大廳點「地底迷宮」進來時（上一頁是 #/jianghu/hall/…），先蓋一層全螢幕的轉場，約 2.4 秒：
     1. 往下掉（0～1.2 秒）：豎井四壁貼該派自己的牆面像素材質（lv.tex.side，最近點放大、沒有就用程式畫的磚紋），由慢到快往上捲；頭頂的洞口光越來越小。
     2. 落地（1.2 秒）：畫面一震、揚起幾顆像素塵土，手機輕震一下。
     3. 標題（1.3～2.2 秒）：「地底・第一層」＋迷宮名稱（lv.title）淡入淡出，然後整層淡出露出迷宮。
   點一下就跳過。系統開「減少動態」時不捲、不震，只淡入淡出標題（約 0.9 秒）。
   重新整理、從別處（例如網址、回上一頁）進迷宮不播；同一次進迷宮只播一次。
   這支包住 JhMaze（不改共用的 07z9m-maze.js）；之後各派都會套到，用的是該派自己的牆面材質。 */
const JH_FALL_MS=2400,JH_FALL_RM_MS=900;
/* 記「上一頁」：不能靠 hashchange 的先後——路由（02-shell）的 hashchange 比這支先登記，JhMaze 被叫的時候這支的 hashchange 還沒跑（iMac Claude 2 #129 預驗抓到）。
   自己記最近兩個網址（last、prev）和第幾次換頁（n）：JhMaze 被叫時，last 已經是目前這頁＝這支先跑過，來源是 prev；還不是＝這支還沒跑，來源就是 last。
   同一次換頁只播一次（JH_FALL_DONE 記播過的是第幾次換頁），重畫同一頁不重播 */
const jhFallH=u=>{const s=String(u==null?"":u),i=s.indexOf("#");return i<0?"":s.slice(i)};
let JH_FALL_LAST=(()=>{try{return jhFallH(location.href)}catch(e){return""}})(),JH_FALL_PREV="",JH_FALL_N=0,JH_FALL_DONE=-1;
if(typeof addEventListener==="function")addEventListener("hashchange",e=>{try{const h=jhFallH(e&&e.newURL!=null?e.newURL:location.href);if(h!==JH_FALL_LAST){JH_FALL_PREV=JH_FALL_LAST;JH_FALL_LAST=h;JH_FALL_N++}}catch(e2){}});
/* 這次進迷宮是從哪一頁來、是第幾次換頁 */
function jhFallVisit(){let cur="";try{cur=jhFallH(location.href)}catch(e){}return JH_FALL_LAST===cur?{from:JH_FALL_PREV,n:JH_FALL_N}:{from:JH_FALL_LAST,n:JH_FALL_N+1}}
/* 從大廳進迷宮才播 */
function jhFallWant(V){return/^#\/jianghu\/hall\//.test(V.from)&&V.n>JH_FALL_DONE}
function jhFallRM(){try{return!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)}catch(e){return false}}
function jhFallCss(){if(document.getElementById("jhFallCss"))return;const s=document.createElement("style");s.id="jhFallCss";s.textContent=`
.jh-fall{position:fixed;inset:0;z-index:2147483000;background:#000;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .4s}
.jh-fall.out{opacity:0}
.jh-fall-shaft{position:absolute;inset:0 6%;background-color:#5a4c3d;background-size:96px 96px;image-rendering:pixelated;
  background-image:var(--jhfall-tex,none),repeating-linear-gradient(0deg,#2a221a 0 6px,transparent 6px 48px),repeating-linear-gradient(90deg,#2a221a 0 6px,transparent 6px 96px);
  animation:jhFallScroll 1.2s cubic-bezier(.55,0,1,.6) forwards}
.jh-fall-shaft::after{content:"";position:absolute;inset:0;background:radial-gradient(ellipse 46% 60% at 50% 46%,rgba(0,0,0,0) 0,rgba(0,0,0,.55) 62%,#000 100%)}
.jh-fall-hole{position:absolute;left:50%;top:9%;width:46vmin;height:22vmin;margin-left:-23vmin;border-radius:50%;
  background:radial-gradient(ellipse at 50% 50%,#f6e2b0 0,#d8a65a 38%,rgba(216,166,90,0) 72%);animation:jhFallHole 1.2s cubic-bezier(.4,0,1,1) forwards}
.jh-fall-dust{position:absolute;left:0;right:0;bottom:22%;height:0}
.jh-fall-dust i{position:absolute;bottom:0;width:7px;height:7px;background:#b49a74;image-rendering:pixelated;opacity:0}
.jh-fall.land .jh-fall-dust i{animation:jhFallDust .7s ease-out forwards}
.jh-fall.land .jh-fall-shaft{animation:jhFallShake .32s steps(4) 1,jhFallDim .5s .2s forwards;background-position:0 -1920px}
.jh-fall.land .jh-fall-hole{animation:none;opacity:0}
.jh-fall-card{position:absolute;left:0;right:0;top:40%;text-align:center;color:#f1e2c0;opacity:0;font-family:var(--serif,serif);text-shadow:0 2px 0 #000,0 0 12px #000;pointer-events:none}
.jh-fall-card small{display:block;font-size:14px;letter-spacing:.4em;color:#c8a56a;margin-bottom:8px}
.jh-fall-card b{display:block;font-size:34px;letter-spacing:.24em;font-weight:900}
.jh-fall.card .jh-fall-card{animation:jhFallCard .95s ease forwards}
.jh-fall-skip{position:absolute;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));font-size:12px;color:#8d7b5f;pointer-events:none}
@keyframes jhFallScroll{from{background-position:0 0}to{background-position:0 -1920px}}
@keyframes jhFallHole{from{transform:scale(1);opacity:1}to{transform:scale(.12);opacity:.35}}
@keyframes jhFallShake{0%{transform:translate(0,10px)}25%{transform:translate(-6px,-4px)}50%{transform:translate(5px,3px)}75%{transform:translate(-2px,-1px)}100%{transform:none}}
@keyframes jhFallDim{to{filter:brightness(.25)}}
@keyframes jhFallDust{0%{opacity:.95;transform:translate(0,0)}100%{opacity:0;transform:translate(var(--dx),var(--dy))}}
@keyframes jhFallCard{0%{opacity:0;transform:translateY(8px)}30%{opacity:1;transform:none}75%{opacity:1}100%{opacity:0}}
.jh-fall.rm .jh-fall-shaft,.jh-fall.rm .jh-fall-hole{display:none}
.jh-fall.rm.card .jh-fall-card{animation:jhFallCardRM .8s ease forwards}
@keyframes jhFallCardRM{0%{opacity:0}35%{opacity:1}70%{opacity:1}100%{opacity:0}}`;document.head.append(s)}
/* 標題卡只要名字：拿掉開頭的圖示（lv.title 常帶「🕳 」） */
const jhFallName=t=>String(t||"").replace(/^[^\p{L}\p{N}]+/u,"");
/* 播一次；回傳轉場的元素（測試用）。到時間、點一下、換頁都會收掉 */
function jhFallPlay(lv,opt){opt=opt||{};jhFallCss();const rm=opt.rm!=null?opt.rm:jhFallRM(),T=lv&&lv.title||["地底迷宮","Underground maze"],tex=lv&&lv.tex&&lv.tex.side;
  const o=document.createElement("div");o.className="jh-fall"+(rm?" rm":"");o.setAttribute("role","presentation");o.setAttribute("aria-hidden","true");
  /* 牆面材質：先用 Image 載（載好才換上，沒到之前是程式畫的磚紋）；同源拿不到（網頁版還沒上 CDN 的檔、沒有 service worker）就改向 CDN 要一次（00-util 的 xqCdnRel） */
  if(tex){const im=new Image();im.onload=()=>{try{o.style.setProperty("--jhfall-tex",`url("${String(im.src).replace(/["\\]/g,"")}")`)}catch(e){}};
    im.onerror=()=>{if(im.dataset.cdn)return;im.dataset.cdn="1";try{const r=typeof xqCdnRel==="function"&&xqCdnRel(tex);if(r&&typeof XQ_CDN==="string")im.src=XQ_CDN+r}catch(e){}};im.src=tex}
  let dust="";for(let i=0;i<10;i++){const a=(i/9-.5)*2,dx=Math.round(a*120+(i%3-1)*14),dy=-Math.round(40+((i*37)%5)*16);dust+=`<i style="left:${Math.round(50+a*14)}%;--dx:${dx}px;--dy:${dy}px;animation-delay:${(i%4)*30}ms"></i>`}
  o.innerHTML=`<div class="jh-fall-shaft"></div><div class="jh-fall-hole"></div><div class="jh-fall-dust">${dust}</div>
    <div class="jh-fall-card"><small>${esc(jhL("地底・第一層","Underground · Level 1"))}</small><b>${esc(jhFallName(jhL(T[0],T[1])))}</b></div><div class="jh-fall-skip">${esc(jhL("點一下跳過","Tap to skip"))}</div>`;
  const tm=[];let done=false;
  const end=()=>{if(done)return;done=true;for(const t of tm)clearTimeout(t);removeEventListener("hashchange",end);o.classList.add("out");setTimeout(()=>{try{o.remove()}catch(e){}},420)};
  o.addEventListener("click",end);addEventListener("hashchange",end);
  /* 一段接一段：每段等上一段真的發生後才起算（Windows Claude 1 #129 Android 預驗：迷宮剛建好時主執行緒忙，三個計時器都從開頭算會擠在一起觸發，標題卡只停 0.25 秒看不到名字）。
     正常：1.2 秒落地 → 0.1 秒後標題卡 → 標題卡停 1.1 秒才淡出；減少動態：標題卡停 0.88 秒 */
  const at=(ms,f)=>{if(done)return;tm.push(setTimeout(()=>{if(!done)f()},ms))};
  if(rm)at(20,()=>{o.classList.add("card");at(JH_FALL_RM_MS-20,end)});
  else at(1200,()=>{o.classList.add("land");try{if(typeof vibrate==="function")vibrate(25)}catch(e){}
    at(100,()=>{o.classList.add("card");at(JH_FALL_MS-1300,end)})})
  document.body.append(o);return o}
/* 包住 JhMaze：從大廳進來才播（播完就清掉來源，同一次不重播） */
try{if(typeof JhMaze==="function"&&!JhMaze.jhFall){const m0=JhMaze;JhMaze=function(v,sid){const r=m0.apply(this,arguments);
  try{const V=jhFallVisit();if(jhFallWant(V)&&(typeof jhMzOn!=="function"||jhMzOn())&&String(location.hash).indexOf("#/jianghu/maze")===0){JH_FALL_DONE=V.n;jhFallPlay(jhMzLv(sid))}}catch(e){}return r};JhMaze.jhFall=1}}catch(e){}
