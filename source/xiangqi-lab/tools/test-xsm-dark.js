// 開發者 11/14：西市聽雨茶坊的臺灣暗棋（m/07xsd-xsmdark.js；規則 xiangqi-db/story/西市文案定稿草案_1113.md 第一節 5、新手體驗定案_141 暗棋定案）。
// 不開瀏覽器：模組丟進 vm 跑純函式（發牌、先翻定色、大小、炮跳吃、走一格、不連吃、50 手和、吃光／無棋可走、電腦、紀錄），再查接線（茶坊攤位、路由、include、存檔鍵、名稱不撞）。
// 用法 node --test xiangqi-lab/tools/test-xsm-dark.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = p => fs.readFileSync(path.join(ROOT, "xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC = M("m/07xsd-xsmdark.js");
const J = x => JSON.parse(JSON.stringify(x)), deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
function load(g) {
  const st = Object.assign({}, (g && g.st) || {});
  const ctx = vm.createContext(Object.assign({ setTimeout: () => 0, clearTimeout: () => { }, addEventListener: () => { }, removeEventListener: () => { }, Math, Object, Array, JSON, Number, Set, Date, Infinity,
    NAMES: { r: { K: "帥", A: "仕", B: "相", N: "傌", R: "俥", C: "炮", P: "兵" }, b: { K: "將", A: "士", B: "象", N: "馬", R: "車", C: "砲", P: "卒" } },
    store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } } }, g || {}));
  vm.runInContext(SRC, ctx); ctx._st = st; return ctx;
}
const C = load(), R = s => vm.runInContext(s, C);
const { xsdDeal, xsdNew, xsdEats, xsdMoves, xsdActs, xsdDo, xsdJudge, xsdThink, xsdRng, xsdTally, xsdOkRun, xsdRec, xsdPool } = C;
/* 棋子代號：種類 1 兵 2 炮 3 傌 4 俥 5 相 6 仕 7 帥；+8 黑；+16 蓋著 */
const P = 1, Cn = 2, N = 3, Rk = 4, B = 5, A = 6, K = 7, BLK = 8, HID = 16;
const at = (x, y) => y * 4 + x, mv = (f, t) => f * 32 + t, flip = i => i * 33;
/* 擺一盤：cells＝{格: 代號}；你執紅（col [0,1]）、輪到你 */
function S0(cells, o) { const b = Array(32).fill(0); for (const [i, p] of Object.entries(cells)) b[+i] = p; return Object.assign({ b, cur: 0, col: [0, 1], q: 0, n: 10, flips: 5, cap: [[], []], h: [], last: null, over: null }, o || {}) }
const has = (S, a) => J(xsdActs(S)).includes(a);

test("發牌：4×8 共 32 格，紅黑各 16 子（帥 1、仕 2、相 2、俥 2、傌 2、炮 2、兵 5），全部蓋著、亂數擺", () => {
  const b = J(xsdDeal(xsdRng(1)));
  assert.equal(b.length, 32);
  assert.ok(b.every(p => p & HID), "全部蓋著");
  for (const c of [0, BLK]) {
    const k = b.filter(p => (p & 8) === c).map(p => p & 7).sort();
    deq(k, [1, 1, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7], c ? "黑" : "紅");
  }
  assert.notDeepEqual(b, J(xsdDeal(xsdRng(2))), "不同亂數，擺法不同");
  deq(b, J(xsdDeal(xsdRng(1))), "同一個亂數種子擺法相同（可重現）");
  const S = xsdNew(xsdRng(3), false);
  assert.equal(S.cur, 0); assert.equal(S.col, null); assert.equal(S.q, 0); assert.equal(xsdNew(xsdRng(3), true).cur, 1, "電腦先");
});

