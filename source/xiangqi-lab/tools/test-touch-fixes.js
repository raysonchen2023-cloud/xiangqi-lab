// 第 11 輪 F1：小螢幕觸控壓力測試（xiangqi-db/art/docs/touch-stress.md）失敗案例修正的鎖定測試，不開瀏覽器。
// 行為：出口標籤往上推回看得到的範圍（07w9 exInY）、油盞避開上方卡片（10c sjLampFit）、同機對下認輸確認文字（09b）。
// 混合：從原始碼取出座標表，照 iPhone SE 的尺寸算 44px 點選範圍有沒有互相重疊（07s2 設定場景、10b 比賽對局三箱）。
// 原始碼：m.css 與各模組的 44px 規則（金框標籤交給 07z R07 不另外蓋掉、關閉鍵、書頁列高、紙籤、對局頁小控制項、安全區）。
// 用法：node --test xiangqi-lab/tools/test-touch-fixes.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const DB = path.join(__dirname, "../../xiangqi-db");
const rd = f => fs.readFileSync(path.join(DB, f), "utf8").replace(/\r\n/g, "\n");
const CSS = rd("m.css"), EXITS = rd("m/07w9-exits.js"), DESK = rd("m/10c-deskmap.js"), LIB = rd("m/10b-libmap.js"), WALK = rd("m/07w-shipwalk.js"), SET = rd("m/07s2-setmap.js"), PRE = rd("m/09b-preload.js");
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到：" + a); const j = s.indexOf(b, i + a.length); assert.ok(j > i, "找不到結尾：" + b); return s.slice(i, j + b.length) };
const line = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到：" + a); return s.slice(i, s.indexOf("\n", i)) };
const rect = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h });

/* ---------- 行為：出口標籤（07w9 exInY） ---------- */
function exitKit({ vh, safeB, pageBottom, labelTop, labelH }) {
  const FN = cut(EXITS, "function exSafeB(){", "return v}catch(e){return 0}}") + "\n" + cut(EXITS, "function exInY(s,V,P){", "px)\"}");
  const s = { dataset: {}, style: { top: "88%" }, getBoundingClientRect() { const m = /- (\d+)px/.exec(s.style.top); const t = labelTop - (m ? +m[1] : 0); return rect(20, t, 108, labelH) } };
  const V = { getBoundingClientRect: () => rect(0, 60, 375, vh - 60) }, P = { getBoundingClientRect: () => rect(0, 60, 375, pageBottom - 60) };
  const document = { createElement: () => ({ style: {}, remove() { } }), body: { append() { } } };
  const getComputedStyle = () => ({ paddingBottom: safeB + "px" });
  const exInY = new Function("document", "getComputedStyle", "innerHeight", FN + ";return exInY")(document, getComputedStyle, vh);
  exInY(s, V, P);
  return s;
}
test("iPhone SE：掉出畫面的出口標籤往上推，下緣（含 44px 點選範圍）留在視窗高 − 12px 以內", () => {
  const s = exitKit({ vh: 667, safeB: 0, pageBottom: 760, labelTop: 649, labelH: 26 });
  const r = s.getBoundingClientRect();
  assert.match(s.style.top, /^calc\(88% - \d+px\)$/);
  assert.ok(r.bottom + (44 - 26) / 2 <= 667 - 12, "下緣 " + r.bottom);
  assert.equal(s.dataset.exT, "88%", "記住原本的位置，重算時從原位算");
});
test("有底部安全區（Home 條 34px）時讓開安全區；本來就在畫面內的不動", () => {
  const a = exitKit({ vh: 956, safeB: 34, pageBottom: 1100, labelTop: 920, labelH: 26 });
  assert.ok(a.getBoundingClientRect().bottom + 9 <= 956 - 34);
  const b = exitKit({ vh: 956, safeB: 34, pageBottom: 1100, labelTop: 700, labelH: 26 });
  assert.equal(b.style.top, "88%");
});

