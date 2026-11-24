// 基準版守門（W69 流程盤點第 1 項，2026-11-22）：PR 改到「判斷紅綠的程式」時，換回 main 那一版再跑一次。
//   為什麼：verify.yml 由 pull_request 觸發，跑的是 PR 自己那一份守門與測試統計；PR 只要同時改壞守門（例如讓略過稽核放行、
//   讓測試統計把失敗當通過），CI 就會綠。這支由 guard-base.yml（pull_request_target：用 main 那一份 workflow，PR 改不到）
//   從 main 取出來執行（自己也從 main 取，PR 改不到這支），把 PR 改到的守門程式全部換回 main 那一版，用 PR 的內容再跑一次。
//   兩個版本都要過；PR 故意放寬的地方，會在這一步紅燈，要開發者看過才能合併。
//   資料檔（略過白名單 test-skip-allow.json、P0 已知問題 p0-known.json）不換：它們本來就要逐行審，換回去會讓正常新增的略過也紅燈。
// 用法：node <main 那一版的 base-guard.cjs> [比較基準，預設 origin/main]   （在 PR 的 checkout 根目錄執行；分支名從環境變數 HEAD_REF 讀）
// 結束代碼：0＝沒改到守門程式，或換回 main 版仍全過；1＝換回 main 版後有一步沒過；2＝用法或環境錯誤
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");

/* 判斷紅綠的程式：.github/scripts/ 全部，加上 source/ 裡決定結束碼、證據、私密掃描的幾支；
   verify-all 的四步（check-build、release-verify、pikafish-verify、run-tests）都在內（PR #43 審查 B：補 pikafish-verify）。
   不列 tools/mhtml.js：它是組版工具，只決定組出來的 index.html 長什麼樣，不判紅綠；組版比對與測試照樣用換回後的 check-build、run-tests 判斷 */
const GUARD = [
  /^\.github\/scripts\/[^/]+\.cjs$/,
  /^source\/run-tests\.js$/,
  /^source\/check-build\.js$/,
  /^source\/xiangqi-lab\/tools\/(testkinds|verify-all|make-evidence|oss-scan|release-sync-check|release-verify|pikafish-verify)\.js$/,
  /^source\/xiangqi-ios\/scripts\/check-native\.js$/,   /* PR #45（W69③）：verify.yml 跑 check-native，它的結束碼決定紅綠 */
  /^source\/xiangqi-ios\/scripts\/p03d\/test-p03d\.cjs$/,   /* PR #45（W69①）：iOS P0-3D 腳本的自我檢查；換回 main 版去檢查 PR 版的 p03d.js，PR 同時放寬兩邊也擋得到 */
  /^source\/xiangqi-ios\/scripts\/test-canary-www\.cjs$/,   /* iOS P0-IMG 金絲雀的自我檢查（2026-11-23）：換回 main 版去檢查 PR 版的 check-www.js／canary-www.js，PR 同時放寬兩邊也擋得到 */
];
const isGuard = (f) => GUARD.some((r) => r.test(f));

/* PR 改到的守門程式（含刪除、改名的兩個路徑） */
function guardChanged(files) { return [...new Set(files.filter(isGuard))].sort() }

/* testkinds.js 同時是守門程式和「已分類測試清單」（CLASSIFIED）。#43 上線後，每個新增測試的 PR 都要在清單加一行登記，
   整支換回 main 版會讓新測試變成沒分類、基準版守門誤判紅燈（#48 實際發生）。
   所以（iMac Claude 2 審查四點）：PR 版 testkinds.js 只「新增」登記行，去掉這些新增行後跟 main 版逐字相同，而且
     ・每一行新增都符合嚴格格式：兩格縮排、"test-小寫英數與連字號.js"、逗號、空白、一段註解（註解裡不准再出現註解結束記號，免得在後面夾帶程式）
     ・新增行都在 CLASSIFIED 清單裡（PENDING、SKIP 的任何改動都會讓「去掉新增行後逐字相同」不成立：加進 PENDING＝把既有測試降級、SKIP＝整支不跑）
     ・登記的檔名都是這個 PR 新增的測試檔（不能拿來登記既有或不存在的檔）
   才把 testkinds.js 當資料、不換回；刪除或修改任何既有行，一律換回 main 版。 */
