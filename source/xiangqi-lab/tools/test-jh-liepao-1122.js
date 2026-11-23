// W48-S5 列炮門門內玩法「擊板記譜局」（記譜）：m/07z9h-liepao.js。
//   開發者 11/22「把門派任務分給其他三個人平行做完剩下的門派」；定稿 story/gemini_app/193_八派門內玩法細化_1122_*（審稿第 1、5、6 點）。
//   這裡用 vm 跑真的 07z9h、core.js 與倉庫裡的課程資料 data/opening-school/opposite_cannon.json；畫面（演、蓋、重走）在預覽站驗。
// 用法：node --test xiangqi-lab/tools/test-jh-liepao-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db/m/07z9h-liepao.js"), "utf8");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const D = JSON.parse(fs.readFileSync(path.join(ROOT, "xiangqi-lab", "site", "data", "opening-school", "opposite_cannon.json"), "utf8"));
const J = (x) => JSON.parse(JSON.stringify(x));

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { xp: [] };
  const c = {
    window: { XQCore: C }, document: undefined, jhL: (zh) => zh, esc: (s) => String(s), jhWindDay: () => o.day || "2026-11-22",
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = v == null ? v : J(v) } },
    addXP: (n, why, key) => calls.xp.push([n, key]),
  };
  vm.createContext(c);
  vm.runInContext(SRC + ";this.R={JH_LP_LV,JH_LP_SID,jhLpLines,jhLpWalk,jhLpSegs,jhLpAt,jhLpRound,jhLpJudge,jhLpReselect,jhLpDayXP,jhLpGet}", c);
  return { R: c.R, mem, calls };
}
const { R } = load();
const LINES = J(R.jhLpLines(D));
const legalFromStart = (seq) => { let b = C.parseFen(C.START.split(" ")[0]), s = "r"; for (const u of seq) { const f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4)); if (!b[f] || C.sideOf(b[f]) !== s || !C.legal(b, s).some(([x, y]) => x === f && y === t)) return false; b = C.make(b, f, t); s = C.opp(s) } return true };

test("課程主線：從列炮門 22 課取出、不重複、每一條從開局起每步都合法；三級都至少有 3 種不同開頭", () => {
  assert.equal(R.JH_LP_SID, "opposite_cannon");
  assert.ok(LINES.length >= 20, "主線只有 " + LINES.length + " 條");
  assert.equal(new Set(LINES.map((x) => x.join(" "))).size, LINES.length);
  for (const l of LINES) assert.ok(legalFromStart(l), l.join(" "));
  for (const L of R.JH_LP_LV) assert.ok(new Set(LINES.filter((l) => l.length >= L.n).map((l) => l.slice(0, L.n).join(" "))).size >= 3, L.k);
});

test("三級步數 4／6／8（審稿第 1 點），分段每段 3～4 步（審稿第 6 點）：4＝一段、6＝3＋3、8＝4＋4", () => {
  assert.deepEqual(J(R.JH_LP_LV.map((L) => [L.k, L.n])), [["easy", 4], ["mid", 6], ["hard", 8]]);
  assert.deepEqual(J(R.jhLpSegs(4)), [[0, 4]]);
  assert.deepEqual(J(R.jhLpSegs(6)), [[0, 3], [3, 6]]);
  assert.deepEqual(J(R.jhLpSegs(8)), [[0, 4], [4, 8]]);
  for (const L of R.JH_LP_LV) for (const [a, z] of R.jhLpSegs(L.n)) assert.ok(z - a >= 3 && z - a <= 4, L.k + " 段長 " + (z - a));
});

test("出題：同一輪 3 題、開頭不同、每題 n 步合法、記法照 core.js；同一天同一級固定、換一天會換", () => {
  for (const L of R.JH_LP_LV) {
    const days = new Set();
    for (let d = 1; d <= 20; d++) {
      const day = "2026-11-" + String(d).padStart(2, "0"), Q = J(R.jhLpRound(LINES, L, day));
      assert.equal(Q.length, 3, L.k + " " + day);
      assert.equal(new Set(Q.map((q) => q.seq.join(" "))).size, 3, "同一輪不能出同一題");
      for (const q of Q) {
        assert.equal(q.seq.length, L.n); assert.ok(legalFromStart(q.seq));
        assert.deepEqual(q.segs, J(R.jhLpSegs(L.n)));
        let b = C.parseFen(C.START.split(" ")[0]);
        q.seq.forEach((u, i) => { const f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4)); assert.equal(q.nt[i], C.notate(b, f, t)); b = C.make(b, f, t) });
      }
      assert.deepEqual(J(R.jhLpRound(LINES, L, day)), Q, "同一天同一級要出同一輪");
      days.add(Q.map((q) => q.seq.join(" ")).join("|"));
    }
    assert.ok(days.size >= 3, L.k + " 二十天只出了 " + days.size + " 種");
  }
});

