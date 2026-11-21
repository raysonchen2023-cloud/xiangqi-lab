// W60-A2 證據同次重產（11/22）：verify-all.js 的執行編號與逐項結果 → make-evidence.js 只讀同一次的兩份檔產生 evidence.md；
//   發布 PR 用 .github/scripts/check-evidence.cjs 比對（只忽略執行編號、產生時間）
// 用法：node --test xiangqi-lab/tools/test-make-evidence.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const ME = require("./make-evidence.js"), VA = require("./verify-all.js");
const MARK_RE = /對應的發布版：`(\d{8}-\d{4})`/g;   /* 跟 release-sync-check.js 的 MARK_RE 同一條 */

const TREE = "b".repeat(64);
const verifyText = (runId, extra = "") => `《象棋千秋》可重現驗證紀錄（verify-all.js）
========================================
執行時間：2026-11-21T22:00:00.000Z（UTC）＝ 2026-11-22 06:00:00（臺灣時間）
執行編號：${runId}
Node.js：v24.0.0；作業系統：linux
倉庫 commit：${"c".repeat(40)}
release.json：版本 20261122-0600、html abc、sw def
source/ 資料夾：3 個檔，樹雜湊 SHA-256 ${TREE}
----------------------------------------
第 4 步 run-tests：${extra || "通過（結束代碼 0，1.0 秒）"}
`;
const z = () => ({ "行為": { all: 0, pass: 0, skip: 0 }, "混合": { all: 0, pass: 0, skip: 0 }, "原始碼": { all: 0, pass: 0, skip: 0 }, "待分類": { all: 0, pass: 0, skip: 0 }, todo: { all: 0, xpass: 0 } });
/* 假的逐項結果：一檔四項（行為通過、〔原始碼〕通過、行為略過、預期失敗） */
function tally(runId, okFirst = true) {
  const items = [
    { name: "棋盤會動", ok: okFirst, kind: "行為" },
    { name: "〔原始碼〕按鈕存在", ok: true, kind: "原始碼" },
    { name: "要讀 CDN 的圖", ok: true, skip: true, why: "公開副本沒有", kind: "行為" },
    { name: "還沒修的漏洞", ok: false, todo: true, kind: "行為" }];
  const n = z(), total = z();
  for (const it of items) for (const o of [n, total]) { if (it.todo) { o.todo.all++; if (it.ok) o.todo.xpass++; continue } o[it.kind].all++; if (it.skip) o[it.kind].skip++; else if (it.ok) o[it.kind].pass++ }
  return { runId, node: "v24.0.0", kinds: ["行為", "混合", "原始碼", "待分類"], files: [{ file: "test-demo.js", items, n }], total };
}
const ITEMS = [{ id: "E1", t: "示範", since: "0600", tests: ["棋盤會動"], shots: ["01_有.png", "02_沒有.png"], steps: "點一下", expect: "會動" }];
const build = (runId, okFirst = true) => ME.buildEvidence({ tally: tally(runId, okFirst), verify: ME.parseVerify(verifyText(runId)), items: ITEMS, shotOk: f => f === "01_有.png", excluded: 46 });

test("讀驗證紀錄：執行編號、時間、版本、source/ 樹雜湊、run-tests 狀態", () => {
  const V = ME.parseVerify(verifyText("gh-123-1"));
  assert.equal(V.runId, "gh-123-1"); assert.equal(V.timeTw, "2026-11-22 06:00:00（臺灣時間）");
  assert.equal(V.version, "20261122-0600"); assert.equal(V.sourceTree, TREE); assert.equal(V.sourceFiles, 3);
  assert.equal(V.runTests, "通過"); assert.equal(V.commit, "c".repeat(40));
});

test("同一次執行才產生：執行編號不同、缺編號、run-tests 沒跑都拒絕", () => {
  assert.deepEqual(ME.checkInputs(tally("gh-1-1"), ME.parseVerify(verifyText("gh-1-1"))), []);
  assert.match(ME.checkInputs(tally("gh-2-1"), ME.parseVerify(verifyText("gh-1-1"))).join(), /不是同一次執行：驗證紀錄是 gh-1-1，逐項結果是 gh-2-1/);
  assert.match(ME.checkInputs(tally(null), ME.parseVerify(verifyText("gh-1-1"))).join(), /tally\.json 沒有執行編號/);
  assert.match(ME.checkInputs(tally("gh-1-1"), ME.parseVerify(verifyText("gh-1-1").replace(/^執行編號：.*\n/m, ""))).join(), /沒有「執行編號：」/);
  assert.match(ME.checkInputs(tally("gh-1-1"), ME.parseVerify(verifyText("gh-1-1", "略過"))).join(), /run-tests 那一步沒有跑（略過）/);
  assert.match(ME.checkInputs(null, ME.parseVerify(verifyText("gh-1-1"))).join(), /格式不對/);
});

