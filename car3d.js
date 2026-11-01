// 車庫的 3D Q 版車子模型（用 three.js 現場組出來，不用外部模型檔）
// 每台車先依車型（轎車、休旅、跑車…）決定車身比例，再依車款加上招牌特徵（圓燈、方正車身、青蛙眼、雙腎水箱罩…）
// 不放任何廠牌標誌；只是「看得出是哪一台」的可愛示意模型
// 用法：XQCar3D.thumb(car) → Promise<圖片網址>；XQCar3D.viewer(容器, car, {drive}) → {stop}
"use strict";
(function(){
const T=window.THREE;if(!T)return;
if(T.ColorManagement)T.ColorManagement.legacyMode=false;   // 顏色碼當成一般螢幕色（不然車色會被洗白）

// ---------- 車型比例（Q 版：車身短、輪子大）。x 方向 0＝車尾、1＝車頭 ----------
// L 車長、W 車寬、r 輪徑、ride 底盤、belt 腰線、roof 車頂、hood 引擎蓋、deck 車尾高
// A 擋風玻璃底、At 擋風玻璃頂、Ct 車頂後端、Cb 後窗底、w 前後輪位置
const SHAPE={
  sedan:{L:3.5,W:1.75,r:.42,ride:.30,belt:.82,roof:1.32,hood:.80,deck:.86,A:.68,At:.53,Ct:.27,Cb:.13,w:[.19,.80]},
  hatch:{L:3.1,W:1.7,r:.42,ride:.30,belt:.82,roof:1.38,hood:.78,deck:1.18,A:.70,At:.53,Ct:.12,Cb:.03,w:[.19,.80]},
  suv:{L:3.4,W:1.85,r:.50,ride:.40,belt:1.02,roof:1.66,hood:1.00,deck:1.42,A:.72,At:.59,Ct:.09,Cb:.02,w:[.19,.80]},
  mpv:{L:3.4,W:1.8,r:.44,ride:.34,belt:.98,roof:1.80,hood:.90,deck:1.62,A:.82,At:.69,Ct:.05,Cb:.01,w:[.17,.83]},
  wagon:{L:3.6,W:1.75,r:.42,ride:.30,belt:.82,roof:1.32,hood:.78,deck:1.14,A:.69,At:.55,Ct:.07,Cb:.02,w:[.18,.81]},
  sport:{L:3.6,W:1.85,r:.44,ride:.24,belt:.70,roof:1.2,hood:.62,deck:.76,A:.62,At:.47,Ct:.26,Cb:.07,w:[.19,.80]},
  cabrio:{L:3.5,W:1.82,r:.44,ride:.24,belt:.72,roof:1.05,hood:.64,deck:.74,A:.62,At:.56,Ct:.40,Cb:.30,w:[.19,.80],open:1},
  truck:{L:3.7,W:1.85,r:.50,ride:.42,belt:1.02,roof:1.68,hood:1.00,deck:1.02,A:.74,At:.64,Ct:.44,Cb:.43,w:[.18,.80]},
  van:{L:3.4,W:1.8,r:.44,ride:.34,belt:1.00,roof:1.86,hood:.92,deck:1.80,A:.88,At:.80,Ct:.03,Cb:0,w:[.17,.83]}};

// ---------- 招牌特徵（依車款 id 比對；排前面的優先） ----------
// round 圓頭燈、frog 青蛙眼、boxy 方正、spare 車尾備胎、rack 車頂架、roof 車頂顏色、stripes 賽車條紋、wing 大尾翼、lip 小鴨尾、
// long 長車頭、wedge 楔形、grille: none/kidney/frame/big/mesh/slots/thin、pixel 像素燈、thor 雷神之鎚燈、seat1 單座、camper 露營車頂、
// cute 更短更圓、chrome 鍍鉻飾條、col 代表色（隨機挑一個）、type 改車型
const SIG=[
  [/^mini-/,{round:1,roof:"#F4F4F2",cute:1,col:["#0E4D3A","#B5121B","#F2F2EE","#2F5D8A","#E8C21A"]}],
  [/^jeep-wrangler/,{boxy:1,round:1,spare:1,grille:"slots",col:["#5E6B3A","#E8B70F","#1F2328","#B5121B","#F2F2EE"]}],
  [/g-class/,{boxy:1,round:1,spare:1,grille:"thin",chrome:1,col:["#1F2328","#B9BFC7","#5E6B3A","#F2F2EE"]}],
  [/^land-rover-defender/,{boxy:1,spare:1,rack:1,roof:"#F4F4F2",col:["#3E5A48","#C9B48A","#1F2328","#8A949E"]}],
  [/^ineos-grenadier/,{boxy:1,round:1,spare:1,rack:1,col:["#3E5A48","#1F4E8C","#C9B48A","#1F2328"]}],
  [/^suzuki-jimny/,{boxy:1,round:1,spare:1,cute:1,grille:"slots",col:["#7C8C3A","#E8C21A","#F2F2EE","#1F2328"]}],
  [/^toyota-land-cruiser/,{boxy:1,rack:1,col:["#F2F2EE","#1F2328","#8A949E","#5E6B3A"]}],
  [/^land-rover-range-rover/,{boxy:1,roof:"#1F2328",grille:"mesh",col:["#F2F2EE","#3B4A55","#1F2328","#6E2B2B"]}],
  [/^land-rover-discovery/,{boxy:1,roof:"#1F2328",col:["#F2F2EE","#3B4A55","#8A949E"]}],
  [/^porsche-911-gt3/,{frog:1,wing:1,grille:"none",col:["#F2F2EE","#E8C21A","#2F8FB5","#1F2328"]}],
  [/^porsche-911/,{frog:1,lip:1,grille:"none",col:["#F2F2EE","#E8C21A","#B9BFC7","#B5121B","#1F4E8C"]}],
  [/^porsche-718/,{frog:1,grille:"none",col:["#E8C21A","#B5121B","#F2F2EE","#2F8FB5"]}],
  [/^porsche-/,{frog:1,grille:"none",col:["#F2F2EE","#1F2328","#B9BFC7","#2F5D8A"]}],
  [/^tesla-/,{grille:"none",col:["#F2F2EE","#B5121B","#1F4E8C","#1F2328","#8A949E"]}],
  [/^ford-mustang/,{long:1,stripes:"#1F2328",col:["#E8C21A","#B5121B","#1F4E8C","#E36414"]}],
  [/^ford-ranger-raptor/,{boxy:1,big:1,grille:"slots",col:["#E36414","#1F2328","#8A949E"]}],
  [/^lamborghini-urus/,{wedge:1,grille:"none",col:["#7AB800","#E8C21A","#E36414","#1F2328"]}],
  [/^lamborghini-/,{wedge:1,grille:"none",col:["#7AB800","#E36414","#E8C21A","#7B3FBF"]}],
  [/^mclaren-/,{wedge:1,grille:"none",col:["#F28C28","#F28C28","#2F8FB5","#1F2328"]}],
  [/^ferrari-12cilindri/,{long:1,grille:"mesh",col:["#C8102E","#C8102E","#E8C21A"]}],
  [/^ferrari-/,{lip:1,grille:"mesh",col:["#C8102E","#C8102E","#C8102E","#E8C21A","#1F2328"]}],
  [/^rolls-royce-/,{boxy:1,grille:"big",chrome:1,roof:"#1F2328",col:["#F2F2EE","#3B2A55","#6E2B2B","#B9BFC7"]}],
  [/^bentley-/,{round:1,grille:"mesh",chrome:1,col:["#0E4D3A","#1F2328","#F2F2EE","#6E2B2B"]}],
  [/^aston-martin-/,{long:1,grille:"mesh",col:["#0E4D3A","#B9BFC7","#1F2328"]}],
  [/^volkswagen-id-buzz/,{roof:"#F4F4F2",band:1,cute:1,grille:"none",round:1,col:["#E8B70F","#E36414","#2F8FB5","#5BA36B"]}],
  [/^volkswagen-(california|grand-california)|^crosscamp|^sunlight/,{camper:1,col:["#F2F2EE","#B9BFC7","#2F5D8A"]}],
  [/^(toyota-alphard|lexus-lm|toyota-granvia)/,{boxy:1,grille:"big",chrome:1,col:["#1F2328","#F2F2EE"]}],
  [/^bmw-ix$|^bmw-i7|^bmw-7-series|^bmw-x7/,{grille:"kidney",big:1,chrome:1}],
  [/^bmw-m[2-5]/,{grille:"kidney",lip:1,col:["#2F8FB5","#E8C21A","#1F2328","#5BA36B"]}],
  [/^bmw-/,{grille:"kidney"}],
  [/^audi-rs/,{grille:"frame",lip:1,col:["#8A949E","#1F2328","#2F5D8A","#5BA36B"]}],
  [/^audi-/,{grille:"frame"}],
  [/^mercedes-benz-(maybach|s-class)/,{grille:"thin",chrome:1,roof:"#1F2328",col:["#F2F2EE","#B9BFC7","#3B2A55"]}],
  [/^mercedes-benz-amg-gt$|^mercedes-benz-sl$/,{long:1,grille:"slots",col:["#B9BFC7","#E8C21A","#1F2328"]}],
  [/^mercedes-benz-/,{grille:"thin"}],
  [/^volvo-/,{thor:1,grille:"thin"}],
  [/^mazda-mx-5/,{round:1,cute:1,col:["#B5121B","#B5121B","#F2F2EE","#1F4E8C"]}],
  [/^(toyota-gr86|subaru-brz)/,{lip:1,col:["#F2F2EE","#B5121B","#2F8FB5","#1F2328"]}],
  [/^toyota-gr-yaris/,{lip:1,col:["#F2F2EE","#B5121B","#1F2328"]}],
  [/^caterham-seven/,{round:1,long:1,seat1:0,cycle:1,grille:"slots",col:["#0E4D3A","#E8C21A","#B5121B"]}],
  [/^morgan-/,{round:1,long:1,cycle:1,grille:"slots",chrome:1,col:["#0E4D3A","#6E2B2B","#1F2328"]}],
  [/^ac-cobra/,{round:1,long:1,stripes:"#F2F2EE",col:["#1F4E8C","#B5121B","#F2F2EE"]}],
  [/^(ktm-x-bow|bac-mono)/,{seat1:1,wedge:1,grille:"none",type:"cabrio",col:["#E36414","#1F2328","#F2F2EE"]}],
  [/^hyundai-ioniq-5/,{pixel:1,boxy:1,grille:"none",type:"hatch",col:["#8A949E","#2F8FB5","#F2F2EE"]}],
  [/^hyundai-palisade/,{boxy:1,type:"suv"}],
  [/^kia-ev9/,{boxy:1,grille:"none",pixel:1}],
  [/^toyota-prius/,{wedge:1,grille:"none"}],
  [/^(suzuki-carry|toyota-town-ace$|cmc-j-space貨卡|mitsubishi-delica貨車|dfsk-kingcab)/,{cute:1}],
  [/^honda-prelude/,{lip:1,grille:"none",col:["#F2F2EE","#1F4E8C","#B5121B"]}],
  [/^toyota-crown/,{roof:"#1F2328",col:["#C9B48A","#B5121B","#F2F2EE","#3B4A55"]}],
  [/^maserati-/,{grille:"big",long:1,col:["#1F4E8C","#F2F2EE","#1F2328"]}],
  [/^lotus-/,{wedge:1,col:["#E8C21A","#0E4D3A","#F2F2EE"]}],
  [/^fiat-500/,{round:1,cute:1}],
];
const PAINT=["#F2F2EE","#1F2328","#B9BFC7","#6A727C","#B5121B","#1F4E8C","#2E6B4F","#D9822B","#E8C21A","#5B2A86","#7E5136","#2F8FB5","#8C1C3A","#C9B48A"];
const hash=s=>{let x=2166136261;for(const ch of String(s))x=Math.imul(x^ch.charCodeAt(0),16777619);return x>>>0};
function spec(c){
  const f={};for(const[re,o]of SIG)if(re.test(c.id)){Object.assign(f,o);break}
  const type=f.type||c.type,S={...(SHAPE[type]||SHAPE.sedan)},h=hash(c.id);
  if(c.cost>=1000&&(type==="sport"||type==="cabrio")){S.ride-=.04;S.roof-=.08;S.hood-=.06;S.L+=.2}
  else if(c.cost>=450&&type!=="truck"&&type!=="van")S.L+=.15;
  // 用 8891 的真實長、高微調比例（Q 版只取一半的差距，免得太扁或太長）
  if(c.dim){const TL={sedan:4750,hatch:4350,suv:4650,mpv:4900,wagon:4800,sport:4600,cabrio:4500,truck:5300,van:4900}[type]||4700,
      TH={sedan:1450,hatch:1480,suv:1690,mpv:1820,wagon:1470,sport:1320,cabrio:1300,truck:1830,van:1980}[type]||1500,cl=(x,a,b)=>Math.max(a,Math.min(b,x));
    const kl=cl(1+(c.dim[0]/TL-1)*.5,.86,1.14),kh=cl(1+(c.dim[2]/TH-1)*.6,.85,1.15);S.L*=kl;
    for(const k of["belt","roof","hood","deck"])S[k]=S.ride+(S[k]-S.ride)*kh}
  if(f.cute){S.L*=.88;S.r*=1.08}
  if(f.long){S.A-=.06;S.At-=.06;S.Ct-=.05;S.L+=.15}
  if(f.wedge){S.hood-=.08;S.roof-=.01;S.A-=.04;S.At-=.03}
  if(f.big)S.r*=1.12;
  const pick=f.col||(type==="sport"||type==="cabrio"?[PAINT[4],PAINT[8],PAINT[7],PAINT[5],PAINT[0],PAINT[11]]:c.cost>=800?[PAINT[1],PAINT[0],PAINT[2],PAINT[5],PAINT[13]]:PAINT);
  return{S,f,type,h,col:pick[(h>>>4)%pick.length]}}

// ---------- 材質（共用，不要每台都新建） ----------
const M={};
function mats(){if(M.glass)return M;
  M.glass=new T.MeshPhysicalMaterial({color:0x1d2a36,metalness:.1,roughness:.08,clearcoat:1,clearcoatRoughness:.05});
  M.tire=new T.MeshStandardMaterial({color:0x1b1c1f,roughness:.85});
  M.rim=new T.MeshStandardMaterial({color:0xd5d9de,metalness:.85,roughness:.25});
  M.rimDark=new T.MeshStandardMaterial({color:0x2b2e33,metalness:.6,roughness:.35});
  M.chrome=new T.MeshStandardMaterial({color:0xeef1f4,metalness:1,roughness:.12});
  M.black=new T.MeshStandardMaterial({color:0x151618,roughness:.5});
  M.trim=new T.MeshStandardMaterial({color:0x2a2c30,roughness:.6});
  M.head=new T.MeshStandardMaterial({color:0xfffbe8,emissive:0xfff2c0,emissiveIntensity:.6,roughness:.2});
  M.tail=new T.MeshStandardMaterial({color:0xd0192b,emissive:0x900010,emissiveIntensity:.5,roughness:.3});
  M.seat=new T.MeshStandardMaterial({color:0x3a2a22,roughness:.7});
  return M}
const paint=hex=>new T.MeshPhysicalMaterial({color:new T.Color(hex),metalness:.35,roughness:.32,clearcoat:1,clearcoatRoughness:.08});

// 圓角側面輪廓 → 往兩側長出厚度（有倒角，看起來圓滾滾）
function profile(pts){const s=new T.Shape(),N=pts.length;
  for(let i=0;i<N;i++){const[p,q,r]=pts[i],a=pts[(i+N-1)%N],b=pts[(i+1)%N];
    const la=Math.hypot(a[0]-p,a[1]-q)||1,lb=Math.hypot(b[0]-p,b[1]-q)||1,ra=Math.min(r||0,la/2),rb=Math.min(r||0,lb/2);
    const x1=p+(a[0]-p)/la*ra,y1=q+(a[1]-q)/la*ra,x2=p+(b[0]-p)/lb*rb,y2=q+(b[1]-q)/lb*rb;
    if(i)s.lineTo(x1,y1);else s.moveTo(x1,y1);s.quadraticCurveTo(p,q,x2,y2)}
  s.closePath();return s}
function slab(pts,depth,bevel,mat){const b=Math.min(bevel,depth/2-.01);
  const g=new T.ExtrudeGeometry(profile(pts),{depth:depth-2*b,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:4,curveSegments:8});
  g.translate(0,0,-(depth-2*b)/2);return new T.Mesh(g,mat)}
const box=(w,h,d,mat,x,y,z)=>{const m=new T.Mesh(new T.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);return m};
const cyl=(r,len,mat,seg)=>new T.Mesh(new T.CylinderGeometry(r,r,len,seg||20),mat);

// ================= 寫實車身（照真車外型一台一台調的車款） =================
// 單位：公尺。x 從車尾 0 到車頭 L，y 往上（地面 0），z 往兩側。
// 車身是「斷面」從車尾到車頭一段一段接起來：每一段是左右對稱、上緣圓角的曲線，輪拱的地方底部往上縮，留出真正的輪拱開口
function curve(pts){return x=>{if(x<=pts[0][0])return pts[0][1];const n=pts.length;if(x>=pts[n-1][0])return pts[n-1][1];
  let i=0;while(x>pts[i+1][0])i++;const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(n-1,i+2)],t=(x-p1[0])/(p2[0]-p1[0]);
  const m1=(p2[1]-p0[1])/(p2[0]-p0[0]||1)*(p2[0]-p1[0]),m2=(p3[1]-p1[1])/(p3[0]-p1[0]||1)*(p2[0]-p1[0]),t2=t*t,t3=t2*t;   // Catmull-Rom
  return(2*t3-3*t2+1)*p1[1]+(t3-2*t2+t)*m1+(-2*t3+3*t2)*p2[1]+(t3-t2)*m2}}
// 斷面：下面兩側直上，上緣是超橢圓的圓角；side(y)＝側面微微外凸
function loft(N,x0,x1,fn,M){M=M||14;const pos=[],idx=[],cols=2*M+1;
  for(let i=0;i<=N;i++){const x=x0+(x1-x0)*(1-Math.cos(Math.PI*i/N))/2,s=fn(x);   // 兩端排比較密，車頭車尾才收得圓順   // s={b,t,hwB,hwT,rc,n}
    const pts=[];const h=Math.max(0,s.t-s.b),rc=Math.min(s.rc,h*.95),ys=s.t-rc;
    for(let k=0;k<=M;k++){const v=k/M;let y,z;
      if(k<=4){const f=k/4;y=s.b+(ys-s.b)*f;z=s.hwB+(s.hwT-s.hwB)*f;if(s.bulge){const m=(f-.5)*2;z*=1+s.bulge*(1-m*m)}}
      else{const a=(k-4)/(M-4)*Math.PI/2,c=Math.cos(a),sn=Math.sin(a),e=2/s.n;z=s.hwT*Math.pow(c,e);y=ys+rc*Math.pow(sn,e)}
      pts.push([z,y])}
    for(const[z,y]of pts)pos.push(x,y,-z);for(let k=pts.length-2;k>=0;k--)pos.push(x,pts[k][1],pts[k][0])}   // 正中間那一點只放一次，不然會有一條接縫
  for(let i=0;i<N;i++)for(let j=0;j<cols-1;j++){const a=i*cols+j,b=a+cols;idx.push(a,b,a+1,a+1,b,b+1)}
  const g=new T.BufferGeometry();g.setAttribute("position",new T.Float32BufferAttribute(pos,3));g.setIndex(idx);g.computeVertexNormals();
  return g}
function realCar(c,P){const m=mats(),G=new T.Group();
  const cols=P.colors,col=cols[(hash(c.id)>>>4)%cols.length],body=paint(col);body.side=T.DoubleSide;
  const L=P.L,R=P.tire,AR=P.arch,axles=P.axles,b0=curve(P.bottom),top=curve(P.top),roof=curve(P.roof);
  // 俯視圖的寬度：中段最寬，車頭車尾用超橢圓收圓
  const hw=x=>{const W=P.W/2;let k=1;if(x<P.rearD){const d=(P.rearD-x)/P.rearD;k=Math.pow(Math.max(0,1-Math.pow(d,P.rearP)),1/P.rearP)}
    else if(x>L-P.frontD){const d=(x-(L-P.frontD))/P.frontD;k=Math.pow(Math.max(0,1-Math.pow(d,P.frontP)),1/P.frontP)}return Math.max(0,W*k)};   // 車頭車尾正中間兩側要剛好接起來，留縫會看到一條線
  // 輪拱：底線在輪子附近抬高成半圓
  const bottom=x=>{let b=b0(x);for(const ax of axles){const d=Math.abs(x-ax);if(d<AR)b=Math.max(b,R+Math.sqrt(AR*AR-d*d))}return b};
  const lower=new T.Mesh(loft(260,0,L,x=>{const w=hw(x);return{b:bottom(x),t:top(x),hwB:w*.985,hwT:w,rc:P.shoulder,n:3.2,bulge:.012}},16),body);
  G.add(lower);
  // 車廂（玻璃），往上內縮
  const cab=new T.Mesh(loft(160,P.cab[0],P.cab[1],x=>{const w=hw(x)-P.cabIn,bt=top(x)-.05,rt=Math.max(bt,roof(x));return{b:bt,t:rt,hwB:w,hwT:w*P.tumble,rc:.12,n:2.6}},14),P.glassMat?m[P.glassMat]:m.glass);
  cab.material=cab.material.clone();cab.material.side=T.DoubleSide;cab.userData.cab=true;G.add(cab);
  // 輪拱內側（黑色）、底盤
  const hwMid=P.W/2;
  for(const ax of axles){const well=new T.Mesh(new T.CylinderGeometry(AR-.005,AR-.005,hwMid*2-.06,28,1,true,Math.PI/2,Math.PI),m.black);
    well.material=m.black.clone();well.material.side=T.DoubleSide;well.rotation.x=Math.PI/2;well.position.set(ax,R,0);G.add(well)}
  const ub=new T.Mesh(new T.PlaneGeometry(L*.8,P.W*.8),m.black);ub.rotation.x=Math.PI/2;ub.position.set(L/2,.17,0);G.add(ub);
  // 輪子
  const wheels=[];
  for(const ax of axles)for(const z of[-1,1]){const wg=new T.Group();
    const tire=new T.Mesh(new T.CylinderGeometry(R,R,P.tireW,36),m.tire);tire.rotation.x=Math.PI/2;wg.add(tire);
    const side=new T.Mesh(new T.TorusGeometry(R*.82,R*.17,10,36),m.tire);side.position.z=z*P.tireW*.36;wg.add(side);
    P.wheel(wg,z,R,m);wg.position.set(ax,R,z*(P.W/2-P.tireW/2-.01));G.add(wg);wheels.push(wg)}
  // 貼在車身表面的零件（燈、後照鏡…）：從車外射一條線找到車身表面，再貼上去
  const ray=new T.Raycaster(),hitOn=(o,d,meshes)=>{ray.set(o,d);const h=ray.intersectObjects(meshes||[lower,cab],false)[0];return h};
  const stick=(mesh,o,d,off,meshes)=>{const h=hitOn(o,d,meshes);if(!h)return null;const n=h.face.normal.clone().transformDirection(h.object.matrixWorld);if(n.dot(d)>0)n.negate();   // 法線一定朝外（朝著射線來的方向）
    mesh.position.copy(h.point).addScaledVector(n,off||.004);mesh.lookAt(h.point.clone().add(n));G.add(mesh);return mesh};
  // 車身縫線：沿著一串「從車外往車身打的射線」找到表面點，連成一條細細的深色管子（鈑件之間的縫）
  const gapMat=new T.MeshStandardMaterial({color:0x2a2b2e,roughness:.7});
  const seam=(samples,r)=>{const pts=[];for(const[o,d]of samples){const h=hitOn(o,d,[lower]);if(!h)continue;const n=h.face.normal.clone();if(n.dot(d)>0)n.negate();pts.push(h.point.clone().addScaledVector(n,.0008))}
    if(pts.length<2)return;const tube=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts),Math.max(8,pts.length*3),r||.0022,5,false),gapMat);G.add(tube);return tube};
  // 側面縫線：給一串 [x,y]，從那一側水平打過來
  const sideSeam=(z,xy,r)=>seam(xy.map(([x,y])=>[new T.Vector3(x,y,z*3),new T.Vector3(0,0,-z)]),r);
  // 上面縫線：給一串 [x,z]，從上往下打
  const topSeam=(xz,r)=>seam(xz.map(([x,z])=>[new T.Vector3(x,3,z),new T.Vector3(0,-1,0)]),r);
  // 車尾面縫線：給一串 [y,z]，從車後往前打
  const rearSeam=(yz,r)=>seam(yz.map(([y,z])=>[new T.Vector3(-3,y,z),new T.Vector3(1,0,0)]),r);
  G.updateMatrixWorld(true);
  P.details({G,m,body,stick,seam,sideSeam,topSeam,rearSeam,hitOn,V:(x,y,z)=>new T.Vector3(x,y,z),T,L,hw,top,roof,col});
  G.children.forEach(o=>o.position.x-=L/2);
  G.userData.wheels=wheels;G.userData.size={L,W:P.W,H:P.H};return G}

