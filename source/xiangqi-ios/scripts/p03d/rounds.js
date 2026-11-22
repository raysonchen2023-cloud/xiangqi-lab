/* rounds.js：iOS P0-3D「同一次執行連續 N 輪全過」與嘗試紀錄（純函式，給 p03d.js 用、test-p03d.cjs 測）
   照 Android check-3d.js（PR #58，W69 流程盤點第 5 項，開發者 11/23 選「連續 2 輪」）：
   - 不再接受「失敗後重跑到過」：同一次執行裡，八個情境整組連跑 N 輪（預設 2），每一輪都全過才算過；任一輪沒過就停。
   - 每次執行不論過不過，都追加一行到嘗試紀錄。
   跟 Android 不同的地方：iOS 每次執行的證據資料夾都帶時間（p03d-<時間>），嘗試紀錄放在上一層的固定檔
   p03d-attempts.jsonl，換一次執行不會看不到之前的失敗（PR #58 Codex 審查提的「換 --out 就看不到」在 iOS 這邊先避開）。
   同一個包＝同一個 index.html SHA-256；同一個 iOS 版本＝模擬器的 iOS 大版號。 */
"use strict";

/* --rounds／P03D_ROUNDS：1～9 的整數，預設 2；格式錯回 null（呼叫端當用法錯誤） */
function parseRounds(v) {
  if (v === undefined || v === null || v === "") return 2;
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 && n <= 9 ? n : null;
}

/* 一輪的結果 R＝{情境: {ok}}；prep 不算情境。至少一個情境、全部 ok 才算這一輪過 */
function roundPass(R) {
  const ks = Object.keys(R || {}).filter((k) => k !== "prep");
  return ks.length > 0 && ks.every((k) => R[k] && R[k].ok === true);
}

/* 模擬器系統的 iOS 大版號：從 simctl 的 runtime 名稱讀（例："com.apple.CoreSimulator.SimRuntime.iOS-27-2" → "27"）。
   不用 WKWebView 的 userAgent：它的 OS 版號是凍結值（iOS 27.2 的模擬器回報 "iPhone OS 18_7"），會把不同 iOS 版本算成同一個 */
function runtimeMajor(rt) { const m = /\.iOS-(\d+)-\d+/.exec(String(rt || "")); return m ? m[1] : null }

/* 嘗試紀錄 lines（每行一筆 JSON）裡，同一個包（indexSha256）＋同一個 iOS 大版號之前跑過幾次、失敗幾次；壞掉的行略過 */
function priorAttempts(lines, indexSha256, ios) {
  if (!indexSha256) return { before: 0, failedBefore: 0 };
  const same = (lines || []).map((l) => { try { return JSON.parse(l) } catch (e) { return null } })
    .filter((x) => x && x.indexSha256 === indexSha256 && String(x.ios) === String(ios));
  return { before: same.length, failedBefore: same.filter((x) => x.pass !== true).length };
}

module.exports = { parseRounds, roundPass, runtimeMajor, priorAttempts };

/* 命令列（p0-3d.sh 用）：node rounds.js ios <UDID>，從 stdin 讀 `xcrun simctl list devices -j`，印出那台模擬器的 iOS 大版號 */
if (require.main === module && process.argv[2] === "ios") {
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    let out = "";
    try { for (const [rt, ds] of Object.entries(JSON.parse(s).devices || {})) if ((ds || []).some((d) => d.udid === process.argv[3])) out = runtimeMajor(rt) || "" } catch (e) { }
    process.stdout.write(out);
  });
}
