// 開發者 11/16：「目前已經沒辦法新的旅程了嗎 假設有其他玩家想重玩的話 應該還是要跟存檔讀檔的格子」
// 查到的現況：新的旅程一直跟三格存檔綁在一起（開頭畫面「⚔ 新的旅程」→ 選一格 → 從開頭序局開始），沒有被拿掉；
//   但 App 裡面的入口只剩「💾 存檔與讀檔」面板裡空格上的「在這格開始新的旅程」——三格都有存檔時就沒有按鈕；
//   原本「我的角色」頁「🔒 旅程」面板有「回開頭畫面」，11/16 七星改版後那顆改開卡冊，也走不到了，只剩把 App 整個關掉重開才看得到開頭畫面。
// 修：m/05b-save.js saveList 在面板最下面補一顆不管幾格有存檔都在的「⚔ 開始新的旅程（選一格來存）」，開開頭畫面的選格頁
//   （空格「用這格」、有存檔的「覆蓋這格」要再確認），跟開頭畫面的「⚔ 新的旅程」同一條路。開頭畫面裡的那個面板不放（那裡本來就有）。
// 這裡把 saveList 從原始碼抽出來配假的面板跑；畫面在本機候選版手機尺寸看過。
// 用法：node --test xiangqi-lab/tools/test-newjourney-entry-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "05b-save.js"), "utf8").replace(/\r\n/g, "\n");
const i0 = SRC.indexOf("function saveList(box,inTitle){"), i1 = SRC.indexOf("function saveSheet(){"), FN = SRC.slice(i0, i1);

function run(metas, inTitle) {
  const log = { title: [], closed: 0 }, el = {};
  const box = { html: "", set innerHTML(v) { this.html = v }, get innerHTML() { return this.html },
    querySelector(s) { if (s === "[data-nj]") return this.html.includes('data-nj="1"') ? (el.nj = el.nj || {}) : null; if (s === "[data-tm]") return this.html.includes('data-tm="1"') ? (el.tm = el.tm || {}) : null; return null }, querySelectorAll() { return [] } };
  const ctx = { slotMetaAll: () => metas, slotMetaLive: M => M,   /* 11/17 第 18 輪：使用中那一格照當下算（test-r18-1117.js 測），這裡照原樣 */
    curSlot: () => 1, journey: () => ({ c: "x_swordboy" }), store: { get: (k, d) => d }, fmtAt: () => "", vibrate() { }, esc: s => String(s), saveNow: () => { log.saved = (log.saved || 0) + 1 },
    slotCardHTML: (n, m, me) => `<div class="slot" data-n="${n}">${m ? m.nm : "空"}${me ? "（使用中）" : ""}</div>`, closeSheet: () => { log.closed++ }, titleScreen: o => log.title.push(o), setTimeout: f => f(), Date };
  vm.createContext(ctx); vm.runInContext(FN + ";this.saveList=saveList", ctx); ctx.saveList(box, !!inTitle); return { html: box.html, el, log };
}
const A = { nm: "齊轍", pc: "俥", lv: 3, sec: 60 };

test("〔原始碼〕找得到存檔面板那一段", () => { assert.ok(i0 > 0 && i1 > i0) });

test("〔行為〕三格都有存檔時，面板最下面也有「開始新的旅程」；點了關掉面板、開開頭畫面的選格頁（空格用這格、有存檔的要確認才覆蓋）", () => {
  const R = run({ 1: A, 2: A, 3: A });
  assert.ok(R.html.includes('<div class="sv-a"><button data-nj="1">⚔ 開始新的旅程（選一格來存）</button><button data-tm="1">↩ 回開頭畫面</button></div>'));
  assert.ok(!R.html.includes('data-sa="new"'), "三格都滿：原本空格上的那顆按鈕一顆都沒有，這就是原本走不到的情況");
  assert.equal(typeof R.el.nj.onclick, "function"); R.el.nj.onclick();
  assert.equal(R.log.closed, 1); assert.deepEqual(JSON.parse(JSON.stringify(R.log.title)), [{ view: "slots", mode: "new" }]);
});

test("〔行為〕有空格時兩種入口都在：空格上的「在這格開始新的旅程」照舊，最下面那一顆也在", () => {
  const R = run({ 1: A });
  assert.equal((R.html.match(/data-sa="new"/g) || []).length, 2, "第 2、3 格是空的"); assert.ok(R.html.includes('data-nj="1"'));
  assert.ok(R.html.lastIndexOf('data-nj="1"') > R.html.lastIndexOf('data-sa="new"'), "新的那一顆在三格的下面");
});

test("〔行為〕開頭畫面裡的存檔面板不放這一顆（那裡本來就有「⚔ 新的旅程」），只有「返回」", () => {
  const R = run({ 1: A, 2: A, 3: A }, true);
  assert.ok(!R.html.includes("data-nj") && !R.html.includes("data-tm") && R.html.includes('data-tb="menu">‹ 返回</button>'));
});

test("〔行為〕11/16 開發者「或是開頭畫面」：存檔面板最下面多一顆「↩ 回開頭畫面」，點了先存一次、關掉面板、開開頭畫面的選單", () => {
  const R = run({ 1: A });
  assert.equal(typeof R.el.tm.onclick, "function"); R.el.tm.onclick();
  assert.equal(R.log.saved, 1, "先存一次"); assert.equal(R.log.closed, 1); assert.deepEqual(JSON.parse(JSON.stringify(R.log.title)), [{}]);
});

test("〔原始碼〕選格頁照舊：空格「用這格」、有存檔的「覆蓋這格」先問「清掉並開始」；新的旅程一律從開頭的序局來", () => {
  assert.ok(SRC.includes('<p class="xqt-h">新的旅程要存在哪一格？</p>') && SRC.includes('<button data-ns="${n}" class="warn">覆蓋這格</button>') && SRC.includes('<button data-ns="${n}" class="main">用這格</button>'));
  assert.ok(SRC.includes('[["清掉並開始",()=>titlePaint("pick",{mode:"new",slot:n,c:opt.c})],["取消",null,true]]'));
  /* 11/17 晚開發者「統一用齊轍開始，不要任何選角畫面」：帶預選同伴（opt.c）也一樣走開場，先記開場後要接新手練習（07stq stqXuArm） */
  assert.ok(SRC.includes('if(opt.mode==="new"&&typeof bhxNewJourney==="function"){try{if(typeof stqXuArm==="function")stqXuArm()}catch(e){}bhxNewJourney(opt.slot||1);return}'));
});
