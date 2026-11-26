#!/usr/bin/env node
// 象棋千秋 CI：新增的測試檔一定要分類（W60 第 1 期 A3，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// testkinds.js 把測試分成行為／混合／原始碼比對三類，交接單與評比都引用這三個數字。
// 沒列進 CLASSIFIED 的檔全部算「待分類」，第 21 輪評比時約四成測試沒分類，三類數字就不可信。
// 既有的待分類檔另開工單慢慢清；這支只管「這個 PR 新加的測試檔」：沒列進 CLASSIFIED（或同時列在 PENDING）就紅燈。
// 用法：node .github/scripts/check-test-classified.cjs <比較基準，例如 origin/main>
// 結束代碼：0 新增的都分類了（或沒有新增）；1 有新增的沒分類；2 git 或 testkinds.js 讀不到
"use strict";
const path = require("path"), cp = require("child_process"), fs = require("fs"), vm = require("vm");
const TOOLS = path.join("source", "xiangqi-lab", "tools");

/* 2026-11-23（#95，W60 A3 漏洞）：原本只用正規式掃 testkinds.js 原文，註解裡、if (false) 裡、之後被 .delete 或 .filter 拿掉的檔名都算「已登記」
   （iMac Claude 2 審 #85 時發現；#74 一行註解結尾少一個 /，後面整段登記被吃掉，CI 照樣綠）。現在兩道都要過才算已登記：
   ① 執行判定：在 vm 沙箱裡執行 testkinds.js，檔尾讀它自己的 CLASSIFIED、PENDING 變數（就是 testkinds 的 classified()／kindOf() 用的那兩個），
      已登記＝CLASSIFIED.has(f) 而且 !PENDING.has(f)。#95 第二輪複審：在同一個程序裡 require，testkinds 能改全域（Set.prototype.values、
      JSON.stringify、process.stdout.write、改匯出、getter…）讓判定作假。所以改成沙箱：
        ・沙箱裡的 Set、JSON、Array 都是沙箱自己的一份，它怎麼改都改不到外面；外面用自己的 Set.prototype.values 取內容；
        ・沙箱裡沒有 process、真的 require、console；給它的假 require、module 也是在沙箱裡面建立的（不給它任何外面的物件，免得順著 constructor 拿到外面的 Function）；
        ・讀的是檔尾的變數本身，不是匯出物件（改匯出、getter 都騙不了）；兩個都要是沙箱原本的 Set（原型沒被換、物件上沒有自己加的屬性），項目都是 test-*.js；
        ・5 秒逾時。
   ② 原文判定（#95 複審建議 a）：CLASSIFIED 那一段原文裡要有 "檔名"，PENDING 那一段原文裡不能有。執行判定被騙過時，還要原文也對得上。
   讀不到、語法錯、丟例外、逾時、格式不對：一律 null＝讀不懂，結束碼 2，不能當通過。
   限制（照實寫）：vm 不是嚴格的安全邊界；刻意作弊同時騙過兩道仍有可能，最後一道是 guard-base（換回 main 版守門再跑一次）。 */
const SB_SETUP = `
var __sbSetProto = Set.prototype;
var __sbRequire = function () { return new Proxy({}, { get: function () { return function () { return [] } } }) };
var module = { exports: {} }; var exports = module.exports; var require = __sbRequire; require.main = null;
`;
function loadKinds(file, timeout = 5000) {
  let src;
  try { src = fs.readFileSync(file, "utf8") } catch (e) { return null }
  const ctx = vm.createContext(Object.create(null));
  let got;
  try {
    vm.runInContext(SB_SETUP, ctx, { timeout });
    const sbSetProto = vm.runInContext("__sbSetProto", ctx);
    vm.runInContext("(function(){var __dirname=" + JSON.stringify(path.dirname(file)) + ";var __filename=" + JSON.stringify(file) + ";\n" + src + "\n;this.__tk=[typeof CLASSIFIED==='undefined'?null:CLASSIFIED,typeof PENDING==='undefined'?null:PENDING];}).call(this)", ctx, { timeout, filename: file });
    const pair = vm.runInContext("this.__tk", ctx);
    if (!Array.isArray(pair) && !(pair && typeof pair === "object")) return null;
    const take = (s) => {
      if (s == null || typeof s !== "object" || Object.getPrototypeOf(s) !== sbSetProto) return null;
      if (Object.getOwnPropertyNames(s).length || Object.getOwnPropertySymbols(s).length) return null;
      const out = [];
      for (const x of Set.prototype.values.call(s)) out.push(x);
      return out;
    };
    got = { classified: take(pair[0]), pending: take(pair[1]) };
  } catch (e) { return null }
  const ok = (a) => Array.isArray(a) && a.every((x) => typeof x === "string" && /^test-[^/\\]+\.js$/.test(x));
  if (!ok(got.classified) || !ok(got.pending)) return null;
  return { classified: new Set(got.classified), pending: new Set(got.pending), src };
}

