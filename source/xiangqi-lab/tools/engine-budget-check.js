#!/usr/bin/env node
/* 引擎分析預算敏感度檢查（ChatGPT 第五次重評第三節第 2 題的「可選」工作；開發者 11/15 決定做）。只在電腦上離線跑：
   不改 App、不開瀏覽器、不呼叫任何 AI API、不新增任何資料收集。EBC_VER 1。
   問題：賽後評等是用「每個局面想 0.4 秒」的 Pikafish 算的（xiangqi-lab/site/core.js 的 ANALYZE_MS＝400，classifyRaw：先用 MultiPV 2 查走之前的局面，
     走的不是首選再用 MultiPV 1 查走完的局面）。同一盤棋，給引擎多一點時間，評語、分數、首選會變多少？——這是「分析可靠不可靠」的檢查。
   它不回答「分數有沒有量到棋力」（那要人類評閱）；特級大師的對局也不代表一般玩家或小朋友的棋。
   做法：
     ・棋局：xiangqi-db/gmgames.json（特級大師對局庫）裡標準開局、有勝負和、主線 40～120 手的盤，用固定種子抽幾十盤（抽樣結果只跟種子與盤數有關）。
     ・引擎：App 自己的網頁版 Pikafish（xiangqi-lab/site/engine/pikafish.js＋.wasm＋.nnue）在 Node 裡跑，載入方式參考 tools/siege-wheel-bench.js 的 newEngine（沒有動那一支）。
       Threads 1、Hash 16 MB、每次搜尋前 ucinewgame（清雜湊表）——所以同一個節點數重跑會得到同樣的結果。
     ・評等：呼叫 App 真正的 classifyRaw（core.js，原檔）；一盤的舊總分、評級與影子模式的 base／score／對照算法：用 vm 載入 xiangqi-db/m/05-settings.js 的 gameReport、mxShadowReport（原檔，唯讀）。
     ・預算用「節點數」不用「毫秒」：App 是 go movetime 400，但毫秒在不同機器、同時跑幾個程序時結果不一樣，沒辦法重跑。
       先用 --calib 在這台電腦上量「movetime 400 大約算幾個節點」（中位數）當成 app 那一檔；再比三檔：
         quarter＝app÷4（比這台電腦慢的裝置——手機的網頁版引擎通常慢好幾倍；到底慢多少沒有量過）、app、high＝app×4（「明顯較高的預算」）。
       classifyRaw 沒有 PV 時會用兩倍時間重查，這裡照比例給兩倍節點。
     ・每一盤雙方都評（每一方各算一個分數）；比較相鄰兩檔：每一步的評語、首選、殺棋標記；每一方的總分、評級、影子模式的 base／score／評級、首選一致率。
   用法：
     node xiangqi-lab/tools/engine-budget-check.js --calib [--seed 20261115] [--games 36]            量 movetime 400 的節點數（單獨跑，不要同時跑別的）
     node xiangqi-lab/tools/engine-budget-check.js --run --out 資料夾 --app 節點數 [--games 36] [--seed 20261115] [--part 1/6] [--max-min 7] [--tiers quarter,app,high]
         每盤存一個 JSON（g###.json；已經有的跳過，所以可以分好幾次、好幾個程序接著跑）；--part i/n 只跑第 i 份；超過 --max-min 分鐘就把做到哪一手存成 p###.json 然後停，下次接著做（每次搜尋前都清雜湊表，結果跟中斷在哪裡無關）。
     node xiangqi-lab/tools/engine-budget-check.js --report 資料夾 [--md 檔.md] [--json 檔.json]
   重跑一樣的數字：同樣的 --seed、--games、--app，同樣的引擎檔與 core.js、05-settings.js（--report 會列它們的雜湊）。 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),crypto=require("crypto");
const ROOT=path.join(__dirname,"..",".."),LAB=path.join(ROOT,"xiangqi-lab"),EDIR=path.join(LAB,"site","engine"),DBD=path.join(ROOT,"xiangqi-db");
const C=require(path.join(LAB,"site","core.js"));
const EBC_VER=1,THREADS=1,HASH=16,MIN_PLY=40,MAX_PLY=120,TIERS={quarter:.25,app:1,high:4},QS=["妙著","正著","穩著","緩著","失著","敗著"];
/* ---------- 小工具 ---------- */
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
const sha=f=>crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex"),shaS=s=>crypto.createHash("sha256").update(s,"utf8").digest("hex");
const qt=(a,p)=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),h=(s.length-1)*p,i=Math.floor(h);return s[i]+(h-i)*(s[Math.min(s.length-1,i+1)]-s[i])};
const r1=v=>v==null?null:Math.round(v*10)/10,r2=v=>v==null?null:Math.round(v*100)/100,mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null,pct=(k,n)=>n?r1(100*k/n):null;
/* ---------- 抽棋局：只跟種子與盤數有關 ---------- */
function eligible(g){const mv=g&&g.lines&&g.lines[0]&&g.lines[0].moves;return!!mv&&!g.board&&["紅勝","黑勝","和局"].includes(g.result)&&mv.length>=MIN_PLY&&mv.length<=MAX_PLY}
function sample(items,n,seed){const idx=[];items.forEach((g,i)=>{if(eligible(g))idx.push(i)});const R=rng(seed),pick=[];const pool=idx.slice();
  while(pick.length<n&&pool.length){const k=Math.floor(R()*pool.length);pick.push(pool[k]);pool[k]=pool[pool.length-1];pool.pop()}
  return{pool:idx.length,games:pick.sort((a,b)=>a-b).map(i=>items[i])}}
