/* ================= 幻譜星門・滿版環景的選星頁（開發者 11/15；前綴 gxp／GXP，全域先 grep 過沒撞名）=================
   開發者 11/15（手機選星頁截圖）：「重新繪製滿版環景的幻譜星門讓玩家選」。原本是一張橫幅星圖放在直式畫面上面四分之一，下面一大片空的黑底。
   規劃 story/gemini_app/157（Gemini），開發者選：構圖「深淵凌空」（浮在星門口，整個畫面都是水墨星門）、背景與星球分開。
   畫面：直式（寬 ÷ 高 小於 0.9）時，整個畫面是一圈左右相連的水墨環景（data/gxgate/pano.webp，1752×1376，Gemini 畫三張直幅、tools/gx_gate_pano.py 接成一圈），
     高度填滿、左右拖曳繞一圈。星球是各自一張去背圖（data/gxgate/<代號>.webp，沿用舊星圖的畫，tools/gx_gate_planets.py），由這裡疊上去：
     已得星印＝金色光圈、下一顆要打的＝紫色呼吸光、前一位還沒打贏＝稍暗帶鎖、星軌未通＝灰暗。北辰就是背景上的黑洞；九個全破後，黑洞正對面多一顆「鏡像」。
     順序：從黑洞往右繞一圈——紫淵、太素、天垣、搖光、（對面）、開陽、玉宿、權星、勾陳，最後回到黑洞口的北辰；星軌未通的四顆在下排。
     上面是標題與關閉鍵，下面是一排位置小點（只是指示，不能點）與說明卡（內容、三顆難度鍵跟橫幅版同一份：07gx gxCardHtml／gxCardGo）。
   橫向、平板橫放、電腦（寬 ÷ 高 0.9 以上）照舊用橫幅星圖；環景圖載不到（離線又沒存過）也退回橫幅星圖。
   做法：包住 07gx 的 gxMap（呼叫的地方都不用改）。純計算 gxpOn／gxpGeom／gxpSx／gxpDelta／gxpNext／gxpIds 不碰 DOM，測試 xiangqi-lab/tools/test-gx-gatepano.js 用 vm 跑 */
const GXP_ON=true,GXP_V="1115";   /* 圖的版本：同檔名換圖時改掉，手機才會重抓 */
const GXP_W=1752,GXP_H=1376,GXP_K=1.3;   /* 環景一圈的寬高（像素）；星球畫得比原圖大 1.3 倍，好認也好點 */
/* 每顆星在環景圖上的位置：[球心 x, 球心 y, 去背圖寬, 去背圖高, 球半徑]（像素；北辰＝黑洞，沒有去背圖，半徑是金色光環） */
const GXP_P={ziyuan:[1080,350,248,248,55],taisu:[1290,600,100,100,44],tianyuan:[1500,360,268,268,49],yaoguang:[1670,640,90,90,39],
  kaiyang:[130,560,152,110,40],yuxiu:[300,330,96,96,42],quanxing:[480,600,90,90,39],gouchen:[610,350,114,114,51],beichen:[824,683,0,0,96],
  jiyue:[1110,780,84,84,36],xuanbing:[1460,790,102,102,45],shuchen:[330,780,102,102,45],tengshe:[600,790,84,84,36],mirror:[1745,420,112,112,50]};
const gxpRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
/* 用環景版？直式而且夠高 */
const gxpOn=(vw,vh)=>GXP_ON&&vh>=480&&vw>0&&vw/vh<.9;
const gxpGeom=(vw,vh)=>{const sc=vh/GXP_H;return{sc,W:GXP_W*sc,vw,vh}};
/* 星球球心在畫面上的 x：X＝畫面左緣在環景上的位置；一圈只畫一顆，快要從左邊滑進來時（距離一圈的尾巴不到 m）就先擺到左邊外面 */
const gxpSx=(px,X,G,m)=>{let d=((px*G.sc-X)%G.W+G.W)%G.W;if(d>G.W-m)d-=G.W;return d};
const gxpCenter=(id,G)=>{const p=GXP_P[id];return p?p[0]*G.sc-G.vw/2:0};
const gxpDelta=(from,to,W)=>((to-from+W/2)%W+W)%W-W/2;   /* 環上最短的那一段（正＝往右） */
/* 下一顆要打的：照解鎖順序第一顆還沒拿到星印、也沒被鎖住的；都拿到了＝鏡像（九個全破）或北辰 */
function gxpNext(S,all){for(const id of GX_ORD)if(!S[id]&&!gxLock(id))return id;return all?"mirror":"beichen"}
const gxpIds=all=>GX_ORD.concat(GX_LIST.filter(g=>g.off).map(g=>g.id),all?["mirror"]:[]);
function gxpCss(){if(document.getElementById("gxpCss"))return;const s=document.createElement("style");s.id="gxpCss";s.textContent=`
.gx-ov.gxp{display:block;overflow:hidden;background:#0b0d1c}
.gxp-sky{position:absolute;inset:0;overflow:hidden;background:#0b0d1c 0 0/auto 100% repeat-x;touch-action:none;cursor:grab}
.gxp-p{position:absolute;left:0;top:0;border:0;background:none;padding:0;margin:0;border-radius:50%;display:flex;align-items:center;justify-content:center;-webkit-tap-highlight-color:transparent;will-change:transform}
.gxp-i{display:block;position:relative;z-index:1;pointer-events:none;user-select:none;-webkit-user-drag:none}
.gxp-p::before{content:"";position:absolute;left:50%;top:50%;width:calc(var(--r)*2 + 30px);height:calc(var(--r)*2 + 30px);transform:translate(-50%,-50%);border-radius:50%;pointer-events:none;opacity:0}
.gxp-p.on::before{opacity:1;background:radial-gradient(closest-side,rgba(255,206,96,0) 62%,rgba(255,206,96,.8) 76%,rgba(255,206,96,0) 100%)}
.gxp-p.nx::before{opacity:1;background:radial-gradient(closest-side,rgba(160,120,255,0) 60%,rgba(160,120,255,.78) 76%,rgba(160,120,255,0) 100%);animation:gxpNx 2.2s ease-in-out infinite}
.gxp-p.sel::before{opacity:1;animation:none;background:none;width:calc(var(--r)*2 + 12px);height:calc(var(--r)*2 + 12px);box-shadow:0 0 0 3px #fff,0 0 18px 7px rgba(160,120,255,.85)}
.gxp-p.off .gxp-i{filter:grayscale(.9) brightness(.55)}.gxp-p.lk .gxp-i{filter:saturate(.55) brightness(.85)}
.gxp-l{position:absolute;left:50%;top:calc(50% + var(--r) + 3px);transform:translateX(-50%);z-index:2;white-space:nowrap;pointer-events:none;font:900 clamp(15px,4.4vw,19px)/1.2 var(--serif,serif);color:#fff3cf;
  text-shadow:0 0 2px #05060d,0 0 4px #05060d,0 1px 3px #05060d,1px 0 0 #05060d,-1px 0 0 #05060d,0 -1px 0 #05060d}
.gxp-p.on .gxp-l{color:#ffd76a}.gxp-p.off .gxp-l{color:#b9b3a6}.gxp-l i{font-style:normal;font-size:.8em;margin-left:3px}
@keyframes gxpNx{0%,100%{transform:translate(-50%,-50%) scale(.94);opacity:.55}50%{transform:translate(-50%,-50%) scale(1.06);opacity:1}}
@media (prefers-reduced-motion:reduce){.gxp-p.nx::before{animation:none}}
.gxp-top{position:absolute;left:0;right:0;top:0;z-index:3;padding-bottom:22px;pointer-events:none;background:linear-gradient(rgba(5,6,13,.94),rgba(5,6,13,.62) 62%,rgba(5,6,13,0))}
.gxp-top .gx-x{pointer-events:auto}.gxp-top .gx-say{margin-bottom:0}
.gxp-bot{position:absolute;left:0;right:0;bottom:0;z-index:3;pointer-events:none;background:linear-gradient(rgba(5,6,13,0),rgba(5,6,13,.72) 46%)}
.gxp-bot .gx-card{pointer-events:auto;max-height:44vh;overflow:auto;margin-top:2px}
.gxp-dots{display:flex;justify-content:center;gap:9px;padding:10px 6px 6px}
.gxp-d{width:8px;height:8px;border-radius:50%;background:rgba(241,231,207,.55);box-shadow:0 0 0 1.5px rgba(5,6,13,.85);transition:transform .15s}
.gxp-d.on{background:#ffd76a}.gxp-d.off{background:rgba(140,134,120,.6)}.gxp-d.nx{background:#b58cff}.gxp-d.cur{transform:scale(1.75)}.gxp-d.sel{box-shadow:0 0 0 2px #fff}`;document.head.append(s)}
/* 一顆星的按鈕（S 星印、nxt 下一顆要打的） */
function gxpStar(id,S,nxt){const mir=id==="mirror",g=mir?{n:"第十四顆",t:"第十四顆・鏡像"}:gxGet(id),lk=mir?"":gxLock(id),dn=!mir&&!!S[id],p=GXP_P[id];
  const cls=(dn?" on":g.off?" off":lk?" lk":"")+(id===nxt?" nx":"");
  return`<button class="gxp-p${cls}" type="button" data-gx="${id}" aria-label="${esc(g.t)}${dn?"，已得星印":lk?"，"+esc(lk):""}">${p[2]?`<img class="gxp-i" src="data/gxgate/${id}.webp?v=${GXP_V}" alt="" draggable="false">`:""}<span class="gxp-l">${esc(g.n)}${dn?"<i>✦</i>":lk&&!g.off?"<i>🔒</i>":""}</span></button>`}
