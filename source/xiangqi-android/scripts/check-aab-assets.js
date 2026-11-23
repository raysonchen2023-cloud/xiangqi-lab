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
//     加 --cdn：再實際問 CDN，靠 CDN 補抓的檔要真的在（切塊檔看 .parts.json）；
//       而且安裝包裡的每個 data/ 檔都要跟 CDN 現行版（cdn-manifest.json 的 SHA-1）一樣——W42：倉庫留著 7 個舊副本，包裡的清單也是舊的，
//       只拿包裡自己的 preload.json 驗自己抓不到（W69 流程盤點第 3 項）；manifest 讀不到算缺驗
//   報告（--out）：tool＝"P0-IMG"、aabSha256（這個 AAB 的 SHA-256）、pass（加 --cdn 且結束代碼 0）；送審前由 p0-gate.js 核對
// 用法：node scripts/check-aab-assets.js --aab <檔.aab> [--repo <公開倉庫>] [--cdn] [--out 報告.json]
//   需要 unzip；清單優先用安裝包裡的 data/preload.json，沒有才用 --repo 的 sharedWebCommit 版本
// 金絲雀（2026-11-23，AGENTS.md「P0 出口驗證要難作假」）：每次實跑都用同一套判斷、同一份真實清單故意弄壞三處，三處都要被判 ✘：
//   ①把一個首頁必要素材當成不在包裡 ②把包裡一個檔的雜湊當成不符 ③（--cdn）問 CDN 一個一定不存在的檔，要拿到 404／410
//   有一處沒抓到＝這支檢查失靈（被改鬆、判斷壞掉、CDN 核對一律當成有），報告 pass＝false；沒有 ✘ 時結束代碼 4（看起來全過、其實失靈），有 ✘ 照舊 1
//   ③的不存在檔排進正式 worker 的同一個佇列判斷；CDN 連不上歸缺驗（3）。找不到正常的檔可以弄壞時，真實結果已判出同一類 ✘ 才算成立
//   報告另記 toolPins（tool-pin.js：這支工具與共用模組的雜湊），送審閘門拿去跟 origin/main 比
// 結束代碼：0＝沒有 ✘（加 --cdn 時也全部確認過）；1＝有 ✘；2＝用法或環境錯誤；3＝加 --cdn 但有沒確認到的（缺驗，不能送審）；4＝金絲雀沒被抓到（工具失靈）
// P0-IMG 通過條件＝加 --cdn、結束代碼 0、三隻金絲雀都抓到
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
const TOOL_PINS = require("./tool-pin.js").pinsFor("P0-IMG");   /* 啟動就先算：記的是實際被載入、跑這一次的那一份（PR #66 審查） */

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
    const sha1Of = f => sha1_8(fs.readFileSync(inPack.get(f)));
    const C = classify(need, f => inPack.has(f), sha1Of, native);
    R.red.push(...C.red); R.warn.push(...C.warn); R.ok = C.ok;
    const viaCdn = C.viaCdn;
    /* 金絲雀（AGENTS.md「P0 出口驗證要難作假」）：用同一個 classify、同一份真實清單，故意弄壞兩處，都要被判 ✘ */
    const canary = canaryChecks(need, f => inPack.has(f), sha1Of, native);

    // 4. 實際問 CDN（加 --cdn）
    let man = null, cdnRun = null;   /* PR #66 第四次複審：CDN 金絲雀要用「同一輪連得上」當反證，worker 與 manifest 的結果都留到後面一起判 */
    if (CDN_CHECK) {
      // 11/21 實測：同時 16 個請求會被 CDN 限流，472 項連線失敗被誤算成「沒有」→ 改成 6 個、失敗等一下再試 4 次；
      // 連不上（沒拿到 HTTP 狀態）只算「沒確認到」（△），拿到 404 等狀態才算確定缺（✘）
      let i = 0, ok200 = 0; const miss = [], unknown = [];
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      /* 金絲雀③（PR #66 審查③）：一個一定不存在的檔排進同一個佇列，走同一個 worker 判斷，要被判成「CDN 上沒有」 */
      const probeF = "data/__xq_p0_canary_" + crypto.randomBytes(6).toString("hex") + ".webp";
      const queue = [...viaCdn, [probeF, false]];
      async function worker() { while (i < queue.length) { const [f, split] = queue[i++];
        const url = CDN + f + (split ? ".parts.json" : "");
        let st = -1; for (let t = 0; t < 4 && st !== 200; t++) { if (t) await sleep(800 * t); try { st = (await fetch(url, { method: "HEAD" })).status } catch (e) { st = -1 } }
        if (st === 200) ok200++;
        // PR #11 審查：只有 404／410 是確定沒有；連不上、429（限流）、5xx 都只算沒確認到
        if (st === 404 || st === 410) miss.push({ f, why: `CDN 上沒有（${split ? ".parts.json " : ""}HTTP ${st}）：靠 CDN 補抓會失敗` });
        else if (st !== 200) unknown.push({ f, st, why: `CDN 沒確認到（${st === -1 ? "連不上" : "HTTP " + st}，請稍後重跑 --cdn）` }); } }
      await Promise.all(Array.from({ length: 6 }, worker));
      cdnRun = { probeF, miss, unknown, ok200 };
      /* 金絲雀檔不算進正式結果：判成「沒有」是預期的，拿掉；判成「沒確認到」（CDN 連不上）照樣算缺驗，留在 unknown */
      const realMiss = miss.filter(x => x.f !== probeF);
      R.red.push(...realMiss); R.warn.push(...unknown); R.unknown = unknown.length;
    }
    // 4b. 包裡的檔跟 CDN 現行版逐檔比 SHA-1（W42；加 --cdn 才做）
    if (CDN_CHECK) {
      for (let t = 0; t < 4 && !man; t++) { try { const r = await fetch(CDN + "cdn-manifest.json"); if (r.ok) man = await r.json() } catch (e) {} if (!man) await new Promise(r => setTimeout(r, 800 * (t + 1))) }
      if (!man || !man.files) { R.warn.push({ f: "cdn-manifest.json", why: "讀不到 CDN 的 cdn-manifest.json，沒能核對包裡的檔是不是 CDN 現行版（缺驗）" }); R.unknown = (R.unknown || 0) + 1 }
      else { const H = new Map(); for (const [f2, p] of inPack) if (f2.startsWith("data/") && man.files[f2]) H.set(f2, crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex"));
        const S = staleVsCdn(H, man.files, need); R.red.push(...S.red); R.warn.push(...S.warn); R.cdnCompared = H.size }
    }
    /* 金絲雀③：同一輪有檔拿到 200、或 manifest 讀得到＝CDN 連得上；這時探測檔還記成連不上，就是判斷壞了 */
    if (cdnRun) Object.assign(canary, cdnCanary(cdnRun.probeF, cdnRun.miss, cdnRun.unknown, { ok200: cdnRun.ok200, manOk: !!(man && man.files) }));
    canary.ok = canary.home === true && canary.stale === true && canary.cdn404 === true;

    // 5. 報告
    const sum = { aab: path.basename(AAB), aabSha256: crypto.createHash("sha256").update(fs.readFileSync(AAB)).digest("hex"), siteVersion: nb.siteVersion || null, sharedWebCommit: nb.sharedWebCommit || null, native,
      need: need.size, inPack: R.ok.inPack, viaCdn: R.ok.viaCdn, cdnChecked: CDN_CHECK, red: R.red.length, warn: R.warn.length };
    console.log(`安裝包：${sum.aab}（網站 ${sum.siteVersion}，網頁 ${String(sum.sharedWebCommit).slice(0, 7)}）`);
    console.log(`原生：CDN 補抓 ${native.cdnFallback ? "有" : "沒有"}｜切塊接回 ${native.partsJoin ? "有" : "沒有"}｜離線素材包 ${native.assetPacks.length ? native.assetPacks.join("、") : "沒有"}`);
    console.log(`需求 ${sum.need} 項：在安裝包 ${sum.inPack}、靠 CDN ${sum.viaCdn}${CDN_CHECK ? "（已問過 CDN）" : "（沒問 CDN，加 --cdn 才會實際核對）"}`);
    const group = list => { const g = new Map(); for (const x of list) g.set(x.why, (g.get(x.why) || []).concat(x.f)); return g };
    for (const [why, fs_] of group(R.red)) console.log(`✘ ${fs_.length} 項｜${why}\n    例：${fs_.slice(0, 5).join("、")}`);
    for (const [why, fs_] of group(R.warn)) console.log(`△ ${fs_.length} 項｜${why}\n    例：${fs_.slice(0, 5).join("、")}`);
    console.log(`金絲雀：拿掉首頁素材 ${canary.home ? "✔ 抓到" : "✘ 沒抓到"}｜改掉包裡檔的雜湊 ${canary.stale ? "✔ 抓到" : "✘ 沒抓到"}｜CDN 不存在的檔 ${!CDN_CHECK ? "（沒加 --cdn，沒驗）" : canary.cdn404 ? "✔ 判成沒有" : "✘ " + canary.cdn}`);
    /* PR #66 審查②：沒加 --cdn 時，金絲雀①②沒抓到照樣回 4；③只在加 --cdn 時算，CDN 連不上歸缺驗（3），不算工具失靈 */
    const code = exitCode({ red: R.red.length, unknown: R.unknown || 0, cdn: CDN_CHECK, canaryOk: canaryExitOk(canary, CDN_CHECK) });
    console.log(code === 4 ? "✘ 不能送審：金絲雀沒被抓到，這支檢查本身失靈了，結果不可信"
      : code === 1 ? `✘ 不能送審：${R.red.length} 項`
      : code === 3 ? `△ 還不能送審：CDN 有 ${R.unknown} 項沒確認到（缺驗），請稍後重跑 --cdn`
      : CDN_CHECK ? "✔ 安裝包內容沒有發現會破圖或讀不到的問題（含 CDN 核對）"
      : "✔ 安裝包本身沒有問題；送審前還要加 --cdn 核對 CDN（P0-IMG 通過條件＝--cdn 且結束代碼 0）");
    if (OUT) fs.writeFileSync(OUT, JSON.stringify({ tool: "P0-IMG", ...sum, cdnCompared: R.cdnCompared || 0, unknown: R.unknown || 0, exitCode: code, pass: CDN_CHECK && code === 0 && canary.ok, canary, toolPins: TOOL_PINS, redItems: R.red, warnItems: R.warn }, null, 1) + "\n");
    process.exitCode = code;
  } finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}
