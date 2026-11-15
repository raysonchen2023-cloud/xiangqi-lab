#!/usr/bin/env node
// 影子模式三個候選分數的離線比較（11/15 ChatGPT 第二次重評第 2 項：「補候選資料字典與離線比較工具；明確區分 base／raw／s0／score、資料缺漏、截斷局」）。
// 四個分數是什麼（完整的資料字典在 xiangqi-db/story/數學模型_預先驗證方案_v1.1.md 附錄 A）：
//   base   未加妙著獎勵、未套上限的聚合品質（波動加權平均、調和平均各半）。小數。
//   raw    ＝round(base＋妙著獎勵)。含獎勵、四捨五入、沒有封頂——不是純準確度，也不保證落在 0～100（base 100、妙著 3 個就是 106）。
//   s0     ＝min(重大錯誤上限, raw)。只看重大錯誤。
//   score  ＝min(重大錯誤上限, 輸棋／不利局面上限, raw)。影子模式的「新總分」。
// 兩種輸入：
//   --local 匯出檔.json   開發者模式賽後報告「💾 匯出本機影子紀錄」存的檔（m/05-settings.js mxShExport；kind:"xq-mxshadow"）。raw／s0／score 都是 App 當時算好的原值；
//                         11/15 以前存的盤沒有 base、總手數、段位（標「未知」）。手機只留最近 200 盤。
//   --cpu cpu-games.jsonl 匿名收的 t:"cpu"（m/05b-save.js cpaDone）。只有 score 和 base（小數 1 位）是送出來的；raw、s0 沒送，這支用邏輯反推：
//       ・不是輸的盤：沒有輸棋上限，s0＝score（確定）。輸的盤：score 比輸棋上限低 → s0＝score（確定）；score 正好等於輸棋上限 → s0＝min(重大錯誤上限, raw)，要重算。
//       ・raw＝round(base＋獎勵)：base 只有小數 1 位，正好落在 x.5 附近時有兩個可能（差 1 分，標「±1」）；score 比所有上限都低時 raw＝score（確定）。
//       ・重大錯誤上限要數「掉 ≥ capDw% 或失著、敗著」的步數和比例：逐步資料 m 最多送 150 步（我方），超過的長局後面的步看不到——
//         獎勵（妙著數）、重大錯誤上限都只能給範圍，標「截斷」，不當成完整的盤。
//       ・base 本身不能從 m 重算：波動權重要用雙方每一手的評估，m 只有我方的步。所以 base 只能用送出來的那個數字。
// 11/15 ChatGPT 第三次重評（story/chatgpt_app/數學模型79修正後_三視角重評_2026-11-15.md 第三節，P1）修的漏洞：原本只篩版本、只看「能不能唯一反推」，
//   重算對不起來的盤（例：score＝999、base＝80）和沒評完的盤（full:0）照樣進了分布。現在把三件事分開（MXC_VER 2）：
//   ①資料有效性（eligibility 的 valid）：分數超出範圍或大小順序不對、重算對不起來、缺欄位 → **資料無效，任何統計都不進**，只列在最後。
//   ②納入條件（eligibility 的 ok；照預先驗證方案 v1.1 第四節，寫在 RULES，沒有命令列參數可以放寬）：我方每一步都評完、總手數 ≥ 20、標準開局；
//     不知道的（本機紀錄沒有存是否標準開局；舊的本機紀錄連有沒有評完、總手數都沒有）當成不符合。不合條件的盤只進「描述」那一段，不進「驗證母體」。
//   ③某一個分數能不能唯一反推（每個分數各自的 how）：跟①②無關。截斷的長局 score、base 是送出來的原值，可以進驗證母體；raw、s0 反推不出唯一值時只留範圍。
//   比較不同候選時一律用「共同有效盤集合」（同一批盤的 base、raw、s0、score 都確定），表頭寫每個候選各自的有效盤數和共同盤數——不同母體的平均差不能當成公式的效果。
//   反推不出唯一值不是隨機缺漏（被封頂、接近分界、較長的盤比較容易）：另外按終局、段位、局長報排除率，並用範圍的上下界算平均的敏感度。
// 只描述、不做檢定：同一個人的很多盤彼此相關，這裡的盤數不是獨立樣本。切換與否照預先驗證方案，不看這支的平均數決定。
// 版本：只比跟現在 MXS.ver 相同的盤（常數不同的版本不混）；其他版本只報盤數。
// 用法：node tools/mx-compare.js [--local 匯出檔.json]… [--cpu cpu-games.jsonl] [--include-test] [--json 輸出.json]
//       都沒給時讀 xiangqi-db/cpu-games.jsonl（有的話）。
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DB = path.basename(path.join(__dirname, "..")) === "xiangqi-db" ? path.join(__dirname, "..") : path.join(__dirname, "..", "..", "xiangqi-db");
const MXC_VER = 2;   /* 這支工具的版本：1＝79（只篩版本）；2＝資料有效性／納入條件／唯一反推三者分開、共同有效盤集合。改了篩選或統計的做法就加 1，並更新 tools/mx-manifest.json */
const CUT = 150;   /* m/05b-save.js：m:X.mv.slice(0,150) */
const RULES = { minPlies: 20, needFull: true, needStd: true };   /* 納入條件：預先驗證方案 v1.1 第四節。要改先改方案（留修訂紀錄） */
const BANDS = [["入門以下", /^(新手|入門)/], ["業1～業5", /^業[1-5]$/], ["業6 以上", /^(業[6-9]|專)/]];
const LENS = [["40 手以下", n => n <= 40], ["41～80 手", n => n <= 80], ["81～120 手", n => n <= 120], ["121 手以上", n => n > 120]];
const ENDS = { w: "贏", l: "輸", d: "和", "?": "未知" };
/* 排除原因（由上到下是「主要原因」的優先順序；前三個＝資料無效） */
const REASONS = [["invalid", "資料無效：分數超出範圍或大小順序不對"], ["incons", "資料無效：重算跟送出的分數對不起來"], ["missing", "資料無效：缺欄位"],
  ["partial", "我方沒有每一步都評完（full:0）"], ["partialU", "不知道有沒有評完（舊的本機紀錄）"], ["short", `總手數不到 ${RULES.minPlies}`], ["shortU", "不知道總手數（舊的本機紀錄）"],
  ["nonstd", "不是標準開局"], ["stdU", "不知道是不是標準開局（本機紀錄沒有存）"]];
