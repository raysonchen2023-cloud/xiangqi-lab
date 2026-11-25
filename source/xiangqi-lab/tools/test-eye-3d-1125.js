/* 11/25 真人視角自動截圖（W121，手機 375×812）找到的兩個 3D 畫面問題（P3）：
   W121-4：3D 開著、開新局馬上走子，走完第 1 步 3 秒才跳出「拖曳轉身看四周」手勢提示蓋住棋盤
           → 06-cpu.js parkUi 的手勢提示：園子出現後玩家先碰了畫面或按了鍵，排隊中的提示就不出、不記 parkHint（下次進 3D 再提示）。
             把 06-cpu.js 那一段原樣切出來，用假的 DOM、假計時器在 vm 裡實跑。
   W121-6：「點棋子走棋・點物件看介紹…」操作小字被「▦ 平面棋盤」、＋／－、「咸陽到邯鄲有多遠？」小紙條壓住
           → park3d.js 操作提示抬到按鈕和小紙條上面、太長就換行。建立提示那一行原樣在 vm 裡跑，拿實際設定的樣式；
             跟其他按鈕的相對位置只能從原始碼的數字算，標〔原始碼〕。
   用法：node source/run-tests.js test-eye-3d-1125.js */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const CPU = rd(path.join(M, "06-cpu.js")), CSS = rd(path.join(DB, "m.css"));
const P3F = path.join(LAB, "src/park3d.js"), HAVE_P3 = fs.existsSync(P3F), P3 = HAVE_P3 ? rd(P3F) : "";
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, "找不到 " + a.slice(0, 40)); return s.slice(i, j) };

/* ---------- W121-4：手勢提示沙箱 ---------- */
const HINT_SRC = cut(CPU, '  if(!store.get("parkHint",false)){', '\n  if(typeof yuHintMaybe==="function")');
function sandbox({ whenShown = true } = {}) {
  let now = 0; const timers = [];
  const setTimeout = (f, ms) => { timers.push({ t: now + (+ms || 0), f }); return timers.length };
  const advance = ms => { const end = now + ms; for (;;) { timers.sort((a, b) => a.t - b.t); const x = timers[0]; if (!x || x.t > end) break; timers.shift(); now = x.t; x.f() } now = end };
  const mkL = () => { const L = {}; return { L, add: (t, f, c) => { (L[t] = L[t] || []).push(f) }, rm: (t, f) => { if (L[t]) L[t] = L[t].filter(g => g !== f) }, fire: (t, e) => { for (const f of (L[t] || []).slice()) f(e || { type: t }) } } };
  const DL = mkL(), HL = mkL();
  const el = () => { const c = new Set(); return { style: {}, className: "", innerHTML: "", classList: { add: x => c.add(x), remove: x => c.delete(x), contains: x => c.has(x) }, removed: false, remove() { this.removed = true } } };
  const flags = { kjfx: false, mhTip: false, fx: false };
  const hostCls = new Set(), kids = [];
  const host = { isConnected: true, append: k => kids.push(k), querySelector: q => q === ".mh-tip.on" && flags.mhTip ? {} : null, classList: { add: x => hostCls.add(x), remove: x => hostCls.delete(x), contains: x => hostCls.has(x) }, addEventListener: HL.add, removeEventListener: HL.rm };
  const document = { createElement: () => el(), querySelector: q => q === ".kjfx" && flags.kjfx ? {} : null, addEventListener: DL.add, removeEventListener: DL.rm };
  const saved = {}; const store = { get: (k, d) => k in saved ? saved[k] : d, set: (k, v) => { saved[k] = v } };
  const shownCb = []; const pv = whenShown ? { whenShown: f => shownCb.push(f) } : {};
  const ctx = { store, host, pv, document, setTimeout, fxBusy: () => flags.fx, Date: { now: () => now } };
  vm.createContext(ctx); vm.runInContext("var PK_HTS=0;\n" + HINT_SRC, ctx);
  const hints = () => kids.filter(k => k.className === "pkhint");
  const docN = () => (DL.L.pointerdown || []).length + (DL.L.keydown || []).length;
  return { advance, show: () => shownCb.splice(0).forEach(f => f()), flags, host, hints, saved, docN, DL, HL, hostCls };
}

