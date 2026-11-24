"use strict";
/* D1（11/24 送審前，App Store 2.3.1 隱藏功能）：原生 App 一律不是開發者模式——存檔帶來 devMode:true（例如換手機搬存檔）也不生效；
   手機網頁（OFF、不是原生）照舊可以打開；電腦網頁（不是 OFF）照舊一律是。用 vm 跑 m/02-shell.js 真的 DEVMODE／DEVUNLOCK／DEVTOOLS。 */
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const SH = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "02-shell.js"), "utf8");

function defs(st, { off = true, nat } = {}) {
  const a = SH.indexOf("const DEVMODE=()=>"), b = SH.indexOf("function devNote(t){"), e = SH.indexOf("\n", b);
  assert.ok(a > 0 && b > a, "抓得到 DEVMODE 那一段");
  const ctx = { store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } }, OFF: off, Date };
  if (nat !== undefined) ctx.setNat = () => nat;
  vm.createContext(ctx); vm.runInContext(SH.slice(a, e) + "\n;this.__X={DEVMODE,DEVUNLOCK,DEVTOOLS};", ctx); return ctx.__X;
}
const ALL = { devMode: true, dvtUnlock: true, dvtTools: true };

test("原生 App：存檔帶來 devMode、全部解鎖、小工具都打開，也一律不是開發者模式", () => {
  const X = defs({ ...ALL }, { nat: true });
  assert.equal(X.DEVMODE(), false); assert.equal(X.DEVUNLOCK(), false, "全部解鎖試玩不能生效"); assert.equal(X.DEVTOOLS(), false);
});

test("手機網頁（離線版、不是原生）：登入打開開發者模式照舊有效", () => {
  const X = defs({ ...ALL }, { nat: false });
  assert.equal(X.DEVMODE(), true); assert.equal(X.DEVUNLOCK(), true); assert.equal(X.DEVTOOLS(), true);
  assert.equal(defs({}, { nat: false }).DEVMODE(), false, "沒打開就不是");
});

test("電腦網頁（不是離線版）照舊一律是開發者模式；setNat 不存在時照舊看存檔", () => {
  assert.equal(defs({}, { off: false, nat: false }).DEVMODE(), true);
  assert.equal(defs({ devMode: true }).DEVMODE(), true, "沒有 setNat（例如只載了 02-shell 的測試環境）照舊看存檔");
});