/* ---------- 行為：油盞（搜尋）避開上方卡片（10c sjLampFit） ---------- */
test("油盞被「匯入棋譜／局面還原」那排蓋住時往下挪到卡片下面，紙籤同一欄就往右讓開", () => {
  const FN = cut(DESK, "function sjLampFit(pn,fr){", "}}catch(e){}}");
  const lamp = { style: { marginTop: "" }, getBoundingClientRect() { const d = parseFloat(this.style.marginTop) || 0; return rect(101, 170 + d, 51, 51) } };
  const slips = { style: { paddingLeft: "" }, getBoundingClientRect: () => rect(97, 214, 230, 44) };
  const page = { getBoundingClientRect: () => rect(97, 258, 230, 120) };
  const fr = { querySelector: q => q === ".sj-lamp" ? lamp : q === ".sj-slips" ? slips : q === ".sj-p" ? page : null };
  const chips = { pe: "auto", getBoundingClientRect: () => rect(0, 139, 375, 49) }, head = { pe: "auto", getBoundingClientRect: () => rect(0, 60, 375, 46) };
  const pn = { querySelectorAll: () => [head, chips] };
  const sjLampFit = new Function("getComputedStyle", FN + ";return sjLampFit")(e => ({ pointerEvents: e.pe }));
  sjLampFit(pn, fr);
  const L = lamp.getBoundingClientRect();
  assert.ok(L.top >= 188, "油盞上緣 " + L.top + " 要在卡片下緣 188 以下");
  assert.ok(L.bottom <= 258 + 4, "不挪進書頁");
  assert.ok(parseFloat(slips.style.paddingLeft) >= L.right - 97, "紙籤往右讓開油盞");
});
test("沒有被蓋住時油盞、紙籤都不動", () => {
  const FN = cut(DESK, "function sjLampFit(pn,fr){", "}}catch(e){}}");
  const lamp = { style: { marginTop: "" }, getBoundingClientRect: () => rect(101, 170, 51, 51) };
  const slips = { style: { paddingLeft: "" }, getBoundingClientRect: () => rect(97, 240, 230, 20) };
  const fr = { querySelector: q => q === ".sj-lamp" ? lamp : q === ".sj-slips" ? slips : null };
  const sjLampFit = new Function("getComputedStyle", FN + ";return sjLampFit")(() => ({ pointerEvents: "auto" }));
  sjLampFit({ querySelectorAll: () => [{ getBoundingClientRect: () => rect(0, 60, 375, 46) }] }, fr);
  assert.equal(lamp.style.marginTop, ""); assert.equal(slips.style.paddingLeft, "");
});

/* ---------- 行為：同機對下認輸確認框（09b） ---------- */
function resignText(side, red, black) {
  const L = line(PRE, '["resign","🏳","認輸",');
  const arrow = cut(L, "()=>{if(st){", "\"認輸\")}}");
  let msg = null;
  const f = new Function("st", "mySide", "PLAYER", "confirmBox", "post", "return " + arrow)({ red, black }, () => side, { r: "紅方", b: "黑方" }, m => { msg = m }, () => { });
  f(); return msg;
}
test("同機對下認輸：沒取名字時不再寫「黑方（黑方）」；有名字照舊加括號", () => {
  assert.equal(resignText("b", "紅方", "黑方"), "黑方確定認輸？");
  assert.equal(resignText("r", "紅方", "黑方"), "紅方確定認輸？");
  assert.equal(resignText("b", "小明", "阿華"), "黑方（阿華）確定認輸？");
  assert.equal(resignText("r", "", "黑方"), "紅方確定認輸？");
});

