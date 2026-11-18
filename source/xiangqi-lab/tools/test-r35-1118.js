// 11/18 第 33 輪（候選版 0556）P1／P2：
//   N33-1 序局入局後主執行緒卡 7 秒（bot3d 貼牌子的射線、shader 一次編完）、「星盤展開中…」太晚出現；
//   N33-2 七星流星一開始七個落點就有紅點；N33-3 第 2 段電影被「研墨鋪紙…」等待畫面蓋住、「略過」按不到。
// 不開瀏覽器：three.min.js 直接在 node 跑（比對新舊射線結果一模一樣）、vm 跑程式片段、假 canvas／假 DOM。實際卡頓要測試員和實機量。
// 用法：node --test xiangqi-lab/tools/test-r35-1118.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
/* 公開副本（ROOT 有 STAGE-MANIFEST.json）：site 的檔退回倉庫根目錄那一份；模型檔只在 CDN、沒有就略過（同 test-r33-1118.js） */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json"));
function alt(p) { p = String(p); if (!PUB || fs.existsSync(path.join(ROOT, p))) return p; const q = p.replace(/^xiangqi-lab\/site\//, "../"); return fs.existsSync(path.join(ROOT, q)) ? q : p }
function skipMissing(t0) {
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { if (PUB && e && e.code === "ENOENT") { t.skip("缺檔（公開副本不含）：" + e.path); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, j) };

/* ---------- N33-1 bot3d：快的射線跟 three 的 Raycaster 結果一模一樣 ---------- */
function three() { return require(path.join(ROOT, alt("xiangqi-lab/site/three.min.js"))) }
function gly(T) { const S = rd("xiangqi-lab/src/bot3d.js"); return new Function("T", "localStorage", "window", between(S, "const GLY_V=", "  function attachGLB(") + ";return{glySurf,glyCast,glyLater,glyPzGet,glyPzPut}")(T, { getItem: () => null, setItem() {} }, {}) }
function cmpRays(T, G, g, n) { const bb = new T.Box3().setFromObject(g), sz = bb.getSize(new T.Vector3()), rc = new T.Raycaster(), S = G.glySurf(g); assert.ok(S, "走快的那條路"); let hit = 0, k = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= n; j++) for (const back of [0, 1]) {
    const o = new T.Vector3(bb.min.x + sz.x * i / n, bb.min.y + sz.y * j / n, back ? bb.min.z - sz.z - 1 : bb.max.z + sz.z + 1), d = new T.Vector3(0, 0, back ? 1 : -1);
    rc.set(o, d); const h = rc.intersectObject(g, true)[0], a = h ? h.point.z : null; rc.set(o, d); const b = G.glyCast(S, rc);
    assert.equal(b, a, `第 ${k} 條（${i},${j},${back ? "背" : "胸"}）`); if (a !== null) hit++; k++ }
  return { hit, k } }
test("N33-1 射線：合成模型（有骨架、擺過姿勢、多材質群組、正面／背面／雙面剔除、沒有 index 的網格、巢狀群組）——新算法每一條射線的交點深度跟 three Raycaster 完全相同", () => {
  const T = three(), G = gly(T), g = new T.Group();
  /* 有骨架的盒子：兩根骨頭、轉過；三個材質群組 */
  const geo = new T.BoxGeometry(1, 2, .6, 6, 10, 4), pos = geo.attributes.position, si = [], sw = [];
  for (let i = 0; i < pos.count; i++) { const y = pos.getY(i), w = Math.min(1, Math.max(0, (y + 1) / 2)); si.push(0, 1, 0, 0); sw.push(1 - w, w, 0, 0) }
  geo.setAttribute("skinIndex", new T.Uint16BufferAttribute(si, 4)); geo.setAttribute("skinWeight", new T.Float32BufferAttribute(sw, 4));
  const mats = [new T.MeshBasicMaterial({ side: T.FrontSide }), new T.MeshBasicMaterial({ side: T.BackSide }), new T.MeshBasicMaterial({ side: T.DoubleSide }), new T.MeshBasicMaterial(), new T.MeshBasicMaterial({ side: T.BackSide }), new T.MeshBasicMaterial({ side: T.DoubleSide })];
  const sk = new T.SkinnedMesh(geo, mats), b0 = new T.Bone(), b1 = new T.Bone(); b0.position.y = -1; b1.position.y = 1.2; b0.add(b1); sk.add(b0); g.add(sk); sk.updateMatrixWorld(true); sk.bind(new T.Skeleton([b0, b1]));
  b1.rotation.set(.4, .3, -.5); b0.rotation.z = .15;
  /* 沒有 index 的球、巢狀群組裡的小圓柱（雙面） */
  const sp = new T.Mesh(new T.SphereGeometry(.35, 18, 12).toNonIndexed(), new T.MeshBasicMaterial({ side: T.FrontSide })); sp.position.set(.3, .4, .5); g.add(sp);
  const sub = new T.Group(); sub.position.set(-.4, -.3, .1); sub.rotation.set(.2, .7, 0); const cy = new T.Mesh(new T.CylinderGeometry(.2, .25, 1.4, 16, 3), new T.MeshBasicMaterial({ side: T.DoubleSide })); sub.add(cy); g.add(sub);
  g.rotation.y = -Math.PI / 2; g.updateMatrixWorld(true);
  const r = cmpRays(T, G, g, 30); assert.ok(r.hit > 300, "有打到東西：" + r.hit + "／" + r.k);
  /* 模型裡有線（Line）＝不走快路、照舊用 three 的 Raycaster */
  const g2 = new T.Group(); g2.add(new T.Mesh(new T.BoxGeometry(1, 1, 1))); g2.add(new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3(1, 1, 1)]))); assert.equal(G.glySurf(g2), null);
});

