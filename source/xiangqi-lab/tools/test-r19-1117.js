// 11/17 第 19 輪：測試員 D（英文介面、無障礙）P2-1～P2-4、開發者選單 Q3（古戰場橫式右側抽屜）、測試員 E（Apple 審查）E19-1～E19-5。
// 標準：App Store 審查 2.1 完整性、4.0 設計與無障礙。不開瀏覽器，vm／純計算。
//   D P2-1 文牒頁 Version／Developer 空白（05-settings 關於卡片每列多一個藏起來的中文鍵）
//   D P2-2 開場電影字幕、序局視窗的英文；英文字幕可以換行
//   D P2-3 設定的 aria-label：棋盤預覽 svg、省電模式、四顆靜音鈕
//   D P2-4 我的角色、快速對局、古戰場的 aria-label；頂欄 🏠 改用 data-home 找
//   Q3 古戰場橫式（寬大於高）也用右側抽屜
//   E19-1 原生版白名單外的說明鈕不畫；E19-2／E19-3 審查備註、隱私文件；E19-4 青銅匭三個口；E19-5 每日同題題頭、古譜出處
// 外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。用法：node --test xiangqi-lab/tools/test-r19-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const IOS = path.join(ROOT, "xiangqi-ios", "appstore", "metadata.md"), SKIP_IOS = fs.existsSync(IOS) ? false : "沒有 xiangqi-ios/appstore（App Store 上架文案與隱私申報有聯絡人資料，只在開發者電腦）";   /* W69 盤點高 7：原因寫準確（iOS 專案在公開倉庫裡，缺的是 appstore/） */
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;   /* 用跳脫碼（寫檔時相容字會被正規化） */
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };

// ---------- 07i18n：純翻譯段＋畫面掃描段（假的 DOM），同 test-r18-1117.js ----------
const I18N = M("07i18n.js");
function i18nKit(withExt) {
  const ctx = { console, Math, JSON, Intl, Date, Map, WeakMap, Set, RegExp, String, Object, Array, store: { get: (k, d) => k === "lang" ? "en" : d, set() { } } };
  vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;", ctx);
  vm.runInContext(between(I18N, "const I18N_ATTR=", "let I18N_MO=null") + ";this.i18nApply=i18nApply;this.i18nFieldEl=i18nFieldEl;", ctx);
  vm.runInContext("this.I18N_CSS=" + between(I18N, "const I18N_CSS=", "function i18nCss()").replace(/^const I18N_CSS=/, "").replace(/;\s*$/, "") + ";", ctx);
  if (withExt && HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}
function el(name, attrs, kids) {
  const e = { nodeType: 1, nodeName: name.toUpperCase(), _a: Object.assign({}, attrs || {}), _k: [], parentNode: null,
    getAttribute(k) { return k in this._a ? this._a[k] : null }, setAttribute(k, v) { this._a[k] = String(v) }, hasAttribute(k) { return k in this._a },
    classList: { contains: c => String(e._a.class || "").split(/\s+/).includes(c) },
    get firstChild() { return this._k[0] || null }, get textContent() { return this._k.map(k => k.nodeType === 3 ? k.nodeValue : k.textContent).join("") } };
  for (const k of kids || []) { const n = typeof k === "string" ? { nodeType: 3, nodeValue: k } : k; n.parentNode = e; e._k.push(n) }
  e._k.forEach((n, i) => Object.defineProperty(n, "nextSibling", { get: () => e._k[i + 1] || null, configurable: true }));
  return e;
}

// ---------- D P2-1 ----------
test("D P2-1：關於卡片每列第一個 .muted 是藏起來、不翻不轉簡的中文鍵；英文介面文牒頁照樣拿得到版本和開發者", () => {
  const S = M("05-settings.js"), S4 = M("07s4-passmap.js");
  const ak = S.match(/function aboutK\(t\)\{return`[^`]*`\}/); assert.ok(ak, "05-settings 有 aboutK");
  assert.ok(between(S, "function aboutSizes(", "function aboutUsage(").includes(ak[0]), "aboutK 跟 aboutSizes 放在一起（單獨拿 aboutSizes 那段去跑也帶得到）");
  const aboutK = vm.runInNewContext(ak[0] + ";aboutK");
  assert.match(aboutK("版本"), /^<span class="muted" style="display:none" aria-hidden="true" data-noi18n data-nocc>版本<\/span><span class="muted">版本<\/span>$/);
  for (const k of ["App", "開發者", "版本", "整包下載", "這支手機已用"]) assert.ok(S.includes('${aboutK("' + k + '")}'), "關於卡片用 aboutK：" + k);
  assert.ok(!/<span class="muted">(App|開發者|版本|整包下載|這支手機已用)<\/span>/.test(S), "關於卡片不再直接寫 .muted 鍵");
  /* 英文介面：看得到的那個翻成英文、藏起來的那個不動（data-noi18n） */
  const C = i18nKit(false), mk = (k, v) => { const h = el("span", { class: "muted", style: "display:none", "aria-hidden": "true", "data-noi18n": "", "data-nocc": "" }, [k]), s = el("span", { class: "muted" }, [k]), b = el("b", {}, [v]); return el("div", { class: "row" }, [h, s, b]) };
  const rows = [mk("App", "象棋千秋"), mk("開發者", "hungshengc"), mk("版本", "20261117-1200")];
  C.i18nApply(el("body", {}, rows));
  assert.equal(rows[2]._k[1].textContent, "Version"); assert.equal(rows[1]._k[1].textContent, "Developer");
  assert.equal(rows[2]._k[0].textContent, "版本", "藏起來的鍵不翻");
  /* 照 07s4 about() 原樣跑（拿每列第一個 .muted 當鍵、第一個 b 當值） */
  const src = S4.match(/const about=\(\)=>\{[\s\S]*?return R\};/); assert.ok(src, "07s4 about() 沒變");
  const first = (e, f) => { for (const k of e._k) { if (k.nodeType !== 1) continue; if (f(k)) return k; const r = first(k, f); if (r) return r } return null };
  const row = r => ({ querySelector: s => first(r, s === ".muted" ? k => k.classList.contains("muted") : k => k.nodeName === "B") });
  const A = { querySelectorAll: () => rows.map(row) }, ctx = { root: { querySelector: () => A } };
  const R = vm.runInNewContext(src[0] + ";about()", ctx);
  assert.equal(R["版本"], "20261117-1200"); assert.equal(R["開發者"], "hungshengc"); assert.equal(R["App"], "Xiangqi Qianqiu");
  assert.ok(S4.includes('esc(hqVer(R["版本"]))') && S4.includes('esc(R["開發者"]||"")'), "07s4 照舊用中文鍵（沒改 07s4）");
});

// ---------- D P2-2 ----------
test("D P2-2：開場電影字幕（OP_FILM1／2、分頁版、標題、序局提示）、序局視窗的操作說明全部翻得出", { skip: SKIP }, () => {
  const C = i18nKit(true), BH = M("07bh-blackhole.js"), c2 = {}; vm.createContext(c2);
  for (const n of ["BHX_PG", "BHX_TXT", "BHX_FD", "OP_FILM1", "OP_FILM2"]) { let s = BH.slice(BH.indexOf("const " + n + "=")); s = s.slice(0, s.indexOf(";\n") + 1); vm.runInContext(s.replace("const " + n, "this." + n), c2) }
  const L = new Set(), add = x => { if (typeof x === "string") { if (CJK.test(x)) L.add(x) } else if (Array.isArray(x)) x.forEach(add); else if (x && typeof x === "object") Object.values(x).forEach(add) };
  for (const n of ["BHX_PG", "BHX_TXT", "BHX_FD", "OP_FILM1", "OP_FILM2"]) add(c2[n]);
  assert.ok(L.size >= 70, "字幕只有 " + L.size + " 句");
  for (const s of L) { const t = C.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) }
  /* 電影裡說書人那行是「說書人：」＋一句 */
  for (const S of [c2.OP_FILM1, c2.OP_FILM2]) for (const sh of S.shots) if (sh.nar) { const t = C.i18nText("說書人：" + sh.nar[1]); assert.ok(t && t.startsWith("Storyteller: ") && !CJK.test(t), sh.nar[1] + " → " + t) }
  assert.equal(C.i18nText("千秋之前，"), "Long before the ages,");
  assert.equal(C.i18nText("一聲巨響，天裂了。"), "With a great boom, the sky split open.");
  /* 序局視窗（bhxIntro）的字跟字典對得上 */
  const intro = between(BH, "function bhxIntro(){", "function bhxGo(){");
  assert.ok(intro.includes("黑洞殘局，只差最後一手：紅方先走，一步將死黑將。走錯也不算輸。<br>說書人：${esc(BHX_TXT.open)}"));
  for (const s of ["星樞棋局・序局", "星盤展開，棋路成光。七星化作紅方棋子。", "✦ 星樞：「" + c2.BHX_TXT.start + "」", "黑洞殘局，只差最後一手：紅方先走，一步將死黑將。走錯也不算輸。", "說書人：" + c2.BHX_TXT.open]) {
    const t = C.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) }
  assert.match(C.i18nText("黑洞殘局，只差最後一手：紅方先走，一步將死黑將。走錯也不算輸。"), /Red moves first and checkmates the Black General in one move/);
});
test("D P2-2：英文字幕可以換行（字級照中文字數算、原本不換行）；只在 html[lang=en]", () => {
  const css = i18nKit(false).I18N_CSS;
  assert.match(css, /html\[lang=en\] #bhxPg \.bx-l,[^{]*\{white-space:normal;letter-spacing:\.02em;max-width:min\(92vw,640px\)/);
  assert.match(css, /html\[lang=en\] #bhxPg \.bx-l\{font-size:min\(var\(--bxfs,24px\),22px\)/);
  for (const r of css.split("\n")) assert.match(r, /^(@media [^{]+\{)?html\[lang=en\] /);
  assert.ok(M("07bh-blackhole.js").includes('tx.innerHTML=(S.say||[]).map(([,t])=>`<div class="bx-l">${esc(t)}</div>`)'), "字幕是 DOM 文字（MutationObserver 換英文）");
});

// ---------- D P2-3 ----------
test("D P2-3：svg 本身的 aria-label 翻成英文（棋盤預覽），裡面的棋子字、子元素不動；繁中不動", () => {
  const C = i18nKit(false);
  const pc = el("text", { "aria-label": "紅帥" }, ["帥"]), svg = el("svg", { role: "img", "aria-label": "棋盤" }, [pc]);
  C.i18nApply(el("body", {}, [el("div", { class: "card" }, [svg])]));
  assert.equal(svg.getAttribute("aria-label"), "Board");
  assert.equal(pc.firstChild.nodeValue, "帥", "棋子字不翻"); assert.equal(pc.getAttribute("aria-label"), "紅帥", "svg 裡的子元素照舊跳過");
  assert.equal(C.i18nFieldEl(svg), true); assert.equal(C.i18nFieldEl(pc), false);
  const keep = el("svg", { "aria-label": "棋盤", "data-noi18n": "" }); C.i18nApply(el("body", {}, [keep])); assert.equal(keep.getAttribute("aria-label"), "棋盤");
  assert.ok(M("01-board.js").includes('svg.setAttribute("role","img");svg.setAttribute("aria-label","棋盤")'));
  assert.ok(I18N.includes("/^(INPUT|TEXTAREA|SVG|CANVAS)$/i.test(el.nodeName)"));   /* 第 21 輪：canvas 也只翻屬性 */
});
test("D P2-3：省電模式、四顆靜音鈕的 aria-label 有英文", { skip: SKIP }, () => {
  const C = i18nKit(true), T = s => C.i18nText(s);
  assert.equal(T("3D 園子省電模式"), "3D garden power saving");
  assert.ok(M("06-cpu.js").includes('aria-label="3D 園子省電模式"'));
  /* 11c sxmRow：aria-label="${c[1]}靜音"，c[1] 是 sxmCats 的名稱 */
  assert.ok(M("11c-a11ysnd.js").includes('aria-label="${c[1]}靜音"'));
  const L = { "棋子音效靜音": "Mute piece sounds", "提示音靜音": "Mute cue sounds", "語音報棋靜音": "Mute voice calls", "背景音樂與鼓聲靜音": "Mute background music and drums" };
  for (const [k, v] of Object.entries(L)) assert.equal(T(k), v);
});

// ---------- D P2-4 ----------
test("D P2-4：我的角色牆上的東西（名稱＋會變的數字）、快速對局視角鈕、古戰場的 aria-label 都翻得出", { skip: SKIP }, () => {
  const C = i18nKit(true), T = s => C.i18nText(s);
  const L = { "改線上名字": "Change online name", "珍品 0／130": "Treasures 0/130", "珍品 12／130": "Treasures 12/130", "棋盤 0": "Board 0", "棋譜 3": "Library 3",
    "消寒圖 冬至還有 35 天": "Winter-dispelling chart: 35 days until the winter solstice", "輿圖 0／13": "Map 0/13", "千秋印譜 金印 0／13": "Qianqiu seal album: 0/13 gold seals",
    "棋罐 0": "Piece jar 0", "提示棋 9": "Hint tokens 9", "千秋大百科 40%": "Qianqiu encyclopedia 40%", "修為 Lv 3": "XP Lv 3", "棋史卡 2／20": "History cards 2/20",
    "切換成平視": "Switch to eye-level view", "切換成俯視": "Switch to top-down view", "回首頁": "Home", "圖例和玩法說明": "Legend and how to play", "拉開或收起": "Expand or collapse" };
  for (const [k, v] of Object.entries(L)) assert.equal(T(k), v, k);
  for (const n of [0, 7, 81]) { const t = T("消寒圖 " + n + "／81"); assert.ok(t && !CJK.test(t), t) }
  /* 原始碼對得上 */
  const Z = M("07z4-studymap.js");
  assert.ok(Z.includes('b.setAttribute("aria-label",(b.querySelector(".mz-lb b")||b).textContent+(t!=null&&t!==""?" "+t:""))'));
  assert.ok(Z.includes('lbl("mzSeal",`金印 ${sealGoldN()}／13`)'));
  assert.ok(M("06-cpu.js").includes('b.setAttribute("aria-label","切換成"+nx[1])'));
  assert.ok(M("07g-battle.js").includes('aria-label="圖例和玩法說明">ⓘ</button>'));
});
test("D P2-4：頂欄 🏠 標 data-home，籤筒、出口改用 [data-home] 藏；I18N_AGUARD 不再保留回首頁", () => {
  const Sh = M("02-shell.js"), G = between(I18N, "const I18N_AGUARD=", ";");
  assert.ok(Sh.includes('h.title="回首頁";h.setAttribute("aria-label","回首頁");h.dataset.home="1";'));
  assert.ok(Sh.includes('if(label==="回首頁")b.dataset.home="1";'));
  assert.ok(M("07t3-tabtube.js").includes("body.tt-on #topRight .ib[data-home]{display:none}"));
  assert.ok(M("07w9-exits.js").includes("body.xq-exit #topRight .ib[data-home]{display:none!important}"));
  assert.ok(!G.includes("回首頁"), G);
  /* 程式裡沒有別處再用 aria-label／title＝回首頁 找按鈕（只剩上面兩條保留的舊選擇器） */
  const D = path.join(ROOT, "xiangqi-db", "m"), hits = [];
  for (const f of fs.readdirSync(D).filter(f => f.endsWith(".js"))) { const s = M(f); for (const m of s.matchAll(/(querySelector(?:All)?\([^)]*|\[)(aria-label|title)=\\?["']回首頁/g)) hits.push(f + ":" + m.index) }
  assert.equal(hits.filter(h => !/^07(t3|w9)/.test(h)).length, 0, hits.join(", "));
});
test("D P2-4：主要頁面的 aria-label／title 純文字值，英文介面都翻得出（07i18n 外掛字典合起來掃）", { skip: SKIP }, () => {
  const C = i18nKit(true), D = path.join(ROOT, "xiangqi-db", "m"), AG = ["回星槎", "聲控走棋", "回棋盤模式", "去園子下棋（3D）"], miss = [];
  for (const f of fs.readdirSync(D).filter(f => f.endsWith(".js") && f !== "07i18n.js")) {
    const T = M(f);
    for (const re of [/(?<![-\w])aria-label=\\?"([^"\\$]*)\\?"/g, /setAttribute\(\s*["']aria-label["']\s*,\s*["']([^"'$]*)["']\s*\)/g]) for (const m of T.matchAll(re)) {
      const v = m[1].trim(); if (!v || !CJK.test(v) || AG.includes(v)) continue; const t = C.i18nText(v); if (t == null || CJK.test(t)) miss.push(f + "：" + v) } }
  assert.deepEqual(miss, []);
});

// ---------- Q3 古戰場橫式右側抽屜 ----------
test("Q3：古戰場橫式（812×375、844×390、667×375）用右側抽屜；直式照舊從下面升起", () => {
  const G = M("07g-battle.js");
  const css = vm.runInNewContext("(" + G.match(/const BTL_LAND_CSS=("[^\n]*");/)[1] + ")");
  assert.match(css, /^@media \(orientation:landscape\) and \(max-width:819\.98px\),\(orientation:landscape\) and \(max-height:500px\)\{/);   /* 第 20 輪 B N20-2：寬但矮的橫式也套 */
  for (const r of [".bt2-map{right:min(420px,42%)}", ".bt2-sh,.bt2-sh.full{left:auto;right:0;top:0;bottom:0;width:min(420px,42%);height:auto;", ".bt2-hd{display:none}", ".bt2.sh .bt2-lst{display:block}",
    ".bt2-info{right:calc(min(420px,42%) + 10px)}", ".bt2-vt{right:calc(min(420px,42%) + 10px)}", ".bt2-pic{max-height:40vh}", ".bt2:not(.sh) .bt2-map{right:0}"]) assert.ok(css.includes(r), r);
  assert.ok(G.includes('.bt2:not(.sh) .bt2-vt{right:10px}}"+BTL_LAND_CSS;document.head.append(s)}'), "btCss 一起注入（不改 m.css）");
  assert.ok(G.includes("const wide=btWide;"));
  /* btWide：照查詢字串算（假的 matchMedia：逗號＝或） */
  const src = G.match(/function btWide\(\)\{[^\n]*?\}catch\(e\)\{return false\}\}/)[0];
  const wideAt = (w, h) => vm.runInNewContext(src + ";btWide()", { matchMedia: q => ({ matches: q.split(",").some(p => { p = p.trim(); const a = /\(min-width:(\d+)px\)/.exec(p); if (a) return w >= +a[1]; if (/orientation:landscape/.test(p)) return w > h; return false }) }) });
  for (const [w, h] of [[812, 375], [844, 390], [667, 375], [1024, 768], [1280, 800]]) assert.equal(wideAt(w, h), true, w + "×" + h);
  for (const [w, h] of [[393, 852], [375, 667], [430, 932]]) assert.equal(wideAt(w, h), false, w + "×" + h);
  /* 版面估算：頂欄 56、fit 在寬版再扣 12；抽屜 min(420,42%) 寬；圖最多 40vh；標題（最多兩行 16px×1.35）的底要在按鈕列（44＋上下 8＋2＋上邊距 10）上面 */
  for (const [w, h] of [[812, 375], [844, 390], [667, 375]]) {
    const H = h - 56 - 12, dw = Math.min(420, w * .42), mapW = w - dw, pic = Math.min(.4 * h, dw * 9 / 16 + 999), titleBottom = 10 + Math.min(pic, .4 * h) + 10 + 18 + 2 * 16 * 1.35, nav = 44 + 8 + 2 + 10;
    assert.ok(mapW >= 360, "地圖寬 " + mapW); assert.ok(dw >= 270, "抽屜寬 " + dw); assert.ok(titleBottom <= H - nav, w + "×" + h + "：標題底 " + titleBottom.toFixed(0) + " > " + (H - nav));
  }
  assert.ok(G.includes("land:wide()||innerWidth>innerHeight"), "橫式只標編號照舊");
});

// ---------- E19-1 ----------
test("E19-1：原生版白名單外的 [data-xqdoc] 全站藏起來；英文介面說明、各級怎麼下、音效設計各自也不畫", () => {
  const S = M("05-settings.js");
  const okL = vm.runInNewContext(S.match(/const XQDOC_NATOK=(\[[^\]]*\]);/)[1]);
  const fn = between(S, "function xqDocNatCss(){", "xqDocNatCss();");
  const doc = { head: { append(x) { this.k = x } }, getElementById: () => null, createElement: () => ({}) };
  vm.runInNewContext(fn + ";xqDocNatCss()", { setNat: () => true, document: doc, XQDOC_NATOK: okL });
  const css = doc.head.k.textContent;
  assert.equal(css, "[data-xqdoc]" + okL.map(k => ':not([data-xqdoc="' + k + '"])').join("") + "{display:none!important}");
  const web = { head: { append(x) { this.k = x } }, getElementById: () => null, createElement: () => ({}) };
  vm.runInNewContext(fn + ";xqDocNatCss()", { setNat: () => false, document: web, XQDOC_NATOK: okL }); assert.equal(web.head.k, undefined, "網頁版不藏");
  /* 全部模組用到的 data-xqdoc 值：不在白名單的，原生版都會被藏（i18n、ai、sound 另外在原始碼不畫） */
  const D = path.join(ROOT, "xiangqi-db", "m"), used = new Set();
  for (const f of fs.readdirSync(D).filter(f => f.endsWith(".js"))) for (const m of M(f).matchAll(/data-xqdoc="([a-z0-9-]+)"/g)) used.add(m[1]);
  for (const k of ["i18n", "ai", "sound"]) { assert.ok(used.has(k)); assert.ok(!okL.includes(k), k + " 不在白名單") }
  assert.ok(I18N.includes('typeof xqDocShow==="function"&&!xqDocShow("i18n")'));
  assert.ok(M("08b-cpugame.js").includes('xqDocShow("ai")'));
  assert.ok(M("11c-a11ysnd.js").includes('xqDocShow("sound")'));
});

// ---------- E19-2／E19-3 ----------
test("E19-2：隱私、家長文件用 app-only 補 Game Center、每日提醒、小工具、兒童模式不回報；兩份一致；網頁版看不到", () => {
  const S = M("05-settings.js"), xqDocVar0 = vm.runInNewContext(between(S, "function xqDocVar(", "function xqDocBtns(") + ";xqDocVar");
  /* 11/17 iMac G-4 起 Game Center、小工具的句子另外包 gc-only／widget-only（07gc-native gcnDocFeat，照 XQNative.has 決定）；這裡驗「兩個外掛都在」的原生 App，沒有外掛的細測在 test-imac-g1514.js */
  const G = M("07gc-native.js"), feat = vm.runInNewContext(between(G, "function gcnDocFeat(t,keep){", "\ntry{if(typeof xqDocVar") + ";gcnDocFeat"), xqDocVar = (t, nat) => xqDocVar0(feat(t, { gc: true, widget: true }), nat);
  for (const f of ["privacy.md", "family.md"]) {
    const a = rd("xiangqi-db/art/docs/" + f), b = rd("xiangqi-lab/site/data/docs/" + f); assert.equal(a, b, f + " 兩份要一致");
    const nat = xqDocVar(a, true), web = xqDocVar(a, false);
    assert.ok(nat.includes("Game Center") && !web.includes("Game Center"), f);
    assert.ok(/每日提醒[^\n]*本機/.test(nat) && /今日茶單/.test(nat), f);
  }
  const P = xqDocVar(rd("xiangqi-db/art/docs/privacy.md"), true);
  assert.match(P, /### 13\. Game Center 成就、每日提醒、桌面小工具/); assert.match(P, /我們的伺服器也收不到/); assert.match(P, /兒童模式開著時，App 不回報 Game Center 成就/);
  assert.match(P, /第 13 項 Game Center 成就不回報/);
  assert.match(xqDocVar(rd("xiangqi-db/art/docs/family.md"), true), /Game Center 成就：不回報/);
});
test("E19-2／E19-3：審查備註 Native 段寫 Game Center、每日提醒、今日茶單的位置；設定標籤點兩下、對局中換頁確認；Notes 在 4000 字內", { skip: SKIP_IOS }, () => {
  const s = fs.readFileSync(IOS, "utf8").replace(/\r\n/g, "\n"), a = s.indexOf("```\nThank you"), b = s.indexOf("\n```", a + 3), N = s.slice(a + 4, b);
  assert.ok(N.length <= 4000, "Notes " + N.length + " 字"); assert.ok(s.includes("目前 " + N.length + " 字（Windows 換行算 " + N.replace(/\n/g, "\r\n").length + " 字），上限 4000"));   /* 第 20 輪：字數寫 LF 和 CRLF 兩種 */
  for (const k of ["🔔 每天提醒我做每日同題", "Remind me about the Daily Puzzle", "local notification",
    "再點一次，直接進去", "Tap again to go straight in", "確定前往", "取消", "This game will be saved"]) assert.ok(N.includes(k), k);
  /* 11/17 iMac G-4 起：Game Center、桌面小工具只在裝了 --gc-widget 的建置才有 → 不寫進 Notes，放在 Notes 後面「有那兩個外掛才換上」的那一段 */
  const after = s.slice(b);
  for (const k of ["🎮 Game Center 成就", "Game Center achievements", "珍品冊", "千秋印譜", "今日茶單", "Today's tea"]) { assert.ok(!N.includes(k), "Notes 不寫：" + k); assert.ok(after.includes(k), "條件段落有：" + k) }
  assert.match(after, /只有裝了 `node scripts\/install-native\.js --gc-widget`/);
  const AP = fs.readFileSync(path.join(ROOT, "xiangqi-ios", "appstore", "app-privacy.md"), "utf8");
  assert.match(AP, /Game Center 成就[^\n]*不算追蹤/); assert.match(AP, /\*\*只有裝了 --gc-widget 的建置才有\*\*/);
  /* 備註裡的字跟程式對得上 */
  assert.ok(M("07w-shipwalk.js").includes('e.textContent="再點一次，直接進去"'));
  assert.ok(M("07z6-sitemap.js").includes("這盤會先存起來，回來可以接著下。要去「${name}」嗎？`,go,\"確定前往\")"));
  assert.ok(M("07gc-native.js").includes('"🔔 每天提醒我做每日同題"') && M("07gc-native.js").includes('"🎮 Game Center 成就"'));
});