const RTXT = Object.fromEntries(REASONS), INVALID = new Set(["invalid", "incons", "missing"]);

/* App 的常數與曲線：直接載入 m/05-settings.js 的 MXS 那一段，不另外抄一份 */
function loadMXS(file) {
  const S = fs.readFileSync(file || path.join(DB, "m", "05-settings.js"), "utf8").replace(/\r\n/g, "\n"), i = S.indexOf("const MXS={"), j = S.indexOf("\nfunction mxAccDw(", i);
  if (i < 0 || j < i) throw new Error("05-settings.js 找不到 MXS");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(S.slice(i, j) + ";this.R={MXS,mxWin,mxCapOf}", ctx, { filename: "05-settings(MXS)" }); return ctx.R;
}
const bandOf = rk => { if (!rk) return "未知"; const b = BANDS.find(b => b[1].test(rk)); return b ? b[0] : "未知" };
const lenOf = n => n == null || !isFinite(n) ? "未知" : LENS.find(l => l[1](n))[0];

/* ---------- 本機匯出檔的一盤 ---------- */
function normLocal(g) {
  const x = g.x || [], G = Array.isArray(g.g) ? g.g : null, ex = v => v == null || !isFinite(+v) ? { how: "na" } : { v: +v, lo: +v, hi: +v, how: "exact" };
  return { src: "local", id: String(g.id), ver: g.v, at: g.at || null, end: x[2] in ENDS ? x[2] : "?", old: g.o ? +g.o[0] : null, base: g.b != null ? { v: +g.b, how: "exact" } : { how: "na" },
    raw: ex(x[0]), s0: ex(x[1]), score: ex(g.n && g.n[0]), plies: G ? +G[0] : null, own: G ? +G[1] : null, full: G ? !!G[2] : null, std: null, kind: G ? G[3] : null, lv: G ? G[4] : null, rank: G ? G[5] : null,
    trunc: false, flags: G ? [] : ["舊紀錄：沒有 base、總手數、段位"] };
}

