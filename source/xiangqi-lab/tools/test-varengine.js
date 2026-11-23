// 黑洞超展開引擎 src/varengine.js（＋worker 包裝 varengine-worker.js）的測試：走法生成、各條擺棋規則、非標準陣容、終局判定、今日異象、強度分級
// 用法：node --test xiangqi-lab/tools/test-varengine.js
"use strict";
const test = require("node:test"), assert = require("node:assert");
const fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, "..");
const X = require(path.join(LAB, "src", "varengine.js"));
const C = require(path.join(LAB, "site", "core.js"));

const moves = (fen) => X.legalMoves(fen).sort();
const from = (fen, sq) => moves(fen).filter(m => m.startsWith(sq));
function perft(pos, d) { if (d === 0) return 1; const L = pos.legal(); if (d === 1) return L.length; let n = 0; for (const m of L) { pos.make(m); n += perft(pos, d - 1); pos.unmake(); } return n; }

test("標準開局：走法數 44，perft 2＝1920、perft 3＝79666", () => {
  assert.strictEqual(X.legalMoves(X.START_FEN).length, 44);
  const p = X.fromFen(X.START_FEN);
  assert.deepStrictEqual([1, 2, 3].map(d => perft(p, d)), [44, 1920, 79666]);
  assert.strictEqual(X.toFen(p), X.START_FEN, "走完退回後局面不變");
});

test("走法跟 App 的 core.js 完全一致（隨機對局 3000 個局面）", () => {
  const R = X.util.rng(5);
  let n = 0;
  for (let g = 0; g < 30; g++) {
    const q = X.fromFen(X.START_FEN);
    for (let ply = 0; ply < 100; ply++) {
      const app = X.toApp(q), a = C.legal(app.board, app.turn).map(([f, t]) => C.iccs(f, t)).sort(), b = q.legal().map(X.mvName).sort();
      assert.deepStrictEqual(b, a, X.toFen(q)); n++;
      if (!b.length) break;
      q.make(X.parseMv(b[Math.floor(R() * b.length)]));
    }
  }
  assert.ok(n >= 2000);
});

test("蹩馬腿：b0 傌前面 b1 有子，只剩 b0d1", () => {
  assert.deepStrictEqual(from("4k4/9/9/9/9/9/4P4/9/1P7/1N2K4 w", "b0"), ["b0d1"]);
  assert.deepStrictEqual(from("4k4/9/9/9/9/9/4P4/9/9/1N2K4 w", "b0").sort(), ["b0a2", "b0c2", "b0d1"]);
});

test("塞象眼：c0 相的 d1 有子，不能去 e2", () => {
  assert.deepStrictEqual(from("4k4/9/9/9/9/9/4P4/9/3P5/2B1K4 w", "c0"), ["c0a2"]);
  assert.deepStrictEqual(from("4k4/9/9/9/9/9/4P4/9/9/2B1K4 w", "c0").sort(), ["c0a2", "c0e2"]);
  assert.deepStrictEqual(from("4k4/9/9/9/9/2B6/4P4/9/9/4K4 w", "c4").sort(), ["c4a2", "c4e2"], "相不能過河");
});

test("炮架：隔一子才能吃，沒架或兩個架都不能吃", () => {
  const one = from("1r2k4/9/1p7/9/9/9/4P4/1C7/9/4K4 w", "b2");
  assert.ok(one.includes("b2b9"), "隔 b7 卒吃 b9 車");
  assert.ok(!one.includes("b2b7"), "b7 卒前面沒有炮架，不能吃");
  const p1 = from("1r2k4/9/9/9/1p7/9/4P4/1C7/9/4K4 w", "b2");
  assert.ok(p1.includes("b2b9"), "b5 卒當炮架，吃 b9 車");
  assert.ok(!p1.includes("b2b5"), "炮不能直接吃相鄰沒架的子");
  const p2 = from("1r2k4/9/1p7/9/1p7/9/4P4/1C7/9/4K4 w", "b2");
  assert.ok(!p2.includes("b2b9"), "兩個炮架不能吃");
  assert.ok(p2.includes("b2b7"), "隔 b5 卒吃 b7 卒");
});

