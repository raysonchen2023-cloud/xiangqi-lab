// W48 起馬門門內玩法「驛馬繞險路」（找路）：m/07z9f-qima.js。
//   開發者 11/22 選八派門內玩法第一批（過宮炮、仕角炮、起馬）；定稿 story/gemini_app/193_八派門內玩法細化_1122_*（審稿第 7 點：險格＝黑方不動、只算黑子能直接吃到的格子）。
//   這裡用 vm 跑真的 07z9f 與 core.js；畫面（sheet、Board）在預覽站驗。
// 用法：node --test xiangqi-lab/tools/test-jh-qima-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SRC = rd("xiangqi-db/m/07z9f-qima.js");
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
  vm.runInContext(SRC + ";this.R={JH_QIMA_LV,jhQimaSteps,jhQimaMove,jhQimaDanger,jhQimaAttackers,jhQimaShortest,jhQimaMake,jhQimaRound,jhQimaDayXP,jhQimaGet}", c);
  return { R: c.R, mem, calls };
}
const B = (fen) => C.parseFen(fen);

test("傌照真的走法：蹩馬腿走不過去；不吃子", () => {
  const { R } = load();
  const b = B("4k4/9/9/9/9/9/9/4N4/4P4/4K4");   /* 傌在 e2（下面有兵擋住往下的兩步） */
  const at = C.parseSq("e2"), st = R.jhQimaSteps(b, at).sort((a, b2) => a - b2);
  const want = C.legal(b, "r").filter(([f, t]) => f === at && !b[t]).map((z) => z[1]).sort((a, b2) => a - b2);
  assert.deepEqual(J(st), J(want));
  assert.ok(!st.includes(C.parseSq("d0")) && !st.includes(C.parseSq("f0")), "往下被自己的兵蹩腿");
  /* 不吃子（PR #39 審查：原本把黑卒放在 f3，傌從 e2 本來就跳不到 f3，抓不到「傌可以吃子」的錯）：
     黑卒放在 g3——e2→g3 是合法馬步（馬腿 f2 是空的），而且 core.js 的 legal 會把「吃 g3」列進去，模組要自己濾掉 */
  const b2 = B("4k4/9/9/9/9/9/6p2/4N4/9/5K3");
  assert.ok(C.legal(b2, "r").some(([f, t]) => f === at && t === C.parseSq("g3")), "前提：吃 g3 是合法著法");
  assert.ok(!R.jhQimaSteps(b2, at).includes(C.parseSq("g3")), "傌不能停在有子的格（不吃子）");
  assert.ok(R.jhQimaSteps(b2, at).includes(C.parseSq("g1")), "其他空格照走");
});

test("險格＝傌停在那裡時，黑子能直接吃到（黑方不動）", () => {
  const { R } = load();
  const b = B("4k4/9/9/9/9/9/9/9/9/r2N1K3");   /* 黑車在 a0，紅傌在 d0：同一排、中間沒子（紅帥放 f0，不跟黑將照面） */
  const at = C.parseSq("d0");
  assert.equal(R.jhQimaDanger(b, at), true, "黑車橫著吃得到");
  assert.deepEqual(J(R.jhQimaAttackers(b, at)), [C.parseSq("a0")]);
  const safe = R.jhQimaMove(b, at, C.parseSq("c2"));
  assert.equal(R.jhQimaDanger(safe, C.parseSq("c2")), false, "跳開就安全");
});

test("最短安全路線：自己算一遍廣度優先，跟模組一樣；繞開險格會變遠", () => {
  const { R } = load();
  const b = B("4k4/9/9/9/9/9/9/9/9/3N1K3");
  const from = C.parseSq("d0"), goal = C.parseSq("d4");
  assert.equal(R.jhQimaShortest(b, from, goal, 8), 2, "沒有黑子時 d0→d4 兩步");
  const b2 = B("4k4/9/9/9/9/9/9/r8/9/3N1K3");   /* 黑車在 a2 封住整排第 2 排：c2、e2 都是險格，傌要繞路 */
  const d2 = R.jhQimaShortest(b2, from, goal, 8);
  assert.ok(d2 === -1 || d2 > 2, "有險格時要繞路（或到不了）：" + d2);
});