/* ---------- 匿名 t:"cpu" 的一盤：反推 raw、s0 ---------- */
function deriveCpu(r, K) {
  const { MXS, mxWin, mxCapOf } = K, C = MXS.cap, m = Array.isArray(r.m) ? r.m : [], s = r.s || [], score = +s[0], b = +s[2], res = r.res === "w" || r.res === "l" || r.res === "d" ? r.res : "?";
  const out = { src: "cpu", id: (r.aid || "?") + "/" + (r.g || "?"), aid: r.aid || null, ver: r.mx, at: r.at || null, end: res, old: r.o ? +r.o[0] : null, base: isFinite(b) ? { v: b, how: "exact" } : { how: "na" },
    score: isFinite(score) ? { v: score, lo: score, hi: score, how: "exact" } : { how: "na" }, plies: r.n != null ? +r.n : null, own: m.length, full: !!r.full, std: r.std === 1 ? true : r.std === 0 ? false : null, kind: r.kind || null, lv: r.lv != null ? +r.lv : null, rank: r.crk || null, flags: [] };
  /* 截斷：送出來正好 150 步，而且照總手數我方可能不只 150 步（一方最多走 ceil(n/2) 步） */
  out.trunc = m.length >= CUT && !(r.n != null && Math.ceil(+r.n / 2) <= CUT);
  if (out.trunc) out.flags.push(`截斷：逐步資料只有前 ${CUT} 步（總手數 ${r.n == null ? "?" : r.n}，我方最多 ${r.n == null ? "?" : Math.ceil(+r.n / 2)} 步）`);
  if (!out.full) out.flags.push("我方沒有每一步都評完（full:0），分數只算到評過的步");
  if (r.mx !== MXS.ver) { out.raw = { how: "na" }; out.s0 = { how: "na" }; out.flags.push(`版本 MXS v${r.mx}（現在 v${MXS.ver}），不重算`); return out }
  if (!isFinite(score) || !isFinite(b) || !m.length) { out.raw = { how: "na" }; out.s0 = { how: "na" }; out.flags.push("缺 s 或 m"); return out }
  /* 妙著獎勵（舊評語 q0＝0 是妙著） */
  const nB = m.filter(v => v[6] === 0).length, bon = Math.min(MXS.bonus[1], MXS.bonus[0] * nB), bonHi = out.trunc ? MXS.bonus[1] : bon;
  /* 重大錯誤上限：掉 ≥ capDw% 或失著(4)、敗著(5)；b、p 送出來是整數，dw 離分界太近（< 0.1%）就兩種都算 */
  let bad = 0, badQ = 0, blun = 0; for (const v of m) { const q = v[7], dw = v[2] == null || v[3] == null ? 0 : Math.max(0, mxWin(v[2]) - mxWin(v[3])); if (q === 5) blun++; if (q === 4 || q === 5 || dw >= MXS.capDw + .1) bad++; else if (dw >= MXS.capDw - .1) badQ++ }
  const capOf = (bd, n) => { const br = bd / n; return bd >= C.n[1] || br >= C.r[1] ? mxCapOf(C.g[1]) : bd >= C.n[0] || br >= C.r[0] ? mxCapOf(C.g[0]) : blun ? mxCapOf(C.blun) : 100 };
  let cLo = capOf(bad + badQ, m.length), cHi = capOf(bad, m.length);
  if (badQ) out.flags.push(`${badQ} 步掉分正好在 ${MXS.capDw}% 分界附近（評估四捨五入成整數後分不出來）`);
  if (out.trunc) { cHi = bad >= C.n[1] ? mxCapOf(C.g[1]) : bad >= C.n[0] ? mxCapOf(C.g[0]) : blun ? mxCapOf(C.blun) : 100; cLo = mxCapOf(C.g[1]) }   /* 後面看不到的步只會讓「步數」那條更嚴；「比例」那條可能變鬆也可能變嚴 → 只留步數算出來的當上界、最嚴的那級當下界 */
  /* score＝min(重大錯誤上限, …) ≤ 重大錯誤上限，而上限只有四級（最高 C、B、A、不封頂）：比 score 低的那幾級不可能，下界可以往上收 */
  { const need = Math.min(...[mxCapOf(C.g[1]), mxCapOf(C.g[0]), mxCapOf(C.blun), 100].filter(v => v >= score)); if (need <= cHi) cLo = Math.max(cLo, need) }
  const lost = res === "l", lc = lost ? mxCapOf(MXS.lose[1]) : Infinity;
  /* raw＝round(base＋獎勵)，base 的真值在 [b−0.05, b+0.05) */
  let rLo = Math.round(b - .05 + bon), rHi = Math.round(b + .05 - 1e-9 + bonHi);
  /* 用 score 再收窄：score＝min(重大錯誤上限, 輸棋上限, raw) → raw ≥ score；score 比所有上限的下界都低 → raw＝score */
  if (score < Math.min(cLo, lc)) { if (score < rLo || score > rHi) out.flags.push(`不一致：score ${score} 應該等於 raw，但 base＋獎勵算出來是 ${rLo}～${rHi}`); rLo = rHi = score }
  else { rLo = Math.max(rLo, score); if (rHi < rLo) { out.flags.push(`不一致：score ${score} 比 base＋獎勵（最多 ${rHi}）還高`); rHi = rLo } }
  /* s0＝min(重大錯誤上限, raw) */
  let sLo, sHi; if (!lost || score < lc) sLo = sHi = score; else { sLo = Math.max(score, Math.min(cLo, rLo)); sHi = Math.max(sLo, Math.min(cHi, rHi)) }
  if (!(Math.min(cLo, lc, rLo) <= score && score <= Math.min(cHi, lc, rHi))) out.flags.push(`不一致：score ${score} 不在重算的範圍 ${Math.min(cLo, lc, rLo)}～${Math.min(cHi, lc, rHi)} 裡`);
  const pack = (lo, hi) => lo === hi ? { v: lo, lo, hi, how: "derived" } : { lo, hi, how: !out.trunc && hi - lo === 1 ? "approx" : "bound" };
  out.raw = pack(rLo, rHi); out.s0 = pack(sLo, sHi); out.capE = [cLo, cHi]; out.bonus = [bon, bonHi]; return out;
}

