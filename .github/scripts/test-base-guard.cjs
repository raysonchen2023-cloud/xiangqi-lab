// 基準版守門 base-guard.cjs 與 guard-base.yml 的自我測試（W69 流程盤點第 1 項）
//   只驗「怎麼判、怎麼換回」：在暫存資料夾建一個小 git 倉庫，模擬 PR 改壞守門程式，確認會換回 main 那一版；不跑真正的完整驗證。
// 用法：node --test .github/scripts/test-base-guard.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const { GUARD, isGuard, guardChanged, STEPS, restore } = require("./base-guard.cjs");

test("哪些算判斷紅綠的程式：.github/scripts 全部、run-tests、check-build、testkinds、verify-all、make-evidence、oss-scan、release-sync-check、release-verify", () => {
  for (const f of [".github/scripts/check-test-skips.cjs", ".github/scripts/base-guard.cjs", "source/run-tests.js", "source/check-build.js",
    "source/xiangqi-lab/tools/testkinds.js", "source/xiangqi-lab/tools/verify-all.js", "source/xiangqi-lab/tools/make-evidence.js",
    "source/xiangqi-lab/tools/oss-scan.js", "source/xiangqi-lab/tools/release-sync-check.js", "source/xiangqi-lab/tools/release-verify.js"]) assert.ok(isGuard(f), f);
  /* 資料檔與一般程式不換回：白名單、已知問題清單要逐行審；測試檔、App 程式本來就該照 PR 的版本跑 */
  for (const f of [".github/test-skip-allow.json", ".github/p0-known.json", ".github/workflows/verify.yml", "source/xiangqi-lab/tools/test-blitz.js",
    "source/xiangqi-db/m/07z9e-shijiao.js", "source/xiangqi-lab/tools/testkinds.json", "source/xiangqi-lab/tools/oss-scan.js.bak"]) assert.ok(!isGuard(f), f);
  assert.deepEqual(guardChanged(["source/run-tests.js", "README.md", "source/run-tests.js", ".github/scripts/a.cjs"]), [".github/scripts/a.cjs", "source/run-tests.js"]);
  assert.ok(GUARD.length >= 4);
});

test("要跑的檢查：功能模式跟 verify.yml 功能那一組一樣；發布模式要重產並比對證據、跑發布同步", () => {
  const F = STEPS("origin/main", "feature").map((x) => x[1].slice(1).join(" "));
  for (const k of [".github/scripts/check-fake-skip.cjs", ".github/scripts/guard-release-files.cjs origin/main", "source/check-build.js --out index.html",
    "source/xiangqi-lab/tools/verify-all.js --skip release-verify", ".github/scripts/check-test-skips.cjs base-verify.txt",
    ".github/scripts/check-test-classified.cjs origin/main", "source/xiangqi-lab/tools/oss-scan.js source"]) assert.ok(F.some((x) => x.startsWith(k)), "功能模式少了 " + k);
  const R = STEPS("origin/main", "release").map((x) => x[1].slice(1).join(" "));
  assert.ok(!R.some((x) => x.includes("guard-release-files")), "發布 PR 本來就會改網站檔，不跑功能守門");
  for (const k of [".github/scripts/check-evidence.cjs data/docs/evidence.md base-evidence.md", "source/xiangqi-lab/tools/release-sync-check.js --dir .",
    ".github/scripts/check-test-skips.cjs base-verify.txt"]) assert.ok(R.some((x) => x.startsWith(k)), "發布模式少了 " + k);
  assert.ok(R.some((x) => x.startsWith("source/xiangqi-lab/tools/verify-all.js") && !x.includes("--skip")), "發布模式要跑全套");
});

