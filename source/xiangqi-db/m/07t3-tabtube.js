/* ================= 🎋 側邊竹籤筒（開發者 11/9 選定導覽做法 A：「把底下的首頁／線上／棋譜／設定整進繪製的圖裡，又要能快速切換、不迷路」）=================
   底部導覽列（#tabbar，07t2 的水墨木牌）整條不再出現，每頁的圖真正滿版到底；07w 的 xqBars 看不到底欄就用 safe-area-bottom 當底欄高度，面板、出口、桌面跳躍跟著對齊。
   畫面右下角固定一個小水墨籤筒（art/tabtube/tube.webp → data/tabtube/），在 safe-area 裡、永遠同一個位置；只有在它會蓋到圖上入口標籤或出口時才往上讓（每頁自動算，盡量不動）。
   點籤筒：從筒口彈出四支竹籤（slip.webp，橫向拉寬成竹片，字由程式直寫：首頁、線上、棋譜、設定，頂上掛 07t2 的小圖示），目前所在那一支蓋一方朱印「在」；
     點籤＝切過去並收起；點外面、再點籤筒、按返回都收起；從畫面右邊緣往內滑也能打開。
   顯示規則照舊跟 setTabs(show,on)：原本藏底欄的地方（對局、讀小說、全螢幕過場…）籤筒也藏；原本底欄按鈕上若有紅點／數字（.dot／.badge／[data-badge]），畫在對應竹籤上。
   第一次看到：籤筒輕輕晃兩下＋一句「點籤筒換地方」（只出一次，store 的 ttSeen）。深色主題籤筒加一圈淡光；prefers-reduced-motion 不晃、不彈。
   籤筒放在 .app 裡、疊在畫面上（z 940），面板（948～）、小卡、對話框都蓋在它上面。開關 TABTUBE_ON（false＝照舊底部導覽列）；前綴 tt */
/* 11/9 改版（Gemini 第 48 案方案一，開發者選定「雲霧手卷底欄」，玩家反映籤筒難找）：TT_MODE="mist"＝底部常駐四個入口（首頁、線上、棋譜、設定，一次點到），
   背後一層由下往上淡掉的水墨雲霧（羽化邊，不是硬色塊）；用的就是原本的 #tabbar 按鈕（07t2 的水墨小物件圖示、setTabs、紅點都照舊），只是改成浮在畫面上；
   目前所在的入口：字變朱紅、外圈一道淡泥金描邊；每格至少 44×44；字和圖示外圍一圈淡宣紙光暈（深色主題換成墨色光暈），白天夜景都看得清楚。
   底欄用 position:absolute 貼在 .app 底（.app 本身是 fixed），offsetParent 照舊有值，xqBars、07f 星槎圖量底欄的寫法都不用改。
   滿版圖畫到雲霧底下（雲霧上緣羽化蓋在圖上），但 #view 底下留出底欄那一段（--ttH），圖上的入口標籤、出口、小人不會被底欄擋住；xqBars 量到的底欄高度＝雲霧下面那排入口。
   原本藏底欄的頁（對局、讀小說、渡口、驛站…）照舊藏，那些頁頂欄有返回和 🏠。TT_MODE="tube"＝回到右下角竹籤筒（圖 art/tabtube/ 先留著）。 */
