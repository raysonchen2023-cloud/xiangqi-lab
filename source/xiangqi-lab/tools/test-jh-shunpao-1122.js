// W48-S6 順炮門門內玩法「搶攻算殺步」（計步）：m/07z9i-shunpao.js。
//   開發者 11/22「把門派任務分給其他三個人平行做完剩下的門派」；定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 2 節＋_Claude審稿.md。
//   PR #53 審查後開發者選「改問『最快幾步殺』」：只問輪走方最快幾步連將殺（不比紅黑誰先，因為連將殺時輪走方只要有殺就一定先殺到）。
//   這裡用 vm 跑真的 07z9i 與 core.js；題庫另外用本檔自己寫的連將殺搜尋（indep*，不呼叫模組）重算，並確認少一步殺不了；
//   示範殺法逐步重放：每步合法、攻方每步都叫將、最後將死。畫面（sheet、Board）在預覽站驗。
// 用法：node --test xiangqi-lab/tools/test-jh-shunpao-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SRC = rd("xiangqi-db/m/07z9i-shunpao.js");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const J = (x) => JSON.parse(JSON.stringify(x));

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { xp: [] };
  const c = {
    window: { XQCore: C }, document: undefined, jhL: (zh) => zh, esc: (s) => String(s), jhWindDay: () => o.day || "2026-11-22",
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = v == null ? v : J(v) } },
    addXP: (n, why, key) => calls.xp.push([n, key]),
  };
  vm.createContext(c);
  vm.runInContext(SRC + ";this.R={JH_SP_LV,JH_SP_Q,jhSpMateIn,jhSpFastest,jhSpLine,jhSpRound,jhSpDayXP,jhSpStreak,jhSpGet}", c);
  return { R: c.R, mem, calls };
}
const B = (fen) => C.parseFen(fen);
/* 獨立實作（不呼叫模組）：side 先走，n 步內能不能每步叫將把對方將死 */
const other = (s) => (s === "r" ? "b" : "r");
function indepMate(b, side, n) {
  for (const [f, t] of C.legal(b, side)) {
    const x = C.make(b, f, t);
    if (!C.inCheck(x, other(side))) continue;
    const replies = C.legal(x, other(side));
    if (replies.length === 0) return true;
    if (n === 1) continue;
    let all = true;
    for (const [g, h] of replies) if (!indepMate(C.make(x, g, h), side, n - 1)) { all = false; break }
    if (all) return true;
  }
  return false;
}
const indepFastest = (b, side, max) => { for (let n = 1; n <= max; n++) if (indepMate(b, side, n)) return n; return 0 };

test("連將殺步數：一步叫將就將死＝1；要叫兩次將＝2；只靠不叫將的安靜著法殺不算", () => {
  const { R } = load();
  /* 黑將 e10、紅帥 d1（不照面）：俥 a1 進到 a10 叫將，第 9 排有紅俥 i9 封住，將沒地方走 → 1 步殺 */
  const b1 = B("4k4/8R/9/9/9/9/9/9/9/R2K5");
  assert.equal(R.jhSpFastest(b1, "r", 4), 1);
  assert.deepEqual(J(R.jhSpLine(b1, "r", 1)), [[81, 0]], "示範殺法就是那一步");
  /* 同一盤拿掉 i9 的俥：一俥一帥殺不了（將可以往下走） */
  assert.equal(R.jhSpFastest(B("4k4/9/9/9/9/9/9/9/9/R2K5"), "r", 3), 0);
  /* 雙俥：第一步叫將逼將離開底線，第二步才殺（要 2 步，不是 1 步） */
  const b2 = B("4k4/9/9/9/9/9/9/9/R8/1R1K5");
  const n2 = R.jhSpFastest(b2, "r", 4);
  assert.ok(n2 >= 2, "雙俥在下面不能一步殺：" + n2);
  assert.equal(R.jhSpMateIn(b2, "r", n2), true); assert.equal(R.jhSpMateIn(b2, "r", n2 - 1), false);
});

