// W80 開局的來處（開發者 11/23：「剛剛跟門下棋友對戰，按返回後，不是回到門派，請修正類似的出入口問題」）
//   07-legend.js 的 jRetSet／jRetOf／jRetTake／jBack／jPlace：vm 跑真的那一段（jBack0／jPlace0＝原本的目的地，這裡用假的代表）。
//   檢查：從門派開局，返回鍵和結束視窗回門派；「再下一盤」還是回門派；之後從渡口、驛站開局，照舊回渡口、驛站；12 小時後失效；
//   加上原始碼檢查：jStart 第一件事核對來處；對局頁頂端返回鍵先看來處；四個入口（門下棋友三種、挑戰掌門、踢館、守中宮）開局前都登記來處。
// 用法：node --test xiangqi-lab/tools/test-jret-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const LEG = rd("xiangqi-db/m/07-legend.js");
const SEG = (() => { const a = LEG.indexOf("let JRET_ARM=null;"), b = LEG.indexOf("const jBack0="); assert.ok(a > 0 && b > a, "找得到 W80 那一段"); return LEG.slice(a, b) })();

function load() {
  const mem = {}, clock = { t: 1_800_000_000_000 };
  const c = {
    store: { get: (k, d) => (k in mem && mem[k] != null ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    location: { hash: "#/jianghu/hall/central" },
    navKey: (h) => String(h || "").replace(/^#/, "").split("?")[0],
    Date: class extends Date { static now() { return clock.t } }, JSON, String,
  };
  vm.createContext(c);
  vm.runInContext("const jBack0=j=>j===\"park\"?\"#/port\":String(j).startsWith(\"inn:\")?\"#/journey/inn\":\"#/shelf/1\";const jPlace0=j=>j===\"park\"?\"渡口\":String(j).startsWith(\"inn:\")?\"驛站\":\"石桌往事\";\n"
    + SEG + "\n;this.T={jRetSet,jRetOf,jRetTake,jBack,jPlace};", c);
  return { T: c.T, c, mem, clock };
}

test("從門派前院找園子棋友開局：返回鍵、結束視窗「回 ○○」都回門內頁；沒登記的照舊回渡口", () => {
  const { T, c } = load();
  assert.equal(T.jBack("park"), "#/port"); assert.equal(T.jPlace("park"), "渡口");
  T.jRetSet("park", "#/jianghu/hall/central", "中炮門"); T.jRetTake("park");
  c.location.hash = "#/journey/play";
  assert.equal(T.jBack("park"), "#/jianghu/hall/central"); assert.equal(T.jPlace("park"), "中炮門");
  assert.equal(T.jBack("inn:3"), "#/journey/inn", "別的旅程不受影響");
});

test("在對局頁「再下一盤」（同一個代號、沒有重新登記）：還是回門派", () => {
  const { T, c } = load();
  T.jRetSet("inn:7", "#/jianghu/hall/horse", "起馬門"); T.jRetTake("inn:7");
  c.location.hash = "#/journey/play"; T.jRetTake("inn:7");
  assert.equal(T.jBack("inn:7"), "#/jianghu/hall/horse");
});

test("之後從渡口或驛站自己開局（沒有登記）：紀錄清掉，照舊回渡口、驛站", () => {
  const A = load(); A.T.jRetSet("park", "#/jianghu/hall/central", "中炮門"); A.T.jRetTake("park");
  A.c.location.hash = "#/port"; A.T.jRetTake("park");
  assert.equal(A.T.jBack("park"), "#/port", "同一個代號、從渡口開＝清掉");
  const B = load(); B.T.jRetSet("park", "#/jianghu/hall/central", "中炮門"); B.T.jRetTake("park");
  B.c.location.hash = "#/journey/inn"; B.T.jRetTake("inn:2");
  assert.equal(B.T.jBack("park"), "#/port", "別的代號開局＝清掉");
});

test("紀錄 12 小時後失效；網址不是 #/ 開頭的不採用", () => {
  const { T, clock } = load();
  T.jRetSet("park", "#/jianghu/hall/central", "中炮門"); T.jRetTake("park");
  clock.t += 11 * 3600e3; assert.equal(T.jBack("park"), "#/jianghu/hall/central");
  clock.t += 2 * 3600e3; assert.equal(T.jBack("park"), "#/port");
  const B = load(); B.T.jRetSet("park", "javascript:alert(1)", "x"); B.T.jRetTake("park"); assert.equal(B.T.jBack("park"), "#/port");
});

test("〔原始碼〕jStart 第一件事核對來處；對局頁頂端返回鍵先看來處（園子原本寫死回渡口）", () => {
  assert.match(LEG, /async function jStart\(id,b,go,force\)\{jRetTake\(id\);/);
  const cg = rd("xiangqi-db/m/08b-cpugame.js");
  assert.ok(cg.indexOf("jRetOf(st.journey)?\"^\"+jRetOf(st.journey).back") > 0 && cg.indexOf("jRetOf(st.journey)?\"^\"") < cg.indexOf("st.journey===\"park\"?\"^#/port\""), "先看來處，再看園子回渡口");
});

test("返回鍵的字：十州棋館、門內頁、門派修行的網址，bkName 問 jhRetPlace（門內頁寫派名「回中炮門」，不是「返回」）", () => {
  const sh = rd("xiangqi-db/m/02-shell.js"), m = sh.match(/function bkName\(h\)\{[\s\S]*?\n  let n="";[^\n]*\n/);
  assert.ok(m, "找得到 bkName");
  const c = { navKey: (h) => String(h).replace(/^#/, ""), BK_NAME: [["/port", "渡口"]], usePlace: () => "", xqHubName: () => "",
    jhRetPlace: (h) => (/hall\/central/.test(h) ? "中炮門" : /^#\/jianghu/.test(h) ? "十州棋館" : /^#\/school/.test(h) ? "門派修行" : "") };
  vm.createContext(c); vm.runInContext(m[0] + ";this.bkName=bkName;", c);
  assert.equal(c.bkName("#/jianghu/hall/central"), "中炮門"); assert.equal(c.bkName("#/jianghu"), "十州棋館"); assert.equal(c.bkName("#/school/x_swordboy"), "門派修行");
  assert.equal(c.bkName("#/port"), "渡口", "其他頁照舊");
});

test("〔原始碼〕四個入口開局前都登記來處：門下棋友（園子、驛站、秘境）、挑戰掌門、十州踢館、屏風馬守中宮", () => {
  const jh = rd("xiangqi-db/m/07z9b-jianghu.js"), sc = rd("xiangqi-db/m/07z9-school.js"), sr = rd("xiangqi-db/m/07z9c-screen.js");
  assert.match(jh, /ret\("park"\);jStart\("park"/); assert.equal((jh.match(/ret\("inn:"\+x\.id\);jStart\("inn:"\+x\.id/g) || []).length, 2, "驛站、秘境");
  assert.match(jh, /jhMatePlay\(M,sid\)/, "互動卡把是哪一派傳進去");
  assert.match(jh, /jhRetHere\("inn:"\+m\.id\);jStart\("inn:"\+m\.id,jhKickArgs/);
  assert.match(sc, /jhRetHere\("inn:"\+m\.id\);[^\n]*\n  jStart\("inn:"\+m\.id,zmArgs/);
  assert.match(sr, /jRetSet\(JH_SCR_J,"#\/jianghu\/hall\/screen"/);
});
