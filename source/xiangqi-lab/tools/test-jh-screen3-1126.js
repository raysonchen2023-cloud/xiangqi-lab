/* W87-3（11/26）屏風馬門地底迷宮第三層「鎮皇祭壇」（m/07z9m-screen3.js）：轉向石鼓（往石鼓走＝順時針轉 90 度、花一回合；凸起蓋住旁邊那一格，那一格當馬腿算被蹩住，人照樣能走）；
   連環馬衛（兩隻每回合一起往同一個方向跳，方向要兩隻都跳得過去；暈的不跟也不擋）；地圖走得完、有不被抓的路、任一個馬衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋207、208 複核（⑧凸起佔哪一格、蹩斷連繫寫清楚）＋開發者 11/26 決定（被抓一律殺題、不用炮車收尾、第三層可用四步殺、修為 +60、題目只在同一派各層之間不重複）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的程式（石鼓不轉、凸起不蹩腿、兩隻各跳各的、轉石鼓不算回合），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-screen3.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/screen?l=3" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-screen.js", "07z9m-screen2.js", "07z9m-screen3.js"]) vm.runInContext(f === "07z9m-screen3.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L3 = (c) => c.jhMzLvN("screen", 3);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 13×9 的房間；marks＝{"x,y":字元}；drum＝{"x,y":凸起方向 0 北 1 東 2 南 3 西} */
function room(c, marks, guards, px, py, drum) { const rows = []; for (let y = 0; y < 9; y++) { const r = (y === 0 || y === 8 ? "#".repeat(13) : "#" + ".".repeat(11) + "#").split(""); for (const k in marks || {}) { const [x, yy] = k.split(",").map(Number); if (yy === y) r[x] = marks[k] } rows.push(r.join("")) }
  const S = c.jhMzNew(L3(c)); S.grid = rows.map((r) => r.split("")); S.W = 13; S.H = 9; S.seen = new Set(); S.chests = new Set(); S.turn = 0; S.drum3 = Object.assign({}, drum || {});
  S.guards = (guards || []).map((g) => Object.assign({ kind: "linkhorse", dx: 1, dy: -2 }, g)); S.guard = S.guards[0] || null; at(S, px == null ? 1 : px, py == null ? 7 : py); return S }
const drumKey = (S) => JSON.stringify(S.drum3 || {});
const sees = (c, S, G, x, y) => c.jhMzSight(S, G).some((q) => q.x === x && q.y === y);

