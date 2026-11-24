// W107（11/25 開發者：「在ipad無法滿版 就要重畫支援ipad」）：iPad 橫向時直式場景圖等高置中，兩側原本只有模糊底。
// 修法：07fl-fill.js 的模糊底 #xflBg 多一層清楚的寬版延伸圖（<key>_wide.webp，原圖放正中間、左右補畫），等高、中心對齊原圖，
//   原圖照舊畫在最上面，所以入口座標都不用動。只有登記在 XFW 的「原圖」才鋪；變體、手機橫放（r07-side）、直向填滿（xfl-port）都不鋪。
// 用法 node --test xiangqi-lab/tools/test-ipad-wide-ext.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/07fl-fill.js"), "utf8").replace(/\r\n/g, "\n");
function load() { const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, addEventListener: () => { }, isFinite, Math }); vm.runInContext(SRC, ctx); return ctx }
const C = load(), [xfwKey, xfwSrc, XFW] = vm.runInContext("[xfwKey, xfwSrc, XFW]", C), { xfwPlan } = C;

test("xfwKey：只認登記過的原圖（data/ 之後、去掉 .webp、不管 ?v= 和網域）；變體、沒登記、不是 webp 都回空字串", () => {
  XFW["cpuroom/cpuroom_day"] = 2202 / 1376;
  assert.equal(xfwKey("capacitor://localhost/data/cpuroom/cpuroom_day.webp?v=3"), "cpuroom/cpuroom_day");
  assert.equal(xfwKey("https://x.test/xq/data/cpuroom/cpuroom_day.webp"), "cpuroom/cpuroom_day");
  assert.equal(xfwKey("data/cpuroom/cpuroom_day.webp#a"), "cpuroom/cpuroom_day");
  assert.equal(xfwKey("data/cpuroom/cpuroom_day_han.webp"), "", "朝代變體沒登記");
  assert.equal(xfwKey("data/cpuroom/cpuroom_day.png"), "");
  assert.equal(xfwKey("data/hubmap/learn.webp"), "", "沒登記");
  assert.equal(xfwKey("mydata/cpuroom/cpuroom_day.webp"), "", "data/ 要是完整的一段");
  assert.equal(xfwKey(""), ""); assert.equal(xfwKey(undefined), "");
  assert.equal(xfwSrc("cpuroom/cpuroom_day"), "data/cpuroom/cpuroom_day_wide.webp?v=" + vm.runInContext("XFW_IMGV", C));
  delete XFW["cpuroom/cpuroom_day"];
});

test("xfwPlan：寬圖跟原圖等高、中心對齊（iPad Air 11 橫向、13 吋橫向、視窗中等寬）", () => {
  const ar = 2202 / 1376;
  for (const [vw, vh, top] of [[1180, 820, 86], [1376, 1032, 86], [835, 820, 86]]) {
    const b = { left: 0, top, width: vw, height: vh - top }, h = vh - top, w = h * 768 / 1376, im = { left: (vw - w) / 2, top, width: w, height: h };
    const p = xfwPlan(im, b, ar);
    assert.equal(p.height, Math.round(h), "等高");
    assert.equal(p.top, 0, "上緣對齊");
    assert.ok(Math.abs(p.left + p.width / 2 - (im.left + im.width / 2)) <= 1, "中心對齊");
    assert.ok(p.width > im.width, "比原圖寬");
  }
  // 模糊底不在 (0,0)：位置要換成相對模糊底
  const p = xfwPlan({ left: 300, top: 120, width: 400, height: 700 }, { left: 20, top: 100, width: 1000, height: 720 }, 2);
  assert.deepEqual({ ...p }, { left: -220, top: 20, width: 1400, height: 700 });
  assert.equal(xfwPlan({ left: 0, top: 0, width: 0, height: 0 }, { left: 0, top: 0 }, 2), null);
  assert.equal(xfwPlan({ left: 0, top: 0, width: 10, height: 10 }, { left: 0, top: 0 }, 0), null);
  assert.equal(xfwPlan(null, { left: 0, top: 0 }, 2), null);
});

test("原始碼：只在 r07-fit（等高置中）而且不是 xfl-port 時鋪；模糊底建立時就有清楚那層；寬圖在模糊層上面", () => {
  assert.match(SRC, /V\.classList\.contains\("r07-fit"\)&&!V\.classList\.contains\("xfl-port"\)\?xfwKey\(src\):""/);
  assert.match(SRC, /B\.append\(document\.createElement\("i"\),document\.createElement\("b"\)\)/);
  assert.match(SRC, /#xflBg>b\{position:absolute;background:center\/100% 100% no-repeat;display:none\}/);
  assert.match(SRC, /B\.hidden=false;B\._P=P;V\.classList\.add\("xfl-bgon"\);\n  xfwLay\(V,B,im,src\);/);
  // 登記表裡的每一張，比例要合理（16:10 左右），寬圖檔要在倉庫裡（圖到齊才登記）
  for (const [k, ar] of Object.entries(XFW)) {
    assert.ok(ar > 1.3 && ar < 2.4, k + " 的比例 " + ar);
    assert.ok(fs.existsSync(path.join(__dirname, "../../../data", k + "_wide.webp")) || fs.existsSync(path.join(__dirname, "../../xiangqi-db/art", k + "_wide.webp")), k + "_wide.webp 要在倉庫裡");
  }
});
