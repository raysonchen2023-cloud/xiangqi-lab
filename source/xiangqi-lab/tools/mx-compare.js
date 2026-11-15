#!/usr/bin/env node
// 影子模式候選分數的離線比較（11/15 ChatGPT 第二次重評第 2 項；之後每一輪重評再補）。工具版本 MXC_VER 4。
// 四個分數是什麼（完整的資料字典在 xiangqi-db/story/數學模型_預先驗證方案_v1.3.md 附錄 A）：
//   base   未加妙著獎勵、未套上限的聚合品質（波動加權平均、調和平均各半）。小數。
//   raw    ＝round(base＋妙著獎勵)。含獎勵、四捨五入、沒有封頂——不是純準確度，也不保證落在 0～100（base 100、妙著 3 個就是 106）。
//   s0     ＝min(重大錯誤上限, raw)。只看重大錯誤。
//   score  ＝min(重大錯誤上限, 輸棋／不利局面上限, raw)。影子模式的「新總分」。
// 另外三個對照算法（MXS v4 起；定義與出處在 story/數學模型_外部公式參考.md 第五節）：acpl 每步平均失分、mm 首選一致率、er 失誤率。
// 兩種輸入：
//   --local 匯出檔.json   開發者模式賽後報告「💾 匯出本機影子紀錄」存的檔（m/05-settings.js mxShExport；kind:"xq-mxshadow"）。分數都是 App 當時算好的原值。
//                         手機只留最近 200 盤。11/15 以前存的盤缺 base、總手數、段位；g 只有 6 格的盤不知道是不是標準開局、有沒有用提示悔棋。
//   --cpu cpu-games.jsonl 匿名收的 t:"cpu"（m/05b-save.js cpaDone）。只有 score 和 base（小數 1 位）是送出來的；raw、s0 沒送，這支用邏輯反推：
//       ・不是輸的盤：沒有輸棋上限，s0＝score（確定）。輸的盤：score 比輸棋上限低 → s0＝score（確定）；score 正好等於輸棋上限 → s0＝min(重大錯誤上限, raw)，要重算。
//       ・raw＝round(base＋獎勵)：base 只有小數 1 位，正好落在 x.5 附近時有兩個可能（差 1 分，標「±1」）；score 比所有上限都低時 raw＝score（確定）。
//       ・重大錯誤上限要數「掉 ≥ capDw% 或失著、敗著」的步數和比例：逐步資料 m 最多送 150 步（我方），超過的長局後面的步看不到——只能給範圍，標「截斷」。
//       ・base 本身不能從 m 重算（波動權重要用雙方每一手的評估，m 只有我方的步）。acpl、er 可以從 m 重算（沒截斷的盤）；mm 匿名資料沒有（沒送引擎首選）。
// 讀入的順序（每一步都在前一步通過之後才做）：
//   ⓪原始格式（schemaCpu／schemaLocal，MXC_VER 3；11/15 ChatGPT 第四次重評第三節第 1 題）：**先檢查原始 JSON 的型別，再轉成內部物件**，不靠 +x、!!x 這種轉型。
//     ・分數、評估一律要是 JSON 數字（typeof "number" 而且有限）。**數字字串（"80"）一律不收**：App 送出來、存下來的都是 JSON 數字，出現字串代表來源或轉檔有問題。null 不是 0。
//     ・full、std 只收 0 或 1；總手數、提示、悔棋次數是非負整數；res 只收 "w"／"l"／"d"；m 的每一步是 9 格的陣列，各格的型別固定（下面 M_ROW）。
//     ・格式不對的盤＝資料無效（原因 schema），任何統計都不進；內部物件裡它的分數一律是「沒有」，不會被轉成 0。真正的 0 分（數字 0）照樣收。
//     ・欄位整個沒有（undefined）跟型別不對不一樣：full、std、n、hn、un 沒有＝不知道（不合納入條件，只進描述）；有但型別不對＝格式不對。
//     ・aid、g（匿名碼、對局碼）要是非空字串。缺的盤沒辦法分組、去重、按玩家重抽 → 原因 noid，不進驗證母體，只留在描述；也不拿來跟別盤去重。
//       本機匯出檔沒有匿名碼：整份檔當成同一個人（aid＝「本機匯出#第幾份」），用對局編號認盤。
//   ①資料有效性：分數範圍、raw≥s0≥score、不是輸的盤 s0＝score、重算對得起來、不缺欄位。無效的盤任何統計都不進，只列在最後。
//   ②納入條件（預先驗證方案第四節，寫在 RULES，沒有命令列參數可以放寬）：我方每一步都評完、總手數 ≥ 20、標準開局、有識別欄位；不知道的當成不符合。不合的盤只進「描述」。
//   ③某一個分數能不能唯一反推（每個分數各自的 how）：跟⓪①②無關。截斷的長局 score、base 是原值，可以進驗證母體；raw、s0 反推不出唯一值時只留範圍。
//   比較不同候選時一律用「共同有效盤集合」（同一批盤的 base、raw、s0、score 都確定）。**舊總分不是每一盤都有**：舊分那一列與 score−舊分只用「共同盤裡有舊分的」那幾盤（新舊配對），盤數另外寫。
//   反推不出唯一值不是隨機缺漏：另外按終局、段位、局長報排除率，並用範圍的上下界算**平均數**的敏感度（上下界只對平均數有效，對相關、κ 無效——工具不對相關做這種界限）。
// 算法之間的排序比較（MXS v4；預先驗證方案 v1.3 第十節；MXC_VER 4 照 ChatGPT 第五次重評第三、四節改）：base 跟 acpl、mm、er 的等級相關（Spearman）、五等分的分級一致性（二次加權 κ）、
//   排序差最多的盤、差異集中在哪一組。**標籤是探索性的分流，不是合格線**：
//   ・這幾種算法都用同一個引擎對同一批著法的評估，彼此不獨立；base、acpl、er 更是同一組損失資料的不同摘要，相關高本來就會出現，不是額外的驗證。
//   ・「排序關聯較高／中等／較低」只描述這批資料裡盤的排序像不像。關聯較低（ρ < 0.4）不代表哪個算法失效；關聯較高也不代表準確度或棋力已經驗證。
//   ・五等分的 κ 只比相對分組：把所有分數平移 20 分，κ 一樣是 1——證明不了絕對分數、S～D 或公平性。
//   ・100 盤不等於 100 個獨立玩家。**人數門檻按每一對自己的資料算**（那一對兩邊都有值的盤，數它們的匿名碼）：不到 20 人標「少數人探索」，只有 1 人標「單人探索」，
//     不借別的對照、別的來源的人數（重評重現的漏洞：ACPL 那 120 盤全部來自同一個人，卻借另外 20 個只有失誤率的人過了人數門檻）。
//   ・總結的規格：只看盤數足夠（≥ 100 盤、算得出相關）的項目，寫成「可比較的 k／3 項」；人數足夠（跨玩家）與不足（探索）的分開講，各自報其中最低的一級。
//     不要求三項都有才總結；資料不足的項目不算好也不算壞，只是不在 k 裡。
// 只描述、不做檢定：同一個人的很多盤彼此相關，這裡的盤數不是獨立樣本。切換與否照預先驗證方案，不看這支的平均數決定。
// 版本：只比跟現在 MXS.ver 相同的盤（常數不同的版本不混）；其他版本只報盤數。
// 用法：node tools/mx-compare.js [--local 匯出檔.json]… [--cpu cpu-games.jsonl] [--include-test] [--json 輸出.json]
//       都沒給時讀 xiangqi-db/cpu-games.jsonl（有的話）。
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const DB = path.basename(path.join(__dirname, "..")) === "xiangqi-db" ? path.join(__dirname, "..") : path.join(__dirname, "..", "..", "xiangqi-db");
const MXC_VER = 4;   /* 這支工具的版本：1＝79（只篩版本）；2＝資料有效性／納入條件／唯一反推三者分開、共同有效盤集合；3＝原始格式先驗再轉型（不收數字字串、null 不是 0、缺識別欄位不進驗證）、新舊配對盤數、算法三角對照、本機紀錄的標準開局與提示悔棋；4＝算法對照每一對各自算人數與來源、標籤改成探索性的「排序關聯較高／中等／較低」、總結寫可比較的 k／3 項。改了篩選或統計的做法就加 1，並更新 tools/mx-manifest.json */
const CUT = 150;   /* m/05b-save.js：m:X.mv.slice(0,150) */
const RULES = { minPlies: 20, needFull: true, needStd: true, needId: true };   /* 納入條件：預先驗證方案第四節。要改先改方案（留修訂紀錄） */
const TRI = { minN: 100, minPeople: 20, mmMin: 10, hi: .7, lo: .4, kMin: 25 };   /* 算法對照的分流數字（方案 v1.3 第十節；探索性的，不是通過條件，也不靠調高它們補效度）：每一對的盤數起點／跨玩家的人數起點、首選一致率至少要有幾步有記首選、ρ ≥0.7 排序關聯較高、<0.4 較低、五等分至少要幾盤 */
const TRI_LV = ["排序關聯較高", "排序關聯中等", "排序關聯較低"];
const BANDS = [["入門以下", /^(新手|入門)/], ["業1～業5", /^業[1-5]$/], ["業6 以上", /^(業[6-9]|專)/]];
const LENS = [["40 手以下", n => n <= 40], ["41～80 手", n => n <= 80], ["81～120 手", n => n <= 120], ["121 手以上", n => n > 120]];
const ENDS = { w: "贏", l: "輸", d: "和", "?": "未知" };
/* 排除原因（由上到下是「主要原因」的優先順序；前四個＝資料無效） */
const REASONS = [["schema", "資料無效：格式不對（型別、形狀不符合規格；數字字串、null 都不收）"], ["invalid", "資料無效：分數超出範圍或大小順序不對"], ["incons", "資料無效：重算跟送出的分數對不起來"], ["missing", "資料無效：缺欄位"],
  ["noid", "缺識別欄位（匿名碼 aid 或對局碼 g）：不能分組、去重"], ["partial", "我方沒有每一步都評完（full:0）"], ["partialU", "不知道有沒有評完"], ["short", `總手數不到 ${RULES.minPlies}`], ["shortU", "不知道總手數"],
  ["nonstd", "不是標準開局"], ["stdU", "不知道是不是標準開局（11/15 以前的本機紀錄沒有存）"]];
