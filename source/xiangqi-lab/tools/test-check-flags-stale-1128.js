// W76（11/28 26112801 實跑）：check-flags ④「讀不到・沿用上一次」誤判失敗——am start 到接上攔截之間，App 已向真網址讀到 main 的開關檔，
//   存進 localStorage.xqFlags 蓋掉上一次的「關」；之後 reload 才讀不到，App 沿用的是剛存的全開。修法：接上攔截後、reload 前把上一次的值寫回去。
//   這裡只看原始碼的順序與判法（不開模擬器、不連網）：
//   ① cold() 寫回 xqFlags 一定在 routeCdn 之後、Page.reload 之前；② ④ 把上一次存的值帶進第二次冷啟；③「關」沒套上、沒存進 xqFlags＝測不成立，不能判通過或失敗。
// 用法：node --test xiangqi-lab/tools/test-check-flags-stale-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const CF = path.join(__dirname, "..", "..", "xiangqi-android", "scripts", "check-flags.js");
const S = fs.readFileSync(CF, "utf8").replace(/\r\n/g, "\n");

test("〔原始碼〕cold()：寫回上一次的 xqFlags 在接上攔截之後、重新載入之前", () => {
  const a = S.indexOf("const cold = async (clearSaved, restore) => {"); assert.ok(a > 0, "cold 要收 restore 參數");
  const body = S.slice(a, S.indexOf("};", a));
  const route = body.indexOf("log = await routeCdn(c, ro);"), put = body.indexOf('localStorage.setItem("xqFlags"'), reload = body.indexOf('c.send("Page.reload"');
  assert.ok(route > 0 && put > 0 && reload > 0, "三個步驟都要在 cold 裡");
  assert.ok(route < put && put < reload, "順序要是：接上攔截 → 寫回 → 重新載入");
  assert.match(body, /beforeRestore = await c\.ev\('localStorage\.getItem\("xqFlags"\)'\)/, "寫回前要記下當時讀到的值（報告證據）");
});

test("〔原始碼〕④ 沿用上一次：上一次的「關」要確認有套上、存下來，再帶進第二次冷啟；沒套上就是測不成立", () => {
  const a = S.indexOf("/* ④ 讀不到開關檔"), seg = S.slice(a, S.indexOf('讀不到・從沒抓到過", plan.on', a));
  assert.match(seg, /const setOff = await flagIs\(k, false\);/, "第一步的 flagIs 回傳值要接住");
  /* #287 複審：saved 一定要讀 App 自己存的 xqFlags；工具自己造一份「關」的話，App 沒存下來也會被判通過 */
  assert.match(seg, /const saved = setOff \? await c\.ev\('localStorage\.getItem\("xqFlags"\)'\) : null;/, "上一次的值要讀 App 自己存的 localStorage.xqFlags，不能由工具自己造");
  assert.match(seg, /await cold\(false, saved \|\| undefined\);/, "第二次冷啟要帶上一次存的值");
  assert.match(seg, /row\.invalid = true; row\.ok = false; row\.problems\.unshift\("上一次的「關」沒套上或沒存進 xqFlags：這段不成立"\)/, "沒套上＝測不成立");
  assert.match(seg, /else if \(!\(await flagIs\(k, false, 5000\)\)\) \{ row\.ok = false; row\.problems\.unshift\("讀不到時沒沿用上一次的「關」"\) \}/, "套上了卻沒沿用，照舊判失敗");
  assert.match(seg, /R\.staleFlags = \{ savedOff: saved, readBeforeRestore: beforeRestore \}/, "報告要記寫回前後的值");
});

test("〔原始碼〕「從沒抓到過」那段不受影響：照舊 cold(true) 清掉存檔，讀不到要全開", () => {
  assert.match(S, /await cold\(true\);\n    row = await runSteps\(k, "讀不到・從沒抓到過", plan\.on\);/);
  assert.match(S, /從沒抓到過又讀不到時，應該全開/);
});