/* ---------- 資格：資料有效性（valid）與納入條件（ok）；跟「某個分數能不能唯一反推」分開 ----------
   回 {valid, ok, reasons:[代碼…], primary:主要原因的代碼或 null}。valid＝false 的盤任何統計都不進；valid 但 ok＝false 的盤只進「描述」。
   有效性：score 是 0～100 的整數；base 0～100；raw 0～(100＋妙著獎勵上限)；s0 0～100；raw ≥ s0 ≥ score（範圍的話用上界比）；不是輸的盤 s0＝score；重算沒有「不一致」。 */
function eligibility(g, K) {
  const R = [], bonMax = K && K.MXS ? K.MXS.bonus[1] : 6, in01 = (f, hi, int) => f.how === "na" || [f.lo != null ? f.lo : f.v, f.hi != null ? f.hi : f.v].every(v => isFinite(v) && v >= 0 && v <= hi && (!int || Number.isInteger(v)));
  if (g.score.how === "na") R.push("missing");
  else {
    let bad = !in01(g.score, 100, 1) || !in01(g.base, 100) || !in01(g.raw, 100 + bonMax, 1) || !in01(g.s0, 100, 1) || (g.old != null && !(g.old >= 0 && g.old <= 100));
    if (!bad && g.raw.how !== "na" && g.raw.hi < g.score.v) bad = true; if (!bad && g.s0.how !== "na" && (g.s0.hi < g.score.v || (g.raw.how !== "na" && g.raw.hi < g.s0.lo))) bad = true;
    if (!bad && g.end !== "l" && g.end !== "?" && g.s0.how !== "na" && g.s0.lo === g.s0.hi && g.s0.lo !== g.score.v) bad = true;
    if (bad) R.push("invalid");
  }
  if (g.flags.some(f => /^不一致/.test(f))) R.push("incons"); if (g.flags.some(f => /^缺 s 或 m/.test(f)) && !R.includes("missing")) R.push("missing");
  if (RULES.needFull) { if (g.full === false) R.push("partial"); else if (g.full == null) R.push("partialU") }
  if (g.plies == null || !isFinite(g.plies)) R.push("shortU"); else if (g.plies < RULES.minPlies) R.push("short");
  if (RULES.needStd) { if (g.std === false) R.push("nonstd"); else if (g.std == null) R.push("stdU") }
  const primary = (REASONS.find(([c]) => R.includes(c)) || [null])[0]; return { valid: !R.some(c => INVALID.has(c)), ok: !R.length, reasons: R, primary };
}

/* ---------- 讀檔 ---------- */
function readLocal(file) { const J = JSON.parse(fs.readFileSync(file, "utf8")); if (!J || J.kind !== "xq-mxshadow" || !Array.isArray(J.games)) throw new Error(file + " 不是影子紀錄匯出檔（kind 要是 xq-mxshadow）"); return { meta: { file, at: J.at, build: J.build, n: J.n, cap: J.cap, ver: J.mxs && J.mxs.ver }, games: J.games.map(normLocal) } }
function readCpu(file, K, includeTest) {
  const seen = new Set(), games = [], st = { lines: 0, bad: 0, test: 0, dup: 0, blind: 0 };
  for (const ln of fs.readFileSync(file, "utf8").split(/\r?\n/)) { if (!ln.trim()) continue; st.lines++; let r; try { r = JSON.parse(ln) } catch (e) { st.bad++; continue }
    if (r.test && !includeTest) { st.test++; continue } const k = r.aid + "/" + r.g; if (seen.has(k)) { st.dup++; continue } seen.add(k); if (r.bl) { st.blind++; continue } games.push(deriveCpu(r, K)) }
  return { meta: { file, ...st }, games };
}

