#!/usr/bin/env node
// 11/18 第 34 輪 N33-1：在電腦上先算好棋子人身上牌子（背牌、胸牌、肚子圓牌）的深度，存成 xiangqi-db/art/tripo_app/glydepth.json
// （build-site 複製到 site/data/tripo_app/，跟 App 一起發布、上 CDN）。App 的 bot3d.js 先查這份，查不到才在手機上算。
// 算法完全照 src/bot3d.js：直接抽出 glyKey、glySurf、glyCast、glyPzCalc、idleShift 那幾段來跑（不另外寫一份），
// 模型照 attachGLB 的步驟擺好：clone → 轉 -90° → 骨架照名字重接 → 待機動作挪到 13.6 秒那格、mixer.update(0) → 量包圍盒 → 算每一面牌子。
// 牌子參數：黑洞巨盤（park3d.js GNT_X／GNT_XS／GNT_WOOD 和 GNT_GLY／GNT_GLYB／GNT_WOODG，背面＋胸前）、ME_RING、ring3d.json。
// 模型或牌子參數改了就重跑：node xiangqi-lab/tools/gly-depth.js（--check：只核對、不寫檔，跟現有的不一樣就失敗）
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), { pathToFileURL } = require("url");
const ROOT = path.join(__dirname, "..", ".."), LAB = path.join(ROOT, "xiangqi-lab"), SRC = path.join(LAB, "src"), MOD = path.join(ROOT, "xiangqi-db", "art", "tripo_app");
const OUT = path.join(MOD, "glydepth.json");
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); if (i < 0 || j < 0) throw new Error("bot3d.js／park3d.js 找不到：" + a); return s.slice(i, j) };
const sha = p => crypto.createHash("sha1").update(fs.readFileSync(p)).digest("hex").slice(0, 12);

/* 牌子參數（照 bot3d attachGLB：GLe＝{u:+u||.5,v:+v||.4,r:+r,back:!!back,g:1}，胸前 FR＝{u:+u||.5,v:+v||.45,r:+r,back:!R0.back,g:1}；R3e＝{u,v,r*.85,z,back}） */
function jobs() {
  const P = fs.readFileSync(path.join(SRC, "park3d.js"), "utf8"), B = fs.readFileSync(path.join(SRC, "bot3d.js"), "utf8");
  const ev = (src, name) => { const m = new RegExp("(?:const |,)" + name + "=([{\"])").exec(src); if (!m) throw new Error("找不到 " + name); let i = m.index + m[0].length - 1, j = i;
    if (m[1] === "\"") { j = src.indexOf("\"", i + 1) + 1 } else { let d = 0; for (; j < src.length; j++) { if (src[j] === "{") d++; else if (src[j] === "}" && --d === 0) { j++; break } } }
    return Function("return " + src.slice(i, j))() };   /* 括號配對取出物件字面值 */
  const GNT_X = ev(P, "GNT_X"), GNT_XS = ev(P, "GNT_XS"), GNT_GLY = ev(P, "GNT_GLY"), GNT_GLYB = ev(P, "GNT_GLYB"), GNT_WOOD = ev(P, "GNT_WOOD"), GNT_WOODG = ev(P, "GNT_WOODG"), ME_RING = ev(B, "ME_RING");
  /* park3d 建巨盤棋子人那一行的胸前參數（紅 {u:.5,v:.66,r:.28}、黑 {u:.5,v:.64,r:.26}） */
  const fm = /front:blk\?(\{[^}]+\}):(\{[^}]+\})\},\(blk\?GNT_GLYB:GNT_GLY\)/.exec(P); if (!fm) throw new Error("park3d.js 巨盤 gly.front 的寫法改了，工具要跟著改");
  const FB = Function("return " + fm[1])(), FRd = Function("return " + fm[2])();
  const GLe = gly => ({ u: +gly.u || .5, v: +gly.v || .4, r: +gly.r, back: !!gly.back, g: 1 }), FRo = (gly, R0) => ({ u: +gly.front.u || .5, v: +gly.front.v || .45, r: +gly.front.r, back: !R0.back, g: 1 });
  const L = [], gl = (id, gly) => { const R0 = GLe(gly); L.push({ id, Rs: [R0, FRo(gly, R0)] }) };
  for (const k in GNT_X) gl(GNT_X[k], Object.assign({ back: 1, front: FRd }, GNT_GLY[k]));
  for (const k in GNT_XS) gl(GNT_XS[k], Object.assign({ back: 1, front: FB }, GNT_GLYB[k]));
  gl(GNT_WOOD, Object.assign({ back: 1, front: GNT_WOODG }, GNT_WOODG));
  for (const id in ME_RING) L.push({ id, Rs: [ME_RING[id]] });
  const R3 = JSON.parse(fs.readFileSync(path.join(MOD, "ring3d.json"), "utf8"));
  for (const id in R3) if (Array.isArray(R3[id]) && !ME_RING[id]) L.push({ id, Rs: [{ u: R3[id][0], v: R3[id][1], r: R3[id][2] * .85, z: R3[id][3], back: R3[id][4] === 1 }] });
  /* 同一個模型同時在巨盤和 ring3d：attachGLB 只會用 ring3d（R3e 優先於 GLe），兩種都算進去也無妨（鍵不同） */
  return L.filter(j => fs.existsSync(path.join(MOD, j.id + ".glb")));
}

