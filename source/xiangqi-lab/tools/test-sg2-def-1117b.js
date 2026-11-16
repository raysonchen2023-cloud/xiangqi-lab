// 11/17 iMac 模擬器（iPhone 18 Pro、候選版 0156）星門圍城：
//   第 17 項（P2）資料卡防禦跟攻擊預覽矛盾：序章 A1 黑士資料卡寫「防 13（士相護線 +10、護帥 ×1.2）」，俥（攻 30）的預覽卻是「防−15」（打不動）；A2 同一顆士寫「防 31」。
//     查：兩邊本來就都用 SG2.defAt，13 是「打不動、防禦降 15」之後的值（16→1，(1+10)×1.2＝13）；31 是打之前。資料卡沒寫被打降過、預覽只寫「防−攻擊力的一半」，看起來就矛盾。
//     修法（07sg2）：預覽寫「防 現在→打完」（現在＝c.D＝資料卡那個數，打完＝SG2.defWith 實算）；資料卡被打降過寫「原本 31、被打降 18」（SG2G.defBase＋SG2.defWith）；
//       護帥改用 SG2.guarded 判斷（原本用「比基礎大」猜，紅方天賦加防會誤寫護帥），紅方天賦加的防寫「天賦 +N」。
//   第 18 項（P2）打不動沒有畫面回饋：td.ev 的打不動記下 D0→D1 和攻擊力；跳字「打不動・防 31→13」大一號（sg2no）＋被打的子閃一圈（bhtdFx ring）；
//     下方資料卡自動換成被打的那顆（SG2_PICK）；每次打不動都跳一句短提示（序章第一次照舊是較長的教學句，數字改成同一套）。
// 不開瀏覽器：vm 載 07bhg＋07sg2，用真的規則跑回報的步驟。用法：node --test xiangqi-lab/tools/test-sg2-def-1117b.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const C = require(path.join(ROOT, "xiangqi-lab/site/core.js"));
const SG2SRC = rd("xiangqi-db/m/07sg2-siege2.js"), GSVSRC = rd("xiangqi-db/m/07bhg-gatesiege.js");

function kit(lvPick) {
  const mem = {}, toasts = [], floats = [], fx = [];
  const ctx = {
    console, Math, JSON, Date, store: { get: (k, d) => k in mem ? mem[k] : d, set: (k, v) => { mem[k] = v } }, toast: t => toasts.push(t), vibrate() { }, axSay() { },
    esc: s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]),
    setTimeout: f => { f(); return 0 }, clearTimeout() { }, performance: { now: () => 0 }, XQCore: C,
    bhtdFloat: (t, p, c) => floats.push({ t, c }), bhtdXY: q => ({ x: q, y: q }), bhtdFx: (k, q) => fx.push([k, q])
  };
  vm.createContext(ctx);
  vm.runInContext(GSVSRC + "\n" + SG2SRC + "\n;this.__X={GSV,SG2,SG2G,sg2On,sg2Tap,sg2Marks,sg2PieceInfo,sg2Events,sg2Ev,setSt:s=>{GSV_ST=s},pick:()=>SG2_PICK,sel:()=>SG2_SEL,setPick:q=>{SG2_PICK=q}};", ctx);
  const X = ctx.__X, lv = lvPick ? lvPick(X) : X.SG2G.GRP[0].lv[0], start = X.GSV.startFen(lv, C);
  const P = { id: "g1", start, startTurn: "r", board: C.parseFen(start), turn: "r", moves: [], human: "r", pos: [], result: null };
  P.pos = [C.fen(P.board, "r")];
  P.td = X.SG2G.boot({ mode: X.SG2G.MODE, lv, diff: 1, sq: null, sk: [], tal: {} }, P, C);
  const mv = (f, t) => { const r = X.SG2G.play(P, f, t, C); if (r.end) P.result = { w: r.end.w, why: r.end.why }; return r };
  const legal = () => { P.legal = X.SG2G.legal(P, C); return P.legal };
  X.setSt(P);
  return { X, P, mv, legal, toasts, floats, fx, lv };
}
/* 格號＝列×9＋行（第 0 列是黑方底線）：a0＝0、d0＝3（黑方左士）、f0＝5、e1＝13；俥一開始在 a5＝45 */
const A0 = 0, D0 = 3, F0 = 5, E1 = 13;
const cardDef = h => { const m = /<span>防<\/span> <b>(\d+)<\/b>/.exec(h); return m ? +m[1] : null };
const setup = () => { const K = kit(); K.legal(); K.mv(45, A0); K.mv(F0, E1); K.legal(); return K };

