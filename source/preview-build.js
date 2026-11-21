#!/usr/bin/env node
// 象棋千秋：Cloudflare PR 預覽的建置步驟（W43，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 每個 PR 由 Cloudflare Pages 專案 xiangqi-pr-preview 自動部署一份預覽。原本建置指令寫在 Cloudflare 設定頁，不在倉庫、改了也不經審查；
// 搬到這裡後，設定頁只呼叫 `node source/preview-build.js`，要改步驟就走 PR。
//   1. 用原始碼組出 index.html（source/check-build.js --out index.html），功能 PR 只改 source/，要組過才看得到改動
//   2. 把 __BUILD__ 換成 release.json 的版號：要跟 sw.js 的 VERSION 一致，不然網頁會以為有新版、跳更新提示
//   3. 刪掉超過 25 MB 的檔（Pages 單檔上限；目前只有 engine/pikafish.nnue 48.4 MB，網頁改從 CDN 切塊拿）
//   4. 寫 404.html：Pages 沒有它時，找不到的檔會回首頁（HTTP 200），CDN 失敗時的備援會拿到一頁 HTML
// 用法（在倉庫根目錄）：node source/preview-build.js            Cloudflare 建置時跑這個
//                       node source/preview-build.js --root <資料夾> --skip-build [--limit <位元組>]   只做 2～4（自我測試用；--limit 換大檔門檻）
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const LIMIT = 25 * 1024 * 1024;

/* 把組出來的 index.html 裡的 __BUILD__ 換成版號；找不到或版號格式不對就停，不要部署一份版號錯的預覽 */
function stampBuild(html, version) {
  if (!/^\d{8}-\d{4}[0-9a-z-]*$/.test(String(version || ""))) throw new Error("release.json 的版號不對：" + version);
  if (!html.includes('window.XQ_BUILD="__BUILD__"')) throw new Error("index.html 裡找不到 window.XQ_BUILD=\"__BUILD__\"");
  return html.replace('window.XQ_BUILD="__BUILD__"', `window.XQ_BUILD="${version}"`);
}

/* 找出超過上限的檔（不進 .git、node_modules） */
function bigFiles(root, limit = LIMIT) {
  const out = [];
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === ".git" || e.name === "node_modules") continue;
      const f = path.join(d, e.name);
      if (e.isDirectory()) walk(f); else if (fs.statSync(f).size > limit) out.push(path.relative(root, f).split(path.sep).join("/"));
    }
  })(root);
  return out.sort();
}

function main() {
  const i = process.argv.indexOf("--root"), root = path.resolve(i > 0 ? process.argv[i + 1] : path.join(__dirname, ".."));
  if (!process.argv.includes("--skip-build")) cp.execFileSync(process.execPath, [path.join(root, "source", "check-build.js"), "--out", "index.html"], { cwd: root, stdio: "inherit" });
  const ix = path.join(root, "index.html"), version = JSON.parse(fs.readFileSync(path.join(root, "release.json"), "utf8")).version;
  fs.writeFileSync(ix, stampBuild(fs.readFileSync(ix, "utf8"), version));
  const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8"), m = sw.match(/VERSION="([^"]+)"/);
  if (!m || m[1] !== version) throw new Error(`sw.js 的 VERSION（${m && m[1]}）跟 release.json（${version}）不一致`);
  const li = process.argv.indexOf("--limit"), limit = li > 0 ? Number(process.argv[li + 1]) : LIMIT;
  if (!(limit > 0)) throw new Error("--limit 要是正數");
  const big = bigFiles(root, limit);
  for (const f of big) fs.rmSync(path.join(root, f));
  fs.writeFileSync(path.join(root, "404.html"), "Not found\n");
  console.log(`預覽建置好了：版號 ${version}；刪掉超過 25 MB 的檔 ${big.length ? big.join("、") : "（沒有）"}；寫了 404.html`);
}
module.exports = { stampBuild, bigFiles, LIMIT };
if (require.main === module) { try { main() } catch (e) { console.error("✘ " + e.message); process.exit(1) } }
