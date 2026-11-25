// 11/17 開發者選單「冬景做 7 張、接進 App」：西市（白天、夜、聽雨茶坊）、觀星臺（白天、夜 × 直幅、寬版）立冬～大寒換 _winter 版（gpt-image-2 照原圖換季）。
//   季節跟首頁同一個判斷（07w7 sw7WinterNow＝sw7On＋sw7SeaNow），日夜照舊 xqNight；三處同時換季、同時入夜。茶坊冬天窗外的程式雨改成雪。
// 不開瀏覽器：vm 載入 App 真正的函式（07y5 tdTerm、07w7 季節與日落、07xsm／07gxt 選圖），用假時間驗；再查檔案、尺寸、版本號、preload.json、iOS 清單、素材授權紀錄。
// 用法：node --test xiangqi-lab/tools/test-winter-scenes-1117.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto");
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
/* 從 a 開始，抓到下一個「行首不是空白」的行之前（多行的 const／function 整段） */
const grab = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到 " + a); const re = /\n(?=\S)/g; re.lastIndex = i + 1; const m = re.exec(s); return s.slice(i, m ? m.index : s.length) };
const U = M("00-util.js"), W7 = M("07w7-seasons.js"), XSM = M("07xsm-ximarket.js"), GXT = M("07gxt-guanxing.js"), TD = M("07y5-todaymap.js");

const XM = [["xm_day_winter", 768, 1376], ["xm_night_winter", 768, 1376], ["xm_tea_winter", 768, 1376]];
const GX = [["gx_tai_day_winter", 768, 1376], ["gx_tai_winter", 768, 1376], ["gx_tai_day_winter_w", 1376, 768], ["gx_tai_winter_w", 1376, 768]];
const FILES = XM.map(([f, w, h]) => ["data/ximarket/" + f + ".webp", w, h]).concat(GX.map(([f, w, h]) => ["data/guanxing/" + f + ".webp", w, h]));

function kit(opts) {
  opts = opts || {};
  let NOW = 0;
  class FD extends Date { constructor(...a) { if (a.length === 0) super(NOW); else super(...a) } static now() { return NOW } }
  const st = Object.assign({}, opts.st || {});
  const ctx = { Date: FD, Math, String, Object, Array, JSON, isFinite, Set, store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } }, matchMedia: () => ({ matches: false }) };
  vm.createContext(ctx);
  const parts = [U.slice(U.indexOf("function xqNight(d){")), grab(TD, "const TD_TERMS="), grab(TD, "function tdTerm(d)"),
    "const SW7_PAGES=[{k:\"home\",rg:\"s\"}];function sw7Precip(){return null}function sw7Rg(o){return o&&o.rg||\"\"}function sw7HomeEra(){return\"\"}function hbIsCl(){return true}",
    grab(W7, "const SW7_ON="), grab(W7, "const sw7On="), grab(W7, "const SW7_SPRING="), grab(W7, "const SW7_SNOWY="), grab(W7, "const SW7_HSEA="), grab(W7, "function sw7CardSea("), grab(W7, "function sw7Term(d)"),
    grab(W7, "function sw7TermFor(P,o)"), grab(W7, "function sw7SeaNow()"), grab(W7, "function sw7WinterNow()"),
    grab(W7, "const SW7_TODW="), grab(W7, "const SW7_SUN="), grab(W7, "function sw7Sun(d)"), grab(W7, "function sw7Todw(d)"), grab(W7, "function sw7TodwOr(d,sea)"),
    grab(W7, "function sw7HomeNightA(d,sea)"), grab(W7, "function sw7NightNow()"), grab(W7, "function sw7HomeTod(d,sea)"), grab(W7, "const SW7_HTOD="), grab(W7, "function sw7HomeWx()"),
    grab(XSM, "const XSM_ON=true"), grab(XSM, "const XSM_BAD="), grab(XSM, "function xsmDay(d){"), grab(XSM, "const xsmPickDay="), grab(XSM, "const xsmWinter="), grab(XSM, "const xsmWk="), grab(XSM, "const xsmSrc="),
    grab(GXT, "const GXT_ON=true"), grab(GXT, "const GXT_BAD="), grab(GXT, "function gxtDay(d){"), grab(GXT, "const gxtWinter="), grab(GXT, "const gxtSk="), grab(GXT, "const gxtSrc="),
    grab(M("07w8-shichen.js"), "const clkIdx=").replace(/^const /, "var ")];
  vm.runInContext(parts.join("\n") + ";this.R={xqNight,sw7SeaNow,sw7WinterNow,sw7HomeWx,sw7NightNow,xsmDay,xsmSrc,xsmWinter,gxtDay,gxtSrc,gxtWinter,XSM_BAD,GXT_BAD,XSM_IMGV,GXT_IMGV}", ctx);
  ctx.at = (y, mo, d, h, mi) => { NOW = new Date(y, mo - 1, d, h, mi || 0).getTime() };
  ctx.st = st;
  return ctx;
}
/* 三處現在各用哪一張：首頁（07w7 sw7HomeWx，經典世界）、西市外景（照 XsmPage：xsmSrc(xsmPickDay(xsmDay()))）、茶坊、觀星臺直幅與寬版（照 GxtPage：gxtSrc(k,gxtDay())） */
function now(K) {
  const R = K.R, d = R.xsmDay(), g = R.gxtDay();
  return { home: R.sw7HomeWx(), xm: R.xsmSrc(d), tea: R.xsmSrc(false, 1), gp: R.gxtSrc("", g), gw: R.gxtSrc("w", g) };
}
const isW = s => /_winter[._]/.test(s);