test("將帥照面：中間只有一子時那子不能離開直線，帥也不能走到照面的線上", () => {
  assert.deepStrictEqual(from("4k4/9/9/9/4N4/9/9/9/9/4K4 w", "e5"), [], "e5 傌一離開直線就照面，一步都不能走");
  assert.ok(from("4k4/9/9/9/4N4/9/9/9/9/4K4 w", "e0").includes("e0d0"));
  const ms = from("4k4/4a4/9/9/4R4/9/9/9/9/4K4 w", "e5");
  assert.ok(ms.includes("e5a5") && ms.includes("e5e8"), "前面還有士擋著時俥可以橫走");
  const km = from("3k5/9/9/9/9/9/9/9/9/4K4 w", "e0");
  assert.ok(!km.includes("e0d0") && km.includes("e0e1"), "帥走 d0 會跟 d9 將照面");
  assert.ok(X.fromFen("4k4/9/9/9/9/9/9/9/9/4K4 w").facing());
});

test("兵：沒過河只能直走，過河後可以橫走，不能後退", () => {
  assert.deepStrictEqual(from("5k3/9/9/9/9/9/4P4/9/9/3K5 w", "e3"), ["e3e4"]);
  assert.deepStrictEqual(from("5k3/9/9/9/4P4/9/9/9/9/3K5 w", "e5").sort(), ["e5d5", "e5e6", "e5f5"]);
  assert.deepStrictEqual(from("3k1P3/9/9/9/9/9/9/9/9/4K4 w", "f9").sort(), ["f9e9", "f9g9"], "到底線只能橫走");
  assert.deepStrictEqual(from("5k3/9/9/9/9/4p4/9/9/9/3K5 b", "e4").sort(), ["e4d4", "e4e3", "e4f4"], "黑卒過河往下走、可橫走");
});

test("FEN、App 格式、ICCS 進出一致；也認 H（馬）E（象）", () => {
  const f = "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR b";
  const p = X.fromFen(f);
  assert.strictEqual(X.toFen(p), f);
  const a = X.toApp(p);
  assert.deepStrictEqual(a.board, C.parseFen(f.split(" ")[0]));
  assert.strictEqual(a.turn, "b");
  assert.strictEqual(X.toFen(X.fromApp(a.board, "b")), f);
  assert.strictEqual(X.toFen(X.fromFen("rheakaehr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RHEAKAEHR w")), X.START_FEN);
  assert.strictEqual(X.sqName(X.parseSq("h2")), "h2");
  assert.deepStrictEqual(X.legalMoves(X.START_FEN, { pairs: true }).length, 44);
  const q = X.toPos({ fen: X.START_FEN, moves: ["h2e2", "h9g7"] });
  assert.strictEqual(q.un, 2);
  assert.throws(() => X.toPos({ fen: X.START_FEN, moves: ["h2h8"] }), /不合法/);
});

test("validateSetup：標準陣合法；16 子、一個帥、半場、仕位、相位、九宮、預算、將軍、照面各條錯誤（中文）", () => {
  const std = X.genSetup("standard", { side: "r" });
  const v0 = X.validateSetup(std);
  assert.ok(v0.ok, v0.errors.join("；")); assert.strictEqual(v0.cost.r, 47.5, "新點數表：標準陣 47.5 分");
  assert.ok(X.validateSetup(X.START_FEN).ok);
  const bad = X.validateSetup({ side: "r", pieces: { e0: "K", a5: "R", e3: "A", c1: "B", d3: "K" } });
  assert.ok(!bad.ok);
  const has = (v, re) => assert.ok(v.errors.some(e => re.test(e)), "應該有 " + re + "：" + v.errors.join("；"));
  has(bad, /要剛好 16 子/); has(bad, /超出己方半場/); has(bad, /仕只能擺在九宮的 5 個仕位/); has(bad, /相只能擺在己方 7 個相位/); has(bad, /帥要擺在九宮內/); has(bad, /只能有一個帥/);
  const noK = Object.assign({}, std.pieces); delete noK.e0; noK.e1 = "A";
  has(X.validateSetup({ side: "r", pieces: noK }), /一定要有一個帥/);
  const rich = Object.assign({}, std.pieces, { a3: "R", c3: "R" });
  const vr = X.validateSetup({ side: "r", pieces: rich });
  has(vr, /點數 66.5 分，超過預算 48 分/);
  const blk = X.validateSetup(X.genSetup("standard", { side: "b" }));
  assert.ok(blk.ok, blk.errors.join("；"));
  has(X.validateSetup({ side: "b", pieces: { e9: "K", e4: "P" } }), /黑方的卒（e4）超出己方半場/);
  const red = { side: "r", pieces: Object.assign({}, std.pieces) }; delete red.pieces.e3; red.pieces.h3 = "P";
  const black = X.genSetup("standard", { side: "b" }); delete black.pieces.e6; black.pieces.h6 = "P";
  has(X.validateSetup({ red, black }), /將帥不能照面/);
  const red2 = { side: "r", pieces: Object.assign({}, red.pieces) }; delete red2.pieces.h2; red2.pieces.e2 = "C";
  const black2 = X.genSetup("standard", { side: "b" });
  has(X.validateSetup({ red: red2, black: black2 }), /開局不能已經將軍：黑方的將正被將軍/);
  has(X.validateSetup(red2, { against: black2 }), /開局不能已經將軍/);
  has(X.validateSetup({ side: "r", pieces: ["Ke0", "Xa0"] }), /棋子代號「X」看不懂/);
});

