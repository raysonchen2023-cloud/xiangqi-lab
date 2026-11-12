/* ================= 意見回饋 765（開發者 11/8）：渡口「船艙」圖的動態效果 =================
   #/port 在船艙那一站（classic）用的滿版水墨圖 data/shipmap/port_classic.webp（768x1376），照雲河星槎的做法加 WebGL 動態：
   深度圖 data/shipmap/layers/pm1_depth.png（384x688；R＝深度、G＝浮島起伏權重、B＝起伏相位；tools/shipmap_layers/portdepth.py 產生）
   讓整張圖逐像素位移——拖動／滑鼠／陀螺儀視差（共用星槎的 SPX 狀態和「🌀 立體」鈕）、浮島各自慢慢上下浮、小船搖、擂台紅旗飄、
   燈籠輕晃、星河的金色光點閃、雲霧往旁邊流；入口按鈕照所在位置的深度、起伏一起動。只有一張圖、沒有分層，所以不會有接縫或疊影。
   開關：常數 PFX_ON（預設）＋ localStorage m_portGL（1 開、0 關）；開發者模式時圖的左下有「🧪 船艙動態」可切換。
   安全網：素材檔名全新（pm1_*，手機不會有同名舊快取）、檢查尺寸、第一格用靜止姿勢畫一次跟原圖比對抽樣點；
   沒過、WebGL 或 highp 不能用、prefers-reduced-motion，都退回原本的單張圖。離開這頁迴圈自己停並釋放 WebGL */
const PFX_ON=true;   /* 船艙動態預設開關（開發者 11/9 回饋 765「可以預設打開」）；localStorage m_portGL 為 1 開、0 關，沒設照這個 */
const pfxOn=()=>{const v=store.get("portGL",-1);return v==-1?PFX_ON:v==1};
function pfxDev(P){if(!(typeof DEVMODE==="function"&&DEVMODE())||P.querySelector(".shp-gldev"))return;const on=pfxOn();   /* 只有開發者模式看得到：切換船艙動態（存在 m_portGL），樣式借星槎的 .shp-gldev */
  const b=document.createElement("button");b.type="button";b.className="shp-gldev"+(on?" on":"");b.style.position="absolute";b.textContent=on?"🧪 船艙動態：開":"🧪 船艙動態：關";P.appendChild(b);
  b.onclick=e=>{e.stopPropagation();vibrate(5);store.set("portGL",on?0:1);toast(on?"已關掉船艙動態":"已打開船艙動態");route()}}
const PFX_SZ=[[768,1376],[384,688],[512,512],[512,512]],PFX_PT=[[439,404],[716,527],[224,705],[457,924],[105,1248],[733,1192],[493,624],[619,155]],PFX_M=9;
const PFX_VS="attribute vec2 a;varying vec2 v;void main(){v=vec2(a.x*.5+.5,.5-a.y*.5)*vec2(768.,1376.);gl_Position=vec4(a,0.,1.);}";
const PFX_FS=`#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D I,Dp,Mi,Mf;uniform vec2 par;uniform float bob,t,k;varying vec2 v;
const vec2 S=vec2(768.,1376.),BC=vec2(140.,1230.);
vec2 mir(vec2 u){u=abs(u);return 1.-abs(1.-u);}
vec3 dat(vec2 p){return texture2D(Dp,clamp(p/S,0.,1.)).rgb;}
vec2 rot(vec2 r,float a){return vec2(cos(a)*r.x-sin(a)*r.y,sin(a)*r.x+cos(a)*r.y)-r;}
vec2 off(vec3 q,vec2 p){vec2 o=(q.r*1.6-.6)*par;o.y+=k*bob*q.g*sin(6.2832*(t/6.8+q.b));
  return o+smoothstep(.7,.95,q.g)*rot(p-BC,k*.012*sin(6.2832*t/5.3));}
float flag(vec2 p,vec4 f){vec2 c=(p-f.xy)/(f.zw-f.xy);return step(-.08,c.x)*step(c.x,1.15)*step(-.15,c.y)*step(c.y,1.2)*clamp(c.x,0.,1.);}
vec2 lant(vec2 p,vec2 pv,vec2 c,vec2 rr,float ph){float w=1.-smoothstep(.85,1.25,length((p-c)/rr));return w*rot(p-pv,.06*sin(t*1.9+ph));}
void main(){vec2 p=v;vec3 q=dat(p);vec2 o=off(q,p);q=dat(p-o);o=off(q,p);
  float fw=max(max(flag(p,vec4(309.,326.,343.,356.)),flag(p,vec4(427.,294.,474.,322.))),max(flag(p,vec4(455.,352.,502.,388.)),flag(p,vec4(556.,315.,608.,351.))));
  o.y+=k*fw*2.2*sin(p.x*.25-t*7.);
  o+=k*(lant(p,vec2(495.,590.),vec2(495.,628.),vec2(22.,46.),0.)+lant(p,vec2(663.,660.),vec2(663.,690.),vec2(22.,38.),1.7));
  o*=smoothstep(0.,48.,min(min(p.x,S.x-p.x),min(p.y,S.y-p.y)));
  vec2 sp=p-o;vec3 col=texture2D(I,mir(sp/S)).rgb;
  float gold=step(.66,col.r)*step(.58,col.g)*step(col.b,.55)*step(.27,col.r-col.b);
  vec2 cl=floor(sp/7.);float h=fract(sin(dot(cl,vec2(12.9898,78.233)))*43758.5453);
  col=clamp(col*(1.+k*gold*.35*sin(t*(1.5+h*2.)+h*6.2832)),0.,1.);
  float m=k*(1.-smoothstep(.04,.3,q.g));vec2 r=vec2(p.x+.25*par.x+.12*p.y,p.y+.25*par.y)/1400.;
  col=mix(col,vec3(.275,.282,.306),m*texture2D(Mi,vec2(r.y,r.x-t/130.)).a*.6);
  col=mix(col,vec3(1.),m*texture2D(Mf,vec2(r.y+.21,r.x+.37-t/75.)).a*.65);
  gl_FragColor=vec4(col,1.);}`;
