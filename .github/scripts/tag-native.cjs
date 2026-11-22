#!/usr/bin/env node
// 象棋千秋 CI：原生版送審前打版本標籤 android-<versionCode>／ios-<build>（W69 流程盤點中 14，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：releases/android.md 規定送審前打 android-<versionCode>，實際一個都沒打過；GPL 的「送審建置號、公開提交、App 內版號」
//   三者對應、App 內原始碼連結都要靠這個標籤。手動步驟會漏，所以改由 P0 閘門通過後觸發 tag-native.yml 打。
// 標籤打在哪（PR #63 審查後，開發者 11/23 選單「打在網頁標籤＋核對變體」）：
//   - 標籤指向 web-<網頁版號> 的提交：原生版只從網頁發布的版本建置，網頁程式跟安裝包一樣。
//     不打在 main 最新提交：建包到觸發之間 main 可能又合併了別的網頁改動，標籤會含安裝包裡沒有的程式（iMac Claude 2 審查）。
//   - 該版的原生差異（source/xiangqi-android-variants/<變體>/）是建包後才提交進 main 的：輸入 variant_commit（那個提交），
//     要在 main 的歷史裡、是 web 標籤的後代；Android 另外核對該提交裡 versionCode 等於建置號的 VARIANT-MANIFEST.json，
//     它的 webCommit 要正好是 web 標籤的提交、siteVersion 要等於網頁版號。標籤說明寫上變體提交與安裝包 SHA-256。
//   - iOS 目前沒有對應清單：只核對 variant_commit 在 main 上、是 web 標籤的後代（有清單後再補核對）。
// 其他規則（輸入一律經環境變數，先用嚴格格式驗過才拿來用；git 用參數陣列呼叫，不經過殼層）：
//   - 平台只准 android、ios；建置號 ^[1-9]\d{0,9}$；網頁版號 ^\d{8}-\d{4}$；變體提交 40 碼小寫十六進位；安裝包 SHA-256 64 碼
//   - 同名標籤已在 web 標籤的提交 → 不動（結束代碼 0）；指向別的提交 → 不覆寫（結束代碼 1）
//   - 只在 main 上跑：在 GitHub Actions 裡 GITHUB_REF 不是 refs/heads/main 就拒絕（別的分支可以改這支程式）
//   P0 閘門通過與否這裡驗不到（在建包的電腦上跑）；觸發的那一步寫在 releases/android.md。
// 用法：XQ_PLATFORM=android XQ_BUILD=26112301 XQ_WEB=20261123-0900 XQ_VARIANT_COMMIT=<40 碼> XQ_PKG_SHA256=<64 碼> node .github/scripts/tag-native.cjs [--dry-run]
// 結束代碼：0 打好了或本來就有；1 輸入不對、核對不過、同名標籤指向別的提交、不在 main；2 讀不到 git
"use strict";
const cp = require("child_process");
const PLATFORMS = ["android", "ios"], BUILD = /^[1-9]\d{0,9}$/, WEB = /^\d{8}-\d{4}$/, SHA1 = /^[0-9a-f]{40}$/, SHA256 = /^[0-9a-f]{64}$/;
const VARIANTS = "source/xiangqi-android-variants";
const str = (x) => String(x == null ? "" : x);

/* 純函式：決定要不要打。tags＝{ 標籤名: 指向的提交（已剝成提交） }；head＝main 最新提交；isAncestor(a, b)＝a 是不是 b 的祖先（含相同）；
   manifests＝variant_commit 裡每一份變體清單 [{ path, json }]（讀不到或不是 JSON 的 json 是 null） */