test("先翻定色：第一顆翻出什麼顏色，翻的人就執那一色；翻開以前只能翻", () => {
  const S = xsdNew(xsdRng(5), false);
  const A0 = J(xsdActs(S)); assert.equal(A0.length, 32); assert.ok(A0.every(a => ((a / 32) | 0) === a % 32), "只有翻子");
  const i = 7, c = (S.b[i] >> 3) & 1, N1 = xsdDo(S, flip(i));
  deq(N1.col, [c, 1 - c], "你翻 → 你執翻出的顏色"); assert.equal(N1.b[i] & HID, 0, "翻開了"); assert.equal(N1.cur, 1, "換電腦");
  const T = xsdNew(xsdRng(5), true), N2 = xsdDo(T, flip(i));
  deq(N2.col, [1 - c, c], "電腦先翻 → 電腦執翻出的顏色、你執另一色");
  const N3 = xsdDo(N1, flip(8)); deq(N3.col, N1.col, "第二顆不再改顏色");
  assert.equal(xsdDo(N1, flip(i)), null, "翻過的不能再翻");
});

test("大小：帥＞仕＞相＞俥＞傌＞炮＞兵；大吃小、同級可吃；兵可吃帥、帥不可吃兵", () => {
  for (let a = 1; a <= 7; a++) for (let t = 1; t <= 7; t++) {
    let want = a >= t; if (a === K && t === P) want = false; if (a === P && t === K) want = true;
    assert.equal(xsdEats(a, t), want, `${a} 吃 ${t}`);
  }
  assert.equal(xsdEats(K, K), true, "同級可吃（帥吃將）"); assert.equal(xsdEats(P, P), true, "兵吃卒");
  assert.equal(xsdEats(P, Cn), false, "兵不能吃炮"); assert.equal(xsdEats(Rk, B), false, "俥不能吃相");
  /* 盤面上：帥旁邊的卒吃不到…反過來，卒可以吃帥 */
  const S = S0({ [at(1, 1)]: K, [at(2, 1)]: P | BLK, [at(0, 7)]: P });
  assert.ok(!has(S, mv(at(1, 1), at(2, 1))), "帥不可吃卒");
  const T = S0({ [at(1, 1)]: K | BLK, [at(2, 1)]: P, [at(3, 7)]: A | BLK });
  assert.ok(has(T, mv(at(2, 1), at(1, 1))), "兵可吃將");
  const U = S0({ [at(1, 1)]: Rk, [at(2, 1)]: Rk | BLK, [at(1, 2)]: N | BLK, [at(1, 0)]: B | BLK });
  assert.ok(has(U, mv(at(1, 1), at(2, 1))), "俥吃車（同級）"); assert.ok(has(U, mv(at(1, 1), at(1, 2))), "俥吃馬"); assert.ok(!has(U, mv(at(1, 1), at(1, 0))), "俥吃不到象");
});

test("走一格：上下左右一格到空格；不能斜走、不能走兩格、不能走到蓋著的子或自己的子上、不能動對方的子", () => {
  const S = S0({ [at(1, 3)]: N, [at(1, 2)]: HID | P, [at(2, 3)]: A, [at(3, 7)]: K | BLK });
  const L = J(xsdActs(S)).filter(a => ((a / 32) | 0) === at(1, 3)).map(a => a % 32).sort((a, b) => a - b);
  deq(L, [at(0, 3), at(1, 4)].sort((a, b) => a - b), "傌只能往左、往下（上面蓋著、右邊是自己的仕）");
  assert.equal(xsdDo(S, mv(at(1, 3), at(1, 5))), null, "走兩格不行"); assert.equal(xsdDo(S, mv(at(1, 3), at(0, 4))), null, "斜走不行");
  assert.equal(xsdDo(S, mv(at(3, 7), at(3, 6))), null, "不能動對方的子");
  assert.ok(has(S, flip(at(1, 2))), "蓋著的可以翻（不管是誰的）");
  const T = xsdDo(S, mv(at(1, 3), at(0, 3))); assert.equal(T.b[at(0, 3)], N); assert.equal(T.b[at(1, 3)], 0); assert.equal(T.q, 1, "沒吃沒翻，手數 +1");
});