// ---------- E19-4 ----------
const FB = M("07s3-feedback.js");
const fbp = vm.runInNewContext(between(FB, "function fbpSlotLay(", "/* 類型籤：") + ";({fbpSlotLay,fbpSlotOk})");
const fbBoxes = (W, x0) => { const H = W * 1376 / 768, pc = (x, y) => [x / 768 * W, y / 1376 * H], sw = .056 * W, sh = .024 * H, bx = ([x, y], w, h) => ({ x: x - w / 2 + (x0 || 0), y: y - h / 2, w, h });
  const ss = 23 * 2 / 7.68 / 100 * W; return [bx(pc(657, 784), sw, sh), bx(pc(716, 781), sw, sh), bx(pc(672, 719), sw, sh), bx(pc(617, 842), ss, ss)] };
const okRects = (H, B, M) => { for (const q of H) { assert.ok(q.l >= B.l - .5 && q.r <= B.r + .5, "超出畫面：" + JSON.stringify(q)); assert.ok(q.r - q.l >= M - .5 && q.b - q.t >= M - .5, "不到 44：" + JSON.stringify(q)) }
  for (let i = 0; i < H.length; i++) for (let j = i + 1; j < H.length; j++) { const p = H[i], q = H[j]; assert.ok(!(Math.min(p.r, q.r) - Math.max(p.l, q.l) > .5 && Math.min(p.b, q.b) - Math.max(p.t, q.t) > .5), "重疊：" + i + "," + j) } };
