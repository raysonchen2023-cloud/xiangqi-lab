// 11/17 開發者「天氣錯誤」＋三次選單：
//   ① 日夜全部照實際日落：首頁（07w7 sw7NightNow）、西市（07xsm xsmDay）、觀星臺（07gxt gxtDay）和其他換夜景圖的頁（原本固定 19／20～5 點的 xxDark）都問 00-util xqNight → 07w7 sw7HomeNightA；
//   ② 入夜接近實際天黑：照臺北的日出日落表（07w7 SW7_SUN／sw7Sun／sw7Todw），入夜＝日落後 25 分、天亮＝日出前 25 分；晨昏色調（sw7Tint）、晨昏圖（sw7HomeTod）跟著；
//   ③ 季節照節氣：立春、立夏、立秋、立冬換季（SW7_HSEA 跟 sw7CardSea 一樣）。頂欄時辰鐘照舊顯示時辰。
// 不開瀏覽器：vm 載入 App 真正的函式（07y5 的 tdTerm 也是真的），用假時間驗。
// 用法：node --test xiangqi-lab/tools/test-daynight-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
/* 從 a 開始，抓到下一個「行首不是空白」的行之前（多行的 const／function 整段） */
const grab = (s, a) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到 " + a); const re = /\n(?=\S)/g; re.lastIndex = i + 1; const m = re.exec(s); return s.slice(i, m ? m.index : s.length) };
const U = M("00-util.js"), W7 = M("07w7-seasons.js"), XSM = M("07xsm-ximarket.js"), GXT = M("07gxt-guanxing.js"), TD = M("07y5-todaymap.js");
const DARK = [["07s4-passmap.js", "hqDark", 19], ["07x3-rostermap.js", "mfDark", 19], ["07y6-gmmap.js", "gm2Dark", 20], ["07y7-cupmap.js", "cp2Dark", 19], ["07y8-redomap.js", "rd2Dark", 19],
  ["07y9-exammap.js", "ex2Dark", 19], ["07z2-statmap.js", "jz2Dark", 19], ["07z3-openmap.js", "kj2Dark", 19], ["07z4-studymap.js", "mzDark", 19], ["10c-deskmap.js", "sjDark", 19], ["07y5-todaymap.js", "tdDarkNow", 20]];

function kit(opts) {
  opts = opts || {};
  let NOW = 0;
  class FD extends Date { constructor(...a) { if (a.length === 0) super(NOW); else super(...a) } static now() { return NOW } }
  const ctx = { Date: FD, Math, String, Object, Array, JSON, isFinite, store: { get: (k, d) => opts.theme || d }, matchMedia: () => ({ matches: !!opts.sysDark }) };
  vm.createContext(ctx);
  const parts = [U.slice(U.indexOf("function xqNight(d){")), grab(TD, "const TD_TERMS="), grab(TD, "function tdTerm(d)")];
  if (!opts.no7w7) parts.push("const SW7_PAGES=[{k:\"home\"}];", grab(W7, "const SW7_SPRING="), grab(W7, "const SW7_HSEA="), grab(W7, "function sw7CardSea("), grab(W7, "function sw7Term(d)"), grab(W7, "function sw7TermFor(P,o)"), grab(W7, "function sw7SeaNow()"),
    grab(W7, "const SW7_TODW="), opts.badSun ? "const SW7_SUN=[];" : grab(W7, "const SW7_SUN="), grab(W7, "function sw7Sun(d)"), grab(W7, "function sw7Todw(d)"), grab(W7, "function sw7TodwOr(d,sea)"),
    grab(W7, "function sw7HomeNightA(d,sea)"), grab(W7, "function sw7NightNow()"), grab(W7, "function sw7HomeTod(d,sea)"), grab(W7, "function sw7Tint(d)"), grab(W7, "const SW7_AMB="));
  if (opts.throw7w7) parts.push("function sw7HomeNightA(){throw new Error('x')}function sw7SeaNow(){throw new Error('x')}function sw7NightNow(){throw new Error('x')}");
  parts.push(grab(XSM, "function xsmDay(d){"), grab(GXT, "function gxtDay(d){"));
  for (const [f, n] of DARK) parts.push(grab(M(f), "const " + n + "=").replace(/^const /, "var "));
  parts.push(grab(M("07w8-shichen.js"), "const clkIdx=").replace(/^const /, "var "));
  const w7 = !opts.no7w7 || opts.throw7w7;
  vm.runInContext(parts.join("\n") + ";this.R={xqNight,xsmDay,gxtDay,tdTerm," + (w7 ? "sw7NightNow," : "") + (opts.no7w7 ? "" : "sw7SeaNow,sw7CardSea,SW7_HSEA,sw7Sun,sw7Todw,sw7HomeTod,sw7Tint,sw7HomeNightA,SW7_AMB,") + DARK.map(d => d[1]).join(",") + "}", ctx);
  ctx.at = (y, mo, d, h, mi) => { NOW = new Date(y, mo - 1, d, h, mi || 0).getTime() };
  return ctx;
}
function all(K) { const R = K.R; return { home: R.sw7NightNow(), xsm: !R.xsmDay(), gxt: !R.gxtDay(), q: R.xqNight(), dark: DARK.map(d => R[d[1]]()) } }
const same = (o, v, tag) => { assert.equal(o.home, v, tag + " 首頁"); assert.equal(o.xsm, v, tag + " 西市"); assert.equal(o.gxt, v, tag + " 觀星臺"); assert.equal(o.q, v, tag + " xqNight"); o.dark.forEach((x, i) => assert.equal(x, v, tag + " " + DARK[i][1])) };
const hm = x => { const m = Math.round(x * 60); return Math.floor(m / 60) + ":" + String(m % 60).padStart(2, "0") };

