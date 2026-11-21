// 自我測試：自動打版本標籤 tag-release.cjs（W60 B1，2026-11-21）
//   版號格式不對、sw.js 對不上、同名標籤指向別的提交都不能打；已經打在同一個提交就跳過；版號不能夾帶指令字元。
// 用法：node --test .github/scripts/test-tag-release.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test");
const { decide } = require("./tag-release.cjs");
const SW = 'const VERSION="20261121-0643";';

test("正常：還沒有標籤 → 打 web-<版號>", () => {
  assert.deepEqual(decide("20261121-0643", SW, {}, "abc"), { action: "create", name: "web-20261121-0643" });
});

test("已經在同一個提交 → 跳過；指向別的提交 → 不覆寫、報錯", () => {
  assert.equal(decide("20261121-0643", SW, { "web-20261121-0643": "abc" }, "abc").action, "skip");
  const r = decide("20261121-0643", SW, { "web-20261121-0643": "def1234567" }, "abc");
  assert.equal(r.action, "error"); assert.match(r.why, /已經指向別的提交 def1234/);
});

test("sw.js 的版號對不上、找不到 → 不打", () => {
  assert.match(decide("20261121-0643", 'const VERSION="20261121-0133";', {}, "abc").why, /不一致/);
  assert.match(decide("20261121-0643", "沒有版號", {}, "abc").why, /找不到 VERSION/);
});

test("版號格式不對、夾帶指令字元 → 不打（防注入）", () => {
  for (const v of ["", null, "__BUILD__", "20261121-0643; rm -rf /", "20261121-0643\nx", "../20261121-0643", "2026112-0643"])
    assert.equal(decide(v, SW, {}, "abc").action, "error", String(v));
});
