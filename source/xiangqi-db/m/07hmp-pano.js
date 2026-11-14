/* ================= 🏞 首頁三屏長卷：往左走是西市、往右走是觀星臺（開發者 11/14：「我希望首頁有角色往左邊走會看到西市，往右邊走會看到觀星臺那種感覺」；前綴 hmp／HMP，11/14 grep 過沒撞名）=================
   圖：park/homemap_xsm/pano_<首頁變體>.png（2304×1376，三等分；白天預設那張叫 pano_full_day.png）→ tools/homemap_pano.py 切成左右兩屏 → art/homemap/home_<變體>_pano_l.webp（西市）、_pano_r.webp（觀星臺）；
     中間那一屏就是現成的首頁圖（home_<變體>.webp，一模一樣），所以中間的入口、走路節點、殘影、月亮、雨雪、轉場…座標全部照舊，不用換算。
   只在千秋時光之苑（07y hbIsCl）、用原圖（不是 iPad 寬版 p34／l1610）、而且這個變體有長卷（HMP_PANO）時才打開；沒有就完全照舊單張。變體照 07z 開頁當下 07w7 sw7HomeWx() 算的那張（季節、夜景）。
   做法：左右兩屏是 .home-page（P）裡的兩張圖（.hmp-w，各多蓋中間那屏靠邊 12.5%＝長卷接縫的融接帶，寬 112.5%，跟著 P 一起被 07t3 補滿、07fl 排版、07x 縮放），P 不再裁邊（overflow:visible），由外面那層 .zm-wrap 裁。
     鏡頭＝P 的 style.left（左屏＝+P 寬、右屏＝-P 寬）：不用 transform，底部那條 position:fixed 的大按鈕才不會跟著跑；07z hmClamp、07t3 ttFill 量標籤時扣掉這個位移。
     座標：照中間那一屏的 %，左屏是 -100～0、右屏是 100～200（長卷像素 x → (x-768)/768×100）。
   鏡頭怎麼動：
     ① 走路角色（07w）走過橋頭（左邊木板 x＜-6、右邊木板 x＞106）鏡頭自動滑過去；走回來（x＞-1／x＜101）滑回中間。約 0.75 秒；減少動態時直接切。
     ② 手指左右滑（沒放大時；直向照舊捲頁）、滑鼠拖：放開吸附到三屏之一（拖超過 18% 寬或甩一下就換屏）。從畫面左右邊緣 24px 內起手的不接（讓給系統返回手勢）。兩指縮放交給 07x（放大後可以拖到左右兩屏：zmPage 傳 ext）。
     ③ 左右邊各一顆「‹」「›」按鈕（無障礙：不能只能滑；旁白念「往左看：西市」等）。中間那屏橋頭原本的「🏮 西市」「🔭 觀星臺」（07xsm／07gxt，照各自解鎖條件）改成「← 西市」「觀星臺 →」，點了把鏡頭滑過去。
     ④ 鍵盤、旁白移到另一屏的入口，鏡頭跟過去。返回首頁時停在上次那一屏（HMP_LAST，同一次開 App 內）。
   左屏「🏮 西市」標在市門上方、右屏「🔭 觀星臺」標在渾儀上方（標籤只放大字），解鎖條件照 07xsm xsmOpen、07gxt gxtOpen；沒解鎖那一屏照樣看得到建築、不放標籤。點了角色走過橋再進 #/ximarket、#/guanxing。
   路網（HMP_WALK，量 pano_full_day.png）：左岸告示牌 brd → 平台左緣 → 木板橋 → 西市市門前；右岸 rs → 右邊書頁平台 → 木板橋到觀星臺石牆下（木板盡頭就是入口，不穿欄杆上臺）。
   季節／夜景的飄雲、晨昏色、夜色、雨霧那幾層（07w7 .sw7-fx 的 cl／tint／night／tone／mist）照抄一份蓋到左右兩屏（飄雲對齊動畫時間）；雨絲雪點（畫布）只在中間那屏。
   左右邊的「‹」「›」放在雲弈閣、今日推薦兩個標籤中間的高度；中間那屏有箭頭標籤時，同方向的按鈕旁白不重複念（aria-hidden、不進 Tab），手指照樣點得到。
   手機橫放（07t3 側欄模式）外框只露出圖那一欄；桌面置中（r07-fit）左右兩屏露在兩旁（寬螢幕多看到一點）。iPad 寬版圖（p34／l1610）不開長卷，照舊。
   純計算 hmpVar／hmpSrc／hmpScr／hmpFollow／hmpSnap／hmpWalk 不碰 DOM，測試 xiangqi-lab/tools/test-home-pano.js 用 vm 跑 */