/* ---------- 統計 ---------- */
const qt = (s, p) => { if (!s.length) return null; const h = (s.length - 1) * p, i = Math.floor(h); return s[i] + (h - i) * (s[Math.min(s.length - 1, i + 1)] - s[i]) };
function dist(xs, gr) { const s = xs.filter(x => x != null && isFinite(x)).sort((a, b) => a - b), n = s.length; if (!n) return { n: 0 }; const mu = s.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(s.reduce((a, b) => a + (b - mu) * (b - mu), 0) / n), c = [0, 0, 0, 0, 0];
  if (gr) for (const x of s) { const i = gr.findIndex(g => x >= g); c[i < 0 ? 4 : i]++ }
  return { n, mean: +mu.toFixed(2), sd: +sd.toFixed(2), min: s[0], q10: +qt(s, .1).toFixed(1), q25: +qt(s, .25).toFixed(1), q50: +qt(s, .5).toFixed(1), q75: +qt(s, .75).toFixed(1), q90: +qt(s, .9).toFixed(1), max: s[n - 1], over100: s.filter(x => x > 100).length, ...(gr ? { grade: c.map(v => +(100 * v / n).toFixed(1)) } : {}) } }
const sure = f => f && (f.how === "exact" || f.how === "derived"), FIELDS = ["base", "raw", "s0", "score"], avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
const inCommon = g => g.base.how === "exact" && sure(g.raw) && sure(g.s0) && sure(g.score);
/* 驗證母體的一組（G＝這一組裡合資格的盤）：每個候選各自的有效盤數 own、共同有效盤集合 common；分布與候選之間的差一律只用共同那一批 */
function block(G, gr) {
  const Cm = G.filter(inCommon), df = (a, b) => { const d = Cm.map(g => g[a].v - g[b].v); return { n: Cm.length, mean: avg(d), differ: Cm.length ? +(100 * d.filter(x => x !== 0).length / Cm.length).toFixed(1) : null, max: Cm.length ? Math.max(...d) : null } };
  const od = Cm.filter(g => g.old != null).map(g => g.score.v - g.old), rng = k => { const A = G.filter(g => g[k].how !== "na"); return { n: A.length, lo: avg(A.map(g => g[k].lo != null ? g[k].lo : g[k].v)), hi: avg(A.map(g => g[k].hi != null ? g[k].hi : g[k].v)) } };
  return { n: G.length, people: new Set(G.map(g => g.aid).filter(Boolean)).size || null, own: Object.fromEntries(FIELDS.map(k => [k, G.filter(g => k === "base" ? g.base.how === "exact" : sure(g[k])).length])), common: Cm.length,
    base: dist(Cm.map(g => g.base.v)), raw: dist(Cm.map(g => g.raw.v), gr), s0: dist(Cm.map(g => g.s0.v), gr), score: dist(Cm.map(g => g.score.v), gr), old: dist(Cm.map(g => g.old), [90, 80, 70, 60]),
    rawMinusS0: df("raw", "s0"), s0MinusScore: df("s0", "score"), scoreMinusOld: { n: od.length, mean: avg(od) },
    /* 敏感度：反推不出唯一值的盤不是隨機缺的。把這一組合資格的盤全部算進來，raw、s0 各用範圍的下界、上界算平均——真正的平均在這兩個數之間 */
    sens: { raw: rng("raw"), s0: rng("s0"), score: rng("score"), base: rng("base") } };
}
/* 描述用（所有讀得到、資料有效的盤，含不合納入條件的）：每個分數各算各的、各寫各的盤數，不比較候選 */
function describe(G, gr) { const v = k => G.filter(g => k === "base" ? g.base.how === "exact" : sure(g[k])).map(g => g[k].v); return { n: G.length, base: dist(v("base")), raw: dist(v("raw"), gr), s0: dist(v("s0"), gr), score: dist(v("score"), gr), old: dist(G.map(g => g.old), [90, 80, 70, 60]) } }
function summarize(games, K) {
  const ver = K.MXS.ver, cur = games.filter(g => g.ver === ver), other = {}; for (const g of games) if (g.ver !== ver) other["v" + g.ver] = (other["v" + g.ver] || 0) + 1;
  for (const g of cur) g.elig = eligibility(g, K);
  const valid = cur.filter(g => g.elig.valid), elig = cur.filter(g => g.elig.ok), gr = Array.from(K.MXS.gr), cnt = f => { const c = {}; for (const g of cur) for (const k of f(g)) if (k) c[k] = (c[k] || 0) + 1; return c };
  const keys = { byEnd: [g => ENDS[g.end], Object.values(ENDS)], byRank: [g => bandOf(g.rank), BANDS.map(b => b[0]).concat("未知")], byLen: [g => lenOf(g.plies), LENS.map(l => l[0]).concat("未知")], bySrc: [g => g.src, ["local", "cpu"]] };
  const grp = (A, [key, names], f) => Object.fromEntries(names.map(nm => [nm, A.filter(g => key(g) === nm)]).filter(([, a]) => a.length).map(([nm, a]) => [nm, f(a)]));
  /* 排除率：每一組有幾盤、資料無效幾盤、不合納入條件幾盤、合資格裡 raw 或 s0 反推不出唯一值幾盤 */
  const rate = A => { const e = A.filter(g => g.elig.ok), u = e.filter(g => !sure(g.raw) || !sure(g.s0)), p = (a, b) => b ? +(100 * a / b).toFixed(1) : null; return { n: A.length, invalid: A.filter(g => !g.elig.valid).length, inelig: A.filter(g => g.elig.valid && !g.elig.ok).length, eligible: e.length, eligPct: p(e.length, A.length), unsure: u.length, unsurePct: p(u.length, e.length), common: e.filter(inCommon).length } };
  const how = k => { const c = {}; for (const g of elig) c[g[k].how] = (c[g[k].how] || 0) + 1; return c }, T = cur.filter(g => g.trunc);
  const row = g => ({ id: g.id, src: g.src, end: g.end, plies: g.plies, own: g.own, trunc: g.trunc, score: g.score.v, base: g.base.v, raw: g.raw.how === "na" ? null : [g.raw.lo, g.raw.hi], s0: g.s0.how === "na" ? null : [g.s0.lo, g.s0.hi], reasons: g.elig.reasons, flags: g.flags });
  const any = cnt(g => g.elig.reasons), vAll = block(elig, gr);
  return { toolVer: MXC_VER, ver, gr, rules: { ...RULES }, total: cur.length, otherVer: other, invalid: cur.length - valid.length, readable: valid.length, ineligible: valid.length - elig.length, eligible: elig.length, common: elig.filter(inCommon).length,
    excluded: { primary: cnt(g => [g.elig.primary]), any },
    /* v1 的欄位名（重評的獨立檢查 tmp/math-review-79-20261115/check.cjs 用的）：incons、partial＝有這個原因的盤數；all＝驗證母體的全部（同 verify.all） */
    incons: any.incons || 0, partial: any.partial || 0, all: vAll,
    how: Object.fromEntries(FIELDS.map(k => [k, how(k)])),
    trunc: { n: T.length, eligible: T.filter(g => g.elig.ok).length, rawSure: T.filter(g => g.elig.ok && sure(g.raw)).length, s0Sure: T.filter(g => g.elig.ok && sure(g.s0)).length },
    verify: { all: vAll, byEnd: grp(elig, keys.byEnd, a => block(a, gr)), byRank: grp(elig, keys.byRank, a => block(a, gr)), byLen: grp(elig, keys.byLen, a => block(a, gr)), bySrc: grp(elig, keys.bySrc, a => block(a, gr)) },
    exclRate: { all: rate(cur), byEnd: grp(cur, keys.byEnd, rate), byRank: grp(cur, keys.byRank, rate), byLen: grp(cur, keys.byLen, rate), bySrc: grp(cur, keys.bySrc, rate) },
    describe: { all: describe(valid, gr), bySrc: grp(valid, keys.bySrc, a => describe(a, gr)) },
    bad: cur.filter(g => !g.elig.valid).map(row), unsure: elig.filter(g => !sure(g.raw) || !sure(g.s0) || g.trunc).map(row) };
}

