/* ================= 大螢幕滿版場景（11/13 開發者「遊戲畫面都要滿版」：iPad 全尺寸、摺疊 iPhone Duo）=================
   原本 07t3 r07Wide 在大螢幕把 768×1376 的直式場景圖縮到剛好等於可用高度、放在正中間（r07-fit），兩側是空白宣紙；橫放矮螢幕是圖靠左＋右邊入口選單（r07-side），右邊也是宣紙。
   這裡不改各場景的座標表、不改 07t3，只包一層 r07Wide／r07Off／ttFill（同一個全域，後載入的蓋掉前面的名字，07x 也是這樣包 shpPx）：
   ① 直向或接近直向（可用寬 ÷ 可用高 ≤ XFL_PORT_MAX，iPad 直向、Duo 攤開直拿、分割畫面）：圖放大到填滿寬度、上下裁一點（P 的 marginTop 往上拉＝裁上面，#view 不給捲＝裁下面）。
      所有入口標籤、可點區都要留在看得到的範圍裡：先量每個可點東西在圖上的高度位置（圖高的比例），從「填滿寬度」往下找最大的放大倍數，讓它們全部擺得進可用高度；
      擺不進就少放大一點（左右留的空隙用 ③ 的模糊底補滿），最少就是原本 r07-fit 的大小，所以不會比原本差。標籤座標還是圖的百分比，點的位置跟器物對得上。
      圖上方的標題條（.shp-cap）、首頁主張紙條（.hm-slogan）跟著看得到的上緣往下移（--xflT）。
   ② 橫向（iPad 橫向、Duo 橫拿、手機橫向、桌面）：照 r07Wide 原本的排法（主圖完整、不裁），只多鋪 ③。
   ③ 模糊底：一個 position:fixed 的 #xflBg 放在 .app 裡、蓋住 #view 的範圍、z-index:-1（畫在 .app 宣紙底之上、#view 內容之下），背景用同一張場景圖（已在快取）放大、模糊、調暗。
      效能：靜態圖層、不動畫、只在換圖／轉向時重設一次；用 filter（模糊自己的內容）不是 backdrop-filter（每幀重算後面），contain:strict 讓它不影響其他排版。
   手機直向（寬 < 600 且比可用高度窄）完全不進來，跟原本一模一樣；07x 兩指縮放、07w 走路、07z hmClamp、07sp 標籤防重疊照舊（07sp 改成量「看得到的範圍」，見 xflVis）。
   開關 XFL_ON；純計算 xflGate／xflPlan 不碰 DOM，自動測試 xiangqi-lab/tools/test-ipad-fill.js 用 vm 跑 */
const XFL_ON=true,XFL_PORT_MAX=0.85,XFL_TOPW=0.5,XFL_STEPS=48;
/* 要不要用 ① 直向填滿：跟 r07Wide 同一個門檻（寬 600 以上或比可用高度寬，而且照寬度放會比可用高度高），再加上「接近直向」 */
function xflGate(vw,av,W,nw,nh){if(!(W>0&&av>=120&&nw>0&&nh>0))return false;if(!(vw>=600||vw>av))return false;if(W*nh/nw-av<2)return false;return W/av<=XFL_PORT_MAX}
/* 純計算：o={W 可用寬, av 可用高, nw/nh 圖原尺寸, off 圖上面還有多少內容（>8＝不能裁上面）, items:[{c 中心在圖高的比例, h 高(px)}]}
   回傳 {w 圖寬, H 圖高, top 裁掉上面幾 px, crop 總共裁幾 px, fill w÷W}；每個東西要看得到中間 min(h/2,30)+6 px（大塊點選區只要中間那段看得到） */
function xflPlan(o){const W=o.W,av=o.av,nw=o.nw||768,nh=o.nh||1376,H0=W*nh/nw,fitH=av,lockTop=(o.off||0)>8,its=(o.items||[]).filter(q=>q&&isFinite(q.c));
  if(!(W>0&&av>0)||H0-av<2)return null;
  const ok=H=>{const mx=H-av;let lo=0,hi=lockTop?0:mx;for(const q of its){const e=Math.min((q.h||0)/2,30)+6,c=Math.max(0,Math.min(1,q.c))*H,t=Math.max(0,c-e),b=Math.min(H,c+e);lo=Math.max(lo,b-av);hi=Math.min(hi,t)}return lo<=hi+0.5?{lo:Math.max(0,lo),hi:Math.max(Math.max(0,lo),hi)}:null};
  let H=fitH,r=null;for(let i=0;i<=XFL_STEPS;i++){const h=H0-(H0-fitH)*i/XFL_STEPS,z=ok(h);if(z){H=h;r=z;break}}
  if(!r){H=fitH;r={lo:0,hi:0}}
  const mx=H-av,top=Math.min(r.hi,Math.max(r.lo,lockTop?0:mx*XFL_TOPW)),w=Math.min(W,H*nw/nh);
  return{w:Math.round(w),H:Math.round(H),top:Math.max(0,Math.round(top)),crop:Math.max(0,Math.round(mx)),fill:Math.round(w/W*1000)/1000}}
