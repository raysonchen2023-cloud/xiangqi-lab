// 自我測試：新增測試檔一定要分類 check-test-classified.cjs（W60 A3，2026-11-21；2026-11-23 #95 改成真的載入 testkinds.js）
// 用法：node --test .github/scripts/test-test-classified.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const { loadKinds, registered, addedTests, check } = require("./check-test-classified.cjs");

/* 寫一支假的 testkinds.js 到暫存資料夾，載入後回傳「已登記」清單（讀不懂＝null） */
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "xq-tk-"));
let seq = 0;
function load(src, run) {
  const f = path.join(DIR, "tk" + (seq++) + ".js");
  fs.writeFileSync(f, '"use strict";\n' + src + "\n");
  const k = loadKinds(f, run);
  return k && registered(k);
}
const EXP = "\nmodule.exports = { CLASSIFIED, PENDING };";

test("載入 testkinds 取出已分類清單：CLASSIFIED 裡、而且不在 PENDING 才算；匯出不對或讀不懂回 null（不能當通過）", () => {
  const s = load('const CLASSIFIED = new Set([\n  "test-a.js",   /* 註解 */\n  "test-b-1121.js",\n]);\nconst PENDING = new Set(["test-c.js"]);' + EXP);
  assert.deepEqual([...s].sort(), ["test-a.js", "test-b-1121.js"]);
  assert.equal(load("const OTHER = 1; module.exports = { OTHER };"), null, "沒有匯出 CLASSIFIED");
  assert.equal(load('const CLASSIFIED = ["test-a.js"]; const PENDING = new Set([]);' + EXP), null, "不是 Set");
});

test("只算這個 PR 新增的測試檔，沒分類的列出來", () => {
  const git = () => "source/xiangqi-lab/tools/test-new-1121.js\nsource/xiangqi-lab/tools/test-ok.js\nsource/xiangqi-lab/tools/helper.js\n";
  const added = addedTests("origin/main", git);
  assert.deepEqual(added, ["test-new-1121.js", "test-ok.js"], "不是 test-*.js 的不算");
  assert.deepEqual(check(added, new Set(["test-ok.js"])), ["test-new-1121.js"]);
  assert.deepEqual(check([], new Set(["test-ok.js"])), []);
});

test("#95：登記被註解吃掉、if (false)、.delete、.filter、放進 PENDING、HTML 式註解——實際沒登記的都不算（原本掃原文會被騙）", () => {
  const no = (s, why) => { assert.ok(s, why + "：要讀得出清單"); assert.ok(s.has("test-a.js"), why + "：test-a 照算"); assert.ok(!s.has("test-x.js"), why + "：test-x 不能算已登記") };
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  // "test-x.js",\n]);\nconst PENDING = new Set([]);' + EXP), "單行註解");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  /* "test-x.js", */\n]);\nconst PENDING = new Set([]);' + EXP), "區塊註解");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",   /* 說明 *\n  "test-x.js",   /* 說明 */\n]);\nconst PENDING = new Set([]);' + EXP), "#74 註解結尾少一個 /");
  no(load('let CLASSIFIED = new Set(["test-a.js"]);\nif (false) { CLASSIFIED = new Set(["test-a.js", "test-x.js"]); }\nconst PENDING = new Set([]);' + EXP), "if (false)");
  no(load('const CLASSIFIED = new Set(["test-a.js", "test-x.js"]);\nCLASSIFIED.delete("test-x.js");\nconst PENDING = new Set([]);' + EXP), ".delete");
  no(load('const CLASSIFIED = new Set(["test-a.js", "test-x.js"].filter((f) => f !== "test-x.js"));\nconst PENDING = new Set([]);' + EXP), ".filter");
  no(load('const CLASSIFIED = new Set(["test-a.js", "test-x.js"]);\nconst PENDING = new Set(["test-x.js"]);' + EXP), "同時放在 PENDING");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  <!-- "test-x.js",\n]);\nconst PENDING = new Set([]);' + EXP), "HTML 式註解");
});

test("#95：冒充 Set（自訂類別、蓋掉 has）、項目不是 test-*.js、語法錯、丟例外、跑不完（逾時）一律讀不懂（null）", () => {
  assert.equal(load('class Set extends globalThis.Set { has() { return true } }\nconst CLASSIFIED = new Set(["test-a.js"]);\nconst PENDING = new Set([]);' + EXP), null, "自訂類別遮蔽 Set");
  assert.equal(load('const CLASSIFIED = new Set(["test-a.js"]); CLASSIFIED.has = () => true;\nconst PENDING = new Set([]);' + EXP), null, "物件上自己加 has");
  assert.equal(load('const CLASSIFIED = new Set(["test-a.js", "helper.js"]);\nconst PENDING = new Set([]);' + EXP), null, "不是 test-*.js");
  assert.equal(load('const CLASSIFIED = new Set(["test-a.js"]\nconst PENDING = new Set([]);' + EXP), null, "語法錯");
  assert.equal(load('throw new Error("x");'), null, "丟例外");
  const quick = (args) => cp.spawnSync(process.execPath, args, { encoding: "utf8", timeout: 1500 });
  assert.equal(load("for (;;) {}", quick), null, "跑不完要逾時當讀不懂");
});

test("倉庫裡真的 testkinds.js 讀得出清單，而且 W45、W57 相關的新測試都在裡面", () => {
  const k = loadKinds(path.join(__dirname, "..", "..", "source", "xiangqi-lab", "tools", "testkinds.js"));
  assert.ok(k && k.classified.size > 100, String(k && k.classified.size));
  const s = registered(k);
  for (const f of ["test-jianghu-wind-1121.js", "test-device-checks-1121.js", "test-preview-build-1121.js"]) assert.ok(s.has(f), f);
});
