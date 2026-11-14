// 11/13 評比循環第 13 輪 X6：3D 色弱模式補完（上一輪沒改到的三樣）的自動測試，不開瀏覽器、不載 three.js：
//   ① 黑洞將軍「星樞警鐘」一閃的紅光：park3d.js 的 gntCheckFx 原樣切出來，配假的 fxLine／fxRing／fxGlow 實跑——色弱模式改黃色 #FFD400 虛線（7 段）、九宮圈與光點也黃
//   ② 馬腿／象眼被擋的星鎖「✕」：gntHorseLock 原樣切出來實跑——色弱模式改橘 #FFB347（平面色弱模式「不能、壞」的橘）、加粗成三條、光點白
//   ③ 車輪戰別桌的 3D 小棋子：simPTex／simPMesh 用假的 THREE、假的 canvas 實跑——高對比／色弱模式＝黑子黑底白字、側邊深色；look 換了清掉重建；
//      08s-simul.js 開場各桌小棋盤 simBoardSvg 在色弱模式也換黑白棋面
//   ④ 色彩：用 07cb 同一組色覺模擬矩陣（Machado 2009）、WCAG 對比、CIE76 色差算「關 → 開」；--table 印出 colorblind.md 第 5 節補完表
// 用法：node --test xiangqi-lab/tools/test-park3d-cbfx.js　（node xiangqi-lab/tools/test-park3d-cbfx.js --table 印表）
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const P3 = rd(path.join(LAB, "src/park3d.js")), CBS = rd(path.join(M, "07cb-colorblind.js")), SIMUL = rd(path.join(M, "08s-simul.js"));
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, "找不到 " + a + " … " + b); return s.slice(i, j) };
const blk = P3.match(/\/\*PKCB\{[\s\S]*?\/\*\}PKCB\*\//)[0];
const K = new Function(blk + ";return{PKCB,pkcbFx,pkcbSeg,pkcbCross,pkcbSimFace,pkcbSimSide,pkcbFace,pkcbBody}")();
const hx = n => typeof n === "number" ? "#" + n.toString(16).padStart(6, "0").toUpperCase() : String(n).toUpperCase();

// ====================== 純函式 ======================
test("pkcbFx：關＝原本的紅光、紅金色「✕」；色弱模式＝警鐘黃 #FFD400 虛線、「✕」橘 #FFB347 加粗、光點白", () => {
  const off = K.pkcbFx(false), on = K.pkcbFx(true);
  assert.deepEqual([off.ck.line, off.ck.ring, off.ck.glow, off.ck.dash].map(x => typeof x === "number" ? hx(x) : x), ["#FF6B5A", "#FF6B5A", "#FF6B5A", false]);
  assert.deepEqual([off.lock.x, off.lock.glow, off.lock.thick].map(x => typeof x === "number" ? hx(x) : x), ["#FF8A5A", "#FFB070", false]);
  assert.deepEqual([on.ck.line, on.ck.ring, on.ck.glow].map(hx), ["#FFD400", "#FFD400", "#FFD400"]); assert.equal(on.ck.dash, true);
  assert.equal(on.ck.line, K.PKCB.dot, "跟「將」字牌、可走黃點同一個黃");
  const CB_COL = (() => { const ctx = {}; vm.createContext(ctx); const i = CBS.indexOf("#CB-PURE-BEGIN"), j = CBS.indexOf("/* #CB-PURE-END */"); vm.runInContext(CBS.slice(CBS.indexOf("\n", i) + 1, j) + ";this.C=CB_COL", ctx); return ctx.C })();
  assert.equal(hx(on.lock.x), CB_COL.orangeL.toUpperCase(), "跟平面色弱模式「✗ 壞、不能」深色底的橘同一個");
  assert.equal(hx(on.lock.glow), "#FFFFFF"); assert.equal(on.lock.thick, true);
});
test("pkcbSeg 切虛線：n 段、每段佔 55%、從起點開始、不超過終點；pkcbCross：一般 2 條、加粗 6 條（左右各多一條），形狀還是 ✕", () => {
  const S = K.pkcbSeg([0, 1, 0], [7, 1, -14], 7); assert.equal(S.length, 7);
  assert.deepEqual(S[0][0], [0, 1, 0]); for (const [a, b] of S) { const l = Math.hypot(b[0] - a[0], b[2] - a[2]); assert.ok(Math.abs(l - Math.hypot(7, 14) / 7 * .55) < 1e-9); assert.equal(a[1], 1) }
  assert.ok(S[6][1][0] < 7, "最後一段不超過終點");
  const c1 = K.pkcbCross(.22, false), c3 = K.pkcbCross(.22, true);
  assert.deepEqual(c1, [[[-.22, -.22], [.22, .22]], [[.22, -.22], [-.22, .22]]], "跟原本畫法一樣");
  assert.equal(c3.length, 6); for (const [[x1, y1], [x2, y2]] of c3) assert.ok(Math.abs(Math.abs((y2 - y1) / (x2 - x1)) - 1) < 1e-9, "都是 45 度斜線");
});

// ====================== gntCheckFx／gntHorseLock 實跑 ======================
function fxKit(cb) {
  const rec = { lines: [], rings: [], glows: [], fades: [] };
  const env = { RDM: false, LOOK: cb == null ? null : { cb }, TOP: .56, GNT_H: 1.55, GS: 1, pkcbFx: K.pkcbFx, pkcbSeg: K.pkcbSeg, pkcbCross: K.pkcbCross,
    sideOf: p => p === p.toUpperCase() ? "r" : "b", pos: i => [i % 9 - 4, (i / 9 | 0) - 4.5],
    fxLine: (pts, col, op) => { const o = { k: "line", pts, col, op }; rec.lines.push(o); return o }, fxRing: (x, z, col, r) => { const o = { k: "ring", col, r }; rec.rings.push(o); return o },
    fxGlow: (x, y, z, col, s) => { const o = { k: "glow", col, s }; rec.glows.push(o); return o }, fxFade: (objs, d, dl) => rec.fades.push({ n: objs.length, d, dl }) };
  const src = cut(P3, "const gntCheckFx=", "/* 馬被蹩腿") + cut(P3, "let GNSEL=-1;const gntHorseLock=", "if(objs.length)fxFade(objs,.5,.9)};") + "if(objs.length)fxFade(objs,.5,.9)};";
  const names = Object.keys(env), api = new Function(...names, src + ";return{gntCheckFx,gntHorseLock}")(...names.map(k => env[k]));
  return { api, rec };
}
test("黑洞將軍警鐘（gntCheckFx 實跑）：關＝一條紅色實線＋紅圈＋紅光點；色弱模式＝黃色 7 段虛線、黃圈、黃光點，一樣 0.6 秒淡出", () => {
  const B = Array(90).fill(null); B[4] = "k"; B[13 + 27] = "R";   /* 紅俥在 e5 往上將黑將 e9 */
  const off = fxKit(false); off.api.gntCheckFx(40, B);
  assert.equal(off.rec.lines.length, 1); assert.equal(hx(off.rec.lines[0].col), "#FF6B5A"); assert.equal(hx(off.rec.rings[0].col), "#FF6B5A"); assert.equal(hx(off.rec.glows[0].col), "#FF6B5A");
  assert.deepEqual(off.rec.fades, [{ n: 3, d: .6, dl: .2 }]);
  const on = fxKit(true); on.api.gntCheckFx(40, B);
  assert.equal(on.rec.lines.length, 7, "虛線 7 段"); assert.ok(on.rec.lines.every(l => hx(l.col) === "#FFD400"));
  assert.equal(hx(on.rec.rings[0].col), "#FFD400"); assert.equal(hx(on.rec.glows[0].col), "#FFD400"); assert.deepEqual(on.rec.fades, [{ n: 9, d: .6, dl: .2 }]);
  const [a, b] = [on.rec.lines[0].pts[0], on.rec.lines[6].pts[1]]; assert.deepEqual(a, [0, .56 + 1.55 * .6, -.5], "從將軍的子出發");
  assert.ok(Math.abs(b[2] - (-.5 - 4 * 6.55 / 7)) < 1e-9, "往被將的將（e9）");
  const none = fxKit(null); none.api.gntCheckFx(40, B); assert.equal(none.rec.lines.length, 1, "沒有 look（剛建場景）照原本");
});
test("馬腿／象眼星鎖（gntHorseLock 實跑）：被擋的腿才亮；關＝紅金「✕」兩條；色弱模式＝橘 #FFB347 加粗三條×2、白光點", () => {
  const B = Array(90).fill(null), h = 7 * 9 + 4; B[h] = "N"; B[h - 9] = "P";   /* 紅傌 e2，馬腿 e3 被自己的兵擋住（往上那兩步走不了） */
  const off = fxKit(false); off.api.gntHorseLock(h, B);
  assert.equal(off.rec.lines.length, 2); assert.ok(off.rec.lines.every(l => hx(l.col) === "#FF8A5A")); assert.equal(hx(off.rec.glows[0].col), "#FFB070"); assert.equal(off.rec.glows.length, 1, "只有一條腿被擋");
  const p = off.rec.lines[0].pts; assert.ok(Math.abs(p[0][0] - 0) < .23 && Math.abs(p[0][2] - (6 - 4.5)) < 1e-9, "亮在馬腿那一格（e3）");
  const on = fxKit(true); on.api.gntHorseLock(h, B);
  assert.equal(on.rec.lines.length, 6); assert.ok(on.rec.lines.every(l => hx(l.col) === "#FFB347")); assert.equal(hx(on.rec.glows[0].col), "#FFFFFF");
  assert.deepEqual(on.rec.fades, [{ n: 7, d: .5, dl: .9 }]);
  on.api.gntHorseLock(h, B); assert.equal(on.rec.lines.length, 6, "同一顆再選一次不重播");
  const E = Array(90).fill(null); E[h] = "N"; const x = fxKit(true); x.api.gntHorseLock(h, E); assert.equal(x.rec.lines.length, 0, "沒被擋＝不亮");
});

// ====================== 車輪戰別桌小棋子 ======================
function fakeG() { const ops = []; const g = { ops }; for (const k of ["fillRect", "beginPath", "arc", "stroke", "fill", "fillText", "clearRect"]) g[k] = (...a) => ops.push([k, g.fillStyle, g.strokeStyle, ...a]); return g }
function simKit(look) {
  const src = cut(P3, "const simHC=", "const simPieces=");
  const made = [], SIMPM = {}, SIMW = { kids: [], add(m) { this.kids.push(m) }, remove(m) { this.kids = this.kids.filter(x => x !== m) } }, piecesCalls = [];
  const T = { SRGBColorSpace: "srgb", CanvasTexture: function (cv) { this.cv = cv; this.dispose = () => { this.gone = true } }, MeshStandardMaterial: function (o) { Object.assign(this, o); this.dispose = () => { this.gone = true } },
    InstancedMesh: function (geo, mats, n) { this.mats = mats; this.material = mats; this.count = n; this.dispose = () => { this.gone = true } } };
  const doc = { createElement: () => { const g = fakeG(); const cv = { getContext: () => g, g }; made.push(cv); return cv } };
  const M = (c, o) => ({ color: c, ...o, tag: "M" }), env = { LOOK: look, T, document: doc, sideOf: p => p === p.toUpperCase() ? "r" : "b", NAMES: { r: { R: "俥", K: "帥" }, b: { R: "車", K: "將" } }, SERIF: "serif", ANI: 4,
    M, simPGeo: { geo: 1 }, simPBot: { bot: 1 }, simPSide0: { side0: 1 }, SIMPM, SIMW, simPI: 2, simPieces: i => piecesCalls.push(i), pkcbSimFace: K.pkcbSimFace, pkcbSimSide: K.pkcbSimSide };
  const box = { look };
  const names = Object.keys(env).filter(k => k !== "LOOK"), api = new Function("box", ...names, "let LOOK=box.look;" + src + ";return{simPMesh,simPClr,setLook:l=>{LOOK=l}}")(box, ...names.map(k => env[k]));
  return { api, made, SIMPM, SIMW, piecesCalls };
}
test("車輪戰別桌 3D 小棋子（simPMesh 實跑）：關＝原本米色棋面、紅黑只差字色；高對比／色弱模式＝紅子白底紅字、黑子黑底白字、側邊深淺分得開；換設定清掉重建", () => {
  const S = simKit(null), r = S.api.simPMesh("R"), b = S.api.simPMesh("r");
  assert.deepEqual(r.mats[0], { side0: 1 }, "關：側邊照原本的共用材質"); assert.equal(r.mats[2].bot, 1);
  const face = m => m.mats[1].map.cv.g.ops, fill0 = ops => ops.find(x => x[0] === "fill")[1], txt = ops => ops.find(x => x[0] === "fillText");
  assert.equal(fill0(face(r)), "#F3E2BC"); assert.equal(fill0(face(b)), "#F3E2BC", "原本兩方棋面同色"); assert.deepEqual([txt(face(r))[1], txt(face(r))[3]], ["#B3141B", "俥"]); assert.deepEqual([txt(face(b))[1], txt(face(b))[3]], ["#1A1410", "車"]);
  assert.equal(S.api.simPMesh("R"), r, "同一種棋子共用一個 InstancedMesh");
  /* 打開色弱模式（look.hc＝true）：refreshLook 會叫 simPClr → 全部清掉、照目前那桌重排 */
  S.api.setLook({ hc: true, cb: true }); S.api.simPClr();
  assert.equal(Object.keys(S.SIMPM).length, 0); assert.ok(r.gone && r.mats[1].map.gone, "舊的網格、貼圖釋放"); assert.deepEqual(S.piecesCalls, [2], "照現在那桌重排別桌棋子");
  const r2 = S.api.simPMesh("R"), b2 = S.api.simPMesh("r");
  assert.equal(face(r2)[0][0], "fillRect"); assert.equal(face(r2)[0][1], "#FFFFFF"); assert.equal(face(b2)[0][1], "#111111", "黑子黑底");
  assert.deepEqual([txt(face(b2))[1], txt(face(b2))[3]], ["#FFFFFF", "車"]); assert.deepEqual([txt(face(r2))[1]], ["#C8102E"]);
  assert.equal(r2.mats[0].color, 0xEFE9DF); assert.equal(b2.mats[0].color, 0x1C1C1C, "黑子側邊深色（平視也分得出）");
  assert.equal(S.api.simPMesh("K").mats[0], r2.mats[0], "同一方的側邊材質共用");
});
test("08s 開場各桌小棋盤 simBoardSvg：色弱模式（cbOn）紅子白底紅圈紅字、黑子黑底白字白圈；關掉照原本米色棋面", () => {
  const src = cut(SIMUL, "function simBoardSvg(", "\nconst SIM_PC=");
  const mk = on => new Function("SIM_CN", "cbOn", src + ";return simBoardSvg")({ R: "俥", r: "車" }, () => on);
  const b = Array(90).fill(null); b[81] = "R"; b[0] = "r";
  const pc = svg => [...svg.matchAll(/<circle cx="(\d+)" cy="(\d+)" r="26" fill="(#[0-9a-fA-F]+)"[^>]*\/>(?:<circle[^>]*r="20"[^>]*stroke="(#[0-9A-F]+)"[^>]*\/>)?<text[^>]*fill="(#[0-9a-fA-F]+)"[^>]*>(.)</g)].map(m => ({ x: +m[1], face: m[3], ring: m[4] || null, ink: m[5], ch: m[6] }));
  const off = pc(mk(false)(b)), on = pc(mk(true)(b));
  assert.deepEqual(off.map(p => [p.ch, p.face, p.ink]), [["車", "#f6e7c8", "#222"], ["俥", "#f6e7c8", "#b3261e"]], "關：照原本");
  assert.deepEqual(on.map(p => [p.ch, p.face, p.ring, p.ink]), [["車", "#111111", "#FFFFFF", "#FFFFFF"], ["俥", "#FFFFFF", "#C8102E", "#C8102E"]], "開：跟 3D 高對比棋面同色");
  assert.equal(pc(mk(true)(b, false))[0].face, "#f6e7c8", "明確給 cb＝false 時照原本");
  assert.equal(pc(new Function("SIM_CN", src + ";return simBoardSvg")({ R: "俥", r: "車" })(b))[0].face, "#f6e7c8", "沒有 07cb（cbOn 不存在）也不會出錯");
});

// ====================== 色彩：關 → 開 ======================
const CB = (() => { const i = CBS.indexOf("#CB-PURE-BEGIN"), j = CBS.indexOf("/* #CB-PURE-END */"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(CBS.slice(CBS.indexOf("\n", i) + 1, j) + ";this.R={cbRgb,cbContrast,cbSim}", ctx); return ctx.R })();
const lab = c => { const l = c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) });
  const X = (l[0] * .4124 + l[1] * .3576 + l[2] * .1805) / .95047, Y = l[0] * .2126 + l[1] * .7152 + l[2] * .0722, Z = (l[0] * .0193 + l[1] * .1192 + l[2] * .9505) / 1.08883;
  const f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))] };
