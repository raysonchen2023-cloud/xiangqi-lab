// W48-S7 仙人指路門門內玩法「探路猜陣勢」（推測）：m/07z9k-xianren.js。
//   定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 4 節＋_Claude審稿.md（初級三選項差很多、高級只差一步；答錯由程式指出第一個分岔的那一步）。
//   題庫是仙人指路門課程 data/opening-school/pawn.json 第 7～16 課；這裡另外照棋盤重走一次、用「黑方第一步動的是哪一種子」獨立核對布局分類，不只信模組的對照表。
//   用 vm 跑真的 07z9k 與 core.js；畫面（sheet、Board）在預覽站驗。
// 用法：node --test xiangqi-lab/tools/test-jh-xianren-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SRC = rd("xiangqi-db/m/07z9k-xianren.js");
const SITE = path.join(ROOT, "xiangqi-lab", "site");
const C = require(path.join(SITE, "core.js"));
const D = JSON.parse(fs.readFileSync(path.join(SITE, "data", "opening-school", "pawn.json"), "utf8"));
const J = (x) => JSON.parse(JSON.stringify(x));

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { xp: [] };
  const c = {
    window: { XQCore: C }, document: undefined, jhL: (zh) => zh, esc: (s) => String(s), jhWindDay: () => o.day || "2026-11-22",
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = v == null ? v : J(v) } },
    addXP: (n, why, key) => calls.xp.push([n, key]),
  };
  vm.createContext(c);
  vm.runInContext(SRC + ";this.R={JH_XR_LV,JH_XR_CAT,jhXrLines,jhXrMake,jhXrRound,jhXrFork,jhXrSpecial,jhXrDayXP,jhXrCount,jhXrGet}", c);
  return { R: c.R, mem, calls };
}
/* 獨立：照棋盤走一遍，回傳黑方第一步動的子（小寫） */
function firstBlackPiece(mv) {
  let b = C.parseFen(C.START.split(" ")[0]), side = "r";
  for (let i = 0; i < mv.length; i++) {
    const f = C.parseSq(mv[i].slice(0, 2)), t = C.parseSq(mv[i].slice(2, 4));
    assert.ok(b[f] && C.sideOf(b[f]) === side && C.legal(b, side).some(([x, y]) => x === f && y === t), "第 " + (i + 1) + " 步不合法：" + mv.join(" "));
    if (i === 1) return b[f];
    b = C.make(b, f, t); side = C.opp(side);
  }
  return null;
}

test("題庫：第 7～16 課、每課兵七兵三各一條；每條從開局照走都合法、紅方先挺兵；布局分類跟黑方第一步動的子一致", () => {
  const { R } = load();
  const L = R.jhXrLines(D);
  assert.equal(L.length, 20);
  assert.deepEqual([...new Set(L.map((x) => x.cat))].sort(), Object.keys(R.JH_XR_CAT).sort());
  for (const cat of Object.keys(R.JH_XR_CAT)) assert.deepEqual(J(L.filter((x) => x.cat === cat).map((x) => x.side).sort()), ["c3c4", "g3g4"], cat);
  for (const x of L) {
    assert.ok(x.mv[0] === "c3c4" || x.mv[0] === "g3g4");
    assert.equal(firstBlackPiece(x.mv), R.JH_XR_CAT[x.cat].fam, x.cat + " 黑方第一步動的子要跟分類一致");
  }
});

test("出題：選項三個不重複、含答案、都有同一邊挺兵的例題；初級三種子、中級一同類、高級兩同類；同一天同一級固定、一輪三題答案不同", () => {
  const { R } = load();
  const L = R.jhXrLines(D);
  /* 三級的「同類錯誤選項數」寫死在這裡（PR #55 審查：原本拿模組自己的 same 當標準，把高級改成 1 也照樣過） */
  assert.deepEqual(J(R.JH_XR_LV.map((x) => [x.k, x.same])), [["easy", 0], ["mid", 1], ["hard", 2]]);
  for (const lv of R.JH_XR_LV) for (const day of ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"]) {
    const Q = R.jhXrRound(L, lv, day);
    assert.equal(Q.length, 3, lv.k + " " + day);
    assert.deepEqual(J(Q.map((q) => q.mv)), J(R.jhXrRound(L, lv, day).map((q) => q.mv)), "同一天要固定");
    assert.equal(new Set(Q.map((q) => q.cat)).size, 3, "一輪三題答案不同");
    for (const q of Q) {
      assert.equal(new Set(q.opts).size, 3); assert.ok(q.opts.includes(q.cat));
      for (const c of q.opts) { assert.ok(q.ref[c] && q.ref[c].length >= 4, c); assert.equal(q.ref[c][0], q.side, "選項取同一邊挺兵的例題") }
      const fam = R.JH_XR_CAT[q.cat].fam, others = q.opts.filter((c) => c !== q.cat).map((c) => R.JH_XR_CAT[c].fam);
      assert.equal(others.filter((f) => f === fam).length, lv.same, lv.k + " 同類的錯誤選項數");
      if (lv.same === 0) assert.notEqual(others[0], others[1], "初級三個選項三種不同的子");
    }
  }
});

