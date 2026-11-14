// 11/13 評比循環第 12 輪 X1／X6：色弱模式套到 3D 園子（src/park3d.js 的 PKCB 區塊＋m/06-cpu.js parkLook0＋m/07cb-colorblind.js cbPark）的自動測試。
// 不開瀏覽器、不載 three.js：
//   ① 行為：照 PKCB 標記把純函式抽出來跑——提示記號清單（關／高對比／色弱模式）、瞄準框與虛線框的幾何、高對比棋面（假的 2D context 記錄畫了什麼）、「將」字牌、搖桿光圈色；
//      06-cpu.js 的 parkLook0／parkLook 用假的 store 跑：cbMode 併進 hc、另給 cb，只開色弱模式時棋盤照樣用平面風格底圖；
//      07cb-colorblind.js 的 cbApply()：園子開著就帶新的 look 重畫 3D。
//   ② 色彩：用 07cb 同一組色覺模擬矩陣（Machado 2009）和 WCAG 對比、CIE76 色差，算 3D 棋子與各個記號「關 → 開」，門檻寫成測試；
//      node xiangqi-lab/tools/test-park3d-colorblind.js --table 會印出 colorblind.md 第 5 節的表格。
//   ③ 原始碼：park3d 真的接上 pkcbMarks、look 的 hc／cb 會觸發重畫棋面、新記號不經色調映射；文件兩份一樣。
// 用法：node --test xiangqi-lab/tools/test-park3d-colorblind.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const P3 = rd(path.join(LAB, "src/park3d.js")), CPU = rd(path.join(M, "06-cpu.js")), CBS = rd(path.join(M, "07cb-colorblind.js"));

// ---------- 抽出 PKCB 純函式 ----------
const blk = P3.match(/\/\*PKCB\{[\s\S]*?\/\*\}PKCB\*\//);
if (!blk) throw new Error("park3d.js 找不到 PKCB 區塊");
const K = new Function(blk[0] + ";return{PKCB,pkcbMarks,pkcbAim,pkcbDash,pkcbFace,pkcbBody,pkcbTag,pkcbPad}")();
// ---------- 07cb 的色彩公式（跟 App、colorblind-scan.js 同一份） ----------
const CB = (() => { const i = CBS.indexOf("#CB-PURE-BEGIN"), j = CBS.indexOf("/* #CB-PURE-END */"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(CBS.slice(CBS.indexOf("\n", i) + 1, j) + ";this.R={cbRgb,cbHex,cbLum,cbContrast,cbSim,CB_COL}", ctx); return ctx.R })();
const hx = n => typeof n === "number" ? "#" + n.toString(16).padStart(6, "0").toUpperCase() : String(n).toUpperCase();
const lab = c => { const l = c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) });
  const X = (l[0] * .4124 + l[1] * .3576 + l[2] * .1805) / .95047, Y = l[0] * .2126 + l[1] * .7152 + l[2] * .0722, Z = (l[0] * .0193 + l[1] * .1192 + l[2] * .9505) / 1.08883;
  const f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))] };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) };
const rgb = c => CB.cbRgb(hx(c)), mix = (c, bg, op) => rgb(c).map((v, k) => op * v + (1 - op) * rgb(bg)[k]);   // 半透明記號：在 sRGB 上跟底色混（three 輸出 sRGB 後才混色）
const SIMS = [["none", "正常視覺"], ["protanopia", "紅色盲"], ["deuteranopia", "綠色盲"], ["tritanopia", "藍色盲"], ["achromatopsia", "全色盲"]];
const sim = (c, s) => CB.cbSim(Array.isArray(c) ? c : rgb(c), s), con = (a, b, s) => CB.cbContrast(sim(a, s), sim(b, s)), de = (a, b, s) => dE(sim(a, s), sim(b, s));
const WOOD = "#D6A361", DARK = "#2A1A10", BH = "#0A0B1E";   // 3D 預設木紋棋盤（drawBoard0 中間色）、深色朝代底圖的墊底色、黑洞巨盤底色

const MD = { off: {}, hc: { hc: true }, cb: { hc: true, cb: true } };
const pick = (L, m) => L.filter(d => d.m === m);
// 盤面：紅帥 85（e0）被黑車 4 將軍，選起紅俥 81，可走 72（空）、可吃 0（黑車）；上一步 3→4；電腦建議 81→72
const board = Array(90).fill(null); board[85] = "K"; board[4] = "r"; board[81] = "R"; board[0] = "r"; board[9] = null;
const o = { last: { f: 3, t: 4 }, sel: 81, targets: [72, 0], check: 85 }, ex = { hint: [81, 72] };

