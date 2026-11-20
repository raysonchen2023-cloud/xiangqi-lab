// 11/18 iMac 驗 1909（P1）：十州棋館長卷頁在圖好之前就被換掉時，宣紙色遮罩 #jhFade 一直蓋在別的頁面上、點什麼都沒反應。
// 修法：離開 #/jianghu 就拿掉遮罩；6 秒保險在長卷頁已經不在時也拿掉。這裡用假的 DOM 跑 07z9b-jianghu.js 的 hashchange 那一段。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07z9b-jianghu.js"), "utf8");

test("離開長卷頁（hashchange 到別頁）就拿掉遮罩；還在長卷頁不動", () => {
  const line = SRC.split("\n").findIndex(l => l.startsWith('if(typeof addEventListener==="function")addEventListener("hashchange"'));
  assert.ok(line >= 0, "找不到 hashchange 那段");
  const code = SRC.split("\n").slice(line, line + 2).join("\n");
  const cls = () => { const s = new Set(); return { add: k => s.add(k), remove: k => s.delete(k), contains: k => s.has(k) } };
  let labelRemoved = 0;
  const fade = {
    classList: cls(),
    querySelector: selector => selector === ".jh-sailing" ? { remove: () => { labelRemoved++ } } : null,
  };
  const body = { classList: cls() };
  let H = null; const ctx = { location: { hash: "#/" }, document: { body, getElementById: id => id === "jhFade" ? fade : null }, addEventListener: (ev, fn) => { if (ev === "hashchange") H = fn } };
  vm.runInNewContext(code, ctx); assert.equal(typeof H, "function");
  fade.classList.add("on"); ctx.location.hash = "#/jianghu"; H(); assert.ok(fade.classList.contains("on"), "長卷頁本身不拿（等圖好了淡出）");
  ctx.location.hash = "#/"; H(); assert.ok(!fade.classList.contains("on"), "回首頁就拿掉");
  assert.equal(labelRemoved, 1, "離開長卷也一併移除搭星槎的提示");
});

test("6 秒保險：長卷頁已經不在畫面上時也把遮罩拿掉", () => {
  assert.ok(SRC.includes('setTimeout(()=>{if(!f.classList.contains("on"))return;if(wrap.isConnected)ready();else f.classList.remove("on")},6000);'));
});
