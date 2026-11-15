// 11/15 開發者（幻譜星門・紫淵對局截圖，圈起背景，跳出「山水亭橋——經典古風・不限朝代・遠方的風景」）「修正」
// 在星系裡點遠方，原本照玩家主題跳朝代的遠景說明，還可能撿到朝代的珍品。改成跳那個星系自己的說明卡
// （xiangqi-db/m/07gx-galaxy.js gxParkInfo；06-cpu.js parkInfo 先問它）。這裡把 07gx 整支放進假環境實際跑。
// 用法：node --test xiangqi-lab/tools/test-gx-parkinfo-1115.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = f => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const GX = rd("xiangqi-db/m/07gx-galaxy.js"), CPU = rd("xiangqi-db/m/06-cpu.js");

function kit(journey) {
  const mem = {}, sheets = [], store = { get: (k, d) => k in mem ? JSON.parse(mem[k]) : d, set: (k, v) => { mem[k] = JSON.stringify(v) } };
  const env = { store, window: {}, location: { hash: "#/cpu" }, esc: s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;"), vibrate() { }, toast() { }, modal() { },
    sheet: (t, f) => { const b = { innerHTML: "" }; f(b); sheets.push({ t, html: b.innerHTML }) }, PARK: null,
    document: { getElementById: () => null, querySelector: () => null, createElement: () => ({}), head: { append() { } }, body: { append() { } } } };
  const names = Object.keys(env), K = new Function(...names, GX + ";return{gxParkEx,gxParkInfo:k=>gxParkInfo(k),setPark:p=>{PARK=p},GX_LIST,GX_ORD}")(...names.map(k => env[k]));
  if (journey !== undefined) K.setPark({ last: { ex: journey ? K.gxParkEx({ journey }) : { era: "classic", bg: null } } });
  return Object.assign(K, { sheets });
}

test("〔行為〕紫淵裡點遠方：跳紫淵的說明卡（守關的、規則、過關條件、他的話），不是山水亭橋", () => {
  const K = kit("gx:ziyuan");
  assert.equal(K.gxParkInfo("bg"), true);
  assert.equal(K.sheets.length, 1); const S = K.sheets[0];
  assert.equal(S.t, "🌌 幻譜星門・紫淵");
  for (const w of ["十三星系・紫淵的星空", "不是人間的園子", "破軍幻影", "重炮陣：他的兩個象換成炮，一共四門炮。", "過關條件：將死他。", "「這般殺陣，我已演練過萬次。」"]) assert.ok(S.html.includes(w), "卡片要有：" + w);
  assert.ok(!/山水亭橋|經典古風|不限朝代/.test(S.html + S.t));
});

test("〔行為〕開放的九個星系與第十四顆都有自己的卡；遠景上的地標、地名代號也走星系的卡", () => {
  for (const id of [...kit().GX_ORD, "mirror"]) {
    const K = kit("gx:" + id), g = K.GX_LIST.find(x => x.id === id);
    assert.equal(K.gxParkInfo("bg"), true, id); assert.equal(K.sheets[0].t, "🌌 幻譜星門・" + (g ? g.n : "第十四顆"));
    assert.ok(K.sheets[0].html.includes("過關條件："), id + " 有過關條件"); assert.ok(!/undefined|null/.test(K.sheets[0].html), id + " 沒有漏資料");
  }
  const K = kit("gx:taisu"); assert.equal(K.gxParkInfo("pano:泰山"), true); assert.equal(K.gxParkInfo("map:長安"), true); assert.equal(K.sheets.length, 2);
});

test("〔行為〕星系裡點別的東西（對手、自己、石桌、茶杯、小黑洞）不攔，照原本的走", () => {
  const K = kit("gx:ziyuan");
  for (const k of ["opp", "mate", "table", "cup", "stool", "orb", "p:legend"]) assert.equal(K.gxParkInfo(k), false, k);
  assert.equal(K.sheets.length, 0);
});

test("〔行為〕不在星系（一般園子、還沒開 3D）：一律不攔，遠景照朝代的說明", () => {
  const A = kit(null); assert.equal(A.gxParkInfo("bg"), false); assert.equal(A.sheets.length, 0);
  const B = kit(); assert.equal(B.gxParkInfo("bg"), false); assert.equal(B.sheets.length, 0);
});

test("〔原始碼〕parkInfo 在撿珍品、朝代說明之前先問星系；場景參數帶星系代號", () => {
  const i = CPU.indexOf("function parkInfo(k){"), a = CPU.indexOf('if(typeof gxParkInfo==="function"&&gxParkInfo(k))return;', i), r = CPU.indexOf("relicDrop(era)", i), s = CPU.indexOf("secretFind(era,k)", i);
  assert.ok(i > 0 && a > i, "parkInfo 有先問 gxParkInfo"); assert.ok(a < r && a < s, "排在秘境棋友、撿珍品之前");
  assert.ok(GX.includes("gx:{c:g.c,c2:g.c2||null,id}"), "gxParkEx 把星系代號放進場景參數");
});