// ====================== ① 行為：提示記號 ======================
test("關：提示記號跟原本一模一樣（上一步藍、可走綠點、可吃紅圈、將軍紅圈、建議琥珀），都走舊畫法（沒有 ro）", () => {
  const L = K.pkcbMarks(board, o, ex, MD.off), C = K.PKCB;
  assert.deepEqual(L.map(d => [d.k, d.i, hx(d.col), d.r, d.w, d.op]), [
    ["ring", 3, hx(0x2E86DE), .36, .06, .85], ["disc", 3, hx(0x2E86DE), .12, undefined, .5], ["ring", 4, hx(0x2E86DE), .56, .07, .9],
    ["disc", 72, hx(0x2F9E5A), .19, undefined, .9], ["ring", 0, hx(0xD7263D), .56, .09, .95],
    ["ring", 85, hx(0xFF2A2A), .62, .12, .9], ["ring", 81, hx(0xF2B233), .5, .07, .9], ["ring", 72, hx(0xF2B233), .5, .07, .9]]);
  assert.ok(L.every(d => !d.ro), "舊記號不帶 ro"); assert.equal(L.filter(d => d.chk).length, 1, "被將軍的圈標成 checkRing（會閃）");
  assert.equal(C.lastOld, 0x2E86DE);
});
test("高對比（hiCon／高對比主題）：可走＝黃點黑邊、可吃＝四角瞄準框、將軍＝加粗紅圈＋「將」字牌；上一步、建議維持原色", () => {
  const L = K.pkcbMarks(board, o, ex, MD.hc), C = K.PKCB;
  const dot = pick(L, "dot"); assert.deepEqual(dot.map(d => [d.k, hx(d.col), d.r, d.op]), [["disc", "#111111", .245, 1], ["disc", "#FFD400", .19, 1]]);
  assert.ok(dot[0].ro < dot[1].ro, "黑邊先畫、黃點疊上去");
  const cap = pick(L, "cap"); assert.deepEqual(cap.map(d => [d.k, hx(d.col)]), [["bars", "#FFFFFF"], ["bars", "#111111"]]); assert.equal(cap[1].b.length, 8);
  const ck = pick(L, "check"); assert.deepEqual(ck.map(d => d.k), ["ring", "tag"]); assert.ok(ck[0].w > .12 && ck[0].chk); assert.equal(ck[1].i, 85);
  assert.ok(pick(L, "last").every(d => d.col === C.lastOld) && pick(L, "hint").every(d => d.col === C.hintOld));
  assert.ok(!L.some(d => d.col === C.dotOld || d.col === C.capOld), "不再有綠點、紅圈");
});
test("色弱模式：上一步朱橘＋黑白兩圈（由外而內 白→黑→朱橘，疊的順序也一樣）、建議改藍色虛線框、其他同高對比", () => {
  const L = K.pkcbMarks(board, o, ex, MD.cb), C = K.PKCB, last = pick(L, "last");
  const at4 = last.filter(d => d.i === 4); assert.deepEqual(at4.map(d => hx(d.col)), ["#FFFFFF", "#111111", "#D55E00"]);
  for (let k = 1; k < 3; k++) { assert.ok(at4[k].ro > at4[k - 1].ro); assert.ok(at4[k].r < at4[k - 1].r && at4[k].r - at4[k].w > at4[k - 1].r - at4[k - 1].w, "每一圈都夾在外一圈裡面（兩邊都露邊）") }
  assert.ok(last.some(d => d.i === 3 && d.k === "disc" && d.col === C.last), "起點朱橘點");
  const hint = pick(L, "hint"); assert.deepEqual([...new Set(hint.map(d => hx(d.col)))], ["#FFFFFF", "#0D47A1"]); assert.ok(hint.every(d => d.k === "bars"));
  assert.equal(hint.filter(d => d.col === C.hint).length, 2, "建議的起點、終點各一個框");
  assert.ok(!L.some(d => [C.lastOld, C.dotOld, C.capOld, C.hintOld].includes(d.col)), "原本的藍、綠、紅、琥珀都換掉了");
  assert.ok(L.every(d => d.ro > 0), "新記號都帶 ro（不經色調映射、照順序疊）");
});
test("邊界：沒有上一步／原地不動、沒選子、沒將軍、建議不是兩格、棋盤是空的：不畫也不會出錯", () => {
  for (const md of Object.values(MD)) {
    assert.deepEqual(K.pkcbMarks([], {}, {}, md), []);
    assert.deepEqual(K.pkcbMarks(board, { last: { f: 5, t: 5 }, check: -1, targets: null }, { hint: [1] }, md), []);
    assert.deepEqual(K.pkcbMarks(board, { check: 30 }, {}, md), [], "將軍那格沒有子＝不畫");
    assert.deepEqual(K.pkcbMarks(null, null, null, md), []);
  }
});
test("四角瞄準框：8 條都在棋子外（半徑 .485 擋不到）、不碰到隔壁格的框；虛線框 16 段、四邊對稱、四個角接起來", () => {
  const near = ([x0, z0, x1, z1]) => Math.hypot(Math.max(x0, 0, -x1), Math.max(z0, 0, -z1));
  for (const t of [.075, .15]) { const A = K.pkcbAim(.55, .22, t); assert.equal(A.length, 8);
    for (const r of A) { assert.ok(r[0] < r[2] && r[1] < r[3]); assert.ok(near(r) > .485 + .05, "瞄準框露在棋子外 " + r); assert.ok(Math.max(...r.map(Math.abs)) < .65, "不伸到隔壁格（格距 1）") } }
  const D = K.pkcbDash(.5, .07, 0); assert.equal(D.length, 16);
  const ext = D.reduce((a, r) => [Math.min(a[0], r[0]), Math.min(a[1], r[1]), Math.max(a[2], r[2]), Math.max(a[3], r[3])], [9, 9, -9, -9]);
  assert.deepEqual(ext.map(v => +v.toFixed(3)), [-.535, -.535, .535, .535]);
  const top = D.filter(r => r[1] < -.5).map(r => r[0]).sort((a, b) => a - b); assert.equal(top[0], -.535, "左上角接起來");
  const W = K.pkcbDash(.5, .13, .03); assert.ok(W.every((r, k) => r[0] <= D[k][0] && r[2] >= D[k][2] && r[1] <= D[k][1] && r[3] >= D[k][3]), "白邊每段都比藍線寬一圈");
});

