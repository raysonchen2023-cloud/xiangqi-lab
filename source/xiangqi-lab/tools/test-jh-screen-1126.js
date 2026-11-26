/* W87-2（11/26）屏風馬地底迷宮第一層「皇陵神道」（m/07z9m-screen.js）：馬型銅人的走法與蹩馬腿、地圖走得完、題庫用 core.js 獨立重算。
   開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單「先把十派第一層補齊」。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const MZ = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-maze.js"), "utf8");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-screen.js"), "utf8");

function load() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/screen" }) });
  vm.createContext(c); vm.runInContext(MZ, c); vm.runInContext(SRC, c);
  return c;
}
const LV = (c) => vm.runInContext("JH_MZ_LV", c).screen;
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const cells = (c, S, G) => JSON.parse(JSON.stringify(c.jhMzSight(S, G).map((q) => [q.x, q.y]))).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
/* 在乾淨的小房間裡測：銅人位置照 G，其他格子照 rows；玩家放在角落 (1,1) 以外不礙事的地方 */
function room(c, rows, G, px, py) { const S = c.jhMzNew("screen"); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = [Object.assign({ kind: "horse", dx: 1, dy: -2 }, G)]; S.guard = S.guards[0]; at(S, px == null ? 1 : px, py == null ? 1 : py); return S }
const OPEN = ["#########", "#.......#", "#.......#", "#.......#", "#.......#", "#.......#", "#.......#", "#.......#", "#########"];

test("登記：屏風馬門有登記、路由 #/jianghu/maze/screen；兩隻銅人都用馬的走法；石鼓擋路不擋光；不能跳；門內頁有入口", () => {
  const c = load(), lv = LV(c), sidOf = vm.runInContext("jhMzSidOf", c);
  assert.ok(lv); assert.equal(sidOf("#/jianghu/maze/screen"), "screen"); assert.equal(lv.key, "jhMaze_screen");
  assert.equal(lv.guards.length, 2); assert.ok(lv.guards.every((g) => g.kind === "horse"));
  assert.ok(lv.solid.includes("G") && !lv.opaque.includes("G"), "石鼓擋路、透光");
  assert.equal(lv.jump, "", "這一派不能跳");
  assert.ok(lv.hall && Array.isArray(lv.hall.at) && lv.hall.zh && lv.hall.en, "門內頁入口");
  assert.equal(lv.rew.length, 3);
});

test("馬的視線：空房間中間看得到八個日字落點；靠牆只剩房間裡的那幾個", () => {
  const c = load();
  let S = room(c, OPEN, { x: 4, y: 4 });
  assert.deepEqual(cells(c, S, S.guard), [[2, 3], [2, 5], [3, 2], [3, 6], [5, 2], [5, 6], [6, 3], [6, 5]], "八個日字落點");
  S = room(c, OPEN, { x: 1, y: 1 }, 7, 7);
  assert.deepEqual(cells(c, S, S.guard), [[2, 3], [3, 2]], "角落只有兩個方向跳得出去");
});

test("蹩馬腿：馬腿被石鼓擋住、或玩家站在馬腿上，那兩個方向都跳不過去、也看不到；落點是石鼓也不行", () => {
  const c = load();
  const rows = OPEN.slice(); rows[3] = "#...G...#";   /* 銅人 (4,4) 正上方 (4,3) 放石鼓＝往上跳的馬腿 */
  let S = room(c, rows, { x: 4, y: 4 });
  assert.deepEqual(cells(c, S, S.guard), [[2, 3], [2, 5], [3, 6], [5, 6], [6, 3], [6, 5]], "上方馬腿被石鼓蹩住：(3,2)、(5,2) 看不到");
  S = room(c, OPEN, { x: 4, y: 4 }, 5, 4);   /* 玩家站在右邊的馬腿 (5,4) */
  assert.deepEqual(cells(c, S, S.guard), [[2, 3], [2, 5], [3, 2], [3, 6], [5, 2], [5, 6]], "玩家站在右邊馬腿：(6,3)、(6,5) 看不到");
  const r2 = OPEN.slice(); r2[2] = "#..G....#";   /* 落點 (3,2) 是石鼓 */
  S = room(c, r2, { x: 4, y: 4 }, 7, 7);
  assert.ok(!cells(c, S, S.guard).some(([x, y]) => x === 3 && y === 2), "落點是石鼓不能跳");
  S = room(c, OPEN, { x: 4, y: 4 }); S.guard.stun = 2;
  assert.deepEqual(cells(c, S, S.guard), [], "暈的時候看不到");
});

