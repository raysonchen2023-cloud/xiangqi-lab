#!/usr/bin/env node
// 象棋千秋：產生公開的「驗證紀錄」data/docs/evidence.md（W60-A2 證據同次重產）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 為什麼：舊版（開發者電腦上的 make_evidence.js）自己再跑一次測試，跟驗證紀錄不是同一次執行，證據常落後一版（第 21 輪評比 R21）。
//   這一版不跑任何測試，只讀 verify-all.js 那一次留下的兩份檔：
//     ① 驗證紀錄（verify-all.js --out）：執行編號、執行時間、source/ 樹雜湊、版本
//     ② 逐項結果（verify-all.js --tally-out，由 testkinds.js 寫出）：每一項測試的名稱、通過／失敗／略過、類別
//   兩份的執行編號不同就拒絕產生。evidence.md、驗證紀錄、測試分類報表因此一定是同一次執行的結果。
//
// 用法（在倉庫根目錄）：
//   node source/xiangqi-lab/tools/verify-all.js --out verify.txt --tally-out tally.json
//   node source/xiangqi-lab/tools/make-evidence.js --verify verify.txt --tally tally.json --out evidence.md [--report-out testkinds.json]
// 發布：用 GitHub Actions（CI）那一次產生的 evidence-ci.md（這次執行的附件 verify-ci 裡）放進 data/docs/evidence.md；
//   發布 PR 的 CI 會重產並比對（.github/scripts/check-evidence.cjs），不准手改、不准用本機產生的。
"use strict";
const fs = require("fs"), path = require("path");

const LABEL = { "行為": "〔行為〕", "混合": "", "原始碼": "", "待分類": "〔待分類〕" };   /* 混合、原始碼的名稱本來就帶〔混合〕〔原始碼〕 */
const KN = { "行為": "行為", "混合": "混合", "原始碼": "原始碼比對", "待分類": "待分類" };
const GROUP = {
  "test-asian-rules.js": "棋規（長將、長捉、閒著、循環待核、限著、困斃）", "test-repwarn.js": "重複局面預警",
  "test-rule-handshake.js": "線上對局棋規版本握手", "test-clock-pv.js": "棋鐘邊界（+1／0／−1 ms）、悔棋加秒、重開；引擎缺 PV 保持未評",
  "test-reply-risk.js": "失著的具體後果只照分析線說；沒評完的步數", "test-report-id.js": "檢舉追蹤編號與狀態"
};

/* 從驗證紀錄讀出這一次執行的事實 */
function parseVerify(text) {
  const t = String(text || "").replace(/\r/g, ""), m = re => (t.match(re) || [])[1] || null;
  return {
    runId: m(/^執行編號：(\S+)$/m),
    timeTw: m(/^執行時間：\S+（UTC）＝ (.+)$/m),
    commit: m(/^倉庫 commit：([0-9a-f]{40})$/m),
    version: m(/^release\.json：版本 (\d{8}-\d{4})、/m),
    sourceFiles: +(m(/^source\/ 資料夾：(\d+) 個檔/m) || 0) || null,
    sourceTree: m(/^source\/ 資料夾：\d+ 個檔，樹雜湊 SHA-256 ([0-9a-f]{64})$/m),
    runTests: m(/^第 \d+ 步 run-tests：(\S+?)(?:（|$)/m),
  };
}

