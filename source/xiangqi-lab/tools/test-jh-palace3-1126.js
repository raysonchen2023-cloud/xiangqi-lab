/* W87-3（11/26）反宮馬門地底迷宮第三層「墨池連通」（m/07z9m-palace3.js）：連通墨口（人或傀儡停在墨口上，從同一對的另一個墨口冒出來；另一頭有人或傀儡就冒不出來；傀儡換到那一片工坊）；
   雙速傀儡（一隻每回合跳、一隻兩回合才跳一次）；地圖走得完、有不被抓的路、任一個傀儡慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋208 複核③（轉晾墨架改成墨池連通、傀儡換工坊）＋開發者 11/26 決定（被抓一律殺題、不用炮車收尾、第三層可用四步殺、修為 +60、題目只在同一派各層之間不重複）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的程式（人踩墨口不會冒出去、另一頭有人照樣冒、慢的每回合都跳、傀儡不會被墨口捲走），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-palace3.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/palace_horse?l=3" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-screen.js", "07z9m-palace.js", "07z9m-palace2.js", "07z9m-palace3.js"]) vm.runInContext(f === "07z9m-palace3.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L3 = (c) => c.jhMzLvN("palace_horse", 3);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
/* 真的第三層地圖；守衛預設暈著（只看墨口和傀儡本身的規則） */
function level(c, guards) { const S = c.jhMzNew(L3(c)); S.guards.forEach((G, k) => Object.assign(G, { stun: 99 }, (guards || [])[k] || {})); return S }
function inkProblems(c, P) {
  const bad = [];
  /* ① 人踩上墨口：從另一頭冒出來、算一回合、自動走停下 */
  let S = level(c); at(S, 12, 6); let r = c.jhMzStep(S, 1, 0);
  if (!(S.player.x === 5 && S.player.y === 12) || S.turn !== 1 || !r.stop) bad.push("① 踩上墨口要從另一頭冒出來、算一回合、停下（實際 " + S.player.x + "," + S.player.y + "," + S.turn + "," + !!r.stop + "）");
  /* ② 另一頭站著傀儡：冒不出來，留在墨口上 */
  S = level(c, [{}, { x: 5, y: 12 }]); at(S, 12, 6); c.jhMzStep(S, 1, 0); if (!(S.player.x === 13 && S.player.y === 6)) bad.push("② 另一頭有傀儡：冒不出來（實際 " + S.player.x + "," + S.player.y + "）");
  /* ③ 傀儡跳到墨口上：從另一頭冒出來，換成那一片工坊 */
  const c3 = load(P); vm.runInContext("JH_MZ_KIND.inkpuppet.step=(S,G)=>{G.x=13;G.y=6}", c3); S = level(c3, [{ stun: 0, x: 11, y: 7 }]); at(S, 1, 16);
  vm.runInContext("JH_MZ_KIND.inkpuppet3", c3).step(S, S.guards[0]);
  if (!(S.guards[0].x === 5 && S.guards[0].y === 12)) bad.push("③ 傀儡跳到墨口上要從另一頭冒出來（實際 " + S.guards[0].x + "," + S.guards[0].y + "）");
  else if (Array.from(S.guards[0].zone).join() !== "1,11,13,14") bad.push("③ 冒出來後換成下面那一片工坊");
  /* ④ 慢的那隻：奇數回合不跳、偶數回合跳 */
  const c4 = load(P); vm.runInContext("JH_MZ_KIND.inkpuppet.step=(S,G)=>{G.x++}", c4); S = level(c4, [{}, { stun: 0 }]); const G = S.guards[1], x0 = G.x, K = vm.runInContext("JH_MZ_KIND.inkpuppet3", c4);
  S.turn = 1; K.step(S, G); if (G.x !== x0) bad.push("④ 慢的那隻奇數回合不跳"); S.turn = 2; K.step(S, G); if (G.x !== x0 + 1) bad.push("④ 慢的那隻偶數回合跳");
  const F = S.guards[0]; F.stun = 0; const f0 = F.x; S.turn = 1; K.step(S, F); if (F.x !== f0 + 1) bad.push("④ 快的那隻每回合都跳");
  /* ⑤ 自動走不主動踩墨口；點的終點是墨口可以 */
  S = level(c); for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) S.seen.add(y * S.W + x); at(S, 11, 6);
  const p = Array.from(c.jhMzPath(S, 13, 8), (q) => q.join(",")); if (p.includes("13,6")) bad.push("⑤ 自動走要繞開墨口：" + p.join(" "));
  if (Array.from(c.jhMzPath(S, 13, 6), (q) => q.join(",")).slice(-1)[0] !== "13,6") bad.push("⑤ 點墨口本身可以走過去");
  return bad;
}

