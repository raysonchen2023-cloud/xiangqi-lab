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

/* W87a：中炮門改用題庫（多步殺）；照現在這一題的解答一步一步走，回傳最後一步的結果（ok＝解開） */
const solve = (c, S, id) => { const L = vm.runInContext("jhMzLine", c)(c.jhMzPuz(S, id)); let r = ""; for (let i = 0; i < L.length; i += 2) r = c.jhMzTry(S, id, L[i]); return r };
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
  const { c } = load(), S = c.jhMzNew(); farGuard(S); S.plate = true;   /* W71b：石門要先踩過機關踏板（鎖住的情況另一項測） */
  at(S, 6, 5); const t0 = S.turn; assert.equal(c.jhMzStep(S, 0, -1).ev, "door"); assert.equal(S.turn, t0); assert.deepEqual([S.player.x, S.player.y], [6, 5]);
  assert.equal(c.jhMzTry(S, "door", "a0a1"), "bad"); assert.equal(solve(c, S, "door"), "ok"); c.jhMzSolved(S, "door");
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

test("陷阱：答錯累計，第 4 次拖回入口（W71b：最後撿到的那件丟回原來的箱子、箱子重新出現）；解開＝暗匪暈四回合", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  const [x, y] = [7, 9]; at(S, x, y - 1); c.jhMzStep(S, 0, 1); assert.equal(S.bag.gong, 1);
  for (let i = 1; i <= 3; i++) assert.equal(c.jhMzTry(S, "trap", "a0a1"), "bad");
  assert.equal(c.jhMzTry(S, "trap", "a0a1"), "back"); assert.equal(c.jhMzCaughtBack(S), "gong", "回傳被丟回的是哪一種");
  assert.deepEqual([S.player.x, S.player.y], [S.start.x, S.start.y]); assert.equal(S.bag.gong, 0, "最後撿到的被搶走"); assert.equal(S.grid[y][x], "C", "箱子重新出現"); assert.equal(S.fails.trap, 0);
  const S2 = c.jhMzNew(); assert.equal(solve(c, S2, "trap"), "ok"); c.jhMzSolved(S2, "trap"); assert.equal(S2.guard.stun, 4);
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
  const { c } = load(), S = c.jhMzNew(); farGuard(S); S.plate = true;   /* W71b：踏板踩過之後，碰門才是開殘局 */
  at(S, 6, 5);
  for (let i = 0; i < 6; i++) { assert.equal(c.jhMzStep(S, 0, -1).ev, "door"); assert.equal(S.player.y, 5); assert.equal(S.grid[4][6], "D") }
  for (let i = 0; i < 6; i++) assert.equal(c.jhMzTry(S, "door", "e0e1"), "bad");
  assert.equal(S.grid[4][6], "D", "解錯不開"); assert.ok(!S.doorOpen);
  for (let y = 0; y < S.H; y++) S.seen.add(y * S.W + 6);
  const p = c.jhMzPath(S, 6, 2); assert.equal(p, null, "門沒開，自動走也到不了門後");
  assert.equal(solve(c, S, "door"), "ok"); c.jhMzSolved(S, "door"); assert.equal(S.grid[4][6], "."); assert.ok(S.doorOpen);
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

test("角色走路：等速（每格 JH_MZ_SPD 秒、不是一下就到）、連走時剩餘的路照比例；到了回 false；差超過 2.5 格直接放過去（不穿牆走；跳過糧袋 2 格照常等速）；四個方向的轉身角度", () => {
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

test("W71b 糧袋當炮架：隔一袋跳過去（算一步、落在後面那格）；兩袋並排、後面是牆都跳不過；跳過去踩到機關踏板＝踏板啟動", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  assert.equal(c.JH_MZ_MAP[9][8], "S"); assert.equal(c.JH_MZ_MAP[10][8], "P");
  at(S, 8, 8); const t0 = S.turn, r = c.jhMzStep(S, 0, 1);
  assert.equal(r.ev, "jump"); assert.deepEqual([S.player.x, S.player.y], [8, 10], "落在糧袋後面那一格（踏板）"); assert.equal(S.turn, t0 + 1, "跳一次算一步");
  assert.ok(r.plate && S.plate, "踩到踏板＝啟動"); assert.equal(c.jhMzStep(S, 0, 0).plate, undefined, "已經啟動不再算");
  assert.equal(c.jhMzStep(S, 0, -1).ev, "jump"); assert.deepEqual([S.player.x, S.player.y], [8, 8], "從踏板跳回來");
  const S2 = c.jhMzNew(); farGuard(S2); S2.grid[9][8] = "S"; S2.grid[10][8] = "S"; at(S2, 8, 8);
  assert.equal(c.jhMzStep(S2, 0, 1).ev, "wall", "兩袋並排跳不過"); assert.deepEqual([S2.player.x, S2.player.y], [8, 8]);
  const S3 = c.jhMzNew(); farGuard(S3); S3.grid[10][8] = "#"; at(S3, 8, 8);
  assert.equal(c.jhMzStep(S3, 0, 1).ev, "wall", "糧袋後面是牆跳不過");
  const S4 = c.jhMzNew(); farGuard(S4); at(S4, 8, 8); S4.grid[9][8] = "."; assert.equal(c.jhMzStep(S4, 0, 1).ev, "move", "沒有糧袋就是一般走一格"); assert.equal(S4.player.y, 9);
});

test("W71b 石門鎖：沒踩過踏板碰石門＝locked（不算回合、不開殘局、不穿過去）；踩過才是 door；點地面自動走到不了踏板（只能跳）", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  at(S, 6, 5); const t0 = S.turn;
  assert.equal(c.jhMzStep(S, 0, -1).ev, "locked"); assert.equal(S.turn, t0); assert.deepEqual([S.player.x, S.player.y], [6, 5]); assert.equal(S.grid[4][6], "D");
  S.plate = true; assert.equal(c.jhMzStep(S, 0, -1).ev, "door");
  const S2 = c.jhMzNew(); for (let i = 0; i < S2.W * S2.H; i++) S2.seen.add(i);
  assert.equal(c.jhMzPath(S2, 8, 10), null, "踏板四周是牆和糧袋，自動走到不了");
  const M = c.JH_MZ_MAP; assert.deepEqual([M[10][7], M[10][9], M[11][8]], ["#", "#", "#"], "踏板只有糧袋那一側能進");
});

test("W71b 拖回入口：最後撿到的丟回原來的箱子（箱子重新出現、再撿一次拿到同一種）；先撿的照舊保留；什麼都沒撿就回空字串", () => {
  const { c } = load(), S = c.jhMzNew(); farGuard(S);
  assert.equal(c.jhMzCaughtBack(S), "", "沒撿東西");
  at(S, 7, 8); c.jhMzStep(S, 0, 1); at(S, 2, 12); c.jhMzStep(S, -1, 0);
  assert.deepEqual([S.bag.gong, S.bag.page], [1, 1]);
  assert.equal(c.jhMzCaughtBack(S), "page"); assert.deepEqual([S.bag.gong, S.bag.page], [1, 0], "先撿的保留、最後撿的被搶");
  assert.equal(S.grid[12][1], "C", "被搶的那個箱子重新出現"); assert.equal(S.grid[9][7], ".", "先撿的箱子不會回來");
  at(S, 2, 12); const r = c.jhMzStep(S, -1, 0); assert.equal(r.chest, "page", "再撿一次拿到同一種"); assert.equal(S.bag.page, 1);
  S.plate = true; c.jhMzCaughtBack(S); assert.ok(S.plate, "踏板啟動過就不用再踩");
});

test("W71b 跳過糧袋 2 格照常等速走（不是瞬移）；超過 2.5 格才直接放到", () => {
  const { c } = load(), SPD = vm.runInContext("JH_MZ_SPD", c);
  const o = { fx: 8, fy: 8 }; assert.equal(c.jhMzGlide(o, 8, 10, SPD / 2), true, "2 格要走一段時間"); assert.ok(Math.abs(o.fy - 8.5) < 1e-9);
  const b = { fx: 8, fy: 8 }; assert.equal(c.jhMzGlide(b, 8, 11, .001), false, "3 格直接放到"); assert.equal(b.fy, 11);
});

test("〔原始碼〕07z9m-maze.js：LF、沒有控制字元、沒有行內 // 註解；m.html 有登記、排在 07z9l-halls.js 後面（包得到八派的 JhHall）", () => {
  assert.ok(!SRC.includes("\r"));
  assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC));
  for (const line of SRC.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code) && !/^\s*\/\//.test(line), "行內 // 註解：" + line.slice(0, 60)) }
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), a = H.indexOf("//#include m/07z9l-halls.js"), b = H.indexOf("//#include m/07z9m-maze.js");
  assert.ok(a > 0 && b > a);
});

