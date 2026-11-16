// 11/17 iPhone 模擬器測試第 7 項（先查，可能 P1）：黑洞・星樞棋局（星門圍城）打開「規則」，點視窗外沒反應、上下捲動也沒反應，只能重新整理。
//   查到的：規則是一般的 modal（00-util），「知道了」在規則全文的最後面；m.css 的 .modal 是置中的固定層、沒有 overflow（只有 html[data-fz] 換過字級才會捲，
//   07bht 也記過同一個坑），點背景也沒有關閉。規則十二條約 560 字、排起來約 30 行（700px 上下），轉橫向（黑洞局會提示轉橫向，畫面只剩約 400px 高）一定超出，直放也頂到邊——方塊上下都超出畫面，
//   「知道了」在畫面外、捲不到、點旁邊不會關＝真的關不掉，不是模擬器觸控的問題。
//   修法（07bhg gsvInfo，07sg2／07bhg 的規則、星門預告都改用）：class gsv-rd 讓整層可以上下捲（放得下時照樣置中）、「知道了」黏在畫面底、點視窗外面會關。
// 不開瀏覽器：gsvInfo 切出來配假的 modal 跑；樣式、接點看原始碼。用法：node --test xiangqi-lab/tools/test-gsv-rules-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const G = rd("xiangqi-db/m/07bhg-gatesiege.js"), SG2 = rd("xiangqi-db/m/07sg2-siege2.js"), CSS = rd("xiangqi-db/m.css");
const fnLine = (src, head) => { const l = src.split("\n").find(x => x.startsWith(head)); assert.ok(l, "找得到 " + head); return l };

function kit() {
  const calls = [];
  const modal = (html, btns, cls) => { const L = {}; const m = { html, btns, cls, removed: false, addEventListener: (t, f) => { L[t] = f }, remove() { this.removed = true }, fire: tg => L.click && L.click({ target: tg }) }; calls.push(m); return m };
  const gsvInfo = new Function("modal", "gsvCss", fnLine(G, "function gsvInfo(") + ";return gsvInfo")(modal, () => { });
  return { gsvInfo, calls };
}

test("〔查證〕預設的 .modal 不能捲：置中的固定層、沒有 overflow；規則有十幾條（比 iPhone 畫面高）", () => {
  const base = /\n\.modal\{([^}]*)\}/.exec(CSS)[1];
  assert.match(base, /position:fixed;inset:0/); assert.match(base, /align-items:center/); assert.ok(!/overflow/.test(base), "一般字級：沒有 overflow");
  assert.ok(CSS.includes("html[data-fz] .modal{overflow-y:auto;align-items:flex-start}"), "只有換過字級才捲");
  const rules = /function sg2RulesHTML\(\)\{return`([\s\S]*?)<\/ul>`\}/.exec(SG2)[1];
  const n = (rules.match(/<li>/g) || []).length, chars = rules.replace(/<[^>]+>|\$\{[^}]+\}/g, "").replace(/\s/g, "").length;
  const lines = rules.split("<li>").slice(1).reduce((t, x) => t + Math.ceil(x.replace(/<[^>]+>|${[^}]+}/g, "").replace(/s/g, "").length / 21), 0);   /* 方塊 340 寬、左右留 20：13.5px 一行約 21 字 */
  assert.ok(n >= 10 && chars >= 500 && lines * 23 > 560, `規則 ${n} 條、約 ${chars} 字、約 ${lines} 行（${lines * 23}px）：加上標題和按鈕，比轉橫向的 iPhone（約 400px 高）高很多，直放也頂到邊`);
});

test("〔行為〕gsvInfo：用可以捲的 gsv-rd 視窗、只有「知道了」；點視窗外面（背景那一層）就關，點裡面不關", () => {
  const K = kit(), m = K.gsvInfo("<h2>星門圍城規則</h2>");
  assert.equal(m.cls, "gsv-rd"); assert.deepEqual(m.btns, [["知道了", null]]);
  m.fire({}); assert.equal(m.removed, false, "點方塊裡面不關");
  m.fire(m); assert.equal(m.removed, true, "點背景關掉");
});

test("〔樣式〕gsv-rd：整層上下捲、放得下時置中（margin:auto）、「知道了」黏在底下", () => {
  assert.ok(G.includes(".modal.gsv-rd{overflow-y:auto;align-items:flex-start;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.modal.gsv-rd>.box{margin:auto 0}"));
  assert.match(G, /\.modal\.gsv-rd \.mb\{position:sticky;bottom:0;[^}]*background:var\(--card/);
  assert.ok(/function gsvCss\(\)[\s\S]*\.modal\.gsv-rd\{/.test(G), "樣式在 gsvCss 裡（對局頁本來就載）");
});

test("〔接點〕星門圍城（07sg2 新版、07bhg 舊版）的「規則」「星門預告」都用 gsvInfo", () => {
  assert.ok(SG2.includes('if(k==="rules"){gsvInfo(`<h2 style="font-size:19px">星門圍城規則</h2>${sg2RulesHTML()}`);return}'));
  assert.ok(SG2.includes('gsvInfo(`<h2 style="font-size:19px">星門預告</h2>'));
  assert.ok(G.includes('if(k==="rules"){gsvInfo(`<h2 style="font-size:19px">星門圍城規則</h2>${gsvRulesHTML()}`);return}'));
  assert.ok(G.includes('gsvInfo(`<h2 style="font-size:19px">星門預告</h2>'));
  assert.ok(!/星門圍城規則<\/h2>\$\{(sg2|gsv)RulesHTML\(\)\}`,\[\["知道了",null\]\]/.test(SG2 + G), "不再用不能捲的一般視窗");
});
