// 11/18 第 31 輪（0319 之後）：N31-1 錯棋重練灰色悔棋點了要說明、N31-2 文牒改視窗大小後重量、N31-3 冷開空殼也遮住、N31-4 黏底按鈕列不透明、iMac P3 preload.json 四個角色模型的大小與指紋。
// 不開瀏覽器：vm 跑程式片段、從座標推算、讀實際檔案算指紋。
// 用法：node --test xiangqi-lab/tools/test-r31-1118.js
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
    return /xiangqi-ios/.test(s) ? "沒有 xiangqi-ios（公開副本不含）" : /i18n-en\.json/.test(s) ? "沒有 xiangqi-db/i18n-en.json（只放 CDN）" : /xiangqi-db\/art\/docs/.test(s) ? "沒有 xiangqi-db/art/docs 文件原稿（公開副本不含）" : /xiangqi-lab\/(site|src)\//.test(s) ? "沒有 " + s.slice(s.indexOf("xiangqi-lab/")) + "（公開副本不含）" : "" };
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { const r = PUB && e && e.code === "ENOENT" ? why(e.path) : ""; if (r) { t.skip(r); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, alt(p)), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b, incl) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, incl ? j + b.length : j) };

test("N31-1：錯棋重練（KIND＝practice）的悔棋也不設 disabled——沒走棋是灰色＋aria-disabled、點了說明；走過一步照常；挑戰電腦一律灰；擂台、石桌往事照舊", () => {
  const C = M("08b-cpugame.js");
  const a = (C.match(/const noMv=(.*?),undoK=(.*?);\n/) || []), d = (C.match(/acts\.undo\.disabled=(!undoK&&\(st\.ranked\|\|noMv\));/) || [])[1], n = (C.match(/noU=(\(cpuK&&!st\.practice\)\|\|\(!!st\.practice&&noMv\));/) || [])[1];
  assert.ok(a[1] && a[2] && d && n, "取得到這三段");
  const KIND = (C.match(/KIND=(s=>s\.kind\|\|\(s\.practice\?"practice":s\.journey\?"journey":s\.arena\?"arena":"cpu"\))/) || [])[1]; assert.ok(KIND);
  const f = vm.runInNewContext(`(st=>{const KIND=${KIND};const noMv=${a[1]},undoK=${a[2]};const cpuK=KIND(st)==="cpu";return{dis:${d},noU:${n}}})`);
  const mv = [{ by: "r" }], H = { human: "r" };
  const cases = [["晉級賽", { ...H, ranked: true, moves: [] }, false, true], ["晉級賽走過", { ...H, ranked: true, moves: mv }, false, true], ["練功房", { ...H, moves: [] }, false, true], ["練功房走過", { ...H, moves: mv }, false, true],
    ["錯棋重練沒走", { ...H, practice: true, moves: [] }, false, true], ["錯棋重練走過", { ...H, practice: true, moves: mv }, false, false],
    ["擂台沒走", { ...H, arena: true, moves: [] }, true, false], ["擂台走過", { ...H, arena: true, moves: mv }, false, false], ["石桌往事沒走", { ...H, journey: "x", moves: [] }, true, false]];
  for (const [nm, st, dis, noU] of cases) { const r = f(st); assert.equal(r.dis, dis, nm + " disabled"); assert.equal(r.noU, noU, nm + " 灰色") }
  assert.ok(C.includes('if(st.practice){if(!st.moves.some(m=>m.by===st.human)){vibrate(5);return toast(cgT("undo.noMove","還沒有可以悔的棋：走過一步以後才能悔棋"))}return post("/play/undo")}'), "點了跳「還沒有可以悔的棋」");
});

test("N31-2：文牒改過視窗大小（resize、轉向）以後重排框、文牒和驛券兩格都重量；「換手機」小標最寬＝券寬，不再壓到「Check for updates」", () => {
  const X = M("07x4-lobbysafe.js");
  assert.ok(X.includes('addEventListener("resize",onRs);addEventListener("orientationchange",onRs)'));
  assert.ok(X.includes("hqT=[setTimeout(hqRe,300),setTimeout(hqRe,900)]") && X.includes('pn._xqSig=null;try{if(typeof pn._fit==="function")pn._fit();else if(typeof pn._tf==="function")pn._tf()}'), "版面排好後再量，簽名清掉（之後字變了照樣會再量）");
  const S4 = M("07s4-passmap.js");
  assert.ok(S4.includes("Object.assign(fr.style,{width:768*k+\"px\",height:1376*k+\"px\",left:(W-768*k)/2+\"px\",top:(H-1376*k)/2+\"px\"});pn._tf()};"), "pn._fit 照新尺寸排框，最後叫 pn._tf");
  assert.ok(S4.includes('hqFitAll(q,[...q.querySelectorAll(".hq-hb")].map(b=>[b.querySelector(".hq-bi"),b]),13,12)'), "pn._tf 也量驛券那一格");
  assert.ok(X.includes('s.textContent=".hq-pn .hq-lb{max-width:31%;white-space:normal;text-align:center;line-height:1.15}"'));
  const Q = vm.runInNewContext("[" + between(S4, "HQ_Q=[", "]").replace("HQ_Q=[", "") + "]"), DOC = vm.runInNewContext("[" + between(S4, "HQ_DOC=[", "]").replace("HQ_DOC=[", "") + "]");
  const cx = (Q[0] + Q[2]) / 2, half = 0.31 * 768 / 2;
  assert.ok((Q[2] - Q[0]) / 768 >= 0.31, "31% 不超過券寬"); assert.ok(cx - half >= Q[0] - 0.5 && cx - half > DOC[2], `小標最左 ${(cx - half).toFixed(0)}，文牒右緣 ${DOC[2]}`);
});

