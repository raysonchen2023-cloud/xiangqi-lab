// 11/25 iPad Air 4（A14、iPadOS 18.7）實機：Pikafish wasm 開 4 條執行緒一開算就 Out of bounds memory access，電腦不回棋。
// 實機自動實驗找到真正原因：共享記憶體 192 MB 起跳、算到一半加大時別的執行緒看不到新大小；一開始就給足就好。
// xiangqi-lab/src/engine.js：iPhone／iPad 建立引擎模組時共享記憶體一次給 384 MB（IOS_MEM），執行緒恢復 min(4,核心數−1)；桌機、Android 記憶體照舊。
// 行為測試：用假的 Pikafish 模組載入 engine.js（假模組跟真的 pikafish.js 一樣自己 new WebAssembly.Memory），看記憶體大小和送出的 setoption。
// 用法：node --test xiangqi-lab/tools/test-engine-ios-threads.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const SRC=fs.readFileSync(path.join(__dirname,"..","src","engine.js"),"utf8");

async function opts(nav){
  const log=[],mems=[];
  class FakeMem{constructor(d){this.d=d;this.buffer={byteLength:d.initial*65536};mems.push(this)}}
  const ctx={console,Promise,Map,Error,setTimeout,clearTimeout,Uint8Array,URL,Response:class{},
    location:{href:"http://localhost/xiangqi-lab/"},self:{crossOriginIsolated:true},navigator:nav,
    caches:{open:async()=>({match:async()=>({arrayBuffer:async()=>new ArrayBuffer(4)}),put:async()=>{}})},
    XQCore:{START:"rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR"},document:{head:{append(){}}},
    WebAssembly:{Memory:FakeMem}};
  ctx.window=ctx;
  /* 跟真的 pikafish.js 一樣：呼叫模組工廠的當下同步 new 共享記憶體（initial 3072 頁＝192 MB） */
  ctx.PikafishModule=opt=>{new ctx.WebAssembly.Memory({initial:3072,maximum:32768,shared:true});const out=l=>setTimeout(()=>opt.print(l),1);
    return{PThread:{terminateAllThreads(){}},FS:{unlink(){}},
      ccall(fn,r,t,[c]){log.push(c);if(c==="uci")out("uciok");else if(c==="isready")out("readyok");
        else if(c.startsWith("go "))out("bestmove h2e2")}}};
  vm.createContext(ctx);vm.runInContext(SRC,ctx,{filename:"engine.js"});
  const E=vm.runInContext("XQEngine",ctx);E._tmo(0.002);
  await E.search({moves:[]},{depth:3},1);
  const th=log.find(c=>c.startsWith("setoption name Threads value "));
  const hs=log.find(c=>c.startsWith("setoption name Hash value "));
  /* 建完之後再 new 一個（例如別的程式用 WebAssembly.Memory）：要是原本的建構子、大小不被改 */
  const after=new ctx.WebAssembly.Memory({initial:3072,maximum:32768,shared:true});
  return{th:th&&+th.split(" ").pop(),hash:hs&&+hs.split(" ").pop(),E,mem:mems[0].d.initial,restored:ctx.WebAssembly.Memory===FakeMem&&after.d.initial===3072,warn:log}}

const IPHONE="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPAD_DESKTOP="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const WIN="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

test("iPhone：共享記憶體一開始就給 6144 頁（384 MB），執行緒照核心數最多 4 條、雜湊 16 MB；建完馬上換回原本的建構子",async()=>{
  const r=await opts({userAgent:IPHONE,hardwareConcurrency:6,maxTouchPoints:5});
  assert.equal(r.mem,6144);assert.equal(r.th,4);assert.equal(r.hash,16);assert.equal(r.E.threads,4);assert.equal(r.E.memMB,384);assert.ok(r.restored)});
test("iPad（桌面版 UA＋觸控）：一樣一次給 384 MB、4 條執行緒",async()=>{
  const r=await opts({userAgent:IPAD_DESKTOP,hardwareConcurrency:8,maxTouchPoints:5});
  assert.equal(r.mem,6144);assert.equal(r.th,4);assert.equal(r.hash,16);assert.ok(r.restored)});
test("Mac 桌機 Safari（沒有觸控）不算 iOS：記憶體照舊 192 MB 起跳、最多 4 條、雜湊 64 MB",async()=>{
  const r=await opts({userAgent:IPAD_DESKTOP,hardwareConcurrency:8,maxTouchPoints:0});
  assert.equal(r.mem,3072);assert.equal(r.th,4);assert.equal(r.hash,64);assert.ok(r.restored)});
test("Android 8 核：記憶體照舊、4 條",async()=>{
  const r=await opts({userAgent:ANDROID,hardwareConcurrency:8,maxTouchPoints:5});
  assert.equal(r.mem,3072);assert.equal(r.th,4);assert.equal(r.hash,64)});
test("Windows 2 核：照舊 核心數−1＝1 條",async()=>{
  const r=await opts({userAgent:WIN,hardwareConcurrency:2,maxTouchPoints:0});
  assert.equal(r.mem,3072);assert.equal(r.th,1);assert.equal(r.hash,64)});
