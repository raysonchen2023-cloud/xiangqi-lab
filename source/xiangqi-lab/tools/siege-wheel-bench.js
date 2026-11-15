#!/usr/bin/env node
/* 黑洞・星門圍城＋車輪戰「真引擎基準」（第 19 輪外部評審改善清單第 8 項，11/15）。只用 node：不開任何瀏覽器、不呼叫任何 AI API、不改 App 的檔。
   星樞（電腦對手）＝App 實際的程式：
     - 用 vm 直接載入 xiangqi-db/m/07bht-td.js、07bhg-gatesiege.js、07bhw-wheel.js 原檔（給一個假的 window，接線 window.XQ_TD 也是 App 自己包的那一層）。
     - 星門圍城照 xiangqi-lab/src/local.js 的 playEngine／playApply 同樣的順序叫：XQ_TD.engine → Pikafish（go depth N、MultiPV 8、定身時帶 searchmoves）→ XQ_TD.pick → stateApply → XQ_TD.move → judgeState。
     - 車輪戰直接叫 WHL.newMatch／WHL.move／WHL.cast／WHL.step（App 的 whlPump 也是叫 WHL.step），三盤跑到 M.over（三盤拿兩勝或已經不可能）。
     - 引擎＝App 自己的網頁版 Pikafish（xiangqi-lab/site/engine/pikafish.js＋.wasm＋.nnue），指令格式照 xiangqi-lab/src/engine.js 的 search()。
   跟 App 不一樣（為了同一個種子能重跑出同一個結果；完整清單在 story/黑洞星門圍城與車輪戰_引擎基準_1115.md）：
     - Threads 固定 1（App 是 1～4，看裝置）、Hash 16 MB（App：iOS 16、其他 64）、預設每次搜尋前 ucinewgame（--tt game 改成一局清一次）。
     - 星樞選步的小亂數（GSV.pick 的 rnd）App 用 Math.random，這裡用固定種子的亂數。
     - 車輪戰引擎逾時（App 5 秒就退回規則評估）這裡放寬到 10 分鐘，等於不逾時；每局記下每一步是引擎給的還是規則退路。
     - 回合上限（星門圍城 60 回合、車輪戰 80 總輪）是這支工具才有的截斷，不是遊戲規則；被截斷的局另外記成 cut。
   玩家那一邊是自動下法，不是人：
     greedy＝貪心吃子（不用引擎、不放招、不部署）；engN＝Pikafish 搜尋 N 層的象棋最佳步（不放招、不部署、不看塔防）；
     td＝塔防評估（引擎深度同那一關的星樞＋回援、拆陣、擋星門、取消大招、放招、部署；照 gate-siege-sim.js 的 smart --v2 移植）。
   這些數字只能比「同一種自動下法在各關之間誰難誰易」，不能換算成真人勝率；真人難度與遊玩時長要另外由開發者驗證。
   用法：
     node xiangqi-lab/tools/siege-wheel-bench.js --mode siege --lv 1,2,3 --ver normal,hard --players greedy,eng4,td --seeds 20 --out tmp/siege-wheel-bench/a.json
     node xiangqi-lab/tools/siege-wheel-bench.js --mode wheel --players greedy,eng4,td --seeds 20 --out tmp/siege-wheel-bench/wheel.json
     node xiangqi-lab/tools/siege-wheel-bench.js --report tmp/siege-wheel-bench/base --md tmp/siege-wheel-bench/base/摘要.md      合併資料夾裡所有結果出總表
   下法後面加 @N（例如 --players td@2）＝開局變化：每一盤玩家的前 N 個主要行動在「不白送子」的步裡隨機走，之後才照那種下法。
   其他參數：--seed0 1（起始種子）、--L 1（修為等級）、--tt move|game、--patch 檔.json、--set "LV.3.atk=95;HARD.atk=5"（臨時覆寫數值試算，只改記憶體裡那一份）、--md 檔.md、--quiet */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm"),crypto=require("crypto");
const ROOT=path.join(__dirname,"..",".."),LAB=path.join(ROOT,"xiangqi-lab"),MDIR=path.join(ROOT,"xiangqi-db","m"),EDIR=path.join(LAB,"site","engine");
const C=require(path.join(LAB,"site","core.js"));
const APP_FILES=["07bht-td.js","07bhg-gatesiege.js","07bhw-wheel.js"];
const TOOL="xiangqi-lab/tools/siege-wheel-bench.js",SCHEMA="siege-wheel-bench-v1";
const RED_MPV=8,MAX_RND=60,MAX_PLY=400,WHEEL_MAX_R=80,WHEEL_MAX_ACT=900,WHEEL_TMO=600000,HANG_W=70,HIT_K=.5;
const NOTE="自動下法對星樞的結果，不是真人；不能換算成真人勝率。真人難度與遊玩時長要另外由開發者驗證。";
const PLAYER_DOC={greedy:"貪心吃子：能吃就吃基礎值最大的；沒子可吃就在「不白送子」的步裡隨機走。不用引擎、不放招、不部署。",
  eng:"engN：Pikafish 搜尋 N 層（MultiPV 1）的象棋最佳步。不放招、不部署、不看塔防（入侵、護陣、星門、大招都不管）。",
  td:"塔防評估：Pikafish 深度同那一關的星樞（MultiPV 8）＋回援吃入侵卒、拆護陣、擋星門、取消預告大招、不白送子、不走進一步將死，會放招（補血、開盾、集火、攻擊招）和部署後備。",
  "@N":"開局變化：下法後面加 @N（例如 td@2），每一盤玩家的前 N 個主要行動改成在「不白送子」的步裡隨機走，之後才照那種下法。用來看結果是不是只靠某一條開局路線。"};
/* 每一局紀錄一定要有的欄位（測試 test-siege-wheel-bench.js 會檢查） */
const RUN_KEYS={siege:["id","mode","lv","name","ver","hard","seed","player","ch","L","sk","foe","engine","open","plies","rounds","ms","result","w","why","cut","me","en","log"],
  wheel:["id","mode","seed","player","ch","L","sk","need","engine","open","plies","rounds","ms","result","win","why","cut","tally","boards","log"]};
/* ---------- 小工具 ---------- */
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function seedOf(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
const sha=f=>crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex").slice(0,16);
function sources(){const o={};for(const f of APP_FILES)o["xiangqi-db/m/"+f]=sha(path.join(MDIR,f));o["xiangqi-lab/site/core.js"]=sha(path.join(LAB,"site","core.js"));
  for(const f of["pikafish.js","pikafish.wasm","pikafish.nnue"])o["xiangqi-lab/site/engine/"+f]=sha(path.join(EDIR,f));return o}
const sqName=q=>C.iccs(q,q).slice(0,2);
const cmpKey=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]>b[i]?1:-1;return 0};
/* ---------- 載入 App 的程式（原檔，不改、不另外寫一份） ---------- */
function loadApp(){const win={};const ctx={console,Math,JSON,Date,setTimeout,clearTimeout,Promise,window:win,addEventListener(){},location:{hash:"",hostname:""}};vm.createContext(ctx);
  const src=APP_FILES.map(f=>fs.readFileSync(path.join(MDIR,f),"utf8")).join("\n")+"\n;this.GSV=GSV;this.WHL=WHL;this.BHTD=BHTD;";
  vm.runInContext(src,ctx,{filename:"xiangqi-db-m.js"});
  if(!win.XQ_TD||!win.XQ_TD.gsv)throw new Error("window.XQ_TD 沒有包上星門圍城那一層（07bhg 的接線沒跑到）");
  return{G:ctx.GSV,W:ctx.WHL,XQ:win.XQ_TD,ctx}}
