// 開發者 11/12：
// (1) hspx 第 1036 列「棋力測驗第 16 題無法點選紅方任意子」：題目 g638fd556 紅方正被將軍（黑砲隔仕將帥），只有相、俥能解將。
//     開發者確認題目合理、畫面維持原樣（不加將軍提示）；只保留「換題時先清掉上一題的合法步」。
// (2) 「做完棋力測驗後沒有出口」：開始頁（場景）→ 答題 → 結果（場景）同一個網址、沒重設頂欄，出口與返回鍵沒整理。
//     07w9-exits.js 改成 #view「有沒有場景圖」改變時重新整理。11/12 已在正式站把同一段程式注入舊版頁面驗證：
//     答題時返回鍵恢復、結果畫面出現「↩ 回藏譜石窟」。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), M = f => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const QZ = M("03-home-quiz.js"), EX = M("07w9-exits.js");
const C = require("../site/core.js"), QUIZ = require("../site/data/quiz.json");

test("第 16 題（g638fd556）題目合理：紅方被將軍、只有相和俥能解將，正解在合法步裡", () => {
  const q = QUIZ.items.find(x => x.id === "g638fd556");
  assert.ok(q, "題庫找不到 g638fd556");
  const b = q.board.split(",").map(x => x || null);
  assert.strictEqual(q.side, "r");
  assert.ok(C.inCheck(b, "r"), "紅方應該正被將軍");
  const L = C.legal(b, "r"), pcs = [...new Set(L.map(([f]) => b[f]))].sort();
  assert.deepStrictEqual(pcs, ["B", "R"], "能走的只有相（B）和俥（R）");
  assert.ok(L.some(([f, t]) => C.notate(b, f, t) === q.cn), "正解要在合法步裡");
});

test("〔原始碼〕畫面維持原樣（不加將軍提示）；換題時先清掉上一題的合法步", () => {
  assert.doesNotMatch(QZ, /qzNoMove|QCHK|被將軍了！先解將/, "開發者決定不加將軍提示");
  assert.match(QZ, /sel=-1;answered=false;LEGAL=\[\];/, "換題時先清掉上一題的合法步");
});

test("〔混合〕出口：只有「有沒有場景圖」改變時才重新整理（一般頁面不會閃）", () => {
  const m = EX.match(/const exChk=\(\)=>\{([\s\S]*?)\};\n/);
  assert.ok(m, "07w9-exits.js 找不到 exChk");
  let calls = 0, scene = true;
  const doc = { getElementById: () => ({ querySelector: () => scene ? {} : null }) };
  const run = new Function("document", "exSync", "let exHas=null;const exChk=()=>{" + m[1] + "};return exChk;")(doc, () => calls++);
  run(); assert.strictEqual(calls, 1, "第一次一定整理");
  run(); run(); assert.strictEqual(calls, 1, "場景還在：不重複整理");
  scene = false; run(); assert.strictEqual(calls, 2, "開始答題（場景不見）：整理一次，返回鍵恢復");
  run(); assert.strictEqual(calls, 2);
  scene = true; run(); assert.strictEqual(calls, 3, "結果畫面（場景回來）：整理一次，放出口");
});

test("〔原始碼〕#view 換內容時觸發、換網址時重設", () => {
  assert.match(EX, /new MutationObserver\(\(\)=>\{clearTimeout\(q\);q=setTimeout\(exChk,80\)\}\)\.observe\(V,\{childList:true\}\)/);
  assert.match(EX, /addEventListener\("hashchange",\(\)=>\{exHas=null;setTimeout\(exChk,700\)\}\)/);
});
