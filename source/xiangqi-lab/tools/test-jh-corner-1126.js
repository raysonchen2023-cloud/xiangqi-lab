/* W87-2（11/26）仕角炮地底迷宮第一層「當鋪秘庫」（m/07z9m-corner.js）：朝奉機關照仕（士）的規矩走（只在自己那一間 3×3 的斜線上，中心⇄四個角，一回合斜走一格）、
   只看得到牠正在走的那一條斜線（另一條看不到、每一邊正中間永遠看不到、出了那一間看不到、被擋光的東西擋住）；銅鏡照亮鏡子方向的整條直線；
   地圖走得完、有一條不被抓的路、三個朝奉不管步調怎麼錯開（被抓解題、其中一個停 4 回合後）都不會把路封死；兩段題庫用 core.js 獨立重算。
   開發者 11/26 下一版目標②：十派地底迷宮都做到三層；選單「先把十派第一層補齊」。
   「改壞驗證」：同一組規則檢查拿去跑改壞的朝奉（兩條斜線都看、看直的四格、穿牆看、直著走、跑出那一間），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const MZ = rd("07z9m-maze.js"), SRC = rd("07z9m-corner.js");

function load() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/advisor_corner" }) });
  vm.createContext(c); vm.runInContext(MZ, c); vm.runInContext(SRC, c);
  return c;
}
const LV = (c) => vm.runInContext("JH_MZ_LV", c).advisor_corner;
const PATH = (c) => vm.runInContext("JH_MZ_CORNER_PATH", c);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const xs = (a) => Array.from(a, (q) => q.x + "," + q.y).sort();   /* Array.from：vm 裡建的陣列原型不同，轉成這邊的陣列再比 */
/* 一間 9×9 的房間：朝奉那一間在 (3,3)～(5,5)，中心 (4,4)；block＝在那一間裡放一格牆（擋路也擋光） */
function roomRows(block) { const r = []; for (let y = 0; y < 9; y++) { if (y === 0 || y === 8) { r.push("#".repeat(9)); continue } const row = ("#" + ".".repeat(7) + "#").split(""); if (block && block[1] === y) row[block[0]] = "#"; r.push(row.join("")) } return r }
function room(c, rows, i, px, py) { const S = c.jhMzNew("advisor_corner"), P = PATH(c)[i]; S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length;
  S.guards = [{ kind: "advisor", room: [3, 3], i, x: 3 + P[0], y: 3 + P[1] }]; S.guard = S.guards[0]; at(S, px, py); return S }
const onDiag = (G, k) => { const [x, y] = k.split(",").map(Number); return Math.abs(x - G.x) === Math.abs(y - G.y) && x !== G.x };

/* 規則檢查：回傳不符合的地方（空陣列＝都符合）。同一組檢查也拿去跑改壞的朝奉（改壞驗證） */
function advisorProblems(c) {
  const bad = [], P = PATH(c), inR = (k) => { const [x, y] = k.split(",").map(Number); return x >= 3 && x <= 5 && y >= 3 && y <= 5 };
  const mids = ["4,3", "3,4", "5,4", "4,5"];
  /* 八個巡路位置各看一次：看到的都在牠的斜線上、都在那一間裡；每一邊正中間永遠看不到 */
  for (let i = 0; i < P.length; i++) { const S = room(c, roomRows(), i, 1, 1), G = S.guard, sg = xs(c.jhMzSight(S, G));
    if (!sg.length) bad.push("巡路第 " + i + " 步什麼都看不到");
    for (const k of sg) { if (!onDiag(G, k)) bad.push("只看斜線：第 " + i + " 步看到 " + k); if (!inR(k)) bad.push("出了那一間還看得到：" + k) }
    for (const k of mids) if (sg.includes(k)) bad.push("每一邊正中間要永遠看不到：第 " + i + " 步看到 " + k) }
  /* 在左上角 (3,3)（巡路第 1 步，剛從中心走過來）：看得到中心和對角 (5,5)；另一條斜線的兩個角看不到 */
  let S = room(c, roomRows(), 1, 1, 1), sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (!(S.guard.x === 3 && S.guard.y === 3)) bad.push("巡路第 1 步要在左上角");
  if (!sg.has("4,4") || !sg.has("5,5")) bad.push("在角落：整條斜線（中心、對角）要看得到");
  if (sg.has("5,3") || sg.has("3,5")) bad.push("另一條斜線看不到：在左上角時，右上、左下兩個角不該看得到");
  /* 回到中心（巡路第 2 步）：還是看同一條斜線；第 3 步去右上角才換另一條 */
  S = room(c, roomRows(), 2, 1, 1); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (!sg.has("3,3") || !sg.has("5,5") || sg.has("5,3") || sg.has("3,5")) bad.push("另一條斜線看不到：剛從左上角回中心，只看左上—右下那一條");
  /* 擋光：那一間的中心是牆，在左上角就看不到對角 (5,5) */
  S = room(c, roomRows([4, 4]), 1, 1, 1); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (sg.has("5,5")) bad.push("擋光：中心是牆，對角 (5,5) 不該看得到");
  /* 照巡路走：八步回到原位、每一步斜走一格、永遠在那一間裡、四個角都到 */
  S = room(c, roomRows(), 0, 1, 1); const seen = [];
  for (let k = 0; k < 8; k++) { const ox = S.guard.x, oy = S.guard.y; c.jhMzGuardStep(S);
    if (!(Math.abs(S.guard.x - ox) === 1 && Math.abs(S.guard.y - oy) === 1)) bad.push("一回合要斜走一格，實際 " + ox + "," + oy + "→" + S.guard.x + "," + S.guard.y);
    if (!inR(S.guard.x + "," + S.guard.y)) bad.push("跑出那一間：" + S.guard.x + "," + S.guard.y);
    seen.push(S.guard.x + "," + S.guard.y) }
  if (!(S.guard.x === 4 && S.guard.y === 4)) bad.push("八步要繞回中心");
  for (const k of ["3,3", "5,3", "5,5", "3,5"]) if (!seen.includes(k)) bad.push("四個角都要走到：少了 " + k);
  return bad;
}

