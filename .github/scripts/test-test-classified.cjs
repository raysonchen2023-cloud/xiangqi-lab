// 自我測試：新增測試檔一定要分類 check-test-classified.cjs（W60 A3，2026-11-21；2026-11-23 #95 改成沙箱執行＋原文兩道判定）
// 用法：node --test .github/scripts/test-test-classified.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const { loadKinds, registered, addedTests, check } = require("./check-test-classified.cjs");

/* 寫一支假的 testkinds.js 到暫存資料夾，執行後回傳「已登記」清單（讀不懂＝null） */
const DIR = fs.mkdtempSync(path.join(os.tmpdir(), "xq-tk-"));
let seq = 0;
function load(src, timeout) {
  const f = path.join(DIR, "tk" + (seq++) + ".js");
  fs.writeFileSync(f, '"use strict";\n' + src + "\n");
  const k = loadKinds(f, timeout);
  return k && registered(k);
}
const EXP = "\nmodule.exports = { CLASSIFIED, PENDING };";
const BASE = 'const CLASSIFIED = new Set([\n  "test-a.js",\n]);\nconst PENDING = new Set([]);';
const no = (s, why) => { assert.ok(s, why + "：要讀得出清單"); assert.ok(s.has("test-a.js"), why + "：test-a 照算"); assert.ok(!s.has("test-x.js"), why + "：test-x 不能算已登記") };

test("執行 testkinds 取出已分類清單：CLASSIFIED 裡、而且不在 PENDING 才算；不是 Set、沒有清單回 null（不能當通過）", () => {
  const s = load('const CLASSIFIED = new Set([\n  "test-a.js",   /* 註解 */\n  "test-b-1121.js",\n]);\nconst PENDING = new Set(["test-c.js"]);' + EXP);
  assert.deepEqual([...s].sort(), ["test-a.js", "test-b-1121.js"]);
  assert.equal(load("const OTHER = 1; module.exports = { OTHER };"), null, "沒有 CLASSIFIED");
  assert.equal(load('const CLASSIFIED = ["test-a.js"]; const PENDING = new Set([]);' + EXP), null, "不是 Set");
});

test("只算這個 PR 新增的測試檔，沒分類的列出來", () => {
  const git = () => "source/xiangqi-lab/tools/test-new-1121.js\nsource/xiangqi-lab/tools/test-ok.js\nsource/xiangqi-lab/tools/helper.js\n";
  const added = addedTests("origin/main", git);
  assert.deepEqual(added, ["test-new-1121.js", "test-ok.js"], "不是 test-*.js 的不算");
  assert.deepEqual(check(added, new Set(["test-ok.js"])), ["test-new-1121.js"]);
  assert.deepEqual(check([], new Set(["test-ok.js"])), []);
});

test("#95：登記被註解吃掉、if (false)、.delete、.filter、放進 PENDING、HTML 式註解——實際沒登記的都不算", () => {
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  // "test-x.js",\n]);\nconst PENDING = new Set([]);' + EXP), "單行註解");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  /* "test-x.js", */\n]);\nconst PENDING = new Set([]);' + EXP), "區塊註解");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",   /* 說明 *\n  "test-x.js",   /* 說明 */\n]);\nconst PENDING = new Set([]);' + EXP), "#74 註解結尾少一個 /");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  ...(false ? ["test-x.js"] : []),\n]);\nconst PENDING = new Set([]);' + EXP), "條件不成立的分支（false ? … : …）");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  "test-x.js",\n]);\nCLASSIFIED.delete("test-x.js");\nconst PENDING = new Set([]);' + EXP), ".delete");
  no(load('const CLASSIFIED = new Set(["test-a.js", "test-x.js"].filter((f) => f !== "test-x.js"));\nconst PENDING = new Set([]);' + EXP), ".filter");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  "test-x.js",\n]);\nconst PENDING = new Set(["test-x.js"]);' + EXP), "同時放在 PENDING");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  <!-- "test-x.js",\n]);\nconst PENDING = new Set([]);' + EXP), "HTML 式註解");
});

