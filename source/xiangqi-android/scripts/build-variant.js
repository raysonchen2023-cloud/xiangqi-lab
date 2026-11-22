#!/usr/bin/env node
// 象棋千秋 Android：從「網頁發布的 tag」＋「已散佈版本的原生差異」建出要送審的 AAB（W69 流程盤點第 3 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：以前每次都在倉庫外面手寫一支 build.sh。26112201 第一版就漏了 make-www.js 的 --home-art，安裝包少了 81 個首頁素材（P0-IMG 才抓到）；
//   W42 那 7 個舊副本也是靠人記檔名一個一個換。建包步驟不在倉庫，別人也沒辦法照著重建（GPL 要求完全對應的建置腳本）。
// 這支把 source/xiangqi-android-variants/README.md「重建某一版」的步驟寫死，每一步都檢查：
//   1. 網頁：公開倉庫在 --tag 的乾淨工作樹（不碰開發者工作區）
//   2. 原生：source/xiangqi-android 共用建置鏈＋variants/<變體>/android/ 的原生差異
//   3. 原生版網頁：make-www.js（--home-art 必填：首頁離線必要素材少一個就停）
//      → 安裝包裡跟 CDN 現行版不同的「需求清單內素材」一律換成 CDN 那份並核對 SHA-1（W42 不再靠人記檔名）
//      → 變體設定檔的 webRemove（例：封測小包拿掉 data/docs/evidence）→ 套 web-overlay/index.html.patch（套不上就停）→ 遷移頁
//   4. capacitor sync → gradlew bundleRelease（versionCode／versionName／簽章）
//   5. 輸出 <work>/out/xiangqi-<code>-<name>.aab 與 build-record.json（tag、提交、變體、換了哪些檔、AAB 的 SHA-256）
// 之後：aab-to-apk.js 從這個 AAB 產 APK → P0 三項都帶這個 AAB 的 SHA-256 → p0-gate.js
// 用法：node scripts/build-variant.js --repo <公開倉庫> --tag web-<版號> --variant <變體資料夾名> --code <versionCode> --name <versionName>
//         --home-art <開發者電腦 xiangqi-db/art> --work <工作資料夾> [--signing <signing.properties>] [--no-cdn-sync（離線時；不建議送審用）]
//         [--variant-from <變體資料夾>（重建比這支腳本還早的版本時，用較新的變體設定；預設取 tag 裡的）]
//   環境：JAVA_HOME、ANDROID_HOME（照 REBUILD.md）；需要 git、npm、unzip
// 結束代碼：0＝建好；1＝某一步檢查不過（訊息說是哪一步）；2＝用法錯誤
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process"), crypto = require("crypto");

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
const WIN = process.platform === "win32";
const die = (m, c = 1) => { console.error("✘ " + m); process.exit(c) };
const sh = (cmd, args, o = {}) => { const r = cp.spawnSync(cmd, args, { stdio: "inherit", shell: WIN && /\.(cmd|bat)$/i.test(cmd), ...o }); if (r.status !== 0) die(`${o.step || cmd} 失敗（結束代碼 ${r.status}）`); return r };
const out = (cmd, args, o = {}) => cp.execFileSync(cmd, args, { encoding: "utf8", ...o }).trim();
const sha = (alg, b) => crypto.createHash(alg).update(b).digest("hex");
const CDN = "https://xiangqi-cdn.pages.dev/";

/* 需求清單：網頁 data/preload.json 的 items＋big＋big-books.json（跟 check-aab-assets.js 同一套） */
function needSet(dataDir) {
  const S = new Set(), rd = f => { try { return JSON.parse(fs.readFileSync(path.join(dataDir, f), "utf8")) } catch (e) { return null } };
  const p = rd("preload.json"); if (p) { for (const [f] of p.items || []) S.add(f); for (const [f] of p.big || []) S.add(f) }
  for (const b of rd("big-books.json") || []) S.add("data/" + b.key + ".json");
  return S;
}
/* 要換成 CDN 現行版的檔：在需求清單裡、在 www 裡、CDN manifest 有、SHA-1 不同（純函式，測試用） */
function cdnStale(wwwSha1, manFiles, need) {
  const L = []; for (const [f, h] of wwwSha1) { const m = manFiles[f]; if (need.has(f) && m && m[1] && !h.startsWith(m[1])) L.push({ f, was: h.slice(0, 12), cdn: m[1] }) } return L;
}

