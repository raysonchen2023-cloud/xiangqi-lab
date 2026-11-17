// 11/17 第 27 輪（候選版 1707 複驗後）：E R27-1 找對手中途斷網那句偶爾沒出現、R27-2／D X2 320 寬斷網首頁頂欄；
//   D X1 英文檢討頁狀態列、X3 沒有標題的頁英文頂欄被撐高、X4 擂台頁名放得下也縮字／320 寬連線被截、「Dynasty Arena」大小寫。
// 標準：App Store 審查 2.1、4.0。不開瀏覽器，vm／純計算。外掛字典只放 CDN，公開副本沒有：沒有檔案就標略過。
// 用法：node --test xiangqi-lab/tools/test-r27-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a + " … " + b); return s.slice(i, j) };
const EXT = path.join(ROOT, "xiangqi-db", "i18n-en.json"), HAS_EXT = fs.existsSync(EXT), SKIP = HAS_EXT ? false : "沒有 xiangqi-db/i18n-en.json（只放 CDN）";
const grab = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到 " + a); const re = /\n(?=\S)/g; re.lastIndex = i + 1; const m = re.exec(s); return s.slice(i, m ? m.index : s.length) };
const CJK = /[\u3400-\u9fff\uf900-\ufaff]/;
const I18N = M("07i18n.js"), W8 = M("07w8-shichen.js"), X2 = M("07x2-lobbymap.js"), D0 = M("10-db.js");
const I18N_CSS = vm.runInNewContext(between(I18N, "const I18N_CSS=", "function i18nCss()").replace(/^const I18N_CSS=/, "").replace(/;\s*$/, ""));
function i18nKit() {
  const ctx = {}; vm.createContext(ctx);
  const a = I18N.indexOf("#I18N-PURE-BEGIN"), b = I18N.indexOf("/* #I18N-PURE-END */");
  vm.runInContext(I18N.slice(I18N.indexOf("\n", a) + 1, b) + ";this.i18nText=i18nText;this.i18nExtMerge=i18nExtMerge;this.i18nWxf=i18nWxf;", ctx);
  if (HAS_EXT) ctx.i18nExtMerge(JSON.parse(fs.readFileSync(EXT, "utf8")));
  return ctx;
}

