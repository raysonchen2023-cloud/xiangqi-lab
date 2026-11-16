// 11/17 iMac 模擬器第 1 輪第 11 項（P1）：星樞棋局（序章 A1、起航偏航那盤）多出一回合。
//   回報的步驟：第 1 回合俥走到底線 a0 → 黑士 f0→e1 → 點俥 → 點黑方左士 d0：沒有「擊破」、只跳出「敵・士 體力 14/14」資料卡，俥沒動、士沒扣血，
//   回合 2→3、黑卒 c4→c5 多走一步；再點俥（這次有綠點和「擊破」）→ 點士 → 將死，結算卻寫「打了 2 回合」。
//   vm 重現（下面第 1 項）：黑士走到 e1 以後，d0 那顆士有「護帥」和「相護」加成，防禦 31 ＞ 俥的攻擊 30——這一下照規則是「打不動、對方防禦降 15、用掉這一手」，
//     不是點擊壞掉。看起來像「點了沒反應」是因為這一下是**預走**打出去的：電腦還在想時點「俥→士」，07pm pmvTap 排成預走，對方一走就自動送出，
//     玩家沒看到攻擊預覽（擊破／扣血／防−），選取也是預走的樣子。07bht bhtdIs 11/16 改成不收 v2 以後，v2 掉回一般預走（塔防局原本就「不排預走」）。
//   修法：① 07pm pmvTap：星門圍城 v2（sg2On）不排預走，順手清掉已選的預走；電腦想的時候點棋子只會看資料卡，輪到你才選子、看預覽、自己出手。
//         ② 07sg2 結算「打了 N 回合」改用 sg2Rnds：紅方這一手就分勝負時，那一回合也算（＝對局時頂端最後的「第 N 回合」）；星星、最佳紀錄照舊用 td.rnd。
// 不開瀏覽器：vm 載 07bhg＋07sg2（規則）、07pm 的預走函式（#PMV-PURE-BEGIN 到 blzApply 之前），用真的規則跑一遍回報的步驟。
// 用法：node --test xiangqi-lab/tools/test-sg2-premove-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const C = require(path.join(ROOT, "xiangqi-lab/site/core.js"));
const PM = rd("xiangqi-db/m/07pm-premove.js"), SG2SRC = rd("xiangqi-db/m/07sg2-siege2.js"), GSVSRC = rd("xiangqi-db/m/07bhg-gatesiege.js");
const a = PM.indexOf("/* #PMV-PURE-BEGIN"), b = PM.indexOf("\nblzApply();");
assert.ok(a >= 0 && b > a, "07pm 找得到預走那段");
const PMV = PM.slice(a, b);

function kit() {
  const mem = {}, toasts = [];
  const ctx = { console, Math, JSON, Date, store: { get: (k, d) => k in mem ? mem[k] : d, set: (k, v) => { mem[k] = v } }, toast: t => toasts.push(t), vibrate() { }, axSay() { }, performance: { now: () => 0 }, XQCore: C };
  vm.createContext(ctx);
  vm.runInContext(GSVSRC + "\n" + SG2SRC + "\n" + PMV + "\n;this.__X={GSV,SG2,SG2G,sg2On,sg2Rnds,pmvTap,pmvFire,pmvSt};", ctx);
  const X = ctx.__X, lv = X.SG2G.GRP[0].lv[0], start = X.GSV.startFen(lv, C);
  const P = { id: "g1", start, startTurn: "r", board: C.parseFen(start), turn: "r", moves: [], human: "r", pos: [], result: null };
  P.pos = [C.fen(P.board, "r")];
  P.td = X.SG2G.boot({ mode: X.SG2G.MODE, lv, diff: 1, sq: null, sk: [], tal: {} }, P, C);
  const mv = (f, t) => { const r = X.SG2G.play(P, f, t, C); if (r.end) P.result = { w: r.end.w, why: r.end.why }; return r };
  const legal = () => { P.legal = X.SG2G.legal(P, C); return P.legal };
  return { X, P, mv, legal, toasts, lv };
}
/* 格號＝列×9＋行（第 0 列是黑方底線）：a0＝0、d0＝3（黑方左士）、f0＝5、e1＝13；俥一開始在 a5＝45 */
const A0 = 0, D0 = 3, F0 = 5, E1 = 13;

test("〔重現〕回報的那一步：黑士到 e1 以後，d0 的士防禦 31 ＞ 俥攻擊 30＝打不動、降防 15、用掉一手（規則照舊）", () => {
  const K = kit(); assert.equal(K.lv, 31, "序章 A1"); assert.equal(K.P.td.s.b[45], "R"); assert.equal(K.P.td.s.b[D0], "a");
  K.legal(); K.mv(45, A0); K.mv(F0, E1); assert.equal(K.P.td.rnd, 1, "第 1 回合走完");
  const pv = K.X.SG2G.pv(K.P, A0, D0); assert.equal(pv.kill, false); assert.equal(pv.ok, false, "沒有擊破、也扣不了血"); assert.equal(pv.down, 15);
  K.mv(A0, D0); assert.equal(K.P.td.s.b[A0], "R", "俥沒動"); assert.equal(K.P.td.s.h[D0], 14, "士體力 14/14"); assert.equal(K.P.td.s.d[D0], 1, "防禦 16 → 1");
  assert.equal(K.P.td.ev.filter(e => e.k === "att").pop().ok, 0, "這一下記成「打不動」");
});

