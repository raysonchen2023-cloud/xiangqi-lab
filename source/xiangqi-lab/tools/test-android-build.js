// 評比第 15 輪 F3、F4：Android 原生編譯與可重現 debug build
//   xiangqi-android/scripts/repro-check.js：讀 APK（ZIP）、拿掉簽章區塊、比對兩個 APK、掃 Google 服務、清 build 連編兩次、寫建置紀錄
//   xiangqi-android/build-records/：debug 建置紀錄、工具鏈紀錄（版本、下載檔 SHA-256、來源只能是官方網址）
//   android.md 兩份逐字相同、寫的 APK 雜湊跟紀錄一致
//   11/13 Service Worker 標頭修法正式採用：原生碼共用一份標頭清單、建置紀錄換成修好後的 APK、android.md 寫驗證結果
//   11/13 外部可重建＋發布版：clean-rebuild.js（全新資料夾重建、比對 APK／AAB）、REBUILD.md、釘版本（JDK、build-tools、Gradle 相依驗證）、
//         release 設定（R8、vcsInfo、版本號規則、簽章只從倉庫外的檔讀）、乾淨環境重建紀錄
// 全部用假 APK、假 gradle，不連網、不開瀏覽器、不開模擬器、不真的跑 Gradle。用法：node --test xiangqi-lab/tools/test-android-build.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process"), crypto = require("crypto"), zlib = require("zlib");
const LAB = path.join(__dirname, ".."), ROOT = path.join(LAB, ".."), AND = path.join(ROOT, "xiangqi-android");
const RC = require(path.join(AND, "scripts", "repro-check.js"));
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "xqapk-"));
const clean = d => fs.rmSync(d, { recursive: true, force: true });
const CTL = /[\u0000-\u0008\u000b-\u001f\u007f]/;
const HEX64 = /^[0-9a-f]{64}$/;

/* 做一個假 APK：entries=[{name, data, method(0/8), dos}]，sig＝簽章區塊內容（Buffer；null＝沒有） */
function makeApk(entries, sig = null) {
  const locals = [], central = [];
  let off = 0;
  for (const e of entries) {
    const data = Buffer.isBuffer(e.data) ? e.data : Buffer.from(e.data), method = e.method == null ? 8 : e.method;
    const comp = method === 8 ? zlib.deflateRawSync(data) : data, name = Buffer.from(e.name, "utf8"), crc = zlib.crc32(data) >>> 0;
    const dos = e.dos == null ? ((1 << 5) | 1) * 65536 : e.dos, time = dos & 0xffff, date = dos >>> 16;
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(method, 8); lh.writeUInt16LE(time, 10); lh.writeUInt16LE(date, 12);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46);
    ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(method, 10); ch.writeUInt16LE(time, 12); ch.writeUInt16LE(date, 14);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(comp.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, name, comp); central.push(ch, name);
    off += 30 + name.length + comp.length;
  }
  let block = Buffer.alloc(0);
  if (sig) {
    const size = sig.length + 8 + 16, a = Buffer.alloc(8), b = Buffer.alloc(8);
    a.writeBigUInt64LE(BigInt(size)); b.writeBigUInt64LE(BigInt(size));
    block = Buffer.concat([a, sig, b, Buffer.from("APK Sig Block 42", "latin1")]);
  }
  const cd = Buffer.concat(central), eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(entries.length, 8); eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cd.length, 12); eocd.writeUInt32LE(off + block.length, 16);
  return Buffer.concat([...locals, block, cd, eocd]);
}
const BASE = () => [
  { name: "AndroidManifest.xml", data: "<manifest/>" },
  { name: "classes.dex", data: "dex\n035\0Lcom/raysonchen/xiangqiqianqiu/MainActivity;" },
  { name: "resources.arsc", data: Buffer.alloc(64, 7), method: 0 },
  { name: "res/layout/main.xml", data: "<x/>" },
  { name: "assets/public/index.html", data: "<!doctype html>象棋千秋" },
  { name: "assets/public/engine/pikafish.wasm", data: Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0]), method: 0 },
];

test("讀 APK：項目數、dex 雜湊、assets／資源分組雜湊；簽章區塊大小；不是 ZIP 會丟錯", () => {
  const apk = makeApk(BASE(), Buffer.alloc(100, 1)), s = RC.summarize(apk);
  assert.equal(s.entries, 6);
  assert.equal(s.bytes, apk.length);
  assert.equal(s.sha256, sha256(apk));
  assert.deepEqual(s.dex.map(d => d.name), ["classes.dex"]);
  assert.equal(s.dex[0].sha256, sha256(Buffer.from("dex\n035\0Lcom/raysonchen/xiangqiqianqiu/MainActivity;")));
  assert.equal(s.signingBlock, 100 + 8 + 8 + 16);
  assert.equal(s.v1Signature, false);
  assert.deepEqual(s.nonfree, []);
  assert.ok(HEX64.test(s.assetsSha256) && HEX64.test(s.resourcesSha256) && HEX64.test(s.contentSha256));
  assert.throws(() => RC.summarize(Buffer.from("這不是 APK".repeat(10))), /不是 ZIP／APK/);
});