/* ---------- R27-1：找對手中途斷網 ---------- */
/* 照真實順序：網路通知（連線斷、找對手可能先被收掉）→ offline 捕獲階段 → 照註冊順序的 offline（05-settings：一般提示、大廳重畫）→ 07x2 → 計時器 */
function lobbySim(o) {
  const i = X2.indexOf("const LM_NET_HASH="), tail = "addEventListener(\"hashchange\",lmSkHook);lmSkHook()}catch(e){}", j = X2.indexOf(tail) + tail.length;
  let sk = !!o.seeking, st = "up", T = 1e6; const log = [], NL = {}, WL = { cap: {}, bub: {} }, timers = [];
  const XQNet = { seeking: () => sk, status: () => st, on: (k, f) => { (NL[k] = NL[k] || []).push(f); return () => {} }, _set(v) { sk = v; (NL.people || []).forEach(f => f()) }, _st(v) { st = v } };
  const ctx = { log, navigator: { onLine: true }, location: { hash: "#/lobby" }, Date: { now: () => T }, XQNet, window: { XQNet },
    document: { addEventListener() {}, getElementById: () => null, querySelector: s => s === "#sk0" && (sk || o.sk0Shown) ? { click: () => { log.push("sk0"); XQNet._set(false) } } : null },
    toast: m => log.push("toast:" + m), offInfo() {}, vibrate() {}, setTimeout: (f, ms) => { timers.push({ t: T + (ms || 0), f }); return timers.length },
    addEventListener: (k, f, c) => { const b = c ? WL.cap : WL.bub; (b[k] = b[k] || []).push(f) } };
  vm.createContext(ctx); vm.runInContext(X2.slice(i, j), ctx);
  ctx.run = ms => { const end = T + ms; for (;;) { timers.sort((a, b) => a.t - b.t); const x = timers[0]; if (!x || x.t > end) break; timers.shift(); T = x.t; x.f() } T = end };
  ctx.offline = () => {
    if (o.dropFirst) { st = "connecting"; if (o.clearOnDrop) XQNet._set(false); ctx.run(o.dropFirst) }   /* 連線先斷（網路通知比 offline 早） */
    ctx.navigator.onLine = false; (WL.cap.offline || []).forEach(f => f());
    if (o.sayInside) XQNet._set(false);   /* 派送當中就有人收掉找對手（people 先到） */
    log.push("toast:GENERIC"); if (o.routeClears) XQNet._set(false);   /* 05-settings：一般提示、大廳重畫收掉找對手 */
    (WL.bub.offline || []).forEach(f => f()); ctx.run(2000) };
  return ctx;
}
test("R27-1：找對手中途斷網——不管誰先把找對手收掉（連線先斷、people 先到、大廳重畫、按取消），「已取消找對手」都出現、只一次、排在一般提示後面", () => {
  const SAY = "toast:📴 網路斷了，已取消找對手；連上網路再配對";
  const cases = [
    ["一般：offline 時還在找", { seeking: true }],
    ["大廳重畫先收掉", { seeking: true, routeClears: true }],
    ["派送當中 people 先到", { seeking: true, sayInside: true }],
    ["連線先斷 300ms、找對手已被收掉（E 漏掉的那種）", { seeking: true, dropFirst: 300, clearOnDrop: true }],
    ["連線先斷 3 秒、找對手已被收掉", { seeking: true, dropFirst: 3000, clearOnDrop: true }],
    ["連線先斷但還在找", { seeking: true, dropFirst: 300 }],
    ["seeking 已經 false、畫面上還有「取消找對手」鈕", { seeking: false, sk0Shown: true }]];
  for (const [tag, o] of cases) for (let rep = 0; rep < 12; rep++) {
    const A = lobbySim(o); A.offline();
    const toasts = A.log.filter(x => x.startsWith("toast:"));
    assert.equal(toasts.filter(x => x === SAY).length, 1, tag + "：" + A.log.join(" | "));
    assert.equal(toasts[toasts.length - 1], SAY, tag + "：排在一般提示後面");
    assert.ok(toasts.indexOf(SAY) > toasts.indexOf("toast:GENERIC"), tag);
  }
  /* 不該說的：沒在找；有網路時自己按取消（之後才斷網）；自己取消超過 4 秒才斷網 */
  { const A = lobbySim({ seeking: false }); A.offline(); assert.ok(!A.log.includes(SAY), "沒在找") }
  { const A = lobbySim({ seeking: true }); A.XQNet._set(false); A.run(500); A.offline(); assert.ok(!A.log.includes(SAY), "有網路時自己取消") }
  { const A = lobbySim({ seeking: true, dropFirst: 5000, clearOnDrop: true }); A.offline(); assert.ok(!A.log.includes(SAY), "連線斷了 5 秒以前收掉的，跟這次斷網無關") }
  assert.ok(X2.includes("setTimeout(()=>{try{toast(\"📴 網路斷了，已取消找對手；連上網路再配對\")}catch(e){}},120)"), "一律晚 120ms 才跳");
  assert.ok(X2.includes('try{addEventListener("offline",()=>{lmSkHook();try{lmOffSeek.was=lmSkWas()}catch(e){}},true);'));
});

