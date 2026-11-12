/* ================= 🎨 渡口局部淡彩（意見回饋 769：「渡口可否根據目前的水墨風格再上一些色彩，讓玩家下船後，有很鮮明的從星槎來到這個朝代的感覺」）=================
   規劃 story/渡口上色_規劃.md。12 朝渡口（不含 classic 船艙）換成上色版 data/shipmap/port_<朝代>_c.webp：
   Gemini 上淡彩 → tools/portcolor_merge.py 合成（亮度＝原圖墨線、只取顏色並調淡），所以構圖與原圖完全一樣，PORT_SPOT／PORT_SIGHT 不用重量。
   從星槎「⚓ 下船」進來（shipPort）時播「方案 B」：先是原本的黑白水墨，顏色從船頭（左下）像墨暈一樣往岸上暈開約 1.7 秒，入口按鈕暈完才淡入；點一下圖可以跳過。
   不支援 mask-image 的瀏覽器退回「方案 A」（上色層從灰階淡成彩色）；prefers-reduced-motion 直接顯示上色圖、不動畫；從園子／驛站／擂台走回渡口直接顯示上色圖。
   上色圖載入失敗就留原圖。07k-inkfx 的動態設定照原圖的鍵（shipmap/port_<朝代>）借給 _c 用，旗子飄、燈火晃照常。
   由 07f-ship.js 的 Port 呼叫 portColor(v,k)；shipPort 在這裡包一層記下「剛下船」。開關：常數 PORTC_ON。 */