test("臺北日出日落表（SW7_SUN 內插）：跟實際差不到 3 分鐘；入夜＝日落後 25 分、天亮＝日出前 25 分", () => {
  const K = kit(), R = K.R;
  /* 臺北（NOAA 公式逐日算，跟中央氣象署表差 1～2 分）：11/17 06:12／17:06、夏至 05:04／18:46、冬至 06:35／17:10、春分 05:59／18:05、秋分 05:42／17:50 */
  for (const [mo, d, sr, ss] of [[11, 17, 6 * 60 + 12, 17 * 60 + 6], [6, 21, 5 * 60 + 4, 18 * 60 + 46], [12, 22, 6 * 60 + 35, 17 * 60 + 10], [3, 20, 5 * 60 + 59, 18 * 60 + 5], [9, 23, 5 * 60 + 42, 17 * 60 + 50]]) {
    const [a, b] = R.sw7Sun(new Date(2026, mo - 1, d, 12)); assert.ok(Math.abs(a * 60 - sr) <= 3 && Math.abs(b * 60 - ss) <= 3, `${mo}/${d} 日出 ${hm(a)} 日落 ${hm(b)}`);
    const w = R.sw7Todw(new Date(2026, mo - 1, d, 12)); assert.ok(Math.abs((w[3] - b) * 60 - 25) < 1e-6 && Math.abs((a - w[0]) * 60 - 25) < 1e-6, "前後 25 分");
  }
  /* 入夜時刻：11 月約 17:30、夏至約 19:10 */
  assert.equal(hm(R.sw7Todw(new Date(2026, 10, 17, 12))[3]), "17:31"); assert.equal(hm(R.sw7Todw(new Date(2026, 5, 21, 12))[3]), "19:11");
  /* 整年逐日跟 NOAA 公式比：每月兩筆內插，最多差 1.5 分 */
  const lat = 25.0330, lon = 121.5654, rad = Math.PI / 180;
  const noaa = d => { const N = Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getFullYear(), 0, 0)) / 864e5), g = 2 * Math.PI / 365 * (N - 0.5);
    const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
    const dec = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g) + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
    const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(lat * rad) * Math.cos(dec)) - Math.tan(lat * rad) * Math.tan(dec)) / rad; return [720 - 4 * (lon + ha) - eq + 480, 720 - 4 * (lon - ha) - eq + 480] };
  let mx = 0; for (let t = new Date(2026, 0, 1).getTime(); t < new Date(2027, 0, 1).getTime(); t += 864e5) { const d = new Date(t), [a, b] = noaa(d), [c, e] = R.sw7Sun(d); mx = Math.max(mx, Math.abs(a - c * 60), Math.abs(b - e * 60)) }
  assert.ok(mx <= 1.5, "整年最大誤差 " + mx.toFixed(2) + " 分");
  /* 整年每天都算得出來、日出早於日落、跨年接得上 */
  for (let t = new Date(2026, 0, 1).getTime(); t < new Date(2027, 0, 2).getTime(); t += 864e5) { const [a, b] = R.sw7Sun(new Date(t)); assert.ok(a > 4.9 && a < 6.75 && b > 17 && b < 18.85, new Date(t).toDateString() + " " + hm(a) + "／" + hm(b)) }
});

