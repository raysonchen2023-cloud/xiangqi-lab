// 11/17 Windows 測試員 B（Playwright、390×844 與 844×390、候選版 0106）星門圍城對局畫面：
//   B-5（P2）橫式對局時棋盤壓住頂欄標題、最底排看不到：版面上緣原本用 07bh 量的 --bhTop（只在重畫時量），頂欄長高、轉向後就對不上。
//     修法：07sg2 sg2TopSync 量頂欄真正的下緣寫 --gsvTop（每次畫、頂欄大小一變〔ResizeObserver〕、轉向都量）；07bhg gsvCss 的上緣一律用它；橫式棋盤底下讓出安全區。
//   B-6：直式面板用實際高度留出棋盤空間，招式過多時只捲招式區。
//   B-7、B-12：提示不攔點選，星門預告可點整列。
// 不開瀏覽器：純函式與假 DOM 直接跑，樣式看原始碼。用法：node --test xiangqi-lab/tools/test-sg2-hud-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const G = rd("xiangqi-db/m/07bhg-gatesiege.js"), S2 = rd("xiangqi-db/m/07sg2-siege2.js");
const a = S2.indexOf("let SG2_TOPRO=null;"), b = S2.indexOf("\nif(typeof window!==\"undefined\"&&typeof addEventListener===\"function\")addEventListener(\"resize\"", a);
assert.ok(a > 0 && b > a, "07sg2 找得到 sg2TopSync／sg2DockSync 那段");
const SRC = S2.slice(a, b);
const GCSS = G.slice(G.indexOf("function gsvCss(){"), G.indexOf("`;document.head.append(s)}", G.indexOf("function gsvCss(){")));
const SCSS = S2.slice(S2.indexOf("function sg2Css(){"), S2.indexOf("`;document.head.append(s)}", S2.indexOf("function sg2Css(){")));

function kit(o) {
  const vars = {}, bvars = {}, obs = [];
  const style = V => ({ getPropertyValue: k => V[k] || "", setProperty: (k, v) => { V[k] = v }, removeProperty: k => { delete V[k] } });
  const document = { documentElement: { style: style(vars) }, body: { style: style(bvars) }, getElementById: id => id === "topbar" ? { getBoundingClientRect: () => ({ bottom: o.top() }) } : null };
  class RO { constructor(f) { this.f = f; obs.push(this) } observe(el) { this.el = el } disconnect() { this.disconnected = true } }
  const env = { document, ResizeObserver: RO, innerHeight: o.H || 844 };
  const names = Object.keys(env);
  const X = new Function(...names, SRC + ";return{sg2TopSync,sg2DockObserve,sg2DockClear}")(...names.map(k => env[k]));
  return Object.assign(X, { vars, bvars, obs });
}

test("〔B-5〕上緣＝頂欄真正的下緣：第一次量、頂欄長高（ResizeObserver）再量", () => {
  let top = 52; const K = kit({ top: () => top });
  K.sg2TopSync(); assert.equal(K.vars["--gsvTop"], "52px");
  assert.equal(K.obs.length, 1, "盯著頂欄大小");
  top = 88; K.obs[0].f(); assert.equal(K.vars["--gsvTop"], "88px", "頂欄變高（標題換行）就跟著改");
  K.sg2TopSync(); assert.equal(K.obs.length, 1, "只掛一次");
});

test("〔B-5〕gsvCss 的上緣都改用 --gsvTop（量不到才用 --bhTop）；橫式棋盤底下讓出安全區", () => {
  assert.ok(!/var\(--bhTop,44px\)/.test(GCSS.replace(/var\(--gsvTop,var\(--bhTop,44px\)\)/g, "")), "沒有直接用 --bhTop 的");
  assert.ok((GCSS.match(/var\(--gsvTop,var\(--bhTop,44px\)\)/g) || []).length >= 6);
  assert.ok((GCSS.match(/>#bbox\{top:var\(--gsvTop,var\(--bhTop,44px\)\)!important;bottom:env\(safe-area-inset-bottom,0px\)!important;/g) || []).length === 2, "橫式兩條棋盤規則");
  assert.ok(S2.includes("my=gsvMy(st);sg2TopSync();"), "每次畫都量");
});

test("〔B-6〕直式 HUD 依內容尺寸留位，尺寸變動重測，離開時釋放觀察器", () => {
  const K = kit({ top: () => 52 });
  let enemy = 57.5, player = 117;
  const en = { getBoundingClientRect: () => ({ height: enemy }) };
  const me = { getBoundingClientRect: () => ({ height: player }) };
  K.sg2DockObserve(en, me);
  assert.equal(K.bvars["--sg2EnH"], "58px");
  assert.equal(K.bvars["--sg2DockH"], "117px");
  enemy = 75; player = 218; K.obs[0].f();
  assert.equal(K.bvars["--sg2EnH"], "75px");
  assert.equal(K.bvars["--sg2DockH"], "218px");
  K.sg2DockObserve(en, me); assert.equal(K.obs.length, 1);
  K.sg2DockClear(); assert.deepEqual(K.bvars, {}); assert.equal(K.obs[0].disconnected, true);
  assert.match(SCSS, /#gsvMe\{height:auto;max-height:38dvh;display:flex/);
  assert.match(SCSS, /#gsvMe \.sg2-skw\{flex:0 1 auto;min-height:0/);
  assert.match(SCSS, /#view\.view\.fixed>#bbox\{bottom:var\(--sg2DockH,120px\)!important/);
});

test("〔B-7〕對局中 toast 不在畫面下方、不接點選（11/17 第二批 N-4 再搬到棋盤外：直式頂欄下方那條、橫式左欄下半，見 test-sg2-layout-1117b.js）", () => {
  assert.ok(SCSS.includes("body.gsv-on .toast{bottom:auto;top:calc(var(--gsvTop,var(--bhTop,44px)) + 4px);"));
  assert.ok(/body\.gsv-on \.toast\{[^}]*pointer-events:none\}/.test(SCSS), "不接點選");
  /* 11/25 W120：開局那句照樣 3.2 秒後用 toast 說，多了 gsvStill(J) 的檢查（還在對局頁、同一關同一盤、還沒結束才說） */
  assert.ok(G.includes('const ok=gsvStill(J);') && G.includes('setTimeout(()=>{if(ok())toast("✦ 星樞："+V.say)},3200)') && G.includes("function gsvStill(J){"), "開局那句是 toast");
});

test("〔B-12〕星門預告整行 44px，面板自然長高", () => {
  assert.match(SCSS, /\.gsv-ln button\[data-x="fore"\]\{display:block;width:100%;min-height:44px;/);
  assert.match(SCSS, /#gsvEn\{height:auto/);
  assert.ok(S2.includes('<button type="button" data-x="fore">'), "預告是按鈕");
});
