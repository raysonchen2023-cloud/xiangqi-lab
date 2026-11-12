#!/usr/bin/env node
// 勝率曲線 W(cp)＝1／(1＋e^(−k·cp)) 的 k：用「真人跟電腦下的局面評估 → 這盤最後勝負」擬合，分段位各估一個 k。
// 開發者 11/11 照三方審查改寫（原本在 mathfix/tools/calibrate-wdl.js）：
//   ・資料來源只用 App 匿名送回的 t:"cpu"（collect-anon.js 存的 xiangqi-db/cpu-games.jsonl）。
//   ・刪掉原本的來源 (a)「電腦自對局」——不可用：Pikafish 的分數是照引擎長時間自對局正規化的（src/uci.cpp win_rate_model：+150 分≈96% 期望得分，
//     Lichess 曲線只有 63.5%），用自對局擬合出來的 k 會比 Lichess 更陡，大優勢時幾乎每一步都「不扣分」，分數會再灌水（Claude 複審 §1.2-5、分歧二）。
//   ・孩子在 +900 也常常輸，曲線一定比 Lichess（2300 分棋手）平，所以分段位估：入門以下、業1～業5、業6 以上（三方審查 A-1）。
// 資料：cpu-games.jsonl 一行一盤 {aid, g, hu, res:w/l/d, crk 電腦積分段位, m:[[手數, 階段, 最佳原值, 實際原值, 最佳是否原值, loss, 舊評語, 新評語, 殺棋], …], test, bl, full …}
//   每盤只取最多 4 個局面（我方走完的評估 m[i][3]，走的那一方視角），均勻分散，避免同一盤高度相關把標準誤壓小；|評估| ≥ 2000（含殺棋）不進 k（殺棋分界另外看 mateTable）。
//   排除：test:1、盲棋 bl:1、同一盤重送（aid＋g 去重）。
// 做法：最大化 Σ[res·ln W ＋ (1−res)·ln(1−W)]（期望得分的 Bernoulli 概似，和棋算 0.5），對 ln k 黃金分割搜尋；
//   標準誤：觀測資訊量（假設局面獨立，偏小）＋以「人」為單位的 bootstrap（200 次，這個比較誠實）；校準表＝評估分箱的實際得分 vs 模型。
//   輸出每段的 k 和由 k 算出來的評語門檻 th＝Win%(cp)−50（cp＝30／60／150／400，跟 App m/05-settings.js 的 MXS 一樣算法）——換 App 的 MXS.k 時門檻會自動跟著算，這裡只是讓人先看。
// 大約要多少資料（Claude 複審 §6 的估計）：每段 ≥1000 盤（約 3000～5000 個局面）才穩；不夠時照樣算，但標「資料不夠」。
// 用法：node tools/calibrate-wdl.js [cpu-games.jsonl] [輸出 wdl-fit.json]；--demo 用合成資料示範（三段真實 k＝0.0022／0.0030／0.0038）
"use strict";
const fs = require("fs"), path = require("path");
const DB = path.basename(path.join(__dirname, "..")) === "xiangqi-db" ? path.join(__dirname, "..") : path.join(__dirname, "..", "..", "xiangqi-db");   /* 放 xiangqi-db/tools 或 xiangqi-lab/tools 都找得到 */
const argv = process.argv.slice(2), DEMO = argv.includes("--demo"), pos = argv.filter(a => !a.startsWith("--"));
const FILE = pos[0] ? path.resolve(pos[0]) : path.join(DB, "cpu-games.jsonl"), OUT = pos[1] ? path.resolve(pos[1]) : path.join(DB, "wdl-fit.json");
const LICHESS_K = .00368208, CP = [30, 60, 150, 400], MIN_GAMES = 1000;
const BANDS = [["入門以下", /^(新手|入門)/], ["業1～業5", /^業[1-5]$/], ["業6 以上", /^(業[6-9]|專)/]];
const bandOf = r => { const i = BANDS.findIndex(([, re]) => re.test(String(r || ""))); return i < 0 ? null : i };
const W = (k, cp) => 1 / (1 + Math.exp(-k * cp));
function fit(S) { const ll = k => { let L = 0; for (const [ev, res] of S) { const w = Math.min(1 - 1e-9, Math.max(1e-9, W(k, ev))); L += res * Math.log(w) + (1 - res) * Math.log(1 - w) } return L };
  let lo = Math.log(2e-4), hi = Math.log(5e-2); const g = (Math.sqrt(5) - 1) / 2; let a = hi - g * (hi - lo), b = lo + g * (hi - lo), fa = ll(Math.exp(a)), fb = ll(Math.exp(b));
  for (let i = 0; i < 80; i++) { if (fa > fb) { hi = b; b = a; fb = fa; a = hi - g * (hi - lo); fa = ll(Math.exp(a)) } else { lo = a; a = b; fa = fb; b = lo + g * (hi - lo); fb = ll(Math.exp(b)) } }
  const k = Math.exp((lo + hi) / 2), h = k * 1e-3, d2 = (ll(k + h) - 2 * ll(k) + ll(k - h)) / (h * h), se = d2 < 0 ? Math.sqrt(-1 / d2) : null;
  const bins = [-1500, -800, -400, -200, -100, -50, 0, 50, 100, 200, 400, 800, 1500], table = [];
  for (let i = 0; i < bins.length - 1; i++) { const B = S.filter(([ev]) => ev >= bins[i] && ev < bins[i + 1]); if (B.length < 20) continue; const m = B.reduce((x, [ev]) => x + ev, 0) / B.length, obs = B.reduce((x, [, r]) => x + r, 0) / B.length; table.push({ cp: Math.round(m), n: B.length, obs: +obs.toFixed(3), model: +W(k, m).toFixed(3) }) }
  return { k, se, n: S.length, table } }
