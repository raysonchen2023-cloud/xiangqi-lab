// W107-L 第 3 批：渡口（07f Port）iPad 橫向專用橫式圖，只有全彩版 port_<朝>_f_l1610（13 張，每朝構圖不同，各一套座標，條目寫在 07f 的 PORT_L1610）。
// 檢查：13 朝都登記（鍵＝全彩直圖 port_<朝>_f）；三扇門、景點、碼頭盡頭的格式和數量跟原本的表一樣、在圖內；路網接得起來、碼頭盡頭接進路網、景點和門都有小動作；
// 明朝繞開內湖（home-m1-i1）；開頁照 scwPre 選全彩圖；上色過場、風、船艙動態、走路、渡口主人、碼頭標籤在橫式圖時的處理。
// 用法 node --test xiangqi-lab/tools/test-w107-port-l1610.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), F = M("m/07f-ship.js"), WK = M("m/07w-shipwalk.js"), W4 = M("m/07w4-porthost.js"), PC = M("m/07p-portcolor.js"), PW = M("m/07r-portwind.js"), PF = M("m/07n-portfx.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };
const ENTRY = cut(F, "const PORT_L1610=", 'fx:{sight:T.sight||[],pier:T.pier}}}');
const ERAS = ["classic", "qin", "han", "sanguo", "weijin", "nanbei", "sui", "tang", "wudai", "song", "yuan", "ming", "qing"];
const J = x => JSON.parse(JSON.stringify(x));
function load() {
  const ctx = vm.createContext({ localStorage: { getItem: () => null }, location: { search: "" }, Object, Math, JSON, String, Array, isFinite });
  vm.runInContext(SW, ctx); vm.runInContext(cut(F, "const PORT_SIGHT=", "};") + "\n" + ENTRY, ctx);
  return ctx;
}

test("條目：13 朝都登記，鍵是全彩直圖 port_<朝>_f、檔名加 _l1610；船艙有千秋石桌、其他朝有古戰場；夜景、淡彩沒有登記", () => {
  const C = load(), SCW = vm.runInContext("SCW", C);
  for (const k of ERAS) {
    const e = SCW["shipmap/port_" + k + "_f"]; assert.ok(e, k); assert.equal(e.f, "shipmap/port_" + k + "_f_l1610"); assert.equal(e.w, 2560); assert.equal(e.ready, true);
    for (const id of ["poPark", "poInn", "poArena"]) assert.ok(e.S[id], k + " " + id);
    if (k === "classic") { assert.ok(e.S.poPh); assert.equal(e.S.poBattle, undefined) } else { assert.ok(e.S.poBattle); assert.equal(e.S.poPh, undefined) }
    assert.equal(SCW["shipmap/port_" + k + "_c"], undefined, k + " 淡彩沒有"); assert.equal(SCW["shipmap/port_" + k], undefined, k + " 原圖鍵不用");
  }
  assert.equal(vm.runInContext('scwKey("data/shipmap/port_tang_f.webp")', C), "shipmap/port_tang_f");
});

test("座標：三扇門 3 個、景點數量跟 PORT_SIGHT 一樣、碼頭盡頭跟 PH4_PIER 同格式；都在圖內", () => {
  const C = load(), T = vm.runInContext("PORT_L1610", C), PS = vm.runInContext("PORT_SIGHT", C);
  assert.deepEqual(Object.keys(T).sort(), ERAS.slice().sort());
  const inImg = ([x, y]) => x > 0 && x < 100 && y > 0 && y < 100;
  for (const k of ERAS) {
    const t = T[k]; assert.equal(t.spot.length, 3, k); for (const p of t.spot) assert.ok(inImg(p), k + " 門 " + p);
    assert.equal((t.sight || []).length, (PS[k] || []).length, k + " 景點數"); for (const p of t.sight || []) assert.ok(inImg(p), k + " 景點 " + p);
    const P = t.pier; assert.ok(P.N.pier && P.E && P.at && P.boat, k + " 碼頭盡頭"); for (const p of [P.at, P.boat, ...Object.values(P.N)]) assert.ok(inImg(p), k + " 碼頭 " + p);
  }
  assert.deepEqual(J(T.tang.spot), [[22, 62], [75, 74], [46, 54]], "唐（照 json 寫死）"); assert.deepEqual(J(T.classic.poPh), [53, 66]);
});

