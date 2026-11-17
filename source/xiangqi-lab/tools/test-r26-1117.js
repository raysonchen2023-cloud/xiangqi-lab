// 11/17 第 26 輪（候選版 1604 複驗後）：D W1 英文頂欄全站退步（時辰鐘被切、標題疊在時辰字上）。
// 標準：App Store 審查 2.1（完整、不壞）、4.0（版面不疊字）。不開瀏覽器：從 CSS 原始碼讀出數值，照瀏覽器的盒模型算頂欄、鐘、標題的範圍。
// 用法：node --test xiangqi-lab/tools/test-r26-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const I18N = M("07i18n.js"), W8 = M("07w8-shichen.js"), MCSS = rd("xiangqi-db/m.css");
const I18N_CSS = vm.runInNewContext(between(I18N, "const I18N_CSS=", "function i18nCss()").replace(/^const I18N_CSS=/, "").replace(/;\s*$/, ""));
const px = (src, re, what) => { const m = src.match(re); assert.ok(m, "讀不到 " + what); return parseFloat(m[1]) };

/* 從原始碼讀數值（改了 CSS 這裡會跟著變，不是寫死） */
function readCss(css) {
  return {
    minH: px(MCSS, /\.topbar\{flex:none;[^}]*min-height:(\d+)px/, ".topbar min-height"),
    border: px(MCSS, /html \.topbar,html\[data-era\] \.topbar\{[^}]*border-bottom:(\d+)px/, "頂欄下框"),
    padT: px(W8, /#topbar\.clk-on\{position:relative;padding-top:calc\(var\(--safeT,0px\) \+ (\d+)px\)/, "clk-on padding-top"),
    padTGap: px(W8, /html\.gapfix #topbar\.clk-on\{padding-top:calc\(var\(--safeT,0px\) \+ (\d+)px\)/, "gapfix padding-top"),
    padB: px(W8, /#topbar\.clk-on\{[^}]*padding-bottom:(\d+)px/, "clk-on padding-bottom"),
    lh: px(W8, /#topbar\.clk-on #title\{[^}]*line-height:(\d+)px/, "標題行高"),
    fs: px(W8, /#topbar\.clk-on #title\{[^}]*font-size:(\d+)px/, "標題字級"),
    tPadL: px(W8, /#topbar\.clk-on #title\{[^}]*padding-left:(\d+)px/, "標題左讓位"),
    tPadB: px(W8, /#topbar\.clk-on #title\{[^}]*padding-bottom:(\d+)px/, "標題底下讓給時辰字"),
    clkBot: px(W8, /\.clk-box\{position:absolute;bottom:(\d+)px/, ".clk-box bottom"),
    dial: px(W8, /\.clk-dial\{[^}]*height:(\d+)px/, "星晷高"),
    smF: px(W8, /\.clk-sm\{[^}]*font:600 ([\d.]+)px\/1\.3/, "時辰小字"),
    bF: px(W8, /\.clk-sm \.clk-sl>b\{[^}]*font-size:(\d+)px;line-height:([\d.]+)/, "時辰大字"),
    bLh: px(W8, /\.clk-sm \.clk-sl>b\{[^}]*line-height:([\d.]+)/, "時辰大字行高"),
    /* 英文 ≤480 有鐘時標題的 max-height（全站 * 是 border-box，含 padding） */
    enMaxClk: (() => { const m = css.match(/html\[lang=en\] #topbar\.clk-on #title\{max-height:(\d+)px\}/); if (m) return +m[1]; const e = css.match(/@media \(max-width:480px\)\{html\[lang=en\] #title\{[^}]*max-height:([\d.]+)em/); return e ? +e[1] * 17 : Infinity })()
  };
}
/* 頂欄模型：lines＝標題行數；回傳頂欄高、鐘範圍、標題字範圍、時辰字範圍（y，相對頂欄上緣） */
function layout(V, lang, lines, gap) {
  const padT = gap ? V.padTGap : V.padT;
  const maxH = lang === "en" ? V.enMaxClk : Infinity;
  const titleH = Math.min(lines * V.lh + V.tPadB, maxH);
  const H = Math.max(V.minH, padT + titleH + V.padB + V.border);
  const clkB = H - V.border - V.clkBot, clkT = clkB - V.dial;
  const smH = V.smF * 1.3 + V.bF * V.bLh + 1;
  const textB = padT + Math.max(0, Math.min(lines * V.lh, titleH - V.tPadB));
  return { H: +H.toFixed(1), clk: [+clkT.toFixed(1), +clkB.toFixed(1)], title: [padT, +textB.toFixed(1)], hidden: lines * V.lh > titleH - V.tPadB, clkText: [+(clkB - smH).toFixed(1), +clkB.toFixed(1)] };
}
/* 標題行數：繁中 .topbar h1 不換行＝1 行；英文「Xiangqi Qianqiu」在 430 一行、320／375／393 兩行（測試員 D 第 26 輪量的）；斷網時離線牌縮成 📴，行數不會更多 */
const LINES = { zh: { 320: 1, 375: 1, 393: 1, 430: 1 }, en: { 320: 2, 375: 2, 393: 2, 430: 1 } };
/* 預期數字（safeT＝0、沒有 gapfix）：一行 63px、鐘 2～58；兩行 83px、鐘 22～78（1514 測試員量到約 80px）；繁中 375 測試員量到 63px */
const EXPECT = {
  1: { H: 63, clk: [2, 58], title: [2, 22] },
  2: { H: 83, clk: [22, 78], title: [2, 42] }
};

test("W1：重現 1604 的退步——舊規則 max-height:2.35em（border-box 含底下 36px）把頂欄壓成 52px、鐘在 -9～47（跟測試員 D 量的一樣）", () => {
  const old = I18N_CSS.replace(/html\[lang=en\] #topbar\.clk-on #title\{max-height:76px\}/, "");
  const V = readCss(old), L = layout(V, "en", 2, false);
  assert.equal(L.H, 52); assert.deepEqual(L.clk, [-9, 47]); assert.ok(L.clk[0] < 0, "舊版鐘上緣在畫面外");
});

test("W1：375／393／430／320 × 中英 × 連線斷網：頂欄高、鐘範圍、標題範圍——鐘完整、標題不跟時辰字疊、都在頂欄裡", () => {
  const V = readCss(I18N_CSS);
  assert.equal(V.enMaxClk, 2 * V.lh + V.tPadB, "英文有鐘時標題上限＝兩行＋底下讓位（76px）");
  const rows = [];
  for (const w of [320, 375, 393, 430]) for (const lang of ["zh", "en"]) for (const net of ["on", "off"]) for (const gap of [false, true]) {
    const lines = LINES[lang][w], L = layout(V, lang, lines, gap), tag = `${w} ${lang} ${net}${gap ? " gapfix" : ""}`;
    assert.ok(!L.hidden, tag + "：標題字沒被切");
    assert.ok(L.clk[0] >= 0, tag + "：鐘上緣 " + L.clk[0] + " 在畫面內");
    assert.ok(L.clk[1] <= L.H, tag + "：鐘下緣在頂欄裡");
    assert.ok(L.title[0] >= 0 && L.title[1] <= L.H, tag + "：標題在頂欄裡");
    assert.ok(L.title[1] <= L.clkText[0], tag + `：標題字 ${L.title} 在時辰字 ${L.clkText} 上面，不疊`);
    /* 橫向：星晷在左 6～62，標題字從 6＋62 開始，不疊 */
    assert.ok(6 + V.dial <= 6 + V.tPadL, tag + "：星晷跟標題橫向不疊");
    if (!gap) { const E = EXPECT[lines]; assert.equal(L.H, E.H, tag); assert.deepEqual(L.clk, E.clk, tag); assert.deepEqual(L.title, E.title, tag) }
    else { const E = EXPECT[lines], d = V.padTGap - V.padT; assert.equal(L.H, E.H + d, tag); assert.deepEqual(L.clk, E.clk.map(v => v + d), tag) }
    rows.push(`${tag}: 頂欄 0～${L.H}、鐘 ${L.clk[0]}～${L.clk[1]}、標題 ${L.title[0]}～${L.title[1]}、時辰字 ${L.clkText[0]}～${L.clkText[1]}`);
  }
  assert.equal(rows.length, 32); if (process.env.R26_ROWS) console.log(rows.join(String.fromCharCode(10)));
  /* 兩種行數都要過（行數估錯也不會疊） */
  for (const lang of ["zh", "en"]) for (const lines of [1, 2]) { const L = layout(V, lang, lines, false); assert.ok(L.clk[0] >= 0 && L.title[1] <= L.clkText[0], lang + " " + lines + " 行") }
});

test("W1：英文窄螢幕標題規則——仍不在字中間斷（V5 保留）、有鐘時的上限選擇器比一般規則強；繁中不受影響", () => {
  const css = I18N_CSS;
  assert.match(css, /@media \(max-width:480px\)\{html\[lang=en\] #title\{overflow-wrap:normal!important;word-break:normal;max-height:2\.35em;overflow:hidden!important\}html\[lang=en\] #topbar\.clk-on #title\{max-height:76px\}\}/);
  assert.match(css, /-webkit-line-clamp:2/, "英文標題最多兩行");
  assert.ok(MCSS.includes("*{box-sizing:border-box"), "全站 border-box（max-height 含 padding，所以要算進 36px）");
  /* 選擇器強度：html[lang=en] #topbar.clk-on #title（2 個 id）> html[lang=en] #title（1 個 id） */
  const sp = s => [(s.match(/#[\w-]+/g) || []).length, (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length, (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length];
  const a = sp("html[lang=en] #topbar.clk-on #title"), b = sp("html[lang=en] #title");
  assert.ok(a[0] > b[0], "有鐘時的上限蓋得過一般規則");
  /* 規則都在 html[lang=en] 底下：繁中頂欄不受影響 */
  for (const s of I18N_CSS.split(String.fromCharCode(10))) if (s.includes("#title")) assert.ok(!/(^|\})#title|(^|\})#topbar/.test(s), "沒有不帶 html[lang=en] 的標題規則：" + s.slice(0, 80));
  /* 斷網離線牌縮成 📴（R25-3／4）保留（W2 測試在檔尾） */
  assert.ok(W8.includes('@media (max-width:480px){#topbar #offChip{font-size:0!important;padding:6px 8px!important}#topbar #offChip::before{content:"📴";font-size:15px;line-height:1}}'));
});

/* ======================= W2（P2）：棋譜檢討頁「關鍵一步」解說、一般步評語、記譜提示泡泡——英文介面整段英文、著法 WXF；中文照舊 ======================= */
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const U0 = M("00-util.js"), S0 = M("05-settings.js"), B0 = M("01-board.js"), D0 = M("10-db.js");
/* 跟 test-analysis-cases.js 同一套：vm 載入 App 真正的白話函式＋英文翻譯器（含外掛字典），用 34 個真實局面產生文字 */
function w2Kit() {
  const C = require("../site/core.js");
  const SRC = [between(U0, "const sqI=", "\n/* 11/11 v6 第 3 點：段位簡稱"), between(S0, "const GRADES=", "// 報告畫面"), between(S0, "function mflRisk(", "/* G01 示範練習"),
    between(B0, "const TMX_QS=", "/* 小泡泡："), between(B0, "function tmxRisk(", "function tmxMove("), between(D0, "function bcMove(", "/* 意見回饋 562"),
    between(D0, "function dbNoteLines(", "function sugText("), between(D0, "function sugText(", "function Viewer("), between(D0, "function mkNote(K){", "\n  function mkRetry(")].join("\n");
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  const ctx = { console, isFinite, store: { get: (k, d) => d, set() {} }, mvArrowName: () => "綠色箭頭", setTimeout: () => 0, clearTimeout() {}, addEventListener() {} };
  ctx.window = ctx; ctx.XQCore = C; vm.createContext(ctx);
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + "\n" + SRC + ";this.R={evt,evLink,pawnAbout,qNow,talk,mflWhy,mflRisk,tmxPlain,tmxPlainEn,tmxRisk,gradeNote,mkNote,mkNoteEn,dbNoteLines,i18nText,i18nExtMerge,TMX_PW}", ctx);
  if (HAS_EXT) ctx.R.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return { R: ctx.R, C };
}
function w2Cases() {
  const { R, C } = w2Kit(), sq = C.parseSq, DATA = JSON.parse(fs.readFileSync(path.join(__dirname, "analysis-cases.json"), "utf8")), BAD = ["穩著", "緩著", "失著", "敗著"], out = [];
  for (const c of DATA.cases) {
    const b0 = C.parseFen(c.fen.split(" ")[0]), by = c.by, f = sq(c.mv.slice(0, 2)), t = sq(c.mv.slice(2, 4)), m = { f, t, cn: c.cn }, g = { ...c.g }, q = R.qNow({ ...g, by }), G = { ...g, q, by };
    const ply = { ply: c.ply, by, cn: c.cn, f, t, ...G }, tk0 = R.talk(by, [ply], [ply], {}, 70).find(x => x.ply === c.ply);
    const o = { c, q, note: R.gradeNote(G, b0.slice()), plainEn: R.tmxPlainEn(q, g.loss, g.ev, by) };
    if (BAD.includes(q) && g.loss >= 30) {
      const W = { ...R.mflWhy(b0, by, m, G) }, risk = (q === "失著" || q === "敗著") ? R.mflRisk(b0, by, m, G) : "";
      if (risk && /將死/.test(risk) && W.tag === "殺棋" && !/已經有殺棋/.test(W.say || "")) W.say = "";
      let best = null, bcn = ""; try { best = g.bm ? { f: sq(g.bm.slice(0, 2)), t: sq(g.bm.slice(2, 4)) } : null; if (best && (!b0[best.f] || (best.f === f && best.t === t))) best = null; if (best) bcn = C.notate(b0, best.f, best.t) } catch (e) { best = null }
      const tk = tk0 && tk0.bad ? String(tk0.x).replace(/^第 \d+ 回合 [^：]*：/, "") : "";
      const K = { p: c.ply, m, g: G, q, side: by, best, bcn, tk, rk: risk, why: W.gen ? "" : W.say };
      o.key = R.mkNote(K); o.keyEn = R.mkNoteEn(K, "綠色箭頭", "\n📈 這盤你還有 3 步在分析，好了會自動更新"); o.K = K;
    }
    o.noteEn = R.dbNoteLines(o.note + (o.risk ? "\n⚠ " + o.risk : ""));
    out.push(o);
  }
  return { R, out };
}

test("W2：關鍵一步解說英文版（34 個真實局面）——每一行都是英文、著法 WXF、評等用現有六個英文詞；有分析中的那行也翻", { skip: SKIP }, () => {
  const { out } = w2Cases(), keys = out.filter(o => o.keyEn);
  assert.ok(keys.length >= 10, "有關鍵一步的局面 " + keys.length);
  for (const o of keys) {
    for (const ln of o.keyEn.split("\n")) assert.ok(!CJK.test(ln), `${o.c.id || o.c.ply}：${ln}\n（中文：${o.key}）`);
    assert.match(o.keyEn, /^🔎 The key move of this game: on move \d+ you played "[KAEHRCP][1-9+=.\-][1-9+=.\-]?[1-9]?"/, o.keyEn.split("\n")[0]);
    if (o.q) assert.ok(o.keyEn.split("\n")[0].includes(`[${{ 妙著: "Brilliant", 正著: "Best", 穩著: "Good", 緩著: "Slow", 失著: "Mistake", 敗著: "Blunder" }[o.q]}]`), "評等詞");
    assert.ok(o.keyEn.includes("Tap ▶ to see the position after your move"), "最後一行");
    assert.ok(o.keyEn.endsWith("📈 3 moves of this game are still being analyzed; it updates automatically when done"), "分析中");
    /* 行數跟中文一樣（每一行都有對應） */
    assert.equal(o.keyEn.split("\n").length, o.key.split("\n").length + 1, "行數：" + o.keyEn);
  }
  /* 測試員 D 看到的那三種句子都出現過、而且是英文 */
  const all = keys.map(o => o.keyEn).join("\n");
  assert.match(all, /This move is worth about [\d.]+ pawns less than Pikafish's suggestion "[KAEHRCP]/);
  assert.match(all, /⚠ This move lets the opponent (capture your (General|Advisor|Elephant|Horse|Chariot|Cannon|Soldier)|check you|checkmate you)/);
});

test("W2：「為什麼不好」（05-settings mflWhy）每一種句型 × 每一種棋子都翻得出（棋子名英文、著法 WXF），外掛字典的 p 型", { skip: SKIP }, () => {
  const { R } = w2Kit(), T = s => R.i18nText(s);
  const P = ["帥", "仕", "相", "傌", "俥", "炮", "兵", "將", "士", "象", "馬", "車", "砲", "卒"], NM = { 帥: "General", 將: "General", 仕: "Advisor", 士: "Advisor", 相: "Elephant", 象: "Elephant", 傌: "Horse", 馬: "Horse", 俥: "Chariot", 車: "Chariot", 炮: "Cannon", 砲: "Cannon", 兵: "Soldier", 卒: "Soldier" };
  const F = [
    (x, y, z) => `你的「${x}」吃掉對方的「${y}」，但對方的「${z}」會吃回來：子力差不多，只是換完的局面不如「馬二進三」。`,
    (x, y, z) => `你的「${x}」吃掉對方的「${y}」，但對方的「${z}」會吃回來、你再吃回去：子力差不多，只是換完的局面不如最好的走法。`,
    (x, y, z) => `你的「${x}」吃掉對方的「${y}」，但對方的「${z}」吃掉它，你再吃回來也虧：拿「${x}」換「${y}」，虧了。`,
    (x, y, z) => `你的「${x}」吃掉對方的「${y}」，但對方的「${z}」吃得到它，你又換不回來：拿「${x}」換「${y}」，虧了。`,
    (x, y) => `對方本來就在捉你的「${x}」，這步沒有先處理；被對方的「${y}」吃掉，你就算吃回來也虧。`,
    (x, y) => `對方本來就在捉你的「${x}」，這步沒有先處理（逃開或保護），讓對方的「${y}」白白吃掉。`,
    (x, y) => `你走過去的「${x}」，對方的「${y}」吃得到；你雖然能吃回它，但「${x}」比「${y}」值錢，換了還是虧。`,
    (x, y) => `你走過去的「${x}」，對方的「${y}」吃得到，而且你換不回來，等於白送。`,
    (x, y) => `這步走完，你的「${x}」保護不夠：對方的「${y}」吃掉它，你吃回來也虧。`,
    (x, y) => `這步走完，你的「${x}」沒人保護了，對方的「${y}」可以吃掉它。`,
    (x) => `Pikafish 建議的「炮二平五」可以白吃對方的「${x}」（對方吃不回來），這步錯過了。`,
    (x) => `Pikafish 建議的「炮二平五」可以吃掉對方的「${x}」，這步錯過了。`,
    (x, y) => `Pikafish 建議的「炮二平五」一步同時威脅對方的將（將軍）和「${x}」和「${y}」，對方只能顧一邊（捉雙）。`,
    (x) => `Pikafish 建議的「炮二平五」一步同時威脅對方的將（將軍）和「${x}」，對方只能顧一邊（捉雙）。`,
    (x, y) => `Pikafish 建議的「炮二平五」一步同時威脅對方的「${x}」和「${y}」，對方只能顧一邊（捉雙）。`
  ];
  let n = 0;
  for (const f of F) for (let i = 0; i < P.length; i++) {
    const x = P[i], y = P[(i + 3) % P.length], z = P[(i + 7) % P.length], s = f(x, y, z);
    for (const pre of ["", "💡 "]) { const t = T(pre + s); assert.ok(t && !CJK.test(t), pre + s + " → " + t); assert.ok(t.includes(NM[x]), "棋子名：" + t); if (/炮二平五|馬二進三/.test(s)) assert.match(t, /"(C2\.5|H2\+3)"/); n++ }
  }
  assert.equal(n, F.length * P.length * 2);
  for (const s of ["這時你已經有殺棋：從「炮二平五」開始一路將下去就能贏，這步讓對方逃掉了。", "Pikafish 建議的「炮二平五」是將軍，先逼對方應將，你就能掌握主動。", "走完這步，對方就有一套連續將軍的殺法。走之前先看看：對方下一步能不能將你？"])
    for (const pre of ["", "💡 "]) { const t = T(pre + s); assert.ok(t && !CJK.test(t), s + " → " + t) }
  /* 句型對得上 05-settings 的原文（那邊改字這裡要跟著補） */
  for (const frag of ["會吃回來${L1.re?\"、你再吃回去\":\"\"}：子力差不多，只是換完的局面不如", "吃掉它，你再吃回來也虧", "吃得到它，你又換不回來", "這步沒有先處理（逃開或保護），讓對方的「${Y}」白白吃掉。", "比「${Y}」值錢，換了還是虧。", "沒人保護了，對方的「${Y}」可以吃掉它。", "一步同時威脅對方的${chk?\"將（將軍）和\":\"\"}「${N(fork[0])}」", "是將軍，先逼對方應將，你就能掌握主動。"])
    assert.ok(S0.includes(frag), "05-settings 原文：" + frag);
  /* p 型：不是棋子名就整句不算（不會把別的「」內容當棋子） */
  assert.equal(T("你走過去的「小明」，對方的「車」吃得到，而且你換不回來，等於白送。"), null);
  assert.match(I18N, /if\(k==="p"\)\{const L=Object\.prototype\.hasOwnProperty\.call\(I18N_PL,g\)\?I18N_PL\[g\]:null;if\(!L\)\{bad=true;return""\}return I18N_PN\[L\]\}/);
});

test("W2：一般步的評語（gradeNote、⚠ 後果、建議走法、實際走的箭頭）英文時一行一行翻；評等說明泡泡（tmxPlainEn）英文", { skip: SKIP }, () => {
  const { R, out } = w2Cases();
  for (const o of out) {
    for (const ln of o.noteEn.split("\n")) assert.ok(!CJK.test(ln), ln + "\n（中文：" + o.note + "）");
    assert.ok(!CJK.test(o.plainEn), o.plainEn);
  }
  for (const q of ["妙著", "正著", "穩著", "緩著", "失著", "敗著"]) { const t = R.tmxPlainEn(q); assert.ok(t && !CJK.test(t), q + "：" + t); assert.ok(t.startsWith('"' + { 妙著: "Brilliant", 正著: "Best", 穩著: "Good", 緩著: "Slow", 失著: "Mistake", 敗著: "Blunder" }[q] + '": ')) }
  assert.equal(R.tmxPlainEn("失著"), '"Mistake": A mistake. This move is worth 1.5–4 pawns less than the best move.');
  assert.equal(R.tmxPlainEn("失著", 250, -900, "r"), '"Mistake": A mistake. This move is worth about 2.5 pawns less than the best move; overall after this move: Black much better, ahead by about 9 pawns.');
  for (const s of ["這步還沒評等（按 📊 賽後報告，Pikafish 會補算，再顯示藍色建議箭頭）", "點棋子可以自由走棋；按 🔍 看 Pikafish 分析。", "✅ 正著：跟 Pikafish 的首選只差 12 分（30 分以內都算正著，手機上快速評等本來就會差這麼一點）。", "📈 這盤你還有 3 步還沒分析完，下次打開會再分析"])
    assert.ok(!CJK.test(R.dbNoteLines(s)), s);
  for (const a of ["紅色", "綠色", "橘色", "棕色", "黃色", "青色", "藍色", "紫色", "白色", "黑色", "灰色", "另一條", "矛形", "毛筆", "彩帶", "連珠"]) {
    assert.ok(!CJK.test(R.dbNoteLines(a + "箭頭是實際走的")), a); assert.ok(!CJK.test(R.i18nText(a + "箭頭")), a + "箭頭") }
});

test("W2：中文照舊——mkNote、tmxPlain、記譜提示泡泡的中文原文沒動；英文分支只在 i18nLang()==\"en\" 時走", { skip: SKIP }, () => {
  const { out } = w2Cases();
  for (const o of out.filter(o => o.key)) { assert.ok(o.key.startsWith("🔎 這盤最關鍵的一步：第 "), o.key); assert.ok(CJK.test(o.key)) }
  assert.ok(D0.includes('else if(KM)note.textContent=typeof tmxEn==="function"&&tmxEn()?mkNoteEn(KM,mvArrowName(),pendLine()):mkNote(KM)+pendLine();'));
  assert.ok(D0.includes('note.textContent=typeof tmxEn==="function"&&tmxEn()?dbNoteLines(nt):nt}}'));
  assert.ok(D0.includes("return[`🔎 這盤最關鍵的一步：第 ${K.p} 步你走「${K.m.cn}」${K.q?`【${K.q}】`:\"\"}`,"), "中文 mkNote 沒動");
  assert.ok(B0.includes('function tmxEn(){try{return typeof i18nLang==="function"&&i18nLang()==="en"}catch(e){return false}}'));
  /* 記譜提示泡泡：英文整句英文、著法 WXF（tmxW）；中文原句照舊 */
  assert.ok(B0.includes('tmxEn()?`💡 <b>Tap</b> a move underlined in blue dashes (like "${esc(tmxW(y.dataset.mv))}") to draw its arrow on the board and explain it in plain words.`:`💡 藍色虛線的走法（像「${esc(y.dataset.mv)}」）<b>點一下</b>，就會在棋盤上畫箭頭，還會用白話說它怎麼走。`'));
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(I18N.slice(I18N.indexOf("\n", I18N.indexOf("#I18N-PURE-BEGIN")) + 1, I18N.indexOf("/* #I18N-PURE-END */")) + ";" + between(B0, "function tmxEn(){", "function tmxPawnEn(") + ";this.W=tmxW;this.E=tmxEn", ctx);
  assert.equal(ctx.W("炮八進七"), "C8+7"); assert.equal(ctx.W("馬２進３"), ctx.W("馬２進３")); assert.equal(ctx.E(), false, "沒有 i18nLang＝中文");
  /* 泡泡文字（模擬 esc 後）沒有中文 */
  const bub = `💡 <b>Tap</b> a move underlined in blue dashes (like "${ctx.W("炮八進七")}") to draw its arrow on the board and explain it in plain words.`;
  assert.ok(!CJK.test(bub) && bub.includes('"C8+7"'));
});

/* ======================= B 第 26 輪：N26-3（popstate 晚到／永遠不來）、N26-2（斷網時擂台頁名被截） ======================= */
/* 虛擬時鐘：setTimeout／Date.now 都照它走，不用真的等 6 秒 */
function topMoreSim(backMode) {
  const S = M("02-shell.js"), src = between(S, "function topMoreItem(b,f,after){", "\nfunction setTabs(");
  const B0 = 1e6; let T = B0, seq = 0; const timers = [], log = [], L = {}, at = {};
  const ctx = { log, at, Date: { now: () => T }, history: { state: { xqSheet: 1 }, n: 0 },
    closeSheet: a => log.push(a === true ? "close(true)" : "close"), addEventListener: (k, f) => { (L[k] = L[k] || []).push(f) }, removeEventListener: (k, f) => { L[k] = (L[k] || []).filter(x => x !== f) },
    setTimeout: (f, ms) => { const id = ++seq; timers.push({ t: T + Math.max(0, +ms || 0), id, f }); return id } };
  const pop = () => { ctx.history.state = null; (L.popstate || []).slice().forEach(f => f()) };
  ctx.history.back = () => { ctx.history.n++; log.push("back"); const d = backMode(ctx.history.n); if (d >= 0) ctx.setTimeout(pop, d) };
  ctx.advance = to => { for (;;) { timers.sort((a, b) => a.t - b.t || a.id - b.id); const x = timers[0]; if (!x || x.t > B0 + to) break; timers.shift(); T = x.t; x.f() } T = B0 + to };
  ctx.now = () => T; ctx.vmFire = k => (L[k] || []).slice().forEach(f => f());
  vm.createContext(ctx); vm.runInContext("function topMoreItem(b,f,after){" + src.slice("function topMoreItem(b,f,after){".length), ctx);
  ctx.press = name => ctx.topMoreItem({ dataset: {} }, () => { log.push(name); at[name] = T - B0 });
  return ctx;
}
test("N26-3：popstate 晚到 2～5 秒、中間再開選單按別項——只退一次、只做新的那項（R25-2 保留）", () => {
  for (const late of [2000, 3000, 4000, 5000]) for (const again of [1700, late - 300]) {
    if (again < 1600) continue;
    const X = topMoreSim(n => n === 1 ? late : 0);
    X.press("回星槎"); X.advance(1500); assert.equal(X.topMoreRun.w, false, "1.5 秒解鎖");
    X.advance(again); X.history.state = { xqSheet: 2 }; X.press("聲控走棋");
    X.advance(9000);
    assert.deepEqual(X.log, ["close(true)", "back", "close(true)", "聲控走棋"], `晚 ${late}ms、${again}ms 再按：` + X.log.join(","));
    assert.equal(X.history.n, 1, "history.back 只呼叫 1 次"); assert.ok(X.at["聲控走棋"] >= late, "等晚到的那一筆到了才做");
  }
});
test("N26-3：popstate 永遠不來——1.5 秒解鎖；再按別項不會永遠等：第一筆送出 6 秒後當它丟了、重送一次，退回到了就做（1514 的「能再用」）", () => {
  for (const again of [1700, 3000, 5900, 7000]) {
    const X = topMoreSim(n => n === 1 ? -1 : 0);
    X.press("回星槎"); X.advance(1500); assert.equal(X.topMoreRun.w, false, "1.5 秒解鎖");
    X.advance(again); X.history.state = { xqSheet: 2 }; X.press("回星槎");
    X.advance(20000);
    assert.deepEqual(X.log, ["close(true)", "back", "close(true)", "back", "回星槎"], again + "ms 再按：" + X.log.join(","));
    assert.equal(X.history.n, 2); assert.equal(X.at["回星槎"], Math.max(again, 6000), "最晚在第一筆送出 6 秒後就做");
    assert.equal(X.topMoreRun.pend, false, "退回到了就清掉"); assert.equal(X.topMoreRun.w, false);
    /* 之後正常再按一次照常 */
    X.history.state = { xqSheet: 3 }; X.press("再一次"); X.advance(21000); assert.equal(X.log.filter(x => x === "再一次").length, 1);
  }
  /* 6 秒內 popstate 來了就不重送（晚到 5.5 秒） */
  const Y = topMoreSim(n => n === 1 ? 5500 : 0); Y.press("a"); Y.advance(2000); Y.history.state = { xqSheet: 2 }; Y.press("b"); Y.advance(20000);
  assert.equal(Y.history.n, 1); assert.deepEqual(Y.log, ["close(true)", "back", "close(true)", "b"]);
  const S = M("02-shell.js");
  assert.ok(S.includes('addEventListener("popstate",go);if(topMoreRun.pend){const p0=topMoreRun.pend;setTimeout(()=>{if(!done&&topMoreRun.pend===p0&&hn()===H)bk()},Math.max(0,(typeof p0==="number"?p0:0)+6000-Date.now()));return true}bk();return true}'));
});

/* N26-2：用假的頂欄量：標題寬＝頂欄寬 − 左右 6 − 返回鈕 − 間距 − 標題左邊 6 − 離線牌 − 右邊鈕；字寬：中文 1.06em、英文粗體襯線約 0.6em（偏寬估）、標題小圖示 1.5em＋6 */
function offtSim(lang, W, text, offline, rightW, backW) {
  const W8 = M("07w8-shichen.js"), cls = new Set(), css = [];
  const fs0 = lang === "en" ? 16 : 18, wOf = (s, px) => [...s].reduce((a, c) => a + (/[㐀-鿿]/.test(c) ? px * 1.06 : c === " " ? px * .3 : px * .6), 0);
  const back = () => cls.has("offt2") ? 40 : backW, font = () => cls.has("offt2") ? 13 : cls.has("offt1") ? 14 : fs0, icon = () => cls.has("offt1") ? 0 : font() * 1.5 + 6;
  const avail = () => W - 6 - back() - 4 - 6 - 4 - (offline ? 39 + 4 : 0) - rightW - 6;   /* 照 B 量的 390 擂台校過：中文標題字寬 106（83～195 扣左邊 6）、英文 54（135～195） */
  /* 英文窄螢幕可以兩行、不在字中間斷：每個字都要放得下、總共不超過兩行 */
  const lines = () => { const a = avail(); let n = 1, cur = icon(); for (const w of text.split(" ")) { const ww = wOf(w, font()); if (ww > a) return 99; if (cur + (cur ? wOf(" ", font()) : 0) + ww > a) { n++; cur = ww } else cur += (cur ? wOf(" ", font()) : 0) + ww } return n };
  const title = { textContent: text, get clientWidth() { return avail() }, get scrollWidth() { return lang === "en" ? (lines() === 99 ? avail() + 50 : avail()) : icon() + wOf(text, font()) }, get clientHeight() { return 40 }, get scrollHeight() { return lang === "en" ? (lines() > 2 ? 60 : 40) : 40 } };
  const tb = { classList: { add: (...a) => a.forEach(x => cls.add(x)), remove: (...a) => a.forEach(x => cls.delete(x)), contains: x => cls.has(x) } };
  const doc = { getElementById: id => ({ topbar: tb, title, offChip: offline ? {} : null, offtCss: css.length ? {} : null }[id] || null), createElement: () => ({}), head: { append: x => css.push(x) } };
  const ctx = { document: doc }; vm.createContext(ctx);
  vm.runInContext(between(W8, "const OFFT_CSS=", "\n{let offtQ=0;") + ";this.offtFit=offtFit", ctx);
  ctx.offtFit();
  const fits = lang === "en" ? lines() <= 2 : icon() + wOf(text, font()) <= avail() + 1;   /* 跟 offtFit 一樣容許 1px（scrollWidth 取整數） */
  return { cls: [...cls].sort().join(" "), fits, avail: Math.round(avail()), font: font(), back: back() };
}
test("N26-2：斷網時 390 寬擂台頁名放得下——中文「朝代擂台」縮字、英文「Dynasty Arena」縮字＋返回鈕只留 ‹；連線時什麼都不動", () => {
  /* 測試員 B 量的 390 寬擂台：離線牌 39px、右邊鈕從 242 到 384（約 142px）；返回鈕中文 6～79、英文 6～131 */
  const rows = [];
  for (const W of [320, 375, 390, 393, 430]) for (const [lang, text, backW] of [["zh", "朝代擂台", 73], ["en", "Dynasty Arena", 125], ["zh", "古戰場・漢朝", 73], ["en", "Ancient Battlefield", 125]]) {
    const on = offtSim(lang, W, text, false, 142, backW), off = offtSim(lang, W, text, true, 142, backW);
    assert.equal(on.cls, "", `${W} ${lang} 連線不動`);
    rows.push(`${W} ${lang} ${text}：離線 ${off.cls || "不縮"}、標題寬 ${off.avail}、字 ${off.font}px、返回鈕 ${off.back}`);
    if (W >= 375 || /^(朝代擂台|Dynasty Arena)$/.test(text)) assert.ok(off.fits, rows[rows.length - 1]);   /* 320 寬只保證「朝代擂台」這種長度（右邊鈕 142px 時，6 個字的頁名 320 寬放不下，照舊刪節號） */
  }
  assert.match(rows.find(r => r.startsWith("390 zh 朝代擂台")), /offt1/); assert.match(rows.find(r => r.startsWith("390 en Dynasty Arena")), /offt1 offt2/);
  if (process.env.R26_ROWS) console.log(rows.join(String.fromCharCode(10)));
  /* 原始碼：只在有離線牌時才縮；網路回來就恢復；換頁、標題改字、牌子出現消失、轉向都重算 */
  const W8 = M("07w8-shichen.js");
  /* 第 27 輪 X4 起：480 寬以下連線時也照實際寬度判斷（返回鈕只留 ‹ 限斷網或短頁名），細測在 test-r27-1117.js */
  assert.ok(W8.includes('if((off||nar)&&!tb.classList.contains("clk-nt")&&tx)'));
  assert.ok(W8.includes('for(const k of ["online","offline","resize","hashchange"])addEventListener(k,kick)'));
  assert.ok(W8.includes("#topbar.offt2 #back{font-size:0!important;padding:0 6px!important;min-width:40px;max-width:none!important;text-align:center}#topbar.offt2 #back b{font-size:28px!important}"), "返回鈕留 ‹（44px 以內可點，aria 文字照舊）");
});

/* ======================= E 第 26 輪：R26-2（漏掉 popstate 後自己換頁）、R26-3（斷網英雄帖）、R26-4（找對手中途斷網那句）、R26-5（離線牌縮小規則冷開就生效） ======================= */
test("R26-2：退上一頁漏掉後，玩家自己換頁——排隊中的選單項目不做、「還有一筆在路上」清掉、6 秒也不重送；新頁面的選單照常", () => {
  for (const [second, navAt] of [[null, 3000], ["聲控走棋", 3000], ["聲控走棋", 7000], [null, 800]]) {
    const X = topMoreSim(n => n === 1 ? -1 : 0), L2 = {};
    X.location = { hash: "#/arena" };
    /* 換頁：Chrome 改網址的片段時先 popstate 再 hashchange（兩個都送） */
    const nav = h => { X.location.hash = h; X.history.state = null; X.vmFire("popstate"); X.vmFire("hashchange") };
    X.press("回星槎");
    if (second) { X.advance(1700); X.history.state = { xqSheet: 2 }; X.press(second) }
    X.advance(navAt); if (navAt < 6000 || !second) nav("#/cpu"); else nav("#/cpu");
    X.advance(30000);
    const tag = `${second || "只按一次"}、${navAt}ms 換頁：` + X.log.join(",");
    if (second && navAt >= 6000) {
      /* 6 秒到時還在原頁：重送、做了第二項（回到原頁），之後才換頁，不會再做別的 */
      assert.ok(X.log.filter(x => x === second).length === 1 && !X.log.includes("回星槎"), tag);
    } else {
      assert.ok(!X.log.includes("回星槎") && !X.log.includes("聲控走棋"), tag);
      assert.equal(X.history.n, 1, "沒有重送：" + tag);
    }
    assert.equal(X.topMoreRun.pend, false, tag); assert.equal(X.topMoreRun.w, false, tag); assert.equal(X.topMoreRun.h, null, tag);
    /* 新頁面再開選單照常 */
    X.history.state = { xqSheet: 9 }; X.press("新頁面的項目"); X.advance(40000); assert.equal(X.log.filter(x => x === "新頁面的項目").length, 1, tag);
  }
  const S = M("02-shell.js");
  assert.ok(S.includes('go=()=>{if(done)return;if(hn()!==H){topMoreRun.drop();return}'));
  assert.ok(S.includes('try{addEventListener("hashchange",()=>{let h=null;try{h=location.hash}catch(e){}if(topMoreRun.h!=null&&h!==topMoreRun.h)topMoreRun.drop()})}catch(e){}'));
});

function lobbyOffSim(seekingAtStart, clearFirst) {
  const X = M("07x2-lobbymap.js"), i = X.indexOf("const LM_NET_HASH="), tail = "addEventListener(\"hashchange\",lmSkHook);lmSkHook()}catch(e){}", j = X.indexOf(tail) + tail.length;
  assert.ok(i >= 0 && j > i);
  let sk = seekingAtStart, T = 1e6; const log = [], NL = {}, WL = { cap: {}, bub: {} }, timers = [];
  const XQNet = { seeking: () => sk, on: (k, f) => { (NL[k] = NL[k] || []).push(f); return () => {} }, _set(v) { sk = v; (NL.people || []).forEach(f => f()) } };
  const ctx = { log, navigator: { onLine: true }, location: { hash: "#/lobby" }, Date: { now: () => T }, XQNet, window: { XQNet },
    document: { addEventListener() {}, getElementById: () => null, querySelector: s => s === "#sk0" && sk ? { click: () => { log.push("sk0"); XQNet._set(false) } } : null },
    toast: m => log.push("toast:" + m), offInfo() {}, vibrate() {}, setTimeout: (f, ms) => timers.push(f),
    addEventListener: (k, f, c) => { const b = c ? WL.cap : WL.bub; (b[k] = b[k] || []).push(f) } };
  vm.createContext(ctx); vm.runInContext(X.slice(i, j), ctx);
  /* 斷網：先捕獲、再照註冊順序（05-settings 的 offline 比 07x2 早註冊：離線牌、一般提示、大廳重畫——重畫時找對手被收掉） */
  ctx.offline = () => { ctx.navigator.onLine = false; T += 10; (WL.cap.offline || []).forEach(f => f());
    log.push("toast:📴 沒有網路了（一般提示）"); if (clearFirst) XQNet._set(false);
    (WL.bub.offline || []).forEach(f => f()); while (timers.length) timers.shift()() };
  return ctx;
}
test("R26-4：找對手中途斷網——不管連線模組或大廳重畫先把找對手收掉，「網路斷了，已取消找對手」都會出現、而且只說一次、在一般提示之後", () => {
  const SAY = "toast:📴 網路斷了，已取消找對手；連上網路再配對";
  { const A = lobbyOffSim(true, true); A.offline(); assert.equal(A.log.filter(x => x === SAY).length, 1, A.log.join(" | ")); assert.equal(A.log[A.log.length - 1], SAY, "蓋過一般提示") }
  { const A = lobbyOffSim(true, false); A.offline(); assert.ok(A.log.includes("sk0"), "還在找就按取消"); assert.equal(A.log.filter(x => x === SAY).length, 1, A.log.join(" | ")) }
  { const A = lobbyOffSim(false, false); A.offline(); assert.equal(A.log.filter(x => x === SAY).length, 0, "沒在找對手就不說") }
  /* 有網路時自己取消找對手：不說 */
  { const A = lobbyOffSim(true, false); A.XQNet._set(false); assert.equal(A.log.filter(x => x === SAY).length, 0) }
  assert.ok(M("07x2-lobbymap.js").includes('try{document.addEventListener("click",lmOffGuard,true);addEventListener("offline",()=>setTimeout(lmOffSeek,0))}catch(e){}'), "R25-1 那行照舊");
});
test("R26-3：斷網時千秋盃茶樓的「英雄帖」直接跳離線說明（跟其他要連線的入口一樣）；有網路照常開面板", () => {
  const X = M("07x2-lobbymap.js"), src = between(X, "const LM_NET_HASH=", "\ntry{document.addEventListener(\"click\",lmOffGuard,true);");
  const mk = online => { const log = []; const ctx = { log, navigator: { onLine: online }, location: { hash: "#/cup" }, document: { getElementById: () => ({ contains: () => true }) }, offInfo: () => log.push("offInfo"), toast() {}, vibrate() {}, Date };
    vm.createContext(ctx); vm.runInContext(src, ctx); return ctx };
  const ev = sel => ({ stopped: 0, target: { closest: s => s.split(",").includes(sel) ? {} : null }, preventDefault() { this.stopped++ }, stopImmediatePropagation() { this.stopped++ } });
  { const A = mk(false), e = ev("#cp2Book"); assert.equal(A.lmOffGuard(e), true); assert.equal(e.stopped, 2); assert.deepEqual(A.log, ["offInfo"]) }
  { const A = mk(true), e = ev("#cp2Book"); assert.equal(A.lmOffGuard(e), false, "有網路照常") }
  assert.ok(M("07y7-cupmap.js").includes('id="cp2Book"'), "英雄帖的 id 對得上");
  assert.ok(M("05-settings.js").includes("<h2>目前沒有網路</h2>"), "離線說明（中文；英文由字典翻，R25-1 已測）");
});
test("R26-5：離線牌窄螢幕縮成 📴 的規則在 07w8 載入時就插進頁面（不等時辰鐘）；中英都一樣", () => {
  const W8 = M("07w8-shichen.js"), heads = [];
  const doc = { getElementById: id => heads.some(x => x.id === id) ? {} : null, createElement: () => ({}), head: { append: x => heads.push(x) } };
  const ctx = { document: doc }; vm.createContext(ctx);
  vm.runInContext(between(W8, "const OFFT_CSS=", "\n{let offtQ=0;"), ctx);
  assert.equal(heads.length, 1, "一載入就插（沒呼叫 offtFit、沒經過時辰鐘）"); assert.equal(heads[0].id, "offtCss");
  const css = heads[0].textContent;
  assert.ok(css.startsWith('#topbar #offChip{position:relative;z-index:2}@media (max-width:480px){#topbar #offChip{font-size:0!important;padding:6px 8px!important}#topbar #offChip::before{content:"📴";font-size:15px;line-height:1}}'));
  assert.ok(!/html\[lang/.test(css.split("#topbar.offt1")[0]), "不分語言：中文也縮");
  assert.ok(W8.indexOf("try{offtCss()}catch(e){}") > W8.indexOf("function offtCss()") && !/if\(CLK_ON\)\{?try\{offtCss/.test(W8), "不包在時辰鐘的開關裡");
});
