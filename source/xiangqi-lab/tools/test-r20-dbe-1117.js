// 11/17 第 20 輪：測試員 D（英文介面）N2～N6、B（橫式、卡冊、星門圍城）N20-1～N20-7、E（Apple 審查）N20-1～N20-3、N20-6～N20-9。
// （N1 #/coop 冷開當掉是 Win 修的，測試在 test-r20-1117.js。）標準：App Store 審查 2.1、4.0、5.1.1。不開瀏覽器，vm／純計算。
// 外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。用法：node --test xiangqi-lab/tools/test-r20-dbe-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const IOS = path.join(ROOT, "xiangqi-ios", "appstore", "metadata.md"), SKIP_IOS = fs.existsSync(IOS) ? false : "沒有 xiangqi-ios/appstore（App Store 上架文案與隱私申報有聯絡人資料，只在開發者電腦）";   /* W69 盤點高 7：原因寫準確（iOS 專案在公開倉庫裡，缺的是 appstore/） */
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;   /* 用跳脫碼（寫檔時相容字會被正規化） */
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const I18N = M("07i18n.js");
function i18nKit(withExt) {
  const ctx = { console, Math, JSON, Intl, Date, Map, WeakMap, Set, RegExp, String, Object, Array, store: { get: (k, d) => k === "lang" ? "en" : d, set() { } } };
  vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;", ctx);
  vm.runInContext("function i18nLang(){return'en'};" + between(I18N, "const I18N_ATTR=", "let I18N_MO=null") + ";this.i18nApply=i18nApply;this.i18nFieldEl=i18nFieldEl;", ctx);
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
const allT = (C, L) => { for (const s of L) { const t = C.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) } };

// ---------- D N2、N3：開場電影 ----------
test("D N2：第二段電影的上方字幕 .fm-cap 英文可以換行；D N3：減少動態版的整句標題有英文", () => {
  const css = i18nKit(false).I18N_CSS;
  assert.match(css, /html\[lang=en\] #bhxPg \.fm-cap\{white-space:normal;letter-spacing:\.03em;left:16px;right:16px;/);
  assert.match(M("07bh-blackhole.js"), /\.fm-cap\{[^}]*white-space:nowrap;[^}]*letter-spacing:\.2em/, "中文原樣不動");
  assert.ok(M("07bh-blackhole.js").includes('<div class="bx-t">第〇章　${esc(BHX_TXT.title)}</div>'));
  if (HAS_EXT) { const C = i18nKit(true); assert.match(C.i18nText("第〇章　天裂星盤沉雲河，黑洞殘局啟千秋"), /^Chapter 0 · The Sky Splits/); assert.equal(C.i18nText("七星如雨，各歸其時。"), "The Seven Stars fall like rain, each to its own time.") }
});

