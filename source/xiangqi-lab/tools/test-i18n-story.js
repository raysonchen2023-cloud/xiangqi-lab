"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const modules = path.resolve(__dirname, "../../xiangqi-db/m");
const read = name => fs.readFileSync(path.join(modules, name), "utf8");
const source = read("07i18n.js");
const context = vm.createContext({});
vm.runInContext(source.slice(source.indexOf("const I18N_CJK"), source.indexOf("/* #I18N-PURE-END")) +
  ";this.translate=i18nStoryText;this.localize=i18nStoryData;", context);
const chinese = /[\u3400-\u9fff]/;
test("English audit: dynamic coach labels and concise puzzle instructions", () => {
  assert.equal(context.translate("已選 3／20 題", "en"), "Selected 3 / 20 puzzles");
  assert.equal(context.translate("621 題・由易到難・點題卡加入或取消", "en"),
    "621 puzzles · Easiest first · Tap cards to add or remove");
  assert.equal(context.translate("查看已選（3）・排序與產生連結", "en"), "Selected (3) · Order and share");
  assert.equal(context.translate("黑將躲開了。看看俥現在能不能沿空的那一路直衝到底。", "en"),
    "The general moved aside. Can your chariot use the open file?");
});
test("English audit: result import feedback retains counts and rejection reasons", () => {
  assert.equal(context.translate("讀到 2 份成績", "en"), "Imported 2 reports");
  const rejection=context.translate("第 1 份：校驗碼對不上（成績被改過，或複製時少了一段）", "en");
  assert.equal(rejection, "Report 1: Checksum mismatch (results altered or incompletely copied)");
  assert.equal(context.translate("13 次・共 2.5 秒", "en"), "13 tasks · 2.5 s total");
});
test("Long privacy notices use explicit translations without removing the unknown-text length limit", () => {
  const text=read("05-settings.js").match(/'App 每 7 天[^']+'/)[0].slice(1,-1);
  assert.ok(text.length>600);
  const result=context.translate(text,"en");
  assert.ok(result.includes("90 days")&&result.includes("30 days")&&result.includes("one year"));
  assert.equal(chinese.test(result),false);
  vm.runInContext("this.rawText=i18nText;",context);
  assert.equal(context.rawText("甲".repeat(601)),null);
});
function data(file, start, end, expression) {
  const text = read(file);
  return vm.runInNewContext(text.slice(text.indexOf(start), text.indexOf(end)) + ";" + expression);
}
const chapter = data("07mnv-mainvn.js", "const MNV_WHO", "/* ---------- 純計算",
  "({who:MNV_WHO,chapters:MNV_CH})");
const film = data("07mnf-mainfilm.js", "const MNF_C1Q=", "/* ---------- 純計算",
  "({films:MNF_FILMS,puzzles:MNF_QTE,rite:MNF_RITE_TXT})");
const tea = data("07t-episodes.js", "const EP4_OPEN=", "const ep4Night=",
  "({open:EP4_OPEN,end:EP4_END,games:EP4_GAME})");
function checkText(value, key) {
  if (key === "seal") return;
  if (typeof value === "string") {
    assert.equal(chinese.test(value.replace(/\{(?:名|你)\}/g, "")), false, "Untranslated display text: " + value);
  } else if (Array.isArray(value)) {
    value.forEach(item => checkText(item));
  } else if (value && typeof value === "object") {
    Object.entries(value).forEach(([name, item]) => checkText(item, name));
  }
}
for (const [name, value] of Object.entries({chapter, film, tea})) {
  test(name + ": English covers all authored display text and preserves the source", () => {
    const before = JSON.stringify(value);
    const result = context.localize(value, "en");
    checkText(result);
    assert.equal(JSON.stringify(value), before);
    assert.equal(context.localize(value, "tw"), value);
    assert.equal(context.localize(value, "cn"), value);
  });
}
test("Localization preserves puzzle moves, FEN, scene IDs, timing and Chinese seal artwork", () => {
  const result = context.localize(chapter, "en").chapters.qin;
  assert.equal(result.qte, chapter.chapters.qin.qte);
  assert.equal(result.end.seal, "秦");
  assert.deepEqual(Array.from(result.sc, scene => scene.id), Array.from(chapter.chapters.qin.sc, scene => scene.id));
  const puzzles = context.localize(film, "en").puzzles;
  assert.equal(puzzles.c2.fen, film.puzzles.c2.fen);
  assert.equal(JSON.stringify(puzzles.c2.line), JSON.stringify(film.puzzles.c2.line));
  assert.equal(JSON.stringify(puzzles.c2.alt), JSON.stringify(film.puzzles.c2.alt));
  assert.equal(puzzles.c2.wrong.e5e8.re, "f9e8");
  assert.equal(context.localize(film, "en").films.c1o.end, film.films.c1o.end);
});
test("Tea dialogue substitutes player names after translation, including literal dollar signs", () => {
  const source = read("07t-episodes.js");
  const code = source.slice(source.indexOf("const epNk="), source.indexOf("const epOne="));
  const teaContext = vm.createContext({
    i18nStoryText: text => context.translate(text, "en"),
    i18nLang: () => "en",
    epMe: () => "player",
    EP_K: {M:"mei", Y:"yan", F:"ting"},
    WX_CHARS: {player:{nk:"$&", sx:"f"}}
  });
  vm.runInContext(code + ';this.say=epTx;', teaContext);
  assert.equal(teaContext.say("{名}也睡不著？那我們小聲玩一局，就一局！", "mei"),
    "Can't sleep either, $&? Let's play quietly. Just one game!");
  assert.equal(chinese.test(teaContext.say("睡吧睡吧，明天我跑腿叫{你}起床！", "mei")), false);
  teaContext.i18nLang = () => "tw";
  teaContext.i18nStoryText = text => text;
  assert.equal(teaContext.say("睡吧睡吧，明天我跑腿叫{你}起床！", "mei"),
    "睡吧睡吧，明天我跑腿叫妳起床！");
});
