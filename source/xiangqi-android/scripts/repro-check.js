#!/usr/bin/env node
// 象棋千秋 Android：可重現建置檢查（同一份輸入連編兩次、比對 APK）＋建置紀錄
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 做的事：
//   1. 清掉所有 build 資料夾（android/app/build、android/build、外掛的 build、node_modules 裡 capacitor-android 的 build、android/.gradle）
//   2. 跑 gradlew assembleDebug，把 APK 存一份；再清一次、再編一次
//   3. 比對兩個 APK：整個檔的 SHA-256、每個項目（解壓後）的 SHA-256、項目順序、壓縮方式、檔案時間
//      「內容雜湊」不含簽章（APK Signing Block、META-INF 的 .SF/.RSA/.MF）：不同電腦的 debug 金鑰不一樣，簽章一定不同，內容應該一樣
//   4. 掃 APK 有沒有 Google Play 服務、Firebase 的類別（F-Droid 要求）；有 aapt2 就讀 manifest（權限、minSdk、targetSdk）
//   5. --out 寫建置紀錄（JSON，LF）：工具版本、網站版本、兩次的雜湊、比對結果；不寫使用者資料夾路徑
// 用法（JAVA_HOME、ANDROID_HOME 要先設好；不改系統 PATH）：
//   node scripts/repro-check.js [--runs 2] [--out 紀錄.json] [--keep <存 APK 的資料夾>]
//   node scripts/repro-check.js --compare a.apk b.apk      只比對兩個現成的 APK
//   node scripts/repro-check.js --inspect a.apk            只看一個 APK（項目數、雜湊、Google 服務、manifest）
//   --against <apk> [--against-note 說明]：另外拿一個 APK（別的路徑、別的 debug 金鑰編的）跟第一次比，結果寫進紀錄的 crossChecks
//   --gradle <指令>：換掉 gradlew（測試用）；--no-clean：不清 build（不建議）
// 結束代碼：0＝可重現（--compare：逐位元相同或只差簽章區塊；--inspect：沒有 Google 服務）、1＝不一致或有 Google 服務、2＝用法錯或編譯失敗
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto"), zlib = require("zlib"), os = require("os");
const HERE = path.join(__dirname, "..");
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");

/* 要清的 build 資料夾（相對 xiangqi-android/）；node_modules 那個路徑很長，用 fs.rmSync（Node 會處理 Windows 長路徑） */
const BUILD_DIRS = ["android/app/build", "android/build", "android/capacitor-cordova-android-plugins/build", "node_modules/@capacitor/android/capacitor/build", "android/.gradle"];
/* 簽章相關：不算進內容雜湊 */
const SIG_ENTRY = /^META-INF\/([^/]+\.(SF|RSA|DSA|EC)|MANIFEST\.MF)$/i;
const APK_SIG_MAGIC = Buffer.from("APK Sig Block 42", "latin1");
/* F-Droid 不收的：Google Play 服務、Firebase、Play Core；在項目名稱或 dex 字串表裡出現就算 */
const NONFREE_MARKS = ["com/google/android/gms/", "com/google/firebase/", "com/google/android/play/core/", "com/google/android/datatransport/"];

/* ── 讀 ZIP（APK）：只用中央目錄，不靠外部 unzip ── */
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65535); i--) if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  if (eocd < 0) throw new Error("不是 ZIP／APK（找不到中央目錄結尾）");
  const count = buf.readUInt16LE(eocd + 10), cdSize = buf.readUInt32LE(eocd + 12), cdOff = buf.readUInt32LE(eocd + 16);
  let sigBlock = null;
  if (cdOff >= 24 && buf.subarray(cdOff - 16, cdOff).equals(APK_SIG_MAGIC)) {
    const size = Number(buf.readBigUInt64LE(cdOff - 24));
    sigBlock = { offset: cdOff - size - 8, size: size + 8 };
  }
  const entries = [];
  for (let p = cdOff, i = 0; i < count; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("中央目錄格式錯（第 " + i + " 項）");
    const method = buf.readUInt16LE(p + 10), time = buf.readUInt16LE(p + 12), date = buf.readUInt16LE(p + 14), crc = buf.readUInt32LE(p + 16);
    const csize = buf.readUInt32LE(p + 20), usize = buf.readUInt32LE(p + 24), nl = buf.readUInt16LE(p + 28), el = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32);
    const extAttr = buf.readUInt32LE(p + 38), off = buf.readUInt32LE(p + 42), name = buf.subarray(p + 46, p + 46 + nl).toString("utf8");
    entries.push({ name, method, time, date, crc, csize, usize, extAttr, off });
    p += 46 + nl + el + cl;
  }
  return { entries, cdOff, cdSize, sigBlock, buf, eocd };
}

