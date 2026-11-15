#!/usr/bin/env node
// 「建議先練」階段差異的配對估計＋選擇效應修正：模擬驗證（SIM_VER 2）。
// 依據：story/chatgpt_app/數學模型77修正後_三視角重評_2026-11-15.md 第四節 3、第五節第 4 項；
//       story/chatgpt_app/數學模型79修正後_三視角重評_2026-11-15.md 第四節 3、4 與第六節（每個比例附 Monte Carlo 區間；固定情境、種子、樣本數；
//       序列相關明列未通過／待驗證；離線比較短滯後 HAC、保留順序的區塊重抽、max-t）。
// 跑的是 App 裡真正的程式：用 vm 載入 xiangqi-db/m/04-stats.js 的 mxAxisPt／skillAxes／mxPairSe／mxTcrit／skillPick（不是另外抄一份）。
// 比的五種判斷（同一位假設的玩家、同一批盤）：
//   之前   11/15 以前的 skillPick：最高、最低的差 ≥ 2·√(se²＋se²)＝hi、≥ 1.64＝mid（照抄成 oldPick）。
//   App    現在 App 用的：配對估計＋Bonferroni＋t（04-stats.js，SK.PICK 2）。
//   HAC    只在這支裡：把配對的變異換成短滯後 HAC——Σd_j²＋2Σ_{l≤L}(1−l/(L+1))Σ d_j·d_{j+l}，d_j＝這盤對兩軸影響量的差、照時間排；L 固定 2（Bartlett 權重）。
//          小樣本修正、下限、Bonferroni＋t 都跟 App 一樣，只換這一項。
//   重抽   只在這支裡：整盤獨立重抽的 studentized max-|t|（每次重算全部階段與挑選，199 次）。只保留盤內相關，不保留盤與盤的順序。
//   區塊   只在這支裡：保留順序的移動區塊重抽 max-|t|——一次抽連續 3 盤（區塊長度固定 3），其餘同上。
//   HAC 的滯後 2、區塊長度 3、重抽 199 次都是事先固定的，沒有照結果挑。
// 假設的資料（不是真人資料，數字只說明「這個估計程序在這種資料下的表現」）：
//   每一步少掉的分數＝四段混合（40% 幾乎最佳、45% 小失誤、11% 中失誤、4% 大失誤；test-mathmodel-1046.js「入門～業1」那組）× 這盤這個階段的狀態 e^(τ·e＋δ)，準確度＝100·e^(−少掉的分數/200)（跟 App 的 SK.acc 同一條）。
//   e＝每盤每階段的狀態（標準常態）；三個階段兩兩相關 ρ：0（獨立）、+0.7（這盤整盤都好或都差）、−0.4（開局用心、殘局就草率）。τ＝0.6。
//   每盤：開局 10 步；中局 5～24 步；殘局有沒有走到的機率 pEnd，4～19 步；一成的盤很短（中局 3～7 步、沒有殘局）。
//   盤數不均：中局 85%、殘局 35% 的盤才有，而且每盤的步數差很多（2～45 步，多數很少、少數很多）。
//   序列相關：狀態在連續的盤之間是 AR(1)，φ＝0.3、0.5、0.7（φ＝0＝每盤獨立）。
//   進步趨勢：越舊的盤越差——三個階段一起，δ 從最新一盤的 0 線性加到最舊一盤的 +0.6（三個階段在每個時間點仍然一樣，所以真正的差距是 0）。
//   有差異：殘局每一步少掉的分數乘 e^δ（δ＝0.35、0.7），真正的差距用 200 萬步的大樣本算（不是把 δ 直接當差距）。
// 每個比例都附 95% Monte Carlo 區間（Wilson）。判定規則事先固定（JUDGE）：
//   誤報 hi 目標 ≤ 5%、hi 或 mid 目標 ≤ 10%：區間整個在目標以內＝通過；整個超過＝未通過；跨過目標＝待驗證（這個樣本數分不出來）。
//   覆蓋率（名目 95%，容許到 94%）：三組事先指定的比較各自判，區間整個 ≥ 94%＝通過；整個 < 94%＝未通過；跨過＝待驗證；取三組裡最差的。
//   序列相關（φ＞0）那幾個情境整組另外給一個結論：只要有一格未通過就是「未通過」，否則是「待驗證」——真人資料的 φ 多大不知道，不會寫成通過。
// 用法：node tools/sim-phase-pair.js [--reps 4000] [--boot 1000] [--quick] [--json 輸出.json] [--stats 另一份 04-stats.js（比較不同寫法用）]
//   情境、種子（SEED0＋情境序號×10＋盤數序號）、樣本數都寫死在下面；--reps／--boot 只是讓測試跑小一點，正式數字用預設值。
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const SIM_VER = 2;   /* 這支模擬的版本：1＝79；2＝比例附區間、固定情境表、HAC／區塊重抽對照、判定規則。改了情境、種子或判定規則就加 1，並更新 tools/mx-manifest.json */
const LAB = path.join(__dirname, ".."), STATS = path.join(LAB, "../xiangqi-db/m/04-stats.js");
const argv = require.main === module ? process.argv.slice(2) : [], opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d };
const STATS_FILE = opt("--stats", null) ? path.resolve(opt("--stats", null)) : STATS, QUICK = argv.includes("--quick"), REPS = +opt("--reps", QUICK ? 300 : 4000), BREPS = +opt("--boot", QUICK ? 60 : 1000), BN = 199, JSON_OUT = opt("--json", null);
const SEED0 = 20261115, HAC_L = 2, BLOCK = 3, GS = [10, 20, 40, 80];
const JUDGE = { hi: 5, any: 10, cov: 94 };
/* 固定的情境表（順序＝情境序號，不要插在中間；要加就加在最後並升 SIM_VER） */
const SCEN = [
  { id: "N0", name: "零差異・獨立 ρ=0", S: { rho: 0, pEnd: .6 } },
  { id: "N+", name: "零差異・正共變異 ρ=+0.7", S: { rho: .7, pEnd: .6 } },
  { id: "N-", name: "零差異・負共變異 ρ=−0.4", S: { rho: -.4, pEnd: .6 } },
  { id: "MISS", name: "零差異・缺階段（殘局只有三成的盤）ρ=+0.7", S: { rho: .7, pEnd: .3 } },
  { id: "UNEV", name: "零差異・盤數不均（中局 85%、殘局 35% 的盤才有，步數 2～45）ρ=+0.7", S: { rho: .7, pEnd: .35, uneven: 1 } },
  { id: "AR3", name: "零差異・序列相關 φ=0.3、ρ=+0.7", S: { rho: .7, pEnd: .6, phi: .3 }, serial: 1 },
  { id: "AR5", name: "零差異・序列相關 φ=0.5、ρ=+0.7", S: { rho: .7, pEnd: .6, phi: .5 }, serial: 1 },
  { id: "AR7", name: "零差異・序列相關 φ=0.7、ρ=+0.7", S: { rho: .7, pEnd: .6, phi: .7 }, serial: 1 },
  { id: "TREND", name: "零差異・進步趨勢（最舊的盤 δ=+0.6，三階段一起）ρ=+0.7", S: { rho: .7, pEnd: .6, trend: .6 } },
  { id: "E35", name: "殘局較差 δ=0.35・ρ=+0.7", S: { rho: .7, pEnd: .6, delta: { end: .35 } } },
  { id: "E70", name: "殘局較差 δ=0.7・ρ=+0.7", S: { rho: .7, pEnd: .6, delta: { end: .7 } } },
  { id: "E70r0", name: "殘局較差 δ=0.7・ρ=0", S: { rho: 0, pEnd: .6, delta: { end: .7 } } },
  { id: "E70r-", name: "殘局較差 δ=0.7・ρ=−0.4", S: { rho: -.4, pEnd: .6, delta: { end: .7 } } },
  { id: "E70AR5", name: "殘局較差 δ=0.7・序列相關 φ=0.5、ρ=+0.7", S: { rho: .7, pEnd: .6, phi: .5, delta: { end: .7 } }, serial: 1 },
  { id: "OPEN", name: "開局本來就容易（開局 δ=−0.5）・ρ=+0.7", S: { rho: .7, pEnd: .6, delta: { open: -.5 } }, confound: 1 }];
