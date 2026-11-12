#!/usr/bin/env node
// 電腦對手透明測試（評比第 10 輪 F3：P01.2 電腦棋力與難度、P36.3 算力降級擬真度、P48.1 擬人化思考延遲、P48.2 刻意失誤自然度、P48.5 動態難度微調）
// 固定一組局面（開局、中局、殘局各 20 個，從許銀川對局集 site/data/xuyinchuan.json 用固定種子抽，清單存在 tools/fixtures/ai-batch-positions.json），
// 對挑戰電腦的每一級（src/local.js 的 RLV／LEVELS 18 級，另加笑面掌櫃「掌櫃真功夫」）用 App 真正的選步程式各跑幾次，量：
//   思考時間：App 的等待＝max(引擎耗時, THINKPACE 擬真時間)（第 11 輪 F4，local.js 的 THINKPACE 原樣切出來算）；快速模式另記 fastMean＝max(引擎耗時, CPU_MIN_MS＋亂數×500)；引擎耗時、節點數、深度；跟局面複雜度（合法著法數）的相關係數
//   失誤：選的著法比參考最佳差多少（參考＝同一個引擎深度 16 搜根、深度 15 評每一步走完的局面）；>100 厘兵＝失誤、>300＝大失誤；大失誤再用規則分型態
//   棋風：吃子、將軍、兌子、前進、走後過河子數、動仕相帥
//   殘局抵抗：劣勢殘局（輸方走）裡選最頑強著法的比例；再從這些殘局下下去（贏方＝引擎深度 10），看被殺的比例、撐幾步
// 引擎：App 自己的網頁版 Pikafish（site/engine/pikafish.js＋.wasm＋.nnue），在 Node 裡跑（不開瀏覽器、不另外下載）；每個引擎 Threads=1、Hash=16MB
//   選步程式：core.js 的 pickMove（Math.random 換成固定種子的亂數）、local.js 的 HUMANPICK／STYLEPICK 區塊（原樣切出來跑）、RLV、LEVELS、CPU_MIN_MS
// 用法：node xiangqi-lab/tools/ai-batch.js [--workers 6] [--reps 8] [--po-reps 2] [--plies 40] [--ref-depth 16] [--regen] [--fast] [--out 檔案.json]
//   --regen：重新抽局面（會覆蓋 fixtures 的清單）；--fast：思考時間上限 1 秒、只跑 2 次（試跑用，數字不能當正式結果）
//   --md [檔案.json]：不跑引擎，把已有的結果印成透明頁用的表格
"use strict";
const fs=require("fs"),path=require("path"),os=require("os");
const LAB=path.join(__dirname,".."),ROOT=path.join(LAB,"..");
const C=require(path.join(LAB,"site","core.js"));
const LOCAL=fs.readFileSync(path.join(LAB,"src","local.js"),"utf8").replace(/\r\n/g,"\n");
function cut(a,b){const i=LOCAL.indexOf(a),j=LOCAL.indexOf(b,i+1);if(i<0||j<i)throw new Error("local.js 找不到 "+a);return LOCAL.slice(i,j+b.length)}
const HP=new Function("C",cut("/* HUMANPICK:BEGIN */","/* HUMANPICK:END */")+"\nreturn HUMANPICK(C);")(C);
const SP=new Function("C",cut("/* STYLEPICK:BEGIN */","/* STYLEPICK:END */")+"\nreturn STYLEPICK(C);")(C);
const RLV=new Function("return "+LOCAL.match(/const RLV=(\[[\s\S]*?\]);/)[1])();
const RANKS=new Function("return "+LOCAL.match(/const RANKS=(\[\[[\s\S]*?\]\]);/)[1])();
const LEVELS=new Function("HP","RLV","RANKS",LOCAL.match(/const LVDESC=[^\n]*\n\s*const LEVELS=[^\n]*\n/)[0]+"return LEVELS;")(HP,RLV,RANKS);
const CPU_MIN_MS=+LOCAL.match(/const CPU_MIN_MS=(\d+);/)[1];
const CPU_JIT_MS=+LOCAL.match(/CPU_MIN_MS\+rnd\(\)\*(\d+)/)[1];   /* 快速模式（設定 → 電腦下棋節奏）的亂數範圍，在 THINKPACE 裡 */
const TP=new Function("C","HP","CPU_MIN_MS",cut("/* THINKPACE:BEGIN */","/* THINKPACE:END */")+"\nreturn THINKPACE(C,HP,CPU_MIN_MS);")(C,HP,CPU_MIN_MS);   /* 第 11 輪 F4：擬真思考時間，原樣用 App 的 */
const plyOf=p=>{const m=/第 (\d+) 手後/.exec(p.src||"");return m?+m[1]:40};
const ZG_X_NODES=+LOCAL.match(/const ZG_X_NODES=(\d+)/)[1];

