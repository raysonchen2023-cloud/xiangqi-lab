// 11/18 第 34 輪（候選版 0911）N33-1：第一次進序局仍然卡——bot3d 快路徑沒用到（預設開著的墨線外殼 raycast 被換成空函式，glySurf 整個退回慢路徑），
//   改成跳過墨線外殼；牌子深度在電腦上先算好（tools/gly-depth.js → art/tripo_app/glydepth.json）；shader 每段只編一個單位、巨盤第一格前先暖；
//   序局入局到淡出，「研墨鋪紙…」不蓋在黑洞底幕上。
// 不開瀏覽器：node 裡跑真的 three.min.js、GLTFLoader、bot3d 的程式片段和真的模型檔（只在開發者電腦上；沒有模型檔就略過）。
// 用法：node --test xiangqi-lab/tools/test-r37-1118.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), { spawnSync } = require("child_process");
const ROOT = path.join(__dirname, "..", ".."), MOD = path.join(ROOT, "xiangqi-db", "art", "tripo_app"), SRC = path.join(ROOT, "xiangqi-lab", "src");
const HAVE = fs.existsSync(path.join(MOD, "x_bing.glb")) && fs.existsSync(path.join(SRC, "GLTFLoader.mjs"));
const NO = "沒有模型原檔或 src（只在開發者電腦上；公開副本不含）";
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");

/* 照 bot3d toonHull 掛墨線外殼：同一份幾何、背面材質、raycast 空函式、標 xqNoRay */
function hulls(T, g) { const ms = []; g.traverse(m => { if (m.isMesh) ms.push(m) });
  for (const m of ms) { const mat = new T.ShaderMaterial({ side: T.BackSide }); const h = m.isSkinnedMesh ? new T.SkinnedMesh(m.geometry, mat) : new T.Mesh(m.geometry, mat);
    if (m.isSkinnedMesh) { h.bindMode = m.bindMode; h.bind(m.skeleton, m.bindMatrix) } h.name = "xqHull"; h.raycast = () => {}; h.userData.xqNoRay = 1; m.add(h) } }
/* 改之前 mk 的算法（three 的 Raycaster 一條一條打） */
function oldPz(T, g, R, rad, px, py, bb, sz) { const P9 = [[0, 0], [.75, 0], [-.75, 0], [0, .75], [0, -.75], [.53, .53], [-.53, .53], [.53, -.53], [-.53, -.53]], PG = []; for (let i = -4; i <= 4; i++) for (let j = -4; j <= 4; j++) { const a = i / 4, b = j / 4; if (a * a + b * b <= 1.0001) PG.push([a, b]) }
  let pz = -1e9; const rc = new T.Raycaster(); for (const [dx, dy] of (R.g ? PG : P9)) { rc.set(new T.Vector3(px + dx * rad, py + dy * rad, R.back ? bb.min.z - sz.z - 1 : bb.max.z + sz.z + 1), new T.Vector3(0, 0, R.back ? 1 : -1)); const hit = rc.intersectObject(g, true)[0]; const hz = hit ? (R.back ? -hit.point.z : hit.point.z) : -1e9; if (hz > pz) pz = hz }
  if (pz < -1e8) pz = R.back ? -bb.min.z : bb.max.z; if (R.back) pz = -pz; return pz }

test("墨線外殼（toonHull）掛上去以後快路徑照樣用得到：外殼標 xqNoRay、glySurf 跳過它；外殼的 raycast 本來就是空函式（打不到）", () => {
  const B = rd("xiangqi-lab/src/bot3d.js");
  assert.ok(B.includes('h.name="xqHull";TOON_H.add(h);h.raycast=()=>{};h.userData.xqNoRay=1;'), "外殼標記");
  assert.ok(B.includes("if(x.isMesh){if(x.userData&&x.userData.xqNoRay)return;if(x.raycast!==MR||x.isInstancedMesh)ok=false;else M.push(x)}"), "glySurf 跳過外殼、其他自訂 raycast 照舊退回慢路徑");
});