test("拿掉簽章區塊：兩把不同金鑰簽的同一個 APK，整檔雜湊不同、拿掉簽章後逐位元相同，而且等於沒簽章的版本", () => {
  const unsigned = makeApk(BASE()), a = makeApk(BASE(), Buffer.alloc(80, 1)), b = makeApk(BASE(), Buffer.alloc(120, 2));
  assert.ok(RC.unsignedBytes(RC.readZip(a)).equals(unsigned));
  assert.ok(RC.unsignedBytes(RC.readZip(b)).equals(unsigned));
  const c = RC.compareBuffers(a, b);
  assert.equal(c.identical, false);
  assert.equal(c.sameUnsigned, true);
  assert.equal(c.sameContent, true);
  assert.deepEqual(c.diffs, []);
  assert.match(RC.verdict(c), /只有簽章區塊不同/);
  const same = RC.compareBuffers(a, Buffer.from(a));
  assert.ok(same.identical && same.sameUnsigned && same.sameDex && same.sameAssets && same.sameResources && same.sameOrder);
  assert.match(RC.verdict(same), /逐位元相同/);
});

test("比對會分出：內容不同、只在一邊、檔案時間不同、壓縮方式不同、項目順序不同；v1 簽章檔不算進內容雜湊", () => {
  const ref = makeApk(BASE());
  const ch = BASE(); ch[1].data = "dex\n035\0Lcom/raysonchen/xiangqiqianqiu/MainActivity;X";
  let c = RC.compareBuffers(ref, makeApk(ch));
  assert.equal(c.sameContent, false); assert.equal(c.sameDex, false); assert.equal(c.sameAssets, true);
  assert.deepEqual(c.diffs, [{ kind: "內容不同", name: "classes.dex" }]);
  assert.match(RC.verdict(c), /✘ 內容不同/);
  c = RC.compareBuffers(ref, makeApk(BASE().concat([{ name: "assets/public/native-build.json", data: "{}" }])));
  assert.deepEqual(c.diffs, [{ kind: "只在第二個", name: "assets/public/native-build.json" }]);
  assert.equal(c.sameAssets, false);
  const t = BASE(); t[4].dos = ((46 << 9 | 11 << 5 | 13) * 65536) + (8 << 11);
  c = RC.compareBuffers(ref, makeApk(t));
  assert.equal(c.sameContent, true); assert.equal(c.sameUnsigned, false);
  assert.deepEqual(c.diffs, [{ kind: "檔案時間不同", name: "assets/public/index.html" }]);
  assert.match(RC.verdict(c), /內容相同，但 ZIP 排列或時間不同/);
  const m = BASE(); m[3].method = 0;
  assert.deepEqual(RC.compareBuffers(ref, makeApk(m)).diffs, [{ kind: "壓縮方式不同", name: "res/layout/main.xml" }]);
  c = RC.compareBuffers(ref, makeApk(BASE().reverse()));
  assert.equal(c.sameOrder, false); assert.equal(c.sameContent, true);
  assert.deepEqual(c.diffs, [{ kind: "項目順序不同", name: "（整個 APK）" }]);
  const v1a = makeApk(BASE().concat([{ name: "META-INF/CERT.SF", data: "a" }, { name: "META-INF/CERT.RSA", data: "a" }]));
  const v1b = makeApk(BASE().concat([{ name: "META-INF/CERT.SF", data: "b" }, { name: "META-INF/CERT.RSA", data: "b" }]));
  c = RC.compareBuffers(v1a, v1b);
  assert.equal(c.sameContent, true);
  assert.equal(c.a.v1Signature, true);
  assert.deepEqual(c.diffs.map(d => d.kind), ["簽章不同", "簽章不同"]);
});

test("Google 服務掃描：dex 字串表有 Lcom/google/android/gms/、項目名稱有 com/google/firebase/ 都會抓到；ListenableFuture（Guava，自由授權）不算", () => {
  const e = BASE();
  e[1].data = "dex\n035\0Lcom/google/common/util/concurrent/ListenableFuture;";
  assert.deepEqual(RC.summarize(makeApk(e)).nonfree, []);
  e.push({ name: "classes2.dex", data: "dex\n035\0Lcom/google/android/gms/common/GoogleApiAvailability;" }, { name: "com/google/firebase/firebase-common.properties", data: "v=1" });
  const n = RC.summarize(makeApk(e)).nonfree;
  assert.ok(n.some(x => x.startsWith("classes2.dex：Lcom/google/android/gms/")), n.join("、"));
  assert.ok(n.some(x => x.includes("com/google/firebase/firebase-common.properties（項目名稱）")), n.join("、"));
});

test("aapt2 badging 解析：套件名、版本、minSdk、targetSdk、權限", () => {
  const t = "package: name='com.raysonchen.xiangqiqianqiu' versionCode='1' versionName='1.0' platformBuildVersionName='16' platformBuildVersionCode='36' compileSdkVersion='36' compileSdkVersionCodename='16'\nminSdkVersion:'24'\ntargetSdkVersion:'36'\nuses-permission: name='android.permission.INTERNET'\nuses-permission: name='com.raysonchen.xiangqiqianqiu.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION'\napplication-label:'象棋千秋'\n";
  assert.deepEqual(RC.parseBadging(t), { package: "com.raysonchen.xiangqiqianqiu", versionCode: "1", versionName: "1.0", minSdk: "24", targetSdk: "36", compileSdk: "36", permissions: ["android.permission.INTERNET", "com.raysonchen.xiangqiqianqiu.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"] });
});

