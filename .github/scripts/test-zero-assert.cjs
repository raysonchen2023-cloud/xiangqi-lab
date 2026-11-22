// 斷言次數檢查（assert-count.cjs、check-zero-assert.cjs）的自我測試（W69 流程盤點第 10 項）
//   在暫存資料夾寫幾支假測試，用 NODE_OPTIONS 預載計數器真的跑一次 node --test，確認各種寫法的斷言次數記得對；
//   再驗判斷規則：0 次斷言要紅、t.skip 明列的不算、白名單、記到的項數比通過的少要紅。
// 用法：node --test .github/scripts/test-zero-assert.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const { judge, passedOf, readDir } = require("./check-zero-assert.cjs");
const COUNTER = path.join(__dirname, "assert-count.cjs"), CHECK = path.join(__dirname, "check-zero-assert.cjs");
const NL = String.fromCharCode(10);
/* 這支自己也在 node --test 裡跑：子程序要拿掉 NODE_TEST_CONTEXT，不然巢狀的 node --test 不會照常執行測試 */
const cleanEnv = (o) => { const e = { ...process.env, ...o }; delete e.NODE_TEST_CONTEXT; return e };

/* 假測試：每一項的名字說明它是哪種寫法 */
const FAKE = [
  'const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs");',
  'test("同步：兩次斷言", () => { assert.equal(1, 1); assert.ok(true) });',
  'test("非同步：await 之後的斷言也算", async () => { await new Promise((r) => setTimeout(r, 5)); assert.deepEqual([1], [1]) });',
  'test("空測試", () => {});',
  'test("三元式繞過：檔案不在就什麼都不做", () => { fs.existsSync("/沒有這個檔") ? assert.ok(true) : null });',
  'test("只印 diagnostic 就結束", (t) => { t.diagnostic("沒東西可驗") });',
  'test("用 t.skip 明列略過", (t) => { return t.skip("這個環境沒有") });',
  'test("用 node:assert（非 strict）也算", () => { require("node:assert").strictEqual(2, 2) });',
  'test("用 assert.strict 子物件也算", () => { require("node:assert").strict.equal(3, 3) });',
].join(NL) + NL;

function runFake() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-zeroassert-")), out = path.join(d, "out");
  fs.writeFileSync(path.join(d, "test-fake.js"), FAKE);
  const r = cp.spawnSync(process.execPath, ["--test", path.join(d, "test-fake.js")], { encoding: "utf8", env: cleanEnv({ XQ_ASSERT_DIR: out, NODE_OPTIONS: "--require " + COUNTER }) });
  return { d, out, r };
}

