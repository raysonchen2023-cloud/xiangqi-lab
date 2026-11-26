/* W87-3（11/26）中炮門地底迷宮第三層「督運密庫」（m/07z9m-central3.js）：滾動糧桶（往糧桶走就推出去，一路滾到前面不是空地或有守衛的前一格；擋路、擋光、擋守衛視線）；
   車衛（看 7 格）＋雙炮衛（第二層那一種，前衛擋住就看不到）；地圖走得完、有不被抓的路、任一個守衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋207、208 複核＋開發者 11/26 決定（被抓一律殺題、不用炮車收尾、第三層可用四步殺、修為 +60、題目只在同一派各層之間不重複）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的程式（只滾一格、滾過寶箱、滾過守衛、糧桶不擋視線），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-central3.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze?l=3" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-central2.js", "07z9m-central3.js"]) vm.runInContext(f === "07z9m-central3.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L3 = (c) => c.jhMzLvN("central", 3);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 13×7 的房間：第 3 列是長廊；marks＝{"x,y":字元} */
function room(c, marks, guards, px, py) { const rows = []; for (let y = 0; y < 7; y++) { const r = (y === 0 || y === 6 ? "#".repeat(13) : "#" + ".".repeat(11) + "#").split(""); for (const k in marks || {}) { const [x, yy] = k.split(",").map(Number); if (yy === y) r[x] = marks[k] } rows.push(r.join("")) }
  const S = c.jhMzNew(L3(c)); S.grid = rows.map((r) => r.split("")); S.W = 13; S.H = 7; S.seen = new Set(); S.chests = new Set(); S.turn = 0;
  S.guards = (guards || []).map((g) => Object.assign({ kind: "rook", dx: -1, dy: 0, range: 7 }, g)); S.guard = S.guards[0] || null; at(S, px == null ? 1 : px, py == null ? 3 : py); return S }
const kegAt = (S) => { const o = []; S.grid.forEach((r, y) => r.forEach((v, x) => { if (v === "b") o.push(x + "," + y) })); return o.join(" ") };

function rollProblems(c) {
  const bad = [];
  /* ① 一路滾到底：人跟著走進糧桶原來那一格，算一回合 */
  let S = room(c, { "3,3": "b" }, [], 2, 3), r = c.jhMzStep(S, 1, 0);
  if (kegAt(S) !== "11,3") bad.push("① 糧桶要一路滾到牆前（實際 " + kegAt(S) + "）");
  if (S.player.x !== 3 || r.ev !== "move" || S.turn !== 1) bad.push("① 人走進糧桶原來那一格、算一回合（實際 " + S.player.x + "," + r.ev + "," + S.turn + "）");
  /* ② 碰到寶箱、踏板、壁燈這些不是空地的格子，停在前一格 */
  for (const ch of ["C", "P", "T", ">"]) { S = room(c, { "3,3": "b", "8,3": ch }, [], 2, 3); c.jhMzStep(S, 1, 0); if (kegAt(S) !== "7,3") bad.push("② 碰到 " + ch + " 停在前一格（實際 " + kegAt(S) + "）") }
  /* ③ 碰到守衛停在前一格；④ 碰到別的糧桶停在前一格 */
  S = room(c, { "3,3": "b" }, [{ x: 9, y: 3, dx: 0, dy: 1, range: 0 }], 2, 3); c.jhMzStep(S, 1, 0); if (!kegAt(S).startsWith("8,3")) bad.push("③ 碰到守衛停在前一格（實際 " + kegAt(S) + "）");
  S = room(c, { "3,3": "b", "9,3": "b" }, [], 2, 3); c.jhMzStep(S, 1, 0); if (kegAt(S) !== "8,3 9,3") bad.push("④ 碰到別的糧桶停在前一格（實際 " + kegAt(S) + "）");
  /* ⑤ 前面一格就擋住：推不動＝撞牆，不算回合、人不動 */
  S = room(c, { "3,3": "b", "4,3": "#" }, [], 2, 3); r = c.jhMzStep(S, 1, 0);
  if (r.ev !== "wall" || S.turn !== 0 || S.player.x !== 2 || kegAt(S) !== "3,3") bad.push("⑤ 推不動要算撞牆、不算回合（實際 " + r.ev + "," + S.turn + "）");
  /* ⑥ 糧桶擋車衛的視線；⑦ 擋雙炮衛的視線；對照：沒有糧桶就看得到 */
  S = room(c, { "8,3": "b" }, [{ x: 11, y: 3, dx: -1 }], 6, 3); if (c.jhMzCaught(S)) bad.push("⑥ 糧桶要擋住車衛的視線");
  S = room(c, {}, [{ x: 11, y: 3, dx: -1 }], 6, 3); if (!c.jhMzCaught(S)) bad.push("⑥ 對照組：沒有糧桶時車衛看得到");
  S = room(c, { "8,3": "b" }, [{ kind: "twincannon", x: 10, y: 3, dx: -1 }], 7, 3); if (c.jhMzCaught(S)) bad.push("⑦ 糧桶要擋住炮衛的視線");
  S = room(c, {}, [{ kind: "twincannon", x: 10, y: 3, dx: -1 }], 7, 3); if (!c.jhMzCaught(S)) bad.push("⑦ 對照組：沒有糧桶時炮衛看得到");
  /* ⑧ 守衛也被糧桶擋路（走到糧桶前掉頭） */
  S = room(c, { "8,3": "b" }, [{ x: 9, y: 3, dx: -1, range: 1 }], 1, 5); c.jhMzGuardStep(S); if (S.guards[0].x !== 10) bad.push("⑧ 守衛碰到糧桶要掉頭（實際 " + S.guards[0].x + "）");
  return bad;
}