/* 拿掉 APK Signing Block、把中央目錄位置改回來：只差簽章的兩個 APK，拿掉後應該逐位元相同 */
function unsignedBytes(zip) {
  if (!zip.sigBlock) return zip.buf;
  const b = zip.buf, s = zip.sigBlock, out = Buffer.concat([b.subarray(0, s.offset), b.subarray(zip.cdOff)]);
  out.writeUInt32LE(s.offset, zip.eocd - s.size + 16);
  return out;
}

function entryData(zip, e) {
  const b = zip.buf, p = e.off;
  if (b.readUInt32LE(p) !== 0x04034b50) throw new Error("本機檔頭格式錯：" + e.name);
  const start = p + 30 + b.readUInt16LE(p + 26) + b.readUInt16LE(p + 28), raw = b.subarray(start, start + e.csize);
  if (e.method === 0) return raw;
  if (e.method === 8) return zlib.inflateRawSync(raw);
  throw new Error("不支援的壓縮方式 " + e.method + "：" + e.name);
}

/* 一個 APK 的摘要：整檔雜湊、內容雜湊（不含簽章）、每項雜湊、dex 雜湊、Google 服務 */
function summarize(buf) {
  const zip = readZip(buf), items = [], nonfree = [];
  for (const e of zip.entries) {
    const d = entryData(zip, e), h = sha256(d);
    items.push({ name: e.name, sha256: h, size: d.length, method: e.method, dos: e.date * 65536 + e.time });
    for (const m of NONFREE_MARKS) {
      if (e.name.includes(m)) nonfree.push(e.name + "（項目名稱）");
      else if (/\.dex$/.test(e.name) && d.includes(Buffer.from("L" + m, "latin1"))) nonfree.push(e.name + "：L" + m);
    }
  }
  const content = items.filter(x => !SIG_ENTRY.test(x.name)).map(x => x.name + "\0" + x.sha256).sort().join("\n");
  const dex = items.filter(x => /^classes\d*\.dex$/.test(x.name)).map(x => ({ name: x.name, sha256: x.sha256 }));
  const group = re => sha256(items.filter(x => re.test(x.name)).map(x => x.name + "\0" + x.sha256).sort().join("\n"));
  return {
    bytes: buf.length, sha256: sha256(buf), unsignedSha256: sha256(unsignedBytes(zip)), contentSha256: sha256(content), entries: items.length,
    signingBlock: zip.sigBlock ? zip.sigBlock.size : 0, v1Signature: items.some(x => SIG_ENTRY.test(x.name) && !/MANIFEST\.MF$/i.test(x.name)),
    dex, assetsSha256: group(/^assets\//), resourcesSha256: group(/^(res\/|resources\.arsc$|AndroidManifest\.xml$)/),
    nonfree, items,
  };
}

/* 比對兩個 APK：哪些項目只在一邊、內容不同、順序不同、壓縮方式或時間不同 */
function compareBuffers(a, b) {
  const A = summarize(a), B = summarize(b), diffs = [];
  const ma = new Map(A.items.map(x => [x.name, x])), mb = new Map(B.items.map(x => [x.name, x]));
  for (const x of A.items) if (!mb.has(x.name)) diffs.push({ kind: "只在第一個", name: x.name });
  for (const x of B.items) if (!ma.has(x.name)) diffs.push({ kind: "只在第二個", name: x.name });
  for (const x of A.items) {
    const y = mb.get(x.name);
    if (!y) continue;
    if (x.sha256 !== y.sha256) diffs.push({ kind: SIG_ENTRY.test(x.name) ? "簽章不同" : "內容不同", name: x.name });
    else if (x.method !== y.method) diffs.push({ kind: "壓縮方式不同", name: x.name });
    else if (x.dos !== y.dos) diffs.push({ kind: "檔案時間不同", name: x.name });
  }
  const common = A.items.map(x => x.name).filter(n => mb.has(n)), orderB = B.items.map(x => x.name).filter(n => ma.has(n));
  const sameOrder = common.join("\n") === orderB.join("\n");
  if (!sameOrder) diffs.push({ kind: "項目順序不同", name: "（整個 APK）" });
  return {
    identical: A.sha256 === B.sha256, sameUnsigned: A.unsignedSha256 === B.unsignedSha256, sameContent: A.contentSha256 === B.contentSha256, sameOrder,
    sameDex: JSON.stringify(A.dex) === JSON.stringify(B.dex), sameAssets: A.assetsSha256 === B.assetsSha256, sameResources: A.resourcesSha256 === B.resourcesSha256,
    a: strip(A), b: strip(B), diffs,
  };
}
const strip = s => { const o = Object.assign({}, s); delete o.items; return o };

/* 讀 manifest：aapt2 dump badging 的輸出 → 套件名、版本、minSdk、targetSdk、權限 */
function parseBadging(t) {
  const g = re => { const m = t.match(re); return m ? m[1] : null };
  return {
    package: g(/^package: name='([^']+)'/m), versionCode: g(/versionCode='([^']*)'/), versionName: g(/versionName='([^']*)'/),
    minSdk: g(/^minSdkVersion:'(\d+)'/m), targetSdk: g(/^targetSdkVersion:'(\d+)'/m), compileSdk: g(/compileSdkVersion='(\d+)'/),
    permissions: [...t.matchAll(/^uses-permission: name='([^']+)'/gm)].map(m => m[1]),
  };
}
function findAapt2(sdk) {
  if (!sdk) return null;
  const bt = path.join(sdk, "build-tools");
  let vs = [];
  try { vs = fs.readdirSync(bt).sort((x, y) => y.localeCompare(x, "en", { numeric: true })) } catch (e) { return null }
  for (const v of vs) for (const n of ["aapt2.exe", "aapt2"]) if (fs.existsSync(path.join(bt, v, n))) return path.join(bt, v, n);
  return null;
}
function manifestInfo(apk, aapt2) {
  if (!aapt2) return null;
  const r = cp.spawnSync(aapt2, ["dump", "badging", apk], { encoding: "utf8", maxBuffer: 64 << 20 });
  return r.status === 0 ? parseBadging(r.stdout) : null;
}

