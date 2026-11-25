/* 11/25 W120：延遲執行稽核的中、低約 40 處。開發者：「前面你掃到的中和低也要一併修正才能送審」。
   共用工具 stillHere(ms,fn,ok)（m/00-util.js）：排好晚一點才做的事，到時先確認還在原來那一頁（換頁計數 ROUTE_N、網址都沒變），ok() 再加自己的條件，都成立才做。
   各處改成用它（或剛改網址的地方用自己的檢查），讓彈窗、吐司、特效、跳頁不會出現在錯的畫面；獎勵、存檔的寫入時機不動（本命星改成當下寫）。
   stillHere 抽出來在 vm 跑（行為）；各處有沒有接上用原始碼比對（標〔原始碼〕） */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const UTIL = M("00-util.js");

function kit() {
  const a = UTIL.indexOf("function stillHere("), b = UTIL.indexOf("\n", a);
  assert.ok(a > 0 && b > a, "抓得到 stillHere");
  const timers = [], warns = [];
  const c = { ROUTE_N: 5, location: { hash: "#/cpu" }, console: { warn: (...x) => warns.push(x) }, setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length } };
  vm.createContext(c); vm.runInContext(UTIL.slice(a, b) + ";this.stillHere=stillHere;", c);
  return { c, timers, warns, run: () => timers.shift().f() };
}

test("還在原來那一頁：到時照做", () => {
  const K = kit(); let n = 0;
  K.c.stillHere(700, () => n++); assert.equal(K.timers[0].ms, 700); K.run();
  assert.equal(n, 1);
});

test("換過頁（換頁計數變了）：不做", () => {
  const K = kit(); let n = 0;
  K.c.stillHere(700, () => n++); K.c.ROUTE_N = 6; K.run();
  assert.equal(n, 0);
});

test("網址變了（還沒觸發換頁計數）：不做", () => {
  const K = kit(); let n = 0;
  K.c.stillHere(700, () => n++); K.c.location.hash = "#/db"; K.run();
  assert.equal(n, 0);
});

test("額外條件 ok() 不成立：不做；成立：做", () => {
  const K = kit(); let n = 0, moves = 0;
  K.c.stillHere(350, () => n++, () => moves === 0); moves = 2; K.run(); assert.equal(n, 0, "已經走子了");
  K.c.stillHere(350, () => n++, () => moves === 2); K.run(); assert.equal(n, 1);
});

test("要做的事出錯：不會往外丟（不讓整頁壞掉），但主控台留警告", () => {
  const K = kit();
  K.c.stillHere(100, () => { throw new Error("壞了") });
  assert.doesNotThrow(() => K.run()); assert.equal(K.warns.length, 1); assert.equal(K.warns[0][0], "stillHere");
});

