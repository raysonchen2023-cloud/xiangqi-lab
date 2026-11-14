// 版面量測新舊對照（第 17 輪改善 4「統一版面量測口徑並重測最新版」）
//
// 做什麼：讀兩份以上 device-fit.js 的結果（同一支判定器、同一次量測同時存了「舊規則」和「新規則」的原始資料），
//   全部用同一套規則（第 16 輪的三條新規則）重算，相鄰兩版逐格比對，把每一個問題分成：
//     實際修正＝前一版有、後一版沒有（同一套新規則下）
//     新出現　＝前一版沒有、後一版有
//     仍未修　＝兩版都有
//     排除誤報＝舊規則算、新規則不算（r1 看不見的字超框／r2 外觀小但點得到 44×44／r3 只給讀屏的隱藏清單），每一版各自列
//   另外列：各版 21 尺寸逐頁問題數、殘餘問題的座標（判定器量到的數字原文）、iPhone Duo 闔起首頁「下一步」跟入口標籤的座標與重疊。
// 不開瀏覽器，只讀 json。純函式給 test-layout-compare.js 測。
//
// 用法（在 <專案根目錄> 下）：
//   node xiangqi-lab/tools/qa/layout-compare.js --run "0931=<資料夾或 json>" --run "1942=<…>" --run "本機=<…>" --out <資料夾>
//     [--ref "r16修前1009=<json>"]  只列當時規則下的總數（舊 json 沒有新規則的原始資料，不能重判，只當歷史參考）
//     [--page guanxing]  只比某幾頁（例：舊版沒有西市，就只比觀星臺）
//     [--dev 21]  只算 21 種行動裝置（預設）；--dev all＝json 裡有的全部
"use strict";
const fs = require("fs"), path = require("path");
const FIT = require("./device-fit.js");
const RULES = {
  r1: "時辰鐘這類「超出框的只有看不見的字」（opacity 0／visibility hidden）不算文字超框",
  r2: "小於 44×44 改量實際點得到的範圍：中心 ±21px 九個點都點到它自己才算夠大",
  r3: "只給讀屏軟體的隱藏清單（祖先 ≤2px 或 clip 裁掉，例 07w6 .sci-sr）不算可點元素",
};
const TYPE_NM = Object.assign({}, require("./evidence-shots.js").FIT_TYPES, { small: "可點元素小於 44×44（裝置×頁面算 1 項）", layout: "其他版面（棋盤太小、兩側空白、標籤被裁）" });

