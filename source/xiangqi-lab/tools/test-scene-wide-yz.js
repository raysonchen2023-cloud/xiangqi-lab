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
  assert.deepEqual(S("yuan"), { yzTr: [58, 60], yzSec: [38, 68], yzMail: [84, 70], yzSight: [74, 86] }, "元版信箱 11/25 重畫後移到 84%");
  assert.deepEqual(S("qing"), { yzTr: [60, 52], yzSec: [42, 64], yzMail: [82, 62], yzSight: [74, 55] }, "清版信箱 11/25 重畫後移到 82%；景點從 (75,60) 挪到 (74,55)，跟信箱上下錯開");
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

/* 照 output/w107-ipad/l1610/yizhan/yz_l1610.json 量好的值（Windows Claude 1），整組寫死比對；清版景點刻意從 (75,60) 挪到 (74,55)（#166 審查建議 1：抄錯一個點也要紅） */
const YZ_EXP={"classic":{"S":{"yzTr":[47,66],"yzSec":[22.5,52],"yzMail":[69,62],"yzLing":[81,53]},"h":[0.06,66,0.0012],"N":{"home":[74,83],"b1":[62,78],"tr":[46,71.5],"c1":[38,68],"c2":[30,62],"sec":[23,56.5],"mail":[67,70],"ling":[80.6,57.5]},"E":"home-b1 b1-tr tr-c1 c1-c2 c2-sec home-mail b1-mail mail-ling","HS":{"yzTr":["tr",50,52,"bow"],"yzSec":["sec",22.5,48,"wave"],"yzMail":["mail",69,58,"wave"],"yzLing":["ling",81,50,"cheer"]}},"qin":{"S":{"yzTr":[55,58],"yzSec":[26,60],"yzMail":[88,60],"yzSight":[53,84]},"h":[0.065,60,0.001],"N":{"home":[55,80],"tr":[54,62],"c":[40,66],"sec":[27,64],"mail":[86,78],"r":[69,75],"sight":[53,88]},"E":"home-tr home-c c-sec home-mail home-r home-sight","HS":{"yzTr":["tr",58,44,"bow"],"yzSec":["sec",26,53,"wave"],"yzMail":["mail",88,53,"wave"],"yzSight":["sight",52,73,"wave"]}},"han":{"S":{"yzTr":[55,64],"yzSec":[36,66],"yzMail":[87,68],"yzSight":[55,86]},"h":[0.07,60,0.001],"N":{"home":[62,80],"tr":[54,70],"sec":[35,72],"mail":[86,82],"sight":[53,88]},"E":"home-tr home-sec home-mail home-sight","HS":{"yzTr":["tr",58,40,"bow"],"yzSec":["sec",36,58,"wave"],"yzMail":["mail",87,62,"wave"],"yzSight":["sight",57,82,"wave"]}},"sanguo":{"S":{"yzTr":[63,55],"yzSec":[35,58],"yzMail":[88,64],"yzSight":[56,86]},"h":[0.07,60,0.001],"N":{"home":[60,70],"tr":[62,60],"c":[45,62],"sec":[35,62],"mail":[86,72],"sight":[47,76],"r":[75,82]},"E":"home-tr home-c c-sec home-mail home-sight home-r","HS":{"yzTr":["tr",68,45,"bow"],"yzSec":["sec",35,54,"wave"],"yzMail":["mail",88,60,"wave"],"yzSight":["sight",56,82,"wave"]}},"weijin":{"S":{"yzTr":[52,56],"yzSec":[29,58],"yzMail":[83,58],"yzSight":[54,82]},"h":[0.07,60,0.001],"N":{"home":[42,88],"st":[27,74],"c":[35,64],"sec":[28,64],"tr":[48,62],"mail":[82,66],"sight":[52,72]},"E":"home-st st-c c-sec c-tr tr-sight tr-mail","HS":{"yzTr":["tr",54,45,"bow"],"yzSec":["sec",29,51,"wave"],"yzMail":["mail",83,50,"wave"],"yzSight":["sight",54,78,"wave"]}},"nanbei":{"S":{"yzTr":[50,62],"yzSec":[28,72],"yzMail":[79,58],"yzSight":[74,82]},"h":[0.07,60,0.001],"N":{"home":[40,84],"tr":[50,70],"c":[34,74],"sec":[30,80],"mail":[78,68],"sight":[70,85]},"E":"home-tr home-c c-sec tr-mail home-sight tr-sight","HS":{"yzTr":["tr",51,48,"bow"],"yzSec":["sec",28,68,"wave"],"yzMail":["mail",79,50,"wave"],"yzSight":["sight",74,76,"wave"]}},"sui":{"S":{"yzTr":[55,56],"yzSec":[37,66],"yzMail":[86,58],"yzSight":[62,80]},"h":[0.07,60,0.001],"N":{"home":[30,86],"c":[40,74],"sec":[36,70],"tr":[52,66],"mail":[84,64],"sight":[62,74]},"E":"home-c c-sec c-tr tr-mail tr-sight","HS":{"yzTr":["tr",56,44,"bow"],"yzSec":["sec",37,58,"wave"],"yzMail":["mail",86,52,"wave"],"yzSight":["sight",60,82,"wave"]}},"tang":{"S":{"yzTr":[63,60],"yzSec":[29,54],"yzMail":[87,72],"yzSight":[63,86]},"h":[0.07,60,0.001],"N":{"home":[44,78],"c":[40,64],"sec":[27,58],"tr":[58,72],"mail":[84,82],"sight":[58,80]},"E":"home-c c-sec home-tr tr-mail home-sight","HS":{"yzTr":["tr",63,42,"bow"],"yzSec":["sec",29,46,"wave"],"yzMail":["mail",87,66,"wave"],"yzSight":["sight",63,88,"wave"]}},"wudai":{"S":{"yzTr":[56,56],"yzSec":[37,66],"yzMail":[88,64],"yzSight":[60,86]},"h":[0.07,60,0.001],"N":{"home":[40,88],"c":[45,74],"sec":[36,76],"tr":[54,68],"mail":[85,72],"sight":[62,84]},"E":"home-c c-sec c-tr tr-mail home-sight c-sight","HS":{"yzTr":["tr",56,40,"bow"],"yzSec":["sec",37,60,"wave"],"yzMail":["mail",88,58,"wave"],"yzSight":["sight",60,84,"wave"]}},"song":{"S":{"yzTr":[60,60],"yzSec":[27,66],"yzMail":[87,74],"yzSight":[59,86]},"h":[0.07,60,0.001],"N":{"home":[37,88],"c":[42,74],"sec":[30,72],"tr":[58,68],"mail":[84,84],"sight":[62,88]},"E":"home-c c-sec c-tr tr-mail home-sight tr-sight","HS":{"yzTr":["tr",60,48,"bow"],"yzSec":["sec",27,60,"wave"],"yzMail":["mail",88,66,"wave"],"yzSight":["sight",59,82,"wave"]}},"yuan":{"S":{"yzTr":[58,60],"yzSec":[38,68],"yzMail":[84,70],"yzSight":[74,86]},"h":[0.07,60,0.001],"N":{"home":[36,80],"c":[46,72],"sec":[38,72],"tr":[56,66],"mail":[82,86],"sight":[70,84]},"E":"home-c c-sec c-tr tr-mail tr-sight home-sight","HS":{"yzTr":["tr",58,44,"bow"],"yzSec":["sec",39,60,"wave"],"yzMail":["mail",84,66,"wave"],"yzSight":["sight",74,82,"wave"]}},"ming":{"S":{"yzTr":[54,50],"yzSec":[34,53],"yzMail":[83,62],"yzSight":[56,74]},"h":[0.07,60,0.001],"N":{"home":[40,72],"st":[38,62],"c":[44,56],"sec":[34,56],"tr":[54,56],"mail":[82,70],"sight":[50,80]},"E":"home-st st-c c-sec c-tr tr-mail home-sight","HS":{"yzTr":["tr",55,38,"bow"],"yzSec":["sec",34,49,"wave"],"yzMail":["mail",83,56,"wave"],"yzSight":["sight",56,70,"wave"]}},"qing":{"S":{"yzTr":[60,52],"yzSec":[42,64],"yzMail":[82,62],"yzSight":[74,55]},"h":[0.07,60,0.001],"N":{"home":[34,78],"c":[44,72],"sec":[40,72],"tr":[58,66],"sight":[74,70],"mail":[80,74]},"E":"home-c c-sec c-tr tr-sight sight-mail","HS":{"yzTr":["tr",60,42,"bow"],"yzSec":["sec",42,58,"wave"],"yzMail":["mail",82,58,"wave"],"yzSight":["sight",75,56,"wave"]}}};
test("13 朝座標整組照量好的值：入口 S、走路 h／N／E／HS 逐一相同", () => {
  const SCW = vm.runInContext("SCW", load(true));
  for (const [k, x] of Object.entries(YZ_EXP)) {
    const e = SCW["yizhan/" + k + "_f"], w = e.walk;
    assert.deepEqual(J(e.S), x.S, k + " 入口"); assert.deepEqual(J(w.h), x.h, k + " 身高"); assert.deepEqual(J(w.N), x.N, k + " 節點"); assert.equal(w.E, x.E, k + " 邊"); assert.deepEqual(J(w.HS), x.HS, k + " 站點");
  }
});

