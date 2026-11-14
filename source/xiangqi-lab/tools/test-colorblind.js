// 11/12 評比循環第 11 輪 F3：色弱模式（m/07cb-colorblind.js，store cbMode）的自動測試，不開瀏覽器：
//   ① 行為：在 vm 裡用小型假 DOM 載入整個模組，照 01-board.js draw() 的畫法擺一個棋盤 SVG，
//      cbApply() 開／關：html[data-cbm]、黑子黑環（紅子不加）、黃點黑邊、四角瞄準框、「將」字牌、上一步改朱橘＋黑白邊；
//      重複呼叫不會多畫；棋盤重畫時 MutationObserver 會補；關掉時記號全拿掉、每個屬性還原成原樣；高對比棋子開著時不重複畫黑環
//   ② 純函式：WCAG 對比公式、色覺模擬矩陣、棋子分邊；配色在四種色覺模擬下仍分得開、評語字色 4.5:1 以上
//   ③ 原始碼：m.html 有 include、評語色碼跟 00-util.js QC 一致、cb 開頭的全域名稱沒撞名、說明文件兩份一樣
// 用法：node --test xiangqi-lab/tools/test-colorblind.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SRC = rd(path.join(M, "07cb-colorblind.js"));

// ---------- 小型假 DOM（只做模組用得到的部分） ----------
class El {
  constructor(tag) { this.tagName = tag; this.attrs = new Map(); this.children = []; this.parentNode = null; this.textContent = ""; this.nodeType = 1 }
  get id() { return this.getAttribute("id") } set id(v) { this.setAttribute("id", v) }
  getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null } setAttribute(k, v) { this.attrs.set(k, String(v)) }
  hasAttribute(k) { return this.attrs.has(k) } removeAttribute(k) { this.attrs.delete(k) }
  get firstElementChild() { return this.children[0] || null } get childElementCount() { return this.children.length }
  append(...n) { for (const x of n) { if (x.parentNode) x.remove(); x.parentNode = this; this.children.push(x) } }
  before(...n) { const p = this.parentNode, i = p.children.indexOf(this); n.forEach(x => x.parentNode = p); p.children.splice(i, 0, ...n) }
  after(...n) { const p = this.parentNode, i = p.children.indexOf(this); n.forEach(x => x.parentNode = p); p.children.splice(i + 1, 0, ...n) }
  remove() { if (this.parentNode) { const c = this.parentNode.children; c.splice(c.indexOf(this), 1); this.parentNode = null } }
  querySelectorAll(sel) { const m = /^\[([\w-]+)\]$/.exec(sel), out = []; const walk = e => { for (const c of e.children) { if (m ? c.hasAttribute(m[1]) : c.tagName === sel) out.push(c); walk(c) } }; walk(this); return out }
  getElementsByTagName(t) { return this.querySelectorAll(t) }
}
const mk = (t, a, txt) => { const e = new El(t); for (const k in a || {}) e.setAttribute(k, a[k]); if (txt) e.textContent = txt; return e };
const MV = "#2F6B4F";
// 照 01-board.js draw() 畫出來的結構：上一步（起點圓點、虛線圈、落點外圈、箭頭）、棋子（影子橢圓開頭；字或整顆圖）、可走、可吃、將軍
function boardSvg() {
  const s = mk("svg", { viewBox: "0 0 560 620" }); s._b = new Array(90).fill(null); s._b[0] = "r"; s._o = { last: { f: 70, t: 67 } };
  const piece = (x, y, inner) => { const g = mk("g"); g.append(mk("ellipse", { cx: x + 2, cy: y + 7, rx: 31, ry: 29.5, fill: "url(#psh1)" }), mk("circle", { cx: x, cy: y, r: 27, fill: "#F8ECD4" }), ...inner); return g };
  const arrow = mk("g", { opacity: ".82" }); arrow.append(mk("line", { x1: 446, y1: 460, x2: 300, y2: 460, stroke: MV, "stroke-width": 11 }), mk("polygon", { points: "280,460 300,450 300,470", fill: MV }));
  s.append(mk("g", { id: "bg" }),
    mk("circle", { cx: 460, cy: 460, r: 12, fill: MV, opacity: .35 }), mk("circle", { cx: 460, cy: 460, r: 24, fill: "none", stroke: MV, "stroke-width": 3, "stroke-dasharray": "6 5" }),
    piece(520, 40, [mk("text", { x: 520, y: 50 }, "車")]), piece(520, 580, [mk("text", { x: 520, y: 590 }, "俥")]),
    piece(40, 40, [mk("image", { href: "data/pset/qin/bK.webp", x: 10, y: 10, width: 60, height: 60 })]),
    piece(100, 580, [mk("image", { href: "data/pset/qin/rN.webp", x: 70, y: 550, width: 60, height: 60 })]),
    mk("circle", { cx: 280, cy: 460, r: 30.5, fill: "none", stroke: MV, "stroke-width": 4, opacity: .95 }), arrow,
    mk("circle", { cx: 100, cy: 220, r: 10, fill: "var(--accent2)", stroke: "var(--accent2)", "stroke-width": 4, opacity: .85 }),
    mk("circle", { cx: 100, cy: 580, r: 30, fill: "none", stroke: "var(--accent2)", "stroke-width": 4, opacity: .85 }),
    mk("circle", { cx: 280, cy: 40, r: 31, fill: "none", stroke: "var(--red)", "stroke-width": 4, "stroke-dasharray": "7 4" }));
  return s;
}
const snap = e => { const o = []; const walk = (x, d) => { o.push(d + x.tagName + JSON.stringify([...x.attrs].filter(([k]) => k !== "style").sort()) + x.textContent); x.children.forEach(c => walk(c, d + " ")) }; walk(e, ""); return o.join("\n") };
function env(opts = {}) {
  const html = mk("html"), head = mk("head"), body = mk("body"); html.append(head, body);
  const LS = new Map(Object.entries(opts.store || {})), MOs = [];
  const document = { documentElement: html, head, body, createElement: t => mk(t), createElementNS: (ns, t) => mk(t),
    getElementById: id => html.querySelectorAll("[id]").find(e => e.getAttribute("id") === id) || null, querySelectorAll: s => html.querySelectorAll(s) };
  class MO { constructor(cb) { this.cb = cb; this.on = false; MOs.push(this) } observe() { this.on = true } disconnect() { this.on = false } }
  const ctx = { document, window: { dispatchEvent: e => (ctx.events = (ctx.events || []).concat(e.detail)) }, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail } },
    MutationObserver: MO, store: { get: (k, d) => LS.has(k) ? LS.get(k) : d, set: (k, v) => LS.set(k, v) }, boardTheme: () => ({ mv: MV }), console, LS, MOs };
  vm.createContext(ctx);
  if (opts.board !== false) { ctx.svg = boardSvg(); body.append(ctx.svg) }
  vm.runInContext(SRC + ";this.R={cbApply,cbDeco,cbUndo,cbCss,cbSideOf,cbContrast,cbLum,cbSim,CB_COL,CB_Q}", ctx, { filename: "07cb-colorblind.js" });
  return ctx;
}
const byCls = (e, c) => e.querySelectorAll("[class]").filter(x => x.getAttribute("class") === c);

