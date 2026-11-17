// 11/17 第 25 輪（候選版 1514 複驗後）：D V1 結算分析中、V2 讀螢幕頁面導覽、V3 預設名字被名字檢查誤判、V4 名冊、V5 窄螢幕標題；
//   E R25-1 斷網時大廳入口、R25-2 ⋯ 晚到的退回、R25-3／4 離線牌窄螢幕、R25-5 殘篇閣橫幅。
// 標準：App Store 審查 2.1、4.0。不開瀏覽器，vm／純計算。外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法：node --test xiangqi-lab/tools/test-r25-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const I18N = M("07i18n.js");
function i18nKit(withExt) {
  const ctx = { console, Math, JSON, Intl, Date, Map, WeakMap, Set, RegExp, String, Object, Array };
  vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;", ctx);
  vm.runInContext("this.I18N_CSS=" + between(I18N, "const I18N_CSS=", "function i18nCss()").replace(/^const I18N_CSS=/, "").replace(/;\s*$/, "") + ";", ctx);
  if (withExt && HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}
const allT = (C, L) => { for (const s of L) { const t = C.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) } };

test("V3：系統給的預設名字（棋友／Player＋4 碼，大小寫都算）一律不被名字檢查擋，4 碼全是數字也一樣；自由名字照舊檢查", () => {
  const X = M("07x4-lobbysafe.js"), m = X.match(/dflt:(\/[^\n]*?\/)\s/); assert.ok(m, "找得到 dflt"); const re = vm.runInNewContext(m[1]);
  for (const n of ["Player 2763", "Player 0000", "Player 98AD", "Player 98ad", "棋友2763", "棋友77bf", "棋友7F4C"]) assert.ok(re.test(n), n);
  for (const n of ["Player 27631", "Player2763", "我的電話 0912345678", "棋友12345"]) assert.ok(!re.test(n), n);
  assert.ok(X.includes("if(LBN_RE.dflt.test(s)||lbnIsTitle(s))return\"\";"), "預設名字在數字規則之前就放行");
  assert.ok(M("00-util.js").includes('return typeof i18nLang==="function"&&i18nLang()==="en"?"Player ":"棋友"'), "英文預設名字的格式");
  if (HAS_EXT) { const C = i18nKit(true), t = C.i18nText("⚠ 這個名字不能在大廳顯示，別人看到的是稱號「江陵小棋生」"); assert.equal(t, "⚠ This name can't be shown in the lobby; others see the title \"Jiangling Little Scholar\"", "提示裡的稱號也是英文") }
});
test("V1：結算視窗的分析中（📈 正在評這盤、還有 N 步在分析、還有 N 步還沒分析完）英文", { skip: SKIP }, () => {
  const C = i18nKit(true), B = M("08b-cpugame.js");
  assert.ok(B.includes("📈 電腦分析（Pikafish）正在評這盤，評完就知道棋力變化…") && B.includes("📈 還有 ${left} 步在分析，評完就知道棋力變化…") && B.includes("📈 還有 ${left} 步還沒分析完，打開「📊 檢討」會接著分析；評完會算進「我的棋力」。"));
  for (const p of ["📈 ", ""]) allT(C, [p + "電腦分析（Pikafish）正在評這盤，評完就知道棋力變化…", p + "還有 3 步在分析，評完就知道棋力變化…", p + "還有 3 步還沒分析完，打開「📊 檢討」會接著分析；評完會算進「我的棋力」。"]);
  allT(C, ["電腦分析（Pikafish）正在評這盤的每一步，馬上好…", "🔎 電腦分析（Pikafish）正在評這盤的每一步，馬上好…"]);
});
test("V2：讀螢幕換頁播報、本頁地圖、按 W／S 的說明，英文介面都是英文；中文照舊", () => {
  const A = M("11c-a11ysnd.js"), src = between(A, "const AXS_MAP_EN=", "\nfunction sxmCats(") ;
  const run = (lang, h) => vm.runInNewContext(src.replace(/\/\*[\s\S]*?\*\//g, "") + ";axsPageMap(H)", { H: h, i18nLang: () => lang });
  for (const h of ["#/", "#/hub/battle", "#/lobby", "#/hub/learn", "#/db", "#/cpu", "#/pvp", "#/journey/play", "#/redo/play", "#/arena/qin"]) {
    const en = run("en", h), zh = run("zh", h); assert.ok(en && !CJK.test(en) && /^Page map: /.test(en), h + " → " + en); assert.match(zh, /^本頁地圖：/) }
  assert.equal(run("en", "#/settings"), "", "沒有地圖的頁照舊空白");
  assert.ok(A.includes('if(nm)try{if(axsEnOn())axSay("Page: "+axsEnT(nm)+(one?". "+mp:""));else axSay("頁面："+nm+(one?"。"+mp:""))}catch(e){}'));
  const B = M("11b-a11y.js"), w = between(B, "function axmEnOn(){", "\nfunction axmWhereText(o){");
  const wr = o => vm.runInNewContext(w + ";axmWhereEn(O)", { O: o, i18nLang: () => "en", i18nText: s => ({ "線上": "Online" })[s] || null });
  const t = wr({ page: "線上", focus: "", game: { turn: "輪到你", sel: "", last: "" }, map: "Page map: x" });
  assert.equal(t, "You are on: Online. Focus isn't on any button yet; press Tab to start. Your move. No piece selected. No moves yet. Page map: x");
  assert.ok(B.includes('if(axmEnOn())return axmWhereEn(o);') && B.includes('"No game status on this page"'));
});
test("V4／V5／R25-3／R25-4／R25-5：名冊紅名帖不換行、窄螢幕英文標題不在字中間斷、離線牌窄螢幕中英都縮成 📴、英文殘篇閣橫幅留在右邊", () => {
  const css = i18nKit(false).I18N_CSS, W8 = M("07w8-shichen.js");
  assert.match(css, /html\[lang=en\] \.mf-me b\{white-space:nowrap;font-size:11\.5px/);
  assert.match(css, /@media \(max-width:480px\)\{html\[lang=en\] #title\{overflow-wrap:normal!important;word-break:normal;max-height:2\.35em;overflow:hidden!important\}html\[lang=en\] #topbar\.clk-on #title\{max-height:76px\}\}/);
  assert.ok(W8.includes('#topbar #offChip{position:relative;z-index:2}@media (max-width:480px){#topbar #offChip{font-size:0!important;padding:6px 8px!important}#topbar #offChip::before{content:"📴";font-size:15px;line-height:1}}'), "中英都一樣");
  assert.ok(M("05-settings.js").includes('c.setAttribute("aria-label","目前沒有網路，點一下看哪些功能可以用")'), "讀螢幕名稱保留完整");
  assert.match(css, /html\[lang=en\] \.cpl-door\{font-size:13px;padding:8px 12px;max-width:40vw;white-space:normal/);
  /* 橫幅（右 12px、最寬 40vw）跟左下出口（左 6px、最寬 min(52vw,210px)）在 320／375／393／430 都不重疊 */
  /* 第 27 輪掃測試：數值改從原始碼讀（橫幅 right 照 07q2 .cpl-door、兩邊最寬照 I18N_CSS），拿掉原本寫死的「320 寬免檢」；出口左邊 6px 是測試員 E 量的（07w9 照圖上座標放，沒有固定 CSS） */
  const Q2 = M("07q2-coop.js"), doorR = +Q2.match(/\.cpl-door\{position:fixed;right:(\d+)px/)[1], doorVw = +css.match(/html\[lang=en\] \.cpl-door\{[^}]*max-width:(\d+)vw/)[1] / 100;
  const exM = css.match(/html\[lang=en\] \.shp-spot\.ex-spot\{max-width:min\((\d+)vw,(\d+)px\)\}/), exVw = +exM[1] / 100, exPx = +exM[2], EX_LEFT = 6;
  for (const w of [320, 375, 393, 430]) { const doorL = w - doorR - doorVw * w, exR = EX_LEFT + Math.min(exVw * w, exPx); assert.ok(doorL > exR, w + "：橫幅左緣 " + doorL.toFixed(0) + "、出口右緣 " + exR.toFixed(0)) }
});
test("R25-1：斷網時大廳、千秋盃、觀戰、殘篇閣要連線的入口一按就跳離線說明；找對手中途斷網就取消並說明", () => {
  const X = M("07x2-lobbymap.js"), src = between(X, "const LM_NET_HASH=", "\ntry{document.addEventListener(\"click\",lmOffGuard,true);");
  const mk = (online, hash) => { const log = []; const V = { contains: () => true }; const ctx = { log, navigator: { onLine: online }, location: { hash }, document: { getElementById: () => V, querySelector: () => ({ click: () => log.push("cancel") }) },
    offInfo: () => log.push("offInfo"), toast: m => log.push("toast:" + m), vibrate: () => { }, window: { XQNet: { seeking: () => true } }, XQNet: { seeking: () => true }, Date, setTimeout: f => f() };   /* 第 27 輪 R27-1：那句改成晚 120ms 才跳（setTimeout），這裡直接執行 */
    vm.createContext(ctx); vm.runInContext(src, ctx); return ctx };
  const ev = sel => { const e = { stopped: 0, target: { closest: s => s.split(",").includes(sel) ? {} : null }, preventDefault() { this.stopped++ }, stopImmediatePropagation() { this.stopped++ } }; return e };
  for (const sel of ["#lmGong", "#lmList", "#lmAi", "#sk1", "#cupE", ".cpl-roles [data-r]", "[data-w]"]) { const A = mk(false, "#/lobby"), e = ev(sel); assert.equal(A.lmOffGuard(e), true, sel); assert.equal(e.stopped, 2); assert.deepEqual(A.log, ["offInfo"]) }
  { const A = mk(true, "#/lobby"), e = ev("#lmGong"); assert.equal(A.lmOffGuard(e), false, "有網路照常"); assert.equal(e.stopped, 0) }
  { const A = mk(false, "#/settings"), e = ev("#lmGong"); assert.equal(A.lmOffGuard(e), false, "別的頁不管") }
  { const A = mk(false, "#/lobby"), e = ev("#back"); assert.equal(A.lmOffGuard(e), false, "返回、出口照常") }
  { const A = mk(false, "#/lobby"); assert.equal(A.lmOffSeek(), true); assert.equal(A.log[0], "cancel"); assert.match(A.log[1], /^toast:📴 網路斷了，已取消找對手/) }
  assert.ok(X.includes('try{document.addEventListener("click",lmOffGuard,true);addEventListener("offline",()=>setTimeout(lmOffSeek,0))}catch(e){}'));
  const K = i18nKit(false); allT(K, ["📴 網路斷了，已取消找對手；連上網路再配對", "📴 沒有網路：線上大廳要連上網路才能用"]);
});
test("R25-2：popstate 晚到 2～3 秒、中間解鎖後又按了別的項目：不再退第二次，等晚到的那一筆，落到一般頁面才只做新的那一項", async () => {
  const S = M("02-shell.js"), src = between(S, "function topMoreItem(b,f,after){", "\nfunction setTabs(");
  for (const late of [2000, 2600]) {
    const log = [], L = {}; const ctx = { log, history: { state: { xqSheet: 1 }, back() { log.push("back"); setTimeout(() => { ctx.history.state = null; (L.popstate || []).slice().forEach(f => f()) }, late) } },
      closeSheet: a => log.push(a === true ? "close(true)" : "close"), addEventListener: (k, f) => { (L[k] = L[k] || []).push(f) }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter(x => x !== f) }, setTimeout };
    vm.createContext(ctx); vm.runInContext("function topMoreItem(b,f,after){" + src.slice("function topMoreItem(b,f,after){".length), ctx);
    ctx.topMoreItem({ dataset: {} }, () => log.push("回星槎"));
    await new Promise(r => setTimeout(r, 1600)); assert.equal(ctx.topMoreRun.w, false, "1.5 秒解鎖");
    ctx.history.state = { xqSheet: 2 }; ctx.topMoreItem({ dataset: {} }, () => log.push("朝代擂台"));   /* 又開了一張選單（推了一筆卡片紀錄）按別項 */
    await new Promise(r => setTimeout(r, late - 1600 + 150));
    assert.deepEqual(log, ["close(true)", "back", "close(true)", "朝代擂台"], late + "ms：只退一次、只做新的那項");
  }
  /* 落腳的紀錄還是卡片那種：繼續等，落到一般頁面才做 */
  { const log = [], L = {}; const fire = st => { ctx.history.state = st; (L.popstate || []).slice().forEach(f => f()) };
    const ctx = { log, history: { state: { xqSheet: 1 }, back() { log.push("back") } }, closeSheet: () => log.push("close"), addEventListener: (k, f) => { (L[k] = L[k] || []).push(f) }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter(x => x !== f) }, setTimeout };
    vm.createContext(ctx); vm.runInContext("function topMoreItem(b,f,after){" + src.slice("function topMoreItem(b,f,after){".length), ctx);
    ctx.topMoreItem({ dataset: {} }, () => log.push("f")); fire({ xqSheet: 1 }); await new Promise(r => setTimeout(r, 20)); assert.ok(!log.includes("f"), "還在卡片紀錄上不做");
    fire(null); await new Promise(r => setTimeout(r, 20)); assert.equal(log.filter(x => x === "f").length, 1) }
});

test("系統稱號（07x4 LBS_PLACE×LBS_ROLE，576 種）英文介面顯示成「地名 角色」；24 個角色英文不重複；傳出去的名字（07x4 原始碼）不變", { skip: SKIP }, () => {
  const X = M("07x4-lobbysafe.js"), PL = JSON.parse(X.match(/const LBS_PLACE=(\[[^\]]+\]);/)[1]), RO = JSON.parse(X.match(/const LBS_ROLE=(\[[^\]]+\]);/)[1]);
  assert.equal(PL.length, 24); assert.equal(RO.length, 24);
  const C = i18nKit(true), roleEn = new Map();
  for (const p of PL) for (const r of RO) { const t = C.i18nText(p + r); assert.ok(t && !CJK.test(t), p + r + " → " + t); const m = /^(\S+(?: \S+)?) (Little [A-Za-z -]+)$/.exec(t); assert.ok(m, t); roleEn.set(r, m[2]); assert.equal(m[1], C.i18nText(p), "地名照字典：" + p) }
  assert.equal(new Set(roleEn.values()).size, 24, "角色英文不重複");
  assert.equal(C.i18nText("江陵小棋生"), "Jiangling Little Scholar"); assert.equal(C.i18nText("晉陽小行者"), "Jinyang Little Wanderer");
  assert.equal(C.i18nText("金陵小校尉（下棋人）"), "Jinling Little Captain (Player)");
  assert.ok(X.includes('function lbnTitleOf(id,nm){id=id==null?"":String(id);return lbsTitleAt(lbsHash(id||"n:"+String(nm==null?"":nm)))}'), "稱號照舊用代號算（中文），只在英文介面顯示時翻");
});

test("N25-3：棋譜頁、#/db 的對局標題「紅方 對 黑方」英文（你、石桌往事・、Pikafish 第 N 級、積分挑戰、獎勵都翻；玩家自取的名字照原文）；N25-4 只剩 1 步用單數", { skip: SKIP }, () => {
  const C = i18nKit(true);
  assert.ok(M("10-db.js").includes('`${it.red||"？"} 對 ${it.black||"？"}`'), "10-db 標題樣板");
  const L = { "你 對 石桌往事・Pikafish 第6級「業2」": "You vs Stone Table Tales · Pikafish level 6 \"Amateur 2\"", "Pikafish 積分挑戰（入門1） 對 你": "Pikafish ranked challenge (Beginner 1) vs You",
    "你 對 笑面掌櫃・Pikafish 第6級「業2」・🚗獎勵": null, "你 對 Pikafish 第18級「專3・全力」": null, "你 對 ？": "You vs ？", "你 對 江陵小棋生": "You vs Jiangling Little Scholar" };
  for (const [k, v] of Object.entries(L)) { const t = C.i18nText(k); assert.ok(t && !CJK.test(t), k + " → " + t); if (v) assert.equal(t, v) }
  assert.equal(C.i18nText("雲河小棋手 對 你"), "雲河小棋手 vs You".replace("雲河小棋手", C.i18nText("雲河小棋手 對 你").split(" vs ")[0]), "玩家自取的名字照原文");
  assert.match(C.i18nText("雲河小棋手 對 你"), /^雲河小棋手 vs You$/);
  assert.equal(C.i18nText("局面取自 胡榮華 對 楊官璘"), "Position from Hu Ronghua vs. Yang Guanlin", "比較專門的句型照舊優先");
  assert.equal(C.i18nText("📈 還有 1 步在分析，評完就知道棋力變化…"), "📈 1 move still being analyzed; your strength change will show when it's done…");
  assert.equal(C.i18nText("📈 還有 3 步在分析，評完就知道棋力變化…"), "📈 3 moves still being analyzed; your strength change will show when it's done…");
});