test("N33-1 射線：真的棋子人模型（x_bing、x_shuai 有骨架、擺過姿勢；xs_zu 黑卒沒骨架）每條射線結果相同，而且快很多（沒有模型檔＝略過）", t => {
  const D = path.join(ROOT, "xiangqi-lab/site/data/tripo_app"); if (!fs.existsSync(path.join(D, "x_bing.glb"))) return t.skip("沒有模型檔（只在 CDN）");
  const T = three(), G = gly(T);
  const acc = (J, buf, i) => { const A = J.accessors[i], V = J.bufferViews[A.bufferView], off = 28 + J.__jl + (V.byteOffset || 0) + (A.byteOffset || 0);
    const C = { 5126: Float32Array, 5123: Uint16Array, 5125: Uint32Array, 5121: Uint8Array }[A.componentType], n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[A.type];
    const out = new C(A.count * n), st = V.byteStride || C.BYTES_PER_ELEMENT * n, dv = new DataView(buf.buffer, buf.byteOffset);
    for (let k = 0; k < A.count; k++) for (let j = 0; j < n; j++) { const p = off + k * st + j * C.BYTES_PER_ELEMENT; out[k * n + j] = C === Float32Array ? dv.getFloat32(p, true) : C === Uint16Array ? dv.getUint16(p, true) : C === Uint32Array ? dv.getUint32(p, true) : dv.getUint8(p) } return out };
  const load = (f, pose) => { const buf = fs.readFileSync(path.join(D, f + ".glb")), jl = buf.readUInt32LE(12), J = JSON.parse(buf.slice(20, 20 + jl)); J.__jl = jl; const js = new Set(J.skins && J.skins[0] ? J.skins[0].joints : []);
    const O = J.nodes.map((nd, i) => { const o = js.has(i) ? new T.Bone() : new T.Object3D(); if (nd.translation) o.position.fromArray(nd.translation); if (nd.rotation) o.quaternion.fromArray(nd.rotation); if (nd.scale) o.scale.fromArray(nd.scale); return o });
    J.nodes.forEach((nd, i) => (nd.children || []).forEach(c => O[i].add(O[c]))); const root = new T.Group(); for (const r of J.scenes[0].nodes) root.add(O[r]); const ms = [];
    J.nodes.forEach((nd, i) => { if (nd.mesh == null) return; for (const pr of J.meshes[nd.mesh].primitives) { const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(acc(J, buf, pr.attributes.POSITION), 3)); if (pr.indices != null) geo.setIndex(new T.BufferAttribute(acc(J, buf, pr.indices), 1));
      const mat = new T.MeshBasicMaterial({ side: J.materials[pr.material || 0].doubleSided ? T.DoubleSide : T.FrontSide }); let m;
      if (nd.skin != null) { geo.setAttribute("skinIndex", new T.BufferAttribute(new Uint16Array(acc(J, buf, pr.attributes.JOINTS_0)), 4)); geo.setAttribute("skinWeight", new T.BufferAttribute(acc(J, buf, pr.attributes.WEIGHTS_0), 4)); m = new T.SkinnedMesh(geo, mat); m.__s = nd.skin } else m = new T.Mesh(geo, mat); O[i].add(m); ms.push(m) } });
    root.updateMatrixWorld(true); for (const m of ms) if (m.isSkinnedMesh) { const S = J.skins[m.__s], IB = acc(J, buf, S.inverseBindMatrices); m.bind(new T.Skeleton(S.joints.map(j => O[j]), S.joints.map((_, k) => new T.Matrix4().fromArray(IB, k * 16))), m.matrixWorld) }
    if (pose) { let s = 7; const r = () => (s = (s * 16807) % 2147483647) / 2147483647; for (const o of O) if (o.isBone) o.rotation.set(o.rotation.x + (r() - .5) * .5, o.rotation.y + (r() - .5) * .5, o.rotation.z + (r() - .5) * .5) }
    root.rotation.y = -Math.PI / 2; root.updateMatrixWorld(true); return root };
  for (const [f, pose] of [["x_bing", 1], ["x_shuai", 1], ["xs_zu", 0]]) { const g = load(f, pose), r = cmpRays(T, G, g, 12); assert.ok(r.hit > 50, f) }
});

