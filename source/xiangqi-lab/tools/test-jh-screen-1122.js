// W48 屏風馬門門內（開發者 11/22：「讓屏風馬更有其他特色，和中炮門有差異，不要用同樣玩法」；選單：三種玩法都做、前院不站門人）：m/07z9c-screen.js。
//   這裡用 vm 跑真的 07z9c，外面的存檔、開局、修為、對局頁用假的記下呼叫。
//   挑錯著、算帳的題庫資料（data/zmhall/screen-*.json）另有 test-zm-screen-data-1122.js 檢查（W48-S2，Windows Claude 2）。
// 用法：node --test xiangqi-lab/tools/test-jh-screen-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const SRC = rd("xiangqi-db/m/07z9c-screen.js");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const J = (x) => JSON.parse(JSON.stringify(x));

function load(o = {}) {
  const mem = Object.assign({}, o.store || {}), calls = { jstart: [], xp: [], toast: [], hash: [], watch0: 0, end0: 0, rsfin: [] };
  const loc = { hash: "#/journey/play" };
  const c = {
    window: { XQCore: C }, document: undefined,
    location: { get hash() { return loc.hash }, set hash(h) { loc.hash = h; calls.hash.push(h) } },
    navKey: (h) => String(h).replace(/^#/, ""),
    jhL: (zh) => zh, jhT: (s) => s, esc: (s) => String(s), oscEn: () => false, i18nWxf: () => null,
    jhWindDay: () => o.day || "2026-11-22",
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = v == null ? v : J(v) } },
    toast: (s) => calls.toast.push(s), setTimeout: (f) => f(), closeSheet() {},
    addXP: (n, why, key) => calls.xp.push([n, key]), rsFin: (id) => calls.rsfin.push(id),
    parkNpcLv: () => 4,
    jStart: (id, b, go) => { calls.jstart.push({ id, b }); mem.jPending = { id, game: "g1" }; go(true) },
    lvWatch: () => { calls.watch0++ }, journeyGameEnd: () => { calls.end0++ }, jName: (j) => "原本:" + j,
    JhHall: () => ({}),
    JH_HALL: { central: { v: "1122", seat: [387, 297], w: 72, spots: { hall: [384, 112], study: [226, 458], yard: [384, 1008], gate: [384, 1330] }, mates: [[296, 1150], [472, 1150]] } },
    JH_HALL_WALK: { central: {} },
  };
  vm.createContext(c);
  vm.runInContext(SRC + ";this.R={JH_SCR_GUARD,JH_SCR_J,jhScrGet,jhScrBig,jhScrGuardEval,jhScrGuardStart,jhScrGuardOf,jhScrDayXP,jhScrBoardAt,lvWatch,journeyGameEnd,jName,JhHall}", c);
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

test("大子淨虧 3 分以上：當場失敗、不給修為、記最多守幾步", () => {
  const { R, calls, mem } = load({ store: { jPending: { id: "jh:guard:screen", game: "g1", jhg: { limit: 10 } } } });
  const b0 = board(R.JH_SCR_GUARD.fen), noHorse = b0.slice(); noHorse[b0.indexOf("n")] = null;
  R.lvWatch(st(noHorse, 4), {});
  assert.equal(mem.jPending, null);
  assert.equal(calls.xp.length, 0);
  assert.match(calls.toast.at(-1), /沒守住/);
  assert.equal(R.jhScrGet().best, 4);
  assert.equal(R.jhScrGet().g, null);
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

test("對局頁頂欄名稱：守中宮另外寫，其他照原本", () => {
  const { R } = load();
  assert.equal(R.jName("jh:guard:screen"), "屏風馬門・雙馬守中宮");
  assert.equal(R.jName("park"), "原本:park");
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