// 畫在畫布上的貼片（標誌、字樣）
function decalMesh(w,h,draw,opt){const cv=document.createElement("canvas");cv.width=512;cv.height=Math.max(8,Math.round(512*h/w));const x=cv.getContext("2d");draw(x,cv.width,cv.height);
  const tx=new T.CanvasTexture(cv);tx.encoding=T.sRGBEncoding;tx.anisotropy=4;
  return new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:tx,transparent:true,metalness:(opt&&opt.metal)!=null?opt.metal:.9,roughness:.25,color:0xffffff,side:T.DoubleSide}))}
// Tesla 的 T 字（畫在畫布上）
function drawTee(x,W,H,color){x.fillStyle=color||"#c9ced6";x.beginPath();x.moveTo(W*.04,H*.1);x.quadraticCurveTo(W*.5,H*.02,W*.96,H*.1);x.lineTo(W*.94,H*.2);x.quadraticCurveTo(W*.62,H*.15,W*.56,H*.2);
  x.lineTo(W*.53,H*.95);x.lineTo(W*.47,H*.95);x.lineTo(W*.44,H*.2);x.quadraticCurveTo(W*.38,H*.15,W*.06,H*.2);x.closePath();x.fill()}
// 橢圓小片（燈、把手用）：薄的方向是自己的 z（貼上時朝外）
const pad=(mat,sx,sy,sz)=>{const g=new T.SphereGeometry(1,24,12);const o=new T.Mesh(g,mat);o.scale.set(sx,sy,sz||.012);return o};
const REAL={
  // Tesla Model 3（2024 Highland）：4720×1850×1441、軸距 2875；沒有水箱罩、低圓的車頭、細長頭燈、全黑玻璃車頂、短尾＋小鴨尾、C 形尾燈
  "tesla-model-3":c=>realCar(c,{L:4.72,W:1.85,H:1.441,tire:.335,tireW:.235,arch:.385,axles:[1.03,3.905],
    colors:["#E9EAEC","#9F1B22","#1F3B6E","#17181A","#5A5D61","#A8ABAF"],
    rearD:.34,rearP:2.6,frontD:.62,frontP:2.1,shoulder:.16,cab:[.46,3.66],cabIn:.075,tumble:.74,
    bottom:[[0,.36],[.18,.24],[.5,.165],[4.3,.165],[4.6,.17],[4.72,.24]],
    top:[[0,.62],[.03,.86],[.11,.975],[.3,.995],[.55,.985],[1.4,.955],[2.6,.94],[3.4,.925],[3.75,.89],[4.15,.81],[4.45,.73],[4.62,.66],[4.72,.52]],
    roof:[[.46,.98],[.75,1.11],[1.15,1.28],[1.65,1.40],[2.2,1.441],[2.7,1.43],[3.05,1.335],[3.35,1.16],[3.66,.92]],
    wheel(wg,z,R,m){// 18 吋 Photon 鋁圈：石墨灰底、五組雙輻、中心蓋 T 字；後面看得到碟盤和卡鉗
      const gm=new T.MeshStandardMaterial({color:0x2c2f34,metalness:.75,roughness:.32}),sm=new T.MeshStandardMaterial({color:0xa3a9b0,metalness:.85,roughness:.25});
      const rim=new T.Mesh(new T.CylinderGeometry(R*.68,R*.68,.24,40),m.rimDark);rim.rotation.x=Math.PI/2;wg.add(rim);
      const lip=new T.Mesh(new T.TorusGeometry(R*.665,.008,8,48),sm);lip.position.z=z*.118;wg.add(lip);
      const disc=new T.Mesh(new T.CylinderGeometry(R*.52,R*.52,.02,32),new T.MeshStandardMaterial({color:0x8d9196,metalness:.9,roughness:.45}));disc.rotation.x=Math.PI/2;disc.position.z=z*.05;wg.add(disc);
      const cal=new T.Mesh(new T.BoxGeometry(.11,.07,.05),new T.MeshStandardMaterial({color:0x4a4e54,metalness:.4,roughness:.5}));cal.position.set(-R*.32,R*.25,z*.07);cal.rotation.z=.6;wg.add(cal);
      const face=new T.Mesh(new T.RingGeometry(R*.5,R*.66,40),gm);face.position.z=z*.116;if(z<0)face.rotation.y=Math.PI;wg.add(face);
      for(let k=0;k<5;k++)for(const s of[-1,1]){const a=k/5*Math.PI*2+s*.13,sp=new T.Mesh(new T.BoxGeometry(R*.44,.034,.016),sm);
        sp.position.set(Math.cos(a)*R*.38,Math.sin(a)*R*.38,z*.122);sp.rotation.z=a+s*.06;wg.add(sp)}
      const hubM=new T.Mesh(new T.CylinderGeometry(R*.16,R*.16,.25,24),gm);hubM.rotation.x=Math.PI/2;wg.add(hubM);
      for(let k=0;k<5;k++){const a=k/5*Math.PI*2+.3,nut=new T.Mesh(new T.CylinderGeometry(.009,.009,.02,8),sm);nut.rotation.x=Math.PI/2;nut.position.set(Math.cos(a)*R*.125,Math.sin(a)*R*.125,z*.128);wg.add(nut)}
      const cap=decalMesh(R*.16,R*.16,(x,W,H)=>{x.fillStyle="#15171a";x.beginPath();x.arc(W/2,H/2,W/2,0,7);x.fill();x.save();x.translate(W*.22,H*.22);drawTee(x,W*.56,H*.56,"#c9ced6");x.restore()},{metal:.3});
      cap.position.z=z*.131;if(z<0)cap.rotation.y=Math.PI;wg.add(cap)},
    details({G,m,body,stick,sideSeam,topSeam,rearSeam,hitOn,V,T,hw,top}){
      const dark=new T.MeshStandardMaterial({color:0x101114,roughness:.3});
      const piano=new T.MeshPhysicalMaterial({color:0x0b0c0e,metalness:.3,roughness:.06,clearcoat:1});
      const lens=new T.MeshPhysicalMaterial({color:0x2b3038,metalness:.2,roughness:.08,clearcoat:1});
      const drl=new T.MeshStandardMaterial({color:0xffffff,emissive:0xe8f0ff,emissiveIntensity:1.4,roughness:.2});
      const tail=new T.MeshStandardMaterial({color:0xb0101e,emissive:0x8a0010,emissiveIntensity:.45,roughness:.25});
      const smoke=new T.MeshPhysicalMaterial({color:0x3a0d10,metalness:.1,roughness:.1,clearcoat:1});
      const refl=new T.MeshStandardMaterial({color:0x7a0a12,roughness:.4});
      // ---- 鈑件縫線 ----
      // 引擎蓋：沿兩側葉子板上緣往前，再沿車頭上緣彎過去
      const hood=[];for(let x=3.64;x<=4.42;x+=.04)hood.push([x,.715]);for(let i=0;i<=20;i++){const t=i/20,zz=.715*(1-2*t),xx=4.42+.12*(1-Math.pow(zz/.715,2));hood.push([xx,zz])}for(let x=4.42;x>=3.64;x-=.04)hood.push([x,-.715]);
      topSeam(hood);
      // 後車廂蓋：後窗下緣橫過去、兩側往後，再沿車尾面往下、橫過去
      const trunk=[];for(let x=.12;x<=.52;x+=.04)trunk.push([x,.70]);for(let i=0;i<=16;i++){const zz=.70-1.4*i/16;trunk.push([.52+.01*(1-Math.pow(zz/.7,2)),zz])}for(let x=.52;x>=.12;x-=.04)trunk.push([x,-.70]);
      topSeam(trunk);
      for(const z of[-1,1])rearSeam([[.96,z*.64],[.88,z*.63],[.78,z*.62],[.68,z*.61]]);
      rearSeam(Array.from({length:17},(_,i)=>[.665,.61-1.22*i/16]));
      for(const z of[-1,1]){
        // 前門前緣（前輪後面）、前後門分界（B 柱下）、後門後緣（繞過後輪拱上方）、車門下緣
        sideSeam(z,[[3.44,.93],[3.47,.80],[3.46,.62],[3.42,.45],[3.36,.30]]);
        sideSeam(z,[[2.43,.93],[2.44,.62],[2.43,.30]]);
        sideSeam(z,[[1.66,.93],[1.64,.82],[1.58,.75],[1.51,.70],[1.48,.60],[1.49,.46],[1.51,.30]]);
        sideSeam(z,Array.from({length:20},(_,i)=>[1.51+(3.36-1.51)*i/19,.30]));
        // ---- 頭燈：煙燻燈殼＋上緣日行燈＋投射燈 ----
        stick(pad(lens,.2,.034,.008),V(6,.66,z*.6),V(-1,-.15,0),.003);
        stick(pad(drl,.185,.0075,.006),V(6,.676,z*.6),V(-1,-.15,0),.012);
        stick(pad(drl,.028,.02,.008),V(6,.656,z*.5),V(-1,-.15,0),.012);
        // 前保桿兩側的小進氣口
        stick(pad(dark,.13,.022),V(6,.28,z*.45),V(-1,0,0),.003);
        // ---- C 形尾燈：煙燻燈殼裡一條橫的亮紅＋外側往下一段 ----
        stick(pad(smoke,.27,.04,.004),V(-3,.865,z*.56),V(1,0,0),.002);
        stick(pad(tail,.25,.016,.004),V(-3,.875,z*.55),V(1,0,0),.006);
        stick(pad(tail,.022,.045,.004),V(-3,.82,z*.71),V(1,0,0),.006);
        // 後保桿下方的反光片
        stick(pad(refl,.07,.012,.004),V(-3,.36,z*.62),V(1,0,0),.003);
        // ---- 水滴形後照鏡：外側圓、往車身收窄；背面是鏡片；下面黑色底座 ----
        const mg=new T.SphereGeometry(1,28,16),pa=mg.attributes.position;
        for(let i=0;i<pa.count;i++){const lz=pa.getZ(i),k=lz<0?1+.5*lz:1;pa.setXYZ(i,pa.getX(i)*k,pa.getY(i)*k,lz)}mg.computeVertexNormals();
        const mir=new T.Mesh(mg,body);mir.scale.set(.055,.05,.11);if(z<0)mir.rotation.y=Math.PI;mir.position.set(3.29,1.0,z*.985);G.add(mir);
        const glass=new T.Mesh(new T.SphereGeometry(1,20,12),new T.MeshStandardMaterial({color:0x9fb0bf,metalness:1,roughness:.05}));glass.scale.set(.006,.038,.085);glass.position.set(3.237,1.0,z*1.0);G.add(glass);
        const base=new T.Mesh(new T.BoxGeometry(.09,.035,.07),piano);base.position.set(3.33,.975,z*.9);G.add(base);
        // 前葉子板的側邊攝影鏡頭（前輪後上方）
        stick(pad(piano,.026,.016,.006),V(3.6,.8,z*3),V(0,0,-z),.003);
        // ---- 平貼式門把 ----
        for(const x of[2.93,1.93]){stick(pad(dark,.135,.026,.004),V(x,.835,z*3),V(0,0,-z),.0015);
          stick(pad(body,.127,.019,.004),V(x,.835,z*3),V(0,0,-z),.004);
          stick(pad(dark,.022,.014,.004),V(x+.088,.835,z*3),V(0,0,-z),.006)}
        // ---- 車窗：腰線黑色飾條、B 柱鋼琴黑 ----
        const belt=[];for(let x=.55;x<=3.36;x+=.05){const w=hw(x)-.075;belt.push(new T.Vector3(x,top(x)-.012,z*(w+.004)))}
        G.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(belt),80,.007,6,false),piano));
        const cabM=G.children.find(o=>o.userData.cab),bp=[];for(let y=top(2.47)-.02;y<=1.38;y+=.04){const h=hitOn(V(2.47,y,z*3),V(0,0,-z),[cabM]);if(h)bp.push(h.point.clone().add(V(0,0,z*.004)))}
        if(bp.length>1)G.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(bp),24,.026,4,false),piano));   // B 柱：沿玻璃側面的一條鋼琴黑寬條
      }
      // 左後的充電口蓋（駕駛側後方、尾燈前面）
      sideSeam(-1,[[.30,.82],[.42,.82],[.43,.84],[.43,.89],[.42,.91],[.30,.91],[.29,.89],[.29,.84],[.30,.82]],.0018);
      // 車頭 T 字、車尾 TESLA 字樣
      stick(decalMesh(.075,.075,(x,W,H)=>drawTee(x,W,H)),V(6,.6,0),V(-1,0,0),.004);
      stick(decalMesh(.42,.045,(x,W,H)=>{x.fillStyle="#bfc4cc";x.font="700 "+Math.round(H*.95)+"px Arial";x.textAlign="center";x.textBaseline="middle";if("letterSpacing" in x)x.letterSpacing=Math.round(W*.04)+"px";x.fillText("TESLA",W/2,H*.55)}),V(-3,.78,0),V(1,0,0),.004);
      // 下巴細長黑飾板、車尾黑色下擾流
      stick(pad(dark,.62,.05,.006),V(-3,.27,0),V(1,0,0),.003)}})
};

