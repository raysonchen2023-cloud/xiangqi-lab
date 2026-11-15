// 平日體力（m/07dgl-stamina.js，開發者 11/13：定軌力＋星芒＋化墨退場）的自動測試，不開瀏覽器：
//   ① 純函式（#DGL-PURE 區段）：人間／星槎／不算的頁怎麼分、扣減（人間每分鐘 1）、星槎回 3、上限 30、低體力門檻、扣到 0 記 due、
//      退場時機（對局中不退場、結果出來 2.5 秒後才退）、退場後人間的頁擋下來、星槎上回到 15 才能再下船、關 App 再開回滿、下棋解題回 2、
//      星芒上限 20、帶進黑洞（開局靈力加星芒、不超過上限、用掉多少扣多少）、走慢倍率、七星累了的台詞
//   ② 07bht-td.js 的 BHTD.boot：td 設定帶 xm＝開局靈力加上去、不超過靈力上限；沒帶＝跟原本一樣
//   ③ 接線：m.html include、02-shell route 開頭的 dglRouteGate、05b JOURNEY_KEYS 的 m_dgl、07w 的 dglWalkHook／dglSlow、07bht bhtdStart 的 dglXmTake、07i18n 字典、名稱不撞
//   ④ 11/13 晚加強：地點頁兩條出現的條件（dglLocOn）、二十八宿星圖（點亮扣星芒、四象與全亮的獎只給一次）、設定關閉體力（整個模組丟進 vm：不扣、不退場、沒有加成、星芒照給）
// 用法：node --test xiangqi-lab/tools/test-dgl.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../.."), M = path.join(ROOT, "xiangqi-db/m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SRC = rd(path.join(M, "07dgl-stamina.js"));

function loadPure() {
  const i = SRC.indexOf("#DGL-PURE-BEGIN"), j = SRC.indexOf("/* #DGL-PURE-END */");
  assert.ok(i > 0 && j > i, "找不到 #DGL-PURE 區段");
  const ctx = {}; vm.createContext(ctx);
  vm.runInContext(SRC.slice(SRC.indexOf("\n", i) + 1, j) + ";this.R={DGL_MAX,DGL_DRAIN,DGL_SHIP,DGL_BACK,DGL_GAME,DGL_PUZ,DGL_BH,DGL_LOW,DGL_XM_MAX,DGL_SLOW,DGL_SAFE,DGL_TIRED,DGL_TIRED0,dglZone,dglOpen,dglBusy,dglNew,dglShow,dglTired,dglSlowOf,dglStep,dglGain,dglExit,dglCanLand,dglWhen,dglGate,dglXmAdd,dglXmUse,dglTiredLine,dglXpMul,dglXpBonus,dglLocOn,DGL_XIU_COST,DGL_XIANG_XP,DGL_XIU_ALL_XP,DGL_XIU_TITLE,DGL_XIANG,DGL_XIU,dglXiuMask,dglXiuHas,dglXiuN,dglXiangDone,dglXiuLight,dglXiuLine,dglCardSt,dglBackMin,DGL_ICO,DGL_CD_LOW,DGL_XM_GET,DGL_BH_DAY,DGL_DAY_SH,dglBhLocked,dglDay,dglBhCap,dglBhUse,dglDisp,dglU,dglWake,DGL_M1,DGL_M2}", ctx, { filename: "07dgl(純函式)" });
  return ctx.R;
}
const R = loadPure(), MIN = 6e4;
const J = x => JSON.parse(JSON.stringify(x)), deqA = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const run = (s, min, z) => { const ev = []; for (let i = 0; i < min * 30; i++)ev.push(...R.dglStep(s, 2000, z)); return ev };   /* 照 App 每 2 秒一拍 */

test("常數：定軌力上限 30、人間每分鐘扣 1、星槎每分鐘回 3、回到 15 才能下船、下棋解題回 2、黑洞過關回 20、星芒上限 20（11/13 晚由 5 提高）、體力低 ≤10", () => {
  assert.deepEqual([R.DGL_MAX, R.DGL_DRAIN, R.DGL_SHIP, R.DGL_BACK, R.DGL_GAME, R.DGL_PUZ, R.DGL_BH, R.DGL_XM_MAX, R.DGL_LOW], [30, 1, 3, 15, 2, 2, 20, 20, 10]);
  assert.ok(R.DGL_BH > R.DGL_GAME * 5, "黑洞過關要回很多");
});

test("心定則棋穩：定軌力一半以上修為 ×1.2、滿格 ×1.5（11/16 開發者選「加大滿格獎勵，不另外罰」，原本 ×1.1／×1.2）；零頭累積滿 1 才多給；負數與 0 不動", () => {
  assert.deepEqual([R.DGL_M1, R.DGL_M2], [1.2, 1.5]);
  assert.deepEqual([R.dglXpMul(30), R.dglXpMul(29.5), R.dglXpMul(15), R.dglXpMul(14.9), R.dglXpMul(14), R.dglXpMul(0)], [1.5, 1.5, 1.2, 1.2, 1, 1]);   /* 11/14 加成照畫面數字（進位）：29.5 顯示 30、14.9 顯示 15 */
  assert.deepEqual(J(R.dglXpBonus(10, 30, 0)), { n: 15, fx: 0 });
  let fx = 0, sum = 0;
  for (let i = 0; i < 10; i++) { const B = R.dglXpBonus(1, 20, fx); fx = B.fx; sum += B.n; }
  assert.equal(sum, 12, "一次 1 點、×1.2，十次要多給 2 點");
  assert.ok(fx >= 0 && fx < 1);
  assert.deepEqual(J(R.dglXpBonus(5, 10, 0.7)), { n: 5, fx: 0.7 }, "不到一半沒加成，零頭照留");
  assert.deepEqual(J(R.dglXpBonus(-3, 30, 0)), { n: -3, fx: 0 });
  assert.deepEqual(J(R.dglXpBonus(0, 30, 0.5)), { n: 0, fx: 0.5 });
});

test("人間／星槎／不算：照 07w8 CLK_SHIP_RE（船艙＝下船後算人間），線上大廳、千秋盃、設定不算，黑洞對局另成一區（11/14 起照人間扣）", () => {
  const ship = ["#/adventure", "#/ship/lesson", "#/ship/pz", "#/ship/read/qin", "#/ship/lv/qin/2", "#/shelf/1/3", "#/canju/s/xs-classic-R", "#/canju/q/x1", "#/canju/e/5/abc", "#/qqev"];
  const land = ["#/", "", "#/port", "#/hub/learn", "#/hub/battle", "#/cpu", "#/arena", "#/journey/play", "#/journey/park", "#/journey/inn", "#/canju", "#/canju/abc", "#/camp/3", "#/battle/qin/2", "#/guanxing", "#/cpuroom", "#/db", "#/codex", "#/legend/x", "#/daily", "#/ouyu/zf/1", "#/coop", "#/simul"];
  const free = ["#/lobby", "#/pvp", "#/join/r", "#/watch/ai", "#/cup", "#/coop/lobby", "#/settings", "#/feedback", "#/fbadmin", "#/weekly", "#/terms", "#/me", "#/me/relics", "#/profile", "#connect=abc"];
  for (const h of ship) assert.equal(R.dglZone(h), "ship", h);
  for (const h of land) assert.equal(R.dglZone(h), "land", h);
  for (const h of free) assert.equal(R.dglZone(h), "free", h);
  assert.equal(R.dglZone("#/journey/play", { bh: true }), "bh", "黑洞對局（塔防、急襲、黑洞對戰）＝bh 區");
  assert.equal(R.dglOpen("#/journey/play", { bh: true }), true, "路由不擋黑洞對局頁（入口另外由 dglBhLock 關）");
  assert.equal(R.dglZone("#/port", { travel: true }), "ship", "千秋穿梭過場還在畫面上＝在船上");
  assert.equal(R.dglZone("#/cupx"), "land", "前綴要整段比對");
});

test("扣減：人間每分鐘 1、星槎不扣、不算的頁不動；顯示無條件進位（剛開始還是 30）", () => {
  const s = R.dglNew(); assert.deepEqual(J(s), { r: 30, out: false, due: false });
  R.dglStep(s, 2000, "land"); assert.equal(R.dglShow(s.r), 30, "2 秒後還顯示 30");
  run(s, 1, "land"); assert.ok(Math.abs(s.r - (29 - 2000 / MIN)) < 1e-9);
  const t = R.dglNew(); run(t, 10, "land"); assert.equal(R.dglShow(t.r), 20);
  run(t, 7, "free"); assert.equal(R.dglShow(t.r), 20, "線上大廳、千秋盃不扣");
  const u = R.dglNew(); run(u, 10, "ship"); assert.equal(u.r, 30, "星槎上不扣、不超過上限");
});

