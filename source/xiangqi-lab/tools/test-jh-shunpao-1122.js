// W48-S6 順炮門門內玩法「搶攻算殺步」（計步）：m/07z9i-shunpao.js。
//   開發者 11/22「把門派任務分給其他三個人平行做完剩下的門派」；定稿 story/gemini_app/193_八派門內玩法細化_1122_Gemini回覆.md 第 2 節＋_Claude審稿.md
//   （題目寫明輪誰走；步數相同算輪走方快；初級不出同快）。
//   這裡用 vm 跑真的 07z9i 與 core.js：連將殺步數的手算案例、60 題題庫用同一支程式重算、一輪 3 題、修為與連對數；畫面（sheet、Board）在預覽站驗。
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
  vm.runInContext(SRC + ";this.R={JH_SP_LV,JH_SP_Q,jhSpMateIn,jhSpFastest,jhSpFirst,jhSpWinner,jhSpRound,jhSpDayXP,jhSpStreak,jhSpGet}", c);
  return { R: c.R, mem, calls };
}
const B = (fen) => C.parseFen(fen);

test("連將殺步數：一步叫將就將死＝1；要叫兩次將＝2；只靠不叫將的安靜著法殺不算", () => {
  const { R } = load();
  /* 黑將 e10、紅帥 d1（不照面）：俥 a1 進到 a10 叫將，第 9 排有紅俥 i9 封住，將沒地方走 → 1 步殺 */
  const b1 = B("4k4/8R/9/9/9/9/9/9/9/R2K5");
  assert.equal(R.jhSpFastest(b1, "r", 4), 1);
  assert.deepEqual([...R.jhSpFirst(b1, "r", 1)], [81, 0]);
  /* 同一盤拿掉 i9 的俥：一俥一帥殺不了（將可以往下走） */
  assert.equal(R.jhSpFastest(B("4k4/9/9/9/9/9/9/9/9/R2K5"), "r", 3), 0);
  /* 雙俥：第一步叫將逼將離開底線，第二步才殺（要 2 步，不是 1 步） */
  const b2 = B("4k4/9/9/9/9/9/9/9/R8/1R1K5");
  const n2 = R.jhSpFastest(b2, "r", 4);
  assert.ok(n2 >= 2, "雙俥在下面不能一步殺：" + n2);
  assert.equal(R.jhSpMateIn(b2, "r", n2), true); assert.equal(R.jhSpMateIn(b2, "r", n2 - 1), false);
});

test("誰先殺到：輪走方步數 ≤ 對方就是輪走方（同快時輪走方先動手）", () => {
  const { R } = load();
  assert.equal(R.jhSpWinner({ turn: "r", r: 2, b: 3 }), "r");
  assert.equal(R.jhSpWinner({ turn: "r", r: 3, b: 2 }), "b");
  assert.equal(R.jhSpWinner({ turn: "b", r: 3, b: 3 }), "b", "同快：輪黑走，黑先殺");
  assert.equal(R.jhSpWinner({ turn: "r", r: 2, b: 2 }), "r", "同快：輪紅走，紅先殺");
});

test("題庫 60 題：盤面合法、雙方都沒被將軍；用同一支程式重算紅黑最快步數都相符；難度範圍照規格", () => {
  const { R } = load();
  assert.equal(R.JH_SP_Q.length, 60);
  const seen = new Set();
  for (const lv of ["easy", "mid", "hard"]) {
    const P = R.JH_SP_Q.filter((q) => q.lv === lv);
    assert.equal(P.length, 20, lv + " 要 20 題");
    const win = { r: 0, b: 0 };
    for (const q of P) {
      assert.ok(!seen.has(q.fen), "題目重複：" + q.fen); seen.add(q.fen);
      assert.match(q.turn, /^[rb]$/);
      const b = B(q.fen);
      assert.equal(b.filter((p) => p === "K").length, 1); assert.equal(b.filter((p) => p === "k").length, 1);
      assert.ok(!C.inCheck(b, "r") && !C.inCheck(b, "b"), "出題時雙方都不能被將軍：" + q.fen);
      assert.equal(R.jhSpFastest(b, "r", 4), q.r, "紅最快步數：" + q.fen);
      assert.equal(R.jhSpFastest(b, "b", 4), q.b, "黑最快步數：" + q.fen);
      win[R.jhSpWinner(q)]++;
      if (lv === "easy") assert.ok((q.r === 1 && q.b === 2) || (q.r === 2 && q.b === 1), "初級一方 1 步、一方 2 步，不出同快：" + q.fen);
      if (lv === "mid") assert.ok(q.r >= 2 && q.r <= 3 && q.b >= 2 && q.b <= 3, "中級 2～3 步：" + q.fen);
      if (lv === "hard") assert.ok(q.r >= 3 && q.r <= 4 && q.b >= 3 && q.b <= 4, "高級 3～4 步：" + q.fen);
    }
    assert.deepEqual(win, { r: 10, b: 10 }, lv + "：紅先殺、黑先殺各一半");
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

test("〔原始碼〕只開一個入口 jhShunpaoOpen、掛進 m.html 與旅程存檔；沒有一行程式後面接 // 註解；不動 07z9b", () => {
  assert.match(SRC, /^function jhShunpaoOpen\(/m);
  assert.match(rd("xiangqi-db/m.html"), /\/\/#include m\/07z9i-shunpao\.js/);
  assert.match(rd("xiangqi-db/m/05b-save.js"), /JOURNEY_KEYS\.push\("m_jhShunpao"\)/);
  const code = SRC.replace(/\/\*[\s\S]*?\*\//g, "").replace(/`[^`]*`/g, "``").replace(/"(?:[^"\\\n]|\\.)*"/g, '""');
  assert.ok(!/[;})\]]\s*\/\//.test(code), "07z9i 有程式後面接 // 註解");
  assert.doesNotMatch(rd("xiangqi-db/m/07z9b-jianghu.js"), /jhShunpao|07z9i/, "入口等門內圖出好再接，這次不改 07z9b");
});