/* 臨時覆寫數值（試算用；只改這個程序記憶體裡的 GSV.LV／HARD／HARDX，不寫回任何檔）。patch＝{LV:{關:{欄位}},HARD:{…},HARDX:{關:{…}}} */
function applyPatch(A,patch){if(!patch)return null;const G=A.G;
  for(const k in patch.LV||{}){if(!G.LV[k])throw new Error("覆寫：沒有第 "+k+" 關");const e0=G.lvCheck(+k,C);Object.assign(G.LV[k],patch.LV[k]);const e=G.lvCheck(+k,C).filter(x=>!e0.includes(x));   /* 車輪戰的三盤本來就不是 16 子（檢查器會唸）：只擋覆寫之後才多出來的問題 */
    if(e.length)throw new Error("覆寫後第 "+k+" 關不合法："+e.join("；"))}
  if(patch.HARD)Object.assign(G.HARD,patch.HARD);
  for(const k in patch.HARDX||{})G.HARDX[k]=Object.assign({},G.HARDX[k],patch.HARDX[k]);
  return patch}
/* --set "LV.3.atk=95;HARD.atk=5;HARDX.3.esk=[]"（分號分開；值照 JSON 讀；開頭是數字就當 LV.<關>） */
function parseSet(s){const out={};for(const part of String(s||"").split(";")){const p=part.trim();if(!p)continue;const i=p.indexOf("=");if(i<0)throw new Error("--set 要寫成 路徑=值："+p);
    let keys=p.slice(0,i).trim().split(".");if(/^[0-9]+$/.test(keys[0]))keys=["LV"].concat(keys);let v;try{v=JSON.parse(p.slice(i+1))}catch(e){throw new Error("--set 的值要是 JSON："+p)}
    let o=out;for(let k=0;k<keys.length-1;k++)o=o[keys[k]]||(o[keys[k]]={});o[keys[keys.length-1]]=v}return out}
function mergePatch(a,b){const o=JSON.parse(JSON.stringify(a||{}));for(const top in b||{}){if(top==="HARD")o.HARD=Object.assign({},o.HARD,b.HARD);else{o[top]=o[top]||{};for(const k in b[top])o[top][k]=Object.assign({},o[top][k],b[top][k])}}return o}
/* ---------- App 的網頁版 Pikafish（在 Node 裡跑）；search(pos,lim,multipv) 的介面、指令、結果格式照 src/engine.js ---------- */
async function newEngine(o){o=o||{};const threads=o.threads||1,hash=o.hash||16,tt=o.tt==="game"?"game":"move";
  const PM=require(path.join(EDIR,"pikafish.js")),NNUE=fs.readFileSync(path.join(EDIR,"pikafish.nnue"));
  let waiters=[];const onLine=l=>{for(const w of waiters.slice())w(l)};
  const mod=await PM({arguments:[],locateFile:f=>path.join(EDIR,f),mainScriptUrlOrBlob:path.join(EDIR,"pikafish.js"),print:onLine,printErr:()=>{},preRun:[m=>m.FS.writeFile("/pikafish.nnue",NNUE)]});
  const send=c=>mod.ccall("uci_command",null,["string"],[c]);
  const until=(pred,each)=>new Promise(res=>{const w=l=>{if(each)each(l);if(pred(l)){waiters=waiters.filter(x=>x!==w);res(l)}};waiters.push(w)});
  const ask=(c,pred,each)=>{const p=until(pred,each);send(c);return p};
  await ask("uci",l=>l==="uciok");send("setoption name Threads value "+threads);send("setoption name Hash value "+hash);await ask("isready",l=>l==="readyok");
  const st={n:0,nopv:0,sm:0};let q=Promise.resolve();
  const fresh=async()=>{send("ucinewgame");await ask("isready",l=>l==="readyok")};
  function search(pos,lim,multipv){const job=async()=>{if(tt==="move")await fresh();st.n++;
      send("setoption name MultiPV value "+(multipv||1));
      send("position fen "+(pos.fen?pos.fen:C.START+" w")+" - - 0 1"+(pos.moves&&pos.moves.length?" moves "+pos.moves.join(" "):""));
      const info=new Map(),sm=lim.searchmoves&&lim.searchmoves.length?lim.searchmoves:null;if(sm)st.sm++;
      const best=await ask("go depth "+lim.depth+(sm?" searchmoves "+sm.join(" "):""),l=>l.startsWith("bestmove"),l=>{if(!l.startsWith("info ")||!l.includes(" pv "))return;
        const m=l.match(/ multipv (\d+)/),sc=l.match(/ score (cp|mate) (-?\d+)/),pv=l.match(/ pv (.+)$/),dp=l.match(/ depth (\d+)/);if(!sc||!pv)return;
        let v=+sc[2];if(sc[1]==="mate")v=v>0?30000-v:-30000-v;const pvs=pv[1].trim().split(/\s+/);
        info.set(m?+m[1]:1,{k:m?+m[1]:1,v,mv:pvs[0],pv:pvs,depth:dp?+dp[1]:null,mate:sc[1]==="mate"?+sc[2]:null})});
      if(!info.size)st.nopv++;
      return{best:best.split(/\s+/)[1],lines:[...info.values()].sort((a,b)=>a.k-b.k),nopv:!info.size}};
    const r=q.then(job);q=r.catch(()=>{});return r}
  return{search,fresh,st,threads,hash,tt,close(){try{send("quit")}catch(e){}},
    note:"App 網頁版 Pikafish（xiangqi-lab/site/engine/pikafish.wasm＋.nnue）在 Node "+process.version+" 裡跑；Threads "+threads+"、Hash "+hash+" MB、"+(tt==="move"?"每次搜尋前 ucinewgame":"每局開始 ucinewgame")}}
/* ---------- 玩家那一邊的自動下法（不是 App 的程式，也不是人） ----------
   X＝{P 這一盤,E 引擎,R 玩家的亂數,pos() 送引擎的局面,why(id) 這一招現在能不能放（空字串＝可以）,cast(o) 真的放招／部署（失敗回 null）}
   回傳 {mv:[f,t],why,sk} 或 {dep:{p,sq},why,sk}（部署已經放好、換星樞走） */
