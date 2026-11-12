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
/* 臺灣棋規正式版（開發者 11/12 評比第 9 輪「F4 可以做嗎」→ 做；選「雙方都選才計分」「100 著自動判和」）
   依《中華民國象棋規則》113 年修訂版（中華民國象棋文化協會 https://www.cccs.org.tw/Page?itemid=18&mid=35 附的 PDF）：
   ・第二章第一節術語「長將／長捉」：循環歸原狀態達三次循環 → 同一局面第 4 次出現才判（千秋休閒規則是第 3 次）
   ・術語「捉」說明一～六：將帥、兵卒攻擊＝閒；不能離線的子攻擊＝閒；同兵種互相攻擊＝閒，被攻擊子不能離線＝捉；
     有真根＝閒、無根＝捉；傌炮仕相攻擊俥不論有根無根都是捉；可互換吃去＝兌（閒）
   ・第二節 C 表 2.2-1：雙方同為長將／長捉／未犯例都判和；一方長將另一方不是＝長將方負；一方長捉另一方未犯例＝長捉方負
   ・棋例總綱 7：長捉同類子未犯例，但該子受牽制不能離線時仍作長捉論；活傌長捉拐腳馬亦犯例
   ・第三章第四節限著：雙方共走 100 著未吃子判和（條文「經裁判審查」，App 沒有裁判，自動判和並寫明） */
const TW_RULES=Object.freeze({id:"tw113-v1",name:"中華民國象棋規則 113 年修訂版",occurrences:4});
function twPinned(b,i){const p=b[i];if(!p)return false;const s=sideOf(p),n=b.slice();n[i]=null;return inCheck(n,s)||facing(n)}   /* 術語「不能離線／位」：這子一離開就會被將或王見王 */
function twCatch(b,f,t){const p=b[f].toUpperCase(),q=b[t].toUpperCase(),s=sideOf(b[f]);
  if(p==="K"||p==="P")return{c:false,why:"將帥兵卒攻擊為閒"};
  if(twPinned(b,f))return{c:false,why:"攻擊子不能離線為閒"};
  if(p===q){if(twPinned(b,t))return{c:true,same:true,why:"同兵種、被攻擊子不能離線為捉"};if(captureLegal(b,t,f))return{c:false,why:"同兵種可以互相攻擊為閒"}}
  if(q==="R"&&"NCAB".includes(p))return{c:true,why:"傌炮仕相攻擊俥不論有根無根皆為捉"};
  if(captureLegal(b,t,f))return{c:false,why:"可互換吃去為兌"};
  const n=make(b,f,t),rooted=n.some((x,j)=>x&&sideOf(x)!==s&&captureLegal(n,j,t));
  return rooted?{c:false,why:"被攻擊子有真根為閒"}:{c:true,same:p===q,why:"被攻擊子無根為捉"}}
function twTrace(S,from){
  let b=parseFen(S.start||START),ids=b.map((p,i)=>p?i:null),s=S.startTurn||"r",cycleIds=null,stable=true;const tr=[];
  for(let i=0;i<S.moves.length;i++){if(i===from)cycleIds=ids.slice();const m=S.moves[i],before=i>=from?attackMap(b,ids,s):null;
    b=make(b,m.f,m.t);ids=ids.slice();ids[m.t]=ids[m.f];ids[m.f]=null;
    if(i>=from&&fen(b,opp(s))===S.pos[from]&&ids.some((id,j)=>id!==cycleIds[j]))stable=false;
    if(i>=from){const after=attackMap(b,ids,s);tr.push({ply:i+1,by:s,check:inCheck(b,opp(s)),board:b,ids,attacks:[...after].filter(([k])=>!before.has(k)).map(([,a])=>a)})}
    s=opp(s)}
  /* 對手這一手化解了（逃子、擋住、吃掉）才算步步捉；跟千秋休閒規則同一個做法 */
  return{stable,trace:tr.map((e,i)=>{const reply=tr[(i+1)%tr.length];return{...e,attacks:e.attacks.filter(a=>{const f=reply.ids.indexOf(a.attacker),t=reply.ids.indexOf(a.target);return f<0||t<0||!captureLegal(reply.board,f,t)})}})}}
