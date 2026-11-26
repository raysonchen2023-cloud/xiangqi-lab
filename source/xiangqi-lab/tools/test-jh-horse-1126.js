/* W87-2（11/26）起馬地底迷宮第一層「地下驛道」（m/07z9m-horse.js）：無韁野馬循足跡追、蹩馬腿、地圖走得完、題庫用 core.js 獨立重算。
   開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單「先把十派第一層補齊」。馬的跳法用屏風馬門（m/07z9m-screen.js）的 jhMzHorseCan。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const MZ = rd("07z9m-maze.js"), SCR = rd("07z9m-screen.js"), SRC = rd("07z9m-horse.js");

function load() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/horse" }) });
  vm.createContext(c); vm.runInContext(MZ, c); vm.runInContext(SCR, c); vm.runInContext(SRC, c);
  return c;
}
const LV = (c) => vm.runInContext("JH_MZ_LV", c).horse;
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const OPEN = ["###########", "#.........#", "#.........#", "#.........#", "#.........#", "#.........#", "#.........#", "#.........#", "#.........#", "#.........#", "###########"];
function room(c, rows, G, px, py) { const S = c.jhMzNew("horse"); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = [Object.assign({ kind: "wildhorse", dx: 1, dy: -2 }, G)]; S.guard = S.guards[0]; at(S, px, py); return S }

test("登記：起馬門有登記、路由 #/jianghu/maze/horse；一匹無韁野馬；不能跳；門內頁有入口；三個寶箱", () => {
  const c = load(), lv = LV(c), sidOf = vm.runInContext("jhMzSidOf", c);
  assert.ok(lv); assert.equal(sidOf("#/jianghu/maze/horse"), "horse"); assert.equal(lv.key, "jhMaze_horse");
  assert.equal(lv.guards.length, 1); assert.equal(lv.guards[0].kind, "wildhorse");
  assert.equal(lv.jump, ""); assert.ok(lv.hall && lv.hall.zh && lv.hall.en); assert.equal(lv.rew.length, 3);
});

test("野馬的視線跟屏風馬門的銅人一樣：下一步跳得到的日字落點；玩家站在馬腿上那兩個方向看不到", () => {
  const c = load();
  let S = room(c, OPEN, { x: 5, y: 5 }, 1, 1);
  assert.equal(c.jhMzSight(S, S.guard).length, 8, "空地中間八個落點");
  S = room(c, OPEN, { x: 5, y: 5 }, 6, 5);
  assert.equal(c.jhMzSight(S, S.guard).length, 6, "玩家站在右邊馬腿：少兩個");
});

test("循足跡追：前 LAG 回合照巡法；之後朝 LAG 步以前的足跡跳、每跳一次都不會比原地更遠；足跡在原地時不亂跳", () => {
  const c = load(), LAG = vm.runInContext("JH_MZ_HORSE_LAG", c);
  const S = room(c, OPEN, { x: 1, y: 1, dx: 2, dy: 1 }, 9, 9);
  const d2 = (G, x, y) => (G.x - x) ** 2 + (G.y - y) ** 2;
  /* 玩家原地不動：足跡都在 (9,9)，野馬應該一路靠近，不會變遠 */
  let last = d2(S.guard, 9, 9);
  for (let i = 0; i < 8; i++) { c.jhMzGuardStep(S); const d = d2(S.guard, 9, 9); if (i >= LAG) assert.ok(d <= last, "第 " + i + " 回合沒有變遠：" + d + " ≤ " + last); last = d }
  assert.ok(last < 2 * 2 + 1 * 1 + 1, "最後跳到 (9,9) 附近：" + last);
  /* 足跡慢 LAG 步：玩家剛換位置，野馬追的還是舊的那一格 */
  const T = room(c, OPEN, { x: 1, y: 9, dx: 2, dy: -1 }, 9, 1);
  for (let i = 0; i < LAG + 1; i++) c.jhMzGuardStep(T);
  assert.deepEqual(JSON.parse(JSON.stringify(T.guard.tr[0])), [9, 1], "追的是 LAG 步以前的那一格");
});

