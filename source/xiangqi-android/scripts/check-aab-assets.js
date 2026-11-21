#!/usr/bin/env node
// 象棋千秋 Android：送審前的安裝包內容檢查（W41 ①，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：程式碼沒錯、測試全過，安裝包卻可能缺東西。封測就出過兩次：
//   W21（1406／26112016）：安裝包沒放首頁底圖等素材，原生版又沒有向 CDN 補抓 → 首頁與多個畫面整片破圖
//   W30（小包 26112102）：超過 20 MB 的檔在 CDN 上切塊，原生補抓只會抓整檔 → 特級大師對局、比賽對局讀不到（404）
// 這支直接拆 AAB 看「玩家拿到的成品」，不看原始碼：
//   1. 需求清單：網頁的 data/preload.json（每個素材的路徑、大小、SHA-1 前 8 碼）＋ big（大檔）＋ big-books.json（比賽對局）
//   2. 安裝包裡有什麼：base 與各 install-time 素材包的 assets/public/
//   3. 原生會不會補抓：dex 裡有沒有 XQCdnFallback 的特徵字串（X-XQ-Cdn-Cache）、會不會接回切塊（W30 的檔名檢查字串）
//   規則：
//     ✘ 首頁離線必要素材（bundle-home-assets.js 的 required）不在包裡：第一次離線開啟就破圖
//     ✘ 包裡的素材跟清單的 SHA-1 對不上：顯示舊圖
//     ✘ 不在包裡、原生又不會補抓的圖片／音樂／模型：<img> 直接破圖
//     ✘ CDN 上切塊的大檔不在包裡、原生又不會接回切塊：讀不到
//     △ 不在包裡、原生不會補抓的 JSON：網頁程式會自己改抓 CDN（00-util.js），列出來但不擋
//     加 --cdn：再實際問 CDN，靠 CDN 補抓的檔要真的在（切塊檔看 .parts.json）
// 用法：node scripts/check-aab-assets.js --aab <檔.aab> [--repo <公開倉庫>] [--cdn] [--out 報告.json]
//   需要 unzip；清單優先用安裝包裡的 data/preload.json，沒有才用 --repo 的 sharedWebCommit 版本
// 結束代碼：0＝沒有 ✘（加 --cdn 時也全部確認過）；1＝有 ✘；2＝用法或環境錯誤；3＝加 --cdn 但有沒確認到的（缺驗，不能送審）
// P0-IMG 通過條件＝加 --cdn 且結束代碼 0
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process"), crypto = require("crypto");

const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
const AAB = arg("--aab"), REPO = arg("--repo"), OUT = arg("--out"), CDN_CHECK = process.argv.includes("--cdn");
const CDN = "https://xiangqi-cdn.pages.dev/";
const MEDIA = /\.(webp|png|jpe?g|gif|svg|mp3|ogg|m4a|wav|glb|gltf|bin|mp4|webm)$/i;
const SPLIT = 20 * 1024 * 1024;   // tools/cdn-deploy.js：超過 20 MB 的檔在 CDN 上切塊
const PARTS_MARKER = "XQ-CDN-PARTS-v1";   // 預留：XQCdnFallback 下次改版時加這個字串常數，檢查就不用靠一般字串猜
const die = (m, c = 2) => { console.error("✘ " + m); process.exit(c) };

const sha1_8 = b => crypto.createHash("sha1").update(b).digest("hex").slice(0, 8);
const { required: HOME_REQUIRED } = require("./bundle-home-assets.js");