test("本命子八折：齊轍 5 俥 47 分合法（含第 5 俥加價），沒打折就超預算；七星本命陣在新規則下全部合法、在預算內", () => {
  const q = X.charSetup("x_swordboy");
  assert.ok(q.ok, q.errors.join("；")); assert.strictEqual(q.cost, 47);
  const noDisc = X.validateSetup({ side: "r", pieces: q.pieces });
  assert.ok(!noDisc.ok && noDisc.errors.some(e => /超過預算/.test(e)), "不打折 5 俥是 57 分");
  assert.strictEqual(X.setupCost({ side: "r", pieces: q.pieces }), 57);
  for (const k of Object.keys(X.CHARS)) {
    for (const side of ["r", "b"]) {
      const s = X.charSetup(k, { side });
      assert.ok(s.ok, k + side + "：" + s.errors.join("；"));
      assert.ok(s.cost <= 48, k + " " + s.cost);
      const other = X.genSetup("standard", { side: side === "r" ? "b" : "r" });
      assert.ok(X.validateSetup(s, { char: k, against: other }).ok, k + " 對標準陣開局合法");
    }
  }
  assert.strictEqual(X.charSetup("駱躍梅").char, "x_miaogirl", "也能用中文名字");
  assert.strictEqual(Object.values(X.charSetup("x_miaogirl").pieces).filter(t => t === "N").length, 7);
});

test("11/13 定案點數：俥 10 炮 6 傌 3.5 相 2 仕 1 兵 0.5；同類大子超過 4 顆每顆加 1 分；沈方庭九宮內的仕、相八折", () => {
  assert.deepStrictEqual(X.COST, { A: 1, B: 2, N: 3.5, R: 10, C: 6, P: 0.5 });
  const pc = (s, ck) => X.setupCost({ side: "r", pieces: s.split(" ") }, ck);
  assert.strictEqual(pc("Ke0 Ra0 Rb0 Rc0 Rd0"), 40, "4 俥不加價");
  assert.strictEqual(pc("Ke0 Ra0 Rb0 Rc0 Rd0 Rf0"), 51, "第 5 俥加 1 分");
  assert.strictEqual(pc("Ke0 Ca0 Cb0 Cc0 Cd0 Cf0 Cg0"), 38, "6 炮：36＋加價 2");
  assert.strictEqual(pc("Ke0 Na0 Nb0 Nc0 Nd0 Nf0"), 18.5, "5 傌：17.5＋加價 1");
  assert.strictEqual(pc("Ke0 Pa3 Pb3 Pc3 Pd3 Pe3 Pf3"), 3, "兵不加價");
  assert.strictEqual(pc("Ke0 Ra0 Rb0 Rc0 Rd0 Rf0", "x_swordboy"), 41, "齊轍：俥八折 8×5＋加價 1（加價不打折）");
  assert.strictEqual(pc("Ke0 Ad0 Af0 Ae1 Be2 Bc0", "x_shuai"), 6, "沈方庭：九宮內 3 仕 0.8×3、e2 相 1.6 打八折，c0 相在九宮外照算 2 分");
  assert.strictEqual(pc("Ke0 Ad0 Af0 Ae1 Be2 Bc0"), 7);
  assert.strictEqual(pc("Ke0 Ad0 Bc0", "x_shi"), 2.8, "鐵連城仍是仕八折");
  const sh = X.charSetup("x_shuai");
  assert.ok(sh.ok && sh.cost === 48, "沈方庭 5 仕塞滿九宮剛好 48 分：" + sh.errors.join("；"));
  assert.ok(!X.validateSetup({ side: "r", pieces: sh.pieces }).ok, "沒有優惠是 49 分，超預算");
  assert.strictEqual(Object.values(sh.pieces).filter(t => t === "A").length, 5);
  const over = X.validateSetup({ side: "r", pieces: X.charSetup("x_martialgirl").pieces }, { char: "x_swordboy" });
  assert.ok(over.errors.some(e => /含同類大子超過 4 顆的加價 1 分/.test(e)), over.errors.join("；"));
  assert.ok(X.genSetup("cavalry", { seed: 5 }).cost <= 48);
});

