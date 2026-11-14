// 新版內容完整流程回歸（第 17 輪改善 7「公開新版內容的完整流程回歸」）
//
// 拿「現在的頁面」（預設本機組好的新版 http://localhost:8821/xiangqi-lab/；也可 --git 量公開倉庫已發布檔）在無頭 Chrome 裡真的走一遍，逐步斷言：
//   MQ 主線第一章：授印禮自動跳出 → 開始第一章 → 開章電影（字幕、配樂、切到背景會停）→ 略過＝先出任務卡、解題不能略過 →
//      危機解題走錯 3 次（倒帶、第 2 次提示、第 3 次「看軍師演示」）→ 解對 → 殘局解開儀式 → 接回電影 → 播到「破局」時關掉 App（重新載入）→
//      首頁「下一步」接著「破局」→ 從那段接著播 → 略過 → 章末電影 → 略過＝任務卡「回首頁」→ 存檔（看過哪幾段、亮燈、解題紀錄）→ 再重開一次狀態還在
//   MQ-RM 主線＋減少動態＋全部靜音：不推拉（transform 一直是 scale(1)）、不放粒子（畫布全透明）、不放配樂、儀式照樣演完
//   GX 觀星臺：沒解鎖時網址直接進會回首頁 → 解鎖後首頁出現「🔭 觀星臺」（第一次有 hot）→ 進頁 → 三個「星軌未通」點了只跳一行 →
//      出口回首頁、gxtSeen 存起來 → 重進 → 星淵遠征 → 第一次會跳練習賽邀請 → 「我會了，直接選關」＝記 skip、關卡卡片最上面有練習賽卡
//   TL 練習賽「星淵試陣」：說明沒看完先走＝不送出；走錯＝不送出、第 2 次黃框；照劇本 8 步走完（放招、陣眼子問題答錯一次）→ 結果視窗；
//      中途關掉 App（重新載入）再從觀星臺進來＝同一盤接著下；不記 bhCount／bhWin／bhtd、不給修為；再練一次從頭；跳過練習＝認輸、記 skip、不算練完
//   EN 英文介面（store lang＝"en"）：主線、觀星臺、練習賽的按鈕和標籤不能留中文（劇情字幕、角色台詞照 07i18n 規則不翻，只記錄不算失敗）
//   每一步記：通過與否、量到的值、截圖；每個流程記版本號、控制台錯誤、未捕捉的頁面錯誤。
//
// 安全：只開 1 個無頭瀏覽器、一次 1 個分頁設定；開頁前 localStorage xq_netRoot＝"xq_test"（測試房）；全新、用完即丟的瀏覽器設定；finally 一定關。
//   開瀏覽器前看有沒有別的無頭瀏覽器腳本在跑（p0-regress.js 的 busyProcs），有就等。
// 用法（在 <專案根目錄> 下）：
//   node xiangqi-lab/tools/qa/flow-regress.js [--url http://localhost:8821/xiangqi-lab/ | --git origin/main] [--only MQ,TL] [--outdir <資料夾>]
//   預設 --outdir xiangqi-db/tools/review_loop/rounds/r17/flows
// 結束碼：全部流程通過 0，否則 1。檔名不用 test- 開頭（不會被一般測試套件撈去開瀏覽器）；純函式測試 node --test xiangqi-lab/tools/test-flow-regress.js
"use strict";
const FLOWS = [
  { id: "MQ", name: "主線第一章：電影、略過、危機解題錯步、儀式、中途關 App 重進、存檔", lang: "zh" },
  { id: "MQRM", name: "主線第一章：減少動態＋全部靜音", lang: "zh", reduced: true, mute: true },
  /* 觀星臺只在「千秋時光之苑」首頁（07y hbIsCl：還沒登船或船停在經典世界）；登了船、船停在家鄉朝代就是渡口棋鎮首頁，沒有觀星臺標籤。這兩個流程用還沒登船的玩家 */
  { id: "GX", name: "觀星臺：解鎖、星軌未通、出口、重進、塔防入口與練習賽邀請（跳過）", lang: "zh", seedDel: ["journey", "shipDock", "shipAt"] },
  { id: "TL", name: "黑洞塔防練習賽：鎖步、錯步、8 步走完、中途關 App 接著下、不記錄、再練、跳過", lang: "zh", seedDel: ["journey", "shipDock", "shipAt"], seed: { bhWin: 1 } },
  { id: "EN", name: "英文介面：主線、觀星臺、練習賽的按鈕與標籤", lang: "en" },
];
const DISCLAIMER = "無頭 Chrome（Playwright）模擬・不是實機・不是真人操作；「關掉 App」用重新載入頁面模擬、「切到背景」用改 document.hidden 模擬";
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const hasCjk = s => CJK.test(String(s || ""));
/* 介面字（按鈕、標籤）有中文就算沒翻；劇情字幕、角色台詞照 07i18n 檔頭規則不翻 */
function cjkButtons(list) { return (list || []).filter(t => hasCjk(t)) }
const chk = (name, ok, detail, extra) => Object.assign({ name, ok: !!ok, detail: detail == null ? "" : String(detail) }, extra || {});
const exitCode = R => (R && Array.isArray(R.flows) && R.flows.length && R.flows.every(f => f.pass)) ? 0 : 1;
const twTime = d => new Date(new Date(d).getTime() + 8 * 36e5).toISOString().replace("T", " ").slice(0, 19) + "（臺灣）";
function toMd(R) {
  const L = ["# 新版內容完整流程回歸（主線第一章、觀星臺、塔防練習賽、英文）", "",
    `- 受測：象棋千秋 **${R.build || "?"}**（${R.source || ""}）${R.url}`,
    `- ${R.browser || ""}；${DISCLAIMER}；每個分頁 localStorage xq_netRoot＝"xq_test"（測試房）`,
    `- 時間：${R.startedAt ? twTime(R.startedAt) : "?"} ～ ${R.finishedAt ? twTime(R.finishedAt) : "?"}；指令 \`${R.command || ""}\``,
    `- 結果：**${R.flows.filter(f => f.pass).length}／${R.flows.length} 個流程全過**；斷言 ${R.flows.reduce((a, f) => a + f.steps.filter(s => s.ok).length, 0)}／${R.flows.reduce((a, f) => a + f.steps.length, 0)} 通過${exitCode(R) ? "（結束碼 1）" : "（結束碼 0）"}`];
  if (R.waited && R.waited.length) L.push(`- 開瀏覽器前等過別的無頭瀏覽器：${R.waited.join("；")}`);
  L.push("", "| 流程 | 名稱 | 結果 | 斷言 | 控制台錯誤 | 頁面錯誤 | 秒 |", "|---|---|---|---:|---:|---:|---:|");
  for (const f of R.flows) L.push(`| ${f.id} | ${f.name} | ${f.pass ? "✅ 通過" : "❌ 失敗"} | ${f.steps.filter(s => s.ok).length}／${f.steps.length} | ${(f.consoleErrors || []).length} | ${(f.pageErrors || []).length} | ${f.ms != null ? Math.round(f.ms / 1000) : "—"} |`);
  const bad = R.flows.flatMap(f => f.steps.filter(s => !s.ok).map(s => ({ f: f.id, s })));
  L.push("", `## 失敗的斷言（${bad.length}）`, "");
  if (!bad.length) L.push("（沒有）");
  for (const b of bad) L.push(`- **${b.f}** ${b.s.name}：${String(b.s.detail).replace(/\n/g, " ").slice(0, 300)}${b.s.shot ? `（shots/${b.s.shot}）` : ""}`);
  for (const f of R.flows) {
    L.push("", `## ${f.id}：${f.name}：${f.pass ? "✅ 通過" : "❌ 失敗"}`, "", `- 環境：${f.env || ""}`);
    if (f.error) L.push(`- ⚠ 流程中斷：${f.error}`);
    L.push("", "| # | 斷言 | 結果 | 量到的 | 截圖 |", "|---:|---|---|---|---|");
    f.steps.forEach((s, i) => L.push(`| ${i + 1} | ${s.name} | ${s.ok ? "✅" : "❌"} | ${String(s.detail).replace(/\|/g, "／").replace(/\n/g, " ").slice(0, 260)} | ${s.shot ? "shots/" + s.shot : ""} |`));
    if ((f.notes || []).length) L.push("", ...f.notes.map(n => "- " + n));
    L.push("", `- 控制台錯誤（${(f.consoleErrors || []).length}）：` + ((f.consoleErrors || []).length ? "" : "無"));
    for (const e of (f.consoleErrors || []).slice(0, 12)) L.push(`  - ${String(e).replace(/\n/g, " ").slice(0, 220)}`);
    L.push(`- 未捕捉的頁面錯誤（${(f.pageErrors || []).length}）：` + ((f.pageErrors || []).length ? f.pageErrors.slice(0, 5).join("；") : "無"));
  }
  return L.join("\n") + "\n";
}
module.exports = { FLOWS, DISCLAIMER, hasCjk, cjkButtons, chk, exitCode, toMd };
if (require.main !== module) return;

