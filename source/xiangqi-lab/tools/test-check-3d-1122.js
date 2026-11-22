// W67（11/22）：封測 P0-3D 真實觸控檢查 xiangqi-android/scripts/check-3d.js 的判斷規則
//   這支要開模擬器、裝好候選包才跑得完；這裡只驗「怎麼判」：不開模擬器、不連網。
//   P0-3D（3D 落點按不到，W02）：挑得出畫面安全區裡的候選、鏡頭沒停穩不點、座標換算含 WebView 位移、
//   成不成功只看棋譜有沒有多出那一步；九個情境一個都不能少；用法錯誤是結束碼 2（不能當通過）。
// 用法：node --test xiangqi-lab/tools/test-check-3d-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), cp = require("child_process");
const F = path.join(__dirname, "..", "..", "xiangqi-android", "scripts", "check-3d.js");
const { SCENARIOS, SAFE, PREFER, ONLY, BODY_TRIES, chooseMoves, settled, toDevice, moved, webViewBounds, bodyPoint, padPresses, knownFor, covered, inTop } = require(F);

test("九個情境都在，跟發版回歸驗收規則 P0-3D 一致（含翻面後黑方、黑洞正背面、星門圍城兩種視角）", () => {
  assert.deepEqual(SCENARIOS, ["cpu", "inn", "pvp-red", "pvp-black", "simul", "bhx-front", "bhx-back", "siege-top", "siege-iso"]);
});

test("挑候選：落點要是空格、起點落點都在安全區、同一顆子只挑一次、最多 4 個", () => {
  const board = Array(90).fill(null); board[5] = "p";
  const pts = { 1: { x: 100, y: 300 }, 2: { x: 120, y: 320 }, 3: { x: 10, y: 300 }, 4: { x: 100, y: 300 }, 5: { x: 140, y: 340 }, 6: { x: 100, y: 150 }, 7: { x: 200, y: 400 }, 8: { x: 210, y: 410 } };
  const legal = [[1, 5], [1, 2], [1, 4], [3, 2], [4, 6], [4, 2], [7, 8], [8, 7]];
  /* [1,5] 落點有子不要；[1,2] 選上；[1,4] 同一顆子不再挑；[3,2] 起點太靠左；[4,6] 落點在上方按鈕區；[4,2] 選上；[7,8]、[8,7] 選上 */
  assert.deepEqual(chooseMoves(legal, board, pts, 375, 812), [[1, 2], [4, 2], [7, 8], [8, 7]]);
  assert.deepEqual(chooseMoves(legal, board, pts, 375, 812, 2), [[1, 2], [4, 2]]);
  /* 下緣：y 要小於 812-140 */
  assert.deepEqual(chooseMoves([[1, 2]], board, { 1: { x: 100, y: 300 }, 2: { x: 100, y: 812 - SAFE.bottom } }, 375, 812), []);
  /* 不在畫面上（screenOf 回 null）的格子不挑 */
  assert.deepEqual(chooseMoves([[1, 9]], board, { 1: { x: 100, y: 300 } }, 375, 812), []);
});

test("優先著法：黑洞只試正解 22→13（殘局題只接受正解），可以是吃子；一般情境先試優先的再接其他", () => {
  const board = Array(90).fill(null); board[13] = "a";
  const pts = {}; for (const q of [22, 13, 23, 21, 30, 31]) pts[q] = { x: 150, y: 400 };
  const legal = [[22, 23], [22, 13], [22, 21], [30, 31]];
  assert.deepEqual(PREFER.bhx, [[22, 13]]);
  assert.equal(ONLY.bhx, true);
  assert.deepEqual(chooseMoves(legal, board, pts, 375, 812, 4, PREFER.bhx, true), [[22, 13]], "只試正解，吃子也可以");
  assert.deepEqual(chooseMoves(legal, board, pts, 375, 812, 4, PREFER.bhx, false), [[22, 13], [30, 31]], "不限定時正解排第一，同一顆子不再挑");
  assert.deepEqual(chooseMoves([[22, 23]], board, pts, 375, 812, 4, PREFER.bhx, true), [], "正解不合法就沒有候選");
});

test("起點點在棋子身上：格子到頭頂之間照比例取點；沒有頭頂（一般棋子）就點格子；高度依序試、第一個是 0.3", () => {
  assert.deepEqual(bodyPoint({ x: 100, y: 400 }, { x: 110, y: 300 }, 0.3), { x: 103, y: 370 });
  assert.deepEqual(bodyPoint({ x: 100, y: 400 }, null, 0.5), { x: 100, y: 400 });
  assert.equal(BODY_TRIES[0], 0.3);
  assert.ok(BODY_TRIES.length >= 4 && BODY_TRIES.every((k) => k >= 0 && k <= 1.2));
});

test("黑洞背面十字鍵：算出要按哪個鍵、按幾下（紅方不翻面▲＝列號 −1；▶ 看畫面右邊那格是 +1 還是 −1）", () => {
  /* 22（第 2 列第 4 行）→ 13（第 1 列第 4 行）：往上一格 */
  assert.deepEqual(padPresses(22, 13, -1, 1), [{ key: "up", n: 1 }]);
  /* 20（2,2）→ 1（0,1）：上兩下、左一下；畫面左右鏡像時改按右 */
  assert.deepEqual(padPresses(20, 1, -1, 1), [{ key: "up", n: 2 }, { key: "lf", n: 1 }]);
  assert.deepEqual(padPresses(20, 1, -1, -1), [{ key: "up", n: 2 }, { key: "rt", n: 1 }]);
  /* 翻面（黑方）▲＝列號 +1 */
  assert.deepEqual(padPresses(4, 22, 1, 1), [{ key: "up", n: 2 }]);
  assert.deepEqual(padPresses(30, 30, -1, 1), []);
});

