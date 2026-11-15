#!/usr/bin/env node
// 「建議先練」階段差異的配對估計＋選擇效應修正：接進 App 之前（之後）的模擬驗證。
// 依據：story/chatgpt_app/數學模型77修正後_三視角重評_2026-11-15.md 第四節 3、第五節第 4 項——
//   「零差異、正負共變異、缺階段、小樣本案例；公布覆蓋率與誤報率，不只 pass」。
// 跑的是 App 裡真正的程式：用 vm 載入 xiangqi-db/m/04-stats.js 的 mxAxisPt／skillAxes／mxPairSe／mxTcrit／skillPick（不是另外抄一份）。
//   「之前」的判斷（11/15 以前的 skillPick：最高、最低的差 ≥ 2·√(se²＋se²)＝hi、≥ 1.64＝mid）在這支裡照抄成 oldPick，用同一批模擬資料比。
// 假設的資料（不是真人資料，數字只說明「這個估計程序在這種資料下的表現」）：
//   每一步少掉的分數＝四段混合（40% 幾乎最佳、45% 小失誤、11% 中失誤、4% 大失誤；test-mathmodel-1046.js「入門～業1」那組）× 這盤這個階段的狀態 e^(τ·e)，準確度＝100·e^(−少掉的分數/200)（跟 App 的 SK.acc 同一條）。
//   e＝每盤每階段的狀態（標準常態）；三個階段兩兩相關 ρ：0（獨立）、+0.7（這盤整盤都好或都差）、−0.4（開局用心、殘局就草率）。τ＝0.6。
//   每盤：開局 10 步；中局 5～24 步；殘局有沒有走到的機率 pEnd，4～19 步；一成的盤很短（中局 3～7 步、沒有殘局）。
//   「有差異」＝殘局每一步少掉的分數乘 e^δ（δ＝0.35、0.7），真正的差距用 200 萬步的大樣本算（不是把 δ 直接當差距）。
//   「時間相關」＝狀態在連續的盤之間是 AR(1)（φ＝0.5），看「每盤獨立」這個假設不成立時差多少。
// 看什麼：
//   ①區間覆蓋率：事先指定的一組（開局−殘局、中局−殘局、開局−中局）95% 區間蓋到真值的比例；標準誤的平均 ÷ 估計值真正的標準差（1＝剛好，>1 偏保守）。
//   ②誤報率：三個階段真的一樣時，整個「挑最高最低再比」程序說出 hi（高信心）的比例（目標 ≤ 5%）、說出 hi 或 mid 的比例（目標 ≤ 10%）。
//   ③漏報率：殘局真的比較差時，沒有以 hi 指出殘局的比例；另外列指錯階段的比例。
//   ④畫面上各種說法的比例（沒有同段位基準時）：溫和提問（soft，分 hi／mid）、資料還少（lo）、未看出明顯差異（even）、樣本不夠（none），之前／之後。
//   ⑤整盤重抽（bootstrap，studentized max-|t|）當對照：誤報率和每次要算多久。
// 用法：node tools/sim-phase-pair.js [--reps 4000] [--boot 600] [--quick] [--json 輸出.json] [--stats 另一份 04-stats.js（比較不同寫法用）]
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), STATS = path.join(LAB, "../xiangqi-db/m/04-stats.js");
const argv = process.argv.slice(2), opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d };
const STATS_FILE = opt("--stats", null) ? path.resolve(opt("--stats", null)) : STATS, QUICK = argv.includes("--quick"), REPS = +opt("--reps", QUICK ? 300 : 4000), BREPS = +opt("--boot", QUICK ? 60 : 600), BN = 199, JSON_OUT = opt("--json", null);