const SIMS = [["none", "正常視覺"], ["protanopia", "紅色盲"], ["deuteranopia", "綠色盲"], ["tritanopia", "藍色盲"], ["achromatopsia", "全色盲"]];
const sim = (c, s) => CB.cbSim(CB.cbRgb(hx(c)), s), con = (a, b, s) => CB.cbContrast(sim(a, s), sim(b, s)), de = (a, b, s) => { const A = lab(sim(a, s)), B = lab(sim(b, s)); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) };
const BH = "#0A0B1E", P = K.PKCB, FX0 = K.pkcbFx(false), FX1 = K.pkcbFx(true);
/* [名稱, 關的兩色, 開的兩色, 要不要附 ΔE] */
const ROWS = [
  ["將軍警鐘 vs 黑洞棋盤", [FX0.ck.line, BH], [FX1.ck.line, BH], false],
  ["將軍警鐘 vs 常駐的被將軍紅圈", [FX0.ck.line, P.chk], [FX1.ck.line, P.chk], true],
  ["馬腿星鎖「✕」vs 黑洞棋盤", [FX0.lock.x, BH], [FX1.lock.x, BH], false],
  ["馬腿星鎖「✕」vs 將軍警鐘", [FX0.lock.x, FX0.ck.line], [FX1.lock.x, FX1.ck.line], true],
  ["車輪戰別桌：紅子 vs 黑子 棋面", [P.simFace, P.simFace], [P.faceR, P.faceB], true],
  ["車輪戰別桌：紅子 vs 黑子 側邊", [P.simSide, P.simSide], [P.bodyR, P.bodyB], true],
  ["車輪戰別桌：黑字 vs 黑子棋面", [P.simInkB, P.simFace], [P.inkB, P.faceB], false],
  ["車輪戰別桌：紅字 vs 紅子棋面", [P.simInkR, P.simFace], [P.inkR, P.faceR], false],
];
const r2 = v => Math.round(v * 100) / 100, cell = (pr, s, d) => r2(con(pr[0], pr[1], s)) + (d ? `（${Math.round(de(pr[0], pr[1], s))}）` : "");
test("色彩門檻（五種色覺）：警鐘、星鎖對黑洞棋盤 ≥ 7；警鐘比原本亮、跟常駐紅圈拉開；別桌紅黑棋面 18.9:1、側邊 14:1、字 ≥ 4.5", () => {
  const get = n => ROWS.find(r => r[0] === n);
  for (const [s] of SIMS) {
    for (const n of ["將軍警鐘 vs 黑洞棋盤", "馬腿星鎖「✕」vs 黑洞棋盤"]) { const [, a, b] = get(n); assert.ok(con(b[0], b[1], s) >= 7, n + " " + s); assert.ok(con(b[0], b[1], s) > con(a[0], a[1], s), n + " 比原本高 " + s) }
    { const [, a, b] = get("將軍警鐘 vs 常駐的被將軍紅圈"); assert.ok(con(b[0], b[1], s) > con(a[0], a[1], s) + .8, "警鐘跟紅圈靠明暗分得開 " + s) }
    assert.ok(con(P.faceR, P.faceB, s) > 18 && con(P.simFace, P.simFace, s) === 1, "別桌棋面 " + s);
    assert.ok(con(P.bodyR, P.bodyB, s) > 13, "別桌側邊 " + s);
    for (const n of ["車輪戰別桌：黑字 vs 黑子棋面", "車輪戰別桌：紅字 vs 紅子棋面"]) { const [, , b] = get(n); assert.ok(con(b[0], b[1], s) >= 4.5, n + " " + s) }
  }
  /* 對照組：原本警鐘、星鎖都是紅橘系，在紅色盲下比正常暗一截 */
  assert.ok(con(FX0.ck.line, BH, "protanopia") < con(FX0.ck.line, BH, "none") - 1.2, "原本紅光在紅色盲下變暗");
});
if (process.argv.includes("--table")) {
  const out = ["| 項目 | " + SIMS.map(s => s[1]).join(" | ") + " |", "|---|" + SIMS.map(() => "---|").join("")];
  for (const [n, a, b, d] of ROWS) out.push(`| ${n} | ` + SIMS.map(([s]) => `${cell(a, s, d)} → ${cell(b, s, d)}`).join(" | ") + " |");
  console.log(out.join("\n"));
}