test("炮：走一格；隔一子（蓋著的也算）跳吃翻開的敵子，大小不論；不能貼身吃、不能隔兩子、不能吃蓋著的或自己的", () => {
  const c = at(0, 0);
  /* 往右：炮 _ 炮架(蓋著) _ 將 */
  const S = S0({ [c]: Cn, [at(2, 0)]: HID | Rk, [at(3, 0)]: K | BLK, [at(0, 1)]: P | BLK, [at(0, 3)]: HID | B, [at(0, 6)]: HID | A | BLK });
  const L = J(xsdActs(S)).filter(a => ((a / 32) | 0) === c).map(a => a % 32);
  assert.ok(L.includes(at(1, 0)), "炮走一格到空格"); assert.ok(!L.includes(at(2, 0)), "炮不能走兩格");
  assert.ok(L.includes(at(3, 0)), "隔一顆蓋著的子跳吃將（大小不論）");
  assert.ok(!L.includes(at(0, 1)), "貼身的卒不能吃（炮只能跳吃）");
  assert.ok(!L.includes(at(0, 3)), "炮架（卒）後面是蓋著的子：不能吃");
  const T = S0({ [c]: Cn, [at(0, 1)]: P | BLK, [at(0, 2)]: P | BLK, [at(0, 3)]: Rk | BLK, [at(2, 0)]: A, [at(3, 0)]: N });
  const L2 = J(xsdActs(T)).filter(a => ((a / 32) | 0) === c).map(a => a % 32);
  assert.ok(L2.includes(at(0, 2)), "隔一子吃第二顆"); assert.ok(!L2.includes(at(0, 3)), "隔兩子不行"); assert.ok(!L2.includes(at(3, 0)), "不能吃自己的子");
  const U = S0({ [at(1, 1)]: Cn, [at(1, 2)]: Cn | BLK, [at(3, 7)]: K | BLK }); assert.ok(!has(U, mv(at(1, 1), at(1, 2))), "炮貼身也不能吃炮");
  const V = S0({ [at(1, 1)]: Cn | BLK, [at(1, 2)]: Rk, [at(3, 7)]: K }); assert.ok(has(V, mv(at(1, 2), at(1, 1))), "炮可以被大一級以上的子吃（俥吃砲）");
  const W = S0({ [at(1, 1)]: Cn | BLK, [at(1, 2)]: P, [at(3, 7)]: K }); assert.ok(!has(W, mv(at(1, 2), at(1, 1))), "兵吃不到砲");
  const Xs = xsdDo(S, mv(c, at(3, 0))); assert.equal(Xs.b[at(3, 0)], Cn); assert.equal(Xs.b[c], 0); deq(Xs.cap[0], [K | BLK], "記在你吃到的");
});

test("不連吃：吃完一子就換人，就算還能再吃", () => {
  const S = S0({ [at(1, 1)]: Rk, [at(2, 1)]: N | BLK, [at(3, 1)]: N | BLK, [at(0, 7)]: K | BLK });
  const T = xsdDo(S, mv(at(1, 1), at(2, 1)));
  assert.equal(T.cur, 1, "換電腦"); assert.equal(T.q, 0, "吃子手數歸零");
  assert.equal(xsdDo(T, mv(at(2, 1), at(3, 1))), null, "輪到電腦，不能再用你的俥吃");
  assert.ok(T.last.t === "c" && T.last.x === (N | BLK));
});

test("50 手沒吃沒翻判和；翻子、吃子歸零", () => {
  const S = S0({ [at(0, 0)]: N, [at(3, 7)]: N | BLK }, { q: 49 });
  const T = xsdDo(S, mv(at(0, 0), at(1, 0))); assert.equal(T.q, 50); deq(T.over, { w: -1, why: "draw" }, "第 50 手和棋");
  const U = xsdDo(S0({ [at(0, 0)]: N, [at(3, 7)]: N | BLK, [at(2, 2)]: HID | P }, { q: 49 }), flip(at(2, 2))); assert.equal(U.q, 0); assert.equal(U.over, null, "翻子歸零");
  assert.equal(R("XSD_DRAW"), 50);
  let V = S0({ [at(0, 0)]: Cn, [at(3, 7)]: Cn | BLK }); for (let k = 0; k < 49; k++) { V = xsdDo(V, J(xsdActs(V)).find(a => ((a / 32) | 0) !== a % 32)); assert.equal(V.over, null, "第 " + (k + 1) + " 手還沒和") }
  V = xsdDo(V, J(xsdActs(V))[0]); assert.equal(V.over.w, -1, "走滿 50 手和棋");
});

