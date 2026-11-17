// 第 20 輪（候選版 20261117-1033 回報）修正的測試
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");

/* D N1（P0）：冷開或重新整理 #/coop 時第一次 route() 比 07q2 的 const COOP_DESK_ON 早跑，丟 ReferenceError 整個 App 停在載入失敗。
   跟 test-daily.js 的 #/daily 同一招：把 02-shell.js 路由裡 coop 那一行原樣切出來，放進「CoopPage 用到的 const 在後面才宣告」的程式裡跑 */
test("冷開 #/coop：COOP_DESK_ON 還沒初始化時路由不丟錯，整支程式跑完後重排一次就開得起來", () => {
  const SH = rd(path.join(M, "02-shell.js")), line = SH.split("\n").find(l => /p\[0\]==="coop"&&typeof CoopPage/.test(l));
  assert.ok(line && /ReferenceError/.test(line), "02-shell.js 的 coop 路由要接住還沒初始化的錯");
  const code = `var T=[],opened=[],screen=null,ROUTED=0;function setTimeout(f){T.push(f)}
function route(){ROUTED++;const v={},p=["coop","w","x_swordboy"];
${line.replace(/\/\*[\s\S]*\*\/\s*$/, "")}
}
function CoopPage(v,p){if(!COOP_DESK_ON)return{};opened.push(p.join("/"));return{stop(){}}}
route();var first={opened:opened.slice(),pending:T.length};
const COOP_DESK_ON=true;`;
  const ctx = {}; vm.createContext(ctx); vm.runInContext(code + "\nthis.R={first,T,get:()=>({opened,ROUTED,tdz:route.tdz})};", ctx);
  const R = ctx.R, J = x => JSON.stringify(x);
  assert.equal(J(R.first.opened), "[]", "還沒初始化時不開頁"); assert.equal(R.first.pending, 1, "排了一次重跑");
  R.T.shift()();
  assert.equal(J(R.get().opened), J(["w/x_swordboy"]), "重跑時開得起來"); assert.equal(R.get().ROUTED, 2); assert.equal(R.get().tdz, 0);
});

test("#/coop 不是初始化順序的錯照樣丟出來，不會吞掉真的 bug", () => {
  const SH = rd(path.join(M, "02-shell.js")), line = SH.split("\n").find(l => /p\[0\]==="coop"&&typeof CoopPage/.test(l));
  const code = `var T=[],screen=null;function setTimeout(f){T.push(f)}
function route(){const v={},p=["coop"];
${line.replace(/\/\*[\s\S]*\*\/\s*$/, "")}
}
function CoopPage(){throw new TypeError("壞了")}`;
  const ctx = {}; vm.createContext(ctx); vm.runInContext(code, ctx);
  assert.throws(() => vm.runInContext("route()", ctx), /壞了/);
});