test("登記：仕角炮門有登記、路由 #/jianghu/maze/advisor_corner；三個朝奉機關各守一間；不能跳；有銅鏡機關；門內頁有入口；三個寶箱", () => {
  const c = load(), lv = LV(c), sidOf = vm.runInContext("jhMzSidOf", c);
  assert.ok(lv); assert.equal(sidOf("#/jianghu/maze/advisor_corner"), "advisor_corner"); assert.equal(lv.key, "jhMaze_advisor_corner");
  assert.equal(lv.guards.length, 3); for (const G of lv.guards) { assert.equal(G.kind, "advisor"); assert.equal(G.room.length, 2) }
  assert.equal(new Set(lv.guards.map((G) => G.room.join(","))).size, 3, "三個朝奉各守不同的一間");
  assert.equal(lv.jump, ""); assert.equal(typeof lv.onStep, "function");
  assert.ok(lv.solid.includes("O") && lv.opaque.includes("O"), "銅鏡嵌在牆裡：擋路也擋視線");
  assert.ok(lv.hall && lv.hall.zh && lv.hall.en && lv.hall.at.length === 2); assert.equal(lv.rew.length, 3);
});

test("朝奉機關的規則都符合（只看正在走的那一條斜線、另一條看不到、每一邊正中間永遠看不到、出了那一間看不到、擋光、斜走一格繞回中心）", () => {
  assert.deepEqual(advisorProblems(load()), []);
});

test("改壞驗證：兩條斜線都看、看直的四格、穿牆看、直著走、跑出那一間，規則檢查一定抓得到", () => {
  const c1 = load(); vm.runInContext("JH_MZ_KIND.advisor.sight=function(S,G){const R=G.room,o=[];for(const[a,b]of[[1,1],[1,-1],[-1,1],[-1,-1]])for(let k=1;k<3;k++){const x=G.x+a*k,y=G.y+b*k;if(x<R[0]||x>R[0]+2||y<R[1]||y>R[1]+2||jhMzSolid(S,x,y))break;o.push({x,y})}return o}", c1);
  assert.ok(advisorProblems(c1).some((s) => s.includes("另一條斜線看不到")), "兩條斜線都看要被抓到");
  const c2 = load(); vm.runInContext("JH_MZ_KIND.advisor.sight=function(S,G){const o=[];for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]])if(!jhMzSolid(S,G.x+a,G.y+b))o.push({x:G.x+a,y:G.y+b});return o}", c2);
  assert.ok(advisorProblems(c2).some((s) => s.includes("只看斜線") || s.includes("正中間")), "看直的四格要被抓到");
  const c3 = load(); vm.runInContext("{const R=(G)=>G.room;JH_MZ_KIND.advisor.sight=function(S,G){const d=jhMzCornerDir(G),o=[];for(const s of[1,-1])for(let k=1;k<3;k++){const x=G.x+d[0]*s*k,y=G.y+d[1]*s*k,r=R(G);if(x<r[0]||x>r[0]+2||y<r[1]||y>r[1]+2)break;if(!jhMzSolid(S,x,y))o.push({x,y})}return o}}", c3);
  assert.ok(advisorProblems(c3).some((s) => s.includes("擋光")), "穿牆看要被抓到");
  const c4 = load(); vm.runInContext("JH_MZ_KIND.advisor.step=function(S,G){const R=G.room;G.x=G.x>=R[0]+2?R[0]:G.x+1}", c4);
  assert.ok(advisorProblems(c4).some((s) => s.includes("斜走一格")), "直著走要被抓到");
  const c5 = load(); vm.runInContext("JH_MZ_KIND.advisor.step=function(S,G){G.x+=1;G.y+=1}", c5);
  assert.ok(advisorProblems(c5).some((s) => s.includes("跑出那一間")), "一直往右下走跑出那一間要被抓到");
});

