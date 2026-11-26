/* W87-2（11/26）屏風馬地底迷宮第二層「斷陷神道」（m/07z9m-screen2.js）：銅人馬衛（照第一層巡法、地裂不擋馬腿、落不到地裂上、石鼓照樣蹩腿、玩家站馬腿蹩腿、不跳出自己那一廳）；
   地裂擋人、不擋光；地圖走得完、裂縫只能走橋、有不被抓的路、任一個銅人慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋208 複核（iMac Claude 1）＋開發者 11/26 決定（被抓一律殺題、修為 +40）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的銅人（地裂擋馬腿、能落在地裂上、石鼓不擋腿、跳出自己那一廳、玩家站馬腿也照跳），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-screen2.js");

function load() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze/screen?l=2" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-screen.js", "07z9m-screen2.js"]) vm.runInContext(rd(f), c);
  return c;
}
const L2 = (c) => c.jhMzLvN("screen", 2);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const xs = (a) => Array.from(a, (q) => q.x + "," + q.y).sort();
/* 9×9 房間；銅人在中心 (4,4)；marks＝{"x,y":字元} */
function room(c, marks, G, px, py) { const rows = []; for (let y = 0; y < 9; y++) { const r = (y === 0 || y === 8 ? "#".repeat(9) : "#" + ".".repeat(7) + "#").split(""); for (const k in marks || {}) { const [x, yy] = k.split(",").map(Number); if (yy === y) r[x] = marks[k] } rows.push(r.join("")) }
  const S = c.jhMzNew(L2(c)); S.grid = rows.map((r) => r.split("")); S.W = 9; S.H = 9; S.guards = [Object.assign({ kind: "pithorse", x: 4, y: 4, dx: 1, dy: -2 }, G)]; S.guard = S.guards[0]; at(S, px == null ? 1 : px, py == null ? 1 : py); return S }

function horseProblems(c) {
  const bad = [];
  let S = room(c, {}), sg = xs(c.jhMzSight(S, S.guard));
  if (sg.length !== 8) bad.push("空房間：八個日字落點都看得到（實際 " + sg.length + "）");
  /* 地裂在馬腿 (4,3)：往上跳的 (3,2)、(5,2) 照樣看得到 */
  S = room(c, { "4,3": "V" }); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (!sg.has("3,2") || !sg.has("5,2")) bad.push("地裂不擋馬腿：馬腿是地裂照樣跳得過去");
  /* 石鼓在馬腿：擋 */
  S = room(c, { "4,3": "G" }); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (sg.has("3,2") || sg.has("5,2")) bad.push("石鼓擋馬腿：那兩個落點不該看得到");
  /* 落點是地裂：落不下去 */
  S = room(c, { "6,3": "V" }); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (sg.has("6,3")) bad.push("落點是地裂：落不下去、也不會有紅格");
  /* 玩家站在馬腿 (5,4)：往右跳的兩個看不到 */
  S = room(c, {}, {}, 5, 4); sg = new Set(xs(c.jhMzSight(S, S.guard)));
  if (sg.has("6,3") || sg.has("6,5")) bad.push("玩家站在馬腿上：那兩個落點看不到");
  /* 不跳出自己那一廳 */
  S = room(c, {}, { zy: [3, 5] }); sg = xs(c.jhMzSight(S, S.guard));
  if (sg.some((k) => +k.split(",")[1] < 3 || +k.split(",")[1] > 5)) bad.push("不跳出自己那一廳（zy）");
  /* 巡法：照目前方向，跳不過去就順時針換；跳到地裂對面 */
  S = room(c, { "4,3": "V", "5,2": "#" }, { dx: 1, dy: -2 }); c.jhMzGuardStep(S);
  if (!(S.guard.x === 6 && S.guard.y === 3)) bad.push("巡法：(1,-2) 落點是牆，順時針換到 (2,-1)（實際 " + S.guard.x + "," + S.guard.y + "）");
  S = room(c, { "4,3": "V" }, { dx: 1, dy: -2 }); c.jhMzGuardStep(S);
  if (!(S.guard.x === 5 && S.guard.y === 2)) bad.push("巡法：馬腿是地裂照樣往 (1,-2) 跳");
  return bad;
}

test("登記：屏風馬第二層；兩隻銅人馬衛各巡一廳；地裂擋路不擋光；碑刻一則；寶箱有頭像框「中都石獸」；修為 +40", () => {
  const c = load(), L = L2(c);
  assert.equal(L.layer, 2); assert.equal(c.jhMzLayers("screen"), 2); assert.equal(L.guards.length, 2);
  for (const G of L.guards) { assert.equal(G.kind, "pithorse"); assert.equal(G.zy.length, 2) }
  assert.ok(L.solid.includes("V") && !L.opaque.includes("V"), "地裂擋路、不擋光"); assert.ok(L.solid.includes("G") && L.solid.includes("L"));
  assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據《明太祖實錄》/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "frame"]); assert.match(L.rew[2].zh, /中都石獸/);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:screen:2"); assert.equal(L.key, "jhMaze_screen_L2");
});

test("銅人馬衛的規則都符合（八個落點、地裂不擋馬腿、石鼓擋、落不到地裂、玩家站馬腿、不出廳、照第一層的巡法）", () => {
  assert.deepEqual(horseProblems(load()), []);
});

