// W71 中炮門地底迷宮・第一層「廢棄漕倉」（m/07z9m-maze.js）
//   vm 跑真的模組（純邏輯那一段）＋真的 core.js：
//   - 兩題殘局用 core.js 獨立重算：局面合法、黑方沒被將、答案是紅方合法著法、走完黑方被將而且沒有合法著法（將死），而且「只有這一步」將死；
//   - 地圖：起點走得到石門、三個箱子；門開了才走得到樓梯；暗匪的巡邏廊道兩端是牆；
//   - 回合：撞牆不算回合；壁燈走到旁邊就點亮；箱子撿一次、三種各一；碰石門＝開殘局；暗匪看到＝陷阱；走到樓梯＝走完；
//   - 殘局結果：答錯累計、陷阱錯第 4 次拖回入口（箱子保留）；解開石門後門變地面；解開陷阱暗匪暈四回合；
//   - 點地面自動走只走看過的格子；存檔第一次走完給修為一次；遠端開關 maze 關掉時不放入口、直接開網址退回門內頁；
//   - Jianghu 包一層：#/jianghu/maze 畫迷宮，其他照舊畫長卷。
// 用法：node --test xiangqi-lab/tools/test-jh-maze-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07z9m-maze.js"), "utf8");

function load(o = {}) {
  const mem = {}, xp = [], hash = { v: o.hash || "#/jianghu/hall/central" };
  const c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: (n, why, key) => xp.push([n, key]),
    xqFlag: (k) => !(o.off || []).includes(k), Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ get hash() { return hash.v }, set hash(v) { hash.v = v } }) });
  if (o.hall) { c.JhHall = function () { return { base: 1 } }; c.Jianghu = function () { return { scroll: 1 } } }
  vm.createContext(c); vm.runInContext(SRC + ";this.JH_MZ_PUZ=JH_MZ_PUZ;this.JH_MZ_MAP=JH_MZ_MAP;this.JH_MZ_GUARD=JH_MZ_GUARD;this.JH_MZ_REW=JH_MZ_REW;", c);
  return { c, mem, xp, hash };
}

/* ---------- 殘局：core.js 獨立重算 ---------- */
const PUZ = load().c.JH_MZ_PUZ;
const mateIn1 = (fen) => {
  const B = C.parseFen(fen).slice(0, 90);
  return { B, mates: C.legal(B, "r").filter(([f, t]) => { const n = B.slice(); n[t] = n[f]; n[f] = null; return C.inCheck(n, "b") && C.legal(n, "b").length === 0 }) };
};
const toIccs = ([f, t]) => "abcdefghi"[f % 9] + (9 - Math.floor(f / 9)) + "abcdefghi"[t % 9] + (9 - Math.floor(t / 9));

test("兩題殘局：局面合法（雙方各一個將帥、黑方沒被將）、答案是紅方合法著法、而且是唯一的一步殺（core.js 重算，不靠 Pikafish）", () => {
  assert.deepEqual(Object.keys(PUZ).sort(), ["door", "trap"]);
  for (const [id, P] of Object.entries(PUZ)) {
    const { B, mates } = mateIn1(P.fen);
    assert.equal(B.length, 90, id);
    assert.equal(B.filter((p) => p === "K").length, 1, id + " 一個帥"); assert.equal(B.filter((p) => p === "k").length, 1, id + " 一個將");
    assert.ok(!C.inCheck(B, "b"), id + " 開局黑方沒被將（不然紅方先走不合理）");
    assert.ok(C.legal(B, "r").some((m) => toIccs(m) === P.ans), id + " 答案是合法著法");
    assert.deepEqual(mates.map(toIccs), [P.ans], id + " 只有答案這一步將死");
  }
});

test("改壞的答案：拿非將死的合法著法當答案，重算會不一樣（重算真的有在比）", () => {
  const { B, mates } = mateIn1(PUZ.door.fen), other = C.legal(B, "r").map(toIccs).find((m) => m !== PUZ.door.ans);
  assert.ok(other && !mates.map(toIccs).includes(other));
});

