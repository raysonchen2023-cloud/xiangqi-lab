// 可重跑的效能基準（第 17 輪改善 6「補上可重跑的效能基準」）
//
// 固定場景、固定環境、固定暖機，量冷啟動、幀時間、長任務、記憶體、背景活動，原始資料全存，另有前後比較。
//   ⚠ 這是「無頭 Chrome 在開發者電腦上」的數字：CPU、GPU（通常是軟體繪圖 SwiftShader）、記憶體都跟手機不一樣，
//     **不能當成實機耗電、發熱或手機上的幀數**；只拿來比同一台電腦、同一組設定下「這版比上一版重了還是輕了」。
//
// 場景（每一輪都照這個順序，在同一個全新、用完即丟的瀏覽器設定裡跑）：
//   cold  冷啟動：全新設定（沒有快取、沒有存檔以外的資料）打開首頁 → 首次繪製（FCP）、最大繪製（LCP）、DOMContentLoaded、load、
//         App 就緒（#view 第一次有內容＋跨來源隔離）、等待畫面收掉；前 15 秒的長任務、下載的檔案數與位元組、JS 記憶體
//   idle  首頁靜置 20 秒（開頁 5 秒後開始）：每一格的幀時間（requestAnimationFrame 間隔）、長任務、CPU 時間（CDP Performance.getMetrics 差值）、
//         計時器觸發次數（包 setTimeout／setInterval）、網路請求數、JS 記憶體頭尾
//   bg    切到背景 20 秒（同一個設定再開一頁蓋到前面，確認 document.hidden）：背景裡還在跑的 rAF、計時器、網路、CPU 時間
//   film  主線第一章開章電影播 15 秒（水墨推拉＋粒子＋字幕）：幀時間、長任務
//   game  挑戰電腦（固定等級 --lx，預設 3）照固定開局走 4 步：每步電腦回著的時間、這段的幀時間與長任務
//   mem   回首頁、強制回收記憶體（CDP HeapProfiler.collectGarbage）後的 JS 記憶體、DOM 節點數、事件監聽數
// 固定環境：視窗 390×844、deviceScaleFactor 2、iPhone UA、觸控；navigator.hardwareConcurrency 固定 6（引擎 Threads＝5→上限 4）、deviceMemory 固定 8；
//   CPU 降速 --cpu（預設 1＝不降，可用 4 模擬中階手機的大概比例，仍不等於手機）；網路不限速（本機伺服器）；--mute-audio；新語言繁中。
// 暖機：第 0 輪整個流程跑一次但不算（磁碟快取、伺服器、Chrome 程式快取先熱），之後跑 --reps 輪（預設 3）取中位數；原始資料每輪都留。
// 安全：只開 1 個無頭瀏覽器；xq_netRoot＝"xq_test"（測試房）；開瀏覽器前等別的無頭瀏覽器腳本跑完（p0-regress.js busyProcs）。
//
// 用法（在 <專案根目錄> 下）：
//   node xiangqi-lab/tools/qa/perf-bench.js --label 本機 [--html <組好的 index.html> | --git <commit> | --url <網址>]（前後比較請兩邊都用 --html／--git，同一支伺服器） [--reps 3] [--cpu 1] [--lx 3] [--outdir <資料夾>]
//   node xiangqi-lab/tools/qa/perf-bench.js --compare <前.json> <後.json> [--out <compare.md>]     （前後比較，不開瀏覽器）
//   預設 --outdir xiangqi-db/tools/review_loop/rounds/r17/perf；產出 perf-<label>-<時間>.json（原始資料）、perf-<label>.md（摘要）
"use strict";
const DISCLAIMER = "無頭 Chrome（Playwright）在開發者電腦上量的數字：CPU／GPU（多半是軟體繪圖）／記憶體都跟手機不同，不能當成實機耗電、發熱或手機幀數，只能比同一台電腦、同一組設定下版本之間的增減";
const SCENES = [["cold", "冷啟動"], ["idle", "首頁靜置 20 秒"], ["bg", "切到背景 20 秒"], ["film", "主線開章電影 15 秒"], ["game", "挑戰電腦 4 步"], ["mem", "回首頁回收後"]];
const OPENING = ["h2e2", "h0g2", "i0h0", "b0c2"];   /* 炮二平五、馬二進三、車一平二、馬八進七（紅方，跟電腦怎麼回無關都合法；不合法就略過那步） */
const median = a => { const b = a.filter(x => typeof x === "number" && isFinite(x)).sort((x, y) => x - y); if (!b.length) return null; const m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2 };
const pct = (a, p) => { const b = a.filter(x => isFinite(x)).sort((x, y) => x - y); if (!b.length) return null; return b[Math.min(b.length - 1, Math.max(0, Math.ceil(p / 100 * b.length) - 1))] };
/* 幀間隔陣列（ms）→ 摘要：平均 fps、p50／p95／p99 幀時間、超過 33.4ms（低於 30fps）與 50ms 的格數比例 */
function frameStats(d) {
  d = (d || []).filter(x => x > 0 && x < 5000);
  if (!d.length) return { n: 0, fps: null, p50: null, p95: null, p99: null, over33: null, over50: null, max: null };
  const sum = d.reduce((a, b) => a + b, 0), r = x => Math.round(x * 10) / 10;
  return { n: d.length, fps: r(1000 * d.length / sum), p50: r(pct(d, 50)), p95: r(pct(d, 95)), p99: r(pct(d, 99)), over33: r(100 * d.filter(x => x > 33.4).length / d.length), over50: r(100 * d.filter(x => x > 50).length / d.length), max: r(Math.max(...d)) };
}
/* 長任務 [{start,dur}] → 次數、總時間、最長 */
function longStats(L) { L = L || []; return { n: L.length, total: Math.round(L.reduce((a, x) => a + x.dur, 0)), max: Math.round(L.reduce((a, x) => Math.max(a, x.dur), 0)) } }
/* CDP Performance.getMetrics 兩次的差（秒換成 ms） */
function metricDelta(a, b) { const o = {}; for (const k of ["TaskDuration", "ScriptDuration", "LayoutDuration", "RecalcStyleDuration"]) if (a && b && k in a && k in b) o[k] = Math.round((b[k] - a[k]) * 1000); return o }
/* 一輪原始資料 → 摘要列（每個指標一個數字） */
function summarizeRep(x) {
  const o = {};
  if (x.cold) { const c = x.cold; Object.assign(o, { "cold.fcp": c.fcp, "cold.lcp": c.lcp, "cold.dcl": c.dcl, "cold.load": c.load, "cold.appReady": c.appReady, "cold.inkGone": c.inkGone, "cold.longN": longStats(c.longs).n, "cold.longMs": longStats(c.longs).total, "cold.reqN": c.reqN, "cold.kb": c.kb, "cold.heapMB": c.heapMB, "cold.taskMs": c.metrics && c.metrics.TaskDuration != null ? Math.round(c.metrics.TaskDuration * 1000) : null }) }
  for (const k of ["idle", "film", "game"]) if (x[k]) { const f = frameStats(x[k].frames), l = longStats(x[k].longs), m = metricDelta(x[k].m0, x[k].m1); Object.assign(o, { [k + ".fps"]: f.fps, [k + ".p95"]: f.p95, [k + ".p99"]: f.p99, [k + ".over33"]: f.over33, [k + ".longN"]: l.n, [k + ".longMs"]: l.total, [k + ".cpuMs"]: m.TaskDuration, [k + ".scriptMs"]: m.ScriptDuration }) }
  if (x.idle) Object.assign(o, { "idle.timers": x.idle.timers, "idle.req": x.idle.req, "idle.kb": x.idle.kb, "idle.heapDeltaMB": x.idle.heap1 != null && x.idle.heap0 != null ? Math.round((x.idle.heap1 - x.idle.heap0) * 10) / 10 : null });
  if (x.game) Object.assign(o, { "game.replyMs": median(x.game.reply || []), "game.replies": (x.game.reply || []).length });
  if (x.bg) { const m = metricDelta(x.bg.m0, x.bg.m1); Object.assign(o, { "bg.hidden": x.bg.hidden ? 1 : 0, "bg.raf": x.bg.raf, "bg.timers": x.bg.timers, "bg.req": x.bg.req, "bg.kb": x.bg.kb, "bg.cpuMs": m.TaskDuration }) }
  if (x.mem) Object.assign(o, { "mem.heapMB": x.mem.heapMB, "mem.nodes": x.mem.nodes, "mem.listeners": x.mem.listeners });
  return o;
}
const METRIC_NM = { "cold.fcp": "冷啟動 首次繪製 FCP（ms）", "cold.lcp": "冷啟動 最大繪製 LCP（ms）", "cold.dcl": "冷啟動 DOMContentLoaded（ms）", "cold.load": "冷啟動 load（ms）", "cold.appReady": "冷啟動 App 就緒（ms）", "cold.inkGone": "冷啟動 等待畫面收掉（ms）", "cold.longN": "冷啟動 前 15 秒長任務（次）", "cold.longMs": "冷啟動 前 15 秒長任務（ms）", "cold.reqN": "冷啟動 前 15 秒下載檔案數", "cold.kb": "冷啟動 前 15 秒下載量（KB）", "cold.heapMB": "冷啟動 15 秒時 JS 記憶體（MB，沒先回收，受垃圾回收時機影響大；比記憶體看最後一列「回收後」）", "cold.taskMs": "冷啟動 15 秒內主執行緒 CPU（ms）",
  "idle.fps": "首頁靜置 平均 fps", "idle.p95": "首頁靜置 幀時間 p95（ms）", "idle.p99": "首頁靜置 幀時間 p99（ms）", "idle.over33": "首頁靜置 慢格（>33ms）%", "idle.longN": "首頁靜置 長任務（次）", "idle.longMs": "首頁靜置 長任務（ms）", "idle.cpuMs": "首頁靜置 20 秒 CPU（ms）", "idle.scriptMs": "首頁靜置 20 秒 JS（ms）", "idle.timers": "首頁靜置 計時器觸發（次）", "idle.req": "首頁靜置 網路請求（次）", "idle.kb": "首頁靜置 下載量（KB）", "idle.heapDeltaMB": "首頁靜置 JS 記憶體增減（MB，同上受回收時機影響）",
  "bg.hidden": "背景 document.hidden 生效（1＝是）", "bg.raf": "背景 20 秒 rAF 回呼（次）", "bg.timers": "背景 20 秒 計時器觸發（次）", "bg.req": "背景 20 秒 網路請求（次）", "bg.kb": "背景 20 秒 下載量（KB）", "bg.cpuMs": "背景 20 秒 CPU（ms）",
  "film.fps": "電影 平均 fps", "film.p95": "電影 幀時間 p95（ms）", "film.p99": "電影 幀時間 p99（ms）", "film.over33": "電影 慢格（>33ms）%", "film.longN": "電影 長任務（次）", "film.longMs": "電影 長任務（ms）", "film.cpuMs": "電影 15 秒 CPU（ms）", "film.scriptMs": "電影 15 秒 JS（ms）",
  "game.replyMs": "對局 電腦回著時間中位數（ms，含刻意等待 1～1.5 秒）", "game.replies": "對局 電腦回了幾著", "game.fps": "對局 平均 fps", "game.p95": "對局 幀時間 p95（ms）", "game.p99": "對局 幀時間 p99（ms）", "game.over33": "對局 慢格（>33ms）%", "game.longN": "對局 長任務（次）", "game.longMs": "對局 長任務（ms）", "game.cpuMs": "對局 主執行緒 CPU（ms）", "game.scriptMs": "對局 JS（ms）",
  "mem.heapMB": "回收後 JS 記憶體（MB）", "mem.nodes": "回收後 DOM 節點數", "mem.listeners": "回收後 事件監聽數" };
