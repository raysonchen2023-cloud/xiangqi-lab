// 11/18 第 32 輪（候選版 0445）之後：N32-1 英文文牒第二次打開不再縮字、N32-2 英文彎引號被中文字型畫成全形；
//   同步：語音檔刪掉（三處）、preload.json 拿掉語音、四張經典圖示新指紋、sw.js 不再列 voice；park3d 淡入前等棋子人模型、先編 shader。
// 不開瀏覽器：vm 跑程式片段、讀實際檔案。實際排版、卡頓要測試員和 iPhone 實機看。
// 用法：node --test xiangqi-lab/tools/test-r33-1118.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..", "..");
/* 11/18 公開證據（0319）：公開副本（ROOT 有 STAGE-MANIFEST.json）沒有 xiangqi-ios、xiangqi-lab/site、xiangqi-lab/src 的支援／隱私頁、xiangqi-db/art/docs、xiangqi-db/i18n-en.json（只放 CDN）。
   site 的檔、文件原稿、支援／隱私頁退回倉庫根目錄那一份（跟線上同一份：../、../data/docs/、../support.html）；還是找不到的子測試照實標略過、寫原因。開發者電腦上（沒有 STAGE-MANIFEST.json）照常跑，缺檔照樣失敗 */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json")) || !fs.existsSync(path.join(ROOT, "xiangqi-ios"));   /* 公開副本的 run-tests 會把 source/ 抄到暫存資料夾再跑（那裡沒有 STAGE-MANIFEST.json），沒有 xiangqi-ios 也算公開副本 */