/* 結束代碼（PR #11 審查：缺驗不能送審）：有 ✘＝1；沒有 ✘ 但金絲雀沒被抓到＝4（看起來全過、其實檢查本身失靈：4 要防的就是這種）；
   加 --cdn 而有沒確認到的＝3；其餘＝0。有 ✘ 時本來就不能送審，回 1 比較有用，金絲雀結果照樣印出、寫進報告（pass 照樣 false）。
   canaryOk 沒給（舊呼叫）當成 true，只有明確傳 false 才回 4 */
function exitCode({ red, unknown, cdn, canaryOk = true }) { return red ? 1 : canaryOk === false ? 4 : cdn && unknown ? 3 : 0 }

/* 逐項判斷（純函式，金絲雀也用這一支）：need＝需求清單 Map；has(f)＝包裡有沒有；sha1Of(f)＝包裡那份的 SHA-1 前 8 碼；native＝原生能力 */
function classify(need, has, sha1Of, native) {
  const red = [], warn = [], ok = { inPack: 0, viaCdn: 0 }, viaCdn = [];
  for (const f of HOME_REQUIRED.map(x => "data/" + x)) if (!has(f)) red.push({ f, why: "首頁離線必要素材不在安裝包裡（第一次離線開啟就破圖，W21）" });
  for (const [f, n] of need) {
    if (has(f)) {
      const s = n.h ? sha1Of(f) : null;
      if (n.h && s !== n.h) red.push({ f, why: `安裝包裡的檔跟清單不符（SHA-1 前 8 碼 ${s}，清單 ${n.h}）：會顯示舊內容` });
      else ok.inPack++;
      continue;
    }
    const split = n.big || n.size > SPLIT;
    // XQOfflineAssets 只回「包裡已有」的檔，大檔不在包裡時救不了；只有 W30 的切塊接回能救（11/21 反測 26112102 時發現原本誤放行）
    if (split && !native.partsJoin) { red.push({ f, why: native.cdnFallback ? "CDN 上切塊的大檔不在安裝包裡，原生補抓不會接回切塊（W30）" : "CDN 上切塊的大檔不在安裝包裡，原生也不會補抓" }); continue; }
    if (native.cdnFallback) { ok.viaCdn++; viaCdn.push([f, split]); continue; }
    if (MEDIA.test(f)) red.push({ f, why: "不在安裝包裡，原生又不會向 CDN 補抓：圖片／音樂直接破（W21）" });
    else { warn.push({ f, why: "不在安裝包裡、原生不會補抓；網頁程式會自己改抓 CDN" }); ok.viaCdn++; viaCdn.push([f, split]); }
  }
  return { red, warn, ok, viaCdn };
}

