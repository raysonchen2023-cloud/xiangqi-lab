// verify.yml 拆成同時跑的工作（W183，開發者 11/27 選「改成同時跑」）的自我測試。
// 用法：node --test .github/scripts/test-verify-jobs.cjs
// 鎖住四件事：
//   ① 拆開前的 24 條檢查指令一條不少、各只出現一次，放在該放的工作（清單寫死在這裡，不從 verify.yml 讀，改 verify.yml 改不到基準）；
//   ② 分支保護的必要檢查叫 verify：verify 工作要 needs 兩個工作、if: always()（被略過的必要檢查會被當成通過）；
//   ③ 除了 verify 的 always()，沒有工作層的 if、沒有 continue-on-error（不准改成條件式略過或失敗照過）；
//   ④ 實跑 verify 的彙整指令：兩個都 success 才結束代碼 0，失敗、取消、略過、空值都要 1。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), cp = require("child_process");
const Y = fs.readFileSync(path.join(__dirname, "..", "workflows", "verify.yml"), "utf8");

/* 拆開前（main 937fdfa1）的 run 指令。selftest-ios：自我測試＋iOS 四步；full：其餘全部 */
const SELFTEST_IOS = [
  "node --test .github/scripts/test-check-text.cjs .github/scripts/test-ci-mode.cjs .github/scripts/test-guard-scan.cjs .github/scripts/test-skip-checks.cjs .github/scripts/test-test-classified.cjs .github/scripts/test-tag-release.cjs .github/scripts/test-check-evidence.cjs .github/scripts/test-base-guard.cjs .github/scripts/test-release-guard.cjs .github/scripts/test-todo-checks.cjs .github/scripts/test-zero-assert.cjs .github/scripts/test-check-verify-log.cjs .github/scripts/test-test-empty.cjs .github/scripts/test-tag-native.cjs",
  "node source/xiangqi-ios/scripts/check-native.js",
  "node --test source/xiangqi-ios/scripts/p03d/test-p03d.cjs",
  "node --test source/xiangqi-ios/scripts/test-canary-www.cjs",
  "node --test source/xiangqi-ios/scripts/test-canary-native.cjs"
];
const FULL = [
  "node .github/scripts/ci-mode.cjs \"$HEAD_REF\" \"$EVENT_NAME\" >> \"$GITHUB_OUTPUT\"",
  "node .github/scripts/check-text.cjs \"origin/$BASE_REF\"",
  "node .github/scripts/guard-release-files.cjs \"origin/$BASE_REF\"",
  "node source/check-build.js --out index.html",
  "node source/xiangqi-lab/tools/verify-all.js --skip release-verify --out verify-ci.txt --tally-out tally-ci.json",
  "node source/xiangqi-lab/tools/oss-scan.js source",
  "node .github/scripts/guard-release-pr.cjs \"origin/$BASE_REF\"",
  "node source/xiangqi-lab/tools/verify-all.js --out verify-ci.txt --tally-out tally-ci.json",
  "node source/xiangqi-lab/tools/make-evidence.js --verify verify-ci.txt --tally tally-ci.json --out evidence-ci.md --report-out testkinds-ci.json",
  "node .github/scripts/check-evidence.cjs data/docs/evidence.md evidence-ci.md",
  "node .github/scripts/check-verify-log.cjs . verify-ci.txt",
  "node source/xiangqi-lab/tools/release-sync-check.js --dir .",
  "node .github/scripts/check-fake-skip.cjs",
  "node .github/scripts/check-zero-assert.cjs \"$RUNNER_TEMP/assert-count\" verify-ci.txt",
  "node .github/scripts/check-test-skips.cjs verify-ci.txt",
  "node .github/scripts/check-test-todos.cjs tally-ci.json --base \"origin/$BASE_REF\"",
  "node .github/scripts/check-test-empty.cjs tally-ci.json",
  "node .github/scripts/check-test-classified.cjs \"origin/$BASE_REF\"",
  "node .github/scripts/scan-changed.cjs \"origin/$BASE_REF\" \"$RUNNER_TEMP/changed-files\""
];

