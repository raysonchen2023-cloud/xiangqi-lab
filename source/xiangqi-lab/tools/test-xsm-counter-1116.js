// 開發者 11/16 晚：「領禮物的實用性和樂趣太低」→ 提案 xiangqi-db/story/gemini_app/173，選單定「開櫃取帖＋飛錢寄櫃的見面禮、遠征補給、每週平安信」（m/07xsm-ximarket.js）。
// 不開瀏覽器：模組丟進 vm，用假的 store／ptyGet／sg2DustAdd／addXP 實際跑——每天抽帖、攢三天、節禮帖、小木匣機率、平安信週期、見面禮、發的東西進對的地方、同一份不給兩次；
// 07mnq：西市開了，遠征補給不在首頁自動跳（改到櫃坊）；沒開照舊。英文：新字串併外掛字典後翻得出。
// 用法 node --test xiangqi-lab/tools/test-xsm-counter-1116.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = p => fs.readFileSync(path.join(ROOT, "xiangqi-db", p), "utf8").replace(/\r\n/g, "\n");
const SRC = M("m/07xsm-ximarket.js");
const J = x => JSON.parse(JSON.stringify(x));
const ORDER = ["x_swordboy", "x_miaogirl", "x_shuai", "x_shi", "x_spiritgirl", "x_bing", "x_martialgirl"];
const TD_TERMS = (() => { const m = /const TD_TERMS=(\[[^;]+\]);/.exec(M("m/07y5-todaymap.js")); return m ? J(vm.runInNewContext(m[1])) : null })();
const days = (n, from) => { const o = [], d = new Date(from || "2026-01-01T12:00:00"); for (let i = 0; i < n; i++) { o.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0")); d.setDate(d.getDate() + 1) } return o };

/* 載入模組：st＝假存檔；mem＝已加入的夥伴；look＝陪你走那位；open＝西市開了沒（gxtWon） */
function load(o) {
  o = o || {};
  const st = Object.assign({}, o.st || {}), log = { xp: [], toast: [], dust: 0, ling: 0 };
  const g = {
    setTimeout: () => 0, clearTimeout: () => { }, setInterval: () => 0, Math, Object, String, JSON, Date, Array, Promise,
    addEventListener: () => { },
    store: { get: (k, d) => (k in st ? J(st[k]) : d), set: (k, v) => { st[k] = J(v) } },
    localDay: () => g._day, _day: o.day || "2026-11-16",
    addXP: (n, why, key) => { if (key) { const K = st.xpKeys || {}; if (K[key]) return; K[key] = 1; st.xpKeys = K } log.xp.push([n, why, key]) },
    toast: m => log.toast.push(m), vibrate: () => { }, saveNow: () => { },
    TD_TERMS,
  };
  if (o.mem) {
    g.PTY = { ORDER }; g.ptyHas = c => o.mem.includes(c); g.ptyLook = () => o.look || "x_swordboy";
    if (!("party" in st)) st.party = { pool: 0 };
    g.ptyGet = () => J(st.party); g.ptySave = P => { st.party = J(P) };
  }
  if (o.dust !== false) g.sg2DustAdd = n => { log.dust += n };
  g.lingN = () => log.ling; g.lingAdd = d => { log.ling += d };
  if (o.open) g.gxtWon = () => true;
  Object.assign(g, o.g || {});
  const ctx = vm.createContext(g);
  vm.runInContext(SRC, ctx);
  for (const n of ["xsmTieNorm", "xsmTermGift", "xsmPkNorm", "xsmWkLine", "xsmLetter", "xsmHotGift"]) vm.runInContext(`this.${n}=${n};`, ctx);   /* const 宣告的不會掛在全域物件上 */
  ctx._st = st; ctx._log = log;
  return ctx;
}
const R = (c, s) => vm.runInContext(s, c);

test("每天的帖：兩張明牌不重複、至少一張星輝或星塵；蓋牌是剩下三種之一或小木匣；份量照定案；同一天固定", () => {
  const c = load(), K = ["hui", "dust", "undo", "hint", "xp"], N = { hui: 30, undo: 1, hint: 1, xp: 20 };
  let box = 0, kinds = new Set(), dusts = new Set(), bx = new Set(), pos = new Set();
  const D = days(3650);
  for (const d of D) {
    const t = J(c.xsmTieDraw(d)), ks = t.open.map(x => x.k);
    ks.forEach((k, j) => pos.add(j + k));
    assert.equal(ks.length, 2); assert.notEqual(ks[0], ks[1], d + " 明牌重複");
    assert.ok(ks.some(k => k === "hui" || k === "dust"), d + " 明牌要有星輝或星塵");
    for (const x of t.open.concat(t.hid.k === "box" ? [] : [t.hid])) { assert.ok(K.includes(x.k)); if (x.k === "dust") { assert.ok(x.n >= 3 && x.n <= 5, "星塵 3～5"); dusts.add(x.n) } else assert.equal(x.n, N[x.k], x.k + " 份量"); kinds.add(x.k) }
    if (t.hid.k === "box") { box++; assert.ok(["ling", "relic"].includes(t.hid.b)); bx.add(t.hid.b) } else assert.ok(!ks.includes(t.hid.k), d + " 蓋牌跟明牌重複");
  }
  assert.deepEqual([...dusts].sort(), [3, 4, 5], "星塵 3、4、5 都會出現");
  assert.equal(pos.size, 10, "五種帖在左、右兩個位置都會出現（雜湊有打散，不會整排同一邊）");
  assert.equal(kinds.size, 5, "五種帖都會出現");
  const p = box / D.length; assert.ok(p > 0.035 && p < 0.065, "小木匣大約 5%：" + p.toFixed(3));
  assert.deepEqual([...bx].sort(), ["ling", "relic"], "小木匣有將令也有珍品");
  assert.deepEqual(J(c.xsmTieDraw("2026-11-16")), J(c.xsmTieDraw("2026-11-16")), "同一天同一組");
});

test("沒來的日子：第一次只有今天；收過帖以後，今天往前三天內沒收的都還能挑；收過的、太舊的不能", () => {
  const c = load();
  assert.deepEqual(J(c.xsmTieDays(null, "2026-11-16")), ["2026-11-16"], "第一次來只有今天");
  const r = c.xsmTieTake(null, "2026-11-16", 0, "2026-11-16"); assert.ok(r);
  assert.equal(J(r.G).s, "2026-11-16"); assert.deepEqual(J(c.xsmTieDays(r.G, "2026-11-16")), [], "今天收過了");
  assert.equal(c.xsmTieTake(r.G, "2026-11-16", 1, "2026-11-16"), null, "同一天不能挑第二張");
  assert.deepEqual(J(c.xsmTieDays(r.G, "2026-11-17")), ["2026-11-17"]);
  assert.deepEqual(J(c.xsmTieDays(r.G, "2026-11-20")), ["2026-11-18", "2026-11-19", "2026-11-20"], "隔了幾天：替你收著三天（舊的在前）");
  assert.deepEqual(J(c.xsmTieDays(r.G, "2026-11-30")), ["2026-11-28", "2026-11-29", "2026-11-30"], "很久沒來也只有三天");
  assert.equal(c.xsmTieTake(r.G, "2026-11-17", 0, "2026-11-20"), null, "四天前的不能挑");
  let G = r.G; for (const d of ["2026-11-18", "2026-11-20", "2026-11-19"]) { const x = c.xsmTieTake(G, d, 2, "2026-11-20"); assert.ok(x, d); G = x.G }
  assert.deepEqual(J(c.xsmTieDays(G, "2026-11-20")), [], "三天都挑完");
  assert.deepEqual(J(c.xsmTieDays(G, "2026-11-21")), ["2026-11-21"]);
  assert.equal(J(G).h.length, 4); assert.ok(J(c.xsmTieNorm({ c: "x", h: 3 })).c.length === 0, "壞掉的存檔整理成固定形狀");
  assert.deepEqual(J(c.xsmTieDays(null, "壞日期")), []);
  assert.equal(c.xsmDayAdd("2026-03-01", -1), "2026-02-28"); assert.equal(c.xsmDayAdd("2026-12-31", 1), "2027-01-01");
});

test("節禮帖：24 節氣當天多一張（星輝 60 或星塵 10），跟挑的那張一起收；每個節氣都有一句掌櫃的話；不是節氣沒有", () => {
  assert.ok(TD_TERMS && TD_TERMS.length === 24, "07y5 TD_TERMS 有 24 個");
  const c = load(), L = J(R(c, "XSM_TERM_L"));
  assert.deepEqual(Object.keys(L).sort(), TD_TERMS.map(t => t[2]).sort(), "24 節氣都有一句");
  const kinds = new Set();
  for (const [m, d, n] of TD_TERMS) {
    const day = "2026-" + String(m).padStart(2, "0") + "-" + String(d).padStart(2, "0");
    assert.equal(c.xsmTermOf(day), n, day);
    const g = J(c.xsmTermGift(day, n)); assert.ok((g.k === "hui" && g.n === 60) || (g.k === "dust" && g.n === 10), day + JSON.stringify(g)); kinds.add(g.k);
    const r = J(c.xsmTieTake(null, day, 0, day)); assert.deepEqual(r.term, g, "挑帖那天是節氣：節禮一起給");
  }
  assert.deepEqual([...kinds].sort(), ["dust", "hui"], "一年裡兩種節禮都有");
  assert.equal(c.xsmTermOf("2026-11-16"), ""); assert.equal(c.xsmTermGift("2026-11-16", ""), null);
  assert.equal(J(c.xsmTieTake(null, "2026-11-16", 0, "2026-11-16")).term, null, "不是節氣沒有節禮");
  assert.equal(c.xsmTermOf("2026-11-07", [[11, 7, "立冬"]]), "立冬", "可以傳別的節氣表");
});

test("挑帖發東西：星輝進星輝池、星塵進 07sg2、提示棋和悔棋符進庫存、修為帶鍵；節禮一起發；同一天點兩次不給", () => {
  const c0 = load(), find = want => { for (const d of days(400)) { if (c0.xsmTermOf(d)) continue; const t = J(c0.xsmTieDraw(d)), A = t.open.concat([t.hid]), i = A.findIndex(x => x.k === want); if (i >= 0) return [d, i, A[i].n] } return [] };
  for (const k of ["hui", "dust", "undo", "hint", "xp"]) {
    const [day, i, n] = find(k);
    assert.ok(day, "找得到 " + k);
    const c = load({ mem: ["x_swordboy"], day, st: { party: { pool: 5 }, hintBonus: 2, undoBonus: 0 } }), r = c.xsmTieGo(day, i);
    assert.ok(r, k); assert.deepEqual(J(r.got)[0].slice(1), [J(R(c, "XSM_TIE"))[k][1], n]);
    if (k === "hui") assert.equal(c._st.party.pool, 5 + 30);
    if (k === "dust") assert.equal(c._log.dust, n);
    if (k === "hint") assert.equal(c._st.hintBonus, 3);
    if (k === "undo") assert.equal(c._st.undoBonus, 1);
    if (k === "xp") assert.deepEqual(J(c._log.xp), [[20, "雲河櫃坊", "xsmg:" + day]]);
    assert.equal(c.xsmTieGo(day, 0), null, "同一天第二次不給");
    assert.deepEqual(J(c._st.xsmStall.g.c), [day]);
  }
  /* 節氣：挑的那張＋節禮 */
  const [m, d] = TD_TERMS.find(t => t[2] === "冬至"), day = "2026-" + m + "-" + d, c = load({ mem: ["x_swordboy"], day });
  const r = J(c.xsmTieGo(day, 0)); assert.equal(r.got.length, 2, "挑的那張＋節禮"); assert.ok(r.term);
  /* 沒有旅程（沒有 07pty、沒有 07sg2）：星輝、星塵改成修為 20 */
  const hd = days(400).find(x => J(load().xsmTieDraw(x)).open[0].k === "hui" && !load().xsmTermOf(x)), c2 = load({ day: hd, dust: false });
  c2.xsmTieGo(hd, 0); assert.deepEqual(J(c2._log.xp), [[20, "雲河櫃坊", "xsmg:" + hd]], "沒有星輝池改給修為");
});

test("積灰的小木匣：將令 1；珍品挑停靠過的朝代裡還沒收的（先挑普通的），一件都沒有就改給將令", async () => {
  const D = days(3650), lingDay = D.find(d => { const h = J(load().xsmTieDraw(d)).hid; return h.k === "box" && h.b === "ling" }), relDay = D.find(d => { const h = J(load().xsmTieDraw(d)).hid; return h.k === "box" && h.b === "relic" });
  const c = load({ mem: ["x_swordboy"], day: lingDay }); const r = J(c.xsmTieGo(lingDay, 2));
  assert.equal(r.box, "ling"); assert.equal(c._log.ling, 1); assert.deepEqual(r.got[0].slice(1), ["將令", 1]);
  const REL = { classic: [{ id: "classic_1", rarity: "rare", name: "甲" }, { id: "classic_2", rarity: "common", name: "乙" }], han: [{ id: "han_1", rarity: "common", name: "丙" }], song: [{ id: "song_1", rarity: "common", name: "丁" }] };
  const fx = [];
  const g = { relicsData: async () => REL, relicsMine: () => J(c2._st.relics || {}), relicFx: async (e, it) => { fx.push([e, it.id]) }, relicEra: e => e, shipDockList: () => ["han"] };
  const c2 = load({ mem: ["x_swordboy"], day: relDay, g });
  assert.equal(await c2.xsmRelic(relDay), true);
  const got = J(c2._st.relics); assert.equal(Object.values(got).flat().length, 1);
  assert.ok(["classic_2", "han_1"].includes(Object.values(got).flat()[0]), "先挑普通的、只挑停靠過的（宋沒停靠）");
  assert.equal(fx.length, 1, "開箱照 07i relicFx");
  c2._st.relics = { classic: ["classic_1", "classic_2"], han: ["han_1"] };
  assert.equal(await c2.xsmRelic(relDay), false, "都收齊了＝false（改給將令）");
});

test("見面禮、每週平安信：齊轍以外每位一份見面禮（星輝 80，只一次）；平安信每週一封（星輝 30），別的夥伴照週輪著寫，只有自己一個人＝掌櫃的平安帖", () => {
  const c = load();
  assert.equal(c.xsmWeekOf("2026-11-16"), "2026-11-16", "11/16 是週一"); assert.equal(c.xsmWeekOf("2026-11-22"), "2026-11-16", "週日算同一週"); assert.equal(c.xsmWeekOf("2026-11-23"), "2026-11-23");
  assert.equal(c.xsmWeekOf("2027-01-01"), "2026-12-28", "跨年");
  const mem = ["x_swordboy", "x_miaogirl", "x_shuai"];
  let L = J(c.xsmParcels(mem, "x_swordboy", ["han"], null, "2026-11-16"));
  assert.deepEqual(L.filter(x => x.k === "meet").map(x => [x.c, x.n]), [["x_miaogirl", 80], ["x_shuai", 80]], "齊轍沒有見面禮");
  assert.deepEqual(L.filter(x => x.k === "a6"), [{ k: "a6", era: "han" }]);
  const wk = L.find(x => x.k === "wk"); assert.equal(wk.w, "2026-11-16"); assert.equal(wk.n, 30); assert.ok(["x_miaogirl", "x_shuai"].includes(wk.c), "平安信不是陪你走那位寫的");
  assert.equal(J(c.xsmParcels(mem, "x_swordboy", [], { m: { x_miaogirl: "2026-11-01" }, w: "2026-11-16" }, "2026-11-20")).map(x => x.c).join(), "x_shuai", "收過的不再出現，這週的信收過了");
  assert.equal(J(c.xsmParcels(mem, "x_swordboy", [], { m: { x_miaogirl: 1, x_shuai: 1 }, w: "2026-11-16" }, "2026-11-23"))[0].k, "wk", "下一週又一封");
  const who = new Set(); for (const d of days(30, "2026-11-16T12:00:00").filter((x, i) => i % 7 === 0)) who.add(J(c.xsmParcels(ORDER, "x_bing", [], { m: {} }, d)).find(x => x.k === "wk").c);
  assert.ok(!who.has("x_bing") && who.size >= 2, "幾週下來會換人寫：" + [...who]);
  assert.equal(J(c.xsmParcels(["x_swordboy"], "x_swordboy", [], null, "2026-11-16")).find(x => x.k === "wk").c, "", "只有自己：掌櫃寫");
  assert.equal(c.xsmPkNm({ k: "wk", c: "" }), "櫃上的平安帖");
  /* 每位都有見面禮（齊轍除外）、兩句平安信；寫死的「妳」不行 */
  const ML = J(R(c, "XSM_MEET_L")), WL = J(R(c, "XSM_WK_L"));
  assert.deepEqual(Object.keys(ML).sort(), ORDER.slice(1).sort()); assert.deepEqual(Object.keys(WL).sort(), ORDER.slice().sort());
  for (const s of Object.values(ML).concat(...Object.values(WL))) assert.ok(!/妳/.test(s), s);
  /* 信是陪你走那位寫的（後來換人陪你走）：不叫自己的名字 */
  assert.equal(c.xsmLetter("{名}！見面禮寄到櫃上啦！", "x_martialgirl", "x_martialgirl"), "見面禮寄到櫃上啦！");
  assert.equal(c.xsmLetter("{名}，勞{你}收下", "x_shuai", "x_shuai"), "勞你收下", "沒有 07j：{你}＝你");
  assert.equal(c.xsmLetter("{名}，勞{你}收下", "x_shuai", "x_swordboy"), "，勞你收下", "不是陪你走那位：{名} 照 07j 換（這裡沒有 07j＝空）");
});

test("開包裹：見面禮、平安信先記再發（星輝進星輝池），同一份不給兩次；上週的信過期不收", () => {
  const c = load({ mem: ["x_swordboy", "x_miaogirl"], day: "2026-11-18", st: { party: { pool: 0 } } });
  assert.deepEqual(J(c.xsmPkTake({ k: "meet", c: "x_miaogirl", n: 9999 })).slice(1), ["星輝", 80], "份量照程式，不照傳進來的");
  assert.equal(c._st.party.pool, 80); assert.equal(c.xsmPkTake({ k: "meet", c: "x_miaogirl" }), null, "只一次");
  assert.equal(c.xsmPkTake({ k: "meet", c: "x_swordboy" }), null, "齊轍沒有見面禮");
  assert.equal(c.xsmPkTake({ k: "wk", c: "x_miaogirl", w: "2026-11-09" }), null, "上週的信不收");
  assert.deepEqual(J(c.xsmPkTake({ k: "wk", c: "x_miaogirl", w: "2026-11-16" })).slice(1), ["星輝", 30]);
  assert.equal(c._st.party.pool, 110); assert.equal(c.xsmPkTake({ k: "wk", c: "x_miaogirl", w: "2026-11-16" }), null, "一週一封");
  assert.equal(c.xsmPkTake({ k: "a6", era: "han" }), null, "遠征補給走 07mnq mnqGift");
  assert.deepEqual(J(c._st.xsmStall.p), { m: { x_miaogirl: "2026-11-18" }, w: "2026-11-16" });
});

test("發亮：西市開著時，有帖可挑、有包裹沒開就亮；都收了就不亮；西市沒開照舊只看 07mnq 的禮", () => {
  const g = { mnqSt: () => ({ gift: { a1: 1, a2: 1, a6: {} } }), mnqEnv: () => ({ hasChar: true, firstWin: true }), shipDockList: () => ["classic"] };
  assert.equal(load({ g }).xsmHotGift(), false, "西市沒開：照舊");
  const c = load({ open: true, mem: ["x_swordboy"], g });
  assert.equal(c.xsmHotGift(), true, "今天的帖還沒挑");
  c.xsmTieGo("2026-11-16", 0); assert.equal(c.xsmHotGift(), true, "掌櫃的平安帖還沒開");
  c.xsmPkTake({ k: "wk", c: "", w: "2026-11-16" }); assert.equal(c.xsmHotGift(), false, "都收了");
  c._day = "2026-11-17"; assert.equal(c.xsmHotGift(), true, "隔天又有新的帖");
  const c2 = load({ open: true, mem: ["x_swordboy"], g: Object.assign({}, g, { shipDockList: () => ["classic", "han"] }) });
  assert.deepEqual(J(c2.xsmParcelsNow()).filter(x => x.k === "a6"), [{ k: "a6", era: "han" }], "西市開了：漢朝的遠征補給變成櫃上的包裹");
});

test("文字規矩：掌櫃不用明清當鋪的詞；畫面不寫「上限」；整支沒有 // 註解；不加新存檔鍵", () => {
  const c = load(), TX = J(R(c, "XSM_TX")), TL = J(R(c, "XSM_TERM_L"));
  const shop = ["gift", "gDay", "gNight", "gMany", "gDone", "gPick", "gHid", "gBox", "tieHow", "pkNar", "qj", "wk0"].map(k => TX[k]).concat(Object.values(TL));
  for (const s of shop) { assert.ok(typeof s === "string" && s.length > 4, s); assert.ok(!/當鋪|當票|絕當|典當|贖/.test(s), "唐代櫃坊不用明清當鋪的詞：" + s); assert.ok(!/妳/.test(s), s) }
  assert.ok(!SRC.includes("上限")); assert.ok(!SRC.includes("//"));
  const SV = M("m/05b-save.js"); assert.ok(!/m_xsmCounter|m_xsmTie|m_xsmPk/.test(SV), "沒有新增存檔鍵（都在 xsmStall）");
});

test("07mnq：西市開了，遠征補給不在首頁、星槎自動跳（下一步跳過它），回過家鄉也不再一直帶你回家；西市沒開照舊", () => {
  const MNQ = M("m/07mnq-mainquest.js"), i = MNQ.indexOf("function mnqNextOf("), j = MNQ.indexOf("\n/* 主線解題比例", i);
  const ctx = vm.createContext({ MNQ_CH: [["classic", ""], ["qin", "秦・日落之前"], ["han", "漢"]], MNQ_CHAP: {}, MNQ_SEGS: { classic: [] }, MNQ_SEG_NM: {}, MNQ_PANEL_ON: false, MNQ_CN: ["一", "二"], mnqShort: e => e, mnqChN: () => 1, mnqDone: () => true, mnqOpen: () => false });
  vm.runInContext(MNQ.slice(i, j), ctx);
  const S = { seg: {}, gift: { a1: 1, a2: 1, a6: {} }, lamp: {} }, E = x => Object.assign({ hasChar: true, firstWin: true, home: "han", at: "qin" }, x);
  assert.deepEqual(J(ctx.mnqNextOf(S, E({}))), { k: "gift", g: "a6", era: "qin", t: "遠征補給" }, "西市沒開：照舊自動跳");
  assert.notEqual(J(ctx.mnqNextOf(S, E({ xsm: true, dock: ["qin"] }))).k, "gift", "西市開了：不自動跳（改到櫃坊）");
  assert.deepEqual(J(ctx.mnqNextOf(S, E({ xsm: true, dock: ["qin"] }))), { k: "home", era: "han", t: "回家鄉" }, "還沒停靠過家鄉：照舊帶回家");
  assert.equal(J(ctx.mnqNextOf(S, E({ xsm: true, dock: ["qin", "han"] }))).k, "more", "停靠過家鄉、補給在櫃上：不再一直帶回家");
  assert.ok(MNQ.includes('E.xsm=typeof xsmOpen==="function"&&!!xsmOpen()'), "mnqEnv 問 07xsm xsmOpen");
});

test("英文：櫃坊新字串併進外掛字典後都翻得出（掌櫃、七星的信照 {你}／{名} 換過的樣子）", t => {
  if (!fs.existsSync(path.join(ROOT, "xiangqi-db", "i18n-en.json"))) return t.skip("沒有 xiangqi-db/i18n-en.json 英文外掛字典（只放 CDN，公開副本沒有）");   /* 第 20 輪評比改善第 2 項：照實標略過 */
  const S = M("m/07i18n.js"), a = S.indexOf("#I18N-PURE-BEGIN"), b = S.indexOf("/* #I18N-PURE-END */"), ctx = {};
  vm.createContext(ctx); vm.runInContext(S.slice(S.indexOf("\n", a) + 1, b) + ";this.R={i18nText,i18nExtMerge}", ctx);
  ctx.R.i18nExtMerge(JSON.parse(M("i18n-en.json")));
  const c = load(), TX = J(R(c, "XSM_TX")), TL = J(R(c, "XSM_TERM_L")), ML = J(R(c, "XSM_MEET_L")), WL = J(R(c, "XSM_WK_L")), NK = { x_swordboy: "阿轍", x_miaogirl: "小梅", x_shuai: "方庭", x_shi: "城子", x_spiritgirl: "燕子", x_bing: "溪兒", x_martialgirl: "花兒" };
  const sub = (s, you, nm) => s.replace(/\{你\}/g, you).replace(/\{名\}/g, nm);
  const L = ["雲河櫃坊", "櫃上的帖", "蓋著的帖", "翻開看看", "帖上的日子", "節禮", "不用選，一起收下", "收下了", "打開小木匣看看", "寄來的包裹", "合券", "收過的禮", "‹ 回櫃上", "待會兒再開", "積灰的小木匣", "櫃上的平安帖",
    "漢朝渡口的遠征補給", "小梅寄來的見面禮", "方庭寄來的平安信", TX.gift, TX.pkNar, TX.qj, TX.meetNote];
  for (const you of ["你", "妳"]) {
    L.push(sub(TX.tieHow, you, ""));
    for (const k of ["gDay", "gNight", "gMany", "gDone", "gPick", "gHid", "gBox", "wk0"]) L.push("掌櫃：「" + sub(TX[k], you, "") + "」");
    for (const t of Object.values(TL)) L.push("掌櫃：「" + sub(t, you, "") + "」");
    for (const [ck, s] of Object.entries(ML)) L.push(NK[ck] + "：「" + sub(s, you, "阿轍") + "」");
    for (const [ck, A] of Object.entries(WL)) for (const s of A) L.push(NK[ck] + "：「" + sub(s, you, ck === "x_swordboy" ? "小梅" : "阿轍") + "」");
  }
  const CJK = /[㐀-鿿]/;
  for (const s of L) { const t = ctx.R.i18nText(s); assert.ok(t != null && !CJK.test(t), s + " → " + t) }
});
