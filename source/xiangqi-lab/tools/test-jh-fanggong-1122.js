// W48-S4 反宮馬門門內玩法「活字排局陣」（排序）：m/07z9g-fanggong.js。
//   開發者 11/22「把門派任務分給其他三個人平行做完剩下的門派」；定稿 story/gemini_app/193_八派門內玩法細化_1122_*（審稿第 1、2 點）；
//   開發者 11/22 選單「照主線次序才算對」。這裡用 vm 跑真的 07z9g、core.js 與倉庫裡的課程資料 data/opening-school/palace_horse.json；畫面在預覽站驗。
// 用法：node --test xiangqi-lab/tools/test-jh-fanggong-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db/m/07z9g-fanggong.js"), "utf8");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "xiangqi-lab", "site", "data", "opening-school", "palace_horse.json"), "utf8"));
const J = (x) => JSON.parse(JSON.stringify(x));

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { xp: [] };
  const c = {
    window: { XQCore: C }, document: undefined, jhL: (zh) => zh, esc: (s) => String(s), jhWindDay: () => o.day || "2026-11-22",
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = v == null ? v : J(v) } },
    addXP: (n, why, key) => calls.xp.push([n, key]),
  };
  vm.createContext(c);
  vm.runInContext(SRC + ";this.R={JH_FG_LV,JH_FG_SID,jhFgLines,jhFgWalk,jhFgMake,jhFgRound,jhFgCheck,jhFgDayXP,jhFgGet}", c);
  return { R: c.R, mem, calls };
}
const { R } = load();
const LINES = J(R.jhFgLines(D));
const legalFromStart = (seq) => { let b = C.parseFen(C.START.split(" ")[0]), s = "r"; for (const u of seq) { const f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4)); if (!b[f] || C.sideOf(b[f]) !== s || !C.legal(b, s).some(([x, y]) => x === f && y === t)) return false; b = C.make(b, f, t); s = C.opp(s) } return true };

test("課程主線：從反宮馬門 22 課取出、不重複、每一條從開局起每步都合法；夠出初級 6 步與中高級 8 步", () => {
  assert.equal(R.JH_FG_SID, "palace_horse");
  assert.ok(LINES.length >= 20, "主線只有 " + LINES.length + " 條");
  assert.equal(new Set(LINES.map((x) => x.join(" "))).size, LINES.length);
  for (const l of LINES) assert.ok(legalFromStart(l), l.join(" "));
  assert.ok(LINES.filter((l) => l.length >= 8).length >= 10);
});

test("出題：初級 6 步、中級 8 步只打散黑方（第 2、4、6…步），高級 8 步紅黑都打散；活字就是那幾步、洗過、跟原順序不同；同種子同題", () => {
  for (const L of R.JH_FG_LV) {
    const want = { easy: [6, false], mid: [8, false], hard: [8, true] }[L.k];
    assert.deepEqual([L.n, L.both], want, L.k);
    for (let d = 1; d <= 20; d++) {
      const q = J(R.jhFgMake(LINES, L, "2026-11-" + d + ":" + L.k + ":0"));
      assert.equal(q.seq.length, L.n);
      assert.deepEqual(q.slots, q.seq.map((u, i) => (L.both || i % 2 === 1 ? i : -1)).filter((i) => i >= 0));
      assert.deepEqual(q.cards.map((c) => c.u).sort(), q.slots.map((i) => q.seq[i]).sort(), "活字要剛好是被打散的那幾步");
      assert.ok(q.cards.some((c, i) => c.u !== q.seq[q.slots[i]]), "洗完不能跟原順序一樣");
      for (const c of q.cards) assert.equal(c.side, q.seq.indexOf(c.u) % 2 ? "b" : "r");
      assert.ok(legalFromStart(q.seq));
      assert.deepEqual(J(R.jhFgMake(LINES, L, "2026-11-" + d + ":" + L.k + ":0")), q, "同種子要出同一題");
    }
    assert.equal(R.jhFgRound(LINES, L, "2026-11-22").length, 3);
  }
});

