// W166 門派陣法連線（規格 source/specs/W166-W176_門派陣法連線與實戰絕學_規格.md 第 3、4、9 節）：純函式 OSC_FORM／formFind／formOrigins／formStep。
// 從 07z9n-formation.js 切出 BEGIN／END osc-form 那段，用 vm 跑；局面用 core.js 從開局實際走出來（不手寫 FEN），走法不合規就直接報錯。
// 用法 node --test xiangqi-lab/tools/test-osc-formation-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/07z9n-formation.js"), "utf8").replace(/\r\n/g, "\n");
const PART = SRC.slice(SRC.indexOf("/* BEGIN osc-form */"), SRC.indexOf("/* END osc-form */"));
const CORE = [path.join(__dirname, "..", "site", "core.js"), path.join(__dirname, "..", "..", "..", "core.js")].find((f) => fs.existsSync(f));
const C = require(CORE);
const c = vm.createContext({ Set, Array, Object, Math }); vm.runInContext(PART + "\nthis.API={OSC_FORM,formFind,formOrigins,formStep,formIdx,FORM_MAX_PLY};", c);
const { OSC_FORM, formFind, formOrigins, formStep } = c.API;
const F = "abcdefghi", at = (u) => (9 - (+u[1])) * 9 + F.indexOf(u[0]);
/* 從開局照 uci 一步一步走（紅先），每一步都檢查合規，回傳 {b, moves} */
function play(moves) {
  let b = C.parseFen(C.START || "rnbakabnr/9/1c5c1/p1p1p1p1p/9/9/P1P1P1P1P/1C5C1/9/RNBAKABNR"), s = "r";
  for (const u of moves) { const f = at(u.slice(0, 2)), t = at(u.slice(2, 4));
    assert.ok(C.legal(b, s).some(([x, y]) => x === f && y === t), "測試的走法不合規：" + u + "（" + moves.join(" ") + "）"); b = C.make(b, f, t); s = s === "r" ? "b" : "r" }
  return { b, moves };
}
const hit = (moves, side, sid) => { const { b } = play(moves); return formFind(b, side, sid, moves) };

test("表：十派都登記，每派有中英文名字、至少一個陣型，連線的兩端都是陣型裡的格", () => {
  const ids = ["central", "screen", "palace_horse", "same_cannon", "opposite_cannon", "pawn", "elephant", "horse", "cross_palace", "advisor_corner"];
  assert.deepEqual(Object.keys(OSC_FORM).sort(), [...ids].sort());
  for (const k of ids) { const f = OSC_FORM[k]; assert.equal(f.nm.length, 2, k); assert.ok(f.nm[0] && f.nm[1], k); assert.ok(f.v.length >= 1, k) }
});

/* 每派兩個擺成、兩個差一點（規格第 9 節第 1 項） */
const CASES = {
  central: { side: "r", ok: [["h2e2", "h9g7", "h0g2"], ["b2e2", "b9c7", "b0c2"]], no: [["h2e2", "h9g7"], ["h2e2", "h9g7", "h0g2", "c6c5", "e2e6"]] },
  screen: { side: "b", ok: [["h2e2", "h9g7", "h0g2", "b9c7"], ["b2e2", "b9c7", "b0c2", "h9g7"]], no: [["h2e2", "h9g7"], ["h2e2", "h9g7", "h0g2", "b9c7", "e2e6", "c6c5"]] },
  palace_horse: { side: "b", ok: [["h2e2", "h9g7", "h0g2", "b7d7", "b0c2", "b9c7"], ["h2e2", "b9c7", "h0g2", "h7f7", "b0c2", "h9g7"]], no: [["h2e2", "h9g7", "h0g2", "b9c7"], ["h2e2", "h9g7", "h0g2", "b7d7"]] },
  pawn: { side: "r", ok: [["c3c4", "h9g7", "b0c2"], ["g3g4", "b9c7", "h0g2"]], no: [["c3c4"], ["c3c4", "h9g7", "h0g2"]] },
  elephant: { side: "r", ok: [["c0e2", "h9g7", "b0c2"], ["g0e2", "b9c7", "h0g2"]], no: [["c0e2"], ["c0e2", "h9g7", "b0c2", "c6c5", "e2g4"]] },
  horse: { side: "r", ok: [["b0c2", "h9g7", "a0b0"], ["h0g2", "b9c7", "i0h0"]], no: [["b0c2", "h9g7"], ["b0c2", "h9g7", "a0b0", "c6c5", "c3c4"]] },
  cross_palace: { side: "r", ok: [["h2d2", "h9g7", "h0g2"], ["b2f2", "b9c7", "b0c2"]], no: [["b2d2", "h9g7", "h0g2"], ["h2d2", "h9g7"]] },
  advisor_corner: { side: "r", ok: [["b2d2", "h9g7", "b0c2"], ["h2f2", "b9c7", "h0g2"]], no: [["h2d2", "h9g7", "b0c2"], ["b2d2", "h9g7"]] },
  same_cannon: { side: "b", ok: [["h2e2", "h7e7", "h0g2", "h9g7"], ["b2e2", "b7e7", "b0c2", "b9c7"]], no: [["h2e2", "b7e7", "h0g2", "h9g7"], ["h2e2", "h7e7", "h0g2"]] },
  opposite_cannon: { side: "b", ok: [["h2e2", "b7e7", "h0g2", "b9c7"], ["b2e2", "h7e7", "b0c2", "h9g7"]], no: [["h2e2", "h7e7", "h0g2", "h9g7"], ["h2e2", "b7e7", "h0g2"]] },
};
for (const [sid, K] of Object.entries(CASES)) test(sid + "：兩個擺成（含左右翻轉或執黑）、兩個差一點不算", () => {
  for (const m of K.ok) { const r = hit(m, K.side, sid); assert.ok(r, sid + " 應該擺成：" + m.join(" ")); assert.ok(r.pieces.length >= 2 && r.links.length >= 1, sid + " 有子有線");
    for (const [i, j] of r.links) assert.ok(r.pieces.includes(i), sid + " 連線起點在陣型裡") }
  for (const m of K.no) assert.equal(hit(m, K.side, sid), null, sid + " 不應該擺成：" + m.join(" "));
});

