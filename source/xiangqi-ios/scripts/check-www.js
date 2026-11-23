#!/usr/bin/env node
/* 檢查 www/（和 cap sync 後的 ios/App/App/public/）是不是完整、能離線用：
   1. index.html 有插 capacitor.js、native-bridge.js，而且在 App 自己的程式之前
   2. data/preload.json 列的每個檔（開 App 要先有的圖、音效）都在
   3. data/big-books.json 的比賽對局、引擎三個檔、背景音樂清單裡的 mp3 都在
   4. 檔案大小跟 copy-www.js 記的一樣（scripts/.www-files.json）；清單有記 sha1 的檔，內容也要一樣（W69：大小一樣、內容被換掉的也要抓到）
   5. 程式檔沒有控制字元
   6. 加 --cdn：包裡 data/ 的檔跟 CDN 現行版（cdn-manifest.json）逐檔比 sha1（W42：建包時留下舊副本，清單也照舊副本產生，第 4 項比不出來）。
      App 會要的檔（preload、背景音樂）不同就擋；其他的只列出來（多半是 CDN 在建包後更新過）
   用法：node scripts/check-www.js [--public] [--dir <要檢查的資料夾>] [--list <清單檔>] [--cdn | --cdn-manifest <網址或檔>] [--all]
     --public 改檢查 ios/App/App/public；--dir 指定別的資料夾（金絲雀 canary-www.js 用它檢查壞樣本）；--list 指定清單（預設 scripts/.www-files.json）；
     --cdn 讀 https://xiangqi-cdn.pages.dev/cdn-manifest.json；--cdn-manifest 指定別的網址或本機檔（自我測試用）；--all 錯誤全部印出（預設只印前 40 項）
   結束代碼：0 沒問題；1 有問題（找不到資料夾、參數後面沒接值也算）；3 沒有問題、但讀不到檔案清單，或加了 --cdn 卻讀不到 CDN 清單（缺驗，不能當沒問題）
   --all 只影響印多少，不影響判定（PR #67 第五次審查：金絲雀和正式用法的判定要一樣） */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), { execFileSync } = require("child_process");
const HERE = path.join(__dirname, "..");
/* PR #67 第九次審查：認 --dir=X 這種寫法；不認得的旗標（打錯字，例如 --cnd）直接報錯，不悄悄退回預設 */
const KNOWN = ["--public", "--dir", "--list", "--cdn", "--cdn-manifest", "--all"];
const argv = process.argv.slice(2).flatMap((a) => { const m = /^(--[a-z-]+)=(.*)$/s.exec(a); return m ? [m[1], m[2]] : [a] });
for (const a of argv) if (a.startsWith("--") && !KNOWN.includes(a)) { console.error("✘ 不認得的參數 " + a + "（可用：" + KNOWN.join(" ") + "）"); process.exit(1) }
const opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
/* PR #67 第五次審查：要接值的參數放最後、沒給值，不能悄悄退回預設 */
for (const k of ["--dir", "--list", "--cdn-manifest"]) { const i = argv.indexOf(k); if (i >= 0 && (i + 1 >= argv.length || argv[i + 1] === "" || String(argv[i + 1]).startsWith("--"))) { console.error("✘ " + k + " 後面要接值"); process.exit(1) } }
const ROOT = opt("--dir") ? path.resolve(opt("--dir")) : argv.includes("--public") ? path.join(HERE, "ios", "App", "App", "public") : path.join(HERE, "www");
const bad = [], warn = [], unverified = [], need = new Set();   /* need：App 會要的檔（preload、背景音樂），第 6 項用 */
const rd = rel => fs.readFileSync(path.join(ROOT, ...rel.split("/")));
/* PR #67 第九次審查：大小寫要完全一樣。macOS 預設不分大小寫，iPhone 分；用目錄列表比對確切檔名 */
const dirCache = new Map();
const listDir = (d) => { if (!dirCache.has(d)) { let s = null; try { s = new Set(fs.readdirSync(d)) } catch (e) { s = null } dirCache.set(d, s) } return dirCache.get(d) };
const exists = rel => { let d = ROOT; for (const seg of rel.split("/")) { const s = listDir(d); if (!s || !s.has(seg)) return false; d = path.join(d, seg) } return true };
const size = rel => fs.statSync(path.join(ROOT, ...rel.split("/"))).size;

