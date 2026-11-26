/* W87-2（11/26）列炮地底迷宮第一層「戲台底閣」（m/07z9m-opp.js）：淨面戲軸照將帥走（只在九宮外圈一格一格走）、看緊鄰四格＋飛將（同一直行沒被擋就看得到、隔著水溝也看得到）；
   冷光柱點亮整條直行；水溝擋路不擋視線、戲箱擋路也擋視線；地圖走得完、有一條不被抓的路、兩個戲軸的步調差不會把路封死；題庫用 core.js 獨立重算。
   開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單「先把十派第一層補齊」。
   「改壞驗證」：同一組規則檢查拿去跑改壞的戲軸（拿掉飛將、穿過戲箱看、跑出九宮、斜著走），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const MZ = rd("07z9m-maze.js"), SRC = rd("07z9m-opp.js");

function load() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/opposite_cannon" }) });
  vm.createContext(c); vm.runInContext(MZ, c); vm.runInContext(SRC, c);
  return c;
}
const LV = (c) => vm.runInContext("JH_MZ_LV", c).opposite_cannon;
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const xs = (a) => Array.from(a, (q) => q.x + "," + q.y).sort();   /* Array.from：vm 裡建的陣列原型不同，轉成這邊的陣列再比 */
/* 一間 11×13 的房間：九宮在 (4,4)～(6,6)；第 9 列是水溝（中間 x＝5 是水），第 2 列 x＝5 放戲箱可以換 */
function roomRows(box) { const r = []; for (let y = 0; y < 13; y++) { if (y === 0 || y === 12) { r.push("#".repeat(11)); continue } let row = "#" + ".".repeat(9) + "#"; if (y === 9) row = "####~~~####"; if (y === 2 && box) row = "#....X....#"; r.push(row) } return r }
function room(c, rows, G, px, py) { const S = c.jhMzNew("opposite_cannon"); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = [Object.assign({ kind: "king", pal: [4, 4], i: 0, x: 4, y: 4 }, G)]; S.guard = S.guards[0]; at(S, px, py); return S }

/* 規則檢查：回傳不符合的地方（空陣列＝都符合）。同一組檢查也拿去跑改壞的戲軸（改壞驗證） */
function kingProblems(c) {
  const bad = [], RING = vm.runInContext("JH_MZ_OPP_RING", c);
  /* 九宮中間上方那一格 (5,4) 的戲軸：同一欄往上看到第 1 列、往下看到水溝對岸第 11 列 */
  let S = room(c, roomRows(false), { i: 1, x: 5, y: 4 }, 1, 1), sg = new Set(xs(c.jhMzSight(S, S.guard)));
  for (const k of ["6,4", "4,4", "5,3", "5,5"]) if (!sg.has(k)) bad.push("緊鄰四格要看得到：少了 " + k);
  if (!sg.has("5,1")) bad.push("飛將：同一欄往上很遠也看得到（5,1）");
  if (!sg.has("5,11")) bad.push("飛將：隔著水溝也看得到對岸（5,11）");
  if (sg.has("6,5") || sg.has("4,5") || sg.has("6,3")) bad.push("斜角不該看得到");
  if (sg.has("7,4") || sg.has("3,4")) bad.push("橫的方向只看緊鄰一格，不飛");
  S = room(c, roomRows(true), { i: 1, x: 5, y: 4 }, 1, 1); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (sg.has("5,1")) bad.push("戲箱擋住：箱子後面（5,1）不該看得到");
  /* 繞九宮外圈：八步回到原位、每一步都是直線一格、永遠在九宮裡 */
  S = room(c, roomRows(false), { i: 0, x: 4, y: 4 }, 1, 11); const seen = [];
  for (let k = 0; k < 8; k++) { const ox = S.guard.x, oy = S.guard.y; c.jhMzGuardStep(S); const d = Math.abs(S.guard.x - ox) + Math.abs(S.guard.y - oy);
    if (d !== 1) bad.push("一回合要走直線一格，實際 " + ox + "," + oy + "→" + S.guard.x + "," + S.guard.y);
    if (S.guard.x < 4 || S.guard.x > 6 || S.guard.y < 4 || S.guard.y > 6) bad.push("跑出九宮：" + S.guard.x + "," + S.guard.y);
    seen.push(S.guard.x + "," + S.guard.y) }
  if (!(S.guard.x === 4 && S.guard.y === 4)) bad.push("八步要繞回原位");
  if (new Set(seen).size !== RING.length) bad.push("外圈八格都要走到");
  return bad;
}

test("登記：列炮門有登記、路由 #/jianghu/maze/opposite_cannon；兩個淨面戲軸；不能跳；有冷光柱機關；門內頁有入口；三個寶箱", () => {
  const c = load(), lv = LV(c), sidOf = vm.runInContext("jhMzSidOf", c);
  assert.ok(lv); assert.equal(sidOf("#/jianghu/maze/opposite_cannon"), "opposite_cannon"); assert.equal(lv.key, "jhMaze_opposite_cannon");
  assert.equal(lv.guards.length, 2); for (const G of lv.guards) assert.equal(G.kind, "king");
  assert.equal(lv.jump, ""); assert.equal(typeof lv.onStep, "function");
  assert.ok(lv.solid.includes("X") && lv.opaque.includes("X"), "戲箱擋路也擋視線"); assert.ok(lv.solid.includes("~") && !lv.opaque.includes("~"), "水溝擋路、不擋視線");
  assert.ok(lv.hall && lv.hall.zh && lv.hall.en && lv.hall.at.length === 2); assert.equal(lv.rew.length, 3);
});

