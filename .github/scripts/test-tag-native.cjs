// 打原生版本標籤 tag-native.cjs 的自我測試（W69 流程盤點中 14）
//   判斷用假的標籤表與變體清單；命令列開暫存 git 倉庫（加一個暫存的空遠端）實際打標籤、推送；另外檢查 tag-native.yml 的寫法。不連網。
// 用法：node --test .github/scripts/test-tag-native.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const { decide, run } = require("./tag-native.cjs");

const H = "a".repeat(40), W = "b".repeat(40), V = "d".repeat(40), X = "c".repeat(40), P = "e".repeat(64);
const MF = (o) => [{ path: "source/xiangqi-android-variants/mini-26112301/VARIANT-MANIFEST.json", json: Object.assign({ versionCode: 26112301, webCommit: W, siteVersion: "20261123-0900" }, o) }];
/* 祖先關係：W（網頁標籤）→ V（變體提交）→ H（main 最新） */
const ANC = (a, b) => a === b || (a === W && (b === V || b === H)) || (a === V && b === H);
const D = (o) => decide(Object.assign({ platform: "android", build: "26112301", web: "20261123-0900", variantCommit: V, pkgSha256: P, tags: { "web-20261123-0900": W }, head: H, isAncestor: ANC, manifests: MF() }, o));

test("判斷：標籤打在網頁標籤的提交（不是 main 最新）；Android 核對變體清單；iOS 只核對變體提交的位置", () => {
  assert.deepEqual(D({}), { action: "create", name: "android-26112301", base: W, webTag: "web-20261123-0900", manifest: "source/xiangqi-android-variants/mini-26112301/VARIANT-MANIFEST.json" });
  const i = D({ platform: "ios", build: "57", manifests: [] });
  assert.equal(i.action, "create"); assert.equal(i.name, "ios-57"); assert.equal(i.base, W); assert.equal(i.manifest, null);
});

test("判斷：平台、建置號、網頁版號、變體提交、安裝包雜湊格式不對 → 不打（擋住拿輸入夾帶指令或亂取標籤名）", () => {
  for (const platform of ["", "web", "Android", "android;x", undefined]) assert.equal(D({ platform }).action, "error", JSON.stringify(platform));
  for (const build of ["", "0", "012", "1.2", "26112301 ", "1e5", "12345678901", "-1", "1;rm", "\n1", undefined]) assert.equal(D({ build }).action, "error", JSON.stringify(build));
  for (const web of ["", "20261123", "20261123-090", "2026-11-23", "20261123-0900x", "x20261123-0900", undefined]) assert.equal(D({ web }).action, "error", JSON.stringify(web));
  for (const variantCommit of ["", "d".repeat(39), "D".repeat(40), "d".repeat(41), "HEAD", "main", "--all", undefined]) assert.match(D({ variantCommit }).why || "", /變體提交要寫完整 40 碼/, JSON.stringify(variantCommit));
  for (const pkgSha256 of ["", "e".repeat(63), "E".repeat(64), "e".repeat(65), undefined]) assert.match(D({ pkgSha256 }).why || "", /SHA-256/, JSON.stringify(pkgSha256));
});

test("判斷：網頁標籤不存在、變體提交不在 main、不是網頁標籤的後代 → 不打", () => {
  assert.match(D({ tags: {} }).why, /找不到網頁標籤 web-20261123-0900/);
  assert.match(D({ isAncestor: (a, b) => ANC(a, b) && !(a === V && b === H) }).why, /不在 main 的歷史裡/);
  assert.match(D({ isAncestor: (a, b) => ANC(a, b) && !(a === W && b === V) }).why, /不是網頁標籤.*的後代/);
});

test("判斷（Android）：變體清單找不到、有兩份、webCommit 或 siteVersion 對不上 → 不打", () => {
  assert.match(D({ manifests: [] }).why, /正好 1 份，找到 0 份/);
  assert.match(D({ manifests: MF({ versionCode: 26112302 }) }).why, /找到 0 份/);
  assert.match(D({ manifests: [...MF(), ...MF()] }).why, /找到 2 份/);
  assert.match(D({ manifests: [{ path: "x", json: null }] }).why, /找到 0 份/, "讀不到或不是 JSON 不算");
  assert.match(D({ manifests: MF({ webCommit: X }) }).why, /webCommit.*不是網頁標籤/);
  assert.match(D({ manifests: MF({ siteVersion: "20261123-0901" }) }).why, /siteVersion/);
  assert.match(D({ manifests: MF({ siteVersion: undefined }) }).why, /siteVersion/, "siteVersion 必填（iMac Claude 2 審查）");
});

