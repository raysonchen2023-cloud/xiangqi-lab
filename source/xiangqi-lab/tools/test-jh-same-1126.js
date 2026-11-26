/* W87-2（11/26）順炮地底迷宮第一層「煮鹽廢灶」（m/07z9m-same.js）：鹽道暗哨一回合衝兩格、撞牆花一回合轉身、只看正前方；
   鹽灶走到旁邊會點亮、擋路擋視線；地圖走得完、有一條不被抓的路；題庫用 core.js 獨立重算。
   開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單「先把十派第一層補齊」。
   「改壞驗證」：同一組規則檢查拿去跑改壞的暗哨（中炮門那種一回合一格、撞牆當回合掉頭；或連背後都看得到），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const MZ = rd("07z9m-maze.js"), SRC = rd("07z9m-same.js");

function load() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/same_cannon" }) });
  vm.createContext(c); vm.runInContext(MZ, c); vm.runInContext(SRC, c);
  return c;
}
const LV = (c) => vm.runInContext("JH_MZ_LV", c).same_cannon;
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 一條 13 格長廊：第 2 列 x＝1～13 是地面，其他是牆；可以放鹽灶 */
const LANE = ["###############", "###############", "#.............#", "###############", "###############"];
function room(c, rows, G, px, py) { const S = c.jhMzNew("same_cannon"); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = [Object.assign({ kind: "dash", dx: 1, dy: 0 }, G)]; S.guard = S.guards[0]; at(S, px, py); return S }

/* 規則檢查：回傳不符合的地方（空陣列＝都符合）。同一組檢查也拿去跑改壞的暗哨（改壞驗證） */
function dashProblems(c) {
  const bad = [], R = vm.runInContext("JH_MZ_SAME_RANGE", c);
  let S = room(c, LANE, { x: 1, y: 2, dx: 1 }, 13, 0); c.jhMzGuardStep(S);
  if (S.guard.x !== 3) bad.push("空廊一回合要衝兩格（1→3），實際到 " + S.guard.x);
  S = room(c, LANE, { x: 12, y: 2, dx: 1 }, 1, 0); c.jhMzGuardStep(S);
  if (S.guard.x !== 13) bad.push("第二格是牆只走一格（12→13），實際到 " + S.guard.x);
  S = room(c, LANE, { x: 13, y: 2, dx: 1 }, 1, 0); c.jhMzGuardStep(S);
  if (S.guard.x !== 13 || S.guard.dx !== -1) bad.push("前面就是牆：這一回合只轉身、原地不動，實際 x=" + S.guard.x + " dx=" + S.guard.dx);
  c.jhMzGuardStep(S); if (S.guard.x !== 11) bad.push("轉身後下一回合往回衝兩格（13→11），實際到 " + S.guard.x);
  S = room(c, LANE, { x: 1, y: 2, dx: 1 }, 2, 2); S.player.y = 2; c.jhMzGuardStep(S);
  if (S.guard.x !== 2) bad.push("衝到玩家那一格就停、不越過玩家，實際到 " + S.guard.x);
  S = room(c, LANE, { x: 5, y: 2, dx: 1 }, 1, 0); const sg = c.jhMzSight(S, S.guard).map((q) => q.x);
  if (sg.some((x) => x < 5)) bad.push("背後看得到：" + sg.join(","));
  if (sg.length !== Math.min(R, 13 - 5)) bad.push("正前方要看到 min(" + R + ", 到牆) 格，實際 " + sg.length);
  return bad;
}

test("登記：順炮門有登記、路由 #/jianghu/maze/same_cannon；三個鹽道暗哨；不能跳；有鹽灶機關；門內頁有入口；三個寶箱", () => {
  const c = load(), lv = LV(c), sidOf = vm.runInContext("jhMzSidOf", c);
  assert.ok(lv); assert.equal(sidOf("#/jianghu/maze/same_cannon"), "same_cannon"); assert.equal(lv.key, "jhMaze_same_cannon");
  assert.equal(lv.guards.length, 3); for (const G of lv.guards) assert.equal(G.kind, "dash");
  assert.equal(lv.jump, ""); assert.equal(typeof lv.onStep, "function"); assert.ok(lv.solid.includes("Z") && lv.opaque.includes("Z"), "鹽灶擋路也擋視線");
  assert.ok(lv.hall && lv.hall.zh && lv.hall.en && lv.hall.at.length === 2); assert.equal(lv.rew.length, 3);
});

test("鹽道暗哨的規則都符合（衝兩格、第二格擋只走一格、撞牆花一回合轉身、衝到玩家就停、只看正前方 RANGE 格）", () => {
  assert.deepEqual(dashProblems(load()), []);
});