test("立冬前用原圖、立冬起用冬景（首頁、西市外景、茶坊、觀星臺直幅、寬版同一天一起換）；立春換回原圖", () => {
  const K = kit();
  for (const [y, mo, d, win, tag] of [[2026, 11, 6, false, "霜降最後一天"], [2026, 11, 7, true, "立冬"], [2026, 11, 17, true, "11/17"], [2026, 12, 22, true, "冬至"],
    [2027, 1, 20, true, "大寒"], [2027, 2, 3, true, "立春前一天"], [2027, 2, 4, false, "立春"], [2026, 8, 1, false, "夏天"]]) {
    K.at(y, mo, d, 12); const o = now(K);
    assert.equal(/winter/.test(o.home), win, `${tag} 首頁 ${o.home}`);
    for (const k of ["xm", "tea", "gp", "gw"]) assert.equal(isW(o[k]), win, `${tag} ${k} ${o[k]}`);
    assert.equal(K.R.sw7WinterNow(), win, tag + " sw7WinterNow");
  }
  /* 逐日掃 2026-10-01～2027-03-01：五張和首頁每天都一致，一年只換兩次（立冬進、立春出） */
  let prev = null, flips = 0;
  for (let t = new Date(2026, 9, 1).getTime(); t < new Date(2027, 2, 1).getTime(); t += 864e5) {
    const D = new Date(t); K.at(D.getFullYear(), D.getMonth() + 1, D.getDate(), 12); const o = now(K), h = /winter/.test(o.home);
    for (const k of ["xm", "tea", "gp", "gw"]) assert.equal(isW(o[k]), h, D.toDateString() + " " + k);
    if (prev !== null && prev !== h) flips++; prev = h;
  }
  assert.equal(flips, 2);
});

test("設定關掉「場景節氣天氣」：首頁用原圖，西市、觀星臺冬天也用原圖", () => {
  const K = kit({ st: { sw7Wx: false } }); K.at(2026, 12, 22, 12);
  const o = now(K); assert.equal(o.home, ""); for (const k of ["xm", "tea", "gp", "gw"]) assert.equal(isW(o[k]), false, k);
});

