/* ================= 🌬 渡口的風（開發者 11/8：「讓渡口的旗子可以飄揚，沙塵飛揚，火燒濃煙隨著風飄起」）=================
   範圍：12 朝渡口 #/port（07f-ship.js Port；圖是 07p-portcolor.js 換上的全彩水墨 data/shipmap/port_<朝代>_f.webp，768x1376）。
   做法跟船艙 07n-portfx.js 同一套：圖當 WebGL 貼圖畫在 canvas 上，著色器逐像素處理——
     旗子飄揚：每面旗（擂台旗、幡）照位置做波動，離旗桿越遠擺越大（最多約 2px，旗子小、不會拉破）；
     沙塵飛揚：有黃土、大漠、泥地的朝代，在地面範圍裡疊往右吹的沙塵帶，只疊在偏黃、偏亮的地面上（建築、樹上幾乎看不到）；
     濃煙／炊煙：火光、烽燧、燒船冒濃煙，其他朝代是淡淡的炊煙、香煙，都往右邊飄。
   風向全畫面一致（往右），熱點按鈕不動。素材只沿用星槎的雲霧雜訊貼圖 sm_mist_ink／sm_mist_fog，沒有新圖。
   跟 07p 的下船過場：等 .pc-run 拿掉、最後那張圖載好才開始；跟 07k-inkfx：canvas 永遠緊接在 <img> 後面，inkfx 的燈火、波光、薄霧照常疊在上面；
     這裡有畫煙、沙塵的朝代，就把 inkfx 在那張圖上的 smoke／dust 拿掉（避免兩套重複、風向不一）。
   安全網：圖尺寸要 768x1376、第一格用「不動」畫一次跟原圖比對抽樣點、沒有 highp 或 WebGL 就不做、prefers-reduced-motion 不播；
     畫布寬上限 960；離開這頁迴圈自己停並釋放 WebGL。開關：常數 PORTFX2_ON ＋ localStorage m_portWind（1 開、0 關）；開發者模式時圖左下有「🧪 渡口風」切換 */
const PORTFX2_ON=true;   /* 開發者 11/8 說打開 */
const pwdOn=()=>{const v=store.get("portWind",-1);return v==-1?PORTFX2_ON:v==1};
/* 每朝設定（座標都是圖上的百分比）：f＝旗 [左,上,右,下,"h" 橫旗（旗桿在左）／"v" 直幡（從上垂下）]、s＝煙 [x,y,1 濃煙／0 炊煙]、d＝沙塵範圍 [左,上,右,下,1＝灰土（不看地面顏色）／2＝草原（不限黃土、淡一點也疊）,強度] */
const PWD={
  qin:{f:[[40.9,31,43.2,32.5,"h"],[51.8,29.7,53.4,30.8,"h"],[56.2,32,58.9,33.7,"h"],[65.5,30.4,67.3,31.7,"h"]],s:[[82,23.3,1]],d:[20,33,98,68,0,.7]},
  han:{f:[[35.2,27.8,37.9,29.5,"h"],[50,25.4,52.2,26.4,"h"],[56.1,29.9,59.4,32,"h"],[69.3,27,71.9,28.3,"h"]],s:[[11.5,18,1]],d:[0,21,100,70,0,1.3]},
  sanguo:{f:[[43.6,34,47.1,36,"h"],[54.3,32.6,57.3,34.1,"h"],[58.5,36.6,61.8,38.7,"h"],[68.6,33.9,71.7,35.5,"h"]],s:[[24,23,1],[31.5,23.8,1],[46.5,23,1]],d:[30,40,85,64,0,.5]},
  weijin:{f:[[48.4,27.3,50.3,28.4,"h"],[61.7,25.6,62.8,26.5,"h"],[70.8,29.4,73,30.9,"h"],[82.8,26.5,84.6,27.8,"h"]],s:[[90,47.2,0]]},
  nanbei:{f:[[51.3,30.9,54.6,32.5,"h"],[66.9,28.6,69.7,29.9,"h"],[68.5,33.5,72.4,35.5,"h"],[83.1,30.3,86.2,32,"h"]],s:[[90,45.4,0]]},
  sui:{f:[[42.2,30.4,44.8,35,"v"],[57.6,27.2,59.8,31.7,"v"],[62.8,32,65.6,37.1,"v"],[76.7,29.5,79,33.9,"v"]],s:[[92,44.2,0]],d:[28,38,100,80,0,.7]},
  tang:{f:[[35.8,28.6,40,31.3,"h"],[48.6,26.3,52.7,28.7,"h"],[56,29.8,60.3,33,"h"],[67,28,71,30.4,"h"]],s:[[84,22.5,0]],d:[12,28,80,72,0,.7]},
  wudai:{f:[[49,21.5,50.8,25.1,"v"],[62.4,20.1,64.2,22.8,"v"],[71,22.8,73.3,27.1,"v"],[82.4,20.9,84.2,24.2,"v"]],s:[[13,19.5,1],[30,19.3,1],[85,18.3,1]],d:[0,48,100,74,1,.8]},
  song:{f:[[42.2,28.8,46,32.1,"v"],[55.5,27,57.6,29.8,"v"],[58.5,30.8,62.1,34.5,"v"],[71.3,28.3,74.3,31.8,"v"]],s:[]},
  yuan:{f:[[43.4,38.1,45.3,39,"h"],[51.8,36.9,53.1,37.6,"h"],[54.4,39.3,56.8,40.3,"h"],[61.6,37.8,63.3,38.6,"h"]],s:[[91.5,39.6,0]]}/* 意見回饋 779：元朝是草地，不要沙塵 */,
  ming:{f:[[50,32.8,52.2,34.7,"h"],[46.2,35.8,48.5,38.2,"h"],[60.2,33.8,62.2,35.8,"h"]],s:[[33,30.6,0]]},
  qing:{f:[[40.2,30.1,42.7,31.5,"h"],[50.9,28.4,53.5,29.6,"h"],[54.9,31.7,57.8,33.4,"h"],[64.5,29.4,66.7,31,"h"]],s:[]}};
