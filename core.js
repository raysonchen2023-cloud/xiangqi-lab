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
// 分析提示沿用座標配對；勝負裁判另以實體棋子ID重播，不能採信這個差集。
function chasePairs(b,s){
  return new Set([...attackMap(b,b.map((_,i)=>i),s)]
    .filter(([,a])=>!a.exempt&&!a.uncertain).map(([key])=>key))}
function hasAttackers(b,s){return b.some(p=>p&&sideOf(p)===s&&"RNCP".includes(p.toUpperCase()))}

// ChatGPT 接手改善（2026-11-10）：亞洲棋例的可追溯裁判。
// 本版只自動裁定直接捉子；複合交換、同類牽制等未覆蓋棋例明示待核，不能當和局。
const REP_RULES=Object.freeze({id:"asian-direct-v2",name:"亞洲棋例（直接捉子）",occurrences:3});
function captureLegal(b,f,t){return !!b[f]&&!!b[t]&&sideOf(b[f])!==sideOf(b[t])&&pseudo(b,f).includes(t)&&legalOk(b,f,t)}
function attackMap(b,ids,s){
  const a=new Map();
  for(let f=0;f<90;f++)if(b[f]&&sideOf(b[f])===s)for(const t of pseudo(b,f)){
    if(!b[t]||sideOf(b[t])===s||b[t].toUpperCase()==="K"||!legalOk(b,f,t))continue;
    const p=b[f].toUpperCase(),q=b[t].toUpperCase(),n=make(b,f,t);
    const rooted=n.some((x,j)=>x&&sideOf(x)===opp(s)&&captureLegal(n,j,t));
    const exchange=captureLegal(b,t,f);
    // 不以 VAL 的浮點子值推導棋規。亞洲規則的有根車例外僅限馬／炮。
    const exempt=p==="K"||p==="P"||exchange||(rooted&&!(q==="R"&&(p==="N"||p==="C")));
    const uncertain=!exempt&&p===q&&p!=="N";
    a.set(ids[f]+">"+ids[t],{attacker:ids[f],target:ids[t],from:f,to:t,piece:p,victim:q,rooted,exchange,exempt,uncertain});
  }
  return a}
function repetitionTrace(S,from){
  let b=parseFen(S.start||START),ids=b.map((p,i)=>p?i:null),s=S.startTurn||"r",cycleIds=null,identityStable=true;const trace=[];
  for(let i=0;i<S.moves.length;i++){
    if(i===from)cycleIds=ids.slice();
    const m=S.moves[i],before=i>=from?attackMap(b,ids,s):null;
    b=make(b,m.f,m.t);ids=ids.slice();ids[m.t]=ids[m.f];ids[m.f]=null;
    if(i>=from&&fen(b,opp(s))===S.pos[from]&&ids.some((id,j)=>id!==cycleIds[j]))identityStable=false;
    if(i>=from){const after=attackMap(b,ids,s);trace.push({ply:i+1,by:s,check:inCheck(b,opp(s)),
      attacks:[...after].filter(([key])=>!before.has(key)).map(([,a])=>a),board:b,ids});}
    s=opp(s);
  }
  // 只有對手逃子或直接消解該捉，才列入直接長捉；不能把長獻當長捉。
  return {identityStable,trace:trace.map((e,i)=>{const reply=trace[(i+1)%trace.length];return{ply:e.ply,by:e.by,check:e.check,
    attacks:e.attacks.filter(a=>{const f=reply.ids.indexOf(a.attacker),t=reply.ids.indexOf(a.target);
      return f<0||t<0||!captureLegal(reply.board,f,t)})}})}}