/* ---------- 共用：從原始碼讀頂欄數值（改了 CSS 這裡跟著變，不寫死） ---------- */
const MCSS = rd("xiangqi-db/m.css");
const num = (src, re, what) => { const m = src.match(re); assert.ok(m, "讀不到 " + what); return parseFloat(m[1]) };
function bar() {
  const OF = W8.slice(W8.indexOf("const OFFT_CSS="), W8.indexOf("\n", W8.indexOf("const OFFT_CSS=")));
  return {
    padT: num(W8, /#topbar\.clk-on\{position:relative;padding-top:calc\(var\(--safeT,0px\) \+ (\d+)px\)/, "clk-on padding-top"),
    padB: num(W8, /#topbar\.clk-on\{[^}]*padding-bottom:(\d+)px/, "clk-on padding-bottom"),
    lh: num(W8, /#topbar\.clk-on #title\{[^}]*line-height:(\d+)px/, "標題行高"),
    tPadL: num(W8, /#topbar\.clk-on #title\{[^}]*padding-left:(\d+)px/, "標題左讓位"),
    tPadB: num(W8, /#topbar\.clk-on #title\{[^}]*padding-bottom:(\d+)px/, "標題底下"),
    clkBot: num(W8, /\.clk-box\{position:absolute;bottom:(\d+)px/, ".clk-box bottom"),
    dial: num(W8, /\.clk-dial\{[^}]*height:(\d+)px/, "星晷高"),
    smF: num(W8, /\.clk-sm\{[^}]*font:600 ([\d.]+)px\/1\.3/, "時辰小字"), bF: num(W8, /\.clk-sm \.clk-sl>b\{[^}]*font-size:(\d+)px/, "時辰大字"), bLh: num(W8, /\.clk-sm \.clk-sl>b\{[^}]*line-height:([\d.]+)/, "時辰大字行高"),
    border: num(MCSS, /html \.topbar,html\[data-era\] \.topbar\{[^}]*border-bottom:(\d+)px/, "頂欄下框"),
    chipIcon: num(OF, /#topbar #offChip::before\{content:\\?"📴\\?";font-size:(\d+)px;line-height:1\}/, "牌子圖示"),
    chipPadV: num(OF, /#topbar\.clk-on #offChip\{align-self:flex-start;[^}]*padding:(\d+)px \d+px!important/, "窄螢幕牌子上下留白"),
    chipPadH: num(OF, /#topbar\.clk-on #offChip\{align-self:flex-start;[^}]*padding:\d+px (\d+)px!important/, "窄螢幕牌子左右留白"),
    /* 11/17 第 29 輪 R29-8：480 寬以下有時辰鐘的頁斷網時，中英文都把牌子放到頂欄上面多出來的那一條、置中（left:50%） */
    chipTop: num(OF, /#topbar\.clk-on #offChip\{position:absolute;left:[^;]+;top:calc\(var\(--safeT,0px\) \+ (\d+)px\)/, "牌子 top"),
    chipLeft: /#topbar\.clk-on #offChip\{position:absolute;left:50%;/.test(OF) ? 0 : NaN,
    chipBorder: num(M("05-settings.js"), /c\.style\.cssText="flex:none;border:([\d.]+)px solid currentColor/, "牌子外框（05-settings offChip）"),
    offt1: num(OF, /#topbar\.offt1 #title\{font-size:(\d+)px!important/, "縮字 offt1")
  };
}

/* ---------- R27-2／X2：320 寬斷網首頁頂欄 ---------- */
test("R27-2／X2：窄螢幕有時辰鐘的頁，📴 牌貼頂（不落在時辰字那兩行）；英文 360 寬以下牌子放到星晷上方左上角，標題拿回寬度", () => {
  const V = bar(), chipH = V.chipIcon + 2 * V.chipPadV + 2 * V.chipBorder, chipW = V.chipIcon + 2 * V.chipPadH + 2 * V.chipBorder;
  const H = lines => V.padT + lines * V.lh + V.tPadB + V.padB + V.border, clkTop = lines => H(lines) - V.border - V.clkBot - V.dial, clkTextTop = lines => H(lines) - V.border - V.clkBot - (V.smF * 1.3 + V.bF * V.bLh + 1);
  /* 中文（一行）：牌子貼頂，從 padding-top 起；底邊要在時辰字上緣之上 */
  assert.ok(V.padT + chipH <= clkTextTop(1), `中文：牌子 ${V.padT}～${V.padT + chipH}、時辰字 ${clkTextTop(1).toFixed(1)} 起`);
  /* 英文 ≤360（兩行）：牌子絕對定位在左上角，底邊在星晷上緣之上、右邊在標題字左邊。
     第 28 輪 Y3 起有牌子時頂欄上面多一條（padding-top 從 CSS 讀），星晷和標題整個往下；第 27 輪的版本（沒有這條）星晷從 22 起、牌子會碰到外圈的字 */
  const OF = W8.slice(W8.indexOf("const OFFT_CSS="), W8.indexOf("\n", W8.indexOf("const OFFT_CSS="))), band = num(OF, /#topbar\.clk-on:has\(#offChip\)\{padding-top:calc\(var\(--safeT,0px\) \+ (\d+)px\)\}/, "有牌子時的頂欄上緣");
  /* 第 28 輪 N28-5 起 360 寬以下英文：標題一行、底下讓的高度照 07i18n 那條規則（不再是兩行＋36） */
  const nPadB = num(I18N_CSS, /@media \(max-width:360px\)\{html\[lang=en\] #topbar\.clk-on:not\(\.clk-nt\) #title\{padding-left:\d+px!important;padding-bottom:(\d+)px!important/, "窄螢幕英文標題底下");
  const Hb = () => band + V.lh + nPadB + V.padB + V.border, clkTopB = () => Hb() - V.border - V.clkBot - V.dial;
  assert.ok(V.chipTop + chipH <= clkTopB(2) - 20, `英文：牌子 ${V.chipTop}～${V.chipTop + chipH}、星晷 ${clkTopB(2)} 起（外圈的字往上凸約 20px 也碰不到）`);
  assert.ok(V.chipTop + chipH <= band, `英文：牌子在多出來那一條裡（標題從 ${band} 起）`);
  assert.ok(clkTop(2) - 20 < V.chipTop + chipH, "對照：沒有多那一條時，牌子會碰到星晷外圈（D 看到的「亥」）");
  /* 第 28 輪 N28-5 起 360 寬以下英文標題改成一行在最上面（從 x≈12 起，不再讓左邊 62px）：牌子跟標題是上下分開（牌子在多出來那一條、標題在它下面），不是左右分開 */
  assert.ok(V.chipLeft + chipW > 0 && V.chipTop + chipH <= band, `英文：牌子 x ${V.chipLeft}～${V.chipLeft + chipW}、y ${V.chipTop}～${V.chipTop + chipH}，標題從 y ${band} 起`);
  /* 320 寬標題寬度（輸入值是測試員 E 截圖量的：連線時標題字寬 72；斷網時牌子在排版裡佔 39＋間距 4）：牌子移出排版就拿回這段；縮成 offt1 的字級後「Xiangqi」一行放得下 */
  const MEASURED_CONTENT_ON = 72, word = px => 7 * px * 0.6;
  assert.ok(word(V.offt1) <= MEASURED_CONTENT_ON, `標題字寬 ${MEASURED_CONTENT_ON}、Xiangqi ${word(V.offt1).toFixed(0)}（${V.offt1}px）`);
  assert.ok(word(17) > MEASURED_CONTENT_ON - 43, "對照：牌子還在排版裡、沒縮字時放不下（就是 E 看到的 X…）");
  assert.ok(W8.includes('if(ov()){tb.classList.add("offt1");if(ov()&&(off||tx.length<=18))tb.classList.add("offt2")}'));
});

/* ---------- X3：沒有標題的頁 ---------- */
test("X3：#/lobby 這種標題不顯示的頁（clk-nt），英文標題只排一行，頂欄跟中文一樣高", () => {
  const css = I18N_CSS, V = bar();
  const R = css.match(/html\[lang=en\] #topbar\.clk-nt #title\{white-space:nowrap!important;-webkit-line-clamp:(\d+);max-height:(\d+)px\}/); assert.ok(R, "規則在");
  /* 英文：沒有這條時照兩行（英文 ≤480 的兩行規則），有這條時行數＝clamp、高度上限＝max-height；中文一行 */
  const hEn = (lines, maxH) => V.padT + Math.min(lines * V.lh + V.tPadB, maxH) + V.padB + V.border, hZh = V.padT + V.lh + V.tPadB + V.padB + V.border;
  assert.equal(hEn(+R[1], +R[2]), hZh, `英文 ${hEn(+R[1], +R[2])}px＝中文 ${hZh}px`);
  assert.ok(hEn(2, 76) > hZh, `對照：沒有這條時英文 ${hEn(2, 76)}px（D 量到 83）`);
  assert.ok(W8.includes('const CLK_NT_RE=new RegExp("^/(lobby|db|db/[^/]+|settings)$");'), "clk-nt 的頁：大廳、棋譜、設定");
  assert.ok(css.includes("html[lang=en] #topbar.clk-on #title{max-height:76px}"), "有標題的頁照舊（第 26 輪 W1 的 76px 上限）");
});

/* ---------- X4：縮字照實際寬度 ---------- */
function fitSim(o) {
  const cls = new Set(), F = () => cls.has("offt2") ? 13 : cls.has("offt1") ? 14 : 16, back = () => cls.has("offt2") ? 40 : o.back;
  const avail = () => o.W - 6 - back() - 4 - 6 - 4 - (o.off ? 43 : 0) - 142 - 6, ww = (s, px) => [...s].reduce((a, c) => a + (CJK.test(c) ? px * 1.06 : c === " " ? px * .3 : px * .6), 0);
  const lines = () => { const a = avail(); let n = 1, cur = cls.has("offt1") ? 0 : F() * 1.2; for (const w of o.text.split(" ")) { const x = ww(w, F()); if (x > a) return 99; if (cur + ww(" ", F()) + x > a) { n++; cur = x } else cur += ww(" ", F()) + x } return n };
  const lh = F() * 1.15, icon = cls.has("offt1") ? 0 : 4;   /* 小圖示比行高高 4px（D：放得下也縮的原因） */
  const t = { textContent: o.text, get clientWidth() { return avail() }, get scrollWidth() { return lines() === 99 ? avail() + 30 : avail() }, get clientHeight() { return Math.min(lines(), 2) * F() * 1.15 }, get scrollHeight() { return lines() * F() * 1.15 + (cls.has("offt1") ? 0 : 4) } };
  const tb = { classList: { add: (...a) => a.forEach(x => cls.add(x)), remove: (...a) => a.forEach(x => cls.delete(x)), contains: x => cls.has(x) } };
  const ctx = { innerWidth: o.W, getComputedStyle: () => ({ lineHeight: (F() * 1.15) + "px" }), document: { getElementById: id => ({ topbar: tb, title: t, offChip: o.off ? {} : null, offtCss: {} }[id] || null), createElement: () => ({}), head: { append() {} } } };
  vm.createContext(ctx); vm.runInContext(between(o.src || W8, "function offtCss(){", "\ntry{offtCss()}catch(e){}") + ";this.f=offtFit", ctx); ctx.f();
  return { cls: [...cls].sort().join(" "), lines: lines(), font: F() };
}
test("X4：放得下就不縮（390 寬斷網 Dynasty Arena 維持 16px）；320 寬連線放不下照實際寬度縮、短頁名返回鈕只留 ‹；長句子連線時不動返回鈕；寬螢幕連線不動", () => {
  { const r = fitSim({ W: 390, off: true, back: 60, text: "Dynasty Arena" }); assert.equal(r.cls, "", "390 寬斷網放得下：不縮（" + r.lines + " 行）"); assert.equal(r.font, 16) }
  /* 重現退步：高度容差改回 1px（第 26 輪的寫法），小圖示多出的 4px 就會被當成放不下而縮字 */
  { const old = W8.replace("t.scrollHeight>t.clientHeight+lh*.5", "t.scrollHeight>t.clientHeight+1"); assert.notEqual(old, W8); const r = fitSim({ W: 390, off: true, back: 60, text: "Dynasty Arena", src: old }); assert.match(r.cls, /offt1/, "舊的判斷會縮（D 看到的 16→13px）") }
  { const r = fitSim({ W: 320, off: false, back: 125, text: "Dynasty Arena" }); assert.match(r.cls, /offt1 offt2/, "320 寬連線放不下：縮"); assert.ok(r.lines <= 2, "縮完放得下") }
  { const r = fitSim({ W: 320, off: false, back: 125, text: "You vs Stone Table Tales Pikafish level 6 Amateur" }); assert.equal(r.cls, "offt1", "長句子連線時只縮字、返回鈕照舊") }
  { const r = fitSim({ W: 800, off: false, back: 125, text: "Dynasty Arena" }); assert.equal(r.cls, "", "寬螢幕連線不動") }
  { const r = fitSim({ W: 390, off: false, back: 60, text: "Dynasty Arena" }); assert.equal(r.cls, "", "390 寬連線放得下不動") }
  assert.ok(W8.includes("const ov=()=>t.scrollWidth>t.clientWidth+1||t.scrollHeight>t.clientHeight+lh*.5;"), "高度多出半行以上才算放不下");
});
test("X4：英文頁名「Dynasty Arena」大寫（專有名詞，跟「How does the Dynasty Arena work?」一致）", { skip: SKIP }, () => {
  const K = i18nKit();
  assert.equal(K.i18nText("朝代擂台"), "Dynasty Arena"); assert.equal(K.i18nText("朝代擂台在園子裡"), "The Dynasty Arena is in the garden");
  assert.equal(K.i18nText("朝代擂台怎麼玩"), "How does the Dynasty Arena work?");
  assert.ok(!/Dynasty arena|dynasty arena/.test(I18N), "內建沒有小寫");
  const J = JSON.parse(fs.readFileSync(EXT, "utf8")); assert.ok(!Object.values(J.en).some(v => /Dynasty arena|dynasty arena/.test(v)), "外掛字典沒有小寫");
  assert.equal(fs.readFileSync(EXT, "utf8"), rd("xiangqi-lab/site/data/i18n-en.json"), "外掛字典兩份一樣");
});

/* ---------- X1：英文檢討頁狀態列 ---------- */
test("X1：英文檢討頁逐步看棋的狀態列整句英文——著法 WXF、評等半形方括號、局面句英文；可以換行不截斷；中文照舊", { skip: SKIP }, () => {
  const K = i18nKit(), ctx = { tmxT: s => { const t = K.i18nText(s); return t && !CJK.test(t) ? t : s }, tmxW: cn => K.i18nWxf(cn) || cn };
  vm.createContext(ctx);
  vm.runInContext(grab(M("00-util.js"), "const evt=") + "\n" + M("00-util.js").split("\n").find(l => l.startsWith("function pawnN(")) + "\n" + between(D0, "function dbStatEn(", "function dbNoteLines(") + ";this.f=dbStatEn;this.evt=evt", ctx);
  const s1 = ctx.f(1, 4, "炮二進七", { q: "失著" }, -140, true);
  assert.equal(s1, "📖 Reviewing · Move 1/4 C2+7 [Mistake] · after this move: Black slightly better, ahead by about 1.4 pawns");
  assert.ok(!CJK.test(s1) && !/[【】]/.test(s1));
  for (const [q, ev] of [["妙著", 30], ["正著", 0], ["穩著", 200], ["緩著", -400], ["敗著", 25000], ["", 50], [null, null]]) {
    const s = ctx.f(3, 9, "馬８進７", q ? { q } : null, ev, false); assert.ok(!CJK.test(s), s); assert.ok(/^Move 3\/9 H8\+7/.test(s), s) }
  assert.equal(ctx.f(0, 9, "", null, null, true), "Starting position · swipe the board to change moves");
  assert.ok(I18N_CSS.includes("html[lang=en] #stat.dbst{white-space:normal;overflow:visible;text-overflow:clip;line-height:1.3;"), "英文可以換行");
  assert.ok(D0.includes('st.textContent=EN?dbStatEn(ply,maxPly(line),ply>0?s[ply-1].cn:"",g,ev,ply<maxPly(line)):ply===0?"開局局面・左右滑棋盤可換步":`${ply<maxPly(line)?"📖 回顧中・":""}第 ${ply}／${maxPly(line)} 步 ${s[ply-1].cn}`'), "中文照舊");
});

/* ---------- B 第 27 輪：N27-1 標題位置的分頁鈕被 V5 限高切掉、N27-2 中文分頁鈕斷網只剩圖示 ---------- */
/* 選擇器強度（id, class／屬性／偽類, 元素）；:has(...) 算它括號裡最強的那個 */
function spec(sel) {
  let s = sel; const out = [0, 0, 0];
  s = s.replace(/:has\(([^)]*)\)/g, (m, a) => { const best = a.split(",").map(x => spec(x.trim())).sort((p, q) => q[0] - p[0] || q[1] - p[1] || q[2] - p[2])[0]; out[0] += best[0]; out[1] += best[1]; out[2] += best[2]; return "" });
  out[0] += (s.match(/#[\w-]+/g) || []).length; out[1] += (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)[\w-]+/g) || []).length; out[2] += (s.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length; return out;
}
const ge = (a, b) => a[0] !== b[0] ? a[0] > b[0] : a[1] !== b[1] ? a[1] > b[1] : a[2] >= b[2];
/* 標題位置放分頁鈕時，鈕實際露出的高度：照 CSS 算 #title 的有效 max-height（中文 .topbar h1 沒有上限；英文 ≤480 有 V5，第 27 輪起有 :has 規則解除） */
function segSeen(css, lang, W) {
  const btnH = num(MCSS, /\.cpu-seg button\{flex:1;min-width:0;height:(\d+)px/, "分頁鈕高"), pad = num(MCSS, /\.cpu-seg\{display:flex;gap:\d+px;padding:(\d+)px/, "分頁外框 padding");
  const h1 = MCSS.match(/\.topbar h1\{[^}]*\}/)[0]; assert.ok(!/max-height/.test(h1), "中文 .topbar h1 沒有限高");
  let maxH = Infinity;
  if (lang === "en") {
    assert.ok(!/max-height/.test((css.match(/(^|\n)html\[lang=en\] #title\{[^}]*\}/) || [""])[0]), "480 寬以上的英文標題規則沒有限高");
    if (W <= 480) {
      const v5 = css.match(/@media \(max-width:480px\)\{html\[lang=en\] #title\{[^}]*max-height:([\d.]+)em/); if (v5) maxH = +v5[1] * 16;   /* 英文窄螢幕標題 16px */
      const un = css.match(/@media \(max-width:480px\)\{(html\[lang=en\] #topbar #title:has\([^)]*\))\{max-height:none!important\}\}/);
      if (un && /button/.test(un[1]) && ge(spec(un[1]), spec("html[lang=en] #title")) && ge(spec(un[1]), spec("html[lang=en] #topbar.clk-on #title"))) maxH = Infinity;
    }
  }
  return Math.min(btnH, maxH - pad);
}
test("N27-1：標題裡有按鈕／分頁鈕（挑戰電腦 .cpu-seg）不限高——照 CSS 算鈕實際露出的高度：320／375／393／430 寬、中英都是完整 44px（斷網只影響寬度、不影響高度；畫面上實際能點的高度仍請瀏覽器複驗）", () => {
  const css = I18N_CSS, B8 = M("08b-cpugame.js");
  /* 挑戰電腦不是有時辰鐘的頁（不套 76px／clk-nt 規則） */
  const dial = new RegExp(W8.match(/const CLK_DIAL_RE=\/(.+?)\/;/)[1]), nt = new RegExp(W8.match(/const CLK_NT_RE=new RegExp\("(.+?)"\);/)[1]);
  assert.ok(!dial.test("/cpu") && !nt.test("/cpu"), "#/cpu 沒有時辰鐘");
  for (const W of [320, 375, 393, 430]) for (const lang of ["zh", "en"]) assert.ok(segSeen(css, lang, W) >= 44, `${W} ${lang}：鈕露出 ${segSeen(css, lang, W)}px`);
  /* 重現退步：拿掉 :has 規則，英文窄螢幕鈕只露 35.6px；寬螢幕不受影響 */
  const old = css.replace(/@media \(max-width:480px\)\{html\[lang=en\] #topbar #title:has\([^)]*\)\{max-height:none!important\}\}/, "");
  assert.ok(segSeen(old, "en", 375) < 44, "沒有新規則時被切：" + segSeen(old, "en", 375)); assert.ok(segSeen(old, "en", 800) >= 44); assert.ok(segSeen(old, "zh", 375) >= 44);
  /* 強度計算本身：V5 (1,1,1)、時辰鐘 76px (2,2,1)、新規則 (2,2,1) */
  assert.deepEqual(spec("html[lang=en] #title"), [1, 1, 1]); assert.deepEqual(spec("html[lang=en] #topbar.clk-on #title"), [2, 2, 1]); assert.deepEqual(spec("html[lang=en] #topbar #title:has(button,select,[role=tablist])"), [2, 2, 1]);
  /* 斷網時分頁鈕的處理只動字（segf1／segf2，N27-2），offtFit 不加 offt 類、不改高度 */
  assert.ok(W8.includes('if(sg){const bs=[...sg.querySelectorAll("button")]') && W8.includes('tb.classList.add("segf2")}return}'));
  /* 標題裡放可點元素的只有 08b 的 .cpu-seg（07w7 .sw7-hd 有時辰鐘時不出現；也被 :has(button) 涵蓋） */
  assert.ok(B8.includes('seg.className="cpu-seg";seg.setAttribute("role","tablist");'));
  const files = fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js"));
  for (const f of files) { const s = M(f); if (/\$\("#title"\)[^;]{0,80}\.append\(/.test(s) || /getElementById\("title"\)[^;]{0,80}\.append\(/.test(s)) assert.ok(["08b-cpugame.js"].includes(f), "標題裡塞元素的檔：" + f) }
});
function segSim(o) {
  const cls = new Set(), F = () => cls.has("segf2") ? 11 : cls.has("segf1") ? 12 : o.fs, icon = () => cls.has("segf1") ? 0 : F() * 1.2 + 4;
  const ww = s => [...s].reduce((a, c) => a + (CJK.test(c) ? F() * 1.02 : c === " " ? F() * .3 : F() * .58), 0);
  const btn = txt => ({ get clientWidth() { return o.bw - 6 }, get scrollWidth() { const w = icon() + ww(txt); return cls.has("segf2") ? Math.min(w, Math.max(...txt.split(" ").map(ww)) ) : w }, clientHeight: 44, get scrollHeight() { return 44 } });
  const bs = o.labels.map(btn), sg = { querySelectorAll: () => bs };
  const t = { textContent: o.labels.join(""), querySelector: () => sg, scrollWidth: 0, clientWidth: 0, scrollHeight: 0, clientHeight: 0 };
  const tb = { classList: { add: (...a) => a.forEach(x => cls.add(x)), remove: (...a) => a.forEach(x => cls.delete(x)), contains: x => cls.has(x) } };
  const ctx = { innerWidth: o.W, getComputedStyle: () => ({ lineHeight: "20px" }), document: { getElementById: id => ({ topbar: tb, title: t, offChip: o.off ? {} : null, offtCss: {} }[id] || null), createElement: () => ({}), head: { append() {} } } };
  vm.createContext(ctx); vm.runInContext(between(W8, "function offtCss(){", "\ntry{offtCss()}catch(e){}") + ";this.f=offtFit", ctx); ctx.f();
  return { cls: [...cls].sort().join(" "), fits: bs.every(b => b.scrollWidth <= b.clientWidth + 1) };
}
test("N27-2：挑戰電腦的兩顆分頁鈕放不下就拿掉小圖示、縮字（12px，再不行 11px 換行）；標題字和返回鈕不動；放得下不縮", () => {
  /* 每顆鈕的寬＝(標題寬 − 外框 4 − 間距 2)／2；標題寬照 B 量的：中文 375 斷網約 139、連線約 182；320 斷網約 90 */
  const zh = ["晉級賽", "練功房"], en = ["Ranked", "Practice room"];
  { const r = segSim({ W: 375, off: false, fs: 14, bw: 88, labels: zh }); assert.equal(r.cls, "", "375 連線放得下不縮") }
  { const r = segSim({ W: 375, off: true, fs: 14, bw: 66, labels: zh }); assert.equal(r.cls, "segf1", "375 斷網：拿掉圖示、12px"); assert.ok(r.fits) }
  { const r = segSim({ W: 320, off: true, fs: 14, bw: 42, labels: zh }); assert.equal(r.cls, "segf1"); assert.ok(r.fits, "320 斷網：12px 放得下") }
  { const r = segSim({ W: 320, off: true, fs: 12.5, bw: 58, labels: en }); assert.match(r.cls, /segf1 segf2/); assert.ok(r.fits, "英文 Practice room 再窄：11px 換兩行放得下") }
  { const r = segSim({ W: 320, off: true, fs: 12.5, bw: 60, labels: en }); assert.ok(r.fits, "英文 320 斷網"); assert.ok(!/offt/.test(r.cls), "標題、返回鈕不動") }
  assert.ok(W8.includes("#topbar.segf1 .cpu-seg button{font-size:12px!important;letter-spacing:-.02em!important;padding:0 2px!important}#topbar.segf1 .cpu-seg button img{display:none}"));
  assert.ok(W8.includes("#topbar.segf2 .cpu-seg button{font-size:11px!important;white-space:normal!important;word-break:keep-all;line-height:1.1!important;text-overflow:clip!important}"));
  assert.ok(!/segf[12] [^{]*\{[^}]*[{;]height:/.test(W8), "鈕的高度不動（line-height 不算）");
});
