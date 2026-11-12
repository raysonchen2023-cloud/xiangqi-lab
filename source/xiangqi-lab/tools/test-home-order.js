// 評比第 14 輪：首頁棋鎮的旁白／鍵盤焦點順序（開發者 11/13 iPhone 旁白錄影第 4 段：念成「同桌對弈 → 藏譜石窟 → 雲河星槎 → 觀星閣 → 今日推薦」）。
// 不開瀏覽器：從 xiangqi-db/m/07z-homemap.js 切出 hmFocusOrder（純函式）、hmTail、hmSlogan，用假 DOM、假 MutationObserver 跑。
//   ① 入口按鈕在 DOM 裡照「由上到下、同一列由左到右」排（上% 差 6 以內算同一列），座標表改了也跟著排；畫面位置（left／top）不動。
//   ② 底部那一條（加到主畫面、回報問題、快速對局）永遠排最後：之後才加進來的角色按鈕、💬、我的角色都插到它前面；正在焦點上的不搬。
//   ③ 圖最上方的主張紙條排在入口前面。
// 用法：node --test xiangqi-lab/tools/test-home-order.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07z-homemap.js"), "utf8");
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, a); const j = s.indexOf(b, i + a.length); assert.ok(j > i, b); return s.slice(i, j + b.length) };
const ORDER = SRC.match(/\/\*HMORDER\{\*\/([\s\S]*?)\/\*\}HMORDER\*\//)[1];
const hmFocusOrder = new Function("HM_ROW_TOL", ORDER + ";return hmFocusOrder")(6);
const HM_SPOTS = new Function(SRC.match(/^const HM_SPOTS=[^\n]*;/m)[0] + ";return HM_SPOTS")();
const ids = L => L.map(s => s[0]);

test("首頁入口照「由上到下、同一列由左到右」：雲河星槎 → 對戰（觀星閣）→ 學習（藏譜石窟）→ 今日推薦 → 同桌對弈", () => {
  assert.deepEqual(ids(hmFocusOrder(HM_SPOTS)), ["hmShip", "hmBattle", "hmLearn", "hmRec", "hmQuick"]);
  const shuf = [HM_SPOTS[4], HM_SPOTS[2], HM_SPOTS[0], HM_SPOTS[3], HM_SPOTS[1]];
  assert.deepEqual(ids(hmFocusOrder(shuf)), ["hmShip", "hmBattle", "hmLearn", "hmRec", "hmQuick"], "座標表順序打亂也一樣");
  const key = s => s.join("|"); assert.deepEqual(hmFocusOrder(HM_SPOTS).map(key).sort(), HM_SPOTS.map(key).sort(), "只換順序，座標、標籤一個都沒改");
});

test("座標表以後改了也照位置排：上% 差 6 以內算同一列（列內左到右），超過就換列；同一點照原本順序", () => {
  const L = [["a", 80, 30], ["b", 10, 34], ["c", 50, 10], ["d", 50, 41], ["e", 20, 47]];
  assert.deepEqual(ids(hmFocusOrder(L)), ["c", "b", "a", "e", "d"], "30 跟 34 同一列；41 跟 47 同一列（以那一列最上面那個為準）");
  assert.deepEqual(ids(hmFocusOrder([["x", 50, 20], ["y", 50, 20], ["z", 10, 27]])), ["x", "y", "z"], "差 7 換列；同一點照原順序");
  assert.deepEqual(ids(hmFocusOrder([["l", 86, 33], ["b", 14, 25.5]])), ["b", "l"]);
  assert.deepEqual(hmFocusOrder([]), []);
});

/* ---------- 假 DOM：只做 hmTail、hmSlogan 用到的部分；MutationObserver 跟真的一樣是之後才通知（microtask） ---------- */
function kit() {
  const obs = [];
  class MO { constructor(cb) { this.cb = cb; this.on = false; obs.push(this) } observe() { this.on = true } disconnect() { this.on = false } }
  const notify = () => queueMicrotask(() => obs.filter(o => o.on).forEach(o => o.cb([])));
  const node = (name, cls) => { const n = { name, cls: cls || name, parentNode: null, contains(x) { return x === this || (this.kids || []).includes(x) } };
    Object.defineProperty(n, "nextSibling", { get() { const p = this.parentNode; if (!p) return null; return p.kids[p.kids.indexOf(this) + 1] || null } }); return n };
  const P = { kids: [], isConnected: true,
    querySelector(q) { const m = /^:scope>\.(.+)$/.exec(q); return m ? this.kids.find(k => k.cls === m[1]) || null : null },
    insertBefore(n, ref) { if (n.parentNode) n.parentNode.kids.splice(n.parentNode.kids.indexOf(n), 1); const i = ref ? this.kids.indexOf(ref) : this.kids.length; this.kids.splice(i < 0 ? this.kids.length : i, 0, n); n.parentNode = this; notify(); return n },
    append(...ns) { for (const n of ns) this.insertBefore(n, null) } };
  const doc = { activeElement: null, createElement: () => { const n = node("slogan", "hm-slogan"); n.setAttribute = () => { }; n.classList = { add() { } }; n.remove = () => { }; return n } };
  return { P, node, doc, MO, obs };
}
const flush = () => new Promise(r => setImmediate(r));
const hmTailOf = K => new Function("document", "MutationObserver", cut(SRC, "function hmTail(P){", "return mo}") + ";return hmTail")(K.doc, K.MO);

test("底部那一條永遠排最後：角色按鈕、💬、角色小選單、我的角色之後才加進來，也插到它前面", async () => {
  const K = kit(), { P, node } = K;
  P.append(node("img"), node("hm-fx"), node("slogan"), node("box"), ...["hmShip", "hmBattle", "hmLearn", "hmRec", "hmQuick"].map(n => node(n, "shp-spot")), node("bar", "hm-go-bar"));
  const before = P.kids.map(k => k.name); await flush();
  const mo = hmTailOf(K)(P); assert.ok(mo); assert.deepEqual(P.kids.map(k => k.name), before, "本來就對的不動");
  P.append(node("hm-me")); P.append(node("shw-me"), node("shw-hint"), node("shw-say")); await flush();
  assert.deepEqual(P.kids.map(k => k.name).slice(-6), ["hmQuick", "hm-me", "shw-me", "shw-hint", "shw-say", "bar"], "後來加的照加進來的順序排在入口後、底部條前");
  const menu = node("shw-menu"); P.append(menu); K.doc.activeElement = menu; await flush();
  assert.equal(P.kids.at(-1), menu, "正在焦點上的不搬（搬了焦點會掉）");
  K.doc.activeElement = null; P.append(node("ripple")); await flush();
  assert.equal(P.kids.at(-1).name, "bar", "焦點離開後下一次變動就排回去");
  P.isConnected = false; P.append(node("late")); await flush(); assert.equal(mo.on, false, "離開首頁就停止觀察");
});

test("一開始就有東西排在底部條後面（例如先畫了角色）：hmTail 一呼叫就排好；沒有底部條就什麼都不做", async () => {
  const K = kit(), { P, node } = K;
  P.append(node("spot1", "shp-spot"), node("bar", "hm-go-bar"), node("hm-me"), node("slogan2")); await flush();
  hmTailOf(K)(P); assert.deepEqual(P.kids.map(k => k.name), ["spot1", "hm-me", "slogan2", "bar"]);
  const K2 = kit(); K2.P.append(K2.node("spot1", "shp-spot")); assert.equal(hmTailOf(K2)(K2.P), null);
});

test("主張紙條（圖最上方）排在入口前面，旁白先念它", () => {
  const K = kit(), { P, node } = K; P.append(node("img"), node("hm-fx"), node("s1", "shp-spot"), node("s2", "shp-spot"));
  const f = new Function("document", "store", "localDay", "setTimeout", cut(SRC, "function hmSlogan(P,nw){", "setTimeout(()=>s.remove(),900)},3000)}") + ";return hmSlogan")(K.doc, { get: () => "", set() { } }, () => "2026-11-13", () => 0);
  f(P, true); assert.deepEqual(P.kids.map(k => k.name), ["img", "hm-fx", "slogan", "s1", "s2"]);
});

test("〔原始碼〕首頁入口照 hmFocusOrder 產生、畫面座標照舊用 HM_SPOTS；homeMap 最後呼叫 hmTail", () => {
  assert.ok(SRC.includes('${hmFocusOrder(HM_SPOTS).map(([id,x,y])=>`<button class="shp-spot" id="${id}" style="left:${x}%;top:${y}%"'));
  assert.match(SRC, /hmMe\(P\)\}\}catch\(e\)\{\}\n  try\{hmTail\(P\)\}catch\(e\)\{\}/);
  assert.ok(![...SRC].some(c => { const x = c.codePointAt(0); return x < 32 && x !== 10 }), "07z-homemap.js 有 CR 或控制字元");
});
