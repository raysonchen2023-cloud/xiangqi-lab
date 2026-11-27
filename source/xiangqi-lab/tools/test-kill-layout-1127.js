// W192（11/27 開發者 iPhone 截圖「方 字體不完整，請修正」）：殺棋動畫「絕殺」「紅方／黑方」「你贏了！」三塊的位置。
// 原本固定百分比（絕殺 44%、紅方 69%、你贏了 80%），容器照棋盤比例時「絕殺」下緣會蓋到「紅方」頂端，「方」上面那一點被蓋掉。
// 用 vm 跑 00-util.js 真正的 kxLayout，配上 kill.json 三組各 10 版字形的高寬比（11/27 從 data/glyphs/kill.json 量的，寫死在這裡，
// 因為 kill.json 只在 CDN、公開倉庫沒有），在手機直式、iPad、3D 公園幾種容器比例下檢查：三塊不重疊、夠高的容器裡整組不出界。
// 改壞驗證：換回原本的固定百分比，手機直式一定要抓到重疊。不開瀏覽器。
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "../../xiangqi-db/m");
const U = fs.readFileSync(path.join(M, "00-util.js"), "utf8").replace(/\r\n/g, "\n");
const sl = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + a); return s.slice(i, j) };
const SRC = sl(U, "function kxLayout(", "\nconst loadKillGly");
const load = (src) => { const c = { Math }; vm.createContext(c); vm.runInContext(src + ";this.f=kxLayout", c); return c.f };

/* kill.json 各版 [高/寬]（data/glyphs/kill.json sha1 824077b5e9…，11/27） */
const KILL = [0.485, 0.496, 0.506, 0.552, 0.530, 0.482, 0.515, 0.503, 0.531, 0.588];
const HONG = [0.473, 0.513, 0.482, 0.416, 0.495, 0.496, 0.488, 0.474, 0.493, 0.513];
const HEI = [0.509, 0.525, 0.517, 0.531, 0.532, 0.554, 0.488, 0.517, 0.531, 0.546];
/* 容器（W×H，px）：手機直式棋盤（11/27 正式站 375 寬實測 359×397）、棋盤 560:620 比例的大小幾種、iPad 直向、3D 公園的扁、高幾種 */
const BOX = [[359, 397], [300, 332], [560, 620], [744, 823], [700, 775], [375, 520], [768, 900], [375, 360], [800, 600]];
const ch = (W) => W * .075 * 1.3, EPS = 0.5;

/* 照 killFx 的接法算三塊的上下緣；沒有勝方字時 sh＝0 */
function boxes(f, W, H, a, b) {
  const wh = W * .86 * a, sh = b ? W * .4 * b : 0, L = f(W, H, wh, sh, ch(W));
  return { L, g: W * .02, wTop: L.wy - wh / 2, wBot: L.wy + wh / 2, sTop: L.sy - sh / 2, sBot: L.sy + sh / 2, sh, cTop: L.cy, cBot: L.cy + ch(W) };
}
function problems(f) {
  const bad = [];
  for (const [W, H] of BOX) for (let i = 0; i < 10; i++) for (const side of [HONG, HEI, null]) for (let j = 0; j < (side ? 10 : 1); j++) {
    const k = boxes(f, W, H, KILL[i], side && side[j]), tag = `${W}×${H} 絕殺${i}${side ? (side === HONG ? " 紅" : " 黑") + j : ""}`;
    if (k.sh && k.wBot + k.g > k.sTop + EPS) bad.push(tag + "：絕殺下緣蓋到勝方字頂端 " + (k.wBot + k.g - k.sTop).toFixed(1) + "px");
    if (k.cTop < (k.sh ? k.sBot : k.wBot) + k.g - EPS) bad.push(tag + "：「你贏了」蓋到上一塊");
    if (k.wTop < H * .03 - EPS) bad.push(tag + "：絕殺頂端超出上緣");
    if (H >= W && k.cBot > H * .97 + EPS) bad.push(tag + "：整組超出下緣 " + (k.cBot - H * .97).toFixed(1) + "px");
  }
  return bad;
}

test("三塊不重疊、夠高的容器不出界：手機直式、iPad、3D 公園 × 絕殺 10 版 ×（紅方 10、黑方 10、沒有勝方字）", () => {
  assert.deepEqual(problems(load(SRC)), []);
});