test("登記：反宮馬門第三層；一快一慢兩隻傀儡；墨口是自動走要避開的地形、不擋路；碑刻一則（遊戲整理、不引宗譜）；寶箱有收藏品「萬曆孤本雕版」；修為 +60；結尾寫三層都走完", () => {
  const c = load(), L = L3(c);
  assert.equal(L.layer, 3); assert.equal(c.jhMzLayers("palace_horse"), 3); assert.deepEqual(Array.from(L.guards, (G) => G.kind), ["inkpuppet3", "inkpuppet3"]); assert.equal(L.guards.filter((G) => G.slow).length, 1);
  assert.equal(L.avoid, "n"); assert.ok(!L.solid.includes("n") && L.solid.includes("L") && L.opaque.includes("L")); assert.equal(typeof L.afterMove, "function");
  assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理/); assert.ok(!/宗譜》[^待]/.test(L.lore[0].src), "不引宗譜");
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "relic"]); assert.match(L.rew[2].zh, /萬曆孤本雕版/);
  assert.equal(L.xp, 60); assert.equal(L.xpKey, "maze:palace_horse:3"); assert.match(L.key, /_L3$/); assert.match(L.say.done[0], /三層都走完了/);
  const P = vm.runInContext("JH_MZ_PALACE3_PAIR", c), M = L.map; for (const k in P) { const [x, y] = k.split(",").map(Number); assert.equal(M[y][x], "n", k + " 是墨口"); assert.equal(P[P[k]], k, "墨口兩兩配對") }
});

test("墨口與雙速傀儡的規則都符合（人踩墨口冒到另一頭、另一頭有人冒不出來、傀儡被捲走換工坊、慢的隔回合跳、自動走繞開墨口）", () => {
  assert.deepEqual(inkProblems(load()), []);
});

test("改壞驗證：人踩墨口不會冒出去、另一頭有人照樣冒、慢的每回合都跳、傀儡不會被墨口捲走，規則檢查一定抓得到", () => {
  const P1 = (s) => s.replace("function jhMzPalace3After(S){if(jhMzPalace3Warp(S,S.player))", "function jhMzPalace3After(S){if(false)");
  const P2 = (s) => s.replace("if((P!==o&&P.x===x&&P.y===y)||(S.guards||[]).some(G=>G!==o&&G.x===x&&G.y===y))return false;", "");
  const P3 = (s) => s.replace("if(G.slow&&(S.turn%2))return;", "");
  const P4 = (s) => s.replace("if(jhMzPalace3Warp(S,G)){G.px=null;G.py=null;G.zone=jhMzPalace3Zone(G)}", "");
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P(SRC), SRC, "改壞的字串要真的找得到");
  assert.ok(inkProblems(load(P1), P1).some((s) => s.startsWith("①")), "人踩墨口不會冒出去");
  assert.ok(inkProblems(load(P2), P2).some((s) => s.startsWith("②")), "另一頭有人照樣冒");
  assert.ok(inkProblems(load(P3), P3).some((s) => s.startsWith("④")), "慢的每回合都跳");
  assert.ok(inkProblems(load(P4), P4).some((s) => s.startsWith("③")), "傀儡不會被墨口捲走");
});

