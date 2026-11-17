// 11/17 第 28 輪（候選版 1757 複驗後）：D Y1 推演著法紀錄、Y2 返回鈕換字後標題沒重算、Y3／E R28-1 窄螢幕離線牌、Y4 換季小籤英文、Y5 月亮熱區；E R28-2 320 寬挑戰電腦分頁鈕。
// 標準：App Store 審查 2.1、4.0。不開瀏覽器，vm／純計算（畫面上實際位置請瀏覽器複驗）。外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法：node --test xiangqi-lab/tools/test-r28-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const grab = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到 " + a); const re = /\n(?=\S)/g; re.lastIndex = i + 1; const m = re.exec(s); return s.slice(i, m ? m.index : s.length) };
const num = (src, re, what) => { const m = src.match(re); assert.ok(m, "讀不到 " + what); return parseFloat(m[1]) };
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const I18N = M("07i18n.js"), W8 = M("07w8-shichen.js"), W7 = M("07w7-seasons.js"), D0 = M("10-db.js"), SP = M("07w6c-scenepoem.js");
function i18nKit() {
  const ctx = {}; vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;this.i18nWxf=i18nWxf;", ctx);
  if (HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}

/* ---------- Y5：月亮熱區 ---------- */
test("Y5：入夜後首頁月亮熱區的 aria-label／title 英文（「Moon: hear a poem from the ages」、某一朝「Moon: hear a Tang poem」）；中文照舊", () => {
  const J = JSON.parse(rd("xiangqi-lab/site/data/poems/poems.json"));
  const load = en => { const ctx = { tmxEn: () => en }; vm.createContext(ctx); vm.runInContext(between(SP, "const SPM_EN =", "/* 輪播：") + ";this.L=spmLabel", ctx); return ctx.L };
  const E = load(true), Z = load(false);
  assert.equal(E(J, "moon", "classic"), "Moon: hear a poem from the ages");
  assert.equal(E(J, "moon", "tang"), "Moon: hear a Tang poem"); assert.equal(E(J, "moon", "song"), "Moon: hear a Song poem");
  for (const era of Object.keys(J.eraLabel)) assert.ok(!CJK.test(E(J, "moon", era)), era);
  assert.equal(Z(J, "moon", "classic"), "月亮：聽一首歷代詩"); assert.equal(Z(J, "moon", "tang"), "月亮：聽一首唐詩");
  /* 熱區只有月亮一個（poems.json objects），每個都有英文名 */
  for (const k of Object.keys(J.objects)) assert.ok(/^[A-Z]/.test(E(J, k, "classic")), k);
  /* 詩卡：標頭、出處、查證原文、再一首、空的時候、表頭 🌙 都有英文（詩本身照原文） */
  for (const s of ['"(No poems for this dynasty yet)"', '"poems through the ages"', '"Source: "', '"Check the original"', '"🔁 Another poem"', '" (excerpt)"', 'sheet("🌙 " + (spmEn() ? spmNameEn(obj) : nm)']) assert.ok(SP.includes(s), s);
});

/* ---------- Y1：推演的著法紀錄 ---------- */
test("Y1：自由走棋（推演）的著法紀錄英文：「1. Red C8.5 [Attacks Soldier] Best」——方別、戰術標籤全套、評語、WXF；推演來源也英文", { skip: SKIP }, () => {
  const K = i18nKit(), ctx = { tmxT: s => { const t = K.i18nText(s); return t && !CJK.test(t) ? t : s }, tmxW: cn => K.i18nWxf(cn) || cn };
  vm.createContext(ctx); vm.runInContext(between(D0, "const DB_PC_EN=", "function dbNoteLines(") + ";this.N=dbFreeNoteEn;this.S=dbSrcEn;this.G=dbTagEn", ctx);
  assert.equal(ctx.N({ base: 0, cur: 1 }, { by: "r", cn: "炮八平五", tags: ["捉卒"], g: { q: "正著" } }), "1. Red C8.5 [Attacks Soldier] Best");
  /* local.js lineInfo 會出的標籤：吃X、將軍、捉X、Y、將死、困斃 */
  const P = ["帥", "仕", "相", "傌", "俥", "炮", "兵", "將", "士", "象", "馬", "車", "砲", "卒"];
  for (const p of P) { assert.ok(/^Captures [A-Z][a-z]+$/.test(ctx.G("吃" + p)), p); assert.ok(/^Attacks [A-Z][a-z]+$/.test(ctx.G("捉" + p)), p) }
  assert.equal(ctx.G("捉車、馬"), "Attacks Chariot & Horse"); assert.equal(ctx.G("將軍"), "Check"); assert.equal(ctx.G("將死"), "Checkmate"); assert.equal(ctx.G("困斃"), "Stalemate");
  const LI = rd("xiangqi-lab/site/local.js"); for (const s of ['tags.push("吃"+', 'tags.push("將軍")', 'tags.push("捉"+chased.join("、"))', 'tags.push(ck?"將死":"困斃")']) assert.ok(LI.includes(s), "標籤來源：" + s);
  const s2 = ctx.N({ base: 4, cur: 3 }, { by: "b", cn: "馬８進７", tags: ["吃兵", "將軍"], g: { q: "緩著", bc: "車1進1" } });
  assert.equal(s2, "7. Black H8+7 [Captures Soldier, Check] Slow\nPikafish prefers: R1+1"); assert.ok(!CJK.test(s2));
  assert.ok(!CJK.test(ctx.N({ base: 3, cur: 0, src: "Pikafish 雙方接著下" }, null)));
  for (const [z, e] of [["自由走棋", "Free play"], ["Pikafish 雙方接著下", "Pikafish plays on for both sides"], ["Pikafish 雙方接著下＋自己改走", "Pikafish plays on for both sides + your own moves"], [undefined, "Free play"]]) assert.equal(ctx.S(z), e);
  assert.match(ctx.S("Pikafish 第 2 條變化（黑方稍好，約領先 1.4 個兵）"), /^Pikafish line 2 \(Black slightly better/);
  assert.ok(D0.includes('if(typeof tmxEn==="function"&&tmxEn())note.textContent=dbFreeNoteEn(FREE,m);else'), "中文照舊");
});

/* ---------- Y4：換季小籤 ---------- */
test("Y4：英文換季小籤「Winter is here」（四季），古詩文和出處英文；《論語》用 Legge 譯本、標 Analects；中文照舊", () => {
  const E = vm.runInNewContext("(" + between(W7, "const SW7_SEA_EN=", "\nfunction sw7SeaPlay(").replace("const SW7_SEA_EN=", "").replace(/;\s*$/, "") + ")");
  assert.deepEqual(Object.keys(E).sort(), ["autumn", "spring", "summer", "winter"]);
  for (const [k, n] of [["spring", "Spring is here"], ["summer", "Summer is here"], ["autumn", "Autumn is here"], ["winter", "Winter is here"]]) { assert.equal(E[k].n, n); assert.ok(!CJK.test(E[k].q + E[k].s), k) }
  assert.equal(E.winter.q, "When the year becomes cold, then we know how the pine and the cypress are the last to lose their leaves.");
  assert.match(E.winter.s, /Analects/); assert.match(E.winter.s, /Legge/);
  assert.ok(W7.includes("sl.innerHTML=CE?`<b>${C.e} ${esc(CE.n)}</b><q>${esc(CE.q)}</q><small>${esc(CE.s)}</small>`:`<b>${C.e} ${esc(C.n)}</b><q>${esc(C.q)}</q><small>${esc(C.s)}</small>`;"), "中文照舊");
  assert.ok(W7.includes('const ck=Object.keys(SW7_SEA_TXT).find(k=>SW7_SEA_TXT[k]===C),CE=typeof tmxEn==="function"&&tmxEn()&&SW7_SEA_EN[ck];'), "跟小籤同一季（照節氣）");
});

/* ---------- Y2：返回鈕換字後重算 ---------- */
test("Y2：返回鈕的字（英文 ‹Back to Ferry）晚換上去時也重算標題寬度（斷網時照樣縮成只留 ‹）", () => {
  assert.ok(W8.includes('const bk=document.getElementById("back");if(bk)new MutationObserver(kick).observe(bk,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:["hidden"]})'));
  assert.ok(W8.includes('if(ov()){tb.classList.add("offt1");if(ov()&&(off||tx.length<=18))tb.classList.add("offt2")}'), "斷網時放不下就返回鈕只留 ‹");
  /* 模擬：返回鈕從「‹ 回渡口」換成「‹Back to Ferry」，觀察者觸發 → offtFit 重算 */
  const obs = [], timers = [];
  const ctx = { MutationObserver: class { constructor(f) { this.f = f } observe(el) { obs.push([el.id, this.f]) } }, addEventListener() {}, setTimeout: f => { timers.push(f); return timers.length }, document: { readyState: "complete", getElementById: id => ({ id }), head: { append() {} }, createElement: () => ({}) } };
  const run = () => { while (timers.length) timers.shift()() };
  /* 真的 offtFit 換成計數器（後宣告的同名函式蓋掉前面的），其他照原始碼 */
  vm.createContext(ctx); vm.runInContext(between(W8, "const OFFT_CSS=", "\n{let offtQ=0;") + ";function offtFit(){globalThis.FITS=(globalThis.FITS||0)+1}" + W8.slice(W8.indexOf("\n{let offtQ=0;")), ctx);
  run(); const n0 = ctx.FITS || 0; assert.ok(n0 >= 1, "開頁算一次");
  const b = obs.find(o => o[0] === "back"); assert.ok(b, "有盯返回鈕"); b[1](); run(); assert.equal(ctx.FITS, n0 + 1, "返回鈕改字就重算");
});

/* ---------- Y3／R28-1：窄螢幕離線牌 ---------- */
test("Y3／R28-1：有時辰鐘的頁，縮小的離線牌可點範圍撐到 44×44（往上長、不蓋到時辰字和星晷）；320 寬英文頂欄多一條給牌子，不再壓到星晷外圈", () => {
  const OF = W8.slice(W8.indexOf("const OFFT_CSS="), W8.indexOf("\n", W8.indexOf("const OFFT_CSS=")));
  /* 11/17 第 29 輪 R29-8：熱區改成從頂欄上面多留的那一條往下長（test-r29e-1117.js 驗）；這裡只留「不壓到時辰字、星晷」的舊算法不適用的部分 */
  assert.ok(OF.includes("#topbar.clk-on #offChip::after{top:-3px;transform:translateX(-50%)}") && OF.includes("#topbar.clk-on:has(#offChip){padding-top:calc(var(--safeT,0px) + 26px)}"), "透明熱區規則");
  /* 數值從 CSS 讀：牌子 = 圖示 + 上下留白 + 外框；中文一行頂欄的時辰字從哪裡起 */
  const icon = num(OF, /#topbar #offChip::before\{content:\\?"📴\\?";font-size:(\d+)px/, "圖示"), padV = num(OF, /#topbar\.clk-on #offChip\{align-self:flex-start;[^}]*padding:(\d+)px \d+px!important/, "留白"), bd = num(M("05-settings.js"), /c\.style\.cssText="flex:none;border:([\d.]+)px solid/, "外框");
  const padT = num(W8, /#topbar\.clk-on\{position:relative;padding-top:calc\(var\(--safeT,0px\) \+ (\d+)px\)/, "padding-top"), lh = num(W8, /#topbar\.clk-on #title\{[^}]*line-height:(\d+)px/, "行高"), tPadB = num(W8, /#topbar\.clk-on #title\{[^}]*padding-bottom:(\d+)px/, "標題底下"), border = 3, clkBot = 2;
  const chipH = icon + 2 * padV + 2 * bd, H1 = padT + lh + tPadB + 2 + border, textTop = H1 - border - clkBot - (11.5 * 1.3 + 15 * 1.2 + 1);
  /* 斷網時頂欄上面多 24px（2→26）：熱區從頂端（safeT）往下 44px，時辰字整個往下移 24px */
  const extra = 26 - padT, hitBottomY = 44; assert.ok(chipH <= 26 - 3, "牌子放得進上面那一條");
  assert.ok(hitBottomY <= textTop + extra + 0.5, `熱區底邊 ${hitBottomY}、時辰字 ${(textTop + extra).toFixed(1)} 起`);
});

/* ---------- R28-2：320 寬挑戰電腦 ---------- */
test("R28-2：360 寬以下標題是分頁鈕的頁（挑戰電腦）不放離線牌，分頁鈕拿回寬度；其他頁照常有牌子", () => {
  const OF = W8.slice(W8.indexOf("const OFFT_CSS="), W8.indexOf("\n", W8.indexOf("const OFFT_CSS=")));
  const i = OF.indexOf("#topbar:has(.cpu-seg) #offChip{display:none!important}"); assert.ok(i > 0);
  const media = OF.lastIndexOf("@media (max-width:360px){", i); assert.ok(media >= 0 && OF.indexOf("}}", media) > i, "包在 360 寬以下");
  assert.ok(!/#topbar #offChip\{display:none/.test(OF), "沒有全面拿掉");
  /* 寬度：E 量的 320 寬斷網每顆 30px；牌子佔 39＋間距 4 拿回來、平分給兩顆 → 51.5px，11px 換行時「Practice」約 51px 放得下 */
  const each = 30 + 43 / 2, word = 8 * 11 * 0.58; assert.ok(word <= each, `每顆 ${each}、Practice ${word.toFixed(0)}`);
});

/* ======================= B 第 28 輪：N28-1 首頁開著跨過入夜換圖、N28-2 只看主題的頁改照日落、N28-5 320 寬英文首頁標題 ======================= */
const Z = M("07z-homemap.js");
function hmSim(o) {
  const loaded = [], q = [];
  class FakeImg { set src(v) { this._s = v; q.push(() => (o.bad && o.bad.some(b => v.includes(b)) ? this.onerror && this.onerror() : this.onload && this.onload())) } get src() { return this._s } }
  const im0 = { src: "data/homemap/home_classic_winter.webp?v=1" }, calls = [];
  const P = { isConnected: true, dataset: { hmw: o.hmw || "" }, _hmWv: o.cur, querySelector: () => im0 };
  const ctx = { Image: FakeImg, HM_IMGV: 1, HMP_IMGV: 1, sw7HomeWx: () => o.now, hbIsCl: () => true, hmpVar: (hk, wv, cl) => (o.pano && cl ? wv : ""), hmpSrc: (v, s) => `data/homemap/home_${v}_pano_${s}.webp?v=1`,
    hmpSet: () => calls.push("hmpSet"), sw7Tick: () => calls.push("sw7Tick") };
  vm.createContext(ctx); vm.runInContext(Z.slice(Z.indexOf("function hmWvRefresh(P){")) + ";this.f=hmWvRefresh", ctx);
  const r = ctx.f(P); return { r, P, im0, calls, flush: () => { while (q.length) q.shift()() } };
}
test("N28-1：首頁開著跨過入夜／天亮——每分鐘問 sw7HomeWx，變了就把中間那張和長卷兩屏都載好再一起換（不閃白）；載不到留原圖；沒變不動", () => {
  { const S = hmSim({ cur: "classic_winter", now: "classic_winter_night", pano: true });
    assert.equal(S.r, true); assert.equal(S.im0.src, "data/homemap/home_classic_winter.webp?v=1", "還沒載好前不換");
    S.flush(); assert.equal(S.im0.src, "data/homemap/home_classic_winter_night.webp?v=1", "三張都載好才換"); assert.equal(S.P._hmWv, "classic_winter_night"); assert.equal(S.P._hmpWv, "classic_winter_night");
    assert.deepEqual(S.calls, ["hmpSet", "sw7Tick"], "長卷跟著換、07w7 重畫（夜景圖換到了就拿掉月夜層）") }
  { const S = hmSim({ cur: "classic_winter_night", now: "classic_winter", pano: true }); S.flush(); assert.equal(S.im0.src, "data/homemap/home_classic_winter.webp?v=1", "天亮換回來") }
  { const S = hmSim({ cur: "classic_winter", now: "classic_winter_night", pano: true, bad: ["_pano_r"] }); S.flush(); assert.equal(S.im0.src, "data/homemap/home_classic_winter.webp?v=1", "任何一張載不到就留原圖"); assert.equal(S.P._hmWv, "classic_winter"); assert.deepEqual(S.calls, []) }
  { const S = hmSim({ cur: "classic_winter", now: "classic_winter" }); assert.equal(S.r, false, "沒變不動") }
  { const S = hmSim({ cur: "", now: "spring_night", hmw: "p34" }); assert.equal(S.r, false, "寬版（沒有變體時才用）不在這裡換") }
  assert.ok(Z.includes("if(!hk){P._hmWv=wv;const tm=setInterval(()=>{if(!P.isConnected){clearInterval(tm);return}try{hmWvRefresh(P)}catch(e){}},60000)}"), "每 60 秒，跟西市、觀星臺一樣");
});
test("N28-2：原本只看深色主題的六頁都有夜版圖，改成也照實際日落（xqNight）；深色主題照舊", () => {
  const L = [["07c2-canjumap.js", "cjmDark", "canjumap", "canju"], ["07s2-setmap.js", "smDark", "setmap", "set"], ["07s3-feedback.js", "fbpDark", "feedback", "fb"], ["07y2-campmap.js", "cpDark", "campmap", "camp"], ["07y3-thememap.js", "tmDark", "thememap", "theme"], ["07y4-termsmap.js", "tb2Dark", "termsmap", "terms"]];
  const DATA = path.join(ROOT, "xiangqi-lab/site/data");
  for (const [f, n, dir, pre] of L) {
    const src = grab(M(f), "const " + n + "=").replace(/^const /, "var ");
    for (const [theme, sys, night, want] of [["light", false, true, true], ["light", false, false, false], ["dark", false, false, true], ["auto", true, false, true], ["auto", false, true, true]]) {
      const ctx = { store: { get: () => theme }, matchMedia: () => ({ matches: sys }), xqNight: () => night }; vm.createContext(ctx); vm.runInContext(src, ctx);
      assert.equal(ctx[n](), want, `${f} 主題 ${theme} 系統深色 ${sys} 夜 ${night}`);
    }
    if (fs.existsSync(DATA)) { const fl = fs.readdirSync(path.join(DATA, dir)); const days = fl.filter(x => x.startsWith(pre + "_day")); assert.ok(days.length > 0, dir); for (const d of days) assert.ok(fl.includes(d.replace("_day", "_night")), `${dir}：${d} 有對應的夜版`) }
  }
});
test("N28-5：360 寬以下英文有時辰鐘的頁，標題一行在最上面（整條寬度），星晷、時辰字在下面；連線、斷網都不疊；標題寬度放得下 Xiangqi Qianqiu", () => {
  const css = vm.runInNewContext(between(I18N, "const I18N_CSS=", "function i18nCss()").replace(/^const I18N_CSS=/, "").replace(/;\s*$/, ""));
  const m = css.match(/@media \(max-width:360px\)\{html\[lang=en\] #topbar\.clk-on:not\(\.clk-nt\) #title\{padding-left:(\d+)px!important;padding-bottom:(\d+)px!important;white-space:nowrap!important;-webkit-line-clamp:1!important;max-height:none!important\}\}/); assert.ok(m);
  const pl = +m[1], pb = +m[2];
  const padT = num(W8, /#topbar\.clk-on\{position:relative;padding-top:calc\(var\(--safeT,0px\) \+ (\d+)px\)/, "padding-top"), lh = num(W8, /#topbar\.clk-on #title\{[^}]*line-height:(\d+)px/, "行高"), dial = num(W8, /\.clk-dial\{[^}]*height:(\d+)px/, "星晷"), border = 3, clkBot = 2, padB = 2;
  const OF = W8.slice(W8.indexOf("const OFFT_CSS="), W8.indexOf("\n", W8.indexOf("const OFFT_CSS="))), band = num(OF, /#topbar\.clk-on:has\(#offChip\)\{padding-top:calc\(var\(--safeT,0px\) \+ (\d+)px\)\}/, "斷網多的那條");
  for (const top of [padT, band]) {   /* 連線、斷網 */
    const H = top + lh + pb + padB + border, dialTop = H - border - clkBot - dial;
    assert.ok(top + lh <= dialTop, `頂欄 ${H}：標題 ${top}～${top + lh}、星晷 ${dialTop} 起`); assert.ok(pb >= dial, "底下讓的高度夠放星晷");
  }
  /* 寬度（輸入值是測試員 E 量的 320 寬連線：標題字寬 72，加上不再讓左邊的 62−6）：13～14px 的 Xiangqi Qianqiu 一行放得下 */
  const width = 72 + 62 - pl, need = px => 15 * px * 0.55;
  assert.ok(need(13) <= width, `寬 ${width}、需要 ${need(13).toFixed(0)}`);
  assert.ok(need(17) * 0.5 > 72 - 62, "對照：原本兩行、讓左邊 62px 時，每行只剩幾十 px（B 看到的 Xi…）");
});