// ================= 以下才開瀏覽器 =================
const fs = require("fs"), path = require("path"), http = require("http"), cp = require("child_process");
const HOME = path.join(__dirname, "..", "..", "..");
const { chromium } = require(path.join(HOME, "claude-desktop-tools", "node_modules", "playwright"));
const P0 = require("./p0-regress.js");
const argv = process.argv.slice(2), arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d };
const GIT_REF = arg("--git", ""), PORT = +arg("--port", 8881);
const URL0 = GIT_REF ? `http://127.0.0.1:${PORT}/xiangqi-lab/` : arg("--url", "http://localhost:8821/xiangqi-lab/").replace(/\/?$/, "/");
const OUTDIR = path.resolve(arg("--outdir", path.join(HOME, "xiangqi-db", "tools", "review_loop", "rounds", "r17", "flows"))), SHOTDIR = path.join(OUTDIR, "shots");
const ONLY = arg("--only", "") ? arg("--only").split(",") : null;
const W = +arg("--w", 390), H = +arg("--h", 844);
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString("zh-TW", { hour12: false }), ...a);
fs.mkdirSync(SHOTDIR, { recursive: true });

function listProcs() {
  try { return P0.parseProcList(cp.execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { [string]$_.ProcessId + [char]9 + $_.CommandLine }"], { encoding: "utf8", maxBuffer: 16e6, windowsHide: true })) } catch (e) { return [] }
}
async function waitIdle(R) {
  const t0 = Date.now();
  for (;;) {
    const b = P0.busyProcs(listProcs(), [process.pid, process.ppid]).filter(p => !/flow-regress\.js/.test(p.cmd));
    if (!b.length) return true;
    const d = b.map(p => `${p.pid}：${p.cmd.slice(0, 100)}`).join("｜"); if (!R.waited.includes(d)) { R.waited.push(d); log("別的無頭瀏覽器在跑，等它結束：", d) }
    if (Date.now() - t0 > 40 * 60000) return false; await sleep(15000);
  }
}
/* --git：跟 device-fit.js --git 同一套（公開倉庫已發布檔，git 裡沒有的大檔用本機 site/） */
function gitServe(ref) {
  const SITE = path.join(HOME, "xiangqi-lab", "site"), git = a => cp.execFileSync("git", ["-C", SITE, ...a], { maxBuffer: 400e6, windowsHide: true });
  const commit = git(["rev-parse", ref]).toString().trim(), tree = new Map();
  for (const line of git(["-c", "core.quotePath=false", "ls-tree", "-r", ref]).toString("utf8").split(/\r?\n/)) { const x = /^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(line); if (x) tree.set(x[2], x[1]) }
  const cache = new Map(), blob = p => { if (!tree.has(p)) return null; if (!cache.has(p)) cache.set(p, git(["cat-file", "blob", tree.get(p)])); return cache.get(p) };
  const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".wasm": "application/wasm", ".mp3": "audio/mpeg" };
  const COI = { "Cross-Origin-Embedder-Policy": "require-corp", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Resource-Policy": "same-origin", "Cache-Control": "no-store" };
  return new Promise((res, rej) => { const srv = http.createServer((q, r) => { let u = ""; try { u = decodeURIComponent(q.url.split("?")[0]) } catch (e) { r.writeHead(400); return r.end() } if (!u.startsWith("/xiangqi-lab/")) { r.writeHead(404); return r.end() } u = u.slice(13) || "index.html"; if (u.includes("..") || u === "sw.js") { r.writeHead(404); return r.end() } let b = blob(u); if (!b) { try { b = fs.readFileSync(path.join(SITE, u)) } catch (e) { b = null } } if (!b) { r.writeHead(404); return r.end() } r.writeHead(200, Object.assign({ "Content-Type": MIME[path.extname(u)] || "application/octet-stream" }, COI)); r.end(b) }); srv.on("error", rej); srv.listen(PORT, "127.0.0.1", () => res({ srv, commit })) });
}

/* ---------- 分頁設定：全新、測試房、種子存檔（只種一次，重新載入不再蓋掉＝模擬關掉 App 再開） ---------- */
async function newCtx(browser, F, seed) {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: IPHONE_UA, locale: F.lang === "en" ? "en-US" : "zh-TW", reducedMotion: F.reduced ? "reduce" : "no-preference" });
  await ctx.addInitScript(([seed, lang, mute, del]) => {
    try {
      localStorage.setItem("xq_netRoot", JSON.stringify("xq_test"));
      sessionStorage.setItem("xqTitleShown", "1");
      if (localStorage.getItem("xq_flowSeed")) return;
      localStorage.setItem("xq_flowSeed", "1"); localStorage.setItem("xq_mnqQa", "1");
      const S = (k, v) => localStorage.setItem(k, JSON.stringify(v)), now = Date.now();
      S("xq_me", { id: "qafl" + Math.random().toString(36).slice(2, 8), name: "流程測試" }); S("instAsk", { no: true, at: now });
      const base = { onboard1: true, firstWin: true, langHint: true, focusBoard: true, pChar: "x_swordboy", pSex: "m", pStyle: "real", botPiece: "俥",
        journey: { c: "x_swordboy", sx: "m", born: now, v: 1, era: 2, home: "qin" }, era: "classic", shipDock: ["classic", "qin"], shipAt: "classic", bhXuDone: now, bhxLand: now, bhxPick: "x_swordboy",
        bhXuAsk: now, bhxQuest: 9, instAsk: { no: true, at: now } };
      if (lang === "en") base.lang = "en";
      /* 深夜 23～04 點首頁有一半機率自己跳「星夜茶話會」抽屜（07t ep4），會蓋住要點的按鈕；記成今晚已擲過，流程不受時段影響 */
      { const d = new Date(now - 5 * 36e5); base.ep = { ntr: { [d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate()]: 1 } } }
      if (mute) base.sndMix = { all: true };
      for (const [k, v] of Object.entries(Object.assign(base, seed || {}))) S("m_" + k, v);
      for (const k of del || []) localStorage.removeItem("m_" + k);
    } catch (e) { }
  }, [seed || {}, F.lang, !!F.mute, F.seedDel || []]);
  return ctx;
}
async function openApp(page, hash) {
  await page.goto(URL0 + (hash || "#/"), { waitUntil: "domcontentloaded", timeout: 90000 });
  await waitApp(page);
}
async function waitApp(page) {
  for (let i = 0; i < 90; i++) { await sleep(1000); if (await page.evaluate(() => !!(self.crossOriginIsolated && document.getElementById("view") && document.querySelector("#view > *"))).catch(() => false)) break }
  for (let i = 0; i < 60; i++) { const on = await page.evaluate(() => { const o = document.getElementById("preov"); return !!(o && getComputedStyle(o).display !== "none" && o.getBoundingClientRect().height > 0) }).catch(() => false); if (!on) break; if (i === 45) await page.evaluate(() => { const b = document.querySelector("#preov .pre-skip"); if (b) b.click() }).catch(() => { }); await sleep(800) }
  await sleep(1500);
  /* 記下每一則 toast（有的會被下一則蓋掉、或電影播放時排隊），斷言看這份紀錄 */
  await page.evaluate(() => { if (window.__Tw || typeof toast !== "function") return; window.__Tw = 1; window.__T = []; window.__TS = []; const f = toast; window.toast = function (m) { window.__T.push(String(m)); const r = f.apply(this, arguments); setTimeout(() => { const t = document.getElementById("toast"); window.__TS.push(t ? t.textContent : "") }, 120); return r } }).catch(() => { });
}
const toastMark = page => page.evaluate(() => (window.__T || []).length).catch(() => 0);
const toastsSince = (page, n) => page.evaluate(n => (window.__T || []).slice(n), n).catch(() => []);
/* 畫面上真的顯示的字（英文介面的 MutationObserver 翻過以後；toast 叫了 0.12 秒後讀 #toast） */
const shownSince = (page, n) => page.evaluate(n => (window.__TS || []).slice(n), n).catch(() => []);
async function waitFor(page, fn, arg, ms) { const t0 = Date.now(); for (;;) { const v = await page.evaluate(fn, arg).catch(() => null); if (v) return v; if (Date.now() - t0 > (ms || 15000)) return null; await sleep(300) } }
/* 看得到的元素中心點一下（觸控）；看不到回 null */
async function tapEl(page, sel, re) {
  const p = await page.evaluate(([sel, src]) => { const re = src ? new RegExp(src) : null; const el = [...document.querySelectorAll(sel)].find(e => { const q = e.getBoundingClientRect(); return q.width > 1 && q.height > 1 && getComputedStyle(e).visibility !== "hidden" && (!re || re.test((e.innerText || e.getAttribute("aria-label") || "").trim())) }); if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, t: (el.innerText || "").trim().slice(0, 30) } }, [sel, re ? re.source : ""]);
  if (!p) return null; await page.touchscreen.tap(p.x, p.y); return p;
}
const store = (page, k) => page.evaluate(k => { try { return JSON.parse(localStorage.getItem("m_" + k)) } catch (e) { return null } }, k);
const hashOf = page => page.evaluate(() => location.hash).catch(() => "");
const toastTxt = page => page.evaluate(() => { const t = document.getElementById("toast"); return t && !t.hidden ? t.textContent : "" }).catch(() => "");
/* 畫面上看得到的按鈕字（給英文檢查） */
/* 畫面上看得到的按鈕字（給英文檢查）；只有 aria-label、沒有字的（場景器物熱區）另外放 aria，不算畫面上的字 */
const visButtons = (page, scope) => page.evaluate(scope => { const R = scope ? document.querySelector(scope) : document; if (!R) return [];
  const srOnly = e => { for (let a = e; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a), b = a.getBoundingClientRect(); if (b.width <= 2 || b.height <= 2 || (s.clip && s.clip !== "auto") || /inset\(50%|inset\(100%/.test(s.clipPath || "")) return true } return false };   /* 跟 device-fit 同一個「只給讀屏」規則 */
  return [...R.querySelectorAll("button,[role=button],.shp-spot,a[href]")].filter(e => { const q = e.getBoundingClientRect(); return q.width > 1 && q.height > 1 && q.bottom > 0 && q.top < innerHeight && getComputedStyle(e).visibility !== "hidden" && (e.innerText || "").trim() && !srOnly(e) }).map(e => e.innerText.replace(/\s+/g, " ").trim()) }, scope || null);
/* 時辰到了會自己跳的抽屜（例：子時「星夜茶話會」）會擋住點選：記下來再關掉 */
async function closeSheets(page, S, where) { const t = await page.evaluate(() => { const s = [...document.querySelectorAll("#sheet, .xqs-sheet.on")].filter(e => e.getBoundingClientRect().height > 0); const tx = s.map(e => (e.innerText || "").replace(/\s+/g, " ").slice(0, 40)); try { if (s.length && typeof closeSheet === "function") closeSheet() } catch (e) { } return tx }).catch(() => []); if (t.length) { S.note(`${where}：有自己跳出來的抽屜「${t.join("｜")}」，先關掉`); await sleep(600) } return t }
const ariaOnly = (page, scope) => page.evaluate(scope => { const R = scope ? document.querySelector(scope) : document; if (!R) return []; return [...R.querySelectorAll("button,[role=button],a[href]")].filter(e => !(e.innerText || "").trim() && e.getAttribute("aria-label")).map(e => e.getAttribute("aria-label")) }, scope || null);

/* ---------- 一個流程的骨架 ---------- */
async function runFlow(browser, F, body, R) {
  const out = { id: F.id, name: F.name, steps: [], notes: [], consoleErrors: [], pageErrors: [], pass: false, env: `${W}×${H} iPhone UA、觸控、語言 ${F.lang === "en" ? "English（store lang=en）" : "繁中"}${F.reduced ? "、prefers-reduced-motion: reduce" : ""}${F.mute ? "、全部靜音（store sndMix.all）" : ""}` };
  const t0 = Date.now(); let ctx = null, n = 0;
  for (const f of fs.readdirSync(SHOTDIR)) if (f.startsWith(F.id + "-")) fs.unlinkSync(path.join(SHOTDIR, f));   /* 同一個流程上一次的截圖先清掉，免得混在一起 */
  const S = { add: (name, ok, detail, shot) => { out.steps.push(chk(name, ok, detail, shot ? { shot } : null)); log(F.id, ok ? "✅" : "❌", name, String(detail || "").slice(0, 140)) },
    shot: async (page, nm) => { const f = `${F.id}-${String(++n).padStart(2, "0")}-${nm}.png`; await page.screenshot({ path: path.join(SHOTDIR, f) }).catch(() => { }); return f }, note: t => out.notes.push(t) };
  try {
    ctx = await newCtx(browser, F, F.seed);
    const page = await ctx.newPage(); page.setDefaultTimeout(15000);
    page.on("pageerror", e => out.pageErrors.push(String(e.message).slice(0, 300)));
    page.on("console", m => { if (m.type() === "error") out.consoleErrors.push(m.text().slice(0, 300)) });
    page.on("dialog", d => d.dismiss().catch(() => { }));
    await body(page, S, ctx);
    if (!R.build) R.build = await page.evaluate(() => window.XQ_BUILD || "").catch(() => "");
  } catch (e) { out.error = String(e && e.stack || e).slice(0, 600); log(F.id, "流程中斷", out.error) }
  finally { if (ctx) await ctx.close().catch(() => { }) }
  out.ms = Date.now() - t0;
  out.pass = !out.error && out.steps.length > 0 && out.steps.every(s => s.ok);
  return out;
}

/* ================= 主線 ================= */
const filmLabel = page => page.evaluate(() => { const p = document.getElementById("mnfPg"); return p ? p.getAttribute("aria-label") || "" : "" }).catch(() => "");
const filmClock = page => page.evaluate(() => (typeof MNF !== "undefined" && MNF.cur) ? MNF.cur.clock() : -1).catch(() => -1);
async function qteInfo(page) {
  return page.evaluate(async () => {
    const P = await mnqQteFor(), C = XQCore, b = C.parseFen(String(P.fen).split(" ")[0]), side = P.side || "r", u = P.line[0], f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4));
    const wrong = C.legal(b, side).filter(([a, z]) => a === f && z !== t && !mnfQteJudge(C, b, side, a, z, u).ok).map(x => x[1]);
    return { id: P.id, fen: P.fen, line: P.line, f, t, wrong, hint: P.hint };
  });
}
async function tapQte(page, i) {
  const p = await page.evaluate(i => { const s = document.querySelector("#mnfPg .mnf-qw svg"); if (!s) return null; const r = s.getBoundingClientRect(), k = r.width / 560; return [r.left + (40 + (i % 9) * 60) * k, r.top + (40 + (i / 9 | 0) * 60) * k] }, i);
  if (!p) return false; await page.mouse.click(p[0], p[1]); return true;
}
/* 危機解題：走錯 nWrong 次（每次等倒帶）、再解對；回傳過程量到的 */
async function doQte(page, S, nWrong, tag) {
  const q = await qteInfo(page), seen = { hint: [], demo: [] };
  S.add(`${tag}危機題資料（照本命子出題）`, q && q.line && q.line.length && q.f >= 0, q ? `題號 ${q.id}、正解 ${q.line.join(" ")}、可選錯步 ${q.wrong.length} 個` : "拿不到");
  for (let k = 0; k < nWrong; k++) {
    if (!q.wrong.length) break;
    await tapQte(page, q.f); await sleep(250); await tapQte(page, q.wrong[k % q.wrong.length]); await sleep(1700);
    const st = await page.evaluate(() => ({ hint: (document.querySelector("#mnfPg .mnf-qh") || {}).textContent || "", demo: !!document.querySelector("#mnfPg .mnf-demo"), q: !!document.querySelector("#mnfPg .mnf-q") }));
    seen.hint.push(st.hint); seen.demo.push(st.demo);
    if (k === 0) S.add(`${tag}走錯 1 次：倒帶重來、還沒提示`, st.q && !st.hint && !st.demo, `題目還在 ${st.q}、提示「${st.hint}」、演示鈕 ${st.demo}`, await S.shot(page, "wrong1"));
    if (k === 1) S.add(`${tag}走錯 2 次：出現一句提示`, st.q && !!st.hint && !st.demo, `提示「${st.hint}」、演示鈕 ${st.demo}`, await S.shot(page, "wrong2"));
    if (k === 2) S.add(`${tag}走錯 3 次：出現「看軍師演示」`, st.q && st.demo, `演示鈕 ${st.demo}`, await S.shot(page, "wrong3"));
  }
  for (let s = 0; s * 2 < q.line.length; s++) {
    const u = q.line[s * 2], f = await page.evaluate(u => XQCore.parseSq(u.slice(0, 2)), u), t = await page.evaluate(u => XQCore.parseSq(u.slice(2, 4)), u);
    await tapQte(page, f); await sleep(250); await tapQte(page, t); await sleep(q.line[s * 2 + 1] ? 1100 : 300);
  }
  return q;
}
async function flowMQ(page, S) {
  await openApp(page, "#/");
  const gf = await waitFor(page, () => { const g = document.getElementById("mnqGf"); return g && g.classList.contains("on") ? (g.getAttribute("aria-label") || "") : null }, null, 25000);
  S.add("新玩家選好角色，首頁自動跳出 A1 七星授印禮", gf === "七星授印禮", gf || "25 秒內沒跳", await S.shot(page, "a1"));
  const a1 = await page.evaluate(() => ({ b1: (document.querySelector("#mnqGf1") || {}).textContent, b2: (document.querySelector("#mnqGf2") || {}).textContent }));
  await closeSheets(page, S, "首頁"); await tapEl(page, "#mnqGf1"); await sleep(1500);
  const g1 = await store(page, "mnq"), hb = await store(page, "hintBonus");
  S.add("按「開始第一章」：禮包記下、提示棋 +5", g1 && g1.gift && g1.gift.a1 && (hb | 0) >= 5, `大按鈕「${a1.b1}」；mnq.gift.a1 ${g1 && g1.gift && g1.gift.a1 ? "有" : "沒有"}、hintBonus ${hb}`);
  const lb = await waitFor(page, () => { const p = document.getElementById("mnfPg"); return p && p.getAttribute("aria-label") }, null, 10000);
  S.add("直接開始開章電影「河圖初渡」", /河圖初渡/.test(lb || ""), lb || "10 秒內沒開");
  const sub = await waitFor(page, () => { const s = document.querySelector("#mnfPg .mnf-sub.on"); return s && s.textContent.trim() }, null, 9000);
  const mus = await page.evaluate(() => ({ on: !!(MNF.au && !MNF.au.paused), src: MNF.au ? MNF.au.src.slice(-40) : "", ok: mnfMusOk() }));
  S.add("電影有字幕、有配樂（配樂開著時）", !!sub && mus.on, `字幕「${sub || ""}」；配樂 ${mus.on ? "播放中 " + mus.src : "沒在播"}（mnfMusOk ${mus.ok}）`, await S.shot(page, "c1o"));
  const skipVis = await page.evaluate(() => { const k = document.querySelector("#mnfPg .mnf-k"); return k && getComputedStyle(k).display !== "none" ? k.textContent : "" });
  S.add("電影播放中右上角有「略過」", skipVis === "略過", skipVis || "看不到");
  /* 切到背景：時鐘停、配樂停；回來繼續 */
  const c0 = await filmClock(page);
  await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, get: () => true }); Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" }); document.dispatchEvent(new Event("visibilitychange")) });
  await sleep(2500); const c1 = await filmClock(page), muHid = await page.evaluate(() => !!(MNF.au && !MNF.au.paused));
  await page.evaluate(() => { delete document.hidden; delete document.visibilityState; document.dispatchEvent(new Event("visibilitychange")) });
  await sleep(1500); const c2 = await filmClock(page), muBack = await page.evaluate(() => !!(MNF.au && !MNF.au.paused));
  S.add("切到背景 2.5 秒：電影時鐘停住、配樂暫停；回來接著播", Math.abs(c1 - c0) < 0.35 && c2 > c1 + 0.8 && !muHid && muBack, `時鐘 ${c0.toFixed(2)} → 背景中 ${c1.toFixed(2)} → 回來 1.5 秒 ${c2.toFixed(2)}；背景中配樂 ${muHid ? "還在播" : "停"}、回來 ${muBack ? "播" : "沒播"}`);
  /* 略過開章：任務卡（電影停住）→ 出發＝開章記成看過、接「破局」，破局一開頭就是危機解題 */
  await tapEl(page, "#mnfPg .mnf-k"); await sleep(900);
  const card = await page.evaluate(() => { const c = document.querySelector("#mnfPg .mnf-card"); return c ? { t: c.querySelector("b").textContent, b: [...c.querySelectorAll("button")].map(b => b.textContent) } : null });
  const cc0 = await filmClock(page); await sleep(1000); const cc1 = await filmClock(page);
  S.add("開章按略過：一定先出任務卡（大字寫要做什麼），卡片開著時電影停住", !!card && Math.abs(cc1 - cc0) < 0.1, card ? `「${card.t}」按鈕 ${card.b.join("／")}；時鐘 ${cc0.toFixed(2)}→${cc1.toFixed(2)}` : "沒有任務卡", await S.shot(page, "skipcard"));
  await tapEl(page, "#mnfPg .mnf-card button");
  const qOn = await waitFor(page, () => { const q = document.querySelector("#mnfPg.qt .mnf-q.on"); return q ? q.closest("#mnfPg").getAttribute("aria-label") : null }, null, 10000);
  const seg0 = await store(page, "mnq");
  /* 略過鈕有沒有被「手指點得到」：看最上層（交接時舊的一層會墊在下面約 1.5 秒，不算） */
  const kTop = await page.evaluate(() => { const ks = [...document.querySelectorAll("#mnfPg .mnf-k")].map(k => k.getBoundingClientRect()).filter(r => r.width); return ks.some(r => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e && e.classList.contains("mnf-k") }) });
  S.add("任務卡按「出發」：開章記成看過，接「破局」一開頭就是危機解題；解題時最上層沒有「略過」可點", /破局/.test(qOn || "") && seg0.seg.c1o && !seg0.seg.c1m && !kTop, `${qOn || "沒出現解題"}；seg ${JSON.stringify(seg0.seg)}；最上層點得到略過 ${kTop}`, await S.shot(page, "qte"));
  /* 解題中關掉 App */
  const q0 = await qteInfo(page);
  await tapQte(page, q0.f); await sleep(250); await tapQte(page, q0.wrong[0]); await sleep(1700);
  await page.reload({ waitUntil: "domcontentloaded" }); await waitApp(page); await sleep(1500);
  const nx = await waitFor(page, () => { const b = document.getElementById("mnqNext"); return b && b.textContent }, null, 15000);
  const seg2 = await store(page, "mnq");
  S.add("解題走錯一步時關掉 App 再開：沒有殘留電影，首頁「下一步」接著「破局」；開章仍記著看過", /破局/.test(nx || "") && !(await page.evaluate(() => !!document.getElementById("mnfPg"))) && seg2.seg.c1o && !seg2.seg.c1m, `下一步「${nx}」；seg ${JSON.stringify(seg2.seg)}；qte ${JSON.stringify(seg2.qte)}`, await S.shot(page, "reopen"));
  await closeSheets(page, S, "首頁"); await tapEl(page, "#mnqNext");
  const lb3 = await waitFor(page, () => { const q = document.querySelector("#mnfPg.qt .mnf-q.on"); return q ? q.closest("#mnfPg").getAttribute("aria-label") : null }, null, 12000);
  S.add("按下一步從「破局」接著（不重看開章），危機題重新開始", /破局/.test(lb3 || ""), lb3 || "沒開");
  await doQte(page, S, 3, "");
  const rite = await waitFor(page, () => !!document.querySelector("#mnfRite"), null, 8000);
  const q1 = await store(page, "mnq"), ss = await store(page, "shipSolved");
  S.add("解對：殘局解開儀式出現；解題紀錄 mist 3、用過提示、不是看演示", !!rite && q1 && q1.qte && q1.qte.c1 && q1.qte.c1.mist === 3 && q1.qte.c1.hint === true && q1.qte.c1.demo === false, `儀式 ${rite ? "有" : "沒有"}；qte.c1 ${JSON.stringify(q1 && q1.qte && q1.qte.c1)}`, await S.shot(page, "rite"));
  S.add("解開記進千秋殘局進度（shipSolved.classic）", ss && ss.classic && Object.keys(ss.classic).length > 0, JSON.stringify(ss && ss.classic).slice(0, 160));
  const xpQ = await page.evaluate(() => { const c = document.getElementById("xpchip"); return { chip: c ? c.textContent + "|" + c.style.opacity : "", q: typeof MNF_Q !== "undefined" ? MNF_Q.length : -1 } });
  await waitFor(page, () => !document.querySelector("#mnfRite"), null, 25000);
  const lb2 = await waitFor(page, () => { const p = [...document.querySelectorAll("#mnfPg")].pop(); const l = p && p.getAttribute("aria-label"); return l && /古典之印/.test(l) ? l : null }, null, 40000);
  const seg1 = await store(page, "mnq");
  S.add("儀式後接回「破局」、播完自動接章末「古典之印」；破局記成看過；儀式中修為通知先排隊", !!lb2 && seg1.seg.c1m && !seg1.seg.c1e, `${lb2 || "40 秒內沒到章末"}；seg ${JSON.stringify(seg1.seg)}；儀式中修為小卡「${xpQ.chip}」、排隊 ${xpQ.q}`, await S.shot(page, "c1e"));
  /* 章末播到一半關掉 App */
  await sleep(3000);
  await page.reload({ waitUntil: "domcontentloaded" }); await waitApp(page); await sleep(1500);
  const nx3 = await waitFor(page, () => { const b = document.getElementById("mnqNext"); return b && b.textContent }, null, 15000);
  S.add("章末播到一半關掉 App 再開：下一步接「古典之印」", /古典之印/.test(nx3 || ""), `下一步「${nx3}」`);
  await closeSheets(page, S, "首頁"); await tapEl(page, "#mnqNext");
  const lb4 = await waitFor(page, () => { const p = document.getElementById("mnfPg"); return p && p.getAttribute("aria-label") }, null, 10000);
  await sleep(2500); await tapEl(page, "#mnfPg .mnf-k"); await sleep(900);
  const card3 = await page.evaluate(() => { const c = document.querySelector("#mnfPg .mnf-card"); return c ? { t: c.querySelector("b").textContent, b: [...c.querySelectorAll("button")].map(b => b.textContent) } : null });
  S.add("從章末接著播；按略過＝任務卡寫下一件事、有「回首頁」", /古典之印/.test(lb4 || "") && card3 && card3.b.includes("回首頁"), `${lb4}；${JSON.stringify(card3)}`, await S.shot(page, "endcard"));
  await tapEl(page, "#mnfPg .mnf-card button.g"); await sleep(2500);
  const fin = await page.evaluate(() => ({ hash: location.hash, film: !!document.getElementById("mnfPg"), next: (document.getElementById("mnqNext") || {}).textContent || "", mus: !!(MNF.au && !MNF.au.paused) }));
  const seg3 = await store(page, "mnq");
  S.add("回首頁：電影收掉、配樂停；三段都記成看過、第 1 章亮燈；下一步換成下一件事", /^#\/?$/.test(fin.hash || "#/") && !fin.film && !fin.mus && seg3.seg.c1o && seg3.seg.c1m && seg3.seg.c1e && seg3.lamp && seg3.lamp.classic && !/河圖|破局|古典之印/.test(fin.next), `網址 ${fin.hash}、電影 ${fin.film}、配樂 ${fin.mus}；下一步「${fin.next}」；seg ${Object.keys(seg3.seg).join(",")}、lamp ${JSON.stringify(seg3.lamp)}`, await S.shot(page, "home-after"));
  await page.reload({ waitUntil: "domcontentloaded" }); await waitApp(page);
  const nx2 = await waitFor(page, () => { const b = document.getElementById("mnqNext"); return b && b.textContent }, null, 15000), seg4 = await store(page, "mnq"), gfAgain = await page.evaluate(() => { const g = document.getElementById("mnqGf"); return g ? g.getAttribute("aria-label") : "" });
  const a6 = Object.keys((seg4.gift && seg4.gift.a6) || {}), a6New = a6.filter(k => !((seg3.gift && seg3.gift.a6) || {})[k]);
  S.add("再關掉重開一次：亮燈、看過的段落都在，授印禮不會再跳（下一步只會因為「遠征補給」領過而往前）", seg4.lamp.classic === seg3.lamp.classic && gfAgain !== "七星授印禮" && ["c1o", "c1m", "c1e"].every(k => seg4.seg[k]) && (nx2 === fin.next || (/遠征補給/.test(fin.next) && a6.length > 0)), `回首頁時「${fin.next}」→ 重開「${nx2}」；遠征補給已領 ${JSON.stringify(a6)}（這次新領 ${JSON.stringify(a6New)}）；禮包視窗「${gfAgain}」`);
}
async function flowMQRM(page, S) {
  await openApp(page, "#/");
  const env = await page.evaluate(() => ({ rm: matchMedia("(prefers-reduced-motion:reduce)").matches, all: typeof sxmAllOff === "function" && sxmAllOff(), mus: mnfMusOk(), snd: typeof sndOn === "function" ? sndOn() : null }));
  S.add("環境：減少動態生效、全部靜音生效", env.rm && env.all && !env.mus, JSON.stringify(env));
  const gf = await waitFor(page, () => !!document.querySelector("#mnqGf.on"), null, 25000);
  if (gf) { await tapEl(page, "#mnqGf2"); await sleep(800) }
  await sleep(2500); const blk0 = await page.evaluate(() => { const m = [...document.querySelectorAll(".modal")].filter(e => e.getBoundingClientRect().width > 0).pop(); return m ? m.innerText.replace(/\s+/g, " ").slice(0, 60) : "" });
  if (blk0) { S.note("減少動態：還沒開電影前首頁就跳出「" + blk0 + "」，先按「先不用」"); await tapEl(page, ".modal button", /先不用|不用|取消/); await sleep(800) }
  await closeSheets(page, S, "首頁"); await tapEl(page, "#mnqNext");
  await waitFor(page, () => !!document.getElementById("mnfPg"), null, 10000); await sleep(4000);
  const blk = await page.evaluate(() => { const m = [...document.querySelectorAll(".modal")].filter(e => e.getBoundingClientRect().width > 0).pop(); return m ? m.innerText.replace(/\s+/g, " ").slice(0, 60) : "" });
  S.add("減少動態：開章電影播放時沒有別的視窗蓋在電影上", !blk, blk ? `蓋著「${blk}」（略過鈕在視窗後面點不到）` : "沒有", await S.shot(page, "rm-cover"));
  if (blk) { await tapEl(page, ".modal button", /先不用|不用|取消/); await sleep(800) }
  const m = await page.evaluate(() => { const st = document.querySelector("#mnfPg .mnf-st"), cv = document.querySelector("#mnfPg canvas.mnf-fx"); let px = 0; try { const g = cv.getContext("2d"), d = g.getImageData(0, 0, cv.width, cv.height).data; for (let i = 3; i < d.length; i += 4) if (d[i]) px++ } catch (e) { px = -1 }
    return { tf: st ? st.style.transform : "", px, au: !!(MNF.au && !MNF.au.paused), audios: [...document.querySelectorAll("audio")].filter(a => !a.paused).length, sub: ((document.querySelector("#mnfPg .mnf-sub") || {}).textContent || "") } });
  S.add("減少動態：電影不推拉（scale 1）、不畫粒子（畫布全透明）", (m.tf === "" || /scale\(1\)/.test(m.tf)) && m.px === 0, `transform「${m.tf}」、畫布有顏色的像素 ${m.px}`, await S.shot(page, "rm-film"));
  S.add("全部靜音：電影配樂不播、頁面沒有在播的音訊", !m.au && m.audios === 0, `MNF 配樂 ${m.au ? "在播" : "沒播"}、播放中的 <audio> ${m.audios}`);
  S.add("減少動態：字幕照樣出現", !!m.sub.trim(), `「${m.sub}」`);
  await tapEl(page, "#mnfPg .mnf-k"); await sleep(600); await tapEl(page, "#mnfPg .mnf-card button");
  await waitFor(page, () => !!document.querySelector("#mnfPg .mnf-q"), null, 8000); await sleep(800);
  await doQte(page, S, 0, "減少動態：");
  const rite = await waitFor(page, () => !!document.querySelector("#mnfRite"), null, 8000);
  if (!rite) S.note("減少動態儀式除錯：" + JSON.stringify(await page.evaluate(() => ({ pg: [...document.querySelectorAll("#mnfPg")].map(p => p.className + "|" + p.getAttribute("aria-label")), q: !!document.querySelector(".mnf-q"), qh: (document.querySelector(".mnf-qh") || {}).textContent, mnq: localStorage.getItem("m_mnq"), card: !!document.getElementById("mnqCard") }))) + " 截圖 " + await S.shot(page, "rm-norite"));
  const t0 = Date.now(); await waitFor(page, () => !document.querySelector("#mnfRite"), null, 25000); const riteSec = (Date.now() - t0) / 1000;
  S.add("減少動態：解對後儀式照樣演完、接回電影", !!rite && riteSec < 25, `儀式 ${rite ? "有" : "沒有"}，約 ${riteSec.toFixed(1)} 秒收掉`);
  const lb = await waitFor(page, () => { const p = [...document.querySelectorAll("#mnfPg")].pop(); const l = p && p.getAttribute("aria-label"); return l && /古典之印/.test(l) ? l : null }, null, 40000);
  const au2 = await page.evaluate(() => !!(MNF.au && !MNF.au.paused) || [...document.querySelectorAll("audio")].some(a => !a.paused));
  S.add("減少動態＋靜音：破局播完接章末「古典之印」，全程沒有配樂", !!lb && !au2, `${lb || "沒接上"}；配樂 ${au2 ? "在播" : "沒播"}`, await S.shot(page, "rm-c1e"));
}

