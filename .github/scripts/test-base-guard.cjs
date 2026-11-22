// 基準版守門 base-guard.cjs 與 guard-base.yml 的自我測試（W69 流程盤點第 1 項）
//   只驗「怎麼判、怎麼換回」：在暫存資料夾建一個小 git 倉庫，模擬 PR 改壞守門程式，確認會換回 main 那一版；
//   主流程用假的 git、spawn 跑，不跑真正的完整驗證。
// 用法：node --test .github/scripts/test-base-guard.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const { GUARD, isGuard, guardChanged, STEPS, restore, modeArgs, modeOf, finalCode, runGuard } = require("./base-guard.cjs");
const NL = String.fromCharCode(10), NUL = String.fromCharCode(0);

test("哪些算判斷紅綠的程式：.github/scripts 全部、run-tests、check-build、testkinds、verify-all、make-evidence、oss-scan、release-sync-check、release-verify、pikafish-verify", () => {
  for (const f of [".github/scripts/check-test-skips.cjs", ".github/scripts/base-guard.cjs", "source/run-tests.js", "source/check-build.js",
    "source/xiangqi-lab/tools/testkinds.js", "source/xiangqi-lab/tools/verify-all.js", "source/xiangqi-lab/tools/make-evidence.js",
    "source/xiangqi-lab/tools/oss-scan.js", "source/xiangqi-lab/tools/release-sync-check.js", "source/xiangqi-lab/tools/release-verify.js",
    "source/xiangqi-lab/tools/pikafish-verify.js"]) assert.ok(isGuard(f), f);   /* PR #43 審查 B：pikafish-verify 是 verify-all 四步之一 */
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
    w(".github/scripts/check-test-skips.cjs", "process.exit(failed ? 1 : 0)" + NL);
    w("source/xiangqi-lab/tools/testkinds.js", "main 版" + NL);
    w("source/xiangqi-db/m/app.js", "main 版 App" + NL);
    g("add", "-A"); g("commit", "-qm", "main");
    g("checkout", "-q", "-b", "pr");
    w(".github/scripts/check-test-skips.cjs", "process.exit(0)   /* PR 把略過稽核改成一律放行 */" + NL);
    w(".github/scripts/new-guard.cjs", "process.exit(0)" + NL);
    w("source/xiangqi-lab/tools/testkinds.js", "PR 版：失敗也算通過" + NL);
    w("source/xiangqi-db/m/app.js", "PR 版 App" + NL);
    g("add", "-A"); g("commit", "-qm", "pr");
    const changed = guardChanged(g("diff", "--name-only", "--no-renames", "main...HEAD").split(NL).filter(Boolean));
    assert.deepEqual(changed, [".github/scripts/check-test-skips.cjs", ".github/scripts/new-guard.cjs", "source/xiangqi-lab/tools/testkinds.js"]);
    const cwd = process.cwd();
    process.chdir(d);
    let log;
    try { log = restore(changed, (f) => { try { return g("show", "main:" + f) } catch (e) { return null } }) } finally { process.chdir(cwd) }
    assert.equal(fs.readFileSync(path.join(d, ".github/scripts/check-test-skips.cjs"), "utf8"), "process.exit(failed ? 1 : 0)" + NL, "改壞的守門要換回 main 版");
    assert.equal(fs.readFileSync(path.join(d, "source/xiangqi-lab/tools/testkinds.js"), "utf8"), "main 版" + NL);
    assert.ok(!fs.existsSync(path.join(d, ".github/scripts/new-guard.cjs")), "main 沒有的守門先拿掉");
    assert.equal(fs.readFileSync(path.join(d, "source/xiangqi-db/m/app.js"), "utf8"), "PR 版 App" + NL, "一般檔照 PR 的版本");
    assert.equal(log.length, 3);
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("guard-base.yml：只跑本倉庫的 PR、pull_request_target、只讀權限、checkout 不留憑證、base-guard 從 main 取、分支名經環境變數、不傳事件名稱", () => {
  /* 先去掉整行註解再比對（PR #43 審查 C：註解裡寫了同一串字，改壞設定時照樣比對得到） */
  const y = fs.readFileSync(path.join(__dirname, "..", "workflows", "guard-base.yml"), "utf8").split(NL).filter((l) => !/^\s*#/.test(l)).join(NL);
  assert.match(y, /^\s+if: github\.event\.pull_request\.head\.repo\.full_name == github\.repository\s*$/m, "fork 開的 PR 不跑（PR #43 審查 A）");
  assert.match(y, /^on:\s*\n\s+pull_request_target:/m);
  assert.match(y, /^permissions:\s*\n\s+contents: read\s*$/m);
  assert.ok(!/contents: write|pull-requests: write|secrets\./.test(y), "不能有寫入權限或用 secrets");
  assert.match(y, /persist-credentials: false/);
  assert.match(y, /ref: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/);
  assert.match(y, /git show origin\/main:\.github\/scripts\/base-guard\.cjs > "\$RUNNER_TEMP\/base-guard\.cjs"/);
  assert.match(y, /run: node "\$RUNNER_TEMP\/base-guard\.cjs" origin\/main/);
  /* 取出所有 run 指令（單行 run: …，或 run: | 底下縮排更深的那幾行） */
  const L = y.split(NL), runs = [];
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

/* 主流程：用假的 git、spawn 跑 runGuard（PR #43 審查 C：結尾一律 0、模式改看事件名稱，原本測不到） */
function fake({ files = [], fail = [], release = false, diffThrows = false } = {}) {
  const calls = [], wrote = {}, removed = [];
  const git = (...a) => {
    if (a[0] === "diff") { if (diffThrows) throw new Error("沒有基準"); return files.join(NUL) }
    if (a[0] === "show") { const f = a[1].replace(/^[^:]+:/, ""); if (f.endsWith("new.cjs")) throw new Error("沒有"); return "main 版 " + f }
    throw new Error("沒預期的 git " + a.join(" "));
  };
  const spawn = (c, a) => {
    calls.push([c, ...a]);
    if (a[0] === ".github/scripts/ci-mode.cjs") return { status: 0, stdout: release ? "mode=release" + NL : "mode=feature" + NL };
    return { status: fail.some((k) => a.join(" ").includes(k)) ? 1 : 0 };
  };
  const fsx = { existsSync: () => true, rmSync: (f) => removed.push(f), mkdirSync() {}, writeFileSync: (f, s) => { wrote[f] = s } };
  return { git, spawn, fsx, calls, wrote, removed, log: () => {} };
}

test("主流程：沒改到守門回 0、不跑任何檢查；讀不到差異回 2", () => {
  const F = fake({ files: ["source/xiangqi-db/m/app.js"] });
  assert.equal(runGuard({ ...F }), 0);
  assert.equal(F.calls.length, 0);
  const G = fake({ diffThrows: true });
  assert.equal(runGuard({ ...G }), 2);
});

test("主流程：改到守門就換回、照 main 版 ci-mode 判斷模式；有一步沒過回 1，全過回 0", () => {
  const F = fake({ files: [".github/scripts/check-test-skips.cjs", ".github/scripts/new.cjs", "source/app.js"], fail: ["check-test-skips.cjs base-verify.txt"] });
  assert.equal(runGuard({ ...F, headRef: "w69/x" }), 1, "略過稽核換回 main 版後沒過，要紅燈");
  assert.equal(F.wrote[".github/scripts/check-test-skips.cjs"], "main 版 .github/scripts/check-test-skips.cjs");
  assert.deepEqual(F.removed, [".github/scripts/new.cjs"]);
  assert.deepEqual(F.calls[0], ["node", ".github/scripts/ci-mode.cjs", "w69/x", "pull_request"], "事件名稱一律 pull_request");
  assert.ok(F.calls.some((c) => c.join(" ").includes("guard-release-files.cjs")), "功能模式要跑功能守門");
  const ok = fake({ files: ["source/run-tests.js"] });
  assert.equal(runGuard({ ...ok, headRef: "w69/x" }), 0);
  assert.equal(ok.calls.length, 1 + STEPS("origin/main", "feature").length, "每一步都要跑");
});

test("主流程：release/ 分支照 main 版 ci-mode 走發布那一組（重產證據、比對），不跑功能守門", () => {
  const F = fake({ files: ["source/xiangqi-lab/tools/testkinds.js"], release: true });
  assert.equal(runGuard({ ...F, headRef: "release/20261123" }), 0);
  const all = F.calls.map((c) => c.join(" "));
  assert.ok(all.some((c) => c.includes("check-evidence.cjs data/docs/evidence.md base-evidence.md")));
  assert.ok(!all.some((c) => c.includes("guard-release-files.cjs")));
});

test("小工具：modeArgs 不管環境變數一律帶 pull_request；modeOf 只認 mode=release；finalCode 有一步非 0 就是 1", () => {
  assert.deepEqual(modeArgs("feat/a"), [".github/scripts/ci-mode.cjs", "feat/a", "pull_request"]);
  assert.deepEqual(modeArgs(undefined), [".github/scripts/ci-mode.cjs", "", "pull_request"]);
  assert.equal(modeOf("mode=release" + NL), "release");
  assert.equal(modeOf("mode=feature" + NL), "feature");
  assert.equal(modeOf(""), "feature");
  assert.equal(finalCode([{ status: 0 }, { status: 0 }]), 0);
  assert.equal(finalCode([{ status: 0 }, { status: 1 }]), 1);
  assert.equal(finalCode([{ status: 0 }, { status: null }]), 1, "被中斷（null）也不算過");
});
