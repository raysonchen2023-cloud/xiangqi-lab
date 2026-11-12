/* ================= 🌫 水墨畫動態疊層 inkFx（意見回饋 752：「在水墨畫增加有沙塵戰馬移動的視覺效果，還要人物活靈活現的移動視覺效果」，開發者 11/8 選定做法）=================
   範圍：古戰場戰役卡 data/battles/*（07g-battle.js 的 .bt-pic）、開頭與載入畫面輪播 data/loading/*（09b-preload.js ldShow、05b-save.js titleScreen 的 .ld-img）、
   13 朝渡口 data/shipmap/port_*（07f-ship.js shpPage）、《雲河七星》插畫 data/shipmap/novel/*（07f-ship.js ShipRead 的 .shp-fig）。星槎主畫面已經有自己的視差和航行動態（07f-ship.js shpPx），這裡不碰。
   做法：不改那幾個檔，用一個 MutationObserver 看頁面上出現的 <img>，路徑對得上 data/inkfx/fx-map.json 裡的設定，就在圖的後面插一層 .ifx（pointer-events:none，蓋在圖上、壓在按鈕與文字下面）。
   每張圖一筆設定（xiangqi-db/art/inkfx/fx-map.json，座標都是圖上的百分比）：fx＝要用的效果、hole＝不能碰的區域（插畫裡的棋盤），每顆粒子整條路徑的範圍都要避開 hole。
   效果：dust 沙塵／煙塵帶、smoke 捲起的煙、ember 火星、flame 燈火微晃、steam 茶煙、mist 薄霧、glint 波光、snow 飄雪、motes 金色光點、twinkle 星光一明一暗、light 光影慢移、
         wave 旗幟／衣角／蘆葦／柳條飄動（把那一塊圖切成幾條，離旗桿越遠擺越大）、layers 分層的戰馬與人物（第二步，資料在 data/inkfx/layers/）。
   全部用 Web Animations 只動 transform 和 opacity；畫面不在視窗內（IntersectionObserver）或切到背景（visibilitychange）就暫停；圖從頁面拿掉就收掉動畫。
   有 prefers-reduced-motion 就完全不建立。開關：store「inkFx」（true／false），沒設的時候照 IFX_DEFAULT（開發者驗收前先關著）。 */
const IFX_DEFAULT=true;   /* 意見回饋 752：開發者 11/8 驗收通過，預設開啟 */
const IFX={map:null,P:null,L:new Set(),io:null,mo:null,css:false,started:false,hidden:false,prune:0};
const IFX_RE=/(?:^|\/)data\/((?:battles|loading|shipmap\/novel)\/[\w-]+|shipmap\/port_[\w-]+)\.webp(?:[?#].*)?$/;
const ifxRM=()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}};
const ifxOn=()=>{if(ifxRM())return false;const v=store.get("inkFx",null);return v==null?IFX_DEFAULT:!!v};
const ifxMob=()=>{try{return matchMedia("(pointer:coarse)").matches||innerWidth<820}catch(e){return false}};
function ifxData(){return IFX.P||(IFX.P=fetch("data/inkfx/fx-map.json").then(r=>{if(!r.ok)throw 0;return r.json()}).then(j=>{IFX.map=j&&j.img||{};return IFX.map}).catch(()=>{IFX.P=null;IFX.map=null;return null}))}
function ifxCss(){if(IFX.css)return;IFX.css=true;const s=document.createElement("style");s.id="ifxCss";
  s.textContent=`.ifx{position:absolute;overflow:hidden;pointer-events:none;contain:strict}.ifx-s{position:absolute;left:0;top:0}
.ifx .ifp{position:absolute;left:0;top:0;display:block;pointer-events:none;will-change:transform,opacity;border-radius:50%;opacity:0}
.ifx .ifw{border-radius:0;opacity:1;background-repeat:no-repeat}.ifx .ifl{border-radius:0;opacity:0}.ifx .ifL{position:absolute;display:block;border-radius:0;opacity:1;max-width:none}
.ld-img .ifx{opacity:0;transition:opacity 1.2s ease}.ld-img img.on+.ifx{opacity:1}.shp-fig{position:relative}
@media (prefers-reduced-motion:reduce){.ifx{display:none}}`;document.head.append(s)}
/* ---------- 掛上去 ---------- */
function ifxKey(img){const s=img.getAttribute("src")||"",m=s.match(IFX_RE);return m?m[1]:null}
function ifxSeen(img){const k=ifxKey(img);if(!k){if(img._ifx)ifxDrop(img._ifx);return}if(img._ifx&&img._ifx.key===k)return;if(img._ifx)ifxDrop(img._ifx);
  img._ifxK=k;ifxData().then(M=>{if(!M||!M[k]||img._ifxK!==k)return;const go=()=>{if(img._ifxK===k&&img.isConnected&&img.naturalWidth)ifxAttach(img,k,M[k])};
    if(img.complete&&img.naturalWidth)go();else img.addEventListener("load",go,{once:true})})}