/* ---------- 混合：座標表在 iPhone SE 上的 44px 點選範圍不互相重疊 ---------- */
const ov = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
test("〔混合〕設定場景：字體、本命棋子、小鎖匣的 44px 點選範圍互不重疊，也不超出 375px 畫面", () => {
  const arr = new Function("return " + cut(SET, "const SM_SPOTS=[", "]];").slice("const SM_SPOTS=".length, -1))();
  const W = 375, H = 375 * 1376 / 768, w = { smBrush: 62, smKnife: 93, smLock: 44 };
  const box = id => { const [, x, y] = arr.find(z => z[0] === id); const cx = x / 100 * W, cy = y / 100 * H; return rect(cx - w[id] / 2 - 6, cy - 22, w[id] + 12, 44) };
  const B = box("smBrush"), K = box("smKnife"), L = box("smLock");
  assert.ok(!ov(B, K), "字體 vs 本命棋子"); assert.ok(!ov(B, L), "字體 vs 小鎖匣"); assert.ok(!ov(K, L), "本命棋子 vs 小鎖匣");
  for (const r of [B, K, L]) assert.ok(r.right - 6 <= W && r.left + 6 >= 0, "標籤在畫面內");
});
test("〔混合〕棋譜庫：書樓三口箱 44px 互不重疊；經典世界的三冊合成一顆（點了開三冊選單）", () => {
  const LB = new Function("return " + cut(LIB, "const LB_BOX=", "];").slice("const LB_BOX=".length, -1))();
  const bx = LB.map(([x]) => { const c = x / 100 * 375, w = Math.max(44, 375 * .105); return rect(c - w / 2, 0, w, 44) });
  for (let i = 1; i < bx.length; i++) assert.ok(!ov(bx[i - 1], bx[i]), "第 " + i + "、" + (i + 1) + " 箱");
  assert.ok(bx[2].right <= 375 + .5, "第 3 箱不超出右緣");
  assert.match(LIB, /CLB\?`<button class="lb-box lb-one"/);
  assert.match(LIB, /lbTours\(P,book,b\.dataset\.i==null\?undefined:\+b\.dataset\.i\)/);
});

/* ---------- 原始碼：44px 規則 ---------- */
test("〔原始碼〕場景金框標籤的 44px 點選範圍交給 07z R07（::before＋相鄰切開），m.css 不另外蓋掉它的 ::before", () => {
  const HM = rd("m/07z-homemap.js");
  assert.match(HM, /const R07_HIT_ON=true;/);
  assert.match(HM, /const R07_HIT_SEL="\.shp-spot,\.shp-hs,\.po-sight";/);
  assert.match(HM, /function r07Solve\(L,o\)\{o=o\|\|\{\};const M=o\.min\|\|44/);
  assert.ok(!/\.shp-(spot|hs)(:not\(\.hot\))?::before\{content:""/.test(CSS), "m.css 裡有 .shp-spot／.shp-hs 的 ::before 會跟 R07 的點選範圍打架");
});
test("〔原始碼〕面板關閉鍵、比賽對局箱、角色按鈕、💬 泡泡", () => {
  assert.match(LIB, /\.lb-pn-h button\{[^}]*min-width:44px;min-height:44px/);
  assert.match(LIB, /\.lb-box\{[^}]*min-width:44px;min-height:44px/);
  assert.match(WALK, /\.xqs-h button\{[^}]*min-width:44px;min-height:44px/);
  assert.match(WALK, /\.shw-hint\{[^}]*pointer-events:none/);
  assert.match(WALK, /wm=Math\.max\(44,w0\)/);
});
test("〔原始碼〕大師對局清單：觸控時列高 48、翻頁鍵與紙籤至少 44", () => {
  assert.match(DESK, /rh=co\?48:/);
  assert.match(DESK, /pad=co\?\[4,4\]:/);
  assert.match(DESK, /\.sj-co \.sj-ft\{bottom:-54px;height:44px/);
  assert.match(DESK, /\.sj-co \.sj-ft button\{min-height:44px/);
  assert.match(DESK, /\.sj-co \.sj-slips button\{min-height:44px/);
  assert.match(DESK, /pn\.classList\.toggle\("sj-co",sjCoarse\(\)\)/);
});
test("〔原始碼〕對局頁：棋規徽章、3D 場景、著法籤 44 高；頂欄圖示有間隔；星槎「立體」讓開底部安全區", () => {
  assert.match(CSS, /\.rule-note>summary\{[^}]*min-height:44px!important/);
  assert.match(CSS, /\.pk3d-back button\{[^}]*min-height:44px/);
  assert.match(CSS, /\.strip \.chip\{min-height:44px/);
  assert.match(CSS, /#topRight\{display:flex;flex:none;gap:4px\}/);
  assert.match(CSS, /\.shp-gy\{[^}]*bottom:calc\(10px \+ env\(safe-area-inset-bottom,0px\)\)/);
  assert.match(CSS, /\.set-page #smLock\{min-width:44px/);
  assert.match(CSS, /\.tmx-bub\.out\{opacity:0;pointer-events:none\}/, "淡出中的提示泡泡不能擋住出口標籤");
  assert.match(CSS, /\.shp-gy::before\{content:"";position:absolute;left:-4px;right:-4px;top:-11px;bottom:-11px\}/);
});

test("〔原始碼〕11/13 開發者截圖：首頁「回報問題」跟快速對局置中對齊（列裡的 .hm-inst 把 left、bottom 歸零）；今日推薦建好立刻推回畫面內、下一幀前再推一次（不再先畫在外面再跳）",()=>{
  const HM=require("fs").readFileSync(require("path").join(__dirname,"../../xiangqi-db/m/07z-homemap.js"),"utf8");
  assert.ok(HM.includes(".hm-go-bar .hm-inst{position:relative;left:auto;bottom:auto;transform:none}"));
  assert.ok(HM.includes('addEventListener("resize",rs);cl();requestAnimationFrame(cl);setTimeout(cl,60);setTimeout(cl,700);'));
});