test("Pikafish 盤整 P2（11/24）：一輪 3 題的前 n 步互不相同（初級 42 條只有 10 種前 6 步，原本常重複）；每天都一樣", () => {
  for (const L of R.JH_FG_LV) {
    const kinds = new Set(LINES.filter((l) => l.length >= L.n).map((l) => l.slice(0, L.n).join(" "))).size;
    assert.ok(kinds >= 3, L.k + " 只有 " + kinds + " 種");
    for (let d = 1; d <= 30; d++) {
      const day = "2026-12-" + String(d).padStart(2, "0"), Q = J(R.jhFgRound(LINES, L, day));
      assert.equal(new Set(Q.map((q) => q.seq.join(" "))).size, 3, L.k + " " + day + " 一輪有重複的題");
      assert.deepEqual(J(R.jhFgRound(LINES, L, day)), Q, "同一天要出同一輪");
    }
  }
});

test("判對錯：照主線次序才算對；換了次序（就算走得通、局面一樣）也算錯，並指出第幾步主線先走哪一張", () => {
  const q = J(R.jhFgMake(LINES, R.JH_FG_LV[0], "x"));
  assert.deepEqual(J(R.jhFgCheck(q, q.seq)), { ok: true, step: 6, why: "" });
  const bad = q.seq.slice(), i = q.slots[0], j = q.slots[1];
  [bad[i], bad[j]] = [bad[j], bad[i]];
  const r = J(R.jhFgCheck(q, bad));
  assert.equal(r.ok, false);
  assert.equal(r.step, i);
  assert.ok(r.why.includes(`第 ${i + 1} 步主線先走「${q.nt[i]}」`), r.why);
  assert.ok(r.why.includes(`主線第 ${j + 1} 步才走`), r.why);
  assert.equal(R.jhFgCheck(q, q.seq.slice(0, 3)).ok, null, "還沒排完不判");
});

test("判對錯：走不下去的步當場指出第幾步、哪一張、為什麼（那一格沒有子、或不合法）", () => {
  const q = J(R.jhFgMake(LINES, R.JH_FG_LV[2], "y"));
  /* 第 1 步放黑方的步：輪紅走，那一格沒有紅子 */
  const r1 = J(R.jhFgCheck(q, [q.seq[1]]));
  assert.equal(r1.ok, false); assert.equal(r1.step, 0);
  assert.match(r1.why, /^第 1 步「.+」走不下去：那一格現在沒有紅方的子/);
  /* 自己編一條：紅方炮二平五，黑方車 9 平 8 不合法（車前有馬擋） */
  const q2 = { seq: ["h2e2", "i9h9"], nt: ["炮二平五", "車9平8"], slots: [1], cards: [] };
  const r2 = J(R.jhFgCheck(q2, ["h2e2", "a9a5"]));
  assert.equal(r2.ok, false); assert.equal(r2.step, 1);
  assert.match(r2.why, /^第 2 步「a9a5」走不下去：這一步現在不合法/);
});

test("每天修為：一輪全對 +10，同一天不再給；存檔壞掉不當掉", () => {
  const A = load({ day: "2026-11-22" });
  assert.equal(A.R.jhFgDayXP(), 10);
  assert.equal(A.R.jhFgDayXP(), 0);
  assert.deepEqual(A.calls.xp, [[10, "fanggong:2026-11-22"]]);
  A.mem.jhFanggong = { lv: "壞掉", d: 5 };
  assert.deepEqual(J(A.R.jhFgGet()), { lv: "easy", d: "" });
});

test("〔原始碼〕入口只有 jhFanggongOpen；不改 07z9b；一行程式後面不接 // 註解", () => {
  assert.match(SRC, /async function jhFanggongOpen\(/);
  assert.ok(!/jhHall|JH_HALL/.test(SRC), "門內頁入口之後由 07z9b 接，這裡不碰");
  for (const l of SRC.split("\n")) if (/[;})]\s*\/\/(?!#)/.test(l) && !/https?:\/\//.test(l)) assert.fail("一行程式後面接 // 註解會吃掉後面的程式：" + l.slice(0, 80));
});