// 假的 2D context：記下每一個畫的動作
const fakeG = () => { const ops = []; const g = { ops }; for (const k of ["fillRect", "beginPath", "arc", "stroke", "fill", "fillText", "clearRect"]) g[k] = (...a) => ops.push([k, g.fillStyle, g.strokeStyle, ...a]); return g };
test("高對比棋面：黑子＝黑底、白圈、白字；紅子＝白底、紅圈、紅字（跟平面棋盤「黑子反白」一致）", () => {
  const b = fakeG(), r = fakeG(); K.pkcbFace(b, 512, "車", false); K.pkcbFace(r, 512, "俥", true);
  assert.deepEqual(b.ops[0].slice(0, 2), ["fillRect", "#111111"]); assert.deepEqual(r.ops[0].slice(0, 2), ["fillRect", "#FFFFFF"]);
  const txt = g => g.ops.find(x => x[0] === "fillText"), strokes = g => g.ops.filter(x => x[0] === "stroke").map(x => x[2]);
  assert.deepEqual([txt(b)[1], txt(b)[3]], ["#FFFFFF", "車"]); assert.deepEqual([txt(r)[1], txt(r)[3]], ["#C8102E", "俥"]);
  assert.deepEqual(strokes(b), ["#FFFFFF", "#FFFFFF"]); assert.deepEqual(strokes(r), ["#C8102E", "#C8102E"]);
  assert.equal(K.pkcbBody(false), "#1C1C1C"); assert.equal(K.pkcbBody(true), "#EFE9DF");
});
test("「將」字牌：黃底黑邊、寫「將」；搖桿光圈：色弱模式能走改黃、不能走維持灰", () => {
  const g = fakeG(); K.pkcbTag(g, 128); const f = g.ops.find(x => x[0] === "fill"), t = g.ops.find(x => x[0] === "fillText");
  assert.equal(f[1], "#FFD400"); assert.equal(f[2], "#111111"); assert.deepEqual([t[1], t[3]], ["#111111", "將"]);
  assert.equal(K.pkcbPad(true, false), 0x7CFFB0); assert.equal(K.pkcbPad(true, true), 0xFFD400); assert.equal(K.pkcbPad(false, true), 0x9A9AA8); assert.equal(K.pkcbPad(false, false), 0x9A9AA8);
});

