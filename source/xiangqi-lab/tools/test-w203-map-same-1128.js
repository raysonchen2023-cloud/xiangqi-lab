// W203（11/28 外部審核第 17 項）：古戰場地圖上兩場座標完全一樣（秦卷三「竊符救趙」「王翦滅趙」都在邯鄲）時，標記疊在一起點不到。
// 原因：07g-battle.js 推開太近的點時，兩點完全重疊 dx、dy 都是 0，推開方向也是 0。修法：抽出 btPushApart，完全重疊時給固定方向。
// 這裡用 vm 跑真的 btPushApart：完全重疊會被推開到 need 以上；本來就分得開的點不動；靠很近的照原本算法推開；改壞驗證（換回原算法要抓到重疊推不開）。
// 用法：node --test xiangqi-lab/tools/test-w203-map-same-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/07g-battle.js"), "utf8").replace(/\r\n/g, "\n");
const grab = s => { const m = /\nfunction btPushApart\(Q,need\)\{[^\n]*\n/.exec(s); assert.ok(m, "07g-battle.js 要有 btPushApart"); return m[0] };
const load = code => { const c = { Math }; vm.createContext(c); vm.runInContext(code + ";this.f=btPushApart", c); return c.f };
const dist = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1]);
test("兩點座標完全一樣（邯鄲兩場）會被推開到至少 need", () => {
  const f = load(grab(SRC)), Q = f([[59.3, 38.1], [59.3, 38.1]], 3);
  assert.ok(dist(Q[0], Q[1]) >= 3 - 1e-9, "推開後距離 " + dist(Q[0], Q[1]));
});
test("同一卷五個點、其中兩個重疊：每對都分開；本來就遠的點不動", () => {
  const f = load(grab(SRC)), P = [[10, 10], [59.3, 38.1], [80, 70], [59.3, 38.1], [30, 60]], Q = f(P.map(p => p.slice()), 3);
  for (let a = 0; a < 5; a++) for (let b = a + 1; b < 5; b++) assert.ok(dist(Q[a], Q[b]) >= 3 - 1e-9, `${a}、${b} 還疊著`);
  for (const i of [0, 2, 4]) assert.deepEqual(Q[i], P[i], "遠的點不該被推");
});
test("靠很近但沒重疊：照原本算法沿兩點連線推開", () => {
  const f = load(grab(SRC)), Q = f([[50, 50], [51, 50]], 3);
  assert.ok(Math.abs(Q[0][1] - 50) < 1e-9 && Math.abs(Q[1][1] - 50) < 1e-9, "沿水平線推開，y 不變");
  assert.ok(dist(Q[0], Q[1]) >= 3 - 1e-9);
});
test("〔原始碼〕battleMapHTML 用 btPushApart 推開太近的點", () => {
  assert.ok(SRC.includes("const Q=btPushApart(P.map(p=>p.slice()),r*2.7);"));
});
test("改壞驗證：換回原本的算法（重疊時方向是 0），重疊的兩點推不開", () => {
  const bad = "\nfunction btPushApart(Q,need){for(let it=0;it<24;it++)for(let a=0;a<Q.length;a++)for(let b=a+1;b<Q.length;b++){const dx=Q[b][0]-Q[a][0],dy=Q[b][1]-Q[a][1],d=Math.hypot(dx,dy)||.01;if(d<need){const m=(need-d)/2;Q[a][0]-=dx/d*m;Q[a][1]-=dy/d*m;Q[b][0]+=dx/d*m;Q[b][1]+=dy/d*m}}return Q}\n";
  const Q = load(bad)([[59.3, 38.1], [59.3, 38.1]], 3);
  assert.ok(dist(Q[0], Q[1]) < 3, "原算法應該推不開（這正是 W203 的問題）");
});