test("W121-4 沒碰畫面：園子出現 0.3 秒後照常跳出手勢提示、記 parkHint，3 秒後自己收掉", () => {
  const S = sandbox(); S.show(); S.advance(299); assert.equal(S.hints().length, 0, "0.3 秒前還沒出");
  S.advance(1); assert.equal(S.hints().length, 1, "0.3 秒時出"); assert.equal(S.saved.parkHint, true); assert.ok(S.hostCls.has("pk-hinting"));
  assert.equal(S.docN(), 0, "提示出來後，等玩家操作的全頁監聽就拿掉");
  S.advance(3000); assert.equal(S.hints()[0].classList.contains("out"), true, "3 秒後淡出"); S.advance(500); assert.equal(S.hints()[0].removed, true); assert.equal(S.hostCls.has("pk-hinting"), false);
});

test("W121-4 截圖情境：開局特效（.kjfx）擋著時玩家先走了一步（按下去）→ 特效收掉後也不再跳提示、不記 parkHint、監聽拿掉", () => {
  const S = sandbox(); S.flags.kjfx = true; S.show(); S.advance(2000); assert.equal(S.hints().length, 0, "特效還在，排隊等");
  assert.ok(S.docN() > 0, "等的這段有在聽玩家操作");
  S.DL.fire("pointerdown"); S.flags.kjfx = false; S.advance(4000);
  assert.equal(S.hints().length, 0, "已經走子，不跳提示"); assert.equal(S.saved.parkHint, undefined, "不記，下次進 3D 再提示"); assert.equal(S.docN(), 0, "監聽拿掉");
});

test("W121-4 小紙條（.mh-tip.on）開著時玩家用鍵盤走子 → 不跳提示", () => {
  const S = sandbox(); S.flags.mhTip = true; S.show(); S.advance(1500); S.DL.fire("keydown"); S.flags.mhTip = false; S.advance(3000);
  assert.equal(S.hints().length, 0); assert.equal(S.saved.parkHint, undefined); assert.equal(S.docN(), 0);
});

test("W121-4 園子出現前（過場還在）點的那一下不算：出現後沒再碰就照常提示", () => {
  const S = sandbox(); S.DL.fire("pointerdown"); assert.equal(S.docN(), 0, "還沒出現前不聽");
  S.show(); S.advance(300); assert.equal(S.hints().length, 1);
});

test("W121-4 園子出現後 0.3 秒內就點下去 → 不提示；沒有 whenShown 的舊版 park3d 走 1.2 秒那條也一樣", () => {
  const A = sandbox(); A.show(); A.advance(100); A.DL.fire("pointerdown"); A.advance(5000); assert.equal(A.hints().length, 0); assert.equal(A.docN(), 0);
  const B = sandbox({ whenShown: false }); B.advance(500); B.DL.fire("pointerdown"); B.advance(5000); assert.equal(B.hints().length, 0); assert.equal(B.saved.parkHint, undefined);
  const C = sandbox({ whenShown: false }); C.advance(1200); assert.equal(C.hints().length, 1, "沒碰就 1.2 秒照常出");
});

test("W121-4 已經看過提示（parkHint 記過）就完全不排、不掛監聽", () => {
  const ctxOk = (() => { const S = sandbox(); S.show(); S.advance(300); return S.saved.parkHint })(); assert.equal(ctxOk, true);
  let added = 0; const ctx = { store: { get: (k, d) => k === "parkHint" ? true : d, set() {} }, host: {}, pv: { whenShown() { throw new Error("不該排") } }, document: { addEventListener() { added++ } }, setTimeout() { throw new Error("不該排") }, fxBusy: () => false };
  vm.createContext(ctx); vm.runInContext("var PK_HTS=0;\n" + HINT_SRC, ctx); assert.equal(added, 0);
});