/* 多輪 → 每個指標的中位數與全距 */
function summarize(reps) {
  const rows = reps.filter(r => !r.warmup).map(summarizeRep), keys = [...new Set(rows.flatMap(r => Object.keys(r)))], out = {};
  for (const k of keys) { const v = rows.map(r => r[k]).filter(x => typeof x === "number" && isFinite(x)); out[k] = { med: median(v), min: v.length ? Math.min(...v) : null, max: v.length ? Math.max(...v) : null, n: v.length } }
  return out;
}
const fmt = x => x == null ? "—" : Math.abs(x) >= 100 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
function envLines(R) { const e = R.env || {}; return [`- 受測：象棋千秋 **${R.build || "?"}**（${R.source || ""}）`, `- 電腦：${e.os || "?"}；CPU ${e.cpu || "?"}（${e.cores || "?"} 核）；記憶體 ${e.ramGB || "?"} GB；Node ${e.node || "?"}`, `- 瀏覽器：${R.browser || "?"}；WebGL：${e.webgl || "?"}；CPU 降速 ${R.cpu || 1}×；視窗 ${e.view || ""}；hardwareConcurrency 固定 ${e.hc}、deviceMemory 固定 ${e.dm}；對局等級 lx ${R.lx}`, `- 暖機 1 輪不算＋量 ${R.nReps} 輪取中位數；時間 ${R.startedAt}～${R.finishedAt}；指令 \`${R.command || ""}\``] }
function toMd(R) {
  const S = summarize(R.reps || []);
  const L = [`# 效能基準：${R.label}`, "", `> ⚠ ${DISCLAIMER}`, "", ...envLines(R), "", "| 指標 | 中位數 | 最小～最大 | 輪數 |", "|---|---:|---|---:|"];
  for (const k of Object.keys(METRIC_NM)) if (S[k]) L.push(`| ${METRIC_NM[k]} | ${fmt(S[k].med)} | ${fmt(S[k].min)}～${fmt(S[k].max)} | ${S[k].n} |`);
  { const G = {}; for (const r of (R.reps || []).filter(r => !r.warmup)) for (const [ph, g] of Object.entries(r.reqGroups || {})) for (const [k, n] of Object.entries(g)) { G[ph] = G[ph] || {}; G[ph][k] = (G[ph][k] || 0) + n }
    const nr = (R.reps || []).filter(r => !r.warmup).length || 1, PH = { cold: "冷啟動前 15 秒", idle: "首頁靜置", bg: "背景", after: "電影／對局／回首頁" };
    if (Object.keys(G).length) { L.push("", "## 誰在下載（每輪平均請求數，照路徑前兩段分組，前 8 名）", ""); for (const [ph, g] of Object.entries(G)) L.push("- " + (PH[ph] || ph) + "：" + Object.entries(g).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n]) => k + " " + Math.round(n / nr)).join("、")) } }
  { const b = (R.reps || []).find(r => r.bg && r.bg.how); if (b) L.push("", "- 背景量法：" + b.bg.how) }
  if ((R.notes || []).length) L.push("", ...R.notes.map(n => "- " + n));
  if ((R.errors || []).length) L.push("", "## 執行錯誤", ...R.errors.map(e => "- " + e));
  return L.join("\n") + "\n";
}
/* 前後比較：A、B 兩份原始資料 → 表（差值與百分比；越小越好的指標標 ▲ 變差、▼ 變好） */
const HIGHER_BETTER = new Set(["idle.fps", "film.fps", "game.fps", "bg.hidden", "game.replies"]);
function compareMd(A, B) {
  const a = summarize(A.reps || []), b = summarize(B.reps || []);
  const L = [`# 效能基準前後比較：${A.label}（${A.build}）→ ${B.label}（${B.build}）`, "", `> ⚠ ${DISCLAIMER}`, "", "前：", ...envLines(A), "", "後：", ...envLines(B), ""];
  const same = ["cpu", "lx"].every(k => A[k] === B[k]) && (A.env || {}).cpu === (B.env || {}).cpu;
  L.push(same ? "- 兩份的電腦、CPU 降速、對局等級相同，可以比。" : "- ⚠ 兩份的電腦或設定不同，差值不可信。", "", "| 指標 | 前（中位數） | 後（中位數） | 差 | 變化 | 判讀 |", "|---|---:|---:|---:|---:|---|");
  for (const k of Object.keys(METRIC_NM)) { if (!a[k] && !b[k]) continue; const x = a[k] && a[k].med, y = b[k] && b[k].med; if (x == null && y == null) continue; const d = x != null && y != null ? y - x : null, p = d != null && x ? Math.round(1000 * d / Math.abs(x)) / 10 : null;
    const spreadA = a[k] ? (a[k].max - a[k].min) : 0, spreadB = b[k] ? (b[k].max - b[k].min) : 0, noisy = d != null && Math.abs(d) <= Math.max(spreadA, spreadB);
    const better = d == null || d === 0 ? "持平" : noisy ? "在輪間差異內" : (HIGHER_BETTER.has(k) ? d > 0 : d < 0) ? "▼ 變好" : "▲ 變差";
    L.push(`| ${METRIC_NM[k]} | ${fmt(x)} | ${fmt(y)} | ${d == null ? "—" : (d > 0 ? "+" : "") + fmt(d)} | ${p == null ? "—" : (p > 0 ? "+" : "") + p + "%"} | ${better} |`) }
  L.push("", "「在輪間差異內」＝差值不超過任一邊多輪的全距（最大－最小），當成雜訊，不算變好變差。");
  return L.join("\n") + "\n";
}
module.exports = { DISCLAIMER, SCENES, OPENING, median, pct, frameStats, longStats, metricDelta, summarizeRep, summarize, toMd, compareMd, METRIC_NM };
if (require.main !== module) return;

