/* W87（11/24）過宮炮地底迷宮第一層「焙紙暗房」（m/07z9m-cross.js）：炮型護院的視線、地圖走得完、題庫用 core.js 獨立重算。
   開發者 11/24 選單：九派先做三派＋中炮門重改；回味感：「更容易迷路的地圖（岔路、死路、暗門）、撿得到碑刻文書」。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const MZ = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-maze.js"), "utf8");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-cross.js"), "utf8");

function load() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/cross_palace" }) });
  vm.createContext(c); vm.runInContext(MZ, c); vm.runInContext(SRC, c);
  return c;
}
const LV = (c) => vm.runInContext("JH_MZ_LV", c).cross_palace;
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const cells = (c, S, G) => JSON.parse(JSON.stringify(c.jhMzSight(S, G).map((q) => [q.x, q.y]))).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
/* 在乾淨的小房間裡測視線：護院在 (1,1)，其他格子照 rows */
function room(c, rows, G) { const S = c.jhMzNew("cross_palace"); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = [Object.assign({ kind: "cannon", dx: 1, dy: 0 }, G)]; S.guard = S.guards[0]; return S }

test("登記：過宮炮門有登記、路由 #/jianghu/maze/cross_palace；護院用炮的走法；宣紙架擋路不擋光、碑刻和暗門擋路也擋光", () => {
  const c = load(), lv = LV(c), sidOf = vm.runInContext("jhMzSidOf", c);
  assert.ok(lv); assert.equal(sidOf("#/jianghu/maze/cross_palace"), "cross_palace"); assert.equal(lv.key, "jhMaze_cross_palace");
  assert.ok(lv.guards.length >= 2 && lv.guards.every((g) => g.kind === "cannon"));
  assert.ok(lv.solid.includes("Z") && !lv.opaque.includes("Z"), "紙架擋路、透光");
  for (const ch of "LH") assert.ok(lv.solid.includes(ch) && lv.opaque.includes(ch), ch + " 擋路也擋光");
  assert.equal(lv.jump, "", "這一派不能跳");
  assert.deepEqual(JSON.parse(JSON.stringify(lv.tex)), { floor: "data/maze/tex/cross_palace_floor.webp", side: "data/maze/tex/cross_palace_wall.webp" }, "像素材質路徑");
});

test("炮的視線：中間剛好隔一座紙架才看得到；中間空的看不到；隔兩座看不到；紙架後最多 3 格；牆擋住就停；四個方向都算", () => {
  const c = load();
  let S = room(c, ["##########", "#G.......#", "##########"], { x: 1, y: 1 });
  assert.deepEqual(cells(c, S, S.guard), [], "一整排空的：看不到");
  S = room(c, ["##########", "#G..Z....#", "##########"], { x: 1, y: 1 });
  assert.deepEqual(cells(c, S, S.guard), [[5, 1], [6, 1], [7, 1]], "隔一座紙架：紙架後 3 格");
  S = room(c, ["##########", "#G..Z.Z..#", "##########"], { x: 1, y: 1 });
  assert.deepEqual(cells(c, S, S.guard), [[5, 1]], "第二座紙架擋住，後面看不到");
  S = room(c, ["##########", "#G.Z#....#", "##########"], { x: 1, y: 1 });
  assert.deepEqual(cells(c, S, S.guard), [], "紙架後面緊接著牆");
  S = room(c, ["############", "#G......Z..#", "############"], { x: 1, y: 1 });
  assert.deepEqual(cells(c, S, S.guard), [], "紙架離護院 7 格（超過 6）：看不到");
  S = room(c, ["#####", "#...#", "#.Z.#", "#.G.#", "#.Z.#", "#...#", "#...#", "#####"], { x: 2, y: 3 });
  assert.deepEqual(cells(c, S, S.guard), [[2, 1], [2, 5], [2, 6]], "上下兩個方向都算");
  S = room(c, ["##########", "#G..L.Z..#", "##########"], { x: 1, y: 1 });
  assert.deepEqual(cells(c, S, S.guard), [], "碑刻在紙架前面擋住");
  S = room(c, ["##########", "#G..Z....#", "##########"], { x: 1, y: 1 }); S.guard.stun = 2;
  assert.deepEqual(cells(c, S, S.guard), [], "暈的時候看不到");
});

test("炮的走法：沿直線來回巡、碰到紙架或牆就掉頭（跟車一樣）；開局不會一開始就被抓", () => {
  const c = load(), S = c.jhMzNew("cross_palace");
  for (const G of S.guards) assert.ok(!c.jhMzSolid(S, G.x, G.y), "護院站在走得到的格子");
  const A = S.guards[1]; for (let i = 0; i < 30; i++) { c.jhMzGuardStep(S); assert.equal(A.y, 14); assert.ok(A.x >= 1 && A.x <= 6, "左段護院只在中間那座紙架左邊來回：" + A.x) }
  const T = c.jhMzNew("cross_palace"); assert.ok(!c.jhMzCaught(T), "開局不會被抓");
});