// ====================== ① 行為 ======================
test("預設關：沒有 data-cbm、棋盤沒有任何記號；樣式表已備好（全部規則掛在 html[data-cbm] 底下）", () => {
  const E = env(); const before = snap(E.svg);
  assert.equal(E.document.documentElement.hasAttribute("data-cbm"), false);
  assert.equal(E.R.cbApply(), false);
  assert.equal(snap(E.svg), before, "關著時棋盤一個屬性都不能動");
  const css = E.document.getElementById("cbCss"); assert.ok(css, "要注入 <style id=cbCss>");
  for (const line of css.textContent.split("\n")) for (const sel of line.split("}").filter(Boolean)) assert.match(sel.trim(), /^html\[data-cbm\] /, "每條規則都要在 html[data-cbm] 底下：" + sel.slice(0, 60));
});

test("cbApply 打開：html 掛 data-cbm；黑子加黑環（字、整顆圖都認得），紅子不加", () => {
  const E = env({ store: { cbMode: true } }); const S = E.svg;
  assert.equal(E.document.documentElement.hasAttribute("data-cbm"), true);
  const P = S.children.filter(g => g.tagName === "g" && g.children[0] && g.children[0].tagName === "ellipse");
  assert.deepEqual(P.map(g => g.getAttribute("data-cbs")), ["b", "r", "b", "r"]);
  assert.deepEqual(P.map(g => byCls(g, "cb-rim").length), [1, 0, 1, 0], "黑環只畫在黑子");
  const rim = byCls(P[0], "cb-rim")[0]; assert.equal(rim.getAttribute("stroke"), "#111111"); assert.equal(+rim.getAttribute("cx"), 520); assert.equal(+rim.getAttribute("cy"), 40);
  const rimImg = byCls(P[2], "cb-rim")[0]; assert.ok(+rimImg.getAttribute("r") > +rim.getAttribute("r"), "整顆是圖的棋子（半徑 30）黑環跟著放大");
  assert.ok(P[0].querySelectorAll("[data-cbx]").every(x => x.getAttribute("pointer-events") === "none" && x.getAttribute("aria-hidden") === "true"), "補的圖形不能擋點選、不給螢幕報讀念");
  assert.equal(JSON.stringify(E.events.slice(-1)), JSON.stringify([{ on: true }]));
});