// ====================== ① 行為：06-cpu parkLook、07cb cbPark ======================
function lookEnv(store) {
  const fn = n => { const i = CPU.indexOf("function " + n + "("); assert.ok(i >= 0, n); let d = 0, j = CPU.indexOf("{", i); for (; j < CPU.length; j++) { if (CPU[j] === "{") d++; else if (CPU[j] === "}" && !--d) break } return CPU.slice(i, j + 1) };
  const cssv = CPU.match(/const cssVarOut=.*?;(?=\s+\/\*)/)[0];
  const ctx = { store: { get: (k, d) => k in store ? store[k] : d }, GLY_ERAS: new Set(), GLY: {}, GLY_BOLD: {}, PSET: new Set(["classic"]), psetBoard: () => false, BOARD_IMG: {}, BOARD_IMG_FILE: {}, PIECE_INK: { classic: { r: "#B3141B", b: "#141414" } },
    curEra: () => null, needGly: () => {}, PARK: null, boardTheme: () => ({ piece: "#F2E6C8", r: "#B3261E", b: "#1E1A16", grid: "#3A1D0A" }), boardBG: () => "<rect/>",
    document: { documentElement: {} }, getComputedStyle: () => ({ getPropertyValue: () => "" }), encodeURIComponent };
  vm.createContext(ctx); vm.runInContext(cssv + "\n" + fn("parkLook") + "\n" + fn("parkLook0") + ";this.parkLook=parkLook", ctx); return ctx;
}
test("06-cpu parkLook：色弱模式併進 hc（棋子換高對比、不用整套朝代圖）並另給 cb；跟高對比棋子共存", () => {
  const off = lookEnv({}).parkLook(), cb = lookEnv({ cbMode: true }).parkLook(), hi = lookEnv({ hiCon: true }).parkLook(), both = lookEnv({ cbMode: true, hiCon: true }).parkLook();
  assert.deepEqual([off.hc, off.cb, off.hi], [false, false, false]); assert.ok(off.pset, "關：經典整套棋子照用");
  assert.deepEqual([cb.hc, cb.cb, cb.hi], [true, true, false]); assert.equal(cb.pset, null, "色弱模式：改用高對比棋面");
  assert.deepEqual([hi.hc, hi.cb, hi.hi], [true, false, true]); assert.deepEqual([both.hc, both.cb, both.hi], [true, true, true]);
  assert.ok(/^data:image\/svg/.test(cb.img || ""), "只開色弱模式：棋盤照樣用平面棋盤風格的底圖");
  assert.equal(hi.img, null, "高對比棋子：維持原本（不畫風格底圖）");
});
function cbEnv(park) {
  const attrs = new Set(), ctx = { store: { get: (k, d) => k === "cbMode" ? ctx.on : d }, on: false,
    document: { documentElement: { setAttribute: k => attrs.add(k), removeAttribute: k => attrs.delete(k) }, getElementById: () => ({}), querySelectorAll: () => [], head: { append() {} }, createElement: () => ({}) },
    window: { dispatchEvent() {} }, CustomEvent: function () {}, PARK: park, parkLook: () => ({ k: "classic", hc: ctx.on, cb: ctx.on }) };
  vm.createContext(ctx); vm.runInContext(CBS + ";this.cbApply=cbApply;this.cbPark=cbPark", ctx); return ctx;
}
test("07cb cbApply：3D 園子開著就帶新的 look 重畫（cb 開→關都會），園子沒開不出錯", () => {
  const calls = [], park = { last: { board: ["K"], o: { sel: -1 }, ex: { look: { hc: false, cb: false } } }, v: { draw: (b, o, ex) => calls.push(ex.look.cb) } };
  const E = cbEnv(park); calls.length = 0;
  E.on = true; assert.equal(E.cbApply(), true); E.on = false; E.cbApply();
  assert.deepEqual(calls, [true, false]); assert.equal(park.last.ex.look.cb, false);
  const N = cbEnv(null); N.on = true; assert.equal(N.cbApply(), true); assert.equal(N.cbPark(), false);
});