const HMP_ON=true,HMP_IMGV="1114";   /* 圖的版本：同檔名換圖時改掉，手機才會重抓 */
/* 有長卷的首頁變體（07w7 sw7HomeWx 的回傳；沒有回傳＝classic）。tools/homemap_pano.py 最後會印出該有哪些 */
const HMP_PANO={classic:1,classic_spring:1,classic_spring_night:1,classic_summer:1,classic_summer_night:1,classic_autumn:1,classic_autumn_night:1,classic_winter:1,classic_winter_night:1};   /* 11/14 九張到齊；新增變體先跑 tools/homemap_pano.py 再加進來，沒加的變體照舊單張 */
const HMP_MS=750;   /* 鏡頭滑一屏的時間（毫秒） */
/* 左右兩屏的入口：[id, 大字, 旁白, 左%, 上%, 哪一屏, 去哪]（量 pano_full_day.png，換算成中間那屏的 %） */
const HMP_SIDE=[["hmpXsm","🏮 西市","西市",-31,27,-1,"#/ximarket"],["hmpGxt","🔭 觀星臺","觀星臺",134,31,1,"#/guanxing"]];
/* 中間那屏橋頭的入口（07xsm、07gxt 放的）改成箭頭：[id, 大字, 旁白, 往哪一屏] */
const HMP_ARROW=[["hmXsm","← 西市","往左看：西市",-1],["hmGxt","觀星臺 →","往右看：觀星臺",1]];
/* 路網延伸（腳底，%）：xr＝點空地走路的左右範圍（07w） */
const HMP_WALK={xr:[-100,200],dmax:2.2,
  N:{lbr:[-3,58],lp1:[-14,56.8],lp2:[-26,56.5],mk:[-33,55.5],m2:[-50,58],rp0:[92,60.5],rp1:[103,59.8],rp2:[116,60.4]},
  E:"brd-lbr lbr-lp1 lp1-lp2 lp2-mk mk-m2 rs-rp0 rp0-rp1 rp1-rp2",
  HS:{hmpXsm:["mk",-31,40,"bow"],hmpGxt:["rp2",134,44,"bow"]}};