test("同一刻全部一起換：首頁、西市、觀星臺、其他換夜景圖的頁——11/17 17:06 白天、17:40 夜景；冬至、夏至前後", () => {
  const K = kit();
  K.at(2026, 11, 17, 17, 6); same(all(K), false, "11/17 17:06（開發者回報的時刻）");
  K.at(2026, 11, 17, 17, 30); same(all(K), false, "11/17 17:30");
  K.at(2026, 11, 17, 17, 32); same(all(K), true, "11/17 17:32 入夜");
  K.at(2026, 11, 17, 17, 40); same(all(K), true, "11/17 17:40 夜景");
  K.at(2026, 11, 18, 5, 40); same(all(K), true, "11/18 5:40 還沒天亮"); K.at(2026, 11, 18, 5, 50); same(all(K), false, "11/18 5:50 天亮");
  K.at(2026, 12, 22, 17, 30); same(all(K), false, "冬至 17:30"); K.at(2026, 12, 22, 17, 40); same(all(K), true, "冬至 17:40");
  K.at(2026, 12, 22, 6, 5); same(all(K), true, "冬至 6:05 還沒天亮"); K.at(2026, 12, 22, 6, 15); same(all(K), false, "冬至 6:15");
  K.at(2026, 6, 21, 18, 30); same(all(K), false, "夏至 18:30 還是白天"); K.at(2026, 6, 21, 19, 5); same(all(K), false, "夏至 19:05"); K.at(2026, 6, 21, 19, 15); same(all(K), true, "夏至 19:15");
  K.at(2026, 6, 21, 4, 35); same(all(K), true, "夏至 4:35"); K.at(2026, 6, 21, 4, 45); same(all(K), false, "夏至 4:45 天亮");
});

test("跨過日落、日出：逐分鐘掃，全部在同一分鐘換、只換一次；頁面開著每 60 秒看一次（首頁、西市外景與茶坊、觀星臺）", () => {
  const K = kit();
  for (const [y, mo, d, h0, h1] of [[2026, 11, 17, 16, 19], [2026, 12, 22, 16, 19], [2026, 6, 21, 18, 21], [2026, 11, 18, 4, 8], [2026, 6, 22, 3, 7]]) {
    let prev = null, flips = 0;
    for (let t = h0 * 60; t <= h1 * 60; t++) { K.at(y, mo, d, Math.floor(t / 60), t % 60); const o = all(K); same(o, o.q, `${mo}/${d} ${Math.floor(t / 60)}:${t % 60}`); if (prev !== null && prev !== o.q) flips++; prev = o.q }
    assert.equal(flips, 1, `${mo}/${d} ${h0}～${h1} 點之間只換一次`);
  }
  assert.ok(W7.includes("SW7.tm=setInterval(sw7Tick,60000)"));
  /* 11/17 冬景接線後：外景每分鐘交給 xsmSwap（網址一樣就不動，日夜、換季都靠它）；茶坊照舊換日夜蓋色、另外比對冬景網址；觀星臺比對 gxtSrc 網址（test-winter-scenes-1117.js） */
  assert.ok(XSM.includes("const d=xsmPickDay(xsmDay());xsmSwap(P,d);") && XSM.includes("const d=xsmDay()?\"1\":\"\";if(d!==P.dataset.day)P.dataset.day=d;"));
  assert.ok(GXT.includes("const d=gxtDay(),kk=P.dataset.gxt||\"\";if(gxtSrc(kk,d)!==(im.getAttribute(\"src\")||\"\"))gxtSet(P,kk,d)},60000)"));
});