/* ---------- W87（11/24）九派地底迷宮共用：門派登記、守衛走法、多步殺、題庫輪換、存檔分開、入口與路由 ---------- */
/* 測試用的假門派：直走的車（上下巡）＋橫走的車兩個守衛；R＝擋路但透光（像太湖石）；題庫兩題兩步殺；onStep 推箱子 B */
const FAKE = `jhMzDef("testsch",{map:[
"#########",
"#@..R...#",
"#.......#",
"#..B....#",
"#.......#",
"#...P..>#",
"####D####",
"#########"],
  guards:[{kind:"rook",x:6,y:1,dx:0,dy:1},{kind:"rook",x:1,y:4,dx:1,dy:0,range:3}],solid:"#SDRB",opaque:"#D",
  pool:{door:[{zh:["門一","說明"],en:["d1","x"],fen:"4k4/9/9/9/9/9/9/9/9/4K4",line:["a0a1","a9a8","a1a9"]},{zh:["門二","說明"],en:["d2","x"],fen:"4k4/9/9/9/9/9/9/9/9/4K4",line:["b0b1","b9b8","b1b9"]}],
        trap:[{zh:["陷一","x"],en:["t1","x"],fen:"4k4/9/9/9/9/9/9/9/9/4K4",ans:"c0c1"},{zh:["陷二","x"],en:["t2","x"],fen:"4k4/9/9/9/9/9/9/9/9/4K4",ans:"d0d1"}]},
  rew:[{k:"a",zh:"甲",en:"A"},{k:"b",zh:"乙",en:"B"}],xp:12,xpKey:"maze:testsch:1",key:"jhMaze_testsch",hall:{at:[100,100],zh:"測試入口",en:"Test"},
  onStep(S,dx,dy,c){if(c!=="B")return null;const P=S.player,bx=P.x+dx*2,by=P.y+dy*2;if(jhMzSolid(S,bx,by))return{ev:"wall"};S.grid[P.y+dy][P.x+dx]=".";S.grid[by][bx]="B";P.x+=dx;P.y+=dy;S.turn++;return{ev:"push"}}});`;
