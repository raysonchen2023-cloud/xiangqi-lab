// W107-L 第 1 批（開發者 11/25「先做沒做的頁日間」）：我的角色「棋鎮書齋珍藏牆」（07z4）在 iPad 橫向換成 2560×1600 橫式圖，
// 經典版、原圖版共用一套座標（Windows Claude 1 量，output/w107-ipad/l1610/studymap/study_day_classic_l1610.json）；夜景、手機、iPad 直向照舊原圖。
// 書齋牆在 3D 舞台下面，不是整頁場景：選圖照整個畫面量（mzScwSync），用橫式圖時滿寬往下捲（包 07sw scwSync 回 "wait"），不用 07fl cover 填滿。
// 不開瀏覽器：07sw＋07z4 在 vm 跑，換圖用假的 #view／圖框。用法 node --test xiangqi-lab/tools/test-scene-wide-study.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SW = M("m/07sw-scenewide.js"), MZ = M("m/07z4-studymap.js");
const dims = { w: 1180, h: 820 };
function load(dev) {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, addEventListener: () => { }, removeEventListener: () => { }, isFinite, Math, Object, String, JSON,
    localStorage: { getItem: k => dev && k === "xqScwDev" ? "1" : null }, getComputedStyle: () => ({ paddingBottom: "0", paddingLeft: "0", paddingRight: "0" }),
    document: { addEventListener: () => { }, documentElement: { get clientHeight() { return dims.h } } }, innerHeight: 0 });
  vm.runInContext(SW, ctx); vm.runInContext(MZ, ctx);
  return ctx;
}
/* 假的 #view 和書齋牆（.shp-page.cq.mz-wall），圖照 src 記下來 */
function fakeWall(ctx, src0) {
  const cls = new Set(["shp-page", "cq", "mz-wall"]), img = { _src: src0, complete: true, naturalWidth: 768, dataset: {}, onerror: null, getAttribute(k) { return k === "src" ? this._src : null }, addEventListener() { }, set src(v) { this._src = v; this.complete = false }, get src() { return this._src } };
  const P = { dataset: {}, isConnected: true, classList: { add: c => cls.add(c), remove: c => cls.delete(c), toggle: (c, on) => { on ? cls.add(c) : cls.delete(c) }, contains: c => cls.has(c) }, querySelector: s => s === ":scope>img" ? img : null, querySelectorAll: () => [] };
  const V = { scrollTop: 0, get clientWidth() { return dims.w }, get clientHeight() { return dims.h }, getBoundingClientRect: () => ({ top: 0 }) };
  P.getBoundingClientRect = () => ({ top: 459 });   /* 書齋牆在 3D 舞台下面（iPad 實測約 459px） */ P.style = {};
  let painted = 0;
  vm.runInContext("scwMount", ctx)(P, { key: vm.runInContext("scwKey", ctx)(src0), src0, ids: [], apply: () => { painted++ } });
  return { P, V, img, cls, painted: () => painted };
}
const KC = "studymap/study_day_classic", KO = "studymap/study_day", SRC_C = "data/studymap/study_day_classic.webp?v=2510";

test("條目：經典版、原圖版兩個白天鍵都登記（共用一套座標、各自的圖）；夜景沒有橫式圖", () => {
  const C = load(true), SCW = vm.runInContext("SCW", C), L = vm.runInContext("MZ_L", C), ent = vm.runInContext("scwEntry", C);
  for (const [k, f] of [[KC, "studymap/study_day_classic_l1610"], [KO, "studymap/study_day_l1610"]]) {
    const e = SCW[k]; assert.ok(e, k); assert.equal(e.ready, true, k); assert.equal(e.f, f); assert.equal(e.w, 2560); assert.equal(e.h, 1600); assert.equal(e.fx.mz, L, "座標共用 MZ_L");
    assert.ok(ent(k), "開發用開關打開時用得到");
  }
  assert.equal(ent("studymap/study_night_classic"), null); assert.equal(ent("studymap/study_night"), null);
  assert.equal(vm.runInContext("scwEntry", load(false))(KC), null, "SCW_CDN 還是 false、沒開開發用開關＝正式玩家照舊原圖");
});