test("提示不只靠紅綠：可走＝黃點黑邊、可吃＝四角瞄準框、將軍＝黃底「將」字牌、上一步＝朱橘＋黑白邊", () => {
  const E = env({ store: { cbMode: true } }), S = E.svg, C = E.R.CB_COL;
  const dot = S.children.find(c => c.getAttribute("r") === "11"); assert.ok(dot); assert.equal(dot.getAttribute("fill"), C.dot); assert.equal(dot.getAttribute("stroke"), C.ink);
  const cap = S.children.find(c => c.getAttribute("cx") === "100" && c.getAttribute("cy") === "580" && c.tagName === "circle");
  assert.equal(cap.getAttribute("opacity"), "0", "可吃的圓圈換成瞄準框"); assert.equal(byCls(S, "cb-aim").length, 2);
  const ck = byCls(S, "cb-ck"); assert.equal(ck.length, 2); assert.equal(ck.find(x => x.tagName === "text").textContent, "將");
  const lastEls = S.children.filter(c => c.tagName === "circle" && (c.getAttribute("stroke") === C.last || c.getAttribute("fill") === C.last));
  assert.equal(lastEls.length, 3, "起點圓點、虛線圈、落點外圈都改色");
  const arrow = S.children.find(c => c.getAttribute("opacity") === "1" && c.tagName === "g"); assert.ok(arrow, "箭頭整組不透明");
  assert.equal(arrow.children.filter(c => c.getAttribute("class") === "cb-halo").length, 4, "線、箭頭各墊白、黑兩層外框");
  assert.ok(arrow.children.filter(c => !c.hasAttribute("data-cbx")).every(c => (c.getAttribute("stroke") || c.getAttribute("fill")) === C.last));
  const dash = byCls(S, "cb-halo").filter(h => h.getAttribute("stroke-dasharray") === "6 5"); assert.equal(dash.length, 2, "虛線圈的外框照抄虛線");
});

test("重複呼叫不會多畫；棋盤重畫（清掉子元素重放）時 MutationObserver 會補上記號", () => {
  const E = env({ store: { cbMode: true } }); const n1 = E.svg.querySelectorAll("[data-cbx]").length;
  E.R.cbApply(); E.R.cbDeco(E.svg); assert.equal(E.svg.querySelectorAll("[data-cbx]").length, n1);
  const mo = E.MOs.find(m => m.on); assert.ok(mo, "開著時要盯著畫面");
  const fresh = boardSvg(); E.svg.children.slice().forEach(c => c.remove()); fresh.children.slice().forEach(c => E.svg.append(c));
  assert.equal(E.svg.querySelectorAll("[data-cbx]").length, 0);
  mo.cb([{ target: E.svg, addedNodes: E.svg.children.slice() }]);
  assert.equal(E.svg.querySelectorAll("[data-cbx]").length, n1, "重畫後記號一樣多");
  const s2 = boardSvg(); const wrap = mk("div"); wrap.append(s2); E.document.body.append(wrap);
  mo.cb([{ target: E.document.body, addedNodes: [wrap] }]); assert.equal(s2.querySelectorAll("[data-cbx]").length, n1, "新放進頁面的棋盤也補");
});