// ====================== ② 色彩：關 → 開 ======================
/* 每一列：[名稱, 關的兩個顏色, 開的兩個顏色（或多組取高者＝外框）, 要不要 ΔE] */
const best = (pairs, s, f) => Math.max(...pairs.map(([a, b]) => f(a, b, s)));
const C = K.PKCB;
const ROWS = [
  ["紅子 vs 黑子 棋面", [["#EED19A", "#EED19A"]], [[C.faceR, C.faceB]], true],
  ["紅子 vs 黑子 側邊（平視看到的）", [["#E2C48C", "#E2C48C"]], [[C.bodyR, C.bodyB]], true],
  ["紅字 vs 紅子棋面", [["#9A0A12", "#EED19A"]], [[C.inkR, C.faceR]], false],
  ["黑字 vs 黑子棋面", [["#0E0E0E", "#EED19A"]], [[C.inkB, C.faceB]], false],
  ["可走的點 vs 木紋棋盤", [[mix(C.dotOld, WOOD, .9), WOOD]], [[C.dot, WOOD], [C.ink, WOOD]], false],
  ["可走的點 vs 深色棋盤", [[mix(C.dotOld, DARK, .9), DARK]], [[C.dot, DARK], [C.ink, DARK]], false],
  ["上一步 vs 木紋棋盤（開：朱橘本身）", [[mix(C.lastOld, WOOD, .9), WOOD]], [[C.last, WOOD]], false],
  ["上一步外框 vs 木紋棋盤（黑邊、白邊取高者）", [[mix(C.lastOld, WOOD, .9), WOOD]], [[C.ink, WOOD], [C.white, WOOD]], false],
  ["上一步外框 vs 深色棋盤", [[mix(C.lastOld, DARK, .9), DARK]], [[C.ink, DARK], [C.white, DARK]], false],
  ["上一步 vs 電腦建議", [[C.lastOld, C.hintOld]], [[C.last, C.hint]], true],
  ["可走的點 vs 上一步", [[C.dotOld, C.lastOld]], [[C.dot, C.last]], true],
  ["可吃的子（紅圈／瞄準框）vs 木紋棋盤", [[mix(C.capOld, WOOD, .95), WOOD]], [[C.ink, WOOD], [C.white, WOOD]], false],
  ["可走的點 vs 可吃的記號", [[C.dotOld, C.capOld]], [[C.dot, C.ink]], true],
  ["被將軍（紅圈／「將」字牌字）", [[mix(C.chk, WOOD, .9), WOOD]], [["#111111", "#FFD400"]], false],
  ["電腦建議 vs 木紋棋盤（開：藍線、白邊取高者）", [[mix(C.hintOld, WOOD, .9), WOOD]], [[C.hint, WOOD], [C.white, WOOD]], false],
  ["電腦建議 vs 黑洞棋盤", [[mix(C.hintOld, BH, .9), BH]], [[C.hint, BH], [C.white, BH]], false],
  ["黑洞搖桿：能走 vs 不能走", [[C.padOk, C.padNo]], [[C.padOkCb, C.padNo]], true],
];
const r2 = v => Math.round(v * 100) / 100;
const cell = (pairs, s, d) => r2(best(pairs, s, con)) + (d ? `（${Math.round(best(pairs, s, de))}）` : "");
test("色弱模式下（四種色覺模擬＋正常）：黑白兩方、記號跟棋盤、記號彼此都分得開（門檻：棋面字 4.5、圖形外框 3、ΔE 20）", () => {
  const get = n => ROWS.find(r => r[0] === n);
  for (const [s] of SIMS) {
    assert.ok(best(get("紅子 vs 黑子 棋面")[2], s, con) >= 15, "棋面黑白 " + s);
    assert.ok(best(get("紅子 vs 黑子 側邊（平視看到的）")[2], s, con) >= 10, "側邊 " + s);
    for (const n of ["紅字 vs 紅子棋面", "黑字 vs 黑子棋面", "被將軍（紅圈／「將」字牌字）"]) assert.ok(best(get(n)[2], s, con) >= 4.5, n + " " + s);
    for (const n of ["可走的點 vs 木紋棋盤", "可走的點 vs 深色棋盤", "上一步外框 vs 木紋棋盤（黑邊、白邊取高者）", "上一步外框 vs 深色棋盤", "可吃的子（紅圈／瞄準框）vs 木紋棋盤", "電腦建議 vs 木紋棋盤（開：藍線、白邊取高者）", "電腦建議 vs 黑洞棋盤"])
      assert.ok(best(get(n)[2], s, con) >= 3, n + " " + s + " " + best(get(n)[2], s, con));
    for (const n of ["可走的點 vs 上一步", "可走的點 vs 可吃的記號", "黑洞搖桿：能走 vs 不能走"]) assert.ok(best(get(n)[2], s, de) >= 20, n + " " + s);
    if (s !== "achromatopsia") assert.ok(best(get("上一步 vs 電腦建議")[2], s, de) >= 40, "上一步 vs 建議 " + s);
  }
});
test("對照組：原本的 3D 記號在紅綠色盲下確實分不開（證明換色有理由）", () => {
  for (const s of ["protanopia", "deuteranopia"]) {
    assert.ok(con(C.dotOld, WOOD, s) < 1.8, "原本綠點對木紋 " + s + " " + con(C.dotOld, WOOD, s));
    assert.equal(r2(con("#EED19A", "#EED19A", s)), 1, "原本兩方棋面同色");
    assert.ok(de(C.dotOld, C.capOld, s) < 30 && de(C.dot, C.ink, s) > 100, "可走（綠點）vs 可吃（紅圈）：原本色差不到 30，開了黃點對黑框 100 以上");
    assert.ok(con(C.dotOld, C.lastOld, s) < 1.2 && con(C.dot, C.last, s) > 2.4, "可走 vs 上一步：原本只差色相（亮度幾乎一樣），開了靠明暗");
  }
});
if (process.argv.includes("--table")) {
  const out = ["| 項目 | " + SIMS.map(s => s[1]).join(" | ") + " |", "|---|" + SIMS.map(() => "---|").join("")];
  for (const [n, a, b, d] of ROWS) out.push(`| ${n} | ` + SIMS.map(([s]) => `${cell(a, s, d)} → ${cell(b, s, d)}`).join(" | ") + " |");
  console.log(out.join("\n"));
}

