/* W87-2（11/26）仙人指路地底迷宮第二層「漏月迷陣」（m/07z9m-pawn2.js；共用 m/07z9m-maze.js 的 jhMzLayer、jhMzPath 的 lv.canMove）：
   用 vm 跑真的程式（共用程式、碑刻、十派第一層、第二層）：
   登記成第二層不動第一層、竹林只能上下直走（實際走路 onStep 與自動走 jhMzPath 都照這條）、巡竹兵卒的視線（過河加左右各 1 格、竹林擋視線）、
   照真的守衛走法逐回合模擬：從入口走得到踏板、再走得到石門前而不被看到（任一守衛慢 1～7 回合也一樣）、題庫題數與不跟第一層重複。
   「改壞驗證」：同一組檢查拿去跑改壞的程式（竹林可以橫走、自動走不看竹林、過河沒加左右視線），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const FILES = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js", "07z9m-central2.js", "07z9m-pawn2.js"];

function load(patch = {}) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, vibrate: () => {}, jhGo: () => {}, jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: () => ({ style: {}, dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {} }), head: { append() {} }, body: { append() {} } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false }); c.location = { href: "http://x/index.html#/", hash: "#/" };
  vm.createContext(c); for (const f of FILES) vm.runInContext(patch[f] ? patch[f](rd(f)) : rd(f), c);
  return c;
}
const L2 = (c) => c.jhMzLvN("pawn", 2);
const K = (c) => vm.runInContext("jhMzKind", c);
const cell = (S, x, y) => (S.grid[y] || [])[x];

/* 照真的程式逐回合模擬：守衛走法不受玩家影響，所以先把每一回合的守衛位置算好，再在 (x, y, 回合) 上做 BFS。
   一回合＝玩家走一步（照 onStep 的竹林規則與 solid）→ 守衛各走一步 → 玩家站的格子被看到或撞上＝被抓。玩家每回合一定要走（沒有「等」）。
   delay[i]＝第 i 個守衛晚幾回合才開始動。回傳 {plate, door}：到得了踏板、到得了石門前（踏板之後）的最少回合，到不了是 -1 */
function simulate(c, delay = []) {
  const S = c.jhMzNew(L2(c)), lv = S.lv, T = 160;
  const G0 = (lv.guards || []).map((g) => Object.assign({}, g)), frames = [];
  let G = G0.map((g) => Object.assign({}, g));
  for (let t = 0; t <= T; t++) {
    const pos = G.map((g) => ({ x: g.x, y: g.y })), seen = new Set();
    for (const g of G) for (const q of K(c)(g).sight(S, g)) seen.add(q.y * S.W + q.x);
    frames.push({ pos, seen });
    G = G.map((g, i) => { const n = Object.assign({}, g); if (t >= (delay[i] || 0)) K(c)(n).step(S, n); return n });
  }
  const find = (ch) => { for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (lv.map[y][x] === ch) return { x, y }; return null };
  const st = find("@"), pl = find("P"), dr = find("D");
  const ok = (x, y, t) => { const f = frames[t]; return !f.pos.some((p) => p.x === x && p.y === y) && !f.seen.has(y * S.W + x) };
  const bfs = (from, t0, goal) => {
    const vis = new Set([from.x + "," + from.y + "," + t0]), q = [[from.x, from.y, t0]];
    while (q.length) {
      const [x, y, t] = q.shift(); if (goal(x, y)) return t; if (t >= T) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; S.player = { x, y };
        if (lv.onStep && lv.onStep(S, dx, dy, cell(S, nx, ny))) continue;
        if (c.jhMzSolid(S, nx, ny)) continue;
        if (frames[t].pos.some((p) => p.x === nx && p.y === ny)) continue;
        if (!ok(nx, ny, t + 1)) continue;
        const k = nx + "," + ny + "," + (t + 1); if (vis.has(k)) continue; vis.add(k); q.push([nx, ny, t + 1]);
      }
    }
    return -1;
  };
  const tp = bfs(st, 0, (x, y) => x === pl.x && y === pl.y);
  const td = tp < 0 ? -1 : bfs(pl, tp, (x, y) => Math.abs(x - dr.x) + Math.abs(y - dr.y) === 1);
  return { plate: tp, door: td };
}

