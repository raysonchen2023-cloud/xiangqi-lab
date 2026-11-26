/* W87-2（11/26）過宮炮地底迷宮第二層「烘焙暗道」（m/07z9m-cross2.js）：間歇蒸氣（奇數回合噴；噴著擋光、擋炮衛視線、不擋路；走一步、原地等都會換；自動走不主動踩）；
   炮衛照第一層「隔一座紙架才看得到」，視線穿不過噴著的蒸氣；地圖：中廳往上只能從紙架旁的蒸氣口上去、蒸氣永遠不噴就走不過、有不被抓的路、任一個炮衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋208 複核（iMac Claude 1）＋開發者 11/26 決定（被抓一律殺題、修為 +40、只在同一派各層不重複）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的程式（蒸氣不擋視線、蒸氣不會換、蒸氣擋路、沒紙架也看得到），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-cross2.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/cross_palace?l=2" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-cross2.js"]) vm.runInContext(f === "07z9m-cross2.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L2 = (c) => c.jhMzLvN("cross_palace", 2);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const xs = (a) => Array.from(a, (q) => q.x + "," + q.y).sort();
/* 1×13 的走廊（第 1 列）：炮衛在 (1,1) 面向右；紙架 (4,1)；蒸氣口 (5,1)；用 L2 的地圖當 lv.map，所以蒸氣口位置用這間房自己的 */
function room(c, marks, px) { const row = ("#" + ".".repeat(11) + "#").split(""); for (const k in marks) row[+k] = marks[k]; const rows = ["#".repeat(13), row.join(""), "#".repeat(13)];
  const S = c.jhMzNew(L2(c)); S.lv = Object.assign({}, S.lv, { map: rows }); S.grid = rows.map((r) => r.split("")); S.W = 13; S.H = 3; S.turn = 0;
  S.guards = [{ kind: "steamcannon", x: 1, y: 1, dx: 1, dy: 0, stun: 0 }]; S.guard = S.guards[0]; at(S, px == null ? 11 : px, 1); return S }

function steamProblems(c) {
  const bad = [];
  let S = room(c, { 4: "Z", 5: "E" }); c.jhMzCross2Sync(S, 0);
  if (JSON.stringify(xs(c.jhMzSight(S, S.guard))) !== JSON.stringify(["5,1", "6,1", "7,1"])) bad.push("沒噴：隔紙架看 3 格（實際 " + xs(c.jhMzSight(S, S.guard)).join(" ") + "）");
  c.jhMzCross2Sync(S, 1); if (S.grid[1][5] !== "e") bad.push("奇數回合噴");
  if (xs(c.jhMzSight(S, S.guard)).length) bad.push("噴著的蒸氣擋住視線：蒸氣那一格和後面都看不到");
  c.jhMzCross2Sync(S, 2); if (S.grid[1][5] !== "E") bad.push("偶數回合不噴");
  S = room(c, { 5: "E" }); c.jhMzCross2Sync(S, 0); if (xs(c.jhMzSight(S, S.guard)).length) bad.push("沒有紙架看不到（照第一層炮的規矩）");
  /* 噴著：擋光、不擋路 */
  S = room(c, { 4: "Z", 5: "E" }, 6); c.jhMzCross2Sync(S, 1);
  if (!c.jhMzOpaque(S, 5, 1)) bad.push("噴著的蒸氣擋光"); if (c.jhMzSolid(S, 5, 1)) bad.push("蒸氣不擋路");
  /* 走一步、原地等都會換 */
  S = room(c, { 4: "Z", 5: "E" }, 9); S.guard.stun = 0; c.jhMzStep(S, 1, 0); if (S.turn !== 1 || S.grid[1][5] !== "e") bad.push("走一步：蒸氣跟著回合換（第 1 回合噴）");
  c.jhMzStep(S, 0, 0); if (S.grid[1][5] !== "E") bad.push("原地等也會換");
  return bad;
}

test("登記：過宮炮第二層；三個炮衛（照第一層的看法加蒸氣）；蒸氣口是自動走要避開的地形；噴著擋光不擋路；碑刻一則；寶箱有稱號「紙背透匣」；修為 +40", () => {
  const c = load(), L = L2(c);
  assert.equal(L.layer, 2); assert.equal(c.jhMzLayers("cross_palace"), 2); assert.equal(L.guards.length, 3); for (const G of L.guards) assert.equal(G.kind, "steamcannon");
  assert.equal(L.avoid, "Ee"); assert.ok(L.opaque.includes("e") && !L.opaque.includes("E")); assert.ok(!L.solid.includes("e") && !L.solid.includes("E")); assert.ok(L.solid.includes("Z") && !L.opaque.includes("Z"), "紙架照第一層：擋路不擋光");
  assert.equal(typeof L.onStep, "function"); assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據文震亨《長物志》/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "title"]); assert.match(L.rew[2].zh, /紙背透匣/);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:cross_palace:2"); assert.equal(L.key, "jhMaze_cross_palace_L2");
});

