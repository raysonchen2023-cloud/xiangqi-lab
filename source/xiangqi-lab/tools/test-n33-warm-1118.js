// 11/18 第 36 輪 N33-1（iMac：按「入局」到底幕拿掉 8.2 秒、getProgramInfoLog 一段 767ms）：黑洞序局 shader 暖機改寫後的流程測試。
// 內建瀏覽器實測（記下每一支 program 在哪裡、為誰編）找到的四個原因，這裡用假 renderer 一個一個重現：
//   ① 兩次暖機（巨盤第一格前、淡入前 warmShaders）同時跑、共用燈光替身，先跑完的把替身清空 → 後面全用「沒有燈」編；
//   ② 魔王 bossfx3d 暖機途中加兩盞點光源 → 之前編的鍵（點光源數 0）不能用；
//   ③ 模型在暖機後才接上 → 淡入前的某一格一次編十幾支；
//   ④ three r149 render 先畫陰影、後 setupLights（深度 shader 的鍵用上一次的燈光數，第一格是 0）；共用深度材質只在骨架狀態換過來、或版本變了才重算。
// 假 renderer 照 r149 的規則：compile＝traverseVisible 收燈、setupLights、traverse 收材質（不看 visible）；
//   render＝先用「上一次」的燈光狀態畫陰影（共用深度材質，骨架換了或 version 變了才重算鍵）→ setupLights → 主畫面（燈變了、材質版本變了才重算鍵）；
//   每次畫一個物件都經過 rd.renderBufferDirect（暖機會暫時包一層）。
// 用法：node --test xiangqi-lab/tools/test-n33-warm-1118.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const SRC = process.env.N33_SRC || path.join(ROOT, "xiangqi-lab/src/park3d.js"), HAVE = fs.existsSync(SRC), NO = "沒有 xiangqi-lab/src（公開副本不含）";
const THREE_P = ["xiangqi-lab/src/three.min.js", "xiangqi-lab/site/three.min.js", "../three.min.js"].map(p => path.join(ROOT, p)).find(p => fs.existsSync(p)) || null;
const NO3 = "找不到 three.min.js";
const SKIP = !HAVE ? NO : !THREE_P ? NO3 : false;
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, j) };
const mats = o => o.material ? [].concat(o.material) : [];

function fakeRd() {
  const progs = new Set(), states = new Map(), props = new WeakMap(); let cur = null, L = "";
  const lightsOf = s => { let d = 0, p = 0, h = 0, x = 0, sh = 0; s.traverseVisible(o => { if (!o.isLight) return; if (o.isDirectionalLight) d++; else if (o.isPointLight) p++; else if (o.isHemisphereLight) h++; else x++; if (o.castShadow) sh++ }); return [d, p, h, x, sh].join("/") };
  const st = s => { if (!states.has(s)) states.set(s, { L: "0/0/0/0/0" }); return states.get(s) };
  const add = k => { if (!progs.has(k)) { progs.add(k); R.info.programs.push(k); if (cur) cur.push(k) } };
  const mkey = (m, o, l, s) => [m.type, m.customProgramCacheKey ? m.customProgramCacheKey() : "", l, s.fog && m.fog !== false ? 1 : 0, o.isSkinnedMesh ? 1 : 0, m.map ? 1 : 0, m.side].join("|");
  const depth = { type: "MeshDepthMaterial", isMeshDepthMaterial: true, version: 0, map: null, side: 1, set needsUpdate(v) { if (v) this.version++ } };
  const R = { info: { programs: [] }, autoClear: true, depth, progs,
    renderBufferDirect(c, s, g, m, o) { const P = props.get(m), dep = !!m.isMeshDepthMaterial;
      const need = !P || P.v !== m.version || P.sk !== !!o.isSkinnedMesh || (!dep && P.L !== L);
      if (need) { add(dep ? ["depth", o.isSkinnedMesh ? 1 : 0, m.map ? 1 : 0, m.side, L].join("|") : mkey(m, o, L, s)); props.set(m, { v: m.version, sk: !!o.isSkinnedMesh, L }) } },
    compile(s) { const S = st(s); S.L = L = lightsOf(s); s.traverse(o => { for (const m of mats(o)) add(mkey(m, o, L, s)) }) },
    render(s, c) { const S = st(s); let cast = false; s.traverseVisible(o => { if (o.isLight && o.castShadow) cast = true });
      if (cast) { L = S.L; s.traverseVisible(o => { if (!o.isMesh || !o.castShadow || (o.frustumCulled && o.__off)) return; const m = mats(o)[0]; depth.map = m.map || null; depth.side = m.side === 2 ? 2 : m.side === 0 ? 1 : 0; this.renderBufferDirect(c, null, o.geometry, depth, o) }) }
      S.L = L = lightsOf(s); s.traverseVisible(o => { if (o.isLight) return; for (const m of mats(o)) this.renderBufferDirect(c, s, o.geometry, m, o) }) },
    step(f) { cur = []; f(); const r = cur; cur = null; return r } };
  return R }

