// W62（11/22）門派任務版英文：派名、定式名、掌門、門下棋友內建英譯 OSC_EN0，外掛字典還沒下載也是英文
//   背景：字典（data/i18n-en.json，約 1 MB）還沒到就畫好的畫面，會把中文派名嵌進英文句子（「The 屏風馬門 challenges you」），
//   字典到了重翻整段也翻不回來。OSC_EN0 由 gen-osc-en0.js 照字典正本產生，oscT 先查它。
// 用法：node --test xiangqi-lab/tools/test-osc-en0.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const SCH = fs.readFileSync(path.join(ROOT, "xiangqi-db/m/07z9-school.js"), "utf8");
const G = require("./gen-osc-en0.js");
const CJK = /[一-鿿]/;

/* 載入 osc-core＋oscEn…oscSchE 那一段；i18nText 一律回 null＝外掛字典還沒下載 */
function load(lang) {
  const c = { i18nLang: () => lang, i18nText: () => null };
  vm.createContext(c);
  const core = SCH.slice(SCH.indexOf("const OSC=(()=>{"), SCH.indexOf("/* ===== END osc-core"));
  const fns = SCH.slice(SCH.indexOf("const oscEn="), SCH.indexOf("const oscTitleE="));   /* oscEn、OSC_PC1、OSC_EN0、oscT、oscNmE、oscTaE、oscSchE（後兩個只定義、這裡不呼叫的不用補依賴） */
  vm.runInContext(core + "\n" + fns + ";this.R={OSC,OSC_EN0,oscT,oscSchE};", c);
  return c.R;
}

test("內建表完整：門派資料裡要翻的每個中文字串（派、掌門、門人、風格標籤）都有英譯，而且不是中文", () => {
  const R = load("en"), keys = [...new Set([...G.collectKeys(R.OSC), ...Object.keys(G.MANUAL)])];
  const miss = keys.filter(k => !Object.prototype.hasOwnProperty.call(R.OSC_EN0, k) || CJK.test(R.OSC_EN0[k]));
  /* 原始碼「張三丰」在頁面上會變成「豐」，兩種寫法收成同一筆，所以允許少一筆重複；其餘一筆都不能少 */
  assert.deepEqual(miss.filter(k => !(k === "張三丰" && R.OSC_EN0["張三豐"])), [], "這些要重跑 gen-osc-en0.js（新增的門人、改了派別文案）：" + miss.join("、"));
  assert.ok(Object.keys(R.OSC_EN0).length >= 140, "十派＋十位掌門＋門下棋友至少 140 條：" + Object.keys(R.OSC_EN0).length);
});

test("字典還沒下載、英文模式：派名、定式名、口號、門人都是英文（W62 的病灶：The 屏風馬門 challenges you）", () => {
  const R = load("en");
  assert.equal(R.oscT("屏風馬門"), "Screen Horses School");
  assert.equal(R.oscT("中炮"), "Central Cannon");
  assert.equal(R.oscT("張三豐"), "Zhang Sanfeng");
  assert.equal(R.oscT("想主動"), "Want to attack");
  for (const S of R.OSC.SCH) {
    const E = R.oscSchE(S.id);
    for (const k of ["nm", "op", "say", "who"]) assert.ok(!CJK.test(E[k]), `${S.id}.${k} 還是中文：${E[k]}`);
  }
  for (const m of R.OSC.MST) assert.ok(!CJK.test(R.oscT(m.who)), `掌門 ${m.id} 的身世還是中文`);
  for (const x of Object.values(R.OSC.NPC)) assert.ok(!CJK.test(R.oscT(x[2])), `門人 ${x[2]} 還是中文`);
});

test("中文模式不受影響：oscT 原樣回傳", () => {
  const R = load("zh");
  assert.equal(R.oscT("屏風馬門"), "屏風馬門");
  assert.equal(R.oscSchE("screen").nm, R.OSC.sch("screen").nm);
});

test("〔原始碼〕oscT 先查單字棋子、再查 OSC_EN0、最後才用外掛字典；OSC_EN0 註明由 gen-osc-en0.js 產生", () => {
  assert.match(SCH, /const oscT=s=>\{if\(!s\|\|!oscEn\(\)\)return s;if\(OSC_PC1\[s\]\)return OSC_PC1\[s\];if\(Object\.prototype\.hasOwnProperty\.call\(OSC_EN0,s\)\)return OSC_EN0\[s\];/);
  assert.match(SCH, /^const OSC_EN0=\{.*\};\s+\/\* W62：門派英譯內建（gen-osc-en0\.js 產生，勿手改）/m);
});

test("〔混合〕Pikafish 盤整 P2（11/24）走錯吃虧著：反駁線真的丟子（bad.x 有值）才說「會丟子」；沒丟子換說位置變差、出子變慢，中英都有", () => {
  /* 取出 07z9-school 裡 hurt＝… 那一句，用假的 oscL 跑（中文、英文各一次） */
  const m = SCH.match(/hurt=([^;]*?);/);
  assert.ok(m, "找不到 hurt 那一句");
  const run = (x, en) => vm.runInNewContext("(" + m[1] + ")", { bad: { x }, oscL: (zh, e) => (en ? e : zh) });
  assert.match(run("N", false), /丟子/);
  assert.doesNotMatch(run("", false), /丟子|吃虧/, "沒丟子不能說吃虧或丟子");
  assert.match(run("", false), /位置變差/);
  assert.ok(!CJK.test(run("", true)) && run("", true).length > 10, "英文：" + run("", true));
  assert.notEqual(run("N", true), run("", true));
});