const TABTUBE_ON=true;
const TT_MODE="mist";
const TT_IMGV="2401";
const TT_GO=[["#/","首頁","tab_home"],["#/lobby","線上","tab_lobby"],["#/db","棋譜","tab_db"],["#/settings","設定","tab_set"]];
let TT_SHOW=false,TT_AT="",TT_UN=null;
function ttCss(){if(document.getElementById("ttCss"))return;const s=document.createElement("style");s.id="ttCss";s.textContent=`
#tabbar.tt-gone{display:none!important}
.tabbar.tt-mist{--ttm:244,237,220;position:absolute;left:0;right:0;bottom:0;z-index:30;display:flex;gap:2px;border:0!important;box-shadow:none!important;background:none!important;background-color:transparent!important;
  padding:2px 8px calc(4px + var(--safeB,0px));overflow:visible;transform:none}
.tabbar.tt-mist.tb-dark,.tabbar.tt-mist.tt-night{--ttm:24,22,30}
.tabbar.tt-mist::before{content:"";position:absolute;left:0;right:0;bottom:0;top:-26px;z-index:-1;pointer-events:none;
  background:radial-gradient(40% 58% at 12% 100%,rgba(var(--ttm),.55),rgba(var(--ttm),0) 72%),radial-gradient(44% 64% at 50% 104%,rgba(var(--ttm),.5),rgba(var(--ttm),0) 74%),
    radial-gradient(38% 60% at 88% 100%,rgba(var(--ttm),.55),rgba(var(--ttm),0) 72%),linear-gradient(to top,rgba(var(--ttm),.95) 0,rgba(var(--ttm),.9) calc(100% - 30px),rgba(var(--ttm),.42) calc(100% - 13px),rgba(var(--ttm),0) 100%)}
.tabbar.tb-ink.tt-mist button{flex:1;min-height:56px;min-width:44px;gap:1px;padding:3px 0 2px;margin:0;border:0;border-radius:14px;background:none;box-shadow:none;color:#3a2a1c;
  font:800 12.5px/1.2 var(--serif,serif);letter-spacing:.14em;text-shadow:0 0 2px rgba(var(--ttm),1),0 0 5px rgba(var(--ttm),.95),0 0 9px rgba(var(--ttm),.8);transition:box-shadow .2s,color .2s}
.tabbar.tb-ink.tt-mist button .ic{width:32px;height:32px}
.tabbar.tb-ink.tt-mist button .ic img{filter:drop-shadow(0 0 2px rgba(var(--ttm),.95)) drop-shadow(0 0 4px rgba(var(--ttm),.8)) saturate(.8)}
.tabbar.tb-ink.tt-mist button.on{color:#b0301c;background:radial-gradient(70% 80% at 50% 45%,rgba(255,246,222,.55),rgba(255,246,222,0) 78%);box-shadow:inset 0 0 0 1.5px rgba(190,150,72,.75),0 0 8px rgba(214,176,92,.4)}
.tabbar.tb-ink.tt-mist button.on .ic img{filter:drop-shadow(0 0 2px rgba(255,236,190,.95)) drop-shadow(0 0 5px rgba(214,176,92,.7))}
.tabbar.tb-ink.tt-mist.tt-night button,.tabbar.tb-ink.tt-mist.tb-dark button{color:#f1e4c6;text-shadow:0 0 2px rgba(var(--ttm),1),0 0 5px rgba(var(--ttm),.95),0 0 9px rgba(var(--ttm),.8)}
.tabbar.tb-ink.tt-mist.tt-night button.on,.tabbar.tb-ink.tt-mist.tb-dark button.on{color:#ff8f6e;background:radial-gradient(70% 80% at 50% 45%,rgba(214,176,92,.18),rgba(214,176,92,0) 78%);box-shadow:inset 0 0 0 1.5px rgba(214,176,92,.7),0 0 8px rgba(214,176,92,.35)}
.tabbar.tt-mist button:focus-visible{outline:2px solid #b0301c;outline-offset:-3px}
/* 回饋 836（雪景底欄加深）：雪景（積雪版 *snow*、或正在下雪）＝雲霧換成淡墨灰、加高一點，字換淺色加墨色光暈；夜景、深色主題照舊用墨色雲霧 */
.tabbar.tt-mist.tt-bright:not(.tt-night):not(.tb-dark){--ttm:92,86,80}
.tabbar.tt-mist.tt-bright:not(.tt-night):not(.tb-dark)::before{top:-40px;background:radial-gradient(40% 58% at 12% 100%,rgba(var(--ttm),.6),rgba(var(--ttm),0) 72%),radial-gradient(44% 64% at 50% 104%,rgba(var(--ttm),.55),rgba(var(--ttm),0) 74%),
    radial-gradient(38% 60% at 88% 100%,rgba(var(--ttm),.6),rgba(var(--ttm),0) 72%),linear-gradient(to top,rgba(var(--ttm),.93) 0,rgba(var(--ttm),.86) calc(100% - 44px),rgba(var(--ttm),.4) calc(100% - 20px),rgba(var(--ttm),0) 100%)}
.tabbar.tb-ink.tt-mist.tt-bright:not(.tt-night):not(.tb-dark) button{color:#fbf1da;text-shadow:0 0 2px rgba(40,34,30,1),0 0 5px rgba(40,34,30,.9),0 0 9px rgba(40,34,30,.7)}
.tabbar.tb-ink.tt-mist.tt-bright:not(.tt-night):not(.tb-dark) button.on{color:#ffb08f;background:radial-gradient(70% 80% at 50% 45%,rgba(214,176,92,.22),rgba(214,176,92,0) 78%);box-shadow:inset 0 0 0 1.5px rgba(224,188,104,.85),0 0 8px rgba(214,176,92,.35)}
.tabbar.tb-ink.tt-mist.tt-bright:not(.tt-night):not(.tb-dark) button .ic img{filter:drop-shadow(0 0 2px rgba(255,246,226,.7)) drop-shadow(0 0 4px rgba(255,246,226,.4))}
body.tt-on.tt-mode-mist #view{padding-bottom:var(--ttH,0px)}
#view.tt-fillx{overflow-x:hidden}
.tt-tube{position:fixed;right:calc(6px + env(safe-area-inset-right,0px));bottom:calc(8px + var(--safeB,0px) + var(--ttUp,0px));z-index:940;width:46px;height:100px;border:0;padding:0;margin:0;
  background:url("data/tabtube/tube.webp?v=${TT_IMGV}") center bottom/contain no-repeat;cursor:pointer;-webkit-tap-highlight-color:transparent;transform-origin:50% 92%;
  filter:drop-shadow(0 2px 3px rgba(40,26,14,.35));transition:bottom .25s ease,transform .15s}
.tt-tube[hidden]{display:none}.tt-tube:active{transform:scale(.94)}
.tt-dk .tt-tube{filter:drop-shadow(0 0 5px rgba(255,222,170,.35)) drop-shadow(0 2px 3px rgba(0,0,0,.55))}
.tt-tube.wig{animation:ttWig 1s ease-in-out 2}
@keyframes ttWig{0%,100%{transform:rotate(0)}20%{transform:rotate(-8deg)}45%{transform:rotate(6deg)}70%{transform:rotate(-3deg)}85%{transform:rotate(1deg)}}
.tt-scr{position:fixed;inset:0;z-index:941;display:none;background:rgba(20,14,8,.12)}.tt-scr.open{display:block}
.tt-fan{position:fixed;right:calc(2px + env(safe-area-inset-right,0px));bottom:calc(64px + var(--safeB,0px) + var(--ttUp,0px));z-index:942;display:flex;align-items:flex-end;gap:2px;pointer-events:none}
.tt-fan.open{pointer-events:auto}
.tt-s{position:relative;flex:none;width:46px;height:200px;border:0;padding:0;margin:0;background:none;cursor:pointer;opacity:0;-webkit-tap-highlight-color:transparent;
  transform:translateY(70px) rotate(var(--r,0deg));transform-origin:50% 100%;transition:transform .34s cubic-bezier(.3,1.35,.5,1) var(--d,0s),opacity .18s var(--d,0s)}
.tt-fan.open .tt-s{opacity:1;transform:translateY(0) rotate(var(--r,0deg))}
.tt-s .st{position:absolute;left:8px;right:8px;top:14px;bottom:0;background:url("data/tabtube/slip.webp?v=${TT_IMGV}") 37.9% 0/209% 100% no-repeat;filter:drop-shadow(1px 2px 2px rgba(30,20,10,.4))}
.tt-s .ic{position:absolute;left:50%;top:0;width:30px;height:30px;margin-left:-15px;object-fit:contain;pointer-events:none}
.tt-s .tx{position:absolute;left:50%;top:44px;transform:translateX(-50%);writing-mode:vertical-rl;font:900 16px/1 var(--kai,var(--serif,serif));letter-spacing:5px;color:#2a1a0e;text-shadow:0 0 2px rgba(255,246,224,.95),0 0 4px rgba(255,246,224,.7);white-space:nowrap}
.tt-s .seal{position:absolute;left:50%;top:116px;width:24px;height:24px;margin-left:-12px;box-sizing:border-box;border:2px solid #b23a26;border-radius:2px;background:rgba(255,240,226,.55);color:#b23a26;font:900 13px/20px var(--kai,var(--serif,serif));text-align:center;transform:rotate(-8deg)}
.tt-s .dot{position:absolute;right:4px;top:30px;min-width:10px;height:10px;border-radius:5px;background:#d23a26;box-shadow:0 0 0 2px #fff5e0}
.tt-s:focus-visible{outline:2px solid #b23a26;outline-offset:2px}
.tt-tip{position:fixed;right:calc(58px + env(safe-area-inset-right,0px));bottom:calc(36px + var(--safeB,0px) + var(--ttUp,0px));z-index:940;pointer-events:none;white-space:nowrap;padding:5px 12px;border-radius:999px;
  background:rgba(246,239,223,.94);color:#3a2618;border:1px solid rgba(90,64,30,.35);font:700 13px/1.3 var(--serif,serif);box-shadow:0 2px 6px rgba(0,0,0,.2);animation:ttTip 3.8s ease-in-out forwards}
@keyframes ttTip{0%{opacity:0;transform:translateX(6px)}12%,80%{opacity:1;transform:none}100%{opacity:0}}
body.tt-on #topRight .ib[aria-label="回首頁"]{display:none}   /* 回饋 830：籤筒在時，頂欄的 🏠 跟「首頁」竹籤重複，藏起來；籤筒藏著的頁（渡口、對局…）照舊有 🏠 */
.tt-dup{display:none!important}
body.tt-on.tt-mode-tube #sndPill{right:calc(60px + env(safe-area-inset-right,0px))}
@media (prefers-reduced-motion:reduce){.tt-tube.wig{animation:none}.tt-s{transition:none}.tt-tip{animation:none}}`;document.head.append(s)}
function ttEls(){let t=document.getElementById("ttTube");if(t)return t;ttCss();
  t=document.createElement("button");t.type="button";t.id="ttTube";t.className="tt-tube";t.hidden=true;t.setAttribute("aria-label","籤筒：換地方（首頁、線上、棋譜、設定）");t.setAttribute("aria-expanded","false");
  const sc=document.createElement("div");sc.className="tt-scr";sc.id="ttScr";const fan=document.createElement("div");fan.className="tt-fan";fan.id="ttFan";fan.setAttribute("role","menu");fan.setAttribute("aria-label","換地方");
  fan.innerHTML=TT_GO.map(([go,t2,ic],i)=>`<button type="button" class="tt-s" role="menuitem" tabindex="-1" data-go="${go}" style="--r:${[-8,-4,0,4][i]}deg;--d:${(3-i)*.04}s"><i class="st"></i><img class="ic" alt="" src="data/tabink/${ic}.webp?v=${typeof TB_IMGV!=="undefined"?TB_IMGV:""}" onerror="this.remove()"><b class="tx">${t2}</b></button>`).join("");
  {const tb=document.getElementById("tabbar"),host=tb&&tb.parentNode||document.body;host.append(sc,fan,t)}   /* 放在 .app 裡（底欄原本的位置）：面板（z 948～949，在 #view 裡）、小卡、對話框都蓋得過它 */
  t.onclick=()=>{if(typeof vibrate==="function")vibrate(5);ttFan(!fan.classList.contains("open"))};sc.onclick=()=>ttFan(false);
  fan.querySelectorAll(".tt-s").forEach(b=>b.onclick=()=>{if(typeof vibrate==="function")vibrate(5);const go=b.dataset.go;ttFan(false,1);if(go==="#/"&&typeof goHome==="function")goHome();else location.hash=go});   /* 直接換頁：面板那一格歷史由 07w 自動退掉（跟開著面板換頁一樣） */
  /* 從畫面右邊緣往內滑＝打開 */
  let sx=null,sy=0;addEventListener("pointerdown",e=>{sx=TT_SHOW&&e.clientX>innerWidth-18?e.clientX:null;sy=e.clientY},true);
  addEventListener("pointermove",e=>{if(sx==null)return;if(sx-e.clientX>34&&Math.abs(e.clientY-sy)<40){sx=null;ttFan(true)}},true);addEventListener("pointerup",()=>{sx=null},true);
  return t}
