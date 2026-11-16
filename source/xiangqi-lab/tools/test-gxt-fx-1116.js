// 開發者 11/16（觀星臺）「點擊這一頁每一個入口後，可以先有個動畫過場或是其他方式來說明怎麼進到這個對應入口的頁面，不然玩家會覺得怎麼進來的」
// Gemini 討論 story/gemini_app/158，開發者選「每個入口短過場＋回來站在器物前」。
//   m/07gxt-guanxing.js gxtFx：渾儀（星淵遠征）、天頂黑洞（黑洞車輪戰）、右側星空（二十八宿）各一段短過場與一句話；
//   十三星系的「星碑共鳴」（gxtGate）是 11/15 做的，不動。回來站在器物前靠 07w 本來就有的位置記憶。
// 這裡跑時間表與入口的行為（沒有畫面時直接開）；動畫本身在本機候選版手機尺寸看過。
// 用法：node --test xiangqi-lab/tools/test-gxt-fx-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), GXT = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", "07gxt-guanxing.js"), "utf8").replace(/\r\n/g, "\n");

function load(o) {
  o = o || {}; const log = { toast: [], open: [], ss: {} };
  const ctx = { console, store: { get: (k, d) => d, set() { } }, toast: x => log.toast.push(x), vibrate() { }, esc: s => String(s), setTimeout, clearTimeout,
    document: { getElementById: () => null, querySelector: () => null, createElement: () => ({}), head: { append() { } }, body: {} },
    addEventListener() { }, removeEventListener() { }, sessionStorage: { getItem: k => log.ss[k] || null, setItem: (k, v) => { log.ss[k] = String(v) }, removeItem: k => { delete log.ss[k] } },
    location: { hash: "#/guanxing" }, matchMedia: () => ({ matches: !!o.rm }), innerWidth: 375, innerHeight: 812,
    bhtdOpen: () => log.open.push("td"), whlOpen: () => log.open.push("whl"), dglXiuSheet: () => log.open.push("xiu"), gxMap: x => log.open.push("gx:" + (x && x.from)) };
  if (o.lock) { ctx.dglBhLock = () => true; ctx.dglBhLockMsg = () => "定軌力用完了" }
  vm.createContext(ctx); vm.runInContext(GXT + ";this.__X={GXT_ACT,GXT_FXT,GXT_FXP,GXT_GATE,gxtFxPlan,gxtGatePlan,gxtFx}", ctx); return Object.assign(ctx.__X, { log });
}

test("〔行為〕時間表：第一次約 2.7 秒、之後約 1.7 秒、減少動態約 1.1 秒；都比星碑共鳴的完整版短", () => {
  const K = load(), F = K.gxtFxPlan(false, false), L = K.gxtFxPlan(false, true), M = K.gxtFxPlan(true, false);
  assert.equal(F.kind, "full"); assert.equal(L.kind, "lite"); assert.equal(M.kind, "min"); assert.equal(K.gxtFxPlan(true, true).kind, "min");
  for (const T of [F, L, M]) assert.ok(0 < T.say && T.say < T.open && T.open < T.end);
  assert.ok(F.end <= 3000 && L.end <= 1800 && M.end <= 1300); assert.ok(L.end < F.end && M.end < L.end);
  assert.ok(F.end < K.gxtGatePlan(false, false).end, "短過場比十三星系的完整版短");
});