test("晨昏圖（sw7HomeTod）、晨昏色調（sw7Tint）落在日出前後、日落前後，跟著季節移動", () => {
  const K = kit(), R = K.R, at = (mo, d, h, mi) => new Date(2026, mo - 1, d, h, mi);
  /* 11/17：天亮 5:47、日出 6:12、晨光圖到 7:12；黃昏圖 16:06 起、17:31 入夜 */
  assert.equal(R.sw7HomeTod(at(11, 17, 17, 6)), "dusk", "17:06 黃昏圖"); assert.equal(R.sw7HomeTod(at(11, 17, 15, 50)), "");
  assert.equal(R.sw7HomeTod(at(11, 17, 6, 0)), "dawn"); assert.equal(R.sw7HomeTod(at(11, 17, 7, 30)), "");
  assert.equal(R.sw7Tint(at(11, 17, 17, 0)).c, "dusk"); assert.equal(R.sw7Tint(at(11, 17, 13, 0)), null); assert.equal(R.sw7Tint(at(11, 17, 6, 0)).c, "dawn"); assert.equal(R.sw7Tint(at(11, 17, 10, 0)), null);
  /* 夏至：17:00 還沒到黃昏色調（入夜 19:11 前 2 小時起），18:30 是黃昏；冬至 16:00 已經是黃昏色調 */
  assert.equal(R.sw7Tint(at(6, 21, 17, 0)), null); assert.equal(R.sw7Tint(at(6, 21, 18, 30)).c, "dusk"); assert.equal(R.sw7HomeTod(at(6, 21, 18, 30)), "dusk");
  assert.equal(R.sw7Tint(at(12, 22, 16, 0)).c, "dusk"); assert.equal(R.sw7Tint(at(12, 22, 5, 0)), null, "冬至 5:00 還是夜");
  /* 強度 0～1、入夜那一刻歸零 */
  for (let m = 0; m < 24 * 60; m += 5) { const t = R.sw7Tint(at(11, 17, Math.floor(m / 60), m % 60)); if (t) assert.ok(t.a >= 0 && t.a <= 1, m + " " + t.a) }
  /* 算不出日出日落（表壞了）就退回原本照季節的 SW7_TODW，不丟錯 */
  const B = kit({ badSun: true }); B.at(2026, 11, 17, 18, 0); assert.equal(B.R.sw7NightNow(), false, "退回 SW7_TODW 冬天 18:15 入夜"); B.at(2026, 11, 17, 18, 20); assert.equal(B.R.sw7NightNow(), true);
});

test("季節照節氣：立春、立夏、立秋、立冬換季（換季日前後一天），跟頂端節氣、小籤同一套；立冬不再飄落葉", () => {
  const K = kit(), R = K.R;
  for (const [mo, d, a, b] of [[2, 4, "winter", "spring"], [5, 6, "spring", "summer"], [8, 8, "summer", "autumn"], [11, 7, "autumn", "winter"]]) {
    K.at(2026, mo, d - 1, 12); assert.equal(R.sw7SeaNow(), a, `${mo}/${d - 1}（${R.tdTerm(new Date(2026, mo - 1, d - 1))}）`);
    K.at(2026, mo, d, 12); assert.equal(R.sw7SeaNow(), b, `${mo}/${d}（${R.tdTerm(new Date(2026, mo - 1, d))}）`);
  }
  K.at(2026, 11, 17, 12); assert.equal(R.tdTerm(new Date(2026, 10, 17)), "立冬"); assert.equal(R.sw7SeaNow(), "winter", "11/17 頂欄立冬、首頁冬景");
  for (const t of Object.keys(R.SW7_HSEA)) assert.equal(R.SW7_HSEA[t], R.sw7CardSea(t), t + "：圖跟小籤同一季");
  assert.equal(Object.keys(R.SW7_HSEA).length, 24);
  assert.notEqual(R.SW7_AMB["立冬"][0], "leaf", "立冬不飄落葉");
  for (const t of ["小雪", "大雪", "冬至", "小寒", "大寒", "立春", "雨水", "驚蟄"]) assert.ok(!R.SW7_AMB[t] || R.SW7_AMB[t][0] !== "leaf", t);
});