test("N33-1 貼牌子：同一種模型、同一面牌子的深度記起來（記憶體＋本機 xqGly1）；還沒算過的排隊、一次一顆、每顆前讓出主執行緒；park3d 淡入前等排隊做完", async () => {
  const S = rd("xiangqi-lab/src/bot3d.js");
  assert.ok(S.includes('const gk=glyKey(o.glb,B.mixer,R,bb);let pz=glyPzGet(gk);') && S.includes("if(pz==null){pz=glyPzCalc(g,R,rad,px,py,bb,sz);glyPzPut(gk,pz)}"), "查不到才算、算完記下（11/18 第 34 輪：鍵改 glyKey、算法抽成 glyPzCalc）");
  assert.ok(S.includes("if(SF){const z=glyCast(SF,rc);hz=z===null?-1e9:(R.back?-z:z)}else{const hit=rc.intersectObject(g,true)[0];hz=hit?(R.back?-hit.point.z:hit.point.z):-1e9}"), "快路／舊路");
  assert.ok(S.includes(".then(sc=>glyLater(()=>{if(!sc)throw new Error(\"empty\");") && S.includes("void gkOf;run()}") && S.includes("return glbFin()}));B.glbP.catch("), "整段接模型都排進 glyLater（11/18 第 35 輪；見 test-r40-1118.js）");
  const P = rd("xiangqi-lab/src/park3d.js"); assert.ok(P.includes('if(n&&typeof window.XQGLY_PEND==="function"&&window.XQGLY_PEND()>0)return false'), "淡入前等貼牌子做完");
  /* 排隊：一次一件、每件之前讓出（setTimeout）；XQGLY_PEND 數得對 */
  const T = three(), w = {}, src = between(S, "const GLY_V=", "  function attachGLB("), L = []; const ls = { d: {}, getItem(k) { return this.d[k] ?? null }, setItem(k, v) { this.d[k] = v } };
  const X = new Function("T", "localStorage", "window", "setTimeout", src + ";return{glyLater,glyPzGet,glyPzPut}")(T, ls, w, (f, ms) => { L.push(["yield", ms]); setImmediate(f) });
  const order = []; const ps = [1, 2, 3].map(i => X.glyLater(() => { order.push(i); return i }));
  assert.equal(w.XQGLY_PEND(), 3); assert.deepEqual(order, [], "不當場做");
  assert.deepEqual(await Promise.all(ps), [1, 2, 3]); await new Promise(r => setImmediate(r)); assert.deepEqual(order, [1, 2, 3]); assert.equal(w.XQGLY_PEND(), 0); assert.equal(L.length, 3, "每件之前都讓出一次");
  X.glyPzPut("k1", .25); assert.equal(X.glyPzGet("k1"), .25); assert.equal(JSON.parse(ls.d.xqGly1).k1, .25, "存到本機");
  const Y = new Function("T", "localStorage", "window", src + ";return{glyPzGet}")(T, ls, {}); assert.equal(Y.glyPzGet("k1"), .25, "下次開 App 直接讀本機");
});

