#!/usr/bin/env node
// 第 11 輪 F2：把「本機使用與健康紀錄」（xq-health-v1，玩家自己複製或存檔給開發者的）和匿名新手流程（onboard-funnel.jsonl）做成漏斗報告。
//   首次開啟 → 選角 → 第一盤 → 下完第一盤 → 回訪（第 2 天、第 7 天）的人數、轉換率、中位耗時，以及各功能觸達率。
// 用法：
//   node xiangqi-lab/tools/health-funnel.js                         預設：xiangqi-db/onboard-funnel.jsonl＋xiangqi-db/health-exports/ 底下的 *.json
//   node xiangqi-lab/tools/health-funnel.js a.json b.json 資料夾     指定健康紀錄（檔案或資料夾；一個檔可以是一份、一個陣列，或每行一份）
//   --funnel 某個.jsonl   指定新手流程檔；--test 用 onboard-funnel.test.jsonl（含 test:1 的）
//   --only fun|health     只用其中一種來源
//   --tele [檔案]          加一段「匿名健康摘要」彙整（collect-anon.js 收的 t:"hlt"，預設 xiangqi-db/health-telemetry.jsonl）
//   --out 報告.md          寫成檔案（LF）；--json 印計算結果（給其他工具用）
// 兩種來源都刻意不帶可以互相對照的編號（健康紀錄沒有安裝碼），所以同一支手機如果兩邊都有，漏斗會算兩次；報告會寫出各來源幾筆。
// 測試：xiangqi-lab/tools/test-health-funnel.js
"use strict";
const fs = require("fs"), path = require("path");
const DB = path.join(__dirname, "..", "..", "xiangqi-db");
const DAY = 864e5;
/* 漏斗的四步（05b-save.js 的 fnStep 步驟名）；回訪兩步另外算 */
const STEPS = [["open", "首次開啟"], ["pick", "選角"], ["g1", "第一盤開始"], ["g1e", "下完第一盤"]];
const RETURN = [[1, "第 2 天回訪"], [6, "第 7 天回訪"]];
/* 功能觸達：健康紀錄只記頁面名（網址 #/ 後第一段），所以只能用頁面名分組；3D 沒有自己的頁面名（在星槎、園子、黑洞棋盤頁裡面），只能用 ship 近似 */
const FEATURES = [
  ["故事（石桌往事、雲河棋路、傳說）", ["journey", "legend", "adventure", "qqev", "battle"]],
  ["星槎（雲河七星正文、3D 甲板；3D 的近似）", ["ship"]],
  ["殘局", ["canju"]],
  ["挑戰電腦、練功房", ["cpu", "cpuroom", "arena"]],
  ["線上大廳、千秋盃、觀戰", ["lobby", "join", "watch", "cup", "coop"]],
  ["大師對局、棋譜庫", ["db", "gm", "shelf", "openings"]],
  ["測驗、主題練習、新手訓練營", ["quiz", "guess", "theme", "camp", "lesson", "redo"]],
  ["我的棋力、週報", ["stats", "me", "weekly", "profile"]],
  ["設定", ["settings"]]];
/* 健康紀錄從 20261112-1341 版開始記：那天以前就裝好的手機，recordingSince 是更新到那版的日子，不是第一次開啟。
   回訪率只算「recordingSince 晚於這天」而且有新手流程的手機（確定是新裝的）；--since 可以改 */
const HEAL_SHIP_DAY = "2026-11-12";

const med = a => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2) };
const pct = (n, d) => d ? Math.round(n * 1000 / d) / 10 : null;
const fmtS = s => s == null ? "—" : s < 120 ? s + " 秒" : s < 7200 ? (s / 60).toFixed(1) + " 分" : (s / 3600).toFixed(1) + " 小時";
const fmtP = p => p == null ? "—" : p + "%";
const addDays = (d, n) => new Date(Date.parse(d + "T00:00:00Z") + n * DAY).toISOString().slice(0, 10);
const isDay = d => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d);

