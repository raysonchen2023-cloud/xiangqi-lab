// W48 屏風馬門門內（開發者 11/22：「讓屏風馬更有其他特色，和中炮門有差異，不要用同樣玩法」；選單：三種玩法都做、前院不站門人）：m/07z9c-screen.js。
//   這裡用 vm 跑真的 07z9c，外面的存檔、開局、修為、對局頁用假的記下呼叫。
//   挑錯著、算帳的題庫資料（data/zmhall/screen-*.json）另有 test-zm-screen-data-1122.js 檢查（W48-S2，Windows Claude 2）。
// 用法：node --test xiangqi-lab/tools/test-jh-screen-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SRC = rd("xiangqi-db/m/07z9c-screen.js");
/* 11/25 W120：過關跳回門內、被破的吐司改用 00-util.js 的 stillHere（到時換頁計數 ROUTE_N、網址沒變，而且還是這一盤才做）。從 00-util.js 抽真的那一行進沙箱，不自己寫假版本 */
const STILL = rd("xiangqi-db/m/00-util.js").replace(/\r\n/g, "\n").split("\n").find((l) => l.startsWith("function stillHere(")) || "";
if (!STILL) throw new Error("00-util.js 找不到 function stillHere(");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const J = (x) => JSON.parse(JSON.stringify(x));

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { jstart: [], xp: [], toast: [], hash: [], watch0: 0, end0: 0, rsfin: [], timers: [] };
  const loc = { hash: "#/journey/play" };
  const c = {
    window: { XQCore: C }, document: undefined,
    location: { get hash() { return loc.hash }, set hash(h) { loc.hash = h; calls.hash.push(h) } },
    navKey: (h) => String(h).replace(/^#/, ""),
    jhL: (zh) => zh, jhT: (s) => s, esc: (s) => String(s), oscEn: () => false, i18nWxf: () => null,
    jhWindDay: () => o.day || "2026-11-22",
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = v == null ? v : J(v) } },
    toast: (s) => calls.toast.push(s), setTimeout: (f) => { if (o.defer) calls.timers.push(f); else f() }, closeSheet() {},   /* o.defer：計時器先排著，測試自己 flush，才能在中間換頁、開新的一盤 */
    addXP: (n, why, key) => calls.xp.push([n, key]), rsFin: (id) => calls.rsfin.push(id),
    parkNpcLv: () => 4,
    jStart: (id, b, go) => { calls.jstart.push({ id, b }); mem.jPending = { id, game: "g1" }; go(true) },
    lvWatch: () => { calls.watch0++ }, journeyGameEnd: () => { calls.end0++ }, jName: (j) => "原本:" + j,
    JhHall: () => ({}),
    JH_HALL: { central: { v: "1122", seat: [387, 297], w: 72, spots: { hall: [384, 112], study: [226, 458], yard: [384, 1008], gate: [384, 1330] }, mates: [[296, 1150], [472, 1150]] } },
    JH_HALL_WALK: { central: {} },
  };
  vm.createContext(c);
  vm.runInContext("let ROUTE_N=0;\n" + STILL + "\n" + SRC + ";this.route=()=>{ROUTE_N++};this.R={JH_SCR_GUARD,JH_SCR_J,jhScrGet,jhScrBig,jhScrGuardEval,jhScrGuardStart,jhScrGuardOf,jhScrDayXP,jhScrBoardAt,lvWatch,journeyGameEnd,jName,JhHall}", c);
  return { c, R: c.R, mem, calls, loc };
}
const board = (fen) => C.parseFen(fen);
/* 假的對局狀態：黑方（玩家）走了 n 步、紅方也走了 n 步，現在輪紅 */
const st = (b, n, more = {}) => Object.assign({ id: "g1", human: "b", board: b, turn: "r", result: null, moves: Array.from({ length: n * 2 }, (_, i) => ({ by: i % 2 ? "r" : "b" })) }, more);

test("起始局面＝中炮過河車對屏風馬（7 手都合法、走完輪黑）", () => {
  const { R } = load();
  let b = C.parseFen(C.START.split(" ")[0]), s = "r";
  for (const u of R.JH_SCR_GUARD.mv.split(" ")) {
    const f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4));
    assert.ok(C.legal(b, s).some(([x, y]) => x === f && y === t), "不合法：" + u);
    b = C.make(b, f, t); s = C.opp(s);
  }
  assert.equal(C.fen(b, s), R.JH_SCR_GUARD.fen + " b");
  assert.equal(R.JH_SCR_GUARD.turn, "b");
  assert.equal(R.JH_SCR_GUARD.limit, 10);
});

