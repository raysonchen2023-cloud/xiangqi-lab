// 0 項檢查 check-test-empty.cjs 的自我測試（W69 流程盤點第 18 項）
//   用假的逐項結果、假的資料夾跑判斷與主流程；另外把 testkinds.js 複製到暫存資料夾，配一支 0 項的測試檔實跑，確認它也判失敗。
// 用法：node --test .github/scripts/test-test-empty.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const { fileCounts, compare, run, EXEMPT } = require("./check-test-empty.cjs");
const { STEPS } = require("./base-guard.cjs");
const ROOT = path.resolve(__dirname, "..", "..");

const T = (files) => ({ files: files.map(([file, n]) => ({ file, items: Array.from({ length: n }, (_, i) => ({ name: "項" + i, ok: true })) })), total: {} });
function go({ tally, tallyRaw, disk = [], diskErr = false }) {
  const out = [], errs = [];
  const code = run({
    tallyFile: "t.json", dir: "d",
    read: (f) => { if (f !== "t.json") throw new Error("沒有 " + f); return tallyRaw !== undefined ? tallyRaw : JSON.stringify(tally) },
    list: () => { if (diskErr) throw new Error("沒有資料夾"); return disk },
    log: (s) => out.push(s), err: (s) => errs.push(s),
  });
  return { code, out: out.join("\n"), err: errs.join("\n") };
}

test("讀逐項結果：每支檔的項數；缺 files、某支缺 file 或 items → null", () => {
  assert.deepEqual(fileCounts(T([["test-a.js", 2], ["test-b.js", 0]])), [{ file: "test-a.js", n: 2 }, { file: "test-b.js", n: 0 }]);
  assert.equal(fileCounts(null), null);
  assert.equal(fileCounts({}), null);
  assert.equal(fileCounts({ files: [{ file: "test-a.js" }] }), null, "缺 items");
  assert.equal(fileCounts({ files: [{ items: [] }] }), null, "缺 file");
  /* node --test 跑一項都沒有的檔，會把檔案本身報成一項通過（名稱＝檔名）：要算 0 項 */
  assert.deepEqual(fileCounts({ files: [{ file: "test-z.js", items: [{ name: "test-z.js", ok: true }] }] }), [{ file: "test-z.js", n: 0 }]);
  assert.deepEqual(fileCounts({ files: [{ file: "test-z.js", items: [{ name: "test-z.js", ok: false }] }] }), [{ file: "test-z.js", n: 1 }], "載入就壞＝1 項失敗，照常紅燈");
  assert.deepEqual(fileCounts({ files: [{ file: "test-z.js", items: [{ name: "test-z.js", ok: true }, { name: "別的", ok: true }] }] }), [{ file: "test-z.js", n: 2 }]);
});

test("比對：0 項的檔算 empty；資料夾有、結果沒有的算 missing；EXEMPT 與不是 test-*.js 的不算", () => {
  assert.deepEqual(compare([{ file: "test-a.js", n: 1 }, { file: "test-b.js", n: 0 }], ["test-a.js", "test-b.js", "test-c.js", "testkinds.js", "x.js", "test-home-focus.js"]),
    { empty: ["test-b.js"], missing: ["test-c.js"] });
  assert.deepEqual(compare([{ file: "test-a.js", n: 3 }], ["test-a.js"]), { empty: [], missing: [] });
  assert.deepEqual([...EXEMPT], ["test-home-focus.js"], "准不跑的只有會開無頭 Chrome 的那支；要多加得改這支、逐行審");
});

test("主流程：都有跑到、都至少 1 項 → 0；有 0 項的檔 → 1；有檔沒跑到（例如被加進 SKIP）→ 1", () => {
  assert.equal(go({ tally: T([["test-a.js", 1]]), disk: ["test-a.js", "test-home-focus.js"] }).code, 0);
  const a = go({ tally: T([["test-a.js", 1], ["test-b.js", 0]]), disk: ["test-a.js", "test-b.js"] });
  assert.equal(a.code, 1); assert.match(a.err, /1 支測試檔一項都沒跑出來/); assert.match(a.err, /test-b\.js/);
  const b = go({ tally: T([["test-a.js", 1]]), disk: ["test-a.js", "test-b.js"] });
  assert.equal(b.code, 1); assert.match(b.err, /1 支測試檔沒跑到/); assert.match(b.err, /test-b\.js/);
});

test("主流程：讀不到逐項結果、不是 JSON、格式不對、資料夾讀不到 → 2（缺驗，不當通過）", () => {
  assert.equal(go({ tallyRaw: "不是 JSON" }).code, 2);
  assert.equal(go({ tally: { total: {} } }).code, 2);
  assert.equal(go({ tally: T([["test-a.js", 1]]), diskErr: true }).code, 2);
});

test("接線：verify.yml 跑這一步、讀同一份 tally-ci.json，自我測試也有這支；base-guard 兩組 STEPS 都有這一步", () => {
  const y = fs.readFileSync(path.join(ROOT, ".github", "workflows", "verify.yml"), "utf8");
  assert.match(y, /run: node \.github\/scripts\/check-test-empty\.cjs tally-ci\.json\n/);
  assert.match(y, /node --test [^\n]*\.github\/scripts\/test-test-empty\.cjs/);
  for (const mode of ["feature", "release"]) {
    const s = STEPS("origin/main", mode).find(([, cmd]) => cmd[1] === ".github/scripts/check-test-empty.cjs");
    assert.ok(s, mode + " 模式要有 0 項檢查");
    assert.deepEqual(s[1], ["node", ".github/scripts/check-test-empty.cjs", "base-tally.json"]);
  }
});

test("testkinds.js 實跑：一支 0 項的測試檔要判失敗（結束代碼 1、列出檔名）；有 1 項通過的檔照常 0", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xq-empty-"));
  try {
    fs.copyFileSync(path.join(ROOT, "source", "xiangqi-lab", "tools", "testkinds.js"), path.join(tmp, "testkinds.js"));
    const env = { ...process.env }; delete env.NODE_TEST_CONTEXT;
    const runTk = () => cp.spawnSync(process.execPath, [path.join(tmp, "testkinds.js")], { cwd: tmp, env, encoding: "utf8" });
    fs.writeFileSync(path.join(tmp, "test-ok.js"), 'require("node:test")("有跑", () => {});\n');
    const ok = runTk();
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    fs.writeFileSync(path.join(tmp, "test-zero.js"), 'if (false) require("node:test")("被條件包住", () => {});\n');
    const bad = runTk();
    assert.equal(bad.status, 1, bad.stdout + bad.stderr);
    assert.match(bad.stdout, /一項都沒跑出來：test-zero\.js/);
    assert.doesNotMatch(bad.stdout, /test-zero\.js\t[^\n]*1\/1/, "不能把檔案本身算成 1 項通過");
    /* PR #60 Codex 審查：唯一一項的名稱剛好等於檔名，TAP 跟「沒跑」分不出來 → 寧可紅燈，訊息要教人改名 */
    fs.rmSync(path.join(tmp, "test-zero.js"));
    fs.writeFileSync(path.join(tmp, "test-same.js"), 'require("node:test")("test-same.js", () => {});\n');
    const same = runTk();
    assert.equal(same.status, 1, same.stdout + same.stderr);
    assert.match(same.stdout, /一項都沒跑出來：test-same\.js（[^\n]*名稱剛好跟檔名一樣[^\n]*改名）/);
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
});
