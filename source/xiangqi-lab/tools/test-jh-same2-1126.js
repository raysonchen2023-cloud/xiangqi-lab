/* W87-2（11/26）順炮地底迷宮第二層「熬波坑道」（m/07z9m-same2.js）：餘溫灰燼（走進去激起火星、四周 5 格照得到的看清楚、亮 2 回合、自動走不主動踩）；
   衝刺暗哨（平常照第一層 dash；火星亮著、同一條直線、中間沒擋 → 轉向朝火星衝、衝到火星那一格停）；地圖走得完、有不被抓的路、任一個暗哨慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋208 複核（iMac Claude 1）＋開發者 11/26 決定（被抓一律殺題、修為 +40）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的程式（火星不會熄、隔牆也被吸引、斜的也被吸引、火星不照亮），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-same2.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/same_cannon?l=2" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-same.js", "07z9m-same2.js"]) vm.runInContext(f === "07z9m-same2.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L2 = (c) => c.jhMzLvN("same_cannon", 2);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 13×7 的房間：第 3 列是長廊；marks＝{"x,y":字元} */
function room(c, marks, guards, px, py) { const rows = []; for (let y = 0; y < 7; y++) { const r = (y === 0 || y === 6 ? "#".repeat(13) : "#" + ".".repeat(11) + "#").split(""); for (const k in marks || {}) { const [x, yy] = k.split(",").map(Number); if (yy === y) r[x] = marks[k] } rows.push(r.join("")) }
  const S = c.jhMzNew(L2(c)); S.grid = rows.map((r) => r.split("")); S.W = 13; S.H = 7; S.seen = new Set(); S.turn = 10;
  S.guards = (guards || []).map((g) => Object.assign({ kind: "flaredash", dx: 1, dy: 0 }, g)); S.guard = S.guards[0] || null; at(S, px == null ? 1 : px, py == null ? 5 : py); return S }

function sparkProblems(c) {
  const bad = [];
  /* 沒火星：跟第一層暗哨一樣（衝兩格） */
  let S = room(c, {}, [{ x: 2, y: 3 }]); c.jhMzGuardStep(S); if (S.guard.x !== 4) bad.push("沒火星：照第一層衝兩格（實際 " + S.guard.x + "）");
  /* 火星在同一列、身後：轉向朝火星衝兩格 */
  S = room(c, {}, [{ x: 8, y: 3, dx: 1 }]); S.flare = { x: 3, y: 3, at: 10 }; c.jhMzGuardStep(S);
  if (!(S.guard.x === 6 && S.guard.dx === -1)) bad.push("火星亮著、同一列：轉向朝火星衝兩格（實際 " + S.guard.x + "," + S.guard.dx + "）");
  /* 衝到火星那一格就停 */
  S = room(c, {}, [{ x: 4, y: 3, dx: 1 }]); S.flare = { x: 3, y: 3, at: 10 }; c.jhMzGuardStep(S); if (S.guard.x !== 3) bad.push("衝到火星那一格就停");
  /* 中間有牆：不理火星 */
  S = room(c, { "6,3": "#" }, [{ x: 8, y: 3, dx: 1 }]); S.flare = { x: 3, y: 3, at: 10 }; c.jhMzGuardStep(S); if (S.guard.dx !== 1) bad.push("中間有牆擋住：不理火星");
  /* 不在同一條直線：不理 */
  S = room(c, {}, [{ x: 8, y: 3, dx: 1 }]); S.flare = { x: 3, y: 1, at: 10 }; c.jhMzGuardStep(S); if (S.guard.dx !== 1) bad.push("火星不在同一條直線：不理");
  /* 亮 2 回合：過了就不理 */
  S = room(c, {}, [{ x: 8, y: 3, dx: 1 }]); S.flare = { x: 3, y: 3, at: 7 }; c.jhMzGuardStep(S); if (S.guard.dx !== 1) bad.push("火星亮 2 回合，過了就熄（不理）");
  S = room(c, {}, [{ x: 8, y: 3, dx: 1 }]); S.flare = { x: 3, y: 3, at: 8 }; c.jhMzGuardStep(S); if (S.guard.dx !== -1) bad.push("第 2 回合火星還亮");
  /* 走進灰燼：激起火星、四周 5 格照得到的看清楚、牆後看不到；走一般地面不會 */
  S = room(c, { "3,5": "A", "6,1": "#", "6,2": "#", "6,3": "#", "6,4": "#", "6,5": "#" }, [], 2, 5); c.jhMzStep(S, 1, 0);
  if (!S.flare || S.flare.x !== 3 || S.flare.y !== 5) bad.push("走進灰燼：激起火星");
  if (!S.seen.has(1 * 13 + 3) || !S.seen.has(5 * 13 + 5)) bad.push("火星照亮四周 5 格");
  if (S.seen.has(5 * 13 + 8)) bad.push("火星照不到牆後");
  S = room(c, {}, [], 2, 5); c.jhMzStep(S, 1, 0); if (S.flare) bad.push("走一般地面不會激起火星");
  return bad;
}