/* 量 P 裡所有看得到的可點東西（底部固定那條、走路角色、縮放提示、標題條不算）在圖高的比例；扣掉 07sp 的上下推移 */
const XFL_SEL=".shp-spot,.po-sight,[data-r07m],.pz-go,.ex-bow,.cy,[data-xfl]",XFL_SKIP=".hm-go-bar,.shw,.hm-me,.zm-ex,.zm-tip,.shp-cap";   /* 只量固定的入口和點選區（.cy＝07y 經典世界天上的朝代殘影，點了會說是哪一朝，也算）；旁白泡泡、角色這種會一直出現消失的不算，免得一直重排 */
function xflItems(P,pr){const out=[];if(!pr||!pr.height)return out;
  for(const e of P.querySelectorAll(XFL_SEL)){if(e.closest(XFL_SKIP)||!e.getClientRects().length)continue;const s=getComputedStyle(e);if(s.visibility==="hidden"||s.position==="fixed"||+s.opacity<0.05)continue;
    const r=e.getBoundingClientRect();if(r.width<2||r.height<2)continue;const dy=+(e.dataset&&e.dataset.spfY)||0,c=(r.top-dy+r.height/2-pr.top)/pr.height;if(c<-0.05||c>1.05)continue;out.push({c,h:r.height})}
  return out}