// ====================== ③ 原始碼 ======================
test("〔原始碼〕park3d：draw 用 pkcbMarks 畫提示、look 的 hc／cb 換了會重畫棋面、新記號不經色調映射、高對比棋面與側邊用 PKCB", () => {
  assert.ok(P3.includes("for(const d of pkcbMarks(board,o,ex,{hc:!!(LOOK&&LOOK.hc),cb:!!(LOOK&&LOOK.cb)})){const m=markAdd(d);if(d.chk)checkRing=m}"));
  assert.ok(P3.includes("ex.look.grid,!!ex.look.hc,!!ex.look.cb]"), "lookKey 含 hc、cb");
  assert.ok(/const markMat=\(col,op\)=>new T\.MeshBasicMaterial\(\{[^}]*toneMapped:false/.test(P3));
  assert.ok(P3.includes("cv(FN,FN,(g,n)=>pkcbFace(g,n,ch,red))") && P3.includes("L&&L.hc?pkcbBody(red)"));
  assert.ok(!/ring\(L\.f,0x2E86DE/.test(P3), "舊的寫死畫法拿掉了（改由 pkcbMarks 給）");
  assert.ok(P3.includes("const HILL_P=[[-.2,-.06],[4,-.9],[12,-3.6],[26,-9],[46,-18],[76,-32],[120,-52]];"), "雲雨山坡剖面沒動");
});
test("〔原始碼〕06-cpu：hc 含 cbMode、parkLook 只在高對比棋子時才不畫風格底圖；07cb：cbApply 呼叫 cbPark；說明文件兩份一樣、3D 已套用", () => {
  assert.ok(CPU.includes('cb=!!store.get("cbMode",false),hc=hi||cb') && CPU.includes("return{k,hc,hi,cb,"));
  assert.ok(CPU.includes("if(o.img||o.hi)return o;"));
  assert.ok(/cbUndo\(\)\}catch\(e\)\{\}\}cbPark\(\);/.test(CBS));
  const a = fs.readFileSync(path.join(DB, "art/docs/colorblind.md"), "utf8"), b = fs.readFileSync(path.join(LAB, "site/data/docs/colorblind.md"), "utf8");
  assert.equal(a, b); assert.ok(!a.includes("\r")); assert.match(a, /## 5\. 3D 棋盤：已套用/);
});
