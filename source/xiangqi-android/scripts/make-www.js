#!/usr/bin/env node
// 象棋千秋 Android：從公開倉庫做出 App 裡的網頁成品
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 跟 iOS 的 copy-www.js 不同：這支只用「公開倉庫」裡的檔案（F-Droid 的建置伺服器拿得到的），不讀開發者電腦上的資料夾，
// 也不需要 Capacitor CLI（F-Droid 的 Debian 只有 Node 20，Capacitor CLI 8 要 Node 22），所以可以直接寫進 Android 專案的 assets。
//   1. 先在倉庫裡跑 node source/check-build.js：發布的 index.html 必須是 source/ 組出來的，否則停止
//   2. 把倉庫根目錄的成品複製到輸出資料夾（不含 .git、.github、source/ 等開發用檔案）
//   3. --assets <資料夾>：再把只放 CDN 的大檔（圖、音樂、3D）從一份完整的素材資料夾補進來；沒給就照公開倉庫的瘦身版，
//      App 執行時缺的檔由 m/00-util.js 原本的「404 就改抓 CDN」補（要連網）
//   4. 寫 native-build.json：版本、檔數、大小（不寫建置時間，讓 F-Droid 可以逐位元重現）
// 用法：
//   node scripts/make-www.js --repo <公開倉庫資料夾>                          寫到 www/（之後 npx cap sync android）
//   node scripts/make-www.js --repo <倉庫> --into android/app/src/main/assets/public   直接寫進 Android 專案（F-Droid 用）
//   其他選項：--assets <完整素材資料夾>  --dry（只列出要複製幾個檔，不寫）  --no-check（略過 check-build，不建議）
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const HERE = path.join(__dirname, "..");
/* 倉庫根目錄裡不進 App 的東西：版本控制、CI、原始碼（GPL 對應原始碼在倉庫和 F-Droid 原始碼包裡）、只給 GitHub Pages 用的檔 */
const EXCLUDE = new Set([".git", ".github", ".gitignore", ".gitattributes", ".nojekyll", "source", "node_modules", "android"]);

function listFiles(root, rel = "", out = []) {
  for (const e of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    if (!rel && EXCLUDE.has(e.name)) continue;
    const r = rel ? rel + "/" + e.name : e.name;
    if (e.isDirectory()) listFiles(root, r, out); else if (e.isFile()) out.push(r);
  }
  return out.sort();
}

/* 要複製哪些檔：倉庫的、再加素材資料夾裡倉庫沒有的 */
function planCopy(repo, assets) {
  const fromRepo = listFiles(repo), have = new Set(fromRepo);
  const fromAssets = assets ? listFiles(assets).filter(f => !have.has(f) && f.startsWith("data/")) : [];
  return { fromRepo, fromAssets };
}

function makeWww({ repo, into, assets, dry = false, check = true, log = console.log }) {
  repo = path.resolve(repo);
  for (const f of ["release.json", "index.html", "source/check-build.js"]) if (!fs.existsSync(path.join(repo, f))) throw new Error("倉庫裡找不到 " + f + "：" + repo);
  const rel = JSON.parse(fs.readFileSync(path.join(repo, "release.json"), "utf8"));
  if (check) {
    const r = cp.spawnSync(process.execPath, [path.join(repo, "source", "check-build.js")], { cwd: repo, encoding: "utf8" });
    if (r.status !== 0) throw new Error("check-build 沒通過，發布的 index.html 不是 source/ 組出來的：\n" + (r.stdout || "") + (r.stderr || ""));
    log("✔ check-build：發布的 index.html 是 source/ 組出來的");
  }
  const { fromRepo, fromAssets } = planCopy(repo, assets);
  log(`倉庫 ${fromRepo.length} 個檔` + (assets ? `，素材資料夾補 ${fromAssets.length} 個檔` : "（沒給 --assets：大檔執行時從 CDN 抓）"));
  const meta = { app: "象棋千秋", siteVersion: rel.version || null, html: rel.html || null, sw: rel.sw || null, files: fromRepo.length + fromAssets.length, fromAssets: fromAssets.length, bytes: 0 };
  if (dry) return meta;
  into = path.resolve(into);
  if (path.resolve(into) === path.resolve(repo)) throw new Error("輸出資料夾不能是倉庫本身");
  fs.rmSync(into, { recursive: true, force: true });
  for (const [root, files] of [[repo, fromRepo], [assets, fromAssets]]) {
    for (const f of files) {
      const d = path.join(into, f);
      fs.mkdirSync(path.dirname(d), { recursive: true });
      fs.copyFileSync(path.join(root, f), d);
      meta.bytes += fs.statSync(d).size;
    }
  }
  fs.writeFileSync(path.join(into, "native-build.json"), JSON.stringify(meta, null, 1) + "\n");
  log(`寫好了：${into}（${meta.files} 個檔，${(meta.bytes / 1048576).toFixed(1)} MB，網站版本 ${meta.siteVersion}）`);
  return meta;
}

module.exports = { makeWww, planCopy, listFiles, EXCLUDE };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  const repo = opt("--repo");
  if (!repo) { console.log("用法：node scripts/make-www.js --repo <公開倉庫資料夾> [--into <輸出資料夾>] [--assets <完整素材資料夾>] [--dry]"); process.exit(2) }
  try {
    makeWww({ repo, into: opt("--into") || path.join(HERE, "www"), assets: opt("--assets"), dry: a.includes("--dry"), check: !a.includes("--no-check") });
  } catch (e) { console.log("✘ " + e.message); process.exit(1) }
}
