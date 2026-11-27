// W107-L 第 2 批：特級大師畫像長廊（07y6）在 iPad 橫向換成 2560×1600 橫式圖（Windows Claude 1 量，output/w107-ipad/l1610/gmmap/gm_day_classic_l1610.json）。
// 新圖牆上 7 幅（原本 6 幅）；經典世界一律 gm_day_classic；預設世界宋以後 gm_day（共用經典版座標）、秦～三國 gm_day_han（另給 qHan、走路目測）、
// 魏晉～五代 gm_day_weijin（6 個木框，另給 qWeijin）。手機、iPad 直向照舊原圖；夜景照日間條目登記（#173 scwVarInit）。不開瀏覽器：07sw＋07y6 在 vm 跑。
// 用法 node --test xiangqi-lab/tools/test-scene-wide-gm.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), GM = M("m/07y6-gmmap.js");
function load(dev) {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, addEventListener: () => { }, isFinite, Math, Object, String, JSON, localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null } });
  vm.runInContext(SW, ctx); vm.runInContext(GM, ctx);
  return ctx;
}
const J = x => JSON.parse(JSON.stringify(x));
const K = { cl: "gmmap/gm_day_classic", o: "gmmap/gm_day", han: "gmmap/gm_day_han", wei: "gmmap/gm_day_weijin" };
const fakeP = key => ({ dataset: { scw: key ? "l1610" : "" }, _scw: { key: key || K.cl } });

test("〔混合〕條目：經典版、原圖版、漢版、魏晉版四個白天鍵都登記、各自的圖；夜景照日間條目登記（#173）；SCW_CDN 還是 false＝正式玩家照舊原圖", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), ent = vm.runInContext("scwEntry", C);
  for (const [k, f] of [[K.cl, "gmmap/gm_day_classic_l1610"], [K.o, "gmmap/gm_day_l1610"], [K.han, "gmmap/gm_day_han_l1610"], [K.wei, "gmmap/gm_day_weijin_l1610"]]) {
    const e = SCW[k]; assert.ok(e && e.ready, k); assert.equal(e.f, f); assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.ok(ent(k));
  }
  const nt = (n, dd) => { const e = ent(n); assert.ok(e, n + " 夜景照日間條目登記（#173 scwVarInit）"); assert.equal(e.f, n + "_l1610", n); assert.equal(e.base, dd, n); assert.deepEqual(e.S, ent(dd).S, n + " 座標跟日間共用"); }; for (const x of ["", "_classic", "_han", "_weijin"]) nt("gmmap/gm_night" + x, "gmmap/gm_day" + x);
  assert.equal(vm.runInContext("scwEntry", load(false))(K.cl), null);
  /* 經典世界：07y xqClImg 把 _han／_weijin 換成 _classic，所以 gm_day_classic 一個鍵就涵蓋三組 */
  assert.match(M("m/07y-hubmap.js"), /return u\.replace\(\/\\\/\(\[a-z\]\+_\(\?:day\|night\)\)\(\?:_\[a-z\]\+\)\?\\\.webp\/,"\/\$1_classic\.webp"\)/);
});

test("畫心四角照量好的 json：經典版、原圖版 7 幅共用、漢版另給 7 幅、魏晉版 6 幅；每幅凸四邊形、順時針、在圖裡；越往長廊深處越小", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C);
  const Q = { cl: SCW[K.cl].fx.q, o: SCW[K.o].fx.q, han: SCW[K.han].fx.q, wei: SCW[K.wei].fx.q };
  assert.equal(Q.o, Q.cl, "原圖版共用經典版");
  assert.deepEqual([Q.cl.length, Q.han.length, Q.wei.length], [7, 7, 6]);
  assert.deepEqual(J([Q.cl[0], Q.cl[6]]), [[[202, 357], [452, 444], [452, 1182], [202, 1290]], [[1185, 737], [1198, 742], [1198, 880], [1185, 880]]]);
  assert.deepEqual(J(Q.han[2]), [[874, 555], [944, 587], [946, 1042], [876, 1072]]);
  assert.deepEqual(J(Q.wei[5]), [[1186, 732], [1198, 734], [1201, 900], [1187, 906]]);
  const cross = q => q.map((p, i) => { const a = q[(i + 1) % 4], b = q[(i + 2) % 4]; return (a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0]) });
  for (const [g, L] of Object.entries(Q)) L.forEach((q, i) => {
    for (const [x, y] of q) assert.ok(x >= 0 && x <= 2560 && y >= 0 && y <= 1600, g + i);
    assert.ok(cross(q).every(c => c >= 0), g + i + " 凸、順時針");
    if (i) { const h = q => q[3][1] - q[0][1], p = L[i - 1]; assert.ok(h(q) < h(p) && q[0][0] > p[0][0], g + i + " 比前一幅小、更深") }
  });
});

