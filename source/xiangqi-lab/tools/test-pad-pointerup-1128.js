// W219（11/28）：黑洞背面十字鍵在 Android 12 慢機上「▲ 沒作用、落子按不下去」。
// iMac 在 Android 12 模擬器記錄點擊：失敗那幾輪 pointerup 晚 600～900 ms 才到，之後沒有 click；十字鍵原本只靠 onclick。
// 修法（park3d.js p3TapBtn）：同一顆鈕 pointerdown→同一根手指 pointerup 就動作；之後觸控合成的 click 略過一次；鍵盤／報讀器的 click 照舊動作。
// 這裡用 vm 單獨跑 p3TapBtn，配假按鈕驗各種事件順序；再檢查十字鍵五顆鈕都改用它（疊子選單綁著既有測試 test-park3d-stack-1122，另開計分規則 PR）；最後做改壞驗證（換回只靠 click 的寫法要抓得到）。
// 用法：node --test xiangqi-lab/tools/test-pad-pointerup-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const P3 = fs.readFileSync(path.join(ROOT, "xiangqi-lab/src/park3d.js"), "utf8").replace(/\r\n/g, "\n");
const grab = src => { const m = /\n  function p3TapBtn\(b,fn\)\{[\s\S]*?return b\}\n/.exec(src); assert.ok(m, "park3d.js 要有 p3TapBtn"); return m[0] };
const load = code => { const ctx = {}; vm.runInNewContext(code + "\nthis.p3TapBtn=p3TapBtn;", ctx); return ctx.p3TapBtn };
const fakeBtn = () => { const h = {}; return { h, onclick: null, addEventListener(t, f) { (h[t] = h[t] || []).push(f) },
  fire(t, o) { const e = Object.assign({ stopped: 0, stopPropagation() { this.stopped++ } }, o); if (t === "click") { if (this.onclick) this.onclick(e) } else for (const f of h[t] || []) f(e); return e } } };
// 跑一串事件，回傳 fn 被呼叫幾次
const run = (tap, seq) => { const b = fakeBtn(); let n = 0; tap(b, () => n++); for (const [t, o] of seq) b.fire(t, o || {}); return n };
const D = id => ["pointerdown", { pointerId: id }], U = id => ["pointerup", { pointerId: id }], C = (d = 1) => ["click", { detail: d }], X = id => ["pointercancel", { pointerId: id }];
const CASES = [
  ["一般點一下（down→up→click）只動一次", [D(1), U(1), C()], 1],
  ["pointerup 晚到、沒有 click（Android 12 失敗的樣子）照樣動作", [D(1), U(1)], 1],
  ["連點兩下、第一下沒有 click", [D(1), U(1), D(2), U(2), C()], 2],
  ["鍵盤 Enter（click detail=0，沒有 pointerdown）要動作", [C(0)], 1],
  ["觸控之後再按鍵盤：兩次都要動作", [D(1), U(1), C(0)], 2],
  ["沒有先 pointerdown 的 pointerup 不動作", [U(1)], 0],
  ["pointercancel 之後放開不動作", [D(1), X(1), U(1)], 0],
  ["另一根手指的 pointerup 不算", [D(1), U(2)], 0],
  ["報讀器的 click（detail=1、沒有 pointer 事件）要動作", [C(1)], 1],
];
test("p3TapBtn 各種事件順序", () => { const tap = load(grab(P3)); for (const [why, seq, want] of CASES) assert.equal(run(tap, seq), want, why) });
test("事件不往上傳（不會穿透到畫布／齊轍模型）", () => { const tap = load(grab(P3)); const b = fakeBtn(); tap(b, () => {});
  for (const [t, o] of [D(1), U(1), C()]) assert.equal(b.fire(t, o).stopped, 1, t + " 要 stopPropagation") });
test("〔原始碼〕十字鍵五顆鈕都用 p3TapBtn", () => {
  assert.match(P3, /p3TapBtn\(b,\(\)=>padMove\(ar,ac\)\)/, "▲◀▶▼ 要用 p3TapBtn");
  assert.match(P3, /p3TapBtn\(go,\(\)=>\{if\(go\.disabled\|\|!padT\.includes\(padCur\)\)/, "落子要用 p3TapBtn，而且照舊檢查 disabled 與能不能走");
  assert.ok(!/b\.onclick=e=>\{e\.stopPropagation\(\);padMove/.test(P3), "十字鍵不能再只靠 onclick");
  assert.ok(!/go\.onclick=/.test(P3), "落子不能再只靠 onclick");
});
test("改壞驗證：換回只靠 click 的寫法，測試要抓得到", () => {
  const bad = "\n  function p3TapBtn(b,fn){b.addEventListener(\"pointerdown\",e=>e.stopPropagation());b.addEventListener(\"pointerup\",e=>e.stopPropagation());b.onclick=e=>{e.stopPropagation();fn(e)};return b}\n";
  const tap = load(bad);
  assert.notEqual(run(tap, [D(1), U(1)]), 1, "壞的寫法在「沒有 click」時應該不動作");
  const dbl = "\n  function p3TapBtn(b,fn){b.addEventListener(\"pointerup\",e=>fn(e));b.onclick=e=>fn(e);return b}\n";
  assert.notEqual(run(load(dbl), [D(1), U(1), C()]), 1, "沒有略過合成 click 的寫法會動兩次");
});
