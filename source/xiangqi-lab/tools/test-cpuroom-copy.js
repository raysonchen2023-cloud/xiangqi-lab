// 11/12 ChatGPT 練功房文案檢查（story/chatgpt_app/106_練功房文案檢查_ChatGPT回覆.md）5 條，開發者核准照改：
// 1 晉級賽警告改短；2、3 第一次進雅間用一次性短暫泡泡指卷軸、名牌；4 段位牌寫「差 N 分升段」；5 卷軸、名牌、段位牌螢幕報讀說出用途與狀態。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const S = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07z5-cpuroom.js"), "utf8");

/* ---- 2、3：crTips 用假的 store、tmxBub、setTimeout 實際跑 ---- */
const tipsSrc = (S.match(/function crTips\(P\)\{[\s\S]*?\n  one\("crTipScroll"[^\n]*\}/) || [])[0];
function runTips({ ranked = false, seen = {}, hidden = {}, bubbleOpen = false } = {}) {
  const shown = [], st = Object.assign({}, seen);
  const el = id => ({ id, style: { display: hidden[id] ? "none" : "" }, getClientRects: () => hidden[id] ? [] : [1] });
  const P = { isConnected: true, querySelector: q => el(q.slice(1)) };
  const env = {
    store: { get: (k, d) => k in st ? st[k] : d, set: (k, v) => { st[k] = v } },
    tmxBub: (e, h) => { shown.push([e.id, h]); return true }, esc: s => s, crRanked: () => ranked,
    setTimeout: f => f(), document: { querySelector: () => bubbleOpen ? {} : null }
  };
  new Function(...Object.keys(env), tipsSrc + "\ncrTips(arguments[arguments.length-1]);")(...Object.values(env), P);
  return { shown, st };
}

test("〔混合〕第一次進雅間：先指卷軸「點卷軸換難度」，再指名牌「點名牌換對手」", () => {
  assert.ok(tipsSrc, "07z5-cpuroom.js 找不到 crTips");
  const r = runTips();
  assert.deepStrictEqual(r.shown, [["crScroll", "點卷軸換難度"], ["crOpp", "點名牌換對手"]]);
  assert.strictEqual(r.st.crTipScroll, true); assert.strictEqual(r.st.crTipOpp, true);
});
test("〔混合〕看過一次就不再出現（各自只一次）", () => {
  assert.deepStrictEqual(runTips({ seen: { crTipScroll: true, crTipOpp: true } }).shown, []);
  assert.deepStrictEqual(runTips({ seen: { crTipScroll: true } }).shown, [["crOpp", "點名牌換對手"]]);
});
test("〔混合〕晉級賽不換難度、不換對手，不提示也不記成看過", () => {
  const r = runTips({ ranked: true });
  assert.deepStrictEqual(r.shown, []); assert.ok(!r.st.crTipScroll && !r.st.crTipOpp);
});
test("〔混合〕卷軸藏起來、或別的泡泡／面板開著，就先不提示（下次再說）", () => {
  const a = runTips({ hidden: { crScroll: true } });
  assert.deepStrictEqual(a.shown, [["crOpp", "點名牌換對手"]]); assert.ok(!a.st.crTipScroll, "沒顯示就不能記成看過");
  assert.deepStrictEqual(runTips({ bubbleOpen: true }).shown, []);
});

/* ---- 4、5：段位牌文字與螢幕報讀、卷軸螢幕報讀（從 crPaint 抽出那兩個區塊實際跑） ---- */
const rankSrc = (S.match(/\{const rb=P\.querySelector\("#crRank"\)[\s\S]*?按下看詳細"\)\}/) || [])[0];
const scrollSrc = (S.match(/\{const sb=P\.querySelector\("#crScroll"\)[^\n]*/) || [])[0];
function runPlate(CR, lv = 6, passed = false) {
  const attrs = {}, b = { textContent: "" };
  const node = id => ({ querySelector: () => b, setAttribute: (k, v) => { attrs[id + ":" + k] = v } });
  const P = { querySelector: q => node(q.slice(1)) };
  new Function("P", "CR", "lv", "crPassed", rankSrc + scrollSrc)(P, CR, lv, () => passed);
  return { text: b.textContent, rankAria: attrs["crRank:aria-label"], scrollAria: attrs["crScroll:aria-label"] };
}
test("〔混合〕段位牌寫「差 N 分升段」，螢幕報讀念出分數與下一段", () => {
  assert.ok(rankSrc && scrollSrc, "07z5-cpuroom.js 找不到段位牌或卷軸的區塊");
  const r = runPlate({ rank: "業餘2級", pts: 450, next: "業餘3級", toNext: 16 });
  assert.strictEqual(r.text, "🏅 業餘2級・差 16 分升段");
  assert.strictEqual(r.rankAria, "段位牌：業餘2級，450 分，還差 16 分升「業餘3級」，按下看詳細");
});
test("〔混合〕最高段位、還沒有段位的新手", () => {
  assert.strictEqual(runPlate({ rank: "特級大師", pts: 2600 }).text, "🏅 特級大師・最高段位");
  assert.strictEqual(runPlate({}).text, "🏅 新手");
});
test("〔混合〕卷軸螢幕報讀說出用途與目前難度、通關", () => {
  assert.strictEqual(runPlate({}, 6, true).scrollAria, "卷軸，按下可換難度，目前第 6 級，已通關");
  assert.strictEqual(runPlate({}, 3, false).scrollAria, "卷軸，按下可換難度，目前第 3 級");
});
test("〔原始碼〕名牌螢幕報讀說出用途與目前對手；晉級賽說固定對手", () => {
  assert.match(S, /"名牌，晉級賽固定對手：幻影棋客":"名牌，按下可換對手，目前對手："/);
});
test("〔原始碼〕晉級賽警告改成新字，進雅間時呼叫一次性提示", () => {
  assert.match(S, /const CR_RULE="可回來續下；若未下完就另開新局，原局判負。"/);
  assert.match(S, /crPaint\(P\);crState\(\)\.then\(\(\)=>\{if\(P\.isConnected\)crPaint\(P\)\}\);crTips\(P\);/);
});