test("真實模型＋墨線開著：每條射線新舊結果相同；每一面牌子 glyPzCalc＝改之前 mk 的算法（x_bing、x_shuai、xs_zu、x_wood 全格掃；黑洞巨盤 15 種棋子人兩面都比）", { skip: HAVE ? false : NO, timeout: 300000 }, async () => {
  const { kit, jobs } = require("./gly-depth.js"), { T, K, parse, prep, face } = await kit();
  const J = jobs().filter(j => /^(x_|xs_)/.test(j.id));
  assert.equal(J.length, 15, "紅七、黑七、木棋靈：" + J.map(j => j.id).join());
  for (const j of J) { const P = prep(await parse(path.join(MOD, j.id + ".glb"))); hulls(T, P.g); const S = K.glySurf(P.g); assert.ok(S, j.id + "：快路徑要用得到（墨線外殼不能讓它退回慢路徑）");
    for (const R of j.Rs) { const F = face(P, R); assert.equal(K.glyPzCalc(P.g, R, F.rad, F.px, F.py, P.bb, P.sz), oldPz(T, P.g, R, F.rad, F.px, F.py, P.bb, P.sz), j.id + (R.back ? " 背" : " 胸")) }
    if (["x_bing", "x_shuai", "xs_zu", "x_wood"].includes(j.id)) { const { bb, sz, g } = P, rc = new T.Raycaster(); let hit = 0;
      for (let a = 0; a <= 14; a++) for (let b = 0; b <= 14; b++) for (const back of [0, 1]) { const o = new T.Vector3(bb.min.x + sz.x * a / 14, bb.min.y + sz.y * b / 14, back ? bb.min.z - sz.z - 1 : bb.max.z + sz.z + 1), d = new T.Vector3(0, 0, back ? 1 : -1);
        rc.set(o, d); const h = rc.intersectObject(g, true)[0], A = h ? h.point.z : null; rc.set(o, d); assert.equal(K.glyCast(S, rc), A, `${j.id} (${a},${b},${back})`); if (A !== null) hit++ }
      assert.ok(hit > 100, j.id + " 有打到：" + hit) } }
});