const POSF=path.join(__dirname,"fixtures","ai-batch-positions.json");
const OUT_DEF=path.join(ROOT,"xiangqi-db","tools","review_loop","rounds","r10","ai-batch.json");
const PHASES=["開局","中局","殘局"];
const MATE=20000,BIG=300,ERR=100,STUB=30,LOSING=-150;
const cl=v=>Math.max(-2500,Math.min(2500,v));
const up=p=>p.toUpperCase();

/* ---------- 亂數（固定種子） ---------- */
function hashStr(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function withRand(R,f){const o=Math.random;Math.random=R;try{return f()}finally{Math.random=o}}

/* ---------- 受測的設定：挑戰電腦 18 級＋掌櫃真功夫 ---------- */
const CFGS=[...LEVELS.map(lv=>({key:"L"+lv.n,n:lv.n,name:lv.name,lv,kind:HP.on(lv)?"hp":lv.movetime?"best":"margin"})),
  {key:"ZGX",n:null,name:"掌櫃真功夫",lv:{nodes:ZG_X_NODES},kind:"zg"}];
function limOf(c,fast){const lv=c.lv;return lv.nodes?{nodes:lv.nodes}:lv.movetime?{movetime:fast?Math.min(lv.movetime,1000):lv.movetime}:{depth:lv.depth}}
function mpvOf(c){return c.kind==="zg"?SP.mpvOf(c.lv):c.kind==="hp"?HP.mpvOf(c.lv):c.lv.multipv||1}
/* 跟 local.js playEngine 同一條分支：笑面掌櫃＝SP.pick；低段擬人＝HP.pick；其他＝core.js pickMove（Math.random 換成固定種子） */
function pickOf(c,r,b,s,R){return c.kind==="zg"?SP.pick(r,c.lv,b,s,R).mv:c.kind==="hp"?HP.pick(r,c.lv,b,s,R).mv:withRand(R,()=>C.pickMove(r,c.lv))}
const detOf=c=>c.kind==="best";
function cfgText(c){const lv=c.lv;return lv.nodes?`每步 ${lv.nodes} 節點`:lv.movetime?`每步 ${lv.movetime/1000} 秒`:`深度 ${lv.depth}`}
function pickText(c){return c.kind==="hp"?`擬人選步（${HP.PROF[c.lv.hm].name}檔）`:c.kind==="margin"?`差最佳 ≤${c.lv.margin} 厘兵內平均抽`:c.kind==="zg"?"棋風選步（STYLEPICK）":"引擎最佳著"}

/* ---------- App 的網頁版 Pikafish（在 Node 裡跑） ---------- */
const EDIR=path.join(LAB,"site","engine");
let PM=null,NNUE=null;
async function newEngine(){
  PM=PM||require(path.join(EDIR,"pikafish.js"));NNUE=NNUE||fs.readFileSync(path.join(EDIR,"pikafish.nnue"));
  let waiters=[];const onLine=l=>{for(const w of waiters.slice())w(l)};
  /* arguments:[]：不然 Emscripten 會把 node 的命令列參數（--reps…）交給 Pikafish 當指令執行，執行完引擎就結束 */
  const mod=await PM({arguments:[],locateFile:f=>path.join(EDIR,f),mainScriptUrlOrBlob:path.join(EDIR,"pikafish.js"),print:onLine,printErr:()=>{},preRun:[m=>m.FS.writeFile("/pikafish.nnue",NNUE)]});
  const send=c=>mod.ccall("uci_command",null,["string"],[c]);
  const until=(pred,each)=>new Promise(res=>{const w=l=>{if(each)each(l);if(pred(l)){waiters=waiters.filter(x=>x!==w);res(l)}};waiters.push(w)});
  const ask=(c,pred,each)=>{const p=until(pred,each);send(c);return p};
  await ask("uci",l=>l==="uciok");send("setoption name Threads value 1");send("setoption name Hash value 16");await ask("isready",l=>l==="readyok");
  let mpvNow=0,q=Promise.resolve();
  /* 跟 src/engine.js 的 search 同一套解析（帶 PV 的 info 行，每條 multipv 留最後一行；殺棋換成 ±(30000−步數)），多記節點數、深度、耗時 */
  function search(fen0,moves,lim,mpv,fresh){const job=async()=>{
    if(fresh){send("ucinewgame");await ask("isready",l=>l==="readyok")}
    if(mpv!==mpvNow){send("setoption name MultiPV value "+mpv);mpvNow=mpv}
    send("position fen "+fen0+" - - 0 1"+(moves&&moves.length?" moves "+moves.join(" "):""));
    const info=new Map();let nodes=0,depth=0;const t0=process.hrtime.bigint();
    const best=await ask(lim.nodes?"go nodes "+lim.nodes:lim.movetime?"go movetime "+lim.movetime:"go depth "+lim.depth,l=>l.startsWith("bestmove"),l=>{
      if(!l.startsWith("info "))return;const nd=l.match(/ nodes (\d+)/);if(nd)nodes=Math.max(nodes,+nd[1]);if(!l.includes(" pv "))return;
      const m=l.match(/ multipv (\d+)/),sc=l.match(/ score (cp|mate) (-?\d+)/),pv=l.match(/ pv (.+)$/),dp=l.match(/ depth (\d+)/);if(!sc||!pv)return;
      if(dp)depth=Math.max(depth,+dp[1]);let v=+sc[2];if(sc[1]==="mate")v=v>0?30000-v:-30000-v;
      const pvs=pv[1].trim().split(/\s+/);info.set(m?+m[1]:1,{k:m?+m[1]:1,v,mv:pvs[0],pv:pvs,depth:dp?+dp[1]:null,mate:sc[1]==="mate"?+sc[2]:null})});
    const ms=Number(process.hrtime.bigint()-t0)/1e6;
    return{best:best.split(/\s+/)[1],lines:[...info.values()].sort((a,b)=>a.k-b.k),nodes,depth,ms}};
    const r=q.then(job);q=r.catch(()=>{});return r}
  return{search,close(){try{send("quit")}catch(e){}}}}
async function pool(E,tasks,label){let i=0,done=0;const t0=Date.now(),step=Math.max(1,Math.round(tasks.length/10));
  await Promise.all(E.map(async e=>{for(;;){const k=i++;if(k>=tasks.length)return;await tasks[k](e);done++;
    if(done%step===0||done===tasks.length)console.log(`  ${label}：${done}/${tasks.length}（${((Date.now()-t0)/1000).toFixed(0)} 秒）`)}}))}

/* ---------- 局面：許銀川對局集，固定種子抽樣 ---------- */
const majors=b=>b.reduce((n,p)=>n+(p&&"RNC".includes(up(p))?1:0),0);
function loadGames(){const j=JSON.parse(fs.readFileSync(path.join(LAB,"site","data","xuyinchuan.json"),"utf8"));const out=[];
  for(const it of j.items){const L=(it.lines||[]).find(l=>l.parent==null);if(!L||!Array.isArray(it.board))continue;
    let b=it.board.slice(),s=null;const st=[];
    for(const[f,t]of L.moves){if(!b[f])break;if(!s)s=C.sideOf(b[f]);if(C.sideOf(b[f])!==s||!C.legal(b,s).some(([x,y])=>x===f&&y===t))break;
      st.push({b,s,mv:C.iccs(f,t)});b=C.make(b,f,t);s=C.opp(s)}
    if(st.length>=16)out.push({id:it.id,title:it.title,st})}
  return out}
async function makePositions(E,seed){const G=loadGames(),R=rng(seed),pickG=()=>G[Math.floor(R()*G.length)],used=new Set(),out=[];
  const add=(g,p,phase,extra)=>{const x=g.st[p];used.add(g.id+"|"+phase);out.push({id:"",phase,src:`${g.title} 第 ${p} 手後`,fen:C.fen(x.b,x.s),master:x.mv,...(extra||{})})};
  const ok=x=>C.legal(x.b,x.s).length>=2;
  for(const[phase,lo,hi,minMaj]of[["開局",4,12,0],["中局",20,60,7]]){let n=0,guard=0;
    while(n<20&&guard++<5000){const g=pickG();if(used.has(g.id+"|"+phase))continue;const top=Math.min(hi,g.st.length-1);if(top<lo)continue;
      const p=lo+Math.floor(R()*(top-lo+1)),x=g.st[p];if(!ok(x)||majors(x.b)<minMaj)continue;add(g,p,phase);n++}}
  /* 殘局：雙方車馬炮合計 ≤4、第 30 手以後；先收「輪到劣勢方走」（深度 12 評分 −2000～−150、不是殺棋）14 個，再收其他 6 個（均勢或優勢方走） */
  const order=G.map(g=>[R(),g]).sort((a,b)=>a[0]-b[0]).map(x=>x[1]);let lose=0,other=0;
  for(const g of order){if(lose>=14&&other>=6)break;const ps=[];for(let p=30;p<g.st.length;p++)if(majors(g.st[p].b)<=4&&ok(g.st[p]))ps.push(p);if(!ps.length)continue;
    const p=ps[Math.floor(R()*ps.length)];for(const q of[p,p+1]){const x=g.st[q];if(!x||!ok(x)||majors(x.b)>4)continue;
      const r=await E[0].search(C.fen(x.b,x.s),[],{depth:12},1,true),v=r.lines[0]?r.lines[0].v:0;if(Math.abs(v)>=MATE)continue;
      if(v<=LOSING&&v>=-2000&&lose<14){add(g,q,"殘局",{selV:v});lose++;break}
      if(v>LOSING&&other<6){add(g,q,"殘局",{selV:v});other++;break}}}
  const cnt={};for(const x of out){cnt[x.phase]=(cnt[x.phase]||0)+1;x.id={開局:"op",中局:"mg",殘局:"eg"}[x.phase]+String(cnt[x.phase]).padStart(2,"0")}
  return out}

/* ---------- 每一步的分析：損失、失誤型態、棋風 ---------- */
function moveOf(u){return[C.parseSq(u.slice(0,2)),C.parseSq(u.slice(2,4))]}
function errType(b,s,u,val,bestVal){
  if(bestVal>=MATE&&val<MATE)return"missMate";
  if(val<=-MATE&&bestVal>-MATE)return"mated";
  const[f,t]=moveOf(u),p=b[f],q=b[t],a=C.make(b,f,t),chk=C.inCheck(a,C.opp(s)),inChk=C.inCheck(b,s),before=HP.threats(b,s),after=HP.threats(a,s),cap=q?HP.val(q,t):0,bm=HP.maxOf(before);
  /* 規則跟 human-ai-match.js 的 analyze 一樣（單步版） */
  if(!q&&!chk&&!inChk&&"RNC".includes(up(p))&&before[f]==null&&(after[t]||0)>=3)return"hang";
  if(bm>=3&&!chk&&HP.maxOf(after)-cap>=bm-0.5){for(const[x,y]of C.legal(b,s)){const n2=HP.maxOf(HP.threats(C.make(b,x,y),s))-(b[y]?HP.val(b[y],y):0);if(n2<bm-0.5)return"miss"}}
  if(q&&(after[t]||0)-cap>=1)return"greedy";
  if(bm<3&&!chk&&!(q&&cap-(after[t]||0)>=1)){for(const[x,y]of C.legal(b,s)){if(!b[y])continue;if(HP.val(b[y],y)-(HP.threats(C.make(b,x,y),s)[y]||0)>=3)return"missCap"}}
  return"other"}
const TYPES={miss:"漏看威脅",hang:"送大子",greedy:"貪吃被反吃",missCap:"漏吃",mated:"走進殺局",missMate:"漏殺",other:"其他（規則判不出型態）"};
function styleOf(b,s,u){const[f,t]=moveOf(u),p=b[f],q=b[t],a=C.make(b,f,t),o=C.opp(s),P=up(p),fw=s==="r"?-1:1;
  const across=sq=>s==="r"?(sq/9|0)<=4:(sq/9|0)>=5;let cross=0;for(let i=0;i<90;i++){const x=a[i];if(x&&C.sideOf(x)===s&&"RNCP".includes(up(x))&&across(i))cross++}
  const vq=q?C.VAL[up(q)]:0,vp=C.VAL[P];
  return{cap:!!q,chk:C.inCheck(a,o),exch:!!q&&vq>=2&&Math.abs(vq-vp)<=1&&C.legal(a,o).some(([,y])=>y===t),fwd:((t/9|0)-(f/9|0))*fw>0,cross,def:"ABK".includes(P)}}

/* ---------- 統計 ---------- */
const mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
function pearson(xs,ys){const n=xs.length;if(n<3)return null;const mx=mean(xs),my=mean(ys);let sxy=0,sxx=0,syy=0;for(let i=0;i<n;i++){const dx=xs[i]-mx,dy=ys[i]-my;sxy+=dx*dy;sxx+=dx*dx;syy+=dy*dy}
  return sxx>1e-9&&syy>1e-9?sxy/Math.sqrt(sxx*syy):null}
const r3=x=>x==null?null:Math.round(x*1000)/1000,r1=x=>x==null?null:Math.round(x*10)/10;
function errStats(rows){const L=rows.map(x=>x.loss),n=L.length,big=rows.filter(x=>x.loss>BIG),types={};for(const x of big)types[x.type]=(types[x.type]||0)+1;
  return{n,meanLoss:r1(mean(L)),err100:n?r3(rows.filter(x=>x.loss>ERR).length/n):null,err300:n?r3(big.length/n):null,big:big.length,types}}
function styleStats(rows){const n=rows.length,f=k=>n?r3(rows.filter(x=>x.st[k]).length/n):null;return{n,cap:f("cap"),chk:f("chk"),exch:f("exch"),fwd:f("fwd"),def:f("def"),cross:n?r1(mean(rows.map(x=>x.st.cross))):null}}

async function run(){
  const ARG=process.argv.slice(2),arg=(k,d)=>{const i=ARG.indexOf(k);return i>=0?ARG[i+1]:d},has=k=>ARG.includes(k);
  const SEED=+arg("--seed",20261112),REPS=+arg("--reps",has("--fast")?2:8),PO_REPS=+arg("--po-reps",has("--fast")?1:2),PLY_CAP=+arg("--plies",40),REF_D=+arg("--ref-depth",16),WIN_D=10,DEF_D=12,FAST=has("--fast");
  const W=Math.max(1,Math.min(+arg("--workers",Math.min(6,os.cpus().length-2))||1,os.cpus().length-1)),OUT=arg("--out",OUT_DEF),T0=Date.now();
  console.log(`電腦對手透明測試：${CFGS.length} 種設定、${W} 個引擎（App 的網頁版 Pikafish，Threads=1）、參考深度 ${REF_D}${FAST?"（--fast 試跑）":""}`);
  const E=await Promise.all(Array.from({length:W},()=>newEngine()));
  try{
    /* 1. 局面 */
    let POS;if(fs.existsSync(POSF)&&!has("--regen"))POS=JSON.parse(fs.readFileSync(POSF,"utf8")).positions;
    else{console.log("抽局面…");POS=await makePositions(E,SEED);fs.mkdirSync(path.dirname(POSF),{recursive:true});
      fs.writeFileSync(POSF,JSON.stringify({note:"ai-batch.js 用的固定局面（許銀川對局集 site/data/xuyinchuan.json，種子 "+SEED+"）；fen＝XQCore.fen 格式；master＝大師在這個局面實際走的著法",seed:SEED,positions:POS},null,1)+"\n")}
    for(const p of POS){const[bs,sd]=p.fen.split(" ");p.b=C.parseFen(bs);p.s=sd==="w"?"r":"b";p.legal=C.legal(p.b,p.s).length}
    console.log(`局面 ${POS.length} 個：`+PHASES.map(ph=>ph+" "+POS.filter(p=>p.phase===ph).length).join("、"));
    /* 2. 參考最佳著 */
    const ref={};await pool(E,POS.map(p=>async e=>{const r=await e.search(p.fen,[],{depth:REF_D},1,true);ref[p.id]={mv:r.best,v:r.lines[0]?r.lines[0].v:0}}),"參考最佳著");
    /* 3. 每一級、每個局面：App 的搜尋設定搜一次，選步照等級抽 REPS 次（最佳著級只算 1 次） */
    const picks=[];const cost=c=>c.lv.movetime||(c.lv.nodes?5:c.lv.depth*2);
    const T3=[];for(const c of CFGS.slice().sort((a,b)=>cost(b)-cost(a)))for(const p of POS)T3.push(async e=>{const r=await e.search(p.fen,[],limOf(c,FAST),mpvOf(c),true);
      const n=detOf(c)?1:REPS;for(let k=0;k<n;k++){const R=rng(hashStr(`${SEED}|${c.key}|${p.id}|${k}`)),mv=pickOf(c,r,p.b,p.s,R),u=rng(hashStr(`${SEED}|t|${c.key}|${p.id}|${k}`))();
        const S={board:p.b,turn:p.s,moves:Array.from({length:plyOf(p)},()=>({f:-1,t:-1}))};
        picks.push({c:c.key,p:p.id,k,mv,ms:r.ms,nodes:r.nodes,depth:r.depth,think:Math.max(r.ms,TP.ms(S,mv,r,c.lv,"real",rng(hashStr(`${SEED}|tp|${c.key}|${p.id}|${k}`)))),thinkFast:Math.max(r.ms,CPU_MIN_MS+u*CPU_JIT_MS)})}});
    await pool(E,T3,"各級選步");
    /* 4. 每個被選到的著法（加大師著、參考著）：走完的局面用深度 REF_D−1 評分 */
    const need=new Map();const want=(p,mv)=>{if(mv&&!need.has(p.id+"|"+mv))need.set(p.id+"|"+mv,{p,mv})};
    for(const p of POS){want(p,ref[p.id].mv);want(p,p.master)}const PI=Object.fromEntries(POS.map(p=>[p.id,p]));for(const x of picks)want(PI[x.p],x.mv);
    const val={};await pool(E,[...need.values()].map(({p,mv})=>async e=>{const[f,t]=moveOf(mv);if(!C.legal(p.b,p.s).some(([x,y])=>x===f&&y===t)){val[p.id+"|"+mv]=null;return}
      const a=C.make(p.b,f,t),o=C.opp(p.s);if(!C.legal(a,o).length){val[p.id+"|"+mv]=29000;return}
      const r=await e.search(C.fen(a,o),[],{depth:REF_D-1},1,true);val[p.id+"|"+mv]=r.lines[0]?-r.lines[0].v:null}),"評每一步");
    const bestV={};for(const p of POS){let m=-Infinity;for(const[k,v]of Object.entries(val))if(k.startsWith(p.id+"|")&&v!=null&&v>m)m=v;bestV[p.id]=m}
    const rowOf=(p,mv)=>{const v=val[p.id+"|"+mv];if(v==null)return null;const loss=Math.max(0,cl(bestV[p.id])-cl(v));return{loss,v,type:loss>BIG?errType(p.b,p.s,mv,v,bestV[p.id]):null,st:styleOf(p.b,p.s,mv),phase:p.phase,lose:p.phase==="殘局"&&cl(bestV[p.id])<=LOSING}};
    for(const x of picks)Object.assign(x,rowOf(PI[x.p],x.mv)||{loss:null});
    /* 5. 殘局下下去：劣勢殘局（參考評分 ≤ −150）輸方＝受測設定，贏方＝引擎深度 WIN_D；最多 PLY_CAP 手 */
    const EG=POS.filter(p=>p.phase==="殘局"&&cl(bestV[p.id])<=LOSING),PO=[];
    const DEF={key:"DEF",name:"最頑強基準",lv:{depth:DEF_D},kind:"best"};
    const T5=[];for(const c of[...CFGS,DEF].sort((a,b)=>cost(b)-cost(a)))for(const p of EG)for(let k=0;k<(detOf(c)?1:PO_REPS);k++)T5.push(async e=>{
      const S={board:p.b.slice(),turn:p.s,pos:[p.fen],moves:[]},loser=p.s,us=[],R=rng(hashStr(`${SEED}|po|${c.key}|${p.id}|${k}`));let res=null,lm=0;
      await e.search(p.fen,[],{depth:1},1,true);
      for(let ply=0;ply<PLY_CAP;ply++){let mv;
        if(S.turn===loser){const r=await e.search(p.fen,us,limOf(c,FAST),mpvOf(c),false);mv=pickOf(c,r,S.board,S.turn,R);lm++}
        else{const r=await e.search(p.fen,us,{depth:WIN_D},1,false);mv=r.best}
        const[f,t]=moveOf(mv);if(!C.legal(S.board,S.turn).some(([x,y])=>x===f&&y===t))throw new Error(`對局 ${c.key} ${p.id} 不合法著法 ${mv}`);
        C.stateApply(S,f,t);us.push(mv);const j=C.judgeState(S);if(j){res=j;break}}
      let fv=null;if(!res){const r=await e.search(p.fen,us,{depth:DEF_D},1,false);const v=r.lines[0]?r.lines[0].v:0;fv=cl(S.turn===loser?v:-v)}
      PO.push({c:c.key,p:p.id,k,lost:!!(res&&res.w&&res.w!==loser),draw:!!(res&&!res.w),won:!!(res&&res.w===loser),why:res?res.why:null,lm,finalV:fv})});
    await pool(E,T5,"殘局對局");
    /* 6. 彙整 */
    const levels=CFGS.map(c=>{const X=picks.filter(x=>x.c===c.key&&x.loss!=null),k0=X.filter(x=>x.k===0),leg=x=>PI[x.p].legal;
      const ths=X.map(x=>x.think),P=PO.filter(x=>x.c===c.key);
      return{key:c.key,n:c.n,name:c.name,desc:c.n?LEVELS[c.n-1].desc:"笑面掌櫃最強檔（訓練循環校準的固定節點數）",engine:cfgText(c),mpv:mpvOf(c),picker:pickText(c),kind:c.kind,
        lv:{depth:c.lv.depth||null,movetime:c.lv.movetime||null,nodes:c.lv.nodes||null,multipv:c.lv.multipv||null,margin:c.lv.margin||null,hm:Number.isInteger(c.lv.hm)?c.lv.hm:null},
        think:{mean:r3(mean(ths)/1000),min:r3(Math.min(...ths)/1000),max:r3(Math.max(...ths)/1000),engMs:r1(mean(k0.map(x=>x.ms))),nodes:Math.round(mean(k0.map(x=>x.nodes))),depth:r1(mean(k0.map(x=>x.depth))),
          rThink:r3(pearson(X.map(leg),ths)),fastMean:r3(mean(X.map(x=>x.thinkFast))/1000),rEng:r3(pearson(k0.map(leg),k0.map(x=>x.ms)))},
        err:{...errStats(X),byPhase:Object.fromEntries(PHASES.map(ph=>[ph,errStats(X.filter(x=>x.phase===ph))]))},
        style:styleStats(X),
        endgame:{n:X.filter(x=>x.lose).length,stubborn:r3(mean(X.filter(x=>x.lose).map(x=>x.loss<=STUB?1:0))),meanLoss:r1(mean(X.filter(x=>x.lose).map(x=>x.loss)))},
        playout:{n:P.length,lost:r3(mean(P.map(x=>x.lost?1:0))),draw:r3(mean(P.map(x=>x.draw?1:0))),moves:r1(mean(P.map(x=>x.lm))),finalV:r1(mean(P.filter(x=>x.finalV!=null).map(x=>x.finalV))),survived:P.filter(x=>x.finalV!=null).length}}});
    const MR=POS.map(p=>rowOf(p,p.master)).filter(Boolean),RR=POS.map(p=>rowOf(p,ref[p.id].mv)).filter(Boolean),DP=PO.filter(x=>x.c==="DEF");
    const J={meta:{date:new Date().toISOString().slice(0,10),tool:"xiangqi-lab/tools/ai-batch.js",engine:"App 網頁版 Pikafish（site/engine/pikafish.wasm）在 Node "+process.version+" 裡跑，每個引擎 Threads=1、Hash=16MB",
        positions:path.relative(ROOT,POSF).replace(/\\/g,"/"),nPos:POS.length,byPhase:Object.fromEntries(PHASES.map(ph=>[ph,POS.filter(p=>p.phase===ph).length])),nLosingEnd:EG.length,
        seed:SEED,reps:REPS,poReps:PO_REPS,plyCap:PLY_CAP,refDepth:REF_D,winDepth:WIN_D,defDepth:DEF_D,workers:W,fast:FAST,cpuMinMs:CPU_MIN_MS,cpuJitMs:CPU_JIT_MS,wallSec:Math.round((Date.now()-T0)/1000),
        thresholds:{err:ERR,big:BIG,stubborn:STUB,losing:LOSING},cpus:os.cpus().length},
      levels,
      baselines:{master:{name:"大師實際著法",err:errStats(MR),style:styleStats(MR),endgame:{n:MR.filter(x=>x.lose).length,stubborn:r3(mean(MR.filter(x=>x.lose).map(x=>x.loss<=STUB?1:0))),meanLoss:r1(mean(MR.filter(x=>x.lose).map(x=>x.loss)))}},
        ref:{name:"引擎參考著（深度 "+REF_D+"）",style:styleStats(RR)},
        def:{name:"最頑強基準（深度 "+DEF_D+"）",playout:{n:DP.length,lost:r3(mean(DP.map(x=>x.lost?1:0))),draw:r3(mean(DP.map(x=>x.draw?1:0))),moves:r1(mean(DP.map(x=>x.lm))),finalV:r1(mean(DP.filter(x=>x.finalV!=null).map(x=>x.finalV))),survived:DP.filter(x=>x.finalV!=null).length}}},
      positions:POS.map(p=>({id:p.id,phase:p.phase,legal:p.legal,ref:ref[p.id].mv,refV:ref[p.id].v,bestV:bestV[p.id],master:p.master})),
      playouts:PO};
    J.monotone=monoCheck(J);
    fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify(J,null,1)+"\n");
    console.log(`完成，${J.meta.wallSec} 秒；結果：${OUT}`);console.log(mdTables(J).join("\n\n"))}
  finally{for(const e of E)e.close()}}

