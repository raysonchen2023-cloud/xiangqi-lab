/* ================= 場景入口標籤防重疊（11/13 hspx 1098 開發者 iPhone 截圖「fix overlap issue」）=================
   設定房間（07s2）等滿版場景的入口標籤 .shp-spot 是照圖上百分比座標放的；英文字比較長（Board preview／Font and language／🔒 疊成一團），
   iPad、摺疊機這些比例不同的螢幕也可能疊到。這裡不改各場景的座標表，畫好之後量一次：兩個標籤的框有交疊就上下推開（各推一半、留 4px 縫），
   推到場景頁上下緣外面就整組往內收；只用 CSS 的 translate 屬性（跟 transform 的置中、按下縮放、07z hmClamp 的 marginLeft 互不干擾）。
   重算時機：場景頁出現、標籤字變了（07i18n 換英文）、轉向／改視窗大小、字型載入完。從「目前位置扣掉現在的推移量」算原位，值有變才寫，不會抖。 */
function spfFit(P){const bs=[...P.querySelectorAll(".shp-spot")].filter(b=>b.getClientRects().length);if(bs.length<2)return 0;
  const pr=P.getBoundingClientRect(),k=P.offsetHeight?pr.height/P.offsetHeight:1;if(pr.height<20||!k)return 0;
  /* 11/13 大螢幕滿版（07fl）：iPad 直向圖填滿寬度、上下裁掉一點時，推回的範圍是「看得到的那一段」，不是整張圖 */
  const vb=typeof xflVis==="function"?xflVis(P,pr):null,VT=vb?vb.t:pr.top,VB=vb?vb.b:pr.bottom;
  const Q=bs.map(b=>{const r=b.getBoundingClientRect(),d=+b.dataset.spfY||0;return{b,x:r.left,y:r.top-d*k,w:r.width,h:r.height,d0:d,dy:0}}).filter(q=>q.w>1&&q.h>1);
  const G=4;for(let it=0;it<24;it++){let mv=false;
    for(let i=0;i<Q.length;i++)for(let j=i+1;j<Q.length;j++){const a=Q[i],c=Q[j],ox=Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x);if(ox<=1)continue;
      const ay=a.y+a.dy,cy=c.y+c.dy,oy=Math.min(ay+a.h,cy+c.h)-Math.max(ay,cy);if(oy<=-G+0.5)continue;
      const s=(oy+G)/2,up=ay<cy||(ay===cy&&a.x<c.x)?a:c,dn=up===a?c:a;up.dy-=s;dn.dy+=s;mv=true}
    for(const q of Q){const t=q.y+q.dy,lo=VT+2,hi=VB-q.h-2;if(t<lo){q.dy+=lo-t;mv=true}else if(t>hi&&hi>lo){q.dy-=t-hi;mv=true}}
    if(!mv)break}
  let n=0;for(const q of Q){const d=Math.round(q.dy/k*10)/10;if(Math.abs(d-q.d0)<0.5)continue;n++;if(Math.abs(d)<0.5){q.b.style.translate="";delete q.b.dataset.spfY}else{q.b.style.translate=`0 ${d}px`;q.b.dataset.spfY=d}}
  return n}
/* hspx 開發者 11/13「盤查圖示和文字換行的問題，這樣很醜，直接一行，但也要避免跟別人重疊的邊界風險」：星槎甲板（07f .shp-map.full）的入口 .shp-hs
   改成圖示和字同一行（m.css .shp-map img:not(.eic)）以後變寬，可能跟旁邊的疊到。星槎標籤的 translate 已經給 07w 走路抬升、07n 港口視差用，
   左右、上下貼邊由 07f shpMapFit／07x zmShipPush 用 marginLeft、marginTop 收；這裡在它們排完之後，同樣用 marginTop 把互相疊到的上下推開（各推一半、留 4px 縫），
   不推出甲板上下緣（頂端讓開 .shp-cap 標題）。自己加的量記在 data-spf-m，重算時先扣掉，不會越推越遠 */