test("判斷：同名標籤已在網頁標籤的提交 → 不動；指向別的提交（包括 main 最新）→ 不覆寫", () => {
  assert.deepEqual(D({ tags: { "web-20261123-0900": W, "android-26112301": W } }), { action: "skip", name: "android-26112301", why: "標籤已經在網頁標籤的提交" });
  for (const t of [X, H]) { const e = D({ tags: { "web-20261123-0900": W, "android-26112301": t } }); assert.equal(e.action, "error"); assert.match(e.why, /不覆寫/) }
});

test("主流程：有 XQ_PUSH_TOKEN 時，只有推送那一次帶 http.extraheader（token 不寫進 git 設定、其他 git 呼叫不帶）", () => {
  const calls = [], W2 = "b".repeat(40), V2 = "d".repeat(40);
  const git = (...a) => {
    calls.push(a);
    if (a[0] === "rev-parse") return "a".repeat(40) + "\n";
    if (a[0] === "tag" && a[1] === "-l") return "web-20261123-0900 " + "9".repeat(40) + " " + W2 + "\n";
    if (a[0] === "ls-tree") return "source/xiangqi-android-variants/m/VARIANT-MANIFEST.json\n";
    if (a[0] === "show") return JSON.stringify({ versionCode: 26112301, webCommit: W2, siteVersion: "20261123-0900" });
    return "";
  };
  const env = { XQ_PLATFORM: "android", XQ_BUILD: "26112301", XQ_WEB: "20261123-0900", XQ_VARIANT_COMMIT: V2, XQ_PKG_SHA256: "e".repeat(64), XQ_PUSH_TOKEN: "假的token" };
  assert.equal(run({ env, git, log: () => {}, err: () => {} }), 0);
  const push = calls.filter((a) => a.includes("push")), others = calls.filter((a) => !a.includes("push"));
  assert.equal(push.length, 1);
  assert.equal(push[0][push[0].indexOf("-c") + 1], "http.https://github.com/.extraheader=AUTHORIZATION: basic " + Buffer.from("x-access-token:假的token").toString("base64"));
  assert.ok(others.every((a) => !a.join(" ").includes("extraheader") && !a.join(" ").includes("假的token")), "其他 git 呼叫不帶 token");
  assert.ok(!calls.some((a) => a[0] === "config"), "不寫 git 設定");
});

test("主流程：在 GitHub Actions 裡不是 main 就拒絕；讀不到 git → 2", () => {
  const errs = [];
  assert.equal(run({ env: { GITHUB_ACTIONS: "true", GITHUB_REF: "refs/heads/改過的分支", XQ_PLATFORM: "android" }, git: () => { throw new Error("不該讀 git") }, err: (s) => errs.push(s), log: () => {} }), 1);
  assert.match(errs.join(""), /只在 main 上打/);
  assert.equal(run({ env: {}, git: () => { throw new Error("壞了") }, err: () => {}, log: () => {} }), 2);
});