function mkPlayers(A){const G=A.G;
  const capVal=p=>G.CAPB[String(p).toUpperCase()]||0,clamp=v=>Math.max(-1500,Math.min(1500,v));
  const qRaw=(td,to)=>td.q.filter(e=>e.to===to).reduce((a,e)=>a+e.raw,0);
  const vOf=(r,u)=>{const L=r&&r.lines||[];const x=L.find(z=>z.mv===u);if(x)return x.v;return L.length?Math.min(...L.map(z=>z.v))-80:0};
  /* 這個盤面輪星樞走：它一步最多能白吃多少（沒人吃得回＝整顆，吃得回＝被吃的減去它拿來吃的；照擒子基礎值） */
  function hangLoss(b){let worst=0;for(const[f,t]of C.legal(b,"b")){if(!b[t])continue;const v=capVal(b[t]);if(v<=worst)continue;const x=C.make(b,f,t),back=C.legal(x,"r").some(([,c])=>c===t),loss=back?v-capVal(b[f]):v;if(loss>worst)worst=loss}return worst}
  async function greedy(X){const b=X.P.board,L=C.legal(b,"r"),R=X.R,caps=L.filter(([,t])=>b[t]);
    if(caps.length){let best=null,bk=null;for(const m of caps){const k=[capVal(b[m[1]]),-hangLoss(C.make(b,m[0],m[1])),R()];if(!bk||cmpKey(k,bk)>0){bk=k;best=m}}return{mv:best,why:"能吃就吃基礎值最大的",sk:[]}}
    let lo=Infinity,S=[];for(const m of L){const h=hangLoss(C.make(b,m[0],m[1]));if(h<lo){lo=h;S=[m]}else if(h===lo)S.push(m)}
    return{mv:S[Math.floor(R()*S.length)],why:"沒子可吃：在不白送子的步裡隨機走",sk:[]}}
  const eng=N=>async X=>{const r=await X.E.search(X.pos(),{depth:N},1),L=C.legal(X.P.board,"r");let mv=null;
    if(r&&/^[a-i][0-9][a-i][0-9]/.test(r.best||"")){const f=C.parseSq(r.best.slice(0,2)),t=C.parseSq(r.best.slice(2,4));if(L.some(([a,b])=>a===f&&b===t))mv=[f,t]}
    return{mv:mv||L[0],why:mv?"引擎搜尋 "+N+" 層的最佳步":"引擎沒給合法步，走第一個合法步",sk:[]}};
  const ATK=["qi2","lei2","luo2","qi5","lei3"],HEALS=["gheal","shen1","shen2","shen4","tian4","luo4"],SHIELDS=["gguard","tie1","luo3","tie4","tian2"];
  /* 走完這步，星樞一步能不能將死你（2）、或一步的擒子＋將軍＋已預告的入侵／大招打空你的星核（1）；0＝安全 */
  function blackKills(P2){const b=P2.board,td=P2.td,M=td.me,room=M.hp+M.sh.v,pend=G.preview(td,b,C).raw;let core=0;
    for(const[f,t]of C.legal(b,"b")){const x=C.make(b,f,t),ck=C.inCheck(x,"r");if(ck&&!C.legal(x,"r").length)return 2;
      let raw=pend;if(b[t])raw+=G.dmg(G.CAPB[b[t].toUpperCase()],td.en.atk,M.def);if(ck&&td.rnd-M.lastChk>=G.CHK_GAP)raw+=G.dmg(G.CHK,td.en.atk,M.def);if(raw>=room)core=1}return core}
  function blackHit(P2){const b=P2.board,td=P2.td,M=td.me,ckOk=td.rnd-M.lastChk>=G.CHK_GAP;let mx=0;for(const[f,t]of C.legal(b,"b")){let raw=0;if(b[t])raw+=G.dmg(G.CAPB[b[t].toUpperCase()],td.en.atk,M.def);if(ckOk&&C.inCheck(C.make(b,f,t),"r"))raw+=G.dmg(G.CHK,td.en.atk,M.def);if(raw>mx)mx=raw}return mx}
  async function td(X){const P=X.P,T=P.td,R=X.R,log=[],legal=C.legal(P.board,"r"),depth=T.depth||2;
    const usable=id=>!!(G.SKM[id]&&(G.SKM[id].gen||T.sk.includes(id)))&&!X.why(id);
    const tryCast=o=>{const P2={board:P.board.slice(),turn:P.turn,td:JSON.parse(JSON.stringify(T)),moves:P.moves.slice(),pos:P.pos.slice(),ed:JSON.parse(JSON.stringify(P.ed||[])),human:"r",result:null};const r=G.cast(P2,o,C);return r.err?null:{P2,r}};
    const firstTargets=id=>{const S=G.SKM[id];if(!S.tg)return[[]];const out=[];const rec=pk=>{if(out.length>=24)return;if(pk.length>=S.tg.length){out.push(pk);return}for(const x of G.targets(P,id,pk,C).slice(0,8))rec(pk.concat([typeof x==="object"?x.v:x]))};rec([]);return out};
    const attackVal=id=>{let best=null;for(const tg of firstTargets(id)){const x=tryCast({k:id,tg});if(!x)continue;const d=qRaw(x.P2.td,"b")-qRaw(T,"b");if(!best||d>best.d)best={id,tg,d}}return best};
    const r=await X.E.search(X.pos(),{depth},RED_MPV);
    const W=G.W_HP,E0=T.en,dB0=G.defOf(T,"b");
    const gateSq=new Map();for(const w of T.waves)if(w.st==="wait"&&w.at===T.rnd+1)gateSq.set(w.sq,w.dl?14:6);
    const fxLive=!!(T.fx&&T.fx.at===T.rnd+1&&G.fxSq(T,P.board,C)!=null),fxV=fxLive?G.dmg(T.fx.base,E0.atk,T.me.def):0;
    const cand=[];for(const[f,t]of legal){const u=C.iccs(f,t),P2=G.simR(P,f,t,C),dq=qRaw(P2.td,"b")-qRaw(T,"b");let bn=W*dq,why="";
      const vid=T.ids[t],tag=P.board[t]?G.tagOf(T,vid):"";
      if(tag==="inv"){const k=T.arm[vid]?2.5:G.redHalf(t)?1.6:.7;bn+=W*k*G.dmg(G.INV,E0.atk,T.me.def);why="回援：吃入侵卒"}
      if(tag==="guard"){const after=G.defOf(P2.td,"b"),gain=Math.max(0,E0.hp)*(1-(100+after)/(100+dB0));bn+=W*.8*gain;why="拆陣"}
      if(gateSq.has(t)){bn+=W*gateSq.get(t);why=why||"擋星門"}
      if(fxLive&&G.fxSq(P2.td,P2.board,C)==null){bn+=W*fxV;why=why||"取消預告大招"}
      cand.push({f,t,u,P2,bn,why:why||(dq>0?"擒子／將軍":"")})}
    const real=new Map((r.lines||[]).map(z=>[z.mv,z.v])),need=cand.filter(c=>c.bn>0&&!real.has(c.u)).sort((a,b)=>b.bn-a.bn).slice(0,10);
    if(need.length){const r2=await X.E.search(X.pos(),{depth,searchmoves:need.map(c=>c.u)},need.length);for(const z of r2.lines||[])if(!real.has(z.mv))real.set(z.mv,z.v)}
    let best=null,bv=-1e18,bw="";
    for(const c of cand){let s=(real.has(c.u)?clamp(real.get(c.u)):clamp(vOf(r,c.u))-HANG_W*hangLoss(c.P2.board))+c.bn-W*HIT_K*blackHit(c.P2);
      const k=blackKills(c.P2);if(k===2)s-=5e6;else if(k===1)s-=4e6;
      s+=R()*15;if(s>bv){bv=s;best=[c.f,c.t];bw=c.why||"引擎＋塔防評估"}}
    /* 招：一回合一招，照順序挑第一個划算的 */
    const pv=G.preview(T,P.board,C),inc=pv.loss,armedCanEat=legal.some(([,t])=>P.board[t]&&T.arm[T.ids[t]]),hpF=T.me.hp/T.me.max,tryList=[];
    if(hpF<.45)for(const id of HEALS)tryList.push([id,"低血補血"]);
    if(inc>=6&&!armedCanEat&&!T.me.sh.v)for(const id of SHIELDS)tryList.push([id,"預告扣血，開盾"]);
    if(best&&P.board[best[1]]&&G.targets(P,"gfocus",[],C).includes(best[1])&&capVal(P.board[best[1]])>=6)tryList.push(["gfocus","集火"]);
    for(const id of ATK)tryList.push([id,"攻擊招"]);
    if(T.sk.includes("qi1"))tryList.push(["qi1","破甲：拆護陣／除入侵"]);
    if(T.sk.includes("luo1")&&T.lost.some(x=>"RCN".includes(x.p)))tryList.push(["luo1","回營"]);
    for(const[id,why]of tryList){if(!usable(id))continue;
      if(id==="gfocus"){if(X.cast({k:id,tg:[best[1]]})){log.push(id+"："+why);break}continue}
      if(id==="qi1"){const Tg=G.targets(P,"qi1",[],C).filter(q=>{const tg=G.tagOf(T,T.ids[q]);return tg==="guard"||(tg==="inv"&&T.arm[T.ids[q]])});if(Tg.length&&X.cast({k:id,tg:[Tg[0]]})){log.push(id+"："+why);break}continue}
      if(id==="luo1"){const Tg=G.targets(P,"luo1",[],C).filter(q=>T.lost.some(x=>x.home===q&&"RCN".includes(x.p)));if(Tg.length&&T.me.sp>=60&&X.cast({k:id,tg:[Tg[0]]})){log.push(id+"："+why);break}continue}
      if(ATK.includes(id)){const a=attackVal(id);if(a&&a.d>=5&&X.cast({k:id,tg:a.tg})){log.push(id+"："+why);break}continue}
      const tgs=firstTargets(id);if(tgs.length&&X.cast({k:id,tg:tgs[0]})){log.push(id+"："+why);break}}
    /* 部署：預告的大招走棋取消不了、部署擋得住就部署（兵優先）；或場上非帥的子 ≤5、這步沒有擒子機會 → 放最大的後備子 */
    const nOwn=P.board.filter(x=>x&&x===x.toUpperCase()&&x!=="K").length,bestCap=best&&P.board[best[1]];
    const bo=fxLive&&best?G.simR(P,best[0],best[1],C):null;
    if(bo&&G.fxSq(bo.td,bo.board,C)!=null&&T.me.sp>=G.DEP_COST&&!X.why("dep")){for(const p of["P","A","B","C","N","R"]){if(!T.res.includes(p))continue;
      for(const q of G.targets(P,"dep",[p],C)){const x=tryCast({k:"dep",p,tg:[q]});if(!x||G.fxSq(x.P2.td,x.P2.board,C)!=null||blackKills(x.P2))continue;if(X.cast({k:"dep",p,tg:[q]}))return{dep:{p,sq:q},why:"部署擋住預告的大招",sk:log}}}}
    if(nOwn<=5&&!bestCap&&T.me.sp>=G.DEP_COST&&!X.why("dep")){for(const p of["R","C","N","P","B","A"]){if(!T.res.includes(p))continue;const Tg=G.targets(P,"dep",[p],C).filter(q=>{const x=tryCast({k:"dep",p,tg:[q]});return x&&!blackKills(x.P2)});
      if(Tg.length&&X.cast({k:"dep",p,tg:[Tg[0]]}))return{dep:{p,sq:Tg[0]},why:"兵力不足，部署後備"+G.PCN[p],sk:log}}}
    /* 放了會改盤面的招（換位、移除、復活）之後，原本挑的步可能不合法：重挑 */
    if(!best||!C.legal(P.board,"r").some(([a,b])=>a===best[0]&&b===best[1])){const L=C.legal(P.board,"r");best=L[0];bw="招式改了盤面，重挑"}
    return{mv:best,why:bw,sk:log}}
  /* 開局變化「下法@N」：每一盤玩家的前 N 個主要行動（走棋、部署）改成在「不白送子」的步裡隨機走，之後才照那種下法下。
     關卡開局是固定的、引擎又是決定性的，不加變化時幾十局常常只有幾條路線；加了變化才知道結果是不是只靠某一條開局路線 */
  const opening=(n,base)=>async X=>{const P=X.P,done=P.moves.filter(m=>m.by==="r").length+(P.td&&P.td.dep||0);if(done>=n)return base(X);
    const b=P.board,L=C.legal(b,"r");let lo=Infinity,S=[];for(const m of L){const h=hangLoss(C.make(b,m[0],m[1]));if(h<lo){lo=h;S=[m]}else if(h===lo)S.push(m)}
    return{mv:S[Math.floor(X.R()*S.length)],why:"開局變化：前 "+n+" 步在不白送子的步裡隨機走",sk:[]}};
  function get(name){const o=/^(.+)@([0-9]+)$/.exec(name);if(o){if(+o[2]<1||+o[2]>10)throw new Error("開局變化的步數要 1～10："+name);return opening(+o[2],get(o[1]))}
    if(name==="greedy")return greedy;if(name==="td")return td;const m=/^eng([0-9]+)$/.exec(name);if(m&&+m[1]>=1&&+m[1]<=12)return eng(+m[1]);throw new Error("沒有這種下法："+name+"（可用 greedy、engN、td，後面可以加 @N）")}
  return{get,hangLoss}}