/* ---------- 11/14 黑洞的定軌力（開發者選 Claude 修正版，story/黑洞塔防爽度_Gemini提案與審查_1114.md 第二節第 2 條） ---------- */
test("黑洞照人間每分鐘扣 1；扣到 0 記 due、那盤下完（結果出來 2.5 秒後）才化墨退場；退場中不再扣", () => {
  const s = R.dglNew(); run(s, 10, "bh"); assert.equal(R.dglShow(s.r), 20, "黑洞裡每分鐘 1");
  const t = R.dglNew(); t.r = 1; const ev = run(t, 2, "bh"); assert.ok(ev.includes("zero")); assert.equal(t.due, true);
  const now = 1e6;
  assert.equal(R.dglWhen(t, { zone: "bh", busy: true, done: 0, now }), null, "正在打的那盤先打完");
  assert.equal(R.dglWhen(t, { zone: "bh", busy: true, done: now - 1000, now }), null, "結果剛出來，先看一下");
  assert.equal(R.dglWhen(t, { zone: "bh", busy: true, done: now - R.DGL_SAFE, now }), "exit", "下完 2.5 秒後退場");
  assert.equal(R.dglWhen(t, { zone: "bh", busy: false, done: 0, now }), "exit");
  assert.equal(R.dglWhen(t, { zone: "bh", busy: true, done: now - 9999, now, block: true }), null, "有大畫面蓋著先等");
  R.dglExit(t); const r0 = t.r; run(t, 3, "bh"); assert.equal(t.r, r0, "退場中不再扣");
});

test("黑洞入口：退場中、該退場、歸零都關；其他開著", () => {
  const S = (r, o) => Object.assign({ r, out: false, due: false }, o || {});
  assert.equal(R.dglBhLocked(S(30)), false); assert.equal(R.dglBhLocked(S(0.4)), false, "還有一點點（畫面顯示 1）照樣能進");
  assert.equal(R.dglBhLocked(S(0)), true); assert.equal(R.dglBhLocked(S(0, { due: true })), true); assert.equal(R.dglBhLocked(S(14, { out: true })), true, "在星槎歇息還沒回到 15");
  assert.equal(R.dglBhLocked(S(20)), false, "回到 15 以上（out 已解除）就開");
  assert.equal(R.dglBhLocked(null), false);
});

test("黑洞過關一天最多回 20（照實際回到的點數算；人間時辰日界：子時 23:00 換日）", () => {
  assert.equal(R.DGL_BH_DAY, 20); assert.equal(R.DGL_DAY_SH, 1);
  assert.equal(R.dglDay(new Date(2026, 10, 14, 22, 59)), "2026-11-14"); assert.equal(R.dglDay(new Date(2026, 10, 14, 23, 0)), "2026-11-15", "子時起算新的一天");
  assert.equal(R.dglDay(new Date(2026, 10, 15, 0, 30)), "2026-11-15"); assert.equal(R.dglDay(new Date(2026, 11, 31, 23, 30)), "2027-1-1");
  const o = {}, d1 = "2026-11-14";
  assert.equal(R.dglBhCap(o, d1, R.DGL_BH), 20, "今天第一次");
  const s = R.dglNew(); s.r = 25; const g = R.dglGain(s, R.dglBhCap(o, d1, R.DGL_BH)); R.dglBhUse(o, d1, g.n); assert.equal(g.n, 5, "滿格只回到 30");
  assert.deepEqual(J(o.bd), { d: d1, n: 5 }); assert.equal(R.dglBhCap(o, d1, R.DGL_BH), 15, "沒回到的不算，今天還能回 15");
  R.dglBhUse(o, d1, 15); assert.equal(R.dglBhCap(o, d1, R.DGL_BH), 0, "今天滿 20 了");
  assert.equal(R.dglBhCap(o, "2026-11-15", R.DGL_BH), 20, "換日重算"); R.dglBhUse(o, "2026-11-15", 3); assert.deepEqual(J(o.bd), { d: "2026-11-15", n: 3 }, "換日從 0 記起");
  assert.equal(R.dglBhCap({ bd: { d: d1, n: 30 } }, d1, 20), 0, "記超過也不會變負的");
});

test("星槎上每分鐘回 3、上限 30；在人間不會回", () => {
  const s = R.dglNew(); s.r = 3; run(s, 2, "ship"); assert.equal(R.dglShow(s.r), 9);
  run(s, 20, "ship"); assert.equal(s.r, 30);
  const t = R.dglNew(); t.r = 5; run(t, 2, "free"); assert.equal(t.r, 5);
});

test("體力低：從 11 掉到 10 發一次 low；走慢倍率 1.6；10 以上照常", () => {
  const s = R.dglNew(); s.r = 11; const ev = run(s, 2, "land");
  assert.deepEqual(ev.filter(e => e === "low"), ["low"]);
  assert.ok(R.dglTired(10) && !R.dglTired(10.01));
  assert.equal(R.dglSlowOf(10), 1.6); assert.equal(R.dglSlowOf(11), 1); assert.equal(R.dglSlowOf(30), 1);
});

test("扣到 0：記 due（只發一次 zero）、不會變負數", () => {
  const s = R.dglNew(); const ev = run(s, 35, "land");
  assert.equal(s.r, 0); assert.equal(s.due, true); assert.deepEqual(ev.filter(e => e === "zero"), ["zero"]);
  assert.equal(ev.filter(e => e === "low").length, 1);
});

test("退場時機：對局中不退場；結果出來 2.5 秒後才退；不是對局頁馬上退；在不算的頁等回到人間；在船上直接記退場", () => {
  const s = R.dglNew(); s.r = 0; s.due = true; const now = 1e6;
  assert.equal(R.dglWhen(s, { zone: "land", busy: true, done: 0, now }), null, "下到一半不打斷");
  assert.equal(R.dglWhen(s, { zone: "land", busy: true, done: now - 1000, now }), null, "結果剛出來，先讓結果視窗出來");
  assert.equal(R.dglWhen(s, { zone: "land", busy: true, done: now - 2500, now }), "exit");
  assert.equal(R.dglWhen(s, { zone: "land", busy: false, done: 0, now }), "exit");
  assert.equal(R.dglWhen(s, { zone: "land", busy: false, done: 0, now, block: true }), null, "別的大畫面蓋著先等");
  assert.equal(R.dglWhen(s, { zone: "free", busy: false, done: 0, now }), null, "線上大廳、千秋盃不受影響");
  assert.equal(R.dglWhen(s, { zone: "ship", busy: false, done: 0, now }), "rest");
  assert.equal(R.dglWhen(R.dglNew(), { zone: "land", busy: false, done: 0, now }), null, "還有體力不退");
});

test("下完一盤、解完一題回 2（不超過 30）；扣到 0 那盤下完回的 2 不會取消退場", () => {
  const s = R.dglNew(); s.r = 29; assert.equal(R.dglGain(s, 2).n, 1); assert.equal(s.r, 30);
  const t = R.dglNew(); t.r = 0; t.due = true; R.dglGain(t, R.DGL_GAME); assert.equal(t.r, 2); assert.equal(t.due, true);
  assert.equal(R.dglWhen(t, { zone: "land", busy: true, done: 0, now: 1 }), null);
  assert.equal(R.dglWhen(t, { zone: "land", busy: true, done: 1, now: 3000 }), "exit");
});

test("化墨退場後：人間的頁擋下來回星槎（首頁、書院茶樓、棋譜、線上大廳、千秋盃照開）；星槎上回到 15 才能下船", () => {
  const s = R.dglNew(); s.r = 0; s.due = true;
  assert.equal(R.dglGate(s, "#/cpu"), "exit", "該退場時要開新的一盤＝先退場");
  R.dglExit(s); assert.deepEqual(J(s), { r: 0, out: true, due: false }); assert.equal(R.dglCanLand(s), false);
  for (const h of ["#/cpu", "#/port", "#/canju/abc", "#/journey/play", "#/guanxing", "#/camp/1"]) assert.equal(R.dglGate(s, h), "rest", h);
  for (const h of ["#/", "#/hub/battle", "#/hub/learn", "#/db", "#/codex", "#/stats", "#/lobby", "#/cup", "#/settings", "#/adventure", "#/ship/pz", "#/canju/s/x"]) assert.equal(R.dglGate(s, h), null, h);
  assert.equal(R.dglGate(s, "#/journey/play", { bh: true }), null, "黑洞照樣能去");
  run(s, 5, "land"); assert.equal(s.r, 0, "退場後在人間（首頁）不再扣也不回");
  const ev = run(s, 4, "ship"); assert.equal(R.dglShow(s.r), 12); assert.equal(s.out, true, "12 還不能下船"); assert.deepEqual(ev, []);
  const ev2 = run(s, 1.1, "ship"); assert.ok(s.r >= 15); assert.equal(s.out, false); assert.deepEqual(ev2, ["back"]);
  assert.equal(R.dglGate(s, "#/cpu"), null, "回到 15 就能再下船");
});

test("退場中解題、黑洞過關也算回復；回到 15 一樣解除", () => {
  const s = R.dglExit(Object.assign(R.dglNew(), { r: 0 }));
  R.dglGain(s, R.DGL_PUZ); assert.equal(s.out, true);
  const g = R.dglGain(s, R.DGL_BH); assert.equal(g.back, true); assert.equal(s.out, false); assert.equal(s.r, 22);
});

