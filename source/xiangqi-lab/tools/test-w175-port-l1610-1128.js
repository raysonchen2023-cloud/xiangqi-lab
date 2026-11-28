// #175（#165 渡口 iPad 橫式圖的後續小項，審查第五～九輪列的不擋項）：新增的檢查放在這支，既有的 test-w107-port-l1610.js 不動。
// ① 監聽器不累積：07w shwMount 的點擊、shwBotHook 的 pointerdown 重掛時換掉舊的；07w4 渡口主人收掉時 IntersectionObserver、ResizeObserver、document 點擊一起收。
// ② 第八輪漏抓的突變補上：開頁換成橫式圖、13 朝門／碼頭／景點座標整組寫死、人物身高、safe、.ph4-pz 跟著換。
// ③ 4:3 iPad 橫向邊緣：07f portEdge 把超出看得到範圍的景點、門、主人（畫布＋點擊區＋泡泡一起）往內推，留 6px；直圖一律清掉。
// ⑥⑦ 旅伴「！」：點擊區一換馬上跟到新的（不等 400ms）、藏起來的計數歸零；點擊區藏起來時「！」也藏。
// 用法 node --test xiangqi-lab/tools/test-w175-port-l1610-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const M = p => fs.readFileSync(path.join(__dirname, "../../xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const F = M("m/07f-ship.js"), WK = M("m/07w-shipwalk.js"), W4 = M("m/07w4-porthost.js"), BQ = M("m/07q-buddy.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + b.length) };

