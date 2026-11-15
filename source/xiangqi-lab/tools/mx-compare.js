#!/usr/bin/env node
// 影子模式三個候選分數的離線比較（11/15 ChatGPT 第二次重評第 2 項：「補候選資料字典與離線比較工具；明確區分 base／raw／s0／score、資料缺漏、截斷局」）。
// 四個分數是什麼（完整的資料字典在 xiangqi-db/story/數學模型_預先驗證方案_v1.md 附錄 A）：
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
//   反推不出唯一值的盤不進分布統計，另外列出來（盤數、原因、範圍）。
// 只描述、不做檢定：同一個人的很多盤彼此相關，這裡的盤數不是獨立樣本。切換與否照預先驗證方案，不看這支的平均數決定。
// 版本：只比跟現在 MXS.ver 相同的盤（常數不同的版本不混）；其他版本只報盤數。
// 用法：node tools/mx-compare.js [--local 匯出檔.json]… [--cpu cpu-games.jsonl] [--include-test] [--json 輸出.json]
//       都沒給時讀 xiangqi-db/cpu-games.jsonl（有的話）。
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DB = path.basename(path.join(__dirname, "..")) === "xiangqi-db" ? path.join(__dirname, "..") : path.join(__dirname, "..", "..", "xiangqi-db");
const CUT = 150;   /* m/05b-save.js：m:X.mv.slice(0,150) */
const BANDS = [["入門以下", /^(新手|入門)/], ["業1～業5", /^業[1-5]$/], ["業6 以上", /^(業[6-9]|專)/]];
const LENS = [["40 手以下", n => n <= 40], ["41～80 手", n => n <= 80], ["81～120 手", n => n <= 120], ["121 手以上", n => n > 120]];
const ENDS = { w: "贏", l: "輸", d: "和", "?": "未知" };

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
    raw: ex(x[0]), s0: ex(x[1]), score: ex(g.n && g.n[0]), plies: G ? +G[0] : null, own: G ? +G[1] : null, full: G ? !!G[2] : null, kind: G ? G[3] : null, lv: G ? G[4] : null, rank: G ? G[5] : null,
    trunc: false, flags: G ? [] : ["舊紀錄：沒有 base、總手數、段位"] };
}

