// 11/17 Windows 測試員 B（Playwright、390×844 與 844×390、候選版 0106）、D 回報的星門圍城選關與文字：
//   B-1（P1）選關視窗 .modal.gsv-sel 置中、內容約 1353px 比畫面高：方塊頂端在 −255px（橫式 −491），分頁「序章／易／中／難」捲不到。
//     修法（07bhg gsvCss）：從頂端排起、可以往下捲（align-items:flex-start＋方塊 margin:auto 0，放得下時照樣置中）。
//   B-2（P2）序章一律打「易」，選關的卡片、目標列卻照上次選的難度（預設中）查：打過的序章關還是 ☆☆☆、目標寫「（中）…14 回合內」。
//     修法（07sg2 sg2Select）：每一關用「實際會開的難度」sg2DOf：序章＝易，其他照選的。
//   B-9（P3）鎖關說明「破序章 A1開放」少空格，跟「破序章 C1 開放」「破易 1 開放」不一致（07bhg GSV.lockWhy 序章那一行）。
//   D P3-4（P3）天賦「雙影」寫「紅馬跳影攻擊力八折」看不出是加成：改成「從六折提高到八折」（數字照 luo2：沒點 .6、點亮 .8）。
// 不開瀏覽器：vm 載 07bhg＋07sg2，假的 modal、store 跑 sg2Select；樣式看原始碼。用法：node --test xiangqi-lab/tools/test-sg2-select-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const G = rd("xiangqi-db/m/07bhg-gatesiege.js"), S2 = rd("xiangqi-db/m/07sg2-siege2.js");

function sel(save) {
  const mem = { gsv: save }, out = { modal: null, starts: [] };
  const ctx = { console, Math, JSON, Date, store: { get: (k, d) => k in mem ? JSON.parse(JSON.stringify(mem[k])) : d, set: (k, v) => { mem[k] = v } }, esc: s => String(s),
    modal: (h, b, c) => { out.modal = { h, b, c }; return { addEventListener() { }, querySelector: () => ({}) } }, toast() { }, vibrate() { },
    document: { getElementById: () => ({}), createElement: () => ({}), head: { append() { } } } };
  vm.createContext(ctx); vm.runInContext(G + "\n" + S2 + "\n;this.X={sg2Select,GSV,SG2G,sg2DOf};", ctx);
  const X = ctx.X; mem.gsv = Object.assign({ mv: X.GSV.MODE, c: {}, h: {}, g: [], sk: {} }, save);
  ctx.gsvStart = (...a) => out.starts.push(a);
  X.sg2Select("han", true);
  const card = n => { const h = out.modal.h, i = h.indexOf(`data-n="${n}"`); return h.slice(i, h.indexOf("</button>", i)) };
  return { X, out, card, gl: () => /<p class="gsv-gl">([^<]*)/.exec(out.modal.h)[1] + out.modal.h.split('<p class="gsv-gl">')[1].split("</p>")[0] };
}

test("〔B-2〕打過的序章 A1（紀錄在易 v2[31][1]）：上次選「中」也照易顯示 ★★☆、✓ 勝 1；目標列寫（易）和易的回合數；出戰照樣開易", () => {
  const K = sel({ v2: { 31: { 1: { w: 1, l: 0, d: 0, st: [1, 1, 0] } } }, lastD: 2, last: 31, c: { 31: { w: 1, l: 0, d: 0 } } });
  const c = K.card(31); assert.match(c, /★★☆/); assert.match(c, /✓ 勝 1/); assert.match(c, /易：2 顆星/);
  const gl = K.out.modal.h.split('<p class="gsv-gl">')[1].split("</p>")[0];
  assert.match(gl, /（易）/); assert.ok(!/（中）/.test(gl));
  const r3 = K.X.SG2G.r3Of(31, 1); assert.ok(gl.includes(r3 + " 回合內"), `目標寫易的 ${r3} 回合（中是 ${K.X.SG2G.r3Of(31, 2)}）`);
  K.out.modal.b[0][1](); assert.equal(K.out.starts[0][6], 1, "出戰開易");
});

test("〔B-2〕sg2DOf：序章一律易；易、中、難組照玩家選的", () => {
  const { X } = sel({});
  for (const n of X.SG2G.GRP[0].lv) assert.equal(X.sg2DOf(n, 2), 1, "序章 " + n);
  for (const g of X.SG2G.GRP.slice(1)) for (const d of [1, 2, 3]) assert.equal(X.sg2DOf(g.lv[0], d), d, g.id);
});

test("〔B-9〕鎖關說明一律「破＋關名＋空格＋開放」", () => {
  const { X } = sel({});
  assert.equal(X.SG2G.lockWhy({ c: {} }, 32, false, null), "破序章 A1 開放");
  assert.equal(X.SG2G.lockWhy({ c: {} }, 36, false, null), "破序章 B2 開放");
  const e2 = X.SG2G.GRP[1].lv[1]; assert.match(X.SG2G.lockWhy({ c: { 37: { w: 1 } } }, e2, false, null), /^破易 1 開放$/);
  assert.equal(X.SG2G.lockWhy({ c: {} }, X.SG2G.GRP[1].lv[0], false, null), "破序章 C1 開放");
});

test("〔B-1〕選關視窗：可以捲、從頂端排起（放得下時方塊 margin:auto 照樣置中）", () => {
  assert.match(G, /\.modal\.gsv-sel\{[^}]*overflow-y:auto[^}]*align-items:flex-start\}/);
  assert.ok(G.includes(".modal.gsv-sel>.box{margin:auto 0}"));
  assert.ok(S2.includes('"prolog gsv-sel");'), "07sg2 選關用 gsv-sel");
});

test("〔D P3-4〕天賦「雙影」寫出前後：六折 → 八折（跟 luo2 的 .6／.8 一致）", () => {
  const { X } = sel({}), T = X.SG2G.TALC.x_miaogirl.find(t => t.id === "l_sy");
  assert.equal(T.d, "紅馬跳影的攻擊力從六折提高到八折");
  assert.ok(S2.includes('mul=hasT(X.td,"l_sy")?.8:.6'), "程式的數字");
});