function spfShip(M){if(!M||!M.isConnected)return 0;const R=M.getBoundingClientRect();if(R.height<20)return 0;const capH=(M.querySelector(".shp-cap")||{}).offsetHeight||0,lo=R.top+capH+8,hi=R.bottom-8;
  const ty=b=>{const p=String(b.style.translate||"").split(/\s+/);return p.length>1?parseFloat(p[1])||0:0};
  const Q=[...M.querySelectorAll(".shp-hs")].filter(b=>b.getClientRects().length).map(b=>{const r=b.getBoundingClientRect(),a=+b.dataset.spfM||0;return{b,x:r.left,y:r.top-a-ty(b),w:r.width,h:r.height,a,dy:0}}).filter(q=>q.w>1&&q.h>1);
  const G=4;for(let it=0;it<24;it++){let mv=false;
    for(let i=0;i<Q.length;i++)for(let j=i+1;j<Q.length;j++){const a=Q[i],c=Q[j],ox=Math.min(a.x+a.w,c.x+c.w)-Math.max(a.x,c.x);if(ox<=1)continue;
      const ay=a.y+a.dy,cy=c.y+c.dy,oy=Math.min(ay+a.h,cy+c.h)-Math.max(ay,cy);if(oy<=-G+0.5)continue;
      const s=(oy+G)/2,up=ay<cy||(ay===cy&&a.x<c.x)?a:c,dn=up===a?c:a;up.dy-=s;dn.dy+=s;mv=true}
    for(const q of Q){const t=q.y+q.dy;if(t<lo){q.dy+=lo-t;mv=true}else if(t+q.h>hi&&hi-q.h>lo){q.dy-=t+q.h-hi;mv=true}}
    if(!mv)break}
  let n=0;for(const q of Q){const d=Math.round(q.dy);if(d===q.a)continue;n++;const base=(parseFloat(q.b.style.marginTop)||0)-q.a,m=base+d;q.b.style.marginTop=m?m+"px":"";if(d)q.b.dataset.spfM=d;else delete q.b.dataset.spfM}
  return n}
if(typeof shpMapFit==="function"){const f0=shpMapFit;shpMapFit=function(v){const r=f0.apply(this,arguments);try{requestAnimationFrame(()=>requestAnimationFrame(()=>{const M=v&&v.querySelector&&v.querySelector(".shp-map.full");if(M){M.querySelectorAll(".shp-hs").forEach(b=>{delete b.dataset.spfM});spfShip(M)}}))}catch(e){}return r}}
if(typeof zmShipPush==="function"){const f1=zmShipPush;zmShipPush=function(M,s){const r=f1.apply(this,arguments);try{if(M&&!(s>1)){M.querySelectorAll(".shp-hs").forEach(b=>{delete b.dataset.spfM});spfShip(M)}}catch(e){}return r}}
function spfAll(){let n=0;document.querySelectorAll(".shp-page").forEach(P=>{try{n+=spfFit(P)}catch(e){}});document.querySelectorAll(".shp-map.full").forEach(M=>{try{n+=spfShip(M)}catch(e){}});return n}
let spfT=0;function spfSoon(ms){clearTimeout(spfT);spfT=setTimeout(()=>{spfAll();requestAnimationFrame(spfAll)},ms==null?120:ms)}
(()=>{try{const mo=new MutationObserver(L=>{for(const m of L){const t=m.target&&(m.target.nodeType===1?m.target:m.target.parentElement);
      if(t&&t.closest&&t.closest(".shp-page,.shp-hs")){spfSoon();return}for(const a of m.addedNodes||[])if(a.nodeType===1&&(a.matches(".shp-page,.shp-map")||a.querySelector&&a.querySelector(".shp-page,.shp-map"))){spfSoon();return}}});
    mo.observe(document.body,{childList:true,subtree:true,characterData:true});
    addEventListener("resize",()=>spfSoon(200));addEventListener("orientationchange",()=>spfSoon(400));
    if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>spfSoon(0));spfSoon(600)}catch(e){}})();
