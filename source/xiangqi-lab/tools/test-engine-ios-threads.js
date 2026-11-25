// 11/25 iPad Air 4（A14、4GB）實機：Pikafish wasm 多執行緒一開算就 Out of bounds memory access，電腦不回棋（iPhone 相容模式也一樣）；
// 只把 Threads 改成 1 就正常。xiangqi-lab/src/engine.js：iPhone／iPad 固定 1 條執行緒，桌機與 Android 照舊 min(4,核心數−1)。
// 行為測試：用假的 Pikafish 模組載入 engine.js，看實際送出的 setoption 指令。
// 用法：node --test xiangqi-lab/tools/test-engine-ios-threads.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const SRC=fs.readFileSync(path.join(__dirname,"..","src","engine.js"),"utf8");

async function opts(nav){
  const log=[];
  const ctx={console,Promise,Map,Error,setTimeout,clearTimeout,Uint8Array,URL,Response:class{},
    location:{href:"http://localhost/xiangqi-lab/"},self:{crossOriginIsolated:true},navigator:nav,
    caches:{open:async()=>({match:async()=>({arrayBuffer:async()=>new ArrayBuffer(4)}),put:async()=>{}})},
    XQCore:{START:"rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR"},document:{head:{append(){}}}};
  ctx.window=ctx;
  ctx.PikafishModule=opt=>{const out=l=>setTimeout(()=>opt.print(l),1);
    return{PThread:{terminateAllThreads(){}},FS:{unlink(){}},
      ccall(fn,r,t,[c]){log.push(c);if(c==="uci")out("uciok");else if(c==="isready")out("readyok");
        else if(c.startsWith("go "))out("bestmove h2e2")}}};
  vm.createContext(ctx);vm.runInContext(SRC,ctx,{filename:"engine.js"});
  const E=vm.runInContext("XQEngine",ctx);E._tmo(0.002);
  await E.search({moves:[]},{depth:3},1);
  const th=log.find(c=>c.startsWith("setoption name Threads value "));
  const hs=log.find(c=>c.startsWith("setoption name Hash value "));
  return{th:th&&+th.split(" ").pop(),hash:hs&&+hs.split(" ").pop(),E}}

const IPHONE="Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148";
const IPAD_DESKTOP="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15";
const ANDROID="Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36";
const WIN="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

test("iPhone：6 核也只開 1 條執行緒、雜湊 16 MB",async()=>{
  const r=await opts({userAgent:IPHONE,hardwareConcurrency:6,maxTouchPoints:5});
  assert.equal(r.th,1);assert.equal(r.hash,16);assert.equal(r.E.threads,1)});
test("iPad（桌面版 UA＋觸控）：8 核也只開 1 條執行緒",async()=>{
  const r=await opts({userAgent:IPAD_DESKTOP,hardwareConcurrency:8,maxTouchPoints:5});
  assert.equal(r.th,1);assert.equal(r.hash,16)});
test("Mac 桌機 Safari（沒有觸控）不算 iOS：照舊最多 4 條、雜湊 64 MB",async()=>{
  const r=await opts({userAgent:IPAD_DESKTOP,hardwareConcurrency:8,maxTouchPoints:0});
  assert.equal(r.th,4);assert.equal(r.hash,64)});
test("Android 8 核：照舊 4 條",async()=>{
  const r=await opts({userAgent:ANDROID,hardwareConcurrency:8,maxTouchPoints:5});
  assert.equal(r.th,4);assert.equal(r.hash,64)});
test("Windows 2 核：照舊 核心數−1＝1 條",async()=>{
  const r=await opts({userAgent:WIN,hardwareConcurrency:2,maxTouchPoints:0});
  assert.equal(r.th,1);assert.equal(r.hash,64)});