const winnerOf=g=>g.result==="紅勝"?"r":g.result==="黑勝"?"b":"";
/* ---------- App 的網頁版 Pikafish（在 Node 裡跑）；lim：{nodes}｜{movetime}｜{depth}。每次搜尋前 ucinewgame ---------- */
async function newEngine(o){   /* o.keepHash＝搜尋之間不清雜湊表（App 實際上就是留著的；tools/engine-budget-pgn.js 的對照檔用），要清的時候呼叫 newGame()。不給＝每次搜尋前都清，跟原本一樣 */
  const KEEP=!!(o&&o.keepHash);
  const PM=require(path.join(EDIR,"pikafish.js")),NNUE=fs.readFileSync(path.join(EDIR,"pikafish.nnue"));
  let waiters=[];const onLine=l=>{for(const w of waiters.slice())w(l)};
  const mod=await PM({arguments:[],locateFile:f=>path.join(EDIR,f),mainScriptUrlOrBlob:path.join(EDIR,"pikafish.js"),print:onLine,printErr:()=>{},preRun:[m=>m.FS.writeFile("/pikafish.nnue",NNUE)]});
  const send=c=>mod.ccall("uci_command",null,["string"],[c]);
  const until=(pred,each)=>new Promise(res=>{const w=l=>{if(each)each(l);if(pred(l)){waiters=waiters.filter(x=>x!==w);res(l)}};waiters.push(w)});
  const ask=(c,pred,each)=>{const p=until(pred,each);send(c);return p};
  await ask("uci",l=>l==="uciok");send("setoption name Threads value "+THREADS);send("setoption name Hash value "+HASH);await ask("isready",l=>l==="readyok");
  const st={n:0,nodes:0,nopv:0};let q=Promise.resolve();
  function search(pos,lim,multipv){const job=async()=>{if(!KEEP){send("ucinewgame");await ask("isready",l=>l==="readyok")}st.n++;
      send("setoption name MultiPV value "+(multipv||1));send("position fen "+pos.fen+" - - 0 1");
      const info=new Map();let nodes=0,depth=0;
      const best=await ask(lim.nodes?"go nodes "+lim.nodes:lim.movetime?"go movetime "+lim.movetime:"go depth "+lim.depth,l=>l.startsWith("bestmove"),l=>{if(!l.startsWith("info "))return;
        const nd=l.match(/ nodes (\d+)/);if(nd)nodes=Math.max(nodes,+nd[1]);if(!l.includes(" pv "))return;
        const m=l.match(/ multipv (\d+)/),sc=l.match(/ score (cp|mate) (-?\d+)/),pv=l.match(/ pv (.+)$/),dp=l.match(/ depth (\d+)/);if(!sc||!pv)return;
        let v=+sc[2];if(sc[1]==="mate")v=v>0?30000-v:-30000-v;const pvs=pv[1].trim().split(/\s+/);if(dp)depth=Math.max(depth,+dp[1]);
        info.set(m?+m[1]:1,{k:m?+m[1]:1,v,mv:pvs[0],pv:pvs,depth:dp?+dp[1]:null,mate:sc[1]==="mate"?+sc[2]:null})});
      st.nodes+=nodes;if(!info.size)st.nopv++;
      return{best:best.split(/\s+/)[1],lines:[...info.values()].sort((a,b)=>a.k-b.k),nopv:!info.size,nodes,depth}};
    const r=q.then(job);q=r.catch(()=>{});return r}
  const newGame=()=>{const r=q.then(async()=>{send("ucinewgame");await ask("isready",l=>l==="readyok")});q=r.catch(()=>{});return r};
  return{search,st,newGame,close(){try{send("quit")}catch(e){}}}}
