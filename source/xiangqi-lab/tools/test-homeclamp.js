// 首頁棋鎮貼邊標籤推回畫面（07z-homemap.js hmClamp）的測試，不開瀏覽器。
// 開發者 11/12 hspx「回棋鎮的時候，今日推薦都會左右抖一下」：原本每次重算都先把 marginLeft 清成 0 再量再推回，
// 貼邊的標籤會先彈出去再回來。改成從目前位置扣掉推移量算原位，值沒變就不動。
// 用法：node --test xiangqi-lab/tools/test-homeclamp.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/07z-homemap.js"), "utf8").replace(/\r\n/g, "\n");
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, a); const j = s.indexOf(b, i + a.length); assert.ok(j > i, b); return s.slice(i, j) };
const FN = cut(SRC, "function hmClamp(P){", "r07HitSoon()}") + "r07HitSoon()}";

function kit(vw, mapL, mapR, spots) {
  const writes = [];
  const mk = sp => { const st = { _m: "" }; Object.defineProperty(st, "marginLeft", { get() { return st._m }, set(v) { writes.push([sp.id, v]); st._m = v } });
    return { id: sp.id, style: st, getBoundingClientRect() { const m = parseFloat(st._m) || 0; return { left: sp.x + m, right: sp.x + sp.w + m, width: sp.w } } } };
  const els = spots.map(mk), P = { getBoundingClientRect: () => ({ left: mapL, right: mapR }), querySelectorAll: () => els };
  const doc = { documentElement: { clientWidth: vw } };
  const hmClamp = new Function("document", "r07HitSoon", FN + ";return hmClamp")(doc, () => {});
  return { hmClamp, P, els, writes };
}

test("貼邊標籤推回畫面內 8px，右邊超出的往左推", () => {
  const K = kit(390, -20, 410, [{ id: "rec", x: -10, w: 100 }, { id: "mid", x: 150, w: 90 }, { id: "learn", x: 330, w: 80 }]);
  K.hmClamp(K.P);
  assert.equal(K.els[0].style.marginLeft, "18px", "左邊：-10 推到 8");
  assert.equal(K.els[1].style.marginLeft, "", "中間不動");
  assert.equal(K.els[2].style.marginLeft, "-28px", "右邊：410 推到 382");
});

test("重算多次不會先清掉再推回（不會抖）：值沒變就不寫", () => {
  const K = kit(390, -20, 410, [{ id: "rec", x: -10, w: 100 }]);
  K.hmClamp(K.P); const n = K.writes.length;
  K.hmClamp(K.P); K.hmClamp(K.P);
  assert.equal(K.writes.length, n, "第二、三次重算沒有寫任何 marginLeft");
  assert.ok(!K.writes.some(([, v]) => v === ""), "從來沒有先清成空字串");
  assert.equal(K.els[0].style.marginLeft, "18px");
});

test("畫面變寬、標籤不再超出時，推移量會收回", () => {
  const K = kit(390, -20, 410, [{ id: "rec", x: -10, w: 100 }]);
  K.hmClamp(K.P); assert.equal(K.els[0].style.marginLeft, "18px");
  const K2 = kit(390, -40, 430, []); K.P.getBoundingClientRect = () => ({ left: -40, right: 430 });
  const doc = { documentElement: { clientWidth: 600 } };
  const hm2 = new Function("document", "r07HitSoon", FN + ";return hmClamp")(doc, () => {});
  K.P.getBoundingClientRect = () => ({ left: 0, right: 600 });
  K.els[0].getBoundingClientRect = function () { const m = parseFloat(this.style.marginLeft) || 0; return { left: 20 + m, right: 120 + m, width: 100 } };
  hm2(K.P); assert.equal(K.els[0].style.marginLeft, "", "原位已在畫面內，推移量收回");
  void K2;
});
