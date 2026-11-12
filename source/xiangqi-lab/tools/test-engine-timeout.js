// 開發者 11/12 iPhone 截圖「思考有點久」：引擎沒回 bestmove 時不能永遠等（xiangqi-lab/src/engine.js 的 untilT／reset）
// 行為測試：用假的 Pikafish 模組模擬三種情況——正常回應、卡住但叫停就回、完全不回應；時間用 _tmo 縮短
// 用法：node --test xiangqi-lab/tools/test-engine-timeout.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path"),vm=require("vm");
const SRC=fs.readFileSync(path.join(__dirname,"..","src","engine.js"),"utf8");
const LOCAL=fs.readFileSync(path.join(__dirname,"..","src","local.js"),"utf8");

/* mode：ok＝go 之後回 info＋bestmove；hang＝什麼都不回；stopok＝go 不回，收到 stop 才回 bestmove */
function boot(modes){
  const log=[],made={n:0};let mi=0;
  const ctx={console,Promise,Map,Error,setTimeout,clearTimeout,Uint8Array,URL,Response:class{},
    location:{href:"http://localhost/xiangqi-lab/"},self:{crossOriginIsolated:true},navigator:{hardwareConcurrency:4},
    caches:{open:async()=>({match:async()=>({arrayBuffer:async()=>new ArrayBuffer(4)}),put:async()=>{}})},
    XQCore:{START:"rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR"},document:{head:{append(){}}}};
  ctx.window=ctx;
  ctx.PikafishModule=async opt=>{made.n++;const mode=modes[Math.min(mi++,modes.length-1)];let going=false;
    const out=l=>setTimeout(()=>opt.print(l),1);
    return{PThread:{terminateAllThreads(){log.push("terminate")}},
      ccall(fn,r,t,[c]){log.push(c);
        if(c==="uci")out("uciok");else if(c==="isready")out("readyok");
        else if(c.startsWith("go ")){going=true;if(mode==="ok"){out("info depth 3 multipv 1 score cp 25 pv h2e2 h9g7");out("bestmove h2e2")}}
        else if(c==="stop"&&going&&mode==="stopok"){out("info depth 2 multipv 1 score cp 10 pv b2e2");out("bestmove b2e2")}}}};
  vm.createContext(ctx);vm.runInContext(SRC,ctx,{filename:"engine.js"});
  const E=vm.runInContext("XQEngine",ctx);E._tmo(0.002);   /* 20 秒→40 毫秒、3 秒→6 毫秒 */
  return{E,log,made}}

test("正常：照常回最佳著與候選，不送 stop、不重置",async()=>{
  const{E,log,made}=boot(["ok"]);const r=await E.search({moves:[]},{depth:3},1);
  assert.equal(r.best,"h2e2");assert.equal(r.lines[0].v,25);assert.ok(!log.includes("stop"));assert.equal(made.n,1);assert.equal(E.ready,true)});
test("卡住但叫停就回：超時送 stop，拿到引擎交出的那一步，不重置引擎",async()=>{
  const{E,log,made}=boot(["stopok"]);const r=await E.search({moves:["h2e2"]},{movetime:500},1);
  assert.equal(r.best,"b2e2");assert.ok(log.includes("stop"));assert.ok(!log.includes("terminate"));assert.equal(made.n,1)});
test("完全不回應：不會永遠等——拋出可讀的錯誤、重置引擎；下一次搜尋重新啟動引擎並成功",async()=>{
  const{E,log,made}=boot(["hang","ok"]);
  await assert.rejects(E.search({moves:[]},{depth:3},1),/電腦棋手沒有回應/);
  assert.ok(log.includes("stop"),"先試著叫停");assert.ok(log.includes("terminate"),"再關掉舊的引擎執行緒");assert.equal(E.ready,false);
  const r=await E.search({moves:[]},{depth:3},1);assert.equal(r.best,"h2e2");assert.equal(made.n,2,"重新啟動了一次")});
test("卡住的那一步不會擋住排在後面的搜尋",async()=>{
  const{E}=boot(["hang","ok"]);const a=E.search({moves:[]},{depth:3},1),b=E.search({moves:[]},{depth:3},1);
  await assert.rejects(a);assert.equal((await b).best,"h2e2")});
test("〔原始碼〕電腦落子遇到錯誤會隔幾秒自動重試（不是停在思考中）",()=>{
  assert.ok(LOCAL.includes("catch(e){engFail++;"));
  assert.ok(LOCAL.includes("else if(!engWait)setTimeout(playEngine,Math.min(60000,1500*2**Math.min(engFail,6)))"))});