test("關 App 再開回滿：新狀態一律 30、沒有退場", () => {
  const s = R.dglExit(Object.assign(R.dglNew(), { r: 3 })); assert.equal(s.out, true);
  const t = R.dglNew(); assert.equal(t.r, 30); assert.equal(t.out, false); assert.equal(t.due, false);
  assert.ok(!/store\.set\("dglR|sessionStorage|localStorage/.test(SRC), "定軌力不存檔（關 App 再開回滿）");
});

test("整段情境：人間連續 30 分鐘、第 30 分鐘正在下棋 → 下完才退場 → 船上歇 5 分鐘再下船", () => {
  const s = R.dglNew(); run(s, 29.5, "land"); assert.equal(s.due, false);
  run(s, 1, "land"); assert.equal(s.due, true);
  let t = 0; const done = 5000;
  for (; t < 60000; t += 2000) { const w = R.dglWhen(s, { zone: "land", busy: true, done: t >= done ? done : 0, now: t }); if (w) break }
  assert.equal(t, 8000, "結果 5 秒出來，2.5 秒後下一拍（8 秒）才退");
  R.dglGain(s, R.DGL_GAME); R.dglExit(s); assert.equal(s.r, 2);
  run(s, 4, "ship"); assert.equal(s.out, true); run(s, 0.5, "ship"); assert.equal(s.out, false);
});

test("星芒：上限 20、不會變負；帶進黑洞＝開局靈力加星芒、不超過靈力上限、只扣用掉的", () => {
  assert.equal(R.dglXmAdd(19, 3), 20); assert.equal(R.dglXmAdd(0, -2), 0); assert.equal(R.dglXmAdd(undefined, 1), 1); assert.equal(R.dglXmAdd("x", 0), 0);
  assert.deepEqual(J(R.dglXmUse(1, 5, 5)), { sp: 5, used: 4 }, "第 1 關開局 1 靈、上限 5：帶 5 點只用掉 4");
  assert.deepEqual(J(R.dglXmUse(0, 6, 3)), { sp: 3, used: 3 });
  assert.deepEqual(J(R.dglXmUse(1, 5, 0)), { sp: 1, used: 0 });
  assert.deepEqual(J(R.dglXmUse(9, 5, 2)), { sp: 5, used: 0 }, "開局已經滿就不用");
  /* 11/14 晚靈力 ×10：1 點星芒＝10 點靈力（第 4 個參數 k），最多補到上限；最後一點不滿 10 也算一點（補到上限） */
  assert.deepEqual(J(R.dglXmUse(10, 50, 7, 10)), { sp: 50, used: 4 }, "開局 10、上限 50：帶 7 點只用掉 4 點（+40）");
  assert.deepEqual(J(R.dglXmUse(10, 53, 7, 10)), { sp: 53, used: 5 }, "差 43：用 5 點補到上限");
  assert.deepEqual(J(R.dglXmUse(10, 90, 3, 10)), { sp: 40, used: 3 });
  assert.deepEqual(J(R.dglXmUse(50, 50, 7, 10)), { sp: 50, used: 0 }, "開局已經滿就不用");
  assert.deepEqual(J(R.dglXmUse(10, 90, 0, 10)), { sp: 10, used: 0 });
});

test("七星累了的台詞：七位都有（空手動作＋台詞），沒選角用通用句", () => {
  const ks = ["x_swordboy", "x_spiritgirl", "x_martialgirl", "x_miaogirl", "x_shuai", "x_shi", "x_bing"];
  for (const k of ks) { const t = R.DGL_TIRED[k]; assert.ok(t && t[0] && t[1].length > 8, k); assert.equal(R.dglTiredLine(k), t[1]) }
  assert.equal(R.dglTiredLine(""), R.DGL_TIRED0); assert.ok(!/孤|扇|茶杯|眼睛也花/.test(JSON.stringify(R.DGL_TIRED)), "第十四節修正過的不合設定字眼不能回來");
});

test("對局、解題頁：下棋、殘局解題、古戰場、訓練營、星槎小關算；選單頁不算", () => {
  for (const h of ["#/cpu", "#/arena", "#/journey/play", "#/redo/play", "#/canju/abc", "#/battle/qin/2", "#/camp/3", "#/theme/x", "#/quiz", "#/guess", "#/ship/lv/qin/1", "#/ouyu/zf/1", "#/daily/2026-11-13/play", "#/hw/AB12/1", "#/simul"]) assert.equal(R.dglBusy(h), true, h);
  for (const h of ["#/", "#/canju", "#/battle", "#/camp", "#/journey", "#/port", "#/hub/battle", "#/daily", "#/hw/AB12", "#/coop/lobby"]) assert.equal(R.dglBusy(h), false, h);
});

/* ---------- ② 塔防開局帶星芒 ---------- */
test("BHTD.boot：td 設定帶 xm＝開局靈力加上去、不超過靈力上限；沒帶跟原本一樣", () => {
  const C = require(path.join(ROOT, "xiangqi-lab/site/core.js"));
  const BS = rd(path.join(M, "07bht-td.js")), ctx = { console, Math, JSON }; vm.createContext(ctx); vm.runInContext(BS + "\n;this.BHTD=BHTD;", ctx); const B = ctx.BHTD;
  const boot = (lv, xm) => { const start = B.startFen(lv, C), P = { start, startTurn: "r", board: C.parseFen(start), turn: "r", moves: [], human: "r" }; P.pos = [C.fen(P.board, "r")]; return B.boot({ lv, ch: "x_swordboy", L: 1, diff: 2, xm }, P, C).me };
  const st = B.stats("x_swordboy", 1), sp0 = Math.min(st.sp, B.LV[0].sp0 || 0);
  assert.equal(boot(1).sp, sp0, "沒帶星芒跟原本一樣");
  assert.equal(boot(1, 20).sp, sp0 + 20, "xm＝星芒換到的靈力點數（11/14 晚 1 點星芒＝10 靈）");
  assert.equal(boot(1, 50).sp, st.sp, "不超過靈力上限");
  assert.equal(boot(1, 50).sp, R.dglXmUse(sp0, st.sp, 5, B.SPK).sp, "跟 dglXmUse 算的一樣（bhtdStart 只傳用得到的點數）");
  assert.equal(boot(1, -3).sp, sp0); assert.equal(boot(1, "x").sp, sp0);
});

/* ---------- ③ 接線 ---------- */
test("〔原始碼〕接線：m.html 在觀星臺後面 include；route 開頭呼叫 dglRouteGate；JOURNEY_KEYS 有 m_dgl；07w 的走路接點；bhtdStart 帶星芒", () => {
  const HTML = rd(path.join(ROOT, "xiangqi-db/m.html"));
  assert.match(HTML, /\/\/#include m\/07gxt-guanxing\.js\n\/\/#include m\/07dgl-stamina\.js\n/);
  const order = [...HTML.matchAll(/\/\/#include m\/([\w-]+\.js)/g)].map(m => m[1]);
  for (const f of ["07-legend.js", "07bh-blackhole.js", "07bht-td.js", "07w-shipwalk.js"]) assert.ok(order.indexOf(f) < order.indexOf("07dgl-stamina.js"), f + " 要在前面（包一層 meChip、bhGameEnd、addXP）");
  assert.ok(order.indexOf("07dgl-stamina.js") < order.indexOf("11-watch.js"), "第一次 route() 前就要包好");
  const SH = rd(path.join(M, "02-shell.js")), ro = SH.slice(SH.indexOf("function route(){"));
  assert.ok(ro.indexOf("dglRouteGate()") > 0 && ro.indexOf("dglRouteGate()") < ro.indexOf('const v=$("#view")'), "換頁畫面前先擋");
  assert.ok(ro.indexOf("fmRouteGate()") < ro.indexOf("dglRouteGate()"), "家長時段先擋");
  assert.match(rd(path.join(M, "05b-save.js")), /"dgl","gxtSeen"\]\.map\(k=>"m_"\+k\)/, "JOURNEY_KEYS 有 dgl（排在 gxtSeen 前面，test-guanxing 要 gxtSeen 在最後）");
  const W = rd(path.join(M, "07w-shipwalk.js"));
  assert.match(W, /typeof dglSlow==="function"\?dglSlow\(\):1/); assert.match(W, /typeof dglWalkHook==="function"\)dglWalkHook\(S\)/);
  const TD = rd(path.join(M, "07bht-td.js"));
  assert.match(TD, /xm=dglXmTake\(/); assert.match(TD, /td:\{lv:n,ch:ck,L,diff,sk,xm,tal\}/); assert.match(TD, /\(L\.sp0\|\|0\)\+Math\.max\(0,Math\.min\(XM_CAP,Math\.round\(\+cfg\.xm\|\|0\)\)\)/); assert.match(TD, /XM_CAP=200/);
  assert.equal((TD.match(/dglXmTake\([^;]*,st0\.sp,BHTD\.SPK\)/g) || []).length, 2, "主線關、急襲都照 1 點星芒＝SPK 點靈力換");
  for (const f of ["meChip", "bhGameEnd", "addXP"]) assert.match(SRC, new RegExp(`if\\(typeof ${f}==="function"\\)\\{const f0=${f};${f}=function`), "包一層 " + f);
});

test("〔原始碼〕07i18n：畫面上的固定句子都有英文；名稱不撞；沒有 CR、控制字元、行內 // 註解", () => {
  const I = rd(path.join(M, "07i18n.js")), i = I.indexOf("#I18N-PURE-BEGIN"), j = I.indexOf("/* #I18N-PURE-END */"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(I.slice(I.indexOf("\n", i) + 1, j) + ";this.T=i18nText", ctx);
  for (const s of ["定軌力", "星芒", "定軌力耗盡，化墨退場——回星槎歇息。", "提示照舊免費，不用花星芒。", "定軌力微弱，星槎旅人要歇一會兒啦。", R.DGL_TIRED.x_shuai[1], R.DGL_TIRED.x_bing[1]]) {
    const t = ctx.T(s); assert.ok(t && !/[㐀-鿿]/.test(t), s + " → " + t);
  }
  for (const k of ["定軌力耗盡，化墨退場——回星槎歇息。", "下了船，每走一會兒就要花一點定軌力；下完一盤棋、解完一題都能補回來。"]) assert.ok(SRC.includes(k), "模組用的字跟字典一樣：" + k);
  const raw = fs.readFileSync(path.join(M, "07dgl-stamina.js"), "utf8");
  assert.ok(!raw.includes("\r")); assert.ok(!/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(raw), "控制字元");
  assert.ok(!raw.split("\n").some(l => /[;}]\s*\/\/[^\n]*\S/.test(l) && !/^\s*\/\//.test(l)), "長行不插 // 註解");
  const decl = [...raw.matchAll(/(?:^|[;\s])(?:const|let|var|function)\s+([A-Za-z_$][\w$]*)/g)].map(m => m[1]).filter(n => /^(dgl|DGL)/.test(n));
  assert.ok(decl.length > 20);
  const others = fs.readdirSync(M).filter(f => /\.js$/.test(f) && f !== "07dgl-stamina.js").map(f => rd(path.join(M, f))).join("\n");
  for (const n of new Set(decl)) assert.ok(!new RegExp("(?:const|let|var|function)\\s+" + n.replace(/\$/g, "\\$") + "\\b").test(others), "撞名：" + n);
});

/* ---------- ④ 11/13 晚加強：地點頁兩條、二十八宿星圖、設定關閉體力 ---------- */
test("地點頁兩條：人間的地點頁才放（渡口、園子、茶樓、書院、觀星臺、驛站、西市、雅間、棋譜、百科…）；首頁（頂欄已有）、對局解題頁、星槎、不算的頁、關了體力都不放", () => {
  for (const h of ["#/port", "#/journey/park", "#/journey/inn", "#/journey", "#/hub/battle", "#/hub/learn", "#/guanxing", "#/ximarket", "#/ximarket/tea", "#/cpuroom", "#/canju", "#/camp", "#/theme", "#/battle", "#/db", "#/codex", "#/stats", "#/redo", "#/openings", "#/today", "#/gm", "#/xiaohan", "#/daily"]) assert.equal(R.dglLocOn(h), true, h);
  for (const h of ["#/", "", "#", "#/?x=1"]) assert.equal(R.dglLocOn(h), false, "首頁用頂欄：" + h);
  for (const h of ["#/cpu", "#/arena", "#/journey/play", "#/canju/abc", "#/camp/3", "#/battle/qin/2", "#/quiz", "#/guess", "#/simul", "#/ouyu/zf/1", "#/legend/x", "#/lesson/qin"]) assert.equal(R.dglLocOn(h), false, "對局解題頁：" + h);
  for (const h of ["#/adventure", "#/ship/pz", "#/shelf/1/3", "#/lobby", "#/cup", "#/settings", "#/me", "#/weekly", "#/coop/lobby"]) assert.equal(R.dglLocOn(h), false, "不是人間：" + h);
  assert.equal(R.dglLocOn("#/port", { off: true }), false, "關了體力不放");
  assert.equal(R.dglLocOn("#/port", { travel: true }), false, "千秋穿梭過場（在船上）不放");
  assert.equal(R.dglLocOn("#/journey/play", { bh: true }), false, "黑洞對局不放");
});

test("二十八宿資料：四象各七宿、順序照傳統（角亢氐房心尾箕／斗牛女虛危室壁／奎婁胃昴畢觜參／井鬼柳星張翼軫），每宿有星座", () => {
  assert.equal(R.DGL_XIU.length, 28); assert.equal(R.DGL_XIU_COST, 2);
  deqA(R.DGL_XIANG.map(x => x[0]), ["東方蒼龍", "北方玄武", "西方白虎", "南方朱雀"]);
  assert.equal(R.DGL_XIU.map(x => x[0]).join(""), "角亢氐房心尾箕斗牛女虛危室壁奎婁胃昴畢觜參井鬼柳星張翼軫");
  for (let k = 0; k < 4; k++) deqA(R.DGL_XIU.map((x, i) => [x[1], i]).filter(([q]) => q === k).map(([, i]) => i), [0, 1, 2, 3, 4, 5, 6].map(n => k * 7 + n), "第 " + k + " 象連續七宿");
  for (const x of R.DGL_XIU) { assert.ok(/座$/.test(x[2]), x[0] + " 星座"); assert.ok(x[3] === "" || /。$/.test(x[3]), x[0] + " 補充句") }
  assert.equal(R.dglXiuLine(0), "角宿：東方蒼龍七宿的第一宿（東方），大致在今天的室女座。角宿一是室女座最亮的星。");
  assert.equal(R.dglXiuLine(27), "軫宿：南方朱雀七宿的第七宿（南方），大致在今天的烏鴉座。");
  assert.ok(R.dglXiuLine(20).startsWith("參宿：西方白虎七宿的第七宿（西方），大致在今天的獵戶座。"));
  assert.equal(R.dglXiuLine(99), "");
});

test("點亮一宿：扣 2 星芒、記在 t；星芒不夠說還差幾點、已點亮不再扣；四象點齊、全亮的獎各只給一次", () => {
  const o = { x: 5 };
  let r = R.dglXiuLight(o, 0); assert.equal(r.ok, true); assert.equal(o.x, 3); assert.equal(R.dglXiuHas(o.t, 0), true); assert.equal(r.xiang, -1); assert.equal(r.all, false);
  r = R.dglXiuLight(o, 0); deqA(r, { ok: false, why: "lit" }); assert.equal(o.x, 3, "已點亮不扣");
  r = R.dglXiuLight(o, 1); assert.equal(r.ok, true); assert.equal(o.x, 1);
  r = R.dglXiuLight(o, 2); deqA(r, { ok: false, why: "poor", need: 1 }); assert.equal(o.x, 1); assert.equal(R.dglXiuHas(o.t, 2), false);
  deqA(R.dglXiuLight(o, 28), { ok: false, why: "bad" }); deqA(R.dglXiuLight(o, -1), { ok: false, why: "bad" });
  const p = { x: 20, t: 0 }; const got = [];
  for (let i = 0; i < 7; i++) { const q = R.dglXiuLight(p, i); assert.ok(q.ok); if (q.xiang >= 0) got.push([i, q.xiang]) }
  deqA(got, [[6, 0]], "第七宿點亮時東方蒼龍點齊"); assert.equal(p.x, 6); assert.equal(R.dglXiangDone(p.t, 0), true); assert.equal(R.dglXiangDone(p.t, 1), false); assert.equal(p.tw, 1);
  const all = { x: 20, t: 2 ** 27 - 1, tw: 7 };
  assert.equal(R.dglXiuN(all.t), 27); const z = R.dglXiuLight(all, 27); assert.equal(z.xiang, 3); assert.equal(z.all, true); assert.equal(all.tw, 31); assert.equal(R.dglXiuN(all.t), 28);
  const again = { x: 20, t: 0, tw: 31 }; for (let i = 0; i < 7; i++) assert.equal(R.dglXiuLight(again, i).xiang, -1, "拿過的獎不再給");
  assert.ok(R.dglXiuMask(-5) >= 0); assert.equal(R.dglXiuMask("x"), 0); assert.equal(R.dglXiuHas(2 ** 27, 27), true); assert.equal(R.dglXiuHas(1, 28), false);
  assert.ok(28 * R.DGL_XIU_COST > 20, "一次存不夠點完，要分好幾次解題累積");
});

/* 整個模組丟進 vm（假的 document／store／時間），測接起來的行為 */
function loadFull(st, hash) {
  let T = 1e9; const reg = {}, toasts = [], xp = [];
  const el = tag => { const e = { tag, id: "", style: {}, dataset: {}, children: [], parentNode: null, title: "", innerHTML: "", className: "",
    classList: { add() { }, remove() { }, toggle() { }, contains: () => false }, setAttribute(k, v) { this["a_" + k] = v }, getAttribute(k) { return this["a_" + k] },
    append(c) { this.children.push(c); c.parentNode = this; if (c.id) reg[c.id] = c }, remove() { if (this.parentNode) this.parentNode.children = this.parentNode.children.filter(x => x !== this); this.parentNode = null; if (reg[this.id] === this) delete reg[this.id] },
    querySelector: () => null, querySelectorAll: () => [] }; return e };
  const tb = el("div"); tb.id = "topbar"; reg.topbar = tb; let offAttr = false;
  const doc = { hidden: false, body: el("body"), head: el("head"), documentElement: { hasAttribute: () => offAttr, toggleAttribute: (k, v) => { offAttr = !!v } },
    getElementById: id => reg[id] || null, querySelector: () => null, querySelectorAll: () => [], createElement: el, addEventListener() { } };
  const ctx = { console, Math, JSON, Set, Object, Array, String, Number, isFinite, Date: { now: () => T }, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, clearInterval() { }, requestAnimationFrame: () => 0,
    location: { hash }, document: doc, toast: x => toasts.push(x), vibrate() { }, esc: x => String(x), closeSheet() { }, matchMedia: () => ({ matches: false }),
    store: { get: (k, d) => (k in st ? JSON.parse(JSON.stringify(st[k])) : d), set: (k, v) => { st[k] = JSON.parse(JSON.stringify(v)) } },
    addXP: (n, why, key) => { xp.push([n, why, key]) }, setTop: () => { } };
  ctx.navReplace = h => { ctx.location.hash = h };
  vm.createContext(ctx); vm.runInContext(SRC + "\n;this.DGL=DGL;", ctx, { filename: "07dgl(整個模組)" });
  ctx.toasts = toasts; ctx.xp = xp; ctx.reg = reg; ctx.tb = tb; ctx.offAttr = () => offAttr;
  ctx.ticks = min => { for (let i = 0; i < min * 30; i++) { T += 2000; ctx.dglTick() } };
  return ctx;
}

test("設定關閉體力：在人間待 40 分鐘定軌力不扣、不化墨退場；換頁不擋；修為沒有加成；星芒照給、照樣能點亮星圖", () => {
  const st = { dglOff: true }, c = loadFull(st, "#/port");
  c.ticks(40); assert.equal(c.DGL.s.r, 30); assert.equal(c.DGL.s.due, false); assert.equal(c.DGL.s.out, false);
  c.DGL.s.out = true; c.location.hash = "#/cpu"; assert.equal(c.dglRouteGate(), false, "關了不擋"); assert.equal(c.location.hash, "#/cpu"); c.DGL.s.out = false;
  c.addXP(10, "殘局"); assert.equal(c.xp[0][0], 10, "沒有心定則棋穩加成"); assert.equal(st.dgl.x, 1, "解題照樣得星芒");
  c.addXP(3, "闖關"); assert.equal(st.dgl.x, 2, "主線過關照樣得星芒");
  assert.equal(vm.runInContext("dglSlow()", c), 1, "不走慢"); assert.equal(c.offAttr(), true, "html[data-dgloff]：兩條收起來");
  c.location.hash = "#/port"; c.dglTick(); assert.equal(c.reg.dglLoc, undefined, "地點頁不放兩條");
  assert.ok(!/ checked/.test(c.dglSetRow()), "設定開關顯示關著"); assert.match(c.dglSetRow(), /id="dglSw"/);
  st.dgl.x = 4; const o = c.dglSt(), r = c.dglXiuLight(o, 4); assert.ok(r.ok); assert.equal(o.x, 2, "星圖照樣能點");
});

test("體力開著（預設）：地點頁頂欄放兩條、對局頁和首頁不放；滿格修為 ×1.5；人間 31 分鐘扣到 0 化墨退場，之後進人間的頁被擋回星槎", () => {
  const st = {}, c = loadFull(st, "#/port");
  assert.equal(c.dglUserOff(), false, "預設開著"); assert.match(c.dglSetRow(), / checked/);
  c.addXP(10, "殘局"); assert.equal(c.xp[0][0], 15, "滿格 ×1.5");
  c.dglTick(); assert.ok(c.reg.dglLoc, "渡口頂欄放了 #dglLoc"); assert.equal(c.reg.dglLoc.parentNode, c.tb); assert.match(c.reg.dglLoc["a_aria-label"], /定軌力 \d+／30，星芒 \d+／20/);
  c.location.hash = "#/cpu"; c.dglTick(); assert.equal(c.reg.dglLoc, undefined, "對局頁收起來");
  c.location.hash = "#/"; c.dglLocSync(); assert.equal(c.reg.dglLoc, undefined, "首頁不放（頂欄已有）");
  c.location.hash = "#/guanxing"; c.setTop(); assert.ok(c.reg.dglLoc, "換頁（setTop）就放");
  c.location.hash = "#/port"; c.ticks(31); assert.equal(c.DGL.s.out, true, "化墨退場");
  c.location.hash = "#/cpu"; assert.equal(c.dglRouteGate(), true); assert.equal(c.location.hash, "#/adventure");
});

test("切換開關：兩個方向都回滿、清掉退場記號（關掉前在船上歇息的人不會卡住）；存在設定 dglOff、不是存檔鍵", () => {
  const st = {}, c = loadFull(st, "#/port");
  c.ticks(31); assert.equal(c.DGL.s.out, true);
  c.location.hash = "#/port"; c.dglSetOff(true); assert.equal(st.dglOff, true); deqA(c.DGL.s, { r: 30, out: false, due: false }); assert.equal(c.reg.dglLoc, undefined);
  c.ticks(5); assert.equal(c.DGL.s.r, 30);
  c.dglSetOff(false); assert.equal(st.dglOff, false); deqA(c.DGL.s, { r: 30, out: false, due: false }); assert.ok(c.reg.dglLoc, "打開後地點頁的兩條回來");
  c.ticks(10); assert.equal(R.dglShow(c.DGL.s.r), 20, "打開後照常扣");
  assert.ok(!/"dglOff"/.test(rd(path.join(M, "05b-save.js"))), "dglOff 是設定，不跟存檔走");
});

test("〔原始碼〕接線：設定頁角色分頁呼叫 dglSetRow；觀星臺 gxtSky 開 dglXiuSheet；包一層 setTop 放兩條；角色卡寫到星圖；新字有英文", () => {
  const ST = rd(path.join(M, "05-settings.js")), bot = ST.indexOf('<div data-pane="bot">'), row = ST.indexOf('${typeof dglSetRow==="function"?dglSetRow():""}');
  assert.ok(bot > 0 && row > bot, "在角色分頁"); assert.ok(ST.indexOf('id="botT"') > row, "在顯示設定前面");
  assert.match(ST, /^const XQ_SIZES=(\/\*__SIZES__\*\/null|\{"pre":\d+[^\n]*\});$/m, "XQ_SIZES 那行沒動（開發者電腦是佔位；公開 source/ 是從線上 index.html 切出來、建置時已填入大小的那行）");
  assert.ok(rd(path.join(M, "07gxt-guanxing.js")).includes('gxtSky:()=>{if(typeof dglXiuSheet!=="function"){toast("🌌 "+GXT_OFF);return}gxtFx("sky",()=>dglXiuSheet())}'));   /* 11/16：先播右側星空的短過場（gxtFx），再開星圖 */
  assert.ok(SRC.includes('if(typeof setTop==="function"){const f0=setTop;setTop=function(){const r=f0.apply(this,arguments);try{dglLocSync(null,1)}'), "包一層 setTop");
  assert.ok(SRC.includes("在觀星臺可以點亮二十八宿星圖"), "角色卡的星芒說明");
  const HTML = rd(path.join(ROOT, "xiangqi-db/m.html")), order = [...HTML.matchAll(/\/\/#include m\/([\w-]+\.js)/g)].map(m => m[1]);
  assert.ok(order.indexOf("02-shell.js") < order.indexOf("07dgl-stamina.js") && order.indexOf("07dgl-stamina.js") < order.indexOf("07w8-shichen.js"), "setTop 先包在時辰鐘之前（clkPlace 量到變窄的標題）");
  const I = rd(path.join(M, "07i18n.js")), i = I.indexOf("#I18N-PURE-BEGIN"), j = I.indexOf("/* #I18N-PURE-END */"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(I.slice(I.indexOf("\n", i) + 1, j) + ";this.T=i18nText", ctx);
  for (const s of ["平日體力（定軌力／星芒）", "二十八宿", "二十八宿星圖", "觀星客", "東方蒼龍", "南方朱雀", "已關閉", "星芒從解殘局、主線過關得來。", "解殘局、主線過關，各得 1 點，最多存 20 點。"]) { const t = ctx.T(s); assert.ok(t && !/[㐀-鿿]/.test(t), s + " → " + t) }
});

/* ---------- ⑤ 11/14 角色卡視覺化（開發者採用 ChatGPT 設計稿 story/chatgpt_app/回覆_角色卡設計_1114.md）：五種狀態、退場倒數、圖示對照表、規則字從常數組 ---------- */
test("角色卡狀態：滿格 ×1.5、一半以上 ×1.2、一半以下沒加成、≤5 快用完、用完（due）、化墨退場中、設定關掉", () => {
  const S = (r, o) => Object.assign({ r, out: false, due: false }, o || {});
  assert.equal(R.dglCardSt(S(30)), "full"); assert.equal(R.dglCardSt(S(29.5)), "full", "畫面顯示 30 就寫滿格（跟看到的數字一致）"); assert.equal(R.dglCardSt(S(14.5)), "half", "畫面顯示 15");
  assert.equal(R.dglCardSt(S(15)), "half"); assert.equal(R.dglCardSt(S(14)), "none"); assert.equal(R.dglCardSt(S(6)), "none");
  assert.equal(R.dglCardSt(S(5)), "low"); assert.equal(R.dglCardSt(S(5.5)), "none", "畫面上是 6"); assert.equal(R.dglCardSt(S(0.2)), "low");
  assert.equal(R.dglCardSt(S(0, { due: true })), "due"); assert.equal(R.dglCardSt(S(6, { out: true })), "out");
  assert.equal(R.dglCardSt(S(30), true), "off"); assert.equal(R.dglCardSt(S(0, { out: true }), true), "off", "關掉優先");
  assert.equal(R.DGL_CD_LOW, 5); assert.equal(R.DGL_XM_GET, 1);
});

test("化墨退場倒數：(DGL_BACK − 目前值) ÷ DGL_SHIP 無條件進位；回到 15 以上是 0；跟真的在星槎上歇的分鐘數一樣", () => {
  assert.equal(R.dglBackMin(0), 5); assert.equal(R.dglBackMin(6), 3); assert.equal(R.dglBackMin(12), 1); assert.equal(R.dglBackMin(11.9), 2);
  assert.equal(R.dglBackMin(15), 0); assert.equal(R.dglBackMin(20), 0); assert.equal(R.dglBackMin("x"), 5);
  for (const r0 of [0, 3.5, 6, 11]) { const s = R.dglNew(); s.r = r0; R.dglExit(s); let m = 0; while (s.out && m < 99) { R.dglStep(s, MIN, "ship"); m++ } assert.equal(m, R.dglBackMin(r0), "從 " + r0 + " 歇到能下船") }
});

test("圖示對照表 DGL_ICO：角色卡用到的圖示都在表裡（之後換水墨圖示只改這裡）；卡片程式不直接寫 emoji；沒有寫死的規則數字", () => {
  for (const k of ["red", "blue", "land", "ship", "game", "puz", "bh", "zero", "flag", "main", "xiu", "xm", "hp", "sp", "atk", "off"]) assert.ok(R.DGL_ICO[k], k);
  const i = SRC.indexOf("const dglIc="), j = SRC.indexOf("/* ---------- 計時與事件"), card = SRC.slice(i, j);
  assert.ok(i > 0 && j > i);
  const used = [...card.matchAll(/dglIc\("(\w+)"\)/g)].map(m => m[1]); assert.ok(used.length >= 6);   /* 11/14 極簡版：卡片只剩名稱圖示，黑洞那塊搬到 dglMeCard */
  for (const k of used) assert.ok(R.DGL_ICO[k], "對照表沒有這個圖示：" + k);
  const emo = card.replace(/"🙂 我的角色"|🙂 我的角色頁|→ 👘 換造型/g, "").match(/\p{Extended_Pictographic}/gu);   /* 11/14：標題固定「🙂 我的角色」；稱號的 🏅 改走 DGL_ICO.ttl */
  assert.equal(emo, null, "卡片程式直接寫了 emoji：" + emo);
  assert.ok(!/最多帶 10|黑洞對局裡不扣定軌力/.test(SRC), "不寫舊規則（星芒最多補到靈力上限；11/14 起黑洞照人間扣）");
  assert.ok(card.includes("${dglU(DGL_BH_DAY,mx)}") && card.includes("${Math.round(DGL_MAX/DGL_DRAIN)}") && card.includes("${dglU(DGL_BACK,mx)}"), "細則：黑洞過關一天最多回多少、大約幾分鐘用完、回到多少能下船，數字照常數組再換到陪你走那一位的尺（11/16）");
  assert.ok(!/[>（ ]\+?(20|30|15|3|2)(<|／| 點)/.test(card.replace(/\$\{[^}]*\}/g, "")), "規則數字要從 DGL_* 組");
});

function cardHTML(set) {
  const st = {}, c = loadFull(st, "#/port"); let html = "";
  c.sheet = (t, fn) => { const b = { scrollTop: 0, set innerHTML(v) { html = v }, get innerHTML() { return html }, querySelector: () => ({}), querySelectorAll: () => [] }; fn(b) };
  c.meName = () => "田飛燕"; if (set) set(c, st); c.dglCard(); return html;
}
test("角色卡畫面（整個模組＋假的 sheet）：11/14 極簡版——每塊只有名稱、數字、一條、一句話；刻度、膠囊、來源→用途、加成都收進「？」；黑洞那塊不在卡上", () => {
  const full = cardHTML();
  /* 11/15 經典狀態欄：平常的說明句收進底下一顆「？ 細則」（一塊 dgl-kmore，紅血、藍血、攻防三組），卡上只留狀態警告 */
  for (const k of ["<li>下船後會慢慢用掉，回星槎就補回來。</li>", "<li>解殘局、過主線章節就會得到。</li>", 'data-k="full:30"', 'data-q="all"', 'aria-controls="dglQ_all"', 'aria-expanded="false"', "width:100.0%",
    "<span>現在滿格，下棋、解題得到的修為</span> ×1.5", "<span>已點亮</span> 0／28", '<p class="dgl-kmh">體力・定軌力</p>', '<p class="dgl-kmh">靈力・星芒</p>']) assert.ok(full.includes(k), "滿格少了：" + k);
  for (const k of ["dgl-kcp", "dgl-ktk", "dgl-kmk", "dgl-kflow", "dgl-kbd", "黑洞裡的你", "人間黑洞會用", "歸零會化墨退場", '<p class="dgl-kl">']) assert.ok(!full.includes(k), "極簡版不該有：" + k);
  assert.equal((full.match(/class="dgl-kmore"[^>]* hidden/g) || []).length, 1, "細則預設收著（只有一塊）");
  assert.ok(full.includes("<li><span>在人間（下船以後）大約</span> 30 <span>分鐘用完；在星槎上不會少。</span></li>") && !full.includes("黑洞對局裡不扣定軌力。") && full.includes("最多補到靈力上限。"), "細則照實（11/14 刪掉「黑洞對局裡不扣定軌力」；11/16 改寫成大約幾分鐘用完）");
  assert.ok(full.includes("<li><span>黑洞過關回</span> 20 <span>點，一天最多回</span> 20 <span>點。</span></li>") && full.includes("定軌力用完時，黑洞入口也會關。"), "11/14 細則：黑洞每日上限（跟過關回多少併成一條）、入口會關");
  assert.ok(full.includes("<li>離開 App 的時間也會慢慢回，跟在星槎上歇息一樣。</li>") && !full.includes("關掉 App 再打開就回滿") && full.includes("<span>分鐘回到</span> 15 <span>點，就能再下船。</span>"), "11/16：不再寫「關掉 App 再打開就回滿」");
  assert.ok(!full.includes("體力上限跟陪你走的那一位"), "沒有旅程、黑洞模組沒載入時上限照舊 30，不多寫那一句");
  const half = cardHTML(c => { c.DGL.s.r = 20 }); assert.ok(half.includes("<span>現在一半以上，下棋、解題得到的修為</span> ×1.2") && half.includes("width:66.7%"));
  const none = cardHTML(c => { c.DGL.s.r = 10 }); assert.ok(none.includes("<span>到一半以上，下棋、解題得到的修為</span> ×1.2") && none.includes("下船後會慢慢用掉") && !none.includes("dgl-kwarn"));
  const low = cardHTML(c => { c.DGL.s.r = 4 }); assert.ok(low.includes("<span>快用完了，回星槎歇一下吧</span>") && low.includes("dgl-kwarn"));
  const due = cardHTML(c => { c.DGL.s.r = 0; c.DGL.s.due = true }); assert.ok(due.includes("<span>這盤下完，就回星槎歇息</span>"));
  const out = cardHTML(c => { c.DGL.s.r = 6; c.DGL.s.out = true });
  for (const k of ['<span>化墨退場中・</span><b class="dgl-knum">3</b> <span>分鐘後可以下船</span>', 'data-k="out:3:30"', "dgl-khero out", "width:20.0%"]) assert.ok(out.includes(k), "退場中少了：" + k);
  assert.equal((out.match(/<p class="dgl-kl">/g) || []).length, 1, "退場中卡上只有一句：幾分鐘後可以下船");
  assert.ok(SRC.includes("function dglMeCard(") && /if\(typeof dglMeCard==="function"\)\{const x=dglMeCard\(\);if\(x\)pad\.append\(x\)\}/.test(fs.readFileSync(path.join(M, "07-legend.js"), "utf8")), "黑洞三數字搬到我的角色頁（Me 呼叫 dglMeCard）");
  const off = cardHTML((c, st) => { st.dglOff = true });
  assert.ok(off.includes("平日體力已關閉") && off.includes("不扣、不退場、無加成") && !off.includes("dgl-kbar") && off.includes('data-k="off:30"'), "關掉：兩條都不畫、只放提示");
  assert.ok(off.includes("想再打開：設定 → 👘 換造型，裡面的「平日體力」。"));
});

/* ---------- ⑥ 11/14 開發者「修為／攻擊力／防禦／紅血／藍血」：角色卡改成五項 ---------- */
function realBHTD() { const x = { console, Math, JSON }; vm.createContext(x); vm.runInContext(rd(path.join(M, "07bht-td.js")).split("/* ================= ② 畫面 ================= */")[0] + "\n;this.B=BHTD;", x); return x.B }
const withBH = (c, ch, L) => { c.BHTD = realBHTD(); c.myChar = () => ch; c.xpInfo = () => ({ L }); c.meImg = () => ""; c.rankInfo = () => ({ name: "七品" }) };
function i18nT() { const I = rd(path.join(M, "07i18n.js")), x = {}; vm.createContext(x); vm.runInContext(I.slice(I.indexOf("\n", I.indexOf("#I18N-PURE-BEGIN")) + 1, I.indexOf("/* #I18N-PURE-END */")) + ";this.T=i18nText", x); return x.T }
test("角色卡五項：頭部名字＋修為 Lv（大字）、紅血、藍血（卡面不寫定軌力、星芒，細則裡才有）、攻擊力與防禦兩格、我的角色頁；讀屏照順序念「體力 30／30」", () => {
  const h = cardHTML(c => withBH(c, "x_spiritgirl", 1));
  /* 11/15 經典狀態欄：頭部（名字、修為、經驗條）→ 面板（紅血、藍血兩條緊貼，再一排攻防）→ 底下「？ 細則」＋我的角色頁 → 收著的細則 */
  /* 11/15 晚開發者「根據 RPG 熱門遊戲重新設計」「精簡／美化／排版，不要出現定軌力和星芒（細節再提即可）」：立繪放大加框、「？」搬到頭部右上角、體力靈力拿掉小字、底下只留主要按鈕 */
  const order = ['class="dgl-khero', 'class="dgl-kfig"', "<b>田飛燕</b>", '<span class="dgl-klv"><span>修為</span> Lv 1</span>', 'class="dgl-kq dgl-kqt" data-q="all"', 'class="dgl-kpan', '<div class="dgl-krow dgl-k2">', '<span>體力</span></span>', '<span class="dgl-kv" data-dgl="r">30／30</span>',
    '<span>靈力</span></span>', '<span class="dgl-kv" data-dgl="x">0／20</span>', '<span>攻擊力</span></small><b>108</b>', '<span>防禦力</span></small><b>109</b>',
    "</section>", "🙂 我的角色頁", "<li>修為越高，攻擊力和防禦力越強（黑洞裡用）。</li>"];
  let at = -1; for (const k of order) { const i = h.indexOf(k); assert.ok(i > at, "順序或內容不對：" + k); at = i }
  assert.ok(h.includes('data-q="all"') && h.includes("dgl-kbar dgl-r") && h.includes("dgl-kbar dgl-b"), "紅條、藍條、一顆「？ 細則」");
  /* 11/15 開發者「角色卡：天賦／體力／靈力／攻擊／防禦／技能」：天賦、技能都可點；11/15 晚改成跟攻擊力、防禦力排成四格（天賦、技能兩格並排在攻防下面） */
  const ts = cardHTML(c => { withBH(c, "x_spiritgirl", 6); c.bhtdTal = () => {}; c.bhtdDust = () => ({ t: ["a", "b"] }) });
  let at2 = -1; for (const k of ["<span>體力</span>", "<span>靈力</span>", "<span>攻擊力</span>", "<span>防禦力</span>", '<div class="dgl-kts">', 'data-go="tal"', "<span>已點亮</span> 2／", 'data-go="sk"', "<span>已學會</span> 2／5"]) { const i = ts.indexOf(k); assert.ok(i > at2, "六項順序或內容不對：" + k); at2 = i }
  /* 卡面（收著的細則以前）不出現「定軌力」「星芒」；這兩個詞留在細則裡 */
  { const face = h.slice(0, h.indexOf('id="dglQ_all"')), more = h.slice(h.indexOf('id="dglQ_all"')); assert.ok(face.length > 200 && !/定軌力|星芒/.test(face), "卡面不寫定軌力、星芒"); assert.ok(more.includes("體力・定軌力") && more.includes("靈力・星芒"), "細則裡才提"); assert.ok(!h.includes("dgl-ksub") && !h.includes("dgl-kqb"), "小字和底下那顆「？ 細則」都拿掉了"); assert.equal(h.split('data-q="all"').length, 2, "細則鈕只有頭部那一顆") }
  assert.ok(!h.includes('data-go="tal"'), "黑洞天賦程式沒載入：天賦、技能兩列不畫");
  const xh = cardHTML(c => { withBH(c, "x_spiritgirl", 4); c.xpInfo = () => ({ L: 4, rest: 43, need: 140 }) }); assert.ok(xh.includes("width:30.7%") && xh.includes("<span>距離下一級</span> 43／140"), "頭部經驗條：43／140");
  const t = h.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
  assert.ok(t.includes("體力 30／30") && t.includes("靈力 0／20") && t.includes("攻擊力 108") && t.includes("防禦力 109"), "去掉標籤後念得出來：" + t.slice(0, 200));
  const dk = h.slice(h.indexOf('class="dgl-kad"')); assert.ok(!/×/.test(dk.slice(0, dk.indexOf("dgl-kme"))), "攻擊力、防禦力那一列和說明句不出現倍數 ×");
  assert.ok(SRC.includes('sheet("🙂 我的角色",') && !SRC.includes('sheet("🙂 "+(nm'), "11/14 選 B：卡片標題固定「我的角色」，名字只在頭部出現一次");
  assert.equal(h.split("田飛燕").length - 1, 1, "卡片內容裡名字只出現一次");
  const tie = cardHTML(c => withBH(c, "x_shi", 100)); assert.ok(tie.includes("<b>130</b>") && tie.includes("<b>139</b>"), "鐵連城 Lv100：攻擊 ×1.30→130、防禦 ×0.72→100÷0.72＝138.9→139");
  assert.ok(!cardHTML().includes("dgl-kad"), "黑洞模組沒載入：攻擊力、防禦那一列不畫");
  assert.ok(!cardHTML(c => { c.BHTD = realBHTD(); c.myChar = () => "" }).includes("dgl-kad"), "還沒選角色也不畫");
  const out = cardHTML(c => { withBH(c, "x_bing", 50); c.DGL.s.r = 6; c.DGL.s.out = true });
  assert.ok(out.includes("dgl-khero out") && out.includes('<span>化墨退場中・</span><b class="dgl-knum">3</b>') && out.includes("<span>體力</span>") && out.includes("dgl-kad"), "化墨退場中：紅血那塊照退場倒數，五項都在");
  const low = cardHTML(c => { withBH(c, "x_bing", 50); c.DGL.s.r = 4 }); assert.ok(low.includes("dgl-kwarn") && low.includes("<span>快用完了，回星槎歇一下吧</span>"));
  const off = cardHTML((c, st) => { withBH(c, "x_bing", 50); st.dglOff = true });
  assert.ok(off.includes("平日體力已關閉") && !off.includes("dgl-kbar") && !off.includes("<span>體力</span>") && off.includes("<span>靈力</span>") && off.includes("dgl-kad"), "關掉平日體力：紅血那塊只寫已關閉、藍血沒有條，攻擊力防禦照畫");
  const T = i18nT(); for (const s of ["體力", "靈力", "體力・定軌力", "靈力・星芒", "細則", "距離下一級", "攻擊力", "防禦力", "修為越高，攻擊力和防禦力越強（黑洞裡用）", "修為越高，五項越強；身上的星芒進黑洞會變成開局靈力（1 點換 10 靈）。", "每回合回靈"]) { const e = T(s); assert.ok(e && !/[㐀-鿿]/.test(e), s + " → " + e) }
});
test("我的角色頁「黑洞裡的你」：元氣、靈力上限、每回合回靈、攻擊力、防禦力五格（上 3 下 2）", () => {
  const st = {}, c = loadFull(st, "#/me"); withBH(c, "x_shi", 100); c.bhtdL = () => 100; c.gxtOpen = () => true;
  const d = c.dglMeCard(); assert.ok(d, "要畫出來"); const h = d.innerHTML;
  for (const k of ["<span>元氣</span>", "<span>靈力上限</span></small><b>60</b>", "<span>每回合回靈</span></small><b>12</b>", "<span>攻擊力</span></small><b>130</b>", "<span>防禦力</span></small><b>139</b>", "修為越高，五項越強"]) assert.ok(h.includes(k), "少了：" + k);
  assert.ok(!/×/.test(h), "黑洞卡不出現倍數 ×");
  assert.ok(SRC.includes(".dgl-me .dgl-kst{grid-template-columns:repeat(6,1fr)}.dgl-me .dgl-kst>span{grid-column:span 2}.dgl-me .dgl-kst>span:nth-child(n+4){grid-column:span 3}"), "五格排成上 3 下 2");
});

/* ---------- ⑧ 11/16 體力統一（開發者：「這樣人間體力不一樣 玩家會很困惑 而且人間體力歸0後 也只會回到星槎上 根本不會有什麼懲罰」；Gemini 討論 story/gemini_app/159，選單四項）----------
   ① 上限＝陪你走那一位在黑洞裡的體力，內部照舊 0～30 算、畫面換尺 ② 滿格 ×1.5、一半以上 ×1.2 ③ 記住體力，離開的時間照星槎上的速度回 ④ 卡冊寫「靈力上限」（test-pty-stats-1116.js） */
test("畫面上的數字換到陪你走那一位的尺：現在幾點無條件進位（跟原本一樣）、規則裡的量四捨五入至少 1；沒給尺＝照舊 30", () => {
  assert.deepEqual([R.dglDisp(30, 57), R.dglDisp(29.5, 57), R.dglDisp(15, 57), R.dglDisp(0.01, 57), R.dglDisp(0, 57), R.dglDisp(40, 57)], [57, 57, 29, 1, 0, 57]);
  assert.deepEqual([R.dglDisp(29.5), R.dglDisp(29.5, 30), R.dglDisp(14.2, 0)], [30, 30, 15], "沒給尺、尺就是 30：跟 dglShow 一樣");
  assert.deepEqual([R.dglU(15, 57), R.dglU(2, 57), R.dglU(20, 57), R.dglU(1, 100), R.dglU(0.3, 57), R.dglU(0, 57)], [29, 4, 38, 3, 1, 0]);
  assert.deepEqual([R.dglU(15), R.dglU(2, 30)], [15, 2]);
  assert.deepEqual([R.dglXpMul(29.5, 57), R.dglXpMul(29.4, 57), R.dglXpMul(14.9, 57), R.dglXpMul(14, 57)], [1.5, 1.2, 1.2, 1], "加成照那把尺上看到的數字：顯示 57／57 才是滿格、顯示 29 以上是一半以上");
  assert.equal(R.dglCardSt({ r: 29.5, out: false, due: false }, false, 57), "full"); assert.equal(R.dglCardSt({ r: 29.4, out: false, due: false }, false, 57), "half");
  assert.deepEqual(J(R.dglXpBonus(10, 30, 0, 57)), { n: 15, fx: 0 });
});

test("重開 App、切回前景：離開的時間照星槎上的速度回（每分鐘 3）；沒有紀錄＝滿的；當時用完了、還沒回到 15 就照舊歇著；時間倒退不回也不扣", () => {
  const T0 = 5e9;
  deqA(R.dglWake(null, T0), { r: 30, out: false, due: false }); deqA(R.dglWake({ x: 3 }, T0), { r: 30, out: false, due: false }, "只有星芒、沒有體力紀錄（舊存檔）＝滿的");
  deqA(R.dglWake({ r: "x", ra: T0 }, T0), { r: 30, out: false, due: false });
  deqA(R.dglWake({ r: 10, ra: T0, ro: 0 }, T0 + 2 * MIN), { r: 16, out: false, due: false }, "離開 2 分鐘回 6");
  deqA(R.dglWake({ r: 10, ra: T0, ro: 0 }, T0), { r: 10, out: false, due: false }, "滑掉馬上重開：不回滿");
  deqA(R.dglWake({ r: 0, ra: T0, ro: 1 }, T0 + 2 * MIN), { r: 6, out: true, due: false }, "用完了才離開 2 分鐘：還在歇");
  deqA(R.dglWake({ r: 0, ra: T0, ro: 1 }, T0 + 5 * MIN), { r: 15, out: false, due: false }, "離開 5 分鐘：回到 15，可以下船");
  deqA(R.dglWake({ r: 0, ra: T0, ro: 0 }, T0 + MIN), { r: 3, out: true, due: false }, "存的時候剛好是 0 也算用完了");
  deqA(R.dglWake({ r: 3, ra: T0, ro: 1 }, T0 + 60 * MIN), { r: 30, out: false, due: false }, "離開很久：滿的，不超過上限");
  deqA(R.dglWake({ r: 12, ra: T0, ro: 0 }, T0 - 10 * MIN), { r: 12, out: false, due: false }, "手機時間被往回調：不回也不扣");
  deqA(R.dglWake({ r: 99, ra: T0, ro: 0 }, T0), { r: 30, out: false, due: false }, "存壞的數字夾在 0～30");
});

const withHero = c => { c.BHTD = { CH: { x_a: {} }, stats: () => ({ hp: 57 }), atkPt: () => 100, defPt: () => 100, SK: [], TAL: [] }; c.ptyLv = () => 3; c.myChar = () => "x_a" };
test("整個模組：有陪你走的角色時，畫面寫「定軌力 n／57」、節奏不變（15 分鐘剩一半）、加成照新倍率；沒有就照舊 30", () => {
  const st = {}, c = loadFull(st, "#/port"); assert.equal(c.dglMx(), 30, "沒有旅程、黑洞模組沒載入＝30");
  withHero(c); assert.equal(c.dglMx(), 57);
  c.dglTick(); assert.match(c.reg.dglLoc["a_aria-label"], /定軌力 57／57，星芒 \d+／20/);
  c.ticks(15); assert.ok(Math.abs(c.DGL.s.r - 15) < 0.2, "內部照舊每分鐘扣 1：15 分鐘剩一半"); assert.match(c.reg.dglLoc["a_aria-label"], /定軌力 29／57/);
  c.addXP(10, "殘局"); assert.equal(c.xp[0][0], 12, "一半以上 ×1.2");
  c.ticks(17); assert.equal(c.DGL.s.out, true, "大約 30 分鐘用完、化墨退場（解題回的那一點多撐兩分鐘）");
  c.myChar = () => "x_none"; assert.equal(c.dglMx(), 30, "黑洞資料裡沒有這位＝30");
});

test("整個模組：體力記在 store \"dgl\"（不蓋掉星芒）；重開接著上次的值、照離開時間回；用完了離開，回來還沒回到一半就還在星槎歇", () => {
  const st = { dgl: { x: 7, t: 3 } }, c = loadFull(st, "#/port"); assert.equal(c.DGL.s.r, 30, "舊存檔沒有體力紀錄＝滿的");
  c.ticks(10); assert.ok(Math.abs(st.dgl.r - 20) < 0.6, "每 15 秒記一次：" + st.dgl.r); assert.ok(st.dgl.ra > 1e9); assert.equal(st.dgl.ro, 0); assert.equal(st.dgl.x, 7); assert.equal(st.dgl.t, 3);
  const st2 = { dgl: Object.assign({}, st.dgl, { r: 20, ra: 1e9 }) }; assert.equal(loadFull(st2, "#/port").DGL.s.r, 20, "滑掉馬上重開：接著 20，不回滿");
  const st3 = { dgl: Object.assign({}, st.dgl, { r: 20, ra: 1e9 - 2 * MIN }) }; assert.equal(loadFull(st3, "#/port").DGL.s.r, 26, "離開 2 分鐘：回 6");
  c.ticks(22); assert.equal(c.DGL.s.out, true); assert.equal(st.dgl.ro, 1, "退場的當下就記");
  const st4 = { dgl: Object.assign({}, st.dgl, { r: 0, ra: 1e9 - MIN }) }, c4 = loadFull(st4, "#/port"); assert.equal(c4.DGL.s.out, true);
  c4.location.hash = "#/cpu"; assert.equal(c4.dglRouteGate(), true, "重開後照舊擋回星槎"); assert.equal(c4.location.hash, "#/adventure");
  const st5 = { dgl: Object.assign({}, st.dgl, { r: 0, ra: 1e9 - 6 * MIN }) }; assert.equal(loadFull(st5, "#/port").DGL.s.out, false, "離開 6 分鐘：可以下船了");
});

test("整個模組：設定關掉平日體力＝不留體力紀錄（星芒留著）；再打開從滿格記起", () => {
  const st = { dgl: { x: 4 } }, c = loadFull(st, "#/port"); c.ticks(5); assert.ok(st.dgl.r < 26);
  c.dglSetOff(true); assert.ok(!("r" in st.dgl) && !("ra" in st.dgl) && !("ro" in st.dgl)); assert.equal(st.dgl.x, 4);
  c.ticks(5); assert.ok(!("r" in st.dgl), "關著的時候不記");
  c.dglSetOff(false); assert.equal(st.dgl.r, 30); assert.equal(st.dgl.x, 4);
});

test("角色卡：有陪你走的角色時，紅條寫「n／57」、細則多一句上限跟誰一樣、規則裡的量都換到 57 那把尺；不再寫「關掉 App 再打開就回滿」", () => {
  const h = cardHTML(c => { withHero(c); c.DGL.s.r = 20 });
  for (const k of ['<span class="dgl-kv" data-dgl="r">38／57</span>', "width:66.7%", 'data-k="half:57"', "<li><span>體力上限跟陪你走的那一位在黑洞裡的體力一樣，現在是</span> 57<span>；換人陪你走、升級都會跟著變。</span></li>",
    "<li><span>下完一盤棋、解完一題，各回</span> 4 <span>點。</span></li>", "<li><span>黑洞過關回</span> 38 <span>點，一天最多回</span> 38 <span>點。</span></li>", "<span>分鐘回到</span> 29 <span>點，就能再下船。</span>", "<span>現在一半以上，下棋、解題得到的修為</span> ×1.2"]) assert.ok(h.includes(k), "少了：" + k);
  assert.ok(!h.includes("關掉 App 再打開就回滿"));
});

test("〔原始碼〕體力統一的接線：開 App 接著上次的體力；背景回來補回；每 15 秒與離開時記；修為加成照那把尺；新字有英文", () => {
  assert.ok(SRC.includes('try{if(DGL_ON)DGL.s=dglWake(store.get("dgl",null),Date.now())}catch(e){}'));
  assert.ok(SRC.includes('if(document.hidden){DGL.hid=now;dglKeep()}else{if(DGL.hid&&dglLive()){const ev=dglStep(DGL.s,now-DGL.hid,"ship")'), "切到背景記時間，回來把那段時間照星槎上的速度補回");
  assert.ok(SRC.includes('addEventListener("pagehide",()=>{dglKeep()})') && SRC.includes("if(now-DGL.kt>15e3||ev.length||w)dglKeep();"));
  assert.ok(SRC.includes("const B=dglXpBonus(n,DGL.s.r,DGL.fx,dglMx());"));
  assert.ok(/function dglMx\(\)\{try\{const c=dglName\(\);[^\n]*BHTD\.stats\(c,ptyLv\(c\)\)\.hp/.test(SRC), "上限＝陪你走那一位（myChar）照自己等級的黑洞體力");
  const I = rd(path.join(M, "07i18n.js")), i = I.indexOf("#I18N-PURE-BEGIN"), j = I.indexOf("/* #I18N-PURE-END */"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(I.slice(I.indexOf("\n", i) + 1, j) + ";this.T=i18nText", ctx);
  for (const s of ["體力上限跟陪你走的那一位在黑洞裡的體力一樣，現在是", "；換人陪你走、升級都會跟著變。", "在人間（下船以後）大約", "分鐘用完；在星槎上不會少。", "下完一盤棋、解完一題，各回", "點。", "黑洞過關回", "點，一天最多回",
    "離開 App 的時間也會慢慢回，跟在星槎上歇息一樣。", "用完了會化墨退場，回星槎歇息：大約", "分鐘回到", "點，就能再下船。", "靈力上限", "在星槎上歇息：大約 5 分鐘回到 29，就能再下船", "在星槎上歇息，回到 29 就能再下船。", "✨ 定軌力回到 29，可以下船了。",
    "🌫 定軌力耗盡：在星槎上歇到 29 才能再下船", "🌫 定軌力 12／57：在星槎上歇到 29 才能再下船"]) { const t = ctx.T(s); assert.ok(t && !/[㐀-鿿]/.test(t), s + " → " + t) }
});