test("先算好的深度 glydepth.json：跟現在的模型檔（SHA-1）、bot3d 程式、牌子參數重算出來的一模一樣（tools/gly-depth.js --check）；黑洞巨盤 15 種兩面都在", { skip: HAVE ? false : NO, timeout: 300000 }, () => {
  const r = spawnSync(process.execPath, [path.join(__dirname, "gly-depth.js"), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, (r.stdout || "") + (r.stderr || ""));
  const D = JSON.parse(fs.readFileSync(path.join(MOD, "glydepth.json"), "utf8")), B = rd("xiangqi-lab/src/bot3d.js");
  assert.equal(D.v, /const GLY_V="(\d+)"/.exec(B)[1], "版本跟 bot3d GLY_V 一樣"); assert.equal(D.three, "149");
  for (const id of ["x_shuai", "x_shi", "x_spiritgirl", "x_miaogirl", "x_swordboy", "x_martialgirl", "x_bing", "xs_jiang", "xs_shi", "xs_xiang", "xs_ma", "xs_che", "xs_pao", "xs_zu", "x_wood"]) {
    assert.ok(D.models[id], id); assert.equal(Object.keys(D.keys).filter(k => k.split("|")[1] === "data/tripo_app/" + id + ".glb").length, 2, id + " 背、胸兩面") }
  for (const [k, v] of Object.entries(D.keys)) { assert.ok(typeof v === "number" && isFinite(v), k); assert.ok(/^\d+\|data\/tripo_app\/\w+\.glb\|[01]\|/.test(k), k); assert.ok(k.split("|").slice(-6).every(x => /^-?\d+\.\d{6}$/.test(x)), "包圍盒取 6 位：" + k) }
});

/* three.min.js：開發者電腦在 xiangqi-lab/src；公開副本的 run-tests 把 xiangqi-lab/site 連到倉庫根目錄（那裡有 three.min.js）；都沒有就略過 */
const THREE_P = ["xiangqi-lab/src/three.min.js", "xiangqi-lab/site/three.min.js", "../three.min.js"].map(p => path.join(ROOT, p)).find(p => fs.existsSync(p)) || null;
test("App 先查 glydepth.json、查不到才算；鍵的包圍盒取 6 位（不同瀏覽器 sin／cos 尾數不同也對得上）", { skip: THREE_P ? false : "找不到 three.min.js（xiangqi-lab/src、xiangqi-lab/site 都沒有）" }, () => {
  const B = rd("xiangqi-lab/src/bot3d.js");
  assert.ok(B.includes('fetch("data/tripo_app/glydepth.json").then(r=>r.ok?r.json():null).then(j=>{if(j&&j.v===GLY_V&&j.keys&&typeof j.keys==="object")GLY_DATA=j.keys})'));
  assert.ok(B.includes('function glyPzGet(k){if(GLY_PZ.has(k))return GLY_PZ.get(k);if(GLY_DATA&&Object.prototype.hasOwnProperty.call(GLY_DATA,k)&&typeof GLY_DATA[k]==="number"){GLY_PZ.set(k,GLY_DATA[k]);return GLY_DATA[k]}'));
  const T = require(THREE_P), src = B.slice(B.indexOf("const GLY_V="), B.indexOf("\n  function attachGLB("));
  const data = { keys: null }, X = new Function("T", "localStorage", "fetch", "window", src + ";return{glyKey,glyPzGet,set:k=>{GLY_DATA=k}}")(T, { getItem: () => null, setItem() {} }, undefined, {});   /* window：glyLater 那段會寫 window.XQGLY_PEND（不能靠前面別的子測試剛好設過 globalThis.window） */
  const bb = { min: { x: -0.30000000000000004, y: 0, z: -0.1234567891 }, max: { x: 0.3, y: 1.55, z: 0.12345678 } }, R = { u: .5, v: .6, r: .3, back: 1, g: 1 };
  const k = X.glyKey("data/tripo_app/x_bing.glb", {}, R, bb); assert.equal(k, "2|data/tripo_app/x_bing.glb|1|0.5|0.6|0.3|1|1|-0.300000|0.000000|-0.123457|0.300000|1.550000|0.123457");
  assert.equal(X.glyKey("data/tripo_app/x_bing.glb", {}, R, { min: { x: -0.3000000000000001, y: 1e-17, z: -0.12345678910000002 }, max: bb.max }), k, "尾數不同還是同一把鍵");
  assert.equal(X.glyKey("data/tripo_app/x_bing.glb", {}, R, { min: { x: -0.3, y: -1e-17, z: -0.1234567891 }, max: bb.max }), k, "很小的負數（-0.000000）也算 0");
  assert.equal(X.glyPzGet(k), null); X.set({ [k]: 0.0421 }); assert.equal(X.glyPzGet(k), 0.0421, "查得到資料檔就不算");
});

test("序局入局到淡出：「研墨鋪紙…」等待畫面不蓋在黑洞底幕（#bhxBk，上面有「星盤展開中…」）上面", () => {
  const P = rd("xiangqi-db/m/09b-preload.js"); assert.ok(P.includes('const PRE_FILM="#bhxPg,#mnfPg,#mnvPg,#bhxBk";'));
  const fn = P.slice(P.indexOf('const PRE_FILM="'), P.indexOf("\nfunction preGateOff(){")); let on = "#bhxBk"; const cls = new Set(), g = { isConnected: true, classList: { toggle: (c, v) => v ? cls.add(c) : cls.delete(c) } };
  const ctx = { document: { querySelector: s => s.split(",").includes(on) ? {} : null, getElementById: () => g }, setInterval: () => 1, clearInterval() {} }; vm.createContext(ctx); vm.runInContext(fn + ";this.h=preFilmHide", ctx);
  assert.equal(ctx.h(g), true); assert.ok(cls.has("pg-film"), "底幕在：藏起來、不擋");
  /* 07bh：入局時底幕早就在（bhXuStart 蓋上），等待畫面建立的那一刻就藏 */
  assert.ok(rd("xiangqi-db/m/07bh-blackhole.js").includes("bhxBack(true);vibrate([20,60,20]);"));
});