const HMP_CAM={lIn:-6,lOut:-1,rIn:106,rOut:101};   /* 鏡頭跟角色：走到 x＜lIn 往左、x＞rIn 往右；在左屏走回 x＞lOut、在右屏走回 x＜rOut 回中間 */
const HMP_BAD={};   /* 這次開 App 載不到的長卷（退回單張，不再試） */
let HMP_LAST=0;   /* 上次停在哪一屏（-1 西市、0 中間、1 觀星臺）；只記在記憶體 */
/* ---------- 純計算 ---------- */
/* 這一頁該用哪個長卷：hk＝07z 寬版代號（有＝不用）、wv＝07w7 變體（空＝classic）、cl＝千秋時光之苑；回傳變體名或 "" */
function hmpVar(hk,wv,cl){if(!HMP_ON||hk||!cl)return"";const v=wv||"classic";return HMP_PANO[v]&&!HMP_BAD[v]?v:""}
const hmpSrc=(v,s)=>`data/homemap/home_${v}_pano_${s}.webp?v=${HMP_IMGV}`;
/* x%（中間那屏的 %）在哪一屏 */
const hmpScr=x=>x<0?-1:x>100?1:0;
/* 鏡頭跟角色（有一點黏性，站在橋頭附近不會來回晃）：x＝角色腳底 %、cur＝上次算的那一屏 */
function hmpFollow(x,cur){if(!isFinite(x))return cur||0;if(x<HMP_CAM.lIn)return-1;if(x>HMP_CAM.rIn)return 1;if(cur===-1)return x>HMP_CAM.lOut?0:-1;if(cur===1)return x<HMP_CAM.rOut?0:1;return 0}
/* 手指放開：i0 起手那一屏、dx 拖了多少 px（往右拖＝看左邊）、w 一屏寬、v 放手時的速度 px/ms → 吸附到哪一屏 */
function hmpSnap(i0,dx,w,v){let d=0;if(w>0&&Math.abs(dx)>w*.18)d=dx>0?-1:1;else if(Math.abs(v||0)>.45&&Math.abs(dx)>16)d=v>0?-1:1;return Math.max(-1,Math.min(1,(i0||0)+d))}
/* 首頁的走路座標表加上左右兩屏 */
function hmpWalk(c){return Object.assign({},c,{xr:HMP_WALK.xr,dmax:HMP_WALK.dmax,N:Object.assign({},c.N,HMP_WALK.N),E:(c.E||"")+" "+HMP_WALK.E,HS:Object.assign({},c.HS,HMP_WALK.HS),_e:null})}
const hmpEase=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
/* ---------- 畫面 ---------- */
function hmpCss(){if(document.getElementById("hmpCss"))return;const s=document.createElement("style");s.id="hmpCss";s.textContent=`
.home-page.hmp-on{overflow:visible}
.hmp-w{position:absolute;top:0;width:112.5%;height:100%;overflow:hidden}.hmp-w.l{left:-100%}.hmp-w.r{left:87.5%}
.hmp-w>img{display:block;width:100%;height:100%}.hmp-fx{position:absolute;top:0;bottom:0;width:88.889%;pointer-events:none;overflow:hidden}.hmp-w.l>.hmp-fx{left:0}.hmp-w.r>.hmp-fx{right:0}
.hmp-nav{position:absolute;top:calc(34.7% - 24px);z-index:7;width:34px;height:48px;margin:0;padding:0;border:0;border-radius:12px;background:rgba(24,18,12,.5);box-shadow:0 0 0 1px rgba(214,176,92,.55),0 2px 8px rgba(0,0,0,.3);color:#fff6e0;font:900 24px/1 var(--serif,serif);cursor:pointer;-webkit-tap-highlight-color:transparent;opacity:.82}
.hmp-nav[hidden]{display:none}.hmp-nav:active{transform:scale(.94)}.hmp-nav:focus-visible{outline:2px solid #f2c94c;outline-offset:2px;opacity:1}
.hmp-nav::before{content:"";position:absolute;inset:-6px -5px}`;document.head.append(s)}
const hmpRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const hmpOn=P=>!!(P&&P.dataset&&P.dataset.hmp);
const hmpBox=P=>P.parentNode&&P.parentNode.classList&&P.parentNode.classList.contains("zm-wrap")?P.parentNode:null;
/* 07z homeMap 建好 P 就呼叫：算這一頁用不用長卷；用＝放左右兩屏、鏡頭停在上次那一屏 */
function hmpInit(P,hk,wv){if(!P)return;P._hmpWv=wv||"";P.dataset.hmp="";let cl=false;try{cl=typeof hbIsCl==="function"&&hbIsCl()}catch(e){}
  const v=hmpVar(hk,wv,cl);if(v)hmpWings(P,v);P._hmpI=v?HMP_LAST:0;hmpPlace(P)}
/* 放左右兩屏的圖（載不到＝這個變體不用長卷，07z hmwSet 原地退回單張） */
function hmpWings(P,v){hmpCss();P.dataset.hmp=v;P.classList.add("hmp-on");
  for(const s of["l","r"]){let w=P.querySelector(":scope>.hmp-w."+s);if(!w){w=document.createElement("div");w.className="hmp-w "+s;w.setAttribute("aria-hidden","true");w.innerHTML='<img alt="" draggable="false"><div class="hmp-fx"></div>';
      if(s==="r"){const l=P.querySelector(":scope>.hmp-w.l");if(l)l.after(w);else P.prepend(w)}else P.prepend(w)}   /* 放在最前面：兩屏的圖各多蓋中間那屏靠邊 12.5%（季節長卷接縫的融接），殘影、雨雪、標籤都在它上面 */
    const wi=w.querySelector("img");wi.onerror=()=>{HMP_BAD[v]=1;try{if(P.isConnected&&typeof hmwSet==="function")hmwSet(P,P.dataset.hmw||"")}catch(e){}};if(wi.getAttribute("src")!==hmpSrc(v,s))wi.src=hmpSrc(v,s)}
  hmpFxSync(P)}
