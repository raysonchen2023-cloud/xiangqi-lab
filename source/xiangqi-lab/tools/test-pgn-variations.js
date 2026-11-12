// 第 11 輪 X1「棋譜匯出支援變著（Variations）分支樹」的自動測試，不開瀏覽器（vm 載入 xiangqi-db/m/10d-coach.js，用 site/core.js 的真規則）：
//   ① 匯出 PGN：變著用 ( ) 寫在被取代的那一步後面、可以巢狀，回合數照 PGN 標準（黑方那步「1...」，變著後輪到黑方補「1...」），{註解} 也寫進變著
//   ② 匯出中文記譜：「【變著】」一段一行（變著 1、變著 2-1…，第幾步起、哪一方改走）
//   ③ 匯入：PGN 的 ( ) 和中文記譜的【變著】都讀回同一棵變著樹（匯出 → 匯入 → 樹一樣）；黑先局面也對
//   ④ 棋譜資料（/db/item 的 lines、檢討頁的自由走棋）→ 變著樹（pgnAltsOf）：同一走法只留一份、批註照隱私規則、不合法的支線停下
//   ⑤ 壞掉的變著不弄壞主線：不合法、看不懂、沒收尾、變著裡的結果記號、「((」；存成「我的研究」只存主線，變著抄在開頭說明
// 用法：node --test xiangqi-lab/tools/test-pgn-variations.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const C = require("../site/core.js");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SRC = rd(path.join(M, "10d-coach.js"));
const J = x => JSON.parse(JSON.stringify(x)), deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);

function load() {
  const mem = {};
  const ctx = { console, TextEncoder, TextDecoder, btoa, atob, isFinite, Date, Math, JSON, encodeURIComponent, decodeURIComponent,
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    esc: s => String(s == null ? "" : s), evt: () => "", myName: () => "小明", oppTw: s => String(s), PLAYER: { r: "紅方", b: "黑方" }, navigator: {} };
  ctx.window = ctx; ctx.XQCore = C; vm.createContext(ctx);
  vm.runInContext(SRC + ";this.X={pgnBuild,pgnTxt,pgnFromItem,pgnAltsOf,pgnIParse,pgnIStudy,pgnHasAlt,pgnTxtVars,pgnMvTk,pgnParen};", ctx, { filename: "10d-coach.js" });
  return ctx.X;
}
const X = load();
const sq = u => [C.parseSq(u.slice(0, 2)), C.parseSq(u.slice(2, 4))];
/* 照 ICCS 走出一串著法（每步都要合法），附中文記譜；alts＝{第幾步(0 起): [[ICCS…, {alts}]…]}，變著從那一步走之前的局面開始 */
function line(b, s, spec) {
  const out = [];
  for (const it of spec) {
    const u = typeof it === "string" ? it : it.u, [f, t] = sq(u);
    assert.ok(C.legal(b, s).some(([x, y]) => x === f && y === t), "不合法：" + u);
    const m = { f, t, cn: C.notate(b, f, t), note: (it && it.note) || "" };
    if (it.alts) m.alts = it.alts.map(a => line(b, s, a));
    out.push(m); b = C.make(b, f, t); s = C.opp(s);
  }
  return out;
}
/* 樹的樣子：每一步 ICCS＋變著（比對用） */
const shape = ms => (ms || []).map(m => { const o = { u: C.iccs(m.f, m.t) }; if (m.alts && m.alts.length) o.a = m.alts.map(shape); return o });
const start = () => C.parseFen(C.START);
/* 主線：炮二平五 馬8進7 傌二進三 車9平8；第 1 步的變著：兵七進一 馬8進7；第 2 步的變著：馬2進3 傌二進三（裡面再有一段：傌八進七） */
const SPEC = [{ u: "h2e2", alts: [[{ u: "c3c4", note: "仙人指路" }, "h9g7"]] }, { u: "h9g7", alts: [["b9c7", { u: "h0g2", alts: [["b0c2"]] }]] }, "h0g2", "i9h9"];
const game = () => ({ board: start(), side: "r", moves: line(start(), "r", SPEC), title: "甲 對 乙", red: "甲", black: "乙", event: "變著測試", date: "2026-11-12", result: "和" });
const body = pgn => pgn.split("\n\n").slice(1).join("\n\n").trim().split("\n").join(" ");

