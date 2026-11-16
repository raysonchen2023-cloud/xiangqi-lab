// 11/17 iPhone 模擬器測試第 3 項：「把象棋千秋加到主畫面？」在新手教學第一步之前就跳出來，打斷新玩家。
//   修法（02-shell 自動問那一行）：新手練習（07stq）還沒畢業、也還沒按「我會下棋」（stqHold＝存檔 st:"run"），或練習頁 #stqPg 還開著＝先不問，
//   每 4 秒再看一次、不算進原本「最多等 3 分鐘」的次數；練習頁關了才照原本的規矩（開頭畫面、視窗、卡片開著就等）。
// 不開瀏覽器：把 02-shell 那一行切出來，用假的 store、document、時鐘實際跑。用法：node --test xiangqi-lab/tools/test-inst-stq-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const SH = rd("xiangqi-db/m/02-shell.js");
const LINE = SH.split("\n").find(l => l.startsWith("if(OFF&&!isStandalone()&&/iPhone|iPad|Android/.test(MY_KIND)){let instTry=0;const instAsk="));
assert.ok(LINE, "02-shell 找得到自動問的那一行");

/* 假環境：clock＝毫秒；W.hold＝練習中；W.pg＝練習頁開著；W.modal＝有視窗 */
function run(W, until) {
  let now = 0; const Q = [], asked = [];
  const env = {
    OFF: true, MY_KIND: "iPhone", isStandalone: () => false, installGuide: m => asked.push(now),
    store: { get: (k, d) => k === "instAsk" ? (W.ia || d) : d },
    stqHold: () => W.hold(now),
    document: { querySelector: s => (s.split(",").includes(".modal") && W.modal && W.modal(now)) || (s.split(",").includes(".sw7-slip") && W.slip && W.slip(now)) ? {} : null, getElementById: id => id === "stqPg" && W.pg && W.pg(now) ? {} : null, body: { classList: { contains: () => false } } },
    setTimeout: (f, ms) => Q.push({ at: now + ms, f }), Date: { now: () => now }
  };
  const names = Object.keys(env);
  new Function(...names, LINE)(...names.map(k => env[k]));
  while (Q.length) { Q.sort((a, b) => a.at - b.at); const q = Q.shift(); if (q.at > until) break; now = q.at; q.f() }
  return asked;
}

test("〔行為〕新手練習中（還沒畢業、沒按我會下棋）不跳；練了 10 分鐘也不會因為等太久就放棄，畢業後才問", () => {
  const asked = run({ hold: t => t < 600000 }, 900000);
  assert.equal(asked.length, 1, "畢業後問一次");
  assert.ok(asked[0] >= 600000 && asked[0] <= 604000, "畢業後 4 秒內照原本的規矩問（" + asked[0] + "）");
});

test("〔行為〕練習頁還開著（畢業畫面、出發前）也先不問", () => {
  const asked = run({ hold: () => false, pg: t => t < 30000 }, 60000);
  assert.equal(asked.length, 1); assert.ok(asked[0] >= 30000, "練習頁關了才問");
});

test("〔照舊〕不是新手練習（老玩家、沒有 07stq）：開 App 2.5 秒就問", () => {
  assert.deepEqual(run({ hold: () => false }, 10000), [2500]);
});

test("〔照舊〕別的視窗一直開著：最多等 3 分鐘（45 次）就不問了；說過不用就不問", () => {
  assert.deepEqual(run({ hold: () => false, modal: () => true }, 600000), []);
  assert.deepEqual(run({ hold: () => false, modal: t => t < 20000 }, 600000).length, 1);
  assert.deepEqual(run({ hold: () => true, ia: { no: true } }, 600000), []);
});

test("〔原始碼〕stqHold 先問、再看視窗；07stq 的 stqHold 就是練習中（st:run）", () => {
  assert.ok(LINE.includes('if((typeof stqHold==="function"&&stqHold())||document.getElementById("stqPg")){setTimeout(instAsk,4000);return}'));
  assert.ok(LINE.indexOf("stqHold()") < LINE.indexOf('document.querySelector(".modal,.sw7-slip")'), "練習中的等待不算進 instTry");
  assert.ok(rd("xiangqi-db/m/07stq-starter.js").includes('function stqHold(){if(!STQ_ON)return false;const S=stqSt0();return!!(S&&S.st==="run")}'));
});