/* ---------- 地圖 ---------- */
test("地圖：每行一樣寬、外框都是牆；一個起點、一道石門、一座樓梯、三個箱子、四盞以上壁燈；暗匪廊道兩端是牆", () => {
  const { c } = load(), M = c.JH_MZ_MAP, W = M[0].length, cnt = (ch) => M.join("").split(ch).length - 1;
  for (const r of M) assert.equal(r.length, W);
  assert.ok(/^#+$/.test(M[0]) && /^#+$/.test(M[M.length - 1])); for (const r of M) assert.ok(r[0] === "#" && r[W - 1] === "#");
  assert.deepEqual([cnt("@"), cnt("D"), cnt(">"), cnt("C")], [1, 1, 1, 3]); assert.ok(cnt("T") >= 4);
  const G = c.JH_MZ_GUARD, row = M[G.y];
  assert.equal(row[G.x], "."); let l = G.x, r = G.x; while (row[l - 1] !== "#") l--; while (row[r + 1] !== "#") r++; assert.ok(l > 0 && r < W - 1, "廊道兩端有牆，暗匪會掉頭");
});

test("走得到：起點→石門前、三個箱子；門沒開走不到樓梯，開了就走得到（全部看過的情況下用 jhMzPath）", () => {
  const { c } = load(), S = c.jhMzNew();
  for (let i = 0; i < S.W * S.H; i++) S.seen.add(i);
  for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) { const ch = c.JH_MZ_MAP[y][x];
    if (ch === "C") assert.ok(c.jhMzPath(S, x, y), "箱子 " + x + "," + y);
    if (ch === "D") assert.ok(c.jhMzPath(S, x, y), "石門");
    if (ch === ">") { assert.equal(c.jhMzPath(S, x, y), null, "門沒開走不到樓梯"); c.jhMzOpenDoor(S); assert.ok(c.jhMzPath(S, x, y), "門開了走得到樓梯") } }
});

/* ---------- 回合 ---------- */
const at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
const farGuard = (S) => { S.guard.stun = 99 };

test("撞牆不算回合；原地等一回合會算；暗匪走一步（照車的走法來回，碰牆掉頭）", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  const t0 = S.turn, r = c.jhMzStep(S, 0, 1); assert.equal(r.ev, "wall"); assert.equal(S.turn, t0, "撞牆不算回合");
  c.jhMzStep(S, 0, 0); assert.equal(S.turn, t0 + 1);
  const S2 = c.jhMzNew(), x0 = S2.guard.x; c.jhMzStep(S2, 0, 0); assert.equal(S2.guard.x, x0 + 1, "暗匪往右一步");
  S2.guard.x = 13; S2.guard.dx = 1; c.jhMzGuardStep(S2); assert.deepEqual([S2.guard.x, S2.guard.dx], [12, -1], "碰牆掉頭");
});

test("壁燈：走到旁邊就點亮一次；箱子：每個只撿一次，三個箱子三種各一", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  at(S, 2, 22); const r = c.jhMzStep(S, 0, 0); assert.ok(r.torch); assert.ok(S.lit.has(22 * S.W + 1));
  assert.equal(c.jhMzStep(S, 0, 0).torch, false, "已經亮了不再算");
  const chests = []; for (let y = 0; y < S.H; y++) for (let x = 0; x < S.W; x++) if (c.JH_MZ_MAP[y][x] === "C") chests.push([x, y]);
  for (const [x, y] of chests) { const nb = [[0, -1], [0, 1], [-1, 0], [1, 0]].find(([a, b]) => c.JH_MZ_MAP[y + b][x + a] === "."); assert.ok(nb, "箱子旁邊有地面");
    at(S, x + nb[0], y + nb[1]); const r2 = c.jhMzStep(S, -nb[0], -nb[1]); assert.ok(r2.chest, "走進箱子那格就撿到") }
  assert.deepEqual([S.bag.gong, S.bag.page, S.bag.box], [1, 1, 1]); assert.equal(S.chests.size, 0);
  const [x, y] = chests[0]; at(S, x, y); c.jhMzStep(S, 0, 0); assert.deepEqual([S.bag.gong, S.bag.page, S.bag.box], [1, 1, 1], "同一個箱子不會再撿");
});