test("匯出 PGN：變著寫在被取代的那一步後面，用 ( ) 巢狀；黑方那步「1...」、變著後輪到黑方補「1...」", () => {
  const g = game(), pgn = X.pgnBuild(g, {});
  assert.equal(body(pgn), "1. H2-E2 (1. C3-C4 H9-G7) 1... H9-G7 (1... B9-C7 2. H0-G2 (2. B0-C2)) 2. H0-G2 I9-H9 1/2-1/2");
  for (const ln of pgn.split("\n")) assert.ok(ln.length <= 80 || !/ /.test(ln), "一行不超過 80 字：" + ln);
  assert.equal(body(X.pgnBuild(g, { vars: false })), "1. H2-E2 H9-G7 2. H0-G2 I9-H9 1/2-1/2", "不附變著＝只有主線（跟原本一樣）");
  const c = X.pgnBuild(g, { cm: true });
  assert.ok(body(c).includes("(1. C3-C4 {仙人指路} 1... H9-G7)"), "變著裡的註解；註解後面輪到黑方補回合數：" + body(c));
  const g0 = { ...g, moves: line(start(), "r", ["h2e2", "h9g7"]) }; assert.equal(X.pgnHasAlt(g0.moves), false);
  assert.equal(body(X.pgnBuild(g0, {})), "1. H2-E2 H9-G7 1/2-1/2", "沒有變著的棋譜輸出不變");
});

test("匯出中文記譜：主線每回合一行照舊，「【變著】」一段一行，標第幾步起、哪一方改走，巢狀標 2-1", () => {
  const t = X.pgnTxt(game(), {});
  assert.match(t, /^1\. 炮二平五　馬8進7$/m); assert.match(t, /^2\. 傌二進三　車9平8$/m);
  const i = t.indexOf("【變著】"), j = t.indexOf("結果："); assert.ok(i > 0 && j > i, "變著在主線後面、結果前面");
  deq(t.slice(i, j).trim().split("\n"), ["【變著】", "變著 1（第 1 步起，紅方改走）：1. 兵七進一　馬8進7", "變著 2（第 2 步起，黑方改走）：1. ……　馬2進3　2. 傌二進三", "變著 2-1（第 3 步起，紅方改走）：2. 傌八進七"]);
  assert.ok(!/【變著】|^變著 /m.test(X.pgnTxt(game(), { vars: false })), "不附變著");
  assert.ok(!X.pgnTxt({ ...game(), moves: line(start(), "r", ["h2e2"]) }, {}).includes("【變著】"), "沒有變著就沒有這一段");
});

test("往返：PGN 匯出 → 匯入，變著樹（含巢狀、註解）一樣；中文記譜匯出 → 匯入也一樣", () => {
  const g = game(), want = shape(g.moves);
  for (const [nm, txt] of [["PGN", X.pgnBuild(g, { cm: true })], ["PGN 不帶註解", X.pgnBuild(g, {})], ["中文記譜", X.pgnTxt(g, {})]]) {
    const R = X.pgnIParse(txt); assert.equal(R.length, 1, nm + " 讀成一盤"); const G = R[0];
    assert.equal(G.err, null, nm); assert.equal(G.varBad, 0, nm); assert.equal(G.vars, 2, nm + "：最外層 2 段");
    deq(shape(G.moves), want, nm + " 樹一樣"); assert.equal(G.red, "甲"); assert.equal(G.res, "1/2-1/2");
  }
  const G = X.pgnIParse(X.pgnBuild(g, { cm: true }))[0];
  assert.equal(G.moves[0].alts[0][0].note, "仙人指路", "變著的註解留在變著那一步"); assert.equal(G.moves[0].note, "", "沒跑到主線");
  for (const m of [G.moves[0].alts[0][0], G.moves[1].alts[0][1].alts[0][0]]) assert.ok(m.cn && /^[兵傌]/.test(m.cn), "變著每一步有中文記譜");
});