function decide({ platform, build, web, variantCommit, pkgSha256, tags, head, isAncestor, manifests = [] }) {
  if (!PLATFORMS.includes(platform)) return { action: "error", why: "平台只能是 android 或 ios：" + JSON.stringify(platform) };
  if (!BUILD.test(str(build))) return { action: "error", why: "建置號格式不對（要 1～10 位數字、不能 0 開頭）：" + JSON.stringify(build) };
  if (!WEB.test(str(web))) return { action: "error", why: "網頁版號格式不對（要 YYYYMMDD-HHMM）：" + JSON.stringify(web) };
  if (!SHA1.test(str(variantCommit))) return { action: "error", why: "變體提交要寫完整 40 碼（小寫）：" + JSON.stringify(variantCommit) };
  if (!SHA256.test(str(pkgSha256))) return { action: "error", why: "安裝包 SHA-256 要 64 碼小寫十六進位：" + JSON.stringify(pkgSha256) };
  const webTag = "web-" + web, base = tags[webTag];
  if (!base) return { action: "error", why: `找不到網頁標籤 ${webTag}：原生版只能從網頁發布的版本建置` };
  if (!isAncestor(variantCommit, head)) return { action: "error", why: `變體提交 ${variantCommit.slice(0, 7)} 不在 main 的歷史裡：原生差異要先合併進 main` };
  if (!isAncestor(base, variantCommit)) return { action: "error", why: `變體提交 ${variantCommit.slice(0, 7)} 不是網頁標籤 ${webTag}（${base.slice(0, 7)}）的後代` };
  let manifest = null;
  if (platform === "android") {
    const hit = manifests.filter((m) => m.json && String(m.json.versionCode) === str(build));
    if (hit.length !== 1) return { action: "error", why: `變體提交裡 versionCode ${build} 的 VARIANT-MANIFEST.json 要正好 1 份，找到 ${hit.length} 份` };
    manifest = hit[0];
    if (manifest.json.webCommit !== base) return { action: "error", why: `${manifest.path} 的 webCommit（${str(manifest.json.webCommit).slice(0, 7)}）不是網頁標籤 ${webTag} 的提交（${base.slice(0, 7)}）` };
    if (manifest.json.siteVersion != null && str(manifest.json.siteVersion) !== web) return { action: "error", why: `${manifest.path} 的 siteVersion（${manifest.json.siteVersion}）跟網頁版號 ${web} 不一樣` };
  }
  const name = platform + "-" + build;
  if (tags[name]) return tags[name] === base ? { action: "skip", name, why: "標籤已經在網頁標籤的提交" } : { action: "error", name, why: `標籤 ${name} 已經指向別的提交 ${tags[name].slice(0, 7)}，不覆寫（同一個建置號只能對應一個提交）` };
  return { action: "create", name, base, webTag, manifest: manifest && manifest.path };
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
  const platform = env.XQ_PLATFORM, build = env.XQ_BUILD, web = env.XQ_WEB, variantCommit = env.XQ_VARIANT_COMMIT, pkgSha256 = env.XQ_PKG_SHA256;
  /* 變體清單只在格式驗過之後讀（variantCommit 不合格式就不拿來當 git 參數） */
  let manifests = [];
  if (platform === "android" && SHA1.test(str(variantCommit))) {
    let list = [];
    try { list = git("ls-tree", "-r", "--name-only", variantCommit, "--", VARIANTS + "/").split("\n").filter((p) => /^source\/xiangqi-android-variants\/[^/]+\/VARIANT-MANIFEST\.json$/.test(p)) } catch (e) { }
    manifests = list.map((p) => { let json = null; try { json = JSON.parse(git("show", `${variantCommit}:${p}`)) } catch (e) { } return { path: p, json } });
  }
  const d = decide({ platform, build, web, variantCommit, pkgSha256, tags, head, isAncestor, manifests });
  if (d.action === "error") { err("不打標籤：" + d.why); return 1 }
  if (d.action === "skip") { log(`${d.name}：${d.why}`); return 0 }
  const label = platform === "android" ? `Android versionCode ${build}` : `iOS build ${build}`;
  const msg = `${label}\n網頁：${d.webTag}（${d.base}）\n原生原始碼：main 提交 ${variantCommit}` + (d.manifest ? `（${d.manifest}）` : "") +
    `\n安裝包 SHA-256：${pkgSha256}\nP0 閘門通過後由 CI 打（.github/workflows/tag-native.yml）`;
  if (dry) { log(`（試跑）會在 ${d.base.slice(0, 7)} 打 ${d.name}：\n${msg}`); return 0 }
  git("tag", "-a", d.name, "-m", msg, d.base);
  git("push", "origin", "refs/tags/" + d.name);
  log(`已打標籤 ${d.name} → ${d.base.slice(0, 7)}（${d.webTag}；原生原始碼 ${variantCommit.slice(0, 7)}）`);
  return 0;
}

module.exports = { decide, run, PLATFORMS, BUILD, WEB, SHA1, SHA256 };
if (require.main !== module) return;
const git = (...a) => cp.execFileSync("git", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], maxBuffer: 64e6 });
process.exit(run({ git, dry: process.argv.includes("--dry-run") }));