function ttHooks(){if(ttHooks.on)return;ttHooks.on=1;const re=()=>{try{ttDedupe();ttNight()}catch(e){}ttH();ttFill();ttAvoid()};addEventListener("resize",()=>{clearTimeout(re.t);re.t=setTimeout(re,120)});addEventListener("hashchange",()=>{ttFan(false,1);setTimeout(re,350);setTimeout(re,1300)});
  {const V=document.getElementById("view");if(V){new MutationObserver(()=>{clearTimeout(re.m);re.m=setTimeout(re,200)}).observe(V,{childList:true});V.addEventListener("scroll",()=>{clearTimeout(re.s);re.s=setTimeout(ttAvoid,180)},{passive:true})}}   /* 圖比畫面高要捲的頁：捲完才重算讓位，不跟著捲動一直跳 */
  try{const tb=document.getElementById("tabbar");if(tb&&window.ResizeObserver)new ResizeObserver(()=>ttH()).observe(tb)}catch(e){}}
/* 雲霧底欄的高度（雲霧下面那排入口，含 safe-area）→ --ttH：#view 底下留這麼多，圖上的東西不會被擋 */
/* 夜景圖（網址有 _night、頁面 class 有 -night）時雲霧換墨色、字換淺色，跟夜裡的圖接得上 */
function ttNight(){const tb=document.getElementById("tabbar"),V=document.getElementById("view");if(!tb||!V)return;const P=V.querySelector(".shp-page"),im=P&&P.querySelector("img");tb.classList.toggle("tt-night",!!P&&(/(^|\s)[\w-]*-night(\s|$)/.test(P.className)||!!(im&&/_night/.test(im.currentSrc||im.src||""))));
  try{ttBright(tb,P,im)}catch(e){}}