test("日夜各選對圖：冬天白天＝_day_winter、夜＝_night_winter／gx_tai_winter；寬版加 _w；網址帶版本", () => {
  const K = kit(), R = K.R, XV = R.XSM_IMGV, GV = R.GXT_IMGV;
  K.at(2026, 11, 17, 12);
  assert.equal(R.xsmSrc(R.xsmDay()), `data/ximarket/xm_day_winter.webp?v=${XV}`);
  assert.equal(R.xsmSrc(false, 1), `data/ximarket/xm_tea_winter.webp?v=${XV}`);
  assert.equal(R.gxtSrc("", R.gxtDay()), `data/guanxing/gx_tai_day_winter.webp?v=${GV}`);
  assert.equal(R.gxtSrc("w", R.gxtDay()), `data/guanxing/gx_tai_day_winter_w.webp?v=${GV}`);
  K.at(2026, 11, 17, 20);
  assert.equal(R.xsmSrc(R.xsmDay()), `data/ximarket/xm_night_winter.webp?v=${XV}`);
  assert.equal(R.xsmSrc(false, 1), `data/ximarket/xm_tea_winter.webp?v=${XV}`, "茶坊只有一張，夜裡蓋色");
  assert.equal(R.gxtSrc("", R.gxtDay()), `data/guanxing/gx_tai_winter.webp?v=${GV}`);
  assert.equal(R.gxtSrc("w", R.gxtDay()), `data/guanxing/gx_tai_winter_w.webp?v=${GV}`);
  /* 明確給 win：不問季節 */
  assert.equal(R.xsmSrc(true, 0, false), `data/ximarket/xm_day.webp?v=${XV}`); assert.equal(R.gxtSrc("w", false, false), `data/guanxing/gx_tai_w.webp?v=${GV}`);
  /* 每一個組合的網址都對應到真的檔 */
  for (const s of [R.xsmSrc(true, 0, true), R.xsmSrc(false, 0, true), R.xsmSrc(false, 1, true), R.gxtSrc("", true, true), R.gxtSrc("", false, true), R.gxtSrc("w", true, true), R.gxtSrc("w", false, true)])
    assert.ok(FILES.some(f => s.startsWith(f[0] + "?")), s);
});

test("冬景載不到：只記那一張壞了，退回同一個時辰的原圖；其他張照用冬景", () => {
  const K = kit(), R = K.R; K.at(2026, 11, 17, 12);
  R.XSM_BAD.wd = 1; assert.match(R.xsmSrc(true), /xm_day\.webp/); assert.match(R.xsmSrc(false), /xm_night_winter\.webp/); assert.match(R.xsmSrc(false, 1), /xm_tea_winter\.webp/);
  R.XSM_BAD.wt = 1; assert.match(R.xsmSrc(false, 1), /xm_tea\.webp/);
  R.GXT_BAD.spd = 1; assert.match(R.gxtSrc("", true), /gx_tai_day\.webp/); assert.match(R.gxtSrc("w", true), /gx_tai_day_winter_w\.webp/, "直幅壞了不影響寬版"); assert.match(R.gxtSrc("", false), /gx_tai_winter\.webp/, "夜景冬景照用");
  R.GXT_BAD.p = 1; assert.match(R.gxtSrc("", true), /gx_tai_winter\.webp/, "原本白天圖壞了：退回夜景，夜景照樣是冬景");
});

test("三處同時入夜：冬天逐分鐘掃日落、日出，首頁 _night、西市夜景、觀星臺夜景同一分鐘換、只換一次", () => {
  const K = kit();
  for (const [y, mo, d, h0, h1] of [[2026, 11, 17, 16, 19], [2026, 12, 22, 16, 19], [2026, 11, 18, 4, 8], [2027, 1, 25, 4, 8]]) {
    let prev = null, flips = 0;
    for (let t = h0 * 60; t <= h1 * 60; t++) {
      K.at(y, mo, d, Math.floor(t / 60), t % 60); const o = now(K), n = /_night$/.test(o.home);
      assert.equal(/xm_night_winter/.test(o.xm), n, `${mo}/${d} ${Math.floor(t / 60)}:${t % 60} 西市`);
      assert.equal(/gx_tai_winter\./.test(o.gp) && /gx_tai_winter_w\./.test(o.gw), n, `${mo}/${d} ${Math.floor(t / 60)}:${t % 60} 觀星臺`);
      assert.ok(/winter/.test(o.home) && isW(o.xm) && isW(o.tea) && isW(o.gp) && isW(o.gw), "整段都是冬景");
      if (prev !== null && prev !== n) flips++; prev = n;
    }
    assert.equal(flips, 1, `${mo}/${d} 只換一次`);
  }
});