function twRepetitionVerdict(S){
  const n=S.moves.length,key=S.pos&&S.pos[n],idx=[];if(!key)return null;
  S.pos.forEach((p,i)=>{if(i<=n&&p===key)idx.push(i)});
  if(idx.length<TW_RULES.occurrences)return null;
  const points=idx.slice(-TW_RULES.occurrences),from=points[0],len=points[1]-from;
  const evidence={rules:TW_RULES.id,ruleset:"tw113",occurrences:points,fromPly:from+1,toPly:n};
  const same=points.every((p,k)=>k===0||p-points[k-1]===len)&&[1,2].every(c=>S.moves.slice(from,points[1]).every((m,i)=>{const z=S.moves[points[c]+i];return z&&m.f===z.f&&m.t===z.t}));
  if(!same){const sp=checksSpan(S,from,n),rc=sp.filter(x=>x.by==="r"),bc=sp.filter(x=>x.by==="b"),rC=rc.length>0&&rc.every(x=>x.check),bC=bc.length>0&&bc.every(x=>x.check);
    if(rC&&bC)return{...evidence,w:null,why:"臺灣棋規：雙方長將，經三次循環仍不變著，判和（表 2.2-1）"};
    if(rC)return{...evidence,w:"b",why:"臺灣棋規：紅方長將，經三次循環仍不變著，判負（棋例總綱 1）"};
    if(bC)return{...evidence,w:"r",why:"臺灣棋規：黑方長將，經三次循環仍不變著，判負（棋例總綱 1）"};
    return{...evidence,pending:true,policy:"prompt_agree",why:"臺灣棋規：循環路線不同，App 無法比對是否「步步」將或捉；請變著，或雙方協議和棋"}}
  const R=twTrace(S,from);
  if(!R.stable)return{...evidence,pending:true,policy:"prompt_agree",why:"臺灣棋規：同類棋子交換位置的循環，App 無法比對；請變著，或雙方協議和棋"};
  const side=s=>{const ms=R.trace.filter(m=>m.by===s),check=ms.length>0&&ms.every(m=>m.check);let targets=null,samePin=false;
    for(const m of ms){const ts=new Set();for(const a of m.check?[]:m.attacks){const k=twCatch(m.board,a.from,a.to);if(k.c){ts.add(a.target);if(k.same)samePin=true}}
      targets=targets===null?ts:new Set([...targets].filter(t=>ts.has(t)))}
    /* 棋例總綱 9：將帥或兵卒聯合他子長捉同一子未犯例 */
    const pk=ms.some(m=>m.attacks.some(a=>(a.piece==="K"||a.piece==="P")&&targets&&targets.has(a.target)));
    const chase=!!(targets&&targets.size)&&!pk;return{check,chase,samePin:chase&&samePin,targets:targets?[...targets]:[]}};
  const r=side("r"),b=side("b"),lv=x=>x.check?2:x.chase?1:0,L=["未犯例","長捉","長將"];
  evidence.red={check:r.check,chase:r.chase,targets:r.targets};evidence.black={check:b.check,chase:b.chase,targets:b.targets};
  const res=(w,why)=>({...evidence,w,why}),R0=lv(r),B0=lv(b),art=x=>x.check?"棋例總綱 1":x.samePin?"棋例總綱 7（同類子受牽制不能離線，仍作長捉論）":"棋例總綱 3";
  if(R0===B0)return res(null,"臺灣棋規：雙方"+L[R0]+"，經三次循環仍不變著，判和（表 2.2-1）");
  if(R0>B0)return res("b","臺灣棋規：紅方"+L[R0]+"，經三次循環仍不變著，判負（"+art(r)+"）");
  return res("r","臺灣棋規：黑方"+L[B0]+"，經三次循環仍不變著，判負（"+art(b)+"）")}

/* 棋規註冊表與棋規設定（開發者 11/11 評比循環 F3「多棋規與臺灣棋規可切換原型」；Gemini 架構報告第一項，查證後實作，見 story/100_Gemini架構報告處理.md）
   真正實作、可以計積分的只有 qiqiu_casual（上面 REP_RULES 的亞洲棋例直接捉子子集＋App 自訂限著）。
   tw_proto 只是原型：資料結構和切換先有；判法只改「規程查得到依據」的那一條——新竹市 114 年市長盃規程寫長將／長捉要「經裁判裁決仍不變著」才判負，
   App 沒有現場裁判，所以循環到第 3 次改成提示、交雙方協議（待核），不自動判；查不到條文的照實標「未查證」，暫時沿用千秋休閒規則，不編條文。
   每盤棋開局時寫一份 rc（ruleConfig），之後改設定也不影響這盤；舊存檔沒有 rc 就補預設 qiqiu_casual。 */