test("出題：三級每天都出得滿三題；黑子數、最短步數都在這一級範圍；起點與終點都安全；雙方都沒被將軍；同一天固定", () => {
  const { R } = load();
  for (const L of R.JH_QIMA_LV) {
    for (const day of ["2026-11-22", "2026-11-23", "2026-12-01"]) {
      const Q = R.jhQimaRound(L, day);
      assert.equal(Q.length, 3, L.k + " " + day);
      for (const q of Q) {
        const foe = q.b.filter((p) => p && p !== "k" && p === p.toLowerCase()).length;
        assert.ok(foe >= L.foe[0] && foe <= L.foe[1], L.k + " 黑子數 " + foe);
        assert.ok(q.d >= L.d[0] && q.d <= L.d[1], L.k + " 最短 " + q.d);
        assert.equal(R.jhQimaShortest(q.b, q.from, q.goal, 9), q.d, "記下的最短步數要對");
        assert.equal(q.b[q.from], "N"); assert.equal(q.b[q.goal], null);
        assert.equal(R.jhQimaDanger(q.b, q.from), false, "起點安全");
        assert.equal(R.jhQimaDanger(R.jhQimaMove(q.b, q.from, q.goal), q.goal), false, "終點安全");
        assert.equal(C.inCheck(q.b, "r"), false); assert.equal(C.inCheck(q.b, "b"), false);
      }
      assert.deepEqual(J(R.jhQimaRound(L, day).map((q) => [q.from, q.goal, q.d])), J(Q.map((q) => [q.from, q.goal, q.d])), "同一天固定");
    }
  }
});

test("每天全對只給一次修為 +10；換日再給；存檔記住上次選的難度", () => {
  const { R, calls, mem } = load({ store: { jhQima: { lv: "mid" } } });
  assert.equal(R.jhQimaGet().lv, "mid");
  assert.equal(R.jhQimaDayXP(), 10); assert.equal(R.jhQimaDayXP(), 0);
  assert.deepEqual(J(calls.xp), [[10, "qima:2026-11-22"]]);
  assert.equal(load({ store: { jhQima: mem.jhQima }, day: "2026-11-23" }).R.jhQimaDayXP(), 10);
});

test("〔原始碼〕m.html 在 07z9d 之後引入 07z9f；存檔清單有 m_jhQima；沒有 CR；一行程式後面沒有 // 註解", () => {
  const html = rd("xiangqi-db/m.html");
  assert.ok(html.indexOf("//#include m/07z9f-qima.js") > html.indexOf("//#include m/07z9d-gongpao.js"));
  assert.match(rd("xiangqi-db/m/05b-save.js"), /JOURNEY_KEYS\.push\("m_jhQima"\)/);
  assert.ok(!SRC.includes("\r"));
  /* PR #39 審查：終點要用 Board 的 hint（藍框）標；last:{f:goal,t:goal} 在 01-board 只有 f!==t 才畫，終點會看不到 */
  assert.equal(SRC.split("hint:[cur.goal]").length - 1, 2, "終點用 hint 標（一般畫面與踩到險格時）");
  assert.ok(!SRC.includes("last:{f:cur.goal,t:cur.goal}"), "不能再用 last 標終點");
  assert.ok(rd("xiangqi-db/m/01-board.js").includes("o.hint)for(const q of o.hint)"), "前提：Board 會畫 hint");
  for (const l of SRC.split("\n")) if (/[;})]\s*\/\/(?!#)/.test(l) && !/https?:\/\//.test(l)) assert.fail("一行程式後面接 // 註解：" + l.slice(0, 80));
});
