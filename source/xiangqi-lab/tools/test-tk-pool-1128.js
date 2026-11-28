/* W189 第二步①（11/28）：同時跑測試檔的工作池 tk-pool.js（runPool、testJobs）。testkinds.js 還沒接上（下一支 PR 才接），這支只測模組本身。
   用假的跑法（故意讓排前面的最慢、記錄同時在跑幾支），不真的跑 380 支測試。分類用 testkinds.js 的 kindOf、KINDS（main 版本來就有匯出，換回 main 版也照樣能跑）。
   檢查：結果照清單順序排回；每支只跑一次；計數（行為／混合／原始碼／待分類、略過、預期失敗）跟同一份項目用 testkinds.js tally() 的規則算出來一樣；
   同時在跑的數量剛好到 jobs 上限；有 XQ_CUP_KEY_DIR 時每支檔各一個子資料夾（跑的時候存在、彼此不同、LEGACY 跟著同一個）、跑完刪掉，沒給就不動；
   XQ_TEST_JOBS 只收正整數；參數不齊直接報錯；tapParse 照 testkinds.js runFile 的規則；runFileAsync 跟 testkinds.js runFile 跑同一支真的測試檔，結果一模一樣（舊程式當標準答案）。
   「改壞驗證」：照完成順序放回、不限同時數量、全部共用同一個金鑰資料夾、XQ_TEST_JOBS 收 0、SKIP 算成通過、檔名那一項不還原成 0 項，都要抓得到。 */
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

const TAP = ["TAP version 13", "ok 1 - 第一項", "not ok 2 - 第二項", "ok 3 - 跳過的 # SKIP 這裡跑不了", "not ok 4 - 還沒修 # TODO 漏洞", "ok 5 - 有 \\# 井號和 \\\\ 反斜線", "    ok 1 - 子測試不算", "1..5"].join("\n");
const TAP_WANT = [{ name: "第一項", ok: true, todo: false, skip: false }, { name: "第二項", ok: false, todo: false, skip: false },
  { name: "跳過的", ok: true, todo: false, skip: true, why: "這裡跑不了" }, { name: "還沒修", ok: false, todo: true, skip: false },
  { name: "有 # 井號和 \\ 反斜線", ok: true, todo: false, skip: false }];
function chkTap(P) {   /* tapParse：ok／not ok、SKIP 不算通過、TODO 另計、\# 與 \\ 還原、子測試不算；整支檔只報檔名一項＝0 項；載入就壞（not ok 檔名）照常算一項失敗 */
  if (JSON.stringify(P.tapParse(TAP, "test-x.js")) !== JSON.stringify(TAP_WANT)) return false;
  if (P.tapParse("ok 1 - test-x.js\n1..1", "test-x.js").length !== 0) return false;
  return P.tapParse("not ok 1 - test-x.js\n1..1", "test-x.js").length === 1;
}
const REAL_FILES = ["test-jh-fade-1118.js", "test-r39-1118.js", "test-r30-1118.js"];

test("同時跑：完成順序打亂，結果照清單順序排回；每支只跑一次；計數跟 testkinds.js tally() 的規則算出來一樣", async () => { assert.ok(await chkOrder(loadPool())) });
test("同時跑：同時在跑的數量剛好到上限（jobs=3 時是 3、jobs=1 時是 1）", async () => { assert.ok(await chkJobs(loadPool())) });
test("千秋盃金鑰暫存資料夾：每支檔各一個子資料夾、跑完刪掉；沒給 XQ_CUP_KEY_DIR 就不動；其他環境變數照傳", async () => { assert.ok(await chkKeyDirs(loadPool())) });
test("XQ_TEST_JOBS：只收正整數；沒給照核心數", () => { assert.ok(chkJobsEnv(loadPool())) });
test("參數不齊、jobs 不是正整數：直接報錯，不當成跑完", async () => {
  const P = loadPool(), ok = args(P, newStat(), 2);
  for (const bad of [{ ...ok, run: null }, { ...ok, kindOf: null }, { ...ok, KINDS: null }, { ...ok, list: null }, { ...ok, jobs: 0 }, { ...ok, jobs: 1.5 }]) await assert.rejects(P.runPool(bad));
  const r = await P.runPool({ ...ok, list: [] }); assert.deepEqual(r.files, [], "空清單＝0 支");
});

test("TAP 解析：tapParse 照 testkinds.js runFile 的規則（ok／not ok、SKIP 不算通過、TODO 另計、\\# 與 \\\\ 還原、子測試不算、只報檔名＝0 項、載入就壞＝1 項失敗）", () => { assert.ok(chkTap(loadPool())) });
test("跟舊程式對答案：runFileAsync 跟 testkinds.js runFile 跑同一支真的測試檔（含略過的），結果一模一樣", async () => {
  /* 這支測試自己在 node --test 底下跑時，環境變數有 NODE_TEST_CONTEXT；子行程繼承到它就不輸出 TAP（兩邊都拿到 0 項）。
     testkinds.js 平常是直接執行、沒有這個變數，所以這裡暫時拿掉，照真實情況比，跑完放回去 */
  const P = loadPool(), keep = process.env.NODE_TEST_CONTEXT;
  delete process.env.NODE_TEST_CONTEXT;
  try {
    for (const file of REAL_FILES) {
      assert.ok(fs.existsSync(path.join(__dirname, file)), "拿來對照的測試檔不見了：" + file);
      const a = TK.runFile(file), b = await P.runFileAsync(file, { ...process.env }, __dirname);
      assert.ok(a.length > 0, file + " 要真的跑出項目");
      assert.deepEqual(JSON.parse(JSON.stringify(b)), JSON.parse(JSON.stringify(a)), file);
    }
  } finally { if (keep !== undefined) process.env.NODE_TEST_CONTEXT = keep }
});

test("改壞驗證：照完成順序放回、不限同時數量、全部共用同一個金鑰資料夾、XQ_TEST_JOBS 收 0、SKIP 算成通過、檔名那一項不還原成 0 項，上面的檢查都要抓得到", async () => {
  assert.equal(await chkOrder(loadPool(["out[i] = { file, items, ms: Date.now() - t0 }", "out[out.filter(Boolean).length] = { file, items, ms: Date.now() - t0 }"])), false, "照完成順序放回");
  assert.equal(await chkJobs(loadPool(["Array.from({ length: Math.min(jobs, list.length) }, worker)", "Array.from({ length: list.length }, worker)"])), false, "不限同時數量");
  assert.equal(await chkKeyDirs(loadPool(['own = fs.mkdtempSync(path.join(keyBase, "f" + i + "-")); e.XQ_CUP_KEY_DIR = own; if (legBase) e.XQ_CUP_LEGACY_DIR = own',
    "e.XQ_CUP_KEY_DIR = keyBase; if (legBase) e.XQ_CUP_LEGACY_DIR = keyBase"])), false, "全部共用同一個金鑰資料夾");
  assert.equal(chkJobsEnv(loadPool(["!Number.isInteger(n) || n < 1) throw", "!Number.isInteger(n) || n < 0) throw"])), false, "XQ_TEST_JOBS 收 0");
  assert.equal(chkTap(loadPool(["skip: !!sk,", "skip: false,"])), false, "SKIP 算成通過");
  assert.equal(chkTap(loadPool(["if (res.length === 1 && res[0].ok && !res[0].skip && !res[0].todo && res[0].name === file) return [];", ""])), false, "檔名那一項不還原成 0 項");
});
