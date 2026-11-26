/* W87-2（11/26）仙人指路地底迷宮第三層「聽泉幽窟」（m/07z9m-pawn3.js；共用 m/07z9m-maze.js 的 jhMzLayer、afterMove、avoid）：
   用 vm 跑真的程式（共用程式、碑刻、十派第一層、仙人指路第二、三層）：
   登記成第三層（不動第一、二層）、流水石階把人往下沖一格（下面擋住就不動）、滑完回 stop:true、往上游一踩就被沖回來、自動走不主動踩、
   三隻兵卒陣列；用真的 jhMzStep 搜尋從入口走得到踏板、再走得到石門前（途中沒被抓、沒被看到）；題庫 3＋6 題馬收尾、修為 +60。
   「改壞驗證」：同一組檢查拿去跑改壞的程式（水不沖、自動走會踩流水、只剩兩隻兵），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const FILES = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js", "07z9m-pawn2.js", "07z9m-pawn3.js"];

function load(patch = {}) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, vibrate: () => {}, jhGo: () => {}, jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: () => ({ style: {}, dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {} }), head: { append() {} }, body: { append() {} } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false }); c.location = { href: "http://x/index.html#/", hash: "#/" };
  vm.createContext(c); for (const f of FILES) vm.runInContext(patch[f] ? patch[f](rd(f)) : rd(f), c);
  return c;
}
const L3 = (c) => c.jhMzLvN("pawn", 3);
const cell = (S, x, y) => (S.grid[y] || [])[x];
function mini(c, rows, px, py) {
  const S = c.jhMzNew(L3(c)); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = []; S.chests = new Set();
  S.lv = Object.assign({}, S.lv, { map: rows }); S.player = { x: px, y: py, face: 1 }; for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) S.seen.add(y * S.W + x); return S;
}
/* 用真的 jhMzStep 搜尋：狀態＝玩家位置＋踏板＋守衛位置；一步不能撞牆、不能被抓或被看到 */
function reach(c) {
  const S0 = c.jhMzNew(L3(c)), find = (ch) => { for (let y = 0; y < S0.H; y++) for (let x = 0; x < S0.W; x++) if (S0.lv.map[y][x] === ch) return { x, y } }, dr = find("D");
  S0.player = Object.assign({ face: 1 }, S0.start); S0.guards = (S0.lv.guards || []).map((g) => Object.assign({}, g));
  const clone = (S) => Object.assign(Object.create(Object.getPrototypeOf(S)), S, { grid: S.grid.map((r) => r.slice()), player: Object.assign({}, S.player), guards: S.guards.map((g) => Object.assign({}, g)), chests: new Set(S.chests), lit: new Set(S.lit), bag: Object.assign({}, S.bag), got: [] });
  const key = (S) => [S.player.x, S.player.y, S.plate ? 1 : 0, S.guards.map((g) => [g.x, g.y, g.dx, g.dy].join(":")).join("|")].join(",");
  const seen = new Set([key(S0)]); let q = [S0], depth = 0, plate = -1;
  while (q.length && depth < 120) {
    const nq = [];
    for (const S of q) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const T = clone(S), r = c.jhMzStep(T, dx, dy);
      if (!r || ["wall", "locked", "trap", "spot"].includes(r.ev)) continue;
      if (r.ev === "door") return { plate, door: depth + 1 };
      if (T.plate && plate < 0) plate = depth + 1;
      if (T.plate && Math.abs(T.player.x - dr.x) + Math.abs(T.player.y - dr.y) === 1) return { plate, door: depth + 1 };
      const k = key(T); if (seen.has(k)) continue; seen.add(k); nq.push(T);
    }
    q = nq; depth++; if (seen.size > 600000) break;
  }
  return { plate, door: -1 };
}