if (!fs.existsSync(ROOT)) { console.error("✘ 找不到 " + ROOT); process.exit(1); }

/* 1 */
const html = rd("index.html").toString("utf8");
const iCap = html.indexOf('<script src="capacitor.js"></script>'), iBr = html.indexOf('<script src="native-bridge.js"></script>'), iCore = html.indexOf('<script src="core.js"></script>');
if (iCap < 0 || iBr < 0) bad.push("index.html 沒有插 capacitor.js／native-bridge.js");
else if (!(iCap < iBr && (iCore < 0 || iBr < iCore))) bad.push("index.html 裡 native-bridge.js 的位置不對（要在 capacitor.js 後、App 程式前）");
for (const f of ["capacitor.js", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js", "zh.js"]) if (!exists(f)) bad.push("缺 " + f);

/* 2、3 */
let n = 0;
try {
  const P = JSON.parse(rd("data/preload.json"));
  for (const it of [...(P.items || []), ...(P.big || [])]) { n++; need.add(it[0]); if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]); else if (it[1] && size(it[0]) !== it[1]) warn.push("大小跟 preload.json 不同：" + it[0]); }
} catch (e) { bad.push("讀不到 data/preload.json：" + e.message); }
try { for (const g of JSON.parse(rd("data/big-books.json"))) { n++; if (!exists("data/" + g.key + ".json")) warn.push("沒包比賽對局 data/" + g.key + ".json（App 要用時會去 CDN 抓；如果是 --exclude 故意拿掉的就沒關係）"); } } catch (e) { bad.push("讀不到 data/big-books.json"); }
for (const f of ["engine/pikafish.js", "engine/pikafish.wasm", "engine/pikafish.nnue"]) { n++; if (!exists(f)) bad.push("缺引擎 " + f); }
try {
  /* 格式：{ 朝代: ["zheng_1.mp3", …] } → data/bgm/<朝代>/<檔名> */
  const B = JSON.parse(rd("data/bgm/index.json"));
  for (const [era, list] of Object.entries(B)) for (const f of (Array.isArray(list) ? list : [])) {
    if (typeof f !== "string") continue; n++;
    const r = "data/bgm/" + era + "/" + f; need.add(r);
    if (!exists(r)) bad.push("背景音樂清單有但沒有檔：" + r);
  }
} catch (e) { warn.push("讀不到 data/bgm/index.json"); }
if (exists("data/banlist.json")) warn.push("data/banlist.json 不該包進去（要即時上網抓）");
if (exists("data/tripo_anim")) warn.push("data/tripo_anim 不該包進去");

/* 4 */
const LIST = opt("--list") ? path.resolve(opt("--list")) : path.join(__dirname, ".www-files.json");
let total = 0, files = 0;
let L = null;
try { L = JSON.parse(fs.readFileSync(LIST, "utf8")).files; if (!L || typeof L !== "object" || Array.isArray(L) || !Object.keys(L).length) throw new Error("沒有 files") }
catch (e) { L = null; unverified.push("讀不到檔案清單 " + LIST + "（" + String(e.message).split("\n")[0] + "）：大小和內容都沒驗到（先跑 node scripts/copy-www.js，或檢查 --list 路徑）") }   /* PR #67 第五次審查：路徑打錯不能只警告、回 0 */
if (L) {
  const noHash = [];
  for (const [rel, [sz, h]] of Object.entries(L)) {
    files++; total += sz;
    /* PR #67 第八次審查：清單沒記雜湊的檔只比得到大小（W30 切塊大檔大小對、內容壞就抓不到）；引擎、App 會要的檔、大於 20 MB 的檔沒記雜湊，算沒驗到 */
    if (!h && (rel.startsWith("engine/") || need.has(rel) || sz > 20 * 1048576)) noHash.push(rel);
    if (!exists(rel)) bad.push("少了 " + rel);
    else if (size(rel) !== sz) bad.push("大小不對 " + rel);
    else if (h && crypto.createHash("sha1").update(rd(rel)).digest("hex").slice(0, 12) !== h) bad.push("內容跟清單不同 " + rel);   /* W69：清單記了 sha1 前 12 碼的檔（大檔沒記）要比內容 */
  }
  if (noHash.length) unverified.push("清單沒記雜湊的重要檔 " + noHash.length + " 個（引擎、App 會要的、大於 20 MB；只比得到大小）：" + noHash.slice(0, 10).join("、") + (noHash.length > 10 ? "…" : ""));
}

