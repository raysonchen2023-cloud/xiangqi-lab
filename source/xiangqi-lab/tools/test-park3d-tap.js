// 3D 園子棋盤點選吸附＋手機預設視角的單元測試（11/11，AI 模擬玩家第二輪問題 5）。不開瀏覽器、不載 three.js：
//   1. 從 src/park3d.js 照 TAPSNAP 標記抽出純函式（tapSnap／inBox／boardMeas／fitZoom）
//   2. 用純數學複製 park3d 的鏡頭（placeCam 在沒轉身時的算法、fit() 的視角），算 390×844 手機上的格距
//   3. 模擬手指點選：新算法（畫面距離吸附）對照舊算法（射線先打棋子圓柱、再打棋盤面四捨五入）
// 用法：node tools/test-park3d-tap.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const SRC=fs.readFileSync(path.join(__dirname,"../src/park3d.js"),"utf8");
const m=SRC.match(/\/\*TAPSNAP\{[\s\S]*?\/\*\}TAPSNAP\*\//);
if(!m)throw new Error("park3d.js 找不到 TAPSNAP 區塊");
const {tapSnap,inBox,boardMeas,fitZoom}=new Function(m[0]+";return{tapSnap,inBox,boardMeas,fitZoom}")();

// ---------- 鏡頭（照 park3d：camBase [0,27,26]、look [0,-.3,-.4]、PIV [0,-.3,0]、ht .24、fov 夾在 38～62 度） ----------
const BW=10.4,BH=11.4,TOP=.56,PH=.27,PR=.485;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l)};
function view(Wpx,VH){   // fit()：畫面寬 W（el.clientWidth）、高 H＝W×hr
  const ht=.24,hr=Math.min(1.32,Math.max(1.14,(VH-300)/Wpx)),H=Math.round(Wpx*hr),vr=Math.max(hr,1.14);
  const dp=Math.atan(ht*1.14)-Math.atan(ht*vr),fov=Math.min(62,Math.max(38,2*Math.atan(ht*vr)*180/Math.PI));
  return{W:Wpx,H,dp,tanV:Math.tan(fov/2*Math.PI/180),asp:Wpx/H}}
function camera(V,pitch,zoom){   // placeCam()（yaw＝0）
  const PIV=[0,-.3,0],off=sub([0,27,26],PIV),lk=sub([0,-.3,-.4],PIV),el0=Math.atan2(off[1],Math.hypot(off[0],off[2]));
  const low=Math.min(1,Math.max(0,-pitch/.7)),el=Math.min(1.5,Math.max(.1,el0+pitch)),R=Math.min(Math.hypot(...off)*zoom,330);lk[1]+=4.5*low;
  const pos=[0,PIV[1]+Math.sin(el)*R,PIV[2]+Math.cos(el)*R],tgt=[lk[0],PIV[1]+lk[1],PIV[2]+lk[2]];
  const Z=nrm(sub(pos,tgt)),X=nrm(cross([0,1,0],Z)),Y=cross(Z,X),c=Math.cos(V.dp),s=Math.sin(V.dp);
  const Y2=Y.map((v,k)=>c*v+s*Z[k]),Z2=Z.map((v,k)=>-s*Y[k]+c*v);
  const prj=(x,y,z)=>{const d=sub([x,y,z],pos),xc=dot(d,X),yc=dot(d,Y2),zc=dot(d,Z2);return[((xc/-zc)/(V.tanV*V.asp)+1)/2*V.W,(1-(yc/-zc)/V.tanV)/2*V.H]};
  const rayAt=(px,py)=>{const nx=px/V.W*2-1,ny=1-py/V.H*2;return{o:pos,d:nrm([0,1,2].map(k=>X[k]*nx*V.tanV*V.asp+Y2[k]*ny*V.tanV-Z2[k]))}};
  return{prj,rayAt}}
const pos=i=>[i%9-4,(i/9|0)-4.5];   // 紅方在下（flip＝false）
const G={bw:BW,bh:BH,top:TOP,ph:PH};

