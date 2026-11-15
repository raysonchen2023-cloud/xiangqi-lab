#!/usr/bin/env node
/* 七星改版：黑洞塔防（m/07bht-td.js 的 BHTD）真引擎對照（開發者 11/15 選單「寫一支塔防對照工具」）。只用 node：不開任何瀏覽器、不呼叫任何 AI API、不改 App 的檔。
   星樞＝App 同一份規則：vm 載入 07bht-td.js、07bhg-gatesiege.js（檔尾包 window.XQ_TD）、07bhw-wheel.js，照 src/local.js 的順序叫 XQ_TD.engine → Pikafish → XQ_TD.pick → stateApply → XQ_TD.move → judgeState。
   引擎、玩家下法（greedy 貪心吃子、engN 引擎 N 層最佳步；都不放招）借用 siege-wheel-bench.js（newEngine、mkPlayers、rng、seedOf），結果不能換算成真人勝率。
   用法：node xiangqi-lab/tools/party-td-bench.js [--lv 1,2,…] [--seeds 20] [--players greedy,eng4] [--squad 第1天|第3天|第8天|練很高] [--src-td 舊的07bht-td.js] [--out 檔.json]
     --squad：每種棋子各用自己角色的等級（木棋靈＝修為一半），隊長固定齊轍、等級＝情境的隊長等級；沒給＝每局輪流七位當主角、等級 --L（預設 1）。
     --src-td：載入別份塔防規則檔（例如改版前的備份）當基準；舊檔看不懂 sq，會照舊整隊一組。 */
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const SWB=require("./siege-wheel-bench.js");
const ROOT=path.join(__dirname,"..",".."),MDIR=path.join(ROOT,"xiangqi-db","m");
const C=require(path.join(ROOT,"xiangqi-lab","site","core.js"));
const MAX_RND=60,MAX_PLY=400;
const SQUADS={"第1天":{lead:3,lv:{R:3},wood:1},"第3天":{lead:6,lv:{R:6,N:4,K:4,A:4},wood:3},"第8天":{lead:9,lv:{R:9,N:8,K:7,A:7,B:7,P:7,C:7},wood:4},"練很高":{lead:20,lv:{R:20,N:18,K:18,A:18,B:18,P:18,C:18},wood:10}};
const PCOF={R:"x_swordboy",N:"x_miaogirl",B:"x_spiritgirl",A:"x_shi",K:"x_shuai",C:"x_martialgirl",P:"x_bing"};
const squadOf=n=>Object.fromEntries(Object.entries(PCOF).map(([pc,ck])=>{const v=SQUADS[n].lv[pc];return[pc,v?{ck,L:v}:{ck,L:SQUADS[n].wood,wood:1}]}));
function loadApp(srcTd){const win={};const ctx={console,Math,JSON,Date,setTimeout,clearTimeout,Promise,window:win,addEventListener(){},location:{hash:"",hostname:""}};vm.createContext(ctx);
  const files=[srcTd||path.join(MDIR,"07bht-td.js"),path.join(MDIR,"07bhg-gatesiege.js"),path.join(MDIR,"07bhw-wheel.js")];
  vm.runInContext(files.map(f=>fs.readFileSync(f,"utf8")).join("\n")+"\n;this.GSV=GSV;this.BHTD=BHTD;",ctx,{filename:"xiangqi-db-m.js"});
  if(!win.XQ_TD)throw new Error("window.XQ_TD 沒有包上（07bhg 的接線沒跑到）");return{G:ctx.GSV,BH:ctx.BHTD,XQ:win.XQ_TD}}