/* 把 park3d 的暖機那段搬進 vm：T、sc、cam、rd、stopped、GIANT、shown、performance、setTimeout 由測試給 */
function load(T, sc, cam, R, opt) {
  const P = rd(SRC), code = between(P, "    const WS=new T.Scene(),WM=", "\n    /* 視角：俯視");
  let now = 0; const Q = [];
  const ctx = { T, sc, cam, rd: R, stopped: false, GIANT: true, shown: false, performance: { now: () => now }, setTimeout: f => Q.push(f) };
  vm.createContext(ctx); vm.runInContext(code + ";this.run=warmRun;this.gate=warmGate;this.shaders=warmShaders", ctx);
  const steps = [], frames = [];
  let maxQ = 0; const tick = (ms) => { now += ms == null ? 5 : ms; maxQ = Math.max(maxQ, Q.length); const f = Q.shift(); if (f) steps.push(R.step(f)); return !!f };
  const frame = () => { frames.push(R.step(() => { const H = ctx.gate(); R.render(sc, cam); if (H) for (const o of H) o.visible = true })) };
  return { ctx, Q, tick, frame, steps, frames, setNow: v => { now = v }, getNow: () => now, maxQ: () => maxQ } }

/* 序局那樣的場景：半球光、投影的平行光、平行光、霧；盤面、星空（沒投影）、篷子（投影、沒貼圖） */
function scene0(T) { const sc = new T.Scene(); sc.fog = new T.Fog(0, 1, 2); const sun = new T.DirectionalLight(); sun.castShadow = true; sc.add(new T.HemisphereLight(), sun, new T.DirectionalLight());
  const tex = new T.Texture(); const board = new T.Mesh(new T.PlaneGeometry(), new T.MeshStandardMaterial({ map: tex })); board.receiveShadow = true;
  const sky = new T.Mesh(new T.SphereGeometry(), new T.MeshBasicMaterial({ side: T.BackSide })); const canopy = new T.Mesh(new T.BoxGeometry(), new T.MeshLambertMaterial()); canopy.castShadow = true;
  sc.add(board, sky, canopy); return { sc, tex } }
/* 棋子人：有骨架的 toon Lambert（貼圖、自訂 cacheKey）＋骨架外殼 ShaderMaterial（背面）＋沒骨架的牌子（Basic＋貼圖） */
function piece(T, tex, i) { const g = new T.Group(); g.name = "p" + i; const toon = new T.MeshLambertMaterial({ map: tex, side: i % 3 ? T.FrontSide : T.DoubleSide }); toon.customProgramCacheKey = () => "xqToona";
  const body = new T.SkinnedMesh(new T.BoxGeometry(), toon); body.castShadow = true; const hull = new T.SkinnedMesh(new T.BoxGeometry(), new T.ShaderMaterial({ side: T.BackSide })); hull.castShadow = true;
  const gly = new T.Mesh(new T.PlaneGeometry(), new T.MeshBasicMaterial({ map: tex })); gly.name = "meGly"; gly.castShadow = true; body.add(hull); g.add(body, gly); return g }