test("開始守中宮：玩家執黑、從定式局面開、強度照園子棋友、jPending 記下 10 步", () => {
  const { R, calls, mem } = load();
  R.jhScrGuardStart();
  assert.equal(calls.jstart.length, 1);
  const { id, b } = calls.jstart[0];
  assert.equal(id, "jh:guard:screen");
  assert.deepEqual(J(b), { human: "b", level: 4, journey: "jh:guard:screen", lv: { fen: R.JH_SCR_GUARD.fen, turn: "b" } });
  assert.deepEqual(mem.jPending, { id: "jh:guard:screen", game: "g1", jhg: { limit: 10 } });
  assert.deepEqual(calls.hash, ["#/journey/play"]);
});

test("大子淨虧：被吃一車＝9；車換車＝0；兵不算", () => {
  const { R } = load();
  const b0 = board(R.JH_SCR_GUARD.fen);
  const noCar = b0.slice(); noCar[b0.indexOf("r")] = null;
  const trade = noCar.slice(); trade[trade.indexOf("R")] = null;
  const noPawn = b0.slice(); noPawn[b0.indexOf("p")] = null;
  assert.deepEqual(J(R.jhScrGuardEval(st(b0, 3))), { n: 3, net: 0 });
  assert.deepEqual(J(R.jhScrGuardEval(st(noCar, 4))), { n: 4, net: 9 });
  assert.deepEqual(J(R.jhScrGuardEval(st(trade, 5))), { n: 5, net: 0 });
  assert.deepEqual(J(R.jhScrGuardEval(st(noPawn, 5))), { n: 5, net: 0 });
});

test("走滿 10 步、沒淨虧：過關、修為 +20 只給一次、回門內頁、這盤記成已結束", () => {
  const { R, calls, mem } = load({ store: { jPending: { id: "jh:guard:screen", game: "g1", jhg: { limit: 10 } } } });
  const b0 = board(R.JH_SCR_GUARD.fen);
  R.lvWatch(st(b0, 9), {});   /* 9 步：還沒到 */
  assert.ok(mem.jPending, "9 步不能結束");
  R.lvWatch(st(b0, 10, { turn: "b" }), {});   /* 第 10 步還沒走完（輪到黑）：不算 */
  assert.ok(mem.jPending);
  R.lvWatch(st(b0, 10), {});
  assert.equal(mem.jPending, null);
  assert.deepEqual(calls.rsfin, ["g1"]);
  assert.deepEqual(J(calls.xp), [[20, "guard:g1"]]);
  assert.ok(mem.oscClaim["guard:screen"]);
  assert.equal(R.jhScrGet().best, 10);
  assert.ok(R.jhScrGet().g && R.jhScrGet().g.id === "g1");
  assert.equal(calls.hash.at(-1), "#/jianghu/hall/screen");
  assert.equal(calls.watch0, 0, "守中宮的盤不交給原本的 lvWatch");
  /* 再守一次：只記紀錄，不再給修為 */
  mem.jPending = { id: "jh:guard:screen", game: "g2", jhg: { limit: 10 } };
  R.lvWatch(st(b0, 10, { id: "g2" }), {});
  assert.equal(calls.xp.length, 1);
});

test("先棄後取（開發者 11/22）：大子淨虧 3 分以上先不判輸，記下從第幾步開始虧並提醒；寬限 2 步後還虧才判輸、不給修為", () => {
  const { R, calls, mem } = load({ store: { jPending: { id: "jh:guard:screen", game: "g1", jhg: { limit: 10 } } } });
  assert.equal(R.JH_SCR_GUARD.grace, 2);
  const b0 = board(R.JH_SCR_GUARD.fen), noHorse = b0.slice(); noHorse[b0.indexOf("n")] = null;
  R.lvWatch(st(noHorse, 4), {});
  assert.ok(mem.jPending, "剛虧的那一步不判輸"); assert.equal(mem.jPending.jhg.owe, 4);
  assert.match(calls.toast.at(-1), /2 步內取回就不算輸/);
  R.lvWatch(st(noHorse, 5), {});
  assert.ok(mem.jPending, "寬限第 1 步還沒到");
  R.lvWatch(st(noHorse, 6), {});
  assert.equal(mem.jPending, null, "寬限 2 步後還虧＝判輸");
  assert.equal(calls.xp.length, 0);
  assert.match(calls.toast.at(-1), /2 步還沒取回/);
  assert.equal(R.jhScrGet().best, 6);
  assert.equal(R.jhScrGet().g, null);
});