/* 共用的小工具：編譯著色器、鋪滿畫面的四邊形、上傳貼圖（data＝深度圖、雲霧這類資料貼圖不轉色；rep＝可以 REPEAT 的 2 的次方貼圖） */
function pfxGl(cv,vs,fs,tex){const gl=cv.getContext("webgl",{alpha:false,antialias:false,depth:false,stencil:false,premultipliedAlpha:false,powerPreference:"low-power"});if(!gl)return null;
  const hp=gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER,gl.HIGH_FLOAT);if(!hp||hp.precision<16)return null;
  const sh=(ty,src)=>{const s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s));return s};
  const pg=gl.createProgram();gl.attachShader(pg,sh(gl.VERTEX_SHADER,vs));gl.attachShader(pg,sh(gl.FRAGMENT_SHADER,fs));gl.linkProgram(pg);if(!gl.getProgramParameter(pg,gl.LINK_STATUS))throw new Error("link");gl.useProgram(pg);
  gl.bindBuffer(gl.ARRAY_BUFFER,gl.createBuffer());gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);const al=gl.getAttribLocation(pg,"a");gl.enableVertexAttribArray(al);gl.vertexAttribPointer(al,2,gl.FLOAT,false,0,0);
  tex.forEach(([n,img,data,rep],i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,gl.createTexture());
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL,data?gl.NONE:gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);const w=rep?gl.REPEAT:gl.CLAMP_TO_EDGE;
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,w);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.uniform1i(gl.getUniformLocation(pg,n),i)});
  return{gl,pg,u:n=>gl.getUniformLocation(pg,n)}}
/* 靜止姿勢畫一次，抽樣點跟原圖比（平均每色差）；舊圖、轉色、精度出錯都會對不上 */
function pfxTest(gl,draw,bw,bh,base,W,H,pts){draw();const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d");x.drawImage(base,0,0,W,H);const px=new Uint8Array(4);let d=0;
  for(const[a,b]of pts){gl.readPixels(Math.min(bw-1,Math.floor((a+.5)*bw/W)),Math.max(0,bh-1-Math.floor((b+.5)*bh/H)),1,1,gl.RGBA,gl.UNSIGNED_BYTE,px);const q=x.getImageData(a,b,1,1).data;d+=(Math.abs(px[0]-q[0])+Math.abs(px[1]-q[1])+Math.abs(px[2]-q[2]))/3}
  return d/pts.length}