const RTXT = Object.fromEntries(REASONS), INVALID = new Set(["schema", "invalid", "incons", "missing"]);

/* App 的常數與曲線：直接載入 m/05-settings.js 的 MXS 那一段，不另外抄一份 */
function loadMXS(file) {
  const S = fs.readFileSync(file || path.join(DB, "m", "05-settings.js"), "utf8").replace(/\r\n/g, "\n"), i = S.indexOf("const MXS={"), j = S.indexOf("\nfunction mxAccDw(", i);
  if (i < 0 || j < i) throw new Error("05-settings.js 找不到 MXS");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(S.slice(i, j) + ";this.R={MXS,mxWin,mxCapOf}", ctx, { filename: "05-settings(MXS)" }); return ctx.R;
}
const bandOf = rk => { if (!rk) return "未知"; const b = BANDS.find(b => b[1].test(rk)); return b ? b[0] : "未知" };
const lenOf = n => n == null || !isFinite(n) ? "未知" : LENS.find(l => l[1](n))[0];
const hintOf = g => g.hint == null ? "未知" : g.hint ? "用過提示或悔棋" : "沒用提示悔棋";

/* ---------- ⓪原始格式：先驗型別，再轉型 ---------- */
const isNum = x => typeof x === "number" && Number.isFinite(x), isInt = x => isNum(x) && Number.isInteger(x), isNat = x => isInt(x) && x >= 0, is01 = x => x === 0 || x === 1, isStr = x => typeof x === "string" && x.length > 0;
const opt = (x, f) => x === undefined || f(x), nul = (x, f) => x === null || f(x), isObj = x => x !== null && typeof x === "object" && !Array.isArray(x);
/* m 的一步：[手數, 階段 0／1／2, 最佳原值, 實際原值, 最佳是否原值 0／1, loss, 舊評語 −1～5, 新評語 −1～5, 殺棋 0／1／2]；評估與 loss 可以是 null（沒評到） */
const M_ROW = [x => isInt(x) && x >= 1, x => x === 0 || x === 1 || x === 2, x => nul(x, isNum), x => nul(x, isNum), is01, x => nul(x, v => isNum(v) && v >= 0), x => isInt(x) && x >= -1 && x <= 5, x => isInt(x) && x >= -1 && x <= 5, x => x === 0 || x === 1 || x === 2];
const M_NAME = ["手數", "階段", "最佳原值", "實際原值", "最佳是否原值", "loss", "舊評語", "新評語", "殺棋"];
/* 匿名 t:"cpu" 的一筆。回 {errs:[哪裡不對…], noId} */
function schemaCpu(r) {
  const E = []; if (!isObj(r)) return { errs: ["不是物件"], noId: true };
  if (!(isInt(r.mx) && r.mx >= 1)) E.push("mx 不是正整數");
  if (!Array.isArray(r.s) || r.s.length < 3) E.push("s 不是 3 格的陣列"); else { if (!isNum(r.s[0])) E.push("s[0]（score）不是數字"); if (!(isInt(r.s[1]) && r.s[1] >= 0 && r.s[1] <= 4)) E.push("s[1]（評級）不是 0～4 的整數"); if (!isNum(r.s[2])) E.push("s[2]（base）不是數字") }
  if (r.o !== undefined && !(Array.isArray(r.o) && isNum(r.o[0]) && opt(r.o[2], isNum))) E.push("o（舊分）不是數字陣列");
  if (!["w", "l", "d"].includes(r.res)) E.push("res 不是 w／l／d");
  if (!opt(r.n, isNat)) E.push("n（總手數）不是非負整數"); if (!opt(r.full, is01)) E.push("full 不是 0／1"); if (!opt(r.std, is01)) E.push("std 不是 0／1");
  if (!opt(r.hn, isNat)) E.push("hn 不是非負整數"); if (!opt(r.un, isNat)) E.push("un 不是非負整數");
  if (!opt(r.crk, x => nul(x, isStr))) E.push("crk 不是字串"); if (!opt(r.kind, isStr)) E.push("kind 不是字串"); if (!opt(r.lv, isNum)) E.push("lv 不是數字"); if (!opt(r.at, isNum)) E.push("at 不是數字");
  if (!Array.isArray(r.m) || !r.m.length) E.push("m 不是非空陣列"); else { const bad = r.m.findIndex(v => !Array.isArray(v) || v.length !== 9 || M_ROW.some((f, i) => !f(v[i]))); if (bad >= 0) { const v = r.m[bad], k = Array.isArray(v) && v.length === 9 ? M_ROW.findIndex((f, i) => !f(v[i])) : -1; E.push(`m 第 ${bad + 1} 筆${k >= 0 ? "的「" + M_NAME[k] + "」型別不對" : "不是 9 格的陣列"}`) } }
  return { errs: E, noId: !isStr(r.aid) || !isStr(r.g) };
}
/* 本機匯出檔的一筆（store mxShadow 的一盤，外加 id）。g 是 6 格（11/15 上午）或 9 格（多了標準開局、提示、悔棋） */
function schemaLocal(g) {
  const E = []; if (!isObj(g)) return { errs: ["不是物件"], noId: true };
  if (!(isInt(g.v) && g.v >= 1)) E.push("v 不是正整數");
  if (!(Array.isArray(g.n) && isNum(g.n[0]))) E.push("n（新總分）不是數字陣列");
  if (!(Array.isArray(g.x) && isNum(g.x[0]) && isNum(g.x[1]) && opt(g.x[2], e => e in ENDS))) E.push("x（raw、s0、終局）格式不對");
  if (g.o !== undefined && !(Array.isArray(g.o) && isNum(g.o[0]))) E.push("o（舊分）不是數字陣列");
  if (!opt(g.b, isNum)) E.push("b（base）不是數字"); if (!opt(g.at, isNum)) E.push("at 不是數字");
  if (g.g !== undefined) { const G = g.g; if (!(Array.isArray(G) && (G.length === 6 || G.length === 9) && isNat(G[0]) && isNat(G[1]) && is01(G[2]) && isStr(G[3]) && isNum(G[4]) && nul(G[5], isStr) && (G.length === 6 || (is01(G[6]) && isNat(G[7]) && isNat(G[8]))))) E.push("g（總手數、步數、評完、種類、級數、段位、標準開局、提示、悔棋）格式不對") }
  if (g.a !== undefined && !(Array.isArray(g.a) && g.a.length === 4 && isNum(g.a[0]) && nul(g.a[1], isNum) && isNat(g.a[2]) && isNum(g.a[3]))) E.push("a（對照算法）格式不對");
  return { errs: E, noId: !isStr(g.id) };
}
const NA = () => ({ how: "na" }), ALT_NA = () => ({ acpl: null, mm: null, mmN: 0, er: null });
/* 格式不對的盤：內部物件裡所有分數都是「沒有」（不轉型）。ver 只有在版本欄位本身是正整數時才留著，否則 null（歸到「其他版本／格式不對」） */
const broken = (src, id, aid, ver, errs) => ({ src, id, aid, ver, at: null, end: "?", old: null, base: NA(), raw: NA(), s0: NA(), score: NA(), plies: null, own: null, full: null, std: null, hint: null, kind: null, lv: null, rank: null, trunc: false, alt: ALT_NA(), schema: errs, flags: ["格式不對：" + errs.join("、")] });