test("改壞驗證：地裂擋馬腿、能落在地裂上、石鼓不擋腿、跳出自己那一廳、玩家站馬腿也照跳，規則檢查一定抓得到", () => {
  const bad = (code) => { const c = load(); vm.runInContext(code, c); return horseProblems(c) };
  assert.ok(bad("jhMzScreen2Can=function(S,x,y,dx,dy,G){return jhMzHorseCan(S,x,y,dx,dy,G)}").some((s) => s.includes("地裂不擋馬腿")), "地裂擋馬腿");
  assert.ok(bad("jhMzScreen2Can=function(S,x,y,dx,dy,G){const L=jhMzHorseLeg(x,y,dx,dy),P=S.player,ty=y+dy;if(G&&G.zy&&(ty<G.zy[0]||ty>G.zy[1]))return false;if(jhMzSolid(S,L.x,L.y)&&jhMzCell(S,L.x,L.y)!=='V')return false;if(P&&P.x===L.x&&P.y===L.y)return false;const c=jhMzCell(S,x+dx,ty);return c!==undefined&&c!=='#'}").some((s) => s.includes("落點是地裂")), "能落在地裂");
  assert.ok(bad("jhMzScreen2Can=function(S,x,y,dx,dy,G){const L=jhMzHorseLeg(x,y,dx,dy),P=S.player,ty=y+dy;if(G&&G.zy&&(ty<G.zy[0]||ty>G.zy[1]))return false;if(jhMzCell(S,L.x,L.y)==='#')return false;if(P&&P.x===L.x&&P.y===L.y)return false;return !jhMzSolid(S,x+dx,ty)}").some((s) => s.includes("石鼓擋馬腿")), "石鼓不擋腿");
  assert.ok(bad("jhMzScreen2Can=function(S,x,y,dx,dy,G){const L=jhMzHorseLeg(x,y,dx,dy),P=S.player,ty=y+dy;if(jhMzSolid(S,L.x,L.y)&&jhMzCell(S,L.x,L.y)!=='V')return false;if(P&&P.x===L.x&&P.y===L.y)return false;return !jhMzSolid(S,x+dx,ty)}").some((s) => s.includes("zy")), "跳出那一廳");
  assert.ok(bad("jhMzScreen2Can=function(S,x,y,dx,dy,G){const L=jhMzHorseLeg(x,y,dx,dy),ty=y+dy;if(G&&G.zy&&(ty<G.zy[0]||ty>G.zy[1]))return false;if(jhMzSolid(S,L.x,L.y)&&jhMzCell(S,L.x,L.y)!=='V')return false;return !jhMzSolid(S,x+dx,ty)}").some((s) => s.includes("馬腿上")), "玩家站馬腿也照跳");
});

test("地裂：玩家走不過去、燈火照得到對面；銅人落不到地裂上，地裂旁邊那一格銅人跳得到就會被看到", () => {
  const c = load();
  let S = room(c, { "2,1": "V" }, { stun: 99 }, 1, 1); let r = c.jhMzStep(S, 1, 0); assert.equal(r.ev, "wall", "走不進地裂");
  assert.equal(c.jhMzLos(S, 1, 1, 3, 1), true, "隔著地裂照得到對面");
  S = room(c, { "6,3": "V" }, {}, 6, 5); assert.ok(c.jhMzCaught(S), "(6,5) 是落點：被看到");
});

function reach(c, S, block) { const lv = L2(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined || (block && block(nx, ny))) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻、兩條地裂；全部走得到；拿掉石橋就到不了石門；銅人起點在自己那一廳、開局不會被抓", () => {
  const c = load(), L = L2(c), M = L.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1);
  const cracks = M.map((r, y) => (r.split("V").length - 1 >= 8 ? y : -1)).filter((y) => y >= 0); assert.equal(cracks.length, 2, "兩條橫向地裂");
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  const D = M.findIndex((r) => r.includes("D")), dx = M[D].indexOf("D");
  for (const y of cracks) assert.ok(!reach(c, S, (x, yy) => yy === y).has((D + 1) * W + dx), "第 " + y + " 列的石橋拿掉就到不了石門");
  for (const G of S.guards) { assert.ok(G.y >= G.zy[0] && G.y <= G.zy[1]); assert.ok(cracks.some((y) => y > G.zy[0] && y < G.zy[1]), "每隻銅人那一廳都橫跨一條地裂") }
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

const safeWalk = (c, S) => { const L = L2(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.dy, G.stun || 0].join(":")).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 300 && q.length && !door; st++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  return door };
test("走一趟：一定有一條不被銅人看到的路，先踩踏板、再走到石門前；任一隻銅人慢 1～7 回合都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L2(c))); assert.ok(door && door.plate);
  const bad = []; for (let g = 0; g < 2; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L2(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（馬收尾，雙馬優先、至少兩題雙馬：雙馬聯攻）、被抓至少 5 題（馬收尾的殺題）；core.js 獨立重算；不跟屏風馬第一層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_SCREEN2", c), T = vm.runInContext("JH_MZ_POOL_SCREEN2_TRAP", c), others = [poolOf(rd("07z9m-screen.js"), "JH_MZ_POOL_SCREEN")];
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L2(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 9, "屏風馬第一層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  assert.ok(D.door.filter((x) => C.parseFen(x.fen).filter((p) => p === "N").length >= 2).length >= 2, "石門至少兩題雙馬");
  for (const x of mine) {
    assert.ok(!ids.has(x.id), "跟屏風馬第一層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, "N", x.id + " 最後一步是馬");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-screen2.js：LF、沒有控制字元、沒有行內 // 註解；全域名稱有 JH_MZ_SCREEN2／jhMzScreen2 前綴；m.html 排在屏風馬第一層、碑刻後面，下墜轉場前面；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_SCREEN2|JH_MZ_POOL_SCREEN2|jhMzScreen2)/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-screen.js") > 0 && i("07z9m-lore.js") > 0 && i("07z9m-screen2.js") > i("07z9m-screen.js") && i("07z9m-screen2.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-screen2.js"));
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