test("E19-4：青銅匭三個口在 393 寬都在畫面內、各自至少 44×44、互不重疊（有兵印、兵印量不到都一樣）", () => {
  for (const W of [393, 375, 430, 320]) {
    const L = fbBoxes(W), B = { l: 0, r: W, t: 0, b: W * 1376 / 768 }, M = 44;
    for (const E of [L, L.slice(0, 3)]) { const H = fbp.fbpSlotLay(E, B, M); assert.ok(H, W + "：排得出來（" + E.length + " 塊）"); okRects(H.slice(0, 3), B, M); if (H[3]) okRects(H, B, M) }
  }
  /* 圖比畫面寬（頁面往右超出 12px）：看得到的右緣 393 → 招諫右緣不超過 393 */
  const L = fbBoxes(405), B = { l: 0, r: 393, t: 0, b: 405 * 1376 / 768 }, H = fbp.fbpSlotLay(L, B, 44); assert.ok(H); okRects(H.slice(0, 3), B, 44); assert.ok(H[1].r <= 393);
  /* 檢查本身：超出、太小、重疊都判不合格 */
  assert.equal(fbp.fbpSlotOk([{ l: 0, r: 44, t: 0, b: 44 }, { l: 44, r: 88, t: 0, b: 44 }, { l: 0, r: 44, t: 44, b: 88 }], { l: 0, r: 393, t: 0 }, 44), true);
  assert.equal(fbp.fbpSlotOk([{ l: 0, r: 44, t: 0, b: 44 }, { l: 360, r: 399, t: 0, b: 44 }, { l: 0, r: 44, t: 44, b: 88 }], { l: 0, r: 393, t: 0 }, 44), false);
  assert.equal(fbp.fbpSlotOk([{ l: 0, r: 39, t: 0, b: 45 }, { l: 44, r: 88, t: 0, b: 44 }, { l: 0, r: 44, t: 50, b: 94 }], { l: 0, r: 393, t: 0 }, 44), false);
  assert.equal(fbp.fbpSlotOk([{ l: 0, r: 44, t: 0, b: 44 }, { l: 40, r: 84, t: 0, b: 44 }, { l: 0, r: 44, t: 44, b: 88 }], { l: 0, r: 393, t: 0 }, 44), false);
  /* fbpHit：右緣再看 documentElement.clientWidth、visualViewport；三個口就用 fbpSlotLay（兵印量不到也一樣）；退回 r07Solve 時推回畫面內 */
  assert.ok(FB.includes("vr0=fbpVisR(V)") && FB.includes("de.clientWidth") && FB.includes("vv.offsetLeft"));
  assert.ok(FB.includes("let R=S.length===3?fbpSlotLay(L,B,M):null;"));
  assert.ok(FB.includes("q.r>B.r?q.r-B.r:q.l<B.l?q.l-B.l:0"));
});