/* 從開局重播到第 to 手，記下第 from 手以後每一步是誰走、有沒有將軍（不信任存檔裡的 ck 標記） */
function checksSpan(S,from,to){let b=parseFen(S.start||START),s=S.startTurn||"r";const out=[];for(let i=0;i<to;i++){const m=S.moves[i];b=make(b,m.f,m.t);if(i>=from)out.push({by:s,check:inCheck(b,opp(s))});s=opp(s)}return out}
function repetitionVerdict(S){
  const n=S.moves.length,key=S.pos&&S.pos[n],idx=[];
  if(!key)return null;
  S.pos.forEach((p,i)=>{if(i<=n&&p===key)idx.push(i)});
  if(idx.length<REP_RULES.occurrences)return null;
  const points=idx.slice(-REP_RULES.occurrences),from=points[0],len=points[1]-from;
  const evidence={rules:REP_RULES.id,occurrences:points,fromPly:from+1,toPly:n};
  // 兩段必須是同一完整循環，不混用早先走過的局面或不同長度的路徑。
  const same=points[2]-points[1]===len&&S.moves.slice(from,points[1]).every((m,i)=>{
    const z=S.moves[points[1]+i];return z&&m.f===z.f&&m.t===z.t});
  /* Claude 11/11（開發者選「先修再上線」）：路線不同但某一方兩輪循環裡每步都將軍＝長將，照判；其他路線不同的循環照舊待核 */
  if(!same){const sp=checksSpan(S,from,n),rc=sp.filter(x=>x.by==="r"),bc=sp.filter(x=>x.by==="b"),rC=rc.length>0&&rc.every(x=>x.check),bC=bc.length>0&&bc.every(x=>x.check);
    if(rC&&bC)return{...evidence,w:null,why:"雙方長將，判和"};
    if(rC)return{...evidence,w:"b",why:"紅方長將判負（循環路線不同，但每步都將軍）"};
    if(bC)return{...evidence,w:"r",why:"黑方長將判負（循環路線不同，但每步都將軍）"};
    return{...evidence,pending:true,why:"重複路徑不同，棋例待核；可變著或提和，不自動判和／判負"}}
  const replay=repetitionTrace(S,from),trace=replay.trace;evidence.trace=trace;
  if(!replay.identityStable)return{...evidence,pending:true,why:"同類棋子交換位置的循環待核；可變著或提和，不自動判和／判負"};
  function side(s){
    const ms=trace.filter(m=>m.by===s),check=ms.length>0&&ms.every(m=>m.check);
    let targets=null,uncertain=false;
    for(const m of ms){
      const a=m.check?[]:m.attacks.filter(a=>!a.exempt);
      uncertain=uncertain||a.some(a=>a.uncertain);
      const ts=new Set(a.filter(a=>!a.uncertain).map(a=>a.target));
      targets=targets===null?ts:new Set([...targets].filter(t=>ts.has(t)));
    }
    // 將帥／兵卒本身參與捉同一子時，不能只刪除它的攻擊再誤判其他子的長捉。
    const pawnOrKing=ms.some(m=>m.attacks.some(a=>(a.piece==="K"||a.piece==="P")&&targets&&targets.has(a.target)));
    return{check,chase:!!(targets&&targets.size)&&!pawnOrKing,targets:targets?[...targets]:[],uncertain};
  }
  const r=side("r"),b=side("b");evidence.red=r;evidence.black=b;
  const result=(w,why)=>({...evidence,w,why});
  if(r.check&&b.check)return result(null,"雙方長將，判和");
  if(r.check)return result("b","紅方長將判負");
  if(b.check)return result("r","黑方長將判負");
  if(r.uncertain||b.uncertain)return{...evidence,pending:true,why:"涉及同類子牽制的特殊棋例待核；可變著或提和，不自動判和／判負"};
  if(r.chase&&b.chase)return{...evidence,pending:true,why:"雙方互捉的責任棋例待核；可變著或提和，不自動判和／判負"};
  if(r.chase)return result("b","紅方長捉同一子判負");
  if(b.chase)return result("r","黑方長捉同一子判負");
  return result(null,"亞洲棋例：循環未構成單方長將或直接長捉，判和")}



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
  /* 意見回饋 594：石桌往事有些關從中局開始（g.start＝起始局面、g.startTurn＝誰先走），也要存進對局、算進我的成長 */
  const b0=()=>{try{return g.start?parseFen(g.start):parseFen(START)}catch(e){return parseFen(START)}};const t0=g.startTurn==="b"?1:0;
  let b=b0();const moves=g.moves.map((m,i)=>{const cn=notate(b,m.f,m.t);b=make(b,m.f,m.t);return{f:m.f,t:m.t,cn,q:m.q,loss:m.loss,ev:m.ev,bc:m.bc,bm:m.bm,bp:m.bp,by:m.by||((i+t0)%2?"b":"r")}});
  const comments={};g.moves.forEach((m,i)=>{if(m.cm)comments["0_"+(i+1)]=PLAYER[m.by]+"："+m.cm});
  return{id:g.id||"current",title:`${g.red} 對 ${g.black}`,red:g.red,black:g.black,year:+String(g.date||g.id||"").slice(0,4)||null,name:(isLive?"【進行中】":"")+(g.date||String(g.id||"").slice(0,10))+"　"+g.red+" 對 "+g.black,
    result:isLive||!g.result?"進行中":(g.result.w?PLAYER[g.result.w]+"勝":"和局")+"（"+g.result.why+"）",
    board:b0(),...(g.start?{start:g.start,startTurn:g.startTurn||"r",mid:1}:{}),...(g.journey?{journey:g.journey}:{}),lines:[{id:0,parent:null,start:1,moves}],comments,lessons:g.lessons||null}}
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
  S.repetition=null;const mover=S.turn,chB=chasePairs(S.board,mover);
  const m={f,t,by:mover};m.cn=notate(S.board,f,t);m.cap=S.board[t];
  S.board=make(S.board,f,t);S.turn=opp(S.turn);S.pos.push(fen(S.board,S.turn));m.ck=inCheck(S.board,S.turn);
  m.ch=[...chasePairs(S.board,mover)].some(x=>!chB.has(x));
  S.moves.push(m);return m}