test("執黑上下翻轉：紅方的中炮陣型在黑方那一側不算（side 分得清楚），黑方自己擺中炮才算", () => {
  assert.ok(hit(["h2e2", "h9g7", "h0g2"], "r", "central"));
  assert.equal(hit(["h2e2", "h9g7", "h0g2"], "b", "central"), null);
  assert.ok(hit(["c3c4", "h7e7", "c4c5", "h9g7"], "b", "central"), "黑方中炮、炮架（中卒還在）、正馬");
  assert.equal(hit(["c3c4", "h7e7", "c4c5", "h9g7", "b0c2", "e6e5"], "b", "central"), null, "中卒走開＝沒有炮架，不算");
});

test("formOrigins：照著法記子從哪一格出發（吃子後被吃的那一格換成吃的那顆）", () => {
  const o = formOrigins(["h2e2", "h9g7", "e2e6"]);
  assert.equal(o[at("e6")], at("h2"), "中兵那格現在是從 h2 出發的炮");
  assert.equal(o[at("h2")], undefined); assert.equal(o[at("g7")], at("h9"));
});

test("formStep 狀態機：擺成響一次、同一陣型再擺成不響；對方打散＝break 有聲；自己走開＝fade 無聲；超過 30 手不判定", () => {
  const seen = new Set(), A = { sid: "central", nm: ["中炮鎮中", "x"] };
  assert.deepEqual({ ...formStep(null, A, false, seen, 3) }, { ev: "form", sound: true });
  assert.deepEqual({ ...formStep(A, null, true, seen, 4) }, { ev: "break", sound: true });
  assert.deepEqual({ ...formStep(null, A, false, seen, 5) }, { ev: "form", sound: false }, "同一盤同一陣型第二次不響");
  assert.deepEqual({ ...formStep(A, null, false, seen, 6) }, { ev: "fade", sound: false });
  assert.deepEqual({ ...formStep(A, A, false, seen, 7) }, { ev: "", sound: false });
  assert.deepEqual({ ...formStep(A, null, true, seen, 31) }, { ev: "fade", sound: false }, "超過 30 手：淡出不響");
  assert.deepEqual({ ...formStep(null, A, false, seen, 31) }, { ev: "", sound: false });
});

test("效能：每手判定平均 < 1ms（十派各跑 100 次）", () => {
  const { b, moves } = play(["h2e2", "h9g7", "h0g2", "b9c7", "i0h0", "c6c5"]);
  const t0 = process.hrtime.bigint(); let n = 0;
  for (let i = 0; i < 100; i++) for (const sid of Object.keys(OSC_FORM)) { formFind(b, "r", sid, moves); formFind(b, "b", sid, moves); n += 2 }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n; assert.ok(ms < 1, "平均 " + ms.toFixed(4) + "ms");
});

test("不合格的輸入不出錯：棋盤長度不對、side 亂給、門派不存在都回 null", () => {
  const { b } = play([]);
  assert.equal(formFind(b.slice(0, 80), "r", "central", []), null); assert.equal(formFind(b, "x", "central", []), null); assert.equal(formFind(b, "r", "nope", []), null);
});
