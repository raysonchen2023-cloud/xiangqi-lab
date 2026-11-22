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
];
const isGuard = (f) => GUARD.some((r) => r.test(f));

/* PR 改到的守門程式（含刪除、改名的兩個路徑） */
function guardChanged(files) { return [...new Set(files.filter(isGuard))].sort() }

/* 要跑的檢查：跟 verify.yml 同一組（換回 main 版之後）；mode 由 main 版的 ci-mode.cjs 判斷（發布 PR 本來就會改網站檔，要跑發布那一組） */
const STEPS = (base, mode) => mode === "release" ? [
  ["完整驗證（全套）", ["node", "source/xiangqi-lab/tools/verify-all.js", "--out", "base-verify.txt", "--tally-out", "base-tally.json"]],
  ["產生驗證紀錄頁", ["node", "source/xiangqi-lab/tools/make-evidence.js", "--verify", "base-verify.txt", "--tally", "base-tally.json", "--out", "base-evidence.md", "--report-out", "base-testkinds.json"]],
  ["證據要是這一次重產的", ["node", ".github/scripts/check-evidence.cjs", "data/docs/evidence.md", "base-evidence.md"]],
  ["發布同步與私密掃描", ["node", "source/xiangqi-lab/tools/release-sync-check.js", "--dir", "."]],
  ["假略過檢查", ["node", ".github/scripts/check-fake-skip.cjs"]],
  ["略過稽核", ["node", ".github/scripts/check-test-skips.cjs", "base-verify.txt"]],
  ["新測試要分類", ["node", ".github/scripts/check-test-classified.cjs", base]],
] : [
  ["假略過檢查", ["node", ".github/scripts/check-fake-skip.cjs"]],
  ["功能 PR 守門", ["node", ".github/scripts/guard-release-files.cjs", base]],
  ["組出 index.html", ["node", "source/check-build.js", "--out", "index.html"]],
  ["完整驗證", ["node", "source/xiangqi-lab/tools/verify-all.js", "--skip", "release-verify", "--out", "base-verify.txt", "--tally-out", "base-tally.json"]],
  ["略過稽核", ["node", ".github/scripts/check-test-skips.cjs", "base-verify.txt"]],
  ["新測試要分類", ["node", ".github/scripts/check-test-classified.cjs", base]],
  ["私密掃描", ["node", "source/xiangqi-lab/tools/oss-scan.js", "source"]],
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
  const changed = guardChanged(files);
  if (!changed.length) { log("✔ 這個 PR 沒有改到判斷紅綠的程式，不用另跑基準版"); return 0 }
  log("這個 PR 改到 " + changed.length + " 支判斷紅綠的程式，換回 " + base + " 那一版再跑一次：\n  " + changed.join("\n  "));
  for (const l of restore(changed, (f) => { try { return git("show", `${base}:${f}`) } catch (e) { return null } }, fsx)) log("  " + l);
  /* 模式照換回後的 ci-mode.cjs（＝main 版）判斷；分支名經環境變數傳入，不嵌進指令 */
  const mode = modeOf(spawn("node", modeArgs(headRef)).stdout);
  log("模式（main 版 ci-mode.cjs 判斷）：" + mode);
  const results = [];
  for (const [name, cmd] of STEPS(base, mode)) {
    const r = spawn(cmd[0], cmd.slice(1), { inherit: true });
    results.push({ name, status: r.status });
    log((r.status === 0 ? "✔ " : "✘ ") + "基準版：" + name + (r.status === 0 ? "" : "（結束代碼 " + r.status + "）"));
  }
  const code = finalCode(results);
  log(code ? `✘ 換回 main 版的守門後有 ${results.filter((r) => r.status !== 0).length} 步沒過：這個 PR 放寬或改壞了守門，要開發者看過` : "✔ 換回 main 版的守門也全過");
  return code;
}

module.exports = { GUARD, isGuard, guardChanged, STEPS, restore, modeArgs, modeOf, finalCode, runGuard };
if (require.main !== module) return;

const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8", maxBuffer: 64e6 });
const spawn = (c, a, o = {}) => spawnSync(c, a, o.inherit ? { stdio: "inherit" } : { encoding: "utf8" });
process.exit(runGuard({ base: process.argv[2] || "origin/main", headRef: process.env.HEAD_REF, git, spawn }));