const loadF = (o = {}) => { const L = load(o); vm.runInContext(FAKE, L.c); return L };

test("W87 門派登記：中炮門照舊登記、設定照原本的常數；路由 #/jianghu/maze＝中炮門、#/jianghu/maze/<派> 有登記才算、其他網址不是迷宮", () => {
  const { c } = loadF(), LV = vm.runInContext("JH_MZ_LV", c), sidOf = vm.runInContext("jhMzSidOf", c);   /* const 宣告的不在 vm 的全域物件上，要用 runInContext 取 */
  const lv = LV.central; assert.ok(lv); assert.equal(lv.map, c.JH_MZ_MAP); assert.equal(lv.puz, c.JH_MZ_PUZ); assert.equal(lv.key, "jhMaze"); assert.equal(lv.jump, "S");
  assert.equal(sidOf("#/jianghu/maze"), "central"); assert.equal(sidOf("#/jianghu/maze/central"), "central"); assert.equal(sidOf("#/jianghu/maze/testsch"), "testsch");
  assert.equal(sidOf("#/jianghu/maze/nosuch"), null, "沒登記的派不算迷宮（不能隨便開）"); assert.equal(sidOf("#/jianghu/hall/central"), null); assert.equal(sidOf("#/jianghu"), null);
  const S = c.jhMzNew("testsch"); assert.equal(S.sid, "testsch"); assert.equal(S.W, 9); assert.equal(S.H, 8); assert.equal(S.guards.length, 2); assert.equal(S.guard, S.guards[0]);
  assert.equal(c.jhMzNew().sid, "central", "沒給＝中炮門"); assert.equal(c.jhMzNew("nosuch").sid, "central");
});