// ---------- E19-5 ----------
test("E19-5：每日同題題頭（編號、一口／一盞／一壺、再解一次／補玩）和古譜出處（書名＋局號）都翻成英文", { skip: SKIP }, () => {
  const C = i18nKit(true), T = s => C.i18nText(s);
  assert.equal(T("🌏 每日同題 #5・☕一口"), "🌏 Daily Puzzle #5 · ☕One sip");
  assert.equal(T("每日同題 #12・🍵一盞"), "Daily Puzzle #12 · 🍵One cup");
  assert.equal(T("🌏 每日同題 #128・🫖一壺"), "🌏 Daily Puzzle #128 · 🫖One pot");
  assert.equal(T("🌏 每日同題 #5・☕一口（再解一次，不改成績）"), "🌏 Daily Puzzle #5 · ☕One sip (re-solve, result unchanged)");
  assert.equal(T("🌏 每日同題 #5・🍵一盞（補玩，不算連續天數）"), "🌏 Daily Puzzle #5 · 🍵One cup (catch-up, doesn't count toward the streak)");
  const DQ = M("07dq-daily.js");
  assert.ok(DQ.includes("<b>🌏 每日同題 #${dqNo(k)}・${sl[1]}${sl[0]}${re?\"（再解一次，不改成績）\":late?\"（補玩，不算連續天數）\":\"\"}</b>"));
  assert.ok(DQ.includes('SLOT:{sip:["一口","☕"],cup:["一盞","🍵"],pot:["一壺","🫖"]}'));
  /* 07c cjSrc：英文介面寫「《書名》 No. 局號」，字典翻成英文書名；中文照舊〈題名〉 */
  const src = between(M("07c-canju.js"), "function cjSrc(P,long){", "\nconst cjEra=");
  const run = (lang, P, long) => vm.runInNewContext(src + ";cjSrc(P,long)", { P, long, esc: s => String(s), i18nLang: () => lang, provChip: () => "" });
  const P = { src: { book: "適情雅趣", title: "選將練兵", no: "第 163 局" } };
  assert.equal(run("en", P), "《適情雅趣》 No. 163"); assert.equal(run("zh", P), "《適情雅趣》〈選將練兵〉");
  assert.equal(run("en", { src: { book: "爛柯神機", title: "蛟龍入海", no: "柯12" } }), "《爛柯神機》 No. 12");
  for (const [bk, en] of [["適情雅趣", "Shiqing Yaqu"], ["橘中秘", "Juzhong Mi"], ["爛柯神機", "Lanke Shenji"], ["夢入神機", "Mengru Shenji"], ["淵深海闊", "Yuanshen Haikuo"], ["竹香齋", "Zhuxiangzhai"], ["蕉竹齋", "Jiaozhuzhai"], ["心武殘編", "Xinwu Fragments"]])
    assert.equal(T("《" + bk + "》 No. 7"), "\"" + en + "\" No. 7");
});