test("N33-1 shader 分段暖機：場景拆成小單位（含燈光的不藏、往下拆）、每批只留一小批看得見、編完讓出主執行緒；reveal 仍會補編", () => {
  const P = rd("xiangqi-lab/src/park3d.js"), src = between(P, "const warmUnits=", "\n    let warmed=false;");
  const warmUnits = vm.runInNewContext("(" + src.replace(/^const warmUnits=/, "").replace(/;\s*\/\*[^]*$/, "").replace(/;$/, "") + ")");
  const node = (name, kids, o) => Object.assign({ name, children: kids || [], visible: true, traverse(f) { f(this); for (const c of this.children) c.traverse(f) } }, o || {});
  const pieces = node("pieces", Array.from({ length: 32 }, (_, i) => node("p" + i, [node("m" + i)])));
  const sc = node("sc", [node("sun", [], { isLight: true }), node("lamps", [node("lamp", [], { isLight: true }), node("post")]), node("board"), pieces, node("hidden", [], { visible: false })]);
  const U = warmUnits(sc, 40).map(o => o.name);
  assert.ok(!U.includes("sun") && !U.includes("lamp") && !U.includes("lamps") && !U.includes("hidden"), "燈光、含燈光的那支、本來就藏著的都不當單位");
  assert.ok(U.includes("post") && U.includes("board") && U.includes("p0") && U.includes("p31") && !U.includes("pieces"), "大的群組往下拆：" + U.join());
  assert.ok(P.includes("warmShaders(()=>requestAnimationFrame(()=>requestAnimationFrame(reveal)));return}"), "淡入前先暖機");
  assert.ok(P.includes("warmed=true;warmRun(done,4000)") && P.includes("if(GIANT)warmRun(()=>{if(!stopped)requestAnimationFrame(frame)},4000);else requestAnimationFrame(frame);"), "淡入前、巨盤第一格前都分段暖（11/18 第 35 輪改成一段一支 shader、各 4 秒；行為見 test-r40-1118.js）");
  assert.ok(P.includes("try{rd.compile(sc,cam)}catch(e){}rd.domElement.style.opacity=1"), "reveal 照舊補編");
});