test("勝負：吃光對方（蓋著的也算對方的子）就贏；對方輪到時翻不了也走不了就贏", () => {
  const S = S0({ [at(1, 1)]: Rk, [at(2, 1)]: N | BLK });
  const T = xsdDo(S, mv(at(1, 1), at(2, 1))); deq(T.over, { w: 0, why: "eat" }, "吃光 → 你贏");
  const S2 = S0({ [at(1, 1)]: Rk, [at(2, 1)]: N | BLK, [at(3, 7)]: HID | P | BLK });
  assert.equal(xsdDo(S2, mv(at(1, 1), at(2, 1))).over, null, "對方還有蓋著的子，沒吃光");
  /* 卒被困在角落：上面是你的帥（卒…可以吃帥！換成仕擋）、旁邊是你的傌 */
  const S3 = S0({ [at(0, 0)]: P | BLK, [at(1, 0)]: N, [at(0, 1)]: A, [at(3, 7)]: Rk, [at(3, 5)]: 0 });
  const T3 = xsdDo(S3, mv(at(3, 7), at(3, 6))); deq(T3.over, { w: 0, why: "stuck" }, "黑卒走不了、吃不到、也沒有可翻的 → 你贏");
  const S4 = S0({ [at(0, 0)]: P | BLK, [at(1, 0)]: K, [at(0, 1)]: A, [at(3, 7)]: Rk });
  assert.equal(xsdDo(S4, mv(at(3, 7), at(3, 6))).over, null, "卒可以吃帥，不算無棋可走");
  const S5 = S0({ [at(0, 0)]: P | BLK, [at(1, 0)]: N, [at(0, 1)]: A, [at(3, 7)]: Rk, [at(2, 5)]: HID | B });
  assert.equal(xsdDo(S5, mv(at(3, 7), at(3, 6))).over, null, "還有蓋著的子可以翻，不算無棋可走");
  /* 電腦吃光你 */
  const S6 = S0({ [at(1, 1)]: Rk | BLK, [at(2, 1)]: N }, { cur: 1 }); deq(xsdDo(S6, mv(at(1, 1), at(2, 1))).over, { w: 1, why: "eat" }, "電腦贏");
  assert.equal(xsdJudge(S0({}, { col: null })), null, "還沒定色不判");
  assert.equal(xsdDo(T, J(xsdActs(T))[0]), null, "結束後不能再下"); deq(J(xsdActs(T)), [], "結束後沒有走法");
});

test("電腦：一定走合法的一手；白吃的大子會吃；不偷看蓋著的是什麼", () => {
  const rnd = xsdRng(9);
  let S = xsdNew(rnd, true);
  for (let k = 0; k < 40 && !S.over; k++) { const r = xsdThink(S, { rnd, depth: 2 }); assert.ok(J(xsdActs(S)).includes(r.a), "合法"); S = xsdDo(S, r.a) }
  /* 電腦黑俥旁邊有你的帥？吃不到（俥＜帥）；旁邊有你的仕吃不到；有你的傌：白吃 */
  const T = S0({ [at(1, 1)]: Rk | BLK, [at(2, 1)]: N, [at(3, 7)]: K, [at(0, 7)]: A | BLK }, { cur: 1 });
  assert.equal(xsdThink(T, { rnd, depth: 2, noise: 0 }).a, mv(at(1, 1), at(2, 1)), "吃白送的傌");
  /* 卒吃帥 */
  const U = S0({ [at(1, 1)]: P | BLK, [at(1, 2)]: K, [at(3, 7)]: B, [at(0, 7)]: N | BLK }, { cur: 1 });
  assert.equal(xsdThink(U, { rnd, depth: 2, noise: 0 }).a, mv(at(1, 1), at(1, 2)), "卒吃帥");
  /* 不偷看：蓋著的子對調位置（公開資訊一樣），電腦的選擇一樣 */
  const base = { [at(0, 0)]: Rk | BLK, [at(3, 7)]: N, [at(3, 0)]: Cn };
  const H1 = Object.assign({}, base, { [at(1, 3)]: HID | K, [at(2, 5)]: HID | P | BLK, [at(0, 6)]: HID | A });
  const H2 = Object.assign({}, base, { [at(1, 3)]: HID | P | BLK, [at(2, 5)]: HID | A, [at(0, 6)]: HID | K });
  const a1 = xsdThink(S0(H1, { cur: 1 }), { rnd: xsdRng(4), depth: 2, noise: 0 }), a2 = xsdThink(S0(H2, { cur: 1 }), { rnd: xsdRng(4), depth: 2, noise: 0 });
  assert.equal(a1.a, a2.a, "同一手"); assert.ok(Math.abs(a1.v - a2.v) < 1e-9, "同分");
  deq(xsdPool(S0(H1).b), xsdPool(S0(H2).b), "剩下的蓋子一樣");
  /* 時間限制：沒給層數時照 o.ms 收手 */
  const big = xsdNew(xsdRng(11), false); let G = big; for (let k = 0; k < 20; k++)G = xsdDo(G, J(xsdActs(G))[(k * 7) % J(xsdActs(G)).length]);
  if (!G.over) { const t = Date.now(), r = xsdThink(G, { ms: 300 }); assert.ok(J(xsdActs(G)).includes(r.a)); assert.ok(Date.now() - t < 3000, "不會想太久") }
});