test("已知問題只認清單裡情境、種類相符、沒過期限的；清單在倉庫 .github/p0-known.json（改它＝放寬閘門，要逐行審）", () => {
  const L = [{ id: "W68", check: "p0-3d", scenario: "bhx-back", kind: "start-unselectable", until: "20261206" }];
  assert.equal(knownFor(L, "bhx-back", "start-unselectable", "20261122-0804").id, "W68");
  assert.equal(knownFor(L, "bhx-back", "start-unselectable", "20261206-2359").id, "W68", "期限當天還算");
  assert.equal(knownFor(L, "bhx-back", "start-unselectable", "20261207-0001"), null, "過期就不放行");
  assert.equal(knownFor(L, "bhx-front", "start-unselectable", "20261122-0804"), null, "情境不同不算");
  assert.equal(knownFor(L, "bhx-back", "target-covered", "20261122-0804"), null, "種類不同不算");
  assert.equal(knownFor([{ ...L[0], until: "2026-12-06" }], "bhx-back", "start-unselectable", "20261122-0804"), null, "期限格式不對就不放行");
  assert.equal(knownFor([], "bhx-back", "start-unselectable", "20261122-0804"), null);
  const real = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "site", ".github", "p0-known.json"), "utf8"));
  for (const x of real.items) {
    assert.match(x.id, /^W[0-9]+$/);
    assert.match(String(x.until), /^[0-9]{8}$/);
    assert.ok(x.why && x.decided, x.id + " 要寫原因和開發者決定的來源");
  }
});

test("落點被蓋住：畫面內的合法落點，elementFromPoint 不是 3D 畫布就算被蓋住（W02）；畫面外的不算", () => {
  const hits = [{ t: 1, inView: true, tag: "CANVAS" }, { t: 2, inView: true, tag: "BUTTON", by: "pk-zoom" }, { t: 3, inView: false, tag: "" }];
  assert.deepEqual(covered(hits).map((h) => h.t), [2]);
  assert.deepEqual(covered([{ t: 1, inView: true, tag: "CANVAS" }]), []);
});

test("上緣帶優先：同桌紅黑先挑落點在畫面上緣帶（W02 出事的區域）的著法", () => {
  const board = Array(90).fill(null);
  const pts = { 1: { x: 100, y: 400 }, 2: { x: 120, y: 120 }, 3: { x: 140, y: 420 }, 4: { x: 150, y: 380 } };
  assert.equal(inTop({ x: 120, y: 120 }, 375), true);
  assert.equal(inTop({ x: 120, y: 200 }, 375), false);
  assert.equal(inTop({ x: 120, y: -5 }, 375), false, "畫面外不算");
  assert.deepEqual(chooseMoves([[3, 4], [1, 2]], board, pts, 375, 812, 4, [], false, true)[0], [1, 2]);
  assert.deepEqual(chooseMoves([[3, 4], [1, 2]], board, pts, 375, 812, 4, [], false, false), [[3, 4]], "不優先時上緣的落點不在安全區、不挑");
});

test("鏡頭停穩：要最後三次取樣都動不到 1 像素；還在動就不點", () => {
  const P = (x) => ({ f: { x, y: 300 }, t: { x: x + 50, y: 400 } });
  assert.equal(settled([P(100), P(100)]), false, "取樣不到三次");
  assert.equal(settled([P(60), P(100), P(100.4), P(100.2)]), true);
  assert.equal(settled([P(100), P(100), P(135)]), false, "A12 鏡頭還在動時落點偏了 35 像素");
  assert.equal(settled([P(100), P(101.5), P(100)]), false);
});

test("座標換算：CSS 像素 × devicePixelRatio ＋ WebView 位移，四捨五入成整數", () => {
  assert.deepEqual(toDevice({ x: 100.4, y: 200.6 }, 2.625, { x: 0, y: 63 }), { x: 264, y: 590 });
  assert.deepEqual(toDevice({ x: 10, y: 10 }, 3, { x: 0, y: 0 }), { x: 30, y: 30 });
});

test("成不成功只看棋譜：原本長度之後多出 f、t 相符的那一步才算", () => {
  const M = [{ f: 1, t: 2 }, { f: 3, t: 4 }];
  assert.equal(moved(1, M, [3, 4]), true);
  assert.equal(moved(2, M, [3, 4]), false, "舊的那一步不能算");
  assert.equal(moved(1, M, [3, 5]), false, "走到別格不算");
  assert.equal(moved(0, [], [1, 2]), false);
});

test("WebView 位置：從 uiautomator dump 讀 bounds（兩種屬性順序都讀得到），沒有就回 null", () => {
  assert.deepEqual(webViewBounds('<node class="android.webkit.WebView" text="" bounds="[0,63][1080,2400]" />'), { x: 0, y: 63, right: 1080, bottom: 2400 });
  assert.deepEqual(webViewBounds('<node bounds="[0,0][1440,3120]" class="android.webkit.WebView" />'), { x: 0, y: 0, right: 1440, bottom: 3120 });
  assert.equal(webViewBounds('<node class="android.widget.FrameLayout" bounds="[0,0][1,1]" />'), null);
});

test("用法錯誤：沒給 --build 就結束碼 2，不能被當成通過", () => {
  const r = cp.spawnSync(process.execPath, [F], { encoding: "utf8" });
  assert.equal(r.status, 2);
  assert.match(r.stderr, /用法/);
});
