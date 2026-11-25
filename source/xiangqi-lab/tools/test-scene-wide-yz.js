// W107-L 第 3 批：驛站（07m-yizhan.js）在 iPad 橫向換成 2560×1600 橫式圖，13 朝各一套座標（Windows Claude 1 量，output/w107-ipad/l1610/yizhan/yz_l1610.json）。
// 入口、景點、出口照條目；走路用橫式圖時在 07m 先照條目掛（07w 包的那次看到已掛過就略過），記憶名 yzL:<朝>；進門水墨暈開（07p yzColor）在橫式圖上不播。
// 不開瀏覽器：07sw＋07m 在 vm 跑。用法 node --test xiangqi-lab/tools/test-scene-wide-yz.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), YZ = M("m/07m-yizhan.js"), PC = M("m/07p-portcolor.js");
const ERAS = ["classic", "qin", "han", "sanguo", "weijin", "nanbei", "sui", "tang", "wudai", "song", "yuan", "ming", "qing"];
function load(dev, extra) {
  const ctx = vm.createContext(Object.assign({ setTimeout: () => 0, clearTimeout: () => { }, addEventListener: () => { }, isFinite, Math, Object, String, JSON, Set, localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null } }, extra || {}));
  vm.runInContext(SW, ctx); vm.runInContext(YZ, ctx);
  return ctx;
}
const J = x => JSON.parse(JSON.stringify(x));

test("條目：13 朝都登記（鍵＝原圖 yizhan/<朝>_f、圖 <朝>_f_l1610），跟 YZ_READY 一致；SCW_CDN 還是 false＝正式玩家照舊原圖", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), ent = vm.runInContext("scwEntry", C), RD = vm.runInContext("[...YZ_READY]", C);
  assert.deepEqual(J(RD).sort(), [...ERAS].sort());
  for (const k of ERAS) {
    const e = SCW["yizhan/" + k + "_f"]; assert.ok(e && e.ready, k); assert.equal(e.f, "yizhan/" + k + "_f_l1610"); assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.ok(ent("yizhan/" + k + "_f"));
    assert.deepEqual(J(e.exit), [14, 92]); assert.deepEqual([e.walk.W, e.walk.H, e.walk.home], [2560, 1600, "home"]);
  }
  assert.equal(vm.runInContext("scwKey", C)("data/yizhan/classic_f.webp?v=1115"), "yizhan/classic_f", "經典版網址帶版本也對得到鍵");
  assert.equal(ent("yizhan/qing_c"), null, "淡彩退回圖沒有橫式版");
  assert.equal(vm.runInContext("scwEntry", load(false))("yizhan/qing_f"), null);
});

test("入口：經典有點將台、沒有景點；其他 12 朝有景點、沒有點將台；都在圖裡；量好的點寫死比對（清版景點挪開信箱）", () => {
  const SCW = vm.runInContext("SCW", load(true));
  for (const k of ERAS) {
    const S = SCW["yizhan/" + k + "_f"].S, ids = Object.keys(S).sort();
    assert.deepEqual(ids, k === "classic" ? ["yzLing", "yzMail", "yzSec", "yzTr"] : ["yzMail", "yzSec", "yzSight", "yzTr"], k);
    for (const [id, [x, y]] of Object.entries(S)) assert.ok(x > 0 && x <= 88 && y > 0 && y < 95, k + " " + id + " 在圖裡、不超過右邊 88%");
  }
  const S = k => J(SCW["yizhan/" + k + "_f"].S);
  assert.deepEqual(S("classic"), { yzTr: [47, 66], yzSec: [22.5, 52], yzMail: [69, 62], yzLing: [81, 53] });
  assert.deepEqual(S("tang"), { yzTr: [63, 60], yzSec: [29, 54], yzMail: [87, 72], yzSight: [63, 86] });
  assert.deepEqual(S("yuan"), { yzTr: [58, 60], yzSec: [38, 68], yzMail: [88, 72], yzSight: [74, 86] });
  assert.deepEqual(S("qing"), { yzTr: [60, 52], yzSec: [42, 64], yzMail: [88, 62], yzSight: [74, 55] }, "清版景點從 (75,60) 挪到 (74,55)");
});

test("走路：每朝節點在圖裡、邊只用到有的節點、點入口要去的節點都有、動作（旅人鞠躬、其他揮手、點將台歡呼）；有 look0（沒給的看向旅人）", () => {
  const SCW = vm.runInContext("SCW", load(true)), ACT = { yzTr: "bow", yzSec: "wave", yzMail: "wave", yzSight: "wave", yzLing: "cheer" };
  for (const k of ERAS) {
    const e = SCW["yizhan/" + k + "_f"], w = e.walk;
    assert.ok(w.N.home, k); for (const [n, [x, y]] of Object.entries(w.N)) assert.ok(x > 0 && x < 100 && y > 0 && y < 100, k + " " + n);
    for (const ed of w.E.split(/\s+/)) { const [a, b] = ed.split("-"); assert.ok(w.N[a] && w.N[b], k + " " + ed) }
    assert.deepEqual(Object.keys(w.HS).sort(), Object.keys(e.S).sort(), k + " 每個入口都有站點");
    for (const [id, h] of Object.entries(w.HS)) { assert.ok(w.N[h[0]], k + " " + id); assert.equal(h[3], ACT[id], k + " " + id + " 動作") }
    assert.equal(w.h.length, 3); assert.ok(w.h[0] > 0 && w.h[0] < .2); assert.equal(w.look0.length, 2);
    if (k !== "classic") assert.deepEqual(J(w.look0), J(e.S.yzTr), k + " 沒給 look0 看向旅人");
  }
  assert.deepEqual(J(SCW["yizhan/classic_f"].walk.look0), [50, 85]);
  assert.deepEqual(J(SCW["yizhan/tang_f"].walk.N.home), [44, 78]); assert.deepEqual(J(SCW["yizhan/ming_f"].walk.N.home), [40, 72]);
});

