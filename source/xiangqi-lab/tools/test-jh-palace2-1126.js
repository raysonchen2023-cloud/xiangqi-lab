/* W87-2（11/26）反宮馬地底迷宮第二層「踏板墨閘」（m/07z9m-palace2.js）：墨閘踏板 J 每走進去一次，那一組閘墨池就漲滿（U：擋路、擋光、站不進去、傀儡落不下去）⇄ 乾涸（平地）；
   原地等不切換、有傀儡站著的那一格不漲、被拖回入口墨閘還原；墨工傀儡照第一層，墨閘一變牠的路線跟著變；第一層的廢墨池 K 照舊能躲；
   地圖：一開始石門前被閘墨池擋住、要先踩墨閘才走得到；有不被抓的路、任一個傀儡慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋208 複核（iMac Claude 1）＋開發者 11/26 決定（被抓一律殺題、修為 +40）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的墨閘（只會乾不會漲、有傀儡也漲、漲滿可以走、漲滿不擋光），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-palace2.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/palace_horse?l=2" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-screen.js", "07z9m-palace.js", "07z9m-palace2.js"]) vm.runInContext(f === "07z9m-palace2.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L2 = (c) => c.jhMzLvN("palace_horse", 2);
const GATE = (c) => vm.runInContext("JH_MZ_PALACE2_GATE", c);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 一間小房間：踏板 J 在 (1,1)；它管 (5,1)（一開始漲滿 U）和 (5,3)（一開始乾）；牆 #。玩家站 (2,1) */
function room(c, guards) { const rows = ["#######", "#J...U#", "#.....#", "#....##", "#######"], S = c.jhMzNew(L2(c)); S.grid = rows.map((r) => r.split("")); S.W = 7; S.H = 5;
  const G = GATE(c); for (const k of Object.keys(G)) delete G[k]; G["1,1"] = [[5, 1], [4, 3]];
  S.guards = (guards || []).map((g) => Object.assign({ kind: "inkpuppet", zone: [1, 1, 5, 3], stun: 99 }, g)); S.guard = S.guards[0] || null; at(S, 2, 1); return S }

function gateProblems(c) {
  const bad = [];
  let S = room(c);
  if (c.jhMzStep(S, -1, 0).ev !== "move" || S.grid[1][5] !== "." || S.grid[3][4] !== "U") bad.push("走進踏板：漲滿的乾掉、乾的漲滿（實際 " + S.grid[1][5] + S.grid[3][4] + "）");
  c.jhMzStep(S, 0, 0); if (S.grid[1][5] !== "." || S.grid[3][4] !== "U") bad.push("原地等不切換");
  c.jhMzStep(S, 1, 0); c.jhMzStep(S, -1, 0); if (S.grid[1][5] !== "U" || S.grid[3][4] !== ".") bad.push("再走進一次：切換回去");
  /* 漲滿：走不進、擋光；乾：走得進 */
  S = room(c); at(S, 4, 1); if (c.jhMzStep(S, 1, 0).ev !== "wall") bad.push("漲滿的閘墨池走不進去");
  if (!c.jhMzOpaque(S, 5, 1) || c.jhMzLos(S, 4, 1, 6, 1) !== false) bad.push("漲滿的閘墨池要擋光");
  /* 有傀儡站著的那一格不漲 */
  S = room(c, [{ x: 4, y: 3 }]); c.jhMzStep(S, -1, 0); if (S.grid[3][4] === "U") bad.push("有傀儡站著的那一格不漲");
  return bad;
}

test("登記：反宮馬第二層；兩個墨工傀儡（照第一層）；墨閘踏板一個、它管的閘墨池一開始都漲滿；漲滿擋路擋光、廢墨池照舊走得進去擋光；碑刻一則；寶箱有稱號「墨隱刀鋒」；修為 +40", () => {
  const c = load(), L = L2(c), G = GATE(c), M = L.map;
  assert.equal(L.layer, 2); assert.equal(c.jhMzLayers("palace_horse"), 2); assert.equal(L.guards.length, 2); for (const g of L.guards) assert.equal(g.kind, "inkpuppet");
  assert.equal(typeof L.onStep, "function");
  assert.ok(L.solid.includes("U") && L.opaque.includes("U"), "漲滿：擋路擋光"); assert.ok(!L.solid.includes("K") && L.opaque.includes("K"), "廢墨池：走得進去、擋光"); assert.ok(L.solid.includes("L"));
  const keys = Object.keys(G); assert.equal(keys.length, 1);
  for (const k of keys) { const [x, y] = k.split(",").map(Number); assert.equal(M[y][x], "J", k + " 是墨閘踏板"); for (const [a, b] of G[k]) assert.equal(M[b][a], "U", a + "," + b + " 一開始漲滿") }
  assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據胡應麟《少室山房筆叢》/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "title"]); assert.match(L.rew[2].zh, /墨隱刀鋒/);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:palace_horse:2"); assert.equal(L.key, "jhMaze_palace_horse_L2");
});

test("墨閘的規則都符合（走進踏板切換、原地等不切換、再走進切回去、漲滿走不進去也擋光、有傀儡站著的那一格不漲）", () => {
  assert.deepEqual(gateProblems(load()), []);
});