test("手機直式 359×397：「紅方」頂端到「絕殺」下緣至少空 2% 寬；版面沒有被不必要地推動（不重疊時位置照舊 44%／69%／80%）", () => {
  const f = load(SRC), W = 359, H = 397;
  for (let i = 0; i < 10; i++) for (let j = 0; j < 10; j++) { const k = boxes(f, W, H, KILL[i], HONG[j]); assert.ok(k.sTop - k.wBot >= W * .02 - EPS, "絕殺" + i + " 紅" + j) }
  /* 很寬鬆的高容器（1000 高）不會重疊：三塊都照原本的百分比 */
  const k = boxes(f, 359, 1000, KILL[0], HONG[0]);
  assert.ok(Math.abs(k.L.wy - 440) < EPS && Math.abs(k.L.sy - 690) < EPS && Math.abs(k.L.cy - 800) < EPS, JSON.stringify(k.L));
});

test("改壞驗證：換回原本的固定百分比（44%、69%、80%），手機直式一定抓得到「絕殺」蓋到「紅方」", () => {
  const OLD = "function kxLayout(W,H,wh,sh,ch){return{wy:H*.44,sy:H*.69,cy:H*.8}}";
  const bad = problems(load(OLD));
  assert.ok(bad.some((x) => /^359×397 .*蓋到勝方字頂端/.test(x)), "舊算法要被抓到：" + bad.slice(0, 3).join("；"));
  /* 只拿掉「至少空一格」也要被抓到 */
  const NOGAP = SRC.replace("Math.max(H*.69,wb+g+sh/2)", "H*.69");
  assert.notEqual(NOGAP, SRC, "改壞替換要有命中");
  assert.ok(problems(load(NOGAP)).length > 0, "拿掉推開紅方那一步要被抓到");
});

test("隨機挑字跳過版 3（墨團）、版 7（重飛白）：10 版的陣列挑 3000 次不會出現 3、7，其他 8 版都輪得到；陣列只有 2 版時照常；改壞驗證：拿掉跳過要抓到", () => {
  const src = sl(U, "const KILL_SKIP=", "\nconst loadKillGly");
  const run = (s) => { const c = { Math }; vm.createContext(c); vm.runInContext(s + ";this.p=kxPick", c); return c.p };
  const P = run(src), A = [...Array(10).keys()], seen = new Set();
  for (let n = 0; n < 3000; n++) seen.add(P(A));
  assert.deepEqual([...seen].sort((a, b) => a - b), [0, 1, 2, 4, 5, 6, 8, 9]);
  assert.equal(P([]), null); assert.equal(P(null), null);
  const two = new Set(); for (let n = 0; n < 200; n++) two.add(P(["a", "b"])); assert.deepEqual([...two].sort(), ["a", "b"]);
  const BAD = src.replace("const KILL_SKIP=[3,7];", "const KILL_SKIP=[];"); assert.notEqual(BAD, src);
  const P2 = run(BAD), s2 = new Set(); for (let n = 0; n < 3000; n++) s2.add(P2(A));
  assert.ok(s2.has(3) && s2.has(7), "不跳過時版 3、7 會出現（改壞驗證成立）");
  assert.match(sl(U, "function killFx(", "\n  vibrate([70,50,140])"), /const pick=kxPick,G=KILL_GLY,/);
});

test("〔原始碼〕killFx 真的用 kxLayout 的結果擺「絕殺」、勝方字、朱印、「你贏了」", () => {
  const K = sl(U, "function killFx(", "\n  vibrate([70,50,140])");
  assert.match(K, /const KL=kxLayout\(W,H,kxWh,kxSh,W\*\.075\*1\.3\);wd\.style\.top=KL\.wy\+"px";if\(kxSd\)kxSd\.style\.top=KL\.sy\+"px";/);
  assert.match(K, /<i class="seal" style="top:\$\{KL\.wy\.toFixed\(1\)\}px;/);
  assert.match(K, /<div class="cap" style="top:\$\{KL\.cy\.toFixed\(1\)\}px">/);
  assert.match(K, /kxWh=wh;wd\.style\.cssText=/);
  assert.match(K, /kxSh=sh;kxSd=sd;/);
});
