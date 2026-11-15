/* ================= 🔍 滿版水墨圖兩指縮放（意見回饋 785，開發者 11/8「玩家手指縮放可以放大縮小星船/渡口/驛站」）=================
   星槎主畫面（.shp-map.full 裡的 .shp-in）、渡口與驛站（.shp-page.cq）都可以兩指縮放 1～2.5 倍；放大後單指拖曳看別處；雙擊（電腦：雙按）還原。
   整個框一起用 transform 縮放，所以圖上的入口標籤、3D 角色（07w）、07r 渡口風、07k 疊層、星槎的 WebGL 立體都跟著圖走、位置對得上。
   手勢：點一下照舊（開入口、點哪走哪）；沒放大時單指照舊捲頁面；拖曳或縮放後放開手指的那一下不算點選。
   iOS：沒放大時 touch-action:pan-y（系統不縮放、不雙擊放大），放大後 none；再擋 gesturestart。電腦：ctrl＋滾輪縮放、放大後滑鼠拖曳、雙按還原。
   渡口、驛站的圖外面包一層 .zm-wrap（overflow:hidden，接手原本的外距）裁切放大的圖。每次進頁面都是新的畫面，縮放回到 1 倍。
   不改別人的檔：包一層 07f 的 shpPx（星槎）、portWind（渡口）、yzInn（驛站）。開關 ZOOM_ON；樣式在 zmCss */