test("計數器真的跑：各種寫法的斷言次數；空測試、三元式繞過、只印 diagnostic 都是 0；t.skip 標成略過", () => {
  const { d, out } = runFake();
  try {
    const R = readDir(out), L = R["test-fake.js"], by = Object.fromEntries(L.map((c) => [c.name, c]));
    assert.equal(L.length, 8, "八項都要記到");
    assert.equal(by["同步：兩次斷言"].n, 2);
    assert.equal(by["非同步：await 之後的斷言也算"].n, 1, "AsyncLocalStorage 要跟到 await 之後");
    assert.equal(by["用 node:assert（非 strict）也算"].n, 1);
    assert.equal(by["用 assert.strict 子物件也算"].n, 1, "PR #57 審查：assert.strict 子物件也要包到");
    for (const k of ["空測試", "三元式繞過：檔案不在就什麼都不做", "只印 diagnostic 就結束"]) assert.equal(by[k].n, 0, k);
    assert.equal(by["用 t.skip 明列略過"].skipped, true);
    const j = judge(R, 5, []);
    assert.deepEqual(j.zero.sort(), ["test-fake.js：三元式繞過：檔案不在就什麼都不做", "test-fake.js：只印 diagnostic 就結束", "test-fake.js：空測試"].sort());
    assert.equal(j.ok, false);
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("沒設 XQ_ASSERT_DIR 時計數器什麼都不做（一般執行不受影響）", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-zeroassert-"));
  try {
    fs.writeFileSync(path.join(d, "test-a.js"), 'const assert = require("node:assert/strict"), test = require("node:test"); test("x", () => assert.ok(true));' + NL);
    const env = cleanEnv({ NODE_OPTIONS: "--require " + COUNTER }); delete env.XQ_ASSERT_DIR;
    const r = cp.spawnSync(process.execPath, ["--test", path.join(d, "test-a.js")], { encoding: "utf8", env, cwd: d });
    assert.equal(r.status, 0);
    assert.deepEqual(fs.readdirSync(d), ["test-a.js"], "不能多寫任何檔");
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("判斷：白名單放行、用不到的白名單列出來；記到的項數比通過的少、讀不到通過數都算失敗", () => {
  const R = { "test-a.js": [{ name: "有驗", n: 3, skipped: false }, { name: "沒驗", n: 0, skipped: false }, { name: "略過", n: 0, skipped: true }] };
  assert.deepEqual(judge(R, 2, []).zero, ["test-a.js：沒驗"]);
  const w = judge(R, 2, ["test-a.js：沒驗", "test-b.js：舊的"]);
  assert.equal(w.ok, true); assert.deepEqual(w.unused, ["test-b.js：舊的"]);
  assert.match(String(judge(R, 5, ["test-a.js：沒驗"]).short), /比通過的（5）少/, "計數器沒掛上或漏記");
  assert.equal(judge(R, 5, ["test-a.js：沒驗"]).ok, false);
  assert.ok(judge(R, null, ["test-a.js：沒驗"]).short, "讀不到通過數");
  assert.equal(judge({}, 10, []).ok, false, "一筆都沒記到（計數器沒掛上）不能當通過");
});

test("通過數從驗證紀錄的「四欄合計」讀", () => {
  assert.equal(passedOf("…" + NL + "  四欄合計：通過 2595、失敗 0、略過 150、預期失敗 0（…）" + NL), 2595);
  assert.equal(passedOf("沒有總結"), null);
});

test("命令列：資料夾不存在（計數器沒掛上）結束代碼 1；有 0 次斷言結束代碼 1；都有驗結束代碼 0", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-zeroassert-"));
  try {
    const allow = path.join(d, "allow.json"), ver = path.join(d, "verify.txt"), dir = path.join(d, "c");
    fs.writeFileSync(allow, JSON.stringify({ allow: [] })); fs.writeFileSync(ver, "四欄合計：通過 1、失敗 0" + NL);
    const run = () => cp.spawnSync(process.execPath, [CHECK, dir, ver, allow], { encoding: "utf8" }).status;
    assert.equal(run(), 1, "沒有資料夾");
    fs.mkdirSync(dir); fs.writeFileSync(path.join(dir, "test-a.js.json"), JSON.stringify([{ name: "x", n: 0, skipped: false }]));
    assert.equal(run(), 1, "0 次斷言");
    fs.writeFileSync(path.join(dir, "test-a.js.json"), JSON.stringify([{ name: "x", n: 1, skipped: false }]));
    assert.equal(run(), 0);
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("〔原始碼〕verify.yml 兩種模式的完整驗證都掛計數器、之後跑斷言次數檢查；基準版守門也一樣", () => {
  const Y = fs.readFileSync(path.join(__dirname, "..", "workflows", "verify.yml"), "utf8");
  assert.equal((Y.match(/NODE_OPTIONS: --require \$\{\{ github\.workspace \}\}\/\.github\/scripts\/assert-count\.cjs/g) || []).length, 2, "功能、發布兩步都要掛");
  assert.equal((Y.match(/XQ_ASSERT_DIR: \$\{\{ runner\.temp \}\}\/assert-count/g) || []).length, 2);
  assert.match(Y, /run: node \.github\/scripts\/check-zero-assert\.cjs "\$RUNNER_TEMP\/assert-count" verify-ci\.txt/);
  assert.match(Y, /test-zero-assert\.cjs/, "自我測試清單要有這支");
  const { STEPS, assertEnv, ASSERT_DIR } = require("./base-guard.cjs");
  for (const m of ["feature", "release"]) assert.ok(STEPS("origin/main", m).some(([, c]) => c[1] === ".github/scripts/check-zero-assert.cjs" && c[2] === ASSERT_DIR), m + " 模式要跑斷言次數檢查");
  const e = assertEnv(); assert.equal(e.XQ_ASSERT_DIR, ASSERT_DIR); assert.match(e.NODE_OPTIONS, /--require .*assert-count\.cjs/);
  /* PR #57 審查：基準版守門跑每一步都要帶計數器的環境變數（拿掉的話，換回 main 版後的完整驗證不會記斷言） */
  assert.match(fs.readFileSync(path.join(__dirname, "base-guard.cjs"), "utf8"), /spawn\(cmd\[0\], cmd\.slice\(1\), \{ inherit: true, env: assertEnv\(\) \}\)/);
});
