// ci-mode.cjs 的自我測試（W36）：分支名與事件對應到正確的檢查模式。
// 用法：node --test .github/scripts/test-ci-mode.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { execFileSync } = require("child_process"), path = require("path"), fs = require("fs");
const { ciMode } = require("./ci-mode.cjs");

test("發布 PR：來源分支以小寫 release/ 開頭 → 全套", () => {
  assert.equal(ciMode("release/20261121-0700", "pull_request"), "release");
  assert.equal(ciMode("release/w33-devmode", "pull_request"), "release");
});
test("功能 PR：其他分支 → 先組版、略過版號一致", () => {
  for (const b of ["w37/ci-two-modes", "w36/ci-pr-template", "Release/x", "releases/x", "hotfix/release/x", "my-release/x", "release-x"]) assert.equal(ciMode(b, "pull_request"), "feature", b);
});
test("不是 PR 觸發（手動執行、推送）→ 一律全套；分支名空白的 PR → 功能", () => {
  assert.equal(ciMode("", "workflow_dispatch"), "release");
  assert.equal(ciMode(undefined, "push"), "release");
  assert.equal(ciMode("", "pull_request"), "feature");
});
// 第二輪審查次要項：這一項用 execFileSync 不經 shell，只驗輸出格式，驗不到 workflow 的注入防護（那個看下兩項）
test("命令列輸出給 $GITHUB_OUTPUT 的格式：只有一行 mode=…（只驗格式，不經 shell）", () => {
  const run = (...a) => execFileSync(process.execPath, [path.join(__dirname, "ci-mode.cjs"), ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  assert.equal(run("release/x", "pull_request"), "mode=release\n");
  assert.equal(run("w37/x", "pull_request"), "mode=feature\n");
  assert.equal(run("w37/含特殊字元$(x)", "pull_request"), "mode=feature\n");
});

/* workflow 的注入防護：run 指令不能直接嵌入使用者可控的 GitHub 欄位（分支名、PR 標題內文、留言…），一律經環境變數傳入 */
const UNTRUSTED = /\$\{\{\s*github\.(head_ref|event\.(pull_request|issue|comment|review|head_commit|commits|pages))/;
function untrustedInRun(yml) {
  const bad = []; let inRun = false, runIndent = 0;
  yml.split(/\r?\n/).forEach((line, i) => {
    const ind = line.match(/^ */)[0].length, m = line.match(/^(\s*)(- )?run:\s*(.*)$/);
    if (m) { inRun = true; runIndent = m[1].length + (m[2] ? 2 : 0); if (UNTRUSTED.test(m[3])) bad.push(i + 1); return; }
    if (inRun && line.trim() && ind <= runIndent) inRun = false;
    if (inRun && UNTRUSTED.test(line)) bad.push(i + 1);
  });
  return bad;
}
test("檢查器本身抓得到：單行、多行 run 直接嵌入分支名或 PR 標題都會被找出，env 傳入的不算", () => {
  const bad = "steps:\n  - name: a\n    run: echo ${{ github.head_ref }}\n  - name: b\n    run: |\n      echo ok\n      echo ${{ github.event.pull_request.title }}\n  - name: c\n    env:\n      H: ${{ github.head_ref }}\n    run: echo \"$H\"\n";
  assert.deepEqual(untrustedInRun(bad), [3, 7]);
});
test("verify.yml 的 run 指令沒有直接嵌入不受信任的欄位，分支名經環境變數 HEAD_REF 傳入", () => {
  const y = fs.readFileSync(path.join(__dirname, "..", "workflows", "verify.yml"), "utf8");
  assert.deepEqual(untrustedInRun(y), [], "這些行直接嵌入了不受信任的欄位");
  assert.match(y, /HEAD_REF: \$\{\{ github\.head_ref \}\}/);
});