/* ---------- 報表 ---------- */
function report(S, metas) {
  const L = [], P = s => L.push(s), HOW = { exact: "原值", derived: "反推（確定）", approx: "±1", bound: "只有範圍", na: "沒有" }, hw = o => Object.entries(o).map(([k, v]) => `${HOW[k] || k} ${v}`).join("、") || "—", f = v => v == null ? "—" : v;
  const row = (nm, d) => d.n ? `| ${nm} | ${d.n} | ${d.mean} | ${d.sd} | ${d.q10}／${d.q25}／${d.q50}／${d.q75}／${d.q90} | ${d.min}～${d.max} | ${d.grade ? d.grade.join("／") : "—"} |` : `| ${nm} | 0 | — | — | — | — | — |`;
  const HEAD = ["| 分數 | 盤數 | 平均 | 標準差 | 10／25／50／75／90 分位 | 範圍 | S／A／B／C／D % |", "|---|---|---|---|---|---|---|"];
  P(`# 影子模式候選分數離線比較（工具 v${S.toolVer}；MXS v${S.ver}，S／A／B／C 門檻 ${S.gr.join("／")}）`);
  for (const m of metas) P(`- 輸入 ${path.basename(m.file)}：` + (m.lines != null ? `${m.lines} 行，略過 測試 ${m.test}、重複 ${m.dup}、盲棋 ${m.blind}、壞行 ${m.bad}` : `匯出時 ${m.n} 盤（手機最多留 ${m.cap} 盤），匯出檔的 MXS v${m.ver}`));
  P(`- 納入條件（預先驗證方案 v1.1 第四節）：我方每一步都評完、總手數 ≥ ${S.rules.minPlies}、標準開局；不知道的當成不符合。`);
  P(""); P("## 分母核對");
  P(`這個版本 **${S.total}** 盤` + (Object.keys(S.otherVer).length ? `（其他版本沒有混進來：${Object.entries(S.otherVer).map(([k, v]) => k + " " + v + " 盤").join("、")}）` : "") + ` → 資料無效 **${S.invalid}** 盤（任何統計都不進）→ 讀得到 ${S.readable} 盤 → 不合納入條件 **${S.ineligible}** 盤（只進最後的「描述」）→ **驗證母體 ${S.eligible} 盤** → 四個分數都確定的共同有效盤集合 **${S.common}** 盤。`);
  P(""); P("| 排除原因 | 以這個為主要原因的盤數（每盤只算一次） | 有這個原因的盤數（一盤可以有好幾個） |"); P("|---|---|---|");
  for (const [c, t] of REASONS) if (S.excluded.any[c]) P(`| ${t} | ${S.excluded.primary[c] || 0} | ${S.excluded.any[c]} |`);
  P(`| 合計 | ${Object.values(S.excluded.primary).reduce((a, b) => a + b, 0)}（＝${S.total}−${S.eligible}） | — |`);
  P(""); P(`- 驗證母體裡各分數的來源：${FIELDS.map(k => `${k} ${hw(S.how[k])}`).join("｜")}`);
  P(`- 逐步資料被截斷的長局（超過 ${CUT} 步）：${S.trunc.n} 盤，其中合資格 ${S.trunc.eligible} 盤——score、base 是送出來的原值，照樣進驗證母體；raw 反推得出唯一值的 ${S.trunc.rawSure} 盤、s0 ${S.trunc.s0Sure} 盤，其餘只有範圍。`);
  P("- 同一個人的多盤彼此相關，這裡只是描述，不做檢定。");
  if (!S.total) { P(""); P("（沒有這個版本的盤）"); return L.join("\n") }
  const sec = (title, B) => { P(""); P(`## 驗證母體：${title}`); for (const [nm, b] of Object.entries(B)) { P(""); P(`### ${nm}：合資格 ${b.n} 盤${b.people ? `（${b.people} 個匿名碼）` : ""}；各候選有效盤數 base ${b.own.base}｜raw ${b.own.raw}｜s0 ${b.own.s0}｜score ${b.own.score}；**共同有效 ${b.common} 盤（下表每一列都是這 ${b.common} 盤）**`);
    if (!b.common) { P("（沒有四個分數都確定的盤）"); continue }
    P(HEAD[0]); P(HEAD[1]); P(row("base（聚合品質）", b.base)); P(row("raw（含獎勵、未封頂）", b.raw)); P(row("s0（只看重大錯誤上限）", b.s0)); P(row("score（再加輸棋上限）", b.score)); P(row("畫面上的舊總分", b.old));
    P(`- 同一批 ${b.common} 盤：raw−s0 平均 ${f(b.rawMinusS0.mean)}，有差的 ${f(b.rawMinusS0.differ)}%，最大 ${f(b.rawMinusS0.max)}｜s0−score 平均 ${f(b.s0MinusScore.mean)}，有差的 ${f(b.s0MinusScore.differ)}%，最大 ${f(b.s0MinusScore.max)}｜score−舊總分 平均 ${f(b.scoreMinusOld.mean)}（${b.scoreMinusOld.n} 盤）${b.raw.over100 ? `｜raw 超過 100 的 ${b.raw.over100} 盤` : ""}`);
    if (b.n > b.common) P(`- 敏感度（合資格的 ${b.n} 盤全部算進來，反推不出唯一值的用範圍）：raw 的平均在 ${f(b.sens.raw.lo)}～${f(b.sens.raw.hi)}（${b.sens.raw.n} 盤）、s0 在 ${f(b.sens.s0.lo)}～${f(b.sens.s0.hi)}（${b.sens.s0.n} 盤）之間；對照：score 在全部合資格 ${b.sens.score.n} 盤的平均是 ${f(b.sens.score.lo)}（共同那 ${b.common} 盤 ${f(b.score.mean)}）、base ${f(b.sens.base.lo)}（共同那批 ${f(b.base.mean)}）——這個差距是只留共同盤造成的，不是公式的效果`) } };
  sec("全部", { 全部: S.verify.all }); if (Object.keys(S.verify.bySrc).length > 1) sec("按來源", S.verify.bySrc); sec("按終局", S.verify.byEnd); sec("按段位", S.verify.byRank); sec("按局長（總手數）", S.verify.byLen);
  P(""); P("## 排除率（反推不出唯一值不是隨機缺漏：被封頂、接近分界、較長的盤比較容易）");
  P("| 分組 | 這個版本的盤 | 資料無效 | 不合納入條件 | 驗證母體（佔 %） | 其中 raw 或 s0 反推不出唯一值（佔驗證母體 %） | 共同有效 |"); P("|---|---|---|---|---|---|---|");
  const rr = (nm, r) => P(`| ${nm} | ${r.n} | ${r.invalid} | ${r.inelig} | ${r.eligible}（${f(r.eligPct)}%） | ${r.unsure}（${f(r.unsurePct)}%） | ${r.common} |`);
  rr("全部", S.exclRate.all); for (const [k, t] of [["byEnd", "終局"], ["byRank", "段位"], ["byLen", "局長"], ["bySrc", "來源"]]) for (const [nm, r] of Object.entries(S.exclRate[k])) rr(`${t}：${nm}`, r);
  P(""); P(`## 描述：所有讀得到、資料有效的盤（${S.readable} 盤，**含不合納入條件的 ${S.ineligible} 盤；不是驗證母體，不能拿來比較候選**）`);
  for (const [nm, d] of Object.entries({ 全部: S.describe.all, ...(Object.keys(S.describe.bySrc).length > 1 ? S.describe.bySrc : {}) })) { P(""); P(`### ${nm}（${d.n} 盤；每一列的盤數不一樣，各算各的）`); P(HEAD[0]); P(HEAD[1]); P(row("base", d.base)); P(row("raw（只算確定的）", d.raw)); P(row("s0（只算確定的）", d.s0)); P(row("score", d.score)); P(row("畫面上的舊總分", d.old)) }
  const tab = (A, why) => { P("| 盤 | 來源 | 終局 | 總手數／送出的步數 | score | base | raw 範圍 | s0 範圍 | 原因 |"); P("|---|---|---|---|---|---|---|---|---|"); for (const u of A.slice(0, 200)) P(`| ${u.id} | ${u.src} | ${ENDS[u.end]} | ${u.plies == null ? "?" : u.plies}／${u.own == null ? "?" : u.own} | ${f(u.score)} | ${f(u.base)} | ${u.raw ? u.raw.join("～") : "—"} | ${u.s0 ? u.s0.join("～") : "—"} | ${why(u)} |`); if (A.length > 200) P("（只列前 200 盤）") };
  P(""); P(`## 資料無效的盤（${S.bad.length} 盤；任何統計都沒有算進去）`); if (!S.bad.length) P("沒有。"); else tab(S.bad, u => u.reasons.filter(c => INVALID.has(c)).map(c => RTXT[c]).concat(u.flags).join("；"));
  P(""); P(`## 驗證母體裡 raw 或 s0 反推不出唯一值、或逐步資料被截斷的盤（${S.unsure.length} 盤）`); if (!S.unsure.length) P("沒有。"); else tab(S.unsure, u => u.flags.join("；") || "base 小數 1 位，raw 有兩個可能");
  return L.join("\n");
}

