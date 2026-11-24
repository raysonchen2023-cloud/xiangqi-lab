"use strict";
/* W94b（11/24）：簡體模式下，平面棋盤（SVG）與畫布（3D 棋子貼圖、河界）上的字也要轉簡體；紅子「傌」「俥」寫成「马」「车」，不能變成罕見字「㐷」「伡」。
   用 vm 載入真的 src/zh.js，配假的 document、localStorage、畫布與 OpenCC（OpenCC 用真的 opencc-t2cn.js，有建好 site/ 才用；沒有就用假的轉換器）。 */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "zh.js"), "utf8");
const REAL = path.join(__dirname, "..", "site", "opencc-t2cn.js");

/* 假的 DOM：只做 zh.js 用到的部分 */
function mkDom() {
  let obs = null;
  const node = (nodeType, nodeName, extra) => Object.assign({ nodeType, nodeName, firstChild: null, nextSibling: null, isConnected: true, attrs: {}, getAttribute(a) { return this.attrs[a] == null ? null : this.attrs[a] }, setAttribute(a, v) { this.attrs[a] = v }, closest() { return null } }, extra);
  const kids = (p, list) => { p.firstChild = list[0] || null; list.forEach((k, i) => { k.nextSibling = list[i + 1] || null }); return p };
  return { node, kids, get obs() { return obs }, setObs(o) { obs = o } };
}
function load(mode, opts = {}) {
  const D = mkDom(), drawn = [], measured = [];
  class Ctx { fillText(t) { drawn.push(t) } strokeText(t) { drawn.push(t) } measureText(t) { measured.push(t); return { width: String(t).length } } }
  const pc = D.kids(D.node(1, "svg"), [D.kids(D.node(1, "text"), [D.node(3, "#text", { nodeValue: "傌" })]), D.kids(D.node(1, "text"), [D.node(3, "#text", { nodeValue: "俥" })]), D.kids(D.node(1, "text"), [D.node(3, "#text", { nodeValue: "帥" })])]);
  const p = D.kids(D.node(1, "P"), [D.node(3, "#text", { nodeValue: "紅方先走：傌八進七" })]);
  const body = D.kids(D.node(1, "BODY"), [pc, p]);
  let onl = null;
  const ctx = {
    localStorage: { getItem: () => JSON.stringify(mode), setItem() {} },
    CanvasRenderingContext2D: Ctx,
    document: {
      body, title: "象棋千秋",
      head: { append(s) { onl = s } },
      createElement: () => ({}),
      addEventListener() {}
    },
    MutationObserver: class { constructor(f) { D.setObs(f) } observe() {} },
    window: null, console
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(SRC, ctx);
  /* 讓 OpenCC 載好：真的 opencc-t2cn.js 或假的（只轉測到的字，照 OpenCC 的實際行為把「傌」「俥」轉成罕見字） */
  const finish = () => {
    if (!onl) return;
    if (opts.real && fs.existsSync(REAL)) vm.runInContext(fs.readFileSync(REAL, "utf8"), ctx);
    else ctx.OpenCC = { Converter: () => (t) => t.replace(/[傌俥帥將馬車漢進紅]/g, c => ({ 傌: "㐷", 俥: "伡", 帥: "帅", 將: "将", 馬: "马", 車: "车", 漢: "汉", 進: "进", 紅: "红" })[c]) };
    onl.onload();
  };
  return { ctx, Ctx, drawn, measured, svgText: () => [pc.firstChild.firstChild.nodeValue, pc.firstChild.nextSibling.firstChild.nodeValue, pc.firstChild.nextSibling.nextSibling.firstChild.nodeValue], pText: () => p.firstChild.nodeValue, finish };
}
const tick = () => new Promise(r => setImmediate(r));

test("簡體模式：OpenCC 還沒載好時，畫布上的棋子字與「漢」已經是簡體（3D 棋子貼圖只畫一次，不能等 OpenCC）", () => {
  const L = load("cn"), c = new L.Ctx();
  for (const t of ["傌", "俥", "帥", "將", "馬", "車", "楚河", "漢界", "炮", "兵"]) c.fillText(t, 0, 0);
  assert.deepEqual([...L.drawn], ["马", "车", "帅", "将", "马", "车", "楚河", "汉界", "炮", "兵"]);
  c.measureText("傌"); assert.deepEqual([...L.measured], ["马"], "量字寬也用轉好的字，排版才對得上");
});

test("簡體模式：OpenCC 載好後，畫布上的整段文字照 OpenCC 轉，紅子不變罕見字「㐷」「伡」", async () => {
  const L = load("cn"); L.finish(); await tick();
  const c = new L.Ctx(); c.fillText("紅傌進七", 0, 0); c.strokeText("俥", 0, 0);
  assert.deepEqual([...L.drawn], ["红马进七", "车"]);
  assert.ok(!L.drawn.join("").match(/[㐷伡]/), "不能出現罕見字");
});

test("簡體模式：平面棋盤（SVG <text>）的棋子字轉成马、车、帅；一般文字照舊轉", async () => {
  const L = load("cn"); L.finish(); await tick();
  assert.deepEqual(L.svgText(), ["马", "车", "帅"]);
  assert.equal(L.pText(), "红方先走：马八进七");
});

test("繁體模式完全不動：畫布不包、SVG 照舊跳過", async () => {
  const L = load("tw"), c = new L.Ctx();
  c.fillText("傌", 0, 0); c.fillText("漢界", 0, 0);
  assert.deepEqual([...L.drawn], ["傌", "漢界"]);
  assert.ok(!L.Ctx.prototype.__xqCn, "繁體模式不包畫布");
  L.finish(); await tick();
  assert.deepEqual(L.svgText(), ["傌", "俥", "帥"]);
});

test("用真的 site/opencc-t2cn.js：畫布與 SVG 的紅子都是马、车", async () => {
  assert.ok(fs.existsSync(REAL), "要先跑 build-site.js 產生 site/opencc-t2cn.js");
  const L = load("cn", { real: true }); L.finish(); await tick();
  const c = new L.Ctx(); c.fillText("傌八進七", 0, 0); c.fillText("俥一平二", 0, 0);
  assert.deepEqual([...L.drawn], ["马八进七", "车一平二"]);
  assert.deepEqual(L.svgText(), ["马", "车", "帅"]);
});
