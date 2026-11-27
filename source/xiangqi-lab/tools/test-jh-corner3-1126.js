/* W87-3（11/26）仕角炮門地底迷宮第三層「絕當秘庫」（m/07z9m-corner3.js）：鐵柵踏板（踩上去降下鐵柵、封住九宮兩個角、只做一次；鐵柵擋路不擋光）；
   朝奉（巡路碰到封住的角就跳過，只剩一條斜線）＋外圍車衛；地圖走得完、有不被抓的路、任一個守衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋207、208 複核＋開發者 11/26 決定（被抓一律殺題、不用炮車收尾、第三層可用四步殺、修為 +60、題目只在同一派各層之間不重複）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的程式（踏板不封角、鐵柵不擋路、朝奉碰到封角就停、跳過時停在中心），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-corner3.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/advisor_corner?l=3" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-corner.js", "07z9m-corner2.js", "07z9m-corner3.js"]) vm.runInContext(f === "07z9m-corner3.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L3 = (c) => c.jhMzLvN("advisor_corner", 3);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 13×7 的房間：第 3 列是長廊；marks＝{"x,y":字元} */
function room(c, marks, guards, px, py) { const rows = []; for (let y = 0; y < 7; y++) { const r = (y === 0 || y === 6 ? "#".repeat(13) : "#" + ".".repeat(11) + "#").split(""); for (const k in marks || {}) { const [x, yy] = k.split(",").map(Number); if (yy === y) r[x] = marks[k] } rows.push(r.join("")) }
  const S = c.jhMzNew(L3(c)); S.grid = rows.map((r) => r.split("")); S.W = 13; S.H = 7; S.seen = new Set(); S.chests = new Set(); S.turn = 0;
  S.guards = (guards || []).map((g) => Object.assign({ kind: "rook", dx: -1, dy: 0, range: 7 }, g)); S.guard = S.guards[0] || null; at(S, px == null ? 1 : px, py == null ? 3 : py); return S }
const kegAt = (S) => { const o = []; S.grid.forEach((r, y) => r.forEach((v, x) => { if (v === "I") o.push(x + "," + y) })); return o.join(" ") };

/* 真的第三層地圖；守衛先暈著 */
function level(c) { const S = c.jhMzNew(L3(c)); for (const G of S.guards) G.stun = 99; return S }
function grateProblems(c) {
  const bad = [];
  /* ① 踩上鐵柵踏板：九宮東北、西南兩個角封住，收起的鐵柵都降下；有說明 */
  let S = level(c), g = L3(c).map.findIndex((r) => r.includes("g")), gx = L3(c).map[g].indexOf("g"); at(S, gx - 1, g); let r = c.jhMzStep(S, 1, 0);
  if (S.grid[6][8] !== "I" || S.grid[8][6] !== "I") bad.push("① 踩上踏板要封住九宮東北、西南兩個角（實際 " + S.grid[6][8] + S.grid[8][6] + "）");
  if (S.grid.some((row) => row.includes("i"))) bad.push("① 收起的鐵柵都要降下");
  if (!r.msg) bad.push("① 踩上踏板要有說明");
  /* ② 只做一次：離開再踩上去不會再出說明 */
  c.jhMzStep(S, -1, 0); r = c.jhMzStep(S, 1, 0); if (r.msg) bad.push("② 鐵柵只降一次");
  /* ③ 降下的鐵柵擋路、不擋光 */
  if (!c.jhMzSolid(S, 8, 6) || c.jhMzOpaque(S, 8, 6)) bad.push("③ 降下的鐵柵擋路、不擋光");
  /* ④ 朝奉在中心、下一個角被封：跳過那個角（連同回中心那一步），去下一個走得到的角 */
  S = level(c); S.grid[6][8] = "I"; const G = S.guards[0]; Object.assign(G, { stun: 0, i: 2, x: 7, y: 7 }); vm.runInContext("JH_MZ_KIND.gateadvisor", c).step(S, G);
  if (!(G.x === 8 && G.y === 8 && G.i === 5)) bad.push("④ 下一個角被封要跳過、去下一個角（實際 " + G.x + "," + G.y + "," + G.i + "）");
  /* ⑤ 對照：沒封的時候照第一層的巡路走 */
  S = level(c); const H = S.guards[0]; Object.assign(H, { stun: 0, i: 2, x: 7, y: 7 }); vm.runInContext("JH_MZ_KIND.gateadvisor", c).step(S, H);
  if (!(H.x === 8 && H.y === 6 && H.i === 3)) bad.push("⑤ 沒封時照第一層巡路（實際 " + H.x + "," + H.y + "," + H.i + "）");
  return bad;
}

test("登記：仕角炮門第三層；朝奉＋外圍車衛；降下的鐵柵擋路不擋光；碑刻一則（遊戲整理）；寶箱有收藏品「大明御製棋子」；修為 +60；結尾寫三層都走完", () => {
  const c = load(), L = L3(c);
  assert.equal(L.layer, 3); assert.equal(c.jhMzLayers("advisor_corner"), 3); assert.deepEqual(Array.from(L.guards, (G) => G.kind), ["gateadvisor", "rook"]);
  assert.ok(L.solid.includes("I") && !L.opaque.includes("I") && !L.solid.includes("i") && L.solid.includes("L")); assert.equal(typeof L.afterMove, "function");
  assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理/); assert.match(L.lore[0].body[0], /宮裡流出來/, "御用棋子寫明來由（208 複核）");
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "relic"]); assert.match(L.rew[2].zh, /大明御製棋子/);
  assert.equal(L.xp, 60); assert.equal(L.xpKey, "maze:advisor_corner:3"); assert.match(L.key, /_L3$/); assert.match(L.say.done[0], /三層都走完了/);
});

