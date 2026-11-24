/* ---------- W104 十州棋館的晚明轉場（Windows Claude 1）----------
   開發者 11/24：ChatGPT 場景盤點 K「星槎停在秦朝，進十州棋館卻是明朝風格」→ 選「十州棋館晚明轉場」，並要 Gemini 做轉場「要讓玩家覺得搭著星槎跑到了晚明的歷史感」；
   同日補充「如果去在明朝就不需要，只要簡單轉場即可」。
   十州棋館固定晚明萬曆年間的江淮（設計如此，不改）。玩家從別的朝代（或經典世界）走進來時先播一段：
     - 背景：Gemini 畫的「星槎從星河駛入晚明江淮」（data/jhgate/ming.webp），畫面慢慢推近；
     - 上方星空由程式畫一張逐線亮起的星線象棋盤（9 直 10 橫、河界斷開、兩個九宮斜線）——圖本身不畫格線，格數由程式保證（Gemini 兩次都畫錯格數）；
     - 大字旁白：第一次「星槎泊入晚明江淮」，之後「十州棋局再開」；接著大字標題「萬曆江淮・十州棋館」；約 3.4 秒淡出。不加說明小字（只有角落「點一下跳過」）。
   點一下跳過；系統開「減少動態」只淡入標題（約 1.1 秒）。
   不播：停靠明朝（簡單淡入就好）、從十州棋館自己的頁（門內頁、地底迷宮、門派修行）回來、重新整理或直接開網址、轉場圖 1.2 秒內載不到。
   地圖頂欄改成「萬曆江淮・十州棋館」。這支包住 Jianghu（不改 07z9b-jianghu.js），要排在它後面、07z9m-maze.js 前面。 */
const JH_GATE_IMG="data/jhgate/ming.webp",JH_GATE_MS=3400,JH_GATE_RM_MS=1100,JH_GATE_LOAD_MS=1200;
/* 記「上一頁」：跟 07z9m-fall.js 同一個做法——路由的 hashchange 比這支先登記，Jianghu 被叫的時候這支的 hashchange 可能還沒跑。
   自己記最近兩個網址（last、prev）和第幾次換頁（n）：last 已經是目前這頁＝這支先跑過，來源是 prev；還不是＝來源就是 last。同一次換頁只播一次 */
