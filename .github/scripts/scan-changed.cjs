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
// PR #68 第二輪審查：
//   ② 掃的是 git 裡存的內容（git cat-file），不讀工作區：.gitattributes 的 working-tree-encoding、filter 會讓工作區跟倉庫不同；
//      這個 PR 改到的 .gitattributes 裡有 working-tree-encoding 或 filter= 就擋（oss-scan source 讀的是工作區，靠這一條補）。
//   ④ 圖裡解出來的文字（PNG 文字區、XMP、JPEG／GIF 註解）另外寫成 <檔>.meta.txt 交給 oss-scan 的規則掃。
//   ⑤ 放行清單的 file 要寫完整路徑；個資規則（信箱、電話、身分證號）一定要用 sha256 指定是哪一串字。
// PR #68 第三輪審查：
//   ② 找行內標記用 oss-scan 的 textsOf 解出來的每一種文字、同一個判斷（MARK），所以 oss-scan:\x01allow（控制字元換成空白後也算標記）也要登記
//   ④ oss-scan 加 --all：暫存資料夾裡 node_modules 底下的檔也掃（都是要公開的檔）
//   ⑤ 圖裡解出來的文字寫成不會跟倉庫裡的檔撞名的檔（撞到就加編號）
//   ⑥ 符號連結也掃：從 git 拿它存的內容（指向的路徑字串），不再用工作區的 isFile 把它濾掉
// PR #68 第四輪審查（開發者 11/23 選「圖片全文掃、誤報用整張圖 sha256 放行」）：
//   ② 圖裡解出來的文字（.meta 檔）裡有行內標記就擋：圖裡的文字不准用標記（壓縮的 zTXt／iTXt、分段的 GIF 註解原本都能藏）
//   ③④ 圖片跟一般檔一樣全文掃；壓縮資料偶然湊出的中風險，放行清單寫 file（圖片的完整路徑）＋fileSha256（整張圖的雜湊）
//   .github/oss-allow.json 是資料、不在 base-guard 的 GUARD 清單裡（跟 test-skip-allow.json 一樣）：改它要逐行審，換回 main 版守門時用的是 PR 這一份
// 已知限制：base64 等編碼過的機密 oss-scan 本來就認不出來；機密的字中間插控制字元（例如 \x01）或零寬字元也認不出來。
// 結束代碼：0＝沒問題；1＝有要擋的；2＝用法錯誤或放行清單格式錯
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const { imageMeta, sniff, KIND_ZH } = require("./image-meta.cjs");

/* 行內放行標記的字樣：用拼的，這支自己的說明與訊息不會被當成放行、也照常被掃 */
const TOK = "oss-scan" + ":allow";
const MARK = /oss-scan:\s*allow/;   /* 跟 oss-scan.js 判斷「這一行不掃」用的一樣（實際執行時用 oss-scan 匯出的 MARK） */