function hmpUnwings(P){P.dataset.hmp="";P.classList.remove("hmp-on");P.querySelectorAll(":scope>.hmp-w").forEach(e=>e.remove());P._hmpI=0;P.style.left=""}
/* 07z hmwSet（轉向、改視窗大小換寬版／原圖）在重掛走路角色之前呼叫：寬版＝收掉；原圖＝有長卷再打開 */
function hmpSet(P,k){if(!P)return;let cl=false;try{cl=typeof hbIsCl==="function"&&hbIsCl()}catch(e){}const v=hmpVar(k,P._hmpWv,cl);if(v===(P.dataset.hmp||""))return;
  if(v){hmpWings(P,v);P._hmpI=HMP_LAST}else hmpUnwings(P);hmpPlace(P);try{hmpLabels(P)}catch(e){}hmpNavUpd(P)}
/* 07z homeMap 傳給 07x zmPage：放大後可以拖到左右兩屏 */
function hmpZoomOpt(P){return{ext:()=>{if(!hmpOn(P))return null;const w=P.offsetWidth;return{l:w,r:w}}}}
/* 鏡頭：P 的 style.left；i＝-1／0／1 */
function hmpPlace(P){const i=hmpOn(P)?P._hmpI||0:0,w=P.offsetWidth;P.style.left=i&&w?Math.round(-i*w)+"px":"";hmpLayout(P)}
function hmpCam(P,i,anim){if(!P||!P.isConnected)return;i=hmpOn(P)?Math.max(-1,Math.min(1,i|0)):0;const w=P.offsetWidth,to=-i*w,from=parseFloat(P.style.left)||0;P._hmpI=i;HMP_LAST=i;
  cancelAnimationFrame(P._hmpA||0);P._hmpA=0;
  const done=()=>{P.style.left=i?Math.round(to)+"px":"";hmpNavUpd(P);try{if(typeof r07HitSoon==="function")r07HitSoon(60)}catch(e){}};
  if(!anim||hmpRM()||!w||Math.abs(to-from)<1){done();return}
  const t0=performance.now(),D=HMP_MS*Math.min(1.2,Math.max(.5,Math.abs(to-from)/w));
  const st=now=>{if(!P.isConnected)return;const u=Math.min(1,(now-t0)/D);P.style.left=(from+(to-from)*hmpEase(u)).toFixed(1)+"px";if(u<1)P._hmpA=requestAnimationFrame(st);else{P._hmpA=0;done()}};P._hmpA=requestAnimationFrame(st)}
/* 07t3 側欄模式（手機橫放：圖靠左、右邊是入口選單）只露出圖那一欄；鄰屏按鈕貼著圖的左右邊（桌面置中時也是） */
function hmpLayout(P){const C=hmpBox(P);if(!C)return;const V=document.getElementById("view"),w=P.offsetWidth,base=P.offsetLeft-(parseFloat(P.style.left)||0),cw=C.clientWidth;
  C.style.clipPath=hmpOn(P)&&V&&V.classList.contains("r07-side")?`inset(0 ${Math.max(0,Math.round(cw-(base+w)))}px 0 ${Math.max(0,Math.round(base))}px)`:"";
  const L=Math.max(0,base),R=Math.min(cw,base+w);C.querySelectorAll(":scope>.hmp-nav").forEach(b=>{if(b.classList.contains("l"))b.style.left=Math.round(L+4)+"px";else b.style.left=Math.round(R-38)+"px"})}
