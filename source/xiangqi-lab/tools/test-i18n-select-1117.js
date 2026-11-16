// 11/17 測試員 D（English 介面）：設定頁的棋子聲音、大廳城市下拉選單一直是中文——07i18n 的 i18nIsSkip 把 SELECT 整個跳過。
// 現在選項有寫 value 的只換顯示的字（值不變），沒寫 value 的照舊不翻（value 預設就是那段字，換了會壞）；語言選單照舊靠 data-nocc 跳過；
// 分組標題 optgroup label 也翻（I18N_ATTR 加 label）。另外「城子」英文統一成 Chengzi（以前內建寫 Cheng，跟 Yanzi、Xi'er 不一致）。
// 用法：node --test xiangqi-lab/tools/test-i18n-select-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07i18n.js"), "utf8");
const line = SRC.split("\n").find(l => l.startsWith("function i18nIsSkip("));
const nextL = SRC.split("\n")[SRC.split("\n").indexOf(line) + 1];
const skip = new Function(line + "\n" + nextL + "\nreturn i18nIsSkip")();
const el = (name, attrs, cls) => ({ nodeType: 1, nodeName: name, hasAttribute: k => attrs && k in attrs, classList: { contains: c => (cls || []).includes(c) } });

test("下拉選單不再整個跳過；有 value 的選項會翻，沒 value 的不翻", () => {
  assert.equal(skip(el("SELECT", {})), false, "SELECT 本身不跳過");
  assert.equal(skip(el("OPTION", { value: "s25" })), false, "有 value 的選項會翻（只換字）");
  assert.equal(skip(el("OPTION", {})), true, "沒 value 的選項照舊不翻");
  assert.equal(skip(el("SELECT", { "data-nocc": "" })), true, "語言選單（data-nocc）照舊跳過");
  for (const n of ["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "CODE", "PRE", "SVG", "CANVAS"]) assert.equal(skip(el(n, {})), true, n + " 照舊跳過");
});
test("分組標題（optgroup label）也翻", () => {
  assert.match(SRC, /const I18N_ATTR=\["aria-label","title","placeholder","label"\];/);
});
test("城子的英文統一成 Chengzi（內建字典與劇情句）", () => {
  assert.ok(SRC.includes('"城子": "Chengzi"'), "城子 → Chengzi");
  assert.ok(!/\bCheng\b/.test(SRC), "內建不再出現單獨的 Cheng");
});
test("棋子聲音、大廳城市的選項都有寫 value（翻字不會改到值）", () => {
  const ST = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "05-settings.js"), "utf8");
  assert.ok(ST.includes(`<option value="\${k}"\${cur===k?" selected":""}>`), "棋子聲音");
  assert.ok(ST.includes(`'<option value="'+v+'"'`), "大廳城市");
});
test("內建英文三條（測試員 D 第 3 輪）：官階說明前半句尾有空格、經典版後半句接在名字後、星門圍城規則統一", () => {
  assert.ok(SRC.includes('"到「挑戰電腦 → 🥇 晉級賽」贏棋升段，":"Win ranked computer games to advance your chess rank. "'), "句尾空格，後面接名字不黏在一起");
  assert.ok(SRC.includes('"就跟著升官（九品官 → 一品官），官服、頂戴、腰帶都會換":" rises in rank along with you (Grade 9 → Grade 1)'), "接在名字後面");
  assert.ok(SRC.includes('"星門圍城規則":"Star Gate Siege rules"'));
});
