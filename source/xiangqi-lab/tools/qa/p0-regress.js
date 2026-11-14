// 三個 P0 的「發布版完整流程回歸」（11/13 開發者實機抓到、都已修；每次發布前都跑一次）
//
// 跟原始碼比對不同：這支拿「組好的發布檔」（index.html＋local.js 等）在無頭 Chrome 裡真的走一遍流程：
//   ① 章回棋路從殘局開始的關（park-legend.json 裡第一個「指定局面、電腦先走」的 play 步驟）：輪到電腦時電腦會回著，
//      不卡、不出現「引擎給出不合法著法」。修法：xiangqi-lab/src/local.js 的 engPos（有 P.start 就送「起始局面＋走過的步」）
//   ② 挑戰電腦下一步、認輸，結果視窗一出現就點「看我的棋力 ›」，要到「我的棋力」頁（#/stats）、視窗關掉、頁面捲回頂。
//      修法：xiangqi-db/m/08b-cpugame.js 檔頭的全域點擊委派（.modal .rg-go）
//   ③ 全新瀏覽器設定（清空儲存和快取）直接打開每日同題分享連結 #/daily/<日期>：App 正常載入、沒有未捕捉的錯誤、
//      沒有「畫面沒有載入成功」。修法：xiangqi-db/m/02-shell.js route() 的 daily 分支（ReferenceError 時等整支程式跑完再排一次）
//   每項記：通過與否、逐條檢查、版本號（XQ_BUILD）、控制台錯誤與警告、未捕捉的頁面錯誤、結果截圖。
//
// 受測版本（四選一，預設 --local）：
//   --local                 本機組版：xiangqi-db/m.html＋m/*.js 用 evidence-shots.js 的 localHtml() 組成發布用 index.html，其他檔用 xiangqi-lab/src、site/
//   --git [ref]             公開倉庫某個版本的「已發布檔」原封不動（xiangqi-lab/site 的 git，預設 origin/main；不動工作區）；
//                           git 裡沒有的大檔（data/ 圖片、音樂）用本機 site/ 工作區的
//   --html <檔>             把 index.html 換成這個檔（例如 scratchpad/relD/h<版號>.out.html 候選版），可跟 --git 一起用
//   --url <網址>            直接測某個網址（例如 http://localhost:8810/xiangqi-lab/ 候選版、或線上版 https://raysonchen2023-cloud.github.io/xiangqi-lab/）
//   本機三種模式自己開伺服器（埠 --port，預設 8843），加跨來源隔離標頭（同 sw.js 的 isolate()），擋 service worker；--url 模式讓 App 自己的 sw.js 接手。
// 其他參數：--only 1,3（或 journey,stats,daily）只跑某幾項；--daily 2026-11-13 指定分享連結日期（預設今天，臺灣時間）；
//   --outdir <資料夾>（預設 xiangqi-db/tools/review_loop/p0-regress）；--wait <分鐘>（別的無頭瀏覽器在跑時最多等多久，預設 30）
//
// 安全與資源：
//   - 同一時間只能有一個無頭瀏覽器：開瀏覽器前先查有沒有別的 device-fit.js／evidence-shots.js／p0-regress.js（還有 colorblind-scan、touch-stress、
//     test-home-focus、qa_monkey、stress2、learn_run）在跑，有就每 15 秒查一次、等它結束；等超過 --wait 就不跑（三項都記「沒跑」，結束碼 1）。
//   - 只開 1 個瀏覽器、一次只開 1 個分頁設定（context）；每個分頁開頁前 localStorage 設 xq_netRoot=JSON.stringify("xq_test")（只進測試房）；
//     分頁、瀏覽器、本機伺服器都在 finally 關掉。
//   - 不改 App 程式、不碰開發者存檔（每項都是全新、用完即丟的瀏覽器設定）。
// 結束碼：三項（或 --only 指定的）全部通過 0；任何一項失敗或沒跑 1。
// 產出：<outdir>/p0-regress.json、p0-regress.md、shots/P1-*.png～P3-*.png
// 檔名刻意不用 test- 開頭（不會被一般測試套件撈去開瀏覽器）。純函式與腳本結構的測試：node --test xiangqi-lab/tools/test-p0-regress.js
"use strict";