const PORTC_ON=true;
const PORTC_ERAS=["qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];
/* 意見回饋 773（開發者看過 1710 版：「還是沒有抵達當朝代的強烈視覺感，希望漸漸轉為全彩水墨畫風」）：全彩水墨版 data/shipmap/port_<朝代>_f.webp
   （Gemini 重彩上色 → portcolor_merge.py --full：墨線仍是原圖，色塊深淺也跟上色版）。下船時分兩段：先淡彩 _c 從船頭暈開，再整張漸漸轉成全彩 _f，共約 3.5 秒；
   停留與走回來直接顯示 _f。PORTF_ERAS＝已經有 _f 的朝代（11/8 唐宋給開發者看過「濃度可以」，12 朝都做好了）；_f 載入失敗退回 _c、再退回原圖。開關 PORTF_ON。 */
const PORTF_ON=true;
const PORTF_ERAS=["qin","han","sanguo","weijin","nanbei","sui","tang","wudai","song","yuan","ming","qing"];
const PC={at:0,k:null,css:false};
(function(){if(typeof shipPort!=="function")return;const f=shipPort;shipPort=function(k){PC.at=Date.now();PC.k=k;return f.apply(this,arguments)}})();
function pcCss(){if(PC.css)return;PC.css=true;const s=document.createElement("style");s.id="pcCss";
  s.textContent=`.shp-page .pc-col{position:absolute;left:0;top:0;width:100%;height:auto;display:block;pointer-events:none}
.shp-page.pc-run .shp-spot,.shp-page.pc-run .po-sight{opacity:0;pointer-events:none}.shp-page.pc-run .ifx{opacity:0}
.shp-page.pc-in .shp-spot,.shp-page.pc-in .po-sight{animation:pcIn .55s ease both}
@keyframes pcIn{from{opacity:0}to{opacity:1}}`;document.head.append(s)}
function pcIfx(){try{if(typeof ifxData!=="function"||!(typeof ifxOn==="function"&&ifxOn()))return Promise.resolve();
  return ifxData().then(M=>{if(M)for(const e of PORTC_ERAS){const a=M["shipmap/port_"+e];if(a)for(const x of["_c","_f"])if(!M["shipmap/port_"+e+x])M["shipmap/port_"+e+x]=a}}).catch(()=>{})}catch(e){return Promise.resolve()}}
function pcSet(img,src,orig){const L=[].concat(src);let i=0;img.onerror=()=>{i++;if(i<L.length)img.src=L[i];else{img.onerror=null;img.src=orig}};pcIfx();img.src=L[0]}
function portColor(v,k){if(!PORTC_ON||!PORTC_ERAS.includes(k))return;const P=v&&v.querySelector(".shp-page.cq"),img=P&&P.querySelector(":scope>img");if(!img)return;
  const orig=img.getAttribute("src"),src="data/shipmap/port_"+k+"_c.webp",full=PORTF_ON&&PORTF_ERAS.includes(k)?"data/shipmap/port_"+k+"_f.webp":null,arr=PC.k===k&&Date.now()-PC.at<15000;PC.at=0;PC.k=null;
  let rm=false;try{rm=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}
  if(!arr||rm){pcSet(img,full?[full,src]:src,orig);return}
  pcCss();P.classList.add("pc-run");
  /* 回饋 835（開發者 11/9 選：過場點兩下跳過）：上色圖還在載、或等步行小卡收掉的那段（入口按鈕已經藏起來）點圖也能跳過＝直接換成最後那張圖、入口馬上出來 */
  let sk=false;const sk0=e=>{e.stopPropagation();e.preventDefault();if(sk)return;sk=true;P.removeEventListener("click",sk0,true);pcSet(img,full?[full,src]:src,orig);P.classList.remove("pc-run")};P.addEventListener("click",sk0,true);
  const ld=u=>new Promise(r=>{if(!u)return r(null);const i=new Image();i.decoding="async";i.onload=()=>r(u);i.onerror=()=>r(null);i.src=u});
  Promise.all([ld(src),ld(full)]).then(([c,f])=>{if(!P.isConnected||sk)return;if(!c&&!f){P.removeEventListener("click",sk0,true);P.classList.remove("pc-run");return}
    let n=0;const wait=()=>{if(!P.isConnected)return;if(document.querySelector(".walkc")&&n++<40){setTimeout(wait,100);return}setTimeout(()=>{if(sk)return;P.removeEventListener("click",sk0,true);pcRun(P,img,c||f,orig,c&&f)},350)};wait()})}   /* 回饋 835：已經點過跳過就不播 */
function pcRun(P,img,src,orig,full){if(!P.isConnected)return;
  const mkO=u=>{const o=document.createElement("img");o.className="pc-col";o.alt="";o.src=u;return o};
  const o=mkO(src),o2=full?mkO(full):null;img.after(o);if(o2){o2.style.opacity="0";o.after(o2)}
  const fin_src=full||src;
  const sup=p=>{try{return CSS.supports(p,"radial-gradient(#000,transparent)")}catch(e){return false}};
  const mk=sup("mask-image")?"maskImage":sup("-webkit-mask-image")?"webkitMaskImage":null;
  let done=false,raf=0;
  const end=()=>{if(done)return;done=true;cancelAnimationFrame(raf);P.removeEventListener("click",skip,true);
    const fin=()=>{o.remove();if(o2)o2.remove();P.classList.remove("pc-run");P.classList.add("pc-in");setTimeout(()=>P.classList.remove("pc-in"),700)};
    img.addEventListener("load",fin,{once:true});img.addEventListener("error",fin,{once:true});pcSet(img,full?[full,src]:src,orig);if(img.complete&&img.naturalWidth&&img.getAttribute("src")===fin_src)setTimeout(fin,30)};
  const skip=e=>{e.stopPropagation();e.preventDefault();end()};P.addEventListener("click",skip,true);
  const T1=1700,T2=o2?1700:0,t0=performance.now(),ease=t=>1-Math.pow(1-t,2.2),io=t=>t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;
  if(mk)o.style[mk]="radial-gradient(circle at 10% 96%,#000 0%,transparent 0%)";else{o.style.filter="grayscale(1)"}
  const step=now=>{if(done)return;if(!o.isConnected){end();return}const e=now-t0,t=Math.min(1,e/T1);
    if(mk){const r=ease(t)*150;o.style[mk]=t>=1?"none":`radial-gradient(circle at 10% 96%,#000 ${Math.max(0,r-34).toFixed(1)}%,rgba(0,0,0,.55) ${Math.max(0,r-14).toFixed(1)}%,transparent ${r.toFixed(1)}%)`}
    else o.style.filter=`grayscale(${(1-io(t)).toFixed(3)})`;
    if(o2&&e>T1)o2.style.opacity=io(Math.min(1,(e-T1)/T2)).toFixed(3);
    if(e<T1+T2)raf=requestAnimationFrame(step);else end()};raf=requestAnimationFrame(step)}