const PWD_PT=[[25,25],[75,25],[50,50],[25,75],[75,75],[50,90],[12,60],[88,60]];
/* 意見回饋 786（旗子飄得不協調）：著色器裡的 fm()＝這個像素像不像旗布（彩度高或很黑），只有旗布跟著飄，旗桿、擂台、天空不動 */
const PWD_FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D I,Mi,Mf;uniform float t,k,DM,DS;uniform vec3 DC;uniform vec4 F[6];uniform float FT[6];uniform vec4 SM[3];uniform vec4 DB;varying vec2 v;
const vec2 S=vec2(768.,1376.);
float fm(vec3 c){float mx=max(c.r,max(c.g,c.b)),mn=min(c.r,min(c.g,c.b)),l=dot(c,vec3(.3,.59,.11));return max(smoothstep(.16,.3,mx-mn),1.-smoothstep(.1,.2,l));}
float box(vec2 p,vec4 b,float e){vec2 a=smoothstep(b.xy-e,b.xy+e,p)*(1.-smoothstep(b.zw-e,b.zw+e,p));return a.x*a.y;}
void main(){vec2 p=v,o=vec2(0.);
  for(int i=0;i<6;i++){vec4 f=F[i];if(f.z>f.x){vec2 c=(p-f.xy)/(f.zw-f.xy);float n=step(-.15,c.x)*step(c.x,1.25)*step(-.2,c.y)*step(c.y,1.25),ph=float(i)*1.7;
    if(FT[i]<.5){float w=clamp(c.x,0.,1.);o.y+=n*w*1.8*sin(c.x*5.5-t*6.5+ph);o.x+=n*w*.6*sin(c.x*4.-t*5.+ph);}
    else{float w=clamp(c.y,0.,1.);o.x+=n*w*1.6*sin(c.y*5.-t*5.5+ph);}}}
  vec3 c0=texture2D(I,clamp(p/S,0.,1.)).rgb,cw=texture2D(I,clamp((p-o*k)/S,0.,1.)).rgb,col=c0;
  if(dot(o,o)>.0001){float w=max(fm(c0),fm(cw));col=mix(c0,cw,w);}
  if(DB.z>DB.x){float m=box(p,DB,36.)*k;
    float sand=DM>.5&&DM<1.5?1.:smoothstep(.05,.18,col.r-col.b)*smoothstep(-.03,.04,col.r-col.g)*smoothstep(.36,.6,dot(col,vec3(.3,.59,.11)));
    float rb=texture2D(Mf,vec2(p.y/70.+.3,(p.x-t*70.)/460.)).a,lo=texture2D(Mi,vec2(p.y/34.+.6,(p.x-t*95.)/300.)).a,big=texture2D(Mf,vec2(p.y/260.,(p.x-t*45.)/900.)).a;
    float gust=smoothstep(.55,1.,.5+.5*sin((p.x-t*130.)*.0055+p.y*.004));
    float a=(smoothstep(.06,.3,rb)*.55+smoothstep(.04,.2,lo)*.35+smoothstep(.1,.35,big)*.3)*(.55+.9*gust);
    if(DM>1.5)sand=max(sand,.85*smoothstep(.32,.5,dot(col,vec3(.3,.59,.11)))*(1.-smoothstep(.06,.16,col.r-col.g)));col=mix(col,DC,clamp(a,0.,1.)*m*sand*DS*.95);}
  for(int i=0;i<3;i++){vec4 s=SM[i];if(s.w>0.){vec2 q=p-s.xy;float h=max(-q.y,0.),hh=clamp(h/s.w,0.,1.),xc=pow(hh,1.25)*s.w*.85,wd=4.+h*.6,ax=(q.x-xc)/wd;
    float d=exp(-ax*ax)*(1.-smoothstep(-3.,4.,q.y))*(1.-hh)*(1.-.35*hh);
    d*=.65+1.4*texture2D(Mf,vec2((q.x-xc)/480.+float(i)*.31,(h-t*24.)/420.)).a+.6*texture2D(Mi,vec2((q.x-xc)/420.-t*.015,(h-t*30.)/380.)).a;
    col=mix(col,s.z>.5?mix(vec3(.11,.1,.1),vec3(.48,.47,.46),hh):vec3(.82,.81,.79),clamp(d,0.,1.)*k*(s.z>.5?.72:.42));}}
  gl_FragColor=vec4(col,1.);}`;
function pwdDev(P){if(!(typeof DEVMODE==="function"&&DEVMODE())||P.querySelector(".pw-dev"))return;const on=pwdOn();
  const b=document.createElement("button");b.type="button";b.className="shp-gldev pw-dev"+(on?" on":"");b.style.cssText="position:absolute;left:10px;bottom:10px;z-index:3";b.textContent=on?"🧪 渡口風：開":"🧪 渡口風：關";P.appendChild(b);
  b.onclick=e=>{e.stopPropagation();vibrate(5);store.set("portWind",on?0:1);toast(on?"已關掉渡口的風":"已打開渡口的風（測試中）");route()}}
/* 這裡有畫煙或沙塵的朝代，把 07k-inkfx 在這張圖上的 smoke／dust 拿掉並重建疊層（燈火、波光、薄霧、火星照常）；回傳還原用的函式 */
function pwdIfx(img,k){const C=PWD[k];if(!C||!(C.s||C.d)||typeof IFX==="undefined"||!IFX.map)return()=>{};const M=IFX.map,old={};
  for(const x of["","_c","_f"]){const key="shipmap/port_"+k+x,a=M[key];if(a&&a.fx){old[key]=a;M[key]=Object.assign({},a,{fx:a.fx.filter(f=>!(C.s&&f.t==="smoke")&&!(C.d&&f.t==="dust"))})}}
  const re=()=>{try{if(img._ifx&&typeof ifxDrop==="function")ifxDrop(img._ifx);if(typeof ifxSeen==="function")ifxSeen(img)}catch(e){}};re();
  return()=>{Object.assign(M,old);re()}}
/* 沙塵顏色：取沙塵範圍裡「偏黃、偏亮」的地面平均色再提亮一點（灰土朝代取整塊平均）；算不出來就用一般黃土色 */
function pwdSoil(img,d){try{const c=document.createElement("canvas");c.width=192;c.height=344;const x=c.getContext("2d");x.drawImage(img,0,0,192,344);
  const D=x.getImageData(Math.round(d[0]*1.92),Math.round(d[1]*3.44),Math.max(1,Math.round((d[2]-d[0])*1.92)),Math.max(1,Math.round((d[3]-d[1])*3.44))).data;let r=0,g=0,b=0,n=0;
  for(let i=0;i<D.length;i+=4){const R=D[i]/255,G=D[i+1]/255,B=D[i+2]/255,L=.3*R+.59*G+.11*B;if(d[4]===1||(R-B>.08&&R>=G-.02&&L>.42)){r+=R;g+=G;b+=B;n++}}
  if(n<20)return[.86,.74,.52];const k=v=>Math.min(1,v/n*1.18+.14);return[k(r),k(g),k(b)]}catch(e){return[.86,.74,.52]}}
function portWind(v,k){const C=PWD[k],P=v&&v.querySelector(".shp-page.cq"),img=P&&P.querySelector(":scope>img");if(!C||!img)return;
  pwdDev(P);if(!pwdOn()||matchMedia("(prefers-reduced-motion: reduce)").matches||typeof pfxGl!=="function")return;
  let n=0;const wait=()=>{if(!P.isConnected)return;const ok=!P.classList.contains("pc-run")&&!document.querySelector(".walkc")&&img.complete&&img.naturalWidth;if(!ok&&n++<80){setTimeout(wait,150);return}if(ok)pwdRun(P,img,C,k)};wait()}
function pwdRun(P,img,C,k){if(img.naturalWidth!==768||img.naturalHeight!==1376)return;
  const cv=document.createElement("canvas");cv.className="pw-gl";cv.setAttribute("aria-hidden","true");cv.style.cssText="position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none";img.after(cv);
  let undo=()=>{};const fail=()=>{cv.remove();img.style.visibility="";undo()};
  const ld=s=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src="data/shipmap/layers/"+s});
  Promise.all(["sm_mist_ink.webp","sm_mist_fog.webp"].map(ld)).then(im=>{if(!P.isConnected||!cv.isConnected)return;if(im.some(m=>m.naturalWidth!==512||m.naturalHeight!==512))throw 0;
    const G=pfxGl(cv,PFX_VS,PWD_FS,[["I",img],["Mi",im[0],1,1],["Mf",im[1],1,1]]);if(!G)throw 0;
    const{gl,u}=G,U={t:u("t"),k:u("k"),DM:u("DM"),DB:u("DB"),DS:u("DS"),DC:u("DC")},px=(x,y)=>[x*7.68,y*13.76];
    const Fv=new Float32Array(24),FT=new Float32Array(6);(C.f||[]).slice(0,6).forEach((f,i)=>{const[a,b]=px(f[0],f[1]),[c,d]=px(f[2],f[3]);Fv.set([a-3,b-3,c+4,d+4],i*4);FT[i]=f[4]==="v"?1:0});
    gl.uniform4fv(u("F"),Fv);gl.uniform1fv(u("FT"),FT);
    const SMv=new Float32Array(12);(C.s||[]).slice(0,3).forEach((s,i)=>{const[a,b]=px(s[0],s[1]);SMv.set([a,b,s[2],s[2]?230:150],i*4)});gl.uniform4fv(u("SM"),SMv);
    if(C.d){const[a,b]=px(C.d[0],C.d[1]),[c,d]=px(C.d[2],C.d[3]);gl.uniform4f(U.DB,a,b,c,d);gl.uniform1f(U.DM,C.d[4]||0);gl.uniform1f(U.DS,C.d[5]??.7);const dc=pwdSoil(img,C.d);gl.uniform3f(U.DC,dc[0],dc[1],dc[2])}else gl.uniform4f(U.DB,0,0,0,0);
    const t0=performance.now();let W=0,H=0,bw=0,bh=0,first=true,fr=0;const meas=()=>{W=img.clientWidth;H=img.clientHeight};meas();if(window.ResizeObserver)new ResizeObserver(meas).observe(img);
    const draw=(t,kk)=>{gl.uniform1f(U.t,t);gl.uniform1f(U.k,kk);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)};
    const step=now=>{if(!P.isConnected||!cv.isConnected){const x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext();undo();return}
      if(!window.ResizeObserver)meas();
      if(W&&H){const w=Math.round(Math.min(W*(devicePixelRatio||1),960)),h=Math.round(w*H/W);if(w!==bw||h!==bh){cv.width=bw=w;cv.height=bh=h;gl.viewport(0,0,w,h)}
        if(first){const d=pfxTest(gl,()=>draw(0,0),bw,bh,img,768,1376,PWD_PT.map(([x,y])=>[Math.round(x*7.68),Math.round(y*13.76)]));P.dataset.pwDiff=d.toFixed(1);
          if(!(d<40)){const x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext();fail();if(typeof DEVMODE==="function"&&DEVMODE())toast("🧪 渡口風自我檢查沒過（差 "+Math.round(d)+"），先用原圖");return}}
        draw(((now-t0)/1000)%88660,1);
        if(first){first=false;img.style.visibility="hidden";P.classList.add("pw-on");undo=pwdIfx(img,k)}
        if(++fr%30===0&&cv.previousElementSibling!==img)img.after(cv)}   /* inkfx 疊層之後才掛上來時，會插在圖跟 canvas 中間；把 canvas 移回圖的正後面，疊層就在上面 */
      requestAnimationFrame(step)};
    requestAnimationFrame(step)}).catch(fail)}