test("① 兩次暖機重疊（巨盤第一格前＋淡入前 warmShaders）＋② 暖機途中魔王加兩盞點光源＋③ 模型在暖機後才接上：暖機每段最多一支、兩個 done 各叫一次；淡入前、淡入後的每一格都不再新編任何 program（換順序畫也一樣）", { skip: SKIP }, () => {
  const T = require(THREE_P), { sc, tex } = scene0(T), cam = new T.PerspectiveCamera(), R = fakeRd(), E = load(T, sc, cam, R);
  const lamp = new T.Mesh(new T.PlaneGeometry(), new T.MeshBasicMaterial({ map: tex, side: T.DoubleSide })); lamp.castShadow = true; sc.add(lamp);   /* 跟篷子一樣沒骨架、排在篷子後面：暖機單獨畫它時共用深度材質不會自己重算（要靠 needsUpdate） */
  let first = 0, rev = 0; E.ctx.run(() => first++, 4000);
  for (let k = 0; k < 2; k++) E.tick();
  const gemL = new T.PointLight(0, 0), hitL = new T.PointLight(0, 0); sc.add(gemL, hitL);   /* ② 魔王 bossfx3d：暖機途中加燈 */
  sc.add(new T.Mesh(new T.BoxGeometry(), new T.MeshStandardMaterial()));   /* 魔王本體（沒骨架、沒貼圖） */
  E.ctx.shaders(() => rev++);   /* ① 第一次還沒跑完，淡入前那次又叫 */
  let n = 0; while (E.Q.length && n++ < 300) E.tick();
  assert.equal(first, 1, "第一格前那次的 done"); assert.equal(rev, 1, "warmShaders 的 done（排在同一次暖機後面）"); assert.equal(E.maxQ(), 1, "同時只有一串暖機在跑");
  /* ③ 第一格開始畫（畫布還藏著）；模型接上 */
  for (let k = 0; k < 3; k++) { E.frame(); while (E.Q.length) E.tick() }
  const P = [0, 1, 2, 3, 4, 5].map(i => piece(T, tex, i)); for (const g of P) sc.add(g);
  for (let k = 0; k < 40; k++) { E.frame(); E.tick() }
  while (E.Q.length) E.tick();
  for (let k = 0; k < 3; k++) E.frame();
  E.ctx.shown = true;
  for (let k = 0; k < 6; k++) { sc.children.reverse(); for (const g of P) g.children.reverse(); E.frame() }   /* 淡入後換幾種順序畫：深度材質在不同物件換骨架狀態 */
  const bad = E.frames.map((f, i) => [i, f]).filter(([, f]) => f.length);
  assert.deepEqual(bad, [], "畫面裡新編的 program（應該都在暖機裡編好）：" + JSON.stringify(bad));
  assert.ok(E.steps.every(s => s.length <= 1), "暖機每段最多一支：" + E.steps.map(s => s.length).join(""));
  const ks = [...R.progs];
  assert.ok(!ks.some(k => k.includes("|0/0/0/0/0")), "沒有用「沒有燈」編的（舊版：先跑完的那次把燈光替身清空）：" + ks.filter(k => k.includes("|0/0/0/0/0")).join(" "));
  const early = E.steps.slice(0, 2).flat(), lit = ks.filter(k => /^MeshStandardMaterial|^MeshLambertMaterial/.test(k));
  assert.ok(lit.every(k => k.includes("|2/2/1/0/1|") || early.includes(k)), "有受光的材質：加燈以後全用「兩盞點光源」那組（從頭再掃）；白編的只有加燈前那兩段：" + lit.filter(k => !k.includes("|2/2/1/0/1|")).join(" "));
  assert.ok(lit.filter(k => k.includes("|2/2/1/0/1|")).length >= 3, "盤面、篷子、棋子人都有加燈後那支");
  assert.ok(ks.some(k => /^depth\|1\|1\|/.test(k)) && ks.some(k => /^depth\|0\|1\|/.test(k)) && ks.some(k => /^depth\|0\|0\|/.test(k)), "深度 shader：有骨架＋貼圖、沒骨架＋貼圖（牌子）、沒骨架沒貼圖都先編好");
  sc.traverse(o => { if (o.isMesh) assert.equal(o.visible, true, "藏起來的都放回去：" + (o.name || o.type)) });
});