function build(c){
  // 寫實版還在試做：只有開了預覽（localStorage xq_carReal）才用
  let rv=false;try{rv=!!localStorage.getItem("xq_carReal")}catch(e){}
  if(REAL[c.id]&&rv)return REAL[c.id](c);
  const{S,f,type,h,col}=spec(c),m=mats(),G=new T.Group(),body=paint(col),roofMat=f.roof?paint(f.roof):body;
  const L=S.L,W=S.W,X=t=>t*L-L/2,bv=f.boxy?.07:.16;
  // 車身下半部
  const lower=[[X(0)+.06,S.ride,.08],[X(0),f.boxy?S.deck:S.deck-.04,f.boxy?.1:.22]];
  if(S.open||type==="truck")lower.push([X(S.Cb),S.deck,.06],[X(S.A),S.belt,.1]);
  else lower.push([X(S.Cb+.02),Math.min(S.deck,S.belt+.06),.12],[X(S.A),S.belt+.02,.15]);
  lower.push([X(1),S.hood-(f.boxy?.02:.1),f.boxy?.1:.3],[X(1)+(f.boxy?0:.02),S.ride+.1,.12],[X(1)-.08,S.ride,.06]);
  G.add(slab(lower,W,bv,body));
  // 掀背／休旅：車尾上半部（後窗以下）也是車身
  // 車廂：玻璃＋車頂
  if(!S.open){const by=S.belt-.02,ty=S.roof-.08,inset=f.boxy?.03:.08;
    const cab=[[X(S.Cb)+.02,by,.04],[X(S.Ct)+inset,ty,f.boxy?.06:.18],[X(S.At)-inset*.5,ty,f.boxy?.06:.14],[X(S.A),by,.04]];
    G.add(slab(cab,W*(f.boxy?.94:.86),f.boxy?.05:.09,m.glass));
    const rf=[[X(S.Ct)+inset-.03,ty-.05,.05],[X(S.Ct)+inset+.03,S.roof,.14],[X(S.At)-inset*.5,S.roof,.12],[X(S.At)-inset*.5+.07,ty-.05,.05]];
    G.add(slab(rf,W*(f.boxy?.96:.9),f.boxy?.05:.1,roofMat));
    // B 柱、C 柱（車身色）
    const pil=[(S.A+S.Ct)/2];if(type==="mpv"||type==="van"||type==="suv"||type==="wagon")pil.push(S.Ct+(S.A-S.Ct)*.2);
    for(const t of pil){const pm=box(.1,ty-by,W*(f.boxy?.95:.87)+.02,f.band?roofMat:roofMat===body?body:roofMat,X(t),(by+ty)/2,0);G.add(pm)}
    if(f.band)G.add(box(L*.98,.12,W+.02,roofMat,0,S.belt-.02,0));   // ID. Buzz：上白下彩的分界
    if(f.rack){for(const z of[-1,1])G.add(box((S.At-S.Ct)*L*.9,.05,.05,m.black,X((S.At+S.Ct)/2),S.roof+.09,z*W*.38));
      for(let i=0;i<4;i++)G.add(box(.04,.05,W*.78,m.black,X(S.Ct+(S.At-S.Ct)*(.1+i*.27)),S.roof+.09,0))}
    if(f.camper)G.add(slab([[X(S.Ct)+.05,S.roof-.02,.04],[X(S.Ct)+.05,S.roof+.42,.12],[X(S.At)-.25,S.roof+.42,.12],[X(S.At)+.05,S.roof-.02,.04]],W*.9,.06,paint("#F4F4F2")))}
  else{// 敞篷：擋風玻璃＋座椅
    if(!f.seat1){const ws=box(.05,.34,W*.8,m.glass,X(S.A)-.08,S.belt+.15,0);ws.rotation.z=.55;G.add(ws)}
    const seats=f.seat1?[0]:[-.22,.22];
    for(const z of seats){G.add(box(.34,.08,.34,m.seat,X(S.Cb+.14),S.belt+.04,z*W));G.add(box(.08,.36,.32,m.seat,X(S.Cb+.04),S.belt+.2,z*W))}
    if(f.seat1)G.add(box(.05,.2,.5,m.glass,X(S.Cb+.3),S.belt+.12,0))}
  // 貨卡車斗
  if(type==="truck")G.add(box(L*S.Cb-.15,.04,W*.8,m.trim,X(S.Cb/2)+.02,S.deck+.005,0));
  // 輪子
  const tw=.3,rr=S.r,wz=W/2-tw/2+.05,dark=type==="sport"&&(h>>>12)%2,sp=[5,6,10,7][(h>>>9)%4],wheels=[];
  for(const t of S.w)for(const z of[-1,1]){const wg=new T.Group();
    const tire=cyl(rr,tw,m.tire,28);tire.rotation.x=Math.PI/2;wg.add(tire);
    const rim=cyl(rr*.62,tw+.02,dark?m.rimDark:m.rim,24);rim.rotation.x=Math.PI/2;wg.add(rim);
    for(let k=0;k<sp;k++){const s=box(rr*.95,sp>7?.04:.07,.03,dark?m.rim:m.rimDark,0,0,z*(tw/2+.012));s.rotation.z=k/sp*Math.PI;wg.add(s)}
    const hub=cyl(rr*.14,tw+.05,m.chrome,12);hub.rotation.x=Math.PI/2;wg.add(hub);
    wg.position.set(X(t),rr,z*wz);G.add(wg);wheels.push(wg);
    if(f.cycle){const fe=slab([[-rr-.05,0,.02],[-rr*.8,rr*.7,.2],[rr*.8,rr*.7,.2],[rr+.05,0,.02]],tw+.08,.03,body);fe.position.set(X(t),rr+.02,z*(wz+.02));G.add(fe)}}
  // 車頭：燈、水箱罩
  const ex=bv,fx=X(1)+ex+(f.boxy?.0:-.03);   // 倒角讓車身往外長了 ex，燈和水箱罩要貼在真正的表面上
  for(const z of[-1,1]){
    if(f.frog){const e=new T.Mesh(new T.SphereGeometry(.17,20,14),m.head);e.scale.set(1.1,.85,1);e.position.set(X(.9),S.hood-.1+ex,z*W*.32);G.add(e)}
    else if(f.round){const l=cyl(.15,.08,m.head,24);l.rotation.z=Math.PI/2;l.position.set(fx+.01,S.hood-.16,z*W*.32);G.add(l);
      const ring=new T.Mesh(new T.TorusGeometry(.15,.025,8,24),m.chrome);ring.rotation.y=Math.PI/2;ring.position.set(fx+.04,S.hood-.16,z*W*.32);G.add(ring)}
    else if(f.pixel){for(let i=0;i<4;i++)G.add(box(.04,.06,.06,m.head,fx,S.hood-.14,z*(W*.24+i*.08)))}
    else{const l=box(.06,.09,W*.24,m.head,fx,S.hood-.13,z*W*.3);G.add(l);if(f.thor)G.add(box(.07,.02,W*.2,m.chrome,fx+.01,S.hood-.13,z*W*.3))}
    // 尾燈
    G.add(box(.05,.1,W*.22,m.tail,X(0)-ex+.02,Math.max(S.belt,S.deck)-.18,z*W*.33))}
  const g=f.grille||"",gy=S.hood-.3;
  if(g==="kidney")for(const z of[-1,1])G.add(slab([[-.1,0,.04],[-.1,.26,.07],[.1,.26,.07],[.1,0,.04]],.03,0,m.trim).translateX(fx).translateY(gy-.02).translateZ(z*.13).rotateY(Math.PI/2));
  else if(g==="frame")G.add(box(.05,.32,W*.42,m.trim,fx,gy,0));
  else if(g==="big"){G.add(box(.06,.46,W*.46,m.chrome,fx,gy+.04,0));for(let i=0;i<7;i++)G.add(box(.07,.4,.02,m.trim,fx+.005,gy+.04,(i-3)*W*.06))}
  else if(g==="mesh"){G.add(box(.05,.22,W*.5,m.trim,fx,gy,0));G.add(box(.055,.24,W*.52,m.chrome,fx-.005,gy,0))}
  else if(g==="slots")for(let i=0;i<7;i++)G.add(box(.05,.26,.05,m.black,fx,gy+.02,(i-3)*.1));
  else if(g==="thin")G.add(box(.05,.14,W*.5,m.trim,fx,gy+.06,0));
  else if(g!=="none")G.add(box(.05,.12,W*.46,m.trim,fx,gy,0));
  if(f.chrome)G.add(box(L*.8,.03,W+.01,m.chrome,0,S.ride+.2,0));
  // 後照鏡
  if(!S.open)for(const z of[-1,1])G.add(box(.14,.1,.12,body,X(S.A)-.05,S.belt+.1,z*(W/2+.04)));
  // 備胎、尾翼、鴨尾、賽車條紋
  if(f.spare){const sp2=cyl(.32,.18,m.tire,24);sp2.rotation.z=Math.PI/2;sp2.position.set(X(0)-ex-.08,(S.belt+S.ride)/2+.25,0);G.add(sp2);
    const cv=cyl(.24,.2,body,24);cv.rotation.z=Math.PI/2;cv.position.copy(sp2.position).x-=.02;G.add(cv)}
  if(f.wing){for(const z of[-1,1])G.add(box(.05,.26,.05,m.black,X(.05),S.deck+.12,z*W*.28));G.add(box(.34,.04,W*.92,m.black,X(.04),S.deck+.26,0))}
  if(f.lip)G.add(box(.16,.05,W*.86,body,X(.02),S.deck+.02,0));
  if(f.stripes){const sm=paint(f.stripes);for(const z of[-1,1]){
    {const st=box(L*(1-S.A)+.1,.012,.14,sm,X((1+S.A)/2),(S.belt+.02+S.hood-.1)/2+ex+.01,z*.14);st.rotation.z=Math.atan2((S.hood-.1)-(S.belt+.02),L*(1-S.A));G.add(st)}
    if(!S.open)G.add(box((S.At-S.Ct)*L,.012,.14,sm,X((S.At+S.Ct)/2),S.roof+.008,z*.14))}}
  // 整台車置中、底部貼地
  G.userData.wheels=wheels;G.userData.size={L,W,H:Math.max(S.roof,S.belt)+(f.camper?.42:0)};return G}

