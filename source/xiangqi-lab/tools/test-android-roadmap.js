// 評比第 14 輪 F3（加 X1、X3）：Android 與 F-Droid 路線圖、可重現驗證包
//   verify-all.js：對假倉庫跑四步，看紀錄（版本、雜湊、每一步結果）、失敗與略過、路徑遮蔽、結束代碼
//   xiangqi-android/scripts/check-skeleton.js：F-Droid 建置設定草稿的欄位、Gradle 不能有 Google 服務
//   xiangqi-android/scripts/make-www.js：只用公開倉庫做網頁成品、check-build 不過就停
//   android.md、foss.md 兩份一致；驗證紀錄檔存在
// 全部用假資料夾，不連網、不開瀏覽器。用法：node --test xiangqi-lab/tools/test-android-roadmap.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const VA = require("./verify-all.js");
const LAB = path.join(__dirname, ".."), ROOT = path.join(LAB, ".."), AND = path.join(ROOT, "xiangqi-android");
const SK = require(path.join(AND, "scripts", "check-skeleton.js")), MW = require(path.join(AND, "scripts", "make-www.js"));
const sha1_12 = b => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12), sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "xqandroid-"));
const clean = d => fs.rmSync(d, { recursive: true, force: true });
const put = (d, files) => { for (const [f, c] of Object.entries(files)) { const p = path.join(d, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c) } return d };
const CTL = /[\u0000-\u0008\u000b-\u001f\u007f]/;

/* 假的公開倉庫：三個成品互相一致；check-build／run-tests 是假的（看旗標檔決定成敗，並印出一個「使用者資料夾」路徑） */
function fakeRepo(home) {
  const d = tmp(), V = "20990101-0000";
  const html = `<!doctype html>\n<script>window.XQ_OFFLINE=true;window.XQ_BUILD="${V}";</script>\n`, sw = `const VERSION="${V}";\n`;
  const echo = path.join(home || os.tmpdir(), "某個資料夾", "x.txt");
  const fake = (name, ok) => `const fs=require("fs"),p=require("path");console.log(${JSON.stringify(ok)});console.log("讀 "+${JSON.stringify(echo)});process.exit(fs.existsSync(p.join(__dirname,"..","FAIL-${name}"))?1:0);\n`;
  put(d, {
    "index.html": html, "sw.js": sw, "core.js": "var core=1;\n", "engine/pikafish.wasm": Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]),
    "release.json": JSON.stringify({ version: V, html: sha1_12(Buffer.from(html)), sw: sha1_12(Buffer.from(sw)) }),
    "source/check-build.js": fake("check-build", "✔ 一致（假的）"), "source/run-tests.js": fake("run-tests", "合計 3/3（假的）"),
    "source/xiangqi-db/m/00-util.js": "// util\n", "data/a.json": "{}\n", ".github/x.yml": "x: 1\n",
  });
  return { d, V, html, echo };
}
const NO_REC = d => path.join(d, "沒有這個紀錄.json");

test("驗證包：假倉庫四步——三步通過、引擎沒有建置紀錄就「略過」並寫原因，代碼 0；紀錄有版本、雜湊、樹雜湊", () => {
  const { d, V, html } = fakeRepo();
  try {
    const r = VA.verifyAll({ repo: d, record: NO_REC(d), now: "2026-11-13T00:00:00Z" });
    assert.equal(r.code, 0, r.text);
    assert.deepEqual(r.results.map(x => x.status), ["通過", "通過", "略過", "通過"]);
    assert.match(r.text, /執行時間：2026-11-13T00:00:00\.000Z（UTC）＝ 2026-11-13 08:00:00（臺灣時間）/);
    assert.match(r.text, new RegExp(`release\\.json：版本 ${V}`));
    assert.ok(r.text.includes("index.html  " + sha256(Buffer.from(html))), "要列 index.html 的 SHA-256");
    assert.match(r.text, /source\/ 資料夾：3 個檔，樹雜湊 SHA-256 [0-9a-f]{64}/);
    assert.match(r.text, /第 2 步 release-verify：通過/);
    assert.match(r.text, /第 3 步 pikafish-verify：略過\n[\s\S]*?略過原因：找不到 Pikafish 建置紀錄/);
    assert.match(r.text, /總結：4 步，通過 3、失敗 0、略過 1（略過：pikafish-verify）\n✔ 跑了的都通過；有略過的步驟/);
    assert.ok(!r.text.includes("\r") && !CTL.test(r.text.replace(/\t/g, "")), "紀錄不能有 CR 或控制字元");
  } finally { clean(d) }
});

