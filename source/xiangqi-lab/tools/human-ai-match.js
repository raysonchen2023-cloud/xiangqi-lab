#!/usr/bin/env node
// 低段電腦擬人選步（src/local.js 的 HUMANPICK 區塊）改前改後對戰統計。說明：xiangqi-db/story/98_低段電腦擬人.md
// 不開瀏覽器：用本機 Pikafish（xiangqi-db/engine）＋訓練循環的對戰工具 xiangqi-db/tools/style_loop/match.js（程序全部登記、結束一定關）
//   「舊」＝改前的選步：margin 內平均亂抽（core.js pickMove 的同一套邏輯，只是亂數可注入）
//   「新」＝HUMANPICK（從 src/local.js 切 BEGIN～END 出來跑，跟 App 同一段程式）；業2 以上兩版一樣
//   每個受測等級對固定的基準對手各下 N 盤（紅黑輪流），統計受測方的：大失誤、無威脅送大子、漏看對方吃子威脅、貪吃被反吃、漏吃、平均手數、勝率（數字都是「每盤平均幾次」）
// 用法：node xiangqi-lab/tools/human-ai-match.js [--n 24] [--workers 4] [--levels 0,1,2,3,4] [--base o0,o5] [--set old,new] [--seed 11] [--out 檔案.jsonl]
//   --base：o0＝舊版新手（固定的弱基準）、o5＝業2（兩版一樣的強基準）；也可以寫 nK／oK（新／舊第 K 級）
//   --ladder：改成相鄰兩級互下（k 對 k+1，業1 對業2），看分級差距
//   --report 檔案.jsonl：不下棋，只把已有的紀錄整理成表
"use strict";
const fs=require("fs"),path=require("path"),os=require("os");
const LAB=path.join(__dirname,".."),ROOT=path.join(LAB,"..");
const C=require(path.join(LAB,"site","core.js"));
const M=require(path.join(ROOT,"xiangqi-db","tools","style_loop","match.js"));
const LOCAL=fs.readFileSync(path.join(LAB,"src","local.js"),"utf8").replace(/\r\n/g,"\n");
function cut(src,a,b){const i=src.indexOf(a),j=src.indexOf(b,i+1);if(i<0||j<i)throw new Error("local.js 找不到 "+a);return src.slice(i,j+b.length)}
const HP=new Function("C",cut(LOCAL,"/* HUMANPICK:BEGIN */","/* HUMANPICK:END */")+"\nreturn HUMANPICK(C);")(C);
const RLV=new Function("return "+LOCAL.match(/const RLV=(\[[\s\S]*?\]);/)[1])();
const up=p=>p.toUpperCase();

/* 舊選步：core.js pickMove 的同一套（margin 內平均抽），亂數可注入 */
function oldPick(r,lv,R){if(!lv.margin||r.lines.length<2)return r.best;const top=r.lines[0].v,c=r.lines.filter(x=>x.v>=top-lv.margin);return c[Math.floor(R()*c.length)].mv}
const ucis=S=>S.moves.map(m=>C.iccs(m.f,m.t));
function player(id){const ver=id[0],k=+id.slice(1),lv=RLV[k];if(!lv||!"on".includes(ver))throw new Error("不認得的玩家 "+id);
  const hp=ver==="n"&&HP.on(lv);
  return{id,async choose(S,eng,R){const r=await eng.analyse(ucis(S),{depth:lv.depth,multipv:hp?HP.mpvOf(lv):lv.multipv||1});
    if(!r.lines.length)return{mv:r.best,src:"eng"};
    const mv=hp?HP.pick(r,lv,S.board,S.turn,R).mv:oldPick(r,lv,R),x=r.lines.find(l=>l.mv===mv),cl=v=>Math.max(-2500,Math.min(2500,v));
    const loss=x?Math.max(0,cl(r.lines[0].v)-cl(x.v)):0;ELOSS.set(ucis(S).join(" "),loss);
    return{mv,src:"eng",top1:mv===r.lines[0].mv,loss}}}}
/* 每一步在受測方自己的搜尋深度下「比最好的著法差多少厘兵」（引擎確認的真損失）；鍵＝走這步之前的著法串 */
const ELOSS=new Map(),BIG=300;

