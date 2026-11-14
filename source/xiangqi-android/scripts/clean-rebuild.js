#!/usr/bin/env node
// 象棋千秋 Android：乾淨環境重建（照 REBUILD.md 的步驟，在一個全新的資料夾從頭做一次），再跟參考建置的成品比對
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 做的事（每一步都在 --work 資料夾裡，不動原本的專案、不動公開倉庫）：
//   1. 原生專案：只複製「會進版本控制的檔」（用 git ls-files 照 .gitignore 判斷；不 commit、不在專案裡建 .git）
//   2. 網頁：git clone 公開倉庫到 work/web，checkout 指定的 commit（core.autocrlf=false，檔案逐位元照倉庫）
//   3. npm ci（全新的 npm 快取，照 package-lock.json 的 integrity 核對）
//   4. node scripts/make-www.js --repo work/web（會先跑 check-build）→ capacitor sync android（本機的 @capacitor/cli，不連 npx）
//   5. Gradle：全新的 GRADLE_USER_HOME、ANDROID_USER_HOME（會自己產生一把新的 debug 金鑰），JDK／SDK 用 JAVA_HOME、ANDROID_HOME 指定的那一套
//      先 assembleDebug，再用這把新 debug 金鑰當「暫時的發布金鑰」跑 assembleRelease bundleRelease（只證明流程能跑，不是正式金鑰）
//   6. 跟 --reference 資料夾的 app-debug.apk、app-release.apk、app-release.aab 比對：簽章不同是一定的，比的是拿掉簽章後的內容
//   7. --out 寫紀錄（JSON，LF，不寫使用者資料夾路徑）
// 用法：
//   node scripts/clean-rebuild.js --web-repo <公開倉庫（git）> --web-rev <commit> --work <全新的空資料夾> --reference <參考成品資料夾> [--out 紀錄.json]
//   其他：--gradle-home <資料夾>（不給＝work 裡全新的一個）  --keep-work（做完不刪 work 資料夾；預設也不刪，要自己刪）
// 結束代碼：0＝三個成品拿掉簽章後都一致、1＝有不一致、2＝用法錯或某一步失敗
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");
const RC = require("./repro-check.js");
const HERE = path.join(__dirname, "..");
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const isWin = process.platform === "win32";

/* 成品：參考資料夾裡的檔名 ← 建置輸出的位置（相對 android/app/build/outputs） */
const ARTIFACTS = [
  { name: "app-debug.apk", out: "apk/debug/app-debug.apk" },
  { name: "app-release.apk", out: "apk/release/app-release.apk" },
  { name: "app-release.aab", out: "bundle/release/app-release.aab" },
];

function run(cmd, args, opt = {}) {
  const r = cp.spawnSync(cmd, args, Object.assign({ encoding: "utf8", maxBuffer: 256 << 20, shell: isWin && /\.(bat|cmd)$/i.test(cmd) }, opt));
  if (r.error) throw r.error;
  return { status: r.status, out: (r.stdout || "") + (r.stderr || "") };
}
function must(r, what) {
  if (r.status !== 0) { const e = new Error(what + " 失敗（結束代碼 " + r.status + "）"); e.tail = r.out.split("\n").slice(-40).join("\n"); throw e }
  return r;
}

/* 1. 會進版本控制的檔：用一個暫時的空 git（放在 work 裡）照 .gitignore 列出來；不 commit，也不在專案資料夾留東西 */
function sourceFiles(proj, probeDir) {
  must(run("git", ["init", "-q", "--bare", probeDir]), "git init（暫時的）");
  const r = must(run("git", ["--git-dir=" + probeDir, "--work-tree=" + proj, "-c", "core.quotepath=false", "ls-files", "-o", "--exclude-standard", "-z"]), "git ls-files");
  return r.out.split("\0").filter(Boolean).map(f => f.replace(/\\/g, "/")).sort();
}
/* 檔案清單的指紋：路徑＋內容雜湊，排序後再雜湊（給紀錄用，證明兩邊用的是同一份原始碼） */
function treeHash(root, files) {
  return sha256(files.map(f => f + "\0" + sha256(fs.readFileSync(path.join(root, f)))).join("\n"));
}
function copyFiles(from, to, files) {
  for (const f of files) { const d = path.join(to, f); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(path.join(from, f), d) }
}

/* 工具版本（不寫路徑）：JDK、Node、npm、SDK platform 與 build-tools 的版本、Gradle wrapper jar 的雜湊 */
function toolchain(proj, env) {
  const v = RC.toolVersions(proj, env), sdk = env.ANDROID_HOME, prop = (f, k) => { try { const m = fs.readFileSync(f, "utf8").match(new RegExp("^" + k + "=(.*)$", "m")); return m ? m[1].trim() : null } catch (e) { return null } };
  v.node = process.version;
  try { v.npm = cp.execSync("npm -v", { encoding: "utf8", env }).trim() } catch (e) { v.npm = null }
  if (sdk) {
    v.platformRevision = prop(path.join(sdk, "platforms", "android-" + v.compileSdk, "source.properties"), "Pkg.Revision");
    v.buildTools = (fs.readFileSync(path.join(proj, "android", "variables.gradle"), "utf8").match(/buildToolsVersion\s*=\s*'([\d.]+)'/) || [])[1] || null;
    v.buildToolsRevision = v.buildTools ? prop(path.join(sdk, "build-tools", v.buildTools, "source.properties"), "Pkg.Revision") : null;
  }
  try { v.gradleWrapperJarSha256 = sha256(fs.readFileSync(path.join(proj, "android", "gradle", "wrapper", "gradle-wrapper.jar"))) } catch (e) { v.gradleWrapperJarSha256 = null }
  v.dependencyVerification = fs.existsSync(path.join(proj, "android", "gradle", "verification-metadata.xml"));
  return v;
}

