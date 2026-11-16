// 11/17 Windows 測試員 B-3（P2）：偏航視窗說「棋鎮右邊的觀星臺也會開」，可是觀星臺入口只放在千秋時光之苑首頁（07gxt gxtHomeSpot 只在 hbIsCl 才放，開發者 11/13 定），
//   漢朝等朝代棋鎮、星槎上都沒有（星槎熱點 11/13 晚拿掉），只能從「找地方 → 全部入口清單 → 觀星臺」進去。
//   選的修法：不加新入口（只放時光之苑是刻意的），改文字指向真的找得到的地方：
//     ① 07bh 偏航視窗：BH_GXT_AT「，觀星臺也會開（點頂欄右上的地圖鈕就找得到；入口在千秋時光之苑的橋右邊）」；
//     ② 07ulk 新地點開放過場：停在各朝代棋鎮（不是時光之苑）時，在那一句下面多一行「在千秋時光之苑的橋右邊／左邊；頂欄的 🗺 地圖也找得到。」
// 不開瀏覽器：vm 跑 07ulk 的純函式、用假 DOM 跑 ulkPlay；07bh 照字面檢查。用法：node --test xiangqi-lab/tools/test-gxt-where-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const BH = rd("xiangqi-db/m/07bh-blackhole.js"), ULK = rd("xiangqi-db/m/07ulk-unlockfx.js"), GXT = rd("xiangqi-db/m/07gxt-guanxing.js"), STM = rd("xiangqi-db/m/07z6-sitemap.js");

test("〔前提〕觀星臺首頁入口只在時光之苑、星槎不放熱點、找地方有觀星臺那一格（所以文字要指向這兩個地方）", () => {
  assert.match(GXT, /function gxtHomeSpot\(v\)\{if\(!gxtOpen\(\)\|\|!\(typeof hbIsCl==="function"&&hbIsCl\(\)\)\)return;/);
  assert.match(rd("xiangqi-db/m/07f-ship.js"), /星槎圖上不再放「🌌 幻譜星門」（07gx gxShipHs）和「🌌 星淵」（07gxt gxtShipHs）熱點/);
  assert.match(STM, /\["觀星臺","#\/guanxing","[^"]*","gxt"\]/);
  assert.match(STM, /🗺 找地方/);
});

test("〔偏航視窗〕不再寫「棋鎮右邊」，改指向時光之苑橋右邊與頂欄的 🗺 地圖", () => {
  assert.ok(!BH.includes('"，棋鎮右邊的觀星臺也會開"'), "舊字拿掉了");
  const m = BH.match(/const BH_GXT_AT="([^"]*)";/); assert.ok(m, "有 BH_GXT_AT");
  assert.equal(m[1], "，觀星臺也會開（點頂欄右上的地圖鈕就找得到；入口在千秋時光之苑的橋右邊）");
  assert.ok(BH.includes('!gxtOpen()?BH_GXT_AT:""'), "觀星臺還沒開才說");
  assert.ok(BH.indexOf("const BH_GXT_AT=") < BH.indexOf("function bhOffer("), "宣告在 bhOffer 前面");
  assert.ok(!/上限/.test(m[1]));
});

function ulkKit(cl) {
  const els = [];
  const mk = tag => { const e = { tag, style: {}, dataset: {}, classList: { add() { }, remove() { }, contains: () => true }, setAttribute() { }, append() { }, remove() { }, querySelector: () => ({ complete: true, remove() { } }), innerHTML: "" }; els.push(e); return e };
  const store = { _: {}, get(k, d) { return k in this._ ? this._[k] : d }, set(k, v) { this._[k] = v } };
  const ctx = { console, store, esc: s => String(s), hbIsCl: () => cl, gxtOpen: () => true, xsmOpen: () => true, vibrate() { },
    document: { createElement: mk, getElementById: () => ({}), head: { append() { } }, body: { append() { } } }, requestAnimationFrame: () => 0, setTimeout: () => 0, clearTimeout() { },
    location: { hash: "#/" }, Date };
  vm.createContext(ctx);
  vm.runInContext(ULK.replace(/if\(ULK_ON&&typeof window!=="undefined"[\s\S]*$/, "") + ";this.T={ULK_PLACES,ulkWhere,ulkPlay,ulkCl};", ctx);
  return Object.assign(ctx.T, { els });
}

test("〔過場・純函式〕ulkWhere：不在時光之苑才回「在哪裡」那一行；在時光之苑回空字串", () => {
  const K = ulkKit(false), g = K.ULK_PLACES.find(p => p.k === "gxt"), x = K.ULK_PLACES.find(p => p.k === "xsm");
  assert.equal(K.ulkWhere(g, false), "點頂欄右上的地圖鈕就找得到；入口在千秋時光之苑的橋右邊。");
  assert.equal(K.ulkWhere(x, false), "點頂欄右上的地圖鈕就找得到；入口在千秋時光之苑的橋左邊。");
  assert.equal(K.ulkWhere(g, true), "", "時光之苑：橋兩邊就看得到，不多寫");
  assert.equal(K.ulkWhere(null, false), "");
  assert.equal(K.ulkCl(), false); assert.equal(ulkKit(true).ulkCl(), true);
});

test("〔過場・行為〕停在漢朝棋鎮播觀星臺：字幕多一行指向時光之苑；停在時光之苑照舊只有地名＋一句", () => {
  for (const [cl, want] of [[false, true], [true, false]]) {
    const K = ulkKit(cl); K.ulkPlay("gxt");
    const ov = K.els.find(e => /新地點開放/.test(e.innerHTML)); assert.ok(ov, "有過場");
    assert.match(ov.innerHTML, /<b>觀星臺<\/b><p>雲河的盡頭，星斗垂得最低。/);
    assert.equal(/<p class="at">點頂欄右上的地圖鈕就找得到；入口在千秋時光之苑的橋右邊。<\/p>/.test(ov.innerHTML), want, cl ? "時光之苑" : "朝代棋鎮");
    assert.ok(!/上限|棋鎮右邊/.test(ov.innerHTML));
  }
});

test("〔接線〕字幕那一行有樣式（金色、跟那一句隔開）", () => {
  assert.ok(ULK.includes("#ulkOv .cap p.at{margin-top:8px;color:#FFE08A}"));
});

/* 11/17 測試員 B 第 2 輪 N-2：說明文字裡的 emoji（🗺）會被 App 換成大張圖示（img.eic.emi），把整段蓋住；指路文字只用純文字 */
test("〔原始碼〕偏航視窗與解鎖過場的指路文字不含 🗺（會被換成大圖示）", () => {
  const BH = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07bh-blackhole.js"), "utf8");
  const UL = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07ulk-unlockfx.js"), "utf8");
  const at = BH.match(/const BH_GXT_AT="([^"]*)"/)[1];
  assert.ok(!at.includes("🗺") && at.includes("地圖鈕"), "BH_GXT_AT");
  for (const m of UL.matchAll(/at:"([^"]*)"/g)) assert.ok(!m[1].includes("🗺"), "07ulk at：" + m[1]);
});