test("銅鏡：走到銅鏡旁邊，沿鏡子方向的整條直線（到被擋光的東西為止）都看得到；撞牆不算；走到別的地面不會", () => {
  const c = load(), MIR = vm.runInContext("JH_MZ_CORNER_MIRROR", c);
  assert.deepEqual(Array.from(MIR["4,10"]), [1, 0], "正式地圖第一面鏡子 (4,10) 往右照");
  /* 一間 15×5 的小房間：銅鏡在 (2,2) 往右照，(11,2) 是牆 */
  for (const k of Object.keys(MIR)) delete MIR[k]; MIR["2,2"] = [1, 0];
  const rows = ["#".repeat(15), "#" + ".".repeat(13) + "#", "#.O" + ".".repeat(8) + "#..#", "#" + ".".repeat(13) + "#", "#".repeat(15)];
  const mk = (px, py) => { const S = c.jhMzNew("advisor_corner"); S.grid = rows.map((r) => r.split("")); S.W = 15; S.H = 5; S.guards = []; S.guard = null; S.seen = new Set(); at(S, px, py); return S };
  let S = mk(3, 1), r = c.jhMzStep(S, 0, 1); assert.equal(r.ev, "move", "走到鏡子右邊 (3,2)");
  for (let x = 6; x <= 10; x++) assert.ok(S.seen.has(2 * 15 + x), "鏡子方向那一列遠處看得到：" + x + ",2");
  assert.ok(!S.seen.has(2 * 15 + 12), "被牆 (11,2) 擋住：牆後面 (12,2) 看不到");
  S = mk(8, 1); c.jhMzStep(S, 1, 0); assert.ok(!S.seen.has(2 * 15 + 12) && !S.seen.has(2 * 15 + 4), "走到旁邊沒有鏡子的地面：不會照亮那一列");
  S = mk(1, 1); r = c.jhMzStep(S, -1, 0); assert.equal(r.ev, "wall"); assert.ok(!S.seen.has(2 * 15 + 8), "往牆走不點亮");
  S = mk(1, 1); r = c.jhMzStep(S, 0, 1); assert.equal(r.ev, "move", "走到鏡子左邊 (1,2) 也算旁邊"); assert.ok(S.seen.has(2 * 15 + 8), "左邊也照得到");
});

test("會被抓：站在朝奉正在走的那一條斜線上會被發現；站在每一邊正中間、或另一條斜線的角就沒事", () => {
  const c = load();
  let S = room(c, roomRows(), 1, 5, 5); assert.ok(c.jhMzCaught(S) || c.jhMzSight(S, S.guard).some((q) => q.x === 5 && q.y === 5), "在對角 (5,5) 會被看到");
  S = room(c, roomRows(), 1, 5, 5); let ev = c.jhMzStep(S, 0, 0).ev;
  for (let k = 0; k < 3 && ev !== "trap"; k++) ev = c.jhMzStep(S, 0, 0).ev; assert.equal(ev, "trap", "一直站在中心或斜線上就被逮到");
  for (let i = 0; i < 8; i++) { S = room(c, roomRows(), i, 4, 3); assert.ok(!c.jhMzCaught(S), "上邊正中間 (4,3) 永遠不會被抓：第 " + i + " 步") }
  S = room(c, roomRows(), 1, 5, 3); assert.ok(!c.jhMzCaught(S), "牠在左上角時，右上角 (5,3) 不會被抓");
});