const ZOOM_ON=true,ZM_MAX=2.5;
function zmCss(){if(document.getElementById("zmCss"))return;const s=document.createElement("style");s.id="zmCss";s.textContent=`
.zm-wrap{position:relative;overflow:hidden}.zm-c{touch-action:pan-y}.zm-c.zm-on{touch-action:none;cursor:grab}
/* 回饋 837（星槎甲板可左右看）：圖比框寬時左右兩邊的拖曳提示——那一邊還有圖才出現；進頁時輕輕晃 3 下，之後留淡淡一條 */
.zm-c.zm-px{cursor:grab}.zm-ex{position:absolute;top:0;bottom:0;width:26px;z-index:4;pointer-events:none;display:flex;align-items:center;opacity:0;transition:opacity .35s}
.zm-ex.l{left:0;justify-content:flex-start;background:linear-gradient(to right,rgba(24,18,12,.34),rgba(24,18,12,0))}.zm-ex.r{right:0;justify-content:flex-end;background:linear-gradient(to left,rgba(24,18,12,.34),rgba(24,18,12,0))}
.zm-ex b{font:900 20px/1 var(--serif,serif);color:#fff6e0;text-shadow:0 0 3px rgba(0,0,0,.6);padding:12px 3px;margin:0 2px;border-radius:10px;background:rgba(24,18,12,.5);box-shadow:0 0 0 1px rgba(214,176,92,.45)}.zm-ex.on{opacity:.72}.zm-ex.on.nudge{opacity:1}
.zm-ex.l.nudge b{animation:zmNl .8s ease-in-out 3}.zm-ex.r.nudge b{animation:zmNr .8s ease-in-out 3}@keyframes zmNl{50%{transform:translateX(-5px)}}@keyframes zmNr{50%{transform:translateX(5px)}}
.zm-tip{position:absolute;left:50%;bottom:64px;z-index:5;transform:translateX(-50%);pointer-events:none;white-space:nowrap;padding:5px 12px;border-radius:14px;background:rgba(24,18,12,.72);color:#fff6e0;font:700 13px/1.3 var(--serif,serif);animation:zmTip 3.6s ease both}
@keyframes zmTip{0%{opacity:0}12%{opacity:1}80%{opacity:1}100%{opacity:0}}@media (prefers-reduced-motion:reduce){.zm-ex b,.zm-tip{animation:none}}
/* 意見回饋 884（iPad 玩家「不知道按了什麼，首頁長這樣無法縮小」）：放大後只有雙擊能還原、畫面上沒有任何提示；放大時上方出現「還原大小」 */
.zm-rs{display:none;position:absolute;top:10px;left:50%;transform:translateX(-50%);z-index:6;min-height:40px;padding:6px 16px;border:0;border-radius:20px;background:rgba(24,18,12,.78);color:#fff6e0;font:700 15px/1.2 var(--serif,serif);box-shadow:0 0 0 1px rgba(214,176,92,.55),0 2px 8px rgba(0,0,0,.35);cursor:pointer;white-space:nowrap}
.zm-c.zm-on>.zm-rs{display:block}
/* 意見回饋 888：被系統整頁放大（iOS 不理 viewport 的 user-scalable=no）時，圖框改回系統手勢，兩指才縮得回去；右上那顆「還原大小」跟著看得到的範圍走 */
html.zm-vvz .zm-c,html.zm-vvz .zm-c.zm-on{touch-action:auto}
#zmVvb{display:block;position:fixed;z-index:2147483000;transform-origin:50% 0;margin:0}`;document.head.append(s)}
/* ---------- 意見回饋 888（玩家 iPad 主畫面 App 820×1148：「首頁用兩指放大後就無法縮小，要重開 App 才能恢復」）----------
   原因：兩指縮放有兩種。07x 自己的（transform 放大圖框，1～2.5 倍，縮得回去，884 還加了「還原大小」）；另一種是 iOS 整頁放大——
     viewport 寫了 user-scalable=no，但 iOS 10 起 Safari／主畫面 App 不理它；手指有一隻落在圖框外（頂欄、底部分頁、iPad 兩側模糊底那一塊）就會整頁放大。
     整頁放大後畫面幾乎都是圖框，圖框對兩指手勢一律 preventDefault（touchstart、gesturestart）又是 touch-action:pan-y，系統的縮小手勢全被擋掉＝縮不回去；884 的「還原大小」只管 07x 自己的倍數。
   修法：① 沒被系統放大時，整份文件擋 gesturestart／gesturechange（iOS 才有的事件），一開始就不會整頁放大；
     ② 萬一已經整頁放大（visualViewport.scale＞1.01）：圖框不再搶兩指、不擋 gesturestart，CSS 改回 touch-action:auto，兩指就能縮回；畫面上方出現「⤢ 還原大小」（跟著看得到的範圍走、反向縮放保持原大）；
     ③ 雙擊（電腦：雙按）圖框、按「還原大小」、回首頁（goHome、網址換回 #/）：07x 回 1 倍，整頁放大用「暫時把 viewport 改成 maximum-scale=1」請 iOS 縮回。
   純計算 zmNat（給倍數判斷是不是整頁放大了）測試在 xiangqi-lab/tools/test-fb888.js（假 DOM＋vm 跑兩指、雙擊、回首頁、整頁放大救援） */
const ZM_VV_EPS=1.01;
function zmVV(){try{const v=typeof window!=="undefined"&&window.visualViewport;return v&&v.scale>0?v.scale:1}catch(e){return 1}}
function zmNat(sc){return(sc==null?zmVV():sc)>ZM_VV_EPS}
/* 請 iOS 把整頁放大縮回 1 倍：暫時加 maximum-scale=1，0.4 秒後換回原本的 viewport；沒有整頁放大就不動 */
function zmVVReset(){if(!zmNat())return false;const m=document.querySelector('meta[name="viewport"]');if(!m)return false;const c0=m.getAttribute("content")||"";if(c0.indexOf("maximum-scale")>=0)return false;
  m.setAttribute("content",c0+",maximum-scale=1");setTimeout(()=>{try{m.setAttribute("content",c0)}catch(e){}},400);return true}