test("蹩馬腿困住野馬：四面都被牆蹩住時原地不動", () => {
  const c = load(), rows = ["#####", "#...#", "##.##", "#...#", "#####"];
  const S = room(c, rows, { x: 2, y: 2 }, 1, 1);
  const before = [S.guard.x, S.guard.y]; for (let i = 0; i < 6; i++) c.jhMzGuardStep(S);
  assert.deepEqual([S.guard.x, S.guard.y], before, "日字四個馬腿方向都是牆，跳不出去");
});

function reach(c, S) { const lv = LV(c), seen = new Set(), q = []; const st = S.player; q.push([st.x, st.y]); seen.add(st.y * S.W + st.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx];
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; const k = ny * S.W + nx; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子；全部走得到；開局不會被抓、野馬站在走得到的格子", () => {
  const c = load(), lv = LV(c), M = lv.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const count = (ch) => M.join("").split(ch).length - 1;
  assert.equal(count("@"), 1); assert.equal(count("D"), 1); assert.equal(count("P"), 1); assert.equal(count(">"), 1); assert.equal(count("C"), 3);
  const S = c.jhMzNew("horse"), all = reach(c, S), pos = (ch) => { const o = []; M.forEach((r, y) => [...r].forEach((v, x) => v === ch && o.push(y * W + x))); return o };
  for (const ch of "PD>C") for (const k of pos(ch)) assert.ok(all.has(k), ch + " 走得到");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓"); for (const G of S.guards) assert.ok(!c.jhMzSolid(S, G.x, G.y));
});

test("走一趟：一定有一條不被野馬撞倒的路，先踩踏板、再走到石門前（狀態含野馬記的足跡）", () => {
  const c = load(), S = c.jhMzNew("horse");
  const clone = (T) => { const U = c.jhMzNew("horse"); U.guards.forEach((G, i) => { Object.assign(G, T.guards[i]); G.tr = (T.guards[i].tr || []).map((p) => p.slice()) }); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => G.x + ":" + G.y + ":" + G.dx + ":" + G.dy + ":" + JSON.stringify(G.tr || [])).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let step = 0; step < 300 && q.length && !door; step++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (r.ev === "trap" || r.ev === "wall" || r.ev === "locked" || r.ev === "spot") continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  assert.ok(door, "找得到一條不被看到的路：先踩踏板、再走到石門前");
  assert.ok(door.plate, "到石門時已經踩過踏板");
});

test("題庫：石門 3 題、陷阱至少 5 題；core.js 獨立重算——每步合法、走完將死、最後一步是馬、沒有更短的殺法；不跟中炮、過宮炮、仙人指路、屏風馬重複；都出自古譜", () => {
  const c = load(), P = vm.runInContext("JH_MZ_POOL_HORSE", c), others = [vm.runInContext("JH_MZ_POOL_CENTRAL", c), vm.runInContext("JH_MZ_POOL_SCREEN", c)];
  for (const f of ["07z9m-cross.js:JH_MZ_POOL_CROSS", "07z9m-pawn.js:JH_MZ_POOL_PAWN"]) { const [fn, nm] = f.split(":"), T = rd(fn), a = T.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = T.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`);
    assert.ok(a > 0 && b > a, f); const ctx = {}; vm.createContext(ctx); vm.runInContext(T.slice(a, b) + `;this.v=${nm};`, ctx); others.push(ctx.v) }
  assert.equal(P.door.length, 3); assert.ok(P.trap.length >= 5);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...P.door, ...P.trap];
  assert.equal(new Set(mine.map((x) => x.id)).size, mine.length);
  for (const x of mine) {
    assert.ok(!ids.has(x.id), "跟別派重複：" + x.id);
    assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, "N", x.id + " 最後一步是馬");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-horse.js：LF、沒有控制字元、沒有行內 // 註解；m.html 排在 07z9m-screen.js 後面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9m-screen.js"), b = H.indexOf("//#include m/07z9m-horse.js");
  assert.ok(a > 0 && b > a, "起馬門要排在屏風馬門後面（用它的 jhMzHorseCan）");
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
