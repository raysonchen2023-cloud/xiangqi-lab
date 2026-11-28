/* W189 第二步①（11/28）：同時跑測試檔的工作池 tk-pool.js（runPool、testJobs）。testkinds.js 還沒接上（下一支 PR 才接），這支只測模組本身。
   用假的跑法（故意讓排前面的最慢、記錄同時在跑幾支），不真的跑 380 支測試。分類用 testkinds.js 的 kindOf、KINDS（main 版本來就有匯出，換回 main 版也照樣能跑）。
   檢查：結果照清單順序排回；每支只跑一次；計數（行為／混合／原始碼／待分類、略過、預期失敗）跟同一份項目用 testkinds.js tally() 的規則算出來一樣；
   同時在跑的數量剛好到 jobs 上限；有 XQ_CUP_KEY_DIR 時每支檔各一個子資料夾（跑的時候存在、彼此不同、LEGACY 跟著同一個）、跑完刪掉，沒給就不動；
   XQ_TEST_JOBS 只收正整數；參數不齊直接報錯。
   「改壞驗證」：照完成順序放回、不限同時數量、全部共用同一個金鑰資料夾、XQ_TEST_JOBS 收 0，都要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), os = require("os"), vm = require("vm");
const POOL_FILE = path.join(__dirname, "tk-pool.js"), POOL_SRC = fs.readFileSync(POOL_FILE, "utf8");
const TK = (() => { const k = process.env.NODE_TEST_CONTEXT; process.env.NODE_TEST_CONTEXT = k || "child"; try { return require("./testkinds.js") } finally { if (k === undefined) delete process.env.NODE_TEST_CONTEXT } })();
/* 載入 tk-pool.js：可以先把原始碼改壞（改壞驗證用） */
function loadPool(patch) {
  let src = POOL_SRC;
  if (patch) { assert.ok(src.includes(patch[0]), "改壞點不存在：" + patch[0].slice(0, 60)); src = src.replace(patch[0], patch[1]) }
  const mod = { exports: {} };
  vm.runInThisContext("(function (exports, require, module, __filename, __dirname) {" + src + "\n})", { filename: POOL_FILE })(mod.exports, require, mod, POOL_FILE, __dirname);
  return mod.exports;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* 假的檔案清單：每支檔回固定的幾項；分類用 testkinds.js 的 kindOf（清單裡沒登記的檔一律「待分類」，所以另外挑兩支已登記的真檔名，讓行為／原始碼也算得到） */
const REAL = [...TK.CLASSIFIED].slice(0, 2);
const FAKE = [...REAL, ...Array.from({ length: 7 }, (_, i) => "test-fake-" + i + ".js")];
const ITEMS = (file) => { const i = FAKE.indexOf(file); const a = [{ name: "項目 A" + i, ok: true }, { name: "〔原始碼〕項目 B" + i, ok: i % 3 !== 0 }, { name: "〔混合〕項目 C" + i, ok: true }];
  if (i === 4) a.push({ name: "略過的", ok: true, skip: true, why: "這個環境跑不了" }); if (i === 5) a.push({ name: "還沒修", ok: false, todo: true }); if (i === 1) a.push({ name: "還沒修卻過了", ok: true, todo: true }); return a };
function fakeRun(stat) {
  return async (file, env) => {
    stat.now++; stat.max = Math.max(stat.max, stat.now); stat.calls.push(file); stat.env.push(env);
    if (env.XQ_CUP_KEY_DIR) { stat.dirs.push(env.XQ_CUP_KEY_DIR); stat.dirExist.push(fs.existsSync(env.XQ_CUP_KEY_DIR)); fs.writeFileSync(path.join(env.XQ_CUP_KEY_DIR, ".xiangqi-cup-key.test.json"), file) }
    await sleep(5 + (FAKE.length - FAKE.indexOf(file)) * 6); stat.now--; stat.done.push(file);
    return ITEMS(file).map((x) => ({ ...x }));
  };
}
const newStat = () => ({ now: 0, max: 0, calls: [], env: [], dirs: [], dirExist: [], done: [] });
const args = (P, st, jobs, extra = {}) => ({ list: FAKE, jobs, run: fakeRun(st), kindOf: TK.kindOf, KINDS: TK.KINDS, env: {}, ...extra });
/* 期望的計數：同一份項目，照 testkinds.js tally() 的規則（todo 另計、略過不算通過）一項一項算 */
function expectCount(list) {
  const z = () => Object.assign(Object.fromEntries(TK.KINDS.map((k) => [k, { all: 0, pass: 0, skip: 0 }])), { todo: { all: 0, xpass: 0 } });
  const total = z(), files = [];
  for (const file of list) { const n = z(), items = ITEMS(file).map((x) => ({ ...x, kind: TK.kindOf(file, x.name) }));
    for (const it of items) for (const o of [n, total]) { if (it.todo) { o.todo.all++; if (it.ok) o.todo.xpass++; continue } o[it.kind].all++; if (it.skip) o[it.kind].skip++; else if (it.ok) o[it.kind].pass++ }
    files.push({ file, items, n }) }
  return { files, total };
}
const strip = (r) => ({ total: r.total, files: r.files.map((f) => ({ file: f.file, items: f.items, n: f.n })) });

/* 檢查函式：改壞驗證拿同一組去跑 */
async function chkOrder(P) {   /* 完成順序倒過來，結果照清單順序；每支只跑一次；計數跟 tally 規則一樣；每支都有 ms；四類、略過、預期失敗、預期失敗卻通過都真的算到 */
  const st = newStat(), r = await P.runPool(args(P, st, 3));
  if (st.done[0] === FAKE[0]) return false;   /* 要真的打亂了才算測到 */
  if (st.calls.length !== FAKE.length || new Set(st.calls).size !== FAKE.length) return false;
  if (!r.files.every((f) => typeof f.ms === "number" && f.ms >= 0)) return false;
  const T = r.total; if (!(T["行為"].all && T["原始碼"].all && T["混合"].all && T["待分類"].all && T["待分類"].skip && T.todo.all === 2 && T.todo.xpass === 1)) return false;
  return JSON.stringify(strip(r)) === JSON.stringify(strip(expectCount(FAKE)));
}
async function chkJobs(P) {   /* 同時在跑的數量剛好到 jobs 的上限；jobs=1 時一次只跑一支 */
  const a = newStat(); await P.runPool(args(P, a, 3));
  const b = newStat(); await P.runPool(args(P, b, 1));
  return a.max === 3 && b.max === 1;
}
async function chkKeyDirs(P) {   /* 有 XQ_CUP_KEY_DIR：每支檔各一個子資料夾（在它底下、跑的時候存在、彼此不同、LEGACY 跟著同一個），跑完都刪掉；沒給就不動 */
  const base = fs.mkdtempSync(path.join(os.tmpdir(), "xq-pool-"));
  try {
    const st = newStat(); await P.runPool(args(P, st, 3, { env: { XQ_CUP_KEY_DIR: base, XQ_CUP_LEGACY_DIR: base, OTHER: "x" } }));
    if (st.dirs.length !== FAKE.length || new Set(st.dirs).size !== FAKE.length) return false;
    if (!st.dirs.every((d) => path.dirname(d) === base) || !st.dirExist.every(Boolean)) return false;
    if (!st.env.every((e) => e.XQ_CUP_LEGACY_DIR === e.XQ_CUP_KEY_DIR && e.OTHER === "x")) return false;
    if (fs.readdirSync(base).length !== 0) return false;   /* 跑完都刪掉 */
    const st2 = newStat(); await P.runPool(args(P, st2, 2, { list: FAKE.slice(0, 3), env: { OTHER: "y" } }));
    return st2.dirs.length === 0 && st2.env.every((e) => !("XQ_CUP_KEY_DIR" in e) && e.OTHER === "y");
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
}
function chkJobsEnv(P) {   /* XQ_TEST_JOBS：正整數照用；沒給照核心數（至少 1）；0、負數、小數、文字都報錯 */
  if (P.testJobs({ XQ_TEST_JOBS: "2" }) !== 2) return false;
  if (!(P.testJobs({}) >= 1) || P.testJobs({ XQ_TEST_JOBS: "" }) !== P.testJobs({})) return false;
  for (const bad of ["0", "-1", "1.5", "abc"]) { let threw = false; try { P.testJobs({ XQ_TEST_JOBS: bad }) } catch (e) { threw = true } if (!threw) return false }
  return true;
}

test("同時跑：完成順序打亂，結果照清單順序排回；每支只跑一次；計數跟 testkinds.js tally() 的規則算出來一樣", async () => { assert.ok(await chkOrder(loadPool())) });
test("同時跑：同時在跑的數量剛好到上限（jobs=3 時是 3、jobs=1 時是 1）", async () => { assert.ok(await chkJobs(loadPool())) });
test("千秋盃金鑰暫存資料夾：每支檔各一個子資料夾、跑完刪掉；沒給 XQ_CUP_KEY_DIR 就不動；其他環境變數照傳", async () => { assert.ok(await chkKeyDirs(loadPool())) });
test("XQ_TEST_JOBS：只收正整數；沒給照核心數", () => { assert.ok(chkJobsEnv(loadPool())) });
test("參數不齊、jobs 不是正整數：直接報錯，不當成跑完", async () => {
  const P = loadPool(), ok = args(P, newStat(), 2);
  for (const bad of [{ ...ok, run: null }, { ...ok, kindOf: null }, { ...ok, KINDS: null }, { ...ok, list: null }, { ...ok, jobs: 0 }, { ...ok, jobs: 1.5 }]) await assert.rejects(P.runPool(bad));
  const r = await P.runPool({ ...ok, list: [] }); assert.deepEqual(r.files, [], "空清單＝0 支");
});

test("改壞驗證：照完成順序放回、不限同時數量、全部共用同一個金鑰資料夾、XQ_TEST_JOBS 收 0，上面的檢查都要抓得到", async () => {
  assert.equal(await chkOrder(loadPool(["out[i] = { file, items, ms: Date.now() - t0 }", "out[out.filter(Boolean).length] = { file, items, ms: Date.now() - t0 }"])), false, "照完成順序放回");
  assert.equal(await chkJobs(loadPool(["Array.from({ length: Math.min(jobs, list.length) }, worker)", "Array.from({ length: list.length }, worker)"])), false, "不限同時數量");
  assert.equal(await chkKeyDirs(loadPool(['own = fs.mkdtempSync(path.join(keyBase, "f" + i + "-")); e.XQ_CUP_KEY_DIR = own; if (legBase) e.XQ_CUP_LEGACY_DIR = own',
    "e.XQ_CUP_KEY_DIR = keyBase; if (legBase) e.XQ_CUP_LEGACY_DIR = keyBase"])), false, "全部共用同一個金鑰資料夾");
  assert.equal(chkJobsEnv(loadPool(["!Number.isInteger(n) || n < 1) throw", "!Number.isInteger(n) || n < 0) throw"])), false, "XQ_TEST_JOBS 收 0");
});