test("馬的走法：照目前方向跳日字、跳不過去就順時針換方向；巡 60 回合都停在走得到的格子、不穿牆、不越廳；開局不會一開始就被抓", () => {
  const c = load(), S = c.jhMzNew("screen");
  for (const G of S.guards) assert.ok(!c.jhMzSolid(S, G.x, G.y), "銅人站在走得到的格子");
  const y0 = S.guards.map((G) => G.y);
  at(S, 13, 9);   /* 玩家先站到旁邊的小間，不擋銅人 */
  for (let i = 0; i < 60; i++) { c.jhMzGuardStep(S);
    S.guards.forEach((G, k) => { assert.ok(!c.jhMzSolid(S, G.x, G.y), "第 " + i + " 回合銅人 " + k + " 站在走得到的格子"); assert.ok(Math.abs(G.y - y0[k]) <= 4, "銅人 " + k + " 只在自己那一廳：" + G.y) }) }
  const T = c.jhMzNew("screen"); assert.ok(!c.jhMzCaught(T), "開局不會被抓");
});

/* 地圖：BFS（擋路照 lv.solid，石門走得過去） */
function reach(c, S) { const lv = LV(c), seen = new Set(), q = []; const st = S.player; q.push([st.x, st.y]); seen.add(st.y * S.W + st.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx];
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; const k = ny * S.W + nx; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子；全部走得到", () => {
  const c = load(), lv = LV(c), M = lv.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const count = (ch) => M.join("").split(ch).length - 1;
  assert.equal(count("@"), 1); assert.equal(count("D"), 1); assert.equal(count("P"), 1); assert.equal(count(">"), 1); assert.equal(count("C"), 3);
  const S = c.jhMzNew("screen"), all = reach(c, S), pos = (ch) => { const o = []; M.forEach((r, y) => [...r].forEach((v, x) => v === ch && o.push(y * W + x))); return o };
  for (const ch of "PD>C") for (const k of pos(ch)) assert.ok(all.has(k), ch + " 走得到：" + (k % W) + "," + ((k / W) | 0));
});

test("走一趟：一定有一條不被銅人逮到的路，先踩踏板、再走到石門前", () => {
  const c = load(), S = c.jhMzNew("screen");
  const clone = (T) => { const U = c.jhMzNew("screen"); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => G.x + ":" + G.y + ":" + G.dx + ":" + G.dy).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let step = 0; step < 400 && q.length && !door; step++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (r.ev === "trap" || r.ev === "wall" || r.ev === "locked" || r.ev === "spot") continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq }
  assert.ok(door, "找得到一條不被看到的路：先踩踏板、再走到石門前");
  assert.ok(door.plate, "到石門時已經踩過踏板");
});

test("題庫：石門 3 題、陷阱至少 5 題；core.js 獨立重算——主變每步合法、走完將死、最後一步是馬、最短就是這個步數；不跟中炮、過宮炮、仙人指路重複；都出自古譜", () => {
  const c = load(), P = vm.runInContext("JH_MZ_POOL_SCREEN", c), CEN = vm.runInContext("JH_MZ_POOL_CENTRAL", c);
  const others = [CEN];
  for (const f of ["07z9m-cross.js:JH_MZ_POOL_CROSS", "07z9m-pawn.js:JH_MZ_POOL_PAWN"]) { const [fn, nm] = f.split(":"), T = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", fn), "utf8"), a = T.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = T.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`);
    assert.ok(a > 0 && b > a, f); const ctx = {}; vm.createContext(ctx); vm.runInContext(T.slice(a, b) + `;this.v=${nm};`, ctx); others.push(ctx.v) }
  assert.equal(P.door.length, 3); assert.ok(P.trap.length >= 5);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...P.door, ...P.trap];
  assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "題目不重複");
  for (const x of mine) {
    assert.ok(!ids.has(x.id), "跟別派重複：" + x.id);
    assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, "N", x.id + " 最後一步是馬");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法（不是 " + (n - 1) + " 步殺）");
  }
});

test("〔原始碼〕07z9m-screen.js：LF、沒有控制字元、沒有行內 // 註解；m.html 登記在 07z9m-maze.js 後面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9m-maze.js"), b = H.indexOf("//#include m/07z9m-screen.js");
  assert.ok(a > 0 && b > a);
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"), "搖桿說法照 #195");
});
