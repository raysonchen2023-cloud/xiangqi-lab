// 象棋千秋 PR 自動檢查的模式判斷（W36）：
//   發布 PR（來源分支名以小寫 release/ 開頭）→ release：全套檢查（組版比對、版號一致、發布同步檢查）
//   其他 PR（功能 PR）→ feature：先用原始碼組出 index.html 再檢查，略過版號一致（功能 PR 只改原始碼、不蓋版號）
//   不是 PR 觸發（手動執行等）→ release：一律跑全套
// 為什麼：功能 PR 照流程只改 source/、不改 index.html，用全套檢查會因 index.html 不是這份原始碼組出的而紅燈（W36 試跑本機實驗證實）。
// 用法：node .github/scripts/ci-mode.cjs <來源分支名> <事件名>  → stdout 輸出一行 mode=release|feature（接到 $GITHUB_OUTPUT）
"use strict";
function ciMode(headRef, eventName) {
  if (eventName !== "pull_request") return "release";
  return /^release\//.test(String(headRef || "")) ? "release" : "feature";
}
module.exports = { ciMode };
if (require.main === module) {
  const [ref, ev] = process.argv.slice(2), m = ciMode(ref, ev);
  console.error(`模式：${m === "release" ? "發布 PR／全套（組版比對、版號一致、發布同步檢查）" : "功能 PR（先用原始碼組版，略過版號一致）"}｜分支 ${ref || "（無）"}｜事件 ${ev || "（無）"}`);
  console.log(`mode=${m}`);
}