test("〔原始碼〕延遲稽核的中、低各處都有接上檢查", () => {
  const need = {
    "10b-libmap.js": /stillHere\(700,/, "07h-qqev.js": /stillHere\(1400,\(\)=>relicDrop\(/, "07i2-seal.js": /sealGoldToast/, "07z9c-screen.js": /jhScrSame\(st\)/,
    "02r-reloadguard.js": /rlgStale\(/, "07dgl-stamina.js": /stillHere\(1800,/, "07mnf-mainfilm.js": /MNF_QMAX/, "06c-cup.js": /ROUTE_N/,
    "07gxd-daily.js": /function gxdSoon\(/, "07q-chardiff.js": /stillHere\(3000,\(\)=>\{try\{if\(!ok\)/, "07bhg-gatesiege.js": /function gsvStill\(/,
    "07-legend.js": /stillHere\(/, "09b-preload.js": /stillHere\(300,/, "08b-cpugame.js": /stampFx\(e1\)/, "01-board.js": /stillHere\(200,\(\)=>checkFx\(svg,lab\),fxOk\)/,
    "07z9-school.js": /stillHere\(1500,/,
    "07pty-party.js": /function ptyJoinFlush\(\)\{.*ptyJoinSafe\(\)/,   /* 開發者選「到下一個安全的頁再補播」：七星加入過場換頁時記下來，到安全頁補播 */
    "05b-save.js": /function jPlayOk\(/
  };
  assert.doesNotMatch(M("07pty-party.js"), /ptyJoinGone\(at\)\)return ptyJoinToast/, "七星加入過場換頁時要記下來補播，不是只出吐司");
  /* #177 審查補：所有模組都不准再用 setTimeout 包 addXP（記號先寫、修為延後才發，期間關 App 會永久少發）；要延後的只有小標籤，用 addXP 的 chipDelay */
  const DIR = path.join(ROOT, "xiangqi-db", "m"), bad = [];
  for (const f of fs.readdirSync(DIR).filter(x => x.endsWith(".js"))) if (/setTimeout\(\(\)=>\{?(?:try\{)?(?:if\(typeof addXP==="function"\))?addXP\(/.test(M(f))) bad.push(f);
  assert.deepEqual(bad, [], "還有 setTimeout 包 addXP：" + bad.join("、"));
  for (const [f, re] of Object.entries(need)) assert.match(M(f), re, f + " 沒接上");
  assert.doesNotMatch(M("07q-chardiff.js"), /\},3000\)\}/, "本命挑戰的 stillHere 不要多帶第三個參數 3000");
  assert.match(rd("xiangqi-lab/src/park3d.js"), /endOk\(\)/, "park3d 隊友賽後說話先確認同一盤");
});

/* #178 審查（iMac Claude 1）：玩家執黑時電腦先走一步，開局那句、對手招呼不該因為電腦那一步被吃掉（比照 #176 的 klim：執黑容許 1 步） */
function talkKit() {
  const SAVE = M("05b-save.js"), a = SAVE.indexOf("function meGameTalk("), b = SAVE.indexOf("\n/* 園子路人打招呼", a);
  assert.ok(a > 0 && b > a, "抓得到 meGameTalk");
  const timers = [], said = [];
  const c = {
    ROUTE_N: 3, location: { hash: "#/play" }, console, Math: { random: () => 1 },
    myChar: () => "x", WX_CHARS: { x: { start: ["開局了"], cap: ["吃"] } }, pickOne: a => a[0],
    BOT: { say: t => said.push(t) },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length }
  };
  vm.createContext(c);
  vm.runInContext("var PLAY_NOW=null,ME_HI=null,ME_CAP=null;" + UTIL.slice(UTIL.indexOf("function stillHere("), UTIL.indexOf("\n", UTIL.indexOf("function stillHere("))) + "\n" + SAVE.slice(a, b) + ";this.meGameTalk=meGameTalk;", c);
  const board = Array(90).fill(null).map((_, i) => i < 16 ? "r" : i > 73 ? "R" : null);
  return { c, timers, said, board, run: () => { const t = timers.shift(); if (t) t.f() } };
}

test("執黑：電腦先走了一步，2.4 秒後開局那句照樣說", () => {
  const K = talkKit(), st = { id: "g1", human: "b", moves: [], board: K.board, result: null };
  K.c.meGameTalk(st);
  st.moves = ["h2e2"]; K.c.meGameTalk(st);                 /* 電腦先走 */
  K.run(); assert.deepEqual(K.said, ["開局了"]);
});

test("執黑：已經走到第 2 步（玩家也走了）就不說；執紅：電腦或玩家走了一步就不說", () => {
  const K = talkKit(), st = { id: "g2", human: "b", moves: [], board: K.board, result: null };
  K.c.meGameTalk(st); st.moves = ["h2e2", "h9g7"]; K.c.meGameTalk(st); K.run();
  assert.deepEqual(K.said, []);
  const K2 = talkKit(), s2 = { id: "g3", human: "r", moves: [], board: K2.board, result: null };
  K2.c.meGameTalk(s2); s2.moves = ["h2e2"]; K2.c.meGameTalk(s2); K2.run();
  assert.deepEqual(K2.said, []);
});

test("〔原始碼〕練功房對手招呼：執黑容許電腦先走的那 1 步", () => {
  assert.match(M("08b-cpugame.js"), /stillHere\(900,\(\)=>\{try\{if\(PARK&&PARK\.host===hb\)PARK\.v\.oppSay\(.*?\},\(\)=>!!st&&st\.id===g1&&st\.moves\.length<=\(st\.human==="b"\?1:0\)&&!st\.result\)/);
});
