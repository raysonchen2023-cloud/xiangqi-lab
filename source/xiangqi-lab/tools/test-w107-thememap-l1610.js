// W107-L 第 1 批：主題訓練頁（07y3「演武迴廊」）iPad 橫向專用橫式圖。條目寫在 07y3 自己（TM_L1610），經典版、原圖共用。
// 檢查：條目登記進 07sw 的 SCW；8 塊牌四角順序（近到遠、左右交錯）、主題小牌與走路小動作照原本的算法從 tmq 算；走路路網；天氣範圍；
// 開頁照 scwPre 選圖、牌面和流蘇在 fit 裡照當下的圖重放、小動作照練習狀態。
// 用法 node --test xiangqi-lab/tools/test-w107-thememap-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), Y3 = M("m/07y3-thememap.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const PRE = cut(Y3, "const TM_Q=", "]]];") + "\n" + cut(Y3, "const TM_TAGAT=", ";") + "\n" + cut(Y3, "const TM_NODE=", ";") + "\n";
const ENTRY = cut(Y3, "const TM_L1610=", 'base:"thememap/theme_day_classic"})}');

function load() {
  const ctx = vm.createContext({ localStorage: { getItem: () => null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); vm.runInContext(PRE + ENTRY, ctx);
  return ctx;
}

test("條目：經典版、原圖都登記在 SCW、共用座標；檔名各自加 _l1610；07y3 的圖網址找得到", () => {
  const C = load(), SCW = vm.runInContext("SCW", C), A = SCW["thememap/theme_day_classic"], B = SCW["thememap/theme_day"];
  assert.ok(A && B); assert.equal(A.f, "thememap/theme_day_classic_l1610"); assert.equal(B.f, "thememap/theme_day_l1610"); assert.equal(B.base, "thememap/theme_day_classic");
  assert.equal(B.S, A.S); assert.equal(B.fx, A.fx); assert.equal(A.w, 2560); assert.equal(A.h, 1600); assert.equal(A.ready, true);
  assert.equal(vm.runInContext('scwKey("data/thememap/theme_day_classic.webp?v=2330")', C), "thememap/theme_day_classic");
  assert.equal(SCW["thememap/theme_night"], undefined, "夜版沒有橫式圖");
});

test("8 塊牌：四角在圖內、左上右上右下左下；順序照 TM_Q（近到遠、左右交錯：偶數在左、奇數在右，越遠越小）", () => {
  const C = load(), Q = vm.runInContext("TM_L1610.fx.tmq", C), Q0 = vm.runInContext("TM_Q", C);
  assert.equal(Q.length, 8); assert.equal(Q.length, Q0.length);
  const h = q => Math.max(q[2][1], q[3][1]) - Math.min(q[0][1], q[1][1]);
  Q.forEach((q, i) => {
    for (const [x, y] of q) assert.ok(x > 0 && x < 2560 && y > 0 && y < 1600, i + " 在圖內");
    assert.ok(q[0][0] < q[1][0] && q[3][0] < q[2][0], i + " 左邊在右邊左邊"); assert.ok(q[0][1] < q[3][1] && q[1][1] < q[2][1], i + " 上緣在下緣上面");
    const cx = (q[0][0] + q[2][0]) / 2; assert.ok(i % 2 ? cx > 1280 : cx < 1280, i + (i % 2 ? " 在右" : " 在左"));
    if (i >= 2) assert.ok(h(q) < h(Q[i - 2]), i + " 比同一邊近的那塊小（越遠越小）");
  });
});

test("主題小牌、走路小動作：照原本的算法從 tmq 算（小牌離牌緣 53px，閃擊、牽制在下方）；都在安全區內", () => {
  const C = load(), E = vm.runInContext("TM_L1610", C), Q = E.fx.tmq, AT = vm.runInContext("TM_TAGAT", C), NODE = vm.runInContext("TM_NODE", C);
  for (let i = 0; i < 8; i++) {
    const q = Q[i], s = E.S["tmT" + i], top = AT[i] === "t";
    assert.ok(Math.abs(s[0] - (q[0][0] + q[1][0]) / 2 / 25.6) < .01, i + " x");
    const y = top ? Math.min(q[0][1], q[1][1]) - 53 : Math.max(q[2][1], q[3][1]) + 53;
    assert.ok(Math.abs(s[1] - y / 16) < .01, i + " y"); if (top) assert.ok(s[1] * 16 < q[0][1]); else assert.ok(s[1] * 16 > q[2][1]);
    assert.ok(s[0] > E.safe.l * 100 && s[0] < 100 - E.safe.r * 100, i + " 在左右安全區內：" + s[0]);
    const hs = E.walk.HS["tmT" + i]; assert.equal(hs[0], NODE[i]); assert.ok(Math.abs(hs[1] - (q[0][0] + q[2][0]) / 2 / 25.6) < .01);
  }
});

test("走路：邊的兩端、小動作的站點都是節點；從 home 走得到每個節點；天氣範圍在圖內", () => {
  const C = load(), E = vm.runInContext("TM_L1610", C), W = E.walk, N = Object.keys(W.N), Ed = W.E.split(" ").map(e => e.split("-"));
  for (const [a, b] of Ed) { assert.ok(N.includes(a), a); assert.ok(N.includes(b), b) }
  for (const h of Object.values(W.HS)) assert.ok(N.includes(h[0]), h[0]);
  const seen = new Set(["home"]); let g = true;
  while (g) { g = false; for (const [a, b] of Ed) { if (seen.has(a) && !seen.has(b)) { seen.add(b); g = true } if (seen.has(b) && !seen.has(a)) { seen.add(a); g = true } } }
  assert.deepEqual([...seen].sort(), N.slice().sort());
  const [h0, y0, k] = W.h; assert.ok(h0 - (y0 - Math.min(...Object.values(W.N).map(p => p[1]))) * k > .02, "最遠的節點人物不會縮成負的");
  for (const poly of [...E.sw7.sky, ...E.sw7.fg]) for (const [x, y] of poly) assert.ok(x >= 0 && x <= 2560 && y >= 0 && y <= 1600);
  assert.equal(vm.runInContext('scwSw7("data/thememap/theme_day_classic_l1610.webp?v=1125",s=>/thememap/.test(s)?{k:"theme",re:/x/,m:"semi",sky:[],fg:[]}:null)', C).W, 2560, "07w7 拿得到橫式圖的天氣範圍");
});

test("〔混合〕原始碼：開頁照 scwPre 選圖；fit 照當下的圖（條目或 TM_Q）放牌面和流蘇；掛 scwMount（apply＝fit）；小動作照練習狀態", () => {
  assert.match(Y3, /const src=xqClImg\(`data\/thememap\/\$\{tmDark\(\)\?"theme_night":"theme_day"\}\.webp\?v=\$\{TM_IMGV\}`\),pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(Y3, /<img src="\$\{pre\.src\}" alt="演武迴廊">/);
  assert.match(Y3, /const fit=\(\)=>\{const e=typeof scwCur==="function"\?scwCur\(P\):null,G=e&&e\.fx&&e\.fx\.tmq\?e:null,Q=G\?G\.fx\.tmq:TM_Q,W=G\?G\.w:768,H=G\?G\.h:1376,k=P\.clientWidth\/W;/);
  assert.match(Y3, /P\.querySelectorAll\("\.tm-tas"\)\.forEach\(t=>\{const q=Q\[\+t\.dataset\.i\];/, "流蘇照當下的圖");
  assert.match(Y3, /f\.style\.transform=tmM3\(100,300,q\);/);
  assert.match(Y3, /for\(const n in TM_L1610\.walk\.HS\)TM_L1610\.walk\.HS\[n\]\[3\]=HS\[n\]\[3\];/, "練熟的歡呼");
  assert.match(Y3, /ids:TM_Q\.map\(\(q,i\)=>"tmT"\+i\),pfx:"tm",cfg0:cfg,apply:fit\};scwMount\(P,o\);if\(pre\.k\)\{cfgNow=scwWalkCfg\(o,scwCur\(P\)\);P\._scwW="l"\}/);
  assert.match(Y3, /shwPage\(v,cfgNow,"tm"\)/);
  assert.equal((Y3.match(/const k=P\.clientWidth\/768/g) || []).length, 0, "不再寫死 768 寬");
});
