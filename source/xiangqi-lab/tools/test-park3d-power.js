// 3D 園子「入座運鏡」＋「省電模式」的單元測試（11/11，評比第 2 輪：Gemini 手機預設視角找回沉浸感、ChatGPT 效能耗電證據）。不開瀏覽器、不載 three.js：
//   1. 從 src/park3d.js 照 PKPOWER 標記抽出純函式（introK／pwDecide／pwGap／pwDue／fpsWin／pfAdd／pfSum）
//   2. 入座運鏡的時間曲線、對面的人和小帥在「坐著看」與 topfit 裡看不看得到（鏡頭照 test-park3d-tap.js 的純數學複製品）
//   3. 省電決策（自動／手動）、近 10 秒計數
//   4. 用 park3d frame() 同一套排程（pwDue＋pwGap）模擬 60Hz／120Hz 螢幕閒置 60 秒、10 分鐘：算 render 次數（證據檔 story/90_3D入座與省電模式.md 的數字從這裡來）
//   5. 原始碼檢查：省電、運鏡真的接進 park3d／06-cpu／05-settings（防止之後被改掉）
// 用法：node tools/test-park3d-power.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const SRC=fs.readFileSync(path.join(__dirname,"../src/park3d.js"),"utf8");
const m=SRC.match(/\/\*PKPOWER\{[\s\S]*?\/\*\}PKPOWER\*\//);
if(!m)throw new Error("park3d.js 找不到 PKPOWER 區塊");
const {introK,pwDecide,pwGap,pwDue,fpsWin,pfAdd,pfSum}=new Function(m[0]+";return{introK,pwDecide,pwGap,pwDue,fpsWin,pfAdd,pfSum}")();
const T0=SRC.match(/\/\*TAPSNAP\{[\s\S]*?\/\*\}TAPSNAP\*\//);
const {boardMeas,fitZoom}=new Function(T0[0]+";return{boardMeas,fitZoom}")();

// ---------- 鏡頭（跟 test-park3d-tap.js 同一份：camBase [0,27,26]、look [0,-.3,-.4]、PIV [0,-.3,0]、ht .24） ----------
const BW=10.4,BH=11.4,TOP=.56,PH=.27;
const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],nrm=a=>{const l=Math.hypot(...a);return a.map(v=>v/l)};
function view(Wpx,VH){const ht=.24,hr=Math.min(1.32,Math.max(1.14,(VH-300)/Wpx)),H=Math.round(Wpx*hr),vr=Math.max(hr,1.14);
  const dp=Math.atan(ht*1.14)-Math.atan(ht*vr),fov=Math.min(62,Math.max(38,2*Math.atan(ht*vr)*180/Math.PI));
  return{W:Wpx,H,dp,tanV:Math.tan(fov/2*Math.PI/180),asp:Wpx/H}}
function camera(V,pitch,zoom){
  const PIV=[0,-.3,0],off=sub([0,27,26],PIV),lk=sub([0,-.3,-.4],PIV),el0=Math.atan2(off[1],Math.hypot(off[0],off[2]));
  const low=Math.min(1,Math.max(0,-pitch/.7)),el=Math.min(1.5,Math.max(.1,el0+pitch)),R=Math.min(Math.hypot(...off)*zoom,330);lk[1]+=4.5*low;
  const pos=[0,PIV[1]+Math.sin(el)*R,PIV[2]+Math.cos(el)*R],tgt=[lk[0],PIV[1]+lk[1],PIV[2]+lk[2]];
  const Z=nrm(sub(pos,tgt)),X=nrm(cross([0,1,0],Z)),Y=cross(Z,X),c=Math.cos(V.dp),s=Math.sin(V.dp);
  const Y2=Y.map((v,k)=>c*v+s*Z[k]),Z2=Z.map((v,k)=>-s*Y[k]+c*v);
  const prj=(x,y,z)=>{const d=sub([x,y,z],pos),xc=dot(d,X),yc=dot(d,Y2),zc=dot(d,Z2);return[((xc/-zc)/(V.tanV*V.asp)+1)/2*V.W,(1-(yc/-zc)/V.tanV)/2*V.H,-zc]};
  return{prj,pos}}
const PHONE=view(390-16,844),G={bw:BW,bh:BH,top:TOP,ph:PH};
const ZF=fitZoom(z=>boardMeas(camera(PHONE,.5,z).prj,PHONE.W,PHONE.H,G),.45,1,30);
// 對面的人（立繪 SPR：z＝BZ+2.6＝-10、腳 y≈-5.2、高 11.2）、小帥（座位 MZ 11.6、座高 SY -2.7、縮放 4.1）的臉大約在這裡
const OPP_FACE=[0,3.6,-10],MATE_HEAD=[0,1.6,11.6];
const inView=(cam,p)=>{const q=cam.prj(...p);return q[2]>0&&q[0]>=0&&q[0]<=PHONE.W&&q[1]>=0&&q[1]<=PHONE.H};

// ---------- 1. 入座運鏡 ----------
test("入座運鏡時間曲線：前 1.8 秒停在坐著看、之後 0.8 秒 ease 到 topfit",()=>{
  assert.equal(introK(0),0);assert.equal(introK(900),0);assert.equal(introK(1800),0);
  assert.ok(Math.abs(introK(2200)-.5)<1e-9,"一半時間走一半");assert.equal(introK(2600),1);assert.equal(introK(9999),1);
  assert.ok(introK(1900)<.05,"一開始慢慢起步");assert.ok(introK(2500)>.95,"最後慢慢停");
  let p=0;for(let t=1800;t<=2600;t+=10){const k=introK(t);assert.ok(k>=p-1e-12,"不能倒退 "+t);p=k}
  assert.equal(introK(500,0,1000),.5);assert.equal(introK(-50),0);assert.equal(introK(NaN),0)});

test("坐著看（運鏡起點）看得到對面的人和小帥；topfit（終點）看不到對面的人——所以才要先停一下",()=>{
  const sit=camera(PHONE,0,1),top=camera(PHONE,.5,ZF);
  assert.ok(inView(sit,OPP_FACE),"坐著看：對面的人要在畫面裡 "+sit.prj(...OPP_FACE).map(v=>v.toFixed(0)));
  assert.ok(inView(sit,MATE_HEAD),"坐著看：小帥要在畫面裡 "+sit.prj(...MATE_HEAD).map(v=>v.toFixed(0)));
  assert.ok(!inView(top,OPP_FACE),"topfit：對面的人的臉在畫面外 "+top.prj(...OPP_FACE).map(v=>v.toFixed(0)));
  console.log(`\n  390×844：topfit 距離 ${ZF.toFixed(3)} 倍；對面的臉 坐著看 y=${sit.prj(...OPP_FACE)[1].toFixed(0)}px、topfit y=${top.prj(...OPP_FACE)[1].toFixed(0)}px（畫面高 ${PHONE.H}）`)});

test("運鏡路徑：俯角 0→0.5、距離 1→topfit，中途棋盤框一直在畫面裡",()=>{
  for(let t=1800;t<=2600;t+=50){const k=introK(t),c=camera(PHONE,.5*k,1+(ZF-1)*k);assert.ok(boardMeas(c.prj,PHONE.W,PHONE.H,Object.assign({pad:[0,0,0,0]},G)).fit,"t="+t)}});

// ---------- 2. 省電決策 ----------
const PHONE_OK={bat:{charging:false,level:.8},saveData:false,mem:8,cores:8,mob:true,lowFps:false};
test("手動：開就開、關就關（不管電量）",()=>{
  assert.deepEqual(pwDecide("on",PHONE_OK),{on:true,why:["手動開"]});
  assert.equal(pwDecide("off",{...PHONE_OK,bat:{charging:false,level:.05},lowFps:true}).on,false)});
test("自動：一般手機不省電",()=>{assert.deepEqual(pwDecide("auto",PHONE_OK),{on:false,why:[]});assert.equal(pwDecide("auto",{}).on,false);assert.equal(pwDecide("auto",null).on,false)});
test("自動：沒充電而且電量低於 20% 才省電；在充電不算",()=>{
  assert.deepEqual(pwDecide("auto",{...PHONE_OK,bat:{charging:false,level:.19}}).why,["電量低於 20%"]);
  assert.equal(pwDecide("auto",{...PHONE_OK,bat:{charging:true,level:.05}}).on,false);
  assert.equal(pwDecide("auto",{...PHONE_OK,bat:{charging:false,level:.2}}).on,false)});
test("自動：數據節省、畫面偏慢（桌機也算）",()=>{
  assert.ok(pwDecide("auto",{...PHONE_OK,saveData:true}).why.includes("數據節省"));
  assert.ok(pwDecide("auto",{mob:false,lowFps:true}).why.includes("畫面偏慢"))});
test("自動：手機記憶體 2GB 以下、處理器 4 核以下；桌機不看硬體；Safari（不報記憶體）4 核不算、2 核才算",()=>{
  assert.ok(pwDecide("auto",{...PHONE_OK,mem:2}).on);assert.ok(pwDecide("auto",{...PHONE_OK,mem:1}).on);
  assert.ok(pwDecide("auto",{...PHONE_OK,mem:4,cores:4}).why.includes("處理器 4 核"));
  assert.equal(pwDecide("auto",{...PHONE_OK,mem:2,mob:false}).on,false,"桌機記憶體小不算");
  assert.equal(pwDecide("auto",{...PHONE_OK,cores:4,mob:false}).on,false,"桌機 4 核不算");
  assert.equal(pwDecide("auto",{...PHONE_OK,mem:0,cores:4}).on,false,"Safari 4 核不算");
  assert.ok(pwDecide("auto",{...PHONE_OK,mem:0,cores:2}).on,"2 核一定算")});
test("自動：原因可以疊好幾個",()=>{assert.deepEqual(pwDecide("auto",{bat:{charging:false,level:.1},saveData:true,mem:2,cores:4,mob:true,lowFps:true}).why,["電量低於 20%","數據節省","記憶體 2GB","處理器 4 核","畫面偏慢"])});

// ---------- 3. 排程（frame() 用的 pwGap／pwDue） ----------
test("pwGap：沒省電每格都畫；省電但在動每格都畫；閒置 3 秒內每秒 10 格，之後每秒 2 格",()=>{
  assert.equal(pwGap(false,false,99999),0);assert.equal(pwGap(true,true,99999),0);assert.equal(pwGap(true,false,0),100);assert.equal(pwGap(true,false,2999),100);assert.equal(pwGap(true,false,3000),500);
  assert.ok(pwDue(0,0,0));assert.ok(!pwDue(50,0,100));assert.ok(pwDue(100,0,100));assert.ok(pwDue(92,0,100),"60Hz 第 6 格（約 100ms）要算到")});
// 模擬 frame()：每個 rAF（hz）先算 act，再看 pwDue(pwGap) 要不要畫——跟 park3d 同一段邏輯
function sim({hz=60,secs=60,power=true,actAt=()=>false}){const dt=1000/hz;let lastR=-1e9,lastAct=0,R=0,idleR=0,F=0;
  for(let n=0;n<secs*hz;n++){const now=n*dt;F++;const act=actAt(now);if(act)lastAct=now;if(!pwDue(now,lastR,pwGap(power,act,now-lastAct)))continue;R++;if(!act)idleR++;lastR=now}
  return{frames:F,renders:R,idle:idleR}}
const EVID=[];
test("閒置 60 秒（60Hz）：一般模式畫 3600 次，省電只畫約 144 次（前 3 秒每秒 10 格、之後每秒 2 格，少 95% 以上）",()=>{
  const a=sim({power:false}),b=sim({power:true});
  assert.equal(a.renders,3600);assert.ok(b.renders<160&&b.renders>100,"省電 "+b.renders);assert.ok(1-b.renders/a.renders>.95);
  EVID.push(["閒置 60 秒・60Hz",a.renders,b.renders])});
test("閒置 10 分鐘（60Hz、120Hz）：省電每秒約 2 格",()=>{
  for(const hz of[60,120]){const a=sim({hz,secs:600,power:false}),b=sim({hz,secs:600,power:true});
    assert.ok(b.renders/600<2.2,hz+"Hz 每秒 "+(b.renders/600).toFixed(2));EVID.push([`閒置 10 分鐘・${hz}Hz`,a.renders,b.renders])}});
test("拖曳、走子時省電也照樣每格都畫（不會卡）",()=>{
  const drag=now=>now>=10000&&now<12000,b=sim({power:true,secs:20,actAt:drag});
  const inDrag=sim({power:true,secs:2,actAt:()=>true});assert.equal(inDrag.renders,120,"拖曳 2 秒 120 格");
  assert.ok(b.renders>=120+30,"拖曳中 120 格＋前後閒置");EVID.push(["20 秒裡拖曳 2 秒・60Hz",sim({power:false,secs:20}).renders,b.renders])});
test("一盤棋的節奏（每 20 秒走一步，每步動 1.5 秒）：省電少畫 85% 以上",()=>{
  const play=now=>now%20000<1500,a=sim({power:false,secs:600,actAt:play}),b=sim({power:true,secs:600,actAt:play});
  assert.ok(1-b.renders/a.renders>.85,(1-b.renders/a.renders).toFixed(3));EVID.push(["下棋 10 分鐘（每 20 秒一步）・60Hz",a.renders,b.renders])});

// ---------- 4. 量 fps、近 10 秒計數 ----------
test("fpsWin：滿 5 秒回平均；中間斷超過 1 秒就重來",()=>{
  const w={};let r=null;for(let t=0;t<=5100;t+=1000/60){const a=fpsWin(w,t);if(a!=null)r=a}assert.ok(Math.abs(r-60)<1.5,"60fps→"+r);
  const w2={};r=null;for(let t=0;t<=5200;t+=50){const a=fpsWin(w2,t);if(a!=null)r=a}assert.ok(Math.abs(r-20)<1,"20fps→"+r);
  const w3={};for(let t=0;t<3000;t+=16)fpsWin(w3,t);assert.equal(fpsWin(w3,6000),null,"斷了 3 秒要重量");assert.equal(w3.n,0)});
test("pfAdd／pfSum：近 10 秒、只算過完的秒、舊的丟掉",()=>{
  const q=[];for(let s=0;s<30;s++)for(let f=0;f<60;f++){const r=f%6===0;pfAdd(q,s,1,r?1:0,r&&s>=25?1:0)}
  assert.ok(q.length<=11);const S=pfSum(q,30);assert.equal(S.fps,10);assert.equal(S.frames,600);assert.equal(S.renders,100);assert.equal(S.idle,50);assert.equal(S.span,10);
  assert.equal(pfSum([],5).fps,0);const q2=[];pfAdd(q2,7,1,1,0);assert.equal(pfSum(q2,7).renders,0,"還沒過完的這一秒不算")});

// ---------- 5. 原始碼有接上 ----------
test("〔原始碼〕原始碼：park3d 省電、運鏡、計數接進動畫迴圈",()=>{
  for(const s of["antialias:!PW0.on","sun.castShadow=!PW.on","if(!PW.on)falling.forEach","pwDue(now,PW.lastR,pwGap(PW.on,act,now-PW.lastAct))","pfAdd(PW.q,sec,1,1,act?0:1)",
    "(window.__PK=window.__PK||{}).perf=PF","introK(now-IN.t0,IN.hold,IN.dur)","if(IN.ph===\"wait\"){INTRO_SEEN.add(IN.key)","finally{if(inH)inEnd(true)}","prefers-reduced-motion: reduce)\").matches}catch(e){return false}})(),IN=",
    "const s=PW.on&&!ON?PW.s0:now/1000","perf:()=>PF"])assert.ok(SRC.includes(s),"park3d 少了 "+s);
  const C=fs.readFileSync(path.join(__dirname,"../../xiangqi-db/m/06-cpu.js"),"utf8"),S5=fs.readFileSync(path.join(__dirname,"../../xiangqi-db/m/05-settings.js"),"utf8");
  for(const s of["function pkPwRow(","function pkPwSet(","intro:store.get(\"parkView\",\"\")||ex.quietMate?null:pkIntroKey(ex)","PARK.v.intro(ik)"])assert.ok(C.includes(s),"06-cpu 少了 "+s);
  assert.ok(S5.includes('${typeof pkPwRow==="function"?pkPwRow():""}'),"設定頁要有省電那一列")});

test.after(()=>{console.log("\n  render 次數（一般 → 省電，模擬 park3d frame 排程）：");
  for(const[k,a,b]of EVID)console.log(`  ${k}：${a} → ${b}（少 ${((1-b/a)*100).toFixed(1)}%）`)});