// ---------- 開局盤面 ----------
const START=(()=>{const b=Array(90).fill(null),put=(r,s)=>[...s].forEach((p,c)=>{if(p!==".")b[r*9+c]=p});
  put(0,"rnbakabnr");put(2,".c.....c.");put(3,"p.p.p.p.p");put(6,"P.P.P.P.P");put(7,".C.....C.");put(9,"RNBAKABNR");return b})();
const sideOf=p=>p===p.toUpperCase()?"r":"b",sq=(c,r)=>r*9+c;

// park3d pick() 的新算法：90 個交叉點投影到畫面（有子的取棋子頂面），交給 tapSnap
function points(cam,B,sel,targets,me){const tg=new Set(targets||[]),P=[];
  for(let i=0;i<90;i++){const[x,z]=pos(i),y=B[i]?TOP+(i===sel?.32:0)+PH:TOP,q=cam.prj(x,y,z),qx=cam.prj(x+1,y,z),qz=cam.prj(x,y,z+1);
    const own=!!B[i]&&sideOf(B[i])===(me||"r"),t=sel>=0&&tg.has(i);
    P.push({i,x:q[0],y:q[1],s:Math.max(4,Math.min(Math.hypot(qx[0]-q[0],qx[1]-q[1]),Math.hypot(qz[0]-q[0],qz[1]-q[1]))),occ:!!B[i],c:own||t,w:t?.9:1})}
  return P}
const snapAt=(cam,B,x,y,sel=-1,targets=[])=>tapSnap(points(cam,B,sel,targets),x,y,{r:28});
// 舊算法：射線先打棋子圓柱（半徑 .485、高 .27），沒打到再打棋盤面（高度 TOP），四捨五入到最近交叉點（容許 .48）
function oldPick(cam,B,px,py){const{o,d}=cam.rayAt(px,py);
  for(let t=0;t<80;t+=.004){const p=[o[0]+d[0]*t,o[1]+d[1]*t,o[2]+d[2]*t];if(p[1]<TOP-.01)break;if(p[1]>TOP+PH)continue;
    for(let i=0;i<90;i++)if(B[i]){const[x,z]=pos(i);if(Math.hypot(p[0]-x,p[2]-z)<=PR)return i}}
  if(Math.abs(d[1])<1e-9)return -1;const t=(TOP-o[1])/d[1];if(t<0)return -1;const hx=o[0]+d[0]*t,hz=o[2]+d[2]*t,c=Math.round(hx+4),r=Math.round(hz+4.5);
  if(Math.abs(hx+4-c)>.48||Math.abs(hz+4.5-r)>.48||c<0||c>8||r<0||r>9)return -1;return r*9+c}
function spacing(cam){const y=TOP+PH,row=r=>[0,8].map(c=>cam.prj(c-4,y,r-4.5)),col=r=>{const[a,b]=row(r);return(b[0]-a[0])/8};
  const a0=cam.prj(-4,y,-4.5),a1=cam.prj(-4,y,-3.5),a8=cam.prj(-4,y,3.5),a9=cam.prj(-4,y,4.5);
  return{colFar:col(0),colNear:col(9),rowFar:a1[1]-a0[1],rowNear:a9[1]-a8[1]}}
// 固定亂數（可重現）＋常態分布的手指誤差
const rng=(s=>()=>{s=(s*1103515245+12345)%2147483648;return s/2147483648})(20261111);
const gauss=()=>{let u=0,v=0;while(!u)u=rng();while(!v)v=rng();return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v)};

const PHONE=view(390-16,844);   // 390×844：棋盤框左右各留 8px（截圖量到畫面 374×494）
const Z0=fitZoom(z=>boardMeas(camera(PHONE,.5,z).prj,PHONE.W,PHONE.H,G),.45,1,30);
const OLD=camera(PHONE,0,1),OLDTOP=camera(PHONE,.5,1),NEW=camera(PHONE,.5,Z0);

test("鏡頭複製品對得上截圖（舊預設視角：最上排 y≈151、最下排 y≈276、最下排左右 102～272）",()=>{
  const a=OLD.prj(-4,TOP+PH,-4.5),b=OLD.prj(-4,TOP+PH,4.5),c=OLD.prj(4,TOP+PH,4.5);
  assert.ok(Math.abs(a[1]-151)<6&&Math.abs(b[1]-276)<6,`y ${a[1]} ${b[1]}`);assert.ok(Math.abs(b[0]-102)<6&&Math.abs(c[0]-272)<6,`x ${b[0]} ${c[0]}`)});