function ifxScan(n){if(!n||n.nodeType!==1||n.namespaceURI==="http://www.w3.org/2000/svg")return;if(n.tagName==="IMG"){ifxSeen(n);return}if(n.firstElementChild)for(const i of n.getElementsByTagName("img"))ifxSeen(i)}
function ifxStart(){if(IFX.started||!ifxOn()||typeof MutationObserver==="undefined")return;IFX.started=true;ifxCss();
  IFX.io=typeof IntersectionObserver!=="undefined"?new IntersectionObserver(es=>{for(const e of es){const R=e.target._ifxR;if(R){R.vis=e.isIntersecting;ifxRun(R)}}},{rootMargin:"60px"}):null;
  IFX.mo=new MutationObserver(rs=>{let rm=false;for(const r of rs){if(r.type==="attributes"){if(r.target.tagName==="IMG")ifxSeen(r.target);continue}for(const n of r.addedNodes)ifxScan(n);if(r.removedNodes.length)rm=true}
    if(rm&&IFX.L.size&&!IFX.prune)IFX.prune=setTimeout(()=>{IFX.prune=0;for(const R of[...IFX.L])if(!R.img.isConnected||!R.ov.isConnected)ifxDrop(R)},300)});
  IFX.mo.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:["src"]});
  document.addEventListener("visibilitychange",()=>{IFX.hidden=document.hidden;for(const R of IFX.L)ifxRun(R)});
  try{matchMedia("(prefers-reduced-motion: reduce)").addEventListener("change",e=>{if(e.matches)for(const R of[...IFX.L])ifxDrop(R)})}catch(e){}
  for(const i of document.getElementsByTagName("img"))ifxSeen(i)}
function ifxRun(R){const on=R.vis&&!IFX.hidden;if(on===R.on)return;R.on=on;for(const a of R.A){try{on?a.play():a.pause()}catch(e){}}}
function ifxDrop(R){IFX.L.delete(R);if(IFX.io)IFX.io.unobserve(R.ov);for(const a of R.A){try{a.cancel()}catch(e){}}R.A=[];if(R.ro)R.ro.disconnect();R.ov.remove();if(R.img._ifx===R)R.img._ifx=null}
/* 圖畫在框裡的實際位置（object-fit:cover／contain 會裁切或留邊），效果的百分比座標都照這個範圍算 */
function ifxGeom(img){const cw=img.clientWidth,ch=img.clientHeight,nw=img.naturalWidth||cw,nh=img.naturalHeight||ch,cs=getComputedStyle(img),fit=cs.objectFit;
  let w=cw,h=ch;if(fit==="cover"||fit==="contain"){const s=(fit==="cover"?Math.max:Math.min)(cw/nw,ch/nh);w=nw*s;h=nh*s}
  const op=(cs.objectPosition||"50% 50%").split(/\s+/),pc=(v,d)=>/%$/.test(v||"")?parseFloat(v)/100:d;
  return{L:img.offsetLeft+img.clientLeft,T:img.offsetTop+img.clientTop,cw,ch,w,h,x:(cw-w)*pc(op[0],.5),y:(ch-h)*pc(op[1],.5)}}