test("W87 守衛：直走的車上下巡、碰牆掉頭；兩個守衛都會走、都會抓人，抓到的記在 caughtBy，解開陷阱暈的是它；範圍照 range", () => {
  const { c } = loadF(), S = c.jhMzNew("testsch"), [A, B] = S.guards;
  assert.deepEqual(JSON.parse(JSON.stringify(c.jhMzSight(S, A).map((q) => [q.x, q.y]))), [[6, 2], [6, 3], [6, 4], [6, 5]], "往下看到第 5 列為止（第 6 列是牆）");
  c.jhMzGuardStep(S); assert.deepEqual([A.x, A.y, B.x, B.y], [6, 2, 2, 4], "兩個都走一步");
  A.y = 5; A.dy = 1; c.jhMzGuardStep(S); assert.deepEqual([A.y, A.dy], [4, -1], "下面是牆就掉頭往上");
  assert.equal(c.jhMzSight(S, B).length, 3, "range 3 只看得到 3 格");
  S.player.x = 4; S.player.y = 4; A.stun = 9; assert.ok(c.jhMzCaught(S), "第二個守衛看得到"); assert.equal(S.caughtBy, B);
  c.jhMzSolved(S, "trap"); assert.equal(B.stun, 4, "暈的是抓到人的那個"); assert.equal(S.caughtBy, null);
});

test("W87 擋路與擋光分開：R 擋路但透光（光、視線穿得過去），沒設 jump 的門派糧袋不能跳；onStep 機關（推箱子）照該派寫的走", () => {
  const { c } = loadF(), S = c.jhMzNew("testsch"); S.guards.forEach((G) => (G.stun = 99));
  assert.ok(c.jhMzSolid(S, 4, 1), "R 擋路"); assert.ok(!c.jhMzOpaque(S, 4, 1), "R 不擋光"); assert.ok(c.jhMzLos(S, 3, 1, 5, 1), "光穿得過 R");
  S.player.x = 3; S.player.y = 1; assert.equal(c.jhMzStep(S, 1, 0).ev, "wall", "R 走不進去、也不能跳（這派沒設 jump）");
  S.player.x = 3; S.player.y = 2; const r = c.jhMzStep(S, 0, 1); assert.equal(r.ev, "push"); assert.deepEqual([S.player.x, S.player.y, S.grid[4][3], S.grid[3][3]], [3, 3, "B", "."], "箱子往前推一格");
});

test("W87 多步殺：照 line 一步一步走——走對回 next（還沒將死）、最後一步回 ok；中途走錯回 bad、從頭再來；一步殺（ans）照舊", () => {
  const { c } = loadF(), S = c.jhMzNew("testsch", 0), P = c.jhMzPuz(S, "door");
  assert.equal(P.en[0], "d1");
  assert.equal(c.jhMzTry(S, "door", "a0a1"), "next"); assert.deepEqual({ ...S.pz }, { id: "door", i: 2 });
  assert.equal(c.jhMzTry(S, "door", "a1a9"), "ok"); assert.equal(S.pz, null);
  assert.equal(c.jhMzTry(S, "door", "a0a1"), "next"); assert.equal(c.jhMzTry(S, "door", "h0h1"), "bad", "中途走錯"); assert.equal(S.pz, null);
  assert.equal(c.jhMzTry(S, "door", "a1a9"), "bad", "從頭再來：第二步不能直接接上"); assert.equal(S.fails.door, 2);
  assert.equal(c.jhMzTry(S, "trap", "c0c1"), "ok", "一步殺照舊");
});

