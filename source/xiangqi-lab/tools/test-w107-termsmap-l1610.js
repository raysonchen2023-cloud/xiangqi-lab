// W107-L 第 1 批：名詞頁（07y4「書院碑林」）iPad 橫向專用橫式圖。條目寫在 07y4 自己（TB_L1610），經典版、原圖共用。
// 檢查：條目登記進 07sw 的 SCW；三通碑跟 TB_STELE 同格式、同順序；標題牌、走路小動作照原本的算法從 stele 算；
// tbGeo 照當下的圖給碑座標和換算；青苔、碑面、拓碑動畫都走 tbGeo；開頁照 scwPre 選圖、掛 scwMount（apply＝place）。
// 用法 node --test xiangqi-lab/tools/test-w107-termsmap-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), Y4 = M("m/07y4-termsmap.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const PRE = cut(Y4, "const TB_STELE=", "]];") + "\n" + cut(Y4, "const tbPc=", ";") + "\n";
const ENTRY = cut(Y4, "const TB_L1610=", 'base:"termsmap/terms_day_classic"})}') + "\n" + cut(Y4, "const tbGeo=", "pc:tbPc}};");

function load(dev) {   // dev＝開發用開關（SCW_CDN 還是 false 時讓條目生效，走 07sw 真正的 scwCur）
  const ctx = vm.createContext({ localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); vm.runInContext(PRE + ENTRY, ctx);
  return ctx;
}
const frame = wide => ({ _scw: { key: "termsmap/terms_day_classic" }, dataset: { scw: wide ? "l1610" : "" } });

test("條目：經典版、原圖都登記在 SCW、共用；檔名加 _l1610；07y4 的圖網址找得到；夜版沒有登記", () => {
  const C = load(), SCW = vm.runInContext("SCW", C), A = SCW["termsmap/terms_day_classic"], B = SCW["termsmap/terms_day"];
  assert.ok(A && B); assert.equal(A.f, "termsmap/terms_day_classic_l1610"); assert.equal(B.f, "termsmap/terms_day_l1610"); assert.equal(B.S, A.S); assert.equal(A.ready, true);
  assert.equal(vm.runInContext('scwKey("data/termsmap/terms_day_classic.webp?v=1")', C), "termsmap/terms_day_classic");
  assert.equal(SCW["termsmap/terms_night"], undefined);
});

test("三通碑：跟 TB_STELE 同格式、同順序（棋規、記譜、術語由左到右）；碑面、碑額、標題牌在圖內，標題牌在碑額上方", () => {
  const C = load(), ST = vm.runInContext("TB_L1610.fx.stele", C), S0 = vm.runInContext("TB_STELE", C);
  assert.equal(ST.length, 3); ST.forEach((s, i) => { assert.equal(s.length, 13); assert.equal(s[0], S0[i][0]); assert.equal(s[1], S0[i][1]); assert.equal(s[12], S0[i][12]) });
  for (const [k, , x0, y0, x1, y1, zx0, zy0, zx1, zy1, lx, ly] of ST) {
    for (const v of [x0, x1, zx0, zx1, lx]) assert.ok(v > 0 && v < 2560, k); for (const v of [y0, y1, zy0, zy1, ly]) assert.ok(v > 0 && v < 1600, k);
    assert.ok(x0 < x1 && y0 < y1 && zx0 < zx1 && zy0 < zy1, k); assert.ok(zy1 <= y0 + 5, k + " 碑額在碑面上面"); assert.ok(ly < zy0 + 40, k + " 標題牌在碑額上方");
  }
  assert.ok(ST[0][2] < ST[1][2] && ST[1][2] < ST[2][2], "左中右");
});

test("標題牌、走路小動作照原本的算法從 stele 算；在安全區內；走路路網接得起來", () => {
  const C = load(), E = vm.runInContext("TB_L1610", C), W = E.walk;
  for (const [k, , x0, y0, x1, y1, , , , , lx, ly, nd] of E.fx.stele) {
    assert.deepEqual(JSON.parse(JSON.stringify(E.S["tbT_" + k])), [+(lx / 25.6).toFixed(2), +(ly / 16).toFixed(2)]);
    const h = W.HS["tbT_" + k]; assert.equal(h[0], nd); assert.ok(Math.abs(h[1] - (x0 + x1) / 2 / 25.6) < .01 && Math.abs(h[2] - (y0 + y1) / 2 / 16) < .01);
    const s = E.S["tbT_" + k]; assert.ok(s[0] > E.safe.l * 100 && s[0] < 100 - E.safe.r * 100 && s[1] > E.safe.t * 100);
  }
  const N = Object.keys(W.N), Ed = W.E.split(" ").map(e => e.split("-"));
  for (const [a, b] of Ed) { assert.ok(N.includes(a)); assert.ok(N.includes(b)) }
  for (const h of Object.values(W.HS)) assert.ok(N.includes(h[0]));
  assert.ok(E.sw7.sky.length >= 1 && E.sw7.sky[0].length >= 3, "天空範圍是多邊形的清單");
});

test("tbGeo：橫式圖給條目的碑和 2560×1600 換算；原圖給 TB_STELE 和 768×1376", () => {
  let C = load(true), g = vm.runInContext("tbGeo", C)(frame(true));
  assert.equal(g.ST, vm.runInContext("TB_L1610.fx.stele", C)); assert.deepEqual(JSON.parse(JSON.stringify(g.pc(1280, 800))), [50, 50]);
  g = vm.runInContext("tbGeo", C)(frame(false));   // 同一個環境、圖框用原圖
  assert.equal(g.ST, vm.runInContext("TB_STELE", C)); assert.deepEqual(JSON.parse(JSON.stringify(g.pc(384, 688))), [50, 50]);
});

test("〔混合〕原始碼：開頁照 scwPre 選圖；place 照 tbGeo 放青苔和碑面；拓碑動畫照 tbGeo；掛 scwMount（apply＝place）", () => {
  assert.match(Y4, /const src=xqClImg\(`data\/termsmap\/\$\{tb2Dark\(\)\?"terms_night":"terms_day"\}\.webp\?v=\$\{TB2_IMGV\}`\),pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(Y4, /<img src="\$\{pre\.src\}" alt="書院碑林">/);
  assert.match(Y4, /const place=\(\)=>\{const\{ST,pc\}=tbGeo\(P\),at=k=>ST\.find\(s=>s\[0\]===k\);/);
  assert.match(Y4, /const rub=k=>\{const\{ST,pc\}=tbGeo\(P\),S=ST\.find\(s=>s\[0\]===k\);if\(!S\)return;/);
  assert.match(Y4, /ids:TB_STELE\.map\(s=>"tbT_"\+s\[0\]\),pfx:"tb",cfg0:cfg,apply:place\};scwMount\(P,o\);if\(pre\.k\)\{cfgNow=scwWalkCfg\(o,scwCur\(P\)\);P\._scwW="l"\}/);
  assert.match(Y4, /shwPage\(v,cfgNow,"tb"\)/);
  assert.doesNotMatch(Y4, /class="tb-face" data-k="\$\{k\}" style=/, "碑面不在開頁時寫死位置");
});