/* 6（W42）：跟 CDN 現行版比 */
const OFFICIAL_CDN = "https://xiangqi-cdn.pages.dev/cdn-manifest.json";   /* 正式 CDN 只在這裡定義一次；canary-www.js 從這一行讀（PR #67 第六次審查） */
const CDNM = opt("--cdn-manifest") || (argv.includes("--cdn") ? OFFICIAL_CDN : null);
let cdnN = 0; const compared = new Set();
if (CDNM) {
  let man = null;
  try {
    const txt = /^https?:\/\//.test(CDNM)
      ? execFileSync(process.execPath, ["-e", "fetch(process.argv[1]).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}).then(t=>process.stdout.write(t)).catch(e=>{console.error(e.message);process.exit(1)})", CDNM], { encoding: "utf8", maxBuffer: 256e6, timeout: 120000, stdio: ["ignore", "pipe", "pipe"] })
      : fs.readFileSync(CDNM, "utf8");
    const m = JSON.parse(txt);   /* 驗過格式才拿來用：files 不是物件、是空的，都算沒驗到（PR #67 審查③） */
    if (!m || !m.files || typeof m.files !== "object" || Array.isArray(m.files)) throw new Error("沒有 files");
    if (!Object.keys(m.files).length) throw new Error("files 是空的");
    man = m;
  } catch (e) { unverified.push("讀不到 CDN 清單 " + CDNM + "（" + String(e.message).split("\n")[0] + "）：加了 --cdn 卻沒驗到 W42") }
  if (man) for (const [rel, v] of Object.entries(man.files)) {
    const h = Array.isArray(v) ? v[1] : null;
    if (!rel.startsWith("data/") || !h || !exists(rel)) continue;
    cdnN++; compared.add(rel);
    const mine = crypto.createHash("sha1").update(rd(rel)).digest("hex").slice(0, 12);
    if (mine === h) continue;
    if (need.has(rel)) bad.push("跟 CDN 現行版不同 " + rel + "（包 " + mine + "、CDN " + h + "；建包時留下的舊副本，W42）");
    else warn.push("清單外的檔跟 CDN 現行版不同 " + rel + "（多半是 CDN 在建包後更新過，列出來但不擋）");
  }
  if (man && !cdnN) unverified.push("CDN 清單裡沒有任何一個包裡有的 data/ 檔可以比：W42 等於沒驗");   /* PR #67 審查③ */
  /* PR #67 第三次審查：App 會要的檔（preload、背景音樂）只要有一個沒跟 CDN 比到（清單沒有這個檔、或沒記雜湊），就不能當成驗過 */
  const notCmp = man ? [...need].filter((rel) => exists(rel) && !compared.has(rel)).sort() : [];
  if (notCmp.length) unverified.push("App 會要的檔有 " + notCmp.length + " 個沒跟 CDN 比到（CDN 清單沒有、或沒記雜湊）：" + notCmp.slice(0, 10).join("、") + (notCmp.length > 10 ? "…" : ""));
}

/* 5 */
for (const f of ["index.html", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js"]) {
  if (!exists(f)) continue;
  const s = rd(f).toString("utf8"), m = s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
  if (m) bad.push(f + " 有控制字元 U+" + m[0].charCodeAt(0).toString(16));
}

console.log(`檢查 ${ROOT}：清單 ${files} 個檔、${(total / 1048576).toFixed(1)} MB；核對了 ${n} 個 App 會要的檔` + (CDNM ? `；跟 CDN 現行版比了 ${cdnN} 個檔` : "（沒比 CDN，加 --cdn 才比）"));
const ALL = argv.includes("--all");
if (warn.length) console.log("⚠ " + warn.slice(0, 30).join("\n⚠ ") + (warn.length > 30 ? `\n⚠ …共 ${warn.length} 項` : ""));
if (bad.length) { const B = ALL ? bad : bad.slice(0, 40); console.error("✘ " + B.join("\n✘ ") + (bad.length > B.length ? `\n✘ …共 ${bad.length} 項（加 --all 全部印出）` : "")); process.exit(1); }
if (unverified.length) { console.error("△ " + unverified.join("\n△ ")); process.exit(3); }
console.log("✔ 沒問題");
