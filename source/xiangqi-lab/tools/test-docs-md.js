// 〔混合〕App 內說明文件的 Markdown（評比第 8 輪 F2、F5：相對連結、證據截圖、程式碼區塊、分隔線不能原樣顯示）
// 用法：node --test xiangqi-lab/tools/test-docs-md.js
"use strict";
const assert=require("node:assert/strict"),test=require("node:test"),fs=require("fs"),path=require("path");
const ROOT=path.join(__dirname,"..",".."),SRC=fs.readFileSync(path.join(ROOT,"xiangqi-db/m/05-settings.js"),"utf8").replace(/\r\n/g,"\n");
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c]));
const code=SRC.slice(SRC.indexOf("const XQDOC="),SRC.indexOf("function xqDocSheet(")).replace(/\{const s=document\.createElement\("style"\)[^\n]*\n/,"");
const H=new Function("esc","provDoc",code+";return xqDocHtml")(esc,s=>s);
const DOCS=path.join(ROOT,"xiangqi-lab/site/data/docs");

test("〔混合〕全部說明文件：沒有原樣的方括號連結、沒有三個反引號的程式碼框", ()=>{
  const L=fs.readdirSync(DOCS).filter(f=>f.endsWith(".md"));assert.ok(L.length>=10);
  for(const f of L){const h=H(fs.readFileSync(path.join(DOCS,f),"utf8"));assert.ok(!/\]\([^)]*\)/.test(h),f+" 有原樣連結");assert.ok(!/```/.test(h),f+" 有原樣 ```")}
});

test("〔規則〕相對連結：別份說明在 App 內打開、截圖變圖片、路徑不安全就只留字", ()=>{
  assert.match(H("看 [棋規](rules.md#長將)"),/<button type="button" class="lk" data-xqdoc="rules">棋規<\/button>/);
  assert.match(H("[截圖](evidence/01_a.png)"),/<a href="data\/docs\/evidence\/01_a\.png" target="_blank" rel="noopener">截圖<\/a>/);
  assert.match(H("![首頁](evidence/01_a.png)"),/<img src="data\/docs\/evidence\/01_a\.png" alt="首頁" loading="lazy"/);
  assert.match(H("[外站](https://example.org/x)"),/<a href="https:\/\/example\.org\/x" target="_blank"/);
  const bad=H("[壞](../../secret.md) [壞2](javascript:alert(1)) [壞3](/etc/x)");assert.ok(!/href=|data-xqdoc/.test(bad),bad);
});

test("〔規則〕程式碼區塊原樣等寬、HTML 不會被執行；--- 畫成分隔線", ()=>{
  const h=H("前\n```\n<b>x</b>\n  縮排\n```\n---\n後");
  assert.match(h,/<pre class="xqd-pre"[^>]*><code>&lt;b&gt;x&lt;\/b&gt;\n  縮排<\/code><\/pre>/);assert.match(h,/<hr /);assert.match(h,/<p[^>]*>後<\/p>/);
});
