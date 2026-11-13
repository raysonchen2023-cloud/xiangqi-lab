// 11/13 第 16 輪「版面缺陷清零」（依 r15 devices/device-fit.md：21 種尺寸 × 8 頁）的鎖定測試，不開瀏覽器。
// 修法：
//   棋譜庫（10b-libmap）：收起的宣紙面板 visibility:hidden；6 個書名籤改成裝飾（span、不接點選），整排的透明點選區 .lb-shelf 當唯一入口（有 aria-label）。
//   線上大廳（07x2-lobbymap）：空桌、暗燈改成 span；亮燈用透明 ::after 擴到 44×44、掛牌包進燈框、lmSlots 讓亮燈彼此隔開；收起的名冊抽屜 visibility:hidden。
//   小人頭上的 💬（07w-shipwalk .shw-hint）改成裝飾 span；首頁等場景的朝代殘影（07y .cy）用 m.css 的透明 ::after 擴到 44×44；320 寬頂欄晉級賽／練功房兩行。
//   殘影被頂欄、入口標籤蓋到一角時，07sp spfCy 把它上下挪開（相鄰殘影的 44×44 方格也互相讓開）。
//   量測（tools/qa/device-fit.js）：時辰鐘「文字超框」是看不見的 <text opacity=0> 造成的誤報 → splitFalsePos 排除並寫理由；小於 44 的元素改用 9 點 elementFromPoint 量實際點選範圍；只給讀屏的隱藏清單（07w6 .sci-sr）不算。
// 用法：node --test xiangqi-lab/tools/test-layout-r16.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const DB = path.join(__dirname, "../../xiangqi-db");
const rd = f => fs.readFileSync(path.join(DB, f), "utf8").replace(/\r\n/g, "\n");
const LIB = rd("m/10b-libmap.js"), LOBBY = rd("m/07x2-lobbymap.js"), WALK = rd("m/07w-shipwalk.js"), CSS = rd("m.css"), CLK = rd("m/07w8-shichen.js");
const FIT = require("./qa/device-fit.js");
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到：" + a); const j = s.indexOf(b, i + a.length); assert.ok(j > i, "找不到結尾：" + b); return s.slice(i, j + b.length) };

/* ---------- 行為：大廳燈位（07x2 lmSlots／lmFar） ---------- */
function lobbyKit() {
  const src = cut(LOBBY, "const LM_LAMPS=(()=>{", "return L})();") + "\n" + cut(LOBBY, "const LM_SLOT={};", "return true}");
  const ctx = vm.createContext({ Math, Set, Object, String });
  vm.runInContext(src + "\n;this.K={LM_LAMPS,LM_SLOT,lmSlots,lmFar,LM_GAP};", ctx);
  return ctx.K;
}
const gap = (L, a, b) => Math.max(Math.abs(L[a][0] - L[b][0]), Math.abs(L[a][1] - L[b][1]) * 1376 / 768);

test("大廳：人不多時，每盞亮燈彼此至少隔 LM_GAP（手機 375 寬約 44px），44×44 的點選範圍不互相蓋到", () => {
  const K = lobbyKit(), ids = ["p:alice", "p:bob", "jc:shen", "jc:jiangnan", "cloud:1", "p:chen"];
  K.lmSlots(ids);
  const s = ids.map(id => K.LM_SLOT[id]);
  assert.equal(new Set(s).size, ids.length, "一人一盞");
  for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) assert.ok(gap(K.LM_LAMPS, s[i], s[j]) >= K.LM_GAP, `${ids[i]} 跟 ${ids[j]} 的燈太近`);
  assert.ok(K.LM_GAP * 375 / 100 >= 44, "LM_GAP 換成 375 寬手機的像素要 ≥ 44");
});
test("大廳：同一個人一直用同一盞（重算不換）；離開的人燈收回；人比燈多時照舊每人一盞、不重複", () => {
  const K = lobbyKit();
  K.lmSlots(["a", "b", "c"]); const a0 = K.LM_SLOT.a, b0 = K.LM_SLOT.b;
  K.lmSlots(["a", "b", "c", "d"]); assert.equal(K.LM_SLOT.a, a0); assert.equal(K.LM_SLOT.b, b0);
  K.lmSlots(["a", "d"]); assert.equal(K.LM_SLOT.b, undefined); assert.equal(K.LM_SLOT.a, a0);
  const many = Array.from({ length: K.LM_LAMPS.length }, (_, i) => "u" + i); K.lmSlots(many);
  const v = many.map(id => K.LM_SLOT[id]);
  assert.ok(v.every(x => x != null), "每個人都有燈"); assert.equal(new Set(v).size, many.length, "不重複");
});