/* 全部回 1 倍：畫面上每個 07x 圖框＋整頁放大；quiet＝回首頁那種不用提示 */
function zmFixAll(quiet){document.querySelectorAll(".zm-c").forEach(C=>{try{if(C.zm&&C.zm.s>1)C.zm.reset()}catch(e){}});const r=zmVVReset();
  if(!quiet&&r)setTimeout(()=>{try{if(zmNat()&&typeof toast==="function")toast("兩指往內捏，就能縮回原本大小")}catch(e){}},700);return r}
/* 整頁放大時：html 加 zm-vvz（圖框改回系統手勢）、放一顆跟著看得到的範圍走的「還原大小」 */
function zmVvSync(){const z=zmNat(),R=document.documentElement;R.classList.toggle("zm-vvz",z);let b=document.getElementById("zmVvb");if(!z){if(b)b.hidden=true;return}
  zmCss();if(!b){b=document.createElement("button");b.type="button";b.id="zmVvb";b.className="zm-rs";b.textContent="⤢ 還原大小";b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();zmFixAll()});document.body.append(b)}
  const v=window.visualViewport;b.hidden=false;if(!v)return;Object.assign(b.style,{left:(v.offsetLeft+v.width/2).toFixed(1)+"px",top:(v.offsetTop+10/v.scale).toFixed(1)+"px",transform:"translateX(-50%) scale("+(1/v.scale).toFixed(3)+")"})}
/* C＝看得到的框（裁切範圍），E＝被縮放的圖層（座標的 100%） */
/* 回饋 837（星槎甲板可左右看）：第三個參數 o.panX＝圖比框寬時，沒放大也能左右拖（單指水平拖、滑鼠拖），進頁停在原本置中的位置；o.onPan＝每次位移後呼叫（星槎用來重排貼邊的標籤）。
   直向的手勢照舊捲頁面；從畫面左右邊緣 24px 內起手的不接（讓給右邊緣往內滑、iOS 左緣返回等系統手勢）；拖過放開的那一下不算點選（同縮放） */
