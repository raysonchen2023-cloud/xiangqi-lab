/* ================= 🗺 雲河棋路 3D 地圖（map3d.js）=================
   把冒險裡「雲河棋路」的平面地圖（map_clean.png）變成可以轉動、縮放的 3D 沙盤。
   - 地形：PlaneGeometry 鋪滿 map.webp，頂點高度在 CPU 上算好（不用 displacementMap），
     這樣地標、路線、點選都能直接查到地面高度。
   - 高度來源（opt.heightMode）：
       "auto"（預設）：先用 Gemini 畫的 height.png；程式會拿地圖上的藍色河道去檢查它有沒有對齊，
                       順便試著左右上下微移找最對齊的位置；對不齊（河道不夠低）就自動改用顏色推算。
       "image"：一定用 height.png（只做微移，不檢查分數）。
       "color"：不用 height.png，直接從地圖顏色推算（藍＝河、暗＝山林、沙土＝平地、上方＝遠山）。
     不管哪一種，最後都會「照地圖的藍色把河道挖低」，並把 5 個站點的地面壓平，立牌才站得穩。
   - 地標：每站一個石台座＋一張永遠轉向鏡頭的去背立牌（lm_<id>.webp）；圖還沒到或缺圖時先用程式畫的木牌。
   - 路線：站和站之間一條貼著地面的發光管子；已開放的路段金色、光點流動，還沒開放的路段淡灰。
   - 鏡頭：斜上方俯視；一指拖曳轉動、兩指捏合縮放（兩指一起移動可平移）；滑鼠滾輪縮放、右鍵拖曳平移；
     點兩下回到預設視角；點地標鏡頭飛過去，下方出現站點名稱和進度卡。
   - 需要全域 THREE（r149 的 three.min.js），不用 import。
   用法：
     const m=XQMap3D.create(host,{
       stations:[{id:"dukou",pass:6,stars:15},{id:"chaguan",pass:2,stars:4},{id:"qihui",locked:true}],
       onPick:(st,act)=>{ act==="select"＝點到地標；act==="enter"＝在卡片上按了「出發」 }
     });
     m.focus("chaguan"); m.setStations([...]); m.resetView(); m.destroy();
   注意：整個檔案的註解都用區塊註解，不用行尾註解（意見回饋：一行程式裡的行尾註解會吃掉後面的程式）。 */