test("手機預設視角（topfit）：格距至少 28px、棋盤框不出畫面",()=>{
  const s=spacing(NEW),mm=boardMeas(NEW.prj,PHONE.W,PHONE.H,G);
  assert.ok(Z0<.75&&Z0>.45,"zoom "+Z0);assert.ok(mm.fit,"棋盤框要在畫面內");
  assert.ok(Math.min(s.colFar,s.rowFar)>=28,JSON.stringify(s));
  const so=spacing(OLD);assert.ok(Math.min(s.colFar,s.rowFar)>Math.min(so.colFar,so.rowFar)*1.5,"要比舊預設大 1.5 倍以上")});

test("窄螢幕（360 寬）不會把棋盤框推出畫面",()=>{
  const V=view(360-16,780),z=fitZoom(q=>boardMeas(camera(V,.5,q).prj,V.W,V.H,G),.45,1,30);assert.ok(boardMeas(camera(V,.5,z).prj,V.W,V.H,G).fit)});

test("正中棋子：每一顆紅子都選得到自己",()=>{
  for(let i=0;i<90;i++)if(START[i]&&sideOf(START[i])==="r"){const[x,z]=pos(i),q=NEW.prj(x,TOP+PH,z);assert.equal(snapAt(NEW,START,q[0],q[1]).i,i)}});

test("阿嬤：點炮偏上 4px、偏下 4px、偏左右 6px 都選到炮",()=>{
  const i=sq(1,7),[x,z]=pos(i),q=NEW.prj(x,TOP+PH,z);
  for(const[dx,dy]of[[0,-4],[0,4],[-6,0],[6,0],[4,-4]])assert.equal(snapAt(NEW,START,q[0]+dx,q[1]+dy).i,i,`偏 ${dx},${dy}`)});

test("阿哲：點傌偏向俥 10px 還是傌；正中間（兩顆一樣近）不猜",()=>{
  const n=sq(1,9),r=sq(0,9),[xn,zn]=pos(n),[xr,zr]=pos(r),qn=NEW.prj(xn,TOP+PH,zn),qr=NEW.prj(xr,TOP+PH,zr),ux=(qr[0]-qn[0])/Math.hypot(qr[0]-qn[0],qr[1]-qn[1]);
  assert.equal(snapAt(NEW,START,qn[0]+ux*10,qn[1]).i,n);
  const mid=snapAt(NEW,START,(qn[0]+qr[0])/2,(qn[1]+qr[1])/2);assert.equal(mid.i,-1);assert.deepEqual(mid.amb.slice().sort((a,b)=>a-b),[r,n].sort((a,b)=>a-b))});

test("沒選子：點在兩個兵之間的空點附近，吸到最近的兵；空點正上方照實回報（維持原本的點空提示）",()=>{
  const p=sq(2,6),e=sq(3,6),[xp,zp]=pos(p),[xe,ze]=pos(e),qp=NEW.prj(xp,TOP+PH,zp),qe=NEW.prj(xe,TOP,ze);
  const near=snapAt(NEW,START,qp[0]+(qe[0]-qp[0])*.45,qp[1]);assert.equal(near.i,p);
  const on=snapAt(NEW,START,qe[0],qe[1]);assert.equal(on.i,e);assert.ok(on.raw)});

test("點對方的子：照實回報那一格，不會被吸到附近的己方棋子",()=>{
  const i=sq(1,2),[x,z]=pos(i),q=NEW.prj(x,TOP+PH,z),o=snapAt(NEW,START,q[0]+2,q[1]+2);assert.equal(o.i,i);assert.ok(o.raw)});