/* ---------- 本機匯出檔的一盤 ---------- */
function normLocal(g, tag) {
  const sc = schemaLocal(g), aid = tag || "本機匯出", id = isObj(g) && isStr(g.id) ? g.id : "?";
  if (sc.errs.length) return broken("local", id, sc.noId ? null : aid, isObj(g) && isInt(g.v) && g.v >= 1 ? g.v : null, sc.errs);
  const x = g.x, G = g.g || null, ex = v => ({ v, lo: v, hi: v, how: "exact" }), a = g.a || null;
  return { src: "local", id, aid: sc.noId ? null : aid, ver: g.v, at: g.at === undefined ? null : g.at, end: x[2] === undefined ? "?" : x[2], old: g.o ? g.o[0] : null, base: g.b !== undefined ? { v: g.b, how: "exact" } : NA(),
    raw: ex(x[0]), s0: ex(x[1]), score: ex(g.n[0]), plies: G ? G[0] : null, own: G ? G[1] : null, full: G ? G[2] === 1 : null, std: G && G.length === 9 ? G[6] === 1 : null, hint: G && G.length === 9 ? G[7] + G[8] > 0 : null, kind: G ? G[3] : null, lv: G ? G[4] : null, rank: G ? G[5] : null,
    trunc: false, alt: a ? { acpl: a[0], mm: a[1], mmN: a[2], er: a[3] } : ALT_NA(), flags: G ? (G.length === 6 ? ["g 只有 6 格：不知道是不是標準開局、有沒有用提示悔棋"] : []) : ["舊紀錄：沒有 base、總手數、段位"] };
}