test("N33-1「星盤展開中…」：入局當下就放好、透明，CSS 動畫 2 秒後淡入（主執行緒卡住也照樣出現）；都好了照舊拿掉", () => {
  const B = M("07bh-blackhole.js");
  assert.ok(B.includes('function bhxReveal(){const t0=Date.now(),S={shown:false,models:false,boss:false};let hint=false;try{bhxHint("delay")}catch(e){}'));
  const fn = between(B, "function bhxHint(on){", "\nfunction bhxIntro(");
  const mk = () => { const els = []; const el = tag => { const e = { tag, style: {}, children: [], attrs: {}, className: "", textContent: "", append(c) { this.children.push(c); c.parent = this }, setAttribute(k, v) { this.attrs[k] = v }, remove() { this.parent.children = this.parent.children.filter(x => x !== this) },
      querySelector(s) { return this.children.find(c => s === "." + c.className) || null } }; els.push(e); return e };
    const bk = el("div"), head = el("head"); const doc = { getElementById: id => id === "bhxBk" ? bk : els.find(e => e.id === id) || null, createElement: el, head };
    const ctx = { document: doc }; vm.createContext(ctx); vm.runInContext(fn + ";this.h=bhxHint", ctx); return { h: ctx.h, bk, head } };
  const E = mk(); E.h("delay"); const h = E.bk.children[0];
  assert.equal(h.textContent, "星盤展開中…"); assert.equal(h.attrs.role, "status"); assert.equal(h.style.opacity, "0"); assert.equal(h.style.animation, "bhxLd .4s ease-out 1.6s forwards", "1.6 秒開始淡入、2.0 秒看得到（11/18 第 35 輪 N35-1）");
  assert.ok(/@keyframes bhxLd\{from\{opacity:0\}to\{opacity:\.85\}\}/.test(E.head.children[0].textContent));
  E.h(true); assert.equal(E.bk.children.length, 1, "不重複放"); assert.equal(h.style.opacity, ".85", "超過 2 秒照舊直接亮"); E.h(false); assert.equal(E.bk.children.length, 0, "好了拿掉");
});

/* ---------- N33-2 七星流星：落地前不畫落點紅點 ---------- */
test("N33-2 七星流星（電影版）：逐格看，從流星開始到最後一顆落地前，紅點只出現在已經落地的那幾顆；減少動態版照舊一起淡入", () => {
  const B = M("07bh-blackhole.js"), code = between(B, "function bhxMeteor(", "\n/* 入口：選角確認後"), SPOT = between(B, "const BHX_SPOT=", ";   /*"), MET = between(B, "const BHX_MET=", ";");
  assert.ok(code.includes("let p=null,land=-1;"), "land 預設＝還沒落地");
  const run = rm => { let now = 0; const raf = []; const arcs = []; const g = { scale() {}, clearRect() { arcs.push("|") }, createRadialGradient: () => ({ addColorStop() {} }), beginPath() {}, arc(x, y, r) { arcs.push([x, y, r]) }, fill() {}, stroke() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, closePath() {}, save() {}, restore() {}, translate() {}, setLineDash() {} };
    const cv = { getContext: () => g, width: 0, height: 0, className: "" }; const o = { clientWidth: 768, clientHeight: 1376, prepend() {}, querySelector: () => null };
    const ctx = { document: { createElement: () => cv }, innerWidth: 768, innerHeight: 1376, performance: { now: () => now }, requestAnimationFrame: f => { raf.push(f); return raf.length }, cancelAnimationFrame() {},
      matchMedia: () => ({ matches: rm }), myChar: () => "x_swordboy", bhxStarRev() {}, bhxDpr: () => 1, bhxLowDevice: () => true };
    vm.createContext(ctx); vm.runInContext(SPOT + ";" + MET + ";" + code + ";this.m=bhxMeteor;this.S=BHX_SPOT;this.T=BHX_MET", ctx);
    ctx.m(o, null, { mode: "all" }); const frames = [];
    for (let t = 0; t <= 4000; t += 16) { now = t; const f = raf.shift(); if (!f) break; arcs.length = 0; f(now); frames.push({ t: t / 1000, arcs: arcs.slice() }) }
    return { frames, S: ctx.S, T: ctx.T } };
  const { frames, S, T } = run(false), K = Object.keys(S), last = T.d0 + (K.length - 1) * T.dk + T.fl;
  let seen = 0;
  for (const F of frames) K.forEach((k, i) => { const [x, y] = S[k], dot = F.arcs.some(a => Array.isArray(a) && Math.abs(a[0] - x) < 1e-6 && Math.abs(a[1] - y) < 1e-6 && Math.abs(a[2] - 14) < 1e-6), landAt = T.d0 + i * T.dk + T.fl;
    if (F.t < landAt - 1e-9) assert.ok(!dot, `${F.t.toFixed(3)} 秒：${k} 還沒落地（${landAt.toFixed(2)}）就有紅點`); else if (dot) seen++ });
  assert.ok(frames[0].arcs.every(a => !Array.isArray(a) || !K.some(k => Math.abs(a[0] - S[k][0]) < 1e-6 && Math.abs(a[1] - S[k][1]) < 1e-6)), "第一格：七個落點都沒有東西");
  const end = frames.find(F => F.t >= last + .05); assert.ok(end && K.every(k => end.arcs.some(a => Array.isArray(a) && Math.abs(a[0] - S[k][0]) < 1e-6 && Math.abs(a[1] - S[k][1]) < 1e-6 && Math.abs(a[2] - 14) < 1e-6)), "全部落地後七個紅點都在");
  assert.ok(seen > 0);
  const R = run(true); assert.ok(R.frames.length >= 1 && R.frames.every(F => !F.arcs.some(a => Array.isArray(a) && Object.keys(R.S).some(k => Math.abs(a[0] - R.S[k][0]) < 1e-6 && Math.abs(a[1] - R.S[k][1]) < 1e-6 && Math.abs(a[2] - 14) < 1e-6))), "減少動態：流星畫布不先畫紅點（七個紅光由原圖紅光層 1.2 秒一起淡入，測試員第 33 輪已驗過）");
});