test("登記：中炮門第三層；車衛（看 7 格）＋兩個雙炮衛；糧桶擋路擋光；碑刻一則（《明史》寫明清修）；寶箱有收藏品「鎮河鐵卷」；修為 +60；結尾寫三層都走完", () => {
  const c = load(), L = L3(c);
  assert.equal(L.layer, 3); assert.equal(c.jhMzLayers("central"), 3); assert.equal(L.guards.length, 3);
  assert.deepEqual(Array.from(L.guards, (G) => G.kind), ["rook", "twincannon", "twincannon"]); assert.equal(L.guards[0].range, 7); assert.equal(L.guards.filter((G) => G.front).length, 1);
  assert.ok(L.solid.includes("b") && L.opaque.includes("b") && L.solid.includes("L")); assert.equal(L.dyn, "b", "糧桶會移動：3D 每一幀照目前格子擺（lv.dyn）"); assert.equal(typeof L.onStep, "function");
  assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據《明史·河渠志》（清修）/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "relic"]); assert.match(L.rew[2].zh, /鎮河鐵卷/);
  assert.equal(L.xp, 60); assert.equal(L.xpKey, "maze:central:3"); assert.equal(L.key, "jhMaze_L3");
  assert.match(L.say.done[0], /三層都走完了/, "最底層的結尾");
});

test("糧桶規則都符合（滾到底、碰到寶箱踏板壁燈樓梯守衛糧桶停在前一格、推不動算撞牆、擋車衛和炮衛的視線、守衛碰到會掉頭）", () => {
  assert.deepEqual(rollProblems(load()), []);
});

test("改壞驗證：只滾一格、滾過寶箱、滾過守衛、糧桶不擋視線，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace("let x=x1,y=y1;while(free(x+dx,y+dy)){x+=dx;y+=dy}", "let x=x1,y=y1;if(free(x+dx,y+dy)){x+=dx;y+=dy}");
  const P2 = (s) => s.replace('free=(x,y)=>jhMzCell(S,x,y)==="."&&', 'free=(x,y)=>!jhMzSolid(S,x,y)&&');
  const P3 = (s) => s.replace('&&!(S.guards||[]).some(G=>G.x===x&&G.y===y);', ";");
  const P4 = (s) => s.replace('opaque:"#Db"', 'opaque:"#D"').replace('solid:"#SDbL"', 'solid:"#SDL"');
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(rollProblems(load(P1)).some((s) => s.startsWith("①")), "只滾一格");
  assert.ok(rollProblems(load(P2)).some((s) => s.startsWith("②")), "滾過寶箱");
  assert.ok(rollProblems(load(P3)).some((s) => s.startsWith("③")), "滾過守衛");
  assert.ok(rollProblems(load(P4)).some((s) => s.startsWith("⑥") || s.startsWith("⑦")), "糧桶不擋視線");
});