/* 回饋 836（雪景底欄加深）：雪景加 tt-bright（樣式見 ttCss）。判斷：①圖檔名有 snow（07z 首頁積雪版 home_snow 等）；②頁上有 07w7 白天正在下雪的那層（.sw7-mist.snow，夜裡 .nt 不算，夜裡本來就是墨色雲霧）。
   試過「量底欄後面那條圖的亮度」：學習頁石板庭院比雪景還亮，加深反而不好看，所以只認雪景。首頁的雪景圖是先預載再換 src，所以圖每次載好都重算一次（只掛一次 load） */
function ttBright(tb,P,im){if(im&&!im.dataset.ttb){im.dataset.ttb="1";im.addEventListener("load",()=>{if(im.isConnected)try{ttNight()}catch(e){}})}
  const V=document.getElementById("view"),u=im?(im.currentSrc||im.src||""):"";const on=TT_MODE==="mist"&&(/snow/i.test(u)||!!(V&&V.querySelector(".sw7-mist.snow:not(.nt)")));tb.classList.toggle("tt-bright",on)}
function ttH(){const tb=document.getElementById("tabbar"),R=document.documentElement;const on=TT_MODE==="mist"&&tb&&!tb.hidden&&tb.getClientRects().length>0;R.style.setProperty("--ttH",on?Math.round(tb.getBoundingClientRect().height)+"px":"0px")}
function ttPaint(){const fan=document.getElementById("ttFan");if(!fan)return;const tb=document.getElementById("tabbar");
  fan.querySelectorAll(".tt-s").forEach(b=>{const on=b.dataset.go===TT_AT,t2=b.querySelector(".tx").textContent;let s=b.querySelector(".seal");
    if(on&&!s){s=document.createElement("i");s.className="seal";s.setAttribute("aria-hidden","true");s.textContent="在";b.append(s)}else if(!on&&s)s.remove();
    const ob=tb&&[...tb.children].find(x=>x.dataset.go===b.dataset.go),bd=ob&&ob.querySelector(".dot,.badge,[data-badge]");let d=b.querySelector(".dot");
    if(bd&&!d){d=document.createElement("i");d.className="dot";d.setAttribute("aria-hidden","true");b.append(d)}else if(!bd&&d)d.remove();
    b.setAttribute("aria-label",t2+(on?"（目前在這裡）":"")+(bd?"，有新消息":""))});
  document.body.classList.toggle("tt-dk",typeof tbDark==="function"&&tbDark())}