test("〔原始碼〕W121-4 06-cpu.js：用到的名稱只在 parkUi 這段區塊內（pkHU／pkHT／pkHO 不成為全域）、沒有 // 註解", () => {
  const all = fs.readdirSync(M).filter(f => f.endsWith(".js")).map(f => rd(path.join(M, f))).join("\n");
  for (const n of ["pkHU", "pkHT", "pkHO"]) { const hits = all.split(n).length - 1, inBlock = HINT_SRC.split(n).length - 1; assert.ok(inBlock > 0 && hits === inBlock, n + " 只在這段出現"); }
  assert.match(HINT_SRC, /\{let pkHU=false;const pkHT=/, "宣告在 if 區塊內（let／const，區塊作用域）");
  assert.ok(!/[^:"'`]\/\/[^*]/.test(HINT_SRC.replace(/https?:\/\//g, "")), "沒有 // 註解");
});

/* ---------- W121-6：操作提示的位置 ---------- */
const HINT_LINE = HAVE_P3 ? P3.split("\n").find(l => /^\s*const hint=document\.createElement\("div"\);hint\.style\.cssText=/.test(l)) : null;
const runHint = () => { const ctx = { document: { createElement: () => ({ style: {} }) } }; vm.createContext(ctx); vm.runInContext(HINT_LINE + "\nthis.h=hint", ctx); return ctx.h.style.cssText };
const cssMap = s => Object.fromEntries(s.split(";").filter(Boolean).map(x => { const i = x.indexOf(":"); return [x.slice(0, i).trim(), x.slice(i + 1).trim()] }));
const px = v => { const m = /^(-?\d+(?:\.\d+)?)px$/.exec(String(v)); assert.ok(m, "不是 px：" + v); return +m[1] };

test("W121-6 park3d.js 建立操作提示那一行實跑：抬高、可換行置中、不超出園子寬；字級顏色淡出照舊", { skip: HAVE_P3 ? false : "沒有 xiangqi-lab/src/park3d.js" }, () => {
  assert.ok(HINT_LINE, "找得到建立提示那一行");
  const c = cssMap(runHint());
  assert.equal(c.position, "absolute"); assert.equal(c.left, "50%"); assert.equal(c.transform, "translateX(-50%)");
  assert.ok(px(c.bottom) >= 90, "抬到按鈕上面：bottom=" + c.bottom);
  assert.equal(c["white-space"], undefined, "不再 nowrap（太長要能換行）"); assert.equal(c.width, "max-content", "短的照字長一行"); assert.equal(c["max-width"], "calc(100% - 24px)"); assert.equal(c["box-sizing"], "border-box"); assert.equal(c["text-align"], "center");
  assert.equal(c.font, "600 11px sans-serif"); assert.equal(c.color, "#fff"); assert.equal(c["pointer-events"], "none"); assert.equal(c.transition, "opacity .6s");
});

test("〔原始碼〕W121-6 提示底邊高過左下 ▦ 平面棋盤、右下 ＋／－（含 pkHitCss 撐開的 12px 間隔）、「〇〇到〇〇有多遠？」小紙條（兩行）", { skip: HAVE_P3 ? false : "沒有 xiangqi-lab/src/park3d.js" }, () => {
  const bottom = px(cssMap(runHint()).bottom);
  /* ＋／－：.pzoom 底 8px、每顆 34 高；06-cpu pkHitCss 把間隔改成 12px */
  const inner = (a, b) => cut(P3, a, b).slice(a.length);
  const zb = cssMap(inner('zb.className="pzoom";zb.style.cssText="', '"')), zbtn = cssMap("width:34px;" + inner('b.setAttribute("aria-label",l);\n        b.style.cssText="width:34px;', '"'));
  const gap = +/\.pzoom,\.fvz\{gap:(\d+)px!important\}/.exec(CPU)[1];
  const zoomTop = px(zb.bottom) + 2 * px(zbtn.height) + gap; assert.equal(zoomTop, 88);
  assert.ok(bottom >= zoomTop + 4, "高過 ＋ 鈕（" + zoomTop + "）");
  /* ▦ 平面棋盤：m.css .pk2d 底 10px、min-height 38；pkHitCss ::before 撐到 44 高 */
  const pk2d = /\.pk2d\{[^}]*bottom:(\d+)px[^}]*min-height:(\d+)px/.exec(CSS); assert.ok(pk2d, "m.css .pk2d");
  assert.ok(bottom >= +pk2d[1] + Math.max(44, +pk2d[2]) + 4, "高過 ▦ 平面棋盤");
  /* 小紙條 .mh-note：底 14px、上下 padding 6、字 13.5px／1.45 一行＋small 12.5px 一行（各 1.45 行高）、邊框 1px */
  const note = /\.mh-note\{right:56px;bottom:(\d+)px;[^}]*padding:(\d+)px/.exec(P3); assert.ok(note, ".mh-note");
  const noteTop = +note[1] + 2 * +note[2] + 13.5 * 1.45 + 2 + 12.5 * 1.45 + 2; assert.ok(bottom >= noteTop + 4, "高過兩行小紙條（約 " + noteTop.toFixed(0) + "）");
});

test("〔原始碼〕W121-6 只動提示的位置與換行：提示文字、淡出時間、i18n 那句照舊", { skip: HAVE_P3 ? false : "沒有 xiangqi-lab/src/park3d.js" }, () => {
  assert.ok(P3.includes('hint.textContent="點棋子走棋・點物件看介紹・拖曳轉頭・兩指縮放";el.append(hint);if(veil._qmin)hint.style.opacity=0;else setTimeout(()=>hint.style.opacity=0,4500);'));
  assert.ok(!/bottom:8px;transform:translateX\(-50%\);font:600 11px/.test(P3), "舊的貼底樣式不在了");
});