const xflKey=L=>L.map(q=>q.c.toFixed(2)).sort().join(",");
function xflCss(){if(document.getElementById("xflCss"))return;const s=document.createElement("style");s.id="xflCss";s.textContent=`
#xflBg{position:fixed;z-index:-1;overflow:hidden;pointer-events:none;contain:strict;background:#1b1714}
#xflBg>i{position:absolute;inset:-7%;background:center/cover no-repeat;filter:blur(18px) brightness(.68) saturate(.92)}
#view.xfl-bgon{background:none!important}
#view.xfl-clip{overflow:hidden!important}
#view.xfl-port .shp-page.cq.xfl-nar{box-shadow:0 0 22px rgba(20,12,6,.45)}
#view.xfl-port .shp-page .shp-cap{top:var(--xflT,0px)}
#view.xfl-port .shp-page .hm-slogan{top:calc(var(--xflT,0px) + 10px)}`;document.head.append(s)}
/* ③ 模糊底：蓋住 #view 的範圍；圖換了（日夜、季節、雨雪）跟著換 */
function xflBg(V,P,on){let B=document.getElementById("xflBg");
  if(!on||!V||!P){if(B)B.hidden=true;if(V)V.classList.remove("xfl-bgon");return}
  const im=P.querySelector(":scope>img"),src=im&&(im.currentSrc||im.src);if(!src){if(B)B.hidden=true;return}
  xflCss();if(!B){B=document.createElement("div");B.id="xflBg";B.setAttribute("aria-hidden","true");B.append(document.createElement("i"));(V.parentNode||document.body).append(B)}
  if(B.dataset.u!==src){B.firstChild.style.backgroundImage='url("'+src.replace(/"/g,"%22")+'")';B.dataset.u=src}
  const r=V.getBoundingClientRect();Object.assign(B.style,{left:Math.round(r.left)+"px",top:Math.round(r.top)+"px",width:Math.round(r.width)+"px",height:Math.round(V.clientHeight)+"px"});B.hidden=false;B._P=P;V.classList.add("xfl-bgon");
  if(!im.dataset.xflL){im.dataset.xflL="1";im.addEventListener("load",()=>{const b=document.getElementById("xflBg");if(im.isConnected&&b&&!b.hidden)xflBg(V,P,true)})}}
/* 還原 ① 的裁切（每次重排前先還原，再照新的畫面大小算） */
function xflClear(V,P){if(V)V.classList.remove("xfl-port","xfl-clip");if(P){if(P.dataset.xflMt!=null){P.style.marginTop=P.dataset.xflMt;delete P.dataset.xflMt}P.style.removeProperty("--xflT");P.classList.remove("xfl-nar")}}
/* 07sp 用：直向填滿時「看得到的範圍」（client 座標）；其他情況回傳 null（照原本量整張圖） */
function xflVis(P,pr){const V=document.getElementById("view");if(!V||!V.classList.contains("xfl-port")||!V.contains(P))return null;pr=pr||P.getBoundingClientRect();
  const vr=V.getBoundingClientRect(),pb=parseFloat(getComputedStyle(V).paddingBottom)||0;return{t:Math.max(pr.top,vr.top),b:Math.min(pr.bottom,vr.top+V.clientHeight-pb)}}
/* ① 直向填滿：成功回傳 true（r07Wide 就不再排） */
function xflPort(V,P,nw,nh){const vr=V.getBoundingClientRect(),pr=P.getBoundingClientRect(),pb=parseFloat(getComputedStyle(V).paddingBottom)||0,off=pr.top-vr.top+V.scrollTop,av=V.clientHeight-pb-off,W=pr.width,vw=V.clientWidth;
  if(!xflGate(vw,av,W,nw,nh))return false;
  const items=xflItems(P,pr),pl=xflPlan({W,av,nw,nh,off,items});if(!pl)return false;
  if(typeof r07Off==="function")xflR07Off(V);
  if(P.dataset.xflMt==null)P.dataset.xflMt=P.style.marginTop||"";
  Object.assign(P.style,{maxWidth:"none",width:pl.w+"px",marginLeft:Math.round((W-pl.w)/2)+"px",marginTop:(pl.top?-pl.top:0)+"px"});P.style.setProperty("--xflT",pl.top+"px");P.classList.toggle("xfl-nar",pl.w<W-1);
  xflCss();V.classList.add("xfl-port");P._xflKey=xflKey(items);
  {const ex=V.scrollHeight-V.clientHeight;if(ex<=pl.crop-pl.top+30){V.classList.add("xfl-clip");V.scrollTop=0}}   /* 圖下面沒有別的內容（07w 都搬進面板了）才不給捲；有就照舊可以捲 */
  xflBg(V,P,pl.w<W-1);
  if(typeof r07Push==="function")r07Push(V,P);if(typeof spfSoon==="function")spfSoon(0);
  xflWatch(V,P);return true}
/* 標籤晚到（07w9 出口最多等 4 秒、07w4 碼頭）：P 裡增減東西後，可點東西的位置變了才重排一次 */
function xflWatch(V,P){if(P._xflMo||!window.MutationObserver)return;let t=0;const mo=new MutationObserver(()=>{if(!P.isConnected){mo.disconnect();P._xflMo=null;return}clearTimeout(t);t=setTimeout(()=>{if(!P.isConnected||!V.classList.contains("xfl-port"))return;
    const k=xflKey(xflItems(P,P.getBoundingClientRect()));if(k!==P._xflKey&&typeof ttFill==="function")ttFill()},400)});mo.observe(P,{childList:true,subtree:true});P._xflMo=mo}
/* 包住 07t3：r07Off 也收掉模糊底；r07Wide 先試 ①，不行再照原本排並鋪模糊底；ttFill 一開始先還原裁切（它量圖的位置要用沒裁過的） */
let xflR07Off=function(){},xflR07Wide=null;
(()=>{if(!XFL_ON||typeof r07Wide!=="function"||typeof r07Off!=="function"||typeof ttFill!=="function")return;
  const off0=r07Off,wide0=r07Wide,tt0=ttFill;xflR07Off=off0;xflR07Wide=wide0;
  r07Off=function(V){try{xflClear(V,V&&V.querySelector(".shp-page.cq"));xflBg(V,null,false)}catch(e){}return off0.apply(this,arguments)};
  r07Wide=function(V,P,vr,pr,nw,nh){try{xflClear(V,P);xflBg(V,null,false);if(xflPort(V,P,nw,nh))return true;vr=V.getBoundingClientRect();pr=P.getBoundingClientRect()}catch(e){}
    const r=wide0.call(this,V,P,vr,pr,nw,nh);try{xflBg(V,P,!!r&&(V.classList.contains("r07-fit")||V.classList.contains("r07-side")))}catch(e){}return r};
  /* 換頁時 #view 內容整個換掉，ttFill 要 350ms 後才重排：舊圖框一離開就立刻收掉模糊底、還原「不給捲」，新頁不會先閃舊圖、也不會短暫不能捲 */
  try{const V=document.getElementById("view");if(V&&window.MutationObserver)new MutationObserver(()=>{const B=document.getElementById("xflBg");if(B&&!B.hidden&&B._P&&!B._P.isConnected)xflBg(V,null,false);
    if(V.classList.contains("xfl-port")){const P=V.querySelector(".shp-page.cq");if(!P||!P.dataset||P.dataset.xflMt==null)xflClear(V,null)}}).observe(V,{childList:true})}catch(e){}
  ttFill=function(){try{const V=document.getElementById("view"),P=V&&V.querySelector(".shp-page.cq");if(V){xflClear(V,P);if(typeof TABTUBE_ON!=="undefined"&&!TABTUBE_ON)xflBg(V,null,false)}}catch(e){}return tt0.apply(this,arguments)}})();
