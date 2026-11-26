/* W87-2（11/26）列炮地底迷宮第二層「懸木暗層」（m/07z9m-opp2.js）：墜落布景（走進繩扣 F，上方布景落在記好的格子變成擋路擋光的 Y、F 變回地面；有人或守衛站著的那一格不落；拖回入口還原；自動走不主動踩繩扣）；
   車衛（共用 rook，看整排）被布景截斷視線；將衛照第一層；地圖：中間長廊必經、布景落下後還走得到石門、有不被抓的路、任一個守衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋208 複核（iMac Claude 1）＋開發者 11/26 決定（被抓一律殺題、修為 +40、不同派可以重用題目、只在同一派各層不重複）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的程式（布景不擋光、不擋路、有守衛也落、繩扣不會消失），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-opp2.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/opposite_cannon?l=2" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-opp.js", "07z9m-opp2.js"]) vm.runInContext(f === "07z9m-opp2.js" && patch ? patch(rd(f)) : rd(f), c);
  c.__patch = patch; return c;
}
const L2 = (c) => c.jhMzLvN("opposite_cannon", 2);
const DROP = (c) => vm.runInContext("JH_MZ_OPP2_DROP", c);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 13×5 的房間：第 2 列是長廊；繩扣 F 在 (2,4)，布景落在 (5,2)、(8,2) */
function room(c, guards) { const rows = ["#############", "#...........#", "#...........#", "#...........#", "#.F.........#", "#############"], S = c.jhMzNew(L2(c)); S.grid = rows.map((r) => r.split("")); S.W = 13; S.H = 6;
  const D = DROP(c); for (const k of Object.keys(D)) delete D[k]; D["2,4"] = [[5, 2], [8, 2]];
  S.guards = (guards || []).map((g) => Object.assign({ stun: 99 }, g)); S.guard = S.guards[0] || null; at(S, 1, 4); return S }

function dropProblems(c) {
  const bad = [];
  let S = room(c); let r = c.jhMzStep(S, 1, 0);
  if (r.ev !== "move" || S.grid[2][5] !== "Y" || S.grid[2][8] !== "Y") bad.push("走進繩扣：布景落下（實際 " + S.grid[2][5] + S.grid[2][8] + "）");
  if (S.grid[4][2] !== ".") bad.push("觸發過的繩扣變回地面");
  at(S, 5, 1); if (c.jhMzStep(S, 0, 1).ev !== "wall") bad.push("布景擋路");
  if (!c.jhMzOpaque(S, 5, 2) || c.jhMzLos(S, 3, 2, 7, 2) !== false) bad.push("布景擋光");
  /* 有守衛站著的那一格不落 */
  S = room(c, [{ kind: "rook", x: 8, y: 2, dx: 1, dy: 0 }]); c.jhMzStep(S, 1, 0); if (S.grid[2][8] === "Y") bad.push("有守衛站著的那一格不落");
  /* 車衛被布景截斷視線 */
  S = room(c, [{ kind: "rook", x: 2, y: 2, dx: 1, dy: 0, range: 13, stun: 0 }]); const see = (T) => Array.from(c.jhMzSight(T, T.guard), (q) => q.x);
  if (!see(S).includes(10)) bad.push("布景落下前，車衛看得到整排");
  c.jhMzStep(S, 1, 0); S.guard.x = 2; S.guard.dx = 1; if (see(S).some((x) => x >= 5)) bad.push("布景落下後，車衛看不到布景後面");
  /* 拖回入口：布景照地圖原樣 */
  /* 拖回入口（jhMzReset 照這一層真正的地圖重建）：用真的地圖，觸發繩扣後拖回，布景、繩扣照原樣 */
  { const c2 = load(c.__patch), T = c2.jhMzNew(L2(c2)), D = DROP(c2), [k] = Object.keys(D), [fx, fy] = k.split(",").map(Number); for (const G of T.guards) G.stun = 99;
    at(T, fx - 1, fy); c2.jhMzStep(T, 1, 0); const fell = D[k].every(([x, y]) => T.grid[y][x] === "Y"); c2.jhMzReset(T, false);
    if (!fell || D[k].some(([x, y]) => T.grid[y][x] !== ".") || T.grid[fy][fx] !== "F") bad.push("拖回入口：布景照地圖原樣") }
  return bad;
}

test("登記：列炮第二層；車衛看整排、將衛照第一層；繩扣是自動走要避開的地形；布景擋路擋光；碑刻一則；寶箱有稱號「粉墨登場」；修為 +40", () => {
  const c = load(), L = L2(c), M = L.map, D = DROP(c);
  assert.equal(L.layer, 2); assert.equal(c.jhMzLayers("opposite_cannon"), 2);
  assert.deepEqual(Array.from(L.guards, (G) => G.kind).sort(), ["king", "rook"]); assert.ok(L.guards.find((G) => G.kind === "rook").range >= 13);
  assert.equal(L.avoid, "F"); assert.ok(L.solid.includes("Y") && L.opaque.includes("Y")); assert.ok(!L.solid.includes("F"));
  for (const k of Object.keys(D)) { const [x, y] = k.split(",").map(Number); assert.equal(M[y][x], "F", k + " 是繩扣"); for (const [a, b] of D[k]) assert.equal(M[b][a], ".", a + "," + b + " 一開始是地面") }
  assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據顧起元《客座贅語》/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "title"]); assert.match(L.rew[2].zh, /粉墨登場/);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:opposite_cannon:2"); assert.equal(L.key, "jhMaze_opposite_cannon_L2");
});