/* ---------- 匿名 t:"cpu" 的一盤：反推 raw、s0 ---------- */
function deriveCpu(r, K) {
  const { MXS, mxWin, mxCapOf } = K, C = MXS.cap, m = Array.isArray(r.m) ? r.m : [], s = r.s || [], score = +s[0], b = +s[2], res = r.res === "w" || r.res === "l" || r.res === "d" ? r.res : "?";
  const out = { src: "cpu", id: (r.aid || "?") + "/" + (r.g || "?"), aid: r.aid || null, ver: r.mx, at: r.at || null, end: res, old: r.o ? +r.o[0] : null, base: isFinite(b) ? { v: b, how: "exact" } : { how: "na" },
    score: isFinite(score) ? { v: score, lo: score, hi: score, how: "exact" } : { how: "na" }, plies: r.n != null ? +r.n : null, own: m.length, full: !!r.full, kind: r.kind || null, lv: r.lv != null ? +r.lv : null, rank: r.crk || null, flags: [] };
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
const sure = f => f && (f.how === "exact" || f.how === "derived");
function block(G, gr) {
  const v = k => G.filter(g => sure(g[k])).map(g => g[k].v), both = (a, b) => G.filter(g => sure(g[a]) && sure(g[b])), df = (a, b) => { const P = both(a, b), d = P.map(g => g[a].v - g[b].v); return { n: P.length, mean: P.length ? +(d.reduce((x, y) => x + y, 0) / P.length).toFixed(2) : null, differ: P.length ? +(100 * d.filter(x => x !== 0).length / P.length).toFixed(1) : null, max: P.length ? Math.max(...d) : null } };
  const od = G.filter(g => g.old != null && sure(g.score)).map(g => g.score.v - g.old);
  return { n: G.length, people: new Set(G.map(g => g.aid).filter(Boolean)).size || null, base: dist(G.filter(g => g.base.how === "exact").map(g => g.base.v)), raw: dist(v("raw"), gr), s0: dist(v("s0"), gr), score: dist(v("score"), gr), old: dist(G.map(g => g.old), [90, 80, 70, 60]),
    rawMinusS0: df("raw", "s0"), s0MinusScore: df("s0", "score"), scoreMinusOld: od.length ? { n: od.length, mean: +(od.reduce((x, y) => x + y, 0) / od.length).toFixed(2) } : { n: 0, mean: null },
    unsure: { raw: G.filter(g => !sure(g.raw)).length, s0: G.filter(g => !sure(g.s0)).length, score: G.filter(g => !sure(g.score)).length, base: G.filter(g => g.base.how !== "exact").length } };
}
function summarize(games, K) {
  const ver = K.MXS.ver, cur = games.filter(g => g.ver === ver), other = {}; for (const g of games) if (g.ver !== ver) other["v" + g.ver] = (other["v" + g.ver] || 0) + 1;
  const grp = (key, names) => Object.fromEntries(names.map(nm => [nm, cur.filter(g => key(g) === nm)]).filter(([, a]) => a.length).map(([nm, a]) => [nm, block(a, K.MXS.gr)]));
  const how = k => { const c = {}; for (const g of cur) c[g[k].how] = (c[g[k].how] || 0) + 1; return c };
  return { ver, gr: Array.from(K.MXS.gr), n: cur.length, otherVer: other, trunc: cur.filter(g => g.trunc).length, partial: cur.filter(g => g.full === false).length, incons: cur.filter(g => g.flags.some(f => /^不一致/.test(f))).length,
    how: { base: how("base"), raw: how("raw"), s0: how("s0"), score: how("score") }, all: block(cur, K.MXS.gr),
    bySrc: grp(g => g.src, ["local", "cpu"]), byEnd: grp(g => ENDS[g.end], Object.values(ENDS)), byRank: grp(g => bandOf(g.rank), BANDS.map(b => b[0]).concat("未知")), byLen: grp(g => lenOf(g.plies), LENS.map(l => l[0]).concat("未知")),
    unsure: cur.filter(g => !sure(g.raw) || !sure(g.s0) || g.trunc || g.flags.some(f => /^不一致/.test(f))).map(g => ({ id: g.id, src: g.src, end: g.end, plies: g.plies, own: g.own, trunc: g.trunc, score: g.score.v, base: g.base.v, raw: g.raw.how === "na" ? null : [g.raw.lo, g.raw.hi], s0: g.s0.how === "na" ? null : [g.s0.lo, g.s0.hi], flags: g.flags })) };
}

/* ---------- 報表 ---------- */
function report(S, metas) {
  const L = [], P = s => L.push(s), HOW = { exact: "原值", derived: "反推（確定）", approx: "±1", bound: "只有範圍", na: "沒有" }, hw = o => Object.entries(o).map(([k, v]) => `${HOW[k] || k} ${v}`).join("、") || "—";
  const row = (nm, d) => d.n ? `| ${nm} | ${d.n} | ${d.mean} | ${d.sd} | ${d.q10}／${d.q25}／${d.q50}／${d.q75}／${d.q90} | ${d.min}～${d.max} | ${d.grade ? d.grade.join("／") : "—"} |` : `| ${nm} | 0 | — | — | — | — | — |`;
  P(`# 影子模式候選分數離線比較（MXS v${S.ver}，S／A／B／C 門檻 ${S.gr.join("／")}）`);
  for (const m of metas) P(`- 輸入 ${path.basename(m.file)}：` + (m.lines != null ? `${m.lines} 行，略過 測試 ${m.test}、重複 ${m.dup}、盲棋 ${m.blind}、壞行 ${m.bad}` : `匯出時 ${m.n} 盤（手機最多留 ${m.cap} 盤），匯出檔的 MXS v${m.ver}`));
  P(`- 這個版本 ${S.n} 盤` + (Object.keys(S.otherVer).length ? `；其他版本（沒有混進來）：${Object.entries(S.otherVer).map(([k, v]) => k + " " + v + " 盤").join("、")}` : ""));
  P(`- 逐步資料被截斷（超過 ${CUT} 步的長局）：${S.trunc} 盤；我方沒有每步都評完：${S.partial} 盤；重算跟送出的分數對不起來：${S.incons} 盤`);
  P(`- 各分數的來源：base ${hw(S.how.base)}｜raw ${hw(S.how.raw)}｜s0 ${hw(S.how.s0)}｜score ${hw(S.how.score)}`);
  P("- 下面的分布只算「原值」和「反推（確定）」的盤；±1、只有範圍、沒有的盤列在最後，不當成完整的盤。同一個人的多盤彼此相關，這裡只是描述。");
  if (!S.n) { P(""); P("（沒有這個版本的盤）"); return L.join("\n") }
  const sec = (title, B) => { P(""); P(`## ${title}`); for (const [nm, b] of Object.entries(B)) { P(""); P(`### ${nm}（${b.n} 盤${b.people ? `、${b.people} 個匿名碼` : ""}；不確定而沒算進去：raw ${b.unsure.raw}、s0 ${b.unsure.s0}；沒有 base ${b.unsure.base}）`);
    P("| 分數 | 盤數 | 平均 | 標準差 | 10／25／50／75／90 分位 | 範圍 | S／A／B／C／D % |"); P("|---|---|---|---|---|---|---|"); P(row("base（聚合品質）", b.base)); P(row("raw（含獎勵、未封頂）", b.raw)); P(row("s0（只看重大錯誤上限）", b.s0)); P(row("score（再加輸棋上限）", b.score)); P(row("畫面上的舊總分", b.old));
    P(`- raw−s0：${b.rawMinusS0.n} 盤，平均 ${b.rawMinusS0.mean}，有差的 ${b.rawMinusS0.differ}%，最大 ${b.rawMinusS0.max}｜s0−score：${b.s0MinusScore.n} 盤，平均 ${b.s0MinusScore.mean}，有差的 ${b.s0MinusScore.differ}%，最大 ${b.s0MinusScore.max}｜score−舊總分：平均 ${b.scoreMinusOld.mean}${b.raw.over100 ? `｜raw 超過 100 的 ${b.raw.over100} 盤` : ""}`) } };
  sec("全部", { 全部: S.all }); if (Object.keys(S.bySrc).length > 1) sec("按來源", S.bySrc); sec("按終局", S.byEnd); sec("按段位", S.byRank); sec("按局長（總手數）", S.byLen);
  P(""); P(`## 無法精確重算或有疑問的盤（${S.unsure.length} 盤）`);
  if (!S.unsure.length) P("沒有。"); else { P("| 盤 | 來源 | 終局 | 總手數／送出的步數 | score | base | raw 範圍 | s0 範圍 | 原因 |"); P("|---|---|---|---|---|---|---|---|---|"); for (const u of S.unsure.slice(0, 200)) P(`| ${u.id} | ${u.src} | ${ENDS[u.end]} | ${u.plies == null ? "?" : u.plies}／${u.own == null ? "?" : u.own} | ${u.score == null ? "—" : u.score} | ${u.base == null ? "—" : u.base} | ${u.raw ? u.raw.join("～") : "—"} | ${u.s0 ? u.s0.join("～") : "—"} | ${u.flags.join("；") || "base 小數 1 位，raw 有兩個可能"} |`); if (S.unsure.length > 200) P(`（只列前 200 盤）`) }
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
module.exports = { loadMXS, normLocal, deriveCpu, readLocal, readCpu, summarize, report, CUT };
