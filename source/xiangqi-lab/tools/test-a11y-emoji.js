// 11/13 開發者兩段 iPhone 實機旁白（VoiceOver）錄影：按鈕和狀態列裡的圖示被念出來（♟「西洋棋」、⛵「帆船」、🤔「思考的表情」），「・」被念成「間隔號」。
// 修法在 xiangqi-db/m/11b-a11y.js 的全頁保險 axmFix：按鈕補語音名稱（去圖示、・換逗號，文字變了跟著換），狀態列／播報區把圖示和・包成 aria-hidden（畫面文字不變）。
// 這裡用一個小型假 DOM 把 axmFix 原樣切出來跑。用法：node --test xiangqi-lab/tools/test-a11y-emoji.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/11b-a11y.js"), "utf8").replace(/\r\n/g, "\n");

/* ---- 小型假 DOM：只做 axmFix／axmHideIn 用到的 ---- */
class N { constructor() { this.parentNode = null } get parentElement() { return this.parentNode && this.parentNode.nodeType === 1 ? this.parentNode : null }
  replaceWith(...ns) { const p = this.parentNode, i = p.childNodes.indexOf(this); const add = []; for (const n of ns) { if (n.nodeType === 11) { add.push(...n.childNodes); n.childNodes = [] } else add.push(n) } for (const n of add) n.parentNode = p; p.childNodes.splice(i, 1, ...add); this.parentNode = null } }