test("#95 第二輪：testkinds 改全域、改匯出、getter、換原型、寫假輸出、逃出沙箱、提早收掉外層——都騙不了（不算已登記或讀不懂）", () => {
  const X = '\n/* "test-x.js" */';   /* 原文段落外放一個檔名也沒用：原文判定只看 CLASSIFIED 段 */
  no(load(BASE + '\nmodule.exports = { CLASSIFIED: new Set(["test-a.js", "test-x.js"]), PENDING };'), "檔尾改匯出");
  no(load(BASE + '\nObject.defineProperty(module.exports = {}, "CLASSIFIED", { get() { return new Set(["test-a.js", "test-x.js"]) } });'), "getter");
  /* 原文段落裡放 // "test-x.js"（原文判定會過），再改沙箱的 values：只剩執行判定能擋——外面要用自己的 Set.prototype.values 取內容 */
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  // "test-x.js",\n]);\nconst PENDING = new Set([]);\nconst __v = Set.prototype.values; Set.prototype.values = Set.prototype[Symbol.iterator] = function* () { yield* __v.call(this); if (this === CLASSIFIED) yield "test-x.js" };' + EXP), "改 Set.prototype.values 與 Symbol.iterator（只對 CLASSIFIED 多吐一個，免得 PENDING 也多一個把結果蓋掉）");
  no(load('const CLASSIFIED = new Set([\n  "test-a.js",\n  "test-" + "x.js",\n]);\nconst PENDING = new Set([]);' + EXP), "檔名拼起來（執行有、原文沒有完整檔名：原文判定擋）");
  no(load(BASE + '\nArray.from = () => ["test-a.js", "test-x.js"]; JSON.stringify = () => \'{"classified":["test-a.js","test-x.js"],"pending":[]}\';' + EXP), "改 Array.from、JSON.stringify");
  assert.equal(load(BASE + '\nObject.setPrototypeOf(CLASSIFIED, { has: () => true, values: () => ["test-x.js"][Symbol.iterator]() });' + EXP), null, "換原型");
  assert.equal(load(BASE + '\nprocess.stdout.write(\'{"classified":["test-a.js","test-x.js"],"pending":[]}\');' + EXP), null, "寫假輸出（沙箱裡沒有 process）");
  no(load(BASE + X + '\nconsole.log(\'{"classified":["test-a.js","test-x.js"],"pending":[]}\');' + EXP), "載入時印字（沙箱的 console 不輸出，也不影響判定）");
  /* 逃出沙箱：順著 require.constructor 拿 Function 執行「回傳全域」，在拿到的全域上做記號。沙箱裡拿到的是沙箱自己的全域，外面不能被做記號。
     （不要用 process.exit：真的逃出去時會把整個測試程序結束掉、結束碼 0，反而把失敗蓋掉） */
  delete globalThis.__xqEscaped;
  const esc = load(BASE + '\nrequire.constructor("return globalThis")().__xqEscaped = 1;' + EXP);
  assert.equal(globalThis.__xqEscaped, undefined, "順著 require.constructor 摸到外面的全域");
  assert.ok(esc === null || !esc.has("test-x.js"));
  const blocked = (s, why) => assert.ok(s === null || (s.has("test-a.js") && !s.has("test-x.js")), why + "：要嘛讀不懂（null），要嘛 test-x 不算");
  blocked(load(BASE + X + '\n;this.__tk = [new Set(["test-a.js", "test-x.js"]), new Set([])]; }).call(this); (function () {' + EXP), "提早收掉外層、寫假結果");
});

test("#95：冒充 Set（自訂類別、蓋掉 has）、項目不是 test-*.js、語法錯、丟例外、跑不完（逾時）一律讀不懂（null）", { timeout: 20000 }, () => {
  assert.equal(load('class Set extends globalThis.Set { has() { return true } }\nconst CLASSIFIED = new Set(["test-a.js"]);\nconst PENDING = new Set([]);' + EXP), null, "自訂類別遮蔽 Set");
  assert.equal(load('const CLASSIFIED = new Set(["test-a.js"]); CLASSIFIED.has = () => true;\nconst PENDING = new Set([]);' + EXP), null, "物件上自己加 has");
  assert.equal(load('const CLASSIFIED = new Set(["test-a.js", "helper.js"]);\nconst PENDING = new Set([]);' + EXP), null, "不是 test-*.js");
  assert.equal(load('const CLASSIFIED = new Set(["test-a.js"]\nconst PENDING = new Set([]);' + EXP), null, "語法錯");
  assert.equal(load('throw new Error("x");'), null, "丟例外");
  assert.equal(load("for (;;) {}", 1500), null, "跑不完要逾時當讀不懂");
});

test("#95：指令列結束代碼——testkinds 讀不懂、沒給比較基準都是 2，不是 0", { timeout: 20000 }, () => {
  const SCRIPT = path.join(__dirname, "check-test-classified.cjs");
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), "xq-tkrepo-")), tools = path.join(repo, "source", "xiangqi-lab", "tools");
  fs.mkdirSync(tools, { recursive: true });
  fs.writeFileSync(path.join(tools, "testkinds.js"), '"use strict";\nconst CLASSIFIED = new Set(["test-a.js"]\nconst PENDING = new Set([]);' + EXP);   /* 語法錯：載入就失敗，結束碼要是 2（不是靠 git 失敗才 2） */
  let r = cp.spawnSync(process.execPath, [SCRIPT, "origin/main"], { cwd: repo, encoding: "utf8" });
  assert.equal(r.status, 2, "testkinds 讀不懂：" + r.stderr);
  r = cp.spawnSync(process.execPath, [SCRIPT], { cwd: repo, encoding: "utf8" });
  assert.equal(r.status, 2, "沒給比較基準");
  fs.rmSync(path.join(tools, "testkinds.js"));
  r = cp.spawnSync(process.execPath, [SCRIPT, "origin/main"], { cwd: repo, encoding: "utf8" });
  assert.equal(r.status, 2, "沒有 testkinds.js");
});

test("倉庫裡真的 testkinds.js 讀得出清單，而且 W45、W57 相關的新測試都在裡面", () => {
  const k = loadKinds(path.join(__dirname, "..", "..", "source", "xiangqi-lab", "tools", "testkinds.js"));
  assert.ok(k && k.classified.size > 100, String(k && k.classified.size));
  const s = registered(k);
  assert.equal(s.size, k.classified.size, "真實 testkinds 原文段落跟執行結果一致");
  for (const f of ["test-jianghu-wind-1121.js", "test-device-checks-1121.js", "test-preview-build-1121.js"]) assert.ok(s.has(f), f);
});