/* 金絲雀①②（純函式）：①把一個首頁必要素材當成不在包裡 ②把包裡一個有清單雜湊的檔當成雜湊不符；用同一個 classify 判，兩個都要出現在 ✘
   找不到可以弄壞的對象（包裡沒有首頁素材、清單沒有任何雜湊）＝金絲雀不成立，當成沒抓到（寧可擋） */
function canaryChecks(need, has, sha1Of, native, cls = classify) {   /* cls 可注入：自我測試拿「壞掉的判斷」來證明金絲雀會報警 */
  const out = { home: false, stale: false, homeFile: null, staleFile: null };
  /* 找不到正常的檔可以弄壞時（包裡本來就缺首頁素材、雜湊本來就不符）：同一個判斷對真實狀態已經判出同一類 ✘，就是它有在運作的直接證據，算成立；
     兩者都沒有才算不成立（寧可擋）。真實狀態有 ✘ 本來就不能送審 */
  const real = cls(need, has, sha1Of, native).red;
  const hf = HOME_REQUIRED.map(x => "data/" + x).find(f => has(f));
  if (hf) { out.homeFile = hf; out.home = cls(need, f => f !== hf && has(f), sha1Of, native).red.some(x => x.f === hf && /首頁離線必要素材/.test(x.why)) }   /* PR #66 複審③：要因為首頁那條判出，別條判斷把同一個檔判錯不算 */
  else if (real.some(x => /首頁離線必要素材/.test(x.why))) { out.homeFile = "（包裡本來就缺，真實結果已判出）"; out.home = true }
  const sf = [...need].find(([f, n]) => n.h && has(f) && sha1Of(f) === n.h);
  if (sf) { out.staleFile = sf[0]; out.stale = cls(need, has, f => f === sf[0] ? "00000000" : sha1Of(f), native).red.some(x => x.f === sf[0] && /跟清單不符/.test(x.why)) }
  else if (real.some(x => /跟清單不符/.test(x.why))) { out.staleFile = "（包裡本來就不符，真實結果已判出）"; out.stale = true }
  return out;
}
/* 包裡的檔（路徑 → 完整 SHA-1）跟 CDN manifest（路徑 → [大小, SHA-1 前 12 碼]）比。
   需求清單（preload／大檔／比賽對局）裡的素材不同＝✘：App 先用包裡那份，會顯示舊內容（W42：7 個舊副本，清單也是舊的）；
   清單外的檔（說明文件、回饋清單、校正表等，每次發布或匯出都會更新）不同＝△：多半是 CDN 在建包後更新過，列出來但不擋（26112201 實測 6 項都是這種） */
