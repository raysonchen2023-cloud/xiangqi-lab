/* ================= 🏯 W166 門派陣法連線（規格 source/specs/W166-W176_門派陣法連線與實戰絕學_規格.md）=================
   這一支先放純函式（BEGIN osc-form）：十派陣型表 OSC_FORM、判定 formFind、炮的來處 formOrigins、狀態機 formStep。不碰畫面、音效、存檔；
   test-osc-formation-1128.js 用 vm 切出來跑。畫線（2D／3D）、古琴、報讀在之後的期別接上（規格第 10 節）。
   座標：棋盤是 core.js 的 90 格陣列（第 0 列＝黑方底線、大寫＝紅子）；表上寫紅方視角的「直線 a～i＋橫線 0～9（紅方底線＝0）」，
   執黑時上下翻轉（橫線 r→9−r）；每個陣型的左右兩翼都認（直線 a↔i、b↔h、c↔g、d↔f）。前綴 form */
/* BEGIN osc-form */
const FORM_MAX_PLY=30;   /* 規格選擇 2：全盤第 30 手以後不再判定 */
/* 一個陣型＝need（一定要在位的子：[子, 格]）、any（這幾組裡至少一組在位，可以有好幾組）、links（連線：兩個格）、when（要看炮的來處時的額外條件） */
const OSC_FORM={
  central:{nm:["中炮鎮中","Central Cannon"],v:[
    {need:[["C","e2"],["P","e3"]],any:[[["N","c2"]],[["N","g2"]]],links:[["e2","e3"],["e2","c2"],["e2","g2"]]}]},
  screen:{nm:["屏風雙馬","Screen Horses"],v:[
    {need:[["N","c2"],["N","g2"],["P","c3"],["P","g3"]],links:[["c2","g2"],["c2","c3"],["g2","g3"]]}]},
  palace_horse:{nm:["反宮馬","Palace Horses"],v:[
    {need:[["N","c2"],["N","g2"],["C","d2"]],links:[["c2","d2"],["d2","g2"]]}]},
  same_cannon:{nm:["順炮","Same-direction Cannons"],v:[
    {need:[["C","e2"]],any:[[["N","c2"]],[["N","g2"]]],links:[["e2","c2"],["e2","g2"]],when:"same"}]},
  opposite_cannon:{nm:["列炮","Opposite Cannons"],v:[
    {need:[["C","e2"]],any:[[["N","c2"]],[["N","g2"]]],links:[["e2","c2"],["e2","g2"]],when:"opp"}]},
  pawn:{nm:["仙人指路","Pawn Opening"],v:[
    {need:[["P","c4"],["N","c2"]],links:[["c4","c2"]]}]},
  elephant:{nm:["飛相局","Elephant Opening"],v:[
    {need:[["B","e2"]],any:[[["A","d0"]],[["A","f0"]]],links:[["e2","d0"],["e2","f0"],["e2","c2"],["e2","g2"]],any2:[[["N","c2"]],[["N","g2"]]]}]},
  horse:{nm:["起馬局","Horse Opening"],v:[
    {need:[["N","c2"],["P","c3"]],links:[["c2","c3"],["c2","a1"],["c2","a2"],["c2","b0"]],rookOut:"a0"}]},
  cross_palace:{nm:["過宮炮","Cross-palace Cannon"],v:[
    {need:[["C","d2"],["N","g2"]],links:[["d2","g2"]],from:"h2"}]},
  advisor_corner:{nm:["仕角炮","Advisor-corner Cannon"],v:[
    {need:[["C","d2"],["N","c2"]],links:[["d2","c2"]],from:"b2"}]}};