test("改壞驗證：只會乾不會漲、有傀儡也漲、漲滿可以走、漲滿不擋光，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace('else if(v==="."&&!(S.guards||[]).some(G=>G.x===x&&G.y===y))S.grid[y][x]="U"', "");
  const P2 = (s) => s.replace('else if(v==="."&&!(S.guards||[]).some(G=>G.x===x&&G.y===y))S.grid[y][x]="U"', 'else if(v===".")S.grid[y][x]="U"');
  const P3 = (s) => s.replace('solid:"#DUL",opaque:"#DKUL"', 'solid:"#DL",opaque:"#DKUL"');
  const P4 = (s) => s.replace('solid:"#DUL",opaque:"#DKUL"', 'solid:"#DUL",opaque:"#DKL"');
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(gateProblems(load(P1)).some((s) => s.includes("乾的漲滿") || s.includes("切換回去")), "只會乾不會漲");
  assert.ok(gateProblems(load(P2)).some((s) => s.includes("有傀儡")), "有傀儡也漲");
  assert.ok(gateProblems(load(P3)).some((s) => s.includes("走不進去")), "漲滿可以走");
  assert.ok(gateProblems(load(P4)).some((s) => s.includes("擋光")), "漲滿不擋光");
});

test("墨閘一變，傀儡的路線跟著變（引開傀儡）；被拖回入口墨閘照地圖原樣；廢墨池照舊能躲", () => {
  const c = load(), L = L2(c), G = GATE(c), [k] = Object.keys(G);
  const trace = (dry) => { const S = c.jhMzNew(L); if (dry) for (const [x, y] of G[k]) S.grid[y][x] = "."; const g = S.guards[1]; S.guards = [g]; at(S, 1, 18); const t = []; for (let i = 0; i < 10; i++) { t.push(g.x + "," + g.y); c.jhMzGuardStep(S) } return t.join(" ") };
  assert.notEqual(trace(false), trace(true), "上方工坊的傀儡：閘墨池漲滿和乾掉時路線不一樣");
  for (const dry of [false, true]) assert.ok(new Set(trace(dry).split(" ")).size >= 6, "傀儡不會卡在原地（" + (dry ? "乾" : "漲滿") + "）");
  const S = c.jhMzNew(L); for (const [x, y] of G[k]) S.grid[y][x] = "."; c.jhMzReset(S, false); for (const [x, y] of G[k]) assert.equal(S.grid[y][x], "U", "拖回入口：閘墨池照地圖原樣漲滿");
  const T = c.jhMzNew(L); T.guards = [Object.assign(T.guards[1], { x: 6, y: 8, stun: 0 })]; at(T, 4, 9); assert.ok(!c.jhMzCaught(T), "站在廢墨池 (4,9) 裡，傀儡看不見");
});

function reach(c, S) { const lv = L2(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯、墨閘踏板各一個；三個箱子、一塊碑刻、至少四個廢墨池；一開始到不了石門（閘墨池擋著），閘墨池乾了全部走得到；開局不會被抓", () => {
  const c = load(), L = L2(c), M = L.map, W = M[0].length, G = GATE(c);
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>J") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1); assert.ok(cnt("K") >= 4);
  const D = M.findIndex((r) => r.includes("D")), dx = M[D].indexOf("D");
  let S = c.jhMzNew(L); assert.ok(!reach(c, S).has(D * W + dx), "一開始到不了石門");
  for (const [x, y] of Object.values(G).flat()) S.grid[y][x] = "."; const all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCDJ>K".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  assert.ok(!c.jhMzCaught(c.jhMzNew(L)), "開局不會被抓");
});

const safeWalk = (c, S) => { const L = L2(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); U.gateN = T.gateN; return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.grid.map((r) => r.join("")).join("") + "|" + T.guards.map((G) => [G.x, G.y, G.px, G.py, G.stun || 0].join(":")).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 300 && q.length && !door; st++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 30000 ? nq.slice(0, 30000) : nq }
  return door };
test("走一趟：一定有一條不被傀儡看到的路，踩墨閘、踩機關踏板、走到石門前；任一個傀儡慢 1～7 回合都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L2(c))); assert.ok(door && door.plate && (door.gateN || 0) >= 1, "踩過墨閘、踩過踏板、到石門前");
  const bad = []; for (let g = 0; g < 2; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L2(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（兵收尾：馬兵聯攻）、被抓至少 5 題（車收尾的殺題）；core.js 獨立重算；不跟反宮馬第一層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_PALACE2", c), T = vm.runInContext("JH_MZ_POOL_PALACE2_TRAP", c), others = [poolOf(rd("07z9m-palace.js"), "JH_MZ_POOL_PALACE"), poolOf(rd("07z9m-palace.js"), "JH_MZ_POOL_PALACE_TRAP")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L2(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 9, "反宮馬第一層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    assert.ok(!ids.has(x.id), "跟反宮馬第一層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, D.door.includes(x) ? "P" : "R", x.id + " 最後一步");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-palace2.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_PALACE2／jhMzPalace2 前綴；m.html 排在反宮馬第一層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_PALACE2|JH_MZ_POOL_PALACE2|jhMzPalace2)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-palace.js") > 0 && i("07z9m-palace2.js") > i("07z9m-palace.js") && i("07z9m-palace2.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-palace2.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
