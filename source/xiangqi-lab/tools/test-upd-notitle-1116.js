// 11/16 開發者「希望 App 更新的時候，不要跳到 App 關掉後開啟的第一個畫面」，選單「只管更新」：
//   02-shell markDone（套用新版、重新載入之前）在 localStorage 記 xqUpdBack＝{t,h}；05b saveBoot 看到 3 分鐘內的記號就不出開頭畫面，網址沒帶頁面時回原頁。
//   真的關掉 App 再開（沒有記號）照舊出開頭畫面。
// 不開瀏覽器：把 saveBoot 抽出來放進 vm，用假的 storage／location 跑。
// 用法：node --test xiangqi-lab/tools/test-upd-notitle-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SV = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "05b-save.js"), "utf8").replace(/\r\n/g, "\n");
const SH = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "02-shell.js"), "utf8").replace(/\r\n/g, "\n");
const FN = SV.slice(SV.indexOf("function saveBoot(){"), SV.indexOf("\nsetTimeout(()=>{try{saveBoot()}"));

function boot({ upd, hash = "", ss = {} } = {}) {
  const L = [], LS = new Map(upd ? [["xqUpdBack", JSON.stringify(upd)]] : []), SS = new Map(Object.entries(ss)), loc = { hash };
  const ctx = { SAVE_OLD: null, store: { get: (k, d) => d, set() { } }, lockFix() { }, CHAR_ERA: {}, applyEra() { }, Date, JSON,
    sessionStorage: { getItem: k => SS.has(k) ? SS.get(k) : null, setItem: (k, v) => SS.set(k, String(v)), removeItem: k => SS.delete(k) },
    localStorage: { getItem: k => LS.has(k) ? LS.get(k) : null, setItem: (k, v) => LS.set(k, String(v)), removeItem: k => LS.delete(k) },
    bhxNeed: () => false, bhxBack() { }, bhxLandNew: () => false, prologue() { }, bhxResume: () => false, titleScreen: () => L.push("title"),
    navigator: {}, location: loc, setTimeout: f => f() };
  vm.createContext(ctx); vm.runInContext(FN + ";saveBoot();", ctx);
  return { L, LS, SS, hash: loc.hash };
}

test("〔行為〕更新重載（3 分鐘內）：不出開頭畫面；網址沒帶頁面就回原頁；記號用一次就刪", () => {
  const a = boot({ upd: { t: Date.now() - 5000, h: "#/adventure" }, hash: "" });
  assert.deepEqual(a.L, [], "不出開頭畫面"); assert.equal(a.hash, "#/adventure", "回到原本那一頁"); assert.equal(a.LS.has("xqUpdBack"), false, "記號刪掉");
  assert.equal(a.SS.get("xqTitleShown"), "1", "這次分頁記成看過開頭畫面");
  const b = boot({ upd: { t: Date.now() - 5000, h: "#/adventure" }, hash: "#/guanxing" });
  assert.deepEqual(b.L, []); assert.equal(b.hash, "#/guanxing", "網址已經帶頁面就不改");
  const c = boot({ upd: { t: Date.now() - 5000, h: "" }, hash: "#/" });
  assert.deepEqual(c.L, [], "原本就在首頁：也不出開頭畫面");
});

test("〔行為〕沒有記號（真的關掉 App 再開）或記號過期（超過 3 分鐘）：照舊出開頭畫面", () => {
  assert.deepEqual(boot({ hash: "" }).L, ["title"]);
  assert.deepEqual(boot({ hash: "#/" }).L, ["title"]);
  const old = boot({ upd: { t: Date.now() - 200000, h: "#/adventure" }, hash: "" });
  assert.deepEqual(old.L, ["title"], "過期的記號不算"); assert.equal(old.LS.has("xqUpdBack"), false, "過期的也刪掉");
  assert.deepEqual(boot({ upd: { t: Date.now(), h: "#/adventure" }, hash: "", ss: { xqTitleShown: "1" } }).L, [], "原本的 sessionStorage 記號照舊有效");
});

test("〔原始碼〕02-shell 套用新版前（markDone）記下 xqUpdBack＝{t,h}，兩條套用路（馬上套用、換頁套用）都先 markDone 再重新載入", () => {
  assert.ok(SH.includes('localStorage.setItem("xqUpdBack",JSON.stringify({t:Date.now(),h:location.hash||""}))'), "markDone 記 xqUpdBack");
  assert.ok(SH.includes('markDone();setTimeout(()=>{if(typeof rlgPrep==="function")rlgPrep("upd");location.reload()},900)'), "馬上套用");
  assert.ok(SH.includes('{markDone();if(typeof rlgPrep==="function")rlgPrep("upd");location.reload()}'), "換頁時套用");
});