function ttFan(open,quiet){const fan=document.getElementById("ttFan"),sc=document.getElementById("ttScr"),t=document.getElementById("ttTube");if(!fan)return;
  if(open&&!TT_SHOW)return;if(open===fan.classList.contains("open"))return;
  fan.classList.toggle("open",open);sc.classList.toggle("open",open);t.setAttribute("aria-expanded",open?"true":"false");fan.querySelectorAll(".tt-s").forEach(b=>b.tabIndex=open?0:-1);
  if(open){ttPaint();if(typeof xqPanelNav==="function")TT_UN=xqPanelNav(()=>{TT_UN=null;ttFan(false)});const f=fan.querySelector(".tt-s");if(f&&!quiet)try{f.focus({preventScroll:true})}catch(e){}}
  else if(TT_UN){const u=TT_UN;TT_UN=null;if(!quiet)u()}}
/* 滿版到底：沒有底欄後，圖（照寬度放）比畫面矮時，整張圖等比放大到剛好碰到畫面底（左右各裁掉一點，最多放大 25%），入口標籤若被裁到邊就往內推；
   圖比畫面高（小手機、iPad）照舊照寬度放、可以往下捲。座標都是圖的百分比，走路、出口、桌面跳躍、面板都跟著圖，不會錯位 */
function ttFill(){const V=document.getElementById("view");if(!V)return;const P=V.querySelector(".shp-page.cq");if(!P){V.classList.remove("tt-fillx");try{r07Off(V)}catch(e){}return}const im=P.querySelector(":scope>img");if(!im)return;
  const go=()=>{if(!P.isConnected)return;P.style.width="";P.style.marginLeft="";P.style.maxWidth="";V.classList.remove("tt-fillx");P.querySelectorAll(".shp-spot,.po-sight").forEach(b=>{if(b.dataset.ttL!=null)b.style.left=b.dataset.ttL});
    if(!TABTUBE_ON)return;const vr=V.getBoundingClientRect(),pr=P.getBoundingClientRect(),av=vr.top+V.clientHeight-(parseFloat(getComputedStyle(V).paddingBottom)||0)-pr.top,nw=im.naturalWidth||768,nh=im.naturalHeight||1376,W=pr.width,H=W*nh/nw;
    try{if(r07Wide(V,P,vr,pr,nw,nh))return}catch(e){}   /* v5 改善單 R07：寬螢幕、橫放的矮螢幕另外排（見 r07Wide）；手機直向不會進去 */
    if(!W||av-H<2||av>H*1.25)return;const set=h=>{const w=Math.round(h*nw/nh);Object.assign(P.style,{maxWidth:"none",width:w+"px",marginLeft:Math.round((W-w)/2)+"px"})};V.classList.add("tt-fillx");set(av);
    {const ex=V.scrollHeight-V.clientHeight;if(ex>0&&ex<40)set(av-ex)}   /* 圖下還有一點邊距（.pad 之類）就扣掉，免得多出幾 px 可以捲 */
    requestAnimationFrame(()=>P.querySelectorAll(".shp-spot,.po-sight").forEach(b=>{if(b.dataset.ttL==null)b.dataset.ttL=b.style.left;const q=b.getBoundingClientRect(),m=6;let d=0;if(q.left<vr.left+m)d=vr.left+m-q.left;else if(q.right>vr.right-m)d=vr.right-m-q.right;if(d)b.style.left="calc("+b.dataset.ttL+" + "+Math.round(d)+"px)"}))};
  if(im.complete&&im.naturalWidth)go();else im.addEventListener("load",go,{once:true})}