test("碰石門＝開殘局（不算回合、不穿過去）；解開後門變地面、走得過去；走到樓梯＝走完", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  at(S, 6, 5); const t0 = S.turn; assert.equal(c.jhMzStep(S, 0, -1).ev, "door"); assert.equal(S.turn, t0); assert.deepEqual([S.player.x, S.player.y], [6, 5]);
  assert.equal(c.jhMzTry(S, "door", "a0a1"), "bad"); assert.equal(c.jhMzTry(S, "door", PUZ.door.ans), "ok"); c.jhMzSolved(S, "door");
  assert.equal(S.grid[4][6], "."); assert.equal(c.jhMzStep(S, 0, -1).ev, "move"); assert.equal(S.player.y, 4);
  c.jhMzStep(S, 0, -1); assert.equal(c.jhMzStep(S, 0, -1).ev, "finish"); assert.ok(S.done); assert.equal(c.jhMzStep(S, 0, 1).ev, "done", "走完就不能再走");
});

test("暗匪：站在他看得到的那一排（面向那邊 5 格內）＝陷阱；背後不會；糧袋擋視線；暈的時候看不到", () => {
  const { c } = load(), S = c.jhMzNew(); S.guard.x = 5; S.guard.y = 12; S.guard.dx = 1;
  at(S, 8, 12); assert.ok(c.jhMzCaught(S), "前方 3 格"); at(S, 3, 12); assert.ok(!c.jhMzCaught(S), "背後");
  at(S, 11, 12); assert.ok(!c.jhMzCaught(S), "超過 5 格"); S.guard.stun = 2; at(S, 7, 12); assert.ok(!c.jhMzCaught(S), "暈了");
  const S2 = c.jhMzNew(); S2.grid[12][7] = "S"; S2.guard.x = 5; S2.guard.y = 12; S2.guard.dx = 1; at(S2, 9, 12); assert.ok(!c.jhMzCaught(S2), "糧袋擋住");
  const S3 = c.jhMzNew(); S3.guard.x = 5; S3.guard.y = 12; S3.guard.dx = 1; at(S3, 6, 11); assert.equal(c.jhMzStep(S3, 0, 1).ev, "trap", "走進他的視線");
});

test("陷阱：答錯累計，第 4 次拖回入口（箱子保留、已撿的箱子不會再出現）；解開＝暗匪暈四回合", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  const [x, y] = [7, 9]; at(S, x, y - 1); c.jhMzStep(S, 0, 1); assert.equal(S.bag.gong, 1);
  for (let i = 1; i <= 3; i++) assert.equal(c.jhMzTry(S, "trap", "a0a1"), "bad");
  assert.equal(c.jhMzTry(S, "trap", "a0a1"), "back"); c.jhMzCaughtBack(S);
  assert.deepEqual([S.player.x, S.player.y], [S.start.x, S.start.y]); assert.equal(S.bag.gong, 1); assert.equal(S.grid[y][x], ".", "撿過的箱子不再出現"); assert.equal(S.fails.trap, 0);
  const S2 = c.jhMzNew(); assert.equal(c.jhMzTry(S2, "trap", PUZ.trap.ans), "ok"); c.jhMzSolved(S2, "trap"); assert.equal(S2.guard.stun, 4);
  for (let i = 0; i < 4; i++) c.jhMzGuardStep(S2); assert.equal(S2.guard.stun, 0);
});