/* 受測方每一步的失誤分類（規則判定，跟 HUMANPICK 用同一個 threats：走完以後對方吃得到我哪顆子、淨虧幾個兵）
   hang＝無威脅送大子：不是吃子、不是將軍、自己沒被將、這顆車馬炮原本沒被捉，走過去的格子卻淨虧 ≥3（hangR＝其中是車）
   miss＝漏看對方吃子威脅：走之前有子淨虧 ≥3 被捉著，走完還是虧那麼多（吃到的子扣掉），而且明明有別的著法可以少虧（躲得掉）
   greedy＝貪吃被反吃：吃子以後那顆子淨虧比吃到的多 ≥1 個兵（greedyHit＝對方下一手真的吃回來）
   missCap＝漏吃：有淨賺 ≥3 的吃子沒吃（自己沒被捉 ≥3、沒將軍、這步也沒淨賺 ≥1）
   hang、miss、missCap 另外要引擎確認：這步在受測方自己的深度下比最好的差 ≥ BIG（300 厘兵，約 2 個多兵）；greedy 要差 ≥130（1 個兵）
   big＝大失誤：引擎確認差 ≥ BIG 的步（不管原因），other＝大失誤裡不屬於以上任何一類的 */
function analyze(moves,side,lossOf){let b=C.parseFen(C.START),s="r";const o={mv:0,big:0,other:0,hang:0,hangR:0,miss:0,greedy:0,greedyHit:0,missCap:0};
  lossOf=lossOf||(i=>ELOSS.get(moves.slice(0,i).join(" ")));
  for(let i=0;i<moves.length;i++){const u=moves[i],f=C.parseSq(u.slice(0,2)),t=C.parseSq(u.slice(2,4));
    if(s===side){o.mv++;const p=b[f],q=b[t],a=C.make(b,f,t),chk=C.inCheck(a,C.opp(s)),inChk=C.inCheck(b,s),el=lossOf(i);
      const big=el!=null&&el>=BIG,before=HP.threats(b,s),after=HP.threats(a,s),cap=q?HP.val(q,t):0,bm=HP.maxOf(before);let tag=false;
      if(big)o.big++;
      if(big&&!q&&!chk&&!inChk&&"RNC".includes(up(p))&&before[f]==null&&(after[t]||0)>=3){o.hang++;tag=true;if(up(p)==="R")o.hangR++}
      if(big&&bm>=3&&!chk&&HP.maxOf(after)-cap>=bm-0.5){let can=false;
        for(const[x,y]of C.legal(b,s)){const n2=HP.maxOf(HP.threats(C.make(b,x,y),s))-(b[y]?HP.val(b[y],y):0);if(n2<bm-0.5){can=true;break}}
        if(can){o.miss++;tag=true}}
      if(el!=null&&el>=130&&q&&(after[t]||0)-cap>=1){o.greedy++;tag=true;const nx=moves[i+1];if(nx&&C.parseSq(nx.slice(2,4))===t)o.greedyHit++}
      if(big&&bm<3&&!chk&&!(q&&cap-(after[t]||0)>=1)){let g=0;for(const[x,y]of C.legal(b,s)){if(!b[y])continue;const gn=HP.val(b[y],y)-(HP.threats(C.make(b,x,y),s)[y]||0);if(gn>g)g=gn}
        if(g>=3){o.missCap++;tag=true}}
      if(big&&!tag)o.other++}
    b=C.make(b,f,t);s=C.opp(s)}
  return o}

function table(recs){const G={};
  for(const g of recs){const k=g.tag;const A=G[k]||(G[k]={tag:k,n:0,w:0,d:0,l:0,plies:0,mv:0,big:0,other:0,hang:0,hangR:0,miss:0,greedy:0,greedyHit:0,missCap:0});
    const side=g.red===g.test?"r":"b";A.n++;A.plies+=g.plies;if(!g.w)A.d++;else if(g.w===side)A.w++;else A.l++;
    const o=g.an||analyze(g.moves.split(" ").filter(Boolean),side);for(const x of["mv","big","other","hang","hangR","miss","greedy","greedyHit","missCap"])A[x]+=o[x]||0}
  const f1=x=>x.toFixed(2),rows=Object.values(G).sort((a,b)=>a.tag<b.tag?-1:1);
  const out=["| 受測（版本・等級）對 基準 | 盤 | 勝/和/負 | 勝率 | 平均手數 | 每盤大失誤（每百步） | 送大子 | 其中送車 | 漏看威脅 | 貪吃被反吃（真被吃回） | 漏吃 | 其他 |","|---|---|---|---|---|---|---|---|---|---|---|---|"];
  for(const A of rows)out.push(`| ${A.tag} | ${A.n} | ${A.w}/${A.d}/${A.l} | ${(100*(A.w+A.d/2)/A.n).toFixed(0)}% | ${(A.plies/A.n).toFixed(0)} | ${f1(A.big/A.n)}（${(100*A.big/Math.max(1,A.mv)).toFixed(1)}） | ${f1(A.hang/A.n)} | ${f1(A.hangR/A.n)} | ${f1(A.miss/A.n)} | ${f1(A.greedy/A.n)}（${f1(A.greedyHit/A.n)}） | ${f1(A.missCap/A.n)} | ${f1(A.other/A.n)} |`);
  return out.join("\n")}
