// 小樣本二元任務的統計小工具（開發者 11/12：ChatGPT 版 stat-policy.json ＋ Gemini 版 PDCA 規範的整合，見 xiangqi-db/story/PDCA量化品質工程_Gemini_2026-11-12.md 文末整合註記）
//   輸入 k n target → p̂、Wilson 單側 95% 下界（z=1.644854，正式判定用）、Wilson 雙尾 95% 下界（z=1.959964，參考）、
//   Beta(1,1) 後驗 E[θ]、P(θ≥target)、Var(θ)（只當輔助：Act 階段判斷「加樣本 vs 重新設計」，不當達標判定）。
//   n＝0：只有先驗，一律「僅先驗，不得宣告提升」。工程測試（確定性、同一版重跑結果一樣）不是樣本，不要拿來算。
// 用法：node xiangqi-lab/tools/statcalc.js <k> <n> [target=0.8] [--prior a b]
//   例：node xiangqi-lab/tools/statcalc.js 19 20 0.8
// 也給 xiangqi-db/tools/review_loop/stat.js 與 test-stat-policy.js 引用（module.exports）。
"use strict";
const Z1 = 1.644854, Z2 = 1.959964;

/* Wilson 下界：(p + z²/2n − z√(p(1−p)/n + z²/4n²)) / (1 + z²/n)；n=0 回 null（沒有資料，不是 0） */
function wilsonLower(k, n, z) {
  if (!(n > 0)) return null;
  if (k < 0 || k > n) throw new Error("k 要在 0～n 之間");
  const p = k / n, z2 = z * z;
  return (p + z2 / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z2 / (4 * n * n))) / (1 + z2 / n);
}
const wilsonOne = (k, n) => wilsonLower(k, n, Z1);
const wilsonTwo = (k, n) => wilsonLower(k, n, Z2);

/* ln Γ（Lanczos，g=7、9 項） */
const LG = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
function lgamma(x) {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  x -= 1; let a = LG[0]; const t = x + 7.5;
  for (let i = 1; i < 9; i++) a += LG[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}
/* 不完全 Beta 的連分數（修正 Lentz 法） */
function betacf(a, b, x) {
  const TINY = 1e-300, EPS = 1e-15;
  let c = 1, d = 1 - (a + b) * x / (a + 1); if (Math.abs(d) < TINY) d = TINY; d = 1 / d; let h = d;
  for (let m = 1; m <= 1000; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; h *= d * c;
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < EPS) break;
  }
  return h;
}
/* 正規化不完全 Beta 函數 I_x(a,b) */
function betaInc(x, a, b) {
  if (!(a > 0 && b > 0)) throw new Error("a、b 要 > 0");
  if (x <= 0) return 0; if (x >= 1) return 1;
  const lbt = lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x), bt = Math.exp(lbt);
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
/* Beta-Binomial 後驗（預設先驗 Beta(1,1)）：E[θ]、P(θ≥target)、Var(θ)；n=0 時停在先驗 */
function betaPosterior(k, n, target, a0, b0) {
  a0 = a0 == null ? 1 : a0; b0 = b0 == null ? 1 : b0;
  const a = a0 + k, b = b0 + (n - k), s = a + b;
  return { a, b, mean: a / s, pAbove: target == null ? null : 1 - betaInc(target, a, b), var: a * b / (s * s * (s + 1)), priorOnly: !(n > 0) };
}
/* 一次算齊（CLI 與報告用） */
function calc(k, n, target, a0, b0) {
  target = target == null ? 0.8 : target;
  const po = betaPosterior(k, n, target, a0, b0);
  return { k, n, target, phat: n > 0 ? k / n : null, wilsonOne: wilsonOne(k, n), wilsonTwo: wilsonTwo(k, n), post: po,
    verdict: !(n > 0) ? "僅先驗，不得宣告提升" : null };
}
module.exports = { Z1, Z2, wilsonLower, wilsonOne, wilsonTwo, lgamma, betaInc, betaPosterior, calc };

if (require.main === module) {
  const a = process.argv.slice(2), pi = a.indexOf("--prior");
  const prior = pi >= 0 ? [+a[pi + 1], +a[pi + 2]] : [1, 1], pos = pi >= 0 ? a.slice(0, pi) : a;
  const k = +pos[0], n = +pos[1], t = pos[2] != null ? +pos[2] : 0.8;
  if (!(n >= 0) || !(k >= 0) || k > n) { console.log("用法：node statcalc.js <k> <n> [target=0.8] [--prior a b]"); process.exit(1) }
  const r = calc(k, n, t, prior[0], prior[1]), pc = x => x == null ? "—" : (x * 100).toFixed(1) + "%";
  console.log(`k/n = ${k}/${n}　p̂ = ${pc(r.phat)}　目標 ${pc(t)}`);
  console.log(`Wilson 單側 95% 下界（正式判定用，z=${Z1}）：${pc(r.wilsonOne)}${r.wilsonOne != null ? (r.wilsonOne >= t ? "　≥ 目標" : "　< 目標") : ""}`);
  console.log(`Wilson 雙尾 95% 下界（參考，z=${Z2}）：${pc(r.wilsonTwo)}`);
  console.log(`後驗 Beta(${r.post.a},${r.post.b})（先驗 Beta(${prior[0]},${prior[1]})，只當輔助）：E[θ] = ${pc(r.post.mean)}　P(θ≥${t}) = ${pc(r.post.pAbove)}　Var(θ) = ${r.post.var.toFixed(5)}`);
  if (r.verdict) console.log("判定：" + r.verdict);
  console.log("注意：正式判定只在事先鎖定樣本數的固定批次做一次；每人每個主要任務只算第一次；AI 模擬、同人重試另外報；工程測試不是樣本。");
}
