// 公園 3D 棋盤（意見回饋 212）：第一人稱坐在公園石桌前下棋，小帥坐在對面的長椅上當對手
// - 場景：天空漸層、遠山、草地與石板地、大樹、路燈、石桌石凳、桌上的茶杯；午後暖光＋柔和陰影＋淡霧
// - 棋盤：木製棋盤嵌在石桌上，棋子是有厚度、圓角的木棋，字刻在上面；被吃掉的棋子排在桌邊
// - 互動：點棋盤選子、走子（跟原本的 2D 棋盤一樣的規則與流程）；拖曳可以轉頭看四周，點兩下回正
// - 小帥：平常看棋盤、眨眼、偶爾抬頭看你；電腦思考時手托下巴；它走棋時伸手；被吃子會驚訝；輸贏有表情
(function(){
  /*TAPSNAP{ 11/11 點擊吸附＋手機預設視角（評比第 1 輪 Gemini／ChatGPT「3D 點擊精準度」、AI 模擬玩家第二輪問題 5）。
     這一段只放純函式（不碰 three.js、DOM），tools/test-park3d-tap.js 會照 TAPSNAP 標記把它抽出來單獨測。
     tapSnap(P,x,y,o)：P＝90 個交叉點在畫面上的位置 {i,x,y,s（那一格在畫面上的格距 px）,occ（有子）,c（現在可以點：沒選子＝己方棋子；選了子＝綠點／可吃的子，或換選另一顆己方棋子）,w（距離加權，綠點 .9＝優先）}
       ① 最近的交叉點不能點、而且手指清楚落在它上面（有子 .45 格、空點 .3 格以內）→ 照實回報那一格（點對方的子、點空點：維持原本的反應）
       ② 不然吸到最近的可點目標，半徑 max(28px, .6 格)；兩個可點目標一樣近（第二近 < 最近×1.2＋2px）→ 不猜，回 amb
       ③ 都沒有：還在棋盤格子上（.5 格內）就照實回報最近的那一格（原本的「點空」），出了棋盤回 -1（交給點物件看介紹） */
  const tapSnap=(P,x,y,o)=>{o=o||{};const R0=o.r||28;let n=null,nd=1e9;
    for(const p of P){p.d=Math.hypot(p.x-x,p.y-y);if(p.d<nd){nd=p.d;n=p}}
    if(!n)return{i:-1};
    if(!n.c&&nd<(n.occ?.45:.3)*n.s)return{i:n.i,raw:true};
    const C=P.filter(p=>p.c).map(p=>({p,e:p.d*(p.w||1)})).sort((a,b)=>a.e-b.e),a=C[0],b=C[1];
    if(a&&a.p.d<=Math.max(R0,.6*a.p.s)){
      if(b&&b.p.i!==a.p.i&&b.e<a.e*1.2+2&&b.p.d<=Math.max(R0,.6*b.p.s))return{i:-1,amb:[a.p.i,b.p.i]};
      return{i:a.p.i,d:a.p.d,snap:a.p!==n}}
    return nd<.5*n.s?{i:n.i,raw:true}:{i:-1}};
  /* inBox：棋盤框四角都在畫面內（pad＝上、右、下、左留白 px：上面讓朝代標籤、下面讓「▦ 平面棋盤」和 ＋／－） */
  const inBox=(pts,W,H,pad)=>pts.every(([x,y])=>x>=pad[3]&&x<=W-pad[1]&&y>=pad[0]&&y<=H-pad[2]);
  /* boardMeas：prj(x,y,z)→[px,py]；回報棋盤框是否放得下、最遠那排（最小）的格距 px（左右、前後取小的） */
  const boardMeas=(prj,W,H,g)=>{const c=[[-1,-1],[1,-1],[-1,1],[1,1]].map(([sx,sz])=>prj(sx*g.bw/2,g.top,sz*g.bh/2)),y=g.top+g.ph,a=prj(-4,y,-4.5),b=prj(4,y,-4.5),a1=prj(-4,y,-3.5);
    return{fit:inBox(c,W,H,g.pad||[24,4,50,4]),sp:Math.min((b[0]-a[0])/8,a1[1]-a[1])}};
  /* fitZoom：在 [lo,hi] 找最小的鏡頭距離倍數，讓棋盤框放得下、格距剛好到 want（不會拉得比需要的更近）；meas(z)→{fit,sp} */
  const fitZoom=(meas,lo,hi,want)=>{const ok=z=>{const m=meas(z);return m.fit&&m.sp<=want};if(ok(lo))return lo;if(!ok(hi))return hi;
    for(let k=0;k<22;k++){const m=(lo+hi)/2;if(ok(m))hi=m;else lo=m}return hi};
  /*}TAPSNAP*/
  /*PKPOWER{ 11/11 入座運鏡＋省電模式（評比第 2 輪：Gemini「手機預設視角找回敘事沉浸感」、ChatGPT「效能、耗電與低負載模式證據」）。
     這一段只放純函式（不碰 three.js、DOM），tools/test-park3d-power.js 照 PKPOWER 標記抽出來單獨測。
     introK(ms,hold,dur)：入座運鏡的進度，0＝坐著看（看得到對面的人和小帥）、1＝topfit；前 hold 毫秒（預設 1800）停住，之後 dur 毫秒（預設 800）ease 過去
     pwDecide(mode,s)：mode＝auto／on／off；s＝{bat:{charging,level}或 null, saveData, mem（GB，0＝不知道）, cores, mob（手機）, lowFps}；回 {on, why:[原因]}
       自動開省電：沒在充電而且電量低於 20%、數據節省、手機記憶體 2GB 以下、手機處理器 4 核以下（Safari 不報記憶體、核數又是粗估，只有 2 核以下才算）、量到畫面偏慢
     pwGap(on,act,idle)：距離上一格至少隔幾毫秒才畫下一格：沒省電＝0（每格都畫）；省電但畫面在動（拖曳、走子、運鏡、說話）＝0；閒置 3 秒內＝100（每秒 10 格）；閒置更久＝500（每秒 2 格，只為了收掉泡泡、換表情）
     pwDue(now,lastR,gap)：這一格該不該畫（留 8ms 寬限，60Hz 螢幕上 100ms 才會剛好落在第 6 格）
     fpsWin(w,now)：每畫一格呼叫一次，滿 5 秒回平均每秒幾格（不滿回 null）；兩格之間隔超過 1 秒（切走、藏起來）就重新量
     pfAdd(q,sec,f,r,i)／pfSum(q,sec)：近 10 秒的計數（每秒一格：f＝迴圈跑幾次、r＝畫了幾次、i＝其中閒置時畫的）；pfSum 只算已經過完的秒 */
  const introK=(ms,hold,dur)=>{hold=hold==null?1800:hold;dur=dur||800;if(!(ms>hold))return 0;const p=Math.min(1,(ms-hold)/dur);return p<.5?2*p*p:1-Math.pow(-2*p+2,2)/2};
  const pwDecide=(mode,s)=>{s=s||{};if(mode==="on")return{on:true,why:["手動開"]};if(mode==="off")return{on:false,why:["手動關"]};const w=[];
    if(s.bat&&!s.bat.charging&&s.bat.level<.2)w.push("電量低於 20%");if(s.saveData)w.push("數據節省");
    if(s.mob&&s.mem>0&&s.mem<=2)w.push("記憶體 "+s.mem+"GB");if(s.mob&&s.cores>0&&(s.cores<=2||(s.cores<=4&&s.mem>0)))w.push("處理器 "+s.cores+" 核");
    if(s.lowFps)w.push("畫面偏慢");return{on:w.length>0,why:w}};
  const pwGap=(on,act,idle)=>!on||act?0:idle<3000?100:500;
  const pwDue=(now,lastR,gap)=>!gap||now-lastR>=gap-8;
  const fpsWin=(w,now)=>{if(!w.t0||now-w.lp>1000){w.t0=now;w.lp=now;w.n=0;return null}w.n++;w.lp=now;const el=now-w.t0;if(el>=5000){const a=w.n*1000/el;w.t0=now;w.n=0;return a}return null};
  const pfAdd=(q,sec,f,r,i)=>{let b=q[q.length-1];if(!b||b.s!==sec){b={s:sec,f:0,r:0,i:0};q.push(b);while(q.length&&q[0].s<sec-10)q.shift()}b.f+=f;b.r+=r;b.i+=i;return q};
  const pfSum=(q,sec)=>{let f=0,r=0,i=0,lo=sec;for(const b of q)if(b.s<sec&&b.s>=sec-10){f+=b.f;r+=b.r;i+=b.i;if(b.s<lo)lo=b.s}const n=Math.max(1,sec-lo);return{fps:Math.round(r/n*10)/10,frames:f,renders:r,idle:i,span:n}};
  /*}PKPOWER*/
  const T=window.THREE;if(!T)return;
  /* 11/11 入座運鏡、省電模式的共用狀態（App 開著就一直在）：INTRO_SEEN＝播過入座運鏡的那幾盤；PWS＝電池、畫面偏慢；PF＝最近一座園子的效能計數（window.__PK.perf、設定頁那一行讀它） */
  const INTRO_SEEN=new Set(),PWS={bat:null,lowFps:false,batGo:false};
  try{const t=+localStorage.getItem("xq_pkLowFps")||0;if(t&&Date.now()-t<3*864e5)PWS.lowFps=true}catch(e){}   /* 量到畫面偏慢記 3 天：下次進園子一開始就省電（連抗鋸齒都不開） */
  const PF={live:false,fps:0,frames:0,renders:0,idle:0,span:0,power:false,why:[],mode:"auto",aa:true,pr:1,lowFps:PWS.lowFps};
  try{(window.__PK=window.__PK||{}).perf=PF}catch(e){}
  const pwMode=()=>{try{const v=JSON.parse(localStorage.getItem("m_pkPower")||'"auto"');return v==="on"||v==="off"?v:"auto"}catch(e){return"auto"}};   /* 設定 → 棋盤 → 更多設定「🔋 省電模式」（06-cpu pkPwRow，store pkPower） */
  const pwSig=()=>{const n=window.navigator||{},c=n.connection||{},mob=(()=>{try{return matchMedia("(pointer:coarse)").matches}catch(e){return false}})();return{bat:PWS.bat,saveData:!!c.saveData,mem:+n.deviceMemory||0,cores:+n.hardwareConcurrency||0,mob,lowFps:PWS.lowFps}};
  const pwBat=()=>{if(PWS.batGo)return;PWS.batGo=true;try{if(navigator.getBattery)navigator.getBattery().then(b=>{const u=()=>{PWS.bat={charging:!!b.charging,level:+b.level}};u();b.addEventListener("chargingchange",u);b.addEventListener("levelchange",u)}).catch(()=>{})}catch(e){}};
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
  // inflight＝還在下載的圖片（意見回饋 249：全部載好才顯示公園，不先閃一下舊款的程式畫面）
  const inflight=new Set();
  const loadImg=(src,cb)=>{if(!src)return null;const c=imgCache[src];if(c){if(c.complete&&c.naturalWidth)return c;c.addEventListener("load",()=>cb&&cb(),{once:true});return null}
    const im=new Image();im.decoding="async";inflight.add(im);const off=()=>inflight.delete(im);im.addEventListener("load",off,{once:true});im.addEventListener("error",off,{once:true});
    im.src=src;imgCache[src]=im;im.addEventListener("load",()=>cb&&cb(),{once:true});
    /* 意見回饋 486、487（宋朝環景一直是黑的，重開也一樣）：手機快取裡那張圖壞了，解碼失敗——把壞的快取刪掉、繞過快取重抓一次（下次開會重新存一份好的） */
    if(!/[?&]fresh=/.test(src))im.addEventListener("error",()=>{try{const u=new URL(src,location.href).href;if(window.caches)caches.keys().then(ks=>ks.forEach(k=>caches.open(k).then(c=>c.delete(u)))).catch(()=>{})}catch(e){}
      setTimeout(()=>{const r=new Image();r.decoding="async";inflight.add(r);const off2=()=>inflight.delete(r);r.addEventListener("load",()=>{off2();imgCache[src]=r;cb&&cb()},{once:true});r.addEventListener("error",off2,{once:true});r.src=src+(src.includes("?")?"&":"?")+"fresh="+Date.now()},1200)},{once:true});
    return null};
  const boardTex=onReady=>{const t=MOB?cv(1040,1140,(g,w,h)=>drawBoard(g,w,h,onReady)):cv(1560,1710,(g,w,h)=>drawBoard(g,w,h,onReady));return t};
  /* hspx（開發者 11/12「把黑洞的楚河漢界改畫成宇宙感的味道，請 Gemini 發揮」）：巨盤模式（黑洞星盤，create 設 BRIVER）河界換成 Gemini 畫的星河長條 data/park/bh_river.webp，
     「楚河」「漢界」用程式寫發光金字（Gemini 不寫字，免得寫錯） */
  let BRIVER=null;
  function drawRiver(g,w,h,onReady){const im=loadImg(BRIVER,onReady);if(!im)return;const u=w/BW,X=c=>(c+1.2)*u,Y=r=>(r+1.2)*u,x0=X(0)-.03*u,x1=X(8)+.03*u,y0=Y(4)+.05*u,y1=Y(5)-.05*u,ry=(y0+y1)/2,T4=[["楚",1.2],["河",2.6],["漢",5.4],["界",6.8]];
    g.save();g.drawImage(im,x0,y0,x1-x0,y1-y0);g.font=`900 ${.6*u}px ${SERIF}`;g.textAlign="center";g.textBaseline="middle";
    g.shadowColor="rgba(255,200,110,.95)";g.shadowBlur=.25*u;g.fillStyle="#FFE3A0";for(const[t,c]of T4)g.fillText(t,X(c),ry);g.shadowBlur=0;g.lineWidth=.025*u;g.strokeStyle="rgba(120,70,20,.8)";for(const[t,c]of T4)g.strokeText(t,X(c),ry);g.restore()}
  function drawBoard(g,w,h,onReady){try{drawBoard0(g,w,h,onReady)}finally{if(BRIVER)try{drawRiver(g,w,h,onReady)}catch(e){}}}
  function drawBoard0(g,w,h,onReady){const u=w/BW;const L=LOOK,im=L&&L.img?loadImg(L.img,onReady):null;
    if(im&&L.rect){// 平面棋盤座標：格線原點 (40,40)、格距 60；這裡格線原點在 1.2 格處
      const P=v=>((v-40)/60+1.2)*u,[x,y,ww,hh]=L.rect;g.fillStyle="#2a1a10";g.fillRect(0,0,w,h);g.drawImage(im,P(x),P(y),ww/60*u,hh/60*u);
      const X=c=>(c+1.2)*u,Y=r=>(r+1.2)*u,G=L.grid||"#3A1D0A";g.strokeStyle=G;g.lineCap="round";g.lineWidth=6;g.strokeRect(X(0)-.13*u,Y(0)-.13*u,8.26*u,9.26*u);g.lineWidth=4.5;
      for(let r=0;r<10;r++){g.beginPath();g.moveTo(X(0),Y(r));g.lineTo(X(8),Y(r));g.stroke()}
      for(let c=0;c<9;c++){g.beginPath();if(c===0||c===8){g.moveTo(X(c),Y(0));g.lineTo(X(c),Y(9))}else{g.moveTo(X(c),Y(0));g.lineTo(X(c),Y(4));g.moveTo(X(c),Y(5));g.lineTo(X(c),Y(9))}g.stroke()}
      for(const r0 of[0,7]){g.beginPath();g.moveTo(X(3),Y(r0));g.lineTo(X(5),Y(r0+2));g.moveTo(X(5),Y(r0));g.lineTo(X(3),Y(r0+2));g.stroke()}
      // 楚河漢界（意見回饋：朝代棋盤上不見了）：用格線色、粗明體；外圈一道淡淡的反差邊，深色的朝代棋盤上也讀得出來
      if(!L.riverDone){const ry=(Y(4)+Y(5))/2,dark=lum(G.length>=7?G:"#3A1D0A")<.5;   /* 11/10：底圖已經有楚河漢界（朝代橫幅、朝代字形）就不再寫，免得兩層字疊在一起 */g.font=`900 ${.62*u}px ${SERIF}`;g.textAlign="center";g.textBaseline="middle";g.lineJoin="round";
        g.strokeStyle=dark?"rgba(255,246,225,.55)":"rgba(20,10,5,.55)";g.lineWidth=.06*u;g.fillStyle=G;
        for(const[t,c]of[["楚",1.2],["河",2.6],["漢",5.4],["界",6.8]]){g.strokeText(t,X(c),ry);g.fillText(t,X(c),ry)}}
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
  const MOB=(()=>{try{return matchMedia("(pointer:coarse)").matches||innerWidth<820}catch(e){return false}})();
  const freeTex=t=>{try{const im=t&&t.image;if(im&&im.getContext){im.width=1;im.height=1}t&&t.dispose&&t.dispose()}catch(e){}};
  const faceCache={},rimCache={},FN=MOB?512:1024,SERIF='"Noto Serif TC","PMingLiU","Songti TC","SimSun",serif';
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
  // 意見回饋：iPhone 上棋子還是太淡 → 棋子底圖、棋身顏色飽和度 ×1.3、對比 ×1.12（以中間調為準），字色再壓深一點；各朝代的色相不變
  const RS=1.3,RC=1.12,rich1=(v,l)=>clamp((l+(v-l)*RS-128)*RC+128,0,255);
  const hex2=a=>"#"+a.map(v=>(v|0).toString(16).padStart(2,"0")).join("");
  const richHex=h=>{const n=parseInt(h.slice(1,7),16),r=n>>16&255,g=n>>8&255,b=n&255,l=r*.3+g*.59+b*.11;return hex2([rich1(r,l),rich1(g,l),rich1(b,l)])};
  const deepInk=h=>{const n=parseInt(h.slice(1,7),16),r=n>>16&255,g=n>>8&255,b=n&255,l=r*.3+g*.59+b*.11;
    if(l>150)return h;const k=l<60?.72:.84;return hex2([r,g,b].map(v=>clamp((l+(v-l)*1.2)*k,0,255)))};   // 很亮的字色（金字、白字）不動
  const richCache={};
  const richImg=im=>{const k=im.src;if(richCache[k])return richCache[k];const c=document.createElement("canvas");c.width=c.height=FN;const g=c.getContext("2d");g.imageSmoothingQuality="high";g.drawImage(im,0,0,FN,FN);
    try{const id=g.getImageData(0,0,FN,FN),d=id.data;for(let i=0;i<d.length;i+=4){const l=d[i]*.3+d[i+1]*.59+d[i+2]*.11;d[i]=rich1(d[i],l);d[i+1]=rich1(d[i+1],l);d[i+2]=rich1(d[i+2],l)}g.putImageData(id,0,0)}catch(e){return im}
    return richCache[k]=c};
  // 字面的漆光：左上一點柔亮、外緣一圈淡淡的暗邊（像斜角），看起來是有厚度的上漆棋子
  const gloss=(g,n)=>{const h=n/2;let gr=g.createRadialGradient(h*.62,h*.55,0,h*.62,h*.55,h*1.05);gr.addColorStop(0,"rgba(255,255,255,.1)");gr.addColorStop(.55,"rgba(255,255,255,.025)");gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(0,0,n,n);
    gr=g.createRadialGradient(h,h,h*.9,h,h,h);gr.addColorStop(0,"rgba(0,0,0,0)");gr.addColorStop(1,"rgba(0,0,0,.28)");g.fillStyle=gr;g.fillRect(0,0,n,n)};
  // 字：先描反差邊（細）、再填字色；字形太細的朝代（GLY_BOLD）再用字色加粗一點
  // 反差邊只在需要的時候描：字色跟底色（底圖中間的平均亮度）差很多就幾乎不描，差不多才描明顯一點（不會一律白邊，紅字變粉紅）
  const glyph=(g,n,ch,ink,gly,bold,bg)=>{const h=n/2,li=lum(ink),need=clamp(1-(Math.abs(li-(bg==null?.75:bg))-.15)/.4,.15,1),halo=li>.5?`rgba(0,0,0,${.8*need})`:`rgba(255,255,255,${.85*need})`;g.lineJoin="round";g.lineCap="round";
    if(gly&&window.Path2D){const P2=new Path2D(gly),k=n*.6/100;g.save();g.translate(h-50*k,h-50*k);g.scale(k,k);
      g.strokeStyle=halo;g.lineWidth=(3+2.4*need)+bold/.31;g.stroke(P2);g.fillStyle=ink;g.fill(P2);if(bold){g.strokeStyle=ink;g.lineWidth=bold/.31;g.stroke(P2)}g.restore();return}
    g.font=`900 ${n*.6|0}px ${SERIF}`;g.textAlign="center";g.textBaseline="middle";const y=h+n*.03;
    g.strokeStyle=halo;g.lineWidth=n*(.016+.014*need);g.strokeText(ch,h,y);g.fillStyle=ink;g.fillText(ch,h,y);g.strokeStyle=ink;g.lineWidth=n*.008;g.strokeText(ch,h,y)};
  /* 意見回饋 399：這個朝代有 Gemini 整套棋子（LOOK.pset），棋面直接貼那一顆的圖（字已經畫在上面） */
  const PSRC=b=>["r","b"].flatMap(s=>"KABRNCP".split("").map(k=>b+s+k+".webp"));
  const faceTex=(ch,red,onReady)=>{const L=LOOK,s=red?"r":"b",im=L&&L.pieces?loadImg(L.pieces[s],onReady):null,key=ch+(im?"|"+L.k:"");if(faceCache[key])return faceCache[key];
    if(L&&L.hc){const k="hc|"+ch;return faceCache[k]||(faceCache[k]=cv(FN,FN,(g,n)=>{const ink=red?"#C8102E":"#111111";g.fillStyle="#FFFFFF";g.fillRect(0,0,n,n);g.strokeStyle=ink;g.lineWidth=n*.05;g.beginPath();g.arc(n/2,n/2,n*.44,0,TAU);g.stroke();g.lineWidth=n*.02;g.beginPath();g.arc(n/2,n/2,n*.36,0,TAU);g.stroke();
      g.font=`900 ${n*.6|0}px "Noto Sans TC","PingFang TC",sans-serif`;g.textAlign="center";g.textBaseline="middle";g.fillStyle=ink;g.fillText(ch,n/2,n/2+n*.03)}))}   /* 高對比棋子 */
    if(L&&L.pset){const lt=Object.keys(NAMES[s]).find(k=>NAMES[s][k]===ch),src=L.pset+s+lt+".webp",pim=loadImg(src,onReady),pk="ps|"+src;if(faceCache[pk])return faceCache[pk];
      if(pim)return faceCache[pk]=cv(FN,FN,(g,n)=>{g.fillStyle=rimOf(pim);g.fillRect(0,0,n,n);g.imageSmoothingQuality="high";g.drawImage(pim,-n*.03,-n*.03,n*1.06,n*1.06)})}
    if(L&&L.pieces&&!im)return plainFace(ch,red);
    if(L&&L.pieceBg&&!L.pieces&&!L.pset)return tintFace(ch,red,L);   /* 意見回饋 561：照平面棋盤風格的棋子顏色 */
    if(im)return faceCache[key]=cv(FN,FN,(g,n)=>{g.fillStyle=rimOf(im);g.fillRect(0,0,n,n);g.imageSmoothingQuality="high";g.drawImage(richImg(im),-n*.01,-n*.01,n*1.02,n*1.02);gloss(g,n);
      /* 意見回饋 345：公園裡紅黑要一眼分得出來——深色字一律換成鮮紅／純黑，外圈再加一道同色的圈（亮色字的朝代照原本的字色） */
      const ink0=(L.ink&&L.ink[s])||(red?"#B3141B":"#141414"),bright=lum(ink0)>.55,ink=bright?ink0:red?"#D3121A":"#0A0A0A";
      g.strokeStyle=ink;g.lineWidth=n*.04;g.beginPath();g.arc(n/2,n/2,n*.43,0,TAU);g.stroke();
      glyph(g,n,ch,ink,L.gly&&L.gly[ch],L.bold||0,bgOf(im))});
    return plainFace(ch,red)};
  const tintFace=(ch,red,L)=>{const k="tf|"+L.pieceBg+"|"+(L.ink&&L.ink.r)+"|"+(L.ink&&L.ink.b)+"|"+ch;return faceCache[k]||(faceCache[k]=cv(FN,FN,(g,n)=>{const h=n/2;g.fillStyle=L.pieceBg;g.fillRect(0,0,n,n);
    let gr=g.createRadialGradient(h*.75,h*.7,10,h,h,h);gr.addColorStop(0,"rgba(255,255,255,.28)");gr.addColorStop(.7,"rgba(255,255,255,0)");gr.addColorStop(1,"rgba(0,0,0,.18)");g.fillStyle=gr;g.fillRect(0,0,n,n);
    const ink=(L.ink&&L.ink[red?"r":"b"])||(red?"#B3261E":"#1E1A16");g.strokeStyle=ink;g.lineWidth=n*.022;g.beginPath();g.arc(h,h,h*.84,0,TAU);g.stroke();gloss(g,n);glyph(g,n,ch,ink,L.gly&&L.gly[ch],L.bold||0,lum(L.pieceBg))}))};
  // 沒有朝代底圖時的木棋：象牙色、紅黑字、內圈細線
  const plainFace=(ch,red)=>faceCache[ch]||(faceCache[ch]=cv(FN,FN,(g,n)=>{const h=n/2;
    let gr=g.createRadialGradient(h*.75,h*.7,40,h,h,h);gr.addColorStop(0,"#FCEFCB");gr.addColorStop(.75,"#EED19A");gr.addColorStop(1,"#D2A35C");g.fillStyle=gr;g.fillRect(0,0,n,n);
    const ink=red?"#9A0A12":"#0E0E0E";g.strokeStyle=ink;g.lineWidth=n*.022;g.beginPath();g.arc(h,h,h*.84,0,TAU);g.stroke();gloss(g,n);
    glyph(g,n,ch,ink,null,0,.85)}));
  const stoneTex=(base,rep)=>{const t=cv(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);noise(g,w,h,9000,"255,255,255",.12);noise(g,w,h,9000,"0,0,0",.14);
    for(let i=0;i<40;i++){g.fillStyle=`rgba(${Math.random()<.5?"40,40,40":"235,230,220"},${.05+Math.random()*.08})`;g.beginPath();g.arc(Math.random()*w,Math.random()*h,4+Math.random()*16,0,TAU);g.fill()}});
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep);return t};
  /* 11/10 開發者（宋朝園子石台外那圈「整個是土色」）：山坡改成水墨草地——淡綠底、大片淡墨暈染、短草筆觸、零星碎石，不再是一片平平的土黃 */
  const grassTex=(base,inkC,rep)=>{const c=new T.Color(inkC||"#2C3B37"),ir=Math.round(c.r*255),ig=Math.round(c.g*255),ib=Math.round(c.b*255);
    const t=cv(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);
      for(let i=0;i<26;i++){const x=Math.random()*w,y=Math.random()*h,r=30+Math.random()*90,gr=g.createRadialGradient(x,y,0,x,y,r),dk=Math.random()<.55;gr.addColorStop(0,dk?`rgba(${ir},${ig},${ib},${.08+Math.random()*.1})`:`rgba(250,248,236,${.08+Math.random()*.1})`);gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r)}
      g.lineCap="round";for(let i=0;i<2200;i++){const x=Math.random()*w,y=Math.random()*h,L=5+Math.random()*11,a=-Math.PI/2+(Math.random()-.5)*.9,bend=(Math.random()-.5)*4;g.strokeStyle=`rgba(${ir},${ig},${ib},${.28+Math.random()*.4})`;g.lineWidth=.7+Math.random()*1.3;g.beginPath();g.moveTo(x,y);g.quadraticCurveTo(x+bend,y-L*.55,x+Math.cos(a)*L,y+Math.sin(a)*L);g.stroke()}
      noise(g,w,h,6000,"255,255,255",.08);noise(g,w,h,6000,"0,0,0",.1);
      for(let i=0;i<60;i++){g.fillStyle=`rgba(${Math.random()<.5?"90,88,80":"205,200,188"},${.25+Math.random()*.3})`;g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,1.5+Math.random()*3,1+Math.random()*2,Math.random()*3,0,TAU);g.fill()}});
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
  const ERAMAP_R=118;   /* 朝代大地圖的半徑（全景長卷 170 以內） */
  const PAN={r:170,arc:PI*1.2,yb:-170,yt:90,w:3072,h:1024};
  const skyTex=E=>cv(16,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,E.sky[0]);gr.addColorStop(.4,E.sky[1]);gr.addColorStop(.5,E.sky[2]);gr.addColorStop(.56,E.mist);gr.addColorStop(1,E.mist);g.fillStyle=gr;g.fillRect(0,0,w,h)});
  // 開發者用 Gemini 畫的朝代長卷（data/park/<朝代>.webp）：繞成 360 度一整圈（意見回饋：轉頭看旁邊、後面，圖不能斷、不能突然變成程式畫的山、不能有空白）
  // L、R＝圖上左右兩個主景的範圍（0～1）；crop＝只用圖上這一段（秦的原圖是「歷代一條長卷」，只取最左邊秦的長城、烽火台、紅旗、松亭，轉頭才不會看到別朝代的地標）
  // gap＝主景之間多留幾度雲霧（主景段很窄的時候用，不然一圈會擠太多份）
  /* 意見回饋 421（構圖）：長卷的地平線原本壓在 -42 度（以前鏡頭高 16 時定的），鏡頭拉高到 27 後整幅山水都沉到平台邊以下，轉頭只看到一片白；
     改成 -24 度：從預設視角看，長卷下緣（近景草地）剛好藏在平台邊後面，平台像坐落在山水裡（不再像一座高高的石台），轉頭時中景的城樓、遠景的山都露出來 */
  const PANO_HOR=window.__HOR!=null?window.__HOR:-24;
  const BG_IMG={qin:{src:"data/park/qin.webp",crop:[0,.34],L:[.02,.165],R:[.2,.33],gap:0},han:{src:"data/park/han.webp",L:[.08,.35],R:[.65,.92]},classic:{src:"data/park/classic.webp",L:[.06,.36],R:[.64,.94]},sanguo:{src:"data/park/sanguo.webp",L:[.05,.35],R:[.62,.94]},
    // 新做法（開發者用 Gemini 畫前、右、後、左 4 張，tools/stitch_pano.py 接成一整圈）：pano＝整圈長圖，直接貼滿 360 度
    // hz＝原圖地平線的高度（由上往下 0～1）；hor＝地平線放在鏡頭的仰角幾度（負＝往下看；平台在山上，往外看是俯瞰山谷）；rot＝整圈再轉幾度（正＝往右）
    tang:{src:"data/park/tang_360.webp",pano:true,hz:.58,hor:PANO_HOR,rot:0}};
  // 其他 12 個朝代也換成 Gemini 畫的整圈背景（同一套規格）
  for(const k of["classic","qin","han","sanguo","weijin","nanbei","sui","wudai","song","yuan","ming","qing"])BG_IMG[k]={src:"data/park/"+k+"_360.webp",pano:true,hz:.58,hor:PANO_HOR,rot:0};   // 開發者用 Gemini 畫的 13 朝代長卷全部到齊
  // 開發者用 Gemini 畫的朝代道具（data/park3d/<朝代>/：tree1、tree2、bench、stool、lantern、cup、tabletop 去背 webp，下緣＝落地／落桌的地方）
  // 有列在這裡的朝代：樹、長椅、凳子、燈籠、茶杯都換成手繪立牌，桌面換成手繪桌面；其他朝代照舊用程式做的 3D 家具。新增朝代＝放圖＋這裡加一行
  // top＝桌面圖上圓桌面的圓心 x、y、半徑（像素，1024 的圖）
  // lamp＝燈籠怎麼擺：stand＝自己有燈座，立在地上（h＝高度）；hang＝吊著的燈籠，另外做一根立柱和橫桿吊起來；glow＝燭光在圖上的高度（由下往上 0～1）
  const PROP_IMG={tang:{top:[511,510,489]},
    classic:{lamp:{hang:1,h:7.5,glow:.5}},qin:{lamp:{h:8,glow:.85}},han:{lamp:{h:7.5,glow:.62}},sanguo:{lamp:{h:10,glow:.6}},
    weijin:{lamp:{h:7,glow:.5}},nanbei:{lamp:{h:8,glow:.55}},sui:{lamp:{hang:1,h:8,glow:.5}},wudai:{lamp:{hang:1,h:8,glow:.5}},
    song:{lamp:{h:11,glow:.7}},yuan:{lamp:{h:11,glow:.7}},ming:{lamp:{h:9,glow:.7}},qing:{lamp:{h:10,glow:.72}}};
  // 原圖前處理（每張圖只做一次）：每一列的宣紙色、墨色加深一點、找出太陽並另做一份「沒有太陽」的（正面以外的段落用，一圈才不會有好幾個太陽）
  const panPrep={};
  function prepPan(im){const k=im.src;if(panPrep[k])return panPrep[k];
    const iw=im.naturalWidth,ih=im.naturalHeight,mk=()=>{const c=document.createElement("canvas");c.width=iw;c.height=ih;return c},c=mk(),g=c.getContext("2d");g.drawImage(im,0,0);
    const id=g.getImageData(0,0,iw,ih),d=id.data,lumA=new Float32Array(iw*ih);for(let i=0;i<iw*ih;i++)lumA[i]=d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;
    // 每一列的紙色：該列亮度第 80～97 百分位的像素平均（避開墨色、也避開最亮的日光），再上下平滑；滿版都是山的列（秦）不能當紙色，拉回圖頂的紙色
    let row=new Float32Array(ih*3);const rowL=new Float32Array(ih);
    for(let y=0;y<ih;y++){const ls=lumA.subarray(y*iw,y*iw+iw),srt=Float32Array.from(ls).sort(),lo=srt[iw*.8|0],hi=srt[iw*.97|0];let r=0,gg=0,b=0,n=0;
      for(let x=0;x<iw;x++)if(ls[x]>=lo&&ls[x]<=hi){const i=(y*iw+x)*4;r+=d[i];gg+=d[i+1];b+=d[i+2];n++}n=n||1;row[y*3]=r/n;row[y*3+1]=gg/n;row[y*3+2]=b/n}
    {const sm=new Float32Array(ih*3);for(let y=0;y<ih;y++)for(let q=0;q<3;q++){let t=0,n=0;for(let j=-16;j<=16;j++){const yy=y+j;if(yy>=0&&yy<ih){t+=row[yy*3+q];n++}}sm[y*3+q]=t/n}row=sm}
    {const n0=Math.max(2,ih*.04|0),G=[0,0,0];for(let y=0;y<n0;y++)for(let q=0;q<3;q++)G[q]+=row[y*3+q]/n0;const GL=G[0]*.3+G[1]*.59+G[2]*.11;
      for(let y=0;y<ih;y++){const l=row[y*3]*.3+row[y*3+1]*.59+row[y*3+2]*.11,w=clamp((GL-6-l)/14,0,1);for(let q=0;q<3;q++)row[y*3+q]+=(G[q]-row[y*3+q])*w}}
    for(let y=0;y<ih;y++)rowL[y]=row[y*3]*.3+row[y*3+1]*.59+row[y*3+2]*.11;
    // 天空的大片暖色暈（漢、經典的圖頂中間比較深）：用很模糊的版本找出「比紙色暗、但不是墨」的低頻色偏，從上半部扣掉；
    // 不然一圈重複好幾份，每份頂上都有一塊深色暈，邊緣還看得出是一段一段的
    {const bw=Math.max(4,iw/16|0),bh=Math.max(4,ih/16|0),sm=document.createElement("canvas");sm.width=bw;sm.height=bh;const sg=sm.getContext("2d");sg.imageSmoothingQuality="high";sg.drawImage(c,0,0,bw,bh);
      const up=mk(),ug=up.getContext("2d");ug.imageSmoothingEnabled=true;ug.imageSmoothingQuality="high";ug.drawImage(sm,0,0,iw,ih);const B=ug.getImageData(0,0,iw,ih).data,y1=ih*.5,y0=ih*.3;
      for(let y=0;y<y1;y++){const wr=y<y0?1:(y1-y)/(y1-y0);for(let x=0;x<iw;x++){const i=(y*iw+x)*4,dr=B[i]-row[y*3],dg=B[i+1]-row[y*3+1],db=B[i+2]-row[y*3+2],dl=dr*.3+dg*.59+db*.11;
        if(dl>=0)continue;const k=wr*clamp((34+dl)/20,0,1);if(k>0){d[i]-=dr*k;d[i+1]-=dg*k;d[i+2]-=db*k}}}}
    // 墨色加深一點（只拉開跟紙色的差距、紙色不變）：放大 1.5 倍後不會灰灰糊糊的
    for(let y=0;y<ih;y++)for(let x=0;x<iw;x++){const i=(y*iw+x)*4;for(let q=0;q<3;q++){const p=row[y*3+q],v=d[i+q];d[i+q]=v<p?p+(v-p)*1.12:v}}
    g.putImageData(id,0,0);
    // 太陽：上半部（前 45% 列）比該列紙色亮最多的一團（8×8 格平均，避開最左右 5%）
    const C=8,gw=iw/C|0,gh=(ih*.45)/C|0,ex=new Float32Array(gw*gh);let best=0,bx=0,by=0;
    for(let j=0;j<gh;j++)for(let i=0;i<gw;i++){let t=0;for(let y=j*C;y<j*C+C;y++)for(let x=i*C;x<i*C+C;x++)t+=lumA[y*iw+x]-rowL[y];t/=C*C;ex[j*gw+i]=t;if(i>gw*.05&&i<gw*.95&&t>best){best=t;bx=i;by=j}}
    const N=mk();N.getContext("2d").drawImage(c,0,0);
    if(best>4){let rr=1;while(bx+rr<gw&&ex[by*gw+bx+rr]>best*.3)rr++;const sx=(bx+.5)*C,sy=(by+.5)*C,R0=Math.max(14,rr*C+4)*1.15,R1=R0*2.3;
      const q=N.getContext("2d"),nd=q.getImageData(0,0,iw,ih),dd=nd.data;
      for(let y=Math.max(0,sy-R1|0);y<Math.min(ih,sy+R1);y++)for(let x=Math.max(0,sx-R1|0);x<Math.min(iw,sx+R1);x++){const r=Math.hypot(x-sx,y-sy);if(r>=R1)continue;
        const w=r<=R0?1:1-(r-R0)/(R1-R0),i=(y*iw+x)*4,l=dd[i]*.3+dd[i+1]*.59+dd[i+2]*.11,e=clamp((l-rowL[y])/5,0,1)*w*w*(3-2*w);
        if(e>0)for(let k2=0;k2<3;k2++)dd[i+k2]+=(row[y*3+k2]-dd[i+k2])*e}
      q.putImageData(nd,0,0)}
    return panPrep[k]={A:c,N,row,ih,iw}};
  const rgbS=(a,i)=>`rgb(${a[i*3]|0},${a[i*3+1]|0},${a[i*3+2]|0})`;
  // 畫整圈長卷（貼圖寬＝360 度）：圖切成「左主景段」A＝[起點, m]、「右主景段」B＝[m, 終點]（m＝兩主景之間的雲霧），保持原圖長寬比、不拉伸，
  // 沿圓周輪流擺 A、B、A′、B′、A、B…（′＝左右鏡像；同一個主景不會緊挨著自己）；正面 A 在 -18 度、B 在 +18 度（預設視角的兩個上角）。
  // 每段左右邊緣寬幅淡化，接縫再蓋一團同色雲霧；圖的上下鋪滿從圖上取的宣紙色（天空球也換成同色），整圈看起來是同一張長卷
  function drawUserPan(g,W,H,im,cfg){const P=prepPan(im),iw=P.iw,ih=P.ih,dh=H*(cfg.h||.56),y0=Math.round(H*(cfg.hy||.743)-dh*.6),dhc=Math.ceil(dh);
    // 高度：預設視角（往下看棋盤）畫面最上緣大約是仰角 -28 度，所以把圖往下放、放大一點，讓主景的屋頂、樹梢落在長椅兩側上角看得到的地方
    const pxD=W/360,ADEG=iw/ih*(dh/H*(PAN.yt-PAN.yb))/PAN.r*180/PI,X=d=>(d/360+.5)*W,DEG=18;   // ADEG＝整張原圖在圓柱上的寬度（度）
    const cr=cfg.crop||[0,1],m=(cfg.L[1]+cfg.R[0])/2,cL=(cfg.L[0]+cfg.L[1])/2,cR=(cfg.R[0]+cfg.R[1])/2;
    const SEG=[{a0:cr[0],a1:m,c:cL},{a0:m,a1:cr[1],c:cR}],nat=(cR-cL)*ADEG+(cfg.gap||0),n=Math.max(4,2*Math.ceil(((360-2*DEG)/nat+1)/2-.25)),S=(360-2*DEG)/(n-1);
    // 底：每一列的紙色（圖外延伸頂列、底列的顏色）；最上緣淡出到天空球（同色，看不出邊）
    const col=document.createElement("canvas");col.width=1;col.height=H;const cg=col.getContext("2d");
    for(let y=0;y<H;y++){const yy=clamp(Math.round((y-y0)/dh*ih),0,ih-1);cg.fillStyle=rgbS(P.row,yy);cg.globalAlpha=Math.min(1,y/(H*.1));cg.fillRect(0,y,1,1)}
    g.clearRect(0,0,W,H);g.imageSmoothingEnabled=true;g.drawImage(col,0,0,1,H,0,0,W,H);
    const off=document.createElement("canvas");off.width=W;off.height=dhc;const o=off.getContext("2d");o.imageSmoothingEnabled=true;o.imageSmoothingQuality="high";
    const put=(c,x)=>{o.drawImage(c,x,0);if(x<0)o.drawImage(c,x+W,0);if(x+c.width>W)o.drawImage(c,x-W,0)};
    const joints=[];
    for(let k=0;k<n;k++){const sg=SEG[k%2],mir=(k>>1)%2===1,p=k===0?-DEG:k===1?DEG:DEG+(k-1)*S,src=k<2?P.A:P.N;
      const wd=(sg.a1-sg.a0)*ADEG,w=Math.max(2,Math.round(wd*pxD)),fw=Math.min(12,wd*.24)*pxD,x0=Math.round(X(p)-(mir?sg.a1-sg.c:sg.c-sg.a0)*ADEG*pxD);
      const c=document.createElement("canvas");c.width=w;c.height=dhc;const q=c.getContext("2d");q.imageSmoothingEnabled=true;q.imageSmoothingQuality="high";
      if(mir){q.translate(w,0);q.scale(-1,1)}q.drawImage(src,sg.a0*iw,0,(sg.a1-sg.a0)*iw,ih,0,0,w,dh);q.setTransform(1,0,0,1,0,0);
      // 左右淡出的邊不是一條直線：每一小段高度的淡出位置跟寬度都跟著起伏（像雲霧的邊），看不出「切一刀」的直邊
      // （遮罩先畫在另一張畫布上再一次套用：destination-in 會把沒畫到的地方全部清掉）
      const mk2=document.createElement("canvas");mk2.width=w;mk2.height=dhc;const mq=mk2.getContext("2d"),ph=k*2.1+.7,BH=4;
      for(let y=0;y<dhc;y+=BH){const t=y/dhc*TAU,wl=(.5*Math.sin(t*1.3+ph)+.3*Math.sin(t*3.7+ph*2))*fw*.45,wr=(.5*Math.sin(t*1.1+ph*1.7)+.3*Math.sin(t*3.3+ph*.6))*fw*.45,
          a0=clamp(fw*.5+wl-fw*.5,0,w*.45),a1=clamp(fw*1.1+wl,a0+4,w*.48),b1=clamp(w-fw*.5+wr-fw*.5,w*.55,w),b0=clamp(w-fw*1.1+wr,w*.52,b1-4),gr=q.createLinearGradient(0,0,w,0);
        gr.addColorStop(0,"rgba(0,0,0,0)");gr.addColorStop(a0/w,"rgba(0,0,0,0)");gr.addColorStop(a1/w,"#000");gr.addColorStop(b0/w,"#000");gr.addColorStop(b1/w,"rgba(0,0,0,0)");gr.addColorStop(1,"rgba(0,0,0,0)");
        mq.fillStyle=gr;mq.fillRect(0,y,w,BH)}
      q.globalCompositeOperation="destination-in";q.drawImage(mk2,0,0);put(c,x0);if(k>=1)joints.push(p+S/2)}
    // 接縫的雲霧：同一列的紙色，水平方向中間濃、兩邊淡，下半部濃一點（像山谷升起的霧）
    {const mc=document.createElement("canvas"),mw=Math.round(26*pxD);mc.width=mw;mc.height=dhc;const q=mc.getContext("2d");q.drawImage(col,0,y0,1,dhc,0,0,mw,dhc);q.globalCompositeOperation="destination-in";
      const hx=q.createLinearGradient(0,0,mw,0);hx.addColorStop(0,"rgba(0,0,0,0)");hx.addColorStop(.5,"rgba(0,0,0,.7)");hx.addColorStop(1,"rgba(0,0,0,0)");q.fillStyle=hx;q.fillRect(0,0,mw,dhc);
      const vy=q.createLinearGradient(0,0,0,dhc);vy.addColorStop(0,"rgba(0,0,0,.35)");vy.addColorStop(.45,"rgba(0,0,0,.75)");vy.addColorStop(.8,"#000");vy.addColorStop(1,"#000");q.fillStyle=vy;q.fillRect(0,0,mw,dhc);
      for(const j of joints)put(mc,Math.round(X(((j+180)%360+360)%360-180)-mw/2))}
    // 意見回饋 233：兩段主景之間（還有原圖本來就留白的地方）不能是一大片空白：補上淡淡的層層遠山、雲霧、墨點小樹，墨色取自原圖；
    // 只畫在「空白」處（透明、或接近該列紙色的地方，低解析度遮罩再模糊），不會蓋到原圖的山水
    {let s=17;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
      const ic=(()=>{const c=document.createElement("canvas");c.width=64;c.height=32;const q=c.getContext("2d");q.drawImage(P.A,0,0,64,32);const d=q.getImageData(0,0,64,32).data,a=[];
        for(let i=0;i<d.length;i+=4)a.push([d[i]*.3+d[i+1]*.59+d[i+2]*.11,d[i],d[i+1],d[i+2]]);a.sort((x,y)=>x[0]-y[0]);const n=Math.max(1,a.length*.08|0);let r=0,gg=0,b=0;for(let i=0;i<n;i++){r+=a[i][1];gg+=a[i][2];b+=a[i][3]}
        return"#"+[r,gg,b].map(v=>clamp(v/n|0,0,255).toString(16).padStart(2,"0")).join("")})();
      const sw=W>>3,shh=Math.max(8,dhc>>3),id=o.getImageData(0,0,W,dhc).data;let E0=new Float32Array(sw*shh);
      for(let y=0;y<shh;y++){const yy=Math.min(dhc-1,y*8+4),ry=clamp(Math.round(yy/dh*ih),0,ih-1),pr=P.row[ry*3],pg=P.row[ry*3+1],pb=P.row[ry*3+2];
        for(let x=0;x<sw;x++){let e=0;for(let k=0;k<4;k++){const i=(yy*W+x*8+k*2)*4,a=id[i+3]/255,dd=Math.abs(id[i]-pr)+Math.abs(id[i+1]-pg)+Math.abs(id[i+2]-pb);e+=(1-a)+a*clamp(1-(dd-10)/45,0,1)}E0[y*sw+x]=e/4}}
      for(let pass=0;pass<3;pass++){const E1=new Float32Array(sw*shh);for(let y=0;y<shh;y++)for(let x=0;x<sw;x++){let t=0,n=0;for(let dy=-2;dy<=2;dy++)for(let dx=-2;dx<=2;dx++){const yy=y+dy;if(yy<0||yy>=shh)continue;t+=E0[yy*sw+((x+dx+sw)%sw)];n++}
        const v=t/n;E1[y*sw+x]=Math.min(v,E0[y*sw+x]*.5+v*.5)}E0=E1}
      const mk=document.createElement("canvas");mk.width=sw;mk.height=shh;const mg=mk.getContext("2d"),md=mg.createImageData(sw,shh);for(let i=0;i<sw*shh;i++){md.data[i*4+3]=clamp((E0[i]-.25)/.6,0,1)*255|0}mg.putImageData(md,0,0);
      const R=document.createElement("canvas");R.width=W;R.height=dhc;const rg=R.getContext("2d");
      // 三層遠山（越遠越淡、越高），每層稜線下面淡出成雲霧；稜線用週期性的正弦和，整圈接得起來
      for(const[base,amp,a,k1,k2]of[[.5,.2,.12,5,13],[.6,.17,.2,7,17],[.72,.13,.3,9,23]]){const ph=[rnd()*9,rnd()*9,rnd()*9],pts=[];let top=dhc;
        for(let x=0;x<=W;x+=8){const t=x/W,v=Math.sin(t*TAU*k1+ph[0])*.55+Math.sin(t*TAU*k2+ph[1])*.3+Math.sin(t*TAU*k2*2+ph[2])*.15,y=dhc*(base-amp*Math.pow(clamp(v*.5+.5,0,1),1.5));pts.push([x,y]);top=Math.min(top,y)}
        const gr=rg.createLinearGradient(0,top,0,dhc*(base+.12));gr.addColorStop(0,hexA(ic,a));gr.addColorStop(.55,hexA(ic,a*.45));gr.addColorStop(1,hexA(ic,0));rg.fillStyle=gr;
        rg.beginPath();rg.moveTo(0,dhc);pts.forEach(p=>rg.lineTo(p[0],p[1]));rg.lineTo(W,dhc);rg.closePath();rg.fill();
        rg.strokeStyle=hexA(ic,a*1.1);rg.lineWidth=1.6;rg.beginPath();pts.forEach((p,i)=>i?rg.lineTo(p[0],p[1]):rg.moveTo(p[0],p[1]));rg.stroke();
        if(a>.25)for(let i=0;i<90;i++){const p=pts[rnd()*pts.length|0],h=6+rnd()*9;rg.fillStyle=hexA(ic,.45);rg.fillRect(p[0]-.8,p[1]-h,1.6,h+2);for(let j=0;j<4;j++){rg.beginPath();rg.ellipse(p[0]+(rnd()-.5)*8,p[1]-h-rnd()*7,4,2.4,0,0,TAU);rg.fill()}}}
      rg.globalCompositeOperation="destination-in";rg.imageSmoothingEnabled=true;rg.imageSmoothingQuality="high";rg.drawImage(mk,0,0,W,dhc);o.drawImage(R,0,0)}
    // 整片上下羽化進紙色：上 16%、下 26%
    o.globalCompositeOperation="destination-in";const fy=o.createLinearGradient(0,0,0,dhc);fy.addColorStop(0,"rgba(0,0,0,0)");fy.addColorStop(.16,"#000");fy.addColorStop(.74,"#000");fy.addColorStop(1,"rgba(0,0,0,0)");o.fillStyle=fy;o.fillRect(0,0,W,dhc);
    g.drawImage(off,0,y0);noise(g,W,H,6000,"120,100,70",.035);
    return{top:rgbS(P.row,0),bot:rgbS(P.row,ih-1)}}
  // 新做法的整圈長圖（pano）：整張圖原樣繞圓柱一圈（不切段、不鏡像、不拉伸），左右兩端本來就接得起來；
  // 圖寬＝貼圖寬（360 度），圖高照原圖比例；圖的上方、下方用圖最上一列、最下一列的顏色往外延伸，再漸變成整列的平均色（天空球、霧也換成這個色）
  const PANO=MOB?{W:2048,H:512,mt:32}:{W:4096,H:1024,mt:64};   // 貼圖大小、圖上方留給天空的像素
  const panoGeo=(cfg,iw,ih)=>{const ppu=PANO.W/(TAU*PAN.r),Hc=PANO.H/ppu,dhW=PANO.W*ih/iw/ppu,   // ppu＝每單位幾像素（水平、垂直一樣，圖不變形）
    top=16+PAN.r*Math.tan((cfg.hor==null?-38:cfg.hor)*PI/180)+(cfg.hz==null?.58:cfg.hz)*dhW;   // 16＝鏡頭高度；地平線放在指定的仰角
    return{Hc,cy:top+PANO.mt/ppu-Hc/2}};
  function drawPano(g,W,H,im,cfg){const iw=im.naturalWidth,ih=im.naturalHeight,dh=Math.round(W*ih/iw),y0=PANO.mt,y1=y0+dh,x0=Math.round((cfg.rot||0)/360*W);
    // 最上一列、最下一列的平均色
    const avg=y=>{try{const c=document.createElement("canvas");c.width=256;c.height=1;const q=c.getContext("2d");q.drawImage(im,0,y,iw,1,0,0,256,1);const d=q.getImageData(0,0,256,1).data;let r=0,gg=0,b=0;
      for(let i=0;i<d.length;i+=4){r+=d[i];gg+=d[i+1];b+=d[i+2]}return[r/256|0,gg/256|0,b/256|0]}catch(e){return[237,227,207]}};
    const A0=avg(0),A1=avg(ih-1),rgba=(c,a)=>`rgba(${c[0]},${c[1]},${c[2]},${a})`;g.clearRect(0,0,W,H);g.imageSmoothingEnabled=true;g.imageSmoothingQuality="high";
    for(const ox of[-W,0,W]){const x=x0+ox;if(x>=W||x+W<=0)continue;
      g.drawImage(im,0,0,iw,1,x,0,W,y0);g.drawImage(im,0,ih-1,iw,1,x,y1,W,H-y1);g.drawImage(im,0,0,iw,ih,x,y0,W,dh)}
    // 延伸的部分漸變成平均色（圓柱上下緣跟天空球同色，看不出邊）
    /* 意見回饋 421：長卷抬高後上緣露出來了，最上一列拉長的直條紋會穿幫：上方留白改成平均色，再往圖裡漸變 48 像素 */
    let gr;g.fillStyle=rgba(A0,1);g.fillRect(0,0,W,y0);gr=g.createLinearGradient(0,y0,0,y0+48);gr.addColorStop(0,rgba(A0,1));gr.addColorStop(1,rgba(A0,0));g.fillStyle=gr;g.fillRect(0,y0,W,48);
    gr=g.createLinearGradient(0,y1,0,H);gr.addColorStop(0,rgba(A1,0));gr.addColorStop(1,rgba(A1,1));g.fillStyle=gr;g.fillRect(0,y1,W,H-y1);
    const hx=c=>"#"+c.map(v=>v.toString(16).padStart(2,"0")).join(""),top=hx(A0),bot=hx(A1);
    return{top,bot}}
  // 有朝代長卷的：貼圖改成一整圈（360 度、4096 寬）；圖還沒載入前先用程式畫的山頂著
  function panTex(E,seed){let s=seed||7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647,ARC=E.userBg?TAU:PAN.arc;
    return cv(E.userBg?4096:PAN.w,PAN.h,(g,W,H)=>{const PX=d=>(d/(ARC*180/PI)+.5)*W,PY=y=>(PAN.yt-y)/(PAN.yt-PAN.yb)*H,ink=E.ink;
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

  // 「光色的倒數」：材質乘上這個顏色，陽光照到的地方＝貼圖原本的顏色（棋子、手繪桌面用）
  const neutOf=sc=>{const up=new T.Vector3(0,1,0),L=new T.Color(0,0,0);
    sc.traverse(o=>{if(o.isHemisphereLight)L.add(o.color.clone().multiplyScalar(o.intensity));else if(o.isDirectionalLight){const d=o.position.clone().normalize().dot(up);if(d>0)L.add(o.color.clone().multiplyScalar(o.intensity*d))}});
    const tg=[.97,.95,.92];return new T.Color(tg[0]/Math.max(.2,L.r),tg[1]/Math.max(.2,L.g),tg[2]/Math.max(.2,L.b))};
  // ---------- 朝代家具（桌、對手的長椅、兩側凳子、長椅兩旁的燈）：每個朝代各自的造型與材質 ----------
  // Kit：同一個材質的零件併成一個 mesh（iPhone 上 draw call 少）；tri＝方塊投影 UV（每 tri 單位一張貼圖），木紋自動順著零件的長邊
  function Kit(){const B=new Map(),base=new T.Matrix4(),o3=new T.Object3D();
    this.at=(x,y,z,ry)=>{o3.position.set(x||0,y||0,z||0);o3.rotation.set(0,ry||0,0);o3.scale.set(1,1,1);o3.updateMatrix();base.copy(o3.matrix);return this};
    this.add=(geo,mat,p,r,s,tri)=>{const g=geo.index?geo.toNonIndexed():geo.clone();if(s!=null){if(typeof s==="number")g.scale(s,s,s);else g.scale(s[0],s[1],s[2])}
      if(tri){g.computeBoundingBox();const bb=g.boundingBox,sz=[bb.max.x-bb.min.x,bb.max.y-bb.min.y,bb.max.z-bb.min.z],P=g.attributes.position,N=g.attributes.normal,uv=new Float32Array(P.count*2);
        for(let i=0;i<P.count;i++){const nx=Math.abs(N.getX(i)),ny=Math.abs(N.getY(i)),nz=Math.abs(N.getZ(i)),d=nx>ny&&nx>nz?0:ny>nz?1:2,ax=[0,1,2].filter(a=>a!==d);if(sz[ax[1]]>sz[ax[0]])ax.reverse();
          const v=[P.getX(i),P.getY(i),P.getZ(i)];uv[i*2]=v[ax[0]]/tri;uv[i*2+1]=v[ax[1]]/tri+(d*.37)}g.setAttribute("uv",new T.BufferAttribute(uv,2))}
      o3.position.set(...(p||[0,0,0]));o3.rotation.set(...(r||[0,0,0]));o3.scale.set(1,1,1);o3.updateMatrix();g.applyMatrix4(new T.Matrix4().multiplyMatrices(base,o3.matrix));
      if(!B.has(mat))B.set(mat,[]);B.get(mat).push(g);return this};
    this.build=(parent,noCast)=>{for(const[mat,gs]of B){const cat=(k,n)=>{let L=0;gs.forEach(g=>L+=g.attributes.position.count*n);const a=new Float32Array(L);let o=0;
        gs.forEach(g=>{const at=g.attributes[k];if(at)a.set(at.array,o);o+=g.attributes.position.count*n});return a};
      const G=new T.BufferGeometry();G.setAttribute("position",new T.BufferAttribute(cat("position",3),3));G.setAttribute("normal",new T.BufferAttribute(cat("normal",3),3));G.setAttribute("uv",new T.BufferAttribute(cat("uv",2),2));G.computeBoundingSphere();
      const m=new T.Mesh(G,mat);m.castShadow=!noCast;m.receiveShadow=true;parent.add(m);gs.forEach(g=>g.dispose())}B.clear()}}
  // ---- 家具貼圖 ----
  const TX=(w,h,f,rx,ry)=>{const t=cv(w,h,f);t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rx||1,ry||rx||1);return t};
  const rr=(a,b)=>a+Math.random()*(b-a);
  // 木紋（可接縫）：底色＋順著橫向的細紋；fig＝黃花梨的鬼臉旋紋；plank＝木板縫
  const grain=(g,w,h,c0,c1,o)=>{o=o||{};g.fillStyle=c0;g.fillRect(0,0,w,h);
    for(let i=0;i<(o.n||130);i++){const y=Math.random()*h,a=.05+Math.random()*(o.a||.22),ph=Math.random()*TAU,k1=1+(Math.random()*2|0),k2=5+(Math.random()*4|0),amp=2+Math.random()*(o.wav||6);
      g.strokeStyle=hexA(c1,a);g.lineWidth=.6+Math.random()*(o.lw||2.4);for(const oy of[0,-h,h]){g.beginPath();for(let x=0;x<=w;x+=8){const yy=oy+y+Math.sin(x/w*TAU*k1+ph)*amp+Math.sin(x/w*TAU*k2+ph*2)*amp*.25;x?g.lineTo(x,yy):g.moveTo(x,yy)}g.stroke()}}
    if(o.fig)for(let k=0;k<o.fig;k++){const cx=rr(60,w-60),cy=rr(30,h-30);for(let r=3;r<o.figR;r+=2.5+Math.random()*3){g.strokeStyle=hexA(c1,.1+Math.random()*.18);g.lineWidth=.8+Math.random()*1.6;g.beginPath();g.ellipse(cx,cy,r*2.4,r*.62,rr(-.1,.1),0,TAU);g.stroke()}}
    if(o.plank)for(let y=0;y<h;y+=h/o.plank){g.fillStyle="rgba(0,0,0,.45)";g.fillRect(0,y,w,3);g.fillStyle="rgba(255,255,255,.08)";g.fillRect(0,y+3,w,2)}
    noise(g,w,h,3000,"0,0,0",.07)};
  const woodT=(c0,c1,o,rep)=>TX(512,512,(g,w,h)=>grain(g,w,h,c0,c1,o),rep||1);
  const lacqT=(c0,c1)=>TX(256,256,(g,w,h)=>{g.fillStyle=c0;g.fillRect(0,0,w,h);for(let i=0;i<50;i++){g.fillStyle=hexA(c1,.025+Math.random()*.04);g.fillRect(0,Math.random()*h,w,1+Math.random()*3)}noise(g,w,h,1500,"0,0,0",.05)});
  const stT=(c,rep)=>stoneTex(c,rep||1);
  // 紋樣（以 0,0 為中心、大小 s）
  const MO={
    cloud(g,s,c){g.strokeStyle=c;g.fillStyle=c;g.lineCap="round";g.lineWidth=s*.11;g.beginPath();for(let a=0;a<TAU*1.4;a+=.2){const r=s*.05+a*s*.05,x=Math.cos(a)*r,y=Math.sin(a)*r;a?g.lineTo(x,y):g.moveTo(x,y)}g.stroke();
      g.beginPath();g.moveTo(s*.3,0);g.bezierCurveTo(s*.6,-s*.5,s*1.1,s*.4,s*1.5,-s*.15);g.stroke();g.lineWidth=s*.06;g.beginPath();g.moveTo(s*.9,s*.05);g.quadraticCurveTo(s*1.05,-s*.4,s*1.25,-s*.35);g.stroke();
      g.beginPath();g.moveTo(-s*.3,s*.1);g.quadraticCurveTo(-s*.7,s*.5,-s*1.2,s*.2);g.stroke()},
    rosette(g,s,c1,c2,c3){for(const[n,r,col,w]of[[8,s,c1,.42],[8,s*.62,c2,.4],[6,s*.32,c3||c1,.5]]){g.fillStyle=col;for(let i=0;i<n;i++){g.save();g.rotate(i/n*TAU+(r<s?PI/n:0));g.beginPath();g.ellipse(0,-r*.55,r*w,r*.5,0,0,TAU);g.fill();g.restore()}}g.fillStyle=c2;g.beginPath();g.arc(0,0,s*.14,0,TAU);g.fill()},
    lotus(g,s,c,lt,dk){const gr=g.createLinearGradient(-s*.5,0,s*.5,0);gr.addColorStop(0,lt);gr.addColorStop(.5,c);gr.addColorStop(1,dk);g.fillStyle=gr;g.beginPath();g.moveTo(0,-s);g.bezierCurveTo(s*.55,-s*.6,s*.55,s*.4,0,s*.5);g.bezierCurveTo(-s*.55,s*.4,-s*.55,-s*.6,0,-s);g.fill();
      g.strokeStyle=dk;g.lineWidth=s*.06;g.stroke();g.beginPath();g.moveTo(0,-s*.75);g.bezierCurveTo(s*.3,-s*.4,s*.3,s*.2,0,s*.3);g.bezierCurveTo(-s*.3,s*.2,-s*.3,-s*.4,0,-s*.75);g.strokeStyle=hexA("#000000",.25);g.stroke()},
    fret(g,s,c){g.strokeStyle=c;g.lineWidth=s*.13;g.lineCap="square";g.beginPath();g.moveTo(-s,s*.8);g.lineTo(-s,-s*.8);g.lineTo(s*.6,-s*.8);g.lineTo(s*.6,s*.4);g.lineTo(-s*.4,s*.4);g.lineTo(-s*.4,-s*.3);g.lineTo(s*.1,-s*.3);g.stroke();g.beginPath();g.moveTo(-s,s*.8);g.lineTo(s,s*.8);g.stroke()},
    lozenge(g,s,c){g.strokeStyle=c;g.lineWidth=s*.1;for(const k of[1,.62]){g.beginPath();g.moveTo(-s*k*1.4,0);g.lineTo(0,-s*k*.7);g.lineTo(s*k*1.4,0);g.lineTo(0,s*k*.7);g.closePath();g.stroke()}g.fillStyle=c;g.fillRect(-s*.18,-s*.09,s*.36,s*.18)},
    peony(g,s,c){g.fillStyle=c;g.strokeStyle=c;for(let i=0;i<9;i++){g.save();g.rotate(i/9*TAU);g.beginPath();g.ellipse(0,-s*.55,s*.28,s*.42,0,0,TAU);g.fill();g.restore()}
      g.fillStyle="#F6F7FA";g.beginPath();g.arc(0,0,s*.36,0,TAU);g.fill();g.fillStyle=c;g.beginPath();g.arc(0,0,s*.22,0,TAU);g.fill();g.lineWidth=s*.07;
      for(const sd of[-1,1]){g.beginPath();g.moveTo(sd*s*.9,0);g.bezierCurveTo(sd*s*1.3,-s*.6,sd*s*1.8,s*.5,sd*s*2.2,0);g.stroke();g.beginPath();g.ellipse(sd*s*1.5,-s*.25,s*.28,s*.12,sd*.6,0,TAU);g.fill()}},
    flower(g,s,c,ci){g.fillStyle=c;for(let i=0;i<5;i++){g.save();g.rotate(i/5*TAU);g.beginPath();g.ellipse(0,-s*.5,s*.3,s*.48,0,0,TAU);g.fill();g.restore()}g.fillStyle=ci;g.beginPath();g.arc(0,0,s*.25,0,TAU);g.fill()}};
  // 橫條紋樣貼圖（桌邊、裙板、凳身、屏風框）：底（fn）＋上下細線＋一排紋樣
  const bandT=(fill,o)=>TX(1024,o.h||128,(g,w,h)=>{fill(g,w,h);if(o.lines){g.fillStyle=o.lines;for(const y of o.ly||[.08,.88])g.fillRect(0,h*y,w,h*.05)}
    const n=o.n||12;for(let i=0;i<n;i++){g.save();g.translate((i+.5)*w/n,h*(o.y||.5));if(o.flip&&i%2)g.scale(-1,1);o.m(g,h*(o.s||.3),i);g.restore()}if(o.post)o.post(g,w,h)},o.rx||1,1);
  // 桌面貼圖：中間是 field，外圈一環（圓桌）或一圈（方桌）紋樣
  const topT=(fill,o)=>cv(1024,1024,(g,w,h)=>{fill(g,w,h);const c=w/2;
    if(o.round){if(o.ring)for(const[r,lw,col]of o.ring){g.strokeStyle=col;g.lineWidth=lw;g.beginPath();g.arc(c,c,r*c,0,TAU);g.stroke()}
      if(o.m){const n=o.n||24;for(let i=0;i<n;i++){const a=i/n*TAU;g.save();g.translate(c+Math.cos(a)*c*o.mr,c+Math.sin(a)*c*o.mr);g.rotate(a+PI/2);o.m(g,c*(o.s||.05),i);g.restore()}}}
    else{if(o.ring)for(const[r,lw,col]of o.ring){g.strokeStyle=col;g.lineWidth=lw;g.strokeRect(c-r*c,c-r*c,2*r*c,2*r*c)}
      if(o.m){const n=o.n||9;for(const sd of[0,1,2,3])for(let i=0;i<n;i++){const t=(i+.5)/n*2-1;g.save();g.translate(c,c);g.rotate(sd*PI/2);g.translate(t*c*o.mr*.92,c*o.mr);o.m(g,c*(o.s||.04),i);g.restore()}}}
    if(o.post)o.post(g,w,h)});
  const radial=(c0,c1)=>cv(64,64,(g,w,h)=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,c0);gr.addColorStop(.35,c1);gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,64,64)});
  const fillC=c=>(g,w,h)=>{g.fillStyle=c;g.fillRect(0,0,w,h);noise(g,w,h,1500,"0,0,0",.05)};
  // 燈罩貼圖（球、圓筒的 UV：u 繞一圈、v 由下往上）：上下緣較深、竹骨直線、正反兩面各畫一次 draw
  const lanT=(base,o)=>cv(512,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,o.edge||base);gr.addColorStop(.22,base);gr.addColorStop(.78,base);gr.addColorStop(1,o.edge||base);g.fillStyle=gr;g.fillRect(0,0,w,h);
    if(o.ribs){g.strokeStyle=o.rc;g.lineWidth=o.rw||3;g.globalAlpha=o.ra||.5;for(let i=0;i<o.ribs;i++){const x=(i+.5)*w/o.ribs;g.beginPath();g.moveTo(x,0);g.lineTo(x,h);g.stroke()}g.globalAlpha=1}
    if(o.bands)for(const[y,hh,c]of o.bands){g.fillStyle=c;g.fillRect(0,y*h,w,hh*h)}
    if(o.draw)for(const u of[.25,.75]){g.save();g.translate(u*w,h/2);o.draw(g,h);g.restore()}noise(g,w,h,1500,"0,0,0",.04)});
  const chT=(c,col,s)=>(g,h)=>{g.font=`900 ${h*s|0}px ${SERIF}`;g.textAlign="center";g.textBaseline="middle";g.fillStyle=col;g.fillText(c,0,h*.02)};

  // ---------- 平台上的樹（意見回饋 233：之前是一張平平的畫卡，幾筆粗黑墨，很醜）----------
  // 現在：立體的樹幹、樹枝（由粗到細、有樹皮紋、會受光、會投影）＋一叢叢水墨葉叢卡片（淡墨渲染打底、細筆松針／柳絲／竹葉、邊緣柔和）
  // 鏡頭只在座位上轉頭（位置不動），所以葉叢卡片建立時就轉向座位、由遠到近排好，合併成一個 mesh；卡片前後錯開，看起來有厚度
  const mixH=(a,b,t)=>"#"+new T.Color(a).lerp(new T.Color(b),t).getHexString();
  // 有粗細的彎管（樹幹、樹枝、竹竿）：沿 Catmull-Rom 曲線一圈一圈長出來
  function taperGeo(pts,r0,r1,rad){const c=new T.CatmullRomCurve3(pts),N=Math.max(6,pts.length*4),fr=c.computeFrenetFrames(N,false),L=c.getLength(),P=[],U=[],I=[];
    for(let i=0;i<=N;i++){const t=i/N,p=c.getPointAt(t),r=r0+(r1-r0)*Math.pow(t,.8),n=fr.normals[i],b=fr.binormals[i];
      for(let j=0;j<=rad;j++){const a=j/rad*TAU,cs=Math.cos(a),sn=Math.sin(a);P.push(p.x+r*(cs*n.x+sn*b.x),p.y+r*(cs*n.y+sn*b.y),p.z+r*(cs*n.z+sn*b.z));U.push(j/rad,t*L/7)}}
    for(let i=0;i<N;i++)for(let j=0;j<rad;j++){const a=i*(rad+1)+j,b=a+rad+1;I.push(a,a+1,b,b,a+1,b+1)}
    const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(P,3));g.setAttribute("uv",new T.Float32BufferAttribute(U,2));g.setIndex(I);g.computeVertexNormals();return g}
  // 樹皮：淡墨底＋乾筆直皴（斷斷續續）＋松樹的鱗紋；竹：青綠、竹節
  const barkTex=(E,kind)=>TX(256,512,(g,w,h)=>{const ink=E.ink;
    if(kind==="bamboo"){const gr=g.createLinearGradient(0,0,w,0);gr.addColorStop(0,"#56683E");gr.addColorStop(.45,"#8E9C5E");gr.addColorStop(1,"#4E5E38");g.fillStyle=gr;g.fillRect(0,0,w,h);
      for(const y of[90,346]){g.fillStyle=hexA(ink,.7);g.fillRect(0,y,w,5);g.fillStyle="rgba(240,240,200,.35)";g.fillRect(0,y+5,w,3)}noise(g,w,h,1500,"30,40,20",.1);return}
    g.fillStyle=mixH(ink,"#8E8070",.5);g.fillRect(0,0,w,h);
    for(let i=0;i<70;i++){const x=Math.random()*w;g.strokeStyle=hexA(ink,.12+Math.random()*.35);g.lineWidth=1+Math.random()*3;g.setLineDash([10+Math.random()*50,6+Math.random()*24]);g.beginPath();g.moveTo(x,0);g.bezierCurveTo(x+rr(-8,8),h*.3,x+rr(-8,8),h*.7,x+rr(-4,4),h);g.stroke()}g.setLineDash([]);
    if(kind==="pine")for(let i=0;i<60;i++){g.strokeStyle=hexA(ink,.25+Math.random()*.35);g.lineWidth=1.5+Math.random()*1.5;g.beginPath();g.ellipse(Math.random()*w,Math.random()*h,8+Math.random()*12,5+Math.random()*6,rr(-.3,.3),.2,2.9);g.stroke()}
    noise(g,w,h,3000,"255,250,240",.06)});
  // 葉叢圖集（2×2 格）：松＝扁平的松針團；柳＝下垂的柳絲；竹＝个字竹葉
  function foliageTex(E,kind,seed){let s=seed;const rnd=()=>(s=(s*16807)%2147483647)/2147483647,R=(a,b)=>a+(b-a)*rnd();
    return cv(1024,1024,(g,W,H)=>{const ink=E.ink,leaf=kind==="willow"?mixH(ink,"#6F8E44",.72):kind==="bamboo"?mixH(ink,"#3E6A40",.6):mixH(ink,"#41583A",.55);
      const wash=(x,y,rx,ry,col,a)=>{g.save();g.translate(x,y);g.scale(1,ry/rx);const gr=g.createRadialGradient(0,0,0,0,0,rx);gr.addColorStop(0,hexA(col,a));gr.addColorStop(.55,hexA(col,a*.55));gr.addColorStop(1,hexA(col,0));g.fillStyle=gr;g.beginPath();g.arc(0,0,rx,0,TAU);g.fill();g.restore()};
      for(let c=0;c<4;c++){const x0=(c%2)*512,y0=(c>>1)*512;g.save();g.beginPath();g.rect(x0,y0,512,512);g.clip();
        if(kind==="willow"){wash(x0+256,y0+120,230,90,leaf,.18);for(let k=0;k<26;k++){const sx=x0+R(40,472),sy=y0+R(10,70),L=R(300,470),sw=R(-40,40);g.strokeStyle=hexA(k%3?leaf:ink,R(.35,.7));g.lineWidth=R(1,2);
            g.beginPath();g.moveTo(sx,sy);g.bezierCurveTo(sx+sw*.2,sy+L*.35,sx+sw,sy+L*.7,sx+sw*.9,sy+L);g.stroke();
            for(let j=0;j<12;j++){const t=R(.05,1),x=sx+sw*t*.92,y=sy+L*t;g.fillStyle=hexA(leaf,R(.35,.75));g.save();g.translate(x,y);g.rotate(R(.3,.9)*(rnd()<.5?-1:1));g.beginPath();g.ellipse(0,0,R(2,3.5),R(7,12),0,0,TAU);g.fill();g.restore()}}}
        else if(kind==="bamboo"){wash(x0+256,y0+256,220,160,leaf,.16);for(let k=0;k<7;k++){const cx=x0+R(110,400),cy=y0+R(140,380),n=Math.round(R(3,5)),dir=rnd()<.5?-1:1;
            for(let j=0;j<n;j++){const a=(dir<0?PI:0)+dir*R(.2,.9)+(j-n/2)*.34*dir+R(-.15,.15),L=R(70,120),lw=R(8,13);g.fillStyle=hexA(j%2?ink:leaf,R(.55,.88));g.save();g.translate(cx,cy);g.rotate(a);g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(L*.35,-lw,L,0);g.quadraticCurveTo(L*.35,lw*.5,0,0);g.fill();g.restore()}}}
        else{// 松針團：淡墨、淡綠兩層渲染打底，上面一個個細的車輪狀小扇面（先淡後濃），底緣一道柔和的深色
          // 一團＝三到五小簇疊成的雲朵形，比較厚、邊緣柔和
          const nc=3+(rnd()*3|0),cl=[];for(let k=0;k<nc;k++)cl.push([x0+256+R(-140,140)*(k?1:.2),y0+290+R(-70,40)*(k?1:.2),R(85,130)]);cl.sort((p,q)=>p[1]-q[1]);
          for(const[cx,cy,r]of cl){wash(cx,cy,r*1.25,r*.62,leaf,.38);wash(cx+R(-10,10),cy+r*.12,r,r*.42,ink,.16)}
          for(const layer of[0,1,2])for(const[cx,cy,r]of cl){const n=layer===2?14:24;for(let k=0;k<n;k++){const u=R(-1,1),fx=cx+u*r,fy=cy+R(-.55,.25)*r*(1-Math.abs(u)*.45),len=R(.2,.34)*r,m=Math.round(R(12,18));
            g.strokeStyle=hexA(layer===2?ink:leaf,layer===0?R(.25,.45):layer===1?R(.45,.7):R(.6,.85));g.lineWidth=layer===2?R(1.1,1.7):R(1.3,2.1);
            for(let j=0;j<m;j++){const a=PI*1.04+(j/(m-1))*PI*.92+R(-.05,.05);g.beginPath();g.moveTo(fx,fy);g.lineTo(fx+Math.cos(a)*len,fy+Math.sin(a)*len*.8);g.stroke()}}}
          for(const[cx,cy,r]of cl){const gr=g.createLinearGradient(0,cy,0,cy+r*.5);gr.addColorStop(0,hexA(ink,0));gr.addColorStop(.6,hexA(ink,.18));gr.addColorStop(1,hexA(ink,0));g.fillStyle=gr;g.beginPath();g.ellipse(cx,cy+r*.25,r*.9,r*.2,0,0,TAU);g.fill()}}
        g.restore()}})}
  // 一棵樹：回傳一個 Group（樹幹 mesh＋葉叢 mesh）；base＝樹根位置，seat＝座位（卡片都轉向這裡）
  function inkTree3D(E,kind,seed,base,seat,sc0,barkM,folM){let s=seed;const rnd=()=>(s=(s*16807)%2147483647)/2147483647,R=(a,b)=>a+(b-a)*rnd();
    const K=new Kit(),f=new T.Vector3(seat.x-base.x,0,seat.z-base.z).normalize(),sd=new T.Vector3(f.z,0,-f.x),V=(a,y,d)=>base.clone().addScaledVector(sd,a*sc0).add(new T.Vector3(0,y*sc0,0)).addScaledVector(f,d*sc0);
    const cards=[],card=(p,w,h,cell,top)=>{const q=p.clone();if(top)q.y-=h/2;cards.push({p:q,w,h,cell,d:q.distanceTo(seat)})};
    const tube=(pts,r0,r1,rad)=>K.add(taperGeo(pts,r0*sc0,r1*sc0,rad||7),barkM);
    const lean=rnd()<.5?-1:1;
    if(kind==="bamboo"){for(let c=0;c<6;c++){const a0=R(-3,3),d0=R(-2.5,1.5),h=R(15,22),lx=R(-3,3)+lean*1.5,pts=[V(a0,0,d0),V(a0+lx*.2,h*.35,d0),V(a0+lx*.55,h*.7,d0+R(-.5,.5)),V(a0+lx,h,d0)];tube(pts,R(.28,.36),.12,6);
        for(let k=0;k<4;k++){const t=R(.5,1),p=new T.CatmullRomCurve3(pts).getPointAt(t);card(p.add(new T.Vector3(0,R(-.5,.5)*sc0,0)),R(5,7)*sc0,R(5,7)*sc0,(rnd()*4)|0)}}}
    else{const willow=kind==="willow",H=willow?11:15.5,tr=[V(0,0,0),V(lean*R(.4,1),H*.3,R(-.4,.4)),V(-lean*R(.2,.8),H*.6,R(-.4,.4)),V(lean*R(1,2),H*.85,0),V(lean*R(2,3.2),H,R(-.5,.5))];
      tube(tr,willow?1.5:1.35,willow?.55:.35,9);const tc=new T.CatmullRomCurve3(tr);
      const nb=willow?6:5;for(let b=0;b<nb;b++){const t=willow?R(.75,.98):.42+b*.13,p=tc.getPointAt(Math.min(.97,t)),side=b%2?1:-1,len=willow?R(4,6):R(4.5,7.5),
          e=p.clone().addScaledVector(sd,side*len*sc0).add(new T.Vector3(0,(willow?R(1.5,3.5):R(.4,2.2))*sc0,0)).addScaledVector(f,R(-2.5,2.5)*sc0),m=p.clone().lerp(e,.5).add(new T.Vector3(0,(willow?1.6:R(-.4,.8))*sc0,0));
        tube([p,m,e],willow?.5:.48,.12,6);
        if(willow){for(let k=0;k<4;k++){const q=p.clone().lerp(e,.35+k*.2).add(new T.Vector3(R(-.4,.4),0,R(-.4,.4)).multiplyScalar(sc0));card(q,R(3.5,5)*sc0,R(8,11)*sc0,(rnd()*4)|0,true)}}
        else{const w=R(6.5,8.5)*sc0;card(e.clone().add(new T.Vector3(0,.5*sc0,0)),w,w,(rnd()*4)|0);const w2=R(4.5,6)*sc0;card(p.clone().lerp(e,.55).add(new T.Vector3(0,.8*sc0,0)).addScaledVector(f,-.8*sc0),w2,w2,(rnd()*4)|0)}}
      const top=tc.getPointAt(1);if(willow){for(let k=0;k<4;k++)card(top.clone().add(new T.Vector3(R(-3,3),R(-.5,.8),R(-2,2)).multiplyScalar(sc0)),R(3.5,5)*sc0,R(8,10)*sc0,(rnd()*4)|0,true)}
      else{card(top.clone().add(new T.Vector3(0,.8*sc0,0)),9*sc0,9*sc0,(rnd()*4)|0);card(top.clone().add(new T.Vector3(0,-.6*sc0,0)).addScaledVector(sd,R(-2,2)*sc0).addScaledVector(f,1.2*sc0),6.5*sc0,6.5*sc0,(rnd()*4)|0)}}
    // 卡片：由遠到近、轉向座位；一張卡＝圖集的一格
    const o3=new T.Object3D();cards.sort((a,b)=>b.d-a.d).forEach(c=>{const g=new T.PlaneGeometry(1,1),uv=g.attributes.uv;for(let i=0;i<uv.count;i++)uv.setXY(i,(c.cell%2)*.5+uv.getX(i)*.5,.5-(c.cell>>1)*.5+uv.getY(i)*.5);
      o3.position.copy(c.p);o3.lookAt(seat);K.add(g,folM,c.p.toArray(),[o3.rotation.x,o3.rotation.y,o3.rotation.z,o3.rotation.order],[c.w,c.h,1])});
    const grp=new T.Group();K.build(grp);grp.traverse(m=>{if(m.isMesh&&m.material===folM){m.castShadow=false;m.renderOrder=1}});return grp}

  // 家具本體：EK＝朝代；X＝場景裡共用的東西（sc、M、地面高度、長椅位置、石材、鐵）
  function buildFurn(EK,E,X){const{sc,M,GY,SY,BZ,BL}=X,K=new Kit(),root=new T.Group();sc.add(root);const YS=SY+.22,flames=[];let OX=0,OZ=0;
    const mm=(map,o)=>M(0xffffff,Object.assign({map},o||{}));
    const BXG=new T.BoxGeometry(1,1,1),CYC={},cyG=n=>CYC[n]||(CYC[n]=new T.CylinderGeometry(1,1,1,n)),SPG=new T.SphereGeometry(1,16,12);
    const bx=(m,x,y,z,sx,sy,sz,r,tri)=>K.add(BXG,m,[x,y,z],r,[sx,sy,sz],tri);
    const cy=(m,x,y,z,rad,h,n,r,tri)=>K.add(cyG(n||16),m,[x,y,z],r,[rad,h,rad],tri);
    const ct=(m,x,y,z,r1,r2,h,n,r,open)=>K.add(new T.CylinderGeometry(r1,r2,h,n||16,1,!!open),m,[x,y,z],r);
    const sp=(m,x,y,z,sx,sy,sz,r)=>K.add(SPG,m,[x,y,z],r,[sx,sy==null?sx:sy,sz==null?sx:sz]);
    const la=(m,pts,n,x,z)=>K.add(new T.LatheGeometry(pts.map(p=>new T.Vector2(p[0],p[1])),n||32),m,[x||0,0,z||0]);
    const tor=(m,x,y,z,R,r,arc,rot,n)=>K.add(new T.TorusGeometry(R,r,6,n||32,arc||TAU),m,[x,y,z],rot||[PI/2,0,0]);
    const UP=new T.Vector3(0,1,0),qq=new T.Quaternion(),eu=new T.Euler();
    // 兩點之間的一根料（方料或圓料）
    const beam=(m,a,b,w,d,round,tri)=>{const A=new T.Vector3(...a),B=new T.Vector3(...b),dir=B.clone().sub(A),L=dir.length();qq.setFromUnitVectors(UP,dir.normalize());eu.setFromQuaternion(qq);
      const r=[eu.x,eu.y,eu.z,eu.order],p=A.add(B).multiplyScalar(.5).toArray();if(round)K.add(cyG(round===true?10:round),m,p,r,[w,L,w],tri);else K.add(BXG,m,p,r,[w,L,d||w],tri)};
    const roundTop=(R,th,tm,sm,bm)=>{K.add(new T.CircleGeometry(R,72),tm,[0,0,0],[-PI/2,0,0]);K.add(new T.CylinderGeometry(R,R,th,72,1,true),sm,[0,-th/2,0]);K.add(new T.CircleGeometry(R,48),bm||sm,[0,-th,0],[PI/2,0,0])};
    const sqTop=(H,th,tm,sm,tri)=>{K.add(new T.PlaneGeometry(2*H,2*H),tm,[0,0,0],[-PI/2,0,0]);bx(sm,0,-th/2-.004,0,2*H,th,2*H,null,tri)};
    const legs=(m,h,w,y0,y1,round,tri)=>{for(const a of[-1,1])for(const b of[-1,1])round?cy(m,a*h,(y0+y1)/2,b*h,w,y1-y0,round===true?12:round,null,tri):bx(m,a*h,(y0+y1)/2,b*h,w,y1-y0,w,null,tri)};
    const lit=(t,k,o)=>M(0xffffff,Object.assign({map:t,emissive:0xffffff,emissiveMap:t,emissiveIntensity:k||.55,roughness:.8},o||{}));
    const gold=()=>M(0xE2B65C,{metalness:.45,roughness:.32});
    const bronze=()=>mm(TX(256,256,(g,w,h)=>{g.fillStyle="#9A7646";g.fillRect(0,0,w,h);noise(g,w,h,3000,"40,25,10",.25);
      for(let i=0;i<36;i++){g.fillStyle=`rgba(70,${120+Math.random()*40|0},100,${.12+Math.random()*.22})`;g.beginPath();g.arc(rr(0,w),rr(0,h),rr(3,14),0,TAU);g.fill()}}),{metalness:.45,roughness:.42});
    // 火焰／燈光：幾個疊在一起的錐體（加色混合）＋一團柔光；tick 裡跳動
    const fo=new T.MeshBasicMaterial({color:0xFF7A22,transparent:true,opacity:.85,depthWrite:false,toneMapped:false,blending:T.AdditiveBlending}),fi=new T.MeshBasicMaterial({color:0xFFE08A,toneMapped:false});
    let glowTex=null;const glow=(x,y,z,s,op,kind)=>{glowTex=glowTex||radial("rgba(255,226,160,1)","rgba(255,160,70,.35)");
      const g=new T.Sprite(new T.SpriteMaterial({map:glowTex,transparent:true,opacity:op||.6,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false,fog:false}));g.position.set(OX+x,y,OZ+z);g.scale.setScalar(s);root.add(g);flames.push({o:g,s,ph:Math.random()*9,k:kind||0});return g};
    const fire=(x,y,z,s)=>{const G=new T.Group();G.position.set(OX+x,y,OZ+z);root.add(G);const cone=new T.ConeGeometry(1,1,10);
      [[0,0,0,.42,1.5,fi],[.25,0,.1,.45,1.2,fo],[-.25,0,-.12,.42,1.35,fo],[0,0,.25,.5,1.0,fo],[.05,0,-.3,.4,1.1,fo]].forEach(([dx,dy,dz,r,h,m],i)=>{const c=new T.Mesh(cone,m);c.position.set(dx*s,(dy+h/2)*s,dz*s);c.scale.set(r*s,h*s,r*s);c.renderOrder=2;G.add(c);flames.push({o:c,s:h*s,y0:c.position.y,ph:i*1.7,k:2})});
      glow(x,y+s*.7,z,s*5,.75,1)};
    const F={};
    // ---- 經典：灰色花崗岩圓桌、石凳；公園木條長椅；紅紙燈籠 ----
    /* 11/10 經典世界（千秋時光之苑，Gemini 72＋史學顧問）：原本是鐵架公園長椅＋紅紙「福」字燈籠，跟紙墨世界不搭——
       改成素木長榻＋宣紙小屏風、白玉鼓凳、素木燈柱吊竹骨宣紙燈（不寫字，白天只微微透暖光）；桌子照舊 */
    F.classic=()=>{const st=X.stone,s2=X.stone2,pl=mm(woodT("#B48C5E","#7C5A36",{n:90},1),{roughness:.7}),dk=mm(woodT("#8A6640","#5A3E22",{n:60},1),{roughness:.7}),
      jade=M(0xE8EDE6,{roughness:.3}),jade2=M(0xD6DED6,{roughness:.35}),paper=M(0xF2E8CC,{roughness:.95}),
      lan=lit(lanT("#F3E6C2",{edge:"#B89A66",ribs:12,rc:"#9C7C4C"}),.45,{roughness:.8}),gd=gold();
      return{frame:0x7C5A36,
        table(){roundTop(8.2,.9,st,st);tor(st,0,-.04,0,8.1,.18,TAU,null,96);ct(s2,0,GY+9-.9,0,2.3,3.2,18,40);ct(s2,0,GY+.6,0,4.2,4.6,1.2,40);tor(s2,0,-1.9,0,2.36,.22,TAU,null,40);tor(s2,0,GY+1.35,0,3.2,.25,TAU,null,40)},
        bench(){bx(pl,0,SY-.25,BZ,BL,.5,4.6);bx(dk,0,SY-.62,BZ,BL-.4,.25,4.2);
          for(const x of[-BL/2+.5,BL/2-.5])for(const z of[BZ-1.9,BZ+1.9])bx(dk,x,(SY-.5+GY)/2,z,.55,SY-.5-GY,.55);
          const zs=BZ-2.45,H=5.6;for(const x of[-BL/2+.25,-BL/6,BL/6,BL/2-.25])bx(dk,x,SY+H/2,zs,.35,H,.35);
          bx(dk,0,SY+H,zs,BL+.2,.35,.45);bx(dk,0,SY+.25,zs,BL,.3,.4);bx(paper,0,SY+H/2+.1,zs,BL-.5,H-.6,.08)},
        stool(){ct(jade,0,GY+13.3,0,2.3,2.3,1.2,36);ct(jade2,0,GY+6.6,0,2.0,2.4,12.2,36);for(const y of[GY+11.6,GY+1.6])tor(jade,0,y,0,2.25,.18,TAU,null,32)},
        lamp(sx){const px=sx*1.9,Y=-4.6;cy(dk,px,(GY+Y+2.6)/2,0,.25,Y+2.6-GY,8);ct(dk,px,GY+.4,0,.55,.8,.8,8);bx(dk,px/2,Y+2.0,0,2.4,.22,.22);
          cy(dk,0,Y+1.5,0,.05,.6,6);cy(lan,0,Y,0,1.0,2.4,6);for(const y of[Y+1.25,Y-1.25])cy(pl,0,y,0,1.08,.18,6);cy(dk,0,Y+1.5,0,.6,.22,6);
          cy(M(0xC2504A,{roughness:.8}),0,Y-1.9,0,.07,.9,6);glow(0,Y,0,3.4,.28)}}};
    // ---- 秦：黑漆朱邊、青銅飾件；青銅豆形燈 ----
    F.qin=()=>{const RD="#A8281C",bk=mm(lacqT("#15110F","#3A2A22"),{roughness:.28}),bz=bronze(),
      top=mm(topT(g=>{g.fillStyle="#15110F";g.fillRect(0,0,1024,1024);noise(g,1024,1024,3000,"60,40,30",.08)},{ring:[[.965,16,RD],[.9,5,RD]],m:(g,s)=>MO.lozenge(g,s,RD),n:9,mr:.932,s:.026}),{roughness:.25}),
      side=mm(bandT(fillC("#15110F"),{lines:RD,m:(g,s)=>MO.lozenge(g,s,RD),n:14,s:.28}),{roughness:.3}),
      scr=mm(cv(512,512,(g,w,h)=>{g.fillStyle="#15110F";g.fillRect(0,0,w,h);g.strokeStyle=RD;g.lineWidth=14;g.strokeRect(14,14,w-28,h-28);g.lineWidth=4;g.strokeRect(36,36,w-72,h-72);
        for(let y=0;y<5;y++)for(let x=0;x<4;x++){g.save();g.translate(90+x*111,92+y*82);MO.lozenge(g,26,y%2?"#C8A050":RD);g.restore()}noise(g,w,h,2000,"0,0,0",.06)}),{roughness:.3});
      return{frame:0x7A2216,
        table(){sqTop(7.9,1.0,top,side);bx(side,0,-1.6,0,15.2,1.2,15.2);
          for(const a of[-1,1])for(const b of[-1,1]){bx(bk,a*7,(GY+.9-2.2)/2,b*7,1.1,-2.2-GY-.9,1.1,null,4);ct(bz,a*7,GY+.5,b*7,.62,.85,1.0,12);cy(bz,a*7,-6,b*7,.7,.35,12);bx(bz,a*7.86,-.5,b*7.86,.5,1.12,.5)}
          for(const s of[-1,1]){bx(bk,0,GY+4,s*7,13,.6,.6,null,4);bx(bk,s*7,GY+4,0,.6,.6,13,null,4)}},
        bench(){bx(bk,0,YS-.6,BZ,13.4,1.2,5.0,null,4);bx(side,0,YS-1.65,BZ+2.35,13.0,.9,.3);bx(side,0,YS-1.65,BZ-2.35,13.0,.9,.3);
          for(const a of[-1,1])for(const b of[-1,1]){bx(bk,a*6.1,(GY+YS-1.2)/2,BZ+b*2.0,.9,YS-1.2-GY,.9,null,4);ct(bz,a*6.1,GY+.45,BZ+b*2.0,.55,.75,.9,12);bx(bz,a*6.7,YS-.3,BZ+b*2.5,.4,.66,.4)}
          bx(bk,0,YS+3.7,BZ-2.7,12.4,7.4,.45,null,4);bx(scr,0,YS+3.7,BZ-2.45,11.4,6.6,.06);bx(bz,0,YS+7.5,BZ-2.7,12.6,.25,.6);
          for(const a of[-1,1]){bx(bz,a*6.2,YS+.3,BZ-2.7,.6,.6,.7);bx(bz,a*6.2,YS+7.2,BZ-2.7,.6,.6,.7)}},
        stool(){bx(bk,0,(GY-5.6)/2,0,3.0,13.4,3.0,null,4);bx(side,0,-6.5,0,3.12,1.0,3.12);bx(side,0,GY+1.0,0,3.12,1.0,3.12);bx(bk,0,-5.3,0,3.6,.6,3.6,null,4);
          for(const a of[-1,1])for(const b of[-1,1])bx(bz,a*1.72,-5.3,b*1.72,.36,.7,.36)},
        lamp(){const d=1.8;la(bz,[[0,GY],[2.0,GY],[1.9,GY+.4],[1.1,GY+1.2],[.45,GY+2.4],[.32,GY+3],[0,GY+3]],24);cy(bz,0,(GY+3-7.6+d)/2,0,.26,-7.6+d-GY-3,10);
          for(const y of[GY+6,GY+10,-8.1+d])cy(bz,0,y,0,.45,.28,12);
          la(bz,[[0,-7.7],[.7,-7.7],[.35,-7.35],[.3,-6.9],[1.5,-6.55],[1.6,-6.2],[1.35,-6.22],[0,-6.4]].map(([r,y])=>[r,y+d]),24);fire(0,-6.35+d,0,.75)}}};
    // ---- 漢：朱黑漆、雲氣紋；長信宮燈 ----
    F.han=()=>{const V="#B0301E",BK="#1A1210",bk=mm(lacqT(BK,"#4A2A20"),{roughness:.28}),ver=mm(lacqT(V,"#E06040"),{roughness:.3}),gd=gold(),
      cl=c=>(g,s,i)=>{g.scale(i%2?-1:1,1);MO.cloud(g,s,c)},
      side=mm(bandT(fillC(V),{lines:BK,m:cl(BK),n:10,s:.24}),{roughness:.3}),sideB=mm(bandT(fillC(BK),{lines:V,m:cl(V),n:10,s:.24}),{roughness:.3}),
      top=mm(topT(fillC(BK),{round:1,ring:[[.912,46,V],[.86,4,V],[.968,4,"#C9A050"]],m:cl(BK),n:20,mr:.912,s:.026}),{roughness:.25}),
      pan=mm(cv(512,512,(g,w,h)=>{fillC(BK)(g,w,h);g.strokeStyle=V;g.lineWidth=16;g.strokeRect(10,10,w-20,h-20);for(let y=0;y<4;y++)for(let x=0;x<3;x++){g.save();g.translate(110+x*150+(y%2)*40,80+y*115);g.scale(y%2?-1:1,1);MO.cloud(g,46,V);g.restore()}}),{roughness:.3}),
      mat=mm(TX(256,256,(g,w,h)=>{g.fillStyle="#C9AE7A";g.fillRect(0,0,w,h);for(let y=0;y<h;y+=8)for(let x=(y/8%2)*8;x<w;x+=16){g.fillStyle="rgba(90,60,30,.35)";g.fillRect(x,y,8,7)}},6),{roughness:.9});
      return{frame:0x1E1210,
        table(){roundTop(8.2,.9,top,sideB,bk);la(bk,[[0,GY+1.1],[3.6,GY+1.1],[3.6,GY+1.9],[3.2,GY+2.2],[1.6,GY+3.2],[1.3,GY+6],[1.25,GY+12],[1.5,GY+15.5],[2.6,GY+17.3],[3.2,GY+18.1],[0,GY+18.1]],40);
          for(const y of[GY+2.0,GY+3.4,GY+15.6,GY+17.5])tor(ver,0,y,0,y<GY+3?3.45:y<GY+4?1.6:y<GY+16?1.55:2.9,.12,TAU,null,40);
          for(let i=0;i<3;i++){const a=i/3*TAU+PI/6,x=Math.sin(a)*3.1,z=Math.cos(a)*3.1;sp(gd,x,GY+.55,z,.8,.6,.8);sp(gd,x*1.12,GY+1.0,z*1.12,.42)}},
        bench(){bx(bk,0,YS-.7,BZ,13.4,1.4,5.0,null,4);bx(side,0,YS-.75,BZ+2.52,13.4,1.1,.06);bx(mat,0,YS+.07,BZ+.15,12.6,.14,4.4);bx(ver,0,YS+.02,BZ+2.45,13.5,.14,.2);
          for(const a of[-1,1])for(const b of[-1,1]){bx(bk,a*6.0,(GY+YS-1.4)/2,BZ+b*1.9,.9,YS-1.4-GY,.9,null,4);sp(gd,a*6.0,GY+.4,BZ+b*1.9,.7,.45,.7)}
          bx(bk,0,YS+3.7,BZ-2.65,12.8,7.4,.4,null,4);bx(pan,0,YS+3.7,BZ-2.42,11.8,6.6,.06);},
        stool(){ct(bk,0,GY+6.7,0,1.9,2.2,13.4,28);K.add(new T.CylinderGeometry(1.99,1.99,1.4,32,1,true),side,[0,-7.0,0]);K.add(new T.CylinderGeometry(2.17,2.17,1.0,32,1,true),side,[0,GY+1.2,0]);ct(ver,0,-5.3,0,2.25,2.05,.6,32);tor(gd,0,-5.62,0,2.08,.07,TAU,null,32)},
        lamp(sx){const lx=-sx*1.0,d=3.6;bx(bk,0,(GY+d-10)/2,0,2.6,-10+d-GY+.2,2.6,null,4);bx(sideB,0,-10.8+d,0,2.7,.9,2.7);
          cy(gd,0,(-9.85+d),0,1.15,.3,20);la(gd,[[0,(-9.7+d)],[1.25,(-9.7+d)],[1.15,(-8.9+d)],[.85,(-8.0+d)],[.55,(-7.2+d)],[.46,(-6.9+d)],[0,(-6.9+d)]],20);sp(gd,0,(-6.35+d),0,.52,.6,.52);sp(gd,0,(-5.85+d),-.25,.26);
          cy(gd,lx,(-7.9+d),.35,.8,1.2,16);ct(gd,lx,(-7.15+d),.35,.38,.82,.35,16);beam(gd,[-lx*.25,(-7.1+d),0],[lx,(-6.95+d),.35],.18,0,10);beam(gd,[sx*.2,(-7.9+d),.15],[lx*.6,(-8.4+d),.35],.16,0,10);
          bx(lit(cv(16,16,g=>{g.fillStyle="#FFC874";g.fillRect(0,0,16,16)}),1.4),lx,(-7.9+d),1.12,.75,.62,.06);glow(lx,(-7.9+d),.6,3.4,.6)}}};
    // ---- 三國：行軍帳的粗木、鐵箍、皮革；火盆 ----
    F.sanguo=()=>{const dw=mm(woodT("#3A2A1E","#120A06",{n:120,a:.3,lw:3}),{roughness:.85}),ir=X.iron,
      pk=mm(topT(g=>grain(g,1024,1024,"#45311F","#140C07",{n:220,a:.3,plank:7,wav:4}),{round:1,ring:[[.985,20,"#1C1A18"]]}),{roughness:.85}),
      le=mm(TX(256,256,(g,w,h)=>{g.fillStyle="#6B4428";g.fillRect(0,0,w,h);noise(g,w,h,5000,"30,15,5",.2);noise(g,w,h,2000,"255,220,180",.06);for(let i=0;i<20;i++){g.strokeStyle="rgba(40,20,8,.25)";g.lineWidth=1;g.beginPath();g.moveTo(rr(0,w),rr(0,h));g.quadraticCurveTo(rr(0,w),rr(0,h),rr(0,w),rr(0,h));g.stroke()}},2),{roughness:.7}),
      coal=M(0x3A1408,{emissive:0xFF4A10,emissiveIntensity:.9,roughness:.9});
      return{frame:0x3A2A1E,
        table(){roundTop(8.2,.9,pk,dw);for(const y of[-.16,-.74])tor(ir,0,y,0,8.23,.08,TAU,null,96);for(let i=0;i<24;i++){const a=i/24*TAU;sp(ir,Math.sin(a)*8.27,-.45,Math.cos(a)*8.27,.13)}
          cy(ir,0,-1.5,0,1.3,.9,12);bx(dw,0,-1.35,0,9,.8,1.0,[0,PI/4,0],4);bx(dw,0,-1.35,0,9,.8,1.0,[0,-PI/4,0],4);
          const P=[];for(let i=0;i<4;i++){const a=PI/4+i*PI/2,t=[Math.sin(a)*2.6,-1.6,Math.cos(a)*2.6],b=[Math.sin(a)*6.2,GY,Math.cos(a)*6.2];beam(dw,t,b,.55,0,8,4);P.push([Math.sin(a)*4.6,-11,Math.cos(a)*4.6]);tor(ir,Math.sin(a)*3.0,-3.4,Math.cos(a)*3.0,.6,.08,TAU,[PI/2,0,0],12)}
          for(let i=0;i<4;i++)beam(dw,P[i],P[(i+1)%4],.3,0,8,4)},
        bench(){bx(dw,0,YS-.45,BZ,13.2,.9,4.6,null,5);for(const x of[-5,5]){beam(dw,[x,GY,BZ-2.1],[x,YS-.9,BZ+1.9],.45,0,8,4);beam(dw,[x,GY,BZ+2.1],[x,YS-.9,BZ-1.9],.45,0,8,4);cy(ir,x,(GY+YS-.9)/2,BZ,.3,.9,8,[0,0,PI/2])}
          bx(le,0,YS+.04,BZ+.3,11,.1,4.2);bx(le,0,YS-.75,BZ+2.36,11,1.5,.08);
          for(const x of[-6.1,6.1]){beam(dw,[x,GY,BZ-2.5],[x,YS+6.6,BZ-3.0],.5,0,8,4);sp(ir,x,YS+6.7,BZ-3.0,.32)}for(const y of[YS+1.4,YS+6.0])cy(dw,0,y,BZ-2.85,.28,12.4,8,[0,0,PI/2],4);
          bx(le,0,YS+3.7,BZ-2.75,11,4.2,.1,[-.06,0,0]);for(let i=0;i<9;i++){const x=-5+i*1.25;cy(ir,x,YS+5.85,BZ-2.6,.06,.5,4);cy(ir,x,YS+1.55,BZ-2.6,.06,.5,4)}},
        stool(){for(const x of[-1.6,1.6]){beam(dw,[x,GY,-1.8],[x,-5.4,1.8],.26,0,8);beam(dw,[x,GY,1.8],[x,-5.4,-1.8],.26,0,8);cy(ir,x,(GY-5.4)/2,0,.22,.5,8,[0,0,PI/2])}
          for(const z of[-1.8,1.8]){cy(dw,0,-5.4,z,.2,3.6,8,[0,0,PI/2]);cy(dw,0,GY+.2,z,.18,3.6,8,[0,0,PI/2])}bx(le,0,-5.5,0,3.3,.08,3.4)},
        lamp(){for(let i=0;i<3;i++){const a=i/3*TAU+.3;beam(ir,[Math.sin(a)*2.3,GY,Math.cos(a)*2.3],[Math.sin(a)*1.0,(-8.3+2),Math.cos(a)*1.0],.15,0,6)}tor(ir,0,GY+6,0,1.75,.08,TAU,null,20);
          la(ir,[[0,(-8.7+2)],[.6,(-8.7+2)],[1.35,(-8.2+2)],[1.75,(-7.3+2)],[1.9,(-7.15+2)],[1.7,(-7.15+2)],[0,(-7.6+2)]],20);for(let i=0;i<8;i++){const a=i/8*TAU;sp(ir,Math.sin(a)*1.84,(-7.3+2),Math.cos(a)*1.84,.12)}
          cy(coal,0,(-7.35+2),0,1.55,.22,14);fire(0,(-7.3+2),0,1.25)}}};
    // ---- 魏晉：竹榻、竹凳、竹桌；畫著水墨竹的紙燈籠 ----
    F.weijin=()=>{const bam=mm(TX(256,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,"#AFA65A");gr.addColorStop(.5,"#CFC47C");gr.addColorStop(1,"#A39850");g.fillStyle=gr;g.fillRect(0,0,w,h);
        for(let i=0;i<60;i++){g.fillStyle=`rgba(90,80,30,${rr(.05,.15)})`;g.fillRect(0,rr(0,h),w,1)}for(const x of[60,188]){g.fillStyle="rgba(70,60,20,.6)";g.fillRect(x,0,6,h);g.fillStyle="rgba(255,250,210,.4)";g.fillRect(x+6,0,3,h)}noise(g,w,h,1200,"60,50,10",.08)}),{roughness:.5}),
      slat=mm(topT((g,w,h)=>{for(let y=0;y<h;y+=34){g.fillStyle=(y/34)%2?"#C2B56C":"#B5A85E";g.fillRect(0,y,w,34);g.fillStyle="rgba(60,50,15,.5)";g.fillRect(0,y,w,3);for(let k=0;k<3;k++){g.fillStyle="rgba(80,70,20,.45)";g.fillRect(rr(0,w),y+3,5,31)}}noise(g,w,h,6000,"60,50,10",.08)},{round:1,ring:[[.985,22,"#6E5A2C"],[.955,6,"#6E5A2C"]]}),{roughness:.55}),
      rat=mm(bandT(fillC("#9C8448"),{n:1,m:()=>{},post:(g,w,h)=>{g.strokeStyle="rgba(60,45,15,.6)";g.lineWidth=3;for(let x=-h;x<w;x+=10){g.beginPath();g.moveTo(x,0);g.lineTo(x+h,h);g.stroke()}}}),{roughness:.7}),
      paper=lit(lanT("#F3E0B8",{edge:"#C9AE78",draw:(g,h)=>{g.strokeStyle="rgba(30,40,28,.85)";g.fillStyle="rgba(30,40,28,.8)";g.lineCap="round";
        for(const[x,lw]of[[-30,7],[18,5]]){g.lineWidth=lw;for(let y=h*.9;y>h*.1;y-=34){g.beginPath();g.moveTo(x,y-h/2);g.lineTo(x+2,y-30-h/2);g.stroke()}}
        for(let k=0;k<11;k++){g.save();g.translate(rr(-50,60),rr(-h*.4,h*.1));g.rotate(rr(-1.2,1.2)+(k%2?PI:0));g.beginPath();g.moveTo(0,0);g.quadraticCurveTo(18,-6,44,0);g.quadraticCurveTo(18,5,0,0);g.fill();g.restore()}}}),.6),dk=M(0x5A4A26,{roughness:.6});
      const tube=(x0,y0,z0,x1,y1,z1,r)=>beam(bam,[x0,y0,z0],[x1,y1,z1],r,0,10,6);
      return{frame:0x6E5A2C,
        table(){roundTop(8.2,.7,slat,rat);tor(bam,0,-1.0,0,7.3,.36,TAU,null,48);tor(bam,0,GY+5,0,5.95,.3,TAU,null,40);
          for(const a of[-1,1])for(const b of[-1,1]){tube(a*4.2,GY,b*4.2,a*4.2,-.7,b*4.2,.55);tube(a*5.0,GY,b*3.3,a*5.0,-.7,b*3.3,.3);tube(a*4.2,-1.0,b*4.2,a*5.15,-1.0,b*5.15,.25)}},
        bench(){for(const z of[BZ+2.2,BZ-2.2])tube(-6.6,YS-.35,z,6.6,YS-.35,z,.4);for(const x of[-6.4,6.4])tube(x,YS-.35,BZ-2.4,x,YS-.35,BZ+2.4,.36);
          for(let i=0;i<9;i++)bx(bam,0,YS-.06,BZ-2+i*.5,13,.16,.42,null,6);
          for(const x of[-6.4,0,6.4])for(const z of[BZ+2.1,BZ-2.1])tube(x,GY,z,x,YS-.3,z,.42);for(const z of[BZ+2.1,BZ-2.1])tube(-6.4,GY+3,z,6.4,GY+3,z,.26);
          for(const x of[-6.4,6.4]){tube(x,YS,BZ-2.4,x,YS+6.8,BZ-2.9,.4);tube(x,YS+2.8,BZ-2.3,x,YS+2.8,BZ+2.2,.3);tube(x,YS-.3,BZ+2.1,x,YS+2.9,BZ+2.1,.3)}
          for(const y of[YS+6.4,YS+4.0,YS+1.5])tube(-6.8,y,BZ-2.4-(y-YS)*.07,6.8,y,BZ-2.4-(y-YS)*.07,y>YS+6?.36:.26);
          for(let i=-5;i<=5;i++)tube(i*1.1,YS+1.5,BZ-2.5,i*1.1,YS+4.0,BZ-2.68,.13)},
        stool(){for(let i=0;i<9;i++){const a=i/9*TAU;tube(Math.sin(a)*1.7,GY,Math.cos(a)*1.7,Math.sin(a)*1.7,-5.5,Math.cos(a)*1.7,.36)}tor(bam,0,-6.2,0,1.78,.18,TAU,null,24);tor(bam,0,GY+.8,0,1.78,.18,TAU,null,24);
          K.add(new T.CircleGeometry(2.25,32),slat,[0,-5.0,0],[-PI/2,0,0]);ct(rat,0,-5.25,0,2.25,2.2,.5,32,null,true)},
        lamp(sx){const px=sx*2.0,Y=-3.6;tube(px,GY,0,px,Y+3.6,0,.34);tube(px,Y+3.2,0,0,Y+3.0,0,.22);cy(dk,0,Y+2.2,0,.04,1.6,4);
          cy(paper,0,Y,0,1.15,2.8,16);for(const y of[Y+1.43,Y-1.43])cy(dk,0,y,0,1.21,.16,16);cy(dk,0,Y+1.7,0,.42,.42,12);cy(dk,0,Y-2.2,0,.08,1.2,4);glow(0,Y,0,4.6,.55)}}};
    // ---- 南北朝：佛教石刻，蓮瓣石桌、蓮座石凳；石燈幢 ----
    F.nanbei=()=>{const SS="#A89276",st=mm(stT(SS,1),{roughness:.85}),s2=mm(stT("#8E7A62",1),{roughness:.9}),
      lo=(g,s)=>MO.lotus(g,s,"#B39C7E","#D8C6A8","#6E5A44"),
      top=mm(topT(g=>{g.fillStyle=SS;g.fillRect(0,0,1024,1024);noise(g,1024,1024,14000,"255,255,255",.1);noise(g,1024,1024,14000,"0,0,0",.12)},{round:1,ring:[[.985,10,"#6E5A44"],[.83,6,"#6E5A44"]],m:lo,n:28,mr:.905,s:.065}),{roughness:.85}),
      band=mm(bandT(g=>{g.fillStyle=SS;g.fillRect(0,0,1024,128);noise(g,1024,128,4000,"0,0,0",.12)},{lines:"#6E5A44",ly:[.0,.92],m:lo,n:16,s:.38,y:.55}),{roughness:.85}),
      wins=(g,w,h,c)=>{g.fillStyle=c;for(let k=0;k<4;k++){const x=(k*2+.5)/8*w;g.beginPath();g.moveTo(x-10,h*.85);g.lineTo(x-10,h*.4);g.quadraticCurveTo(x,h*.12,x+10,h*.4);g.lineTo(x+10,h*.85);g.fill()}},
      win=cv(256,128,(g,w,h)=>{g.fillStyle=SS;g.fillRect(0,0,w,h);noise(g,w,h,3000,"0,0,0",.15);wins(g,w,h,"#FFD27A")}),mask=cv(256,128,(g,w,h)=>{g.fillStyle="#000";g.fillRect(0,0,w,h);wins(g,w,h,"#FFE0A0")}),
      chamber=M(0xffffff,{map:win,emissive:0xffffff,emissiveMap:mask,emissiveIntensity:1.3,roughness:.85});
      const petals=(m,n,R,y,w,h,t,tilt,cz)=>{for(let i=0;i<n;i++){const a=(i+.5)/n*TAU;sp(m,Math.sin(a)*R,y,(cz||0)+Math.cos(a)*R,w,h,t,[tilt,a,0,"YXZ"])}};   /* cz：花瓣圈中心的 z（意見回饋 524） */
      return{frame:0x6B4A2E,
        table(){roundTop(8.2,1.0,top,band,s2);la(s2,[[0,GY],[4.4,GY],[4.4,GY+1.2],[3.6,GY+1.4],[3.0,GY+2.4],[1.9,GY+3.4],[1.6,GY+9],[1.6,GY+13],[2.2,GY+15.5],[3.0,GY+16.8],[3.4,GY+18],[0,GY+18]],8);
          petals(st,16,2.75,-2.9,.8,1.6,.38,.55);petals(st,16,3.1,GY+2.4,.85,1.5,.38,-.85);tor(st,0,GY+9.5,0,1.7,.22,TAU,null,24);tor(st,0,GY+12.5,0,1.7,.22,TAU,null,24)},
        bench(){bx(st,0,YS-.5,BZ,13.4,1.0,4.9,null,8);for(const x of[-4.8,4.8]){bx(s2,x,(GY+YS-1)/2,BZ,2.4,YS-1-GY,4.0,null,8);bx(band,x,YS-2.3,BZ,2.5,1.4,4.1);bx(band,x,GY+1.0,BZ,2.7,1.6,4.3)}
          bx(st,0,YS+2.9,BZ-2.35,12.6,5.8,.8,[-.06,0,0],8);bx(band,0,YS+5.2,BZ-1.98,12.6,1.3,.08,[-.06,0,0]);tor(st,0,YS+5.9,BZ-2.4,2.5,.38,PI,[0,0,0],24);sp(st,0,YS+8.6,BZ-2.4,.45,.7,.45);petals(st,8,.5,YS+8.1,.28,.5,.15,.6,BZ-2.4)}   /* 意見回饋 524：靠背頂上那圈蓮瓣少了 z，跑到石桌正中間上方浮著 */,
        stool(){ct(s2,0,GY+6.5,0,1.6,2.1,13,24);petals(st,12,1.75,-6.1,.62,1.15,.3,.6);petals(st,12,2.1,GY+1.2,.65,1.1,.3,-.85);ct(st,0,-5.3,0,2.15,1.95,.6,24)},
        lamp(){const Y=-4.4;la(s2,[[0,GY],[2.3,GY],[2.3,GY+1.0],[1.7,GY+1.3],[0,GY+1.3]],8);petals(st,8,1.35,GY+1.7,.55,.9,.3,-.85);cy(st,0,(GY+1.6+Y-2.3)/2,0,.5,Y-2.3-GY-1.6,8);
          tor(st,0,GY+7,0,.55,.12,TAU,null,8);la(st,[[0,Y-2.4],[.6,Y-2.4],[1.5,Y-1.6],[1.65,Y-1.3],[0,Y-1.3]],8);petals(st,8,1.25,Y-1.9,.5,.8,.25,.6);
          K.add(new T.CylinderGeometry(1.05,1.05,2.3,8),chamber,[0,Y,0]);ct(st,0,Y+1.25,0,1.6,1.7,.25,8);ct(st,0,Y+1.85,0,.25,2.25,1.0,8);ct(st,0,Y+1.35,0,2.25,2.3,.18,8);
          for(let i=0;i<5;i++)cy(st,0,Y+2.55+i*.36,0,.48-.07*i,.2,8);sp(st,0,Y+4.5,0,.32,.42,.32);glow(0,Y,0,3.6,.5)}}};
    // ---- 隋：實用的上漆木作；運河船燈 ----
    F.sui=()=>{const LAC="#46201A",BLK="#1A120E",lac=mm(lacqT(LAC,"#6A3424"),{roughness:.38}),blk=mm(lacqT(BLK,"#3A2A20"),{roughness:.3}),br=M(0xB89050,{metalness:.4,roughness:.4}),
      top=mm(topT(fillC(LAC),{ring:[[.975,22,BLK],[.93,4,"#C9A050"]]}),{roughness:.3}),wd=mm(woodT("#3A281C","#120A06",{n:90}),{roughness:.7}),
      paper=lit(lanT("#EBD9A8",{edge:"#B8925A",ribs:18,rc:"#8A6A3A",bands:[[.14,.06,"#A8281C"],[.8,.06,"#A8281C"]],draw:chT("隋","#2A1A10",.36)}),.6),red=M(0xA8281C,{roughness:.8,side:T.DoubleSide});
      return{frame:0x4A1C12,
        table(){sqTop(7.8,.8,top,blk);bx(lac,0,-1.4,0,14.8,1.1,14.8,null,4);legs(lac,7.0,1.0,GY,-.8,false,4);for(const s of[-1,1]){bx(blk,0,GY+3,s*7,14,.5,.5,null,4);bx(blk,s*7,GY+3,0,.5,.5,14,null,4)}
          for(const a of[-1,1])for(const b of[-1,1])bx(br,a*7.4,-1.3,b*7.4,.5,1.0,.5)},
        bench(){for(let i=0;i<3;i++)bx(lac,0,YS-.25,BZ+1.55-i*1.55,13.2,.5,1.45,null,6);for(const z of[BZ+2.2,BZ-2.2])bx(blk,0,YS-.8,z,13,.6,.4,null,4);
          for(const x of[-6.2,0,6.2])for(const z of[BZ+1.9,BZ-1.9])bx(lac,x,(GY+YS-.5)/2,z,.8,YS-.5-GY,.8,null,4);for(const z of[BZ+1.9,BZ-1.9])bx(blk,0,GY+3,z,12.4,.4,.4,null,4);
          for(const x of[-6.2,6.2])bx(lac,x,YS+3.2,BZ-2.3,.7,6.4,.7,null,4);bx(blk,0,YS+6.4,BZ-2.3,13.6,.6,.8,null,4);bx(blk,0,YS+2.0,BZ-2.3,12.4,.4,.5,null,4);
          for(let i=-5;i<=5;i++)bx(lac,i*1.05,YS+4.2,BZ-2.3,.3,4.2,.3,null,4)},
        stool(){bx(lac,0,-5.35,0,3.6,.5,3.6,null,4);legs(lac,1.4,.5,GY,-5.6,false,4);for(const s of[-1,1]){bx(blk,0,GY+3,s*1.4,2.8,.3,.3);bx(blk,s*1.4,GY+3,0,.3,.3,2.8)}},
        lamp(sx){const px=sx*2.0,Y=-4.4;cy(wd,px,(GY+Y+4.2)/2,0,.3,Y+4.2-GY,8,null,4);beam(wd,[px,Y+3.4,0],[-sx*.3,Y+2.9,0],.22,0,8,4);beam(wd,[px,Y+1.6,0],[px*.45,Y+3.1,0],.15,0,6,4);
          sp(br,px,Y+4.35,0,.3);bx(red,px-sx*.9,Y+3.95,0,1.5,.8,.04);cy(blk,0,Y+2.1,0,.04,1.4,4);sp(paper,0,Y,0,1.0,1.3,1.0);for(const y of[Y+1.22,Y-1.22])cy(blk,0,y,0,.42,.22,12);cy(red,0,Y-1.9,0,.09,1.2,6);glow(0,Y,0,4.0,.45)}}};
    // ---- 唐：朱漆描金寶相花、豐腴的造型、三彩；華麗宮燈 ----
    F.tang=()=>{const R="#9E1E1A",GD="#D9A441",GR="#2E7D5B",AM="#D98E2E",CR="#F1E3C2",red=mm(lacqT(R,"#C84030"),{roughness:.3}),gd=gold(),
      ros=(g,s,i)=>MO.rosette(g,s,GD,i%2?GR:AM,CR),
      top=mm(topT(fillC(R),{round:1,ring:[[.975,8,GD],[.84,5,GD]],m:ros,n:16,mr:.908,s:.052}),{roughness:.28}),side=mm(bandT(fillC(R),{lines:GD,m:ros,n:12,s:.3}),{roughness:.3}),
      kun=(n,h)=>mm(bandT(fillC(R),{h,lines:GD,ly:[.03,.93],n,s:.36,y:.52,m:(g,s)=>{g.fillStyle="#2A0E0A";g.beginPath();g.moveTo(-s,s*1.1);g.lineTo(-s,0);g.bezierCurveTo(-s,-s*.55,-s*.45,-s*.45,-s*.22,-s*.7);g.quadraticCurveTo(0,-s*1.05,s*.22,-s*.7);
        g.bezierCurveTo(s*.45,-s*.45,s,-s*.55,s,0);g.lineTo(s,s*1.1);g.closePath();g.fill();g.strokeStyle=GD;g.lineWidth=s*.07;g.stroke()}}),{roughness:.3}),
      sanc=mm(TX(512,256,(g,w,h)=>{g.fillStyle=CR;g.fillRect(0,0,w,h);for(let i=0;i<46;i++){const x=rr(0,w),c=[GR,AM,AM,"#7A4A1E"][i%4],ww=rr(10,36),l=rr(.4,1)*h,gr=g.createLinearGradient(0,0,0,l);gr.addColorStop(0,hexA(c,.95));gr.addColorStop(.8,hexA(c,.7));gr.addColorStop(1,hexA(c,0));
        g.fillStyle=gr;g.beginPath();g.moveTo(x-ww/2,0);g.lineTo(x+ww/2,0);g.quadraticCurveTo(x+ww/2,l*.9,x,l);g.quadraticCurveTo(x-ww/2,l*.9,x-ww/2,0);g.fill()}noise(g,w,h,2000,"255,255,255",.1)}),{roughness:.22}),
      silk=lit(lanT("#C32A1C",{edge:"#6A0E0A",ribs:12,rc:GD,ra:.9,rw:4,draw:(g,h)=>MO.rosette(g,h*.22,GD,GR,CR)}),.6,{roughness:.55}),gm=M(0x2E7D5B,{roughness:.5}),am=M(0xD98E2E,{roughness:.5});
      return{frame:0x6E1612,
        table(){roundTop(8.2,1.1,top,side,red);la(red,[[0,GY+2.2],[2.2,GY+2.2],[2.6,GY+3],[2.8,GY+4.5],[2.2,GY+6.5],[1.3,GY+8],[1.15,GY+10],[1.6,GY+12],[2.3,GY+13.5],[2.3,GY+15],[1.6,GY+16],[2.8,GY+17.3],[3.4,GY+17.9],[0,GY+17.9]],32);
          for(const[y,r]of[[GY+4.5,2.82],[GY+13.5,2.33],[GY+17.3,2.82],[GY+8,1.33]])tor(gd,0,y,0,r,.12,TAU,null,40);K.add(new T.CylinderGeometry(4.6,4.8,2.2,40,1,true),kun(8,128),[0,GY+1.1,0]);ct(red,0,GY+2.3,0,4.75,4.75,.2,40);tor(gd,0,GY+2.4,0,4.75,.1,TAU,null,48)},
        bench(){const kb=kun(3,1024);bx(kb,0,(GY+YS-.9)/2,BZ,13.2,YS-.9-GY,4.6);bx(red,0,YS-.45,BZ,13.6,.9,5.0,null,4);bx(sanc,0,YS+.2,BZ+.1,12.6,.5,4.4);
          bx(red,0,YS+3.4,BZ-2.5,13.0,6.4,.5,null,4);bx(side,0,YS+5.3,BZ-2.22,12.6,1.5,.06);cy(gd,0,YS+6.7,BZ-2.5,.34,13.6,12,[0,0,PI/2]);for(const x of[-6.9,6.9])sp(gd,x,YS+6.7,BZ-2.5,.45);
          for(const x of[-5.7,5.7]){cy(sanc,x,YS+1.0,BZ+.2,.75,4.2,16,[PI/2,0,0]);for(const z of[-2.12,2.12])cy(gd,x,YS+1.0,BZ+.2+z,.78,.12,16,[PI/2,0,0])}},
        stool(){la(sanc,[[0,GY],[1.6,GY],[2.1,GY+3],[2.4,GY+7],[2.1,GY+11],[1.8,GY+13.4],[2.15,GY+13.7],[2.1,GY+14],[0,GY+14]],28);tor(gd,0,GY+13.6,0,2.1,.1,TAU,null,28)},
        // 手繪長榻底下的壼門台座（朱漆、金邊）：長榻立牌放在台上，Pikafish 坐在榻前
        dais(top,w,d){bx(kun(3,1024),0,(GY+top-.5)/2,BZ,w,top-.5-GY,d);bx(red,0,top-.25,BZ,w+.5,.5,d+.5,null,4);for(const z of[BZ-d/2-.25,BZ+d/2+.25])bx(gd,0,top-.5,z,w+.6,.12,.12)},
        lamp(sx){const px=sx*2.1,Y=-4.2;cy(red,px,(GY+Y+3.6)/2,0,.32,Y+3.6-GY,10);ct(gd,px,GY+.5,0,.6,.9,1.0,10);sp(gd,px,Y+3.8,0,.42);bx(gd,px/2,Y+3.0,0,2.6,.22,.22);tor(gd,px*.55,Y+2.4,0,.55,.09,PI*1.5,[0,0,sx>0?0:PI],12);
          cy(gd,0,Y+2.0,0,.05,1.2,4);sp(silk,0,Y,0,1.45,1.25,1.45);ct(gd,0,Y+1.3,0,.5,1.0,.4,16);sp(gd,0,Y+1.65,0,.28);ct(gd,0,Y-1.3,0,1.0,.5,.35,16);
          for(let i=0;i<8;i++){const a=i/8*TAU,x=Math.sin(a)*.55,z=Math.cos(a)*.55;cy(i%2?gm:am,x,Y-2.35,z,.07,1.8,4);sp(gd,x,Y-3.3,z,.12)}glow(0,Y,0,5,.5)}}};
    // ---- 五代：深色木、墨色、收斂；水墨山水屏風；素紙座燈 ----
    F.wudai=()=>{const dw=mm(woodT("#2B211B","#0E0A08",{n:110,a:.25}),{roughness:.5}),
      top=mm(topT(g=>grain(g,1024,1024,"#2E241D","#0E0A08",{n:200,a:.2}),{ring:[[.985,12,"#0E0A08"]]}),{roughness:.45}),
      ink=mm(cv(1024,512,(g,w,h)=>{g.fillStyle="#E4DAC2";g.fillRect(0,0,w,h);const ic=E.ink;let s=7;const rnd=()=>(s=(s*16807)%2147483647)/2147483647;
        for(const[base,amp,a]of[[.5,.35,.22],[.62,.3,.38],[.78,.22,.65]]){g.fillStyle=hexA(ic,a);g.beginPath();g.moveTo(0,h);const ph=rnd()*9;for(let x=0;x<=w;x+=8){const t=x/w;g.lineTo(x,h*(base-amp*Math.pow(Math.max(0,Math.sin(t*PI*2.2+ph)*.6+Math.sin(t*PI*5.3+ph*2)*.3+.3),1.4)))}g.lineTo(w,h);g.fill();
          const gr=g.createLinearGradient(0,h*base,0,h*(base+.18));gr.addColorStop(0,"rgba(228,218,194,0)");gr.addColorStop(1,"rgba(228,218,194,.95)");g.fillStyle=gr;g.fillRect(0,h*(base-.02),w,h*.2)}
        g.strokeStyle=hexA(ic,.8);g.lineWidth=2;for(let i=0;i<40;i++){const x=rnd()*w,y=h*(.55+rnd()*.3);g.beginPath();g.moveTo(x,y);g.lineTo(x,y-10-rnd()*14);g.stroke();g.beginPath();g.ellipse(x,y-16,5,3,0,0,TAU);g.stroke()}
        g.fillStyle="#A8281C";g.fillRect(w*.86,h*.12,26,26);noise(g,w,h,6000,"120,100,70",.05)}),{roughness:.8}),
      paper=lit(cv(256,256,(g,w,h)=>{g.fillStyle="#F0E8D4";g.fillRect(0,0,w,h);g.strokeStyle="rgba(40,30,20,.5)";g.lineWidth=3;g.strokeRect(16,16,w-32,h-32);noise(g,w,h,3000,"120,100,70",.06)}),.7);
      return{frame:0x231A15,
        table(){sqTop(7.7,.6,top,dw,4);bx(dw,0,-1.0,0,14.6,.8,14.6,null,4);legs(dw,6.9,.8,GY,-.6,false,4);for(const s of[-1,1]){bx(dw,0,-2.4,s*6.9,13.2,.35,.35,null,4);bx(dw,s*6.9,-2.4,0,.35,.35,13.2,null,4);bx(dw,0,GY+2.5,s*6.9,13.2,.4,.4,null,4)}},
        bench(){bx(dw,0,YS-.35,BZ,13.2,.7,4.6,null,4);bx(dw,0,YS-1.2,BZ+2.1,12.6,.9,.3,null,4);for(const x of[-6.2,6.2])for(const z of[BZ+1.9,BZ-1.9])bx(dw,x,(GY+YS-.7)/2,z,.7,YS-.7-GY,.7,null,4);
          bx(dw,0,YS+4.0,BZ-2.9,13.0,6.8,.4,null,4);bx(ink,0,YS+4.0,BZ-2.68,12.2,6.0,.05);for(const x of[-5.8,5.8])bx(dw,x,YS+.35,BZ-2.9,.8,.7,2.4,null,4)},
        stool(){bx(dw,0,-5.3,0,3.4,.5,3.4,null,4);legs(dw,1.35,.45,GY,-5.55,false,4);for(const s of[-1,1]){bx(dw,0,GY+2.5,s*1.35,2.7,.3,.3);bx(dw,s*1.35,GY+2.5,0,.3,.3,2.7)}},
        lamp(){const Y=-4.4;bx(dw,0,GY+.3,0,3.2,.6,.6,null,4);bx(dw,0,GY+.3,0,.6,.6,3.2,null,4);cy(dw,0,(GY+Y-1.4)/2,0,.22,Y-1.4-GY,8,null,4);
          bx(dw,0,Y-1.35,0,2.0,.15,2.0);bx(paper,0,Y,0,1.62,2.4,1.62);for(const a of[-1,1])for(const b of[-1,1])bx(dw,a*.85,Y,b*.85,.14,2.6,.14);bx(dw,0,Y+1.35,0,2.1,.18,2.1);ct(dw,0,Y+1.7,0,.15,1.45,.55,4,[0,PI/4,0]);glow(0,Y,0,3.6,.4)}}};
    // ---- 宋：素雅淺色木、細長的腳、青瓷繡墩；紗燈 ----
    F.song=()=>{const lw=mm(woodT("#C8A576","#8A6440",{n:110,a:.18,lw:1.6}),{roughness:.5}),
      top=mm(topT(g=>grain(g,1024,1024,"#CDAB7C","#8A6440",{n:220,a:.16,lw:1.6}),{ring:[[.99,8,"#9C7A4E"]]}),{roughness:.45}),
      cel=mm(TX(512,256,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,"#A9C6AE");gr.addColorStop(.5,"#94B49C");gr.addColorStop(1,"#86A88F");g.fillStyle=gr;g.fillRect(0,0,w,h);
        for(let i=0;i<70;i++){g.strokeStyle=`rgba(50,70,58,${rr(.12,.3)})`;g.lineWidth=rr(.6,1.4);g.beginPath();let x=rr(0,w),y=rr(0,h);g.moveTo(x,y);for(let k=0;k<5;k++){x+=rr(-30,30);y+=rr(-30,30);g.lineTo(x,y)}g.stroke()}noise(g,w,h,1500,"255,255,255",.08)}),{roughness:.2}),
      gauze=lit(lanT("#F1EADA",{edge:"#DCCFB4",draw:(g,h)=>{g.strokeStyle="rgba(50,40,30,.8)";g.lineCap="round";g.lineWidth=4;g.beginPath();g.moveTo(-50,h*.35);g.bezierCurveTo(-20,h*.1,0,0,40,-h*.3);g.stroke();g.lineWidth=2.5;g.beginPath();g.moveTo(-12,h*.08);g.quadraticCurveTo(10,h*.1,28,h*.2);g.stroke();
        for(let k=0;k<9;k++){g.fillStyle=k%3?"rgba(200,70,80,.75)":"rgba(240,240,235,.9)";g.beginPath();g.arc(rr(-40,40),rr(-h*.3,h*.25),rr(5,8),0,TAU);g.fill()}}}),.55);
      return{frame:0x9C7A4E,
        table(){sqTop(7.7,.6,top,lw,4);bx(lw,0,-.95,0,13.9,.7,13.9,null,4);for(const a of[-1,1])for(const b of[-1,1])beam(lw,[a*6.95,-.6,b*6.95],[a*7.25,GY,b*7.25],.38,0,12,4);
          for(const s of[-1,1]){cy(lw,0,GY+4,s*7.12,.17,14.2,8,[0,0,PI/2],4);cy(lw,s*7.12,GY+4,0,.17,14.2,8,[PI/2,0,0],4)}},
        bench(){bx(lw,0,YS-.3,BZ,13.0,.6,4.4,null,4);for(const a of[-1,1])for(const b of[-1,1])beam(lw,[a*6.1,YS-.6,BZ+b*1.9],[a*6.3,GY,BZ+b*2.1],.32,0,10,4);
          for(const b of[-1,1])cy(lw,0,GY+3.5,BZ+b*2.0,.15,12.4,8,[0,0,PI/2],4);for(const a of[-1,1]){cy(lw,a*6.2,GY+3.5,BZ,.15,4.0,8,[PI/2,0,0],4);beam(lw,[a*6.1,YS,BZ-2.0],[a*6.1,YS+6.4,BZ-2.6],.3,0,10,4)}
          cy(lw,0,YS+6.5,BZ-2.62,.27,13.6,10,[0,0,PI/2],4);for(const a of[-1,1])sp(lw,a*6.85,YS+6.58,BZ-2.62,.3);cy(lw,0,YS+.9,BZ-2.15,.16,12.2,8,[0,0,PI/2],4);
          for(const x of[-3.4,0,3.4])bx(lw,x,YS+3.7,BZ-2.38,1.1,5.6,.16,[-.1,0,0],4)},
        stool(){la(cel,[[0,GY],[1.5,GY],[1.55,GY+.4],[2.0,GY+2.5],[2.25,GY+7],[2.0,GY+11.5],[1.6,GY+13.4],[1.85,GY+13.6],[1.85,GY+14],[0,GY+14]],32);
          for(const[y,r]of[[GY+2.5,2.02],[GY+11.5,2.02]])tor(cel,0,y,0,r,.1,TAU,null,32);for(let i=0;i<14;i++){const a=i/14*TAU;sp(cel,Math.sin(a)*2.1,GY+3.2,Math.cos(a)*2.1,.13);sp(cel,Math.sin(a)*2.1,GY+10.8,Math.cos(a)*2.1,.13)}},
        lamp(sx){const px=sx*1.8,Y=-4.4;la(cel,[[0,GY],[1.3,GY],[1.2,GY+.6],[.5,GY+1.2],[0,GY+1.2]],20);cy(lw,px*0,(GY+1.2+Y-1.7)/2,0,.2,Y-1.7-GY-1.2,8,null,4);
          bx(lw,0,Y-1.75,0,1.2,.12,1.2);for(const a of[-1,1])beam(lw,[0,Y-1.7,0],[a*.85,Y-1.25,0],.08,0,6);ct(gauze,0,Y,0,.85,.95,2.4,16);for(const y of[Y+1.22,Y-1.22])tor(lw,0,y,0,y>Y?.86:.96,.06,TAU,null,16);
          ct(lw,0,Y+1.45,0,.2,.6,.35,12);sp(lw,0,Y+1.75,0,.12);glow(0,Y,0,3.8,.45)}}};
    // ---- 元：青花瓷鼓桌、瓷墩；毛氈；圓燈 ----
    F.yuan=()=>{const BL="#22489A",WH="#F3F5F6",por=M(0xF3F5F6,{roughness:.16}),blue=M(0x22489A,{roughness:.3}),dw=mm(woodT("#3E2A1E","#140C07",{n:90}),{roughness:.6}),
      waves=(g,w,y0,y1)=>{g.strokeStyle=BL;g.lineWidth=3;for(let x=0;x<w;x+=44){g.beginPath();g.arc(x,y1,(y1-y0)*.8,PI,PI*1.75);g.stroke();g.beginPath();g.arc(x+22,y1,(y1-y0)*.45,PI,PI*1.8);g.stroke()}},
      body=mm(TX(1024,512,(g,w,h)=>{g.fillStyle=WH;g.fillRect(0,0,w,h);g.fillStyle=BL;for(const y of[.13,.24,.71,.86])g.fillRect(0,h*y,w,5);
        for(let i=0;i<16;i++){g.save();g.translate((i+.5)*w/16,h*.185);g.scale(1,.9);MO.lotus(g,h*.045,WH,WH,BL);g.restore()}
        for(let i=0;i<5;i++){g.save();g.translate((i+.5)*w/5,h*.47);MO.peony(g,h*.08,BL);g.restore()}waves(g,w,h*.74,h*.85);
        for(let i=0;i<12;i++){g.save();g.translate((i+.5)*w/12,h*.82);g.rotate(PI);g.restore()}noise(g,w,h,2000,"30,60,140",.05)}),{roughness:.16}),
      top=mm(topT(g=>{g.fillStyle=WH;g.fillRect(0,0,1024,1024)},{round:1,ring:[[.98,10,BL],[.83,5,BL],[.8,2,BL]],m:(g,s)=>MO.peony(g,s,BL),n:12,mr:.905,s:.032}),{roughness:.16}),
      side=mm(bandT(g=>{g.fillStyle=WH;g.fillRect(0,0,1024,128)},{lines:BL,n:1,m:()=>{},post:(g,w,h)=>waves(g,w,h*.25,h*.82)}),{roughness:.16}),
      felt=mm(cv(512,256,(g,w,h)=>{g.fillStyle="#9C2A22";g.fillRect(0,0,w,h);noise(g,w,h,8000,"60,10,5",.25);g.strokeStyle="#EADFC6";g.lineWidth=10;g.strokeRect(14,14,w-28,h-28);g.strokeStyle=BL;g.lineWidth=6;g.strokeRect(30,30,w-60,h-60);
        for(let i=0;i<6;i++){g.save();g.translate(70+i*74,h/2);g.fillStyle="#EADFC6";g.beginPath();g.moveTo(0,-26);g.lineTo(20,0);g.lineTo(0,26);g.lineTo(-20,0);g.fill();g.fillStyle=BL;g.fillRect(-6,-6,12,12);g.restore()}}),{roughness:.95}),
      paper=lit(lanT(WH,{edge:"#C9D3E0",bands:[[.08,.05,BL],[.87,.05,BL]],draw:(g,h)=>{g.strokeStyle=BL;g.lineWidth=5;g.fillStyle=hexA(BL,.85);g.beginPath();g.moveTo(-90,-h*.35);g.quadraticCurveTo(-60,0,0,h*.05);g.quadraticCurveTo(60,0,90,-h*.35);g.stroke();MO.peony(g,h*.09,BL)}}),.55);
      const drum=(R,top0)=>{la(body,[[0,0],[.64,0],[.77,.082],[.94,.273],[1,.49],[.94,.71],[.77,.9],[.64,1],[0,1]].map(([r,y])=>[r*R,GY+y*top0]),32);
        for(const y of[GY+2.4,GY+top0-2.0]){const r=R*.82;for(let i=0;i<18;i++){const a=i/18*TAU;sp(por,Math.sin(a)*r,y,Math.cos(a)*r,.16)}}};
      return{frame:0x3E2A1E,
        table(){roundTop(8.2,.7,top,side,por);drum(4.7,18.3)},
        bench(){bx(dw,0,YS-.7,BZ,13.4,.8,4.9,null,4);for(const a of[-1,1])for(const b of[-1,1])bx(dw,a*6.2,(GY+YS-1.1)/2,BZ+b*2.0,.8,YS-1.1-GY,.8,null,4);for(const b of[-1,1])bx(dw,0,GY+2.5,BZ+b*2.0,12.4,.4,.4);
          bx(felt,0,YS+.0,BZ+.1,13.0,.5,4.6);bx(felt,0,YS-1.0,BZ+2.42,13.0,1.8,.08);for(const x of[-6.3,6.3])bx(dw,x,YS+3.1,BZ-2.45,.6,6.2,.6,null,4);bx(dw,0,YS+6.1,BZ-2.45,13.2,.5,.6,null,4);
          bx(felt,0,YS+3.4,BZ-2.42,12.0,4.8,.25);cy(felt,0,YS+1.0,BZ-1.75,.75,12.0,16,[0,0,PI/2]);for(const x of[-6.05,6.05])cy(blue,x,YS+1.0,BZ-1.75,.78,.12,16,[0,0,PI/2])},
        stool(){drum(2.45,14);K.add(new T.CircleGeometry(2.45*.64,24),top,[0,-4.99,0],[-PI/2,0,0])},
        lamp(sx){const px=sx*1.9,Y=-4.4;cy(dw,px,(GY+Y+3.4)/2,0,.28,Y+3.4-GY,8,null,4);ct(blue,px,GY+.5,0,.55,.85,1.0,10);bx(dw,px/2,Y+3.0,0,2.4,.24,.24,null,4);cy(dw,0,Y+2.0,0,.04,1.6,4);
          sp(paper,0,Y,0,1.25,1.18,1.25);for(const y of[Y+1.15,Y-1.15])cy(blue,0,y,0,.5,.22,14);cy(blue,0,Y-1.9,0,.1,1.2,6);sp(blue,0,Y-1.35,0,.16);glow(0,Y,0,4.4,.45)}}};
    // ---- 明：黃花梨、明式線條；官帽椅式的長椅背；六角宮燈 ----
    F.ming=()=>{const hh=mm(woodT("#9C6634","#5A2E12",{n:120,a:.28,fig:4,figR:36}),{roughness:.42}),dk=mm(woodT("#7A4A22","#3A1C0A",{n:80}),{roughness:.45}),rw=mm(woodT("#3A1C14","#120604",{n:90}),{roughness:.4}),
      top=mm(topT(g=>grain(g,1024,1024,"#9A6332","#5A2E12",{n:240,a:.25,fig:6,figR:60}),{ring:[[.99,12,"#7A4418"],[.91,5,"#8A5020"]]}),{roughness:.38}),
      cane=mm(TX(256,256,(g,w,h)=>{g.fillStyle="#C9A86A";g.fillRect(0,0,w,h);for(const d of[1,-1])for(let k=-h;k<w+h;k+=12){g.strokeStyle=d>0?"rgba(255,240,200,.35)":"rgba(90,60,20,.35)";g.lineWidth=4;g.beginPath();g.moveTo(k,0);g.lineTo(k+d*h,h);g.stroke()}
        for(let y=6;y<h;y+=12)for(let x=6;x<w;x+=12){g.fillStyle="rgba(60,40,15,.5)";g.beginPath();g.arc(x,y,2.2,0,TAU);g.fill()}},3),{roughness:.7}),
      dun=mm(TX(1024,512,(g,w,h)=>{grain(g,w,h,"#9C6634","#5A2E12",{n:90,a:.25});for(let k=0;k<5;k++){const x=(k+.5)/5*w,ww=w*.11,y0=h*.3,y1=h*.7;g.fillStyle="#24120A";g.beginPath();g.ellipse(x,(y0+y1)/2,ww/2,(y1-y0)/2,0,0,TAU);g.fill();g.strokeStyle="rgba(255,220,160,.35)";g.lineWidth=4;g.stroke()}}),{roughness:.42}),
      silk=lit(lanT("#B8261C",{edge:"#6A100A",bands:[[.04,.06,"#E2B65C"],[.9,.06,"#E2B65C"]],draw:(g,h)=>{MO.flower(g,h*.13,"#F4D9A0","#E2B65C");g.strokeStyle="#F4D9A0";g.lineWidth=3;g.beginPath();g.moveTo(-40,h*.3);g.quadraticCurveTo(0,h*.1,10,h*.05);g.stroke()}}),.6),
      gd=gold(),tas=M(0xC8102E,{roughness:.8});
      const chain=(m,x,y,z,segs)=>{for(const[L,th]of segs){const y1=y+L*Math.cos(th),z1=z-L*Math.sin(th);bx(m,x,(y+y1)/2,(z+z1)/2,1.25,L,.22,[-th,0,0],4);y=y1;z=z1}return[y,z]};
      return{frame:0x8A5A2B,
        table(){sqTop(7.9,.75,top,hh,4);bx(hh,0,-.95,0,15.3,.3,15.3,null,4);bx(dk,0,-1.25,0,14.9,.32,14.9,null,4);bx(hh,0,-1.95,0,15.4,1.1,15.4,null,4);
          for(const a of[-1,1])for(const b of[-1,1]){bx(hh,a*7.2,(GY+.9-2.5)/2,b*7.2,1.0,-2.5-GY-.9,1.0,null,4);bx(hh,a*7.05,GY+.45,b*7.05,1.15,.9,1.15,null,4)}
          for(const s of[-1,1])for(const ax of[0,1]){const P=(u,y)=>ax?[s*7.2,y,u]:[u,y,s*7.2];beam(hh,P(-7.0,-4.4),P(-4.2,-3.3),.36,.36,0,4);beam(hh,P(-4.2,-3.3),P(4.2,-3.3),.36,.36,0,4);beam(hh,P(4.2,-3.3),P(7.0,-4.4),.36,.36,0,4);
            for(const u of[-2.2,2.2])beam(hh,P(u,-3.3),P(u,-2.5),.28,.28,0,4)}},
        bench(){bx(hh,0,YS-.35,BZ,13.2,.7,4.6,null,4);bx(cane,0,YS+.01,BZ,12.4,.02,3.8);bx(hh,0,YS-1.15,BZ+2.15,12.6,.9,.25,null,4);
          for(const a of[-1,1])for(const b of[-1,1])cy(hh,a*6.3,(GY+YS-.7)/2,BZ+b*2.0,.38,YS-.7-GY,12,null,4);bx(hh,0,GY+1.4,BZ+2.05,12.6,.45,.6,null,4);for(const a of[-1,1])cy(hh,a*6.3,GY+3.2,BZ,.2,4.0,8,[PI/2,0,0],4);cy(hh,0,GY+4.2,BZ-2.0,.2,12.6,8,[0,0,PI/2],4);
          for(const a of[-1,1]){beam(hh,[a*6.3,YS,BZ-2.0],[a*6.3,YS+6.6,BZ-2.5],.34,0,12,4);cy(hh,a*6.3,YS+3.0,BZ,.22,4.6,8,[PI/2,0,0],4);cy(hh,a*6.3,YS+1.5,BZ+2.05,.22,3.0,8,null,4);beam(hh,[a*6.3,YS,BZ+.7],[a*6.3,YS+3,BZ+.5],.12,0,6)}
          cy(hh,0,YS+6.75,BZ-2.55,.32,14.0,12,[0,0,PI/2],4);for(const a of[-1,1])sp(hh,a*7.0,YS+6.85,BZ-2.55,.36,.34,.36);
          for(const x of[-3.6,0,3.6]){chain(hh,x,YS,BZ-2.0,[[2.4,-.22],[2.2,-.02],[2.1,.08]]);cy(dk,x,YS+3.6,BZ-2.38,.42,.06,20,[PI/2-.02,0,0])}},
        stool(){la(dun,[[0,GY],[1.6,GY],[1.7,GY+.6],[2.3,GY+4],[2.45,GY+7],[2.3,GY+10],[1.7,GY+13.4],[1.6,GY+14],[0,GY+14]],28);for(const y of[GY+.7,GY+13.3])tor(dk,0,y,0,1.72,.12,TAU,null,28);
          for(let i=0;i<12;i++){const a=i/12*TAU;sp(gd,Math.sin(a)*1.78,GY+1.1,Math.cos(a)*1.78,.1);sp(gd,Math.sin(a)*1.78,GY+12.9,Math.cos(a)*1.78,.1)}},
        lamp(sx){const px=sx*2.1,Y=-4.3;cy(rw,px,(GY+Y+3.8)/2,0,.3,Y+3.8-GY,8,null,4);ct(rw,px,GY+.6,0,.6,.9,1.2,8);sp(gd,px,Y+4.0,0,.35);bx(rw,px/2,Y+3.3,0,2.8,.24,.24,null,4);tor(rw,px*.6,Y+2.7,0,.5,.08,PI*1.5,[0,0,sx>0?0:PI],12);cy(gd,0,Y+2.6,0,.05,1.0,4);
          K.add(new T.CylinderGeometry(1.0,1.0,2.4,6,1,true),silk,[0,Y,0]);for(let i=0;i<6;i++){const a=i/6*TAU,c=Math.sin(a),s=Math.cos(a);bx(rw,c*1.02,Y,s*1.02,.14,2.6,.14,[0,a,0]);beam(gd,[c*1.15,Y+1.45,s*1.15],[c*1.85,Y+1.95,s*1.85],.09,0,6);cy(tas,c*1.9,Y+1.05,s*1.9,.07,1.6,4);sp(gd,c*1.9,Y+1.95,s*1.9,.14)}
          ct(rw,0,Y+1.38,0,1.22,1.22,.25,6);ct(rw,0,Y-1.38,0,1.18,1.18,.25,6);ct(rw,0,Y+1.85,0,.45,1.1,.6,6);sp(gd,0,Y+2.25,0,.22);ct(rw,0,Y-1.75,0,.9,.4,.5,6);cy(tas,0,Y-2.9,0,.18,1.9,6);sp(gd,0,Y-1.95,0,.2);glow(0,Y,0,4.6,.45)}}};
    // ---- 清：紫檀／紅木，繁複雕刻、掐絲琺瑯、螺鈿；宮燈加流蘇 ----
    F.qing=()=>{const ZT="#2E1714",zt=mm(woodT(ZT,"#0E0605",{n:160,a:.3,lw:1.4}),{roughness:.36}),gd=gold(),tas=M(0xC8102E,{roughness:.8}),redl=mm(lacqT("#8E1A14","#C84030"),{roughness:.3}),
      mop=(g,s)=>{const gr=g.createLinearGradient(-s,-s,s,s);gr.addColorStop(0,"#F6FAF6");gr.addColorStop(.5,"#D6E6F2");gr.addColorStop(1,"#F2DCE6");MO.flower(g,s,gr,"#E8D9A8");g.fillStyle=gr;for(const sd of[-1,1]){g.beginPath();g.ellipse(sd*s*1.3,s*.4,s*.45,s*.18,sd*.5,0,TAU);g.fill()}},
      top=mm(topT(g=>grain(g,1024,1024,"#311915","#0E0605",{n:240,a:.28,lw:1.4}),{round:1,ring:[[.985,8,"#C9A050"],[.855,4,"#C9A050"]],m:mop,n:20,mr:.92,s:.036,post:(g,w)=>{g.strokeStyle="rgba(230,235,240,.55)";g.lineWidth=3;g.beginPath();for(let a=0;a<=TAU+.01;a+=.02){const r=w/2*(.89+.012*Math.sin(a*40));const x=w/2+Math.cos(a)*r,y=w/2+Math.sin(a)*r;a?g.lineTo(x,y):g.moveTo(x,y)}g.stroke()}}),{roughness:.32}),
      relief=f=>(g,s,i)=>{g.save();g.translate(-s*.06,-s*.06);f(g,s,"rgba(255,200,160,.28)",i);g.restore();f(g,s,"#120807",i)},
      fretB=mm(bandT(fillC("#2A1412"),{lines:"#5A3020",m:relief((g,s,c)=>MO.fret(g,s,c)),n:18,s:.28}),{roughness:.35}),
      carve=mm(bandT(fillC("#2A1412"),{lines:"#C9A050",ly:[.02,.9],m:relief((g,s,c,i)=>{g.scale(i%2?-1:1,1);MO.cloud(g,s,c)}),n:12,s:.3,post:(g,w,h)=>{for(let i=0;i<6;i++){g.save();g.translate((i+.5)*w/6,h*.5);g.fillStyle="#2BA6A0";g.beginPath();g.arc(0,0,h*.2,0,TAU);g.fill();g.strokeStyle="#D9B04C";g.lineWidth=4;g.stroke();MO.flower(g,h*.1,"#C8102E","#F2C14E");g.restore()}}}),{roughness:.35}),
      cloiF=(g,w,h,n)=>{g.fillStyle="#2BA6A0";g.fillRect(0,0,w,h);g.strokeStyle="#D9B04C";g.lineWidth=2.5;for(let i=0;i<n*3;i++){const x=rr(0,w),y=rr(0,h);g.beginPath();for(let a=0;a<TAU*1.3;a+=.25){const r=4+a*5;a?g.lineTo(x+Math.cos(a)*r,y+Math.sin(a)*r):g.moveTo(x,y)}g.stroke()}
        for(let i=0;i<n;i++){g.save();g.translate(rr(30,w-30),rr(30,h-30));const s=rr(16,30);MO.flower(g,s,["#C8102E","#F2C14E","#E86A9A","#F4F4F4","#1F5FA8"][i%5],"#F2C14E");g.strokeStyle="#D9B04C";g.lineWidth=2;g.beginPath();g.arc(0,0,s*.8,0,TAU);g.stroke();g.restore()}},
      cloiB=mm(bandT((g,w,h)=>cloiF(g,w,h,14),{lines:"#D9B04C",ly:[.0,.92],n:1,m:()=>{}}),{roughness:.25}),
      cloiP=mm(cv(512,512,(g,w,h)=>{cloiF(g,w,h,22);g.strokeStyle="#D9B04C";g.lineWidth=10;g.strokeRect(5,5,w-10,h-10)}),{roughness:.25}),
      cloiD=mm(TX(1024,512,(g,w,h)=>{cloiF(g,w,h,40);g.fillStyle="#D9B04C";for(const y of[.14,.84])g.fillRect(0,h*y,w,8)}),{roughness:.25}),
      broc=mm(TX(256,256,(g,w,h)=>{g.fillStyle="#E2B03A";g.fillRect(0,0,w,h);for(let y=0;y<2;y++)for(let x=0;x<2;x++){g.save();g.translate(64+x*128+(y%2)*0,64+y*128);MO.rosette(g,34,"#C07818","#B3261E","#F4D47A");g.restore()}noise(g,w,h,3000,"120,80,10",.1)},2),{roughness:.6}),
      glass=lit(lanT("#F0E2C0",{edge:"#8E1A14",bands:[[.0,.1,"#8E1A14"],[.9,.1,"#8E1A14"],[.1,.025,"#E2B65C"],[.875,.025,"#E2B65C"]],draw:(g,h)=>{MO.rosette(g,h*.16,"#C8102E","#2BA6A0","#F2C14E")}}),.6);
      return{frame:0x2A1412,
        table(){roundTop(8.2,.9,top,fretB,zt);K.add(new T.CylinderGeometry(7.85,7.85,1.6,64,1,true),carve,[0,-1.7,0]);tor(zt,0,-2.5,0,7.85,.13,TAU,null,64);
          la(zt,[[0,GY+1.2],[3.4,GY+1.2],[3.4,GY+1.8],[2.0,GY+2.8],[1.4,GY+5],[2.2,GY+8],[2.3,GY+9.5],[1.3,GY+12],[1.25,GY+14.5],[2.4,GY+16.5],[3.4,GY+17.5],[0,GY+17.5]],32);
          K.add(new T.CylinderGeometry(2.32,2.28,1.5,32,1,true),cloiB,[0,GY+8.85,0]);for(const y of[GY+8.1,GY+9.6])tor(gd,0,y,0,2.3,.08,TAU,null,32);
          for(let k=0;k<4;k++){const a=k*PI/2+PI/4,c=Math.sin(a),s=Math.cos(a);beam(zt,[c*2.6,GY+1.5,s*2.6],[c*4.7,GY+.5,s*4.7],.6,.6,0,4);sp(zt,c*4.9,GY+.45,s*4.9,.65,.45,.65);sp(gd,c*4.9,GY+.9,s*4.9,.18)}},
        bench(){bx(zt,0,GY+.4,BZ,13.8,.8,5.2,null,4);for(const a of[-1,1])for(const b of[-1,1])bx(zt,a*6.4,(GY+.8+YS-3.4)/2,BZ+b*2.1,.95,YS-3.4-GY-.8,.95,null,4);
          bx(carve,0,YS-2.9,BZ+2.3,12.8,1.0,.15);bx(zt,0,YS-2.9,BZ,12.9,1.0,4.4,null,4);bx(cloiB,0,YS-1.95,BZ,12.7,.9,4.3);bx(zt,0,YS-.75,BZ,13.4,1.5,5.0,null,4);
          bx(broc,0,YS+.25,BZ+.1,12.4,.5,4.4);bx(zt,0,YS+3.6,BZ-2.55,8.4,7.2,.5,null,4);bx(cloiP,0,YS+3.4,BZ-2.28,7.2,5.6,.06);
          const sh=new T.Shape();sh.moveTo(-4.4,0);sh.lineTo(-4.4,.5);sh.bezierCurveTo(-3.4,.6,-2.6,.9,-1.8,1.5);sh.bezierCurveTo(-1.2,2.1,-.6,2.2,0,2.4);sh.bezierCurveTo(.6,2.2,1.2,2.1,1.8,1.5);sh.bezierCurveTo(2.6,.9,3.4,.6,4.4,.5);sh.lineTo(4.4,0);
          K.add(new T.ExtrudeGeometry(sh,{depth:.5,bevelEnabled:false,curveSegments:10}),zt,[0,YS+7.15,BZ-2.8]);sp(gd,0,YS+9.6,BZ-2.55,.3);
          for(const a of[-1,1]){bx(zt,a*5.4,YS+2.7,BZ-2.55,2.4,5.4,.45,null,4);bx(cloiP,a*5.4,YS+2.6,BZ-2.3,1.7,4.0,.06);bx(zt,a*6.55,YS+1.5,BZ-.2,.45,3.0,4.4,null,4);bx(cloiP,a*6.3,YS+1.5,BZ-.2,.05,2.0,3.4);sp(gd,a*6.55,YS+3.1,BZ+1.9,.22)}},
        stool(){la(cloiD,[[0,GY+.6],[1.75,GY+.6],[2.0,GY+2],[2.4,GY+7],[2.0,GY+12],[1.75,GY+13.4],[0,GY+13.4]],28);ct(zt,0,GY+.3,0,1.85,1.85,.6,28);ct(zt,0,-5.3,0,2.0,1.85,.6,28);for(const y of[GY+.62,GY+13.4])tor(gd,0,y,0,1.8,.08,TAU,null,28)},
        lamp(sx){const px=sx*2.3,Y=-4.0;cy(redl,px,(GY+Y+4.0)/2,0,.34,Y+4.0-GY,10);ct(zt,px,GY+.7,0,.7,1.0,1.4,8);sp(gd,px,Y+4.3,0,.42);beam(gd,[px,Y+3.5,0],[-sx*.2,Y+3.3,0],.2,0,8);tor(gd,px*.55,Y+2.9,0,.55,.1,PI*1.5,[0,0,sx>0?0:PI],12);cy(gd,0,Y+2.8,0,.05,1.0,4);
          K.add(new T.CylinderGeometry(1.18,1.18,2.4,6,1,true),glass,[0,Y,0]);for(let i=0;i<6;i++){const a=i/6*TAU,c=Math.sin(a),s=Math.cos(a);bx(zt,c*1.2,Y,s*1.2,.16,2.6,.16,[0,a,0]);beam(gd,[c*1.35,Y+1.5,s*1.35],[c*2.25,Y+2.1,s*2.25],.11,0,6);sp(gd,c*2.32,Y+2.15,s*2.32,.2);sp(gd,c*2.32,Y+1.85,s*2.32,.14);cy(tas,c*2.32,Y+.55,s*2.32,.08,2.5,4)}
          ct(gd,0,Y+1.4,0,1.45,1.35,.25,6);ct(zt,0,Y+1.95,0,.75,1.3,.85,6);sp(gd,0,Y+2.55,0,.3);ct(gd,0,Y-1.4,0,1.35,1.45,.22,6);ct(zt,0,Y-1.75,0,.95,1.3,.5,6);ct(gd,0,Y-2.2,0,.4,.85,.5,6);sp(gd,0,Y-2.55,0,.25);cy(tas,0,Y-3.6,0,.32,1.9,8);glow(0,Y,0,5,.45)}}};
    const f=(F[EK]||F.classic)();
    let F3D=false;   /* 意見回饋 559：已經做了 3D 長椅、石凳（地面抬高的朝代），就不要再疊手繪的長椅、鼓凳圖，兩個擠在同一個位置看起來像破圖 */
    const PP=PROP_IMG[EK],STOOLS=[[-14.5,1.5],[14.5,-1.5]],LAMPS=[-1,1].map(sx=>[sx,sx*8.1,-17.5]),DT=-9.35;   // DT＝手繪長榻的台座頂面高度
    if(X.bridge)F.classic().table();else f.table();
    /* 室內（車輪戰棋館）：桌子照這一朝（車輪戰指定明朝＝木方桌），兩張木凳；不放長榻、燈、手繪道具 */
    if(X.indoor){F3D=true;for(const[x,z]of STOOLS){K.at(x,0,z);OX=x;OZ=z;f.stool()}}   /* 11/11：橋上用圓石桌（首頁橋上畫的是圓石桌），不用這一朝花園的木桌 */
    /* 開發者 11/11（首頁橋上石桌，Gemini 75 方案 A「溯江望槎」）：X.bridge＝在渡口青石拱橋中央下——只有石桌和兩張青石鼓凳，左右各一道宋式素面矮石欄（尋杖欄板），
       不放這一朝花園的長榻、燈、手繪道具和樹（那些是後園的東西） */
    if(X.indoor){}
    else if(X.bridge){F3D=true;const FY=X.FL!=null?X.FL:GY;
      for(const[x,z]of STOOLS){K.at(x,0,z);OX=x;OZ=z;ct(X.stone,0,GY+6.7,0,1.9,2.25,13.4,28);for(const y of[FY+1.2,GY+12.2])tor(X.stone2,0,y,0,2.2,.16,TAU,null,32)}
      K.at();OX=OZ=0;for(const sx of[-1,1]){const x=sx*21;bx(X.stone2,x,FY+4.6,-3,.7,.7,34,null,4);bx(X.stone,x,FY+2.3,-3,.45,3.6,34,null,4);
        for(let z=-19;z<=13;z+=8)bx(X.stone2,x,FY+2.6,z,1.3,5.2,1.3,null,4)}}
    else if(PP&&X.FL==null){if(f.dais)f.dais(DT,15,5.4);else bx(X.stone2,0,(GY+DT)/2,BZ,15,DT-GY,5.4,null,4)}   /* 地面抬高後長榻直接放在地上，不用台座 */
    else{F3D=true;f.bench();for(const[x,z]of STOOLS){K.at(x,0,z);OX=x;OZ=z;f.stool()}for(const[sx,x,z]of LAMPS){OX=x;OZ=z;K.at(OX,0,OZ);f.lamp(sx)}}
    K.at();K.build(root);OX=OZ=0;
    if(PP&&!X.bridge&&!X.indoor)paint();
    // ---- 手繪道具立牌：一張去背圖貼在平面上，轉向座位（鏡頭只在座位上轉頭，不會走動，所以永遠看到正面）；
    // tilt＝往後仰多少（0＝直立、1＝整張正對鏡頭），下緣貼地／貼桌；不投影（平的，影子會穿幫），腳下改放一團柔和的接觸陰影
    function paint(){const base="data/park3d/"+EK+"/",CAMP=new T.Vector3(0,16,9.2),GY=X.FL!=null?X.FL:X.GY,BS=X.FL!=null?Math.max(.4,(SY-X.FL)/(SY-DT)):1;   /* BS＝地面抬高後凳子、長榻跟著縮小的比例（坐的高度不變） */   /* 道具都站在（抬高後的）地面上 */
      const use=(n,fn)=>{const src=base+n+".webp",go=()=>{const im=imgCache[src];if(im&&im.naturalWidth)fn(im)};if(loadImg(src,go))go()};
      const TXC=new Map(),texOf=(im,own)=>{if(!own&&TXC.has(im))return TXC.get(im);const t=srgb(new T.Texture(im));t.anisotropy=ANI;t.needsUpdate=true;if(!own)TXC.set(im,t);return t};
      const card=(im,o)=>{const h=o.h||o.w*im.naturalHeight/im.naturalWidth,w=o.w||o.h*im.naturalWidth/im.naturalHeight,ax=o.ax==null?.5:o.ax,ay=o.ay||0;
        const geo=new T.PlaneGeometry(w,h);geo.translate(w*(.5-ax),h*(.5-ay),0);
        const m=new T.Mesh(geo,new T.MeshBasicMaterial({map:texOf(im),transparent:true,alphaTest:.05,toneMapped:false,side:T.DoubleSide}));
        const dx=CAMP.x-o.x,dz=CAMP.z-o.z,el=Math.atan2(CAMP.y-o.y,Math.hypot(dx,dz)),ry=Math.atan2(dx,dz);
        m.rotation.order="YXZ";m.rotation.set(-(o.tilt||0)*el,ry,0);if(o.mirror)m.scale.x=-1;m.position.set(o.x,o.y,o.z);if(o.ro!=null)m.renderOrder=o.ro;root.add(m);if(X.bills)X.bills.push({m,y:o.y,tilt:o.tilt||0});
        if(o.info&&X.infos){m.userData.info=o.info;m.userData.img=im;X.infos.push(m)}return{m,w,h,ry}};
      let blobT=null;const blob=(x,y,z,rx,rz,op,ry)=>{blobT=blobT||cv(64,64,g=>{const gr=g.createRadialGradient(32,32,0,32,32,32);gr.addColorStop(0,"rgba(0,0,0,1)");gr.addColorStop(.45,"rgba(0,0,0,.55)");gr.addColorStop(1,"rgba(0,0,0,0)");g.fillStyle=gr;g.fillRect(0,0,64,64)});
        const m=new T.Mesh(new T.PlaneGeometry(rx*2,rz*2),new T.MeshBasicMaterial({map:blobT,transparent:true,opacity:op||.35,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
        m.rotation.set(-PI/2,0,ry||0);m.position.set(x,y,z);root.add(m)};
      // 桌面：手繪的圓桌面鋪在桌頂（棋盤底下），受光、收得到棋盤與棋子的影子
      use("tabletop",im=>{const t=texOf(im,1),[cx,cy,r]=PP.top||[im.naturalWidth/2,im.naturalHeight/2,im.naturalWidth/2],iw=im.naturalWidth,ih=im.naturalHeight;
        t.repeat.set(2*r/iw,2*r/ih);t.offset.set((cx-r)/iw,1-(cy+r)/ih);
        const SQ={qin:7.9,sui:7.8,wudai:7.7,song:7.7,ming:7.9}[EK],TRd=SQ?SQ-.55:8.2;   /* 意見回饋 421：方桌（秦、隋、五代、宋、明）上那片 8.2 的圓桌面比桌子還大、凸出桌邊，看起來像桌上又墊了一座大圓石台；方桌改成嵌在桌面裡的圓 */
        const m=new T.Mesh(new T.CircleGeometry(TRd,96),new T.MeshStandardMaterial({map:t,color:neutOf(X.sc),roughness:.5,toneMapped:false}));m.rotation.x=-PI/2;m.position.y=.006;m.receiveShadow=true;root.add(m);if(X.infos){m.userData.info="table";X.infos.push(m)}});
      // 長榻：放在台座上、Pikafish 後面
      // 橫的長榻／長椅：寬 14；直的單人椅（明、清的圈椅、太師椅）：高 12
      if(!F3D)use("bench",im=>{card(im,Object.assign(im.naturalHeight>im.naturalWidth*.9?{x:0,y:X.FL!=null?X.FL:DT,z:BZ-.4,h:12*BS,tilt:.12}:{x:0,y:X.FL!=null?X.FL:DT,z:BZ-.4,w:14*BS,tilt:.12},{info:"bench"}))});
      // 兩側的三彩鼓凳：站在地上
      if(!F3D)use("stool",im=>{for(const[x,z]of STOOLS){const c=card(im,{x,y:GY,z,h:X.FL!=null?6.2*BS:9.5,tilt:.12,info:"stool"});blob(x,GY+.03,z,c.w*.5,c.w*.3,.4,c.ry)}});
      // 宮燈：掛在立柱的彎鉤上；立柱用 3D 圓柱接到地面（右邊那盞左右翻過來，立柱都在外側）；燭光一團加色柔光，會跳動
      if(EK!=="tang"&&PP.lamp)use("lantern",im=>{const L=PP.lamp,postM=new T.MeshBasicMaterial({color:0x2E2721,toneMapped:false});
        for(const[sx,x,z]of LAMPS){
          if(!L.hang){const c=card(im,{x,y:GY,z,h:L.h,tilt:.3,info:"lantern"});blob(x,GY+.03,z,c.w*.4,c.w*.3,.35,c.ry);
            const nx=Math.sin(c.ry),nz=Math.cos(c.ry);glow(x+nx*.4,GY+L.h*L.glow,z+nz*.4,3.6,.45);continue}
          // 吊掛：燈籠上緣吊在橫桿下，立柱在外側（左邊那盞柱子在左、右邊那盞在右）
          const top=GY+L.h+7.5,c=card(im,{x,y:top,z,h:L.h,ay:1,info:"lantern"}),ux=Math.cos(c.ry),uz=-Math.sin(c.ry),nx=Math.sin(c.ry),nz=Math.cos(c.ry),off=sx*(c.w*.5+1.2);
          const px=x+ux*off-nx*.15,pz=z+uz*off-nz*.15,r=.2,H=top+1.2-GY;
          const post=new T.Mesh(new T.CylinderGeometry(r,r*1.2,H,10),postM);post.position.set(px,GY+H/2,pz);root.add(post);
          const arm=new T.Mesh(new T.CylinderGeometry(.12,.12,Math.abs(off)+.3,8),postM);arm.rotation.order="YXZ";arm.rotation.set(0,c.ry,PI/2);arm.position.set(x+ux*off/2-nx*.15,top+.9,z+uz*off/2-nz*.15);root.add(arm);
          const cord=new T.Mesh(new T.CylinderGeometry(.04,.04,.9,6),postM);cord.position.set(x-nx*.05,top+.45,z-nz*.05);root.add(cord);
          const ft=new T.Mesh(new T.CylinderGeometry(r*2.4,r*3.2,.8,12),postM);ft.position.set(px,GY+.4,pz);root.add(ft);blob(px,GY+.03,pz,1.4,1.4,.35);
          glow(x+nx*.4,top-L.h*(1-L.glow),z+nz*.4,3.6,.45)}});
      if(EK==="tang")use("lantern",im=>{const h=11,w=h*im.naturalWidth/im.naturalHeight,LY=-3.2,PX=.259,CX=.53,CY=.39,postM=new T.MeshBasicMaterial({color:0x2E2721,toneMapped:false}),gm=gold();
        for(const[sx,x,z]of LAMPS){const c=card(im,{x,y:LY,z,h,ax:CX,ay:CY,mirror:sx>0,info:"lantern"}),ux=Math.cos(c.ry),uz=-Math.sin(c.ry),nx=Math.sin(c.ry),nz=Math.cos(c.ry),off=(PX-CX)*w*(sx>0?-1:1);
          const px=x+ux*off-nx*.12,pz=z+uz*off-nz*.12,top=LY+(1-CY)*h,r=w*15/349/2;
          // 立柱分兩段：圖上彎鉤那段往上延伸、燈籠下緣以下接到地面；燈籠擋住的那段不做（不然從上往下看，柱子像是穿過燈籠）
          const seg=(y0,y1,r0,r1)=>{const p=new T.Mesh(new T.CylinderGeometry(r0,r1,y1-y0,10),postM);p.position.set(px,(y0+y1)/2,pz);root.add(p)},yb=top-h*470/640;
          seg(top-.4,top+.9,r,r);seg(GY,yb,r,r*1.15);
          const cap=new T.Mesh(new T.SphereGeometry(r*1.9,12,8),gm);cap.position.set(px,top+1.05,pz);root.add(cap);
          const ft=new T.Mesh(new T.CylinderGeometry(r*2.4,r*3.2,.8,12),postM);ft.position.set(px,GY+.4,pz);root.add(ft);blob(px,GY+.03,pz,1.4,1.4,.35);
          glow(x+nx*.4,LY,z+nz*.4,4.6,.5)}});
      // 樹：牡丹樹、松樹輪流，站在平台邊上，轉頭時當畫面的框
      [[-14.8,-13.2,"tree2",17],[17.8,-8.2,"tree1",14.5],[-18.2,3.4,"tree1",12.5]].forEach(([x,z,n,h])=>use(n,im=>{const c=card(im,{x,y:GY,z,h,tilt:.12,info:n});blob(x,GY+.03,z,c.w*.32,c.w*.2,.35,c.ry);if(X.fades)X.fades.push(c.m)}));
      /* 11/10 經典世界（Gemini 70／71，開發者選「補齊 Gemini 的元素」）：空中兩卷懸浮畫卷（緩緩上下漂），石台外兩位淡墨幻影棋客（半透明、像呼吸一樣忽濃忽淡） */
      if(EK==="classic"){const lastB=c=>{const b=X.bills&&X.bills[X.bills.length-1];return b&&b.m===c.m?b:null};
        use("scroll",im=>[[-11.5,10.5,-16,3.6,0],[12.5,12.5,-14.5,3,1]].forEach(([x,y,z,h,mi],i)=>{const c=card(im,{x,y:GY+y,z,h,mirror:!!mi}),b=lastB(c);if(b)b.bob=[2.1,i*2.1,.4]}));   /* Gemini 72：畫卷 3 秒一週期上下漂、幻影 4 秒一週期呼吸 */
        use("ghost",im=>[[-23,-19,11,0],[24,-16,10.5,1]].forEach(([x,z,h,mi],i)=>{const c=card(im,{x,y:GY,z,h,mirror:!!mi,tilt:.08});c.m.material.opacity=.3;c.m.material.depthWrite=false;const b=lastB(c);if(b)b.br=[1.57,i*1.7,.3,.08]}));
        /* Gemini 72（開發者選「兩個都要」）：石台地上用淡金細虛線刻一張大楚河漢界棋盤（9 直 10 橫、河界、九宮斜線，程式畫保證正確），
           右側刻北斗七星連線，天樞到玉衡五顆（五站）微微發光；只畫在石台圓面裡 */
        {const PS=40,PX=1024,k=PX/PS,cx=x=>(x+PS/2)*k,cz=z=>(z+PS/2)*k,BWg=20,BHg=22.5,c0=-BWg/2,r0=-BHg/2,cs=BWg/8;
          const DIP=[[12.5,2],[16.3,2],[16.9,-1.8],[13.1,-2.2],[11.2,-5.2],[10.4,-7.9],[11.6,-10.7]];   /* 天樞、天璇、天璣、天權、玉衡、開陽、搖光 */
          const tx=cv(PX,PX,(g,w,h)=>{g.clearRect(0,0,w,h);g.save();g.beginPath();g.arc(w/2,h/2,(21-.6)*k,0,TAU);g.clip();
            g.strokeStyle="rgba(214,182,104,.5)";g.lineWidth=3;g.setLineDash([14,9]);const L=(x1,z1,x2,z2)=>{g.beginPath();g.moveTo(cx(x1),cz(z1));g.lineTo(cx(x2),cz(z2));g.stroke()};
            for(let r=0;r<10;r++)L(c0,r0+r*cs,c0+BWg,r0+r*cs);
            for(let c=0;c<9;c++){if(c===0||c===8)L(c0+c*cs,r0,c0+c*cs,r0+9*cs);else{L(c0+c*cs,r0,c0+c*cs,r0+4*cs);L(c0+c*cs,r0+5*cs,c0+c*cs,r0+9*cs)}}
            for(const r of[0,7]){L(c0+3*cs,r0+r*cs,c0+5*cs,r0+(r+2)*cs);L(c0+5*cs,r0+r*cs,c0+3*cs,r0+(r+2)*cs)}
            g.setLineDash([6,8]);g.strokeStyle="rgba(232,206,136,.6)";g.lineWidth=2.5;g.beginPath();[0,1,2,3,0].forEach((i,j)=>g[j?"lineTo":"moveTo"](cx(DIP[i][0]),cz(DIP[i][1])));g.stroke();
            g.beginPath();[3,4,5,6].forEach((i,j)=>g[j?"lineTo":"moveTo"](cx(DIP[i][0]),cz(DIP[i][1])));g.stroke();g.setLineDash([]);
            DIP.forEach(([x,z],i)=>{g.fillStyle=i<5?"rgba(255,244,214,.95)":"rgba(226,200,140,.7)";g.beginPath();g.arc(cx(x),cz(z),i<5?7:5,0,TAU);g.fill()});g.restore()});
          const gm=new T.Mesh(new T.PlaneGeometry(PS,PS),new T.MeshBasicMaterial({map:tx,transparent:true,depthWrite:false,toneMapped:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3}));
          gm.rotation.x=-PI/2;gm.position.set(0,GY+.03,0);gm.renderOrder=1;root.add(gm);
          DIP.slice(0,5).forEach(([x,z])=>glow(x,GY+.25,z,1.8,.4))}
        /* hspx 11/10「讓經典世界的雲有流動的視覺效果」：石台外圍一圈大片淡雲，慢慢繞著石台飄（遠近、高低、快慢各不同） */
        {const ct=cv(256,128,(g,w,h)=>{g.clearRect(0,0,w,h);const P=[[64,82,34],[104,66,40],[150,62,44],[192,80,32],[128,90,36]];   /* 水墨雲朵：幾團圓疊成一朵，淡灰墨邊、底部一點陰影 */
            const blob=()=>{g.beginPath();for(const[x,y,r]of P){g.moveTo(x+r,y);g.arc(x,y,r,0,TAU)}};g.save();g.beginPath();g.rect(0,0,w,h-14);g.clip();
            blob();g.lineWidth=5;g.strokeStyle="rgba(110,120,140,.42)";g.stroke();   /* 先描粗線、再填白：裡面的線被蓋掉，只留外輪廓 */
            blob();const gr=g.createLinearGradient(0,20,0,h-14);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.7,"rgba(246,248,251,1)");gr.addColorStop(1,"rgba(206,213,226,1)");g.fillStyle=gr;g.fill();
            g.fillStyle="rgba(110,120,140,.35)";g.fillRect(14,h-16,w-28,2);g.restore()});
          for(let i=0;i<12;i++){const op=.55+Math.random()*.25,s=new T.Sprite(new T.SpriteMaterial({map:ct,transparent:true,opacity:op,depthWrite:false,toneMapped:false,fog:false}));s.renderOrder=4;
            const r=21+Math.random()*8,y=GY+.5+Math.random()*3,sz=10+Math.random()*10;s.scale.set(sz*1.4,sz*.7,1);root.add(s);if(X.bills)X.bills.push({m:s,y,tilt:0,orb:[r,i/12*TAU+Math.random()*.4,(.006+Math.random()*.008)*(i%3?1:-1),y,op]})}}
        /* 桌角一個青瓷小香爐（茶杯的對角），爐頂飄淡淡的白煙（程式畫、會往上飄散） */
        use("censer",im=>{const x=5.9,z=-4.4,c=card(im,{x,y:.015,z,h:1.5,tilt:.3}),b=lastB(c);if(b)Object.assign(b,{cup:[x,z],hb:0});
          const st=radial("rgba(255,255,255,.85)","rgba(255,255,255,.35)");for(let i=0;i<4;i++){const s=new T.Sprite(new T.SpriteMaterial({map:st,transparent:true,opacity:0,depthWrite:false,toneMapped:false,fog:false}));root.add(s);if(X.bills)X.bills.push({m:s,y:0,tilt:0,smk:[x,1.25,z,i/4]})}})}
      // 茶杯：從斜上方看的手繪茶碗，立牌整張正對鏡頭、下緣貼著杯托前緣（Pikafish 一杯、我一杯，位置跟原本一樣）
      /* 意見回饋 423：茶杯看起來沒有平放——原本立牌的下緣往「舊的鏡頭位置 (0,16,9.2)」挪，鏡頭拉高、繞桌轉之後杯子就歪、浮、滑到杯影外面。
         改成：找出圖上杯托最寬的那一列（＝杯托圓心，杯子真正落在桌上的點）當轉軸，每一格都讓這個點落在鏡頭看向杯位的那條視線上、
         整張正對鏡頭；轉軸沿視線往鏡頭挪到剛好整張都在桌面上方（不插進桌面），畫面上杯托圓心永遠蓋在桌上的杯位、杯影正中間 */
      const cupAY=im=>{try{const c=document.createElement("canvas"),W0=64,H0=Math.max(8,Math.round(64*im.naturalHeight/im.naturalWidth));c.width=W0;c.height=H0;const g=c.getContext("2d");g.drawImage(im,0,0,W0,H0);
          const d=g.getImageData(0,0,W0,H0).data,ns=[];for(let y=Math.floor(H0*.55);y<H0;y++){let n=0;for(let x=0;x<W0;x++)if(d[(y*W0+x)*4+3]>128)n++;ns.push([y,n])}
          const mx=Math.max(...ns.map(r=>r[1])),band=ns.filter(r=>r[1]>=mx*.97).map(r=>r[0]),row=(Math.min(...band)+Math.max(...band))/2;
          return clamp((H0-row-.5)/H0,.06,.45)}catch(e){return .3}};
      /* 有幾張茶杯圖去背時把杯身、杯托中間挖破了（宋、南北朝…），看得到後面的桌子：跟外面不連通的透明洞補起來（用旁邊的顏色往內填） */
      const fixCup=im=>{try{const w=im.naturalWidth,h=im.naturalHeight,c=document.createElement("canvas");c.width=w;c.height=h;const g=c.getContext("2d");g.drawImage(im,0,0);
          const id=g.getImageData(0,0,w,h),d=id.data,N=w*h,out=new Uint8Array(N),q=new Int32Array(N);let qh=0,qt=0;const tr=i=>d[i*4+3]<128;
          for(let x=0;x<w;x++)for(const y of[0,h-1]){const i=y*w+x;if(tr(i)&&!out[i]){out[i]=1;q[qt++]=i}}
          for(let y=0;y<h;y++)for(const x of[0,w-1]){const i=y*w+x;if(tr(i)&&!out[i]){out[i]=1;q[qt++]=i}}
          while(qh<qt){const i=q[qh++],x=i%w;for(const j of[x>0?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<N&&!out[j]&&tr(j)){out[j]=1;q[qt++]=j}}
          let hole=[];for(let i=0;i<N;i++)if(tr(i)&&!out[i])hole.push(i);if(!hole.length)return im;
          for(let pass=0;pass<400&&hole.length;pass++){const next=[],done=[];for(const i of hole){const x=i%w;let r=0,gg=0,b=0,n=0;
              for(const j of[x>0?i-1:-1,x<w-1?i+1:-1,i-w,i+w])if(j>=0&&j<N&&d[j*4+3]>=128){r+=d[j*4];gg+=d[j*4+1];b+=d[j*4+2];n++}
              if(n)done.push([i,r/n,gg/n,b/n]);else next.push(i)}
            for(const[i,r,gg,b]of done){d[i*4]=r;d[i*4+1]=gg;d[i*4+2]=b;d[i*4+3]=255}if(!done.length)break;hole=next}
          g.putImageData(id,0,0);c.naturalWidth=w;c.naturalHeight=h;return c}catch(e){return im}};
      /* 意見回饋 456、479（開發者：杯子還是沒有正確放在桌上）：手繪的平面茶杯從側面、低角度看會浮起來；改成每個朝代都用立體的 3D 茶杯（create 裡的 teaCup），從哪個角度看都平放在桌上 */
      if(false)use("cup",im0=>{const im=fixCup(im0),ay=cupAY(im);for(const[x,z]of[[0,-6.85],[.4,7.0]]){const w=1.8,h=w*im.naturalHeight/im.naturalWidth;
        blob(x,.02,z,w*.47,w*.44,.3,0);const c=card(im,{x,y:.015,z,w,ax:.5,ay,tilt:1,info:"cup"});c.m.renderOrder=1;
        const b=X.bills&&X.bills[X.bills.length-1];if(b&&b.m===c.m)Object.assign(b,{cup:[x,z],hb:ay*h})}});}
    return{frame:f.frame||0x5C3418,tick(s){for(const F of flames){const n=Math.sin(s*11+F.ph)*.5+Math.sin(s*17.3+F.ph*2)*.3+Math.sin(s*5.1+F.ph)*.2;
      if(F.k===2){F.o.scale.y=F.s*(1+.18*n);F.o.position.y=F.y0*(1+.09*n);F.o.rotation.y=s*.7+F.ph}else F.o.scale.setScalar(F.s*(1+(F.k?.07:.03)*n))}}}}

  function create(host,opt){opt=opt||{};
    const el=document.createElement("div");el.className="park3d";el.style.cssText="position:relative;width:100%;border-radius:14px;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;background:#A9CBE8";
    host.append(el);
    /* 11/11 省電模式：建園子當下就判斷一次（電池要等非同步結果，之後每秒重判）；省電時抗鋸齒不開、畫素比最多 1、太陽不投影 */
    pwBat();const PW0=pwDecide(pwMode(),pwSig()),PW={on:PW0.on,s0:performance.now()/1000,dirty:0,lastR:0,lastAct:0,fw:{t0:0,n:0,lp:0},low:0,q:[],sec:0,shownAt:0};
    const pwPoke=ms=>{PW.dirty=Math.max(PW.dirty,performance.now()+ms)},pwT=()=>PW.on?PW.s0*1000:performance.now();   /* pwT：省電時飄雲、香爐煙、懸浮畫卷、幻影呼吸的時間停住 */
    let rd;try{rd=new T.WebGLRenderer({antialias:!PW0.on,powerPreference:PW0.on?"low-power":"high-performance"})}catch(e){el.remove();return null}
    PF.aa=!PW0.on;PF.power=PW0.on;PF.why=PW0.why;PF.mode=pwMode();
    rd.setPixelRatio(Math.min(PW0.on?1:2,window.devicePixelRatio||1));rd.shadowMap.enabled=true;rd.shadowMap.type=T.PCFSoftShadowMap;
    // 正確的色彩管理：顏色碼當螢幕色（跟 car3d 一樣）、輸出 sRGB；之前整個場景在 gamma 空間打光＋ACES，顏色被洗白
    if(T.ColorManagement)T.ColorManagement.legacyMode=false;if(T.sRGBEncoding!=null)rd.outputEncoding=T.sRGBEncoding;if(T.SRGBColorSpace)rd.outputColorSpace=T.SRGBColorSpace;
    rd.toneMapping=T.ACESFilmicToneMapping;rd.toneMappingExposure=.98;try{ANI=rd.capabilities.getMaxAnisotropy()||8}catch(e){}
    rd.domElement.style.cssText="display:block;width:100%;height:100%";el.append(rd.domElement);
    const hint=document.createElement("div");hint.style.cssText="position:absolute;left:50%;bottom:8px;transform:translateX(-50%);font:600 11px sans-serif;color:#fff;background:rgba(30,20,10,.45);padding:3px 10px;border-radius:99px;white-space:nowrap;pointer-events:none;transition:opacity .6s";
    // 意見回饋 251：載入時不是一行字，而是小帥原地走路去公園（樹和遠山往後退，看起來像在走），全部載好就淡出
    const veil=document.createElement("div");veil.style.cssText="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;font:600 14px sans-serif;color:#6b5a44;pointer-events:none;transition:opacity .35s;overflow:hidden;background:linear-gradient(#EAF1F6,#F4ECDC 70%)";
    {let ch="帥";try{const L=window.XQ_BOTLOOK&&window.XQ_BOTLOOK();if(L&&L.p)ch=L.p}catch(e){}
     const tree=x=>`<g transform="translate(${x},0)"><rect x="-3" y="92" width="6" height="22" fill="#7a5a3a"/><circle cx="0" cy="84" r="14" fill="#6f8f5f"/><circle cx="-9" cy="92" r="9" fill="#7fa06a"/><circle cx="9" cy="91" r="10" fill="#5f7f50"/></g>`;
     veil.innerHTML=`<style>
      @keyframes xwScroll{from{transform:translateX(0)}to{transform:translateX(-160px)}}@keyframes xwFar{from{transform:translateX(0)}to{transform:translateX(-80px)}}
      @keyframes xwBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}
      @keyframes xwLegA{0%,100%{transform:rotate(22deg)}50%{transform:rotate(-22deg)}}@keyframes xwLegB{0%,100%{transform:rotate(-22deg)}50%{transform:rotate(22deg)}}
      @keyframes xwArmA{0%,100%{transform:rotate(-28deg)}50%{transform:rotate(28deg)}}@keyframes xwArmB{0%,100%{transform:rotate(28deg)}50%{transform:rotate(-28deg)}}
      @keyframes xwDots{0%{content:""}33%{content:"．"}66%{content:"．．"}100%{content:"．．．"}}
      .xw-far{animation:xwFar 6s linear infinite}.xw-near{animation:xwScroll 2.4s linear infinite}.xw-bob{animation:xwBob .5s ease-in-out infinite}
      .xw-la{transform-origin:72px 118px;animation:xwLegA .5s ease-in-out infinite}.xw-lb{transform-origin:88px 118px;animation:xwLegB .5s ease-in-out infinite}
      .xw-aa{transform-origin:58px 98px;animation:xwArmA .5s ease-in-out infinite}.xw-ab{transform-origin:102px 98px;animation:xwArmB .5s ease-in-out infinite}
      .xw-t::after{content:"";animation:xwDots 1.2s steps(1) infinite}</style>
      <svg viewBox="0 0 160 150" width="200" height="188" style="overflow:hidden">
        <g class="xw-far" opacity=".55">${[0,80,160].map(x=>`<path d="M${x-10} 110 L${x+20} 70 L${x+45} 95 L${x+60} 78 L${x+90} 110Z" fill="#B9C6CF"/>`).join("")}</g>
        <g class="xw-near">${[10,90,170,250].map(tree).join("")}</g>
        <rect x="0" y="134" width="160" height="16" fill="#D9C7A3"/><g class="xw-near">${[0,40,80,120,160,200,240,280].map(x=>`<rect x="${x}" y="140" width="18" height="3" rx="1.5" fill="#C4AF86"/>`).join("")}</g>
        <ellipse cx="80" cy="136" rx="20" ry="4" fill="rgba(0,0,0,.15)"/>
        <g class="xw-la"><rect x="69" y="112" width="6" height="16" rx="3" fill="#F6EEE0"/><ellipse cx="72" cy="130" rx="8" ry="4.5" fill="#D02A1F"/></g>
        <g class="xw-lb"><rect x="85" y="112" width="6" height="16" rx="3" fill="#F6EEE0"/><ellipse cx="88" cy="130" rx="8" ry="4.5" fill="#D02A1F"/></g>
        <g class="xw-bob">
          <g class="xw-aa"><ellipse cx="54" cy="104" rx="6" ry="9" fill="#FFFDF8" stroke="#5a3a20" stroke-width="1"/></g>
          <g class="xw-ab"><ellipse cx="106" cy="104" rx="6" ry="9" fill="#FFFDF8" stroke="#5a3a20" stroke-width="1"/></g>
          <circle cx="80" cy="98" r="24" fill="#C98A4E" stroke="#E3B341" stroke-width="3"/><circle cx="80" cy="98" r="17" fill="#FFF6E2" stroke="#D02A1F" stroke-width="1.6"/>
          <text x="80" y="105" text-anchor="middle" font-size="19" font-weight="900" fill="#C8102E" font-family="'Noto Serif TC','PMingLiU',serif">${ch}</text>
          <rect x="57" y="110" width="46" height="4" rx="1" fill="#3a2a20"/>
          <circle cx="80" cy="56" r="21" fill="#FFFDF8" stroke="#5a3a20" stroke-width="1"/>
          <circle cx="73" cy="56" r="2.6" fill="#2a1a10"/><circle cx="87" cy="56" r="2.6" fill="#2a1a10"/><circle cx="80" cy="62" r="2.4" fill="#D02A1F"/>
          <circle cx="68" cy="63" r="3.6" fill="#F7B6B6" opacity=".8"/><circle cx="92" cy="63" r="3.6" fill="#F7B6B6" opacity=".8"/>
          <path d="M76 68 Q80 71 84 68" stroke="#2a1a10" stroke-width="1.4" fill="none" stroke-linecap="round"/>
          <rect x="66" y="31" width="28" height="9" rx="2" fill="#D02A1F"/><circle cx="80" cy="29" r="3.4" fill="#E3B341"/><circle cx="72" cy="36" r="2.4" fill="#222"/>
        </g></svg><div class="xw-t">${(()=>{try{return JSON.parse(localStorage.getItem("m_pSex"))==="f"}catch(e){return false}})()?"小帥妹":"小帥"}走去園子</div>`;
     /* 意見回饋 392：「小帥走去公園」換成 Gemini 手繪的走路圖（data/xs/walk_1～8 輪流換），身上貼玩家選的棋子字；圖還沒到之前先用原本畫的 */
     /* 意見回饋 492：選女生的話，走去園子的是小帥妹（data/xs/girl/） */const XD=(()=>{try{return JSON.parse(localStorage.getItem("m_pSex"))==="f"}catch(e){return false}})()?"data/xs/girl/":"data/xs/";fetch(XD+"xs.json").then(r=>r.ok?r.json():null).then(m=>{if(!m||!veil.isConnected)return;const fr=[1,2,3,4,5,6,7,8].map(i=>{const im=new Image();im.src=XD+"walk_"+i+".webp";return im});
       return Promise.all(fr.map(im=>im.decode())).then(()=>{const svg=veil.querySelector("svg");if(!svg||!veil.isConnected)return;const g=svg.querySelector(".xw-bob");if(g)g.style.display="none";
         const box=document.createElement("div");box.style.cssText="position:relative;width:200px;height:188px";svg.replaceWith(box);box.append(svg);
         const Hh=120,Ww=Hh*m.w/m.h,f=m.poses.walk_1||m.poses.xs_idle,R=f.r*Ww*.82,red="帥仕相俥傌炮兵".includes(ch);
         const w=document.createElement("div");w.className="xw-bob";w.style.cssText=`position:absolute;left:${100-Ww/2}px;bottom:36px;width:${Ww}px;height:${Hh}px`;
         w.innerHTML=`<img alt="" src="${fr[0].src}" style="display:block;width:100%;height:100%"><b style="position:absolute;left:${f.cx*Ww-R}px;top:${f.cy*Hh-R}px;width:${2*R}px;height:${2*R}px;display:flex;align-items:center;justify-content:center;border-radius:50%;background:#F7EFDD;font:900 ${R*1.25}px/1 'Noto Serif TC','PMingLiU',serif;color:${red?"#C8102E":"#1E1A16"}">${ch}</b>`;
         box.append(w);const pic=w.querySelector("img");let i=0;const iv=setInterval(()=>{if(!veil.isConnected||veil.style.opacity==="0")return clearInterval(iv);i=(i+1)%8;pic.src=fr[i].src},110)})}).catch(()=>{})}
    /* 意見回饋 396：從朝代擂台進來時，載入畫面換成那個朝代的「擂台入口」（Gemini 畫的 data/arenagate/<朝代>.webp），鼓點節奏的「擂台開擂」，不是小帥走路 */
    if(opt.arena&&/^[a-z]+$/.test(opt.arena)){veil.style.background="#2a1a10";veil.style.color="#fff";
      veil.innerHTML=`<style>@keyframes agDrum{0%,100%{transform:scale(1)}10%{transform:scale(1.14)}22%{transform:scale(1)}34%{transform:scale(1.08)}46%{transform:scale(1)}}@keyframes agZoom{from{transform:scale(1.12)}to{transform:scale(1)}}@keyframes agDots{0%{content:""}33%{content:"．"}66%{content:"．．"}100%{content:"．．．"}}.ag-t::after{content:"";animation:agDots 1.2s steps(1) infinite}</style>
        <div style="position:absolute;inset:0;background:url(data/arenagate/${opt.arena}.webp) center/cover;animation:agZoom 3s ease-out forwards"></div>
        <div style="position:absolute;inset:0;background:linear-gradient(rgba(20,10,4,.55),rgba(20,10,4,.05) 45%,rgba(20,10,4,.35))"></div>
        <div style="position:relative;margin-bottom:40%;text-align:center;text-shadow:0 2px 10px rgba(0,0,0,.85)"><div style="font-size:46px;animation:agDrum 1.1s ease-in-out infinite">🥁</div>
        <div style="font:900 26px 'Noto Serif TC','PMingLiU',serif;letter-spacing:.2em;margin-top:4px">擂台開擂</div><div class="ag-t" style="font:600 14px sans-serif;margin-top:4px">擂主登台中</div></div>`}
    /* 意見回饋 410：石桌往事選完朝代、線上對戰進公園時，過場也換成畫好的入口圖（跟朝代擂台一樣），不再是小帥走路。
       opt.gate＝{img:[依序試的圖], icon, title, sub, duel（線上：帥和將從兩邊衝過來碰一下）, bg} */
    else if(opt.gate&&opt.gate.title){const G=opt.gate,gtDur=G=>G.quote&&G.quote.q?Math.min(9000,Math.max(4800,3200+String(G.quote.q).length*120)):G.walk,imgs=(G.img||[]).filter(u=>typeof u==="string"&&/^data\/[\w\/.-]+$/.test(u));
      veil.style.background=/^#[0-9a-f]{3,8}$/i.test(G.bg||"")?G.bg:"#22201c";veil.style.color="#fff";
      veil.innerHTML=`<style>@keyframes gtZoom{from{transform:scale(1.12)}to{transform:scale(1)}}@keyframes gtWalk{0%{transform:scale(1.03)}22%{transform:scale(1.05)}100%{transform:scale(2.1)}}@keyframes gtGlow{0%,62%{opacity:0}100%{opacity:.92}}@keyframes gtTxt{0%{opacity:0;transform:translateY(8px)}14%,58%{opacity:1;transform:none}80%,100%{opacity:0;transform:translateY(-6px)}}@keyframes gtDots{0%{content:""}33%{content:"．"}66%{content:"．．"}100%{content:"．．．"}}.gt-s::after{content:"";animation:gtDots 1.2s steps(1) infinite}
        @keyframes gtBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}@keyframes gtQ{to{opacity:1;transform:none}}
        @keyframes gtL{0%{transform:translateX(-120px) rotate(-30deg)}45%,55%{transform:translateX(-26px) rotate(0)}100%{transform:translateX(-120px) rotate(-30deg)}}
        @keyframes gtR{0%{transform:translateX(120px) rotate(30deg)}45%,55%{transform:translateX(26px) rotate(0)}100%{transform:translateX(120px) rotate(30deg)}}
        @keyframes gtSpark{0%,40%{opacity:0;transform:scale(.3)}50%{opacity:1;transform:scale(1.25)}62%,100%{opacity:0;transform:scale(1.6)}}
        .gt-c{position:absolute;left:50%;top:0;width:52px;height:52px;margin-left:-26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font:900 26px 'Noto Serif TC','PMingLiU',serif;background:radial-gradient(circle at 40% 35%,#fff8ec,#efd9b2);box-shadow:0 6px 12px rgba(0,0,0,.45)}</style>
        <div class="gt-bg" style="position:absolute;inset:0;background:center/cover no-repeat;${G.walk?`transform-origin:50% 52%;animation:gtWalk ${(gtDur(G)/1000).toFixed(1)}s cubic-bezier(.45,0,.75,.55) forwards`:`animation:gtZoom ${G.quote?7:3}s ease-out forwards`}"></div>${G.walk?`<div style="position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 52%,#fffaf0 0%,rgba(255,250,240,.85) 40%,rgba(255,250,240,.6) 100%);opacity:0;animation:gtGlow ${(gtDur(G)/1000).toFixed(1)}s ease-in forwards"></div>`:""}
        <div style="position:absolute;inset:0;background:linear-gradient(rgba(10,8,6,.55),rgba(10,8,6,.05) 45%,rgba(10,8,6,.4))"></div>
        <div style="position:relative;margin-bottom:40%;text-align:center;text-shadow:0 2px 10px rgba(0,0,0,.85);${G.walk?`animation:gtTxt ${(gtDur(G)/1000).toFixed(1)}s ease forwards`:""}"><div class="gt-i" style="font-size:44px;animation:gtBob 1.4s ease-in-out infinite"></div>
        <div class="gt-t" style="font:900 26px 'Noto Serif TC','PMingLiU',serif;letter-spacing:.2em;margin-top:4px"></div><div class="gt-s" style="font:600 14px sans-serif;margin-top:4px"></div>
        ${G.duel?'<div style="position:relative;height:60px;margin-top:18px"><div class="gt-c" style="color:#C8102E;border:3px solid #C8102E;animation:gtL 1.6s ease-in-out infinite">帥</div><div class="gt-c" style="color:#1E1A16;border:3px solid #1E1A16;animation:gtR 1.6s ease-in-out infinite">將</div><div style="position:absolute;left:50%;top:4px;margin-left:-22px;font-size:40px;animation:gtSpark 1.6s ease-out infinite">✨</div></div>':""}</div>${G.quote?'<div class="gt-q" style="position:absolute;left:0;right:0;bottom:0;padding:56px 26px max(30px,env(safe-area-inset-bottom,0px));text-align:center;background:linear-gradient(rgba(10,8,6,0),rgba(10,8,6,.62) 38%,rgba(10,8,6,.78));opacity:0;transform:translateY(10px);animation:gtQ 1.1s .5s ease-out forwards"><div class="gt-qt" style="font:700 clamp(19px,5.4vw,28px)/1.6 BiauKai,Kaiti TC,STKaiti,DFKai-SB,KaiTi,Noto Serif TC,serif;letter-spacing:.06em;text-wrap:balance;max-width:560px;margin:0 auto"></div><div class="gt-qw" style="margin-top:10px;font:600 13.5px/1.5 Noto Serif TC,serif;color:#F2DDB0"></div><div class="gt-qn" style="margin-top:6px;font:500 12px/1.55 sans-serif;color:rgba(255,255,255,.72);max-width:520px;margin-left:auto;margin-right:auto"></div><div style="margin-top:12px;font:500 11px sans-serif;color:rgba(255,255,255,.5)">點一下畫面就進園子</div></div>':""}`;
      veil.querySelector(".gt-i").textContent=G.icon||"";veil.querySelector(".gt-t").textContent=G.title;veil.querySelector(".gt-s").textContent=G.sub||"";
      /* 開發者要求：過場配一句那個朝代棋手的名言，停久一點讓人看完（依字數約 5～9 秒），點一下畫面可以提早進去 */
      /* 11/10 開發者「移至後花園的過場時間太快了，完全沒有味道」：G.walk＝毫秒數，過場至少停這麼久，畫面慢慢推進門洞、字淡出、門外的光亮起來，像走進後園；點一下可以提早進去 */
      if(G.walk>0&&!(G.quote&&G.quote.q)){veil._qmin=Math.min(6000,G.walk);veil.style.pointerEvents="auto";veil.addEventListener("pointerdown",()=>{veil._qskip=true},{once:true})}
      if(G.quote&&G.quote.q){const Q=G.quote;veil.querySelector(".gt-qt").textContent="「"+Q.q+"」";veil.querySelector(".gt-qw").textContent="── "+(Q.who||"")+(Q.src?"　"+Q.src:"");veil.querySelector(".gt-qn").textContent=Q.n||"";
        veil._qmin=Math.min(9000,Math.max(4800,3200+String(Q.q).length*120));veil.style.pointerEvents="auto";veil.addEventListener("pointerdown",()=>{veil._qskip=true},{once:true})}
      const bg=veil.querySelector(".gt-bg");(function tryI(i){if(i>=imgs.length)return;const im=new Image();im.onload=()=>{bg.style.backgroundImage="url("+imgs[i]+")"};im.onerror=()=>tryI(i+1);im.src=imgs[i]})(0)}
    el.append(veil);try{if(veil.querySelector(".gt-t,.ag-t")&&window.XQ_DRUM&&!(opt.gate&&opt.gate.quiet))window.XQ_DRUM(eraKey(),opt.arena?"arena":"gate")}catch(e){}   /* 意見回饋 499：過場敲一段朝代的鼓和鑼；gate.quiet（回饋 871 車輪戰棋館的載入畫面）不敲 */
    hint.textContent="點棋子走棋・點物件看介紹・拖曳轉頭・兩指縮放";el.append(hint);if(veil._qmin)hint.style.opacity=0;else setTimeout(()=>hint.style.opacity=0,4500);   /* 有名言的過場：操作提示等過場收掉才出現 */
    /* 開發者 11/11 hspx「讓車輪戰也能有對戰的環景切換功能」：opt.era＝指定朝代（車輪戰在江南棋館，用明朝的家具和配色）；opt.indoor＝室內（不放樹、手繪道具、落葉、長榻和燈，只有木桌和兩張木凳） */
    const EK=opt.era&&ERA[opt.era]?opt.era:eraKey(),E=ERA[EK];
    /* hspx（開發者 11/12 黑洞星樞棋局）：opt.giant＝巨盤模式——棋盤浮在黑洞環景裡，不放桌椅地面和人物，紅方棋子換成雲河七星、黑方是星樞的發光棋子，鏡頭可以從俯視全盤一路推到站在棋盤上的第一人稱 */
    const GIANT=!!opt.giant;BRIVER=GIANT?"data/park/bh_river.webp":null;
    el.style.background=E.mist;
    let WX=null,CANO=null,MAPL=null,PANM=null,PANDH=0,PANROT=0,PSPOTS=null,MAPM=null,HILL=null,lastKf=-1,MAPO=[],MAPOK="",MAPP=null,MAPMN=0,RON=(()=>{try{return JSON.parse(localStorage.getItem("m_eramapRealm")||"true")!==false}catch(e){return true}})();   /* 地圖上的地名：[名字, x%, y%, 種類]；長卷的網格、圖高、地標（意見回饋 517、525） */
    let RTF=null,RTK="",RTS=null,RTP=null,RTT=0,RTA=0;   /* 意見回饋 658（B 輿圖遊歷）：路線圖層的重畫函式、目前畫的版本、各站位置（點得到）、左下角的提示、上次檢查的時間、上一格地圖的透明度 */
    const sc=new T.Scene(),FARHIDE=[];sc.fog=new T.Fog(new T.Color(E.mist),70,320);sc.background=new T.Color(E.mist);if(GIANT){sc.fog=null;sc.background=new T.Color(0x05060d);el.style.background="#05060d"}   /* 意見回饋 486：環景沒畫到的地方顯示朝代的霧色，不會一片黑 */
    const cam=new T.PerspectiveCamera(50,1,.5,700);try{if(localStorage.getItem("xq_dbg3d"))window.__PK={sc,cam}}catch(e){}try{(window.__PK=window.__PK||{}).perf=PF}catch(e){}   /* 除錯用：localStorage 設 xq_dbg3d 才打開 sc、cam；效能計數 perf 一直都在（11/11 省電模式） */
    // 光：午後斜陽（唯一投影光，陰影範圍只包住石桌，陰影比較銳利）＋暖色天光＋冷色補光；整體對比拉高，不再灰白
    sc.add(new T.HemisphereLight(0xFFF1DA,0x5A4A36,.42));
    const sun=new T.DirectionalLight(0xFFD9A8,1.15);sun.position.set(-18,34,14);sun.castShadow=!PW.on;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-11,right:11,top:11,bottom:-11,near:10,far:80});sun.shadow.bias=-.0004;sun.shadow.normalBias=.02;sun.shadow.radius=3;sc.add(sun);
    const fill=new T.DirectionalLight(0xC8DCFF,.28);fill.position.set(20,12,-18);sc.add(fill);
    // 天空球（含下半部的雲海色）＋水墨長卷
    const sky=new T.Mesh(new T.SphereGeometry(400,32,16),new T.MeshBasicMaterial({map:skyTex(E),side:T.BackSide,fog:false,depthWrite:false,toneMapped:false}));sky.renderOrder=-2;sc.add(sky);FARHIDE.push(sky);   /* 意見回饋 517／525：拉遠功能把天空改成半透明後，天空排到長卷後面畫、整片蓋住長卷（城、蒙古包都看不到）；天空固定最先畫 */
    const BI=opt.bg?{src:opt.bg,pano:true,hz:.58,hor:opt.indoor?-10.2:opt.giant?3:PANO_HOR,rot:0}:BG_IMG[EK],FULL=!!BI;   /* 意見回饋 362：石桌往事的關卡在那一站的地點環景裡下（渡口、聽濤樓茶館、雲河棋會、決賽、石桌） */   // FULL：有朝代長卷，背景是完整一圈，可以整個轉身看
    {const pt=panTex(Object.assign({},E,{userBg:FULL}),EK.length*977+13);pt.wrapS=T.RepeatWrapping;pt.repeat.x=-1;   // 從圓柱內側看，貼圖要左右翻回來
      const arc=FULL?TAU:PAN.arc,pan=new T.Mesh(new T.CylinderGeometry(PAN.r,PAN.r,PAN.yt-PAN.yb,FULL?128:64,1,true,PI-arc/2,arc),new T.MeshBasicMaterial({map:pt,side:T.BackSide,transparent:true,fog:false,depthWrite:false,toneMapped:false}));
      pan.position.y=(PAN.yt+PAN.yb)/2;pan.renderOrder=-1;sc.add(pan);FARHIDE.push(pan);PANM=pan;
      if(BI){const put=()=>{const im=imgCache[BI.src];if(!im||!im.naturalWidth||!el.isConnected)return;try{let pc;
          if(BI.pano){// 整圈長圖：圓柱的高度、位置照圖的比例重做（圖不變形），貼圖換成 4096×1024
            const pg=panoGeo(BI,im.naturalWidth,im.naturalHeight);pan.geometry.dispose();pan.geometry=new T.CylinderGeometry(PAN.r,PAN.r,pg.Hc,128,1,true,0,TAU);pan.position.y=pg.cy;if(opt.indoor){const k=IN_R/PAN.r;pan.scale.setScalar(k);pan.position.y=16+(pg.cy-16)*k}
            const c=pt.image;if(c.width!==PANO.W||c.height!==PANO.H){c.width=PANO.W;c.height=PANO.H;pt.dispose()}pc=drawPano(c.getContext("2d"),c.width,c.height,im,BI);PANDH=Math.round(c.width*im.naturalHeight/im.naturalWidth);PANROT=BI.rot||0;
            /* 意見回饋 525：長卷上每個地標的位置和名字（data/pano/spots.json），點到哪裡就說是哪裡 */
            if(!opt.bg)fetch("data/pano/spots.json").then(r=>r.ok?r.json():null).then(J=>{if(J&&Array.isArray(J[EK]))PSPOTS=J[EK]}).catch(()=>{})}
          else pc=drawUserPan(pt.image.getContext("2d"),pt.image.width,pt.image.height,im,BI);pt.needsUpdate=true;
          // 天空球、霧、底色都換成圖上的宣紙色：長卷上下淡出的地方看不出色帶
          const sk=sky.material.map,sg=sk.image.getContext("2d"),gr=sg.createLinearGradient(0,0,0,sk.image.height),top=new T.Color(pc.top);
          gr.addColorStop(0,"#"+top.clone().lerp(new T.Color(1,1,1),.12).getHexString());gr.addColorStop(.36,pc.top);gr.addColorStop(.5,pc.top);gr.addColorStop(.58,pc.bot);gr.addColorStop(1,pc.bot);
          sg.fillStyle=gr;sg.fillRect(0,0,sk.image.width,sk.image.height);sk.needsUpdate=true;sc.fog.color.set(pc.bot);el.style.background=pc.bot}catch(e){console.warn(e)}};
        if(loadImg(BI.src,put))setTimeout(put,0)}}
    const M=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));
    const mesh=(geo,mat,pos,o)=>{const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);m.castShadow=!(o&&o.noCast);m.receiveShadow=true;sc.add(m);return m};
    const GY=-19,FL=(window.__FL||-6.6);   /* 意見回饋 398：桌子再矮一點（真實的桌高），坐的高度不變、凳子跟著變矮 */   /* 意見回饋 377、381：平台地面抬到 FL（跟真的一樣：桌高、凳子和長榻直接放在地上，不再墊高台座）；GY 只剩程式畫的家具還在用，地面以下看不到 */   // 地面高度（桌面＝0）
    // 山上平台：石板地＋石欄杆，平台外是山谷雲海
    const TR=21,IN_R=80;   /* 室內（車輪戰棋館）房間半徑：環景縮到這裡、地板鋪到這裡 */
    const stone=M(0xffffff,{map:stoneTex("#8C8478",2),roughness:.85}),stone2=M(0xffffff,{map:stoneTex("#776F64",2),roughness:.9});
    const pave=new T.Mesh(new T.CircleGeometry(TR,64),M(0xffffff,{map:paveTex(),roughness:.95}));pave.rotation.x=-PI/2;pave.position.y=FL;pave.receiveShadow=true;sc.add(pave);
    /* 意見回饋 359：朝代的地面（data/pano/<朝代>_ground.webp，Gemini 畫的俯視地面）鋪在石板平台上；頭頂加一個天頂圓（_sky.webp，魚眼天空、邊緣淡出），鏡頭壓低往上看也是畫的天空 */
    {const gs=typeof opt.ground==="string"&&/^data\/[\w\/.-]+\.webp$/.test(opt.ground)?opt.ground:"data/pano/"+EK+"_ground.webp",   /* 11/11：opt.ground＝指定地面（首頁橋上石桌＝橋面條石） */gp=()=>{const im=imgCache[gs];if(!im||!im.naturalWidth||!el.isConnected)return;const t=srgb(new T.Texture(im));t.anisotropy=ANI;t.needsUpdate=true;pave.material.map=t;pave.material.needsUpdate=true};if(loadImg(gs,gp))setTimeout(gp,0);
      const ss="data/pano/"+EK+"_sky.webp",sp=()=>{const im=imgCache[ss];if(!im||!im.naturalWidth||!el.isConnected)return;const TM=1.3,   /* 意見回饋 421：長卷抬高後，天頂圓淡出的那圈收到長卷上緣以上（原本 1.75 會蓋到山頭） */R0=PAN.r-6,g=new T.SphereGeometry(R0,64,24,0,TAU,0,TM),P=g.attributes.position,U=g.attributes.uv;
        for(let i=0;i<P.count;i++){const x=P.getX(i),y=P.getY(i),z=P.getZ(i),th=Math.acos(clamp(y/R0,-1,1)),ph=Math.atan2(z,x),k=th/TM*.5;U.setXY(i,.5+k*Math.cos(ph),.5+k*Math.sin(ph))}U.needsUpdate=true;
        const t=srgb(new T.Texture(im));t.needsUpdate=true;const cap=new T.Mesh(g,new T.MeshBasicMaterial({map:t,side:T.BackSide,transparent:true,depthWrite:false,fog:false,toneMapped:false}));cap.renderOrder=-.5;sc.add(cap);FARHIDE.push(cap)};if(!opt.indoor&&loadImg(ss,sp))setTimeout(sp,0)}
    mesh(new T.CylinderGeometry(TR,TR*.9,26+FL-GY,48,1,true),stone2,[0,FL-(26+FL-GY)/2,0],{noCast:1});
    /* 意見回饋 490（開發者：石台邊像懸崖，希望像雲河棋路那樣是山坡上的大石台）：石台外圍加一圈往外慢慢往下的山坡（草地、碎石），遠的地方淡進霧裡，把石台側面那圈牆蓋住 */
    {const pts=(opt.indoor?[[TR,FL],[50,FL],[IN_R+1,FL]]:[[TR-.2,FL-.06],[TR+4,FL-.9],[TR+12,FL-3.6],[TR+26,FL-9],[TR+46,FL-18],[TR+76,FL-32],[TR+120,FL-52]]).map(([r,y])=>new T.Vector2(r,y));
      const hg=new T.LatheGeometry(pts,96),hb="#"+new T.Color(E.mist).lerp(new T.Color(EK==="yuan"?"#7E8F45":"#4A7A35"),.72).getHexString(),hm=opt.indoor?M(0x9A7A58,{roughness:.95}):M(0xffffff,{map:grassTex(hb,E.ink,10),roughness:.95});
      const hill=new T.Mesh(hg,hm);hill.material.side=T.DoubleSide;hill.receiveShadow=true;sc.add(hill);
      /* hspx（開發者 11/12「車輪戰地面要符合茶肆二樓的地板」「茶肆二樓地板是平的，3D 也要看到是平的；花園不用，是要做出高山的感覺」）：室內外圈改成水平地板一路鋪到牆邊，環景縮成半徑 IN_R 的房間、以鏡頭高度 16 為中心縮放，hor −10.2 度讓畫上的牆腳剛好落在地板邊（公園是 −24 度、半徑 170、往下看的高山感）；室內不放天頂圓；這圈不鋪草，改鋪跟中間同一張木地板，貼圖照平面座標（每 42 單位一張，跟中間圓盤接齊），一路接到環景畫的地板 */
      if(opt.indoor&&typeof opt.ground==="string"&&/^data\/[\w\/.-]+\.webp$/.test(opt.ground)){const U=hg.attributes.uv,P=hg.attributes.position;for(let i=0;i<P.count;i++)U.setXY(i,P.getX(i)/(2*TR)+.5,-P.getZ(i)/(2*TR)+.5);U.needsUpdate=true;
        {const N=hg.attributes.normal;for(let i=0;i<N.count;i++)N.setXYZ(i,0,N.getY(i)<0?-1:1,0);N.needsUpdate=true}   /* 受光跟中間的平地一樣（斜坡的法線朝外會比較暗，交界看得出一圈亮帶） */
        const gs2=opt.ground,hp=()=>{const im=imgCache[gs2];if(!im||!im.naturalWidth||!el.isConnected)return;const t=srgb(new T.Texture(im));t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=ANI;t.needsUpdate=true;hill.material.map=t;hill.material.color.set(0xffffff);hill.material.needsUpdate=true};if(loadImg(gs2,hp))setTimeout(hp,0)}
      /* 11/10 開發者「對戰的位置上頭搭一個朝代的遮篷，即使不下雨也會用；下雨時雨照樣下，但篷子下面淋不到」（Gemini 59 號，開發者選：程式畫＋水墨描邊、下雨布幔垂下、五組一次做完）
         五組：秦～南北朝 帷幄（原木柱、平頂黑褐幄、朱紅垂邊）；隋唐 涼棚（朱漆柱、青布四角攢尖、金流蘇；顧問：「華蓋」是帝王傘蓋，不用這個名）；五代宋＋棋鎮 竹竿布棚（竹竿、米白麻布人字頂）；
         元 氈帳（粗木柱、灰白氈微圓頂、藍邊）；明清 捲棚（方木柱、黃褐油布捲棚頂）。柱子用一般材質（後面的水墨處理會加墨線），篷頂、布幔另描一圈墨線。
         篷頂在鏡頭上方以外（預設斜上方、俯視）都淡成半透明，棋盤和對手一定看得清楚；平視（鏡頭低於簷口）才是實的。
         晴天：左右和後面的布幔捲成一捆綁在簷下；下雨：開場約一秒後繩子一鬆「唰」地垂下一半（前面朝鏡頭那一面不放，免得擋棋盤）。CANO 給雨雪用：篷子底下不下 */
      /* 11/12 開發者「在茶肆內車輪戰就不需要篷子了，也不應該下雨下雪」：室內（opt.indoor）不搭遮篷、不下雨雪 */
      if(!opt.indoor)try{const G=["qin","han","sanguo","weijin","nanbei"].includes(EK)?1:["sui","tang"].includes(EK)?2:EK==="yuan"?4:["ming","qing"].includes(EK)?5:3;
        const PX=12.5,PZ=18.5,EY=FL+17.5,CG=new T.Group();CG.name="canopy";
        const C={1:{post:"#4a3324",roof:"#3a2c27",trim:"#7a2418",cloth:"#6e2a20",postR:.42,sq:0},2:{post:"#a63a24",roof:"#2f5c66",trim:"#c9a43a",cloth:"#3c6a72",postR:.45,sq:0},
          3:{post:"#b9a46c",roof:"#d6cdb4",trim:"#9a8a66",cloth:"#cfc5aa",postR:.3,sq:0},4:{post:"#6a4a30",roof:"#e3ddcf",trim:"#2f4f7a",cloth:"#d8d1c1",postR:.55,sq:0},5:{post:"#4a2e1c",roof:"#a8803e",trim:"#6a4a22",cloth:"#b08b4a",postR:.45,sq:1}}[G];
        const pm=M(new T.Color(C.post),{roughness:.85});
        for(const sx of[-1,1])for(const sz of[-1,1]){const h=EY-FL,geo=C.sq?new T.BoxGeometry(C.postR*2,h,C.postR*2):new T.CylinderGeometry(C.postR,C.postR*1.08,h,G===3?8:12);const m=new T.Mesh(geo,pm);m.position.set(sx*PX,FL+h/2,sz*PZ);m.castShadow=true;m.receiveShadow=true;CG.add(m);
          if(G===3)for(let k=1;k<5;k++){const n=new T.Mesh(new T.TorusGeometry(C.postR*1.05,.06,6,12),M(new T.Color("#8a7444")));n.rotation.x=PI/2;n.position.set(sx*PX,FL+k*h/5,sz*PZ);CG.add(n)}}   /* 竹節 */
        /* 簷下橫樑 */
        const bm=M(new T.Color(C.post),{roughness:.85}),fbm=new T.MeshStandardMaterial({color:new T.Color(C.post),roughness:.85,transparent:true,opacity:1});for(const sz of[-1,1]){const b=new T.Mesh(new T.BoxGeometry(PX*2+1,.5,.5),sz>0?fbm:bm);b.position.set(0,EY,sz*PZ);CG.add(b)}   /* 前面（玩家這一側）那根橫樑會橫在畫面上，跟篷頂一起淡 */for(const sx of[-1,1]){const b=new T.Mesh(new T.BoxGeometry(.5,.5,PZ*2+1),bm);b.position.set(sx*PX,EY,0);CG.add(b)}
        /* 篷頂（半透明＋墨線） */
        const rm=new T.MeshStandardMaterial({color:new T.Color(C.roof),roughness:.9,transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false}),ink=new T.LineBasicMaterial({color:0x2a2018,transparent:true,opacity:.85}),RF=[];
        const roof=(geo,pos,rot)=>{const m=new T.Mesh(geo,rm);m.position.set(...pos);if(rot)m.rotation.set(...rot);m.renderOrder=2;CG.add(m);RF.push(m);const e=new T.LineSegments(new T.EdgesGeometry(geo,25),ink);e.position.copy(m.position);e.rotation.copy(m.rotation);e.renderOrder=2;CG.add(e);RF.push(e);return m};
        const W2=PX+1.2,D2=PZ+1.2;
        if(G===1){const g=new T.CylinderGeometry(Math.SQRT1_2*.55,Math.SQRT1_2,1,4,1,false);g.rotateY(PI/4);g.scale(W2*2,3.2,D2*2);roof(g,[0,EY+1.7,0])}   /* 史學顧問 11/10：漢代斗帳是覆斗頂（四面斜收、上面平） */
        else if(G===2){const r=Math.hypot(W2,D2),g=new T.ConeGeometry(r,6,4,1,true);g.rotateY(PI/4);g.scale(W2/(r*Math.SQRT1_2),1,D2/(r*Math.SQRT1_2));roof(g,[0,EY+3.2,0]);
          for(const sx of[-1,1])for(const sz of[-1,1]){const t=new T.Mesh(new T.ConeGeometry(.35,1.6,8),M(new T.Color(C.trim)));t.position.set(sx*W2,EY-.6,sz*D2);t.rotation.x=PI;CG.add(t)}}
        /* 11/10 開發者 hspx「涼亭上面看起來怪怪的」：人字頂原本先放平再「繞垂直軸」轉（等於只是在水平面上歪一邊），兩片疊成蝴蝶結，墨線框還留在轉之前的位置；
           改成放平後繞前後方向（z 軸）往外側斜下，旋轉在 roof() 裡一次設好，墨線跟著同一個角度 */
        else if(G===3){const a=.32,L=W2/Math.cos(a);for(const sx of[-1,1])roof(new T.PlaneGeometry(L,D2*2),[sx*W2/2,EY+.4+Math.tan(a)*W2/2,0],[-PI/2,0,-sx*a,"ZXY"])}
        else if(G===4){const g=new T.SphereGeometry(1,24,8,0,TAU,0,PI/2);g.scale(W2*1.05,3.2,D2*1.05);roof(g,[0,EY+.2,0]);const band=new T.Mesh(new T.CylinderGeometry(1,1,1.1,32,1,true),new T.MeshStandardMaterial({color:new T.Color(C.trim),side:T.DoubleSide,transparent:true,opacity:.9,depthWrite:false}));band.scale.set(W2*1.05,1,D2*1.05);band.position.set(0,EY-.2,0);CG.add(band);RF.push(band)}
        else{const g=new T.CylinderGeometry(W2,W2,D2*2,24,1,true,-PI/2,PI);g.rotateX(PI/2);g.scale(1,.32,1);roof(g,[0,EY+.3,0])}
        /* 垂邊（簷下一圈短布） */
        const vm=new T.MeshStandardMaterial({color:new T.Color(C.trim),roughness:.9,transparent:true,opacity:.92,side:T.DoubleSide,depthWrite:false});
        const vs=M(new T.Color(C.trim),{roughness:.9,side:T.DoubleSide});   /* 兩側和後面的垂邊是實的（篷子的輪廓靠它們），只有前面那一圈跟篷頂一起淡 */
        for(const sz of[-1,1]){const v=new T.Mesh(new T.PlaneGeometry(W2*2,1.2),sz>0?vm:vs);v.position.set(0,EY-.5,sz*D2);CG.add(v);if(sz>0)RF.push(v)}for(const sx of[-1,1]){const v=new T.Mesh(new T.PlaneGeometry(D2*2,1.2),vs);v.rotation.y=PI/2;v.position.set(sx*W2,EY-.5,0);CG.add(v)}
        /* 布幔：左右、後面三面；晴天捲成一捆，下雨垂下一半 */
        const cm=new T.MeshStandardMaterial({color:new T.Color(C.cloth),roughness:.95,transparent:true,opacity:.88,side:T.DoubleSide,depthWrite:false}),CUR=[],CH=(EY-FL)*.48;
        const cur=(w,pos,ry)=>{const g=new T.PlaneGeometry(w,CH);g.translate(0,-CH/2,0);const m=new T.Mesh(g,cm);m.position.set(...pos);m.rotation.y=ry;m.scale.y=.04;CG.add(m);
          const roll=new T.Mesh(new T.CylinderGeometry(.45,.45,w,10),M(new T.Color(C.cloth)));roll.rotation.z=PI/2;roll.rotation.y=ry;roll.position.set(pos[0],pos[1]-.4,pos[2]);CG.add(roll);CUR.push({m,roll})};
        cur(PX*2,[0,EY-.9,-PZ-.05],0);cur(PZ*2,[-PX-.05,EY-.9,0],PI/2);cur(PZ*2,[PX+.05,EY-.9,0],PI/2);
        sc.add(CG);
        CANO={x:PX*.9,z:PZ*.9,y:EY,rm,vm,cm,ink,fbm,RF,CUR,down:0,want:0,wet:0,snow:0,c0:new T.Color(C.roof),
          tick(dt,cy){const above=cy>EY+1.5,op=above?.12:.9;rm.opacity+=(op-rm.opacity)*Math.min(1,dt*4);vm.opacity=Math.min(.92,rm.opacity+.06);ink.opacity=above?.1:.85;cm.opacity=above?.6:.88;fbm.opacity=above?.3:1;fbm.depthWrite=!above;
            if(this.want>this.down)this.down=Math.min(this.want,this.down+dt*2.4);else if(this.want<this.down)this.down=Math.max(this.want,this.down-dt*1.2);
            for(const c of CUR){c.m.scale.y=.04+.96*this.down;c.roll.visible=this.down<.15}
            const col=this.c0.clone();if(this.wet)col.multiplyScalar(1-.15*this.wet);if(this.snow)col.lerp(new T.Color(1,1,1),this.snow);rm.color.copy(col)}}}catch(e){console.warn(e)}
      /* 11/10 開發者「如果當時有下雨或下雪，對戰的時候也會出現，甚至讓畫面積雪」：開場問 App（07w7 window.XQ_PARKWX，跟渡口、棋鎮同一份天氣）這一朝現在下不下——
         雨＝斜斜的細雨絲落到石台、地面稍微變暗像濕了；雪＝雪花慢慢飄、左右晃，石台和外圍山坡從一層薄雪開始，下得越久積得越白（約兩分半到最厚）。
         手機減少動態效果＝只留積雪／濕地，不下粒子。粒子都在石台四周一個大盒子裡循環，不吃霧、不寫深度 */
      try{const WI=typeof window.XQ_PARKWX==="function"&&!opt.indoor?window.XQ_PARKWX(EK):null;if(WI&&(WI.t==="rain"||WI.t==="snow")){
        const snow=WI.t==="snow",A=Math.max(.55,Math.min(1,WI.a||1)),RM=(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}})();
        const BX=17,Y0=FL,Y1=FL+24,N=RM?0:Math.round((snow?(MOB?1100:1800):(MOB?900:1400))*A),objs=[];
        /* 11/10 經典世界（紙墨世界，Gemini 71 作法 2）：雨換成直直落下的短墨滴、雪換成碎宣紙片、積雪是淡紙色 */
        const CL=EK==="classic",DX=CL?0:.35,LN=CL?.7:1.5,SL=CL?0:.23;
        /* 地面：雪＝白色斑駁的積雪片（石台＋山坡各一層，跟著時間變厚）；雨＝一層淡淡的深色（濕地） */
        const blot=cv(512,512,(g,w,h)=>{g.clearRect(0,0,w,h);for(let i=0;i<snow*900+(1-snow)*140;i++){const x=Math.random()*w,y=Math.random()*h,r=snow?10+Math.random()*50:20+Math.random()*70,gr=g.createRadialGradient(x,y,0,x,y,r);
          gr.addColorStop(0,snow?`rgba(255,255,255,${.75+Math.random()*.25})`:`rgba(30,38,46,${.25+Math.random()*.25})`);gr.addColorStop(1,"rgba(255,255,255,0)");g.fillStyle=gr;g.fillRect(x-r,y-r,2*r,2*r)}});
        blot.wrapS=blot.wrapT=T.RepeatWrapping;blot.repeat.set(3,3);
        const lay=(geo,y,rot)=>{const m=new T.Mesh(geo,new T.MeshBasicMaterial({map:blot,color:snow?(CL?0xF3E8CC:0xffffff):0x223040,transparent:true,opacity:0,depthWrite:false,fog:true,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-2}));
          if(rot)m.rotation.x=-PI/2;m.position.y=y;m.renderOrder=1;sc.add(m);objs.push(m);return m};
        const L1=lay(new T.CircleGeometry(TR,64),FL+.015,true),L2=lay(hg,.02,false);L2.material.side=T.DoubleSide;
        let acc=snow?.4:.0,wet=0;
        /* 粒子：雨＝線段（每滴兩個點），雪＝圓點 */
        let pts=null,pos=null,vel=null;
        if(N){if(snow){const g=new T.BufferGeometry();pos=new Float32Array(N*3);vel=new Float32Array(N*2);for(let i=0;i<N;i++){pos[i*3]=(Math.random()*2-1)*BX;pos[i*3+1]=Y0+Math.random()*(Y1-Y0);pos[i*3+2]=(Math.random()*2-1)*BX;vel[i*2]=1.6+Math.random()*1.4;vel[i*2+1]=Math.random()*TAU}
            g.setAttribute("position",new T.BufferAttribute(pos,3));const dot=CL?cv(64,64,(c,w,h)=>{c.clearRect(0,0,w,h);c.fillStyle="rgba(248,240,214,.95)";c.fillRect(16,22,32,22);c.strokeStyle="rgba(120,100,70,.5)";c.lineWidth=2;c.strokeRect(16,22,32,22)}):cv(64,64,(c,w,h)=>{const gr=c.createRadialGradient(32,32,0,32,32,30);gr.addColorStop(0,"rgba(255,255,255,1)");gr.addColorStop(.5,"rgba(255,255,255,.75)");gr.addColorStop(1,"rgba(255,255,255,0)");c.fillStyle=gr;c.fillRect(0,0,w,h)});
            pts=new T.Points(g,new T.PointsMaterial({map:dot,size:MOB?.62:.5,sizeAttenuation:true,transparent:true,opacity:.95,depthWrite:false,fog:false}))}
          else{const g=new T.BufferGeometry();pos=new Float32Array(N*6);vel=new Float32Array(N);for(let i=0;i<N;i++){const x=(Math.random()*2-1)*BX,y=Y0+Math.random()*(Y1-Y0),z=(Math.random()*2-1)*BX;pos.set([x,y,z,x+DX,y+LN,z],i*6);vel[i]=CL?20+Math.random()*6:30+Math.random()*12}
            g.setAttribute("position",new T.BufferAttribute(pos,3));pts=new T.LineSegments(g,new T.LineBasicMaterial({color:CL?0x2E333C:0xC9D3DA,transparent:true,opacity:(CL?.5:.42)*A+.1,depthWrite:false,fog:false}))}
          pts.frustumCulled=false;pts.renderOrder=3;sc.add(pts);objs.push(pts)}
        let wt=0;WX={tick(dt,now){wt+=dt;if(snow){acc=Math.min(.9,acc+dt*.006*A);L1.material.opacity=acc;L2.material.opacity=acc*.92;if(CANO)CANO.snow=Math.min(.85,acc)}else{wet=Math.min(.32,wet+dt*.08);L1.material.opacity=wet;L2.material.opacity=wet*.8;if(CANO){CANO.wet=Math.min(1,wet/.32);if(wt>1)CANO.want=1}}
          if(!pts)return;const p=pts.geometry.attributes.position;
          if(snow){for(let i=0;i<N;i++){const j=i*3;pos[j+1]-=vel[i*2]*dt;pos[j]+=Math.sin(now/900+vel[i*2+1])*dt*.6;if(pos[j+1]<Y0||CANO&&pos[j+1]<CANO.y&&Math.abs(pos[j])<CANO.x&&Math.abs(pos[j+2])<CANO.z){pos[j+1]=Y1;pos[j]=(Math.random()*2-1)*BX;pos[j+2]=(Math.random()*2-1)*BX}}}
          else{for(let i=0;i<N;i++){const j=i*6,d=vel[i]*dt;pos[j+1]-=d;pos[j+4]-=d;pos[j]-=d*SL;pos[j+3]-=d*SL;if(pos[j+1]<Y0||CANO&&pos[j+1]<CANO.y&&Math.abs(pos[j])<CANO.x&&Math.abs(pos[j+2])<CANO.z){const x=(Math.random()*2-1)*BX,z=(Math.random()*2-1)*BX;pos.set([x,Y1,z,x+DX,Y1+LN,z],j)}}}
          p.needsUpdate=true},
          dispose(){for(const o of objs){try{sc.remove(o);o.geometry!==hg&&o.geometry.dispose();o.material.dispose()}catch(e){}}}}}}catch(e){console.warn(e)}
      /* 開發者 11/4：石台底下鋪一張「當朝代的中國大地圖」（Gemini 水墨古地圖，有疆界和地名），畫面拉遠就看得到；地圖載好就換掉山坡，載不到就留著山坡 */
      /* 意見回饋 647（開發者 11/6 選「在現有手繪地圖上描邊」）：地圖上疊一層「最鼎盛時期的疆域」（半透明色塊＋粗邊界，左上角可開關、附圖例），
         地名也改由這裡寫上去（主要的一直顯示，次要的拉近才顯示、字小一點）；資料在 data/eramap/realms.json、labels.json（由 xiangqi-db/tools/eramap_geo.py 從經緯度換算） */
      const eraOverlay=base=>{Promise.all(["realms","labels"].map(f=>fetch("data/eramap/"+f+".json").then(r=>r.ok?r.json():null).catch(()=>null))).then(([RJ,LJ])=>{if(!el.isConnected)return;
        const RE=RJ&&RJ[EK],LB=LJ&&Array.isArray(LJ[EK])?LJ[EK]:null,S=MOB?1024:2048,k=S/2048,FF='"XQ twkai","KaiTi","STKaiti","DFKai-SB","BiauKai",serif';
        const mk=()=>{const c=document.createElement("canvas");c.width=c.height=S;return c};
        /* 跟地圖本身一樣，外圈（圓盤半徑 78% 以外）慢慢淡掉 */
        const fadeC=g=>{const gr=g.createRadialGradient(S/2,S/2,S/2*.78,S/2,S/2,S/2);gr.addColorStop(0,"rgba(0,0,0,1)");gr.addColorStop(.5,"rgba(0,0,0,.5)");gr.addColorStop(1,"rgba(0,0,0,0)");g.globalCompositeOperation="destination-in";g.fillStyle=gr;g.fillRect(0,0,S,S);g.globalCompositeOperation="source-over"};
        const add=(c,ro,kind)=>{const t=srgb(new T.CanvasTexture(c));t.anisotropy=4;const m=new T.Mesh(base.geometry,new T.MeshStandardMaterial({map:t,transparent:true,roughness:1,metalness:0,depthWrite:false}));
          m.rotation.x=-PI/2;m.position.y=base.position.y+.004*ro;m.renderOrder=-.2+.01*ro;m.receiveShadow=true;m.visible=false;m.material.opacity=0;sc.add(m);MAPO.push({m,k:kind});MAPOK=""};
        if(RE&&Array.isArray(RE.realms)){const c=mk(),g=c.getContext("2d"),P=v=>v*S/100;g.lineJoin="round";g.lineCap="round";
          const path=p=>{g.beginPath();p.forEach(([x,y],i)=>i?g.lineTo(P(x),P(y)):g.moveTo(P(x),P(y)));g.closePath()};
          for(const r of RE.realms)for(const p of r.p){path(p);g.globalAlpha=r.d?.16:.24;g.fillStyle=r.c;g.fill()}
          for(const r of RE.realms)for(const p of r.p){path(p);if(r.d){g.setLineDash([S/90,S/160]);g.lineWidth=Math.max(2,S/300);g.strokeStyle=r.c;g.globalAlpha=.9;g.stroke();g.setLineDash([])}
            else{g.globalAlpha=.75;g.lineWidth=Math.max(4,S/115);g.strokeStyle="#FAF4E6";g.stroke();g.globalAlpha=.95;g.lineWidth=Math.max(2,S/260);g.strokeStyle=r.c;g.stroke()}}
          /* 11/10 經典園子（Gemini 69 方案 3＋1）：realms.json 的 classic 改放 stars（北斗七星）和 lines（連線），不畫疆域；
             end＝終章「千秋歸位」完成才亮的星（開陽、搖光），問 App 的 window.XQ_FINALE()；前五顆的名字由路線那層寫，這裡只寫 end 的星名 */
          if(Array.isArray(RE.stars)){let fin=false;try{fin=typeof window.XQ_FINALE==="function"&&!!window.XQ_FINALE()}catch(e){}
            const ST=RE.stars,on=q=>!q.end||fin,Q=i=>[P(ST[i].x),P(ST[i].y)],R0=S/75;
            for(const[a,b]of RE.lines||[]){const A=Q(a),B=Q(b),lit=on(ST[a])&&on(ST[b]);g.globalAlpha=lit?.85:.35;g.strokeStyle=lit?"#E2B64A":"#C9C1B1";g.lineWidth=Math.max(2,S/300);
              g.setLineDash(lit?[]:[S/110,S/140]);g.beginPath();g.moveTo(A[0],A[1]);g.lineTo(B[0],B[1]);g.stroke()}g.setLineDash([]);
            for(const q of ST){const X=P(q.x),Y=P(q.y),lit=on(q),gr=g.createRadialGradient(X,Y,0,X,Y,R0*2.8);gr.addColorStop(0,lit?"rgba(255,228,140,.95)":"rgba(210,205,195,.55)");gr.addColorStop(1,"rgba(255,228,140,0)");
              g.globalAlpha=1;g.fillStyle=gr;g.beginPath();g.arc(X,Y,R0*2.8,0,2*PI);g.fill();g.fillStyle=lit?"#FFF4CC":"#D8D1C3";g.beginPath();g.arc(X,Y,R0*.6,0,2*PI);g.fill();
              if(q.end){const sz=Math.round(50*k);g.font=sz+"px "+FF;g.textAlign="center";g.textBaseline="middle";g.lineWidth=Math.max(3,sz/4.5);g.strokeStyle="rgba(250,244,230,.92)";g.strokeText(q.n,X,Y-R0*1.6-sz*.5);g.fillStyle=lit?"#7A4A0A":"#8C857A";g.fillText(q.n,X,Y-R0*1.6-sz*.5)}}}
          g.globalAlpha=1;fadeC(g);add(c,1,"r");
          /* 左上角：疆域開關＋圖例（拉遠看到地圖時才出現） */
          const pn=document.createElement("div");pn.style.cssText="position:absolute;left:8px;top:8px;z-index:3;display:none;max-width:64%;font:600 12px/1.4 system-ui,sans-serif;color:#3a2a1c";
          const bt=document.createElement("button");bt.type="button";bt.style.cssText="border-radius:99px;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.86);color:#3a2a1c;font:700 13px/1 system-ui,sans-serif;padding:7px 12px;box-shadow:0 1px 4px rgba(0,0,0,.2);cursor:pointer";
          const lg=document.createElement("div");lg.style.cssText="margin-top:6px;background:rgba(250,244,230,.9);border:1px solid rgba(120,90,60,.45);border-radius:10px;padding:5px 9px";
          {const h=document.createElement("div");h.style.cssText="font-weight:800;margin-bottom:2px";h.textContent=RE.title||"最鼎盛時的疆域";lg.append(h)}
          for(const it of RE.legend||[]){const row=document.createElement("div");row.style.cssText="display:flex;align-items:center;gap:6px";const sw=document.createElement("span");
            sw.style.cssText=`flex:none;width:14px;height:10px;border-radius:2px;background:${it.c}55;border:2px ${it.d?"dashed":"solid"} ${it.c}`;const tx=document.createElement("span");tx.textContent=it.g;row.append(sw,tx);lg.append(row)}
          const sync=()=>{bt.textContent=(RE.btn||"疆域")+(RON?"：開":"：關");bt.setAttribute("aria-pressed",RON?"true":"false");lg.style.display=RON?"block":"none";MAPOK=""};
          for(const ev of["pointerdown","pointerup"])pn.addEventListener(ev,e=>e.stopPropagation());
          bt.onclick=e=>{e.stopPropagation();RON=!RON;try{localStorage.setItem("m_eramapRealm",JSON.stringify(RON))}catch(_){}sync()};
          sync();pn.append(bt,lg);el.append(pn);MAPP=pn}
        if(LB){const ST={n:[92,66,"#961A12"],c:[66,48,"#241A10"],r:[60,46,"#284E68"],s:[58,46,"#463220"]};
          const draw=minor=>{const c=mk(),g=c.getContext("2d");g.textAlign="center";g.textBaseline="middle";g.lineJoin="round";
            for(const l of LB){const[nm,x,y,ty,rk,tx,tyy,hid]=l;if((rk===2)!==minor)continue;const st=ST[ty]||ST.c,sz=(rk===1?st[0]:st[1])*k,X=x*S/100,Y=y*S/100;
              if((ty==="c"||ty==="s")&&!hid){const rd=Math.max(2,(rk===1?9:7)*k);g.fillStyle=st[2];g.strokeStyle="#F6EEDC";g.lineWidth=Math.max(1,rd/2.5);g.beginPath();
                if(ty==="c")g.arc(X,Y,rd,0,2*PI);else{g.moveTo(X,Y-rd*1.3);g.lineTo(X-rd*1.2,Y+rd);g.lineTo(X+rd*1.2,Y+rd);g.closePath()}g.fill();g.stroke()}
              const txt=ty==="n"&&nm.length<=2?[...nm].join(" "):nm,TX=(tx!=null?tx:x)*S/100,TY=(tyy!=null?tyy:y)*S/100;
              g.font=`${Math.round(sz)}px ${FF}`;g.lineWidth=Math.max(3,sz/4.5);g.strokeStyle="#F6EEDC";g.strokeText(txt,TX,TY);g.fillStyle=st[2];g.fillText(txt,TX,TY)}
            fadeC(g);return c};
          const go=()=>{if(el.isConnected){add(draw(false),2,"l");add(draw(true),3,"m")}};
          /* 字型（全字庫正楷體子集）載好再寫，最多等 2.5 秒，等不到就用系統的楷體 */
          (document.fonts&&document.fonts.load?Promise.race([document.fonts.load('48px "XQ twkai"',LB.map(l=>l[0]).join("")),new Promise(r=>setTimeout(r,2500))]):Promise.resolve()).then(go,go)}
        /* 意見回饋 658（B 輿圖遊歷）：石桌往事的園子裡，App（07e-garden2.js 的 window.XQ_MAPROUTE）給這個朝代的路線，畫在地名上面一層：
           虛線是還沒走的路、紅線是走過的、整條走完變金線；下一站畫一圈發亮的光暈；地圖原本沒有的地名（t）自己寫上。key 變了才重畫（下面 placeCam 每 0.8 秒問一次） */
        RTF=()=>{let R=null;try{R=window.XQ_MAPROUTE?window.XQ_MAPROUTE(EK):null}catch(e){}const key=R&&R.key||"";if(key===RTK)return;RTK=key;
          for(let i=MAPO.length-1;i>=0;i--)if(MAPO[i].k==="t"){const m=MAPO[i].m;sc.remove(m);if(m.material.map)m.material.map.dispose();m.material.dispose();MAPO.splice(i,1)}
          RTS=null;MAPOK="";if(!R||!Array.isArray(R.s)||R.s.length<2){if(RTP)RTP.style.display="none";return}
          const c=mk(),g=c.getContext("2d"),P=v=>v*S/100,pt=R.s.map(q=>[P(q.x),P(q.y)]),L=pt.length-1,n=Math.min(R.n|0,L+1),rd=S/105;
          const line=(a,b)=>{g.beginPath();g.moveTo(pt[a][0],pt[a][1]);for(let i=a+1;i<=b;i++)g.lineTo(pt[i][0],pt[i][1]);g.stroke()};g.lineJoin="round";g.lineCap="round";
          if(R.all){g.strokeStyle="rgba(255,248,225,.9)";g.lineWidth=S/95;line(0,L);g.strokeStyle="#D4A017";g.lineWidth=S/170;line(0,L)}
          else{g.setLineDash([S/70,S/120]);g.strokeStyle="rgba(122,74,42,.8)";g.lineWidth=S/320;line(0,L);g.setLineDash([]);if(n>1){g.strokeStyle="rgba(255,248,225,.85)";g.lineWidth=S/150;line(0,n-1);g.strokeStyle="#B0281E";g.lineWidth=S/260;line(0,n-1)}}
          R.s.forEach((q,i)=>{const[x,y]=pt[i];
            if(q.st===2){const gr=g.createRadialGradient(x,y,0,x,y,rd*4.2);gr.addColorStop(0,"rgba(255,214,90,.95)");gr.addColorStop(.45,"rgba(255,196,60,.55)");gr.addColorStop(1,"rgba(255,196,60,0)");g.fillStyle=gr;g.beginPath();g.arc(x,y,rd*4.2,0,2*PI);g.fill()}
            g.beginPath();g.arc(x,y,rd,0,2*PI);g.fillStyle=R.all?"#D4A017":q.st===1?"#B0281E":q.st===2?"#FFF3C4":"#FAF4E6";g.fill();g.lineWidth=Math.max(2,rd/2.6);g.strokeStyle=q.st===2?"#C8961E":q.st===1||R.all?"#FAF4E6":"#7A4A2A";g.stroke();
            if(q.t){const sz=Math.round(50*k);g.font=sz+"px "+FF;g.textAlign="center";g.textBaseline="middle";g.lineWidth=Math.max(3,sz/4.5);g.strokeStyle="#F6EEDC";g.strokeText(q.t,x,y-rd-sz*.75);g.fillStyle="#3A2414";g.fillText(q.t,x,y-rd-sz*.75)}});
          add(c,4,"t");RTS=R.s.map(q=>[q.nm,q.x,q.y]);
          if(!RTP){RTP=document.createElement("div");RTP.style.cssText="position:absolute;left:8px;bottom:8px;z-index:3;display:none;max-width:calc(100% - 70px);font:700 12.5px/1.45 system-ui,sans-serif;color:#3a2a1c;background:rgba(255,246,214,.92);border:1px solid #C8961E;border-radius:10px;padding:5px 9px;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.2)";el.append(RTP)}
          RTP.textContent=R.tip||""};
        RTF()})};
      const ms="data/eramap/"+EK+(MOB?"_m":"")+".webp",mp=()=>{const im=imgCache[ms];if(!im||!im.naturalWidth||!el.isConnected)return;
        const t=srgb(new T.Texture(im));t.anisotropy=4;t.needsUpdate=true;
        const map=new T.Mesh(new T.CircleGeometry(ERAMAP_R,96),new T.MeshStandardMaterial({map:t,transparent:true,roughness:1,metalness:0,depthWrite:false}));
        map.rotation.x=-PI/2;map.position.y=FL-.08;map.receiveShadow=true;map.renderOrder=-.2;sc.add(map);
        /* 意見回饋 525：地圖平鋪在石台高度會蓋住長卷下半部（城、塔、蒙古包都在那裡）；平常照舊是山坡＋長卷，鏡頭拉遠時地圖才浮現、山坡才收掉 */
        MAPM=map;HILL=hill;map.material.opacity=0;map.visible=false;lastKf=-1;
        /* 意見回饋 517：拉遠看地圖時，地圖上的地名點得到（data/eramap/labels.json 的位置，介紹在 App 的 places.json） */
        fetch("data/eramap/labels.json").then(r=>r.ok?r.json():null).then(L=>{if(L&&Array.isArray(L[EK]))MAPL=L[EK]}).catch(()=>{});eraOverlay(map)};
      if(!opt.indoor&&loadImg(ms,mp))setTimeout(mp,0)}   /* hspx（開發者 11/12）：室內拉遠不浮出朝代大地圖，木地板一直在 */
    {/* 意見回饋 406：平台邊的石欄杆跟著地面抬高後幾乎跟桌面一樣高，降成約 20 公分的矮欄；421：矮欄＋36 根望柱從桌邊看過去還是一整圈牆（像一座高石台的邊、又剛好擋在山水前面），
       改成貼地的一圈石砌收邊（約 7 公分），只留平台的邊線，不擋遠景 */
      /* hspx（開發者 11/12）：室內是一整片木地板，不放石砌收邊 */
      if(!opt.indoor){const curb=new T.Mesh(new T.CylinderGeometry(TR-.15,TR-.15,.45,96,1,true),stone2);curb.material.side=T.DoubleSide;curb.position.y=FL+.22;sc.add(curb);
      const lip=new T.Mesh(new T.TorusGeometry(TR-.3,.22,5,128),stone);lip.rotation.x=PI/2;lip.position.y=FL+.42;sc.add(lip)}}
    // 朝代家具（桌、長椅、凳子、燈）：見 buildFurn；桌面頂面 y=0，長椅座面高度 SY
    /* 意見回饋 406：椅面抬高到桌面下約 30 公分（真實的桌椅落差），人坐著露出比較多身體，桌子看起來才矮 */
    const BZ=-12.6,SY=(window.__SY||-2.7),BL=13,iron=M(0x2A2620,{roughness:.45,metalness:.6});
    const infos=[];   // 意見回饋 240：點得到、會跳說明的物件
    const bills=[];   // 意見回饋 375：鏡頭可以繞著桌子轉，貼圖（道具、座椅）每一格都轉向鏡頭
    const fades=[];   /* 意見回饋 421：轉頭時剛好擋在畫面正中間、桌子後面的樹，淡成水墨的薄影，讓遠景透出來 */
    const furn=buildFurn(EK,E,{sc,M,GY,FL,SY,BZ,BL,stone,stone2,iron,infos,bills,fades,bridge:!!opt.bridge,indoor:!!opt.indoor});
    // 木棋盤嵌在桌上：深色實木框，和灰色石桌對比清楚
    const wood=M(furn.frame,{roughness:.55});mesh(new T.BoxGeometry(BW+.5,.6,BH+.5),wood,[0,.24,0]);mesh(new T.BoxGeometry(BW+.62,.08,BH+.62),wood,[0,-.0,0]);   // 厚木棋盤＋底座線腳（意見回饋 215）
    const btex=boardTex(()=>{try{btex.image.getContext("2d").clearRect(0,0,1,1);drawBoard(btex.image.getContext("2d"),btex.image.width,btex.image.height,null);btex.needsUpdate=true}catch(e){}});const bplane=new T.Mesh(new T.PlaneGeometry(BW,BH),new T.MeshStandardMaterial({map:btex,roughness:.6}));bplane.rotation.x=-PI/2;bplane.position.y=TOP-.02+.03;bplane.receiveShadow=true;sc.add(bplane);
    // 茶杯：Pikafish（對面）一杯、我一杯（意見回饋 215）
    const teaCup=(x,z)=>{const cup=new T.Group();cup.position.set(x,0,z);sc.add(cup);const por=M(0xF4F1EA,{roughness:.25}),blue=M(0x2D5DA8,{roughness:.3});const a=new T.Mesh(new T.CylinderGeometry(.75,.75,.08,32),por);a.position.y=.04;cup.add(a);
      const b=new T.Mesh(new T.CylinderGeometry(.5,.36,.7,32,1,true),por);b.position.y=.43;b.material.side=T.DoubleSide;cup.add(b);const band=new T.Mesh(new T.CylinderGeometry(.505,.47,.12,32,1,true),blue);band.position.y=.6;cup.add(band);
      const tea=new T.Mesh(new T.CircleGeometry(.47,32),M(0x9C6B1E,{roughness:.1}));tea.rotation.x=-PI/2;tea.position.y=.66;cup.add(tea);cup.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;o.userData.info="cup";infos.push(o)}});return cup};   /* 意見回饋 348：3D 茶杯也點得到 */
    teaCup(0,-6.85);teaCup(.4,7.0);   // 意見回饋 219：Pikafish 的茶在它面前正中間、我的茶在我面前正中間
    // 平台上的樹（依朝代：松、柳、竹）：水墨畫的看板（兩種筆法輪流），放在兩側，轉頭時當前景框；不投影（畫是平的，影子會穿幫）
    if(!PROP_IMG[EK]&&!opt.bridge&&!opt.indoor){const seat=new T.Vector3(0,16,9.2),barkM=M(0xffffff,{map:barkTex(E,E.tree),roughness:.95}),folM=new T.MeshBasicMaterial({map:foliageTex(E,E.tree,EK.length*131+7),transparent:true,alphaTest:.02,depthWrite:false,side:T.DoubleSide,toneMapped:false});
      // 位置（意見回饋 233）：放在平台邊、斜後方，當轉頭時畫面的框，不再一棵大樹擋住整個側面
      [[-14.8,-13.2,.95,11],[17.8,-8.2,.9,29],[-19.2,3.2,.72,53]].forEach(([x,z,k,sd])=>sc.add(inkTree3D(E,E.tree,EK.length*97+sd,new T.Vector3(x,GY,z),seat,k,barkM,folM)))}
    // 落葉（朝代色系的花瓣／葉子），在畫面外圍飄
    const falling=[];{const lg=new T.PlaneGeometry(.5,.34),cols=[E.acc2,0xD9A548,0xC98A3A];for(let i=0;i<(opt.indoor?0:8);i++){const l=new T.Mesh(lg,new T.MeshStandardMaterial({color:new T.Color(cols[i%3]),side:T.DoubleSide,roughness:1}));
      l.userData={x:(Math.random()-.5)*40,z:-12-Math.random()*20,y:Math.random()*30,s:.6+Math.random()*.8,ph:Math.random()*TAU};sc.add(l);falling.push(l)}}

    /* 開發者 11/8（畫風盤點第 3 條：園子的道具、地面是寫實貼圖，跟水墨小人、水墨長卷打架）：園子也套小人那套水墨材質（A 版）。
       跟著小人的 toon3d 設定走（小人水墨關掉，園子也一起關）；localStorage 的 m_parkToon 設成 "off" 可以只關園子。
       ‧立體道具（桌、凳、長榻、燈、火盆、茶杯、樹幹、石欄）：明暗照場景的光（影子還在），但只分三階，最亮那階就是貼圖原色；外面加 bot3d 的墨線外殼。
         雙面的薄片（落葉、欄邊）不加外殼，從背面看才不會多一片黑影；外殼深度往後退 0.3（凹處不冒線）
       ‧手繪立牌（燈籠、樹、長榻圖）：沿著去背的邊描一圈約 1.6 像素的墨線（要 WebGL2）；
         判斷「邊」要用貼圖本身的透明度，不能用乘過材質透明度的值（意見回饋 753：擋在畫面中間的樹會淡到 0.28，之前整棵被當成「邊」塗成黑剪影），墨線也跟著樹一起淡
       ‧地面：飽和度減半、乘上淡淡的紙紋（跟著地面不跟著鏡頭），石台外緣往宣紙色暈白（11/10：只暈石台邊那一圈，外面的山坡不再整片漂成土黃）
       ‧棋盤（木框、盤面）、棋子、小人、天空、長卷、地圖都不動；棋子和小人在這之後才加進場景，本來就不在範圍裡 */
    const PT={roots:sc.children.slice(),M0:new WeakMap(),C:new WeakMap(),st:new WeakMap(),inst:new WeakSet(),u:{value:0},on:null};
    const PT_L="vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;";
    const PT_N="float xqH(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}\nfloat xqN(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(xqH(i),xqH(i+vec2(1.,0.)),f.x),mix(xqH(i+vec2(0.,1.)),xqH(i+vec2(1.,1.)),f.x),f.y);}\n";
    const ptOn=()=>{let v="a",p="";try{v=window.XQTOON?window.XQTOON():JSON.parse(localStorage.getItem("m_toon3d")||'"a"')}catch(e){}try{p=JSON.parse(localStorage.getItem("m_parkToon")||'""')}catch(e){}return !!v&&p!=="off"};
    function ptMat(o){let m=PT.C.get(o);if(m)return m;
      m=new T.MeshLambertMaterial({map:o.map||null,color:o.color&&o.toneMapped!==false?o.color.clone():new T.Color(1,1,1),   /* 手繪桌面那種材質的顏色是「光色的倒數」（抵銷暖光），水墨版不吃光色，就不能再乘，不然會偏藍 */emissive:o.emissive?o.emissive.clone():new T.Color(0),emissiveMap:o.emissiveMap||null,emissiveIntensity:o.emissiveIntensity!=null?o.emissiveIntensity:1,side:o.side,transparent:o.transparent,opacity:o.opacity,alphaTest:o.alphaTest,vertexColors:!!o.vertexColors,fog:o.fog!==false});m.name="xqParkToon";
      m.onBeforeCompile=s=>{const f=s.fragmentShader;if(!f.includes(PT_L)||!f.includes("#include <encodings_fragment>"))return;
        s.fragmentShader=f.replace(PT_L,"vec3 xqL = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;\nfloat xqI = dot( xqL, vec3( .2126, .7152, .0722 ) ) / max( dot( diffuseColor.rgb, vec3( .2126, .7152, .0722 ) ), .02 );\nvec3 outgoingLight = diffuseColor.rgb * ( .68 + .16 * smoothstep( .5, .56, xqI ) + .16 * smoothstep( .85, .91, xqI ) ) + totalEmissiveRadiance;")
          .replace("#include <tonemapping_fragment>","").replace("#include <encodings_fragment>","gl_FragColor = LinearTosRGB( gl_FragColor );")};
      m.customProgramCacheKey=()=>"xqParkToon";PT.C.set(o,m);return m}
    /* 地面、立牌：不換材質，在原本的材質上加一段開關（PT.u）控制的水墨處理，切換時不用重新編譯 */
    function ptGround(o){if(PT.inst.has(o))return;PT.inst.add(o);const ob=o.onBeforeCompile;
      o.onBeforeCompile=(s,r)=>{if(ob)ob(s,r);s.uniforms.xqInk=PT.u;
        s.vertexShader=s.vertexShader.replace("#include <common>","#include <common>\nvarying vec3 vXqW;").replace("#include <project_vertex>","#include <project_vertex>\nvXqW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;");
        s.fragmentShader=s.fragmentShader.replace("#include <common>","#include <common>\nuniform float xqInk;\nvarying vec3 vXqW;\n"+PT_N).replace("#include <map_fragment>","#include <map_fragment>\nif ( xqInk > .5 ) {\nfloat xqY = dot( diffuseColor.rgb, vec3( .2126, .7152, .0722 ) );\nvec3 xqC = mix( vec3( xqY ), diffuseColor.rgb, "+(opt.indoor?".9":".5")+" );\nfloat xqG = xqN( vXqW.xz * 3.1 ) * .5 + xqN( vXqW.xz * 11. ) * .3 + xqN( vXqW.xz * 37. ) * .2;\nxqC *= vec3( 1., .975, .92 ) * ( .9 + .14 * xqG );\ndiffuseColor.rgb = mix( xqC, vec3( .84, .79, .68 ), "+(opt.indoor?"0.":".45")+" * smoothstep( 15., 21.5, length( vXqW.xz ) ) * ( 1. - smoothstep( 21.5, 24., length( vXqW.xz ) ) ) );\n}")};
      o.customProgramCacheKey=()=>"xqGround"+(opt.indoor?"In":"");o.needsUpdate=true}
    const PT_W2=!!(rd.capabilities&&rd.capabilities.isWebGL2);
    function ptCard(o){if(PT.inst.has(o)||!PT_W2)return;PT.inst.add(o);const ob=o.onBeforeCompile;
      o.onBeforeCompile=(s,r)=>{if(ob)ob(s,r);s.uniforms.xqInk=PT.u;
        s.fragmentShader=s.fragmentShader.replace("#include <common>","#include <common>\nuniform float xqInk;").replace("#include <map_fragment>","#include <map_fragment>\n#ifdef USE_MAP\nif ( xqInk > .5 ) {\nvec2 xqD = fwidth( vUv ) * 1.6;\nfloat xqA = max( max( texture2D( map, vUv + vec2( xqD.x, 0. ) ).a, texture2D( map, vUv - vec2( xqD.x, 0. ) ).a ), max( texture2D( map, vUv + vec2( 0., xqD.y ) ).a, texture2D( map, vUv - vec2( 0., xqD.y ) ).a ) );\nfloat xqE = smoothstep( .35, .65, xqA ) * ( 1. - smoothstep( .35, .65, sampledDiffuseColor.a ) );\ndiffuseColor = mix( diffuseColor, vec4( .015, .008, .006, opacity ), xqE );\n}\n#endif")};
      o.customProgramCacheKey=()=>"xqCard";o.needsUpdate=true}
    function ptRun(){if(!el.isConnected)return;const on=ptOn(),K=window.XQTOON_KIT;PT.u.value=on?1:0;PT.on=on;const ms=[];
      for(const r of PT.roots)r.traverse(m=>{if(m.isMesh&&!(K&&K.isHull(m)))ms.push(m)});
      for(const m of ms){if(!PT.M0.has(m))PT.M0.set(m,m.material);const o=PT.M0.get(m);if(!o||Array.isArray(o)||m===bplane||o===wood||FARHIDE.includes(m))continue;
        if(m===pave||(m.parent===sc&&m.geometry&&m.geometry.type==="LatheGeometry")){ptGround(o);continue}   /* 石板地、外圍山坡 */
        if(o.isMeshBasicMaterial){if(o.map&&o.alphaTest>0&&o.depthWrite!==false)ptCard(o);continue}
        if(!o.isMeshStandardMaterial||o.transparent||PT.st.get(m)===on)continue;PT.st.set(m,on);
        for(const c of m.children.filter(c=>K&&K.isHull(c)))m.remove(c);
        if(!on){m.material=o;continue}
        m.material=ptMat(o);if(K&&(o.side===T.FrontSide||ptClosed(m.geometry))){const h=K.hull(m,{bias:.3,max:.35});if(h)m.add(h)}}}
    /* 雙面材質（例如石材跟石欄共用一個材質）：形狀是封閉的才加外殼；薄片、開口的圓筒不加。同位置的頂點併成一個點，數只屬於一個三角形的邊 */
    function ptClosed(geo){if(geo.userData.xqClosed!=null)return geo.userData.xqClosed;let ok=false;
      try{const p=geo.attributes.position,N=p.count,id=new Map(),vi=new Int32Array(N);for(let i=0;i<N;i++){const k=Math.round(p.getX(i)*1e3)+","+Math.round(p.getY(i)*1e3)+","+Math.round(p.getZ(i)*1e3);let v=id.get(k);if(v===undefined)id.set(k,v=id.size);vi[i]=v}
        const ix=geo.index,F=ix?ix.count/3:N/3,E=new Map(),V=id.size+1,at=j=>vi[ix?ix.getX(j):j];
        for(let f=0;f<F;f++)for(let e=0;e<3;e++){const a=at(f*3+e),b=at(f*3+(e+1)%3);if(a===b)continue;const k=a<b?a*V+b:b*V+a;E.set(k,(E.get(k)||0)+1)}
        let open=0;for(const c of E.values())if(c===1)open++;ok=E.size>0&&open/E.size<.02}catch(e){}
      geo.userData.xqClosed=ok;return ok}
    {const K=window.XQTOON_KIT,lis=()=>{if(!el.isConnected){if(K)K.lis.splice(K.lis.indexOf(lis)>>>0,1);return}ptRun()};if(K)K.lis.push(lis);
      ptRun();for(const t of[1500,4000,9000])setTimeout(ptRun,t);window.XQPARKTOON=v=>{try{localStorage.setItem("m_parkToon",JSON.stringify(v===false||v==="off"?"off":""))}catch(e){}ptRun();return PT.on}}   /* 立牌、手繪桌面是圖載好才加進場景，晚一點再掃幾次 */
    // ---------- 角色：對面長椅坐對手（電腦＝瘦版 Pikafish；真人＝對方自己的小帥），我這邊桌角坐我的小帥 ----------
    // 意見回饋 212：小帥是玩家的夥伴，坐在玩家這一邊；對面是對手的位置
    const mkBub=(x,y,z,w)=>{const b=new T.Sprite(new T.SpriteMaterial({transparent:true,depthTest:false}));b.scale.set(w,w*.31,1);b.position.set(x,y,z);b.visible=false;b.renderOrder=10;sc.add(b);return b};
    const actor=(g,bub)=>({g,bub,B:null,face:"smile",faceT:0,bubT:0,blinkT:2+Math.random()*2,
      setFace(f,d){this.face=f;this.faceT=d||0},say(t,d){const m=this.bub.material;m.map&&m.map.dispose();m.map=bubbleTex(t);m.needsUpdate=true;this.bub.visible=true;this.bubT=d||2.2}});
    const seat=B=>{B.legs.forEach(l=>{l.rotation.x=-1.35});B.bot.position.y=-.35};
    const opp=actor(new T.Group(),mkBub(4.4,3.2,-9.2,6.2));opp.g.position.set(0,SY-.9,BZ+1.0);opp.g.scale.setScalar(4.1);sc.add(opp.g);
    /* 開發者 11/12「新增裁判官角色，繪製 3D，放到每個對戰的 3D 場景雙方的中間靠近桌子處，包含線上也要有裁判官站在旁邊」：
       Tripo 靜態站姿 data/tripo_app/k_ref.glb（立繪 park/referee/ref_idle.png），站在地上、桌子右側（雙方中間），面向棋盤、微微朝鏡頭；首頁橋上石桌、黑洞巨盤不放 */
    if(!opt.giant&&!opt.bridge&&typeof window.XQGLB==="function")try{window.XQGLB("data/tripo_app/k_ref.glb").then(s=>{if(!s||!el.isConnected)return;const g=s.clone(true);g.rotation.y=-PI/2;g.updateMatrixWorld(true);
      const bb=new T.Box3().setFromObject(g),sz=bb.getSize(new T.Vector3()),c=bb.getCenter(new T.Vector3());if(!(sz.y>0))return;const hold=new T.Group();hold.name="referee";g.position.set(-c.x,-bb.min.y,-c.z);hold.add(g);
      hold.scale.setScalar(10.5/sz.y);hold.position.set(9.6,FL,-5.2);hold.rotation.y=-.95;g.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true}});sc.add(hold)}).catch(()=>{})}catch(e){}
    /* hspx（開發者 11/12，story/116 選「Claude 混搭」）：幻影棋客頭上的小黑洞——App 用 ex.bhOrb 控制："ball"＝有裂痕的小黑洞球、"dust"＝去過黑洞後頭上留的一圈星塵、其他＝沒有。
       球浮在對手頭頂、裂痕紫光一明一暗；點到它（infoPick 回 "orb"）就化成紫光往遠處飛走（App 再接台詞和引導） */
    let ORB=null,orbK=null,orbT=1,orbFlyT=-1;const orbV=new T.Vector3(0,SY+8,BZ+1),orbBB=new T.Box3();
    const orbMake=()=>{const g=new T.Group();g.name="bhOrb";
      const core=new T.Mesh(new T.SphereGeometry(1,32,24),new T.MeshBasicMaterial({color:0x07050f,fog:false}));
      const crk=cv(512,256,(x,w,h)=>{x.clearRect(0,0,w,h);x.lineCap="round";const R=(a,b)=>a+Math.random()*(b-a);
        for(let k=0;k<9;k++){let px=R(0,w),py=R(h*.2,h*.8);x.beginPath();x.moveTo(px,py);for(let q=0;q<6;q++){px+=R(-38,38);py+=R(-26,26);x.lineTo(px,py)}
          x.strokeStyle="rgba(190,120,255,.95)";x.lineWidth=R(1.5,4);x.shadowColor="rgba(170,90,255,1)";x.shadowBlur=10;x.stroke()}});
      const cm=new T.MeshBasicMaterial({map:crk,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}),cracks=new T.Mesh(new T.SphereGeometry(1.015,32,24),cm);
      const halo=new T.Sprite(new T.SpriteMaterial({map:radial("rgba(200,150,255,.9)","rgba(110,60,220,.35)"),transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));halo.scale.setScalar(4.2);
      const hit=new T.Mesh(new T.SphereGeometry(2.3,12,8),new T.MeshBasicMaterial({visible:false}));   /* 點擊範圍比球大一圈，手指好點 */
      const dust=new T.Group();for(let i=0;i<22;i++){const sp=new T.Sprite(new T.SpriteMaterial({map:radial("rgba(255,236,190,1)","rgba(255,210,140,.4)"),transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));const a=i/22*TAU;sp.position.set(Math.cos(a)*1.6,Math.sin(i*1.7)*.18,Math.sin(a)*1.6);sp.scale.setScalar(.28+Math.random()*.18);dust.add(sp)}
      /* 幻譜星門（"gate"，07gx-galaxy.js）：戰勝過黑洞以後，小黑洞完全張開——紫金漩渦、中心轉著一張小棋盤、外圍一圈 13 點星光（打過的星系亮金色） */
      const gate=new T.Group(),SWM=new T.SpriteMaterial({map:cv(256,256,(x,w,h)=>{const c=w/2;x.clearRect(0,0,w,h);const gr=x.createRadialGradient(c,c,0,c,c,c);gr.addColorStop(0,"rgba(4,2,10,1)");gr.addColorStop(.32,"rgba(10,4,24,1)");gr.addColorStop(.5,"rgba(120,70,220,.85)");gr.addColorStop(.72,"rgba(240,200,120,.45)");gr.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=gr;x.fillRect(0,0,w,h);
        x.lineCap="round";for(let k=0;k<5;k++){x.beginPath();for(let a=0;a<5.5;a+=.06){const r=c*.3+a*c*.11,an=a+k*TAU/5;x.lineTo(c+Math.cos(an)*r,c+Math.sin(an)*r)}x.strokeStyle="rgba(255,226,150,.55)";x.lineWidth=3;x.stroke()}}),transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}),swirl=new T.Sprite(SWM);swirl.scale.setScalar(4.8);
      const mini=new T.Sprite(new T.SpriteMaterial({map:cv(128,140,(x,w,h)=>{x.fillStyle="rgba(20,14,30,.92)";x.fillRect(0,0,w,h);x.strokeStyle="#F2C14E";x.lineWidth=3;const X=c=>10+c*13.5,Y=r=>10+r*13.3;for(let r=0;r<10;r++){x.beginPath();x.moveTo(X(0),Y(r));x.lineTo(X(8),Y(r));x.stroke()}for(let c=0;c<9;c++){x.beginPath();if(c===0||c===8){x.moveTo(X(c),Y(0));x.lineTo(X(c),Y(9))}else{x.moveTo(X(c),Y(0));x.lineTo(X(c),Y(4));x.moveTo(X(c),Y(5));x.lineTo(X(c),Y(9))}x.stroke()}}),transparent:true,depthWrite:false,fog:false,toneMapped:false}));mini.scale.set(1.25,1.37,1);mini.renderOrder=3;
      const ring=new T.Group(),stars=[];for(let i=0;i<13;i++){const sp=new T.Sprite(new T.SpriteMaterial({map:radial("rgba(255,255,255,1)","rgba(255,255,255,.35)"),color:0x6E7BA8,transparent:true,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));const a=i/13*TAU;sp.position.set(Math.cos(a)*2.7,0,Math.sin(a)*2.7);sp.scale.setScalar(.55);ring.add(sp);stars.push(sp)}
      gate.add(swirl,mini,ring);gate.visible=false;
      g.add(halo,core,cracks,hit,dust,gate);g.userData.parts={core,cracks,halo,hit,dust,cm,gate,swirl,ring,stars,mini};g.visible=false;sc.add(g);return g};
    let orbLitK="";
    const orbSet=(k,lit)=>{k=k==="ball"||k==="dust"||k==="gate"?k:null;if(k==="gate"&&ORB){const L=(lit||[]).map(v=>v?1:0).join("");if(L!==orbLitK){orbLitK=L;ORB.userData.parts.stars.forEach((s,i)=>s.material.color.setHex(lit&&lit[i]?0xFFD76A:0x6E7BA8))}}
      if(k===orbK)return;orbK=k;if(orbFlyT>=0)return;if(!k){if(ORB)ORB.visible=false;return}ORB=ORB||orbMake();const P=ORB.userData.parts,ball=k==="ball",gt=k==="gate";
      P.core.visible=P.cracks.visible=P.halo.visible=ball;P.dust.visible=k==="dust";P.gate.visible=gt;ORB.scale.setScalar(ball?.85:1);ORB.visible=true;orbT=1;if(gt){orbLitK="";orbSet("gate",lit)}};
    const orbHit=()=>!!(ORB&&ORB.visible&&(orbK==="ball"||orbK==="gate")&&orbFlyT<0&&ray.intersectObject(ORB.userData.parts.hit,false).length);
    /* 幻譜星門的星系主宰（07gx gxParkEx 的 ex.gx＝{c 主色, c2 第二色}）：同一個幻影棋客模型，用星系顏色的點光源把他照亮、身後一圈星系色的光暈 */
    let GXF=null,gxK="";
    const gxSet=gx=>{const k=gx&&gx.c?gx.c+"|"+(gx.c2||""):"";if(k===gxK)return;gxK=k;if(GXF){for(const o of GXF.objs)sc.remove(o);GXF=null}if(!k)return;
      const l1=new T.PointLight(new T.Color(gx.c),2.4,28,1.6),objs=[l1],h=new T.Sprite(new T.SpriteMaterial({map:radial("rgba(255,255,255,.95)","rgba(255,255,255,.3)"),color:new T.Color(gx.c),transparent:true,opacity:.55,blending:T.AdditiveBlending,depthWrite:false,fog:false,toneMapped:false}));h.scale.setScalar(11);h.renderOrder=-.1;objs.push(h);
      let l2=null;if(gx.c2){l2=new T.PointLight(new T.Color(gx.c2),1.6,22,1.6);objs.push(l2)}for(const o of objs)sc.add(o);GXF={objs,l1,l2,h}};
    let gxT=1;const gxC=new T.Vector3(0,SY+3,BZ+1);
    const gxFxTick=(dt,ts)=>{if(!GXF)return;gxT+=dt;if(gxT>.5){gxT=0;try{orbBB.setFromObject(opp.g);if(!orbBB.isEmpty()&&isFinite(orbBB.max.y))orbBB.getCenter(gxC)}catch(e){}}const cx=gxC.x,cy=gxC.y,cz=gxC.z;
      GXF.l1.position.set(cx+3,cy+3,cz+4);GXF.h.position.set(cx,cy+1,cz-2.5);GXF.h.material.opacity=.45+.15*Math.sin(ts*1.6);if(GXF.l2)GXF.l2.position.set(cx-4,cy+2,cz+3)};
    const orbFly=()=>{orbFlyT=0;pwPoke(1500)};
    const orbTick=(dt,ts)=>{gxFxTick(dt,ts);if(!ORB||!ORB.visible)return;orbT+=dt;if(orbT>1){orbT=0;try{orbBB.setFromObject(opp.g);if(!orbBB.isEmpty()&&isFinite(orbBB.max.y))orbV.set((orbBB.min.x+orbBB.max.x)/2,orbBB.max.y+1.8,(orbBB.min.z+orbBB.max.z)/2)}catch(e){}}
      const P=ORB.userData.parts;
      if(orbFlyT>=0){orbFlyT+=dt;const f=Math.min(1,orbFlyT/1.3),e=f*f;ORB.position.set(orbV.x-34*e,orbV.y+26*e,orbV.z-70*e);ORB.scale.setScalar(.85*(1-.8*f));P.halo.material.opacity=1-f;P.cm.opacity=1-f;
        if(f>=1){ORB.visible=false;orbFlyT=-1;P.halo.material.opacity=1;P.cm.opacity=1;if(orbK){const k=orbK;orbK=null;orbSet(k)}}else pwPoke(200);return}
      ORB.position.set(orbV.x,orbV.y+(orbK==="gate"?1.6:0)+Math.sin(ts*1.3)*.25,orbV.z);ORB.rotation.y+=dt*.35;P.cm.opacity=.55+.45*Math.sin(ts*2.4);P.dust.rotation.y+=dt*.25;if(orbK==="gate"){P.swirl.material.rotation-=dt*.6;P.ring.rotation.y+=dt*.3}};
    // 意見回饋 218：小帥坐在我這一側、棋盤左前角外的桌面上，面向我、身體往後仰一點（鏡頭在上方，這樣看得到臉）；
    // 之前 sc.add 被寫進註解裡，小帥根本沒出現。位置在棋盤框外，不會擋到棋子
    /* 意見回饋 362、365：小帥坐在自己的椅子上（桌子外緣、棋盤左前角旁），面向對手；椅背在他身後（靠鏡頭那側、很矮） */
    const MP=window.__MATE||{},MX=MP.x!=null?MP.x:0,MZ=MP.z!=null?MP.z:11.6,MS=MP.s||4.1,MSEAT=MP.y!=null?MP.y:SY,SEAT_AT=MP.at||.55,SEAT_H=(MSEAT-FL)/SEAT_AT,SEAT_BACK=.6,SEAT_TILT=.3;   /* 座椅圖：高度、椅面在圖上的高度比例、往對手那邊退多少（讓小帥畫在椅子前面）、面向鏡頭的程度 */
    {const wood=M(0x7A4A25,{roughness:.6}),dark=M(0x4E2E16,{roughness:.6}),ch=new T.Group();
      const box=(w,h,d,x,y,z,m)=>{const b=new T.Mesh(new T.BoxGeometry(w,h,d),m);b.position.set(x,y,z);b.castShadow=true;b.receiveShadow=true;ch.add(b)};
      box(2.7,.32,2.5,0,MSEAT-.16,0,wood);for(const[x,z]of[[-1.15,-1.05],[1.15,-1.05],[-1.15,1.05],[1.15,1.05]])box(.28,MSEAT-FL,.28,x,(MSEAT+FL)/2,z,dark);
      box(2.7,1.3,.26,0,MSEAT+.65,1.12,wood);box(2.9,.22,.34,0,MSEAT+1.33,1.12,dark);
      ch.position.set(MX,0,MZ);ch.rotation.y=-.3;sc.add(ch);
      /* 意見回饋 365：換成 Gemini 畫的朝代座椅（data/seat/<朝代>.webp，從斜後上方看的去背圖）。椅子放在石台座上、台座接到地面；圖載好就把木椅收起來 */
      const src="data/seat/"+EK+".webp",put=()=>{const im=imgCache[src];if(!im||!im.naturalWidth||!el.isConnected||ch.userData.done)return;ch.userData.done=1;
        /* 意見回饋 402：貼圖座椅從某些角度看還是像浮著——改成真正的 3D 鼓凳：從地面一路接到椅面，表面用那個朝代座椅圖的花紋，坐墊用圖上的主色 */
        const Hs=MSEAT-FL,R=1.75*MS/4.1,c=document.createElement("canvas");c.width=512;c.height=256;const g=c.getContext("2d"),iw=im.naturalWidth,ih=im.naturalHeight;
        g.fillStyle="#6b4a2e";g.fillRect(0,0,512,256);for(const x of[0,256])g.drawImage(im,iw*.18,ih*.45,iw*.64,ih*.5,x,0,256,256);
        const q=document.createElement("canvas");q.width=q.height=8;const qg=q.getContext("2d");qg.drawImage(im,iw*.3,ih*.15,iw*.4,ih*.3,0,0,8,8);let cr=0,cg=0,cb=0,cn=0;
        try{const d=qg.getImageData(0,0,8,8).data;for(let i=0;i<d.length;i+=4)if(d[i+3]>200){cr+=d[i];cg+=d[i+1];cb+=d[i+2];cn++}}catch(e){}
        const top=cn?new T.Color(`rgb(${cr/cn|0},${cg/cn|0},${cb/cn|0})`):new T.Color(0x3a5a8a),st=srgb(new T.CanvasTexture(c));st.wrapS=T.RepeatWrapping;st.anisotropy=ANI;
        const body=new T.Mesh(new T.CylinderGeometry(R*.9,R*.82,Hs-.5,40,1,false),[new T.MeshStandardMaterial({map:st,roughness:.65}),new T.MeshStandardMaterial({color:top,roughness:.8}),new T.MeshStandardMaterial({color:0x3a2a1c,roughness:.9})]);
        body.position.set(MX,FL+(Hs-.5)/2,MZ);body.castShadow=true;body.receiveShadow=true;sc.add(body);
        const pad=new T.Mesh(new T.CylinderGeometry(R*.95,R*.92,.5,40),new T.MeshStandardMaterial({color:top,roughness:.85}));pad.position.set(MX,MSEAT-.25,MZ);pad.castShadow=true;pad.receiveShadow=true;sc.add(pad);
        const foot=new T.Mesh(new T.CylinderGeometry(R*.86,R*.92,.3,40),new T.MeshStandardMaterial({color:0x2e2218,roughness:.9}));foot.position.set(MX,FL+.15,MZ);foot.receiveShadow=true;sc.add(foot);
        if(window.__PDBG)window.__PDBG={sc,cam,body,FL,MSEAT};
        ch.visible=false};
      if(loadImg(src,put))setTimeout(put,0)}
    const mate=actor(new T.Group(),mkBub(MX+1.2,MSEAT+MS*2.6,MZ-.8,3.4));mate.g.position.set(MX,MSEAT,MZ);mate.g.rotation.set(.04,PI,0,"YXZ");   /* 意見回饋 374：坐在對手正對面、背對鏡頭 */   /* 意見回饋 365：轉身面向對手、背對鏡頭，像跟對方對弈 */mate.g.scale.setScalar(MS);sc.add(mate.g);
    function mateTop(){mate.g.traverse(o=>{o.renderOrder=6})}   /* 小帥的每個零件都畫在座椅圖之後（座椅不做深度比較） */
    let oppKey="",watchKey="",watchers=[];const watchG=new T.Group();sc.add(watchG);
    const SPOTS=[-31,31,-47,47,-66,66,-90,90].map(d=>d*PI/180),plinthM=M(0x8F8A80,{roughness:.9});
    const setWatchers=list=>{list=(list||[]).slice(0,8);const k=JSON.stringify(list);if(k===watchKey)return;watchKey=k;watchG.clear();watchers=[];
      list.forEach((w,i)=>{const a=SPOTS[i],r=19,x=Math.sin(a)*r,z=-Math.cos(a)*r,FY=FL;   /* 觀戰的人站在地上 */
        const pl=new T.Mesh(new T.CylinderGeometry(2.4,2.8,FY-GY,20),plinthM);pl.position.set(x,(FY+GY)/2,z);pl.receiveShadow=true;watchG.add(pl);
        const g=new T.Group();g.position.set(x,FY,z);g.rotation.y=Math.atan2(-x,-z);g.scale.setScalar(3.1);g.userData.pid=w&&w.id;watchG.add(g);
        try{const B=XQBot3D.figure((w&&w.bot)||{});g.add(B.bot);B.bot.traverse(o=>{if(o.isMesh)o.castShadow=true});watchers.push({B,ph:Math.random()*TAU,blinkT:1+Math.random()*3,chin:i%3===1})}catch(e){}})};
    const buildActor=(A,look)=>{A.g.clear();A.B=null;try{if(window.XQBot3D&&XQBot3D.figure){A.B=XQBot3D.figure(look||{});A.g.add(A.B.bot);A.B.bot.traverse(o=>{if(o.isMesh)o.castShadow=true});seat(A.B)}}catch(e){A.B=null}};
    // 電腦對手用手繪 Pikafish（開發者用 Gemini 畫的 6 個姿勢，data/pika/）：圖載好之前先用 3D 版，載好就換成手繪版
    // 手繪 Pikafish 面板的大小與位置：高度、腳底高度、前後位置、往鏡頭微微傾斜
    const SPR_H=11.2,SPR_Y=SY-2.5,SPR_Z=BZ+2.6,SPR_TILT=-.18;
    let oppSpr=null;const POSES=["idle","think","move","happy","sad","surprise"];
    const killSpr=()=>{if(oppSpr){sc.remove(oppSpr.sp);oppSpr.sp.material.dispose();oppSpr=null}opp.g.visible=true};
    const makeSpr=look=>{const base=look.sprite,meta=look.spriteMeta,ch=look.p||"將",red="帥仕相俥傌炮兵".includes(ch),ims={};let n=0;
      const done=()=>{if(++n<POSES.length||oppKey!==JSON.stringify(look))return;
        const tex={};for(const ps of POSES){const im=ims[ps],f=(meta.faceOf&&meta.faceOf[ps])||meta.face;
          tex[ps]=cv(meta.w,meta.h,(g,w,h)=>{g.clearRect(0,0,w,h);g.drawImage(im,0,0,w,h);if(!f)return;
            if(meta.mask){try{const cx=f.cx*w,cy=f.cy*h,r=f.r*w,o=document.createElement("canvas");o.width=w;o.height=h;const og=o.getContext("2d");
              og.fillStyle=red?"#B3141B":"#1A1410";og.font=`900 ${r*1.15}px "Noto Serif TC","PMingLiU","Songti TC","SimSun",serif`;og.textAlign="center";og.textBaseline="middle";og.fillText(ch,cx,cy+r*.04);
              const base=g.getImageData(0,0,w,h).data,od=og.getImageData(0,0,w,h),t=od.data;
              for(let i=0;i<t.length;i+=4){if(!t[i+3])continue;const mn=Math.min(base[i],base[i+1],base[i+2]),sat=Math.max(base[i],base[i+1],base[i+2])-mn;
                const k=base[i+3]<200?0:Math.min(1,Math.max(0,(mn-215)/25))*Math.min(1,Math.max(0,(30-sat)/15));t[i+3]=t[i+3]*k}
              og.putImageData(od,0,0);g.drawImage(o,0,0)}catch(e){}return}   /* 開發者：字只寫在身上留白的圓，不能蓋到臉、手、道具 */   /* 擂主（Gemini 畫的人物）沒有字圈，不寫字 */
            const cx=f.cx*w,cy=(f.cy+.01)*h,r=f.r*w*.86,ink=red?"#B3141B":"#1A1410";g.strokeStyle=ink;g.lineWidth=r*.07;g.beginPath();g.arc(cx,cy,r*.9,0,TAU);g.stroke();
            g.fillStyle=ink;g.font=`900 ${r*1.25}px "Noto Serif TC","PMingLiU","Songti TC","SimSun",serif`;g.textAlign="center";g.textBaseline="middle";g.fillText(ch,cx,cy+r*.06)})}
        // 直立的面板（不是永遠正對鏡頭的那種）：鏡頭從上往下看時才不會往後倒、插進靠背裡
        const H=SPR_H,mat=new T.MeshBasicMaterial({map:tex.idle,transparent:true,toneMapped:false,fog:false,depthWrite:false,alphaTest:.02});
        const geo=new T.PlaneGeometry(H*meta.w/meta.h,H);geo.translate(0,H/2,0);const sp=new T.Mesh(geo,mat);sp.renderOrder=2;
        const y0=SPR_Y;sp.position.set(0,y0,SPR_Z);sp.rotation.x=SPR_TILT;sc.add(sp);oppSpr={sp,tex,pose:"idle",y0};opp.g.visible=false};
      for(const ps of POSES){const src=base+((look.spriteMap&&look.spriteMap[ps])||ps)+".webp",   /* 擂主只有 idle、think、move、win、lose：用 spriteMap 對到 Pikafish 的六種姿勢 */im=loadImg(src,()=>{ims[ps]=imgCache[src];done()});if(im){ims[ps]=im;done()}}};
    /* 開發者 11/11：車輪戰的真實 3D 棋客（look.stool，08s-simul.js SIM_SEAT）是坐在木凳上的靜態模型：凳面對齊座高 SY、凳腳落在地面 FL；桌上對面右角立一面這位棋客的棋位牌（XQBot3D.plate）。換人時拿掉 */
    /* hspx（開發者 11/12 圈起桌角那顆立著的「馬」說 fix it）：棋位牌立在桌緣像掉出來的棋子，不再擺；只留換人時清掉舊牌 */
    let oppPl=null;const oppPlate=look=>{if(oppPl){sc.remove(oppPl);oppPl=null}if(true||!look||!window.XQBot3D||!XQBot3D.plate)return;try{oppPl=XQBot3D.plate(look.p,.7);oppPl.position.set(6.3,.02,-6.75);sc.add(oppPl)}catch(e){oppPl=null}};
    const setOpp=look=>{const k=JSON.stringify(look||null);if(k===oppKey)return;oppKey=k;killSpr();oppPlate(null);if(!look){opp.g.clear();opp.B=null;return}if(look.flat&&look.sprite&&look.spriteMeta){opp.g.clear();opp.B=null;makeSpr(look);return}buildActor(opp,look);opp.g.visible=true;opp.g.position.y=SY-.9;opp.g.userData.y0=null;
      /* 意見回饋 577：對手用真實 3D（站姿模型）時一樣改成坐著：臀部落在長榻的座面（SY），腿沉進座位裡 */
      if(opp.B&&opp.B.glbP)opp.B.glbP.then(ok=>{if(!ok||oppKey!==k||!opp.B||!opp.B.glb)return;try{opp.g.updateMatrixWorld(true);let b=new T.Box3().setFromObject(opp.B.glb),H=b.max.y-b.min.y;if(Array.isArray(look.stool)&&look.stool[0]>0){opp.B.glb.scale.multiplyScalar((SY-FL)/(look.stool[0]*H));opp.g.updateMatrixWorld(true);b=new T.Box3().setFromObject(opp.B.glb);opp.g.position.y-=b.min.y-FL;oppPlate(look)}else opp.g.position.y-=b.min.y-(SY-H*.27);opp.g.userData.y0=null}catch(e){}}).catch(()=>{})};   /* 開發者：園子的路人棋友、故事人物用 Gemini 畫好的形象（平面立牌） */   /* 意見回饋 377：對手（Pikafish、擂主）一律用 3D 立體的，繞著桌子轉也是立體的 */
    // 我這一側的小帥：平常是自己的；觀戰時換成棋盤近端那一方玩家的小帥（意見回饋 259）
    /* 意見回饋 551：小帥坐在鼓凳上，可是腿往正前方伸、被圓牌身體整個擋住，從背後的鏡頭看像站在凳子上。
       改成兩腿往左右張開、伸出圓牌外（髖部也往外挪），身體稍微往後靠，從背後看得到兩隻腳掛在凳子邊 */
    const mateSit=B=>{if(!B||!B.legs)return;B.legs.forEach((l,i)=>{const sd=i?1:-1;l.rotation.order="YXZ";l.rotation.y=sd*.6;l.position.x=sd*.5;
      /* 加一段小腿：原本的腿當大腿（往前平放），腳移到膝蓋下面，中間補一段同材質的小腿往下垂（腿的 -y＝往前，-z＝往下） */
      const th=l.children.find(m=>m.isMesh&&m.geometry&&m.geometry.type==="CapsuleGeometry"),ft=l.children.find(m=>m.isMesh&&m.geometry&&m.geometry.type==="SphereGeometry");
      if(th&&ft&&!l.userData.knee){l.userData.knee=1;const sh=new T.Mesh(th.geometry,th.material);sh.rotation.x=PI/2;sh.position.set(0,-.4,-.17);sh.castShadow=true;l.add(sh);ft.position.set(0,-.46,-.38);ft.scale.set(1,1.35,.6)}});if(B.torso)B.torso.rotation.x=-.1};
    let mateKey=null;const setMate=look=>{const k=JSON.stringify(look||null);if(k===mateKey)return;mateKey=k;mate.g.position.y=MSEAT;mate.g.userData.y0=null;
      buildActor(mate,look||{});mateSit(mate.B);mateTop();try{mate.g.updateMatrixWorld(true);const b=new T.Box3().setFromObject(mate.B&&mate.B.torso&&!mate.B.glb?mate.B.torso:mate.g);   /* 551：用身體底部對齊座面，小腿垂在凳子旁邊 */mate.g.position.y-=b.min.y-(MSEAT+.02)}catch(e){}
      /* 意見回饋 577：真實 3D 的小帥是站姿模型、腿彎不了，照上面對齊會變成腳踩在凳面上（站在凳子上）。模型載好後改成臀部落在凳面、腿沉進鼓凳裡，從哪個角度看都是坐著 */
      if(mate.B&&mate.B.glbP)mate.B.glbP.then(ok=>{if(!ok||mateKey!==k||!mate.B||!mate.B.glb)return;try{mate.g.updateMatrixWorld(true);const b=new T.Box3().setFromObject(mate.B.glb),H=b.max.y-b.min.y;mate.g.position.y-=b.min.y-(MSEAT-H*.27);mate.g.userData.y0=null}catch(e){}}).catch(()=>{})};   // 坐在自己的椅子上（座面 y=MSEAT）
    setMate(null);
    const say=(t,d)=>{pwPoke(((+d)||2.6)*1000);return mate.say(t,d)};
    /* ---------- 11/10 開發者「園子熱鬧、人來人往」（Gemini 62；開發者選 4 貓咪佔位、2 絕殺驚呼、3 市井煙火、1 七星打氣；小販、貓經史學顧問核過）----------
       七星打氣：每盤最多一次，開局約 90 秒後（沒人被將軍、沒按著棋子時），一位沒上場的雲河七星（App 給 ex.crowd.vis）從石台邊走到空的觀戰點看 25 秒左右：
         打招呼、你吃到車馬炮時歡呼、將軍時驚呼，走前揮手再走開。
       絕殺驚呼：有人被將軍時，觀戰的人（線上真人觀眾、來訪的七星）舉手往前傾，其中一位冒一句。
       貓咪佔位：開局 40 秒後（七成的盤），一隻狸花貓蜷在右邊宮燈底下睡覺；30 秒沒人走棋就伸個懶腰；這盤下完才走。
       市井煙火：石台後方小徑每 1～2 分鐘有一位小販從右往左走過、中途停下吆喝（秦～南北朝挑柴農夫、隋唐胡商牽駱駝、五代宋元搖鼓貨郎、明清豆花擔）。
       近處加進來的 3D 人最多 1 位；被將軍、按著棋子時不生新的人 */
    /* 11/10 開發者「這完全不是我要的，畫面變得很冗，看能怎麼改進或直接拿掉」（截圖：挑擔小販從棋桌正前方走過）：七星來訪、貓、小販整套先關掉，後園只留對手和觀戰棋友 */
    const CR_ON=false;
    const CR={D:null,gT:0,idle:0,chk:null,vis:null,visDone:false,visPre:null,cat:null,catAt:40+Math.random()*20,catOn:Math.random()<.7,ven:null,venAt:25+Math.random()*20,wb:null,wbT:0,ended:false,tx:{},ms:null};
    const CR_VK={qin:"han",han:"han",sanguo:"han",weijin:"han",nanbei:"han",sui:"tang",tang:"tang",wudai:"song",song:"song",yuan:"song"},CR_CRY={han:["賣柴喲——","新摘的菜——"],tang:["西域香料——","好絲綢——"],song:["搖鼓兒——針線玩意兒","貨郎來囉——"],ming:["熱豆花喲——","豆腐腦，熱乎的——"]};
    const crPick=a=>a&&a.length?a[Math.random()*a.length|0]:"";
    const crTex=(n,cb)=>{const src="data/crowd/"+n+".webp";if(CR.tx[n]){cb(CR.tx[n]);return}const go=()=>{const im=imgCache[src];if(!im||!im.naturalWidth||CR.tx[n])return;const t=srgb(new T.Texture(im));t.anisotropy=ANI;t.needsUpdate=true;CR.tx[n]={t,a:im.naturalWidth/im.naturalHeight};cb(CR.tx[n])};if(loadImg(src,go))go()};
    const crCard=(tx,h)=>{const w=h*tx.a,geo=new T.PlaneGeometry(w,h);geo.translate(0,h/2,0);const m=new T.Mesh(geo,new T.MeshBasicMaterial({map:tx.t,transparent:true,alphaTest:.05,toneMapped:false,side:T.DoubleSide,depthWrite:true}));m.renderOrder=3;sc.add(m);return m};
    const crSay=(b,txt,d)=>{const m=b.material;if(m.map)m.map.dispose();m.map=bubbleTex(txt);m.needsUpdate=true;b.visible=true;b.userData.t=d||2.4};
    const crFloor=(x,z)=>{try{if(!CR.ms){CR.ms=[];sc.traverse(o=>{if(o.isMesh&&o.visible&&!(o.material&&o.material.transparent))CR.ms.push(o)})}
      const rc=new T.Raycaster(new T.Vector3(x,30,z),new T.Vector3(0,-1,0));for(const h of rc.intersectObjects(CR.ms,false))if(h.point.y<-1)return h.point.y}catch(e){}return FL};
    const crPlay=(B,k)=>{if(!B||!B.mixer||!B.clips)return;if(!B.clips[k])k="idle";if(!B.clips[k]||B.animCur===k)return;const n=B.clips[k];n.reset().fadeIn(.25).play();const o0=B.clips[B.animCur];if(o0)o0.fadeOut(.25);B.animCur=k};
    /* 七星來訪 */
    const crVisPrep=()=>{const V=CR.D&&CR.D.vis;if(!V||CR.visPre||!window.XQBot3D)return;let B;try{B=XQBot3D.figure(V.look)}catch(e){return}CR.visPre={B,V,ok:!B.glbP};if(B.glbP)B.glbP.then(ok=>{if(CR.visPre&&CR.visPre.B===B)CR.visPre.ok=!!ok}).catch(()=>{})};
    const crVisGo=()=>{const P=CR.visPre;if(!P||!P.ok)return false;const i=watchers.length;if(i>=SPOTS.length)return false;const a=SPOTS[i],g=new T.Group();g.add(P.B.bot);P.B.bot.traverse(o=>{if(o.isMesh)o.castShadow=true});g.scale.setScalar(3.1);sc.add(g);
      const y19=crFloor(Math.sin(a)*19,-Math.cos(a)*19),y24=crFloor(Math.sin(a)*24,-Math.cos(a)*24);
      CR.vis={g,B:P.B,V:P.V,a,y19,y24,ph:"in",t:0,act:0,hop:0,bub:mkBub(0,0,0,5.6)};CR.visPre=null;CR.visDone=true;crPlay(P.B,"walk");return true};
    const crVisPos=(V,r)=>{const x=Math.sin(V.a)*r,z=-Math.cos(V.a)*r,y=V.y19+(V.y24-V.y19)*Math.max(0,Math.min(1,(r-19)/5));V.g.position.set(x,y+V.hop,z);V.bub.position.set(x*.55,y+6.2,z*.8)};
    const crVisBye=()=>{const V=CR.vis;if(!V||V.ph==="bye"||V.ph==="out")return;V.ph="bye";V.t=0;crPlay(V.B,"wave_goodbye_01");crSay(V.bub,crPick(V.V.bye)||"我先走囉！",2.2)};
    const crVisTick=t=>{const V=CR.vis;if(!V)return;V.t+=t;if(V.B.mixer)V.B.mixer.update(t);if(V.bub.userData.t>0){V.bub.userData.t-=t;if(V.bub.userData.t<=0)V.bub.visible=false}
      if(V.act>0){V.act-=t;if(V.act<=0)crPlay(V.B,"idle")}if(V.hop>0)V.hop=Math.max(0,V.hop-t*3);
      if(V.ph==="in"){const u=Math.min(1,V.t/2.2);V.g.rotation.y=Math.atan2(-Math.sin(V.a),Math.cos(V.a));crVisPos(V,24-5*u);if(u>=1){V.ph="hi";V.t=0;crPlay(V.B,"wave_goodbye_01");V.act=1.6;crSay(V.bub,crPick(V.V.hi)||"我來看看！",2.6)}}
      else if(V.ph==="hi"||V.ph==="stay"){crVisPos(V,19);if(V.ph==="hi"&&V.t>1.6){V.ph="stay";V.t=0}if(V.ph==="stay"&&V.t>24)crVisBye()}
      else if(V.ph==="bye"){crVisPos(V,19);if(V.t>1.6){V.ph="out";V.t=0;crPlay(V.B,"walk")}}
      else if(V.ph==="out"){const u=Math.min(1,V.t/2.2);V.g.rotation.y=Math.atan2(Math.sin(V.a),-Math.cos(V.a));crVisPos(V,19+5*u);if(u>=1){sc.remove(V.g);sc.remove(V.bub);CR.vis=null}}};
    /* 貓 */
    const crCatGo=()=>{crTex("cat_sleep",tx=>{if(CR.cat||CR.ended)return;const x=11.2,z=-14.6,y=crFloor(x,z),m=crCard(tx,2.1);m.position.set(x,y+.02,z);m.material.opacity=0;CR.cat={m,x,z,y,op:0,str:0,last:-99,out:false}});crTex("cat_stretch",()=>{})};
    const crCatTick=(t,now)=>{const C=CR.cat;if(!C)return;C.m.rotation.y=Math.atan2(cam.position.x-C.x,cam.position.z-C.z);
      if(C.out){C.op=Math.max(0,C.op-t*.8);if(C.op<=0){sc.remove(C.m);CR.cat=null;return}}else C.op=Math.min(1,C.op+t*.7);C.m.material.opacity=C.op;
      if(C.str>0){C.str-=t;if(C.str<=0)crTex("cat_sleep",tx=>{C.m.material.map=tx.t;C.m.scale.set(1,1,1)})}
      else if(CR.idle>30&&CR.gT-C.last>45){C.last=CR.gT;C.str=2.8;crTex("cat_stretch",tx=>{const s=CR.tx.cat_sleep;C.m.material.map=tx.t;if(s){C.m.scale.set(tx.a/s.a*1.15,1.15,1)}})}};
    /* 小販 */
    const crVenGo=()=>{const k=CR_VK[EK]||"ming";crTex("vend_"+k,tx=>{if(CR.ven)return;const pts=[];for(let i=0;i<=24;i++){const x=30-60*i/24,z=-21.5;pts.push([x,crFloor(x,z),z])}   /* 石台後緣、宮燈後面，從右走到左（預設視角左右上角看得到） */
      const m=crCard(tx,k==="tang"?10.5:9);CR.ven={m,pts,k,t:0,said:false,bub:mkBub(0,0,0,6)}})};
    const crVenTick=t=>{const V=CR.ven;if(!V)return;V.t+=t;const D=22,P=2.6,mid=D/3;   /* 走到右邊宮燈旁停下吆喝 */let u=V.t<mid?V.t/D:V.t<mid+P?mid/D:(V.t-P)/D;if(u>=1){sc.remove(V.m);sc.remove(V.bub);CR.ven=null;CR.venAt=CR.gT+60+Math.random()*60;return}
      const f=u*24,i=Math.min(23,Math.floor(f)),q=f-i,A=V.pts[i],B=V.pts[i+1],x=A[0]+(B[0]-A[0])*q,y=A[1]+(B[1]-A[1])*q,z=A[2]+(B[2]-A[2])*q,walk=!(V.t>=mid&&V.t<mid+P);
      V.m.position.set(x,y+(walk?Math.abs(Math.sin(V.t*6))*.18:0),z);V.m.rotation.y=Math.atan2(cam.position.x-x,cam.position.z-z);V.m.rotation.z=walk?Math.sin(V.t*6)*.025:0;
      if(!walk&&!V.said){V.said=true;crSay(V.bub,crPick(CR_CRY[V.k]),2.4)}V.bub.position.set(x,y+(V.k==="tang"?12.5:11),z);if(V.bub.userData.t>0){V.bub.userData.t-=t;if(V.bub.userData.t<=0)V.bub.visible=false}};
    /* 每格 */
    CR.tick=(t,now)=>{if(!CR_ON||!CR.D)return;CR.gT+=t*(window.__crowdFast?12:1);   /* __crowdFast：只給測試快轉 */CR.idle+=t;const busy=!!CR.chk||selI>=0;
      if(CR.wbT>0){CR.wbT-=t;if(CR.wbT<=0&&CR.wb)CR.wb.visible=false}
      if(!CR.ended){if(!CR.visDone&&CR.D.vis&&CR.gT>80)crVisPrep();if(!CR.visDone&&!CR.vis&&CR.gT>90&&!busy)crVisGo();
        if(CR.catOn&&!CR.cat&&CR.gT>CR.catAt&&!busy)crCatGo()}
      if(!CR.ven&&CR.gT>CR.venAt&&!busy)crVenGo();
      crVisTick(t);crCatTick(t,now);crVenTick(t)};
    /* 棋局事件：開新局、將軍、走子吃子、分勝負 */
    CR.data=(D,o,ex)=>{CR.D=D;if(window.__crowdFast)window.__CR=CR;if(!D)return;const fresh=!(o&&o.last)&&!ex.result;if(o&&o.last)CR.had=true;
      if(fresh&&(CR.ended||CR.had)){CR.had=false;CR.gT=0;CR.idle=0;CR.ended=false;CR.visDone=false;CR.catAt=40+Math.random()*20;CR.catOn=Math.random()<.7;if(CR.cat)CR.cat.out=true}
      if(ex.result&&!CR.ended){CR.ended=true;if(CR.vis){const V=CR.vis;if(ex.result===mySide&&V.ph==="stay"){crPlay(V.B,"cheer");crSay(V.bub,crPick(V.V.cheer)||"贏了！",2.2);setTimeout(crVisBye,2200)}else crVisBye()}if(CR.cat)CR.cat.out=true}};
    CR.chkSet=side=>{if(side&&side!==CR.chk){watchers.forEach(W=>{W.react=1.5});
        if(watchers.length){const W=watchers[Math.random()*watchers.length|0],p=W.B.bot.parent&&W.B.bot.parent.position;if(p){if(!CR.wb)CR.wb=mkBub(0,0,0,4.6);CR.wb.position.set(p.x,p.y+9.5,p.z);crSay(CR.wb,crPick(["哇！將軍！","危險！","這步厲害！","小心老將！"]),2);CR.wbT=2}}
        const V=CR.vis;if(V&&(V.ph==="stay"||V.ph==="hi")){V.hop=.8;crSay(V.bub,side===mySide?crPick(V.V.chk)||"小心，被將軍了！":crPick(V.V.jiang)||"將軍！好棋！",2.2);if(side!==mySide){crPlay(V.B,"cheer");V.act=1.6}}}
      CR.chk=side||null};
    CR.move=(by,cap)=>{CR.idle=0;const V=CR.vis;if(cap&&V&&V.ph==="stay"&&V.act<=0&&by===mySide&&"RNCrnc".includes(cap)){crPlay(V.B,"cheer");V.act=1.8;crSay(V.bub,crPick(V.V.cheer)||"吃得好！",2)}};
    // 意見回饋 248：分出勝負時兩邊都有 5 秒的勝負動畫（endT 倒數；oppRes／mateRes＝win、lose、draw）
    let endT=0,oppRes=null,mateRes=null;const END=5;
    let reach=0,reachT=0,thinking=false,mood=null,glanceT=3,glance=0,mySide="r",oppName="";
    // ---------- 棋子 ----------
    const pieceGeo=(()=>{const pts=[];const R=.485,H=.27,r=.06;   // 意見回饋：棋子加大（格距 1，半徑 .485，鄰子之間還留 .03 的縫）
     pts.push(new T.Vector2(0,0));pts.push(new T.Vector2(R-r,0));for(let i=0;i<=6;i++){const a=-PI/2+i/6*PI/2;pts.push(new T.Vector2(R-r+Math.cos(a)*r,r+Math.sin(a)*r))}
      for(let i=0;i<=6;i++){const a=i/6*PI/2;pts.push(new T.Vector2(R-r+Math.cos(a)*r,H-r+Math.sin(a)*r))}pts.push(new T.Vector2(0,H));return new T.LatheGeometry(pts,72)})();
    // 棋子（意見回饋 218）：不再用自發光（會把顏色洗白）；改成不經過 ACES 色調映射，並用「光色的倒數」把桌面上的暖光抵銷，
    // 陽光照到的字面＝底圖原本的顏色（飽和、字黑），陰影裡照樣變暗，看起來還是真的在光裡
    const NEUT=neutOf(sc);
    // 鏡面反光調弱：對面那排棋子是斜斜地看，補光的大片反光會把字面刷成灰色（遠處的黑子看起來髒），只留一點點漆光
    const pMat=o=>{try{return new T.MeshPhysicalMaterial(Object.assign({metalness:0,specularIntensity:.22,toneMapped:false},o))}catch(e){return new T.MeshStandardMaterial(Object.assign({metalness:0,toneMapped:false},o))}};
    const faceGeo=new T.CircleGeometry(.435,64),faceMat={},bodyMat={};
    const bMat=red=>{const s=red?"r":"b";if(bodyMat[s])return bodyMat[s];const L=LOOK,im=L&&L.pieces?loadImg(L.pieces[s]):null;
      const c=new T.Color(richHex(im?rimOf(im):"#E2C48C")).multiply(NEUT);return bodyMat[s]=pMat({color:c,roughness:.42})};
    const fMat=(ch,red)=>faceMat[ch+red]||(faceMat[ch+red]=(()=>{const tx=faceTex(ch,red);return pMat({map:tx,color:NEUT,roughness:.5})})());
    const makePiece=p=>{if(GIANT)return gntTake(p);const s=sideOf(p),ch=NAMES[s][p.toUpperCase()],g=new T.Group();const body=new T.Mesh(pieceGeo,bMat(s==="r"));body.castShadow=true;body.receiveShadow=true;g.add(body);
      const f=new T.Mesh(faceGeo,fMat(ch,s==="r"));f.rotation.x=-PI/2;f.position.y=.272;g.add(f);g.userData={p};sc.add(g);return g};
    let flip=false;const pos=i=>{const c=i%9,r=i/9|0;return flip?[4-c,4.5-r]:[c-4,r-4.5]};
    const at=(g,i,lift)=>{const[x,z]=pos(i);g.position.set(x,TOP+(lift||0),z)};
    /* ---------- 巨盤模式（opt.giant，黑洞星樞棋局）的棋子 ----------
       紅方＝雲河七星的 3D 模型（每種棋子第一個是本體，其他同種的是半透明帶星光藍的「星影分身」），胸前補一面本命字圓牌（bot3d o.gly）；
       黑方＝星樞的棋子：墨色立起來的大棋子、星光金字，面向玩家、輕輕浮動。
       sync 每次重排都會拿掉全部棋子再擺：巨盤模式把拿掉的放回池子（gntPool）重用，不重新載模型 */
    const GNT_X={K:"x_shuai",A:"x_shi",B:"x_spiritgirl",N:"x_miaogirl",R:"x_swordboy",C:"x_martialgirl",P:"x_bing"},GNT_CH={K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},GNT_H=1.55;
    /* 開發者 11/12「棋子字太小了，要符合角色背後的棋子」：七星背上本來都揹著一顆大木棋子；從背面正交圖量出那顆棋子的中心（u 由背面看的左邊、v 由頭頂）和半徑，
       圓牌半徑＝棋面（外框的 85%），蓋在他自己的棋子上（量法：scratchpad backs.html）。田飛燕、駱躍梅、雷借花的棋子被頭髮或披風遮住，圓牌貼在遮住的地方 */
    /* 開發者 11/12「宇宙的黑方也是 3D 棋子嗎？如果不是請製作」→ 選「新畫 7 位星樞棋兵」：Gemini 立繪 park/xingshu/xs_*.png → Tripo 靜態站姿 data/tripo_app/xs_*.glb；
       跟七星一樣站在格點上、面向對方、背上補本命字（量法同上）。模型沒骨架，所以不做動作 */
    const GNT_XS={K:"xs_jiang",A:"xs_shi",B:"xs_xiang",N:"xs_ma",R:"xs_che",C:"xs_pao",P:"xs_zu"},GNT_GLYB={K:{u:.5,v:.54,r:.425},A:{u:.5,v:.47,r:.444},B:{u:.5,v:.48,r:.453},N:{u:.5,v:.44,r:.453},R:{u:.5,v:.5,r:.434},C:{u:.49,v:.53,r:.425},P:{u:.5,v:.48,r:.425}};
    const GNT_GLY={K:{u:.5,v:.636,r:.368},A:{u:.49,v:.6,r:.378},B:{u:.53,v:.64,r:.36},N:{u:.5,v:.63,r:.34},R:{u:.5,v:.584,r:.374},C:{u:.5,v:.6,r:.34},P:{u:.5,v:.67,r:.415}};
    const gntPool={},gntCnt={},gntFigs=[],gntStones=[];
    const gntShadow=root=>{const KT=window.XQTOON_KIT;root.traverse(m=>{if(!m.isMesh||m.name==="meGly")return;if(KT&&KT.isHull&&KT.isHull(m)){m.visible=false;m.userData.gntOff=1;return}   /* 水墨描邊的黑殼：半透明的分身會透出一整片黑，分身不描邊 */const ms=(Array.isArray(m.material)?m.material:[m.material]).map(x=>{const c=x.clone();c.transparent=true;c.opacity=.52;c.depthWrite=false;if(c.color)c.color.lerp(new T.Color(0x8FB4FF),.45);if(c.emissive)c.emissive.set(0x1A3A7A);return c});m.material=Array.isArray(m.material)?ms:ms[0];m.castShadow=false})};
    const gntFig=(p,K,blk)=>{const n=gntCnt[p]=(gntCnt[p]||0)+1,body=n===1,g=new T.Group(),inner=new T.Group();g.add(inner);g.userData={p,th:GNT_H*.55,giant:1,body};
      /* 開發者 11/12「底下踩著的棋子不用放上去，只要站角色即可」：不再墊本命棋子底座，角色直接站在棋盤格點上；
         「把棋子放在每個 3D 角色背後，然後他們要面向對方」：本命字圓牌貼在背上（gly.back），角色轉身面向敵陣（gntTake 依 flip 轉 180 度），玩家從後面看得到字 */
      let B=null;try{B=window.XQBot3D&&XQBot3D.figure?XQBot3D.figure({glb:"data/tripo_app/"+(blk?GNT_XS[K]:GNT_X[K])+".glb",p:blk?NAMES.b[K]:GNT_CH[K],gly:Object.assign({back:1,front:blk?{u:.5,v:.55,r:.3}:{u:.5,v:.62,r:.3}},(blk?GNT_GLYB:GNT_GLY)[K])}):null}catch(e){B=null}   /* 開發者 11/12「雙方正面也要把棋子貼上去」：胸前再貼一個（bot3d.js gly.front） */
      if(!B)return gntStone(p);inner.add(B.bot);g.userData.B=B;gntFigs.push(g);
      /* 放大倍數、位置一律在 inner 自己的座標算（量世界座標再扣掉 inner 的世界位置），不然角色會被拉回棋盤中心 */
      const fitTo=(obj,H)=>{inner.scale.setScalar(1);B.bot.position.set(0,0,0);g.updateMatrixWorld(true);const b=new T.Box3().setFromObject(obj),h=b.max.y-b.min.y;if(!(h>0))return false;
        const o=inner.getWorldPosition(new T.Vector3()),c=b.getCenter(new T.Vector3());B.bot.position.set(o.x-c.x,o.y-b.min.y,o.z-c.z);inner.scale.setScalar(H/h);return true};
      try{fitTo(B.bot,GNT_H*.8)}catch(e){}   /* 模型還沒到、或載不到時的 Q 版棋子人：先縮成差不多高 */
      if(B.glbP)B.glbP.then(ok=>{if(!ok||!B.glb)return;if(!fitTo(B.glb,GNT_H))return;B.glb.traverse(m=>{if(m.isMesh)m.castShadow=true});   /* 開發者 11/12「黑洞對戰角色全都是本體好了，不要用透明的」：同種的其他棋子也用不透明本體（gntShadow 留著不用） */pwPoke(800)}).catch(()=>{});
      return g};
    let gntStoneTex={};const gntGlyph=ch=>gntStoneTex[ch]||(gntStoneTex[ch]=(()=>{const c=document.createElement("canvas");c.width=c.height=256;const x=c.getContext("2d");
      const gr=x.createRadialGradient(128,110,10,128,128,128);gr.addColorStop(0,"#2A2F55");gr.addColorStop(.7,"#10132A");gr.addColorStop(1,"#05060D");x.fillStyle=gr;x.beginPath();x.arc(128,128,126,0,TAU);x.fill();
      x.strokeStyle="#E9C46A";x.lineWidth=7;x.beginPath();x.arc(128,128,112,0,TAU);x.stroke();x.lineWidth=2.5;x.beginPath();x.arc(128,128,100,0,TAU);x.stroke();
      for(let i=0;i<26;i++){x.fillStyle=`rgba(255,240,200,${.25+Math.random()*.5})`;const a=Math.random()*TAU,r=60+Math.random()*44;x.fillRect(128+Math.cos(a)*r,128+Math.sin(a)*r,2,2)}
      x.font=`900 128px ${SERIF}`;x.textAlign="center";x.textBaseline="middle";x.shadowColor="rgba(255,214,120,.9)";x.shadowBlur=18;x.fillStyle="#FFE6A3";x.fillText(ch,128,136);
      const t=new T.CanvasTexture(c);if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;else if(T.sRGBEncoding!=null)t.encoding=T.sRGBEncoding;return t})());
    const gntStone=p=>{const s=sideOf(p),ch=NAMES[s][p.toUpperCase()],g=new T.Group(),R0=.46;g.userData={p,th:.55,giant:1,ph:Math.random()*TAU};
      const rim=new T.Mesh(new T.CylinderGeometry(R0,R0,.16,48),new T.MeshStandardMaterial({color:0x1B1F3A,roughness:.35,metalness:.3,emissive:0x101840}));rim.rotation.x=PI/2;
      const fm=new T.MeshBasicMaterial({map:gntGlyph(ch),toneMapped:false}),f1=new T.Mesh(new T.CircleGeometry(R0*.97,48),fm);f1.position.z=.081;
      const glow=new T.Mesh(new T.CircleGeometry(R0*1.5,40),new T.MeshBasicMaterial({color:0x6E8BFF,transparent:true,opacity:.22,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false}));glow.position.z=-.09;
      const st=new T.Group();st.add(rim,f1,glow);st.position.y=R0+.08;g.add(st);g.userData.st=st;gntStones.push(g);return g};
    /* 開發者 11/12「3D 角色變成棋子在對戰的時候也會有相對應的動作表情」：七星照局面做動作（Tripo 綁的 idle／walk／cheer／bow／wave_goodbye_01）——
       自己走子：走路，吃到子接著歡呼；被星樞吃掉一顆：帥揮手示警；贏了全體歡呼、輸了全體鞠躬；做完回待機 */
    const gntAct=(g,k,ms)=>{const B=g&&g.userData&&g.userData.B;if(!B||!B.clips)return;const kk=B.clips[k]?k:({wave:"wave_goodbye_01"})[k]||k;crPlay(B,kk);clearTimeout(g.userData.actT);if(ms)g.userData.actT=setTimeout(()=>{crPlay(B,"idle")},ms);pwPoke(ms||1500)};
    const gntReact=(g,by,cap)=>{if(g&&g.userData&&g.userData.B){gntAct(g,"walk",cap?480:720);if(cap)setTimeout(()=>gntAct(g,"cheer",1900),490)}
      if(sideOf(cap&&cap.userData&&cap.userData.p||"a")==="r"&&cap.userData.B){try{if(window.XQ_BHBELL)window.XQ_BHBELL()}catch(e){}   /* 星樞吃掉七星：一聲極低的鐘 */const k=Object.values(pieces).find(x=>x&&x.userData&&x.userData.B&&x.userData.p==="K");if(k)gntAct(k,"wave",1700)}};
    let gntRes=null;
    const gntTake=p=>{const q=gntPool[p];let g=q&&q.pop();if(g&&g.userData.ped){const[pb,pf,K]=g.userData.ped;pb.material=bMat(true);pf.material=fMat(NAMES.r[K],true)}   /* 換造型（refreshLook）會把舊的棋子材質丟掉，重用的底座要換新的 */if(!g){const K=p.toUpperCase();g=sideOf(p)==="r"?(GNT_X[K]?gntFig(p,K):gntStone(p)):(GNT_XS[K]?gntFig(p,K,true):gntStone(p))}g.visible=true;g.rotation.set(0,g.userData.B?((sideOf(p)==="r")!==flip?PI:0):0,0);sc.add(g);return g};
    const gntDrop=g=>{sc.remove(g);if(g&&g.userData&&g.userData.giant){const p=g.userData.p;(gntPool[p]||(gntPool[p]=[])).push(g)}};
    let pieces={},prevB=null,prevLast=null,anims=[],captured=[],capNear=true,lastCapB=null;
    // 提示記號
    const markG=new T.Group();sc.add(markG);
    const disc=(i,col,r,op)=>{const m=new T.Mesh(new T.CircleGeometry(r,32),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));m.rotation.x=-PI/2;const[x,z]=pos(i);m.position.set(x,TOP+.012,z);markG.add(m);return m};
    const ring=(i,col,r,w,op)=>{const m=new T.Mesh(new T.RingGeometry(r-w,r,40),new T.MeshBasicMaterial({color:col,transparent:true,opacity:op,depthWrite:false}));m.rotation.x=-PI/2;const[x,z]=pos(i);m.position.set(x,TOP+.014,z);markG.add(m);return m};
    let selI=-1,checkRing=null;const SNAP={b:null,t:[],me:"r"};
    function layoutCaptured(board){lastCapB=board;captured.forEach(g=>sc.remove(g));captured=[];if(GIANT)return;   /* 巨盤模式沒有桌邊可以排被吃的子 */const cnt={r:{},b:{}};board.forEach(p=>{if(p){const s=sideOf(p),k=p.toUpperCase();cnt[s][k]=(cnt[s][k]||0)+1}});
      for(const s of["r","b"]){const lost=[];for(const k of"RCNBAP")for(let n=(START[s][k]||0)-(cnt[s][k]||0);n>0;n--)lost.push(s==="r"?k:k.toLowerCase());
        const mine=(s==="r")===flip;   // 意見回饋 232：被吃的棋子放在吃子那一方的桌邊（我吃掉的對方棋子排在我這側）
        /* 縮小一點不搶棋盤的戲：對方吃到的排在棋盤後方茶杯兩邊，我吃到的排在我這側桌邊 */
        lost.forEach((p,j)=>{const g=makePiece(p);g.scale.setScalar(.8);let x,z;
          if(mine&&!capNear){if(j<7){x=6.2;z=4.4-j*.75}else{x=7.0;z=4.4-(j-7)*.75}}   /* 畫面太矮、看不到我這側桌邊時：排在棋盤右邊，從我這一端往中間排（意見回饋 343：以前從對方那一端排起，看起來像放在對方那邊） */
          else if(mine){const SL=[[1,6.3,5],[1,7.0,4],[-1,6.3,3],[-1,7.0,3]];let q=j,r=0;while(r<3&&q>=SL[r][2]){q-=SL[r][2];r++}x=SL[r][0]*(1.35+q*.9);z=SL[r][1]}else{   /* 意見回饋 281：我吃到的棋子排在我這側的桌邊（茶杯右邊，滿了再排左邊） */const sd=j%2?-1:1,k=j>>1;if(k<4){x=sd*(1.35+k*.95);z=-6.55}else{x=sd*(1.35+(k-4)*.78);z=-7.25}}   // 對方輸掉的棋子分排在茶杯左右兩邊
          g.position.set(x,0,z);g.rotation.y=(Math.random()-.5)*.6;captured.push(g)})}}
    function sync(board){Object.values(pieces).forEach(g=>GIANT?gntDrop(g):sc.remove(g));pieces={};board.forEach((p,i)=>{if(p){const g=makePiece(p);at(g,i);pieces[i]=g}});layoutCaptured(board)}
    // 朝代造型換了（或圖剛載入）：重畫棋盤、清掉棋子貼圖、整盤重排
    let lookKey="";const refreshLook=()=>{for(const k in faceCache){freeTex(faceCache[k]);delete faceCache[k]}for(const k in faceMat){try{faceMat[k].dispose()}catch(e){}delete faceMat[k]}for(const k in bodyMat){try{bodyMat[k].dispose()}catch(e){}delete bodyMat[k]}
      try{const c=btex.image.getContext("2d");drawBoard(c,btex.image.width,btex.image.height,null);btex.needsUpdate=true}catch(e){}if(prevB)sync(prevB)};
    // Noto Serif TC 網路字型晚到：載入後重畫字面（不然會先用系統字型，字又細又糊）
    try{document.fonts&&document.fonts.load(`900 64px ${SERIF}`,"帥仕相傌俥炮兵將士象馬車砲卒").then(()=>{if(!stopped)refreshLook()})}catch(e){}
    function draw(board,o,ex){o=o||{};ex=ex||{};drawn=true;orbSet(ex.bhOrb,ex.gxLit);gxSet(ex.gx);if(GIANT){const R=ex.result||null;if(R!==gntRes){gntRes=R;if(R)setTimeout(()=>{for(const g of Object.values(pieces))if(g&&g.userData&&g.userData.B)gntAct(g,R==="r"?"cheer":R==="b"?"bow":"idle",4200)},600)}}try{const dk=[(board||[]).join(","),o.sel,(o.targets||[]).join(" "),o.last?o.last.f+"-"+o.last.t:"",o.check,o.flip?1:0,ex.thinking?1:0,ex.result||"",(ex.hint||[]).join(" ")].join("|");if(dk!==PW.dk){PW.dk=dk;pwPoke(1500)}}catch(e){pwPoke(1500)}   /* 11/11 省電：App 每 1.5 秒輪詢都會呼叫 draw，盤面真的有變才算「畫面在動」 */const nf=!!o.flip;
      {const lk=JSON.stringify(ex.look?[ex.look.k,ex.look.img,!!ex.look.gly,ex.look.pset,ex.look.pieces&&ex.look.pieces.r,ex.look.grid]:null);if(lk!==lookKey){lookKey=lk;LOOK=ex.look||null;
        if(LOOK){let n=0;const L0=[LOOK.img,LOOK.pieces&&LOOK.pieces.r,LOOK.pieces&&LOOK.pieces.b,...(LOOK.pset?PSRC(LOOK.pset):[])],done=()=>{if(++n>=L0.length&&LOOK===ex.look)refreshLook()};L0.forEach(src=>{if(!src||loadImg(src,done))done()})}
        refreshLook()}}
      if(nf!==flip){flip=nf;prevB=null}
      const L=o.last&&o.last.f!=null&&o.last.t!=null?o.last:null,lk=L?L.f+"-"+L.t:"";
      const moved=prevB&&L&&lk!==prevLast&&board[L.t]&&board[L.t]===prevB[L.f]&&!board[L.f]&&pieces[L.f]&&board.filter(Boolean).length>=prevB.filter(Boolean).length-1;
      if(moved){const g=pieces[L.f],cap=pieces[L.t];delete pieces[L.f];pieces[L.t]=g;const[x0,z0]=pos(L.f),[x1,z1]=pos(L.t);
        const by=sideOf(board[L.t]),botSide=ex.botSide||null;
        if(cap){anims.push({t:0,d:.55,f:p=>{cap.position.y=TOP+Math.sin(p*PI)*.9;cap.position.x+=(x1-x0)*.006;cap.position.z+=(z1>z0?.02:-.02);cap.rotation.z=p*2.2},end:()=>{if(GIANT)gntDrop(cap);else sc.remove(cap);layoutCaptured(board)}})}
        anims.push({t:0,d:.42,f:p=>{const e=ease(p);g.position.set(x0+(x1-x0)*e,TOP+Math.sin(p*PI)*1.1,z0+(z1-z0)*e)},end:()=>at(g,L.t)});
        if(botSide&&by===botSide){reach=1;reachT=0;opp.setFace(cap?"happy":"smile",1.4);if(cap){mate.setFace("open",1.6);mate.say(["小心！","哎呀，被吃了","沒關係，扳回來！"][Math.random()*3|0],2)}}
        else if(cap){mate.setFace("happy",1.6);mate.say(["吃得好！","漂亮！","好棋！"][Math.random()*3|0],1.8);if(botSide){opp.setFace("open",1.4);if((opp.B||oppSpr)&&Math.random()<.5)opp.say(["哎呀！","被吃了…","好棋！"][Math.random()*3|0])}}
        try{CR.move(by,prevB[L.t]||null)}catch(e){}if(GIANT)try{gntReact(g,by,cap)}catch(e){}
        // 棋盤其他地方若對不上（例如悔棋），整盤重排
        const exp=prevB.slice();exp[L.t]=exp[L.f];exp[L.f]=null;if(exp.join(",")!==board.join(","))sync(board)}
      else if(!prevB||board.join(",")!==prevB.join(","))sync(board);
      prevB=board.slice();prevLast=lk;
      // 提示：上一步、選子、可走點、將軍
      markG.clear();checkRing=null;
      if(L&&L.f!==L.t){ring(L.f,0x2E86DE,.36,.06,.85);disc(L.f,0x2E86DE,.12,.5);ring(L.t,0x2E86DE,.56,.07,.9)}
      selI=o.sel!=null&&o.sel>=0?o.sel:-1;
      SNAP.b=board;SNAP.t=Array.isArray(o.targets)?o.targets:[];SNAP.me=ex.botSide?(ex.botSide==="r"?"b":"r"):(nf?"b":"r");   /* 11/11 點擊吸附要知道：哪些是己方棋子、哪些是綠點 */
      (o.targets||[]).forEach(i=>{if(board[i])ring(i,0xD7263D,.56,.09,.95);else disc(i,0x2F9E5A,.19,.9)});
      if(typeof o.check==="number"&&o.check>=0&&board[o.check])checkRing=ring(o.check,0xFF2A2A,.62,.12,.9);
      try{CR.chkSet(typeof o.check==="number"&&o.check>=0&&board[o.check]?sideOf(board[o.check]):null)}catch(e){}
      if(ex.hint&&ex.hint.length===2){ring(ex.hint[0],0xF2B233,.5,.07,.9);ring(ex.hint[1],0xF2B233,.5,.07,.9)}
      thinking=!!ex.thinking;setOpp(ex.opp||null);setMate(ex.mateLook||null);setWatchers(ex.watchers);mySide=ex.botSide?(ex.botSide==="r"?"b":"r"):"r";try{CR.data(ex.crowd||null,o,ex)}catch(e){}
      if(ex.result&&ex.result!==mood){mood=ex.result;const b=ex.botSide;endT=END;
        oppRes=mood==="draw"||!b?"draw":mood===b?"win":"lose";mateRes=oppRes==="win"?"lose":oppRes==="lose"?"win":"draw";
        if(mood==="draw"){opp.setFace("flat",99);mate.setFace("flat",99);mate.say("和棋，不錯喔！",3)}
        else if(b&&mood===b){opp.setFace("happy",99);opp.say(ex.oppWin||"我贏了！再來一盤？",3);mate.setFace("sad",99);setTimeout(()=>mate.say("下次一定贏！",2.6),1800)}
        else if(b){opp.setFace("sad",99);opp.say(ex.oppLose||"你好厲害…",3);mate.setFace("happy",99);setTimeout(()=>mate.say("你贏了！太強了！",2.6),1500)}}
      if(!ex.result&&mood){mood=null;endT=0;opp.setFace("smile");mate.setFace("smile")}}
    // ---------- 鏡頭與互動 ----------
    let yaw=0,pitch=0,tyaw=0,tpitch=0,zoom=1,tzoom=1,W=1,H=1,flatV=false;const BILLV=new T.Vector3();   // zoom＝鏡頭到棋盤中心的距離倍數（兩指捏合）
    /* 11/11 手機預設視角（AI 模擬玩家第二輪問題 5：俯視時棋子、排距只有約 20px）：手機直式、玩家沒存過視角（opt.view 沒給）→ 一開始就是「俯視＋拉近」，
       距離用 fitZoom 算到格距約 30px、棋盤框不出畫面；HOME＝點兩下回正要回到的樣子；玩家自己捏合／按 ＋－ 以後（userZ）就不再自動調距離 */
    let HOME={p:0,z:1,fit:false},userZ=false;const HFIT=()=>MOB&&W<=560&&CAMV.hr>=1.05;
    // 鏡頭（iPhone 可讀性）：坐在桌前、比較俯視的角度，讓棋盤幾乎撐滿整個寬度；上方留一段看到對面的對手
    const VH0=window.innerHeight||800;   // 只在建立時量一次螢幕高度（iPhone 捲動時網址列伸縮不會讓畫面跳）
    const CAMV={hr:1.14,ht:(window.__CAM||{}).ht||.24,dp:0};   // 畫面高寬比、水平視角的 tan(半角)（固定水平視野，窄螢幕不會切掉棋盤兩邊）
    // 意見回饋 218：螢幕夠高時畫面拉高一點（最多 1.32），多出來的都給下方（上緣維持原本的位置），露出棋盤前方的桌面讓小帥坐
    // 意見回饋 260：固定高度的對局頁（iPhone 主畫面 App 可用高度少、觀戰多一行狀態）不能比版面留給它的空間高，不然會壓到下面的玩家列
    const room=()=>{const box=el.parentElement,view=box&&box.parentElement;
      if(box&&getComputedStyle(box).position==="sticky"){const bs=getComputedStyle(box);return box.clientHeight-parseFloat(bs.paddingTop)-parseFloat(bs.paddingBottom)}   /* 11/12 iPhone 橫向（第 6 輪截圖 18）：對局頁變兩欄、左欄固定高度，3D 照左欄高度算，不再比螢幕高 */
      if(!view||getComputedStyle(view).overflow!=="hidden")return 1e9;
      let used=0;for(const c of view.children)if(c!==box&&!(parseFloat(getComputedStyle(c).flexGrow)>0))used+=c.offsetHeight;const cs=getComputedStyle(box);   /* 撐開空白的那格（flex:1）不算 */return view.clientHeight-used-parseFloat(cs.paddingTop)-parseFloat(cs.paddingBottom)};
    const fit=()=>{W=el.clientWidth||300;CAMV.hr=clamp((VH0-300)/W,1.14,1.32);const rm=room();if(W*CAMV.hr>rm)CAMV.hr=Math.max(.3,rm/W);   /* 意見回饋 295：電腦的寬螢幕也照可用高度滿版（上下視角不變、左右看更廣），不再撐得比螢幕還高 */
      // 畫面被壓矮（比 1.14 扁）時：上下視角維持 1.14 的範圍、左右看得更廣，不會把對面和近端的小帥切掉（意見回饋：5:49 截圖）
      const vr=Math.max(CAMV.hr,1.14);CAMV.dp=Math.atan(CAMV.ht*1.14)-Math.atan(CAMV.ht*vr);H=Math.round(W*CAMV.hr);el.style.height=H+"px";rd.setSize(W,H,false);cam.aspect=W/H;
      cam.fov=clamp(2*Math.atan(CAMV.ht*vr)*180/PI,38,62);cam.updateProjectionMatrix();
      {const nn=CAMV.hr>=1.24;if(nn!==capNear){capNear=nn;if(lastCapB)layoutCaptured(lastCapB)}}if(HOME.fit)zfit();pwPoke(400)};
    const CO=window.__CAM||{},camBase=new T.Vector3(...(CO.b||[0,27,26])),look=new T.Vector3(...(CO.l||[0,-.3,-.4])),PIV=new T.Vector3(0,-.3,0);   /* 意見回饋 374：小帥坐到正對面，鏡頭往後、往上一點，從他背後看過去；406：座位抬高後鏡頭再拉高，小帥才不會擋到最下排 */
    // 拉近拉遠＝鏡頭沿著「棋盤中心→座位」這條線前後移動，看的方向不變
    /* 意見回饋 375：左右拖曳＝鏡頭繞著棋桌轉（轉到對面就看得到小帥的臉、背景一樣是一整圈），上下拖曳＝俯視的高低；不動的時候跟原本的畫面一樣 */
    /* 意見回饋 421（構圖）：坐正的時候跟原本一樣（看整盤棋）；繞著桌子轉開時鏡頭自動放低一點、視線往上抬，畫面上半部讓給遠方的山水（前景平台和道具、中景城樓、遠景山和天空）；
       往上拖（壓低鏡頭）也一樣把視線抬到地平線附近，越過小帥的頭看出去 */
    const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t)},FADEV=new T.Vector3();
    /* 巨盤模式的鏡頭（開發者 11/12：「超大第一人稱是指可以放大到很多倍」）：只看 zoom 一條軸——
       zoom＝1 預設：斜上方看得清全盤；拉遠（＞1）慢慢升成俯視全局；放大（＜1）一路推進到紅方陣前、高度跟角色胸口差不多＝站在棋盤上的第一人稱，看得到七星的臉和胸前本命字。
       左右拖曳：遠的時候繞著棋盤轉，越近越像原地轉頭；上下拖曳：視線抬高壓低 */
    const GNT_V=[[0,2.15,9.4,0,1.68,2.2],[0,12.5,13.5,0,0,-.6],[0,27,6.5,0,0,0]],GV1=new T.Vector3(),GV2=new T.Vector3();
    /* 開發者 11/12「想要放大某個角色，就能放到他很多倍；目前放大畫面感覺會亂飄」：放大（zoom＜1）改成鎖定一位角色（GFOC）——
       點一下角色、或兩指捏合的位置最靠近的角色、或按＋時畫面中間的角色；鏡頭以他胸口為中心推近（距離＝18.8×zoom，最近約 0.5，看得到臉），
       左右拖曳＝繞著他轉、上下拖曳＝抬高壓低，中心不動就不會飄。點兩下回全盤。zoom≥1（拉遠）照原本的路線 */
    let GFOC=null;const GFL=new T.Vector3(0,0,-.6),GFT=new T.Vector3(0,0,-.6),GFD=new T.Vector3(),GFQ=new T.Vector3(),GF_D1=Math.hypot(12.5,14.1),GF_E1=Math.atan2(12.5,14.1);
    const gntOn=g=>{for(let o=g;o;o=o.parent){if(!o.visible)return false;if(o===sc)return true}return false};
    const gntFocus=(cx,cy,rad)=>{const r=cvs.getBoundingClientRect();let best=null,bd=rad;for(const g of gntFigs){if(!gntOn(g))continue;g.getWorldPosition(GFQ);GFQ.y+=GNT_H*.62;GFQ.project(cam);if(GFQ.z>1)continue;
        const d=Math.hypot(r.left+(GFQ.x+1)/2*r.width-cx,r.top+(1-GFQ.y)/2*r.height-cy);if(d<bd){bd=d;best=g}}if(best){GFOC=best;pwPoke(1500)}return best};
    const gntCamNear=()=>{const k=smooth(1,.45,zoom);if(GFOC&&!gntOn(GFOC))GFOC=null;
      if(GFOC){GFOC.getWorldPosition(GFD);GFD.y+=GNT_H*.62}else GFD.copy(GFL);GFD.lerp(GFL,1-k);
      const dd=GFT.distanceTo(GFD);GFT.lerp(GFD,dd>1e-3?.2:1);if(dd>1e-3)pwPoke(120);
      const e=clamp(GF_E1+(.22-GF_E1)*k+pitch*.9*k,-.25,1.45),d=GF_D1*zoom,a=yaw;
      cam.position.set(GFT.x+Math.sin(a)*Math.cos(e)*d,GFT.y+Math.sin(e)*d,GFT.z+Math.cos(a)*Math.cos(e)*d);
      const nr=clamp(d*.08,.02,.5);if(Math.abs(cam.near-nr)>1e-3){cam.near=nr;cam.updateProjectionMatrix()}
      GFQ.copy(GFT);GFQ.y-=pitch*5.2*(1-k);cam.lookAt(GFQ);cam.rotateX(CAMV.dp*(1-k));gntClear(k>.35)};
    /* 放大繞著角色轉時，鏡頭會穿進旁邊的角色、或被前排擋住：擋在鏡頭到目標這條線上（半徑 0.6 內）的其他角色先藏起來，拉遠就回來 */
    const GFR=new T.Vector3();const gntClear=on=>{const C=cam.position;for(const g of gntFigs){const inn=g.children[0];if(!inn)continue;let hide=false;
      if(on&&g!==GFOC&&g.parent){g.getWorldPosition(GFR);GFR.y+=GNT_H*.5;const ax=GFT.x-C.x,ay=GFT.y-C.y,az=GFT.z-C.z,L2=ax*ax+ay*ay+az*az||1;let t=((GFR.x-C.x)*ax+(GFR.y-C.y)*ay+(GFR.z-C.z)*az)/L2;
        if(t<.92){t=Math.max(0,t);const px=C.x+ax*t-GFR.x,py=C.y+ay*t-GFR.y,pz=C.z+az*t-GFR.z;hide=px*px+py*py+pz*pz<.36}}
      if(inn.visible===hide)inn.visible=!hide}};
    const gntCam=()=>{if(zoom<1)return gntCamNear();if(cam.near!==.5){cam.near=.5;cam.updateProjectionMatrix()}GFT.copy(GFL);gntClear(false);
      const near=0,far=smooth(1.05,2.6,zoom),mix=(a,b,k)=>a.map((v,j)=>v+(b[j]-v)*k);let v=mix(GNT_V[1],GNT_V[0],near);v=mix(v,GNT_V[2],far);
      const P=GV1.set(v[0],v[1],v[2]),L=GV2.set(v[3],v[4]-pitch*(2.2+3*(1-near)),v[5]),ao=yaw*(1-near),ah=yaw*near*.8;
      {const c=Math.cos(ao),s=Math.sin(ao),x=P.x,z=P.z;P.x=x*c+z*s;P.z=-x*s+z*c;const lx=L.x,lz=L.z;L.x=lx*c+lz*s;L.z=-lx*s+lz*c}
      if(ah){const dx=L.x-P.x,dz=L.z-P.z,c=Math.cos(ah),s=Math.sin(ah);L.x=P.x+dx*c+dz*s;L.z=P.z-dx*s+dz*c}
      cam.position.copy(P);cam.lookAt(L);cam.rotateX(CAMV.dp)};
    const placeCam=()=>{if(GIANT)return gntCam();const wy=Math.abs(Math.atan2(Math.sin(yaw),Math.cos(yaw))),orb=smooth(.2,1.1,wy),low=clamp(-pitch/.7,0,1);
      const off=camBase.clone().sub(PIV),lk=look.clone().sub(PIV),el0=Math.atan2(off.y,Math.hypot(off.x,off.z)),el=clamp(el0+pitch-.26*orb,.1,1.5),R=Math.min(off.length()*zoom,330),az=Math.atan2(off.x,off.z)+yaw;
      /* 開發者 11/4：畫面拉遠看石台底下的朝代大地圖——鏡頭距離超過 105（長卷半徑的 62%）以後，鏡頭慢慢升高成俯視，長卷、天空跟著淡掉，霧也變淡 */
      const kf=smooth(105,220,R),elF=el+(1.38-el)*kf;   /* 意見回饋 525：拉到一半還要看得到環景長卷（517 時提早淡掉，改回原本的距離） */
      if(kf!==lastKf){lastKf=kf;for(const m of FARHIDE){m.visible=kf<.98;if(m.material){m.material.opacity=1-kf;m.material.transparent=true}}if(MAPM){const a=smooth(.3,.62,kf);MAPM.visible=a>0;MAPM.material.opacity=a;if(HILL)HILL.visible=a<.9}   /* 11/10 開發者「宋朝地面整個是土色」：古地圖鋪在山坡上方，原本一拉遠（kf .04）就淡入、紙色把草地山坡整片蓋成土黃；改成拉得比較遠（kf .3 起）才浮現 */if(sc.fog){sc.fog.near=70+kf*260;sc.fog.far=320+kf*520}}
      /* 意見回饋 647：疆域層跟著地圖淡入（開關關掉就不顯示）；次要地名鏡頭拉近（距離 255 以內）才出現，拉遠到 295 完全淡掉 */
      if(MAPM&&MAPO.length){const a=MAPM.visible?MAPM.material.opacity:0;MAPMN=1-smooth(255,295,R);
        if(RTF&&a>0){const tn=performance.now();if(!RTA||tn-RTT>800){RTT=tn;RTF()}}RTA=a;   /* 意見回饋 658：地圖一出現、之後每 0.8 秒問一次路線有沒有變（解完一站回來、換了模式） */const key=a.toFixed(3)+"/"+MAPMN.toFixed(3)+"/"+RON;
        if(key!==MAPOK){MAPOK=key;for(const o of MAPO){const v=a*(o.k==="r"?(RON?1:0):o.k==="m"?MAPMN:1);o.m.visible=v>.01;o.m.material.opacity=v}if(MAPP)MAPP.style.display=a>.5?"block":"none";if(RTP)RTP.style.display=a>.5&&RTS?"block":"none"}}
      lk.y+=4*orb*(1-low)+4.5*low;
      cam.position.set(PIV.x+Math.sin(az)*Math.cos(elF)*R,PIV.y+Math.sin(elF)*R,PIV.z+Math.cos(az)*Math.cos(elF)*R);
      const c=Math.cos(yaw),s2=Math.sin(yaw);cam.lookAt(PIV.x+lk.x*c+lk.z*s2,PIV.y+lk.y,PIV.z-lk.x*s2+lk.z*c);cam.rotateX(CAMV.dp);
      for(const b of bills){const m=b.m;if(b.cup){const[fx,fz]=b.cup,cx=cam.position.x-fx,cy=cam.position.y-.015,cz=cam.position.z-fz,e=Math.atan2(cy,Math.hypot(cx,cz)),t=clamp((b.hb*Math.cos(e)+.03)/Math.max(cy,.5),0,.5);
          m.position.set(fx+cx*t,.015+cy*t,fz+cz*t)}
        else if(b.anchor){const dx0=cam.position.x-b.anchor[0],dz0=cam.position.z-b.anchor[1],d0=Math.hypot(dx0,dz0)||1;m.position.set(b.anchor[0]-dx0/d0*b.back,b.y,b.anchor[1]-dz0/d0*b.back)}
        if(b.orb){const[r,a0,sp,y,op]=b.orb,a=a0+pwT()/1000*sp,z=Math.sin(a)*r;m.position.set(Math.cos(a)*r,y,z);m.material.opacity=op*clamp((16-z)/10,0,1);continue}   /* 經典世界繞著飄的雲；飄到鏡頭這一側（z 大）就淡掉，不擋畫面 */
        if(b.smk){const[x0,y0,z0,ph]=b.smk,u=(pwT()/1000*.33+ph)%1;m.position.set(x0+Math.sin(u*5+ph*9)*.18,y0+u*2.4,z0);m.material.opacity=.3*Math.sin(Math.PI*u);m.scale.setScalar(.35+u*1.1);continue}   /* 香爐的煙 */
        if(b.bob||b.br){const ts=pwT()/1000;if(b.bob)m.position.y=b.y+Math.sin(ts*b.bob[0]+b.bob[1])*b.bob[2];if(b.br)m.material.opacity=b.br[2]+Math.sin(ts*b.br[0]+b.br[1])*b.br[3]}   /* 經典世界的懸浮畫卷、幻影棋客 */
        const wp=m.getWorldPosition(BILLV),dx=cam.position.x-wp.x,dz=cam.position.z-wp.z;m.rotation.set(-b.tilt*Math.atan2(cam.position.y-wp.y,Math.hypot(dx,dz)),Math.atan2(dx,dz),0)}
      if(fades.length){const fx=PIV.x-cam.position.x,fz=PIV.z-cam.position.z,fd=Math.hypot(fx,fz)||1;   /* 桌子後面、離畫面中線 9～21 度以內的樹慢慢變淡（最淡 0.28） */
        for(const m of fades){const wp=m.getWorldPosition(FADEV),vx=wp.x-cam.position.x,vz=wp.z-cam.position.z,vd=Math.hypot(vx,vz)||1,dot=(vx*fx+vz*fz)/fd;
          const a=Math.acos(clamp(dot/vd,-1,1)),k=dot>fd*.7?smooth(.16,.36,a):1;m.material.opacity=.28+.72*k;m.material.depthWrite=k>.98}}};
    const ray=new T.Raycaster(),ndc=new T.Vector2(),plane=new T.Plane(new T.Vector3(0,1,0),-TOP),hitP=new T.Vector3();
    /* 11/11 點擊吸附（AI 模擬玩家第二輪問題 5：阿嬤點偏 4px 沒選到、阿哲點傌選到隔壁的俥）：
       以前先用射線打棋子模型（棋子半徑 .485、鄰子只隔 .03，斜看時側面也算，手指偏幾 px 就打到隔壁那顆），沒打到再打棋盤面（高度是盤面、不是棋子頂面，點在棋子上緣會落到後一排的空點）。
       現在改成在「畫面上」比距離：90 個交叉點投影到螢幕（有子的用棋子頂面中心），交給上面的 tapSnap 挑——沒選子吸己方棋子、選了子吸綠點；兩個一樣近就不猜（回 -2，畫面提示） */
    const pickRay=()=>{const hits=ray.intersectObjects(Object.values(pieces),true);if(hits.length){let o=hits[0].object;while(o.parent&&!o.userData.p)o=o.parent;const i=+Object.keys(pieces).find(k=>pieces[k]===o);if(i>=0)return i}
      if(!ray.ray.intersectPlane(plane,hitP))return -1;let c=Math.round(hitP.x+4),r2=Math.round(hitP.z+4.5);if(Math.abs(hitP.x+4-c)>.48||Math.abs(hitP.z+4.5-r2)>.48)return -1;
      if(c<0||c>8||r2<0||r2>9)return -1;if(flip){c=8-c;r2=9-r2}return r2*9+c};
    let tapAmb=null;const SV=new T.Vector3();
    const pick=(cx,cy)=>{const r=rd.domElement.getBoundingClientRect();ndc.set((cx-r.left)/r.width*2-1,-((cy-r.top)/r.height)*2+1);ray.setFromCamera(ndc,cam);tapAmb=null;
      const B=SNAP.b;if(!B||!r.width)return pickRay();
      const prj=(x,y,z)=>{SV.set(x,y,z).project(cam);return[(SV.x+1)/2*r.width,(1-SV.y)/2*r.height]},tg=new Set(SNAP.t),P=[];
      for(let i=0;i<90;i++){const[x,z]=pos(i),g=pieces[i],y=g?g.position.y+(g.userData.th||.27):TOP,q=prj(x,y,z);if(SV.z>1)continue;const qx=prj(x+1,y,z),qz=prj(x,y,z+1);
        const own=!!B[i]&&sideOf(B[i])===SNAP.me,t=selI>=0&&tg.has(i);
        P.push({i,x:q[0],y:q[1],s:Math.max(4,Math.min(Math.hypot(qx[0]-q[0],qx[1]-q[1]),Math.hypot(qz[0]-q[0],qz[1]-q[1]))),occ:!!B[i],c:own||t,w:t?.9:1})}
      const o=tapSnap(P,cx-r.left,cy-r.top,{r:28});if(o.amb){tapAmb=o.amb;return -2}return o.i};
    /* 兩個一樣近：不選，閃一下那兩個位置＋一行字，請玩家點準一點 */
    let ambTip=null,ambT=0;const showAmb=a=>{try{for(const i of a){const m=ring(i,0xF2B233,.58,.1,.95);setTimeout(()=>{if(m.parent)m.parent.remove(m)},1300)}
      if(!ambTip){ambTip=document.createElement("div");ambTip.setAttribute("role","status");ambTip.style.cssText="position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);z-index:5;font:700 14px/1.4 system-ui,sans-serif;color:#3a2618;background:rgba(255,250,240,.95);border:1.5px solid #c8961e;border-radius:10px;padding:7px 12px;white-space:nowrap;pointer-events:none;transition:opacity .35s;opacity:0";el.append(ambTip)}
      ambTip.textContent="兩個位置一樣近，請點準一點";ambTip.style.opacity=1;clearTimeout(ambT);ambT=setTimeout(()=>{if(ambTip)ambTip.style.opacity=0},1600)}catch(e){}};
    /* 11/11 手機預設視角：暫時把鏡頭擺到俯視（pitch .5）、試不同距離去量棋盤框和格距（boardMeas／fitZoom），量完放回原位；格距目標 30px、最近拉到 .45 倍 */
    const zFitCalc=()=>{if(!HFIT())return 1;const y0=yaw,p0=pitch,z0=zoom,V=new T.Vector3();let r=1;
      try{const prj=(x,y,z)=>{V.set(x,y,z).project(cam);return[(V.x+1)/2*W,(1-V.y)/2*H]};
        r=fitZoom(z=>{yaw=0;pitch=.5;zoom=z;placeCam();cam.updateMatrixWorld();return boardMeas(prj,W,H,{bw:BW,bh:BH,top:TOP,ph:.27})},.45,1,30)}catch(e){r=1}
      yaw=y0;pitch=p0;zoom=z0;placeCam();cam.updateMatrixWorld();return r};
    const zfit=()=>{const was=HOME.z,z=zFitCalc();HOME={p:.5,z,fit:true};if(!userZ&&!tyaw&&tpitch===.5&&Math.abs(tzoom-was)<1e-6)tzoom=z};   /* 畫面大小變了（轉向、網址列）：還在預設視角、沒自己縮放過，就跟著重算 */
    const goTopFit=now=>{zfit();tyaw=0;tpitch=.5;tzoom=HOME.z;userZ=false;flatV=false;mate.g.visible=true;if(now){yaw=0;pitch=.5;zoom=HOME.z;placeCam()}};
    /* 11/11 入座運鏡（評比第 2 輪 Gemini「修正手機預設視角，找回敘事沉浸感」：topfit 拉近以後看不到對面的人和小帥）：
       手機直式、沒存過視角、這一盤還沒播過（INTRO_SEEN，App 開著就記得；06-cpu 傳 opt.intro＝這盤的代號）→ 先用原本「坐著看」的視角（俯角 0、距離 1 倍）停 1.8 秒，再 0.8 秒 ease 移到 topfit。
       IN.ph：wait（園子還沒淡入）→ hold（停住）→ run（移動）→ done；運鏡中手指一按下就 held（鏡頭停在原地），放開時照常當成點棋盤（用玩家當下看到的畫面吸附），處理完直接跳到 topfit；
       拖曳、捏合、按 ＋－、俯視／平視按鈕、點兩下回正：運鏡結束、交給玩家（不跳）。系統設了「減少動態效果」就不運鏡、直接 topfit */
    const RDM=(()=>{try{return matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){return false}})(),IN={ph:"done",t0:0,key:null,hold:1800,dur:800};
    const inOn=()=>IN.ph==="wait"||IN.ph==="hold"||IN.ph==="run"||IN.ph==="held";
    const inEnd=snap=>{if(!inOn())return;IN.ph="done";if(snap)goTopFit(true)};
    const inStart=(k,ready)=>{if(!k||INTRO_SEEN.has(k)||RDM||!HFIT())return false;zfit();yaw-=Math.round(yaw/TAU)*TAU;tyaw=0;tpitch=0;tzoom=1;userZ=false;flatV=false;mate.g.visible=true;
      IN.key=k;if(ready){INTRO_SEEN.add(k);IN.ph="hold";IN.t0=performance.now()}else IN.ph="wait";return true};
    // 意見回饋 240：點到物件（樹、桌子、茶杯、長椅、凳子、燈籠、對手、遠方背景）就回報是什麼，App 跳出說明
    /* 意見回饋 277：用 128 格的透明度圖，看點的位置附近 r 格內最不透明的值（手指不用剛好點在細細的椅背、樹枝上） */
    const AC=new Map(),AS=128,alphaAt=(im,u,v,r)=>{let a=AC.get(im);if(!a){const c=document.createElement("canvas");c.width=AS;c.height=AS;const g=c.getContext("2d");
        try{g.drawImage(im,0,0,AS,AS);a={d:g.getImageData(0,0,AS,AS).data}}catch(e){a={d:null}}AC.set(im,a)}
      if(!a.d)return 255;const x0=clamp(Math.floor(u*AS),0,AS-1),y0=clamp(Math.floor((1-v)*AS),0,AS-1);let m=0;r=r||0;
      for(let y=Math.max(0,y0-r);y<=Math.min(AS-1,y0+r);y++)for(let x=Math.max(0,x0-r);x<=Math.min(AS-1,x0+r);x++){const al=a.d[(y*AS+x)*4+3];if(al>m)m=al}return m};
    const infoPick=()=>{   // 用 pick() 剛設好的那條射線
      if(orbHit()){if(orbK==="ball")orbFly();return"orb"}   /* 幻影棋客頭上的小黑洞（點了化成紫光飛走，App 接 parkInfo("orb")） */
      if(ray.ray.intersectPlane(plane,hitP)&&Math.abs(hitP.x)<BW/2&&Math.abs(hitP.z)<BH/2)return null;   // 點在棋盤（含邊框）上不算
      // 人：觀戰者、近端的小帥、對面的 3D 小帥（點了看棋友資料）
      for(const h of ray.intersectObjects([watchG,mate.g,...(oppSpr?[]:[opp.g])],true)){let o=h.object;while(o&&o!==watchG&&o!==mate.g&&o!==opp.g&&!(o.userData&&o.userData.pid))o=o.parent;
        if(!o)continue;if(o===mate.g)return"mate";if(o===opp.g)return"opp";if(o.userData&&o.userData.pid)return"p:"+o.userData.pid}
      const cand=infos.slice();if(oppSpr)cand.push(oppSpr.sp);let near=null;
      for(const h of ray.intersectObjects(cand,false)){const o=h.object,isOpp=oppSpr&&o===oppSpr.sp,k=isOpp?"opp":o.userData.info,im=isOpp?o.material.map.image:o.userData.img;
        if(im&&h.uv&&alphaAt(im,h.uv.x,h.uv.y,3)<60){if(!near&&alphaAt(im,h.uv.x,h.uv.y,12)>=60)near=k;continue}return k}
      if(!oppSpr&&opp.g.visible&&ray.intersectObject(opp.g,true).length)return"opp";
      if(near)return near;   /* 點在鏤空的椅背、樹葉縫裡：算點到那個物件，不要穿過去變成遠方風景 */
      {const q=new T.Vector3(),onT=y=>ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,1,0),-y),q)&&Math.hypot(q.x,q.z)<8.4;for(let y=0;y>=-2.6;y-=.2)if(onT(y))return"table"}   /* 桌子的側邊 */
      // 都沒點到：射線碰到平台地面（離桌子 24 以內）就不算；越過平台的就是遠方背景
      const gp=new T.Plane(new T.Vector3(0,1,0),-FL),gh=new T.Vector3(),onG=ray.ray.intersectPlane(gp,gh);
      /* 意見回饋 517：拉遠看朝代地圖時，點地名附近（地圖寬度 5% 以內）跳出那個地方的介紹 */
      if(onG&&RTS&&lastKf>.25&&Math.hypot(gh.x,gh.z)<ERAMAP_R){const px=(gh.x/ERAMAP_R+1)*50,py=(gh.z/ERAMAP_R+1)*50;let best=null,bd=3.2;for(const q of RTS){const d=Math.hypot(q[1]-px,q[2]-py);if(d<bd){bd=d;best=q}}if(best)return"map:"+best[0]}   /* 意見回饋 658（B 輿圖遊歷）：路線上的站先檢查（有些站地圖原本沒標） */
      if(onG&&MAPL&&lastKf>.25&&Math.hypot(gh.x,gh.z)<ERAMAP_R){const px=(gh.x/ERAMAP_R+1)*50,py=(gh.z/ERAMAP_R+1)*50;let best=null,bd=5;for(const l of MAPL){if(l[4]===2&&MAPMN<.3)continue;const d=Math.hypot((l[5]!=null?l[5]:l[1])-px,(l[6]!=null?l[6]:l[2])-py);if(d<bd){bd=d;best=l}}if(best)return"map:"+best[0]}
      if(onG&&Math.hypot(gh.x,gh.z)<24)return null;
      /* 意見回饋 525：點到遠方長卷，照點到的位置找那一段畫的是什麼（山、城、塔……），找不到才用整體介紹 */
      if(PSPOTS&&PANM&&PANM.visible&&PANDH){const h=ray.intersectObject(PANM,false)[0];if(h&&h.uv){const ix=(((1-h.uv.x)-PANROT/360)%1+1)%1,iy=((1-h.uv.y)*PANO.H-PANO.mt)/PANDH;let best=null,ba=9;
        for(const p of PSPOTS){const dx=ix<p.x0?p.x0-ix:ix>p.x1?ix-p.x1:0,dy=iy<p.y0?p.y0-iy:iy>p.y1?iy-p.y1:0;if(dx>.025||dy>.12)continue;const a=(p.x1-p.x0)*(p.y1-p.y0)+dx*4+dy;if(a<ba){ba=a;best=p}}
        if(best)return"pano:"+best.name}}
      return"bg"};
    // 觸控：一指拖曳轉頭（有朝代長卷的可以整圈轉身，其他左右各約 69 度）、兩指捏合拉近拉遠（0.6～1.25 倍）、點一下選子、點兩下回正（含縮放）
    /* 意見回饋 360：公園的棋盤可以放得更大、縮得更小（兩指捏合的範圍放寬），右下角加 ＋／－ 按鈕 */
    const ZMIN=GIANT?.025:.35,ZMAX=GIANT?2.6:8.8,   /* 開發者 11/4：拉得更遠，看得到石台底下整張朝代地圖（鏡頭距離另外不超過長卷半徑的 62%） */
    cvs=rd.domElement,ptrs=new Map();let down=null,lastTap=0,pinch=null;
    {const zb=document.createElement("div");zb.className="pzoom";zb.style.cssText="position:absolute;right:8px;bottom:8px;z-index:3;display:flex;flex-direction:column;gap:6px";
      for(const[t,f,l]of[["＋",.8,"放大"],["－",1.25,"縮小"]]){const b=document.createElement("button");b.type="button";b.textContent=t;b.setAttribute("aria-label",l);
        b.style.cssText="width:34px;height:34px;border-radius:50%;border:1px solid rgba(0,0,0,.18);background:rgba(255,255,255,.82);color:#3a2a1c;font:700 20px/1 system-ui;box-shadow:0 1px 4px rgba(0,0,0,.2);padding:0;cursor:pointer";
        b.addEventListener("pointerdown",e=>e.stopPropagation());b.addEventListener("pointerup",e=>e.stopPropagation());
        b.onclick=e=>{e.stopPropagation();inEnd(false);userZ=true;if(GIANT&&f<1&&!GFOC)try{const r=cvs.getBoundingClientRect();gntFocus(r.left+r.width/2,r.top+r.height*.55,1e9)}catch(_){}tzoom=clamp(tzoom*(GIANT&&f<1&&tzoom<.5?.7:f),ZMIN,ZMAX)};zb.append(b)}
      el.append(zb)}
    const reset=()=>{inEnd(false);if(GIANT)GFOC=null;yaw-=Math.round(yaw/TAU)*TAU;tyaw=0;tpitch=HOME.p;tzoom=HOME.z;userZ=false};   // 轉了好幾圈也走最近的路回正
    const spread=()=>{const a=[...ptrs.values()];return Math.max(20,Math.hypot(a[0].x-a[1].x,a[0].y-a[1].y))};
    cvs.addEventListener("pointerdown",e=>{ptrs.set(e.pointerId,{x:e.clientX,y:e.clientY});try{cvs.setPointerCapture(e.pointerId)}catch(_){}
      if(ptrs.size>=2){inEnd(false);if(!pinch){pinch={d:spread(),z:tzoom};if(GIANT)try{const a=[...ptrs.values()];gntFocus((a[0].x+a[1].x)/2,(a[0].y+a[1].y)/2,1e9)}catch(_){}}down=null;lastTap=0;return}   /* 黑洞：兩指中間最靠近的角色＝放大的中心 */
      if(IN.ph==="hold"||IN.ph==="run")IN.ph="held";   /* 入座運鏡中按下去：鏡頭先停在玩家看到的位置 */
      down={x:e.clientX,y:e.clientY,t:performance.now(),y0:tyaw,p0:tpitch,moved:false}});
    cvs.addEventListener("pointermove",e=>{const pt=ptrs.get(e.pointerId);if(pt){pt.x=e.clientX;pt.y=e.clientY}
      if(pinch){if(ptrs.size>=2){tzoom=clamp(pinch.z*pinch.d/spread(),ZMIN,ZMAX);userZ=true}return}
      if(!down)return;const dx=e.clientX-down.x,dy=e.clientY-down.y;if(Math.hypot(dx,dy)>9)down.moved=true;
      if(down.moved){if(IN.ph==="held")inEnd(false);const y=down.y0-dx/W*1.6;tyaw=FULL?y:clamp(y,-1.2,1.2);tpitch=clamp(down.p0+dy/H*1.6,-1.0,.5)}});
    const up=e=>{ptrs.delete(e.pointerId);
      // 捏合結束：剩下那根手指接著拖曳轉頭（從現在的位置開始算，不會跳），放開也不算點擊
      if(pinch){if(ptrs.size<2){pinch=null;const p=[...ptrs.values()][0];down=p?{x:p.x,y:p.y,t:performance.now(),y0:tyaw,p0:tpitch,moved:true}:null}return}
      if(!down)return;const d=down;down=null;if(d.moved)return;const inH=IN.ph==="held";   /* 11/11 入座運鏡中點的這一下：用玩家當下看到的畫面照常吸附、選子，處理完才跳到 topfit */
      try{const now=performance.now();
      if(now-lastTap<320&&(tyaw||tpitch!==HOME.p||tzoom!==HOME.z)){reset();lastTap=0;return}lastTap=now;let fg=null;if(GIANT)try{fg=gntFocus(e.clientX,e.clientY,70)}catch(_){}const i=pick(e.clientX,e.clientY);if(i===-2){if(tapAmb)showAmb(tapAmb);return}if(i>=0){if(opt.onTap)opt.onTap(i);return}if(fg)return;   /* 黑洞：點到角色＝鎖定放大中心，不開旁邊物件的介紹 */
      if(opt.onInfo){const k=infoPick();if(k)opt.onInfo(k)}}finally{if(inH)inEnd(true)}};
    cvs.addEventListener("pointerup",up);cvs.addEventListener("pointercancel",e=>{ptrs.delete(e.pointerId);if(ptrs.size<2)pinch=null;down=null;if(IN.ph==="held")inEnd(true)});
    // 觸控板捏合（瀏覽器送 ctrl＋滾輪）也能縮放；iOS Safari 的 gesture 事件擋掉，免得整頁被放大
    cvs.addEventListener("wheel",e=>{if(!e.ctrlKey)return;e.preventDefault();inEnd(false);userZ=true;tzoom=clamp(tzoom*Math.exp(e.deltaY*.01),ZMIN,ZMAX)},{passive:false});
    for(const ev of["gesturestart","gesturechange"])el.addEventListener(ev,e=>e.preventDefault(),{passive:false});
    // ---------- 動畫迴圈 ----------
    let stopped=false,last=performance.now(),roomN=0;
    const R=(B,i,x,y,z)=>{B.arms[i].rotation.set(x,y,z)};
    /* 11/10 開發者「玩家可能不知道縮小會有朝代地圖，引誘玩家在對戰過程中、不影響對戰的情況下去看大地圖」（Gemini 60 號，開發者選第 3、2、5 案＋第一次拉遠的驚喜全做）：
       ① 電腦想棋超過 1.2 秒：畫面上方飄一條竹簡「幻影棋客：此步容我深思，你先退一步賞景？」（電腦一下完就收）；
       ② 一盤下完、結果視窗關掉以後：小帥說「咦？這圓石台底下好像畫著什麼？」；
       ③ 剛進這一朝的園子：右下角「－」輕輕發亮，旁邊小紙條「〇〇到〇〇有多遠？往外看就知道！」（各朝名城，史學顧問核）；
       被將軍、玩家選著棋子、電腦以外的對局（線上、同桌）不跳 ①；每種提示 6 秒自己淡掉、點一下就收；這一朝拉遠看過地圖一次，就再也不提示。
       第一次拉遠看到地圖：一枚朱印「啪」地蓋在這一朝的京城，旁邊寫「原來我們在這裡」，一條虛線一路畫到另一座名城（就是 ③ 問的那兩座），約 7 秒後淡去。
       看過的朝代記在 localStorage m_mapSeen（不進雲端存檔，換手機會再提示一次，無妨） */
    /* 名城：[顯示的名字, 地圖上的標籤名]（史學顧問 11/10 核：唐改長安到揚州、五代汴州改開封、宋杭州改臨安；地圖沒有這個字的借同地的標籤位置） */
    const MH_CITY={qin:[["咸陽"],["邯鄲"]],han:[["長安"],["洛陽"]],sanguo:[["許昌"],["成都"]],weijin:[["洛陽"],["建康"]],nanbei:[["建康"],["平城"]],sui:[["大興"],["江都"]],tang:[["長安"],["揚州"]],wudai:[["開封","汴梁"],["金陵"]],song:[["汴京"],["臨安","杭州"]],yuan:[["大都"],["杭州"]],ming:[["南京"],["北京"]],qing:[["北京"],["江寧","江南"]]};
    const mhNm=c=>c[0],mhKey=c=>c[1]||c[0];
    const MH={seen:(()=>{try{return(JSON.parse(localStorage.getItem("m_mapSeen")||"{}")||{})[EK]}catch(e){return false}})(),box:null,cur:null,curT:0,thinkT:0,did:{},endWait:0,pulse:null,cer:null,L:null};
    if(!MH.seen&&MH_CITY[EK])fetch("data/eramap/labels.json").then(r=>r.ok?r.json():null).then(J=>{if(J&&Array.isArray(J[EK]))MH.L=J[EK]}).catch(()=>{});
    const mhCss=()=>{if(document.getElementById("mhCss"))return;const s=document.createElement("style");s.id="mhCss";s.textContent=`
.mh-tip{position:absolute;z-index:4;pointer-events:auto;cursor:pointer;opacity:0;transition:opacity .4s,transform .4s;font:700 13.5px/1.45 var(--serif,serif);color:#2a1f15}
.mh-tip.on{opacity:1}.mh-tip small{display:block;font-weight:600;font-size:12.5px;color:#5a4630;margin-top:2px}
.mh-top{left:50%;top:44px;transform:translate(-50%,-8px);max-width:86%;padding:7px 14px;background:linear-gradient(90deg,#d9c79c,#f3e9cf 8%,#f3e9cf 92%,#d9c79c);border:1px solid #8a6a3a;border-radius:3px;box-shadow:0 2px 8px rgba(0,0,0,.25);text-align:center}.mh-top.on{transform:translate(-50%,0)}
.mh-say{left:50%;bottom:62px;transform:translate(-50%,6px);max-width:80%;padding:8px 12px;background:#fffaf0;border:1.5px solid #3a2618;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.25);text-align:center}.mh-say.on{transform:translate(-50%,0)}
.mh-say::after{content:"";position:absolute;left:50%;bottom:-8px;margin-left:-7px;border:7px solid transparent;border-top-color:#3a2618;border-bottom:0}
.mh-note{right:56px;bottom:14px;transform:translateX(6px);max-width:62%;padding:6px 10px;background:#fbf3df;border:1px solid #c8961e;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.22)}.mh-note.on{transform:none}
.mh-glow{animation:mhGlow 1.3s ease-in-out infinite}@keyframes mhGlow{0%,100%{box-shadow:0 0 0 0 rgba(242,180,40,.0)}50%{box-shadow:0 0 0 7px rgba(242,180,40,.55)}}
.mh-cer{position:absolute;inset:0;z-index:4;pointer-events:none;transition:opacity .8s}.mh-cer svg{position:absolute;inset:0;width:100%;height:100%}
.mh-seal{position:absolute;width:40px;height:40px;margin:-20px 0 0 -20px;background:#a3241a;color:#f6e6cc;border:2px solid #f6e6cc;box-shadow:0 0 0 2px #a3241a,0 3px 8px rgba(0,0,0,.35);border-radius:4px;display:flex;align-items:center;justify-content:center;font:900 15px/1.05 var(--kai,var(--serif,serif));text-align:center;animation:mhStamp .45s cubic-bezier(.2,1.6,.4,1) both}
@keyframes mhStamp{0%{transform:scale(2.6) rotate(-12deg);opacity:0}60%{opacity:1}100%{transform:scale(1) rotate(-4deg);opacity:1}}
.mh-lab{position:absolute;transform:translate(-50%,0);margin-top:24px;white-space:nowrap;font:800 13.5px/1.2 var(--kai,var(--serif,serif));color:#3a1a10;background:rgba(251,243,223,.92);border:1px solid #8a6a3a;border-radius:3px;padding:3px 7px}
@media (prefers-reduced-motion:reduce){.mh-glow{animation:none}.mh-seal{animation:none}}`;document.head.append(s)};
    const mhShow=(cls,html,ms)=>{if(MH.cur)return false;mhCss();const d=document.createElement("div");d.className="mh-tip "+cls;d.innerHTML=html;el.append(d);requestAnimationFrame(()=>d.classList.add("on"));
      const close=()=>{if(MH.cur!==d)return;MH.cur=null;d.classList.remove("on");setTimeout(()=>d.remove(),450)};d.onclick=e=>{e.stopPropagation();close()};d._close=close;MH.cur=d;MH.curT=ms/1000;return true};
    const mhClose=()=>{if(MH.cur&&MH.cur._close)MH.cur._close()};
    const mhSeen=()=>{MH.seen=true;mhClose();if(MH.pulse){MH.pulse.classList.remove("mh-glow");MH.pulse=null}try{const o=JSON.parse(localStorage.getItem("m_mapSeen")||"{}")||{};o[EK]=1;localStorage.setItem("m_mapSeen",JSON.stringify(o))}catch(e){}};
    /* 第一次拉遠：朱印＋虛線（地圖座標 x%、y% → 地面 → 鏡頭投影到畫面） */
    const mhPt=(nm)=>{const r=MH.L&&MH.L.find(q=>q[0]===nm);return r?[(r[1]/50-1)*ERAMAP_R,(r[2]/50-1)*ERAMAP_R]:null};
    const mhScr=([x,z])=>{const v=new T.Vector3(x,FL,z).project(cam);return[(v.x+1)/2*el.clientWidth,(1-v.y)/2*el.clientHeight]};
    function mhCeremony(){const C0=MH_CITY[EK];if(!C0)return;const C=[mhNm(C0[0]),mhNm(C0[1])],A=mhPt(mhKey(C0[0])),B=mhPt(mhKey(C0[1]));if(!A)return;mhCss();const d=document.createElement("div");d.className="mh-cer";
      d.innerHTML=`<svg aria-hidden="true"><path fill="none" stroke="#a3241a" stroke-width="3" stroke-dasharray="7 6" stroke-linecap="round"/></svg><div class="mh-seal">${C[0].length<=2?C[0].split("").join("<br>"):"印"}</div><div class="mh-lab">原來我們在這裡・${C[0]}</div>${B?`<div class="mh-lab mh-lab2">${C[1]}</div>`:""}`;
      el.append(d);MH.cer={d,A,B,t:0,path:d.querySelector("path"),seal:d.querySelector(".mh-seal"),lab:d.querySelector(".mh-lab"),lab2:d.querySelector(".mh-lab2")}}
    function mhTick(dt){
      if(MH.cer){const c=MH.cer;c.t+=dt;const[a1,a2]=mhScr(c.A);c.seal.style.left=a1+"px";c.seal.style.top=a2+"px";c.lab.style.left=a1+"px";c.lab.style.top=a2+"px";
        if(c.B){const[b1,b2]=mhScr(c.B),k=Math.min(1,Math.max(0,(c.t-.6)/2.2)),x=a1+(b1-a1)*k,y=a2+(b2-a2)*k;c.path.setAttribute("d",`M${a1},${a2} L${x},${y}`);if(c.lab2){c.lab2.style.left=b1+"px";c.lab2.style.top=(b2-30)+"px";c.lab2.style.opacity=k>=1?1:0}}
        if(c.t>7.5)c.d.style.opacity=0;if(c.t>8.5){c.d.remove();MH.cer=null}}
      if(MH.cur){MH.curT-=dt;if(MH.curT<=0||MH.cur.classList.contains("mh-top")&&!thinking)mhClose()}
      if(lastKf>.55&&!MH.seen){mhSeen();mhCeremony();return}
      if(MH.seen||lastKf>.05)return;
      const busy=selI>=0||!!checkRing||document.querySelector(".modal,#sheet.show");
      /* ③ 剛進園子：－ 鈕發亮＋小紙條（每座園子一次） */
      if(!MH.did.n&&MH_CITY[EK]&&!GIANT){MH.did.n=1;setTimeout(()=>{if(MH.seen||stopped)return;const z=el.querySelector(".pzoom"),bs=z?z.querySelectorAll("button"):[],mi=bs[bs.length-1];if(mi){mi.classList.add("mh-glow");MH.pulse=mi;setTimeout(()=>{if(MH.pulse===mi){mi.classList.remove("mh-glow");MH.pulse=null}},9000)}
        const C=MH_CITY[EK].map(mhNm);mhShow("mh-note",`${C[0]}到${C[1]}有多遠？往外看就知道！<small>一直按右下角的「－」</small>`,7000)},4000)}
      /* ① 電腦想棋 */
      if(thinking&&!busy){MH.thinkT+=dt;if(MH.thinkT>1.2&&!MH.did.t){if(mhShow("mh-top",GIANT?`星樞：「此步……容我再算一遍。」<small>按右下角「－」，退遠看整盤星盤</small>`:`幻影棋客：「此步容我深思，你先退一步賞景？」<small>按右下角「－」，到天上看看天下大勢</small>`,6000))MH.did.t=1}}else MH.thinkT=0;
      /* ② 一盤下完、結果視窗關掉 */
      if(mood&&!MH.did.e){if(busy)MH.endWait=0;else{MH.endWait+=dt;if(MH.endWait>1.5&&mhShow("mh-say",`小帥：「咦？這圓石台底下好像畫著什麼？」<small>一直按「－」看看</small>`,6000))MH.did.e=1}}}
    /* 11/11 省電模式（評比第 2 輪 ChatGPT「效能、耗電與低負載模式證據」）：pwApply 每秒重判一次（設定改了、電池變了、量到偏慢都跟著換）；
       省電＝畫素比最多 1、太陽不投影、落葉藏起來、飄雲／煙／畫卷／幻影呼吸／人物閒置晃動／火光停住、選中的棋子不上下跳、將軍紅圈不閃；
       畫面沒在動的時候 pwGap 決定少畫幾格。效能計數（近 10 秒）放 PF＝window.__PK.perf，設定頁那一行讀它 */
    const pwApply=f=>{const m=pwMode(),d=pwDecide(m,pwSig());PF.why=d.why;PF.mode=m;PF.lowFps=PWS.lowFps;if(d.on===PW.on&&!f)return;PW.on=d.on;PF.power=d.on;PW.s0=performance.now()/1000;PW.fw.t0=0;PW.low=0;
      try{rd.setPixelRatio(Math.min(d.on?1:2,window.devicePixelRatio||1));sun.castShadow=!d.on;for(const l of falling)l.visible=!d.on}catch(e){}pwPoke(400)};
    const pwSec=(now,sec)=>{PW.sec=sec;Object.assign(PF,pfSum(PW.q,sec));PF.live=true;try{PF.pr=rd.getPixelRatio()}catch(e){}pwApply(false)};
    /* 自動判斷「畫面偏慢」：沒省電、園子淡入 3 秒後才量；連續兩段 5 秒平均都不到每秒 24 格才算（偶爾卡一下不算），記 3 天 */
    const pwFps=now=>{if(PW.on||!shown||now-PW.shownAt<3000){PW.fw.t0=0;return}const a=fpsWin(PW.fw,now);if(a==null)return;PF.fps5=Math.round(a*10)/10;PW.low=a<24?PW.low+1:0;
      if(PW.low>=2&&!PWS.lowFps){PWS.lowFps=true;try{localStorage.setItem("xq_pkLowFps",String(Date.now()))}catch(e){}pwApply(false)}};
    pwApply(true);
    function frame(now){if(stopped)return;if(!document.body.contains(el)){destroy();return}requestAnimationFrame(frame);
      if(document.hidden||el.style.display==="none"){last=now;PW.fw.t0=0;PF.live=false;return}
      if(IN.ph==="hold"||IN.ph==="run"){const k=introK(now-IN.t0,IN.hold,IN.dur);if(now-IN.t0>=IN.hold+IN.dur)inEnd(true);else if(k<=0){tyaw=0;tpitch=0;tzoom=1}else{IN.ph="run";yaw=tyaw=0;pitch=tpitch=.5*k;zoom=tzoom=1+(HOME.z-1)*k}}   /* 11/11 入座運鏡：先停在坐著看，再 ease 到 topfit */
      const act=!shown||inOn()||ptrs.size>0||anims.length>0||endT>0||reach>0||!!MH.cer||now<PW.dirty||Math.abs(tyaw-yaw)+Math.abs(tpitch-pitch)+Math.abs(tzoom-zoom)>1e-3,sec=Math.floor(now/1000);
      if(act)PW.lastAct=now;if(sec!==PW.sec)pwSec(now,sec);
      if(!pwDue(now,PW.lastR,pwGap(PW.on,act,now-PW.lastAct))){pfAdd(PW.q,sec,1,0,0);return}   /* 省電＋閒置：這一格不畫 */
      const t=Math.min(PW.on&&!act?.6:.05,(now-last)/1000);last=now;   /* 省電閒置時一格可能隔 0.5 秒：計時器照實走；一開始動（走子、拖曳）就跟原本一樣最多 0.05 秒，走子動畫不會一格跳完 */
      if(el.clientWidth&&Math.abs(el.clientWidth-W)>1)fit();
      else if((++roomN%60)===0){const rm=room(),want=Math.round(el.clientWidth*clamp((VH0-300)/(el.clientWidth||300),1.14,1.32));if(Math.abs(Math.min(want,Math.max(.85*W,rm))-H)>3)fit()}   // 版面多一行、少一行時重新量
      yaw+=(tyaw-yaw)*Math.min(1,t*8);pitch+=(tpitch-pitch)*Math.min(1,t*8);zoom+=(tzoom-zoom)*Math.min(1,t*10);placeCam();if(flatV)mate.g.visible=zoom>1.12||Math.abs(Math.atan2(Math.sin(yaw),Math.cos(yaw)))>.35;   /* QA P2-5：平視（從小帥眼睛看）時拉遠或轉開，小帥要回到凳子上，不然只剩一張空凳子 */
      anims=anims.filter(a=>{a.t+=t;const p=Math.min(1,a.t/a.d);a.f(p);if(p>=1){a.end&&a.end();return false}return true});
      if(selI>=0&&pieces[selI]){const g=pieces[selI];g.position.y=TOP+.32+(PW.on?0:Math.sin(now/180)*.06)}
      Object.entries(pieces).forEach(([i,g])=>{if(+i!==selI&&!anims.length&&g.position.y!==TOP)g.position.y+=(TOP-g.position.y)*Math.min(1,t*12)});
      if(checkRing)checkRing.material.opacity=PW.on?.85:.55+.4*Math.sin(now/140);
      if(WX)try{WX.tick(t,now)}catch(e){WX=null}   /* 11/10 下雨下雪、積雪 */
      if(CANO)try{CANO.tick(t,cam.position.y)}catch(e){CANO=null}   /* 11/10 對弈遮篷 */
      try{mhTick(t)}catch(e){}   /* 11/10 引導拉遠看朝代地圖 */
      try{CR.tick(t,now)}catch(e){if(!CR.err){CR.err=1;console.warn("crowd",e)}}   /* 11/10 園子熱鬧 */
      if(!PW.on)falling.forEach(l=>{const u=l.userData;u.y-=t*1.6*u.s;if(u.y<-2){u.y=28;u.x=(Math.random()-.5)*50}l.position.set(u.x+Math.sin(now/900+u.ph)*2.5,GY+u.y,u.z);l.rotation.set(now/700*u.s+u.ph,now/500,now/800)});
      if(endT>0)endT=Math.max(0,endT-t);const EP=1-endT/END,ON=endT>0;   // 勝負動畫的進度 0→1
      // 3D 人物（線上對手的小帥、我的小帥）的勝負動畫：贏＝跳起來、中段轉一圈、雙手歡呼；輸＝垂頭、搖頭、雙手下垂；和＝拱手點頭
      const endPose=(A,res,B,base)=>{const g=A.g,y0=g.userData.y0==null?(g.userData.y0=g.position.y):g.userData.y0,r0=g.userData.r0==null?(g.userData.r0=g.rotation.y):g.userData.r0;
        if(!ON||!res){g.position.y=y0;g.rotation.y=r0;return null}
        const sp=EP>.35&&EP<.6?((EP-.35)/.25)*TAU:0;
        if(res==="win"){g.position.y=y0+base*Math.abs(Math.sin(EP*END*5.5));g.rotation.y=r0+sp;R(B,0,0,.3*Math.sin(EP*40),-2.7);R(B,1,0,.3*Math.sin(EP*40),2.7);A.face="happy";return[-.3,0]}
        if(res==="lose"){g.position.y=y0;g.rotation.y=r0;R(B,0,.25,0,-.05);R(B,1,.25,0,.05);A.face="sad";return[.55,.35*Math.sin(EP*END*6)*(EP<.8?1:0)]}
        g.position.y=y0;g.rotation.y=r0;const k=Math.sin(Math.min(1,EP*2)*PI);R(B,0,-1.3,.5,-.35);R(B,1,-1.3,-.5,.35);A.face="smile";return[.35*k,0]};
      const s=PW.on&&!ON?PW.s0:now/1000,lerp=(o,k,v)=>{o[k]+=(v-o[k])*Math.min(1,t*5)},tick=A=>{A.blinkT-=t;const bl=A.blinkT<0;if(A.blinkT<-.12)A.blinkT=2+Math.random()*3;
          if(A.faceT>0&&A.faceT<90){A.faceT-=t;if(A.faceT<=0&&!mood)A.face="smile"}if(A.bubT>0){A.bubT-=t;if(A.bubT<=0)A.bub.visible=false}
          try{XQBot3D.faceApply(A.B,A.face,bl,A.bubT>0&&Math.sin(now/70)>0)}catch(e){}};
      if(oppSpr){const S2=oppSpr;if(reach){reachT+=t;if(reachT>=1.1)reach=0}
        const ps=mood&&opp.face==="happy"?"happy":mood&&opp.face==="sad"?"sad":reach?"move":opp.faceT>0&&opp.face==="open"?"surprise":opp.faceT>0&&opp.face==="happy"?"happy":thinking?"think":"idle";
        if(ps!==S2.pose){S2.pose=ps;S2.sp.material.map=S2.tex[ps];S2.sp.material.needsUpdate=true}
        /* 意見回饋 456：立繪是一張平面，轉頭從側面看會變成一條細線（破圖）——讓它永遠轉向鏡頭（只轉水平方向，前傾角度不變） */
        S2.sp.rotation.order="YXZ";{const a=Math.atan2(cam.position.x-S2.sp.position.x,cam.position.z-S2.sp.position.z),LIM=1.05;S2.sp.rotation.y=a>LIM?a-LIM:a<-LIM?a+LIM:0}   /* 意見回饋 776（開發者：格格會跟著旋轉）：立牌平常固定朝向座位、不跟著鏡頭轉；只有鏡頭轉到側面超過約 60 度時才轉一點，保持最多斜 60 度，不會變成一條細線（456） */
        let amp=ps==="happy"?.35*Math.abs(Math.sin(s*7)):.07*Math.sin(s*2.1),rz=0,sc2=1;
        if(ON&&oppRes==="win"){amp=1.4*Math.abs(Math.sin(EP*END*5.5));rz=.12*Math.sin(EP*END*7);sc2=1+.05*Math.sin(EP*END*11)}   // 贏：大跳、左右搖擺
        else if(ON&&oppRes==="lose"){amp=-.5*Math.min(1,EP*4);rz=EP<.8?.07*Math.sin(EP*END*6):0}                                   // 輸：往下垮、搖頭
        else if(ON&&oppRes==="draw"){amp=-.25*Math.sin(Math.min(1,EP*2)*PI)}                                                   // 和：點頭致意
        S2.sp.position.y=S2.y0+amp;S2.sp.rotation.z=rz;S2.sp.scale.setScalar(sc2);tick(opp)}
      else if(opp.B){const B=opp.B;B.torso.position.y=B.torso.userData.y0==null?(B.torso.userData.y0=B.torso.position.y):B.torso.userData.y0+.018*Math.sin(s*2.1);
        glanceT-=t;if(glanceT<0){glance=glance?0:1;glanceT=glance?1.6:4+Math.random()*5}
        let hx=glance?-.05:.2,hy=glance?0:.08*Math.sin(s*.4),hz=0;
        // 手：平常放大腿上；思考時右手托下巴；走棋時右手往前伸
        R(B,0,-.9,.25,-.25);R(B,1,-.9,-.25,.25);
        if(thinking&&!reach){R(B,1,-2.25,-.45,.75);hx=.18;hz=-.12+.04*Math.sin(s*1.3);if(opp.faceT<=0)opp.face="flat"}
        if(reach){reachT+=t;const p=Math.min(1,reachT/1.1),k=Math.sin(p*PI);R(B,1,-.9-1.15*k,-.25+.2*k,.25-.1*k);hx=.32+.1*k;if(p>=1)reach=0}
        if(mood&&opp.face==="happy"){R(B,0,-.2,0,-2.6+.3*Math.sin(s*9));R(B,1,-.2,0,2.6-.3*Math.sin(s*9));hx=-.1}else if(mood&&opp.face==="sad")hx=.45;
        {const e=endPose(opp,oppRes,B,1.0);if(e){hx=e[0];hy=e[1]}}
        lerp(B.head.rotation,"x",hx);lerp(B.head.rotation,"y",hy);lerp(B.head.rotation,"z",hz);tick(opp)}
      watchers.forEach(W=>{const B=W.B,ph=W.ph;if(B.torso.userData.y0==null)B.torso.userData.y0=B.torso.position.y;B.torso.position.y=B.torso.userData.y0+.015*Math.sin(s*1.7+ph);
        B.bot.rotation.z=.03*Math.sin(s*.6+ph);R(B,0,.35,0,-.15);R(B,1,.35,0,.15);if(W.chin)R(B,1,-2.2,-.45,.7);
        lerp(B.head.rotation,"x",.42+.06*Math.sin(s*.5+ph));lerp(B.head.rotation,"y",.15*Math.sin(s*.3+ph));
        if(W.react>0){W.react-=t;R(B,0,-.5,0,-1.3);R(B,1,-.5,0,1.3);B.bot.rotation.x=-.14*Math.min(1,W.react*2)}else if(B.bot.rotation.x)B.bot.rotation.x=0;   /* 11/10 絕殺驚呼：被將軍時舉手往前傾 */
        W.blinkT-=t;const bl=W.blinkT<0;if(W.blinkT<-.12)W.blinkT=2+Math.random()*3;try{XQBot3D.faceApply(B,W.chin?"flat":"smile",bl,false)}catch(e){}});
      if(mate.B){const B=mate.B;B.torso.position.y=B.torso.userData.y0==null?(B.torso.userData.y0=B.torso.position.y):B.torso.userData.y0+.02*Math.sin(s*2.4+1);
        // 小帥坐在桌角：看棋盤、偶爾轉頭看你；你吃子或贏棋時舉手歡呼
        // 小帥面向我：平常抬頭看我，偶爾回頭看一下棋盤
        const look=(s%8)<1.8;let hx=look?.05:-.28+.04*Math.sin(s*.9),hy=look?.95:.12*Math.sin(s*.7);R(B,0,-.7,.2,-.35);R(B,1,-.7,-.2,.35);
        if(mate.face==="happy"&&(mate.faceT>0||mood)){R(B,0,-.2,0,-2.6+.3*Math.sin(s*10));R(B,1,-.2,0,2.6-.3*Math.sin(s*10));hx=-.35;hy=0}
        else if(mate.face==="open"&&mate.faceT>0){R(B,0,-.4,0,-1.2);R(B,1,-.4,0,1.2);hx=-.2;hy=0}
        {const e=endPose(mate,mateRes,B,.5);if(e){hx=e[0];hy=e[1]}}
        B.legs[0].rotation.x=-1.5+.08*Math.sin(s*2.2);B.legs[1].rotation.x=-1.5-.08*Math.sin(s*2.2);   /* 意見回饋 551：坐著，大腿平放、小腿輕輕晃 */
        lerp(B.head.rotation,"x",hx);lerp(B.head.rotation,"y",hy);tick(mate)}
      if(GIANT)gntTick(t,s);orbTick(t,s);furn.tick(s);rd.render(sc,cam);PW.lastR=now;pfAdd(PW.q,sec,1,1,act?0:1);pwFps(now)}
    // 第一次 draw 之後，等所有圖片（背景、道具、棋盤、棋子、Pikafish）都載好才淡入；最多等 6 秒
    let drawn=false,shown=false;const t0=performance.now();rd.domElement.style.opacity=0;rd.domElement.style.transition="opacity .35s";
    const shownCb=[];const reveal=()=>{if(shown)return;shown=true;PW.shownAt=performance.now();if(IN.ph==="wait"){INTRO_SEEN.add(IN.key);IN.ph="hold";IN.t0=performance.now()}rd.domElement.style.opacity=1;veil.style.opacity=0;setTimeout(()=>veil.remove(),400);if(veil._qmin){hint.style.opacity=1;setTimeout(()=>hint.style.opacity=0,4500)}shownCb.splice(0).forEach(f=>{try{f()}catch(e){}})};
    const waitShow=()=>{if(stopped||shown)return;const mn=veil._qskip?1200:Math.max(1200,veil._qmin||0),dt=performance.now()-t0;if((drawn&&!inflight.size&&dt>mn)||dt>Math.max(6000,veil._qskip?0:mn+2000)){requestAnimationFrame(()=>requestAnimationFrame(reveal));return}setTimeout(waitShow,80)};
    /* 視角：俯視 top、平視 flat、數字＝俯角；11/11 新增 topfit＝俯視＋拉近到格距約 30px（只在手機直式；其他裝置等於 top）。
       top／flat 跟以前一樣（距離 1 倍、點兩下回到坐著看的角度），玩家存過的視角照舊；topfit 點兩下回到 topfit */
    const setViewF=m=>{inEnd(false);if(m==="topfit"&&HFIT()){goTopFit(false);return}const k=m==="topfit"?"top":m;
      tyaw=k==="flat"?.56:0;tpitch=typeof k==="number"?k:k==="top"?.5:k==="flat"?-.22:0;tzoom=1;flatV=false;mate.g.visible=true;HOME={p:0,z:1,fit:false};userZ=false};
    fit();placeCam();
    try{if(opt.view)setViewF(opt.view);else if(HFIT()&&!inStart(typeof opt.intro==="string"?opt.intro:null,false)){if(typeof opt.intro==="string")INTRO_SEEN.add(opt.intro);goTopFit(true)}}catch(e){}   /* opt.view＝玩家存過的視角（06-cpu 傳 store parkView）；沒存過的手機直式＝topfit */
    requestAnimationFrame(frame);setTimeout(waitShow,80);
    const onRs=()=>{if(el.style.display!=="none")fit()};window.addEventListener("resize",onRs);
    function destroy(){if(stopped)return;stopped=true;PF.live=false;try{if(WX)WX.dispose()}catch(e){}WX=null;window.removeEventListener("resize",onRs);
      try{sc.traverse(o=>{const ms=o.material?(Array.isArray(o.material)?o.material:[o.material]):[];for(const m of ms){if(m&&m.map)freeTex(m.map);m&&m.dispose&&m.dispose()}if(o.geometry)o.geometry.dispose()});for(const k in faceCache){freeTex(faceCache[k]);delete faceCache[k]}}catch(e){}
      try{rd.dispose();rd.forceContextLoss()}catch(e){}el.remove();opt.onDestroy&&opt.onDestroy()}
    // 意見回饋 244：切回平面棋盤時只藏起來、暫停繪製（不拆掉 3D 場景），再切回公園就直接顯示，不用重新載入
    /* 意見回饋 370：棋盤格 → 螢幕座標（App 的吃子水墨圈畫在公園棋盤的那一格上） */
    const screenOf=i=>{try{const[x,z]=pos(i),v=new T.Vector3(x,TOP,z).project(cam),r=el.getBoundingClientRect();if(!r.width)return null;return{x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height}}catch(e){return null}};
    /* 巨盤模式：場景建好當下的東西（桌椅、地面、長卷以外的道具、小帥、對手、天空球）全部藏起來，每一格都再藏一次（有些會被動畫打開）；只留燈、棋盤、黑洞環景、提示記號 */
    const gntKeep=o=>o.isLight||o===bplane||o.material===wood||o===PANM||o===markG||!!(o.userData&&o.userData.giant);
    if(GIANT){for(const A of[mate,opp])if(A)A.say=()=>{}}
    function gntTick(t,s){for(const o of sc.children)if(o.visible&&!gntKeep(o))o.visible=false;
      for(const g of gntFigs){const B=g.userData.B;if(g.parent&&B&&B.mixer)B.mixer.update(t)}
      for(const g of gntStones){if(!g.parent)continue;const st=g.userData.st;st.position.y=.54+(PW.on?0:.06*Math.sin(s*1.6+g.userData.ph));st.lookAt(cam.position)}}
    return{el,draw,destroy,say,screenOf,whenShown(f){if(shown)f();else shownCb.push(f)},oppSay:(t,d)=>{pwPoke(((+d)||2.6)*1000);return opp.say(t,d)},resetView(){reset()},setView:setViewF,intro(k){try{if(!k)return false;k=String(k);const ok=inStart(k,shown);if(!ok)INTRO_SEEN.add(k);return ok}catch(e){return false}},   /* 11/11 入座運鏡：同一座園子換下一盤時 06-cpu 叫這個（這盤播過、沒存視角以外的情況都不播） */homeView:()=>HOME.fit?"topfit":"",   /* 意見回饋 481（開發者：平視看不到小帥）：平視改成從小帥右肩後面斜著看——小帥在畫面左下、不擋棋盤 */   /* 平視＝從小帥的眼睛看出去（小帥先藏起來，不會擋住棋盤） */   /* 意見回饋 430：平視原本 -.85，鏡頭跑到小帥背後被擋住，改成 -.22 */hide(){el.style.display="none"},show(){if(el.style.display==="none"){el.style.display="";fit()}}}}
  /* 11/11 省電模式：power()＝現在的設定和自動判斷結果（開著的園子每秒自己重判，不用通知）；perf()＝最近一座園子近 10 秒的效能計數（同 window.__PK.perf） */
  window.XQPark3D={create,power(){pwBat();const m=pwMode();return Object.assign({mode:m},pwDecide(m,pwSig()))},perf:()=>PF};
})();