test("genSetup：各風格 × 30 個種子都合法、在預算內；同一種子結果相同；against 會避開將軍與照面", () => {
  for (const st of ["standard", ...X.STYLE_LIST]) for (let s = 0; s < 30; s++) {
    const side = s % 2 ? "b" : "r", a = X.genSetup(st, { side, seed: s });
    const v = X.validateSetup(a);
    assert.ok(v.ok, st + s + "：" + v.errors.join("；"));
    assert.ok(a.cost <= 48);
    assert.strictEqual(Object.keys(a.pieces).length, 16);
  }
  assert.deepStrictEqual(X.genSetup("cavalry", { seed: 9 }).pieces, X.genSetup("騎兵陣", { seed: 9 }).pieces);
  assert.ok(Object.values(X.genSetup("cavalry", { seed: 3 }).pieces).filter(t => t === "N").length >= 5, "騎兵陣至少 5 傌");
  assert.ok(Object.values(X.genSetup("cannon", { seed: 3 }).pieces).filter(t => t === "C").length >= 5, "炮陣至少 5 炮");
  const tight = X.genSetup("rook", { seed: 1, budget: 30 });
  assert.ok(tight.cost <= 30);
  for (let s = 0; s < 20; s++) {
    const red = X.genSetup("random", { side: "r", seed: 100 + s }), black = X.genSetup("random", { side: "b", seed: 200 + s, against: red });
    assert.ok(X.validateSetup({ red, black }).ok);
  }
  assert.throws(() => X.genSetup("xx"), /沒有這種風格/);
});

test("dailySetup：同一天結果相同、不同天會變、開局合法", () => {
  const a = X.dailySetup("2026-11-13"), b = X.dailySetup("2026-11-13");
  assert.deepStrictEqual(a, b);
  assert.ok(/^今日異象：紅方.+ 對 黑方.+$/.test(a.title));
  assert.ok(X.validateSetup(a.fen).ok);
  const fens = new Set(); for (let d = 1; d <= 10; d++) fens.add(X.dailySetup("2026-12-" + String(d).padStart(2, "0")).fen);
  assert.ok(fens.size >= 8, "10 天至少 8 種");
  assert.ok(/^\d{4}-\d\d-\d\d$/.test(X.dailySetup().date));
});

test("非標準陣容：5 傌、5 俥、全炮對全兵能搜出合法著法，也能一路下到終局", () => {
  const fens = [
    "rnbakabnr/9/1c5c1/n1n1n1n1n/9/9/R1R1R1R1R/1C5C1/9/RNBAKABNR w",
    "rnbakabnr/9/1c5c1/n1n1n1n1n/9/9/R1R1R1R1R/1C5C1/9/RNBAKABNR b",
    "ccbakabcc/9/1c5c1/p1p1p1p1p/9/9/PPPPPPPPP/9/9/PPBAKABPP w"
  ];
  for (const f of fens) {
    for (const lv of [1, 4, 6]) { const r = X.bestMove(f, { level: lv, seed: 1, fresh: true }); assert.ok(X.legalMoves(f).includes(r.move), f + " L" + lv + " " + r.move); }
  }
  const g = new X.Game(fens[0]); let n = 0;
  while (!g.status().over && n < 300) { g.play(g.think({ depth: 2, noise: 20, seed: n }).move); n++; }
  assert.ok(g.status().over || n === 300);
});