const NAME=id=>(id[0]==="n"?"新":"舊")+"・"+["新手","入門1","入門2","入門3","業1","業2","業3"][+id.slice(1)];

if(require.main===module){(async()=>{
  const argv=process.argv.slice(2),arg=(k,d)=>{const i=argv.indexOf(k);return i>=0?argv[i+1]:d};
  const rep=arg("--report",null);if(rep){console.log(table(M.readJsonl(rep)));return}
  const N=+arg("--n",24),W=Math.min(4,+arg("--workers",4)||4),seed=+arg("--seed",11);
  const levels=arg("--levels","0,1,2,3,4").split(",").map(Number),bases=arg("--base","o0,o5").split(","),sets=arg("--set","old,new").split(",");
  const out=arg("--out",path.join(os.tmpdir(),"human-ai-match","run_"+Date.now()+".jsonl"));
  const players={},jobs=[];const add=id=>players[id]||(players[id]=player(id));
  /* --ladder：相鄰兩級互下（k 對 k+1，受測方＝低的那級），看分級差距 */
  if(argv.includes("--ladder"))for(const set of sets)for(const k of levels){if(!levels.includes(k+1)&&k+1>5)continue;const lo=(set==="new"?"n":"o")+k,hi=(set==="new"?"n":"o")+(k+1);add(lo);add(hi);
    const tag="階梯 "+NAME(lo)+" 對 "+NAME(hi);for(let i=0;i<N;i++)jobs.push({id:`${lo}-${hi}-L${i}`,red:i%2?hi:lo,black:i%2?lo:hi,tag,test:lo})}
  if(!argv.includes("--ladder"))for(const base of bases){add(base);for(const set of sets)for(const k of levels){const id=(set==="new"?"n":"o")+k;add(id);
    const tag=NAME(id)+" 對 "+NAME(base);for(let i=0;i<N;i++){const red=i%2?base:id,black=i%2?id:base;jobs.push({id:`${id}-${base}-${i}`,red,black,tag,test:id})}}}
  /* 同一個玩家對自己（例如 o0 對 o0）也收：受測方固定算紅方 */
  const J=jobs,testOf={};for(const j of J)testOf[j.id]=j;
  console.log(`共 ${J.length} 盤、${W} 個引擎；紀錄：${out}`);
  const recs=[];
  const r=await M.runJobs({players,jobs:J,out:null,workers:W,seed,
    onGame:(g,k,n)=>{const j=testOf[g.id],side=g.red===j.test?"r":"b",rec={...g,tag:j.tag,test:j.test,an:analyze(g.moves.split(" ").filter(Boolean),side)};delete rec.st;
      fs.mkdirSync(path.dirname(out),{recursive:true});fs.appendFileSync(out,JSON.stringify(rec)+"\n");recs.push(rec);
      for(const x of[...ELOSS.keys()])if(g.moves.startsWith(x))ELOSS.delete(x);
      if(k%20===0||k===n)console.log(`[${k}/${n}] ${(r0=>r0)(j.tag)}：${g.w?g.w===side?"受測勝":"受測負":"和"}（${g.why}）${g.plies} 手`)}});
  console.log(`完成 ${r.results.length} 盤、${(r.wallMs/1000).toFixed(0)} 秒、CPU 忙碌 ${r.cpu.busyPct}%、Node 主執行緒 ${r.cpu.nodePct}%`);
  console.log(table(recs));
})().catch(e=>{console.error(e);M.killAll();process.exit(1)})}
module.exports={HP,RLV,oldPick,analyze,table,player,ELOSS};
