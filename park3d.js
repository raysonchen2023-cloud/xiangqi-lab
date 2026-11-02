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
  const BW=10.4,BH=11.4,TOP=.12;    // 棋盤（含邊）大小、棋盤面高度；格距 1
  function cv(w,h,f){const c=document.createElement("canvas");c.width=w;c.height=h;f(c.getContext("2d"),w,h);const t=new T.CanvasTexture(c);if(T.SRGBColorSpace)t.colorSpace=T.SRGBColorSpace;t.anisotropy=8;return t}
  const noise=(g,w,h,n,a,b)=>{for(let i=0;i<n;i++){g.fillStyle=`rgba(${a},${Math.random()*b})`;const s=1+Math.random()*3;g.fillRect(Math.random()*w,Math.random()*h,s,s)}};
  // ---------- 貼圖 ----------
  const boardTex=()=>cv(1040,1140,(g,w,h)=>{const u=w/BW;
    let gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,"#E9C98E");gr.addColorStop(.5,"#DDB878");gr.addColorStop(1,"#D2A866");g.fillStyle=gr;g.fillRect(0,0,w,h);
    for(let i=0;i<160;i++){g.strokeStyle=`rgba(${120+Math.random()*40|0},${70+Math.random()*30|0},20,${.04+Math.random()*.08})`;g.lineWidth=1+Math.random()*3;g.beginPath();const y=Math.random()*h;g.moveTo(0,y);
      for(let x=0;x<=w;x+=40)g.lineTo(x,y+Math.sin(x/90+i)*6+Math.random()*2);g.stroke()}
    const X=c=>(c+1.2)*u,Y=r=>(r+1.2)*u;g.strokeStyle="#5A3215";g.lineCap="round";
    g.lineWidth=7;g.strokeRect(X(0)-.32*u,Y(0)-.32*u,8.64*u,9.64*u);g.lineWidth=3;
    for(let r=0;r<10;r++){g.beginPath();g.moveTo(X(0),Y(r));g.lineTo(X(8),Y(r));g.stroke()}
    for(let c=0;c<9;c++){g.beginPath();if(c===0||c===8){g.moveTo(X(c),Y(0));g.lineTo(X(c),Y(9))}else{g.moveTo(X(c),Y(0));g.lineTo(X(c),Y(4));g.moveTo(X(c),Y(5));g.lineTo(X(c),Y(9))}g.stroke()}
    for(const r0 of[0,7]){g.beginPath();g.moveTo(X(3),Y(r0));g.lineTo(X(5),Y(r0+2));g.moveTo(X(5),Y(r0));g.lineTo(X(3),Y(r0+2));g.stroke()}
    const mark=(c,r)=>{const d=.09*u,l=.2*u;for(const sx of[-1,1])for(const sy of[-1,1]){if((c===0&&sx<0)||(c===8&&sx>0))continue;const x=X(c)+sx*d,y=Y(r)+sy*d;g.beginPath();g.moveTo(x+sx*l,y);g.lineTo(x,y);g.lineTo(x,y+sy*l);g.stroke()}};
    g.lineWidth=2.5;for(const r of[2,7])for(const c of[1,7])mark(c,r);for(const r of[3,6])for(const c of[0,2,4,6,8])mark(c,r);
    g.fillStyle="#5A3215";g.font=`900 ${.62*u}px "Noto Serif TC","PMingLiU","Songti TC","SimSun",serif`;g.textAlign="center";g.textBaseline="middle";
    const ry=(Y(4)+Y(5))/2;g.fillText("楚",X(1.2),ry);g.fillText("河",X(2.6),ry);g.fillText("漢",X(5.4),ry);g.fillText("界",X(6.8),ry);
    noise(g,w,h,3000,"90,50,20",.06)});
  const faceCache={};
  const faceTex=(ch,red)=>faceCache[ch]||(faceCache[ch]=cv(256,256,(g,n)=>{const h=n/2;
    let gr=g.createRadialGradient(h*.8,h*.75,10,h,h,h);gr.addColorStop(0,"#F8E3B8");gr.addColorStop(.8,"#E9C891");gr.addColorStop(1,"#D3A962");g.fillStyle=gr;g.fillRect(0,0,n,n);
    const ink=red?"#B5141C":"#1C1A18";g.strokeStyle=ink;g.lineWidth=7;g.beginPath();g.arc(h,h,h*.8,0,TAU);g.stroke();g.lineWidth=2;g.beginPath();g.arc(h,h,h*.71,0,TAU);g.stroke();
    g.font='900 128px "Noto Serif TC","PMingLiU","Songti TC","SimSun",serif';g.textAlign="center";g.textBaseline="middle";
    g.fillStyle="rgba(255,255,255,.55)";g.fillText(ch,h+2,h+9);g.fillStyle=ink;g.fillText(ch,h,h+6)}));
  const stoneTex=(base,rep)=>{const t=cv(512,512,(g,w,h)=>{g.fillStyle=base;g.fillRect(0,0,w,h);noise(g,w,h,9000,"255,255,255",.12);noise(g,w,h,9000,"0,0,0",.14);
    for(let i=0;i<40;i++){g.fillStyle=`rgba(${Math.random()<.5?"40,40,40":"235,230,220"},${.05+Math.random()*.08})`;g.beginPath();g.arc(Math.random()*w,Math.random()*h,4+Math.random()*16,0,TAU);g.fill()}});
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(rep,rep);return t};
  const grassTex=()=>{const t=cv(512,512,(g,w,h)=>{g.fillStyle="#6E9B4A";g.fillRect(0,0,w,h);
    for(let i=0;i<14000;i++){const c=[[86,128,58],[110,160,70],[72,110,48],[130,170,80]][Math.random()*4|0];g.strokeStyle=`rgba(${c},${.35+Math.random()*.4})`;g.lineWidth=1;const x=Math.random()*w,y=Math.random()*h;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.random()*4-2,y-3-Math.random()*6);g.stroke()}});
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(40,40);return t};
  const paveTex=()=>{const t=cv(512,512,(g,w,h)=>{g.fillStyle="#B9B1A3";g.fillRect(0,0,w,h);const s=w/4;
    for(let y=0;y<4;y++)for(let x=0;x<4;x++){const v=180+Math.random()*30|0;g.fillStyle=`rgb(${v},${v-6},${v-16})`;g.fillRect(x*s+3,y*s+3,s-6,s-6)}noise(g,w,h,6000,"0,0,0",.1)});
    t.wrapS=t.wrapT=T.RepeatWrapping;t.repeat.set(10,10);return t};
  const skyTex=()=>cv(16,512,(g,w,h)=>{const gr=g.createLinearGradient(0,0,0,h);gr.addColorStop(0,"#5E9BD6");gr.addColorStop(.42,"#A9CBE8");gr.addColorStop(.5,"#F3E2C4");gr.addColorStop(.56,"#E8E0CF");gr.addColorStop(1,"#C9D3BF");g.fillStyle=gr;g.fillRect(0,0,w,h)});
  const glowTex=()=>cv(128,128,(g,n)=>{const gr=g.createRadialGradient(n/2,n/2,0,n/2,n/2,n/2);gr.addColorStop(0,"rgba(255,248,220,1)");gr.addColorStop(.25,"rgba(255,236,180,.8)");gr.addColorStop(1,"rgba(255,220,150,0)");g.fillStyle=gr;g.fillRect(0,0,n,n)});
  const bubbleTex=txt=>cv(512,160,(g,w,h)=>{g.fillStyle="rgba(255,253,247,.96)";g.strokeStyle="#3a2618";g.lineWidth=6;const r=50;g.beginPath();g.moveTo(r,6);g.arcTo(w-6,6,w-6,h-30,r);g.arcTo(w-6,h-30,6,h-30,r);g.arcTo(6,h-30,6,6,r);g.arcTo(6,6,w-6,6,r);g.closePath();g.fill();g.stroke();
    g.fillStyle="#3a2618";g.font='700 54px "Noto Sans TC","PingFang TC",sans-serif';g.textAlign="center";g.textBaseline="middle";g.fillText(txt,w/2,(h-30)/2+3)});

  function create(host,opt){opt=opt||{};
    const el=document.createElement("div");el.className="park3d";el.style.cssText="position:relative;width:100%;border-radius:14px;overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;background:#A9CBE8";
    host.append(el);
    let rd;try{rd=new T.WebGLRenderer({antialias:true,powerPreference:"high-performance"})}catch(e){el.remove();return null}
    rd.setPixelRatio(Math.min(2,window.devicePixelRatio||1));rd.shadowMap.enabled=true;rd.shadowMap.type=T.PCFSoftShadowMap;
    if(T.SRGBColorSpace)rd.outputColorSpace=T.SRGBColorSpace;rd.toneMapping=T.ACESFilmicToneMapping;rd.toneMappingExposure=.92;
    rd.domElement.style.cssText="display:block;width:100%;height:100%";el.append(rd.domElement);
    const hint=document.createElement("div");hint.style.cssText="position:absolute;left:50%;bottom:8px;transform:translateX(-50%);font:600 11px sans-serif;color:#fff;background:rgba(30,20,10,.45);padding:3px 10px;border-radius:99px;pointer-events:none;transition:opacity .6s";
    hint.textContent="點棋子走棋・拖曳轉頭看看四周・點兩下回正";el.append(hint);setTimeout(()=>hint.style.opacity=0,4500);
    const sc=new T.Scene();sc.fog=new T.Fog(0xD9DDCF,60,190);
    const cam=new T.PerspectiveCamera(56,1,.5,600);
    // 光：天光＋午後斜陽（投影）＋補光
    sc.add(new T.HemisphereLight(0xEAF2FF,0x5B6A3A,.55));
    const sun=new T.DirectionalLight(0xFFE2B8,1.6);sun.position.set(-26,40,18);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
    Object.assign(sun.shadow.camera,{left:-22,right:22,top:22,bottom:-22,near:5,far:120});sun.shadow.bias=-.0006;sun.shadow.normalBias=.03;sc.add(sun);
    const fill=new T.DirectionalLight(0xCFE0FF,.35);fill.position.set(20,15,-20);sc.add(fill);
    // 天空、太陽光暈
    const sky=new T.Mesh(new T.SphereGeometry(400,32,16),new T.MeshBasicMaterial({map:skyTex(),side:T.BackSide,fog:false,depthWrite:false}));sc.add(sky);
    const glow=new T.Sprite(new T.SpriteMaterial({map:glowTex(),transparent:true,depthWrite:false,fog:false,blending:T.AdditiveBlending}));glow.position.set(-150,95,-260);glow.scale.set(120,120,1);sc.add(glow);
    const M=(c,o)=>new T.MeshStandardMaterial(Object.assign({color:c,roughness:.8,metalness:0},o||{}));
    const mesh=(geo,mat,pos,o)=>{const m=new T.Mesh(geo,mat);if(pos)m.position.set(...pos);m.castShadow=!(o&&o.noCast);m.receiveShadow=true;sc.add(m);return m};
    const GY=-19;   // 地面高度（桌面＝0）
    // 地面：草地＋石板廣場
    const grass=new T.Mesh(new T.CircleGeometry(400,48),M(0xffffff,{map:grassTex(),roughness:1}));grass.rotation.x=-PI/2;grass.position.y=GY-.05;grass.receiveShadow=true;sc.add(grass);
    const pave=new T.Mesh(new T.CircleGeometry(30,64),M(0xffffff,{map:paveTex(),roughness:.95}));pave.rotation.x=-PI/2;pave.position.y=GY;pave.receiveShadow=true;sc.add(pave);
    const curb=new T.Mesh(new T.TorusGeometry(30,.5,8,96),M(0x9A9284));curb.rotation.x=PI/2;curb.position.y=GY;curb.receiveShadow=true;sc.add(curb);
    // 遠山
    for(let i=0;i<14;i++){const a=-PI*.95+i/13*PI*1.9+(Math.random()-.5)*.2,r=230+Math.random()*60,hgt=40+Math.random()*50;
      const m=new T.Mesh(new T.ConeGeometry(55+Math.random()*40,hgt,7),new T.MeshStandardMaterial({color:new T.Color().setHSL(.33+Math.random()*.08,.22,.42+Math.random()*.08),roughness:1,flatShading:true}));
      m.position.set(Math.sin(a)*r,GY+hgt/2-6,-Math.cos(a)*r);sc.add(m)}
    // 石桌（圓桌面＋鼓形桌腳）
    const stone=M(0xffffff,{map:stoneTex("#A9A398",2),roughness:.85}),stone2=M(0xffffff,{map:stoneTex("#9C968B",2),roughness:.9});
    const top=mesh(new T.CylinderGeometry(8.2,8.0,.9,72),stone,[0,-.45,0]);
    mesh(new T.TorusGeometry(8.1,.18,10,96),stone,[0,-.04,0]).rotation.x=PI/2;
    mesh(new T.CylinderGeometry(2.3,3.2,18,40),stone2,[0,GY+9-.9,0]);mesh(new T.CylinderGeometry(4.2,4.6,1.2,40),stone2,[0,GY+.6,0]);
    // 木棋盤嵌在桌上
    const wood=M(0x8A5A2E,{roughness:.6});mesh(new T.BoxGeometry(BW+.2,.14,BH+.2),wood,[0,.02,0]);
    const bplane=new T.Mesh(new T.PlaneGeometry(BW,BH),new T.MeshStandardMaterial({map:boardTex(),roughness:.55}));bplane.rotation.x=-PI/2;bplane.position.y=TOP-.02+.03;bplane.receiveShadow=true;sc.add(bplane);
    // 石凳（左右各一個空的；我這邊一個）
    const stool=(x,z)=>{mesh(new T.CylinderGeometry(2.4,2.2,1.4,36),stone,[x,GY+13.3,z]);mesh(new T.CylinderGeometry(1.5,2.3,12.6,36),stone2,[x,GY+6.3,z])};
    stool(-14.5,1.5);stool(14.5,-1.5);
    // 長椅（小帥坐的）
    const plank=M(0xA0612F,{roughness:.7}),iron=M(0x2F3B33,{roughness:.45,metalness:.6});const BZ=-12.6,SY=-3.9;
    for(let i=0;i<4;i++)mesh(new T.BoxGeometry(16,.45,1.1),plank,[0,SY,BZ+1.8-i*1.2]);
    for(let i=0;i<3;i++){const b=mesh(new T.BoxGeometry(16,.45,1.0),plank,[0,SY+3.6+i*1.4,BZ-2.6-i*.25]);b.rotation.x=-.18}
    for(const x of[-7,7]){mesh(new T.BoxGeometry(.6,SY-GY,.6),iron,[x,(SY+GY)/2,BZ+1.8]);mesh(new T.BoxGeometry(.6,SY-GY+5.2,.6),iron,[x,(SY+GY+5.2)/2,BZ-2.6]);mesh(new T.BoxGeometry(.5,.5,5),iron,[x,SY-.4,BZ-.4]);
      const arm=mesh(new T.BoxGeometry(.5,.5,4.4),iron,[x,SY+3.2,BZ]);arm.rotation.x=.05}
    // 茶杯
    const cup=new T.Group();cup.position.set(6.5,.0,3.0);sc.add(cup);
    {const por=M(0xF4F1EA,{roughness:.25}),blue=M(0x2D5DA8,{roughness:.3});const a=new T.Mesh(new T.CylinderGeometry(.75,.75,.08,32),por);a.position.y=.04;cup.add(a);
      const b=new T.Mesh(new T.CylinderGeometry(.5,.36,.7,32,1,true),por);b.position.y=.43;b.material.side=T.DoubleSide;cup.add(b);const band=new T.Mesh(new T.CylinderGeometry(.505,.47,.12,32,1,true),blue);band.position.y=.6;cup.add(band);
      const tea=new T.Mesh(new T.CircleGeometry(.47,32),M(0x9C6B1E,{roughness:.1}));tea.rotation.x=-PI/2;tea.position.y=.66;cup.add(tea);cup.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true}})}
    // 大樹
    const bark=M(0x6B4A30,{roughness:.95});
    const tree=(x,z,s)=>{const g=new T.Group();g.position.set(x,GY,z);g.scale.setScalar(s);sc.add(g);const tr=new T.Mesh(new T.CylinderGeometry(.9,1.4,14,10),bark);tr.position.y=7;tr.castShadow=true;g.add(tr);
      const n=4+Math.random()*3|0;for(let i=0;i<n;i++){const leaf=new T.Mesh(new T.IcosahedronGeometry(4+Math.random()*2.4,1),new T.MeshStandardMaterial({color:new T.Color().setHSL(.24+Math.random()*.07,.45,.28+Math.random()*.12),roughness:.9,flatShading:true}));
        leaf.position.set((Math.random()-.5)*7,15+Math.random()*5,(Math.random()-.5)*7);leaf.castShadow=true;g.add(leaf)}};
    [[-34,-40,1.5],[30,-52,1.7],[-62,-18,1.4],[58,-10,1.3],[-12,-78,1.9],[16,-96,2],[-78,-70,1.6],[70,-74,1.8],[-46,20,1.2],[50,30,1.3]].forEach(a=>tree(...a));
    // 灌木
    for(let i=0;i<16;i++){const a=Math.random()*TAU,r=36+Math.random()*30;if(Math.cos(a)>.6)continue;const b=new T.Mesh(new T.IcosahedronGeometry(2+Math.random()*1.5,1),new T.MeshStandardMaterial({color:new T.Color().setHSL(.27,.4,.3+Math.random()*.1),roughness:.95,flatShading:true}));
      b.position.set(Math.sin(a)*r,GY+1.2,-Math.cos(a)*r);b.scale.y=.7;b.castShadow=true;sc.add(b)}
    // 路燈
    {const g=new T.Group();g.position.set(22,GY,-24);sc.add(g);const p=new T.Mesh(new T.CylinderGeometry(.35,.55,26,12),iron);p.position.y=13;p.castShadow=true;g.add(p);
      const lamp=new T.Mesh(new T.CylinderGeometry(1.2,1.6,2.4,6),M(0xFFF3C8,{emissive:0xFFE29A,emissiveIntensity:.6,roughness:.3}));lamp.position.y=27;g.add(lamp);
      const cap=new T.Mesh(new T.ConeGeometry(2.2,1.4,6),iron);cap.position.y=28.9;g.add(cap)}
    // 落葉
    {const lg=new T.PlaneGeometry(.6,.4),cols=[0xC98A3A,0xA8642A,0xD9A548,0x8B9A3A];for(let i=0;i<120;i++){const a=Math.random()*TAU,r=10+Math.random()*28;
      const l=new T.Mesh(lg,new T.MeshStandardMaterial({color:cols[i%4],roughness:1,side:T.DoubleSide}));l.position.set(Math.sin(a)*r,GY+.06,Math.cos(a)*r);l.rotation.set(-PI/2,0,Math.random()*TAU);l.receiveShadow=true;sc.add(l)}}
    const falling=[];{const lg=new T.PlaneGeometry(.5,.34);for(let i=0;i<10;i++){const l=new T.Mesh(lg,new T.MeshStandardMaterial({color:[0xD9A548,0xC98A3A,0xB5763A][i%3],side:T.DoubleSide,roughness:1}));
      l.userData={x:(Math.random()-.5)*50,z:-10-Math.random()*40,y:Math.random()*30,s:.6+Math.random()*.8,ph:Math.random()*TAU};sc.add(l);falling.push(l)}}

    // ---------- 角色：對面長椅坐對手（電腦＝瘦版 Pikafish；真人＝對方自己的小帥），我這邊桌角坐我的小帥 ----------
    // 意見回饋 212：小帥是玩家的夥伴，坐在玩家這一邊；對面是對手的位置
    const mkBub=(x,y,z,w)=>{const b=new T.Sprite(new T.SpriteMaterial({transparent:true,depthTest:false}));b.scale.set(w,w*.31,1);b.position.set(x,y,z);b.visible=false;b.renderOrder=10;sc.add(b);return b};
    const actor=(g,bub)=>({g,bub,B:null,face:"smile",faceT:0,bubT:0,blinkT:2+Math.random()*2,
      setFace(f,d){this.face=f;this.faceT=d||0},say(t,d){const m=this.bub.material;m.map&&m.map.dispose();m.map=bubbleTex(t);m.needsUpdate=true;this.bub.visible=true;this.bubT=d||2.2}});
    const seat=B=>{B.legs.forEach(l=>{l.rotation.x=-1.35});B.bot.position.y=-.35};
    const opp=actor(new T.Group(),mkBub(4.6,SY+12.6,BZ+2,8));opp.g.position.set(0,SY-.3,BZ+1.0);opp.g.scale.setScalar(4.6);sc.add(opp.g);
    const mate=actor(new T.Group(),mkBub(-5.2,5.4,1.6,4.4));mate.g.position.set(-6.75,.02,1.3);mate.g.rotation.y=.95;mate.g.scale.setScalar(1.3);sc.add(mate.g);
    let oppKey="";
    const buildActor=(A,look)=>{A.g.clear();A.B=null;try{if(window.XQBot3D&&XQBot3D.figure){A.B=XQBot3D.figure(look||{});A.g.add(A.B.bot);A.B.bot.traverse(o=>{if(o.isMesh)o.castShadow=true});seat(A.B)}}catch(e){A.B=null}};
    const setOpp=look=>{const k=JSON.stringify(look||null);if(k===oppKey)return;oppKey=k;if(!look){opp.g.clear();opp.B=null;return}buildActor(opp,look)};
    buildActor(mate,{});
    const say=(t,d)=>mate.say(t,d);
    let reach=0,reachT=0,thinking=false,mood=null,glanceT=3,glance=0,mySide="r",oppName="";
    // ---------- 棋子 ----------
    const pieceGeo=(()=>{const pts=[];const R=.46,H=.27,r=.06;pts.push(new T.Vector2(0,0));pts.push(new T.Vector2(R-r,0));for(let i=0;i<=6;i++){const a=-PI/2+i/6*PI/2;pts.push(new T.Vector2(R-r+Math.cos(a)*r,r+Math.sin(a)*r))}
      for(let i=0;i<=6;i++){const a=i/6*PI/2;pts.push(new T.Vector2(R-r+Math.cos(a)*r,H-r+Math.sin(a)*r))}pts.push(new T.Vector2(0,H));return new T.LatheGeometry(pts,40)})();
    const pieceMat=new T.MeshStandardMaterial({color:0xD9AE6A,roughness:.5}),faceGeo=new T.CircleGeometry(.4,40);
    const makePiece=p=>{const s=sideOf(p),ch=NAMES[s][p.toUpperCase()],g=new T.Group();const body=new T.Mesh(pieceGeo,pieceMat);body.castShadow=true;body.receiveShadow=true;g.add(body);
      const f=new T.Mesh(faceGeo,new T.MeshStandardMaterial({map:faceTex(ch,s==="r"),roughness:.4}));f.rotation.x=-PI/2;f.position.y=.272;g.add(f);g.userData={p};sc.add(g);return g};
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
        lost.forEach((p,j)=>{const g=makePiece(p);const col=j%5,row=j/5|0;g.position.set(mine?2.0+col*.98:-2.0-col*.98,.0,mine?6.4+row*.8:-6.4-row*.8);g.rotation.y=(Math.random()-.5)*.6;captured.push(g)})}}
    function sync(board){Object.values(pieces).forEach(g=>sc.remove(g));pieces={};board.forEach((p,i)=>{if(p){const g=makePiece(p);at(g,i);pieces[i]=g}});layoutCaptured(board)}
    function draw(board,o,ex){o=o||{};ex=ex||{};const nf=!!o.flip;
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
      (o.targets||[]).forEach(i=>{if(board[i])ring(i,0xD7263D,.52,.08,.95);else disc(i,0x2F9E5A,.15,.85)});
      if(typeof o.check==="number"&&o.check>=0&&board[o.check])checkRing=ring(o.check,0xFF2A2A,.62,.12,.9);
      if(ex.hint&&ex.hint.length===2){ring(ex.hint[0],0xF2B233,.5,.07,.9);ring(ex.hint[1],0xF2B233,.5,.07,.9)}
      thinking=!!ex.thinking;setOpp(ex.opp||null);mySide=ex.botSide?(ex.botSide==="r"?"b":"r"):"r";
      if(ex.result&&ex.result!==mood){mood=ex.result;const b=ex.botSide;
        if(mood==="draw"){opp.setFace("flat",99);mate.setFace("flat",99);mate.say("和棋，不錯喔！",3)}
        else if(b&&mood===b){opp.setFace("happy",99);opp.say(ex.oppWin||"我贏了！再來一盤？",3);mate.setFace("sad",99);setTimeout(()=>mate.say("下次一定贏！",2.6),1800)}
        else if(b){opp.setFace("sad",99);opp.say(ex.oppLose||"你好厲害…",3);mate.setFace("happy",99);setTimeout(()=>mate.say("你贏了！太強了！",2.6),1500)}}
      if(!ex.result&&mood){mood=null;opp.setFace("smile");mate.setFace("smile")}}
    // ---------- 鏡頭與互動 ----------
    let yaw=0,pitch=0,tyaw=0,tpitch=0,W=1,H=1;
    const fit=()=>{W=el.clientWidth||300;H=Math.round(W*1.04);el.style.height=H+"px";rd.setSize(W,H,false);cam.aspect=W/H;
      cam.fov=clamp(2*Math.atan(Math.max(.6*.82/cam.aspect,.56))*180/PI,52,76);cam.updateProjectionMatrix()};
    const camBase=new T.Vector3(0,11.3,11.8),look=new T.Vector3(.0,-.5,-2.3);
    const placeCam=()=>{cam.position.copy(camBase);const d=look.clone().sub(camBase),r=d.length(),a0=Math.atan2(d.x,-d.z)+yaw,p0=Math.asin(d.y/r)+pitch;
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
      if(mate.B){const B=mate.B;B.torso.position.y=B.torso.userData.y0==null?(B.torso.userData.y0=B.torso.position.y):B.torso.userData.y0+.02*Math.sin(s*2.4+1);
        // 小帥坐在桌角：看棋盤、偶爾轉頭看你；你吃子或贏棋時舉手歡呼
        const look=(s%9)<1.4;let hx=look?-.05:.28,hy=look?-.5:.15+.1*Math.sin(s*.7);R(B,0,-.7,.2,-.35);R(B,1,-.7,-.2,.35);
        if(mate.face==="happy"&&(mate.faceT>0||mood)){R(B,0,-.2,0,-2.6+.3*Math.sin(s*10));R(B,1,-.2,0,2.6-.3*Math.sin(s*10));hx=-.15;hy=-.3}
        else if(mate.face==="open"&&mate.faceT>0){R(B,0,-.4,0,-1.2);R(B,1,-.4,0,1.2);hx=0}
        B.legs[0].rotation.x=-1.35+.25*Math.sin(s*2.2);B.legs[1].rotation.x=-1.35-.25*Math.sin(s*2.2);
        lerp(B.head.rotation,"x",hx);lerp(B.head.rotation,"y",hy);tick(mate)}
      rd.render(sc,cam)}
    fit();placeCam();requestAnimationFrame(frame);
    const onRs=()=>fit();window.addEventListener("resize",onRs);
    function destroy(){if(stopped)return;stopped=true;window.removeEventListener("resize",onRs);try{rd.dispose();rd.forceContextLoss()}catch(e){}el.remove();opt.onDestroy&&opt.onDestroy()}
    return{el,draw,destroy,say,oppSay:(t,d)=>opp.say(t,d),resetView(){tyaw=0;tpitch=0}}}
  window.XQPark3D={create};
})();
