// 11/17 第 24 輪（候選版 1427 複驗後，放進下一版）：U1 斷網提示與頂欄、U2 對局評語與結算、U3 開局名橫幅、U4 讀螢幕播報、U5「正在對戰」、U6 名冊版面、E 觀察 97（⋯ 等太久解鎖）。
// 標準：App Store 審查 2.1、4.0。不開瀏覽器，vm／純計算。外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法：node --test xiangqi-lab/tools/test-r24-1117.js
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
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;this.I18N_GUARD=I18N_GUARD;", ctx);
  vm.runInContext("this.I18N_CSS=" + between(I18N, "const I18N_CSS=", "function i18nCss()").replace(/^const I18N_CSS=/, "").replace(/;\s*$/, "") + ";", ctx);
  if (withExt && HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}
const allT = (C, L) => { for (const s of L) { const t = C.i18nText(s); assert.ok(t && !CJK.test(t), s + " → " + t) } };

test("U1：斷網提示、說明視窗英文（冒號後有空格）；頂欄離線牌疊在時辰鐘上面、窄螢幕英文只留 📴", { skip: SKIP }, () => {
  const C = i18nKit(true), S = M("05-settings.js");
  assert.ok(S.includes('toast("📴 沒有網路了：跟電腦下棋、做題照常，線上對戰要等網路回來")'), "05-settings 原文（沒改 05-settings）");
  allT(C, ["📴 沒有網路了：跟電腦下棋、做題照常，線上對戰要等網路回來", "目前沒有網路", "照常可以用：", "要等有網路：", "網路回來後，這個牌子會自己消失。", "目前沒有網路，點一下看哪些功能可以用", "📴 離線", "✅ 網路回來了"]);
  const w = C.i18nText("照常可以用：") + C.i18nText("跟電腦下棋、殘局和各種題目、石桌往事、複盤，還有下載過的棋譜庫。"), n = C.i18nText("要等有網路：") + C.i18nText("線上對戰・觀戰、千秋盃、意見回饋、換手機、檢查新版，以及還沒下載過的棋譜和圖片。");
  assert.match(w, /^Still works: \S/); assert.match(n, /^Needs a connection: \S/); assert.ok(!CJK.test(w + n));
  assert.ok(S.includes('<p style="text-align:left"><b>照常可以用：</b>跟電腦下棋') && S.includes('<b>要等有網路：</b>線上對戰'), "粗體後面接的那段");
  assert.ok(M("07w8-shichen.js").includes("#topbar.clk-on .clk-box{display:flex}#topbar #offChip{position:relative;z-index:2}"), "牌子在時辰鐘（z-index:1）上面，中英都一樣");
  assert.match(C.I18N_CSS, /@media \(max-width:480px\)\{html\[lang=en\] #offChip\{font-size:0!important;padding:6px 8px!important\}html\[lang=en\] #offChip::before\{content:"📴";font-size:15px;line-height:1\}\}/);
});
test("U2：評語泡泡「⚠ 這手讓對方下一手可以吃你的…（著法）。」整句英文、著法 WXF；結算「先看這一步」英文整句（不黏字）、按鈕 View ›；分析中提示", { skip: SKIP }, () => {
  const C = i18nKit(true);
  const P = ["車", "俥", "馬", "傌", "炮", "砲", "兵", "卒", "相", "象", "仕", "士"];
  for (const z of P) for (const pre of ["⚠ ", ""]) { const t = C.i18nText(pre + "這手讓對方下一手可以吃你的" + z + "（炮五進四）。"); assert.ok(t && !CJK.test(t) && t.includes("(C5+4)"), z + " → " + t); allT(C, [pre + "這手讓對方下一手可以吃你的" + z + "。"]) }
  allT(C, ["⚠ 這手讓對方下一手就能將死你（炮五進四）。", "⚠ 這手讓對方 3 步內就能將死你，從「炮五進四」開始。", "⚠ 這手讓對方下一手可以將軍你（炮五進四）。", "看 ›", "🔎 電腦分析（Pikafish）正在評這盤的每一步，馬上好…"]);
  const B = M("08b-cpugame.js");
  assert.ok(B.includes('e.innerHTML=rdxEn()?`<span>🔎 Look at this move first: <b>move ${b.ply}${b.cn?" \\""+esc(rdxMv(b.cn))+"\\"":""}</b> (${esc(rdxQ(b.q))})'));
  assert.ok(B.includes('font-weight:900">View ›</span>`:`<span>🔎 這盤先看這一步：'));
  assert.ok(M("05-settings.js").includes("if(x&&!/[kK]/.test(x)&&C.sideOf(x)===side)return`這手讓對方下一手可以吃你的${C.NAMES[side][x.toUpperCase()]}${W}。`"), "樣板沒變");
});
test("U3：開局名橫幅小標（開局／應對、紅方／黑方印）英文；英文開局名縮字可換行", () => {
  const C = i18nKit(true);
  for (const s of ["開局", "紅方", "黑方"]) allT(C, [s]);
  if (HAS_EXT) allT(C, ["應對"]);
  const B = M("01-board.js"); assert.ok(B.includes('["紅方開局",o]') && B.includes('["黑方應對",d]'));
  assert.match(C.I18N_CSS, /html\[lang=en\] \.opfx \.opc\{white-space:normal;max-width:92vw;box-sizing:border-box\}html\[lang=en\] \.opfx \.txt b\{font-size:\.62em/);
});
test("U4：讀螢幕播報區的固定句（載入中／完成、象棋引擎、靜音切換、棋鐘提醒）英文", { skip: SKIP }, () => {
  const C = i18nKit(true), A = M("11c-a11ysnd.js");
  assert.ok(A.includes('return said?lb+"完成":""') && A.includes('return S.label+"中…"'));
  const labels = ["載入", "下載", ...[...A.matchAll(/axsBusy\("([^"]+)"/g)].map(m => m[1])];
  for (const l of labels) allT(C, [l + "中…", l + "完成"]);
  allT(C, ["全部聲音：靜音", "全部聲音：恢復", "棋子聲：靜音", "棋子聲：恢復", "你的時間到了，超時", "對手的時間剩 10 秒", "你的時間剩 1 分鐘"]);
});
test("U5：「正在對戰」從 I18N_GUARD 拿掉、內建字典有英文；02-shell 那一區標 data-sec，07x3 名冊照標記找", () => {
  const K = i18nKit(false);
  assert.ok(!K.I18N_GUARD.includes("正在對戰")); assert.equal(K.i18nText("正在對戰"), "Playing now"); if (HAS_EXT) assert.equal(i18nKit(true).i18nText("⚔ 正在對戰（3 盤）"), "⚔ Playing now (3 games)");
  assert.ok(M("02-shell.js").includes('<div class="sec-t" data-sec="live">${ETIMG("h_battle","","⚔")} 正在對戰'));
  assert.ok(M("07x3-rostermap.js").includes("sec=lb.querySelector('.sec-t[data-sec=\"live\"]')||"));
  /* 還有沒有別的程式靠「正在對戰」這幾個字找元素 */
  const D = path.join(ROOT, "xiangqi-db", "m"), hits = [];
  for (const f of fs.readdirSync(D).filter(f => f.endsWith(".js") && f !== "07i18n.js")) { const s = M(f).replace(/\/\*[\s\S]*?\*\//g, ""); for (const m of s.matchAll(/(includes|indexOf|test|===)\(?["'`]正在對戰/g)) hits.push(f + ":" + m.index) }
  assert.deepEqual(hits.filter(h => !h.startsWith("07x3")), []);
});
test("U6：名冊頁英文標籤、書頁、紅名帖可以換行；回天井的標籤靠右對齊", () => {
  const css = i18nKit(false).I18N_CSS;
  assert.match(css, /html\[lang=en\] \.mf-hs span\{white-space:normal;max-width:34vw;/); assert.match(css, /html\[lang=en\] #mfDoor span\{left:auto;right:0;transform:translateY\(-100%\)\}/);
  assert.match(css, /html\[lang=en\] \.mf-bd b,html\[lang=en\] \.mf-bd \.mf-bm\{white-space:normal;overflow:visible;text-overflow:clip;/); assert.match(css, /html\[lang=en\] \.mf-me b\{white-space:nowrap;font-size:11\.5px/);   /* 第 25 輪 V4：紅名帖改成不換行、縮字（換行的第二行被 Free 蓋住） */
  assert.ok(M("07x3-rostermap.js").includes('id="mfDoor"'));
});
test("E 觀察 97：等 popstate 超過 1.5 秒先解除鎖定、不做選單項目；popstate 真的來了才做；解鎖後按了別項，舊的取消（只做新的那項）", async () => {
  const S = M("02-shell.js"), src = between(S, "function topMoreItem(b,f,after){", "\nfunction setTabs(");
  const mk = () => { const log = [], L = {}, pend = []; const ctx = { log, pend, history: { state: { xqSheet: 1 }, back() { log.push("back"); pend.push(() => { ctx.history.state = null; (L.popstate || []).slice().forEach(f => f()) }) } },
    closeSheet: a => log.push(a === true ? "close(true)" : "close"), addEventListener: (k, f) => { (L[k] = L[k] || []).push(f) }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter(x => x !== f) }, setTimeout };
    vm.createContext(ctx); vm.runInContext("function topMoreItem(b,f,after){" + src.slice("function topMoreItem(b,f,after){".length), ctx); return ctx };
  /* popstate 一直不來：1.5 秒後解鎖，選單項目沒做 */
  const A = mk(); A.topMoreItem({ dataset: {} }, () => A.log.push("f1"));
  assert.equal(A.topMoreRun.w, true); await new Promise(r => setTimeout(r, 1600)); assert.equal(A.topMoreRun.w, false, "解鎖了"); assert.deepEqual(A.log, ["close(true)", "back"], "沒做選單項目");
  /* 解鎖後同一頁再開選單按別項：舊的那筆取消，popstate 來了只做新的 */
  A.history.state = { xqSheet: 1 }; A.topMoreItem({ dataset: {} }, () => A.log.push("f2"));
  A.pend.splice(0).forEach(f => f()); await new Promise(r => setTimeout(r, 30));
  assert.deepEqual(A.log, ["close(true)", "back", "close(true)", "f2"], "第 25 輪 R25-2：前一筆退回還在路上就不再退，等它到了只做新的那項");
  /* 慢但會來（2 秒）：照樣做（第 22 輪 N22-1 的情境） */
  const B = mk(); B.topMoreItem({ dataset: {} }, () => B.log.push("f")); await new Promise(r => setTimeout(r, 1700)); B.pend.splice(0).forEach(f => f()); await new Promise(r => setTimeout(r, 30));
  assert.deepEqual(B.log, ["close(true)", "back", "f"]);
});