test("開頁就是橫式圖：yzScwTag 讓圖框一開始就帶 data-scw，07sw scwMount 一掛上入口就照條目擺；原圖照舊（#166 審查建議 2）", () => {
  const C = load(true), tag = vm.runInContext("yzScwTag", C);
  const parse = k => { const html = '<div class="shp-page cq yz-page' + tag(k) + '>', m = /data-scw="([^"]*)"/.exec(html), cls = /class="([^"]*)"/.exec(html)[1].split(" "); return { scw: m ? m[1] : null, cls } };
  const mount = k => {
    const p = parse(k), el = {}, img = { complete: true, naturalWidth: 2560, getAttribute: () => "x", addEventListener() { }, dataset: {} };
    const P = { dataset: p.scw == null ? {} : { scw: p.scw }, classList: { toggle() { }, add() { }, contains: c => p.cls.includes(c) }, isConnected: true,
      querySelector: s => s === ":scope>img" ? img : s.startsWith("#") ? (el[s] || (el[s] = { style: { left: "1%", top: "2%" }, dataset: {} })) : null };
    vm.runInContext("scwMount", C)(P, { key: "yizhan/tang_f", src0: "data/yizhan/tang_f.webp", ids: ["yzTr", "yzSec", "yzMail", "yzSight"] });
    return { p, el };
  };
  const l = mount("l1610"); assert.equal(l.p.scw, "l1610"); assert.ok(l.p.cls.includes("scw-l"));
  assert.equal(l.el["#yzTr"].style.left, "63%"); assert.equal(l.el["#yzTr"].style.top, "60%"); assert.equal(l.el["#yzMail"].style.left, "87%", "入口照唐版條目擺");
  const o = mount(""); assert.equal(o.p.scw, null); assert.ok(!o.p.cls.includes("scw-l")); assert.equal(o.el["#yzTr"].style.left, "1%", "原圖：入口不動");
});