/* 一盤電腦（玩家 1）對 opp（玩家 0）下到底；回傳 over.w */
function duel(rnd, first, cpu, opp) { let S = xsdNew(rnd, first); while (!S.over) { const a = S.cur === 1 ? cpu(S) : opp(S); S = xsdDo(S, a); assert.ok(S, "合法") } return S.over.w }
test("難度：新手會故意犯錯，對隨機走子仍多數會贏，但對「只看一層的電腦」勝率明顯比一般低", () => {
  deq(J(R("XSD_LV")), { easy: "新手", norm: "一般" });
  assert.equal(xsdThink(xsdNew(xsdRng(1), true), { lv: "easy" }).d, 0, "第一手照舊隨便翻");
  const EZ = J(R("XSD_EASY")); assert.ok(EZ.rand > 0 && EZ.skip > 0 && EZ.max < 4, "新手：隨便走、看漏吃子、搜得淺");
  /* 看漏：有白吃的子，新手有時不吃，一般每次都吃 */
  const T = S0({ [at(1, 1)]: Rk | BLK, [at(2, 1)]: N, [at(3, 7)]: K, [at(0, 7)]: A | BLK }, { cur: 1 });
  let eat = 0, eatN = 0; const r1 = xsdRng(21);
  for (let k = 0; k < 60; k++) { if (xsdThink(T, { rnd: r1, depth: 2, noise: 0, lv: "easy" }).a === mv(at(1, 1), at(2, 1))) eat++; if (xsdThink(T, { rnd: r1, depth: 2, noise: 0 }).a === mv(at(1, 1), at(2, 1))) eatN++ }
  assert.equal(eatN, 60, "一般每次都吃"); assert.ok(eat >= 20 && eat <= 50, "新手有時看漏（60 次吃了 " + eat + " 次）");
  assert.equal(xsdThink(T, { rnd: r1, depth: 3, lv: "easy" }).d <= 2, true, "新手少搜一層");
  /* 對隨機走子：8 盤 */
  const rr = xsdRng(777), rand = S => { const A = J(xsdActs(S)); return A[Math.floor(rr() * A.length)] };
  let ew = 0; for (let g = 0; g < 8; g++) if (duel(rr, g % 2 === 1, S => xsdThink(S, { rnd: rr, depth: 2, lv: "easy" }).a, rand) === 1) ew++;
  assert.ok(ew >= 6, "新手對隨機走子 8 盤贏 " + ew + " 盤（要多數會贏）");
  /* 對只看一層的電腦：各 8 盤，同一串亂數 */
  const d1 = r => S => xsdThink(S, { rnd: r, depth: 1, noise: 0 }).a;
  /* 得分＝贏 1、和 0.5（固定 2 層的一般對一層電腦常常磨成和棋，只數贏的盤數太少，看不出差別） */
  const play = lv => { const r = xsdRng(4242); let s = 0; for (let g = 0; g < 8; g++) { const w = duel(r, g % 2 === 1, S => xsdThink(S, { rnd: r, depth: 2, lv }).a, d1(r)); s += w === 1 ? 1 : w === -1 ? .5 : 0 } return s };
  const sE = play("easy"), sN = play("norm");
  assert.ok(sN - sE >= 2, `對一層電腦 8 盤得分：一般 ${sN}、新手 ${sE}（新手要明顯低）`);
});

