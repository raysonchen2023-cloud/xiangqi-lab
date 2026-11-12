// 評比循環第 14 輪 F1 英文介面架構（m/07i18n.js）的自動測試，不開瀏覽器：
//   ① 字典：鍵都有中文、值都是英文（不留中文、不用彎引號）；靠畫面字找段落的保留字（I18N_GUARD）不在字典裡
//   ② 主流程畫面的字：從原始碼切出底欄／頂欄、首頁滿版圖、挑戰電腦雅間、快速對局與開新局選單、選對手卡、對局頁工具列與狀態列、
//      認輸／悔棋確認、結果視窗、設定頁分頁與標題，每一段固定的字都翻得出英文（動態組字的片段另列，由句型測試驗）
//   ③ 假 DOM：用 App 自己的 gameLayout、playerHTML、actionBar、renderStrip 畫出對局頁，切英文後看得到的字都是英文；切回繁中完全還原；
//      頭像圓章、棋盤 SVG、語言選項不動；新加的節點、改過的字（MutationObserver）也會換
//   ④ 讀螢幕：WXF 記譜跟 core.js 的中文記譜對得上（開局、黑方、同一路兩子）；每步念法、格子念法
//   ⑤ 切換：選 English／繁體／簡體各做對的事；英文開機換 html lang、標題、念法；繁中開機什麼都不裝；簡體選項照舊
//   ⑥ 接線：m.html include、設定頁 🌐 與 English 選項、說明文件兩份逐字相同、名稱不撞
// 用法：node --test xiangqi-lab/tools/test-i18n.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SRC = rd(path.join(M, "07i18n.js")), SET = rd(path.join(M, "05-settings.js")), CPU = rd(path.join(M, "08b-cpugame.js")), UTIL = rd(path.join(M, "00-util.js")), HTML = rd(path.join(DB, "m.html"));
const C = require("../site/core.js");
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;

/* ---------- 純函式區段 ---------- */
function loadPure() {
  const i = SRC.indexOf("#I18N-PURE-BEGIN"), j = SRC.indexOf("/* #I18N-PURE-END */");
  assert.ok(i > 0 && j > i, "找不到 #I18N-PURE 區段");
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(SRC.slice(SRC.indexOf("\n", i) + 1, j) + ";this.R={I18N_EN,I18N_GUARD,i18nText,i18nLine,i18nMove,i18nWxf,i18nMoveLine,i18nCellLabel,i18nPcName,i18nNum,i18nDate,i18nCnNum}", ctx, { filename: "07i18n(純函式)" });
  return ctx.R;
}
const R = loadPure(), T = s => R.i18nText(s);