/* 多重集合比對：a、b＝[{key,…}]；回傳 {gone:[a 有 b 沒有], added:[b 有 a 沒有], both:[兩邊都有（取 b 的）]} */
function diffIssues(a, b) {
  const cnt = new Map(); for (const x of a) cnt.set(x.key, (cnt.get(x.key) || 0) + 1);
  const both = [], added = [];
  for (const y of b) { const n = cnt.get(y.key) || 0; if (n > 0) { cnt.set(y.key, n - 1); both.push(y) } else added.push(y) }
  const left = new Map(cnt), gone = [];
  for (const x of a) { const n = left.get(x.key) || 0; if (n > 0) { left.set(x.key, n - 1); gone.push(x) } }
  return { gone, added, both };
}
/* 一份 device-fit.json → {label, meta, cells:{dev:{page:rulesBoth}}} */
function loadRun(label, R, devIds, pageIds) {
  const DEV = FIT.DEVICES.concat(R.devices || []), PG = FIT.PAGES.concat(FIT.EXTRA_PAGES);
  const cells = {};
  for (const d of Object.keys(R.res || {})) {
    if (devIds && !devIds.includes(d)) continue;
    const D = DEV.find(x => x.id === d) || { id: d };
    for (const p of Object.keys(R.res[d])) { if (pageIds && !pageIds.includes(p)) continue; const P = PG.find(x => x.id === p) || { id: p }; (cells[d] = cells[d] || {})[p] = FIT.rulesBoth(R.res[d][p], D, P) }
  }
  return { label, meta: { build: R.build || "", url: R.url || "", git: R.git || null, createdAt: R.createdAt || "", browser: R.browser || "", errors: (R.errors || []).length }, cells, raw: R };
}
const sum = (run, f) => { let n = 0; for (const d in run.cells) for (const p in run.cells[d]) { const c = run.cells[d][p]; if (c) n += f(c, d, p) } return n };
/* 各版總表：舊規則、新規則、三條規則各排除幾項 */
function totals(run) {
  return { old: sum(run, c => c.old.length), now: sum(run, c => c.now.length), r1: sum(run, c => c.ex.r1.length), r2: sum(run, c => c.ex.r2.length), r3: sum(run, c => c.ex.r3.length),
    layDrop: sum(run, c => c.old.filter(x => x.kind === "lay").length - c.now.filter(x => x.kind === "lay").length), legacy: sum(run, c => c.legacy ? 1 : 0) };
}
/* 相鄰兩版：只比兩版都有量到的格子 */
function pairDiff(A, B) {
  const out = { gone: [], added: [], both: [], cells: 0 };
  for (const d in B.cells) for (const p in B.cells[d]) {
    const a = A.cells[d] && A.cells[d][p], b = B.cells[d][p]; if (!a || !b) continue; out.cells++;
    const r = diffIssues(a.now, b.now);
    for (const k of ["gone", "added", "both"]) for (const x of r[k]) out[k].push(Object.assign({ dev: d, page: p }, x));
  }
  return out;
}
const byType = L => { const o = {}; for (const x of L) o[x.type] = (o[x.type] || 0) + 1; return o };
/* Duo 闔起首頁：「下一步」跟每個入口標籤的交疊（px） */
function duoOverlap(cell) {
  const sp = (cell && cell.m && cell.m.spots) || [], nx = sp.find(s => s.id === "mnqNext");
  if (!nx) return { next: null, hits: [], spots: sp };
  const hits = sp.filter(s => s !== nx).map(s => ({ t: s.t, w: Math.min(s.x + s.w, nx.x + nx.w) - Math.max(s.x, nx.x), h: Math.min(s.y + s.h, nx.y + nx.h) - Math.max(s.y, nx.y) })).filter(o => o.w > 0.5 && o.h > 0.5);
  return { next: nx, hits, spots: sp };
}
const esc = s => String(s == null ? "" : s).replace(/\|/g, "／").replace(/\n/g, " ");
function toMd(runs, refs, opt) {
  opt = opt || {};
  const L = [], DEV = FIT.DEVICES, PG = FIT.PAGES.concat(FIT.EXTRA_PAGES);
  const pages = PG.filter(p => runs.some(r => Object.values(r.cells).some(c => c[p.id])));
  const devs = DEV.filter(d => runs.some(r => r.cells[d.id]));
  L.push("# 版面量測：新舊版同一套判定器對照（第 17 輪改善 4）", "");
  L.push("- 判定器：`xiangqi-lab/tools/qa/device-fit.js`（爆版判斷 evidence-shots.js judgeOverflow＋版面判斷 judgeLayout），每一版都用同一支、同一次量測同時記下舊規則與新規則的原始資料；對照工具 `xiangqi-lab/tools/qa/layout-compare.js`。");
  L.push("- **無頭 Chrome 模擬，不是實機**；iPhone Duo 尺寸是第三方估計值。問題數＝爆版項目數＋版面項目數（「可點元素小於 44×44」每個裝置×頁面算 1 項，跟第 15、16 輪一樣）。");
  L.push("- 統一口徑＝第 16 輪的三條新規則（下表）。舊規則＝第 15 輪的判法（三條都不用）。", "");
  for (const [k, v] of Object.entries(RULES)) L.push(`  - ${k}：${v}`);
  L.push("", "## 受測版本", "", "| 代號 | 版本號 | 來源 | 量測時間（UTC） | 瀏覽器 | 執行錯誤 |", "|---|---|---|---|---|---:|");
  for (const r of runs) L.push(`| ${r.label} | ${r.meta.build} | ${r.meta.git ? "公開倉庫已發布檔 " + r.meta.git.ref + "（" + r.meta.git.commit.slice(0, 10) + "），本機伺服器送出" : esc(r.meta.url)} | ${r.meta.createdAt} | ${r.meta.browser} | ${r.meta.errors} |`);
  L.push("", "## 總數：同一版在舊規則、新規則下", "", "| 版本 | 舊規則問題數 | 新規則問題數（統一口徑） | r1 排除 | r2 排除（個別小目標） | r3 排除（個別小目標） | 因 r2／r3 少掉的「小於 44」項 |", "|---|---:|---:|---:|---:|---:|---:|");
  for (const r of runs) { const t = totals(r); L.push(`| ${r.label} | ${t.old} | **${t.now}** | ${t.r1} | ${t.r2} | ${t.r3} | ${t.layDrop} |`) }
  if (refs && refs.length) {
    L.push("", "歷史紀錄（當時的規則、當時的 json，沒有新規則的原始資料，**不能重判**，只當參考）：", "", "| 紀錄 | 版本號 | 當時規則下問題數 | 格子數 |", "|---|---|---:|---:|");
    for (const r of refs) L.push(`| ${r.label} | ${r.meta.build} | ${sum(r, c => c.now.length)} | ${sum(r, () => 1)} |`);
  }
  for (let i = 1; i < runs.length; i++) {
    const A = runs[i - 1], B = runs[i], D = pairDiff(A, B);
    L.push("", `## ${A.label} → ${B.label}（統一口徑，比 ${D.cells} 格）`, "",
      `- **實際修正 ${D.gone.length} 項**、**新出現 ${D.added.length} 項**、**仍未修 ${D.both.length} 項**（${B.label} 的排除誤報見上方總表，不算在這三類裡）`, "",
      "| 問題種類 | 實際修正 | 新出現 | 仍未修 |", "|---|---:|---:|---:|");
    const g = byType(D.gone), a = byType(D.added), b = byType(D.both);
    for (const t of [...new Set(Object.keys(g).concat(Object.keys(a), Object.keys(b)))]) L.push(`| ${TYPE_NM[t] || t} | ${g[t] || 0} | ${a[t] || 0} | ${b[t] || 0} |`);
    const list = (nm, X, max) => { if (!X.length) return; L.push("", `### ${nm}（${X.length}）`, ""); for (const x of X.slice(0, max)) L.push(`- ${devName(x.dev)}・${pgName(x.page)}：${TYPE_NM[x.type] || x.type}：${esc(x.text).slice(0, 70)}${x.detail ? "（" + esc(x.detail).slice(0, 110) + "）" : ""}`); if (X.length > max) L.push(`- …其餘 ${X.length - max} 項見 compare.json`) };
    list("實際修正", D.gone, opt.max || 60); list("新出現", D.added, opt.max || 60); list("仍未修", D.both, opt.max || 60);
  }
  /* 各版逐格 */
  for (const r of runs) {
    L.push("", `## ${r.label}（${r.meta.build}）21 尺寸逐頁：新規則問題數（舊規則問題數）`, "", "| 裝置 | 尺寸 | " + pages.map(p => p.name).join(" | ") + " |", "|---|---|" + pages.map(() => "---").join("|") + "|");
    for (const d of devs) { if (!r.cells[d.id]) continue; L.push(`| ${d.name} | ${d.w}×${d.h} | ` + pages.map(p => { const c = r.cells[d.id][p.id]; return !c ? "—" : (c.now.length ? `**${c.now.length}**` : "✅0") + (c.old.length !== c.now.length ? `（${c.old.length}）` : "") }).join(" | ") + " |") }
    L.push(`| **合計** | | ` + pages.map(p => { let n = 0, o = 0; for (const d of devs) { const c = r.cells[d.id] && r.cells[d.id][p.id]; if (c) { n += c.now.length; o += c.old.length } } return `**${n}**（${o}）` }).join(" | ") + " |");
  }
  /* 最新版殘餘問題座標 */
  const Z = runs[runs.length - 1];
  L.push("", `## ${Z.label} 殘餘問題與座標（統一口徑；座標是 CSS 像素，畫面左上角為 0,0）`, "");
  for (const d of devs) for (const p of pages) {
    const c = Z.cells[d.id] && Z.cells[d.id][p.id]; if (!c || !c.now.length) continue;
    const x = Z.raw.res[d.id][p.id];
    L.push(`### ${d.name} ${d.w}×${d.h}・${p.name}（截圖 shots/${x.file}）`, "");
    for (const q of c.now) L.push(`- ${TYPE_NM[q.type] || q.type}：${esc(q.text).slice(0, 80)}${q.detail ? "（" + esc(q.detail) + "）" : ""}`);
    if (c.small.length) { const so = (x.m.smallOld || []).filter(s => !s.why); L.push(`  - 小於 44×44 的元素位置：${so.map(s => `${s.t} @(${s.x},${s.y})`).join("、") || c.small.join("、")}`) }
    L.push("");
  }
  /* Duo */
  L.push("## iPhone Duo 闔起（466×678，估計尺寸）首頁：「下一步」與入口標籤", "");
  for (const r of runs) {
    const c = r.raw.res.duoF && r.raw.res.duoF.home, o = duoOverlap(c);
    if (!c) { L.push(`- ${r.label}：沒量到`); continue }
    if (!o.next) { L.push(`- ${r.label}（${r.meta.build}）：首頁沒有「下一步」按鈕（#mnqNext）；截圖 shots/${c.file}`); continue }
    L.push(`- ${r.label}（${r.meta.build}）：「${o.next.t}」框 (${o.next.x},${o.next.y}) ${o.next.w}×${o.next.h}；` + (o.hits.length ? "**壓到** " + o.hits.map(h => `「${h.t}」${Math.round(h.w)}×${Math.round(h.h)}px`).join("、") : "沒有壓到任何入口標籤") + `；截圖 shots/${c.file}`);
    L.push(`  - 其他標籤：${o.spots.filter(s => s.id !== "mnqNext").map(s => `${s.t} (${s.x},${s.y}) ${s.w}×${s.h}`).join("；")}`);
  }
  return L.join("\n") + "\n";
  function devName(id) { const d = DEV.find(x => x.id === id); return d ? d.name : id }
  function pgName(id) { const p = PG.find(x => x.id === id); return p ? p.name : id }
}
module.exports = { RULES, diffIssues, loadRun, totals, pairDiff, duoOverlap, toMd };
if (require.main !== module) return;