test("〔第 17 項〕打之前：資料卡「防 31（士相護線 +10、護帥 ×1.2）」＝預覽的 c.D；預覽寫「防31→13」（打完實際降到多少）", () => {
  const K = setup(), S = K.P.td.s, h = K.X.sg2PieceInfo(K.P.td, D0);
  assert.equal(cardDef(h), 31); assert.ok(h.includes("士相護線 +10、護帥 ×1.2"), h); assert.ok(!h.includes("原本"), "沒被打過不寫原本");
  const c = K.X.SG2G.pv(K.P, A0, D0); assert.equal(c.ok, false); assert.equal(c.D, 31, "預覽的防禦＝資料卡"); assert.equal(c.D1, 13, "打完 (1+10)×1.2");
  assert.equal(S.d[D0], 16, "預覽不改狀態");
  K.X.sg2Tap(K.P, A0, -1); assert.equal(K.X.sel(), A0, "選了俥");
  const L = K.X.sg2Marks(K.P).find(m => m.sq === D0 && /^pv /.test(m.k)); assert.ok(L, "士上有預覽"); assert.equal(L.t, "防31→13");
});

test("〔第 17 項〕打不動之後：資料卡「防 13（原本 31、被打降 18、士相護線 +10、護帥 ×1.2）」，跟預覽、實際扣血用同一個數", () => {
  const K = setup(); K.mv(A0, D0); const S = K.P.td.s; assert.equal(S.d[D0], 1);
  const h = K.X.sg2PieceInfo(K.P.td, D0); assert.equal(cardDef(h), 13);
  assert.ok(h.includes("原本 31、被打降 18、士相護線 +10、護帥 ×1.2"), h);
  assert.equal(K.X.SG2G.defBase(K.P.td, D0), 16, "黑士開局防禦（Lv1、易 ×0.9）");
  const L = K.X.SG2G.legal(K.P, C, "b"), bm = L.find(([f, t]) => f === 29 && t === 38) || L.find(([f]) => S.b[f] === "p"); K.mv(bm[0], bm[1]); K.legal();
  const c = K.X.SG2G.pv(K.P, A0, D0); assert.equal(c.D, 13, "預覽的防禦＝資料卡的 13"); assert.equal(c.ok, true);
  assert.equal(K.X.SG2.calc(S, A0, D0).D, cardDef(K.X.sg2PieceInfo(K.P.td, D0)), "實際扣血那一下（SG2.calc）用的也是 13");
});

test("〔第 17 項〕每一個打得到的敵子：資料卡的防禦＝預覽的 D（走幾步隨機局面都對）", () => {
  const K = kit(), S = K.P.td.s; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let n = 0; n < 24 && !K.P.result; n++) {
    const L = K.legal();
    for (const [f, t] of L) if (S.b[t]) assert.equal(cardDef(K.X.sg2PieceInfo(K.P.td, t)), K.X.SG2G.pv(K.P, f, t).D, `第 ${n} 步 ${f}→${t}`);
    const att = L.filter(([f, t]) => S.b[t]), m = att.length && rnd() < .7 ? att[Math.floor(rnd() * att.length)] : L[Math.floor(rnd() * L.length)]; K.mv(m[0], m[1]);
    if (K.P.result) break; const B = K.X.SG2G.legal(K.P, C, "b"); if (!B.length) break; const b = B[Math.floor(rnd() * B.length)]; K.mv(b[0], b[1]);
  }
});