const ZM_EDGE=24;
function zmAttach(C,E,o){if(!ZOOM_ON||!C||!E||C.dataset.zm)return;C.dataset.zm="1";zmCss();C.classList.add("zm-c");o=o||{};
  let s=1,tx=0,ty=0,sup=0;const cl=(v,a,b)=>Math.max(a,Math.min(b,v));
  const ovX=B=>!!o.panX&&B.ew-B.W>2;   /* 回饋 837：沒放大時圖左右有沒有被裁 */
  const box=()=>{let x=null;try{x=o.ext?o.ext():null}catch(e){x=null}return{W:C.clientWidth,H:C.clientHeight,ox:E.offsetLeft,oy:E.offsetTop,ew:E.offsetWidth,eh:E.offsetHeight,el:x&&x.l||0,er:x&&x.r||0}};   /* 11/14 首頁三屏長卷：o.ext()＝圖層左右還有多少（左右兩屏），放大後拖曳的範圍算到那裡 */
  const apply=()=>{const B=box();s=cl(s,1,ZM_MAX);if(s<=1.001){s=1;ty=0;if(!ovX(B))tx=0}   /* 回饋 837：1 倍時圖比框寬，保留左右位移 */
    tx=cl(tx,B.W-s*(B.ox+B.ew+B.er),-s*(B.ox-B.el));ty=cl(ty,B.H-s*(B.oy+B.eh),-s*B.oy);
    if(s===1&&Math.abs(tx)<.5){tx=0;E.style.transform="";E.style.transformOrigin=""}else if(s===1){E.style.transformOrigin="";E.style.transform=`translate(${tx.toFixed(1)}px,0px)`}else{E.style.transformOrigin="0 0";E.style.transform=`translate(${(tx+(s-1)*B.ox).toFixed(1)}px,${(ty+(s-1)*B.oy).toFixed(1)}px) scale(${s.toFixed(3)})`}
    C.classList.toggle("zm-on",s>1);try{zmEdge(B)}catch(e){}if(o.onPan)try{o.onPan(s)}catch(e){}};
  /* 回饋 837：左右拖曳提示（只有 panX 的框才有） */
  let EX=null;const zmEdge=B=>{if(!o.panX)return;const on=ovX(B)||s>1;C.classList.toggle("zm-px",on);if(!on&&!EX)return;
    if(!EX){EX=["l","r"].map(k=>{const e=document.createElement("i");e.className="zm-ex "+k;e.setAttribute("aria-hidden","true");e.innerHTML=`<b>${k==="l"?"‹":"›"}</b>`;C.append(e);return e});
      EX.forEach(e=>e.classList.add("nudge"));setTimeout(()=>EX.forEach(e=>e.classList.remove("nudge")),2600);
      try{if(typeof store!=="undefined"&&!store.get("zmPanTip",0)&&on){store.set("zmPanTip",1);const t=document.createElement("div");t.className="zm-tip";t.setAttribute("aria-hidden","true");t.textContent="‹ 左右拖動，看整艘船 ›";C.append(t);setTimeout(()=>t.remove(),3800)}}catch(e){}}
    const mx=-s*B.ox,mn=B.W-s*(B.ox+B.ew);EX[0].classList.toggle("on",on&&tx<mx-1);EX[1].classList.toggle("on",on&&tx>mn+1)};
  const loc=(x,y)=>{const r=C.getBoundingClientRect();return[x-r.left,y-r.top]};
  const zoomAt=(ns,m,s0,t0,m0)=>{const c=[(m0[0]-t0[0])/s0,(m0[1]-t0[1])/s0];s=cl(ns,1,ZM_MAX);tx=m[0]-s*c[0];ty=m[1]-s*c[1];apply()};
  const reset=()=>{s=1;tx=ty=0;apply()};
  {const b=document.createElement("button");b.type="button";b.className="zm-rs";b.textContent="⤢ 還原大小";b.addEventListener("click",e=>{e.preventDefault();e.stopPropagation();reset()});C.append(b)}   /* 意見回饋 884：放大時才看得到（.zm-on） */
  /* 觸控：兩指縮放（以兩指中點為準，也跟著平移）、放大時單指拖曳、雙擊還原 */
  let T=null,last=null;
  C.addEventListener("touchstart",e=>{const t=e.touches;if(t.length>=2){if(zmNat()){T=null;return}   /* 意見回饋 888：已經被系統整頁放大＝兩指交給系統縮回，不搶、不 preventDefault */const a=loc(t[0].clientX,t[0].clientY),b=loc(t[1].clientX,t[1].clientY);T={pinch:1,d0:Math.hypot(a[0]-b[0],a[1]-b[1])||1,m0:[(a[0]+b[0])/2,(a[1]+b[1])/2],s0:s,t0:[tx,ty],moved:1};sup=1;e.preventDefault()}
    else if(t.length===1){const p=loc(t[0].clientX,t[0].clientY);T={p0:p,t0:[tx,ty],moved:0,at:Date.now(),edge:t[0].clientX<ZM_EDGE||t[0].clientX>innerWidth-ZM_EDGE}}},{passive:false});   /* 回饋 837：edge＝從畫面邊緣起手 */
  C.addEventListener("touchmove",e=>{if(!T)return;const t=e.touches;
    if(T.pinch&&t.length>=2){e.preventDefault();const a=loc(t[0].clientX,t[0].clientY),b=loc(t[1].clientX,t[1].clientY),d=Math.hypot(a[0]-b[0],a[1]-b[1]);zoomAt(T.s0*d/T.d0,[(a[0]+b[0])/2,(a[1]+b[1])/2],T.s0,T.t0,T.m0);return}
    if(!T.pinch&&t.length===1&&s>1){const p=loc(t[0].clientX,t[0].clientY),dx=p[0]-T.p0[0],dy=p[1]-T.p0[1];if(!T.moved&&Math.hypot(dx,dy)<8)return;T.moved=1;sup=1;e.preventDefault();tx=T.t0[0]+dx;ty=T.t0[1]+dy;apply()}
    /* 回饋 837：沒放大、圖比框寬：先判斷方向，水平才接（左右拖），直向放給頁面捲動；邊緣起手不接 */
    else if(!T.pinch&&t.length===1&&s===1&&!T.no&&ovX(box())&&!zmNat()){const p=loc(t[0].clientX,t[0].clientY),dx=p[0]-T.p0[0],dy=p[1]-T.p0[1];
      if(!T.moved){if(Math.hypot(dx,dy)<8)return;if(T.edge||Math.abs(dx)<Math.abs(dy)*1.2){T.no=1;return}}T.moved=1;sup=1;e.preventDefault();tx=T.t0[0]+dx;apply()}},{passive:false});
  const tend=e=>{if(!T)return;if(e.touches.length)return;const was=T;T=null;if(was.pinch||was.moved){sup=Date.now()+450;return}
    const now=Date.now(),p=was.p0;if((s>1||zmNat())&&last&&now-last.t<320&&Math.hypot(p[0]-last.p[0],p[1]-last.p[1])<30){last=null;sup=now+450;reset();zmVVReset();return}last={t:now,p}};   /* 意見回饋 888：整頁放大時雙擊也還原 */
  C.addEventListener("touchend",tend);C.addEventListener("touchcancel",tend);
  C.addEventListener("gesturestart",e=>{if(!zmNat())e.preventDefault()});   /* 意見回饋 888：整頁放大時不擋，系統才縮得回去 */
  /* 電腦：ctrl＋滾輪縮放、放大後滑鼠拖曳、雙按還原 */
  C.addEventListener("wheel",e=>{if(!e.ctrlKey)return;e.preventDefault();const m=loc(e.clientX,e.clientY);zoomAt(s*Math.exp(-e.deltaY*.0025),m,s,[tx,ty],m)},{passive:false});
  let D=null;C.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse"||e.button!==0||(s<=1&&!ovX(box())))return;   /* 回饋 837：圖比框寬時沒放大也能用滑鼠左右拖 */D={p0:loc(e.clientX,e.clientY),t0:[tx,ty],moved:0}});
  C.addEventListener("pointermove",e=>{if(!D||e.pointerType!=="mouse")return;const p=loc(e.clientX,e.clientY),dx=p[0]-D.p0[0],dy=p[1]-D.p0[1];if(!D.moved&&Math.hypot(dx,dy)<5)return;if(!D.moved)try{C.setPointerCapture(e.pointerId)}catch(err){}D.moved=1;tx=D.t0[0]+dx;if(s>1)ty=D.t0[1]+dy;apply()});
  const pup=e=>{if(!D)return;if(D.moved)sup=Date.now()+300;D=null};C.addEventListener("pointerup",pup);C.addEventListener("pointercancel",pup);
  C.addEventListener("dblclick",e=>{if(s>1||zmNat()){e.preventDefault();reset();zmVVReset()}});
  /* 拖曳、縮放後放開的那一下不算點選（掛在 document 捕獲，比圖上的入口、07w 點哪走哪都早） */
  const kill=e=>{if(!C.isConnected){document.removeEventListener("click",kill,true);return}if(!C.contains(e.target))return;if(sup===1||sup>Date.now()){sup=0;e.stopPropagation();e.preventDefault()}};
  document.addEventListener("click",kill,true);
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!C.isConnected){ro.disconnect();return}if(s>1||o.panX)apply()});ro.observe(C);if(o.panX)ro.observe(E)}   /* 回饋 837：圖框大小變了（shpMapFit 重排）也重新夾住左右位移 */
  C.zm={reset,get s(){return s},set:(ns,mx,my)=>zoomAt(ns,[mx,my],s,[tx,ty],[mx,my])};apply()}
