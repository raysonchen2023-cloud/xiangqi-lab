// 測試分三類的統計工具（不是測試）：交接單要寫「幾項測試通過」時，請引用這支印出的三個數字，不要只寫總數。
//   行為　　：真的執行 App 的程式（vm 載入、抽出函式呼叫、假的 DOM／計時器／伺服器跑流程），檢查輸出或狀態。名稱不加標籤。
//   混合　　：一半執行程式、一半只比對原始碼文字。名稱開頭「〔混合〕」。
//   原始碼比對：只檢查原始碼裡有沒有某段字（includes、assert.match 原始碼、掃 CSS 規則）。只證明程式碼存在，不證明功能會動。名稱開頭「〔原始碼〕」。
// 測試由開發用的 AI 撰寫，不等於第三方驗證。
// 用法（在任何資料夾都可以）：
//   node xiangqi-lab/tools/testkinds.js           實際逐檔跑測試（node --test，TAP 輸出），印每檔三類各幾項與通過數
//   node xiangqi-lab/tools/testkinds.js --static  不跑測試，只數原始碼裡 test( 的呼叫處（迴圈產生的多項只算一次）
// 不跑 test-home-focus.js（它會開無頭 Chrome）。
// 新加的測試檔：逐項分類、改好名稱後，把檔名加進 CLASSIFIED；還沒分類的檔放 PENDING（統計會列為「待分類」，不算進三類）。
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const DIR = __dirname;
/* 這支自己也叫 test-*.js：統計時跳過自己；被 node --test 一起跑到時什麼都不做（NODE_TEST_CONTEXT） */
const SKIP = new Set(["test-home-focus.js", "testkinds.js"]);
/* 11/12 已逐項分類（開發者稽核 story/102_評比灌水誠實稽核.md 第 3 項） */
const CLASSIFIED = new Set([
  "test-i18n.js",   /* 11/13 第 14 輪 F1 英文介面架構（m/07i18n.js；行為 31、混合 2、原始碼 4） */
  "test-android-roadmap.js",   /* 11/13 第 14 輪 F3 Android 路線圖＋可重現驗證包：verify-all.js、xiangqi-android 骨架檢查、F-Droid 草稿、make-www（行為 8、混合 1） */
  "test-fdroid-evidence.js",   /* 11/13 第 13 輪 F2 F-Droid 可建置證據：pikafish-verify.js、release-verify.js（行為 8、原始碼 1） */
  "test-daily.js",   /* 11/13 第 13 輪 F1 每日同題＋無雷分享（m/07dq-daily.js；行為 11、原始碼 2）；第 14 輪 X4 題庫改版名冊＋邊界（行為 +13） */
  "test-ship-tilt.js", "test-home-order.js",   /* 11/13 第 14 輪 X2 星槎傾斜權限不自動問（行為 6、原始碼 1）、首頁焦點順序（行為 5、原始碼 1） */
  "test-focus-modes.js",   /* 11/13 第 12 輪 F4 純淨畫面、X10 老闆鍵＋中斷恢復（行為 15、原始碼 2） */
  "test-blitz.js",   /* 11/13 第 12 輪 F3 快棋模式、動畫最短化、預走（行為 14、混合 1、原始碼 2） */
  "test-premove-online3d.js", "test-park3d-cbfx.js",   /* 11/13 第 13 輪 F3 線上預走＋F4 3D 預走與快棋 3D 動畫（行為 12、原始碼 3）、X6 3D 色弱特效補完（行為 7、原始碼 1） */
  "test-haptics.js", "test-pgn-variations.js",   /* 11/12 第 11 輪 X2 觸覺回饋（行為 11、混合 1、原始碼 1）、X1 棋譜變著（行為 8、原始碼 1） */
  "test-health.js", "test-perfhud.js",   /* 11/12 第 10 輪 F2、效能浮標 */
  "test-health-funnel.js", "test-foss-audit.js", "test-telemetry.js",   /* 11/12 第 11 輪 F2 漏斗報告（行為 11、原始碼 1）、X7 開源授權檢查（行為 7、原始碼 1）、X3 匿名健康摘要（行為 12、原始碼 2） */
  "test-ai-think.js",   /* 11/12 第 11 輪 F4 電腦思考節奏 */
  "test-colorblind.js",   /* 11/12 第 11 輪 F3 色弱模式（m/07cb-colorblind.js；掃描 tools/qa/colorblind-scan.js） */
  "test-park3d-colorblind.js",   /* 11/13 第 12 輪 X1／X6 色弱模式套到 3D 園子（park3d.js PKCB；行為 11、原始碼 2） */
  "test-touch-fixes.js",   /* 11/12 第 11 輪 F1 小螢幕觸控修正（行為 5、混合 2、原始碼 4） */
  "test-lefty.js",   /* 11/13 第 12 輪 F1 左撇子單手模式＋F2 剩餘小目標（行為 10、原始碼 2） */
  "test-beidou-lines.js",   /* 11/12 hspx 北斗斗柄連線 */
  "test-park-weather.js",   /* 意見回饋 878 雲跑到地面、雨範圍太小 */
  "test-askbot-city.js",   /* 第 12 輪 X12：小幫手天氣「台北／臺北」都認得 */
  "test-a11y-emoji.js",   /* 11/13 實機旁白：圖示、「・」不再被念出來 */
  "test-docbtns.js",   /* 11/13 說明清單按鈕字超出框 */
  "test-engine-timeout.js",   /* 11/12 開發者截圖「思考有點久」：引擎沒回應不再永遠等 */
  "test-ai-levels.js",   /* 11/12 第 10 輪 F3：電腦對手透明頁（行為 2、混合 3、原始碼 2） */
  "test-land3d.js", "test-bhmate.js", "test-docs-md.js", "test-net-chaos.js", "test-park3d-bench.js", "test-save-file.js", "test-story0.js",   /* 11/12 晚上逐項分類（第 8 輪證據頁） */
  "test-a11y.js", "test-analysis-cases.js", "test-asian-rules.js", "test-clock-pv.js", "test-coach.js", "test-family.js",
  "test-fb871.js", "test-grade-wording.js", "test-human-ai.js", "test-net-reconnect.js", "test-net-sign.js", "test-park3d-power.js",
  "test-park3d-tap.js", "test-provenance.js", "test-qixing.js", "test-reply-risk.js", "test-report-id.js", "test-repwarn.js",
  "test-resume-state.js", "test-retention.js", "test-rule-handshake.js", "test-ruleset.js", "test-style-loop.js", "test-ui-chatgpt.js",
  "test-xfer.js", "test-zhanggui.js", "test-mvt-hold.js", "test-ui-redundancy.js", "test-stats-kill.js", "test-xqs-tb.js", "test-scene-poems.js", "test-pv-stepper.js", "test-cpuroom-copy.js", "test-quiz-check-exit.js",
  "test-stat-policy.js", "test-park-firstflat.js",
  /* 11/12 第 6 輪評比（ChatGPT 改善清單第 1 項）：本輪新增的 135 項逐項分類（行為 95、混合 25、原始碼 15；拿不準的都往原始碼那邊選） */
  "test-a11y-audio.js", "test-a11y-p16.js", "test-sound-mix.js", "test-blackhole.js", "test-galaxy.js", "test-human-p1.js",
  "test-net-guard.js", "test-ruleset-cases.js", "test-simul3d.js", "test-homeclamp.js",
  "test-zh-lint.js",   /* 11/13 第 12 輪 X12 繁中用字一致性檢查 tools/zh-lint.js（行為 12、原始碼 1） */
  "test-cup-sign.js",   /* 第 9 輪評審：千秋盃報名與賽程廣播簽名（行為 6、原始碼 1） */
  "test-net-link.js", "test-xfer2.js",   /* 11/13 第 12 輪 X11 連線同步頻道（行為 15、原始碼 1）、換手機轉移碼補強（行為 11、原始碼 1） */
  "test-net-linksig.js",   /* 11/13 第 13 輪 X2 同步頻道簽名、防重放、除錯小卡（行為 11、原始碼 1） */
  "test-net-pin.js",   /* 11/13 第 14 輪 F2 開局公開金鑰驗證、千秋盃 k 簽名（行為 13、原始碼 1） */
  "test-oss-scan.js"   /* 11/13 原始碼公開前的機密與個資掃描 tools/oss-scan.js（行為 7） */
]);
/* 還沒逐項分類的檔（統計列為「待分類」）；新測試檔先放這裡，分好類再移到 CLASSIFIED */
const PENDING = new Set([]);
const KINDS = ["行為", "混合", "原始碼", "待分類"];