test("〔第 17 項〕紅方天賦加防不再誤寫「護帥」：寫「天賦 +N」，護帥照位置判斷", () => {
  const K = kit(), S = K.P.td.s; S.bx = { a: {}, d: { R: 5 } };
  const h = K.X.sg2PieceInfo(K.P.td, 45); assert.equal(cardDef(h), K.X.SG2.defAt(S, 45));
  assert.ok(h.includes("天賦 +5"), h); assert.ok(!h.includes("護帥"), "俥在 a5，不在九宮、不在帥旁邊");
  assert.equal(K.X.SG2.guarded(S, 45), false); assert.equal(K.X.SG2.guarded(S, D0), true, "黑士在九宮裡");
  assert.equal(K.X.SG2.defWith(S, D0, 1), 1, "開局士沒有護線：1×1.2"); assert.equal(K.X.SG2.defWith(S, D0, 16), 19); assert.equal(S.d[D0], 16, "defWith 不改狀態");
});

test("〔第 18 項〕打不動：事件記 D0→D1、攻擊力；跳字「打不動・防 31→13」大一號、被打的子閃一圈；序章第一次跳教學句（數字同一套）", () => {
  const K = setup(); K.mv(A0, D0); const e = K.P.td.ev.filter(x => x.k === "att").pop();
  assert.equal(e.ok, 0); assert.equal(e.D0, 31); assert.equal(e.D1, 13); assert.equal(e.A, 30);
  K.X.sg2Ev(e);
  assert.deepEqual(K.floats.pop(), { t: "打不動・防 31→13", c: "info sg2no" }); assert.deepEqual(K.fx.pop(), ["ring", D0]);
  assert.ok(K.toasts.pop().includes("對方防禦 31 比你的攻擊力 30 高，打不進去，它的防禦降到 13。再打一次就打得穿"));
  K.X.sg2Ev(Object.assign({}, e, { D0: 20, D1: 12 })); assert.equal(K.toasts.pop(), "打不動：敵・士 防禦 20→12，這一手用掉了", "序章第二次起是短提示");
});

test("〔第 18 項〕不是序章也每次跳短提示；招式打不動（sk）照樣有跳字", () => {
  const K = setup(); K.P.td.pro = 0; K.mv(A0, D0); const e = K.P.td.ev.filter(x => x.k === "att").pop();
  K.X.sg2Ev(e); assert.equal(K.toasts.pop(), "打不動：敵・士 防禦 31→13，這一手用掉了");
  const S = K.P.td.s; S.d[D0] = 16; const c = K.X.SG2G.hit(K.P.td, A0, D0, .5); assert.equal(c.ok, false);
  const e2 = K.P.td.ev.filter(x => x.k === "att").pop(); assert.equal(e2.sk, 1); assert.equal(e2.D0, 31); assert.equal(e2.D1, K.X.SG2.defAt(S, D0));
  K.X.sg2Ev(e2); assert.equal(K.floats.pop().t, `打不動・防 31→${e2.D1}`);
});

test("〔第 18 項〕攻擊沒打死：黑方走完後，下方資料卡自動換成被打的那顆（看得到新的防禦）", () => {
  const K = setup(); K.X.sg2Events(K.P);   /* 第一次只記下看過的 seq */
  K.X.setPick(A0); K.mv(A0, D0);
  const L = K.X.SG2G.legal(K.P, C, "b"), bm = L.find(([f, t]) => f === 29 && t === 38) || L.find(([f]) => K.P.td.s.b[f] === "p"); K.mv(bm[0], bm[1]);
  K.X.sg2Events(K.P); assert.equal(K.X.pick(), D0, "資料卡換成士");
  assert.ok(K.floats.some(f => f.t === "打不動・防 31→13"));
});