const RULESET_DEFAULT="qiqiu_casual";
const RULESETS=Object.freeze({
  qiqiu_casual:Object.freeze({id:"qiqiu_casual",name:"千秋休閒規則",short:"千秋休閒",edition:"2026-11",status:"implemented",rated:true,unresolvedPolicy:"pending_review",
    basis:"亞洲棋例（直接捉子）的子集，循環裁判版本 "+REP_RULES.id+"；60 回合限著是 App 自訂",
    covers:["將死","困斃","長將判負","直接長捉同一子判負","一將一捉判和","閒著循環判和","60 回合未吃子判和","雙方無進攻子力判和","超時判負"],
    pending:["路線不同的循環（不是每步將軍）","同類棋子換位","雙方互捉","同類子牽制"],diffs:[]}),
  tw_proto:Object.freeze({id:"tw_proto",hidden:true,name:"臺灣比賽規程（原型）",short:"臺灣規程・原型",edition:"依比賽規程引用的《中華民國象棋規則》96 年修訂版；條文原文未取得",status:"prototype",rated:false,unresolvedPolicy:"prompt_agree",
    basis:"新竹市 114 年市長盃競賽規程（引用《中華民國象棋規則》96 年修訂版）；條文原文未取得",
    covers:["將死","困斃","雙方無進攻子力判和（沿用，未查證）","60 回合未吃子判和（沿用，未查證）","超時判負（沿用）"],pending:["所有循環：提示後交雙方協議"],
    diffs:[{rule:"長將",tw:"單方長將循環三回合後，經裁判裁決長將方仍不變著判負（規程原文）",app:"第 3 次重複改成提示、交雙方協議，不自動判負",verified:true},
      {rule:"長捉",tw:"長捉無根子循環三回合後，經裁判裁決仍不變著判負（規程原文）",app:"同上",verified:true},
      {rule:"一將一捉、互捉、閒著循環",tw:"未查證",app:"提示、交雙方協議，不自動判和",verified:false},
      {rule:"60 回合限著",tw:"未查證",app:"暫時沿用千秋休閒規則",verified:false},
      {rule:"超時、子力不足",tw:"未查證",app:"暫時沿用千秋休閒規則（時間用完一律判負）",verified:false}]}),
  /* 11/12 正式版：照 113 年修訂版條文自動判；可以計分（線上要雙方都選這一套才計分，net.js netRc；晉級賽可選，local.js） */
  tw113:Object.freeze({id:"tw113",name:"臺灣棋規（中華民國象棋規則 113 年修訂版）",short:"臺灣棋規",edition:"113 年修訂版",status:"implemented",rated:true,unresolvedPolicy:"prompt_agree",
    basis:"《中華民國象棋規則》113 年修訂版（中華民國象棋文化協會），循環裁判版本 "+TW_RULES.id+"；條文 https://www.cccs.org.tw/Page?itemid=18&mid=35",
    covers:["將死","困斃","長將判負（三次循環）","長捉判負（三次循環，術語「捉」說明一～六）","雙方長將／長捉／未犯例判和（表 2.2-1）","同類子受牽制仍作長捉（棋例總綱 7）","100 著未吃子判和（App 代替裁判審查）","雙方無進攻子力判和（App 自訂）","超時判負"],
    pending:["循環路線不同（不是每步將軍）","同類棋子交換位置"],
    diffs:[{rule:"循環判決時機",tw:"三次循環後裁判介入",app:"同一局面第 4 次出現自動判（沒有現場裁判）",verified:true},
      {rule:"自然限著",tw:"雙方共走 100 著未吃子，經裁判員認同後判和",app:"第 100 著自動判和",verified:true},
      {rule:"犯規、違例次數（犯規兩次或違例四次判負）",tw:"現場裁判記錄",app:"App 不讓下出違規著法，不記次數",verified:true}]})});
