/* W87-2（11/26）飛相地底迷宮第二層「淤泥闈場」（m/07z9m-elephant2.js；共用 m/07z9m-maze.js 的 afterMove、avoid）：
   用 vm 跑真的程式（共用程式、碑刻、十派第一層、仙人指路與飛相第二層）：
   登記成第二層不動第一層、淤泥一路滑到底（被牆、考箱擋住才停；滑完回 stop:true）、考箱推進淤泥當煞車、推開後淤泥還原、自動走不主動踩淤泥；
   用真的 jhMzStep 在狀態空間上搜尋：從入口走得到踏板、再走得到石門前，途中沒被相抓、也沒被看到（spot）；
   題庫（石門 3 題馬收尾殺題、被抓 6 題解殺題、不跟第一層重複）。
   「改壞驗證」：同一組檢查拿去跑改壞的程式（淤泥不滑、考箱不能推進淤泥、自動走會踩淤泥），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const FILES = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js", "07z9m-central2.js", "07z9m-pawn2.js", "07z9m-elephant2.js"];

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
const L2 = (c) => c.jhMzLvN("elephant", 2);
const cell = (S, x, y) => (S.grid[y] || [])[x];
/* 一個小的乾淨狀態：自訂地圖，玩家站好位置，沒有守衛 */
function mini(c, rows, px, py) {
  const S = c.jhMzNew(L2(c)); S.grid = rows.map((r) => r.split("")); S.W = rows[0].length; S.H = rows.length; S.guards = []; S.chests = new Set();
  S.lv = Object.assign({}, S.lv, { map: rows }); S.player = { x: px, y: py, face: 1 }; for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) S.seen.add(y * S.W + x); return S;
}
/* 用真的 jhMzStep 搜尋：狀態＝玩家位置＋考箱位置＋守衛位置＋踏板；一步不能是撞牆（不算回合）、不能被抓或被看到 */
function reach(c) {
  const S0 = c.jhMzNew(L2(c)), find = (ch) => { for (let y = 0; y < S0.H; y++) for (let x = 0; x < S0.W; x++) if (S0.lv.map[y][x] === ch) return { x, y } }, dr = find("D");
  S0.player = Object.assign({ face: 1 }, S0.start); S0.guards = (S0.lv.guards || []).map((g) => Object.assign({}, g));
  const clone = (S) => Object.assign(Object.create(Object.getPrototypeOf(S)), S, { grid: S.grid.map((r) => r.slice()), player: Object.assign({}, S.player), guards: S.guards.map((g) => Object.assign({}, g)), chests: new Set(S.chests), lit: new Set(S.lit), bag: Object.assign({}, S.bag), got: [] });
  const key = (S) => [S.player.x, S.player.y, S.plate ? 1 : 0, S.grid.map((r) => r.join("")).join("").replace(/[^X]/g, (m, i) => "").length, S.grid.map((r, y) => r.map((ch, x) => ch === "X" ? x + "." + y : "").join("")).join(""), S.guards.map((g) => g.x + "." + g.y + "." + g.dx + g.dy).join("|")].join(",");
  const seen = new Set([key(S0)]); let q = [S0], depth = 0, plate = -1;
  while (q.length && depth < 90) {
    const nq = [];
    for (const S of q) {
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const T = clone(S), r = c.jhMzStep(T, dx, dy);
        if (!r || ["wall", "locked", "trap", "spot"].includes(r.ev)) { if (r && r.ev === "locked") { /* 石門前 */ } if (!(r && (r.ev === "door" || r.ev === "locked"))) continue }
        if (r.ev === "door") return { plate, door: depth + 1 };
        if (r.ev === "locked") continue;
        if (T.plate && plate < 0) plate = depth + 1;
        if (T.plate && Math.abs(T.player.x - dr.x) + Math.abs(T.player.y - dr.y) === 1) return { plate, door: depth + 1 };
        const k = key(T); if (seen.has(k)) continue; seen.add(k); nq.push(T);
      }
    }
    q = nq; depth++; if (seen.size > 400000) break;
  }
  return { plate, door: -1 };
}

