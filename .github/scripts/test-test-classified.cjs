// 自我測試：新增測試檔一定要分類 check-test-classified.cjs（W60 A3，2026-11-21）
// 用法：node --test .github/scripts/test-test-classified.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const { classifiedSet, addedTests, check } = require("./check-test-classified.cjs");

test("從 testkinds.js 原文抽出已分類清單；格式變了回 null（測不成立）", () => {
  const s = classifiedSet('x\nconst CLASSIFIED = new Set([\n  "test-a.js",   /* 註解 */\n  "test-b-1121.js",\n]);\nconst PENDING = new Set(["test-c.js"]);');
  assert.deepEqual([...s], ["test-a.js", "test-b-1121.js"]);
  assert.equal(classifiedSet("const OTHER = 1;"), null);
});

test("只算這個 PR 新增的測試檔，沒分類的列出來", () => {
  const git = () => "source/xiangqi-lab/tools/test-new-1121.js\nsource/xiangqi-lab/tools/test-ok.js\nsource/xiangqi-lab/tools/helper.js\n";
  const added = addedTests("origin/main", git);
  assert.deepEqual(added, ["test-new-1121.js", "test-ok.js"], "不是 test-*.js 的不算");
  assert.deepEqual(check(added, new Set(["test-ok.js"])), ["test-new-1121.js"]);
  assert.deepEqual(check([], new Set(["test-ok.js"])), []);
});

test("倉庫裡真的 testkinds.js 讀得出清單，而且 W45、W57 相關的新測試都在裡面", () => {
  const s = classifiedSet(fs.readFileSync(path.join(__dirname, "..", "..", "source", "xiangqi-lab", "tools", "testkinds.js"), "utf8"));
  assert.ok(s && s.size > 100, String(s && s.size));
  for (const f of ["test-jianghu-wind-1121.js", "test-device-checks-1121.js", "test-preview-build-1121.js"]) assert.ok(s.has(f), f);
});