test("④ 正式場景第一格：先用只有燈的場景 compile 設好燈光狀態（primeL），陰影的深度 shader 不會用 0 盞燈編；淡入後燈變了也一樣", { skip: SKIP }, () => {
  const T = require(THREE_P), { sc } = scene0(T), cam = new T.PerspectiveCamera(), R = fakeRd(), E = load(T, sc, cam, R);
  const sk = new T.SkinnedMesh(new T.BoxGeometry(), new T.MeshLambertMaterial()); sk.castShadow = true; sc.add(sk);   /* 暖機最後畫的是有骨架的 → 正式第一格陰影先畫篷子（沒骨架）＝共用深度材質重算 */
  E.ctx.run(() => {}, 4000); while (E.Q.length) E.tick();
  E.frame(); assert.deepEqual(E.frames[0], [], "第一格沒有新編（沒有 primeL 會用 0 盞燈編一支深度 shader）");
  E.ctx.shown = true; sc.add(new T.PointLight()); E.frame();
  assert.ok(!E.frames[1].some(k => /^depth/.test(k) && !k.endsWith("|2/1/1/0/1")), "淡入後加燈：深度 shader 用新的燈光數（不會用上一格的）：" + E.frames[1].join(" "));
  const src = rd(SRC);
  assert.ok(src.includes('if(BENCH)rd.info.reset();const WG=warmGate();if(GIANT&&FXH.size)fxH("main");if(GIANT&&MG){bplane.visible=false;BU.visible=false}rd.render(sc,cam);if(GIANT)try{gntMirror()}catch(e){bplane.visible=true;BU.visible=true}if(WG)for(const o of WG)o.visible=true;'), "frame：魔王特效掛勾、畫之前叫 warmGate，畫完（含鏡像、星盤）才放回去");
  assert.ok(src.includes("if(GIANT)warmRun(()=>{if(!stopped)requestAnimationFrame(frame)},4000);else requestAnimationFrame(frame);") && src.includes("warmed=true;warmRun(done,4000)"), "兩個呼叫點照舊");
});

test("暖機的保險：一直換版本的材質（換圖的精靈）暖過 4 次就不再攔、warmShaders 照樣會結束；超過預算就不再藏（照舊在畫面裡編）；不是巨盤不藏", { skip: SKIP }, () => {
  const T = require(THREE_P);
  { const { sc } = scene0(T), cam = new T.PerspectiveCamera(), R = fakeRd(), E = load(T, sc, cam, R);
    const sp = new T.Sprite(new T.SpriteMaterial()); sc.add(sp); let done = 0;
    E.ctx.run(() => {}, 4000); while (E.Q.length) E.tick();
    E.ctx.shaders(() => done++); let hid = 0, doneAt = -1;
    for (let k = 0; k < 30; k++) { sp.material.needsUpdate = true; const H = E.ctx.gate(); if (H && H.includes(sp)) hid++; if (H) for (const o of H) o.visible = true; E.tick(); E.tick(); if (done && doneAt < 0) doneAt = k }
    assert.equal(done, 1, "版本一直換也會結束"); assert.ok(doneAt >= 0 && doneAt < 10 && E.getNow() < 4000, "沒有等到預算用完：第 " + doneAt + " 格");
    assert.ok(hid >= 1 && hid <= 5, "最多藏幾格（暖過 4 次以後不再藏它）：" + hid) }
  { const sc = new T.Scene(), cam = new T.PerspectiveCamera(), R = fakeRd(), E = load(T, sc, cam, R); sc.add(new T.DirectionalLight());
    for (let i = 0; i < 300; i++) { const m = new T.MeshBasicMaterial(); m.customProgramCacheKey = () => "k" + i; sc.add(new T.Mesh(new T.BoxGeometry(), m)) }
    let done = 0; E.ctx.run(() => done++, 4000); let n = 0; while (E.Q.length && n++ < 2000) E.tick(50);
    assert.equal(done, 1, "預算用完也叫 done"); assert.ok(R.progs.size < 300, "沒有全部編完");
    assert.equal(E.ctx.gate(), null, "超過預算：不再藏（WOFF）") }
  { const { sc } = scene0(T), cam = new T.PerspectiveCamera(), R = fakeRd(), E = load(T, sc, cam, R); E.ctx.GIANT = false;
    assert.equal(E.ctx.gate(), null, "不是巨盤：不藏、不動燈光狀態") }
});