test("載入順序：07m 比 07w 早載入，最上層碰 SHW_YZ 會碰到暫時死區——SHW_YZ 一讀就丟錯也要能載入", () => {
  /* 照 m.html 的樣子接成同一段：07sw → 07m → 後面才宣告 const SHW_YZ（07w）。最上層碰到 SHW_YZ（連 typeof 也算）就是真的暫時死區 */
  const ctx = vm.createContext({ setTimeout: () => 0, Math, Object, String, JSON, Set, localStorage: { getItem: () => null } });
  assert.doesNotThrow(() => vm.runInContext(SW + "\n" + YZ + "\nconst SHW_YZ={qin:{}};this.__ok=!!SCW['yizhan/qin_f'];", ctx));
  assert.equal(ctx.__ok, true);
});

test("記憶名：換圖重掛走路時，橫式圖用 yzL:<朝>（不套原圖的 yz:<朝> 出口表），原圖照舊 yz:<朝>", () => {
  const C = load(true), on = vm.runInContext("yzOnCfg", C), o = { pfx: "yz:tang" };
  on(o, "tang", { W: 2560 }); assert.equal(o.pfx, "yzL:tang"); on(o, "tang", { W: 768 }); assert.equal(o.pfx, "yz:tang"); on(o, "tang", null); assert.equal(o.pfx, "yz:tang");
});

test("07p yzColor：用橫式圖（P.dataset.scw）不播進門水墨暈開；原圖照舊播", () => {
  const run = scw => {
    const cls = new Set(), img = { style: {}, _src: "data/yizhan/tang_f_l1610.webp", getAttribute: () => img._src, set src(v) { img._src = v }, get src() { return img._src } };
    const P = { isConnected: true, dataset: scw ? { scw: "l1610" } : {}, classList: { add: c => cls.add(c), remove: c => cls.delete(c), contains: c => cls.has(c) }, querySelector: () => img };
    const ctx = vm.createContext({ sessionStorage: { getItem: () => null, setItem() { } }, matchMedia: () => ({ matches: false }), JSON, setTimeout: () => 0, clearTimeout() { }, Image: function () { }, Promise: Object.assign(function () { }, { all: () => ({ then() { } }) }), pcCss() { }, pcRun() { } });
    vm.runInContext(PC.slice(PC.indexOf("const YZC_ON=")) + ";this.yz=yzColor;", ctx); ctx.yz(P, "tang"); return { img, cls };
  };
  const l = run(true); assert.equal(l.img._src, "data/yizhan/tang_f_l1610.webp"); assert.ok(!l.cls.has("pc-run"));
  const o = run(false); assert.equal(o.img._src, "data/yizhan/tang_c.webp", "原圖照舊先換淡彩"); assert.ok(o.cls.has("pc-run"));
});

test("〔原始碼〕07m 接線：開頁先量（scwPre）、圖照 pre.src、掛 07sw（五種入口）、開頁就是橫式圖時先照條目掛走路（記憶名 yzL）；景點標籤在橫式圖縮成 2cqw", () => {
  assert.match(YZ, /const src=`data\/yizhan\/\$\{k\}\$\{YZ_IMG\}\.webp\$\{k==="classic"\?"\?v="\+YZ_CLV:""\}`,pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(YZ, /<img src="\$\{pre\.src\}"/);
  assert.match(YZ, /ids:\["yzTr","yzSec","yzMail","yzLing","yzSight"\],pfx:"yz:"\+k,cfg0:cfg,onCfg:x=>yzOnCfg\(o,k,x\)\}/);
  assert.match(YZ, /scwMount\(pg,o\);if\(pre\.k&&scwCur\(pg\)\)\{const c=scwWalkCfg\(o,scwCur\(pg\)\);yzOnCfg\(o,k,c\);pg\._scwW="l";/);
  assert.match(YZ, /shwPage\(v,c,o\.pfx,\(\)=>!document\.querySelector\("\.walkc"\)\)/);
  assert.match(YZ, /\.yz-page\.scw-l \.po-sight\{font-size:2cqw;/);
  assert.match(M("m/07w-shipwalk.js"), /function shwMount\(o\)\{if\(shwRM\(\)\|\|!o\.root\|\|!o\.frame\|\|o\.root\.dataset\.shw\)return;/, "07w 包的那次 shwPage 看到已掛過就略過");
});
