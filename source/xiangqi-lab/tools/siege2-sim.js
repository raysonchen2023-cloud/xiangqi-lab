#!/usr/bin/env node
// 黑洞新規則（星門圍城 v2，story/164～166）電腦對打：只用 node，不開瀏覽器、不叫 Pikafish。
//   規則：m/07bhg-gatesiege.js（關卡擺法、波次）＋m/07sg2-siege2.js（SG2 每顆子體力攻防、SG2G 對局與 38 招），vm 載入，跟 App 同一份。
//   紅方（代替玩家）＝同一套 alpha-beta（--rd 步，預設 2）＋簡單放招（--skill on：能放就挑最划算的目標放，補血只在少三成以上才補）；黑方＝App 的星樞（照難度 1／2／3 步）。
// 用法：node xiangqi-lab/tools/siege2-sim.js [--lv 1,2,…] [--diff 1,2,3] [--squad 第1天|第3天|第8天|練很高] [--seeds 6] [--rd 2] [--noise 0.2] [--skill on|off] [--chk all|lethal]（預設 all＝照一般象棋都要應，開發者 11/16 定） [--elv N] [--json 檔名]
//   印出每關每難度：紅勝／黑勝／和、平均回合、紅帥剩體力、勝的星數；--json 另存明細。
"use strict";
const fs=require("fs"),path=require("path"),vm=require("vm");
const ROOT=path.join(__dirname,"../..");
const C=require(path.join(ROOT,"xiangqi-lab/site/core.js"));
const rd=p=>fs.readFileSync(path.join(ROOT,p),"utf8");
const SQ_PC={R:"x_swordboy",N:"x_miaogirl",B:"x_spiritgirl",A:"x_shi",K:"x_shuai",C:"x_martialgirl",P:"x_bing"};
const SQUADS={"第1天":{lv:{R:3},wood:1},"第3天":{lv:{R:6,N:4,K:4,A:4},wood:3},"第8天":{lv:{R:9,N:8,K:7,A:7,B:7,P:7,C:7},wood:4},"練很高":{lv:{R:20,N:18,K:18,A:18,B:18,P:18,C:18},wood:10}};
const squadOf=n=>Object.fromEntries(Object.entries(SQ_PC).map(([pc,ck])=>{const v=SQUADS[n].lv[pc];return[pc,v?{ck,L:v}:{ck,L:SQUADS[n].wood,wood:1}]}));
function rng(seed){let s=(seed>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296}}
function loadApp(){const ctx={console,Math:Object.create(Math),JSON};vm.createContext(ctx);vm.runInContext(rd("xiangqi-db/m/07bhg-gatesiege.js")+"\n"+rd("xiangqi-db/m/07sg2-siege2.js")+"\n;this.GSV=GSV;this.SG2=SG2;this.SG2G=SG2G;",ctx);return ctx}
function newGame(A,lv,diff,sq,sk){const G=A.GSV,start=G.startFen(lv,C),P={start,startTurn:"r",board:C.parseFen(start),turn:"r",moves:[],human:"r",pos:[]};P.pos=[C.fen(P.board,"r")];
  P.td=A.SG2G.boot({mode:A.SG2G.MODE,lv,diff,sq,sk},P,C);return P}
/* 紅方放招：每一招試所有目標組合（最多兩步），用評估分數挑最好的；比不放好才放 */
function trySkill(A,P){const T=A.SG2G,S2=A.SG2,td=P.td;let best=null,b0=S2.evalS(td.s,"r");
  for(const id of td.sk){if(T.why(P,id,C))continue;const s=T.SKM[id];if(s.info)continue;const steps=(s.tg||[]).length;const combos=[];
    if(!steps)combos.push([]);else for(const a of T.targets(P,id,[],C)){if(steps===1)combos.push([a]);else for(const b of T.targets(P,id,[a],C))combos.push([a,b])}
    for(const tg of combos.slice(0,12)){const Q=JSON.parse(JSON.stringify(P));const r=T.cast(Q,{k:id,tg},C);if(r.err)continue;const v=S2.evalS(Q.td.s,"r")-T.costOf(td,id)*.02+(/heal|shen1|shen4|tian4|luo4/.test(id)?0:.05);
      if(!best||v>best.v)best={v,id,tg}}}
  if(best&&best.v>b0+.15){const r=T.cast(P,{k:best.id,tg:best.tg},C);if(!r.err)return best.id}return null}
