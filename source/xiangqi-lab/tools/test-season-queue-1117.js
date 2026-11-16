// 11/17 iMac 模擬器第 1 輪：第 7 項（立冬季節卡）這輪沒看到卡片，可能被「把象棋千秋加到主畫面？」視窗蓋住。
//   原因：07w7 換季轉場 sw7SeaWait 只等開頭畫面（xqt-on）、載入畫面（#preov）、App 在背景；02-shell 自動問加到主畫面只等 .modal／#sheet／開頭畫面——
//   兩邊互相看不到，同時跳就疊在一起（視窗 z 60 蓋在首頁小籤上面；新手練習 #stqPg 開著時小籤也是播在練習頁底下）。
//   修法：排隊，一次一個。小籤等視窗、卡片、新手練習、主線電影、黑洞序章收掉（sw7SeaQ，不算進原本 2 分鐘）；加到主畫面也等小籤（.sw7-slip）收掉。
// 不開瀏覽器：sw7SeaWait／sw7SeaQ 和 02-shell 那一行切出來，用假 document、時鐘跑。用法：node --test xiangqi-lab/tools/test-season-queue-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const W7 = rd("xiangqi-db/m/07w7-seasons.js"), SH = rd("xiangqi-db/m/02-shell.js");
const L7 = W7.split("\n"), grab = head => { const i = L7.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, head); let j = i + 1; while (j < L7.length && /^\s/.test(L7[j])) j++; return L7.slice(i, j).join("\n") };
const WAIT = grab("function sw7SeaWait(") + "\n" + grab("const sw7SeaQ=");
const INST = SH.split("\n").find(l => l.startsWith("if(OFF&&!isStandalone()&&/iPhone|iPad|Android/.test(MY_KIND)){let instTry=0;const instAsk="));

/* 假頁面：on＝目前開著的東西（".modal"、"#stqPg"、".sw7-slip"…） */
function page() {
  let now = 0; const Q = [], on = new Set(), log = [];
  const has = sel => sel.split(",").some(x => on.has(x.trim()));
  const document = { body: { classList: { contains: c => on.has("." + c) } }, hidden: false, getElementById: id => on.has("#" + id) ? {} : null, querySelector: has };
  const env = { document, Date: { now: () => now }, setTimeout: (f, ms) => Q.push({ at: now + (ms || 0), f }) };
  const run = t => { while (Q.length) { Q.sort((a, b) => a.at - b.at); if (Q[0].at > t) break; const q = Q.shift(); now = q.at; q.f() } now = t };
  return { env, on, log, run, get now() { return now } };
}

test("〔排隊〕加到主畫面的視窗開著：換季小籤等它關掉才播（不會被蓋住、也不會 2 分鐘就放棄）", () => {
  const G = page(); G.on.add(".modal"); const P = { isConnected: true, querySelector: () => null };
  const names = Object.keys(G.env), wait = new Function(...names, WAIT + ";return sw7SeaWait")(...names.map(k => G.env[k]));
  let played = 0; wait(P, () => played++);
  G.run(180000); assert.equal(played, 0, "視窗開了 3 分鐘：小籤一直等");
  G.on.delete(".modal"); G.run(181000); assert.equal(played, 1, "視窗關了就播");
});

test("〔排隊〕新手練習頁、卡片、主線電影、黑洞序章開著也等；開頭畫面照舊 2 分鐘放棄", () => {
  for (const x of ["#stqPg", "#sheet", "#mnfPg", "#bhxPg"]) {
    const G = page(); G.on.add(x); const P = { isConnected: true, querySelector: () => null };
    const names = Object.keys(G.env), wait = new Function(...names, WAIT + ";return sw7SeaWait")(...names.map(k => G.env[k]));
    let played = 0; wait(P, () => played++); G.run(5000); assert.equal(played, 0, x); G.on.delete(x); G.run(6000); assert.equal(played, 1, x);
  }
  const G = page(); G.on.add(".xqt-on"); let removed = 0; const P = { isConnected: true, querySelector: () => ({ remove: () => removed++ }) };
  const names = Object.keys(G.env), wait = new Function(...names, WAIT + ";return sw7SeaWait")(...names.map(k => G.env[k]));
  let played = 0; wait(P, () => played++); G.run(130000); assert.equal(played, 0); assert.equal(removed, 1, "開頭畫面一直開著：照舊 2 分鐘後拿掉舊圖");
});

test("〔排隊〕小籤還在畫面上：加到主畫面先不問，小籤收掉才問", () => {
  const G = page(); G.on.add(".sw7-slip"); const asked = [];
  const env = Object.assign({}, G.env, { OFF: true, MY_KIND: "iPhone", isStandalone: () => false, installGuide: () => asked.push(G.now), store: { get: (k, d) => d } });
  const names = Object.keys(env); new Function(...names, INST)(...names.map(k => env[k]));
  G.run(8000); assert.deepEqual(asked, [], "小籤在（約 8 秒）：不問");
  G.on.delete(".sw7-slip"); G.run(13000); assert.equal(asked.length, 1, "小籤收掉後 4 秒內問");
});

test("〔原始碼〕小籤一出來就掛上 .sw7-slip（P.append），所以加到主畫面看得到它", () => {
  assert.ok(W7.includes('sl.className="sw7-slip"') && W7.includes("P.append(sl)"));
  assert.ok(INST.includes('document.querySelector(".modal,.sw7-slip")'));
});