/* kit()：載入 three、GLTFLoader、bot3d 的 glyKey／glySurf／glyCast／glyPzCalc／idleShift；prep(G,url)＝照 attachGLB 擺好模型（測試 test-r37-1118.js 也用這兩支） */
async function kit() {
  const T = require(path.join(SRC, "three.min.js")); globalThis.window = { THREE: T }; globalThis.self = globalThis;
  const { GLTFLoader } = await import(pathToFileURL(path.join(SRC, "GLTFLoader.mjs")).href);
  const BS = fs.readFileSync(path.join(SRC, "bot3d.js"), "utf8");
  const K = new Function("T", "localStorage", "fetch", cut(BS, "const GLY_V=", "\n  function attachGLB(") + "\n" + cut(BS, "const IDLE_T0=", "cl.duration=P;cl.xqT0=IDLE_T0}") + "cl.duration=P;cl.xqT0=IDLE_T0}" +
    ";return{GLY_V,glyKey,glyPzCalc,glySurf,glyCast,idleShift}")(T, { getItem: () => null, setItem() {} }, undefined);
  const parse = file => new Promise((res, rej) => { const ce = console.error; console.error = (...a) => { if (!/Couldn't load texture/.test(String(a[0]))) ce(...a) };   /* 貼圖在 node 裡讀不到，跟深度無關 */
    const b = fs.readFileSync(file); new GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.length), "", g => { console.error = ce; res(g) }, e => { console.error = ce; rej(e) }) });
  /* attachGLB 的步驟（不畫圖的部分） */
  const prep = G => { const g = G.scene.clone(true); new T.Box3().setFromObject(g); g.rotation.y = -Math.PI / 2; g.updateMatrixWorld(true);
    const clips = G.animations || []; let mix = null;
    if (clips.length) { try { const bn = {}; g.traverse(x => { if (x.isBone) bn[x.name] = x });
      g.traverse(m => { if (m.isSkinnedMesh && m.skeleton) { const sk = m.skeleton; m.bind(new T.Skeleton(sk.bones.map(b => bn[b.name] || b), sk.boneInverses), m.bindMatrix) } });
      for (const cl of clips) K.idleShift(cl); mix = new T.AnimationMixer(g); const A = {}; for (const cl of clips) A[cl.name] = mix.clipAction(cl); if (A.idle) A.idle.play(); mix.update(0); g.updateMatrixWorld(true) } catch (e) { mix = null } }
    const bb = new T.Box3().setFromObject(g), sz = bb.getSize(new T.Vector3()), c = bb.getCenter(new T.Vector3());
    const hold = new T.Group(); g.position.set(-c.x, -bb.min.y, -c.z); hold.add(g);   /* 跟 App 一樣：搬位置、掛上 hold 之後不更新矩陣（射線照擺好那一刻的矩陣） */
    return { g, mix, bb, sz } };
  const face = (P, R) => ({ rad: R.r * P.sz.x * .9, px: R.back ? P.bb.max.x - R.u * P.sz.x : P.bb.min.x + R.u * P.sz.x, py: P.bb.max.y - R.v * P.sz.y });
  return { T, K, parse, prep, face } }
async function build() { const { T, K, parse, prep, face } = await kit(); const keys = {}, models = {}; let n = 0;
  for (const j of jobs()) { const file = path.join(MOD, j.id + ".glb"), url = "data/tripo_app/" + j.id + ".glb", P = prep(await parse(file)); if (!(P.sz.y > 0)) continue; models[j.id] = sha(file);
    for (const R of j.Rs) { const F = face(P, R); keys[K.glyKey(url, P.mix, R, P.bb)] = K.glyPzCalc(P.g, R, F.rad, F.px, F.py, P.bb, P.sz); n++ } }
  return { out: { v: K.GLY_V, note: "棋子人牌子的深度（xiangqi-lab/tools/gly-depth.js 產生；bot3d.js glyPzGet 先查這份）。models＝算的時候每個模型檔的 SHA-1 前 12 碼，模型換了要重跑", three: T.REVISION, models, keys }, n } }
async function main() { const check = process.argv.includes("--check"), t0 = Date.now(); const { out, n } = await build(); const txt = JSON.stringify(out) + "\n";
  if (check) { const old = fs.existsSync(OUT) ? fs.readFileSync(OUT, "utf8") : ""; if (old !== txt) { console.log("✘ glydepth.json 跟模型、程式算出來的不一樣，請重跑 node xiangqi-lab/tools/gly-depth.js"); process.exit(1) } console.log("✔ glydepth.json 跟現在的模型、程式一致（" + n + " 面）"); return }
  fs.writeFileSync(OUT, txt); console.log("已寫 " + path.relative(ROOT, OUT) + "：" + Object.keys(out.models).length + " 個模型、" + n + " 面牌子、" + (txt.length / 1024).toFixed(1) + " KB、" + (Date.now() - t0) + " ms") }
module.exports = { kit, jobs, build, OUT, MOD };
if (require.main === module) main().catch(e => { console.error(e); process.exit(1) });