test("將死與困斃：沒有合法著法都算走方輸", () => {
  const mate = "3k5/9/9/9/9/9/9/9/9/3RK4 b";
  assert.ok(X.isMate(mate)); assert.ok(!X.isStalemate(mate));
  assert.deepStrictEqual(X.status(mate), { over: true, winner: "r", reason: "將死" });
  const stale = "3k5/R8/9/9/9/9/9/9/9/4K4 b";
  assert.ok(X.isStalemate(stale)); assert.ok(!X.isMate(stale));
  assert.deepStrictEqual(X.status(stale), { over: true, winner: "r", reason: "困斃" });
  assert.ok(!X.isMate(X.START_FEN) && !X.isStalemate(X.START_FEN));
  const r = X.bestMove(stale, { level: 5 });
  assert.strictEqual(r.move, null); assert.strictEqual(r.status.reason, "困斃");
});

test("一步殺：level 7 一定找到 a0d0 殺棋", () => {
  const r = X.bestMove("3k5/9/9/9/9/9/9/9/9/R3K4 w", { level: 7, fresh: true });
  assert.strictEqual(r.move, "a0d0");
  assert.ok(r.score > 29000, "殺棋分數 " + r.score);
});

test("三次重複判和、雙方沒攻擊子判和、回合上限判和", () => {
  const P0 = "4k4/4a4/9/9/9/9/9/9/R8/3K5 w";
  const g = new X.Game(P0);
  for (let i = 0; i < 2; i++) for (const m of ["a1b1", "e9f9", "b1a1", "f9e9"]) { assert.ok(!g.status().over); g.play(m); }
  assert.deepStrictEqual(g.status(), { over: true, winner: null, reason: "三次重複局面" });
  assert.strictEqual(X.status("4k4/4a4/9/9/9/9/9/9/9/3AK4 w").reason, "雙方都沒有攻擊子");
  const h = new X.Game(P0, { maxPlies: 6 });
  for (const m of ["a1a2", "e9f9", "a2a3", "f9e9", "a3a4", "e9f9"]) h.play(m);
  assert.strictEqual(h.status().reason, "回合上限");
});

test("level 與 weaken：低級會亂走、高級固定走好棋；weaken 降級並加雜訊；weakenNext 只影響接下來 N 次", () => {
  const hang = "4k4/9/9/9/9/9/4r4/9/4R4/3K5 w";
  const L1 = new Set(), L7 = new Set();
  for (let s = 0; s < 16; s++) { L1.add(X.bestMove(X.START_FEN, { level: 1, seed: s }).move); L7.add(X.bestMove(hang, { level: 7, seed: s, timeMs: 200 }).move); }
  assert.deepStrictEqual([...L7], ["e1e3"], "level 7 一定吃掉送上門的車");
  assert.ok(L1.size >= 3, "level 1 開局走法分散：" + [...L1].join(","));
  assert.deepStrictEqual(X.levelCfg(8), { n: 8, eff: 8, depth: 40, noise: 0, timeMs: 1500 });
  const w = X.levelCfg(8, 2); assert.strictEqual(w.eff, 6); assert.ok(w.noise > 0 && w.timeMs <= 600);
  const w9 = X.levelCfg(2, 3); assert.strictEqual(w9.eff, -1); assert.ok(w9.noise > X.levelCfg(1).noise, "降到 1 級以下雜訊更大");
  const r = X.bestMove(X.START_FEN, { level: 8, weaken: 7, seed: 1 });
  assert.strictEqual(r.weaken, 7); assert.ok(r.depth <= 2 && r.noise >= 300);
  const g = new X.Game(X.START_FEN, { level: 8, timeMs: 100 });
  g.weakenNext(2, 6);
  const a = g.think(), b = g.think(), c = g.think();
  assert.deepStrictEqual([a.weaken, b.weaken, c.weaken], [6, 6, 0]);
  for (let lv = 1; lv <= 8; lv++) { const t0 = Date.now(); X.bestMove(X.START_FEN, { level: lv, seed: 3 }); assert.ok(Date.now() - t0 < 1500 + 150, "level " + lv + " 每步 ≤1.5 秒"); }
});