// ====================== 原始碼與文件 ======================
test("〔原始碼〕park3d 接上 pkcbFx／pkcbCross／pkcbSimFace、refreshLook 叫 simPClr；黑洞既有斷言要的字串還在；colorblind.md 兩份一樣、寫了補完", () => {
  for (const s of ["const F=pkcbFx(!!(LOOK&&LOOK.cb)).ck,", "pkcbSeg([ax,y,az],[kx,y,kz],7)", "const F=pkcbFx(!!(LOOK&&LOOK.cb)).lock;", "of pkcbCross(s,F.thick)", "pkcbSimFace(g,128,", "if(prevB)sync(prevB);try{simPClr()}catch(e){}",
    "if(GIANT&&o.check)try{gntCheckFx(L.t,board)}catch(e){}", "storySet(ex.bhStars);gntHorseLock(o.sel!=null?o.sel:-1,board)", "new T.InstancedMesh(simPGeo,[simPSide,new T.MeshStandardMaterial({map:simPTex(p),roughness:.5}),simPBot],64)"])
    assert.ok(P3.includes(s), s);
  assert.ok(!/0xFF6B5A,\.95\)|0xFF8A5A,\.95\)/.test(P3), "寫死的紅光、紅金 ✕ 拿掉了（改由 pkcbFx 給）");
  const a = fs.readFileSync(path.join(DB, "art/docs/colorblind.md"), "utf8"), b = fs.readFileSync(path.join(LAB, "site/data/docs/colorblind.md"), "utf8");
  assert.equal(a, b); assert.ok(!a.includes("\r"));
  for (const w of ["將軍警鐘", "星鎖", "車輪戰別桌", "#FFB347", "test-park3d-cbfx.js"]) assert.ok(a.includes(w), w);
  assert.ok(!a.includes("沒有改色（被將軍另外有常駐的圈"), "上一輪的限制改寫了");
});