test("冬季圖、長卷都在（換季只是換哪一張，沒有新圖要畫）；載不到有退路", { skip: fs.existsSync(path.join(ROOT, "xiangqi-lab/site/data/homemap/home_qin_spring.webp")) ? false : "沒有季節首頁圖（只放 CDN，公開副本沒有）" }, () => {   /* 11/17 1757 證據：公開倉庫有 homemap 資料夾但只有瘦身版，原本只看資料夾在不在會誤跑而失敗 */
  const H = new Set(fs.readdirSync(path.join(ROOT, "xiangqi-lab/site/data/homemap"))), HB = fs.readdirSync(path.join(ROOT, "xiangqi-lab/site/data/hubmap"));
  const ERAS = "qin han sanguo weijin nanbei sui tang wudai yuan ming qing".split(" ");
  for (const sea of ["spring", "summer", "autumn", "winter"]) {
    for (const v of ["", "_dawn", "_dusk", "_night"]) { assert.ok(H.has(`home_${sea}${v}.webp`), `宋 ${sea}${v}`); for (const e of ERAS) assert.ok(H.has(`home_${e}_${sea}${v}.webp`), `${e} ${sea}${v}`) }
    for (const v of ["", "_night"]) { assert.ok(H.has(`home_classic_${sea}${v}.webp`)); for (const s of ["_pano_l", "_pano_r"]) assert.ok(H.has(`home_classic_${sea}${v}${s}.webp`), `長卷 ${sea}${v}${s}`) }
    assert.ok(HB.filter(f => f.includes("_" + sea)).length >= 52, "學習／對戰 " + sea);
  }
  assert.ok(M("07hmp-pano.js").includes("classic_winter:1,classic_winter_night:1"), "長卷表有冬");
  assert.ok(M("07y-hubmap.js").includes("onerror=\"this.onerror=null;this.src=this.src.replace('_night.','.')\""), "學習／對戰夜景載不到退回白天");
});

