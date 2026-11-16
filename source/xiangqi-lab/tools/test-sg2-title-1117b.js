// 11/17 第二批追加（協調者轉測試員 D 與上一批的建議）：
//   P3-C 名稱前後不一：選關、開局提示、結算都寫「星門圍城・序章 A1」，對局頁頂端卻是 08b setTop 照 07-legend jName 寫的「黑洞・星樞棋局」（bh: 開頭一律這樣）。
//     修法（07sg2 sg2Title，sg2Paint 每次畫都叫）：星門圍城 v2 的盤（偏航來的也是）頂端改寫「星門圍城・關名」（SG2G.nameOf）；08b 重畫蓋回去，下一次畫就補回。
//   打不動的短提示每盤只跳前 2 次（SG2_DOWN_N；序章第一次的教學句照舊、算一次）；之後只有跳字和資料卡更新。
// 不開瀏覽器：vm 載 07bhg＋07sg2，假的 #title。用法：node --test xiangqi-lab/tools/test-sg2-title-1117b.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const C = require(path.join(ROOT, "xiangqi-lab/site/core.js"));
const SG2SRC = rd("xiangqi-db/m/07sg2-siege2.js"), GSVSRC = rd("xiangqi-db/m/07bhg-gatesiege.js");

/* 假的 DOM：只有 #title（文字節點、span），夠 sg2Title 用 */
function fakeTitle(txt) {
  const mk = tag => ({ nodeType: 1, tagName: tag, className: "", dataset: {}, childNodes: [], _t: "",
    get textContent() { return this.childNodes.length ? this.childNodes.map(n => n.textContent).join("") : this._t },
    set textContent(v) { this.childNodes = []; this._t = String(v); if (v) this.childNodes.push({ nodeType: 3, textContent: String(v) }) },
    get firstChild() { return this.childNodes[0] || null }, append(n) { this.childNodes.push(n) },
    querySelector(sel) { const c = sel.replace(/^\./, ""); return this.childNodes.find(n => n.nodeType === 1 && n.className === c) || null } });
  const t = mk("DIV"); t.textContent = txt; return { t, document: { getElementById: id => id === "title" ? t : null, createElement: mk } };
}
function kit(o) {
  o = o || {}; const mem = {}, toasts = [], floats = [];
  const ctx = { console, Math, JSON, Date, store: { get: (k, d) => k in mem ? mem[k] : d, set: (k, v) => { mem[k] = v } }, toast: t => toasts.push(t), vibrate() { },
    esc: s => String(s), setTimeout: f => { f(); return 0 }, performance: { now: () => 0 }, XQCore: C,
    bhtdFloat: (t, p, c) => floats.push(t), bhtdXY: q => ({ x: q, y: q }), bhtdFx() { } };
  if (o.document) ctx.document = o.document;
  vm.createContext(ctx);
  vm.runInContext(GSVSRC + "\n" + SG2SRC + "\n;this.__X={GSV,SG2,SG2G,sg2Ev,sg2Title:typeof sg2Title==='function'?sg2Title:null,setSt:s=>{GSV_ST=s}};", ctx);
  const X = ctx.__X, lv = o.lv || X.SG2G.GRP[0].lv[0], start = X.GSV.startFen(lv, C);
  const P = { id: o.id || "g1", journey: "bh:gs" + lv, start, startTurn: "r", board: C.parseFen(start), turn: "r", moves: [], human: "r", pos: [], result: null };
  P.pos = [C.fen(P.board, "r")];
  P.td = X.SG2G.boot({ mode: X.SG2G.MODE, lv, diff: 1, sq: null, sk: [], tal: {} }, P, C);
  X.setSt(P);
  return { X, P, toasts, floats };
}

test("〔P3-C〕對局頁頂端：序章 A1 寫「星門圍城・序章 A1」（跟選關、結算一致），08b 重畫蓋回「黑洞・星樞棋局」後再補回", () => {
  const F = fakeTitle("🪨 黑洞・星樞棋局"), K = kit({ document: F.document });
  assert.ok(K.X.sg2Title, "有 sg2Title"); K.X.sg2Title(K.P);
  assert.equal(F.t.textContent, "星門圍城・序章 A1"); assert.equal(F.t.childNodes.length, 1, "原本的字清掉");
  const sp = F.t.firstChild; K.X.sg2Title(K.P); assert.equal(F.t.firstChild, sp, "內容一樣就不動");
  F.t.textContent = "🪨 黑洞・星樞棋局"; K.X.sg2Title(K.P); assert.equal(F.t.textContent, "星門圍城・序章 A1", "setTop 蓋回去以後補回");
  assert.ok(SG2SRC.includes("my=gsvMy(st);sg2TopSync();try{sg2Title(st)}catch(e){}"), "sg2Paint 每次畫都叫（在 hk 快取判斷之前）");
});

test("〔P3-C〕主線關照組名＋組內第幾關（偏航來的那盤也是同一個 sg2Paint）；不是星門圍城 v2 的盤不動", () => {
  const F = fakeTitle("x"), K = kit({ document: F.document, lv: 10 }); K.X.sg2Title(K.P);
  assert.equal(F.t.textContent, "星門圍城・" + K.X.SG2G.nameOf(10)); assert.equal(K.X.SG2G.nameOf(10), "易 1");
  const F2 = fakeTitle("🪨 黑洞・星樞棋局"), K2 = kit({ document: F2.document }); K2.X.sg2Title({ td: { mode: "td" } });
  assert.equal(F2.t.textContent, "🪨 黑洞・星樞棋局");
});

test("〔提示次數〕非序章：打不動的短提示每盤只跳前 2 次，之後只有跳字", () => {
  const K = kit(); K.P.td.pro = 0; const e = { k: "att", by: "r", ok: 0, t: 3, p: "a", down: 15, D0: 31, D1: 13, A: 30 };
  for (let i = 0; i < 5; i++) K.X.sg2Ev(Object.assign({}, e));
  assert.equal(K.toasts.length, 2, "5 次打不動只跳 2 句"); assert.equal(K.toasts[0], "打不動：敵・士 防禦 31→13，這一手用掉了");
  assert.equal(K.floats.filter(t => t === "打不動・防 31→13").length, 5, "跳字每次都有");
});

test("〔提示次數〕序章：第一次教學句、第二次短提示，第三次起不跳；換一盤重新算", () => {
  const K = kit(); const e = { k: "att", by: "r", ok: 0, t: 3, p: "a", down: 15, D0: 31, D1: 13, A: 30 };
  for (let i = 0; i < 4; i++) K.X.sg2Ev(Object.assign({}, e));
  assert.equal(K.toasts.length, 2); assert.ok(K.toasts[0].includes("比你的攻擊力 30 高")); assert.equal(K.toasts[1], "打不動：敵・士 防禦 31→13，這一手用掉了");
  K.P.id = "g2"; K.X.sg2Ev(Object.assign({}, e)); assert.equal(K.toasts.length, 3, "新的一盤又會跳");
  const ok = { k: "att", by: "r", ok: 1, kill: 0, t: 3, p: "a", dmg: 5 }; K.X.sg2Ev(ok); assert.ok(K.toasts.pop().includes("扣了 5 體力"), "扣血沒打死的序章說明不受影響");
});