const TK_PATH = "source/xiangqi-lab/tools/testkinds.js";
const TK_ENTRY = /^  "(test-[a-z0-9-]+\.js)",\s+\/\*(?:(?!\*\/)[^\n])*\*\/$/;
function classifiedOnly(baseSrc, prSrc, addedTests) {
  const A = String(baseSrc).split("\n"), B = String(prSrc).split("\n"), added = new Set(addedTests || []);
  const a = B.findIndex((l) => l.startsWith("const CLASSIFIED = new Set([")), b = a < 0 ? -1 : B.findIndex((l, i) => i > a && l === "]);");
  if (a < 0 || b < 0) return false;
  /* 只有新增：照順序走，PR 的行跟 main 對得上就前進，對不上的就是新增行 */
  let i = 0, n = 0;
  for (let k = 0; k < B.length; k++) {
    if (i < A.length && B[k] === A[i]) { i++; continue }
    const m = TK_ENTRY.exec(B[k]);
    if (!m || k <= a || k >= b || !added.has(m[1])) return false;
    n++;
  }
  return i === A.length && n > 0;
}

/* 斷言次數（W69 第 10 項）：每一步都帶這組環境變數，完整驗證時 assert-count.cjs（換回後是 main 版）記下每項測試的斷言次數；
   資料夾用絕對路徑，跟 verify.yml 一樣放在工作區外的暫存資料夾 */
