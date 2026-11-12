// 第 11 輪 F4：電腦依局面複雜度＋真人節奏決定思考時間（xiangqi-lab/src/local.js 的 THINKPACE 區塊）
// 行為測試：把 THINKPACE 原樣切出來，用 core.js 的真棋盤局面跑；亂數固定，結果可重現
// 用法：node --test xiangqi-lab/tools/test-ai-think.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const C=require("../site/core.js"),LOCAL=fs.readFileSync(path.join(__dirname,"..","src","local.js"),"utf8");
const cut=(a,b)=>{const i=LOCAL.indexOf(a),j=LOCAL.indexOf(b);assert.ok(i>=0&&j>i,"找不到 "+a);return LOCAL.slice(i,j)};
const HP=new Function("C",cut("/* HUMANPICK:BEGIN */","/* HUMANPICK:END */")+"\nreturn HUMANPICK(C);")(C);
const TP=new Function("C","HP","CPU_MIN_MS",cut("/* THINKPACE:BEGIN */","/* THINKPACE:END */")+"\nreturn THINKPACE(C,HP,CPU_MIN_MS);")(C,HP,1000);
const RLV=new Function("return "+LOCAL.match(/const RLV=(\[[\s\S]*?\]);/)[1])();
const LOW=RLV[0],MID=RLV[7],TOP={movetime:3000};   /* 新手（擬人選步）、業級（固定深度）、高段（固定思考時間） */
const half=()=>.5,seq=s=>{let x=s;return()=>(x=(x*16807)%2147483647)/2147483647};
const S=(fen,turn,n,last)=>({board:C.parseFen(fen),turn,moves:Array.from({length:n},(_,i)=>i===n-1&&last?last:{f:0,t:0})});
const POS=require("./fixtures/ai-batch-positions.json").positions;

test("快速模式：跟以前一樣 1～1.5 秒，不看局面",()=>{
  const s=S(C.START,"r",20);for(const r of[0,.5,.999]){const v=TP.ms(s,"h2e2",null,MID,"fast",()=>r);assert.ok(v>=1000&&v<1500,String(v))}});
test("開局前 8 手：1～2 秒（像背譜）",()=>{
  const s=S(C.START,"r",2);for(const r of[0,.5,.99])assert.ok(TP.ms(s,"h2e2",null,MID,"real",()=>r)>=1000&&TP.ms(s,"h2e2",null,MID,"real",()=>r)<=2000)});
test("只有一兩步可走：1 秒內；回吃剛走過來的子：1.3 秒內",()=>{
  /* 紅帥被黑車直將、只能左右閃 */
  const f=S("4k4/9/9/9/9/9/9/9/4r4/4K4","r",30);assert.ok(C.legal(f.board,"r").length<=2,"局面要真的只有一兩步");
  assert.ok(TP.ms(f,null,null,MID,"real",half)<=1000);
  /* 黑方剛把車走到 e5（第 4 列、第 4 行＝格 40），紅炮吃回 */
  const b="4k4/9/9/9/4r4/9/9/4C4/9/4K4",s=S(b,"r",30,{f:4,t:40});assert.ok(s.board[40],"e5 有黑車");
  const v=TP.ms(s,C.iccs(C.parseSq("e2"),40),null,MID,"real",half);assert.ok(v>=800&&v<=1300,String(v))});
test("中局：可走步多、能吃的子多、候選差不多好的局面，想得比簡單局面久",()=>{
  const busy=POS.find(p=>p.id==="mg06"),s=S(busy.fen.split(" ")[0],busy.fen.split(" ")[1]==="b"?"b":"r",40);
  const close={lines:[{v:20},{v:10}]},clear={lines:[{v:400},{v:-100}]};
  const a=TP.ms(s,null,close,MID,"real",half),b=TP.ms(s,null,clear,MID,"real",half);
  assert.ok(a>b+600,`難選 ${a} 要比好選 ${b} 久`);assert.ok(a>=2000&&a<=8000)});