/* ---------- App 的賽後報告與影子模式（m/05-settings.js 原檔的一段，唯讀） ---------- */
const SETTINGS=path.join(DBD,"m","05-settings.js");
function loadReport(file){const S=fs.readFileSync(file||SETTINGS,"utf8").replace(/\r\n/g,"\n"),i=S.indexOf("const GRADES="),j=S.indexOf("\n/* ChatGPT 數值盤查 11/11 P1：一步的殺棋訊號",i);if(i<0||j<i)throw new Error("05-settings.js 找不到 GRADES…gameReport 那一段");
  const sqI=s=>(9-(+s[1]))*9+(s.charCodeAt(0)-97),ctx={console,isFinite,Math,JSON,XQCore:C,sqI,esc:x=>String(x),talk:()=>[]};ctx.window=ctx;vm.createContext(ctx);
  vm.runInContext(S.slice(i,j)+";this.R={MXS,gameReport,mxShadowReport}",ctx,{filename:"05-settings(賽後報告＋影子模式)"});return{...ctx.R,sha:shaS(S.slice(i,j))}}
/* ---------- 一盤、一個預算：照 App 的 classifyRaw 逐步評等，再算兩方的分數 ----------
   evalFn(board, side, ms, multipv)＝core.js 要的 evalPos（回 {lines,dead}）。回 {moves:[每一步的評等], sides:{r,b}, searches, nodes} */
async function analyzeGame(g,evalFn,A,o){o=o||{};   /* o.resume＝上次做到一半存下來的 {moves,searches,nodes,depth,ms}；o.deadline＝到這個時間（毫秒）就停，回 {partial:…} */
  /* g.start（90 格的盤面陣列）＋g.startTurn＝不是標準開局的盤（tools/engine-budget-pgn.js 讀 PGN 的 [FEN] 用）；沒給就是標準開局紅先，跟原本一樣 */
  const R=o.resume||{moves:[],searches:0,nodes:0,depth:[],ms:0},prev=global.evalPos,t0=Date.now(),all=g.lines[0].moves,B0=()=>g.start?g.start.slice():C.parseFen(C.START);let b=B0(),s=g.startTurn||"r",lt=null;const moves=R.moves.slice(),st={searches:R.searches,nodes:R.nodes,depth:R.depth.slice()};
  for(const m of moves){b=C.make(b,m.f,m.t);lt=m.t;s=C.opp(s)}
  global.evalPos=async(bd,sd,ms,mpv)=>{const r=await evalFn(bd,sd,ms,mpv);st.searches++;if(r&&r.nodes)st.nodes+=r.nodes;if(r&&r.depth)st.depth.push(r.depth);return r};
  try{for(let i=moves.length;i<all.length;i++){if(o.deadline&&Date.now()>o.deadline)return{partial:{moves,searches:st.searches,nodes:st.nodes,depth:st.depth,ms:R.ms+Date.now()-t0}};
      const[f,t]=all[i],c=await C.classifyRaw(b,s,f,t,undefined,lt);if(!c)break;
      moves.push({f,t,by:s,q:c.q,loss:c.loss,ev:c.ev,bv:c.bv,bmt:c.bmt,pmt:c.pmt,bm:c.bm,hit:c.bm===C.iccs(f,t)?1:0});b=C.make(b,f,t);lt=t;s=C.opp(s)}}
  finally{global.evalPos=prev}
  const rep=A.gameReport(B0(),moves),sh=A.mxShadowReport(rep,winnerOf(g)),sides={};
  for(const k of["r","b"]){const R2=rep.sides[k],X=sh[k];sides[k]=R2&&R2.score!=null&&X?{old:R2.score,oldG:R2.grade[0],oldBase:r2(R2.base),base:r2(X.base),raw:X.raw,s0:X.s0,score:X.score,grade:X.grade,acpl:X.alt.acpl,mm:X.alt.mm,er:X.alt.er,n:X.n,labels:X.mv.map(v=>v.q)}:null}
  return{moves,sides,searches:st.searches,nodes:st.nodes,depthMed:qt(st.depth,.5),ms:R.ms+Date.now()-t0}}
