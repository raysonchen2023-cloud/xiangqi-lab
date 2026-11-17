// 11/17 第 21 輪（候選版 1144 複驗後的剩餘項目）：76 ⋯ 選單換頁、77 讀螢幕名稱夾中文、78 擺局說明、71 青銅匭被裁、73 總覽紙條、74 合作殘譜、75 拉把、79 小項。
// 標準：App Store 審查 2.1、4.0。不開瀏覽器，vm／純計算。外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法：node --test xiangqi-lab/tools/test-r21-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const CJK = /[㐀-鿿豈-﫿]/;
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const I18N = M("07i18n.js");
function i18nKit(withExt) {
  const ctx = { console, Math, JSON, Intl, Date, Map, WeakMap, Set, RegExp, String, Object, Array, store: { get: (k, d) => k === "lang" ? "en" : d, set() { } } };
  vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;", ctx);
  vm.runInContext("function i18nLang(){return'en'};" + between(I18N, "const I18N_ATTR=", "let I18N_MO=null") + ";this.i18nApply=i18nApply;this.i18nParts=i18nParts;", ctx);
  vm.runInContext("this.I18N_CSS=" + between(I18N, "const I18N_CSS=", "function i18nCss()").replace(/^const I18N_CSS=/, "").replace(/;\s*$/, "") + ";", ctx);
  if (withExt && HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}
function el(name, attrs, kids) {
  const e = { nodeType: 1, nodeName: name.toUpperCase(), _a: Object.assign({}, attrs || {}), _k: [], parentNode: null,
    getAttribute(k) { return k in this._a ? this._a[k] : null }, setAttribute(k, v) { this._a[k] = String(v) }, hasAttribute(k) { return k in this._a },
    classList: { contains: c => String(e._a.class || "").split(/\s+/).includes(c) }, get firstChild() { return this._k[0] || null } };
  for (const k of kids || []) { const n = typeof k === "string" ? { nodeType: 3, nodeValue: k } : k; n.parentNode = e; e._k.push(n) }
  e._k.forEach((n, i) => Object.defineProperty(n, "nextSibling", { get: () => e._k[i + 1] || null, configurable: true }));
  return e;
}

// ---------- 76 ----------
test("76：⋯ 選單點了換頁的項目，先等卡片那筆紀錄退完（popstate）才做；沒有卡片紀錄照舊馬上做", async () => {
  const S = M("02-shell.js"), src = between(S, "function topMoreRun(f,after){", "\nfunction setTabs(");
  const mk = st => { const log = [], L = {}; const ctx = { log, history: { state: st, back() { log.push("back"); setTimeout(() => { ctx.history.state = null; (L.popstate || []).forEach(f => f()) }, 20) } },
    closeSheet: a => log.push(a === true ? "close(true)" : "close"), addEventListener: (k, f) => { (L[k] = L[k] || []).push(f) }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter(x => x !== f) }, setTimeout };
    vm.createContext(ctx); vm.runInContext(src, ctx); return ctx };
  const A = mk({ xqSheet: 1 }); A.topMoreRun(() => A.log.push("f:state=" + JSON.stringify(A.history.state)));
  await new Promise(r => setTimeout(r, 120));
  assert.deepEqual(A.log, ["close(true)", "back", "f:state=null"], "退完卡片那筆才換頁（goUp 用的是退完以後的紀錄）");
  const B = mk(null); B.topMoreRun(() => B.log.push("f")); await new Promise(r => setTimeout(r, 30)); assert.deepEqual(B.log, ["close", "f"]);
  const C = mk({ xqSheet: 1 }); C.history.back = () => C.log.push("back-no-pop"); C.topMoreRun(() => C.log.push("f")); await new Promise(r => setTimeout(r, 450)); assert.deepEqual(C.log, ["close(true)", "back-no-pop"], "第 22 輪 N22-1：不靠計時，popstate 沒來就不做（晚到的退回才不會把網址退回去）");
  assert.ok(S.includes('b.querySelectorAll("[data-i]").forEach(x=>x.onclick=()=>{const f=right[+x.dataset.i][1];topMoreItem(b,f,'));   /* 第 22 輪多帶 after；第 23 輪包一層 topMoreItem（同一張選單只認第一次） */
  assert.ok(S.includes('const lbOf=i=>{const x=bs[i],v=(x&&(x.dataset.lb||x.getAttribute("aria-label")))||right[i][2]||"";'), "選單名稱照頂欄按鈕現在的字（第 22 輪多了星門圍城的名稱）");
  assert.ok(M("00-util.js").includes("if(fromPop===true)return;const href=location.href;"), "closeSheet(true) 不排退回（topMoreRun 自己退）");
});
test("79：3D 切換鈕從 ⋯ 選單按也換名稱（aria-label、data-lb 一起換）", () => {
  assert.ok(M("06-cpu.js").includes('const b=(e&&e.currentTarget)||(typeof pkSwTb==="function"?pkSwTb():null);if(b){const l=parkLabel();b.textContent=parkIcon();b.title=l;b.setAttribute("aria-label",l);b.dataset.lb=l}'));
  assert.ok(M("02-shell.js").includes('return"More: "+L.map(t=>{const e=i18nText(t);'), "More 的讀螢幕名稱跟選單用同一個翻譯（大小寫一致）");
});

