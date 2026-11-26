// W131b（11/26 iPad 直向盤點）：對戰、學習大廳天上有經典世界朝代殘影（.cy），原本因為不是 .shp-spot 就不填滿、兩側各留約 45px 模糊底。
// 殘影被裁到不影響玩法，xflItems 把 .cy 也算成可以裁（p:true），入口全是 .shp-spot＋.cy 時照 W131 填滿寬度。
// 用法：node --test xiangqi-lab/tools/test-w131b-hub-fill.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07fl-fill.js"), "utf8").replace(/\r\n/g, "\n");

test("〔原始碼〕xflItems：.shp-spot 和 .cy（朝代殘影）都算可以裁", () => {
  assert.match(SRC, /p:e\.matches\("\.shp-spot"\)\|\|e\.matches\("\.cy"\)/);
});

test("入口是 .shp-spot 加天上的 .cy：照樣填滿寬度（820×1180 大廳）", () => {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, addEventListener: () => { }, isFinite, Math });
  vm.runInContext(SRC, ctx);
  const plan = vm.runInContext("xflPlan", ctx), W = 820, av = 1121;
  const its = [{ c: .03, h: 30, p: true }, { c: .05, h: 30, p: true }, { c: .17, h: 30, p: true }, { c: .3, h: 34, p: true }, { c: .57, h: 34, p: true }, { c: .78, h: 34, p: true }, { c: .97, h: 34, p: true }];
  const r = plan({ W, av, nw: 768, nh: 1376, items: its });
  assert.equal(r.w, W, "圖寬＝畫面寬，不留模糊底");
  const no = plan({ W, av, nw: 768, nh: 1376, items: its.map((q, i) => i < 3 ? { ...q, p: false } : q) });
  assert.ok(no.w < W, "對照：殘影不算可裁（舊行為）就會少放大");
});