/* 放行清單要齊全才收（PR #68 審查⑥）：
   items：rule 要是 oss-scan 認得的中、低風險規則（高風險不准放行）；file（完整路徑）、match（至少 6 個字）、sha256 至少一個；
     個資規則（email、phone-tw、tw-id）一定要有 sha256（掃到的那一串字的 SHA-256，清單裡不寫個資本身）；理由至少 4 個字
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
    if (!String(a.file || "").trim() && !String(a.match || "").trim() && !a.sha256 && !a.fileSha256) bad.push(at + "沒有 file、match、sha256、fileSha256：不准整條規則全部放行");
    if (a.fileSha256 != null && (!/^[0-9a-f]{64}$/.test(String(a.fileSha256)) || !IMG_EXT.test(String(a.file || "")))) bad.push(at + "的 fileSha256 要是 64 碼小寫，而且 file 要寫圖片的完整路徑（整張圖雜湊放行只給圖片用）");
    if (PERSONAL.includes(a.rule) && !/^[0-9a-f]{64}$/.test(String(a.sha256 || "")) && !(a.fileSha256 && a.file)) bad.push(at + "是個資規則（" + a.rule + "）：要用 sha256 指定是哪一筆（圖片可用 file＋fileSha256）");
    if (a.sha256 != null && !/^[0-9a-f]{64}$/.test(String(a.sha256))) bad.push(at + "的 sha256 要是 64 碼小寫");
    if (a.match != null && String(a.match).length < 6) bad.push(at + "的 match 太短（至少 6 個字）");
    if (a.file != null && (String(a.file).length < 3 || /^\/|[*?]|\\/.test(a.file))) bad.push(at + "的 file 要寫倉庫裡的完整路徑（不加開頭的 /、不用萬用字元）");
    if (String(a.reason || "").trim().length < 4) bad.push(at + "沒寫理由（reason 至少 4 個字）");
  });
  inline.forEach((a, i) => {
    const at = `inline 第 ${i + 1} 筆`;
    if (!a || !String(a.file || "").trim()) bad.push(at + "沒寫 file");
    else if (/^\/|[*?]|\\/.test(a.file)) bad.push(at + "的 file 要寫倉庫裡的完整路徑");
    if (!/^[0-9a-f]{64}$/.test(String(a && a.sha256))) bad.push(at + "的 sha256 要是 64 碼小寫");
    if (String((a && a.reason) || "").trim().length < 4) bad.push(at + "沒寫理由（reason 至少 4 個字）");
  });
  return bad;
}
const PERSONAL = ["email", "phone-tw", "tw-id"];
/* .gitattributes 裡會讓工作區跟倉庫內容不同的設定（純函式）：回傳有問題的行 */
function badAttrs(text) { return String(text).split("\n").map((l, i) => ({ line: i + 1, text: l.trim() })).filter((x) => !/^#/.test(x.text) && /\bworking-tree-encoding\b|\bfilter\s*=/.test(x.text)) }
/* 一個檔裡有行內放行標記的行：[{line, sha256, text}]。照 oss-scan 的切法（只認 \n），雜湊前去掉行尾 \r 和前後空白。
   text 可以是字串，或字串陣列（oss-scan 的 textsOf 解出來的每一種文字；同一行同雜湊只算一次） */
const lineSha = (s) => crypto.createHash("sha256").update(String(s).replace(/\r$/, "").trim(), "utf8").digest("hex");
function markerLines(text, mark = MARK) {
  const out = [], seen = new Set();
  for (const t of [].concat(text)) String(t).split("\n").forEach((l, i) => {
    if (!mark.test(l)) return; const h = lineSha(l), k = i + "\n" + h; if (seen.has(k)) return; seen.add(k);
    const full = l.replace(/\r$/, "").trim(); out.push({ line: i + 1, sha256: h, text: full.slice(0, 160), full });   /* full：沒登記時印全文（只用 \r 換行的檔整個是一行，只印前段會看不到後面藏的東西） */
  });
  return out;
}
/* 暫存資料夾裡不跟別的檔撞名的名字（純函式）：taken 是已經用掉的相對路徑集合 */
function freeName(file, taken) { let n = file + ".meta.txt", i = 1; while (taken.has(n)) n = file + ".meta-" + (i++) + ".txt"; taken.add(n); return n }
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
function judge({ findings, images, unreg, attrs = [], metaMarks = [] }) {
  const medium = (findings || []).filter((f) => f.risk === "medium" && !f.allowed);
  const meta = (images || []).filter((x) => x.meta && x.meta.kinds.length);
  const unreadable = (images || []).filter((x) => !x.meta);
  return { medium, meta, unreadable, unreg: unreg || [], attrs, metaMarks, ok: !medium.length && !meta.length && !unreadable.length && !(unreg || []).length && !attrs.length && !metaMarks.length };
}

module.exports = { checkAllow, markerLines, unregistered, imageCheck, judge, lineSha, badAttrs, freeName, TOK, PERSONAL };
if (require.main !== module) return;

const [base = "origin/main", out] = process.argv.slice(2);
if (!out) { console.log("用法：node scan-changed.cjs <比較基準> <暫存資料夾>"); process.exit(2); }
const scanner = path.resolve(process.env.OSS_SCAN || "source/xiangqi-lab/tools/oss-scan.js");
const allowF = process.env.OSS_ALLOW || path.join(".github", "oss-allow.json");
let list = { items: [], inline: [] }, S = null;
try { S = require(scanner) } catch (e) { console.log("✘ 載入不了 oss-scan：" + scanner); process.exit(2) }
if (fs.existsSync(allowF)) {
  try { list = JSON.parse(fs.readFileSync(allowF, "utf8")); list.inline = list.inline || [] } catch (e) { console.log("✘ 放行清單讀不懂：" + allowF); process.exit(2) }
  const risks = {}; for (const r of S.RULES.concat(S.NAME_RULES)) risks[r.id] = r.risk;
  const bad = checkAllow(list, risks);
  if (bad.length) { console.log("✘ 放行清單 " + allowF + " 格式不對：\n  " + bad.join("\n  ")); process.exit(2) }
}
const git = (args) => execFileSync("git", ["-c", "core.quotePath=false", ...args], { maxBuffer: 200e6 }).toString();
/* A＝新增、M＝修改、T＝型別改變（例如符號連結換成一般檔；PR #68 審查④）。
   只看 HEAD 裡是 blob 的（一般檔、執行檔、符號連結；子模組是 commit、跳過），不看工作區（第三輪審查⑥：符號連結原本被 isFile 濾掉） */
const kind = new Map(git(["ls-tree", "-r", "-z", "HEAD"]).split("\0").filter(Boolean).map((l) => { const t = l.indexOf("\t"); return [l.slice(t + 1), l.slice(0, t).split(" ")[1]] }));
const files = git(["diff", "--name-only", "-z", "--no-renames", "--diff-filter=AMT", `${base}...HEAD`])
  .split("\0").filter((f) => f && kind.get(f) === "blob");
if (!files.length) { console.log("本 PR 沒有新增或修改的檔，略過"); process.exit(0); }
/* 讀 git 裡存的內容（PR #68 第二輪審查②）；圖片另外把解出來的文字寫成 <檔>.meta.txt 給 oss-scan 掃（審查④） */
const blob = (f) => execFileSync("git", ["cat-file", "blob", "HEAD:" + f], { maxBuffer: 500e6 });
const bufs = files.map((f) => ({ file: f, buf: blob(f) }));
const images = bufs.map(({ file, buf }) => imageCheck(file, buf)).filter(Boolean);
fs.rmSync(out, { recursive: true, force: true });
for (const { file, buf } of bufs) { const d = path.join(out, file); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.writeFileSync(d, buf) }
const taken = new Set(files.flatMap((f) => f.split("/").map((_, i, a) => a.slice(0, i + 1).join("/"))));   /* 檔和它上層的資料夾名都算用掉 */
const metaMarks = [];
for (const x of images) if (x.meta && x.meta.texts && x.meta.texts.length) {
  const t = Buffer.from(x.meta.texts.join("\n"), "utf8");
  fs.writeFileSync(path.join(out, freeName(x.file, taken)), t);
  for (const m of markerLines(S.textsOf(t), S.MARK)) metaMarks.push({ file: x.file, ...m });   /* 第四輪審查②：圖裡的文字不准用行內標記 */
}
console.log(`複製 ${files.length} 個改到的檔到暫存資料夾，交給 oss-scan 掃（放行清單 ${list.items.length} 筆、行內標記登記 ${list.inline.length} 筆）`);
const tmpA = out + ".allow.json", tmpJ = out + ".scan.json";
fs.writeFileSync(tmpA, JSON.stringify(list.items));
const r = spawnSync(process.execPath, [scanner, out, "--all", "--allow", tmpA, "--json", tmpJ], { stdio: "inherit" });
let findings = null; try { findings = JSON.parse(fs.readFileSync(tmpJ, "utf8")).findings } catch (e) { }
fs.rmSync(out, { recursive: true, force: true }); fs.rmSync(tmpA, { force: true }); fs.rmSync(tmpJ, { force: true });
if (r.status === null || findings === null) { console.log("✘ oss-scan 沒有跑完或沒有寫出結果：不能當沒問題"); process.exit(1) }

const marked = bufs.map(({ file, buf }) => ({ file, marks: markerLines(S.textsOf(buf), S.MARK) })).filter((x) => x.marks.length);
const attrs = bufs.filter(({ file }) => path.basename(file) === ".gitattributes").flatMap(({ file, buf }) => badAttrs(buf.toString("utf8")).map((x) => ({ file, ...x })));
const J = judge({ findings, images, unreg: unregistered(marked, list.inline), attrs, metaMarks });
for (const m of J.metaMarks) console.log(`  ✘ ${m.file}：圖裡的文字（中繼資料、註解）有 ${TOK}：「${m.text}」← 圖裡的文字不准用行內標記，請重新匯出不含這段文字的圖`);
for (const a of J.attrs) console.log(`  ✘ ${a.file}:${a.line}  ${a.text}  ← working-tree-encoding／filter 會讓工作區跟倉庫的內容不同，私密掃描會被繞過：不准用`);

console.log(`\n圖片中繼資料：看了 ${images.length} 張新增或修改的圖（用檔頭判斷格式）`);
for (const x of J.unreadable) console.log(`  ✘ ${x.file}：${x.fmt ? x.fmt.toUpperCase() + " 格式讀不懂" : "副檔名是圖片、內容卻不是看得懂的圖"} → 轉成 webp 或 png 再放進倉庫（讀不懂就沒辦法確認沒有個資）`);
for (const x of J.meta) console.log(`  ✘ ${x.file}：有${x.meta.kinds.map((k) => KIND_ZH[k] || k).join("、")}的中繼資料 → 先去掉再放進倉庫（例如 exiftool -all= 檔名，或重新匯出不含中繼資料）`);
const nMarks = marked.reduce((n, x) => n + x.marks.length, 0);
if (nMarks) {
  console.log(`\n改到的檔裡有 ${nMarks} 行用了 ${TOK}（那一行整個不掃），要在 ${allowF} 的 inline 登記：`);
  for (const x of marked) for (const m of x.marks) { const reg = !J.unreg.some((u) => u.file === x.file && u.sha256 === m.sha256);
    console.log(`  ${reg ? "△" : "✘"} ${x.file}:${m.line}  ${m.text}${reg ? "（已登記）" : `\n      ← 這一行全文（${m.full.length} 字）：${JSON.stringify(m.full)}\n      ← 沒登記：在 inline 加 {"file":"${x.file}","sha256":"${m.sha256}","reason":"為什麼可以不掃"}`}`) }
}
if (J.medium.length) {
  console.log(`\n✘ 改到的檔有 ${J.medium.length} 筆中風險沒被放行（上面「中風險」那一段）。`);
  console.log(`  確定是 App 本來就公開、或是誤判的，寫進 ${allowF} 的 items（rule＋file 或 match＋理由；改 .github/ 要逐行審）；其他的拿掉。`);
}
const fail = r.status !== 0 || !J.ok;
console.log(fail ? "\n✘ 私密掃描補強沒過" : "\n✔ 改到的檔沒有高、中風險，圖片沒有個資中繼資料，行內標記都有登記");
process.exit(fail ? 1 : 0);