const RC_MODES=["casual","ranked","puzzle"];
function ruleConfig(id,mode){const R=RULESETS[id]||RULESETS[RULESET_DEFAULT],m=RC_MODES.includes(mode)?mode:"casual";
  return Object.freeze({rulesetId:R.id,edition:R.edition,implementationVersion:REP_RULES.id,mode:m==="ranked"&&!R.rated?"casual":m,unresolvedPolicy:R.unresolvedPolicy})}
/* 讀回的棋規設定一律重新整理：不認得的棋規→預設；原型棋規不能是 ranked（防手改存檔）；implementationVersion 照存檔留著當紀錄（指紋） */
function ruleConfigOf(S){const o=S&&S.rc,R=o&&RULESETS[o.rulesetId];
  if(!R)return ruleConfig(RULESET_DEFAULT,S&&S.ranked?"ranked":S&&S.practice?"puzzle":"casual");
  const m=RC_MODES.includes(o.mode)?o.mode:"casual";
  return Object.freeze({rulesetId:R.id,edition:R.edition,implementationVersion:typeof o.implementationVersion==="string"?o.implementationVersion.slice(0,40):REP_RULES.id,mode:m==="ranked"&&!R.rated?"casual":m,unresolvedPolicy:R.unresolvedPolicy})}
function ruleRated(rc){const R=rc&&RULESETS[rc.rulesetId];return !!R&&R.rated}
/* 依這盤的棋規調整循環裁決。qiqiu_casual（或沒有 rc）原樣；tw_proto 把判負／判和改成待核提示，原本的判決留在 base 供追溯 */
function rulesetVerdict(rep,S){
  if(!rep||rep.pending)return rep;const rc=S&&S.rc;if(!rc||rc.rulesetId!=="tw_proto")return rep;
  const loss=rep.w!=null,who=String(rep.why||"").replace(/判負.*$/,"");
  const{w,...rest}=rep;return{...rest,pending:true,policy:"prompt_agree",ruleset:"tw_proto",base:{w,why:rep.why},
    why:loss?"臺灣規程（原型）："+who+"，規程寫「經裁判裁決仍不變著」才判負；App 沒有現場裁判，先提醒：請變著，或雙方協議和棋":"臺灣規程（原型）：這種循環怎麼判，條文未查證；請變著，或雙方協議和棋"}}
/* 循環預警（預警與判決分離）：輪到 me、眼前局面第二次出現時，模擬「照上一輪再走一圈」，每一步都交給 judgeState 判；
   回傳警告事件 {type,kind:"loss"|"review",side,why,ply,verdict}，或 null（判和、不判、輪不到、這關不判長將長捉）。畫面只照事件顯示，不自己推輸贏 */
function repetitionWarning(st,me){
  if(!st||st.result||!me||st.turn!==me||!st.moves||st.moves.length<4)return null;
  const base={start:st.start||null,startTurn:st.startTurn||"r",moves:st.moves.map(m=>({f:m.f,t:m.t}))};if(st.rc)base.rc=st.rc;
  const S={...base,moves:base.moves.slice()};stateRebuild(S);
  const n=S.moves.length,key=S.pos[n],idx=[];S.pos.forEach((p,i)=>{if(p===key)idx.push(i)});
  const need=st.rc&&st.rc.rulesetId==="tw113"?TW_RULES.occurrences-1:2;if(idx.length!==need)return null;   /* 臺灣棋規正式版第 4 次出現才判，所以第 3 次出現時預警 */
  const cyc=base.moves.slice(idx[need-2],idx[need-1]);let v=null;
  for(let k=1;k<=cyc.length&&!v;k++){const T={...base,moves:base.moves.concat(cyc.slice(0,k))};stateRebuild(T);const j=judgeState(T);if(j)v=j;else if(T.repetition&&T.repetition.pending)v=T.repetition}
  if(!v||(!v.pending&&v.w!==opp(me)))return null;
  if(st.noPerp&&!v.pending&&/長將|長捉|長打/.test(v.why||""))return null;
  return{type:"repetition-warning",kind:v.pending?"review":"loss",side:me,why:v.why||"",ply:n,verdict:v}}


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
  /* ChatGPT 數值盤查 11/11 P1：棋步多帶 bmt、pmt（殺棋訊號，見 classifyRaw），賽後講解才分得出「真的有殺」還是「只是大優」；這個檔裡其他存檔、moveOut 也一起帶 */
  const b0=()=>{try{return g.start?parseFen(g.start):parseFen(START)}catch(e){return parseFen(START)}};const t0=g.startTurn==="b"?1:0;
  let b=b0();const moves=g.moves.map((m,i)=>{const cn=notate(b,m.f,m.t);b=make(b,m.f,m.t);return{f:m.f,t:m.t,cn,q:m.q,loss:m.loss,ev:m.ev,bmt:m.bmt,pmt:m.pmt,rr:m.rr,bc:m.bc,bm:m.bm,bp:m.bp,by:m.by||((i+t0)%2?"b":"r")}});
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
  for(const o of old){const m=stateApply(S,o.f,o.t);for(const k of["q","loss","ev","bv","bmt","pmt","rr","bc","bm","bp"])if(o[k]!==undefined)m[k]=o[k]}S.repetition=rulesetVerdict(repetitionVerdict(S),S)}   /* bv：開發者 11/11 影子模式，見 classifyRaw；bmt、pmt：ChatGPT 數值盤查 11/11 殺棋訊號（走方視角），見 classifyRaw */
