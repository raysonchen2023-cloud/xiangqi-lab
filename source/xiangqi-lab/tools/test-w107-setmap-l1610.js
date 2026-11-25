// W107-L 第 1 批：設定頁（07s2「天字客房」）iPad 橫向專用橫式圖。
// 條目寫在 07s2 自己（SM_L1610），經典版 set_day_classic、原圖 set_day 共用一套座標（Windows Claude 1 量，原圖對齊回經典版）。
// 檢查：條目在 07sw 的登記表裡、入口和走路都齊、座標在圖內；smScene 用橫式圖時不換日夜圖、棋盤描金／棋盤框／琴囊／深色燈照條目，用原圖時照舊。
// 用法 node --test xiangqi-lab/tools/test-w107-setmap-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), S2 = M("m/07s2-setmap.js");

function load(extra) {
  const ctx = vm.createContext({ localStorage: { getItem: () => null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx);
  vm.runInContext(extra || "", ctx);
  return ctx;
}
// 07s2 整支在 vm 跑要一堆全域；條目那段單獨切出來跑（從 const SM_L1610 到 if(typeof SCW...) 那一行結束）
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const ENTRY = cut(S2, "const SM_L1610=", 'base:"setmap/set_day_classic"})}');
const SPOT_IDS = [...S2.matchAll(/\["(sm[A-Z][A-Za-z]+)",\d/g)].map(m => m[1]);

test("條目：經典版、原圖兩張都登記在 07sw 的 SCW，共用座標、檔名各自加 _l1610", () => {
  const C = load(ENTRY), SCW = vm.runInContext("SCW", C);
  const A = SCW["setmap/set_day_classic"], B = SCW["setmap/set_day"];
  assert.ok(A && B);
  assert.equal(A.f, "setmap/set_day_classic_l1610"); assert.equal(B.f, "setmap/set_day_l1610"); assert.equal(B.base, "setmap/set_day_classic");
  assert.equal(A.w, 2560); assert.equal(A.h, 1600); assert.equal(A.ready, true);
  assert.equal(B.S, A.S, "原圖對齊回經典版，入口座標共用"); assert.equal(B.fx, A.fx); assert.equal(B.walk, A.walk);
  assert.equal(vm.runInContext('scwKey("data/setmap/set_day_classic.webp?v=2300")', C), "setmap/set_day_classic", "07s2 的圖網址找得到條目");
});

test("入口：16 個器物都有橫式座標和走路小動作，都在安全區內；出口在圖內", () => {
  const C = load(ENTRY), A = vm.runInContext('SCW["setmap/set_day_classic"]', C);
  assert.equal(SPOT_IDS.length, 16, "SM_SPOTS 有 16 個入口");
  for (const id of SPOT_IDS) {
    const p = A.S[id]; assert.ok(p, "缺橫式座標：" + id);
    assert.ok(p[0] >= A.safe.l * 100 - 4 && p[0] <= 100 - A.safe.r * 100 + 4, id + " x 超出安全區：" + p[0]);
    assert.ok(p[1] > A.safe.t * 100 && p[1] < 100 - A.safe.b * 100 + 1, id + " y 超出安全區：" + p[1]);
    assert.ok(A.walk.HS[id], "缺走路小動作：" + id);
  }
  assert.ok(A.exit[0] > 0 && A.exit[0] < 100 && A.exit[1] > 0 && A.exit[1] < 100);
});

test("走路：邊的兩端、小動作的站點都是節點；從 home 走得到每個節點", () => {
  const C = load(ENTRY), W = vm.runInContext('SCW["setmap/set_day_classic"].walk', C);
  const N = Object.keys(W.N), E = W.E.split(" ").map(e => e.split("-"));
  for (const [a, b] of E) { assert.ok(N.includes(a), "邊 " + a); assert.ok(N.includes(b), "邊 " + b) }
  for (const [id, h] of Object.entries(W.HS)) assert.ok(N.includes(h[0]), id + " 的站點 " + h[0]);
  const seen = new Set(["home"]); let grow = true;
  while (grow) { grow = false; for (const [a, b] of E) { if (seen.has(a) && !seen.has(b)) { seen.add(b); grow = true } if (seen.has(b) && !seen.has(a)) { seen.add(a); grow = true } } }
  assert.deepEqual([...seen].sort(), N.slice().sort(), "每個節點都接得到 home");
  for (const [x, y] of Object.values(W.N)) assert.ok(x > 0 && x < 100 && y > 0 && y < 100);
  assert.equal(W.home, "home"); assert.equal(W.W, 2560); assert.equal(W.H, 1600);
  const [h0, y0, k] = W.h; assert.ok(h0 - (y0 - 50) * k > 0.03, "最裡面（y 50）的人物不能縮到看不見");
});

test("疊圖座標：棋盤四角在圖內、左上左下右下右上；琴囊、3 盞燈在圖內", () => {
  const C = load(ENTRY), F = vm.runInContext('SCW["setmap/set_day_classic"].fx', C);
  const [tl, bl, br, tr] = F.board;
  for (const [x, y] of F.board) assert.ok(x > 0 && x < 2560 && y > 0 && y < 1600);
  assert.ok(tl[1] < bl[1] && tr[1] < br[1], "上緣在下緣上面"); assert.ok(tl[0] < tr[0] && bl[0] < br[0], "左邊在右邊左邊");
  assert.ok(F.bag.l > 0 && F.bag.l + F.bag.w < 100 && F.bag.t > 0 && F.bag.t + F.bag.h < 100);
  assert.equal(F.lamp.length, 3); for (const [x, y] of F.lamp) assert.ok(x > 0 && x < 100 && y > 0 && y < 100);
});

// smScene 在 vm 跑：只給它用到的全域，fx.innerHTML 收畫出來的東西
function scene({ wide, dark, mute, hiCon, era }) {
  const st = { hiCon: !!hiCon, mvSound: !mute, voiceCall: !mute, bgm: !mute, pageTheme: dark ? "dark" : "light" };
  const imgs = [];
  const ctx = vm.createContext({ Math, String, Array, Object, JSON,
    store: { get: (k, d) => k in st ? st[k] : d }, matchMedia: () => ({ matches: false }), xqClImg: s => s,
    boardEraE: () => era ? { b: { bg: ["#c9a66b", "#7a4a24"] } } : null, Image: function () { imgs.push(this) } });
  vm.runInContext(cut(S2, "const SM_IMGV=", ";") + "\n" + cut(S2, "const SM_BOARD=", ";") + "\n" + ENTRY.replace(/if\(typeof SCW!=="undefined"\)\{[^\n]*\}\s*$/, "") + "\n" +
    cut(S2, "const smDark=", "\n") + cut(S2, "const smMute=", "\n") + cut(S2, "const smAt=", "\n") + cut(S2, "function smScene(P){", "  fx.innerHTML=h}"), ctx);
  ctx.scwCur = P => wide ? vm.runInContext("SM_L1610", ctx) : null;
  const fx = { innerHTML: "", querySelector: () => null, querySelectorAll: () => [] };
  const img = { isConnected: true, src: "data/setmap/set_day_classic.webp?v=2300", _set: 0 };
  const img0 = img.src;
  const P = { querySelector: q => q === ".sm-fx" ? fx : img };
  vm.runInContext("smScene", ctx)(P);
  return { h: fx.innerHTML, img, img0, imgs };
}

test("smScene 用橫式圖：深色不換夜版直圖（換了會把橫式圖蓋掉），疊調暗層＋條目的 3 盞燈；原圖照舊去載夜版", () => {
  const W = scene({ wide: true, dark: true });
  assert.equal(W.imgs.length, 0, "橫式圖不載夜版直圖"); assert.equal(W.img.src, W.img0);
  assert.match(W.h, /sm-night/); assert.equal((W.h.match(/sm-lamp/g) || []).length, 3);
  assert.match(W.h, /left:50%;top:25%;width:10%/, "第一盞燈照條目、寬度照圖變寬縮小");
  const N = scene({ wide: false, dark: true });
  assert.equal(N.imgs.length, 1, "原圖：深色照舊先載夜版"); assert.match(N.imgs[0].src, /set_night/);
  assert.match(N.h, /left:80%;top:30%/, "原圖的燈照舊");
});

test("smScene 用橫式圖：琴囊、棋盤框、高對比描金照條目；原圖照 SM_BOARD 的像素", () => {
  const W = scene({ wide: true, mute: true, era: true, hiCon: true });
  assert.match(W.h, /class="sm-bag"[^>]*left:64\.6%;top:53\.2%;width:22%;height:3\.6%;transform:rotate\(16deg\)/, "琴囊照條目，斜放");
  const fr = /class="sm-frame" style="left:([\d.]+)%;top:([\d.]+)%;width:([\d.]+)%/.exec(W.h); assert.ok(fr, "有棋盤框");
  assert.ok(Math.abs(+fr[1] - (1106 / 25.6 - .6)) < .05, "框左緣＝條目左下角 x：" + fr[1]);
  assert.ok(Math.abs(+fr[2] - (543 / 16 - .4)) < .05, "框上緣＝條目左上角 y：" + fr[2]);
  const g = [...W.h.matchAll(/class="sm-gold" style="left:([\d.]+)%;top:([\d.]+)%/g)].map(m => [+m[1], +m[2]]);
  assert.equal(g.length, 32, "32 顆描金");
  for (const [x, y] of g) { assert.ok(x > 1106 / 25.6 - 1 && x < 1367 / 25.6 + 1, "描金 x 在橫式棋盤上：" + x); assert.ok(y > 543 / 16 - 1 && y < 627 / 16 + 1, "描金 y 在橫式棋盤上：" + y) }
  const N = scene({ wide: false, mute: true, era: true, hiCon: true });
  assert.match(N.h, /<i class="sm-bag" title="琴囊"><\/i>/, "原圖琴囊照 CSS 原位");
  const g0 = [...N.h.matchAll(/class="sm-gold" style="left:([\d.]+)%;top:([\d.]+)%/g)].map(m => [+m[1], +m[2]]);
  for (const [x, y] of g0) { assert.ok(x > 343 / 7.68 - 1 && x < 447 / 7.68 + 1); assert.ok(y > 453 / 13.76 - 1 && y < 486 / 13.76 + 1) }
});

test("〔混合〕原始碼：開頁照 scwPre 選圖、掛 scwMount（入口＝SM_SPOTS、apply 重畫疊圖）、走路照條目", () => {
  assert.match(S2, /const src=xqClImg\(`data\/setmap\/set_day\.webp\?v=\$\{SM_IMGV\}`\),pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(S2, /<img src="\$\{pre\.src\}" alt="天字客房">/);
  assert.match(S2, /const o=\{key:scwKey\(src\),src0:src,ids:SM_SPOTS\.map\(z=>z\[0\]\),pfx:"set",cfg0:cfg,apply:\(\)=>smScene\(P\)\};scwMount\(P,o\);if\(pre\.k\)\{cfgNow=scwWalkCfg\(o,scwCur\(P\)\);P\._scwW="l"\}/);
  assert.match(S2, /shwPage\(v,cfgNow,"set"\)/);
  const m = M("m.html"), i7 = m.indexOf("m/07sw-scenewide.js"), i2 = m.indexOf("m/07s2-setmap.js");
  assert.ok(i7 > 0 && i2 > i7, "07sw 在 07s2 前面載入（條目寫進 SCW）");
});