/* 工具版本（不寫路徑）：JDK、Gradle、AGP、SDK 版本設定 */
function toolVersions(proj, env) {
  const v = {}, rd = f => { try { return fs.readFileSync(path.join(proj, f), "utf8") } catch (e) { return "" } };
  const jh = env.JAVA_HOME;
  if (jh) {
    const r = cp.spawnSync(path.join(jh, "bin", "java"), ["-version"], { encoding: "utf8" });
    const t = (r.stderr || "") + (r.stdout || ""), m = t.match(/Runtime Environment ([^\n(]*)\(build ([^)]+)\)/);
    v.jdk = m ? (m[1].trim() + " " + m[2]).trim() : null;
  }
  const w = rd("android/gradle/wrapper/gradle-wrapper.properties");
  v.gradle = (w.match(/gradle-([\d.]+)-(all|bin)\.zip/) || [])[1] || null;
  v.gradleDistributionSha256 = (w.match(/^distributionSha256Sum=([0-9a-f]{64})/m) || [])[1] || null;
  v.agp = (rd("android/build.gradle").match(/com\.android\.tools\.build:gradle:([\d.]+)/) || [])[1] || null;
  const vg = rd("android/variables.gradle"), num = k => { const m = vg.match(new RegExp(k + "\\s*=\\s*'?([\\d.]+)")); return m ? m[1] : null };
  Object.assign(v, { compileSdk: num("compileSdkVersion"), targetSdk: num("targetSdkVersion"), minSdk: num("minSdkVersion"), androidxWebkit: num("androidxWebkitVersion") });
  try { v.capacitor = JSON.parse(rd("node_modules/@capacitor/android/package.json")).version } catch (e) { v.capacitor = null }
  return v;
}

function cleanBuild(proj) {
  for (const d of BUILD_DIRS) fs.rmSync(path.join(proj, d), { recursive: true, force: true, maxRetries: 3 });
}