function reach(c, S) { const lv = L3(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D" && ch !== "b") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻、兩個糧桶；全部走得到（糧桶推得開）；碑刻旁有可站的格子；開局不會被抓", () => {
  const c = load(), L = L3(c), M = L.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1); assert.equal(cnt("b"), 2);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  const ly = M.findIndex((r) => r.includes("L")), lx = M[ly].indexOf("L");
  assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => all.has((ly + b) * W + lx + a)), "碑刻旁有可站的格子");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

/* BFS：狀態含整張地圖（糧桶會被推走） */
const safeWalk = (c, S) => { const L = L3(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); U.lit = new Set(T.lit); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.dy, G.stun || 0].join(":")).join("|") + "," + kegAt(T);
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 250 && q.length && !door; st++) { const nq = [];
    for (const T of q) { for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) } if (door) break }
    q = nq.length > 2000 ? nq.slice(0, 2000) : nq }
  return door };
test("走一趟：一定有一條不被守衛看到的路，先踩踏板、再走到石門前；任一個守衛慢 1～7 回合都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L3(c))); assert.ok(door && door.plate);
  const bad = []; for (let g = 0; g < 3; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L3(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

test("被抓拖回入口：糧桶照第一層的規則擺回原位（推錯不會卡死）", () => {
  const c = load(), S = c.jhMzNew(L3(c)), k0 = kegAt(S); c.jhMzStep(S, 0, -1); assert.notEqual(kegAt(S), k0, "起點往上推得動糧桶"); c.jhMzReset(S, false); assert.equal(kegAt(S), k0);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（兵收尾的三步殺：炮兵協同）、被抓至少 5 題（馬收尾的三、四步殺，不用炮車收尾）；core.js 獨立重算；不跟中炮門第一、二層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜；說明的步數＝line", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_CENTRAL3", c), T = vm.runInContext("JH_MZ_POOL_CENTRAL3_TRAP", c);
  const others = [poolOf(rd("07z9m-maze.js"), "JH_MZ_POOL_CENTRAL"), poolOf(rd("07z9m-central2.js"), "JH_MZ_POOL_CENTRAL2"), poolOf(rd("07z9m-central2.js"), "JH_MZ_POOL_CENTRAL2_TRAP")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L3(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 18, "中炮門第一、二層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x), n = (x.line.length + 1) / 2;
    assert.ok(!ids.has(x.id), "跟中炮門第一、二層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    assert.ok(door ? n === 3 : n === 3 || n === 4, x.id + " 步數"); assert.ok(x.zh[1].includes(n + " 步將死") && x.en[1].includes("checkmate in " + n), x.id + " 說明的步數");
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, door ? "P" : "N", x.id + " 最後一步");
    const b0 = C.parseFen(x.fen), mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    /* 沒有更短的殺法：查到兩步（三步殺查一、二步；四步殺的第三步由出題時的 Pikafish 和 test-jh-maze-multisol-1126.js 的 alt 樹重算把關） */
    for (let k = 1; k <= Math.min(2, n - 1); k++) assert.ok(!mateIn(b0, k), x.id + " 沒有 " + k + " 步殺");
  }
});

test("〔原始碼〕07z9m-central3.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_CENTRAL3／jhMzCentral3 前綴；m.html 排在中炮門第二層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  /* 地圖字元的外觀（JH_MZ_OBJ／JH_MZ_TILE）只有這一派自己登記：別的檔先登記了同一個字元，這裡的「if(!JH_MZ_OBJ.x)」會被跳過、畫成別派的東西 */
  { const own = new Set([...SRC.matchAll(/JH_MZ_(?:OBJ|TILE)\.([A-Za-z])\b/g)].map((m) => m[1])), dir = path.join(ROOT, "xiangqi-db", "m");
    for (const g of fs.readdirSync(dir).filter((g) => /^07z9m-.*\.js$/.test(g) && g !== "07z9m-central3.js")) { const x = fs.readFileSync(path.join(dir, g), "utf8");
      for (const m of x.matchAll(/JH_MZ_(?:OBJ|TILE)\.([A-Za-z])\b/g)) assert.ok(!own.has(m[1]), "字元 " + m[1] + " 跟 " + g + " 撞了") } }
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_CENTRAL3|JH_MZ_POOL_CENTRAL3|jhMzCentral3)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-central2.js") > 0 && i("07z9m-central3.js") > i("07z9m-central2.js") && i("07z9m-central3.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-central3.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