test("先棄後取：寬限內取回（淨虧回到 3 分以下）就清掉紀錄、繼續守；之後再虧重新起算", () => {
  const { R, mem } = load({ store: { jPending: { id: "jh:guard:screen", game: "g1", jhg: { limit: 10 } } } });
  const b0 = board(R.JH_SCR_GUARD.fen), noHorse = b0.slice(); noHorse[b0.indexOf("n")] = null;
  const trade = noHorse.slice(); trade[trade.indexOf("N")] = null;   /* 黑方吃回紅傌：淨虧 0 */
  R.lvWatch(st(noHorse, 3), {}); assert.equal(mem.jPending.jhg.owe, 3);
  R.lvWatch(st(trade, 4), {}); assert.ok(mem.jPending); assert.equal(mem.jPending.jhg.owe, null, "取回就清掉");
  R.lvWatch(st(noHorse, 7), {}); assert.equal(mem.jPending.jhg.owe, 7, "之後再虧，從第 7 步重新起算");
  R.lvWatch(st(noHorse, 8), {}); assert.ok(mem.jPending);
});

test("先棄後取：走滿 10 步時還虧＝判輸（寬限不能拖過結算）；沒虧才過關", () => {
  let L = load({ store: { jPending: { id: "jh:guard:screen", game: "g1", jhg: { limit: 10, owe: 9 } } } });
  const b0 = board(L.R.JH_SCR_GUARD.fen), noHorse = b0.slice(); noHorse[b0.indexOf("n")] = null;
  L.R.lvWatch(st(noHorse, 10), {});
  assert.equal(L.mem.jPending, null); assert.equal(L.calls.xp.length, 0); assert.match(L.calls.toast.at(-1), /大子還虧/);
  L = load({ store: { jPending: { id: "jh:guard:screen", game: "g1", jhg: { limit: 10, owe: 9 } } } });
  L.R.lvWatch(st(b0, 10), {});
  assert.equal(L.mem.jPending, null); assert.deepEqual(J(L.calls.xp), [[20, "guard:g1"]], "最後取回了＝過關");
});

test("PR #39 審查：換子途中（紅方剛吃黑馬、輪到玩家還沒吃回）不判也不記；輪到紅方時才開始算", () => {
  const { R, mem, calls } = load({ store: { jPending: { id: "jh:guard:screen", game: "g1", jhg: { limit: 10 } } } });
  const b0 = board(R.JH_SCR_GUARD.fen), noHorse = b0.slice(); noHorse[b0.indexOf("n")] = null;
  R.lvWatch(st(noHorse, 4, { turn: "b" }), {});   /* 輪到玩家（黑）：還可以吃回來 */
  assert.ok(mem.jPending, "輪到玩家時不判"); assert.equal(mem.jPending.jhg.owe, undefined, "也不記"); assert.equal(calls.toast.length, 0);
  R.lvWatch(st(noHorse, 5, { turn: "r" }), {});   /* 玩家走完了還是淨虧 4 */
  assert.equal(mem.jPending.jhg.owe, 5, "輪到紅方時才開始算寬限");
});

test("別的對局照原本的 lvWatch；分出勝負時照原本結算、另外記守了幾步", () => {
  const { R, calls, mem } = load({ store: { jPending: { id: "inn:zm_screen", game: "g1" } } });
  R.lvWatch(st(board(R.JH_SCR_GUARD.fen), 10), {});
  assert.equal(calls.watch0, 1);
  const L = load({ store: { jPending: { id: "jh:guard:screen", game: "g1", jhg: { limit: 10 } } } });
  L.R.journeyGameEnd(st(board(L.R.JH_SCR_GUARD.fen), 6, { result: { w: "r" } }));
  assert.equal(L.calls.end0, 1);
  assert.equal(L.R.jhScrGet().best, 6);
  assert.match(L.calls.toast.at(-1), /守了 6 步/);
});