test("低段比較快、高段比較沉穩；最短 0.6 秒、最長 8 秒",()=>{
  const p=POS.find(x=>x.phase==="中局"),s=S(p.fen.split(" ")[0],p.fen.split(" ")[1]==="b"?"b":"r",40),r={lines:[{v:10},{v:5}]};
  const lo=TP.ms(s,null,r,LOW,"real",half),md=TP.ms(s,null,r,MID,"real",half),hi=TP.ms(s,null,r,TOP,"real",half);
  assert.ok(lo<md&&md<hi,`${lo} < ${md} < ${hi}`);
  const g=seq(7);for(let i=0;i<300;i++){const v=TP.ms(s,null,r,TOP,"real",g);assert.ok(v>=TP.MIN&&v<=TP.MAX)}});
test("60 個固定局面（中局）：思考時間跟可走步數正相關（不再是跟局面無關的固定亂數）",()=>{
  const xs=[],ys=[];for(const p of POS.filter(x=>x.phase==="中局")){const tn=p.fen.split(" ")[1]==="b"?"b":"r",s=S(p.fen.split(" ")[0],tn,40);
    xs.push(C.legal(s.board,tn).length);ys.push(TP.ms(s,null,null,MID,"real",half))}
  const m=a=>a.reduce((x,y)=>x+y,0)/a.length,mx=m(xs),my=m(ys),cov=xs.reduce((t,x,i)=>t+(x-mx)*(ys[i]-my),0),
    r=cov/Math.sqrt(xs.reduce((t,x)=>t+(x-mx)**2,0)*ys.reduce((t,y)=>t+(y-my)**2,0));
  assert.ok(r>0.3,"相關係數 "+r.toFixed(2))});
test("〔原始碼〕電腦落子兩處等待都用 THINKPACE；節奏讀設定 m_cpuPace（預設擬真）；先挑好步再等",()=>{
  assert.ok(LOCAL.includes("if(u){const w=TP.ms(P,u,null,lv,cpuPace())-(Date.now()-t0);"),"開局庫");
  assert.ok(LOCAL.includes("{const w=TP.ms(P,mv,r,lv,cpuPace())-(Date.now()-t0);if(w>0)await new Promise(z=>setTimeout(z,w))}"),"一般");
  assert.ok(LOCAL.includes('JSON.parse(localStorage.getItem("m_cpuPace"))==="fast"?"fast":"real"'));
  assert.ok(LOCAL.indexOf("pickMove(r,lv);   /* 先挑好這一步")<LOCAL.indexOf("{const w=TP.ms(P,mv,r,lv,cpuPace())"),"先挑步再等")});
test("〔原始碼〕設定頁開關：電腦下棋節奏（擬真預設／快速）存 cpuPace；震動回饋 haptic 預設開；匿名回報 teleOptIn 預設關",()=>{
  const SET=fs.readFileSync(path.join(__dirname,"../../xiangqi-db/m/05-settings.js"),"utf8");
  assert.ok(SET.includes('[["real","擬真"],["fast","快速"]].map(([k,l])=>`<button data-pace="${k}"${store.get("cpuPace","real")===k?'));
  assert.ok(SET.includes('store.set("cpuPace",b.dataset.pace)'));
  assert.ok(SET.includes('const hp=v.querySelector("#hapSw");if(hp)hp.checked=store.get("haptic",true)!==false'),"開關 id 跟 07hp-haptics.js 監聽的 #hapSw 一致");
  assert.ok(SET.includes('<b>📳 震動回饋</b>')&&SET.includes('id="hapSw" aria-label="震動回饋"'),"名稱跟 sound.md 一致");
  assert.ok(SET.includes('tl.checked=!!store.get("teleOptIn",false);'),"匿名回報預設關");
  assert.ok(SET.includes('<b>🩺 每天自動送匿名健康摘要</b>')&&SET.includes('id="teleSw" aria-label="每天自動送匿名健康摘要"'),"名稱跟 privacy.md 一致");
});