async function main() {
  const O = { repo: arg("--repo"), tag: arg("--tag"), variant: arg("--variant"), code: arg("--code"), name: arg("--name"), homeArt: arg("--home-art"), work: arg("--work"), signing: arg("--signing"), cdnSync: !process.argv.includes("--no-cdn-sync") };
  for (const k of ["repo", "tag", "variant", "code", "name", "homeArt", "work"]) if (!O[k]) die("用法：node scripts/build-variant.js --repo <公開倉庫> --tag web-<版號> --variant <變體> --code <versionCode> --name <versionName> --home-art <xiangqi-db/art> --work <資料夾> [--signing <檔>]（缺 --" + k.replace(/[A-Z]/g, c => "-" + c.toLowerCase()) + "）", 2);
  if (!/^web-\d{8}-\d{4}$/.test(O.tag)) die("--tag 要是網頁發布的 tag（web-YYYYMMDD-HHMM）：原生版只從網頁發布的版本建", 2);
  if (!/^\d{8}$/.test(O.code)) die("--code 要是 8 位數的 versionCode", 2);
  if (!fs.existsSync(path.join(O.homeArt, "hubmap"))) die("--home-art 不像 xiangqi-db/art（沒有 hubmap/）：首頁離線必要素材會缺（26112201 第一版就是這樣）", 2);
  const W = path.resolve(O.work), WEB = path.join(W, "web"), AND = path.join(W, "xiangqi-android"), WWW = path.join(AND, "www");
  fs.mkdirSync(W, { recursive: true });
  const rec = { schema: "xq-android-build/1", tag: O.tag, variant: O.variant, versionCode: +O.code, versionName: O.name, startedAt: new Date().toISOString() };

  console.log("== 1. 網頁：" + O.tag + " 的乾淨工作樹");
  sh("git", ["-C", O.repo, "fetch", "-q", "origin", `refs/tags/${O.tag}:refs/tags/${O.tag}`], { step: "抓 tag" });
  const commit = out("git", ["-C", O.repo, "rev-list", "-n", "1", O.tag]);
  if (!fs.existsSync(WEB)) sh("git", ["-c", "core.autocrlf=false", "-C", O.repo, "worktree", "add", "-q", "--detach", WEB, O.tag], { step: "建工作樹" });
  const head = out("git", ["-C", WEB, "rev-parse", "HEAD"]), dirty = out("git", ["-C", WEB, "status", "--porcelain"]);
  if (head !== commit) die(`工作樹 ${WEB} 不在 ${O.tag}（${head.slice(0, 7)}≠${commit.slice(0, 7)}）：換一個 --work`);
  if (dirty) die(`工作樹 ${WEB} 有改動：換一個 --work，不要用改過的網頁建包`);
  rec.webCommit = commit;

  console.log("== 2. 原生專案：共用建置鏈＋" + O.variant);
  /* 變體預設取 tag 那一版裡的（GPL：跟發布的網頁同一個提交）；重建比這支腳本還早的版本時，可用 --variant-from 指定較新的變體資料夾（記進 build-record） */
  const VAR = arg("--variant-from") ? path.resolve(arg("--variant-from")) : path.join(WEB, "source", "xiangqi-android-variants", O.variant);
  rec.variantFrom = arg("--variant-from") ? "外部指定：" + VAR : "tag 內";
  if (!fs.existsSync(path.join(VAR, "VARIANT-MANIFEST.json"))) die(`這個 tag 裡沒有變體 ${O.variant}`);
  const VM = JSON.parse(fs.readFileSync(path.join(VAR, "VARIANT-MANIFEST.json"), "utf8"));
  fs.rmSync(AND, { recursive: true, force: true });
  fs.cpSync(path.join(WEB, "source", "xiangqi-android"), AND, { recursive: true });
  fs.cpSync(path.join(VAR, "android"), path.join(AND, "android"), { recursive: true });

  console.log("== 3. 原生版網頁");
  sh(WIN ? "npm.cmd" : "npm", ["ci", "--no-audit", "--no-fund"], { cwd: AND, step: "npm ci" });
  sh(process.execPath, ["scripts/make-www.js", "--repo", WEB, "--home-art", path.resolve(O.homeArt)], { cwd: AND, step: "make-www.js（含首頁離線必要素材檢查）" });
  if (O.cdnSync) {
    const man = await (await fetch(CDN + "cdn-manifest.json")).json().catch(() => null);
    if (!man || !man.files) die("讀不到 CDN 的 cdn-manifest.json：沒辦法確認包裡的素材是不是 CDN 現行版（W42）；網路好了再建，或加 --no-cdn-sync（不建議送審用）");
    const H = new Map(); (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else { const rel = path.relative(WWW, f).split(path.sep).join("/"); if (man.files[rel]) H.set(rel, sha("sha1", fs.readFileSync(f))) } } })(path.join(WWW, "data"));
    const L = cdnStale(H, man.files, needSet(path.join(WWW, "data")));
    for (const x of L) { const r = await fetch(CDN + x.f); if (!r.ok) die(`下載 CDN 現行版失敗：${x.f}（HTTP ${r.status}）`);
      const b = Buffer.from(await r.arrayBuffer()); if (!sha("sha1", b).startsWith(x.cdn)) die(`CDN 下載的 ${x.f} 跟 manifest 對不上`); fs.writeFileSync(path.join(WWW, x.f), b);
      console.log(`  ✔ 換成 CDN 現行版 ${x.f}（${x.was} → ${x.cdn}）`) }
    rec.cdnReplaced = L.map(x => x.f); rec.cdnManifestAt = man.at || null;
  } else rec.cdnReplaced = null;
  for (const r of VM.webRemove || []) { fs.rmSync(path.join(WWW, r), { recursive: true, force: true }); console.log("  ✔ 拿掉 " + r + "（變體設定 webRemove）") }
  rec.webRemove = VM.webRemove || [];
  const patch = path.join(VAR, "web-overlay", "index.html.patch");
  sh("git", ["-c", "core.autocrlf=false", "apply", "--directory=www", "-p1", "--check", patch], { cwd: AND, step: "index.html.patch 套不上新版 index.html（要照新 index 重做補丁）" });
  sh("git", ["-c", "core.autocrlf=false", "apply", "--directory=www", "-p1", patch], { cwd: AND, step: "套 index.html.patch" });
  fs.copyFileSync(path.join(VAR, "web-overlay", "xq-native-migration.html"), path.join(WWW, "xq-native-migration.html"));
  rec.xqBuild = (fs.readFileSync(path.join(WWW, "index.html"), "utf8").match(/XQ_BUILD="([0-9-]+)"/) || [])[1] || null;
  if (rec.xqBuild !== O.tag.slice(4)) die(`www/index.html 的 XQ_BUILD（${rec.xqBuild}）跟 tag（${O.tag.slice(4)}）不同`);

  console.log("== 4. 同步與編譯");
  sh(process.execPath, ["node_modules/@capacitor/cli/bin/capacitor", "sync", "android"], { cwd: AND, step: "capacitor sync" });
  const gargs = ["--no-daemon", "bundleRelease", "-PxqVersionCode=" + O.code, "-PxqVersionName=" + O.name].concat(O.signing ? ["-PxqSigning=" + path.resolve(O.signing)] : []);
  sh(WIN ? path.join(AND, "android", "gradlew.bat") : "./gradlew", gargs, { cwd: path.join(AND, "android"), step: "gradlew bundleRelease" });

  console.log("== 5. 輸出");
  const aab0 = path.join(AND, "android", "app", "build", "outputs", "bundle", "release", "app-release.aab");
  if (!fs.existsSync(aab0)) die("找不到 app-release.aab");
  fs.mkdirSync(path.join(W, "out"), { recursive: true });
  const name = `xiangqi-${O.code}-${O.name}.aab`, aab = path.join(W, "out", name);
  fs.copyFileSync(aab0, aab);
  Object.assign(rec, { aab: name, aabSha256: sha("sha256", fs.readFileSync(aab)), signed: !!O.signing, finishedAt: new Date().toISOString() });
  fs.writeFileSync(path.join(W, "out", "build-record.json"), JSON.stringify(rec, null, 1) + "\n");
  console.log(`✔ ${aab}\n  SHA-256 ${rec.aabSha256}\n  網頁 ${O.tag}（${commit.slice(0, 7)}），換成 CDN 現行版 ${rec.cdnReplaced ? rec.cdnReplaced.length : "（沒做）"} 個檔\n  下一步：aab-to-apk.js 產 APK → P0 三項都帶 --aab-sha ${rec.aabSha256.slice(0, 12)}… → p0-gate.js`);
}
module.exports = { cdnStale, needSet };
if (require.main === module) main().catch(e => die(e.stack || String(e)));