const argv = process.argv.slice(2), all = k => argv.map((a, i) => a === k ? argv[i + 1] : null).filter(Boolean), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const devIds = arg("--dev", "21") === "all" ? null : FIT.DEV21, pageIds = arg("--page", "") ? arg("--page").split(",") : null;
const rd = s => { const i = s.indexOf("="), label = s.slice(0, i), p = s.slice(i + 1), f = fs.statSync(p).isDirectory() ? path.join(p, "device-fit.json") : p; return { label, f, R: JSON.parse(fs.readFileSync(f, "utf8")) } };
const runs = all("--run").map(rd).map(x => Object.assign(loadRun(x.label, x.R, devIds, pageIds), { file: x.f }));
const refs = all("--ref").map(rd).map(x => loadRun(x.label, x.R, devIds, pageIds));
if (runs.length < 1) { console.error("至少要一個 --run 標籤=路徑"); process.exit(1) }
const OUT = path.resolve(arg("--out", ".")); fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "compare.md"), toMd(runs, refs));
const J = { tool: "xiangqi-lab/tools/qa/layout-compare.js", command: "node xiangqi-lab/tools/qa/layout-compare.js " + argv.join(" "), createdAt: new Date().toISOString(), rules: RULES,
  runs: runs.map(r => ({ label: r.label, file: r.file, meta: r.meta, totals: totals(r) })), refs: refs.map(r => ({ label: r.label, meta: r.meta })), pairs: [] };
for (let i = 1; i < runs.length; i++) { const D = pairDiff(runs[i - 1], runs[i]); J.pairs.push({ from: runs[i - 1].label, to: runs[i].label, cells: D.cells, fixed: D.gone, added: D.added, remain: D.both }) }
fs.writeFileSync(path.join(OUT, "compare.json"), JSON.stringify(J, null, 1));
console.log("寫好了：" + path.join(OUT, "compare.md"));
for (const r of J.runs) console.log(r.label, r.meta.build, "舊規則", r.totals.old, "新規則", r.totals.now);
for (const p of J.pairs) console.log(p.from, "→", p.to, "修正", p.fixed.length, "新出現", p.added.length, "仍未修", p.remain.length);