test("驗證包：測試失敗、release.json 被改都會讓總結變失敗、代碼 1；CRLF 的倉庫會印 autocrlf 提示", () => {
  const { d, html } = fakeRepo();
  try {
    put(d, { "FAIL-run-tests": "" });
    let r = VA.verifyAll({ repo: d, record: NO_REC(d) });
    assert.equal(r.code, 1);
    assert.match(r.text, /第 4 步 run-tests：失敗（結束代碼 1/);
    assert.match(r.text, /（失敗：run-tests）[\s\S]*✘ 有核對沒通過/);
    fs.rmSync(path.join(d, "FAIL-run-tests"));
    put(d, { "index.html": html.split("\n").join("\r\n") });
    r = VA.verifyAll({ repo: d, record: NO_REC(d), skip: ["run-tests"] });
    assert.equal(r.code, 1);
    assert.equal(r.results[1].status, "失敗");
    assert.match(r.text, /✘ index\.html SHA-1 前 12 碼 [0-9a-f]{12}，release\.json 寫 [0-9a-f]{12}：不一致/);
    assert.match(r.text, /提示：index\.html 是 CRLF 換行[\s\S]*core\.autocrlf=false/);
    assert.match(r.text, /第 4 步 run-tests：略過\n[\s\S]*?略過原因：指令要求略過/);
  } finally { clean(d) }
});

test("驗證包：指令列——--out 寫 LF 檔、使用者資料夾和倉庫路徑都換成佔位字；--only 只跑指定步驟；不認得的步驟、找不到倉庫代碼 2", () => {
  const home = os.homedir(), { d, echo } = fakeRepo(home), out = path.join(d, "..", path.basename(d) + "-log.txt");
  try {
    const run = args => cp.spawnSync(process.execPath, [path.join(__dirname, "verify-all.js"), ...args], { encoding: "utf8" });
    let r = run(["--repo", d, "--record", NO_REC(d), "--out", out, "--note", "測試用的假倉庫"]);
    assert.equal(r.status, 0, r.stdout);
    const t = fs.readFileSync(out, "utf8");
    assert.ok(!t.includes("\r") && !CTL.test(t.replace(/\t/g, "")));
    assert.ok(!t.includes(home) && !t.includes(d) && !t.includes(path.dirname(echo)), "路徑要遮掉");
    assert.match(t, /倉庫資料夾：<倉庫資料夾>/);
    assert.match(t, /讀 <使用者資料夾>[\\/]某個資料夾[\\/]x\.txt/);
    assert.match(t, /說明：測試用的假倉庫/);
    assert.match(t, /指令（在倉庫資料夾執行）：node source\/check-build\.js/);
    r = run(["--repo", d, "--only", "check-build"]);
    assert.equal(r.status, 0);
    assert.match(r.stdout, /通過 1、失敗 0、略過 3/);
    assert.equal(run(["--repo", d, "--only", "lint"]).status, 2);
    assert.equal(run(["--repo", path.join(d, "沒有")]).status, 2);
  } finally { clean(d); fs.rmSync(out, { force: true }) }
});

test("驗證包：source/ 樹雜湊——同內容同雜湊、改一個字或改檔名就變", () => {
  const a = put(tmp(), { "x/a.js": "1", "b.js": "2" }), b = put(tmp(), { "b.js": "2", "x/a.js": "1" });
  try {
    assert.deepEqual(VA.treeHash(a), VA.treeHash(b));
    put(b, { "x/a.js": "3" });
    assert.notEqual(VA.treeHash(a).sha256, VA.treeHash(b).sha256);
    put(b, { "x/a.js": "1" }); fs.renameSync(path.join(b, "b.js"), path.join(b, "c.js"));
    assert.notEqual(VA.treeHash(a).sha256, VA.treeHash(b).sha256);
  } finally { clean(a); clean(b) }
});