test("W87／W87a 題庫輪換：每一次遇到（被抓、碰門）開始時才定題、指標往後推——同一次答錯重來還是同一題，下一次換下一題；開新一輪接著上一輪的指標（換輪第一題不跟上一輪最後一題一樣）；沒給指標就照第幾次走", () => {
  const { c } = loadF();
  assert.equal(c.jhMzPuz(c.jhMzNew("testsch", 0), "door").en[0], "d1"); assert.equal(c.jhMzPuz(c.jhMzNew("testsch", 1), "door").en[0], "d2", "沒給指標：第二次走換一題");
  const S = c.jhMzNew("testsch", 0); let p = c.jhMzEncounter(S, "trap"); assert.equal(c.jhMzPuz(S, "trap").en[0], "t1");
  assert.equal(c.jhMzTry(S, "trap", "h0h1"), "bad"); assert.equal(c.jhMzPuz(S, "trap").en[0], "t1", "同一次答錯重來還是同一題");
  c.jhMzSolved(S, "trap"); p = c.jhMzEncounter(S, "trap"); assert.equal(c.jhMzPuz(S, "trap").en[0], "t2", "下一次被抓換下一題");
  c.jhMzCaughtBack(S); p = c.jhMzEncounter(S, "trap"); assert.equal(c.jhMzPuz(S, "trap").en[0], "t1", "兩題輪回來");
  assert.deepEqual({ ...p }, { door: 0, trap: 3 }, "回傳下一輪從哪裡接");
  const T = c.jhMzNew("testsch", 0, p); c.jhMzEncounter(T, "trap"); assert.equal(c.jhMzPuz(T, "trap").en[0], "t2", "換輪接著上一輪：上一輪最後是 t1，這一輪第一題是 t2");
  /* #105 審查（要改 2）：題庫空的門派照用固定題——另外定一個 pool:{} 的門派驗 jhMzPuz 的退路 */
  vm.runInContext('jhMzDef("nopool",{map:["#####","#@.>#","#####"],guards:[],pool:{},puz:{door:{zh:["固","x"],en:["fixed-door","x"],fen:"4k4/9/9/9/9/9/9/9/9/4K4",ans:"a0a1"},trap:{zh:["固","x"],en:["fixed-trap","x"],fen:"4k4/9/9/9/9/9/9/9/9/4K4",ans:"a0a1"}}});', c);
  const N = c.jhMzNew("nopool", 0), LVN = vm.runInContext("JH_MZ_LV", c).nopool;
  assert.equal(c.jhMzPuz(N, "door"), LVN.puz.door, "沒有題庫：石門用固定題"); assert.equal(c.jhMzPuz(N, "trap"), LVN.puz.trap, "沒有題庫：陷阱用固定題");
  c.jhMzSolved(N, "door"); assert.equal(c.jhMzPuz(c.jhMzNew("nopool", 3), "door"), LVN.puz.door, "再走幾次也還是固定題");
  assert.equal(c.jhMzPuz(c.jhMzNew("central", 5), "door").fen !== undefined, true, "中炮門有題庫，照題庫出題");
});

test("W87 存檔分開：每一派存自己的鍵、修為照自己的 xp 與代號；中炮門照舊存 jhMaze（舊存檔不用搬）；獎勵照該派的 rew", () => {
  const { c, xp, mem } = loadF(), S = c.jhMzNew("testsch"); S.turn = 9; S.bag.a = 1;
  const r = c.jhMzSave(S); assert.ok(r.first); assert.deepEqual(xp, [[12, "maze:testsch:1"]]);
  assert.ok("jhMaze_testsch" in mem); assert.ok(!("jhMaze" in mem), "不會寫到中炮門的存檔");
  assert.deepEqual(JSON.parse(mem.jhMaze_testsch), { clear: 1, best: 9, a: 1, b: 0 });
  assert.deepEqual({ ...c.jhMzGet("testsch") }, { clear: 1, best: 9, a: 1, b: 0 }); assert.equal(c.jhMzGet("central").clear, 0);
  const T = c.jhMzNew("testsch"); for (let i = 0; i < T.W * T.H; i++) T.seen.add(i); T.guards.forEach((G) => (G.stun = 99));
  T.grid[2][2] = "C"; T.chests.add(2 * T.W + 2); T.chest0 = 1; T.player.x = 2; T.player.y = 1; const e = c.jhMzStep(T, 0, 1); assert.equal(e.chest, "a", "箱子給的是這一派的獎勵");
});

test("W87 門內頁入口：有登記 hall 的門派都放（網址 #/jianghu/maze/<派>），中炮門照舊 #/jianghu/maze；沒登記的不放；路由帶 sid 進 JhMaze", () => {
  const A = loadF({ hall: true }); withDoc(A.c);
  const p = hallPage(); A.c.JhHall(p.v, "testsch"); assert.equal(p.kids.length, 1); assert.match(p.kids[0].innerHTML, /測試入口/);
  p.kids[0].onclick({ stopPropagation() {} }); assert.deepEqual(A.c.__went, ["#/jianghu/maze/testsch"]);
  const q = hallPage(); A.c.JhHall(q.v, "horse"); assert.equal(q.kids.length, 0, "沒登記的派不放");
  let got = null; A.c.JhMaze = (v, sid) => { got = sid; return { maze: 1 } }; A.c.BGM = { force: null }; A.c.bgmForce = (f) => { A.c.BGM.force = f || null };
  A.hash.v = "#/jianghu/maze/testsch"; assert.deepEqual(A.c.Jianghu({}), { maze: 1 }); assert.equal(got, "testsch");
  A.hash.v = "#/jianghu/maze/nosuch"; assert.deepEqual(A.c.Jianghu({}), { scroll: 1 }, "沒登記的派照舊畫長卷");
});