/* 單調性：照級數排，大失誤率、失誤率有沒有「高一級反而比較多」；只比挑戰電腦 18 級（平均損失在高段只差幾厘兵，是參考引擎的雜訊，不列） */
function monoCheck(J){const L=J.levels.filter(x=>x.n).sort((a,b)=>a.n-b.n),out=[];
  for(const k of["err300","err100"])for(let i=1;i<L.length;i++){const a=L[i-1].err[k],b=L[i].err[k];if(a!=null&&b!=null&&b>a)out.push({metric:k,from:L[i-1].n,to:L[i].n,a,b})}
  return out}

/* ---------- 透明頁用的表格（文件裡的表格要跟這裡印出來的一字不差，測試會比對） ---------- */
const pct=x=>x==null?"—":(100*x).toFixed(1)+"%",num=(x,d)=>x==null?"—":Number(x).toFixed(d),rr=x=>x==null?"—":(x>=0?"":"−")+Math.abs(x).toFixed(2);
const lvName=x=>x.n?`${x.n}｜${x.name}`:`—｜${x.name}`;
function mainTypes(e){const T=Object.entries(e.types||{}).sort((a,b)=>b[1]-a[1]);if(!e.big)return"—";return T.slice(0,2).map(([k,n])=>`${TYPES[k]} ${Math.round(100*n/e.big)}%`).join("、")}
function mdTables(J){const L=J.levels,B=J.baselines,t=[];
  t.push(["| 級｜名字 | 引擎設定 | 候選數 | 選步方式 |","|---|---|---|---|",...L.map(x=>`| ${lvName(x)} | ${x.engine} | ${x.mpv} | ${x.picker} |`)].join("\n"));
  t.push(["| 級｜名字 | App 等待（平均，最短～最長） | 引擎耗時 | 節點數 | 深度 | r（等待×合法著數） | r（引擎×合法著數） |","|---|---|---|---|---|---|---|",
    ...L.map(x=>`| ${lvName(x)} | ${num(x.think.mean,2)} 秒（${num(x.think.min,2)}～${num(x.think.max,2)}） | ${num(x.think.engMs,0)} 毫秒 | ${x.think.nodes} | ${num(x.think.depth,1)} | ${rr(x.think.rThink)} | ${rr(x.think.rEng)} |`)].join("\n"));
  const eRow=(nm,e)=>`| ${nm} | ${e.n} | ${num(e.meanLoss,0)} | ${pct(e.err100)} | ${pct(e.err300)} | ${PHASES.map(ph=>pct(e.byPhase?e.byPhase[ph].err300:null)).join("／")} | ${mainTypes(e)} |`;
  t.push(["| 級｜名字 | 樣本步數 | 平均損失（厘兵） | 失誤率（>100） | 大失誤率（>300） | 開局／中局／殘局大失誤率 | 大失誤主要型態 |","|---|---|---|---|---|---|---|",
    ...L.map(x=>eRow(lvName(x),x.err)),eRow("參考｜"+B.master.name,{...B.master.err,byPhase:null})].join("\n"));
  const sRow=(nm,s)=>`| ${nm} | ${pct(s.cap)} | ${pct(s.chk)} | ${pct(s.exch)} | ${pct(s.fwd)} | ${num(s.cross,1)} | ${pct(s.def)} |`;
  t.push(["| 級｜名字 | 吃子 | 將軍 | 兌子 | 前進 | 走後過河子數 | 動仕相帥 |","|---|---|---|---|---|---|---|",...L.map(x=>sRow(lvName(x),x.style)),sRow("參考｜"+B.master.name,B.master.style),sRow("參考｜"+B.ref.name,B.ref.style)].join("\n"));
  const pRow=(nm,eg,po)=>`| ${nm} | ${eg?pct(eg.stubborn):"—"} | ${eg?num(eg.meanLoss,0):"—"} | ${po?pct(po.lost):"—"} | ${po?pct(po.draw):"—"} | ${po?num(po.moves,1):"—"} | ${po?num(po.finalV,0):"—"} |`;
  t.push(["| 級｜名字 | 劣勢殘局選最頑強著 | 劣勢殘局平均損失 | 下下去被殺／判負 | 和局 | 平均撐住步數 | 撐到上限時評分 |","|---|---|---|---|---|---|---|",
    ...L.map(x=>pRow(lvName(x),x.endgame,x.playout)),pRow("參考｜"+B.master.name,B.master.endgame,null),pRow("參考｜"+B.def.name,null,B.def.playout)].join("\n"));
  return t}

module.exports={CFGS,LEVELS,RLV,HP,SP,TP,CPU_MIN_MS,CPU_JIT_MS,ZG_X_NODES,POSF,OUT_DEF,mdTables,monoCheck,errType,styleOf,pickOf,mpvOf,limOf,TYPES,pearson,rng,hashStr};
if(require.main===module){
  const i=process.argv.indexOf("--md");
  if(i>=0){const f=process.argv[i+1]&&!process.argv[i+1].startsWith("--")?process.argv[i+1]:OUT_DEF;console.log(mdTables(JSON.parse(fs.readFileSync(f,"utf8"))).join("\n\n"));process.exit(0)}
  run().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)})}
