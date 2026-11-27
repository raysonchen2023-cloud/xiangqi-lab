/* W157（11/26 外部複審）古戰場「自由段」goal:"keep"（撐滿 n 步、保護的子不能丟，例如函谷關要仕相不丟）：
   原本對局提早結束（對方被將死或困斃）就直接過關，不看保護的子；有合法棋線只走 3 次、丟一仕一相、靠黑方困斃就過關。
   改成：提早結束時，只要不是「將死」任務，就先檢查保護的子，少了就判這段失敗。
   這支測試切出 07-legend.js 自由段的 after()，用假的盤面跑三種情況，並做改壞驗證。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07-legend.js"), "utf8");

/* 切出 const after=async()=>{if(over()){ … }（只要提早結束那一段判斷：到 return acts 為止） */
function overBranch(src) {
  const a = src.indexOf("const after=async()=>{if(over()){"), b = src.indexOf("return acts([[\"next\",\"›\",\"繼續\",()=>{si++;seg()},true]])}", a);
  if (a < 0 || b < 0) throw new Error("07-legend.js 找不到自由段 after 的提早結束判斷");
  return src.slice(a + "const after=async()=>{if(over()){".length, b);
}
/* 跑那一段：回傳「失敗」或「過關」 */
function run(src, goal, kept0, nowCounts) {
  const body = overBranch(src), out = { r: null };
  const ctx = { g: { goal }, keep: ["A", "B"], kept0, cnt: (p) => nowCounts[p], B2_CN: { A: "仕", B: "相" },
    fail: (m) => { out.r = "失敗：" + m; return "F" }, X: { setTap() {} }, stat() {}, C: { inCheck: () => false }, pos: {}, st: { segs: [1, 2] }, si: 0, out };
  vm.createContext(ctx);
  vm.runInContext(`(function(){${body}; out.r = out.r || "過關";})()`, ctx);
  return out.r;
}

function problems(src) {
  const bad = [];
  if (!/^失敗/.test(run(src, "keep", [2, 2], { A: 1, B: 1 }))) bad.push("保護任務：丟了仕相、對方困斃提早結束，要判失敗");
  if (run(src, "keep", [2, 2], { A: 2, B: 2 }) !== "過關") bad.push("保護任務：仕相都在、對方困斃提早結束，照舊過關");
  if (run(src, "mate", [2, 2], { A: 0, B: 0 }) !== "過關") bad.push("將死任務：提早將死照舊過關，不看保護子");
  return bad;
}

test("函谷關類的保護任務：提早結束也要檢查保護的子", () => {
  assert.deepEqual(problems(SRC), []);
});

test("改壞驗證：拿掉保護子檢查時要抓得到", () => {
  const i = SRC.indexOf("if(g.goal!==\"mate\"&&keep.some((p,i)=>cnt(p)<kept0[i]))return fail(");
  assert.ok(i > 0, "07-legend.js 要有提早結束的保護子檢查");
  const j = SRC.indexOf("X.setTap(null);stat(", i), bad = SRC.slice(0, i) + SRC.slice(j);
  assert.notEqual(bad, SRC);
  assert.ok(problems(bad).length > 0);
});