function judgeState(S){
  const n=S.moves.length;S.repetition=null;if(!n)return null;
  const mover=S.moves[n-1].by,other=opp(mover);
  if(legal(S.board,other).length===0)return{w:mover,why:inCheck(S.board,other)?"將死":"困斃"};
  // 長將／長捉先於自然限著，不能以未吃子和局覆蓋違例。
  const tw=S.rc&&S.rc.rulesetId==="tw113",rep=tw?twRepetitionVerdict(S):rulesetVerdict(repetitionVerdict(S),S);S.repetition=rep;   /* 臺灣棋規正式版另一套循環裁判（第 4 次出現才判） */   /* rulesetVerdict：依這盤的棋規（S.rc）調整；沒有 rc＝千秋休閒規則，原樣 */
  if(rep){if(rep.pending)return null;return{w:rep.w,why:rep.why,adjudication:rep}}
  if(!hasAttackers(S.board,"r")&&!hasAttackers(S.board,"b"))return{w:null,why:"雙方均無進攻子力"};
  let since=0;for(let i=n-1;i>=0;i--){if(S.moves[i].cap)break;since++}
  if(tw&&since>=100)return{w:null,why:"臺灣棋規：自然限著，雙方共走 100 著未吃子，判和（第三章第四節；App 代替裁判審查）"};
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
  let r=await evalPos(b,s,ms,2);if(r.dead)return null;
  /* ChatGPT 數值盤查 11/11 P1 引擎空結果（第一查）：走之前的局面不是終局、卻一條 PV 都沒有時，舊版回 null，analyzeList 就把這步寫成「—」、之後永遠不再評。
     比照第二查：先用兩倍時間重查一次，還是空就丟可重試的錯誤（e.retry），這步保持「未評」（tools/test-clock-pv.js 驗收） */
  if(!(r.lines&&r.lines.length))r=await evalPos(b,s,(ms||ANALYZE_MS)*2,2);
  if(r.dead)return null;
  if(!(r.lines&&r.lines.length)){const e=new Error("Pikafish 沒有算出這個局面（缺 PV），這步先不評，稍後自動再評");e.retry=true;e.code="XQ_NO_PV";throw e}
  const best=r.lines[0],second=r.lines[1],mv=iccs(f,t);
  /* ChatGPT 評審 11/11（失著的具體後果）：第二查（走完這步的局面）引擎給對方的最佳回應 l，用規則算出它吃不吃子、將不將軍，存成 rr，賽後才說得出「這手讓對方下一手可以吃你的車」。
     rr＝{m 對方最佳回應 ICCS, c 中文記譜, x 吃到走方的哪顆子（棋盤字元，沒吃子＝null）, k 這手是不是將軍走方, mt 對方幾步內將死走方（沒有＝null）}；
     走的就是最佳著、走完就終局、或引擎給的著法在規則上不合法＝null（不猜）；舊存檔、舊快取沒有 rr（undefined） */
  const reply=(a,os,l)=>{try{const u=l&&l.mv;if(!/^[a-i]\d[a-i]\d$/.test(u||""))return null;const rf=parseSq(u.slice(0,2)),rt=parseSq(u.slice(2,4));
    if(!legal(a,os).some(([x,y])=>x===rf&&y===rt))return null;const x=a[rt]&&sideOf(a[rt])===s?a[rt]:null;
    return{m:u,c:notate(a,rf,rt),x,k:inCheck(make(a,rf,rt),s),mt:l.mate!=null&&l.mate>0?l.mate:null}}catch(e){return null}};
  let played,pmt,rr=null;
  if(best.mv===mv){played=best.v;pmt=best.mate}
  else{const after=make(b,f,t);let r2=await evalPos(after,opp(s),ms,1);
    /* ChatGPT 數值盤查 11/11 P1 引擎空結果：第二次查詢（走完這步的局面）不是終局、卻沒有任何 PV（lines 空）時，舊版拿最佳著的分數頂替，
       變成「正著、loss＝0、ev＝最佳分」。改成：先用兩倍時間重查一次；還是沒有 PV 就丟出可重試的錯誤（e.retry），這步保持「未評」，下次分析再補。
       真正沒有合法著的終局（r2.dead）照原本分支：走這步的一方把對方將死或困斃＝30000 */
    if(!r2.dead&&!(r2.lines&&r2.lines.length))r2=await evalPos(after,opp(s),(ms||ANALYZE_MS)*2,1);
    if(r2.dead){played=30000;pmt=1}
    else if(r2.lines&&r2.lines.length){played=-r2.lines[0].v;const m2=r2.lines[0].mate;pmt=m2==null?null:m2<0?1-m2:-m2;rr=reply(after,opp(s),r2.lines[0])}
    else{const e=new Error("Pikafish 沒有算出這步走完的局面（缺 PV），這步先不評，稍後自動再評");e.retry=true;e.code="XQ_NO_PV";throw e}}
  const loss=Math.max(0,clampV(best.v)-clampV(played)),gap=second?clampV(best.v)-clampV(second.v):0;
  let q;
  if(best.mv===mv)q=gap>=200&&Math.abs(best.v)<1500&&!inCheck(b,s)&&!(b[t]&&lt===t)?"妙著":"正著";   /* 妙著：唯一好棋差距 200 分以上，而且不是應將、不是被迫回吃 */
  else q=gradeLoss(loss);
  const bf=parseSq(best.mv.slice(0,2)),bt=parseSq(best.mv.slice(2,4));
  /* 開發者 11/11 照三方審查（影子模式）：多回傳 bv＝最佳著法評估的原值（紅方視角、沒夾 ±2000），q、loss 完全照舊。
     loss 是兩邊都夾到 ±2000 才相減，最佳著法若是殺棋（±29990 左右）原值會不見——新算法判「漏殺」、匿名對局資料校正殺棋分界要用原值 */
  /* ChatGPT 數值盤查 11/11 P1 優勢被報為殺棋：保留引擎的殺棋訊號，一律「走這步的一方」視角（跟 ev、bv 的紅方視角不同）：
     bmt＝最佳著法的殺棋步數（正＝走方 N 步殺對方、負＝走方被殺、null＝沒有殺棋）；pmt＝實際這步走完的殺棋步數（同樣正負；這步直接將死或困斃對方＝1）。
     新版一定有這兩個欄位（沒有殺棋就是 null），舊存檔、舊快取沒有（undefined）；q、loss、ev、bv 完全照舊 */
  return{q,loss,gap,ev:s==="r"?played:-played,bv:s==="r"?best.v:-best.v,bmt:best.mate==null?null:best.mate,pmt:pmt==null?null:pmt,rr,bc:notate(b,bf,bt),bm:best.mv,bp:(best.pv||[]).slice(0,3)}}   // bp：Pikafish 建議的前 3 步（賽後在棋盤上畫箭頭）
return{START,NAMES,CN,VAL,sideOf,opp,parseFen,fen,legal,legalOk,inCheck,kingSq,make,iccs,parseSq,notate,chasePairs,hasAttackers,REP_RULES,repetitionVerdict,TW_RULES,twRepetitionVerdict,RULESET_DEFAULT,RULESETS,ruleConfig,ruleConfigOf,ruleRated,rulesetVerdict,repetitionWarning,PLAYER,annotate,summary,fullItem,gameItem,LEVELS,stateApply,stateRebuild,judgeState,pickMove,ANALYZE_MS,clampV,gradeLoss,qName,classifyRaw};
})();
if(typeof module!=="undefined")module.exports=XQCore;