test("換回基準版：在暫存 git 倉庫模擬 PR 改壞守門、新增守門、改到一般檔；只換守門程式，PR 新加的守門先拿掉", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-baseguard-"));
  const g = (...a) => cp.execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: d, encoding: "utf8" });
  const w = (f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s) };
  try {
    g("init", "-q", "-b", "main");
    w(".github/scripts/check-test-skips.cjs", "process.exit(failed ? 1 : 0)\n");
    w("source/xiangqi-lab/tools/testkinds.js", "main 版\n");
    w("source/xiangqi-db/m/app.js", "main 版 App\n");
    g("add", "-A"); g("commit", "-qm", "main");
    g("checkout", "-q", "-b", "pr");
    w(".github/scripts/check-test-skips.cjs", "process.exit(0)   /* PR 把略過稽核改成一律放行 */\n");
    w(".github/scripts/new-guard.cjs", "process.exit(0)\n");
    w("source/xiangqi-lab/tools/testkinds.js", "PR 版：失敗也算通過\n");
    w("source/xiangqi-db/m/app.js", "PR 版 App\n");
    g("add", "-A"); g("commit", "-qm", "pr");
    const changed = guardChanged(g("diff", "--name-only", "--no-renames", "main...HEAD").split("\n").filter(Boolean));
    assert.deepEqual(changed, [".github/scripts/check-test-skips.cjs", ".github/scripts/new-guard.cjs", "source/xiangqi-lab/tools/testkinds.js"]);
    const cwd = process.cwd();
    process.chdir(d);
    let log;
    try { log = restore(changed, (f) => { try { return g("show", "main:" + f) } catch (e) { return null } }) } finally { process.chdir(cwd) }
    assert.equal(fs.readFileSync(path.join(d, ".github/scripts/check-test-skips.cjs"), "utf8"), "process.exit(failed ? 1 : 0)\n", "改壞的守門要換回 main 版");
    assert.equal(fs.readFileSync(path.join(d, "source/xiangqi-lab/tools/testkinds.js"), "utf8"), "main 版\n");
    assert.ok(!fs.existsSync(path.join(d, ".github/scripts/new-guard.cjs")), "main 沒有的守門先拿掉");
    assert.equal(fs.readFileSync(path.join(d, "source/xiangqi-db/m/app.js"), "utf8"), "PR 版 App\n", "一般檔照 PR 的版本");
    assert.equal(log.length, 3);
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("guard-base.yml：pull_request_target、只讀權限、checkout 不留憑證、base-guard 從 main 取、分支名經環境變數、不傳事件名稱", () => {
  const y = fs.readFileSync(path.join(__dirname, "..", "workflows", "guard-base.yml"), "utf8");
  assert.match(y, /^on:\s*\n\s+pull_request_target:/m);
  assert.match(y, /^permissions:\s*\n\s+contents: read\s*$/m);
  assert.ok(!/contents: write|pull-requests: write|secrets\./.test(y), "不能有寫入權限或用 secrets");
  assert.match(y, /persist-credentials: false/);
  assert.match(y, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(y, /git show origin\/main:\.github\/scripts\/base-guard\.cjs > "\$RUNNER_TEMP\/base-guard\.cjs"/);
  assert.match(y, /run: node "\$RUNNER_TEMP\/base-guard\.cjs" origin\/main/);
  /* 取出所有 run 指令（單行 run: …，或 run: | 底下縮排更深的那幾行） */
  const L = y.split("\n"), runs = [];
  for (let i = 0; i < L.length; i++) {
    const m = /^(\s*)run:\s*(.*)$/.exec(L[i]); if (!m) continue;
    if (m[2] !== "|") { runs.push(m[2]); continue }
    for (let j = i + 1; j < L.length && (L[j].trim() === "" || L[j].match(/^\s*/)[0].length > m[1].length); j++) runs.push(L[j]);
  }
  assert.ok(runs.length >= 3, "要讀到 run 指令");
  for (const l of runs) assert.ok(!/\$\{\{/.test(l), "run 指令不能直接嵌 GitHub 欄位：" + l.trim());
  assert.match(y, /HEAD_REF: \$\{\{ github\.head_ref \}\}/);
  assert.ok(!/EVENT_NAME/.test(y), "pull_request_target 傳進去會被 ci-mode 當成發布模式");
});