test("evidence.md：標題與「對應的發布版」照 release-sync-check 的格式；檔頭寫同一個執行編號、source/ 樹雜湊；四欄數字分開", () => {
  const md = build("gh-77-2");
  assert.match(md, /^# 驗證紀錄（版本 20261122-0600）$/m);
  assert.deepEqual([...md.matchAll(MARK_RE)].map(m => m[1]), ["20261122-0600"]);
  assert.match(md, /^- 執行編號：gh-77-2（Node\.js v24\.0\.0；/m);
  assert.match(md, /^- 產生時間：2026-11-22 06:00:00（臺灣時間）$/m, "時間取驗證紀錄的執行時間，不是產生頁面的當下");
  assert.ok(md.includes(`樹雜湊 SHA-256 \`${TREE}\``));
  assert.match(md, /共 3 項＝\*\*通過 2\*\*、\*\*失敗 0\*\*、\*\*略過 1\*\*/);
  assert.match(md, /預期失敗 1/);
  assert.match(md, /- ﹣ 要讀 CDN 的圖（test-demo\.js；公開沒有|- ﹣ 要讀 CDN 的圖（test-demo\.js；公開副本沒有）/);
  assert.match(md, /\[01_有\.png\]\(evidence\/01_%E6%9C%89\.png\)、（缺：02_沒有\.png）/);
  assert.match(md, /沒放的測試檔有 46 個/);
});

test("跟 check-evidence.cjs 接起來：同一份結果、不同次執行（編號、時間、Node 小版本不同）→ 算同一份；有一項結果不同 → 不算", (t) => {
  /* run-tests.js 的暫存配置裡 xiangqi-lab/site 連到倉庫根目錄，.github 在那裡（CI 一定跑得到）；開發者電腦的 site 是部署資料夾、沒有 .github */
  const CEP = path.join(__dirname, "..", "site", ".github", "scripts", "check-evidence.cjs");
  if (!fs.existsSync(CEP)) return t.skip("沒有 .github/scripts/check-evidence.cjs（要在公開倉庫用 source/run-tests.js 跑）");
  const CE = require(CEP);
  const a = build("gh-10-1"), b = build("gh-11-1").replace("2026-11-22 06:00:00", "2026-11-22 07:15:00").replace("Node.js v24.0.0", "Node.js v24.1.0");
  assert.equal(CE.compare(a, b).ok, true, CE.compare(a, b).errors.join("；"));
  const c = build("gh-12-1", false);
  assert.equal(CE.compare(a, c).ok, false, "第一項從通過變失敗要抓得到");
});

test("測試分類報表跟 evidence.md 同一個執行編號、同一個 source/ 樹雜湊", () => {
  const R = ME.buildReport(tally("gh-5-1"), ME.parseVerify(verifyText("gh-5-1")));
  assert.equal(R.runId, "gh-5-1"); assert.equal(R.sourceTree, TREE); assert.equal(R.version, "20261122-0600");
  assert.deepEqual(R.files.map(f => f.file), ["test-demo.js"]); assert.equal(R.total["行為"].all, 2);
});

test("verify-all.js：執行編號寫進紀錄，也傳給「重跑測試」那一步（XQ_RUN_ID、XQ_TALLY_OUT）", () => {
  const repo = path.join(__dirname, "..", "site"), out = path.join(os.tmpdir(), "xq-a2-tally-" + process.pid + ".json");
  const r = VA.verifyAll({ repo, only: ["__不跑__"], tallyOut: out });
  const id = r.facts.runId;
  assert.match(id, process.env.GITHUB_RUN_ID ? /^gh-\d+-\d+$/ : /^local-\d{8}T\d{6}Z-[0-9a-f]{4}$/);
  assert.match(r.text, new RegExp("^執行編號：" + id + "$", "m"));
  const rt = r.results.find(x => x.id === "run-tests");
  assert.equal(rt.env.XQ_RUN_ID, id); assert.equal(rt.env.XQ_TALLY_OUT, path.resolve(out));
  assert.equal(VA.runIdOf({ GITHUB_RUN_ID: "42", GITHUB_RUN_ATTEMPT: "3" }), "gh-42-3");
  assert.equal(VA.runIdOf({ GITHUB_RUN_ID: "42" }), "gh-42-1");
  /* 真的跑一個子行程，確認步驟的環境變數有傳進去（不是只掛在步驟設定上） */
  const seen = VA.runStep({ id: "run-tests", cmd: ["-e", "process.stdout.write((process.env.XQ_RUN_ID || '無') + '|' + (process.env.XQ_TALLY_OUT || '無'))"], env: rt.env }, repo, 60);
  assert.equal(seen.out, id + "|" + path.resolve(out));
});

test("make-evidence.js 指令：兩份檔不是同一次執行就不產生（結束代碼 1），是同一次就寫出 evidence.md 與分類報表", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-a2-")), f = n => path.join(d, n);
  fs.writeFileSync(f("v.txt"), verifyText("gh-9-1")); fs.writeFileSync(f("t.json"), JSON.stringify(tally("gh-8-1")));
  const run = () => cp.spawnSync(process.execPath, [path.join(__dirname, "make-evidence.js"), "--verify", f("v.txt"), "--tally", f("t.json"), "--out", f("e.md"), "--report-out", f("r.json"), "--repo", d], { encoding: "utf8" });
  let r = run();
  assert.equal(r.status, 1); assert.match(r.stdout, /不是同一次執行/); assert.ok(!fs.existsSync(f("e.md")), "不產生半套");
  fs.writeFileSync(f("t.json"), JSON.stringify(tally("gh-9-1")));
  r = run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(fs.readFileSync(f("e.md"), "utf8"), /^- 執行編號：gh-9-1/m);
  assert.equal(JSON.parse(fs.readFileSync(f("r.json"), "utf8")).runId, "gh-9-1");
  fs.rmSync(d, { recursive: true, force: true });
});

test("〔原始碼〕testkinds.js 在 XQ_TALLY_OUT 有設時寫出逐項結果（帶 XQ_RUN_ID），寫不出來算失敗", () => {
  const s = fs.readFileSync(path.join(__dirname, "testkinds.js"), "utf8");
  assert.match(s, /if \(mode === "run" && process\.env\.XQ_TALLY_OUT\)/);
  assert.match(s, /runId: process\.env\.XQ_RUN_ID \|\| null/);
  assert.match(s, /逐項結果寫不出來（XQ_TALLY_OUT）：" \+ e\.message\); process\.exitCode = 1/);
});
