// 11/18 開發者「開場動畫每一句文字顯示時，可以用手指按下去當快速播完一句（玩家覺得太慢）」「楔子的動畫也是一樣」：
// 開場電影（07bh-blackhole.js bhxFilm）與楔子電影（07mnf-mainfilm.js mnfPlay）點畫面＝跳到下一句字幕出現的時間。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = f => fs.readFileSync(path.join(M, f), "utf8");

/* 從模組裡切出「找下一站」那一段，用假的鏡頭資料跑 */
const nextStopBhx = (F, t) => { const G = .05; const ts = F.shots.flatMap(Z => (Z.say || []).map(([s]) => s).concat(Z.nar ? [Z.nar[0]] : [], Z.meteor != null ? [Z.meteor] : [])).filter(s => s > t + G); return ts.length ? Math.min(...ts) : null };

test("開場電影：點畫面有接上，按鈕、選星時不算；找下一站的寫法跟這裡一樣", () => {
  const B = rd("07bh-blackhole.js");
  assert.match(B, /o\.addEventListener\("click",e=>\{if\(fin\|\|!S\|\|o\.dataset\.pick==="1"\|\|e\.target\.closest\("button"\)\)return;/);
  assert.ok(B.includes("const ts=F.shots.flatMap(Z=>(Z.say||[]).map(([s])=>s).concat(Z.nar?[Z.nar[0]]:[],Z.meteor!=null?[Z.meteor]:[])).filter(s=>s>t+G);"));
  assert.ok(B.includes("opSeek(Math.min(...ts)+.01)") && B.includes('o.querySelector(".fm-nx").click()'));
  assert.match(B, /#bhxPg \.bx-l\.now,#bhxPg \.bx-n\.now\{transition:none\}/);
});

test("開場電影：下一站跨鏡頭、說書人、流星都會停；最後沒有了回 null（交給 ▶）", () => {
  const F = { shots: [{ at: 0, say: [[1, "a"], [2, "b"]] }, { at: 5, say: [[5.5, "c"]], nar: [8, "n"] }, { at: 10, say: [[10.5, "d"]], meteor: 12 }] };
  assert.equal(nextStopBhx(F, 1.2), 2); assert.equal(nextStopBhx(F, 2.1), 5.5); assert.equal(nextStopBhx(F, 6), 8);
  assert.equal(nextStopBhx(F, 11), 12); assert.equal(nextStopBhx(F, 12.5), null);
});

test("楔子電影：點畫面跳下一句，危機題、選擇卡、暫停中不動；不會跳過還沒做的危機題", () => {
  const S = rd("07mnf-mainfilm.js");
  assert.match(S, /o\.addEventListener\("click",e=>\{if\(fin\|\|PZ\.size\|\|o\.classList\.contains\("qt"\)\|\|o\.querySelector\("\.mnf-card"\)\|\|e\.target\.closest\("button"\)\)return;/);
  const a = S.indexOf('    const t=clock(),G=.05;let to=null;'), b = S.indexOf("seek(to+.01)});", a);
  assert.ok(a > 0 && b > a);
  const body = S.slice(a, b).replace(/if\(typeof vibrate==="function"\)vibrate\(5\);fast=true;/, "");
  const run = (F, t, qDone) => vm.runInNewContext("(()=>{" + body + "return to})()", { F, clock: () => t, qDone: qDone || {} });
  const F = { shots: [{ at: 0, say: [[1, "a"], [3, "b"]] }, { at: 4, qte: "x" }, { at: 6, say: [[6.5, "c"]] }] };
  assert.equal(run(F, 1.2), 3); assert.equal(run(F, 3.1), 4, "停在危機題那一格"); assert.equal(run(F, 3.1, { 4: 1 }), 6.5, "做過的危機題不擋");
  assert.equal(run(F, 7), null);
  assert.match(S, /const w=rm\|\|fast\?0:/); assert.match(S, /#mnfPg \.mnf-sub\.now,#mnfPg \.mnf-sub\.now\.on\{transition:none\}/);
});
