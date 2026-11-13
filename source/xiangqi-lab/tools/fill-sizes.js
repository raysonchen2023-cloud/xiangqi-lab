#!/usr/bin/env node
/* 11/13 開發者截圖「沒看到檔案大小」：「關於」頁的整包大小（XQ_SIZES）原本由 build-site.js 5.10 節在建置時填入，
   但只換模組的發布方式（mkrel_sel）沒經過那一步，所以 1340 版以後線上一直是 null、關於頁不顯示。
   這支把同一套算法抽出來，對組好的 index.html 填入（算法跟 build-site.js 5.10 一樣，讀 site/ 與 site/data）。
   用法：node xiangqi-lab/tools/fill-sizes.js <組好的 index.html> [--site xiangqi-lab/site]
   index.html 裡要有 /*__SIZES__*／null 佔位（05-settings.js 的 const XQ_SIZES=）；已經填過就報錯，不重複填。 */
"use strict";
const fs = require("fs"), path = require("path");
function computeSizes(SITE) {
  const sz = p => { try { const st = fs.statSync(p); if (st.isFile()) return st.size; let s = 0; for (const f of fs.readdirSync(p)) s += sz(path.join(p, f)); return s } catch (e) { return 0 } };
  const D = path.join(SITE, "data"), pl = JSON.parse(fs.readFileSync(path.join(D, "preload.json"), "utf8")), bb = JSON.parse(fs.readFileSync(path.join(D, "big-books.json"), "utf8"));
  const skip = new Set([".git", "pikafish-src", "tripo_anim", "_rekey_backup", "source", "evidence"]), bigKeys = new Set(["gmgames.json", ...bb.map(b => b.key + ".json")]);
  let code = 0; for (const f of fs.readdirSync(SITE)) if (/\.(js|html|css|json|webmanifest)$/.test(f)) code += sz(path.join(SITE, f));
  for (const f of fs.readdirSync(D)) if (/\.json$/.test(f) && !bigKeys.has(f)) code += sz(path.join(D, f));
  let all = 0; (function w(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (skip.has(f.name)) continue; const p = path.join(d, f.name); if (f.isDirectory()) w(p); else all += fs.statSync(p).size } })(SITE);
  const S = { pre: pl.bytes, code, eng: sz(path.join(SITE, "engine")), gm: sz(path.join(D, "gmgames.json")), bgm: sz(path.join(D, "bgm")), opt: bb.map(b => [b.name, b.size || 0]), all };
  S.other = Math.max(0, all - S.pre - S.code - S.eng - S.gm - S.bgm - S.opt.reduce((a, b) => a + b[1], 0));
  return S;
}
function fill(html, S) {
  const PH = "/*__SIZES__*/null";
  if (html.split(PH).length !== 2) throw new Error("index.html 裡的 XQ_SIZES 佔位不是剛好一個（已經填過，或程式改了）");
  return html.replace(PH, () => JSON.stringify(S));
}
module.exports = { computeSizes, fill };
if (require.main === module) {
  const a = process.argv.slice(2), i = a.indexOf("--site"), SITE = path.resolve(i >= 0 ? a[i + 1] : path.join(__dirname, "..", "site")), F = a.find((x, k) => !x.startsWith("--") && a[k - 1] !== "--site");
  if (!F) { console.log("用法：node fill-sizes.js <index.html> [--site <site 資料夾>]"); process.exit(2) }
  const S = computeSizes(SITE), M = b => (b / 1048576).toFixed(0) + " MB";
  fs.writeFileSync(F, fill(fs.readFileSync(F, "utf8"), S));
  console.log("填好整包大小：開 App", M(S.pre + S.code), "、背景自動", M(S.eng + S.gm), "、音樂", M(S.bgm), "、選購", M(S.opt.reduce((x, y) => x + y[1], 0)), "、其他", M(S.other), "、全部", M(S.all));
}
