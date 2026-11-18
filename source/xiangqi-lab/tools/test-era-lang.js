// 評比第 17、18 輪：朝代（B3）、英文介面主線（B5，P41.1、P41.4）、舊 8 碼轉移碼停收（第 18 輪第 4 項，威脅模型 I5）的公開測試。不開瀏覽器、不連伺服器、不呼叫外部 API。
//   ① 朝代：載入 m/07-legend.js 的 storyBookOf＋storyEraSync（假 store），玩家朝代 tang 依序走：首頁 → 練習賽（jPending bh:tl）→ 首頁 → 塔防（bh:td1）→ 急襲（bh:rd）
//      → 園子（park）→ 石桌往事第一集（h05：換元朝、記 eraUser）→ 離開（換回 tang）；每一步斷言 era、eraUser，「元末明初」提示只在真的故事出現、只出一次。
//      同一段流程在中文、英文各跑一次：英文模式那句提示翻得出英文、中文模式原樣。
//   ② 語言：從 07mnq（星槎遠征令、下一步、大禮包）、07mnf（主線電影的任務卡、略過、危機題、儀式標籤）、07t（星夜茶話會）、07bhtl（黑洞練習賽）的原始碼切出每一段固定的字，
//      英文都翻得出來（劇情字幕、角色台詞照 07i18n 的規則不翻，另列）；首頁「⛵ 下一步・…」用 07mnq 自己的 mnqNextOf 算出來的每一種都翻得出來；
//      中文模式 07i18n 什麼都不裝、字原樣；英文模式第一次進主線故事（電影、對話場景、任務卡）出現一次語言範圍說明，之後不再出現，中文不出現。
//   ③ 舊轉移碼：8 碼輸入回傳停用提示、不讀不寫任何主題（畫面 xfRecv 也是）；10 碼照常往返；這支手機的存檔不受影響；停用提示有英文。
// 只讀公開倉庫 source/ 裡就有的檔（xiangqi-db/m/*.js），在公開倉庫用 node --test source/xiangqi-lab/tools/test-era-lang.js 也能跑。
// 用法：node --test xiangqi-lab/tools/test-era-lang.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), nodeCrypto = require("node:crypto");
const M = process.env.XQ_M_DIR || path.join(__dirname, "..", "..", "xiangqi-db", "m");
const rd = f => fs.readFileSync(path.join(M, f), "utf8").replace(/\r\n/g, "\n");
const CJK = /[㐀-鿿豈-﫿]/;
const cut = (src, a, b) => { const i = src.indexOf(a); assert.ok(i >= 0, "切不到：" + a.slice(0, 40)); const j = b ? src.indexOf(b, i + a.length) : src.length; assert.ok(j > i, "切不到結尾：" + String(b).slice(0, 40)); return src.slice(i, j) };
const I18N = rd("07i18n.js"), LEGEND = rd("07-legend.js"), MNQ = rd("07mnq-mainquest.js"), MNF = rd("07mnf-mainfilm.js"), MNV = rd("07mnv-mainvn.js"), EP = rd("07t-episodes.js"), BHTL = rd("07bhtl-tdlearn.js");
const SET = rd("05-settings.js"), SAVE = rd("05b-save.js"), CPU = rd("06-cpu.js");

/* ================= 07i18n：純函式（i18nText）＋整支載入（假 DOM） ================= */
function loadPure() {
  const i = I18N.indexOf("#I18N-PURE-BEGIN"), j = I18N.indexOf("/* #I18N-PURE-END */"); assert.ok(i > 0 && j > i);
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(I18N.slice(I18N.indexOf("\n", i) + 1, j) + ";this.R={i18nText,i18nLine,I18N_EN,I18N_GUARD}", ctx, { filename: "07i18n(純函式)" });
  return ctx.R;
}
const R = loadPure(), T = s => R.i18nText(s);
/* 很小的假 DOM：07i18n 開機、掃描、語言範圍說明用得到的就好 */
class FNode {
  constructor(t) { this.nodeType = t; this.parentNode = null; this.childNodes = [] }
  get firstChild() { return this.childNodes[0] || null }
  get nextSibling() { const p = this.parentNode; return p ? p.childNodes[p.childNodes.indexOf(this) + 1] || null : null }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c }
  append(...cs) { for (const c of cs) this.appendChild(typeof c === "string" ? new FText(c) : c) }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c }
}
class FText extends FNode { constructor(v) { super(3); this.nodeName = "#text"; this.nodeValue = String(v) } get textContent() { return this.nodeValue } }
class FEl extends FNode {
  constructor(tag) { super(1); this.nodeName = this.tagName = String(tag).toUpperCase(); this.attrs = new Map(); this.style = {}; const me = this; this.classList = { contains: c => (me.getAttribute("class") || "").split(/\s+/).includes(c), add() { }, remove() { } } }
  getAttribute(a) { return this.attrs.has(a) ? this.attrs.get(a) : null } setAttribute(a, v) { this.attrs.set(a, String(v)) } hasAttribute(a) { return this.attrs.has(a) } removeAttribute(a) { this.attrs.delete(a) }
  get id() { return this.getAttribute("id") || "" } set id(v) { this.setAttribute("id", v) }
  get textContent() { return this.childNodes.map(c => c.textContent).join("") } set textContent(v) { for (const c of [...this.childNodes]) this.removeChild(c); if (v !== "" && v != null) this.appendChild(new FText(v)) }
  all() { const out = []; const w = n => { for (const c of n.childNodes) if (c.nodeType === 1) { out.push(c); w(c) } }; w(this); return out }
  querySelector(s) { return s[0] === "#" ? this.all().find(e => e.id === s.slice(1)) || null : null }
  querySelectorAll() { return [] }
  remove() { if (this.parentNode) this.parentNode.removeChild(this) }
}
function loadFull(lang, ls) {
  ls = ls || new Map(); if (lang) ls.set("m_lang", JSON.stringify(lang));
  const html = new FEl("html"), head = new FEl("head"), body = new FEl("body"); html.append(head, body);
  const doc = { documentElement: html, head, body, title: "象棋千秋", createElement: t => new FEl(t), createTextNode: v => new FText(v), getElementById: id => html.querySelector("#" + id), querySelector: s => html.querySelector(s), querySelectorAll: () => [] };
  const localStorage = { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const store = { get(k, d) { const v = localStorage.getItem("m_" + k); return v == null ? d : JSON.parse(v) }, set(k, v) { localStorage.setItem("m_" + k, JSON.stringify(v)) } };
  const OBS = [], timers = [];
  const ctx = { document: doc, localStorage, store, navigator: { language: "zh-TW", languages: ["zh-TW"] }, console, toast: () => { }, vibrate: () => { }, sheet: () => { }, closeSheet: () => { },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length }, location: { reload: () => { } },
    MutationObserver: class { constructor(cb) { this.cb = cb; OBS.push(this) } observe(t, o) { this.t = t; this.o = o } disconnect() { this.off = true } } };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(I18N, ctx, { filename: "07i18n.js" });
  return { ctx, doc, ls, OBS, timers };
}