test("淨面戲軸的規則都符合（緊鄰四格、飛將看整欄、隔水溝也看得到、戲箱擋住、橫的不飛、繞九宮外圈一格一格走）", () => {
  assert.deepEqual(kingProblems(load()), []);
});

test("改壞驗證：拿掉飛將、穿過戲箱看、跑出九宮、斜著走，規則檢查一定抓得到", () => {
  const c1 = load(); vm.runInContext("JH_MZ_KIND.king.sight=function(S,G){const o=[];for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const x=G.x+dx,y=G.y+dy;if(!jhMzSolid(S,x,y))o.push({x,y})}return o}", c1);
  assert.ok(kingProblems(c1).some((s) => s.includes("飛將")), "拿掉飛將要被抓到");
  const c2 = load(); vm.runInContext("{const f=JH_MZ_KIND.king.sight;JH_MZ_KIND.king.sight=function(S,G){const o=f(S,G);for(let y=G.y-1;y>0;y--)o.push({x:G.x,y});return o}}", c2);
  assert.ok(kingProblems(c2).some((s) => s.includes("戲箱擋住")), "穿過戲箱看要被抓到");
  const c3 = load(); vm.runInContext("JH_MZ_KIND.king.step=function(S,G){if(!jhMzSolid(S,G.x,G.y-1))G.y--}", c3);
  assert.ok(kingProblems(c3).some((s) => s.includes("跑出九宮") || s.includes("繞回原位")), "一直往上走跑出九宮要被抓到");
  const c4 = load(); vm.runInContext("JH_MZ_KIND.king.step=function(S,G){G.x+=1;G.y+=1}", c4);
  assert.ok(kingProblems(c4).some((s) => s.includes("直線一格")), "斜著走要被抓到");
});

test("冷光柱：走進光柱那一格，整條直行（上下到被擋光的東西為止）都看得到，越過水溝；撞牆不算；走到別的地面不會", () => {
  const c = load(), rows = roomRows(true).map((r, y) => (y === 7 ? "#....M....#" : r));
  const S = room(c, rows, { stun: 99 }, 4, 7); S.seen = new Set();
  let r = c.jhMzStep(S, 0, -1); assert.equal(S.seen.has(1 * S.W + 4), false, "(4,6) 不是光柱");
  at(S, 4, 7); r = c.jhMzStep(S, 1, 0); assert.equal(r.ev, "move");
  for (const y of [3, 4, 5, 6, 7, 8, 9, 10, 11]) assert.ok(S.seen.has(y * S.W + 5), "光柱整欄看得到：5," + y);
  assert.ok(!S.seen.has(1 * S.W + 5), "戲箱 (5,2) 後面的 (5,1) 看不到");
  const T = room(c, ["#####", "#.#M#", "#####"], { stun: 99 }, 1, 1); T.seen = new Set(); c.jhMzStep(T, 1, 0); assert.equal(T.seen.size, 0, "往牆走不點亮");
});

test("會被抓：站在戲軸同一欄、中間沒有戲箱，隔很遠也會被發現；躲到戲箱後面就沒事", () => {
  const c = load();
  let S = room(c, roomRows(false), { i: 1, x: 5, y: 4 }, 5, 11);
  assert.ok(c.jhMzSight(S, S.guard).some((q) => q.x === 5 && q.y === 11), "隔著水溝看到 (5,11)");
  S = room(c, roomRows(false), { i: 1, x: 5, y: 4 }, 5, 11);
  let ev = c.jhMzStep(S, 0, 0).ev; assert.ok(ev === "trap" || ev === "spot", "站在同一欄原地等一回合，會被看到：" + ev);
  for (let k = 0; k < 3 && ev !== "trap"; k++) ev = c.jhMzStep(S, 0, 0).ev; assert.equal(ev, "trap", "一直站在線上就被逮到");
  S = room(c, roomRows(true), { i: 1, x: 5, y: 4 }, 5, 1);
  assert.ok(!c.jhMzCaught(S), "戲箱 (5,2) 擋住，(5,1) 不會被抓");
});

