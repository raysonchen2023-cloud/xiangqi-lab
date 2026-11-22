// 第 11 輪 X7：開源授權檢查（xiangqi-lab/tools/foss-audit.js）
// 用假的網站資料夾驗：授權全文缺了會抓到、GPL 對應原始碼缺了會抓到、追蹤 SDK 會抓到、沒登記的第三方檔會抓到、網址分類；最後對真的 site/ 跑一次。
// 用法：node --test xiangqi-lab/tools/test-foss-audit.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),os=require("os"),path=require("path"),cp=require("child_process");
const FA=require("./foss-audit.js");
const LAB=path.join(__dirname,".."),DB=path.join(LAB,"../xiangqi-db");

/* 做一個假網站：files＝{相對路徑: 內容} */
function fake(files){const d=fs.mkdtempSync(path.join(os.tmpdir(),"xqfoss-"));for(const [f,c] of Object.entries(files)){const p=path.join(d,f);fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,c)}return d}
const GOOD={"index.html":"<html><script>fetch('https://api.open-meteo.com/v1')</script></html>","three.min.js":"/** @license Copyright 2010-2023 Three.js Authors SPDX-License-Identifier: MIT */","licenses/three.js-MIT.txt":"MIT",
  "engine/pikafish.wasm":"x","engine/pikafish.js":"var PikafishModule","LICENSE-Pikafish-GPL3.txt":"GPL","pikafish-src/uci.cpp":"//","pikafish-src/build-wsl.sh":"#!",
  "net.js":"const H=\"d23f1132.ala.asia-southeast1.emqxsl.com\";","data/fonts/xq-iansui.woff2":"x","licenses/font-Iansui-OFL.txt":"OFL"};
const clean=d=>fs.rmSync(d,{recursive:true,force:true});

test("授權全文齊全、沒有追蹤：沒有問題；只出現的元件才檢查",()=>{
  const d=fake(GOOD);try{const A=FA.audit(d);assert.deepEqual(A.problems,[]);
    const t=A.comps.find(c=>c.name==="three.js");assert.deepEqual(t.present,["three.min.js"]);assert.deepEqual(t.missLic,[]);
    const q=A.comps.find(c=>c.name.startsWith("jsQR"));assert.equal(q.present.length,0,"沒放 jsQR 就不要求它的授權檔")}finally{clean(d)}});
test("授權全文缺了、GPL 對應原始碼缺了 → 列成問題，指令以代碼 1 結束",()=>{
  const f={...GOOD};delete f["licenses/three.js-MIT.txt"];delete f["pikafish-src/uci.cpp"];const d=fake(f);
  try{const A=FA.audit(d);assert.ok(A.problems.some(p=>/three\.js 缺授權全文/.test(p)));assert.ok(A.problems.some(p=>/Pikafish 引擎.*缺對應原始碼：pikafish-src\/uci\.cpp/.test(p)));
    const r=cp.spawnSync(process.execPath,[path.join(__dirname,"foss-audit.js"),d],{encoding:"utf8"});assert.equal(r.status,1);assert.match(r.stdout,/有 2 個問題/)}finally{clean(d)}});
test("追蹤 SDK：Google Analytics、Firebase、Sentry、Facebook Pixel 都抓得到，並標出檔名和行號",()=>{
  const d=fake({...GOOD,"index.html":"<html>\n<script async src=\"https://www.googletagmanager.com/gtag/js?id=G-X\"></script>\n</html>","local.js":"a\nb\nimport * as Sentry from '@sentry/browser';Sentry.init({})",
    "bot3d.js":"fbq('track','PageView')","map3d.js":"https://x.firebaseio.com/"});
  try{const A=FA.audit(d),k=A.trackers.map(t=>t.file+":"+t.kind);
    assert.ok(k.includes("index.html:Google Analytics／Tag Manager"));assert.equal(A.trackers.find(t=>t.file==="index.html").line,2);
    assert.ok(k.includes("local.js:Sentry"));assert.ok(k.includes("bot3d.js:Facebook SDK／Pixel"));assert.ok(k.includes("map3d.js:Firebase／Crashlytics"));
    assert.equal(A.problems.length,4)}finally{clean(d)}});