test("F-Droid 建置設定草稿：欄位齊全、授權 GPL-3.0-or-later、反特性有 NonFreeAssets 和 NonFreeNet、版本號一致", () => {
  const f = path.join(AND, "fdroid", "com.raysonchen.xiangqiqianqiu.yml"), y = fs.readFileSync(f, "utf8");
  const C = SK.checkFdroidYml(y), bad = C.filter(c => !c.ok);
  assert.deepEqual(bad, [], JSON.stringify(bad));
  const p = SK.parseFdroidYml(y);
  for (const k of SK.FDROID_REQUIRED) assert.ok(k in p.top, "缺 " + k);
  assert.ok(p.anti.includes("NonFreeAssets") && p.anti.includes("NonFreeNet"));
  assert.equal(p.builds[0].versionCode, p.top.CurrentVersionCode);
  assert.match(y, /AntiFeatures:\n {2}NonFreeAssets:\n {4}en-US: /, "反特性要附原因");
  assert.ok(!/com\.google\.gms|firebase/i.test(y));
});

test("F-Droid 建置設定檢查會抓到：缺授權、tab 縮排、versionCode 超過上限、少了 NonFreeNet、目前版本跟建置區塊不一致", () => {
  const y = fs.readFileSync(path.join(AND, "fdroid", "com.raysonchen.xiangqiqianqiu.yml"), "utf8");
  const ids = s => SK.checkFdroidYml(s).filter(c => !c.ok).map(c => c.id);
  assert.ok(ids(y.replace(/^License:.*\n/m, "")).includes("yml.required"));
  assert.ok(ids(y.replace("License: GPL-3.0-or-later", "License: MIT")).includes("yml.license"));
  assert.ok(ids(y.replace("\n  - Games", "\n\t- Games")).includes("yml.format"));
  assert.ok(ids(y.split("26111304").join("2611130452")).includes("yml.versionCode"));
  assert.ok(ids(y.replace(/ {2}NonFreeNet:\n/, "  Ads:\n")).includes("yml.anti"));
  assert.ok(ids(y.replace(/^CurrentVersionCode: .*$/m, "CurrentVersionCode: 1")).includes("yml.current"));
});

test("Android 骨架檢查：真的骨架沒有 ✘；假專案放了 google-services、沒關相依資訊區塊、webkit 太舊、有 .so 就會被抓", () => {
  const real = SK.checkAll(AND).filter(c => !c.ok && c.level === "fail");
  assert.deepEqual(real, [], JSON.stringify(real));
  const d = put(tmp(), {
    "capacitor.config.json": JSON.stringify({ appId: "x.y", server: { androidScheme: "http" } }),
    "android/build.gradle": "buildscript { dependencies { classpath 'com.google.gms:google-services:4.4.4' } }\n",
    "android/variables.gradle": "ext {\n    androidxWebkitVersion = '1.14.0'\n}\n",
    "android/app/build.gradle": "dependencies { implementation 'com.google.firebase:firebase-analytics:1' }\n",
    "android/app/libs/x.so": "ELF", "fdroid/x.yml": "License: MIT\n",
  });
  try {
    const bad = SK.checkAll(d).filter(c => !c.ok && c.level === "fail").map(c => c.id);
    for (const id of ["gradle.nonfree", "gradle.depinfo", "gradle.webkit", "native.allowlist", "native.dip", "native.swclient", "config.origin", "binaries", "yml.required", "yml.license"]) assert.ok(bad.includes(id), id + " 要被抓到：" + bad.join(","));
  } finally { clean(d) }
});

test("Android 骨架檢查 native.swclient：沒替 Service Worker 設 ServiceWorkerClient、或隔離標頭寫了兩份都會被抓；正確寫法通過", () => {
  const J = "android/app/src/main/java/x/y/";
  const client = 'class XQWebViewClient { static { h.put("Document-Isolation-Policy", "isolate-and-require-corp"); } static Object addIsolationHeaders(Object q, Object r) { return r; } }\n';
  const good = 'class MainActivity { void load() { ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() { Object f(Object q) { return XQWebViewClient.addIsolationHeaders(q, null); } }); p.setCrossOriginIsolatedAllowlist(s); WebViewFeature.CROSS_ORIGIN_ISOLATED_ALLOWLIST; } }\n';
  const cases = [
    [good, true, null],
    [good.replace(/ServiceWorkerController[^;]*;/, ";"), false, null],
    [good.replace("XQWebViewClient.addIsolationHeaders(q, null)", "local.shouldInterceptRequest(q)"), false, null],
    [good.replace("void load() {", 'void load() { h.put("Document-Isolation-Policy", "isolate-and-require-corp");'), false, /寫了 2 份/],
  ];
  for (const [main, ok, msg] of cases) {
    const d = put(tmp(), { [J + "MainActivity.java"]: main, [J + "XQWebViewClient.java"]: client });
    try {
      const c = SK.checkAll(d).find(x => x.id === "native.swclient");
      assert.ok(c, "要有 native.swclient 這一項");
      assert.equal(c.ok, ok, main.slice(0, 120));
      if (msg) assert.match(c.msg, msg);
    } finally { clean(d) }
  }
});