/* 組 evidence.md；o＝{tally, verify(parseVerify 結果), items(證據索引), shotOk(f)→bool, excluded(數字|null)} */
function buildEvidence(o) {
  const T = o.tally, V = o.verify, KINDS = T.kinds || ["行為", "混合", "原始碼", "待分類"], TOT = T.total, RUN = T.files;
  const ALLX = RUN.flatMap(f => f.items.map(it => ({ ...it, file: f.file })));
  const TODO = ALLX.filter(x => x.todo), ALL = ALLX.filter(x => !x.todo);
  const SKIPPED = ALL.filter(x => x.skip), xpass = TODO.filter(x => x.ok).length;
  const tests = ALL.length, pass = ALL.filter(x => x.ok && !x.skip).length, fail = tests - pass - SKIPPED.length + xpass;
  const show = it => `${it.todo ? (it.ok ? "✖ 預期失敗卻通過" : "⚠ 預期失敗") : it.skip ? "﹣ 略過" : it.ok ? "✔" : "✖"} ${LABEL[it.kind] || ""}${it.name}${it.skip && it.why ? "（略過原因：" + it.why + "）" : ""}`;
  const cnt = k => `${TOT[k].all} 項（通過 ${TOT[k].pass}${TOT[k].skip ? `、略過 ${TOT[k].skip}` : ""}${TOT[k].all - TOT[k].pass - (TOT[k].skip || 0) ? `、失敗 ${TOT[k].all - TOT[k].pass - (TOT[k].skip || 0)}` : ""}）`;
  const per = RUN.map(f => { const n = f.n, it = f.items.filter(x => !x.todo), p = it.filter(x => x.ok && !x.skip).length, sk = it.filter(x => x.skip).length, td = f.items.length - it.length; return `| ${f.file} | ${GROUP[f.file] || "—"} | ${n["行為"].all} | ${n["混合"].all} | ${n["原始碼"].all} | ${n["待分類"].all || ""} | ${p}／${it.length}${sk ? `（略過 ${sk}）` : ""}${td ? `（另有預期失敗 ${td}）` : ""} |` });
  const IDX = o.items.map(it => {
    const hit = it.tests.length ? ALL.filter(x => it.tests.some(k => x.name.includes(k))) : [];
    const by = KINDS.map(k => [k, hit.filter(x => x.kind === k).length]).filter(([, n]) => n).map(([k, n]) => KN[k] + " " + n).join("、");
    const shots = it.shots.map(f => o.shotOk(f) ? `[${f}](evidence/${encodeURIComponent(f)})` : `（缺：${f}）`);
    const tl = hit.length ? `${hit.length} 項（${by}）\n${hit.map(x => "  - " + show(x)).join("\n")}` : "（沒有自動測試，靠截圖與手動步驟）";
    return `### ${it.id} ${it.t}\n\n- 從哪一版：${it.since}\n- 自動測試：${tl}\n- 截圖：${shots.length ? shots.join("、") : "（無）"}\n- 怎麼操作：${it.steps}\n- 預期結果：${it.expect}`;
  }).join("\n\n");
  const pend = RUN.filter(f => f.n["待分類"].all).map(f => "`" + f.file + "`");
  return `# 驗證紀錄（版本 ${V.version}）

這一頁讓任何人核對：這一版的程式跑過下面這些自動測試，以及每一項測試到底驗了什麼。

- 執行編號：${V.runId}（Node.js ${T.node || "?"}；這一頁、驗證紀錄 verify-all.js、測試分類報表是同一次執行產生的；比對時這一行與下一行不算）
- 產生時間：${V.timeTw}
- 結果（四欄分開，不要只看總數）：共 ${tests} 項＝**通過 ${pass}**、**失敗 ${fail}**、**略過 ${SKIPPED.length}**${SKIPPED.length ? "（這個環境跑不了、沒有執行，不算通過；逐項原因見〈略過〉）" : ""}；另有**預期失敗 ${TODO.length}**${TODO.length ? "（還沒修的漏洞，測試照「修好的樣子」寫、現在保持失敗，見〈預期失敗〉）" : ""}${xpass ? `，其中 ${xpass} 項預期失敗卻通過（算失敗）` : ""}
- 測試對象：公開倉庫的 \`source/\`（${V.sourceFiles} 個檔，樹雜湊 SHA-256 \`${V.sourceTree}\`），對應的發布版：\`${V.version}\`。開發者電腦上還沒發布的修改不在這份測試裡。
- \`source/\` 沒放的測試檔有 ${o.excluded == null ? "?" : o.excluded} 個（要讀不公開的資料、要接不公開的營運程式，或指令排除），原因逐檔寫在 \`source/STAGE-MANIFEST.json\` 的 excludedTests。
${TODO.length ? `
## 預期失敗（還沒修的漏洞）

下面每一項都照「漏洞修好以後應有的結果」寫斷言，現在**還沒修，所以失敗**；用 \`node:test\` 的 todo 標記，不算進上面的通過數、也不讓整批測試變紅。哪天變成通過（預期失敗卻通過），代表漏洞可能修好了，要改成一般測試。

${TODO.map(x => `- ${x.ok ? "✖ 預期失敗卻通過" : "⚠ 預期失敗"}：${x.name}（${x.file}）`).join("\n")}
` : ""}${SKIPPED.length ? `
## 略過（沒有執行，不算通過）

下面這幾項在這份環境裡跑不了（要讀只在開發者電腦的素材、工具或網路），測試自己判斷後略過；不算進通過數，也不算失敗。

${SKIPPED.map(x => `- ﹣ ${x.name}（${x.file}${x.why ? "；" + x.why : ""}）`).join("\n")}
` : ""}
## 先看這三個數字（不要只看總數）

| 類別 | 項數 | 這類測試證明了什麼 |
|---|---:|---|
| 行為 | ${cnt("行為")} | 真的把 App 的程式跑起來（載入網站上的模組、抽出函式呼叫、用假的畫面／計時器／伺服器走一遍流程），再檢查結果對不對。 |
| 混合 | ${cnt("混合")} | 一半真的執行程式，一半只是檢查原始碼裡有沒有某段字。 |
| 原始碼比對 | ${cnt("原始碼")} | 只檢查原始碼裡有沒有某段字（例如某個按鈕的程式碼、某條樣式規則）。**只證明程式碼存在，不證明功能會動。** |
${TOT["待分類"].all ? `| 待分類 | ${cnt("待分類")} | ${pend.join("、")} 這幾個檔還沒逐項分類，暫不算進上面三類。 |\n` : ""}
- 測試名稱開頭有〔原始碼〕〔混合〕就是那一類；沒有標籤的是行為類（下面的索引另外標〔行為〕）。
- **測試由開發用的 AI 撰寫，不等於第三方驗證；原始碼比對只證明程式碼存在。**
- 行為類測試也只在 Node.js 裡跑程式片段，沒有開瀏覽器、沒有真的手機，畫面長什麼樣要看截圖與手動步驟。

