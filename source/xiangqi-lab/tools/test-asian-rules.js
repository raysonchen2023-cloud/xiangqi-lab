// ChatGPT 接手改善：使用實際合法棋步回歸，不以手填 ck/ch 布林值當裁判真相。
"use strict";
const assert=require("node:assert/strict"),test=require("node:test");
const C=require("../site/core.js");
const sq=C.parseSq;
function start(pieces,side="r"){
  const b=Array(90).fill(null);for(const [q,p]of Object.entries(pieces))b[sq(q)]=p;
  const S={start:C.fen(b,side).split(" ")[0],startTurn:side,moves:[]};C.stateRebuild(S);return S;
}
function move(S,u){const f=sq(u.slice(0,2)),t=sq(u.slice(2));
  assert.ok(C.legal(S.board,S.turn).some(([a,b])=>a===f&&b===t),"fixture must be legal: "+u);
  C.stateApply(S,f,t);return S;
}
function repeat(S,cycle,times=2){for(let n=0;n<times;n++)for(const u of cycle)move(S,u);return S;}
const idle=()=>start({d0:"K",f9:"k",a1:"R",i8:"r"});
const idleCycle=["a1a2","i8i7","a2a1","i7i8"];
const check=()=>start({d0:"K",f9:"k",e7:"R"});
const checkCycle=["e7f7","f9e9","f7e7","e9f9"];
const chase=()=>start({d0:"K",f9:"k",c3:"R",b7:"n"});
const chaseCycle=["c3b3","b7c5","b3c3","c5b7"];
test("empty history does not throw",()=>assert.equal(C.judgeState(idle()),null));
test("initial position has 44 legal moves",()=>assert.equal(C.legal(C.parseFen(C.START),"r").length,44));
test("one completed cycle is not enough",()=>assert.equal(C.judgeState(repeat(check(),checkCycle,1)),null));
test("red perpetual check loses with auditable cycle",()=>{
  const S=repeat(check(),checkCycle),r=C.judgeState(S);assert.equal(r.w,"b");assert.match(r.why,/紅方長將/);
  assert.deepEqual(r.adjudication.occurrences,[0,4,8]);assert.equal(r.adjudication.trace.length,8);
});
test("black perpetual check is symmetric",()=>{
  const S=start({f9:"k",d0:"K",e2:"r"},"b");repeat(S,["e2d2","d0e0","d2e2","e0d0"]);
  assert.equal(C.judgeState(S).w,"r");
});
test("direct chase follows the same knight across squares",()=>{
  const S=repeat(chase(),chaseCycle),r=C.judgeState(S);assert.equal(r.w,"b");assert.match(r.why,/同一子/);
  assert.deepEqual(r.adjudication.red.targets,[sq("b7")]);
});
test("nonattacking repetition is a draw",()=>{
  const r=C.judgeState(repeat(idle(),idleCycle));assert.equal(r.w,null);assert.match(r.why,/判和/);
});
test("old ck/ch metadata cannot forge a long-chase loss",()=>{
  const S=repeat(idle(),idleCycle);S.moves.forEach(m=>{m.ck=m.by==="r";m.ch=true});
  assert.equal(C.judgeState(S).w,null);
});
test("stale ck=false cannot hide real perpetual check",()=>{
  const S=repeat(check(),checkCycle);S.moves.forEach(m=>{m.ck=false;m.ch=false});
  assert.equal(C.judgeState(S).w,"b");
});
test("no-capture limit cannot overwrite perpetual-check loss",()=>{
  const S=repeat(check(),checkCycle,30);assert.equal(S.moves.length,120);assert.equal(C.judgeState(S).w,"b");
});
test("different repeated paths request review, not a forced draw/loss",()=>{
  const S=idle();repeat(S,idleCycle,1);repeat(S,["a1a3","i8i7","a3a1","i7i8"],1);
  assert.equal(C.judgeState(S),null);assert.equal(S.repetition.pending,true);
});
test("earlier unrelated route does not contaminate latest repeated cycle",()=>{
  const S=idle();repeat(S,["a1a3","i8i7","a3a1","i7i8"],1);repeat(S,idleCycle);
  const r=C.judgeState(S);assert.equal(r.w,null);assert.deepEqual(r.adjudication.occurrences,[4,8,12]);
});
test("load and rebuild regenerate the same verdict",()=>{
  const S=repeat(chase(),chaseCycle),r=C.judgeState(S);
  const T=JSON.parse(JSON.stringify({start:S.start,moves:S.moves.map(({f,t})=>({f,t}))}));C.stateRebuild(T);
  assert.deepEqual(C.judgeState(T),r);
});
test("undo removes repetition and redo restores it",()=>{
  const S=repeat(check(),checkCycle),last=S.moves.pop();C.stateRebuild(S);assert.equal(C.judgeState(S),null);
  move(S,C.iccs(last.f,last.t));assert.equal(C.judgeState(S).w,"b");
});
test("breaking the cycle clears pending adjudication",()=>{
  const S=idle();repeat(S,idleCycle,1);repeat(S,["a1a3","i8i7","a3a1","i7i8"],1);C.judgeState(S);
  move(S,"a1b1");assert.equal(C.judgeState(S),null);assert.equal(S.repetition,null);
});
test("pinned apparent defender cannot be a real root",()=>{
  // Black rook e8 is pinned to its king e9 by red rook e1. It cannot recapture on b8.
  const S=start({d0:"K",e9:"k",e1:"R",c4:"R",b8:"n",e8:"r"});
  repeat(S,["c4b4","b8c6","b4c4","c6b8"]);
  assert.equal(C.judgeState(S).w,"b");
});
test("Asian one-check-one-chase is allowed, unlike the old blended rule",()=>{
  const S=start({d0:"K",f0:"A",e9:"k",c5:"C",e7:"n",c9:"r"});
  repeat(S,["c5e5","e7c8","e5c5","c8e7"]);
  const r=C.judgeState(S);assert.equal(r.w,null);
  const checks=r.adjudication.trace.filter(m=>m.by==="r").map(m=>m.check);
  assert.deepEqual(checks,[true,false,true,false]);
  assert.ok(r.adjudication.trace.some(m=>!m.check&&m.attacks.some(a=>a.victim==="R")));
});
test("horse/cannon chasing a protected rook is still a direct chase",()=>{
  const T=start({d0:"K",f9:"k",c3:"C",b5:"P",c5:"P",b7:"r",a7:"r"});
  repeat(T,["c3b3","b7c7","b3c3","c7b7"]);
  const r=C.judgeState(T);assert.equal(r.w,"b");
  assert.ok(r.adjudication.trace.some(m=>m.attacks.some(a=>a.rooted&&a.victim==="R"&&!a.exempt)));
});
test("chasing a genuinely protected knight is allowed",()=>{
  const S=start({d0:"K",f9:"k",c3:"R",b7:"n",b9:"r",c9:"r"});
  repeat(S,chaseCycle);assert.equal(C.judgeState(S).w,null);
});
test("a pawn's own perpetual attack does not become illegal chase",()=>{
  const S=start({e0:"K",f9:"k",c5:"P",d6:"r"});
  repeat(S,["c5d5","d6c6","d5c5","c6d6"]);assert.equal(C.judgeState(S).w,null);
});
test("an unprotected crossed pawn can be the chased victim",()=>{
  const S=start({d0:"K",f9:"k",b1:"R",c4:"p"});
  repeat(S,["b1c1","c4b4","c1b1","b4c4"]);assert.equal(C.judgeState(S).w,"b");
});
test("mutual rook exchange is not a long-chase loss",()=>{
  const S=start({d0:"K",f9:"k",c3:"R",b7:"r"});
  repeat(S,["c3b3","b7c7","b3c3","c7b7"]);assert.equal(C.judgeState(S).w,null);
});
test("identical piece types swapping squares are not mistaken for stable identities",()=>{
  const S=start({d0:"K",f9:"k",a1:"R",b1:"R",i8:"r"});
  repeat(S,["a1a2","i8i7","b1a1","i7i8","a2b2","i8i7","b2b1","i7i8"]);
  assert.equal(C.judgeState(S),null);assert.equal(S.repetition.pending,true);
});
// 開發者 11/11 盤查補測：不同路線長將、雙方互捉待核、60 回合限著、雙方無進攻子力、困斃。
test("perpetual check along different routes still loses (referee 188-192)",()=>{
  // 紅馬繞兩條不同的路，每一步都將軍，第三次回到同一局面
  const S=start({e0:"K",f9:"k",g6:"N"});
  repeat(S,["g6h8","f9f8","h8g6","f8f9"],1);repeat(S,["g6e7","f9f8","e7g6","f8f9"],1);
  const r=C.judgeState(S);assert.equal(r.w,"b");assert.match(r.why,/紅方長將/);assert.match(r.why,/路線不同/);
  assert.deepEqual(r.adjudication.occurrences,[0,4,8]);
});
test("different routes with idle moves on one side stay pending",()=>{
  // 對照組：紅方第二圈有一步不將軍，就不能當長將，要待核
  const S=start({e0:"K",f9:"k",g6:"N",a1:"R",i8:"r"});
  repeat(S,["g6h8","f9f8","h8g6","f8f9"],1);repeat(S,["a1a2","i8i7","a2a1","i7i8"],1);
  assert.equal(C.judgeState(S),null);assert.equal(S.repetition.pending,true);
});
test("mutual chase goes to review, not an automatic draw or loss",()=>{
  // 紅馬 g6 讓開 f 線，f5 的馬不再被對面笑牽住、去捉黑車；黑車躲開又捉紅馬，雙方輪流捉
  const S=start({f0:"K",f9:"k",g6:"N",h6:"r",f5:"N"});
  repeat(S,["g6f8","h6h8","f8g6","h8h6"]);
  assert.equal(C.judgeState(S),null);
  assert.equal(S.repetition.pending,true);assert.match(S.repetition.why,/互捉/);
  assert.equal(S.repetition.red.chase,true);assert.equal(S.repetition.black.chase,true);
});
function noCaptureWalk(S,plies){
  // 每一步挑「沒吃子、走到沒出現過的局面」的第一個合法著法，不會有任何局面重複
  const seen=new Set(S.pos);
  for(let i=0;i<plies;i++){
    const mv=C.legal(S.board,S.turn).find(([f,t])=>!S.board[t]&&!seen.has(C.fen(C.make(S.board,f,t),C.opp(S.turn))));
    assert.ok(mv,"找不到不重複的著法");C.stateApply(S,mv[0],mv[1]);seen.add(S.pos[S.pos.length-1]);
    if(i<plies-1)assert.equal(C.judgeState(S),null,"第 "+(i+1)+" 手不該結束");
  }
  return S;
}
test("120 plies without a capture is a draw",()=>{
  const S=noCaptureWalk(start({d0:"K",f9:"k",a1:"R",i8:"r"}),120);
  assert.equal(S.moves.length,120);
  const r=C.judgeState(S);assert.equal(r.w,null);assert.match(r.why,/60 回合/);
});
test("119 plies without a capture is not yet a draw",()=>{
  const S=noCaptureWalk(start({d0:"K",f9:"k",a1:"R",i8:"r"}),119);
  assert.equal(C.judgeState(S),null);
});
test("no attacking pieces on either side is a draw",()=>{
  // 帥吃掉最後一個卒；剩下的仕、士、象不算進攻子力
  const S=start({d0:"K",e1:"A",f9:"k",e8:"a",c9:"b",d1:"p"});
  move(S,"d0d1");const r=C.judgeState(S);assert.equal(r.w,null);assert.match(r.why,/無進攻子力/);
});
test("stalemate loses for the side with no legal move",()=>{
  // 二鬼拍門：黑將沒被將軍，卻一步都不能走
  const S=start({d0:"K",e9:"k",f8:"P",d7:"P"});
  move(S,"d7d8");assert.equal(C.inCheck(S.board,"b"),false);
  const r=C.judgeState(S);assert.equal(r.w,"r");assert.equal(r.why,"困斃");
});