test("頁面開著也會換季：西市外景每分鐘交給 xsmSwap（網址一樣就不動）、茶坊比對網址、觀星臺比對 gxtSrc 網址", () => {
  assert.match(XSM, /const d=xsmPickDay\(xsmDay\(\)\);xsmSwap\(P,d\);/, "外景不再只看日夜有沒有變");
  assert.match(XSM, /function xsmSwap\(P,day\)\{[^\n]*if\(im\.getAttribute\("src"\)===src\)return;/, "xsmSwap 網址一樣就不動");
  assert.match(XSM, /const a=xsmSrc\(false,1\),s=P\._scw\?xsmScwTo\(P,a\):a;P\.dataset\.win=\/_winter\\\.\/\.test\(a\)\?"1":"";if\(s!=null&&im\.getAttribute\("src"\)!==s\)\{im\.src=s;/, "茶坊（#169 合成一條 xsmTeaTick；沒掛 07sw 時照舊原圖網址，行為在 test-scene-wide-xsm.js 實跑）");
  assert.match(GXT, /if\(gxtSrc\(kk,d\)!==\(im\.getAttribute\("src"\)\|\|""\)\)gxtSet\(P,kk,d\)/, "觀星臺");
  assert.match(GXT, /pre\.onerror=\(\)=>\{if\(\/_winter\[\._\]\/\.test\(src\)\)/, "觀星臺換圖時冬景載不到退回原圖");
});

test("茶坊冬天：XSM_RAIN 窗格的雨改成雪（細小、慢）；減少動態時不動；說明文字跟著改", () => {
  assert.match(XSM, /P\.dataset\.win=isW\(s0\)\?"1":""/);
  const css = /\.xsm-tea\[data-win="1"\] \.xsm-rain\{([^}]*)\}/.exec(XSM); assert.ok(css, "有冬天的 CSS");
  assert.match(css[1], /radial-gradient/, "畫的是雪點，不是雨絲"); assert.doesNotMatch(css[1], /repeating-linear-gradient/);
  const dur = +/animation:xsmSnow (\d+(?:\.\d+)?)s/.exec(css[1])[1];
  assert.ok(dur >= 6);
  assert.match(XSM, /querySelectorAll\("\.xsm-rain"\)\.forEach\(box=>sw7RainWindow\(box,rain\)\)/);
  assert.match(XSM, /\.xsm-tea\[data-win="1"\] \.xsm-rain>\.sw7-cv\{display:none\}/);
  assert.doesNotMatch(XSM, /@keyframes xsmRain/);
  const kf = /@keyframes xsmSnow\{to\{background-position:(-?\d+)px (\d+)px,(-?\d+)px (\d+)px\}\}/.exec(XSM); assert.ok(kf);
  const sz = /background-size:(\d+)px (\d+)px,(\d+)px (\d+)px/.exec(css[1]), pos = /background-position:(-?\d+)(?:px)? (-?\d+)(?:px)?,(-?\d+)px (-?\d+)px/.exec(css[1]);
  /* 一圈走完剛好整數個圖塊，接得上不跳 */
  for (let i = 1; i <= 4; i++) assert.ok((+kf[i] - +pos[i]) % +sz[i] === 0, "第 " + i + " 格接得上");
  assert.match(XSM, /@media \(prefers-reduced-motion:reduce\)\{\.xsm-tea \.xsm-rain,\.xsm-tea\[data-win="1"\] \.xsm-rain\{animation:none\}\}/);
  assert.match(XSM, /窗外\$\{isW\(s0\)\?"飄著雪":"下著雨"\}/);
});

/* webp 檔頭量尺寸（VP8／VP8L／VP8X） */
function webpWH(p) {
  const b = fs.readFileSync(p), t = b.toString("ascii", 12, 16);
  if (t === "VP8 ") return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (t === "VP8L") { const n = b.readUInt32LE(21); return [(n & 0x3fff) + 1, ((n >> 14) & 0x3fff) + 1] }
  if (t === "VP8X") return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  throw new Error("不是 webp：" + p);
}
test("7 個檔都在（art 來源、site/data、iOS www 三處內容一樣）、尺寸跟原圖一樣；原圖沒動", t => {
  if (PUB && !fs.existsSync(path.join(ROOT, "xiangqi-db", "art", "ximarket"))) { t.skip("沒有 xiangqi-db/art 原圖和 xiangqi-ios（公開副本不含；三處比對只在開發者電腦跑）"); return }
  for (const [u, w, h] of FILES) {
    const a = path.join(ROOT, "xiangqi-db", "art", u.slice(5)), s = path.join(ROOT, "xiangqi-lab", "site", u), i = path.join(ROOT, "xiangqi-ios", "www", u);
    for (const p of [a, s, i]) { assert.ok(fs.existsSync(p), p); assert.deepEqual(webpWH(p), [w, h], p) }
    const ha = crypto.createHash("sha1").update(fs.readFileSync(a)).digest("hex");
    assert.equal(crypto.createHash("sha1").update(fs.readFileSync(s)).digest("hex"), ha, u + " site 跟 art 一樣");
    assert.equal(crypto.createHash("sha1").update(fs.readFileSync(i)).digest("hex"), ha, u + " iOS 跟 art 一樣");
    const orig = path.join(ROOT, "xiangqi-lab", "site", u.replace("_winter", "")); assert.ok(fs.existsSync(orig), "原圖還在 " + orig); assert.deepEqual(webpWH(orig), [w, h], "原圖同尺寸");
  }
});

test("版本號有變（1113 → 1117），圖網址都帶 ?v=", () => {
  const K = kit(); assert.notEqual(K.R.XSM_IMGV, "1113"); assert.notEqual(K.R.GXT_IMGV, "1113"); assert.equal(K.R.XSM_IMGV, "1117"); assert.equal(K.R.GXT_IMGV, "1117");
});

test("preload.json：7 張都在、大小和內容指紋對，版本 v 照全部項目重算（手機看到新指紋才會下載）", () => {
  const P = JSON.parse(rd("xiangqi-lab/site/data/preload.json"));
  for (const [u] of FILES) {
    const it = P.items.find(x => x[0] === u); assert.ok(it, u);
    const b = fs.readFileSync(path.join(ROOT, alt("xiangqi-lab/site/" + u)));
    assert.equal(it[1], b.length, u + " 大小"); assert.equal(it[2], crypto.createHash("sha1").update(b).digest("hex").slice(0, 8), u + " 指紋");
  }
  const ph = crypto.createHash("sha1"); for (const [u, s, x] of P.items) ph.update(u + ":" + s + ":" + x + ";");
  assert.equal(P.v, ph.digest("hex").slice(0, 10)); assert.equal(P.n, P.items.length); assert.equal(P.bytes, P.items.reduce((t, x) => t + x[1], 0));
});

test("iOS：scripts/.www-files.json 有 7 張、大小對；www/native-build.json 的資料夾大小算進去", () => {
  const L = JSON.parse(rd("xiangqi-ios/scripts/.www-files.json")), N = JSON.parse(rd("xiangqi-ios/www/native-build.json"));
  for (const [u] of FILES) { assert.ok(L.files[u], u); assert.equal(L.files[u][0], fs.statSync(path.join(ROOT, "xiangqi-ios", "www", u)).size, u) }
  for (const d of ["ximarket", "guanxing"]) {
    const dir = path.join(ROOT, "xiangqi-ios", "www", "data", d), sum = fs.readdirSync(dir).reduce((t, f) => t + fs.statSync(path.join(dir, f)).size, 0);
    assert.equal(N.byDir["data/" + d], sum, d);
  }
});

test("素材授權紀錄：credits.md 與 ai-assets.md（art 來源、site 兩份一樣）記上 gpt-image-2、以原圖編輯、2026-11-17、7 個檔名", () => {
  for (const f of ["credits.md", "ai-assets.md"]) assert.equal(rd("xiangqi-db/art/docs/" + f), rd("xiangqi-lab/site/data/docs/" + f), f + " 兩份一樣");
  const c = rd("xiangqi-db/art/docs/credits.md");
  assert.match(c, /2026-11-17 西市、觀星臺冬景 7 張/); assert.match(c, /gpt-image-2/); assert.match(c, /以原圖/);
  for (const [u] of FILES) assert.ok(c.includes(path.basename(u)), path.basename(u));
  assert.match(rd("xiangqi-db/art/docs/ai-assets.md"), /2026-11-17 西市、觀星臺冬景 7 張，用 gpt-image-2/);
});