test("橫式座標：14 個入口跟原圖同一組 id、都在 2560×1600 裡、錨點在範圍上緣；亮格 12 格；消寒圖、輿圖、爐煙、新信朱點都落在各自入口的範圍裡", () => {
  const C = load(true), L = vm.runInContext("MZ_L", C), S0 = vm.runInContext("MZ_SPOTS", C);
  assert.deepEqual(L.spots.map(s => s[0]).sort(), S0.map(s => s[0]).sort());
  const box = {};
  for (const [id, x0, y0, x1, y1, t, ax, ay, al] of L.spots) {
    assert.ok(0 <= x0 && x0 < x1 && x1 <= 2560 && 0 <= y0 && y0 < y1 && y1 <= 1600, id);
    assert.ok(ax >= x0 && ax <= x1 && ay === y0, id + " 錨點在上緣");
    assert.equal(al, S0.find(s => s[0] === id)[8], id + " 對齊照原本"); assert.equal(t, S0.find(s => s[0] === id)[5], id + " 標籤字照原本");
    box[id] = [x0, y0, x1, y1];
  }
  assert.equal(L.cells.length, 12);
  for (const c of L.cells) { assert.ok(c[0] < c[2] && c[1] < c[3]); assert.ok(c[0] >= box.mzZhen[0] && c[2] <= box.mzZhen[2] && c[1] >= box.mzZhen[1] && c[3] <= box.mzZhen[3], "亮格在珍品（亮格櫃）範圍裡") }
  const inside = (p, b) => p[0] >= b[0] && p[0] <= b[2] && p[1] >= b[1] && p[1] <= b[3];
  assert.ok(inside(L.smoke, box.mzXp), "爐煙在修為（小三足鼎）上"); assert.ok(inside(L.dot, box.mzLetter), "朱點在信上");
  assert.ok(L.plum[0] >= box.mzXh[0] && L.plum[2] <= box.mzXh[2] && L.plum[1] >= box.mzXh[1] && L.plum[3] <= box.mzXh[3], "素梅畫在立軸裡");
  const G = vm.runInContext("mzGeo", C)(true);
  assert.equal(G.yu.length, 13);
  for (const p of G.yu) assert.ok(p[0] >= L.yu[0] && p[0] <= L.yu[2] && p[1] >= L.yu[1] && p[1] <= L.yu[3], "輿圖 13 站在畫心裡：" + p);
  for (let i = 1; i < 13; i++) assert.ok(G.yu[i][0] > G.yu[i - 1][0], "站序照原本由左往右");
});

/* 原圖的消寒圖、輿圖要跟改之前一模一樣（main 版 07z4 原文，數字寫法 .8／0.8 視為相同） */
const OLD = `const MZ_W=896,MZ_H=1200;
function mzPlum(xh){const n=xh?xh[0]:0,box=[480,126,567,342],cx=(box[0]+box[2])/2,F=[];let k=0;
  for(let i=0;i<9;i++){const y=box[3]-16-i*(box[3]-box[1]-34)/8,x=cx+(i%2?20:-20)+Math.sin(i)*3;let p="";
    for(let j=0;j<9;j++){const a=j/9*Math.PI*2,px=x+Math.cos(a)*6.5,py=y+Math.sin(a)*6.5;p+=\`<circle cx="\${px.toFixed(1)}" cy="\${py.toFixed(1)}" r="3.4" fill="\${k<n?"#c0392b":"rgba(255,255,255,.35)"}" stroke="#5a4630" stroke-width=".8"/>\`;k++}
    F.push(\`<path d="M\${cx.toFixed(1)} \${y.toFixed(1)}L\${x.toFixed(1)} \${y.toFixed(1)}" stroke="#4a3a28" stroke-width="1.2"/><circle cx="\${x.toFixed(1)}" cy="\${y.toFixed(1)}" r="1.6" fill="#5a4630"/>\`+p)}
  return\`<svg class="mz-svg" viewBox="0 0 \${MZ_W} \${MZ_H}" style="inset:0;width:100%;height:100%" aria-hidden="true"><path d="M\${cx} \${box[3]}C\${cx-10} \${box[1]+150} \${cx+10} \${box[1]+80} \${cx-2} \${box[1]+4}" stroke="#4a3a28" stroke-width="2.2" fill="none"/>\${F.join("")}</svg>\`}
const MZ_YU=[[678,163],[698,167],[716,173],[734,179],[752,184],[770,188],[788,186],[806,176],[818,163],[830,150],[845,140],[862,132],[880,124]];
function mzMap(yu){const n=yu?yu[0]:0,P=MZ_YU.map(([x,y],i)=>\`<circle cx="\${x}" cy="\${y}" r="\${i<n?6:4.5}" fill="\${i<n?"#c0392b":"#f3ead2"}" stroke="#5a1a10" stroke-width="1.4"/>\`);
  return\`<svg class="mz-svg" viewBox="0 0 \${MZ_W} \${MZ_H}" style="inset:0;width:100%;height:100%" aria-hidden="true"><path d="M\${MZ_YU.map(p=>p.join(" ")).join("L")}" stroke="#7a2a18" stroke-width="1.2" stroke-dasharray="3 3" fill="none" opacity=".55"/>\${P.join("")}</svg>\`}`;