/* 一個成品的比對摘要 */
function compareArtifact(name, refBuf, newBuf) {
  const c = RC.compareBuffers(refBuf, newBuf);
  const pick = s => ({ bytes: s.bytes, sha256: s.sha256, unsignedSha256: s.unsignedSha256, contentSha256: s.contentSha256, entries: s.entries, nonfree: s.nonfree });
  return {
    name, reference: pick(c.a), rebuilt: pick(c.b),
    identical: c.identical, sameUnsignedBytes: c.sameUnsigned, sameContentExcludingSignature: c.sameContent, sameDex: c.sameDex, sameAssets: c.sameAssets, sameResources: c.sameResources,
    diffs: c.diffs.filter(d => d.kind !== "簽章不同").slice(0, 30),
  };
}
/* 判定：APK 要拿掉簽章區塊後逐位元相同；AAB 是 jar 簽章（簽章檔在 ZIP 裡），比解開後的內容 */
const artifactOk = a => /\.aab$/.test(a.name) ? a.sameContentExcludingSignature && a.diffs.length === 0 : a.sameUnsignedBytes;

function cleanRebuild({ proj = HERE, webRepo, webRev, work, reference, gradleHome = null, env = process.env, log = console.log, gradle = null }) {
  if (!webRepo || !webRev || !work || !reference) throw new Error("要給 --web-repo、--web-rev、--work、--reference");
  work = path.resolve(work);
  if (fs.existsSync(work) && fs.readdirSync(work).length) throw new Error("--work 要是全新的空資料夾：" + work);
  fs.mkdirSync(work, { recursive: true });
  const P = path.join(work, "xiangqi-android"), WEB = path.join(work, "web"), steps = [];
  const step = (k, f) => { const t = Date.now(); log("▶ " + k); const r = f(); steps.push({ step: k, seconds: Math.round((Date.now() - t) / 100) / 10 }); return r };

  const files = step("複製原生專案（只有會進版本控制的檔）", () => { const fl = sourceFiles(proj, path.join(work, "probe.git")); copyFiles(proj, P, fl); return fl });
  const web = step("取公開倉庫的指定 commit", () => {
    must(run("git", ["-c", "core.autocrlf=false", "clone", "-q", "--no-checkout", path.resolve(webRepo), WEB]), "git clone");
    must(run("git", ["-C", WEB, "-c", "core.autocrlf=false", "-c", "advice.detachedHead=false", "checkout", "-q", webRev]), "git checkout " + webRev);
    const commit = must(run("git", ["-C", WEB, "rev-parse", "HEAD"]), "git rev-parse").out.trim();
    let origin = null; try { origin = run("git", ["-C", path.resolve(webRepo), "remote", "get-url", "origin"]).out.trim() || null } catch (e) { }
    return { commit, origin };
  });
  const npmEnv = Object.assign({}, env, { npm_config_cache: path.join(work, "npm-cache"), npm_config_audit: "false", npm_config_fund: "false", npm_config_update_notifier: "false" });
  step("npm ci（全新快取）", () => must(run(isWin ? "npm.cmd" : "npm", ["ci", "--no-audit", "--no-fund"], { cwd: P, env: npmEnv, shell: isWin }), "npm ci"));
  step("make-www（含 check-build）", () => must(run(process.execPath, [path.join(P, "scripts", "make-www.js"), "--repo", WEB], { cwd: P, env }), "make-www"));
  step("capacitor sync android", () => must(run(process.execPath, [path.join(P, "node_modules", "@capacitor", "cli", "bin", "capacitor"), "sync", "android"], { cwd: P, env: Object.assign({}, env, { CI: "1" }) }), "capacitor sync"));

  const gEnv = Object.assign({}, env, { GRADLE_USER_HOME: gradleHome ? path.resolve(gradleHome) : path.join(work, "gradle-home"), ANDROID_USER_HOME: path.join(work, "android-user-home") });
  fs.mkdirSync(gEnv.ANDROID_USER_HOME, { recursive: true });
  const gw = gradle || path.join(P, "android", isWin ? "gradlew.bat" : "gradlew");
  const gradleRun = (args, what) => must(/\.js$/.test(gw) ? run(process.execPath, [gw, ...args], { cwd: path.join(P, "android"), env: gEnv }) : run(gw, args, { cwd: path.join(P, "android"), env: gEnv }), what);
  step("gradlew assembleDebug（全新 Gradle 快取、全新 debug 金鑰）", () => gradleRun(["assembleDebug", "--no-daemon", "--console=plain"], "assembleDebug"));
  /* 暫時的發布金鑰：就用這個乾淨環境剛產生的 debug 金鑰（公開的預設密碼 android），只證明 release 簽章流程能跑 */
  const signProps = path.join(work, "temp-signing.properties");
  fs.writeFileSync(signProps, ["storeFile=" + path.join(gEnv.ANDROID_USER_HOME, "debug.keystore").replace(/\\/g, "/"), "storePassword=android", "keyAlias=androiddebugkey", "keyPassword=android", ""].join("\n"));
  step("gradlew assembleRelease bundleRelease（暫時的 debug 金鑰）", () => gradleRun(["assembleRelease", "bundleRelease", "-PxqSigning=" + signProps, "--no-daemon", "--console=plain"], "assembleRelease bundleRelease"));

  const outDir = path.join(P, "android", "app", "build", "outputs"), arts = [];
  for (const a of ARTIFACTS) {
    const ref = path.join(reference, a.name), got = path.join(outDir, a.out);
    if (!fs.existsSync(ref)) throw new Error("參考成品不見了：" + a.name);
    if (!fs.existsSync(got)) throw new Error("重建沒有產生 " + a.out);
    arts.push(compareArtifact(a.name, fs.readFileSync(ref), fs.readFileSync(got)));
  }
  let site = null; try { site = JSON.parse(fs.readFileSync(path.join(P, "www", "native-build.json"), "utf8")) } catch (e) { }
  /* 重建的 release APK 的 manifest（版本號、權限）：有 aapt2 才讀得到 */
  const manifest = RC.manifestInfo(path.join(outDir, ARTIFACTS[1].out), RC.findAapt2(env.ANDROID_HOME));
  return {
    ok: arts.every(artifactOk), work, steps, artifacts: arts, manifest,
    source: { files: files.length, treeSha256: treeHash(P, files), originalTreeSha256: treeHash(proj, files) },
    web: Object.assign(web, { siteVersion: site && site.siteVersion, html: site && site.html, files: site && site.files }),
    tools: toolchain(P, env),
    fresh: { gradleUserHome: !gradleHome, androidUserHome: true, npmCache: true, nodeModules: true, buildDirs: true },
  };
}