async function playTd(A,E,PL,o){const BH=A.BH,XQ=A.XQ,lv=+o.lv,seed=+o.seed,player=o.player;
  const key="td|"+lv+"|"+seed,rndB=SWB.rng(SWB.seedOf(key+"|星樞")),R=SWB.rng(SWB.seedOf(key+"|"+player));
  const J="bh:td"+lv,start=BH.startFen(lv,C),P={id:"tdb-"+lv+"-"+player+"-"+seed,human:"r",start,startTurn:"r",moves:[],result:null,journey:J};
  C.stateRebuild(P);const cfg={lv,ch:o.ch,L:o.L,diff:2,xm:0,tal:[]};if(o.sq)cfg.sq=o.sq;P.td=XQ.boot(cfg,P,C);const td=P.td;
  const end=(w,why)=>{if(!P.result)P.result={w,why}};
  const apply=(f,t)=>{C.stateApply(P,f,t);const tdE=XQ.move(P,P.moves[P.moves.length-1],C);let r=C.judgeState(P);if(r&&P.noPerp&&/長將|長捉|長打/.test(r.why))r=null;if(!r&&tdE&&tdE.end)r=tdE.end;if(r)end(r.w,r.why)};
  const pos=()=>P.ed&&P.ed.length?{fen:C.fen(P.board,P.turn)}:{fen:P.start+" "+(P.startTurn==="b"?"b":"w"),moves:P.moves.map(m=>C.iccs(m.f,m.t))};
  const X={A,P,E,R,pos,why:()=>"x",cast:()=>null},play=PL.get(player);let cut=0;
  while(!P.result){if(td.rnd>=MAX_RND||P.moves.length>=MAX_PLY){cut=1;break}
    if(P.turn==="r"){const d=await play(X);if(!d||!d.mv)throw new Error("玩家下法沒給步");apply(d.mv[0],d.mv[1]);continue}
    const T=XQ.engine(P,C),r=await E.search(pos(),{depth:T.depth,searchmoves:T.sm},T.mpv),mv=XQ.pick(r,T,rndB);
    const f=C.parseSq(mv.slice(0,2)),t=C.parseSq(mv.slice(2,4));if(!C.legal(P.board,P.turn).some(([a,b])=>a===f&&b===t))throw new Error("星樞給出不合法著法 "+mv);apply(f,t)}
  const res=P.result||{w:null,why:"回合上限（工具才有的截斷）"};
  return{lv,seed,player,ch:o.ch,L:o.L,squad:o.squadName||null,w:res.w,why:res.why,cut,rounds:td.rnd,plies:P.moves.length,me:td.me.hp,meMax:td.me.max,en:td.en.hp,enMax:td.en.max}}
async function main(argv){const val=(k,d)=>{const i=argv.indexOf(k);return i>=0&&i+1<argv.length?argv[i+1]:d};
  const SQN=val("--squad",null);if(SQN&&!SQUADS[SQN])throw new Error("--squad 只有："+Object.keys(SQUADS).join("、"));
  const A=loadApp(val("--src-td",null)),LVS=String(val("--lv","1,2,3,4,5,6,7,8,9,10,11,12")).split(",").map(Number),SEEDS=+val("--seeds",20),PLS=String(val("--players","greedy,eng4")).split(","),Lx=+val("--L",1);
  for(const lv of LVS)if(!A.BH.LV[lv-1])throw new Error("塔防沒有第 "+lv+" 關");
  const PL=SWB.mkPlayers({G:A.G});for(const p of PLS)PL.get(p);const E=await SWB.newEngine({tt:"move"}),CHS=Object.keys(A.BH.CH),runs=[],t0=Date.now();
  const plan=[];for(const lv of LVS)for(const p of PLS)for(let i=1;i<=SEEDS;i++)plan.push(SQN?{lv,player:p,seed:i,ch:"x_swordboy",L:SQUADS[SQN].lead,sq:squadOf(SQN),squadName:SQN}:{lv,player:p,seed:i,ch:CHS[(i-1)%CHS.length],L:Lx});
  for(const[k,p]of plan.entries()){runs.push(await playTd(A,E,PL,p));if((k+1)%20===0)console.log("  "+(k+1)+"/"+plan.length+"  "+((Date.now()-t0)/1000).toFixed(0)+" 秒")}
  const sum=[];for(const lv of LVS)for(const p of PLS){const R=runs.filter(r=>r.lv===lv&&r.player===p),w=R.filter(r=>r.w==="r");
    sum.push({lv,player:p,n:R.length,win:w.length,draw:R.filter(r=>r.w!=="r"&&r.w!=="b").length,loss:R.filter(r=>r.w==="b").length,meLeft:w.length?Math.round(100*w.reduce((a,r)=>a+r.me/r.meMax,0)/w.length):null})}
  const out=val("--out",path.join(ROOT,"tmp","party-td-bench","bench.json"));fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify({meta:{tool:"xiangqi-lab/tools/party-td-bench.js",date:new Date().toISOString(),cmd:"node xiangqi-lab/tools/party-td-bench.js "+argv.join(" "),engine:E.note,note:"自動下法對星樞，不是真人"},summary:sum,runs},null,1));
  for(const s of sum)console.log("第"+s.lv+"關 "+s.player.padEnd(7)+" 勝"+s.win+" 和"+s.draw+" 敗"+s.loss+(s.meLeft!=null?"  贏時剩元氣"+s.meLeft+"%":""));
  console.log("寫到",out,"共",((Date.now()-t0)/1000).toFixed(0),"秒");E.close();return 0}
if(require.main===module)main(process.argv.slice(2)).then(c=>process.exit(c||0),e=>{console.error(e);process.exit(1)});
module.exports={SQUADS,squadOf,loadApp,playTd,main};