function portFx(v,k){const P=v&&v.querySelector(".shp-page.cq");if(!P||k!=="classic"||matchMedia("(prefers-reduced-motion: reduce)").matches)return;
  pfxDev(P);if(!pfxOn())return;
  const base=P.querySelector(":scope>img"),spots=[...P.querySelectorAll(".shp-spot,.po-sight")],cv=document.createElement("canvas");if(!base)return;
  cv.className="pfx-gl";cv.setAttribute("aria-hidden","true");cv.style.cssText="position:absolute;left:0;top:0;width:100%;height:100%;display:block;pointer-events:none";base.after(cv);
  const fail=()=>{cv.remove();P.classList.remove("pfx-on");base.style.visibility="";spots.forEach(b=>b.style.translate="")};
  if(!document.getElementById("pfxCss")){const s=document.createElement("style");s.id="pfxCss";s.textContent=".shp-page.pfx-on>.ifx{display:none}";document.head.append(s)}   /* WebGL 動態跑起來就不疊 07k-inkfx 的粒子層（兩套一起會重複閃、燈火位置對不上） */
  const ld=s=>new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src="data/shipmap/"+s});
  Promise.all(["port_classic.webp","layers/pm1_depth.png","layers/sm_mist_ink.webp","layers/sm_mist_fog.webp"].map(ld)).then(im=>{if(!P.isConnected)return;
    if(im.some((m,i)=>m.naturalWidth!==PFX_SZ[i][0]||m.naturalHeight!==PFX_SZ[i][1]))throw 0;
    const G=pfxGl(cv,PFX_VS,PFX_FS,[["I",im[0]],["Dp",im[1],1],["Mi",im[2],1,1],["Mf",im[3],1,1]]);if(!G)throw 0;
    const{gl,u}=G,U={par:u("par"),bob:u("bob"),t:u("t"),k:u("k")};
    /* 入口按鈕跟著所在位置動：JS 讀同一張深度圖，算按鈕錨點的位移（視差＋浮島起伏） */
    const dc=document.createElement("canvas");dc.width=384;dc.height=688;const dx=dc.getContext("2d");dx.drawImage(im[1],0,0);const DD=dx.getImageData(0,0,384,688).data;
    const at=(x,y)=>{const i=(Math.min(687,Math.max(0,Math.round(y/2)))*384+Math.min(383,Math.max(0,Math.round(x/2))))*4;return[DD[i]/255*1.6-.6,DD[i+1]/255,DD[i+2]/255]};
    const SP=spots.map(b=>{const L=parseFloat(b.style.left),T=parseFloat(b.style.top);return[b,at(L/100*768,T/100*1376)]});
    SPX.el=P;SPX.hl=null;SPX.ls=[];SPX.cx=SPX.cy=SPX.tx=SPX.ty=0;
    const t0=performance.now();let W=0,H=0,bw=0,bh=0,first=true;const meas=()=>{W=P.clientWidth;H=base.clientHeight};meas();if(window.ResizeObserver)new ResizeObserver(meas).observe(P);
    const step=now=>{if(!P.isConnected||SPX.el!==P){const x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext();return}
      if(!window.ResizeObserver)meas();SPX.cx+=(SPX.tx-SPX.cx)*SPX.k;SPX.cy+=(SPX.ty-SPX.cy)*SPX.k;
      if(W&&H){const w=Math.round(Math.min(W*(devicePixelRatio||1),960)),h=Math.round(w*H/W);if(w!==bw||h!==bh){cv.width=bw=w;cv.height=bh=h;gl.viewport(0,0,w,h)}
        if(first){const d=pfxTest(gl,()=>{gl.uniform2f(U.par,0,0);gl.uniform1f(U.bob,0);gl.uniform1f(U.t,0);gl.uniform1f(U.k,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)},bw,bh,im[0],768,1376,PFX_PT);SPX.pfxDiff=d;
          if(!(d<40)){SPX.el=null;const x=gl.getExtension("WEBGL_lose_context");if(x)x.loseContext();fail();if(typeof DEVMODE==="function"&&DEVMODE())toast("🧪 船艙動態自我檢查沒過（差 "+Math.round(d)+"），先用單張圖");return}}
        /* 視差最大 9px、浮島起伏 3px（CSS px），週期 6.8 秒、各島相位不同；portdepth.py 已檢查不會拉破 */
        const s=W/768,t=(now-t0)/1000,px=PFX_M*SPX.cx,py=PFX_M*SPX.cy;
        gl.uniform2f(U.par,px/s,py/s);gl.uniform1f(U.bob,3/s);gl.uniform1f(U.t,t%88660);gl.uniform1f(U.k,1);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        for(const[b,[d,g,ph]]of SP)b.style.translate=`${(d*px).toFixed(2)}px ${(d*py+3*g*Math.sin(2*Math.PI*(t/6.8+ph))).toFixed(2)}px`;
        if(first){first=false;base.style.visibility="hidden";P.classList.add("pfx-on")}}
      requestAnimationFrame(step)};
    requestAnimationFrame(step);
    const cl=v=>Math.max(-1,Math.min(1,v)),go=(x,y,kk)=>{SPX.tx=cl(x);SPX.ty=cl(y);SPX.k=kk};
    P.addEventListener("pointermove",e=>{if(e.pointerType!=="mouse")return;const r=P.getBoundingClientRect();go((e.clientX-r.left)/r.width*2-1,(e.clientY-r.top)/r.height*2-1,.08)});
    P.addEventListener("pointerleave",e=>{if(e.pointerType==="mouse")go(0,0,.035)});
    P.addEventListener("touchstart",e=>{const t=e.touches[0];SPX.drag={x:t.clientX,y:t.clientY}},{passive:true});
    P.addEventListener("touchmove",e=>{const t=e.touches[0],d=SPX.drag;if(d)go((t.clientX-d.x)/110,(t.clientY-d.y)/110,.18)},{passive:true});
    const up=()=>{SPX.drag=null;SPX.g0=null;go(0,0,.035)};P.addEventListener("touchend",up,{passive:true});P.addEventListener("touchcancel",up,{passive:true});
    if(typeof shpGyroBtn==="function")shpGyroBtn(P)}).catch(fail)}