// ================= 以下才開瀏覽器 =================
const fs = require("fs"), path = require("path"), http = require("http"), cp = require("child_process"), os = require("os");
const HOME = path.join(__dirname, "..", "..", "..");
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d };
if (argv.includes("--compare")) {
  const i = argv.indexOf("--compare"), A = JSON.parse(fs.readFileSync(argv[i + 1], "utf8")), B = JSON.parse(fs.readFileSync(argv[i + 2], "utf8"));
  const md = compareMd(A, B), out = arg("--out", ""); if (out) { fs.writeFileSync(out, md); console.log("寫好了：" + out) } else console.log(md);
  return;
}
const { chromium } = require(path.join(HOME, "claude-desktop-tools", "node_modules", "playwright"));
const P0 = require("./p0-regress.js");
const GIT_REF = arg("--git", ""), PORT = +arg("--port", 8891), REPS = +arg("--reps", 3), CPU = +arg("--cpu", 1), LX = +arg("--lx", 3);
const HTML = arg("--html", "");
const URL0 = GIT_REF || HTML ? `http://127.0.0.1:${PORT}/xiangqi-lab/` : arg("--url", "http://localhost:8821/xiangqi-lab/").replace(/\/?$/, "/");
const LABEL = arg("--label", GIT_REF ? GIT_REF.replace(/[^\w.-]/g, "_") : "local");
const OUTDIR = path.resolve(arg("--outdir", path.join(HOME, "xiangqi-db", "tools", "review_loop", "rounds", "r17", "perf")));
const VW = 390, VH = 844, HC = 6, DM = 8;
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString("zh-TW", { hour12: false }), ...a);
fs.mkdirSync(OUTDIR, { recursive: true });
function listProcs() { try { return P0.parseProcList(cp.execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { [string]$_.ProcessId + [char]9 + $_.CommandLine }"], { encoding: "utf8", maxBuffer: 16e6, windowsHide: true })) } catch (e) { return [] } }
async function waitIdle(R) { const t0 = Date.now(); for (;;) { const b = P0.busyProcs(listProcs(), [process.pid, process.ppid]).filter(p => !/perf-bench\.js/.test(p.cmd)); if (!b.length) return true; const d = b.map(p => p.pid + "：" + p.cmd.slice(0, 90)).join("｜"); if (!R.waited.includes(d)) { R.waited.push(d); log("等別的無頭瀏覽器：", d) } if (Date.now() - t0 > 40 * 60000) return false; await sleep(15000) } }
/* 兩種來源都用同一支伺服器送出（前後比較時伺服器不同，冷啟動差異就不能算到 App 頭上）：
   ref＝公開倉庫已發布檔（git 裡沒有的大檔用本機 site/）；html＝本機組好的 index.html（例 scratchpad/bhtd-index.html），其他檔照 8821 試看伺服器：park3d／local／engine／net／bot3d 用 src/，其餘 site/ */
function gitServe(ref, html) {
  const SITE = path.join(HOME, "xiangqi-lab", "site"), SRC = path.join(HOME, "xiangqi-lab", "src"), git = a => cp.execFileSync("git", ["-C", SITE, ...a], { maxBuffer: 400e6, windowsHide: true });
  let commit = "", blob;
  if (html) { const H = fs.readFileSync(html), OV = ["park3d.js", "local.js", "engine.js", "net.js", "bot3d.js"]; commit = "file:" + require("crypto").createHash("sha256").update(H).digest("hex").slice(0, 12); blob = p => p === "index.html" ? H : OV.includes(p) ? fs.readFileSync(path.join(SRC, p)) : null }
  else {
    commit = git(["rev-parse", ref]).toString().trim(); const tree = new Map();
    for (const line of git(["-c", "core.quotePath=false", "ls-tree", "-r", ref]).toString("utf8").split(/\r?\n/)) { const x = /^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(line); if (x) tree.set(x[2], x[1]) }
    const cache = new Map(); blob = p => { if (!tree.has(p)) return null; if (!cache.has(p)) cache.set(p, git(["cat-file", "blob", tree.get(p)])); return cache.get(p) };
  }
  const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".wasm": "application/wasm", ".mp3": "audio/mpeg" };
  const COI = { "Cross-Origin-Embedder-Policy": "require-corp", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Resource-Policy": "cross-origin", "Cache-Control": "no-store" };
  return new Promise((res, rej) => { const srv = http.createServer((q, r) => { let u = ""; try { u = decodeURIComponent(q.url.split("?")[0]) } catch (e) { r.writeHead(400); return r.end() } if (!u.startsWith("/xiangqi-lab/")) { r.writeHead(404); return r.end() } u = u.slice(13) || "index.html"; if (u.includes("..") || u === "sw.js") { r.writeHead(404); return r.end() } let b = blob(u); if (!b) { try { b = fs.readFileSync(path.join(SITE, u)) } catch (e) { b = null } } if (!b) { r.writeHead(404); return r.end() } r.writeHead(200, Object.assign({ "Content-Type": MIME[path.extname(u)] || "application/octet-stream" }, COI)); r.end(b) }); srv.on("error", rej); srv.listen(PORT, "127.0.0.1", () => res({ srv, commit })) });
}
/* 開頁前裝進頁面：測試房、種子存檔、固定核心數、量測探針（幀、長任務、計時器、App 就緒時間） */
function INIT([hc, dm]) {
  try {
    Object.defineProperty(Navigator.prototype, "hardwareConcurrency", { configurable: true, get: () => hc });
    Object.defineProperty(Navigator.prototype, "deviceMemory", { configurable: true, get: () => dm });
    localStorage.setItem("xq_netRoot", JSON.stringify("xq_test")); sessionStorage.setItem("xqTitleShown", "1");
    if (!localStorage.getItem("xq_perfSeed")) {
      localStorage.setItem("xq_perfSeed", "1"); const S = (k, v) => localStorage.setItem(k, JSON.stringify(v)), now = Date.now();
      S("xq_me", { id: "qapf" + Math.random().toString(36).slice(2, 8), name: "效能測試" });
      const base = { onboard1: true, firstWin: true, langHint: true, focusBoard: true, pChar: "x_swordboy", pSex: "m", pStyle: "real", botPiece: "俥", journey: { c: "x_swordboy", sx: "m", born: now, v: 1, era: 2, home: "qin" }, era: "classic", shipDock: ["classic", "qin"], shipAt: "classic",
        bhXuDone: now, bhxLand: now, bhxPick: "x_swordboy", bhXuAsk: now, bhxQuest: 9, instAsk: { no: true, at: now }, mnq: { seg: {}, qte: {}, lamp: {}, gift: { a1: now, a6: {} }, title: { xin: now }, clue: {}, page: ["classic"], music: [] } };
      { const d = new Date(now - 5 * 36e5); base.ep = { ntr: { [d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate()]: 1 } } }   /* 深夜「星夜茶話會」抽屜（07t ep4）記成今晚已擲過：量測不受時段影響 */
      for (const [k, v] of Object.entries(base)) S("m_" + k, v);
    }
  } catch (e) { }
  const Q = window.__PB = { fr: [], frOn: false, last: 0, longs: [], timers: 0, raf: 0, appReady: null, inkGone: null, fcp: null, lcp: null };
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) Q.longs.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) }) }).observe({ type: "longtask", buffered: true }) } catch (e) { }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (e.name === "first-contentful-paint") Q.fcp = Math.round(e.startTime) }).observe({ type: "paint", buffered: true }) } catch (e) { }
  try { new PerformanceObserver(l => { for (const e of l.getEntries()) Q.lcp = Math.round(e.startTime) }).observe({ type: "largest-contentful-paint", buffered: true }) } catch (e) { }
  const st = window.setTimeout, si = window.setInterval;
  window.setTimeout = function (f, ...a) { return st.call(this, typeof f === "function" ? function () { Q.timers++; return f.apply(this, arguments) } : f, ...a) };
  window.setInterval = function (f, ...a) { return si.call(this, typeof f === "function" ? function () { Q.timers++; return f.apply(this, arguments) } : f, ...a) };
  const ra = window.requestAnimationFrame; window.requestAnimationFrame = function (f) { return ra.call(this, function (t) { Q.raf++; return f(t) }) };
  const tick = t => { if (Q.frOn) { if (Q.last) Q.fr.push(Math.round((t - Q.last) * 100) / 100); Q.last = t } else Q.last = 0;
    if (Q.appReady == null && self.crossOriginIsolated && document.querySelector("#view > *")) Q.appReady = Math.round(performance.now());
    { const o = document.getElementById("preov"), on = !!(o && getComputedStyle(o).display !== "none" && o.getBoundingClientRect().height); if (on) Q.inkSeen = 1; if (Q.inkSeen && !on && Q.inkGone == null) Q.inkGone = Math.round(performance.now()) }   /* 等待畫面（#preov）出現過、再收掉的時間；沒出現過就是 null */
    ra.call(window, tick) };
  ra.call(window, tick);
}
async function metrics(cdp) { try { const r = await cdp.send("Performance.getMetrics"); const o = {}; for (const m of r.metrics) o[m.name] = m.value; return o } catch (e) { return null } }
const heapMB = page => page.evaluate(() => performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576 * 10) / 10 : null).catch(() => null);
async function window_(page, cdp, ms, during) {   /* 量一段時間：幀、長任務、計時器、CPU */
  const l0 = await page.evaluate(() => { __PB.fr = []; __PB.last = 0; __PB.frOn = true; return { longs: __PB.longs.length, timers: __PB.timers, raf: __PB.raf } });
  const m0 = await metrics(cdp), h0 = await heapMB(page), t0 = Date.now();
  if (during) await during(); const rest = ms - (Date.now() - t0); if (rest > 0) await sleep(rest);
  const m1 = await metrics(cdp), h1 = await heapMB(page);
  const x = await page.evaluate(l0 => { __PB.frOn = false; return { frames: __PB.fr.slice(), longs: __PB.longs.slice(l0.longs), timers: __PB.timers - l0.timers, raf: __PB.raf - l0.raf } }, l0);
  return Object.assign(x, { m0, m1, heap0: h0, heap1: h1, ms: Date.now() - t0 });
}
async function boardPt(page, i) { return page.evaluate(i => { const c = i % 9, r = Math.floor(i / 9); const svg = [...document.querySelectorAll("#view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620" && s.getBoundingClientRect().width > 50); if (!svg) return null; const m = svg.getScreenCTM(); const f = !!(svg._o && svg._o.flip); const X = 40 + (f ? 8 - c : c) * 60, Y = 40 + (f ? 9 - r : r) * 60; return { x: m.a * X + m.c * Y + m.e, y: m.b * X + m.d * Y + m.f } }, i) }
const boardSig = page => page.evaluate(() => { const svg = [...document.querySelectorAll("#view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return svg && svg._b ? JSON.stringify(svg._b) : "" }).catch(() => "");

async function oneRep(browser, k, R) {
  const rep = { rep: k, warmup: k === 0, at: new Date().toISOString(), notes: [] };
  const ctx = await browser.newContext({ viewport: { width: VW, height: VH }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE_UA, locale: "zh-TW" });
  try {
    await ctx.addInitScript(INIT, [HC, DM]);
    const page = await ctx.newPage(); page.setDefaultTimeout(20000);
    const cdp = await ctx.newCDPSession(page); await cdp.send("Performance.enable", { timeDomain: "timeTicks" }).catch(() => { });
    if (CPU > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: CPU });
    /* 網路：請求數照 Playwright request 事件；位元組照 CDP Network.loadingFinished 的 encodedDataLength（本機伺服器用分塊傳送、沒有 content-length）；另外照路徑前兩段分組，看是誰在抓 */
    let req = 0, bytes = 0; const grp = {}; let grpOn = "cold";
    page.on("request", r => { req++; try { const u = new URL(r.url()), k = u.pathname.replace(/^\/xiangqi-lab\//, "").split("/").slice(0, 2).join("/").replace(/\.[a-z0-9]+$/i, ".*"); const g = grp[grpOn] = grp[grpOn] || {}; g[k] = (g[k] || 0) + 1 } catch (e) { } });
    await cdp.send("Network.enable").catch(() => { }); cdp.on("Network.loadingFinished", e => { bytes += e.encodedDataLength || 0 });
    rep.reqGroups = grp;
    const errs = []; page.on("pageerror", e => errs.push(String(e.message).slice(0, 200)));
    /* cold */
    await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded", timeout: 90000 });
    await sleep(15000);
    const nav = await page.evaluate(() => { const n = performance.getEntriesByType("navigation")[0] || {}; return { dcl: Math.round(n.domContentLoadedEventEnd || 0), load: Math.round(n.loadEventEnd || 0), ttfb: Math.round(n.responseStart || 0) } });
    const pb = await page.evaluate(() => ({ appReady: __PB.appReady, inkGone: __PB.inkGone, fcp: __PB.fcp, lcp: __PB.lcp, longs: __PB.longs.slice() }));
    rep.cold = Object.assign({}, nav, pb, { reqN: req, kb: Math.round(bytes / 1024), heapMB: await heapMB(page), metrics: await metrics(cdp) });
    if (!R.build) R.build = await page.evaluate(() => window.XQ_BUILD || "").catch(() => "");
    if (!R.env.webgl) R.env.webgl = await page.evaluate(() => { try { const g = document.createElement("canvas").getContext("webgl"), e = g && g.getExtension("WEBGL_debug_renderer_info"); return g ? (e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : g.getParameter(g.RENDERER)) : "沒有 WebGL" } catch (x) { return "?" } });
    await page.evaluate(() => { document.querySelectorAll("#mnqGf,.modal").forEach(e => e.remove()) });
    /* idle：再等 5 秒、量 20 秒 */
    await sleep(5000); const r0 = req;
    grpOn = "idle"; const by0 = bytes; rep.idle = await window_(page, cdp, 20000); rep.idle.req = req - r0; rep.idle.kb = Math.round((bytes - by0) / 1024);
    /* bg：開一頁蓋到前面 */
    /* 無頭 Chrome 把別的分頁帶到前面，這一頁的 document.hidden 不一定會變；沒變就改用「讓 App 以為切到背景」（改 document.hidden、送 visibilitychange），
       這樣量的是 App 自己在背景會不會停下計時器、動畫、下載；瀏覽器本身對背景分頁的節流（計時器限速、rAF 停止）這時沒有模擬到 */
    grpOn = "bg"; const p2 = await ctx.newPage(); await p2.goto("about:blank"); await p2.bringToFront(); await sleep(1000);
    let hid = await page.evaluate(() => document.hidden), how = hid ? "真的背景（另一分頁在前）" : "";
    if (!hid) { await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")); window.dispatchEvent(new Event("pagehide")) }); hid = await page.evaluate(() => document.hidden); how = "模擬（改 document.hidden＋visibilitychange；瀏覽器背景節流沒有模擬）" }
    const b0 = await page.evaluate(() => ({ t: __PB.timers, r: __PB.raf })), bm0 = await metrics(cdp), br0 = req, bb0 = bytes; await sleep(20000);
    const b1 = await page.evaluate(() => ({ t: __PB.timers, r: __PB.raf })), bm1 = await metrics(cdp);
    rep.bg = { kb: Math.round((bytes - bb0) / 1024), hidden: hid, how, timers: b1.t - b0.t, raf: b1.r - b0.r, req: req - br0, m0: bm0, m1: bm1 };
    await page.evaluate(() => { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event("visibilitychange")) }).catch(() => { });
    await page.bringToFront(); await p2.close(); await sleep(2000); grpOn = "after";
    /* film */
    const okF = await page.evaluate(() => { try { if (typeof mnfPlay !== "function") return false; mnfPlay("c1o", { label: "效能量測" }); return true } catch (e) { return false } });
    if (okF) { await sleep(500); rep.film = await window_(page, cdp, 15000); await page.evaluate(() => { try { MNF.cur && MNF.cur.finish(true) } catch (e) { } document.querySelectorAll("#mnfPg,#mnfBk,#mnfRite,.mnf-card").forEach(e => e.remove()); try { mnfMusicStop(0) } catch (e) { } }); await sleep(1500) }
    else rep.notes.push("這一版沒有 mnfPlay（沒有主線電影），film 不量");
    /* game */
    await page.evaluate(lx => api("/play/new", { human: "r", lx, ranked: false }).then(() => { location.hash = "#/cpu" }), LX).catch(e => rep.notes.push("開對局失敗：" + e.message));
    await sleep(5000); await page.evaluate(() => document.querySelectorAll(".modal").forEach(e => e.remove()));
    rep.game = await window_(page, cdp, 0, async () => {
      const reply = [];
      for (const u of OPENING) {
        const [f, t] = await page.evaluate(u => [XQCore.parseSq(u.slice(0, 2)), XQCore.parseSq(u.slice(2, 4))], u).catch(() => [-1, -1]);
        const legal = await page.evaluate(([f, t]) => { try { const svg = [...document.querySelectorAll("#view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return !!(svg && svg._b && XQCore.legal(svg._b, "r").some(m => m[0] === f && m[1] === t)) } catch (e) { return false } }, [f, t]);
        if (!legal) { rep.notes.push("開局步 " + u + " 這時不合法，略過"); continue }
        const p1 = await boardPt(page, f), p2b = await boardPt(page, t); if (!p1 || !p2b) { rep.notes.push("找不到棋盤"); break }
        await page.touchscreen.tap(p1.x, p1.y); await sleep(250); await page.touchscreen.tap(p2b.x, p2b.y);
        await sleep(300); const s0 = await boardSig(page), t0 = Date.now(); let got = false;
        while (Date.now() - t0 < 30000) { await sleep(100); const s = await boardSig(page); if (s && s !== s0) { got = true; break } }
        if (got) reply.push(Date.now() - t0 + 300); else { rep.notes.push(u + " 之後 30 秒電腦沒回"); break }
        await sleep(800);
      }
      rep.gameReply = reply;
    });
    rep.game.reply = rep.gameReply; delete rep.gameReply;
    /* mem */
    await page.evaluate(() => { location.hash = "#/" }); await sleep(4000);
    try { await cdp.send("HeapProfiler.collectGarbage") } catch (e) { } await sleep(1000);
    const mm = await metrics(cdp);
    rep.mem = { heapMB: await heapMB(page), nodes: mm && mm.Nodes, listeners: mm && mm.JSEventListeners, docs: mm && mm.Documents };
    rep.pageErrors = errs;
  } catch (e) { rep.error = String(e && e.stack || e).slice(0, 400); log("這一輪出錯", rep.error) }
  finally { await ctx.close().catch(() => { }) }
  return rep;
}
(async () => {
  const R = { tool: "xiangqi-lab/tools/qa/perf-bench.js", command: "node xiangqi-lab/tools/qa/perf-bench.js " + argv.join(" "), label: LABEL, url: URL0, source: "", build: "", browser: "", cpu: CPU, lx: LX, nReps: REPS, disclaimer: DISCLAIMER,
    env: { os: `${os.type()} ${os.release()}`, cpu: (os.cpus()[0] || {}).model, cores: os.cpus().length, ramGB: Math.round(os.totalmem() / 1073741824), node: process.version, view: `${VW}×${VH} DPR 2`, hc: HC, dm: DM, webgl: "" },
    startedAt: new Date().toISOString(), waited: [], reps: [], notes: [], errors: [] };
  let browser = null, srv = null;
  try {
    if (!(await waitIdle(R))) { R.errors.push("等別的無頭瀏覽器超過 40 分鐘，沒跑"); return }
    if (GIT_REF || HTML) { const g = await gitServe(GIT_REF, HTML); srv = g.srv; R.source = HTML ? `本機組好的 ${HTML}（${g.commit}）＋src 五支＋site/，perf-bench 自己的伺服器送出` : `公開倉庫已發布檔 ${GIT_REF}（${g.commit.slice(0, 10)}），perf-bench 自己的伺服器送出`; R.git = g.commit } else R.source = "網址 " + URL0 + "（外部伺服器；跟 --git 比冷啟動時伺服器不同）";
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
    R.browser = "Chrome（headless）" + browser.version();
    for (let k = 0; k <= REPS; k++) { log(k === 0 ? "暖機輪（不算）" : `第 ${k}／${REPS} 輪`); R.reps.push(await oneRep(browser, k, R)) }
  } catch (e) { R.errors.push(String(e && e.stack || e).slice(0, 500)) }
  finally {
    if (browser) await browser.close().catch(() => { }); if (srv) srv.close();
    R.finishedAt = new Date().toISOString();
    for (const r of R.reps) { if (r.error) R.errors.push(`第 ${r.rep} 輪：${r.error}`); for (const n of r.notes || []) if (!R.notes.includes(n)) R.notes.push(n) }
    const stamp = new Date(Date.now() + 8 * 36e5).toISOString().replace(/\D/g, "").slice(0, 12), f = path.join(OUTDIR, `perf-${LABEL}-${stamp}.json`);
    fs.writeFileSync(f, JSON.stringify(R, null, 1)); fs.writeFileSync(path.join(OUTDIR, `perf-${LABEL}.md`), toMd(R));
    log("完成", f);
  }
})();