## 怎麼自己重做一次

在公開倉庫根目錄：
1. \`node source/xiangqi-lab/tools/verify-all.js --out verify.txt --tally-out tally.json\`：四步核對（組版、發布雜湊、Pikafish、重跑全部測試），紀錄與逐項結果是同一次執行。
2. \`node source/xiangqi-lab/tools/make-evidence.js --verify verify.txt --tally tally.json --out evidence.md\`：從這兩份產生這一頁（不再另外跑測試）。
3. 跟 \`data/docs/evidence.md\` 比：\`node .github/scripts/check-evidence.cjs data/docs/evidence.md evidence.md\`（只忽略執行編號與產生時間兩行）。在不同作業系統跑，「略過」的項目可能不一樣（有些測試只在特定環境略過）；這一頁是 GitHub Actions 的 Linux 環境產生的。
4. 只看三類各幾項：\`node source/run-tests.js\`。

## 逐項證據索引

每一項都寫了：從哪一版開始、對應的自動測試（每項標類別）、截圖、在正式站怎麼操作、預期結果。截圖放在 \`/data/docs/evidence/\`。

${IDX}

## 各組測試

| 檔案 | 測什麼 | 行為 | 混合 | 原始碼比對 | 待分類 | 通過 |
|---|---|---:|---:|---:|---:|---:|
${per.join("\n")}

## 全部測試名稱

${RUN.map(f => `### ${f.file}\n\n${f.items.map(x => "- " + show(x)).join("\n")}`).join("\n\n")}
`;
}

/* 測試分類報表（跟 evidence.md 同一個執行編號） */
function buildReport(T, V) {
  return { runId: V.runId, version: V.version, sourceTree: V.sourceTree, node: T.node || null, total: T.total,
    files: T.files.map(f => ({ file: f.file, n: f.n })) };
}

/* 兩份檔的事實先核對，不對就丟錯（不產生半套的證據） */
function checkInputs(T, V) {
  const bad = [];
  if (!V.runId) bad.push("驗證紀錄沒有「執行編號：」（要用新版 verify-all.js 產生）");
  if (!T || !Array.isArray(T.files) || !T.total) bad.push("逐項結果 tally.json 格式不對（要用 verify-all.js --tally-out 產生）");
  else if (!T.runId) bad.push("逐項結果 tally.json 沒有執行編號");
  else if (V.runId && T.runId !== V.runId) bad.push(`不是同一次執行：驗證紀錄是 ${V.runId}，逐項結果是 ${T.runId}`);
  if (!V.version) bad.push("驗證紀錄讀不到 release.json 的版本");
  if (!V.sourceTree) bad.push("驗證紀錄讀不到 source/ 樹雜湊");
  if (V.runTests && V.runTests !== "通過" && V.runTests !== "失敗") bad.push("驗證紀錄的 run-tests 那一步沒有跑（" + V.runTests + "）");
  return bad;
}

module.exports = { parseVerify, buildEvidence, buildReport, checkInputs };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  const vf = opt("--verify"), tf = opt("--tally"), out = opt("--out");
  if (!vf || !tf || !out) { console.log("用法：node make-evidence.js --verify <verify-all 紀錄> --tally <tally.json> --out <evidence.md> [--report-out <json>] [--repo <倉庫>]"); process.exit(2) }
  const repo = path.resolve(opt("--repo") || path.join(__dirname, "..", "..", ".."));
  const V = parseVerify(fs.readFileSync(vf, "utf8"));
  let T = null; try { T = JSON.parse(fs.readFileSync(tf, "utf8")) } catch (e) { T = null }
  const bad = checkInputs(T, V);
  if (bad.length) { console.log("✘ 不產生 evidence.md：\n  - " + bad.join("\n  - ")); process.exit(1) }
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, "evidence-items.json"), "utf8"));
  const shotDir = path.join(repo, "data", "docs", "evidence");
  let excluded = null; try { excluded = Object.keys(JSON.parse(fs.readFileSync(path.join(repo, "source", "STAGE-MANIFEST.json"), "utf8")).excludedTests || {}).length } catch (e) { }
  const md = buildEvidence({ tally: T, verify: V, items, shotOk: f => fs.existsSync(path.join(shotDir, f)), excluded });
  fs.writeFileSync(out, md);
  const ro = opt("--report-out");
  if (ro) fs.writeFileSync(ro, JSON.stringify(buildReport(T, V), null, 1) + "\n");
  const miss = (md.match(/（缺：/g) || []).length;
  console.log(`寫到 ${out}：版本 ${V.version}、執行編號 ${V.runId}${ro ? "；分類報表 " + ro : ""}${miss ? `；⚠ 缺 ${miss} 張截圖` : ""}`);
}
