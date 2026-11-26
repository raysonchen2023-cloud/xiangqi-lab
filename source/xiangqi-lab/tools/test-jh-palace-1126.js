/* W87-2（11/26）反宮馬地底迷宮第一層「藏版墨窟」（m/07z9m-palace.js）：墨工傀儡照馬走日字、「反宮」——挑落點離自己工坊中心最遠的（不跳出工坊、不跳回上一格、不踩墨池）；
   看得到的是下一步跳得到的日字落點（蹩馬腿、玩家站馬腿、落點是墨池都看不到）；廢墨池走得過去、擋光；地圖走得完、有一條不被抓的路、任一個傀儡慢幾回合也走得過；兩段題庫用 core.js 獨立重算。
   開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單「先把十派第一層補齊」。
   「改壞驗證」：同一組規則檢查拿去跑改壞的傀儡（不蹩馬腿、看得到墨池裡、往中心跳、跳出工坊、踩墨池、直走一格），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-palace.js");

function load() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/palace_horse" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-screen.js", "07z9m-palace.js"]) vm.runInContext(rd(f), c);
  return c;
}
const LV = (c) => vm.runInContext("JH_MZ_LV", c).palace_horse;
const DIR = (c) => Array.from(vm.runInContext("JH_MZ_HORSE_DIR", c), (d) => Array.from(d));
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const xs = (a) => Array.from(a, (q) => q.x + "," + q.y).sort();   /* Array.from：vm 裡建的陣列原型不同，轉成這邊的陣列再比 */
/* 一間 11×11 的房間；傀儡的工坊是 (2,2)～(8,8)，中心 (5,5)；marks＝{"x,y":字元} 改幾格 */
function roomRows(marks) { const r = []; for (let y = 0; y < 11; y++) { const row = (y === 0 || y === 10 ? "#".repeat(11) : "#" + ".".repeat(9) + "#").split(""); for (const k in marks || {}) { const [x, yy] = k.split(",").map(Number); if (yy === y) row[x] = marks[k] } r.push(row.join("")) } return r }
function room(c, rows, G, px, py) { const S = c.jhMzNew("palace_horse"); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length;
  S.guards = [Object.assign({ kind: "inkpuppet", zone: [2, 2, 8, 8], x: 5, y: 5 }, G)]; S.guard = S.guards[0]; at(S, px, py); return S }