// ---------- 場景：柔光＋反射環境、地面影子、展示轉盤 ----------
const envs=new WeakMap();
function env(renderer){if(envs.has(renderer))return envs.get(renderer);
  const s=new T.Scene(),geo=new T.BoxGeometry(30,30,30);
  const cols=[],pos=geo.attributes.position;for(let i=0;i<pos.count;i++){const y=pos.getY(i);const t=(y+15)/30;cols.push(.25+.75*t,.24+.74*t,.22+.72*t)}
  geo.setAttribute("color",new T.Float32BufferAttribute(cols,3));
  s.add(new T.Mesh(geo,new T.MeshBasicMaterial({vertexColors:true,side:T.BackSide})));
  const panel=(x,y,z,w,hh)=>{const p=new T.Mesh(new T.PlaneGeometry(w,hh),new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide}));p.position.set(x,y,z);p.lookAt(0,0,0);s.add(p)};
  panel(0,14,0,14,14);panel(13,6,6,6,10);panel(-13,5,-6,6,8);
  const pm=new T.PMREMGenerator(renderer),tex=pm.fromScene(s,.02).texture;pm.dispose();s.traverse(x=>{if(x.geometry)x.geometry.dispose();if(x.material)x.material.dispose()});envs.set(renderer,tex);return tex}