function staleVsCdn(packSha1, manFiles, need) { const red = [], warn = [];
  for (const [f, h] of packSha1) { const m = manFiles[f]; if (!m || !m[1] || h.startsWith(m[1])) continue;
    if (need && need.has(f)) red.push({ f, why: `安裝包裡的素材跟 CDN 現行版不同（包 ${h.slice(0, 12)}、CDN ${m[1]}）：是倉庫或建包時留下的舊副本（W42），換成 CDN 現行版再建` });
    else warn.push({ f, why: "清單外的檔跟 CDN 現行版不同（多半是 CDN 在建包後更新過；說明文件、回饋清單之類），列出來但不擋" }) }
  return { red, warn } }
/* 金絲雀③的結果（純函式）：probe 被正式 worker 判在 miss＝抓到；在 unknown＝要看狀態碼和同一輪的反證；都不在＝被當成「有」，工具失靈。
   ev.ok200＝同一輪拿到 200 的項數、ev.manOk＝cdn-manifest.json 讀得到：任何一個成立＝CDN 連得上。
   cdnUnreachable（布林）＝CDN 這邊真的有問題（缺驗，可豁免）：探測檔沒拿到狀態（-1）、限流（429）、5xx，而且同一輪沒有連得上的反證。
   其他都是工具失靈（PR #66 第三、四次複審：404 被放進 unknown、沒記狀態碼、狀態碼被寫壞成 -1／503 而同一輪明明連得上） */
function cdnCanary(probe, miss, unknown, ev = {}) {
  const m = miss.some(x => x.f === probe), u = unknown.find(x => x.f === probe);
  if (m) return { cdn404: true, cdnUnreachable: false, cdn: "判成沒有" };
  if (!u) return { cdn404: false, cdnUnreachable: false, cdn: "被當成有（CDN 核對失靈）" };
  const st = u.st, reach = (Number(ev.ok200) || 0) > 0 || ev.manOk === true, flaky = st === -1 || st === 429 || (typeof st === "number" && st >= 500);
  const lab = st == null ? "沒記狀態碼" : st === -1 ? "沒拿到 HTTP 狀態" : st === 403 ? "HTTP 403（拒絕存取）" : "HTTP " + st;
  if (flaky && !reach) return { cdn404: false, cdnUnreachable: true, cdnStatus: st, cdn: `沒確認到（CDN 連不上或暫時出錯，${lab}）` };
  return { cdn404: false, cdnUnreachable: false, cdnStatus: st, cdn: flaky ? `同一輪 CDN 連得上，探測檔卻記成${lab}（CDN 核對失靈）` : `被歸成沒確認到（${lab}，CDN 核對失靈）` };
}
/* 結束代碼用的金絲雀判斷（純函式）：①②一律要抓到；加 --cdn 時③要抓到，或 CDN 真的連不上（cdnUnreachable，歸缺驗 3，不算失靈）；看布林欄位，不看訊息文字 */
function canaryExitOk(c, cdn) { return c.home === true && c.stale === true && (!cdn || c.cdn404 === true || c.cdnUnreachable === true) }
module.exports = { exitCode, PARTS_MARKER, MEDIA, staleVsCdn, classify, canaryChecks, cdnCanary, canaryExitOk };
if (require.main === module) main().catch(e => die(e.stack || String(e)));
