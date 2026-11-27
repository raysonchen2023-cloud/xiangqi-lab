/* W87-2（11/26）起馬地底迷宮第二層「烽火暗驛」（m/07z9m-horse2.js；共用 m/07z9m-maze.js 的 afterMove、avoid）：
   用 vm 跑真的程式（共用程式、碑刻、十派第一層、第二層）：
   登記成第二層不動第一層、追跡野馬只慢 2 步、碎瓦片踩了會碎＋野馬那一回合多跳一步＋回 stop:true、自動走不主動踩瓦片；
   用真的 jhMzStep 搜尋（狀態含野馬足跡）：從入口走得到踏板、再走得到石門前，途中沒被抓、沒被看到；題庫 3＋6 題、不跟第一層重複。
   「改壞驗證」：同一組檢查拿去跑改壞的程式（野馬慢 3 步、瓦片不讓野馬多跳、自動走會踩瓦片），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const FILES = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js", "07z9m-central2.js", "07z9m-horse2.js"];

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
const L2 = (c) => c.jhMzLvN("horse", 2);
const cell = (S, x, y) => (S.grid[y] || [])[x];

/* 用真的 jhMzStep 搜尋：狀態＝玩家位置＋踏板＋瓦片＋野馬位置與足跡；一步不能撞牆（不算回合）、不能被抓或被看到 */
function reach(c) {
  const S0 = c.jhMzNew(L2(c)), find = (ch) => { for (let y = 0; y < S0.H; y++) for (let x = 0; x < S0.W; x++) if (S0.lv.map[y][x] === ch) return { x, y } }, dr = find("D");
  S0.player = Object.assign({ face: 1 }, S0.start); S0.guards = (S0.lv.guards || []).map((g) => Object.assign({}, g));
  const clone = (S) => Object.assign(Object.create(Object.getPrototypeOf(S)), S, { grid: S.grid.map((r) => r.slice()), player: Object.assign({}, S.player), guards: S.guards.map((g) => Object.assign({}, g, { tr: (g.tr || []).map((p) => p.slice()) })), chests: new Set(S.chests), lit: new Set(S.lit), bag: Object.assign({}, S.bag), got: [] });
  const key = (S) => [S.player.x, S.player.y, S.plate ? 1 : 0, S.grid.map((r) => r.join("")).join("").replace(/[^V]/g, "").length, S.guards.map((g) => [g.x, g.y, g.dx, g.dy, (g.tr || []).map((p) => p.join(".")).join(";")].join(":")).join("|")].join(",");
  const seen = new Set([key(S0)]); let q = [S0], depth = 0, plate = -1;
  while (q.length && depth < 90) {
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
  const bad = [], B = vm.runInContext("JH_MZ_LV", c).horse, L = L2(c), K = vm.runInContext("jhMzKind", c);
  if (!L || L.layer !== 2 || L === B) bad.push("第二層沒登記到");
  if (B.layer !== 1 || B.map !== vm.runInContext("JH_MZ_HORSE_MAP", c)) bad.push("第一層被蓋掉");
  if (!L) return bad;
  /* 野馬只慢 2 步：足跡最多記 3 格（第一層 4 格） */
  const S = c.jhMzNew(L); S.guards = []; const G = { kind: "wildhorse2", x: 7, y: 8, dx: 2, dy: 1, tr: [] };
  for (const [x, y] of [[7, 18], [6, 18], [5, 18], [4, 18]]) { S.player = { x, y }; K(G).step(S, G) }
  if (G.tr.length !== 3 || G.tr[0][0] !== 6) bad.push("野馬只記 LAG+1＝3 格足跡（只慢 2 步，走 4 步後最舊那格要丟掉）");
  /* 碎瓦片：踩了碎成平地、野馬那一回合多跳一步、回 stop:true（跟同一局面但瓦片換成平地比） */
  const mk = (tile) => { const X = c.jhMzNew(L); X.grid[10][4] = tile; X.guards = [{ kind: "wildhorse2", x: 2, y: 16, dx: -2, dy: -1, tr: [[9, 12], [7, 12], [5, 12]] }]; X.player = { x: 5, y: 10, face: 1 }; return X };
  const T = mk("t"), U = mk("."), before = cell(T, 4, 10), r = c.jhMzStep(T, -1, 0); c.jhMzStep(U, -1, 0);
  if (before !== "t") bad.push("測試地圖：(4,10) 要是瓦片");
  if (cell(T, 4, 10) !== ".") bad.push("瓦片踩過要碎成平地");
  if (!r.stop) bad.push("踩到瓦片要回 stop:true（自動走停下）");
  if (T.guards[0].x === U.guards[0].x && T.guards[0].y === U.guards[0].y) bad.push("踩到瓦片那一回合野馬要多跳一步（位置要跟沒踩瓦片不同）");
  if (T.guards[0].rush) bad.push("多跳一步只限那一回合");
  const d2 = (X) => (X.guards[0].x - X.player.x) ** 2 + (X.guards[0].y - X.player.y) ** 2;
  if (!(d2(T) < d2(U))) bad.push("踩到瓦片後野馬要離玩家更近（第二跳朝玩家）");
  /* 自動走：繞過瓦片 */
  const A = c.jhMzNew(L); for (let y = 0; y < A.H; y++) for (let x = 0; x < A.W; x++) A.seen.add(y * A.W + x); A.player = { x: 3, y: 10 };
  const pa = c.jhMzPath(A, 5, 10), steps = pa ? Array.from(pa, (q) => q.join(",")) : [];
  if (!pa || steps.slice(0, -1).includes("4,10")) bad.push("自動走要繞過瓦片（實際 " + steps.join(" ") + "）");
  /* 整層走得過 */
  const g = reach(c); if (g.plate < 0) bad.push("從入口走不到踏板"); else if (g.door < 0) bad.push("踩完踏板走不到石門前");
  return bad;
}

test("起馬第二層：登記、野馬慢 2 步、碎瓦片、自動走、走得過", () => {
  assert.deepEqual(problems(load()), []);
});

test("起馬第二層：題庫 3＋6 題、每題有棋譜、不跟第一層重複", () => {
  const c = load(), P2 = vm.runInContext("JH_MZ_POOL_HORSE2", c), P1 = vm.runInContext("JH_MZ_POOL_HORSE", c);
  assert.equal(P2.door.length, 3); assert.equal(P2.trap.length, 6);
  const ids1 = new Set([...P1.door, ...P1.trap].map((q) => q.id)), ids2 = [...P2.door, ...P2.trap].map((q) => q.id);
  assert.equal(new Set(ids2).size, ids2.length); for (const id of ids2) assert.ok(!ids1.has(id), "跟第一層重複：" + id);
  for (const q of [...P2.door, ...P2.trap]) assert.ok(q.fen && q.line.length % 2 === 1, q.id);
  const L = c.jhMzLvN("horse", 2); assert.equal(L.puz.door, P2.door[0]); assert.equal(L.puz.trap, P2.trap[0]);
});

test("起馬第二層：修為 +40、存檔鍵分層、碑刻標「遊戲整理」與清修", () => {
  const L = load().jhMzLvN("horse", 2);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:horse:2"); assert.ok(/_L2$/.test(L.key));
  assert.ok(/遊戲整理/.test(L.lore[0].src) && /清修/.test(L.lore[0].src));
});

test("改壞驗證：野馬慢 3 步、瓦片不讓野馬多跳、自動走會踩瓦片，檢查都要抓得到", () => {
  const cases = [
    ["野馬慢 3 步", { "07z9m-horse2.js": (s) => s.replace("const JH_MZ_HORSE2_LAG=2;", "const JH_MZ_HORSE2_LAG=3;") }],
    ["瓦片不讓野馬多跳", { "07z9m-horse2.js": (s) => s.replace("if(G.kind===\"wildhorse2\")G.rush=1;", "") }],
    ["自動走會踩瓦片", { "07z9m-horse2.js": (s) => s.replace("avoid:\"t\",", "") }],
  ];
  for (const [name, patch] of cases) {
    const f = Object.keys(patch)[0], orig = rd(f); assert.notEqual(patch[f](orig), orig, name + "：改壞的程式要真的有改到");
    assert.ok(problems(load(patch)).length > 0, name + "：檢查要抓得到");
  }
});
