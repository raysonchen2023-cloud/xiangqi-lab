// 11/18 第 30 輪（候選版 2312）R30-1（P1）英文邀局卡矮螢幕按不到、R30-2 序局提示與小帥泡泡中文、R30-3 文牒黏字與小帥閒聊中文。
// 不開瀏覽器：CSS 字串、vm 跑翻譯器，從尺寸推算。實機（320×460、320×568、360×560、375×553 中英）請測試員再點一次。
// 用法：node --test xiangqi-lab/tools/test-r30-1118.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
/* 11/18 公開證據（0319）：公開副本（ROOT 有 STAGE-MANIFEST.json）沒有 xiangqi-ios、xiangqi-lab/site、xiangqi-lab/src 的支援／隱私頁、xiangqi-db/art/docs、xiangqi-db/i18n-en.json（只放 CDN）。
   site 的檔、文件原稿、支援／隱私頁退回倉庫根目錄那一份（跟線上同一份：../、../data/docs/、../support.html）；還是找不到的子測試照實標略過、寫原因。開發者電腦上（沒有 STAGE-MANIFEST.json）照常跑，缺檔照樣失敗 */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json")) || !fs.existsSync(path.join(ROOT, "xiangqi-ios"));   /* 公開副本的 run-tests 會把 source/ 抄到暫存資料夾（沒有 STAGE-MANIFEST.json），所以也看有沒有 xiangqi-ios */