/* v5 改善單 R07（桌面／矮螢幕）：評測 1440×900 首頁內容約 2586px 高、844×390 場景頁約 1518px——滿版圖照畫面寬度放，寬螢幕就變成要先往下捲一大片背景才找得到入口。
   只在「畫面比可用高度寬」或「寬 600px 以上」、而且圖照寬度放會比可用高度高時才處理；手機直向（寬 390～440、比高度窄）永遠不進來，版面跟原本一模一樣。
   ① 限寬置中（fit）：圖縮到剛好等於可用高度（桌面 1440×900 約 463px 寬、左右各留約 490px），放在畫面正中間，整張圖一眼看完、不用捲；入口標籤、走路角色、出口都是圖的百分比，跟著圖走。
   ② 側欄（side）：橫放手機這種矮螢幕，圖縮到等高只剩不到 320px 寬（844×390 只有約 182px），標籤會擠成一團；改成圖照手機寬（畫面一半、320～420px）靠左、可以往下捲著看，
      右邊空出來的地方放一份「這一頁的入口」大按鈕（每顆至少 48px 高、只放標籤上的大字，點了＝點圖上那個標籤，從哪來回哪去的出口也在），快速功能不用先捲背景；
      首頁底部的「快下一盤」大按鈕跟著移到側欄底下置中。
   換頁、轉向、縮放時 ttFill 會重跑：不符合條件就整個還原（r07Off）。開關 R07_WIDE_ON */
const R07_WIDE_ON=true,R07_MINW=320,R07_SIDEW=420;
function r07Css(){if(document.getElementById("r07Css"))return;const s=document.createElement("style");s.id="r07Css";s.textContent=`
#view.r07-fit .shp-page.cq,#view.r07-side .shp-page.cq{box-shadow:0 0 22px rgba(40,26,14,.22)}
.r07-menu{position:fixed;z-index:26;display:grid;grid-template-columns:repeat(auto-fill,minmax(124px,1fr));gap:8px;align-content:start;overflow-y:auto;overscroll-behavior:contain;padding:2px;box-sizing:border-box;-webkit-overflow-scrolling:touch}
body:not(.r07-side) .r07-menu{display:none}
.r07-mi{min-height:48px;margin:0;padding:8px 12px;border-radius:14px;border:1.5px solid #f2c94c;background:rgba(20,16,12,.8);color:#ffe08a;font:800 15px/1.25 var(--serif,serif);letter-spacing:.04em;text-align:center;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.22);-webkit-tap-highlight-color:transparent}
.r07-mi img{height:1.15em;width:auto;vertical-align:-.18em}.r07-mi:active{transform:scale(.97)}.r07-mi:focus-visible{outline:2px solid #b0301c;outline-offset:2px}`;document.head.append(s)}
function r07Off(V){if(V)V.classList.remove("r07-fit","r07-side");if(document.body)document.body.classList.remove("r07-side");const M=document.getElementById("r07Menu");if(M)M.remove();
  const b=document.querySelector(".hm-go-bar[data-r07]");if(b){b.style.left="";b.removeAttribute("data-r07")}}
/* 寬螢幕模式下把貼邊的標籤推回「圖和畫面重疊的那一塊」（原本的推法量的是畫面，圖變窄以後要量圖） */
function r07Push(V,P){requestAnimationFrame(()=>{if(!P.isConnected||P.dataset.hmc)return;const q0=P.getBoundingClientRect(),v0=V.getBoundingClientRect(),L=Math.max(q0.left,v0.left)+6,R=Math.min(q0.right,v0.right)-6;
  P.querySelectorAll(".shp-spot,.po-sight").forEach(b=>{if(b.dataset.ttL==null)b.dataset.ttL=b.style.left;const q=b.getBoundingClientRect();if(!q.width)return;let d=0;if(q.left<L)d=L-q.left;else if(q.right>R)d=R-q.right;if(d)b.style.left="calc("+b.dataset.ttL+" + "+Math.round(d)+"px)"});
  if(typeof r07HitSoon==="function")r07HitSoon()})}
function r07Wide(V,P,vr,pr,nw,nh){if(!R07_WIDE_ON){r07Off(V);return false}
  const pb=parseFloat(getComputedStyle(V).paddingBottom)||0,av=V.clientHeight-pb-(pr.top-vr.top+V.scrollTop),W=pr.width,H=W*nh/nw,vw=V.clientWidth;   /* 可用高度照「圖在捲動內容裡的位置」算，捲到一半轉向也對 */
  if(!W||av<120||H-av<2||!(vw>=600||vw>av)){r07Off(V);return false}
  r07Css();const fit=Math.floor(av*nw/nh);
  if(fit>=R07_MINW){r07Off(V);const set=w=>Object.assign(P.style,{maxWidth:"none",width:w+"px",marginLeft:Math.round((W-w)/2)+"px"});set(fit);V.classList.add("r07-fit");
    {const ex=V.scrollHeight-V.clientHeight;if(ex>0&&ex<60)set(Math.floor((av-ex)*nw/nh))}   /* 圖下還有幾 px 外距（.home-page 的 6px）就扣掉，免得多出一點可以捲 */
    r07Push(V,P);return true}
  const col=Math.round(Math.min(R07_SIDEW,Math.max(R07_MINW,W*.5)));if(W-col<200){r07Off(V);return false}
  Object.assign(P.style,{maxWidth:"none",width:col+"px",marginLeft:"0px"});V.classList.remove("r07-fit");V.classList.add("r07-side");document.body.classList.add("r07-side");
  r07Menu(V,P,col,pb);r07Push(V,P);return true}
