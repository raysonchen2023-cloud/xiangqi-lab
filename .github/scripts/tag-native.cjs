#!/usr/bin/env node
// 象棋千秋 CI：原生版送審前打版本標籤 android-<versionCode>／ios-<build>（W69 流程盤點中 14，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：releases/android.md 規定送審前打 android-<versionCode>，實際一個都沒打過；GPL 的「送審建置號、公開提交、App 內版號」
//   三者對應、App 內原始碼連結都要靠這個標籤。手動步驟會漏，所以改由 P0 閘門通過後觸發 tag-native.yml 打。
// 做法（輸入一律經環境變數，先用嚴格格式驗過才拿來當標籤名；git 用參數陣列呼叫，不經過殼層）：
//   - 平台只准 android、ios；建置號 ^[1-9]\d{0,9}$；網頁版號 ^\d{8}-\d{4}$
//   - 對應的 web-<網頁版號> 標籤要存在，而且是這次要打的提交（main 的最新提交）的祖先：原生版只從網頁發布的版本建置
//   - 標籤打在 main 的最新提交：該版的原生差異（source/xiangqi-android-variants/ 等）在發布後才提交，打在網頁標籤上會缺原生原始碼
//   - 同名標籤已在這個提交 → 不動（結束代碼 0）；已指向別的提交 → 不覆寫（結束代碼 1）
//   - 只在 main 上跑：在 GitHub Actions 裡 GITHUB_REF 不是 refs/heads/main 就拒絕（別的分支可以改這支程式）
//   P0 閘門通過與否這裡驗不到（在建包的電腦上跑）；觸發的那一步寫在 releases/android.md。
// 用法：XQ_PLATFORM=android XQ_BUILD=26112301 XQ_WEB=20261123-0900 node .github/scripts/tag-native.cjs [--dry-run]
// 結束代碼：0 打好了或本來就有；1 輸入不對、網頁標籤不存在或不是祖先、同名標籤指向別的提交、不在 main；2 讀不到 git
"use strict";
const cp = require("child_process");
const PLATFORMS = ["android", "ios"], BUILD = /^[1-9]\d{0,9}$/, WEB = /^\d{8}-\d{4}$/;

/* 純函式：決定要不要打。tags＝{ 標籤名: 指向的提交（已剝成提交） }；isAncestor(a, b)＝a 是不是 b 的祖先（含相同） */
function decide({ platform, build, web, tags, head, isAncestor }) {
  if (!PLATFORMS.includes(platform)) return { action: "error", why: "平台只能是 android 或 ios：" + JSON.stringify(platform) };
  if (!BUILD.test(String(build == null ? "" : build))) return { action: "error", why: "建置號格式不對（要 1～10 位數字、不能 0 開頭）：" + JSON.stringify(build) };
  if (!WEB.test(String(web == null ? "" : web))) return { action: "error", why: "網頁版號格式不對（要 YYYYMMDD-HHMM）：" + JSON.stringify(web) };
  const webTag = "web-" + web, base = tags[webTag];
  if (!base) return { action: "error", why: `找不到網頁標籤 ${webTag}：原生版只能從網頁發布的版本建置` };
  if (!isAncestor(base, head)) return { action: "error", why: `網頁標籤 ${webTag}（${base.slice(0, 7)}）不在 main 最新提交 ${head.slice(0, 7)} 的歷史裡` };
  const name = platform + "-" + build;
  if (tags[name]) return tags[name] === head ? { action: "skip", name, why: "標籤已經在這個提交" } : { action: "error", name, why: `標籤 ${name} 已經指向別的提交 ${tags[name].slice(0, 7)}，不覆寫（同一個建置號只能對應一個提交）` };
  return { action: "create", name, base, webTag };
}

/* 主流程（可注入 git 與環境變數，自我測試用）：回傳結束代碼 */
function run({ env = process.env, git, dry = false, log = console.log, err = console.error }) {
  if (env.GITHUB_ACTIONS === "true" && env.GITHUB_REF !== "refs/heads/main") { err("只在 main 上打原生標籤：這次是 " + JSON.stringify(env.GITHUB_REF)); return 1 }
  let head, tags = {};
  try {
    head = git("rev-parse", "HEAD").trim();
    for (const line of git("tag", "-l", "web-*", "android-*", "ios-*", "--format=%(refname:short) %(objectname) %(*objectname)").split("\n").filter(Boolean)) {
      const [n, o, peeled] = line.split(" "); tags[n] = peeled || o;
    }
  } catch (e) { err("讀不到 git：" + e.message); return 2 }
  const isAncestor = (a, b) => { try { git("merge-base", "--is-ancestor", a, b); return true } catch (e) { return false } };
  const platform = env.XQ_PLATFORM, build = env.XQ_BUILD, web = env.XQ_WEB;
  const d = decide({ platform, build, web, tags, head, isAncestor });
  if (d.action === "error") { err("不打標籤：" + d.why); return 1 }
  if (d.action === "skip") { log(`${d.name}：${d.why}`); return 0 }
  const label = platform === "android" ? `Android versionCode ${build}` : `iOS build ${build}`;
  if (dry) { log(`（試跑）會在 ${head.slice(0, 7)} 打 ${d.name}（${label}，網頁基底 ${d.webTag} ${d.base.slice(0, 7)}）`); return 0 }
  git("tag", "-a", d.name, "-m", `${label}（網頁基底 ${d.webTag} ${d.base}；P0 閘門通過後由 CI 打）`, head);
  git("push", "origin", "refs/tags/" + d.name);
  log(`已打標籤 ${d.name} → ${head.slice(0, 7)}（網頁基底 ${d.webTag}）`);
  return 0;
}

module.exports = { decide, run, PLATFORMS, BUILD, WEB };
if (require.main !== module) return;
const git = (...a) => cp.execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
process.exit(run({ git, dry: process.argv.includes("--dry-run") }));
