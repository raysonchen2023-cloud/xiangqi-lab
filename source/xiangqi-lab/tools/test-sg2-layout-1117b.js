// 11/17 Windows 測試員 B（Playwright 390×844、844×390，候選版 0156）星門圍城對局版面，第二批：
//   N-1（P1）橫式 844×390 我方底排在畫面外：棋盤 svg 是 y=0～481、畫面只有 390 高，第 8、9 排看不到；頂欄標題被蓋住只剩「黑洞・」。上一批的 --gsvTop 沒解決。
//     Playwright 實測（0156，844×390）：#bbox computed top 59px、bottom 0px、position:fixed，可是 getBoundingClientRect 是 y=0、高 481（寬 434＝560:620 的比例）；
//     祖先沒有 transform／contain／filter。真正原因：05-settings.js 手機橫放（#glLand）那條 .view.fixed:has(>#bbox):has(>#acts)>#bbox 寫了 align-self:start，
//     新版瀏覽器對 position:fixed 也照 align-self 排——不是 stretch 就不撐滿 top～bottom，高度照內容（svg 照比例 481），比畫面高又被推到 y=0。
//     在頁面上加 align-self／justify-self:stretch!important 後：#bbox y=59、高 331，帥（第 9 排）在 y≈369，頂欄不被蓋。
//     修法（07bhg gsvCss）：#bbox 那條加 align-self:stretch!important;justify-self:stretch!important；視角選單拿掉「手機轉成橫向，星盤會更大」（橫式兩側欄占掉寬度，星盤反而較小）。
//   N-4（P3）開局「星樞：…」提示、開局名稱橫幅疊在敵方底排：toast 直式改到頂欄下方那條敵方資訊上（top＝--gsvTop＋4px，置中、最寬畫面減 16px），
//     橫式放左欄下半的空白；.opfx（01-board openFx 行內定位）用 !important 搬到同樣的地方。實測 390×844：兩行 toast 在 y 63～111（敵方資訊條 59～139、棋盤第 0 排在 y≈208）；
//     844×390：toast 在左欄 x 6～194、y 278～380，開局名稱在左欄 y 225～256，都不碰棋盤（棋盤 x 200～634）。
//   N-5（P3）選放招目標時「點盤上發光的目標／取消」浮在下方面板上緣外（top:-34px），蓋住我方底排：直式平面改成下方面板裡的第一行（static），招式框讓出位置。
//   N-6（P3）「規則」鈕約 40×20：最小 44×32，上下負邊界抵掉（那一行不變高）。實測改後 44×32。
// 不開瀏覽器：樣式看原始碼。用法：node --test xiangqi-lab/tools/test-sg2-layout-1117b.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const G = rd("xiangqi-db/m/07bhg-gatesiege.js"), S2 = rd("xiangqi-db/m/07sg2-siege2.js");
const cut = (src, a) => { const i = src.indexOf(a); assert.ok(i >= 0, a); return src.slice(i, src.indexOf("`;document.head.append(s)}", i)) };
const GCSS = cut(G, "function gsvCss(){"), SCSS = cut(S2, "function sg2Css(){");
/* 去掉 CSS 註解後找某個選擇器的規則內容 */
const noCm = s => s.replace(/\/\*[\s\S]*?\*\//g, "");
const rule = (css, sel) => { const c = noCm(css), i = c.indexOf(sel + "{"); assert.ok(i >= 0, "找得到 " + sel); return c.slice(i + sel.length + 1, c.indexOf("}", i)) };

test("〔N-1〕#bbox 一律撐滿 top～bottom：align-self、justify-self 都是 stretch!important（蓋過 05-settings #glLand 的 align-self:start）", () => {
  const r = rule(GCSS, "body.gsv-on .view.fixed>#bbox");
  assert.ok(r.includes("align-self:stretch!important"), r); assert.ok(r.includes("justify-self:stretch!important"));
  assert.ok(r.includes("position:fixed!important") && r.includes("height:auto!important"), "照舊固定定位、高度照 top／bottom");
  const M = rd("xiangqi-db/m/05-settings.js");
  assert.ok(/\.view\.fixed:has\(>#bbox\):has\(>#acts\)>#bbox\{[^}]*align-self:start/.test(M), "05-settings #glLand 那條 align-self:start 還在（這個修補就是要蓋過它；那條拿掉了這個測試可以改）");
});

test("〔N-1〕視角選單不再寫「手機轉成橫向，星盤會更大」", () => {
  const a = G.indexOf("function gsvViewMenu("), b = G.indexOf("\n", G.indexOf("GSV_VMT=setTimeout", a));
  assert.ok(a > 0 && b > a); assert.ok(!G.slice(a, b).includes("星盤會更大"));
});

test("〔N-4〕toast 不在棋盤上：直式在頂欄下方那條（置中、最寬畫面減 16px），橫式在左欄下半", () => {
  const r = rule(SCSS, "body.gsv-on .toast");
  assert.ok(r.includes("top:calc(var(--gsvTop,var(--bhTop,44px)) + 4px)"), r);
  assert.ok(!r.includes("--gsvEnH"), "不再加上敵方資訊條的高度（那樣會落在棋盤第 0 排）");
  assert.ok(r.includes("left:8px;right:8px;transform:none;width:fit-content;margin:0 auto;max-width:calc(100vw - 16px)"), "置中又不會只有半個畫面寬");
  assert.ok(r.includes("pointer-events:none"));
  const L = noCm(SCSS).match(/@media \(orientation:landscape\)\{body\.gsv-on \.toast\{([^}]*)\}\}/); assert.ok(L, "橫式另一條");
  assert.ok(L[1].includes("top:auto;bottom:calc(10px + env(safe-area-inset-bottom,0px));left:calc(6px + env(safe-area-inset-left,0px))") && L[1].includes("max-width:188px"), "左欄 200px 裡");
});

test("〔N-4〕開局名稱橫幅（.opfx 行內定位）在星門圍城對局用 !important 搬到棋盤外", () => {
  const r = rule(SCSS, "body.gsv-on .opfx");
  assert.ok(r.includes("top:calc(var(--gsvTop,var(--bhTop,44px)) + var(--gsvEnH,62px) / 2)!important"), "直式疊在敵方資訊條中間");
  assert.ok(r.includes("left:50%!important") && r.includes("font-size:24px!important"));
  const L = noCm(SCSS).match(/@media \(orientation:landscape\)\{body\.gsv-on \.opfx\{([^}]*)\}\}/); assert.ok(L);
  assert.ok(L[1].includes("left:calc(100px + env(safe-area-inset-left,0px))!important") && L[1].includes("font-size:16px!important"), "橫式在左欄");
  const B = rd("xiangqi-db/m/01-board.js"); assert.ok(/d\.className="opfx";d\.style\.cssText=`left:/.test(B), "01-board 照舊寫行內 left／top（所以要 !important）");
});

test("〔N-5〕平面和 3D 選目標提示都在下方 HUD 裡，棋盤跟著讓位", () => {
  const c = noCm(SCSS);
  assert.match(c, /body\.gsv-v2 #gsvMe \.gsv-tip\{position:static/);
  assert.match(c, />#bbox\{bottom:var\(--sg2DockH,120px\)!important/);
  assert.ok(S2.includes('me.innerHTML=`${tip}<div class="gsv-r">'), "提示條在招式清單前面");
});

test("〔N-6〕規則按鈕有實際 44×44 的操作區", () => {
  const r = rule(SCSS, 'body.gsv-v2 #gsvMe .gsv-fx[data-x="rules"]');
  assert.ok(r.includes("min-width:44px") && r.includes("min-height:44px"), r);
  assert.ok(S2.includes('<button type="button" class="gsv-fx" data-x="rules"'));
});

test("〔iMac 18〕打不動的跳字樣式（大一號）", () => {
  assert.ok(rule(SCSS, ".bt-fl.sg2no").includes("font-size:17px"));
});
