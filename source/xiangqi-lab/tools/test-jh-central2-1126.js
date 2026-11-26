/* W87-2（11/26）中炮門地底迷宮第二層「漕底淤廊」（m/07z9m-central2.js）：雙炮衛（同一條走廊一前一後、看 3 格、另一個炮衛擋住就看不到、前衛不踩水窪）；
   淺水窪（走進去多耗一回合、自動走不主動踩）；碑刻一則；地圖走得完、炮衛走廊是必經、有不被抓的路、任一個炮衛慢 1～7 回合都走得過；兩段題庫 core.js 獨立重算。
   規格：208 號補件＋208 複核（iMac Claude 1）＋開發者 11/26 決定（被抓一律殺題、修為 +40）。
   「改壞驗證」：同一組規則檢查拿去跑改壞的炮衛（穿過守衛看、看太遠、前衛踩水窪、走進對方那一格、不擋牆），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const SRC = rd("07z9m-central2.js");

/* 把 07z9m-central2.js 的 jhMzCentral2Mud 整個換成 body（改壞驗證用：拿以前的寫法跑） */
const withMud = (src, body) => { const a = src.indexOf("function jhMzCentral2Mud"), e = src.indexOf("\n/* 3D：淺水窪", a); assert.ok(a > 0 && e > a, "找得到 jhMzCentral2Mud"); return src.slice(0, a) + body + src.slice(e) };
function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze?l=2" }) });
  vm.createContext(c); for (const f of ["07z9m-maze.js", "07z9m-lore.js", "07z9m-central2.js"]) vm.runInContext(f === "07z9m-central2.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const L2 = (c) => c.jhMzLvN("central", 2);
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const xs = (a) => Array.from(a, (q) => q.x + "," + q.y).sort();
/* 一條 1×11 的走廊（x 1～11、y 1），marks 改幾格 */
function corridor(c, marks, guards, px, py) { const row = ("#" + ".".repeat(11) + "#").split(""); for (const k in marks || {}) row[+k] = marks[k];
  const rows = ["#".repeat(13), row.join(""), "#".repeat(13)], S = c.jhMzNew(L2(c)); S.grid = rows.map((r) => r.split("")); S.W = 13; S.H = 3;
  S.guards = guards.map((g) => Object.assign({ kind: "twincannon", y: 1, dx: 1, dy: 0 }, g)); S.guard = S.guards[0]; at(S, px == null ? 11 : px, py == null ? 1 : py); return S }

/* 規則檢查：回傳不符合的地方（空陣列＝都符合）。同一組檢查也拿去跑改壞的炮衛 */
function guardProblems(c) {
  const bad = [];
  let S = corridor(c, {}, [{ x: 2 }]); let sg = xs(c.jhMzSight(S, S.guards[0]));
  if (JSON.stringify(sg) !== JSON.stringify(["3,1", "4,1", "5,1"])) bad.push("面向那一邊看 3 格：實際 " + sg.join(" "));
  S = corridor(c, {}, [{ x: 2 }, { x: 4 }]); sg = xs(c.jhMzSight(S, S.guards[0]));
  if (JSON.stringify(sg) !== JSON.stringify(["3,1"])) bad.push("另一個炮衛擋住：那一格起看不到（實際 " + sg.join(" ") + "）");
  S = corridor(c, { 4: "#" }, [{ x: 2 }]); sg = xs(c.jhMzSight(S, S.guards[0]));
  if (sg.includes("5,1")) bad.push("牆擋住：牆後面看不到");
  /* 前衛碰到水窪掉頭；後衛會走進水窪 */
  S = corridor(c, { 5: "Q" }, [{ x: 4, front: 1 }]); c.jhMzGuardStep(S);
  if (S.guards[0].x !== 3 || S.guards[0].dx !== -1) bad.push("前衛碰到水窪要掉頭（實際 " + S.guards[0].x + "," + S.guards[0].dx + "）");
  S = corridor(c, { 5: "Q" }, [{ x: 4 }]); c.jhMzGuardStep(S);
  if (S.guards[0].x !== 5) bad.push("後衛會走進水窪");
  /* 不走進對方那一格：兩個面對面相鄰 */
  S = corridor(c, {}, [{ x: 4, dx: 1 }, { x: 5, dx: -1 }]); c.jhMzGuardStep(S);
  if (S.guards[0].x === S.guards[1].x) bad.push("兩個炮衛走進同一格");
  /* 一前一後同向：十步內每一步都是直線一格或原地，永遠不重疊 */
  S = corridor(c, { 9: "Q" }, [{ x: 4, front: 1 }, { x: 2 }]);
  for (let k = 0; k < 20; k++) { const o = S.guards.map((G) => [G.x, G.y]); c.jhMzGuardStep(S);
    S.guards.forEach((G, i) => { const d = Math.abs(G.x - o[i][0]) + Math.abs(G.y - o[i][1]); if (d > 1) bad.push("一回合最多走一格") });
    if (S.guards[0].x === S.guards[1].x) bad.push("重疊：第 " + k + " 步");
    if (S.guards[0].x === 9) bad.push("前衛踩進水窪") }
  /* 被推開後跟另一個炮衛同格（共用 jhMzSolved 推 3 格）：下一步就分開；同向、反向、前面是牆都試 */
  for (const [g1, g2] of [[{ x: 5, dx: 1 }, { x: 5, dx: 1 }], [{ x: 5, dx: 1 }, { x: 5, dx: -1 }], [{ x: 11, dx: 1 }, { x: 11, dx: 1 }], [{ x: 1, dx: -1, front: 1 }, { x: 1, dx: -1 }]]) {
    S = corridor(c, {}, [g1, g2]); c.jhMzGuardStep(S); if (S.guards[0].x === S.guards[1].x) bad.push("同格的兩個炮衛下一步要分開（" + g1.x + "," + g1.dx + "/" + g2.dx + "）") }
  return bad;
}

test("登記：中炮門第二層；雙炮衛兩個（一個前衛）；水窪是自動走要避開的地形；有走水窪的機關、碑刻一則；寶箱有稱號「逆水行舟」；修為 +40", () => {
  const c = load(), L = L2(c);
  assert.equal(L.layer, 2); assert.equal(L.sid, "central"); assert.equal(c.jhMzLayers("central"), 2);
  assert.equal(L.guards.length, 2); assert.deepEqual(Array.from(L.guards, (G) => G.kind), ["twincannon", "twincannon"]); assert.equal(L.guards.filter((G) => G.front).length, 1);
  assert.equal(L.avoid, "Q"); assert.ok(!L.solid.includes("Q") && !L.opaque.includes("Q"), "水窪不擋路、不擋光");
  assert.equal(typeof L.onStep, "function"); assert.equal(L.lore.length, 1); assert.match(L.lore[0].src, /^遊戲整理，據潘季馴《河防一覽》/);
  assert.deepEqual(Array.from(L.rew, (r) => r.k), ["gong", "page", "title"]); assert.match(L.rew[2].zh, /逆水行舟/);
  assert.equal(L.xp, 40); assert.equal(L.xpKey, "maze:central:2"); assert.equal(L.key, "jhMaze_L2");
  /* #212 複審建議：題庫、預設題是自己這一層的；前衛真的在前面；碑刻包上了、走過去出得了碑文卡；lore id 跟第一層不重複 */
  const D = vm.runInContext("JH_MZ_POOL_CENTRAL2", c), T = vm.runInContext("JH_MZ_POOL_CENTRAL2_TRAP", c), B = vm.runInContext("JH_MZ_LV", c).central;
  assert.equal(L.pool.door, D.door); assert.equal(L.pool.trap, T.trap); assert.equal(L.puz.door, D.door[0]); assert.equal(L.puz.trap, T.trap[0]);
  assert.notEqual(L.pool.door, B.pool.door, "不是第一層的題庫");
  const F = L.guards.find((G) => G.front), R = L.guards.find((G) => !G.front); assert.ok(F.dx === R.dx && (F.x - R.x) * F.dx > 0 && F.y === R.y, "前衛在面向那一邊的前面");
  assert.equal(L._lore, 1, "碑刻 L、暗門 H 包上了（jhMzLoreWrap）");
  const ids = Array.from(B.lore || [], (x) => x.id); assert.ok(!ids.includes(L.lore[0].id), "碑刻 id 跟第一層不重複");
  const S = c.jhMzNew(L), M = L.map, ly = M.findIndex((r) => r.includes("L")), lx = M[ly].indexOf("L"); for (const G of S.guards) G.stun = 99;
  const side = [[-1, 0], [1, 0], [0, -1], [0, 1]].find(([a, b]) => !c.jhMzSolid(S, lx + a, ly + b)); assert.ok(side, "碑刻旁邊有可以站的格子");
  at(S, lx + side[0], ly + side[1]); const ev = c.jhMzStep(S, -side[0], -side[1]); assert.equal(ev.ev, "lore", "往碑刻走：出碑文卡"); assert.equal(ev.id, "cc4");
});

test("雙炮衛的規則都符合（看 3 格、另一個炮衛擋住就看不到、牆擋住、前衛不踩水窪、後衛會踩、不走進對方那一格）", () => {
  assert.deepEqual(guardProblems(load()), []);
});

test("改壞驗證（水窪）：以前的四種寫法、耗的那一回合不照共用規則，檢查一定抓得到", () => {
  const V = [
    ["第一版：多耗的那一回合直接讓守衛走", 'function jhMzCentral2Mud(S,dx,dy,c){if(c!=="Q")return null;S.turn++;jhMzGuardStep(S);return null}', "先提醒"],
    ["第二版：先原地等一回合再走進去", 'function jhMzCentral2Mud(S,dx,dy,c){if(c!=="Q")return null;const r=jhMzStep(S,0,0);return r.ev==="move"?null:r}', "不能被抓"],
    ["第三版：等完再看水窪在不在紅線上", 'function jhMzCentral2Mud(S,dx,dy,c){if(c!=="Q")return null;const r=jhMzStep(S,0,0);if(r.ev!=="move")return r;const x=S.player.x+dx,y=S.player.y+dy;if((S.guards||[]).some(G=>!(G.stun>0)&&(G.x===x&&G.y===y||jhMzSight(S,G).some(q=>q.x===x&&q.y===y)))){S.caughtBy=null;return{ev:"spot"}}return null}', "已經在水窪裡"],
    ["第四版：耗的那一回合被抓不降成先提醒", 'function jhMzCentral2Mud(S,dx,dy,c){if(c!=="Q"||S.mudIn)return null;S.mudIn=1;let r;try{r=jhMzStep(S,dx,dy)}finally{S.mudIn=0}if(r.ev!=="move")return r;const r2=jhMzStep(S,0,0);if(r2.ev!=="move")return r2;r.stop=true;return r}', "醒來"],
    ["耗的那一回合不照共用規則（直接讓守衛走、看到就抓）", 'function jhMzCentral2Mud(S,dx,dy,c){if(c!=="Q"||S.mudIn)return null;S.mudIn=1;let r;try{r=jhMzStep(S,dx,dy)}finally{S.mudIn=0}if(r.ev!=="move")return r;S.turn++;jhMzGuardStep(S);if(jhMzCaught(S))return{ev:"trap"};r.stop=true;return r}', "走到水窪上"],
  ];
  for (const [nm, body, key] of V) { const src = withMud(SRC, body); assert.notEqual(src, SRC, nm); assert.ok(mudProblems(load(() => src)).some((s) => s.includes(key)), nm + "：要被抓到（" + key + "）") }
});

test("改壞驗證：穿過守衛看、看 5 格、前衛踩水窪、走進對方那一格、不擋牆，規則檢查一定抓得到", () => {
  const bad = (code) => { const c = load(); vm.runInContext(code, c); return guardProblems(c) };
  assert.ok(bad("JH_MZ_KIND.twincannon.sight=function(S,G){const o=[];for(let i=1;i<=3;i++){const x=G.x+G.dx*i,y=G.y+G.dy*i;if(jhMzSolid(S,x,y))break;o.push({x,y})}return o}").some((s) => s.includes("擋住")), "穿過守衛看");
  assert.ok(bad("JH_MZ_KIND.twincannon.sight=function(S,G){const o=[];for(let i=1;i<=5;i++){const x=G.x+G.dx*i,y=G.y+G.dy*i;if(jhMzSolid(S,x,y)||jhMzCentral2Mate(S,G,x,y))break;o.push({x,y})}return o}").some((s) => s.includes("3 格")), "看太遠");
  assert.ok(bad("JH_MZ_KIND.twincannon.step=function(S,G){const blk=(x,y)=>jhMzSolid(S,x,y)||jhMzCentral2Mate(S,G,x,y);if(blk(G.x+G.dx,G.y+G.dy)){G.dx=-G.dx}if(!blk(G.x+G.dx,G.y+G.dy)){G.x+=G.dx}}").some((s) => s.includes("水窪")), "前衛踩水窪");
  assert.ok(bad("JH_MZ_KIND.twincannon.step=function(S,G){const blk=(x,y)=>jhMzSolid(S,x,y)||!!G.front&&jhMzCell(S,x,y)==='Q';if(blk(G.x+G.dx,G.y+G.dy)){G.dx=-G.dx}if(!blk(G.x+G.dx,G.y+G.dy)){G.x+=G.dx}}").some((s) => s.includes("同一格") || s.includes("重疊")), "走進對方那一格");
  assert.ok(bad("JH_MZ_KIND.twincannon.sight=function(S,G){const o=[];for(let i=1;i<=3;i++){const x=G.x+G.dx*i,y=G.y+G.dy*i;if(jhMzCentral2Mate(S,G,x,y))break;o.push({x,y})}return o}").some((s) => s.includes("牆擋住")), "不擋牆");
});

/* 水窪規則檢查（#212 審查：多耗的那一回合要照「原地等一回合」的共用規則，不能跳過「先提醒」） */
function mudProblems(c) {
  const bad = [];
  /* ⑴ 炮衛往右走、看不到玩家：走進水窪算兩回合、守衛走了兩步、人在水窪裡、自動走停下 */
  let S = corridor(c, { 4: "Q" }, [{ x: 6, dx: 1 }], 3, 1); const g0 = S.guards[0].x; let r = c.jhMzStep(S, 1, 0);
  if (r.ev !== "move" || S.player.x !== 4) bad.push("走進水窪：人進到水窪（實際 " + r.ev + "," + S.player.x + "）");
  if (S.turn !== 2) bad.push("走進水窪算兩回合（實際 " + S.turn + "）");
  if (S.guards[0].x !== g0 + 2) bad.push("走進水窪：守衛走了兩步（" + g0 + "→" + S.guards[0].x + "）");
  if (!r.stop) bad.push("走進水窪以後自動走停下");
  r = c.jhMzStep(S, 1, 0); if (S.turn !== 3) bad.push("走出水窪一回合");
  /* ⑵ 走進水窪那一回合守衛掉頭才看到：先提醒；開發者 11/26 選單「先進水窪、再在水窪裡耗那一回合」：被提醒時人已經在水窪裡 */
  S = corridor(c, { 7: "Q" }, [{ x: 11, dx: 1 }], 8, 1); r = c.jhMzStep(S, -1, 0);
  if (r.ev !== "spot") bad.push("守衛走完才看到：先提醒、不直接抓（實際 " + r.ev + "）");
  if (S.player.x !== 7) bad.push("先進水窪：被提醒時人已經在水窪裡");
  /* ⑶ #212 審查情境：守衛 2 面右、水窪 6、人 7 往左＝先提醒，不直接抓；⑹ 對照：一般地面同樣配置也是先提醒 */
  S = corridor(c, { 6: "Q" }, [{ x: 2, dx: 1 }], 7, 1); r = c.jhMzStep(S, -1, 0); if (r.ev !== "spot") bad.push("審查情境（守衛 2、水窪 6、人 7）：先提醒、不直接抓（實際 " + r.ev + "）");
  S = corridor(c, {}, [{ x: 2, dx: 1 }], 7, 1); r = c.jhMzStep(S, -1, 0); if (r.ev !== "spot") bad.push("對照組（一般地面，同樣配置）要是先提醒（實際 " + r.ev + "）");
  /* ⑷ #212 第三輪：玩家跟快醒的炮衛同格（stun 1），往乾淨的水窪走：不能被抓 */
  S = corridor(c, { 2: "Q" }, [{ x: 3, dx: 1, stun: 1 }], 3, 1); r = c.jhMzStep(S, -1, 0); if (r.ev === "trap") bad.push("跟快醒的炮衛同格、往乾淨的水窪走：不能被抓");
  /* ⑸ #212 第三輪：在水窪裡耗的那一回合，守衛（走之前看不到人）掉頭剛好走到水窪上：先提醒，不直接抓 */
  S = corridor(c, { 2: "Q" }, [{ x: 1, dx: -1, stun: 1 }], 3, 1); r = c.jhMzStep(S, -1, 0); if (r.ev !== "spot") bad.push("耗的那一回合守衛走到水窪上：先提醒、不直接抓（實際 " + r.ev + "）");
  /* ⑹ 窮舉找到的：走到暈 2 回合的炮衛身上（那格是水窪），耗的那一回合炮衛醒來同格：走地面不會被抓，走水窪也只先提醒；下一步還留在原地才抓 */
  S = corridor(c, { 2: "Q" }, [{ x: 2, dx: 1, stun: 2 }], 3, 1); r = c.jhMzStep(S, -1, 0);
  if (r.ev !== "spot") bad.push("走到暈著的炮衛身上、耗的那一回合牠醒來：先提醒、不直接抓（實際 " + r.ev + "）");
  else if (c.jhMzStep(S, 0, 0).ev !== "trap") bad.push("被提醒以後還留在原地：被抓");
  return bad;
}

test("淺水窪：走進去多耗一回合（守衛多走一步、照原地等一回合的規則，守衛才看到就先提醒）；走出來照常一回合；自動走繞開水窪、點的終點是水窪可以走；被雙炮衛直接看到照樣會被抓", () => {
  const c = load();
  assert.deepEqual(mudProblems(c), []);
  let S, r;
  /* 自動走：上下兩條路，下面短但有水窪 */
  const T = c.jhMzNew(L2(c)); T.grid = ["#######", "#.....#", "#.###.#", "#.QQQ.#", "#######"].map((r) => r.split("")); T.W = 7; T.H = 5; T.guards = []; T.guard = null;
  for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) T.seen.add(y * 7 + x); at(T, 1, 3);
  const p = Array.from(c.jhMzPath(T, 5, 3), (q) => q.join(",")); assert.ok(!p.some((q) => /^[234],3$/.test(q)), "繞開水窪：" + p.join(" "));
  assert.deepEqual(Array.from(c.jhMzPath(T, 2, 3), (q) => q.join(",")), ["2,3"], "點的終點就是水窪：可以走");
  S = corridor(c, {}, [{ x: 2 }], 4, 1); assert.ok(c.jhMzCaught(S), "站在炮衛面前 2 格：被看到");
});