test("題庫 90 題：盤面合法、雙方都沒被將軍；另一套獨立搜尋重算輪走方最快步數＝答案、少一步殺不了；難度範圍照規格", () => {
  const { R } = load();
  assert.equal(R.JH_SP_Q.length, 90);
  /* W48 順炮 P3（開發者 11/23 選「滑動窗口三選一」）：初級 1～3、中級 2～4、高級 3～5 步 */
  const seen = new Set(), RANGE = { easy: [1, 2, 3], mid: [2, 3, 4], hard: [3, 4, 5] };
  for (const lv of ["easy", "mid", "hard"]) {
    const P = R.JH_SP_Q.filter((q) => q.lv === lv), cnt = {}, turn = { r: 0, b: 0 };
    assert.equal(P.length, 30, lv + " 要 30 題");
    for (const q of P) {
      assert.ok(!seen.has(q.fen), "題目重複：" + q.fen); seen.add(q.fen);
      assert.match(q.turn, /^[rb]$/); turn[q.turn]++;
      assert.ok(RANGE[lv].includes(q.n), lv + " 的答案要是 " + RANGE[lv].join("／") + " 步：" + q.fen);
      cnt[q.n] = (cnt[q.n] || 0) + 1;
      const b = B(q.fen);
      assert.equal(b.filter((p) => p === "K").length, 1); assert.equal(b.filter((p) => p === "k").length, 1);
      assert.ok(!C.inCheck(b, "r") && !C.inCheck(b, "b"), "出題時雙方都不能被將軍：" + q.fen);
      assert.equal(indepFastest(b, q.turn, 5), q.n, "獨立重算的最快步數：" + q.fen);
      if (q.n > 1) assert.equal(indepMate(b, q.turn, q.n - 1), false, "少一步不能殺：" + q.fen);
      assert.ok(R.JH_SP_LV.find((x) => x.k === lv).opt.includes(q.n), "答案要在選項裡");
    }
    assert.deepEqual(cnt, Object.fromEntries(RANGE[lv].map((n) => [n, 10])), lv + "：三種答案各 10 題");
    assert.deepEqual(turn, { r: 15, b: 15 }, lv + "：輪紅、輪黑各 15 題");
  }
});

test("選項跟題庫一致（順炮 P3）：每一級畫面上的選項，正好就是題庫裡出現的答案；每個選項至少 10 題，沒有永遠不對的選項", () => {
  const { R } = load();
  for (const L of R.JH_SP_LV) {
    const P = R.JH_SP_Q.filter((q) => q.lv === L.k), ans = [...new Set(P.map((q) => q.n))].sort((a, b) => a - b);
    assert.deepEqual(J(L.opt), ans, L.k + "：選項要跟題庫答案一模一樣（多一個＝永遠不對的選項；少一個＝答得出卻點不到）");
    for (const n of L.opt) assert.ok(P.filter((q) => q.n === n).length >= 10, `${L.k} 的「${n} 步」至少 10 題`);
    assert.equal(L.opt.length, 3, L.k + "：三選一");
    assert.deepEqual(J(L.opt), [L.opt[0], L.opt[0] + 1, L.opt[0] + 2], L.k + "：三個連續步數（滑動窗口）");
  }
  assert.deepEqual(J(R.JH_SP_LV.map((L) => L.opt[0])), [1, 2, 3], "初級從 1 步、中級從 2 步、高級從 3 步起");
  const q5 = R.JH_SP_Q.find((q) => q.n === 5);
  assert.equal(R.jhSpFastest(B(q5.fen), q5.turn), 5, "不給上限時也要算得到最長的 5 步殺（JH_SP_MAX 跟著選項）");
});

test("示範殺法在手機上不會卡：最長的 5 步殺，每題算示範殺法都在 1.5 秒內（電腦上量）", () => {
  const { R } = load();
  let worst = 0, wq = null;
  for (const q of R.JH_SP_Q.filter((x) => x.n === 5)) {
    const t0 = process.hrtime.bigint(); R.jhSpLine(B(q.fen), q.turn, q.n); const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    if (ms > worst) { worst = ms; wq = q.fen }
  }
  assert.ok(worst < 1500, `最慢的一題算了 ${worst.toFixed(0)} ms：` + wq);
});

