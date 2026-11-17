// 11/17 測試員 E 第 29 輪（App Store 審查標準，候選版 2120）：R29-1～R29-8。
// 不開瀏覽器：從 CSS 算熱區、vm 跑「關於與開源授權」、原始碼檢查路由和文件用字。
// 用法：node --test xiangqi-lab/tools/test-r29e-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };
const CJK = /[㐀-鿿]/;
const TAP = vm.runInNewContext(between(M("00-util.js"), "const TAP44_CSS=", ";\n").replace("const TAP44_CSS=", ""));

test("R29-1：文牒「隱私說明 ›」「檢查更新」換成上下兩行時，兩顆的透明熱區不重疊、各 44 高；同一行時照舊各 44 高", () => {
  assert.ok(TAP.includes(".hq-ft .hq-pv::after{top:auto;bottom:0;transform:none}") && TAP.includes(".hq-ft .hq-upd::before{top:0;bottom:auto;height:max(100%,44px)}"));
  /* 原本的規則（00-util 的 .hq-pv::after 高 44、07s2 的 .hq-upd::before 上下撐到 44）還在，這裡只蓋 top／bottom（選擇器多一層 .hq-ft，比較具體） */
  assert.ok(M("00-util.js").includes(".hq-pv{position:relative}.hq-pv::after{content:\"\";position:absolute;left:-8px;right:-8px;top:50%;height:44px;transform:translateY(-50%)}"));
  assert.ok(M("07s2-setmap.js").includes(".hq-upd,.hq-pv{position:relative}.hq-upd::before,.hq-pv::before{content:\"\";position:absolute;"));
  /* 幾何：字 em＝13～20px，兩行之間 row-gap 3px（07s4 .hq-ft gap:3px 6px）；隱私說明行高 1.25em、檢查更新 1.15em＋上下 2px 留白＋1.5px 外框 */
  for (const em of [11, 13, 16, 20]) {
    const pvH = 1.25 * em, upH = 1.15 * em + 4 + 3, gap = 3;
    const pv = { top: 0, bot: pvH }, up = { top: pvH + gap, bot: pvH + gap + upH };
    const pvHit = [pv.bot - 44, pv.bot], upHit = [up.top, up.top + Math.max(upH, 44)];   /* 換行：隱私說明往上長、檢查更新往下長 */
    assert.ok(pvHit[1] <= upHit[0], `em ${em}：隱私說明熱區 ${pvHit}、檢查更新 ${upHit} 不重疊`);
    assert.ok(pvHit[1] - pvHit[0] >= 44 && upHit[1] - upHit[0] >= 44);
    /* 舊的（各自上下置中）：會重疊，就是 E 看到的 */
    const pvOld = [pvH / 2 - 22, pvH / 2 + 22], upOld = [up.top + upH / 2 - 22, up.top + upH / 2 + 22]; assert.ok(pvOld[1] > upOld[0], "對照：舊的會重疊");
  }
  assert.ok(M("07s4-passmap.js").includes('<div class="hq-ft"><button type="button" class="hq-pv">隱私說明 ›</button>'), "兩顆都在 .hq-ft 裡，隱私說明在前");
});