function drumProblems(c) {
  const bad = [];
  /* ① 往石鼓走：順時針轉 90 度、人不動、算一回合 */
  let S = room(c, { "4,7": "U" }, [], 3, 7, { "4,7": 0 }), r = c.jhMzStep(S, 1, 0);
  if (S.drum3["4,7"] !== 1) bad.push("① 往石鼓走要順時針轉 90 度（北→東；實際 " + S.drum3["4,7"] + "）");
  if (S.player.x !== 3 || S.turn !== 1 || r.ev !== "move") bad.push("① 轉石鼓人不動、算一回合（實際 " + S.player.x + "," + S.turn + "," + r.ev + "）");
  c.jhMzStep(S, 1, 0); c.jhMzStep(S, 1, 0); c.jhMzStep(S, 1, 0); if (S.drum3["4,7"] !== 0) bad.push("① 轉四次回到原本的方向");
  /* ② 凸起蓋住的那一格：人照樣能走、能站 */
  S = room(c, { "6,3": "U" }, [], 7, 4, { "6,3": 1 }); r = c.jhMzStep(S, 0, -1); if (S.player.y !== 3 || r.ev !== "move") bad.push("② 凸起蓋住的格子人照樣能走");
  /* ③ 馬腿在凸起那一格：那個方向跳不過去；凸起轉走後就跳得過去 */
  S = room(c, { "6,3": "U" }, [{ x: 7, y: 4 }], 1, 7, { "6,3": 1 }); if (sees(c, S, S.guards[0], 8, 2) || sees(c, S, S.guards[0], 6, 2)) bad.push("③ 馬腿被凸起蓋住：往上跳的兩個落點都沒有");
  S.drum3["6,3"] = 2; if (!sees(c, S, S.guards[0], 8, 2)) bad.push("③ 凸起轉走：又跳得到");
  /* ④ 連環：兩隻一起往同一個方向跳 */
  S = room(c, {}, [{ x: 3, y: 4 }, { x: 9, y: 4 }], 1, 7); c.jhMzGuardStep(S);
  if (!(S.guards[0].x === 4 && S.guards[0].y === 2 && S.guards[1].x === 10 && S.guards[1].y === 2)) bad.push("④ 兩隻一起往同一個方向跳（實際 " + S.guards.map((G) => G.x + "," + G.y).join(" ") + "）");
  /* ⑤ 其中一隻的馬腿被蹩住：兩隻都不往那個方向，一起換下一個方向（順時針） */
  S = room(c, { "2,3": "U" }, [{ x: 3, y: 4 }, { x: 9, y: 4 }], 1, 7, { "2,3": 1 }); c.jhMzGuardStep(S);
  if (!(S.guards[0].x === 5 && S.guards[0].y === 3 && S.guards[1].x === 11 && S.guards[1].y === 3)) bad.push("⑤ 蹩住一隻：兩隻一起換方向（實際 " + S.guards.map((G) => G.x + "," + G.y).join(" ") + "）");
  /* ⑥ 暈著的那一隻不跟、也不擋方向 */
  S = room(c, { "2,3": "U" }, [{ x: 3, y: 4, stun: 2 }, { x: 9, y: 4 }], 1, 7, { "2,3": 1 }); c.jhMzGuardStep(S);
  if (!(S.guards[0].x === 3 && S.guards[0].y === 4 && S.guards[1].x === 10 && S.guards[1].y === 2)) bad.push("⑥ 暈的不跟也不擋（實際 " + S.guards.map((G) => G.x + "," + G.y).join(" ") + "）");
  /* ⑦ 石鼓擋路、不擋光 */
  S = room(c, { "4,7": "U" }, [], 3, 7, { "4,7": 0 }); if (!c.jhMzSolid(S, 4, 7) || c.jhMzOpaque(S, 4, 7)) bad.push("⑦ 石鼓擋路、不擋光");
  return bad;
}

test("登記：屏風馬門第三層；兩隻連環馬衛；石鼓擋路不擋光；碑刻一則（《御製皇陵碑》）；寶箱有收藏品「殘局銅盤」；修為 +60；結尾寫三層都走完", () => {
  const c = load(), L = L3(c);
  assert.equal(L.layer, 3); assert.equal(c.jhMzLayers("screen"), 3); assert.deepEqual(Array.from(L.guards, (G) => G.kind), ["linkhorse", "linkhorse"]);
  assert.ok(L.solid.includes("U") && !L.opaque.includes("U") && L.solid.includes("L")); assert.equal(typeof L.onStep, "function");
  assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據朱元璋《御製皇陵碑》/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "relic"]); assert.match(L.rew[2].zh, /殘局銅盤/);
  assert.equal(L.xp, 60); assert.equal(L.xpKey, "maze:screen:3"); assert.equal(L.key, "jhMaze_screen_L3"); assert.match(L.say.done[0], /三層都走完了/);
  const S = c.jhMzNew(L), want = []; L.map.forEach((r, y) => [...r].forEach((v, x) => { if (v === "U") want.push(x + "," + y) }));
  assert.deepEqual(Object.keys(vm.runInContext("jhMzScreen3Drum", c)(S)).sort(), want.sort(), "每個石鼓都有起始方向");
});

test("石鼓和連環馬衛的規則都符合（轉 90 度花一回合、凸起格人能走、凸起蹩馬腿、兩隻同方向跳、蹩住一隻兩隻一起換方向、暈的不跟、石鼓擋路不擋光）", () => {
  assert.deepEqual(drumProblems(load()), []);
});

test("改壞驗證：石鼓不轉、凸起不蹩腿、兩隻各跳各的、轉石鼓不算回合，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace("D[k]=((D[k]||0)+1)%4;", "");
  const P2 = (s) => s.replace("if(jhMzScreen3Bump(S,L.x,L.y))return false;", "");
  const P3 = (s) => s.replace("if(A[0]!==G)return;", "A.length=0;A.push(G);");
  const P4 = (s) => s.replace("const r=jhMzStep(S,0,0),N=", 'const r={ev:"move"},N=');
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(drumProblems(load(P1)).some((s) => s.startsWith("①")), "石鼓不轉");
  assert.ok(drumProblems(load(P2)).some((s) => s.startsWith("③") || s.startsWith("⑤")), "凸起不蹩腿");
  assert.ok(drumProblems(load(P3)).some((s) => s.startsWith("⑤") || s.startsWith("④")), "各跳各的");
  assert.ok(drumProblems(load(P4)).some((s) => s.startsWith("①")), "轉石鼓不算回合");
});