function ifxAttach(img,key,cfg){if(img._ifx)ifxDrop(img._ifx);const ov=document.createElement("div");ov.className="ifx";ov.setAttribute("aria-hidden","true");
  const st=document.createElement("div");st.className="ifx-s";ov.append(st);img.after(ov);
  const R={img,key,cfg,ov,st,A:[],vis:!IFX.io,on:false,sz:""};img._ifx=R;ov._ifxR=R;IFX.L.add(R);
  ifxBuild(R);if(IFX.io)IFX.io.observe(ov);ifxRun(R);
  if(typeof ResizeObserver!=="undefined"){let t=0;R.ro=new ResizeObserver(()=>{clearTimeout(t);t=setTimeout(()=>{if(IFX.L.has(R))ifxBuild(R)},160)});R.ro.observe(img)}}
function ifxBuild(R){const g=ifxGeom(R.img);if(g.cw<40||g.ch<30)return;const sz=[g.L,g.T,g.cw,g.ch].map(Math.round).join(",");if(sz===R.sz)return;R.sz=sz;
  for(const a of R.A){try{a.cancel()}catch(e){}}R.A=[];R.st.textContent="";
  Object.assign(R.ov.style,{left:g.L+"px",top:g.T+"px",width:g.cw+"px",height:g.ch+"px",borderRadius:getComputedStyle(R.img).borderRadius});
  Object.assign(R.st.style,{left:g.x+"px",top:g.y+"px",width:g.w+"px",height:g.h+"px"});
  const C={W:g.w,H:g.h,st:R.st,A:R.A,hole:(R.cfg.hole||[]),src:R.img.currentSrc||R.img.src,flt:getComputedStyle(R.img).filter,mob:ifxMob(),seed:ifxSeed(R.key)};
  for(const f of R.cfg.fx||[]){const fn=IFX_FX[f.t];if(fn)try{fn(C,f)}catch(e){}}
  R.on=false;ifxRun(R)}
