// ChatGPT：執行真實 net.js 的訊息處理，但以記憶體 transport 取代 MQTT。
"use strict";
const vm=require("node:vm"),fs=require("node:fs"),assert=require("node:assert/strict"),test=require("node:test");
const C=require("../site/core.js");
function harness(){
  const sent=[],events=[],data=new Map();
  const ctx={XQCore:C,TextEncoder,TextDecoder,URL,console,Date,Math,JSON,
    location:{hash:"",hostname:"raysonchen2023-cloud.github.io"},navigator:{onLine:true},document:{hidden:false,addEventListener(){}},
    localStorage:{getItem:k=>data.get(k)||null,setItem:(k,v)=>data.set(k,v)},
    addEventListener(){},dispatchEvent:e=>events.push(e.type),CustomEvent:class{constructor(type){this.type=type}},
    setTimeout:()=>0,setInterval:()=>0,clearTimeout(){},clearInterval(){},
    meInfo:()=>({id:"tester",name:"測試者"}),crypto:require("node:crypto").webcrypto};
  ctx.window=ctx;vm.createContext(ctx);
  let src=fs.readFileSync(require.resolve("../src/net.js"),"utf8");
  src=src.replace(/^  return\{\r?$/m,"  window.__rulesTest={onMsg,sendInvite,okNext,timeoutCheck,record,setGame:x=>{G=x;cur={gid:x.gid}},setTransport:x=>cli=x};\n  return{");
  vm.runInContext(src,ctx);
  ctx.__rulesTest.setTransport({up:true,pub:(topic,msg)=>sent.push({topic,msg:JSON.parse(msg)}),sub(){},unsub(){}});
  const receive=(type,rules)=>ctx.__rulesTest.onMsg("xqlab-r7k2q/v1/i/tester",JSON.stringify({type,gid:"fixture",from:{id:"peer",name:"對手",rules},at:Date.now()}));
  return{ctx,sent,events,receive,data};
}
test("old rule version invitation is declined before a game starts",()=>{
  const h=harness();h.receive("invite",undefined);
  assert.equal(h.sent.at(-1).msg.type,"decline");assert.ok(h.events.includes("xq-rules-mismatch"));assert.equal(h.ctx.XQNet.game(),null);
});
test("other rule version acceptance cannot start a game",()=>{
  const h=harness();h.ctx.XQNet.invite({id:"peer",name:"對手"});h.receive("accept","china-2020");
  assert.equal(h.sent.at(-1).msg.type,"decline");assert.equal(h.ctx.XQNet.game(),null);
});
test("new invitations publish the exact adjudicator version",()=>{
  const h=harness();h.ctx.XQNet.invite({id:"peer",name:"對手"});
  assert.equal(h.sent[0].msg.from.rules,C.REP_RULES.id);
});
test("matching version invitation reaches the normal invite handler",()=>{
  const h=harness();let count=0;h.ctx.XQNet.on("invite",()=>count++);h.receive("invite",C.REP_RULES.id);
  assert.equal(count,1);assert.equal(h.sent.length,0);assert.equal(h.events.length,0);
});
test("mid-game rule version changes are rejected",()=>{
  const h=harness();assert.equal(h.ctx.__rulesTest.okNext({rules:C.REP_RULES.id},{rules:"old"}),false);
});
test("new client does not timeout or rate a resumed legacy game",()=>{
  const h=harness(),g={gid:"legacy",id:"old",red:{id:"tester",name:"測試者"},black:{id:"peer",name:"對手"},moves:[[0,1]],clk:{r:500,b:0},tk:Date.now()-10000,rev:1,result:null};
  const original=[...h.data];
  h.ctx.__rulesTest.setGame(g);h.ctx.__rulesTest.timeoutCheck();assert.equal(g.result,null);assert.equal(h.sent.length,0);
  g.moves.push([1,2]);g.result={w:"b",why:"舊版棋例"};h.ctx.__rulesTest.record();
  assert.deepEqual([...h.data],original);assert.equal(h.sent.length,0);
});