test("跟中炮門的暗匪不一樣：同一條空廊，暗哨一回合衝兩格、暗匪一格；撞牆時暗匪當回合就往回走、暗哨原地轉身", () => {
  const c = load();
  let S = room(c, LANE, { x: 1, y: 2, dx: 1 }, 13, 0), T = room(c, LANE, { kind: "rook", x: 1, y: 2, dx: 1 }, 13, 0);
  c.jhMzGuardStep(S); c.jhMzGuardStep(T); assert.equal(S.guard.x - 1, 2); assert.equal(T.guard.x - 1, 1);
  S = room(c, LANE, { x: 13, y: 2, dx: 1 }, 1, 0); T = room(c, LANE, { kind: "rook", x: 13, y: 2, dx: 1 }, 1, 0);
  c.jhMzGuardStep(S); c.jhMzGuardStep(T); assert.equal(S.guard.x, 13, "暗哨原地轉身"); assert.equal(T.guard.x, 12, "暗匪當回合就往回走");
});

test("改壞驗證：暗哨改成中炮門那種走法（一格、撞牆當回合掉頭），或連背後都看得到，規則檢查一定抓得到", () => {
  const c1 = load(); vm.runInContext("JH_MZ_KIND.dash.step=JH_MZ_KIND.rook.step", c1);
  const p1 = dashProblems(c1); assert.ok(p1.some((s) => s.includes("衝兩格")) && p1.some((s) => s.includes("轉身")), "改成暗匪走法要被抓到：" + p1.join("；"));
  const c2 = load(); vm.runInContext("{const f=JH_MZ_KIND.dash.sight;JH_MZ_KIND.dash.sight=(S,G)=>f(S,G).concat(f(S,Object.assign({},G,{dx:-(G.dx||0),dy:-(G.dy||0)})))}", c2);
  assert.ok(dashProblems(c2).some((s) => s.includes("背後")), "改成前後都看要被抓到");
  const c3 = load(); vm.runInContext("JH_MZ_KIND.dash.step=function(S,G){const d=G.dx||0;for(let i=0;i<2;i++){const nx=G.x+d;if(jhMzSolid(S,nx,G.y))break;G.x=nx}}", c3);
  assert.ok(dashProblems(c3).some((s) => s.includes("轉身")), "改成撞牆就卡住不轉身要被抓到");
  const c4 = load(); vm.runInContext("JH_MZ_KIND.dash.step=function(S,G){const d=G.dx||0;if(jhMzSolid(S,G.x+d,G.y)){G.dx=-d;return}for(let i=0;i<2;i++){const nx=G.x+d;if(jhMzSolid(S,nx,G.y))break;G.x=nx}}", c4);
  assert.ok(dashProblems(c4).some((s) => s.includes("不越過玩家")), "改成會越過玩家要被抓到");
});

test("視線：被鹽灶擋住就看不到後面；最遠 RANGE 格（長廊比 RANGE 長時看不到盡頭）", () => {
  const c = load(), R = vm.runInContext("JH_MZ_SAME_RANGE", c);
  let S = room(c, ["###############", "###############", "#....Z........#", "###############"], { x: 1, y: 2, dx: 1 }, 1, 0);
  assert.deepEqual(Array.from(c.jhMzSight(S, S.guard), (q) => q.x), [2, 3, 4], "鹽灶 (5,2) 擋住後面");   /* Array.from：vm 裡建的陣列原型不同，轉成這邊的陣列再比 */
  const long = ["#".repeat(25), "#" + ".".repeat(23) + "#", "#".repeat(25)];
  S = room(c, long, { x: 1, y: 1, dx: 1 }, 1, 0); assert.equal(c.jhMzSight(S, S.guard).length, R, "空廊只看 RANGE 格");
  assert.ok(R >= 5 && R <= 9, "RANGE 合理：" + R);
});

test("鹽灶：走到旁邊（上下左右）就點亮、記在 S.lit、之後一直亮；撞牆不算；鹽灶本身走不進去", () => {
  const c = load(), rows = ["#######", "#.....#", "#..Z..#", "#.....#", "#######"];
  const S = room(c, rows, { x: 5, y: 1, dx: 0, dy: 0, stun: 99 }, 1, 2); const k = 2 * S.W + 3;
  assert.ok(!S.lit.has(k));
  let r = c.jhMzStep(S, 0, -1); assert.equal(r.ev, "move"); assert.ok(!S.lit.has(k), "(1,1) 不在鹽灶旁邊");
  r = c.jhMzStep(S, 1, 0); assert.ok(!S.lit.has(k), "(2,1) 是斜角，不算旁邊");
  r = c.jhMzStep(S, 1, 0); assert.ok(S.lit.has(k), "走到 (3,1)＝鹽灶正上方，點亮");
  r = c.jhMzStep(S, 0, 1); assert.equal(r.ev, "wall", "鹽灶走不進去");
  r = c.jhMzStep(S, 1, 0); r = c.jhMzStep(S, 1, 0); assert.ok(S.lit.has(k), "離開之後還亮著");
  assert.ok(c.jhMzLight(S, 3, 3, 0) > 0, "照得到鹽灶下面那一格");
  const T = room(c, ["#####", "#.#Z#", "#####"], { x: 1, y: 1, stun: 99 }, 1, 1); c.jhMzStep(T, 1, 0); assert.ok(!T.lit.has(1 * T.W + 3), "撞牆（往牆走）不點亮");
});

