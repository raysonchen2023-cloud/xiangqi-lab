// 11/17 Windows 測試員 B（Playwright、390×844 與 844×390、候選版 0106）星門圍城對局畫面：
//   B-5（P2）橫式對局時棋盤壓住頂欄標題、最底排看不到：版面上緣原本用 07bh 量的 --bhTop（只在重畫時量），頂欄長高、轉向後就對不上。
//     修法：07sg2 sg2TopSync 量頂欄真正的下緣寫 --gsvTop（每次畫、頂欄大小一變〔ResizeObserver〕、轉向都量）；07bhg gsvCss 的上緣一律用它；橫式棋盤底下讓出安全區。
//   B-6（P2）直式招式區約 80px 只露兩列，四位夥伴要在小框裡捲：下方面板照招式列數長高（sg2MeH：上面三行約 104px＋每列 42px，至少原本 190／矮螢幕 176，最多畫面四成）。
//   B-7（P2）開局「✦ 星樞：…」、放招的提示（toast）在畫面下方，壓住帥體力、回合數、「規則」、第一顆招式：對局中移到棋盤上緣、不接點選；橫式只佔中間那一欄。
//   B-12（P3）「下一波：…」星門預告的點擊區只有 18px 高：整行 40px，上面那條面板跟著加高到 80px。
// 不開瀏覽器：純函式與假 DOM 直接跑，樣式看原始碼。用法：node --test xiangqi-lab/tools/test-sg2-hud-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const G = rd("xiangqi-db/m/07bhg-gatesiege.js"), S2 = rd("xiangqi-db/m/07sg2-siege2.js");
const a = S2.indexOf("let SG2_TOPRO=null;"), b = S2.indexOf("\nif(typeof window!==\"undefined\"&&typeof addEventListener===\"function\")addEventListener(\"resize\"", a);
assert.ok(a > 0 && b > a, "07sg2 找得到 sg2TopSync／sg2MeH 那段");
const SRC = S2.slice(a, b);
const GCSS = G.slice(G.indexOf("function gsvCss(){"), G.indexOf("`;document.head.append(s)}", G.indexOf("function gsvCss(){")));
const SCSS = S2.slice(S2.indexOf("function sg2Css(){"), S2.indexOf("`;document.head.append(s)}", S2.indexOf("function sg2Css(){")));

function kit(o) {
  const vars = {}, bvars = {}, obs = [];
  const style = V => ({ getPropertyValue: k => V[k] || "", setProperty: (k, v) => { V[k] = v } });
  const document = { documentElement: { style: style(vars) }, body: { style: style(bvars) }, getElementById: id => id === "topbar" ? { getBoundingClientRect: () => ({ bottom: o.top() }) } : null };
  class RO { constructor(f) { this.f = f; obs.push(this) } observe(el) { this.el = el } }
  const env = { document, ResizeObserver: RO, innerHeight: o.H || 844 };
  const names = Object.keys(env);
  const X = new Function(...names, SRC + ";return{sg2TopSync,sg2MeH,sg2MeSync}")(...names.map(k => env[k]));
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

test("〔B-6〕直式下方面板照招式列數長高：兩列照舊 190；四位夥伴＋後備五列 314；最多畫面四成；矮螢幕起點 176", () => {
  const K = kit({ top: () => 52 });
  assert.equal(K.sg2MeH(2, 844), 190); assert.equal(K.sg2MeH(5, 844), 314); assert.equal(K.sg2MeH(9, 844), Math.round(844 * .4));
  assert.equal(K.sg2MeH(1, 667), 176);
  const me = { querySelectorAll: s => s === ".sg2-skr" ? new Array(5).fill({}) : [] }; K.sg2MeSync(me); assert.equal(K.bvars["--sg2MeH"], "314px");
  assert.ok(SCSS.includes("@media (orientation:portrait){html body.gsv-on{--gsvMeH:var(--sg2MeH,190px)}}"), "只在直式套用（橫式照舊 0）");
  assert.ok(S2.includes('</div>`;sg2MeSync(me)}'), "畫完招式就量");
  assert.ok(S2.includes(".sg2-skw{overflow-y:auto;max-height:calc(var(--gsvMeH,190px) - 100px)"), "招式框跟著面板變高");
});

test("〔B-7〕對局中 toast 不在畫面下方、不接點選（11/17 第二批 N-4 再搬到棋盤外：直式頂欄下方那條、橫式左欄下半，見 test-sg2-layout-1117b.js）", () => {
  assert.ok(SCSS.includes("body.gsv-on .toast{bottom:auto;top:calc(var(--gsvTop,var(--bhTop,44px)) + 4px);"));
  assert.ok(/body\.gsv-on \.toast\{[^}]*pointer-events:none\}/.test(SCSS), "不接點選");
  assert.ok(G.includes('setTimeout(()=>toast("✦ 星樞："+V.say),3200)'), "開局那句是 toast");
});

test("〔B-12〕星門預告整行 40px 好點；上面那條面板加高到 80px 放得下", () => {
  assert.match(SCSS, /\.gsv-ln button\[data-x="fore"\]\{display:block;width:100%;min-height:40px;/);
  assert.ok(SCSS.includes("@media (orientation:portrait){html body.gsv-on{--gsvEnH:80px}}"));
  assert.ok(4 + 22 + 3 + 40 + 4 <= 80, "上下留白＋體力列＋間距＋預告列");
  assert.ok(S2.includes('<button type="button" data-x="fore">'), "預告是按鈕");
});