test("make-www：只用公開倉庫、不帶 .github 和 source/、native-build.json 不寫時間；check-build 不過就停", () => {
  const { d, V } = fakeRepo(), out = tmp();
  try {
    const m = MW.makeWww({ repo: d, into: out, log: () => { } });
    assert.equal(m.siteVersion, V);
    assert.ok(fs.existsSync(path.join(out, "index.html")) && fs.existsSync(path.join(out, "data", "a.json")));
    assert.ok(!fs.existsSync(path.join(out, "source")) && !fs.existsSync(path.join(out, ".github")));
    const nb = fs.readFileSync(path.join(out, "native-build.json"), "utf8");
    assert.ok(!/\d{4}-\d{2}-\d{2}T/.test(nb), "不能寫建置時間（F-Droid 要能逐位元重現）");
    const again = tmp();
    MW.makeWww({ repo: d, into: again, log: () => { } });
    assert.equal(fs.readFileSync(path.join(again, "native-build.json"), "utf8"), nb, "兩次做出來要一樣");
    clean(again);
    put(d, { "FAIL-check-build": "" });
    assert.throws(() => MW.makeWww({ repo: d, into: out, log: () => { } }), /check-build 沒通過/);
    assert.throws(() => MW.makeWww({ repo: d, into: d, check: false, log: () => { } }), /不能是倉庫本身/);
  } finally { clean(d); clean(out) }
});

test("〔混合〕android.md、foss.md 兩份逐字相同、LF；路線圖有兩條路、反特性、要決定的事；foss.md 連到 android.md 和驗證紀錄", () => {
  for (const f of ["android.md", "foss.md"]) {
    const a = fs.readFileSync(path.join(ROOT, "xiangqi-db", "art", "docs", f)), b = fs.readFileSync(path.join(LAB, "site", "data", "docs", f));
    assert.ok(a.equals(b), f + " 兩份要逐字相同");
    assert.ok(!a.includes(13) && !CTL.test(a.toString("utf8").replace(/\t/g, "")), f + " 要 LF、沒有控制字元");
  }
  const A = fs.readFileSync(path.join(ROOT, "xiangqi-db", "art", "docs", "android.md"), "utf8"), F = fs.readFileSync(path.join(ROOT, "xiangqi-db", "art", "docs", "foss.md"), "utf8");
  for (const h of ["## Google Play 路線", "## F-Droid 路線", "## 要做的事與順序", "## 要開發者決定的事", "## 引擎多執行緒", "## 可重現驗證包", "## 限制"]) assert.ok(A.includes(h), "android.md 缺 " + h);
  for (const k of ["NonFreeAssets", "NonFreeNet", "Tracking", "setCrossOriginIsolatedAllowlist", "Document-Isolation-Policy", "verify-all.js"]) assert.ok(A.includes(k), "android.md 沒提 " + k);
  assert.ok(F.includes("[android.md](android.md)") && F.includes("verification-log-20261113-0452.txt") && F.includes("### 可重現驗證包 verify-all.js"));
  /* 11/13 0452 的驗證紀錄只在開發者電腦的 opensource-stage/（公開倉庫沒有）：有才檢查內容；連結文字上面已經查過（W69 第 8 項，11/22） */
  const LOGF = path.join(LAB, "opensource-stage", "verification-log-20261113-0452.txt");
  if (!fs.existsSync(LOGF)) return;
  const log = fs.readFileSync(LOGF, "utf8");
  assert.match(log, /總結：4 步，通過 4、失敗 0、略過 0\n✔ 全部通過\n$/);
  assert.ok(!log.includes(os.homedir()) && !log.includes(os.homedir().split("\\").join("/")) && !log.includes("\r"), "紀錄不能有使用者資料夾路徑或 CR");
});