/* 原文判定：從程式碼開頭的宣告到該段結尾 `]);` 之間的原文 */
function section(src, name) {
  const a = src.indexOf("const " + name + " = new Set(["), b = a < 0 ? -1 : src.indexOf("]);", a);
  return a < 0 || b < 0 ? null : src.slice(a, b);
}

/* 已登記＝執行判定（CLASSIFIED 裡、不在 PENDING）而且原文判定（CLASSIFIED 段有 "檔名"、PENDING 段沒有） */
function registered(k) {
  const cs = section(k.src || "", "CLASSIFIED"), ps = section(k.src || "", "PENDING") || "";
  if (cs == null) return new Set();
  return new Set([...k.classified].filter((f) => !k.pending.has(f) && cs.includes('"' + f + '"') && !ps.includes('"' + f + '"')));
}

/* 這個 PR 新增的測試檔（只算新加的，改名、修改不算） */
function addedTests(base, git = (...a) => cp.execFileSync("git", a, { encoding: "utf8" })) {
  /* --no-renames：PR #19 審查（iMac）——把已分類的檔改名成新名字，原本會被當成「改名」而不算新增，可以繞過分類檢查 */
  const out = git("diff", "--name-only", "--no-renames", "--diff-filter=A", base + "...HEAD", "--", TOOLS.split(path.sep).join("/"));
  return out.split("\n").map(s => s.trim()).filter(f => /\/test-[^/]+\.js$/.test(f)).map(f => f.split("/").pop());
}

function check(added, set) { return added.filter(f => !set.has(f)) }

function main(argv, cwd = process.cwd()) {
  const base = argv[2];
  if (!base) { console.error("用法：node .github/scripts/check-test-classified.cjs <比較基準>"); return 2 }
  let added;
  const k = loadKinds(path.join(cwd, TOOLS, "testkinds.js"));
  if (!k || !k.classified.size) { console.error("執行 testkinds.js 取不到 CLASSIFIED／PENDING（讀不到、語法錯、逾時、或不是原本的 Set）：不能當成通過"); return 2 }
  const set = registered(k);
  if (!set.size) { console.error("testkinds.js 的 CLASSIFIED 原文段落找不到：不能當成通過"); return 2 }
  try { added = addedTests(base) } catch (e) { console.error("git diff 失敗：" + e.message); return 2 }
  const bad = check(added, set);
  console.log(`測試分類：這個 PR 新增 ${added.length} 支測試檔，已分類清單有 ${set.size} 支（CLASSIFIED ${k.classified.size}、PENDING ${k.pending.size}）`);
  if (bad.length) {
    console.error(`新增的測試檔沒分類（${bad.length} 支）：\n` + bad.map(f => "  － " + f).join("\n"));
    console.error("請在 source/xiangqi-lab/tools/testkinds.js 的 CLASSIFIED 加一行（不要同時放在 PENDING），並把每一項的名稱照規則標〔原始碼〕或〔混合〕（行為的不用標），註明各幾項。");
    return 1;
  }
  return 0;
}

if (require.main === module) process.exit(main(process.argv));
module.exports = { loadKinds, registered, section, addedTests, check, main };
