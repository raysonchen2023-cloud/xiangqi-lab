// check-text.cjs 的自我測試（W36 審查 #2-3）：在暫存 git 倉庫放好檔與壞檔，確認壞檔會被擋、好檔不會被誤擋。
// 用法：node --test .github/scripts/test-check-text.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");
const SCRIPT = path.join(__dirname, "check-text.cjs");

function repo(files) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-check-text-"));
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "core.autocrlf=false", ...a], { cwd: d });
  git("init", "-q");
  fs.writeFileSync(path.join(d, "base.txt"), "base\n");
  git("add", "-A"); git("commit", "-q", "-m", "base");
  for (const [name, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(d, name)), { recursive: true });
    fs.writeFileSync(path.join(d, name), body);
  }
  git("add", "-A"); git("commit", "-q", "-m", "change");
  return d;
}
const run = d => spawnSync(process.execPath, [SCRIPT, "HEAD~1"], { cwd: d, encoding: "utf8" });

test("壞檔會被擋：中文檔名裡的控制字元、CRLF／LF 混用、iOS 專案檔裡的控制字元", () => {
  const d = repo({
    "中文/棋盤.js": "const a=1;\x07\n",
    "說明.md": "第一行\r\n第二行\n",
    "App.xcodeproj/project.pbxproj": "// x\x01\n",
    "乾淨.js": "const ok=1;\n",
  });
  const r = run(d);
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /中文\/棋盤\.js：有控制字元 0x07/);
  assert.match(r.stdout, /說明\.md：CRLF 1 行與 LF 1 行混用/);
  assert.match(r.stdout, /project\.pbxproj：有控制字元 0x01/);
  assert.doesNotMatch(r.stdout, /乾淨\.js：/);
  assert.match(r.stdout, /檢查了 4 個改到的文字檔/);
});

test("好檔不會被誤擋：中文檔名、全 CRLF、全 LF、Tab 都可以", () => {
  const d = repo({
    "中文/首頁.js": "const a=1;\n\tconst b=2;\n",
    "Windows.bat": "@echo off\r\necho ok\r\n",
    "腳本.sh": "#!/bin/sh\necho ok\n",
  });
  const r = run(d);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /檢查了 3 個改到的文字檔/);
  assert.match(r.stdout, /✔ 沒有控制字元，也沒有換行混用/);
});