test("W120：過關跳回門內、被破的吐司延後才做：到時換了頁或已經開了別盤就不做；還在這一盤照做", () => {
  const GP = { id: "jh:guard:screen", game: "g1", jhg: { limit: 10 } }, flush = (L) => { while (L.calls.timers.length) L.calls.timers.shift()() };
  /* 過關：還在這一盤 → 1.8 秒後跳回門內 */
  let L = load({ defer: 1, store: { jPending: J(GP) } }), b0 = board(L.R.JH_SCR_GUARD.fen);
  L.R.lvWatch(st(b0, 10), {}); assert.equal(L.calls.timers.length, 1); assert.deepEqual(L.calls.hash, [], "還沒到時間不跳");
  flush(L); assert.deepEqual(L.calls.hash, ["#/jianghu/hall/screen"]);
  /* 過關後 1.8 秒內開了新的一盤（jPending 指到 g2）→ 不跳 */
  L = load({ defer: 1, store: { jPending: J(GP) } });
  L.R.lvWatch(st(b0, 10), {}); L.mem.jPending = { id: "jh:guard:screen", game: "g2", jhg: { limit: 10 } }; flush(L);
  assert.deepEqual(L.calls.hash, [], "已經開了別盤：不把人拉走");
  /* 過關後換了頁（route 走過一次）→ 不跳 */
  L = load({ defer: 1, store: { jPending: J(GP) } });
  L.R.lvWatch(st(b0, 10), {}); L.c.route(); flush(L);
  assert.deepEqual(L.calls.hash, [], "換過頁：不跳");
  /* 被破：還在這一盤 → 吐司照出；守的步數當下就記 */
  L = load({ defer: 1, store: { jPending: J(GP) } });
  L.R.journeyGameEnd(st(b0, 6, { result: { w: "r" } })); assert.equal(L.R.jhScrGet().best, 6, "步數當下就記");
  assert.equal(L.calls.toast.length, 0); flush(L); assert.match(L.calls.toast.at(-1), /守了 6 步/);
  /* 被破後換了頁、或開了別盤 → 吐司不出，步數照記 */
  L = load({ defer: 1, store: { jPending: J(GP) } });
  L.R.journeyGameEnd(st(b0, 6, { result: { w: "r" } })); L.c.route(); flush(L);
  assert.equal(L.calls.toast.length, 0, "換過頁：不出吐司"); assert.equal(L.R.jhScrGet().best, 6);
  L = load({ defer: 1, store: { jPending: J(GP) } });
  L.R.journeyGameEnd(st(b0, 6, { result: { w: "r" } })); L.mem.jPending = { id: "x", game: "g9" }; flush(L);
  assert.equal(L.calls.toast.length, 0, "開了別盤：不出吐司");
});

test("對局頁頂欄名稱：守中宮另外寫，其他照原本", () => {
  const { R } = load();
  assert.equal(R.jName("jh:guard:screen"), "屏風馬門・雙馬守中宮");
  assert.equal(R.jName("park"), "原本:park");
});

test("〔混合〕Pikafish 盤整 P1（11/24）挑錯著：按「就是這步」但不是錯的那手時，停在紅方那手（n 奇數）要說「這是紅方走的」、黑方那手說「沒問題」、還沒走說先往下看", () => {
  /* 取出 07z9c 裡按「就是這步」答錯時的那一句（三元式），用假的 jhL 跑：n＝目前顯示到第幾手，mv[n-1] 是剛顯示的那手、mv[0] 是紅方 */
  const m = SRC.match(/else say\((n[=%][^;]*?)\)\};/);
  assert.ok(m, "找不到挑錯著答錯那一句");
  const say = vm.runInNewContext("(n)=>(" + m[1] + ")", { jhL: (zh) => zh });
  assert.match(say(1), /紅方走的/, "第 1 手是紅方");
  assert.match(say(3), /紅方走的/, "第 3 手是紅方");
  assert.match(say(2), /沒問題/, "第 2 手是黑方（不是錯的那手）");
  assert.match(say(4), /沒問題/);
  assert.match(say(0), /還沒走棋/);
});

test("挑錯著、算帳每天只給一次修為 +10（換日再給）", () => {
  const { R, calls, mem } = load();
  assert.equal(R.jhScrDayXP("de", "女塾課堂"), 10);
  assert.equal(R.jhScrDayXP("de", "女塾課堂"), 0);
  assert.equal(R.jhScrDayXP("da", "算盤算帳"), 10);
  assert.equal(calls.xp.length, 2);
  const L = load({ store: { jhScreen: mem.jhScreen }, day: "2026-11-23" });
  assert.equal(L.R.jhScrDayXP("de", "女塾課堂"), 10);
});