/* 地圖：BFS（擋路照 lv.solid，石門走得過去、暗門 H 可以選擇當打開） */
function reach(c, S, openH) { const lv = LV(c), seen = new Set(), q = []; const st = S.player; q.push([st.x, st.y]); seen.add(st.y * S.W + st.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx];
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D" && !(openH && ch === "H")) continue; const k = ny * S.W + nx; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、三件碑刻 L、一道暗門 H；全部走得到（藏寶室要開暗門），沒開暗門也走得完（踏板、石門、樓梯）", () => {
  const c = load(), lv = LV(c), M = lv.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const count = (ch) => M.join("").split(ch).length - 1;
  assert.equal(count("@"), 1); assert.equal(count("D"), 1); assert.equal(count("P"), 1); assert.equal(count(">"), 1);
  assert.equal(count("C"), 3); assert.equal(count("L"), 3); assert.equal(count("H"), 1);
  const S = c.jhMzNew("cross_palace"), all = reach(c, S, true), noH = reach(c, S, false), pos = (ch) => { const o = []; M.forEach((r, y) => [...r].forEach((v, x) => v === ch && o.push(y * W + x))); return o };
  for (const ch of "PD>C") for (const k of pos(ch)) assert.ok(all.has(k), ch + " 走得到：" + (k % W) + "," + ((k / W) | 0));
  for (const ch of "PD>") for (const k of pos(ch)) assert.ok(noH.has(k), "沒開暗門也走得到 " + ch);
  assert.equal(pos("C").filter((k) => !noH.has(k)).length, 1, "只有一箱藏在暗門後面");
  /* 碑刻要站得到旁邊（撞得到） */
  for (const k of pos("L")) { const x = k % W, y = (k / W) | 0; assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => all.has((y + dy) * W + x + dx)), "碑刻旁邊站得到：" + x + "," + y) }
  /* 死路：走得到、只有一個鄰格走得到的格子（迷路感），至少 6 處 */
  let dead = 0; for (const k of all) { const x = k % W, y = (k / W) | 0, ch = M[y][x]; if (ch !== "." && ch !== "C" && ch !== "T") continue; if ([[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => all.has((y + dy) * W + x + dx)).length === 1) dead++ }
  assert.ok(dead >= 6, "死路至少 6 處：" + dead);
});

test("走一趟：照路線從入口走到踏板、石門前，躲過護院（等它走開再過），踩到踏板、碰得到石門", () => {
  const c = load(), S = c.jhMzNew("cross_palace");
  /* 用 BFS 加上「每一步都不被抓」的搜尋（狀態＝玩家位置＋回合數取模，護院走法固定），確認真的有一條不被抓的路走到踏板再到石門 */
  const lv = LV(c), W = S.W, clone = (T) => { const U = c.jhMzNew("cross_palace"); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => G.x + ":" + G.y + ":" + G.dx).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let step = 0; step < 400 && q.length && !door; step++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (r.ev === "trap" || r.ev === "wall" || r.ev === "locked" || r.ev === "spot") continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq }
  assert.ok(door, "找得到一條不被看到的路：先踩踏板、再走到石門前");
  assert.ok(door.plate, "到石門時已經踩過踏板");
});

test("題庫：石門 3 題、陷阱至少 5 題；core.js 獨立重算——主變每步合法、走完將死、最後一步是炮、最短就是這個步數；沒有跟中炮門重複；題目都出自古譜並記出處", () => {
  const c = load(), P = vm.runInContext("JH_MZ_POOL_CROSS", c), CEN = vm.runInContext("JH_MZ_POOL_CENTRAL", c);
  assert.equal(P.door.length, 3); assert.ok(P.trap.length >= 5);
  const ids = new Set([...CEN.door, ...CEN.trap].map((x) => x.id)), mine = [...P.door, ...P.trap];
  assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "題目不重複");
  for (const x of mine) {
    assert.ok(!ids.has(x.id), "跟中炮門重複：" + x.id);
    assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, "C", x.id + " 最後一步是炮");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法（不是 " + (n - 1) + " 步殺）");
  }
});

test("〔原始碼〕07z9m-cross.js：LF、沒有控制字元、沒有行內 // 註解；m.html 登記在 07z9m-maze.js 後面", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9m-maze.js"), b = H.indexOf("//#include m/07z9m-cross.js");
  assert.ok(a > 0 && b > a);
});