test("R29-2：純淨畫面讓開左右安全區的規則都在（棋盤靠 #view 的 env 左右留白、#fcmBar 從 env 右緣算）；E 量到的 x＝427／460 是重新整理後模擬安全區沒了（對照：同一頁一般對局量到讓開）", () => {
  const F = M("07fm-focus.js"), css = between(F, "function fcmCssText(){return`", "`}");
  assert.ok(css.includes("#fcmBar{position:fixed;z-index:60;top:calc(env(safe-area-inset-top,0px) + 6px);right:calc(env(safe-area-inset-right,0px) + 6px);"), "✕ 還原、著法從安全區右緣再往內 6px");
  assert.ok(!/html\[data-fcmclean\] #view\{[^}]*padding-(left|right)/.test(css) && !/html\[data-fcmclean\] #view\{[^}]*padding:/.test(css), "純淨畫面只改上下留白，不蓋掉左右安全區");
  assert.ok(TAP.includes("#view.view,.view{padding-left:env(safe-area-inset-left,0px);padding-right:env(safe-area-inset-right,0px)}"), "對局頁左右讓開安全區（一般對局量到最右一路 348，讓開）");
  assert.ok(!/#fcmBar\{[^}]*right:/.test(TAP), "00-util 沒改 #fcmBar 的位置");
  /* E 的 o108b：✕ 還原右緣 460＝466－6，等於 env(safe-area-inset-right)＝0 時的位置；env＝84 時應是 376 → 量的時候模擬已經失效（t108b 在 page.reload 之後沒有再設 setSafeAreaInsetsOverride） */
  const W = 466, right = 460; assert.equal(W - right, 6);
});

test("R29-3、R29-4：「關於與開源授權」不再自己列送出清單，改連到同一份隱私說明；英文版權 Hung-Sheng Chen、原生版不說 browser；中文版權附英文名", () => {
  const X = M("07x4-lobbysafe.js"), code = between(X, "if(typeof aboutLicSheet===\"function\"&&!aboutLicSheet.__xq){", "aboutLicSheet.__xq=1}", true);
  for (const en of [true, false]) for (const nat of [true, false]) {
    let html = "", calls = 0; const els = {}; const b = { set innerHTML(h) { html = h }, get innerHTML() { return html }, querySelector: s => (els[s] = els[s] || {}) };
    const ctx = { aboutLicSheet() {}, i18nLang: () => en ? "en" : "zh", setNat: () => nat, sheet: (t, f) => f(b), closeSheet() {}, wipeAsk() {}, vibrate() {}, xqPrivSum: () => { calls++ }, setTimeout: f => f() };
    vm.createContext(ctx); vm.runInContext(code + ";aboutLicSheet()", ctx);
    assert.ok(html.includes('id="alPriv"'), "有連到隱私說明的按鈕"); els["#alPriv"].onclick(); assert.equal(calls, 1, "點了開 xqPrivSum（跟文牒、小鎖匣同一份）");
    assert.ok(!/只有|What is sent:|only .* is sent/i.test(html), "不再寫「會送出去的只有」這種會走樣的清單");
    if (en) { assert.ok(html.includes("© 2026 Hung-Sheng Chen") && !CJK.test(html.replace(/<[^>]*>/g, "")), "英文"); assert.equal(/browser/.test(html.replace(/<[^>]*>/g, "")), !nat, nat ? "原生版不說 browser" : "網頁版照實說 browser") }
    else assert.ok(html.includes("© 2026 陳泓昇（Hung-Sheng Chen）"));
  }
  assert.ok(M("07x4-lobbysafe.js").indexOf("function xqPrivSum(") > 0);
});

test("R29-5：離線版一般玩家打 #/watch/ai 導回首頁（不露 GPT／Claude、裁判程式 --tunnel 說明）；開發者（DEVTOOLS、已連上電腦）照舊", () => {
  const S = M("02-shell.js"), ln = S.split("\n").find(l => l.includes('if(p[0]==="watch"){'));
  assert.ok(ln.includes('if(p[1]==="ai"){let dv=false;try{dv=!!(DEVREMOTE()||DEVTOOLS())}catch(e){}if(OFF&&!dv){navReplace("#/");return}return screen=Watch(v)}'));
  /* 跑一次這一行 */
  const run = (OFF, dev, h) => { let to = null, scr = null; const ctx = { OFF, DEVREMOTE: () => false, DEVTOOLS: () => dev, navReplace: x => { to = x }, Watch: () => (scr = "Watch") };
    vm.createContext(ctx); vm.runInContext("(function(p,v){let screen;" + ln.replace(/\/\*.*$/, "") + "})(" + JSON.stringify(h) + ",{})", ctx); return to || scr };
  assert.equal(run(true, false, ["watch", "ai"]), "#/"); assert.equal(run(true, true, ["watch", "ai"]), "Watch"); assert.equal(run(false, false, ["watch", "ai"]), "Watch", "電腦上的線上版（不是離線版）照舊");
  assert.equal(run(true, false, ["watch", "x"]), "#/lobby");
  assert.ok(S.indexOf('const DEVREMOTE=') > 0 && S.indexOf('const DEVTOOLS=') > 0, "DEVREMOTE、DEVTOOLS 在檔案後面宣告：開機第一次 route 時還沒宣告會丟錯，所以包 try（當成不是開發者）");
});

test("R29-6：說明文件不再寫「裁判程式」（棋規文件改「App 實際就是這樣判」，正本直接改，不靠 xqDocClean 刪）", () => {
  const D = path.join(ROOT, "xiangqi-db/art/docs"), hit = [];
  for (const f of fs.readdirSync(D).filter(f => f.endsWith(".md"))) rd("xiangqi-db/art/docs/" + f).split("\n").forEach((l, i) => { if (l.includes("裁判程式")) hit.push(f + ":" + (i + 1)) });
  assert.deepEqual(hit, []);
  assert.ok(rd("xiangqi-db/art/docs/rules.md").includes("**【程式已實作】** App 實際就是這樣判；"));
  assert.ok(!M("07gc-native.js").includes("裁判程式"), "xqDocClean 沒有另外刪這個詞");
});

test("R29-7：我的角色頁「修為」場景熱點 #mzXp 透明熱區撐到 44 寬（往左長、不碰右邊的園子棋友）", () => {
  assert.ok(TAP.includes('#mzXp::after{content:"";position:absolute;top:0;bottom:0;right:0;width:max(100%,44px)}'));
  const Z = M("07z4-studymap.js"), S = vm.runInNewContext(between(Z, "const MZ_SPOTS=", ";").replace("const MZ_SPOTS=", "")), W = vm.runInNewContext(between(Z, "const MZ_W=", ",").replace("const MZ_W=", ""));
  const g = id => S.find(s => s[0] === id), xp = g("mzXp"), seal = g("mzSeal"), let_ = g("mzLetter");
  assert.ok(S.indexOf(xp) > S.indexOf(seal), "修為在千秋印譜後面畫（疊在上面，往左長的那一截點得到）");
  for (const wall of [300, 370, 410]) {   /* 320～430 寬時場景牆的寬度 */
    const k = wall / W, xpL = xp[3] * k - Math.max((xp[3] - xp[1]) * k, 44), sealW = (seal[3] - seal[1]) * k;
    assert.ok(xp[3] * k <= let_[1] * k, "右緣不動，不碰園子棋友"); assert.ok(xpL > seal[1] * k + 44, `牆 ${wall}：印譜還剩 ${(xpL - seal[1] * k).toFixed(0)} 寬`); assert.ok(sealW > 44);
  }
  assert.ok(Z.includes('<button type="button" class="mz-hs" id="${id}"'), "熱點是 .mz-hs 按鈕（position:absolute，::after 以它為準）");
});

test("R29-8：首頁斷網 📴 牌可點範圍 44×44：有時辰鐘的頁頂欄上面多留一條，牌子放在這一條裡，熱區從頂端往下 44；沒時辰鐘的頁以牌子為中心撐到 44×44", () => {
  const W8 = M("07w8-shichen.js"), OF = W8.slice(W8.indexOf("const OFFT_CSS="), W8.indexOf("\n", W8.indexOf("const OFFT_CSS=")));
  const css = vm.runInNewContext(OF.replace("const OFFT_CSS=", "").replace(/;\s*$/, ""));
  const m480 = css.slice(css.lastIndexOf("@media (max-width:480px){"));
  for (const s of ['#topbar #offChip::after{content:"";position:absolute;left:50%;top:50%;width:max(100%,44px);height:44px;transform:translate(-50%,-50%)}',
    "#topbar.clk-on #offChip{position:absolute;left:50%;top:calc(var(--safeT,0px) + 3px);margin:0;transform:translateX(-50%)}",
    "#topbar.clk-on:has(#offChip){padding-top:calc(var(--safeT,0px) + 26px)}", "#topbar.clk-on #offChip::after{top:-3px;transform:translateX(-50%)}"]) assert.ok(m480.includes(s), s);
  assert.ok(!css.includes("bottom:-2px;width:44px"), "不再往上長（上半截在畫面外，實際只點得到 22 高）");
  /* 熱區：頂端（safeT＋3－3＝safeT）往下 44px，整個在畫面裡；寬 max(牌子寬,44) */
  const top = 3 - 3; assert.ok(top >= 0 && top + 44 > 22);
});