test("原圖照舊：消寒圖素梅、輿圖 13 站畫出來跟改之前一樣；橫式圖用自己那一框、viewBox 換成 2560×1600", () => {
  const C = load(true), O = vm.createContext({ Math }); vm.runInContext(OLD, O);
  const norm = s => s.replace(/(^|[^0-9])\.(\d)/g, "$10.$2");
  const [plum, map, geo, CL] = vm.runInContext("[mzPlum, mzMap, mzGeo, MZ_CELLS_CL]", C), G0 = geo(false, CL);
  assert.deepEqual([G0.W, G0.H, G0.cells], [896, 1200, CL], "原圖座標、經典版亮格");
  for (const xh of [null, [0, 81], [40, 81], [81, 81]]) {
    assert.equal(norm(plum(xh, G0)), norm(O.mzPlum(xh)), "消寒圖 " + JSON.stringify(xh)); assert.equal(norm(plum(xh)), norm(O.mzPlum(xh)));
  }
  for (const yu of [null, [0, 13], [7, 13], [13, 13]]) { assert.equal(norm(map(yu, G0)), norm(O.mzMap(yu)), "輿圖 " + JSON.stringify(yu)); assert.equal(norm(map(yu)), norm(O.mzMap(yu))) }
  const G = geo(true), p = plum([3, 81], G), m = map([5, 13], G);
  assert.match(p, /viewBox="0 0 2560 1600"/); assert.match(m, /viewBox="0 0 2560 1600"/);
  assert.equal((p.match(/#c0392b/g) || []).length, 3, "染了 3 瓣"); assert.equal((m.match(/#c0392b/g) || []).length, 5, "點亮 5 站");
  const cx = [...p.matchAll(/<circle cx="([\d.]+)" cy="([\d.]+)" r="([\d.]+)"/g)].map(x => [+x[1], +x[2]]);
  assert.equal(cx.length, 81 + 9);
  const r = [...p.matchAll(/<circle cx="[\d.]+" cy="[\d.]+" r="([\d.]+)" fill="(?:#c0392b|rgba)/g)].map(x => +x[1]);
  assert.equal(r.length, 81); for (const v of r) assert.ok(Math.abs(v - 3.4 * 187 / 87) < .01, "梅瓣照立軸寬等比放大：" + v);
  for (const [x, y] of cx) assert.ok(x >= 1183 && x <= 1370 && y >= 218 && y <= 768, "梅瓣在立軸畫心裡：" + x + "," + y);
});

test("選圖照整個畫面量：iPad 橫向換橫式圖（換完重畫疊圖），轉回直向換回原圖；手機橫放、沒開開關照舊原圖", () => {
  const C = load(true), sync = vm.runInContext("mzScwSync", C);
  dims.w = 1180; dims.h = 820; const w = fakeWall(C, SRC_C);
  assert.equal(sync(w.V, w.P), "wait", "比例跨過門檻＝原地換圖");
  assert.equal(w.P.dataset.scw, "l1610"); assert.equal(w.img.src, "data/studymap/study_day_classic_l1610.webp?v=" + vm.runInContext("SCW_IMGV", C)); assert.equal(w.painted(), 1, "換圖後重畫疊圖");
  w.img.complete = true; w.img.naturalWidth = 2560; assert.equal(sync(w.V, w.P), "l1610", "圖載好＝用橫式圖");
  dims.w = 820; dims.h = 1180; assert.equal(sync(w.V, w.P), "wait"); assert.equal(w.P.dataset.scw, ""); assert.equal(w.img.src, SRC_C, "iPad 直向換回原圖"); assert.equal(w.painted(), 2);
  w.img.complete = true; assert.equal(sync(w.V, w.P), null, "原圖＝交回 07fl 照原本排");
  /* iPad 直拿時舞台下面剩的空間比較寬（例如寬 796、剩 700），照牆的實際位置量會誤換；整個畫面量（820×1180）不換 */
  assert.equal(vm.runInContext("scwKind", C)(796, 700, 820, 1180), "l1610", "照實際位置量會誤判（所以不能用）"); assert.equal(sync(w.V, w.P), null);
  dims.w = 932; dims.h = 430; assert.equal(sync(w.V, w.P), null, "手機橫放（短邊不到 600）");
  const C2 = load(false); dims.w = 1180; dims.h = 820; const w2 = fakeWall(C2, SRC_C);
  assert.equal(vm.runInContext("mzScwSync", C2)(w2.V, w2.P), null, "沒開開關、SCW_CDN false＝原圖"); assert.equal(w2.img.src, SRC_C);
  const w3 = fakeWall(C, "data/studymap/study_night_classic.webp?v=2510"); assert.equal(sync(w3.V, w3.P), null, "夜景沒有橫式圖");
});

test("07fl 問 scwSync：書齋牆用橫式圖回 \"wait\"（滿寬往下捲，不 cover）、原圖回 null；別頁照 07sw 原本的 scwSync", () => {
  const C = load(true), sync = vm.runInContext("scwSync", C);
  dims.w = 1180; dims.h = 820; const w = fakeWall(C, SRC_C);
  assert.equal(sync(w.V, w.P), "wait"); w.img.complete = true; w.img.naturalWidth = 2560;
  assert.equal(sync(w.V, w.P), "wait", "已經是橫式圖也回 wait：07fl 不排、不 cover");
  dims.w = 820; dims.h = 1180; assert.equal(sync(w.V, w.P), "wait"); w.img.complete = true; assert.equal(sync(w.V, w.P), null, "原圖＝照原本排");
  /* 不是書齋牆：照 07sw 原本的 scwSync（照圖框實際位置量；這裡沒有登記的鍵＝null） */
  dims.w = 1180; dims.h = 820; const o = fakeWall(C, "data/redomap/redo_day_classic.webp?v=2411"); o.cls.delete("mz-wall");
  assert.equal(sync(o.V, o.P), "wait", "別頁照 07sw 換圖"); assert.equal(o.P.dataset.scw, "l1610");
});

test("橫式圖載不到：記 SCW_BAD、退回原圖；這次開 App 不再試", () => {
  const C = load(true), sync = vm.runInContext("mzScwSync", C);
  dims.w = 1180; dims.h = 820; const w = fakeWall(C, SRC_C);
  sync(w.V, w.P); assert.equal(w.P.dataset.scw, "l1610");
  w.img.complete = true; w.img.naturalWidth = 0;   /* 載完了卻沒有寬＝載不到 */
  assert.equal(sync(w.V, w.P), "wait"); assert.equal(w.img.src, SRC_C, "退回原圖"); assert.equal(vm.runInContext("SCW_BAD", C)[KC], 1);
  w.img.complete = true; w.img.naturalWidth = 768; assert.equal(sync(w.V, w.P), null, "不再試");
});

test("〔混合〕07z4 接線：開頁先量（scwPre）、掛 07sw（換圖時 apply 重畫疊圖）、轉向自己再問一次；走路角色只在原圖掛；物件說明照原圖座標（07w6 遇到橫式圖自己關）", () => {
  assert.match(MZ, /const pre=typeof scwPre==="function"\?scwPre\(v,src\):\{src,k:""\};/);
  assert.match(MZ, /<img src="\$\{pre\.src\}"/);
  assert.match(MZ, /scwMount\(W,\{key:scwKey\(src\),src0:src,ids:\[\],apply:\(\)=>paint\(\)\}\)/);
  assert.match(MZ, /addEventListener\("resize",rs\)/);
  assert.match(MZ, /if\(MZ_WALK_ON&&!W\.dataset\.scw&&/);
  assert.match(MZ, /sciPage\(v,\{k:"study",nm:"書齋",W:MZ_W,H:MZ_H,/);
  assert.match(M("m/07w6-sceneinfo.js"), /const off=\(\)=>\{if\(P\.dataset\.scw\)return true;/);
  const C = load(true); assert.equal(vm.runInContext("MZ_WALK_ON", C), false, "這頁沒有走路角色");
});