const seedOf = (si, gi) => SEED0 + si * 10 + gi;

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

/* ---------- 亂數、區間 ---------- */
function mkRnd(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
function gauss(rnd) { let u = 0; while (u < 1e-12) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()) }
/* 比例的 95% Monte Carlo 區間（Wilson）；回百分比 {p, lo, hi, k, n} */
function wilson(k, n) { if (!n) return null; const z = 1.959964, p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return { p: +(100 * p).toFixed(1), lo: +(100 * Math.max(0, c - h)).toFixed(1), hi: +(100 * Math.min(1, c + h)).toFixed(1), k, n } }
/* 判定：dir "le"＝越小越好（誤報），"ge"＝越大越好（覆蓋率） */
function judge(ci, target, dir) { if (!ci) return "沒有資料"; return dir === "le" ? (ci.hi <= target ? "通過" : ci.lo > target ? "未通過" : "待驗證") : (ci.lo >= target ? "通過" : ci.hi < target ? "未通過" : "待驗證") }
const worst = a => a.includes("未通過") ? "未通過" : a.includes("待驗證") ? "待驗證" : a.includes("沒有資料") ? "沒有資料" : "通過";

/* ---------- 假設的對局 ---------- */
const MIX = { p0: .40, s: [.45, 40], m: [.11, 150], b: [.04, 300, 1200] }, TAU = .6, PH = ["open", "mid", "end"];
function drawLoss(rnd, f) { const u = rnd(), ex = mu => -mu * Math.log(1 - rnd() + 1e-12); return f * (u < MIX.p0 ? ex(6) : u < MIX.p0 + MIX.s[0] ? ex(MIX.s[1]) : u < MIX.p0 + MIX.s[0] + MIX.m[0] ? ex(MIX.m[1]) : MIX.b[1] + rnd() * (MIX.b[2] - MIX.b[1])) }
const acc = l => 100 * Math.exp(-Math.max(0, l) / 200);
/* 這個階段每一步準確度、穩定（沒有失著敗著）的真值：大樣本 */
const TRUE = {};
function truth(delta) { if (TRUE[delta]) return TRUE[delta]; const rnd = mkRnd(4242 + Math.round(delta * 1000)); let s = 0, st = 0; const N = 2e6; for (let i = 0; i < N; i++) { const l = drawLoss(rnd, Math.exp(TAU * gauss(rnd) + delta)); s += acc(l); if (l <= 150) st++ } return TRUE[delta] = { m: s / N, stab: 100 * st / N } }
/* 一位玩家的 G 盤（新到舊）。S：{rho, pEnd, delta:{open,mid,end}, phi, uneven, trend} */
function player(rnd, G, S) {
  const rho = S.rho || 0, al = Math.sqrt(1 - rho), be = Math.sqrt((1 + 2 * rho) / 3), phi = S.phi || 0, inn = Math.sqrt(1 - phi * phi), rows = []; let prev = null;
  const geo = (mu, cap) => Math.min(cap, 2 + Math.floor(-mu * Math.log(1 - rnd() + 1e-12)));
  for (let j = 0; j < G; j++) {
    let z = [gauss(rnd), gauss(rnd), gauss(rnd)]; if (phi && prev) z = z.map((x, i) => phi * prev[i] + inn * x); prev = z;
    const zb = (z[0] + z[1] + z[2]) / 3, e = z.map(x => al * (x - zb) + be * zb * Math.sqrt(3));   /* 三個邊際都是 N(0,1)、兩兩相關 ρ（ρ ≥ −0.5） */
    const short = rnd() < .1, tr = S.trend && G > 1 ? S.trend * j / (G - 1) : 0;
    const n = S.uneven ? { open: 10, mid: rnd() < .85 ? geo(8, 45) : 0, end: !short && rnd() < S.pEnd ? geo(6, 45) : 0 }
      : { open: 10, mid: short ? 3 + Math.floor(rnd() * 5) : 5 + Math.floor(rnd() * 20), end: !short && rnd() < S.pEnd ? 4 + Math.floor(rnd() * 16) : 0 };
    const pa = {}, A = []; let bad = 0, best = 0, tot = 0;
    PH.forEach((k, i) => { let s = 0; for (let q = 0; q < n[k]; q++) { const l = drawLoss(rnd, Math.exp(TAU * e[i] + (S.delta && S.delta[k] || 0) + tr)), a = acc(l); s += a; A.push(Math.round(a)); if (l > 150) bad++; if (l < 30) best++; tot++ } pa[k] = [Math.round(s * 10) / 10, n[k]] });
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

/* ---------- HAC（離線對照）：兩軸差的標準誤，只把變異那一項換成短滯後 HAC，其餘照 App 的 mxPairSe ---------- */
function hacPairSe(K, x, y, G, L) {
  const P = K.mxPairSe(x, y, false); if (!P.pair) return P;
  const d = new Float64Array(G); for (const [i, u] of x.iu) d[i] += u; for (const [i, u] of y.iu) d[i] -= u;
  let v = 0; for (let j = 0; j < G; j++) v += d[j] * d[j]; for (let l = 1; l <= L; l++) { let c = 0; for (let j = 0; j + l < G; j++) c += d[j] * d[j + l]; v += 2 * (1 - l / (L + 1)) * c }
  return { se: Math.sqrt(Math.max(Math.max(0, v) * P.ne / (P.ne - 1), x.sm * x.sm + y.sm * y.sm)), ne: P.ne, pair: true };
}
function hacPick(K, A, G) {
  const ok = A.filter(a => a.ok && !a.pct && a.key !== "stab"); if (ok.length < 2) return { lv: null, flag: null };
  const s = ok.slice().sort((a, b) => a.m - b.m), lo = s[0], hi = s[s.length - 1], P = hacPairSe(K, lo, hi, G, HAC_L), zc = K.MX_ZC[ok.length * (ok.length - 1) / 2], gap = hi.m - lo.m;
  return { flag: lo.key, lv: gap >= K.mxTcrit(zc[0], P.ne - 1) * P.se ? "hi" : gap >= K.mxTcrit(zc[1], P.ne - 1) * P.se ? "mid" : null };
}

/* ---------- 重抽（離線對照）：studentized max-|t|，每次重算全部階段。blk＝1 整盤獨立重抽；blk＞1 保留順序的移動區塊（一次抽連續 blk 盤） ---------- */
function bootPick(axes, rnd, B, G, blk) {
  const ok = axes.filter(a => a.ok && !a.pct && a.key !== "stab" && a._w); if (ok.length < 2) return null;
  const W = ok.map(a => { const w = new Float64Array(G), s = new Float64Array(G); for (const [j, wj, sj] of a._w) { w[j] = wj; s[j] = sj } return { w, s } });
  const est = pick => W.map(({ w, s }) => { let a = 0, b = 0; for (const i of pick) { a += s[i]; b += w[i] } return b ? [a / b, b] : null });
  const pairSe = (pick, m, x, y) => { let v = 0; for (const i of pick) { const ux = W[x].w[i] ? (W[x].s[i] - m[x][0] * W[x].w[i]) / m[x][1] : 0, uy = W[y].w[i] ? (W[y].s[i] - m[y][0] * W[y].w[i]) / m[y][1] : 0; v += (ux - uy) * (ux - uy) } return Math.sqrt(v) };
  const all = Array.from({ length: G }, (_, i) => i), m0 = est(all), pairs = []; for (let x = 0; x < ok.length; x++)for (let y = x + 1; y < ok.length; y++)pairs.push([x, y]);
  const draw = blk > 1 && G > blk ? () => { const p = []; while (p.length < G) { const s0 = Math.floor(rnd() * (G - blk + 1)); for (let q = 0; q < blk && p.length < G; q++)p.push(s0 + q) } return p } : () => Array.from({ length: G }, () => Math.floor(rnd() * G));
  const M = [];
  for (let b = 0; b < B; b++) { const pick = draw(), m = est(pick); if (m.some(x => !x)) continue; let mx = 0; for (const [x, y] of pairs) { const se = pairSe(pick, m, x, y); if (!(se > 0)) continue; const t = Math.abs(((m[x][0] - m[y][0]) - (m0[x][0] - m0[y][0])) / se); if (t > mx) mx = t } M.push(mx) }
  if (M.length < 20) return null; M.sort((p, q) => p - q); const crit = q => M[Math.min(M.length - 1, Math.floor(q * M.length))];
  let lo = 0, hi = 0; ok.forEach((a, i) => { if (m0[i][0] < m0[lo][0]) lo = i; if (m0[i][0] > m0[hi][0]) hi = i });
  const t = (m0[hi][0] - m0[lo][0]) / pairSe(all, m0, lo, hi); return { flag: ok[lo].key, lv: t >= crit(.95) ? "hi" : t >= crit(.90) ? "mid" : null };
}
/* 重抽要每盤每軸的 W_j、W_j·ā_j：照 mxAxisPt 的權重（盤序 j 的 λ^j × 步數）自己算一次 */
function attachW(by, rows, lam) { for (const k of PH) { by[k]._w = []; rows.forEach((g, j) => { const x = g.pa[k]; if (x && x[1] > 0) { const w = Math.pow(lam, j); by[k]._w.push([j, w * x[1], w * x[0]]) } }) } }

/* ---------- 一個情境 ---------- */
const PAIRS = [["open", "end"], ["mid", "end"], ["open", "mid"]], METH = ["new", "old", "hac"], BMETH = ["boot", "block"];
function run(K, name, S, G, reps, seed, boot) {   /* boot＝前幾位玩家另外做兩種重抽對照（省略＝--boot 的值，0＝不做） */
  const rnd = mkRnd(seed), lam = Math.pow(.5, 1 / K.SK.HL), tv = Object.fromEntries(PH.map(k => [k, truth(S.delta && S.delta[k] || 0).m])), nb = boot == null ? BREPS : boot;
  const cv = Object.fromEntries(PAIRS.map(p => [p.join("-"), { n: 0, d: 0, d2: 0, cNew: 0, cOld: 0, cRaw: 0, cHac: 0, seNew: 0, seOld: 0, seRaw: 0, seHac: 0, ne: 0, r: 0, nb: 0, fl: 0 }]));
  const z5 = () => ({ hi: 0, any: 0, hitHi: 0, hitAny: 0, wrongHi: 0, n: 0 }), cat = { new: {}, old: {} }, fl = Object.fromEntries(METH.concat(BMETH).map(m => [m, z5()]));
  const target = S.delta && Object.keys(S.delta).find(k => S.delta[k] > 0) || null, tally = (f, s) => { f.n++; if (s.lv === "hi") f.hi++; if (s.lv) f.any++; if (target) { if (s.lv === "hi" && s.flag === target) f.hitHi++; if (s.lv && s.flag === target) f.hitAny++; if (s.lv === "hi" && s.flag !== target) f.wrongHi++ } };
  for (let r = 0; r < reps; r++) {
    const rows = player(rnd, G, S), A = K.skillAxes(rows, null), by = Object.fromEntries(A.filter(a => a.key).map(a => [a.key, a]));
    for (const [a, b] of PAIRS) {
      const x = by[a], y = by[b]; if (!x.ok || !y.ok) continue; const c = cv[a + "-" + b], d = x.m - y.m, t = tv[a] - tv[b], P = K.mxPairSe(x, y, false), H = hacPairSe(K, x, y, G, HAC_L), seO = Math.sqrt(x.se * x.se + y.se * y.se);
      /* 不含下限、不含小樣本修正的純配對估計（看估計量本身）；fl＝下限（模型值）有沒有蓋過配對估計 */
      const D = new Map(); for (const [i, u] of x.iu) D.set(i, [u, 0]); for (const [i, u] of y.iu) { const o = D.get(i); if (o) o[1] = u; else D.set(i, [0, u]) } let v = 0; for (const [p, q] of D.values()) v += (p - q) * (p - q); const seR = Math.sqrt(v);
      c.n++; c.d += d; c.d2 += d * d; c.seNew += P.se; c.seOld += seO; c.seRaw += seR; c.seHac += H.se; c.ne += P.ne; c.r += P.r || 0; c.nb += P.nb || 0; if (P.pair && v * P.ne / (P.ne - 1) < x.sm * x.sm + y.sm * y.sm) c.fl++;
      const tc = K.mxTcrit(1.96, P.ne - 1); if (Math.abs(d - t) <= tc * P.se) c.cNew++; if (Math.abs(d - t) <= 2 * seO) c.cOld++; if (Math.abs(d - t) <= 1.96 * seR) c.cRaw++; if (Math.abs(d - t) <= tc * H.se) c.cHac++;
    }
    const sn = say(K.skillPick(A)), so = say(oldPick(A)); cat.new[sn.cat] = (cat.new[sn.cat] || 0) + 1; cat.old[so.cat] = (cat.old[so.cat] || 0) + 1;
    tally(fl.new, sn); tally(fl.old, so); tally(fl.hac, hacPick(K, A, G));
    if (r < nb) { attachW(by, rows, lam); for (const [m, blk] of [["boot", 1], ["block", BLOCK]]) { const b = bootPick(A, rnd, BN, G, blk); tally(fl[m], b || { lv: null, flag: null }) } }
  }
  const out = { name, G, reps, seed, target, truth: tv, pairs: {}, cat: {}, rate: {}, ci: {} };
  for (const [k, c] of Object.entries(cv)) { if (!c.n) continue; const mu = c.d / c.n, sd = Math.sqrt(Math.max(0, c.d2 / c.n - mu * mu)), [a, b] = k.split("-"), W = x => wilson(x, c.n);
    out.pairs[k] = { n: c.n, trueDiff: +(tv[a] - tv[b]).toFixed(2), bias: +(mu - (tv[a] - tv[b])).toFixed(2), sd: +sd.toFixed(2), ne: +(c.ne / c.n).toFixed(1), nb: +(c.nb / c.n).toFixed(1), r: +(c.r / c.n).toFixed(2), floorPct: +(100 * c.fl / c.n).toFixed(1),
      covNew: W(c.cNew).p, covOld: W(c.cOld).p, covRaw: W(c.cRaw).p, covHac: W(c.cHac).p, covNewCi: W(c.cNew), covOldCi: W(c.cOld), covHacCi: W(c.cHac), seNew: +(c.seNew / c.n / sd).toFixed(2), seOld: +(c.seOld / c.n / sd).toFixed(2), seRaw: +(c.seRaw / c.n / sd).toFixed(2), seHac: +(c.seHac / c.n / sd).toFixed(2) } }
  for (const w of ["new", "old"]) out.cat[w] = Object.fromEntries(["soft-hi", "soft-mid", "lo", "even", "none"].map(k => [k, wilson(cat[w][k] || 0, reps).p]));
  for (const m of METH.concat(BMETH)) { const f = fl[m]; if (!f.n) { out.rate[m] = null; out.ci[m] = null; continue }
    const C = { hi: wilson(f.hi, f.n), any: wilson(f.any, f.n), ...(target ? { missHi: wilson(f.n - f.hitHi, f.n), missAny: wilson(f.n - f.hitAny, f.n), wrongHi: wilson(f.wrongHi, f.n) } : {}) };
    out.ci[m] = C; out.rate[m] = { n: f.n, ...Object.fromEntries(Object.entries(C).map(([k, v]) => [k, v.p])) } }
  /* 判定（只判 App 現在用的那一種；有真正差異的情境不判誤報） */
  const covS = Object.values(out.pairs).map(p => judge(p.covNewCi, JUDGE.cov, "ge"));
  out.verdict = { hi: target ? null : judge(out.ci.new.hi, JUDGE.hi, "le"), any: target ? null : judge(out.ci.new.any, JUDGE.any, "le"), cov: worst(covS) };
  return out;
}

/* ---------- 有同段位基準（z 尺度、4 軸 6 組）：只看誤報率 ---------- */
let GRP_APP = null; function GRP_K() { return GRP_APP || (GRP_APP = loadApp(STATS_FILE, null, "業1")) }
function runGrp(name, S, G, reps, seed, nBase) {
  const t0 = truth(0), sdA = 9, sdS = 7;   /* 假設的同段位標準差（軸值在人與人之間的起伏）；玩家的真值正好等於基準平均 → 四軸的 z 真值都是 0 */
  const rnd = mkRnd(seed), c = { new: { hi: 0, any: 0 }, old: { hi: 0, any: 0 } }; let n4 = 0;
  for (let r = 0; r < reps; r++) {
    /* 基準平均數自己有誤差：每次用 nBase 人估出來（平均 ± sd/√n；四軸各自獨立抽——真的基準四軸來自同一批人，可能相關，這裡沒有模擬） */
    const B = n => ({ mu: t0.m + sdA * gauss(rnd) / Math.sqrt(n), sd: sdA, n }), ax = { people: nBase, byRank: { 業1: { open: B(nBase), mid: B(nBase), end: B(nBase), stab: { mu: t0.stab + sdS * gauss(rnd) / Math.sqrt(nBase), sd: sdS, n: nBase } } } };
    const K = GRP_K(); K.setCalib({ ax }); const A = K.skillAxes(player(rnd, G, S), null); if (A.filter(a => a.ok && !a.pct).length === 4) n4++;
    for (const [w, p] of [["new", K.skillPick(A)], ["old", oldPick(A)]]) { if (!p.grp) continue; if (p.weak) c[w].hi++; if (p.weak || p.maybe) c[w].any++ }
  }
  return { name, G, reps, seed, nBase, four: wilson(n4, reps).p, new: { hi: wilson(c.new.hi, reps), any: wilson(c.new.any, reps) }, old: { hi: wilson(c.old.hi, reps), any: wilson(c.old.any, reps) } };
}

/* ---------- 主程式 ---------- */
const fc = c => c ? `${c.p}（${c.lo}～${c.hi}）` : "—";
function main() {
  const K = loadApp(STATS_FILE); if (!K.mxPairSe) { console.error("04-stats.js 還沒有 mxPairSe（配對估計還沒接進去）"); process.exit(1) }
  const gs = QUICK ? [10, 40] : GS, res = [], t0 = Date.now();
  SCEN.forEach((sc, si) => gs.forEach(G => { const r = run(K, sc.name, sc.S, G, REPS, seedOf(si, GS.indexOf(G))); r.id = sc.id; r.serial = !!sc.serial; r.confound = !!sc.confound; res.push(r) }));
  const grp = []; let gseed = SEED0 + 900; for (const G of QUICK ? [20] : [20, 40]) for (const nb of [30, 200]) grp.push(runGrp("有同段位基準・零差異 ρ=+0.7", { rho: .7, pEnd: .6 }, G, Math.min(REPS, QUICK ? 150 : 2000), gseed++, nb));
  /* 算一次要多久（手機大約是這台電腦的 5～10 倍慢） */
  const tm = {}; for (const G of [40, 150]) { const rnd = mkRnd(7 + G), rows = player(rnd, G, { rho: .7, pEnd: .6 }), lam = Math.pow(.5, 1 / K.SK.HL); let A; const N = 300, clock = (n, f) => { const a = process.hrtime.bigint(); for (let i = 0; i < n; i++)f(); return Number(process.hrtime.bigint() - a) / 1e6 / n };
    const ms1 = clock(N, () => { A = K.skillAxes(rows, null); K.skillPick(A) }), by = Object.fromEntries(A.filter(x => x.key).map(x => [x.key, x])); attachW(by, rows, lam);
    tm[G] = { axesPick: +ms1.toFixed(3), hac: +clock(N, () => hacPick(K, A, G)).toFixed(3), boot199: +clock(30, () => bootPick(A, rnd, BN, G, 1)).toFixed(2), block199: +clock(30, () => bootPick(A, rnd, BN, G, BLOCK)).toFixed(2) } }
  const nulls = res.filter(r => !r.target && !r.confound), ser = nulls.filter(r => r.serial), serV = worst(ser.flatMap(r => [r.verdict.hi, r.verdict.any, r.verdict.cov])) === "未通過" ? "未通過" : "待驗證";

  const L = [], P = s => L.push(s), f = v => v == null ? "—" : String(v);
  P(`# 階段差異配對估計：模擬結果（SIM_VER ${SIM_VER}；App 的建議程序 SK.PICK ${K.SK.PICK == null ? "?" : K.SK.PICK}）`);
  P(`每格 ${REPS} 位假設的玩家；兩種重抽對照各 ${Math.min(REPS, BREPS)} 位 × ${BN} 次；HAC 滯後 ${HAC_L}、區塊長度 ${BLOCK}。括號是 95% Monte Carlo 區間（Wilson）。`);
  P(`種子＝${SEED0}＋情境序號×10＋盤數序號（盤數 ${GS.join("／")}＝0～3）；重跑數字一樣。`);
  P(`真值（每步準確度的期望）：三階段相同時 ${truth(0).m.toFixed(2)}；殘局 δ=0.35 → ${truth(.35).m.toFixed(2)}、δ=0.7 → ${truth(.7).m.toFixed(2)}；開局 δ=−0.5 → ${truth(-.5).m.toFixed(2)}`);
  P(`判定規則（事先固定）：誤報 hi 目標 ≤${JUDGE.hi}%、hi 或 mid ≤${JUDGE.any}%、覆蓋率 ≥${JUDGE.cov}%；區間整個在目標以內＝通過、整個在外＝未通過、跨過＝待驗證。`);
  P(""); P("## ⓪ 判定總表（App 現在用的：配對＋Bonferroni＋t）");
  P(`**序列相關（φ＞0）整組：${serV}。** 下表每一格照規則判；真人資料的 φ 多大不知道，這一組不會寫成通過。`);
  P(""); P("| 序號 | 情境 | 盤數 | 種子 | 說出 hi %（目標 ≤5） | 判定 | hi 或 mid %（目標 ≤10） | 判定 | 三組區間覆蓋率最低的一組 %（目標 ≥94） | 判定 |"); P("|---|---|---|---|---|---|---|---|---|---|");
  const sev = s => ["通過", "沒有資料", "待驗證", "未通過"].indexOf(s);   /* 表裡列的是決定判定的那一組：判定最差的；一樣差就列區間下界最低的 */
  for (const r of nulls) { const pk = Object.entries(r.pairs).sort((a, b) => sev(judge(b[1].covNewCi, JUDGE.cov, "ge")) - sev(judge(a[1].covNewCi, JUDGE.cov, "ge")) || a[1].covNewCi.lo - b[1].covNewCi.lo)[0]; P(`| ${r.id} | ${r.name} | ${r.G} | ${r.seed} | ${fc(r.ci.new.hi)} | ${r.verdict.hi} | ${fc(r.ci.new.any)} | ${r.verdict.any} | ${pk ? pk[0] + " " + fc(pk[1].covNewCi) : "—"} | ${r.verdict.cov} |`) }
  P(""); P("## ① 事先指定一組的 95% 區間覆蓋率（開局−殘局）"); P("| 情境 | 盤數 | 有效盤數 | 兩階段都有的盤 | 估計值相關 r | 下限蓋過配對估計的比例 % | 之前 | App（配對＋t） | HAC（滯後 2） | 純配對（無修正） | SE÷真正標準差：之前／App／HAC／純配對 |"); P("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of res) { const c = r.pairs["open-end"]; if (c) P(`| ${r.name} | ${r.G} | ${c.ne} | ${c.nb} | ${c.r} | ${c.floorPct} | ${fc(c.covOldCi)} | ${fc(c.covNewCi)} | ${fc(c.covHacCi)} | ${c.covRaw} | ${c.seOld}／${c.seNew}／${c.seHac}／${c.seRaw} |`) }
  P(""); P("## ①-2 另外兩組的覆蓋率：之前／App／HAC"); P("| 情境 | 盤數 | 中局−殘局 | 開局−中局 |"); P("|---|---|---|---|");
  for (const r of res) { const g = p => p ? `${p.covOld}／${fc(p.covNewCi)}／${fc(p.covHacCi)}` : "—"; P(`| ${r.name} | ${r.G} | ${g(r.pairs["mid-end"])} | ${g(r.pairs["open-mid"])} |`) }
  P(""); P("## ② 誤報率：三個階段真的一樣，整個挑選程序說出 hi 的比例 %（目標 ≤5）"); P("| 情境 | 盤數 | 之前 | App | HAC | 整盤重抽 | 區塊重抽 |"); P("|---|---|---|---|---|---|---|");
  for (const r of nulls) P(`| ${r.name} | ${r.G} | ${fc(r.ci.old.hi)} | ${fc(r.ci.new.hi)} | ${fc(r.ci.hac.hi)} | ${fc(r.ci.boot && r.ci.boot.hi)} | ${fc(r.ci.block && r.ci.block.hi)} |`);
  P(""); P("## ②-2 誤報率：說出 hi 或 mid 的比例 %（目標 ≤10）"); P("| 情境 | 盤數 | 之前 | App | HAC | 整盤重抽 | 區塊重抽 |"); P("|---|---|---|---|---|---|---|");
  for (const r of nulls) P(`| ${r.name} | ${r.G} | ${fc(r.ci.old.any)} | ${fc(r.ci.new.any)} | ${fc(r.ci.hac.any)} | ${fc(r.ci.boot && r.ci.boot.any)} | ${fc(r.ci.block && r.ci.block.any)} |`);
  P(""); P("## ③ 漏報率：殘局真的比較差，沒有以 hi 指出殘局的比例 %"); P("| 情境 | 真正差距（分） | 盤數 | 之前 | App | HAC | 整盤重抽 | 區塊重抽 | 連 mid 也沒有：之前／App | 以 hi 指錯階段：之前／App |"); P("|---|---|---|---|---|---|---|---|---|---|");
  for (const r of res) if (r.target === "end") P(`| ${r.name} | ${(r.truth.open - r.truth.end).toFixed(1)} | ${r.G} | ${fc(r.ci.old.missHi)} | ${fc(r.ci.new.missHi)} | ${fc(r.ci.hac.missHi)} | ${fc(r.ci.boot && r.ci.boot.missHi)} | ${fc(r.ci.block && r.ci.block.missHi)} | ${r.rate.old.missAny}／${r.rate.new.missAny} | ${r.rate.old.wrongHi}／${r.rate.new.wrongHi} |`);
  P(""); P("## ④ 畫面上各種說法的比例（沒有同段位基準；之前 → App，%；每格的 Monte Carlo 區間半寬 ≤ 1.6 個百分點）"); P("| 情境 | 盤數 | 溫和提問（原本會是 hi） | 溫和提問（原本會是 mid） | 資料還少 | 未看出明顯差異 | 樣本不夠 |"); P("|---|---|---|---|---|---|---|");
  for (const r of res) P(`| ${r.name} | ${r.G} | ${["soft-hi", "soft-mid", "lo", "even", "none"].map(k => f(r.cat.old[k]) + " → " + f(r.cat.new[k])).join(" | ")} |`);
  P(""); P("## ⑤ 有同段位基準（z 尺度，開局、中局、殘局、穩定四軸 6 組比較；四軸的真值都等於基準）"); P("| 情境 | 盤數 | 基準人數 | 種子 | 四軸都夠的比例 % | 建議先練（hi）：之前 | App（目標 ≤5） | hi 或 mid：之前 | App（目標 ≤10） |"); P("|---|---|---|---|---|---|---|---|---|");
  for (const g of grp) P(`| ${g.name} | ${g.G} | ${g.nBase} | ${g.seed} | ${g.four} | ${fc(g.old.hi)} | ${fc(g.new.hi)} | ${fc(g.old.any)} | ${fc(g.new.any)} |`);
  P(""); P("## ⑥ 算一次要多久（這台電腦，毫秒）"); P("| 盤數 | skillAxes＋skillPick（App） | 另外加 HAC 的挑選 | 另外加整盤重抽 199 次 | 另外加區塊重抽 199 次 |"); P("|---|---|---|---|---|"); for (const [G, t] of Object.entries(tm)) P(`| ${G} | ${t.axesPick} | ${t.hac} | ${t.boot199} | ${t.block199} |`);
  P(""); P(`（共 ${((Date.now() - t0) / 1000).toFixed(0)} 秒）`);
  console.log(L.join("\n")); if (JSON_OUT) fs.writeFileSync(path.resolve(JSON_OUT), JSON.stringify({ simVer: SIM_VER, reps: REPS, boot: [BREPS, BN], hacLag: HAC_L, block: BLOCK, seed0: SEED0, judge: JUDGE, serialVerdict: serV, res, grp, tm }, null, 1));
}
if (require.main === module) main();
module.exports = { SIM_VER, SCEN, GS, JUDGE, SEED0, HAC_L, BLOCK, seedOf, loadApp, mkRnd, gauss, wilson, judge, worst, player, truth, oldPick, say, run, runGrp, bootPick, hacPairSe, hacPick, attachW };