/* 以人為單位 bootstrap：同一個人很多盤彼此相關 */
function boot(byP, R) { const P = [...byP.values()], ks = []; for (let r = 0; r < R; r++) { const S = []; for (let i = 0; i < P.length; i++) S.push(...P[Math.floor(Math.random() * P.length)]); if (S.length >= 50) ks.push(fit(S).k) }
  if (ks.length < 10) return null; const m = ks.reduce((a, b) => a + b, 0) / ks.length; return Math.sqrt(ks.reduce((a, b) => a + (b - m) ** 2, 0) / (ks.length - 1)) }
/* 一盤取最多 4 個局面（均勻分散）：[評估（我方視角）, 我方得分, 人] */
function samples(G) { const out = []; for (const x of G) { const sc = x.res === "w" ? 1 : x.res === "d" ? .5 : 0, ok = (x.m || []).filter(a => a[3] != null && Math.abs(a[3]) < 2000);
    if (!ok.length) continue; const n = Math.min(4, ok.length); for (let i = 0; i < n; i++) { const a = ok[Math.floor((i + .5) * ok.length / n)]; out.push([a[3], sc, x.aid]) } } return out }
/* 殺棋分界看資料：走進殺棋（mt＝1）、漏殺（mt＝2）的步，照「走之前／走完」的評估分箱，看這些盤最後的得分（給 MXS.walk／MXS.miss 參考） */
function mateTable(G) { const T = { walk: {}, miss: {} }; for (const x of G) { const sc = x.res === "w" ? 1 : x.res === "d" ? .5 : 0; for (const a of x.m || []) { if (a[8] !== 1 && a[8] !== 2) continue;
    const kind = a[8] === 1 ? "walk" : "miss", v = a[8] === 1 ? a[2] : a[3], bin = v == null ? "?" : kind === "walk" ? (v > -700 ? "> −700" : v > -1000 ? "−1000～−700" : "≤ −1000") : (v <= 700 ? "≤ 700" : v <= 1000 ? "700～1000" : "> 1000");
    const o = T[kind][bin] || (T[kind][bin] = { n: 0, s: 0 }); o.n++; o.s += sc } } return T }