test("門內設定：前院不站門人、沒有前院入口；石馬、算盤兩個入口；中炮門不受影響", () => {
  const { c } = load();
  const H = c.JH_HALL.screen;
  assert.ok(H && H.v && H.seat && H.w);
  assert.deepEqual(Object.keys(H.spots).sort(), ["gate", "hall", "study"]);
  assert.equal(H.mates, undefined);
  assert.deepEqual(Object.keys(H.extra).sort(), ["abacus", "horse"]);
  for (const p of [...Object.values(H.spots), ...Object.values(H.extra), H.seat]) assert.ok(p[0] > 0 && p[0] < 768 && p[1] > 0 && p[1] < 1376, "座標在圖內：" + p);
  assert.ok(c.JH_HALL.central.mates && c.JH_HALL.central.spots.yard, "中炮門照舊");
  /* 11/22 開發者實機「怎麼會坐在桌子上」：立繪下面裁掉 cut，裁切線要落在桌子後緣（原圖 y≈270，容許 ±4）；立繪 380×512 */
  assert.ok(H.cut > 0.2 && H.cut < 0.45, "要裁掉下半截：" + H.cut);
  /* 11/22 史學顧問 191「全圖無字」：掌門抱的大棋子「屏」字從立繪高 0.59 起，裁切要藏住；圖換過（後牆掛物塗平）要升 v */
  assert.ok(H.cut >= 0.42, "要藏住棋子上的字：" + H.cut);
  assert.notStrictEqual(H.v, "1122", "門內圖換過要升版");
  const line = H.seat[1] - H.w * 512 / 380 * H.cut;
  assert.ok(Math.abs(line - 270) <= 4, "裁切線要對齊桌子後緣：" + line.toFixed(1));
  assert.match(rd("xiangqi-db/m/07z9b-jianghu.js"), /\(H\.cut\?`;clip-path:inset\(0 0 \$\{H\.cut\*100\}% 0\)/, "裁切在共用的 JhHall 裡做（中炮門一起改）");
});

test("3D 走路：起點叫 dock（07z9b 傳 home:\"dock\"）、每個入口的停靠點都在路網上、路網連通", () => {
  const { c } = load();
  const W = c.JH_HALL_WALK.screen, N = W.N, E = W.E.split(" ").map((e) => e.split("-"));
  assert.ok(N.dock, "07z9b jhHallWalk 對每一派都傳 home:\"dock\"，沒有 dock 3D 角色就掛不上");
  for (const [a, b] of E) assert.ok(N[a] && N[b], "邊的兩端要在路網上：" + a + "-" + b);
  for (const k of ["hall", "zm", "abacus", "study", "horse", "gate"]) assert.ok(W.HS[k] && N[W.HS[k][0]], "入口 " + k + " 的停靠點要在路網上");
  const seen = new Set(["dock"]), q = ["dock"];
  while (q.length) { const x = q.shift(); for (const [a, b] of E) for (const [u, v] of [[a, b], [b, a]]) if (u === x && !seen.has(v)) { seen.add(v); q.push(v) } }
  assert.deepEqual([...seen].sort(), Object.keys(N).sort(), "每個點都走得到");
  /* 跟中炮門不同：上大廳要從左邊迴廊口繞（不經過課堂正中） */
  assert.ok(!E.some(([a, b]) => (a === "cf" && b === "ct") || (a === "ct" && b === "cf")));
});

test("〔原始碼〕m.html 在 07z9b 之後引入 07z9c；存檔清單有 m_jhScreen；一行程式沒有 // 註解", () => {
  const html = rd("xiangqi-db/m.html");
  const i = html.indexOf("//#include m/07z9b-jianghu.js"), j = html.indexOf("//#include m/07z9c-screen.js");
  assert.ok(i > 0 && j > i);
  assert.match(rd("xiangqi-db/m/05b-save.js"), /JOURNEY_KEYS\.push\("m_jhScreen"\)/);
  assert.ok(!SRC.includes("\r"), "不能有 CR");
  for (const l of SRC.split("\n")) if (/[;})]\s*\/\/(?!#)/.test(l) && !/https?:\/\//.test(l)) assert.fail("一行程式後面接 // 註解會吃掉後面的程式：" + l.slice(0, 80));
});