/* 規則檢查：回傳不符合的地方（空陣列＝都符合）。同一組檢查也拿去跑改壞的傀儡（改壞驗證） */
function puppetProblems(c) {
  const bad = [], D = DIR(c);
  /* 空房間中心：八個日字落點都看得到，而且只看得到這八個 */
  let S = room(c, roomRows(), {}, 1, 1), sg = xs(c.jhMzSight(S, S.guard));
  const all8 = D.map(([a, b]) => 5 + a + "," + (5 + b)).sort();
  if (JSON.stringify(sg) !== JSON.stringify(all8)) bad.push("空房間中心要剛好看得到八個日字落點：實際 " + sg.join(" "));
  /* 蹩馬腿：(5,4) 是木架，往上跳的兩個方向 (4,3)、(6,3) 看不到 */
  S = room(c, roomRows({ "5,4": "#" }), {}, 1, 1); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (sg.has("4,3") || sg.has("6,3")) bad.push("蹩馬腿：馬腿被木架擋住，那兩個落點不該看得到");
  if (!sg.has("7,4")) bad.push("蹩馬腿只擋那兩個方向：(7,4) 要看得到");
  /* 玩家站在馬腿上：(6,5) 是往右跳的馬腿，(7,4)、(7,6) 看不到 */
  S = room(c, roomRows(), {}, 6, 5); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (sg.has("7,4") || sg.has("7,6")) bad.push("玩家站在馬腿上：那兩個落點不該看得到");
  /* 墨池：落點 (7,6) 是墨池就看不到，站在墨池裡不會被抓 */
  S = room(c, roomRows({ "7,6": "K" }), {}, 7, 6); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (sg.has("7,6")) bad.push("墨池：泡在墨池裡的人看不到");
  if (c.jhMzCaught(S)) bad.push("墨池：站進墨池不會被抓");
  /* 反宮：從中心跳，落點要離中心最遠（八個一樣遠＝照順序第一個）；從 (6,3) 跳，要挑可跳落點裡最遠的 */
  S = room(c, roomRows(), { x: 6, y: 3 }, 1, 1); c.jhMzGuardStep(S);
  { const cand = D.map(([a, b]) => [6 + a, 3 + b]).filter(([x, y]) => x >= 2 && x <= 8 && y >= 2 && y <= 8), far = Math.max(...cand.map(([x, y]) => (x - 5) ** 2 + (y - 5) ** 2));
    const d = (S.guard.x - 5) ** 2 + (S.guard.y - 5) ** 2; if (d !== far) bad.push("反宮：要跳到離工坊中心最遠的落點，實際跳到 " + S.guard.x + "," + S.guard.y) }
  /* 跳二十步：每一步都是日字、永遠在工坊裡、不踩墨池、不馬上跳回上一格 */
  S = room(c, roomRows({ "8,7": "K", "2,3": "K" }), {}, 1, 9); const hist = [[5, 5]];
  for (let k = 0; k < 20; k++) { const ox = S.guard.x, oy = S.guard.y; c.jhMzGuardStep(S); const dx = Math.abs(S.guard.x - ox), dy = Math.abs(S.guard.y - oy);
    if (!((dx === 1 && dy === 2) || (dx === 2 && dy === 1))) bad.push("一回合要跳一個日字，實際 " + ox + "," + oy + "→" + S.guard.x + "," + S.guard.y);
    if (S.guard.x < 2 || S.guard.x > 8 || S.guard.y < 2 || S.guard.y > 8) bad.push("跳出工坊：" + S.guard.x + "," + S.guard.y);
    if (S.grid[S.guard.y][S.guard.x] === "K") bad.push("踩進墨池：" + S.guard.x + "," + S.guard.y);
    const pp = hist[hist.length - 2]; if (pp && pp[0] === S.guard.x && pp[1] === S.guard.y) bad.push("馬上跳回上一格：" + S.guard.x + "," + S.guard.y);
    hist.push([S.guard.x, S.guard.y]) }
  return bad;
}

test("登記：反宮馬門有登記、路由 #/jianghu/maze/palace_horse；兩個墨工傀儡各管一片工坊；不能跳；墨池走得過去、擋光；門內頁有入口；三個寶箱", () => {
  const c = load(), lv = LV(c), sidOf = vm.runInContext("jhMzSidOf", c);
  assert.ok(lv); assert.equal(sidOf("#/jianghu/maze/palace_horse"), "palace_horse"); assert.equal(lv.key, "jhMaze_palace_horse");
  assert.equal(lv.guards.length, 2); for (const G of lv.guards) { assert.equal(G.kind, "inkpuppet"); assert.equal(G.zone.length, 4) }
  assert.equal(lv.jump, "");
  assert.ok(!lv.solid.includes("K") && lv.opaque.includes("K"), "墨池：走得過去、擋光");
  assert.ok(lv.hall && lv.hall.zh && lv.hall.en && lv.hall.at.length === 2); assert.equal(lv.rew.length, 3);
});

test("墨工傀儡的規則都符合（八個日字落點、蹩馬腿、玩家站馬腿、墨池裡看不到也抓不到、反宮挑最遠的落點、只跳日字、不出工坊、不踩墨池、不馬上跳回去）", () => {
  assert.deepEqual(puppetProblems(load()), []);
});