function playOne(A,o){const T=A.SG2G,R=rng(o.seed);A.Math.random=R;const P=newGame(A,o.lv,o.diff,o.sq,o.sk);const used=[];let n=0;
  while(!P.td.over&&n<400){n++;if(P.turn==="r"){if(o.skill&&P.td.sk1!==P.td.rnd){const s=trySkill(A,P);if(s)used.push(s)}
      if(P.turn!=="r")continue;const L=T.legal(P,C,"r");if(!L.length)break;const m=A.SG2.decide(P.td.s,"r",o.noise&&R()<o.noise?1:o.rd,R,L);T.play(P,m[0],m[1],C)}
    else{const m=T.decide(P,C);if(!m)break;T.play(P,m[0],m[1],C)}}
  const td=P.td,k=A.SG2.kingOf(td.s.b,"r"),w=td.over?td.over.w:null;
  return{lv:o.lv,diff:o.diff,seed:o.seed,w,why:td.over&&td.over.why,rnd:td.rnd,khp:k>=0?Math.round(td.s.h[k]/td.s.x[k]*100):0,st:T.stars(td).reduce((a,b)=>a+b,0),sp:Object.values(td.sp||{}).reduce((a,b)=>a+b,0),used:used.length}}
function main(){const a=process.argv.slice(2),val=(k,d)=>{const i=a.indexOf(k);return i>=0?a[i+1]:d};
  const A=loadApp(),G=A.GSV,LVS=val("--lv","31,34,37,39,1,2,3,4,5,6,7,8,9,10,11,12").split(",").map(Number).filter(n=>G.LV[n]),DIFFS=val("--diff","1,2,3").split(",").map(Number),SEEDS=+val("--seeds",6),RD=+val("--rd",2),NOISE=+val("--noise",0.2);
  const SQN=val("--squad","第3天");if(!SQUADS[SQN])throw new Error("--squad 只有："+Object.keys(SQUADS).join("、"));A.SG2.setChk(val("--chk","all"));
  const sq=squadOf(SQN),skill=val("--skill","on")!=="off",out=[],t0=Date.now(),ELV=val("--elv",null);if(ELV!=null)for(const n of LVS)G.LV[n].elv=+ELV;   /* --elv：所有關的對方等級都設成同一個（排關卡本身難易用） */
  console.log(`隊伍 ${SQN}　紅方 ${RD} 步（${Math.round(NOISE*100)}% 的步只看 1 步、像人會失手）${skill?"＋放招":""}　應將 ${A.SG2.CHK}　每格 ${SEEDS} 盤`);
  console.log("關\t難度\t紅勝\t黑勝\t和\t平均回合\t紅帥剩%\t勝時星數\t秒");
  for(const lv of LVS)for(const diff of DIFFS){const t1=Date.now(),R=[];for(let i=0;i<SEEDS;i++)R.push(playOne(A,{lv,diff,seed:1000+i*97+lv*13+diff,sq,rd:RD,skill,noise:NOISE}));out.push(...R);
    const W=R.filter(r=>r.w==="r"),avg=(L,k)=>L.length?(L.reduce((s,r)=>s+r[k],0)/L.length).toFixed(1):"-";
    console.log([lv+"("+(G.LV[lv].code||lv)+")",["","易","中","難"][diff],W.length,R.filter(r=>r.w==="b").length,R.filter(r=>!r.w).length,avg(R,"rnd"),avg(R,"khp"),avg(W,"st"),((Date.now()-t1)/1000).toFixed(0)].join("\t"))}
  const J=val("--json",null);if(J){fs.writeFileSync(J,JSON.stringify(out,null,1));console.log("明細："+J)}console.log("共",((Date.now()-t0)/1000).toFixed(0),"秒")}
if(require.main===module)main();
module.exports={SQUADS,squadOf,loadApp,newGame,playOne,trySkill,rng};
