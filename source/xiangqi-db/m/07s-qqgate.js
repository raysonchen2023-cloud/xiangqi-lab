/* 🪨 千秋石枰進場「墨滴入局＋十三星芒」（開發者 11/8，Gemini 提的 10 個方案裡選定；第一版「星槎飛到山坡老石桌＋石桌頁」被打掉，#/ship/stone 那一頁拿掉）
   星槎按「🪨 千秋石枰」→ qqFly() 約 3 秒，每次都播完整版，點畫面就跳過，prefers-reduced-motion 直接到擇石門口：
   ① 0～0.85 秒：一滴濃墨從天落到畫面中央（水滴聲），暈開成邊緣不規則的墨色（canvas 程序生成：多層雜訊輪廓＋觸鬚＋周圍小墨點），把星槎畫面洗掉；
   ② 0.85～2.2 秒：墨色與雲霧裡，十三顆朝代石（data/stones/<朝代>.webp，跟擇石門口同一套）從下往上依序亮起，朱紅＋金色光暈，連成一條引路光軌，很淡的星槎剪影（data/shipmap/qq_ship.webp）順著光軌滑過；
   ③ 2.2～3.0 秒：換到擇石門口 #/journey/park（07-legend.js 的 ParkGate，不改），墨色從中央退開露出石桌俯視圖，十三顆石頭各自飛落、嵌進它在擇石門口的實際位置（照真的按鈕量），落定一聲落子聲、微微閃光；最後一格就是擇石門口。
   擇石門口的「‹」照舊回星槎。開關 QQGATE_ON（false＝照舊直接進擇石門口）。由 07f-ship.js 星槎熱點 parks 呼叫 qqGateGo() */
const QQGATE_ON=true;
const QQG_PARK="#/journey/park",QQG_SHIP="data/shipmap/qq_ship.webp";
function qqgCss(){if(document.getElementById("qqgCss"))return;const s=document.createElement("style");s.id="qqgCss";s.textContent=`
.qqg-fly{position:fixed;inset:0;z-index:9998;overflow:hidden;cursor:pointer;transition:opacity .28s ease}
.qqg-fly.out{opacity:0}
.qqg-fly canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.qqg-fly .qqg-mist{position:absolute;inset:-20%;pointer-events:none;opacity:0;background:radial-gradient(ellipse 34% 16% at 28% 30%,rgba(214,204,188,.16),transparent 70%),radial-gradient(ellipse 40% 18% at 70% 52%,rgba(214,204,188,.13),transparent 70%),radial-gradient(ellipse 36% 15% at 36% 74%,rgba(214,204,188,.15),transparent 70%),radial-gradient(ellipse 30% 14% at 78% 18%,rgba(214,204,188,.1),transparent 70%)}
.qqg-fly .qqg-st,.qqg-fly .qqg-sh,.qqg-fly .qqg-fl{position:absolute;left:0;top:0;pointer-events:none;will-change:transform,opacity;opacity:0}
.qqg-fly .qqg-st{object-fit:contain}
.qqg-fly .qqg-st.gl{filter:drop-shadow(0 0 6px rgba(255,214,120,.95)) drop-shadow(0 0 16px rgba(196,48,28,.75))}
.qqg-fly .qqg-st.dim{filter:grayscale(.8) drop-shadow(0 0 6px rgba(220,210,190,.5))}
.qqg-fly .qqg-st.pl{filter:drop-shadow(0 4px 4px rgba(0,0,0,.45))}
.qqg-fly .qqg-sh{width:64px;filter:brightness(0) invert(1) blur(.4px)}
.qqg-fly .qqg-fl{width:110px;height:110px;border-radius:50%;background:radial-gradient(circle,rgba(255,236,170,.85),rgba(255,200,90,.35) 40%,transparent 68%)}
.qqg-fly .tskip{position:absolute;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 14px);z-index:3;border:1px solid rgba(255,236,190,.45);background:rgba(20,16,12,.45);color:#f3e6c8;border-radius:999px;padding:6px 14px;font:inherit}
.qqg-hold .era-c.stone img{opacity:0}.qqg-hold .era-c.stone img.qqg-in{opacity:1;transition:opacity .14s}
`;document.head.append(s)}
/* 小工具：0～1 夾住、緩動、可重現的亂數 */
const qqgC=x=>x<0?0:x>1?1:x,qqgOut=x=>1-Math.pow(1-x,3),qqgIO=x=>x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2,qqgBack=x=>1+2.2*Math.pow(x-1,3)+1.2*Math.pow(x-1,2);
function qqgRnd(seed){let s=seed>>>0||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
/* 一團墨的輪廓係數：低頻起伏＋高頻毛邊＋幾條觸鬚 */
function qqgShape(rnd,amp){const K=[];for(let k=2;k<=26;k++)K.push([k,amp*(rnd()*.9+.1)/Math.pow(k,k>12?.95:.7),rnd()*6.283,(rnd()-.5)*3]);const F=[];for(let j=0;j<7;j++)F.push([rnd()*6.283,.12+rnd()*.28,.05+rnd()*.07]);return{K,F}}
function qqgPath(ctx,cx,cy,R,sh,u,sc,hf){ctx.beginPath();const N=160;for(let i=0;i<=N;i++){const a=i/N*6.283;let f=1;for(const[k,am,ph,w]of sh.K){if(k>12&&!hf)continue;f+=am*Math.sin(k*a+ph+w*u)}
    for(const[fa,fh,fw]of sh.F){let d=Math.abs(a-fa);if(d>3.1416)d=6.283-d;f+=fh*(1-u*.6)*Math.exp(-(d*d)/(fw*fw))}
    const r=Math.max(0,R*f*sc),x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y)}ctx.closePath()}