/* ---------- 匿名 t:"cpu" 的一盤：反推 raw、s0；重算 acpl、er ---------- */
function deriveCpu(r, K) {
  const sc = schemaCpu(r), idOf = x => (isStr(x.aid) ? x.aid : "?") + "/" + (isStr(x.g) ? x.g : "?");
  if (sc.errs.length) return broken("cpu", isObj(r) ? idOf(r) : "?/?", isObj(r) && isStr(r.aid) && isStr(r.g) ? r.aid : null, isObj(r) && isInt(r.mx) && r.mx >= 1 ? r.mx : null, sc.errs);
  const { MXS, mxWin, mxCapOf } = K, C = MXS.cap, m = r.m, score = r.s[0], b = r.s[2], res = r.res;
  const out = { src: "cpu", id: idOf(r), aid: sc.noId ? null : r.aid, ver: r.mx, at: r.at === undefined ? null : r.at, end: res, old: r.o ? r.o[0] : null, base: { v: b, how: "exact" },
    score: { v: score, lo: score, hi: score, how: "exact" }, plies: r.n === undefined ? null : r.n, own: m.length, full: r.full === undefined ? null : r.full === 1, std: r.std === undefined ? null : r.std === 1, hint: r.hn === undefined || r.un === undefined ? null : r.hn + r.un > 0,
    kind: r.kind || null, lv: r.lv === undefined ? null : r.lv, rank: r.crk || null, alt: ALT_NA(), flags: [] };
  /* 截斷：送出來正好 150 步，而且照總手數我方可能不只 150 步（一方最多走 ceil(n/2) 步） */
  out.trunc = m.length >= CUT && !(r.n !== undefined && Math.ceil(r.n / 2) <= CUT);
  if (out.trunc) out.flags.push(`截斷：逐步資料只有前 ${CUT} 步（總手數 ${r.n === undefined ? "?" : r.n}，我方最多 ${r.n === undefined ? "?" : Math.ceil(r.n / 2)} 步）`);
  if (out.full === false) out.flags.push("我方沒有每一步都評完（full:0），分數只算到評過的步");
  if (r.mx !== MXS.ver) { out.raw = NA(); out.s0 = NA(); out.flags.push(`版本 MXS v${r.mx}（現在 v${MXS.ver}），不重算`); return out }
  /* 對照算法：acpl、er 從逐步資料重算（跟 m/05-settings.js mxShSide 的 alt 同一個算法）；截斷或有步沒評到就不算。mm 匿名資料沒有 */
  if (!out.trunc && MXS.alt && m.every(v => v[2] !== null && v[3] !== null)) { const A = MXS.alt.cap, cl = x => Math.max(-A, Math.min(A, x)), r1 = v => Math.round(v * 10) / 10;
    out.alt = { acpl: r1(m.reduce((s, v) => s + Math.max(0, cl(v[2]) - cl(v[3])), 0) / m.length), mm: null, mmN: 0, er: r1(100 * m.filter(v => Math.max(0, mxWin(v[2]) - mxWin(v[3])) >= MXS.alt.err || v[8] && (v[7] === 4 || v[7] === 5)).length / m.length) } }
  /* 妙著獎勵（舊評語 q0＝0 是妙著） */
  const nB = m.filter(v => v[6] === 0).length, bon = Math.min(MXS.bonus[1], MXS.bonus[0] * nB), bonHi = out.trunc ? MXS.bonus[1] : bon;
  /* 重大錯誤上限：掉 ≥ capDw% 或失著(4)、敗著(5)；dw 離分界太近（< 0.1%）就兩種都算 */
  let bad = 0, badQ = 0, blun = 0; for (const v of m) { const q = v[7], dw = v[2] === null || v[3] === null ? 0 : Math.max(0, mxWin(v[2]) - mxWin(v[3])); if (q === 5) blun++; if (q === 4 || q === 5 || dw >= MXS.capDw + .1) bad++; else if (dw >= MXS.capDw - .1) badQ++ }
  const capOf = (bd, n) => { const br = bd / n; return bd >= C.n[1] || br >= C.r[1] ? mxCapOf(C.g[1]) : bd >= C.n[0] || br >= C.r[0] ? mxCapOf(C.g[0]) : blun ? mxCapOf(C.blun) : 100 };
  let cLo = capOf(bad + badQ, m.length), cHi = capOf(bad, m.length);
  if (badQ) out.flags.push(`${badQ} 步掉分正好在 ${MXS.capDw}% 分界附近`);
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
   有效性：格式對（schema）；score 是 0～100 的整數；base 0～100；raw 0～(100＋妙著獎勵上限)；s0 0～100；raw ≥ s0 ≥ score（範圍的話用上界比）；不是輸的盤 s0＝score；重算沒有「不一致」；對照算法在合理範圍。 */
function eligibility(g, K) {
  const R = [], bonMax = K && K.MXS ? K.MXS.bonus[1] : 6, in01 = (f, hi, int) => f.how === "na" || [f.lo != null ? f.lo : f.v, f.hi != null ? f.hi : f.v].every(v => isNum(v) && v >= 0 && v <= hi && (!int || Number.isInteger(v)));
  if (g.schema) R.push("schema");
  else if (g.score.how === "na") R.push("missing");
  else {
    let bad = !in01(g.score, 100, 1) || !in01(g.base, 100) || !in01(g.raw, 100 + bonMax, 1) || !in01(g.s0, 100, 1) || (g.old != null && !(g.old >= 0 && g.old <= 100));
    if (!bad && g.raw.how !== "na" && g.raw.hi < g.score.v) bad = true; if (!bad && g.s0.how !== "na" && (g.s0.hi < g.score.v || (g.raw.how !== "na" && g.raw.hi < g.s0.lo))) bad = true;
    if (!bad && g.end !== "l" && g.end !== "?" && g.s0.how !== "na" && g.s0.lo === g.s0.hi && g.s0.lo !== g.score.v) bad = true;
    const a = g.alt || {}; if (!bad && ((a.acpl != null && !(a.acpl >= 0 && a.acpl <= 2000)) || (a.mm != null && !(a.mm >= 0 && a.mm <= 100)) || (a.er != null && !(a.er >= 0 && a.er <= 100)))) bad = true;
    if (bad) R.push("invalid");
  }
  if (g.flags.some(f => /^不一致/.test(f))) R.push("incons");
  if (RULES.needId && !g.aid) R.push("noid");
  if (RULES.needFull) { if (g.full === false) R.push("partial"); else if (g.full == null) R.push("partialU") }
  if (g.plies == null) R.push("shortU"); else if (g.plies < RULES.minPlies) R.push("short");
  if (RULES.needStd) { if (g.std === false) R.push("nonstd"); else if (g.std == null) R.push("stdU") }
  const primary = (REASONS.find(([c]) => R.includes(c)) || [null])[0]; return { valid: !R.some(c => INVALID.has(c)), ok: !R.length, reasons: R, primary };
}

/* ---------- 讀檔 ---------- */
let LOCAL_N = 0;
function readLocal(file) { const J = JSON.parse(fs.readFileSync(file, "utf8")); if (!isObj(J) || J.kind !== "xq-mxshadow" || !Array.isArray(J.games)) throw new Error(file + " 不是影子紀錄匯出檔（kind 要是 xq-mxshadow）"); const tag = "本機匯出#" + (++LOCAL_N);
  return { meta: { file, at: J.at, build: J.build, n: J.n, cap: J.cap, ver: J.mxs && J.mxs.ver, tag }, games: J.games.map(g => normLocal(g, tag)) } }
function readCpu(file, K, includeTest) {
  const seen = new Set(), games = [], st = { lines: 0, bad: 0, test: 0, dup: 0, blind: 0 };
  for (const ln of fs.readFileSync(file, "utf8").split(/\r?\n/)) { if (!ln.trim()) continue; st.lines++; let r; try { r = JSON.parse(ln) } catch (e) { st.bad++; continue }
    if (isObj(r)) { if (r.test && !includeTest) { st.test++; continue } if (isStr(r.aid) && isStr(r.g)) { const k = r.aid + "/" + r.g; if (seen.has(k)) { st.dup++; continue } seen.add(k) } if (r.bl) { st.blind++; continue } }   /* 缺識別欄位的盤沒辦法去重，一筆算一筆（反正進不了驗證母體） */
    games.push(deriveCpu(r, K)) }
  return { meta: { file, ...st }, games };
}

/* ---------- 統計 ---------- */
const qt = (s, p) => { if (!s.length) return null; const h = (s.length - 1) * p, i = Math.floor(h); return s[i] + (h - i) * (s[Math.min(s.length - 1, i + 1)] - s[i]) };
function dist(xs, gr) { const s = xs.filter(x => x != null && isFinite(x)).sort((a, b) => a - b), n = s.length; if (!n) return { n: 0 }; const mu = s.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(s.reduce((a, b) => a + (b - mu) * (b - mu), 0) / n), c = [0, 0, 0, 0, 0];
  if (gr) for (const x of s) { const i = gr.findIndex(g => x >= g); c[i < 0 ? 4 : i]++ }
  return { n, mean: +mu.toFixed(2), sd: +sd.toFixed(2), min: s[0], q10: +qt(s, .1).toFixed(1), q25: +qt(s, .25).toFixed(1), q50: +qt(s, .5).toFixed(1), q75: +qt(s, .75).toFixed(1), q90: +qt(s, .9).toFixed(1), max: s[n - 1], over100: s.filter(x => x > 100).length, ...(gr ? { grade: c.map(v => +(100 * v / n).toFixed(1)) } : {}) } }
const sure = f => f && (f.how === "exact" || f.how === "derived"), FIELDS = ["base", "raw", "s0", "score"], avg = a => a.length ? +(a.reduce((x, y) => x + y, 0) / a.length).toFixed(2) : null;
const inCommon = g => g.base.how === "exact" && sure(g.raw) && sure(g.s0) && sure(g.score);
/* 驗證母體的一組（G＝這一組裡合資格的盤）：每個候選各自的有效盤數 own、共同有效盤集合 common；四個新分數的分布與彼此的差一律只用共同那一批。
   舊總分不是每盤都有：old 那一列與 score−舊分只用共同盤裡「有舊分」的 oldPaired 盤（新舊配對） */
function block(G, gr) {
  const Cm = G.filter(inCommon), df = (a, b) => { const d = Cm.map(g => g[a].v - g[b].v); return { n: Cm.length, mean: avg(d), differ: Cm.length ? +(100 * d.filter(x => x !== 0).length / Cm.length).toFixed(1) : null, max: Cm.length ? Math.max(...d) : null } };
  const Po = Cm.filter(g => g.old != null), od = Po.map(g => g.score.v - g.old), rng = k => { const A = G.filter(g => g[k].how !== "na"); return { n: A.length, lo: avg(A.map(g => g[k].lo != null ? g[k].lo : g[k].v)), hi: avg(A.map(g => g[k].hi != null ? g[k].hi : g[k].v)) } };
  return { n: G.length, people: new Set(G.map(g => g.aid).filter(Boolean)).size || null, own: Object.fromEntries(FIELDS.map(k => [k, G.filter(g => k === "base" ? g.base.how === "exact" : sure(g[k])).length])), common: Cm.length, oldPaired: Po.length,
    base: dist(Cm.map(g => g.base.v)), raw: dist(Cm.map(g => g.raw.v), gr), s0: dist(Cm.map(g => g.s0.v), gr), score: dist(Cm.map(g => g.score.v), gr), old: dist(Po.map(g => g.old), [90, 80, 70, 60]), scoreOfPaired: dist(Po.map(g => g.score.v), gr),
    rawMinusS0: df("raw", "s0"), s0MinusScore: df("s0", "score"), scoreMinusOld: { n: od.length, mean: avg(od) },
    /* 敏感度：反推不出唯一值的盤不是隨機缺的。把這一組合資格的盤全部算進來，raw、s0 各用範圍的下界、上界算平均——真正的**平均**在這兩個數之間（對相關、κ 不成立） */
    sens: { raw: rng("raw"), s0: rng("s0"), score: rng("score"), base: rng("base") } };
}
/* 描述用（所有讀得到、資料有效的盤，含不合納入條件的）：每個分數各算各的、各寫各的盤數，不比較候選 */
function describe(G, gr) { const v = k => G.filter(g => k === "base" ? g.base.how === "exact" : sure(g[k])).map(g => g[k].v); return { n: G.length, base: dist(v("base")), raw: dist(v("raw"), gr), s0: dist(v("s0"), gr), score: dist(v("score"), gr), old: dist(G.map(g => g.old), [90, 80, 70, 60]) } }

/* ---------- 算法之間的排序比較（探索性；MXC_VER 3 叫「算法三角對照」） ---------- */
/* 等級（同分取平均等級） */
function ranks(a) { const o = a.map((v, i) => [v, i]).sort((p, q) => p[0] - q[0]), r = new Array(a.length); for (let i = 0; i < o.length;) { let j = i; while (j + 1 < o.length && o[j + 1][0] === o[i][0]) j++; const m = (i + j) / 2 + 1; for (let k = i; k <= j; k++)r[o[k][1]] = m; i = j + 1 } return r }
/* Spearman 等級相關；不到 3 盤或有一邊全部同分回 null */
function spearman(x, y) { const n = x.length; if (n < 3 || n !== y.length) return null; const a = ranks(x), b = ranks(y), ma = (n + 1) / 2; let sab = 0, saa = 0, sbb = 0; for (let i = 0; i < n; i++) { sab += (a[i] - ma) * (b[i] - ma); saa += (a[i] - ma) ** 2; sbb += (b[i] - ma) ** 2 } return saa > 0 && sbb > 0 ? sab / Math.sqrt(saa * sbb) : null }
/* 五等分（照等級；0＝最低的五分之一 … 4＝最高） */
const quint = a => { const r = ranks(a), n = a.length; return r.map(v => Math.min(4, Math.floor(5 * (v - .5) / n))) };
/* 二次加權 κ（k 級） */
function kappaW(a, b, k) { const n = a.length; if (!n || n !== b.length) return null; const O = Array.from({ length: k }, () => new Array(k).fill(0)), ra = new Array(k).fill(0), rb = new Array(k).fill(0); for (let i = 0; i < n; i++) { O[a[i]][b[i]]++; ra[a[i]]++; rb[b[i]]++ }
  let so = 0, se = 0; for (let i = 0; i < k; i++)for (let j = 0; j < k; j++) { const w = (i - j) ** 2 / (k - 1) ** 2; so += w * O[i][j] / n; se += w * ra[i] * rb[j] / (n * n) } return se > 0 ? 1 - so / se : null }
/* 一律轉成「越高越好」：acpl、er 取負號 */
const ALTS = [["acpl", "每步平均失分（越低越好，取負號）", g => g.alt.acpl == null ? null : -g.alt.acpl], ["mm", "首選一致率", g => g.alt.mm == null || g.alt.mmN < TRI.mmMin ? null : g.alt.mm], ["er", "失誤率（越低越好，取負號）", g => g.alt.er == null ? null : -g.alt.er]];
const baseOf = g => g.base.how === "exact" ? g.base.v : null, r3 = v => v == null ? null : +v.toFixed(3);
/* 一對算法：只用兩邊都有值的盤。除了 n、ρ、κ，同時算「這一對自己的」人數、來源與每人盤數——人數門檻只看這裡的 people */
function pairStat(G, fa, fb) {
  const P = G.map(g => [fa(g), fb(g), g]).filter(p => p[0] != null && p[1] != null), x = P.map(p => p[0]), y = P.map(p => p[1]), per = new Map(), src = { cpu: 0, local: 0 };
  for (const p of P) { const g = p[2], k = g.aid || "（沒有識別）"; per.set(k, (per.get(k) || 0) + 1); src[g.src === "local" ? "local" : "cpu"]++ }
  const c = [...per.values()].sort((a, b) => a - b), n = P.length;
  return { n, people: c.length, src, perPerson: n ? { min: c[0], med: qt(c, .5), max: c[c.length - 1], topPct: +(100 * c[c.length - 1] / n).toFixed(1) } : null, rho: r3(spearman(x, y)), kappa: n >= TRI.kMin ? r3(kappaW(quint(x), quint(y), 5)) : null };
}
/* 一對的標籤（探索性的分流，不是合格線）。ok＝盤數足夠而且算得出相關；level＝排序關聯較高／中等／較低；
   scope＝這一對自己的人數：≥ TRI.minPeople「跨玩家」、1 人「單人探索」、其餘「少數人探索」。label 是報表上那一格的字 */
function readPair(s) {
  const ok = s.n >= TRI.minN && s.rho != null, level = !ok ? null : s.rho >= TRI.hi ? TRI_LV[0] : s.rho < TRI.lo ? TRI_LV[2] : TRI_LV[1], scope = !ok ? null : s.people >= TRI.minPeople ? "跨玩家" : s.people === 1 ? "單人探索" : "少數人探索";
  return { ok, level, scope, label: !ok ? "資料不足" : scope === "跨玩家" ? level : `〔${scope}${scope === "少數人探索" ? "：" + s.people + " 人" : ""}〕${level}` };
}
/* G＝合資格的盤。回各對的相關、分級一致性、各對自己的人數與來源、標籤、總結、排序差最多的盤、各分組 */
function triangulate(G, keys) {
  keys = keys || {}; const T = G.filter(g => baseOf(g) != null && ALTS.some(a => a[2](g) != null)), people = new Set(T.map(g => g.aid).filter(Boolean)).size, vs = {}, among = {};
  for (const [k, , f] of ALTS) vs[k] = pairStat(T, baseOf, f);
  for (let i = 0; i < ALTS.length; i++)for (let j = i + 1; j < ALTS.length; j++)among[ALTS[i][0] + "~" + ALTS[j][0]] = pairStat(T, ALTS[i][2], ALTS[j][2]);
  const scoreVs = pairStat(T, g => sure(g.score) ? g.score.v : null, baseOf), oldVs = pairStat(T, g => g.old, baseOf);
  /* 每一對各自判（readPair）；each＝報表上的字。總結：只看盤數足夠的項目（k／3）；跨玩家與探索分開，各報其中最低的一級 */
  const read = Object.fromEntries(Object.entries(vs).map(([k, s]) => [k, readPair(s)])), each = Object.fromEntries(Object.entries(read).map(([k, r]) => [k, r.label]));
  const okR = Object.values(read).filter(r => r.ok), cross = okR.filter(r => r.scope === "跨玩家"), expl = okR.filter(r => r.scope !== "跨玩家"), lowest = a => a.length ? TRI_LV[Math.max(...a.map(r => TRI_LV.indexOf(r.level)))] : null;
  const summary = { comparable: okR.length, of: ALTS.length, cross: { n: cross.length, lowest: lowest(cross) }, explore: { n: expl.length, lowest: lowest(expl), single: expl.filter(r => r.scope === "單人探索").length } };
  const verdict = `可比較的 ${summary.comparable}／${summary.of} 項` + (!okR.length ? "：資料不足" : "：" + [cross.length ? `跨玩家 ${cross.length} 項，其中最低的是「${summary.cross.lowest}」` : null, expl.length ? `單人或少數人探索 ${expl.length} 項，其中最低的是「${summary.explore.lowest}」（不能說成跨玩家的結果）` : null].filter(Boolean).join("；"));
  /* 每盤的排序差：base 的等級百分位 − 對照算法等級百分位的平均（只用這盤有的那幾種） */
  const pct = f => { const idx = T.map((g, i) => [f(g), i]).filter(p => p[0] != null), r = ranks(idx.map(p => p[0])), out = new Array(T.length).fill(null); idx.forEach((p, i) => { out[p[1]] = (r[i] - .5) / idx.length }); return out };
  const pb = pct(baseOf), pa = ALTS.map(a => pct(a[2])), gap = T.map((g, i) => { const v = pa.map(p => p[i]).filter(x => x != null); return v.length && pb[i] != null ? pb[i] - v.reduce((a, b) => a + b, 0) / v.length : null });
  const top = T.map((g, i) => ({ id: g.id, src: g.src, aid: g.aid || null, end: g.end, plies: g.plies, rank: g.rank, base: g.base.v, acpl: g.alt.acpl, mm: g.alt.mm, er: g.alt.er, gap: gap[i] == null ? null : +gap[i].toFixed(3) })).filter(x => x.gap != null).sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap)).slice(0, 10);
  const byGroup = {}; for (const [nm, [key, names]] of Object.entries(keys)) { byGroup[nm] = {}; for (const v of names) { const I = T.map((g, i) => i).filter(i => key(T[i]) === v && gap[i] != null); if (!I.length) continue; const S = I.map(i => T[i]); byGroup[nm][v] = { n: I.length, people: new Set(S.map(g => g.aid).filter(Boolean)).size, meanAbsGap: +(I.reduce((s, i) => s + Math.abs(gap[i]), 0) / I.length).toFixed(3), meanGap: +(I.reduce((s, i) => s + gap[i], 0) / I.length).toFixed(3), rho: Object.fromEntries(ALTS.map(a => [a[0], pairStat(S, baseOf, a[2]).rho])) } } }
  return { n: T.length, people: people || null, rules: { ...TRI }, levels: TRI_LV.slice(), vs, among, scoreVsBase: scoreVs, oldVsBase: oldVs, read, each, summary, verdict, top, byGroup };
}