// ---------- 77 ----------
test("77：組起來的讀螢幕名稱分段翻（翻不出的局名留原文，旁邊是中文用「，」）；canvas 的 aria 也翻；字典晚到時重算 axm 名字", { skip: SKIP }, () => {
  const K = i18nKit(true);
  assert.equal(K.i18nParts("氣吞關右，擺譜中殘局，Red wins"), "氣吞關右，Composed middlegame endgame, Red wins");
  assert.equal(K.i18nParts("氣吞關右，馬蹀閼氏"), null, "一段都翻不出就不動");
  const row = el("button", { class: "sj-row", "aria-label": "氣吞關右，擺譜中殘局，Red wins" }), cv = el("canvas", { role: "img", "aria-label": "小帥Q版的學習週報：解題 0 題、下棋 0 盤、有練習 0 天。這週小帥Q版在休息。每天花 10 分鐘解一題「今日茶單」，就是很好的開始！" });
  K.i18nApply(el("body", {}, [row, cv]));
  assert.equal(row.getAttribute("aria-label"), "氣吞關右，Composed middlegame endgame, Red wins");
  assert.match(cv.getAttribute("aria-label"), /'s weekly report: 0 puzzles solved, 0 games played, practiced on 0 days\. .*great start!$/); assert.ok(!CJK.test(cv.getAttribute("aria-label")), cv.getAttribute("aria-label"));
  assert.ok(I18N.includes("/^(INPUT|TEXTAREA|SVG|CANVAS)$/i.test(el.nodeName)"));
  assert.ok(I18N.includes('try{if(typeof axmFix==="function")axmFix(document.body)}catch(e){}try{document.dispatchEvent(new Event("xq-i18n-ext"))}catch(e){}'));
  { const t = K.i18nText("走一步就將軍，逼對方先解"); assert.ok(t && !CJK.test(t), t) }
});
test("77：11b axmEn 分段時，翻不出的段旁邊照舊用「，」", () => {
  const A = M("11b-a11y.js"), src = between(A, "function axmSpeak(t){", "\n/* 11/17 第 20 輪 D N4") + "\n" + between(A, "function axmEn(s){", "\n");
  const run = s => vm.runInNewContext(src + ";axmSpeak(S)", { S: s, i18nLang: () => "en", i18nText: x => ({ "410 題": "410 puzzles" })[x] || null });
  assert.equal(run("走一步就將軍・逼對方先解・410 題"), "走一步就將軍，逼對方先解，410 puzzles");
});
test("78：#/pos 擺局頁說明整句有英文", { skip: SKIP }, () => {
  const s = M("10d-coach.js").match(/和電腦下是練習：[^<]+/)[0], t = i18nKit(true).i18nText(s);
  assert.ok(t && !CJK.test(t) && /✋ Move/.test(t), t);
});

// ---------- 71、73、75 ----------
test("71：意見回饋頁補滿高度時最多放大到左右各裁 3.3%，招諫口（圖寬約 96%）留在畫面內", () => {
  const T = M("07t3-tabtube.js");
  assert.ok(T.includes("const TT_FBP_EDGE=.033;") && T.includes('if(P.classList&&P.classList.contains("fbp-page")){const cap=Math.floor(W/(1-2*TT_FBP_EDGE));if(w>cap)w=cap}'));
  for (const [W, H] of [[393, 852], [430, 932], [375, 812]]) { const av = H - 56, wFull = Math.round(av * 768 / 1376), w = Math.min(wFull, Math.floor(W / (1 - 2 * .033))), crop = (w - W) / 2, slotR = w * (716 + 21.5) / 768 - Math.max(0, crop); assert.ok(slotR <= W, W + "×" + H + "：招諫右緣 " + slotR.toFixed(1)) }
});
test("73：英文總覽的橫排標籤蓋住底圖的直書紙條；You are here 冒號後有空格；75：拉把 z-index", () => {
  const css = i18nKit(false).I18N_CSS;
  assert.match(css, /html\[lang=en\] #stmOv \.lb\{z-index:1;white-space:normal!important;text-align:center;min-width:calc\(7\.5cqw \+ 2px\);max-width:27cqw;min-height:calc\(19\.8cqw \+ 2px\);/);   /* 第 22 輪 S3：標籤自己蓋住整條紙條 */
  assert.ok(!/#stmOv \.lb::before/.test(css), "不再另外畫一條米色直條");
  assert.match(css, /html\[lang=en\] #stmOv \.here b\{margin-left:\.3em\}/);
  /* 紙條的高：卡片 10.5～11% 圖高 × 1376／768 ≈ 18.8～19.7cqw */
  const Z = M("07z6-sitemap.js"), map = vm.runInNewContext("(" + Z.match(/const STM_MAP=(\{[^;]+\});/)[1] + ")");
  for (const k in map) { const c = map[k].card, h = (c[3] - c[1]) * 1376 / 768, w = c[2] - c[0]; assert.ok(h <= 19.8 + .01 && w <= 7.5 + .01, k + "：" + w + "×" + h.toFixed(2)) }
  assert.ok(M("07g-battle.js").includes('".bt2-hd{position:relative;z-index:2}.bt2-hd::before{'));
});

// ---------- 74 ----------
test("74：合作殘譜英文：說明、7 題目標、殘篇閣標題（🧩 換成圖之後）；粗體後面接的字前面有空格", { skip: SKIP }, () => {
  const K = i18nKit(true), Q = M("07q2-coop.js");
  const gts = [...Q.matchAll(/gt:"([^"]+)"/g)].map(m => m[1]); assert.equal(gts.length, 7);
  for (const s of gts.map(g => g + "・最少 5 步").concat(["同一支手機：紅方一個人、黑方一個人輪流走。不是比輸贏，要", "一起", "達成棋譜上的目標。", "合力補全殘篇", "🧩 合力補全殘篇"])) { const t = K.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) }
  assert.match(K.i18nText("看得到正解，可是不能動棋子，只能用暗語提示；"), /^ sees /, "Reader sees（不是 Readersees）");
  assert.match(K.i18nText("可以動棋子，可是看不到正解。"), /^ moves /);
  assert.ok(Q.includes("📜 <b>看譜人</b>看得到正解，可是不能動棋子，只能用暗語提示；<br>♟ <b>下棋人</b>可以動棋子，可是看不到正解。"));
});

// ---------- 79 ----------
test("79：英文介面新產生的預設名字 Player XXXX（中文照舊棋友 XXXX）", () => {
  const U = M("00-util.js"), src = between(U, "function defaultName(){", "\nfunction defaultNamePre()") + "\n" + between(U, "function defaultNamePre(){", "\n");
  const run = lang => vm.runInNewContext(src + ";defaultName()", { i18nLang: () => lang, window: {}, meInfo: () => ({ id: "5fb6aa" }), Math });
  assert.equal(run("en"), "Player 5FB6"); assert.equal(run("zh"), "棋友5FB6");
});
test("79：codex「已收 N 個」、棋規碑英文排版（看走法放到說明下面）、消寒圖 SVG 的一九～九九、大廳出口照英文寬度再推", () => {
  const Q = M("03-home-quiz.js"); assert.ok(Q.includes('display:grid;grid-template-columns:auto 1fr;gap:4px 10px') && Q.includes('justify-self:start;white-space:nowrap;font-size:13px">👀 See the move'));
  const G = M("07e-garden2.js"), src = between(G, "const XH_FROM=", "\nfunction xhNineLb(b)") + "\n" + between(G, "function xhNineLb(b){", "\n");
  const lb = lang => JSON.parse(vm.runInNewContext(src + ";JSON.stringify([0,1,2,8].map(xhNineLb))", { i18nLang: () => lang }));
  assert.deepEqual(lb("en"), ["1st Nine", "2nd Nine", "3rd Nine", "9th Nine"]); assert.deepEqual(lb("zh"), ["一九", "二九", "三九", "九九"]);
  assert.ok(G.includes('class="xh-t">${xhNineLb(b)}</text>'));
  assert.ok(M("07w9-exits.js").includes('document.addEventListener("xq-i18n-ext",()=>requestAnimationFrame(go),{once:true})'));
  if (HAS_EXT) assert.equal(i18nKit(true).i18nText("已收 0 個"), "Collected 0");
});