function reach(c, S, block) { const lv = L2(c), seen = new Set(), q = [[S.player.x, S.player.y]]; seen.add(S.player.y * S.W + S.player.x);
  while (q.length) { const [x, y] = q.shift(); for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy, ch = (S.grid[ny] || [])[nx], k = ny * S.W + nx;
      if (ch === undefined || (block && block(nx, ny))) continue; if (lv.solid.includes(ch) && ch !== "D") continue; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]) } }
  return seen }
test("地圖：每列一樣寬、四周是牆；入口、石門、踏板、樓梯各一個；三個箱子、一塊碑刻、至少兩個水窪；全部走得到；炮衛走廊是必經；炮衛在同一列、開局不會被抓", () => {
  const c = load(), L = L2(c), M = L.map, W = M[0].length;
  for (const r of M) assert.equal(r.length, W);
  for (let x = 0; x < W; x++) { assert.equal(M[0][x], "#"); assert.equal(M[M.length - 1][x], "#") } for (const r of M) { assert.equal(r[0], "#"); assert.equal(r[W - 1], "#") }
  const cnt = (ch) => M.join("").split(ch).length - 1;
  for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3); assert.equal(cnt("L"), 1); assert.ok(cnt("Q") >= 2);
  const S = c.jhMzNew(L), all = reach(c, S);
  M.forEach((r, y) => [...r].forEach((v, x) => { if ("PCD>Q".includes(v)) assert.ok(all.has(y * W + x), v + " 走得到 " + x + "," + y) }));
  const gy = L.guards[0].y; assert.ok(L.guards.every((G) => G.y === gy), "兩個炮衛在同一列");
  const D = M.findIndex((r) => r.includes("D")), dx = M[D].indexOf("D");
  assert.ok(!reach(c, S, (x, y) => y === gy).has((D + 1) * W + dx), "不經炮衛那一列到不了石門前");
  assert.ok(!c.jhMzCaught(S), "開局不會被抓");
});