test("示範殺法：每一題都逐步重放——每步合法、攻方每步都叫將、走 n 步、最後將死", () => {
  const { R } = load();
  for (const q of R.JH_SP_Q) {
    let b = B(q.fen), side = q.turn;
    const M = J(R.jhSpLine(b, q.turn, q.n));
    assert.equal(M.length, 2 * q.n - 1, "攻方 n 步、守方 n-1 步：" + q.fen);
    M.forEach(([f, t], i) => {
      assert.ok(C.legal(b, side).some(([a, c]) => a === f && c === t), `第 ${i + 1} 手要合法：` + q.fen);
      b = C.make(b, f, t);
      if (side === q.turn) assert.ok(C.inCheck(b, other(q.turn)), `攻方第 ${i / 2 + 1} 步要叫將：` + q.fen);
      side = other(side);
    });
    assert.equal(C.legal(b, other(q.turn)).length, 0, "最後要將死：" + q.fen);
  }
});

test("一輪 3 題：同一天同一級固定、不重複；換一天會換題", () => {
  const { R } = load();
  for (const lv of ["easy", "mid", "hard"]) {
    const a = R.jhSpRound(lv, "2026-11-22"), b = R.jhSpRound(lv, "2026-11-22"), c = R.jhSpRound(lv, "2026-11-23");
    assert.equal(a.length, 3); assert.deepEqual(J(a), J(b));
    assert.equal(new Set(a.map((q) => q.fen)).size, 3, "一輪裡不重複");
    assert.ok(a.every((q) => q.lv === lv));
    assert.notDeepEqual(J(a), J(c), "換一天換題");
    for (let d = 1; d <= 60; d++) { const r = R.jhSpRound(lv, "2026-12-" + String(d).padStart(2, "0")); assert.equal(new Set(r.map((q) => q.fen)).size, 3, "60 天裡每一輪都不能重複：" + lv + " 第 " + d + " 天") }
  }
});

test("修為一天只給一次；今天最多連對幾題記在存檔（換日重算）", () => {
  const L = load();
  assert.equal(L.R.jhSpDayXP(), 10); assert.equal(L.R.jhSpDayXP(), 0);
  assert.deepEqual(L.calls.xp, [[10, "shunpao:2026-11-22"]]);
  assert.equal(L.R.jhSpStreak(2), 2); assert.equal(L.R.jhSpStreak(1), 2, "比今天最多少就不蓋掉");
  assert.equal(L.mem.jhShunpao.st, 2);
  const M = load({ store: { jhShunpao: { sd: "2026-11-21", st: 5 } } });
  assert.equal(M.R.jhSpStreak(1), 1, "換日從頭算");
});

test("〔原始碼〕只開一個入口 jhShunpaoOpen、掛進 m.html 與旅程存檔；不再比紅黑誰先；沒有一行程式後面接 // 註解；不動 07z9b", () => {
  assert.match(SRC, /^function jhShunpaoOpen\(/m);
  assert.doesNotMatch(SRC.replace(/\/\*[\s\S]*?\*\//g, ""), /jhSpWinner|先殺到/, "PR #53：程式不再問紅黑誰先殺到（註解裡交代歷史不算）");
  assert.match(rd("xiangqi-db/m.html"), /\/\/#include m\/07z9i-shunpao\.js/);
  assert.match(rd("xiangqi-db/m/05b-save.js"), /JOURNEY_KEYS\.push\("m_jhShunpao"\)/);
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/`[^`]*`/g, "``").replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  assert.ok(!/[;})\]]\s*\/\//.test(code), "07z9i 有程式後面接 // 註解");
  assert.doesNotMatch(rd("xiangqi-db/m/07z9b-jianghu.js"), /jhShunpao|07z9i/, "入口等門內圖出好再接，這次不改 07z9b");
});