/* ---------- 讀資料 ---------- */
/* onboard-funnel.jsonl：同一台裝置（iid）會收到好幾筆（每多一步送一次整份），取步驟最多的那筆（跟 onboard-funnel.js 同一套） */
function loadFunnel(text, opt) {
  opt = opt || {}; const by = {};
  for (const ln of String(text || "").split("\n")) {
    if (!ln.trim()) continue; let r; try { r = JSON.parse(ln) } catch (e) { continue }
    if (!r || typeof r.iid !== "string" || !r.s || typeof r.s !== "object" || r.s.open == null) continue; if (!opt.test && r.test) continue;
    const o = by[r.iid]; if (!o || Object.keys(r.s).length >= Object.keys(o.s).length) by[r.iid] = { iid: r.iid, s: r.s, ver: r.ver || "", dev: r.dev || "?", first: o ? Math.min(o.first, r.at || o.first) : r.at || 0, last: Math.max(o ? o.last : 0, r.at || 0) };
  }
  return Object.values(by);
}
/* 健康紀錄：只收 format＝xq-health-v1 的物件 */
function parseHealth(text) {
  const out = [], push = x => { if (Array.isArray(x)) x.forEach(push); else if (x && typeof x === "object" && x.format === "xq-health-v1" && x.usage && x.app) out.push(x) };
  const t = String(text || "").trim(); if (!t) return out;
  try { push(JSON.parse(t)); return out } catch (e) { }
  for (const ln of t.split("\n")) { try { push(JSON.parse(ln)) } catch (e) { } }
  return out;
}
function readHealthPaths(paths) {
  const out = [], files = [];
  for (const p of paths) {
    if (!fs.existsSync(p)) continue;
    if (fs.statSync(p).isDirectory()) { for (const f of fs.readdirSync(p).sort()) if (/\.(json|jsonl|txt)$/i.test(f)) files.push(path.join(p, f)) } else files.push(p);
  }
  for (const f of files) for (const x of parseHealth(fs.readFileSync(f, "utf8"))) out.push(x);
  return { list: out, files };
}

/* ---------- 計算 ---------- */
/* 一份健康紀錄的回訪：以 recordingSince 那天為第 1 天；第 k+1 天有開＝回訪。
   觀察到哪天：匯出時間和 perDay 最後一天取晚的；還沒到那天＝還看不到（不算進分母）。
   perDay 只留最近 30 天：用過的天數比 perDay 多、而且要看的那天比 perDay 最早一天還早＝看不到 */
function returnOf(h, k) {
  const d0 = h.app.recordingSince; if (!isDay(d0)) return null;
  const per = h.usage.perDay || {}, keys = Object.keys(per).filter(isDay).sort(), target = addDays(d0, k);
  const end = [String(h.app.exportedAt || "").slice(0, 10), keys[keys.length - 1] || ""].filter(isDay).sort().pop() || d0;
  if (end < target) return null;
  const cut = (h.usage.activeDays || 0) > keys.length;
  if (per[target] > 0) return true;
  if (cut && keys.length && target < keys[0]) return null;
  return false;
}
/* 7 天內有沒有回來過（第 2～7 天任一天） */
function return7(h) {
  const d0 = h.app.recordingSince; if (!isDay(d0)) return null;
  for (let k = 1; k <= 6; k++) if (returnOf(h, k) === true) return true;
  for (let k = 1; k <= 6; k++) if (returnOf(h, k) == null) return null;
  return false;
}
const isNewDevice = (h, since) => !!(h.onboarding && h.onboarding.steps && isDay(h.app.recordingSince) && h.app.recordingSince > (since || HEAL_SHIP_DAY));

function analyze(fun, health, opt) {
  opt = opt || {};
  const rows = fun.map(r => ({ src: "fun", s: r.s, dev: r.dev, ver: r.ver }))
    .concat(health.filter(h => h.onboarding && h.onboarding.steps).map(h => ({ src: "health", s: h.onboarding.steps, dev: "?", ver: h.app.version || "" })));
  const N = rows.filter(r => r.s.open != null).length;
  const steps = []; let prev = null;
  for (const [k, nm] of STEPS) {
    const L = rows.map(r => r.s[k]).filter(v => v != null && isFinite(+v)).map(Number), n = L.length;
    steps.push({ key: k, name: nm, n, ofOpen: pct(n, N), ofPrev: prev == null ? null : pct(n, prev), medianSec: k === "open" ? 0 : med(L) });
    prev = n;
  }
  /* 跳步：有第一盤卻沒有選角（11/11 0923 版第一課後可以直接「下一盤簡單的棋」，選角在後面） */
  const skipPick = rows.filter(r => r.s.g1 != null && r.s.pick == null).length;
  const newH = health.filter(h => isNewDevice(h, opt.since));
  const ret = RETURN.map(([k, nm]) => { const v = newH.map(h => returnOf(h, k)).filter(x => x != null); const n = v.filter(Boolean).length; return { key: "d" + (k + 1), name: nm, n, eligible: v.length, rate: pct(n, v.length) } });
  const r7v = newH.map(return7).filter(x => x != null), r7 = { name: "7 天內回訪過（第 2～7 天任一天）", n: r7v.filter(Boolean).length, eligible: r7v.length, rate: pct(r7v.filter(Boolean).length, r7v.length) };
  const allRet = RETURN.map(([k, nm]) => { const v = health.map(h => returnOf(h, k)).filter(x => x != null); const n = v.filter(Boolean).length; return { key: "d" + (k + 1), name: nm, n, eligible: v.length, rate: pct(n, v.length) } });
  const feats = FEATURES.map(([nm, pages]) => { const hit = health.filter(h => pages.some(p => (h.usage.features || {})[p] > 0)); const days = hit.map(h => Math.min(...pages.map(p => (h.usage.firstUseDay || {})[p]).filter(v => v != null && isFinite(v)))).filter(isFinite);
    return { name: nm, pages, n: hit.length, of: health.length, rate: pct(hit.length, health.length), medianFirstDay: med(days) } });
  const pages = {}; for (const h of health) for (const [p, c] of Object.entries(h.usage.features || {})) if (c > 0) pages[p] = (pages[p] || 0) + 1;
  const dev = {}; for (const r of fun) dev[r.dev] = (dev[r.dev] || 0) + 1;
  const vers = {}; for (const r of rows) { const v = String(r.ver || "?").slice(0, 8) || "?"; vers[v] = (vers[v] || 0) + 1 }
  return { sources: { fun: fun.length, health: health.length, healthWithOnboarding: health.filter(h => h.onboarding).length, healthNewDevices: newH.length }, N, steps, skipPick, ret, r7, allRet, feats,
    pages: Object.entries(pages).sort((a, b) => b[1] - a[1]), dev, vers };
}