// ================= 純函式與清單（測試直接 require；不開瀏覽器） =================
const ITEMS = [
  { no: 1, id: "journey", name: "章回棋路殘局起手：輪到電腦會回著", fix: "xiangqi-lab/src/local.js", fn: "engPos", how: "有 P.start 就送「起始局面＋走過的步」給引擎（以前一律送標準開局，引擎回不存在的走法）" },
  { no: 2, id: "stats", name: "結果視窗「看我的棋力 ›」到「我的棋力」頁", fix: "xiangqi-db/m/08b-cpugame.js", fn: "document.addEventListener(\"click\") 全域委派 .modal .rg-go", how: "什麼時候按都有反應：關視窗、捲回頂、location.hash=\"#/stats\"" },
  { no: 3, id: "daily", name: "清空儲存與快取後直接開每日同題分享連結", fix: "xiangqi-db/m/02-shell.js", fn: "route() 的 daily 分支", how: "冷開時 07dq 的 const DQ 還沒初始化丟 ReferenceError，就等整支程式跑完再排一次" },
];
const DISCLAIMER = "無頭 Chrome（Playwright）模擬・不是實機・不是真人操作";
/* 同一時間只能有一個無頭瀏覽器：這些腳本在跑就等（test-p0-regress.js 這類測試檔不算：前面是「-」） */
const BUSY_RE = /(?:^|[\\/\s"'])(device-fit|evidence-shots|p0-regress|colorblind-scan|touch-stress|test-home-focus|flow-regress|perf-bench)\.js(?=$|[\s"'])|qa_monkey|stress2|learn_run/i;   /* 第 17 輪加 flow-regress、perf-bench */
/* 程序清單文字 → [{pid, cmd}]：每行「pid<Tab>指令」（PowerShell）或「  pid 指令」（ps -eo pid=,args=） */
function parseProcList(text) {
  const out = [];
  for (const line of String(text || "").split(/\r?\n/)) {
    const m = /^\s*(\d+)(?:\t|\s+)(.*)$/.exec(line);
    if (m && m[2].trim()) out.push({ pid: +m[1], cmd: m[2].trim() });
  }
  return out;
}
/* 別的無頭瀏覽器腳本（自己和父程序不算） */
function busyProcs(list, selfPids) {
  const me = new Set((selfPids || []).map(Number));
  return (list || []).filter(p => !me.has(+p.pid) && BUSY_RE.test(p.cmd));
}
/* 從 park-legend.json 挑一個「指定局面起手」的 play 步驟：優先電腦先走（start.turn 不是玩家那方，一開局就要引擎從殘局回著） */
function pickChapter(legend) {
  const cands = [];
  ((legend && legend.chapters) || []).forEach((c, ci) => {
    const steps = (c && c.game && Array.isArray(c.game.steps)) ? c.game.steps : [];
    steps.forEach((s, k) => {
      if (!s || s.t !== "play" || s.offer || !s.start || typeof s.start.fen !== "string" || !s.start.fen) return;
      if (Array.isArray(s.start.moves) && s.start.moves.length) return;
      const n = +c.n || ci + 1, human = s.human === "b" ? "b" : "r", turn = s.start.turn === "b" ? "b" : "r";
      cands.push({ n, journey: "h" + String(n).padStart(2, "0"), title: c.title || "", step: k, human, level: Math.max(1, Math.min(8, +s.ai || 3)), cpuFirst: turn !== human,
        lv: { fen: s.start.fen, turn, remove: Array.isArray(s.remove) ? s.remove : [], noPerpetual: !!s.noPerpetual }, goal: s.goal || "win", limit: +s.limit || 0 });
    });
  });
  return cands.find(x => x.cpuFirst) || cands[0] || null;
}
/* 玩家這一步：照 [from, to] 排序取第一個（每次都一樣，好重現） */
function pickHumanMove(moves) {
  const L = (moves || []).filter(m => Array.isArray(m) && m.length >= 2).slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  return L.length ? [L[0][0], L[0][1]] : null;
}
const chk = (name, ok, detail) => ({ name, ok: !!ok, detail: detail == null ? "" : String(detail) });
const BAD_ENGINE = /不合法/;
/* ① 章回殘局：o＝{chapter, created, startSet, cpuMoves, humanMoves, result, illegal:[], lastMsg, timeouts:[]} */
function judgeJourney(o) {
  o = o || {};
  const c = [];
  c.push(chk("開到章回棋路的殘局關（對局帶起始局面 P.start）", o.created && o.startSet, o.chapter ? `第 ${o.chapter.n} 回「${o.chapter.title}」第 ${o.chapter.step + 1} 步、FEN ${o.chapter.lv.fen} ${o.chapter.lv.turn === "b" ? "黑先" : "紅先"}；對局 start＝${o.startSet || "（沒有）"}` : "找不到指定局面起手的 play 步驟"));
  c.push(chk("電腦至少回 2 著（或已分出勝負）", (o.cpuMoves || 0) >= 2 || ((o.cpuMoves || 0) >= 1 && !!o.result), `電腦 ${o.cpuMoves || 0} 著、玩家 ${o.humanMoves || 0} 著${o.result ? "、結果：" + o.result : ""}`));
  c.push(chk("每次輪到電腦都在時限內回著（沒卡住）", !(o.timeouts || []).length, (o.timeouts || []).join("；") || "都有回"));
  c.push(chk("沒有出現「不合法著法」", !(o.illegal || []).length, (o.illegal || []).join("；") || "控制台、狀態列、畫面都沒有"));
  c.push(chk("最後狀態列沒停在「一時沒想好」或錯誤", !/一時沒想好|不合法|⚠/.test(o.lastMsg || ""), o.lastMsg || "（空的）"));
  return c;
}
/* ② 看我的棋力：o＝{found, tapped, hash, modalLeft, scrollTop, scrollY, viewText, topText}
   #/stats 頁頂欄標題是「我的戰績」，「我的棋力」五角雷達（開局、中局、殘局、殺法、穩定）在頁面裡 */
const STATS_PAGE = /我的戰績|我的棋力|開局 ?中局 ?殘局 ?殺法/;
function judgeStats(o) {
  o = o || {};
  return [
    chk("結果視窗有「看我的棋力 ›」", o.found, o.found ? "有（.modal .rg-go）" : "認輸後 25 秒內沒看到"),
    chk("點了以後網址是 #/stats", o.tapped && o.hash === "#/stats", `點擊：${o.tapped ? "觸控點一下" : "沒點到"}；網址 ${o.hash || "?"}`),
    chk("結果視窗已關掉", o.tapped && !o.modalLeft, o.modalLeft ? "視窗還在" : "已關"),
    chk("頁面捲回頂（沒有往上捲、下面一片空白）", o.tapped && (o.scrollTop || 0) === 0 && (o.scrollY || 0) === 0, `scrollTop ${o.scrollTop}、scrollY ${o.scrollY}`),
    chk("畫面是「我的戰績／我的棋力」頁", STATS_PAGE.test((o.topText || "") + " " + (o.viewText || "")), `標題「${String(o.topText || "").slice(0, 20)}」、畫面「${String(o.viewText || "").slice(0, 50)}」`),
  ];
}
/* ③ 冷開每日同題：o＝{date, hash, pageErrors:[], fixShown, viewChildren, viewText, topText, hasBoard} */
function judgeDaily(o) {
  o = o || {};
  const pe = o.pageErrors || [];
  return [
    chk("沒有未捕捉的頁面錯誤（pageerror）", !pe.length, pe.length ? pe.slice(0, 3).join("；") : "0 個"),
    chk("沒有出現「畫面沒有載入成功」修復畫面", !o.fixShown, o.fixShown ? "出現了 #xqFix" : "沒有"),
    chk("網址還是分享連結 #/daily/<日期>", typeof o.hash === "string" && o.hash.startsWith("#/daily/" + o.date), o.hash || "?"),
    chk("每日同題頁有畫出來（標題或棋盤）", (o.viewChildren || 0) > 0 && (/每日同題/.test((o.topText || "") + (o.viewText || "")) || !!o.hasBoard), `#view 子元素 ${o.viewChildren || 0}、棋盤 ${o.hasBoard ? "有" : "沒有"}、標題「${String(o.topText || "").slice(0, 20)}」、畫面「${String(o.viewText || "").slice(0, 40)}」`),
  ];
}
/* git 加引號的路徑（core.quotePath：非 ASCII 寫成 \346\226\260 這種八進位位元組）還原成 UTF-8 */
function unquoteGit(s) {
  if (!/^".*"$/.test(s)) return s;
  const b = [], t = s.slice(1, -1), ESC = { n: 10, t: 9, r: 13, '"': 34, "\\": 92 };
  for (let i = 0; i < t.length; i++) {
    if (t[i] !== "\\") { b.push(...Buffer.from(t[i], "utf8")); continue }
    const n = t[i + 1];
    if (/[0-7]/.test(n)) { b.push(parseInt(t.substr(i + 1, 3), 8)); i += 3 }
    else { b.push(ESC[n] != null ? ESC[n] : n.charCodeAt(0)); i += 1 }
  }
  return Buffer.from(b).toString("utf8");
}
/* git ls-tree -r 的輸出 → Map(路徑 → blob 雜湊)；路徑有引號（core.quotePath）也接受 */
function parseLsTree(text) {
  const m = new Map();
  for (const line of String(text || "").split(/\r?\n/)) {
    const x = /^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(line);
    if (x) m.set(unquoteGit(x[2]), x[1]);
  }
  return m;
}
const twTime = d => new Date(new Date(d).getTime() + 8 * 36e5).toISOString().replace("T", " ").slice(0, 19) + "（臺灣）";
const twDate = t => new Date((t == null ? Date.now() : t) + 8 * 36e5).toISOString().slice(0, 10);
const exitCode = R => (R && Array.isArray(R.items) && R.items.length && R.items.every(i => i.pass)) ? 0 : 1;
/* 報告 markdown */
function toMd(R) {
  const L = [`# 三個 P0 的發布版完整流程回歸`, "",
    `- 受測：象棋千秋 **${R.build || "?"}**（${R.modeName || R.mode}）${R.url}`,
    `- ${R.browser || "瀏覽器？"}；${DISCLAIMER}；每個分頁 localStorage xq_netRoot＝"xq_test"（測試房）`,
    `- 時間：${R.startedAt ? twTime(R.startedAt) : "?"} ～ ${R.finishedAt ? twTime(R.finishedAt) : "?"}；指令 \`${R.command || ""}\``,
    `- 結果：**${R.items.filter(i => i.pass).length}／${R.items.length} 項通過**${exitCode(R) ? "（結束碼 1）" : "（結束碼 0）"}`];
  if (R.waited && R.waited.length) L.push(`- 開瀏覽器前等過別的無頭瀏覽器：${R.waited.join("；")}`);
  L.push("", "| # | 項目 | 結果 | 版本 | 控制台錯誤 | 頁面錯誤 | 截圖 |", "|---|---|---|---|---:|---:|---|");
  for (const it of R.items) L.push(`| ${it.no} | ${it.name} | ${it.pass ? "✅ 通過" : it.skipped ? "⏸ 沒跑" : "❌ 失敗"} | ${it.build || "—"} | ${(it.consoleErrors || []).length} | ${(it.pageErrors || []).length} | ${(it.shots || []).map(s => "shots/" + s).join("、") || "—"} |`);
  for (const it of R.items) {
    L.push("", `## ${it.no}. ${it.name}：${it.pass ? "✅ 通過" : it.skipped ? "⏸ 沒跑" : "❌ 失敗"}`, "", `- 修法所在：\`${it.fix}\` ${it.fn}（${it.how}）`, `- 版本號：${it.build || "—"}；網址：${it.url || "—"}；花 ${it.ms != null ? Math.round(it.ms / 1000) + " 秒" : "—"}`);
    if (it.error) L.push(`- ⚠ 執行出錯：${it.error}`);
    if ((it.checks || []).length) { L.push("", "| 檢查 | 結果 | 量到的 |", "|---|---|---|"); for (const c of it.checks) L.push(`| ${c.name} | ${c.ok ? "✅" : "❌"} | ${String(c.detail).replace(/\|/g, "／").replace(/\n/g, " ")} |`) }
    if ((it.notes || []).length) L.push("", ...it.notes.map(n => "- " + n));
    L.push("", `- 控制台錯誤與警告（${(it.consoleErrors || []).length}）：` + ((it.consoleErrors || []).length ? "" : "無"));
    for (const e of (it.consoleErrors || []).slice(0, 15)) L.push(`  - ${String(e).replace(/\n/g, " ").slice(0, 220)}`);
    if ((it.consoleErrors || []).length > 15) L.push(`  - …其餘 ${it.consoleErrors.length - 15} 筆見 p0-regress.json`);
    L.push(`- 未捕捉的頁面錯誤（${(it.pageErrors || []).length}）：` + ((it.pageErrors || []).length ? it.pageErrors.slice(0, 5).join("；") : "無"));
  }
  if ((R.errors || []).length) L.push("", "## 執行錯誤", ...R.errors.map(e => "- " + e));
  return L.join("\n") + "\n";
}
module.exports = { ITEMS, DISCLAIMER, BUSY_RE, parseProcList, busyProcs, pickChapter, pickHumanMove, judgeJourney, judgeStats, judgeDaily, unquoteGit, parseLsTree, twTime, twDate, exitCode, toMd };
if (require.main !== module) return;

// ================= 以下才開瀏覽器 =================
const fs = require("fs"), path = require("path"), http = require("http"), cp = require("child_process");
const HOME = path.join(__dirname, "..", "..", "..");
const argv = process.argv.slice(2), has = k => argv.includes(k);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : d };
const MODE = has("--url") ? "url" : has("--git") ? "git" : "local";
const PORT = +arg("--port", 8843), GIT_REF = arg("--git", "origin/main"), HTML_FILE = arg("--html", "");
const URL0 = MODE === "url" ? arg("--url", "").replace(/\/?$/, "/") : `http://127.0.0.1:${PORT}/xiangqi-lab/`;
const OUTDIR = path.resolve(arg("--outdir", path.join(HOME, "xiangqi-db", "tools", "review_loop", "p0-regress"))), SHOTDIR = path.join(OUTDIR, "shots");
const ONLY = arg("--only", "") ? arg("--only").split(",").map(s => s.trim()) : null;
const USE = ITEMS.filter(it => !ONLY || ONLY.includes(String(it.no)) || ONLY.includes(it.id));
const DAILY = arg("--daily", twDate());
const WAIT_MIN = +arg("--wait", 30);
const SITE = path.join(HOME, "xiangqi-lab", "site"), SRC = path.join(HOME, "xiangqi-lab", "src");
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString("zh-TW", { hour12: false }), ...a);
if (MODE === "url" && !/^https?:\/\//.test(URL0)) { console.error("--url 要給 http(s) 網址"); process.exit(1) }
if (!/^\d{4}-\d{2}-\d{2}$/.test(DAILY)) { console.error("--daily 要是 YYYY-MM-DD"); process.exit(1) }

// localHtml()／MIME／COI 跟 evidence-shots.js --local 同一套（從它的原始碼取出，規則只有一份）
const EVS = (() => { const s = fs.readFileSync(path.join(__dirname, "evidence-shots.js"), "utf8").replace(/\r\n/g, "\n"), a = s.indexOf("// ---------- 本機模式"), b = s.indexOf("// ---------- 頁面裡量測"); if (a < 0 || b < 0) throw new Error("evidence-shots.js 裡找不到本機模式那段"); return eval(s.slice(a, b) + "\n;({ localHtml, MIME, COI })") })();

// ---------- 別的無頭瀏覽器在跑嗎 ----------
function listProcs() {
  try {
    if (process.platform === "win32") return parseProcList(cp.execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", "Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | ForEach-Object { [string]$_.ProcessId + [char]9 + $_.CommandLine }"], { encoding: "utf8", maxBuffer: 16e6, windowsHide: true }));
    return parseProcList(cp.execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8", maxBuffer: 16e6 }));
  } catch (e) { log("⚠ 查不到程序清單：", e.message.slice(0, 120)); return [] }
}
async function waitIdle(R) {
  const t0 = Date.now(), me = [process.pid, process.ppid];
  for (;;) {
    const b = busyProcs(listProcs(), me);
    if (!b.length) return true;
    const desc = b.map(p => `${p.pid}：${p.cmd.slice(0, 120)}`).join("｜");
    if (!R.waited.includes(desc)) { R.waited.push(desc); log("別的無頭瀏覽器在跑，等它結束：", desc) }
    if (Date.now() - t0 > WAIT_MIN * 60000) return false;
    await sleep(15000);
  }
}

// ---------- 本機伺服器（--local、--git、--html） ----------
function gitBuf(args) { return cp.execFileSync("git", ["-C", SITE, ...args], { maxBuffer: 400e6, windowsHide: true }) }
function sourceFor(R) {
  const build = "local-" + new Date(Date.now() + 8 * 36e5).toISOString().replace(/\D/g, "").slice(0, 12);
  if (MODE === "local") {
    const html = HTML_FILE ? fs.readFileSync(HTML_FILE) : Buffer.from(EVS.localHtml(build));
    R.modeName = HTML_FILE ? `候選 index.html ${HTML_FILE}＋本機 src/、site/` : "本機組版：xiangqi-db/m/*.js 組成 index.html＋xiangqi-lab/src＋site/";
    const file = u => { let f = path.join(SITE, u); if (!u.includes("/") && fs.existsSync(path.join(SRC, u))) f = path.join(SRC, u); const rf = path.resolve(f); if (!rf.startsWith(path.resolve(SITE)) && !rf.startsWith(path.resolve(SRC))) return null; try { return fs.readFileSync(f) } catch (e) { return null } };
    return { html, file };
  }
  const commit = gitBuf(["rev-parse", GIT_REF]).toString().trim(), tree = parseLsTree(gitBuf(["-c", "core.quotePath=false", "ls-tree", "-r", GIT_REF]).toString("utf8")), cache = new Map();
  const blob = p => { if (!tree.has(p)) return null; if (!cache.has(p)) cache.set(p, gitBuf(["cat-file", "blob", tree.get(p)])); return cache.get(p) };
  const html = HTML_FILE ? fs.readFileSync(HTML_FILE) : blob("index.html");
  if (!html) throw new Error(GIT_REF + " 裡沒有 index.html");
  R.modeName = `公開倉庫已發布檔 ${GIT_REF}（${commit.slice(0, 10)}）${HTML_FILE ? "，index.html 換成 " + HTML_FILE : ""}；git 裡沒有的大檔用本機 site/ 工作區`;
  R.gitCommit = commit;
  const file = u => { const b = blob(u); if (b) return b; const f = path.join(SITE, u); if (!path.resolve(f).startsWith(path.resolve(SITE))) return null; try { return fs.readFileSync(f) } catch (e) { return null } };
  return { html, file };
}
function serve(S) {
  return new Promise((res, rej) => {
    const PRE = "/xiangqi-lab/";
    const srv = http.createServer((q, r) => {
      let u = ""; try { u = decodeURIComponent(q.url.split("?")[0]) } catch (e) { r.writeHead(400); return r.end() }
      if (!u.startsWith(PRE)) { r.writeHead(404); return r.end() }
      u = u.slice(PRE.length) || "index.html";
      if (u.includes("..")) { r.writeHead(403); return r.end() }
      const b = u === "index.html" ? S.html : S.file(u);
      if (!b) { r.writeHead(404); return r.end() }
      r.writeHead(200, Object.assign({ "Content-Type": EVS.MIME[path.extname(u)] || "application/octet-stream" }, EVS.COI)); r.end(b);
    });
    srv.on("error", rej); srv.listen(PORT, "127.0.0.1", () => res(srv));
  });
}

// ---------- App 裡的小工具（跟 evidence-shots.js 同樣的做法） ----------
async function waitReady(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const on = await page.evaluate(() => { const o = document.getElementById("preov"); return !!(o && getComputedStyle(o).display !== "none" && o.getBoundingClientRect().height > 0) }).catch(() => false); if (!on) return; await sleep(700) }
  await page.evaluate(() => { const b = document.querySelector("#preov .pre-skip"); if (b) b.click() }).catch(() => { }); await sleep(1500);
}
async function settle(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) { await sleep(1000); const ok = await page.evaluate(() => !!(self.crossOriginIsolated && document.getElementById("view"))).catch(() => false); if (ok) break }
  await sleep(2000); await waitReady(page); await sleep(2000);
}
async function closeAll(page) { await page.evaluate(() => { try { if (typeof closeSheet === "function") closeSheet() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()) }).catch(() => { }); await sleep(400) }
async function gotoHash(page, h, wait) {
  await page.evaluate(h => { try { if (typeof closeSheet === "function") closeSheet() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()); if (location.hash === h && typeof route === "function") route(); else location.hash = h }, h);
  await sleep(800); await waitReady(page); await sleep(wait || 2500);
}
async function boardPt(page, i) {
  return page.evaluate(i => { const c = i % 9, r = Math.floor(i / 9); const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620" && s.getBoundingClientRect().width > 50); if (!svg) return null; const m = svg.getScreenCTM(); const f = !!(svg._o && svg._o.flip); const X = 40 + (f ? 8 - c : c) * 60, Y = 40 + (f ? 9 - r : r) * 60; return { x: m.a * X + m.c * Y + m.e, y: m.b * X + m.d * Y + m.f } }, i);
}
async function tapPt(page, p) { if (!p) return false; await page.touchscreen.tap(p.x, p.y); return true }
async function findText(page, re, scope) {
  return page.evaluate(([src, fl, scope]) => { const re = new RegExp(src, fl); const R = scope ? document.querySelector(scope) : document; if (!R) return null;
    const el = [...R.querySelectorAll("button,[role=button],a,.btn")].find(e => { const q = e.getBoundingClientRect(); return q.width > 1 && q.height > 1 && (re.test((e.innerText || "").trim()) || re.test(e.getAttribute("aria-label") || "")) });
    if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 } }, [re.source, re.flags, scope || null]);
}
async function selCenter(page, sel) { return page.evaluate(sel => { const e = [...document.querySelectorAll(sel)].find(x => { const q = x.getBoundingClientRect(); return q.width > 1 && q.height > 1 }); if (!e) return null; const q = e.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2 } }, sel) }
const playState = page => page.evaluate(() => api("/play/state").then(s => ({ id: s.id, turn: s.turn, human: s.human, n: (s.moves || []).length, byCpu: (s.moves || []).filter(m => m.by && m.by !== s.human).length, byMe: (s.moves || []).filter(m => m.by === s.human).length, result: s.result ? (s.result.why || JSON.stringify(s.result)) : null, msg: s.msg || "", start: s.start || null, board: s.board, journey: s.journey || null })));

// ---------- 分頁設定：全新、用完即丟；一定先設測試房 ----------
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
async function newCtx(browser, it, o) {
  const ctx = await browser.newContext({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: IPHONE_UA, serviceWorkers: MODE === "url" ? "allow" : "block", locale: "zh-TW" });
  await ctx.addInitScript(seed => {
    try {
      localStorage.setItem("xq_netRoot", JSON.stringify("xq_test"));
      if (seed) {
        const S = (k, v) => { if (localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(v)) };
        S("m_onboard1", true); S("m_firstWin", true); S("m_langHint", true); S("m_focusBoard", true); S("instAsk", { no: true, at: Date.now() }); S("m_park3d", false);
        S("xq_me", { id: "qap0" + Math.random().toString(36).slice(2, 8), name: "P0 回歸" });
      }
    } catch (e) { }
  }, !!o.seed);
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  page.on("console", m => { const t = m.type(), x = m.text(); if (t === "error" || (t === "warning" && /\[engine\]|不合法/.test(x))) it.consoleErrors.push(`[${t}] ${x.slice(0, 300)}`); if (/不合法/.test(x)) it._illegal.push(x.slice(0, 200)) });
  page.on("pageerror", e => it.pageErrors.push(String(e && e.message || e).slice(0, 300)));
  page.on("dialog", d => d.dismiss().catch(() => { }));
  const cdp = await ctx.newCDPSession(page);
  try { await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: { top: 62, bottom: 34, left: 0, right: 0 } }) } catch (e) { }
  return { ctx, page, cdp };
}
async function shot(page, it, file) { await page.screenshot({ path: path.join(SHOTDIR, file) }); it.shots.push(file) }
const buildOf = page => page.evaluate(() => window.XQ_BUILD || "").catch(() => "");