/* 渡口、驛站：.shp-page.cq 外面包一層裁切框，接手原本的外距 */
function zmPage(v,o){const P=v&&v.querySelector(".shp-page.cq");if(!P||P.dataset.zm||!ZOOM_ON)return;let W=P.parentNode;   /* o：zmAttach 的選項（首頁三屏長卷傳 ext） */
  if(!W.classList.contains("zm-wrap")){W=document.createElement("div");W.className="zm-wrap";const cs=getComputedStyle(P);W.style.margin=cs.margin;P.style.margin="0";P.parentNode.insertBefore(W,P);W.append(P)}
  P.dataset.zm="1";zmAttach(W,P,o||undefined)}
/* 回饋 837（星槎甲板可左右看）：星槎圖比畫面寬（手機直拿）時可以左右拖；拖的時候照 07f shpMapFit 的規則重排貼邊的入口標籤（裁到邊的往內推、拖進畫面就回原位），1 倍時才排 */
function zmShipPush(M,s){if(s>1||!M||!M.isConnected)return;const I=M.querySelector(".shp-in");if(!I)return;const R=M.getBoundingClientRect(),m=8,mx=M.classList.contains("zm-px")?30:8,capH=(M.querySelector(".shp-cap")||{}).offsetHeight||0;   /* 左右留 30px 給拖曳提示 ‹ › */
  I.querySelectorAll(".shp-hs").forEach(b=>{b.style.marginLeft="";b.style.marginTop="";const q=b.getBoundingClientRect();if(!q.width)return;let dx=0,dy=0;
    if(q.left<R.left+mx)dx=R.left+mx-q.left;else if(q.right>R.right-mx)dx=R.right-mx-q.right;if(q.top<R.top+capH+m)dy=R.top+capH+m-q.top;else if(q.bottom>R.bottom-m)dy=R.bottom-m-q.bottom;
    if(dx)b.style.marginLeft=Math.round(dx)+"px";if(dy)b.style.marginTop=Math.round(dy)+"px"})}
