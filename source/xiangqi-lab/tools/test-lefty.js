// 第 12 輪 F1「左撇子單手模式」＋F2「剩下的小觸控目標」的自動測試，不開瀏覽器：
//   行為：用 vm 載入 m/07lh-lefty.js，配一個很小的假 DOM，真的跑開關、拇指鍵（代按返回／更多）、放的位置（底部動作列／著法籤列／浮在上方）、
//         對話框蓋住時藏起來、面板左下「✕ 收起」；另外跑 touch-stress.js 的左右手拇指熱區模型。
//   原始碼：m.css 的 html[data-lefty] 規則不鏡像棋盤與文字、m.html 有 include、前綴沒撞名；F2 各個 44px 修正還在。
// 用法：node --test xiangqi-lab/tools/test-lefty.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const LH = rd(path.join(M, "07lh-lefty.js")), CSS = rd(path.join(DB, "m.css")), HTML = rd(path.join(DB, "m.html"));
const { thumb } = require("./qa/touch-stress.js");

/* ---------- 很小的假 DOM：只支援這個模組用到的選擇器（#id、.class、tag、組合、「A B」、:scope > X、逗號） ---------- */
class El {
  constructor(tag, o) { this.tagName = tag.toUpperCase(); this.children = []; this.parentElement = null; this.attrs = {}; this.hidden = false; this.dataset = {}; this.textContent = ""; this.onclick = null; this.clicks = 0;
    this.rect = { left: 0, top: 0, width: 0, height: 0 }; this.cs = {}; const self = this; const vars = {};
    this.style = { setProperty: (k, v) => { vars[k] = String(v) }, getPropertyValue: k => vars[k] || "" };
    const cl = new Set(); this.classList = { add: (...c) => c.forEach(x => cl.add(x)), remove: (...c) => c.forEach(x => cl.delete(x)), contains: c => cl.has(c), toggle: (c, f) => (f ?? !cl.has(c)) ? cl.add(c) : cl.delete(c) };
    Object.defineProperty(this, "className", { get: () => [...cl].join(" "), set: v => { cl.clear(); String(v).split(/\s+/).filter(Boolean).forEach(x => cl.add(x)) } });
    Object.assign(this, o || {}); if (o && o.cls) this.className = o.cls; void self }
  get id() { return this.attrs.id || "" } set id(v) { this.attrs.id = v }
  setAttribute(k, v) { this.attrs[k] = String(v) } getAttribute(k) { return k in this.attrs ? this.attrs[k] : null } hasAttribute(k) { return k in this.attrs } removeAttribute(k) { delete this.attrs[k] }
  append(...cs) { for (const c of cs) { if (c.parentElement) c.remove(); c.parentElement = this; this.children.push(c) } }
  remove() { const p = this.parentElement; if (p) { p.children = p.children.filter(x => x !== this); this.parentElement = null } }
  contains(e) { for (let x = e; x; x = x.parentElement) if (x === this) return true; return false }
  get isConnected() { let x = this; while (x.parentElement) x = x.parentElement; return x.tagName === "HTML" }
  getBoundingClientRect() { const r = this.rect; return { left: r.left, top: r.top, width: r.width, height: r.height, right: r.left + r.width, bottom: r.top + r.height } }
  click() { this.clicks++; if (this.onclick) this.onclick({ stopPropagation() { }, preventDefault() { } }) }
  all() { const o = []; const w = e => { for (const c of e.children) { o.push(c); w(c) } }; w(this); return o }
  querySelectorAll(sel) { return qsa(this, sel) } querySelector(sel) { return qsa(this, sel)[0] || null }
}
function simple(e, s) { const m = /^([a-z0-9]*)((?:[#.][\w-]+)*)$/i.exec(s); if (!m) throw new Error("假 DOM 不支援的選擇器：" + s);
  if (m[1] && e.tagName !== m[1].toUpperCase()) return false;
  for (const p of m[2].match(/[#.][\w-]+/g) || []) { if (p[0] === "#" && e.id !== p.slice(1)) return false; if (p[0] === "." && !e.classList.contains(p.slice(1))) return false } return true }
function qsa(root, sel) { const out = new Set();
  for (const part of sel.split(",").map(x => x.trim())) {
    if (part.startsWith(":scope >")) { const s = part.replace(":scope >", "").trim(); root.children.filter(c => simple(c, s)).forEach(c => out.add(c)); continue }
    const seg = part.split(/\s+/);
    for (const e of root.all()) { if (!simple(e, seg[seg.length - 1])) continue; if (seg.length === 1) { out.add(e); continue }
      let ok = false; for (let p = e.parentElement; p && p !== root.parentElement; p = p.parentElement) if (simple(p, seg[0])) { ok = true; break } if (ok) out.add(e) } }
  return root.all().filter(e => out.has(e)) }

/* 搭一個 iPhone SE（375×667）的畫面：頂欄（返回、更多）、#view（著法籤列、底部動作列 n 顆）、底部導覽列 */
function load(opt) {
  opt = opt || {};
  const st = Object.assign({}, opt.store || {}), toasts = [], timers = [], docL = {};
  const html = new El("html"), body = new El("body"); html.append(body);
  const app = new El("div", { cls: "app" }); body.append(app);
  const topbar = new El("div"); topbar.id = "topbar"; const back = new El("button"); back.id = "back"; back.textContent = opt.backText || "‹回首頁"; back.rect = { left: 6, top: 6, width: 89, height: 44 }; back.hidden = !!opt.noBack;
  const tr = new El("span"); tr.id = "topRight"; topbar.append(back, tr); app.append(topbar);
  if (opt.more) { const m = new El("button", { cls: "ib" }); m.textContent = "⋯"; m.setAttribute("aria-label", "更多：3D 場景、聲控"); m.rect = { left: 320, top: 6, width: 44, height: 44 }; tr.append(m) }
  const view = new El("div"); view.id = "view"; app.append(view);
  let strip = null, acts = null;
  if (opt.strip) { strip = new El("div", { cls: "strip" }); strip.id = "strip"; strip.rect = { left: 0, top: 540, width: 375, height: 44 }; view.append(strip) }
  if (opt.acts) { acts = new El("div", { cls: "actions" }); acts.id = "acts"; acts.rect = { left: 0, top: 590, width: opt.w || 375, height: 64 }; acts.cs.columnGap = (opt.gap ?? 8) + "px";
    for (let i = 0; i < opt.acts; i++) { const b = new El("button"); b.rect = { left: 4 + i * 60, top: 596, width: 56, height: 52 }; acts.append(b) } view.append(acts) }
  const doc = {
    documentElement: html, body, readyState: "complete",
    createElement: t => new El(t),
    getElementById: id => html.all().find(e => e.id === id) || null,
    querySelector: s => qsa(html, s)[0] || null, querySelectorAll: s => qsa(html, s),
    addEventListener: (t, f) => { (docL[t] = docL[t] || []).push(f) }
  };
  const ctx = {
    console, JSON, Math, Object, Array, String, Number, isFinite, parseFloat, Set,
    store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } },
    document: doc, innerHeight: opt.vh || 667,
    getComputedStyle: e => ({ display: e.hidden ? "none" : "block", visibility: "visible", columnGap: e.classList.contains("lh-g4") ? "4px" : (e.cs.columnGap || "normal") }),
    setTimeout: (f) => { timers.push(f); return timers.length }, clearTimeout() { }, setInterval: () => 0,
    addEventListener() { }, MutationObserver: class { observe() { } },
    toast: m => toasts.push(m), vibrate() { }
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(LH + "\nthis.lhApply=lhApply;this.lhSync=lhSync;this.lhPlan=lhPlan;this.lhMoreIdx=lhMoreIdx;this.lhBackLabel=lhBackLabel;this.lhOn=lhOn;this.lhDockW=lhDockW;", ctx, { filename: "07lh-lefty.js" });
  const flush = () => { while (timers.length) timers.shift()() };
  const dock = () => html.all().find(e => e.id === "lhDock");
  return { ctx, st, toasts, html, app, back, tr, view, strip, acts, doc, docL, flush, dock, body };
}

/* ---------- 行為：純計算 ---------- */
test("拇指鍵放哪：動作列夠寬就排進動作列；五顆在 360 寬只放得下返回；都不行才排進著法籤列或浮在上方", () => {
  const { ctx } = load();
  const A = (w, n) => ({ w, n, gap: 8, cy: 622 });
  let P = ctx.lhPlan({ vh: 667, tops: [590], acts: A(375, 3), back: true, more: true });
  assert.equal(P.mode, "acts"); assert.equal(P.back && P.more, true); assert.equal(P.dw, ctx.lhDockW(2));
  assert.equal(P.bottom, Math.round(667 - 622 - 23), "跟動作列按鈕同一條中線");
  P = ctx.lhPlan({ vh: 740, tops: [660], acts: A(360, 5), back: true, more: true });
  assert.equal(P.mode, "acts"); assert.equal(P.more, false, "兩顆放不下：只放返回，更多留在頂欄"); assert.ok((360 - P.dw - 4 - 8 * 4) / 5 >= 44);
  assert.equal(P.tight, false, "原本間距就放得下，不縮");
  P = ctx.lhPlan({ vh: 740, tops: [660], acts: A(360, 6), back: true, more: true });
  assert.equal(P.mode, "acts"); assert.equal(P.more, false); assert.equal(P.tight, true, "6 顆在 360 寬：間距縮成 4px 才放得下返回"); assert.ok((360 - P.dw - 4 - 4 * 5) / 6 >= 44);
  P = ctx.lhPlan({ vh: 667, tops: [590], acts: A(375, 8), strip: { top: 540, bottom: 584 }, back: true, more: true });
  assert.equal(P.mode, "strip"); assert.equal(P.bottom, Math.round(667 - 562 - 23));
  P = ctx.lhPlan({ vh: 667, tops: [600, 620], back: true, more: false });
  assert.equal(P.mode, "float"); assert.equal(P.bottom, 667 - 600 + 8, "浮在最上面那條底部構件上方 8px");
  assert.equal(ctx.lhPlan({ vh: 667, back: false, more: false }).mode, "none");
  for (const n of [1, 2]) assert.ok(ctx.lhDockW(n) >= n * 46 + 16, "讓出的寬至少包含每顆 46px 與兩側 8px");
});
test("頂欄「更多」與返回鍵的念法", () => {
  const { ctx } = load();
  assert.equal(ctx.lhMoreIdx([{ label: "回首頁", text: "🏠" }, { label: "更多：3D 場景", text: "⋯" }]), 1);
  assert.equal(ctx.lhMoreIdx([{ label: "更多：x", text: "⋯", hidden: true }]), -1, "看不到的不算");
  assert.equal(ctx.lhMoreIdx([{ label: "", text: " ⋯ " }]), 0);
  assert.equal(ctx.lhBackLabel("‹回首頁"), "返回：回首頁");
  assert.equal(ctx.lhBackLabel("‹ 返回"), "返回");
  assert.equal(ctx.lhBackLabel(""), "返回");
});

/* ---------- 行為：假 DOM 跑整套 ---------- */
test("預設關著：沒有 data-lefty、沒有拇指鍵；store lefty 只有 true 才算開", () => {
  for (const v of [undefined, false, "true", 1]) { const k = load({ store: v === undefined ? {} : { lefty: v }, acts: 3 }); assert.equal(k.ctx.lhOn(), false, String(v)); assert.equal(k.html.hasAttribute("data-lefty"), false); assert.equal(k.dock(), undefined) }
  const k = load({ store: { lefty: true }, acts: 3, more: true }); assert.equal(k.ctx.lhOn(), true); assert.equal(k.html.hasAttribute("data-lefty"), true, "開 App 就套用");
});
test("拇指鍵：排進底部動作列左邊、代按頂欄的返回與更多", () => {
  const k = load({ store: { lefty: true }, acts: 3, more: true }); k.flush();
  const d = k.dock(); assert.ok(d, "有 #lhDock"); assert.equal(d.parentElement, k.app);
  assert.equal(d.hidden, false); assert.equal(d.dataset.mode, "acts");
  assert.equal(k.acts.classList.contains("lh-ap"), true); assert.equal(k.acts.style.getPropertyValue("--lhW"), k.ctx.lhDockW(2) + "px");
  const [bk, mo] = d.children; assert.equal(bk.getAttribute("aria-label"), "返回：回首頁"); assert.equal(mo.hidden, false); assert.match(mo.getAttribute("aria-label"), /^更多/);
  bk.click(); assert.equal(k.back.clicks, 1, "按拇指鍵＝按頂欄返回");
  mo.click(); assert.equal(k.tr.children[0].clicks, 1, "按 ⋯＝按頂欄的更多");
});
test("頂欄返回鍵藏著、又沒有更多＝拇指鍵藏起來；對話框或卡片蓋著也藏", () => {
  let k = load({ store: { lefty: true }, acts: 3, noBack: true }); k.flush(); assert.equal(k.dock().hidden, true);
  k = load({ store: { lefty: true }, acts: 3 }); k.flush(); assert.equal(k.dock().hidden, false);
  const m = new El("div", { cls: "modal" }); k.body.append(m); k.ctx.lhSync(); assert.equal(k.dock().hidden, true, "有確認框");
  assert.equal(k.acts.classList.contains("lh-ap"), false, "藏起來時動作列的讓位也拿掉");
  m.remove(); k.ctx.lhSync(); assert.equal(k.dock().hidden, false);
});
test("360 寬、6 顆：縮成 4px 間距放返回，重算好幾次都穩定（不會縮了又放回去）", () => {
  const k = load({ store: { lefty: true }, acts: 6, w: 360, vh: 740, more: true }); k.flush();
  for (let i = 0; i < 3; i++) { k.ctx.lhSync(); assert.equal(k.dock().dataset.mode, "acts"); assert.equal(k.acts.classList.contains("lh-g4"), true, "第 " + (i + 1) + " 次"); assert.equal(k.dock().children[1].hidden, true, "更多放不下") }
  k.html.removeAttribute("data-lefty"); k.ctx.lhApply(false); assert.equal(k.acts.classList.contains("lh-g4"), false);
});
test("動作列太擠（8 顆）：排進著法籤列最左邊，著法籤讓出寬度；動作列不讓", () => {
  const k = load({ store: { lefty: true }, acts: 8, strip: true }); k.flush();
  assert.equal(k.dock().dataset.mode, "strip"); assert.equal(k.strip.classList.contains("lh-sp"), true); assert.equal(k.acts.classList.contains("lh-ap"), false);
  assert.equal(k.dock().style.getPropertyValue("--lhB"), Math.round(667 - 562 - 23) + "px");
});
test("設定頁勾選框 #leftySw：打開＝存檔＋馬上套用；關掉＝拿掉 data-lefty、拇指鍵、讓位", () => {
  const k = load({ acts: 3, more: true });
  const sw = { id: "leftySw", checked: true };
  for (const f of k.docL.change) f({ target: sw }); k.flush();
  assert.equal(k.st.lefty, true); assert.equal(k.html.hasAttribute("data-lefty"), true); assert.equal(k.dock().hidden, false); assert.match(k.toasts.pop(), /左撇子單手模式：開/);
  sw.checked = false; for (const f of k.docL.change) f({ target: sw });
  assert.equal(k.st.lefty, false); assert.equal(k.html.hasAttribute("data-lefty"), false); assert.equal(k.dock().hidden, true); assert.equal(k.acts.classList.contains("lh-ap"), false);
  for (const f of k.docL.change) f({ target: { id: "hapSw", checked: true } }); assert.equal(k.st.lefty, false, "別的開關不理");
});
test("滿版面板左下「✕ 收起」：只補一次，按了等於按原本的 ✕", () => {
  const k = load({ store: { lefty: true }, acts: 3 });
  const p = new El("div", { cls: "xqs open" }), h = new El("div", { cls: "xqs-h" }), x = new El("button"); x.setAttribute("aria-label", "收起"); let shut = 0; x.onclick = () => shut++;
  h.append(x); p.append(h); k.view.append(p);
  k.ctx.lhSync(); k.ctx.lhSync();
  const f = p.children.filter(c => c.classList.contains("lh-x")); assert.equal(f.length, 1);
  assert.equal(f[0].getAttribute("aria-label"), "收起"); f[0].click(); assert.equal(shut, 1);
});
test("拇指熱區模型（touch-stress.js）：左右手對稱、下方中間易及、對角上方角落難及、大手機上方更遠", () => {
  for (const [x, y] of [[30, 600], [187, 333], [350, 40], [10, 10]]) assert.deepEqual(thumb(x, y, 375, 667, "R"), thumb(375 - x, y, 375, 667, "L"));
  assert.equal(thumb(187, 640, 375, 667, "L").z, "易及");
  assert.equal(thumb(350, 28, 375, 667, "L").z, "難及", "左手按右上角");
  assert.equal(thumb(30, 28, 375, 667, "R").z, "難及", "右手按左上角");
  assert.equal(thumb(30, 627, 375, 667, "L").z, "易及", "左手拇指鍵的位置");
  assert.ok(thumb(220, 300, 440, 956, "L").d > thumb(187, 300, 375, 667, "L").d, "Pro Max 同一高度離拇指更遠");
});

/* ---------- 原始碼 ---------- */
test("〔原始碼〕左撇子樣式只搬按鈕：不鏡像棋盤、不改文字方向；m.html 在觸覺回饋後面 include；lh 前綴沒撞名", () => {
  const rules = CSS.split("\n").filter(l => l.includes("[data-lefty]"));
  assert.ok(rules.length >= 15, "左撇子規則 " + rules.length);
  for (const l of rules) { assert.doesNotMatch(l, /scaleX\(-1\)|direction:\s*rtl|svg|\.board|boardbox/, l.slice(0, 80)) }
  assert.ok(HTML.indexOf("//#include m/07lh-lefty.js\n") > HTML.indexOf("//#include m/07hp-haptics.js\n") && HTML.includes("//#include m/07hp-haptics.js\n"), "07lh 在 07hp 後面 include");
  assert.equal(HTML.split("//#include m/07lh-lefty.js\n").length, 2, "只 include 一次");
  const mine = [...LH.matchAll(/^function (lh\w+)/gm)].map(m => m[1]);
  for (const f of fs.readdirSync(M).filter(f => f.endsWith(".js") && f !== "07lh-lefty.js")) { const s = rd(path.join(M, f)); for (const n of mine) assert.ok(!new RegExp("function " + n + "\\b").test(s), f + " 也定義了 " + n) }
  assert.ok(!/document\.querySelector\("#topbar #back"\)\.remove|#back"\)\.hidden=/.test(LH), "不動頂欄的返回鍵本身");
});
test("〔原始碼〕F2：剩下的小目標修正還在（外觀不變、點選範圍 ≥44）", () => {
  assert.match(CSS, /#meChip::before\{content:"";position:absolute;left:0;right:0;top:-2px;bottom:-2px/);
  assert.match(CSS, /\.actions\{column-gap:8px\}/);
  const HM = rd(path.join(M, "07z-homemap.js")); assert.match(HM, /\.hm-inst::before\{content:"";position:absolute;[^}]*height:46px/); assert.match(HM, /\.hm-go-bar \.hm-inst\{position:relative;/);
  assert.match(HM, /const R07_HIT_SEL="\.shp-spot,\.shp-hs,\.po-sight";/, "R07 的金框標籤點選範圍沒被動到");
  assert.match(rd(path.join(M, "07w8-shichen.js")), /\.lk-b::before\{[^}]*width:max\(100%,52px\);height:max\(100%,52px\)/);
  const CJ = rd(path.join(M, "07c2-canjumap.js")); assert.match(CJ, /<span class="cjm-hit" aria-hidden="true"/); assert.doesNotMatch(CJ, /<button type="button" class="cjm-hit"/); assert.match(CJ, /\.cjm-hit\{[^}]*min-width:44px;min-height:44px\}/);
  assert.match(rd(path.join(M, "07s2-setmap.js")), /\["smPack",48,83,/);
});
