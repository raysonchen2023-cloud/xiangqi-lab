// 象棋千秋 W60-A2 證據同次重產：發布 PR 時核對 data/docs/evidence.md 是不是這一次 CI 重產的結果。
//   兩份逐行比，只忽略「- 執行編號：」「- 產生時間：」兩行（每次執行一定不同）；其他（通過數、略過清單、逐項索引、source/ 樹雜湊、版本）都要一模一樣。
//   倉庫裡那份的執行編號必須是 gh- 開頭（＝GitHub Actions 產生的），本機產生的（local-）或沒有執行編號（手改、舊版工具）一律不准。
// 用法：node .github/scripts/check-evidence.cjs <倉庫裡的 evidence.md> <CI 這一次產生的 evidence.md>
// 兩個參數都是 workflow 裡寫死的路徑，不接任何外部欄位。
"use strict";
const fs = require("fs");

const IGNORE = /^- (執行編號|產生時間)：/;
const norm = s => String(s).replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n").filter(l => !IGNORE.test(l));

/* 回傳 { ok, errors:[...] } */
function compare(repoText, ciText) {
  const errors = [];
  const id = (String(repoText).match(/^- 執行編號：([A-Za-z0-9-]+)/m) || [])[1] || "";
  if (!/^gh-\d+-\d+$/.test(id)) errors.push(`倉庫裡的 evidence.md 執行編號是「${id || "（沒有）"}」：要用 GitHub Actions 產生的（gh- 開頭），不准本機產生或手改`);
  const a = norm(repoText), b = norm(ciText);
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] !== b[i]) {
      errors.push(`內容跟這一次 CI 重產的不一樣（忽略執行編號、產生時間兩行後，第 ${i + 1} 行起）：\n    倉庫：${a[i] === undefined ? "（沒有這一行）" : a[i].slice(0, 200)}\n    重產：${b[i] === undefined ? "（沒有這一行）" : b[i].slice(0, 200)}`);
      break;
    }
  }
  return { ok: !errors.length, errors };
}

module.exports = { compare, norm, IGNORE };

if (require.main === module) {
  const [repoF, ciF] = process.argv.slice(2);
  if (!repoF || !ciF) { console.log("用法：node .github/scripts/check-evidence.cjs <倉庫裡的 evidence.md> <CI 產生的 evidence.md>"); process.exit(2) }
  const rd = f => { try { return fs.readFileSync(f, "utf8") } catch (e) { return null } };
  const R = rd(repoF), C = rd(ciF);
  if (R == null || C == null) { console.log(`✘ 讀不到 ${R == null ? repoF : ciF}`); process.exit(1) }
  const r = compare(R, C);
  if (r.ok) { console.log("✔ data/docs/evidence.md 就是這一次 CI 重產的結果（只差執行編號與產生時間）"); process.exit(0) }
  console.log("✘ 證據不是這一次重產的：\n  - " + r.errors.join("\n  - "));
  console.log("怎麼修：到這次執行的附件 verify-ci 下載 evidence-ci.md，原封不動放到 data/docs/evidence.md 再推上來（不要手改）。");
  process.exit(1);
}