/* 鄰屏按鈕：中間＝‹ 西市、› 觀星臺；左屏只有 ›、右屏只有 ‹（回中間）。上下放在雲弈閣（25.5%）和今日推薦（44%）兩個標籤點選範圍的正中間（34.7%），375×667、390×844 都不疊到 */
function hmpNavUpd(P){const C=hmpBox(P);if(!C)return;const on=hmpOn(P),i=P._hmpI||0,xs=!!P.querySelector("#hmpXsm,#hmXsm"),gx=!!P.querySelector("#hmpGxt,#hmGxt");
  for(const b of C.querySelectorAll(":scope>.hmp-nav")){const l=b.classList.contains("l"),show=on&&(l?i>-1:i<1);b.hidden=!show;
    b.setAttribute("aria-label",l?(i===1?"往左看：回到苑中":"往左看"+(xs?"：西市":"")):(i===-1?"往右看：回到苑中":"往右看"+(gx?"：觀星臺":"")));
    /* 中間那屏橋頭已經有「← 西市」「觀星臺 →」箭頭（同一件事）：這顆按鈕旁白、Tab 不再念一次，手指照樣點得到 */
    const q=P.querySelector(l?":scope>#hmXsm":":scope>#hmGxt"),dup=on&&i===0&&!!q&&!q.hidden;if(dup){b.setAttribute("aria-hidden","true");b.tabIndex=-1}else{b.removeAttribute("aria-hidden");b.removeAttribute("tabindex")}}}
/* 左右兩屏的入口、中間那屏的箭頭（照 07xsm／07gxt 的解鎖條件；長卷關掉時還原） */
const hmpOpen=id=>{try{return id==="hmpXsm"?typeof xsmOpen==="function"&&xsmOpen():typeof gxtOpen==="function"&&gxtOpen()}catch(e){return false}};
const hmpSeen=id=>{try{return!!store.get(id==="hmpXsm"?"xsmSeen":"gxtSeen",0)}catch(e){return true}};
function hmpLabels(P){const on=hmpOn(P);
  for(const[id,t,al,d]of HMP_ARROW){const b=P.querySelector("#"+id);if(!b)continue;
    /* 11/14 開發者：中間橋頭這兩顆「← 西市」「觀星臺 →」太佔版面，長卷開著時藏起來，只靠兩側 ‹ › 小箭頭指引左右還有路 */
    if(on){if(!b._hmpO)b._hmpO={x:b.hidden};b.hidden=true}
    else if(b._hmpO){b.hidden=b._hmpO.x;delete b._hmpO}}
  for(const s of HMP_SIDE){const want=on&&hmpOpen(s[0]);let b=P.querySelector("#"+s[0]);if(!want){if(b)b.remove();continue}if(b)continue;
    b=document.createElement("button");b.type="button";b.id=s[0];b.className="shp-spot hmp-side"+(hmpSeen(s[0])?"":" hot");b.style.left=s[3]+"%";b.style.top=s[4]+"%";b.setAttribute("aria-label",s[2]);b.innerHTML=`<b>${esc(s[1])}</b>`;
    b.onclick=e=>{e.stopPropagation();vibrate(5);location.hash=s[6]};
    /* 旁白、Tab：中間那屏的入口念完，再念左屏西市、右屏觀星臺（底部那一條照舊最後） */
    const mids=P.querySelectorAll(":scope>.shp-spot:not(.hmp-side)"),after=s[0]==="hmpGxt"&&P.querySelector(":scope>#hmpXsm")||mids[mids.length-1]||null;
    if(after)after.after(b);else P.insertBefore(b,P.querySelector(":scope>.hm-go-bar"))}
  hmpNavUpd(P)}
/* 季節、晨昏、夜色、雨霧、飄雲那幾層（07w7 .sw7-fx）照抄到左右兩屏；雨絲雪點的畫布不抄。
   飄雲（.sw7-cl）的花紋每一屏寬重複一次，抄過去的那份把動畫時間對齊原本那份，接縫兩邊的雲才連得起來 */
