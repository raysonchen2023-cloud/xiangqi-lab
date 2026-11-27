/* W87-2（11/26）起馬地底迷宮第三層「急遞暗房」（m/07z9m-horse3.js；共用 m/07z9m-maze.js 的 jhMzLayer、onStep、canMove）：
   用 vm 跑真的程式（共用程式、碑刻、十派第一層、起馬第二、三層）：
   登記成第三層（不動第一、二層）、單向驛門照方向（順向走得過、反向撞牆不算回合）、自動走照驛門方向找路、
   野馬不能落在驛門上也不能把馬腿踩在驛門上、兩匹野馬一匹慢 2 步一匹慢 4 步；
   用真的 jhMzStep 搜尋（狀態含兩匹野馬的足跡）從入口走得到踏板、再走得到石門前；題庫 3＋6 題、修為 +60。
   「改壞驗證」：同一組檢查拿去跑改壞的程式（驛門兩邊都能走、野馬能落在驛門上、自動走不看驛門方向），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const FILES = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js", "07z9m-horse2.js", "07z9m-horse3.js"];

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
const L3 = (c) => c.jhMzLvN("horse", 3);
function mini(c, rows, px, py) {
  const S = c.jhMzNew(L3(c)); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = []; S.chests = new Set();
  S.lv = Object.assign({}, S.lv, { map: rows }); S.player = { x: px, y: py, face: 1 }; for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) S.seen.add(y * S.W + x); return S;
}
function reach(c) {
  const S0 = c.jhMzNew(L3(c)), find = (ch) => { for (let y = 0; y < S0.H; y++) for (let x = 0; x < S0.W; x++) if (S0.lv.map[y][x] === ch) return { x, y } }, dr = find("D");
  S0.player = Object.assign({ face: 1 }, S0.start); S0.guards = (S0.lv.guards || []).map((g) => Object.assign({}, g));
  const clone = (S) => Object.assign(Object.create(Object.getPrototypeOf(S)), S, { grid: S.grid.map((r) => r.slice()), player: Object.assign({}, S.player), guards: S.guards.map((g) => Object.assign({}, g, { tr: (g.tr || []).map((p) => p.slice()) })), chests: new Set(S.chests), lit: new Set(S.lit), bag: Object.assign({}, S.bag), got: [] });
  const key = (S) => [S.player.x, S.player.y, S.plate ? 1 : 0, S.guards.map((g) => [g.x, g.y, g.dx, g.dy, (g.tr || []).map((p) => p.join(".")).join(";")].join(":")).join("|")].join(",");
  const seen = new Set([key(S0)]); let q = [S0], depth = 0, plate = -1;
  while (q.length && depth < 110) {
    const nq = [];
    for (const S of q) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const T = clone(S), r = c.jhMzStep(T, dx, dy);
      if (!r || ["wall", "locked", "trap", "spot"].includes(r.ev)) continue;
      if (r.ev === "door") return { plate, door: depth + 1 };
      if (T.plate && plate < 0) plate = depth + 1;
      if (T.plate && Math.abs(T.player.x - dr.x) + Math.abs(T.player.y - dr.y) === 1) return { plate, door: depth + 1 };
      const k = key(T); if (seen.has(k)) continue; seen.add(k); nq.push(T);
    }
    q = nq; depth++; if (seen.size > 900000) break;
  }
  return { plate, door: -1 };
}

function problems(c) {
  const bad = [], B = vm.runInContext("JH_MZ_LV", c).horse, L = L3(c), K = vm.runInContext("jhMzKind", c);
  if (!L || L.layer !== 3) bad.push("第三層沒登記到");
  if (B.layer !== 1 || B.map !== vm.runInContext("JH_MZ_HORSE_MAP", c)) bad.push("第一層被蓋掉");
  if (c.jhMzLvN("horse", 2).layer !== 2) bad.push("第二層被蓋掉");
  if (c.jhMzLayers("horse") !== 3) bad.push("起馬要有三層");
  if (!L) return bad;
  const lags = (L.guards || []).map((g) => g.lag).sort().join(",");
  if (lags !== "2,4") bad.push("兩匹野馬要一匹慢 2 步、一匹慢 4 步（實際 " + lags + "）");
  /* 驛門 j（往東）：從西邊往東走得過、從東邊往西撞牆不算回合 */
  let S = mini(c, ["######", "#.j..#", "######"], 1, 1), r = c.jhMzStep(S, 1, 0);
  if (S.player.x !== 2) bad.push("驛門順向要走得進去");
  S = mini(c, ["######", "#.j..#", "######"], 3, 1); const t0 = S.turn; r = c.jhMzStep(S, -1, 0);
  if (r.ev !== "wall" || S.player.x !== 3 || S.turn !== t0) bad.push("驛門反向要撞牆、不算回合");
  /* 自動走：只能從順向繞 */
  S = mini(c, ["#######", "#.....#", "#.##..#", "#..j..#", "#######"], 4, 3);
  const pa = c.jhMzPath(S, 1, 3), steps = pa ? Array.from(pa, (q) => q.join(",")) : [];
  if (!pa || steps.includes("3,3")) bad.push("自動走不能反向穿驛門（實際 " + steps.join(" ") + "）");
  /* 野馬：落點或馬腿是驛門就不能跳 */
  S = mini(c, ["#######", "#.....#", "#..j..#", "#.....#", "#.....#", "#######"], 5, 4);
  const G = { kind: "wildhorse3", x: 1, y: 1, lag: 2 }; const sight = K(G).sight(S, G).map((q) => q.x + "," + q.y);
  if (sight.includes("3,2")) bad.push("野馬不能落在驛門上");
  const G2 = { kind: "wildhorse3", x: 2, y: 1, lag: 2 }; const s2 = K(G2).sight(S, G2).map((q) => q.x + "," + q.y);
  if (s2.includes("4,3")) bad.push("野馬的馬腿踩在驛門上就跳不過去");
  const g = reach(c); if (g.plate < 0) bad.push("從入口走不到踏板"); else if (g.door < 0) bad.push("踩完踏板走不到石門前");
  return bad;
}