/* 引擎＋節點預算 → evalFn；沒有合法著＝終局（跟 src/local.js 的 window.evalPos 一樣） */
const evalWith=(E,nodes)=>async(b,s,ms,mpv)=>{if(!C.legal(b,s).length)return{lines:[],dead:true};return E.search({fen:C.fen(b,s)},{nodes:Math.max(1,Math.round(nodes*((ms||C.ANALYZE_MS)/C.ANALYZE_MS)))},mpv||1)};
/* ---------- 比較兩個預算（同一批盤） ---------- */
const GR="SABCD",mate=v=>v==null?0:v>0?1:-1,BIG=q=>q==="失著"||q==="敗著";
/* 等級相關（同分取平均等級）：看各方分數的排序在兩個預算之間穩不穩 */
function spearman(x,y){const n=x.length;if(n<3)return null;const rk=a=>{const o=a.map((v,i)=>[v,i]).sort((p,q)=>p[0]-q[0]),r=new Array(n);for(let i=0;i<n;){let j=i;while(j+1<n&&o[j+1][0]===o[i][0])j++;for(let k=i;k<=j;k++)r[o[k][1]]=(i+j)/2+1;i=j+1}return r},a=rk(x),b=rk(y),m=(n+1)/2;let sab=0,saa=0,sbb=0;for(let i=0;i<n;i++){sab+=(a[i]-m)*(b[i]-m);saa+=(a[i]-m)**2;sbb+=(b[i]-m)**2}return saa>0&&sbb>0?Math.round(1000*sab/Math.sqrt(saa*sbb))/1000:null}
function compare(games,lo,hi){
  const P={n:0,qSame:0,q2:0,bigLo:0,bigHi:0,bigBoth:0,bmSame:0,hitLo:0,hitHi:0,bmtSame:0,pmtSame:0,mateAny:0,dLoss:[],dEv:[],shSame:0,shN:0,trans:{}},Sd=[];
  for(const g of games){const a=g.tiers[lo],b=g.tiers[hi];if(!a||!b)continue;const n=Math.min(a.moves.length,b.moves.length);
    for(let i=0;i<n;i++){const x=a.moves[i],y=b.moves[i];P.n++;if(x.q===y.q)P.qSame++;else{const k=x.q+"→"+y.q;P.trans[k]=(P.trans[k]||0)+1}if(Math.abs(QS.indexOf(x.q)-QS.indexOf(y.q))>=2)P.q2++;if(BIG(x.q))P.bigLo++;if(BIG(y.q))P.bigHi++;if(BIG(x.q)&&BIG(y.q))P.bigBoth++;
      if(x.bm===y.bm)P.bmSame++;P.hitLo+=x.hit;P.hitHi+=y.hit;if(mate(x.bmt)!==0||mate(y.bmt)!==0||mate(x.pmt)!==0||mate(y.pmt)!==0)P.mateAny++;if(mate(x.bmt)===mate(y.bmt))P.bmtSame++;if(mate(x.pmt)===mate(y.pmt))P.pmtSame++;
      P.dLoss.push(Math.abs(x.loss-y.loss));P.dEv.push(Math.abs(C.clampV(x.ev)-C.clampV(y.ev)))}
    for(const k of["r","b"]){const u=a.sides[k],v=b.sides[k];if(!u||!v)continue;const m=Math.min(u.labels.length,v.labels.length);for(let i=0;i<m;i++){P.shN++;if(u.labels[i]===v.labels[i])P.shSame++}
      Sd.push({id:g.id,name:g.name,side:k,plies:g.plies,result:g.result,old:[u.old,v.old],oldG:[u.oldG,v.oldG],base:[u.base,v.base],score:[u.score,v.score],grade:[u.grade,v.grade],mm:[u.mm,v.mm],acpl:[u.acpl,v.acpl],er:[u.er,v.er]})}}
  const d=k=>Sd.map(x=>x[k][1]-x[k][0]),ab=a=>a.map(Math.abs),st=k=>{const a=d(k);return{mean:r2(mean(a)),meanAbs:r2(mean(ab(a))),med:r2(qt(ab(a),.5)),p90:r2(qt(ab(a),.9)),max:r2(Math.max(0,...ab(a)))}};
  const flip=k=>Sd.filter(x=>x[k][0]!==x[k][1]).length,flip2=k=>Sd.filter(x=>Math.abs(GR.indexOf(x[k][0])-GR.indexOf(x[k][1]))>=2).length,up=k=>Sd.filter(x=>GR.indexOf(x[k][1])<GR.indexOf(x[k][0])).length;
  const unstable=Sd.map(x=>({...x,dOld:x.old[1]-x.old[0],dScore:x.score[1]-x.score[0],dBase:r2(x.base[1]-x.base[0])})).sort((p,q)=>Math.max(Math.abs(q.dOld),Math.abs(q.dScore))-Math.max(Math.abs(p.dOld),Math.abs(p.dScore))).slice(0,10);
  const tr=Object.entries(P.trans).sort((p,q)=>q[1]-p[1]).slice(0,8);
  return{lo,hi,games:new Set(Sd.map(x=>x.id)).size,sides:Sd.length,
    ply:{n:P.n,labelSame:pct(P.qSame,P.n),label2:pct(P.q2,P.n),big:{lo:P.bigLo,hi:P.bigHi,both:P.bigBoth,onlyLo:P.bigLo-P.bigBoth,onlyHi:P.bigHi-P.bigBoth},shadowLabelSame:pct(P.shSame,P.shN),bestSame:pct(P.bmSame,P.n),hit:[pct(P.hitLo,P.n),pct(P.hitHi,P.n)],mateAny:P.mateAny,bmtSame:pct(P.bmtSame,P.n),pmtSame:pct(P.pmtSame,P.n),bmtDiff:P.n-P.bmtSame,pmtDiff:P.n-P.pmtSame,
      dLoss:{med:r1(qt(P.dLoss,.5)),p90:r1(qt(P.dLoss,.9)),over30:pct(P.dLoss.filter(x=>x>=30).length,P.n)},dEv:{med:r1(qt(P.dEv,.5)),p90:r1(qt(P.dEv,.9))},trans:tr},
    side:{old:st("old"),base:st("base"),score:st("score"),mm:st("mm"),acpl:st("acpl"),er:st("er"),oldFlip:pct(flip("oldG"),Sd.length),oldFlip2:pct(flip2("oldG"),Sd.length),oldUp:pct(up("oldG"),Sd.length),gradeFlip:pct(flip("grade"),Sd.length),gradeFlip2:pct(flip2("grade"),Sd.length),gradeUp:pct(up("grade"),Sd.length),
      oldFlipN:flip("oldG"),gradeFlipN:flip("grade"),rho:{old:spearman(Sd.map(x=>x.old[0]),Sd.map(x=>x.old[1])),base:spearman(Sd.map(x=>x.base[0]),Sd.map(x=>x.base[1])),score:spearman(Sd.map(x=>x.score[0]),Sd.map(x=>x.score[1])),mm:spearman(Sd.map(x=>x.mm[0]),Sd.map(x=>x.mm[1]))}},unstable}}