test("N31-3：冷開會出開頭畫面時，m.html 在畫頂欄、分頁鈕之前就蓋上底幕（跟 05b 同一套判斷）；05b 跑完拿掉，保險 6 秒", () => {
  const H = rd("xiangqi-db/m.html"), a = H.indexOf("<body>"), app = H.indexOf('<div class="app">'), s0 = H.indexOf("<script>", a);
  assert.ok(a > 0 && s0 > a && s0 < app, "<body> 一開始、.app 之前");
  const code = H.slice(s0 + 8, H.indexOf("</script>", s0));
  const S = M("05b-save.js"), need = vm.runInNewContext("(" + between(S, "function xqBootCovNeed(o){", "\n").replace("function xqBootCovNeed", "function") + ")");
  for (const [wd, shown, pro, upd, hash] of [[false, false, false, false, ""], [false, false, false, false, "#/"], [true, false, false, false, ""], [false, true, false, false, ""], [false, false, true, false, ""], [false, false, false, true, ""], [false, false, false, false, "#/cpu"]]) {
    const cls = new Set(), T = []; let st = null;
    const doc = { documentElement: { classList: { add: c => cls.add(c), remove: c => cls.delete(c) } }, createElement: () => ({}), head: { appendChild: x => { st = x } } };
    const ss = { getItem: k => (k === "xqTitleShown" && shown) || (k === "xqPrologue" && pro) ? "1" : null }, ls = { getItem: k => k === "xqUpdBack" && upd ? "{}" : null };
    vm.runInNewContext(code, { document: doc, navigator: { webdriver: wd }, sessionStorage: ss, localStorage: ls, location: { hash }, setTimeout: (f, ms) => T.push([f, ms]) });
    const want = need({ wd, shown, pro, upd, hash }); assert.equal(cls.has("xq-bootcov"), want, JSON.stringify({ wd, shown, pro, upd, hash }));
    if (want) { assert.ok(st && /html\.xq-bootcov::after\{content:'';position:fixed;inset:0;z-index:9997;background:#F3ECDD\}/.test(st.textContent)); assert.equal(T[0][1], 6000); T[0][0](); assert.equal(cls.has("xq-bootcov"), false, "保險 6 秒") }
  }
  assert.ok(S.includes('try{document.documentElement.classList.remove("xq-bootcov")}catch(e){}'), "05b xqBootCovOff 也拿掉 html 那層");
  assert.ok(/#xqTitle\{[^}]*z-index:9998/.test(rd("xiangqi-db/m.css")), "比開頭畫面低一層");
});

test("N31-4：黏底按鈕列貼到畫面最底、不透明底色——下面不再露出一行內文；按鈕照樣在 Home 條上面", () => {
  const U = M("00-util.js"), css = vm.runInNewContext(U.match(/const MDLOW_CSS=([^\n]*\n[^\n]*);\n/)[1]);
  const mb = (css.match(/\.modal\.prolog>\.box>\.mb\{[^}]*\}/) || [""])[0];
  assert.ok(mb.includes("bottom:calc(0px - max(24px,calc(env(safe-area-inset-bottom,0px) + 12px)))"), "往下貼掉 .modal 下內距那一段");
  assert.ok(mb.includes("padding:6px 20px max(24px,calc(env(safe-area-inset-bottom,0px) + 12px))"), "自己的下內距補回同樣高度");
  assert.ok(/background:var\(--card,#FFF8EC\)/.test(mb) && !/inherit/.test(mb), "不透明底色");
  assert.ok(U.includes("html .modal{padding-top:max(24px,calc(env(safe-area-inset-top,0px) + 12px));padding-bottom:max(24px,calc(env(safe-area-inset-bottom,0px) + 12px))}"), ".modal 下內距就是這個值");
});

test("iMac P3：preload.json 四個七星模型（x_bing、x_martialgirl、x_spiritgirl、x_swordboy.glb）的大小、指紋照 site 實際的檔；v 照全部項目重算", () => {
  const J = JSON.parse(rd("xiangqi-lab/site/data/preload.json"));
  for (const k of ["x_bing", "x_martialgirl", "x_spiritgirl", "x_swordboy"]) { const u = "data/tripo_app/" + k + ".glb", it = J.items.find(x => x[0] === u); assert.ok(it, u);
    const b = fs.readFileSync(path.join(ROOT, alt("xiangqi-lab/site/" + u))); assert.equal(it[1], b.length, u + " 大小"); assert.equal(it[2], crypto.createHash("sha1").update(b).digest("hex").slice(0, 8), u + " 指紋") }
  const h = crypto.createHash("sha1"); for (const [u, s, x] of J.items) h.update(u + ":" + s + ":" + x + ";"); assert.equal(J.v, h.digest("hex").slice(0, 10), "v 跟 tools/preload-list.js 同一算法");
  assert.equal(J.bytes, J.items.reduce((t, x) => t + x[1], 0), "bytes＝全部加總");
});