(function(){
  "use strict";
  const T=window.THREE;
  if(!T){if(window.console)console.warn("[XQMap3D] 找不到全域 THREE，請先載入 three.min.js（r149）");return}

  const PI=Math.PI;
  const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
  const lerp=(a,b,t)=>a+(b-a)*t;
  const smooth=(e0,e1,x)=>{const t=clamp((x-e0)/(e1-e0),0,1);return t*t*(3-2*t)};
  const wrapPI=a=>{while(a>PI)a-=2*PI;while(a<-PI)a+=2*PI;return a};

  /* ---------- 尺寸與常數 ----------
     原圖 896×1200（3:4）。最上面 10% 是天空和雲，不鋪在地面上（V_CROP）。
     u、v 一律用「整張原圖」的座標：u 由左到右 0～1，v 由上到下 0～1。 */
  const V_CROP=.10;
  const MAP_W=30;
  const Z_PER_V=40;
  const MAP_D=Z_PER_V*(1-V_CROP);
  const H_MAX=6.5;
  const SEG_X=150,SEG_Z=180;
  const GX=224,GY=300;
  const WATER=.12;
  const BOTTOM=-1.1;
  const MIN_SCORE=.10;

  /* ---------- 預設站點（跟 art_map3d.json 同一份座標；from/to 對應 journey-code.js 的 JR，每站 6 關） ---------- */
  const DEF_STATIONS=[
    {id:"dukou",name:"渡口",u:.18,v:.895,from:1,to:6,sub:"柳寒舟的渡船在這裡靠岸。",size:2.8},
    {id:"chaguan",name:"聽濤樓茶館",u:.17,v:.71,from:7,to:12,sub:"沈石川在這裡掃地、磨瓦片棋。",size:3.4},
    {id:"qihui",name:"雲河棋會",u:.63,v:.575,from:13,to:18,sub:"十六位棋手，三天的比賽。",size:3.0},
    {id:"juesai",name:"驛路",u:.80,v:.525,from:19,to:24,sub:"一封信走一步。",size:3.2},
    {id:"shizhuo",name:"石桌",u:.79,v:.245,from:25,to:30,sub:"那盤沒下完的棋。",size:3.0}];

  /* ---------- 預設路線：第 i 段從第 i 站走到第 i+1 站，中間點沿著地圖上畫的沙土路和石拱橋 ---------- */
  const DEF_ROUTE=[
    [[.18,.895],[.25,.85],[.28,.785],[.22,.735],[.17,.71]],
    [[.17,.71],[.27,.76],[.36,.72],[.40,.69],[.48,.64],[.57,.635],[.63,.575]],
    [[.63,.575],[.70,.615],[.76,.58],[.80,.525]],
    [[.80,.525],[.85,.47],[.86,.40],[.81,.345],[.78,.30],[.79,.245]]];

  /* ---------- 手工修地形：右上懸崖頂要是一塊平台（石桌放在上面）；r 是世界單位，to 是 0～1 的高度 ---------- */
  const DEF_SCULPT=[{u:.77,v:.245,r:3.8,to:.72}];

  const toWorld=(u,v)=>({x:(u-.5)*MAP_W,z:((v-V_CROP)/(1-V_CROP)-.5)*MAP_D});
  const toUV=(x,z)=>({u:x/MAP_W+.5,v:V_CROP+(z/MAP_D+.5)*(1-V_CROP)});

  /* ---------- 小工具 ---------- */
  const srgb=t=>{if(t){if(T.sRGBEncoding!=null)t.encoding=T.sRGBEncoding;if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace}return t};
  function cvTex(w,h,f){const c=document.createElement("canvas");c.width=w;c.height=h;f(c.getContext("2d"),w,h);return srgb(new T.CanvasTexture(c))}
  function div(cls,html){const d=document.createElement("div");d.className=cls;if(html!=null)d.innerHTML=html;return d}
  const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

  let cssDone=false;
  function injectCss(){if(cssDone)return;cssDone=true;const s=document.createElement("style");s.textContent=[
    ".m3d{position:relative;width:100%;border-radius:14px;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;background:#5d6874}",
    ".m3d canvas{display:block;width:100%;height:100%}",
    ".m3d-lab{position:absolute;left:0;top:0;transform:translate(-50%,-100%);padding:2px 9px;border-radius:99px;background:rgba(32,26,20,.74);color:#fbeed4;font:600 12px/1.5 sans-serif;white-space:nowrap;cursor:pointer;border:1px solid rgba(255,214,140,.55);will-change:transform}",
    ".m3d-lab small{opacity:.8;margin-left:4px;font-weight:400}",
    ".m3d-lab.lock{opacity:.55}",
    ".m3d-lab.cur{background:rgba(150,62,30,.9)}",
    ".m3d-lab.sel{outline:2px solid #ffd36b}",
    ".m3d-card{position:absolute;left:8px;right:8px;bottom:8px;padding:8px 12px;border-radius:12px;background:rgba(250,244,232,.96);color:#3a2c1e;box-shadow:0 6px 20px rgba(0,0,0,.35);font:13px/1.5 sans-serif;transform:translateY(140%);transition:transform .3s}",
    ".m3d-card.on{transform:none}",
    ".m3d-card b{font-size:15px}",
    ".m3d-card .sub{color:#7a6650;font-size:12px}",
    ".m3d-bar{height:5px;border-radius:3px;background:#e2d6c0;overflow:hidden;margin:4px 0}",
    ".m3d-bar i{display:block;height:100%;background:linear-gradient(90deg,#e0a040,#c0602a)}",
    ".m3d-row{display:flex;gap:8px;margin-top:5px}",
    ".m3d-row button{flex:1;border:0;border-radius:9px;padding:6px 8px;font:600 14px sans-serif;background:#b5562a;color:#fff}",
    ".m3d-row button.g{flex:0 0 auto;background:#ddd0b8;color:#4a3826}",
    ".m3d-row button:disabled{background:#c9bfae}",
    ".m3d-veil{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#f4ead8;font:600 14px sans-serif;background:linear-gradient(#4b5560,#868b84);transition:opacity .4s;pointer-events:none}",
    ".m3d-hint{position:absolute;left:50%;top:8px;transform:translateX(-50%);font:600 11px sans-serif;color:#fff;background:rgba(30,20,10,.45);padding:3px 10px;border-radius:99px;white-space:nowrap;pointer-events:none;transition:opacity .6s}",
    ".m3d-dbg{position:absolute;left:6px;top:6px;font:11px monospace;color:#fff;background:rgba(0,0,0,.5);padding:2px 6px;border-radius:4px;pointer-events:none}"
  ].join("\n");document.head.appendChild(s)}

  /* ================= 高度場（GX×GY 的格子，值 0～1） ================= */
  function readPixels(img){const c=document.createElement("canvas");c.width=GX;c.height=GY;const g=c.getContext("2d",{willReadFrequently:true});g.drawImage(img,0,0,GX,GY);return g.getImageData(0,0,GX,GY).data}

  function sampleGrid(h,u,v){const fx=clamp(u,0,1)*(GX-1),fy=clamp(v,0,1)*(GY-1),x0=Math.floor(fx),y0=Math.floor(fy),x1=Math.min(GX-1,x0+1),y1=Math.min(GY-1,y0+1),tx=fx-x0,ty=fy-y0;
    return lerp(lerp(h[y0*GX+x0],h[y0*GX+x1],tx),lerp(h[y1*GX+x0],h[y1*GX+x1],tx),ty)}

  /* 分離式方框模糊：r＝半徑（格），n＝做幾次 */
  function blur(a,r,n){const s=new Float32Array(a),t=new Float32Array(a.length),k=1/(2*r+1);
    for(let p=0;p<n;p++){
      for(let y=0;y<GY;y++)for(let x=0;x<GX;x++){let acc=0;for(let d=-r;d<=r;d++)acc+=s[y*GX+clamp(x+d,0,GX-1)];t[y*GX+x]=acc*k}
      for(let y=0;y<GY;y++)for(let x=0;x<GX;x++){let acc=0;for(let d=-r;d<=r;d++)acc+=t[clamp(y+d,0,GY-1)*GX+x];s[y*GX+x]=acc*k}}
    return s}

  /* 哪些格子是河：偏藍、夠亮、有飽和度；畫面上方 27% 是遠山和天空（也偏藍灰），不算 */
  function waterMask(px){const w=new Uint8Array(GX*GY);
    for(let y=0;y<GY;y++){const v=y/(GY-1);if(v<.27)continue;
      for(let x=0;x<GX;x++){const i=y*GX+x,r=px[i*4]/255,g=px[i*4+1]/255,b=px[i*4+2]/255,sat=Math.max(r,g,b)-Math.min(r,g,b);
        if(b>.40&&b-r>.13&&b>=g-.03&&sat>.14)w[i]=1}}
    return w}

  /* 退路：從地圖顏色推算高度 */
  function colorHeight(px,w){const h=new Float32Array(GX*GY);
    for(let y=0;y<GY;y++){const v=y/(GY-1);
      for(let x=0;x<GX;x++){const u=x/(GX-1),i=y*GX+x,r=px[i*4]/255,g=px[i*4+1]/255,b=px[i*4+2]/255;
        const lum=.299*r+.587*g+.114*b,sat=Math.max(r,g,b)-Math.min(r,g,b);
        let k;
        if(w[i])k=.04;
        else{
          k=.30;
          /* 沙土路、廣場（偏黃褐又亮）：比草地低一點、平一點 */
          if(r>=g&&g>=b&&lum>.45&&sat>.08)k=.24;
          /* 越暗越高：深綠樹林、山岩、懸崖的陰影面 */
          k+=Math.max(0,.38-lum)*.95;
          /* 灰色岩石（低飽和、中等亮度） */
          if(sat<.09&&lum>.30&&lum<.72)k+=.10;
        }
        /* 畫面上方是遠山：越上面越高 */
        const far=Math.max(0,(.36-v)/.26);k+=far*far*.6;
        /* 左右兩側是山壁 */
        const side=Math.max(0,Math.abs(u-.5)*2-.70)/.30;k+=side*side*.30;
        h[i]=clamp(k,0,1)}}
    return h}

  /* Gemini 高度圖 → 0～1（取 2%～98% 的亮度拉開，避免整張偏灰） */
  function lumGrid(px){const h=new Float32Array(GX*GY);for(let i=0;i<h.length;i++)h[i]=(.299*px[i*4]+.587*px[i*4+1]+.114*px[i*4+2])/255;
    const s=Array.from(h).sort((a,b)=>a-b),lo=s[Math.floor(s.length*.02)],hi=s[Math.floor(s.length*.98)],k=hi-lo>.05?1/(hi-lo):1;
    for(let i=0;i<h.length;i++)h[i]=clamp((h[i]-lo)*k,0,1);return h}

  /* 對齊分數＝陸地平均高度－河道平均高度；高度圖對得準，河道就會明顯比陸地低 */
  function alignScore(h,w,dx,dy){let ls=0,ln=0,ws=0,wn=0;const y0=Math.floor(GY*.3);
    for(let y=y0;y<GY;y+=2){const yy=clamp(y+dy,0,GY-1);
      for(let x=0;x<GX;x+=2){const val=h[yy*GX+clamp(x+dx,0,GX-1)];if(w[y*GX+x]){ws+=val;wn++}else{ls+=val;ln++}}}
    if(wn<50||ln<50)return 0;return ls/ln-ws/wn}

  /* 在 ±12 格（約 ±5%）裡找最對齊的位移：先粗找、再細找 */
  function bestShift(h,w){let best={dx:0,dy:0,s:alignScore(h,w,0,0)};
    for(let dy=-12;dy<=12;dy+=3)for(let dx=-12;dx<=12;dx+=3){const s=alignScore(h,w,dx,dy);if(s>best.s+.005)best={dx,dy,s}}
    const c=best;
    for(let dy=c.dy-2;dy<=c.dy+2;dy++)for(let dx=c.dx-2;dx<=c.dx+2;dx++){const s=alignScore(h,w,dx,dy);if(s>best.s+.002)best={dx,dy,s}}
    return best}

  function shiftGrid(h,dx,dy){const o=new Float32Array(h.length);for(let y=0;y<GY;y++){const yy=clamp(y+dy,0,GY-1);for(let x=0;x<GX;x++)o[y*GX+x]=h[yy*GX+clamp(x+dx,0,GX-1)]}return o}

  /* 照地圖的藍色把河道挖低；其他地方至少比水面高一點 */
  function carve(h,w){const wf=new Float32Array(GX*GY);for(let i=0;i<wf.length;i++)wf[i]=w[i];const wb=blur(wf,1,2);
    for(let i=0;i<h.length;i++){const s=smooth(.18,.62,wb[i]);if(s>0)h[i]=lerp(Math.max(h[i],WATER+.05),.03,s);else h[i]=Math.max(h[i],WATER+.05)}}

  /* 圓形修地形：to＝往某個高度靠，add＝加減；邊緣平滑過渡 */
  function sculpt(h,list){list.forEach(b=>{
    for(let y=0;y<GY;y++){const dz=(y/(GY-1)-b.v)*Z_PER_V;if(Math.abs(dz)>b.r)continue;
      for(let x=0;x<GX;x++){const dx=(x/(GX-1)-b.u)*MAP_W,d=Math.hypot(dx,dz);if(d>=b.r)continue;
        const i=y*GX+x,t=1-smooth(b.r*.55,b.r,d);h[i]=b.add!=null?clamp(h[i]+b.add*t,0,1):lerp(h[i],b.to,t)}}})}

  /* 站點壓平：取那一圈的平均高度當台面 */
  function padStations(h,sts){const list=sts.map(st=>{let s=0,n=0;const r=1.5;
    for(let y=0;y<GY;y++){const dz=(y/(GY-1)-st.v)*Z_PER_V;if(Math.abs(dz)>r)continue;
      for(let x=0;x<GX;x++){const dx=(x/(GX-1)-st.u)*MAP_W;if(Math.hypot(dx,dz)<r){s+=h[y*GX+x];n++}}}
    return{u:st.u,v:st.v,r:r*1.3,to:Math.max(n?s/n:.3,WATER+.07)}});sculpt(h,list)}

  function makeHeight(mapImg,hImg,mode,sts,extra){
    let px=null;try{px=readPixels(mapImg)}catch(e){console.warn("[XQMap3D] 讀不到地圖像素（跨網域？），地形改成平的",e)}
    const info={mode:"flat",score:0,shift:[0,0]};
    if(!px){const f=new Float32Array(GX*GY).fill(.3);return{H:f,info}}
    const w=waterMask(px);let H=null;
    if(hImg&&mode!=="color"){
      try{const h=lumGrid(readPixels(hImg)),a=bestShift(h,w);info.score=+a.s.toFixed(3);info.shift=[a.dx,a.dy];
        if(a.s>=MIN_SCORE||mode==="image"){H=blur(a.dx||a.dy?shiftGrid(h,a.dx,a.dy):h,1,1);info.mode="image"}
        else{info.reject="高度圖跟地圖的河道對不齊（分數 "+info.score+" < "+MIN_SCORE+"），改用顏色推算"}}
      catch(e){info.reject="高度圖讀取失敗："+e.message}}
    if(!H){H=blur(colorHeight(px,w),3,3);info.mode="color"}
    carve(H,w);sculpt(H,DEF_SCULPT.concat(extra||[]));padStations(H,sts);
    return{H,info}}

  /* ================= 程式畫的備用貼圖 ================= */
  function signTex(name){return cvTex(256,320,(g,w,h)=>{g.clearRect(0,0,w,h);
    g.fillStyle="#6b4a2e";g.fillRect(w/2-9,h*.55,18,h*.45);
    g.fillStyle="#f1e2c2";g.strokeStyle="#4a3220";g.lineWidth=10;g.beginPath();g.rect(w*.2,h*.05,w*.6,h*.58);g.fill();g.stroke();
    const cs=Array.from(name).slice(0,5),step=h*.5/cs.length,fs=Math.min(52,step*.92);
    g.fillStyle="#7a2a1a";g.font="bold "+fs+"px serif";g.textAlign="center";g.textBaseline="middle";
    cs.forEach((c,i)=>g.fillText(c,w/2,h*.09+step*(i+.5)))})}
  function skyTex(){return cvTex(16,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,"#2b3644");gr.addColorStop(.55,"#6b7886");gr.addColorStop(.7,"#b9c0c4");gr.addColorStop(1,"#d9dcdc");g.fillStyle=gr;g.fillRect(0,0,w,h)})}
  function waterTex(){return cvTex(128,128,(g,w,h)=>{g.fillStyle="#7fb6cc";g.fillRect(0,0,w,h);g.strokeStyle="rgba(255,255,255,.35)";g.lineWidth=1.5;
    for(let i=0;i<40;i++){const x=Math.random()*w,y=Math.random()*h,l=6+Math.random()*14;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+l/2,y-2,x+l,y);g.stroke()}})}
  function cloudTex(){return cvTex(128,128,(g,w,h)=>{g.fillStyle="#000";g.fillRect(0,0,w,h);
    for(let i=0;i<9;i++){const x=w*(.3+Math.random()*.4),y=h*(.35+Math.random()*.3),r=w*(.14+Math.random()*.14),gr=g.createRadialGradient(x,y,0,x,y,r);gr.addColorStop(0,"rgba(255,255,255,.9)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,w,h)}})}
  function flowTex(){return cvTex(128,8,(g,w,h)=>{const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,"rgba(255,210,120,.12)");gr.addColorStop(.42,"rgba(255,244,200,1)");gr.addColorStop(.58,"rgba(255,244,200,1)");gr.addColorStop(1,"rgba(255,210,120,.12)");g.fillStyle=gr;g.fillRect(0,0,w,h)})}

  /* 站點資料：預設值＋App 傳進來的進度（pass 已過關數、total 關數、stars 星數、locked 是否鎖住） */
  function mergeStations(list){const by={};(list||[]).forEach(s=>{if(s&&s.id)by[s.id]=s});
    const out=DEF_STATIONS.map(d=>Object.assign({total:6,pass:0,stars:0},d,by[d.id]||{}));
    (list||[]).forEach(s=>{if(s&&s.id&&!DEF_STATIONS.some(d=>d.id===s.id)&&s.u!=null)out.push(Object.assign({total:6,pass:0,stars:0,name:s.id},s))});
    out.forEach((s,i)=>{if(s.locked==null)s.locked=i>0&&(out[i-1].pass||0)<(out[i-1].total||6)});
    return out}

  /* ================= 主程式 ================= */
  function create(host,opt){
    opt=opt||{};injectCss();
    const base=opt.base||"data/map3d/";
    let stations=mergeStations(opt.stations);
    const route=opt.route||DEF_ROUTE;

    const el=div("m3d");host.appendChild(el);
    let rd;try{rd=new T.WebGLRenderer({antialias:true,powerPreference:"high-performance"})}catch(e){el.textContent="這台裝置不支援 3D 地圖";return null}
    rd.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
    if(T.ColorManagement)T.ColorManagement.legacyMode=false;
    if(T.sRGBEncoding!=null)rd.outputEncoding=T.sRGBEncoding;
    const cvs=rd.domElement;el.appendChild(cvs);
    const labLayer=div("");labLayer.style.cssText="position:absolute;inset:0;pointer-events:none";el.appendChild(labLayer);
    const hint=div("m3d-hint","一指轉動・兩指縮放・點地標前往・點兩下回正");el.appendChild(hint);
    const card=div("m3d-card");el.appendChild(card);
    const veil=div("m3d-veil",(typeof ROAD_NAME!=="undefined"?ROAD_NAME:"章回棋路")+"展開中…");   /* 意見回饋 674：路名跟著 App 的 ROAD_NAME */el.appendChild(veil);
    const dbg=opt.debug?div("m3d-dbg",""):null;if(dbg)el.appendChild(dbg);

    /* ---------- 場景、鏡頭、燈 ---------- */
    const sc=new T.Scene();const FOG=0x8e9aa5;sc.background=new T.Color(FOG);sc.fog=new T.Fog(FOG,60,150);
    const cam=new T.PerspectiveCamera(42,1,.3,700);
    sc.add(new T.HemisphereLight(0xe8eef4,0x55604a,.7));
    const sun=new T.DirectionalLight(0xfff0dc,.4);sun.position.set(-20,30,15);sc.add(sun);

    let W=1,H=1;
    function fit(){W=Math.max(1,el.clientWidth||host.clientWidth||360);
      H=opt.height||Math.round(Math.min(W*1.25,(window.innerHeight||800)*.78));
      el.style.height=H+"px";rd.setSize(W,H,false);cam.aspect=W/H;cam.updateProjectionMatrix()}

    /* 預設距離：讓地圖寬度剛好塞進畫面 */
    function homeDist(){const hf=2*Math.atan(Math.tan(cam.fov*PI/360)*cam.aspect);return clamp(MAP_W*.47/Math.tan(hf/2),26,75)}
    const HOME={x:0,y:1.2,z:1.5,yaw:0,pitch:.98};
    const C={tgt:new T.Vector3(HOME.x,HOME.y,HOME.z),yaw:HOME.yaw,pitch:HOME.pitch,dist:46};
    const G={tgt:C.tgt.clone(),yaw:C.yaw,pitch:C.pitch,dist:C.dist};
    let ease=9,flyT=0;
    const LIM={pMin:.55,pMax:1.38,dMin:7,dMax:80,yaw:1.25};
    function clampGoal(){G.pitch=clamp(G.pitch,LIM.pMin,LIM.pMax);G.dist=clamp(G.dist,LIM.dMin,LIM.dMax);G.yaw=clamp(G.yaw,-LIM.yaw,LIM.yaw);
      G.tgt.x=clamp(G.tgt.x,-MAP_W/2,MAP_W/2);G.tgt.z=clamp(G.tgt.z,-MAP_D/2,MAP_D/2)}
    function placeCam(){const cp=Math.cos(C.pitch);cam.position.set(C.tgt.x+Math.sin(C.yaw)*cp*C.dist,C.tgt.y+Math.sin(C.pitch)*C.dist,C.tgt.z+Math.cos(C.yaw)*cp*C.dist);cam.lookAt(C.tgt)}
    function resetView(){G.tgt.set(HOME.x,HOME.y,HOME.z);G.yaw=HOME.yaw;G.pitch=HOME.pitch;G.dist=homeDist();LIM.dMax=G.dist*1.4;ease=4;flyT=1.2}

    /* ---------- 物件 ---------- */
    let Hgrid=null,terrain=null,water=null,info=null;
    const heightAt=(u,v)=>Hgrid?sampleGrid(Hgrid,u,v)*H_MAX:0;
    const heightWorld=(x,z)=>{const q=toUV(x,z);return heightAt(q.u,q.v)};
    const marks=[];
    const segs=[];
    const clouds=[];
    let waterT=null;

    function buildTerrain(mapTex){
      const g=new T.PlaneGeometry(MAP_W,MAP_D,SEG_X,SEG_Z);g.rotateX(-PI/2);
      const p=g.attributes.position,uv=g.attributes.uv;
      for(let i=0;i<p.count;i++){const iu=uv.getX(i),iv=V_CROP+(1-uv.getY(i))*(1-V_CROP);p.setY(i,heightAt(iu,iv))}
      g.computeVertexNormals();
      mapTex.repeat.set(1,1-V_CROP);mapTex.offset.set(0,0);
      try{mapTex.anisotropy=rd.capabilities.getMaxAnisotropy()||4}catch(e){}
      terrain=new T.Mesh(g,new T.MeshLambertMaterial({map:mapTex}));sc.add(terrain)}

    /* 四邊的裙邊：讓地圖看起來像一塊沙盤 */
    function buildSkirt(sideTex){const pts=[],N=120;
      const edge=(u0,v0,u1,v1)=>{for(let i=0;i<N;i++){const t=i/N;pts.push([lerp(u0,u1,t),lerp(v0,v1,t)])}};
      edge(0,V_CROP,1,V_CROP);edge(1,V_CROP,1,1);edge(1,1,0,1);edge(0,1,0,V_CROP);pts.push([0,V_CROP]);
      const pos=[],uvs=[],idx=[];let acc=0,prev=null;
      pts.forEach(q=>{const w=toWorld(q[0],q[1]),y=heightAt(q[0],q[1]);if(prev)acc+=Math.hypot(w.x-prev.x,w.z-prev.z);prev=w;
        pos.push(w.x,y,w.z,w.x,BOTTOM,w.z);uvs.push(acc/10,1,acc/10,0)});
      for(let i=0;i<pts.length-1;i++){const a=i*2;idx.push(a,a+1,a+2,a+2,a+1,a+3)}
      const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setAttribute("uv",new T.Float32BufferAttribute(uvs,2));g.setIndex(idx);g.computeVertexNormals();
      let m;if(sideTex){sideTex.wrapS=T.RepeatWrapping;m=new T.MeshLambertMaterial({map:sideTex,side:T.DoubleSide})}else m=new T.MeshLambertMaterial({color:0x5e5040,side:T.DoubleSide});
      sc.add(new T.Mesh(g,m))}

    function buildWater(tex){waterT=tex||waterTex();waterT.wrapS=waterT.wrapT=T.RepeatWrapping;waterT.repeat.set(8,10);
      const g=new T.PlaneGeometry(MAP_W,MAP_D,1,1);g.rotateX(-PI/2);
      water=new T.Mesh(g,new T.MeshPhongMaterial({color:0xa8d4e6,map:waterT,transparent:true,opacity:.38,shininess:70,specular:0x9fbfcc,depthWrite:false}));
      water.position.y=WATER*H_MAX;water.renderOrder=1;sc.add(water)}

    function buildSky(tex){const t=tex||skyTex();t.wrapS=T.MirroredRepeatWrapping;t.repeat.set(tex?2:1,1);
      const g=new T.SphereGeometry(320,48,24);
      const m=new T.MeshBasicMaterial({map:t,side:T.BackSide,fog:false,depthWrite:false});
      const s=new T.Mesh(g,m);s.position.y=-40;s.renderOrder=-1;sc.add(s)}

    /* 雲海：地圖底下和四周飄著一片片雲（cloud.webp 用亮度當透明度） */
    function buildClouds(tex){const t=tex||cloudTex();
      for(let i=0;i<26;i++){const m=new T.SpriteMaterial({color:0xf2f4f5,alphaMap:t,transparent:true,opacity:.75,depthWrite:false,fog:true});
        const s=new T.Sprite(m),a=Math.random()*PI*2,r=lerp(21,45,Math.random());
        s.position.set(Math.cos(a)*r*.9,lerp(BOTTOM-1.5,0,Math.random()),Math.sin(a)*r);const k=lerp(10,20,Math.random());s.scale.set(k,k*.5,1);
        s.userData={a,r,sp:(Math.random()<.5?-1:1)*lerp(.004,.012,Math.random()),y:s.position.y};sc.add(s);clouds.push(s)}
      const g=new T.PlaneGeometry(400,400);g.rotateX(-PI/2);
      const tt=t.clone();tt.needsUpdate=true;tt.wrapS=tt.wrapT=T.RepeatWrapping;tt.repeat.set(14,14);
      const floor=new T.Mesh(g,new T.MeshBasicMaterial({color:0xdfe3e4,alphaMap:tt,transparent:true,opacity:.9,depthWrite:false}));floor.position.y=BOTTOM+.4;sc.add(floor)}

    /* ---------- 地標 ---------- */
    const pedMat=new T.MeshLambertMaterial({color:0x8c8577});
    const pedGeo=new T.CylinderGeometry(.85,1.0,.32,28);
    const ringGeo=new T.RingGeometry(1.15,1.5,40);ringGeo.rotateX(-PI/2);
    function buildMark(st){const w=toWorld(st.u,st.v),y=heightAt(st.u,st.v);
      const g=new T.Group();g.position.set(w.x,y,w.z);
      const ped=new T.Mesh(pedGeo,pedMat);ped.position.y=.16;g.add(ped);
      const ring=new T.Mesh(ringGeo,new T.MeshBasicMaterial({color:0xffd36b,transparent:true,opacity:0,blending:T.AdditiveBlending,depthWrite:false}));ring.position.y=.05;g.add(ring);
      const mat=new T.MeshBasicMaterial({map:signTex(st.name),transparent:true,alphaTest:.35,side:T.DoubleSide});
      const cardM=new T.Mesh(new T.PlaneGeometry(1,1),mat);cardM.position.y=.3;g.add(cardM);
      const m={st,g,ped,ring,card:cardM,mat,hh:st.size||3,pos:g.position,lab:div("m3d-lab")};
      setCardSize(m,256/320);ped.userData.mark=m;cardM.userData.mark=m;
      m.lab.style.pointerEvents="auto";m.lab.addEventListener("pointerdown",e=>e.stopPropagation());m.lab.addEventListener("click",e=>{e.stopPropagation();select(m.st.id)});
      labLayer.appendChild(m.lab);sc.add(g);marks.push(m);
      new T.TextureLoader().load(base+(st.img||("lm_"+st.id+".webp")),t=>{if(stopped)return;srgb(t);const old=m.mat.map;m.mat.map=t;m.mat.needsUpdate=true;if(old)old.dispose();
        setCardSize(m,t.image&&t.image.height?t.image.width/t.image.height:1)},undefined,()=>{});
      return m}
    function setCardSize(m,aspect){const hh=m.hh,ww=hh*aspect;m.card.geometry.dispose();const pg=new T.PlaneGeometry(ww,hh);pg.translate(0,hh/2,0);m.card.geometry=pg}

    /* ---------- 路線 ---------- */
    const flowBase=flowTex();
    function buildSeg(points){
      const p2=points.map(q=>{const w=toWorld(q[0],q[1]);return new T.Vector3(w.x,0,w.z)});
      const c2=new T.CatmullRomCurve3(p2,false,"centripetal");const len=c2.getLength(),n=Math.max(24,Math.round(len*4));
      const pts=c2.getSpacedPoints(n).map(p=>new T.Vector3(p.x,Math.max(heightWorld(p.x,p.z),WATER*H_MAX+.25)+.18,p.z));
      const curve=new T.CatmullRomCurve3(pts,false,"catmullrom",.2);
      const core=new T.Mesh(new T.TubeGeometry(curve,n*2,.07,6,false),new T.MeshBasicMaterial({color:0xfff2c0,transparent:true,opacity:1}));
      const ft=flowBase.clone();ft.needsUpdate=true;ft.wrapS=T.RepeatWrapping;ft.repeat.set(Math.max(1,len/2.2),1);
      const glow=new T.Mesh(new T.TubeGeometry(curve,n*2,.24,8,false),new T.MeshBasicMaterial({color:0xffc14d,map:ft,transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false}));
      sc.add(core);sc.add(glow);return{core,glow,ft,len}}
    function refreshSegs(){segs.forEach((s,i)=>{const nx=stations[i+1],open=nx&&!nx.locked;
      s.glow.visible=!!open;s.core.material.color.set(open?0xfff2c0:0xd9d3c4);s.core.material.opacity=open?1:.4})}

    /* ---------- 進度、標籤、卡片 ---------- */
    let sel=null;
    const curIndex=()=>{const i=stations.findIndex(s=>!s.locked&&(s.pass||0)<(s.total||6));return i<0?stations.length-1:i};
    function refreshMarks(){const ci=curIndex();marks.forEach((m,i)=>{const st=stations.find(s=>s.id===m.st.id)||m.st;m.st=st;
      m.mat.color.set(st.locked?0x7d7d7d:0xffffff);
      m.lab.className="m3d-lab"+(st.locked?" lock":"")+(i===ci?" cur":"")+(sel===st.id?" sel":"");
      m.lab.innerHTML=(st.locked?"🔒 ":"")+esc(st.name)+"<small>"+(st.pass||0)+"／"+(st.total||6)+"</small>"});
      refreshSegs();if(sel)showCard(sel)}
    function showCard(id){const st=stations.find(s=>s.id===id);if(!st){card.classList.remove("on");return}
      const tot=st.total||6,ps=Math.min(tot,st.pass||0),pct=Math.round(ps/tot*100);
      card.innerHTML="<b>"+(st.locked?"🔒 ":"")+esc(st.name)+"</b> <span class='sub'>第 "+st.from+"–"+st.to+" 關</span>"+
        "<div class='sub'>"+esc(st.sub||"")+"</div>"+
        "<div class='m3d-bar'><i style='width:"+pct+"%'></i></div>"+
        "<div>已過 "+ps+"／"+tot+" 關　🫙 "+(st.stars||0)+"／"+tot*3+" 子</div>"+
        "<div class='m3d-row'><button data-a='go'"+(st.locked?" disabled":"")+">"+(st.locked?"還沒開放":(ps>=tot?"再闖一次":"出發"))+"</button><button class='g' data-a='x'>✕</button></div>";
      card.querySelector("[data-a=go]").onclick=e=>{e.stopPropagation();if(!st.locked&&opt.onPick)opt.onPick(st,"enter")};
      card.querySelector("[data-a=x]").onclick=e=>{e.stopPropagation();deselect()};
      card.classList.add("on")}
    ["pointerdown","pointerup","pointermove"].forEach(ev=>card.addEventListener(ev,e=>e.stopPropagation()));

    function select(id){const m=marks.find(x=>x.st.id===id);if(!m)return;sel=id;
      /* 鏡頭對準站點「靠近鏡頭那一側」一點，站點就會落在畫面上半部，不會被下方的進度卡蓋住 */
      G.dist=Math.min(Math.max(G.dist*.5,12),16);G.pitch=.8;const off=G.dist*.16;
      G.tgt.set(m.pos.x+Math.sin(G.yaw)*off,m.pos.y+1.2,m.pos.z+Math.cos(G.yaw)*off);ease=3.2;flyT=1.4;clampGoal();
      refreshMarks();showCard(id);if(opt.onPick)opt.onPick(m.st,"select")}
    function deselect(){sel=null;card.classList.remove("on");refreshMarks()}

    /* ---------- 點選 ---------- */
    const ray=new T.Raycaster(),ndc=new T.Vector2();
    function pick(cx,cy){const r=cvs.getBoundingClientRect();ndc.set((cx-r.left)/r.width*2-1,-(cy-r.top)/r.height*2+1);ray.setFromCamera(ndc,cam);
      const objs=[];marks.forEach(m=>{objs.push(m.card,m.ped)});
      const hit=ray.intersectObjects(objs,false)[0];if(hit)return hit.object.userData.mark.st.id;
      if(terrain){const th=ray.intersectObject(terrain,false)[0];if(th){let best=null,bd=2.6;marks.forEach(m=>{const d=Math.hypot(m.pos.x-th.point.x,m.pos.z-th.point.z);if(d<bd){bd=d;best=m.st.id}});return best}}
      return null}

    /* ---------- 操作：一指轉動、兩指縮放（＋平移）、滾輪縮放、右鍵平移、點兩下回正 ---------- */
    const ptrs=new Map();let drag=null,pinch=null,lastTap=0,touched=false;
    const spread=()=>{const a=Array.from(ptrs.values());return Math.max(20,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y))};
    const mid=()=>{const a=Array.from(ptrs.values());return{x:(a[0].x+a[1].x)/2,y:(a[0].y+a[1].y)/2}};
    function panFrom(t0,dx,dy){const k=G.dist*2*Math.tan(cam.fov*PI/360)/H,cy=Math.cos(G.yaw),sy=Math.sin(G.yaw);
      G.tgt.set(t0.x-(cy*dx+sy*dy*1.3)*k,t0.y,t0.z-(-sy*dx+cy*dy*1.3)*k);clampGoal()}
    const userMoved=()=>{ease=9;flyT=0;if(!touched){touched=true;hint.style.opacity=0}};
    cvs.addEventListener("contextmenu",e=>e.preventDefault());
    cvs.addEventListener("pointerdown",e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cvs.setPointerCapture(e.pointerId)}catch(_){}
      if(ptrs.size>=2){const m=mid();pinch={d:spread(),dist:G.dist,mx:m.x,my:m.y,t0:G.tgt.clone()};drag=null;lastTap=0;return}
      drag={x:e.clientX,y:e.clientY,yaw:G.yaw,pitch:G.pitch,t0:G.tgt.clone(),pan:e.button===2||e.shiftKey,moved:false}});
    cvs.addEventListener("pointermove",e=>{const pt=ptrs.get(e.pointerId);if(pt){pt.x=e.clientX;pt.y=e.clientY}
      if(pinch){if(ptrs.size>=2){userMoved();G.dist=pinch.dist*pinch.d/spread();const m=mid();panFrom(pinch.t0,m.x-pinch.mx,m.y-pinch.my);clampGoal()}return}
      if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(!drag.moved&&Math.hypot(dx,dy)>8)drag.moved=true;
      if(!drag.moved)return;userMoved();
      if(drag.pan)panFrom(drag.t0,dx,dy);else{G.yaw=drag.yaw-dx/W*3.2;G.pitch=drag.pitch+dy/H*2.2;clampGoal()}});
    const up=e=>{ptrs.delete(e.pointerId);
      if(pinch){if(ptrs.size<2){pinch=null;const p=Array.from(ptrs.values())[0];drag=p?{x:p.x,y:p.y,yaw:G.yaw,pitch:G.pitch,t0:G.tgt.clone(),pan:false,moved:true}:null}return}
      if(!drag)return;const d=drag;drag=null;if(d.moved)return;
      const now=performance.now();if(now-lastTap<320){lastTap=0;deselect();resetView();return}lastTap=now;
      const id=pick(e.clientX,e.clientY);if(id)select(id);else if(sel)deselect()};
    cvs.addEventListener("pointerup",up);
    cvs.addEventListener("pointercancel",e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;drag=null});
    cvs.addEventListener("wheel",e=>{e.preventDefault();userMoved();G.dist*=Math.exp(e.deltaY*(e.ctrlKey?.01:.0015));clampGoal()},{passive:false});
    ["gesturestart","gesturechange"].forEach(ev=>el.addEventListener(ev,e=>e.preventDefault(),{passive:false}));

    /* ---------- 載圖、組場景 ---------- */
    let stopped=false,ready=false;
    const loader=new T.TextureLoader();
    const load=name=>new Promise(res=>{if(!name)return res(null);loader.load(base+name,t=>res(t),undefined,()=>res(null))});
    const loadFirst=names=>names.reduce((p,n)=>p.then(t=>t||load(n)),Promise.resolve(null));
    Promise.all([loadFirst([opt.mapFile||"map.webp","map.png"]),opt.heightMode==="color"?null:load(opt.heightFile||"height.png"),load("sky.webp"),load("water.webp"),load("cloud.webp"),load("side.webp")])
    .then(r=>{if(stopped)return;const mapT=r[0],hT=r[1];
      if(!mapT){veil.textContent="找不到地圖貼圖（"+base+"map.webp）";return}
      srgb(mapT);
      const res=makeHeight(mapT.image,hT&&hT.image,opt.heightMode||"auto",stations,opt.sculpt);Hgrid=res.H;info=res.info;
      if(hT)hT.dispose();
      if(info.reject)console.warn("[XQMap3D] "+info.reject);
      console.info("[XQMap3D] 地形來源："+info.mode+"，對齊分數 "+info.score+"，位移 "+info.shift.join(","));
      if(dbg)dbg.textContent="高度："+info.mode+"  分數 "+info.score+"  位移 "+info.shift.join(",");
      buildTerrain(mapT);buildSkirt(srgb(r[5]));buildWater(srgb(r[3]));buildSky(srgb(r[2]));buildClouds(r[4]);
      stations.forEach(buildMark);
      for(let i=0;i<stations.length-1;i++){const pts=route[i]||[[stations[i].u,stations[i].v],[stations[i+1].u,stations[i+1].v]];segs.push(buildSeg(pts))}
      refreshMarks();
      fit();resetView();C.tgt.copy(G.tgt);C.yaw=G.yaw;C.pitch=G.pitch+.25;C.dist=G.dist*1.25;ease=2.5;flyT=1.5;
      ready=true;veil.style.opacity=0;setTimeout(()=>veil.remove(),450);
      if(opt.onReady)opt.onReady(info);
      setTimeout(()=>{if(!touched)hint.style.opacity=0},6000)});

    /* ---------- 動畫迴圈 ---------- */
    let last=performance.now();
    const v3=new T.Vector3();
    function frame(now){if(stopped)return;if(!document.body.contains(el)){destroy();return}requestAnimationFrame(frame);
      const dt=Math.min(.05,(now-last)/1000);last=now;if(document.hidden||el.style.display==="none"||!ready)return;
      if(el.clientWidth&&Math.abs(el.clientWidth-W)>1)fit();
      if(flyT>0){flyT-=dt;if(flyT<=0)ease=9}
      const k=Math.min(1,dt*ease);
      C.tgt.lerp(G.tgt,k);C.yaw+=wrapPI(G.yaw-C.yaw)*k;C.pitch+=(G.pitch-C.pitch)*k;C.dist+=(G.dist-C.dist)*k;placeCam();
      const ci=curIndex(),tt=now/1000;
      marks.forEach((m,i)=>{m.card.rotation.y=Math.atan2(cam.position.x-m.pos.x,cam.position.z-m.pos.z);
        const on=sel===m.st.id,cur=i===ci&&!m.st.locked;m.ring.material.opacity=on?.85:cur?.35+.3*Math.sin(tt*3):0;
        m.card.position.y=.3+(on?.12*Math.sin(tt*2.4):0);
        v3.set(m.pos.x,m.pos.y+m.hh+.7,m.pos.z).project(cam);
        if(v3.z>1||Math.abs(v3.x)>1.2||Math.abs(v3.y)>1.2)m.lab.style.display="none";
        else{m.lab.style.display="";m.lab.style.transform="translate("+((v3.x+1)/2*W)+"px,"+((1-v3.y)/2*H)+"px) translate(-50%,-100%)"}});
      segs.forEach(s=>{if(s.glow.visible)s.ft.offset.x-=dt*.6});
      if(waterT){waterT.offset.y-=dt*.02;waterT.offset.x+=dt*.004}
      clouds.forEach(s=>{const u=s.userData;u.a+=u.sp*dt*6;s.position.x=Math.cos(u.a)*u.r*.9;s.position.z=Math.sin(u.a)*u.r;s.position.y=u.y+.3*Math.sin(tt*.3+u.a*3)});
      rd.render(sc,cam)}

    fit();placeCam();requestAnimationFrame(frame);
    const onRs=()=>{if(el.style.display!=="none")fit()};window.addEventListener("resize",onRs);

    function destroy(){if(stopped)return;stopped=true;window.removeEventListener("resize",onRs);
      sc.traverse(o=>{if(o.geometry)o.geometry.dispose();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose();if(m.alphaMap)m.alphaMap.dispose();m.dispose()})}});
      try{rd.dispose();rd.forceContextLoss()}catch(e){}el.remove();if(opt.onDestroy)opt.onDestroy()}

    return{el,
      focus(id){if(ready)select(id)},
      setStations(list){stations=mergeStations(list);refreshMarks()},
      resetView(){deselect();resetView()},
      heightAt:(u,v)=>heightAt(u,v),
      info:()=>info,
      hide(){el.style.display="none"},
      show(){if(el.style.display==="none"){el.style.display="";fit()}},
      destroy}}

  window.XQMap3D={create,STATIONS:DEF_STATIONS,ROUTE:DEF_ROUTE,toWorld,toUV};
})();
