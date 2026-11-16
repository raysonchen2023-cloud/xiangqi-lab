// 開發者 11/16：西市四攤開張（m/07xsm-ximarket.js；文案 xiangqi-db/story/西市文案定稿草案_1113.md 第一節第 5、6 項，第五節第 7、8、9、17 項）。
// 不開瀏覽器：模組丟進 vm，用假的 store／ptyHas／addXP／bgmForce 實際跑——七星來訪只挑已加入、同一天同一位；找棋子每天一顆、找到給 10、湊齊給 50、同一顆不重複給；
// 聽曲只收停靠過的朝代、7 首全收、走 01-board 的 BGM；櫃坊的禮；存檔鍵 xsmStall 在 JOURNEY_KEYS。
// 用法 node --test xiangqi-lab/tools/test-xsm-stalls-1116.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = p => fs.readFileSync(path.join(ROOT, "xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC = M("m/07xsm-ximarket.js");
const J = x => JSON.parse(JSON.stringify(x));
const ORDER = ["x_swordboy", "x_miaogirl", "x_shuai", "x_shi", "x_spiritgirl", "x_bing", "x_martialgirl"];
const BGM_F = path.join(ROOT, "xiangqi-lab", "site", "data", "bgm", "index.json"), BGM_IX = fs.existsSync(BGM_F) ? JSON.parse(fs.readFileSync(BGM_F, "utf8")) : null;   /* 公開副本沒有配樂（只在 CDN）：用到配樂檔的項目略過 */

