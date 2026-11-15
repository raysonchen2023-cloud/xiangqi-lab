// 11/15 開發者「黑洞對戰 default 開成全局俯視，不然 48° 立體看不清楚線」（m/07bht-td.js 的 bhtdView）：
// 預設本來就是全局俯視；視角鈕點一下就換下一種而且會記住，所以這一版把「記成臨陣斜角」的重設回全局俯視一次，之後自己再選的照舊記住。
// 用法：node --test xiangqi-lab/tools/test-bhtd-view-1115.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const TD = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07bht-td.js"), "utf8");
const SRC = TD.match(/const bhtdView=\(\)=>\{[^\n]*?return BHTD_VW\[v\]\?v:"top"\};/);
const mk = init => { const m = new Map(Object.entries(init)); const store = { get: (k, d) => (m.has(k) ? m.get(k) : d), set: (k, v) => { m.set(k, v) } };
  const BHTD_VW = { top: "全局俯視", tilt: "臨陣斜角", flat: "純淨平面" }; return { view: new Function("store", "BHTD_VW", SRC[0] + "return bhtdView")(store, BHTD_VW), m } };

test("〔原始碼〕找得到 bhtdView；三種視角的名字與說明沒有變", () => {
  assert.ok(SRC, "bhtdView 是一行");
  assert.ok(TD.includes('const BHTD_VW={top:"全局俯視",tilt:"臨陣斜角",flat:"純淨平面"},BHTD_VWD={top:"68° 看全盤",tilt:"48° 看立體",flat:"2D 平面棋盤"};'));
});

test("〔行為〕新玩家（沒存過視角）＝全局俯視", () => {
  const { view, m } = mk({}); assert.equal(view(), "top"); assert.equal(m.get("bhtdViewR"), 1); assert.equal(m.has("bhtdView"), false, "沒存過的不用多寫一筆");
});

test("〔行為〕之前記成臨陣斜角的：重設回全局俯視一次", () => {
  const { view, m } = mk({ bhtdView: "tilt" }); assert.equal(view(), "top"); assert.equal(m.get("bhtdView"), "top"); assert.equal(m.get("bhtdViewR"), 1);
  assert.equal(view(), "top", "再問一次還是俯視");
});

test("〔行為〕重設過之後自己再選臨陣斜角：照舊記住，不會又被改回去", () => {
  const { view, m } = mk({ bhtdView: "tilt" }); view(); m.set("bhtdView", "tilt");
  assert.equal(view(), "tilt"); assert.equal(view(), "tilt");
});

test("〔行為〕選純淨平面的不動；存到怪值時當成全局俯視", () => {
  const a = mk({ bhtdView: "flat" }); assert.equal(a.view(), "flat"); assert.equal(a.m.get("bhtdView"), "flat");
  const b = mk({ bhtdView: "side", bhtdViewR: 1 }); assert.equal(b.view(), "top");
});

test("〔行為〕存檔壞掉（讀寫丟例外）也回全局俯視，不會讓對局頁壞掉", () => {
  const BHTD_VW = { top: 1, tilt: 1, flat: 1 }, store = { get() { throw new Error("x") }, set() { throw new Error("x") } };
  const view = new Function("store", "BHTD_VW", SRC[0] + "return bhtdView")(store, BHTD_VW); assert.equal(view(), "top");
});