test("評估：線性特徵 × 權重＝evaluate（Texel 調參的前提）；換權重、讀權重檔都有效", () => {
  const W = X.weights.vec(), R = X.util.rng(11);
  let q = X.fromFen("rnbakabnr/9/1c5c1/n1n1n1n1n/9/9/R1R1R1R1R/1C5C1/9/RNBAKABNR w");
  for (let i = 0; i < 80; i++) {
    const [I, V] = X.features(q); let s = 0; for (let k = 0; k < I.length; k++) s += W[I[k]] * V[k];
    const e = q.evaluate(); assert.ok(Math.abs((q.side ? -e : e) - s) <= 0.5 + 1e-9, "特徵與評估一致");
    const L = q.legal(); if (!L.length) break; q.make(L[Math.floor(R() * L.length)]);
  }
  const base = X.fromFen(X.START_FEN).evaluate();
  const w2 = JSON.parse(JSON.stringify(X.weights.DEFAULT)); w2.tempo = 500;
  X.loadWeights(w2); assert.strictEqual(X.fromFen(X.START_FEN).evaluate(), base - 10 + 500);
  X.loadWeights(null); assert.strictEqual(X.fromFen(X.START_FEN).evaluate(), base, "null＝回到內建預設");
  const wf = path.join(LAB, "site", "data", "varengine", "weights.json");
  if (fs.existsSync(wf)) {
    const j = JSON.parse(fs.readFileSync(wf, "utf8"));
    assert.strictEqual(j.format, "xqvar-weights");
    X.loadWeights(j); const r = X.bestMove(X.START_FEN, { level: 3, seed: 1 }); assert.ok(X.legalMoves(X.START_FEN).includes(r.move));
    X.loadWeights(null);
  }
  assert.throws(() => X.loadWeights({ format: "別的" }), /權重檔格式不對/);
});

test("Worker 包裝：postMessage 進出（用 vm 模擬 worker 環境）", async () => {
  const SRC = path.join(LAB, "src"), out = [];
  const ctx = vm.createContext({ console, Promise, setTimeout });
  ctx.self = ctx;
  ctx.importScripts = (f) => vm.runInContext(fs.readFileSync(path.join(SRC, f), "utf8"), ctx, { filename: f });
  ctx.postMessage = (m) => out.push(m);
  vm.runInContext(fs.readFileSync(path.join(SRC, "varengine-worker.js"), "utf8"), ctx, { filename: "varengine-worker.js" });
  const call = async (id, cmd, ...args) => { ctx.onmessage({ data: { id, cmd, args } }); for (let i = 0; i < 50 && !out.find(m => m.id === id); i++) await new Promise(r => setTimeout(r, 5)); return out.find(m => m.id === id); };
  const p = await call(1, "ping"); assert.ok(p.ok && p.result.weights === "內建預設");
  const b = await call(2, "bestMove", X.START_FEN, { level: 3, seed: 1 }); assert.ok(b.ok && X.legalMoves(X.START_FEN).includes(b.result.move));
  const v = await call(3, "validateSetup", { side: "r", pieces: { e0: "K" } }); assert.ok(v.ok && !v.result.ok && v.result.errors[0].includes("16 子"));
  const d = await call(4, "dailySetup", "2026-11-13"); assert.strictEqual(d.result.fen, X.dailySetup("2026-11-13").fen);
  await call(5, "newGame", X.START_FEN); const pl = await call(6, "play", "h2e2"); assert.strictEqual(pl.result.move, "h2e2");
  const th = await call(7, "think", { level: 2, seed: 2 }); assert.ok(th.ok && th.result.move);
  const e = await call(8, "nope"); assert.ok(!e.ok && /沒有這個指令/.test(e.error));
  const bad = await call(9, "play", "a0a9"); assert.ok(!bad.ok && /不合法/.test(bad.error));
});