test("gm2G：原圖照 GM2_Q（768 寬、6 幅），橫式圖照各自條目的 q（7／7／6 幅）；沒開開關照原圖", () => {
  const C = load(true), G = vm.runInContext("gm2G", C), Q0 = vm.runInContext("GM2_Q", C), SCW = vm.runInContext("SCW", C);
  const g0 = G(fakeP("")); assert.equal(g0.W, 768); assert.equal(g0.Q, Q0); assert.equal(Q0.length, 6);
  for (const k of [K.cl, K.o, K.han, K.wei]) { const g = G(fakeP(k)); assert.equal(g.W, 2560); assert.equal(g.Q, SCW[k].fx.q, k) }
  assert.equal(vm.runInContext("gm2G", load(false))(fakeP(K.han)).W, 768);
});

test("入口與走路：入口在第三幅畫前、走路節點在圖裡、點入口要去的節點都有；漢版另一套（對齊不可信）；小人越近越大", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), S0 = vm.runInContext("SHW_GM2", C);
  for (const k of [K.cl, K.han, K.wei]) {
    const e = SCW[k], q = e.fx.q[2], cx = (q[0][0] + q[1][0]) / 2 / 25.6, cy = (q[0][1] + q[3][1]) / 2 / 16, w = e.walk;
    assert.ok(Math.abs(e.S.gm2Go[0] - cx) < 1 && Math.abs(e.S.gm2Go[1] - cy) < 2.5, k + " 入口在第三幅畫中間：" + e.S.gm2Go + " vs " + cx.toFixed(1) + "," + cy.toFixed(1));
    for (const [n, [x, y]] of Object.entries(w.N)) assert.ok(x > 0 && x < 100 && y > 50 && y < 100, k + " " + n + " 在地板上（消失點以下）");
    assert.ok(w.N[w.home]); for (const ed of w.E.split(" ")) { const [a, b] = ed.split("-"); assert.ok(w.N[a] && w.N[b]) }
    assert.deepEqual(Object.keys(w.HS), Object.keys(S0.HS)); assert.ok(w.N[w.HS.gm2Go[0]]);
    assert.ok(e.exit && e.exit[0] < 20 && e.exit[1] > 85, k + " 出口在左下，不跟起點的小人疊在一起"); assert.equal(w.HS.gm2Go[3], S0.HS.gm2Go[3], "動作照原本");
    const [h0, y0, k1] = w.h; assert.ok(h0 > 0 && k1 > 0 && h0 + (w.N.home[1] - y0) * k1 > h0, "home 比 sc 近、比較大");
  }
  assert.equal(SCW[K.wei].walk, SCW[K.cl].walk, "魏晉版有對齊，走路共用經典版"); assert.notEqual(SCW[K.han].walk, SCW[K.cl].walk, "漢版另一套");
});

test("〔混合〕07y6 接線：開頁先量（scwPre）、畫心幾幅照現在用的那張圖（換圖時 apply 重排、i%款數輪流貼）、掛 07sw（入口 gm2Go、走路前綴 gm2）、橫式圖用條目的走路設定", () => {
  assert.match(GM, /const src=gm2Img\(dk,grp\),pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(GM, /<img src="\$\{pre\.src\}"/);
  assert.match(GM, /fx\.innerHTML=Q\.map\(\(q,i\)=>`<img class="gm2-wh" data-i="\$\{i\}" src="data\/gmmap\/\$\{HS\[i%HS\.length\]\}\.webp/);
  assert.match(GM, /ids:\["gm2Go"\],pfx:"gm2",cfg0:cfg,apply:\(\)=>\{hearts\(\);fit\(\)\}\};scwMount\(P,o\);if\(pre\.k\)\{cfgNow=scwWalkCfg\(o,scwCur\(P\)\);P\._scwW="l"\}hearts\(\);fit\(\)/);
  assert.match(GM, /shwPage\(v,cfgNow,"gm2"\)/);
  assert.equal((GM.match(/const k=P\.clientWidth\/768/g) || []).length, 0, "畫心不再寫死 768 寬");
  /* 畫心款數：宋以後 6 款輪流，漢、魏晉只用山、雲水兩款（顧問必改） */
  const C = load(true), H = vm.runInContext("gm2Hearts", C); assert.equal(H("").length, 6); assert.deepEqual(J(H("han")), ["gh_shan", "gh_yun"]);
});