const listFiles = () => fs.readdirSync(DIR).filter(f => /^test-.*\.js$/.test(f) && !SKIP.has(f)).sort();
const classified = f => CLASSIFIED.has(f) && !PENDING.has(f);
/* 一項測試的類別：檔案還沒分類＝待分類；名稱開頭〔原始碼〕／〔混合〕；其餘＝行為 */
function kindOf(file, name) {
  if (!classified(file)) return "待分類";
  const n = String(name).trim();
  if (n.startsWith("〔原始碼〕")) return "原始碼";
  if (n.startsWith("〔混合〕")) return "混合";
  return "行為";
}
/* 實際跑一個檔：回傳 [{name, ok}]（只取最上層的測試；TAP 的 \# 與 \\ 還原） */
function runFile(file) {
  let out = "";
  try { out = cp.execFileSync(process.execPath, ["--test", "--test-reporter=tap", file], { cwd: DIR, encoding: "utf8", maxBuffer: 64e6 }) }
  catch (e) { out = (e.stdout || "") + "" }
  const res = [];
  for (const line of out.split(/\r?\n/)) {
    const m = /^(not ok|ok) \d+ - (.*)$/.exec(line);
    if (!m) continue;
    const name = m[2].replace(/\s+# (SKIP|TODO)\b.*$/i, "").replace(/\\#/g, "#").replace(/\\\\/g, "\\");
    res.push({ name, ok: m[1] === "ok" });
  }
  return res;
}
/* 不跑測試：數 test( 呼叫處的名稱（第一段字面字串） */
function staticFile(file) {
  const s = fs.readFileSync(path.join(DIR, file), "utf8"), res = [];
  for (const m of s.matchAll(/(?:^|[^\w$.])(?:test|it)\(\s*(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)) res.push({ name: m[2], ok: null });
  return res;
}
/* 統計：{ files:[{file, items:[{name,ok,kind}], n:{行為:{all,pass},...}}], total:{...} } */
function tally(mode) {
  const z = () => Object.fromEntries(KINDS.map(k => [k, { all: 0, pass: 0 }]));
  const total = z(), files = [];
  for (const file of listFiles()) {
    const items = (mode === "static" ? staticFile(file) : runFile(file)).map(x => ({ ...x, kind: kindOf(file, x.name) }));
    const n = z();
    for (const it of items) for (const o of [n, total]) { o[it.kind].all++; if (it.ok) o[it.kind].pass++ }
    files.push({ file, items, n });
  }
  return { files, total };
}
module.exports = { kindOf, runFile, staticFile, tally, listFiles, CLASSIFIED, PENDING, KINDS, SKIP };

if (require.main === module && !process.env.NODE_TEST_CONTEXT) {
  const mode = process.argv.includes("--static") ? "static" : "run";
  const { files, total } = tally(mode);
  const cell = o => mode === "static" ? String(o.all) : `${o.pass}/${o.all}`;
  const head = mode === "static" ? "（只數呼叫處，沒有跑測試；迴圈產生的多項只算一次）" : "（實際跑過；格式＝通過／項數）";
  console.log("測試三類統計" + head);
  console.log(["檔案", ...KINDS].join("\t"));
  for (const f of files) console.log([f.file, ...KINDS.map(k => cell(f.n[k]))].join("\t"));
  console.log(["合計", ...KINDS.map(k => cell(total[k]))].join("\t"));
  const sum = KINDS.reduce((a, k) => a + total[k].all, 0);
  console.log(`\n交接單引用：行為 ${cell(total["行為"])}、混合 ${cell(total["混合"])}、原始碼比對 ${cell(total["原始碼"])}` +
    (total["待分類"].all ? `、待分類 ${cell(total["待分類"])}` : "") + `，共 ${sum} 項。`);
  const pend = files.filter(f => !classified(f.file)).map(f => f.file);
  if (pend.length) console.log("待分類的檔：" + pend.join("、"));
  console.log("說明：原始碼比對只證明程式碼存在，不證明功能會動；測試由開發用的 AI 撰寫，不等於第三方驗證。");
  /* 11/13：有任何一項沒過就回報失敗（結束代碼 1），source/run-tests.js、verify-all.js 才不會把沒過的當成通過 */
  if (mode === "run") { const bad = files.filter(f => KINDS.some(k => f.n[k].pass < f.n[k].all)).map(f => f.file); if (bad.length) { console.log("✖ 有測試沒過：" + bad.join("、")); process.exitCode = 1 } }
}
