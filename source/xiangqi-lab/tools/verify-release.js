// 發布前檢查（v5 改善單 R02「同版建置、版本可追溯」；R01 教訓：20261111-1700 把真的 NUL 字元發上線，整個 App 打不開）
// 用法：node xiangqi-lab/tools/verify-release.js <index.html> <sw.js> [--manifest 輸出.json]
//   1. 控制字元：HTML、sw.js 裡不能有（瀏覽器會把 script 裡的 NUL 換成 U+FFFD，node --check 抓不到）
//   2. 版本：HTML 的 XQ_BUILD 跟 sw.js 的版本要同一個
//   3. 語法：HTML 裡每一段內嵌 <script> 都過 node --check
//   4. 跟原始碼一致：xiangqi-db/m/*.js（m.html 的 include 清單）逐支比對是否原封不動在 HTML 裡（換行統一成 LF 再比），
//      列出不一樣的模組：代表原始碼有還沒發布的修改，或線上被直接修過
//   5. --manifest：寫出版本清單（版本、時間、HTML／sw 雜湊、每支模組雜湊、跟原始碼不一樣的模組），跟著發布，任何人都能核對
// 有 1～3 的錯誤就以代碼 1 結束（不准發）；4 只報告
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto"), cp = require("child_process");
const { parts } = require("../../xiangqi-db/tools/mhtml.js");
const DB = path.join(__dirname, "..", "..", "xiangqi-db");
const argv = process.argv.slice(2), mi = argv.indexOf("--manifest"), OUT = mi >= 0 ? argv[mi + 1] : null;
const [HTML_F, SW_F] = argv.filter((a, i) => !a.startsWith("--") && (mi < 0 || i !== mi + 1));
if (!HTML_F || !SW_F) { console.log("用法：node verify-release.js <index.html> <sw.js> [--manifest 輸出.json]"); process.exit(2) }
const html = fs.readFileSync(HTML_F, "utf8"), sw = fs.readFileSync(SW_F, "utf8");
const LF = s => s.split(String.fromCharCode(13, 10)).join(String.fromCharCode(10));
const sha = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 12);
const errs = [], notes = [];

// 1. 控制字元（定位、換行、歸位以外的 0x00～0x1F 和 0x7F）
const CTL = new RegExp("[" + String.fromCharCode(0) + "-" + String.fromCharCode(8) + String.fromCharCode(11, 12) + String.fromCharCode(14) + "-" + String.fromCharCode(31, 127) + "]", "g");
for (const [nm, s] of [["index.html", html], ["sw.js", sw]]) {
  let m, n = 0; CTL.lastIndex = 0;
  while ((m = CTL.exec(s))) { if (n++ < 3) errs.push(`${nm} 第 ${m.index} 字有控制字元 0x${s.charCodeAt(m.index).toString(16)}：…${JSON.stringify(s.slice(Math.max(0, m.index - 30), m.index + 10))}…`) }
  if (n > 3) errs.push(`${nm} 還有 ${n - 3} 個控制字元`);
}

// 2. 版本
const vH = (html.match(/XQ_BUILD\s*=\s*["'](\d{8}-\d{4})/) || html.match(/(20\d{6}-\d{4})/) || [])[1], vS = (sw.match(/(20\d{6}-\d{4})/) || [])[1];
if (!vH || !vS) errs.push(`找不到版本號（HTML ${vH || "?"}，sw.js ${vS || "?"}）`); else if (vH !== vS) errs.push(`版本不一致：HTML ${vH}，sw.js ${vS}`);

// 3. 內嵌 script 語法
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xqverify-"));
let k = 0, nScript = 0;
for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
  const attr = m[1], body = m[2];
  if (/\bsrc\s*=/.test(attr) || !body.trim() || /type\s*=\s*["']?(application\/(ld\+)?json|text\/(template|plain))/i.test(attr)) continue;
  const f = path.join(tmp, `s${k++}${/type\s*=\s*["']?module/i.test(attr) ? ".mjs" : ".js"}`); fs.writeFileSync(f, body); nScript++;
  try { cp.execFileSync(process.execPath, ["--check", f], { stdio: "pipe" }) }
  catch (e) { errs.push(`第 ${k} 段 <script> 語法錯誤：${String(e.stderr || e.message).split(String.fromCharCode(10)).filter(Boolean).slice(0, 4).join(" ｜ ").slice(0, 400)}`) }
}
try { cp.execFileSync(process.execPath, ["--check", path.resolve(SW_F)], { stdio: "pipe" }) } catch (e) { errs.push("sw.js 語法錯誤：" + String(e.stderr || e.message).slice(0, 300)) }
fs.rmSync(tmp, { recursive: true, force: true });

// 4. 跟原始碼一致
const H = LF(html), mods = {}, diff = [];
for (const f of parts()) {
  const src = LF(fs.readFileSync(path.join(DB, f), "utf8")).replace(/\n$/, ""), name = path.basename(f);
  mods[name] = sha(src);
  if (!H.includes(src)) {
    const lines = src.split("\n").filter(l => l.trim()), miss = lines.filter(l => !H.includes(l)).length;
    diff.push({ module: name, lines: miss, sourceModified: fs.statSync(path.join(DB, f)).mtime.toISOString() });
  }
}

const man = { version: vH || null, checkedAt: new Date().toISOString(), html: sha(html), sw: sha(sw), scripts: nScript, modules: mods, differsFromSource: diff };
console.log(`版本 ${vH}（sw.js ${vS}）・HTML ${man.html}・內嵌 script ${nScript} 段・模組 ${Object.keys(mods).length} 支`);
if (diff.length) { console.log(`跟目前原始碼不一樣的模組 ${diff.length} 支（原始碼有還沒發布的修改，或線上被直接修過）：`); for (const d of diff) console.log(`  ${d.module}：${d.lines} 行不同（原始碼改於 ${d.sourceModified}）`) }
else console.log("每支模組都跟目前原始碼一致");
if (OUT) { fs.writeFileSync(OUT, JSON.stringify(man, null, 1)); console.log("版本清單寫到 " + OUT) }
if (errs.length) { console.log(`\n✘ 不准發布（${errs.length} 個問題）：`); for (const e of errs) console.log("  " + e); process.exit(1) }
console.log("✔ 控制字元、版本、語法都通過");