function gxpMap(o,flat){o=o||{};gxCss();gxpCss();vibrate(8);const old=document.querySelector(".gx-ov");if(old)old.remove();
  const S=gxSeals(),all=gxAllDone(),ids=gxpIds(all),nxt=gxpNext(S,all),ov=document.createElement("div");ov.className="gx-ov gxp";ov.setAttribute("role","dialog");ov.setAttribute("aria-label","幻譜星門・十三星系");ov.tabIndex=-1;
  const first=!store.get("gxSeen",0);store.set("gxSeen",1);
  const say=o.from==="orb"?`✦ ${esc(first?GX_TXT.gate:GX_TXT.open)}<br>幻影棋客：「${esc(GX_TXT.invite)}」`:`✦ ${esc(all?GX_TXT.allp:o.from==="stele"?GX_TXT.orbit:GX_TXT.open)}`;
  ov.innerHTML=`<div class="gxp-top"><div class="gx-top"><b>🌌 幻譜星門</b><button class="gx-x" type="button" aria-label="離開幻譜星門">✕</button></div><p class="gx-say">${say}</p></div>`+
    `<div class="gxp-sky">${ids.map(id=>gxpStar(id,S,nxt)).join("")}</div>`+
    `<div class="gxp-bot"><div class="gxp-dots" aria-hidden="true">${ids.map(id=>`<span class="gxp-d${S[id]?" on":(gxGet(id)||{}).off?" off":id===nxt?" nx":""}" data-gx="${id}"></span>`).join("")}</div>`+
    `<div class="gx-card" id="gxCard"><p>幻影棋客：「${esc(GX_TXT.pick)}」</p><p class="muted" style="color:#a99f88;font-size:13px">左右拖曳繞一圈，點一顆星看看。打贏一位主宰，下一顆星就會亮。</p></div></div>`;
  document.body.append(ov);
  const sky=ov.querySelector(".gxp-sky"),btns=[...sky.querySelectorAll(".gxp-p")],dots=[...ov.querySelectorAll(".gxp-d")],card=ov.querySelector("#gxCard"),RM=gxpRM();
  let G=gxpGeom(1,1),X=0,drag=null,moved=false,vx=0,raf=0,cur=null,shut=false;
  const size=()=>{G=gxpGeom(ov.clientWidth||innerWidth,ov.clientHeight||innerHeight);
    for(const b of btns){const p=GXP_P[b.dataset.gx],k=G.sc*(p[2]?GXP_K:1),r=p[4]*k,w=Math.max(p[2]*k,r*2,56),h=Math.max(p[3]*k,r*2,56);
      b.style.width=w+"px";b.style.height=h+"px";b.style.setProperty("--r",r+"px");b._w=w;b._h=h;b._y=p[1]*G.sc;const im=b.querySelector(".gxp-i");if(im){im.style.width=p[2]*k+"px";im.style.height=p[3]*k+"px"}}};
  const lay=()=>{const m=190*G.sc*GXP_K;sky.style.backgroundPositionX=(-X)+"px";let best=null,bd=1e9;
    for(const b of btns){const x=gxpSx(GXP_P[b.dataset.gx][0],X,G,m);b.style.transform=`translate3d(${x-b._w/2}px,${b._y-b._h/2}px,0)`;const d=Math.abs(x-G.vw/2);if(d<bd){bd=d;best=b.dataset.gx}}
    for(const d of dots)d.classList.toggle("cur",d.dataset.gx===best)};
  const setX=x=>{X=((x%G.W)+G.W)%G.W;lay()},stop=()=>{cancelAnimationFrame(raf);raf=0};
  const glide=()=>{if(shut||Math.abs(vx)<.02){raf=0;return}setX(X-vx*16);vx*=.94;raf=requestAnimationFrame(glide)};
  const slide=(d,smooth)=>{stop();if(!smooth||RM||Math.abs(d)<2){setX(X+d);return}const x0=X,t0=performance.now();
    const st=now=>{if(shut)return;const u=Math.min(1,(now-t0)/380),e=1-Math.pow(1-u,3);setX(x0+d*e);raf=u<1?requestAnimationFrame(st):0};raf=requestAnimationFrame(st)};
  const goTo=(id,smooth)=>slide(gxpDelta(X,gxpCenter(id,G),G.W),smooth);
  const mv=e=>{if(!drag||e.pointerId!==drag.id)return;const dx=e.clientX-drag.x;if(!moved&&Math.abs(dx)<8)return;moved=true;const now=performance.now(),dt=now-drag.lt;if(dt>0)vx=Math.max(-2.5,Math.min(2.5,.7*vx+.3*((e.clientX-drag.lx)/dt)));drag.lx=e.clientX;drag.lt=now;setX(drag.X0-dx)};
  const up=e=>{if(!drag||e.pointerId!==drag.id)return;drag=null;if(moved){if(!RM&&Math.abs(vx)>.05)raf=requestAnimationFrame(glide);setTimeout(()=>{moved=false},0)}};
  const rs=()=>{if(shut)return;const vw=ov.clientWidth||innerWidth,vh=ov.clientHeight||innerHeight;if(!gxpOn(vw,vh)){close();gxMap(Object.assign({},o,{pick:cur||o.pick}));return}const c=cur||dots.filter(d=>d.classList.contains("cur")).map(d=>d.dataset.gx)[0]||nxt;size();stop();setX(gxpCenter(c,G))};
  const key=e=>{if(e.key==="Escape"){e.preventDefault();close()}else if(e.key==="ArrowRight"||e.key==="ArrowLeft"){e.preventDefault();slide((e.key==="ArrowRight"?1:-1)*G.vw*.5,true)}};
  const close=()=>{if(shut)return;shut=true;stop();removeEventListener("pointermove",mv);removeEventListener("pointerup",up);removeEventListener("pointercancel",up);removeEventListener("resize",rs);ov.remove()};
  sky.addEventListener("pointerdown",e=>{if(e.button)return;stop();drag={x:e.clientX,X0:X,lx:e.clientX,lt:performance.now(),id:e.pointerId};moved=false;vx=0});
  addEventListener("pointermove",mv);addEventListener("pointerup",up);addEventListener("pointercancel",up);addEventListener("resize",rs);
  sky.addEventListener("click",e=>{if(moved){e.stopPropagation();e.preventDefault()}},true);   /* 拖曳放手不算點到星 */
  sky.addEventListener("wheel",e=>{e.preventDefault();stop();setX(X+(Math.abs(e.deltaX)>Math.abs(e.deltaY)?e.deltaX:e.deltaY))},{passive:false});
  ov.addEventListener("keydown",key);
  ov.querySelector(".gx-x").onclick=()=>{vibrate(5);close()};
  const pick=(id,move)=>{vibrate(5);cur=id;for(const b of btns)b.classList.toggle("sel",b.dataset.gx===id);for(const d of dots)d.classList.toggle("sel",d.dataset.gx===id);card.innerHTML=gxCardHtml(id,S);gxCardGo(card,id,close);if(move!==false)goTo(id,true)};
  for(const b of btns){b.onclick=()=>pick(b.dataset.gx);b.addEventListener("focus",()=>{try{if(!drag&&b.matches(":focus-visible"))goTo(b.dataset.gx,true)}catch(e){}})}   /* 用鍵盤走到一顆星＝轉過去看它 */
  size();setX(gxpCenter(o.pick||nxt,G));if(o.pick)pick(o.pick,false);
  /* 背景先載好再換上（還沒到之前是深色底，星球先在）；載不到（離線又沒存過）＝退回橫幅星圖 */
  const src=`data/gxgate/pano.webp?v=${GXP_V}`,im0=new Image();im0.onload=()=>{if(shut)return;sky.style.backgroundImage=`url("${src}")`;ov.classList.add("rdy")};im0.onerror=()=>{if(shut)return;close();flat(o)};im0.src=src}
/* 包住 07gx 的 gxMap：直式用環景版，其他照舊 */
if(typeof gxMap==="function"){const gxpF0=gxMap;gxMap=function(o){let on=false;try{on=gxpOn(innerWidth,innerHeight)}catch(e){}if(!on)return gxpF0.apply(this,arguments);try{return gxpMap(o,gxpF0)}catch(e){try{const x=document.querySelector(".gx-ov.gxp");if(x)x.remove()}catch(_){}return gxpF0.apply(this,arguments)}}}