function reach(c, S) { const lv = LV(c), seen = new Set(), q = []; const st = S.player; q.push([st.x, st.y]); seen.add(st.y * S.W + st.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx];
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; const k = ny * S.W + nx; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、至少兩面銅鏡；全部走得到；每個朝奉那一間 3×3 都是地面、開局不會被抓；銅鏡的位置真的是 O、旁邊走得到", () => {
  const c = load(), lv = LV(c), M = lv.map, W = M[0].length, MIR = vm.runInContext("JH_MZ_CORNER_MIRROR", c);
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const count = (ch) => M.join("").split(ch).length - 1;
  assert.equal(count("@"), 1); assert.equal(count("D"), 1); assert.equal(count("P"), 1); assert.equal(count(">"), 1); assert.equal(count("C"), 3);
  assert.ok(count("O") >= 2); assert.equal(Object.keys(MIR).length, count("O"), "每面銅鏡都有登記方向");
  const S = c.jhMzNew("advisor_corner"), all = reach(c, S), pos = (ch) => { const o = []; M.forEach((r, y) => [...r].forEach((v, x) => v === ch && o.push(y * W + x))); return o };
  for (const ch of "PD>C") for (const k of pos(ch)) assert.ok(all.has(k), ch + " 走得到");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
  for (const G of S.guards) for (let y = G.room[1]; y < G.room[1] + 3; y++) for (let x = G.room[0]; x < G.room[0] + 3; x++) assert.ok(!c.jhMzSolid(S, x, y), "朝奉那一間每一格都是地面：" + x + "," + y);
  for (const k of Object.keys(MIR)) { const [x, y] = k.split(",").map(Number); assert.equal(M[y][x], "O", k + " 是銅鏡");
    assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => all.has((y + b) * W + x + a)), "銅鏡 " + k + " 旁邊走得到");
    const [dx, dy] = MIR[k]; assert.notEqual(M[y + dy][x + dx], "#", "銅鏡 " + k + " 照出去的第一格不是牆") }
});

const safeWalk = (c, S) => { const clone = (T) => { const U = c.jhMzNew("advisor_corner"); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => G.i + ":" + (G.stun || 0)).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let step = 0; step < 300 && q.length && !door; step++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (r.ev === "trap" || r.ev === "wall" || r.ev === "locked" || r.ev === "spot") continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  return door };
test("走一趟：一定有一條不被朝奉看到的路，先踩踏板、再走到石門前；三個朝奉的步調不管怎麼錯開（任一個停 4 回合、或全部 8×8×8 種）都走得過", () => {
  const c = load(), P = PATH(c);
  let door = safeWalk(c, c.jhMzNew("advisor_corner")); assert.ok(door && door.plate, "原本的步調：先踩踏板、再走到石門前");
  const bad = [];
  for (let a = 0; a < 8; a++) for (let b = 0; b < 8; b++) for (let d = 0; d < 8; d++) { const S = c.jhMzNew("advisor_corner"), off = [a, b, d];
    S.guards.forEach((G, k) => { G.i = (G.i + off[k]) % 8; G.x = G.room[0] + P[G.i][0]; G.y = G.room[1] + P[G.i][1] });
    if (c.jhMzCaught(S)) continue;   /* 這種錯開法玩家站在入口就被看到：實際上不會發生（被抓會押回入口、朝奉不重置），跳過 */
    door = safeWalk(c, S); if (!(door && door.plate)) bad.push(off.join(",")) }
  assert.deepEqual(bad, [], "走不過的步調組合");
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題、陷阱至少 5 題，都是馬收尾；core.js 獨立重算——每步合法、走完將死、最後一步是馬、沒有更短的殺法；不跟別派重複（含順炮、列炮兩段）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_CORNER", c), T = vm.runInContext("JH_MZ_POOL_CORNER_TRAP", c), others = [];
  for (const f of ["07z9m-maze.js:JH_MZ_POOL_CENTRAL", "07z9m-cross.js:JH_MZ_POOL_CROSS", "07z9m-pawn.js:JH_MZ_POOL_PAWN", "07z9m-screen.js:JH_MZ_POOL_SCREEN", "07z9m-horse.js:JH_MZ_POOL_HORSE",
    "07z9m-same.js:JH_MZ_POOL_SAME", "07z9m-opp.js:JH_MZ_POOL_OPP", "07z9m-opp.js:JH_MZ_POOL_OPP_TRAP"]) { const [fn, nm] = f.split(":"); others.push(poolOf(rd(fn), nm)) }
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const lv = LV(c); assert.equal(lv.pool.door.length, 3); assert.equal(lv.pool.trap.length, T.trap.length, "登記的題庫：石門取 CORNER、陷阱取 CORNER_TRAP");
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 60, "別派題庫有讀到");
  assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
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

test("〔原始碼〕07z9m-corner.js：LF、沒有控制字元、沒有行內 // 註解；新的全域名稱都有 JH_MZ_CORNER／jhMzCorner 前綴；m.html 排在共用程式後面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_CORNER|JH_MZ_POOL_CORNER|jhMzCorner)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9m-maze.js"), b = H.indexOf("//#include m/07z9m-corner.js");
  assert.ok(a > 0 && b > a, "仕角炮門要排在共用程式後面");
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
