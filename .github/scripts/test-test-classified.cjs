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

test("2026-11-23：登記行被註解吃掉就不算已登記（#74：一行註解結尾少一個 /，後面的登記整段被吃掉，原本照樣綠）", () => {
  const mk = (body) => 'const fs = require("fs");\nconst CLASSIFIED = new Set([\n' + body + '\n]);\nconst PENDING = new Set([]);\n';
  const has = (s, ...f) => f.every((x) => s && s.has(x));
  /* ① 單行註解：整行登記被 // 註解掉 */
  let s = classifiedSet(mk('  "test-a.js",   /* 說明 */\n  // "test-b.js",\n  "test-c.js",   /* 說明 */'));
  assert.ok(has(s, "test-a.js", "test-c.js") && !s.has("test-b.js"), "單行註解裡的檔名不算");
  assert.deepEqual(check(["test-b.js"], s), ["test-b.js"], "新增的 test-b.js 要紅");
  /* ② 區塊註解把登記行整個包起來 */
  s = classifiedSet(mk('  "test-a.js",   /* 說明 */\n  /* "test-b.js", */\n  "test-c.js"'));
  assert.ok(has(s, "test-a.js", "test-c.js") && !s.has("test-b.js"), "區塊註解裡的檔名不算");
  /* ③ #74 的形狀：第一行註解結尾少 /，一路吃到下一行的註解結尾 */
  s = classifiedSet(mk('  "test-a.js",   /* 說明 *\n  "test-b.js",   /* 說明 */\n  "test-c.js",   /* 說明 */'));
  assert.ok(has(s, "test-a.js", "test-c.js") && !s.has("test-b.js"), "被吃進註解的登記不算");
  assert.deepEqual(check(["test-b.js"], s), ["test-b.js"]);
  /* ④ 註解裡的引號、字串不會打亂判斷 */
  s = classifiedSet(mk('  "test-a.js",   /* 註解裡有 " 引號和 "test-z.js" */\n  "test-b.js"'));
  assert.ok(has(s, "test-a.js", "test-b.js") && !s.has("test-z.js"));
  /* ⑤ 註解或字串沒結束：讀不懂＝null（不能當通過） */
  assert.equal(classifiedSet(mk('  "test-a.js",   /* 沒結束')), null);
  assert.equal(classifiedSet(mk('  "test-a.js,\n  "test-b.js"')), null);
  /* ⑥ 陣列裡有字串以外的東西（程式碼、巢狀陣列）：不執行它，直接 null */
  assert.equal(classifiedSet(mk('  "test-a.js", ...require("x")')), null);
  assert.equal(classifiedSet(mk('  "test-a.js", ["test-b.js"]')), null);
  /* ⑦ 清單開頭的記號寫在註解裡不算；後面真的清單照讀 */
  assert.equal(classifiedSet('/* const CLASSIFIED = new Set(["test-x.js"]); */\nconst OTHER = 1;'), null);
  s = classifiedSet('/* const CLASSIFIED = new Set(["test-x.js"]); */\nconst CLASSIFIED = new Set([\n  "test-a.js",\n]);');
  assert.ok(has(s, "test-a.js") && !s.has("test-x.js"));
  /* ⑧ 每一項都要是 test-*.js */
  assert.equal(classifiedSet(mk('  "test-a.js",\n  "helper.js"')), null);
});

test("倉庫裡真的 testkinds.js 讀得出清單，而且 W45、W57 相關的新測試都在裡面", () => {
  const s = classifiedSet(fs.readFileSync(path.join(__dirname, "..", "..", "source", "xiangqi-lab", "tools", "testkinds.js"), "utf8"));
  assert.ok(s && s.size > 100, String(s && s.size));
  for (const f of ["test-jianghu-wind-1121.js", "test-device-checks-1121.js", "test-preview-build-1121.js"]) assert.ok(s.has(f), f);
});
