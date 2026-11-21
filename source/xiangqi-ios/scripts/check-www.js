#!/usr/bin/env node
/* 檢查 www/（和 cap sync 後的 ios/App/App/public/）是不是完整、能離線用：
   1. index.html 有插 capacitor.js、native-bridge.js，而且在 App 自己的程式之前
   2. data/preload.json 列的每個檔（開 App 要先有的圖、音效）都在
   3. data/big-books.json 的比賽對局、引擎三個檔、背景音樂清單裡的 mp3 都在
   4. 檔案大小跟 copy-www.js 記的一樣（scripts/.www-files.json）
   5. 程式檔沒有控制字元
   用法：node scripts/check-www.js [--public]   （--public 改檢查 ios/App/App/public） */
"use strict";
const fs = require("fs"), path = require("path");
const HERE = path.join(__dirname, "..");
const ROOT = process.argv.includes("--public") ? path.join(HERE, "ios", "App", "App", "public") : path.join(HERE, "www");
const bad = [], warn = [];
const rd = rel => fs.readFileSync(path.join(ROOT, ...rel.split("/")));
const exists = rel => fs.existsSync(path.join(ROOT, ...rel.split("/")));
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
  for (const it of [...(P.items || []), ...(P.big || [])]) { n++; if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]); else if (it[1] && size(it[0]) !== it[1]) warn.push("大小跟 preload.json 不同：" + it[0]); }
} catch (e) { bad.push("讀不到 data/preload.json：" + e.message); }
try { for (const g of JSON.parse(rd("data/big-books.json"))) { n++; if (!exists("data/" + g.key + ".json")) warn.push("沒包比賽對局 data/" + g.key + ".json（App 要用時會去 CDN 抓；如果是 --exclude 故意拿掉的就沒關係）"); } } catch (e) { bad.push("讀不到 data/big-books.json"); }
for (const f of ["engine/pikafish.js", "engine/pikafish.wasm", "engine/pikafish.nnue"]) { n++; if (!exists(f)) bad.push("缺引擎 " + f); }
try {
  /* 格式：{ 朝代: ["zheng_1.mp3", …] } → data/bgm/<朝代>/<檔名> */
  const B = JSON.parse(rd("data/bgm/index.json"));
  for (const [era, list] of Object.entries(B)) for (const f of (Array.isArray(list) ? list : [])) {
    if (typeof f !== "string") continue; n++;
    const r = "data/bgm/" + era + "/" + f;
    if (!exists(r)) bad.push("背景音樂清單有但沒有檔：" + r);
  }
} catch (e) { warn.push("讀不到 data/bgm/index.json"); }
if (exists("data/banlist.json")) warn.push("data/banlist.json 不該包進去（要即時上網抓）");
if (exists("data/tripo_anim")) warn.push("data/tripo_anim 不該包進去");

/* 4 */
const LIST = path.join(__dirname, ".www-files.json");
let total = 0, files = 0;
if (fs.existsSync(LIST)) {
  const L = JSON.parse(fs.readFileSync(LIST, "utf8")).files;
  for (const [rel, [sz]] of Object.entries(L)) { files++; total += sz; if (!exists(rel)) bad.push("少了 " + rel); else if (size(rel) !== sz) bad.push("大小不對 " + rel); }
} else warn.push("沒有 scripts/.www-files.json（先跑 node scripts/copy-www.js）");

/* 5 */
for (const f of ["index.html", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js"]) {
  if (!exists(f)) continue;
  const s = rd(f).toString("utf8"), m = s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
  if (m) bad.push(f + " 有控制字元 U+" + m[0].charCodeAt(0).toString(16));
}

console.log(`檢查 ${ROOT}：清單 ${files} 個檔、${(total / 1048576).toFixed(1)} MB；核對了 ${n} 個 App 會要的檔`);
if (warn.length) console.log("⚠ " + warn.slice(0, 30).join("\n⚠ ") + (warn.length > 30 ? `\n⚠ …共 ${warn.length} 項` : ""));
if (bad.length) { console.error("✘ " + bad.slice(0, 40).join("\n✘ ") + (bad.length > 40 ? `\n✘ …共 ${bad.length} 項` : "")); process.exit(1); }
console.log("✔ 沒問題");
