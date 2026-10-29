// 自動產生，請勿直接修改：來源是 xiangqi-referee.js（node xiangqi-lab/tools/build-site.js）
// 需要外部提供：evalPos(board, side, ms, multipv)（網頁版 Pikafish）
"use strict";
var XQCore=(function(){
// ===== 規則、記譜（xiangqi-referee.js「引擎」段） =====
const START="rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR";
const NAMES={r:{K:"帥",A:"仕",B:"相",N:"傌",R:"俥",C:"炮",P:"兵"},b:{K:"將",A:"士",B:"象",N:"馬",R:"車",C:"砲",P:"卒"}};
const CN=["","一","二","三","四","五","六","七","八","九"];
const VAL={K:100,R:9,C:4.5,N:4,B:2,A:2,P:1};
const D4=[[1,0],[-1,0],[0,1],[0,-1]], DG=[[1,1],[1,-1],[-1,1],[-1,-1]];
const NJ=[[-2,-1,-1,0],[-2,1,-1,0],[2,-1,1,0],[2,1,1,0],[-1,-2,0,-1],[1,-2,0,-1],[-1,2,0,1],[1,2,0,1]];
const sideOf=p=>p?(p===p.toUpperCase()?"r":"b"):null;
const opp=s=>s==="r"?"b":"r";
function parseFen(f){const b=Array(90).fill(null);let r=0,c=0;for(const ch of f){if(ch==="/"){r++;c=0}else if(/\d/.test(ch))c+=+ch;else{b[r*9+c]=ch;c++}}return b}
function fen(b,s){const rows=[];for(let r=0;r<10;r++){let row="",e=0;for(let c=0;c<9;c++){const p=b[r*9+c];if(!p)e++;else{if(e){row+=e;e=0}row+=p}}if(e)row+=e;rows.push(row)}return rows.join("/")+" "+(s==="r"?"w":"b")}
const inb=(r,c)=>r>=0&&r<10&&c>=0&&c<9;
function pseudo(b,sq){
  const p=b[sq],r=sq/9|0,c=sq%9,s=sideOf(p),t=p.toUpperCase(),out=[];
  const add=(rr,cc)=>{if(!inb(rr,cc))return;const q=b[rr*9+cc];if(!q||sideOf(q)!==s)out.push(rr*9+cc)};
  const pal=(rr,cc)=>cc>=3&&cc<=5&&(s==="r"?rr>=7&&rr<=9:rr>=0&&rr<=2);
  if(t==="K"){for(const[a,d]of D4)if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="A"){for(const[a,d]of DG)if(pal(r+a,c+d))add(r+a,c+d)}
  else if(t==="B"){for(const[a,d]of DG){const rr=r+2*a,cc=c+2*d;if(!inb(rr,cc))continue;if(s==="r"?rr<5:rr>4)continue;if(b[(r+a)*9+c+d])continue;add(rr,cc)}}
  else if(t==="N"){for(const[a,d,la,ld]of NJ){const rr=r+a,cc=c+d;if(!inb(rr,cc))continue;if(b[(r+la)*9+c+ld])continue;add(rr,cc)}}
  else if(t==="R"||t==="C"){for(const[a,d]of D4){let rr=r+a,cc=c+d,jumped=false;while(inb(rr,cc)){const q=b[rr*9+cc];
      if(t==="R"){if(!q)out.push(rr*9+cc);else{if(sideOf(q)!==s)out.push(rr*9+cc);break}}
      else{if(!jumped){if(!q)out.push(rr*9+cc);else jumped=true}else if(q){if(sideOf(q)!==s)out.push(rr*9+cc);break}}
      rr+=a;cc+=d}}}
  else if(t==="P"){const f=s==="r"?-1:1;add(r+f,c);if(s==="r"?r<=4:r>=5){add(r,c-1);add(r,c+1)}}
  return out}
function kingSq(b,s){const k=s==="r"?"K":"k";return b.indexOf(k)}
function facing(b){const a=kingSq(b,"r"),k=kingSq(b,"b");if(a<0||k<0||a%9!==k%9)return false;for(let i=k+9;i<a;i+=9)if(b[i])return false;return true}
function attacked(b,sq,by){for(let i=0;i<90;i++){const p=b[i];if(p&&sideOf(p)===by&&pseudo(b,i).includes(sq))return true}return false}
function inCheck(b,s){const k=kingSq(b,s);return k<0||attacked(b,k,opp(s))}
function make(b,f,t){const n=b.slice();n[t]=n[f];n[f]=null;return n}
function legalOk(b,f,t){const s=sideOf(b[f]);const n=make(b,f,t);return !inCheck(n,s)&&!facing(n)}
function legal(b,s){const out=[];for(let i=0;i<90;i++){const p=b[i];if(p&&sideOf(p)===s)for(const t of pseudo(b,i))if(legalOk(b,i,t))out.push([i,t])}return out}
const sqName=q=>String.fromCharCode(97+q%9)+(9-(q/9|0));
const iccs=(f,t)=>sqName(f)+sqName(t);
function parseSq(s){const c=s.charCodeAt(0)-97,r=9-(+s[1]);return r*9+c}
function notate(b,f,t){
  const p=b[f],s=sideOf(p),T=p.toUpperCase(),fr=f/9|0,fc=f%9,tr=t/9|0,tc=t%9,name=NAMES[s][T];
  const file=c=>s==="r"?9-c:c+1, num=n=>s==="r"?CN[n]:String(n);
  const same=[];for(let r=0;r<10;r++)if(b[r*9+fc]===p)same.push(r);
  let head;
  if(same.length>1&&T!=="K"){const ord=s==="r"?same.sort((x,y)=>x-y):same.sort((x,y)=>y-x);const i=ord.indexOf(fr);
    const pre=ord.length===2?(i?"後":"前"):ord.length===3?["前","中","後"][i]:num(i+1);head=pre+name}
  else head=name+num(file(fc));
  const fwd=s==="r"?fr-tr:tr-fr;let act,dest;
  if(fr===tr){act="平";dest=num(file(tc))}else{act=fwd>0?"進":"退";dest="NBA".includes(T)?num(file(tc)):num(Math.abs(fr-tr))}
  return head+act+dest}
function crossed(p,sq){const r=sq/9|0;return sideOf(p)==="r"?r<=4:r>=5}
// 「捉」：mover 對對方子的有效攻擊（非將帥/兵卒發起；目標非將帥、非未過河兵卒；無根或以小攻大）
function chasePairs(b,s){
  const out=new Set();
  for(let i=0;i<90;i++){const p=b[i];if(!p||sideOf(p)!==s)continue;const T=p.toUpperCase();if(T==="K"||T==="P")continue;
    for(const t of pseudo(b,i)){const q=b[t];if(!q||sideOf(q)===s)continue;const Q=q.toUpperCase();if(Q==="K")continue;if(Q==="P"&&!crossed(q,t))continue;
      if(!legalOk(b,i,t))continue;
      const n=make(b,i,t);let prot=false;const o=opp(s);
      for(let j=0;j<90&&!prot;j++){const x=n[j];if(x&&sideOf(x)===o&&pseudo(n,j).includes(t)&&legalOk(n,j,t))prot=true}
      if(!prot||VAL[T]<VAL[Q])out.add(i+">"+t)}}
  return out}
function hasAttackers(b,s){return b.some(p=>p&&sideOf(p)===s&&"RNCP".includes(p.toUpperCase()))}



const PLAYER={r:"紅方",b:"黑方"};
// ===== 棋譜註記 =====
function annotate(it){
  const byId=new Map(it.lines.map(l=>[l.id,l])),raw=new Map(it.lines.map(l=>[l.id,l.moves.map(m=>Array.isArray(m)?m:[m.f,m.t])]));
  const seq=(id,ply)=>{const l=byId.get(id);if(!l)return[];if(ply<l.start)return l.parent==null?[]:seq(l.parent,ply);
    return(l.parent==null?[]:seq(l.parent,l.start-1)).concat(raw.get(id).slice(0,ply-l.start+1))};
  for(const l of it.lines){let b=it.board.slice();
    if(l.parent!=null)for(const[f,t]of seq(l.parent,l.start-1))b=make(b,f,t);
    l.moves=raw.get(l.id).map(([f,t])=>{let cn="?";try{if(b[f])cn=notate(b,f,t)}catch(e){}b=make(b,f,t);return{f,t,cn}})}
  return it}
const summary=it=>({id:it.id,no:it.no,label:it.label,part:it.part,title:it.title||(it.red&&it.black?it.red+" 對 "+it.black:""),name:it.name,result:it.result,
  type:it.type,red:it.red,black:it.black,event:it.event,year:it.year,date:it.date,open:it.open});
function fullItem(it){if(!it.board)it.board=parseFen(START);if(!it._an){annotate(it);Object.defineProperty(it,"_an",{value:true})}return it}
function gameItem(g,isLive){
  let b=parseFen(START);const moves=g.moves.map(m=>{const cn=notate(b,m.f,m.t);b=make(b,m.f,m.t);return{f:m.f,t:m.t,cn,q:m.q,loss:m.loss,ev:m.ev,bc:m.bc}});
  const comments={};g.moves.forEach((m,i)=>{if(m.cm)comments["0_"+(i+1)]=PLAYER[m.by]+"："+m.cm});
  return{id:g.id||"current",title:`${g.red} 對 ${g.black}`,red:g.red,black:g.black,year:+String(g.date||g.id||"").slice(0,4)||null,name:(isLive?"【進行中】":"")+(g.date||String(g.id||"").slice(0,10))+"　"+g.red+" 對 "+g.black,
    result:isLive||!g.result?"進行中":(g.result.w?PLAYER[g.result.w]+"勝":"和局")+"（"+g.result.why+"）",
    board:parseFen(START),lines:[{id:0,parent:null,start:1,moves}],comments,lessons:g.lessons||null}}
// ===== 難度設定 =====
const LEVELS=[
// 「深度」= 引擎往後算幾步（紅黑各走一次算 2 步）
  {n:1,name:"入門",desc:"只算自己這 1 步，常常亂走",depth:1,multipv:10,margin:600},
  {n:2,name:"新手",desc:"往後算 2 步（1 回合），會漏子",depth:2,multipv:8,margin:300},
  {n:3,name:"業餘初段",desc:"往後算 4 步（2 回合），偶有失誤",depth:4,multipv:6,margin:150},
  {n:4,name:"業餘高段",desc:"往後算 6 步（3 回合），小失誤",depth:6,multipv:4,margin:70},
  {n:5,name:"棋協大師",desc:"往後算 9 步（約 4～5 回合），很少失誤",depth:9,multipv:3,margin:30},
  {n:6,name:"特級大師",desc:"每步想 0.5 秒（約算 15～20 步），不放水",movetime:500},
  {n:7,name:"職業頂尖",desc:"每步想 2 秒（約算 20～25 步）",movetime:2000},
  {n:8,name:"全力",desc:"每步想 6 秒（約算 25 步以上），人類幾乎贏不了",movetime:6000}];
// ===== 走子與裁判 =====
function stateApply(S,f,t){
  const mover=S.turn,chB=chasePairs(S.board,mover);
  const m={f,t,by:mover};m.cn=notate(S.board,f,t);m.cap=S.board[t];
  S.board=make(S.board,f,t);S.turn=opp(S.turn);S.pos.push(fen(S.board,S.turn));m.ck=inCheck(S.board,S.turn);
  m.ch=[...chasePairs(S.board,mover)].some(x=>!chB.has(x));
  S.moves.push(m);return m}
function stateRebuild(S){const old=S.moves||[];S.moves=[];S.board=parseFen(START);S.turn="r";S.pos=[fen(S.board,"r")];
  for(const o of old){const m=stateApply(S,o.f,o.t);for(const k of["q","loss","ev","bc"])if(o[k]!==undefined)m[k]=o[k]}}
function judgeState(S){
  const n=S.moves.length,mover=S.moves[n-1].by,other=opp(mover);
  if(legal(S.board,other).length===0)return{w:mover,why:inCheck(S.board,other)?"將死":"困斃"};
  if(!hasAttackers(S.board,"r")&&!hasAttackers(S.board,"b"))return{w:null,why:"雙方均無進攻子力"};
  let since=0;for(let i=n-1;i>=0;i--){if(S.moves[i].cap)break;since++}
  if(since>=120)return{w:null,why:"60 回合未吃子"};
  const key=S.pos[n],idx=[];S.pos.forEach((p,i)=>{if(p===key)idx.push(i)});
  if(idx.length>=3){const seg=S.moves.slice(idx[0]);
    const hit=s=>{const ms=seg.filter(m=>m.by===s);return{all:ms.length>0&&ms.every(m=>m.ck||m.ch),chk:ms.length>0&&ms.every(m=>m.ck)}};
    const R=hit("r"),B=hit("b");
    if(R.all&&!B.all)return{w:"b",why:"紅方"+(R.chk?"長將":"長捉")+"判負"};
    if(B.all&&!R.all)return{w:"r",why:"黑方"+(B.chk?"長將":"長捉")+"判負"};
    if(R.all&&B.all){if(R.chk&&!B.chk)return{w:"b",why:"紅方長將、黑方長捉，長將方判負"};if(B.chk&&!R.chk)return{w:"r",why:"黑方長將、紅方長捉，長將方判負"};return{w:null,why:"雙方長打，判和"}}
    return{w:null,why:"同一局面三次重複，判和"}}
  return null}
function pickMove(r,lv){
  if(!lv.margin||r.lines.length<2)return r.best;
  const top=r.lines[0].v,c=r.lines.filter(x=>x.v>=top-lv.margin);
  return c[Math.floor(Math.random()*c.length)].mv}
// ===== 每步評等 =====
const ANALYZE_MS=400;
const clampV=v=>Math.max(-2000,Math.min(2000,v));
async function classifyRaw(b,s,f,t,ms){
  const r=await evalPos(b,s,ms,2);if(r.dead||!r.lines.length)return null;
  const best=r.lines[0],second=r.lines[1],mv=iccs(f,t);
  let played;
  if(best.mv===mv)played=best.v;
  else{const after=make(b,f,t),r2=await evalPos(after,opp(s),ms,1);played=r2.dead?30000:(r2.lines[0]?-r2.lines[0].v:best.v)}
  const loss=Math.max(0,clampV(best.v)-clampV(played)),gap=second?clampV(best.v)-clampV(second.v):0;
  let q;
  if(best.mv===mv)q=gap>=150&&Math.abs(best.v)<1500?"妙手":"正手";
  else if(loss<10)q="正手";else if(loss<=40)q="優著";else if(loss<=100)q="良著";else if(loss<=300)q="錯著";else q="露著";
  const bf=parseSq(best.mv.slice(0,2)),bt=parseSq(best.mv.slice(2,4));
  return{q,loss,ev:s==="r"?played:-played,bc:notate(b,bf,bt),bm:best.mv}}
return{START,NAMES,CN,VAL,sideOf,opp,parseFen,fen,legal,legalOk,inCheck,kingSq,make,iccs,parseSq,notate,chasePairs,hasAttackers,PLAYER,annotate,summary,fullItem,gameItem,LEVELS,stateApply,stateRebuild,judgeState,pickMove,ANALYZE_MS,clampV,classifyRaw};
})();
if(typeof module!=="undefined")module.exports=XQCore;
