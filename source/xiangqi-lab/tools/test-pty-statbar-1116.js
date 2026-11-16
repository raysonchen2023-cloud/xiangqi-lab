// 開發者 11/16（雲河七星卡冊截圖、圈數值區）：「找rpg參考煙雨江湖的排版然後優化」「靈力隨著等級上升，顯示當前等級的靈力」；選單選「資源條＋攻防一行」。
//   同日追加「攻擊力和防禦力也有bar表示 顏色幫我設計」：攻防也各一條（÷ 同等級七種棋子最高的），朱紅／靛藍／琥珀金／松石綠。
//   m/07pty-party.js ptyStatHTML：體力、靈力各一條長條（體力條長＝÷ 同等級七種棋子裡最高的；靈力寫這一級的值、條長＝÷ Lv100 的靈力），攻擊力、防禦力一行大字；
//   不再用三欄灰色方塊、不再寫「俥・體力」「靈力上限」。
// 這裡把真的 07bhg-gatesiege.js、07sg2-siege2.js（新規則數值）和 07pty-party.js 一起放進 vm 跑；畫面在本機手機尺寸看過。
// 用法：node --test xiangqi-lab/tools/test-pty-statbar-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const rd = f => fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", f), "utf8").replace(/\r\n/g, "\n");
const SRC = rd("07pty-party.js");

function load() {
  const DB = {}, ctx = { console, Math, JSON, Date, Object, setTimeout: f => f(), store: { get: (k, d) => (k in DB ? DB[k] : d), set: (k, v) => { DB[k] = v } }, esc: s => String(s),
    window: {}, localStorage: { getItem: () => null }, document: { getElementById: () => ({}), createElement: () => ({}), head: { append() { } } }, xpInfo: () => ({ L: 3 }) };
  ctx.self = ctx; vm.createContext(ctx);
  for (const f of ["07bhg-gatesiege.js", "07sg2-siege2.js"]) try { vm.runInContext(rd(f), ctx, { filename: f }) } catch (e) { /* 畫面那一半在 vm 裡跑不起來沒關係，數值表在最前面 */ }
  vm.runInContext(SRC + "\n;this.__X={ptyStatHTML};", ctx);
  return { X: ctx.__X, SG2: vm.runInContext("SG2", ctx), SG2G: vm.runInContext("SG2G", ctx) };
}
const wid = (h, k) => +((h.match(new RegExp(`pty-bar ${k}"[^]*?width:(\\d+)%`)) || [])[1]);
const num = (h, k) => +((h.match(new RegExp(`pty-bar ${k}"[^]*?<em aria-hidden="true">(\\d+)</em>`)) || [])[1]);

test("〔行為〕四條：體力、靈力、攻擊力、防禦力；數字照新規則、照這位自己的等級", () => {
  const { X, SG2, SG2G } = load(), h = X.ptyStatHTML("x_swordboy", 3), u = SG2.unit("R", 3, 1);
  assert.ok(h.startsWith('<div class="pty-sv">'), "新版面");
  assert.equal(num(h, "hp"), u.hp, "體力＝俥 Lv3 的體力");
  assert.equal(num(h, "sp"), SG2G.spMaxOf(3), "靈力寫這一級的值");
  assert.equal(num(h, "atk"), u.atk, "攻擊力條"); assert.equal(num(h, "def"), u.def, "防禦力條");
  assert.ok(h.indexOf("pty-bar sp") < h.indexOf("pty-ad") && h.indexOf("pty-ad") < h.indexOf("pty-bar atk"), "資源一組、能力一組，中間隔開");
  assert.ok(h.includes('role="img" aria-label="體力 ' + u.hp + '"') && h.includes('aria-label="靈力 ' + SG2G.spMaxOf(3) + '"'), "旁白念「體力 n」「靈力 n」");
  for (const old of ["俥・體力", "靈力上限", 'class="pty-st"']) assert.ok(!h.includes(old), "不再有：" + old);
});

test("〔行為〕體力條長＝÷ 同等級七種棋子裡最高的：帥最長、兵最短；靈力條隨等級變長，Lv100 滿格", () => {
  const { X, SG2G } = load();
  const C = Object.keys(SG2G.PC_OF), W = Object.fromEntries(C.map(c => [c, wid(X.ptyStatHTML(c, 10), "hp")]));
  const K = C.find(c => SG2G.PC_OF[c] === "K"), P = C.find(c => SG2G.PC_OF[c] === "P");
  assert.equal(W[K], 100, "帥的體力最高，滿格");
  assert.ok(C.every(c => W[c] >= 4 && W[c] <= 100), "每條都看得到（至少 4%）、不超過 100%");
  assert.equal(Math.min(...Object.values(W)), W[P], "兵最短");
  const s1 = wid(X.ptyStatHTML("x_swordboy", 1), "sp"), s50 = wid(X.ptyStatHTML("x_swordboy", 50), "sp"), s100 = wid(X.ptyStatHTML("x_swordboy", 100), "sp");
  const A = Object.fromEntries(C.map(c => [c, wid(X.ptyStatHTML(c, 10), "atk")])), D = Object.fromEntries(C.map(c => [c, wid(X.ptyStatHTML(c, 10), "def")]));
  assert.equal(Math.max(...Object.values(A)), 100, "攻擊最高的那種滿格"); assert.equal(Math.max(...Object.values(D)), 100, "防禦最高的那種滿格");
  assert.equal(A[C.find(c => SG2G.PC_OF[c] === "R")], 100, "俥攻擊最高");
  assert.ok(s1 < s50 && s50 < s100, "升級靈力條變長");
  assert.equal(s100, 100, "Lv100 滿格");
  assert.ok(num(X.ptyStatHTML("x_swordboy", 50), "sp") > num(X.ptyStatHTML("x_swordboy", 1), "sp"), "靈力數字也隨等級變大");
});

test("〔原始碼〕樣式：細線分隔、朱紅體力、靛藍靈力、琥珀金攻擊、松石綠防禦；舊的三格樣式留給沒有新規則時的備援", () => {
  for (const s of [".pty-sv{grid-column:1/-1;", ".pty-bar.hp>i>b{background:linear-gradient(90deg,#9e2a20,#d0574b)}", ".pty-bar.sp>i>b{background:linear-gradient(90deg,#2a4f93,#5a8bd6)}",
    ".pty-bar.atk>i>b{background:linear-gradient(90deg,#a8650f,#e2a63b)}", ".pty-bar.def>i>b{background:linear-gradient(90deg,#1f6f5c,#4ea88c)}", ".pty-ad{margin-top:5px;padding-top:5px;border-top:1px dashed", ".pty-st{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);"]) assert.ok(SRC.includes(s), s);
  assert.ok(SRC.includes("return ptyStatHTMLOld(c,lv)}"), "沒有新規則時照舊");
});