/* ---------- 行為：量測誤報排除（tools/qa/device-fit.js splitFalsePos） ---------- */
test("量測：超出框的只有看不見的字（時辰鐘 clk-big）＝誤報，排除並附理由；看得到的字也超框、或找不到元素，照舊算問題", () => {
  const fit = [
    { type: "box", text: "子 丑 寅 卯 辰時", detail: "文字範圍 12～68 × 6～78，元素框 12～68 × 22～78" },
    { type: "box", text: "適情", detail: "x" },
    { type: "tapOverlap", text: "A ⟷ B", detail: "y" },
    { type: "cut", text: "練功房", detail: "z" },
  ];
  const chk = [{ visOut: false, hidOut: true, hidTxt: ["辰時"] }, { visOut: true, hidOut: false, hidTxt: [] }, null, null];
  const { keep, fp } = FIT.splitFalsePos(fit, chk);
  assert.deepEqual(keep.map(f => f.text), ["適情", "A ⟷ B", "練功房"]);
  assert.equal(fp.length, 1); assert.match(fp[0].why, /看不見的字（辰時/);
  assert.deepEqual(FIT.splitFalsePos(fit, null).keep.length, 4, "沒有重量結果就全部照舊算");
  assert.equal(FIT.splitFalsePos([{ type: "box", text: "x", detail: "" }], [{ visOut: true, hidOut: true, hidTxt: ["y"] }]).fp.length, 0, "看得到的字也超框就不排除");
});
test("〔原始碼〕時辰鐘誤報的來源還在：clk-big 是 opacity 0、在圓形 clip-path 裡（改了這裡，誤報規則要重新檢查）", () => {
  assert.match(CLK, /<g clip-path="url\(#clkClip\)">/);
  assert.match(CLK, /<text class="clk-big" x="0" y="0" opacity="0">/);
});
test("〔原始碼〕量測：小於 44 的元素用 9 點 elementFromPoint 量實際點選範圍（擴大點選區的才不會被誤算成太小）", () => {
  const S = fs.readFileSync(path.join(__dirname, "qa/device-fit.js"), "utf8");
  assert.match(S, /for \(const dx of \[-21, 0, 21\]\) for \(const dy of \[-21, 0, 21\]\)/);
  assert.match(S, /document\.elementFromPoint\(x, y\)/);
  assert.match(S, /splitFalsePos\(fit0, chk\)/);
  assert.match(S, /if \(!vis\(e\) \|\| e\.closest\("svg,#axLive,\.ax-sr"\) \|\| srOnly\(e\)\) continue;/, "只給讀屏的隱藏清單不算太小的可點元素");});