/* 側欄選單：放在 .app 裡（跟籤筒一樣，不放進 #view，免得被 07w 當成「圖下面的內容」搬進面板），位置照 #view 算 */
function r07Menu(V,P,col,pb){let M=document.getElementById("r07Menu");
  if(!M){M=document.createElement("nav");M.id="r07Menu";M.className="r07-menu";M.setAttribute("aria-label","這一頁的入口");const tb=document.getElementById("tabbar");(tb&&tb.parentNode||document.body).append(M)}
  M._P=P;r07MenuFill(M,P);
  const vr=V.getBoundingClientRect(),x0=Math.round(vr.left+col+12),x1=Math.round(vr.right-8-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--safeR"))||0)),top=Math.round(vr.top+8);let bot=Math.round(vr.top+V.clientHeight-pb-8);
  const bar=P.querySelector(".hm-go-bar");
  if(bar){const cx=Math.round((x0+x1)/2);bar.setAttribute("data-r07","1");bar.style.left=cx+"px";const r1=bar.getBoundingClientRect(),d=cx-(r1.left+r1.width/2);if(Math.abs(d)>1)bar.style.left=Math.round(cx+d)+"px";   /* 包含區塊不一定是畫面：量一次、差多少補多少 */
    const r2=bar.getBoundingClientRect();if(r2.height)bot=Math.min(bot,Math.round(r2.top-8))}
  Object.assign(M.style,{left:x0+"px",top:top+"px",width:Math.max(0,x1-x0)+"px",maxHeight:Math.max(52,bot-top)+"px"})}
/* 選單內容＝這一頁看得到的場景標籤（.shp-spot）和標了 data-r07m 的點選區（例如棋譜庫的古譜書櫥），出口排最後；字和小圖示照抄標籤上的大字，點了＝點那個標籤 */
function r07MenuFill(M,P){const E=[...P.querySelectorAll(".shp-spot,[data-r07m]")].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=="hidden");
  E.sort((a,b)=>(a.classList.contains("ex-spot")?1:0)-(b.classList.contains("ex-spot")?1:0));
  const lab=e=>e.dataset.r07m?esc(e.dataset.r07m):(e.querySelector(":scope>b")||e).innerHTML,k=E.map(lab).join("\n");M._E=E;if(M.dataset.k===k)return;M.dataset.k=k;
  M.innerHTML=E.map((e,i)=>`<button type="button" class="r07-mi" data-i="${i}">${lab(e)}</button>`).join("");
  M.querySelectorAll(".r07-mi").forEach(b=>b.onclick=()=>{const e=(M._E||[])[+b.dataset.i];if(e&&e.isConnected)e.click()})}
/* 標籤晚到（07w9 出口最多等 4 秒才放、07w4 碼頭）：07z r07Hit 每次重算點選範圍時順便更新選單 */
function r07MenuSync(){const M=document.getElementById("r07Menu");if(!M||!M._P)return;if(!M._P.isConnected){r07Off(document.getElementById("view"));return}r07MenuFill(M,M._P)}
/* 回饋 830（開發者 11/9「修正冗餘重複功能」）：同一件事只留一個入口。這裡在換頁後統一收掉「頂欄已經有」的重複：
   ① 滿版圖上方的標題條（.shp-cap）大字跟頂欄頁名一樣＝藏大字（有小字說明就留小字一行）；大字是「頁名・朝代」＝只留後半；
   ② 頁面最上面的 h1／h2 跟頂欄頁名一字不差＝藏起來（例如猜著法）；③ 渡口圖上已有「⛵ 上星槎」標籤時，頂欄的 ⛵ 回星槎藏起來。
   不改各頁自己的檔（07f、07m、03 有別的助手在改），只在畫好之後加 class tt-dup。 */
const ttNorm=t=>String(t||"").replace(/[^㐀-鿿\w]/g,"");
function ttDedupe(){const V=document.getElementById("view"),T=document.getElementById("title");if(!V||!T)return;const tn=ttNorm(T.textContent);if(!tn)return;
  V.querySelectorAll(".shp-page .shp-cap").forEach(c=>{const b=c.querySelector(":scope>b"),sm=c.querySelector(":scope>small");if(!b||b.dataset.ttd)return;const bt=b.textContent,bn=ttNorm(bt);
    if(bn===tn){b.dataset.ttd="1";if(sm&&ttNorm(sm.textContent))b.classList.add("tt-dup");else c.classList.add("tt-dup")}
    else if(bn.startsWith(tn)&&/・/.test(bt)&&ttNorm(bt.split("・")[0])===tn){b.dataset.ttd="1";b.textContent=bt.slice(bt.indexOf("・")+1)}});
  const vt=V.getBoundingClientRect().top;V.querySelectorAll("h1,h2").forEach(h=>{if(h.closest(".xqs,.fbp-bw,.hq-pn,#sheet"))return;const r=h.getBoundingClientRect();if(r.top-vt<160&&ttNorm(h.textContent)===tn)h.classList.add("tt-dup")});
  if(V.querySelector("#poBoard"))document.querySelectorAll('#topRight .ib[aria-label="回星槎"]').forEach(b=>b.classList.add("tt-dup"))}