test("點地面自動走：只走看過的格子；沒看過的地方走不到；走不進牆", () => {
  const { c } = load(), S = c.jhMzNew();
  assert.equal(c.jhMzPath(S, 8, 23), null, "中間那格還沒看過，走不到兩格外");
  for (let x = 1; x < 14; x++) S.seen.add(23 * S.W + x);
  assert.equal(JSON.stringify(c.jhMzPath(S, 8, 23)), "[[7,23],[8,23]]"); assert.equal(c.jhMzPath(S, 0, 23), null, "牆");
});

test("光：燈火照得到身邊、照不穿牆；點亮的壁燈照得到它附近", () => {
  const { c } = load(), S = c.jhMzNew();
  assert.ok(c.jhMzLight(S, S.start.x + 1, S.start.y, 0) > .5); assert.equal(c.jhMzLight(S, S.start.x, S.start.y - 5, 0), 0, "太遠");
  assert.equal(c.JH_MZ_MAP[21][6], "#"); assert.equal(c.jhMzLight(S, 6, 20, 0), 0, "隔著牆（燈在 6,23，牆在 6,21，牆後 6,20 照不到）"); S.lit.add(22 * S.W + 11); assert.ok(c.jhMzLight(S, 12, 23, 0) > .3, "壁燈旁");
});

test("存檔：第一次走完給修為 +30（一次）；之後記最佳步數、累計箱子；壞掉的存檔照 0 讀", () => {
  const { c, xp, mem } = load(), S = c.jhMzNew(); S.turn = 50; S.bag.gong = 1;
  const r1 = c.jhMzSave(S); assert.ok(r1.first); assert.deepEqual(xp, [[30, "maze:1"]]);
  S.turn = 40; const r2 = c.jhMzSave(S); assert.ok(!r2.first); assert.equal(xp.length, 1, "修為只給一次"); assert.equal(r2.G.best, 40); assert.equal(r2.G.gong, 2);
  mem.jhMaze = JSON.stringify({ clear: "x", best: -3, gong: null }); assert.equal(JSON.stringify(c.jhMzGet()), JSON.stringify({ clear: 0, best: 0, gong: 0, page: 0, box: 0 }));
});

/* ---------- 入口與路由 ---------- */
function hallPage() {
  const kids = [], spot = { k: "gate" };
  const P = { querySelector: (q) => q.startsWith('.jh-hall-spot[data-k="maze"]') ? kids.find((k) => k.dataset.k === "maze") || null : q === ".jh-hall-spot" ? spot : null, insertBefore: (b) => kids.push(b) };
  return { v: { querySelector: (q) => (q === ".jh-hall" ? P : null) }, kids };
}
function withDoc(c) {
  c.document = { createElement: () => ({ dataset: {}, style: {}, set innerHTML(h) { this._h = h }, get innerHTML() { return this._h } }) };
  c.jhHallPc = ([x, y]) => `left:${x};top:${y}`; c.jhGo = (h) => c.__went.push(h); c.__went = [];
}

test("中炮門門內頁：多一個「拋石車・地底密道」入口，點了去 #/jianghu/maze；只放一次；其他派不放；遠端開關 maze 關掉不放", () => {
  const A = load({ hall: true }); withDoc(A.c);
  const p = hallPage(); A.c.JhHall(p.v, "central"); A.c.JhHall(p.v, "central");
  assert.equal(p.kids.length, 1, "只放一次"); assert.match(p.kids[0].innerHTML, /地底密道/); p.kids[0].onclick({ stopPropagation() {} }); assert.deepEqual(A.c.__went, ["#/jianghu/maze"]);
  const q = hallPage(); A.c.JhHall(q.v, "horse"); assert.equal(q.kids.length, 0, "其他派不放");
  const B = load({ hall: true, off: ["maze"] }); withDoc(B.c); const r = hallPage(); B.c.JhHall(r.v, "central"); assert.equal(r.kids.length, 0, "開關關掉不放");
});

