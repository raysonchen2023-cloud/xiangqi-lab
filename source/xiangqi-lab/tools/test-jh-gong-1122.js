// W48 過宮炮門門內玩法「宣紙蓋子位」（記位）：m/07z9d-gongpao.js。
//   開發者 11/22 選八派門內玩法第一批（過宮炮、仕角炮、起馬）；定稿 story/gemini_app/193_八派門內玩法細化_1122_*。
//   這裡用 vm 跑真的 07z9d，局面用真的殘局題庫 canju-set.json；畫面（sheet、Board）在預覽站驗。
// 用法：node --test xiangqi-lab/tools/test-jh-gong-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SRC = rd("xiangqi-db/m/07z9d-gongpao.js");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const SETP = [path.join(ROOT, "xiangqi-lab", "site", "data", "canju", "canju-set.json"), path.join(ROOT, "..", "data", "canju", "canju-set.json")].find((p) => fs.existsSync(p));
const J = (x) => JSON.parse(JSON.stringify(x));

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { xp: [] };
  const c = {
    window: { XQCore: C }, document: undefined, jhL: (zh) => zh, esc: (s) => String(s),
    jhWindDay: () => o.day || "2026-11-22",
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = v == null ? v : J(v) } },
    addXP: (n, why, key) => calls.xp.push([n, key]),
  };
  vm.createContext(c);
  vm.runInContext(SRC + ";this.R={JH_GONG_LV,jhGongPool,jhGongRound,jhGongTake,jhGongCheck,jhGongDayXP,jhGongGet,jhGongPieces}", c);
  return { c, R: c.R, mem, calls };
}
const items = () => JSON.parse(fs.readFileSync(SETP, "utf8")).items;

test("三級難度＝193 定稿：子數、看幾秒、抽幾顆；只有初級先閃要考的子", () => {
  const { R } = load();
  assert.deepEqual(J(R.JH_GONG_LV.map((x) => [x.k, x.n, x.sec, x.take, x.flash])), [["easy", [6, 8], 8, 3, true], ["mid", [9, 12], 6, 4, false], ["hard", [13, 16], 4, 5, false]]);
});

test("題目池（真的殘局題庫）：每一級都夠一輪；子數都在範圍內；有炮的排前面", { skip: !SETP && "沒有 canju-set.json" }, () => {
  const { R } = load();
  for (const L of R.JH_GONG_LV) {
    const P = R.jhGongPool(items(), L);
    assert.ok(P.length >= 30, L.k + " 題目太少：" + P.length);
    for (const q of P) { const n = q.b.filter(Boolean).length; assert.ok(n >= L.n[0] && n <= L.n[1], L.k + " " + q.id + " 子數 " + n) }
    const firstNo = P.findIndex((q) => !q.cannon);
    assert.ok(firstNo < 0 || P.slice(firstNo).every((q) => !q.cannon), L.k + " 有炮的要排前面");
  }
});

test("一輪三題：同一天同一級固定、三題不重複、換一天會換；每題抽的子數＝這一級的數量，不抽將帥，有炮就抽一顆炮", { skip: !SETP && "沒有 canju-set.json" }, () => {
  const { R } = load();
  const L = R.JH_GONG_LV[1], P = R.jhGongPool(items(), L);
  const a = R.jhGongRound(P, L, "2026-11-22"), b = R.jhGongRound(P, L, "2026-11-22");
  assert.deepEqual(J(a.map((q) => [q.id, q.take])), J(b.map((q) => [q.id, q.take])));
  assert.equal(new Set(a.map((q) => q.id)).size, 3);
  let changed = false; for (let d = 23; d < 30 && !changed; d++) changed = R.jhGongRound(P, L, "2026-11-" + d).map((q) => q.id).join() !== a.map((q) => q.id).join();
  assert.ok(changed, "換日要換題");
  for (const q of a) {
    assert.equal(q.take.length, L.take);
    assert.equal(new Set(q.take.map((x) => x.i)).size, L.take, "不能抽同一格兩次");
    for (const x of q.take) { assert.equal(q.b[x.i], x.p, "抽的就是那一格的子"); assert.notEqual(x.p.toUpperCase(), "K") }
    if (q.cannon) assert.ok(q.take.some((x) => x.p === "C" || x.p === "c"), q.id + " 有炮就要抽一顆炮");
  }
});

test("核對：全對；同一種子位置互換也算對；放錯的回報原本的位置", () => {
  const { R } = load();
  const take = [{ p: "P", i: 54 }, { p: "P", i: 56 }, { p: "c", i: 19 }];
  assert.deepEqual(J(R.jhGongCheck(take, [{ p: "P", i: 54 }, { p: "P", i: 56 }, { p: "c", i: 19 }])), { ok: 3, miss: [], all: true });
  assert.deepEqual(J(R.jhGongCheck(take, [{ p: "P", i: 56 }, { p: "P", i: 54 }, { p: "c", i: 19 }])), { ok: 3, miss: [], all: true }, "兩顆兵互換算對");
  const r = R.jhGongCheck(take, [{ p: "P", i: 54 }, { p: "P", i: 57 }, { p: "c", i: 20 }]);
  assert.equal(r.all, false); assert.equal(r.ok, 1);
  assert.deepEqual(J(r.miss), [{ p: "P", i: 56 }, { p: "c", i: 19 }]);
});

test("每天全對只給一次修為 +10；換日再給；存檔記住上次選的難度", () => {
  const { R, calls, mem } = load({ store: { jhGong: { lv: "hard" } } });
  assert.equal(R.jhGongGet().lv, "hard");
  assert.equal(R.jhGongDayXP(), 10); assert.equal(R.jhGongDayXP(), 0);
  assert.deepEqual(J(calls.xp), [[10, "gong:2026-11-22"]]);
  const L2 = load({ store: { jhGong: mem.jhGong }, day: "2026-11-23" });
  assert.equal(L2.R.jhGongDayXP(), 10);
  assert.equal(load({ store: { jhGong: { lv: "亂寫" } } }).R.jhGongGet().lv, "easy", "壞存檔退回初級");
});

test("〔原始碼〕m.html 在 07z9c 之後引入 07z9d；存檔清單有 m_jhGong；沒有 CR；一行程式後面沒有 // 註解", () => {
  const html = rd("xiangqi-db/m.html");
  assert.ok(html.indexOf("//#include m/07z9d-gongpao.js") > html.indexOf("//#include m/07z9c-screen.js"));
  assert.match(rd("xiangqi-db/m/05b-save.js"), /JOURNEY_KEYS\.push\("m_jhGong"\)/);
  assert.ok(!SRC.includes("\r"));
  for (const l of SRC.split("\n")) if (/[;})]\s*\/\/(?!#)/.test(l) && !/https?:\/\//.test(l)) assert.fail("一行程式後面接 // 註解：" + l.slice(0, 80));
});