/* ---------- N33-3 電影播放中，等待畫面不蓋上去 ---------- */
test("N33-3「研墨鋪紙…」：電影（#bhxPg、#mnfPg、#mnvPg）在畫面上時等待畫面藏起來、不擋點擊（照樣在背後下載、擋住還沒好的頁）；電影收掉還沒好才露出來；電影開始時馬上藏", () => {
  const P = M("09b-preload.js"), B = M("07bh-blackhole.js");
  assert.ok(P.includes("#pgate.pg-film{visibility:hidden;opacity:0;pointer-events:none}"));
  assert.ok(P.includes('document.body.append(g);keepAwake("pgate",()=>!!document.getElementById("pgate"))}preFilmHide(g);'), "建等待畫面時就看電影");
  assert.equal((B.match(/document\.body\.append\(o\);try\{if\(typeof preFilmHide==="function"\)preFilmHide\(\)\}catch\(e\)\{\}/g) || []).length, 2, "bhxFilm、bhxPages 開始時都叫");
  assert.ok(B.includes("bhxIdle0(()=>{try{bhxPreImg()}catch(e){}try{bhxPreFetch(0)}catch(e){}"), "邀局時先抓電影的圖");
  const fn = between(P, 'const PRE_FILM="', "\nfunction preGateOff(){");
  let film = null; const iv = []; const cls = new Set(), g = { isConnected: true, classList: { toggle: (c, on) => on ? cls.add(c) : cls.delete(c) } };
  const ctx = { document: { querySelector: s => (film && s.split(",").includes(film) ? {} : null), getElementById: () => g }, setInterval: f => { iv.push(f); return iv.length }, clearInterval() { iv.length = 0 } };
  vm.createContext(ctx); vm.runInContext(fn + ";this.h=preFilmHide", ctx);
  assert.equal(ctx.h(g), false); assert.ok(!cls.has("pg-film"), "沒有電影：照常顯示");
  film = "#bhxPg"; iv[0](); assert.ok(cls.has("pg-film"), "電影出現（等待畫面先建、電影後開）：0.25 秒內藏起來");
  film = null; iv[0](); assert.ok(!cls.has("pg-film"), "電影收掉還沒下載完：露出來");
  film = "#mnfPg"; assert.equal(ctx.h(), true); assert.ok(cls.has("pg-film"), "主線電影也一樣、直接叫也會藏");
  g.isConnected = false; iv[0](); assert.equal(iv.length, 0, "等待畫面拿掉就停止看");
});
