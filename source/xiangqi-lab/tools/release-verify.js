// 第 13 輪 F2：發布後的成品核對（任何人都能跑；跟 verify-release.js 不同——那支是發布「前」的檢查，要原始模組）
// 拿網站上的 index.html、sw.js、release.json：
//   1. release.json 讀得懂，有 version、html、sw
//   2. index.html、sw.js 各算 SHA-1 取前 12 碼，要等於 release.json 的 html、sw
//   3. 版本號：index.html 的 XQ_BUILD、sw.js 的 VERSION、release.json 的 version 三個一樣
// 用法：
//   node xiangqi-lab/tools/release-verify.js --url https://raysonchen2023-cloud.github.io/xiangqi-lab/   從網站下載（要連網；剛發布的 10 分鐘內 GitHub Pages 快取可能還是舊的）
//   node xiangqi-lab/tools/release-verify.js --dir <資料夾>                                              核對自己下載好的三個檔
//   node xiangqi-lab/tools/release-verify.js --git xiangqi-lab/site --ref origin/main                   核對公開倉庫某個版本（不動工作區）
//   加 --json 印 JSON
// 全部一致代碼 0；有不一致代碼 1；讀不到檔或用法錯誤代碼 2
// 不手動下載也可以：curl -s <網址>/index.html | sha1sum | cut -c1-12，跟 release.json 的 "html" 比。
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), cp = require("child_process");
const sha1_12 = b => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
const NAMES = ["index.html", "sw.js", "release.json"];

const verOfHtml = s => (s.match(/XQ_BUILD\s*=\s*["'](\d{8}-\d{4})/) || [])[1] || null;
const verOfSw = s => (s.match(/VERSION\s*=\s*["'](\d{8}-\d{4})/) || [])[1] || null;

/* 核對三個檔（Buffer）：回傳 { ok, checks:[{id, ok, msg}], facts } */
function check(files) {
  const C = [], add = (id, ok, msg) => C.push({ id, ok: !!ok, msg });
  const miss = NAMES.filter(n => !files[n]);
  if (miss.length) { add("files", false, "讀不到：" + miss.join("、")); return { ok: false, checks: C, facts: {} } }
  let R = null;
  try { R = JSON.parse(files["release.json"].toString("utf8")) } catch (e) { add("release.json", false, "release.json 不是合法的 JSON：" + e.message) }
  if (R) add("release.json", typeof R.version === "string" && /^[0-9a-f]{12}$/.test(R.html || "") && /^[0-9a-f]{12}$/.test(R.sw || ""),
    `release.json：版本 ${R.version || "?"}、html ${R.html || "?"}、sw ${R.sw || "?"}` + (R.checkedAt ? `（檢查時間 ${R.checkedAt}）` : ""));
  const facts = { html: sha1_12(files["index.html"]), sw: sha1_12(files["sw.js"]) };
  if (R) {
    add("hash.html", facts.html === R.html, `index.html SHA-1 前 12 碼 ${facts.html}` + (facts.html === R.html ? "，跟 release.json 一致" : `，release.json 寫 ${R.html}：不一致`));
    add("hash.sw", facts.sw === R.sw, `sw.js SHA-1 前 12 碼 ${facts.sw}` + (facts.sw === R.sw ? "，跟 release.json 一致" : `，release.json 寫 ${R.sw}：不一致`));
  }
  const vh = facts.vHtml = verOfHtml(files["index.html"].toString("utf8")), vs = facts.vSw = verOfSw(files["sw.js"].toString("utf8"));
  const vr = R && R.version;
  add("version", vh && vh === vs && vh === vr, `版本號：index.html ${vh || "找不到"}、sw.js ${vs || "找不到"}、release.json ${vr || "找不到"}` + (vh && vh === vs && vh === vr ? "，三個一樣" : "，不一樣"));
  if (R && Array.isArray(R.differsFromSource) && R.differsFromSource.length)
    C.push({ id: "note", ok: true, msg: `release.json 自己註明有 ${R.differsFromSource.length} 支模組跟當時的原始碼不同（${R.differsFromSource.map(d => d.module).join("、")}）；原始模組不公開，外部核對不了這一欄` });
  return { ok: C.every(c => c.ok), checks: C, facts };
}

function fromDir(d) { const o = {}; for (const n of NAMES) { try { o[n] = fs.readFileSync(path.join(d, n)) } catch (e) { o[n] = null } } return o }
function fromGit(repo, ref) { const o = {}; for (const n of NAMES) { try { o[n] = cp.execFileSync("git", ["-C", repo, "show", ref + ":" + n], { maxBuffer: 100e6, stdio: ["ignore", "pipe", "ignore"] }) } catch (e) { o[n] = null } } return o }
async function fromUrl(base) {
  if (!/^https?:\/\//.test(base)) throw new Error("網址要 http:// 或 https:// 開頭");
  const b = base.endsWith("/") ? base : base + "/", o = {};
  for (const n of NAMES) {
    const r = await fetch(b + n + "?verify=" + Date.now(), { cache: "no-store" });
    o[n] = r.ok ? Buffer.from(await r.arrayBuffer()) : null;
  }
  return o;
}

module.exports = { check, fromDir, fromGit, fromUrl, sha1_12, verOfHtml, verOfSw };

if (require.main === module) (async () => {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  const url = opt("--url"), dir = opt("--dir"), repo = opt("--git"), ref = opt("--ref") || "origin/main";
  if (!url && !dir && !repo) { console.log("用法：node release-verify.js --url <網站> | --dir <資料夾> | --git <倉庫> [--ref origin/main] [--json]"); process.exit(2) }
  let files, src;
  try { files = url ? await fromUrl(url) : dir ? fromDir(dir) : fromGit(repo, ref); src = url || dir || `${repo}（git ${ref}）` }
  catch (e) { console.log("讀取失敗：" + e.message); process.exit(2) }
  const r = check(files);
  if (a.includes("--json")) console.log(JSON.stringify({ source: src, ...r }, null, 1));
  else { console.log("成品核對：" + src); for (const c of r.checks) console.log(`  ${c.ok ? "✔" : "✘"} ${c.msg}`); console.log(r.ok ? "\n✔ index.html、sw.js 跟 release.json 一致" : "\n✘ 有不一致（剛發布的話，等快取過期再試）") }
  process.exit(r.checks.some(c => c.id === "files" && !c.ok) ? 2 : r.ok ? 0 : 1);
})();