// ---------- ① 章回棋路殘局起手 ----------
async function runJourney(browser, it) {
  const { ctx, page } = await newCtx(browser, it, { seed: true });
  const o = { timeouts: [], illegal: [] };
  try {
    await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded", timeout: 90000 }); await settle(page);
    it.build = await buildOf(page); it.url = page.url();
    const legend = await page.evaluate(() => fetch("data/park-legend.json").then(r => r.json()).then(d => ({ chapters: (d.chapters || []).map(c => ({ n: c.n, title: c.title, game: { steps: ((c.game && c.game.steps) || []).map(s => s && s.t === "play" ? { t: s.t, human: s.human, ai: s.ai, start: s.start, remove: s.remove, noPerpetual: s.noPerpetual, offer: s.offer, goal: s.goal, limit: s.limit } : { t: s && s.t }) } })) })));
    const ch = o.chapter = pickChapter(legend);
    if (!ch) throw new Error("park-legend.json 裡找不到指定局面起手的 play 步驟");
    it.notes.push(`關卡：第 ${ch.n} 回「${ch.title}」第 ${ch.step + 1} 步（journey ${ch.journey}），玩家執${ch.human === "r" ? "紅" : "黑"}、電腦第 ${ch.level} 級、${ch.cpuFirst ? "電腦先走" : "玩家先走"}；FEN ${ch.lv.fen}`);
    const s0 = await page.evaluate(async ch => {
      try { store.set("cpuRanked", false) } catch (e) { }
      const s = await api("/play/new", { human: ch.human, level: ch.level, journey: ch.journey, lv: ch.lv, dx: 0 });
      store.set("jPending", { id: ch.journey, game: s.id, lvp: { goal: ch.goal, limit: ch.limit, timer: 0, blind: false, opp: null, step: ch.step, rule: null } });
      return { id: s.id, start: s.start || null };
    }, ch);
    o.created = !!s0.id;
    await gotoHash(page, "#/journey/play", 2500); await closeAll(page);
    let S = await playState(page);
    o.startSet = S.start || "";
    if (S.id !== s0.id) it.notes.push(`⚠ 對局頁上的棋（${S.id}）不是剛開的這盤（${s0.id}）`);
    for (let k = 0; k < 4; k++) {
      if (!S.result && S.turn !== S.human) {
        const t0 = Date.now(), lim = k === 0 ? 60000 : 40000, n0 = S.byCpu;
        while (Date.now() - t0 < lim) { await sleep(700); S = await playState(page); if (S.result || S.turn === S.human) break }
        if (!S.result && S.turn !== S.human) o.timeouts.push(`第 ${k + 1} 次輪到電腦，${lim / 1000} 秒沒回（狀態列：${S.msg || "空"}）`);
        else if (S.byCpu > n0) it.notes.push(`第 ${k + 1} 次輪到電腦：${Math.round((Date.now() - t0) / 100) / 10} 秒回著`);
      }
      if (S.result || k === 3 || S.turn !== S.human) break;
      const legal = await page.evaluate(([b, side]) => XQCore.legal(b, side), [S.board, S.human]);
      const mv = pickHumanMove(legal);
      if (!mv) { it.notes.push("玩家沒有合法著法"); break }
      await closeAll(page);
      const n1 = S.n;
      await tapPt(page, await boardPt(page, mv[0])); await sleep(400); await tapPt(page, await boardPt(page, mv[1]));
      let moved = false; for (let w = 0; w < 8 && !moved; w++) { await sleep(400); S = await playState(page); moved = S.n > n1 }
      if (!moved) { it.notes.push(`第 ${k + 1} 步點棋盤沒走成（${mv.join("→")}），改用 /play/move`); await page.evaluate(([f, t]) => api("/play/move", { f, t }), mv); S = await playState(page) }
    }
    await sleep(1500); S = await playState(page);
    o.cpuMoves = S.byCpu; o.humanMoves = S.byMe; o.result = S.result; o.lastMsg = S.msg;
    const vt = await page.evaluate(() => (document.getElementById("view") || {}).innerText || "").catch(() => "");
    if (BAD_ENGINE.test(vt)) o.illegal.push("畫面：" + (vt.match(/[^\n]*不合法[^\n]*/) || [""])[0].slice(0, 80));
    if (BAD_ENGINE.test(S.msg)) o.illegal.push("狀態列：" + S.msg);
    o.illegal.push(...it._illegal.map(x => "控制台：" + x));
    await shot(page, it, "P1-journey-endgame.png");
  } catch (e) { it.error = String(e.message || e).slice(0, 300) }
  finally { await ctx.close().catch(() => { }) }
  return judgeJourney(o);
}

