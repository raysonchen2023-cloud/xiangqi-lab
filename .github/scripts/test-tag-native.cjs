// 打原生版本標籤 tag-native.cjs 的自我測試（W69 流程盤點中 14）
//   判斷用假的標籤表；命令列開暫存 git 倉庫（加一個暫存的空遠端）實際打標籤、推送；另外檢查 tag-native.yml 的寫法。不連網。
// 用法：node --test .github/scripts/test-tag-native.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const { decide, run } = require("./tag-native.cjs");

const H = "a".repeat(40), W = "b".repeat(40), X = "c".repeat(40);
const D = (o) => decide(Object.assign({ platform: "android", build: "26112301", web: "20261123-0900", tags: { "web-20261123-0900": W }, head: H, isAncestor: (a, b) => a === W && b === H }, o));

test("判斷：網頁標籤存在、是 main 最新提交的祖先 → 打 android-<code>／ios-<build>", () => {
  assert.deepEqual(D({}), { action: "create", name: "android-26112301", base: W, webTag: "web-20261123-0900" });
  assert.equal(D({ platform: "ios", build: "57" }).name, "ios-57");
});

test("判斷：平台、建置號、網頁版號格式不對 → 不打（擋住拿輸入夾帶指令或亂取標籤名）", () => {
  for (const platform of ["", "web", "Android", "android;x", undefined]) assert.equal(D({ platform }).action, "error", JSON.stringify(platform));
  for (const build of ["", "0", "012", "1.2", "26112301 ", "1e5", "12345678901", "-1", "1;rm", "\n1", undefined]) assert.equal(D({ build }).action, "error", JSON.stringify(build));
  for (const web of ["", "20261123", "20261123-090", "2026-11-23", "20261123-0900x", "x20261123-0900", undefined]) assert.equal(D({ web }).action, "error", JSON.stringify(web));
});

test("判斷：網頁標籤不存在、不是祖先 → 不打；同名標籤在這個提交 → 不動；指向別的提交 → 不覆寫", () => {
  assert.match(D({ tags: {} }).why, /找不到網頁標籤 web-20261123-0900/);
  assert.match(D({ isAncestor: () => false }).why, /不在 main 最新提交/);
  assert.deepEqual(D({ tags: { "web-20261123-0900": W, "android-26112301": H } }), { action: "skip", name: "android-26112301", why: "標籤已經在這個提交" });
  const e = D({ tags: { "web-20261123-0900": W, "android-26112301": X } });
  assert.equal(e.action, "error"); assert.match(e.why, /不覆寫/);
});

test("主流程：在 GitHub Actions 裡不是 main 就拒絕；讀不到 git → 2", () => {
  const errs = [];
  assert.equal(run({ env: { GITHUB_ACTIONS: "true", GITHUB_REF: "refs/heads/改過的分支", XQ_PLATFORM: "android", XQ_BUILD: "1", XQ_WEB: "20261123-0900" }, git: () => { throw new Error("不該讀 git") }, err: (s) => errs.push(s), log: () => {} }), 1);
  assert.match(errs.join(""), /只在 main 上打/);
  assert.equal(run({ env: {}, git: () => { throw new Error("壞了") }, err: () => {}, log: () => {} }), 2);
});