/* ---------- 混合：從原始碼取出座標表，算 44×44 點選範圍 ---------- */
test("〔混合〕首頁、棋譜庫、對戰頁的朝代殘影（07y CY_SPOT）擴到 44×44 後，在 375 寬手機上同一頁互不重疊", () => {
  const spot = vm.runInNewContext("(" + cut(rd("m/07y-hubmap.js"), "const CY_SPOT=", "]]};").slice("const CY_SPOT=".length).replace(/;$/, "") + ")");
  const W = 375, H = W * 1376 / 768;
  for (const [pg, L] of Object.entries(spot)) for (let i = 0; i < L.length; i++) for (let j = i + 1; j < L.length; j++) {
    const a = L[i], b = L[j], dx = Math.abs(a[1] - b[1]) * W / 100, dy = Math.abs(a[2] - b[2]) * H / 100;
    assert.ok(dx >= 44 || dy >= 44, `${pg}：${a[0]} 跟 ${b[0]} 的 44×44 點選範圍會重疊`);
  }
  assert.match(CSS, /\.cy::after\{content:"";position:absolute;left:50%;top:50%;width:max\(100%,44px\);height:max\(100%,44px\);transform:translate\(-50%,-50%\)/);
});

/* ---------- 行為：殘影讓開頂欄和標籤（07sp spfCy） ---------- */
function cyKit(topbar) {
  const ctx = vm.createContext({ setTimeout: () => 0, clearTimeout: () => { }, requestAnimationFrame: () => 0, addEventListener: () => { }, Math,
    document: { getElementById: id => id === "topbar" && topbar ? { getBoundingClientRect: () => topbar } : null, querySelectorAll: () => [], body: {} } });
  vm.runInContext(rd("m/07sp-spotfit.js"), ctx);
  return ctx.spfCy;
}
const box = (l, t, w, h) => ({ left: l, top: t, width: w, height: h, right: l + w, bottom: t + h });
function cyEl(name, l, t, w, h) {
  const b = { name, style: { translate: "" }, dataset: {}, getClientRects: () => [1],
    getBoundingClientRect() { const m = /^0 (-?[\d.]+)px$/.exec(b.style.translate), d = m ? +m[1] : 0; return box(l, t + d, w, h) } };
  return b;
}
const cyPage = (cys, spots, H = 700, W = 375) => { const L = { querySelectorAll: () => cys }; return { offsetHeight: H, querySelector: q => q === ":scope>.cy-l" ? L : null, querySelectorAll: () => spots, getBoundingClientRect: () => box(0, 0, W, H) } };
const sq = b => { const r = b.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; return box(cx - 22, cy - 22, 44, 44) };
const inter = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 0.5 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 0.5;

test("殘影：上半截在頂欄底下（SE 首頁「赤壁樓船」）＝往下挪到 44×44 方格不碰頂欄；下緣壓到標籤 44 高點選範圍（棋譜庫「古戲台」）＝往上挪；沒碰到的不動", () => {
  const spfCy = cyKit(box(0, 0, 375, 80));
  const ship = cyEl("赤壁樓船", 158, 63, 38, 29), far = cyEl("漢闕", 20, 300, 41, 33);
  const lbl = { getBoundingClientRect: () => box(243, 395, 125, 28) }, opera = cyEl("古戲台", 313, 353, 41, 37);
  const n = spfCy(cyPage([ship, far, opera], [lbl]));
  assert.equal(n, 2);
  assert.ok(sq(ship).top >= 80, "赤壁樓船的方格要在頂欄下面");
  assert.ok(+ship.dataset.spfCy > 0 && +ship.dataset.spfCy <= 64);
  const lb = box(243, 395 - 8, 125, 28 + 16);   // 標籤 28 高 → 點選範圍 44 高
  assert.ok(!inter(sq(opera), lb), "古戲台的方格不能碰到標籤的點選範圍");
  assert.ok(+opera.dataset.spfCy < 0, "往上挪");
  assert.equal(far.style.translate, "", "沒碰到的不動");
  assert.equal(spfCy(cyPage([ship, far, opera], [lbl])), 0, "再算一次不再動（從目前位置扣掉挪動量算原位）");
});
test("殘影：相鄰兩個的 44×44 方格會互相蓋到（320 寬只隔 41px）＝後一個上下讓開；擠不下（±64px 內找不到）就留在原位", () => {
  const spfCy = cyKit(null);
  const a = cyEl("A", 10, 200, 38, 40), b = cyEl("B", 52, 205, 35, 29);
  spfCy(cyPage([a, b], []));
  assert.equal(a.style.translate, ""); assert.ok(!inter(sq(a), sq(b)), "讓開後不重疊");
  const c = cyEl("C", 100, 100, 30, 30), wall = { getBoundingClientRect: () => box(0, 0, 375, 700) };
  spfCy(cyPage([c], [wall])); assert.equal(c.style.translate, "", "四面都被擋就不動");
});

/* ---------- 原始碼：標記與樣式 ---------- */
test("〔原始碼〕棋譜庫：收起的面板 visibility:hidden（動畫結束才藏）；書名籤是不接點選的 span；透明點選區有 aria-label、不再 aria-hidden", () => {
  assert.match(LIB, /\.lb-pn\{visibility:hidden;transition:transform \.3s ease,visibility 0s linear \.3s\}\.lb-pn\.open\{visibility:visible/);
  assert.match(LIB, /<span class="lb-cell" id="lbC\$\{i\}"[^`]*aria-hidden="true"><span>\$\{esc\(n\)\}<\/span><\/span>/);
  assert.doesNotMatch(LIB, /<button class="lb-cell"/);
  assert.match(LIB, /\.lb-cell\{pointer-events:none\}/);
  assert.match(LIB, /sh\.className="lb-shelf";sh\.setAttribute\("aria-label"/);
  assert.doesNotMatch(LIB, /sh\.className="lb-shelf";sh\.setAttribute\("aria-hidden"/);
});
test("〔原始碼〕大廳：空桌、暗燈是 span（aria-hidden）；亮燈 ::after 44×44；掛牌包在燈框裡；收起的名冊抽屜 visibility:hidden", () => {
  assert.match(LOBBY, /const tg=t\.empty\?"span":"button";/);
  assert.match(LOBBY, /const tg=o\?"button":"span";/);
  assert.doesNotMatch(LOBBY, /"空著的燈"\}" tabindex/);
  assert.match(LOBBY, /\.lm-lp\.on::after\{content:"";position:absolute;left:50%;top:50%;width:max\(100%,44px\);height:max\(100%,44px\)/);
  assert.match(LOBBY, /\.lm-lp\.ink\.fam,\.lm-lp\.ink\.story\{aspect-ratio:20\/62\}/);
  assert.match(LOBBY, /\.lm-dw\{visibility:hidden;transition:transform \.28s ease,visibility 0s linear \.28s\}\.lm-dw\.open\{visibility:visible/);
});
test("〔原始碼〕小人頭上的 💬 是裝飾 span（aria-hidden），點的是包住它的 .shw-me；320 寬頂欄晉級賽／練功房改兩行", () => {
  assert.match(WALK, /const hint=document\.createElement\("span"\);hint\.className="shw-hint";hint\.textContent="💬";hint\.setAttribute\("aria-hidden","true"\);/);
  assert.match(CSS, /@media \(max-width:359px\)\{\.cpu-seg button\{white-space:normal;[^}]*font-size:11px/);
});
