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
  "test-p0-regress.js",   /* 11/13 三個 P0 發布版完整流程回歸 tools/qa/p0-regress.js 的純函式（行為 12、原始碼 1） */
  "test-handoff-facts.js",   /* 11/13 交接單事實段自動產生＋核對公開連結 review_loop/handoff-facts.js（行為 9、原始碼 1；評比工具不在公開副本時整檔跳過） */
  "test-evidence-shots.js",   /* 11/13 第 15 輪 F1／F2／X2 可重現畫面證據包＋英文防爆版檢查（tools/qa/evidence-shots.js 的純函式；行為 16、原始碼 1） */
  "test-android-build.js",   /* 11/13 第 15 輪 F3、F4 Android debug APK 編譯＋可重現檢查 repro-check.js、建置與工具鏈紀錄（行為 9、混合 2、原始碼 1）；11/13 Service Worker 標頭修法正式採用（混合 +1、原始碼 +1） */
  "test-android-roadmap.js",   /* 11/13 第 14 輪 F3 Android 路線圖＋可重現驗證包：verify-all.js、xiangqi-android 骨架檢查、F-Droid 草稿、make-www（行為 8、混合 1）；11/13 骨架檢查 native.swclient（行為 +1） */
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
  "test-classic-sky.js",   /* 11/13 開發者 iPhone 經典世界：環景毛筆擦掉、Gemini 水墨雲（載不到退回 canvas）、俯視圖七星全標名、經典不放大筆架立牌（行為 9、原始碼 3） */
  "test-park-weather.js",   /* 意見回饋 878 雲跑到地面、雨範圍太小 */
  "test-askbot-city.js",   /* 第 12 輪 X12：小幫手天氣「台北／臺北」都認得 */
  "test-a11y-emoji.js",   /* 11/13 實機旁白：圖示、「・」不再被念出來 */
  "test-docbtns.js",   /* 11/13 說明清單按鈕字超出框 */
  "test-spotfit.js",   /* 11/13 hspx 1098 場景標籤英文疊在一起、聲音提示蓋頂欄 */
  "test-engine-start.js",   /* 11/13 hspx P0 章回棋路殘局開局送錯局面給引擎（不合法著法 g3g4／c3c4、電腦卡住） */
  "test-ui-1113.js",   /* 11/13 hspx：看我的棋力沒反應（P0）、toast 換行規矩、幻影台詞、漂浮畫卷 */
  "test-home-wide.js",   /* 11/13 首頁接 iPad 寬版圖 home_p34／home_l1610：挑圖、退回原圖、座標表、走路節點、網址版本、cover 填滿（07z HMW、07fl xflCover；行為 8、混合 1） */
  "test-ipad-fill.js",   /* 11/13 遊戲畫面都要滿版：iPad／Duo 直向填滿寬度、橫向兩側模糊底（07fl；行為 8、原始碼 1） */
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
  "test-threat-weaknet.js", "test-verify-daily.js",   /* 11/13 第 15 輪 X4 威脅模型＋弱網長測（行為 11、原始碼 3）、X5 每日同題公開名冊對照工具（行為 9、原始碼 1） */
  "test-redblue.js",   /* 11/13 紅藍隊 R02 晚到推翻不給好處＋影子鐘（T11）、R01 千秋盃玩家動作簽名（T9）（行為 8、原始碼 1） */
  "test-name-safe.js",   /* 11/13 紅藍隊 r15 R05（威脅模型 I6）名字安全顯示 m/07x4 lbnBad／lbnShow：惡意名字換稱號、正常名字 0 誤擋、兒童看別人一律稱號（行為 6、原始碼 2）；11/13 不雅字詞清單＋誤擋測試、不合格名字對外改送稱號、稱號三選一（行為 +3、原始碼 +2） */
  "test-oss-scan.js",   /* 11/13 原始碼公開前的機密與個資掃描 tools/oss-scan.js（行為 7） */
  "test-xfer4.js",   /* 11/13 紅藍隊 r15 R03（威脅模型 I5）轉移碼 v4：錯碼、過期、重放、竄改分段和說明、舊 8 碼警告（行為 10、原始碼 1） */
  "test-android-oldwebview.js"   /* 11/13 Android 舊 WebView 降級提示、原生 App 不自動重整（m/02-shell.js 兩小段；行為 6、原始碼 1）；test-android-build.js 同日加外部可重建＋發布版（行為 3、混合 1、原始碼 1） */,
  "test-layout-r16.js"   /* 11/13 第 16 輪版面缺陷清零：棋譜庫、大廳、44×44 點選範圍、殘影讓開、量測誤報排除（tools/qa/device-fit.js）（行為 5、混合 1、原始碼 5） */,
  "test-net-notes.js"   /* 11/13 開發者選「只記在對局紀錄」：晚到推翻、千秋盃擋下沒簽名的動作寫進賽後紀錄（net.js notes()、m/07hs-netsig.js nsgNotes、09b 結果視窗、10-db 檢討頁 ℹ；行為 5、原始碼 1） */,
  "test-mp-p2.js"   /* 11/13 Android 三方實測 P2：訊號膠囊不壓棋盤（07hs nsgPos）、網路恢復 5 秒內連回（net.js netBack／FAST_WIN／連線逾時）、觀眾進場棋鐘（obsTk）（行為 7、原始碼 1） */,
  "test-mainquest.js"   /* 11/13 新手體驗第一波：主線電影播放器 07mnf、星槎遠征令／下一步／大禮包 07mnq、殘局解開儀式、電影中通知排隊（行為 8、原始碼 3） */,
  "test-varengine.js"   /* 11/13 黑洞超展開新引擎 src/varengine.js＋worker：走法、擺棋規則、非標準陣容、將死困斃、今日異象、level／weaken；11/13 定案點數＋堆疊加價＋沈方庭九宮優惠（行為 20） */,
  "test-net-start.js"   /* 11/13 開局那一方第一步之前的每步 3 分鐘：每步剩餘照走、判超時不分岔、坐黑判得出紅方超時、重抓不往後挪（net.js arr／ackTurn myStart；行為 4） */,
  "test-reload-guard.js"   /* 11/13 開發者 P1 iPhone 3D 絕殺後頁面重載又直接開第二盤：更新延後、對局頁網址改寫、重載後不開新局、勝負先寫入、賽後分析等特效、異常重載紀錄（m/02r-reloadguard.js；行為 8、混合 2、原始碼 2） */
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