/* 每次執行一個自己的資料夾（程序編號＋時間）：同一台電腦上別人同時跑 base-guard 或 .github 自我測試，不會互相清掉計數（本機實際撞過：記到 285／2737）。CI 的 runner 本來就隔離 */
const ASSERT_DIR = path.resolve(process.env.RUNNER_TEMP || require("os").tmpdir(), "base-assert-count-" + process.pid + "-" + Date.now().toString(36));
const assertEnv = () => ({ ...process.env, XQ_ASSERT_DIR: ASSERT_DIR, NODE_OPTIONS: ((process.env.NODE_OPTIONS || "") + " --require " + path.resolve(".github/scripts/assert-count.cjs")).trim() });
/* 私密掃描補強（scan-changed）的暫存資料夾：每個程序一份（PR #68 審查⑤：基準版守門也要跑這一步，跟 verify.yml 兩種模式一樣） */
const SCAN_TMP = path.resolve(process.env.RUNNER_TEMP || require("os").tmpdir(), "base-scan-changed-" + process.pid);
const SCAN_STEP = (base) => ["私密掃描補強", ["node", ".github/scripts/scan-changed.cjs", base, SCAN_TMP]];
/* 要跑的檢查：跟 verify.yml 同一組（換回 main 版之後）；mode 由 main 版的 ci-mode.cjs 判斷（發布 PR 本來就會改網站檔，要跑發布那一組） */
const STEPS = (base, mode) => mode === "release" ? [
  ["完整驗證（全套）", ["node", "source/xiangqi-lab/tools/verify-all.js", "--out", "base-verify.txt", "--tally-out", "base-tally.json"]],
  ["產生驗證紀錄頁", ["node", "source/xiangqi-lab/tools/make-evidence.js", "--verify", "base-verify.txt", "--tally", "base-tally.json", "--out", "base-evidence.md", "--report-out", "base-testkinds.json"]],
  ["證據要是這一次重產的", ["node", ".github/scripts/check-evidence.cjs", "data/docs/evidence.md", "base-evidence.md"]],
  ["驗證紀錄跟 evidence.md 同一次執行", ["node", ".github/scripts/check-verify-log.cjs", ".", "base-verify.txt"]],   /* W69 流程盤點第 12 項（PR #59 審查：iMac Claude 2） */
  ["發布同步與私密掃描", ["node", "source/xiangqi-lab/tools/release-sync-check.js", "--dir", "."]],
  ["發布產物守門", ["node", ".github/scripts/guard-release-pr.cjs", base]],   /* W69 流程盤點第 2 項（PR #46）：改到的每個檔都要對得到來源 */
  ["假略過檢查", ["node", ".github/scripts/check-fake-skip.cjs"]],
  ["斷言次數檢查", ["node", ".github/scripts/check-zero-assert.cjs", ASSERT_DIR, "base-verify.txt"]],   /* W69 第 10 項 */
  ["略過稽核", ["node", ".github/scripts/check-test-skips.cjs", "base-verify.txt"]],
  ["todo 稽核", ["node", ".github/scripts/check-test-todos.cjs", "base-tally.json", "--base", base]],   /* W69 流程盤點第 9 項：預期失敗也要在白名單、白名單只能減 */
  ["0 項檢查", ["node", ".github/scripts/check-test-empty.cjs", "base-tally.json"]],   /* W69 流程盤點第 18 項：0 項的檔、沒跑到的檔都紅燈 */
  ["新測試要分類", ["node", ".github/scripts/check-test-classified.cjs", base]],
  ["iOS 原生檢查", ["node", "source/xiangqi-ios/scripts/check-native.js"]],   /* PR #45：跟 verify.yml 同一步 */
  ["iOS P0-3D 腳本自我檢查", ["node", "--test", "source/xiangqi-ios/scripts/p03d/test-p03d.cjs"]],
  ["iOS P0-IMG 金絲雀自我檢查", ["node", "--test", "source/xiangqi-ios/scripts/test-canary-www.cjs"]],   /* 跟 verify.yml 同一步 */
  SCAN_STEP(base),
] : [
  ["假略過檢查", ["node", ".github/scripts/check-fake-skip.cjs"]],
  ["功能 PR 守門", ["node", ".github/scripts/guard-release-files.cjs", base]],
  ["組出 index.html", ["node", "source/check-build.js", "--out", "index.html"]],
  ["完整驗證", ["node", "source/xiangqi-lab/tools/verify-all.js", "--skip", "release-verify", "--out", "base-verify.txt", "--tally-out", "base-tally.json"]],
  ["斷言次數檢查", ["node", ".github/scripts/check-zero-assert.cjs", ASSERT_DIR, "base-verify.txt"]],   /* W69 第 10 項 */
  ["略過稽核", ["node", ".github/scripts/check-test-skips.cjs", "base-verify.txt"]],
  ["todo 稽核", ["node", ".github/scripts/check-test-todos.cjs", "base-tally.json", "--base", base]],   /* W69 流程盤點第 9 項：預期失敗也要在白名單、白名單只能減 */
  ["0 項檢查", ["node", ".github/scripts/check-test-empty.cjs", "base-tally.json"]],   /* W69 流程盤點第 18 項：0 項的檔、沒跑到的檔都紅燈 */
  ["新測試要分類", ["node", ".github/scripts/check-test-classified.cjs", base]],
  ["私密掃描", ["node", "source/xiangqi-lab/tools/oss-scan.js", "source"]],
  SCAN_STEP(base),
  ["iOS 原生檢查", ["node", "source/xiangqi-ios/scripts/check-native.js"]],   /* PR #45：跟 verify.yml 同一步 */
  ["iOS P0-3D 腳本自我檢查", ["node", "--test", "source/xiangqi-ios/scripts/p03d/test-p03d.cjs"]],
  ["iOS P0-IMG 金絲雀自我檢查", ["node", "--test", "source/xiangqi-ios/scripts/test-canary-www.cjs"]],   /* 跟 verify.yml 同一步 */
];

/* 把 PR 改到的守門程式換回基準版：基準版沒有的（PR 新加的守門）先拿掉。show(f) 回傳基準版內容或 null */
function restore(changed, show, fsx = fs) {
  const log = [];
  for (const f of changed) {
    const src = show(f);
    if (src == null) { if (fsx.existsSync(f)) fsx.rmSync(f); log.push("－ " + f + "（基準版沒有這支：先拿掉）") }
    else { fsx.mkdirSync(path.dirname(f), { recursive: true }); fsx.writeFileSync(f, src); log.push("↺ " + f) }
  }
  return log;
}

/* ci-mode.cjs 的參數：事件名稱一律 pull_request（guard-base.yml 是 pull_request_target，ci-mode 會把非 pull_request 都當發布模式；
   語意上就是 PR，模式只看分支名，跟 verify.yml 一致） */
const modeArgs = (headRef) => [".github/scripts/ci-mode.cjs", String(headRef || ""), "pull_request"];
const modeOf = (stdout) => /mode=release/.test(String(stdout || "")) ? "release" : "feature";
/* 全部步驟的結果 → 結束代碼：有一步沒過就是 1 */
const finalCode = (results) => results.some((r) => r.status !== 0) ? 1 : 0;