/* ---------- 共用：每一步記傷害來源、大招 ---------- */
function mkTally(td){const src={r:{},b:{}},fx={},xs={drain:0,ph:1};let seen=td.seq;
  const run=()=>{for(const e of td.ev){if(e.s<=seen)continue;if(e.k==="hit"){src[e.to][e.why]=(src[e.to][e.why]||0)+e.loss}
      if(e.k==="esk"||e.k==="eskHit"||e.k==="eskOff"){const o=fx[e.id]||(fx[e.id]={esk:0,eskHit:0,eskOff:0});o[e.k]++}if(e.k==="drain")xs.drain+=e.n;if(e.k==="phase")xs.ph=Math.max(xs.ph,e.n)}seen=td.seq};
  return{run,src,fx,xs}}
const wavesOf=(G,lv)=>(G.LV[lv].waves||[]).map(w=>"第"+w.at+"回合："+w.p.map(([p,lu,xi,tg])=>p+"@"+sqName(G.LSQ(lu,xi))+(tg?"("+tg+")":"")).join(" "));
/* 這一盤星樞實際用的參數（已經套困難版、覆寫）；arep＝星樞不長將，照開局後 td 裡的值（第一章由 GSV.AREP1 決定，不寫在關卡資料裡） */
const foeOf=(V,td)=>({hp:V.hp,atk:V.atk,def:V.def,esp0:V.esp0,esk:(V.esk||[]).slice(),ph:V.ph?JSON.parse(JSON.stringify(V.ph)):null,depth:V.depth,arep:td&&td.arep?1:0});
/* ---------- 星門圍城一局（順序照 src/local.js：playNew → XQ_TD.boot；playEngine；playApply；/play/td） ---------- */
async function playSiege(A,E,PL,o){const G=A.G,XQ=A.XQ,lv=+o.lv,hard=o.hard?1:0,seed=+o.seed,L=+o.L||1,player=o.player,CHS=Object.keys(G.CH),ch=o.ch||CHS[(seed-1)%CHS.length];
  const V=G.lvOf(lv,hard);if(!V)throw new Error("星門圍城沒有第 "+lv+" 關");
  const key="siege|"+lv+"|"+hard+"|"+seed,rndB=rng(seedOf(key+"|星樞")),R=rng(seedOf(key+"|"+player)),t0=Date.now(),n0=E.st.n,sm0=E.st.sm,np0=E.st.nopv;
  if(E.tt==="game")await E.fresh();
  const J="bh:gs"+lv+(hard?"h":""),start=G.startFen(lv,C),P={id:"bench-"+J+"-"+player+"-"+seed,human:"r",start,startTurn:"r",moves:[],result:null,journey:J};
  C.stateRebuild(P);P.td=XQ.boot({mode:G.MODE,lv,ch,L,sk:G.skPick(ch,L,null),hard},P,C);
  const td=P.td,log=[],TL=mkTally(td),depths=new Set();let cut=0,mpv=0;
  const end=(w,why)=>{if(!P.result)P.result={w,why}};
  const apply=(f,t)=>{C.stateApply(P,f,t);const tdE=XQ.move(P,P.moves[P.moves.length-1],C);let r=C.judgeState(P);if(r&&P.noPerp&&/長將|長捉|長打/.test(r.why))r=null;if(!r&&tdE&&tdE.end)r=tdE.end;if(r)end(r.w,r.why)};
  const engPos=()=>P.ed&&P.ed.length?{fen:C.fen(P.board,P.turn)}:{fen:P.start+" "+(P.startTurn==="b"?"b":"w"),moves:P.moves.map(m=>C.iccs(m.f,m.t))};
  const X={A,P,E,R,pos:engPos,why:id=>G.why(P,id,C),cast:x=>{const r=XQ.cast(P,x,C)||{};if(r.err)return null;log.push((x.k==="dep"?"D "+x.p+"@"+sqName(+x.tg[0]):"S "+x.k+(x.tg&&x.tg.length?"("+x.tg.join(",")+")":"")));if(r.end)end(r.end.w,r.end.why);return r}};
  const play=PL.get(player);
  while(!P.result){if(td.rnd>=MAX_RND||P.moves.length>=MAX_PLY){cut=1;break}
    if(P.turn==="r"){const d=await play(X);TL.run();if(P.result)break;if(d.dep){if(P.turn!=="b")throw new Error("部署沒換手");continue}
      if(!d.mv)throw new Error("玩家下法沒給步");log.push("R "+C.iccs(d.mv[0],d.mv[1]));apply(d.mv[0],d.mv[1]);TL.run();continue}
    const TD=XQ.engine(P,C);depths.add(TD.depth);mpv=TD.mpv;const r=await E.search(engPos(),{depth:TD.depth,searchmoves:TD.sm},TD.mpv),mv=XQ.pick(r,TD,rndB);
    const f=C.parseSq(mv.slice(0,2)),t=C.parseSq(mv.slice(2,4));if(!C.legal(P.board,P.turn).some(([a,b])=>a===f&&b===t))throw new Error("星樞給出不合法著法 "+mv);
    log.push("B "+mv.slice(0,4));apply(f,t);TL.run()}
  const res=P.result||{w:null,why:MAX_RND+" 回合上限（基準工具才有的截斷，不是遊戲規則）"},win=res.w==="r";
  return{id:"gs"+lv+(hard?"h":"")+"|"+player+"|L"+L+"|s"+seed,mode:"siege",lv,name:V.nm,ver:hard?"hard":"normal",hard,seed,player,ch,chName:G.CH[ch].n,L,sk:td.sk.slice(),foe:foeOf(V,td),
    engine:{depth:[...depths].sort(),mpv,searches:E.st.n-n0,searchmoves:E.st.sm-sm0,nopv:E.st.nopv-np0,threads:E.threads,hash:E.hash,tt:E.tt,pick:"GSV.pick（透過 window.XQ_TD.pick）"},
    open:{kind:"關卡固定開局（沒有開局庫）",fen:start+" w",waves:wavesOf(G,lv)},
    plies:P.moves.length,rounds:td.rnd,ms:Date.now()-t0,result:cut?"cut":win?"win":res.w==="b"?"loss":"draw",w:res.w,why:res.why,cut,
    me:{hp:td.me.hp,max:td.me.max,sp:td.me.sp},en:{hp:td.en.hp,max:td.en.max},stars:win?G.stars(td,P.board):null,tl:td.tl,dealt:td.me.dealt,taken:td.me.taken,icpt:td.icpt,dep:td.dep,used:Object.assign({},td.used),
    src:TL.src,fx:TL.fx,drain:TL.xs.drain,phase:TL.xs.ph,log}}