/* 匿名健康摘要（t:"hlt"，collect-anon.js 存的 health-telemetry.jsonl）：每一筆＝某一支手機某一天，沒有編號 */
function analyzeTele(text) {
  const L = []; for (const ln of String(text || "").split("\n")) { if (!ln.trim()) continue; try { const x = JSON.parse(ln); if (x && x.v === 1 && !x.test) L.push(x) } catch (e) { } }
  const byVer = {};
  for (const x of L) { const v = x.ver || "?"; const o = byVer[v] = byVer[v] || { ver: v, n: 0, withErr: 0, err: 0, lt: [], bt: [], rf: 0 }; o.n++; if (x.e > 0) o.withErr++; o.err += x.e | 0; o.lt.push(Array.isArray(x.lt) ? x.lt[0] | 0 : 0); if (x.bt != null) o.bt.push(x.bt); o.rf += (x.rf || []).reduce((s, v) => s + (v | 0), 0) }
  const msgs = {}; for (const x of L) for (const m of x.em || []) { const k = (m[0] || "") + " @" + (m[1] || "") + ":" + (m[2] || 0); msgs[k] = (msgs[k] || 0) + 1 }
  return { n: L.length, byVer: Object.values(byVer).sort((a, b) => a.ver < b.ver ? 1 : -1).map(o => ({ ver: o.ver, n: o.n, withErrRate: pct(o.withErr, o.n), errors: o.err, medianLongTasks: med(o.lt), medianBootMs: med(o.bt), resFail: o.rf })),
    topErrors: Object.entries(msgs).sort((a, b) => b[1] - a[1]).slice(0, 10) };
}

