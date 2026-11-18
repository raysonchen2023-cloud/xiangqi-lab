// 11/18 第 33 輪（候選版 0556）P3 與觀察：
//   N33-4 減少動態時「要開螢幕報讀與鍵盤模式嗎？」跳在開場上 → 也看 stqHold；
//   N33-5 素材與授權拿掉檔名後留下殘字 → 正本改寫＋xqDocTidy；N33-6 英文介面把說明文件逐段誤翻（「來源：」→ Earn:）→ 文件內文整篇不翻；
//   觀察：網頁版 Service Worker 沒裝好（沒有多執行緒模式）時電腦不走、沒有提示 → 02-shell coiWarn。
// 不開瀏覽器：vm 跑程式片段、讀實際文件。
// 用法：node --test xiangqi-lab/tools/test-r36-1118.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
/* 公開副本（ROOT 有 STAGE-MANIFEST.json）：文件原稿退回 ../data/docs/（同 test-r33-1118.js）；還是找不到就略過 */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json"));
function alt(p) { p = String(p); if (!PUB || fs.existsSync(path.join(ROOT, p))) return p; const q = p.replace(/^xiangqi-db\/art\/docs(\/|$)/, "../data/docs$1"); return fs.existsSync(path.join(ROOT, q)) ? q : p }
function skipMissing(t0) {
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { if (PUB && e && e.code === "ENOENT") { t.skip("缺檔（公開副本不含）：" + e.path); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, j) };

test("N33-4：螢幕報讀詢問框等開場跑完——stqHold 還在（開場、序局、新手練習）就不跳、5 秒後再看，而且不算進 60 次；放手了才問", () => {
  const A = M("11b-a11y.js"), fn = between(A, "function axmAsk(why){", "\n{let tabs=0;");
  let hold = true, overlay = null; const modals = [], timers = [], st = {};
  const ctx = { store: { get: k => st[k] || 0, set: (k, v) => { st[k] = v } }, axmOn: () => false, axmHct: () => false, stqHold: () => hold, setTimeout: f => timers.push(f), modal: (h, b) => modals.push(h), toast() {}, esc: s => s,
    window: {}, document: { querySelector: s => (overlay && s.split(",").includes(overlay) ? {} : null) } };
  vm.createContext(ctx); vm.runInContext(fn + ";this.ask=axmAsk", ctx);
  for (let i = 0; i < 80; i++) { ctx.ask("你的系統開了「減少動態效果」"); assert.equal(modals.length, 0) }
  assert.equal(ctx.ask.n || 0, 0, "開場還在：等待不算進 60 次（開場可能好幾分鐘）");
  hold = false; overlay = "#bhxBk"; ctx.ask("x"); assert.equal(modals.length, 0, "黑洞底幕還在也等"); overlay = "#bhxVx"; ctx.ask("x"); assert.equal(modals.length, 0, "星渦也等");
  overlay = null; ctx.ask("你的系統開了「減少動態效果」"); assert.equal(modals.length, 1, "開場跑完才問"); assert.ok(/螢幕報讀與鍵盤模式/.test(modals[0])); assert.equal(st.axmAsk, 1);
  assert.ok(fn.includes('if(typeof stqHold==="function"&&stqHold())return true'));
});

/* ---------- 說明文件 ---------- */
function docKit() { const S = M("07gc-native.js"), a = S.indexOf("const XQDOC_DROP="), st = S.indexOf("function xqDocClean("), en = S.indexOf("\ntry{", st + 10);
  const ctx = {}; vm.createContext(ctx); vm.runInContext(S.slice(a, S.indexOf("\n", a)) + "\n" + S.slice(st, en) + ";this.c=xqDocClean;this.t=xqDocTidy", ctx); return ctx }
test("N33-5：素材與授權（中文）沒有刪字殘留——qrcodejs 那行留下 qrcode.min.js、自己寫的程式那行四個檔名都在；正本不再用 `檔名.js` 寫法（App 會拿掉）", () => {
  const C = docKit(), raw = rd("xiangqi-db/art/docs/credits.md"), out = C.c(raw);
  assert.ok(out.includes("[davidshimjs/qrcodejs](https://github.com/davidshimjs/qrcodejs) 的 qrcode.min.js（跟上游原檔比對，SHA-1 完全相同"), "qrcodejs 那行");
  assert.ok(out.includes("- three-shim.mjs、core.js（規則核心）、local.js、net.js 等：© 陳泓昇"), "自己寫的程式那行");
  assert.ok(out.includes("three.js r149（three.min.js、GLTFLoader.mjs、BufferGeometryUtils.mjs）") && out.includes("### Pikafish 引擎（engine/pikafish.wasm、pikafish.js）"));
  assert.ok(!/`[^`\n]*\.js`/.test(raw), "正本沒有 `….js`（App 的 xqDocClean 會整段拿掉）");
  for (const l of out.split("\n")) assert.ok(!/、\s*、|、\s*等|的 （|（\s*、|、\s*）|（\s*）|^\s*[-*]\s+[、，：]/.test(l), "殘字：" + l);
});
test("N33-5：xqDocTidy 把拿掉檔名後的殘字整理通順（只動被拿過字的行）；全部說明文件掃過一次都沒有殘字", () => {
  const C = docKit();
  assert.equal(C.t("- `three-shim.mjs`、（規則核心）、、 等：© 陳"), "- `three-shim.mjs`等：© 陳");
  assert.equal(C.t("來源：qrcodejs 的 （跟上游原檔比對）"), "來源：qrcodejs（跟上游原檔比對）");
  assert.equal(C.t("- ：混沌網路"), "- 混沌網路"); assert.equal(C.t("| release | 、、`release.json` 一樣 |"), "| release |`release.json` 一樣 |");
  assert.equal(C.c("程式在 `net.js`、`local.js`、`core.js` 三處。\n原本 這行、、不動"), "程式在三處。\n原本 這行、、不動", "沒被拿字的行照原樣");
  const D = path.join(ROOT, alt("xiangqi-db/art/docs")); let n = 0;
  for (const f of fs.readdirSync(D).filter(x => x.endsWith(".md"))) { const raw = fs.readFileSync(path.join(D, f), "utf8").replace(/\r\n/g, "\n"), L0 = new Set(raw.split("\n"));
    for (const l of C.c(raw).split("\n")) { if (L0.has(l)) continue; n++; assert.ok(!/、\s*、|、\s*等|的 （|（\s*、|、\s*）|（\s*）|^\s*[-*]\s+[、，：]|\|\s*[、，]/.test(l), f + "：" + l.slice(0, 120)) } }
  assert.ok(n > 20, "有掃到被拿過字的行：" + n);
});

test("N33-6：英文介面不逐段翻說明文件（<article class=\"xqdoc\"> 整篇跳過、照中文；最上面那句英文說明照舊）；「來源：」不會再變 Earn:", () => {
  const I = M("07i18n.js"), fn = between(I, "function i18nIsSkip(el){", "\n/* 11/17 第 18 輪 D P2-3");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fn + ";this.s=i18nIsSkip", ctx);
  const el = (tag, cls, attrs) => ({ nodeType: 1, nodeName: tag, classList: { contains: c => (cls || []).includes(c) }, hasAttribute: a => (attrs || []).includes(a) });
  assert.equal(ctx.s(el("ARTICLE", ["xqdoc"])), true, "文件內文"); assert.equal(ctx.s(el("DIV", ["card"])), false, "其他照翻"); assert.equal(ctx.s(el("DIV", [], ["data-noi18n"])), true);
  assert.ok(M("05-settings.js").includes('`<article class="xqdoc" style="line-height:1.8;font-size:15px">${xqDocHtml(t)}</article>`'), "文件畫在 .xqdoc 裡");
  assert.ok(M("07gc-native.js").includes("This document is available in Chinese only."), "英文說明那句在 markdown 裡（本來就是英文）");
  /* zh.js（繁簡轉換）不看這個記號：簡體介面的文件照樣轉 */
  assert.ok(!/xqdoc/.test(rd("xiangqi-lab/src/zh.js")));
});

test("觀察：網頁版沒有多執行緒模式、輪到電腦卻不能下 → 跳一次說明（給重新整理）；自動重整還沒試完先等；原生 App、有多執行緒、輪到自己、已說過都不跳；英文內建", () => {
  const S = M("02-shell.js"), code = between(S, "let COI_ST=null,COI_T=0;", "\nconst NATIVE_IOS=");
  const mk = o => { o = o || {}; const ss = Object.assign({}, o.ss || {}), modals = [], timers = [];
    const ctx = { OFF: true, navigator: { userAgent: o.ua || "Mozilla/5.0 Chrome/130", serviceWorker: o.nosw ? undefined : {} }, self: { crossOriginIsolated: !!o.coi }, SharedArrayBuffer: o.coi ? function () {} : undefined,
      sessionStorage: { getItem: k => ss[k] ?? null, setItem: (k, v) => { ss[k] = String(v) }, removeItem: k => { delete ss[k] } }, performance: { now: () => o.t == null ? 30000 : o.t }, setTimeout: f => { timers.push(f); return timers.length },
      document: { querySelector: () => null }, modal: (h, b) => modals.push([h, b]), esc: s => String(s), console: { warn() {} }, location: { reload() { ctx.reloaded = 1 } } };
    if (o.nosw) delete ctx.navigator.serviceWorker;
    vm.createContext(ctx); vm.runInContext(code + ";this.w=coiWarn;this.need=coiNeed", ctx); return { ctx, modals, timers, ss } };
  const cpuTurn = { engine: true, turn: "b", human: "r", result: null };
  let E = mk({ ss: { xqReload: "2" } }); E.ctx.w(cpuTurn); assert.equal(E.modals.length, 1, "自動重整兩次後還是沒有：說"); assert.ok(/電腦棋手還不能下/.test(E.modals[0][0]) && /Service Worker/.test(E.modals[0][0]));
  E.modals[0][1][0][1](); assert.equal(E.ctx.reloaded, 1, "「重新整理」"); assert.equal(E.ss.xqReload, undefined, "重新整理前清掉重整次數");
  E.ctx.w(cpuTurn); assert.equal(E.modals.length, 1, "一次打開只說一次");
  E = mk({ nosw: true, t: 100 }); E.ctx.w(cpuTurn); assert.equal(E.modals.length, 1, "瀏覽器不支援 Service Worker：直接說");
  E = mk({ t: 3000 }); E.ctx.w(cpuTurn); assert.equal(E.modals.length, 0, "剛打開、自動重整還沒試完：先等"); assert.equal(E.timers.length, 1); E.ctx.performance.now = () => 16000; E.timers[0](); assert.equal(E.modals.length, 1, "15 秒後還是不行：說（不用等畫面再更新）");
  for (const [o, why] of [[{ coi: true, ss: { xqReload: "2" } }, "有多執行緒"], [{ ua: "Mozilla/5.0 XQQianqiuApp/1.0", ss: { xqReload: "2" } }, "原生 App 另外處理"]]) { const F = mk(o); F.ctx.w(cpuTurn); assert.equal(F.modals.length, 0, why) }
  E = mk({ ss: { xqReload: "2" } }); E.ctx.w({ engine: true, turn: "r", human: "r" }); E.ctx.w({ engine: true, turn: "b", human: "r", result: "1-0" }); E.ctx.w({ turn: "b", human: "r" }); assert.equal(E.modals.length, 0, "輪到自己、下完了、不是電腦對局：不說");
  assert.ok(M("08b-cpugame.js").includes('try{if(typeof coiWarn==="function")coiWarn(st)}catch(e){}'), "08b 每次畫好棋盤問一次");
  /* 英文內建 */
  const I = M("07i18n.js"), a = I.indexOf("#I18N-PURE-BEGIN"), b = I.indexOf("/* #I18N-PURE-END */"), c2 = {}; vm.createContext(c2); vm.runInContext(I.slice(I.indexOf("\n", a) + 1, b) + ";this.R={i18nText}", c2);
  const T = /COI_TXT="([^"]+)"/.exec(code)[1];
  for (const s of ["電腦棋手還不能下", T + "。", "現在照樣能用：同桌對弈、殘局、古譜與大師對局、測驗、線上對弈。", "🔄 重新整理", "先不用"]) { const e = c2.R.i18nText(s); assert.ok(e && !/[㐀-鿿]/.test(e), s + " → " + e) }
});
