// 11/17 Windows 測試員 B-4／D P3-3（P2）：觀星臺的出口標籤第一次進來寫「🏘 回棋鎮」，從今日異象／星門圍城的結果視窗按「回觀星臺」回來後變成「↩ 回園子對局」。
//   原因：07w9 EXITS["/guanxing"] 沒寫死去處，exFix 照返回鍵記的上一頁（02-shell bkTo → NAV_H 上一筆）改字；結果視窗的「回觀星臺」是 location.hash 往前推一頁，
//   上一頁就是那盤棋 #/journey/play，05 USE_NAME 把它叫「園子對局」；按下去 goBack 還會退回下完的那盤。
//   修法：EXITS["/guanxing"] 加第 4 格 "#/"——字照舊「回棋鎮」（時光之苑換「回時光之苑」），按了 goHome 回首頁（觀星臺只從首頁、找地方進來）。
// 不開瀏覽器：vm 跑 07w9 的 EXITS、exFix，02-shell 的 navKey／BK_NAME／bkName，05 的 USE_NAME／usePlace。用法：node --test xiangqi-lab/tools/test-gxt-exit-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const W9 = rd("xiangqi-db/m/07w9-exits.js"), SH = rd("xiangqi-db/m/02-shell.js"), ST = rd("xiangqi-db/m/05-settings.js");
const line = (S, head) => { const L = S.split("\n"), i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n") };
const block = (S, head, end) => { const i = S.indexOf(head), j = S.indexOf(end, i); assert.ok(i >= 0 && j > i, "找得到 " + head); return S.slice(i, j + end.length) };

function kit(prevHash, exitsSrc) {
  const back = { dataset: { to: prevHash } };
  const ctx = { console, document: { getElementById: id => id === "back" ? back : null } };
  vm.createContext(ctx);
  const src = [line(SH, "const navKey="), line(SH, "const BK_NAME="), line(SH, "function bkName("), line(ST, "const USE_NAME="), line(ST, "const usePlace="),
    exitsSrc || block(W9, "const EXITS={", "};"), line(W9, "function exFind("), line(W9, "function exFix(")].join("\n");
  vm.runInContext(src + "\n;this.T={EXITS,exFix,exFind,bkName};", ctx);
  return ctx.T;
}
const label = (T, E) => T.exFix(E[2], E);

test("〔重現〕從今日異象／星門圍城的結果視窗回來（上一頁＝#/journey/play）：出口仍寫「🏘 回棋鎮」，不是「↩ 回園子對局」", () => {
  const T = kit("#/journey/play"), E = T.exFind("/guanxing");
  assert.deepEqual(Array.from(E), [86, 90, "🏘 回棋鎮", "#/"]);
  assert.equal(T.bkName("#/journey/play"), "園子對局", "前提：那一頁的叫法");
  assert.equal(label(T, E), "🏘 回棋鎮");
});

test("〔對照〕拿掉修補（出口不寫死去處）就會變成「↩ 回園子對局」", () => {
  const old = block(W9, "const EXITS={", "};").replace('"/guanxing":[86,90,"🏘 回棋鎮","#/"]', '"/guanxing":[86,90,"🏘 回棋鎮"]');
  const T = kit("#/journey/play", old);
  assert.equal(label(T, T.exFind("/guanxing")), "↩ 回園子對局");
});

test("〔照舊〕第一次從首頁進來、從找地方進來：都寫「🏘 回棋鎮」；按了直接 goHome（不是瀏覽器上一頁）", () => {
  for (const h of ["#/", "#/ximarket", "#/adventure", ""]) assert.equal(label(kit(h), kit(h).exFind("/guanxing")), "🏘 回棋鎮", h || "直接開網址");
  assert.ok(W9.includes('if(E[3]){if(E[3]==="#/"&&typeof goHome==="function"){goHome();return}'), "E[3]＝#/ 走 goHome");
  assert.ok(W9.includes('if(typeof hbIsCl==="function"&&hbIsCl())lb=lb.replace("回棋鎮","回時光之苑")'), "時光之苑照舊換成「回時光之苑」");
});

test("西市出口寫死回首頁（11/17 第 4 輪 D P2-4，跟觀星臺同一招）、茶坊照舊", () => {
  const T = kit("#/");
  assert.deepEqual(Array.from(T.EXITS["/ximarket"]), [64, 91, "🏘 回棋鎮", "#/"]);
  assert.deepEqual(Array.from(T.EXITS["/ximarket/tea"]), [24, 95, "↩ 回西市", "#/ximarket"]);
});