class T extends N { constructor(v) { super(); this.nodeType = 3; this.nodeValue = v } get textContent() { return this.nodeValue } }
class F extends N { constructor() { super(); this.nodeType = 11; this.childNodes = [] } append(...ns) { for (const n of ns) { n.parentNode = this; this.childNodes.push(n) } } }
class E extends N {
  constructor(tag) { super(); this.nodeType = 1; this.tagName = tag.toUpperCase(); this.attrs = {}; this.childNodes = []; this.classList = { contains: c => (this.attrs.class || "").split(/\s+/).includes(c) } }
  get id() { return this.attrs.id || "" } setAttribute(k, v) { this.attrs[k] = String(v) } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null } hasAttribute(k) { return k in this.attrs } removeAttribute(k) { delete this.attrs[k] }
  append(...ns) { for (const n of ns) { if (n.nodeType === 11) { this.append(...n.childNodes); n.childNodes = []; continue } n.parentNode = this; this.childNodes.push(n) } return this }
  get textContent() { return this.childNodes.map(c => c.textContent).join("") } set textContent(v) { this.childNodes = []; this.append(new T(v)) }
  get children() { return this.childNodes.filter(c => c.nodeType === 1) }
  matches(sel) { return sel.split(",").some(s => one(this, s.trim())) }
  closest(sel) { let e = this; while (e && e.nodeType === 1) { if (e.matches(sel)) return e; e = e.parentNode } return null }
  querySelectorAll(sel) { const out = []; const walk = e => { for (const c of e.children) { if (c.matches(sel)) out.push(c); walk(c) } }; walk(this); return out }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null }
}
function one(e, s) { /* tag、#id、.class、[a]、[a=v]、:not(...)（略過） */
  s = s.replace(/:not\([^)]*\)/g, ""); const m = s.match(/^([a-zA-Z]*)((?:#[\w-]+|\.[\w-]+|\[[^\]]+\])*)$/); if (!m) return false;
  if (m[1] && e.tagName !== m[1].toUpperCase()) return false;
  for (const p of m[2].match(/#[\w-]+|\.[\w-]+|\[[^\]]+\]/g) || []) {
    if (p[0] === "#") { if (e.id !== p.slice(1)) return false } else if (p[0] === ".") { if (!e.classList.contains(p.slice(1))) return false }
    else { const [k, v] = p.slice(1, -1).split("="); if (!e.hasAttribute(k)) return false; if (v != null && e.getAttribute(k) !== v.replace(/['"]/g, "")) return false } }
  return true }
const doc = { createElement: t => new E(t), createTextNode: v => new T(v), createDocumentFragment: () => new F(),
  createTreeWalker(root) { const L = []; const walk = e => { for (const c of e.childNodes) { if (c.nodeType === 3) L.push(c); else if (c.nodeType === 1) walk(c) } }; walk(root); let i = 0; return { nextNode: () => L[i++] || null } } };

/* ---- 把 axmFix 和它用到的函式原樣切出來 ---- */
const cut = re => { const m = SRC.match(re); assert.ok(m, "切不出 " + re); return m[0] };
const code = [cut(/^const AXM_ICON=.*$/m), cut(/^const AXM_PICT=.*$/m), cut(/^function axmSpeak\(t\)\{.*\}$/m), cut(/^function axmHideIn\(root\)\{[\s\S]*?t\.replaceWith\(f\)\}\}$/m),
  cut(/^function axmIconName\(text,title\)\{.*\}$/m), cut(/^function axmFix\(root\)\{[\s\S]*?\.forEach\(one\)\}$/m)].join("\n");
const api = new Function("document", "NodeFilter", "axmDlgAdd", code + "\nreturn{axmFix,axmSpeak,axmHideIn};")(doc, { SHOW_TEXT: 4 }, () => {});
const btn = (txt, attrs) => { const b = new E("button"); b.textContent = txt; for (const k in attrs || {}) b.setAttribute(k, attrs[k]); return b };

test("〔行為〕按鈕文字有圖示或「・」→ 補語音名稱（去圖示、・換逗號）；畫面文字不變", () => {
  const root = new E("div"), q = btn("♟ 快速對局 不用選・不算段位"), sh = btn("⛵ 雲河星槎"), plain = btn("認輸");
  root.append(q, sh, plain); api.axmFix(root);
  assert.equal(q.getAttribute("aria-label"), "快速對局 不用選，不算段位"); assert.equal(q.textContent, "♟ 快速對局 不用選・不算段位", "畫面不變");
  assert.equal(sh.getAttribute("aria-label"), "雲河星槎");
  assert.equal(plain.hasAttribute("aria-label"), false, "沒有圖示的不動");
});

test("〔行為〕按鈕文字之後變了（例如快下一盤→接著下），語音名稱跟著換；變成沒圖示就拿掉自己補的", () => {
  const b = btn("🎲 快下一盤"); const root = new E("div").append(b); api.axmFix(root);
  assert.equal(b.getAttribute("aria-label"), "快下一盤");
  b.textContent = "▶ 接著下・第 12 手"; api.axmFix(b); assert.equal(b.getAttribute("aria-label"), "接著下，第 12 手");
  b.textContent = "開新局"; api.axmFix(b); assert.equal(b.hasAttribute("aria-label"), false);
});

test("〔行為〕原本就有語音標籤的按鈕（例如同桌對弈：兩人共用這台裝置）不會被蓋掉；只有圖示的照舊查圖示表", () => {
  const a = btn("👥 同桌對弈", { "aria-label": "同桌對弈：兩人共用這台裝置" }), icon = btn("✕"); const root = new E("div").append(a, icon); api.axmFix(root);
  assert.equal(a.getAttribute("aria-label"), "同桌對弈：兩人共用這台裝置");
  assert.ok(icon.getAttribute("aria-label"), "只有 ✕ 的按鈕照舊補名字");
});

test("〔行為〕狀態列（#stat、aria-live）：圖示和・包成 aria-hidden，讀屏跳過，畫面文字一字不差", () => {
  const st = new E("div"); st.setAttribute("id", "stat"); st.textContent = "🤔 思考中・已預走「傌八進七」";
  const root = new E("div").append(st); api.axmFix(root);
  assert.equal(st.textContent, "🤔 思考中・已預走「傌八進七」", "畫面不變");
  const hidden = st.querySelectorAll("[aria-hidden=true]").map(x => x.textContent);
  assert.deepEqual(hidden, ["🤔", "・"]);
  const spoken = st.childNodes.filter(c => !(c.nodeType === 1 && c.getAttribute("aria-hidden") === "true")).map(c => c.textContent).join("");
  assert.equal(spoken, " 思考中已預走「傌八進七」");
  api.axmFix(root); assert.equal(st.querySelectorAll("[aria-hidden=true]").length, 2, "重跑不會再包一層");
});

test("〔原始碼〕觀察器：按鈕、播報區裡加進文字節點也排進重算；播報區 axLive（App 自己的旁白句）不動", () => {
  assert.ok(SRC.includes('else if(n.nodeType===3&&n.parentElement&&!n.parentElement.closest("[aria-hidden=true]")){const pe=n.parentElement.closest("button,[role=button],#stat,[aria-live]");if(pe&&pe.id!=="axLive")Q.push(pe)}'));
  assert.ok(SRC.includes('if(el.matches("#stat,[aria-live]")&&el.id!=="axLive"&&!el.closest("svg"))axmHideIn(el);'));
});
