// 預期失敗（todo）稽核 check-test-todos.cjs 的自我測試（W69 流程盤點第 9 項）
//   用假的逐項結果、假的白名單與假的 git 跑判斷與主流程；不讀倉庫的測試結果、不連網。
// 用法：node --test .github/scripts/test-todo-checks.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const { todoItems, readAllow, compare, run, ALLOW } = require("./check-test-todos.cjs");
const { STEPS } = require("./base-guard.cjs");

const T = (todos, total = todos.length) => ({ files: [{ file: "test-a.js", items: [{ name: "正常", ok: true }, ...todos.map((n) => ({ name: n, ok: false, todo: true }))] }], total: { todo: { all: total, xpass: 0 } } });
const AL = (allow) => JSON.stringify({ note: "x", allow });

/* 主流程：files＝假檔案內容；base＝null 代表比較基準沒有白名單檔；baseErr＝git show 失敗 */
function go({ tally, allow = [], base = [], baseErr = false, tallyRaw }) {
  const files = { "t.json": tallyRaw !== undefined ? tallyRaw : JSON.stringify(tally), [ALLOW]: AL(allow) };
  const out = [], errs = [];
  const git = (...a) => {
    if (a[0] === "cat-file") { if (base === null) throw new Error("沒有"); return "" }
    if (a[0] === "show") { if (baseErr) throw new Error("壞了"); return AL(base) }
    throw new Error("沒預期的 git " + a.join(" "));
  };
  const code = run({ tallyFile: "t.json", read: (f) => { if (!(f in files)) throw new Error("沒有 " + f); return files[f] }, git, log: (s) => out.push(s), err: (s) => errs.push(s) });
  return { code, out: out.join("\n"), err: errs.join("\n") };
}

test("讀逐項結果：抽出每一條 todo（檔名：項目）；格式不對回 null；條數跟總結對不上要標出來", () => {
  assert.deepEqual(todoItems(T(["漏洞一"])), { items: ["test-a.js：漏洞一"], total: 1 });
  assert.deepEqual(todoItems(T([])), { items: [], total: 0 });
  assert.equal(todoItems({ files: [] }), null, "缺 total.todo");
  assert.equal(todoItems(null), null);
  assert.equal(todoItems(T(["漏洞一"], 2)).mismatch, true, "逐項 1 條、總結 2 條");
});

test("比對：不在白名單的算新增；白名單比基準多出來的算變多；白名單有、這次沒出現的只算可刪", () => {
  assert.deepEqual(compare(["a", "b"], ["a"], ["a"]), { added: ["b"], gone: [], grew: [] });
  assert.deepEqual(compare(["a"], ["a", "c"], ["a"]), { added: [], gone: ["c"], grew: ["c"] });
  assert.deepEqual(compare([], ["a"], ["a"]), { added: [], gone: ["a"], grew: [] });
  assert.throws(() => readAllow("{}"), /allow/);
  assert.throws(() => readAllow(JSON.stringify({ allow: [1] })), /allow/);
});

test("主流程：沒有 todo、白名單沒變 → 0；新冒出 todo → 1；白名單在 PR 裡加條目把它放行 → 還是 1（只能減不能加）", () => {
  assert.equal(go({ tally: T([]) }).code, 0);
  const a = go({ tally: T(["新漏洞"]) });
  assert.equal(a.code, 1); assert.match(a.err, /1 項預期失敗不在白名單/); assert.match(a.err, /test-a\.js：新漏洞/);
  const b = go({ tally: T(["新漏洞"]), allow: ["test-a.js：新漏洞"], base: [] });
  assert.equal(b.code, 1, "同一個 PR 加 todo 又加白名單，要紅燈"); assert.match(b.err, /只能減不能加/);
});

test("主流程：基準本來就有的 todo 照常放行；修好後從白名單刪掉（變少）可以；基準還沒有白名單檔時當空的", () => {
  assert.equal(go({ tally: T(["舊漏洞"]), allow: ["test-a.js：舊漏洞"], base: ["test-a.js：舊漏洞"] }).code, 0);
  const g = go({ tally: T([]), allow: ["test-a.js：舊漏洞"], base: ["test-a.js：舊漏洞"] });
  assert.equal(g.code, 0); assert.match(g.out, /可以從白名單刪掉/);
  assert.equal(go({ tally: T([]), allow: [], base: ["test-a.js：舊漏洞"] }).code, 0, "白名單變少可以");
  assert.equal(go({ tally: T([]), allow: [], base: null }).code, 0, "第一次上線：基準沒有這個檔");
  assert.equal(go({ tally: T([]), allow: ["x"], base: null }).code, 1, "第一次上線也不能帶條目進來");
});

test("主流程：讀不到逐項結果、不是 JSON、格式不對、條數對不上、白名單壞掉、基準讀不到 → 2（缺驗，不當通過）", () => {
  assert.equal(go({ tallyRaw: "不是 JSON" }).code, 2);
  assert.equal(go({ tally: { files: [] } }).code, 2);
  assert.equal(go({ tally: T(["a"], 3) }).code, 2);
  assert.equal(go({ tally: T([]), baseErr: true }).code, 2);
  const files = { "t.json": JSON.stringify(T([])), [ALLOW]: "壞掉" };
  assert.equal(run({ tallyFile: "t.json", read: (f) => files[f], git: () => "", log() {}, err() {} }), 2, "白名單不是 JSON");
  assert.equal(run({ tallyFile: "沒有.json", read: (f) => { throw new Error(f) }, git: () => "", log() {}, err() {} }), 2);
});

test("倉庫裡的白名單：格式對、上線時是空的；verify.yml 跑這支（讀同一次的逐項結果、跟 main 比）；基準版守門兩種模式都跑", () => {
  const root = path.join(__dirname, "..", "..");
  assert.deepEqual(readAllow(fs.readFileSync(path.join(root, ALLOW), "utf8")), []);
  const y = fs.readFileSync(path.join(root, ".github", "workflows", "verify.yml"), "utf8");
  assert.match(y, /run: node \.github\/scripts\/check-test-todos\.cjs tally-ci\.json --base "origin\/\$BASE_REF"/);
  assert.match(y, /\.github\/scripts\/test-todo-checks\.cjs/, "自我測試要在 CI 跑");
  for (const m of ["feature", "release"]) assert.ok(STEPS("origin/main", m).some(([, c]) => c.join(" ") === "node .github/scripts/check-test-todos.cjs base-tally.json --base origin/main"), m + " 模式要跑 todo 稽核");
});