function stateRebuild(S){const old=S.moves||[];S.moves=[];S.board=parseFen(S.start||START);S.turn=S.startTurn||"r";S.pos=[fen(S.board,S.turn)];
  for(const o of old){const m=stateApply(S,o.f,o.t);for(const k of["q","loss","ev","bv","bc","bm","bp"])if(o[k]!==undefined)m[k]=o[k]}S.repetition=repetitionVerdict(S)}   /* bv：開發者 11/11 影子模式，見 classifyRaw */
function judgeState(S){
  const n=S.moves.length;S.repetition=null;if(!n)return null;
  const mover=S.moves[n-1].by,other=opp(mover);
  if(legal(S.board,other).length===0)return{w:mover,why:inCheck(S.board,other)?"將死":"困斃"};
  // 長將／長捉先於自然限著，不能以未吃子和局覆蓋違例。
  const rep=repetitionVerdict(S);S.repetition=rep;
  if(rep){if(rep.pending)return null;return{w:rep.w,why:rep.why,adjudication:rep}}
  if(!hasAttackers(S.board,"r")&&!hasAttackers(S.board,"b"))return{w:null,why:"雙方均無進攻子力"};
  let since=0;for(let i=n-1;i>=0;i--){if(S.moves[i].cap)break;since++}
  if(since>=120)return{w:null,why:"遊戲自然限著：60 回合未吃子"};
  return null}
function pickMove(r,lv){
  if(!lv.margin||r.lines.length<2)return r.best;
  const top=r.lines[0].v,c=r.lines.filter(x=>x.v>=top-lv.margin);
  return c[Math.floor(Math.random()*c.length)].mv}
// ===== 每步評等 =====
const ANALYZE_MS=400;
const clampV=v=>Math.max(-2000,Math.min(2000,v));const gradeLoss=l=>l<30?"正著":l<=60?"穩著":l<=150?"緩著":l<=400?"失著":"敗著";   /* 開發者 11/6（第二裁判：同一個 Pikafish 深算 2258 步對照）：手機只算 0.4 秒，分數本身就會跳 20～30 分，舊的 10／40／100／300 分界線比雜訊還細；放寬成 30／60／150／400，跟深算的一致率 83%→90% */const qName=q=>({"妙手":"妙著","正手":"正著","優著":"穩著","良著":"緩著","錯著":"失著","露著":"敗著"})[q]||q;   /* 開發者 11/6（意見回饋 659）：評語改用傳統棋評用語；舊存檔、舊快取裡的舊名字讀取時翻成新的 */
async function classifyRaw(b,s,f,t,ms,lt){   /* lt：對方上一步落在哪一格（判斷「回吃」，可省略） */
  const r=await evalPos(b,s,ms,2);if(r.dead||!r.lines.length)return null;
  const best=r.lines[0],second=r.lines[1],mv=iccs(f,t);
  let played;
  if(best.mv===mv)played=best.v;
  else{const after=make(b,f,t),r2=await evalPos(after,opp(s),ms,1);played=r2.dead?30000:(r2.lines[0]?-r2.lines[0].v:best.v)}
  const loss=Math.max(0,clampV(best.v)-clampV(played)),gap=second?clampV(best.v)-clampV(second.v):0;
  let q;
  if(best.mv===mv)q=gap>=200&&Math.abs(best.v)<1500&&!inCheck(b,s)&&!(b[t]&&lt===t)?"妙著":"正著";   /* 妙著：唯一好棋差距 200 分以上，而且不是應將、不是被迫回吃 */
  else q=gradeLoss(loss);
  const bf=parseSq(best.mv.slice(0,2)),bt=parseSq(best.mv.slice(2,4));
  /* 開發者 11/11 照三方審查（影子模式）：多回傳 bv＝最佳著法評估的原值（紅方視角、沒夾 ±2000），q、loss 完全照舊。
     loss 是兩邊都夾到 ±2000 才相減，最佳著法若是殺棋（±29990 左右）原值會不見——新算法判「漏殺」、匿名對局資料校正殺棋分界要用原值 */
  return{q,loss,gap,ev:s==="r"?played:-played,bv:s==="r"?best.v:-best.v,bc:notate(b,bf,bt),bm:best.mv,bp:(best.pv||[]).slice(0,3)}}   // bp：Pikafish 建議的前 3 步（賽後在棋盤上畫箭頭）
return{START,NAMES,CN,VAL,sideOf,opp,parseFen,fen,legal,legalOk,inCheck,kingSq,make,iccs,parseSq,notate,chasePairs,hasAttackers,REP_RULES,repetitionVerdict,PLAYER,annotate,summary,fullItem,gameItem,LEVELS,stateApply,stateRebuild,judgeState,pickMove,ANALYZE_MS,clampV,gradeLoss,qName,classifyRaw};
})();
if(typeof module!=="undefined")module.exports=XQCore;