/* 假專案＋假 gradle：每次「編譯」照模式複製 A 或 B 當 APK；build 沒清（上次留的記號還在）就失敗 */
function fakeProject(mode) {
  const d = tmp(), apkA = makeApk(BASE(), Buffer.alloc(40, 1)), b = BASE();
  b[4].data = "<!doctype html>象棋千秋 " + "編譯時間 2026-11-13T00:00:00Z";
  fs.mkdirSync(path.join(d, "android", "app", "build"), { recursive: true });
  fs.mkdirSync(path.join(d, "node_modules", "@capacitor", "android", "capacitor", "build"), { recursive: true });
  fs.writeFileSync(path.join(d, "node_modules", "@capacitor", "android", "capacitor", "build", "old.txt"), "舊的");
  fs.writeFileSync(path.join(d, "A.apk"), apkA); fs.writeFileSync(path.join(d, "B.apk"), makeApk(b, Buffer.alloc(40, 1)));
  fs.writeFileSync(path.join(d, "MODE"), mode);
  fs.mkdirSync(path.join(d, "android", "gradle", "wrapper"), { recursive: true });
  fs.writeFileSync(path.join(d, "android", "gradle", "wrapper", "gradle-wrapper.properties"), "distributionUrl=https\\://services.gradle.org/distributions/gradle-8.14.3-all.zip\ndistributionSha256Sum=" + "ab".repeat(32) + "\n");
  fs.writeFileSync(path.join(d, "android", "build.gradle"), "classpath 'com.android.tools.build:gradle:8.13.0'\n");
  fs.writeFileSync(path.join(d, "android", "variables.gradle"), "ext {\n    minSdkVersion = 24\n    compileSdkVersion = 36\n    targetSdkVersion = 36\n    androidxWebkitVersion = '1.18.0'\n}\n");
  fs.mkdirSync(path.join(d, "www"));
  fs.writeFileSync(path.join(d, "www", "native-build.json"), JSON.stringify({ app: "象棋千秋", siteVersion: "20990101-0000", html: "aaaaaaaaaaaa", sw: "bbbbbbbbbbbb", files: 3, fromAssets: 0, bytes: 99 }));
  const g = path.join(d, "fake-gradle.js");
  fs.writeFileSync(g, [
    "const fs=require('fs'),p=require('path'),root=p.join(process.cwd(),'..');",
    "if(fs.existsSync(p.join(root,'FAIL'))){console.log('假的編譯錯誤');process.exit(1)}",
    "if(fs.existsSync('app/build/marker')){console.log('build 沒清乾淨');process.exit(3)}",
    "if(fs.existsSync(p.join(root,'node_modules/@capacitor/android/capacitor/build/old.txt'))){console.log('capacitor build 沒清');process.exit(4)}",
    "const n=fs.existsSync(p.join(root,'COUNT'))?+fs.readFileSync(p.join(root,'COUNT'),'utf8')+1:1;fs.writeFileSync(p.join(root,'COUNT'),String(n));",
    "const mode=fs.readFileSync(p.join(root,'MODE'),'utf8'),src=mode==='diff'&&n>1?'B.apk':'A.apk';",
    "const out='app/build/outputs/apk/debug';fs.mkdirSync(out,{recursive:true});fs.copyFileSync(p.join(root,src),p.join(out,'app-debug.apk'));fs.writeFileSync('app/build/marker','1');",
    "if(!process.argv.includes('assembleDebug'))process.exit(9);",
  ].join("\n") + "\n");
  return { d, g };
}

test("連編檢查：每次先清 build（含 node_modules 裡 capacitor 的 build）、編出來一樣就代碼 0；第二次不一樣就代碼 1 並指出哪個檔", () => {
  const { d, g } = fakeProject("same"), keep = tmp();
  try {
    const r = RC.reproCheck({ proj: d, gradle: g, keep, log: () => { } });
    assert.equal(r.code, 0, r.error || "");
    assert.equal(r.reproducible, true);
    assert.equal(r.builds.length, 2);
    assert.equal(fs.readFileSync(path.join(d, "COUNT"), "utf8"), "2");
    assert.ok(!fs.existsSync(path.join(d, "node_modules", "@capacitor", "android", "capacitor", "build")));
    fs.writeFileSync(path.join(d, "MODE"), "diff"); fs.rmSync(path.join(d, "COUNT"));
    const r2 = RC.reproCheck({ proj: d, gradle: g, keep, runs: 3, log: () => { } });
    assert.equal(r2.code, 1);
    assert.equal(r2.reproducible, false);
    assert.equal(r2.cmp.length, 2);
    assert.deepEqual(r2.cmp[0].diffs, [{ kind: "內容不同", name: "assets/public/index.html" }]);
    assert.equal(r2.cmp[0].sameDex, true);
  } finally { clean(d); clean(keep) }
});

