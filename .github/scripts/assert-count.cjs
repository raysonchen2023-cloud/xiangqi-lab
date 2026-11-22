// 象棋千秋 CI：執行期計算每項測試實際呼叫了幾次 assert（W69 流程盤點第 10 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：check-fake-skip.cjs 只比對寫法（空測試、缺檔直接 return），換個寫法（例如三元式、只印 diagnostic）就繞得過；
//   測試「通過」但一次斷言都沒做，等於沒驗。這支在執行期記下每項測試的斷言次數，交給 check-zero-assert.cjs 判斷。
// 用法：用 NODE_OPTIONS 預載，測試照常跑：
//   XQ_ASSERT_DIR=<資料夾> NODE_OPTIONS="--require <絕對路徑>/.github/scripts/assert-count.cjs" node source/run-tests.js
//   沒設 XQ_ASSERT_DIR 就什麼都不做（不影響一般執行）。
// 做法：攔 require("node:assert")／("node:assert/strict")，每個斷言函式呼叫時替「目前這項測試」加 1；
//   攔 require("node:test") 的 test()，每項測試用 AsyncLocalStorage 記住自己（await 之後的斷言也算到同一項）；
//   測試呼叫 t.skip() 就標成略過。每支測試檔的程序結束時寫一份 <檔名>.json：[{name, n, skipped}]。
"use strict";
const OUT = process.env.XQ_ASSERT_DIR;
if (OUT) {
  const Module = require("module"), fs = require("fs"), path = require("path"), { AsyncLocalStorage } = require("async_hooks");
  const ALS = new AsyncLocalStorage(), REC = [];
  const MARK = Symbol.for("xq.assertCount");
  const wrapAssert = (a) => {
    if (!a || a[MARK]) return a;
    for (const k of Object.keys(a)) {
      const f = a[k];
      if (typeof f !== "function" || k === "AssertionError" || /^[A-Z]/.test(k)) continue;
      a[k] = function (...x) { const c = ALS.getStore(); if (c) c.n++; return f.apply(this, x) };
    }
    Object.defineProperty(a, MARK, { value: true });
    if (a.strict && a.strict !== a) wrapAssert(a.strict);
    return a;
  };
  const wrapTest = (T) => {
    if (typeof T !== "function" || T[MARK]) return T;
    const W = function (...args) {
      const i = args.findIndex((x) => typeof x === "function");
      if (i >= 0) {
        const fn = args[i], name = typeof args[0] === "string" ? args[0] : (fn.name || "(沒有名稱)");
        args[i] = function (t, ...rest) {
          const c = { name, n: 0, skipped: false };
          if (t && typeof t.skip === "function") { const s = t.skip; t.skip = function (...m) { c.skipped = true; return s.apply(this, m) } }
          REC.push(c);
          return ALS.run(c, () => fn.call(this, t, ...rest));
        };
      }
      return T.apply(this, args);
    };
    for (const k of Object.keys(T)) W[k] = T[k];
    Object.defineProperty(W, MARK, { value: true });
    return W;
  };
  const load0 = Module._load;
  Module._load = function (req) {
    const r = load0.apply(this, arguments);
    if (/^(node:)?assert(\/strict)?$/.test(req)) return wrapAssert(r);
    if (/^(node:)?test$/.test(req)) { const w = wrapTest(r); if (w !== r) { w.test = w; w.it = w } return w }
    return r;
  };
  process.on("exit", () => {
    if (!REC.length) return;
    try { fs.mkdirSync(OUT, { recursive: true }); fs.writeFileSync(path.join(OUT, path.basename(process.argv[1] || "unknown") + ".json"), JSON.stringify(REC)) } catch (e) { }
  });
}