/* ---------- 車輪戰一整場（三盤拿兩勝，跑到 WHL 自己判定結束）。玩家選盤照 App 的自動跳盤 WHL.hop；星樞一律走 WHL.step ---------- */
async function playWheel(A,E,PL,o){const G=A.G,W=A.W,seed=+o.seed,L=+o.L||1,player=o.player,CHS=Object.keys(G.CH),ch=o.ch||CHS[(seed-1)%CHS.length];
  const key="wheel|"+seed,rndB=rng(seedOf(key+"|星樞")),R=rng(seedOf(key+"|"+player)),t0=Date.now(),n0=E.st.n,sm0=E.st.sm,np0=E.st.nopv;
  if(E.tt==="game")await E.fresh();
  const M=W.newMatch({ch,L,id:"bench-whl-"+player+"-"+seed},C),Q={run:null,list:[]},log=[],via={},depths=new Set();let cur=-1,acts=0,cut=0,mpv=8;
  const opens=M.bs.map(B=>({lv:B.lv,nm:B.nm,fen:B.P.start+" w",waves:wavesOf(G,B.lv),foe:foeOf(G.LV[B.lv],B.P.td)}));for(const B of M.bs)depths.add(B.P.td.depth||2);
  const play=PL.get(player);
  const foe=async()=>{for(let g=0;g<20&&!M.over&&W.needs(M).length;g++){const x=await W.step(()=>M,Q,C,{search:(p,l,m)=>E.search(p,l,m),tmo:WHEEL_TMO,rnd:rndB});
      if(x.idle||x.busy)break;const k=(x.via||"?")+"／"+(x.src||(x.drop?"丟掉":"?"));via[k]=(via[k]||0)+1;if(x.err)throw new Error("星樞回不了步："+x.err);if(x.m)log.push((x.i+1)+"B "+C.iccs(x.m.f,x.m.t))}};
  const pickBoard=()=>{let i=W.hop(M,cur,C);if(i>=0&&W.stOf(M,i)==="me")return i;if(cur>=0&&W.stOf(M,cur)==="me")return cur;for(const B of M.bs)if(W.stOf(M,B.i)==="me")return B.i;return-1};
  while(!M.over){if(++acts>WHEEL_MAX_ACT||M.R>=WHEEL_MAX_R){cut=1;break}
    const i=pickBoard();if(i<0){if(!W.needs(M).length)throw new Error("車輪戰卡住：沒有盤輪到玩家，也沒有盤等星樞");await foe();continue}
    W.sync(M,i);const B=M.bs[i],P=B.P;
    const X={A,P,E,R,pos:()=>({fen:C.fen(P.board,"r")}),why:id=>W.why(M,i,id,C),cast:x=>{const r=W.cast(M,i,x,C);if(!r||r.err)return null;log.push((i+1)+(x.k==="dep"?"D "+x.p+"@"+sqName(+x.tg[0]):"S "+x.k+(x.tg&&x.tg.length?"("+x.tg.join(",")+")":"")));return r}};
    const d=await play(X);cur=i;if(M.over)break;
    if(!d.dep){if(!d.mv)throw new Error("玩家下法沒給步");const x=W.move(M,i,d.mv[0],d.mv[1],C);if(x.err)throw new Error("玩家這步走不了："+x.err);log.push((i+1)+"R "+C.iccs(d.mv[0],d.mv[1]))}
    await foe()}
  const T=W.tally(M),ov=M.over||{win:false,why:WHEEL_MAX_R+" 總輪上限（基準工具才有的截斷，不是遊戲規則）"};
  return{id:"whl|"+player+"|L"+L+"|s"+seed,mode:"wheel",seed,player,ch,chName:G.CH[ch].n,L,sk:M.sk.slice(),need:M.need,
    engine:{depth:[...depths].sort(),mpv,searches:E.st.n-n0,searchmoves:E.st.sm-sm0,nopv:E.st.nopv-np0,via,threads:E.threads,hash:E.hash,tt:E.tt,tmoMs:WHEEL_TMO,pick:"WHL.step → WHL.choose → GSV.pick"},
    open:{kind:"三盤固定開局（沒有開局庫）",boards:opens},
    plies:M.bs.reduce((a,B)=>a+B.P.moves.length,0),rounds:M.R,ms:Date.now()-t0,result:cut?"cut":ov.win?"win":"loss",win:!cut&&!!ov.win,why:ov.why,cut,tally:T,
    boards:M.bs.map(B=>{const r=B.P.result,t=B.P.td;return{i:B.i,lv:B.lv,nm:B.nm,result:!r?"open":r.w==="r"?"win":r.w==="b"?"loss":"draw",why:r?r.why:"",plies:B.P.moves.length,rounds:t.rnd,me:{hp:t.me.hp,max:t.me.max},en:{hp:t.en.hp,max:t.en.max},dep:t.dep,icpt:t.icpt}}),
    sp:M.sp.v,used:Object.assign({},M.used),log}}
