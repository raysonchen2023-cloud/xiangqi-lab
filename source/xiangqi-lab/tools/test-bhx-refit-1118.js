// 11/18 開發者錄影「畫面跳動」：黑洞第一戰滿版（body.bhx-full）時，park3d 每 60 格的版面檢查把應有高度算成 1.32 倍寬，
// 跟 fit 撐滿螢幕的高度永遠對不上，每約 2 秒重跑一次 fit，鏡頭跳一下再滑回來。這裡檢查滿版時應有高度照 room() 算。
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "..", "src", "park3d.js"), "utf8");
test("park3d：每 60 格的版面檢查在黑洞滿版時以可用高度為準（不會週期性重跑 fit）", () => {
  const line = SRC.split("\n").find(l => l.includes("(++roomN%60)===0"));
  assert.ok(line, "找不到每 60 格的版面檢查");
  assert.match(line, /want=TDC\|\|pkFullV\(\)\?rm:/, "滿版（pkFullV）時 want 要等於 room()");
  assert.match(SRC, /const pkFullV=\(\)=>/, "pkFullV 要在 fit 之前定義");
  const fitAt = SRC.indexOf("const fit=()=>"), fullAt = SRC.indexOf("const pkFullV=()=>");
  assert.ok(fullAt > 0 && fullAt < fitAt, "pkFullV 定義在 fit 前面");
  assert.match(SRC.slice(fitAt, fitAt + 1200), /if\(FULLV&&rm>0&&rm<1e8\)CAMV\.hr=Math\.max\(\.3,rm\/W\)/, "fit 在滿版時高度撐到 room()");
});