function main() {
  const argv = process.argv.slice(2), many = k => argv.map((a, i) => a === k ? argv[i + 1] : null).filter(Boolean), one = k => many(k)[0] || null;
  if (argv.includes("--help") || argv.includes("-h")) { console.log("用法：node tools/mx-compare.js [--local 匯出檔.json]… [--cpu cpu-games.jsonl] [--include-test] [--json 輸出.json]"); return }
  const K = loadMXS(), locals = many("--local"), cpus = many("--cpu"), def = path.join(DB, "cpu-games.jsonl"); if (!locals.length && !cpus.length) { if (fs.existsSync(def)) cpus.push(def); else { console.error("沒有輸入：給 --local 匯出檔.json 或 --cpu cpu-games.jsonl（預設的 " + def + " 不存在）"); process.exit(1) } }
  const games = [], metas = []; for (const f of locals) { const R = readLocal(path.resolve(f)); games.push(...R.games); metas.push(R.meta) } for (const f of cpus) { const R = readCpu(path.resolve(f), K, argv.includes("--include-test")); games.push(...R.games); metas.push(R.meta) }
  const S = summarize(games, K); console.log(report(S, metas)); const out = one("--json"); if (out) fs.writeFileSync(path.resolve(out), JSON.stringify({ metas, summary: S }, null, 1));
}
if (require.main === module) main();
module.exports = { loadMXS, normLocal, deriveCpu, eligibility, readLocal, readCpu, summarize, report, CUT, RULES, REASONS, MXC_VER };