if(typeof shpPx==="function"){const f0=shpPx;shpPx=function(M){const r=f0.apply(this,arguments);try{if(M){let q=0;zmAttach(M,M.querySelector(".shp-in"),{panX:1,onPan:z=>{if(q)return;q=requestAnimationFrame(()=>{q=0;zmShipPush(M,z)})}})}}catch(e){}return r}}
if(typeof portWind==="function"){const f0=portWind;portWind=function(v,k){const r=f0.apply(this,arguments);try{zmPage(v)}catch(e){}return r}}
if(typeof yzInn==="function"){const f0=yzInn;yzInn=function(v,k){const r=f0.apply(this,arguments);try{zmPage(v)}catch(e){}return r}}
/* 意見回饋 888：① 沒被系統放大時擋掉整頁兩指放大（iOS 的 gesture 事件）；② 整頁放大了就換成救援模式（zmVvSync）；③ 回首頁一律回 1 倍 */
(()=>{if(!ZOOM_ON||typeof document==="undefined"||!document.addEventListener)return;
  const g=e=>{if(!zmNat())try{e.preventDefault()}catch(x){}};document.addEventListener("gesturestart",g,{passive:false});document.addEventListener("gesturechange",g,{passive:false});
  try{const v=typeof window!=="undefined"&&window.visualViewport;if(v){let q=0;const f=()=>{if(q)return;q=requestAnimationFrame(()=>{q=0;try{zmVvSync()}catch(e){}})};v.addEventListener("resize",f);v.addEventListener("scroll",f)}}catch(e){}
  if(typeof addEventListener==="function")addEventListener("hashchange",()=>{try{if(typeof navKey==="function"&&navKey(location.hash)==="/")zmFixAll(true)}catch(e){}});
  if(typeof goHome==="function"){const f0=goHome;goHome=function(){try{zmFixAll(true)}catch(e){}return f0.apply(this,arguments)}}})();