test("沒登記的第三方嫌疑檔：*.min.js、字型、檔頭有別人版權的程式、根目錄不認得的程式",()=>{
  const d=fake({...GOOD,"lodash.min.js":"x","data/fonts/other.ttf":"x","vendor/lib.js":"/*! (c) 2020 Someone, MIT */","mystery.js":"1","data/x/own.js":"/* © 陳泓昇 */ Copyright 2026"});
  try{const S=Object.fromEntries(FA.audit(d).suspects.map(s=>[s.file,s.why]));
    assert.match(S["lodash.min.js"],/min\.js/);assert.match(S["data/fonts/other.ttf"],/字型/);assert.match(S["vendor/lib.js"],/版權/);assert.match(S["mystery.js"],/根目錄/);
    assert.equal(S["data/x/own.js"],undefined,"自己的版權宣告不算");assert.equal(S["net.js"],undefined,"自有清單裡的不算")}finally{clean(d)}});
test("網址分類：EMQX、Google 表單、Open-Meteo、命名空間、範例；不認得的標「未分類」；檔名不會被當成網域",()=>{
  assert.equal(FA.classifyHost("d23f1132.ala.asia-southeast1.emqxsl.com").kind,"net");assert.equal(FA.classifyHost("broker.emqx.io").kind,"net");
  assert.equal(FA.classifyHost("script.google.com").kind,"net");assert.equal(FA.classifyHost("www.w3.org").kind,"ns");assert.equal(FA.classifyHost("xxxxxxxx.ala.us-east-1.emqxsl.com").kind,"ns");
  assert.equal(FA.classifyHost("evil-tracker.example.net").kind,"unknown");
  assert.deepEqual(FA.hostsOf(`a("https://API.open-meteo.com/v1?x");b="wss://h.emqxsl.com:8084/mqtt";c="d23f.emqxsl.com";d="core.js";e="data/x.json"`).sort(),["api.open-meteo.com","d23f.emqxsl.com","h.emqxsl.com"])});
test("報告：Markdown 表格、App 本身沒有授權檔要照實寫",()=>{
  const d=fake(GOOD);try{const md=FA.renderMd(FA.audit(d));assert.match(md,/\| three\.js \| r149 \| MIT \| 1／3 \|/);assert.match(md,/沒有（查了 10 類/);
    assert.match(md,/App 本身的授權檔（LICENSE／COPYING）：\*\*沒有\*\*/);assert.ok(!md.includes("\r"))}finally{clean(d)}});
test("真的 site/：第三方授權全文和 Pikafish 對應原始碼都在、沒有追蹤 SDK、沒有沒登記的第三方檔",()=>{
  const A=FA.audit(path.join(LAB,"site"));
  assert.deepEqual(A.problems,[]);assert.equal(A.trackers.length,0);
  for(const c of A.comps)assert.equal(c.present.length,c.files.length,c.name+" 的檔案都在");
  assert.ok(A.hosts.every(h=>h.kind!=="unknown"),"外部網址都分類過："+A.hosts.filter(h=>h.kind==="unknown").map(h=>h.host).join("、"));
  /* 11/13 起程式改 GPL-3.0-or-later、公開倉庫根目錄放 LICENSE：本機 site/ 工作區還沒有就是空的，有了就一定是 LICENSE 那份 */
  assert.ok(A.appLicense.length===0||A.appLicense.some(f=>/(^|[\\/])LICENSE$/i.test(String(f.file||f))),"App 的授權檔是根目錄的 LICENSE："+JSON.stringify(A.appLicense))});
test("〔原始碼〕foss.md 兩份逐字相同、LF；寫明目前不符合 F-Droid 的「從原始碼建置」",()=>{
  const a=fs.readFileSync(path.join(DB,"art/docs/foss.md"),"utf8");assert.equal(fs.readFileSync(path.join(LAB,"site/data/docs/foss.md"),"utf8"),a);
  assert.ok(!a.includes("\r"));assert.match(a,/不符合/);assert.match(a,/從原始碼建置/);assert.match(a,/foss-audit\.js/)});
