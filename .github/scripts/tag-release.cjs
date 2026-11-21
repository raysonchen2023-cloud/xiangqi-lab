#!/usr/bin/env node
// 象棋千秋 CI：發布合併進 main 後自動打版本標籤 web-<版號>（W60 第 1 期 B1，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：11/20 之後 15 個網頁版本都沒打標籤（手動步驟常漏），原生建置「只能從標籤」、GPL 的版本對應、評比的版本核對都靠標籤。
// 做法：讀 release.json 的 version，核對 sw.js 的 VERSION 一樣，標籤還沒有才在目前的提交打 annotated tag 並推上去。
//   版號先用嚴格格式驗過才拿來當標籤名（不把檔案內容直接嵌進指令）；git 一律用參數陣列呼叫，不經過殼層。
//   main 有分支保護，CI 不提交任何檔案，只打標籤。
// 用法：node .github/scripts/tag-release.cjs [--dry-run]
// 結束代碼：0 打好了或本來就有；1 版號格式不對、sw.js 對不上、同名標籤指向別的提交；2 讀不到檔
"use strict";
const fs = require("fs"), cp = require("child_process");
const VER = /^\d{8}-\d{4}$/;

/* 純函式：決定要不要打。tags＝{ 標籤名: 指向的提交 } */
function decide(version, swText, tags, head) {
  if (!VER.test(String(version || ""))) return { action: "error", why: "release.json 的版號格式不對：" + JSON.stringify(version) };
  const m = /VERSION\s*=\s*["']([^"']+)["']/.exec(swText || "");
  if (!m) return { action: "error", why: "sw.js 裡找不到 VERSION" };
  if (m[1] !== version) return { action: "error", why: `sw.js 的 VERSION（${m[1]}）跟 release.json（${version}）不一致` };
  const name = "web-" + version;
  if (tags[name]) return tags[name] === head ? { action: "skip", name, why: "標籤已經在這個提交" } : { action: "error", name, why: `標籤 ${name} 已經指向別的提交 ${tags[name].slice(0, 7)}，不覆寫` };
  return { action: "create", name };
}

if (require.main === module) {
  const dry = process.argv.includes("--dry-run");
  const git = (...a) => cp.execFileSync("git", a, { encoding: "utf8" }).trim();
  let version, sw;
  try { version = JSON.parse(fs.readFileSync("release.json", "utf8")).version; sw = fs.readFileSync("sw.js", "utf8") } catch (e) { console.error("讀不到 release.json 或 sw.js"); process.exit(2) }
  const head = git("rev-parse", "HEAD"), tags = {};
  for (const line of git("tag", "-l", "web-*", "--format=%(refname:short) %(objectname) %(*objectname)").split("\n").filter(Boolean)) {
    const [n, o, peeled] = line.split(" "); tags[n] = peeled || o;
  }
  const d = decide(version, sw, tags, head);
  if (d.action === "error") { console.error("不打標籤：" + d.why); process.exit(1) }
  if (d.action === "skip") { console.log(`${d.name}：${d.why}`); process.exit(0) }
  if (dry) { console.log(`（試跑）會在 ${head.slice(0, 7)} 打 ${d.name}`); process.exit(0) }
  git("tag", "-a", d.name, "-m", `網頁版 ${version}（發布合併進 main 後由 CI 自動打）`, head);
  git("push", "origin", "refs/tags/" + d.name);
  console.log(`已打標籤 ${d.name} → ${head.slice(0, 7)}`);
}
module.exports = { decide, VER };