test("路由：Jianghu 包一層，#/jianghu/maze 畫迷宮、#/jianghu 照舊畫長卷；開關關掉時直接開網址退回門內頁", () => {
  const A = load({ hall: true, hash: "#/jianghu" }); assert.deepEqual(A.c.Jianghu({}), { scroll: 1 });
  let called = 0; A.c.JhMaze = () => { called++; return { maze: 1 } };
  A.c.BGM = { force: null }; A.c.bgmForce = (f) => { A.c.BGM.force = f || null };
  A.hash.v = "#/jianghu/maze"; assert.deepEqual(A.c.Jianghu({}), { maze: 1 }); assert.equal(called, 1);
  assert.equal(A.c.BGM.force, "maze/maze_1.mp3", "進迷宮指定播專屬配樂");
  const B = load({ hall: true, hash: "#/jianghu/maze", off: ["maze"] }); B.c.jhCss = () => {}; B.c.jhMzCss = () => {};
  B.c.BGM = { force: null }; B.c.bgmForce = (f) => { B.c.BGM.force = f || null }; B.c.Jianghu({}); assert.equal(B.c.BGM.force, null, "開關關掉不播");
  B.c.JhMaze({}); assert.equal(B.hash.v, "#/jianghu/hall/central");
});

test("#83 審查①：石門一定要解開殘局才開——碰門多少次、解錯多少次都不開、不穿過去；只有解對（jhMzSolved）才變地面", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  at(S, 6, 5);
  for (let i = 0; i < 6; i++) { assert.equal(c.jhMzStep(S, 0, -1).ev, "door"); assert.equal(S.player.y, 5); assert.equal(S.grid[4][6], "D") }
  for (let i = 0; i < 6; i++) assert.equal(c.jhMzTry(S, "door", "e0e1"), "bad");
  assert.equal(S.grid[4][6], "D", "解錯不開"); assert.ok(!S.doorOpen);
  for (let y = 0; y < S.H; y++) S.seen.add(y * S.W + 6);
  const p = c.jhMzPath(S, 6, 2); assert.equal(p, null, "門沒開，自動走也到不了門後");
  assert.equal(c.jhMzTry(S, "door", PUZ.door.ans), "ok"); c.jhMzSolved(S, "door"); assert.equal(S.grid[4][6], "."); assert.ok(S.doorOpen);
});

test("#83 審查②：點棋盤換成著法 jhMzMv——兩題答案從格子反推回來要一模一樣；紅方在下（第 9 列＝0 線）", () => {
  const { c } = load();
  for (const P of Object.values(PUZ)) { const a = c.jhMzSq(P.ans.slice(0, 2)), b = c.jhMzSq(P.ans.slice(2)); assert.equal(c.jhMzMv(a, b), P.ans) }
  assert.equal(c.jhMzMv({ c: 0, r: 9 }, { c: 0, r: 0 }), "a0a9", "左下角走到左上角");
  assert.equal(c.jhMzMv({ c: 7, r: 7 }, { c: 4, r: 7 }), "h2e2");
  const { B } = mateIn1(PUZ.trap.fen), m = C.legal(B, "r").find((x) => toIccs(x) === PUZ.trap.ans);
  assert.equal(c.jhMzMv({ c: m[0] % 9, r: Math.floor(m[0] / 9) }, { c: m[1] % 9, r: Math.floor(m[1] / 9) }), PUZ.trap.ans, "core.js 的合法著法換算成點擊格子，再換回著法要一樣");
});