/* ---------- 報表 ---------- */
function loadDir(dir){const F=fs.readdirSync(dir).filter(f=>/^g\d+\.json$/.test(f)).sort();return F.map(f=>JSON.parse(fs.readFileSync(path.join(dir,f),"utf8")))}
function meta(){const o={};for(const f of["pikafish.js","pikafish.wasm","pikafish.nnue"])o["xiangqi-lab/site/engine/"+f]=sha(path.join(EDIR,f));o["xiangqi-lab/site/core.js"]=sha(path.join(LAB,"site","core.js"));o["xiangqi-db/gmgames.json"]=sha(path.join(DBD,"gmgames.json"));return o}
function report(games,cfg){
  const L=[],P=s=>L.push(s),f=v=>v==null?"—":v,done=games.filter(g=>cfg.tiers.every(t=>g.tiers[t])),pairs=[];for(let i=0;i+1<cfg.tiers.length;i++)pairs.push(compare(done,cfg.tiers[i],cfg.tiers[i+1]));if(cfg.tiers.length>2)pairs.push(compare(done,cfg.tiers[0],cfg.tiers[cfg.tiers.length-1]));   /* 最後多一組：最低檔直接比最高檔 */
  const TN={quarter:`app÷4（${Math.round(cfg.app/4)} 節點）`,app:`app（${cfg.app} 節點）`,high:`app×4（${cfg.app*4} 節點）`};
  P(`# 引擎分析預算敏感度：結果（EBC_VER ${EBC_VER}）`);P("");
  P(`- 棋局：特級大師對局庫裡標準開局、有勝負和、主線 ${MIN_PLY}～${MAX_PLY} 手的 ${cfg.pool} 盤，種子 ${cfg.seed} 抽 ${cfg.games} 盤；三檔都跑完的 **${done.length} 盤**（${done.reduce((s,g)=>s+g.plies,0)} 手），每盤雙方各算一個分數＝${pairs[0]?pairs[0].sides:0} 個「一方」。`);
  P(`- 預算（每個局面的節點數）：${cfg.tiers.map(t=>TN[t]).join("、")}。app 那一檔＝這台電腦上「go movetime ${C.ANALYZE_MS}」（App 賽後評等的設定）算到的節點數的中位數（--calib 量的）。`);
  P(`- 引擎設定：Threads ${THREADS}、Hash ${HASH} MB、每次搜尋前 ucinewgame；Node ${cfg.node||process.version}。影子模式 MXS v${cfg.mxs}。`);
  for(const t of cfg.tiers){const G=done.map(g=>g.tiers[t]);P(`- ${TN[t]}：搜尋 ${G.reduce((s,x)=>s+x.searches,0)} 次、實際節點中位數／次 約 ${Math.round(qt(G.map(x=>x.nodes/Math.max(1,x.searches)),.5))}、搜尋深度的中位數 ${f(r1(qt(G.map(x=>x.depthMed).filter(x=>x!=null),.5)))}、耗時 ${r1(G.reduce((s,x)=>s+x.ms,0)/60000)} 分鐘`)}
  P("");P("## 每一步（相鄰兩檔比；最後一列是最低檔直接比最高檔）");P("| 比較 | 步數 | 評語相同 % | 評語差兩級以上 % | 影子評語相同 % | 引擎首選相同 % | 走的是首選 %（低→高） | 少掉的分數差：中位數／90 分位（差 ≥30 分的 %） | 有殺棋訊號的步 | 「最佳著是殺棋」不一致的步 | 「走完是殺棋」不一致的步 |");P("|---|---|---|---|---|---|---|---|---|---|---|");
  for(const c of pairs)P(`| ${c.lo} → ${c.hi} | ${c.ply.n} | ${c.ply.labelSame} | ${c.ply.label2} | ${c.ply.shadowLabelSame} | ${c.ply.bestSame} | ${c.ply.hit[0]} → ${c.ply.hit[1]} | ${c.ply.dLoss.med}／${c.ply.dLoss.p90}（${c.ply.dLoss.over30}） | ${c.ply.mateAny} | ${c.ply.bmtDiff} | ${c.ply.pmtDiff} |`);
  for(const c of pairs)P(`- ${c.lo} → ${c.hi} 的失著、敗著：低預算標了 ${c.ply.big.lo} 步、高預算標了 ${c.ply.big.hi} 步，兩邊都標的 ${c.ply.big.both} 步（只有低預算標 ${c.ply.big.onlyLo}、只有高預算標 ${c.ply.big.onlyHi}）`);
  for(const c of pairs)P(`- ${c.lo} → ${c.hi} 最常見的評語變動：${c.ply.trans.map(([k,v])=>`${k} ${v} 步`).join("、")||"沒有"}`);
  P("");P("## 每一方的一盤分數（差＝高預算 − 低預算）");P("| 比較 | 幾個一方 | 畫面的舊總分：平均差／平均絕對差／90 分位／最大 | 舊評級換級 %（差兩級以上 %；變高的 %） | 影子 base：平均差／平均絕對差／90 分位／最大 | 影子 score：平均絕對差／90 分位／最大 | 影子評級換級 %（差兩級以上 %） | 首選一致率：平均差／平均絕對差 | ACPL 平均絕對差 | 失誤率平均絕對差 |");P("|---|---|---|---|---|---|---|---|---|---|");
  for(const c of pairs){const s=c.side;P(`| ${c.lo} → ${c.hi} | ${c.sides} | ${s.old.mean}／${s.old.meanAbs}／${s.old.p90}／${s.old.max} | ${s.oldFlip}（${s.oldFlip2}；${s.oldUp}） | ${s.base.mean}／${s.base.meanAbs}／${s.base.p90}／${s.base.max} | ${s.score.meanAbs}／${s.score.p90}／${s.score.max} | ${s.gradeFlip}（${s.gradeFlip2}） | ${s.mm.mean}／${s.mm.meanAbs} | ${s.acpl.meanAbs} | ${s.er.meanAbs} |`)}
  for(const c of pairs)P(`- ${c.lo} → ${c.hi} 各方分數的排序穩不穩（等級相關）：舊總分 ${f(c.side.rho.old)}、影子 base ${f(c.side.rho.base)}、影子 score ${f(c.side.rho.score)}、首選一致率 ${f(c.side.rho.mm)}`);
  for(const c of pairs){P("");P(`## 最不穩定的 10 個一方（${c.lo} → ${c.hi}）`);P("| 對局 | 哪一方 | 手數 | 結果 | 舊總分（評級） | 影子 score（評級） | 影子 base | 首選一致率 |");P("|---|---|---|---|---|---|---|---|");
    for(const u of c.unstable)P(`| ${u.id} ${u.name||""} | ${u.side==="r"?"紅":"黑"} | ${u.plies} | ${u.result} | ${u.old[0]}（${u.oldG[0]}）→ ${u.old[1]}（${u.oldG[1]}） | ${u.score[0]}（${u.grade[0]}）→ ${u.score[1]}（${u.grade[1]}） | ${u.base[0]} → ${u.base[1]} | ${f(u.mm[0])} → ${f(u.mm[1])} |`)}
  P("");P("## 檔案雜湊（SHA-256）");for(const[k,v]of Object.entries(cfg.sha||{}))P(`- \`${k}\`：\`${v}\``);if(cfg.settingsSha)P(`- \`xiangqi-db/m/05-settings.js\` 的 GRADES…gameReport 那一段：\`${cfg.settingsSha}\``);
  P(`- 抽到的對局：${done.map(g=>g.id).join("、")}`);
  return{md:L.join("\n"),pairs,done:done.length}}
