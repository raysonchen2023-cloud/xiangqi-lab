// 私密掃描補強（W36 第二輪審查 2，iMac Claude 2）：source/ 全掃之外，把本 PR 新增或修改後的所有檔（不限資料夾）
// 複製到暫存資料夾（保留相對路徑），用 oss-scan 再掃一次。沒有改到的檔就略過。
// W69 流程盤點中 16「私密掃描在 CI 偏弱」（2026-11-23，iMac Claude 1）再加三道：
//   ① 改到的檔有「中風險」（信箱、電話、本機路徑、帳密設定值、Google 表單網址…）也擋：原本只有高風險會紅燈。
//      App 本來就公開、或確定是誤判的，寫進 .github/oss-allow.json（改 .github/ 要逐行審），每筆都要寫理由。
//   ② 這個 PR 新加的 oss-scan:allow（寫在程式行裡，那一行整個不掃）一條一條列出來給審查者看；沒寫理由的擋。
//   ③ 新增或修改的圖片（jpg、png、webp）裡有拍攝地點、相機型號、拍攝者或序號的中繼資料就擋（image-meta.cjs）。
// 用法：node .github/scripts/scan-changed.cjs <比較基準> <暫存資料夾>
//   掃描工具位置可用環境變數 OSS_SCAN 指定（預設 source/xiangqi-lab/tools/oss-scan.js，自我測試會用到）
//   放行清單可用環境變數 OSS_ALLOW 指定（預設 .github/oss-allow.json；檔案不存在＝沒有放行）
// 結束代碼：0＝沒問題；1＝有要擋的；2＝用法錯誤或放行清單格式錯
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
const { imageMeta, KIND_ZH } = require("./image-meta.cjs");