test("命令列：暫存倉庫實際打標籤（打在網頁標籤、說明含變體提交與雜湊）並推到遠端；重跑不動；清單對不上、變體提交不在 main、輸入不對 → 1", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-tagnative-")), remote = path.join(d, "remote.git"), work = path.join(d, "work");
  try {
    const g = (cwd, ...a) => cp.execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "core.autocrlf=false", ...a], { cwd, encoding: "utf8" });
    const put = (f, s) => { fs.mkdirSync(path.dirname(path.join(work, f)), { recursive: true }); fs.writeFileSync(path.join(work, f), s) };
    const commit = (m) => { g(work, "add", "-A"); g(work, "commit", "-q", "-m", m); return g(work, "rev-parse", "HEAD").trim() };
    cp.execFileSync("git", ["init", "-q", "--bare", remote]); fs.mkdirSync(work); g(work, "init", "-q"); g(work, "remote", "add", "origin", remote);
    put("a.txt", "1\n"); const webC = commit("網頁發布"); g(work, "tag", "-a", "web-20261123-0900", "-m", "web");
    put("b.txt", "別的網頁改動\n"); commit("建包後 main 又合併了別的");
    const MP = "source/xiangqi-android-variants/mini-26112301/VARIANT-MANIFEST.json";
    put(MP, JSON.stringify({ versionCode: 26112301, webCommit: webC, siteVersion: "20261123-0900" }) + "\n"); const varC = commit("補原生差異");
    put("c.txt", "又一個\n"); commit("之後的提交");
    const env = (o) => Object.assign({}, process.env, { GIT_AUTHOR_NAME: "t", GIT_AUTHOR_EMAIL: "t@example.com", GIT_COMMITTER_NAME: "t", GIT_COMMITTER_EMAIL: "t@example.com", XQ_PLATFORM: "android", XQ_BUILD: "26112301", XQ_WEB: "20261123-0900", XQ_VARIANT_COMMIT: varC, XQ_PKG_SHA256: P, GITHUB_ACTIONS: "", GITHUB_REF: "" }, o);
    const cli = (o, ...a) => cp.spawnSync(process.execPath, [path.join(__dirname, "tag-native.cjs"), ...a], { cwd: work, env: env(o), encoding: "utf8" });
    let r = cli({}, "--dry-run"); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /試跑/);
    assert.equal(g(work, "tag", "-l", "android-*").trim(), "", "試跑不打");
    r = cli({}); assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.equal(g(remote, "rev-parse", "android-26112301^{commit}").trim(), webC, "標籤打在網頁標籤的提交、推到遠端（不是 main 最新）");
    const note = g(work, "tag", "-l", "-n20", "android-26112301");
    assert.ok(note.includes(varC) && note.includes(MP) && note.includes(P), "說明寫上變體提交、清單路徑、安裝包雜湊：" + note);
    r = cli({}); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /已經在網頁標籤的提交/);
    r = cli({ XQ_BUILD: "26112302" }); assert.equal(r.status, 1); assert.match(r.stderr, /找到 0 份/);
    g(work, "checkout", "-q", "-b", "旁支", webC); put("d.txt", "x\n"); const side = commit("不在 main"); g(work, "checkout", "-q", "-");
    r = cli({ XQ_BUILD: "26112303", XQ_VARIANT_COMMIT: side }); assert.equal(r.status, 1); assert.match(r.stderr, /不在 main 的歷史裡/);
    r = cli({ XQ_WEB: "20261124-0900" }); assert.equal(r.status, 1); assert.match(r.stderr, /找不到網頁標籤/);
    r = cli({ XQ_PLATFORM: "ios", XQ_BUILD: "7;echo x" }); assert.equal(r.status, 1); assert.match(r.stderr, /建置號格式不對/);
    r = cli({ XQ_VARIANT_COMMIT: "--all" }); assert.equal(r.status, 1); assert.match(r.stderr, /40 碼/);
    r = cli({ GITHUB_ACTIONS: "true", GITHUB_REF: "refs/heads/feature" }); assert.equal(r.status, 1); assert.match(r.stderr, /只在 main/);
    assert.equal(g(remote, "tag", "-l").split("\n").filter(Boolean).join(","), "android-26112301", "遠端只多了這一個標籤");
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("〔原始碼〕tag-native.yml：只能手動觸發、只在 main 跑、五個輸入都經環境變數不嵌進指令、先跑自我測試", () => {
  const Y = fs.readFileSync(path.join(__dirname, "..", "workflows", "tag-native.yml"), "utf8");
  const on = Y.slice(Y.indexOf("\non:"), Y.indexOf("\npermissions:"));
  assert.match(on, /workflow_dispatch:/); assert.doesNotMatch(on, /\n  (push|pull_request|pull_request_target|schedule|workflow_run):/, "只准手動觸發");
  for (const k of ["platform", "build", "web", "variant_commit", "pkg_sha256"]) assert.match(on, new RegExp("\\n      " + k + ":\\n[^]*?required: true"), k + " 要是必填輸入");
  assert.match(Y, /\n    if: github\.ref == 'refs\/heads\/main'\n/, "job 只在 main");
  const runs = Y.split("\n").filter((l) => /^\s+run:/.test(l)); assert.ok(runs.length >= 3);
  for (const line of runs) assert.doesNotMatch(line, /\$\{\{/, "run 裡不准嵌入欄位：" + line);
  assert.equal((Y.match(/\$\{\{/g) || []).length, 6, "${{ }} 只准出現在最後一步：5 個輸入＋推送用的 token（job 的 if 不用 ${{ }}）");
  assert.match(Y, /uses: actions\/checkout@v4\n        with:\n          fetch-depth: 0\n          persist-credentials: false/, "checkout 不保存寫入憑證（PR #63 Codex 審查）");
  assert.equal(Y.indexOf("github.token"), Y.lastIndexOf("github.token"), "token 只出現一次");
  assert.ok(Y.indexOf("github.token") > Y.lastIndexOf("      - name:"), "token 只給最後推標籤那一步");
  const step = Y.slice(Y.lastIndexOf("      - name:"));
  for (const [e, k] of [["XQ_PLATFORM", "platform"], ["XQ_BUILD", "build"], ["XQ_WEB", "web"], ["XQ_VARIANT_COMMIT", "variant_commit"], ["XQ_PKG_SHA256", "pkg_sha256"]]) assert.match(step, new RegExp(e + ": \\$\\{\\{ inputs\\." + k + " \\}\\}"));
  assert.match(step, /run: node \.github\/scripts\/tag-native\.cjs\n?$/);
  assert.ok(Y.indexOf("test-tag-native.cjs") > 0 && Y.indexOf("test-tag-native.cjs") < Y.lastIndexOf("tag-native.cjs"), "打標籤前先跑自我測試");
  assert.match(Y, /\npermissions:\n  contents: write\n/);
});