/* ---------- 摘要 ---------- */
const pct=(a,b)=>b?Math.round(a/b*1000)/10:0,avg=(L,f)=>L.length?L.reduce((a,x)=>a+f(x),0)/L.length:0,r1=v=>Math.round(v*10)/10;
/* Wilson 95% 區間（百分比，四捨五入到整數）：局數少的時候勝率的誤差很大，表上一起列 */
function wilson(k,n){if(!n)return[0,0];const z=1.96,p=k/n,d=1+z*z/n,c=p+z*z/(2*n),h=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return[Math.max(0,Math.round((c-h)/d*100)),Math.min(100,Math.round((c+h)/d*100))]}
function topWhy(L){const o={};for(const g of L)o[g.why]=(o[g.why]||0)+1;return Object.entries(o).sort((a,b)=>b[1]-a[1])}
/* 開局路線有幾種：每局前 n 個主要行動（走棋、部署；不含放招）接起來，數有幾種不同的。關卡開局固定、引擎又是決定性的，同一格的幾十局常常只有幾條路線，不能當成幾十個互相獨立的樣本 */
const lineOf=(g,n)=>{const a=g.log.filter(x=>!/^[0-9]?S /.test(x));return(n?a.slice(0,n):a).join(" ")},kinds=(L,n)=>new Set(L.map(g=>lineOf(g,n))).size;
function summarize(runs){const S=new Map(),Wm=new Map();
  for(const g of runs){if(g.mode==="siege"){const k=g.lv+"|"+g.ver+"|"+g.player+"|"+g.L;if(!S.has(k))S.set(k,[]);S.get(k).push(g)}else if(g.mode==="wheel"){const k=g.player+"|"+g.L;if(!Wm.has(k))Wm.set(k,[]);Wm.get(k).push(g)}}
  const siege=[...S.values()].map(L=>{const g0=L[0],n=L.length,w=L.filter(g=>g.result==="win").length,src=(side)=>{const o={};for(const g of L)for(const k in g.src&&g.src[side]||{})o[k]=(o[k]||0)+g.src[side][k];for(const k in o)o[k]=r1(o[k]/n);return o};
    return{lv:g0.lv,name:g0.name,ver:g0.ver,player:g0.player,L:g0.L,n,win:w,draw:L.filter(g=>g.result==="draw").length,loss:L.filter(g=>g.result==="loss").length,cut:L.filter(g=>g.result==="cut").length,
      winPct:pct(w,n),ci:wilson(w,n),avgRounds:r1(avg(L,g=>g.rounds)),avgPlies:r1(avg(L,g=>g.plies)),avgMs:Math.round(avg(L,g=>g.ms)),
      meHpPct:Math.round(avg(L,g=>Math.max(0,g.me.hp)/g.me.max)*100),enHpPct:Math.round(avg(L,g=>Math.max(0,g.en.hp)/g.en.max)*100),
      lines12:kinds(L,12),games:new Set(L.map(g=>g.log.join(" "))).size,why:topWhy(L),takenBy:src("r"),dealtBy:src("b"),foe:g0.foe,depth:g0.engine.depth}}).sort((a,b)=>a.lv-b.lv||(a.ver<b.ver?1:a.ver>b.ver?-1:0)||(a.player<b.player?-1:1));
  const wheel=[...Wm.values()].map(L=>{const g0=L[0],n=L.length,w=L.filter(g=>g.result==="win").length,bn=g0.boards.length,via={};for(const g of L)for(const k in g.engine.via||{})via[k]=(via[k]||0)+g.engine.via[k];
    return{player:g0.player,L:g0.L,n,win:w,loss:L.filter(g=>g.result==="loss").length,cut:L.filter(g=>g.result==="cut").length,winPct:pct(w,n),ci:wilson(w,n),avgRounds:r1(avg(L,g=>g.rounds)),avgPlies:r1(avg(L,g=>g.plies)),avgMs:Math.round(avg(L,g=>g.ms)),
      boards:Array.from({length:bn},(x,i)=>{const B=L.map(g=>g.boards[i]);return{lv:B[0].lv,nm:B[0].nm,win:B.filter(b=>b.result==="win").length,loss:B.filter(b=>b.result==="loss").length,draw:B.filter(b=>b.result==="draw").length,open:B.filter(b=>b.result==="open").length,
        avgRounds:r1(avg(B,b=>b.rounds)),meHpPct:Math.round(avg(B,b=>Math.max(0,b.me.hp)/b.me.max)*100),enHpPct:Math.round(avg(B,b=>Math.max(0,b.en.hp)/b.en.max)*100)}}),lines12:kinds(L,12),games:new Set(L.map(g=>g.log.join(" "))).size,why:topWhy(L),via}}).sort((a,b)=>a.player<b.player?-1:1);
  return{siege,wheel}}
