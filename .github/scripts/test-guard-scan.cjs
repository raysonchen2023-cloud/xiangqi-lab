// guard-release-files.cjs 與 scan-changed.cjs 的自我測試（W36 第二輪審查）：在暫存 git 倉庫放各種改動，確認擋得住、不誤擋。
// 用法：node --test .github/scripts/test-guard-scan.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");
const GUARD = path.join(__dirname, "guard-release-files.cjs"), SCAN = path.join(__dirname, "scan-changed.cjs");
const OSS = path.join(__dirname, "..", "..", "source", "xiangqi-lab", "tools", "oss-scan.js");
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }); });

function repo(change) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-guard-")); made.push(d);
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.invalid", "-c", "core.autocrlf=false", ...a], { cwd: d });
  const put = (f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };
  git("init", "-q");
  for (const f of ["index.html", "sw.js", "release.json", "source/a.js", "data/x.json"]) put(f, "base\n");
  git("add", "-A"); git("commit", "-q", "-m", "base");
  change({ put, rm: f => fs.rmSync(path.join(d, f)), mv: (a, b) => { fs.mkdirSync(path.dirname(path.join(d, b)), { recursive: true }); git("mv", a, b); } });
  git("add", "-A"); git("commit", "-q", "-m", "change");
  return d;
}
const guard = d => spawnSync(process.execPath, [GUARD, "HEAD~1"], { cwd: d, encoding: "utf8" });
const scan = d => spawnSync(process.execPath, [SCAN, "HEAD~1", path.join(d, ".scan-tmp")], { cwd: d, encoding: "utf8", env: { ...process.env, OSS_SCAN: OSS } });

test("守門：只改 source/、.github/、releases/（含中文檔名）→ 通過", () => {
  const r = guard(repo(({ put }) => { put("source/a.js", "改了\n"); put(".github/x.yml", "a: 1\n"); put("releases/說明.md", "紀錄\n"); }));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /✔ 沒有動到會直接上線的網站檔/);
});
test("守門：改 index.html、sw.js、release.json、data/ → 擋下並逐一列出", () => {
  const r = guard(repo(({ put }) => { put("source/a.js", "改了\n"); put("index.html", "偷改\n"); put("sw.js", "偷改\n"); put("release.json", "{}\n"); put("data/x.json", "{}\n"); }));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  for (const f of ["index.html", "sw.js", "release.json", "data/x.json"]) assert.match(r.stdout, new RegExp("\\n  " + f.replace(".", "\\.")));
  assert.doesNotMatch(r.stdout, /\n  source\/a\.js/);
});
test("守門：刪除網站檔、把原始碼改名成網站檔、根目錄新增中文檔 → 都擋下", () => {
  for (const [name, ch, hit] of [
    ["刪除", ({ rm }) => rm("sw.js"), "sw.js"],
    ["改名搬到網站資料夾", ({ mv }) => mv("source/a.js", "engine/a.js"), "engine/a.js"],
    ["中文檔", ({ put }) => put("說明.md", "x\n"), "說明.md"],
  ]) { const r = guard(repo(ch)); assert.equal(r.status, 1, name + "：" + r.stdout); assert.match(r.stdout, new RegExp("\\n  " + hit.replace(".", "\\."))); }
});
test("私密掃描補強：PR 改到的 source/ 以外的檔有私鑰 → 擋下；乾淨 → 通過；沒改檔 → 略過", () => {
  const key = "-----BEGIN " + "RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA" + "x".repeat(60) + "\n-----END " + "RSA PRIVATE KEY-----\n";
  const bad = scan(repo(({ put }) => put("releases/筆記.txt", key)));
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  const ok = scan(repo(({ put }) => put("releases/筆記.txt", "沒有機密\n")));
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const none = scan(repo(({ rm }) => rm("data/x.json")));
  assert.equal(none.status, 0, none.stdout + none.stderr);
  assert.match(none.stdout, /沒有新增或修改的檔，略過/);
});