/* ================= ① 朝代：07-legend.js 的 storyBookOf＋storyEraSync ================= */
function legend(era) {
  const mem = new Map([["era", era]]), toasts = [], applied = [];
  const ctx = { store: { get: (k, d) => mem.has(k) ? mem.get(k) : d, set: (k, v) => mem.set(k, v) }, location: { hash: "#/" }, toast: t => toasts.push(t), setTimeout: f => f(),
    DEVMODE: () => false, book1Done: () => false, applyEra: () => applied.push(mem.get("era")), PARK: null };
  vm.createContext(ctx);
  vm.runInContext(cut(LEGEND, "const STORY_ERA=", "const jFindStage=") + "\n;this.L={storyBookOf,storyEraSync,STORY_ERA}", ctx, { filename: "07-legend.js(storyEraSync)" });
  const go = (hash, pending) => { ctx.location.hash = hash; if (pending !== undefined) mem.set("jPending", pending === null ? null : { id: pending }); const n = toasts.length; ctx.L.storyEraSync(); return { era: mem.get("era"), eraUser: mem.get("eraUser") == null ? null : mem.get("eraUser"), tips: toasts.slice(n) } };
  return { go, L: ctx.L, mem, toasts, applied };
}
/* 同一份存檔的那一串：[說明, 網址, 待開對局編號（undefined＝不動）, 預期 era, 預期 eraUser, 會不會跳「元末明初」] */
const FLOW = [
  ["首頁", "#/", undefined, "tang", null, false],
  ["黑洞練習賽 bh:tl", "#/journey/play", "bh:tl", "tang", null, false],
  ["回首頁", "#/", undefined, "tang", null, false],
  ["黑洞塔防 bh:td1", "#/journey/play", "bh:td1", "tang", null, false],
  ["星淵急襲 bh:rd", "#/journey/play", "bh:rd", "tang", null, false],
  ["園子 #/journey/park", "#/journey/park", undefined, "tang", null, false],
  ["園子的對局 park", "#/journey/play", "park", "tang", null, false],
  ["石桌往事第一集 h05", "#/journey/play", "h05", "yuan", "tang", true],
  ["離開故事", "#/", undefined, "tang", null, false]
];
const show = (lang, s) => lang === "en" ? R.i18nLine(s) : s;
for (const lang of ["zh", "en"]) {
  test(`朝代（${lang === "en" ? "英文" : "中文"}模式）：唐朝玩家走首頁、練習賽、塔防、急襲、園子都留在唐朝；石桌往事第一集才換元朝並記 eraUser、跳一次「元末明初」；離開換回唐朝`, () => {
    const W = legend("tang"); let tipsAll = [];
    for (const [name, hash, pend, era, eu, tip] of FLOW) {
      const r = W.go(hash, pend); tipsAll = tipsAll.concat(r.tips);
      assert.equal(r.era, era, name + "：era"); assert.equal(r.eraUser, eu, name + "：eraUser");
      assert.equal(r.tips.some(t => t.includes("元末明初")), tip, name + "：「元末明初」提示" + (tip ? "要出現" : "不該出現"));
      for (const t of r.tips) { const s = show(lang, t); assert.ok(s, name + "：提示翻不出來"); if (lang === "en") assert.ok(!CJK.test(s), "英文模式還有中文：" + s); else assert.equal(s, t, "中文模式原樣") }
    }
    assert.equal(tipsAll.length, 1, "整段只跳一次提示");
    /* 第二次進故事：照樣換朝代，但提示不再跳（storyEraTip） */
    const r2 = W.go("#/journey/play", "h12"); assert.equal(r2.era, "yuan"); assert.equal(r2.eraUser, "tang"); assert.deepEqual(r2.tips, []);
    assert.equal(W.go("#/", undefined).era, "tang");
  });
}
test("朝代：只有石桌往事的關卡（h01～h36、b2h）換朝代；gx: 十三星系、inn: 驛站、char: 挑戰角色、bt: 星槎對戰、黑洞對戰 bh:gx 一律照玩家自己的朝代", () => {
  const W = legend("song");
  for (const id of ["gx:tang", "inn:song:1", "char:x_shi", "bt:1", "bh:gx", "bh:td9", "h"]) { const r = W.go("#/journey/play", id); assert.equal(r.era, "song", id); assert.equal(r.eraUser, null, id) }
  const b2 = W.go("#/journey/play", "b2h03"); assert.equal(b2.era, "ming"); assert.equal(b2.eraUser, "song");
  assert.equal(W.go("#/journey/play", "bh:tl").era, "song", "從故事直接進練習賽也換回自己的朝代"); assert.equal(W.mem.get("eraUser"), null);
  assert.equal(W.L.storyBookOf("#/journey/play"), 0, "沒有待開對局（jPending 是 bh:tl）＝0");
  W.mem.set("jPending", null); assert.equal(W.L.storyBookOf("#/journey/play"), -1, "jPending 是空的＝照舊（-1）");
});