function summarize(games, K) {
  const ver = K.MXS.ver, cur = games.filter(g => g.ver === ver), other = {}; for (const g of games) if (g.ver !== ver) { const k = g.ver == null ? "版本欄位格式不對" : "v" + g.ver; other[k] = (other[k] || 0) + 1 }
  for (const g of cur) g.elig = eligibility(g, K); for (const g of games) if (!g.elig) g.elig = eligibility(g, K);
  const valid = cur.filter(g => g.elig.valid), elig = cur.filter(g => g.elig.ok), gr = Array.from(K.MXS.gr), cnt = f => { const c = {}; for (const g of cur) for (const k of f(g)) if (k) c[k] = (c[k] || 0) + 1; return c };
  const keys = { byEnd: [g => ENDS[g.end], Object.values(ENDS)], byRank: [g => bandOf(g.rank), BANDS.map(b => b[0]).concat("未知")], byLen: [g => lenOf(g.plies), LENS.map(l => l[0]).concat("未知")], byHint: [hintOf, ["沒用提示悔棋", "用過提示或悔棋", "未知"]], bySrc: [g => g.src, ["local", "cpu"]] };
  const grp = (A, [key, names], f) => Object.fromEntries(names.map(nm => [nm, A.filter(g => key(g) === nm)]).filter(([, a]) => a.length).map(([nm, a]) => [nm, f(a)]));
  /* 排除率：每一組有幾盤、資料無效幾盤、不合納入條件幾盤、合資格裡 raw 或 s0 反推不出唯一值幾盤 */
  const rate = A => { const e = A.filter(g => g.elig.ok), u = e.filter(g => !sure(g.raw) || !sure(g.s0)), p = (a, b) => b ? +(100 * a / b).toFixed(1) : null; return { n: A.length, invalid: A.filter(g => !g.elig.valid).length, inelig: A.filter(g => g.elig.valid && !g.elig.ok).length, eligible: e.length, eligPct: p(e.length, A.length), unsure: u.length, unsurePct: p(u.length, e.length), common: e.filter(inCommon).length } };
  const how = k => { const c = {}; for (const g of elig) c[g[k].how] = (c[g[k].how] || 0) + 1; return c }, T = cur.filter(g => g.trunc);
  const row = g => ({ id: g.id, src: g.src, end: g.end, plies: g.plies, own: g.own, trunc: g.trunc, score: g.score.v, base: g.base.v, raw: g.raw.how === "na" ? null : [g.raw.lo, g.raw.hi], s0: g.s0.how === "na" ? null : [g.s0.lo, g.s0.hi], reasons: g.elig.reasons, flags: g.flags });
  const any = cnt(g => g.elig.reasons), vAll = block(elig, gr);
  return { toolVer: MXC_VER, ver, gr, rules: { ...RULES }, total: cur.length, otherVer: other, invalid: cur.length - valid.length, readable: valid.length, ineligible: valid.length - elig.length, eligible: elig.length, common: elig.filter(inCommon).length,
    excluded: { primary: cnt(g => [g.elig.primary]), any },
    /* v1 的欄位名（重評的獨立檢查腳本用的）：incons、partial＝有這個原因的盤數；all＝驗證母體的全部（同 verify.all） */
    incons: any.incons || 0, partial: any.partial || 0, all: vAll,
    how: Object.fromEntries(FIELDS.map(k => [k, how(k)])),
    trunc: { n: T.length, eligible: T.filter(g => g.elig.ok).length, rawSure: T.filter(g => g.elig.ok && sure(g.raw)).length, s0Sure: T.filter(g => g.elig.ok && sure(g.s0)).length },
    verify: { all: vAll, byEnd: grp(elig, keys.byEnd, a => block(a, gr)), byRank: grp(elig, keys.byRank, a => block(a, gr)), byLen: grp(elig, keys.byLen, a => block(a, gr)), byHint: grp(elig, keys.byHint, a => block(a, gr)), bySrc: grp(elig, keys.bySrc, a => block(a, gr)) },
    exclRate: { all: rate(cur), byEnd: grp(cur, keys.byEnd, rate), byRank: grp(cur, keys.byRank, rate), byLen: grp(cur, keys.byLen, rate), byHint: grp(cur, keys.byHint, rate), bySrc: grp(cur, keys.bySrc, rate) },
    tri: triangulate(elig, { byEnd: keys.byEnd, byRank: keys.byRank, byLen: keys.byLen }),
    describe: { all: describe(valid, gr), bySrc: grp(valid, keys.bySrc, a => describe(a, gr)) },
    bad: cur.filter(g => !g.elig.valid).map(row), unsure: elig.filter(g => !sure(g.raw) || !sure(g.s0) || g.trunc).map(row) };
}