/* 三層：外圈淡、內圈濃，邊緣像墨在紙上滲開 */
function qqgBlob(ctx,cx,cy,R,sh,u){if(R<=0)return;const a0=ctx.globalAlpha;ctx.globalAlpha=a0*.28;qqgPath(ctx,cx,cy,R,sh,u,1.1,1);ctx.fill();ctx.globalAlpha=a0*.5;qqgPath(ctx,cx,cy,R,sh,u,1.045,1);ctx.fill();ctx.globalAlpha=a0;qqgPath(ctx,cx,cy,R,sh,u,1,0);ctx.fill()}
function qqgSnd(kind){try{if(!store.get("capSound",true)||typeof withAudio!=="function")return;
  if(kind==="clack"){if(typeof moveSound0==="function")withAudio(()=>moveSound0(false));return}
  withAudio(()=>{const t=AC.currentTime+.01,p=(f0,f1,at,vol,d)=>{const o=AC.createOscillator(),g=AC.createGain();o.type="sine";o.frequency.setValueAtTime(f0,t+at);o.frequency.exponentialRampToValueAtTime(f1,t+at+d*.6);g.gain.setValueAtTime(.0001,t+at);g.gain.linearRampToValueAtTime(vol,t+at+.006);g.gain.exponentialRampToValueAtTime(.0001,t+at+d);o.connect(g).connect(AC.destination);o.start(t+at);o.stop(t+at+d+.02)};
    p(1350,520,0,.22,.16);p(1900,900,.07,.08,.12)})}catch(e){}}