test("墜落布景的規則都符合（走進繩扣落下、繩扣變回地面、布景擋路擋光、有守衛的格不落、截斷車衛視線、拖回入口還原）", () => {
  assert.deepEqual(dropProblems(load()), []);
});

test("改壞驗證：布景不擋光、不擋路、有守衛也落、繩扣不會消失，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace('solid:"#DXYL",opaque:"#DXYL"', 'solid:"#DXYL",opaque:"#DXL"');
  const P2 = (s) => s.replace('solid:"#DXYL",opaque:"#DXYL"', 'solid:"#DXL",opaque:"#DXYL"');
  const P3 = (s) => s.replace("if((S.guards||[]).some(G=>G.x===x&&G.y===y))continue;", "");
  const P4 = (s) => s.replace('S.grid[ny][nx]=".";S.dropN', "S.dropN");
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(dropProblems(load(P1)).some((s) => s.includes("擋光") || s.includes("看不到布景後面")), "布景不擋光");
  assert.ok(dropProblems(load(P2)).some((s) => s.includes("擋路")), "布景不擋路");
  assert.ok(dropProblems(load(P3)).some((s) => s.includes("有守衛")), "有守衛也落");
  assert.ok(dropProblems(load(P4)).some((s) => s.includes("變回地面")), "繩扣不會消失");
});

test("自動走繞開繩扣、點的終點是繩扣可以走", () => {
  const c = load(), T = c.jhMzNew(L2(c)); T.grid = ["#######", "#.....#", "#.###.#", "#.FFF.#", "#######"].map((r) => r.split("")); T.W = 7; T.H = 5; T.guards = []; T.guard = null;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) T.seen.add(y * 7 + x); at(T, 1, 3);
  const p = Array.from(c.jhMzPath(T, 5, 3), (q) => q.join(",")); assert.ok(!p.some((q) => /^[234],3$/.test(q)), "繞開繩扣：" + p.join(" "));
  assert.deepEqual(Array.from(c.jhMzPath(T, 2, 3), (q) => q.join(",")), ["2,3"]);
});

function reach(c, S, block) { const lv = L2(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined || (block && block(nx, ny))) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯、繩扣各一個；三個箱子、一塊碑刻；全部走得到；車衛那條長廊必經；布景落下後還到得了石門；將衛的九宮都是地面；開局不會被抓", () => {
  const c = load(), L = L2(c), M = L.map, W = M[0].length, D = DROP(c);
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DPF>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCDF>".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  const ry = L.guards.find((G) => G.kind === "rook").y, Dy = M.findIndex((r) => r.includes("D")), Dx = M[Dy].indexOf("D");
  assert.ok(!reach(c, S, (x, y) => y === ry).has((Dy + 1) * W + Dx), "不經車衛那條長廊到不了石門前");
  for (const [x, y] of Object.values(D).flat()) { assert.equal(y, ry, "布景落在長廊上"); S.grid[y][x] = "Y" }
  assert.ok(reach(c, S).has((Dy + 1) * W + Dx), "布景落下後還到得了石門前");
  const K = L.guards.find((G) => G.kind === "king"); for (let y = K.pal[1]; y < K.pal[1] + 3; y++) for (let x = K.pal[0]; x < K.pal[0] + 3; x++) assert.ok(!c.jhMzSolid(S, x, y), "九宮是地面 " + x + "," + y);
  assert.ok(!c.jhMzCaught(c.jhMzNew(L)), "開局不會被抓");
});

const safeWalk = (c, S) => { const L = L2(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.grid.map((r) => r.join("")).join("") + "|" + T.guards.map((G) => [G.x, G.y, G.dx, G.dy, G.i, G.stun || 0].join(":")).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 300 && q.length && !door; st++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 30000 ? nq.slice(0, 30000) : nq }
  return door };
test("走一趟：一定有一條不被守衛看到的路，先踩踏板、再走到石門前；任一個守衛慢 1～7 回合都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L2(c))); assert.ok(door && door.plate);
  const bad = []; for (let g = 0; g < 2; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L2(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（馬收尾：側翼突破）、被抓至少 5 題（車收尾的殺題）；core.js 獨立重算；不跟列炮第一層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_OPP2", c), T = vm.runInContext("JH_MZ_POOL_OPP2_TRAP", c), same = [poolOf(rd("07z9m-opp.js"), "JH_MZ_POOL_OPP"), poolOf(rd("07z9m-opp.js"), "JH_MZ_POOL_OPP_TRAP")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L2(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(same.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 9, "列炮第一層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x);
    assert.ok(!ids.has(x.id), "跟列炮第一層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, door ? "N" : "R", x.id + " 最後一步");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    assert.ok(n === 2 || n === 3, x.id + " 兩、三步殺（四步殺留給第三層）");
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-opp2.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_OPP2／jhMzOpp2 前綴；m.html 排在列炮第一層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_OPP2|JH_MZ_POOL_OPP2|jhMzOpp2)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-opp.js") > 0 && i("07z9m-opp2.js") > i("07z9m-opp.js") && i("07z9m-opp2.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-opp2.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
