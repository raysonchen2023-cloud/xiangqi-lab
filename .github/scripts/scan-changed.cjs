// 私密掃描補強（W36 第二輪審查 2，iMac Claude 2）：source/ 全掃之外，把本 PR 新增、修改或改型別後的所有檔（不限資料夾）
// 複製到暫存資料夾（保留相對路徑），用 oss-scan 再掃一次。沒有改到的檔就略過。
// W69 流程盤點中 16「私密掃描在 CI 偏弱」（2026-11-23，iMac Claude 1；PR #68 審查後重寫）再加三道：
//   ① 改到的檔有「中風險」（信箱、電話、本機路徑、帳密設定值、Google 表單網址…）也擋：原本只有高風險會紅燈。
//      App 本來就公開、或確定是誤判的，寫進 .github/oss-allow.json 的 items（改 .github/ 要逐行審），每筆都要寫理由。
//   ② 行內放行標記（oss-scan 冒號 allow：那一行整個不掃）一律要在 .github/oss-allow.json 的 inline 登記（檔名＋那一行的 SHA-256＋理由），
//      沒登記就擋（開發者 11/23 選的）。直接讀改到的檔，不解析 git diff：標成 binary、CRLF、某行開頭是「++ 」都繞不過（PR #68 審查①）。
//   ③ 改到的檔用檔頭判斷是不是圖片（不看副檔名）。圖片裡有拍攝地點、相機型號、拍攝者、序號或註解就擋；
//      讀不懂的圖（HEIC、AVIF、壞掉的）一律擋，請轉成 webp／png（PR #68 審查③）。
// 用法：node .github/scripts/scan-changed.cjs <比較基準> <暫存資料夾>
//   掃描工具位置可用環境變數 OSS_SCAN 指定（預設 source/xiangqi-lab/tools/oss-scan.js，自我測試會用到）
//   放行清單可用環境變數 OSS_ALLOW 指定（預設 .github/oss-allow.json；檔案不存在＝沒有放行）
// 已知限制：base64 等編碼過的機密 oss-scan 本來就認不出來。
// 結束代碼：0＝沒問題；1＝有要擋的；2＝用法錯誤或放行清單格式錯
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { imageMeta, sniff, KIND_ZH } = require("./image-meta.cjs");

/* 行內放行標記的字樣：用拼的，這支自己的說明與訊息不會被當成放行、也照常被掃 */
const TOK = "oss-scan" + ":allow";
const MARK = /oss-scan:\s*allow/;   /* 跟 oss-scan.js 判斷「這一行不掃」用的一樣 */

/* 放行清單要齊全才收（PR #68 審查⑥）：
   items：rule 要是 oss-scan 認得的中、低風險規則（高風險不准放行）；file 或 match 至少一個；match 至少 6 個字；理由至少 4 個字
   inline：file（倉庫裡的完整路徑）、sha256（那一行的雜湊，64 碼小寫）、理由至少 4 個字 */