/* 跑一次編譯；gradle 參數可換（測試用假指令） */
function runBuild(proj, gradle, env) {
  const isWin = process.platform === "win32";
  const cmd = gradle || path.join(proj, "android", isWin ? "gradlew.bat" : "gradlew");
  const args = ["assembleDebug", "--no-daemon", "--console=plain"];
  const r = /\.js$/.test(cmd) ? cp.spawnSync(process.execPath, [cmd, ...args], { cwd: path.join(proj, "android"), env, encoding: "utf8", maxBuffer: 256 << 20 })
    : cp.spawnSync(cmd, args, { cwd: path.join(proj, "android"), env, encoding: "utf8", shell: isWin && /\.bat$/i.test(cmd), maxBuffer: 256 << 20 });
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}

/* 主流程：清→編→存，跑 runs 次，兩兩跟第一次比 */
function reproCheck({ proj = HERE, runs = 2, gradle = null, keep = null, clean = true, against = [], env = process.env, log = console.log } = {}) {
  const apkRel = "android/app/build/outputs/apk/debug/app-debug.apk", keepDir = keep || fs.mkdtempSync(path.join(os.tmpdir(), "xq-repro-"));
  fs.mkdirSync(keepDir, { recursive: true });
  const builds = [];
  for (let i = 1; i <= runs; i++) {
    if (clean) cleanBuild(proj);
    log(`第 ${i} 次編譯…`);
    const r = runBuild(proj, gradle, env);
    if (r.status !== 0) return { ok: false, code: 2, error: `第 ${i} 次編譯失敗（結束代碼 ${r.status}）`, tail: r.out.split("\n").slice(-30).join("\n"), builds };
    const src = path.join(proj, apkRel);
    if (!fs.existsSync(src)) return { ok: false, code: 2, error: `第 ${i} 次編譯沒有產生 ${apkRel}`, builds };
    const dst = path.join(keepDir, `build${i}.apk`);
    fs.copyFileSync(src, dst);
    builds.push(dst);
  }
  const cmp = [];
  for (let i = 1; i < builds.length; i++) cmp.push(compareBuffers(fs.readFileSync(builds[0]), fs.readFileSync(builds[i])));
  const first = summarize(fs.readFileSync(builds[0]));
  /* 另外拿來比的 APK（例如別的路徑、別的電腦、別的 debug 金鑰編的）：只記錄，不影響結束代碼 */
  const cross = against.map(x => Object.assign({ note: x.note || "" }, compareBuffers(fs.readFileSync(builds[0]), fs.readFileSync(x.apk))));
  const reproducible = cmp.every(c => c.identical), sameContent = cmp.every(c => c.sameContent);
  return { ok: reproducible && first.nonfree.length === 0, code: reproducible && first.nonfree.length === 0 ? 0 : 1, builds, first: strip(first), cmp, cross, reproducible, sameContent, clean };
}

/* 建置紀錄：給人看也給測試讀；不寫路徑、時間只寫 UTC */
function makeRecord({ proj = HERE, result, manifest = null, env = process.env, now = new Date() }) {
  let site = null;
  try { site = JSON.parse(fs.readFileSync(path.join(proj, "www", "native-build.json"), "utf8")) } catch (e) { }
  const f = result.first;
  return {
    schema: "xq-android-build-record/1",
    builtAtUtc: new Date(now).toISOString(),
    applicationId: manifest ? manifest.package : null,
    variant: "debug",
    site: site ? { version: site.siteVersion, html: site.html, sw: site.sw, files: site.files, bytes: site.bytes } : null,
    tools: toolVersions(proj, env),
    manifest,
    apk: { bytes: f.bytes, sha256: f.sha256, unsignedSha256: f.unsignedSha256, contentSha256: f.contentSha256, entries: f.entries, dex: f.dex, assetsSha256: f.assetsSha256, resourcesSha256: f.resourcesSha256, signingBlockBytes: f.signingBlock, v1Signature: f.v1Signature },
    nonfree: f.nonfree,
    reproducibility: {
      runs: result.builds.length, cleanBetweenRuns: result.clean !== false,
      identical: result.reproducible, sameUnsignedBytes: result.cmp.every(c => c.sameUnsigned), sameContentExcludingSignature: result.sameContent,
      runSha256: [f.sha256].concat(result.cmp.map(c => c.b.sha256)),
      diffs: [].concat(...result.cmp.map(c => c.diffs)).slice(0, 50),
    },
    crossChecks: (result.cross || []).map(c => ({ note: c.note, sha256: c.b.sha256, identical: c.identical, sameUnsignedBytes: c.sameUnsigned, sameContentExcludingSignature: c.sameContent, diffs: c.diffs.slice(0, 20) })),
  };
}
const recordText = rec => JSON.stringify(rec, null, 1) + "\n";