/* ---------- 載入 App 的程式 ---------- */
function loadApp(file, calib, rank) {
  const ST = fs.readFileSync(file || STATS, "utf8").replace(/\r\n/g, "\n");
  const sl = (a, b) => { const i = ST.indexOf(a), j = ST.indexOf(b, i + 1); if (i < 0 || j < i) throw new Error("04-stats.js 找不到 " + a); return ST.slice(i, j) };
  const src = sl("const SK={", "\n/* 校正檔（store calib") + "\n" + sl("const MX_RK=", "\n/* 每盤一列") + "\n" + sl("function mxAxisPt(", "\n/* 開發者 11/11「下完一局");
  const mem = { calib: calib || null }, ctx = { console, isFinite, QZ: { S: .55, MID: 7, C: .05 }, store: { get: (k, d) => k in mem ? mem[k] : d, set() { } }, window: {} };
  if (rank) ctx.XQNet = ctx.window.XQNet = { rating: () => ({ rank }) };
  vm.createContext(ctx);
  vm.runInContext(src + ";this.R={SK,mxAxisPt,skillAxes,skillPick,mxPairSe:typeof mxPairSe==='function'?mxPairSe:null,mxTcrit:typeof mxTcrit==='function'?mxTcrit:null,MX_ZC:typeof MX_ZC==='object'?MX_ZC:null}", ctx, { filename: "04-stats(五軸片段)" });
  ctx.R.setCalib = c => { mem.calib = c };
  return ctx.R;
}