/* 主流程（可注入 git、spawn、fs，自我測試用）：回傳結束代碼 */
function runGuard({ base = "origin/main", headRef = "", git, spawn, fsx = fs, log = console.log } = {}) {
  let files;
  try { files = git("diff", "--name-only", "-z", "--no-renames", `${base}...HEAD`).split("\0").filter(Boolean) }
  catch (e) { log("✘ 讀不到跟 " + base + " 的差異：" + e.message); return 2 }
  let changed = guardChanged(files);
  if (changed.includes(TK_PATH)) {
    let baseSrc = null, prSrc = null;
    /* 跟分岔點（merge-base）比，跟 git diff base...HEAD 一致（PR #51 審查）：好幾派 PR 同時開著，別的 PR 先合併後 main 會多別人的登記行，
       跟 main 最新版比會讓還沒 update-branch 的 PR 變成「不只新增」而換回、又紅燈 */
    try { const mb = git("merge-base", base, "HEAD").trim(); baseSrc = git("show", `${mb}:${TK_PATH}`) } catch (e) { }
    try { prSrc = fsx.readFileSync(TK_PATH, "utf8") } catch (e) { }
    let addedTests = [];
    try { addedTests = git("diff", "--name-only", "-z", "--no-renames", "--diff-filter=A", `${base}...HEAD`).split("\0").filter(Boolean).filter((f) => /^source\/xiangqi-lab\/tools\/test-[^/]+\.js$/.test(f)).map((f) => f.split("/").pop()) } catch (e) { }
    if (baseSrc != null && prSrc != null && classifiedOnly(baseSrc, prSrc, addedTests)) {
      changed = changed.filter((f) => f !== TK_PATH);
      log("  testkinds.js 只在 CLASSIFIED 新增本 PR 測試的登記（其他一個字都沒變）：當資料，不換回");
    }
  }
  if (!changed.length) { log("✔ 這個 PR 沒有改到判斷紅綠的程式，不用另跑基準版"); return 0 }
  log("這個 PR 改到 " + changed.length + " 支判斷紅綠的程式，換回 " + base + " 那一版再跑一次：\n  " + changed.join("\n  "));
  for (const l of restore(changed, (f) => { try { return git("show", `${base}:${f}`) } catch (e) { return null } }, fsx)) log("  " + l);
  /* 模式照換回後的 ci-mode.cjs（＝main 版）判斷；分支名經環境變數傳入，不嵌進指令 */
  const mode = modeOf(spawn("node", modeArgs(headRef)).stdout);
  log("模式（main 版 ci-mode.cjs 判斷）：" + mode);
  const results = [];
  try { fsx.rmSync(ASSERT_DIR, { recursive: true, force: true }) } catch (e) { }   /* 清掉這次程序自己的斷言計數資料夾；走注入的 fsx（PR #69 審查：自我測試用假的 fs，碰不到真的暫存資料夾）。名稱每個程序不同，碰不到別人正在用的 */
  for (const [name, cmd] of STEPS(base, mode)) {
    const r = spawn(cmd[0], cmd.slice(1), { inherit: true, env: assertEnv() });
    results.push({ name, status: r.status });
    log((r.status === 0 ? "✔ " : "✘ ") + "基準版：" + name + (r.status === 0 ? "" : "（結束代碼 " + r.status + "）"));
  }
  try { fsx.rmSync(ASSERT_DIR, { recursive: true, force: true }) } catch (e) { }   /* 跑完清掉自己這一份，不在暫存區留一堆（PR #69 複審建議） */
  const code = finalCode(results);
  log(code ? `✘ 換回 main 版的守門後有 ${results.filter((r) => r.status !== 0).length} 步沒過：這個 PR 放寬或改壞了守門，要開發者看過` : "✔ 換回 main 版的守門也全過");
  return code;
}

module.exports = { GUARD, isGuard, guardChanged, STEPS, restore, modeArgs, modeOf, finalCode, runGuard, classifiedOnly, TK_PATH, ASSERT_DIR, assertEnv };
if (require.main !== module) return;

const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8", maxBuffer: 64e6 });
const spawn = (c, a, o = {}) => spawnSync(c, a, o.inherit ? { stdio: "inherit", env: o.env || process.env } : { encoding: "utf8" });
process.exit(runGuard({ base: process.argv[2] || "origin/main", headRef: process.env.HEAD_REF, git, spawn }));