const FORM_F="abcdefghi";
/* 紅方視角的格名 → 90 格的索引；side＝"r"／"b"（黑方上下翻轉）、mir＝左右翻轉 */
function formIdx(sq,side,mir){let c=FORM_F.indexOf(sq[0]),n=+sq.slice(1);if(mir)c=8-c;if(side==="b")n=9-n;return(9-n)*9+c}
const formPc=(p,side)=>side==="r"?p:p.toLowerCase();
const formAt=(b,sq,side,mir,p)=>b[formIdx(sq,side,mir)]===formPc(p,side);
/* 從開局重播著法（uci 字串，例如 "h2e2"），記每一顆子現在這一格是從哪一格出發的：回傳 {索引: 起始索引}。走法不合規不檢查（呼叫端給的都是實際走過的） */
function formOrigins(moves){const o={};for(let i=0;i<90;i++)o[i]=i;const at=u=>(9-(+u[1]))*9+FORM_F.indexOf(u[0]);
  for(const u of moves||[]){if(typeof u!=="string"||u.length<4)continue;const f=at(u.slice(0,2)),t=at(u.slice(2,4));if(f<0||t<0||f>89||t>89)continue;o[t]=o[f];delete o[f]}return o}
/* 判定：board＝90 格、side＝我方、sid＝門派、moves＝從開局走過的著法（順炮／列炮、過宮炮／仕角炮要看炮從哪來）。
   回傳 {sid, nm, pieces:[索引…], links:[[索引,索引]…]}，沒擺成回 null */
function formFind(board,side,sid,moves){const F=OSC_FORM[sid];if(!F||!Array.isArray(board)||board.length!==90||(side!=="r"&&side!=="b"))return null;
  let org=null;const origin=i=>{if(!org)org=formOrigins(moves);return org[i]};
  for(const V of F.v)for(const mir of[false,true]){
    if(!V.need.every(([p,sq])=>formAt(board,sq,side,mir,p)))continue;
    const anyOk=G=>!G||G.some(g=>g.every(([p,sq])=>formAt(board,sq,side,mir,p)));if(!anyOk(V.any)||!anyOk(V.any2))continue;
    if(V.rookOut&&formAt(board,V.rookOut,side,mir,"R"))continue;   /* 起馬局：同側的車要已經動過 */
    if(V.from){const ci=formIdx(V.need[0][1],side,mir);if(origin(ci)!==formIdx(V.from,side,mir))continue}   /* 過宮炮從另一側、仕角炮從同一側過來 */
    if(V.when){const me=formIdx("e2",side,false),op=formIdx("e2",side==="r"?"b":"r",false);if(board[op]!==formPc("C",side==="r"?"b":"r"))continue;
      const om=origin(me),oo=origin(op);if(om==null||oo==null)continue;
      /* 兩門中炮各從棋盤的哪一側（直線 a～d 或 f～i）過來：同一側＝順炮（例如炮二平五對炮8平5，都從 h 線）、不同側＝列炮（炮二平五對炮2平5） */
      const lr=i=>i%9<4?"a":"i";const same=lr(om)===lr(oo);
      if((V.when==="same")!==same)continue}
    const pieces=[],has=new Set();for(const[p,sq]of V.need.concat(...(V.any||[]),...(V.any2||[])))if(formAt(board,sq,side,mir,p)){const i=formIdx(sq,side,mir);if(!has.has(i)){has.add(i);pieces.push(i)}}
    const links=[];for(const[a,b]of V.links){const i=formIdx(a,side,mir),j=formIdx(b,side,mir);if(has.has(i)&&(has.has(j)||board[j]===formPc("R",side)&&V.rookOut))links.push([i,j])}
    return{sid,nm:F.nm,pieces,links}}
  return null}
/* 狀態機：prev＝上一手的結果（formFind 或 null）、cur＝這一手的、byOpp＝這一手是對方走的、seen＝這一盤響過的陣型（Set）、ply＝全盤第幾手。
   回傳 {ev:"form"|"break"|"fade"|"", sound:true/false}：擺成（同一盤同一個陣型只響第一次）、被對方打散（啪）、自己走開（淡出、不響） */
function formStep(prev,cur,byOpp,seen,ply){if(ply>FORM_MAX_PLY)return{ev:prev?"fade":"",sound:false};
  if(!prev&&cur){const k=cur.sid+"|"+cur.nm[0],first=!seen.has(k);seen.add(k);return{ev:"form",sound:first}}
  if(prev&&!cur)return byOpp?{ev:"break",sound:true}:{ev:"fade",sound:false};
  return{ev:"",sound:false}}
/* END osc-form */