// ---------- ② 結果視窗「看我的棋力 ›」 ----------
async function runStats(browser, it) {
  const { ctx, page } = await newCtx(browser, it, { seed: true });
  const o = {};
  try {
    await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded", timeout: 90000 }); await settle(page);
    it.build = await buildOf(page);
    await page.evaluate(() => { try { store.set("cpuRanked", false) } catch (e) { } return api("/play/new", { human: "r", lx: 1, ranked: false }) });
    await gotoHash(page, "#/cpu", 4000); await closeAll(page);
    it.url = page.url();
    let S = await playState(page);
    if (S.turn === S.human && !S.result) {
      const n1 = S.n; await tapPt(page, await boardPt(page, 70)); await sleep(400); await tapPt(page, await boardPt(page, 67));
      let moved = false; for (let w = 0; w < 8 && !moved; w++) { await sleep(400); S = await playState(page); moved = S.n > n1 }
      if (!moved) { it.notes.push("點棋盤沒走成炮二平五，改用 /play/move"); await page.evaluate(() => api("/play/move", { f: 70, t: 67 })) }
      const t0 = Date.now(); while (Date.now() - t0 < 40000) { await sleep(700); S = await playState(page); if (S.result || S.turn === S.human) break }
      it.notes.push(`玩家走 1 步、電腦 ${S.byCpu} 步，接著認輸`);
    }
    await closeAll(page);
    const rb = await findText(page, /(認輸)$/, "#acts") || await findText(page, /認輸/);
    if (rb) {
      await tapPt(page, rb); await sleep(1200);
      const ok = await selCenter(page, ".modal .mb .btn:not(.ghost)");
      if (ok) await tapPt(page, ok); else it.notes.push("按了認輸沒有確認框");
    } else { it.notes.push("找不到認輸鍵，改用 /play/resign"); await page.evaluate(() => api("/play/resign")) }
    let p = null; const t1 = Date.now();
    while (Date.now() - t1 < 25000 && !p) { await sleep(200); p = await selCenter(page, ".modal .rg-go") }
    o.found = !!p;
    if (p) {
      it.notes.push(`認輸後 ${Math.round((Date.now() - t1) / 100) / 10} 秒看到「看我的棋力 ›」，馬上觸控點一下（以前在背景綁好 onclick 之前點會沒反應）`);
      await shot(page, it, "P2a-result-modal.png");
      p = await selCenter(page, ".modal .rg-go");
      if (p) { await tapPt(page, p); o.tapped = true }
      const t2 = Date.now(); while (Date.now() - t2 < 4000) { await sleep(250); if (await page.evaluate(() => location.hash) === "#/stats") break }
      await sleep(2500);
      Object.assign(o, await page.evaluate(() => ({ hash: location.hash, modalLeft: !!document.querySelector(".modal .rg-go"), scrollTop: (document.scrollingElement || document.documentElement).scrollTop, scrollY: window.scrollY, viewText: ((document.getElementById("view") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 200), topText: ((document.getElementById("topbar") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 60) })));
      await shot(page, it, "P2b-mystats.png");
    } else await shot(page, it, "P2a-result-modal.png");
  } catch (e) { it.error = String(e.message || e).slice(0, 300) }
  finally { await ctx.close().catch(() => { }) }
  return judgeStats(o);
}

// ---------- ③ 冷開每日同題分享連結 ----------
async function runDaily(browser, it) {
  const { ctx, page, cdp } = await newCtx(browser, it, { seed: false });
  const o = { date: DAILY, pageErrors: it.pageErrors };
  try {
    const origin = new URL(URL0).origin;
    try { await cdp.send("Network.clearBrowserCache"); await cdp.send("Storage.clearDataForOrigin", { origin, storageTypes: "all" }) } catch (e) { it.notes.push("清快取指令失敗：" + e.message.slice(0, 80)) }
    it.notes.push(`全新瀏覽器設定（沒有存檔、沒有快取、沒有 service worker）＋清 ${origin} 的快取與儲存；只先設 xq_netRoot＝"xq_test"，直接開 ${URL0}#/daily/${DAILY}`);
    await page.goto(URL0 + "#/daily/" + DAILY, { waitUntil: "domcontentloaded", timeout: 90000 }); await settle(page); await sleep(6000);
    it.build = await buildOf(page); it.url = page.url();
    Object.assign(o, await page.evaluate(() => { const v = document.getElementById("view"), vt = v ? (v.innerText || "").replace(/\s+/g, " ") : ""; return { hash: location.hash, fixShown: !!document.getElementById("xqFix") || /畫面沒有載入成功/.test(vt), viewChildren: v ? v.children.length : 0, viewText: vt.slice(0, 200), topText: ((document.getElementById("topbar") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 60), hasBoard: !!(v && [...v.querySelectorAll("svg")].some(s => s.getAttribute("viewBox") === "0 0 560 620")) } }));
    await shot(page, it, "P3-daily-cold.png");
  } catch (e) { it.error = String(e.message || e).slice(0, 300) }
  finally { await ctx.close().catch(() => { }) }
  return judgeDaily(o);
}
const RUN = { journey: runJourney, stats: runStats, daily: runDaily };

// ---------- 主程式 ----------
(async () => {
  const R = { tool: "xiangqi-lab/tools/qa/p0-regress.js", command: "node xiangqi-lab/tools/qa/p0-regress.js " + argv.join(" "), mode: MODE, modeName: "", url: URL0, build: "", browser: "",
    startedAt: new Date().toISOString(), finishedAt: null, disclaimer: DISCLAIMER, netRoot: "xq_test（測試房）", daily: DAILY, waited: [], items: [], errors: [] };
  const fresh = it => Object.assign({}, it, { pass: false, checks: [], build: "", url: "", consoleErrors: [], pageErrors: [], shots: [], notes: [], _illegal: [] });
  fs.mkdirSync(SHOTDIR, { recursive: true });
  let srv = null, browser = null;
  try {
    if (!(await waitIdle(R))) {
      R.errors.push(`別的無頭瀏覽器跑了超過 ${WAIT_MIN} 分鐘還沒結束，這次沒跑`);
      for (const it of USE) R.items.push(Object.assign(fresh(it), { skipped: true, error: "沒跑：別的無頭瀏覽器一直在跑" }));
      return;
    }
    if (MODE !== "url") { srv = await serve(sourceFor(R)); log("本機伺服器", URL0, R.modeName) } else R.modeName = "指定網址";
    const { chromium } = require(path.join(HOME, "claude-desktop-tools", "node_modules", "playwright"));
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
    R.browser = "Chrome " + browser.version() + "（headless）";
    for (const it0 of USE) {
      const it = fresh(it0), t0 = Date.now();
      log(`=== ${it.no}. ${it.name}`);
      try { it.checks = await RUN[it.id](browser, it) } catch (e) { it.error = String(e.message || e).slice(0, 300) }
      it.ms = Date.now() - t0;
      it.pass = !it.error && it.checks.length > 0 && it.checks.every(c => c.ok);
      if (!R.build && it.build) R.build = it.build;
      R.items.push(it);
      log(`  ${it.pass ? "✅ 通過" : "❌ 失敗"}${it.error ? "（" + it.error + "）" : ""}`, it.checks.filter(c => !c.ok).map(c => c.name + "：" + c.detail).join("；"));
    }
  } catch (e) { R.errors.push(String(e.stack || e.message || e).slice(0, 500)); log("主程式出錯", e.message) }
  finally {
    if (browser) await browser.close().catch(() => { });
    if (srv) await new Promise(r => srv.close(() => r()));
    for (const it0 of USE) if (!R.items.some(x => x.id === it0.id)) R.items.push(Object.assign(fresh(it0), { skipped: true, error: "沒跑（主程式出錯）" }));
    R.items.sort((a, b) => a.no - b.no);
    for (const it of R.items) delete it._illegal;
    R.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(OUTDIR, "p0-regress.json"), JSON.stringify(R, null, 1) + "\n");
    fs.writeFileSync(path.join(OUTDIR, "p0-regress.md"), toMd(R));
    log(`完成：${R.items.filter(i => i.pass).length}／${R.items.length} 通過；瀏覽器與伺服器已關閉；${path.join(OUTDIR, "p0-regress.md")}`);
    process.exitCode = exitCode(R);
  }
})();