test("登記：順炮第二層；兩個衝刺暗哨；灰燼是自動走要避開的地形、不擋路不擋光；碑刻一則；寶箱有頭像「霜鹽結晶」；修為 +40", () => {
  const c = load(), L = L2(c);
  assert.equal(L.layer, 2); assert.equal(c.jhMzLayers("same_cannon"), 2); assert.equal(L.guards.length, 2); for (const G of L.guards) assert.equal(G.kind, "flaredash");
  assert.equal(L.avoid, "A"); assert.ok(!L.solid.includes("A") && !L.opaque.includes("A")); assert.ok(L.solid.includes("s") && L.solid.includes("L"));
  assert.equal(typeof L.onStep, "function"); assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據嘉靖《兩淮鹽法志》/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "face"]); assert.match(L.rew[2].zh, /霜鹽結晶/);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:same_cannon:2"); assert.equal(L.key, "jhMaze_same_cannon_L2");
});

test("火星和衝刺暗哨的規則都符合（沒火星照第一層、同一直線轉向衝、衝到火星停、牆擋不理、不同直線不理、亮 2 回合、灰燼激起火星照亮 5 格、牆後照不到）", () => {
  assert.deepEqual(sparkProblems(load()), []);
});

test("改壞驗證：火星不會熄、隔牆也被吸引、斜的也被吸引、火星不照亮，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace("S.turn<=S.flare.at+2", "true");
  const P2 = (s) => s.replace("for(let x=G.x+dx,y=G.y+dy;x!==F.x||y!==F.y;x+=dx,y+=dy)if(jhMzSolid(S,x,y))return null;", "");
  const P3 = (s) => s.replace("if((dx&&dy)||(!dx&&!dy))return null;", "if(!dx&&!dy)return null;if(dx&&dy)return[dx,0];");
  const P4 = (s) => s.replace("S.seen.add(yy*S.W+xx)", "0");
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(sparkProblems(load(P1)).some((s) => s.includes("熄")), "火星不會熄");
  assert.ok(sparkProblems(load(P2)).some((s) => s.includes("牆擋")), "隔牆也被吸引");
  assert.ok(sparkProblems(load(P3)).some((s) => s.includes("不同") || s.includes("同一條直線")), "斜的也被吸引");
  assert.ok(sparkProblems(load(P4)).some((s) => s.includes("照亮")), "火星不照亮");
});

test("自動走繞開灰燼、點的終點是灰燼可以走；暗哨被火星引過來時照樣會抓人", () => {
  const c = load(), T = c.jhMzNew(L2(c)); T.grid = ["#######", "#.....#", "#.###.#", "#.AAA.#", "#######"].map((r) => r.split("")); T.W = 7; T.H = 5; T.guards = []; T.guard = null;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) T.seen.add(y * 7 + x); at(T, 1, 3);
  const p = Array.from(c.jhMzPath(T, 5, 3), (q) => q.join(",")); assert.ok(!p.some((q) => /^[234],3$/.test(q)), "繞開灰燼：" + p.join(" "));
  assert.deepEqual(Array.from(c.jhMzPath(T, 2, 3), (q) => q.join(",")), ["2,3"]);
  const S = room(c, {}, [{ x: 8, y: 3, dx: 1 }], 4, 3); S.flare = { x: 4, y: 3, at: 10 }; c.jhMzGuardStep(S); assert.ok(c.jhMzCaught(S), "朝火星衝過來、轉頭看見站在火星上的人");
});

function reach(c, S) { const lv = L2(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻、至少兩堆灰燼、一座鹽灶；全部走得到；開局不會被抓", () => {
  const c = load(), L = L2(c), M = L.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1); assert.ok(cnt("A") >= 2); assert.ok(cnt("s") >= 1);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>A".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

const safeWalk = (c, S) => { const L = L2(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.flare = T.flare && { ...T.flare }; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.dy, G.stun || 0].join(":")).join("|") + "," + (T.flare && T.turn <= T.flare.at + 2 ? [T.flare.x, T.flare.y, T.turn - T.flare.at] : "");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 300 && q.length && !door; st++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  return door };
test("走一趟：一定有一條不被暗哨看到的路，先踩踏板、再走到石門前；任一個暗哨慢 1～7 回合都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L2(c))); assert.ok(door && door.plate);
  const bad = []; for (let g = 0; g < 2; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L2(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（馬收尾：棄子搶攻）、被抓至少 5 題（兵收尾的殺題；開發者 11/26 選「換成馬、兵收尾」）；core.js 獨立重算；不跟順炮第一層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_SAME2", c), T = vm.runInContext("JH_MZ_POOL_SAME2_TRAP", c), others = [poolOf(rd("07z9m-same.js"), "JH_MZ_POOL_SAME")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L2(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 9, "順炮第一層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    assert.ok(!ids.has(x.id), "跟順炮第一層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, D.door.includes(x) ? "N" : "P", x.id + " 最後一步");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-same2.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_SAME2／jhMzSame2 前綴；m.html 排在順炮第一層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_SAME2|JH_MZ_POOL_SAME2|jhMzSame2)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-same.js") > 0 && i("07z9m-same2.js") > i("07z9m-same.js") && i("07z9m-same2.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-same2.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