let shadowTex=null;
function shadow(L,W){if(!shadowTex){const cv=document.createElement("canvas");cv.width=cv.height=128;const x=cv.getContext("2d"),g=x.createRadialGradient(64,64,4,64,64,64);
    g.addColorStop(0,"rgba(0,0,0,.55)");g.addColorStop(.6,"rgba(0,0,0,.22)");g.addColorStop(1,"rgba(0,0,0,0)");x.fillStyle=g;x.fillRect(0,0,128,128);shadowTex=new T.CanvasTexture(cv)}
  const m=new T.Mesh(new T.PlaneGeometry(L*1.25,W*1.7),new T.MeshBasicMaterial({map:shadowTex,transparent:true,depthWrite:false}));m.rotation.x=-Math.PI/2;m.position.y=.005;return m}
function stage(renderer,car,o){
  const sc=new T.Scene();sc.environment=env(renderer);
  sc.add(new T.HemisphereLight(0xffffff,0x9a8b78,.45));
  const d=new T.DirectionalLight(0xffffff,1.1);d.position.set(4,7,5);sc.add(d);
  const d2=new T.DirectionalLight(0xfff0e0,.35);d2.position.set(-5,3,-4);sc.add(d2);
  const g=build(car),{L,W,H}=g.userData.size,turn=new T.Group();turn.add(g);turn.add(shadow(L,W));
  if(o.disc){const disc=cyl(L*.6,.08,new T.MeshStandardMaterial({color:0xd9cdb8,roughness:.6,metalness:.1}),48);disc.position.y=-.045;turn.add(disc)}
  sc.add(turn);
  const cam=new T.PerspectiveCamera(o.fov||26,o.aspect||1.6,.1,100),D=Math.max(L,H*1.6)*(o.dist||1.9);
  cam.position.set(D*.82,D*.42,D*.92);cam.lookAt(0,H*.42,0);
  return{sc,cam,turn,car:g}}

