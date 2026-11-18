// 11/17 iPhone 模擬器測試第 5 項（先查）：「第一章電影完整看完，下一步是『遠征補給』；按略過，下一步卻是『贏第一盤』（跟幻影棋客第 1 級下一整盤）」。
//   查到的原因：看完（07mnq mnqChapter → mnqTaskCard）和略過（mnfPlay 的任務卡 → mnqGo）用的是同一個 mnqNextOf(mnqSt(),mnqEnv())，電影本身沒有改任何狀態；
//   兩條路差在 mnqEnv 的 E.at（星槎停在哪一朝）讀的是存檔裡的 shipAt——它只在走進星槎頁、渡口、或 07t ep4Home（開 App 5 秒、切回前景 3 秒）呼叫 07f shipHere 時才寫。
//   新手練習建的旅程（07stq stqJourney：era＝家鄉、shipDock＝船艙＋家鄉）一開始 shipAt 是空的：電影看得久、中途切過畫面（visibilitychange）就被寫成家鄉＝遠征補給；
//   略過得快就還是空的＝跳過遠征補給、變成贏第一盤。不是設計，是漏接。
//   修法：shipAt 還沒寫時，改問首頁同一套的停靠朝代（07y hbDockEra＝07f shipAt()，只讀不寫）。兩條路一律是「遠征補給」（首頁本來就顯示停在家鄉那一朝）。
// 不開瀏覽器：vm 載入 07mnf／07mnv／07mnq，加上 05b、07f、07y 真正的 shipOrder／shipDockList／shipDocked／shipAt／shipEra／shipHere／hbDockEra 那幾行。
// 用法：node --test xiangqi-lab/tools/test-mnq-at-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), M = path.join(ROOT, "xiangqi-db", "m"), rd = f => fs.readFileSync(path.join(M, f), "utf8").replace(/\r\n/g, "\n");
const MNF = rd("07mnf-mainfilm.js"), MNV = rd("07mnv-mainvn.js"), MNQ = rd("07mnq-mainquest.js"), SAVE = rd("05b-save.js"), SHIP = rd("07f-ship.js"), HUB = rd("07y-hubmap.js");
const line = (src, head) => { const L = src.split("\n"), i = L.findIndex(l => l.startsWith(head)); assert.ok(i >= 0, "找得到 " + head); let j = i + 1; while (j < L.length && /^\s/.test(L[j])) j++; return L.slice(i, j).join("\n") };
const SHIPFN = [line(SAVE, "const SHIP_ROUTE="), line(SAVE, "function shipOrder("), line(SAVE, "function shipDockList("), line(SHIP, "const shipAppr="), line(SHIP, "function shipDocked("),
  line(SHIP, "function shipAt("), line(SHIP, "function shipEra("), line(SHIP, "function shipHere("), line(HUB, "function hbDockEra(")].join("\n");

/* 新手練習畢業的新玩家：預設角色齊轍、家鄉 weijin（07stq stqJourney 寫的鍵），授印禮領了、第一章三段都看完，還沒贏過電腦 */
function player(over) {
  const mem = Object.assign({ journey: { c: "x_swordboy", home: "weijin", v: 1, stq: 1 }, era: "weijin", shipDock: ["classic", "weijin"], mnq: { gift: { a1: 1, a6: {} }, seg: { c1o: 1, c1m: 1, c1e: 1 }, lamp: { classic: 1 } } }, over || {});
  const ctx = { store: { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } },
    esc: s => String(s), localStorage: { getItem: () => null }, console, WX_CHARS: { x_swordboy: { n: "齊轍" } }, CHAR_ERA: { x_swordboy: "weijin" },
    jHome: J => J && J.home, journey: () => mem.journey || null, myChar: () => (mem.journey || {}).c || "", eraLabel: e => ({ weijin: "魏晉", classic: "經典" })[e] || e, applyEra: () => { } };
  vm.createContext(ctx);
  const o = vm.runInContext(MNF + "\n" + MNV + "\n" + MNQ + "\n" + SHIPFN + "\n;({mnqEnv,mnqNextOf,mnqSt,shipHere})", ctx);
  return { o, mem, next: () => JSON.parse(JSON.stringify(o.mnqNextOf(o.mnqSt(), o.mnqEnv()))) };
}

test("〔行為〕shipAt 還沒寫（剛畢業、電影略過得快、沒逛過星槎）：下一步一樣是家鄉那一朝的遠征補給", () => {
  const P = player(); assert.equal(P.mem.shipAt, undefined, "存檔裡還沒有 shipAt");
  const n = P.next(); assert.equal(n.k, "gift"); assert.equal(n.g, "a6"); assert.equal(n.era, "weijin"); assert.equal(n.t, "遠征補給");
  assert.equal(P.mem.shipAt, undefined, "只讀不寫：算下一步不會順手改存檔");
});

test("〔行為〕看完（中途 shipHere 把 shipAt 寫成家鄉）和略過（沒寫）＝同一個下一步", () => {
  const A = player(); A.o.shipHere(); assert.equal(A.mem.shipAt, "weijin", "07f shipHere 會寫 shipAt");
  const B = player();
  assert.deepEqual(A.next(), B.next(), "兩條路一樣");
});

test("〔照舊〕存檔有 shipAt 就照它；領過那一朝的補給、或還沒贏過才是贏第一盤；沒有旅程的人不受影響", () => {
  const P = player({ shipAt: "classic" }); assert.deepEqual(P.next(), { k: "cpu", t: "贏第一盤" }, "停在雲河船艙：沒有遠征補給");
  const Q = player({ mnq: { gift: { a1: 1, a6: { weijin: 1 } }, seg: { c1o: 1, c1m: 1, c1e: 1 }, lamp: { classic: 1 } } });
  assert.deepEqual(Q.next(), { k: "cpu", t: "贏第一盤" }, "家鄉的補給領過了");
  const R = player({ journey: null, era: "tang" }); assert.equal(JSON.parse(JSON.stringify(R.o.mnqEnv())).at, "", "沒有旅程：hbDockEra 回空字串，跟以前一樣");
});

test("〔原始碼〕楔子看完、略過都走同一個結尾（11/18 起回首頁 mnqC1Done，不再出「下一步」卡）；E.at 先讀存檔、沒有才問 hbDockEra", () => {
  assert.ok(MNQ.includes("if(!lastSeg)return play(j+1);fin()}})};"), "看完、略過都 fin()");
  assert.ok(MNQ.includes("fin=()=>{mnfMusicStop(1);mnqC1Done()}"));
  assert.ok(MNQ.includes('E.at=store.get("shipAt",null)||(typeof hbDockEra==="function"?hbDockEra():"")||""'));
});