const verdict = c => c.identical ? "✔ 兩個 APK 逐位元相同" : c.sameUnsigned ? "△ 只有簽章區塊不同（拿掉簽章後逐位元相同；不同電腦的 debug 金鑰不同，正常）" : c.sameContent ? "△ 解開後內容相同，但 ZIP 排列或時間不同" : "✘ 內容不同";

function printCompare(c, log) {
  log(`第一個：${c.a.bytes} 位元組  SHA-256 ${c.a.sha256}`);
  log(`第二個：${c.b.bytes} 位元組  SHA-256 ${c.b.sha256}`);
  log(`整個檔：${c.identical ? "逐位元相同" : "不同"}；拿掉簽章區塊後：${c.sameUnsigned ? "逐位元相同" : "不同"}；內容（不含簽章）：${c.sameContent ? "相同" : "不同"}；dex：${c.sameDex ? "相同" : "不同"}；資源：${c.sameResources ? "相同" : "不同"}；assets：${c.sameAssets ? "相同" : "不同"}；項目順序：${c.sameOrder ? "相同" : "不同"}`);
  for (const d of c.diffs.slice(0, 30)) log(`  ✘ ${d.kind}：${d.name}`);
  if (c.diffs.length > 30) log(`  …還有 ${c.diffs.length - 30} 項`);
}

module.exports = { readZip, unsignedBytes, verdict, summarize, compareBuffers, parseBadging, findAapt2, manifestInfo, toolVersions, cleanBuild, reproCheck, makeRecord, recordText, BUILD_DIRS, NONFREE_MARKS, SIG_ENTRY };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null }, log = console.log;
  try {
    if (a.includes("--compare")) {
      const i = a.indexOf("--compare"), x = a[i + 1], y = a[i + 2];
      if (!x || !y) { log("用法：node scripts/repro-check.js --compare a.apk b.apk"); process.exit(2) }
      const c = compareBuffers(fs.readFileSync(x), fs.readFileSync(y));
      printCompare(c, log);
      log(verdict(c));
      process.exit(c.identical || c.sameUnsigned ? 0 : 1);
    }
    if (a.includes("--inspect")) {
      const f = opt("--inspect"), s = summarize(fs.readFileSync(f)), m = manifestInfo(f, findAapt2(process.env.ANDROID_HOME));
      log(JSON.stringify(Object.assign(strip(s), { manifest: m }), null, 1));
      process.exit(s.nonfree.length ? 1 : 0);
    }
    const runs = Math.max(2, parseInt(opt("--runs") || "2", 10));
    const against = opt("--against") ? [{ apk: opt("--against"), note: opt("--against-note") || "" }] : [];
    const r = reproCheck({ runs, gradle: opt("--gradle"), keep: opt("--keep"), clean: !a.includes("--no-clean"), against, log });
    if (!r.cmp) { log("✘ " + r.error + (r.tail ? "\n" + r.tail : "")); process.exit(2) }
    for (const c of r.cmp) printCompare(c, log);
    for (const c of r.cross) { log("另外比對：" + (c.note || "--against")); printCompare(c, log); log(verdict(c)) }
    const manifest = manifestInfo(r.builds[0], findAapt2(process.env.ANDROID_HOME));
    if (r.first.nonfree.length) log("✘ APK 裡有 Google Play 服務／Firebase：" + r.first.nonfree.join("、"));
    else log("✔ APK 裡沒有 Google Play 服務、Firebase、Play Core 的類別");
    if (opt("--out")) { fs.writeFileSync(opt("--out"), recordText(makeRecord({ result: r, manifest }))); log("建置紀錄：" + opt("--out")) }
    log(r.reproducible ? `✔ 可重現：${r.builds.length} 次編譯的 APK 逐位元相同（SHA-256 ${r.first.sha256}）` : r.sameContent ? "△ 內容相同、只有簽章不同" : "✘ 不可重現：內容不同（見上面的差異）");
    process.exit(r.code);
  } catch (e) { log("✘ " + e.message); process.exit(2) }
}
