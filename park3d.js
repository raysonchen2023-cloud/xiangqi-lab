// 公園 3D 棋盤（意見回饋 212）：第一人稱坐在公園石桌前下棋，小帥坐在對面的長椅上當對手
// - 場景：天空漸層、遠山、草地與石板地、大樹、路燈、石桌石凳、桌上的茶杯；午後暖光＋柔和陰影＋淡霧
// - 棋盤：木製棋盤嵌在石桌上，棋子是有厚度、圓角的木棋，字刻在上面；被吃掉的棋子排在桌邊
// - 互動：點棋盤選子、走子（跟原本的 2D 棋盤一樣的規則與流程）；拖曳可以轉頭看四周，點兩下回正
// - 小帥：平常看棋盤、眨眼、偶爾抬頭看你；電腦思考時手托下巴；它走棋時伸手；被吃子會驚訝；輸贏有表情
(function(){
  const T=window.THREE;if(!T)return;
  const PI=Math.PI,TAU=PI*2,ease=p=>p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const NAMES={r:{K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},b:{K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"}};
  const sideOf=p=>p===p.toUpperCase()?"r":"b";
  const START={r:{K:1,A:2,B:2,N:2,R:2,C:2,P:5},b:{K:1,A:2,B:2,N:2,R:2,C:2,P:5}};
  const BW=10.4,BH=11.4,TOP=.56;    // 棋盤（含邊）大小、棋盤面高度；格距 1
  // 色彩管理（意見回饋 218）：這版 three（r149）用 encoding，不認 colorSpace；貼圖標成 sRGB、輸出也是 sRGB，顏色才不會被洗白
  let ANI=8;
  const srgb=t=>{if(T.sRGBEncoding!=null)t.encoding=T.sRGBEncoding;if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;return t};
  function cv(w,h,f){const c=document.createElement("canvas");c.width=w;c.height=h;f(c.getContext("2d"),w,h);const t=srgb(new T.CanvasTexture(c));t.anisotropy=ANI;return t}
  const noise=(g,w,h,n,a,b)=>{for(let i=0;i<n;i++){g.fillStyle=`rgba(${a},${Math.random()*b})`;const s=1+Math.random()*3;g.fillRect(Math.random()*w,Math.random()*h,s,s)}};
  // ---------- 貼圖 ----------
  // 棋盤：較深的蜂蜜色木紋＋深褐粗線，在灰色石桌上一眼就看得出來；貼圖解析度提高，iPhone 上線條不糊
  // 朝代造型（意見回饋 216）：App 傳來目前朝代的棋盤底圖、格線色、棋子底圖、字色、字形；跟平面棋盤同一套
  let LOOK=null;const imgCache={};
  const loadImg=(src,cb)=>{if(!src)return null;const c=imgCache[src];if(c){if(c.complete&&c.naturalWidth)return c;c.addEventListener("load",()=>cb&&cb(),{once:true});return null}
    const im=new Image();im.decoding="async";im.src=src;imgCache[src]=im;im.addEventListener("load",()=>cb&&cb(),{once:true});return null};
  const boardTex=onReady=>{const t=cv(1560,1710,(g,w,h)=>drawBoard(g,w,h,onReady));return t};
  function drawBoard(g,w,h,onReady){const u=w/BW;const L=LOOK,im=L&&L.img?loadImg(L.img,onReady):null;
    if(im&&L.rect){// 平面棋盤座標：格線原點 (40,40)、格距 60；這裡格線原點在 1.2 格處
      const P=v=>((v-40)/60+1.2)*u,[x,y,ww,hh]=L.rect;g.fillStyle="#2a1a10";g.fillRect(0,0,w,h);g.drawImage(im,P(x),P(y),ww/60*u,hh/60*u);
      const X=c=>(c+1.2)*u,Y=r=>(r+1.2)*u,G=L.grid||"#3A1D0A";g.strokeStyle=G;g.lineCap="round";g.lineWidth=6;g.strokeRect(X(0)-.13*u,Y(0)-.13*u,8.26*u,9.26*u);g.lineWidth=4.5;
      for(let r=0;r<10;r++){g.beginPath();g.moveTo(X(0),Y(r));g.lineTo(X(8),Y(r));g.stroke()}
      for(let c=0;c<9;c++){g.beginPath();if(c===0||c===8){g.moveTo(X(c),Y(0));g.lineTo(X(c),Y(9))}else{g.moveTo(X(c),Y(0));g.lineTo(X(c),Y(4));g.moveTo(X(c),Y(5));g.lineTo(X(c),Y(9))}g.stroke()}
      for(const r0 of[0,7]){g.beginPath();g.moveTo(X(3),Y(r0));g.lineTo(X(5),Y(r0+2));g.moveTo(X(5),Y(r0));g.lineTo(X(3),Y(r0+2));g.stroke()}
      return}
    let gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,"#E2B271");gr.addColorStop(.5,"#D6A361");gr.addColorStop(1,"#C99252");g.fillStyle=gr;g.fillRect(0,0,w,h);
    for(let i=0;i<220;i++){g.strokeStyle=`rgba(${110+Math.random()*40|0},${60+Math.random()*30|0},18,${.05+Math.random()*.09})`;g.lineWidth=1+Math.random()*4;g.beginPath();const y=Math.random()*h;g.moveTo(0,y);
      for(let x=0;x<=w;x+=40)g.lineTo(x,y+Math.sin(x/120+i)*8+Math.random()*2);g.stroke()}
    const X=c=>(c+1.2)*u,Y=r=>(r+1.2)*u;g.strokeStyle="#3A1D0A";g.lineCap="round";
    g.lineWidth=12;g.strokeRect(X(0)-.32*u,Y(0)-.32*u,8.64*u,9.64*u);g.lineWidth=5;
    for(let r=0;r<10;r++){g.beginPath();g.moveTo(X(0),Y(r));g.lineTo(X(8),Y(r));g.stroke()}
    for(let c=0;c<9;c++){g.beginPath();if(c===0||c===8){g.moveTo(X(c),Y(0));g.lineTo(X(c),Y(9))}else{g.moveTo(X(c),Y(0));g.lineTo(X(c),Y(4));g.moveTo(X(c),Y(5));g.lineTo(X(c),Y(9))}g.stroke()}
    for(const r0 of[0,7]){g.beginPath();g.moveTo(X(3),Y(r0));g.lineTo(X(5),Y(r0+2));g.moveTo(X(5),Y(r0));g.lineTo(X(3),Y(r0+2));g.stroke()}
    const mark=(c,r)=>{const d=.09*u,l=.2*u;for(const sx of[-1,1])for(const sy of[-1,1]){if((c===0&&sx<0)||(c===8&&sx>0))continue;const x=X(c)+sx*d,y=Y(r)+sy*d;g.beginPath();g.moveTo(x+sx*l,y);g.lineTo(x,y);g.lineTo(x,y+sy*l);g.stroke()}};
    g.lineWidth=4;for(const r of[2,7])for(const c of[1,7])mark(c,r);for(const r of[3,6])for(const c of[0,2,4,6,8])mark(c,r);
    g.fillStyle="#3A1D0A";g.font=`900 ${.62*u}px "Noto Serif TC","PMingLiU","Songti TC","SimSun",serif`;g.textAlign="center";g.textBaseline="middle";
    const ry=(Y(4)+Y(5))/2;g.fillText("楚",X(1.2),ry);g.fillText("河",X(2.6),ry);g.fillText("漢",X(5.4),ry);g.fillText("界",X(6.8),ry);
    noise(g,w,h,5000,"80,40,15",.07)}
  // 棋子面：象牙色底、粗深色刻字（大字、帶一點浮雕的亮邊與陰影），遠處的黑子也看得清楚
  // 朝代棋子（意見回饋 218）：1024 高解析字面，底圖原尺寸鋪滿（不裁邊），字用朝代字形＋朝代字色，外圈只描一道細反差邊；
  // 棋身側面的顏色取自底圖最外圈（漆器、青銅、青花…各朝代自己的顏色），不再一律米色
  const faceCache={},rimCache={},FN=1024,SERIF='"Noto Serif TC","PMingLiU","Songti TC","SimSun",serif';
  const lum=hex=>{const c=parseInt(hex.slice(1,7),16);return((c>>16)*.3+((c>>8)&255)*.59+(c&255)*.11)/255};
  const bgCache={};
  const bgOf=im=>{const k=im.src;if(bgCache[k]!=null)return bgCache[k];let v=.75;   // 底圖中間（字所在處）的平均亮度
    try{const c=document.createElement("canvas");c.width=c.height=32;const g=c.getContext("2d");g.drawImage(im,0,0,32,32);const d=g.getImageData(8,8,16,16).data;let t=0;for(let i=0;i<d.length;i+=4)t+=(d[i]*.3+d[i+1]*.59+d[i+2]*.11)/255;v=t/(d.length/4)}catch(e){}
    return bgCache[k]=v};
  const rimOf=im=>{const k=im.src;if(rimCache[k])return rimCache[k];let out="#E9D2A2";
    try{const c=document.createElement("canvas");c.width=c.height=64;const g=c.getContext("2d");g.drawImage(im,0,0,64,64);const d=g.getImageData(0,0,64,64).data;let r=0,gg=0,b=0,n=0;
      for(let y=0;y<64;y++)for(let x=0;x<64;x++){const q=Math.hypot(x+.5-32,y+.5-32)/32,i=(y*64+x)*4;if(q>.88&&q<.97&&d[i+3]>220){r+=d[i];gg+=d[i+1];b+=d[i+2];n++}}
      if(n)out="#"+[r,gg,b].map(v=>(v/n|0).toString(16).padStart(2,"0")).join("")}catch(e){}
    return rimCache[k]=out};
  // 字面的漆光：左上一點柔亮、外緣一圈淡淡的暗邊（像斜角），看起來是有厚度的上漆棋子
  const gloss=(g,n)=>{const h=n/2;let gr=g.createRadialGradient(h*.62,h*.55,0,h*.62,h*.55,h*1.05);gr.addColorStop(0,"rgba(255,255,255,.16)");gr.addColorStop(.55,"rgba(255,255,255,.04)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,n,n);
    gr=g.createRadialGradient(h,h,h*.9,h,h,h);gr.addColorStop(0,"rgba(0,0,0,0)");gr.addColorStop(1,"rgba(0,0,0,.28)");g.fillStyle=gr;g.fillRect(0,0,n,n)};
  // 字：先描反差邊（細）、再填字色；字形太細的朝代（GLY_BOLD）再用字色加粗一點
  // 反差邊只在需要的時候描：字色跟底色（底圖中間的平均亮度）差很多就幾乎不描，差不多才描明顯一點（不會一律白邊，紅字變粉紅）
  const glyph=(g,n,ch,ink,gly,bold,bg)=>{const h=n/2,li=lum(ink),need=clamp(1-(Math.abs(li-(bg==null?.75:bg))-.15)/.4,.15,1),halo=li>.5?`rgba(0,0,0,${.8*need})`:`rgba(255,255,255,${.85*need})`;g.lineJoin="round";g.lineCap="round";
    if(gly&&window.Path2D){const P2=new Path2D(gly),k=n*.6/100;g.save();g.translate(h-50*k,h-50*k);g.scale(k,k);
      g.strokeStyle=halo;g.lineWidth=(3+2.4*need)+bold/.31;g.stroke(P2);g.fillStyle=ink;g.fill(P2);if(bold){g.strokeStyle=ink;g.lineWidth=bold/.31;g.stroke(P2)}g.restore();return}
    g.font=`900 ${n*.6|0}px ${SERIF}`;g.textAlign="center";g.textBaseline="middle";const y=h+n*.03;
    g.strokeStyle=halo;g.lineWidth=n*(.016+.014*need);g.strokeText(ch,h,y);g.fillStyle=ink;g.fillText(ch,h,y);g.strokeStyle=ink;g.lineWidth=n*.008;g.strokeText(ch,h,y)};
  const faceTex=(ch,red,onReady)=>{const L=LOOK,s=red?"r":"b",im=L&&L.pieces?loadImg(L.pieces[s],onReady):null,key=ch+(im?"|"+L.k:"");if(faceCache[key])return faceCache[key];
    if(L&&L.pieces&&!im)return plainFace(ch,red);
    if(im)return faceCache[key]=cv(FN,FN,(g,n)=>{g.fillStyle=rimOf(im);g.fillRect(0,0,n,n);g.imageSmoothingQuality="high";g.drawImage(im,-n*.01,-n*.01,n*1.02,n*1.02);gloss(g,n);
      glyph(g,n,ch,(L.ink&&L.ink[s])||(red?"#B3141B":"#141414"),L.gly&&L.gly[ch],L.bold||0,bgOf(im))});
    return plainFace(ch,red)};
  // 沒有朝代底圖時的木棋：象牙色、紅黑字、內圈細線
  const plainFace=(ch,red)=>faceCache[ch]||(faceCache[ch]=cv(FN,FN,(g,n)=>{const h=n/2;
    let gr=g.createRadialGradient(h*.75,h*.7,40,h,h,h);gr.addColorStop(0,"#FFF4D8");gr.addColorStop(.75,"#F2DCAA");gr.addColorStop(1,"#D9B272");g.fillStyle=gr;g.fillRect(0,0,n,n);
    const ink=red?"#B3141B":"#141414";g.strokeStyle=ink;g.lineWidth=n*.022;g.beginPath();g.arc(h,h,h*.84,0,TAU);g.stroke();gloss(g,n);
    glyph(g,n,ch,ink,null,0,.85)}));
  const stoneTex=(base,rep)=>{const t=cv(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);noise(g,w,h,9000,"255,255,255",.12);noise(g,w,h,9000,"0,0,0",.14);
    for(let i=0;i<40;i++){g.fillStyle=`rgba(${Math.random()<.5?"40,40,40":"235,230,220"},${.05+Math.random()*.08})`;g.beginPath();g.arc(Math.random()*w,Math.random()*h,4+Math.random()*16,0,TAU);g.fill()}});
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep);return t};
  const paveTex=()=>{const t=cv(512,512,(g,w,h)=>{g.fillStyle="#8F8778";g.fillRect(0,0,w,h);const s=w/4;
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){const v=150+Math.random()*28|0;g.fillStyle=`rgb(${v},${v-8},${v-20})`;g.fillRect(x*s+4,y*s+4,s-8,s-8)}noise(g,w,h,6000,"0,0,0",.12)});
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(7,7);return t};
  const bubbleTex=txt=>cv(512,160,(g,w,h)=>{g.fillStyle="rgba(255,253,247,.96)";g.strokeStyle="#3a2618";g.lineWidth=6;const r=50;g.beginPath();g.moveTo(r,6);g.arcTo(w-6,6,w-6,h-30,r);g.arcTo(w-6,h-30,6,h-30,r);g.arcTo(6,h-30,6,6,r);g.arcTo(6,6,w-6,6,r);g.closePath();g.fill();g.stroke();
    g.fillStyle="#3a2618";let fs=54;g.font=`700 ${fs}px "Noto Sans TC","PingFang TC",sans-serif`;const tw=g.measureText(txt).width;if(tw>w-70){fs=Math.max(26,fs*(w-70)/tw|0);g.font=`700 ${fs}px "Noto Sans TC","PingFang TC",sans-serif`}
    g.textAlign="center";g.textBaseline="middle";g.fillText(txt,w/2,(h-30)/2+3)});

  // ---------- 朝代山水背景（水墨）：跟著 App 的朝代主題換天色、墨色、點景與地標 ----------
  // 構圖：石桌在山上的平台，平台外是雲霧山谷；遠景是一張圍繞的水墨長卷（圓柱貼圖），預設視角從兩側上角看得到，拖曳抬頭可看全景
  const ERA={
    classic:{sky:["#8DB3D3","#E7E3D3","#F1E6CC"],ink:"#2F3A36",mist:"#E9E4D4",acc:"#B3141B",acc2:"#E3B341",lm:["pavilion","pine"],tree:"pine"},
    qin:{sky:["#4E4A48","#B8A27C","#D9C39A"],ink:"#1B1714",mist:"#CDBC9C",acc:"#C42A22",acc2:"#14110E",lm:["wall"],tree:"pine"},
    han:{sky:["#7F9DB5","#E4D3B8","#EED9B6"],ink:"#2A1814",mist:"#E6D6BE",acc:"#A3271C",acc2:"#1A1210",lm:["que","pine"],tree:"pine"},
    sanguo:{sky:["#6E7F8C","#D9B98C","#E8B47E"],ink:"#22272B",mist:"#DDCCB4",acc:"#B5381F",acc2:"#2F5D7C",lm:["banners","fort"],tree:"pine"},
    weijin:{sky:["#9DB7A8","#E3E8D8","#EEF0E2"],ink:"#22301F",mist:"#E3E9DA",acc:"#4E6B3A",acc2:"#8A5A2B",lm:["bamboo","hut"],tree:"bamboo"},
    nanbei:{sky:["#93AFC0","#EBD9BC","#F0D9B2"],ink:"#4A3022",mist:"#EADBC4",acc:"#9E4A2A",acc2:"#2F6F6A",lm:["grotto","stupa"],tree:"pine"},
    sui:{sky:["#89A9C6","#DCE3E4","#EADFC8"],ink:"#22394A",mist:"#E1E5E2",acc:"#B3261E",acc2:"#22394A",lm:["canal","pine"],tree:"willow"},
    tang:{sky:["#7FA6CC","#F0D29C","#F4C27A"],ink:"#2C2620",mist:"#F0DDBA",acc:"#D98E2E",acc2:"#2E7D5B",lm:["pagoda","pine"],tree:"pine"},
    wudai:{sky:["#6F8BA6","#D5D1C2","#E2DCC8"],ink:"#1B2533",mist:"#DCDACD",acc:"#C9A24A",acc2:"#23395B",lm:["temple"],tree:"pine",tall:1},
    song:{sky:["#9FC0C4","#E6EAE0","#EFEBDD"],ink:"#2C3B37",mist:"#E5EBE3",acc:"#3E7F6E",acc2:"#B3141B",lm:["bridge","willowP"],tree:"willow"},
    yuan:{sky:["#4F86C6","#BFD9EE","#E8EEE8"],ink:"#2B3A48",mist:"#E3ECEE",acc:"#2456A6",acc2:"#F4F6FA",lm:["yurts"],tree:"pine",flat:1},
    ming:{sky:["#86A5C4","#EDD8B4","#F2D3A0"],ink:"#2A1C18",mist:"#EEDDC2",acc:"#B3261E",acc2:"#F2C14E",lm:["palace","pine"],tree:"pine"},
    qing:{sky:["#8FA9BF","#E8D9C2","#EED6B2"],ink:"#2A1A12",mist:"#E9DCC8",acc:"#C8102E",acc2:"#F2D27A",lm:["moongate","pavilion"],tree:"willow"}};
  const eraKey=()=>{let k="classic";try{const v=JSON.parse(localStorage.getItem("m_era")||"null");if(typeof v==="string"&&ERA[v])k=v}catch(e){}return k};
  const hexA=(h,a)=>{const n=parseInt(h.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`};
  // 背景長卷的幾何（世界座標）：半徑、弧度、上下高度；畫的時候用 PX(角度)、PY(高度) 換算成貼圖像素
  const PAN={r:170,arc:PI*1.2,yb:-170,yt:90,w:3072,h:1024};
  const skyTex=E=>cv(16,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,E.sky[0]);gr.addColorStop(.4,E.sky[1]);gr.addColorStop(.5,E.sky[2]);gr.addColorStop(.56,E.mist);gr.addColorStop(1,E.mist);g.fillStyle=gr;g.fillRect(0,0,w,h)});
  // 開發者用 Gemini 畫的朝代長卷（data/park/<朝代>.webp）：貼在背景正面（約左右各 47 度），四邊羽化融進程式畫的水墨背景
  // L、R＝圖上左右兩個主景的範圍（0～1）；分別放到畫面左上角、右上角看得到的位置，中間雲霧（會被對手擋住）壓窄
  const BG_IMG={qin:{src:"data/park/qin.webp",L:[.02,.165],R:[.2,.33]},han:{src:"data/park/han.webp",L:[.08,.35],R:[.65,.92]},classic:{src:"data/park/classic.webp",L:[.06,.36],R:[.64,.94]},sanguo:{src:"data/park/sanguo.webp",L:[.05,.35],R:[.62,.94]}};
  function drawUserPan(g,W,H,im,cfg){const iw=im.naturalWidth,ih=im.naturalHeight,dh=H*(cfg.h||.5),s=dh/ih,y0=H*(cfg.hy||.6)-dh*.6;
    const DEG=14,xL=W*(.5-DEG/216),xR=W*(.5+DEG/216);   // 兩個主景放在 ±14 度：抬頭就看得到，預設視角的上角也露一點
    const cL=(cfg.L[0]+cfg.L[1])/2,cR=(cfg.R[0]+cfg.R[1])/2,sx=v=>v*iw;
    // 左段＝圖的 [0, L1]，右段＝圖的 [R0, 1]，各以主景中心對準 xL／xR；兩段重疊就交叉淡化，有空隙就用圖上 [L1, R0] 那段補滿
    const lx0=xL-sx(cL)*s,lx1=xL+sx(cfg.L[1]-cL)*s,rx0=xR-sx(cR-cfg.R[0])*s,rx1=xR+sx(1-cR)*s,dhc=Math.ceil(dh);
    const part=(a0,a1,x0,x1,fadeL,fadeR)=>{const w=Math.max(1,Math.ceil(x1-x0)),c=document.createElement("canvas");c.width=w;c.height=dhc;const q=c.getContext("2d");
      q.drawImage(im,sx(a0),0,Math.max(1,sx(a1-a0)),ih,0,0,w,dh);q.globalCompositeOperation="destination-in";const gr=q.createLinearGradient(0,0,w,0);
      gr.addColorStop(0,fadeL?"rgba(0,0,0,0)":"#000");gr.addColorStop(Math.min(.5,fadeL/w),"#000");gr.addColorStop(Math.max(.5,1-fadeR/w),"#000");gr.addColorStop(1,fadeR?"rgba(0,0,0,0)":"#000");
      q.fillStyle=gr;q.fillRect(0,0,w,dhc);return[c,x0]};
    const ov=lx1-rx0,parts=[];
    if(ov>0){parts.push(part(0,cfg.L[1],lx0,lx1,0,ov),part(cfg.R[0],1,rx0,rx1,ov,0))}
    else{const m0=cfg.L[1],m1=Math.max(cfg.R[0],m0+.01),bl=40;parts.push(part(0,m0,lx0,lx1+bl,0,bl),part(m0,m1,lx1-bl,rx0+bl,bl,bl),part(cfg.R[0],1,rx0-bl,rx1,bl,0))}
    const off=document.createElement("canvas");off.width=W;off.height=dhc;const o=off.getContext("2d");for(const[c,x]of parts)o.drawImage(c,x,0);
    // 整片的外緣羽化：左右 3.5%、上 16%、下 26%
    o.globalCompositeOperation="destination-in";const a0=Math.max(0,lx0)/W,a1=Math.min(W,rx1)/W,fw=.035;
    const fx=o.createLinearGradient(0,0,W,0);fx.addColorStop(0,"rgba(0,0,0,0)");fx.addColorStop(Math.min(.49,a0),"rgba(0,0,0,0)");fx.addColorStop(Math.min(.49,a0+fw),"#000");fx.addColorStop(Math.max(.51,a1-fw),"#000");fx.addColorStop(Math.max(.51,a1),"rgba(0,0,0,0)");fx.addColorStop(1,"rgba(0,0,0,0)");
    o.fillStyle=fx;o.fillRect(0,0,W,dhc);const fy=o.createLinearGradient(0,0,0,dhc);fy.addColorStop(0,"rgba(0,0,0,0)");fy.addColorStop(.16,"#000");fy.addColorStop(.74,"#000");fy.addColorStop(1,"rgba(0,0,0,0)");o.fillStyle=fy;o.fillRect(0,0,W,dhc);
    g.drawImage(off,0,y0)}
  function panTex(E,seed){let s=seed||7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
    return cv(PAN.w,PAN.h,(g,W,H)=>{const PX=d=>(d/(PAN.arc*180/PI)+.5)*W,PY=y=>(PAN.yt-y)/(PAN.yt-PAN.yb)*H,ink=E.ink;
      // 水墨山：一條起伏的稜線往下填墨，上緣濃、往下漸淡入雲霧
      const ridge=(yTop,amp,freq,a,soft)=>{const pts=[],ph=[rnd()*9,rnd()*9,rnd()*9];let top=H;
        for(let x=0;x<=W;x+=8){const t=x/W;let y=Math.sin(t*freq*TAU+ph[0])*.5+Math.sin(t*freq*2.3*TAU+ph[1])*.3+Math.sin(t*freq*5.1*TAU+ph[2])*.12;y=Math.pow(Math.max(0,y*.5+.5),E.flat?1:1.6);
          const py=PY(yTop)+(1-y)*amp;pts.push([x,py]);top=Math.min(top,py)}
        const gr=g.createLinearGradient(0,top,0,top+amp+soft);gr.addColorStop(0,hexA(ink,a));gr.addColorStop(.45,hexA(ink,a*.55));gr.addColorStop(1,hexA(E.mist,0));
        g.fillStyle=gr;g.beginPath();g.moveTo(0,H);pts.forEach(p=>g.lineTo(p[0],p[1]));g.lineTo(W,H);g.closePath();g.fill();
        g.strokeStyle=hexA(ink,Math.min(1,a*1.3));g.lineWidth=2;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();return pts};
      const mist=(y,hh,a)=>{const gr=g.createLinearGradient(0,PY(y)-hh,0,PY(y)+hh);gr.addColorStop(0,hexA(E.mist,0));gr.addColorStop(.5,hexA(E.mist,a));gr.addColorStop(1,hexA(E.mist,0));g.fillStyle=gr;g.fillRect(0,PY(y)-hh,W,hh*2)};
      // 天空：上方留給天空球的漸層，這裡只畫太陽與淡雲
      const sx=PX(-38),sy=PY(48);let gr=g.createRadialGradient(sx,sy,0,sx,sy,140);gr.addColorStop(0,"rgba(255,250,232,.95)");gr.addColorStop(.18,"rgba(255,240,205,.7)");gr.addColorStop(1,"rgba(255,230,180,0)");g.fillStyle=gr;g.fillRect(sx-140,sy-140,280,280);
      for(let i=0;i<9;i++){const x=rnd()*W,y=PY(40+rnd()*40),w=160+rnd()*260;g.fillStyle="rgba(255,255,255,.22)";g.beginPath();g.ellipse(x,y,w,10+rnd()*10,0,0,TAU);g.fill()}
      // 遠山（高、淡）→ 中景 → 近景（低、濃）；每層之間夾一道雲霧
      ridge(E.tall?40:E.flat?-30:10,E.tall?260:E.flat?60:170,E.flat?2:3,.24,120);mist(-40,70,.75);
      ridge(E.flat?-55:-35,E.flat?50:150,4,.42,110);mist(-90,60,.8);
      const near=ridge(E.flat?-85:-70,E.flat?40:120,5,.72,90);mist(-140,50,.9);
      const ridgeY=x=>{const i=clamp(Math.round(x/8),0,near.length-1);return near[i][1]};
      // 墨點小樹沿著稜線
      const dotTree=(x,y,k)=>{g.fillStyle=hexA(ink,.7);g.fillRect(x-1,y-10*k,2,10*k);for(let j=0;j<5;j++){g.beginPath();g.ellipse(x+(rnd()-.5)*10*k,y-10*k-rnd()*10*k,5*k,3*k,0,0,TAU);g.fill()}};
      for(let i=0;i<70;i++){const x=rnd()*W;dotTree(x,ridgeY(x)+4,.8+rnd()*.8)}
      // ---------- 地標：放在左右兩側（預設視角的兩個上角看得到），中間留給對手 ----------
      const L=E.userBg?[]:E.lm,spots=[PX(-19),PX(19),PX(-60),PX(60),PX(95),PX(-95)];
      const roof=(cx,y,w,hh,col)=>{g.fillStyle=col;g.beginPath();g.moveTo(cx-w*.62,y-hh*.25);g.quadraticCurveTo(cx-w*.35,y,cx-w*.28,y-hh*.35);g.lineTo(cx-w*.12,y-hh);g.lineTo(cx+w*.12,y-hh);g.lineTo(cx+w*.28,y-hh*.35);g.quadraticCurveTo(cx+w*.35,y,cx+w*.62,y-hh*.25);g.lineTo(cx+w*.42,y-hh*.1);g.lineTo(cx-w*.42,y-hh*.1);g.closePath();g.fill()};
      const D={
        pavilion(x,y){const k=1.2,c=hexA(ink,.92);g.fillStyle=c;g.fillRect(x-30*k,y-6*k,60*k,6*k);for(const dx of[-22,-8,8,22])g.fillRect(x+dx*k-1.5*k,y-34*k,3*k,28*k);roof(x,y-32*k,70*k,26*k,c);g.fillRect(x-1.5*k,y-66*k,3*k,10*k)},
        pine(x,y){const c=hexA(ink,.85);g.strokeStyle=c;g.lineWidth=5;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+18,y-40,x-6,y-90);g.stroke();g.fillStyle=c;
          for(const[dx,dy,w]of[[-6,-90,46],[14,-70,40],[-20,-58,36],[4,-104,30]]){g.beginPath();g.ellipse(x+dx,y+dy,w,8,(rnd()-.5)*.3,0,TAU);g.fill()}},
        wall(x,y){g.fillStyle=hexA(ink,.88);for(let xx=0;xx<W;xx+=6){const yy=ridgeY(xx)-2;g.fillRect(xx,yy-16,6,18);if((xx/6|0)%3===0)g.fillRect(xx,yy-22,4,6)}
          for(const tx of[spots[0],spots[1],spots[2],spots[3]]){const yy=ridgeY(tx);g.fillRect(tx-18,yy-46,36,46);roof(tx,yy-44,52,18,hexA(ink,.95));g.fillStyle=E.acc;g.fillRect(tx+20,yy-80,2,40);g.fillRect(tx+22,yy-80,22,14);g.fillStyle=hexA(ink,.88)}},
        que(x,y){const c=hexA(ink,.92);for(const dx of[-34,34]){g.fillStyle=c;g.fillRect(x+dx-12,y-70,24,70);g.fillRect(x+dx-17,y-74,34,6);roof(x+dx,y-74,46,18,c);g.fillRect(x+dx-9,y-104,18,14);roof(x+dx,y-102,30,12,c)}g.fillStyle=E.acc;g.fillRect(x-3,y-40,6,6)},
        banners(x,y){for(let i=0;i<7;i++){const bx=x-90+i*30+rnd()*10,by=ridgeY(bx);g.fillStyle=hexA(ink,.9);g.fillRect(bx,by-80,2.5,80);g.fillStyle=i%2?E.acc:E.acc2;g.beginPath();g.moveTo(bx+2.5,by-80);g.lineTo(bx+30,by-74+Math.sin(i)*3);g.lineTo(bx+28,by-56);g.lineTo(bx+2.5,by-60);g.closePath();g.fill()}},
        fort(x,y){const c=hexA(ink,.9);g.fillStyle=c;g.fillRect(x-60,y-30,120,30);for(let i=0;i<12;i++)g.fillRect(x-60+i*10,y-36,6,6);g.fillRect(x-20,y-58,40,28);roof(x,y-56,60,18,c)},
        bamboo(x,y){for(let i=0;i<40;i++){const bx=x-120+rnd()*240,by=ridgeY(bx)+6,hh=60+rnd()*80;g.strokeStyle=hexA(E.acc,.55+rnd()*.4);g.lineWidth=2+rnd()*2;g.beginPath();g.moveTo(bx,by);g.lineTo(bx+(rnd()-.5)*10,by-hh);g.stroke();
          g.fillStyle=hexA(ink,.55);for(let j=0;j<4;j++){g.beginPath();g.ellipse(bx+(rnd()-.5)*20,by-hh*(.6+rnd()*.4),10,2.5,(rnd()-.5)*1.2,0,TAU);g.fill()}}},
        hut(x,y){const c=hexA(ink,.9);g.fillStyle=c;g.fillRect(x-24,y-24,48,24);g.beginPath();g.moveTo(x-38,y-20);g.lineTo(x,y-50);g.lineTo(x+38,y-20);g.closePath();g.fill();g.fillStyle=hexA(E.mist,.9);g.fillRect(x-6,y-16,12,16)},
        grotto(x,y){g.fillStyle=hexA("#8E6A48",.85);g.beginPath();g.moveTo(x-110,y+10);g.lineTo(x-100,y-110);g.lineTo(x+100,y-118);g.lineTo(x+112,y+10);g.closePath();g.fill();g.fillStyle=hexA(ink,.75);
          for(let r=0;r<3;r++)for(let i=0;i<5;i++){const nx=x-80+i*40,ny=y-20-r*34;g.beginPath();g.ellipse(nx,ny-10,12,15,0,PI,0);g.fillRect(nx-12,ny-10,24,12);g.fill()}
          g.beginPath();g.ellipse(x,y-50,22,40,0,PI,0);g.fill();g.fillStyle=hexA(E.acc2,.6);g.beginPath();g.arc(x,y-70,9,0,TAU);g.fill()},
        stupa(x,y){const c=hexA(ink,.9);g.fillStyle=c;g.fillRect(x-18,y-20,36,20);g.beginPath();g.arc(x,y-20,20,PI,0);g.fill();g.fillRect(x-2,y-70,4,30);for(let i=0;i<5;i++)g.fillRect(x-8+i,y-48-i*5,16-2*i,2)},
        canal(x,y){const yy=y+10;g.fillStyle=hexA(E.acc2,.35);g.fillRect(0,yy,W,14);g.fillStyle=hexA(ink,.85);
          for(let i=0;i<9;i++){const bx=rnd()*W;g.beginPath();g.moveTo(bx-26,yy+2);g.lineTo(bx+26,yy+2);g.lineTo(bx+18,yy+10);g.lineTo(bx-18,yy+10);g.closePath();g.fill();g.fillRect(bx-1,yy-34,2,36);g.fillStyle=hexA(E.mist,.9);g.beginPath();g.moveTo(bx+1,yy-32);g.lineTo(bx+18,yy-6);g.lineTo(bx+1,yy-6);g.fill();g.fillStyle=hexA(ink,.85)}},
        pagoda(x,y){const c=hexA(ink,.93);g.fillStyle=c;const n=7;g.fillRect(x-30,y-8,60,8);for(let i=0;i<n;i++){const w=54-i*5,yy=y-8-i*24;g.fillRect(x-w*.35,yy-20,w*.7,20);roof(x,yy-18,w*1.2,10,c)}g.fillRect(x-1.5,y-8-n*24-26,3,30);
          g.fillStyle=E.acc;for(let i=0;i<n;i++){g.fillRect(x-3,y-20-i*24,6,6)}},
        temple(x,y){// 五代：高聳主峰（荊浩、關仝式）＋山腰小廟
          const c=hexA(ink,.55);g.fillStyle=c;g.beginPath();g.moveTo(x-160,y+20);g.bezierCurveTo(x-80,y-80,x-40,y-330,x+10,y-360);g.bezierCurveTo(x+60,y-300,x+90,y-100,x+170,y+20);g.closePath();g.fill();
          g.strokeStyle=hexA(ink,.6);g.lineWidth=2;for(let i=0;i<26;i++){const yy=y-rnd()*300,xx=x+(rnd()-.5)*160*(1-(y-yy)/400);g.beginPath();g.moveTo(xx,yy);g.lineTo(xx+(rnd()-.5)*6,yy+20+rnd()*30);g.stroke()}
          const tx=x+40,ty=y-60,k=hexA(ink,.95);g.fillStyle=k;g.fillRect(tx-20,ty-18,40,18);roof(tx,ty-16,56,16,k);g.fillStyle=E.acc;g.fillRect(tx-4,ty-12,8,8)},
        bridge(x,y){const c=hexA(ink,.9);g.strokeStyle=c;g.lineWidth=7;g.beginPath();g.moveTo(x-110,y+6);g.quadraticCurveTo(x,y-70,x+110,y+6);g.stroke();g.lineWidth=3;g.beginPath();g.moveTo(x-104,y-6);g.quadraticCurveTo(x,y-82,x+104,y-6);g.stroke();
          for(let i=-4;i<=4;i++){const t=(i+5)/10,bx=x-104+208*t,by=y-6-152*t*(1-t);g.fillStyle=hexA(ink,.9);g.fillRect(bx-1,by-10,2,10)}g.lineWidth=2;g.beginPath();g.ellipse(x,y+8,70,34,0,PI,0);g.stroke();
          g.fillStyle=hexA(E.acc2,.75);g.beginPath();g.arc(x+20,y-46,4,0,TAU);g.fill()},
        willowP(x,y){g.strokeStyle=hexA(ink,.85);g.lineWidth=5;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x-10,y-50,x+6,y-100);g.stroke();g.strokeStyle=hexA(E.acc,.7);g.lineWidth=1.5;
          for(let i=0;i<34;i++){const ox=x+6+(rnd()-.5)*90,oy=y-100+(rnd()-.5)*24;g.beginPath();g.moveTo(ox,oy);g.quadraticCurveTo(ox+(rnd()-.5)*20,oy+40,ox+(rnd()-.5)*12,oy+60+rnd()*40);g.stroke()}},
        yurts(x,y){for(let i=0;i<5;i++){const bx=x-120+i*60+rnd()*14,by=ridgeY(bx)+10,r=16+rnd()*6;g.fillStyle=hexA("#F4F1EA",.95);g.beginPath();g.moveTo(bx-r,by);g.lineTo(bx-r,by-r*.7);g.quadraticCurveTo(bx,by-r*1.7,bx+r,by-r*.7);g.lineTo(bx+r,by);g.closePath();g.fill();
          g.strokeStyle=hexA(E.acc,.9);g.lineWidth=3;g.beginPath();g.moveTo(bx-r,by-r*.5);g.lineTo(bx+r,by-r*.5);g.stroke();g.fillStyle=hexA(ink,.8);g.fillRect(bx-4,by-10,8,10);g.strokeStyle=hexA(ink,.25);g.lineWidth=4;g.beginPath();g.moveTo(bx,by-r*1.4);g.bezierCurveTo(bx+10,by-r*2.4,bx-10,by-r*3,bx+6,by-r*4);g.stroke()}},
        palace(x,y){const k=hexA(ink,.9);g.fillStyle=hexA("#9E2A1E",.9);g.fillRect(x-130,y-26,260,26);g.fillStyle=k;g.fillRect(x-136,y-30,272,5);roof(x-80,y-28,90,20,hexA("#C9952C",.95));roof(x+80,y-28,90,20,hexA("#C9952C",.95));
          g.fillStyle=hexA("#9E2A1E",.95);g.fillRect(x-46,y-70,92,44);roof(x,y-68,150,34,hexA("#D9A62E",.98));roof(x,y-96,96,20,hexA("#D9A62E",.98));g.fillStyle=k;g.fillRect(x-30,y-50,60,4)},
        moongate(x,y){const k=hexA("#ECE3D2",.95);g.fillStyle=k;g.fillRect(x-120,y-60,240,60);g.fillStyle=hexA(ink,.9);g.fillRect(x-124,y-66,248,8);g.fillStyle=hexA(E.mist,1);g.beginPath();g.arc(x,y-28,26,0,TAU);g.fill();
          g.strokeStyle=hexA(ink,.6);g.lineWidth=3;g.beginPath();g.arc(x,y-28,26,0,TAU);g.stroke();g.fillStyle=hexA(E.acc,.85);for(const dx of[-70,70]){g.beginPath();g.ellipse(x+dx,y-36,6,8,0,0,TAU);g.fill()}}};
      L.forEach((t,i)=>{const x=spots[i%2?1:0]+(i>1?(i%2?120:-120):0),y=ridgeY(x)+6;D[t]&&D[t](x,y)});
      // 另一側與遠處也放一份第一個地標，轉頭時看得到
      if(L.length===1){const t=L[0];if(t!=="wall"&&t!=="yurts")D[t](spots[1],ridgeY(spots[1])+6)}
      D[L[0]]&&L[0]!=="wall"&&L[0]!=="canal"&&D[L[0]](spots[2],ridgeY(spots[2])+6);D.pine(spots[3],ridgeY(spots[3])+6);
      // 底部雲海
      gr=g.createLinearGradient(0,PY(-135),0,H);gr.addColorStop(0,hexA(E.mist,0));gr.addColorStop(.5,hexA(E.mist,.9));gr.addColorStop(1,E.mist);g.fillStyle=gr;g.fillRect(0,PY(-135),W,H-PY(-135));
      // 宣紙紋
      noise(g,W,H,9000,"120,100,70",.05)})}

  function create(host,opt){opt=opt||{};
    const el=document.createElement("div");el.className="park3d";el.style.cssText="position:relative;width:100%;border-radius:14px;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;background:#A9CBE8";
    host.append(el);
    let rd;try{rd=new T.WebGLRenderer({antialias:true,powerPreference:"high-performance"})}catch(e){el.remove();return null}
    rd.setPixelRatio(Math.min(2,window.devicePixelRatio||1));rd.shadowMap.enabled=true;rd.shadowMap.type=T.PCFSoftShadowMap;
    // 正確的色彩管理：顏色碼當螢幕色（跟 car3d 一樣）、輸出 sRGB；之前整個場景在 gamma 空間打光＋ACES，顏色被洗白
    if(T.ColorManagement)T.ColorManagement.legacyMode=false;if(T.sRGBEncoding!=null)rd.outputEncoding=T.sRGBEncoding;if(T.SRGBColorSpace)rd.outputColorSpace=T.SRGBColorSpace;
    rd.toneMapping=T.ACESFilmicToneMapping;rd.toneMappingExposure=.98;try{ANI=rd.capabilities.getMaxAnisotropy()||8}catch(e){}
    rd.domElement.style.cssText="display:block;width:100%;height:100%";el.append(rd.domElement);
    const hint=document.createElement("div");hint.style.cssText="position:absolute;left:50%;bottom:8px;transform:translateX(-50%);font:600 11px sans-serif;color:#fff;background:rgba(30,20,10,.45);padding:3px 10px;border-radius:99px;white-space:nowrap;pointer-events:none;transition:opacity .6s";
    hint.textContent="點棋子走棋・拖曳轉頭看看四周・點兩下回正";el.append(hint);setTimeout(()=>hint.style.opacity=0,4500);
    const EK=eraKey(),E=ERA[EK];
    el.style.background=E.mist;
    const sc=new T.Scene();sc.fog=new T.Fog(new T.Color(E.mist),70,320);
    const cam=new T.PerspectiveCamera(50,1,.5,700);
    // 光：午後斜陽（唯一投影光，陰影範圍只包住石桌，陰影比較銳利）＋暖色天光＋冷色補光；整體對比拉高，不再灰白
    sc.add(new T.HemisphereLight(0xFFF1DA,0x5A4A36,.42));
    const sun=new T.DirectionalLight(0xFFD9A8,1.15);sun.position.set(-18,34,14);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:10,far:80});sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;sun.shadow.radius=3;sc.add(sun);
    const fill=new T.DirectionalLight(0xC8DCFF,.28);fill.position.set(20,12,-18);sc.add(fill);
    // 天空球（含下半部的雲海色）＋水墨長卷
    const sky=new T.Mesh(new T.SphereGeometry(400,32,16),new T.MeshBasicMaterial({map:skyTex(E),side:T.BackSide,fog:false,depthWrite:false,toneMapped:false}));sc.add(sky);
    {const pt=panTex(Object.assign({},E,{userBg:!!BG_IMG[EK]}),EK.length*977+13);pt.wrapS=T.RepeatWrapping;pt.repeat.x=-1;   // 從圓柱內側看，貼圖要左右翻回來
      const pan=new T.Mesh(new T.CylinderGeometry(PAN.r,PAN.r,PAN.yt-PAN.yb,64,1,true,PI-PAN.arc/2,PAN.arc),new T.MeshBasicMaterial({map:pt,side:T.BackSide,transparent:true,fog:false,depthWrite:false,toneMapped:false}));
      pan.position.y=(PAN.yt+PAN.yb)/2;pan.renderOrder=-1;sc.add(pan);
      const BI=BG_IMG[EK];if(BI){const put=()=>{const im=imgCache[BI.src];if(!im||!im.naturalWidth||!el.isConnected)return;try{drawUserPan(pt.image.getContext("2d"),pt.image.width,pt.image.height,im,BI);pt.needsUpdate=true}catch(e){}};
        if(loadImg(BI.src,put))setTimeout(put,0)}}
    const M=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));
    const mesh=(geo,mat,pos,o)=>{const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);m.castShadow=!(o&&o.noCast);m.receiveShadow=true;sc.add(m);return m};
    const GY=-19;   // 地面高度（桌面＝0）
    // 山上平台：石板地＋石欄杆，平台外是山谷雲海
    const TR=21;
    const stone=M(0xffffff,{map:stoneTex("#8C8478",2),roughness:.85}),stone2=M(0xffffff,{map:stoneTex("#776F64",2),roughness:.9});
    const pave=new T.Mesh(new T.CircleGeometry(TR,64),M(0xffffff,{map:paveTex(),roughness:.95}));pave.rotation.x=-PI/2;pave.position.y=GY;pave.receiveShadow=true;sc.add(pave);
    mesh(new T.CylinderGeometry(TR,TR*.9,26,48,1,true),stone2,[0,GY-13,0],{noCast:1});
    {const rail=new T.Mesh(new T.TorusGeometry(TR-.4,.35,6,96),stone);rail.rotation.x=PI/2;rail.position.y=GY+3.4;sc.add(rail);
      const lowW=new T.Mesh(new T.CylinderGeometry(TR-.2,TR-.2,1.2,64,1,true),stone2);lowW.material.side=T.DoubleSide;lowW.position.y=GY+.6;sc.add(lowW);
      const pg=new T.BoxGeometry(.8,3.6,.8);for(let i=0;i<36;i++){const a=i/36*TAU;const p=new T.Mesh(pg,stone);p.position.set(Math.sin(a)*(TR-.4),GY+1.8,Math.cos(a)*(TR-.4));p.rotation.y=a;sc.add(p)}}
    // 石桌（圓桌面＋鼓形桌腳）
    mesh(new T.CylinderGeometry(8.2,8.0,.9,72),stone,[0,-.45,0]);
    mesh(new T.TorusGeometry(8.1,.18,10,96),stone,[0,-.04,0]).rotation.x=PI/2;
    mesh(new T.CylinderGeometry(2.3,3.2,18,40),stone2,[0,GY+9-.9,0]);mesh(new T.CylinderGeometry(4.2,4.6,1.2,40),stone2,[0,GY+.6,0]);
    // 木棋盤嵌在桌上：深色實木框，和灰色石桌對比清楚
    const wood=M(0x5C3418,{roughness:.55});mesh(new T.BoxGeometry(BW+.5,.6,BH+.5),wood,[0,.24,0]);mesh(new T.BoxGeometry(BW+.62,.08,BH+.62),wood,[0,-.0,0]);   // 厚木棋盤＋底座線腳（意見回饋 215）
    const btex=boardTex(()=>{try{btex.image.getContext("2d").clearRect(0,0,1,1);drawBoard(btex.image.getContext("2d"),btex.image.width,btex.image.height,null);btex.needsUpdate=true}catch(e){}});const bplane=new T.Mesh(new T.PlaneGeometry(BW,BH),new T.MeshStandardMaterial({map:btex,roughness:.6}));bplane.rotation.x=-PI/2;bplane.position.y=TOP-.02+.03;bplane.receiveShadow=true;sc.add(bplane);
    // 石凳（左右各一個空的）
    const stool=(x,z)=>{mesh(new T.CylinderGeometry(2.4,2.2,1.4,36),stone,[x,GY+13.3,z]);mesh(new T.CylinderGeometry(1.5,2.3,12.6,36),stone2,[x,GY+6.3,z])};
    stool(-14.5,1.5);stool(14.5,-1.5);
    // 長椅（對手坐的）：縮短一點，讓兩側上角看得到山水
    const plank=M(0x8E5326,{roughness:.7}),iron=M(0x2A2620,{roughness:.45,metalness:.6});const BZ=-12.6,SY=-3.9,BL=13;
    for(let i=0;i<4;i++)mesh(new T.BoxGeometry(BL,.45,1.1),plank,[0,SY,BZ+1.8-i*1.2]);
    for(let i=0;i<3;i++){const b=mesh(new T.BoxGeometry(BL,.45,1.0),plank,[0,SY+3.6+i*1.4,BZ-2.6-i*.25]);b.rotation.x=-.18}
    for(const x of[-BL/2+1,BL/2-1]){mesh(new T.BoxGeometry(.6,SY-GY,.6),iron,[x,(SY+GY)/2,BZ+1.8]);mesh(new T.BoxGeometry(.6,SY-GY+5.2,.6),iron,[x,(SY+GY+5.2)/2,BZ-2.6]);mesh(new T.BoxGeometry(.5,.5,5),iron,[x,SY-.4,BZ-.4]);
      const arm=mesh(new T.BoxGeometry(.5,.5,4.4),iron,[x,SY+3.2,BZ]);arm.rotation.x=.05}
    // 茶杯：Pikafish（對面）一杯、我一杯（意見回饋 215）
    const teaCup=(x,z)=>{const cup=new T.Group();cup.position.set(x,0,z);sc.add(cup);const por=M(0xF4F1EA,{roughness:.25}),blue=M(0x2D5DA8,{roughness:.3});const a=new T.Mesh(new T.CylinderGeometry(.75,.75,.08,32),por);a.position.y=.04;cup.add(a);
      const b=new T.Mesh(new T.CylinderGeometry(.5,.36,.7,32,1,true),por);b.position.y=.43;b.material.side=T.DoubleSide;cup.add(b);const band=new T.Mesh(new T.CylinderGeometry(.505,.47,.12,32,1,true),blue);band.position.y=.6;cup.add(band);
      const tea=new T.Mesh(new T.CircleGeometry(.47,32),M(0x9C6B1E,{roughness:.1}));tea.rotation.x=-PI/2;tea.position.y=.66;cup.add(tea);cup.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}});return cup};
    teaCup(0,-6.85);teaCup(.4,7.0);   // 意見回饋 219：Pikafish 的茶在它面前正中間、我的茶在我面前正中間
    // 平台上的樹（依朝代：松、柳、竹），水墨感的深色樹冠；放在兩側，轉頭時當前景框
    const bark=M(0x4A3626,{roughness:.95}),leafM=M(new T.Color(E.ink).lerp(new T.Color(0x2F4A2A),.7).getHex(),{roughness:.95}),leafG=M(new T.Color(0x6E8A3E).getHex(),{roughness:.95});
    const tree=(x,z,s)=>{const g=new T.Group();g.position.set(x,GY,z);g.scale.setScalar(s);sc.add(g);
      if(E.tree==="bamboo"){for(let i=0;i<9;i++){const c=new T.Mesh(new T.CylinderGeometry(.18,.22,26+Math.random()*8,6),M(0x6E8B57,{roughness:.7}));c.position.set((Math.random()-.5)*5,13,(Math.random()-.5)*5);c.rotation.z=(Math.random()-.5)*.12;g.add(c);
        const lf=new T.Mesh(new T.IcosahedronGeometry(2.4,0),leafG);lf.scale.set(1,.5,1);lf.position.set(c.position.x,24+Math.random()*6,c.position.z);g.add(lf)}return}
      const tr=new T.Mesh(new T.CylinderGeometry(.6,1.1,16,8),bark);tr.position.y=8;tr.rotation.z=.08;g.add(tr);
      if(E.tree==="willow"){const wm=M(0x6F8E40,{roughness:.9}),cg=new T.SphereGeometry(1,10,6),sg=new T.CylinderGeometry(.07,.04,1,4);
        for(const[x,y,z,r]of[[0,17,0,4.2],[2.6,16,1.4,3],[-2.6,16.2,-1,3.2],[.6,19,-.6,2.8]]){const c=new T.Mesh(cg,wm);c.scale.set(r,r*.55,r);c.position.set(x,y,z);g.add(c)}
        for(let i=0;i<46;i++){const a=Math.random()*TAU,d=2+Math.random()*3.4,l=4+Math.random()*6,st=new T.Mesh(sg,wm);st.scale.y=l;st.position.set(Math.sin(a)*d,16-l/2,Math.cos(a)*d);st.rotation.z=(Math.random()-.5)*.12;g.add(st)}return}
      // 松：枝幹往兩側伸，末端是扁平的深色松針團（國畫松樹的樣子）
      const pad=new T.SphereGeometry(1,10,6);
      for(const[y,a,l]of[[10,.3,6],[12.5,2.6,5.5],[14.5,4.4,5],[16.5,1.2,4.2],[18,3.6,3.4],[19.5,5.4,2.6]]){const br=new T.Mesh(new T.CylinderGeometry(.18,.32,l,5),bark);br.position.set(Math.cos(a)*l/2,y,Math.sin(a)*l/2);br.rotation.set(0,-a,PI/2-.35);g.add(br);
        for(let j=0;j<3;j++){const c=new T.Mesh(pad,leafM);c.scale.set(2.2-j*.4,.55,1.8-j*.3);c.position.set(Math.cos(a)*(l-.6+j*.4)+(Math.random()-.5),y+1.2+j*.45,Math.sin(a)*(l-.6+j*.4)+(Math.random()-.5));g.add(c)}}
      const cr=new T.Mesh(pad,leafM);cr.scale.set(2.4,.7,2.2);cr.position.y=21.2;g.add(cr)};
    tree(-18,-8,.95);tree(18.5,-5,.9);tree(-13,-16.5,.8);
    // 欄杆上的燈籠（朝代色）
    const lanterns=[];{const lm=M(new T.Color(E.acc).getHex(),{emissive:new T.Color(E.acc).getHex(),emissiveIntensity:.45,roughness:.5}),gm=M(0xE3B341,{metalness:.6,roughness:.35});
      for(const x of[-9.5,9.5]){const g=new T.Group();g.position.set(x,GY,-17.5);sc.add(g);const p=new T.Mesh(new T.CylinderGeometry(.25,.3,15,8),iron);p.position.y=7.5;g.add(p);
        const arm=new T.Mesh(new T.BoxGeometry(2.4,.22,.22),iron);arm.position.set(x<0?1:-1,14.6,0);g.add(arm);
        const l=new T.Group();l.position.set(x<0?1.9:-1.9,13.2,0);g.add(l);const b=new T.Mesh(new T.SphereGeometry(.85,14,10),lm);b.scale.y=1.2;l.add(b);
        for(const y of[-1.05,1.05]){const c=new T.Mesh(new T.CylinderGeometry(.45,.45,.2,12),gm);c.position.y=y;l.add(c)}lanterns.push(l)}}
    // 落葉（朝代色系的花瓣／葉子），在畫面外圍飄
    const falling=[];{const lg=new T.PlaneGeometry(.5,.34),cols=[E.acc2,0xD9A548,0xC98A3A];for(let i=0;i<8;i++){const l=new T.Mesh(lg,new T.MeshStandardMaterial({color:new T.Color(cols[i%3]),side:T.DoubleSide,roughness:1}));
      l.userData={x:(Math.random()-.5)*40,z:-12-Math.random()*20,y:Math.random()*30,s:.6+Math.random()*.8,ph:Math.random()*TAU};sc.add(l);falling.push(l)}}

    // ---------- 角色：對面長椅坐對手（電腦＝瘦版 Pikafish；真人＝對方自己的小帥），我這邊桌角坐我的小帥 ----------
    // 意見回饋 212：小帥是玩家的夥伴，坐在玩家這一邊；對面是對手的位置
    const mkBub=(x,y,z,w)=>{const b=new T.Sprite(new T.SpriteMaterial({transparent:true,depthTest:false}));b.scale.set(w,w*.31,1);b.position.set(x,y,z);b.visible=false;b.renderOrder=10;sc.add(b);return b};
    const actor=(g,bub)=>({g,bub,B:null,face:"smile",faceT:0,bubT:0,blinkT:2+Math.random()*2,
      setFace(f,d){this.face=f;this.faceT=d||0},say(t,d){const m=this.bub.material;m.map&&m.map.dispose();m.map=bubbleTex(t);m.needsUpdate=true;this.bub.visible=true;this.bubT=d||2.2}});
    const seat=B=>{B.legs.forEach(l=>{l.rotation.x=-1.35});B.bot.position.y=-.35};
    const opp=actor(new T.Group(),mkBub(4.4,3.2,-9.2,6.2));opp.g.position.set(0,SY-.9,BZ+1.0);opp.g.scale.setScalar(4.1);sc.add(opp.g);
    // 意見回饋 218：小帥坐在我這一側、棋盤左前角外的桌面上，面向我、身體往後仰一點（鏡頭在上方，這樣看得到臉）；
    // 之前 sc.add 被寫進註解裡，小帥根本沒出現。位置在棋盤框外，不會擋到棋子
    const mate=actor(new T.Group(),mkBub(-.8,2.3,6.9,3.4));mate.g.position.set(-3.6,0,7.05);mate.g.rotation.set(-.6,.25,0,"YXZ");mate.g.scale.setScalar(1.1);sc.add(mate.g);
    let oppKey="",watchKey="",watchers=[];const watchG=new T.Group();sc.add(watchG);
    const SPOTS=[-31,31,-47,47,-66,66,-90,90].map(d=>d*PI/180),plinthM=M(0x8F8A80,{roughness:.9});
    const setWatchers=list=>{list=(list||[]).slice(0,8);const k=JSON.stringify(list);if(k===watchKey)return;watchKey=k;watchG.clear();watchers=[];
      list.forEach((w,i)=>{const a=SPOTS[i],r=19,x=Math.sin(a)*r,z=-Math.cos(a)*r,FY=-6.2;
        const pl=new T.Mesh(new T.CylinderGeometry(2.4,2.8,FY-GY,20),plinthM);pl.position.set(x,(FY+GY)/2,z);pl.receiveShadow=true;watchG.add(pl);
        const g=new T.Group();g.position.set(x,FY,z);g.rotation.y=Math.atan2(-x,-z);g.scale.setScalar(3.1);watchG.add(g);
        try{const B=XQBot3D.figure((w&&w.bot)||{});g.add(B.bot);B.bot.traverse(o=>{if(o.isMesh)o.castShadow=true});watchers.push({B,ph:Math.random()*TAU,blinkT:1+Math.random()*3,chin:i%3===1})}catch(e){}})};
    const buildActor=(A,look)=>{A.g.clear();A.B=null;try{if(window.XQBot3D&&XQBot3D.figure){A.B=XQBot3D.figure(look||{});A.g.add(A.B.bot);A.B.bot.traverse(o=>{if(o.isMesh)o.castShadow=true});seat(A.B)}}catch(e){A.B=null}};
    const setOpp=look=>{const k=JSON.stringify(look||null);if(k===oppKey)return;oppKey=k;if(!look){opp.g.clear();opp.B=null;return}buildActor(opp,look)};
    buildActor(mate,{});try{mate.g.updateMatrixWorld(true);const b=new T.Box3().setFromObject(mate.g);mate.g.position.y-=b.min.y-.02}catch(e){}   // 坐在桌面上（桌面 y=0）
    const say=(t,d)=>mate.say(t,d);
    let reach=0,reachT=0,thinking=false,mood=null,glanceT=3,glance=0,mySide="r",oppName="";
    // ---------- 棋子 ----------
    const pieceGeo=(()=>{const pts=[];const R=.46,H=.27,r=.06;pts.push(new T.Vector2(0,0));pts.push(new T.Vector2(R-r,0));for(let i=0;i<=6;i++){const a=-PI/2+i/6*PI/2;pts.push(new T.Vector2(R-r+Math.cos(a)*r,r+Math.sin(a)*r))}
      for(let i=0;i<=6;i++){const a=i/6*PI/2;pts.push(new T.Vector2(R-r+Math.cos(a)*r,H-r+Math.sin(a)*r))}pts.push(new T.Vector2(0,H));return new T.LatheGeometry(pts,72)})();
    // 棋子（意見回饋 218）：不再用自發光（會把顏色洗白）；改成不經過 ACES 色調映射，並用「光色的倒數」把桌面上的暖光抵銷，
    // 陽光照到的字面＝底圖原本的顏色（飽和、字黑），陰影裡照樣變暗，看起來還是真的在光裡
    const NEUT=(()=>{const up=new T.Vector3(0,1,0),L=new T.Color(0,0,0);
      sc.traverse(o=>{if(o.isHemisphereLight)L.add(o.color.clone().multiplyScalar(o.intensity));else if(o.isDirectionalLight){const d=o.position.clone().normalize().dot(up);if(d>0)L.add(o.color.clone().multiplyScalar(o.intensity*d))}});
      const tg=[.97,.95,.92];return new T.Color(tg[0]/Math.max(.2,L.r),tg[1]/Math.max(.2,L.g),tg[2]/Math.max(.2,L.b))})();
    // 鏡面反光調弱：對面那排棋子是斜斜地看，補光的大片反光會把字面刷成灰色（遠處的黑子看起來髒），只留一點點漆光
    const pMat=o=>{try{return new T.MeshPhysicalMaterial(Object.assign({metalness:0,specularIntensity:.22,toneMapped:false},o))}catch(e){return new T.MeshStandardMaterial(Object.assign({metalness:0,toneMapped:false},o))}};
    const faceGeo=new T.CircleGeometry(.41,64),faceMat={},bodyMat={};
    const bMat=red=>{const s=red?"r":"b";if(bodyMat[s])return bodyMat[s];const L=LOOK,im=L&&L.pieces?loadImg(L.pieces[s]):null;
      const c=new T.Color(im?rimOf(im):"#E9D2A2").multiply(NEUT);return bodyMat[s]=pMat({color:c,roughness:.42})};
    const fMat=(ch,red)=>faceMat[ch+red]||(faceMat[ch+red]=(()=>{const tx=faceTex(ch,red);return pMat({map:tx,color:NEUT,roughness:.5})})());
    const makePiece=p=>{const s=sideOf(p),ch=NAMES[s][p.toUpperCase()],g=new T.Group();const body=new T.Mesh(pieceGeo,bMat(s==="r"));body.castShadow=true;body.receiveShadow=true;g.add(body);
      const f=new T.Mesh(faceGeo,fMat(ch,s==="r"));f.rotation.x=-PI/2;f.position.y=.272;g.add(f);g.userData={p};sc.add(g);return g};
    let flip=false;const pos=i=>{const c=i%9,r=i/9|0;return flip?[4-c,4.5-r]:[c-4,r-4.5]};
    const at=(g,i,lift)=>{const[x,z]=pos(i);g.position.set(x,TOP+(lift||0),z)};
    let pieces={},prevB=null,prevLast=null,anims=[],captured=[];
    // 提示記號
    const markG=new T.Group();sc.add(markG);
    const disc=(i,col,r,op)=>{const m=new T.Mesh(new T.CircleGeometry(r,32),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));m.rotation.x=-PI/2;const[x,z]=pos(i);m.position.set(x,TOP+.012,z);markG.add(m);return m};
    const ring=(i,col,r,w,op)=>{const m=new T.Mesh(new T.RingGeometry(r-w,r,40),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));m.rotation.x=-PI/2;const[x,z]=pos(i);m.position.set(x,TOP+.014,z);markG.add(m);return m};
    let selI=-1,checkRing=null;
    function layoutCaptured(board){captured.forEach(g=>sc.remove(g));captured=[];const cnt={r:{},b:{}};board.forEach(p=>{if(p){const s=sideOf(p),k=p.toUpperCase();cnt[s][k]=(cnt[s][k]||0)+1}});
      for(const s of["r","b"]){const lost=[];for(const k of"RCNBAP")for(let n=(START[s][k]||0)-(cnt[s][k]||0);n>0;n--)lost.push(s==="r"?k:k.toLowerCase());
        const mine=(s==="r")!==flip;   // 我這邊（靠近鏡頭）輸掉的棋子排在我右手邊；對方的排在對面
        // 鏡頭變俯視後，靠近我的桌邊看不到了：我輸掉的棋子直排在棋盤右側，對方輸掉的排在棋盤後方（縮小一點，不搶棋盤的戲）
        lost.forEach((p,j)=>{const g=makePiece(p);g.scale.setScalar(.8);let x,z;
          if(mine){if(j<10){x=6.2;z=-4.6+j*.8}else{x=7.0;z=-3.6+(j-10)*.8}}else{const sd=j%2?-1:1,k=j>>1;if(k<4){x=sd*(1.35+k*.95);z=-6.55}else{x=sd*(1.35+(k-4)*.95);z=-7.35}}   // 對方輸掉的棋子分排在茶杯左右兩邊
          g.position.set(x,0,z);g.rotation.y=(Math.random()-.5)*.6;captured.push(g)})}}
    function sync(board){Object.values(pieces).forEach(g=>sc.remove(g));pieces={};board.forEach((p,i)=>{if(p){const g=makePiece(p);at(g,i);pieces[i]=g}});layoutCaptured(board)}
    // 朝代造型換了（或圖剛載入）：重畫棋盤、清掉棋子貼圖、整盤重排
    let lookKey="";const refreshLook=()=>{for(const k in faceCache){try{faceCache[k].dispose()}catch(e){}delete faceCache[k]}for(const k in faceMat){try{faceMat[k].dispose()}catch(e){}delete faceMat[k]}for(const k in bodyMat){try{bodyMat[k].dispose()}catch(e){}delete bodyMat[k]}
      try{const c=btex.image.getContext("2d");drawBoard(c,btex.image.width,btex.image.height,null);btex.needsUpdate=true}catch(e){}if(prevB)sync(prevB)};
    // Noto Serif TC 網路字型晚到：載入後重畫字面（不然會先用系統字型，字又細又糊）
    try{document.fonts&&document.fonts.load(`900 64px ${SERIF}`,"帥仕相傌俥炮兵將士象馬車砲卒").then(()=>{if(!stopped)refreshLook()})}catch(e){}
    function draw(board,o,ex){o=o||{};ex=ex||{};const nf=!!o.flip;
      {const lk=JSON.stringify(ex.look?[ex.look.k,ex.look.img,!!ex.look.gly]:null);if(lk!==lookKey){lookKey=lk;LOOK=ex.look||null;
        if(LOOK){let n=0;const done=()=>{if(++n>=3&&LOOK===ex.look)refreshLook()};[LOOK.img,LOOK.pieces&&LOOK.pieces.r,LOOK.pieces&&LOOK.pieces.b].forEach(src=>{if(!src||loadImg(src,done))done()})}
        refreshLook()}}
      if(nf!==flip){flip=nf;prevB=null}
      const L=o.last&&o.last.f!=null&&o.last.t!=null?o.last:null,lk=L?L.f+"-"+L.t:"";
      const moved=prevB&&L&&lk!==prevLast&&board[L.t]&&board[L.t]===prevB[L.f]&&!board[L.f]&&pieces[L.f]&&board.filter(Boolean).length>=prevB.filter(Boolean).length-1;
      if(moved){const g=pieces[L.f],cap=pieces[L.t];delete pieces[L.f];pieces[L.t]=g;const[x0,z0]=pos(L.f),[x1,z1]=pos(L.t);
        const by=sideOf(board[L.t]),botSide=ex.botSide||null;
        if(cap){anims.push({t:0,d:.55,f:p=>{cap.position.y=TOP+Math.sin(p*PI)*.9;cap.position.x+=(x1-x0)*.006;cap.position.z+=(z1>z0?.02:-.02);cap.rotation.z=p*2.2},end:()=>{sc.remove(cap);layoutCaptured(board)}})}
        anims.push({t:0,d:.42,f:p=>{const e=ease(p);g.position.set(x0+(x1-x0)*e,TOP+Math.sin(p*PI)*1.1,z0+(z1-z0)*e)},end:()=>at(g,L.t)});
        if(botSide&&by===botSide){reach=1;reachT=0;opp.setFace(cap?"happy":"smile",1.4);if(cap){mate.setFace("open",1.6);mate.say(["小心！","哎呀，被吃了","沒關係，扳回來！"][Math.random()*3|0],2)}}
        else if(cap){mate.setFace("happy",1.6);mate.say(["吃得好！","漂亮！","好棋！"][Math.random()*3|0],1.8);if(botSide){opp.setFace("open",1.4);if(opp.B&&Math.random()<.5)opp.say(["哎呀！","被吃了…","好棋！"][Math.random()*3|0])}}
        // 棋盤其他地方若對不上（例如悔棋），整盤重排
        const exp=prevB.slice();exp[L.t]=exp[L.f];exp[L.f]=null;if(exp.join(",")!==board.join(","))sync(board)}
      else if(!prevB||board.join(",")!==prevB.join(","))sync(board);
      prevB=board.slice();prevLast=lk;
      // 提示：上一步、選子、可走點、將軍
      markG.clear();checkRing=null;
      if(L&&L.f!==L.t){ring(L.f,0x2E86DE,.36,.06,.85);disc(L.f,0x2E86DE,.12,.5);ring(L.t,0x2E86DE,.52,.06,.9)}
      selI=o.sel!=null&&o.sel>=0?o.sel:-1;
      (o.targets||[]).forEach(i=>{if(board[i])ring(i,0xD7263D,.52,.08,.95);else disc(i,0x2F9E5A,.19,.9)});
      if(typeof o.check==="number"&&o.check>=0&&board[o.check])checkRing=ring(o.check,0xFF2A2A,.62,.12,.9);
      if(ex.hint&&ex.hint.length===2){ring(ex.hint[0],0xF2B233,.5,.07,.9);ring(ex.hint[1],0xF2B233,.5,.07,.9)}
      thinking=!!ex.thinking;setOpp(ex.opp||null);setWatchers(ex.watchers);mySide=ex.botSide?(ex.botSide==="r"?"b":"r"):"r";
      if(ex.result&&ex.result!==mood){mood=ex.result;const b=ex.botSide;
        if(mood==="draw"){opp.setFace("flat",99);mate.setFace("flat",99);mate.say("和棋，不錯喔！",3)}
        else if(b&&mood===b){opp.setFace("happy",99);opp.say(ex.oppWin||"我贏了！再來一盤？",3);mate.setFace("sad",99);setTimeout(()=>mate.say("下次一定贏！",2.6),1800)}
        else if(b){opp.setFace("sad",99);opp.say(ex.oppLose||"你好厲害…",3);mate.setFace("happy",99);setTimeout(()=>mate.say("你贏了！太強了！",2.6),1500)}}
      if(!ex.result&&mood){mood=null;opp.setFace("smile");mate.setFace("smile")}}
    // ---------- 鏡頭與互動 ----------
    let yaw=0,pitch=0,tyaw=0,tpitch=0,W=1,H=1;
    // 鏡頭（iPhone 可讀性）：坐在桌前、比較俯視的角度，讓棋盤幾乎撐滿整個寬度；上方留一段看到對面的對手
    const VH0=window.innerHeight||800;   // 只在建立時量一次螢幕高度（iPhone 捲動時網址列伸縮不會讓畫面跳）
    const CAMV={hr:1.14,ht:.40,dp:0};   // 畫面高寬比、水平視角的 tan(半角)（固定水平視野，窄螢幕不會切掉棋盤兩邊）
    // 意見回饋 218：螢幕夠高時畫面拉高一點（最多 1.32），多出來的都給下方（上緣維持原本的位置），露出棋盤前方的桌面讓小帥坐
    const fit=()=>{W=el.clientWidth||300;CAMV.hr=clamp((VH0-300)/W,1.14,1.32);CAMV.dp=Math.atan(CAMV.ht*1.14)-Math.atan(CAMV.ht*CAMV.hr);H=Math.round(W*CAMV.hr);el.style.height=H+"px";rd.setSize(W,H,false);cam.aspect=W/H;
      cam.fov=clamp(2*Math.atan(CAMV.ht/cam.aspect)*180/PI,38,62);cam.updateProjectionMatrix()};
    const camBase=new T.Vector3(0,16,9.2),look=new T.Vector3(0,-.3,-2.6);
    const placeCam=()=>{cam.position.copy(camBase);const d=look.clone().sub(camBase),r=d.length(),a0=Math.atan2(d.x,-d.z)+yaw,p0=Math.asin(d.y/r)+pitch+CAMV.dp;
      cam.lookAt(camBase.x+Math.sin(a0)*Math.cos(p0)*r,camBase.y+Math.sin(p0)*r,camBase.z-Math.cos(a0)*Math.cos(p0)*r)};
    const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-TOP),hitP=new T.Vector3();
    const pick=(cx,cy)=>{const r=rd.domElement.getBoundingClientRect();ndc.set((cx-r.left)/r.width*2-1,-((cy-r.top)/r.height)*2+1);ray.setFromCamera(ndc,cam);
      // 先看有沒有點到棋子（棋子比較高，從斜上方點比較準）
      const hits=ray.intersectObjects(Object.values(pieces),true);if(hits.length){let o=hits[0].object;while(o.parent&&!o.userData.p)o=o.parent;const i=+Object.keys(pieces).find(k=>pieces[k]===o);if(i>=0)return i}
      if(!ray.ray.intersectPlane(plane,hitP))return -1;let c=Math.round(hitP.x+4),r2=Math.round(hitP.z+4.5);if(Math.abs(hitP.x+4-c)>.48||Math.abs(hitP.z+4.5-r2)>.48)return -1;
      if(c<0||c>8||r2<0||r2>9)return -1;if(flip){c=8-c;r2=9-r2}return r2*9+c};
    let down=null,lastTap=0;
    rd.domElement.addEventListener("pointerdown",e=>{down={x:e.clientX,y:e.clientY,t:performance.now(),y0:tyaw,p0:tpitch,moved:false};try{rd.domElement.setPointerCapture(e.pointerId)}catch(_){}});
    rd.domElement.addEventListener("pointermove",e=>{if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>9)down.moved=true;
      if(down.moved){tyaw=clamp(down.y0-dx/W*1.6,-1.2,1.2);tpitch=clamp(down.p0-dy/H*1.0,-.35,.45)}});
    const up=e=>{if(!down)return;const d=down;down=null;if(d.moved)return;const now=performance.now();
      if(now-lastTap<320&&(tyaw||tpitch)){tyaw=0;tpitch=0;lastTap=0;return}lastTap=now;const i=pick(e.clientX,e.clientY);if(i>=0&&opt.onTap)opt.onTap(i)};
    rd.domElement.addEventListener("pointerup",up);rd.domElement.addEventListener("pointercancel",()=>{down=null});
    // ---------- 動畫迴圈 ----------
    let stopped=false,last=performance.now();
    const R=(B,i,x,y,z)=>{B.arms[i].rotation.set(x,y,z)};
    function frame(now){if(stopped)return;if(!document.body.contains(el)){destroy();return}requestAnimationFrame(frame);
      if(document.hidden)return;const t=Math.min(.05,(now-last)/1000);last=now;
      if(el.clientWidth&&Math.abs(el.clientWidth-W)>1)fit();
      yaw+=(tyaw-yaw)*Math.min(1,t*8);pitch+=(tpitch-pitch)*Math.min(1,t*8);placeCam();
      anims=anims.filter(a=>{a.t+=t;const p=Math.min(1,a.t/a.d);a.f(p);if(p>=1){a.end&&a.end();return false}return true});
      if(selI>=0&&pieces[selI]){const g=pieces[selI];g.position.y=TOP+.32+Math.sin(now/180)*.06}
      Object.entries(pieces).forEach(([i,g])=>{if(+i!==selI&&!anims.length&&g.position.y!==TOP)g.position.y+=(TOP-g.position.y)*Math.min(1,t*12)});
      if(checkRing)checkRing.material.opacity=.55+.4*Math.sin(now/140);
      falling.forEach(l=>{const u=l.userData;u.y-=t*1.6*u.s;if(u.y<-2){u.y=28;u.x=(Math.random()-.5)*50}l.position.set(u.x+Math.sin(now/900+u.ph)*2.5,GY+u.y,u.z);l.rotation.set(now/700*u.s+u.ph,now/500,now/800)});
      const s=now/1000,lerp=(o,k,v)=>{o[k]+=(v-o[k])*Math.min(1,t*5)},tick=A=>{A.blinkT-=t;const bl=A.blinkT<0;if(A.blinkT<-.12)A.blinkT=2+Math.random()*3;
          if(A.faceT>0&&A.faceT<90){A.faceT-=t;if(A.faceT<=0&&!mood)A.face="smile"}if(A.bubT>0){A.bubT-=t;if(A.bubT<=0)A.bub.visible=false}
          try{XQBot3D.faceApply(A.B,A.face,bl,A.bubT>0&&Math.sin(now/70)>0)}catch(e){}};
      if(opp.B){const B=opp.B;B.torso.position.y=B.torso.userData.y0==null?(B.torso.userData.y0=B.torso.position.y):B.torso.userData.y0+.018*Math.sin(s*2.1);
        glanceT-=t;if(glanceT<0){glance=glance?0:1;glanceT=glance?1.6:4+Math.random()*5}
        let hx=glance?-.05:.2,hy=glance?0:.08*Math.sin(s*.4),hz=0;
        // 手：平常放大腿上；思考時右手托下巴；走棋時右手往前伸
        R(B,0,-.9,.25,-.25);R(B,1,-.9,-.25,.25);
        if(thinking&&!reach){R(B,1,-2.25,-.45,.75);hx=.18;hz=-.12+.04*Math.sin(s*1.3);if(opp.faceT<=0)opp.face="flat"}
        if(reach){reachT+=t;const p=Math.min(1,reachT/1.1),k=Math.sin(p*PI);R(B,1,-.9-1.15*k,-.25+.2*k,.25-.1*k);hx=.32+.1*k;if(p>=1)reach=0}
        if(mood&&opp.face==="happy"){R(B,0,-.2,0,-2.6+.3*Math.sin(s*9));R(B,1,-.2,0,2.6-.3*Math.sin(s*9));hx=-.1}else if(mood&&opp.face==="sad")hx=.45;
        lerp(B.head.rotation,"x",hx);lerp(B.head.rotation,"y",hy);lerp(B.head.rotation,"z",hz);tick(opp)}
      watchers.forEach(W=>{const B=W.B,ph=W.ph;if(B.torso.userData.y0==null)B.torso.userData.y0=B.torso.position.y;B.torso.position.y=B.torso.userData.y0+.015*Math.sin(s*1.7+ph);
        B.bot.rotation.z=.03*Math.sin(s*.6+ph);R(B,0,.35,0,-.15);R(B,1,.35,0,.15);if(W.chin)R(B,1,-2.2,-.45,.7);
        lerp(B.head.rotation,"x",.42+.06*Math.sin(s*.5+ph));lerp(B.head.rotation,"y",.15*Math.sin(s*.3+ph));
        W.blinkT-=t;const bl=W.blinkT<0;if(W.blinkT<-.12)W.blinkT=2+Math.random()*3;try{XQBot3D.faceApply(B,W.chin?"flat":"smile",bl,false)}catch(e){}});
      if(mate.B){const B=mate.B;B.torso.position.y=B.torso.userData.y0==null?(B.torso.userData.y0=B.torso.position.y):B.torso.userData.y0+.02*Math.sin(s*2.4+1);
        // 小帥坐在桌角：看棋盤、偶爾轉頭看你；你吃子或贏棋時舉手歡呼
        // 小帥面向我：平常抬頭看我，偶爾回頭看一下棋盤
        const look=(s%8)<1.8;let hx=look?.05:-.28+.04*Math.sin(s*.9),hy=look?.95:.12*Math.sin(s*.7);R(B,0,-.7,.2,-.35);R(B,1,-.7,-.2,.35);
        if(mate.face==="happy"&&(mate.faceT>0||mood)){R(B,0,-.2,0,-2.6+.3*Math.sin(s*10));R(B,1,-.2,0,2.6-.3*Math.sin(s*10));hx=-.35;hy=0}
        else if(mate.face==="open"&&mate.faceT>0){R(B,0,-.4,0,-1.2);R(B,1,-.4,0,1.2);hx=-.2;hy=0}
        B.legs[0].rotation.x=-1.35+.25*Math.sin(s*2.2);B.legs[1].rotation.x=-1.35-.25*Math.sin(s*2.2);
        lerp(B.head.rotation,"x",hx);lerp(B.head.rotation,"y",hy);tick(mate)}
      rd.render(sc,cam)}
    fit();placeCam();requestAnimationFrame(frame);
    const onRs=()=>fit();window.addEventListener("resize",onRs);
    function destroy(){if(stopped)return;stopped=true;window.removeEventListener("resize",onRs);try{rd.dispose();rd.forceContextLoss()}catch(e){}el.remove();opt.onDestroy&&opt.onDestroy()}
    return{el,draw,destroy,say,oppSay:(t,d)=>opp.say(t,d),resetView(){tyaw=0;tpitch=0}}}
  window.XQPark3D={create};
})();