test("Pikafish 盤整 P2（11/24）：黑方著法一樣、只差順序的兩課（第 8、12 課）不能同時當選項；三級各 60 天都不會出現", () => {
  const { R } = load();
  const L = R.jhXrLines(D), blk = (m) => m.filter((u, i) => i % 2 === 1).slice().sort().join(" ");
  const twins = new Set();
  for (const x of L) for (const y of L) if (x.side === y.side && x.cat < y.cat && blk(x.mv) === blk(y.mv)) twins.add(x.cat + "|" + y.cat);
  assert.ok(twins.has("pawn_08|pawn_12"), "題庫裡第 8、12 課確實只差順序（不然這項測不到東西）：" + [...twins]);
  let n = 0;
  for (const lv of R.JH_XR_LV) for (let d = 1; d <= 60; d++) {
    for (const q of R.jhXrRound(L, lv, "2027-01-" + String(d).padStart(2, "0") + "x")) {
      n++;
      const keys = q.opts.map((c) => blk(c === q.cat ? q.mv : q.ref[c]));
      assert.equal(new Set(keys).size, 3, lv.k + " 選項 " + q.opts + " 有只差順序的");
    }
  }
  assert.ok(n >= 500, "題數 " + n);
});

test("答錯說明：指出黑方第一個分岔的那一步（另外照主線獨立比一次），而且那一步確實只有答案這一路會走", () => {
  const { R } = load();
  const L = R.jhXrLines(D);
  for (const lv of R.JH_XR_LV) for (const q of R.jhXrRound(L, lv, "2026-12-05")) for (const w of q.opts.filter((c) => c !== q.cat)) {
    const f = R.jhXrFork(q, w);
    const A = q.mv.filter((u, i) => i % 2), B = q.ref[w].filter((u, i) => i % 2);
    const i0 = A.findIndex((u, i) => u !== B[i]);
    assert.ok(f && i0 >= 0, "一定有分岔"); assert.equal(f.n, i0 + 1); assert.equal(f.u, A[i0]); assert.equal(f.ply, i0 * 2 + 1);
  }
});

test("提示：最特別的一步＝另外兩個選項在同一步都不會這樣走", () => {
  const { R } = load();
  const L = R.jhXrLines(D);
  for (const q of R.jhXrRound(L, R.JH_XR_LV[2], "2026-12-06")) {
    const s = R.jhXrSpecial(q); assert.ok(s);
    for (const c of q.opts.filter((x) => x !== q.cat)) assert.notEqual(q.ref[c][s.ply], s.u, c + " 在這一步也這樣走，就不算特別");
  }
});

test("每天修為：一輪全對 +10，同一天不再給；換日再給；探路紀錄累計答對題數", () => {
  const a = load({ day: "2026-11-22" });
  assert.equal(a.R.jhXrDayXP(), 10); assert.equal(a.R.jhXrDayXP(), 0);
  assert.deepEqual(J(a.calls.xp), [[10, "xianren:2026-11-22"]]);
  assert.equal(a.R.jhXrCount(), 1); assert.equal(a.R.jhXrCount(), 2);
  const b = load({ day: "2026-11-23", store: { jhXianren: a.mem.jhXianren } });
  assert.equal(b.R.jhXrDayXP(), 10); assert.equal(b.R.jhXrGet().n, 2);
});

test("〔原始碼〕只開一個全域入口 jhXianrenOpen；DOM id 都用 jhXr 開頭；沒有行內 // 註解；m.html、存檔鍵、testkinds 各一行", () => {
  assert.match(SRC, /async function jhXianrenOpen\(/);
  for (const id of SRC.match(/id="[^"]+"/g) || []) assert.match(id, /^id="jhXr/, id);
  for (const l of SRC.split("\n")) if (/[;})]\s*\/\/(?!#)/.test(l) && !/https?:\/\//.test(l)) assert.fail("一行程式後面接 // 註解會吃掉後面的程式：" + l.slice(0, 80));
  assert.match(rd("xiangqi-db/m.html"), /\/\/#include m\/07z9k-xianren\.js/);
  assert.match(rd("xiangqi-db/m/05b-save.js"), /JOURNEY_KEYS\.push\("m_jhXianren"\)/);
});