test("改壞驗證：不蹩馬腿、看得到墨池裡、往中心跳、跳出工坊、踩墨池、直走一格，規則檢查一定抓得到", () => {
  const bad = (code) => { const c = load(); vm.runInContext(code, c); return puppetProblems(c) };
  assert.ok(bad("JH_MZ_KIND.inkpuppet.sight=function(S,G){const o=[];for(const[dx,dy]of JH_MZ_HORSE_DIR){const x=G.x+dx,y=G.y+dy;if(jhMzCell(S,x,y)==='K')continue;if(!jhMzSolid(S,x,y))o.push({x,y})}return o}").some((s) => s.includes("蹩馬腿") || s.includes("馬腿上")), "不蹩馬腿要被抓到");
  assert.ok(bad("JH_MZ_KIND.inkpuppet.sight=function(S,G){const o=[];for(const[dx,dy]of JH_MZ_HORSE_DIR)if(jhMzHorseCan(S,G.x,G.y,dx,dy,null))o.push({x:G.x+dx,y:G.y+dy});return o}").some((s) => s.includes("墨池")), "看得到墨池裡要被抓到");
  assert.ok(bad("JH_MZ_KIND.inkpuppet.step=function(S,G){const[cx,cy]=jhMzPalaceMid(G);let b=null,bd=1e9;for(const[dx,dy]of JH_MZ_HORSE_DIR){if(!jhMzPalaceCan(S,G,dx,dy))continue;const nx=G.x+dx,ny=G.y+dy;if(nx===G.px&&ny===G.py)continue;const d=(nx-cx)**2+(ny-cy)**2;if(d<bd){bd=d;b=[dx,dy]}}if(!b)return;G.px=G.x;G.py=G.y;G.x+=b[0];G.y+=b[1]}").some((s) => s.includes("反宮")), "往中心跳要被抓到");
  assert.ok(bad("{const f=jhMzPalaceCan;jhMzPalaceCan=function(S,G,dx,dy){return jhMzHorseCan(S,G.x,G.y,dx,dy,null)&&jhMzCell(S,G.x+dx,G.y+dy)!=='K'}}").some((s) => s.includes("跳出工坊") || s.includes("反宮")), "跳出工坊要被抓到");
  assert.ok(bad("{jhMzPalaceCan=function(S,G,dx,dy){const Z=G.zone,nx=G.x+dx,ny=G.y+dy;if(nx<Z[0]||nx>Z[2]||ny<Z[1]||ny>Z[3])return false;return jhMzHorseCan(S,G.x,G.y,dx,dy,null)}}").some((s) => s.includes("踩進墨池")), "踩墨池要被抓到");
  assert.ok(bad("JH_MZ_KIND.inkpuppet.step=function(S,G){G.px=G.x;G.py=G.y;G.x+=(G.x<8?1:-1)}").some((s) => s.includes("日字")), "直走一格要被抓到");
});

test("廢墨池：玩家燈火照得到墨池本身、照不到墨池後面；走得進去；站在墨池裡傀儡的落點正好是你也不會被抓", () => {
  const c = load(), S = room(c, roomRows({ "3,5": "K" }), { stun: 99 }, 1, 5);
  assert.equal(c.jhMzLos(S, 1, 5, 3, 5), true, "墨池那一格本身照得到");
  assert.equal(c.jhMzLos(S, 1, 5, 4, 5), false, "墨池後面那一格照不到（光被墨池吸掉）");
  assert.equal(c.jhMzLos(S, 1, 4, 4, 4), true, "旁邊一列沒有墨池：照得到");
  let r = c.jhMzStep(S, 1, 0); assert.equal(r.ev, "move"); r = c.jhMzStep(S, 1, 0); assert.equal(r.ev, "move", "走進墨池"); assert.deepEqual([S.player.x, S.player.y], [3, 5]);
  const T = room(c, roomRows({ "7,6": "K" }), {}, 7, 6); assert.ok(!c.jhMzCaught(T), "落點 (7,6) 是墨池，站在裡面不被抓");
  const U = room(c, roomRows(), {}, 7, 6); assert.ok(c.jhMzCaught(U), "同一格不是墨池就會被抓");
});

test("會被抓：站在傀儡的日字落點上一直不走會被逮到；站在牠的馬腿上沒事", () => {
  const c = load();
  let S = room(c, roomRows(), { x: 5, y: 5, stun: 0 }, 7, 6), ev = c.jhMzStep(S, 0, 0).ev;
  for (let k = 0; k < 3 && ev !== "trap"; k++) { S.guard.x = 5; S.guard.y = 5; ev = c.jhMzStep(S, 0, 0).ev }
  assert.equal(ev, "trap", "一直站在日字落點上就被逮到");
  S = room(c, roomRows(), {}, 6, 5); assert.ok(!c.jhMzCaught(S), "站在馬腿 (6,5) 上不會被抓");
});