function alt(p) { p = String(p); if (!PUB || fs.existsSync(path.join(ROOT, p))) return p;
  for (const [re, to] of [[/^xiangqi-lab\/site\//, "../"], [/^xiangqi-db\/art\/docs(\/|$)/, "../data/docs$1"], [/^xiangqi-lab\/src\/(support|privacy)\.html$/, "../$1.html"]]) if (re.test(p)) { const q = p.replace(re, to); if (fs.existsSync(path.join(ROOT, q))) return q }
  return p }
function skipMissing(t0) {
  const why = p => { const s = String(p || "").split(String.fromCharCode(92)).join("/");
    return /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : /xiangqi-db\/art\//.test(s) ? "沒有 xiangqi-db/art 原稿（公開副本不含）" : /xiangqi-lab\/(site|src)\//.test(s) ? "沒有 " + s.slice(s.indexOf("xiangqi-lab/")) + "（公開副本不含）" : /\/data\/(icons|tripo_app)\//.test(s) ? "圖示、模型只在 CDN（公開副本不含）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = PUB && e && e.code === "ENOENT" ? why(e.path) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };

test("N32-1：文牒打開幾次都會重量——重寫內容（_paint）後下一格、再下一格、0.35 秒各量一次；量到 0 延到下一格再量（最多 30 格）；第一次打開就包上", () => {
  const X = M("07x4-lobbysafe.js"), ctx = {}; vm.createContext(ctx); vm.runInContext(between(X, "function xqHqWrap(", "\ntry{if(typeof hqOpen") + ";this.w=xqHqWrap", ctx);
  let size = 0, fits = 0; const R = [], L = [];
  const doc = { get clientWidth() { return size }, get clientHeight() { return size } }, q = { get clientWidth() { return size }, get clientHeight() { return size } };
  const pn = { querySelector: s => s === ".hq-doc" ? doc : s === ".hq-q" ? q : null, _tf() { fits++ }, _paint() { } };
  ctx.w(pn, f => R.push(f), (f, ms) => L.push([f, ms]));
  /* 第一次打開：面板還沒排好（0） */
  pn._tf(); assert.equal(fits, 0, "量到 0 不量"); assert.equal(R.length, 1, "延到下一格"); size = 100; R.shift()(); assert.equal(fits, 1, "下一格量到了");
  /* 關掉再打開：07s4 hqOpen 先 _fit 再 _paint，重寫內容後要再量 */
  for (const n of [1, 2]) { const f0 = fits; pn._paint(); assert.equal(pn._xqSig, null); while (R.length) R.shift()(); assert.ok(fits > f0, "第 " + (n + 1) + " 次打開：重寫後量了"); const l = L.pop(); assert.equal(l[1], 350); l[0](); }
  /* 一直是 0：最多 30 格就停（不會無限排） */
  size = 0; pn._xqTfN = 0; pn._tf(); let k = 0; while (R.length && k < 100) { R.shift()(); k++ } assert.ok(k <= 30, "最多延 30 格（" + k + "）");
  assert.ok(X.includes("try{if(typeof hqOpen===\"function\"&&!hqOpen.__xq){const o0=hqOpen;hqOpen=function(v){") && X.includes("xqHqWrap(pn);if(first)requestAnimationFrame("), "第一次打開就包上");
  const S4 = M("07s4-passmap.js"); assert.ok(S4.includes("pn._fit();pn._paint();"), "07s4 照舊先 _fit 再 _paint（所以要在 _paint 之後再量）");
  const H = rd("xiangqi-db/m.html"); assert.ok(H.indexOf("m/07x4-lobbysafe.js") > 0 && H.indexOf("m/07s4-passmap.js") > 0, "同一段 script：hqOpen 是函式宣告，07x4 換掉的就是 07s4 那支");
});

test("N32-2：英文介面沒有中文字的文字，彎引號換成直引號（不讓中文字型畫成全形、前面空一大格）；有中文字的不動；中文介面不裝", () => {
  const S = M("07i18n.js"), ctx = {}; vm.createContext(ctx);
  vm.runInContext("const I18N_CJK=/[\\u3400-\\u9fff\\uf900-\\ufaff]/;" + between(S, "function i18nQuote(s){", "\n") + ";this.q=i18nQuote", ctx);
  assert.equal(ctx.q("A star raft called the “Cloud River” pulled up"), 'A star raft called the "Cloud River" pulled up');
  assert.equal(ctx.q("It’s ‘fine’"), "It's 'fine'");
  assert.equal(ctx.q("他說“好”"), "他說“好”", "有中文字不動");
  assert.equal(ctx.q("plain"), "plain");
  const tail = S.slice(S.indexOf("function i18nQuote(s){"));
  assert.ok(tail.includes('i18nLang()!=="en")return;') && tail.includes("new MutationObserver(ms=>{for(const m of ms){if(m.type===\"characterData\")fix(m.target);else m.addedNodes.forEach(walk)}})") && /TEXTAREA\|INPUT/.test(tail), "英文才裝；新加的節點、改過的字都會過；輸入框不動");
});

test("同步：語音 12 檔三處都刪了；preload.json 沒有 data/voice、四張經典圖示是新指紋、v／bytes 照算法；sw.js 不再列 voice", () => {
  for (const d of (PUB ? [] : ["xiangqi-lab/site/data/voice"]).concat(["xiangqi-db/voice"])) assert.ok(!fs.existsSync(path.join(ROOT, d)), d + " 已刪");   /* 公開副本的 site＝線上倉庫（驗的是開發者工作區刪了沒有），不驗 */
  if (fs.existsSync(path.join(ROOT, "xiangqi-ios"))) assert.ok(!fs.existsSync(path.join(ROOT, "xiangqi-ios/www/data/voice")), "iOS www 已刪");
  const J = JSON.parse(rd("xiangqi-lab/site/data/preload.json"));
  assert.ok(!J.items.some(x => /^data\/voice\//.test(x[0])), "preload 沒有語音");
  for (const n of ["e_save", "e_scope", "e_pin", "e_puzzle"]) { const u = "data/icons/classic/" + n + ".webp", it = J.items.find(x => x[0] === u), b = fs.readFileSync(path.join(ROOT, alt("xiangqi-lab/site/" + u)));
    assert.equal(it[1], b.length, u); assert.equal(it[2], crypto.createHash("sha1").update(b).digest("hex").slice(0, 8), u);
    if (!PUB) assert.ok(b.equals(fs.readFileSync(path.join(ROOT, "xiangqi-db/art/icons/classic/" + n + ".webp"))), u + " 跟 art 一樣") }
  const h = crypto.createHash("sha1"); for (const [u, s, x] of J.items) h.update(u + ":" + s + ":" + x + ";"); assert.equal(J.v, h.digest("hex").slice(0, 10)); assert.equal(J.n, J.items.length); assert.equal(J.bytes, J.items.reduce((t, x) => t + x[1], 0));
  assert.ok(!/\|voice\|/.test(rd("xiangqi-lab/src/sw.js")), "sw.js 外觀快取不再列 voice");
  assert.ok(!/\|voice\|/.test(rd("xiangqi-lab/tools/preload-list.js")) && !/"voice"/.test(rd("xiangqi-lab/tools/preload-list.js")), "preload-list 不再列 voice");
});

test("park3d：淡入前也等這座園子要用的棋子人模型（GLBW，照舊最多 6 秒）、淡入前 rd.compile 先編 shader；網址跟建棋子人用的同一個", () => {
  const P = rd("xiangqi-lab/src/park3d.js");
  assert.ok(P.includes("const GLBW={};function gntWaitGlb(u){if(!u||u in GLBW||typeof window.XQGLB!==\"function\")return;GLBW[u]=0;try{window.XQGLB(u).then(()=>{GLBW[u]=1},()=>{GLBW[u]=1})}catch(e){GLBW[u]=1}}"));
  assert.ok(P.includes('try{gntWaitGlb("data/tripo_app/"+(blk?GNT_XS[bm?bm.k:K]:wd?GNT_WOOD:GNT_X[K])+".glb")}catch(e){}') && P.includes('XQBot3D.figure({glb:"data/tripo_app/"+(blk?GNT_XS[bm?bm.k:K]:wd?GNT_WOOD:GNT_X[K])+".glb",'), "同一個網址");
  assert.ok(P.includes("if((drawn&&!inflight.size&&gntGlbReady()&&!cvLeft&&!decPend&&dt>mn)||dt>Math.max(6000"), "等模型（最多 6 秒照舊；11/18 第 35 輪另外等程式貼圖畫完、全景圖解碼完）");
  assert.ok(P.includes("try{rd.compile(sc,cam)}catch(e){}rd.domElement.style.opacity=1;"), "淡入前先編 shader");
  /* GLBW 的行為 */
  const ctx = { window: {} }; let res = {}; ctx.window.XQGLB = u => new Promise(r => { res[u] = r }); vm.createContext(ctx);
  vm.runInContext(between(P, "const GLBW={};", "\n    let GALL=false;") + ";this.a=gntWaitGlb;this.r=gntGlbReady", ctx);
  assert.equal(ctx.r(), true, "沒有模型要等"); ctx.a("x.glb"); ctx.a("x.glb"); assert.equal(Object.keys(res).length, 1, "同一個只問一次"); assert.equal(ctx.r(), false);
  res["x.glb"](); return new Promise(r => setTimeout(r, 0)).then(() => assert.equal(ctx.r(), true, "解析好了"));
});
