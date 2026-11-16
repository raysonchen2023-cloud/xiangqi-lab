// 11/17 Windows 測試員 D P2-4（P2）：在西市的雲河櫃坊合券拿到修為，說書人「《千秋棋話》亮了一下」（「赤壁的火還沒熄……」，按鈕「去星槎／之後再說」）
//   就蓋在櫃坊上，第一次點「合券」被擋。
//   原因：07pty ptyHintLater 只等 .modal（最多 20 次），櫃坊是卡片、不是 .modal，也不管現在在哪一頁。
//   修法：等回到首頁或星槎主畫面（PTY_HINT_AT，跟 07mnq mnqIdle 自動跳禮包同一組頁），而且沒有卡片、過場蓋著（ptyHintBusy）才跳；
//   在別的頁就一直等、不算進 20 次（原本的「.modal 開著等最多 20 次」照舊）。
// 不開瀏覽器：vm 跑 ptyHintOk／ptyHintLater，假的 setTimeout（手動推進）、location、document。用法：node --test xiangqi-lab/tools/test-pty-hint-wait-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const PTY = rd("xiangqi-db/m/07pty-party.js");
const grab = head => { const L = PTY.split("\n"), i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n") };

function kit(src) {
  const q = [], shown = [], st = { hash: "#/ximarket", sel: new Set(["#sheet"]) };
  const ctx = { location: { get hash() { return st.hash } }, setTimeout: f => { q.push(f); return q.length },
    document: { querySelector: s => s.split(",").some(x => st.sel.has(x.trim())) ? {} : null }, ptyHintShow: c => shown.push(c) };
  vm.createContext(ctx);
  vm.runInContext((src || [grab("const PTY_HINT_AT="), grab("function ptyHintOk("), grab("const ptyHintBusy="), grab("function ptyHintLater(")].join("\n")) + ";this.T={ptyHintLater,ok:typeof ptyHintOk==='function'?ptyHintOk:null};", ctx);
  const tick = n => { for (let i = 0; i < n && q.length; i++)q.shift()() };
  return Object.assign(ctx.T, { st, shown, tick, q });
}

test("〔純判斷〕ptyHintOk：首頁、星槎主畫面、沒有東西蓋著才可以跳", () => {
  const K = kit();
  for (const h of ["#/", "#", "", "#/adventure"]) assert.equal(K.ok(h, false), true, h || "空");
  for (const h of ["#/ximarket", "#/ximarket/tea", "#/journey/play", "#/ship/pz", "#/guanxing", "#/adventure/x"]) assert.equal(K.ok(h, false), false, h);
  assert.equal(K.ok("#/", true), false, "首頁但有卡片、過場蓋著");
});

test("〔重現〕人在西市櫃坊（卡片開著）：等多久都不跳；關了卡片但還在西市也不跳；回到首頁才跳", () => {
  const K = kit(); K.ptyHintLater("x_shuai", 0);
  K.tick(60); assert.deepEqual(K.shown, [], "櫃坊開著、等了 60 輪（遠超過原本 20 次）還是不跳");
  K.st.sel.clear(); K.tick(10); assert.deepEqual(K.shown, [], "櫃坊關了，人還在西市");
  K.st.hash = "#/"; K.tick(1); assert.deepEqual(K.shown, ["x_shuai"], "回到首頁就跳");
  assert.equal(K.q.length, 0, "跳了就不再排");
});

test("〔照舊〕在首頁拿到修為：.modal 開著先等（最多 20 次），沒有就馬上跳", () => {
  const A = kit(); A.st.hash = "#/"; A.st.sel = new Set([".modal"]); A.ptyHintLater("x_bing", 0);
  A.tick(15); assert.deepEqual(A.shown, []); A.tick(10); assert.deepEqual(A.shown, ["x_bing"], "等滿 20 次照舊跳");
  const B = kit(); B.st.hash = "#/adventure"; B.st.sel.clear(); B.ptyHintLater("x_bing", 0); B.tick(1); assert.deepEqual(B.shown, ["x_bing"]);
});

test("〔對照〕拿掉修補（舊 ptyHintLater 只看 .modal）：在櫃坊照樣跳出來", () => {
  const K = kit('function ptyHintLater(c,n){setTimeout(()=>{if(document.querySelector(".modal")&&n<20)return ptyHintLater(c,n+1);ptyHintShow(c)},n?2000:4000)}');
  K.ptyHintLater("x_shuai", 0); K.tick(1); assert.deepEqual(K.shown, ["x_shuai"], "舊版蓋在櫃坊上");
});

test("〔接線〕ptyHintShow 照舊（說書人那張、去星槎／之後再說），ptyHintCheck 照舊呼叫 ptyHintLater", () => {
  assert.match(PTY, /function ptyHintCheck\(\)\{[^\n]*ptyHintLater\(L\[0\],0\)\}/);
  assert.match(PTY, /\[\["去星槎",\(\)=>\{location\.hash="#\/adventure"\}\],\["之後再說",null,true\]\]/);
});