test("選了子：點綠點附近吸到綠點；綠點跟另一顆己方棋子一樣近時優先綠點",()=>{
  const sel=sq(1,7),tg=[sq(1,6),sq(1,5),sq(1,4),sq(1,3),sq(1,8),sq(2,7),sq(3,7),sq(4,7),sq(5,7),sq(6,7),sq(0,7)],t=sq(1,5),[x,z]=pos(t),q=NEW.prj(x,TOP,z);
  assert.equal(snapAt(NEW,START,q[0]+7,q[1]-6,sel,tg).i,t);
  const tt=sq(1,8),[x1,z1]=pos(tt),q1=NEW.prj(x1,TOP,z1),own=sq(1,9),[x2,z2]=pos(own),q2=NEW.prj(x2,TOP+PH,z2);
  const o=snapAt(NEW,START,(q1[0]+q2[0])/2,(q1[1]+q2[1])/2+1,sel,tg);assert.ok(o.i===tt||o.amb,"中間偏綠點：吸綠點或不猜，不能選到傌："+JSON.stringify(o))});

test("出了棋盤：回 -1（交給點物件看介紹）",()=>{assert.equal(snapAt(NEW,START,5,5).i,-1);assert.equal(snapAt(NEW,START,PHONE.W/2,PHONE.H-4).i,-1)});

test("fitZoom：找最小可行距離、放不下就維持 1",()=>{
  assert.ok(Math.abs(fitZoom(z=>({fit:z>=.6,sp:30/z*.6}),.4,1,40)-.6)<1e-3);assert.equal(fitZoom(()=>({fit:false,sp:1}),.4,1,30),1);
  assert.equal(fitZoom(()=>({fit:true,sp:10}),.4,1,30),.4);assert.ok(inBox([[5,30]],100,100,[24,4,50,4]));assert.ok(!inBox([[2,30]],100,100,[24,4,50,4]))});

test("模擬真人手指（誤差 σ＝6px）點己方棋子：新算法（topfit＋吸附）命中率明顯比舊算法（舊預設視角）高",()=>{
  const own=[...Array(90).keys()].filter(i=>START[i]&&sideOf(START[i])==="r");let okN=0,okO=0,ambN=0,okT=0,N=0;
  for(let k=0;k<40;k++)for(const i of own){const[x,z]=pos(i),ex=gauss()*6,ey=gauss()*6;N++;
    const qn=NEW.prj(x,TOP+PH,z),r=snapAt(NEW,START,qn[0]+ex,qn[1]+ey);if(r.i===i)okN++;else if(r.amb)ambN++;
    const qo=OLD.prj(x,TOP+PH,z);if(oldPick(OLD,START,qo[0]+ex,qo[1]+ey)===i)okO++;
    const qt=OLDTOP.prj(x,TOP+PH,z);if(oldPick(OLDTOP,START,qt[0]+ex,qt[1]+ey)===i)okT++}
  const pct=v=>(v/N*100).toFixed(1)+"%",s=spacing(NEW),so=spacing(OLD),st=spacing(OLDTOP);
  console.log(`\n  390×844（畫面 ${PHONE.W}×${PHONE.H}）預設視角 topfit：鏡頭距離 ${Z0.toFixed(3)} 倍`);
  console.log(`  格距 px  舊預設（坐著）：左右 ${so.colFar.toFixed(1)}～${so.colNear.toFixed(1)}、前後 ${so.rowFar.toFixed(1)}～${so.rowNear.toFixed(1)}`);
  console.log(`          舊俯視（1 倍）：左右 ${st.colFar.toFixed(1)}～${st.colNear.toFixed(1)}、前後 ${st.rowFar.toFixed(1)}～${st.rowNear.toFixed(1)}`);
  console.log(`          新 topfit     ：左右 ${s.colFar.toFixed(1)}～${s.colNear.toFixed(1)}、前後 ${s.rowFar.toFixed(1)}～${s.rowNear.toFixed(1)}`);
  console.log(`  手指誤差 σ6px 點己方棋子 ${N} 次：舊預設 ${pct(okO)}、舊俯視 ${pct(okT)}、新 ${pct(okN)}（另有 ${pct(ambN)} 判成一樣近、提示再點一次，不會選錯）`);
  assert.ok(okN/N>.97,"新算法命中率要 >97%");assert.ok(okN>okO)});