/* ---------- W87a（11/24 開發者 iPhone 實機回報）中炮門重改 ---------- */
test("W87a 中炮門題庫：石門至少 3 題、陷阱至少 5 題，每題 2～3 步殺；core.js 獨立重算——主變每一步合法、走完黑方被將死、最後一步是炮、最後那一步殺只有一種；題目不重複", () => {
  const { c } = load(), POOL = vm.runInContext("JH_MZ_POOL_CENTRAL", c), LV = vm.runInContext("JH_MZ_LV", c);
  assert.equal(LV.central.pool, POOL, "中炮門用這份題庫");
  assert.ok(POOL.door.length >= 3, "石門 " + POOL.door.length); assert.ok(POOL.trap.length >= 5, "陷阱 " + POOL.trap.length);
  const ids = new Set();
  for (const [kind, L] of [["door", POOL.door], ["trap", POOL.trap]]) for (const P of L) {
    assert.ok(!ids.has(P.id), P.id + " 重複"); ids.add(P.id);
    const n = (P.line.length + 1) / 2; assert.ok(Number.isInteger(n) && n >= 2 && n <= 3, P.id + " 步數 " + n);
    assert.ok(P.zh[1].includes(n + " 步") && P.en[1].includes("in " + n), P.id + " 說明寫的步數跟主變一樣");
    let B = C.parseFen(P.fen).slice(0, 90), s = "r", before = null;
    assert.ok(!C.inCheck(B, "b"), P.id + " 開局黑方沒被將");
    for (let i = 0; i < P.line.length; i++) {
      const u = P.line[i], f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4));
      assert.ok(B[f] && C.sideOf(B[f]) === s && C.legal(B, s).some((m) => m[0] === f && m[1] === t), P.id + " 第 " + (i + 1) + " 手不合法：" + u);
      if (i === P.line.length - 1) { before = B.slice(); assert.equal(B[f].toUpperCase(), "C", P.id + " 最後一步要是炮") }
      B = C.make(B, f, t); s = C.opp(s);
    }
    assert.ok(C.inCheck(B, "b") && C.legal(B, "b").length === 0, P.id + " 走完黑方要被將死");
    const mates = C.legal(before, "r").filter(([f, t]) => { const nb = C.make(before, f, t); return C.inCheck(nb, "b") && C.legal(nb, "b").length === 0 });
    assert.equal(mates.length, 1, P.id + " 最後一步殺只有一種（core.js 重算）");
  }
});

test("W87a 連續被抓題目不重複：題庫有 N 題，同一輪連續被抓 N 次 N 題都不一樣；開新一輪接著出，第一題不跟上一輪最後一題一樣", () => {
  const { c } = load(), POOL = vm.runInContext("JH_MZ_POOL_CENTRAL", c), N = POOL.trap.length;
  const S = c.jhMzNew("central", 0, { door: 0, trap: 0 }), seen = [];
  let p = null; for (let i = 0; i < N; i++) { p = c.jhMzEncounter(S, "trap"); seen.push(c.jhMzPuz(S, "trap").id); c.jhMzSolved(S, "trap") }
  assert.equal(new Set(seen).size, N, "同一輪 N 次都不一樣：" + seen.join("、"));
  const S2 = c.jhMzNew("central", 1, p); c.jhMzEncounter(S2, "trap");
  assert.notEqual(c.jhMzPuz(S2, "trap").id, seen[seen.length - 1], "換輪第一題不跟上一輪最後一題一樣");
  const S3 = c.jhMzNew("central", 0, { door: 0, trap: 0 }); c.jhMzEncounter(S3, "trap"); const id1 = c.jhMzPuz(S3, "trap").id;
  c.jhMzTry(S3, "trap", "a0a1"); c.jhMzTry(S3, "trap", "a0a1"); assert.equal(c.jhMzPuz(S3, "trap").id, id1, "同一次答錯重來還是同一題");
  const { mem } = (() => { const L = load(); L.c.jhMzPtrSet("central", { door: 2, trap: 7 }); return L })();
  assert.deepEqual(JSON.parse(mem.jhMazePtr), { door: 2, trap: 7 }, "指標存在 jhMazePtr（跟通關紀錄 jhMaze 分開）");
});