test("蒸氣和炮衛的規則都符合（沒噴時隔紙架看 3 格、奇數回合噴、噴著擋視線、偶數回合停、沒紙架看不到、噴著擋光不擋路、走一步和原地等都會換）", () => {
  assert.deepEqual(steamProblems(load()), []);
});

test("改壞驗證：蒸氣不擋視線、蒸氣不會換、蒸氣擋路、沒紙架也看得到，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace('if(c===undefined||c==="e")break;', "if(c===undefined)break;");
  const P2 = (s) => s.replace('function jhMzCross2Sync(S,t){', "function jhMzCross2Sync(S,t){return;");
  const P3 = (s) => s.replace('solid:"#DZL",opaque:"#DLe"', 'solid:"#DZLe",opaque:"#DLe"');
  const P4 = (s) => s.replace("if(!scr){if(SC.includes(c)){if(i>R)break;scr=true;continue}if(jhMzSolid(S,x,y))break;continue}", "if(!scr){scr=true;if(SC.includes(c))continue}");
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(steamProblems(load(P1)).some((s) => s.includes("擋住視線")), "蒸氣不擋視線");
  assert.ok(steamProblems(load(P2)).some((s) => s.includes("奇數回合噴") || s.includes("換")), "蒸氣不會換");
  assert.ok(steamProblems(load(P3)).some((s) => s.includes("不擋路")), "蒸氣擋路");
  assert.ok(steamProblems(load(P4)).some((s) => s.includes("沒有紙架")), "沒紙架也看得到");
});

test("自動走繞開蒸氣口、點的終點是蒸氣口可以走；站在噴著的蒸氣裡，隔紙架的炮衛看不到", () => {
  const c = load(), T = c.jhMzNew(L2(c)); T.grid = ["#######", "#.....#", "#.###.#", "#.EEE.#", "#######"].map((r) => r.split("")); T.W = 7; T.H = 5; T.guards = []; T.guard = null;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) T.seen.add(y * 7 + x); at(T, 1, 3);
  const p = Array.from(c.jhMzPath(T, 5, 3), (q) => q.join(",")); assert.ok(!p.some((q) => /^[234],3$/.test(q)), "繞開蒸氣口：" + p.join(" "));
  assert.deepEqual(Array.from(c.jhMzPath(T, 2, 3), (q) => q.join(",")), ["2,3"]);
  const S = room(c, { 4: "Z", 5: "E" }, 5); c.jhMzCross2Sync(S, 1); assert.ok(!c.jhMzCaught(S), "站在噴著的蒸氣裡不被看到"); c.jhMzCross2Sync(S, 2); assert.ok(c.jhMzCaught(S), "蒸氣停了就看得到");
});

function reach(c, S, block) { const lv = L2(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined || (block && block(nx, ny))) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
const safeWalk = (c, S) => { const L = L2(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + (T.turn % 2) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.dy, G.stun || 0].join(":")).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 300 && q.length && !door; st++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  return door };
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻、至少四個蒸氣口；全部走得到；中廳往上只能踩紙架旁的蒸氣口；蒸氣永遠不噴就走不過；開局不會被抓", () => {
  const c = load(), L = L2(c), M = L.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1); assert.ok(cnt("E") >= 4);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>E".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  const Dy = M.findIndex((r) => r.includes("D")), Dx = M[Dy].indexOf("D"), gy = L.guards[1].y;
  assert.ok(!reach(c, S, (x, y) => y === gy && M[y][x] === "E").has((Dy + 1) * W + Dx), "中廳的蒸氣口拿掉就到不了石門");
  const d = load((s) => s.replace("function jhMzCross2Sync(S,t){", "function jhMzCross2Sync(S,t){return;"));
  assert.equal(safeWalk(d, d.jhMzNew(L2(d))), null, "蒸氣永遠不噴：走不過炮衛的火線");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

test("走一趟：一定有一條不被炮衛看到的路，先踩踏板、再走到石門前；任一個炮衛慢 1～7 回合都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L2(c))); assert.ok(door && door.plate);
  const bad = []; for (let g = 0; g < 3; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L2(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（馬收尾：炮牽制馬殺）、被抓至少 5 題（車收尾的殺題）；core.js 獨立重算；不跟過宮炮第一層重複（只在同一派各層不重複）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_CROSS2", c), T = vm.runInContext("JH_MZ_POOL_CROSS2_TRAP", c), same = [poolOf(rd("07z9m-cross.js"), "JH_MZ_POOL_CROSS")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L2(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(same.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 9, "過宮炮第一層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x);
    assert.ok(!ids.has(x.id), "跟過宮炮第一層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, door ? "N" : "R", x.id + " 最後一步");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-cross2.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_CROSS2／jhMzCross2 前綴；m.html 排在過宮炮第一層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_CROSS2|JH_MZ_POOL_CROSS2|jhMzCross2)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-cross.js") > 0 && i("07z9m-cross2.js") > i("07z9m-cross.js") && i("07z9m-cross2.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-cross2.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
