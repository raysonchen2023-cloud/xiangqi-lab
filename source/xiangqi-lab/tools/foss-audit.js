#!/usr/bin/env node
// 第 11 輪 X7：開源授權檢查（給 F-Droid／自由軟體平台審查用；只檢查、不改任何檔）
// 掃 xiangqi-lab/site/（發布到公開倉庫的成品；根目錄的 source/ 是原始碼，跳過），輸出四張表：
//   1. 第三方程式與字型：每個檔是哪個元件、版本、授權、授權全文檔在不在、GPL 的對應原始碼在不在
//   2. 沒登記的第三方嫌疑檔：檔名像別人的（*.min.js、.wasm、字型）或檔頭有別人的版權宣告，卻不在登記表裡
//   3. 追蹤與閉源 SDK：在程式碼裡找常見分析、廣告、崩潰回報 SDK 的網域和呼叫（應該一個都沒有）
//   4. 程式碼裡出現的外部網址：哪些是連線服務、哪些只是說明連結或命名空間
//   另附素材分類（圖片、音樂、3D、語音、棋譜）的授權狀態，數字是實際掃到的檔案數。
// 用法：node xiangqi-lab/tools/foss-audit.js [網站資料夾]     預設 xiangqi-lab/site
//       --json 印計算結果；--out 報告.md 寫成檔案（LF）
// 有缺授權檔、找到追蹤 SDK、或有沒登記的第三方檔 → 以代碼 1 結束。
// 測試：xiangqi-lab/tools/test-foss-audit.js
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto");

/* 第三方元件登記表（來源：site/licenses/README.md、data/docs/credits.md；版本、授權照那兩份） */
const KNOWN = [
  { name: "three.js", ver: "r149", license: "MIT", files: ["three.min.js", "GLTFLoader.mjs", "BufferGeometryUtils.mjs"], lic: ["licenses/three.js-MIT.txt"], note: "GLTFLoader.mjs、BufferGeometryUtils.mjs 只改了 import 那幾行（改用 App 已載入的 window.THREE）" },
  { name: "jsQR", ver: "1.4.0", license: "Apache-2.0", files: ["jsQR.min.js"], lic: ["licenses/jsQR-Apache-2.0.txt"] },
  { name: "QRCode.js（davidshimjs）", ver: "master（SHA-1 2d06c1f823f3…）", license: "MIT", files: ["qrcode.min.js"], lic: ["licenses/qrcodejs-MIT.txt"] },
  { name: "opencc-js（含 OpenCC 字典）", ver: "未記錄", license: "MIT＋Apache-2.0（字典）", files: ["opencc-cn2t.js", "opencc-t2cn.js"], lic: ["LICENSE-opencc-js.txt", "licenses/OpenCC-dictionary-Apache-2.0.txt"] },
  { name: "Pikafish 引擎（WebAssembly）", ver: "Pikafish-2026-09-06", license: "GPL-3.0", files: ["engine/pikafish.wasm", "engine/pikafish.js"], lic: ["LICENSE-Pikafish-GPL3.txt"], src: ["pikafish-src/uci.cpp", "pikafish-src/build-wsl.sh"], note: "對應原始碼＝上游標籤 Pikafish-2026-09-06＋改過的 uci.cpp＋建置腳本（pikafish-src/）；pikafish.js 是 Emscripten 產生的載入程式" },
  { name: "Pikafish 神經網路權重", ver: "隨 Pikafish-2026-09-06", license: "Pikafish NNUE 授權（未經許可不得商用，**不是自由授權**）", files: ["engine/pikafish.nnue"], lic: ["NNUE-License.md"], nonFree: true },
  { name: "芫荽 Iansui（子集）", ver: "未記錄", license: "OFL-1.1", files: ["data/fonts/xq-iansui.woff2"], lic: ["licenses/font-Iansui-OFL.txt"] },
  { name: "全字庫正楷體（子集）", ver: "未記錄", license: "OFL-1.1", files: ["data/fonts/xq-twkai.woff2"], lic: ["licenses/font-TWKai-OFL.txt"] },
  { name: "霞鶩文楷 TC（子集）", ver: "未記錄", license: "OFL-1.1", files: ["data/fonts/xq-wenkai.woff2"], lic: ["licenses/font-LXGWWenKaiTC-OFL.txt"] },
  { name: "源流明體（子集）", ver: "未記錄", license: "OFL-1.1", files: ["data/fonts/xq-genryu.woff2"], lic: ["licenses/font-GenRyuMin-OFL.txt"] },
  { name: "朱雀仿宋（子集）", ver: "未記錄", license: "OFL-1.1", files: ["data/fonts/xq-zhuque.woff2"], lic: ["licenses/font-Zhuque-OFL.txt"] },
  { name: "仙人掌明體（子集）", ver: "未記錄", license: "OFL-1.1", files: ["data/fonts/xq-cactus.woff2"], lic: ["licenses/font-CactusSerif-license.md"] },
  { name: "源雲明體（子集）", ver: "未記錄", license: "OFL-1.1", files: ["data/fonts/xq-genwan.woff2"], lic: ["licenses/font-GenWanMin-OFL.txt"] }];