test("W87a 暗匪轉身才看到玩家：先提醒（spot）不直接抓；下一步還在紅線上（或原地等）才抓、離開紅線就沒事；自己走進紅線、暗匪走到玩家那一格照舊直接抓", () => {
  const { c } = load(), at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
  const S = c.jhMzNew(); S.guard.x = 13; S.guard.y = 12; S.guard.dx = 1; at(S, 10, 11);   /* 第 12 列 14 是牆：暗匪在 13 往右走不了，轉身走到 12、面向左 */
  const r = c.jhMzStep(S, 0, 1); assert.equal(r.ev, "spot", "暗匪碰牆轉身、看到玩家：先提醒"); assert.deepEqual([S.guard.x, S.guard.dx], [12, -1]);
  assert.equal(c.jhMzStep(S, 0, 0).ev, "trap", "原地等＝還在紅線上，抓");
  const S2 = c.jhMzNew(); S2.guard.x = 13; S2.guard.y = 12; S2.guard.dx = 1; at(S2, 10, 11); c.jhMzStep(S2, 0, 1);
  assert.notEqual(c.jhMzStep(S2, 0, -1).ev, "trap", "離開紅線就沒事");
  const S3 = c.jhMzNew(); S3.guard.x = 5; S3.guard.y = 12; S3.guard.dx = 1; at(S3, 6, 11); assert.equal(c.jhMzStep(S3, 0, 1).ev, "trap", "自己走進紅線照舊直接抓");
  const S4 = c.jhMzNew(); S4.guard.x = 8; S4.guard.y = 12; S4.guard.dx = 1; at(S4, 9, 11); S4.grid[13][9] = "#"; assert.equal(c.jhMzStep(S4, 0, 1).ev, "trap", "走到暗匪正前方一格：照舊直接抓（在視線裡）");
});

test("#105 審查（要改 1）：暗匪碰牆掉頭、這一步正好會踩到背後的玩家——掉頭前地上沒有紅線，所以這一回合只轉身、給提醒（spot），下一回合還在紅線上才抓", () => {
  const { c } = load(), at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
  /* 代理人找到的例子：暗匪在 (13,12) 朝右（右邊是牆），玩家在 (12,12) */
  const S = c.jhMzNew(); S.guard.x = 13; S.guard.y = 12; S.guard.dx = 1; at(S, 12, 12);
  assert.equal(c.jhMzSight(S, S.guard).length, 0, "掉頭前面向牆，沒有紅線");
  const r = c.jhMzStep(S, 0, 0); assert.equal(r.ev, "spot", "原地等：暗匪只轉身、先提醒"); assert.deepEqual([S.guard.x, S.guard.dx], [13, -1], "位置不動、朝向換成往左");
  assert.equal(c.jhMzStep(S, 0, 0).ev, "trap", "提醒後還站在紅線上：抓");
  const S2 = c.jhMzNew(); S2.guard.x = 13; S2.guard.y = 12; S2.guard.dx = 1; at(S2, 11, 12);
  assert.equal(c.jhMzStep(S2, 1, 0).ev, "spot", "從 (11,12) 走到 (12,12)：一樣先提醒"); assert.deepEqual([S2.guard.x, S2.guard.y], [13, 12]);
  /* 窮舉：第 12 列每個位置、兩種朝向，玩家在第 12 列每一格做 5 種動作；只要回 trap，就一定是「走之前玩家已經在紅線上」或「玩家自己走進暗匪那格／紅線」 */
  let n = 0;
  for (let gx = 1; gx <= 13; gx++) for (const gd of [1, -1]) for (let px = 1; px <= 13; px++) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const T = c.jhMzNew(); if (T.grid[12][gx] !== "." && T.grid[12][gx] !== "C" || T.grid[12][px] === "#") continue; T.guard.x = gx; T.guard.y = 12; T.guard.dx = gd; at(T, px, 12);
    if (c.jhMzCaught(T)) continue; T.caughtBy = null;
    const sawBefore = (x, y) => { const U = c.jhMzNew(); U.guard.x = gx; U.guard.y = 12; U.guard.dx = gd; at(U, x, y); return c.jhMzCaught(U) };
    const nx = px + dx, ny = 12 + dy, e = c.jhMzStep(T, dx, dy).ev; n++;
    if (e === "trap") assert.ok(sawBefore(T.player.x, T.player.y), `暗匪 (${gx},12) 朝 ${gd}、玩家 (${px},12) 動作 ${dx},${dy}：沒有預警就被抓`);
  }
  assert.ok(n > 300, "窮舉的情況夠多：" + n);
});