test("〔行為〕三件器物各一句話（14 個字以內、互不相同），位置都在場景圖裡", () => {
  /* 11/16 開發者：今日異象（圭表）、自由擺陣（石棋桌）開張，各加一段（原本期望只有三段） */
  const K = load(), ids = Object.keys(K.GXT_FXT); assert.deepEqual(ids.sort(), ["free", "omen", "simul", "sky", "td"]);
  const lines = ids.map(i => K.GXT_FXT[i]); assert.equal(new Set(lines).size, 5);
  for (const s of lines) assert.ok(s.length <= 14 && /。$/.test(s), s);
  assert.ok(/渾儀/.test(K.GXT_FXT.td) && /天頂/.test(K.GXT_FXT.simul) && /星/.test(K.GXT_FXT.sky) && /圭/.test(K.GXT_FXT.omen) && /石桌/.test(K.GXT_FXT.free), "一看就知道是哪件器物");
  for (const k of ["p", "w"]) for (const n of ["td", "sky", "omen", "free"]) { const [x, y, r] = K.GXT_FXP[k][n]; assert.ok(x > 0 && x < 100 && y > 0 && y < 100 && r > 0 && r < 20, k + "." + n) }
  for (const k of ["p", "w"]) { const g = K.GXT_FXP[k].gui; assert.ok(g.length === 4 && g.every(v => v > 0 && v < 100) && g[2] > g[0], k + ".gui 石圭從柱腳往右延伸") }
  assert.ok(K.GXT_FXP.p.omen[0] > 60 && K.GXT_FXP.p.free[0] < 40 && K.GXT_FXP.p.free[1] > 65, "圭表在右、石棋桌在左下");
  assert.ok(K.GXT_FXP.p.sky[0] > 60 && K.GXT_FXP.p.sky[1] < 30, "星空在右上"); assert.ok(Math.abs(K.GXT_FXP.p.td[0] - 50) < 2, "渾儀在中間");
});

test("〔行為〕沒有場景可以播（測試環境、不支援動畫的瀏覽器）時，三個入口照樣直接打開各自的畫面", () => {
  const K = load(); K.GXT_ACT.gxtTd(); K.GXT_ACT.gxtSimul(); K.GXT_ACT.gxtSky(); K.GXT_ACT.gxtGx();
  assert.deepEqual(Array.from(K.log.open), ["td", "whl", "xiu", "gx:stele"]); assert.equal(K.log.toast.length, 0);
  assert.equal(K.log.ss.gxtFrom, "1", "從觀星臺開的塔防照舊記著，打完回觀星臺");
});

test("〔行為〕定軌力用完：渾儀與天頂黑洞先擋，不播過場；二十八宿不受影響", () => {
  const K = load({ lock: 1 }); K.GXT_ACT.gxtTd(); K.GXT_ACT.gxtSimul(); K.GXT_ACT.gxtSky();
  assert.deepEqual(Array.from(K.log.open), ["xiu"]); assert.equal(K.log.toast.length, 2);
});

test("〔原始碼〕過場的接線：每件器物第一次才播長的；點一下跳過；離開這一頁就收掉；跟星碑共鳴不會同時播", () => {
  assert.ok(GXT.includes('gxtFx("td",()=>bhtdOpen())') && GXT.includes('gxtFx("simul",()=>whlOpen())') && GXT.includes('gxtFx("sky",()=>dglXiuSheet())'));
  assert.ok(GXT.includes('seen=sessionStorage.getItem("gxtFx:"+id)==="1";sessionStorage.setItem("gxtFx:"+id,"1")') && GXT.includes("gxtFxPlan(gxtRM(),seen)"));
  assert.ok(GXT.includes("!gxtFx.busy&&!gxtGate.busy&&typeof document.body.animate===\"function\""));
  const i = GXT.indexOf("function gxtFx(id,open){"), j = GXT.indexOf("function gxtWheel(){"), F = GXT.slice(i, j);
  assert.ok(F.includes("fx.onclick=()=>{vibrate(5);doOpen();finish(true)}") && F.includes('addEventListener("hashchange",bail)') && F.includes('removeEventListener("hashchange",bail)'));
  assert.ok(F.includes('if(id!=="sky")at(Math.max(0,T.say-380)'), "星空那一段不蓋黑，星圖面板直接滑上來");
  assert.ok(F.includes('fx.setAttribute("aria-hidden","true")'), "報讀不念過場");
});