/* 紀錄：不寫路徑；時間只寫 UTC */
function makeRecord(r, now = new Date()) {
  return {
    schema: "xq-android-rebuild-record/1",
    builtAtUtc: new Date(now).toISOString(),
    method: "照 xiangqi-android/REBUILD.md 在全新資料夾重建（scripts/clean-rebuild.js）",
    fresh: r.fresh,
    source: r.source,
    web: { origin: r.web.origin, commit: r.web.commit, siteVersion: r.web.siteVersion, html: r.web.html, files: r.web.files },
    tools: r.tools,
    manifest: r.manifest || null,
    signing: "參考建置與重建各用自己那個環境的 debug 金鑰（不是正式金鑰）；比對時拿掉簽章",
    artifacts: r.artifacts.map(a => Object.assign({}, a, { ok: artifactOk(a) })),
    allMatch: r.ok,
    steps: r.steps,
  };
}
const recordText = rec => JSON.stringify(rec, null, 1) + "\n";

module.exports = { sourceFiles, treeHash, copyFiles, toolchain, compareArtifact, artifactOk, cleanRebuild, makeRecord, recordText, ARTIFACTS };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  try {
    const r = cleanRebuild({ webRepo: opt("--web-repo"), webRev: opt("--web-rev"), work: opt("--work"), reference: opt("--reference"), gradleHome: opt("--gradle-home") });
    for (const x of r.artifacts) console.log(`${artifactOk(x) ? "✔" : "✘"} ${x.name}：參考 ${x.reference.sha256.slice(0, 16)}…／重建 ${x.rebuilt.sha256.slice(0, 16)}…；拿掉簽章後${x.sameUnsignedBytes ? "逐位元相同" : "不同"}；內容（不含簽章）${x.sameContentExcludingSignature ? "相同" : "不同"}` + (x.diffs.length ? "；差異：" + x.diffs.map(d => d.kind + " " + d.name).join("、") : ""));
    console.log(`原生專案 ${r.source.files} 個檔，原始碼指紋 ${r.source.treeSha256 === r.source.originalTreeSha256 ? "跟原專案一致" : "跟原專案不同"}；網頁 ${r.web.siteVersion}（commit ${String(r.web.commit).slice(0, 12)}）`);
    if (opt("--out")) { fs.writeFileSync(opt("--out"), recordText(makeRecord(r))); console.log("紀錄：" + opt("--out")) }
    console.log(r.ok ? "✔ 乾淨環境重建：三個成品拿掉簽章後都跟參考建置一致" : "✘ 乾淨環境重建有不一致（見上面）");
    process.exit(r.ok ? 0 : 1);
  } catch (e) { console.log("✘ " + e.message + (e.tail ? "\n" + e.tail : "")); process.exit(2) }
}