/* ---------- ② 座標整組寫死 ---------- */
test("13 朝的三扇門、碼頭盡頭與標籤、小船、景點、船艙石桌、路網節點整組寫死（Windows Claude 1 量的 port_l1610.json＋明朝 m1）；人物身高、safe 也寫死", () => {
  const P = new Function(cut(F, "const PORT_L1610={", "const PORT_L1610_H=").replace(/const PORT_L1610_H=$/, "") + ";return PORT_L1610")();
  const pick = {}; for (const k of Object.keys(P).sort()) pick[k] = { spot: P[k].spot, at: P[k].pier.at, boat: P[k].pier.boat, sight: P[k].sight, poPh: P[k].poPh || null, N: P[k].walk.N, pN: P[k].pier.N };
  assert.equal(Object.keys(P).length, 13);
  assert.equal(crypto.createHash("sha256").update(JSON.stringify(pick)).digest("hex").slice(0, 16), "f500d68d619671b4", "13 朝座標有變：照量測 json 改的話，這裡的雜湊一起改（計分規則 PR）");
  assert.match(F, /const PORT_L1610_H=\[\.09,72,\.0018\];/, "人物身高");
  assert.match(F, /SCW\["shipmap\/port_"\+k\+"_f"\]=\{ready:true,f:"shipmap\/port_"\+k\+"_f_l1610",w:2560,h:1600,S,exit:null,safe:\{l:\.12,r:\.12,t:\.05,b:\.10\},/, "safe");
});

test("開頁就換成橫式圖：scwPre 有選到（pre.k）就把 img.src 換掉、標 data-scw、加 scw-l；.ph4-pz 照碼頭盡頭跟著換（直圖照 PH4_PIER）", () => {
  const src = cut(F, "function portScw(v,k){", "\n  place()}");
  assert.match(src, /if\(pre\.k\)\{img\.src=pre\.src;P\.dataset\.scw=pre\.k;P\.classList\.add\("scw-l"\)\}/);
  /* 實跑 place() 裡 .ph4-pz 那一行 */
  const line = cut(src, "const A=X?X.pier", 'z.style.top=(q[1]-4.5)+"%"}');
  const run = (X) => { const z = { style: {} }; new Function("X", "P", "PH4_PIER", "k", "scwPut", line)(X, { querySelector: q => q === ".ph4-pz" ? z : null }, { tang: { N: { pier: [30, 60] } } }, "tang", () => { }); return z.style };
  assert.deepEqual({ ...run({ pier: { N: { pier: [80, 90] }, at: [1, 2] } }) }, { left: "71%", top: "85.5%" }, "橫式圖照條目的碼頭盡頭");
  assert.deepEqual({ ...run(null) }, { left: "21%", top: "55.5%" }, "直圖照 PH4_PIER");
});

/* ---------- ③ 4:3 邊緣 ---------- */
function edgeEnv(scw, items, hostLeft) {
  const mk = (cls, left, w, id) => ({ className: cls, id: id || "", style: { translate: "x" }, getBoundingClientRect() { const d = parseFloat(this.style.translate) || 0; return { left: left + d, right: left + w + d, width: w } } });
  const kids = items.map(([cls, l, w, id]) => mk(cls, l, w, id));
  const host = hostLeft == null ? null : mk("ph4", hostLeft, 120), hit = hostLeft == null ? null : mk("ph4-hit", hostLeft + 40, 40), say = hostLeft == null ? null : mk("ph4-say", hostLeft, 200);
  const V = { getBoundingClientRect: () => ({ left: 0, right: 1000, width: 1000 }) };
  const P = { isConnected: true, parentNode: V, dataset: scw ? { scw: "l1610" } : {},
    querySelectorAll: q => q.includes("po-sight") ? kids : [host, hit, say].filter(Boolean), querySelector: q => (q === ":scope>.ph4" ? host : null) };
  const fn = new Function(cut(F, "function portEdge(P){", "G.forEach(e=>e.style.translate=Math.round(d)+\"px 0\")}}") + "\nreturn portEdge;")();
  fn(P); return { kids, host, hit, say };
}
test("〔混合〕portEdge（4:3 iPad 橫向）：超出右邊、左邊的景點和門往內推到離邊 6px；在範圍內的不動；主人的畫布、點擊區、泡泡推同樣的距離；直圖一律清掉", () => {
  const E = edgeEnv(true, [["po-sight", 960, 60], ["po-sight", -12, 50], ["shp-spot", 400, 80, "poInn"]], 900);
  assert.equal(E.kids[0].style.translate, "-26px 0", "右邊超出 20px＋留 6px");
  assert.equal(E.kids[1].style.translate, "18px 0", "左邊超出 12px＋留 6px");
  assert.equal(E.kids[2].style.translate, "", "範圍內的不動（舊的 translate 也清掉）");
  assert.equal(E.host.style.translate, "-26px 0"); assert.equal(E.hit.style.translate, "-26px 0", "點擊區跟著畫布推"); assert.equal(E.say.style.translate, "-26px 0");
  const D = edgeEnv(false, [["po-sight", 960, 60]], 900);
  assert.equal(D.kids[0].style.translate, "", "直圖不推，還清掉"); assert.equal(D.host.style.translate, "");
});
test("portEdge 有掛上：place 完量一次；07fl 推圖（style）、轉向（data-scw）、主人晚掛上時也量（另一個觀察者 _pcEmo，不改 --pcL 那一段）", () => {
  const src = cut(F, "function portScw(v,k){", "\n  place()}");
  assert.match(src, /setTimeout\(\(\)=>portEdge\(P\),0\);/);
  assert.match(src, /P\._pcEmo=new MutationObserver\(es=>\{if\(es\.some\(e=>e\.type==="attributes"\|\|\[\.\.\.e\.addedNodes\]\.some\(n=>n\.classList&&n\.classList\.contains\("ph4"\)\)\)\)setTimeout\(\(\)=>portEdge\(P\),50\)\}\);P\._pcEmo\.observe\(P,\{attributes:true,attributeFilter:\["style","data-scw"\],childList:true\}\)/);
});

/* ---------- ① 監聽器不累積 ---------- */
test("〔混合〕shwMount 重掛（iPad 轉向）時拿掉上一次的點擊監聽，只留一個；shwBotHook 的 pointerdown 也換掉舊的", () => {
  const line = cut(WK, "if(o.root._shwClk)", "o.root.addEventListener(\"click\",o.root._shwClk,true);");
  const L = new Set(), root = { addEventListener: (t, f) => L.add(t + ":" + f.name + Math.random()) && (root._l = (root._l || []).concat([f])), removeEventListener: (t, f) => { root._l = (root._l || []).filter(x => x !== f) } };
  for (let i = 0; i < 3; i++) new Function("o", "S", "shwClick", line)({ root }, {}, () => { });
  assert.equal(root._l.length, 1, "轉 3 次還是只有一個");
  assert.match(WK, /if\(M\._shwPd\)M\.removeEventListener\("pointerdown",M\._shwPd,true\);M\._shwPd=\(\)=>\{last=Date\.now\(\)\};M\.addEventListener\("pointerdown",M\._shwPd,true\);/);
});
test("渡口主人收掉（end）時，IntersectionObserver、ResizeObserver、document 的點擊監聽一起收", () => {
  assert.match(W4, /let vis=true,io=null,ro=null;try\{io=new IntersectionObserver\(/);
  assert.match(W4, /const end=\(\)=>\{try\{cv\.remove\(\)\}catch\(e\)\{\}try\{r\.dispose\(\);r\.forceContextLoss\(\)\}catch\(e\)\{\}hit\.remove\(\);say\.remove\(\);try\{if\(io\)io\.disconnect\(\);if\(ro\)ro\.disconnect\(\)\}catch\(e\)\{\}document\.removeEventListener\("click",outside,true\)\};/);
});

/* ---------- ⑥⑦ 旅伴「！」 ---------- */
function buddyEnv() {
  const src = cut(BQ, "function bdPort(v,k){", "\n  tick()}");
  let next = null, moCb = null, moOn = false; const mkEl = (cls) => ({ className: cls || "", style: {}, attrs: {}, isConnected: true, setAttribute(k, x) { this.attrs[k] = x }, remove() { this.isConnected = false } });
  const hit1 = mkEl("ph4-hit"); Object.assign(hit1.style, { display: "", left: "100px", width: "40px", top: "200px" });
  const st = { cur: hit1, cards: 0 }; const pad = { isConnected: true, querySelector: () => null, prepend: () => { st.cards++ } };
  const P = { isConnected: true, dataset: {}, classList: { contains: () => false }, querySelector: q => q === ".ph4-hit" ? (st.cur && st.cur.isConnected ? st.cur : null) : null, append(x) { this.mk = x } };
  const v = { querySelector: q => q === ".shp-page.cq" ? P : q === ".pad.port" ? pad : null, addEventListener() { }, removeEventListener() { } };
  const ctx = vm.createContext({ bdOk: () => true, bdEvent: () => ({ c: "x" }), bdSt: () => ({ ev: {} }), bdKnHere: () => "", bdCss() { }, bdNk: () => "小喵", ph4Who: () => "x", bdFace: () => "", esc: s => s,
    document: { createElement: () => mkEl(), querySelector: () => null }, setTimeout: f => { next = f }, parseFloat,
    MutationObserver: function (cb) { moCb = cb; this.observe = (t, o) => { moOn = t === P && !!(o && o.childList) }; this.disconnect = () => { moCb = null } } });
  vm.runInContext(src, ctx); vm.runInContext("bdPort", ctx)(v, "tang");
  return { P, st, mkEl, hit1, next: () => next(), mo: () => { assert.ok(moOn, "觀察者要真的掛在頁框上（childList）"); moCb([]) } };
}
test("〔混合〕旅伴「！」：點擊區一被拿掉就馬上藏、換新的馬上搬過去（不等下一次 400ms 的 tick）", () => {
  const E = buddyEnv(), mk = E.P.mk;
  assert.equal(mk.style.left, "120px");
  E.hit1.remove(); E.st.cur = null; E.mo();
  assert.equal(mk.style.display, "none", "拿掉的同時就藏");
  const h2 = E.mkEl("ph4-hit"); Object.assign(h2.style, { display: "", left: "300px", width: "40px", top: "100px" }); E.st.cur = h2; E.mo();
  assert.equal(mk.style.left, "320px", "掛上的同時就搬過去"); assert.equal(mk.style.display, ""); assert.match(h2.attrs["aria-label"], /小喵/);
});
test("〔混合〕旅伴「！」：點擊區藏起來（display:none）時「！」也藏；換了新點擊區，藏起來的計數 n 歸零（不會因為舊的那段時間提早退回小卡）", () => {
  const E = buddyEnv(), mk = E.P.mk;
  E.hit1.style.display = "none"; E.next(); assert.equal(mk.style.display, "none", "點擊區藏起來，「！」也藏");
  for (let i = 0; i < 40; i++) E.next();   /* 已經藏了 41 次 */
  const h2 = E.mkEl("ph4-hit"); Object.assign(h2.style, { display: "none", left: "300px", width: "40px", top: "100px" });
  E.hit1.remove(); E.st.cur = h2; E.next();   /* 換新的（還藏著）：n 歸零後重算 */
  for (let i = 0; i < 40; i++) E.next();
  assert.equal(E.st.cards, 0, "換新後又藏了 41 次，加起來超過 50 次也還沒退回小卡（n 有歸零）");
  for (let i = 0; i < 9; i++) E.next();
  assert.equal(E.st.cards, 1, "新的這一顆藏滿 50 次才退回");
});