/* 讓位：籤筒蓋到圖上的入口標籤、景點或 07w 出口區時，往上挪到不蓋為止（每次 8px，最多畫面高 40%） */
function ttAvoid(){const t=document.getElementById("ttTube");if(!t||t.hidden)return;const R=document.documentElement;R.style.setProperty("--ttUp","0px");
  const V=document.getElementById("view");if(!V)return;const ob=[];
  V.querySelectorAll(".shp-spot,.po-sight,[data-hs],.cjm-tag,.ph4-pz").forEach(e=>{if(e.closest(".xqs,.fbp-bw"))return;const r=e.getBoundingClientRect();if(r.width>2&&r.height>2&&getComputedStyle(e).visibility!=="hidden")ob.push(r)});
  try{if(typeof SHW_XR!=="undefined"&&(typeof shwExitOn!=="function"||shwExitOn()))for(const x of SHW_XR){if(!x.f.isConnected||!V.contains(x.f))continue;const f=x.f.getBoundingClientRect(),r=x.r;ob.push({left:f.left+f.width*r[0]/100,right:f.left+f.width*r[2]/100,top:f.top+f.height*r[1]/100,bottom:f.top+f.height*r[3]/100})}}catch(e){}
  const b0=t.getBoundingClientRect(),hit=u=>ob.some(r=>r.left<b0.right-4&&r.right>b0.left+4&&r.top<b0.bottom-u-4&&r.bottom>b0.top-u+4);
  let u=0;const mx=innerHeight*.4;while(hit(u)&&u<mx)u+=8;R.style.setProperty("--ttUp",(u<mx?u:0)+"px")}
function ttSync(){if(!TABTUBE_ON)return;const tb=document.getElementById("tabbar");if(!tb||!document.body)return;ttCss();ttHooks();document.body.classList.toggle("tt-mode-mist",TT_MODE==="mist");document.body.classList.toggle("tt-mode-tube",TT_MODE!=="mist");
  if(TT_MODE==="mist"){tb.classList.remove("tt-gone");tb.classList.add("tt-mist");{const t0=document.getElementById("ttTube");if(t0)t0.hidden=true}document.body.classList.toggle("tt-on",TT_SHOW);ttH();setTimeout(()=>{ttH();ttFill()},60);return}
  const t=ttEls();tb.classList.add("tt-gone");tb.classList.remove("tt-mist");
  t.hidden=!TT_SHOW;document.body.classList.toggle("tt-on",TT_SHOW);if(!TT_SHOW)ttFan(false,1);ttPaint();setTimeout(ttAvoid,60);
  if(TT_SHOW)ttFirst()}
/* 第一次看到才提示：籤筒真的露在最上層（沒被開頭畫面、載入畫面、小卡蓋住）才晃＋說一句，記 ttSeen；被蓋住就 2 秒後再看 */
function ttFirst(){if(typeof store==="undefined"||store.get("ttSeen",0)||ttFirst.w)return;ttFirst.w=1;const t=document.getElementById("ttTube");
  const go=()=>{ttFirst.w=0;if(!t||t.hidden||store.get("ttSeen",0))return;const r=t.getBoundingClientRect(),e=document.elementFromPoint(r.left+r.width/2,r.top+r.height*.6);
    if(document.hidden||!e||(e!==t&&!t.contains(e))){ttFirst.w=1;setTimeout(go,2000);return}store.set("ttSeen",1);t.classList.add("wig");setTimeout(()=>t.classList.remove("wig"),2100);
    const p=document.createElement("div");p.className="tt-tip";p.setAttribute("role","status");p.textContent="點籤筒換地方";document.body.append(p);setTimeout(()=>p.remove(),3900)};setTimeout(go,900)}
if(TABTUBE_ON&&typeof setTabs==="function"){const f0=setTabs;setTabs=function(show,on){const r=f0.apply(this,arguments);try{TT_SHOW=!!show;TT_AT=on||"";ttSync()}catch(e){}return r};
  try{const tb=document.getElementById("tabbar");if(tb){TT_SHOW=!tb.hidden;const o=[...tb.children].find(b=>b.classList.contains("on"));TT_AT=o?o.dataset.go:"";new MutationObserver(()=>{try{ttPaint()}catch(e){}}).observe(tb,{subtree:true,childList:true})}
    if(document.body)ttSync();else addEventListener("DOMContentLoaded",ttSync)}catch(e){}}
