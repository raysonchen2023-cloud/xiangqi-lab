#!/usr/bin/env node
// 黑洞・星門圍城 gate-siege-v1 腳本對照（ChatGPT 提案一第十三節「程式及引擎可先做」）：只用 node，不開任何瀏覽器。
//   紅方＝固定腳本（不是人類玩家）；星樞＝App 同一份 GSV.engine＋GSV.pick（Pikafish 候選＋全部合法步的一步塔防評估）。
//   引擎：App 自己的網頁版 Pikafish（site/engine/pikafish.js＋.wasm＋.nnue）在 Node 裡跑，Threads=1、Hash=16MB、每次搜尋前 ucinewgame（同種子可重現）。
//   規則：m/07bhg-gatesiege.js 的 GSV（vm 載入，跟 App 同一份）；走子、裁判用 site/core.js。
// 腳本：ignore 忽視入侵（照引擎最佳、刻意不吃入侵卒、不放招）／rush 無腦進攻（能吃就吃最大的、能放攻擊招就放）／hoard 只屯靈力（照引擎最佳、不放招不部署）／
//       heal 只補血（照引擎最佳、能補就補）／smart 會回援、拆陣（塔防評估：吃入侵卒、拆護陣、擋星門、預告扣血時開盾、低血補血、集火、部署）。
//       11/15 補第 2、4、5 關時 smart 多兩件事：能取消預告大招的步加分（卒將號令、隔山星砲，用 GSV.fxSq）；走棋、部署前看星樞一步能不能將死你或打空星核（--nosafe 關掉，重現上午版本 B）。
//       11/15 第二章（第 7～12 關）：預設改成跑十二關；加 --v2（預設關）＝smart 不白送子、補問引擎、看一步傷害、會部署擋口，說明在 V2 那一段。不加 --v2 的 smart 跟下午那一版逐局相同。
// 用法：node xiangqi-lab/tools/gate-siege-sim.js [--seeds 20] [--lv 1,2,…,12] [--scripts ignore,rush,hoard,heal,smart] [--hi]（--hi：smart 另跑 Lv23）[--v2] [--hard]（困難版）[--patch 檔.json] [--out 檔名]
//   每回合記 HP、SP、紅方動作與原因、星樞的步；結果寫 tmp/gate-siege/（JSON），摘要印在終端機。
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"..",".."),LAB=path.join(ROOT,"xiangqi-lab");
const C=require(path.join(LAB,"site","core.js"));
/* 11/15 七星改版：--src 檔＝載入別份規則檔（例如改版前的備份）當基準；--squad 第1天|第3天|第8天|練很高＝帶隊伍等級組合（每種棋子各用自己角色的等級，木棋靈＝修為一半），隊長固定齊轍 */
const SRCF=(()=>{const i=process.argv.indexOf("--src");return i>0?process.argv[i+1]:path.join(ROOT,"xiangqi-db","m","07bhg-gatesiege.js")})();
const ctx={console,Math,JSON};vm.createContext(ctx);vm.runInContext(fs.readFileSync(SRCF,"utf8")+"\n;this.GSV=GSV;",ctx);const G=ctx.GSV;
const SQUADS={"第1天":{lead:3,lv:{R:3},wood:1},"第3天":{lead:6,lv:{R:6,N:4,K:4,A:4},wood:3},"第8天":{lead:9,lv:{R:9,N:8,K:7,A:7,B:7,P:7,C:7},wood:4},"練很高":{lead:20,lv:{R:20,N:18,K:18,A:18,B:18,P:18,C:18},wood:10}};
const PCOF={R:"x_swordboy",N:"x_miaogirl",B:"x_spiritgirl",A:"x_shi",K:"x_shuai",C:"x_martialgirl",P:"x_bing"};
const SQN=(()=>{const i=process.argv.indexOf("--squad");return i>0?process.argv[i+1]:null})();const PICK=(()=>{const i=process.argv.indexOf("--pick");return i>0?process.argv[i+1]:null})();   /* 11/16 --pick best＝全隊最強 4 招 */if(SQN&&!SQUADS[SQN])throw new Error("--squad 只有："+Object.keys(SQUADS).join("、"));
const SQ=SQN?Object.fromEntries(Object.entries(PCOF).map(([pc,ck])=>{const v=SQUADS[SQN].lv[pc];return[pc,v?{ck,L:v}:{ck,L:SQUADS[SQN].wood,wood:1}]})):null;
const arg=(k,d)=>{const i=process.argv.indexOf(k);return i>0?process.argv[i+1]:d};
/* --patch 檔.json：調數值用，{"4":{"hp":120,"waves":[…]}} 蓋掉那一關的欄位再跑（不改 App 的檔；結果 meta.patch 會記下來） */
const PATCH=arg("--patch",null),PATCHED=PATCH?JSON.parse(fs.readFileSync(PATCH,"utf8")):null;if(PATCHED)for(const k in PATCHED){if(!G.LV[k])throw new Error("--patch 沒有第 "+k+" 關");Object.assign(G.LV[k],PATCHED[k]);const e=G.lvCheck(+k,C);if(e.length)throw new Error("--patch 第 "+k+" 關不合法："+e.join("；"))}
const HARDV=process.argv.includes("--hard");
const SEEDS=+arg("--seeds",20),LVS=String(arg("--lv","1,2,3,4,5,6,7,8,9,10,11,12")).split(",").map(Number),SCR=String(arg("--scripts","ignore,rush,hoard,heal,smart")).split(","),HI=process.argv.includes("--hi");
const TW=new Date(Date.now()+8*3600e3).toISOString().slice(0,10);   /* 臺灣日期 */
const OUT=arg("--out",path.join(ROOT,"tmp","gate-siege","sim-"+TW+".json"));
const RED_MPV=8,MAX_RND=60,CHS=Object.keys(G.CH);
function rng(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
/* ---------- App 的網頁版 Pikafish（在 Node 裡跑；照 ai-batch.js 的 newEngine，多支援 searchmoves） ---------- */
const EDIR=path.join(LAB,"site","engine");let PM=null,NNUE=null;
async function newEngine(){PM=PM||require(path.join(EDIR,"pikafish.js"));NNUE=NNUE||fs.readFileSync(path.join(EDIR,"pikafish.nnue"));
  let waiters=[];const onLine=l=>{for(const w of waiters.slice())w(l)};
  const mod=await PM({arguments:[],locateFile:f=>path.join(EDIR,f),mainScriptUrlOrBlob:path.join(EDIR,"pikafish.js"),print:onLine,printErr:()=>{},preRun:[m=>m.FS.writeFile("/pikafish.nnue",NNUE)]});
  const send=c=>mod.ccall("uci_command",null,["string"],[c]);
  const until=(pred,each)=>new Promise(res=>{const w=l=>{if(each)each(l);if(pred(l)){waiters=waiters.filter(x=>x!==w);res(l)}};waiters.push(w)});
  const ask=(c,pred,each)=>{const p=until(pred,each);send(c);return p};
  await ask("uci",l=>l==="uciok");send("setoption name Threads value 1");send("setoption name Hash value 16");await ask("isready",l=>l==="readyok");
  let mpvNow=0;
  async function search(fenStr,depth,mpv,sm){send("ucinewgame");await ask("isready",l=>l==="readyok");if(mpv!==mpvNow){send("setoption name MultiPV value "+mpv);mpvNow=mpv}
    send("position fen "+fenStr);const info=new Map();
    const best=await ask("go depth "+depth+(sm&&sm.length?" searchmoves "+sm.join(" "):""),l=>l.startsWith("bestmove"),l=>{if(!l.startsWith("info ")||!l.includes(" pv "))return;
      const m=l.match(/ multipv (\d+)/),sc=l.match(/ score (cp|mate) (-?\d+)/),pv=l.match(/ pv (.+)$/);if(!sc||!pv)return;let v=+sc[2];if(sc[1]==="mate")v=v>0?30000-v:-30000-v;
      info.set(m?+m[1]:1,{k:m?+m[1]:1,v,mv:pv[1].trim().split(/\s+/)[0]})});
    return{best:best.split(/\s+/)[1],lines:[...info.values()].sort((a,b)=>a.k-b.k)}}
  return{search,close(){try{send("quit")}catch(e){}}}}
/* 紅方腳本的引擎深度＝那一關星樞的深度（雙方看棋一樣深，比的是塔防決策） */
const redDepth=P=>P.td.depth||2;
/* ---------- 一盤 ---------- */
function newGame(lv,ch,L){const start=G.startFen(lv,C),P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",ed:[]};P.pos=[C.fen(P.board,"r")];
  const sk0=SQ&&typeof G.skOfSq==="function"?(PICK==="best"?G.skOfSq(G.squad(SQ)).map(id=>G.SKM[id]).sort((x,y)=>y.lv-x.lv||y.cost-x.cost).slice(0,4).map(s=>s.id):null):G.skOf(ch,L).slice(0,4);   /* 11/16 全隊招式：--squad 時招式池＝全隊；--pick best＝挑等級最高的 4 招 */
  P.td=G.boot(Object.assign({mode:G.MODE,lv,ch,L,sk:sk0,hard:HARDV?1:0},SQ?{sq:SQ}:{}),P,C);return P}   /* --hard：困難版（GSV.lvOf 的那一組參數） */
const fenOf=P=>C.fen(P.board,P.turn)+" - - 0 1";
const clamp=v=>Math.max(-1500,Math.min(1500,v));
async function engLines(E,P,depth,mpv,sm){if(!E)return{lines:[]};return E.search(fenOf(P),depth,mpv,sm)}
function vOf(r,u){const L=r.lines||[];const x=L.find(z=>z.mv===u);if(x)return x.v;return L.length?Math.min(...L.map(z=>z.v))-80:0}
const capVal=p=>G.CAPB[String(p).toUpperCase()]||0;
/* 試放一招（不改原盤）：回傳放完的 P 副本，失敗回 null */
function tryCast(P,o){const P2={board:P.board.slice(),turn:P.turn,td:JSON.parse(JSON.stringify(P.td)),moves:P.moves.slice(),pos:P.pos.slice(),ed:JSON.parse(JSON.stringify(P.ed||[])),human:"r"};const r=G.cast(P2,o,C);return r.err?null:{P2,r}}
function cast(P,o){const r=G.cast(P,o,C);return r.err?null:r}
function firstTargets(P,id){const S=G.SKM[id];if(!S.tg)return[[]];const out=[];const rec=pk=>{if(out.length>=24)return;if(pk.length>=S.tg.length){out.push(pk);return}for(const x of G.targets(P,id,pk,C).slice(0,8))rec(pk.concat([typeof x==="object"?x.v:x]))};rec([]);return out}
const qRaw=(td,to)=>td.q.filter(e=>e.to===to).reduce((a,e)=>a+e.raw,0);
/* 攻擊招的實際效果：放完佇列裡多了多少打星樞的傷害 */
function attackVal(P,id){let best=null;for(const tg of firstTargets(P,id)){const x=tryCast(P,{k:id,tg});if(!x)continue;const d=qRaw(x.P2.td,"b")-qRaw(P.td,"b")+(x.r&&0);const rm=id==="qi1"?1:0;if(!best||d>best.d)best={id,tg,d,rm}}return best}
const ATK=["qi2","lei2","luo2","qi5","lei3"],HEALS=["gheal","shen1","shen2","shen4","tian4","luo4"],SHIELDS=["gguard","tie1","luo3","tie4","tian2"];
/* 11/15 smart 的棋上安全（照星樞 lethalR 反過來看）：紅方走完這步，星樞一步能不能將死你（2）、或一步的擒子＋將軍＋這批已預告的入侵／大招打空你的星核（1）；0＝安全。--nosafe 關掉（重現 11/15 上午版本 B 的 smart） */
const SAFE=!process.argv.includes("--nosafe");
function blackKills(P2){const b=P2.board,td=P2.td,M=td.me,room=M.hp+M.sh.v,pend=G.preview(td,b,C).raw;let core=0;
  for(const[f,t]of C.legal(b,"b")){const x=C.make(b,f,t),ck=C.inCheck(x,"r");if(ck&&!C.legal(x,"r").length)return 2;
    let raw=pend;if(b[t])raw+=G.dmg(G.CAPB[b[t].toUpperCase()],td.en.atk,M.def);if(ck&&td.rnd-M.lastChk>=G.CHK_GAP)raw+=G.dmg(G.CHK,td.en.atk,M.def);if(raw>=room)core=1}return core}
/* 11/15 第二章加的開關 --v2（預設關，不加就是下午第 2、4、5 關那一版的 smart，第 1～6 關結果逐局相同）。
   舊 smart 的毛病：引擎只給前 8 名的分數，其他步一律當「最低分 −80」，塔防加分（擋口、拆陣、取消大招）一大就拿沒人保護的俥去送；也完全不躲將軍（將軍在棋上不虧，可是每次扣星核 18）。
   開了 --v2，smart 多四件事（都只改紅方腳本，不改規則、不改星樞）：
   ① 有塔防加分、又不在引擎前 8 名的步（最多 10 步），用 searchmoves 再問引擎一次，拿真的分數；
   ② 還是沒有真分數的步，看走完後星樞一步能白吃多少（沒人吃得回＝整顆，吃得回＝被吃的減去它拿來吃的；照擒子基礎值 4／6／10／14，每點折 70 厘兵）；
   ③ 每一步都看走完後星樞一步最多能打你星核多少（擒子＋將軍，同一個 dmg），折半算進評估（照星樞 scoreB 的做法反過來）；
   ④ 預告的大招走棋取消不了、部署一顆後備子到補給點就能取消（擋住直路）時，部署最便宜的那一顆（兵優先）。舊腳本只在兵力 ≤5 才部署 */
const V2=process.argv.includes("--v2"),HANG_W=70,HIT_K=.5;
function hangLoss(P2){const b=P2.board;let worst=0;for(const[f,t]of C.legal(b,"b")){if(!b[t])continue;const v=capVal(b[t]);if(v<=worst)continue;const x=C.make(b,f,t),back=C.legal(x,"r").some(([,c])=>c===t),loss=back?v-capVal(b[f]):v;if(loss>worst)worst=loss}return worst}
function blackHit(P2){const b=P2.board,td=P2.td,M=td.me,ckOk=td.rnd-M.lastChk>=G.CHK_GAP;let mx=0;for(const[f,t]of C.legal(b,"b")){let raw=0;if(b[t])raw+=G.dmg(G.CAPB[b[t].toUpperCase()],td.en.atk,M.def);if(ckOk&&C.inCheck(C.make(b,f,t),"r"))raw+=G.dmg(G.CHK,td.en.atk,M.def);if(raw>mx)mx=raw}return mx}
const usable=(P,id)=>(G.SKM[id]&&(G.SKM[id].gen||P.td.sk.includes(id)))&&!G.why(P,id,C);
/* ---------- 紅方腳本：回傳 {act:"move",f,t,why} 或 {act:"dep",…}；放招在 decide 裡直接放（可能先放再走） ---------- */
async function redTurn(E,P,script,R){const td=P.td,log=[];let r=null;const legal=C.legal(P.board,"r");
  const engBest=async(filter)=>{r=r||await engLines(E,P,redDepth(P),RED_MPV);let L=legal.filter(filter||(()=>true));if(!L.length)L=legal;let b=null,bv=-1e9;
    for(const[f,t]of L){const v=vOf(r,C.iccs(f,t))+R()*15;if(v>bv){bv=v;b=[f,t]}}return b};
  if(script==="hoard")return{mv:await engBest(),why:"引擎最佳",sk:log};
  if(script==="ignore")return{mv:await engBest(([f,t])=>!(P.board[t]&&G.tagOf(td,td.ids[t])==="inv")),why:"引擎最佳（不吃入侵卒）",sk:log};
  if(script==="heal"){for(const id of HEALS)if(usable(P,id)&&td.me.hp<=td.me.max-10){if(cast(P,{k:id,tg:[]})){log.push(id);break}}return{mv:await engBest(),why:"引擎最佳",sk:log}}
  if(script==="rush"){const caps=legal.filter(([f,t])=>P.board[t]);let mv=null;
    if(caps.length){r=r||await engLines(E,P,redDepth(P),RED_MPV);caps.sort((a,b)=>capVal(P.board[b[1]])-capVal(P.board[a[1]])||vOf(r,C.iccs(...b))-vOf(r,C.iccs(...a)));mv=caps[0]}
    if(mv&&usable(P,"gfocus")&&G.targets(P,"gfocus",[],C).includes(mv[1])){if(cast(P,{k:"gfocus",tg:[mv[1]]}))log.push("gfocus")}
    if(!log.length)for(const id of ["qi1",...ATK]){if(!usable(P,id))continue;const a=attackVal(P,id);if(a&&(a.d>0||a.rm)){if(cast(P,{k:id,tg:a.tg})){log.push(id);break}}}
    return{mv:mv||await engBest(),why:mv?"能吃就吃最大的":"引擎最佳",sk:log}}
  /* smart：塔防評估 */
  r=r||await engLines(E,P,redDepth(P),RED_MPV);const W=G.W_HP,E0=td.en,dB0=G.defOf(td,"b");
  const gateSq=new Map();for(const w of td.waves)if(w.st==="wait"&&w.at===td.rnd+1)gateSq.set(w.sq,w.dl?14:6);
  const fxLive=td.fx&&td.fx.at===td.rnd+1&&G.fxSq(td,P.board,C)!=null,fxV=fxLive?G.dmg(td.fx.base,E0.atk,td.me.def):0;   /* 11/15：預告的大招這一步能不能取消 */
  let best=null,bv=-1e9,bw="";
  if(!V2)for(const[f,t]of legal){const u=C.iccs(f,t),v=clamp(vOf(r,u));const P2=G.simR(P,f,t,C),dq=qRaw(P2.td,"b")-qRaw(td,"b");let s=v+W*dq,why="";
    const vid=td.ids[t],tag=P.board[t]?G.tagOf(td,vid):"";
    if(tag==="inv"){const k=td.arm[vid]?2.5:G.redHalf(t)?1.6:.7;s+=W*k*G.dmg(G.INV,E0.atk,td.me.def);why="回援：吃入侵卒"}
    if(tag==="guard"){const after=G.defOf(P2.td,"b"),gain=Math.max(0,E0.hp)*(1-(100+after)/(100+dB0));s+=W*.8*gain;why="拆陣"}
    if(gateSq.has(t)){s+=W*gateSq.get(t);why=why||"擋星門"}
    if(fxLive&&G.fxSq(P2.td,P2.board,C)==null){s+=W*fxV;why=why||"取消預告大招"}
    if(SAFE){const k=blackKills(P2);if(k===2)s-=5e6;else if(k===1)s-=4e6}
    if(dq>0&&!why)why="擒子／將軍";s+=R()*15;if(s>bv){bv=s;best=[f,t];bw=why||"引擎＋塔防評估"}}
  /* --v2：加分的算法跟上面一樣，先把每一步的塔防加分算好，再補問引擎、看白送與一步傷害 */
  else{const cand=[];for(const[f,t]of legal){const u=C.iccs(f,t),P2=G.simR(P,f,t,C),dq=qRaw(P2.td,"b")-qRaw(td,"b");let bn=W*dq,why="";
      const vid=td.ids[t],tag=P.board[t]?G.tagOf(td,vid):"";
      if(tag==="inv"){const k=td.arm[vid]?2.5:G.redHalf(t)?1.6:.7;bn+=W*k*G.dmg(G.INV,E0.atk,td.me.def);why="回援：吃入侵卒"}
      if(tag==="guard"){const after=G.defOf(P2.td,"b"),gain=Math.max(0,E0.hp)*(1-(100+after)/(100+dB0));bn+=W*.8*gain;why="拆陣"}
      if(gateSq.has(t)){bn+=W*gateSq.get(t);why=why||"擋星門"}
      if(fxLive&&G.fxSq(P2.td,P2.board,C)==null){bn+=W*fxV;why=why||"取消預告大招"}
      cand.push({f,t,u,P2,bn,why:why||(dq>0?"擒子／將軍":"")})}
    const real=new Map((r.lines||[]).map(z=>[z.mv,z.v])),need=cand.filter(c=>c.bn>0&&!real.has(c.u)).sort((a,b)=>b.bn-a.bn).slice(0,10);
    if(need.length&&E){const r2=await E.search(fenOf(P),redDepth(P),need.length,need.map(c=>c.u));for(const z of r2.lines||[])if(!real.has(z.mv))real.set(z.mv,z.v)}
    for(const c of cand){let s=(real.has(c.u)?clamp(real.get(c.u)):clamp(vOf(r,c.u))-HANG_W*hangLoss(c.P2))+c.bn-W*HIT_K*blackHit(c.P2);
      if(SAFE){const k=blackKills(c.P2);if(k===2)s-=5e6;else if(k===1)s-=4e6}
      s+=R()*15;if(s>bv){bv=s;best=[c.f,c.t];bw=c.why||"引擎＋塔防評估"}}}
  /* 招：一回合一招，照順序挑第一個划算的 */
  const pv=G.preview(td,P.board,C),inc=pv.loss,armedCanEat=legal.some(([f,t])=>P.board[t]&&td.arm[td.ids[t]]);
  const hpF=td.me.hp/td.me.max;
  const tryList=[];
  if(hpF<.45)for(const id of HEALS)tryList.push([id,"低血補血"]);
  if(inc>=6&&!armedCanEat&&!td.me.sh.v)for(const id of SHIELDS)tryList.push([id,"預告扣血，開盾"]);
  if(best&&P.board[best[1]]&&G.targets(P,"gfocus",[],C).includes(best[1])&&capVal(P.board[best[1]])>=6)tryList.push(["gfocus","集火"]);
  for(const id of ATK)tryList.push([id,"攻擊招"]);
  if(td.sk.includes("qi1"))tryList.push(["qi1","破甲：拆護陣／除入侵"]);
  if(td.sk.includes("luo1")&&td.lost.some(x=>"RCN".includes(x.p)))tryList.push(["luo1","回營"]);
  for(const[id,why]of tryList){if(!usable(P,id))continue;
    if(id==="gfocus"){if(cast(P,{k:id,tg:[best[1]]})){log.push(id+"："+why);break}continue}
    if(id==="qi1"){const T=G.targets(P,"qi1",[],C).filter(q=>{const tg=G.tagOf(td,td.ids[q]);return tg==="guard"||(tg==="inv"&&td.arm[td.ids[q]])});if(T.length&&cast(P,{k:id,tg:[T[0]]})){log.push(id+"："+why);break}continue}
    if(id==="luo1"){const T=G.targets(P,"luo1",[],C).filter(q=>td.lost.some(x=>x.home===q&&"RCN".includes(x.p)));if(T.length&&td.me.sp>=60&&cast(P,{k:id,tg:[T[0]]})){log.push(id+"："+why);break}continue}
    if(ATK.includes(id)){const a=attackVal(P,id);if(a&&a.d>=5&&cast(P,{k:id,tg:a.tg})){log.push(id+"："+why);break}continue}
    const tgs=firstTargets(P,id);if(tgs.length&&cast(P,{k:id,tg:tgs[0]})){log.push(id+"："+why);break}}
  /* 部署：場上非帥的子 ≤5、靈力夠、這步沒有擒子機會 → 放最大的後備子（用掉這一步） */
  const nOwn=P.board.filter(x=>x&&x===x.toUpperCase()&&x!=="K").length,bestCap=best&&P.board[best[1]];
  /* --v2：預告的大招這一步走棋取消不了，部署擋得住就部署（兵優先；部署完不能被一步將死或打空） */
  const bo=V2&&fxLive&&best?G.simR(P,best[0],best[1],C):null;
  if(bo&&G.fxSq(bo.td,bo.board,C)!=null&&td.me.sp>=G.DEP_COST&&!G.why(P,"dep",C)){for(const p of["P","A","B","C","N","R"]){if(!td.res.includes(p))continue;
    for(const q of G.targets(P,"dep",[p],C)){const x=tryCast(P,{k:"dep",p,tg:[q]});if(!x||G.fxSq(x.P2.td,x.P2.board,C)!=null||blackKills(x.P2))continue;if(cast(P,{k:"dep",p,tg:[q]}))return{dep:{p,sq:q},why:"部署擋住預告的大招",sk:log}}}}
  if(nOwn<=5&&!bestCap&&td.me.sp>=G.DEP_COST&&!G.why(P,"dep",C)){for(const p of["R","C","N","P","B","A"]){if(!td.res.includes(p))continue;const T=G.targets(P,"dep",[p],C).filter(q=>{if(!SAFE)return true;const x=tryCast(P,{k:"dep",p,tg:[q]});return x&&!blackKills(x.P2)});if(T.length){const o=cast(P,{k:"dep",p,tg:[T[0]]});if(o)return{dep:{p,sq:T[0]},why:"兵力不足，部署後備"+G.PCN[p],sk:log}}}}
  /* 放了會改盤面的招（換位、移除、復活）之後，原本挑的步可能不合法：重挑 */
  if(!C.legal(P.board,"r").some(([a,b])=>a===best[0]&&b===best[1])){const L=C.legal(P.board,"r");best=L[0];bw="招式改了盤面，重挑"}
  return{mv:best,why:bw,sk:log}}
async function play(E,lv,script,seed,ch,L){const R=rng(seed*7919+lv*131+script.length),P=newGame(lv,ch,L),td=P.td,rounds=[],src={r:{},b:{}};let end=null,cur=null,ply=0,seen=td.seq;
  const fx={},xs={drain:0,ph:1};
  const tally=()=>{for(const e of td.ev){if(e.s<=seen)continue;if(e.k==="hit"){const k=e.why;src[e.to][k]=(src[e.to][k]||0)+e.loss;src[e.to].abs=(src[e.to].abs||0)+e.abs}
    if(e.k==="esk"||e.k==="eskHit"||e.k==="eskOff"){const o=fx[e.id]||(fx[e.id]={esk:0,eskHit:0,eskOff:0});o[e.k]++}if(e.k==="drain")xs.drain+=e.n;if(e.k==="phase")xs.ph=Math.max(xs.ph,e.n)}seen=td.seq};   /* 11/15：預告大招（宣告／發動／取消）、奪靈扣的靈力、第 5 關到第幾段 */
  while(!end&&td.rnd<MAX_RND&&ply<400){ply++;
    if(P.turn==="r"){const d=await redTurn(E,P,script,R);cur={r:td.rnd+1,red:d.dep?"部署"+G.PCN[d.dep.p]+"@"+C.iccs(d.dep.sq,d.dep.sq).slice(0,2):C.iccs(d.mv[0],d.mv[1]),why:d.why,sk:d.sk};
      tally();if(d.dep){if(P.turn!=="b")throw new Error("部署沒換手");continue}
      const m=C.stateApply(P,d.mv[0],d.mv[1]);const e=G.move(P,m,C);const j=C.judgeState(P);end=j||(e&&e.end)||null;if(end)break;continue}
    const cfg=G.engine(P,C),r=await engLines(E,P,cfg.depth,cfg.mpv,cfg.sm),u=G.pick(r,cfg,R);const f=G.uSq(u,0),t=G.uSq(u,2);
    if(!C.legal(P.board,"b").some(([a,b])=>a===f&&b===t))throw new Error("星樞給了不合法的步 "+u);
    const m=C.stateApply(P,f,t);const e=G.move(P,m,C);tally();const j=C.judgeState(P);end=j||(e&&e.end)||null;
    if(cur){cur.blk=u;cur.me=td.me.hp;cur.en=td.en.hp;cur.msp=td.me.sp;cur.esp=td.en.sp;cur.msh=td.me.sh.v;rounds.push(cur);cur=null}}
  if(!end)end={w:null,why:`${MAX_RND} 回合上限（腳本對照才有的截斷，不是遊戲規則）`};
  return{src,lv,script,seed,ch,L,hard:td.hard?1:0,st:end.w==="r"?G.stars(td,P.board):null,gk:end.w==="r"?Object.fromEntries(Object.keys(G.GOAL).filter(k=>k!=="hp").map(k=>[k,G.GOAL[k].ok(td,P.board)?1:0])):null,tl:td.tl,w:end.w,why:end.why,rnd:td.rnd,me:td.me.hp,meMax:td.me.max,en:td.en.hp,enMax:td.en.max,dealt:td.me.dealt,taken:td.me.taken,icpt:td.icpt,dep:td.dep,used:td.used,fx,drain:xs.drain,ph:xs.ph,rounds}}
async function main(){let E=null,engNote="";try{E=await newEngine();engNote="App 網頁版 Pikafish（site/engine/pikafish.wasm）在 Node "+process.version+" 裡跑"}catch(e){engNote="Pikafish 在 Node 載入失敗（"+e.message+"），改用規則內建評估（引擎分數一律 0）"}
  console.log("引擎：",engNote);const runs=[],t0=Date.now();const plan=[];
  for(const lv of LVS)for(const s of SCR)for(let i=1;i<=SEEDS;i++)plan.push(SQ?{lv,s,seed:i,ch:"x_swordboy",L:SQUADS[SQN].lead,tag:"squad-"+SQN}:{lv,s,seed:i,ch:CHS[(i-1)%7],L:1});
  if(HI)for(const lv of LVS)for(let i=1;i<=SEEDS;i++)plan.push({lv,s:"smart",seed:i,ch:CHS[(i-1)%7],L:23,tag:"smart-L23"});
  for(const[k,p]of plan.entries()){const g=await play(E,p.lv,p.s,p.seed,p.ch,p.L);g.tag=p.tag||p.s;runs.push(g);if((k+1)%20===0)console.log(`  ${k+1}/${plan.length}  ${((Date.now()-t0)/1000).toFixed(0)} 秒`)}
  const sum={};for(const g of runs){const k=g.lv+"|"+g.tag,S=sum[k]||(sum[k]={lv:g.lv,tag:g.tag,n:0,w:0,d:0,l:0,rnd:0,me:0,en:0,dealt:0,taken:0,icpt:0,dep:0,why:{},sk:{},sr:{},sb:{},fx:{},drain:0,ph:{}});
    for(const id in g.fx){const o=S.fx[id]||(S.fx[id]={esk:0,eskHit:0,eskOff:0});for(const k in o)o[k]+=g.fx[id][k]}S.drain+=g.drain;S.ph[g.ph]=(S.ph[g.ph]||0)+1;
    for(const x in g.src.r)S.sr[x]=(S.sr[x]||0)+g.src.r[x];for(const x in g.src.b)S.sb[x]=(S.sb[x]||0)+g.src.b[x];
    S.n++;if(g.w==="r")S.w++;else if(g.w==="b")S.l++;else S.d++;S.rnd+=g.rnd;S.me+=Math.max(0,g.me)/g.meMax;S.en+=Math.max(0,g.en)/g.enMax;S.dealt+=g.dealt;S.taken+=g.taken;S.icpt+=g.icpt;S.dep+=g.dep;S.why[g.why]=(S.why[g.why]||0)+1;for(const id in g.used)S.sk[id]=(S.sk[id]||0)+g.used[id]}
  const rows=Object.values(sum).map(S=>({lv:S.lv,script:S.tag,n:S.n,win:S.w,draw:S.d,loss:S.l,avgRounds:+(S.rnd/S.n).toFixed(1),myHpLeft:+(S.me/S.n*100).toFixed(0)+"%",foeHpLeft:+(S.en/S.n*100).toFixed(0)+"%",
    dealt:+(S.dealt/S.n).toFixed(1),taken:+(S.taken/S.n).toFixed(1),icpt:+(S.icpt/S.n).toFixed(2),dep:+(S.dep/S.n).toFixed(2),why:S.why,skills:S.sk,takenBy:Object.fromEntries(Object.entries(S.sr).map(([k,v])=>[k,+(v/S.n).toFixed(1)])),dealtBy:Object.fromEntries(Object.entries(S.sb).map(([k,v])=>[k,+(v/S.n).toFixed(1)])),fx:S.fx,drainSp:+(S.drain/S.n).toFixed(1),phase:S.ph}));
  fs.mkdirSync(path.dirname(OUT),{recursive:true});fs.writeFileSync(OUT,JSON.stringify({meta:{date:new Date().toISOString(),tool:"xiangqi-lab/tools/gate-siege-sim.js",engine:engNote,redDepth:"同那一關星樞的深度（第 1、2 關 2、第 5 關 4、其他 3）",redMpv:RED_MPV,maxRounds:MAX_RND,seeds:SEEDS,levels:LVS,scripts:SCR,hi:HI,safe:SAFE,v2:V2,hard:HARDV,patch:PATCHED,ms:Date.now()-t0,
    note:"紅方是固定腳本，不是人類玩家；只證明這些條件下的行為，不能當真人勝率"},summary:rows,runs},null,1));
  for(const x of rows)console.log(`第${x.lv}關 ${x.script.padEnd(9)} 勝${x.win} 和${x.draw} 敗${x.loss}  平均${x.avgRounds}回合  我剩${x.myHpLeft} 星樞剩${x.foeHpLeft}  造成${x.dealt} 受到${x.taken} 截援${x.icpt} 部署${x.dep}  受到來源${JSON.stringify(x.takenBy)}  造成來源${JSON.stringify(x.dealtBy)}${Object.keys(x.fx).length?"  大招"+JSON.stringify(x.fx):""}${x.drainSp?"  奪靈"+x.drainSp:""}${x.lv===5?"  分段"+JSON.stringify(x.phase):""}`);
  console.log("寫到",OUT,"共",((Date.now()-t0)/1000).toFixed(0),"秒");if(E)E.close();process.exit(0)}
main().catch(e=>{console.error(e);process.exit(1)});