/* ================= ② 語言：主線介面字 ================= */
/* 字面字串掃描（略過註解、正規式；模板的 ${…} 換成 \u0001，裡面的字串另外收），跟 test-i18n.js 同一套 */
function lits(src) {
  const out = []; let i = 0, prev = ""; const n = src.length;
  const isRe = () => /^$|[(,=:\[!&|?{};+\-*%<>~^]$/.test(prev) || /\b(return|typeof|case)$/.test(src.slice(Math.max(0, i - 7), i).trimEnd());
  function str(q) { let s = ""; i++; while (i < n && src[i] !== q) { if (src[i] === "\\") { s += src[i + 1] === "n" ? "\n" : src[i + 1]; i += 2; continue } s += src[i++] } i++; return s }
  function tpl() {
    let s = ""; i++;
    while (i < n && src[i] !== "`") {
      if (src[i] === "\\") { s += src[i + 1]; i += 2; continue }
      if (src[i] === "$" && src[i + 1] === "{") {
        i += 2; let d = 1;
        while (i < n && d > 0) { const c = src[i]; if (c === "{") { d++; i++ } else if (c === "}") { d--; i++ } else if (c === "\"" || c === "'") out.push(str(c)); else if (c === "`") out.push(tpl()); else if (c === "/" && src[i + 1] === "*") i = src.indexOf("*/", i + 2) + 2; else i++ }
        s += "\u0001"; continue;
      }
      s += src[i++];
    }
    i++; return s;
  }
  while (i < n) {
    const c = src[i];
    if (c === "/" && src[i + 1] === "/") { i = src.indexOf("\n", i); if (i < 0) break; continue }
    if (c === "/" && src[i + 1] === "*") { i = src.indexOf("*/", i + 2); if (i < 0) break; i += 2; continue }
    if (c === "\"" || c === "'") { out.push(str(c)); prev = "x"; continue }
    if (c === "`") { out.push(tpl()); prev = "x"; continue }
    if (c === "/" && isRe()) { i++; let cls = false; while (i < n) { const d = src[i]; if (d === "\\") { i += 2; continue } if (d === "[") cls = true; else if (d === "]") cls = false; else if ((d === "/" && !cls) || d === "\n") break; i++ } i++; while (/[a-z]/.test(src[i] || "")) i++; prev = "x"; continue }
    if (!/\s/.test(c)) prev = c; i++;
  }
  return out;
}
const pieces = L => { const set = new Set(); for (const s of L) for (const p of String(s).split(/[<>"=]/)) { const t = p.trim(); if (t && CJK.test(t) && !t.includes("\u0001") && !/[{}]/.test(t)) set.add(t) } return [...set] };
/* 程式組字的片段（頭尾是標點或「、單一個中文字）、開發者檢查訊息（：開頭）：單獨翻不出來是正常的，整句另外驗 */
const FRAG = new Set(["・第", "章・", "章即將開放", "停靠", "後開放", "星槎停到", "看完「", "看完第一場「", "看完最後一場「", "之印", "的配樂", "過河", "燕子姊姊", "方庭", "插曲"]);
const isFrag = s => FRAG.has(s) || /^[一二三四五六七八九十]+$/.test(s) || /^[，；：、・」）\]]/.test(s) || /[「（，：、・；]$/.test(s) || s.replace(/[^㐀-鿿]/g, "").length <= 1 || R.I18N_GUARD.some(g => s.includes(g));
/* 劇情（照 07i18n 規則不翻）：電影每個鏡頭的字幕 [秒,"字"]、儀式字幕（MNF_RITE_TXT、MNF_RITE_SET 的 txt）、說書人與角色的台詞 */
const filmSay = [...cut(MNF, "const MNF_FILMS=", "const MNF_QTE=").matchAll(/\[\s*[\d.]+\s*,\s*"([^"]+)"\s*\]/g)].map(m => m[1]);
const filmBig = [...cut(MNF, "const MNF_FILMS=", "const MNF_QTE=").matchAll(/big:\[\s*[\d.]+\s*,\s*"([^"]+)"\s*\]/g)].map(m => m[1]);
const filmSeal = [...cut(MNF, "const MNF_FILMS=", "const MNF_QTE=").matchAll(/seal:\[\s*[\d.]+\s*,\s*"([^"]+)"\s*\]/g)].map(m => m[1]);   /* 朱印上的字（標 data-noi18n） */
const riteTx = pieces(lits(cut(MNF, "const MNF_RITE_SET=", "const MNF_FILMS="))).concat(pieces(lits(cut(MNF, "const MNF_RITE_TXT=", "\n"))));
const STORY = new Set([...filmSay.filter(s => !filmBig.includes(s) && !filmSeal.includes(s)), ...riteTx,
  "客官，夜深了。老朽點一盞燈，陪你們看一分鐘的棋，看完就去歇著。", "客官，同一題盯久了，眼睛會累。換一分鐘的小題，鬆鬆眼。", "好眼力！", "看得仔細，就是好棋。", "說書人：「燈芯結了一朵燈花——老一輩說，這是好兆頭。」"]);
const MAINUI = [
  ["07mnq 星槎遠征令、下一步、大禮包、任務卡、札記", MNQ, "const MNQ_CH=", null],
  ["07mnf 主線電影：任務卡、略過、危機題、儀式標籤", MNF, "const MNF_W=", null],
  ["07t 星夜茶話會（標題、眼力題、按鈕；台詞另列）", EP, "const EP4_GAME=", "/* ---------- 5 星槎大掃除"],
  ["07bhtl 黑洞練習賽", BHTL, "const BHTL_", null]
];
for (const [name, src, a, b] of MAINUI) {
  test("英文模式：主線介面字每一段都翻得出英文（劇情字幕、台詞另列）：" + name, () => {
    const P = pieces(lits(cut(src, a, b))).filter(p => !p.startsWith("!--"));
    assert.ok(P.length >= 10, "這段切不到中文字（原始碼改了？）");
    const bad = P.filter(p => !isFrag(p) && !STORY.has(p) && T(p) == null);
    assert.deepEqual(bad, [], "翻不出來：" + bad.join("｜"));
    for (const p of P) { const e = T(p); if (e != null) assert.ok(!CJK.test(e), "翻完還有中文：" + p + " → " + e) }
  });
}
test("英文模式：電影的大字與任務卡、危機題的大字與說明都翻得出來；第一、二章現有劇情字幕全部翻成英文", () => {
  const cards = [...cut(MNF, "const MNF_FILMS=", "const MNF_QTE=").matchAll(/card:\{t:"([^"]+)",b:"([^"]+)"\}/g)].flatMap(m => [m[1], m[2]]);
  assert.ok(cards.length >= 12, "任務卡至少 6 張");
  for (const s of [...cards, ...filmBig, "略過", "看軍師演示", "看藍框那顆棋子。", "殘譜補上一行", "千秋棋話"]) assert.ok(T(s) != null && !CJK.test(T(s)), s + " → " + T(s));
  const qte = pieces(lits(cut(MNF, "const MNF_QTE=", "/* 殘局解開儀式的字幕")));
  for (const s of qte.filter(p => !isFrag(p))) assert.ok(T(s) != null, "危機題：" + s);
  assert.ok(STORY.size >= 20, "劇情字幕清單太少（切錯了？）" + STORY.size);
  /* 字幕剛好每一段都是介面字（例如「齊轍：車有路了。」＝人名＋任務卡那句）會整句翻好；其他照原樣中文，絕不半中半英 */
  const kept = [...STORY].filter(s => CJK.test(s) && T(s) == null);
  assert.deepEqual(kept, [], "現有主線電影與儀式字幕皆有英文");
  for (const s of STORY) { const e = T(s); if (e != null) assert.ok(!CJK.test(e), "半中半英：" + s + " → " + e) }
});

/* 07mnq 自己的 mnqNextOf：首頁「⛵ 下一步・…」、任務卡大字、讀螢幕標籤，各種狀態算出來的字都翻得出來 */
function mnqLoad() {
  const ctx = { store: { get: (k, d) => d, set() { } }, esc: s => String(s), localStorage: { getItem: () => null }, location: { hostname: "example.org" }, console };
  vm.createContext(ctx);
  return vm.runInContext(MNF + "\n" + MNV + "\n" + cut(MNQ, "const MNQ_CH=", "/* ---------- 大禮包儀式") + "\nconst mnqNextTxt=" + cut(MNQ, "const mnqNextTxt=", "\n").slice("const mnqNextTxt=".length)
    + "\n;({MNQ_CH,MNQ_CHAP,MNQ_GIFT,MNQ_CN,mnqNextOf,mnqNextTxt,mnqShort})", ctx, { filename: "07mnf+07mnv+07mnq" });
}
const ERA_LABEL = (() => { const m = CPU.match(/const eraLabel=k=>\((\{[^}]*\})\)/); assert.ok(m, "06-cpu.js 找不到 eraLabel"); return vm.runInNewContext("(" + m[1] + ")") })();
test("英文模式：首頁「⛵ 下一步・…」照 mnqNextOf 的每一種狀態（禮包、三段電影、錦囊、補給、贏第一盤、回家鄉、第二章即將開放、開往下一章）都翻得出來；中文模式原樣", () => {
  const Q = mnqLoad(), seg = {}, all = { c1o: 1, c1m: 1, c1e: 1 };
  const cases = [
    [{ seg, gift: { a6: {} } }, { hasChar: true }],
    [{ seg: {}, gift: { a1: 1, a6: {} } }, { hasChar: true }],
    [{ seg: { c1o: 1 }, gift: { a1: 1, a6: {} } }, { hasChar: true }],
    [{ seg: { c1o: 1, c1m: 1 }, gift: { a1: 1, a6: {} } }, { hasChar: true }],
    [{ seg: all, gift: { a1: 1, a6: {} } }, { hasChar: true, firstWin: true }],
    [{ seg: all, gift: { a1: 1, a2: 1, a6: {} } }, { hasChar: true, firstWin: true, at: "tang" }],
    [{ seg: all, gift: { a1: 1, a6: {} } }, { hasChar: true, firstWin: false }],
    ...Object.entries(ERA_LABEL).map(([e, l]) => [{ seg: all, gift: { a1: 1, a2: 1, a6: {} } }, { hasChar: true, firstWin: true, home: e, at: e === "classic" ? "" : "classic", homeLabel: l }]),
    [{ seg: all, gift: { a1: 1, a2: 1, a6: { tang: 1 } } }, { hasChar: true, firstWin: true, home: "tang", at: "tang", homeLabel: "唐朝" }]
  ];
  const texts = new Set();
  for (const [S, E] of cases) texts.add(Q.mnqNextTxt(Q.mnqNextOf(S, E)));
  /* 11/15 星槎遠征令拿掉（07mnq MNQ_PANEL_ON＝false）：主線做完是「更多玩法」，不再算出「第N章即將開放」 */
  assert.ok(!/MNQ_PANEL_ON=true/.test(MNQ), "遠征令面板維持拿掉");
  assert.ok(![...texts].some(t => /即將開放/.test(t)), "不再有「即將開放」：" + [...texts].join("｜"));
  assert.ok(texts.has("更多玩法"), "主線做完帶去更多玩法：" + [...texts].join("｜"));
  /* 第二章上線後（或開發者試玩）的「開往秦・第二章」、遠征令面板 */
  for (const [e] of Q.MNQ_CH.slice(1)) texts.add("開往" + Q.mnqShort(e) + "・第" + Q.MNQ_CN[Q.MNQ_CH.findIndex(c => c[0] === e)] + "章");
  texts.add("星槎遠征令");
  assert.ok(texts.size >= 10);
  for (const t of texts) {
    for (const s of ["⛵ 下一步・" + t, "下一步：" + t, t]) { const e = T(s); assert.ok(e != null && !CJK.test(e), "翻不出來：" + s + " → " + e) }
    assert.equal(show("zh", "⛵ 下一步・" + t), "⛵ 下一步・" + t, "中文模式原樣");
  }
  assert.equal(T("⛵ 下一步・河圖初渡"), "⛵ Next: Crossing the River Chart");
  assert.equal(T("⛵ 下一步・第二章即將開放"), "⛵ Next: Chapter 2 coming soon");
  /* 13 章章名、遠征令面板的組字、禮包的組字 */
  for (const [e, nm] of Q.MNQ_CH) {
    const i = Q.MNQ_CH.findIndex(c => c[0] === e), sh = Q.mnqShort(e), lb = ERA_LABEL[e];
    for (const s of [nm, "第" + Q.MNQ_CN[i] + "章・" + nm, "第" + Q.MNQ_CN[i] + "章即將開放", "停靠" + sh + "後開放", "星槎停靠" + sh + "，這一章就開放", "星槎停到" + sh + "，收下遠征補給",
      "📜 " + nm, "家鄉棋盤・" + lb, lb + "的配樂", "札記一頁・" + lb, Q.MNQ_GIFT.a6.nm + "・" + lb]) { const x = T(s); assert.ok(x != null && !CJK.test(x), "翻不出來：" + s + " → " + x) }
  }
  assert.equal(T("古典・河圖初渡"), "Classic · Crossing the River Chart"); assert.equal(T("第二章・秦・日落之前"), "Chapter 2 · Qin · Before Sunset");
  for (const g of Object.values(Q.MNQ_GIFT)) { assert.ok(T(g.nm) && !CJK.test(T(g.nm)), g.nm); assert.ok(T(g.say) && !CJK.test(T(g.say)), g.say) }
  for (const s of ["⛵ 開始第一章", "稱號「雲河新使」", "稱號「初勝」", "提示棋 ×5", "第一章・河圖初渡", "航線亮了 1／13 盞", "航線亮燈 1／13・配樂 2 首", "已收 1／13 頁", "11月14日 09:30", "看完「河圖初渡」", "↩ 回星槎遠征令",
    "《千秋棋話》雲河", "殘譜 2／6 行", "看你的本命棋子「俥」！", "答對 3 題", "✨ 修為 +5", "♟ 一步將軍・1 分鐘", "練習賽・星淵試陣，約 2 分鐘，不算輸贏"]) { const x = T(s); assert.ok(x != null && !CJK.test(x), "翻不出來：" + s + " → " + x) }
});
test("中文模式：07i18n 什麼都不裝（沒有 MutationObserver、沒有樣式、沒有語言範圍說明），主線的字一個都不換", () => {
  const { ctx, doc, OBS } = loadFull(null);
  assert.equal(OBS.length, 0, "沒有裝任何 MutationObserver"); assert.equal(doc.head.childNodes.length, 0, "沒有注入英文樣式");
  const card = doc.createElement("div"); card.id = "mnqCard"; card.append("下一步", "破局！", "出發"); doc.body.appendChild(card);
  assert.equal(card.textContent, "下一步破局！出發");
  assert.equal(doc.getElementById("i18nStory"), null);
  assert.equal(ctx.i18nT("vn.skip", "跳過"), "跳過", "鍵值化的字中文模式回中文");
});
test("英文主線已翻譯，進場不再出現過時的中文範圍提示", () => {
  const A = loadFull("en");
  assert.ok(A.OBS.some(o => o.o && o.o.subtree), "動態翻譯觀察者照舊");
  const card = A.doc.createElement("div"); card.id = "mnfPg";
  card.append("楚河渡口，星槎醒了。"); A.doc.body.appendChild(card);
  A.ctx.i18nApply(card);
  assert.equal(card.textContent, "At the Chu River ferry, the Star Raft awakens.");
  assert.equal(A.doc.getElementById("i18nStory"), null);
});
test("〔混合〕英文模式：語言選單（設定頁頂欄 🌐）分兩段寫英文可用範圍與只有中文的範圍，提到主線；朱印標 data-noi18n 不翻（「勝」不會變成 W）", () => {
  const sh = cut(I18N, "function i18nSheet(", "\n/* ================= 畫面");
  assert.match(sh, /In English:<\/b>[^<]*main quest/); assert.match(sh, /Chinese only for now:<\/b>[^<]*story scenes/);
  assert.match(sh, /data-noi18n[^>]*>英文介面目前涵蓋：[^<]*主線楔子「古典・河圖初渡」[^<]*仍只有中文/);   /* 11/18 第一章改名楔子 */   /* 11/15 星槎遠征令拿掉、第二章下架：說明改成只講第一章 */
  assert.doesNotMatch(sh, /星槎遠征令|第一、二章|Chapters 1 and 2|Star Raft Expedition Orders\)/);
  assert.match(MNQ, /<div class="gf-seal" data-noi18n>/); assert.match(MNF, /d\.className="mnf-seal";d\.setAttribute\("data-noi18n",""\)/); assert.match(MNV, /<div class="seal" aria-hidden="true" data-noi18n>/);
  assert.equal(T("勝"), "W", "（字典裡的「勝」是戰績的 W，所以朱印一定要標 data-noi18n）");
});

/* ================= ②b 所有頁面共用的頂欄（開發者 11/14 選定）：時辰、登船狀態與節氣、官階、修為 ================= */
const SHI = rd("07w8-shichen.js"), TODAY = rd("07y5-todaymap.js"), SEAS = rd("07w7-seasons.js");
function topbarSrc() {
  const ctx = { window: {} }; vm.createContext(ctx);
  vm.runInContext(cut(CPU, "const RANK_T=", "\n") + "\n" + cut(CPU, "window.RANKT=", "\n") + "\n" + cut(SHI, "const CLK_ZHI=", "\n") + "\n" + cut(SHI, "const clkHH=", "\n") + "\n" + cut(SHI, "const CLK_ERA=", "\n") + "\n"
    + cut(TODAY, "const TD_TERMS=", "\nfunction ") + "\n" + cut(SEAS, "const sw7Shi=", "\n") + "\n;this.S={RANK_T,RANKT:window.RANKT,CLK_ZHI,clkHH,CLK_ERA,TD_TERMS,sw7Shi}", ctx, { filename: "06-cpu+07w8+07y5+07w7（頂欄）" });
  return ctx.S;
}
test("英文模式：頂欄的時辰一律寫成現代鐘點（跟 07w8 clkHH 的鐘點一致，例如申時＝3–5 pm）；24 節氣、登船狀態、停靠朝代、讀螢幕標籤都翻得出來；中文模式原樣", () => {
  const S = topbarSrc(), ampm = h => (h % 12 || 12) + " " + (h < 12 ? "am" : "pm");
  assert.equal(S.CLK_ZHI.length, 12); assert.equal(S.TD_TERMS.length, 24);
  for (let i = 0; i < 12; i++) {
    const [a, b] = S.clkHH(i), want = (a < 12) === (b < 12) ? (a % 12 || 12) + "–" + ampm(b) : ampm(a) + "–" + ampm(b);
    assert.equal(T(S.CLK_ZHI[i] + "時"), want, S.CLK_ZHI[i] + "時要跟鐘點 " + a + "–" + b + " 一致");
  }
  for (let h = 0; h < 24; h++) { const s = S.sw7Shi(new Date(2026, 10, 14, h, 30)), e = T(s); assert.ok(e && /^\d+( am| pm)?–\d+ (am|pm)$/.test(e), "07w7 sw7Shi 也同一種寫法：" + s + " → " + e) }
  const L = [];
  for (const [, , tm] of S.TD_TERMS) {
    L.push(tm, "⛵ 還沒登船・" + tm, "⛵ 第 3 天・" + tm, "⛵ 船上第 12 天・" + tm + "・申時", "現在是申時（晡時，15 點到 17 點），節氣" + tm + "。點了看船齡和十二時辰");
    for (const z of Object.values(S.CLK_ERA)) L.push("⛵ " + z + "・第 3 天・" + tm);
  }
  L.push("⛵ 還沒登船", "✶ 雲河無歲月", "雲河無歲月：在星槎上，時辰不走。點了看船齡", "現在是子時（夜半，23 點到 1 點）。點了看船齡和十二時辰");
  for (const s of L) { const e = T(s); assert.ok(e != null && !CJK.test(e), "翻不出來：" + s + " → " + e) }
  assert.equal(T("⛵ 唐・第 3 天・立冬"), "⛵ Tang · Day 3 · Start of Winter"); assert.equal(T("⛵ 還沒登船・冬至"), "⛵ Not aboard · Winter Solstice");
  for (const s of L) assert.equal(show("zh", s), s, "中文模式原樣");
});
test("英文模式：頂欄右上的官階（RANKT 各朝全部九品：經典與各朝的「X品官」、秦二十等爵、漢秩祿）與「修為 Lv N」都翻得出來", () => {
  const S = topbarSrc(), eras = ["classic", ...Object.keys(S.CLK_ERA)], seen = new Set();
  for (const e of eras) for (let g = 1; g <= 9; g++) seen.add(S.RANKT(e, g));
  assert.ok(seen.size >= 27, "九品官＋秦＋漢至少 27 種：" + seen.size);
  for (const r of seen) { const e = T(r); assert.ok(e != null && !CJK.test(e), "官階翻不出來：" + r + " → " + e) }
  assert.equal(T("九品官"), "Rank 9 official"); assert.equal(T(S.RANKT("han", 1)), "10,000-bushel official"); assert.equal(T(S.RANKT("qin", 1)), "Marquis");
  for (const n of [1, 9, 12, 99]) assert.equal(T("修為 Lv " + n), "XP Lv " + n);
  assert.match(LEGEND, /<small>\$\{esc\(R\.name\)\}<br>修為 Lv \$\{I\.L\}<\/small>/, "07-legend meChip 的字跟測的一樣");
});
test("〔混合〕禮包的「收下」按鈕用自己的鍵（英文 Accept）；別處的「收下」照字典 Received；繁中一字不差", () => {
  assert.match(MNQ, /<button type="button" class="g" id="mnqGf2" data-i18n="mnq\.accept">收下<\/button>/);
  const run = lang => { const A = loadFull(lang), d = A.doc, bt = d.createElement("button"); bt.id = "mnqGf2"; bt.setAttribute("data-i18n", "mnq.accept"); bt.append("收下");
    const p = d.createElement("span"); p.append("收下"); d.body.append(bt, p); A.ctx.i18nApply(d.body); return [bt.textContent, p.textContent] };
  assert.deepEqual(run("en"), ["Accept", "Received"]);
  const A = loadFull(null), bt = A.doc.createElement("button"); bt.setAttribute("data-i18n", "mnq.accept"); bt.append("收下"); A.doc.body.append(bt);
  assert.equal(bt.textContent, "收下", "繁中模式不裝、不換");
});

/* ================= ③ 舊轉移碼停收 ================= */
function fakeIDB() {
  const dbs = new Map(), later = f => setImmediate(f);
  return { open(name) { const r = {}; later(() => { let fresh = false; if (!dbs.has(name)) { dbs.set(name, {}); fresh = true } const st0 = dbs.get(name);
    const db = { createObjectStore(s) { st0[s] = st0[s] || new Map() }, close() { },
      transaction(s) { const t = {}; let pending = 0, done = false; const st = st0[s] || (st0[s] = new Map());
        const fin = () => later(() => { if (!pending && !done) { done = true; t.oncomplete && t.oncomplete() } });
        const req = op => { const q = {}; pending++; later(() => { q.result = op(); q.onsuccess && q.onsuccess(); pending--; fin() }); return q };
        t.objectStore = () => ({ get: k => req(() => st.get(k)), put: (v, k) => req(() => { st.set(k, structuredClone(v)); return k }), getAllKeys: () => req(() => [...st.keys()]) }); fin(); return t } };
    r.result = db; if (fresh) r.onupgradeneeded && r.onupgradeneeded(); r.onsuccess && r.onsuccess() }); return r } };
}
const server = () => ({ ret: new Map(), calls: [] });
function phone(S, ls0) {
  const ls = new Map(Object.entries(ls0 || {})), msgs = [], called = { dl: 0 };
  const localStorage = { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const net = op => async (t, s) => { S.calls.push([op, t]); if (op === "put") { if (s === "") S.ret.delete(t); else S.ret.set(t, s); return true } return S.ret.has(t) ? S.ret.get(t) : null };
  const B = { innerHTML: "", els: {}, querySelector(q) { return this.els[q] || (this.els[q] = { value: "", textContent: "", onclick: null }) } };
  const ctx = { console, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream, btoa, atob, structuredClone, localStorage, crypto: nodeCrypto.webcrypto, indexedDB: fakeIDB(),
    setTimeout: f => setImmediate(f), XQSave: { dump: () => Object.fromEntries(ls), load: () => { } }, slotAll: async () => ({}), OFF: true,
    XQNet: { root: () => "xqlab-test/v1", status: () => "up", putRetained: net("put"), getRetained: net("get"), sub: net("sub"), subscribe: net("sub") },
    toast: t => msgs.push(["toast", t]), sheet: (t, f) => f(B), modal: h => msgs.push(["modal", h]), esc: s => String(s), meInfo: () => ({ id: "NEWphone0000" }) };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(cut(SET, "/* XFER:BEGIN", "/* XFER:END */") + "\n" + cut(SAVE, "/* XFER2:BEGIN", "/* XFER2:END */") + "\n" + cut(SAVE, "/* XFER4:BEGIN", "/* XFER4:END */") + "\n"
    + cut(SET, "async function xfRecv(", "\n/* 意見回饋 491（開發者）") + "\nxfUpload=xf4Upload;xfDownload=xf4Download;"
    + "\nglobalThis.__X={xfUpload:(...a)=>xfUpload(...a),xf4Code,xf4Download,xfRecv,XF4_OLD};const __dl=xfDownload;xfDownload=(...a)=>{__called.dl++;return __dl(...a)};", Object.assign(ctx, { __called: called }), { filename: "05-settings+05b-save(XFER)" });
  return { X: ctx.__X, ls, msgs, B, called };
}
test("舊 8 碼：下載直接回停用提示，不讀不寫不訂閱任何主題；畫面 xfRecv 看到 8 碼也直接顯示停用提示、不呼叫下載；這支手機的存檔一個字都不動；停用提示有英文", async () => {
  const S = server(), N = phone(S, { m_xp: "321", xq_me: JSON.stringify({ id: "NEWphone0000", name: "小新" }), m_era: "\"tang\"" }), before = new Map(N.ls);
  for (const c of ["ABCD2345", "abcd-2345", " AbCd 2345 "]) await assert.rejects(N.X.xf4Download(c), e => e.message === N.X.XF4_OLD, c);
  assert.deepEqual(S.calls, [], "沒有任何網路動作");
  await N.X.xfRecv(); N.B.querySelector("#xfC").value = "abcd-2345"; await N.B.querySelector("#xfGo").onclick();
  assert.equal(N.B.querySelector("#xfM").textContent, N.X.XF4_OLD, "畫面顯示停用提示"); assert.equal(N.called.dl, 0, "沒有呼叫 xfDownload"); assert.deepEqual(S.calls, []);
  assert.deepEqual(new Map(N.ls), before, "這支手機的存檔不動");
  assert.match(N.X.XF4_OLD, /8 碼/); assert.match(N.X.XF4_OLD, /已經停用/); assert.match(N.X.XF4_OLD, /重新產生/);
  const en = T(N.X.XF4_OLD); assert.ok(en && !CJK.test(en), "英文：" + en); assert.match(en, /8-character/); assert.match(en, /new transfer code/);
  N.B.querySelector("#xfC").value = "ABCDE2345"; await N.B.querySelector("#xfGo").onclick(); assert.equal(N.B.querySelector("#xfM").textContent, "轉移碼是 10 碼"); assert.ok(T("轉移碼是 10 碼"));
});
test("10 碼照常：舊手機產生、新手機從畫面輸入，收到一樣的資料並跳「取代這支手機？」；舊手機自己的存檔不動", async () => {
  const S = server(), OLD = { m_xp: "1234", xq_me: JSON.stringify({ id: "OLDphone1234", name: "小明" }), xq_rate: JSON.stringify({ pts: 320 }) };
  const A = phone(S, OLD), N = phone(S, { m_xp: "5" }), code = A.X.xf4Code();
  assert.equal(code.length, 10);
  const U = await A.X.xfUpload(code); assert.ok(U.n >= 1);
  assert.deepEqual(Object.fromEntries([...A.ls].filter(([k]) => k in OLD)), OLD, "舊手機的存檔不動（只多記 xq_xfOut 等回條）");
  await N.X.xfRecv(); N.B.querySelector("#xfC").value = code.slice(0, 5) + "-" + code.slice(5); await N.B.querySelector("#xfGo").onclick();
  assert.equal(N.called.dl, 1); const md = N.msgs.find(m => m[0] === "modal"); assert.ok(md, "跳出取代確認：" + JSON.stringify(N.msgs) + N.B.querySelector("#xfM").textContent);
  assert.match(md[1], /用舊手機的資料取代這支手機？/); assert.doesNotMatch(md[1], /安全性較低/);
  assert.equal(N.ls.get("m_xp"), "5", "按「取代」之前，新手機的存檔不動");
});
test("〔原始碼〕8 碼停收只動「輸入舊碼」這條路：v4 的下載不再呼叫 v3（xf2Download）、沒有到期日常數；匯出成檔案、讀入檔案、10 碼上傳都沒有碰 8 碼", () => {
  const B4 = cut(SAVE, "/* XFER4:BEGIN", "/* XFER4:END */");
  assert.doesNotMatch(B4, /xf2Download\(|XF4_V3_UNTIL|xfWarn/); assert.match(B4, /if\(c\.length===8\)throw new Error\(XF4_OLD\)/);
  assert.ok(B4.indexOf("if(c.length===8)throw new Error(XF4_OLD)") < B4.indexOf("xf4Keys(c)", B4.indexOf("async function xf4Download")), "連線、導金鑰之前就擋下");
  const recv = cut(SET, "async function xfRecv(", "\n/* 意見回饋 491（開發者）");
  assert.doesNotMatch(recv, /xfWarn|安全性較低/);
  const exp = SAVE.slice(0, SAVE.indexOf("/* ---------- 📱 換手機轉移碼補強"));
  assert.doesNotMatch(exp, /XF4_OLD|length===8/, "存檔匯出、讀入那段沒有被動到");
  assert.doesNotMatch(SAVE + SET, /GPU 幾分鐘|31\^8/, "不留 v3 反推的做法");
});