test("起馬第三層：登記、單向驛門、自動走、野馬與驛門、走得過", () => {
  assert.deepEqual(problems(load()), []);
});

test("起馬第三層：題庫 3＋6 題、不跟前兩層重複", () => {
  const c = load(), P3 = vm.runInContext("JH_MZ_POOL_HORSE3", c), P1 = vm.runInContext("JH_MZ_POOL_HORSE", c), P2 = vm.runInContext("JH_MZ_POOL_HORSE2", c);
  assert.equal(P3.door.length, 3); assert.equal(P3.trap.length, 6);
  const old = new Set([...P1.door, ...P1.trap, ...P2.door, ...P2.trap].map((q) => q.id)), ids = [...P3.door, ...P3.trap].map((q) => q.id);
  assert.equal(new Set(ids).size, ids.length); for (const id of ids) assert.ok(!old.has(id), "跟前兩層重複：" + id);
  for (const q of [...P3.door, ...P3.trap]) assert.ok(q.fen && q.line.length % 2 === 1, q.id);
});

test("起馬第三層：修為 +60、存檔鍵分層、碑刻標「遊戲整理」、沒有「絆馬索」", () => {
  const c = load(), L = c.jhMzLvN("horse", 3);
  assert.equal(L.xp, 60); assert.equal(L.xpKey, "maze:horse:3"); assert.ok(/_L3$/.test(L.key));
  assert.ok(/遊戲整理/.test(L.lore[0].src));
  assert.ok(!/絆馬索/.test(JSON.stringify(L.say) + JSON.stringify(L.intro) + JSON.stringify(L.warn) + JSON.stringify(L.pool)));
});

test("改壞驗證：驛門兩邊都能走、野馬能落在驛門上、自動走不看驛門方向，檢查都要抓得到", () => {
  const cases = [
    ["驛門兩邊都能走", { "07z9m-horse3.js": (s) => s.replace("onStep:jhMzHorse3Step,", "") }],
    ["野馬能落在驛門上", { "07z9m-horse3.js": (s) => s.replace("return!jhMzHorse3Gate(S,G.x+dx,G.y+dy)&&!jhMzHorse3Gate(S,lx,ly)}", "return true}") }],
    ["自動走不看驛門方向", { "07z9m-horse3.js": (s) => s.replace(",canMove:jhMzHorse3CanMove", "") }],
  ];
  for (const [name, patch] of cases) {
    const f = Object.keys(patch)[0], orig = rd(f); assert.notEqual(patch[f](orig), orig, name + "：改壞的程式要真的有改到");
    assert.ok(problems(load(patch)).length > 0, name + "：檢查要抓得到");
  }
});