function reach(c, S) { const lv = LV(c), seen = new Set(), q = []; const st = S.player; q.push([st.x, st.y]); seen.add(st.y * S.W + st.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx];
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; const k = ny * S.W + nx; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、至少四個墨池；全部走得到；兩個傀儡的工坊不重疊、起點在工坊裡、開局不會被抓", () => {
  const c = load(), lv = LV(c), M = lv.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const count = (ch) => M.join("").split(ch).length - 1;
  assert.equal(count("@"), 1); assert.equal(count("D"), 1); assert.equal(count("P"), 1); assert.equal(count(">"), 1); assert.equal(count("C"), 3); assert.ok(count("K") >= 4);
  const S = c.jhMzNew("palace_horse"), all = reach(c, S), pos = (ch) => { const o = []; M.forEach((r, y) => [...r].forEach((v, x) => v === ch && o.push(y * W + x))); return o };
  for (const ch of "PD>CK") for (const k of pos(ch)) assert.ok(all.has(k), ch + " 走得到");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
  const [A, B] = S.guards.map((G) => G.zone); assert.ok(A[3] < B[1] || B[3] < A[1] || A[2] < B[0] || B[2] < A[0], "兩片工坊不重疊");
  for (const G of S.guards) { assert.ok(G.x >= G.zone[0] && G.x <= G.zone[2] && G.y >= G.zone[1] && G.y <= G.zone[3], "起點在工坊裡"); assert.ok(!c.jhMzSolid(S, G.x, G.y)) }
});

const safeWalk = (c, S) => { const clone = (T) => { const U = c.jhMzNew("palace_horse"); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.px, G.py, G.stun || 0].join(":")).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let step = 0; step < 300 && q.length && !door; step++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (r.ev === "trap" || r.ev === "wall" || r.ev === "locked" || r.ev === "spot") continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  return door };
test("走一趟：一定有一條不被傀儡看到的路，先踩踏板、再走到石門前；任一個傀儡慢 1～7 回合（被抓解題後停 4 回合也在裡面）都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew("palace_horse")); assert.ok(door && door.plate, "原本的步調：先踩踏板、再走到石門前");
  const bad = [];
  for (let g = 0; g < 2; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew("palace_horse"); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, [], "走不過的步調");
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（紅方有炮、馬收尾：馬後炮）、陷阱至少 5 題（兵收尾）；core.js 獨立重算——每步合法、走完將死、最後一步是對的子、沒有更短的殺法；不跟別派重複（含仕角炮兩段）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_PALACE", c), T = vm.runInContext("JH_MZ_POOL_PALACE_TRAP", c), others = [];
  for (const f of ["07z9m-maze.js:JH_MZ_POOL_CENTRAL", "07z9m-cross.js:JH_MZ_POOL_CROSS", "07z9m-pawn.js:JH_MZ_POOL_PAWN", "07z9m-screen.js:JH_MZ_POOL_SCREEN", "07z9m-horse.js:JH_MZ_POOL_HORSE",
    "07z9m-same.js:JH_MZ_POOL_SAME", "07z9m-opp.js:JH_MZ_POOL_OPP", "07z9m-opp.js:JH_MZ_POOL_OPP_TRAP", "07z9m-corner.js:JH_MZ_POOL_CORNER", "07z9m-corner.js:JH_MZ_POOL_CORNER_TRAP"]) { const [fn, nm] = f.split(":"); others.push(poolOf(rd(fn), nm)) }
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const lv = LV(c); assert.equal(lv.pool.door.length, 3); assert.equal(lv.pool.trap.length, T.trap.length, "登記的題庫：石門取 PALACE、陷阱取 PALACE_TRAP");
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 70, "別派題庫有讀到");
  assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x);
    assert.ok(!ids.has(x.id), "跟別派重複：" + x.id);
    assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    if (door) assert.ok(C.parseFen(x.fen).includes("C"), x.id + " 石門題紅方要有炮（馬後炮）");
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, door ? "N" : "P", x.id + " 最後一步是 " + (door ? "馬" : "兵"));
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-palace.js：LF、沒有控制字元、沒有行內 // 註解；新的全域名稱都有 JH_MZ_PALACE／jhMzPalace 前綴；m.html 排在共用程式和屏風馬門後面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_PALACE|JH_MZ_POOL_PALACE|jhMzPalace)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9m-maze.js"), s = H.indexOf("//#include m/07z9m-screen.js"), b = H.indexOf("//#include m/07z9m-palace.js");
  assert.ok(a > 0 && s > a && b > s, "反宮馬門要排在共用程式、屏風馬門（jhMzHorseCan）後面");
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
