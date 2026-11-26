/* W87-2（11/26）仕角炮地底迷宮第二層「質庫暗房」（m/07z9m-corner2.js）：可轉銅鏡（往鏡子走＝花一回合順時針轉 90 度、人不動、守衛照走；轉完光束照亮一整條，光束上的朝奉眩暈 2 回合；
   走到鏡子旁邊只照亮、不照暈；被擋光的東西擋住光束）；朝奉照第一層；地圖走得完、有不被抓的路、任一個朝奉慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋208 複核（iMac Claude 1）＋開發者 11/26 決定（被抓一律殺題、修為 +40、只在同一派各層不重複）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的程式（鏡子不轉、逆時針轉、光束照不暈、走到旁邊也照暈、轉鏡不算回合），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-corner2.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/advisor_corner?l=2" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-corner.js", "07z9m-corner2.js"]) vm.runInContext(f === "07z9m-corner2.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L2 = (c) => c.jhMzLvN("advisor_corner", 2);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 9×5 房間：銅鏡在東牆 (8,3)、一開始朝南；朝奉那一間在 (1,2)～(3,4)；i＝朝奉巡路第幾步（0＝中心 (2,3)，5＝右下角 (3,4)）；玩家站 (7,3) */
function room(c, i, marks) { const rows = ["#########", "#.......#", "#.......#", "#.......B", "#.......#", "#########"].map((r) => r.split(""));
  for (const k in marks || {}) { const [x, y] = k.split(",").map(Number); rows[y][x] = marks[k] }
  const S = c.jhMzNew(L2(c)), P = vm.runInContext("JH_MZ_CORNER_PATH", c)[i]; S.grid = rows; S.W = 9; S.H = 6; S.mir = { "8,3": 1 }; S.seen = new Set(); S.turn = 0;
  S.guards = [{ kind: "advisor", room: [1, 2], i, x: 1 + P[0], y: 2 + P[1], stun: 0 }]; S.guard = S.guards[0]; at(S, 7, 3); return S }

function mirrorProblems(c) {
  const bad = [];
  let S = room(c, 0), G = S.guard, r = c.jhMzStep(S, 1, 0);
  if (S.mir["8,3"] !== 2) bad.push("撞向銅鏡：順時針轉 90 度（南→西）（實際 " + S.mir["8,3"] + "）");
  if (S.player.x !== 7) bad.push("轉鏡時人不動");
  if (S.turn !== 1) bad.push("轉鏡算一回合");
  if (!S.seen.has(3 * 9 + 2) || !S.seen.has(3 * 9 + 6)) bad.push("轉完光束照亮整條");
  if (!(G.stun > 0) || G.x !== 2 || G.y !== 3) bad.push("光束照到的朝奉眩暈（不動）");
  if (r.ev === "trap") bad.push("轉鏡那一回合不直接抓人");
  /* 不在光束上的朝奉不暈；照完兩回合後醒來 */
  S = room(c, 5); c.jhMzStep(S, 1, 0); if (S.guard.stun > 0) bad.push("不在光束上的朝奉不暈");
  S = room(c, 0); c.jhMzStep(S, 1, 0); c.jhMzStep(S, -1, 0); c.jhMzStep(S, 1, 0); if (S.guard.stun > 0) bad.push("眩暈 2 回合就醒");
  /* 被擋光的東西擋住光束 */
  S = room(c, 5, { "5,3": "#" }); c.jhMzStep(S, 1, 0); if (S.seen.has(3 * 9 + 4) || !S.seen.has(3 * 9 + 6)) bad.push("光束被牆擋住，牆後面照不到");
  /* 走到銅鏡旁邊：照亮、不暈 */
  S = room(c, 0); S.mir["8,3"] = 2; at(S, 7, 2); c.jhMzStep(S, 0, 1);
  if (!S.seen.has(3 * 9 + 3)) bad.push("走到銅鏡旁邊：照亮它朝的那一條"); if (S.guard.stun > 0) bad.push("走到旁邊只照亮、不照暈");
  if (S.mir["8,3"] !== 2) bad.push("走到旁邊不轉鏡");
  /* 撞一般牆照常 */
  S = room(c, 0); at(S, 7, 1); if (c.jhMzStep(S, 1, 0).ev !== "wall") bad.push("撞一般的牆照常是牆");
  return bad;
}

test("登記：仕角炮第二層；三個朝奉（照第一層）；三面可轉銅鏡都嵌在牆裡（擋路擋光）；碑刻一則；寶箱有頭像框「算盤珠璣」；修為 +40", () => {
  const c = load(), L = L2(c), M = L.map, M0 = vm.runInContext("JH_MZ_CORNER2_MIR0", c);
  assert.equal(L.layer, 2); assert.equal(c.jhMzLayers("advisor_corner"), 2); assert.equal(L.guards.length, 3); for (const G of L.guards) assert.equal(G.kind, "advisor");
  assert.ok(L.solid.includes("B") && L.opaque.includes("B")); assert.equal(typeof L.onStep, "function");
  assert.equal(Object.keys(M0).length, M.join("").split("B").length - 1, "每面銅鏡都有登記");
  for (const k of Object.keys(M0)) { const [x, y] = k.split(",").map(Number); assert.equal(M[y][x], "B", k); assert.ok(M0[k] >= 0 && M0[k] <= 3, k + " 一開始的方向") }
  assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據沈德符《萬曆野獲編》/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "frame"]); assert.match(L.rew[2].zh, /算盤珠璣/);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:advisor_corner:2"); assert.equal(L.key, "jhMaze_advisor_corner_L2");
});