test("#105 審查建議 1：兩個守衛時，先看有沒有守衛站在玩家那格（trap），再看視線", () => {
  const { c } = loadF(), S = c.jhMzNew("testsch"), [A, B] = S.guards;
  S.player.x = 6; S.player.y = 3; A.x = 6; A.y = 1; A.dy = 1; B.x = 6; B.y = 3; B.dx = 1;
  assert.ok(c.jhMzCaught(S)); assert.equal(S.caughtBy, B, "站在玩家那格的是第二個守衛，記它（不是只看到的第一個）");
});

test("W87a 殘局小棋盤（開發者 iPhone：「棋盤少了L型標誌兵和炮的位置」）：4 個炮位、10 個兵位的 L 型記號（第 0、8 路只畫朝內那一半），河界寫楚河、漢界", () => {
  const { c } = load(), s = c.jhMzGrid(40, 24, 24), marks = s.match(/<path class="mk" d="M[^"]+"/g) || [];
  assert.equal(marks.length, 4 * 4 + 6 * 4 + 4 * 2, "炮位 4×4＋兵位中間 6×4＋邊上 4×2＝48 段");
  const pt = (c0, r0) => marks.filter((m) => { const [x, y] = m.match(/M([\d.]+) ([\d.]+)/).slice(1).map(Number); return Math.abs(x - (24 + c0 * 40)) < 14 && Math.abs(y - (24 + r0 * 40)) < 14 }).length;
  for (const [c0, r0] of [[1, 2], [7, 2], [1, 7], [7, 7], [2, 3], [4, 3], [6, 3], [2, 6], [4, 6], [6, 6]]) assert.equal(pt(c0, r0), 4, "第 " + c0 + " 路第 " + r0 + " 列四角都有");
  for (const [c0, r0] of [[0, 3], [8, 3], [0, 6], [8, 6]]) assert.equal(pt(c0, r0), 2, "邊上 " + c0 + " 路只畫朝內兩角");
  assert.ok(s.includes(">楚河<") && s.includes(">漢界<"), "河界有字");
  assert.equal((s.match(/<line /g) || []).length, 10 + 2 + 7 * 2 + 4, "格線照舊：橫 10、邊上直線 2、中間直線 7×2（河界斷開）、九宮斜線 4");
});

test("〔原始碼〕W87a 紅線、暗匪在暗處也畫出來（開發者：「玩家沒有走到暗匪那邊 就會觸發被暗匪抓住」——暗處被看到時原本看不到紅線）", () => {
  assert.ok(SRC.includes("o.visible=true;o.position.set(c.x+.5,.012,c.y+.5)}"), "3D 紅線不看亮度");
  assert.ok(SRC.includes("const G=q.G;q.gd.visible=true;"), "3D 暗匪不看亮度");
  assert.ok(!/jhMzSight\(S,G\)\)if\(L\[/.test(SRC), "平面版紅線不看亮度");
});

test("W87a 中炮門題目出自古譜（開發者 11/24：「你也可以從古譜找題目 比較可靠 古譜+pikafish」）：每題記出處（書名、局名），不收實戰對局", () => {
  const { c } = load(), POOL = vm.runInContext("JH_MZ_POOL_CENTRAL", c);
  for (const P of [...POOL.door, ...POOL.trap]) {
    assert.ok(P.src && P.src.book && P.src.title, P.id + " 要有出處");
    assert.ok(!/特級大師|對局|實戰/.test(P.src.book), P.id + " 不是古譜：" + P.src.book);
  }
});