test("難度存檔：沒選過＝新手；壞值當新手；那一盤記自己的難度", () => {
  assert.equal(load({ st: {} }).xsdLv(), "easy", "第一次玩預設新手"); assert.equal(load({ st: { xsdLv: "norm" } }).xsdLv(), "norm");
  assert.equal(load({ st: { xsdLv: "hard" } }).xsdLv(), "easy", "壞值當新手");
  const S = J(xsdNew(xsdRng(1), false)); assert.equal(xsdOkRun(Object.assign({}, S, { lv: "easy" })), true); assert.equal(xsdOkRun(Object.assign({}, S, { lv: "xx" })), false, "難度壞掉的存檔不用");
  assert.ok(SRC.includes('X.S.lv=xsdLv()') && SRC.includes('xsdThink(X.S,{lv:X.S.lv||xsdLv()})'), "開局記下難度、電腦照那一盤的難度想");
  assert.ok(SRC.includes('store.set("xsdLv",lv)'), "切換記在 xsdLv");
  assert.ok(/\$\{xsdRuleHtml\(false\)\}\$\{xsdLvHtml\(\)\}/.test(SRC) && SRC.includes("紀錄：勝 ${R.w}・和 ${R.d}・負 ${R.l}</p>${xsdLvHtml()}"), "規則卡、結果視窗都能切換");
  assert.ok(SRC.includes('aria-label="電腦難度"') && SRC.includes('aria-pressed="${k===v}"') && SRC.includes('"暗棋棋盤，電腦難度："+lv') && SRC.includes('axSay("電腦難度："+XSD_LV[lv])'), "讀螢幕念得出目前難度");
  assert.ok(/\.xsd-lv\{min-width:72px;min-height:44px/.test(SRC), "切換按鈕至少 44px 高");
});

test("紀錄與殘局保留：勝和負累計；存檔的那一盤壞掉就不用", () => {
  deq(xsdTally({ w: 1, d: 0, l: 2 }, { w: 0 }), { w: 2, d: 0, l: 2 }); deq(xsdTally({}, { w: 1 }), { w: 0, d: 0, l: 1 }); deq(xsdTally(null, { w: -1 }), { w: 0, d: 1, l: 0 });
  deq(load({ st: { xsdRec: { w: 3, d: "x", l: 1 } } }).xsdRec(), { w: 3, d: 0, l: 1 }, "讀紀錄（壞欄位當 0）"); deq(xsdRec(), { w: 0, d: 0, l: 0 }, "沒有紀錄");
  const S = xsdNew(xsdRng(1), false);
  assert.equal(xsdOkRun(J(S)), true, "存成 JSON 再讀回來可以用");
  assert.equal(xsdOkRun(null), false); assert.equal(xsdOkRun({ b: [1, 2] }), false); assert.equal(xsdOkRun(Object.assign(J(S), { cur: 2 })), false);
  assert.equal(xsdOkRun(Object.assign(J(S), { over: { w: 0 } })), false, "結束的不接著下");
  /* 存成 JSON 讀回來，接著下 */
  const T = xsdDo(J(S), flip(4)); assert.ok(T && T.col, "讀回來的那盤能接著下");
});

test("文案：短版、完整版規則、掌櫃台詞照定稿", () => {
  const T = J(R("XSD_TX"));
  assert.equal(T.short, "翻開才知道是哪顆棋；大吃小，兵能吃帥，炮要隔一顆跳著吃。");
  assert.equal(T.long, "32 顆棋蓋在 4×8 格裡，輪流翻棋或走棋；大可吃小、同級可吃，兵可吃帥、帥不可吃兵，炮隔一子跳吃，不連吃；50 手沒有吃子也沒有翻棋就算和棋。");
  assert.equal(T.open, "先翻，才知命。"); assert.equal(T.pawnKing, "小兵也能扳倒大帥，這就是暗棋。"); assert.equal(T.lose, "茶還熱著，再翻一局。");
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "");
  assert.ok(!/古代|自古/.test(code), "起源不寫成古代");
  assert.ok(!code.includes("星霧"), "畫面上不出現星霧（星霧暗子不叫暗棋）");
});