test("全部經過同一個判斷（改 07w7 一處全部一起變）；退路；深色主題照舊；時辰鐘、黑洞檔沒動", () => {
  /* 呼叫鏈：xqNight → sw7NightNow／sw7HomeNightA → sw7TodwOr → sw7Todw → sw7Sun（SW7_SUN） */
  assert.ok(U.includes("function xqNight(d){try{if(typeof sw7HomeNightA===\"function\"&&typeof sw7SeaNow===\"function\"){if(!d&&typeof sw7NightNow===\"function\")return!!sw7NightNow();return sw7HomeNightA(d,sw7SeaNow())>0}}"));
  assert.ok(W7.includes("function sw7NightNow(){try{return sw7HomeNightA(null,sw7SeaNow())>0}"));
  assert.ok(W7.includes("function sw7HomeNightA(d,sea){d=d||new Date();const h=d.getHours()+d.getMinutes()/60,w=sw7TodwOr(d,sea);"));
  assert.ok(W7.includes("function sw7HomeTod(d,sea){d=d||new Date();const h=d.getHours()+d.getMinutes()/60,w=sw7TodwOr(d,sea);"));
  assert.ok(W7.includes("let w=null;try{w=sw7Todw(d)}catch(e){w=null}"), "晨昏色調");
  assert.ok(/hn=o&&[^\n]*sw7HomeNightA\(null,/.test(W7), "首頁、學習、對戰、天井的月夜層（sw7Fill）");
  for (const [f, n, h] of DARK) assert.ok(M(f).includes(`(typeof xqNight==="function"?xqNight():h>=${h}||h<5)`), f + " " + n);
  assert.ok(XSM.includes('function xsmDay(d){try{if(typeof xqNight==="function")return!xqNight(d)}catch(e){}'));
  assert.ok(GXT.includes('function gxtDay(d){try{if(typeof xqNight==="function")return!xqNight(d)}catch(e){}'));
  assert.ok(M("07x2-lobbymap.js").includes('const lmNt=typeof sw7NightNow==="function"&&sw7NightNow();'), "天井");
  assert.ok(M("07y-hubmap.js").includes('nt=lb&&typeof sw7NightNow==="function"&&sw7NightNow()?"_night":""'), "學習／對戰");
  assert.ok(M("07w5-ouyu.js").includes('return sw7HomeNightA(d,sw7SeaNow())>0'), "偶遇");
  /* 07w7 不在／出錯：退回時辰（卯～申白天） */
  for (const o of [{ no7w7: true }, { no7w7: true, throw7w7: true }]) {
    const K = kit(o), R = K.R;
    K.at(2026, 11, 17, 16, 59); assert.equal(R.xqNight(), false); assert.equal(R.xsmDay(), true); assert.equal(R.gxtDay(), true);
    K.at(2026, 11, 17, 17, 0); assert.equal(R.xqNight(), true, "酉時"); assert.equal(R.hqDark(), true);
  }
  /* 深色主題照舊 */
  const K1 = kit({ theme: "dark" }); K1.at(2026, 11, 17, 12, 0); for (const [, n] of DARK) assert.equal(K1.R[n](), true, n);
  const K3 = kit({ theme: "light" }); K3.at(2026, 11, 17, 17, 40); for (const [, n] of DARK) assert.equal(K3.R[n](), true, n); K3.at(2026, 11, 17, 17, 0); for (const [, n] of DARK) assert.equal(K3.R[n](), false, n);
  /* 時辰鐘、黑洞檔 */
  assert.ok(!M("07w8-shichen.js").includes("xqNight") && !M("07w8-shichen.js").includes("sw7Todw"), "時辰鐘照舊顯示時辰");
  const files = fs.readdirSync(path.join(ROOT, "xiangqi-db/m")).filter(f => f.endsWith(".js"));
  for (const f of files.filter(f => /^07bh|^07sg2/.test(f))) assert.ok(!/getHours\(|clkIdx\(|sw7NightNow|xqNight/.test(M(f)), "黑洞檔沒有日夜判斷：" + f);
  for (const f of files) for (const ln of M(f).split("\n")) if (/h>=(19|20)\|\|h<5/.test(ln) && /Dark|dark/.test(ln)) assert.ok(/typeof xqNight==="function"\?xqNight\(\):h>=(19|20)\|\|h<5/.test(ln), f + "：" + ln.slice(0, 80));
});

test("07s4-passmap（禁改檔）的改動寫在 reps-next.json，以線上 pub.html 為底每組只命中 1 次", { skip: !fs.existsSync(path.join(ROOT, "xiangqi-ios")) || fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json")) ? "公開副本：這項檢查開發者電腦上的發版暫存檔，不在公開副本跑（11/17 1757 證據補）" : fs.existsSync(path.join(process.env.TEMP || "", "claude/C--Users-rayson-myClaude/a1520069-d9a3-4c4a-a1ad-2cbf5ca0228d/scratchpad/relD/reps-next.json")) ? false : "沒有 reps-next.json（暫存區）" }, () => {
  const D = path.join(process.env.TEMP, "claude/C--Users-rayson-myClaude/a1520069-d9a3-4c4a-a1ad-2cbf5ca0228d/scratchpad/relD");
  const R = JSON.parse(fs.readFileSync(path.join(D, "reps-next.json"), "utf8")); let h = fs.readFileSync(path.join(D, "pub.html"), "utf8").replace(/\r\n/g, "\n");
  for (const [a, b] of R) { assert.equal(h.split(a).length - 1, 1, a.slice(0, 50)); h = h.replace(a, () => b) }
  const loc = M("07s4-passmap.js"), i = loc.indexOf("const hqDark=()=>{"); assert.ok(h.includes(loc.slice(i, loc.indexOf("\n", i))), "套完後跟本機 07s4 的 hqDark 一樣");
});