// ---------- 縮圖：共用一個隱藏的畫布，一台一台拍照 ----------
let TR=null;const cache=new Map(),queue=[];let busy=false;
function thumbRenderer(){if(TR)return TR;const cv=document.createElement("canvas");
  TR=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true,preserveDrawingBuffer:true});TR.setPixelRatio(1);TR.setSize(400,250,false);
  TR.outputEncoding=T.sRGBEncoding;TR.toneMapping=T.ACESFilmicToneMapping;TR.toneMappingExposure=.95;return TR}
function dispose(o){o.traverse(x=>{if(x.geometry)x.geometry.dispose();if(x.material&&!Object.values(M).includes(x.material)){if(x.material.map&&x.material.map!==shadowTex)x.material.map.dispose();x.material.dispose()}})}
function thumb(car){if(cache.has(car.id))return Promise.resolve(cache.get(car.id));
  return new Promise((ok,no)=>{queue.push({car,ok,no});pump()})}
function pump(){if(busy||!queue.length)return;busy=true;
  const{car,ok,no}=queue.shift();
  try{const r=thumbRenderer(),s=stage(r,car,{aspect:1.6,dist:1.75});s.turn.rotation.y=-.15;r.setClearColor(0,0);r.render(s.sc,s.cam);
    const url=r.domElement.toDataURL("image/png");dispose(s.sc);cache.set(car.id,url);ok(url)}catch(e){no(e)}
  busy=false;(window.requestIdleCallback||setTimeout)(pump,0)}