/* ---------- 小工具 ---------- */
function ifxSeed(s){let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0}
function ifxRnd(C){C.seed=(Math.imul(C.seed,1664525)+1013904223)>>>0;return C.seed/4294967296}
const ifxR=(C,a,b)=>a+(b-a)*ifxRnd(C);
const ifxN=(C,n)=>Math.max(1,Math.round(n*(C.mob?.65:1)));
/* bb＝[左,上,右,下]（百分比）：跟哪一塊 hole 重疊就不能用 */
const ifxOk=(C,bb)=>!C.hole.some(h=>bb[0]<h[2]&&bb[2]>h[0]&&bb[1]<h[3]&&bb[3]>h[1]);
function ifxEl(C,cls,w,h,bg,x,y){const e=document.createElement("span");e.className=cls;e.style.cssText=`width:${w.toFixed(1)}px;height:${h.toFixed(1)}px;background:${bg};left:${x.toFixed(1)}px;top:${y.toFixed(1)}px`;C.st.append(e);return e}
function ifxAn(C,el,kf,dur,o){o=o||{};const a=el.animate(kf,{duration:dur*1000,iterations:Infinity,delay:-(o.ph!=null?o.ph:ifxRnd(C))*dur*1000,easing:o.ease||"linear",direction:o.dir||"normal",fill:"both"});a.pause();C.A.push(a);return a}
const ifxT=(x,y,s,r)=>`translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)${s!=null?` scale(${(+s).toFixed(3)})`:""}${r?` rotate(${r}deg)`:""}`;
const IFX_COL={sand:"176,146,98",ink:"62,54,46",ash:"120,112,104",paper:"246,241,230",snow:"255,255,255",gold:"255,222,140",warm:"255,186,92",fire:"255,140,60",white:"255,252,240"};
const ifxBlob=(c,a)=>`radial-gradient(ellipse at center,rgba(${c},${a}) 0%,rgba(${c},${(a*.45).toFixed(3)}) 42%,rgba(${c},0) 70%)`;
const ifxBox=f=>f.box||[0,0,100,100];
/* ---------- 效果 ---------- */
const IFX_FX={
  /* 沙塵：大團的淡沙色（或墨色）煙塵從一邊吹到另一邊，再加細細的沙粒 */
  dust(C,f){const[x0,y0,x1,y1]=ifxBox(f),k=f.k??.6,dir=f.dir||1,c=IFX_COL[f.col||"sand"],W=C.W,H=C.H,n=ifxN(C,3+6*k);
    for(let i=0;i<n;i++)for(let t=0;t<6;t++){const w=W*ifxR(C,.2,.38)*(f.sc||1),h=w*ifxR(C,.26,.42),yc=ifxR(C,y0,y1),wp=w/W*100,hp=h/H*100;
      if(!ifxOk(C,[x0-wp,yc-hp/2,x1+wp,yc+hp/2]))continue;const a=+(.22+.3*k).toFixed(3),y=yc/100*H-h/2,xa=x0/100*W-w,xb=x1/100*W,dy=ifxR(C,-.04,.02)*H;
      const el=ifxEl(C,"ifp",w,h,ifxBlob(c,.55),0,0),s=dir>0?[xa,xb]:[xb,xa];
      ifxAn(C,el,[{transform:ifxT(s[0],y,.8),opacity:0},{transform:ifxT(s[0]+(s[1]-s[0])*.2,y+dy*.2,.95),opacity:a,offset:.2},{transform:ifxT(s[0]+(s[1]-s[0])*.75,y+dy*.75,1.1),opacity:a,offset:.75},{transform:ifxT(s[1],y+dy,1.2),opacity:0}],ifxR(C,16,26)/(.6+.4*k));break}
    const g=ifxN(C,(4+10*k)*(f.grit??1));for(let i=0;i<g;i++)for(let t=0;t<6;t++){const yc=ifxR(C,y0,y1);if(!ifxOk(C,[x0,yc-2,x1,yc+2]))continue;const d=ifxR(C,1.6,3)*Math.max(.8,W/700),y=yc/100*H,xa=x0/100*W-6,xb=x1/100*W+6,s=dir>0?[xa,xb]:[xb,xa],wob=ifxR(C,-.02,.02)*H;
      const el=ifxEl(C,"ifp",d,d,`rgba(${IFX_COL.ink},.55)`,0,0);ifxAn(C,el,[{transform:ifxT(s[0],y),opacity:0},{transform:ifxT(s[0]+(s[1]-s[0])*.3,y+wob),opacity:.55,offset:.15},{transform:ifxT(s[0]+(s[1]-s[0])*.7,y-wob),opacity:.45,offset:.8},{transform:ifxT(s[1],y),opacity:0}],ifxR(C,6,11)/(.6+.4*k));break}},
  /* 捲起的煙塵／煙：從幾個點冒出、往上（或 f.dx 方向）散開變大變淡 */
  smoke(C,f){const k=f.k??.6,c=IFX_COL[f.col||"ink"],W=C.W,H=C.H,rise=(f.rise??14)/100*H,dx=(f.dx??3)/100*W;
    for(const p of f.p||[]){const n=ifxN(C,2+2*k);for(let i=0;i<n;i++){const s=W*ifxR(C,.035,.06)*(.6+.8*k)*(f.sc||1),x=p[0]/100*W-s/2,y=p[1]/100*H-s/2,sp=s/W*100*2,dd=dx*ifxR(C,.4,1.2);
      if(!ifxOk(C,[p[0]-sp,p[1]-rise/H*100-sp,p[0]+sp+dd/W*100,p[1]+sp]))continue;const a=+(.25+.3*k).toFixed(3),el=ifxEl(C,"ifp",s,s,ifxBlob(c,.6),0,0);
      ifxAn(C,el,[{transform:ifxT(x,y,.45),opacity:0},{transform:ifxT(x+dd*.35,y-rise*.35,1),opacity:a,offset:.3},{transform:ifxT(x+dd,y-rise,2.1),opacity:0}],ifxR(C,7,11),{ease:"ease-out"})}}},
  /* 火星：火堆、火船、火把往上飄的小火點 */
  ember(C,f){const k=f.k??.6,W=C.W,H=C.H;for(const p of f.p||[]){const n=ifxN(C,2+4*k);for(let i=0;i<n;i++){const d=ifxR(C,2,3.6)*Math.max(.8,W/700),x=p[0]/100*W-d/2,y=p[1]/100*H-d/2,up=ifxR(C,5,13)/100*H,sx=ifxR(C,-3,3)/100*W;
    if(!ifxOk(C,[p[0]-4,p[1]-up/H*100-2,p[0]+4,p[1]+2]))continue;const el=ifxEl(C,"ifp",d,d,`radial-gradient(circle,rgba(255,236,170,1) 0,rgba(${IFX_COL.fire},.9) 45%,rgba(${IFX_COL.fire},0) 75%)`,0,0);
    ifxAn(C,el,[{transform:ifxT(x,y,1),opacity:0},{transform:ifxT(x+sx*.3,y-up*.25,1),opacity:1,offset:.15},{transform:ifxT(x+sx*.7,y-up*.7,.8),opacity:.7,offset:.65},{transform:ifxT(x+sx,y-up,.5),opacity:0}],ifxR(C,2.4,4.4),{ease:"ease-out"})}}},
  /* 燈火微晃：燈、燭、火把、火堆外面一圈暖光，忽明忽暗 */
  flame(C,f){const W=C.W,H=C.H,c=IFX_COL[f.col||"warm"];for(const p of f.p||[]){const r=Math.max(10,(p[2]||f.r||4)*1.4/100*W),x=p[0]/100*W-r,y=p[1]/100*H-r,rp=r/W*100,rq=r/H*100;if(!ifxOk(C,[p[0]-rp,p[1]-rq,p[0]+rp,p[1]+rq]))continue;
    const el=ifxEl(C,"ifp",2*r,2*r,`radial-gradient(circle,rgba(${c},${f.a??.5}) 0%,rgba(${c},${((f.a??.5)*.4).toFixed(3)}) 38%,rgba(${c},0) 70%)`,0,0),o=[.55,.95,.7,1,.6,.9,.75,.55],s=[1,1.06,.98,1.05,.96,1.04,1,1];
    ifxAn(C,el,o.map((v,i)=>({transform:ifxT(x,y,s[i]),opacity:v})),ifxR(C,2.2,3.6),{ease:"ease-in-out"})}},
  /* 茶煙：細細的白煙從杯口、壺口往上扭著散開 */
  steam(C,f){const W=C.W,H=C.H;for(const p of f.p||[]){for(let i=0;i<3;i++){const w=W*.018*(f.sc||1),h=w*3.2,x=p[0]/100*W-w/2,y=p[1]/100*H-h,up=.07*H*(f.sc||1),sx=ifxR(C,-1.2,1.2)/100*W;
    if(!ifxOk(C,[p[0]-3,p[1]-(h+up)/H*100,p[0]+3,p[1]]))continue;const el=ifxEl(C,"ifp",w,h,`radial-gradient(ellipse at 50% 70%,rgba(255,255,255,.7) 0,rgba(255,255,255,.25) 45%,rgba(255,255,255,0) 70%)`,0,0),r=ifxR(C,-10,10);
    ifxAn(C,el,[{transform:ifxT(x,y,.55,0),opacity:0},{transform:ifxT(x+sx*.4,y-up*.4,.9,r),opacity:.6,offset:.35},{transform:ifxT(x+sx,y-up,1.5,-r),opacity:0}],ifxR(C,4,6),{ph:i/3+ifxR(C,0,.1),ease:"ease-out"})}}},
  /* 薄霧：大片宣紙色的霧帶，慢慢左右飄、忽濃忽淡 */
  mist(C,f){const[x0,y0,x1,y1]=ifxBox(f),k=f.k??.5,c=IFX_COL[f.col||"paper"],W=C.W,H=C.H,n=ifxN(C,2+2*k);
    for(let i=0;i<n;i++)for(let t=0;t<6;t++){const w=W*(x1-x0)/100*ifxR(C,.55,.85),h=Math.min(H*(y1-y0)/100*ifxR(C,.45,.8),w*.4),cx=ifxR(C,x0,x1),cy=ifxR(C,y0,y1),dx=W*ifxR(C,.05,.1),wp=w/W*50,hp=h/H*50,dp=dx/W*100;
      if(!ifxOk(C,[cx-wp-dp,cy-hp,cx+wp+dp,cy+hp]))continue;const x=cx/100*W-w/2,y=cy/100*H-h/2,a=+(.3+.4*k).toFixed(3),el=ifxEl(C,"ifp",w,h,ifxBlob(c,.75),0,0);
      ifxAn(C,el,[{transform:ifxT(x-dx,y,1),opacity:a*.45},{transform:ifxT(x,y-h*.05,1.05),opacity:a,offset:.5},{transform:ifxT(x+dx,y,1),opacity:a*.45}],ifxR(C,24,38),{dir:"alternate",ease:"ease-in-out"});break}},
  /* 波光：水面上一閃一閃的短亮線 */
  glint(C,f){const[x0,y0,x1,y1]=ifxBox(f),k=f.k??.5,c=IFX_COL[f.col||"white"],W=C.W,H=C.H,n=ifxN(C,6+12*k);
    for(let i=0;i<n;i++)for(let t=0;t<6;t++){const x=ifxR(C,x0,x1),y=ifxR(C,y0,y1),w=Math.max(12,W*ifxR(C,.03,.065)),wp=w/W*100;if(!ifxOk(C,[x-1,y-1,x+wp+2,y+1]))continue;
      const h=Math.max(2,W*.005),el=ifxEl(C,"ifp",w,h,`linear-gradient(90deg,rgba(${c},0),rgba(${c},.95),rgba(${c},0))`,0,0),X=x/100*W,Y=y/100*H;el.style.borderRadius="2px";
      ifxAn(C,el,[{transform:ifxT(X,Y,.5),opacity:0},{transform:ifxT(X+W*.006,Y,1),opacity:+(.55+.4*k).toFixed(2),offset:.45},{transform:ifxT(X+W*.012,Y,.6),opacity:0,offset:.9},{transform:ifxT(X+W*.012,Y,.6),opacity:0}],ifxR(C,2.6,5),{ease:"ease-in-out"});break}},
  /* 飄雪：白色、帶一點淡墨邊（白底的畫上也看得到），一邊落一邊左右擺 */
  snow(C,f){const[x0,y0,x1,y1]=ifxBox(f),k=f.k??.6,W=C.W,H=C.H,n=ifxN(C,16+30*k),u=Math.max(.8,Math.min(1.6,W/600));
    for(let i=0;i<n;i++)for(let t=0;t<6;t++){const x=ifxR(C,x0,x1),sw=ifxR(C,1.5,4),d=ifxR(C,2.2,5)*u;if(!ifxOk(C,[x-sw,y0,x+sw,y1]))continue;
      const el=ifxEl(C,"ifp",d,d,"radial-gradient(circle,#fff 0,#fff 42%,rgba(110,112,124,.4) 58%,rgba(110,112,124,0) 72%)",0,0),X=x/100*W,ya=(y0/100)*H-d,yb=(y1/100)*H,S=sw/100*W;
      ifxAn(C,el,[{transform:ifxT(X,ya),opacity:0},{transform:ifxT(X+S,ya+(yb-ya)*.25),opacity:.95,offset:.12},{transform:ifxT(X-S,ya+(yb-ya)*.55),opacity:.9,offset:.5},{transform:ifxT(X+S*.6,ya+(yb-ya)*.85),opacity:.85,offset:.85},{transform:ifxT(X,yb),opacity:0}],ifxR(C,9,16)/(.7+.3*k));break}},
  /* 金色光點：小小的金點慢慢往上飄、一閃一閃 */
  motes(C,f){const[x0,y0,x1,y1]=ifxBox(f),k=f.k??.5,W=C.W,H=C.H,n=ifxN(C,5+10*k),c=IFX_COL[f.col||"gold"];
    for(let i=0;i<n;i++)for(let t=0;t<6;t++){const x=ifxR(C,x0,x1),y=ifxR(C,y0,y1),up=ifxR(C,4,11)*(f.up??1),sx=ifxR(C,-3,3);if(!ifxOk(C,[x-3-Math.abs(sx),y-up-2,x+3+Math.abs(sx),y+2]))continue;
      const d=ifxR(C,5,9)*Math.max(.8,W/700),el=ifxEl(C,"ifp",d,d,`radial-gradient(circle,rgba(255,248,215,1) 0,rgba(${c},.75) 30%,rgba(${c},0) 68%)`,0,0),X=x/100*W-d/2,Y=y/100*H-d/2,U=up/100*H,SX=sx/100*W;
      ifxAn(C,el,[{transform:ifxT(X,Y,.6),opacity:0},{transform:ifxT(X+SX*.3,Y-U*.3,1),opacity:.9,offset:.25},{transform:ifxT(X+SX*.6,Y-U*.55,.75),opacity:.35,offset:.5},{transform:ifxT(X+SX*.8,Y-U*.8,1),opacity:.8,offset:.75},{transform:ifxT(X+SX,Y-U,.6),opacity:0}],ifxR(C,7,12),{ease:"ease-in-out"});break}},
  /* 星光一明一暗：夜空裡的金點在原地亮、暗 */
  twinkle(C,f){const[x0,y0,x1,y1]=ifxBox(f),k=f.k??.6,W=C.W,H=C.H,n=ifxN(C,5+9*k);
    for(let i=0;i<n;i++)for(let t=0;t<6;t++){const x=ifxR(C,x0,x1),y=ifxR(C,y0,y1);if(!ifxOk(C,[x-2,y-2,x+2,y+2]))continue;
      const d=ifxR(C,6,11)*Math.max(.8,W/700),el=ifxEl(C,"ifp",d,d,`radial-gradient(circle,rgba(255,252,230,1) 0,rgba(${IFX_COL.gold},.8) 25%,rgba(${IFX_COL.gold},0) 65%)`,0,0),X=x/100*W-d/2,Y=y/100*H-d/2;
      ifxAn(C,el,[{transform:ifxT(X,Y,.5),opacity:0},{transform:ifxT(X,Y,1.15),opacity:.95,offset:.3},{transform:ifxT(X,Y,.7),opacity:.25,offset:.6},{transform:ifxT(X,Y,.5),opacity:0}],ifxR(C,2.6,5.2),{ease:"ease-in-out"});break}},
  /* 光影慢移：一道很淡的斜光從畫面一邊慢慢掃到另一邊（有棋盤的圖不用） */
  light(C,f){if(C.hole.length)return;const W=C.W,H=C.H,k=f.k??.4,ang=f.ang??-18,n=f.n||1;
    for(let i=0;i<n;i++){const w=W*.32,h=Math.hypot(W,H)*1.2,el=ifxEl(C,"ifl",w,h,`linear-gradient(90deg,rgba(255,240,205,0),rgba(255,240,205,${(.1+.18*k).toFixed(3)}) 50%,rgba(255,240,205,0))`,0,0),y=(H-h)/2;
      ifxAn(C,el,[{transform:ifxT(-w*1.4,y,1,ang),opacity:0},{transform:ifxT(W*.15,y,1,ang),opacity:1,offset:.3},{transform:ifxT(W*.75,y,1,ang),opacity:1,offset:.7},{transform:ifxT(W*1.2,y,1,ang),opacity:0}],ifxR(C,20,30),{ph:i/n+ifxR(C,0,.2),ease:"ease-in-out"})}},
  /* 飄動：把 box 那一塊圖切成幾條，離 piv（L／R＝旗桿在左／右、T＝上面固定像柳條、B＝下面固定像蘆葦）越遠擺越大；每條上下多留一點邊、邊緣羽化 */
  wave(C,f){const[x0,y0,x1,y1]=f.box,piv=f.piv||"L",n=f.n||5,W=C.W,H=C.H,amp=(f.amp??3)*Math.max(.7,W/600),per=f.per||1.7,vert=piv==="L"||piv==="R";
    const bx=x0/100*W,by=y0/100*H,bw=(x1-x0)/100*W,bh=(y1-y0)/100*H,m=amp*2.5+3,img=`url("${C.src.replace(/"/g,"%22")}")`;
    for(let i=0;i<n;i++){const d=(i+.5)/n,far=(piv==="L"||piv==="T")?d:1-d,A=amp*Math.pow(far,1.3);if(A<.25)continue;
      let x,y,w,h,mk;if(vert){w=bw/n*1.7;h=bh+2*m;x=bx+bw*i/n-bw/n*.35;y=by-m;mk=`linear-gradient(90deg,transparent,#000 28%,#000 72%,transparent),linear-gradient(180deg,transparent,#000 ${m}px,#000 calc(100% - ${m}px),transparent)`}
      else{w=bw+2*m;h=bh/n*1.7;x=bx-m;y=by+bh*i/n-bh/n*.35;mk=`linear-gradient(180deg,transparent,#000 28%,#000 72%,transparent),linear-gradient(90deg,transparent,#000 ${m}px,#000 calc(100% - ${m}px),transparent)`}
      const el=ifxEl(C,"ifp ifw",w,h,`${img} ${(-x).toFixed(1)}px ${(-y).toFixed(1)}px/${W.toFixed(1)}px ${H.toFixed(1)}px no-repeat`,0,0);
      el.style.webkitMaskImage=el.style.maskImage=mk;el.style.webkitMaskComposite="source-in";el.style.maskComposite="intersect";
      const S=9,kf=[];for(let j=0;j<=S;j++){const v=Math.sin(j/S*Math.PI*2)*A;kf.push({transform:vert?ifxT(x,y+v):ifxT(x+v,y)})}
      ifxAn(C,el,kf,per*ifxR(C,.95,1.05),{ph:(1-far)*.55})}},
  /* 第二步：分層的戰馬與人物。f.bg＝補好背景的整張底圖（蓋在原圖上）、f.L＝切出來的去背圖層 [{src,box,mv}]，mv 是動法 */
  layers(C,f){const W=C.W,H=C.H,base="data/inkfx/layers/",lays=[];
    const mk=(src,box)=>{const e=document.createElement("img");e.className="ifL";e.alt="";e.decoding="async";e.draggable=false;e.src=base+src;const[a,b,c,d]=box||[0,0,100,100];
      e.style.cssText=`left:${(a/100*W).toFixed(1)}px;top:${(b/100*H).toFixed(1)}px;width:${((c-a)/100*W).toFixed(1)}px;height:${((d-b)/100*H).toFixed(1)}px;opacity:0;transition:opacity .5s${C.flt&&C.flt!=="none"?";filter:"+C.flt:""}`;C.st.append(e);   /* 原圖有濾鏡（別的工程師加的畫風），圖層也套一樣的 */lays.push(e);return e};
    if(f.bg)mk(f.bg);
    /* mv：gx／gy＝往前衝再回來的距離（%），bob＝馬步起伏（%），beats＝一個週期跑幾步，tilt＝跟著步伐微微前後傾（度），flut／fb＝旗面飄動（度／一週期幾次），per＝週期（秒），ph＝相位（秒），org＝轉軸 */
    for(const L of f.L||[]){const e=mk(L.src,L.box),mv=L.mv||{},u=W/100,v=H/100,S=48,kf=[],gx=(mv.gx||0)*u,gy=(mv.gy||0)*v,bob=(mv.bob||0)*v,surge=mv.surge||1,tilt=mv.tilt||0,bt=mv.beats||4,P2=Math.PI*2;
      for(let j=0;j<=S;j++){const t=j/S,s=(1-Math.cos(t*P2*surge))/2,sx=s*gx,sy=s*gy,by=-Math.abs(Math.sin(t*Math.PI*bt))*bob,r=Math.sin(t*P2*bt)*tilt+Math.sin(t*P2*(mv.fb||5))*(mv.flut||0);kf.push({transform:`translate3d(${sx.toFixed(2)}px,${(sy+by).toFixed(2)}px,0) rotate(${r.toFixed(2)}deg)`})}
      e.style.transformOrigin=mv.org||"50% 100%";const a=e.animate(kf,{duration:(mv.per||3.6)*1000,iterations:Infinity,delay:-(mv.ph||0)*1000,easing:"linear"});a.pause();C.A.push(a)}
    /* 圖層都載好才一起淡入，載不到就留原圖 */
    Promise.all(lays.map(e=>e.decode?e.decode():new Promise((ok,no)=>{e.onload=ok;e.onerror=no}))).then(()=>{for(const e of lays)e.style.opacity=1}).catch(()=>{for(const e of lays)e.remove()})}
};
ifxStart();