/* 載入模組：st＝假存檔；mem＝已加入的夥伴；look＝陪在身邊的那位（myChar） */
function load(o) {
  o = o || {};
  const st = Object.assign({}, o.st || {}), log = { xp: [], toast: [], force: [] }, ev = {};
  const g = {
    setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, Math, Object, String, JSON, Date,
    addEventListener: (k, f) => { (ev[k] = ev[k] || []).push(f) },
    store: { get: (k, d) => (k in st ? J(st[k]) : d), set: (k, v) => { st[k] = J(v) } },
    localDay: () => g._day, _day: o.day || "2026-11-16",
    addXP: (n, why, key) => { if (key) { const K = st.xpKeys || {}; if (K[key]) return; K[key] = 1; st.xpKeys = K } log.xp.push([n, why, key]) },
    toast: m => log.toast.push(m), vibrate: () => { },
    location: { hash: o.hash || "#/ximarket" },
  };
  if (o.mem) { g.ptyHas = c => o.mem.includes(c); g.PTY = { ORDER } }
  if (o.look !== undefined) g.myChar = () => o.look;
  if (o.bgm) { g.BGM = { force: null }; g.bgmForce = f => { f = f || null; if (g.BGM.force === f) return; g.BGM.force = f; log.force.push(f) } }
  if (o.clk !== undefined) g.clkIdx = () => o.clk;
  Object.assign(g, o.g || {});
  const ctx = vm.createContext(g);
  vm.runInContext(SRC, ctx);
  for (const n of ["xsmSpots", "xsmHideOf", "xsmNear", "xsmFindNorm", "xsmPieceOf", "xsmMuEras", "xsmMuList", "xsmHotGift", "xsmBgmOk"]) vm.runInContext(`this.${n}=${n};`, ctx);   // const 宣告的不會掛在全域物件上
  ctx._st = st; ctx._log = log; ctx._ev = ev;
  return ctx;
}
const R = (c, s) => vm.runInContext(s, c);
const days = (n, from) => { const o = [], d = new Date(from || "2026-11-01T12:00:00"); for (let i = 0; i < n; i++) { o.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")); d.setDate(d.getDate() + 1) } return o };

test("七星來訪：只挑已加入的夥伴，不挑陪在身邊的那位；只有自己一個＝沒人來；沒有 07pty＝沒人來", () => {
  const mem = ["x_swordboy", "x_miaogirl", "x_shuai", "x_shi"];
  const c = load({ mem, look: "x_swordboy" }), seen = new Set();
  for (const d of days(60)) { c._day = d; const w = c.xsmVisitWho(); assert.ok(mem.includes(w) && w !== "x_swordboy", `${d}：${w} 要是已加入、不是自己`); seen.add(w) }
  assert.ok(seen.size >= 2, "兩個月裡不會每天都同一位：" + [...seen]);
  assert.equal(load({ mem: ["x_swordboy"], look: "x_swordboy" }).xsmVisitWho(), null, "只有齊轍、又是陪在身邊的那位：今天很清靜");
  assert.equal(load({ mem: [], look: "" }).xsmVisitWho(), null, "沒有旅程（ptyHas 全 false）");
  assert.equal(load({ look: "x_swordboy" }).xsmVisitWho(), null, "沒有 07pty（ptyHas 不存在）不亂挑");
  /* 招呼句照定稿：每位都有主句、備用；雷借花主句分日夜 */
  const V7 = J(R(c, "XSM_V7"));
  assert.deepEqual(Object.keys(V7).sort(), ORDER.slice().sort(), "七位都有西市招呼");
  const dm = days(30).find(d => c.xsmHash("x_martialgirl" + d) % 2 === 0), da = days(30).find(d => c.xsmHash("x_martialgirl" + d) % 2 === 1);
  assert.equal(c.xsmVisitLine("x_martialgirl", dm, false), V7.x_martialgirl[0][0], "雷借花主句：夜裡說燈");
  assert.equal(c.xsmVisitLine("x_martialgirl", dm, true), V7.x_martialgirl[0][1], "雷借花主句：白天說攤子");
  assert.equal(c.xsmVisitLine("x_martialgirl", da, true), V7.x_martialgirl[1], "照日期輪到備用句");
  for (const k of ORDER) for (const s of [].concat(...V7[k])) assert.ok(!/妳/.test(s), k + " 不寫死「妳」，用 {你}");
});

test("七星來訪：同一天固定同一位（存檔記下來；當天多一位夥伴加入也不換人），隔天照日期重挑", () => {
  const mem = ["x_swordboy", "x_miaogirl", "x_shuai"];
  const c = load({ mem, look: "x_swordboy", day: "2026-11-16" });
  const a = c.xsmVisitWho(), b = c.xsmVisitWho();
  assert.equal(a, b, "同一天問兩次同一位");
  assert.deepEqual(J(c._st.xsmStall.v), { d: "2026-11-16", c: a }, "記在 xsmStall.v");
  mem.push("x_shi", "x_spiritgirl", "x_bing"); assert.equal(c.xsmVisitWho(), a, "當天又有人加入，今天來的人不換");
  const c2 = load({ mem: mem.slice(), look: "x_swordboy", day: "2026-11-16" }); assert.equal(c2.xsmVisitPick("2026-11-16", mem, "x_swordboy", null), c2.xsmVisitPick("2026-11-16", mem, "x_swordboy", null), "照日期算，算幾次都一樣");
  /* 今天來的人如果剛好變成陪在身邊的那位，就重挑 */
  assert.notEqual(c.xsmVisitPick("2026-11-16", mem, a, { d: "2026-11-16", c: a }), a, "變成首頁小人就不來找自己");
});

test("七星來訪：見到了記今天見過，也算進 07j visit7（來過次數＋1、今天來過）；同一天不重算", () => {
  const c = load({ mem: ["x_swordboy", "x_miaogirl"], look: "x_swordboy", st: { visit7: { n: { x_miaogirl: 2 }, day: {}, seen: {}, done: {} } } });
  c.xsmVisitMet("x_miaogirl", "2026-11-16"); c.xsmVisitMet("x_miaogirl", "2026-11-16");
  assert.equal(c._st.visit7.n.x_miaogirl, 3); assert.equal(c._st.visit7.day.x_miaogirl, "2026-11-16"); assert.equal(c._st.xsmStall.v.met, "2026-11-16");
  const c2 = load({ st: { visit7: { n: { x_miaogirl: 5 }, day: { x_miaogirl: "2026-11-16" } } } });
  c2.xsmVisitMet("x_miaogirl", "2026-11-16"); assert.equal(c2._st.visit7.n.x_miaogirl, 5, "07j 今天已經帶他來過，不重算");
  /* 發亮：有人來、還沒見到才亮 */
  const c3 = load({ mem: ["x_swordboy", "x_miaogirl"], look: "x_swordboy" });
  assert.equal(c3.xsmHotVisit(), true); c3.xsmVisitMet(c3.xsmVisitWho(), "2026-11-16"); assert.equal(c3.xsmHotVisit(), false, "見過就不亮");
  assert.equal(load({ mem: ["x_swordboy"], look: "x_swordboy" }).xsmHotVisit(), false, "沒人來不亮");
});

/* 假的頁面元件：找到那一下用 */
const fakeP = () => { const t = { classList: { add() { } }, remove() { } }; return { P: { isConnected: true, querySelector: () => null }, t } };

test("找棋子：每天一顆；找到給 10 修為；同一天同一顆不重複給；七天湊齊再給 50（只給一次）；下一副重新數", () => {
  const c = load({ day: "2026-11-01" });
  const { P, t } = fakeP();
  c.xsmGotPc(P, t); c.xsmGotPc(P, t);
  assert.deepEqual(J(c._log.xp), [[10, "找棋子", "xsmf:2026-11-01"]], "同一天點兩次只給一次");
  assert.deepEqual(J(c._st.xsmStall.f), { n: 1, sets: 0, day: "2026-11-01", tot: 1 });
  const D = days(13, "2026-11-02T12:00:00");
  for (const d of D.slice(0, 6)) { c._day = d; c.xsmGotPc(P, t) }
  assert.equal(c._log.xp.filter(x => x[0] === 10).length, 7, "七天七顆，每顆 10");
  assert.deepEqual(J(c._log.xp.filter(x => x[0] === 50)), [[50, "找棋子", "xsmf7:1"]], "湊齊一副 +50");
  assert.deepEqual(J(c._st.xsmStall.f), { n: 0, sets: 1, day: "2026-11-07", tot: 7 }, "湊齊後下一副從 0 數");
  c.xsmGotPc(P, t); assert.equal(c._log.xp.length, 8, "同一天（湊齊那天）再點不給");
  for (const d of D.slice(6)) { c._day = d; c.xsmGotPc(P, t) }
  assert.deepEqual(J(c._log.xp.filter(x => x[0] === 50).map(x => x[2])), ["xsmf7:1", "xsmf7:2"], "第二副湊齊再給一次 50，鍵不同");
  assert.equal(c._log.xp.reduce((s, x) => s + x[0], 0), 14 * 10 + 2 * 50);
  /* 純計算：同一天＝null；第幾顆照 07pty 加入順序 */
  assert.equal(c.xsmFindGo({ n: 3, day: "2026-11-20" }, "2026-11-20"), null);
  assert.deepEqual(J(R(c, "XSM_PCS")), ["俥", "傌", "帥", "仕", "相", "兵", "炮"]);
  const g = c.xsmFindGo({ n: 6, sets: 0, day: "2026-11-19", tot: 6 }, "2026-11-20"); assert.equal(g.pc, "炮"); assert.equal(g.full, true); assert.equal(g.xp, 60);
  assert.equal(c.xsmPieceOf({ n: 99 }), "炮", "壞掉的進度夾回 0～6");
});

test("找棋子藏點：每處都在圖上、避開攤位標籤和出口；每天一處、跟前一天不同、同一天固定；點到 28px 內才算", () => {
  const c = load(), H = J(R(c, "XSM_HIDE")), L = J(c.xsmSpots()), W = 435, Hh = 779;   // 390 手機補滿高度的圖大小
  assert.ok(H.length >= 10 && H.length <= 15, "藏點 10～15 處（定稿第二節）");
  for (const [x, y] of H) {
    assert.ok(x > 3 && x < 97 && y > 3 && y < 97, `${x},${y} 在圖內`);
    for (const s of L) assert.ok(Math.hypot((x - s[1]) * W / 100, (y - s[2]) * Hh / 100) > 45, `${x},${y} 離標籤「${s[3]}」太近`);
    assert.ok(Math.hypot((x - 72) * W / 100, (y - 97) * Hh / 100) > 45, `${x},${y} 離出口太近`);
  }
  const D = days(90), I = D.map(d => c.xsmHideIdx(d));
  for (let i = 1; i < I.length; i++) assert.notEqual(I[i], I[i - 1], `${D[i]} 跟前一天藏同一處`);
  assert.ok(new Set(I).size >= 8, "三個月裡藏點會換來換去");
  assert.deepEqual(J(c.xsmHideOf("2026-11-16")), J(c.xsmHideOf("2026-11-16")), "同一天固定同一處");
  assert.equal(c.xsmPrevDay("2026-03-01"), "2026-02-28"); assert.equal(c.xsmPrevDay("2027-01-01"), "2026-12-31");
  const s = [50, 50], px = d => [50 + d / W * 100, 50];
  assert.equal(c.xsmNear(s, px(27), W, Hh), true, "27px 算找到"); assert.equal(c.xsmNear(s, px(28), W, Hh), true, "28px 算找到");
  assert.equal(c.xsmNear(s, px(29), W, Hh), false, "29px 不算"); assert.equal(c.xsmNear(s, [50, 50 + 20 / Hh * 100], W, Hh), true, "上下 20px 也算");
});

test("聽曲：只收停靠過的朝代（加上青石園），每朝 7 首全收；沒有旅程只有青石園", t => {
  if (!BGM_IX) return t.skip("沒有 data/bgm/index.json 配樂清單（只放 CDN，公開副本沒有）");   /* 第 20 輪評比改善第 2 項：照實標略過 */
  const c = load(), O = ["classic", "han", "qin", "sanguo", "weijin", "tang", "song"];
  assert.deepEqual(J(c.xsmMuEras(O, ["han", "tang"])), ["classic", "han", "tang"]);
  assert.deepEqual(J(c.xsmMuEras(O, null)), ["classic"], "沒有旅程（shipDockList＝null）");
  assert.deepEqual(J(c.xsmMuEras(O, ["ming"])), ["classic"], "不在航線上的不算");
  assert.deepEqual(J(c.xsmMuEras(null, ["song"])), ["classic", "song"], "沒有 shipOrder 照預設順序");
  const L = J(c.xsmMuList(["classic", "han", "tang"], BGM_IX));
  assert.equal(L.length, 21, "三朝 × 7 首"); assert.ok(L.includes("han/paixiao_7.mp3") && L.includes("tang/pipa_1.mp3") && !L.some(x => x.startsWith("song/")), "沒停靠的宋朝不收");
  for (const e of Object.keys(BGM_IX)) assert.equal(BGM_IX[e].length, 7, e + " 有 7 首");
  /* 樂棚實際叫的資料源：shipDockList */
  let asked = null; const c2 = load({ g: { document: { getElementById: () => 1 }, shipDockList: () => (asked = 1, ["qin"]), shipOrder: () => O, sheet: (t, f) => { asked = t } } });
  c2.xsmMusicSheet(); assert.equal(asked, "西市樂棚");
});

test("配樂：西市背景配樂借三首、白天夜裡各一組；樂棚點了播、再點停（回背景配樂）；背景音樂關著不放；離開西市還給朝代配樂", () => {
  const c = load({ bgm: 1, clk: 5 }), D = R(c, "XSM_BGM_D"), N = R(c, "XSM_BGM_N");
  assert.deepEqual(J(D), ["han/paixiao_6.mp3", "tang/pipa_1.mp3"]); assert.deepEqual(J(N), ["song/qin_3.mp3", "tang/pipa_1.mp3"]);
  c.xsmBgmOn(); assert.equal(c.BGM.force, D, "白天（clkIdx 5＝巳時）放漢唐那組");
  c.xsmMuToggle("han/paixiao_1.mp3"); assert.equal(c.BGM.force, "han/paixiao_1.mp3", "樂棚點了播");
  c.xsmBgmOn(); assert.equal(c.BGM.force, "han/paixiao_1.mp3", "在西市裡換頁（進茶坊）不打斷樂棚那首");
  c.xsmMuToggle("han/paixiao_1.mp3"); assert.equal(c.BGM.force, D, "再點一下停，回西市背景配樂");
  const n = load({ bgm: 1, clk: 10 }); n.xsmBgmOn(); assert.equal(n.BGM.force, R(n, "XSM_BGM_N"), "酉時以後放夜裡那組");
  const off = load({ bgm: 1, clk: 5, st: { bgm: false } }); off.xsmMuToggle("han/paixiao_1.mp3"); assert.equal(off.BGM.force, null); assert.equal(off._log.toast.length, 1, "背景音樂關著：提示去設定打開");
  /* 離開西市 */
  const h = c._ev.hashchange; assert.ok(h && h.length === 1, "有 hashchange");
  c.location.hash = "#/ximarket/tea"; h[0](); assert.equal(c.BGM.force, D, "還在西市（茶坊）不動");
  c.location.hash = "#/"; h[0](); assert.equal(c.BGM.force, null, "回首頁還給朝代配樂");
  c.BGM.force = "bh_2.mp3"; h[0](); assert.equal(c.BGM.force, "bh_2.mp3", "黑洞的曲子不是西市放的，不動");
  /* 01-board：bgmForce 收「朝代/檔名」和陣列；黑洞照舊 blackhole 資料夾 */
  const B = M("m/01-board.js"), i = B.indexOf("function bgmPick("), j = B.indexOf("bgmBlob(BGM.src)}", i) + 17, cb = vm.createContext({ Math, BGM: { era: null, src: "", last: -1 }, bgmBlob: () => { } });
  vm.runInContext(B.slice(i, j), cb);
  cb.bgmPick("blackhole", ["han/paixiao_6.mp3"], true); assert.equal(cb.BGM.src, "data/bgm/han/paixiao_6.mp3");
  cb.bgmPick("blackhole", ["bh_2.mp3"], true); assert.equal(cb.BGM.src, "data/bgm/blackhole/bh_2.mp3", "黑洞照舊");
  cb.bgmPick("tang", ["pipa_1.mp3"], true); assert.equal(cb.BGM.src, "data/bgm/tang/pipa_1.mp3", "朝代配樂照舊");
  assert.ok(B.includes("const L=BGM.force?[].concat(BGM.force):"), "bgmSync 收陣列（西市一組兩首輪流）");
});

test("領禮物（雲河櫃坊）：列 07mnq 的大禮包，還沒領的排前面；遠征補給是停靠過的每一朝（青石園沒有）", () => {
  const c = load();
  const S = { gift: { a1: 1, a6: { han: 1 } } }, E = { hasChar: true, firstWin: true };
  assert.deepEqual(J(c.xsmGifts(S, E, ["classic", "han", "tang"])), [{ k: "a2", got: false }, { k: "a6", era: "tang", got: false }, { k: "a1", got: true }, { k: "a6", era: "han", got: true }]);
  assert.deepEqual(J(c.xsmGifts({ gift: {} }, { hasChar: true }, null)), [{ k: "a1", got: false }], "還沒贏過不列破局錦囊；沒有旅程沒有遠征補給");
  assert.deepEqual(J(c.xsmGifts({ gift: { a6: { song: 1 } } }, {}, ["qin"])), [{ k: "a6", era: "qin", got: false }, { k: "a6", era: "song", got: true }], "領過、但不在停靠清單的照列");
  /* 發亮：有禮可領才亮 */
  const g = { mnqSt: () => ({ gift: { a1: 1, a2: 1, a6: {} } }), mnqEnv: () => ({ hasChar: true, firstWin: true }), shipDockList: () => ["classic"] };
  assert.equal(load({ g }).xsmHotGift(), false);
  assert.equal(load({ g: Object.assign({}, g, { shipDockList: () => ["classic", "han"] }) }).xsmHotGift(), true, "停靠了漢朝、還沒領漢朝補給");
  assert.equal(load().xsmHotGift(), false, "沒有 07mnq 不亮");
});

test("存檔：新鍵 xsmStall 在 JOURNEY_KEYS（另外 push、不動清單字面），模組只用這一個新鍵", () => {
  const SV = M("m/05b-save.js"), a = SV.indexOf("const JOURNEY_KEYS="), b = SV.indexOf("\nconst JK=new Set", a);
  assert.ok(SV.slice(a, b).includes('JOURNEY_KEYS.push("m_xsmStall")'), "建 JK 之前 push");
  const cx = vm.createContext({}); vm.runInContext(SV.slice(a, b) + "\nthis.K=JOURNEY_KEYS;", cx);
  assert.ok(cx.K.includes("m_xsmStall") && cx.K.includes("m_xsmSeen") && cx.K.includes("m_bhDrift1"));
  const keys = new Set([...SRC.matchAll(/store\.(?:get|set)\("([^"]+)"/g)].map(m => m[1]));
  assert.deepEqual([...keys].sort(), ["bgm", "bhtd", "gsv", "visit7", "xsmSeen", "xsmStall", "hintBonus", "undoBonus", "relics", "relicAt"].sort(), "西市讀寫的存檔鍵（bgm 只讀；bhtd、gsv 是開放條件；visit7 是 07j 的；11/16 櫃坊改版發提示棋、悔棋符、珍品，都是原本就在 JOURNEY_KEYS 的鍵）");
  for (const k of ["visit7", "xsmSeen", "bhtd", "gsv", "hintBonus", "undoBonus", "relics", "relicAt"]) assert.ok(cx.K.includes("m_" + k));
  const c = load({ st: { xsmStall: { f: { n: "x" }, v: 3 } } }); assert.deepEqual(J(c.xsmSt()), { f: { n: 0, sets: 0, day: "", tot: 0 }, v: {} }, "壞掉的存檔整理成固定形狀");
});

test("畫面規矩：五攤標籤只放大字、都開張；模組裡沒有「上限」；接線（點標籤開哪張卡、首頁發亮、07hmp 長卷也發亮）", () => {
  const c = load(), L = J(c.xsmSpots());
  assert.deepEqual(L.map(s => [s[0], s[3], s[4]]), [["xsmGift", "領禮物", false], ["xsmMusic", "聽曲", false], ["xsmTea", "暗棋", false], ["xsmChess", "找棋子", false], ["xsmVisit", "七星來訪", false]]);
  assert.ok(!SRC.includes("上限"), "畫面上不寫「上限」");
  for (const [id, fn] of [["xsmGift", "xsmGiftSheet"], ["xsmMusic", "xsmMusicSheet"], ["xsmChess", "xsmChessSheet"], ["xsmVisit", "xsmVisitSheet"]]) assert.ok(SRC.includes(`${id}:()=>${fn}()`), id + " → " + fn);
  for (const t of ["雲河櫃坊", "老槐樹下", "棋具攤", "西市樂棚"]) assert.ok(SRC.includes(`sheet("${t}"`), "卡片標題用店名：" + t);
  assert.ok(M("m/07hmp-pano.js").includes('typeof xsmHot==="function"&&xsmHot()'), "長卷左屏的西市也照 xsmHot 發亮");
  assert.ok(!SRC.includes("//"), "整支沒有 // 註解（一行程式裡插 // 會吃掉後面的程式，註解一律 /* */）");
});

test("找棋子（11/16 開發者選單「照現在＋讀螢幕可直接收」）：只在 ♿ 螢幕報讀與鍵盤模式多一顆「直接收下」，效果跟圖上找到一樣（+10、湊齊 +50、同一天不重複）；一般模式不出現", () => {
  /* 假的卡片：sheet 直接把內容畫進 b，按鈕用 id 找；setTimeout 立刻跑 */
  const mk = ax => {
    const ui = { html: "", btn: {}, modal: [] };
    const b = { set innerHTML(h) { ui.html = h; ui.btn = {}; for (const m of h.matchAll(/id="(xsmC[a-z])"/g)) ui.btn[m[1]] = { onclick: null } }, get innerHTML() { return ui.html }, querySelector: s => ui.btn[s.slice(1)] || null };
    const c = load({ day: "2026-11-01", g: {
      sheet: (t, f) => { ui.title = t; f(b) }, closeSheet: () => { }, modal: (h, bt) => { ui.modal.push(h) }, esc: s => String(s), setTimeout: f => f(),
      document: { getElementById: () => 1, querySelector: () => null, querySelectorAll: () => [] },
      axmOn: () => ax } });
    c._ui = ui; return c;
  };
  const off = mk(false); off.xsmChessSheet();
  assert.equal(off._ui.title, "棋具攤"); assert.ok(off._ui.btn.xsmCg, "一般模式有「去找」"); assert.ok(!off._ui.btn.xsmCt && !off._ui.html.includes("直接收下"), "一般模式沒有「直接收下」");
  const noAx = load({ g: { document: { getElementById: () => 1 } } }); assert.equal(R(noAx, "xsmAxOn()"), false, "沒有 11b（axmOn 不存在）當一般模式");
  const on = mk(true); on.xsmChessSheet();
  assert.ok(on._ui.btn.xsmCt && on._ui.html.includes("直接收下今天這顆「俥」"), "讀螢幕模式多一顆直接收下（寫今天是哪顆）");
  on._ui.btn.xsmCt.onclick();
  assert.deepEqual(J(on._log.xp), [[10, "找棋子", "xsmf:2026-11-01"]], "跟圖上找到一樣 +10，同一個修為鍵");
  assert.deepEqual(J(on._st.xsmStall.f), { n: 1, sets: 0, day: "2026-11-01", tot: 1 });
  on.xsmChessSheet(); assert.ok(!on._ui.btn.xsmCt && !on._ui.btn.xsmCg, "今天收過：兩顆都不出現（明天再來）");
  assert.equal(on.xsmTakePc(), null, "同一天直接叫也不再給"); assert.equal(on._log.xp.length, 1);
  /* 圖上找到過的那天，也不能再直接收 */
  const { P, t } = fakeP(); on._day = "2026-11-02"; on.xsmGotPc(P, t); assert.equal(on.xsmTakePc(), null, "圖上找到了，同一天不能再直接收");
  for (const d of days(5, "2026-11-03T12:00:00")) { on._day = d; on.xsmChessSheet(); on._ui.btn.xsmCt.onclick() }
  assert.equal(on._log.xp.filter(x => x[0] === 10).length, 7); assert.deepEqual(J(on._log.xp.filter(x => x[0] === 50)), [[50, "找棋子", "xsmf7:1"]], "直接收也能湊齊、+50 一次");
  assert.equal(on._ui.modal.length, 1, "湊齊跳一次蓋印卡"); assert.ok(on._ui.modal[0].includes("一副棋湊齊了"));
});

/* 第 20 輪評比改善第 2 項：只在 CDN 的資料不在時照實標「略過」，不再靜靜算通過 */
test("西市借的三首配樂檔都在（mp3 只放 CDN）", t => {
  const B = path.join(ROOT, "xiangqi-lab", "site", "data", "bgm");
  if (!fs.existsSync(path.join(B, "han"))) return t.skip("沒有 data/bgm 的 mp3（只放 CDN，公開副本沒有）");
  for (const f of ["han/paixiao_6.mp3", "tang/pipa_1.mp3", "song/qin_3.mp3"]) assert.ok(fs.existsSync(path.join(B, f)), "site/data/bgm/" + f);
});
