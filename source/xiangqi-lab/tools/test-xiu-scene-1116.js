// 開發者 11/16「找gemini繪製環景圖 關於這一頁，按照天文專家的判斷」（選單：1 張夜空環景、接進 App）：
//   m/07dgl-stamina.js dglXiuSheet 改成滿版星圖頁：底圖 data/guanxing/xiu_sky（Gemini 依 story/gemini_app/回覆_170 畫，不畫星點），
//   二十八宿的星點連線由程式用 SVG 畫在外圈（dglXsAngles／dglXsLodge）；原本四排按鈕那一頁改名 dglXiuList，從「☰ 清單」進。
//   方位：東方蒼龍在左、南方朱雀在上、西方白虎在右、北方玄武在下，角宿在左上（約 10 點鐘）逆時針排——Gemini、ChatGPT（chatgpt_app/回覆_170）都這樣說，
//   跟南宋〈蘇州石刻天文圖〉的常見正置方向一致。每宿寬度照古度比例，太窄的放寬到 DGL_XS_MIN 度。
// 這裡把 07dgl 的純計算放進 vm 跑；畫面在本機候選版手機尺寸看過（點一宿→說明→點亮→變金色）。
// 用法：node --test xiangqi-lab/tools/test-xiu-scene-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07dgl-stamina.js"), "utf8").replace(/\r\n/g, "\n");
function load() {
  const ctx = { console, Math, JSON, Date, Object, Set, isFinite, Array, store: { get: (k, d) => d, set() { } }, esc: s => String(s) };
  vm.createContext(ctx); vm.runInContext(SRC + "\n;this.__X={DGL_XIU,DGL_XIU_DU,DGL_XS_T,DGL_XS_MIN,DGL_XS_C,dglXsAngles,dglXsPos,dglXsLodge};", ctx); return ctx.__X;
}
const quad = a => (a > 135 && a <= 225 ? "左" : a > 225 && a <= 315 ? "下" : a > 45 && a <= 135 ? "上" : "右");

test("〔行為〕二十八宿：角宿在左上、逆時針排；四象各在自己那一邊；寬度照古度、太窄的放寬；一圈剛好 360 度", () => {
  const X = load(), A = X.dglXsAngles();
  assert.equal(A.length, 28); assert.equal(X.DGL_XIU_DU.length, 28);
  assert.ok(Math.abs(A.reduce((s, a) => s + a.w, 0) - 360) < 1e-6, "一圈 360 度");
  assert.ok(A[0].a > 135 && A[0].a < 165, "角宿在左上（約 10 點鐘）：" + A[0].a.toFixed(1));
  const ccw = A.every((a, i) => i === 0 || ((a.a - A[i - 1].a + 360) % 360) < 60);
  assert.ok(ccw, "依序逆時針（角度一直往上加）");
  const side = k => A.slice(k * 7, k * 7 + 7).map(a => quad(a.a)), most = L => L.sort((a, b) => L.filter(x => x === b).length - L.filter(x => x === a).length)[0];
  assert.equal(most(side(0)), "左", "東方蒼龍在左"); assert.equal(most(side(1)), "下", "北方玄武在下");
  assert.equal(most(side(2)), "右", "西方白虎在右"); assert.equal(most(side(3)), "上", "南方朱雀在上");
  const zi = X.DGL_XIU.findIndex(s => s[0] === "觜"), jing = X.DGL_XIU.findIndex(s => s[0] === "井");
  assert.ok(A[zi].w >= X.DGL_XS_MIN * 360 / 380 && A[jing].w > A[zi].w * 3, "觜宿放寬到點得到，井宿還是最寬的之一");
});

test("〔行為〕每一宿都有星官示意、點選範圍；點亮的有 on、選取的有 sel；讀屏念宿名", () => {
  const X = load(), A = X.dglXsAngles();
  for (const s of X.DGL_XIU) assert.ok(X.DGL_XS_T[s[0]], s[0] + " 有星官示意");
  assert.equal(X.DGL_XS_T["井"][0].length, 8); assert.equal(X.DGL_XS_T["昴"][0].length, 7); assert.equal(X.DGL_XS_T["翼"][0].length, 22); assert.equal(X.DGL_XS_T["奎"][0].length, 16);
  const h = X.dglXsLodge(0, A[0], true, true);
  assert.ok(h.startsWith('<g class="dgl-xs-g on sel" data-i="0" role="button" tabindex="0" aria-label="角宿，已點亮"><path class="h" d="M'));
  assert.equal((h.match(/<circle /g) || []).length, 2, "角宿兩顆星"); assert.equal((h.match(/<line /g) || []).length, 1);
  assert.ok(X.dglXsLodge(19, A[19], false, false).includes('aria-label="觜宿，還沒點亮"'));
});

test("〔原始碼〕觀星臺照舊開 dglXiuSheet；原本的清單頁從「☰ 清單」進；底圖不寫上下南北", () => {
  assert.ok(SRC.includes("function dglXiuList(){dglCss();sheet(\"🌌 二十八宿星圖\",b=>{"));
  assert.ok(SRC.includes('if(k==="list"){o.remove();dglXiuList();return}'));
  assert.ok(SRC.includes('const DGL_XS_IMG="data/guanxing/xiu_sky.webp?v=1116"'));
  const sc = SRC.slice(SRC.indexOf("function dglXiuSheet(){"), SRC.indexOf("function dglXiuList(){")).replace(/\/\*[^]*?\*\//g, "");
  assert.ok(!/上南|下北/.test(sc), "畫面上不寫上南下北（北極居中的星圖外圈四邊都是南）");
});