function problems(c) {
  const bad = [], B = vm.runInContext("JH_MZ_LV", c).elephant, L = L2(c);
  if (!L || L.layer !== 2 || L === B) bad.push("第二層沒登記到");
  if (B.layer !== 1 || B.map !== vm.runInContext("JH_MZ_ELE_MAP", c)) bad.push("第一層被蓋掉");
  if (!L) return bad;
  /* 淤泥滑到底：右邊一排淤泥，盡頭是牆 → 停在最後一格淤泥上；中間有箱子 → 停在箱子前 */
  let S = mini(c, ["#######", "#.mmm.#", "#######"], 1, 1), r = c.jhMzStep(S, 1, 0);
  if (S.player.x !== 5 || !r.stop) bad.push(`淤泥要一路滑到底、滑完停下（實際停在 ${S.player.x}，stop=${r.stop}）`);
  S = mini(c, ["#######", "#.mmmm#", "#######"], 1, 1); c.jhMzStep(S, 1, 0);
  if (S.player.x !== 5) bad.push("淤泥盡頭是牆：停在最後一格淤泥上");
  S = mini(c, ["########", "#.mmXm.#", "########"], 1, 1); c.jhMzStep(S, 1, 0);
  if (S.player.x !== 3) bad.push(`淤泥裡有考箱要停在箱子前（實際 ${S.player.x}）`);
  /* 考箱推進淤泥、推開後淤泥還原 */
  S = mini(c, ["#######", "#.Xm..#", "#######"], 1, 1); c.jhMzStep(S, 1, 0);
  if (cell(S, 3, 1) !== "X") bad.push("考箱要推得進淤泥");
  if (cell(S, 2, 1) !== ".") bad.push("考箱推走後原本的平地要還原成平地");
  S = mini(c, ["########", "#.Xm...#", "########"], 1, 1); S.lv = Object.assign({}, S.lv, { map: ["########", "#.mm...#", "########"] }); S.grid[1][2] = "X";
  c.jhMzStep(S, 1, 0); if (cell(S, 2, 1) !== "m") bad.push("考箱從淤泥上推走後，那一格要還原成淤泥");
  /* 自動走：繞過淤泥，不主動踩；點的終點是淤泥可以 */
  S = mini(c, ["#######", "#.....#", "#.mmm.#", "#.....#", "#######"], 1, 2);
  const pa = c.jhMzPath(S, 5, 2), steps = pa ? Array.from(pa, (q) => q.join(",")) : [];
  if (!pa || steps.some((q) => ["2,2", "3,2", "4,2"].includes(q))) bad.push("自動走要繞過淤泥（實際 " + steps.join(" ") + "）");
  /* 整層走得過：入口 → 踏板 → 石門前 */
  const g = reach(c); if (g.plate < 0) bad.push("從入口走不到踏板"); else if (g.door < 0) bad.push("踩完踏板走不到石門前");
  return bad;
}

test("飛相第二層：登記、淤泥滑行、考箱煞車、自動走、走得過", () => {
  assert.deepEqual(problems(load()), []);
});

test("飛相第二層：石門 3 題馬收尾、被抓 6 題解殺題、不跟第一層重複", () => {
  const c = load(), L = c.jhMzLvN("elephant", 2), P1 = vm.runInContext("JH_MZ_ELE_POOL", c), P2 = L.pool;
  assert.equal(P2.door.length, 3); assert.equal(P2.trap.length, 6);
  const f1 = new Set([...P1.door, ...P1.trap].map((q) => q.fen)), all = [...P2.door, ...P2.trap];
  for (const q of all) assert.ok(!f1.has(q.fen), "跟第一層重複：" + q.fen);
  assert.equal(new Set(all.map((q) => q.fen)).size, all.length, "第二層自己不重複");
  for (const q of P2.trap) { assert.equal(q.kind, "defend"); assert.equal(q.line.length, 1); assert.ok(q.verify && q.verify.depth >= 22) }
  for (const q of P2.door) assert.ok(q.line.length % 2 === 1);
  /* 解殺題的答案在 core 規則下要合法：用第一層同一套的題目格式，答案的起點有紅子 */
  for (const q of P2.trap) { const rows = q.fen.split("/"), file = "abcdefghi".indexOf(q.line[0][0]), rank = +q.line[0][1], row = rows[9 - rank]; let x = 0, ch = ""; for (const k of row) { if (/\d/.test(k)) x += +k; else { if (x === file) ch = k; x++ } } assert.ok(/[A-Z]/.test(ch), q.fen + " 答案起點要是紅子") }
});

test("飛相第二層：修為 +40、存檔鍵分層、碑刻標「遊戲整理」", () => {
  const L = load().jhMzLvN("elephant", 2);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:elephant:2"); assert.ok(/_L2$/.test(L.key));
  assert.ok(/遊戲整理/.test(L.lore[0].src));
});

test("改壞驗證：淤泥不滑、考箱推不進淤泥、自動走會踩淤泥，檢查都要抓得到", () => {
  const cases = [
    ["淤泥不滑", { "07z9m-elephant2.js": (s) => s.replace("while(jhMzCell(S,P.x,P.y)===\"m\"){", "while(false){") }],
    ["考箱推不進淤泥", { "07z9m-elephant2.js": (s) => s.replace("if((c2!==\".\"&&c2!==\"m\")", "if((c2!==\".\")") }],
    ["自動走會踩淤泥", { "07z9m-elephant2.js": (s) => s.replace("avoid:\"m\",", "") }],
  ];
  for (const [name, patch] of cases) {
    const f = Object.keys(patch)[0], orig = rd(f); assert.notEqual(patch[f](orig), orig, name + "：改壞的程式要真的有改到");
    assert.ok(problems(load(patch)).length > 0, name + "：檢查要抓得到");
  }
});