test("判一步：照主線才對；動錯子回 piece、子對但落點錯回 to；每段開始的局面＝走到那一步之前", () => {
  const q = J(R.jhLpRound(LINES, R.JH_LP_LV[2], "2026-11-22")[0]);
  const sq = (u) => [C.parseSq(u.slice(0, 2)), C.parseSq(u.slice(2, 4))];
  const [f0, t0] = sq(q.seq[0]);
  assert.deepEqual(J(R.jhLpJudge(q, 0, f0, t0)), { ok: true, kind: "" });
  const b0 = C.parseFen(C.START.split(" ")[0]);
  const otherTo = C.legal(b0, "r").find(([f, t]) => f === f0 && t !== t0);
  assert.ok(otherTo, "第 1 步那顆子要有別的落點");
  assert.deepEqual(J(R.jhLpJudge(q, 0, otherTo[0], otherTo[1])), { ok: false, kind: "to" });
  const otherPc = C.legal(b0, "r").find(([f]) => f !== f0);
  assert.deepEqual(J(R.jhLpJudge(q, 0, otherPc[0], otherPc[1])), { ok: false, kind: "piece" });
  const [, [a]] = R.jhLpSegs(8);
  let b = C.parseFen(C.START.split(" ")[0]);
  for (let k = 0; k < a; k++) { const [f, t] = sq(q.seq[k]); b = C.make(b, f, t) }
  assert.deepEqual(J(R.jhLpAt(q.seq, a)), J(b), "第二段要從第 " + (a + 1) + " 步之前的局面開始");
  assert.deepEqual(J(R.jhLpAt(q.seq, 0)), J(b0));
  /* #54 功能預驗：點到對方的子，主線這步不吃子＝換選、不算走岔；主線這步就是吃那顆子才照常判 */
  const t1 = sq(q.seq[1])[1], b1 = R.jhLpAt(q.seq, 1);
  assert.equal(R.jhLpReselect(b1, q, 1, C.parseSq("a9")), false, "點到自己的子不算換選（a9 是黑車，第 2 步輪黑方）");
  assert.equal(R.jhLpReselect(b1, q, 1, C.parseSq("a0")), !b1[t1], "點到紅俥：主線這步不吃子就算換選");
  const qc = { seq: ["h2e2", "h7h0"] }, bc = R.jhLpAt(["h2e2"], 1);
  assert.equal(R.jhLpReselect(bc, qc, 1, C.parseSq("h0")), false, "主線這步就是吃子（砲打傌）時照常判");
  assert.equal(R.jhLpReselect(bc, qc, 1, C.parseSq("e3")), false, "主線這步是吃子時，點到別的紅子也照常判");
  assert.equal(R.jhLpReselect(bc, { seq: ["h2e2", "h9g7"] }, 1, C.parseSq("e3")), true, "主線這步不吃子（馬8進7），點到紅兵＝換選");
});

test("每天修為：一輪全對 +10，同一天不再給、隔天可以再給；存檔壞掉不當掉", () => {
  const A = load({ day: "2026-11-22" });
  assert.equal(A.R.jhLpDayXP(), 10);
  assert.equal(A.R.jhLpDayXP(), 0);
  assert.deepEqual(A.calls.xp, [[10, "liepao:2026-11-22"]]);
  const B = load({ day: "2026-11-23", store: { jhLiepao: { lv: "mid", d: "2026-11-22" } } });
  assert.equal(B.R.jhLpDayXP(), 10);
  A.mem.jhLiepao = { lv: "壞掉", d: 5 };
  assert.deepEqual(J(A.R.jhLpGet()), { lv: "easy", d: "" });
});

test("〔原始碼〕入口只有 jhLiepaoOpen；不改 07z9b；開場白用繁體「戲台」；一行程式後面不接 // 註解；修為要一輪 3 題全對", () => {
  assert.match(SRC, /async function jhLiepaoOpen\(/);
  assert.ok(!/jhHall|JH_HALL/.test(SRC), "門內頁入口之後由 07z9b 接，這裡不碰");
  assert.ok(SRC.includes("戲台開鑼") && !SRC.includes("戏台"), "審稿第 5 點：戲台用繁體");
  assert.match(SRC, /if\(Q\.length<3\)/, "題目不足 3 題就不開，免得少題也領修為");
  assert.match(SRC, /#jhLpM\{display:block;min-height:calc\(3\.2em \+ 18px\)\}/, "#54 預驗 P2：說明框固定兩行高，棋盤才不會跳");
  assert.ok(!/id="jhLpM"[^>]*display:none/.test(SRC) && !/style\.display=t\?/.test(SRC), "說明框不能用 display:none 收起來");
  assert.ok(SRC.includes("框起來的這顆沒錯，想想它要走到哪"), "#54 預驗 P3：落點記錯時的措辭");
  for (const l of SRC.split("\n")) if (/[;})]\s*\/\/(?!#)/.test(l) && !/https?:\/\//.test(l)) assert.fail("一行程式後面接 // 註解會吃掉後面的程式：" + l.slice(0, 80));
});