function reach(c, S) { const lv = LV(c), seen = new Set(), q = []; const st = S.player; q.push([st.x, st.y]); seen.add(st.y * S.W + st.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx];
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; const k = ny * S.W + nx; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、至少兩座鹽灶；全部走得到；暗哨各自在一條直的長廊上、開局不會被抓", () => {
  const c = load(), lv = LV(c), M = lv.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const count = (ch) => M.join("").split(ch).length - 1;
  assert.equal(count("@"), 1); assert.equal(count("D"), 1); assert.equal(count("P"), 1); assert.equal(count(">"), 1); assert.equal(count("C"), 3); assert.ok(count("Z") >= 2);
  const S = c.jhMzNew("same_cannon"), all = reach(c, S), pos = (ch) => { const o = []; M.forEach((r, y) => [...r].forEach((v, x) => v === ch && o.push(y * W + x))); return o };
  for (const ch of "PD>C") for (const k of pos(ch)) assert.ok(all.has(k), ch + " 走得到");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
  for (const G of S.guards) { assert.ok(!c.jhMzSolid(S, G.x, G.y)); assert.equal(G.dy, 0, "暗哨在橫的長廊上");
    let n = 0; for (let x = 1; x < W - 1; x++) if (!c.jhMzSolid(S, x, G.y)) n++; assert.ok(n >= 11, "第 " + G.y + " 列是一條長廊（" + n + " 格）") }
});

test("走一趟：一定有一條不被暗哨逮到的路，先踩踏板、再走到石門前", () => {
  const c = load(), S = c.jhMzNew("same_cannon");
  const clone = (T) => { const U = c.jhMzNew("same_cannon"); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); U.lit = new Set(T.lit); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => G.x + ":" + G.y + ":" + G.dx).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let step = 0; step < 300 && q.length && !door; step++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (r.ev === "trap" || r.ev === "wall" || r.ev === "locked" || r.ev === "spot") continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  assert.ok(door, "找得到一條不被看到的路：先踩踏板、再走到石門前");
  assert.ok(door.plate, "到石門時已經踩過踏板");
});

test("會被抓：玩家站在長廊上、暗哨面向玩家又在 RANGE 內＝被看到（spot），下一回合還在就逮到（trap）", () => {
  const c = load(), S = room(c, LANE, { x: 1, y: 2, dx: 1 }, 6, 2);
  assert.ok(c.jhMzSight(S, S.guard).some((q) => q.x === 6), "看得到 5 格外的玩家");
  const r = c.jhMzStep(S, 0, 0); assert.ok(r.ev === "trap" || r.ev === "spot", "原地等就被逮或被發現：" + r.ev);
  let ev = r.ev; for (let i = 0; i < 3 && ev !== "trap"; i++) ev = c.jhMzStep(S, 0, 0).ev; assert.equal(ev, "trap", "一直站著不躲就被逮到");
});

test("題庫：石門 3 題（雙炮）、陷阱至少 5 題；core.js 獨立重算——每步合法、走完將死、最後一步是炮、沒有更短的殺法；不跟別派重複；都出自古譜", () => {
  const c = load(), P = vm.runInContext("JH_MZ_POOL_SAME", c), others = [vm.runInContext("JH_MZ_POOL_CENTRAL", c)];
  for (const f of ["07z9m-cross.js:JH_MZ_POOL_CROSS", "07z9m-pawn.js:JH_MZ_POOL_PAWN", "07z9m-screen.js:JH_MZ_POOL_SCREEN", "07z9m-horse.js:JH_MZ_POOL_HORSE"]) { const [fn, nm] = f.split(":"), T = rd(fn), a = T.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = T.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`);
    assert.ok(a > 0 && b > a, f); const ctx = {}; vm.createContext(ctx); vm.runInContext(T.slice(a, b) + `;this.v=${nm};`, ctx); others.push(ctx.v) }
  assert.equal(P.door.length, 3); assert.ok(P.trap.length >= 5);
  for (const x of P.door) assert.equal(x.fen.split(" ")[0].replace(/[^C]/g, "").length, 2, x.id + " 石門題要紅方雙炮（順炮）");
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...P.door, ...P.trap];
  assert.equal(new Set(mine.map((x) => x.id)).size, mine.length);
  for (const x of mine) {
    assert.ok(!ids.has(x.id), "跟別派重複：" + x.id);
    assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, "C", x.id + " 最後一步是炮");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-same.js：LF、沒有控制字元、沒有行內 // 註解；新的全域名稱都有 JH_MZ_SAME／jhMzSame 前綴；m.html 排在共用程式後面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_SAME|JH_MZ_POOL_SAME|jhMzSame)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9m-maze.js"), b = H.indexOf("//#include m/07z9m-same.js");
  assert.ok(a > 0 && b > a, "順炮門要排在共用程式後面");
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