/* ---------- 主程式 ---------- */
async function main(){
  const argv=process.argv.slice(2),opt=(k,d)=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:d},has=k=>argv.includes(k);
  if(has("--report")){const dir=path.resolve(opt("--report")),cfg=JSON.parse(fs.readFileSync(path.join(dir,"config.json"),"utf8")),R=report(loadDir(dir),cfg);console.log(R.md);if(opt("--md"))fs.writeFileSync(path.resolve(opt("--md")),R.md+"\n");if(opt("--json"))fs.writeFileSync(path.resolve(opt("--json")),JSON.stringify({cfg,pairs:R.pairs},null,1));return}
  const seed=+opt("--seed",20261115),n=+opt("--games",36),items=JSON.parse(fs.readFileSync(path.join(DBD,"gmgames.json"),"utf8")).items,S=sample(items,n,seed);
  if(has("--calib")){const E=await newEngine(),R=rng(seed+1),N=[],D=[];for(const g of S.games.slice(0,24)){let b=C.parseFen(C.START),s="r";const mv=g.lines[0].moves,at=new Set([Math.floor(R()*20)+8,Math.floor(R()*20)+30]);
      for(let i=0;i<mv.length;i++){if(at.has(i)){const r=await E.search({fen:C.fen(b,s)},{movetime:C.ANALYZE_MS},2);N.push(r.nodes);D.push(r.depth)}b=C.make(b,mv[i][0],mv[i][1]);s=C.opp(s)}}
    E.close();console.log(JSON.stringify({positions:N.length,movetime:C.ANALYZE_MS,nodes:{q10:Math.round(qt(N,.1)),median:Math.round(qt(N,.5)),q90:Math.round(qt(N,.9))},depth:{q10:qt(D,.1),median:qt(D,.5),q90:qt(D,.9)},suggestApp:Math.round(qt(N,.5)/10000)*10000},null,1));return}
  if(!has("--run")||!opt("--out")||!opt("--app")){console.error("用法見檔頭：--calib｜--run --out 資料夾 --app 節點數｜--report 資料夾");process.exit(1)}
  const dir=path.resolve(opt("--out")),app=+opt("--app"),tiers=String(opt("--tiers","quarter,app,high")).split(","),[pi,pn]=String(opt("--part","1/1")).split("/").map(Number),maxMs=+opt("--max-min",7)*60000,t0=Date.now();
  fs.mkdirSync(dir,{recursive:true});const A=loadReport(),cf=path.join(dir,"config.json");
  if(!fs.existsSync(cf))fs.writeFileSync(cf,JSON.stringify({ver:EBC_VER,seed,games:n,pool:S.pool,app,tiers,threads:THREADS,hash:HASH,mxs:A.MXS.ver,node:process.version,sha:meta(),settingsSha:A.sha,ids:S.games.map(g=>g.id)},null,1));
  const E=await newEngine(),deadline=t0+maxMs;let did=0,stopped=false;
  for(let gi=0;gi<S.games.length&&!stopped;gi++){if(gi%pn!==pi-1)continue;const g=S.games[gi],nm=String(gi).padStart(3,"0"),fp=path.join(dir,"g"+nm+".json"),pp=path.join(dir,"p"+nm+".json");if(fs.existsSync(fp))continue;if(Date.now()>deadline)break;
    /* p###.json＝做到一半的盤（已經做完的那幾檔＋正在做的那一檔做到第幾手）；整盤做完才寫 g###.json */
    const out=fs.existsSync(pp)?JSON.parse(fs.readFileSync(pp,"utf8")):{i:gi,id:g.id,name:g.name,result:g.result,plies:g.lines[0].moves.length,tiers:{},cur:null};
    for(const t of tiers){if(out.tiers[t])continue;const r=await analyzeGame(g,evalWith(E,app*TIERS[t]),A,{resume:out.cur&&out.cur.tier===t?out.cur.partial:null,deadline});
      if(r.partial){out.cur={tier:t,partial:r.partial};fs.writeFileSync(pp,JSON.stringify(out));console.log(`part ${pi}/${pn}：第 ${gi} 盤 ${g.id} 做到 ${t} 第 ${r.partial.moves.length}／${out.plies} 手，時間到，先存起來`);stopped=true;break}
      out.tiers[t]=r;out.cur=null;fs.writeFileSync(pp,JSON.stringify(out))}
    if(stopped)break;delete out.cur;fs.writeFileSync(fp,JSON.stringify(out));try{fs.unlinkSync(pp)}catch(e){}did++;console.log(`part ${pi}/${pn}：第 ${gi} 盤 ${g.id}（${out.plies} 手）完成，${Math.round((Date.now()-t0)/1000)} 秒`)}
  E.close();console.log(`part ${pi}/${pn} 這次做完 ${did} 盤`)}
if(require.main===module)main().then(()=>process.exit(0),e=>{console.error(e);process.exit(1)});   /* 引擎的 wasm 會讓事件迴圈一直活著，跑完要自己結束 */
module.exports={EBC_VER,MIN_PLY,MAX_PLY,TIERS,rng,eligible,sample,winnerOf,newEngine,loadReport,analyzeGame,evalWith,compare,report,loadDir,meta};
