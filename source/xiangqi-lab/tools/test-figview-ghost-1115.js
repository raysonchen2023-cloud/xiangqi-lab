// 11/15 開發者（截圖：對局頁點幻影棋客的頭像）「這個也要一致用有透明度的設定」「13 星系的幻影棋手一樣也是要有透明度設定」：
// 點對手頭像開的 3D 檢視視窗（m/06-cpu.js fig3d）裡，幻影棋客（cus k:pika／k:pika2；幻譜星門十三星系的幻影用同一個形象）
// 跟雅間的淡墨立繪、園子裡坐著的他（src/park3d.js oppGhost）一樣半透明、慢慢呼吸；別的角色不受影響。
// 用法：node --test xiangqi-lab/tools/test-figview-ghost-1115.js
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const rd = (...p) => fs.readFileSync(path.join(__dirname, "..", "..", ...p), "utf8");
const CPU = rd("xiangqi-db", "m", "06-cpu.js"), P3 = rd("xiangqi-lab", "src", "park3d.js"), GAME = rd("xiangqi-db", "m", "08b-cpugame.js");
const A = "  const FGH=look&&", Z = "for(const g of G.ms)g.opacity=g.userData.o0*op};", i0 = CPU.indexOf(A), i1 = CPU.indexOf(Z, i0);
const SRC = i0 >= 0 && i1 > i0 ? CPU.slice(i0, i1 + Z.length) : null;
const mat = (o, extra) => ({ opacity: o, transparent: false, depthWrite: false, userData: {}, clones: 0, ...(extra || {}), clone() { this.clones++; return { ...this, userData: { ...this.userData }, clones: 0 } } });
const mk = (look, rm, meshes) => { const B = { bot: { traverse: f => (meshes || []).forEach(f) } }, matchMedia = () => ({ matches: !!rm });
  return new Function("look", "B", "matchMedia", SRC + "return{FGH,fgGhost}")(look, B, matchMedia) };

test("〔原始碼〕找得到 FGH、fgGhost；每一格在畫之前叫一次", () => {
  assert.ok(SRC, "切得到那一段");
  assert.ok(CPU.includes('XQBot3D.faceApply(B,"open",(t%4)<.12,false)}catch(e){}if(FGH)try{fgGhost(t)}catch(e){}r.render(sc,cam)};loop();'), "先調透明度再畫；出錯不影響畫面");
  assert.ok(CPU.indexOf("let B;try{B=XQBot3D.figure(look||{})}") < i0 && i0 < CPU.indexOf("const root=new T.Group();root.add(B.bot)"), "接在角色建好之後");
});

test("〔行為〕只有幻影棋客進來：k:pika、k:pika2 有；笑面掌櫃、故事人物、七星、沒有形象都沒有", () => {
  assert.ok(mk({ cus: "k:pika2" }).FGH); assert.ok(mk({ cus: "k:pika" }).FGH);
  for (const L of [{ cus: "k:zg" }, { cus: "j:boatman" }, { cus: "k:pika3" }, { cus: "xk:pika" }, { glb: "data/tripo_app/x_swordboy.glb" }, {}, null]) assert.equal(mk(L).FGH, null, JSON.stringify(L));
});

test("〔行為〕每個材質換成自己的透明副本：照寫深度、記住原本的透明度，原本的材質不動", () => {
  const m1 = mat(1), m2 = mat(.8), m3 = mat(undefined), a = { isMesh: true, name: "body", material: m1 }, b = { isMesh: true, name: "hat", material: [m2, m3] }, c = { isGroup: true, material: mat(1) };
  const { FGH, fgGhost } = mk({ cus: "k:pika2" }, true, [a, b, c]); fgGhost(0);
  assert.notEqual(a.material, m1); assert.equal(a.material.transparent, true); assert.equal(a.material.depthWrite, true, "自己不會透出背面和身體裡面"); assert.equal(a.material.userData.gh, 1); assert.equal(a.material.userData.o0, 1);
  assert.equal(m1.transparent, false, "原本的材質不動（別的地方共用同一份時不會跟著變淡）"); assert.equal(m1.opacity, 1);
  assert.ok(Array.isArray(b.material) && b.material.length === 2); assert.equal(b.material[0].userData.o0, .8); assert.equal(b.material[1].userData.o0, 1, "沒寫透明度的當成 1");
  assert.ok(Math.abs(a.material.opacity - .6) < 1e-9); assert.ok(Math.abs(b.material[0].opacity - .48) < 1e-9, "原本就半透明的再乘上去");
  assert.equal(c.material.userData.gh, undefined, "不是網格、不是貼片的不動"); assert.equal(FGH.ms.size, 3);
});