/* 規則檢查：回傳不符合的地方（空陣列＝都符合）。同一組檢查也拿去跑改壞的程式（改壞驗證） */
function problems(c) {
  const bad = [], B = vm.runInContext("JH_MZ_LV", c).pawn, L = L2(c);
  if (!L || L.layer !== 2 || L === B) bad.push("第二層沒登記到");
  if (B.layer !== 1 || B.map !== vm.runInContext("JH_MZ_PAWN_MAP", c)) bad.push("第一層被蓋掉");
  if (c.jhMzLayers("pawn") !== 2) bad.push("仙人指路要有兩層");
  if (!L) return bad;
  /* 竹林：實際走路橫走擋住、上下可以 */
  const S = c.jhMzNew(L); S.player = { x: 3, y: 15, face: 1 };   /* (3,15) 是竹林 */
  if (!L.onStep || !L.onStep(S, 1, 0, cell(S, 4, 15))) bad.push("竹林裡往右走要擋住");
  if (L.onStep && L.onStep(S, 0, -1, cell(S, 3, 14))) bad.push("竹林裡往上走要可以");
  S.player = { x: 5, y: 15 };   /* (5,15) 不是竹林，左邊 (4,15) 是 */
  if (!L.onStep || !L.onStep(S, -1, 0, cell(S, 4, 15))) bad.push("從旁邊橫著走進竹林要擋住");
  /* 自動走：找出來的路線每一步橫走都不碰竹林 */
  const A = c.jhMzNew(L); for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) A.seen.add(y * A.W + x);
  A.player = { x: 5, y: 15 }; const pa = c.jhMzPath(A, 3, 15);   /* 沒有竹林規則時，最短路會從 (4,15) 橫穿竹林 */
  if (!pa) bad.push("自動走：要找得到路繞進竹林 (3,15)");
  else { let px = 5, py = 15; for (const [x, y] of pa) { if (x !== px && (cell(A, px, py) === "Z" || cell(A, x, y) === "Z")) { bad.push(`自動走：在 (${px},${py})→(${x},${y}) 橫著穿竹林`); break } px = x; py = y } }
  /* 視線：沒過河只看正前方；過了河加左右各 1 格；竹林擋視線 */
  const V = c.jhMzNew(L), sg = (g) => K(c)(g).sight(V, g).map((q) => q.x + "," + q.y);
  const before = sg({ kind: "pawn2", x: 3, y: 4, dx: 1, dy: 1 });
  if (before.includes("4,4") || before.includes("2,4")) bad.push("沒過河的兵不該看到左右");
  const after = sg({ kind: "pawn2", x: 4, y: 13, dx: 1, dy: 1 });
  if (!after.includes("5,13") || !after.includes("3,13")) bad.push("過了河的兵要看到左右各 1 格");
  if (after.includes("6,13")) bad.push("過了河左右只看 1 格");
  const inb = sg({ kind: "pawn2", x: 2, y: 13, dx: 1, dy: 1 });
  if (inb.includes("2,15")) bad.push("竹林要擋住兵往前的視線（(2,14) 是竹林）");
  /* 逐回合模擬：走得到踏板、再走得到石門前；任一守衛慢 1～7 回合也一樣 */
  const r = simulate(c); if (r.plate < 0) bad.push("從入口走不到踏板（會被看到）"); else if (r.door < 0) bad.push("踩完踏板走不到石門前");
  for (let i = 0; i < (L.guards || []).length; i++) for (let d = 1; d <= 7; d++) { const q = simulate(c, Object.assign([], { [i]: d })); if (q.plate < 0 || q.door < 0) { bad.push(`守衛 ${i} 慢 ${d} 回合時走不過去`); break } }
  return bad;
}

test("仙人指路第二層：登記、竹林、自動走、視線、走得過", () => {
  const bad = problems(load());
  assert.deepEqual(bad, []);
});

test("仙人指路第二層：題庫 3＋6 題、每題有棋譜、不跟第一層重複", () => {
  const c = load(), P2 = vm.runInContext("JH_MZ_POOL_PAWN2", c), P1 = vm.runInContext("JH_MZ_POOL_PAWN", c);
  assert.equal(P2.door.length, 3); assert.equal(P2.trap.length, 6);
  const ids1 = new Set([...P1.door, ...P1.trap].map((q) => q.id)), ids2 = [...P2.door, ...P2.trap].map((q) => q.id);
  assert.equal(new Set(ids2).size, ids2.length, "第二層自己不重複");
  for (const id of ids2) assert.ok(!ids1.has(id), "跟第一層重複：" + id);
  for (const q of [...P2.door, ...P2.trap]) { assert.ok(q.fen && Array.isArray(q.line) && q.line.length % 2 === 1, q.id + " 棋譜"); assert.ok(q.zh && q.en, q.id + " 標題說明") }
  const L = c.jhMzLvN("pawn", 2); assert.equal(L.puz.door, P2.door[0]); assert.equal(L.puz.trap, P2.trap[0]);
});

test("仙人指路第二層：修為 +40、存檔鍵分層、碑刻標「遊戲整理」", () => {
  const L = load().jhMzLvN("pawn", 2);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:pawn:2"); assert.ok(/_L2$/.test(L.key));
  assert.ok(L.lore && L.lore.length >= 1 && /遊戲整理/.test(L.lore[0].src));
});

test("改壞驗證：竹林可以橫走、自動走不看竹林、過河沒加左右視線，檢查都要抓得到", () => {
  const cases = [
    ["竹林可以橫走", { "07z9m-pawn2.js": (s) => s.replace("onStep(S,dx,dy){const P=S.player;return dx&&!jhMzPawn2CanMove(S,P.x,P.y,dx,dy)?{ev:\"wall\",block:\"bamboo\"}:null}", "onStep(){return null}") }],
    ["自動走不看竹林", { "07z9m-maze.js": (s) => s.replace("if(S.lv.canMove&&!S.lv.canMove(S,x,y,a,b))continue;", "") }],
    ["過河沒加左右視線", { "07z9m-pawn2.js": (s) => s.replace("{ray(1,0,1);ray(-1,0,1)}", "{}") }],
  ];
  for (const [name, patch] of cases) {
    const f = Object.keys(patch)[0], orig = rd(f); assert.notEqual(patch[f](orig), orig, name + "：改壞的程式要真的有改到");
    assert.ok(problems(load(patch)).length > 0, name + "：檢查要抓得到");
  }
});