test("黑先的局面：變著回合數、中文記譜「……」、匯入讀回都對", () => {
  const fen = "4k4/9/9/9/9/9/9/9/4A4/3K5", b0 = C.parseFen(fen);
  const ms = line(b0.slice(), "b", [{ u: "e9e8", alts: [["e9f9", "d0d1"]] }, "d0d1", { u: "e8e9", alts: [["e8f8"]] }]);
  const g = { board: b0, side: "b", moves: ms, title: "黑先", result: "" };
  const pgn = X.pgnBuild(g, {});
  assert.match(pgn, /\[FEN "4k4\/9\/9\/9\/9\/9\/9\/9\/4A4\/3K5 b/);
  assert.equal(body(pgn), "1... E9-E8 (1... E9-F9 2. D0-D1) 2. D0-D1 E8-E9 (2... E8-F8) *");
  const t = X.pgnTxt(g, {}); assert.match(t, /^變著 1（第 1 步起，黑方改走）：1\. ……　將5平6　2\. 帥六進一$/m); assert.match(t, /^變著 2（第 3 步起，黑方改走）：2\. ……　將5平6$/m);
  for (const s of [pgn, t]) { const G = X.pgnIParse(s)[0]; assert.equal(G.err, null); deq(shape(G.moves), shape(ms)) }
});

test("棋譜資料 lines → 變著樹：子線接在分出去的那一步、同走法只留一份、書上批註帶上（自己的對局不帶）", () => {
  const main = line(start(), "r", ["h2e2", "h9g7", "h0g2", "i9h9"]), v1 = line(C.make(start(), ...sq("h2e2")), "b", ["b9c7", "h0g2"]);
  let b = start(); for (const u of ["h2e2", "b9c7"]) b = C.make(b, ...sq(u)); const v2 = line(b, "r", ["b0c2"]);
  const it = { board: start(), red: "王", black: "李", lines: [{ id: 0, parent: null, start: 1, moves: main }, { id: 1, parent: 0, start: 2, moves: v1 }, { id: 2, parent: 1, start: 3, moves: v2 },
    { id: 3, parent: 0, start: 3, moves: line(C.make(C.make(start(), ...sq("h2e2")), ...sq("h9g7")), "r", ["h0g2"]) }], comments: { "0_1": "主線批註", "1_2": "書上變著批註", "2_3": "再一層" } };
  const G = X.pgnFromItem(it, { notes: true });
  deq(shape(G.moves), [{ u: "h2e2" }, { u: "h9g7", a: [[{ u: "b9c7" }, { u: "h0g2", a: [[{ u: "b0c2" }]] }]] }, { u: "h0g2" }, { u: "i9h9" }], "跟主線一樣的第 3 號線不重複");
  assert.equal(G.moves[0].note, "主線批註"); assert.equal(G.moves[1].alts[0][0].note, "書上變著批註"); assert.equal(G.moves[1].alts[0][1].alts[0][0].note, "再一層");
  const P = X.pgnFromItem(it, { notes: false }); assert.equal(P.moves[1].alts[0][0].note, "", "自己的對局不帶批註");
  assert.ok(!X.pgnBuild(P, { cm: true }).includes("書上變著批註"));
  // 檢討頁看的是 1 號線：主線＝1 號線，原本的主線變成變著
  const ms = line(start(), "r", ["h2e2", "b9c7", "h0g2"]); X.pgnAltsOf(ms, it, 1, {});
  deq(shape(ms), [{ u: "h2e2" }, { u: "b9c7", a: [[{ u: "h9g7" }, { u: "h0g2" }, { u: "i9h9" }]] }, { u: "h0g2", a: [[{ u: "b0c2" }]] }]);
  // 壞資料：不合法的支線停在前一步，不出錯
  const bad = { ...it, lines: [it.lines[0], { id: 9, parent: 0, start: 2, moves: [{ f: sq("b9c7")[0], t: sq("b9c7")[1] }, { f: 0, t: 89 }] }] };
  const B = X.pgnFromItem(bad, {}); deq(B.moves[1].alts.map(shape), [[{ u: "b9c7" }]]); assert.ok(B.moves[1].alts[0][0].cn, "缺中文記譜時自己補");
});

test("檢討頁的自由走棋／Pikafish 推演（FREE）當成一段變著：從第幾步分出去、評等與來源寫進註解", () => {
  const it = { board: start(), lines: [{ id: 0, parent: null, start: 1, moves: line(start(), "r", ["h2e2", "h9g7", "h0g2"]) }], comments: {} };
  let b = C.make(C.make(start(), ...sq("h2e2")), ...sq("h9g7"));
  const fr = line(b, "r", ["b0c2", "i9h9"]).map((m, i) => ({ f: m.f, t: m.t, cn: m.cn, g: i ? {} : { q: "妙著" } }));
  const ms = line(start(), "r", ["h2e2", "h9g7", "h0g2"]); X.pgnAltsOf(ms, it, 0, { free: { base: 2, moves: fr, src: "Pikafish 第 1 條變化" } });
  deq(shape(ms), [{ u: "h2e2" }, { u: "h9g7" }, { u: "h0g2", a: [[{ u: "b0c2" }, { u: "i9h9" }]] }]);
  const a = ms[2].alts[0][0]; assert.equal(a.note, "Pikafish 第 1 條變化"); assert.equal(a.q, "妙著");
  assert.ok(X.pgnBuild({ board: start(), side: "r", moves: ms, result: "" }, { cm: true }).includes("(2. B0-C2 {妙著；Pikafish 第 1 條變化}"));
  const ms2 = line(start(), "r", ["h2e2", "h9g7", "h0g2"]); X.pgnAltsOf(ms2, it, 0, { free: { base: 3, moves: fr, src: "x" } }); assert.equal(X.pgnHasAlt(ms2), false, "從最後一步之後接著走的不是變著");
});

test("壞掉的變著不弄壞主線：不合法停在前一步、看不懂、沒收尾、變著裡的結果記號、((；中文記譜的變著也一樣", () => {
  const P = s => X.pgnIParse(s)[0];
  let G = P("1. H2-E2 (1. Z9-Z9 H9-G7) H9-G7 *"); assert.equal(G.err, null); assert.equal(G.moves.length, 2); assert.equal(G.varBad, 1); assert.equal(X.pgnHasAlt(G.moves), false);
  G = P("1. H2-E2 (1. C3-C4 E9-E5) H9-G7 *"); deq(shape(G.moves), [{ u: "h2e2", a: [[{ u: "c3c4" }]] }, { u: "h9g7" }], "不合法那一步之前留著"); assert.equal(G.varBad, 1);
  G = P("1. H2-E2 (1. C3-C4 1-0) H9-G7 *"); assert.equal(X.pgnIParse("1. H2-E2 (1. C3-C4 1-0) H9-G7 *").length, 1, "變著裡的 1-0 不算一盤結束"); assert.equal(G.moves.length, 2); assert.equal(G.res, "");
  G = P("1. H2-E2 (1. C3-C4"); deq(shape(G.moves), [{ u: "h2e2", a: [[{ u: "c3c4" }]] }], "沒收尾的括號");
  G = P("(1. C3-C4) 1. H2-E2 *"); assert.equal(G.moves.length, 1); assert.equal(X.pgnHasAlt(G.moves), false, "第一步之前的變著沒地方掛，略過");
  G = P("1. H2-E2 H9-G7 2. H0-G2 ((2. B0-C2)) I9-H9 *"); assert.equal(G.moves.length, 4); assert.equal(G.vars, 1); assert.equal(X.pgnHasAlt(G.moves), false);
  G = P("1. 炮二平五 (1. 兵七進一 馬8進7) 馬8進7 2. 傌二進三 *"); assert.equal(G.err, null); deq(shape(G.moves), [{ u: "h2e2", a: [[{ u: "c3c4" }, { u: "h9g7" }]] }, { u: "h9g7" }, { u: "h0g2" }], "中文著法的 ( ) 變著");
  const txt = "【測試】\n紅方：甲　黑方：乙\n\n1. 炮二平五　馬8進7\n\n【變著】\n變著 1（第 1 步起，紅方改走）：1. 兵七進一　將5進9\n變著 1-1（第 2 步起，黑方改走）：1. ……　馬2進3\n變著 3（第 9 步起，紅方改走）：5. 兵七進一\n\n結果：和局（1/2-1/2）\n";
  G = P(txt); assert.equal(G.err, null); deq(shape(G.moves), [{ u: "h2e2", a: [[{ u: "c3c4" }]] }, { u: "h9g7" }], "中文記譜變著：不合法停在前一步、找不到那一步的略過");
  assert.equal(G.varBad, 3, "1：將5進9 不合法；1-1：上一層沒有第 2 步；3：主線沒有第 9 步"); assert.equal(G.result, "和局");
});

test("存成「我的研究」：只存主線（local.js 只收 0_N），變著抄在第 0 步的開頭說明、原本的說明照舊在最後", () => {
  const G = X.pgnIParse('[Red "甲"]\n{開局說明}\n' + body(X.pgnBuild(game(), {})))[0], S = X.pgnIStudy(G);
  deq(S.moves, G.moves.map(m => [m.f, m.t])); assert.equal(S.moves.length, 4);
  assert.ok(Object.keys(S.comments).every(k => /^0_\d+$/.test(k)));
  assert.match(S.comments["0_0"], /變著（「我的研究」只存主線，變著抄在這裡）：\n變著 1（第 1 步起，紅方改走）：1\. 兵七進一　馬8進7\n變著 2（第 2 步起/);
  assert.match(S.comments["0_0"], /開局說明$/, "原本的說明在最後");
  assert.ok(!/變著/.test(X.pgnIStudy(X.pgnIParse("1. H2-E2 H9-G7 *")[0]).comments["0_0"] || ""), "沒有變著就不寫");
});

test("〔原始碼〕接線：檢討頁匯出把其他分支和自由走棋一起交給 pgnAltsOf；匯出視窗有「附上變著」勾選（store pgnVar）；匯入視窗寫幾段變著", () => {
  const DBJ = rd(path.join(M, "10-db.js"));
  assert.match(DBJ, /function exportPgn\(\)\{[\s\S]{0,600}?pgnAltsOf\(g\.moves,it,line,\{notes:!mine,free:FREE&&FREE\.all\.length\?\{base:FREE\.base,moves:FREE\.all,src:FREE\.src\|\|"自由走棋"\}:null\}\)/);
  assert.match(SRC, /id="pxV"[^>]*> 附上變著（分支）/); assert.match(SRC, /store\.set\("pgnVar",vars\)/);
  assert.match(SRC, /g\.vars\?"・"\+g\.vars\+" 段變著/); assert.ok(!SRC.includes("只匯出目前看的這一條著法（不含變著）"), "舊的「不含變著」說明拿掉了");
});