function problems(c) {
  const bad = [], B = vm.runInContext("JH_MZ_LV", c).pawn, L = L3(c);
  if (!L || L.layer !== 3) bad.push("第三層沒登記到");
  if (B.layer !== 1 || B.map !== vm.runInContext("JH_MZ_PAWN_MAP", c)) bad.push("第一層被蓋掉");
  if (c.jhMzLvN("pawn", 2).layer !== 2) bad.push("第二層被蓋掉");
  if (c.jhMzLayers("pawn") !== 3) bad.push("仙人指路要有三層");
  if (!L) return bad;
  if ((L.guards || []).length !== 3) bad.push("兵衛陣列要三隻兵卒");
  /* 流水：往右踩進去 → 沖下一格、stop；下面是牆就不動；往上游一踩被沖回原處 */
  let S = mini(c, ["#####", "#.F.#", "#...#", "#####"], 1, 1), r = c.jhMzStep(S, 1, 0);
  if (S.player.x !== 2 || S.player.y !== 2 || !r.stop) bad.push(`踩上流水要被沖往下一格並停下（實際 ${S.player.x},${S.player.y} stop=${r.stop}）`);
  S = mini(c, ["#####", "#.F.#", "#####"], 1, 1); c.jhMzStep(S, 1, 0);
  if (S.player.x !== 2 || S.player.y !== 1) bad.push("流水下面是牆就不動");
  S = mini(c, ["#####", "#.F.#", "#...#", "#####"], 2, 2); c.jhMzStep(S, 0, -1);
  if (S.player.y !== 2) bad.push("往上游踩流水要被沖回原處");
  /* 自動走：繞過流水 */
  S = mini(c, ["#######", "#.....#", "#.FFF.#", "#.....#", "#######"], 1, 2);
  const pa = c.jhMzPath(S, 5, 2), steps = pa ? Array.from(pa, (q) => q.join(",")) : [];
  if (!pa || steps.some((q) => ["2,2", "3,2", "4,2"].includes(q))) bad.push("自動走要繞過流水（實際 " + steps.join(" ") + "）");
  /* 整層走得過 */
  const g = reach(c); if (g.plate < 0) bad.push("從入口走不到踏板"); else if (g.door < 0) bad.push("踩完踏板走不到石門前");
  return bad;
}

test("仙人指路第三層：登記、流水石階、自動走、三隻兵卒、走得過", () => {
  assert.deepEqual(problems(load()), []);
});

test("仙人指路第三層：題庫 3＋6 題、不跟第一、二層重複", () => {
  const c = load(), P3 = vm.runInContext("JH_MZ_POOL_PAWN3", c), P1 = vm.runInContext("JH_MZ_POOL_PAWN", c), P2 = vm.runInContext("JH_MZ_POOL_PAWN2", c);
  assert.equal(P3.door.length, 3); assert.equal(P3.trap.length, 6);
  const old = new Set([...P1.door, ...P1.trap, ...P2.door, ...P2.trap].map((q) => q.id)), ids = [...P3.door, ...P3.trap].map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length); for (const id of ids) assert.ok(!old.has(id), "跟前兩層重複：" + id);
  for (const q of [...P3.door, ...P3.trap]) assert.ok(q.fen && q.line.length % 2 === 1, q.id);
  const L = c.jhMzLvN("pawn", 3); assert.equal(L.puz.door, P3.door[0]); assert.equal(L.puz.trap, P3.trap[0]);
});

test("仙人指路第三層：修為 +60、存檔鍵分層、碑刻標「遊戲整理」", () => {
  const L = load().jhMzLvN("pawn", 3);
  assert.equal(L.xp, 60); assert.equal(L.xpKey, "maze:pawn:3"); assert.ok(/_L3$/.test(L.key));
  assert.ok(/遊戲整理/.test(L.lore[0].src));
});

test("改壞驗證：水不沖、自動走會踩流水、只剩兩隻兵，檢查都要抓得到", () => {
  const cases = [
    ["水不沖", { "07z9m-pawn3.js": (s) => s.replace("&&!(S.guards||[]).some(G=>G.x===P.x&&G.y===y))P.y=y;", "&&false)P.y=y;") }],
    ["自動走會踩流水", { "07z9m-pawn3.js": (s) => s.replace("avoid:\"F\",", "") }],
    ["只剩兩隻兵", { "07z9m-pawn3.js": (s) => s.replace(",{kind:\"pawn\",x:7,y:6,dx:1,dy:1}];", "];") }],
  ];
  for (const [name, patch] of cases) {
    const f = Object.keys(patch)[0], orig = rd(f); assert.notEqual(patch[f](orig), orig, name + "：改壞的程式要真的有改到");
    assert.ok(problems(load(patch)).length > 0, name + "：檢查要抓得到");
  }
});