/* 難度倒掛（自動列，只是提示）：同一個版本、同一種下法，前面的關比後面某一關「勝率低 GAP 個百分點以上」或「星樞剩餘 HP 高 GAP 個百分點以上」。每個前面的關只列差最多的那一關 */
function inversions(rows,gap){gap=gap||15;const out=[],G2=new Map();for(const r of rows){if(r.lv>100)continue;const k=r.ver+"|"+r.player+"|"+r.L;if(!G2.has(k))G2.set(k,[]);G2.get(k).push(r)}
  for(const L of G2.values()){L.sort((a,b)=>a.lv-b.lv);for(let i=0;i<L.length;i++){let bw=null,be=null;for(let j=i+1;j<L.length;j++){const dw=L[j].winPct-L[i].winPct,de=L[i].enHpPct-L[j].enHpPct;if(dw>=gap&&(!bw||dw>bw.d))bw={d:dw,j};if(de>=gap&&(!be||de>be.d))be={d:de,j}}
      if(bw)out.push({ver:L[i].ver,player:L[i].player+(L[i].L>1?"（Lv"+L[i].L+"）":""),kind:"win",lv:L[i].lv,vs:L[bw.j].lv,a:L[i].winPct,b:L[bw.j].winPct,d:r1(bw.d)});
      if(be)out.push({ver:L[i].ver,player:L[i].player+(L[i].L>1?"（Lv"+L[i].L+"）":""),kind:"enHp",lv:L[i].lv,vs:L[be.j].lv,a:L[i].enHpPct,b:L[be.j].enHpPct,d:r1(be.d)})}}
  return out}
const VERN={normal:"普通",hard:"困難"};
function mdReport(metas,runs){const S=summarize(runs),inv=inversions(S.siege),m0=metas[0]||{},L=[];const tot=runs.reduce((a,g)=>a+g.ms,0);
  L.push("# 星門圍城＋車輪戰：引擎基準摘要（工具自動產生）","");
  L.push("> "+NOTE,"");
  L.push("- 工具："+TOOL+"（格式 "+SCHEMA+"）","- 引擎："+(m0.engine||""),"- 局數：星門圍城 "+runs.filter(g=>g.mode==="siege").length+" 局、車輪戰 "+runs.filter(g=>g.mode==="wheel").length+" 場；各局耗時合計 "+Math.round(tot/1000)+" 秒",
    "- 覆寫數值："+(metas.some(m=>m.patch)?JSON.stringify(metas.find(m=>m.patch).patch):"沒有（App 原本的數值）"),"");
  if(S.siege.length){L.push("## 星門圍城","","勝率後面的括號是 Wilson 95% 區間；「我剩／星樞剩」是終局時星核 HP 佔最大值的平均比例；耗時是這支工具算一局花的時間（不是真人玩一局的時間）；「路線」＝前 12 個主要行動（6 回合）有幾種不同的走法／整局棋譜有幾種不同的（開局固定，路線少代表這幾十局不是互相獨立的樣本）。","",
      "| 關 | 版本 | 星樞（HP／ATK／DEF／深度） | 下法 | 局 | 勝 | 和 | 敗 | 截斷 | 勝率 | 平均回合 | 平均步數 | 我剩 | 星樞剩 | 每局耗時 | 路線 | 最多的結束原因 |","|---|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---|");
    for(const r of S.siege)L.push("| "+r.lv+" "+r.name+" | "+VERN[r.ver]+" | "+r.foe.hp+"／"+r.foe.atk+"／"+r.foe.def+"／"+r.depth.join("、")+" | "+r.player+(r.L>1?"（Lv"+r.L+"）":"")+" | "+r.n+" | "+r.win+" | "+r.draw+" | "+r.loss+" | "+r.cut+" | "+r.winPct+"%（"+r.ci[0]+"～"+r.ci[1]+"） | "+r.avgRounds+" | "+r.avgPlies+" | "+r.meHpPct+"% | "+r.enHpPct+"% | "+(r.avgMs/1000).toFixed(2)+" 秒 | "+r.lines12+"／"+r.games+" | "+r.why.slice(0,2).map(([k,v])=>k+"×"+v).join("；")+" |");
    L.push("");
    L.push("### 難度倒掛（自動列，門檻 15 個百分點，只是提示）","");
    if(!inv.length)L.push("沒有超過門檻的。");else{L.push("| 版本 | 下法 | 指標 | 前面的關 | 後面的關 | 前面 | 後面 | 差 |","|---|---|---|---:|---:|---:|---:|---:|");
      for(const x of inv)L.push("| "+VERN[x.ver]+" | "+x.player+" | "+(x.kind==="win"?"勝率（前面比較低）":"星樞剩餘 HP（前面比較多）")+" | "+x.lv+" | "+x.vs+" | "+x.a+"% | "+x.b+"% | "+x.d+" |")}
    L.push("")}
  if(S.wheel.length){L.push("## 車輪戰（三盤拿兩勝，整場跑到結束）","","| 下法 | 場 | 過關 | 未過關 | 截斷 | 過關率 | 平均總輪 | 三盤合計步數 | 每場耗時 | 路線 | "+S.wheel[0].boards.map(b=>b.nm+"（勝／和／敗／沒下完）").join(" | ")+" | 星樞的步怎麼來的 |","|---|---:|---:|---:|---:|---|---:|---:|---:|---:|"+S.wheel[0].boards.map(()=>"---|").join("")+"---|");
    for(const r of S.wheel)L.push("| "+r.player+(r.L>1?"（Lv"+r.L+"）":"")+" | "+r.n+" | "+r.win+" | "+r.loss+" | "+r.cut+" | "+r.winPct+"%（"+r.ci[0]+"～"+r.ci[1]+"） | "+r.avgRounds+" | "+r.avgPlies+" | "+(r.avgMs/1000).toFixed(2)+" 秒 | "+r.lines12+"／"+r.games+" | "+r.boards.map(b=>b.win+"／"+b.draw+"／"+b.loss+"／"+b.open+"，星樞剩 "+b.enHpPct+"%").join(" | ")+" | "+Object.entries(r.via).map(([k,v])=>k+"×"+v).join("；")+" |");
    L.push("")}
  L.push("## 下法說明","");for(const k in PLAYER_DOC)L.push("- "+(k==="eng"?"engN":k)+"："+PLAYER_DOC[k]);L.push("");
  return L.join("\n")}