test("〔混合〕掛 07sw 的設定 yzScwO：key、src0 是原圖網址；開頁就是橫式圖、圖載不到時退回原圖（src0）；yzInn 用原圖 src 建它（#166 複審建議 1、2）", () => {
  const C = load(true), mk = vm.runInContext("yzScwO", C), SRC = "data/yizhan/tang_f.webp", cfg = { home: "home" };
  const o = mk("tang", SRC, cfg);
  assert.equal(o.key, "yizhan/tang_f"); assert.equal(o.src0, SRC); assert.equal(o.cfg0, cfg); assert.equal(o.pfx, "yz:tang");
  assert.deepEqual(J(o.ids), ["yzTr", "yzSec", "yzMail", "yzLing", "yzSight"]);
  o.onCfg({ W: 2560 }); assert.equal(o.pfx, "yzL:tang", "onCfg 換記憶名");
  /* 開頁就是橫式圖（data-scw="l1610"、img 是 l1610）、圖載完沒有寬＝載不到 → 07sw scwFail → 退回 o.src0 */
  const img = { _src: "data/yizhan/tang_f_l1610.webp?v=1125", complete: true, naturalWidth: 0, dataset: {}, onerror: null, getAttribute(k) { return k === "src" ? this._src : null }, addEventListener() { }, set src(v) { this._src = v }, get src() { return this._src } };
  const P = { dataset: { scw: "l1610" }, isConnected: true, classList: { toggle() { }, add() { }, contains: () => false }, querySelector: s => s === ":scope>img" ? img : null };
  vm.runInContext("scwMount", C)(P, mk("tang", SRC, cfg));
  assert.equal(img.src, SRC, "退回原圖"); assert.equal(P.dataset.scw, ""); assert.equal(vm.runInContext("SCW_BAD", C)["yizhan/tang_f"], 1, "這次開 App 不再試");
  assert.match(YZ, /const src=`data\/yizhan\/\$\{k\}\$\{YZ_IMG\}\.webp[^`]*`,pre=/); assert.match(YZ, /o=yzScwO\(k,src,cfg\);/, "yzInn 用原圖 src（不是 pre.src）建設定");
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
  assert.match(YZ, /d\.innerHTML=`<div class="shp-page cq yz-page\$\{yzScwTag\(pre\.k\)\}>/, "開頁的圖框用 yzScwTag");
  assert.match(YZ, /function yzScwO\(k,src,cfg\)\{const o=\{key:scwKey\(src\),src0:src,ids:\["yzTr","yzSec","yzMail","yzLing","yzSight"\],pfx:"yz:"\+k,cfg0:cfg\};o\.onCfg=x=>yzOnCfg\(o,k,x\);return o\}/);
  assert.match(YZ, /scwMount\(pg,o\);if\(pre\.k&&scwCur\(pg\)\)\{const c=scwWalkCfg\(o,scwCur\(pg\)\);yzOnCfg\(o,k,c\);pg\._scwW="l";/);
  assert.match(YZ, /shwPage\(v,c,o\.pfx,\(\)=>!document\.querySelector\("\.walkc"\)\)/);
  assert.match(YZ, /\.yz-page\.scw-l \.po-sight\{font-size:2cqw;/);
  assert.match(M("m/07w-shipwalk.js"), /function shwMount\(o\)\{if\(shwRM\(\)\|\|!o\.root\|\|!o\.frame\|\|o\.root\.dataset\.shw\)return;/, "07w 包的那次 shwPage 看到已掛過就略過");
});