/* ---------- 輸出 ---------- */
const MIN_N = 30;
function renderMd(R, T, meta) {
  meta = meta || {}; const o = [];
  o.push(`資料來源：匿名新手流程 ${R.sources.fun} 台裝置（${meta.funnelFile || "onboard-funnel.jsonl"}）；玩家給的健康紀錄 ${R.sources.health} 份（其中有新手流程的 ${R.sources.healthWithOnboarding} 份、確定是新裝的 ${R.sources.healthNewDevices} 份）。`);
  if (R.N < MIN_N) o.push("", `> **樣本只有 ${R.N} 筆，不能下結論。** 下面的百分比只是把這 ${R.N} 筆照實算出來；要到至少 ${MIN_N} 台新裝置以上，轉換率才有參考價值。`);
  o.push("", "| 階段 | 人數 | 佔首次開啟 | 比上一階段 | 中位耗時（距離第一次打開） |", "|---|---|---|---|---|");
  for (const s of R.steps) o.push(`| ${s.name} | ${s.n} | ${fmtP(s.ofOpen)} | ${s.key === "open" ? "—" : fmtP(s.ofPrev)} | ${s.key === "open" ? "0 秒" : fmtS(s.medianSec)} |`);
  for (const r of R.ret) o.push(`| ${r.name} | ${r.eligible ? r.n + "／" + r.eligible : "—"} | ${fmtP(r.rate)} | — | — |`);
  o.push("", `- 回訪率只能從健康紀錄算（匿名新手流程下完第一盤就停，不知道之後有沒有回來）。分母＝確定是新裝、而且匯出時已經過了那一天的手機；目前 ${R.ret[0].eligible} 份可以算第 2 天、${R.ret[1].eligible} 份可以算第 7 天。`);
  o.push(`- ${R.r7.name}：${R.r7.eligible ? R.r7.n + "／" + R.r7.eligible + "（" + fmtP(R.r7.rate) + "）" : "沒有可以算的資料"}。`);
  if (R.skipPick) o.push(`- 有 ${R.skipPick} 台「第一盤開始」卻沒有「選角」：可能是第一課後選了「下一盤簡單的棋」（11/11 0923 版起選角排在後面），或從網址直接進對局；這幾步不一定照順序，「比上一階段」只能參考。`);
  if (Object.keys(R.dev).length) o.push(`- 新手流程的裝置：${Object.entries(R.dev).map(([k, n]) => ({ phone: "手機", tablet: "平板", desktop: "電腦" }[k] || k) + " " + n).join("、")}；版本：${Object.entries(R.vers).map(([k, n]) => k + " " + n).join("、")}。`);
  o.push("", "### 功能觸達率（健康紀錄）", "");
  if (!R.sources.health) o.push(`目前沒有任何一份健康紀錄，**觸達率算不出來**（0 份）。`);
  else {
    o.push("| 功能（頁面名） | 用過的份數 | 觸達率 | 第一次用到（中位，第幾天） |", "|---|---|---|---|");
    for (const f of R.feats) o.push(`| ${f.name}（${f.pages.join("、")}） | ${f.n}／${f.of} | ${fmtP(f.rate)} | ${f.medianFirstDay == null ? "—" : "第 " + f.medianFirstDay + " 天"} |`);
  }
  if (T) {
    o.push("", "### 匿名健康摘要（玩家打開「每天自動送匿名健康摘要」才有，預設關）", "");
    if (!T.n) o.push("目前 0 筆（功能剛做好、預設關；收資料程式 collect-anon.js 要開著才收得到）。");
    else {
      o.push(`共 ${T.n} 筆（每筆＝某一支手機某一天，沒有編號）。`, "", "| 版本 | 筆數 | 有出錯的比例 | 錯誤總數 | 長任務（中位，次／天） | 啟動（中位，毫秒） | 資源失敗 |", "|---|---|---|---|---|---|---|");
      for (const v of T.byVer) o.push(`| ${v.ver} | ${v.n} | ${fmtP(v.withErrRate)} | ${v.errors} | ${v.medianLongTasks == null ? "—" : v.medianLongTasks} | ${v.medianBootMs == null ? "—" : v.medianBootMs} | ${v.resFail} |`);
      if (T.topErrors.length) { o.push("", "最常見的錯誤訊息：", ""); for (const [m, n] of T.topErrors) o.push(`- ${n} 次：\`${m.replace(/`/g, "'")}\``) }
    }
  }
  return o.join("\n") + "\n";
}

module.exports = { STEPS, RETURN, FEATURES, HEAL_SHIP_DAY, MIN_N, loadFunnel, parseHealth, readHealthPaths, returnOf, return7, isNewDevice, analyze, analyzeTele, renderMd, med };

if (require.main === module) {
  const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
  const TEST = argv.includes("--test"), ONLY = opt("--only"), OUT = opt("--out"), SINCE = opt("--since");
  const teleI = argv.indexOf("--tele"), teleF = teleI >= 0 ? (argv[teleI + 1] && !argv[teleI + 1].startsWith("--") ? argv[teleI + 1] : path.join(DB, "health-telemetry.jsonl")) : null;
  const skip = new Set(); for (const k of ["--funnel", "--only", "--out", "--since"]) { const i = argv.indexOf(k); if (i >= 0) { skip.add(i); skip.add(i + 1) } } if (teleI >= 0) { skip.add(teleI); if (teleF === argv[teleI + 1]) skip.add(teleI + 1) }
  const pos = argv.filter((a, i) => !skip.has(i) && !a.startsWith("--"));
  const FF = opt("--funnel") || path.join(DB, TEST ? "onboard-funnel.test.jsonl" : "onboard-funnel.jsonl");
  const fun = ONLY === "health" ? [] : fs.existsSync(FF) ? loadFunnel(fs.readFileSync(FF, "utf8"), { test: TEST }) : [];
  const H = ONLY === "fun" ? { list: [], files: [] } : readHealthPaths(pos.length ? pos : [path.join(DB, "health-exports")]);
  const R = analyze(fun, H.list, { since: SINCE });
  const T = teleF ? analyzeTele(fs.existsSync(teleF) ? fs.readFileSync(teleF, "utf8") : "") : null;
  if (argv.includes("--json")) { console.log(JSON.stringify({ ...R, tele: T }, null, 1)); process.exit(0) }
  const md = renderMd(R, T, { funnelFile: path.relative(path.join(DB, ".."), FF).split(path.sep).join("/") });
  if (OUT) { fs.writeFileSync(OUT, md); console.log("報告寫到 " + OUT) } else process.stdout.write(md);
}