function reach(c, S) { const lv = LV(c), seen = new Set(), q = []; const st = S.player; q.push([st.x, st.y]); seen.add(st.y * S.W + st.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx];
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; const k = ny * S.W + nx; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、光柱、水溝、戲箱都有；全部走得到；兩個戲軸各在一個 3×3 九宮、開局不會被抓", () => {
  const c = load(), lv = LV(c), M = lv.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const count = (ch) => M.join("").split(ch).length - 1;
  assert.equal(count("@"), 1); assert.equal(count("D"), 1); assert.equal(count("P"), 1); assert.equal(count(">"), 1); assert.equal(count("C"), 3);
  assert.ok(count("M") >= 2 && count("~") >= 1 && count("X") >= 4);
  const S = c.jhMzNew("opposite_cannon"), all = reach(c, S), pos = (ch) => { const o = []; M.forEach((r, y) => [...r].forEach((v, x) => v === ch && o.push(y * W + x))); return o };
  for (const ch of "PD>C") for (const k of pos(ch)) assert.ok(all.has(k), ch + " 走得到");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
  for (const G of S.guards) for (let y = G.pal[1]; y < G.pal[1] + 3; y++) for (let x = G.pal[0]; x < G.pal[0] + 3; x++) assert.ok(!c.jhMzSolid(S, x, y), "九宮每一格都是地面：" + x + "," + y);
  const ys = S.guards.map((G) => G.pal[1]), riv = M.findIndex((r) => r.includes("~"));
  assert.ok(ys.some((y) => y < riv) && ys.some((y) => y > riv), "水溝兩邊各一個戲軸");
  /* 冷光柱要看得到對岸：每個光柱那一欄，水溝那一列是水（不是牆）；實際走進去，對岸那一半也進了 seen */
  for (const k of pos("M")) { const x = k % W, y = (k / W) | 0; assert.equal(M[riv][x], "~", "光柱 (" + x + "," + y + ") 那一欄的水溝是水");
    const T = c.jhMzNew("opposite_cannon"); for (const G of T.guards) G.stun = 99; T.seen = new Set(); const dx = M[y][x - 1] !== "#" ? -1 : 1; at(T, x + dx, y); c.jhMzStep(T, -dx, 0);
    const other = y < riv ? riv + 1 : riv - 1; assert.ok(T.seen.has(other * W + x), "走進光柱 (" + x + "," + y + ")，對岸 (" + x + "," + other + ") 看得到") }
});

const safeWalk = (c, S) => { const clone = (T) => { const U = c.jhMzNew("opposite_cannon"); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => G.i + ":" + (G.stun || 0)).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let step = 0; step < 300 && q.length && !door; step++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (r.ev === "trap" || r.ev === "wall" || r.ev === "locked" || r.ev === "spot") continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  return door };
test("走一趟：一定有一條不被戲軸看到的路，先踩踏板、再走到石門前；兩個戲軸的步調差換成 7（被抓解題、其中一個停 4 回合後）也走得過", () => {
  const c = load(), RING = vm.runInContext("JH_MZ_OPP_RING", c);
  let S = c.jhMzNew("opposite_cannon"), door = safeWalk(c, S);
  assert.ok(door && door.plate, "原本的步調：先踩踏板、再走到石門前");
  const d0 = ((S.guards[1].i - S.guards[0].i) % 8 + 8) % 8; assert.equal(d0, 3, "步調差 3");
  S = c.jhMzNew("opposite_cannon"); const G = S.guards[1], i = (G.i + 4) % 8; G.i = i; G.x = G.pal[0] + RING[i][0]; G.y = G.pal[1] + RING[i][1];
  door = safeWalk(c, S); assert.ok(door && door.plate, "步調差 7 也走得過");
});

test("題庫：石門 3 題（炮收尾、紅方雙炮優先）、陷阱至少 5 題；core.js 獨立重算——每步合法、走完將死、最後一步是對的子、沒有更短的殺法；不跟別派重複、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_OPP", c), T = vm.runInContext("JH_MZ_POOL_OPP_TRAP", c), others = [vm.runInContext("JH_MZ_POOL_CENTRAL", c)];
  for (const f of ["07z9m-cross.js:JH_MZ_POOL_CROSS", "07z9m-pawn.js:JH_MZ_POOL_PAWN", "07z9m-screen.js:JH_MZ_POOL_SCREEN", "07z9m-horse.js:JH_MZ_POOL_HORSE", "07z9m-same.js:JH_MZ_POOL_SAME"]) { const [fn, nm] = f.split(":"), X = rd(fn), a = X.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = X.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`);
    assert.ok(a > 0 && b > a, f); const ctx = {}; vm.createContext(ctx); vm.runInContext(X.slice(a, b) + `;this.v=${nm};`, ctx); others.push(ctx.v) }
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const lv = LV(c); assert.equal(lv.pool.door.length, 3); assert.equal(lv.pool.trap.length, T.trap.length, "登記的題庫：石門取 OPP、陷阱取 OPP_TRAP");
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  const want = (x) => (D.door.includes(x) ? "C" : "R");
  for (const x of mine) {
    assert.ok(!ids.has(x.id), "跟別派重複：" + x.id);
    assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, want(x), x.id + " 最後一步是 " + want(x));
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-opp.js：LF、沒有控制字元、沒有行內 // 註解；新的全域名稱都有 JH_MZ_OPP／jhMzOpp 前綴；m.html 排在共用程式後面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_OPP|JH_MZ_POOL_OPP|jhMzOpp)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9m-maze.js"), b = H.indexOf("//#include m/07z9m-opp.js");
  assert.ok(a > 0 && b > a, "列炮門要排在共用程式後面");
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
