// 象棋千秋 W69 流程盤點第 12 項（2026-11-23）：同一版只能有一份證據——倉庫的驗證紀錄要跟 evidence.md 同一次 CI 執行
//   以前 source/verification-log-<版本>.txt 是開發者電腦跑的（執行編號 local-…，例如 2485 過／148 略過），
//   data/docs/evidence.md 是 CI 跑的（gh-…，2484／149）：同一版兩份不一樣的證據，沒有人核對。
//   放在 source/ 裡的紀錄會被算進 source/ 樹雜湊，換成 CI 版就對不上，所以開發者 11/23 選「搬到 data/docs，用 CI 版」。
// 發布 PR 時檢查：
//   ① 有 data/docs/verification-log.txt；source/ 底下不能再留 verification-log-*.txt（舊做法，發布 PR 一起刪）
//   ② 它的執行編號是 gh- 開頭（GitHub Actions 產生），而且跟 data/docs/evidence.md 的執行編號一模一樣（同一次執行）
//   ③ 它記的 release.json 版本＝倉庫 release.json 的版本
//   ④ 內容跟這一次 CI 重跑的 verify-ci.txt 一樣，只忽略「執行時間／執行編號／倉庫 commit」三行（每次執行一定不同）
// 怎麼產生：到發布 PR 那次 CI 的附件 verify-ci 下載 verify-ci.txt 與 evidence-ci.md，原封不動放到
//   data/docs/verification-log.txt 與 data/docs/evidence.md（同一次執行的兩份；不要手改、不要用本機跑的）。
// 用法：node .github/scripts/check-verify-log.cjs <倉庫根目錄> <CI 這一次的 verify-ci.txt>
// 兩個參數都是 workflow 裡寫死的路徑，不接任何外部欄位。
"use strict";
const fs = require("fs"), path = require("path");

const LOG = "data/docs/verification-log.txt";
const IGNORE = /^(執行時間|執行編號|倉庫 commit)：/;
const norm = (s) => String(s).replace(/\r\n?/g, "\n").replace(/\n+$/, "").split("\n").filter((l) => !IGNORE.test(l));
const logId = (s) => (String(s).match(/^執行編號：(\S+)/m) || [])[1] || "";
const logVer = (s) => (String(s).match(/^release\.json：版本 (\S+?)、/m) || [])[1] || "";
const evId = (s) => (String(s).match(/^- 執行編號：([A-Za-z0-9-]+)/m) || [])[1] || "";

/* 純函式：version＝release.json 的版本；oldLogs＝source/ 底下還留著的舊驗證紀錄檔名；回傳 { ok, errors:[…] } */
function check({ version, logText, evidenceText, ciText, oldLogs = [] }) {
  const errors = [];
  if (oldLogs.length) errors.push(`source/ 底下還有舊做法的驗證紀錄（${oldLogs.join("、")}）：改放 ${LOG}，舊的在發布 PR 一起刪`);
  if (logText == null) { errors.push(`缺 ${LOG}：這一版的驗證紀錄要放進倉庫（CI 附件 verify-ci 的 verify-ci.txt）`); return { ok: false, errors } }
  const a = logId(logText), b = evId(evidenceText);
  if (!/^gh-\d+-\d+$/.test(a)) errors.push(`驗證紀錄的執行編號是「${a || "（沒有）"}」：要用 GitHub Actions 產生的（gh- 開頭），不准本機產生或手改`);
  if (!b) errors.push("data/docs/evidence.md 沒有執行編號");
  else if (a && a !== b) errors.push(`驗證紀錄（${a}）跟 evidence.md（${b}）不是同一次執行：兩份要從同一次 CI 的附件拿`);
  if (!version) errors.push("讀不到 release.json 的版本");
  else if (logVer(logText) !== version) errors.push(`驗證紀錄記的版本是「${logVer(logText) || "（沒有）"}」，不是 release.json 的 ${version}`);
  const x = norm(logText), y = norm(ciText);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if (x[i] !== y[i]) {
      errors.push(`內容跟這一次 CI 重跑的不一樣（忽略執行時間、執行編號、倉庫 commit 三行後，第 ${i + 1} 行起）：\n    倉庫：${x[i] === undefined ? "（沒有這一行）" : x[i].slice(0, 200)}\n    這次：${y[i] === undefined ? "（沒有這一行）" : y[i].slice(0, 200)}`);
      break;
    }
  }
  return { ok: !errors.length, errors };
}

module.exports = { check, norm, logId, logVer, evId, IGNORE, LOG };

if (require.main === module) {
  const [root, ciF] = process.argv.slice(2);
  if (!root || !ciF) { console.log("用法：node .github/scripts/check-verify-log.cjs <倉庫根目錄> <CI 這一次的 verify-ci.txt>"); process.exit(2) }
  const rd = (f) => { try { return fs.readFileSync(f, "utf8") } catch (e) { return null } };
  let version = "";
  try { version = JSON.parse(rd(path.join(root, "release.json"))).version || "" } catch (e) { }
  const oldLogs = (() => { try { return fs.readdirSync(path.join(root, "source")).filter((n) => /^verification-log-.*\.txt$/.test(n)) } catch (e) { return [] } })();
  const C = rd(ciF);
  if (C == null) { console.log("✘ 讀不到 " + ciF); process.exit(1) }
  const r = check({ version, logText: rd(path.join(root, LOG)), evidenceText: rd(path.join(root, "data", "docs", "evidence.md")) || "", ciText: C, oldLogs });
  if (r.ok) { console.log(`✔ ${LOG} 跟 evidence.md 是同一次 CI 執行，版本對，內容也跟這次重跑的一樣`); process.exit(0) }
  console.log("✘ 同一版的證據不一致：\n  - " + r.errors.join("\n  - "));
  console.log(`怎麼修：到這次執行的附件 verify-ci 下載 verify-ci.txt 和 evidence-ci.md，原封不動放到 ${LOG} 和 data/docs/evidence.md（同一次執行的兩份），刪掉 source/verification-log-*.txt，再推上來。`);
  process.exit(1);
}