// ---------- 可以用手指轉的展示台 ----------
function viewer(box,car,o){o=o||{};
  const cv=document.createElement("canvas");cv.className="car3d";box.innerHTML="";box.append(cv);
  const r=new T.WebGLRenderer({canvas:cv,antialias:true,alpha:true});r.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=.95;
  const size=()=>{const w=box.clientWidth||320,h=Math.round(w/1.45);r.setSize(w,h,false);cv.style.width=w+"px";cv.style.height=h+"px";return w/h};
  const s=stage(r,car,{aspect:size(),disc:true,dist:1.45});
  let rot=-.5,vel=0,drag=null,drive=o.drive?1:0,t0=performance.now(),run=true,idle=0,elev=.42,zoom=1;
  const{H}=s.car.userData.size,D0=s.cam.position.length(),aim=new T.Vector3(0,H*.36,0);
  const place=()=>{const d=D0*zoom,ce=Math.cos(elev);s.cam.position.set(d*ce*.66,d*Math.sin(elev)+.05,d*ce*.75);s.cam.lookAt(aim)};place();
  const pts=new Map();let pinch=null;
  cv.addEventListener("pointerdown",e=>{pts.set(e.pointerId,{x:e.clientX,y:e.clientY});cv.setPointerCapture(e.pointerId);vel=0;idle=0;
    if(pts.size===2){const[a,b]=[...pts.values()];pinch={d:Math.hypot(a.x-b.x,a.y-b.y),z:zoom};drag=null}else drag={x:e.clientX,y:e.clientY,r:rot,e:elev}});
  cv.addEventListener("pointermove",e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});idle=0;
    if(pinch&&pts.size===2){const[a,b]=[...pts.values()];zoom=Math.max(.55,Math.min(1.6,pinch.z*pinch.d/Math.max(20,Math.hypot(a.x-b.x,a.y-b.y))));place();return}
    if(!drag)return;const nr=drag.r+(e.clientX-drag.x)*.012;vel=nr-rot;rot=nr;elev=Math.max(.02,Math.min(1.45,drag.e+(e.clientY-drag.y)*.008));place()});
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=null;if(!pts.size)drag=null};cv.addEventListener("pointerup",up);cv.addEventListener("pointercancel",up);
  cv.addEventListener("wheel",e=>{e.preventDefault();zoom=Math.max(.55,Math.min(1.6,zoom*(e.deltaY>0?1.08:.93)));place()},{passive:false});
  cv.style.touchAction="none";
  function frame(now){if(!run)return;if(!cv.isConnected)return stop();
    const dt=Math.min(.05,(now-t0)/1000);t0=now;
    if(drive>0){drive=Math.max(0,drive-dt/1.3);const e=drive*drive;s.turn.position.x=-e*9;for(const w of s.car.userData.wheels)w.rotation.z-=dt*14*(.3+drive)}
    if(!drag){idle+=dt;if(Math.abs(vel)>.0005){rot+=vel;vel*=.94}else if(idle>1.2)rot+=dt*.45}
    s.turn.rotation.y=rot;r.render(s.sc,s.cam);requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  function stop(){if(!run)return;run=false;dispose(s.sc);const et=envs.get(r);if(et)et.dispose();r.dispose();try{r.forceContextLoss()}catch(e){}}
  return{stop}}

window.XQCar3D={thumb,viewer,build};
})();
