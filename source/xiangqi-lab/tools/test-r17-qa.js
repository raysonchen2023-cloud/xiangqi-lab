// 第 17 輪 QA 工具的純函式測試（不開瀏覽器）：layout-compare.js（統一口徑版面對照）、device-fit.js rulesBoth、flow-regress.js、perf-bench.js
// 用法：node --test xiangqi-lab/tools/test-r17-qa.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test");
const FIT = require("./qa/device-fit.js"), CMP = require("./qa/layout-compare.js"), FL = require("./qa/flow-regress.js"), PB = require("./qa/perf-bench.js");
const D = FIT.DEVICES.find(d => d.id === "duoF"), P = FIT.PAGES.find(p => p.id === "home");

test("device-fit rulesBoth：同一格同時算舊規則與新規則，r1／r2／r3 各自歸因", () => {
  const x = {
    fit: [{ type: "tapOverlap", text: "同桌對弈 ⟷ ⛵ 下一步・河圖初渡", detail: "框交疊 103×10.5 px" }],
    fp: [{ type: "box", text: "子 丑 寅 卯 亥時", detail: "x", why: "看不見的字" }],
    lay: [],
    m: { vw: 466, vh: 678, small: 0, smallSample: [], smallOld: [{ t: "亮燈(20×20)", why: "hit" }, { t: "棋盒(30×23)", why: "sr" }] },
  };
  const r = FIT.rulesBoth(x, D, P);
  assert.equal(r.legacy, false);
  assert.equal(r.now.length, 1, "新規則只剩重疊");
  assert.equal(r.old.length, 3, "舊規則：重疊＋時辰鐘＋小於 44 一項");
  assert.equal(r.ex.r1.length, 1); assert.deepEqual(r.ex.r2, ["亮燈(20×20)"]); assert.deepEqual(r.ex.r3, ["棋盒(30×23)"]);
  assert.ok(r.old.some(q => q.key === "lay:small"), "小於 44 在舊規則算一項");
  const legacy = FIT.rulesBoth({ fit: [], lay: ["可點元素小於 44×44 點：2 個（例：a(10×10)）"], m: {} }, D, P);
  assert.equal(legacy.legacy, true); assert.equal(legacy.old.length, legacy.now.length, "舊 json 沒有 smallOld＝不能重判，新舊一樣");
});
test("normKey：數字、尺寸不影響比對（同一個問題換了座標還是同一項）", () => {
  assert.equal(FIT.normKey("同桌對弈 ⟷ 下一步(103×10)"), FIT.normKey("同桌對弈 ⟷ 下一步(99×12)"));
  assert.equal(FIT.normKey("第 3 回"), FIT.normKey("第 12 回"));
});
test("layout-compare diffIssues：多重集合比對（同 key 兩個、只修一個＝修 1、留 1）", () => {
  const a = [{ key: "k1" }, { key: "k1" }, { key: "k2" }], b = [{ key: "k1" }, { key: "k3" }];
  const r = CMP.diffIssues(a, b);
  assert.deepEqual(r.gone.map(x => x.key).sort(), ["k1", "k2"]); assert.deepEqual(r.added.map(x => x.key), ["k3"]); assert.deepEqual(r.both.map(x => x.key), ["k1"]);
});
test("layout-compare：相鄰兩版分成實際修正／新出現／仍未修，排除誤報另算", () => {
  const mk = (fit, fp) => ({ build: "x", res: { duoF: { home: { file: "duoF-home.png", fit, fp: fp || [], lay: [], m: { vw: 466, vh: 678, smallSample: [], smallOld: [], spots: [{ id: "mnqNext", t: "下一步", x: 112, y: 468, w: 242, h: 50 }, { id: "hmQuick", t: "同桌對弈", x: 191, y: 507, w: 103, h: 28 }] } } } } });
  const A = CMP.loadRun("舊", mk([{ type: "tapOverlap", text: "甲 ⟷ 乙", detail: "" }, { type: "overlap", text: "丙 ⟷ 丁", detail: "" }])), B = CMP.loadRun("新", mk([{ type: "overlap", text: "丙 ⟷ 丁", detail: "" }, { type: "cut", text: "戊", detail: "" }], [{ type: "box", text: "亥時", detail: "" }]));
  const d = CMP.pairDiff(A, B);
  assert.equal(d.gone.length, 1); assert.equal(d.added.length, 1); assert.equal(d.both.length, 1);
  assert.deepEqual(CMP.totals(B), Object.assign(CMP.totals(B), { old: 3, now: 2, r1: 1 }));
  const o = CMP.duoOverlap(B.raw.res.duoF.home);
  assert.equal(o.hits.length, 1); assert.equal(o.hits[0].t, "同桌對弈"); assert.equal(Math.round(o.hits[0].h), 11, "下一步 468～518、同桌對弈 507～535：疊 11px");
  const md = CMP.toMd([A, B], []);
  assert.match(md, /實際修正 1 項/); assert.match(md, /無頭 Chrome 模擬，不是實機/); assert.match(md, /壓到/);
});
test("flow-regress：介面字有中文就算沒翻；結束碼全過才 0", () => {
  assert.deepEqual(FL.cjkButtons(["Skip", "略過", "⛵ Next", "繼續 Continue"]), ["略過", "繼續 Continue"]);
  assert.equal(FL.exitCode({ flows: [{ pass: true }, { pass: true }] }), 0);
  assert.equal(FL.exitCode({ flows: [{ pass: true }, { pass: false }] }), 1);
  assert.equal(FL.exitCode({ flows: [] }), 1, "一個流程都沒跑＝失敗");
  assert.match(FL.DISCLAIMER, /不是實機/);
  const md = FL.toMd({ url: "u", flows: [{ id: "MQ", name: "n", pass: false, steps: [FL.chk("a", true, "1"), FL.chk("b", false, "2")] }] });
  assert.match(md, /失敗的斷言（1）/); assert.match(md, /\*\*MQ\*\* b：2/);
});
test("perf-bench：幀時間統計、長任務、中位數、前後比較的雜訊判斷", () => {
  const f = PB.frameStats([16.7, 16.7, 16.6, 50, 16.7]);
  assert.equal(f.n, 5); assert.equal(f.over33, 20); assert.equal(f.max, 50); assert.equal(f.p50, 16.7);
  assert.deepEqual(PB.longStats([{ start: 0, dur: 60 }, { start: 100, dur: 120 }]), { n: 2, total: 180, max: 120 });
  assert.equal(PB.median([3, 1, 2]), 2); assert.equal(PB.median([4, 1, 2, 3]), 2.5); assert.equal(PB.median([]), null);
  assert.deepEqual(PB.metricDelta({ TaskDuration: 1, ScriptDuration: .5 }, { TaskDuration: 1.25, ScriptDuration: .5 }), { TaskDuration: 250, ScriptDuration: 0 });
  const rep = (fcp, warm) => ({ warmup: !!warm, cold: { fcp, longs: [] } });
  const A = { label: "前", build: "a", cpu: 1, lx: 3, env: { cpu: "X" }, reps: [rep(999, 1), rep(100), rep(110), rep(105)] }, B = { label: "後", build: "b", cpu: 1, lx: 3, env: { cpu: "X" }, reps: [rep(300, 1), rep(200), rep(205), rep(210)] };
  assert.equal(PB.summarize(A.reps)["cold.fcp"].med, 105, "暖機輪不算");
  const md = PB.compareMd(A, B);
  assert.match(md, /首次繪製 FCP（ms） \| 105 \| 205 \| \+100 \| \+95\.2% \| ▲ 變差/);
  assert.match(md, /不能當成實機耗電/);
});