/* 依縮排兩格的工作代號切出每個工作的原文 */
function jobs(y) {
  const lines = y.split("\n"), i = lines.indexOf("jobs:"), out = {};
  let cur = null;
  for (const l of lines.slice(i + 1)) {
    const m = /^  ([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (m) { cur = m[1]; out[cur] = []; continue }
    if (cur) out[cur].push(l);
  }
  for (const k in out) out[k] = out[k].join("\n");
  return out;
}
/* 自我測試那條只准在後面加檔（新增的自我測試），原本的檔一個都不能少、順序不變；其他每條要一字不差 */
const SELF0 = SELFTEST_IOS[0];
const same = (x, r) => x === r || (r === SELF0 && x.startsWith(r + " ") && /^( \.github\/scripts\/test-[a-z0-9-]+\.cjs)+$/.test(x.slice(r.length)));
const runsOf = (s) => s.split("\n").filter((l) => /^\s+run: /.test(l)).map((l) => l.replace(/^\s+run: /, ""));

test("① 拆開前的 24 條檢查指令都在、各只出現一次，放在該放的工作", () => {
  const J = jobs(Y);
  assert.deepEqual(Object.keys(J).sort(), ["full", "selftest-ios", "verify"], "工作只能有這三個");
  const all = runsOf(Y);
  for (const r of [...SELFTEST_IOS, ...FULL]) assert.equal(all.filter((x) => same(x, r)).length, 1, "這條要剛好出現一次：" + r);
  for (const r of SELFTEST_IOS) assert.ok(runsOf(J["selftest-ios"]).some((x) => same(x, r)), "要在 selftest-ios：" + r);
  for (const r of FULL) assert.ok(runsOf(J.full).some((x) => same(x, r)), "要在 full：" + r);
  /* full 要照原本的先後順序（完整驗證先產生 verify-ci.txt、tally-ci.json，後面的稽核才讀得到） */
  const order = runsOf(J.full).filter((r) => FULL.includes(r));
  assert.deepEqual(order, FULL, "full 裡的順序要跟拆開前一樣");
  assert.match(runsOf(J["selftest-ios"]).find((x) => same(x, SELF0)), / \.github\/scripts\/test-verify-jobs\.cjs(\s|$)/, "這支自我測試自己也要在 CI 跑");
  /* 兩個工作都要 checkout（完整歷史，比對 origin/main 要用）、裝 Node 24 */
  for (const k of ["selftest-ios", "full"]) {
    assert.match(J[k], /- uses: actions\/checkout@v4\n\s+with:\n\s+fetch-depth: 0/, k + " 要完整 checkout");
    assert.match(J[k], /- uses: actions\/setup-node@v4\n\s+with:\n\s+node-version: 24/, k + " 要裝 Node 24");
  }
  assert.match(J.full, /BASE_REF: \$\{\{ github\.base_ref \|\| 'main' \}\}/, "full 要有 BASE_REF");
});

test("② verify 工作：needs 兩個工作、if: always()、沒有 name（必要檢查的名稱就是 verify）", () => {
  const v = jobs(Y).verify;
  assert.match(v, /^    needs: \[selftest-ios, full\]$/m);
  assert.match(v, /^    if: always\(\)$/m);
  assert.doesNotMatch(v, /^    name:/m, "verify 不能另取名字，不然必要檢查 verify 對不到");
  assert.deepEqual(runsOf(v), ["|"], "verify 只有一步彙整");
});

test("③ 沒有工作層的條件、沒有 continue-on-error", () => {
  const J = jobs(Y);
  for (const k of ["selftest-ios", "full"]) assert.doesNotMatch(J[k], /^    if:/m, k + " 不能有工作層的 if");
  assert.doesNotMatch(Y, /continue-on-error/, "不准失敗照過");
  for (const k of ["selftest-ios", "full", "verify"]) assert.doesNotMatch(J[k], /^    strategy:/m, "不准用 matrix 改變要跑的東西");
  /* selftest-ios 的五步拆開前就沒有條件，拆開後也不能加 */
  assert.doesNotMatch(J["selftest-ios"], /^\s+if:/m, "selftest-ios 的步驟不能加條件");
});

test("④ 實跑彙整指令：兩個都 success 才 0；失敗、取消、略過、空值都 1", () => {
  const v = jobs(Y).verify.split("\n");
  const i = v.findIndex((l) => /^\s+run: \|$/.test(l));
  const ind = /^(\s*)/.exec(v[i + 1])[1].length;
  const script = v.slice(i + 1).filter((l) => l.trim() === "" || /^(\s*)/.exec(l)[1].length >= ind).map((l) => l.slice(ind)).join("\n");
  assert.match(script, /R_SELFTEST_IOS/); assert.match(script, /R_FULL/);
  assert.match(v.join("\n"), /R_SELFTEST_IOS: \$\{\{ needs\.selftest-ios\.result \}\}/);
  assert.match(v.join("\n"), /R_FULL: \$\{\{ needs\.full\.result \}\}/);
  const run = (a, b) => cp.spawnSync("bash", ["-c", script], { env: { ...process.env, R_SELFTEST_IOS: a, R_FULL: b }, encoding: "utf8" }).status;
  assert.equal(run("success", "success"), 0);
  for (const bad of ["failure", "cancelled", "skipped", ""]) {
    assert.equal(run(bad, "success"), 1, "selftest-ios=" + JSON.stringify(bad) + " 要算不過");
    assert.equal(run("success", bad), 1, "full=" + JSON.stringify(bad) + " 要算不過");
  }
  assert.equal(run("failure", "failure"), 1);
});