/* 星槎熱點「🪨 千秋石枰」 */
function qqGateGo(){if(!QQGATE_ON){location.hash=QQG_PARK;return}qqFly()}
function qqFly(){if(document.querySelector(".travel,.walkc,.qqg-fly"))return;
  let rm=false;try{rm=matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}if(rm){location.hash=QQG_PARK;return}
  qqgCss();const W=innerWidth,H=innerHeight,dpr=Math.min(2,devicePixelRatio||1),rnd=qqgRnd(Date.now()),E=typeof ARENA_ORDER!=="undefined"?ARENA_ORDER:["classic"];
  const ov=document.createElement("div");ov.className="qqg-fly";
  ov.innerHTML=`<canvas></canvas><div class="qqg-mist"></div><img class="qqg-sh" src="${QQG_SHIP}" alt="">${E.map(k=>`<img class="qqg-st gl" src="data/stones/${k}.webp" alt="">`).join("")}${E.map(()=>`<i class="qqg-fl"></i>`).join("")}<button class="tskip">跳過 ›</button>`;
  document.body.append(ov);const cv=ov.querySelector("canvas");cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);
  const n=E.length,P=E.map((k,i)=>[W*(.5+.27*Math.sin(i*.62+.4)),H*(.88-i*(.77/Math.max(1,n-1)))]);
  const S={ov,cv,ctx:cv.getContext("2d"),W,H,dpr,E,P,C:[W/2,H*.46],R0:Math.hypot(W,H)*1.02,ink:qqgShape(rnd,.2),er:qqgShape(rnd,.16),
    sat:Array.from({length:11},()=>({a:rnd()*6.283,d:.16+rnd()*.42,s:.025+rnd()*.05,ts:.08+rnd()*.35,sh:qqgShape(rnd,.22)})),
    lock:E.map(k=>typeof eraLocked==="function"&&eraLocked(k)),st:[...ov.querySelectorAll(".qqg-st")],fl:[...ov.querySelectorAll(".qqg-fl")],sh:ov.querySelector(".qqg-sh"),mist:ov.querySelector(".qqg-mist"),
    tg:null,nav:false,dead:false,paused:false,land:{},snd:{},h0:location.hash};
  S.st.forEach((im,i)=>{if(S.lock[i])im.className="qqg-st dim"});
  const onHash=()=>{if(S.nav&&location.hash===QQG_PARK)return;qqgEnd(S,true)};S.onHash=onHash;addEventListener("hashchange",onHash);
  ov.querySelector(".tskip").onclick=e=>{e.stopPropagation();qqgEnd(S)};ov.onclick=()=>qqgEnd(S);
  ov._seek=t=>{S.paused=true;if(t>=2.2&&!S.nav)qqgNav(S);qqgRender(S,t)};ov._S=S;vibrate(8);
  const t0=performance.now(),step=()=>{if(S.dead)return;if(!S.paused){const t=(performance.now()-t0)/1000;
      if(t>=.28&&!S.snd.drop){S.snd.drop=1;qqgSnd("drop")}if(t>=2.2&&!S.nav)qqgNav(S);qqgRender(S,t);if(t>=3.05){qqgEnd(S);return}}requestAnimationFrame(step)};
  requestAnimationFrame(step)}
/* 換到擇石門口：等 ParkGate 畫好，量每顆石頭的位置，先把真的石頭藏起來 */
function qqgNav(S){S.nav=true;if(location.hash!==QQG_PARK)location.hash=QQG_PARK;let tries=0;
  const look=()=>{if(S.dead)return;const v=document.getElementById("view"),bs=v&&v.querySelectorAll("[data-e]");
    if(location.hash!==QQG_PARK||!bs||!bs.length){if(++tries<80)setTimeout(look,30);return}
    v.classList.add("qqg-hold");S.view=v;S.tg=S.E.map(k=>{const b=v.querySelector(`[data-e="${k}"]`);if(!b)return null;const im=b.querySelector("img"),r=(im||b).getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2,s:im?r.width:56,im}})};
  setTimeout(look,0)}
function qqgEnd(S,away){if(S.dead)return;S.dead=true;removeEventListener("hashchange",S.onHash);
  if(!away&&!S.nav&&location.hash===S.h0){S.nav=true;location.hash=QQG_PARK}
  const rel=()=>{const v=document.getElementById("view");if(v)v.classList.remove("qqg-hold")};setTimeout(rel,40);
  S.ov.classList.add("out");setTimeout(()=>S.ov.remove(),320)}