test("可轉銅鏡的規則都符合（順時針轉、人不動、算一回合、光束照亮、照到的朝奉眩暈 2 回合、不在光束上不暈、被牆擋住、走到旁邊只照亮不暈、撞一般牆照常）", () => {
  assert.deepEqual(mirrorProblems(load()), []);
});

test("改壞驗證：鏡子不轉、逆時針轉、光束照不暈、走到旁邊也照暈、轉鏡不算回合，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace("M[k]=(M[k]+1)%4;", "");
  const P2 = (s) => s.replace("M[k]=(M[k]+1)%4;", "M[k]=(M[k]+3)%4;");
  const P3 = (s) => s.replace("if(stun)for(const G of S.guards||[])", "if(false)for(const G of S.guards||[])");
  const P4 = (s) => s.replace("jhMzCorner2Beam(S,nx+a,ny+b,false)", "jhMzCorner2Beam(S,nx+a,ny+b,true)");
  const P5 = (s) => s.replace("jhMzCorner2Beam(S,nx,ny,true);S.turn++;jhMzGuardStep(S);", "jhMzCorner2Beam(S,nx,ny,true);");
  for (const P of [P1, P2, P3, P4, P5]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(mirrorProblems(load(P1)).some((s) => s.includes("順時針")), "鏡子不轉");
  assert.ok(mirrorProblems(load(P2)).some((s) => s.includes("順時針")), "逆時針轉");
  assert.ok(mirrorProblems(load(P3)).some((s) => s.includes("眩暈")), "光束照不暈");
  assert.ok(mirrorProblems(load(P4)).some((s) => s.includes("不照暈")), "走到旁邊也照暈");
  assert.ok(mirrorProblems(load(P5)).some((s) => s.includes("一回合")), "轉鏡不算回合");
});

function reach(c, S) { const lv = L2(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻；全部走得到；每面銅鏡旁邊都站得到人、一開始射不進朝奉房、順時針轉一次就射進一間；朝奉那一間都是地面；開局不會被抓", () => {
  const c = load(), L = L2(c), M = L.map, W = M[0].length, M0 = vm.runInContext("JH_MZ_CORNER2_MIR0", c);
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  for (const k of Object.keys(M0)) { const [x, y] = k.split(",").map(Number);
    assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => all.has((y + b) * W + x + a)), "銅鏡 " + k + " 旁邊站得到人");
    const D = vm.runInContext("JH_MZ_CORNER2_DIR", c), into = (i) => { const [a, b] = D[i]; return S.guards.some((G) => x + a >= G.room[0] && x + a <= G.room[0] + 2 && y + b >= G.room[1] && y + b <= G.room[1] + 2) };
    assert.ok(!into(M0[k]), "銅鏡 " + k + " 一開始射不進朝奉房"); assert.ok(into((M0[k] + 1) % 4), "銅鏡 " + k + " 順時針轉一次就射進一間朝奉房") }
  for (const G of S.guards) for (let y = G.room[1]; y < G.room[1] + 3; y++) for (let x = G.room[0]; x < G.room[0] + 3; x++) assert.ok(!c.jhMzSolid(S, x, y), "朝奉那一間是地面 " + x + "," + y);
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

const safeWalk = (c, S) => { const L = L2(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.mir = T.mir && { ...T.mir }; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + JSON.stringify(T.mir || 0) + "," + T.guards.map((G) => [G.x, G.y, G.i, G.stun || 0].join(":")).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 300 && q.length && !door; st++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 30000 ? nq.slice(0, 30000) : nq }
  return door };
test("走一趟：一定有一條不被朝奉看到的路，先踩踏板、再走到石門前；任一個朝奉慢 1～7 回合都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L2(c))); assert.ok(door && door.plate);
  const bad = []; for (let g = 0; g < 3; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L2(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（兵收尾：仕角支點）、被抓至少 5 題（車收尾的殺題）；core.js 獨立重算；不跟仕角炮第一層重複（只在同一派各層不重複）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_CORNER2", c), T = vm.runInContext("JH_MZ_POOL_CORNER2_TRAP", c), same = [poolOf(rd("07z9m-corner.js"), "JH_MZ_POOL_CORNER"), poolOf(rd("07z9m-corner.js"), "JH_MZ_POOL_CORNER_TRAP")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L2(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(same.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 9, "仕角炮第一層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x);
    assert.ok(!ids.has(x.id), "跟仕角炮第一層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, door ? "P" : "R", x.id + " 最後一步");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-corner2.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_CORNER2／jhMzCorner2 前綴；m.html 排在仕角炮第一層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_CORNER2|JH_MZ_POOL_CORNER2|jhMzCorner2)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-corner.js") > 0 && i("07z9m-corner2.js") > i("07z9m-corner.js") && i("07z9m-corner2.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-corner2.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