test("連編檢查：不清 build 第二次會撞到上次的記號而失敗（代碼 2，附編譯輸出）；編譯失敗也是代碼 2", () => {
  const { d, g } = fakeProject("same"), keep = tmp();
  try {
    let r = RC.reproCheck({ proj: d, gradle: g, keep, clean: false, log: () => { } });
    assert.equal(r.code, 2);
    assert.match(r.error, /第 1 次編譯失敗（結束代碼 4）/);
    fs.rmSync(path.join(d, "node_modules"), { recursive: true });
    r = RC.reproCheck({ proj: d, gradle: g, keep, clean: false, log: () => { } });
    assert.match(r.error, /第 2 次編譯失敗（結束代碼 3）/);
    assert.match(r.tail, /build 沒清乾淨/);
    fs.writeFileSync(path.join(d, "FAIL"), "");
    r = RC.reproCheck({ proj: d, gradle: g, keep, log: () => { } });
    assert.equal(r.code, 2);
    assert.match(r.tail, /假的編譯錯誤/);
  } finally { clean(d); clean(keep) }
});

test("建置紀錄：欄位齊、工具版本從專案讀、跨路徑比對寫進 crossChecks、沒有使用者資料夾和暫存路徑、LF 沒有控制字元", () => {
  const { d, g } = fakeProject("same"), keep = tmp(), other = path.join(keep, "other.apk");
  try {
    fs.writeFileSync(other, makeApk(BASE(), Buffer.alloc(90, 5)));
    const r = RC.reproCheck({ proj: d, gradle: g, keep, against: [{ apk: other, note: "另一把金鑰" }], log: () => { } });
    const rec = RC.makeRecord({ proj: d, result: r, manifest: { package: "com.raysonchen.xiangqiqianqiu", targetSdk: "36" }, env: {}, now: "2026-11-13T00:00:00Z" });
    assert.equal(rec.schema, "xq-android-build-record/1");
    assert.equal(rec.builtAtUtc, "2026-11-13T00:00:00.000Z");
    assert.equal(rec.applicationId, "com.raysonchen.xiangqiqianqiu");
    assert.deepEqual(rec.site, { version: "20990101-0000", html: "aaaaaaaaaaaa", sw: "bbbbbbbbbbbb", files: 3, bytes: 99 });
    assert.equal(rec.tools.gradle, "8.14.3"); assert.equal(rec.tools.agp, "8.13.0"); assert.equal(rec.tools.gradleDistributionSha256, "ab".repeat(32));
    assert.equal(rec.tools.targetSdk, "36"); assert.equal(rec.tools.minSdk, "24"); assert.equal(rec.tools.androidxWebkit, "1.18.0");
    assert.ok(HEX64.test(rec.apk.sha256) && HEX64.test(rec.apk.unsignedSha256) && HEX64.test(rec.apk.contentSha256));
    assert.deepEqual(rec.reproducibility.runSha256, [rec.apk.sha256, rec.apk.sha256]);
    assert.equal(rec.reproducibility.identical, true); assert.equal(rec.reproducibility.cleanBetweenRuns, true);
    assert.equal(rec.crossChecks.length, 1);
    assert.deepEqual([rec.crossChecks[0].note, rec.crossChecks[0].identical, rec.crossChecks[0].sameUnsignedBytes], ["另一把金鑰", false, true]);
    const t = RC.recordText(rec);
    assert.ok(t.endsWith("}\n") && !t.includes("\r") && !CTL.test(t.replace(/\n/g, "")));
    assert.ok(!t.includes(os.homedir()) && !t.includes(os.homedir().split("\\").join("/")) && !t.includes(d) && !t.includes(keep), "紀錄不能有路徑");
  } finally { clean(d); clean(keep) }
});

test("指令列 --compare：逐位元相同或只差簽章＝0、內容不同＝1、少給檔案＝2", () => {
  const d = tmp(), f = (n, b) => { const p = path.join(d, n); fs.writeFileSync(p, b); return p };
  try {
    const a = f("a.apk", makeApk(BASE(), Buffer.alloc(30, 1))), b = f("b.apk", makeApk(BASE(), Buffer.alloc(60, 2)));
    const ch = BASE(); ch[0].data = "<manifest debuggable/>";
    const c = f("c.apk", makeApk(ch, Buffer.alloc(30, 1)));
    const run = (...x) => cp.spawnSync(process.execPath, [path.join(AND, "scripts", "repro-check.js"), ...x], { encoding: "utf8" });
    let r = run("--compare", a, a); assert.equal(r.status, 0); assert.match(r.stdout, /✔ 兩個 APK 逐位元相同/);
    r = run("--compare", a, b); assert.equal(r.status, 0); assert.match(r.stdout, /拿掉簽章區塊後：逐位元相同/);
    r = run("--compare", a, c); assert.equal(r.status, 1); assert.match(r.stdout, /✘ 內容不同：AndroidManifest\.xml/);
    assert.equal(run("--compare", a).status, 2);
  } finally { clean(d) }
});