// ---------- D N4：aria-label ----------
test("D N4：I18N_AGUARD 清空；頂欄按鈕標 data-lb、動作列標 data-act，別的模組改用 data-* 找", () => {
  assert.ok(I18N.includes("const I18N_AGUARD=[];"));
  assert.ok(M("02-shell.js").includes('if(label){b.setAttribute("aria-label",label);b.dataset.lb=label}if(label==="回首頁")b.dataset.home="1";'));
  assert.ok(M("05-settings.js").includes('b.setAttribute("aria-label",String(label).replace(/<[^>]*>/g,""));b.dataset.act=id;'));
  const C = M("06-cpu.js");
  assert.ok(C.includes(`'[data-lb="聲控走棋"],[title="聲控走棋"],[aria-label="聲控走棋"]'`));
  assert.ok(C.includes(`'#topRight button[data-lb="回棋盤模式"],#topRight button[data-lb="去園子下棋（3D）"],`));
  for (const f of ["07bht-td.js", "07bhg-gatesiege.js"]) { const s = M(f); assert.ok(s.includes('#acts button[data-act="undo"]') && s.includes('#acts button[data-act="bag"]') && s.includes('#topRight button[data-lb="回棋盤模式"]'), f) }
  assert.ok(M("07t3-tabtube.js").includes(`'#topRight .ib[data-lb="回星槎"],#topRight .ib[aria-label="回星槎"]'`));
  /* 只用 aria-label／title 找這四顆的地方（沒有 data-lb 一起寫）都不能再有 */
  const D = path.join(ROOT, "xiangqi-db", "m"), bad = [];
  for (const f of fs.readdirSync(D).filter(f => f.endsWith(".js"))) { const s = M(f); for (const m of s.matchAll(/\[(?:aria-label|title)="(回星槎|聲控走棋|回棋盤模式|去園子下棋（3D）)"\]/g)) { const near = s.slice(Math.max(0, m.index - 400), m.index); if (!near.includes('data-lb="' + m[1] + '"')) bad.push(f + "：" + m[1]) } }
  assert.deepEqual(bad, []);
  /* 英文介面：四個都翻 */
  const K = i18nKit(false), bs = ["回星槎", "聲控走棋", "回棋盤模式", "去園子下棋（3D）"].map(t => el("button", { "aria-label": t, "data-lb": t }));
  K.i18nApply(el("body", {}, bs));
  for (const b of bs) { assert.ok(!CJK.test(b.getAttribute("aria-label")), b.getAttribute("aria-label")); assert.ok(CJK.test(b.getAttribute("data-lb")), "data-lb 不翻") }
});
test("D N4：棋盤群組名英文；axm 組出來的名字在英文介面分段翻", () => {
  assert.ok(M("01-board.js").includes('"aria-label":(typeof i18nLang==="function"&&i18nLang()==="en")?"Board, every square can be selected":"棋盤，每一格可以點選"'));
  const A = M("11b-a11y.js"), src = between(A, "function axmSpeak(t){", "\n/* 11/17 第 20 輪 D N4") + "\n" + between(A, "function axmEn(s){", "\n");
  const D = { "擺譜中殘局": "Composed middlegame endgame", "第 2 課・仕（還沒開）": "Lesson 2 · Advisor (locked)" };
  const run = (lang, s) => vm.runInNewContext(src + ";axmSpeak(S)", { S: s, i18nLang: () => lang, i18nText: x => D[x] != null ? D[x] : /[㐀-鿿]/.test(x) ? null : x });
  assert.equal(run("en", "氣吞關右・擺譜中殘局・Red wins"), "氣吞關右，Composed middlegame endgame, Red wins", "題名留原文，其他段翻；旁邊是中文的照舊用「，」（第 21 輪 77）");
  assert.equal(run("en", "🎯 擺譜中殘局"), "Composed middlegame endgame", "整段翻得出就用整段");
  assert.equal(run("zh", "氣吞關右・擺譜中殘局"), "氣吞關右，擺譜中殘局", "中文照舊");
});
test("D N4：測試員 D 畫面掃描抓到的動態 aria-label，英文都翻得出（名字、古譜題名照原文的除外）", { skip: SKIP }, () => {
  const C = i18nKit(true);
  allT(C, ["練會了 0", "還沒練會 3", "今天該複習 2", "第 2 課・仕（還沒開）", "第 8 課・兵（還沒開）", "第 3 課・相（2 顆星）", "第 9 課・將軍（還沒開）", "星槎殘局・0／3 題",
    "開始晉級賽：對手照段位「新手」配 · 執紅先走 · 算段位分", "\"Juzhong Mi\" No. 3，未加入", "\"Shiqing Yaqu\" No. 163，已加入", "棋規碑", "記譜碑", "術語碑", "擺譜中殘局",
    "提示棋 1", "↶ 悔棋符 0", "🪙 將令 0", "預習卷 0", "金印 0／13 方", "古法殘局解開 0／13 朝", "冬至還有 35 天才開始"]);
  const wk = C.i18nText("小明的學習週報：解題 0 題、下棋 0 盤、有練習 0 天。這週小明在休息。每天花 10 分鐘解一題「今日茶單」，就是很好的開始！");
  assert.match(wk, /^小明's weekly report: 0 puzzles solved, 0 games played, practiced on 0 days\. .*great start!$/);
  assert.ok(M("04c-weekly.js").includes('cv.setAttribute("aria-label",`${nm}的學習週報：解題 ${R.cj+R.qz} 題、下棋 ${R.g.n} 盤、有練習 ${R.days} 天。${M.sum}`)'));
});

// ---------- D N5：介面文字 ----------
test("D N5（P1）：#/terms 棋規碑「玩法」英文介面整段英文，七種棋子都有「看走法」鈕；中文原樣", () => {
  const Q = M("03-home-quiz.js"), src = between(Q, "function rulesPlayEn(P){", "\nfunction rulesPlay(box){");
  const P = (t, h) => `<div class="sec-t">${t}</div><div class="card" style="line-height:1.8">${h}</div>`;
  const html = vm.runInNewContext("function rulesPlayEn(P){" + src.slice("function rulesPlayEn(P){".length) + ";rulesPlayEn(P)", { P });
  assert.ok(!CJK.test(html), "英文版沒有中文：" + (html.match(/[㐀-鿿].{0,10}/) || [""])[0]);
  assert.equal((html.match(/data-pc="\d"/g) || []).length, 7);
  for (const k of ["Goal", "The board", "How each piece moves", "Capturing and check", "Draws and forbidden repetition", "Beginner tips", "Understanding levels", "palace", "Perpetual check"]) assert.ok(html.includes(k), k);
  assert.ok(Q.includes('if(typeof i18nLang==="function"&&i18nLang()==="en")box.innerHTML=rulesPlayEn(P);else box.innerHTML=P("🎯 目標","兩人對下，'));
  if (HAS_EXT) { const C = i18nKit(true); allT(C, ["七種棋子怎麼走", "看走法", "帥／將 怎麼走", "兵／卒 怎麼走", "帥在九宮中間，可以上下左右走一格（棋盤上的小圓點）。九宮外面不能去。", "不吃子時跟車一樣走。要吃子一定要隔一顆棋子（藍框＝炮架）跳過去吃，所以吃得到最右邊的黑卒。"]) }
});
test("D N5：codex、guess、coop、arena、xiaohan、weekly、返回鈕、大廳取名、today 的介面文字有英文", { skip: SKIP }, () => {
  const C = i18nKit(true);
  /* codex 每張卡的說明（07i-codex say） */
  const X = M("07i-codex.js"), says = [...X.matchAll(/say:"([^"]+)"/g)].map(m => m[1]);
  assert.ok(says.length >= 14); allT(C, says);
  /* theme 題型說明（07-legend THEMES） */
  const TH = vm.runInNewContext(M("07-legend.js").match(/const THEMES=(\[[^\n]*?\]\]);/)[1]); allT(C, TH.map(x => x[1]));
  /* coop 目標、說明 */
  const Q = M("07q2-coop.js"), gts = [...Q.matchAll(/gt:"([^"]+)"/g)].map(m => m[1]); assert.equal(gts.length, 7); allT(C, gts.map(g => g + "・最少 5 步"));
  allT(C, ["同一支手機：紅方一個人、黑方一個人輪流走。不是比輸贏，要", "一起", "達成棋譜上的目標。", "最少 4 步、最多 8 步（紅黑各走一次算兩步）。"]);
  /* arena：13 位擂主簡介、標題、棋力、提示 */
  const S6 = M("06-cpu.js"), AR = vm.runInNewContext("(" + between(S6, "const ARENA={", "const ARENA_ORDER").slice("const ARENA=".length).replace(/\/\*[\s\S]*?\*\//g, "").trim().replace(/;\s*$/, "") + ")");
  allT(C, Object.values(AR).map(a => a.intro));
  allT(C, ["🏯 青石園擂台", "唐朝擂台", "青石園擂主・職業頂尖", "擂主棋力：第 16 級「專2-1」（固定，全力的前一級）", "擂主棋力：第 8 級「業4」（跟著你的段位）", "打贏擂主，船艙印的「擂台」那一邊就會亮起來（千秋印譜）。"]);
  /* xiaohan */
  allT(C, ["2026 年冬至是 12/22。那天起 81 天，每天一題殘局，解開就染一瓣梅花。", "這裡把它換成一天一題殘局：解開，就染一瓣。題目從淺到深，都經過 Pikafish 驗證。", "怎麼玩",
    "冬至那天起，每天開放一瓣（第幾天就是第幾瓣）。點那一瓣、或按「解今天這一瓣」，不看答案解開，花瓣就染紅。", "漏掉的日子可以補做，一天最多補 3 瓣；九九過了也能慢慢補。",
    "每開滿一朵（9 瓣）修為 +10，81 瓣都染完得到稱號「九九消寒」，修為 +30。這些題不算今日茶單。"]);
  const HX = M("07e-garden2.js").match(/<p>(民間從冬至那天開始[^<]+)<\/p>/)[1]; allT(C, [HX]);
  /* guess、weekly、返回鈕、大廳、today */
  allT(C, ["跟著大師的實戰對局，", "你執贏的那一方", "，每一步先猜大師會怎麼走，再看大師實際走了什麼。對方的棋會照實戰自動走。",
    "每步請 Pikafish 算你猜的那步比最好的著法少幾分：跟大師一樣得 10 分，猜別的就看差多少給分。一局猜 15 步。這些資料會進到「我的戰績 → 🧬 天賦」的著法品質。", "天賦」的著法品質。",
    "📌 怎麼算的：只算最近 7 天手機裡", "有記日期", "的紀錄（殘局、測驗、猜著法、對局、棋話、擂台、古戰場）。新手訓練營、石桌往事讀到第幾回、攔路棋客沒有記日期，不算進來。看了答案的殘局不算「解開」。",
    "回戰績", "走回雲弈閣", "其他棋友會看到這個名字（例如線上對戰時，對手看到的就是你）。名字和段位也會定期送給開發者，詳見「設定 → 隱私」。", "這個名字會顯示在線上大廳和對戰裡。", "星槎殘局"]);
  assert.equal(C.i18nText("先不要，用「Guest」"), "Not now, use \"Guest\"");
  assert.ok(M("03-home-quiz.js").includes("<p>跟著大師的實戰對局，<b>你執贏的那一方</b>，每一步先猜大師會怎麼走，再看大師實際走了什麼。對方的棋會照實戰自動走。</p>"));
});
test("D N5：#/hw 卡片英文跟每日同題一致（\"書名\" No. 局號），子項目橫排不再一項一行", () => {
  const H = M("10d-coach.js"), src = between(H, "function hwCardInfo(x,P,th){", "\n  if(!P)return{name:\"主題題 \"");
  const run = (lang, P) => vm.runInNewContext("function hwCardInfo(x,P,th){" + src.slice("function hwCardInfo(x,P,th){".length) + "\n  return null};hwCardInfo({k:'c',id:'q1'},P,'')", { P, i18nLang: () => lang, i18nText: s => ({ "橘中秘": "Juzhong Mi", "全國象棋團體賽女子組": "National Xiangqi Team Championship, women" })[s] || null, cjLv: () => "Beginner" });
  const P = { t: "短殺", d: 3, th: [], src: { book: "橘中秘", title: "異地同心", no: "殘3" } };
  assert.equal(run("en", P).name, "\"Juzhong Mi\" No. 3"); assert.ok(!/橘中秘/.test(run("en", P).sub));
  assert.equal(run("zh", P).name, "〈異地同心〉"); assert.match(run("zh", P).sub, /《橘中秘》/);
  assert.equal(run("en", { t: "短殺", d: 3, th: [], src: { book: "特級大師對局", title: "全國象棋團體賽女子組", year: "1988" } }).name, "National Xiangqi Team Championship, women");
  assert.equal(run("en", { t: "短殺", d: 3, th: [], src: { book: "特級大師對局", title: "某某盃", year: "1999" } }).name, "Grandmaster game");
  assert.ok(H.includes(".hw-card .tx>span>span{display:inline}"));
});

// ---------- D N6、E N20-3：小項 ----------
test("D N6／E N20-3：「再點一次，直接進去」泡泡夾在看得到的範圍裡（左右各留 8px，英文換字後再夾一次）", () => {
  const W = M("07w-shipwalk.js"), src = between(W, "function shwTipClamp(e,L){", "\n/* 開發者選定（同上第 3 項");
  assert.ok(W.includes("L.append(e);shwTipClamp(e,L);try{requestAnimationFrame(()=>shwTipClamp(e,L))}catch(x){}"));
  const run = (vw, cx, w) => { const e = { style: {}, getBoundingClientRect: () => ({ left: cx - w / 2, width: w }) }, L = { getBoundingClientRect: () => ({ left: 0, right: vw, width: vw }) };
    vm.runInNewContext(src + ";shwTipClamp(e,L)", { e, L, innerWidth: vw }); return e.style.left == null ? cx : parseFloat(e.style.left) };
  for (const vw of [393, 375]) for (const [cx, w] of [[345, 139], [52, 139], [200, 139], [360, 190]]) { const x = run(vw, cx, w); assert.ok(x - w / 2 >= 8 - .1 && x + w / 2 <= vw - 8 + .1, vw + "：" + cx + "→" + x) }
  assert.equal(run(393, 200, 139), 200, "不靠邊的不動");
});
test("D N6：電腦房段位牌英文可換行、星槎「🌀 立體」推回畫面內、3D 小人大小有名字、英文的全形斜線換半形", () => {
  const K = i18nKit(false), css = K.I18N_CSS;
  assert.match(css, /html\[lang=en\] \.cr-page \.shp-spot b\{white-space:normal/);
  assert.ok(M("07f-ship.js").includes("if(r.width&&(r.left<8||r.right>vw-8))"));
  const S = M("05-settings.js"); assert.ok(S.includes('<input type="range" id="botSz" aria-label="3D 小人大小"')); assert.equal(K.i18nText("3D 小人大小"), "3D mascot size");
  const a = el("span", { class: "v" }, ["1 MB／about 851 MB"]), b = el("span", {}, ["3／13"]), keep = el("span", { "data-noi18n": "" }, ["2／3"]);
  K.i18nApply(el("body", {}, [a, b])); assert.equal(a.firstChild.nodeValue, "1 MB/about 851 MB"); assert.equal(b.firstChild.nodeValue, "3/13");
  void keep;
});

// ---------- B ----------
test("B N20-1（P1）：畫面矮（≤500）時通用 .modal 可以捲、從上面排、放得下照樣置中；直式、iPad 不受影響", () => {
  /* 11/18 第 30 輪 R30-1：不再只限高度 ≤500，所有高度放不下都能捲（test-r30-1118.js 驗） */
  const U = M("00-util.js"), css = vm.runInNewContext(U.match(/const MDLOW_CSS=([^\n]*\n[^\n]*);\n/)[1]);
  assert.ok(css.startsWith(".modal{overflow-y:auto;align-items:flex-start;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.modal>.box{margin:auto 0;flex:none}"));
  assert.ok(U.includes("mdLowCss();"));
  assert.ok(!rd("xiangqi-db/m.css").includes("max-height:500px){.modal"), "m.css 沒動");
});
test("B N20-2／N20-5／N20-7：古戰場寬但矮的橫式也限圖高；直式拉把點擊區 44；橫式抽屜開著藏小帥", () => {
  const G = M("07g-battle.js"), css = vm.runInNewContext("(" + G.match(/const BTL_LAND_CSS=("[^\n]*"(?:\+"[^\n]*?")*);/)[1] + ")");
  const mq = css.match(/^@media ([^{]+)\{/)[1], ok = (w, h) => mq.split(",").some(p => { const L = /orientation:landscape/.test(p) && w > h, mw = /max-width:819\.98px/.test(p) ? w <= 819.98 : true, mh = /max-height:500px/.test(p) ? h <= 500 : true; return L && mw && mh });
  for (const [w, h] of [[812, 375], [667, 375], [820, 375], [844, 390], [932, 430]]) assert.ok(ok(w, h), w + "×" + h);
  for (const [w, h] of [[1024, 768], [1280, 800], [390, 844]]) assert.ok(!ok(w, h), w + "×" + h + "（寬螢幕、直式照舊）");
  assert.ok(css.includes(".bt2-pic{max-height:40vh}"));
  assert.ok(css.includes('.bt2-hd{position:relative;z-index:2}.bt2-hd::before{content:"";position:absolute;left:0;right:0;top:-8px;bottom:-8px}'), "28＋8＋8＝44（第 21 輪 75：z-index 蓋過下面的戰役圖片）");
  assert.ok(css.includes("@media (orientation:landscape){body:has(.bt2.sh) .xqbot{visibility:hidden!important}}"));
  /* 844×390：標題底在按鈕列上面（同 test-r19 的估算） */
  const H = 390 - 56 - 12, title = 10 + .4 * 390 + 10 + 18 + 2 * 16 * 1.35, nav = 44 + 8 + 2 + 10; assert.ok(title <= H - nav, title + " / " + (H - nav));
});
test("B N20-3／N20-4：卡冊 Lv 100 寫「已滿級」不寫分數；＋星輝、陪你走按鈕 44 高", { skip: SKIP }, () => {
  const P = M("07pty-party.js");
  assert.ok(P.includes('<span>${lv>=100?"✨ 星輝・已滿級":`✨ 星輝 ${got}／${dn}`}</span>'));
  assert.ok(P.includes(".pty-a .btn{flex:1 1 0;width:auto;min-width:0;min-height:44px;"));
  const C = i18nKit(true); assert.equal(C.i18nText("✨ 星輝・已滿級"), "✨ Starshine · max level"); assert.equal(C.i18nText("✨ 星輝 30／160"), "✨ Starshine 30/160");
});
test("B N20-6：星門圍城第一次破關的結算分開標首勝獎勵（成長列另含闖關星）；獎勵邏輯不動", { skip: SKIP }, () => {
  const S = M("07sg2-siege2.js");
  assert.ok(S.includes("${AW.xp?`✨ 第一次破這一關（${esc(td.dnm)}）：首勝獎勵修為 +${AW.xp}（下面的成長列另含闖關星）　`:\"\"}"));
  assert.ok(S.includes('first=win&&!(R.w>(D.g.includes(st.id)?1:0)),xp=first?SG2_XP[td.diff]||0:0'), "sg2Award 沒動");
  const C = i18nKit(true);
  assert.equal(C.i18nText("✨ 第一次破這一關（易）：首勝獎勵修為 +20（下面的成長列另含闖關星）　🌌 星塵 +6（共 6）"), "✨ First clear of this stage (Easy): first-win bonus XP +20 (the growth line below also counts stage stars) 🌌 Stardust +6 (6 total)");
  assert.match(C.i18nText("第一次破這一關（中）：首勝獎勵修為 +30（下面的成長列另含闖關星）　"), /^First clear of this stage \(Medium\): first-win bonus XP \+30/);
});

// ---------- E ----------
test("E N20-1：🗺 總覽英文區域標籤改橫排；搜尋提示、你現在在、對局警告、總覽入口、未開放入口有英文", () => {
  const css = i18nKit(false).I18N_CSS;
  assert.match(css, /html\[lang=en\] #stmOv \.lb\{writing-mode:horizontal-tb;text-orientation:mixed;width:auto!important;height:auto!important;white-space:nowrap;/);
  assert.match(css, /html\[lang=en\] #stmOv \.lb\[data-l=acad\],html\[lang=en\] #stmOv \.lb\[data-l=svc\]\{transform:translateX/);
  const Z = M("07z6-sitemap.js"); assert.ok(Z.includes('placeholder="🔍 搜尋入口，例如「規則」「殘局」"') && Z.includes('return best[0][2]+"｜"+stmNm(best[1])'));
  if (HAS_EXT) { const C = i18nKit(true);
    assert.equal(C.i18nText("對弈茶樓｜挑戰電腦"), "Battle Teahouse | Play the computer"); assert.equal(C.i18nText("服務亭｜設定"), "Service Kiosk | Settings");
    allT(C, ["🔍 搜尋入口，例如「規則」「殘局」", "⚠ 這盤棋還沒下完：看地圖沒關係，換頁前會先問你。", "⚠ 線上對局進行中：看地圖不會停下時鐘，換頁可能算輸。", "雲弈閣（對弈總覽）", "藏譜石窟（學棋總覽）",
      "觀星臺（搭星槎起航會偏航進黑洞，打贏一盤就開放）", "西市（搭星槎起航會偏航進黑洞，打贏一盤就開放）", "找不到這個入口，換個字試試看。"]) }
});
test("E N20-2／N20-6：審查備註照實際行為寫（點一下就走過去、選了目的地才問、取名視窗）；CRLF 算也 ≤4000", { skip: SKIP_IOS }, () => {
  const s = fs.readFileSync(IOS, "utf8").replace(/\r\n/g, "\n"), a = s.indexOf("```\nThank you"), b = s.indexOf("\n```", a + 3), N = s.slice(a + 4, b);
  assert.ok(N.replace(/\n/g, "\r\n").length <= 4000, "CRLF " + N.replace(/\n/g, "\r\n").length);
  assert.ok(N.includes("tap a label and your character walks over and opens it") && N.includes("點標籤，角色走過去打開"));
  assert.ok(!/two taps|再點才進去/.test(N), "不再寫要點兩下");
  assert.ok(N.includes("picking another place on 🗺 first asks") && N.includes("在 🗺 選了別處，會先問「確定前往／取消」"));
  assert.ok(N.includes("a naming window and \"線上大廳安全須知\""));
  /* 11/17 iMac G-4 起 Game Center 那句搬到 Notes 外面「裝了 --gc-widget 才換上」的那一段（目前送審建置沒有 Game Center） */
  assert.ok(!N.includes("(Qianqiu seal album)") && s.slice(b).includes("(Qianqiu seal album)"));
});
test("E N20-6：第一次取名視窗照玩家登記的設定寫（原生版預設關）；網頁版原文", () => {
  const S = M("02-shell.js");
  assert.ok(S.includes('store.get("repOff",typeof setNat==="function"&&setNat())'));
  assert.ok(S.includes("玩家登記預設關閉；你在「設定 → 隱私」打開以後，名字和段位才會定期送給開發者。"));
  assert.ok(S.includes("其他棋友會看到這個名字（例如線上對戰時，對手看到的就是你）。名字和段位也會定期送給開發者，詳見「設定 → 隱私」。"), "網頁版（登記開著）原文");
  if (HAS_EXT) allT(i18nKit(true), ["其他棋友會看到這個名字（例如線上對戰時，對手看到的就是你）。玩家登記預設關閉；你在「設定 → 隱私」打開以後，名字和段位才會定期送給開發者。"]);
});
test("E N20-7：大師對局出處英文＝年份＋英文賽事名（翻不出寫 Grandmaster game）；中文照舊", () => {
  const C = M("07c-canju.js"), src = between(C, "function cjGmEn(s){", "\nfunction cjSrc(") + "\n" + between(C, "function cjSrc(P,long){", "\nconst cjEra=");
  const run = (lang, P) => vm.runInNewContext(src + ";cjSrc(P)", { P, esc: s => String(s), i18nLang: () => lang, provChip: () => "", i18nText: s => ({ "全國象棋團體賽女子組": "National Xiangqi Team Championship, women" })[s] || null });
  assert.equal(run("en", { src: { book: "特級大師對局", year: "1988", title: "全國象棋團體賽女子組" } }), "1988 National Xiangqi Team Championship, women");
  assert.equal(run("en", { src: { book: "特級大師對局", year: "2004", title: "某某盃" } }), "2004 Grandmaster game");
  assert.match(run("zh", { src: { book: "特級大師對局", year: "1988", title: "全國象棋團體賽女子組" } }), /1988 全國象棋團體賽女子組/);
  if (HAS_EXT) { const K = i18nKit(true); for (const t of ["象棋甲級聯賽", "全國象棋個人錦標賽", "全國象棋團體賽女子組", "全國團體賽男子組"]) allT(K, [t]) }
});
/* 11/23 W80：原本寫死「11 月 17 日」，隱私說明每次補一段就要改測試。改成核對「兩份 md 的最後核對日期一樣，而且跟同一份倉庫裡 privacy.html 的最後更新日期同一天」——
   日期換了照樣要三份一起換，比寫死日期多抓到「只改了其中一份」（例如 W80 第一版 family.md 補了功能開關清單卻沒改日期）。 */
test("E N20-8：privacy.md、family.md 最後核對日期兩份一致，跟 privacy.html 的最後更新同一天（11/17 那句只在 App 版）", () => {
  const S = M("05-settings.js"), xqDocVar = vm.runInNewContext(between(S, "function xqDocVar(", "function xqDocBtns(") + ";xqDocVar");
  const hd = (rd("xiangqi-lab/site/privacy.html").match(/最後更新：(\d{4} 年 \d{1,2} 月 \d{1,2} 日)/) || [])[1];
  assert.ok(hd, "privacy.html 找得到最後更新日期");
  /* #79 審查：三份一起改成更早或寫錯的日期（例如 2026 年 1 月 1 日）也會一致——加下限：不早於原本寫死的 11 月 17 日；上限：不晚於今天（臺灣時間） */
  /* 第二輪審查：日期要真的存在（11 月 31 日、11 月 99 日不算）——換成 Date 再換回年月日，三個值都要一樣；年份不寫死，明年照樣成立 */
  const ymd = (s) => { const m = /^(\d{4}) 年 (\d{1,2}) 月 (\d{1,2}) 日$/.exec(s); assert.ok(m, "日期格式：" + s);
    const y = +m[1], mo = +m[2], d = +m[3], t = new Date(Date.UTC(y, mo - 1, d));
    assert.ok(t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d, "日期不存在：" + s); return y * 10000 + mo * 100 + d };
  const tw = new Date(Date.now() + 8 * 3600e3), today = tw.getUTCFullYear() * 10000 + (tw.getUTCMonth() + 1) * 100 + tw.getUTCDate();
  assert.ok(ymd(hd) >= 20261117, "最後更新不早於 2026 年 11 月 17 日：" + hd);
  assert.ok(ymd(hd) <= today, "最後更新不晚於今天（臺灣時間）：" + hd);
  for (const f of ["privacy.md", "family.md"]) {
    const a = rd("xiangqi-db/art/docs/" + f); assert.equal(a, rd("xiangqi-lab/site/data/docs/" + f));
    const d = (a.match(/^最後核對：(\d{4} 年 \d{1,2} 月 \d{1,2} 日)/m) || [])[1];
    assert.equal(d, hd, f + " 的最後核對要跟 privacy.html 的最後更新同一天");
    assert.ok(!xqDocVar(a, false).includes("Game Center"), f + " 網頁版看不到");
  }
});
test("E N20-9：兵印的點選範圍比 44 多撐 1px（換成整數像素後也有 44×44）", () => {
  const FB = M("07s3-feedback.js"), fbp = vm.runInNewContext(between(FB, "function fbpSlotLay(", "/* 類型籤：") + ";({fbpSlotLay})");
  const W = 393, H = W * 1376 / 768, pc = (x, y) => [x / 768 * W, y / 1376 * H], sw = .056 * W, sh = .024 * H, bx = ([x, y], w, h) => ({ x: x - w / 2, y: y - h / 2, w, h }), ss = 23 * 2 / 7.68 / 100 * W;
  const L = [bx(pc(657, 784), sw, sh), bx(pc(716, 781), sw, sh), bx(pc(672, 719), sw, sh), bx(pc(617, 842), ss, ss)], R = fbp.fbpSlotLay(L, { l: 0, r: W, t: 0, b: H }, 44);
  assert.ok(R && R[3].b - R[3].t >= 45 && R[3].r - R[3].l >= 45, JSON.stringify(R[3]));
  for (let i = 0; i < 3; i++) assert.ok(!(Math.min(R[i].r, R[3].r) - Math.max(R[i].l, R[3].l) > .5 && Math.min(R[i].b, R[3].b) - Math.max(R[i].t, R[3].t) > .5), "兵印跟第 " + i + " 個口不重疊");
});
