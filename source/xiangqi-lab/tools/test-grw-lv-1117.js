// 11/17 Windows 測試員 B（B-8，P3）：序章 A1 結果視窗寫「✨ 修為升到 Lv 2！」，但新手練習時就已經是 Lv 2（這盤修為 100→120 沒升級）。
//   原因：07grw 拿「上一次結果視窗給玩家看過的快照」比；新手練習沒有結果視窗，快照還停在 Lv 1，所以第一盤結算把練習時升的級算成這一盤的。
//   修法：grwArm（08b 結算一開始，比 journeyGameEnd 發這盤修為還早）記下當時的等級；「修為升到 Lv N」只在這一盤的修為讓等級變高時才寫（grwBase 把起點換成這個等級）。
//   六項數值照舊跟上次的快照比（兩盤之間點的天賦等，下一盤照樣寫「a → b」，原本的設計不動）。
// 不開瀏覽器：vm 載入整支 07grw（跟 test-growth.js 一樣的假 modal）。用法：node --test xiangqi-lab/tools/test-grw-lv-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const GRW = rd("xiangqi-db/m/07grw-growth.js"), CPU = rd("xiangqi-db/m/08b-cpugame.js");

function full(C) {
  const mem = {}, INS = [];
  const ctx = { store: { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } },
    modal: (html, b, cls) => ({ cls, querySelector: s => s === ".mb" ? { insertAdjacentHTML: (p, h) => INS.push(h) } : null }),
    dglName: () => "x_swordboy", xpInfo: () => ({ L: C.lv }), dglLive: () => false, dglXm: () => 5, matchMedia: () => ({ matches: true }),
    BHTD: { CH: { x_swordboy: {} }, stats: (c, L) => ({ atk: 1 + L * .02, def: 1, ck: c }), atkPt: a => Math.round(a * 100), defPt: d => Math.round(100 / d), SK: [] },
    document: { getElementById: () => null, createElement: () => ({}), head: { append() { } } }, Date, Math, JSON, String, Object, Array, console };
  vm.createContext(ctx); vm.runInContext(GRW, ctx);
  return { ctx, mem, INS, C };
}

test("〔B-8〕新手練習時升到 Lv 2（沒有結果視窗），第一盤 A1 沒升級：不寫「修為升到 Lv 2」", () => {
  const T = full({ lv: 1 }); T.ctx.grwBoot(); assert.equal(T.mem.grw.lv, 1, "開 App 時 Lv 1");
  T.C.lv = 2;   /* 新手練習領經驗升級，沒有結果視窗 */
  T.ctx.grwArm("bh:gs31"); T.ctx.modal("<h2>破陣</h2>", [], "res");
  assert.ok(!/修為升到/.test(T.INS.join("")), "這一盤沒升級");
  assert.equal(T.mem.grw.lv, 2, "快照照樣更新");
});

test("〔B-8〕這一盤的修為讓等級升上去：照樣寫「修為升到 Lv N！」", () => {
  const T = full({ lv: 2 }); T.ctx.grwBoot();
  T.ctx.grwArm("bh:gs32"); T.C.lv = 3;   /* journeyGameEnd 在 grwArm 之後發修為 */
  T.ctx.modal("<h2>破陣</h2>", [], "res"); assert.match(T.INS.join(""), /修為升到 Lv 3！/);
});

test("〔照舊〕數值列仍跟上次給玩家看過的快照比（兩盤之間的變化下一盤照樣寫 a → b）", () => {
  const T = full({ lv: 1 }); T.ctx.grwBoot(); T.C.lv = 3;
  T.ctx.grwArm("cpu"); T.ctx.modal("x", [], "res");
  const h = T.INS.join(""); assert.match(h, /攻擊力[^]*102 → [^]*106/); assert.ok(!/修為升到/.test(h));
});

test("〔接點〕08b 結算一開始先 grwArm，才 journeyGameEnd（發這盤修為）；grwArm 記下當時的等級", () => {
  const i = CPU.indexOf('grwArm(KIND(st),st.id)'), j = CPU.indexOf("journeyGameEnd(st)", i); assert.ok(i > 0 && j > i);
  assert.ok(GRW.includes("GRW.pre=null;try{GRW.pre=xpInfo().L}catch(e){}"));
  assert.ok(GRW.includes("grwHtml(grwDiff(grwBase(base,pre),now))"), "第 10 批起 base＝這一盤的開局快照（沒有才用上次的 old，grwPick）");
});