test("命令列：暫存倉庫實際打標籤並推到遠端；重跑不動；同號換提交不覆寫；網頁標籤不存在、輸入不對 → 1", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-tagnative-")), remote = path.join(d, "remote.git"), work = path.join(d, "work");
  try {
    const g = (cwd, ...a) => cp.execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "core.autocrlf=false", ...a], { cwd, encoding: "utf8" });
    cp.execFileSync("git", ["init", "-q", "--bare", remote]); fs.mkdirSync(work); g(work, "init", "-q"); g(work, "remote", "add", "origin", remote);
    fs.writeFileSync(path.join(work, "a.txt"), "1\n"); g(work, "add", "-A"); g(work, "commit", "-q", "-m", "網頁發布"); g(work, "tag", "-a", "web-20261123-0900", "-m", "web");
    fs.writeFileSync(path.join(work, "b.txt"), "2\n"); g(work, "add", "-A"); g(work, "commit", "-q", "-m", "補原生差異");
    const head = g(work, "rev-parse", "HEAD").trim();
    const env = (o) => Object.assign({}, process.env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com", XQ_PLATFORM: "android", XQ_BUILD: "26112301", XQ_WEB: "20261123-0900", GITHUB_ACTIONS: "", GITHUB_REF: "" }, o);
    const cli = (o, ...a) => cp.spawnSync(process.execPath, [path.join(__dirname, "tag-native.cjs"), ...a], { cwd: work, env: env(o), encoding: "utf8" });
    let r = cli({}, "--dry-run"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /試跑/);
    assert.equal(g(work, "tag", "-l", "android-*").trim(), "", "試跑不打");
    r = cli({}); assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(g(remote, "rev-parse", "android-26112301^{commit}").trim(), head, "標籤打在最新提交、推到遠端");
    assert.match(g(work, "tag", "-l", "-n9", "android-26112301"), /網頁基底 web-20261123-0900/);
    r = cli({}); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /已經在這個提交/);
    fs.writeFileSync(path.join(work, "c.txt"), "3\n"); g(work, "add", "-A"); g(work, "commit", "-q", "-m", "又一個提交");
    r = cli({}); assert.equal(r.status, 1); assert.match(r.stderr, /不覆寫/);
    assert.equal(g(remote, "rev-parse", "android-26112301^{commit}").trim(), head, "遠端的標籤沒被改");
    r = cli({ XQ_WEB: "20261124-0900" }); assert.equal(r.status, 1); assert.match(r.stderr, /找不到網頁標籤/);
    r = cli({ XQ_PLATFORM: "ios", XQ_BUILD: "7;echo x" }); assert.equal(r.status, 1); assert.match(r.stderr, /建置號格式不對/);
    r = cli({ GITHUB_ACTIONS: "true", GITHUB_REF: "refs/heads/feature" }); assert.equal(r.status, 1); assert.match(r.stderr, /只在 main/);
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("〔原始碼〕tag-native.yml：只能手動觸發、只在 main 跑、輸入經環境變數不嵌進指令、先跑自我測試", () => {
  const Y = fs.readFileSync(path.join(__dirname, "..", "workflows", "tag-native.yml"), "utf8");
  const on = Y.slice(Y.indexOf("\non:"), Y.indexOf("\npermissions:"));
  assert.match(on, /workflow_dispatch:/); assert.doesNotMatch(on, /\n  (push|pull_request|pull_request_target|schedule|workflow_run):/, "只准手動觸發");
  assert.match(Y, /\n    if: github\.ref == 'refs\/heads\/main'\n/, "job 只在 main");
  for (const line of Y.split("\n").filter((l) => /^\s+run:/.test(l) || /^\s{10}\S/.test(l) && !/:\s/.test(l))) assert.doesNotMatch(line, /\$\{\{/, "run 裡不准嵌入欄位：" + line);
  const step = Y.slice(Y.lastIndexOf("      - name:"));
  assert.match(step, /XQ_PLATFORM: \$\{\{ inputs\.platform \}\}/); assert.match(step, /XQ_BUILD: \$\{\{ inputs\.build \}\}/); assert.match(step, /XQ_WEB: \$\{\{ inputs\.web \}\}/);
  assert.match(step, /run: node \.github\/scripts\/tag-native\.cjs\n?$/);
  assert.ok(Y.indexOf("test-tag-native.cjs") > 0 && Y.indexOf("test-tag-native.cjs") < Y.lastIndexOf("tag-native.cjs"), "打標籤前先跑自我測試");
  assert.match(Y, /\npermissions:\n  contents: write\n/);
});