test("〔行為〕慢慢呼吸：透明度在 .53～.67 之間、大約五秒一輪；減少動態固定 .6", () => {
  const a = { isMesh: true, material: mat(1) }, G = mk({ cus: "k:pika2" }, false, [a]); const seen = [];
  for (let t = 0; t <= 5; t += .05) { G.fgGhost(t); seen.push(a.material.opacity) }
  assert.ok(Math.min(...seen) >= .53 - 1e-9 && Math.max(...seen) <= .67 + 1e-9); assert.ok(Math.max(...seen) - Math.min(...seen) > .12, "真的有在變");
  assert.ok(Math.abs(2 * Math.PI / 1.26 - 5) < .05, "一輪約五秒");
  const b = { isMesh: true, material: mat(1) }, R = mk({ cus: "k:pika2" }, true, [b]); for (const t of [0, 1.3, 2.6, 4]) { R.fgGhost(t); assert.ok(Math.abs(b.material.opacity - .6) < 1e-9) }
});

test("〔行為〕每 20 格重看一次：已經換過的不再複製；晚到的模型會補上", () => {
  const m1 = mat(1), a = { isMesh: true, material: m1 }, list = [a], G = mk({ cus: "k:pika2" }, true, list);
  for (let k = 0; k < 20; k++) G.fgGhost(k / 60); assert.equal(m1.clones, 1, "前 20 格只換一次");
  const late = { isMesh: true, material: mat(1) }; list.push(late); const g1 = a.material;
  G.fgGhost(1); assert.equal(a.material, g1, "換過的那份沿用"); assert.equal(m1.clones, 1); assert.equal(late.material.userData.gh, 1, "第 21 格補上晚到的"); assert.equal(G.FGH.ms.size, 2);
});

test("〔行為〕胸前字牌（自己每格算透明度）不換材質，只在它算完之後再乘一次", () => {
  const gm = mat(1), gly = { isMesh: true, name: "meGly", material: gm, userData: {}, onBeforeRender() { this.material.opacity = .9 } };
  const G = mk({ cus: "k:pika2" }, true, [gly]); for (let k = 0; k < 45; k++) G.fgGhost(k / 60);
  assert.equal(gly.material, gm, "字牌的材質沒換"); assert.equal(gly.userData.ghW, 1);
  gly.onBeforeRender(); assert.ok(Math.abs(gm.opacity - .9 * .6) < 1e-9, "包一次就好，重看幾次都不會越乘越淡");
});

test("〔原始碼〕跟園子裡的幻影棋客同一組數字、同一個判斷；對局頁點頭像把同一個形象交給檢視視窗", () => {
  assert.ok(SRC.includes('/^k:pika2?$/.test(String(look.cus||""))') && P3.includes('OPPG=look&&/^k:pika2?$/.test(String(look.cus||""))?'), "同一個判斷");
  assert.ok(SRC.includes("G.rm?.6:.6+Math.sin(t*1.26)*.07") && P3.includes("OPPG_RM?.6:.6+Math.sin(pwT()/1000*1.26)*.07"), "同一組透明度與速度");
  assert.ok(GAME.includes("figView(oppArt()&&o.img?null:oppFig(o.look),"), "點頭像");
  assert.ok(GAME.includes("return{look:zgIs(st)?ZG_LOOK(bot):PIKA_LOOK(bot),name:T.name||\"對手\""), "一般電腦對局、幻譜星門十三星系都是幻影棋客的形象");
  assert.ok(CPU.includes('const PIKA_LOOK=side=>({cus:"k:"+(/pika2/.test(String(PIKA_META_DIR||""))?"pika2":"pika"),'));
});
