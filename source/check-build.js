#!/usr/bin/env node
// 象棋千秋：檢查「發布的 index.html」是不是由這份原始碼組出來的
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 用法（在倉庫根目錄）：
//   node source/check-build.js                 組出 index.html 跟根目錄的 index.html 比對
//   node source/check-build.js 某版/index.html  跟指定的檔比對
//   node source/check-build.js --out 組好.html  只組、不比對（寫出跟發布版同一套轉換後的頁面）
//
// 做的事跟 source/xiangqi-lab/tools/build-site.js 第 4 步一樣：
//   m.html 的 <link rel="stylesheet" href="m.css"> 換成 m.css、每一行 //#include m/xx.js 換成該模組
//   → 圖示路徑改相對路徑、拿掉 Google 字型、插入 core.js／engine.js／local.js／net.js／zh.js
// 比對時忽略三處：開頭的授權聲明註解、建置時才填的版本號（__BUILD__）、整包大小（__SIZES__，要有全部素材才算得出來）。
"use strict";
const fs = require("fs"), path = require("path");
const HERE = __dirname, { assemble } = require(path.join(HERE, "xiangqi-db", "tools", "mhtml.js"));
const argv = process.argv.slice(2), oi = argv.indexOf("--out");
const LF = s => s.split("\r\n").join("\n");

let html = assemble();
const rep = (a, b) => { if (!html.includes(a)) throw new Error("m.html 裡找不到要替換的字串：" + a.slice(0, 60)); html = html.split(a).join(b) };
rep(`<link rel="manifest" href="/m/manifest.json"><link rel="icon" href="/m/icon.svg"><link rel="apple-touch-icon" href="/m/icon-180.png">`,
    `<link rel="manifest" href="manifest.json"><link rel="icon" href="icon.svg"><link rel="apple-touch-icon" href="icon-180.png">`);
html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, "");
rep(`<script>\n"use strict";`, `<script>window.XQ_OFFLINE=true;window.XQ_BUILD="__BUILD__";</script>\n<script src="core.js"></script>\n<script src="engine.js"></script>\n<script src="local.js"></script>\n<script src="net.js"></script>\n<script src="zh.js"></script>\n<script>\n"use strict";`);

if (oi >= 0) { fs.writeFileSync(argv[oi + 1], html); console.log("組好了：" + argv[oi + 1]); process.exit(0) }

const target = path.resolve(argv[0] || path.join(HERE, "..", "index.html"));
if (!fs.existsSync(target)) { console.log("找不到要比對的 index.html：" + target); process.exit(2) }
const norm = s => LF(s)
  .replace(/^<!doctype html>\n<!--[\s\S]*?-->\n/i, "<!doctype html>\n<!--授權聲明-->\n")
  .replace(/window\.XQ_BUILD="[^"]*"/, 'window.XQ_BUILD="__BUILD__"')
  .replace(/\/\*__SIZES__\*\/null|\{"pre":\d+[^\n]*?"all":\d+\}/, "/*__SIZES__*/null");
const a = norm(html), b = norm(fs.readFileSync(target, "utf8"));
if (a === b) { console.log("✔ 一致：" + target + " 就是這份原始碼組出來的（忽略授權聲明、版本號、整包大小）"); process.exit(0) }
let i = 0; while (i < a.length && a[i] === b[i]) i++;
const line = a.slice(0, i).split("\n").length;
console.log("✘ 不一致：第 " + line + " 行開始不同");
console.log("  原始碼組出來：" + JSON.stringify(a.slice(Math.max(0, i - 60), i + 80)));
console.log("  發布的檔案　：" + JSON.stringify(b.slice(Math.max(0, i - 60), i + 80)));
process.exit(1);