/* 自己寫的程式（© 陳泓昇；11/13 起 GPL-3.0-or-later，倉庫根目錄 LICENSE；原始碼在 source/） */
const OWN = ["index.html", "core.js", "engine.js", "local.js", "net.js", "bot3d.js", "map3d.js", "park3d.js", "zh.js", "sw.js", "three-shim.mjs"];
/* 追蹤、廣告、崩潰回報、閉源 SDK 的特徵（網域或呼叫） */
const TRACKERS = [
  ["Google Analytics／Tag Manager", /google-analytics\.com|googletagmanager\.com|\bgtag\s*\(|\bga\s*\(\s*['"]create/],
  ["Firebase／Crashlytics", /firebaseio\.com|firebasejs|firebase\.google\.com|crashlytics|app-measurement\.com/i],
  ["Sentry", /sentry\.io|@sentry\/|Sentry\.init/],
  ["Mixpanel／Amplitude／Segment／PostHog", /mixpanel|amplitude\.com|cdn\.segment\.com|posthog/i],
  ["Hotjar／Microsoft Clarity", /hotjar|clarity\.ms/i],
  ["Facebook SDK／Pixel", /connect\.facebook\.net|\bfbq\s*\(/],
  ["廣告（AdSense、DoubleClick）", /doubleclick\.net|adsbygoogle|googlesyndication|googleadservices/i],
  ["推播與歸因（OneSignal、AppsFlyer、Adjust、Branch）", /onesignal|appsflyer|adjust\.com|branch\.io/i],
  ["崩潰與效能監控（Bugsnag、New Relic、Datadog、App Center）", /bugsnag|newrelic|nr-data\.net|datadoghq|appcenter\.ms/i],
  ["網站統計（Matomo、Plausible、Yandex、百度、CNZZ、友盟）", /matomo|piwik|plausible\.io|mc\.yandex|hm\.baidu\.com|cnzz\.com|umeng/i]];
/* 程式碼裡出現的外部網址怎麼分類 */
const HOSTS = [
  [/^x{4,}\./, "程式註解裡的範例網址（不是連線）", "ns"],
  [/^broker\.emqx\.io$/, "線上大廳 MQTT 的備用伺服器（EMQX 公開免費伺服器；非自由網路服務）", "net"],
  [/emqxsl\.com$|emqx/, "線上大廳 MQTT（開發者租用的 EMQX Cloud，新加坡；非自由網路服務）", "net"],
  [/^xiangqi-cdn\.pages\.dev$/, "圖片和大檔（開發者自己的 Cloudflare Pages）", "own"],
  [/^raysonchen2023-cloud\.github\.io$/, "網站本身（GitHub Pages）", "own"],
  [/^(script|docs)\.google\.com$/, "意見回饋（Google 表單；非自由網路服務）", "net"],
  [/open-meteo\.com$/, "問小帥查天氣（Open-Meteo，玩家自己問才連）", "net"],
  [/wikipedia\.org$/, "問小帥查百科（維基百科，玩家自己問才連）", "net"],
  [/^(www\.google\.com|gemini\.google\.com)$/, "外連按鈕（玩家按了才開，非自由網路服務）", "link"],
  [/^ntfy\.sh$/, "開發者模式找電腦位址（ntfy，自由軟體服務；玩家用不到）", "net"],
  [/^github\.com$/, "說明連結", "link"],
  [/^www\.w3\.org$/, "XML 命名空間（不是連線）", "ns"],
  [/jsdelivr\.(com|net)$/, "jsQR 檔頭的註解（不是連線）", "ns"],
  [/^www\.cccs\.org\.tw$/, "棋規出處連結（中華民國象棋文化協會）", "link"],
  [/^(host|x|example\.(org|com))$/, "程式裡的範例或預設字串（不是連線）", "ns"]];
/* 素材分類（狀態照 credits.md；檔數是實際掃到的） */
const ASSETS = [
  ["字型 data/fonts/*.woff2", p => /^data\/fonts\/.*\.woff2$/.test(p), "OFL-1.1", "已確認（全文在 licenses/）", "自由"],
  ["3D 模型 *.glb", p => /\.glb$/.test(p), "Tripo 付費 API 產出，權利歸開發者", "已確認（付款紀錄由開發者保存）", "CC BY-NC-SA 4.0（11/13 起；限非商業，不算自由）"],
  ["背景音樂 data/bgm", p => /^data\/bgm\//.test(p), "Gemini Lyria 生成（AI）", "待開發者確認", "CC BY-NC-SA 4.0（11/13 起；限非商業，不算自由）"],
  ["走棋音效 data/sfx", p => /^data\/sfx\//.test(p), "程式合成（自有，腳本在 xiangqi-db/tools/audio_src/）", "已確認", "CC BY-NC-SA 4.0（11/13 起；限非商業，不算自由）"],
  ["語音 data/voice", p => /^data\/voice\//.test(p), "Windows 內建語音合成輸出", "待開發者確認（灰色）", "可能不能再散布"],
  ["比賽與大師棋譜 data/gmgames.json、tour-*.json", p => /^data\/(gmgames|tour-[^/]*)\.json$/.test(p), "chasoft 資料庫，沒有授權檔", "待開發者確認", "授權不明"],
  ["古譜 data/{juzhongmi,meihuapu,shiqingyaqu,kaiju,canju}.json", p => /^data\/(juzhongmi|meihuapu|shiqingyaqu|kaiju|canju)\.json$/.test(p), "明清古譜（公有領域）；數位化來自 chasoft", "古譜本身已確認；數位整理待確認", "授權不明"],
  ["圖片 *.webp／*.png／*.jpg（data/ 底下）", p => /^data\//.test(p) && /\.(webp|png|jpe?g|gif|avif)$/i.test(p) && !/^data\/docs\/evidence\//.test(p), "AI 生成（Gemini、部分 OpenAI），開發者修圖", "待開發者確認（逐張來源 API 或 App）", "CC BY-NC-SA 4.0（11/13 起；限非商業，不算自由）"],
  ["說明文件與證據截圖 data/docs", p => /^data\/docs\//.test(p), "© 陳泓昇", "自有", "CC BY-NC-SA 4.0（11/13 起；限非商業，不算自由）"]];

const SKIP_DIRS = new Set([".git", "node_modules"]);
/* 倉庫根目錄的 source/ 是 App 的原始碼（11/13 起公開，GPL-3.0-or-later），不是發布出去的成品：
   裡面的 foss-audit.js、oss-scan.js 本身就寫著追蹤 SDK 的規則文字、測試工具也有別人的檔名，掃進來會誤報，所以只跳過根目錄這一層的 source/ */
const SKIP_TOP = new Set(["source"]);
const CODE = /\.(js|mjs|html|webmanifest)$/i;
function walk(root) {
  const out = [];
  (function w(d, rel) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { if (SKIP_DIRS.has(e.name) || (!rel && e.isDirectory() && SKIP_TOP.has(e.name))) continue; const p = path.join(d, e.name), r = rel ? rel + "/" + e.name : e.name; if (e.isDirectory()) w(p, r); else out.push(r) } })(root, "");
  return out.sort();
}
const head = (f, n) => { try { const fd = fs.openSync(f, "r"), b = Buffer.alloc(n), k = fs.readSync(fd, b, 0, n, 0); fs.closeSync(fd); return b.slice(0, k).toString("utf8") } catch (e) { return "" } };
const sha12 = f => { try { return crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex").slice(0, 12) } catch (e) { return null } };
/* 一段程式碼裡的追蹤特徵：回傳 [[種類, 行號, 那一行的片段]] */
function scanTrackers(text) {
  const hits = [], lines = String(text).split("\n");
  for (const [nm, re] of TRACKERS) for (let i = 0; i < lines.length; i++) { const m = re.exec(lines[i]); if (m) { hits.push([nm, i + 1, lines[i].slice(Math.max(0, m.index - 30), m.index + 50).trim()]); break } }
  return hits;
}
/* 網址：有協定開頭的（https://、wss://），加上引號裡只寫網域的（例如 MQTT 伺服器 "xxx.emqxsl.com"）；檔名（.js、.json）不會被當成網域 */
function hostsOf(text) {
  const s = new Set(), t = String(text);
  for (const m of t.matchAll(/\b(?:https?|wss?):\/\/([a-z0-9][a-z0-9.-]*[a-z0-9])/gi)) s.add(m[1].toLowerCase());
  for (const m of t.matchAll(/["'`]([a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|net|org|io|dev|sh|tw|app|cn|cloud))(?::\d+)?(?:\/[^"'`\s]*)?["'`]/gi)) s.add(m[1].toLowerCase());
  return [...s];
}
const classifyHost = h => { for (const [re, what, kind] of HOSTS) if (re.test(h)) return { what, kind }; return { what: "未分類（要人工看）", kind: "unknown" } };

function audit(site) {
  const files = walk(site), has = new Set(files), known = new Map();
  for (const k of KNOWN) for (const f of k.files) known.set(f, k);
  const comps = KNOWN.map(k => {
    const present = k.files.filter(f => has.has(f)), missLic = k.lic.filter(f => !has.has(f)), missSrc = (k.src || []).filter(f => !has.has(f));
    return { name: k.name, ver: k.ver, license: k.license, files: k.files, present, absent: k.files.filter(f => !has.has(f)), lic: k.lic, missLic, src: k.src || [], missSrc, nonFree: !!k.nonFree, note: k.note || "", sha: Object.fromEntries(present.map(f => [f, sha12(path.join(site, f))])) };
  });
  /* 沒登記的第三方嫌疑檔 */
  const suspects = [];
  for (const f of files) {
    if (known.has(f) || OWN.includes(f)) continue;
    const base = path.basename(f), ext = path.extname(f).toLowerCase();
    let why = null;
    if (/\.min\.(js|mjs)$/i.test(base)) why = "檔名是 .min.js（通常是別人的程式庫）";
    else if ([".wasm", ".nnue", ".woff", ".woff2", ".ttf", ".otf"].includes(ext)) why = "引擎、權重或字型檔";
    else if (/\.(js|mjs)$/i.test(f)) { const h = head(path.join(site, f), 1500); if (/@license|SPDX-License-Identifier|Copyright\s*(\(c\)|©|\d{4})|\(c\)\s*\d{4}/i.test(h) && !/陳泓昇/.test(h)) why = "檔頭有別人的版權或授權宣告"; else if (!f.includes("/")) why = "根目錄的程式檔，不在自有清單也不在登記表"; }
    if (why) suspects.push({ file: f, why });
  }
  /* 追蹤 SDK＋外部網址：只掃程式碼（根目錄和 engine/ 的 js、mjs、html），data/ 底下是資料 */
  const trackers = [], hosts = {};
  for (const f of files) {
    if (!CODE.test(f) || f.startsWith("data/")) continue;
    const t = fs.readFileSync(path.join(site, f), "utf8");
    for (const [nm, line, snip] of scanTrackers(t)) trackers.push({ file: f, kind: nm, line, snip });
    for (const h of hostsOf(t)) (hosts[h] = hosts[h] || []).push(f);
  }
  const hostList = Object.entries(hosts).sort((a, b) => a[0] < b[0] ? -1 : 1).map(([h, fs_]) => ({ host: h, files: fs_, ...classifyHost(h) }));
  const assets = ASSETS.map(([nm, test, lic, st, free]) => { const L = files.filter(test); let bytes = 0; for (const f of L) { try { bytes += fs.statSync(path.join(site, f)).size } catch (e) { } } return { name: nm, count: L.length, mb: Math.round(bytes / 1048576 * 10) / 10, license: lic, status: st, free } });
  const docs = ["licenses/README.md", "LICENSE-Pikafish-GPL3.txt", "NNUE-License.md", "README.md", "CONTRIBUTING.md", "data/docs/credits.md", "data/fonts/LICENSES.md", "pikafish-src/uci.cpp", "pikafish-src/build-wsl.sh"].map(f => ({ file: f, ok: has.has(f) }));
  const appLicense = files.filter(f => /^(LICEN[CS]E|COPYING)(\.(md|txt))?$/i.test(f));
  const problems = [];
  for (const c of comps) { if (c.present.length && c.missLic.length) problems.push(`${c.name} 缺授權全文：${c.missLic.join("、")}`); if (c.present.length && c.missSrc.length) problems.push(`${c.name} 缺對應原始碼：${c.missSrc.join("、")}`) }
  for (const t of trackers) problems.push(`${t.file} 第 ${t.line} 行疑似追蹤 SDK（${t.kind}）`);
  for (const s of suspects) problems.push(`沒登記的第三方嫌疑檔 ${s.file}（${s.why}）`);
  const sourceSkipped = SKIP_TOP.has("source") && fs.existsSync(path.join(site, "source"));
  return { site, files: files.length, sourceSkipped, comps, suspects, trackers, hosts: hostList, assets, docs, appLicense, problems };
}

const yes = b => b ? "✔" : "✘";
function renderMd(A) {
  const o = [];
  o.push(`掃描：\`${A.site.split(path.sep).join("/").replace(/^.*\/(xiangqi-lab\/site)$/, "$1")}\`，共 ${A.files} 個檔（不含 .git${A.sourceSkipped ? "；根目錄的 source/ 是原始碼，不算成品、沒有掃" : ""}）。`, "");
  o.push(A.problems.length ? `**有 ${A.problems.length} 個問題：**` : "**授權全文齊全、沒有找到追蹤或閉源 SDK、沒有沒登記的第三方檔。**");
  for (const p of A.problems) o.push("- " + p);
  o.push("", "### 1. 第三方程式與字型", "", "| 元件 | 版本 | 授權 | 檔案在 | 授權全文 | 對應原始碼 |", "|---|---|---|---|---|---|");
  for (const c of A.comps) o.push(`| ${c.name} | ${c.ver} | ${c.license} | ${c.present.length}／${c.files.length} | ${c.missLic.length ? "✘ 缺 " + c.missLic.join("、") : "✔ " + c.lic.join("、")} | ${c.src.length ? (c.missSrc.length ? "✘ 缺 " + c.missSrc.join("、") : "✔ " + c.src.join("、")) : "—"} |`);
  o.push("", "### 2. 沒登記的第三方嫌疑檔", "", A.suspects.length ? A.suspects.map(s => `- ${s.file}：${s.why}`).join("\n") : "沒有。");
  o.push("", "### 3. 追蹤與閉源 SDK", "", A.trackers.length ? A.trackers.map(t => `- ${t.file} 第 ${t.line} 行：${t.kind}（\`${t.snip.replace(/`/g, "'")}\`）`).join("\n") : `沒有（查了 ${TRACKERS.length} 類：${TRACKERS.map(t => t[0]).join("、")}）。`);
  o.push("", "### 4. 程式碼裡出現的外部網址", "", "| 網域 | 是什麼 | 出現在 |", "|---|---|---|");
  for (const h of A.hosts) o.push(`| ${h.host} | ${h.what} | ${h.files.join("、")} |`);
  o.push("", "### 5. 素材（不是程式）", "", "| 類別 | 檔數 | 大小 | 來源與授權 | 狀態 | 算不算自由授權 |", "|---|---|---|---|---|---|");
  for (const a of A.assets) o.push(`| ${a.name} | ${a.count} | ${a.mb} MB | ${a.license} | ${a.status} | ${a.free} |`);
  o.push("", "### 6. 說明與授權檔", "", A.docs.map(d => `${yes(d.ok)} ${d.file}`).join("　"), "", `App 本身的授權檔（LICENSE／COPYING）：${A.appLicense.length ? A.appLicense.join("、") : "**沒有**（原創程式 © 陳泓昇，沒有開源授權）"}`);
  return o.join("\n") + "\n";
}

module.exports = { KNOWN, OWN, TRACKERS, HOSTS, ASSETS, audit, renderMd, scanTrackers, hostsOf, classifyHost, walk };
if (require.main === module) {
  const argv = process.argv.slice(2), oi = argv.indexOf("--out"), OUT = oi >= 0 ? argv[oi + 1] : null;
  const pos = argv.filter((a, i) => !a.startsWith("--") && !(oi >= 0 && i === oi + 1));
  const SITE = path.resolve(pos[0] || path.join(__dirname, "..", "site"));
  if (!fs.existsSync(SITE)) { console.log("找不到資料夾：" + SITE); process.exit(2) }
  const A = audit(SITE);
  if (argv.includes("--json")) console.log(JSON.stringify(A, null, 1));
  else if (OUT) { fs.writeFileSync(OUT, renderMd(A)); console.log("報告寫到 " + OUT) }
  else process.stdout.write(renderMd(A));
  process.exit(A.problems.length ? 1 : 0);
}