/* ================= 觀星臺 ================= */
async function flowGX(page, S) {
  await openApp(page, "#/");
  await page.evaluate(() => document.querySelectorAll("#mnqGf").forEach(e => e.remove()));
  const lock = await page.evaluate(() => ({ spot: !!document.getElementById("hmGxt"), open: gxtOpen() }));
  S.add("還沒打贏黑洞：首頁沒有「觀星臺」", !lock.spot && !lock.open, JSON.stringify(lock));
  await page.evaluate(() => { location.hash = "#/guanxing" }); await sleep(2500);
  const h0 = await hashOf(page), t0 = await toastTxt(page);
  S.add("還沒解鎖時網址直接進 #/guanxing：回首頁", /^#\/?$/.test(h0), `網址 ${h0}、提示「${t0}」`);
  /* 解鎖（照 gxtWon：bhWin＞0）；重開 App */
  await page.evaluate(() => localStorage.setItem("m_bhWin", "1"));
  await page.reload({ waitUntil: "domcontentloaded" }); await waitApp(page);
  await page.evaluate(() => document.querySelectorAll("#mnqGf").forEach(e => e.remove()));
  const sp = await waitFor(page, () => { const b = document.getElementById("hmGxt"); return b ? { t: b.textContent.trim(), hot: b.classList.contains("hot") } : null }, null, 10000);
  const why = await page.evaluate(() => ({ cl: typeof hbIsCl === "function" && hbIsCl(), open: gxtOpen(), at: typeof shipAt === "function" ? shipAt() : "?", dock: typeof shipDockList === "function" ? shipDockList() : "?", hash: location.hash, home: !!document.querySelector(".home-page") }));
  S.add("打贏過黑洞：首頁出現「🔭 觀星臺」，第一次帶 hot 提示", sp && /觀星臺/.test(sp.t) && sp.hot, JSON.stringify(sp) + "；" + JSON.stringify(why), await S.shot(page, "home"));
  await closeSheets(page, S, "首頁"); await tapEl(page, "#hmGxt");
  const h1 = await waitFor(page, () => /^#\/guanxing/.test(location.hash) && document.querySelector(".gxt-page") ? location.hash : null, null, 15000);
  await sleep(2500);
  const pg = await page.evaluate(() => ({ spots: [...document.querySelectorAll(".gxt-page .shp-spot")].map(b => ({ id: b.id, t: b.textContent.trim(), lock: b.classList.contains("lock") })), img: ((document.querySelector(".gxt-page > img") || {}).src || "").split("/").pop(), day: gxtDay(), seen: localStorage.getItem("m_gxtSeen") }));
  const ids = pg.spots.map(s => s.id);
  S.add("點首頁標籤進觀星臺：五個器物標籤都在，三個標「星軌未通」", !!h1 && ["gxtSimul", "gxtGx", "gxtTd", "gxtOmen", "gxtFree"].every(i => ids.includes(i)) && pg.spots.filter(s => s.lock).length === 3, `網址 ${h1}；${pg.spots.map(s => s.t + (s.lock ? "（鎖）" : "")).join("、")}；圖 ${pg.img}（白天 ${pg.day}）`, await S.shot(page, "page"));
  S.add("進過一次就記 gxtSeen", pg.seen === "1", `m_gxtSeen ${pg.seen}`);
  const offs = [];
  for (const id of ["gxtOmen", "gxtFree", "gxtSimul"]) { await page.evaluate(() => { const t = document.getElementById("toast"); if (t) t.hidden = true }); await tapEl(page, "#" + id); const tt = await waitFor(page, () => { const t = document.getElementById("toast"); return t && !t.hidden ? t.textContent : null }, null, 12000); offs.push(`${id}：${tt || "（沒提示）"}；網址 ${await hashOf(page)}`); await sleep(500) }
  S.add("三個未通的點了只跳「星軌未通，敬請期待」，不換頁", offs.every(o => /星軌未通/.test(o) && /#\/guanxing/.test(o)), offs.join("｜"), await S.shot(page, "locked"));
  const ex = await page.evaluate(() => { const e = document.querySelector(".gxt-page .ex-spot, #gxtExit"); return e ? (e.innerText || e.getAttribute("aria-label") || "").trim() : "" });
  await tapEl(page, ".gxt-page .ex-spot, #gxtExit");
  const h2 = await waitFor(page, () => /^#\/?$/.test(location.hash) && document.querySelector(".home-page") ? location.hash || "#/" : null, null, 15000);
  await sleep(1500);
  const sp2 = await page.evaluate(() => { const b = document.getElementById("hmGxt"); return b ? { hot: b.classList.contains("hot") } : null });
  S.add("出口回首頁；首頁標籤不再是 hot", !!h2 && sp2 && !sp2.hot, `出口「${ex}」→ ${h2}；${JSON.stringify(sp2)}`);
  /* 重進 → 星淵遠征 → 練習賽邀請 */
  await closeSheets(page, S, "首頁"); await tapEl(page, "#hmGxt"); await waitFor(page, () => !!document.querySelector(".gxt-page"), null, 15000); await sleep(2000);
  await tapEl(page, "#gxtTd");
  const of = await waitFor(page, () => { const m = [...document.querySelectorAll(".modal")].find(e => /第一次來星淵/.test(e.textContent)); return m ? [...m.querySelectorAll("button")].map(b => b.textContent.trim()) : null }, null, 15000);
  S.add("重進觀星臺點「星淵遠征」：第一次跳練習賽邀請（先練一盤／直接選關）", of && of.some(t => /先練一盤/.test(t)) && of.some(t => /直接選關/.test(t)), JSON.stringify(of), await S.shot(page, "offer"));
  await tapEl(page, ".modal button", /直接選關/);
  const sel = await waitFor(page, () => { const c = document.querySelector(".bt-card.bt-tl"); return c ? { tl: c.textContent.replace(/\s+/g, " ").trim().slice(0, 40), first: c === document.querySelector(".bt-card") } : null }, null, 10000);
  const tl = await store(page, "bhtl");
  S.add("選「我會了，直接選關」：記 skip、不算練完；關卡卡片最上面是練習賽卡", tl && tl.skip && !tl.done && sel && sel.first, `bhtl ${JSON.stringify(tl)}；${JSON.stringify(sel)}`, await S.shot(page, "select"));
}

/* ================= 練習賽 ================= */
async function boardPt(page, i) {
  return page.evaluate(i => { const c = i % 9, r = Math.floor(i / 9); const svg = [...document.querySelectorAll(".view svg, #view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620" && s.getBoundingClientRect().width > 50); if (!svg) return null; const m = svg.getScreenCTM(); const f = !!(svg._o && svg._o.flip); const X = 40 + (f ? 8 - c : c) * 60, Y = 40 + (f ? 9 - r : r) * 60; return { x: m.a * X + m.c * Y + m.e, y: m.b * X + m.d * Y + m.f } }, i);
}
async function tapSq(page, i) { const p = await boardPt(page, i); if (!p) return false; await page.touchscreen.tap(p.x, p.y); return true }
const tlState = page => page.evaluate(() => { const st = typeof BHTL_ST !== "undefined" ? BHTL_ST : null; return st ? { n: (st.moves || []).length, step: bhtlStep(st), W: BHTL_W, box: ((document.getElementById("bhtlBox") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 120), id: st.id, hpE: st.td && st.td.hp, res: st.result || null } : null }).catch(() => null);
async function tlMove(page, u) { const [f, t] = await page.evaluate(u => [XQCore.parseSq(u.slice(0, 2)), XQCore.parseSq(u.slice(2, 4))], u); await tapSq(page, f); await sleep(300); await tapSq(page, t); await sleep(400) }
async function tlWait(page, pred, ms) { const t0 = Date.now(); for (;;) { const s = await tlState(page); if (s && pred(s)) return s; if (Date.now() - t0 > (ms || 20000)) return s; await sleep(400) } }
/* 旁白泡泡每一格都可能重新擺位置（bhtlPlace），用座標點容易點空；泡泡裡的按鈕直接 click()（泡泡本身的 click 委派會處理） */
async function blClick(page, k) { return page.evaluate(k => { const b = document.querySelector(`#bhtlBox [data-bl=${k}]`); if (!b) return false; b.click(); return true }, k) }
async function tlNext(page) { return blClick(page, "next") }
/* 這兩格在畫面上有沒有被旁白泡泡蓋住（蓋住＝手指點不到棋子，走不了也不是因為鎖步） */
const tlCovered = (page, u) => page.evaluate(u => { const svg = [...document.querySelectorAll("#view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620" && s.getBoundingClientRect().width > 50); if (!svg) return null; const m = svg.getScreenCTM(); return [u.slice(0, 2), u.slice(2, 4)].map(q => { const i = XQCore.parseSq(q), X = 40 + (i % 9) * 60, Y = 40 + (i / 9 | 0) * 60, e = document.elementFromPoint(m.a * X + m.e, m.d * Y + m.f); return e && e.closest("#bhtlBox") ? q : null }).filter(Boolean) }, u);
async function gotoTd(page) {
  await page.evaluate(() => { location.hash = "#/guanxing" }); await waitFor(page, () => !!document.querySelector(".gxt-page"), null, 15000); await sleep(2000);
  await tapEl(page, "#gxtTd"); return waitFor(page, () => { const m = [...document.querySelectorAll(".modal")].find(e => /第一次來星淵|星淵試陣|選關/.test(e.textContent)); return m ? m.textContent.replace(/\s+/g, " ").slice(0, 60) : null }, null, 15000);
}
async function flowTL(page, S) {
  await openApp(page, "#/");
  await page.evaluate(() => document.querySelectorAll("#mnqGf").forEach(e => e.remove()));
  const before = await page.evaluate(() => ({ bhCount: localStorage.getItem("m_bhCount"), bhWin: localStorage.getItem("m_bhWin"), bhtd: localStorage.getItem("m_bhtd"), xp: localStorage.getItem("m_xp") }));
  const of = await gotoTd(page);
  S.add("從觀星臺「星淵遠征」進來：跳練習賽邀請", /第一次來星淵/.test(of || ""), of || "沒跳");
  await tapEl(page, ".modal button", /先練一盤/);
  let s = await tlWait(page, s => s.step === "t0", 25000);
  const flat = await page.evaluate(() => { const sv = [...document.querySelectorAll("#view svg")].find(x => x.getAttribute("viewBox") === "0 0 560 620" && x.getBoundingClientRect().width > 50); return { flat: !!sv, w: sv ? Math.round(sv.getBoundingClientRect().width) : 0, hash: location.hash } });
  S.add("開始練習賽：對局頁、平面棋盤、第 0 步說明（兩條元氣）", s && s.step === "t0" && flat.flat && /#\/journey\/play/.test(flat.hash), `步驟 ${s && s.step}、泡泡「${s && s.box}」；平面棋盤寬 ${flat.w}；${flat.hash}`, await S.shot(page, "t0"));
  const tStart = await toastsSince(page, 0);
  S.add("進練習賽時不跳跟練習賽無關的提示", !tStart.some(t => /故事發生在|朝代/.test(t)), `進場後的提示：${JSON.stringify(tStart)}`);
  const era0 = await page.evaluate(() => ({ era: localStorage.getItem("m_era"), user: localStorage.getItem("m_eraUser") }));
  S.add("進練習賽不會把畫面朝代換掉（練習賽不是石桌往事）", era0.era === JSON.stringify("classic"), `m_era ${era0.era}、m_eraUser ${era0.user}`);
  const cov0 = await tlCovered(page, "e3e4");
  let tm = await toastMark(page); await tlMove(page, "e3e4"); await sleep(600); s = await tlState(page); const tt0 = await toastsSince(page, tm);
  S.add("說明還沒按「繼續」就走棋：不送出" + (cov0 && cov0.length ? "（這兩格被旁白泡泡蓋住，手指點不到棋子）" : "、提示先看說明"), s && s.n === 0 && (cov0 && cov0.length ? true : tt0.some(t => /看完說明/.test(t))), `手數 ${s && s.n}、被泡泡蓋住的格 ${JSON.stringify(cov0)}、提示 ${JSON.stringify(tt0)}`);
  await tlNext(page); s = await tlWait(page, s => s.step === "t1", 5000);
  /* 走錯：任何一步不是 e3e4 的合法紅棋 */
  const wrongU = await page.evaluate(() => { const st = BHTL_ST, C = XQCore, L = C.legal(st.board, "r"); const want = [C.parseSq("e3"), C.parseSq("e4")]; const m = L.find(([f, t]) => !(f === want[0] && t === want[1])); const nm = q => "abcdefghi"[q % 9] + (9 - (q / 9 | 0)); return m ? nm(m[0]) + nm(m[1]) : "" });
  tm = await toastMark(page); await tlMove(page, wrongU); await sleep(700); const w1 = await tlState(page), tt1 = (await toastsSince(page, tm)).join("／");
  await tlMove(page, wrongU); await sleep(700); const w2 = await tlState(page);
  S.add("t1 走錯（" + wrongU + "）：不送出、提示「先走發亮的那一步」；第 2 次給黃框", w1 && w1.n === 0 && /發亮/.test(tt1) && w2 && w2.n === 0 && w2.W >= 2, `第 1 次手數 ${w1 && w1.n}、提示「${tt1}」；第 2 次手數 ${w2 && w2.n}、錯次 ${w2 && w2.W}`, await S.shot(page, "t1-wrong"));
  await tlMove(page, "e3e4"); s = await tlWait(page, s => s.n >= 2 && s.step === "t1b", 20000);
  S.add("走對 e3e4（兵五進一吃卒）：星樞回一手，進 t1b 說明", s && s.n === 2 && s.step === "t1b", `手數 ${s && s.n}、步驟 ${s && s.step}`);
  await tlNext(page); s = await tlWait(page, s => s.step === "t2", 5000);
  await tlMove(page, "i0i6"); s = await tlWait(page, s => s.n >= 4 && s.step === "t2b", 20000);
  S.add("t2 俥一進六堵星門：星樞回一手，進 t2b", s && s.n === 4 && s.step === "t2b", `手數 ${s && s.n}、步驟 ${s && s.step}`, await S.shot(page, "t2b"));
  const gameId = s && s.id;
  /* 中途關掉 App */
  await page.reload({ waitUntil: "domcontentloaded" }); await waitApp(page);
  await page.evaluate(() => document.querySelectorAll("#mnqGf").forEach(e => e.remove()));
  const h = await hashOf(page);
  let r1 = await tlState(page);
  if (!r1 || r1.id !== gameId) { const of2 = await gotoTd(page); S.note(`重開後網址 ${h}；從觀星臺重進看到：${of2}`); if (/第一次來星淵/.test(of2 || "")) await tapEl(page, ".modal button", /先練一盤/); else await tapEl(page, ".bt-card.bt-tl"); r1 = await tlWait(page, s => s.n === 4, 20000) }
  S.add("中途關掉 App 再進來：同一盤接著下（手數 4、t2b），不從頭", r1 && r1.id === gameId && r1.n === 4 && r1.step === "t2b", `重開後網址 ${h}；盤 ${r1 && r1.id}（原 ${gameId}）、手數 ${r1 && r1.n}、步驟 ${r1 && r1.step}`, await S.shot(page, "resume"));
  await tlNext(page); s = await tlWait(page, s => s.step === "t3", 6000);
  const cov3 = await tlCovered(page, "i6e6");
  tm = await toastMark(page); await tlMove(page, "i6e6"); await sleep(500); const c0 = await tlState(page), ttc = await toastsSince(page, tm);
  S.add("t3 該放招時先走棋：不送出" + (cov3 && cov3.length ? "（這兩格被旁白泡泡蓋住）" : "、提示先點招式鈕"), c0 && c0.n === 4 && (cov3 && cov3.length ? true : ttc.some(t => /招式鈕/.test(t))), `手數 ${c0 && c0.n}、步驟 ${c0 && c0.step}、被泡泡蓋住的格 ${JSON.stringify(cov3)}、提示 ${JSON.stringify(ttc)}`);
  const sk = await tapEl(page, "#bhtdMe .bt-sk"); await sleep(900); s = await tlState(page);
  if (s && s.step === "t3g") { const tg = await page.evaluate(() => { const T = BHTD.TL.tg[BHTD_TG.id] || []; return T.map(u => XQCore.parseSq(u)) }); for (const q of tg) { await tapSq(page, q); await sleep(700) } }
  s = await tlWait(page, s => s.step === "t4", 12000);
  S.add("點招式鈕放第 1 招（有目標就點發亮的格）→ 陣眼子問題", s && s.step === "t4", `招式鈕 ${sk ? sk.t : "沒找到"}；步驟 ${s && s.step}；泡泡「${s && s.box}」`, await S.shot(page, "t4"));
  await blClick(page, "a0"); await sleep(600); const qa = await tlState(page);
  await blClick(page, "a1"); s = await tlWait(page, s => s.step === "t5", 5000);
  S.add("陣眼子問題答錯：說「再想想」、不前進；答對進 t5", qa && qa.step === "t4" && /再想想/.test(qa.box) && s && s.step === "t5", `答錯後泡泡「${qa && qa.box}」；答對後 ${s && s.step}`);
  await tlMove(page, "i6e6");
  const res = await waitFor(page, () => { const m = [...document.querySelectorAll(".modal")].find(e => /練習賽/.test(e.textContent)); return m ? { h: (m.querySelector("h2") || {}).textContent, b: [...m.querySelectorAll("button")].map(b => b.textContent.trim()) } : null }, null, 25000);
  const after = await page.evaluate(() => ({ bhCount: localStorage.getItem("m_bhCount"), bhWin: localStorage.getItem("m_bhWin"), bhtd: localStorage.getItem("m_bhtd"), xp: localStorage.getItem("m_xp") })), tl = await store(page, "bhtl");
  S.add("t5 俥一平五將軍 → 練習賽過關結果視窗（開始第 1 關／再練一次／回航）", res && /過關/.test(res.h || "") && res.b.some(t => /再練一次/.test(t)), JSON.stringify(res), await S.shot(page, "result"));
  S.add("練完記 bhtl.done、n＝1；不記 bhCount／bhWin／bhtd、不給修為", tl && tl.done && tl.n === 1 && JSON.stringify(after) === JSON.stringify(before), `bhtl ${JSON.stringify({ done: !!(tl && tl.done), n: tl && tl.n, skip: tl && tl.skip })}；前 ${JSON.stringify(before)}；後 ${JSON.stringify(after)}`);
  await tapEl(page, ".modal button", /再練一次/); s = await tlWait(page, s => s.n === 0 && s.step === "t0", 20000);
  S.add("按「再練一次」：新的一盤從第 0 步開始", s && s.n === 0 && s.step === "t0" && s.id !== gameId, `盤 ${s && s.id}、手數 ${s && s.n}、步驟 ${s && s.step}`);
  await blClick(page, "skip"); await sleep(700);
  const q = await page.evaluate(() => { const m = [...document.querySelectorAll(".modal")].find(e => /跳過練習/.test(e.textContent)); return m ? [...m.querySelectorAll("button")].map(b => b.textContent.trim()) : null });
  await tapEl(page, ".modal button", /^跳過$/);
  const sel = await waitFor(page, () => !!document.querySelector(".bt-card.bt-tl"), null, 15000), tl2 = await store(page, "bhtl");
  S.add("練習中按「跳過練習」→ 確認 → 認輸收掉、直接到關卡卡片；記 skip、練完次數不變", q && sel && tl2 && tl2.skip && tl2.n === 1, `確認視窗 ${JSON.stringify(q)}；關卡卡片 ${sel}；bhtl n ${tl2 && tl2.n}、skip ${!!(tl2 && tl2.skip)}`, await S.shot(page, "skip"));
}

/* ================= 英文 ================= */
async function flowEN(page, S) {
  await openApp(page, "#/");
  const lang = await page.evaluate(() => ({ lang: document.documentElement.lang, st: i18nLang() }));
  S.add("英文介面生效（html lang、store lang）", lang.st === "en" && /^en/.test(lang.lang), JSON.stringify(lang));
  const gf = await waitFor(page, () => { const g = document.getElementById("mnqGf"); return g && g.classList.contains("on") ? { h: (g.querySelector("h2") || {}).textContent, b: [...g.querySelectorAll("button")].map(b => b.textContent) } : null }, null, 25000);
  S.add("英文：A1 禮包的標題和按鈕沒有中文", gf && !hasCjk(gf.h) && !cjkButtons(gf.b).length, JSON.stringify(gf), await S.shot(page, "a1"));
  if (gf) await tapEl(page, "#mnqGf2"); await sleep(1000);
  const nx = await page.evaluate(() => (document.getElementById("mnqNext") || {}).textContent || "");
  const home = await visButtons(page, ".home-page");
  S.add("英文：首頁「下一步」按鈕沒有中文", nx && !hasCjk(nx), `「${nx}」`, await S.shot(page, "home"));
  S.add("英文：首頁其他標籤（畫面上的字）沒有中文", !cjkButtons(home).length, `有中文 ${cjkButtons(home).length}／${home.length}：${cjkButtons(home).slice(0, 8).join("、")}`);
  const ha = await ariaOnly(page, ".home-page"); S.note(`首頁只給讀屏的熱區名稱（aria-label）還是中文的：${cjkButtons(ha).length}／${ha.length}（例：${cjkButtons(ha).slice(0, 6).join("、")}）`);
  await page.evaluate(() => document.querySelectorAll("#mnqGf").forEach(e => e.remove()));
  await closeSheets(page, S, "英文首頁");
  const tnx = await closeSheets(page, S, "首頁"); await tapEl(page, "#mnqNext"); const fOn = await waitFor(page, () => !!document.getElementById("mnfPg"), null, 10000);
  if (!fOn) { S.add("英文：按首頁「下一步」開始開章電影", false, `點了 ${JSON.stringify(tnx)}；10 秒內沒有電影；網址 ${await hashOf(page)}；視窗 ${await page.evaluate(() => [...document.querySelectorAll(".modal,#mnqGf,#mnqCard")].map(e => (e.innerText || "").replace(/\s+/g, " ").slice(0, 50)).join("｜"))}`, await S.shot(page, "nofilm")); await page.evaluate(() => mnqChapter("classic")); await waitFor(page, () => !!document.getElementById("mnfPg"), null, 10000) }
  await sleep(3500);
  const film = await page.evaluate(() => { const p = document.getElementById("mnfPg"); return { k: (document.querySelector("#mnfPg .mnf-k") || {}).textContent, sub: (document.querySelector("#mnfPg .mnf-sub") || {}).textContent, lb: p ? p.getAttribute("aria-label") : "" } });
  S.add("英文：電影「略過」鈕沒有中文", film.k && !hasCjk(film.k), `略過鈕「${film.k}」、aria-label「${film.lb}」`, await S.shot(page, "film"));
  S.note(`電影字幕（劇情，07i18n 規則不翻）：「${film.sub}」`);
  await tapEl(page, "#mnfPg .mnf-k"); await sleep(900);
  const card = await page.evaluate(() => { const c = document.querySelector("#mnfPg .mnf-card"); return c ? { t: c.querySelector("b").textContent, b: [...c.querySelectorAll("button")].map(b => b.textContent) } : null });
  S.add("英文：略過後任務卡的字和按鈕沒有中文", card && !hasCjk(card.t) && !cjkButtons(card.b).length, JSON.stringify(card), await S.shot(page, "card"));
  await tapEl(page, "#mnfPg .mnf-card button"); await waitFor(page, () => !!document.querySelector("#mnfPg .mnf-q.on"), null, 8000); await sleep(800);
  const qt = await page.evaluate(() => ({ big: (document.querySelector("#mnfPg .mnf-big") || {}).textContent, say: (document.querySelector("#mnfPg .mnf-qs") || {}).textContent }));
  S.add("英文：危機解題的大字和說明沒有中文", !hasCjk(qt.big) && !hasCjk(qt.say), JSON.stringify(qt), await S.shot(page, "qte"));
  /* 觀星臺 */
  await page.evaluate(() => { document.querySelectorAll("#mnfPg,#mnfBk,#mnfRite").forEach(e => e.remove()); try { mnfMusicStop(0) } catch (e) { } localStorage.setItem("m_bhWin", "1"); for (const k of ["journey", "shipDock", "shipAt"]) localStorage.removeItem("m_" + k) });
  await page.reload({ waitUntil: "domcontentloaded" }); await waitApp(page); await page.evaluate(() => document.querySelectorAll("#mnqGf").forEach(e => e.remove()));
  const hg = await page.evaluate(() => (document.getElementById("hmGxt") || {}).textContent || "");
  S.add("英文：首頁「觀星臺」標籤沒有中文", hg && !hasCjk(hg), `「${hg}」`);
  await page.evaluate(() => { location.hash = "#/guanxing" }); await waitFor(page, () => !!document.querySelector(".gxt-page"), null, 15000); await sleep(2500);
  const gx = await visButtons(page, ".gxt-page"), top = await page.evaluate(() => ((document.getElementById("topbar") || document.querySelector(".topbar") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 60));
  S.add("英文：觀星臺頁的標籤、出口沒有中文", gx.length && !cjkButtons(gx).length, `有中文 ${cjkButtons(gx).length}／${gx.length}：${cjkButtons(gx).join("、")}；頂欄「${top}」`, await S.shot(page, "guanxing"));
  await page.evaluate(() => { const t = document.getElementById("toast"); if (t) t.hidden = true }); await tapEl(page, "#gxtOmen"); const tt = await waitFor(page, () => { const t = document.getElementById("toast"); return t && !t.hidden ? t.textContent : null }, null, 12000);
  S.add("英文：「星軌未通」提示沒有中文", tt && !hasCjk(tt), `「${tt}」`);
  /* 練習賽 */
  const tm0 = await toastMark(page); await tapEl(page, "#gxtTd");
  const of = await waitFor(page, () => { const m = [...document.querySelectorAll(".modal")].pop(); return m ? { h: (m.querySelector("h2") || {}).textContent, b: [...m.querySelectorAll("button")].map(b => b.textContent.trim()), say: (m.querySelector(".pl-say,p") || {}).textContent } : null }, null, 15000);
  S.add("英文：練習賽邀請的標題和按鈕沒有中文", of && !hasCjk(of.h) && !cjkButtons(of.b).length, JSON.stringify(of), await S.shot(page, "offer"));
  await tapEl(page, ".modal button"); const s = await tlWait(page, s => s.step === "t0", 25000);
  const box = await page.evaluate(() => { const b = document.getElementById("bhtlBox"); return b ? { b: [...b.querySelectorAll("button")].map(x => x.textContent.trim()), p: [...b.querySelectorAll("p")].map(x => x.textContent.trim()) } : null });
  S.add("英文：練習賽說明泡泡的按鈕（繼續、跳過練習）沒有中文", box && !cjkButtons(box.b).length, JSON.stringify(box && box.b), await S.shot(page, "t0"));
  S.note(`練習賽旁白（角色台詞，07i18n 規則不翻）：${box ? box.p.join(" ／ ").slice(0, 200) : "—"}；步驟 ${s && s.step}`);
  await sleep(1000); const tEra = await shownSince(page, tm0);
  S.add("英文：進練習賽後跳出的提示（畫面上顯示的字）沒有中文", !tEra.some(hasCjk), JSON.stringify(tEra));
  await blClick(page, "next"); await tlWait(page, s => s.step === "t1", 5000);
  const tm = await toastMark(page); await tlMove(page, "c3c4"); await sleep(900); const tt2 = await shownSince(page, tm);
  S.add("英文：練習賽走錯的鎖步提示沒有中文", tt2.length && !tt2.some(hasCjk), JSON.stringify(tt2), await S.shot(page, "t1-wrong"));
}

(async () => {
  const R = { tool: "xiangqi-lab/tools/qa/flow-regress.js", command: "node xiangqi-lab/tools/qa/flow-regress.js " + argv.join(" "), url: URL0, source: "", build: "", browser: "", startedAt: new Date().toISOString(), waited: [], flows: [], errors: [] };
  let browser = null, srv = null;
  try {
    if (!(await waitIdle(R))) { R.errors.push("等別的無頭瀏覽器超過 40 分鐘，沒跑"); return }
    if (GIT_REF) { const g = await gitServe(GIT_REF); srv = g.srv; R.source = `公開倉庫已發布檔 ${GIT_REF}（${g.commit.slice(0, 10)}），本機伺服器送出`; R.git = g.commit } else R.source = "網址 " + URL0;
    const ih = /localhost:8821/.test(URL0) ? path.join(process.env.TEMP || "", "claude", "C--Users-rayson-myClaude", "a1520069-d9a3-4c4a-a1ad-2cbf5ca0228d", "scratchpad", "bhtd-index.html") : "";
    if (ih && fs.existsSync(ih)) { const b = fs.readFileSync(ih); R.indexSha256 = require("crypto").createHash("sha256").update(b).digest("hex"); R.indexMtime = fs.statSync(ih).mtime.toISOString(); R.source += `（bhtd-index.html sha256 ${R.indexSha256.slice(0, 12)}、${R.indexMtime}）` }
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio", "--autoplay-policy=no-user-gesture-required"] });
    R.browser = "Chrome（headless）" + browser.version();
    const BODY = { MQ: flowMQ, MQRM: flowMQRM, GX: flowGX, TL: flowTL, EN: flowEN };
    for (const F of FLOWS) { if (ONLY && !ONLY.includes(F.id)) continue; log("=== 流程", F.id, F.name); R.flows.push(await runFlow(browser, F, BODY[F.id], R)) }
  } catch (e) { R.errors.push(String(e && e.stack || e).slice(0, 500)) }
  finally {
    if (browser) await browser.close().catch(() => { }); if (srv) srv.close();
    R.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUTDIR, "flow-regress.json"), JSON.stringify(R, null, 1));
    fs.writeFileSync(path.join(OUTDIR, "flow-regress.md"), toMd(R) + (R.errors.length ? "\n## 執行錯誤\n" + R.errors.map(e => "- " + e).join("\n") + "\n" : ""));
    log("完成", path.join(OUTDIR, "flow-regress.md"), R.flows.map(f => f.id + (f.pass ? "✅" : "❌")).join(" "));
    process.exitCode = exitCode(R);
  }
})();
