#!/usr/bin/env node
// 象棋千秋 W62（11/22）：產生 07z9-school.js 的 OSC_EN0＝十派、十位掌門、門下棋友所有中文字串的內建英譯
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 為什麼：英文版的派名、定式名、門人名原本只靠外掛字典 data/i18n-en.json（約 1 MB，選 English 才從 CDN 下載）。
//   字典還沒到時就畫好的畫面（十州棋館、掌門小卡、戰書、漕船）會把中文名嵌進英文句子，例如「The 屏風馬門 challenges you」；
//   字典到了重翻整段也翻不回來，要等重新進那一頁。內建一份門派專用的英譯，oscT 先查它，就不用等下載。
// 譯名一律照外掛字典正本（xiangqi-db/i18n-en.json，只在開發者電腦與 CDN）＋07i18n.js 內建翻譯；字典也沒有的寫在 MANUAL，
//   而且要同步補進字典正本，兩邊一致。
//
// 用法（在 source/xiangqi-lab/tools/ 的上兩層有 xiangqi-db/m 的配置下；公開倉庫是 source/）：
//   node gen-osc-en0.js --dict <i18n-en.json> [--write]    不加 --write 只檢查 07z9-school.js 裡的 OSC_EN0 是不是最新（不是就結束代碼 1）
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const CJK = /[一-鿿]/;
/* 字典也沒有、或資料裡寫法跟畫面上不同的，寫在這裡（一律收進 OSC_EN0）。字典正本也已補同一個譯名。
   張三豐：原始碼 OSC.NPC 寫「張三丰」（字典有），但英文畫面實測查的是「張三豐」（執行時被別處的資料換掉），兩種寫法都要收 */
const MANUAL = { "張三豐": "Zhang Sanfeng" };

/* 要內建英譯的字串：派別、掌門資料裡的中文字串（遞迴），派別門人欄位拆成一人一筆，風格標籤收「想」＋標籤（07z9-school 的 oscT("想"+t)），
   門下棋友名（OSC.NPC 第三欄）。單字棋子不收（OSC_PC1 已有） */
function collectKeys(OSC) {
  const keys = new Set();
  const walk = (v, d, skip) => {
    if (d > 4 || v == null) return;
    if (typeof v === "string") { if (CJK.test(v) && v.length > 1) keys.add(v); return }
    if (Array.isArray(v)) { v.forEach(x => walk(x, d + 1)); return }
    if (typeof v === "object") for (const [k, x] of Object.entries(v)) if (!(skip && skip.includes(k))) walk(x, d + 1);
  };
  for (const S of OSC.SCH) {
    walk(S, 0, ["tag"]);
    String(S.who || "").split("、").forEach(w => w && w.length > 1 && keys.add(w));
    (S.tag || []).forEach(t => keys.add("想" + t));
  }
  for (const m of OSC.MST) walk(m, 0);
  for (const x of Object.values(OSC.NPC)) if (x && x[2] && CJK.test(x[2])) keys.add(x[2]);
  return [...keys].sort();
}

/* 載入門派資料（07z9-school.js 的 osc-core 段） */
function loadOSC(schoolSrc) {
  const c = {}; vm.createContext(c);
  vm.runInContext(schoolSrc.slice(schoolSrc.indexOf("const OSC=(()=>{"), schoolSrc.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;", c);
  return c.OSC;
}

/* 用 07i18n.js 的 i18nText 加上外掛字典翻 */
function makeTranslator(i18nSrc, dict) {
  const c = { console, navigator: { language: "en" }, localStorage: { getItem() { return null }, setItem() { } }, store: { get: (k, d) => (k === "lang" ? "en" : d), set() { } }, document: undefined, setTimeout, clearTimeout };
  c.window = c; vm.createContext(c);
  vm.runInContext(i18nSrc + ";this.T=i18nText;this.M=i18nExtMerge;", c);
  c.M(dict);
  return s => c.T(s);
}

function build(OSC, T) {
  const out = {}, miss = [];
  for (const k of new Set([...collectKeys(OSC), ...Object.keys(MANUAL)])) {
    const e = Object.prototype.hasOwnProperty.call(MANUAL, k) ? MANUAL[k] : T(k);
    if (e == null || CJK.test(e)) miss.push(k); else out[k] = e;
  }
  return { out, miss };
}

const LINE_RE = /^const OSC_EN0=\{.*\};.*$/m;
const lineOf = out => "const OSC_EN0=" + JSON.stringify(out) + ";   /* W62：門派英譯內建（gen-osc-en0.js 產生，勿手改）；字典還沒下載也翻得出 */";

module.exports = { collectKeys, loadOSC, build, LINE_RE, lineOf, MANUAL };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  const dictF = opt("--dict");
  if (!dictF) { console.log("用法：node gen-osc-en0.js --dict <i18n-en.json> [--write]"); process.exit(2) }
  const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), SF = path.join(M, "07z9-school.js");
  const school = fs.readFileSync(SF, "utf8"), i18n = fs.readFileSync(path.join(M, "07i18n.js"), "utf8");
  const { out, miss } = build(loadOSC(school), makeTranslator(i18n, JSON.parse(fs.readFileSync(dictF, "utf8"))));
  if (miss.length) { console.log("✘ 這些字串字典和 MANUAL 都翻不出，先補字典正本：\n  " + miss.join("\n  ")); process.exit(1) }
  const line = lineOf(out), cur = (school.match(LINE_RE) || [])[0] || null;
  if (cur === line) { console.log(`✔ OSC_EN0 是最新的（${Object.keys(out).length} 條）`); process.exit(0) }
  if (!a.includes("--write")) { console.log(`✘ OSC_EN0 ${cur ? "不是最新" : "還沒產生"}（應有 ${Object.keys(out).length} 條）；加 --write 寫入`); process.exit(1) }
  const next = cur ? school.replace(LINE_RE, () => line) : school.replace(/^(const OSC_PC1=.*)$/m, (m0) => m0 + "\n" + line);   /* 用函式替換：譯文裡的 $ 不會被當成替換符號 */
  if (next === school) { console.log("✘ 找不到插入位置（const OSC_PC1= 那一行）"); process.exit(1) }
  fs.writeFileSync(SF, next);
  console.log(`寫好 OSC_EN0：${Object.keys(out).length} 條 → ${SF}`);
}