function load() {
  if (DEMO) { const G = [], kt = [.0022, .0030, .0038], rk = [["入門1", "入門3"], ["業2", "業4"], ["業6", "專1-1"]];
    for (let b = 0; b < 3; b++) for (let p = 0; p < 150; p++) { const aid = "demo" + b + "p" + p, R = rk[b][p % 2]; for (let g = 0; g < 10; g++) {
      const ev0 = Math.round((Math.random() - .5) * 1600), w = W(kt[b], ev0), dr = .2 * 4 * w * (1 - w), u = Math.random(), res = u < w - dr / 2 ? "w" : u < w + dr / 2 ? "d" : "l";
      const m = []; for (let i = 0; i < 30; i++) { const v = Math.round(ev0 + (Math.random() - .5) * 200); m.push([2 * i + 1, i < 10 ? 0 : 1, v + 20, v, 1, 20, 1, 1, 0]) }
      G.push({ aid, g: aid + "g" + g, hu: "r", res, crk: R, m }) } }
    console.log("示範：三段各 150 人 × 10 盤，每盤的局面評估圍著同一個值上下跳（真實 k＝0.0022／0.0030／0.0038，均勢和棋約 20%）"); return G }
  if (!fs.existsSync(FILE)) { console.log("還沒有資料：", FILE, "\n（App 跟電腦下完一盤會匿名送 t:\"cpu\"，collect-anon.js 存在這裡；先用 --demo 看輸出長相）"); process.exit(0) }
  const seen = new Set(), G = [];
  for (const l of fs.readFileSync(FILE, "utf8").split(/\r?\n/)) { if (!l) continue; let x; try { x = JSON.parse(l) } catch (e) { continue }
    if (!x || x.test || x.bl || !x.aid || !x.g || !Array.isArray(x.m)) continue; const key = x.aid + "|" + x.g; if (seen.has(key)) continue; seen.add(key); G.push(x) }
  return G }
const G = load(), out = { made: new Date().toISOString().slice(0, 10), lichess: LICHESS_K, cp: CP, bands: [], note: "k 用真人對電腦的對局（t:\"cpu\"）分段位擬合；th＝Win%(cp)−50 是 k 換算的評語門檻。換 App 的 MXS.k 前先看 table 的 obs 跟 model 對不對得上、boot 標準誤夠不夠小，換了要把 MXS.ver 加 1" };
console.log(`讀到 ${G.length} 盤（${new Set(G.map(x => x.aid)).size} 人）`);
for (let b = 0; b < BANDS.length; b++) { const Gb = G.filter(x => bandOf(x.crk) === b), S = samples(Gb), byP = new Map(); for (const s of S) { if (!byP.has(s[2])) byP.set(s[2], []); byP.get(s[2]).push(s) }
  if (S.length < 50) { console.log(`\n【${BANDS[b][0]}】資料太少（${Gb.length} 盤、${S.length} 個局面），不估`); out.bands.push({ band: BANDS[b][0], games: Gb.length, n: S.length, k: null }); continue }
  const F = fit(S), bs = boot(byP, 200), th = CP.map(c => +(100 * W(F.k, c) - 50).toFixed(3));
  const rec = { band: BANDS[b][0], games: Gb.length, people: byP.size, n: F.n, k: +F.k.toFixed(6), se: F.se == null ? null : +F.se.toFixed(6), seBoot: bs == null ? null : +bs.toFixed(6), th, enough: Gb.length >= MIN_GAMES, table: F.table, mate: mateTable(Gb) };
  out.bands.push(rec);
  console.log(`\n【${rec.band}】${rec.games} 盤、${rec.people} 人、${rec.n} 個局面${rec.enough ? "" : `（不到 ${MIN_GAMES} 盤，資料不夠，只能參考）`}`);
  console.log(`  k＝${F.k.toFixed(5)}（觀測資訊 ±${F.se == null ? "?" : F.se.toFixed(5)}；以人 bootstrap ±${bs == null ? "?" : bs.toFixed(5)}；Lichess 0.00368）`);
  console.log(`  評語門檻（均勢時 30／60／150／400 分）＝ ${th.join("／")}%（Lichess k 時 2.758／5.502／13.47／31.35%）`);
  for (const t of F.table) console.log(`  ${String(t.cp).padStart(6)}  n=${String(t.n).padStart(5)}  實際 ${t.obs.toFixed(3)}  模型 ${t.model.toFixed(3)}`);
  for (const kd of ["walk", "miss"]) { const T = rec.mate[kd], ks = Object.keys(T); if (ks.length) console.log(`  ${kd === "walk" ? "送殺（走之前的評估）" : "漏殺（走完的評估）"}：${ks.map(k => `${k} ${T[k].n} 步・這些盤平均得分 ${(T[k].s / T[k].n).toFixed(2)}`).join("；")}`) } }
if (!DEMO) { fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); console.log("\n寫好", OUT) }
module.exports = { fit, samples, bandOf };