function hmpFxSync(P){const fx=P.querySelector(":scope>.sw7-fx"),S=fx?[...fx.querySelectorAll(":scope>.sw7-cl,:scope>.sw7-night,:scope>.sw7-tone,:scope>.sw7-tint,:scope>.sw7-mist")]:[],h=S.map(e=>e.outerHTML).join("");
  P.querySelectorAll(":scope>.hmp-w>.hmp-fx").forEach(f=>{if(f.innerHTML!==h)f.innerHTML=h;
    try{[...f.children].forEach((c,i)=>{const o=S[i];if(!o||!c.classList.contains("sw7-cl")||!o.getAnimations||!c.getAnimations)return;const a=o.getAnimations()[0],b=c.getAnimations()[0];if(a&&b&&a.currentTime!=null&&Math.abs((b.currentTime||0)-a.currentTime)>50)b.currentTime=a.currentTime})}catch(e){}})}
/* 拖曳、跟角色、焦點、按鈕（每個 P 掛一次） */
function hmpCtl(P){if(P._hmpCtl)return;P._hmpCtl=1;const C=hmpBox(P)||P;hmpCss();
  if(C!==P)for(const d of[-1,1]){const b=document.createElement("button");b.type="button";b.className="hmp-nav "+(d<0?"l":"r");b.hidden=true;b.innerHTML=`<span aria-hidden="true">${d<0?"‹":"›"}</span>`;
    b.onclick=e=>{e.stopPropagation();vibrate(5);hmpCam(P,(P._hmpI||0)+d,true)};C.append(b)}
  let D=null,sup=0;const zs=()=>C.zm&&C.zm.s||1,lim=v=>{const w=P.offsetWidth,m=Math.max(0,Math.abs(v)-w);return Math.sign(v)*(Math.min(Math.abs(v),w)+m*.3)};
  const start=(x,y,ed)=>{if(!hmpOn(P)||zs()>1.001){D=null;return}D={x0:x,y0:y,t:performance.now(),l0:parseFloat(P.style.left)||0,i0:P._hmpI||0,mv:0,no:!!ed,lx:x,lt:performance.now(),v:0}};
  const move=(x,y,e)=>{if(!D||D.no)return false;const dx=x-D.x0,dy=y-D.y0;if(!D.mv){if(Math.hypot(dx,dy)<8)return false;if(Math.abs(dx)<Math.abs(dy)*1.2||zs()>1.001){D.no=1;return false}D.mv=1;cancelAnimationFrame(P._hmpA||0);P._hmpA=0}
    const now=performance.now();if(now>D.lt)D.v=(x-D.lx)/(now-D.lt);D.lx=x;D.lt=now;P.style.left=lim(D.l0+dx).toFixed(1)+"px";if(e&&e.cancelable)e.preventDefault();return true};
  const end=x=>{const d=D;D=null;if(!d||!d.mv)return;sup=Date.now()+450;hmpCam(P,hmpSnap(d.i0,x-d.x0,P.offsetWidth,d.v),true)};
  C.addEventListener("touchstart",e=>{const t=e.touches;if(t.length!==1){if(D&&D.mv){const d=D;D=null;hmpCam(P,d.i0,true)}else D=null;return}start(t[0].clientX,t[0].clientY,t[0].clientX<24||t[0].clientX>innerWidth-24)},{passive:true});
  C.addEventListener("touchmove",e=>{if(!D)return;if(e.touches.length!==1){const d=D;D=null;if(d.mv)hmpCam(P,d.i0,true);return}move(e.touches[0].clientX,e.touches[0].clientY,e)},{passive:false});
  const tend=e=>{if(!D||e.touches.length)return;const c=e.changedTouches&&e.changedTouches[0];end(c?c.clientX:D.lx)};C.addEventListener("touchend",tend);C.addEventListener("touchcancel",tend);
  C.addEventListener("pointerdown",e=>{if(e.pointerType!=="mouse"||e.button!==0||e.target.closest(".hmp-nav,.zm-rs"))return;start(e.clientX,e.clientY,false)});
  C.addEventListener("pointermove",e=>{if(!D||e.pointerType!=="mouse")return;const was=D.mv;if(move(e.clientX,e.clientY,null)&&!was)try{C.setPointerCapture(e.pointerId)}catch(err){}});
  const pup=e=>{if(e.pointerType!=="mouse"||!D)return;end(e.clientX)};C.addEventListener("pointerup",pup);C.addEventListener("pointercancel",pup);
  /* 點左右兩屏的入口（側欄選單、旁白轉過來的點選，鏡頭還在別屏）：角色開始走的同時鏡頭就滑過去，不等走過橋頭 */
  C.addEventListener("click",e=>{const b=e.target.closest&&e.target.closest(".hmp-side");if(!b||!hmpOn(P)||sup>Date.now())return;const i=hmpScr(parseFloat(b.style.left));if(i!==(P._hmpI||0))hmpCam(P,i,true)},true);
  /* 拖過放開的那一下不算點選（比 07w 點哪走哪、入口都早） */
  const kill=e=>{if(!C.isConnected){document.removeEventListener("click",kill,true);return}if(sup>Date.now()&&C.contains(e.target)){sup=0;e.stopPropagation();e.preventDefault()}};document.addEventListener("click",kill,true);
  /* 鍵盤、旁白移到另一屏的入口：鏡頭跟過去 */
  P.addEventListener("focusin",e=>{if(!hmpOn(P))return;const b=e.target.closest&&e.target.closest(".shp-spot");if(!b||!P.contains(b))return;const x=parseFloat(b.dataset.ttL!=null?b.dataset.ttL:b.style.left);if(!isFinite(x))return;const i=hmpScr(x);if(i!==(P._hmpI||0))hmpCam(P,i,true)});
  /* 走路角色走過橋頭：鏡頭跟過去（看 07w 每格寫的 translate，跟 07y hbHide 一樣換成 %） */
  let box=null,mo=null,ch=null;const bind=()=>{const b=P.querySelector(":scope>.shw");if(b===box)return;if(mo)mo.disconnect();box=b;ch=null;if(!b)return;
    mo=new MutationObserver(()=>{if(!box.isConnected||!P.isConnected){mo.disconnect();return}const m=/translate\(([-\d.]+)px/.exec(box.style.transform),W=P.clientWidth;if(!m||!W)return;const x=+m[1]/W*100;
      if(ch==null){ch=hmpFollow(x,hmpScr(x));return}const n=hmpFollow(x,ch);if(n===ch)return;ch=n;if(hmpOn(P)&&!D&&n!==(P._hmpI||0))hmpCam(P,n,true)});mo.observe(b,{attributes:true,attributeFilter:["style"]})};
  /* 07w7 換季、晨昏、雨霧（.sw7-fx 晚一點才放進來）：那一層有變就照抄到左右兩屏 */
  let fx=null,m3=null;const fxBind=()=>{const f=P.querySelector(":scope>.sw7-fx");if(f===fx)return;if(m3)m3.disconnect();fx=f;hmpFxSync(P);if(!f)return;
    m3=new MutationObserver(()=>{if(!P.isConnected){m3.disconnect();return}if(m3.q)return;m3.q=requestAnimationFrame(()=>{m3.q=0;hmpFxSync(P)})});m3.observe(f,{childList:true,attributes:true,subtree:true,attributeFilter:["class","style"]})};
  try{const m2=new MutationObserver(()=>{if(!P.isConnected){m2.disconnect();return}bind();fxBind()});m2.observe(P,{childList:true})}catch(e){}bind();fxBind();
  /* 圖框大小變了（補滿高度、轉向、側欄）：鏡頭照屏數重擺 */
  if(window.ResizeObserver){const ro=new ResizeObserver(()=>{if(!P.isConnected){ro.disconnect();return}if(!D&&!P._hmpA)hmpPlace(P);else hmpLayout(P)});ro.observe(P);if(C!==P)ro.observe(C)}
  hmpNavUpd(P);hmpPlace(P)}
/* 07xsm、07gxt 放好橋頭的入口之後（它們也包 Home）再整理標籤、掛手勢 */
function hmpMount(v){const P=v&&v.querySelector(".home-page");if(!P)return;hmpLabels(P);hmpCtl(P)}
if(typeof Home==="function"){const f0=Home;Home=function(v,hub){const r=f0.apply(this,arguments);try{if(!hub)hmpMount(v)}catch(e){}return r}}
