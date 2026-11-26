/* W156（11/26 外部複審）刪除本機資料的第二層確認：螢幕報讀與鍵盤模式下，對話框原本自動聚焦第一顆「🗑 全部刪除」，連按兩次就刪。
   改成「不要刪」加 ax-first，11b-a11y.js 的 axmDlgAdd 聚焦時優先挑 ax-first。
   這支測試：① 05-settings.js 的第二層確認，「不要刪」那顆帶 ax-first、「全部刪除」沒有；
   ② 用 vm 跑 11b-a11y.js 裡的 axmDlgAdd（切出那幾段、配假的 DOM），報讀模式下焦點落在 ax-first，沒有 ax-first 的對話框照舊落在第一顆；
   ③ 改壞驗證：axmDlgAdd 不看 ax-first 時，檢查要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");

/* 從 11b-a11y.js 切出 AXM_DLG／AXM_FOC／axmFocusables／axmDlgAdd */
function cut(src) {
  const a = src.indexOf("const AXM_DLG=new Map()"), b = src.indexOf("/* 關掉一層");
  if (a < 0 || b < 0) throw new Error("11b-a11y.js 找不到 axmDlgAdd 那段");
  return src.slice(a, b);
}
function btn(label, cls) {
  const cl = new Set((cls || "btn").split(" ").filter(Boolean));
  return { tagName: "BUTTON", label, classList: { contains: (c) => cl.has(c) }, closest: () => null, getClientRects: () => [1], focus() { focused = this } };
}
let focused = null;
function run(src, buttons, on = true) {
  focused = null;
  const el = { isConnected: true, attrs: {}, hasAttribute(k) { return k in this.attrs }, setAttribute(k, v) { this.attrs[k] = v }, querySelector: () => null,
    querySelectorAll: () => buttons, contains: () => false, focus() { focused = this } };
  const c = { document: { activeElement: null, body: {} }, setTimeout: (f) => f(), axmOn: () => on, Map, Set };
  vm.createContext(c); vm.runInContext(src + "\naxmDlgAdd(EL);", Object.assign(c, { EL: el }));
  return focused;
}

test("第二層確認：「不要刪」帶 ax-first、「全部刪除」沒有", () => {
  const s = rd("05-settings.js"), line = s.slice(s.indexOf("function wipeAsk2()"), s.indexOf("\n", s.indexOf("function wipeAsk2()")));
  assert.match(line, /\["不要刪",null,"ax-first"\]/);
  assert.match(line, /\["🗑 全部刪除",wipeAllData\]/);
});

function problems(src) {
  const bad = [];
  const del = btn("🗑 全部刪除", "btn"), keep = btn("不要刪", "btn ghost ax-first");
  const f = run(src, [del, keep]);
  if (f !== keep) bad.push("報讀模式下焦點要落在「不要刪」（實際 " + (f && f.label) + "）");
  const a = btn("確定", "btn"), b = btn("取消", "btn ghost");
  if (run(src, [a, b]) !== a) bad.push("沒有 ax-first 的對話框，照舊聚焦第一顆");
  return bad;
}

test("axmDlgAdd：報讀模式先聚焦 ax-first；沒有就照舊第一顆", () => {
  assert.deepEqual(problems(cut(rd("11b-a11y.js"))), []);
});

test("改壞驗證：不看 ax-first 時檢查要抓得到", () => {
  const src = cut(rd("11b-a11y.js")), bad = src.replace("f=fl.find(x=>x.classList.contains(\"ax-first\"))||fl[0]||null", "f=fl[0]||null");
  assert.notEqual(bad, src, "改壞的程式要真的有改到");
  assert.ok(problems(bad).length > 0);
});