function reach(c, S) { const lv = L3(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻、四個石鼓；全部走得到；碑刻旁有可站的格子；開局不會被抓", () => {
  const c = load(), L = L3(c), M = L.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1); assert.equal(cnt("U"), 4);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  const ly = M.findIndex((r) => r.includes("L")), lx = M[ly].indexOf("L");
  assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => all.has((ly + b) * W + lx + a)), "碑刻旁有可站的格子");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

/* BFS：狀態含石鼓朝向 */
const safeWalk = (c, S) => { const L = L3(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); U.lit = new Set(T.lit); if (T.drum3) U.drum3 = Object.assign({}, T.drum3); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.dy, G.stun || 0].join(":")).join("|") + "," + drumKey(T);
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 250 && q.length && !door; st++) { const nq = [];
    for (const T of q) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) } if (door) break }
    q = nq.length > 2000 ? nq.slice(0, 2000) : nq }
  return door };
test("走一趟：一定有一條不被守衛看到的路，先踩踏板、再走到石門前；任一個守衛慢 1～7 回合都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L3(c))); assert.ok(door && door.plate);
  const bad = []; for (let g = 0; g < 2; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L3(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

test("被抓拖回入口：轉過的石鼓還是那個方向（記在 S.drum3，跟仕角炮第二層的銅鏡一樣）", () => {
  const c = load(), S = c.jhMzNew(L3(c)), k = Object.keys(vm.runInContext("jhMzScreen3Drum", c)(S))[0], d0 = S.drum3[k]; S.drum3[k] = (d0 + 1) % 4; c.jhMzReset(S, false); assert.equal(S.drum3[k], (d0 + 1) % 4);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（雙馬、馬收尾的三步殺：雙馬飲泉）、被抓至少 5 題（兵收尾的三、四步殺，不用炮車收尾）；core.js 獨立重算；不跟屏風馬門第一、二層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜；說明的步數＝line", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_SCREEN3", c), T = vm.runInContext("JH_MZ_POOL_SCREEN3_TRAP", c);
  const others = [poolOf(rd("07z9m-screen.js"), "JH_MZ_POOL_SCREEN"), poolOf(rd("07z9m-screen2.js"), "JH_MZ_POOL_SCREEN2"), poolOf(rd("07z9m-screen2.js"), "JH_MZ_POOL_SCREEN2_TRAP")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L3(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 18, "屏風馬門第一、二層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x), n = (x.line.length + 1) / 2;
    assert.ok(!ids.has(x.id), "跟屏風馬門第一、二層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    assert.ok(door ? n === 3 : n === 3 || n === 4, x.id + " 步數"); assert.ok(x.zh[1].includes(n + " 步將死") && x.en[1].includes("checkmate in " + n), x.id + " 說明的步數");
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, door ? "N" : "P", x.id + " 最後一步"); if (door) assert.ok(C.parseFen(x.fen).filter((p) => p === "N").length >= 2, x.id + " 紅方有雙馬");
    const b0 = C.parseFen(x.fen), mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    /* 沒有更短的殺法：查到兩步（三步殺查一、二步；四步殺的第三步由出題時的 Pikafish 和 test-jh-maze-multisol-1126.js 的 alt 樹重算把關） */
    for (let k = 1; k <= Math.min(2, n - 1); k++) assert.ok(!mateIn(b0, k), x.id + " 沒有 " + k + " 步殺");
  }
});

test("〔原始碼〕07z9m-screen3.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_SCREEN3／jhMzScreen3 前綴；m.html 排在屏風馬門第二層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_SCREEN3|JH_MZ_POOL_SCREEN3|jhMzScreen3)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-screen2.js") > 0 && i("07z9m-screen3.js") > i("07z9m-screen2.js") && i("07z9m-screen3.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-screen3.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