test("接線：茶坊暗棋桌開張、外景暗棋攤照舊進茶坊、其他攤照舊鎖著；路由、include、存檔鍵", () => {
  const X = M("m/07xsm-ximarket.js"), html = M("m.html"), SV = M("m/05b-save.js");
  assert.ok(X.includes('const XSM_TEA_SPOTS=[["xsmDark","暗棋",50,44,0]]'), "茶坊暗棋桌不再上鎖");
  assert.ok(X.includes('xsmDark:()=>{location.hash="#/ximarket/dark"}'), "點暗棋桌開一盤");
  assert.ok(X.includes('if(sub==="dark"&&typeof xsdPage==="function")return xsdPage(v);'), "#/ximarket/dark 路由");
  assert.ok(X.includes('["xsmTea","暗棋",86,44,0]'), "外景暗棋攤照舊進茶坊");
  for (const id of ["xsmGift", "xsmMusic", "xsmChess", "xsmVisit"]) assert.ok(new RegExp(`\\["${id}","[^"]+",[\\d.]+,[\\d.]+,1\\]`).test(X), id + " 照舊鎖著");
  const ix = html.indexOf("//#include m/07xsm-ximarket.js"), id = html.indexOf("//#include m/07xsd-xsmdark.js");
  assert.ok(ix > 0 && id > ix, "07xsd 接在 07xsm 後面");
  const m = SV.match(/const JOURNEY_KEYS=\[([^\]]*)\]/); assert.ok(m && /"xsdRec"/.test(m[1]) && /"xsdRun"/.test(m[1]) && /"xsdLv"/.test(m[1]), "JOURNEY_KEYS 有 xsdRec、xsdRun、xsdLv");
  assert.ok(SRC.includes('setTop("🀄 暗棋","#/ximarket/tea")'), "頂欄返回＝回聽雨茶坊");
  assert.ok(SRC.includes('store.set("xsdRun",S)') && SRC.includes('store.set("xsdRec",R)'), "存檔鍵");
  assert.ok(!/lobby|XQ\.net|netSend|cpuRate|xp\b/.test(SRC.replace(/\/\*[\s\S]*?\*\//g, "")), "不計分、不進大廳、不碰線上");
  assert.ok(SRC.includes("prefers-reduced-motion"), "尊重減少動態");
});

test("名稱不撞、沒有行內 // 註解", () => {
  const decl = s => [...s.matchAll(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)|^(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/gm)].map(m => m[1] || m[2]);   // 只看最外層宣告
  const names = decl(SRC); assert.ok(names.includes("xsdPage") && names.includes("xsdThink") && names.includes("XSD_TX"));
  assert.ok(names.every(n => /^(xsd|XSD)/.test(n)), "都用 xsd／XSD 前綴：" + names.filter(n => !/^(xsd|XSD)/.test(n)));
  const dir = path.join(ROOT, "xiangqi-db", "m");
  for (const f of fs.readdirSync(dir).filter(f => /^\d.*\.js$/.test(f) && f !== "07xsd-xsmdark.js")) {
    const o = new Set(decl(fs.readFileSync(path.join(dir, f), "utf8"))); for (const n of names) assert.ok(!o.has(n), `${n} 跟 ${f} 撞名`);
  }
  assert.ok(!SRC.split("\n").some(l => /(^|[^:"'`])\/\/(?!#)/.test(l)), "沒有 // 行內註解");
});
