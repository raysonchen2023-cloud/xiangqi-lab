// 開發者 11/12「棋力測驗右上角卷軸按了沒作用」：開始頁是場景（面板＋頂欄 📜），按開始後換成棋盤、面板被拿掉，📜 留著卻指向不在的面板。
// 07w-shipwalk.js 加 xqsTbGc：畫面一換就檢查，面板不在了就收掉 📜；按鈕本身也先檢查面板還在不在。
// 11/12 已在內建瀏覽器（正式站答題畫面）實際執行同一段邏輯驗證：面板不在、📜 被收掉，頂欄只剩地圖。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const S = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07w-shipwalk.js"), "utf8");
const m = S.match(/function xqsTbGc\(\)\{([\s\S]*?)\}\n/);

/* 用假的頂欄與面板實際跑 xqsTbGc */
function run(curConnected, hasBtn) {
  let removed = false;
  const btn = hasBtn ? { remove() { removed = true } } : null;
  const doc = { querySelector: q => q === "#topRight .xqs-tb" ? btn : null };
  const XQS_CUR = curConnected == null ? null : { el: { isConnected: curConnected } };
  new Function("document", "XQS_CUR", m[1])(doc, XQS_CUR);
  return removed;
}

test("〔混合〕面板已經不在（換成答題棋盤）：收掉 📜", () => {
  assert.ok(m, "07w-shipwalk.js 找不到 xqsTbGc");
  assert.strictEqual(run(false, true), true);
});
test("〔混合〕從來沒有面板（XQS_CUR 是空的）：收掉留下的 📜", () => {
  assert.strictEqual(run(null, true), true);
});
test("〔混合〕面板還在：📜 保留", () => {
  assert.strictEqual(run(true, true), false);
});
test("〔混合〕頂欄沒有 📜：什麼都不做、不出錯", () => {
  assert.strictEqual(run(false, false), false);
});
test("〔原始碼〕畫面一換（#view 子元素變動、換頁）就先檢查", () => {
  assert.match(S, /const run=\(\)=>\{clearTimeout\(q\);try\{xqsTbGc\(\)\}catch\(e\)\{\}/);
});
test("〔原始碼〕按 📜 時面板不在就收掉按鈕，不去開不存在的面板", () => {
  assert.match(S, /b\.onclick=\(\)=>\{if\(!S\.el\.isConnected\)\{b\.remove\(\);return\}/);
});
