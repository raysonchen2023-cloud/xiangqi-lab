/* W87-2（11/26）飛相地底迷宮第三層「絕密號舍」（m/07z9m-elephant3.js；共用 m/07z9m-maze.js 的 jhMzLayer、onStep、canMove）：
   用 vm 跑真的程式（共用程式、碑刻、十派第一層、飛相第二、三層）：
   登記成第三層（不動第一、二層）、小水坑人走不過（撞牆不算回合）、破桌推進水坑會填平且桌子消失、破桌推到平地、自動走不走水坑、
   兩隻相都在上半場；用真的 jhMzStep 搜尋（狀態含破桌與水坑）從入口走得到踏板、再走得到石門前；題庫（石門兵收尾殺題 3 題、被抓解殺題 6 題、不跟前兩層重複）。
   「改壞驗證」：同一組檢查拿去跑改壞的程式（水坑可以走、桌子推不進水坑、自動走會走水坑），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const FILES = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js", "07z9m-elephant2.js", "07z9m-elephant3.js"];

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
const L3 = (c) => c.jhMzLvN("elephant", 3);
const cell = (S, x, y) => (S.grid[y] || [])[x];
function mini(c, rows, px, py) {
  const S = c.jhMzNew(L3(c)); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = []; S.chests = new Set();
  S.lv = Object.assign({}, S.lv, { map: rows }); S.player = { x: px, y: py, face: 1 }; for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) S.seen.add(y * S.W + x); return S;
}
function reach(c) {
  const S0 = c.jhMzNew(L3(c)), find = (ch) => { for (let y = 0; y < S0.H; y++) for (let x = 0; x < S0.W; x++) if (S0.lv.map[y][x] === ch) return { x, y } }, dr = find("D");
  S0.player = Object.assign({ face: 1 }, S0.start); S0.guards = (S0.lv.guards || []).map((g) => Object.assign({}, g));
  const clone = (S) => Object.assign(Object.create(Object.getPrototypeOf(S)), S, { grid: S.grid.map((r) => r.slice()), player: Object.assign({}, S.player), guards: S.guards.map((g) => Object.assign({}, g)), chests: new Set(S.chests), lit: new Set(S.lit), bag: Object.assign({}, S.bag), got: [] });
  const key = (S) => [S.player.x, S.player.y, S.plate ? 1 : 0, S.grid.map((r) => r.map((ch) => (ch === "X" || ch === "q") ? ch : "").join(".")).join("/"), S.guards.map((g) => [g.x, g.y, g.dx, g.dy].join(":")).join("|")].join(",");
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
    q = nq; depth++; if (seen.size > 800000) break;
  }
  return { plate, door: -1 };
}

function problems(c) {
  const bad = [], B = vm.runInContext("JH_MZ_LV", c).elephant, L = L3(c);
  if (!L || L.layer !== 3) bad.push("第三層沒登記到");
  if (B.layer !== 1 || B.map !== vm.runInContext("JH_MZ_ELE_MAP", c)) bad.push("第一層被蓋掉");
  if (c.jhMzLvN("elephant", 2).layer !== 2) bad.push("第二層被蓋掉");
  if (c.jhMzLayers("elephant") !== 3) bad.push("飛相要有三層");
  if (!L) return bad;
  if ((L.guards || []).length !== 2 || L.guards.some((g) => g.y > 9)) bad.push("兩隻相都要在河的上半場");
  /* 水坑：走不過、撞牆不算回合 */
  let S = mini(c, ["######", "#.q..#", "######"], 1, 1), t0 = S.turn, r = c.jhMzStep(S, 1, 0);
  if (r.ev !== "wall" || S.player.x !== 1 || S.turn !== t0) bad.push("水坑要走不過去、撞到不算回合");
  /* 推桌：推進水坑填平、桌子消失；推到平地照常 */
  S = mini(c, ["######", "#.Xq.#", "######"], 1, 1); c.jhMzStep(S, 1, 0);
  if (cell(S, 3, 1) !== "." || cell(S, 2, 1) !== ".") bad.push(`破桌推進水坑要填平成平地、桌子消失（實際 ${S.grid[1].join("")}）`);
  S = mini(c, ["######", "#.X..#", "######"], 1, 1); c.jhMzStep(S, 1, 0);
  if (cell(S, 3, 1) !== "X") bad.push("破桌推到平地要照常移過去");
  /* 自動走不走水坑 */
  S = mini(c, ["#######", "#.....#", "#.qqq.#", "#.....#", "#######"], 1, 2);
  const pa = c.jhMzPath(S, 5, 2), steps = pa ? Array.from(pa, (q) => q.join(",")) : [];
  if (!pa || steps.some((q) => ["2,2", "3,2", "4,2"].includes(q))) bad.push("自動走要繞過水坑（實際 " + steps.join(" ") + "）");
  const g = reach(c); if (g.plate < 0) bad.push("從入口走不到踏板"); else if (g.door < 0) bad.push("踩完踏板走不到石門前");
  return bad;
}

test("飛相第三層：登記、小水坑、破桌填坑、自動走、雙相、走得過", () => {
  assert.deepEqual(problems(load()), []);
});

test("飛相第三層：石門 3 題兵收尾、被抓 6 題解殺題、不跟前兩層重複", () => {
  const c = load(), L = c.jhMzLvN("elephant", 3), P = L.pool, P1 = vm.runInContext("JH_MZ_ELE_POOL", c), P2 = c.jhMzLvN("elephant", 2).pool;
  assert.equal(P.door.length, 3); assert.equal(P.trap.length, 6);
  const old = new Set([...P1.door, ...P1.trap, ...P2.door, ...P2.trap].map((q) => q.fen)), all = [...P.door, ...P.trap];
  for (const q of all) assert.ok(!old.has(q.fen), "跟前兩層重複：" + q.fen);
  assert.equal(new Set(all.map((q) => q.fen)).size, all.length);
  for (const q of P.trap) { assert.equal(q.kind, "defend"); assert.equal(q.line.length, 1); assert.ok(q.verify.depth >= 22) }
});

test("飛相第三層：修為 +60、存檔鍵分層、碑刻標「遊戲整理」與清修", () => {
  const L = load().jhMzLvN("elephant", 3);
  assert.equal(L.xp, 60); assert.equal(L.xpKey, "maze:elephant:3"); assert.ok(/_L3$/.test(L.key));
  assert.ok(/遊戲整理/.test(L.lore[0].src) && /清修/.test(L.lore[0].src));
});

test("改壞驗證：水坑可以走、桌子推不進水坑、自動走會走水坑，檢查都要抓得到", () => {
  const cases = [
    ["水坑可以走", { "07z9m-elephant3.js": (s) => s.replace("if(c===\"q\")return{ev:\"wall\"", "if(false)return{ev:\"wall\"") }],
    ["桌子推不進水坑", { "07z9m-elephant3.js": (s) => s.replace("if((c2!==\".\"&&c2!==\"q\")", "if((c2!==\".\")") }],
    ["自動走會走水坑", { "07z9m-elephant3.js": (s) => s.replace(",canMove:jhMzEle3CanMove", "") }],
  ];
  for (const [name, patch] of cases) {
    const f = Object.keys(patch)[0], orig = rd(f); assert.notEqual(patch[f](orig), orig, name + "：改壞的程式要真的有改到");
    assert.ok(problems(load(patch)).length > 0, name + "：檢查要抓得到");
  }
});