/* ---------- 報表 ---------- */
function report(S, metas) {
  const L = [], P = s => L.push(s), HOW = { exact: "原值", derived: "反推（確定）", approx: "±1", bound: "只有範圍", na: "沒有" }, hw = o => Object.entries(o).map(([k, v]) => `${HOW[k] || k} ${v}`).join("、") || "—", f = v => v == null ? "—" : v;
  const row = (nm, d) => d.n ? `| ${nm} | ${d.n} | ${d.mean} | ${d.sd} | ${d.q10}／${d.q25}／${d.q50}／${d.q75}／${d.q90} | ${d.min}～${d.max} | ${d.grade ? d.grade.join("／") : "—"} |` : `| ${nm} | 0 | — | — | — | — | — |`;
  const HEAD = ["| 分數 | 盤數 | 平均 | 標準差 | 10／25／50／75／90 分位 | 範圍 | S／A／B／C／D % |", "|---|---|---|---|---|---|---|"];
  P(`# 影子模式候選分數離線比較（工具 v${S.toolVer}；MXS v${S.ver}，S／A／B／C 門檻 ${S.gr.join("／")}）`);
  for (const m of metas) P(`- 輸入 ${path.basename(m.file)}：` + (m.lines != null ? `${m.lines} 行，略過 測試 ${m.test}、重複 ${m.dup}、盲棋 ${m.blind}、壞行 ${m.bad}` : `匯出時 ${m.n} 盤（手機最多留 ${m.cap} 盤），匯出檔的 MXS v${m.ver}；整份當成同一個人（${m.tag}）`));
  P(`- 讀入先驗格式再轉型：分數、評估要是 JSON 數字（數字字串、null 都不收），full／std 只收 0／1，要有識別欄位。`);
  P(`- 納入條件（預先驗證方案第四節）：我方每一步都評完、總手數 ≥ ${S.rules.minPlies}、標準開局、有識別欄位；不知道的當成不符合。`);
  P(""); P("## 分母核對");
  P(`這個版本 **${S.total}** 盤` + (Object.keys(S.otherVer).length ? `（其他沒有混進來：${Object.entries(S.otherVer).map(([k, v]) => k + " " + v + " 盤").join("、")}）` : "") + ` → 資料無效 **${S.invalid}** 盤（任何統計都不進）→ 讀得到 ${S.readable} 盤 → 不合納入條件 **${S.ineligible}** 盤（只進最後的「描述」）→ **驗證母體 ${S.eligible} 盤** → 四個新分數都確定的共同有效盤集合 **${S.common}** 盤（其中有舊總分、可以新舊配對的 ${S.verify.all.oldPaired} 盤）。`);
  P(""); P("| 排除原因 | 以這個為主要原因的盤數（每盤只算一次） | 有這個原因的盤數（一盤可以有好幾個） |"); P("|---|---|---|");
  for (const [c, t] of REASONS) if (S.excluded.any[c]) P(`| ${t} | ${S.excluded.primary[c] || 0} | ${S.excluded.any[c]} |`);
  P(`| 合計 | ${Object.values(S.excluded.primary).reduce((a, b) => a + b, 0)}（＝${S.total}−${S.eligible}） | — |`);
  P(""); P(`- 驗證母體裡各分數的來源：${FIELDS.map(k => `${k} ${hw(S.how[k])}`).join("｜")}`);
  P(`- 逐步資料被截斷的長局（超過 ${CUT} 步）：${S.trunc.n} 盤，其中合資格 ${S.trunc.eligible} 盤——score、base 是送出來的原值，照樣進驗證母體；raw 反推得出唯一值的 ${S.trunc.rawSure} 盤、s0 ${S.trunc.s0Sure} 盤，其餘只有範圍。`);
  P("- 同一個人的多盤彼此相關，這裡只是描述，不做檢定。");
  if (!S.total) { P(""); P("（沒有這個版本的盤）"); return L.join("\n") }
  const sec = (title, B) => { P(""); P(`## 驗證母體：${title}`); for (const [nm, b] of Object.entries(B)) { P(""); P(`### ${nm}：合資格 ${b.n} 盤${b.people ? `（${b.people} 個匿名碼）` : ""}；各候選有效盤數 base ${b.own.base}｜raw ${b.own.raw}｜s0 ${b.own.s0}｜score ${b.own.score}；**共同有效 ${b.common} 盤（下表前四列都是這 ${b.common} 盤）；其中有舊總分的 ${b.oldPaired} 盤（最後兩列與 score−舊分只用這 ${b.oldPaired} 盤）**`);
    if (!b.common) { P("（沒有四個分數都確定的盤）"); continue }
    P(HEAD[0]); P(HEAD[1]); P(row("base（聚合品質）", b.base)); P(row("raw（含獎勵、未封頂）", b.raw)); P(row("s0（只看重大錯誤上限）", b.s0)); P(row("score（再加輸棋上限）", b.score)); P(row("〔新舊配對〕畫面上的舊總分", b.old)); P(row("〔新舊配對〕同一批盤的 score", b.scoreOfPaired));
    P(`- 同一批 ${b.common} 盤：raw−s0 平均 ${f(b.rawMinusS0.mean)}，有差的 ${f(b.rawMinusS0.differ)}%，最大 ${f(b.rawMinusS0.max)}｜s0−score 平均 ${f(b.s0MinusScore.mean)}，有差的 ${f(b.s0MinusScore.differ)}%，最大 ${f(b.s0MinusScore.max)}｜新舊配對的 ${b.scoreMinusOld.n} 盤：score−舊總分 平均 ${f(b.scoreMinusOld.mean)}${b.raw.over100 ? `｜raw 超過 100 的 ${b.raw.over100} 盤` : ""}`);
    if (b.n > b.common) P(`- 平均數的敏感度（合資格的 ${b.n} 盤全部算進來，反推不出唯一值的用範圍）：raw 的平均在 ${f(b.sens.raw.lo)}～${f(b.sens.raw.hi)}（${b.sens.raw.n} 盤）、s0 在 ${f(b.sens.s0.lo)}～${f(b.sens.s0.hi)}（${b.sens.s0.n} 盤）之間；對照：score 在全部合資格 ${b.sens.score.n} 盤的平均是 ${f(b.sens.score.lo)}（共同那 ${b.common} 盤 ${f(b.score.mean)}）、base ${f(b.sens.base.lo)}（共同那批 ${f(b.base.mean)}）——這個差距是只留共同盤造成的，不是公式的效果。上下界只對平均數成立，不能拿來當相關或 κ 的界限`) } };
  sec("全部", { 全部: S.verify.all }); if (Object.keys(S.verify.bySrc).length > 1) sec("按來源", S.verify.bySrc); sec("按終局", S.verify.byEnd); sec("按段位", S.verify.byRank); sec("按局長（總手數）", S.verify.byLen); sec("按提示悔棋", S.verify.byHint);
  P(""); P("## 排除率（反推不出唯一值不是隨機缺漏：被封頂、接近分界、較長的盤比較容易）");
  P("| 分組 | 這個版本的盤 | 資料無效 | 不合納入條件 | 驗證母體（佔 %） | 其中 raw 或 s0 反推不出唯一值（佔驗證母體 %） | 共同有效 |"); P("|---|---|---|---|---|---|---|");
  const rr = (nm, r) => P(`| ${nm} | ${r.n} | ${r.invalid} | ${r.inelig} | ${r.eligible}（${f(r.eligPct)}%） | ${r.unsure}（${f(r.unsurePct)}%） | ${r.common} |`);
  rr("全部", S.exclRate.all); for (const [k, t] of [["byEnd", "終局"], ["byRank", "段位"], ["byLen", "局長"], ["byHint", "提示悔棋"], ["bySrc", "來源"]]) for (const [nm, r] of Object.entries(S.exclRate[k])) rr(`${t}：${nm}`, r);
  /* 算法之間的排序比較（探索性） */
  const T = S.tri, AN = { acpl: "每步平均失分 ACPL", mm: "首選一致率", er: "失誤率" }, pp = s => !s.n ? "—" : `${s.people} 人（匿名 ${s.src.cpu} 盤、本機 ${s.src.local} 盤；每人 ${s.perPerson.min}～${s.perPerson.max} 盤，最多的一人佔 ${s.perPerson.topPct}%）`;
  P(""); P(`## 算法之間的排序比較（探索性的分流標籤，不是合格線）——驗證母體裡有 base 和至少一種對照算法的 ${T.n} 盤`);
  P("**這幾種算法都用同一個引擎對同一批著法的評估，彼此不獨立；base、ACPL、失誤率更是同一組損失資料的不同摘要，相關高本來就會出現。標籤只描述「這批資料裡，盤的排序像不像」——不是準確度，不是棋力已經驗證，不能取代人類評閱或學習成效的證據。關聯較低也不代表哪個算法失效。**");
  P(`分流數字（事先固定、探索性）：每一對至少 ${T.rules.minN} 盤才給標籤（100 盤不等於 100 個獨立玩家）；等級相關 ≥ ${T.rules.hi}＝排序關聯較高、< ${T.rules.lo}＝較低、中間＝中等。人數按每一對自己的資料算：≥ ${T.rules.minPeople} 人才算跨玩家，1 人標「單人探索」，其餘標「少數人探索」。首選一致率只算有記首選 ≥ ${T.rules.mmMin} 步的盤。五等分的 κ 至少 ${T.rules.kMin} 盤，而且只比相對分組（證明不了絕對分數、S～D 或公平性）。`);
  P(""); P("| base 對上 | 這一對的盤數 | 這一對的人數與來源 | 等級相關 ρ（對照算法已轉成越高越好） | 五等分的二次加權 κ | 標籤 |"); P("|---|---|---|---|---|---|");
  for (const [k, s] of Object.entries(T.vs)) P(`| ${AN[k]} | ${s.n} | ${pp(s)} | ${f(s.rho)} | ${f(s.kappa)} | ${T.each[k]} |`);
  P(`| （參考）score | ${T.scoreVsBase.n} | ${pp(T.scoreVsBase)} | ${f(T.scoreVsBase.rho)} | ${f(T.scoreVsBase.kappa)} | — |`); P(`| （參考）畫面上的舊總分 | ${T.oldVsBase.n} | ${pp(T.oldVsBase)} | ${f(T.oldVsBase.rho)} | ${f(T.oldVsBase.kappa)} | — |`);
  P(`- 對照算法彼此：${Object.entries(T.among).map(([k, s]) => `${k.split("~").map(x => AN[x]).join(" 對 ")} ρ ${f(s.rho)}（${s.n} 盤、${s.people} 人）`).join("；")}`);
  P(`- **總結（只看盤數足夠的項目；跨玩家與探索分開）：${T.verdict}**。不算進任何放行條件。`);
  if (T.top.length) { P(""); P("排序差最多的盤（base 的等級百分位 − 對照算法等級百分位的平均；正＝base 排得比對照算法高）："); P("| 盤 | 來源 | 終局 | 總手數 | 段位 | base | ACPL | 首選一致率 | 失誤率 | 排序差 |"); P("|---|---|---|---|---|---|---|---|---|---|"); for (const u of T.top) P(`| ${u.id} | ${u.src} | ${ENDS[u.end]} | ${f(u.plies)} | ${f(u.rank)} | ${u.base} | ${f(u.acpl)} | ${f(u.mm)} | ${f(u.er)} | ${u.gap} |`)
    P(""); P("排序差集中在哪一組（平均的絕對排序差；各組自己的等級相關）："); P("| 分組 | 盤數 | 人數 | 平均絕對排序差 | 平均排序差（正＝base 偏高） | ρ：base 對 ACPL／首選一致率／失誤率 |"); P("|---|---|---|---|---|---|");
    for (const [nm, t] of [["byEnd", "終局"], ["byRank", "段位"], ["byLen", "局長"]]) for (const [v, s] of Object.entries(T.byGroup[nm] || {})) P(`| ${t}：${v} | ${s.n} | ${s.people} | ${s.meanAbsGap} | ${s.meanGap} | ${f(s.rho.acpl)}／${f(s.rho.mm)}／${f(s.rho.er)} |`) }
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
module.exports = { loadMXS, schemaCpu, schemaLocal, normLocal, deriveCpu, eligibility, readLocal, readCpu, summarize, triangulate, pairStat, readPair, spearman, kappaW, quint, ranks, report, CUT, RULES, TRI, TRI_LV, REASONS, MXC_VER };
