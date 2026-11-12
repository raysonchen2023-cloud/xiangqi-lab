// 11/12 第一位真人玩家（P1，第一次下象棋）回饋（story/108_真人玩家紀錄_P1_2026-11-12.md）：
//   1「學走第一手」字再大一點 → 新手課下棋時說明、講解放大（07-legend boardPage 的 .camp-lv、m.css）
//   3「回到首頁的出入口第一次不知道在哪」→ 前 3 次進場景頁，出口亮框之外再加泡泡「要回去，點這裡」（07w-shipwalk shwXHi）
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const DB = path.join(__dirname, "..", "..", "xiangqi-db"), rd = f => fs.readFileSync(path.join(DB, f), "utf8");
const SW = rd("m/07w-shipwalk.js"), LG = rd("m/07-legend.js"), CSS = rd("m.css");

const src = (SW.match(/function shwXHi\(F,n\)\{[\s\S]*?\n  return b\}/) || [])[0];
function run({ seen = 0, busy = false, bubOk = true } = {}) {
  const st = { exTipN: seen }, bubs = [];
  const ex = { classList: { add() {}, remove() {} }, offsetWidth: 1 };
  const P = { querySelector: q => q === ".ex-spot" ? ex : null };
  const F = { isConnected: true, closest: () => P };
  const env = {
    document: { querySelector: q => (q.includes(".tmx-bub") && busy) ? {} : q === "#topbar #back" ? null : null },
    store: { get: (k, d) => k in st ? st[k] : d, set: (k, v) => { st[k] = v } },
    tmxBub: (el, h) => { bubs.push(h); return bubOk }, exCss: () => {}, setTimeout: () => {}
  };
  const r = new Function(...Object.keys(env), src + "\nreturn shwXHi(arguments[arguments.length-1],0);")(...Object.values(env), F);
  return { r, bubs, n: st.exTipN, ex };
}

test("〔混合〕前 3 次進場景頁：出口旁跳「要回去，點這裡」，第 4 次起只亮框", () => {
  assert.ok(src, "07w-shipwalk.js 找不到 shwXHi");
  for (let k = 0; k < 3; k++) { const o = run({ seen: k }); assert.deepStrictEqual(o.bubs, ["要回去，點這裡"]); assert.strictEqual(o.n, k + 1); assert.strictEqual(o.r, o.ex) }
  const o = run({ seen: 3 }); assert.deepStrictEqual(o.bubs, []); assert.strictEqual(o.n, 3);
});
test("〔混合〕別的泡泡或面板開著就不搶，也不算一次；泡泡沒顯示成功也不算", () => {
  const a = run({ busy: true }); assert.deepStrictEqual(a.bubs, []); assert.strictEqual(a.n, 0);
  const b = run({ bubOk: false }); assert.strictEqual(b.n, 0);
});
test("〔原始碼〕新手課下棋頁加 camp-lv；說明 17px、講解 16px，跟著 App 字級放大", () => {
  assert.match(LG, /function boardPage\(st\)\{v\.className="view fixed"\+\(\/\^camp\/\.test\(s\.id\)\?" camp-lv":""\);/);
  assert.match(CSS, /\.view\.camp-lv \.status\{font-size:calc\(17px \* var\(--fz,1\)\)/);
  assert.match(CSS, /\.view\.camp-lv \.note\{font-size:calc\(16px \* var\(--fz,1\)\)/);
});