/* ---------- 亂數 ---------- */
function mkRnd(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function gauss(rnd) { let u = 0; while (u < 1e-12) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }

/* ---------- 假設的對局 ---------- */
const MIX = { p0: .40, s: [.45, 40], m: [.11, 150], b: [.04, 300, 1200] }, TAU = .6, PH = ["open", "mid", "end"];
function drawLoss(rnd, f) { const u = rnd(), ex = mu => -mu * Math.log(1 - rnd() + 1e-12); return f * (u < MIX.p0 ? ex(6) : u < MIX.p0 + MIX.s[0] ? ex(MIX.s[1]) : u < MIX.p0 + MIX.s[0] + MIX.m[0] ? ex(MIX.m[1]) : MIX.b[1] + rnd() * (MIX.b[2] - MIX.b[1])) }
const acc = l => 100 * Math.exp(-Math.max(0, l) / 200);
/* 這個階段每一步準確度、穩定（沒有失著敗著）的真值：大樣本 */
const TRUE = {};
function truth(delta) { if (TRUE[delta]) return TRUE[delta]; const rnd = mkRnd(4242 + Math.round(delta * 1000)); let s = 0, st = 0; const N = 2e6; for (let i = 0; i < N; i++) { const l = drawLoss(rnd, Math.exp(TAU * gauss(rnd) + delta)); s += acc(l); if (l <= 150) st++ } return TRUE[delta] = { m: s / N, stab: 100 * st / N } }
/* 一位玩家的 G 盤（新到舊）。S：{rho, pEnd, delta:{open,mid,end}, phi} */
function player(rnd, G, S) {
  const rho = S.rho || 0, al = Math.sqrt(1 - rho), be = Math.sqrt((1 + 2 * rho) / 3), phi = S.phi || 0, inn = Math.sqrt(1 - phi * phi), rows = []; let prev = null;
  for (let j = 0; j < G; j++) {
    let z = [gauss(rnd), gauss(rnd), gauss(rnd)]; if (phi && prev) z = z.map((x, i) => phi * prev[i] + inn * x); prev = z;
    const zb = (z[0] + z[1] + z[2]) / 3, e = z.map(x => al * (x - zb) + be * zb * Math.sqrt(3));   /* 三個邊際都是 N(0,1)、兩兩相關 ρ（ρ ≥ −0.5） */
    const short = rnd() < .1, n = { open: 10, mid: short ? 3 + Math.floor(rnd() * 5) : 5 + Math.floor(rnd() * 20), end: !short && rnd() < S.pEnd ? 4 + Math.floor(rnd() * 16) : 0 };
    const pa = {}, A = []; let bad = 0, best = 0, tot = 0;
    PH.forEach((k, i) => { let s = 0; for (let q = 0; q < n[k]; q++) { const l = drawLoss(rnd, Math.exp(TAU * e[i] + (S.delta && S.delta[k] || 0))), a = acc(l); s += a; A.push(Math.round(a)); if (l > 150) bad++; if (l < 30) best++; tot++ } pa[k] = [Math.round(s * 10) / 10, n[k]] });
    rows.push({ t: 1e9 - j, hu: 0, n: tot, bad, best, pa, A });
  }
  return rows;
}

/* ---------- 11/15 以前的 skillPick（照抄，對照用） ---------- */
function oldPick(A) {
  const grp = A.filter(a => a.ok && !a.pct).every(a => a.z != null) && A.some(a => a.z != null), ok = A.filter(a => a.ok && !a.pct && (grp || a.key !== "stab")); if (ok.length < 2) return { none: true, conf: "lo" };
  const val = a => grp ? a.z : a.m, sev = a => grp ? a.zse : a.se, s = ok.slice().sort((a, b) => val(a) - val(b)), lo = s[0], hi = s[s.length - 1], gap = val(hi) - val(lo), se = Math.sqrt(sev(lo) ** 2 + sev(hi) ** 2), th = 2 * se;
  if (!grp && gap >= 1.64 * se) return { soft: lo, hi, th, grp, conf: "soft", lv: gap >= th ? "hi" : "mid" };
  return gap >= th ? { weak: lo, hi, th, grp, conf: "hi" } : gap >= 1.64 * se ? { maybe: lo, hi, th, grp, conf: "mid" } : { even: true, lo, hi, th, grp, conf: th > (grp ? .8 : 8) ? "lo" : "even" };
}
/* 畫面上是哪一種說法；flag＝被指出的那一項、lv＝hi／mid */
function say(p) { const f = p.soft || p.weak || p.maybe || null, lv = p.soft ? p.lv : p.weak ? "hi" : p.maybe ? "mid" : null; return { cat: p.none ? "none" : f ? (p.soft ? "soft-" : "") + lv : p.conf === "even" ? "even" : "lo", flag: f ? f.key : null, lv } }

/* ---------- 整盤重抽（對照）：studentized max-|t|，每次重算全部階段 ---------- */
function bootPick(axes, rnd, B) {
  const ok = axes.filter(a => a.ok && !a.pct && a.key !== "stab" && a.iu); if (ok.length < 2) return null;
  const idx = [...new Set(ok.flatMap(a => a.iu.map(x => x[0])))], G = idx.length, pos = new Map(idx.map((j, i) => [j, i]));
  /* 還原每盤每軸的 W_j、ā_j：iu＝W(ā−m)/N → 重抽時要的是 W 和 W·ā；N＝ΣW 用 n（四捨五入過）不夠準，改由 iu 與 se 反推不到，所以直接帶 _wj（下面 run 裡補上） */
  const W = ok.map(a => { const w = new Float64Array(G), s = new Float64Array(G); for (const [j, wj, sj] of a._w) { w[pos.get(j)] = wj; s[pos.get(j)] = sj } return { w, s } });
  const est = pick => { const m = W.map(({ w, s }) => { let a = 0, b = 0; for (const i of pick) { a += s[i]; b += w[i] } return b ? [a / b, b] : null }); return m };
  const pairSe = (pick, m, x, y) => { let v = 0; for (const i of pick) { const ux = W[x].w[i] ? (W[x].s[i] - m[x][0] * W[x].w[i]) / m[x][1] : 0, uy = W[y].w[i] ? (W[y].s[i] - m[y][0] * W[y].w[i]) / m[y][1] : 0; v += (ux - uy) * (ux - uy) } return Math.sqrt(v) };
  const all = idx.map((_, i) => i), m0 = est(all), pairs = []; for (let x = 0; x < ok.length; x++)for (let y = x + 1; y < ok.length; y++)pairs.push([x, y]);
  const M = [];
  for (let b = 0; b < B; b++) { const pick = Array.from({ length: G }, () => Math.floor(rnd() * G)), m = est(pick); if (m.some(x => !x)) continue; let mx = 0; for (const [x, y] of pairs) { const se = pairSe(pick, m, x, y); if (!(se > 0)) continue; const t = Math.abs(((m[x][0] - m[y][0]) - (m0[x][0] - m0[y][0])) / se); if (t > mx) mx = t } M.push(mx) }
  M.sort((p, q) => p - q); const crit = q => M[Math.min(M.length - 1, Math.floor(q * M.length))];
  let lo = 0, hi = 0; ok.forEach((a, i) => { if (m0[i][0] < m0[lo][0]) lo = i; if (m0[i][0] > m0[hi][0]) hi = i });
  const t = (m0[hi][0] - m0[lo][0]) / pairSe(all, m0, lo, hi); return { flag: ok[lo].key, lv: t >= crit(.95) ? "hi" : t >= crit(.90) ? "mid" : null };
}

/* ---------- 一個情境 ---------- */
const PAIRS = [["open", "end"], ["mid", "end"], ["open", "mid"]], NM = { open: "開局", mid: "中局", end: "殘局", stab: "穩定" };
function run(K, name, S, G, reps, seed, boot) {   /* boot＝前幾位玩家另外做整盤重抽對照（省略＝--boot 的值，0＝不做） */
  const rnd = mkRnd(seed), lam = Math.pow(.5, 1 / K.SK.HL), tv = Object.fromEntries(PH.map(k => [k, truth(S.delta && S.delta[k] || 0).m]));
  const cv = Object.fromEntries(PAIRS.map(p => [p.join("-"), { n: 0, d: 0, d2: 0, cNew: 0, cOld: 0, cRaw: 0, seNew: 0, seOld: 0, seRaw: 0, ne: 0, r: 0, nb: 0 }]));
  const cat = { new: {}, old: {} }, fl = { new: { hi: 0, any: 0, hitHi: 0, hitAny: 0, wrongHi: 0 }, old: { hi: 0, any: 0, hitHi: 0, hitAny: 0, wrongHi: 0 }, boot: { hi: 0, any: 0, hitHi: 0, n: 0 } };
  const target = S.delta && Object.keys(S.delta).find(k => S.delta[k] > 0) || null;
  for (let r = 0; r < reps; r++) {
    const rows = player(rnd, G, S), A = K.skillAxes(rows, null), by = Object.fromEntries(A.filter(a => a.key).map(a => [a.key, a]));
    for (const [a, b] of PAIRS) {
      const x = by[a], y = by[b]; if (!x.ok || !y.ok) continue; const c = cv[a + "-" + b], d = x.m - y.m, t = tv[a] - tv[b], P = K.mxPairSe(x, y, false), seO = Math.sqrt(x.se * x.se + y.se * y.se);
      /* 不含下限、不含小樣本修正的純配對估計（看估計量本身） */
      const D = new Map(); for (const [i, u] of x.iu) D.set(i, [u, 0]); for (const [i, u] of y.iu) { const o = D.get(i); if (o) o[1] = u; else D.set(i, [0, u]) } let v = 0; for (const [p, q] of D.values()) v += (p - q) * (p - q); const seR = Math.sqrt(v);
      c.n++; c.d += d; c.d2 += d * d; c.seNew += P.se; c.seOld += seO; c.seRaw += seR; c.ne += P.ne; c.r += P.r || 0; c.nb += P.nb || 0;
      if (Math.abs(d - t) <= K.mxTcrit(1.96, P.ne - 1) * P.se) c.cNew++; if (Math.abs(d - t) <= 2 * seO) c.cOld++; if (Math.abs(d - t) <= 1.96 * seR) c.cRaw++;
    }
    for (const [w, p] of [["new", K.skillPick(A)], ["old", oldPick(A)]]) {
      const s = say(p); cat[w][s.cat] = (cat[w][s.cat] || 0) + 1; const f = fl[w];
      if (s.lv === "hi") f.hi++; if (s.lv) f.any++; if (target) { if (s.lv === "hi" && s.flag === target) f.hitHi++; if (s.lv && s.flag === target) f.hitAny++; if (s.lv === "hi" && s.flag !== target) f.wrongHi++ }
    }
    if (r < (boot == null ? BREPS : boot)) {
      /* 重抽要每盤每軸的 W_j、W_j·ā_j：照 mxAxisPt 的權重（盤序 j 的 λ^j × 步數）自己算一次 */
      for (const k of PH) { by[k]._w = []; rows.forEach((g, j) => { const x = g.pa[k]; if (x && x[1] > 0) { const w = Math.pow(lam, j); by[k]._w.push([j, w * x[1], w * x[0]]) } }) }
      const b = bootPick(A, rnd, BN); if (b) { fl.boot.n++; if (b.lv === "hi") fl.boot.hi++; if (b.lv) fl.boot.any++; if (target && b.lv === "hi" && b.flag === target) fl.boot.hitHi++ }
    }
  }
  const pct = (a, b) => b ? +(100 * a / b).toFixed(1) : null, out = { name, G, reps, target, truth: tv, pairs: {}, cat: {}, rate: {} };
  for (const [k, c] of Object.entries(cv)) { if (!c.n) continue; const mu = c.d / c.n, sd = Math.sqrt(Math.max(0, c.d2 / c.n - mu * mu)), [a, b] = k.split("-");
    out.pairs[k] = { n: c.n, trueDiff: +(tv[a] - tv[b]).toFixed(2), bias: +(mu - (tv[a] - tv[b])).toFixed(2), sd: +sd.toFixed(2), ne: +(c.ne / c.n).toFixed(1), nb: +(c.nb / c.n).toFixed(1), r: +(c.r / c.n).toFixed(2),
      covNew: pct(c.cNew, c.n), covOld: pct(c.cOld, c.n), covRaw: pct(c.cRaw, c.n), seNew: +(c.seNew / c.n / sd).toFixed(2), seOld: +(c.seOld / c.n / sd).toFixed(2), seRaw: +(c.seRaw / c.n / sd).toFixed(2) } }
  for (const w of ["new", "old"]) { out.cat[w] = Object.fromEntries(["soft-hi", "soft-mid", "lo", "even", "none"].map(k => [k, pct(cat[w][k] || 0, reps)])); const f = fl[w];
    out.rate[w] = { hi: pct(f.hi, reps), any: pct(f.any, reps), ...(target ? { missHi: pct(reps - f.hitHi, reps), missAny: pct(reps - f.hitAny, reps), wrongHi: pct(f.wrongHi, reps) } : {}) } }
  out.rate.boot = fl.boot.n ? { n: fl.boot.n, hi: pct(fl.boot.hi, fl.boot.n), any: pct(fl.boot.any, fl.boot.n), ...(target ? { missHi: pct(fl.boot.n - fl.boot.hitHi, fl.boot.n) } : {}) } : null;
  return out;
}

/* ---------- 有同段位基準（z 尺度、4 軸 6 組）：只看誤報率 ---------- */
function runGrp(name, S, G, reps, seed, nBase) {
  const t0 = truth(0), sdA = 9, sdS = 7;   /* 假設的同段位標準差（軸值在人與人之間的起伏）；玩家的真值正好等於基準平均 → 四軸的 z 真值都是 0 */
  const rnd = mkRnd(seed), c = { new: { hi: 0, any: 0 }, old: { hi: 0, any: 0 } }; let n4 = 0;
  for (let r = 0; r < reps; r++) {
    /* 基準平均數自己有誤差：每次用 nBase 人估出來（平均 ± sd/√n） */
    const B = n => ({ mu: t0.m + sdA * gauss(rnd) / Math.sqrt(n), sd: sdA, n }), ax = { people: nBase, byRank: { 業1: { open: B(nBase), mid: B(nBase), end: B(nBase), stab: { mu: t0.stab + sdS * gauss(rnd) / Math.sqrt(nBase), sd: sdS, n: nBase } } } };
    const K = GRP_K(); K.setCalib({ ax }); const A = K.skillAxes(player(rnd, G, S), null); if (A.filter(a => a.ok && !a.pct).length === 4) n4++;
    for (const [w, p] of [["new", K.skillPick(A)], ["old", oldPick(A)]]) { if (!p.grp) continue; if (p.weak) c[w].hi++; if (p.weak || p.maybe) c[w].any++ }
  }
  const pct = a => +(100 * a / reps).toFixed(1); return { name, G, reps, nBase, four: pct(n4), new: { hi: pct(c.new.hi), any: pct(c.new.any) }, old: { hi: pct(c.old.hi), any: pct(c.old.any) } };
}
let GRP_APP = null; function GRP_K() { return GRP_APP || (GRP_APP = loadApp(STATS_FILE, null, "業1")) }

/* ---------- 主程式 ---------- */
function main() {
  const K = loadApp(STATS_FILE); if (!K.mxPairSe) { console.error("04-stats.js 還沒有 mxPairSe（配對估計還沒接進去）"); process.exit(1) }
  const SC = [
    ["零差異・獨立 ρ=0", { rho: 0, pEnd: .6 }], ["零差異・正共變異 ρ=+0.7", { rho: .7, pEnd: .6 }], ["零差異・負共變異 ρ=−0.4", { rho: -.4, pEnd: .6 }],
    ["零差異・缺階段（殘局只有三成的盤）ρ=+0.7", { rho: .7, pEnd: .3 }], ["零差異・時間相關 φ=0.5、ρ=+0.7", { rho: .7, pEnd: .6, phi: .5 }],
    ["殘局較差 δ=0.35・ρ=+0.7", { rho: .7, pEnd: .6, delta: { end: .35 } }], ["殘局較差 δ=0.7・ρ=+0.7", { rho: .7, pEnd: .6, delta: { end: .7 } }], ["殘局較差 δ=0.7・ρ=0", { rho: 0, pEnd: .6, delta: { end: .7 } }], ["殘局較差 δ=0.7・ρ=−0.4", { rho: -.4, pEnd: .6, delta: { end: .7 } }],
    ["開局本來就容易（開局 δ=−0.5）・ρ=+0.7", { rho: .7, pEnd: .6, delta: { open: -.5 } }]];
  const GS = QUICK ? [10, 40] : [10, 20, 40, 80], res = [], t0 = Date.now(); let seed = 20261115;
  for (const [name, S] of SC) for (const G of GS) res.push(run(K, name, S, G, REPS, seed++));
  const grp = []; for (const G of QUICK ? [20] : [20, 40]) for (const nb of [30, 200]) grp.push(runGrp("有同段位基準・零差異 ρ=+0.7", { rho: .7, pEnd: .6 }, G, Math.min(REPS, QUICK ? 150 : 1500), seed++, nb));
  /* 算一次要多久（手機大約是這台電腦的 5～10 倍慢） */
  const tm = {}; for (const G of [40, 150]) { const rnd = mkRnd(7 + G), rows = player(rnd, G, { rho: .7, pEnd: .6 }), lam = Math.pow(.5, 1 / K.SK.HL); let A; const N = 300; let a = process.hrtime.bigint(); for (let i = 0; i < N; i++) { A = K.skillAxes(rows, null); K.skillPick(A) } const ms1 = Number(process.hrtime.bigint() - a) / 1e6 / N;
    const by = Object.fromEntries(A.filter(x => x.key).map(x => [x.key, x])); for (const k of PH) { by[k]._w = []; rows.forEach((g, j) => { const x = g.pa[k]; if (x && x[1] > 0) { const w = Math.pow(lam, j); by[k]._w.push([j, w * x[1], w * x[0]]) } }) }
    a = process.hrtime.bigint(); for (let i = 0; i < 30; i++)bootPick(A, rnd, BN); const ms2 = Number(process.hrtime.bigint() - a) / 1e6 / 30; tm[G] = { axesPick: +ms1.toFixed(3), boot199: +ms2.toFixed(2) } }

  const L = [], P = s => L.push(s), f = v => v == null ? "—" : String(v);
  P(`# 階段差異配對估計：模擬結果（每格 ${REPS} 位假設的玩家；重抽對照 ${Math.min(REPS, BREPS)} 位 × ${BN} 次）`);
  P(`真值（每步準確度的期望）：三階段相同時 ${truth(0).m.toFixed(2)}；殘局 δ=0.35 → ${truth(.35).m.toFixed(2)}、δ=0.7 → ${truth(.7).m.toFixed(2)}；開局 δ=−0.5 → ${truth(-.5).m.toFixed(2)}`);
  P(""); P("## ① 事先指定一組的 95% 區間覆蓋率（開局−殘局）"); P("| 情境 | 盤數 | 有效盤數 | 兩階段都有的盤 | 估計值相關 r | 估計值的標準差 | 之前：2·√(se²+se²) 覆蓋% | 之後：配對＋t 覆蓋% | 純配對（無修正）覆蓋% | SE÷真正標準差：之前／之後／純配對 |"); P("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of res) { const c = r.pairs["open-end"]; if (c) P(`| ${r.name} | ${r.G} | ${c.ne} | ${c.nb} | ${c.r} | ${c.sd} | ${c.covOld} | ${c.covNew} | ${c.covRaw} | ${c.seOld}／${c.seNew}／${c.seRaw} |`) }
  P(""); P("## ①-2 另外兩組（中局−殘局、開局−中局）的覆蓋率：之前／之後"); P("| 情境 | 盤數 | 中局−殘局 | 開局−中局 |"); P("|---|---|---|---|");
  for (const r of res) { const a = r.pairs["mid-end"], b = r.pairs["open-mid"]; P(`| ${r.name} | ${r.G} | ${a ? a.covOld + "／" + a.covNew : "—"} | ${b ? b.covOld + "／" + b.covNew : "—"} |`) }
  P(""); P("## ② 誤報率（三個階段真的一樣；整個挑選程序）"); P("| 情境 | 盤數 | hi：之前% | hi：之後%（目標 ≤5） | hi：重抽對照% | hi 或 mid：之前% | hi 或 mid：之後%（目標 ≤10） | hi 或 mid：重抽對照% |"); P("|---|---|---|---|---|---|---|---|");
  for (const r of res) if (!r.target && !/開局本來/.test(r.name)) P(`| ${r.name} | ${r.G} | ${r.rate.old.hi} | ${r.rate.new.hi} | ${r.rate.boot ? r.rate.boot.hi : "—"} | ${r.rate.old.any} | ${r.rate.new.any} | ${r.rate.boot ? r.rate.boot.any : "—"} |`);
  P(""); P("## ③ 漏報率（殘局真的比較差；「漏報」＝沒有以 hi 指出殘局）"); P("| 情境 | 真正差距（分） | 盤數 | 漏報 hi：之前% | 漏報 hi：之後% | 漏報 hi：重抽對照% | 連 mid 也沒有：之前／之後% | 以 hi 指錯階段：之前／之後% |"); P("|---|---|---|---|---|---|---|---|");
  for (const r of res) if (r.target === "end") P(`| ${r.name} | ${(r.truth.open - r.truth.end).toFixed(1)} | ${r.G} | ${r.rate.old.missHi} | ${r.rate.new.missHi} | ${r.rate.boot ? r.rate.boot.missHi : "—"} | ${r.rate.old.missAny}／${r.rate.new.missAny} | ${r.rate.old.wrongHi}／${r.rate.new.wrongHi} |`);
  P(""); P("## ④ 畫面上各種說法的比例（沒有同段位基準；之前 → 之後，%）"); P("| 情境 | 盤數 | 溫和提問（原本會是 hi） | 溫和提問（原本會是 mid） | 資料還少 | 未看出明顯差異 | 樣本不夠 |"); P("|---|---|---|---|---|---|---|");
  for (const r of res) P(`| ${r.name} | ${r.G} | ${["soft-hi", "soft-mid", "lo", "even", "none"].map(k => f(r.cat.old[k]) + " → " + f(r.cat.new[k])).join(" | ")} |`);
  P(""); P("## ⑤ 有同段位基準（z 尺度，開局、中局、殘局、穩定四軸 6 組比較；四軸的真值都等於基準）"); P("| 情境 | 盤數 | 基準人數 | 四軸都夠的比例% | 建議先練（hi）：之前% | 之後%（目標 ≤5） | hi 或 mid：之前% | 之後%（目標 ≤10） |"); P("|---|---|---|---|---|---|---|---|");
  for (const g of grp) P(`| ${g.name} | ${g.G} | ${g.nBase} | ${g.four} | ${g.old.hi} | ${g.new.hi} | ${g.old.any} | ${g.new.any} |`);
  P(""); P("## ⑥ 算一次要多久（這台電腦，毫秒）"); P("| 盤數 | skillAxes＋skillPick（修正臨界值） | 整盤重抽 199 次（只算挑選那一段） |"); P("|---|---|---|"); for (const [G, t] of Object.entries(tm)) P(`| ${G} | ${t.axesPick} | ${t.boot199} |`);
  P(""); P(`（共 ${((Date.now() - t0) / 1000).toFixed(0)} 秒；亂數種子固定，重跑數字一樣）`);
  console.log(L.join("\n")); if (JSON_OUT) fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify({ reps: REPS, boot: [BREPS, BN], res, grp, tm }, null, 1));
}
if (require.main === module) main();
module.exports = { loadApp, mkRnd, gauss, player, truth, oldPick, say, run, runGrp, bootPick };