async function main() {
  if (!AAB || !fs.existsSync(AAB)) die("用法：node scripts/check-aab-assets.js --aab <檔.aab> [--repo <公開倉庫>] [--cdn] [--out 報告.json]");
  // 1. 解出安裝包的 assets/public 與 dex
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xq-aabchk-"));
  try {
    // 整包解開：有些 unzip 的萬用字元 * 不跨資料夾（"*/assets/public/*" 只會解出頂層 39 個檔，11/21 實測），過濾反而漏檔
    cp.execFileSync("unzip", ["-q", "-o", AAB, "-d", tmp], { stdio: ["ignore", "ignore", "pipe"], maxBuffer: 1e8 });
  } catch (e) { if (!fs.existsSync(path.join(tmp, "base"))) die("unzip 失敗：" + String(e.stderr || e.message).slice(0, 200)) }
  try {
    const modules = fs.readdirSync(tmp).filter(m => fs.existsSync(path.join(tmp, m, "assets", "public")));
    const inPack = new Map();   // data/… → 所在模組的完整路徑
    for (const m of modules) {
      const root = path.join(tmp, m, "assets", "public");
      (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const f = path.join(d, e.name);
        if (e.isDirectory()) walk(f); else inPack.set(path.relative(root, f).split(path.sep).join("/"), f);
      } })(root);
    }
    const dex = fs.readdirSync(path.join(tmp, "base", "dex")).map(f => fs.readFileSync(path.join(tmp, "base", "dex", f)));
    const dexHas = s => dex.some(b => b.includes(Buffer.from(s, "utf8")));
    // 切塊接回（W30）的特徵：只看 ".parts.json" 不夠——26112102 小包帶著全離線版的 XQOfflineAssets，也有這個字面值卻接不回切塊（11/21 PR #11 審查後實測）。
    // W30 才加的是檔名檢查 "[A-Za-z0-9._-]+" 和 "SHA-1"；四個同時出現才算。之後原生加了專用標記 PARTS_MARKER，就直接認標記。
    const native = {
      cdnFallback: dexHas("X-XQ-Cdn-Cache"),
      partsJoin: dexHas(PARTS_MARKER) || ["X-XQ-Cdn-Cache", ".parts.json", "[A-Za-z0-9._-]+", "SHA-1"].every(dexHas),
      offlineAssets: dexHas("xq-offline.json"),
      assetPacks: modules.filter(m => m !== "base"),
    };

    // 2. 需求清單
    const nb = inPack.has("native-build.json") ? JSON.parse(fs.readFileSync(inPack.get("native-build.json"), "utf8")) : {};
    const fromGit = f => { if (!REPO || !nb.sharedWebCommit) return null;
      try { return cp.execFileSync("git", ["-C", REPO, "show", nb.sharedWebCommit + ":" + f], { maxBuffer: 1e9 }) } catch (e) { return null } };
    const readJson = f => inPack.has(f) ? JSON.parse(fs.readFileSync(inPack.get(f), "utf8")) : (b => b && JSON.parse(b.toString("utf8")))(fromGit(f));
    const preload = readJson("data/preload.json");
    if (!preload) die("安裝包裡沒有 data/preload.json，請加 --repo <公開倉庫> 從 sharedWebCommit 讀");
    const bigBooks = readJson("data/big-books.json") || [];
    const need = new Map();
    for (const [f, size, h] of preload.items) need.set(f, { size, h });
    for (const [f, size, h] of preload.big || []) need.set(f, { size, h, big: true });
    for (const b of bigBooks) need.set("data/" + b.key + ".json", { size: b.size, h: b.h, big: true });

    // 3. 逐項判斷
    const R = { red: [], warn: [], ok: { inPack: 0, viaCdn: 0 } };
    const viaCdn = [];
    for (const f of HOME_REQUIRED.map(x => "data/" + x)) if (!inPack.has(f)) R.red.push({ f, why: "首頁離線必要素材不在安裝包裡（第一次離線開啟就破圖，W21）" });
    for (const [f, n] of need) {
      if (inPack.has(f)) {
        if (n.h && sha1_8(fs.readFileSync(inPack.get(f))) !== n.h) R.red.push({ f, why: `安裝包裡的檔跟清單不符（SHA-1 前 8 碼 ${sha1_8(fs.readFileSync(inPack.get(f)))}，清單 ${n.h}）：會顯示舊內容` });
        else R.ok.inPack++;
        continue;
      }
      const split = n.big || n.size > SPLIT;
      // XQOfflineAssets 只回「包裡已有」的檔，大檔不在包裡時救不了；只有 W30 的切塊接回能救（11/21 反測 26112102 時發現原本誤放行）
      if (split && !native.partsJoin) { R.red.push({ f, why: native.cdnFallback ? "CDN 上切塊的大檔不在安裝包裡，原生補抓不會接回切塊（W30）" : "CDN 上切塊的大檔不在安裝包裡，原生也不會補抓" }); continue; }
      if (native.cdnFallback) { R.ok.viaCdn++; viaCdn.push([f, split]); continue; }
      if (MEDIA.test(f)) R.red.push({ f, why: "不在安裝包裡，原生又不會向 CDN 補抓：圖片／音樂直接破（W21）" });
      else { R.warn.push({ f, why: "不在安裝包裡、原生不會補抓；網頁程式會自己改抓 CDN" }); R.ok.viaCdn++; viaCdn.push([f, split]); }
    }

    // 4. 實際問 CDN（加 --cdn）
    if (CDN_CHECK) {
      // 11/21 實測：同時 16 個請求會被 CDN 限流，472 項連線失敗被誤算成「沒有」→ 改成 6 個、失敗等一下再試 4 次；
      // 連不上（沒拿到 HTTP 狀態）只算「沒確認到」（△），拿到 404 等狀態才算確定缺（✘）
      let i = 0; const miss = [], unknown = [];
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      async function worker() { while (i < viaCdn.length) { const [f, split] = viaCdn[i++];
        const url = CDN + f + (split ? ".parts.json" : "");
        let st = -1; for (let t = 0; t < 4 && st !== 200; t++) { if (t) await sleep(800 * t); try { st = (await fetch(url, { method: "HEAD" })).status } catch (e) { st = -1 } }
        // PR #11 審查：只有 404／410 是確定沒有；連不上、429（限流）、5xx 都只算沒確認到
        if (st === 404 || st === 410) miss.push({ f, why: `CDN 上沒有（${split ? ".parts.json " : ""}HTTP ${st}）：靠 CDN 補抓會失敗` });
        else if (st !== 200) unknown.push({ f, why: `CDN 沒確認到（${st === -1 ? "連不上" : "HTTP " + st}，請稍後重跑 --cdn）` }); } }
      await Promise.all(Array.from({ length: 6 }, worker));
      R.red.push(...miss); R.warn.push(...unknown); R.unknown = unknown.length;
    }

    // 5. 報告
    const sum = { aab: path.basename(AAB), siteVersion: nb.siteVersion || null, sharedWebCommit: nb.sharedWebCommit || null, native,
      need: need.size, inPack: R.ok.inPack, viaCdn: R.ok.viaCdn, cdnChecked: CDN_CHECK, red: R.red.length, warn: R.warn.length };
    console.log(`安裝包：${sum.aab}（網站 ${sum.siteVersion}，網頁 ${String(sum.sharedWebCommit).slice(0, 7)}）`);
    console.log(`原生：CDN 補抓 ${native.cdnFallback ? "有" : "沒有"}｜切塊接回 ${native.partsJoin ? "有" : "沒有"}｜離線素材包 ${native.assetPacks.length ? native.assetPacks.join("、") : "沒有"}`);
    console.log(`需求 ${sum.need} 項：在安裝包 ${sum.inPack}、靠 CDN ${sum.viaCdn}${CDN_CHECK ? "（已問過 CDN）" : "（沒問 CDN，加 --cdn 才會實際核對）"}`);
    const group = list => { const g = new Map(); for (const x of list) g.set(x.why, (g.get(x.why) || []).concat(x.f)); return g };
    for (const [why, fs_] of group(R.red)) console.log(`✘ ${fs_.length} 項｜${why}\n    例：${fs_.slice(0, 5).join("、")}`);
    for (const [why, fs_] of group(R.warn)) console.log(`△ ${fs_.length} 項｜${why}\n    例：${fs_.slice(0, 5).join("、")}`);
    const code = exitCode({ red: R.red.length, unknown: R.unknown || 0, cdn: CDN_CHECK });
    console.log(code === 1 ? `✘ 不能送審：${R.red.length} 項`
      : code === 3 ? `△ 還不能送審：CDN 有 ${R.unknown} 項沒確認到（缺驗），請稍後重跑 --cdn`
      : CDN_CHECK ? "✔ 安裝包內容沒有發現會破圖或讀不到的問題（含 CDN 核對）"
      : "✔ 安裝包本身沒有問題；送審前還要加 --cdn 核對 CDN（P0-IMG 通過條件＝--cdn 且結束代碼 0）");
    if (OUT) fs.writeFileSync(OUT, JSON.stringify({ ...sum, unknown: R.unknown || 0, exitCode: code, redItems: R.red, warnItems: R.warn }, null, 1) + "\n");
    process.exitCode = code;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}
/* 結束代碼（PR #11 審查：缺驗不能送審）：有 ✘＝1；加 --cdn 而有沒確認到的＝3；其餘＝0 */
function exitCode({ red, unknown, cdn }) { return red ? 1 : cdn && unknown ? 3 : 0 }
module.exports = { exitCode, PARTS_MARKER };
if (require.main === module) main().catch(e => die(e.stack || String(e)));