function reach(c, S) { const lv = L3(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻、四個墨口；全部走得到；碑刻旁有可站的格子；開局不會被抓", () => {
  const c = load(), L = L3(c), M = L.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1); assert.equal(cnt("n"), 4);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  const ly = M.findIndex((r) => r.includes("L")), lx = M[ly].indexOf("L");
  assert.ok([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => all.has((ly + b) * W + lx + a)), "碑刻旁有可站的格子");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

/* BFS：狀態含傀儡上一格（不跳回上一格） */
const safeWalk = (c, S) => { const L = L3(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); U.lit = new Set(T.lit); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.dy, G.stun || 0].join(":")).join("|") + "," + T.guards.map((G) => [G.px, G.py].join(":")).join("|");
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

test("被抓拖回入口：傀儡回到原本的工坊（照共用規則重擺）", () => {
  const c = load(), S = c.jhMzNew(L3(c)); S.guards[0].x = 5; S.guards[0].y = 12; c.jhMzReset(S, false); assert.deepEqual([S.guards[0].x, S.guards[0].y], [L3(c).guards[0].x, L3(c).guards[0].y]);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（馬收尾的三步殺：退馬反擊）、被抓至少 5 題（馬收尾的三、四步殺，不用炮車收尾）；core.js 獨立重算；不跟反宮馬門第一、二層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜；說明的步數＝line", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_PALACE3", c), T = vm.runInContext("JH_MZ_POOL_PALACE3_TRAP", c);
  const others = [poolOf(rd("07z9m-palace.js"), "JH_MZ_POOL_PALACE"), poolOf(rd("07z9m-palace.js"), "JH_MZ_POOL_PALACE_TRAP"), poolOf(rd("07z9m-palace2.js"), "JH_MZ_POOL_PALACE2"), poolOf(rd("07z9m-palace2.js"), "JH_MZ_POOL_PALACE2_TRAP")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L3(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 18, "反宮馬門第一、二層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x), n = (x.line.length + 1) / 2;
    assert.ok(!ids.has(x.id), "跟反宮馬門第一、二層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    assert.ok(door ? n === 3 : n === 3 || n === 4, x.id + " 步數"); assert.ok(x.zh[1].includes(n + " 步將死") && x.en[1].includes("checkmate in " + n), x.id + " 說明的步數");
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, "N", x.id + " 最後一步");
    const b0 = C.parseFen(x.fen), mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    /* 沒有更短的殺法：查到兩步（三步殺查一、二步；四步殺的第三步由出題時的 Pikafish 和 test-jh-maze-multisol-1126.js 的 alt 樹重算把關） */
    for (let k = 1; k <= Math.min(2, n - 1); k++) assert.ok(!mateIn(b0, k), x.id + " 沒有 " + k + " 步殺");
  }
});

test("〔原始碼〕07z9m-palace3.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_PALACE3／jhMzPalace3 前綴；m.html 排在反宮馬門第二層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  /* 地圖字元的外觀（JH_MZ_OBJ／JH_MZ_TILE）只有這一派自己登記：別的檔先登記了同一個字元，這裡的「if(!JH_MZ_OBJ.x)」會被跳過、畫成別派的東西 */
  { const own = new Set([...SRC.matchAll(/JH_MZ_(?:OBJ|TILE).([A-Za-z])=/g)].map((m) => m[1])), dir = path.join(ROOT, "xiangqi-db", "m");
    for (const g of fs.readdirSync(dir).filter((g) => /^07z9m-.*\.js$/.test(g) && g !== "07z9m-palace3.js")) { const x = fs.readFileSync(path.join(dir, g), "utf8");
      for (const m of x.matchAll(/JH_MZ_(?:OBJ|TILE).([A-Za-z])=/g)) assert.ok(!own.has(m[1]), "字元 " + m[1] + " 跟 " + g + " 撞了") } }
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_PALACE3|JH_MZ_POOL_PALACE3|jhMzPalace3)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-palace2.js") > 0 && i("07z9m-palace3.js") > i("07z9m-palace2.js") && i("07z9m-palace3.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-palace3.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