test("關掉：記號全拿掉、每個改過的屬性還原成原樣、不再盯畫面", () => {
  const E = env(); const before = snap(E.svg);
  E.store.set("cbMode", true); assert.equal(E.R.cbApply(), true); assert.notEqual(snap(E.svg), before);
  E.store.set("cbMode", false); assert.equal(E.R.cbApply(), false);
  assert.equal(snap(E.svg), before, "還原後跟沒開過一模一樣");
  assert.equal(E.document.documentElement.hasAttribute("data-cbm"), false);
  assert.ok(E.MOs.every(m => !m.on));
  E.store.set("cbMode", true); E.R.cbApply(); E.store.set("cbMode", false); E.R.cbApply(); assert.equal(snap(E.svg), before, "開關兩輪也一樣");
});

test("高對比棋子（hiCon）或高對比主題開著：不重複畫黑環和將字牌，只把上一步改朱橘", () => {
  const E = env({ store: { cbMode: true, hiCon: true } }), S = E.svg;
  assert.equal(byCls(S, "cb-rim").length, 0); assert.equal(byCls(S, "cb-ck").length, 0);
  assert.equal(S.children.filter(c => c.getAttribute("stroke") === E.R.CB_COL.last).length, 0, "hiCon 的上一步色是 #0B5CD5，假棋盤用的是一般色，這裡不該誤改");
  const E2 = env({ store: { cbMode: true, hiCon: true } }); E2.svg.children.forEach(c => { for (const k of ["stroke", "fill"]) if (c.getAttribute(k) === MV) c.setAttribute(k, "#0B5CD5") });
  E2.svg.children.forEach(c => c.removeAttribute("data-cbd")); E2.R.cbDeco(E2.svg);
  assert.ok(E2.svg.children.filter(c => c.getAttribute("stroke") === E2.R.CB_COL.last).length >= 2);
});

// ====================== ② 純函式與配色 ======================
const P = env({ board: false }).R;
test("WCAG 對比公式：黑白 21:1、#777 對白約 4.48:1；全色盲模擬只剩亮度", () => {
  assert.equal(Math.round(P.cbContrast("#000000", "#FFFFFF") * 100) / 100, 21);
  assert.ok(Math.abs(P.cbContrast("#777777", "#FFFFFF") - 4.48) < .01);
  const g = P.cbSim("#C0392B", "achromatopsia"); assert.ok(Math.abs(g[0] - g[1]) < 1 && Math.abs(g[1] - g[2]) < 1);
  assert.ok(Math.abs(P.cbLum(g) - P.cbLum("#C0392B")) < .002, "全色盲換算保留相對亮度");
});
test("色覺模擬：紅綠色盲下「正著綠 vs 敗著紅」的差距大幅縮小（證明矩陣有作用）", () => {
  const d = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
  const n = d(P.cbSim("#2F6B4F", "none"), P.cbSim("#C0392B", "none")), pr = d(P.cbSim("#2F6B4F", "protanopia"), P.cbSim("#C0392B", "protanopia")), de = d(P.cbSim("#2F6B4F", "deuteranopia"), P.cbSim("#C0392B", "deuteranopia"));
  assert.ok(pr < n * .7 && de < n * .7, `${n} ${pr} ${de}`);
});
test("棋子分邊：字（帥仕相傌俥炮兵／將士象馬車砲卒）、整顆圖的檔名", () => {
  assert.equal(P.cbSideOf("炮"), "r"); assert.equal(P.cbSideOf("砲"), "b"); assert.equal(P.cbSideOf("士"), "b"); assert.equal(P.cbSideOf("仕"), "r");
  assert.equal(P.cbSideOf("", "data/pset/qin/rK.webp"), "r"); assert.equal(P.cbSideOf("", "data/pieces/ming-b.webp"), "b"); assert.equal(P.cbSideOf("", "data/chdpiece/x_bing_r.webp"), "r");
  assert.equal(P.cbSideOf("", "data/boards/x.webp"), null);
});
test("配色在紅、綠、藍色盲與全色盲模擬下：黑環對紅子棋面、黃點對朱橘、評語字色都分得開", () => {
  const C = P.CB_COL, sims = ["none", "protanopia", "deuteranopia", "tritanopia", "achromatopsia"], cc = (a, b, s) => P.cbContrast(P.cbSim(a, s), P.cbSim(b, s));
  for (const s of sims) {
    assert.ok(cc(C.ink, "#F8ECD4", s) >= 7, "黑環 vs 米色棋面 " + s);
    assert.ok(cc(C.dot, C.last, s) >= 2, "可走黃點 vs 上一步朱橘 " + s + " " + cc(C.dot, C.last, s));
    assert.ok(cc(C.dot, C.ink, s) >= 7, "黃點的黑邊 " + s);
    for (const [q, , , light] of P.CB_Q) for (const bg of ["#FFFFFF", "#FCF6EC", "#F3E7D7"]) assert.ok(cc(light, bg, s) >= 4.5, `${q} ${light} 對 ${bg}（${s}）＝${cc(light, bg, s).toFixed(2)}`);
  }
  assert.deepEqual([...P.CB_Q.map(x => x[2])], ["★", "✓", "○", "△", "✗", "✗✗"], "每個評語都有不同符號（全色盲也分得出）");
});