/* 去掉每次跑都不一樣的欄位（耗時），拿來比「同一個種子跑兩次結果相同」 */
function stable(run){const o=JSON.parse(JSON.stringify(run));delete o.ms;return o}
/* ---------- 主程式 ---------- */
function args(argv){const has=k=>argv.includes(k),val=(k,d)=>{const i=argv.indexOf(k);return i>=0&&i+1<argv.length?argv[i+1]:d};return{has,val}}
function readDir(dir){const files=fs.statSync(dir).isDirectory()?fs.readdirSync(dir).filter(f=>f.endsWith(".json")).sort().map(f=>path.join(dir,f)):String(dir).split(",");const metas=[],runs=[],seen=new Set();
  for(const f of files){let j;try{j=JSON.parse(fs.readFileSync(f,"utf8"))}catch(e){continue}if(!j||!j.meta||j.meta.schema!==SCHEMA||!Array.isArray(j.runs))continue;metas.push(j.meta);for(const g of j.runs){if(seen.has(g.id))continue;seen.add(g.id);runs.push(g)}}
  return{metas,runs,files}}
async function main(argv){const a=args(argv),quiet=a.has("--quiet"),say=(...x)=>{if(!quiet)console.log(...x)};
  if(a.has("--report")){const src=a.val("--report"),R=readDir(src);if(!R.runs.length){console.error("找不到基準結果："+src);return 1}const md=mdReport(R.metas,R.runs),out=a.val("--md",null);
    if(out){fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,md)}const all=a.val("--out",null);if(all)fs.writeFileSync(all,JSON.stringify({meta:Object.assign({},R.metas[0],{merged:R.files.map(f=>path.basename(f))}),summary:summarize(R.runs),inversions:inversions(summarize(R.runs).siege),runs:R.runs},null,1));
    say(md);return 0}
  const mode=a.val("--mode","all"),A=loadApp(),G=A.G;
  let patch=null;if(a.val("--patch",null))patch=JSON.parse(fs.readFileSync(a.val("--patch"),"utf8"));if(a.val("--set",null))patch=mergePatch(patch,parseSet(a.val("--set")));applyPatch(A,patch);
  const SEEDS=+a.val("--seeds",20),S0=+a.val("--seed0",1),Lx=+a.val("--L",1),LVS=String(a.val("--lv","1,2,3,4,5,6,7,8,9,10,11,12")).split(",").map(Number),VERS=String(a.val("--ver","normal,hard")).split(","),PLS=String(a.val("--players","greedy,eng4,td")).split(",");
  const TW=new Date(Date.now()+8*3600e3).toISOString().slice(0,16).replace(/[-:T]/g,""),OUT=a.val("--out",path.join(ROOT,"tmp","siege-wheel-bench","bench-"+TW+".json")),MD=a.val("--md",null);
  const PL=mkPlayers(A);for(const p of PLS)PL.get(p);for(const lv of LVS)if(!G.LV[lv])throw new Error("沒有第 "+lv+" 關");
  let E;try{E=await newEngine({tt:a.val("--tt","move")})}catch(e){console.error("Pikafish 在 Node 載入失敗（"+(e&&e.message)+"）。這支基準一定要真引擎，不退回規則評估。");return 2}
  say("引擎：",E.note);const plan=[];
  if(mode==="siege"||mode==="all")for(const lv of LVS)for(const v of VERS)for(const p of PLS)for(let i=0;i<SEEDS;i++)plan.push({mode:"siege",lv,hard:v==="hard"?1:0,player:p,seed:S0+i,L:Lx});
  if(mode==="wheel"||mode==="all")for(const p of PLS)for(let i=0;i<SEEDS;i++)plan.push({mode:"wheel",player:p,seed:S0+i,L:Lx});
  const runs=[],t0=Date.now();
  for(const[k,p]of plan.entries()){runs.push(p.mode==="siege"?await playSiege(A,E,PL,p):await playWheel(A,E,PL,p));if((k+1)%20===0||k+1===plan.length)say("  "+(k+1)+"/"+plan.length+"  "+((Date.now()-t0)/1000).toFixed(0)+" 秒")}
  const meta={schema:SCHEMA,tool:TOOL,date:new Date().toISOString(),node:process.version,engine:E.note,engineCfg:{threads:E.threads,hash:E.hash,tt:E.tt,redMpv:RED_MPV,wheelTmoMs:WHEEL_TMO},sources:sources(),
    args:{mode,levels:LVS,versions:VERS,players:PLS,seeds:SEEDS,seed0:S0,L:Lx},cmd:"node "+TOOL+" "+argv.join(" "),limits:{siegeMaxRounds:MAX_RND,siegeMaxPlies:MAX_PLY,wheelMaxRounds:WHEEL_MAX_R},patch:patch||null,players:PLAYER_DOC,ms:Date.now()-t0,note:NOTE};
  const sum=summarize(runs);fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({meta,summary:sum,inversions:inversions(sum.siege),runs},null,1));
  if(MD){fs.mkdirSync(path.dirname(MD),{recursive:true});fs.writeFileSync(MD,mdReport([meta],runs))}
  for(const r of sum.siege)say("第"+r.lv+"關 "+VERN[r.ver]+" "+r.player.padEnd(7)+" 勝"+r.win+" 和"+r.draw+" 敗"+r.loss+(r.cut?" 截斷"+r.cut:"")+"  平均"+r.avgRounds+"回合／"+r.avgPlies+"步  我剩"+r.meHpPct+"% 星樞剩"+r.enHpPct+"%  "+r.why.slice(0,2).map(([x,v])=>x+"×"+v).join("；"));
  for(const r of sum.wheel)say("車輪戰 "+r.player.padEnd(7)+" 過關"+r.win+" 未過關"+r.loss+(r.cut?" 截斷"+r.cut:"")+"  平均"+r.avgRounds+"總輪  "+r.boards.map(b=>b.nm+" "+b.win+"勝"+b.draw+"和"+b.loss+"敗").join("、"));
  say("寫到",OUT,"共",((Date.now()-t0)/1000).toFixed(0),"秒");E.close();return 0}
module.exports={SCHEMA,TOOL,NOTE,RUN_KEYS,PLAYER_DOC,rng,seedOf,loadApp,applyPatch,parseSet,mergePatch,newEngine,mkPlayers,playSiege,playWheel,summarize,inversions,mdReport,stable,wilson,sources,main};
if(require.main===module)main(process.argv.slice(2)).then(c=>process.exit(c||0),e=>{console.error(e);process.exit(1)});