test("鐵柵規則都符合（踩踏板封兩個角、鐵柵都降下、只做一次、擋路不擋光、朝奉跳過封住的角、沒封照舊）", () => {
  assert.deepEqual(grateProblems(load()), []);
});

test("改壞驗證：踏板不封角、鐵柵不擋路、朝奉碰到封角就停、跳過時停在中心，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace('for(const[x,y]of JH_MZ_CORNER3_SEAL)S.grid[y][x]="I";', "");
  const P2 = (s) => s.replace('solid:"#DLI"', 'solid:"#DL"');
  const P3 = (s) => s.replace("if(jhMzSolid(S,nx,ny))continue;", "if(jhMzSolid(S,nx,ny))return;");
  const P4 = (s) => s.replace("if(k>1&&a===1&&b===1)continue;", "");
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(grateProblems(load(P1)).some((s) => s.startsWith("①")), "踏板不封角");
  assert.ok(grateProblems(load(P2)).some((s) => s.startsWith("③")), "鐵柵不擋路");
  assert.ok(grateProblems(load(P3)).some((s) => s.startsWith("④")), "朝奉碰到封角就停");
  assert.ok(grateProblems(load(P4)).some((s) => s.startsWith("④")), "跳過時停在中心");
});

function reach(c, S) { const lv = L3(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻、一個鐵柵踏板；全部走得到；碑刻旁有可站的格子；開局不會被抓", () => {
  const c = load(), L = L3(c), M = L.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1); assert.equal(cnt("g"), 1);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  const ly = M.findIndex((r) => r.includes("L")), lx = M[ly].indexOf("L");
  assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => all.has((ly + b) * W + lx + a)), "碑刻旁有可站的格子");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

/* BFS：狀態含鐵柵降了沒、朝奉巡到哪 */
const safeWalk = (c, S) => { const L = L3(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); U.lit = new Set(T.lit); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.dy, G.stun || 0].join(":")).join("|") + "," + kegAt(T) + "," + T.guards.map((G) => G.i).join(":");
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

test("被抓拖回入口：鐵柵照共用規則收回", () => {
  const c = load(), S = c.jhMzNew(L3(c)); S.grid[6][8] = "I"; assert.notEqual(kegAt(S), ""); c.jhMzReset(S, false); assert.equal(kegAt(S), "");
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（牽制成殺、馬收尾的三步殺）、被抓至少 5 題（兵收尾的三、四步殺，不用炮車收尾）；core.js 獨立重算；不跟仕角炮門第一、二層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜；說明的步數＝line", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_CORNER3", c), T = vm.runInContext("JH_MZ_POOL_CORNER3_TRAP", c);
  const others = [poolOf(rd("07z9m-corner.js"), "JH_MZ_POOL_CORNER"), poolOf(rd("07z9m-corner.js"), "JH_MZ_POOL_CORNER_TRAP"), poolOf(rd("07z9m-corner2.js"), "JH_MZ_POOL_CORNER2"), poolOf(rd("07z9m-corner2.js"), "JH_MZ_POOL_CORNER2_TRAP")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L3(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 18, "仕角炮門第一、二層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x), n = (x.line.length + 1) / 2;
    assert.ok(!ids.has(x.id), "跟仕角炮門第一、二層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    assert.ok(door ? n === 3 : n === 3 || n === 4, x.id + " 步數"); assert.ok(x.zh[1].includes(n + " 步將死") && x.en[1].includes("checkmate in " + n), x.id + " 說明的步數");
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, door ? "N" : "P", x.id + " 最後一步"); if (door) assert.ok(C.parseFen(x.fen).includes("C"), x.id + " 紅方有炮（牽制成殺）");
    const b0 = C.parseFen(x.fen), mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    /* 沒有更短的殺法：查到兩步（三步殺查一、二步；四步殺的第三步由出題時的 Pikafish 和 test-jh-maze-multisol-1126.js 的 alt 樹重算把關） */
    for (let k = 1; k <= Math.min(2, n - 1); k++) assert.ok(!mateIn(b0, k), x.id + " 沒有 " + k + " 步殺");
  }
});

test("〔原始碼〕07z9m-corner3.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_CORNER3／jhMzCorner3 前綴；m.html 排在仕角炮門第二層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  /* 地圖字元的外觀（JH_MZ_OBJ／JH_MZ_TILE）只有這一派自己登記：別的檔先登記了同一個字元，這裡的「if(!JH_MZ_OBJ.x)」會被跳過、畫成別派的東西 */
  { const own = new Set([...SRC.matchAll(/JH_MZ_(?:OBJ|TILE).([A-Za-z])=/g)].map((m) => m[1])), dir = path.join(ROOT, "xiangqi-db", "m");
    for (const g of fs.readdirSync(dir).filter((g) => /^07z9m-.*\.js$/.test(g) && g !== "07z9m-corner3.js")) { const x = fs.readFileSync(path.join(dir, g), "utf8");
      for (const m of x.matchAll(/JH_MZ_(?:OBJ|TILE).([A-Za-z])=/g)) assert.ok(!own.has(m[1]), "字元 " + m[1] + " 跟 " + g + " 撞了") } }
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_CORNER3|JH_MZ_POOL_CORNER3|jhMzCorner3)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-corner2.js") > 0 && i("07z9m-corner3.js") > i("07z9m-corner2.js") && i("07z9m-corner3.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-corner3.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
