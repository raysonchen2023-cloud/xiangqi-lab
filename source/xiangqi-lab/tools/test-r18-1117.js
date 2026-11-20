// 11/17 第 18 輪：測試員 D（英文介面）、B、E（Apple 審查員複驗）回報的問題。標準：App Store 審查 4.0 設計、2.1 完整性、無障礙。不開瀏覽器，vm／純計算。
//   D P2-1 開場、選格、存檔讀檔的英文（05b-save.js 組合字串 → 外掛字典 pat；「▶ 繼續」那行拆成兩段）
//   D P2-2 開場名言出處（09b LD_Q）三則；大廳安全須知最後一句整句進內建字典
//   D P2-3 開關、輸入框的 aria-label（07i18n：INPUT／TEXTAREA 只翻屬性）；「收起畫軸」
//   D P2-4／B N18-2／N18-3／E-5 點擊區 44（各模組的 ::before／::after、版面間隔；意見回饋頁三個口＋兵印＋類型籤一起排；設定房間圖上小東西）
//   D P3-1 英文分頁「Character」、清單小字不切；D P3-2 名冊 N；D P3-3 使用中那格的摘要照當下算；B「「 換手機」」
//   E-1 審查備註、E-2 原生版文件白名單、E-3 隱私說明原生版寫法、E-4 類型籤不出畫面、E-6 原生版不寫整包大小、E-7 iOS 電腦棋手提示
// 外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。用法：node --test xiangqi-lab/tools/test-r18-1117.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm");
/* 公開副本沒有 iOS 專案（xiangqi-ios）、文件原稿（xiangqi-db/art/docs）、英文外掛字典（只放 CDN）：讀不到這幾類檔時標成略過、寫原因；其他錯誤照樣失敗（1144 公開證據補） */
function skipMissing(t0) {
  const why = p => { const s = String(p || "").split(String.fromCharCode(92)).join("/");
    return /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = e && e.code === "ENOENT" ? why(e.path) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const CJK = /[㐀-鿿豈-﫿]/;
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const lineOf = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到：" + a); const j = s.indexOf("\n", i); return s.slice(i, j < 0 ? s.length : j) };

// ---------- 07i18n：純翻譯段＋畫面掃描段（假的 DOM） ----------
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
/* 極簡 DOM：元素（nodeType 1）與文字節點（3），i18nWalk 只用到 firstChild／nextSibling／parentNode／getAttribute／setAttribute／hasAttribute／classList */
function el(name, attrs, kids) {
  const e = { nodeType: 1, nodeName: name.toUpperCase(), _a: Object.assign({}, attrs || {}), _k: [], parentNode: null,
    getAttribute(k) { return k in this._a ? this._a[k] : null }, setAttribute(k, v) { this._a[k] = String(v) }, hasAttribute(k) { return k in this._a },
    classList: { contains: c => String(e._a.class || "").split(/\s+/).includes(c) },
    get firstChild() { return this._k[0] || null } };
  for (const k of kids || []) { const n = typeof k === "string" ? { nodeType: 3, nodeValue: k } : k; n.parentNode = e; e._k.push(n) }
  e._k.forEach((n, i) => Object.defineProperty(n, "nextSibling", { get: () => e._k[i + 1] || null, configurable: true }));
  return e;
}

test("D P2-3：開關（input）的 aria-label 會翻成英文；值不動；標了 data-noi18n 的照舊；「收起畫軸」有英文", () => {
  const C = i18nKit(true);
  const sw = el("input", { type: "checkbox", class: "sw", "aria-label": "螢幕報讀與鍵盤模式" });
  const sw2 = el("input", { type: "checkbox", class: "sw", "aria-label": "匿名送出對局評分" });
  const keep = el("input", { type: "text", value: "雲河小棋手", placeholder: "例如：雲河小棋手", "data-noi18n": "" });
  const ta = el("textarea", { "aria-label": "高對比主題" }, ["我打的中文"]);
  const body = el("body", {}, [el("label", { class: "row" }, [el("span", {}, ["高對比主題"]), sw]), el("label", {}, [sw2]), keep, ta]);
  C.i18nApply(body);
  assert.equal(sw.getAttribute("aria-label"), "Screen reader & keyboard mode");
  assert.equal(sw2.getAttribute("aria-label"), "Send game scores anonymously");
  assert.equal(keep.getAttribute("placeholder"), "例如：雲河小棋手", "data-noi18n 的輸入框不動");
  assert.equal(keep.getAttribute("value"), "雲河小棋手");
  assert.equal(ta.getAttribute("aria-label"), "High-contrast theme");
  assert.equal(ta.firstChild.nodeValue, "我打的中文", "輸入框裡玩家打的字不翻");
  /* 外層在跳過名單（例如語言選單 data-nocc）裡的 input 照舊不翻 */
  const inner = el("input", { "aria-label": "高對比主題" }), box = el("div", { "data-nocc": "" }, [inner]);
  C.i18nApply(el("body", {}, [box]));
  assert.equal(inner.getAttribute("aria-label"), "高對比主題");
  for (const s of ["聲音方位與動作提示音", "高對比主題", "送出玩家登記給開發者", "匿名記錄卡住的地方", "匿名送出學習進度", "每天自動送匿名健康摘要"]) assert.ok(C.i18nText(s) && !CJK.test(C.i18nText(s)), s);
  if (HAS_EXT) assert.equal(C.i18nText("收起畫軸"), "Close the scroll");
  /* 原始碼：開關的 aria-label 真的在 input 上（不是 label） */
  assert.match(M("11b-a11y.js"), /<input type="checkbox" class="sw" id="\$\{id\}"[^>]*aria-label="\$\{lb\}"/);
});

test("D P2-1：開場、選格、存檔讀檔畫面的字都翻得出（組合字串用 pat）", { skip: SKIP }, () => {
  const C = i18nKit(true), T = s => C.i18nText(s);
  const L = {
    "俥・齊轍": "Chariot · Qi Zhe", "卒・田飛燕": null, "修為 Lv 20・棋童": null,
    "故事 1／36・遊玩 0 分鐘・存檔 今天 08:48": "Story 1/36 · Played 0 min · Saved Today 08:48",
    "故事 3／36・遊玩 1 小時 5 分・存檔 昨天 23:10": null, "故事 3／36・遊玩 12 分鐘・存檔 11/16 08:48": null,
    "故事 1／36・遊玩 0 分鐘・第 1 格": "Story 1/36 · Played 0 min · Slot 1",
    "新的旅程要存在哪一格？": "Which slot should the new journey be saved in?", "覆蓋這格": "Overwrite this slot", "用這格": "Use this slot",
    "立即存檔": "Save now", "讀取": "Load", "上次匯出成檔案：從未": "Last exported to a file: Never", "上次匯出成檔案：今天 08:48": "Last exported to a file: Today 08:48",
    "自動存檔：切到背景、每 3 分鐘、換頁、每盤棋下完，都會存到「使用中」的那一格。": null,
    "刪掉主畫面上的 App，存檔會一起不見；建議偶爾匯出一份放到「檔案」。": null,
    "已存檔・今天 08:48": "Saved · Today 08:48", "已刪除第 2 格": "Deleted slot 2", "讀取第 1 格？": "Load slot 1?", "刪除第 3 格？": "Delete slot 3?", "覆蓋第 2 格？": "Overwrite slot 2?",
    "「俥・齊轍・Lv 20」。目前的進度會先存回第 2 格。": "\"Chariot · Qi Zhe · Lv 20\". Your current progress will be saved back to slot 2 first.",
    "「砲・沈方庭・Lv 3・遊玩 0 分鐘」會被刪掉，無法復原。": null, "「象・駱躍梅・Lv 9・遊玩 1 小時 5 分」會被清掉，無法復原。": null,
    "用檔案蓋掉第 1 格？": null, "檔案裡是「俥・齊轍・Lv 20」（今天 08:48 存的）。第 1 格原本的進度會被換掉。": null, "清掉並開始": null, "蓋掉": null,
    "還沒選角色也能玩；想聽故事時再選": null, "回到首頁・戰績和進度都還在": null, "象棋千秋 開頭畫面": null, "這趟星槎，想練到哪裡？": null,
    "第 1 格": "Slot 1", "使用中": "In use", "空白存檔": "Empty save", "▶ 繼續": "▶ Continue"
  };
  for (const [k, v] of Object.entries(L)) { const t = T(k); assert.ok(t && !CJK.test(t), k + " → " + t); if (v) assert.equal(t, v) }
  /* 真人取的名字照原文（不翻也不擋整句） */
  assert.equal(T("卒・雲河小棋手"), "Soldier · 雲河小棋手");
  /* 每個棋子字都對得到英文（雲河七星有紅有黑） */
  for (const [p, en] of [["帥", "General"], ["將", "General"], ["仕", "Advisor"], ["士", "Advisor"], ["相", "Elephant"], ["象", "Elephant"], ["傌", "Horse"], ["馬", "Horse"], ["俥", "Chariot"], ["車", "Chariot"], ["炮", "Cannon"], ["砲", "Cannon"], ["兵", "Soldier"], ["卒", "Soldier"]])
    assert.equal(T(p + "・齊轍"), en + " · Qi Zhe");
  /* 單獨一個棋子字照舊不翻（頭像圈、棋子章） */
  assert.equal(T("俥"), null);
  /* 05b：「▶ 繼續」那行拆成「棋子・名字」「修為…」兩段（各自是一個文字節點）；格子摘要那行是一整段、用 ・ 分 */
  const S = M("05b-save.js");
  assert.ok(S.includes('<small><span>${esc(m.pc)}・${esc(m.nm)}</span>　<span>修為 Lv ${m.lv}${m.rk?"・"+esc(m.rk):""}</span></small>'));
  assert.ok(S.includes("<small>故事 ${M.st|0}／36・遊玩 ${fmtSec(M.sec)}・存檔 ${fmtAt(M.at)}</small>"), "格子摘要的樣板改了：外掛字典的 pat 要跟著改");
});

test("D P2-2：開場名言出處全部翻得出；大廳安全須知最後一句整句有英文（內建字典，換圖示之前就換好）", () => {
  const C = i18nKit(true), P = M("09b-preload.js");
  const LD = vm.runInNewContext("(" + P.match(/const LD_Q=(\[[\s\S]*?\]\]);/)[1] + ")");
  assert.equal(LD.length, 10);
  if (HAS_EXT) for (const [, t, q, s] of LD) for (const x of [t, q, "── " + s]) { const r = C.i18nText(x); assert.ok(r && !CJK.test(r), x + " → " + r) }
  if (HAS_EXT) assert.equal(C.i18nText("── 《楚辭・招魂》"), "── Chu Ci: Summons of the Soul");
  /* 只用內建字典（外掛還沒載到）也翻得出那句 */
  const B = i18nKit(false), X = M("07x4-lobbysafe.js");
  assert.ok(X.includes('${again?"":"這張說明只會自動跳一次；"}之後可以在「設定房間的 🔒 系統・隱私・家長 → 🛡 大廳安全須知」再看。'));
  for (const s of ["這張說明只會自動跳一次；之後可以在「設定房間的 🔒 系統・隱私・家長 → 🛡 大廳安全須知」再看。", "之後可以在「設定房間的 🔒 系統・隱私・家長 → 🛡 大廳安全須知」再看。"]) {
    const r = B.i18nText(s); assert.ok(r && !CJK.test(r) && r.includes("System · Privacy · Parents → 🛡 Lobby safety"), r) }
});

test("D P3-2：大廳「📜 名冊 N」每個數字都翻成 Roster N", { skip: SKIP }, () => {
  const C = i18nKit(true);
  for (const n of [0, 1, 5, 12, 128]) { assert.equal(C.i18nText("📜 名冊 " + n), "📜 Roster " + n); assert.equal(C.i18nText("名冊 " + n), "Roster " + n) }
  assert.ok(M("07x2-lobbymap.js").includes("`📜 名冊 ${ids0.length}`"));
});

test("D P3-1：英文時設定分頁縮字不切、清單小字可以換行（只在 html[lang=en]）", () => {
  const C = i18nKit(false), css = C.I18N_CSS;
  assert.match(css, /html\[lang=en\] \.st-tabs button\{font-size:11px;[^}]*text-overflow:clip;overflow:visible\}/);
  assert.match(css, /html\[lang=en\] \.st-tabs \.tic \.eic\{width:18px;height:18px/);
  assert.match(css, /html\[lang=en\] \.item \.tx>span\{white-space:normal;text-overflow:clip/);
  /* 估算：「圖示 18＋空白 3＋Character（9 字 × 11px × .56）」放得進 82−2 的按鈕 */
  assert.ok(18 + 3 + 9 * 11 * .56 <= 80);
});

test("D P3-3：使用中那一格的摘要照當下算（修為、故事、遊玩時間），存檔時間照舊；沒有旅程時不動", () => {
  const S = M("05b-save.js"), live = { lv: 20, lt: "棋童", rk: "業1", st: 7, sec: 600, nm: "齊轍", pc: "俥", c: "x_qi", at: 999 };
  const mk = (cur, J) => new Function("curSlot", "journey", "saveMetaNow", lineOf(S, "function slotMetaLive(") + ";return slotMetaLive")(() => cur, () => J, () => Object.assign({}, live));
  const M0 = { 1: { lv: 2, st: 1, sec: 0, at: 123, nm: "齊轍", pc: "俥" }, 2: { lv: 5, at: 77 } };
  const r = mk(1, { c: "x_qi" })(M0);
  assert.equal(r[1].lv, 20); assert.equal(r[1].st, 7); assert.equal(r[1].at, 123, "存檔時間不能變成現在");
  assert.deepEqual(r[2], M0[2]); assert.equal(M0[1].lv, 2, "不改原本的 slotMeta");
  assert.equal(mk(1, null)(M0), M0); assert.equal(mk(3, {})(M0), M0);
  assert.match(S, /function saveList\(box,inTitle\)\{const M=slotMetaLive\(slotMetaAll\(\)\)/);
  assert.match(S, /J=journey\(\),M=slotMetaLive\(slotMetaAll\(\)\);o\.dataset\.v=view/);
});

test("B：刪除確認、隱私卡片的「換手機」不再靠 📱 圖示（字是完整的），英文跟著改", () => {
  const S = M("05-settings.js");
  assert.ok(!S.includes("「📱 換手機」"));
  assert.ok(S.includes("到設定用「換手機」把存檔搬到別支手機。") && S.includes("換手機前請先用設定裡的「換手機」把存檔搬過去。"));
  const B = i18nKit(false);
  assert.equal(B.i18nText("想留著，先按「不要刪」，到設定用「換手機」把存檔搬到別支手機。"), "To keep it, tap \"Don't delete\" first, then use \"Move to a new phone\" in Settings to move your save to another phone.");
  if (HAS_EXT) assert.ok(!CJK.test(i18nKit(true).i18nText("換手機前請先用設定裡的「換手機」把存檔搬過去。")));
});

// ---------- 點擊區 ----------
const Z = M("07z-homemap.js"), r07Solve = new Function(between(Z, "/*R07SOLVE{*/", "/*}R07SOLVE*/") + ";return r07Solve")();
const ovl = (p, q) => Math.min(p.r, q.r) - Math.max(p.l, q.l) > .5 && Math.min(p.b, q.b) - Math.max(p.t, q.t) > .5;

test("點擊區 CSS：設定分頁、開關、開關列、說明文件鈕、怎麼判、檢查更新、城市選單、收起畫軸、文牒、存檔鈕、規則、＋星輝、平面棋盤、鏡頭鈕", () => {
  const S = M("05-settings.js");
  for (const re of [/\.st-tabs button::before/, /\.xqd-g>button::before/, /button\.lk\[data-xqdoc\]::before/, /#aUpd::before/, /\.sw::after\{content:'';position:absolute;left:min\(0px,calc\(\(100% - 44px\) \/ 2\)\)/,
    /label:has\(>input\.sw\)\{min-height:44px\}/, /\.xq-sel44\{min-height:44px\}/, /\.xqd-g\{row-gap:10px\}/]) assert.match(S, re);
  assert.ok(S.includes('<select id="myCityS" class="xq-sel44"'));
  /* 說明文件鈕 35.5 高：上下各撐 4.25，兩排間隔 10 ≥ 8.5 不互疊 */
  assert.ok((44 - 35.5) <= 10);
  const S2 = M("07s2-setmap.js");
  assert.match(S2, /\.sm-dw-h button::before\{content:"";position:absolute;left:min\(-4px/); assert.match(S2, /\.hq-upd::before,\.hq-pv::before\{/);
  assert.match(M("05b-save.js"), /\.sv-a button::before\{content:\\"\\";position:absolute;/);
  /* .sv-a：40 高、換行間隔 6 → 上下各撐 2，相鄰兩排不疊 */
  assert.ok((44 - 40) <= 6);
  assert.match(M("07sg2-siege2.js"), /#gsvMe \.gsv-fx\[data-x="rules"\]\{min-width:44px;min-height:44px/);
  assert.match(M("07pty-party.js"), /\.pty-a \.btn::before\{content:"";position:absolute;/);
  const C = M("06-cpu.js");
  assert.match(C, /\.pzoom,\.fvz\{gap:12px!important\}/); assert.match(C, /\.pzoom>button::before,\.fvz>button::before\{content:"";position:absolute;left:-6px;right:-6px;top:-6px;bottom:-6px\}/);
  assert.match(C, /\.pk2d::before\{content:"";position:absolute;/); assert.match(C, /b\.className="pk2d";pkHitCss\(\);/);
  /* 鏡頭鈕 34 高、間隔 12：每顆 46 高、相鄰兩顆在間隔正中間相接 */
  const H = 34, G = 12; assert.ok(H + 12 >= 44 && 6 + 6 <= G);
});

test("點擊區：設定房間、線上大廳的場景標籤（.shp-spot）外框小，但 07z spotHit＋r07Solve 撐出 ≥44×44、不互疊", () => {
  assert.match(Z, /\.shp-spot::before,\.shp-hs::before,\.po-sight::before\{content:"";position:absolute;\s*left:var\(--r7l,min\(-4px,calc\(\(100% - 44px\) \/ 2\)\)\)/);
  assert.match(Z, /const R07_HIT_SEL="\.shp-spot,\.shp-hs,\.po-sight";/);
  const tw = (t, f) => [...t].reduce((a, c) => a + (/[\u3400-\u9fff\uff00-\uffef]/.test(c) ? f : /\p{Extended_Pictographic}/u.test(c) ? f * 1.25 : /\s/.test(c) ? f * .3 : f * .6), 0);
  const run = (spots, W, f, px, py) => { const H = W * 1376 / 768, L = spots.map(([, x, y, t]) => { const w = tw(t, f) + px * 2 + 3, h = f * 1.2 + py * 2 + 3; return { x: x / 100 * W - w / 2, y: y / 100 * H - h / 2, w, h } });
    const R = r07Solve(L, { b: { l: 0, t: 0, r: W, b: H } }); return { L, R } };
  const SM = vm.runInNewContext("(" + M("07s2-setmap.js").match(/const SM_SPOTS=(\[[\s\S]*?\]\]);/)[1] + ")"), LM = vm.runInNewContext("(" + M("07x2-lobbymap.js").match(/const LM_SPOTS=(\[[^\n]*?\]\]);/)[1] + ")");
  for (const [sp, f, px, py] of [[SM, 13, 9, 3], [LM, 14, 11, 4]]) {
    const { L, R } = run(sp, 390, f, px, py);
    assert.ok(L.every(a => a.h < 44), "外框本身不到 44（測試員量到的 25～29 高）");
    assert.deepEqual(R.iss, []); R.H.forEach(q => { assert.ok(q.r - q.l >= 43.5 && q.b - q.t >= 43.5) });
  }
  /* 大廳其他玩家的燈（約 10×18）：07x2 透明 ::after 44×44 */
  assert.match(M("07x2-lobbymap.js"), /\.lm-lp\.on::after\{content:"";position:absolute;left:50%;top:50%;width:max\(100%,44px\);height:max\(100%,44px\)/);
});

test("點擊區：設定房間圖上的小東西（棋盒、腳踏、香几、燈檠、琴桌）撐到 44；讀螢幕用的隱形按鈕也是 44", () => {
  const ctx = { console, Math, JSON, store: { get: (k, d) => d, set() { } }, document: { getElementById: () => null, head: { append() { } } }, SCENE_INFO_ON: true };
  vm.createContext(ctx);
  const S = M("07w6-sceneinfo.js");
  vm.runInContext(between(S, "const sciIn=", "function sciDraw") + ";this.sciHit=sciHit;this.sciPad=sciPad;", ctx);
  assert.match(S, /\.sci-sr button\{min-width:44px;min-height:44px\}/);
  const B = M("07w6b-scenedata.js"), i = B.indexOf("{re:/data\\/setmap"); let d = 0, j = -1;
  for (let k = i; k < B.length; k++) { if (B[k] === "{") d++; else if (B[k] === "}") { d--; if (!d) { j = k; break } } }
  const D = vm.runInContext("(" + B.slice(i, j + 1) + ")", ctx).D;
  const img = (w, night) => ({ getBoundingClientRect: () => ({ width: w }), currentSrc: night ? "data/setmap/set_night.webp" : "data/setmap/set_day.webp" });
  const nm = (w, p, night) => { const h = ctx.sciHit(D, {}, img(w, night), p); return h ? h.x.n : null };
  /* 棋盒（圓心 484,503、半徑 24＝393 寬時直徑 25px）：圓外 30px（圖上像素）原本是羅漢床，撐開後是棋盒；不給圖寬（量不到）照舊 */
  assert.equal(nm(0, [514, 503]), "羅漢床"); assert.equal(nm(393, [514, 503]), "棋盒");
  /* 琴桌是ㄇ字形：兩隻腳中間原本點不到，現在算琴桌 */
  assert.equal(nm(0, [580, 840]), null); assert.equal(nm(393, [580, 840]), "琴桌");
  /* 入口本體（no）照舊擋掉：炕桌棋盤 */
  assert.equal(nm(393, [400, 500]), null);
  /* 393 寬每件找得到完整 44×44 的方塊：在撐開的方塊（不用撐的取外框）裡每 4px 移一次找；棋盒、硯台夾在入口和彼此中間做不到（回報裡寫） */
  const W = 393, k = W / 768, full = (n, night) => { const it = D.it.find(x => x.n === n), s = it.s[0];
    const bx = typeof s[0] === "number" ? [s[0] - s[2], s[1] - s[2], s[0] + s[2], s[1] + s[2]] : [Math.min(...s.map(q => q[0])), Math.min(...s.map(q => q[1])), Math.max(...s.map(q => q[0])), Math.max(...s.map(q => q[1]))];
    const h = 21.8 / k, q = ctx.sciPad(D, s, 44 / k) || bx;   /* 撐到剛好 44：邊界取樣留 0.2px 的浮點誤差 */
    for (let cy = q[1] + h; cy <= q[3] - h + 1e-6; cy += 4 / k) for (let cx = q[0] + h; cx <= q[2] - h + 1e-6; cx += 4 / k) { let ok = true;
      for (let u = -h; u <= h && ok; u += 2 / k) for (let v = -h; v <= h && ok; v += 2 / k) if (nm(W, [cx + u, cy + v], night) !== n) ok = false; if (ok) return true }
    return false };
  for (const n of ["腳踏", "香几", "琴桌"]) assert.ok(full(n, false), n);
  assert.ok(full("燈檠", true), "燈檠（夜景）");
});

// ---------- 意見回饋頁（E-4、E-5）：純計算 fbpSlotLay／fbpTyLay ----------
const FB = M("07s3-feedback.js");
const fbp = new Function(between(FB, "function fbpSlotLay(", "function fbpHit(") + ";return{fbpSlotLay,fbpTyLay}")();
test("E-5：青銅匭三個口＋兵印各 44×44、互不重疊、都碰得到自己（393／375／430 寬）", () => {
  for (const W of [393, 375, 430]) {
    const k = W / 768, H = 1376 * k, box = ([x, y], w, h) => ({ x: x * k - w / 2, y: y * k - h / 2, w, h });
    const sl = [[657, 784], [716, 781], [672, 719]].map(p => box(p, .056 * W + 4, .024 * H + 4)), sd = 46 * k, seal = box([617, 842], sd, sd), L = [...sl, seal];
    const R = fbp.fbpSlotLay(L, { l: 0, r: W, t: 0, b: H }, 44);
    assert.ok(R, W + " 排不出來");
    R.forEach((q, i) => { assert.ok(q.r - q.l >= 44 - 1e-6 && q.b - q.t >= 44 - 1e-6, W + " #" + i); assert.ok(q.l >= -1e-6 && q.r <= W + 1e-6, W + " 出畫面 #" + i);
      const a = L[i]; assert.ok(Math.min(q.r, a.x + a.w) > Math.max(q.l, a.x) && Math.min(q.b, a.y + a.h) > Math.max(q.t, a.y), W + " 碰不到自己 #" + i) });
    for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) assert.ok(!ovl(R[i], R[j]), W + " 重疊 " + i + "," + j);
  }
  assert.match(FB, /\.fbp-page \.fbp-slot\{z-index:5\}/, "口比兵印（z-index 4）高一層：兵印最上面那條被申冤的範圍蓋住，兵印往下撐出完整 44");
  assert.match(FB, /\.fbp-page \.fbp-seal::before\{/);
});
test("E-4／E-5：類型籤上下間距＝44−籤高、每張 44 高不互疊、整排在延恩上面、超出畫面就往左推回來", () => {
  const T = [0, 1, 2].map(i => ({ x: 313, y: 266 + i * 27.5, w: 96, h: 23.5 }));
  const Y = fbp.fbpTyLay(T, 266, 334.4, 393, 44);
  assert.equal(Y.gap, 44 - 23.5);
  Y.H.forEach(q => assert.ok(q.b - q.t >= 44 - 1e-6 && q.r - q.l >= 44));
  for (let i = 0; i < 2; i++) assert.ok(Y.H[i].b <= Y.H[i + 1].t + 1e-6, "相鄰籤的點選範圍不疊");
  assert.ok(Y.H[2].b <= 334.4 + 1e-6, "最下面那張不壓到延恩");
  assert.ok(Math.max(...Y.H.map(q => q.x + 96)) <= 393 - 2 + 1e-6, "推回畫面內（原本右緣 409）");
  assert.equal(Y.dx, 409 - 391);
  /* 沒超出、也沒碰到延恩：不動 */
  const Y2 = fbp.fbpTyLay([{ x: 200, y: 100, w: 80, h: 23.5 }], 100, 400, 393, 44); assert.equal(Y2.top, 100); assert.equal(Y2.dx, 0);
});

// ---------- E-2、E-6：05-settings（docKit 跟 test-review-e 同一種取法） ----------
const SET = M("05-settings.js");
function docKit(nat) {
  const code = SET.slice(SET.indexOf("const XQDOC="), SET.indexOf("function xqDocSheet(")).replace(/\{const s=document\.createElement\("style"\)[^\n]*\n/, "");
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]));
  return new Function("esc", "provDoc", "window", "navigator", code + ";return{XQDOC,XQDOC_NAT,xqDocShow,xqDocLink,xqDocBtns}")(esc, s => s, { XQ_NATIVE: nat }, { userAgent: "x" });
}
test("E-2：原生版文件只開白名單（tour、family、privacy、credits、rules、support）；rules.md 連到 architecture 只留字；網頁版照舊", () => {
  const A = docKit(true), W = docKit(false);
  for (const k of ["tour", "family", "privacy", "credits", "rules", "support"]) assert.equal(A.xqDocShow(k), true, k);
  for (const k of ["architecture", "limits", "history", "release", "evidence", "a11y", "ai", "foss"]) { assert.equal(A.xqDocShow(k), false, k); assert.equal(W.xqDocShow(k), true, k) }
  assert.equal(A.xqDocLink("連線與資料架構", "architecture.md"), "連線與資料架構");
  assert.match(W.xqDocLink("連線與資料架構", "architecture.md"), /data-xqdoc="architecture"/);
  assert.match(A.xqDocLink("棋規", "rules.md"), /data-xqdoc="rules"/);
  /* 設定裡的按鈕照舊五顆 */
  assert.deepEqual([...A.xqDocBtns().matchAll(/data-xqdoc="([^"]+)"/g)].map(m => m[1]), ["privacy", "family", "credits", "rules", "support"]);
  /* 直接點 data-xqdoc（xqDocSheet）也擋 */
  assert.match(SET, /function xqDocSheet\(k\)\{const d=XQDOC\[k\];if\(!d\|\|!xqDocShow\(k\)\)return;/);
});
test("E-6：原生版「關於」不寫整包下載大小，網頁版照舊", () => {
  const code = between(SET, "function aboutSizes(", "function aboutUsage(");
  const f = nat => new Function("XQ_SIZES", "szMB", "setNat", "esc", code + ";return aboutSizes()")({ all: 851e6, pre: 1, code: 1, eng: 1, gm: 1, bgm: 1, other: 1 }, b => Math.round(b / 1e6) + " MB", () => nat, s => s);
  assert.ok(!f(true).includes("整包下載")); assert.ok(f(true).includes("這支手機已用"));
  assert.ok(f(false).includes("整包下載") && f(false).includes("851 MB"));
});

// ---------- E-7：02-shell iOS 電腦棋手提示 ----------
test("E-7：iOS 原生 App 的電腦棋手失敗提示不說「iOS 太舊」、不顯示 WebView 版本；Android 照舊", () => {
  const S = M("02-shell.js"), code = between(S, "const NATIVE_IOS=", "if(OFF&&/XQQianqiuApp");
  const run = ua => new Function("navigator", code + ";return{NATIVE_IOS,NATIVE_OLDWV}")({ userAgent: ua, maxTouchPoints: 5 });
  const ios = run("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 XQQianqiuApp/1");
  assert.equal(ios.NATIVE_IOS, true); assert.match(ios.NATIVE_OLDWV, /沒有啟動成功/); assert.ok(!/太舊/.test(ios.NATIVE_OLDWV));
  const and = run("Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/133.0 Mobile XQQianqiuApp/1");
  assert.equal(and.NATIVE_IOS, false); assert.match(and.NATIVE_OLDWV, /Android System WebView 版本太舊/);
  assert.ok(S.includes("${wv&&!NATIVE_IOS?`<p class=\"muted\">目前的 WebView 版本"));
  assert.ok(S.includes('<h2>${NATIVE_IOS?"電腦棋手沒有啟動成功":"電腦棋手需要更新手機元件"}</h2>'));
  if (HAS_EXT) { const C = i18nKit(true); for (const s of [ios.NATIVE_OLDWV + "。", "⚠ " + ios.NATIVE_OLDWV, "電腦棋手沒有啟動成功", "聯絡方式在設定房間「🔒 系統・隱私・家長」的「📮 聯絡與支援」。", "要等電腦棋手啟動成功才能用：挑戰電腦、擂台、棋局分析與提示。"]) { const r = C.i18nText(s); assert.ok(r && !CJK.test(r), s) } }
});

// ---------- E-3：隱私說明、家長說明的原生版寫法（兩份 docs 一致） ----------
test("E-3：privacy.md、family.md 原生版看不到瀏覽器／GitHub Pages／開發者模式的寫法；網頁版照舊；兩份一致", () => {
  const xqDocVar = new Function(lineOf(SET, "function xqDocVar(t,nat){") + "\n" + between(SET, "  for(const l of String(t||\"\").split(\"\\n\")){let r=\"\",i=0,m,had=false;", "function xqDocBtns(") + ";return xqDocVar")();
  for (const f of ["privacy.md", "family.md"]) {
    const a = path.join(ROOT, "xiangqi-db", "art", "docs", f), b = path.join(ROOT, "xiangqi-lab", "site", "data", "docs", f);
    if (!fs.existsSync(a) || !fs.existsSync(b)) continue;
    assert.equal(fs.readFileSync(a, "utf8"), fs.readFileSync(b, "utf8"), f + " 兩份不一致");
  }
  const P = rd("xiangqi-db/art/docs/privacy.md"), F = rd("xiangqi-db/art/docs/family.md");
  const pn = xqDocVar(P, true), pw = xqDocVar(P, false), fn = xqDocVar(F, true), fw = xqDocVar(F, false);
  for (const s of ["瀏覽器的 localStorage", "iPhone 的 Safari 沒有這項", "開發者模式不送", "App 從 GitHub Pages 載入", "App 才請瀏覽器開始聽"]) { assert.ok(!pn.includes(s), "原生版還有：" + s); assert.ok(pw.includes(s), "網頁版少了：" + s) }
  assert.ok(!/GitHub Pages/.test(fn) && /GitHub Pages/.test(fw));
  assert.ok(!/<!--\/?(web-only|app-only)-->/.test(pn + pw + fn + fw), "標記要拿乾淨");
});

// ---------- E-1：審查備註 ----------
test("E-1：審查備註照實際畫面（沒有底部分頁列、🗺 地圖、新手練習），Notes 不超過 4000 字", () => {
  const md = rd("xiangqi-ios/appstore/metadata.md"), sec = md.slice(md.indexOf("## 五、"));
  const m = sec.match(/```\n([\s\S]*?)\n```/); assert.ok(m, "第五節找不到 Notes 區塊");
  const notes = m[1];
  assert.ok(notes.length <= 4000, "Notes " + notes.length + " 字");
  assert.match(notes, /no bottom tab bar/i); assert.match(notes, /沒有底部分頁列/); assert.match(notes, /🗺/); assert.match(notes, /新手練習/);
  assert.ok(!/底部分頁列的?「?⚙️? ?設定」?/.test(notes) && !/tab bar.{0,20}(Settings|Home|Online)/i.test(notes.replace(/no bottom tab bar/ig, "")), "不能再叫審查員按底部分頁列");
  /* 備註裡寫的入口名都在原始碼裡 */
  const src = fs.readdirSync(path.join(ROOT, "xiangqi-db", "m")).filter(f => f.endsWith(".js")).map(f => M(f)).join("\n");
  for (const n of ["對弈茶樓", "挑戰電腦", "線上大廳", "服務亭", "我會下棋，直接開始", "先逛逛，之後再開始故事", "線上大廳安全須知", "👪 家長與護眼"]) if (notes.includes(n)) assert.ok(src.includes(n), "原始碼找不到：" + n);
});