test("〔混合〕真的建置紀錄：debug APK 兩次逐位元相同、另一路徑另一把金鑰只差簽章、沒有 Google 服務、targetSdk 36；本機有 APK 就重算雜湊核對", () => {
  const recFile = path.join(AND, "build-records", "debug-20261113.json"), raw = fs.readFileSync(recFile, "utf8"), rec = JSON.parse(raw);
  assert.ok(!raw.includes("\r") && !raw.includes(os.homedir()) && !raw.includes(os.homedir().split("\\").join("/")));
  assert.equal(rec.schema, "xq-android-build-record/1");
  assert.equal(rec.applicationId, "com.raysonchen.xiangqiqianqiu");
  assert.match(rec.tools.jdk, /^Temurin-21\./);
  assert.deepEqual([rec.tools.gradle, rec.tools.agp, rec.tools.compileSdk, rec.tools.targetSdk, rec.tools.minSdk, rec.tools.androidxWebkit, rec.tools.capacitor], ["8.14.3", "8.13.0", "36", "36", "24", "1.18.0", "8.6.2"]);
  assert.deepEqual([rec.manifest.targetSdk, rec.manifest.minSdk], ["36", "24"]);
  assert.deepEqual(rec.manifest.permissions, ["android.permission.INTERNET", "com.raysonchen.xiangqiqianqiu.DYNAMIC_RECEIVER_NOT_EXPORTED_PERMISSION"], "權限只能有網路（另一個是 AndroidX 自動加的內部權限）");
  assert.deepEqual(rec.nonfree, []);
  assert.ok(HEX64.test(rec.apk.sha256) && rec.apk.bytes > 50e6);
  assert.equal(rec.apk.v1Signature, false);
  assert.equal(rec.reproducibility.identical, true);
  assert.ok(rec.reproducibility.runs >= 2 && rec.reproducibility.runSha256.every(h => h === rec.apk.sha256));
  assert.deepEqual(rec.reproducibility.diffs, []);
  assert.ok(rec.crossChecks.length >= 1 && rec.crossChecks.every(c => c.sameUnsignedBytes && c.sameContentExcludingSignature && c.diffs.length === 0));
  const tc = JSON.parse(fs.readFileSync(path.join(AND, "build-records", "toolchain-20261113.json"), "utf8"));
  assert.equal(rec.tools.gradleDistributionSha256, tc.tools.find(t => /^Gradle（/.test(t.name)).sha256, "wrapper 設定的雜湊要跟工具鏈紀錄一致");
  assert.equal(RC.toolVersions(AND, {}).gradleDistributionSha256, rec.tools.gradleDistributionSha256);
  const apk = path.join(AND, "android", "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  if (fs.existsSync(apk)) {
    const s = RC.summarize(fs.readFileSync(apk));
    if (s.sha256 === rec.apk.sha256) assert.deepEqual([s.contentSha256, s.unsignedSha256, s.nonfree.length], [rec.apk.contentSha256, rec.apk.unsignedSha256, 0]);
    else assert.notEqual(s.contentSha256, rec.apk.contentSha256, "內容一樣只有整檔雜湊不同＝換了 debug 金鑰，紀錄要重寫");
  }
});

test("〔原始碼〕工具鏈紀錄：每個下載檔有 SHA-256、來源只有 Adoptium／dl.google.com／services.gradle.org、寫明授權與沒改系統 PATH", () => {
  const raw = fs.readFileSync(path.join(AND, "build-records", "toolchain-20261113.json"), "utf8"), tc = JSON.parse(raw);
  assert.ok(!raw.includes("\r") && !raw.includes(os.homedir()));
  assert.equal(tc.schema, "xq-android-toolchain/1");
  const OK = /^https:\/\/(github\.com\/adoptium\/|dl\.google\.com\/android\/repository\/|services\.gradle\.org\/distributions\/)/;
  for (const t of tc.tools) {
    if (/^https:/.test(t.source || "")) assert.match(t.source, OK, t.name);
    if (t.source && /^https:/.test(t.source)) assert.match(t.sha256, /^[0-9a-f]{64}$/, t.name + " 要有 SHA-256");
  }
  const names = tc.tools.map(t => t.name).join("\n");
  for (const k of ["Temurin JDK", "Command-line Tools", "Platform 36", "Build-Tools", "Gradle"]) assert.ok(names.includes(k), "缺 " + k);
  assert.match(tc.licenses, /Android SDK 標準授權/);
  assert.match(tc.systemChanges, /沒有改全域 PATH/);
});

test("〔混合〕android.md 兩份逐字相同、LF；寫的 APK 雜湊、大小跟建置紀錄一致，並列出還沒驗證的事", () => {
  const a = fs.readFileSync(path.join(ROOT, "xiangqi-db", "art", "docs", "android.md")), b = fs.readFileSync(path.join(LAB, "site", "data", "docs", "android.md"));
  assert.ok(a.equals(b), "兩份要逐字相同");
  const t = a.toString("utf8");
  assert.ok(!a.includes(13) && !CTL.test(t.replace(/[\t\n]/g, "")));
  const rec = JSON.parse(fs.readFileSync(path.join(AND, "build-records", "debug-20261113.json"), "utf8"));
  assert.ok(t.includes(rec.apk.sha256), "android.md 要寫 APK 的 SHA-256");
  assert.ok(t.includes(rec.apk.contentSha256), "android.md 要寫內容雜湊");
  assert.ok(t.includes(String(rec.apk.bytes)), "android.md 要寫 APK 大小");
  for (const h of ["## 編譯與可重現建置", "### 還沒驗證的", "repro-check.js"]) assert.ok(t.includes(h), "android.md 缺 " + h);
  assert.match(t, /crossOriginIsolated/);
});