/* ---------- 很小的 JS 字面字串掃描：略過註解、正規式；模板的 ${…} 換成 \u0001，裡面的字串另外收 ---------- */
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
/* 字串 → 畫面上的字段：照 < > " = 切開，留有中文、沒有 ${…} 的那幾段 */
const pieces = L => { const set = new Set(); for (const s of L) for (const p of String(s).split(/[<>"=]/)) { const t = p.trim(); if (t && CJK.test(t) && !t.includes("\u0001")) set.add(t) } return [...set] };
const cut = (src, a, b) => { const i = src.indexOf(a); assert.ok(i >= 0, "切不到：" + a.slice(0, 40)); const j = b ? src.indexOf(b, i + a.length) : src.indexOf("\n", i); assert.ok(j > i, "切不到結尾：" + String(b).slice(0, 40)); return src.slice(i, j) };
/* 動態組字的片段（"再 "+n+" 分"）、圓章單字、被 <b> 切開的說明句：單獨翻不出來是正常的，整句由句型測試（④⑤）驗 */
const FRAG = new Set(["分", "第", "級", "次", "張）", "這盤還有", "用 1 張悔棋符，退回你的上一步？（現在有", "🎉 升為", "降為", "⚔ 去", "正式上桌", "幻", "掌", "真", "帥", "將",
  "第 N 級", "是電腦對手的強度（1 最弱、18 最強；幻影棋客、笑面掌櫃都照這個級數）；括號裡是同等棋力的", "：新手→入門 1～3→業餘 1～9 級→專業。晉級賽贏棋升的就是這個段位。", "修為 Lv", "是走故事、做題累積的經驗，跟棋力無關。"]);

/* ---------- 假 DOM（只做到測試要用的：節點樹、屬性、innerHTML 解析與輸出、簡單選擇器） ---------- */
const VOID = /^(img|br|input|meta|hr|link)$/i;
const dec = s => String(s).replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m, k) => ({ amp: "&", lt: "<", gt: ">", quot: "\"", "#39": "'", nbsp: "\u00a0" }[k]));
const encT = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"), encA = s => encT(s).replace(/"/g, "&quot;");
class FNode {
  constructor(t) { this.nodeType = t; this.parentNode = null; this.childNodes = [] }
  get firstChild() { return this.childNodes[0] || null }
  get nextSibling() { const p = this.parentNode; if (!p) return null; return p.childNodes[p.childNodes.indexOf(this) + 1] || null }
  get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.childNodes.push(c); return c }
  append(...cs) { for (const c of cs) this.appendChild(typeof c === "string" ? new FText(c) : c) }
  removeChild(c) { const i = this.childNodes.indexOf(c); if (i >= 0) this.childNodes.splice(i, 1); c.parentNode = null; return c }
}
class FText extends FNode { constructor(v) { super(3); this.nodeValue = String(v); this.nodeName = "#text" } get textContent() { return this.nodeValue } }
class FEl extends FNode {
  constructor(tag) { super(1); this.nodeName = this.tagName = String(tag).toUpperCase(); this.attrs = new Map(); this.style = {}; this.dataset = {};
    const me = this; this.classList = { contains: c => (me.getAttribute("class") || "").split(/\s+/).includes(c), add: c => { if (!me.classList.contains(c)) me.setAttribute("class", ((me.getAttribute("class") || "") + " " + c).trim()) }, toggle: () => { }, remove: () => { } } }
  getAttribute(a) { return this.attrs.has(a) ? this.attrs.get(a) : null }
  setAttribute(a, v) { this.attrs.set(a, String(v)) }
  hasAttribute(a) { return this.attrs.has(a) }
  removeAttribute(a) { this.attrs.delete(a) }
  get className() { return this.getAttribute("class") || "" } set className(v) { this.setAttribute("class", v) }
  get id() { return this.getAttribute("id") || "" } set id(v) { this.setAttribute("id", v) }
  get title() { return this.getAttribute("title") || "" } set title(v) { this.setAttribute("title", v) }
  get children() { return this.childNodes.filter(c => c.nodeType === 1) }
  get textContent() { return this.childNodes.map(c => c.textContent).join("") }
  set textContent(v) { for (const c of [...this.childNodes]) this.removeChild(c); if (v !== "" && v != null) this.appendChild(new FText(v)) }
  get innerText() { return this.textContent }
  get innerHTML() { return this.childNodes.map(ser).join("") }
  set innerHTML(h) { for (const c of [...this.childNodes]) this.removeChild(c); parseInto(this, String(h)) }
  matches(sel) { return sel.split(",").some(s => one(this, s.trim())) }
  closest(sel) { for (let e = this; e && e.nodeType === 1; e = e.parentNode) if (e.matches(sel)) return e; return null }
  querySelectorAll(sel) { const out = []; const parts = sel.trim().split(/\s+/); const walk = n => { for (const c of n.children) { if (descMatch(c, parts, this)) out.push(c); walk(c) } }; walk(this); return out }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null }
}
function one(el, s) { const m = s.match(/^([a-z0-9]*)((?:[#.][\w-]+)*)(?:\[([\w-]+)\])?$/i); if (!m) return false; if (m[1] && el.nodeName !== m[1].toUpperCase()) return false;
  for (const x of m[2].match(/[#.][\w-]+/g) || []) { if (x[0] === "#" && el.id !== x.slice(1)) return false; if (x[0] === "." && !el.classList.contains(x.slice(1))) return false } if (m[3] && !el.hasAttribute(m[3])) return false; return true }
function descMatch(el, parts, root) { if (!one(el, parts[parts.length - 1])) return false; let k = parts.length - 2; for (let e = el.parentNode; k >= 0 && e && e !== root.parentNode; e = e.parentNode) if (e.nodeType === 1 && one(e, parts[k])) k--; return k < 0 }
function ser(n) { if (n.nodeType === 3) return encT(n.nodeValue); let a = ""; for (const [k, v] of n.attrs) a += " " + k + "=\"" + encA(v) + "\""; const t = n.nodeName.toLowerCase(); return "<" + t + a + ">" + (VOID.test(t) ? "" : n.childNodes.map(ser).join("") + "</" + t + ">") }
function parseInto(root, h) {
  const st = [root]; const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>|[^<]+|</g; let m;
  while ((m = re.exec(h))) {
    const top = st[st.length - 1];
    if (m[0].startsWith("<!--")) continue;
    if (m[1]) { for (let i = st.length - 1; i > 0; i--) if (st[i].nodeName === m[1].toUpperCase()) { st.length = i; break } continue }
    if (m[2]) { const e = new FEl(m[2]); for (const a of (m[3] || "").matchAll(/([^\s=>\/]+)(?:\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) e.setAttribute(a[1], dec(a[3] != null ? a[3] : a[4] != null ? a[4] : a[5] != null ? a[5] : "")); top.appendChild(e); if (!VOID.test(m[2]) && !/\/>$/.test(m[0])) st.push(e); continue }
    top.appendChild(new FText(dec(m[0])));
  }
}
function fakeDoc() {
  const d = new FNode(9); d.nodeName = "#document"; const html = new FEl("html"); d.appendChild(html); const head = new FEl("head"), body = new FEl("body"); html.append(head, body);
  Object.assign(d, { documentElement: html, head, body, title: "象棋千秋", createElement: t => new FEl(t), createTextNode: v => new FText(v),
    querySelector: s => html.querySelector(s), querySelectorAll: s => html.querySelectorAll(s), getElementById: id => html.querySelector("#" + id) });
  return d;
}
/* 看得到的字：文字節點（略過 SVG、頭像圓章、語言選項）＋ aria-label／title／placeholder */
function seen(root) {
  const out = []; const w = n => { if (n.nodeType === 3) { if (n.nodeValue.trim()) out.push(n.nodeValue.trim()); return }
    if (n.nodeType !== 1) return; if (/^(SVG|SCRIPT|STYLE)$/.test(n.nodeName) || n.classList.contains("av") || n.hasAttribute("data-nocc")) return;
    for (const a of ["aria-label", "title", "placeholder"]) if (n.getAttribute(a)) out.push(n.getAttribute(a)); for (const c of n.childNodes) w(c) };
  w(root); return out;
}
/* 整個模組載入假環境（lang＝"en" 或 null；zh＝zh.js 的繁簡模式） */
function loadFull(lang, zh) {
  const doc = fakeDoc(), ls = new Map(), MO = { cb: null, opts: null }, said = [], calls = { reload: 0, zhSet: [], toast: [] };
  if (lang) ls.set("m_lang", JSON.stringify(lang));
  const localStorage = { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const store = { get(k, d) { const v = localStorage.getItem("m_" + k); return v == null ? d : JSON.parse(v) }, set(k, v) { localStorage.setItem("m_" + k, JSON.stringify(v)) } };
  const ctx = { document: doc, localStorage, store, navigator: { language: "en-US", languages: ["en-US"] }, console,
    MutationObserver: class { constructor(cb) { MO.cb = cb } observe(t, o) { MO.target = t; MO.opts = o } },
    toast: t => calls.toast.push(t), vibrate: () => { }, sheet: () => { }, closeSheet: () => { }, setTimeout: f => { f(); return 0 },
    location: { reload: () => calls.reload++ },
    axmMoveLine: () => "中文念法", axmCellLabel: () => "中文格子", axmPcName: () => "紅方 炮", axSay: t => said.push(t), axsAlert: t => said.push("!" + t),
    XQ_ZH: { mode: () => zh || "tw", set: k => calls.zhSet.push(k) } };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(SRC, ctx, { filename: "07i18n.js" });
  return { ctx, doc, ls, MO, said, calls };
}
/* App 自己畫對局頁的函式（05-settings gameLayout／playerHTML／renderStrip／actionBar） */
function appFns(doc) {
  const fn = name => { const i = SET.indexOf("function " + name + "("); assert.ok(i >= 0, "找不到 " + name); let d = 0, j = SET.indexOf("{", i); for (; j < SET.length; j++) { if (SET[j] === "{") d++; else if (SET[j] === "}" && --d === 0) break } return SET.slice(i, j + 1) };
  const ctx = { document: doc, esc: s => encA(s), myChar: () => null, WX_CHARS: {}, meName: () => "小帥", vibrate: () => { }, QC: { "正著": "#2F6B4F" } };
  vm.createContext(ctx); vm.runInContext(["gameLayout", "playerHTML", "renderStrip", "actionBar"].map(fn).join("\n") + ";this.F={gameLayout,playerHTML,renderStrip,actionBar}", ctx);
  return ctx.F;
}
/* 照 App 的樣子畫一頁跟電腦的快速對局（頂欄、底欄、對手列、狀態列、著法條、工具列、結果視窗、認輸確認） */
function gamePage(doc) {
  const app = HTML.slice(HTML.indexOf("<div class=\"app\">"), HTML.indexOf("<script>"));
  doc.body.innerHTML = app; const F = appFns(doc), v = doc.body.querySelector("#view");
  doc.body.querySelector("#title").textContent = "♟ 快速對局";
  F.gameLayout(v);
  v.querySelector("#pTop").innerHTML = F.playerHTML("b", "幻影棋客", "往後算 3 步，會漏子") + `<button class="cpu-chip" aria-label="換難度"><span><b>第 3 級</b><small>入門3</small></span><i>›</i></button>`;
  v.querySelector("#pBot").innerHTML = F.playerHTML("r", "小帥", "紅方・再 16 分升 業3");
  v.querySelector("#stat").textContent = "👉 輪到你・紅方稍好，約領先 1.5 個兵";
  F.renderStrip(v.querySelector("#strip"), [{ cn: "炮二平五", by: "r", q: "正著" }, { cn: "馬8進7", by: "b" }], 1);
  const items = vm.runInNewContext(cut(CPU, "const acts=actionBar(v.querySelector(\"#acts\"),", "]]);").replace("const acts=actionBar(v.querySelector(\"#acts\"),", "") + "]]", { bagSheet() { }, undoAsk() { }, newSheet() { }, confirmBox() { }, post() { }, review() { }, setupSheet() { }, peek() { }, st: null });
  F.actionBar(v.querySelector("#acts"), items);
  const md = doc.createElement("div"); md.className = "modal"; doc.body.appendChild(md);
  md.innerHTML = `<div class="box"><div class="em">🏆</div><h2>你贏了！</h2><p class="muted">將死・對手幻影棋客・第 3 級「入門3」</p><p style="font-size:14px">手感不錯！要不要去茶肆打晉級賽，讓這股氣勢算進段位？</p><p class="muted">這盤是快速對局，不算段位分。</p><div class="row"><button>🔎 看懂這盤最關鍵的一步 ›</button><button>♟ 再來一局</button><button>⚔ 去茶肆正式上桌</button><button>📊 檢討</button><button>🏠 首頁</button><button>看看棋盤</button></div></div>`;
  const cf = doc.createElement("div"); cf.className = "modal"; doc.body.appendChild(cf);
  cf.innerHTML = `<div class="box"><h2 style="font-size:19px">確定認輸？</h2><div class="row"><button>認輸</button><button>取消</button></div></div>`;
  return v;
}

// ====================== ① 字典 ======================
test("字典：每個鍵都有中文、每個值都是英文（不留中文、不用彎引號、不是空字串）", () => {
  const E = R.I18N_EN, keys = Object.keys(E);
  assert.ok(keys.length >= 250, "字典只有 " + keys.length + " 筆");
  for (const k of keys) { assert.ok(CJK.test(k), "鍵沒有中文：" + k); const v = E[k]; assert.ok(typeof v === "string" && v.trim(), "空值：" + k); assert.ok(!CJK.test(v), "值還有中文：" + k + "→" + v); assert.ok(!/[\u201c\u201d\u2018\u2019]/.test(v), "彎引號：" + v) }
});
test("〔原始碼〕字典沒有重複的鍵（物件字面量重複時後面的會默默蓋掉前面）", () => {
  const body = cut(SRC, "const I18N_EN={", "\n};"), seenK = new Map();
  for (const m of body.matchAll(/"((?:[^"\\]|\\.)*)":"(?:[^"\\]|\\.)*"/g)) { assert.ok(!seenK.has(m[1]), "重複的鍵：" + m[1]); seenK.set(m[1], 1) }
  assert.ok(seenK.size >= 250);
});
test("保留字（別的模組用畫面上的字找段落）不在字典裡，翻譯結果也是 null", () => {
  for (const g of R.I18N_GUARD) { assert.ok(!Object.prototype.hasOwnProperty.call(R.I18N_EN, g), "字典不能有：" + g); assert.equal(T(g), null, g) }
  assert.deepEqual([...R.I18N_GUARD].sort(), ["上星槎", "下船", "估計棋力", "取代這支手機", "官階", "正在對戰", "進階", "隱私"].sort());
});
test("翻譯規則：沒有中文回 null；翻不完整（還剩中文）整句不換；前後圖示與全形標點保留成英文標點", () => {
  assert.equal(T("Level 3"), null); assert.equal(T(""), null);
  assert.equal(T("劉備的棋"), null, "不在字典的人名句子不換");
  assert.equal(T("將死・劉備"), null, "半中半英不出現");
  assert.equal(T("🤔 思考中…"), "🤔 Thinking…"); assert.equal(T("你贏了！"), "You won!"); assert.equal(T("⚠ 被將軍！"), "⚠ Check!");
  assert.equal(T("挑戰下一級 ›"), "Next level ›"); assert.equal(T("（已通關）"), "(cleared)");
  assert.equal(R.i18nLine("  挑戰電腦 "), "  Play the computer ", "文字節點前後的空白照留");
});

// ====================== ② 主流程畫面的字（從原始碼切出來） ======================
const REGIONS = [
  ["m.html 頂欄與底欄", HTML, "<div class=\"app\">", "<script>"],
  ["00-util 認輸／確認框、紅黑方", UTIL, "function confirmBox(", "\n"],
  ["08b 對局工具列", CPU, "const acts=actionBar(", "]]);"],
  ["08b 頂欄模式（晉級賽／練功房）", CPU, "seg.innerHTML=", "\n"],
  ["08b 悔棋確認", CPU, "function undoBox(", "/* 意見回饋 597（開發者）：對局中多一顆"],
  ["08b 狀態列", CPU, "else if(st.thinking)S2.textContent=", "if(st.practice&&!st.result&&!st.msg"],
  ["08b 結果視窗按鈕", CPU, "const resBtns=(main,back,noRev,back2)=>", "\n"],
  ["08b 晉級賽結果", CPU, "if(st.ranked){const R=st.rate;", "if(MODE===\"arena\"&&ARENA[st.arena])"],
  ["08b 挑戰電腦結果", CPU, "      modal(`<div class=\"em\">${win?\"🏆\":draw0?\"🤝\":\"💪\"}</div><h2>${win?\"你贏了！\":draw0?\"和局\":\"這盤輸了\"}</h2><p class=\"muted\">${esc(st.result.why)}・${st.journey", "/* ================= ChatGPT 改善單 T01"],
  ["08b 快局結算一句話", CPU, "const QKH=typeof hbHubN", "\n"],
  ["08b 快速對局選單", CPU, "function quickSheet(){", "function newSheet(){"],
  ["08b 挑戰電腦開新局選單", CPU, "function newSheet(){", "// 上一盤已經下完"],
  ["07m3 電腦對手名字與選對手卡", rd(path.join(M, "07m3-opptalk.js")), "const OPT_KM_CARD=", "function zgOppBind("],
  ["07z 首頁滿版圖入口", rd(path.join(M, "07z-homemap.js")), "const HM_PVP_NM=", "/* 開發者 11/11 選 ChatGPT 77 號方案一"],
  ["07z 首頁快速對局大按鈕", rd(path.join(M, "07z-homemap.js")), "function hmGoBar(", "/* 完全沒下過棋"],
  ["07z5 挑戰電腦雅間", rd(path.join(M, "07z5-cpuroom.js")), "", null],
  ["07s2 設定房間入口", rd(path.join(M, "07s2-setmap.js")), "const SM_SPOTS=[", "/* 回饋 831"]
];
for (const [name, src, a, b] of REGIONS) {
  test("主流程字段翻得出英文：" + name, () => {
    const part = a === "" ? src : cut(src, a, b);
    /* m.html 那段是 HTML 不是 JS：標籤之間的字＋aria-label／title */
    const P = src === HTML ? [...new Set([...part.replace(/<[^>]*>/g, "\n").split("\n"), ...[...part.matchAll(/(?:aria-label|title)="([^"]*)"/g)].map(m => m[1])].map(s => s.trim()).filter(s => CJK.test(s)))] : pieces(lits(part));
    assert.ok(P.length > 0, "這段切不到中文字（原始碼改了？）");
    const bad = P.filter(p => !FRAG.has(p) && T(p) == null);
    assert.deepEqual(bad, [], "翻不出來：" + bad.join("｜"));
  });
}
test("設定頁：四個分頁、各段標題、開關名稱都翻得出英文", () => {
  const part = cut(SET, "function Settings(v){", "<div data-pane=\"bot\">"), L = new Set();
  for (const m of part.matchAll(/\["(\w+)","([^"]+)","([^"]+)"\]/g)) L.add(m[3]);
  for (const m of part.matchAll(/class="sec-t"[^>]*>([^<$]+)</g)) L.add(m[1].trim());
  for (const m of part.matchAll(/<summary[^>]*>([^<]+)</g)) L.add(m[1].trim());
  for (const m of part.matchAll(/<b>([^<$]+)<\/b>/g)) L.add(m[1].trim());
  assert.ok(L.size >= 20, "切到的標題太少：" + L.size);
  const bad = [...L].filter(s => CJK.test(s) && T(s) == null); assert.deepEqual(bad, []);
  for (const k of ["角色", "棋盤", "聲音", "系統"]) assert.ok(L.has(k), "分頁：" + k);
});
test("動態句子（句型）：段位、分數、局面評估、結果副標、悔棋確認、時間提醒", () => {
  const cases = {
    "第 3 級": "Level 3", "開始第 7 級": "Start level 7", "216 分": "216 pts", "🏅 業餘2級": "🏅 Amateur 2", "業2": "Amateur 2", "入門3": "Beginner 3", "專1-2": "Expert 1-2", "專3・全力": "Expert 3 · Full strength",
    "紅方・再 16 分升 業3": "Red · 16 pts to Amateur 3", "積分 +16 → 216 分": "Rating +16 → 216 pts", "🎉 升為 業3": "🎉 Promoted to Amateur 3", "3 勝 2 負 1 和": "3W 2L 1D",
    "往後算 3 步，會漏子": "looks 3 moves ahead, sometimes hangs pieces", "每步想 6 秒，人類幾乎贏不了": "thinks 6 s per move, nearly unbeatable for humans",
    "👉 輪到你・紅方稍好，約領先 1.5 個兵": "👉 Your move · Red slightly better, ahead by about 1.5 pawns", "均勢，雙方差不多": "Even, roughly equal", "黑方約領先半個兵": "Black ahead by about half a pawn",
    "💡 提示：炮二平五": "💡 Hint: C2.5", "將死・對手幻影棋客・第 3 級「入門3」": "Checkmate · Opponent: Phantom Player · Level 3 \"Beginner 3\"", "你認輸・晉級賽（業餘2級）": "You resigned · Ranked (Amateur 2)",
    "用 1 張悔棋符，退回你的上一步？（現在有 3 張）": "Use 1 undo token to take back your last move? (You have 3)", "免費悔棋：退回你的上一步？（這盤還有 2 次）": "Free undo: take back your last move? (2 left this game)",
    "⚔ 去茶肆正式上桌": "⚔ Go to the Teahouse for rated play", "回首頁": "Home", "回雅間": "Back to Private room", "偷看（3）": "Peek (3)", "你的時間剩 5 分鐘": "Your time: 5 min left", "11月13日": "Nov 13",
    "快速對局用上一盤的難度（第 3 級），不算段位分。想換難度、打晉級賽，請到茶肆正式上桌。": "Quick games use the last game's level (Level 3) and don't count toward your rank. To change the level or play ranked, sit down at the Teahouse."
  };
  for (const [k, v] of Object.entries(cases)) assert.equal(T(k), v, k);
});

// ====================== ③ 假 DOM ======================
test("〔混合〕對局頁（App 自己的 gameLayout／playerHTML／renderStrip／actionBar 畫的）切英文後，看得到的字都是英文", () => {
  const { ctx, doc } = loadFull(null); const v = gamePage(doc);
  const before = seen(doc.body); assert.ok(before.filter(s => CJK.test(s)).length >= 25, "畫出來的中文太少，假 DOM 沒畫好");
  ctx.i18nApply(doc.body);
  const left = seen(doc.body).filter(s => CJK.test(s)); assert.deepEqual(left, [], "還有中文：" + left.join("｜"));
  const txt = seen(doc.body).join("｜");
  for (const w of ["Home", "Online", "Library", "Settings", "Quick game", "Phantom Player", "Xiao Shuai", "Your move", "C2.5", "H8+7", "Best", "Resign", "Review", "You won!", "Resign this game?", "Cancel", "View board"]) assert.ok(txt.includes(w), "看不到：" + w);
  assert.equal(v.querySelector("#acts").querySelector("button").getAttribute("aria-label"), "Items", "工具列按鈕的 aria-label 也換");
});
test("切回繁中：i18nRevert 後整頁跟原本一個字都不差；頭像圓章、棋盤 SVG、語言選項從頭到尾不動", () => {
  const { ctx, doc } = loadFull(null); gamePage(doc);
  const extra = doc.createElement("div"); extra.innerHTML = `<svg><text>帥</text></svg><div class="opt" data-nocc><button>繁體中文</button><button>English</button></div>`; doc.body.appendChild(extra);
  const html0 = doc.body.innerHTML; ctx.i18nApply(doc.body); const html1 = doc.body.innerHTML;
  assert.notEqual(html1, html0);
  assert.match(html1, /<div class="av b">將<\/div>/, "頭像圓章的字不換"); assert.match(html1, /<text>帥<\/text>/, "SVG 不換"); assert.match(html1, /<button>繁體中文<\/button>/, "語言選項不換");
  ctx.i18nRevert(doc.body); assert.equal(doc.body.innerHTML, html0);
});
test("還原只動自己換過的：程式之後自己改的字不被蓋回去", () => {
  const { ctx, doc } = loadFull(null); doc.body.innerHTML = `<p id="s">👉 輪到你</p>`; ctx.i18nApply(doc.body);
  const p = doc.body.querySelector("#s"); assert.equal(p.textContent, "👉 Your move");
  p.firstChild.nodeValue = "🤔 Thinking (set by app)"; ctx.i18nRevert(doc.body); assert.equal(p.textContent, "🤔 Thinking (set by app)");
});
test("英文模式：MutationObserver 監看整頁；新加的節點、改過的字、改過的 aria-label 都會換", () => {
  const { MO, doc } = loadFull("en"); assert.ok(MO.cb, "英文模式要裝 MutationObserver");
  assert.equal(MO.target, doc.body); assert.ok(MO.opts.subtree && MO.opts.characterData && MO.opts.childList); assert.deepEqual([...MO.opts.attributeFilter], ["aria-label", "title", "placeholder"]);
  const t = doc.createElement("div"); t.innerHTML = `<b>確定認輸？</b><button aria-label="認輸">🏳</button>`; doc.body.appendChild(t);
  MO.cb([{ type: "childList", addedNodes: [t] }]); assert.equal(t.textContent, "Resign this game?🏳"); assert.equal(t.querySelector("button").getAttribute("aria-label"), "Resign");
  const n = t.querySelector("b").firstChild; n.nodeValue = "和局"; MO.cb([{ type: "characterData", target: n }]); assert.equal(n.nodeValue, "Draw");
  const b = t.querySelector("button"); b.setAttribute("title", "關閉"); MO.cb([{ type: "attributes", target: b }]); assert.equal(b.getAttribute("title"), "Close");
});

// ====================== ④ 讀螢幕與 WXF 記譜 ======================
test("WXF 記譜跟 core.js 的中文記譜對得上：開局、黑方、士相馬、同一路兩子", () => {
  const sq = C.parseSq, b = C.parseFen(C.START.split(" ")[0]);
  const W = (bd, f, t) => R.i18nWxf(C.notate(bd, sq(f), sq(t)));
  assert.equal(W(b, "h2", "e2"), "C2.5"); assert.equal(W(b, "b0", "c2"), "H8+7"); assert.equal(W(b, "h9", "g7"), "H8+7", "黑馬（黑方自己右邊數）"); assert.equal(W(b, "h0", "g2"), "H2+3");
  assert.equal(W(b, "c0", "e2"), "E7+5"); assert.equal(W(b, "f0", "e1"), "A4+5"); assert.equal(W(b, "a0", "a1"), "R9+1"); assert.equal(W(b, "a3", "a4"), "P9+1");
  const b2 = C.parseFen("4k4/9/9/9/9/9/R8/R8/9/4K4"), cn = C.notate(b2, sq("a3"), sq("e3"));
  assert.match(cn, /^前/, "兩個俥在同一路"); assert.equal(R.i18nWxf(cn), "+R.5"); assert.equal(R.i18nWxf(C.notate(b2, sq("a2"), sq("a1"))), "-R-1");
  assert.equal(R.i18nWxf("劉備"), null);
  assert.equal(R.i18nMove("炮二平五").say, "Cannon 2 traverses to 5"); assert.equal(R.i18nMove("車1進3").say, "Chariot 1 advances 3"); assert.equal(R.i18nMove("後馬退七").say, "Rear Horse retreats to 7");
});
test("每步念法：你走／電腦走、吃子、將軍、將死、輪到你；看棋譜用 Red／Black；格子念法", () => {
  assert.equal(R.i18nMoveLine({ side: "r", me: "r", cn: "炮二平五" }), "You: Cannon 2 traverses to 5");
  assert.equal(R.i18nMoveLine({ side: "b", me: "r", cn: "馬8進7", opp: "電腦" }), "Computer: Horse 8 advances to 7; your move");
  assert.equal(R.i18nMoveLine({ side: "b", me: "r", cn: "車1進9", opp: "電腦", cap: "R", check: true }), "Computer: Chariot 1 advances 9, captures Red Chariot, check; your move");
  assert.equal(R.i18nMoveLine({ side: "r", me: "r", cn: "俥一平四", mate: true, check: true }), "You: Chariot 1 traverses to 4, checkmate");
  assert.equal(R.i18nMoveLine({ side: "b", cn: "砲8平5" }), "Black: Cannon 8 traverses to 5");
  assert.equal(R.i18nMoveLine({ side: "b", me: "r", cn: "砲8平5", opp: "劉備" }), "Opponent: Cannon 8 traverses to 5; your move", "不在字典的名字念 Opponent");
  assert.equal(R.i18nCellLabel("C", 7 * 9 + 1), "Red Cannon, file 8, rank 3"); assert.equal(R.i18nCellLabel(null, 0), "file 9, rank 10, empty"); assert.equal(R.i18nCellLabel("n", 0), "Black Horse, file 9, rank 10");
  assert.equal(T("紅方 炮，八路，第三排，已選取，可以吃"), "Red Cannon, file 8, rank 3, selected, can capture", "01-board 接在後面的中文尾巴也翻");
  assert.equal(T("選了紅炮，二路第三排，可以走 5 個位置"), "Selected Red Cannon, file 2, rank 3, 5 possible moves");
});
test("〔混合〕英文開機：html lang＝en、標題、讀螢幕念法換成英文；axSay 先翻再念；結果視窗念的是換好的英文", () => {
  const { ctx, doc, said } = loadFull("en");
  assert.equal(doc.documentElement.lang, "en"); assert.equal(doc.title, "Xiangqi Qianqiu");
  assert.equal(ctx.axmMoveLine({ side: "r", me: "r", cn: "炮二平五" }), "You: Cannon 2 traverses to 5"); assert.equal(ctx.axmCellLabel("C", 64), "Red Cannon, file 8, rank 3"); assert.equal(ctx.axmPcName("p"), "Black Soldier");
  ctx.axSay("取消選取"); ctx.axsAlert("將死"); assert.deepEqual(said, ["Deselected", "!Checkmate"]);
  const md = doc.createElement("div"); md.className = "modal"; md.innerHTML = `<div class="box"><div class="em">🏆</div><h2>你贏了！</h2><p>這段劇情對白不在字典裡</p></div>`; doc.body.appendChild(md);
  const zh = md.querySelector(".box").innerText.replace(/\s+/g, " ").trim().slice(0, 160); ctx.axSay(zh);
  assert.match(said[said.length - 1], /^🏆You won!/, "念之前先把視窗換成英文");
});
test("繁中開機：什麼都不裝（沒有 MutationObserver、念法照舊）；簡體模式 html lang＝zh-Hans", () => {
  const a = loadFull(null); assert.equal(a.MO.cb, null); assert.equal(a.doc.documentElement.lang, "zh-Hant"); assert.equal(a.ctx.axmMoveLine(), "中文念法"); assert.equal(a.doc.title, "象棋千秋");
  const b = loadFull(null, "cn"); assert.equal(b.MO.cb, null); assert.equal(b.doc.documentElement.lang, "zh-Hans");
});
test("英文系統、還沒選語言：只提示一次（不自動切）；選過語言就不提示", () => {
  const a = loadFull(null); assert.equal(a.ctx.i18nSuggest(), "en"); assert.equal(a.calls.toast.length, 1); assert.match(a.calls.toast[0], /English/); assert.equal(a.ctx.i18nLang(), "zh", "沒有自動切");
  const b = loadFull("en"); assert.equal(b.ctx.i18nSuggest(), null); assert.equal(b.calls.toast.length, 0);
});

// ====================== ⑤ 切換 ======================
test("選 English：記 lang＝en、繁簡模式回繁體、重新載入；切回繁體清掉 lang；選簡體交給 zh.js", () => {
  const a = loadFull(null, "cn"); a.ctx.i18nPick("en");
  assert.equal(a.ls.get("m_lang"), "\"en\""); assert.equal(a.ls.get("xq_zhMode"), "\"tw\""); assert.equal(a.calls.reload, 1); assert.equal(a.ctx.i18nCur(), "en");
  const b = loadFull("en"); b.ctx.i18nPick("tw"); assert.equal(b.ls.has("m_lang"), false); assert.equal(b.calls.reload, 1); assert.deepEqual(b.calls.zhSet, []);
  const c = loadFull(null); c.ctx.i18nPick("cn"); assert.deepEqual(c.calls.zhSet, ["cn"]); assert.equal(c.ls.has("m_lang"), false);
  const d = loadFull(null); d.ctx.i18nPick("tw"); assert.equal(d.calls.reload, 0, "已經是繁體就不重新載入"); assert.deepEqual(d.calls.zhSet, []);
});
test("數字與日期格式：英文 1,234／Nov 13, 2026；繁中 2026/11/13", () => {
  assert.equal(R.i18nNum(1234, "en"), "1,234"); assert.equal(R.i18nDate(new Date(2026, 10, 13), "en"), "Nov 13, 2026"); assert.equal(R.i18nDate(new Date(2026, 10, 13), "zh"), "2026/11/13");
  assert.equal(R.i18nCnNum("十二"), 12); assert.equal(R.i18nCnNum("７"), 7);
});

// ====================== ⑥ 接線 ======================
test("〔原始碼〕接線：m.html 在 07dq-daily.js 後面 include；設定頁有 🌐、English 選項、選了走 i18nPick；簡體選項照舊", () => {
  assert.match(HTML, /\/\/#include m\/07dq-daily\.js\n\/\/#include m\/07i18n\.js\n/);
  assert.match(SET, /\["🌐",i18nSheet,"語言 Language"\]/);
  assert.match(SET, /\[\["tw","繁體中文"\],\["cn","简体中文"\],\["en","English"\]\]/);
  assert.match(SET, /if\(typeof i18nPick==="function"\)return i18nPick\(b\.dataset\.zh\);if\(!window\.XQ_ZH\)/);
  assert.match(SET, /setTimeout\(\(\)=>XQ_ZH\.set\(b\.dataset\.zh\),300\)/, "沒有 07i18n 時照舊用 zh.js 切繁簡");
  assert.match(SET, /i18n:\["i18n","🌐 英文介面"\]/);
});
test("〔原始碼〕說明文件 i18n.md：art/docs 與 site/data/docs 兩份逐字相同、LF、沒有控制字元", () => {
  const a = fs.readFileSync(path.join(DB, "art/docs/i18n.md"), "utf8"), b = fs.readFileSync(path.join(LAB, "site/data/docs/i18n.md"), "utf8");
  assert.equal(a, b); assert.ok(!/[\r\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(a)); assert.match(a, /WXF/); assert.match(a, /不收 PR|不收 pull request/i);
});
test("〔原始碼〕名稱不撞：07i18n.js 宣告的名字別的模組都沒有宣告；模組沒有 CR 與控制字元", () => {
  const decl = [...SRC.matchAll(/(?:^|[;\n{}])\s*(?:function\s+([\w$]+)|(?:const|let)\s+([\w$]+)\s*=)/g)].map(m => m[1] || m[2]).filter(n => /^(i18n|I18N_)/.test(n));
  assert.ok(decl.length >= 20, "宣告數：" + decl.length);
  const others = fs.readdirSync(M).filter(f => /\.js$/.test(f) && f !== "07i18n.js").map(f => rd(path.join(M, f))).join("\n");
  for (const n of decl) assert.ok(!new RegExp("(?:const|let|var|function)\\s+" + n.replace(/\$/g, "\\$") + "\\b").test(others), "撞名：" + n);
  assert.ok(!/[\r\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(fs.readFileSync(path.join(M, "07i18n.js"), "utf8")));
});