test("專屬配樂：進迷宮指定播 maze/maze_1.mp3；換到別頁（hashchange）還原成朝代輪播；別的頁指定的配樂不會被迷宮關掉", () => {
  const mem = {}, hash = { v: "#/jianghu/maze" }, ev = {}, calls = [];
  const c = { store: { get: (k, d) => d, set() {} }, jhL: (zh) => zh, esc: String, Math, JSON, Set, Map, Number, String, Array, Object,
    BGM: { force: null }, addEventListener: (n, f) => { ev[n] = f } };
  c.bgmForce = (f) => { calls.push(f); c.BGM.force = f || null };
  Object.defineProperty(c, "location", { get: () => ({ get hash() { return hash.v } }) });
  vm.createContext(c); vm.runInContext(SRC, c); assert.ok(mem);
  c.jhMzBgm(true); assert.equal(c.BGM.force, "maze/maze_1.mp3"); c.jhMzBgm(true); assert.equal(calls.length, 1, "已經在播就不重設");
  hash.v = "#/jianghu/maze"; ev.hashchange(); assert.equal(c.BGM.force, "maze/maze_1.mp3", "還在迷宮不還原");
  hash.v = "#/jianghu/hall/central"; ev.hashchange(); assert.equal(c.BGM.force, null, "離開迷宮還原");
  c.BGM.force = "guanxing/yixiang_1.mp3"; ev.hashchange(); assert.equal(c.BGM.force, "guanxing/yixiang_1.mp3", "別首指定配樂不關");
});

test("專屬配樂：出迷宮回到進去前那一首（不重新挑歌）；進去前已有別頁指定配樂時照舊交給 bgmForce(null)", () => {
  /* 模擬 01-board 真正的行為：bgmForce 換指定曲；bgmForce(null) 會 bgmSync(true)＝重新隨機挑（這裡挑成 zheng_5）；bgmSync(false) 同朝代有曲目就不換 */
  const mk = (bgm) => {
    const hash = { v: "#/jianghu/maze" }, ev = {}, log = [];
    const c = { store: { get: (k, d) => d, set() {} }, jhL: (zh) => zh, esc: String, Math, JSON, Set, Map, Number, String, Array, Object,
      BGM: bgm, addEventListener: (n, f) => { ev[n] = f } };
    c.bgmSync = (next) => { log.push("sync:" + next); if (next || c.BGM.era !== "classic" || !c.BGM.src) { c.BGM.era = "classic"; c.BGM.src = "data/bgm/classic/zheng_5.mp3"; c.BGM.last = 4 } };
    c.bgmForce = (f) => { log.push("force:" + f); c.BGM.force = f || null; if (f) { c.BGM.era = "blackhole"; c.BGM.src = "data/bgm/" + f; c.BGM.last = 0 } else c.bgmSync(true) };
    Object.defineProperty(c, "location", { get: () => ({ get hash() { return hash.v } }) });
    vm.createContext(c); vm.runInContext(SRC, c);
    return { c, hash, ev, log };
  };
  const a = mk({ force: null, era: "classic", src: "data/bgm/classic/zheng_2.mp3", last: 1 });
  a.c.jhMzBgm(true); assert.equal(a.c.BGM.src, "data/bgm/maze/maze_1.mp3");
  a.hash.v = "#/jianghu/hall/central"; a.ev.hashchange();
  assert.equal(a.c.BGM.force, null);
  assert.equal(a.c.BGM.src, "data/bgm/classic/zheng_2.mp3", "回到原本那首，不是重新挑的 zheng_5");
  assert.equal(a.c.BGM.era, "classic"); assert.equal(a.c.BGM.last, 1);
  assert.deepEqual(a.log.slice(1), ["sync:false"], "還原用 bgmSync(false)，不經過 bgmForce(null)");
  a.ev.hashchange(); assert.deepEqual(a.log.slice(1), ["sync:false"], "已經還原過，再換頁不重複動作");
  const b = mk({ force: "guanxing/yixiang_1.mp3", era: "blackhole", src: "data/bgm/guanxing/yixiang_1.mp3", last: 0 });
  b.c.jhMzBgm(true); b.hash.v = "#/jianghu/hall/central"; b.ev.hashchange();
  assert.deepEqual(b.log, ["force:maze/maze_1.mp3", "force:null", "sync:true"], "進去前是別頁指定配樂：不記原曲，照舊 bgmForce(null)");
});