// ====================== ③ 原始碼 ======================
test("〔原始碼〕m.html 只 include 一次；模組能編譯；評語色碼跟 00-util.js QC 一致", () => {
  const H = rd(path.join(DB, "m.html")); assert.equal(H.split("//#include m/07cb-colorblind.js\n").length, 2);
  new vm.Script(SRC);
  const qc = JSON.parse(rd(path.join(M, "00-util.js")).match(/const QC=(\{[^}]*\})/)[1]);
  for (const [q, hex] of P.CB_Q) assert.equal(qc[q].replace("#", "").toUpperCase(), hex, q);
  assert.match(SRC, /store\.get\("cbMode",false\)/);
});
test("〔原始碼〕cb 開頭的全域名稱沒有在別的模組定義（同一個全域，同名會默默蓋掉）", () => {
  const names = [...SRC.matchAll(/^(?:function|var|const|let) (cb[A-Z]\w*|CB_\w+)/gm)].map(m => m[1]); assert.ok(names.includes("cbApply"));
  for (const f of fs.readdirSync(M).filter(f => f.endsWith(".js") && f !== "07cb-colorblind.js")) { const s = rd(path.join(M, f)); for (const n of names) assert.ok(!new RegExp(`(function|var|const|let)\\s+${n}\\b`).test(s), `${f} 也定義了 ${n}`) }
});
test("〔原始碼〕說明文件 colorblind.md 兩份一模一樣、LF 換行", () => {
  const a = fs.readFileSync(path.join(DB, "art/docs/colorblind.md"), "utf8"), b = fs.readFileSync(path.join(LAB, "site/data/docs/colorblind.md"), "utf8");
  assert.equal(a, b); assert.ok(!a.includes("\r")); assert.match(a, /色弱模式/); assert.match(a, /限制/);
});
test("〔原始碼〕設定頁有「🎨 色弱模式」開關（存 cbMode、切換後呼叫 cbApply，預設關），說明選單有 colorblind.md",()=>{
  const SET=require("fs").readFileSync(require("path").join(__dirname,"../../xiangqi-db/m/05-settings.js"),"utf8");
  assert.ok(SET.includes('<b>🎨 色弱模式</b>')&&SET.includes('id="cbSw" aria-label="色弱模式"'));
  assert.ok(SET.includes('cb.checked=!!store.get("cbMode",false);cb.onchange=()=>{vibrate(5);store.set("cbMode",cb.checked);if(typeof cbApply==="function")cbApply();'));
  assert.ok(SET.includes('cb:["colorblind","🎨 色弱模式"]'));
});