test("〔修〕電腦還在想時點「俥→士」：v2 不排預走（以前會排好、對方一走就自動打出去）", () => {
  const K = kit(); K.legal(); K.mv(45, A0);
  const st = Object.assign(K.P, { turn: "b", thinking: true, legal: [] });
  assert.equal(K.X.sg2On(st), true);
  assert.equal(K.X.pmvTap(st, "r", A0, {}), false, "點俥：交回一般點選（只看資料卡）");
  assert.equal(K.X.pmvTap(st, "r", D0, {}), false, "點士：不排預走");
  assert.equal(K.X.pmvSt().q, null); assert.equal(K.X.pmvSt().sel, null);
  K.mv(F0, E1); st.thinking = false; K.legal();
  const fired = []; assert.equal(K.X.pmvFire(st, "r", (f, t) => { fired.push([f, t]); return true }), "none", "輪到你時沒有東西自動打出去");
  assert.deepEqual(fired, []); assert.equal(K.P.td.rnd, 1, "回合沒有被偷走");
});

test("〔修〕舊的預走殘留（例如上一盤留下的）點到 v2 的棋盤就清掉", () => {
  const K = kit(); K.X.pmvSt().q = { gid: "g1", n: 1, f: A0, t: D0 }; K.X.pmvSt().sel = { gid: "g1", n: 1, sq: A0 };
  K.X.pmvTap(Object.assign(K.P, { turn: "b", thinking: true }), "r", 10, {}); assert.equal(K.X.pmvSt().q, null); assert.equal(K.X.pmvSt().sel, null);
});

test("〔照舊〕一般對局（不是星門圍城）照樣排預走", () => {
  const K = kit(), b = C.parseFen("4k4/9/9/9/9/9/9/9/9/R3K4");
  const st = { id: "x", board: b, moves: [{ f: 0, t: 1 }], turn: "b", thinking: true, result: null };
  assert.equal(K.X.sg2On(st), false);
  assert.equal(K.X.pmvTap(st, "r", 81, {}), true, "選俥"); assert.equal(K.X.pmvTap(st, "r", 72, {}), true, "排預走");
  assert.equal(K.X.pmvSt().q.f, 81); assert.equal(K.X.pmvSt().q.t, 72);
});

test("〔修〕回報的整盤：第 3 回合紅方將死，結算「打了 3 回合」（對局時頂端是第 3 回合；td.rnd 仍是走完的 2，星星照舊）", () => {
  const K = kit(); K.legal(); K.mv(45, A0); K.mv(F0, E1); K.mv(A0, D0);
  const L = K.X.SG2G.legal(K.P, C, "b"), bm = L.find(([f, t]) => f === 29 && t === 38) || L.find(([f]) => K.P.td.s.b[f] === "p") || L[0]; K.mv(bm[0], bm[1]);
  assert.equal(K.P.td.rnd, 2, "第 2 回合走完");
  assert.equal(K.X.SG2G.pv(K.P, A0, D0).kill, true, "這次士上有「擊破」");
  const r = K.mv(A0, D0); assert.ok(r.end, "分勝負：" + JSON.stringify(r.end)); assert.equal(r.end.w, "r");
  assert.equal(K.P.td.rnd, 2, "td.rnd 照舊是走完的回合（星星、最佳紀錄用它）");
  assert.equal(K.X.sg2Rnds(K.P), 3, "結算顯示 3 回合");
});

test("〔純計算〕sg2Rnds：黑方走完才判（打滿回合）照舊是 td.rnd；黑方打倒帥那一手算進那一回合；還沒走棋是 0", () => {
  const K = kit(), R = K.X.sg2Rnds, td = { rnd: 30, rlim: 30, over: { w: null, why: "打滿 30 回合沒分勝負" } };
  assert.equal(R({ td, moves: [{ by: "b" }] }), 30);
  assert.equal(R({ td: { rnd: 4, rlim: 30, over: { w: "b", why: "將帥體力歸零" } }, moves: [{ by: "b" }] }), 5);
  assert.equal(R({ td: { rnd: 4, rlim: 30, over: { w: "b", why: "將死" } }, moves: [{ by: "b" }] }), 4, "黑方走完回合結束後紅方沒步可走");
  assert.equal(R({ td: { rnd: 0, rlim: 30 }, moves: [] }), 0);
  assert.ok(SG2SRC.includes("<b>打了 ${sg2Rnds(st)} 回合</b>"), "結算用 sg2Rnds（數字跟字同一個節點，英文分單複數）");
});
