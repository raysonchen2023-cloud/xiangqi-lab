// ci-mode.cjs 的自我測試（W36）：分支名與事件對應到正確的檢查模式。
// 用法：node --test .github/scripts/test-ci-mode.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { execFileSync } = require("child_process"), path = require("path");
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
test("命令列輸出給 $GITHUB_OUTPUT 的格式：只有一行 mode=…", () => {
  const run = (...a) => execFileSync(process.execPath, [path.join(__dirname, "ci-mode.cjs"), ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  assert.equal(run("release/x", "pull_request"), "mode=release\n");
  assert.equal(run("w37/x", "pull_request"), "mode=feature\n");
  assert.equal(run("w37/$(echo hacked)", "pull_request"), "mode=feature\n");
});
