// W33（P1，App Store 審查準則 2.3.1：不能有隱藏或沒寫明的功能）：原生 App（iOS、Android）裡打不開開發者模式，鎖住現況。
// 原生版判定：window.XQ_NATIVE 或 User-Agent 含 XQQianqiuApp/（00-util xqNat、05-settings setNat）。
// ① DEVMODE／DEVUNLOCK／DEVTOOLS 在原生一律 false，就算存檔被寫成 devMode、dvtUnlock、dvtTools 都是 true（vm 實跑 02-shell 的原文）；網頁版照舊可以打開（對照組）。
// ② 設定頁「進階・開發者模式」開關只在網頁離線版出現；③ #/fbadmin（意見回饋管理）原生直接回首頁；④ 只有一個地方會把 devMode 設成 true，而且在開發者登入的回呼裡。
// 用法 node --test xiangqi-lab/tools/test-w33-native-nodev-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = (p) => fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m", p), "utf8").replace(/\r\n/g, "\n");
const SHELL = M("02-shell.js"), SET = M("05-settings.js"), UTIL = M("00-util.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };

function env({ nat = false, ua = "", off = true }) {
  const mem = { devMode: true, dvtUnlock: true, dvtTools: true };
  const c = vm.createContext({ window: { XQ_NATIVE: nat || undefined }, navigator: { userAgent: ua }, OFF: off,
    store: { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v } } });
  vm.runInContext(cut(UTIL, "function xqNat(){", "catch(e){return false}}") + "\n" + cut(SET, "function setNat(){", "catch(e){return false}}") + "\n" +
    cut(SHELL, "const DEVMODE=", ";") + "\n" + cut(SHELL, "const DEVUNLOCK=", ";") + "\n" + cut(SHELL, "const DEVTOOLS=", ";") + "\nthis.R={DEVMODE:DEVMODE(),DEVUNLOCK:DEVUNLOCK(),DEVTOOLS:DEVTOOLS()};", c);
  return c.R;
}

test("原生 App：存檔把 devMode、dvtUnlock、dvtTools 都寫成 true，開發者模式和小工具還是打不開（XQ_NATIVE、User-Agent 兩種判定都算）", () => {
  for (const e of [{ nat: true }, { ua: "Mozilla/5.0 XQQianqiuApp/20261127" }]) {
    const R = env(e);
    assert.deepEqual({ ...R }, { DEVMODE: false, DEVUNLOCK: false, DEVTOOLS: false }, JSON.stringify(e));
  }
});

test("對照組：網頁離線版存檔打開時照舊是開發者模式（測試真的有跑到那段判斷）", () => {
  const R = env({});
  assert.deepEqual({ ...R }, { DEVMODE: true, DEVUNLOCK: true, DEVTOOLS: true });
});

test("設定頁「進階・開發者模式」開關只在網頁離線版出現（原生版不畫）", () => {
  assert.ok(SET.includes(`\${OFF&&!(typeof setNat==="function"&&setNat())?'<div class="sec-t" data-sm-title="進階" data-i18n="set.section.advanced">進階</div><div class="card"><label class="row" style="justify-content:space-between"><span><b>開發者模式</b>`));
  assert.equal((SET.match(/<b>開發者模式<\/b>/g) || []).length, 1, "開關只有這一處");
});

test("#/fbadmin（意見回饋管理）原生 App 直接回首頁", () => {
  assert.match(SHELL, /if\(p\[0\]==="fbadmin"\)\{if\(typeof xqNat==="function"&&xqNat\(\)\)\{navReplace\("#\/"\);return\}return screen=FbAdmin\(v\)\}/);
});

test("整個 m/ 只有一個地方把 devMode 設成 true，而且在開發者登入（devLogin）的回呼裡", () => {
  const hits = [];
  for (const f of fs.readdirSync(path.join(__dirname, "../../xiangqi-db/m")).filter((f) => f.endsWith(".js"))) {
    const s = M(f); for (const m of s.matchAll(/store\.set\("devMode",\s*true\)/g)) hits.push([f, s.slice(Math.max(0, m.index - 40), m.index)]);
  }
  assert.equal(hits.length, 1, JSON.stringify(hits));
  assert.equal(hits[0][0], "05-settings.js"); assert.match(hits[0][1], /devLogin\(\(\)=>\{$/);
});