const jhgH=u=>{const s=String(u==null?"":u),i=s.indexOf("#");return i<0?"":s.slice(i)};
let JHG_LAST=(()=>{try{return jhgH(location.href)}catch(e){return""}})(),JHG_PREV="",JHG_N=0,JHG_DONE=-1;
if(typeof addEventListener==="function")addEventListener("hashchange",e=>{try{const h=jhgH(e&&e.newURL!=null?e.newURL:location.href);if(h!==JHG_LAST){JHG_PREV=JHG_LAST;JHG_LAST=h;JHG_N++}}catch(e2){}});
function jhgVisit(){let cur="";try{cur=jhgH(location.href)}catch(e){}return JHG_LAST===cur?{from:JHG_PREV,n:JHG_N}:{from:JHG_LAST,n:JHG_N+1}}
/* 要不要播：不是明朝；有上一頁（重新整理、直接開網址沒有）；上一頁不是十州棋館自己的頁；這次換頁還沒播過 */
function jhgWant(V,era){if(!V||!(V.n>JHG_DONE))return false;if(String(era||"classic")==="ming")return false;const f=String(V.from||"");if(!f)return false;return!/^#\/(jianghu|school)(\/|\?|$)/.test(f)}
function jhgText(first){return{say:jhL(first?"星槎泊入晚明江淮":"十州棋局再開",first?"The star raft drifts into the late Ming":"Back to the Ten Prefectures"),title:jhL("萬曆江淮・十州棋館","Ten Prefectures · Wanli Era")}}
/* 星線象棋盤：格距 10，寬 80（9 條直線）、高 90（10 條橫線）。中間的直線在河界（第 5、6 條橫線之間）斷開，兩邊的直線不斷；兩個九宮各兩條斜線。共 30 條線，逐條亮起 */
function jhgBoardLines(){const L=[];for(let c=0;c<9;c++){const x=c*10;if(c===0||c===8)L.push([x,0,x,90]);else{L.push([x,0,x,40]);L.push([x,50,x,90])}}
  for(let r=0;r<10;r++)L.push([0,r*10,80,r*10]);
  L.push([30,0,50,20],[50,0,30,20],[30,70,50,90],[50,70,30,90]);return L}
function jhgBoardSvg(){const L=jhgBoardLines();return`<svg class="jhg-board" viewBox="-2 -2 84 94" aria-hidden="true">${L.map((l,i)=>`<line x1="${l[0]}" y1="${l[1]}" x2="${l[2]}" y2="${l[3]}" pathLength="1" style="animation-delay:${Math.round(150+i*38)}ms"></line>`).join("")}</svg>`}
function jhgCss(){if(document.getElementById("jhgCss"))return;const s=document.createElement("style");s.id="jhgCss";s.textContent=`
.jhg{position:fixed;inset:0;z-index:2147483001;background:#0b1430;overflow:hidden;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:opacity .45s}
.jhg.out{opacity:0}
.jhg-bg{position:absolute;inset:0;background:center top/cover no-repeat;transform:scale(1.1) translateY(-3%);animation:jhgPush ${JH_GATE_MS}ms cubic-bezier(.3,0,.4,1) forwards}
@keyframes jhgPush{to{transform:none}}
.jhg-board{position:absolute;left:16%;width:68%;top:3%;transform:perspective(620px) rotateX(56deg);transform-origin:50% 0;filter:drop-shadow(0 0 2px rgba(255,226,150,.9));opacity:.85}
.jhg-board line{stroke:#f6dd96;stroke-width:.34;stroke-linecap:round;stroke-dasharray:1;stroke-dashoffset:1;animation:jhgLine .45s ease-out forwards}
@keyframes jhgLine{to{stroke-dashoffset:0}}
.jhg-say,.jhg-title{position:absolute;left:0;right:0;text-align:center;color:#fff6dc;font-family:var(--serif,serif);font-weight:900;text-shadow:0 2px 10px #000,0 0 22px rgba(0,0,0,.85);opacity:0;pointer-events:none;padding:0 16px}
.jhg-say{top:41%;font-size:24px;letter-spacing:.16em;animation:jhgSay 1.6s .35s ease forwards}
.jhg-title{top:60%;font-size:30px;letter-spacing:.14em;animation:jhgTitle 1.3s 1.8s ease forwards}
@keyframes jhgSay{0%{opacity:0;transform:translateY(8px)}25%,78%{opacity:1;transform:none}100%{opacity:0}}
@keyframes jhgTitle{0%{opacity:0;transform:translateY(8px)}35%,100%{opacity:1;transform:none}}
.jhg-skip{position:absolute;right:14px;bottom:calc(14px + env(safe-area-inset-bottom,0px));font-size:12px;color:#e8d9b4;opacity:.7;pointer-events:none}
.jhg.rm .jhg-bg{animation:none;transform:none}.jhg.rm .jhg-board,.jhg.rm .jhg-say{display:none}
.jhg.rm .jhg-title{animation:jhgTitleRM .8s ease forwards}@keyframes jhgTitleRM{to{opacity:1}}`;document.head.append(s)}
function jhgRM(){try{return!!(window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches)}catch(e){return false}}
/* 播一次；回傳轉場的元素（測試用）。到時間、點一下、換頁都會收掉 */
function jhgPlay(src,first,opt){opt=opt||{};jhgCss();const rm=opt.rm!=null?opt.rm:jhgRM(),T=jhgText(first);
  const o=document.createElement("div");o.className="jhg"+(rm?" rm":"");o.setAttribute("role","presentation");o.setAttribute("aria-hidden","true");
  o.innerHTML=`<div class="jhg-bg"></div>${jhgBoardSvg()}<div class="jhg-say"></div><div class="jhg-title"></div><div class="jhg-skip"></div>`;
  o.querySelector(".jhg-bg").style.backgroundImage=`url("${String(src).replace(/["\\]/g,"")}")`;
  o.querySelector(".jhg-say").textContent=T.say;o.querySelector(".jhg-title").textContent=T.title;o.querySelector(".jhg-skip").textContent=jhL("點一下跳過","Tap to skip");
  let done=false,tm=0;const end=()=>{if(done)return;done=true;clearTimeout(tm);removeEventListener("hashchange",end);o.classList.add("out");setTimeout(()=>{try{o.remove()}catch(e){}},480)};
  o.addEventListener("click",end);addEventListener("hashchange",end);tm=setTimeout(end,rm?JH_GATE_RM_MS:JH_GATE_MS);
  document.body.append(o);return o}
/* 載轉場圖：1.2 秒內載不到就不播（照舊用簡單淡入）。同源拿不到（網頁版還沒上 CDN 的檔）就改向 CDN 要一次（00-util 的 xqCdnRel） */
function jhgLoad(cb){let over=false,cdn=false;const im=new Image(),t=setTimeout(()=>{over=true},JH_GATE_LOAD_MS);
  im.onload=()=>{if(over)return;clearTimeout(t);over=true;cb(im.src)};
  im.onerror=()=>{if(over||cdn)return;cdn=true;try{const r=typeof xqCdnRel==="function"&&xqCdnRel(JH_GATE_IMG);if(r&&typeof XQ_CDN==="string"){im.src=XQ_CDN+r;return}}catch(e){}clearTimeout(t);over=true};
  im.src=JH_GATE_IMG}
/* 包住 Jianghu：頂欄換成萬曆江淮；照上面的條件決定要不要播 */
try{if(typeof Jianghu==="function"&&!Jianghu.jhGate){const j0=Jianghu;Jianghu=function(v){const r=j0.apply(this,arguments);
  try{if(/^#\/jianghu\/?$/.test(String(location.hash).split("?")[0])&&typeof setTop==="function")setTop(jhL("🗺 萬曆江淮・十州棋館","🗺 Ten Prefectures · Wanli Era"),"#/")}catch(e){}
  try{const V=jhgVisit();let era="classic";try{era=store.get("era","classic")}catch(e){}
    if(jhgWant(V,era)&&/^#\/jianghu\/?$/.test(String(location.hash).split("?")[0])){JHG_DONE=V.n;const here=location.hash;
      jhgLoad(src=>{if(location.hash!==here)return;let first=true;try{first=!store.get("jhGateSeen",0);store.set("jhGateSeen",Date.now())}catch(e){}jhgPlay(src,first)})}}catch(e){}
  return r};Jianghu.jhGate=1}}catch(e){}