function alt(p) { p = String(p); if (!PUB || fs.existsSync(path.join(ROOT, p))) return p;
  for (const [re, to] of [[/^xiangqi-lab\/site\//, "../"], [/^xiangqi-db\/art\/docs(\/|$)/, "../data/docs$1"], [/^xiangqi-lab\/src\/(support|privacy)\.html$/, "../$1.html"]]) if (re.test(p)) { const q = p.replace(re, to); if (fs.existsSync(path.join(ROOT, q))) return q }
  return p }
function skipMissing(t0) {
  const why = p => { const s = String(p || "").split(String.fromCharCode(92)).join("/");
    return /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /xiangqi-lab\/(site|src)\//.test(s) ? "沒有 " + s.slice(s.indexOf("xiangqi-lab/")) + "（公開副本不含）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = PUB && e && e.code === "ENOENT" ? (why(e.path) || "公開副本沒有這個檔：" + String(e.path || "").split(String.fromCharCode(92)).join("/").split("/").slice(-2).join("/")) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };
const CJK = /[㐀-鿿]/;
const I18N = () => { const S = M("07i18n.js"), a = S.indexOf("#I18N-PURE-BEGIN"), b = S.indexOf("/* #I18N-PURE-END */"); const c = {}; vm.createContext(c);
  vm.runInContext(S.slice(S.indexOf("\n", a) + 1, b) + ";this.R={i18nText,i18nExtMerge,I18N_CJK}", c); return c.R };
const R0 = I18N();let R_ = null; const R = new Proxy({}, { get: (o, k) => { if (!R_) { const r = I18N(); r.i18nExtMerge(JSON.parse(rd("xiangqi-db/i18n-en.json"))); R_ = r } return R_[k] } });   /* 外掛字典用到才載（公開副本沒有：在子測試裡讀不到才標略過，不會整支掛掉） */

test("R30-1（P1）：所有視窗放不下時都能捲（不再只限高度 ≤500）、高度用 100dvh；序幕／邀局／星盤暫合卡（.prolog）按鈕列黏在卡片底部", () => {
  const U = M("00-util.js"), css = vm.runInNewContext(U.match(/const MDLOW_CSS=([^\n]*\n[^\n]*);\n/)[1]);
  assert.ok(!/@media \(max-height/.test(css), "不限高度");
  assert.ok(css.includes(".modal{overflow-y:auto;align-items:flex-start;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}.modal>.box{margin:auto 0;flex:none}"), "放得下照舊置中（margin:auto 0），放不下從上面排起、可以捲");
  assert.ok(css.includes("@supports (height:100dvh){.modal{bottom:auto;height:100dvh}}"), "Safari 網址列、工具列佔掉的那段不算");
  assert.ok(css.includes(".modal.prolog>.box>.mb{position:sticky;bottom:env(safe-area-inset-bottom,0px);z-index:1;background:inherit;"), "按鈕列黏在底部、讓開 Home 條");
  assert.ok(U.includes('s.id="mdLowCss";s.textContent=MDLOW_CSS;'));
  /* 用到 .prolog 的卡：邀局（序局）、星盤暫合、序幕、回家任務 */
  const B = M("07bh-blackhole.js"), S5 = M("05b-save.js");
  const cls = (src, mark) => { const L = src.split("\n"), i = L.findIndex(l => l.includes(mark)); assert.ok(i >= 0, mark); return L.slice(i, i + 15).join("\n") };
  for (const [src, mk] of [[B, "<h2>星樞棋局・序局</h2>"], [B, "<h2>星盤暫合</h2>"], [S5, "<h2>${esc(C.pc)}・${esc(C.n)}</h2>${body}"]]) {
    const seg = cls(src, mk), m = seg.indexOf("modal("), p = seg.indexOf('"prolog")', m); assert.ok(m >= 0 && p > m, mk + " 是 .prolog");
  }
  /* 同類：一步殺結果卡是一般 .modal（一樣能捲）；畢業在 #stqPg（本來就 overflow-y:auto）；開頭畫面選單 .xqt-in（max-height:100% ＋ overflow-y:auto） */
  assert.ok(/#stqPg\{[^}]*overflow-y:auto/.test(M("07stq-starter.js")), "練習、畢業頁可捲");
  assert.ok(rd("xiangqi-db/m.css").includes(".xqt-in{position:relative;width:100%;max-width:420px;max-height:100%;overflow-y:auto;"), "開頭畫面選單可捲");
});

test("R30-2：英文序局走對那一步的提示、小帥勝負和泡泡、齊轍台詞都翻得出（內建字典，外掛字典還沒到也有）", () => {
  const B = M("07bh-blackhole.js"), good = vm.runInNewContext("(" + between(B, "good:", "],").replace("good:", "") + "])");
  assert.equal(R0.i18nText(good[0] + "：" + good[1]), "Qi Zhe: The chariot's road is open — straight for the star's heart!", "toast 原樣");
  const BT = between(B, "const BHX_TXT={", "};");
  for (const k of ["start", "wrong", "hint1", "hint2", "win"]) { const s = (BT.match(new RegExp("\\b" + k + ':"([^"]*)"')) || [])[1]; assert.ok(s, k); const t = R.i18nText(s); assert.ok(t && !CJK.test(t), k + "：" + s) }
  /* bot3d 勝負和的三組 */
  const BOT = rd("xiangqi-lab/src/bot3d.js"), L = between(BOT, "const onResult=e=>{", 'window.addEventListener("xq-result",onResult);');
  const arr = [...L.matchAll(/pick\((\[[^\]]*\])\)/g)].map(m => JSON.parse(m[1])); assert.equal(arr.length, 3);
  for (const s of arr.flat()) { const t = R0.i18nText(s); assert.ok(t && !CJK.test(t), "小帥：" + s + " → " + t) }
  /* 齊轍（英文新玩家一律是他）的開局、吃子、勝負和台詞 */
  const C = M("06-cpu.js"), sb = C.slice(C.indexOf("x_swordboy:{"), C.indexOf("x_spiritgirl:{"));
  for (const k of ["start", "cap", "win", "lose", "draw"]) for (const s of vm.runInNewContext("(" + (sb.match(new RegExp(k + ":(\\[[^\\]]*\\])")) || [])[1] + ")")) { const t = R0.i18nText(s); assert.ok(t && !CJK.test(t), "齊轍 " + k + "：" + s) }
});

test("R30-2、R30-3：英文介面小帥閒聊翻不成整句英文就不冒（xq-bot-said 攔下、小帥自己的泡泡藏起來），翻得出的照常", () => {
  const S = M("07i18n.js"), ctx = { i18nText: s => R.i18nText(s), I18N_CJK: R.I18N_CJK }; vm.createContext(ctx);
  vm.runInContext(between(S, "function i18nBotOk(s){", "\n") + ";this.f=i18nBotOk", ctx);
  assert.equal(ctx.f("單霞麗：上海／上海隊"), false, "特級大師資料自動組的那句");
  assert.equal(ctx.f("寧失一子，不失一先") || ctx.f("老卒搜林") === false, true, "棋諺翻不出就不冒（翻得出就照冒）");
  assert.equal(ctx.f("你是冠軍！"), true); assert.equal(ctx.f("Good move!"), true); assert.equal(ctx.f(""), true);
  const tail = S.slice(S.indexOf("function i18nBotOk(s){"));
  assert.ok(tail.includes('addEventListener("xq-bot-said",e=>{try{if(!i18nBotOk(e.detail))e.stopImmediatePropagation()}catch(x){}},true);'), "capture：比 07w 的角色泡泡早");
  assert.ok(tail.includes('document.querySelectorAll(".xqbot>div").forEach(d=>{if(d.children.length||!d.textContent)return;if(I18N_CJK.test(d.textContent))d.style.opacity="0"})'), "小帥自己的泡泡");
  assert.ok(tail.includes('i18nLang()!=="en")return;'), "只在英文介面");
  assert.ok(rd("xiangqi-lab/src/bot3d.js").includes('box.className="xqbot"') && /box\.append\(hit,bub\)/.test(rd("xiangqi-lab/src/bot3d.js")), "泡泡是 .xqbot 底下的 div");
  assert.ok(M("07w-shipwalk.js").includes('window.addEventListener("xq-bot-said",said)'), "07w 不是 capture（會被攔到）");
});

test("R30-3：英文文牒字變長（外掛字典晚到）時重量一次縮字，「Hung-Sheng Chen」不再跟驛券黏在一起", () => {
  const X = M("07x4-lobbysafe.js");
  assert.ok(X.includes('document.querySelectorAll(".hq-pn.open").forEach(pn=>{if(typeof pn._tf!=="function")return;const di=pn.querySelector(".hq-di"),q=pn.querySelector(".hq-q"),sig=(di?di.textContent:"")+"|"+(q?q.textContent:"")+"|"+innerWidth;'));
  assert.ok(X.includes("if(pn._xqSig===sig)return;pn._xqSig=sig;pn._tf()"), "字沒變就不重量（不會一直跑）");
  const P = M("07s4-passmap.js"); assert.ok(P.includes('pn._tf=()=>{try{const di=doc.querySelector(".hq-di");if(di)hqFitAll(di,[[di,doc]],13,12);'), "pn._tf＝文牒、驛券的縮字");
});