test("路網：13 朝的邊都接在節點上、從 home 走得到每個節點（含碼頭盡頭）；門、景點、上星槎都有小動作", () => {
  const C = load(), SCW = vm.runInContext("SCW", C), T = vm.runInContext("PORT_L1610", C);
  for (const k of ERAS) {
    const W = SCW["shipmap/port_" + k + "_f"].walk, N = Object.keys(W.N), Ed = W.E.split(" ").map(e => e.split("-"));
    for (const [a, b] of Ed) { assert.ok(N.includes(a), k + " 邊 " + a); assert.ok(N.includes(b), k + " 邊 " + b) }
    const seen = new Set(["home"]); let g = true;
    while (g) { g = false; for (const [a, b] of Ed) { if (seen.has(a) && !seen.has(b)) { seen.add(b); g = true } if (seen.has(b) && !seen.has(a)) { seen.add(a); g = true } } }
    assert.deepEqual([...seen].sort(), N.slice().sort(), k + " 都接得到 home");
    for (const [id, h] of Object.entries(W.HS)) assert.ok(N.includes(h[0]), k + " " + id + " 站點 " + h[0]);
    assert.ok(W.HS.poBoard && W.HS.poBoard[0] === "pier", k + " 上星槎");
    for (const id of ["poPark", "poInn", "poArena"]) assert.ok(W.HS[id], k + " " + id);
    (T[k].sight || []).forEach((_, i) => assert.ok(W.HS["ps" + i], k + " ps" + i));
    for (const p of Object.values(W.N)) assert.ok(p[0] > 0 && p[0] < 100 && p[1] > 0 && p[1] < 100);
  }
});

test("明朝：home 不直接連 i1（會擦到內湖），改經石堤頂沙路的 m1", () => {
  const C = load(), W = vm.runInContext('SCW["shipmap/port_ming_f"].walk', C), Ed = W.E.split(" ");
  assert.ok(!Ed.includes("home-i1") && !Ed.includes("i1-home")); assert.ok(Ed.includes("home-m1") && Ed.includes("m1-i1"));
  assert.deepEqual(J(W.N.m1), [46.5, 76.5]);
});

test("〔原始碼〕開頁照 scwPre 選全彩圖；上色過場、風、船艙動態在橫式圖不掛（轉成橫式時藏起來）；走路、渡口主人照條目；景點、碼頭標籤走 scwPut", () => {
  assert.match(F, /src0="data\/shipmap\/port_"\+k\+\(full\?"_f":""\)\+"\.webp",pre=scwPre\(v,src0\);/);
  assert.match(F, /try\{portScw\(v,k\)\}catch\(e\)\{\}shpFit\(v\);if\(typeof portColor==="function"\)portColor\(v,k\);/, "portScw 在上色前跑");
  assert.match(F, /scwMount\(P,\{key:scwKey\(src0\),src0,ids:\["poPark","poInn","poArena","poBattle","poPh"\],pfx:"port:"\+k,cfg0:C,apply:place\}\)/);
  assert.match(F, /P\.querySelectorAll\("\.po-sight"\)\.forEach\(b=>\{const s=X&&X\.sight\[\+b\.dataset\.ps\];scwPut\(b,s\|\|null\)\}\);/);
  assert.match(F, /if\(b\)scwPut\(b,X\?X\.pier\.at:null\);/);
  assert.match(F, /\.shp-page\.scw-l \.pw-gl,\.shp-page\.scw-l \.pfx-gl,\.shp-page\.scw-l \.shp-gldev\{display:none!important\}/);
  for (const [src, name] of [[PC, "portColor"], [PW, "portWind"], [PF, "portFx"]]) assert.match(cut(src, "function " + name + "(v,k){", "\n  if(P.dataset.scw)return;"), /if\(P\.dataset\.scw\)return;$/, name + " 橫式圖不掛");
  assert.match(WK, /if\(e&&e\.walk&&P\._scw\)\{C=scwWalkCfg\(P\._scw,e\);P\._scwW="l"\}/, "shwPort 用條目路網");
  assert.match(W4, /if\(e&&e\.walk&&P\._scw\)C=scwWalkCfg\(P\._scw,e\)\}/, "渡口主人站位照條目");
  assert.match(W4, /P\.append\(b\);if\(P\._portPlace\)P\._portPlace\(\)\}/, "碼頭標籤晚加也照條目放");
});