const safeWalk = (c, S) => { const L = L2(c), clone = (T) => { const U = c.jhMzNew(L); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.turn = T.turn; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.stun || 0].join(":")).join("|");
  let q = [S], seen = new Set([key(S)]), door = null;
  for (let st = 0; st < 300 && q.length && !door; st++) { const nq = [];
    for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
      if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot", "lore"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) }
    q = nq.length > 20000 ? nq.slice(0, 20000) : nq }
  return door };
test("走一趟：一定有一條不被炮衛看到的路，先踩踏板、再走到石門前；任一個炮衛慢 1～7 回合（被抓解題後停 4 回合也在裡面）都走得過", () => {
  const c = load();
  let door = safeWalk(c, c.jhMzNew(L2(c))); assert.ok(door && door.plate);
  const bad = []; for (let g = 0; g < 2; g++) for (let k = 1; k <= 7; k++) { const S = c.jhMzNew(L2(c)); S.guards[g].stun = k; door = safeWalk(c, S); if (!(door && door.plate)) bad.push(g + "慢" + k) }
  assert.deepEqual(bad, []);
});

const poolOf = (src, nm) => { const a = src.indexOf(`/* ==JH_MZ_POOL:${nm}== */`), b = src.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); assert.ok(a > 0 && b > a, nm); const ctx = {}; vm.createContext(ctx); vm.runInContext(src.slice(a, b) + `;this.v=${nm};`, ctx); return ctx.v };
test("題庫：石門 3 題（兵收尾：中兵突破）、被抓至少 5 題（馬收尾的殺題；開發者 11/26 選「換成馬、兵收尾」）；core.js 獨立重算——每步合法、走完將死、最後一步是對的子、沒有更短的殺法；不跟中炮門第一層重複（開發者 11/26：只在同一派各層不重複）、兩段不重複；都出自古譜", () => {
  const c = load(), D = vm.runInContext("JH_MZ_POOL_CENTRAL2", c), T = vm.runInContext("JH_MZ_POOL_CENTRAL2_TRAP", c), others = [];
  others.push(poolOf(rd("07z9m-maze.js"), "JH_MZ_POOL_CENTRAL"));   /* 開發者 11/26 選單：不同派可以重用題目，只在同一派各層之間不重複 */
  assert.equal(D.door.length, 3); assert.equal(D.trap.length, 0); assert.equal(T.door.length, 0); assert.ok(T.trap.length >= 5);
  const L = L2(c); assert.equal(L.pool.door.length, 3); assert.equal(L.pool.trap.length, T.trap.length);
  const ids = new Set(others.flatMap((o) => [...o.door, ...o.trap]).map((x) => x.id)), mine = [...D.door, ...T.trap];
  assert.ok(ids.size >= 9, "中炮門第一層題庫有讀到"); assert.equal(new Set(mine.map((x) => x.id)).size, mine.length, "兩段不重複");
  for (const x of mine) {
    const door = D.door.includes(x);
    assert.ok(!ids.has(x.id), "跟中炮門第一層重複：" + x.id); assert.ok(x.src && x.src.book && !/特級大師|對局|實戰/.test(x.src.book), "出自古譜：" + x.id);
    let b = C.parseFen(x.fen), s = "r", last = "";
    for (let i = 0; i < x.line.length; i++) { const f = C.parseSq(x.line[i].slice(0, 2)), t = C.parseSq(x.line[i].slice(2, 4));
      assert.ok(C.legal(b, s).some((m) => m[0] === f && m[1] === t), x.id + " 第 " + (i + 1) + " 步合法"); if (i === x.line.length - 1) last = b[f]; b = C.make(b, f, t); s = C.opp(s) }
    assert.ok(C.inCheck(b, s) && C.legal(b, s).length === 0, x.id + " 走完將死"); assert.equal(last, door ? "P" : "N", x.id + " 最後一步");
    const n = (x.line.length + 1) / 2, b0 = C.parseFen(x.fen);
    const mateIn = (bd, k) => C.legal(bd, "r").some(([f, t]) => { const b1 = C.make(bd, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) });
    if (n >= 2) assert.ok(!mateIn(b0, n - 1), x.id + " 沒有更短的殺法");
  }
});

test("〔原始碼〕07z9m-central2.js：LF、沒有控制字元、沒有行內 // 註解；新的全域名稱都有 JH_MZ_CENTRAL2／jhMzCentral2 前綴；開場說明用搖桿的新說法", () => {
  assert.ok(!SRC.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const tops = [...SRC.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^(JH_MZ_CENTRAL2|JH_MZ_POOL_CENTRAL2|jhMzCentral2)/.test(n), "全域名稱要有前綴：" + n);
  assert.ok(SRC.includes("按住搖桿往要去的方向推") && SRC.includes("drag the ✥ on it to move it"));
});