function checkAllow(list, risks) {
  const bad = [], items = list && list.items, inline = (list && list.inline) || [];
  if (!Array.isArray(items)) return ["items 要是陣列"];
  if (!Array.isArray(inline)) return ["inline 要是陣列"];
  items.forEach((a, i) => {
    const at = `items 第 ${i + 1} 筆`;
    if (!a || typeof a !== "object") { bad.push(at + "不是物件"); return }
    if (!(a.rule in risks)) bad.push(`${at}的 rule「${a.rule}」不是 oss-scan 的規則`);
    else if (risks[a.rule] === "high") bad.push(`${at}的 rule「${a.rule}」是高風險：不准放行`);
    if (!String(a.file || "").trim() && !String(a.match || "").trim()) bad.push(at + "沒有 file 也沒有 match：不准整條規則全部放行");
    if (a.match != null && String(a.match).length < 6) bad.push(at + "的 match 太短（至少 6 個字）");
    if (a.file != null && (String(a.file).length < 3 || /^\//.test(a.file))) bad.push(at + "的 file 要寫路徑（不加開頭的 /）");
    if (String(a.reason || "").trim().length < 4) bad.push(at + "沒寫理由（reason 至少 4 個字）");
  });
  inline.forEach((a, i) => {
    const at = `inline 第 ${i + 1} 筆`;
    if (!a || !String(a.file || "").trim()) bad.push(at + "沒寫 file");
    if (!/^[0-9a-f]{64}$/.test(String(a && a.sha256))) bad.push(at + "的 sha256 要是 64 碼小寫");
    if (String((a && a.reason) || "").trim().length < 4) bad.push(at + "沒寫理由（reason 至少 4 個字）");
  });
  return bad;
}
/* 一個檔裡有行內放行標記的行：[{line, sha256, text}]。照 oss-scan 的切法（只認 \n），雜湊前去掉行尾 \r 和前後空白 */
const lineSha = (s) => crypto.createHash("sha256").update(String(s).replace(/\r$/, "").trim(), "utf8").digest("hex");
function markerLines(text) {
  const out = [];
  String(text).split("\n").forEach((l, i) => { if (MARK.test(l)) out.push({ line: i + 1, sha256: lineSha(l), text: l.replace(/\r$/, "").trim().slice(0, 160) }) });
  return out;
}
/* 標記行有沒有登記：回傳沒登記的 [{file, line, sha256, text}]（純函式） */
function unregistered(files, inline) {
  const ok = new Set((inline || []).map((a) => a.file + "\n" + a.sha256)), out = [];
  for (const { file, marks } of files) for (const m of marks) if (!ok.has(file + "\n" + m.sha256)) out.push({ file, ...m });
  return out;
}
const IMG_EXT = /\.(?:jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif)$/i;
/* 圖片判斷（純函式）：副檔名像圖片、或檔頭是圖片的才看；讀不懂（imageMeta 回 null）一律算要擋 */
function imageCheck(file, buf) {
  const fmt = sniff(buf);
  if (!fmt && !IMG_EXT.test(file)) return null;
  return { file, fmt, meta: imageMeta(buf) };
}
/* 中風險（沒被放行）＋圖片有中繼資料或讀不懂＋沒登記的行內標記 → 要擋的清單（純函式） */
function judge({ findings, images, unreg }) {
  const medium = (findings || []).filter((f) => f.risk === "medium" && !f.allowed);
  const meta = (images || []).filter((x) => x.meta && x.meta.kinds.length);
  const unreadable = (images || []).filter((x) => !x.meta);
  return { medium, meta, unreadable, unreg: unreg || [], ok: !medium.length && !meta.length && !unreadable.length && !(unreg || []).length };
}

module.exports = { checkAllow, markerLines, unregistered, imageCheck, judge, lineSha, TOK };
if (require.main !== module) return;

const [base = "origin/main", out] = process.argv.slice(2);
if (!out) { console.log("用法：node scan-changed.cjs <比較基準> <暫存資料夾>"); process.exit(2); }
const scanner = path.resolve(process.env.OSS_SCAN || "source/xiangqi-lab/tools/oss-scan.js");
const allowF = process.env.OSS_ALLOW || path.join(".github", "oss-allow.json");
let list = { items: [], inline: [] };
if (fs.existsSync(allowF)) {
  try { list = JSON.parse(fs.readFileSync(allowF, "utf8")); list.inline = list.inline || [] } catch (e) { console.log("✘ 放行清單讀不懂：" + allowF); process.exit(2) }
  let risks = {}; try { const S = require(scanner); for (const r of S.RULES.concat(S.NAME_RULES)) risks[r.id] = r.risk } catch (e) { }
  const bad = checkAllow(list, risks);
  if (bad.length) { console.log("✘ 放行清單 " + allowF + " 格式不對：\n  " + bad.join("\n  ")); process.exit(2) }
}
const git = (args) => execFileSync("git", ["-c", "core.quotePath=false", ...args], { maxBuffer: 200e6 }).toString();
/* A＝新增、M＝修改、T＝型別改變（例如符號連結換成一般檔；PR #68 審查④） */
const files = git(["diff", "--name-only", "-z", "--no-renames", "--diff-filter=AMT", `${base}...HEAD`])
  .split("\0").filter(f => f && fs.existsSync(f) && fs.lstatSync(f).isFile());
if (!files.length) { console.log("本 PR 沒有新增或修改的檔，略過"); process.exit(0); }
fs.rmSync(out, { recursive: true, force: true });
for (const f of files) { const d = path.join(out, f); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(f, d); }
console.log(`複製 ${files.length} 個改到的檔到暫存資料夾，交給 oss-scan 掃（放行清單 ${list.items.length} 筆、行內標記登記 ${list.inline.length} 筆）`);
const tmpA = out + ".allow.json", tmpJ = out + ".scan.json";
fs.writeFileSync(tmpA, JSON.stringify(list.items));
const r = spawnSync(process.execPath, [scanner, out, "--allow", tmpA, "--json", tmpJ], { stdio: "inherit" });
let findings = null; try { findings = JSON.parse(fs.readFileSync(tmpJ, "utf8")).findings } catch (e) { }
fs.rmSync(out, { recursive: true, force: true }); fs.rmSync(tmpA, { force: true }); fs.rmSync(tmpJ, { force: true });
if (r.status === null || findings === null) { console.log("✘ oss-scan 沒有跑完或沒有寫出結果：不能當沒問題"); process.exit(1) }

const bufs = files.map((f) => ({ file: f, buf: fs.readFileSync(f) }));
const images = bufs.map(({ file, buf }) => imageCheck(file, buf)).filter(Boolean);
const marked = bufs.map(({ file, buf }) => ({ file, marks: markerLines(buf.toString("utf8")) })).filter((x) => x.marks.length);
const J = judge({ findings, images, unreg: unregistered(marked, list.inline) });

console.log(`\n圖片中繼資料：看了 ${images.length} 張新增或修改的圖（用檔頭判斷格式）`);
for (const x of J.unreadable) console.log(`  ✘ ${x.file}：${x.fmt ? x.fmt.toUpperCase() + " 格式讀不懂" : "副檔名是圖片、內容卻不是看得懂的圖"} → 轉成 webp 或 png 再放進倉庫（讀不懂就沒辦法確認沒有個資）`);
for (const x of J.meta) console.log(`  ✘ ${x.file}：有${x.meta.kinds.map((k) => KIND_ZH[k] || k).join("、")}的中繼資料 → 先去掉再放進倉庫（例如 exiftool -all= 檔名，或重新匯出不含中繼資料）`);
const nMarks = marked.reduce((n, x) => n + x.marks.length, 0);
if (nMarks) {
  console.log(`\n改到的檔裡有 ${nMarks} 行用了 ${TOK}（那一行整個不掃），要在 ${allowF} 的 inline 登記：`);
  for (const x of marked) for (const m of x.marks) { const reg = !J.unreg.some((u) => u.file === x.file && u.sha256 === m.sha256);
    console.log(`  ${reg ? "△" : "✘"} ${x.file}:${m.line}  ${m.text}${reg ? "（已登記）" : `\n      ← 沒登記：在 inline 加 {"file":"${x.file}","sha256":"${m.sha256}","reason":"為什麼可以不掃"}`}`) }
}
if (J.medium.length) {
  console.log(`\n✘ 改到的檔有 ${J.medium.length} 筆中風險沒被放行（上面「中風險」那一段）。`);
  console.log(`  確定是 App 本來就公開、或是誤判的，寫進 ${allowF} 的 items（rule＋file 或 match＋理由；改 .github/ 要逐行審）；其他的拿掉。`);
}
const fail = r.status !== 0 || !J.ok;
console.log(fail ? "\n✘ 私密掃描補強沒過" : "\n✔ 改到的檔沒有高、中風險，圖片沒有個資中繼資料，行內標記都有登記");
process.exit(fail ? 1 : 0);