test("〔原始碼〕Service Worker 的請求也補隔離標頭：MainActivity 設 ServiceWorkerClient、跟 WebViewClient 共用 addIsolationHeaders，標頭清單只有一份", () => {
  const J = path.join(AND, "android", "app", "src", "main", "java", "com", "raysonchen", "xiangqiqianqiu");
  const main = fs.readFileSync(path.join(J, "MainActivity.java"), "utf8"), client = fs.readFileSync(path.join(J, "XQWebViewClient.java"), "utf8");
  for (const [f, s] of [["MainActivity", main], ["XQWebViewClient", client]]) assert.ok(!s.includes("\r") && !CTL.test(s.replace(/[\t\n]/g, "")), f + " 要 LF、沒有控制字元");
  assert.match(main, /ServiceWorkerController\.getInstance\(\)\.setServiceWorkerClient\(/);
  assert.match(main, /XQWebViewClient\.addIsolationHeaders\(request, bridge\.getLocalServer\(\)\.shouldInterceptRequest\(request\)\)/);
  assert.ok(main.indexOf("super.load()") < main.indexOf("installServiceWorkerClient(bridge)"), "要在 super.load() 之後設，才會蓋掉 Capacitor Bridge 設的那個");
  assert.match(main, /isResolveServiceWorkerRequests\(\)/, "跟 Capacitor 一樣看 server.resolveServiceWorkerRequests");
  assert.match(client, /return addIsolationHeaders\(request, super\.shouldInterceptRequest\(view, request\)\)/);
  assert.match(client, /h\.putAll\(ISOLATION_HEADERS\)/);
  const puts = (main + client).match(/\.put\("[A-Za-z-]+", "[^"]+"\)/g) || [];
  assert.deepEqual(puts, ['.put("Document-Isolation-Policy", "isolate-and-require-corp")', '.put("Cross-Origin-Opener-Policy", "same-origin")', '.put("Cross-Origin-Embedder-Policy", "require-corp")', '.put("Cross-Origin-Resource-Policy", "same-origin")'], "四個標頭只在 ISOLATION_HEADERS 寫一次");
  assert.ok(!/實驗（模擬器驗證用/.test(main), "實驗版的註解要換成正式說明");
  assert.match(main, /為什麼：Service Worker/);
});

test("〔混合〕Service Worker 修法正式採用：建置紀錄是修好後的 APK、修正前那份另存；android.md 寫明驗證結果和截圖，截圖檔都在", () => {
  const rec = JSON.parse(fs.readFileSync(path.join(AND, "build-records", "debug-20261113.json"), "utf8"));
  const pre = JSON.parse(fs.readFileSync(path.join(AND, "build-records", "debug-20261113-pre-swfix.json"), "utf8"));
  assert.equal(pre.apk.sha256, "38892682a9340bb0ac3f8cee5237b94d32f4e5780ce5ad52de1a58aa68394f9d");
  assert.notEqual(rec.apk.sha256, pre.apk.sha256);
  assert.notEqual(rec.apk.contentSha256, pre.apk.contentSha256, "原生碼改了，內容雜湊要跟著變");
  assert.deepEqual(rec.site, pre.site, "網頁成品沒換，只重編原生碼");
  const t = fs.readFileSync(path.join(ROOT, "xiangqi-db", "art", "docs", "android.md"), "utf8");
  assert.ok(t.includes("### 正式修法的驗證") && t.includes("已正式採用"));
  assert.ok(t.includes("debug-20261113-pre-swfix.json"));
  assert.ok(t.includes("8265202f…") || t.includes(rec.apk.sha256.slice(0, 8) + "…"));
  for (const c of rec.crossChecks) assert.ok(t.includes(c.sha256), "android.md 要寫跨路徑比對的雜湊");
  const shots = [...new Set(t.match(/\d\d-swfix-[a-z0-9-]+\.png/g) || [])];
  assert.ok(shots.length >= 5, "正式版截圖要列出來：" + shots.join("、"));
  for (const s of shots) assert.ok(fs.existsSync(path.join(AND, "verify", s)), "截圖不見了：" + s);
  assert.match(t, /映像 A（WebView 133）這次沒有重測/);
});

/* ── 11/13 外部可重建＋發布版 ── */
const CR = require(path.join(AND, "scripts", "clean-rebuild.js"));
/* 版本號規則（跟 app/build.gradle 一樣）：網站版本號 yyyyMMdd-HHmm → yyMMddHH */
const vcodeOf = v => /^\d{8}-\d{4}$/.test(v) ? +(v.slice(2, 8) + v.slice(9, 11)) : 1;

test("重建比對：APK 換金鑰簽（只差簽章區塊）算一致；AAB 的 jar 簽章檔不同、內容一樣算一致；內容不同就不一致", () => {
  const apkA = makeApk(BASE(), Buffer.alloc(50, 1)), apkB = makeApk(BASE(), Buffer.alloc(70, 2));
  let a = CR.compareArtifact("app-release.apk", apkA, apkB);
  assert.deepEqual([a.identical, a.sameUnsignedBytes, CR.artifactOk(a)], [false, true, true]);
  const sig = s => BASE().concat([{ name: "META-INF/MANIFEST.MF", data: "Manifest-Version: 1.0\n" }, { name: "META-INF/ANDROIDD.SF", data: s }, { name: "META-INF/ANDROIDD.RSA", data: s }]);
  a = CR.compareArtifact("app-release.aab", makeApk(sig("金鑰一")), makeApk(sig("金鑰二")));
  assert.deepEqual([a.sameUnsignedBytes, a.sameContentExcludingSignature, a.diffs.length, CR.artifactOk(a)], [false, true, 0, true], "簽章檔的差異不算");
  const ch = sig("金鑰二"); ch[1].data = "dex\n035\0改過";
  a = CR.compareArtifact("app-release.aab", makeApk(sig("金鑰一")), makeApk(ch));
  assert.equal(CR.artifactOk(a), false);
  assert.deepEqual(a.diffs, [{ kind: "內容不同", name: "classes.dex" }]);
  const b = BASE(); b[4].data = "<!doctype html>改過";
  assert.equal(CR.artifactOk(CR.compareArtifact("app-debug.apk", apkA, makeApk(b, Buffer.alloc(50, 1)))), false);
  assert.deepEqual(CR.ARTIFACTS.map(x => x.name), ["app-debug.apk", "app-release.apk", "app-release.aab"]);
});

test("重建只複製會進版本控制的檔：照 .gitignore（含子資料夾的）擋掉 node_modules、www、build、金鑰；不在專案裡留 .git；指紋跟內容走", { skip: cp.spawnSync("git", ["--version"]).status !== 0 && "沒有 git" }, () => {
  const d = tmp(), w = tmp();
  try {
    const put = (f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s) };
    put(".gitignore", "node_modules/\nwww/\n*.jks\nkeystore.properties\n");
    put("android/.gitignore", "build/\n.gradle/\napp/src/main/assets/public\n");
    for (const f of ["package.json", "scripts/make-www.js", "android/build.gradle", "android/app/src/main/assets/capacitor.config.json", "android/gradle/verification-metadata.xml"]) put(f, f);
    for (const f of ["node_modules/x/index.js", "www/index.html", "android/app/build/out.apk", "android/.gradle/x", "android/app/src/main/assets/public/index.html", "upload.jks", "keystore.properties"]) put(f, "不該複製");
    const files = CR.sourceFiles(d, path.join(w, "probe.git"));
    assert.deepEqual(files, [".gitignore", "android/.gitignore", "android/app/src/main/assets/capacitor.config.json", "android/build.gradle", "android/gradle/verification-metadata.xml", "package.json", "scripts/make-www.js"]);
    assert.ok(!fs.existsSync(path.join(d, ".git")), "不能在專案裡建 .git");
    const to = path.join(w, "copy");
    CR.copyFiles(d, to, files);
    assert.equal(CR.treeHash(d, files), CR.treeHash(to, files));
    fs.writeFileSync(path.join(to, "package.json"), "改過");
    assert.notEqual(CR.treeHash(d, files), CR.treeHash(to, files));
  } finally { clean(d); clean(w) }
});

test("重建要全新的 --work 資料夾、四個參數都要給；紀錄不寫路徑、LF", () => {
  const w = tmp();
  try {
    assert.throws(() => CR.cleanRebuild({ webRepo: "x", webRev: "y", work: w }), /--reference/);
    fs.writeFileSync(path.join(w, "舊東西.txt"), "1");
    assert.throws(() => CR.cleanRebuild({ webRepo: "x", webRev: "y", work: w, reference: w, log: () => { } }), /全新的空資料夾/);
    const art = CR.compareArtifact("app-debug.apk", makeApk(BASE(), Buffer.alloc(9, 1)), makeApk(BASE(), Buffer.alloc(9, 2)));
    const rec = CR.makeRecord({ ok: true, work: w, steps: [{ step: "npm ci", seconds: 1 }], artifacts: [art], source: { files: 3, treeSha256: "a".repeat(64), originalTreeSha256: "a".repeat(64) }, web: { origin: "https://github.com/raysonchen2023-cloud/xiangqi-lab.git", commit: "c".repeat(40), siteVersion: "20990101-0000" }, tools: { jdk: "Temurin-21" }, fresh: { gradleUserHome: true } }, "2026-11-13T00:00:00Z");
    assert.equal(rec.schema, "xq-android-rebuild-record/1");
    assert.equal(rec.artifacts[0].ok, true);
    const t = CR.recordText(rec);
    assert.ok(t.endsWith("}\n") && !t.includes("\r") && !t.includes(w) && !t.includes(os.homedir()));
  } finally { clean(w) }
});

test("〔原始碼〕釘版本與發布設定：JDK 21 檢查、build-tools 35.0.0、Gradle 相依驗證檔、R8、vcsInfo 關、版本號從網站版本算、簽章只從倉庫外的檔讀、金鑰檔被 .gitignore 擋", () => {
  const rd = f => fs.readFileSync(path.join(AND, f), "utf8");
  const root = rd("android/build.gradle"), app = rd("android/app/build.gradle"), vars = rd("android/variables.gradle"), meta = rd("android/gradle/verification-metadata.xml");
  assert.match(root, /JavaVersion\.current\(\)\.majorVersion != '21'/);
  assert.match(vars, /buildToolsVersion = '35\.0\.0'/);
  assert.match(app, /buildToolsVersion = rootProject\.ext\.buildToolsVersion/);
  assert.match(app, /minifyEnabled true/);
  assert.match(app, /proguard-android-optimize\.txt/);
  assert.match(app, /vcsInfo\.include = false/);
  assert.match(app, /versionCode xqVersionCode/);
  assert.match(app, /xqSiteVersion\.substring\(2, 8\) \+ xqSiteVersion\.substring\(9, 11\)/, "versionCode＝yyMMddHH");
  assert.match(app, /findProperty\('xqSigning'\) \?: System\.getenv\('XQ_SIGNING_PROPERTIES'\)/);
  assert.doesNotMatch(app, /storePassword\s+['"]/, "build.gradle 不能寫死密碼");
  assert.match(meta, /<verify-metadata>true<\/verify-metadata>/);
  assert.match(meta, /group="com\.android\.tools\.build" name="gradle" version="8\.13\.0"/);
  assert.match(meta, /group="androidx\.webkit" name="webkit" version="1\.18\.0"/);
  assert.ok((meta.match(/<component /g) || []).length > 300, "相依驗證檔要列出所有元件");
  const gi = rd(".gitignore");
  for (const k of ["www/", "*.jks", "*.keystore", "keystore.properties"]) assert.ok(gi.split("\n").includes(k), ".gitignore 缺 " + k);
  const pkg = JSON.parse(rd("package.json"));
  for (const v of Object.values(Object.assign({}, pkg.dependencies, pkg.devDependencies))) assert.match(v, /^\d+\.\d+\.\d+$/, "npm 版本要寫死");
  assert.equal(vcodeOf("20261113-0540"), 26111305);
  assert.equal(vcodeOf("20991231-2359"), 99123123);
  assert.ok(vcodeOf("20991231-2359") < 2100000000, "Google Play 上限");
});

test("〔混合〕乾淨環境重建紀錄：全新 Gradle／npm 快取、全新 debug 金鑰、原始碼指紋一致；debug、release APK 拿掉簽章後逐位元相同、AAB 內容相同；版本號照規則；REBUILD.md、android.md 寫的雜湊跟紀錄一致", () => {
  const raw = fs.readFileSync(path.join(AND, "build-records", "rebuild-20261113.json"), "utf8"), rec = JSON.parse(raw);
  assert.ok(!raw.includes("\r") && !raw.includes(os.homedir()) && !raw.includes(os.homedir().split("\\").join("/")) && !/Temp[\\/]/.test(raw));
  assert.equal(rec.schema, "xq-android-rebuild-record/1");
  assert.equal(rec.allMatch, true);
  assert.deepEqual(rec.fresh, { gradleUserHome: true, androidUserHome: true, npmCache: true, nodeModules: true, buildDirs: true });
  assert.equal(rec.source.treeSha256, rec.source.originalTreeSha256);
  assert.match(rec.web.commit, /^[0-9a-f]{40}$/);
  assert.equal(rec.web.siteVersion, "20261113-0540");
  assert.deepEqual(rec.artifacts.map(a => a.name), ["app-debug.apk", "app-release.apk", "app-release.aab"]);
  for (const a of rec.artifacts) {
    assert.equal(a.ok, true, a.name);
    assert.equal(a.identical, false, a.name + "：兩邊用不同的 debug 金鑰，整檔一定不同");
    assert.equal(a.sameContentExcludingSignature, true, a.name);
    assert.deepEqual(a.diffs, [], a.name);
    assert.deepEqual([a.reference.nonfree, a.rebuilt.nonfree], [[], []]);
    if (/\.apk$/.test(a.name)) assert.equal(a.reference.unsignedSha256, a.rebuilt.unsignedSha256, a.name);
  }
  assert.equal(rec.tools.jdk, "Temurin-21.0.13+9 21.0.13+9-LTS");
  assert.deepEqual([rec.tools.gradle, rec.tools.agp, rec.tools.capacitor, rec.tools.buildTools, rec.tools.platformRevision, rec.tools.dependencyVerification], ["8.14.3", "8.13.0", "8.6.2", "35.0.0", "2", true]);
  assert.equal(rec.tools.gradleWrapperJarSha256, "7d3a4ac4de1c32b59bc6a4eb8ecb8e612ccd0cf1ae1e99f66902da64df296172");
  assert.equal(rec.manifest.versionCode, String(vcodeOf(rec.web.siteVersion)));
  assert.equal(rec.manifest.versionName, rec.web.siteVersion);
  const reb = fs.readFileSync(path.join(AND, "REBUILD.md"), "utf8"), doc = fs.readFileSync(path.join(ROOT, "xiangqi-db", "art", "docs", "android.md"), "utf8");
  assert.ok(!reb.includes("\r") && !CTL.test(reb.replace(/[\t\n]/g, "")));
  const dbg = rec.artifacts[0], rel = rec.artifacts[1], aab = rec.artifacts[2];
  for (const [n, t] of [["REBUILD.md", reb], ["android.md", doc]]) {
    for (const h of [dbg.reference.unsignedSha256, rel.reference.unsignedSha256, aab.reference.contentSha256, rec.web.commit]) assert.ok(t.includes(h), n + " 缺 " + h);
    assert.ok(t.includes("rebuild-20261113.json"), n);
  }
  for (const k of ["npm ci", "make-www.js", "capacitor sync android", "assembleRelease bundleRelease", "-PxqSigning", "keytool -genkeypair", "Play App Signing", "verification-metadata.xml", "clean-rebuild.js"]) assert.ok(reb.includes(k), "REBUILD.md 缺 " + k);
});