test("代號表 flags-codes.json 的 maze 跟程式一致：中炮門、入口鍵相同；開著用代號表的選擇器找得到入口、關掉找不到；別的代號關掉不影響迷宮入口", () => {
  const T = JSON.parse(fs.readFileSync(path.join(ROOT, "xiangqi-lab", "tools", "flags-codes.json"), "utf8"));
  const x = T.codes.find((y) => y.code === "maze");
  assert.ok(x && x.entry, "代號表有 maze、寫了管哪個入口"); assert.equal(x.sid, "central");
  const sel = `.jh-hall-spot[data-k="${x.spot}"]`;
  const A = load({ hall: true }); withDoc(A.c); const p = hallPage(); A.c.JhHall(p.v, x.sid);
  assert.equal(p.kids.length, 1); assert.equal(p.kids[0].dataset.k, x.spot, "程式放的入口鍵＝代號表的 spot");
  assert.ok(p.v.querySelector(".jh-hall").querySelector(sel), "開著時找得到入口");
  const B = load({ hall: true, off: [x.code] }); withDoc(B.c); const r = hallPage(); B.c.JhHall(r.v, x.sid);
  assert.equal(r.v.querySelector(".jh-hall").querySelector(sel), null, "關掉 maze 後入口不見");
  const D = load({ hall: true, off: T.codes.map((y) => y.code).filter((k) => k !== "maze") }); withDoc(D.c); const s = hallPage(); D.c.JhHall(s.v, x.sid);
  assert.equal(s.kids.length, 1, "halls8、八派玩法全部關掉，迷宮入口照放");
});

test("角色走路：等速（每格 JH_MZ_SPD 秒、不是一下就到）、連走時剩餘的路照比例；到了回 false；差超過 1.5 格直接放過去（不穿牆走）；四個方向的轉身角度", () => {
  const { c } = load(), SPD = vm.runInContext("JH_MZ_SPD", c), close = (a, b) => Math.abs(a - b) < 1e-9;
  assert.ok(SPD >= .15 && SPD <= .5, "每格 0.15～0.5 秒");
  const o = { fx: 3, fy: 4 };
  assert.equal(c.jhMzGlide(o, 4, 4, SPD / 4), true, "走了四分之一格還沒到"); assert.ok(close(o.fx, 3.25) && o.fy === 4, "等速：四分之一的時間走四分之一格");
  assert.equal(c.jhMzGlide(o, 4, 4, SPD / 4), true); assert.ok(close(o.fx, 3.5), "再四分之一，一樣的距離（不是越來越慢）");
  assert.equal(c.jhMzGlide(o, 4, 4, SPD), false, "時間夠就到"); assert.equal(o.fx, 4);
  assert.equal(c.jhMzGlide(o, 4, 4, .05), false, "已經在目標格＝沒在走");
  const q = { fx: 2, fy: 2 }; assert.equal(c.jhMzGlide(q, 2, 3, 0), true, "dt=0 不動"); assert.ok(q.fx === 2 && q.fy === 2);
  const b = { fx: 1, fy: 1 }; assert.equal(c.jhMzGlide(b, 1, 9, .001), false, "被拖回入口這種大跳＝直接放到"); assert.ok(b.fx === 1 && b.fy === 9);
  const g = { fx: 5 }; c.jhMzGlide(g, 6, 2, SPD / 2); assert.equal(g.fy, 2, "暗匪沒有 fy 時補成那一列"); assert.ok(close(g.fx, 5.5));
  const yaw = vm.runInContext("jhMzYaw", c);
  assert.ok(close(yaw(0, 1), 0) && close(yaw(1, 0), Math.PI / 2) && close(Math.abs(yaw(0, -1)), Math.PI) && close(yaw(-1, 0), -Math.PI / 2), "下 0、右 90°、上 180°、左 -90°");
});

test("〔原始碼〕07z9m-maze.js：LF、沒有控制字元、沒有行內 // 註解；m.html 有登記、排在 07z9l-halls.js 後面（包得到八派的 JhHall）", () => {
  assert.ok(!SRC.includes("\r"));
  assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9l-halls.js"), b = H.indexOf("//#include m/07z9m-maze.js");
  assert.ok(a > 0 && b > a);
});