/* 畫第 t 秒的那一格（也給測試逐格截圖用：ov._seek(t)） */
function qqgRender(S,t){const{ctx,W,H,dpr,C,R0,P,st,fl,E}=S,n=E.length;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.globalCompositeOperation="source-over";ctx.globalAlpha=1;ctx.clearRect(0,0,W,H);
  const inkFill=R=>{const g=ctx.createRadialGradient(C[0],C[1],0,C[0],C[1],Math.max(1,R));g.addColorStop(0,"#0c0907");g.addColorStop(.7,"#17120e");g.addColorStop(1,"#2a2119");return g};
  if(t<.28){const u=t/.28,y=-30+(C[1]+30)*u*u;ctx.fillStyle="#0c0907";ctx.beginPath();ctx.ellipse(C[0],y,5+2*u,9+5*u,0,0,6.283);ctx.fill()}
  else{const u=qqgC((t-.28)/.57);
    if(u<1){const R=R0*.75*(.5*u+.5*(1-(1-u)*(1-u)));ctx.fillStyle=inkFill(R);qqgBlob(ctx,C[0],C[1],R,S.ink,u);
      for(const s of S.sat){const v=qqgC((u-s.ts)/.3);if(v<=0)continue;const d=s.d*R0*.75*(.6+.4*u),r=s.s*R0*qqgOut(v);qqgBlob(ctx,C[0]+d*Math.cos(s.a),C[1]+d*Math.sin(s.a),r,s.sh,v)}
      if(u<.18){ctx.globalAlpha=1-u/.18;ctx.fillStyle="#0c0907";ctx.beginPath();ctx.arc(C[0],C[1],9,0,6.283);ctx.fill();ctx.globalAlpha=1}}
    else{ctx.fillStyle=inkFill(R0*.75);ctx.fillRect(0,0,W,H)}
    if(t>2.2){const v=qqgIO(qqgC((t-2.2)/.6));ctx.globalCompositeOperation="destination-out";ctx.fillStyle="#000";qqgBlob(ctx,C[0],C[1],R0*1.05*v,S.er,v);ctx.globalCompositeOperation="source-over"}}
  const lit=i=>qqgC((t-(.85+i*.1))/.25),prog=qqgC((t-.85)/(.1*(n-1)+.2))*(n-1),fade=1-qqgC((t-2.2)/.3);
  S.mist.style.opacity=String(qqgC((t-.6)/.4)*(1-qqgC((t-2.15)/.4)));S.mist.style.transform=`translateX(${-4*t}%)`;
  if(prog>0&&fade>0){ctx.save();ctx.globalAlpha=fade;ctx.lineJoin=ctx.lineCap="round";const k=Math.floor(prog),f=prog-k;
    const line=()=>{ctx.beginPath();ctx.moveTo(P[0][0],P[0][1]);for(let i=1;i<=k;i++)ctx.lineTo(P[i][0],P[i][1]);if(k<n-1&&f>0)ctx.lineTo(P[k][0]+(P[k+1][0]-P[k][0])*f,P[k][1]+(P[k+1][1]-P[k][1])*f);ctx.stroke()};
    ctx.strokeStyle="rgba(190,46,26,.32)";ctx.lineWidth=12;line();ctx.strokeStyle="rgba(255,196,96,.5)";ctx.lineWidth=5;line();ctx.strokeStyle="rgba(255,236,186,.95)";ctx.lineWidth=1.6;line();ctx.restore()}
  {const sp=Math.max(0,prog-1.4),k=Math.min(n-2,Math.floor(sp)),f=Math.min(1,sp-k),x=P[k][0]+(P[k+1][0]-P[k][0])*f,y=P[k][1]+(P[k+1][1]-P[k][1])*f,o=.2*qqgC((t-1.05)/.3)*(1-qqgC((t-1.95)/.3));
    S.sh.style.opacity=String(o);S.sh.style.transform=`translate(${x+26}px,${y-70}px) rotate(8deg)`}
  for(let i=0;i<n;i++){const im=st[i],L=lit(i),T=S.tg&&S.tg[i],s0=48;let x=P[i][0],y=P[i][1],s=s0*(.6+.4*qqgBack(Math.max(.001,L))),o=L*(S.lock[i]?.6:1),rot=0;
    if(L<=0){im.style.opacity="0";continue}
    if(T&&t>2.2){const a=2.22+i*.02,u=qqgC((t-a)/.5),e=qqgIO(u);x=P[i][0]+(T.x-P[i][0])*e;y=P[i][1]+(T.y-P[i][1])*e-70*Math.sin(Math.PI*u);s=s0+(T.s-s0)*e;rot=200*(1-e)*(i%2?1:-1)*(u>0?1:0);o=S.lock[i]?.6+(.42-.6)*e:1;
      if(u>.55&&!S.lock[i]&&im.className!=="qqg-st pl")im.className="qqg-st pl";
      const lt=a+.5;if(u>=1){im.style.opacity="0";if(!S.land[i]){S.land[i]=1;if(T.im)T.im.classList.add("qqg-in");if(!S.snd.clack){S.snd.clack=1;qqgSnd("clack")}}
        const q=qqgC((t-lt)/.35);fl[i].style.opacity=String(.9*(1-q));fl[i].style.transform=`translate(${T.x-55}px,${T.y-55}px) scale(${.5+.9*q})`;continue}}
    im.style.width=im.style.height=s+"px";im.style.opacity=String(o);im.style.transform=`translate(${x-s/2}px,${y-s/2}px) rotate(${rot}deg)`}}
/* 舊網址：第一版的山坡石桌頁 #/ship/stone 拿掉了，直接開就轉到擇石門口 */
if(typeof SHIP_PG!=="undefined")SHIP_PG.stone=v=>{navReplace(QQG_PARK);return{}};