/* 放行清單要齊全才收：rule 要是 oss-scan 認得的規則；file 或 match 至少一個（不准整條規則全放行）；理由至少 4 個字 */
function checkAllow(items, ruleIds) {
  const bad = [];
  if (!Array.isArray(items)) return ["items 要是陣列"];
  items.forEach((a, i) => {
    const at = `第 ${i + 1} 筆`;
    if (!a || typeof a !== "object") { bad.push(at + "不是物件"); return }
    if (!ruleIds.includes(a.rule)) bad.push(`${at}的 rule「${a.rule}」不是 oss-scan 的規則`);
    if (!String(a.file || "").trim() && !String(a.match || "").trim()) bad.push(at + "沒有 file 也沒有 match：不准整條規則全部放行");
    if (String(a.reason || "").trim().length < 4) bad.push(at + "沒寫理由（reason 至少 4 個字）");
  });
  return bad;
}
/* git diff -U0 的輸出裡，這個 PR 新加的 oss-scan:allow 行：[{file, line, text, reason}] */
function addedAllows(diff) {
  const out = []; let file = null, ln = 0;
  for (const l of String(diff).split("\n")) {
    if (l.startsWith("+++ ")) { file = l.slice(4).replace(/^b\//, ""); continue }
    const h = /^@@ -\d+(?:,\d+)? \+(\d+)/.exec(l); if (h) { ln = +h[1]; continue }
    if (l.startsWith("+") && file) {
      const m = /oss-scan:\s*allow(.*)$/.exec(l);
      if (m) out.push({ file, line: ln, text: l.slice(1).trim().slice(0, 160), reason: m[1].replace(/\*\/|-->|[\s:：（）()—\-]/g, "").trim() });
      ln++;
    }
  }
  return out;
}
const IMG = /\.(?:jpe?g|png|webp)$/i;
/* 中風險（沒被放行）＋圖片中繼資料＋沒理由的 oss-scan:allow → 要擋的清單（純函式） */
function judge({ findings, images, allows }) {
  const medium = (findings || []).filter((f) => f.risk === "medium" && !f.allowed);
  const meta = (images || []).filter((x) => x.meta && x.meta.kinds.length);
  const noReason = (allows || []).filter((a) => a.reason.length < 4);
  return { medium, meta, noReason, ok: !medium.length && !meta.length && !noReason.length };
}

module.exports = { checkAllow, addedAllows, judge };
if (require.main !== module) return;

const [base = "origin/main", out] = process.argv.slice(2);
if (!out) { console.log("用法：node scan-changed.cjs <比較基準> <暫存資料夾>"); process.exit(2); }
const scanner = path.resolve(process.env.OSS_SCAN || "source/xiangqi-lab/tools/oss-scan.js");
const allowF = process.env.OSS_ALLOW || path.join(".github", "oss-allow.json");
let allow = [];
if (fs.existsSync(allowF)) {
  try { allow = JSON.parse(fs.readFileSync(allowF, "utf8")).items } catch (e) { console.log("✘ 放行清單讀不懂：" + allowF); process.exit(2) }
  let ids = []; try { ids = require(scanner).RULES.map((r) => r.id).concat(require(scanner).NAME_RULES.map((r) => r.id)) } catch (e) { }
  const bad = checkAllow(allow, ids);
  if (bad.length) { console.log("✘ 放行清單 " + allowF + " 格式不對：\n  " + bad.join("\n  ")); process.exit(2) }
}
const git = (args) => execFileSync("git", ["-c", "core.quotePath=false", ...args], { maxBuffer: 200e6 }).toString();
const files = git(["diff", "--name-only", "-z", "--no-renames", "--diff-filter=AM", `${base}...HEAD`])
  .split("\0").filter(f => f && fs.existsSync(f) && fs.statSync(f).isFile());
if (!files.length) { console.log("本 PR 沒有新增或修改的檔，略過"); process.exit(0); }
fs.rmSync(out, { recursive: true, force: true });
for (const f of files) { const d = path.join(out, f); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(f, d); }
console.log(`複製 ${files.length} 個改到的檔到暫存資料夾，交給 oss-scan 掃（放行清單 ${allow.length} 筆）`);
const tmpA = out + ".allow.json", tmpJ = out + ".scan.json";
fs.writeFileSync(tmpA, JSON.stringify(allow));
const r = spawnSync(process.execPath, [scanner, out, "--allow", tmpA, "--json", tmpJ], { stdio: "inherit" });
let findings = null; try { findings = JSON.parse(fs.readFileSync(tmpJ, "utf8")).findings } catch (e) { }
fs.rmSync(out, { recursive: true, force: true }); fs.rmSync(tmpA, { force: true }); fs.rmSync(tmpJ, { force: true });
if (r.status === null || findings === null) { console.log("✘ oss-scan 沒有跑完或沒有寫出結果：不能當沒問題"); process.exit(1) }

const images = files.filter((f) => IMG.test(f)).map((f) => ({ file: f, meta: imageMeta(fs.readFileSync(f)) }));
const allows = addedAllows(git(["diff", "-U0", "--no-renames", `${base}...HEAD`]));
const J = judge({ findings, images, allows });

console.log(`\n圖片中繼資料：看了 ${images.length} 張新增或修改的圖`);
for (const x of images.filter((x) => !x.meta)) console.log(`  ⚠ ${x.file}：格式讀不懂，沒有檢查到`);
for (const x of J.meta) console.log(`  ✘ ${x.file}：有${x.meta.kinds.map((k) => KIND_ZH[k] || k).join("、")}的中繼資料 → 先去掉再放進倉庫（例如 exiftool -all= 檔名，或重新匯出不含中繼資料）`);
if (allows.length) {
  console.log(`\n這個 PR 新加的 oss-scan:allow（那一行整個不掃，審查者要逐條確認）：${allows.length} 條`);
  for (const a of allows) console.log(`  ${a.reason.length >= 4 ? "△" : "✘"} ${a.file}:${a.line}  ${a.text}${a.reason.length >= 4 ? "" : "  ← 沒寫理由：在 oss-scan:allow 後面寫為什麼可以留"}`);
}
if (J.medium.length) {
  console.log(`\n✘ 改到的檔有 ${J.medium.length} 筆中風險沒被放行（上面「中風險」那一段）。`);
  console.log("  確定是 App 本來就公開、或是誤判的，寫進 .github/oss-allow.json（rule＋file 或 match＋理由；改 .github/ 要逐行審）；其他的拿掉。");
}
const fail = r.status !== 0 || !J.ok;
console.log(fail ? "\n✘ 私密掃描補強沒過" : "\n✔ 改到的檔沒有高、中風險，圖片沒有個資中繼資料");
process.exit(fail ? 1 : 0);
