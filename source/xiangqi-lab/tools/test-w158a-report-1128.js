// W158①（11/28，App Store 1.2、5.1.1）：大廳檢舉、伺服器刪除請求只有真的送出才說「已從手機送出」。
// 外部審核指出兩件假成功：
//   ① 裝置在線、但 sendBeacon 被拒、fetch 也失敗（傳輸全部失敗），postForm 因為 navigator.onLine 是 true 就當成功，檢舉回條寫「已從手機送出」；
//   ② 離線送的刪除請求排進 fbQueue，被後面 30 筆意見回饋擠掉（slice(-30)），srvDelState 看「不在佇列裡」就當成已送出。
// 這裡不開瀏覽器：從 App 原始碼切出真正的程式放進 vm 跑（05-settings.js 的意見回饋送出、刪除請求；07x4-lobbysafe.js 的檢舉追蹤編號、檢舉流程與回條），
// 配假的 sendBeacon／fetch／store／modal／sheet。最後用字串替換把修正換回原寫法，同一套情境要判失敗（改壞驗證）。
// 用法：node --test xiangqi-lab/tools/test-w158a-report-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const DB = path.join(__dirname, "../../xiangqi-db");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SET0 = rd(path.join(DB, "m/05-settings.js")), SAFE0 = rd(path.join(DB, "m/07x4-lobbysafe.js"));
function cut(src, a, b, name) { const i = src.indexOf(a), j = src.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + name); return src.slice(i, j) }
function parts(SET, SAFE) {
  return [
    cut(SET, "const FEEDBACK_FORM=", "// 走棋音效選單", "05-settings.js 的意見回饋送出"),
    cut(SET, "/* ---------- 申請刪除伺服器資料（", "/* ---------- 申請刪除伺服器資料：以上", "05-settings.js 的申請刪除伺服器資料"),
    cut(SET, "async function srvDelGo(", "\n\n// ================= 意見回饋", "05-settings.js 的 srvDelGo"),
    cut(SAFE, "const LBS_REASONS=", "const LBS_PLACE=", "07x4 檢舉原因"),
    cut(SAFE, "/* ---------- 檢舉追蹤編號（", "/* ---------- 檢舉追蹤編號：以上", "07x4 檢舉追蹤編號"),
    cut(SAFE, "/* ---------- 回饋 841：檢舉 ----------", "/* ---------- 回饋 841：資料卡加按鈕", "07x4 檢舉流程與回條"),
  ].join("\n");
}
const J = x => x === undefined ? x : JSON.parse(JSON.stringify(x));

/* 一支假手機。net：beacon＝sendBeacon 回什麼；fetch＝"ok"（no-cors 回不透明回應）或 "fail"（丟錯，例如網路錯誤、跨網域模式擋掉） */
function phone(opt, src) {
  opt = opt || {}; src = src || {};
  const ls = new Map(), beacons = [], fetches = [], toasts = [], modals = [], bells = [];
  const store = { get(k, d) { const v = ls.get("m_" + k); if (v == null) return d; try { return JSON.parse(v) } catch (e) { return d } }, set(k, v) { ls.set("m_" + k, JSON.stringify(v)) } };
  const net = { onLine: opt.onLine !== false, beacon: opt.beacon !== undefined ? opt.beacon : true, fetch: opt.fetch || "ok" };
  const navigator = { get onLine() { return net.onLine }, sendBeacon: (u, body) => { beacons.push(String(body)); return net.beacon } };
  const ctx = {
    store, navigator, crypto: require("crypto").webcrypto, TextEncoder, URLSearchParams, Uint8Array, Math, Date, Set, Map, Object, Array, String, Error, Promise, JSON, console,
    meInfo: () => ({ id: "dev12345abcd", name: "長安小棋童" }), XQ_BUILD: "20261128-1200",
    XQNet: { bell: x => bells.push(x), forget: () => true, game: () => null }, location: { hash: "#/lobby" },
    fetch: async (u, o) => { fetches.push(u); if (net.fetch === "fail") throw new TypeError("Failed to fetch"); return { type: "opaque", ok: false, status: 0 } },
    toast: t => toasts.push(String(t)), modal: (h, btns) => modals.push(String(h)), esc: s => String(s), vibrate() { }, closeSheet() { }, lbsCss() { }, lbsBlock() { },
    lbnShow: p => (p && p.name) || "", setTimeout: f => f(), document: { getElementById: () => null },
    ls, beacons, fetches, toasts, modals, bells, net,
  };
  ctx.window = ctx; ctx.window.XQ_BLOCKED = () => false;
  ctx.sheet = (title, fn) => { ctx.__sheetBody = fakeBody(); fn(ctx.__sheetBody) };
  vm.createContext(ctx);
  vm.runInContext(parts(src.SET || SET0, src.SAFE || SAFE0) + "\n;feedbackInfo=async()=>{if(globalThis.__infoFail)throw new Error('讀不到資料');return{id:'dev12345abcd',name:'長安小棋童',rank:'',ver:'v',dev:'手機',page:'#/lobby',role:'玩家'}};\nthis.T={sendRecord,flushFeedback,postForm,srvDelSend,srvDelLine,srvDelState,srvDelList,srvDelGo,lbsReport,lbsMine,lbsMineState,lbsMineAdd,lbsReportDone};", ctx);
  return ctx;
}
/* 檢舉表單的假 DOM：選第一個原因、按「送出檢舉」，等送完 */
function fakeBody() {
  const go = { disabled: true, textContent: "", onclick: null }, why = ["name", "harass", "cheat", "other"].map(k => ({ dataset: { why: k }, classList: { toggle() { } }, querySelector: () => ({ textContent: "" }), onclick: null }));
  const el = { "#lbsGo": go, "#lbsTx": { value: "" }, "#lbsAlso": { checked: false } };
  return { innerHTML: "", go, why, querySelector: s => el[s] || null, querySelectorAll: s => s === "[data-why]" ? why : [] };
}
async function report(X, who) {
  X.T.lbsReport({ id: who || "u1", name: "壞名字" });
  const b = X.__sheetBody; assert.ok(b, "有開檢舉表單"); b.why[0].onclick(); await b.go.onclick({ target: b.go });
  const rid = X.T.lbsMine().slice(-1)[0].rid; return { rid, st: X.T.lbsMineState(X.T.lbsMine().slice(-1)[0]), modal: X.modals.slice(-1)[0] || "" };
}
const queueOf = X => J(X.store.get("fbQueue", [])) || [];
const feedback = (X, n) => { const a = []; for (let i = 0; i < n; i++)a.push(X.T.sendRecord({ type: "🐞 錯誤回報", text: "第 " + i + " 則" })); return Promise.all(a) };

/* ---------- 情境（真的程式、改壞的程式都跑同一套） ---------- */
const S = {
  /* ① 線上、但兩條路都失敗：檢舉 */
  async reportTransportFail(src) {
    const X = phone({ onLine: true, beacon: false, fetch: "fail" }, src), r = await report(X);
    return { X, r, okShown: /已從手機送出/.test(r.modal), queued: queueOf(X).some(q => q.rid === r.rid) };
  },
  /* ① 線上、但兩條路都失敗：刪除請求 */
  async deleteTransportFail(src) {
    const X = phone({ onLine: true, beacon: false, fetch: "fail" }, src);
    await X.T.srvDelGo(); const rid = X.T.srvDelList().slice(-1)[0].rid;
    return { X, rid, line: X.T.srvDelLine(), modal: X.modals.slice(-1)[0] || "", queued: queueOf(X).some(q => q.rid === rid) };
  },
  /* ② 離線送刪除請求，之後又排進 40 則意見回饋 */
  async deleteSqueezed(src) {
    const X = phone({ onLine: false }, src); const r = await X.T.srvDelSend(Date.UTC(2026, 10, 28, 2, 0));
    X.net.beacon = false; X.net.fetch = "fail"; await feedback(X, 40);   /* 還是沒網路，後面的意見回饋也排隊 */
    return { X, rid: r.rid, line: X.T.srvDelLine(), queued: queueOf(X).some(q => q.rid === r.rid) };
  },
  /* ② 離線檢舉，之後又排進 40 則意見回饋 */
  async reportSqueezed(src) {
    const X = phone({ onLine: false }, src), r = await report(X);
    X.net.beacon = false; X.net.fetch = "fail"; await feedback(X, 40);
    return { X, r, queued: queueOf(X).some(q => q.rid === r.rid), st: X.T.lbsMineState(X.T.lbsMine().find(x => x.rid === r.rid)) };
  },
};
const swap = (src, a, b, name) => { assert.ok(src.includes(a), "改壞驗證找不到要換的原文：" + name); return src.split(a).join(b) };
const BAD = {
  postForm: { SET: swap(SET0, 'catch(e){if(!navigator.onLine||rec.rid)throw e}', 'catch(e){if(!navigator.onLine)throw e}', "postForm 的 rid 判斷") },
  trim: { SET: swap(SET0, 'store.set("fbQueue",fbqTrim(q))', 'store.set("fbQueue",q.slice(-30))', "sendRecord 的 fbqTrim") },
  state: { SET: swap(swap(SET0, 'if(x.st==="lost")return"lost";', "", "srvDelState 的 lost"), 'x.st==="w"?"lost":"?"', '"sent"', "srvDelState 的不在佇列判斷") },
  done: { SAFE: swap(SAFE0, "setTimeout(()=>lbsReportDone(rid,st)", "setTimeout(()=>lbsReportDone(rid,ok)", "檢舉回條照實際狀態") },
};

test("檢舉：在線但 sendBeacon 被拒、fetch 也失敗 → 不說「已從手機送出」，排進佇列、我的檢舉是排隊中，回條說還沒送出", async () => {
  const { X, r, okShown, queued } = await S.reportTransportFail();
  assert.equal(okShown, false, r.modal); assert.match(r.modal, /還沒送出/); assert.match(r.modal, /連上網路會自動再試/);
  assert.equal(queued, true, "排進 fbQueue 等補送"); assert.equal(r.st, "q");
  assert.equal(X.beacons.length, 1); assert.equal(X.fetches.length, 1, "兩條路都試過");
  assert.equal(X.bells.length, 0, "沒送出就不送大廳提醒");
  X.net.beacon = true; await X.T.flushFeedback();
  assert.equal(X.T.lbsMineState(X.T.lbsMine()[0]), "sent", "補送成功才變已從手機送出"); assert.deepEqual(queueOf(X), []);
});
test("刪除請求：在線但傳輸全部失敗 → 按鈕下面寫排隊中、回條標題不是「已申請刪除」；補送成功才變已從手機送出", async () => {
  const { X, line, modal, queued } = await S.deleteTransportFail();
  assert.doesNotMatch(line, /已從手機送出/); assert.match(line, /排隊中/); assert.match(line, /還沒送出/);
  assert.doesNotMatch(modal, /已申請刪除|已經從手機送出/); assert.match(modal, /刪除申請還沒送出/); assert.equal(queued, true);
  X.net.beacon = true; await X.T.flushFeedback();
  assert.match(X.T.srvDelLine(), /已從手機送出/); assert.equal(X.T.srvDelList()[0].st, "sent");
});
test("伺服器那一端出錯（表單沒設定、postForm 丟錯）：刪除請求不顯示成功", async () => {
  const X = phone({ onLine: true }); vm.runInContext('FEEDBACK_FORM.action=""', X);
  const r = await X.T.srvDelSend(Date.UTC(2026, 10, 28)); assert.equal(r.ok, false);
  assert.doesNotMatch(X.T.srvDelLine(), /已從手機送出/); assert.equal(X.beacons.length, 0);
});
test("檢舉在送出前就失敗（讀不到自己的資料、沒排進佇列）→ 回條說「沒送出」請再檢舉一次，也不記 30 分鐘防重複", async () => {
  const X = phone({ onLine: true }); X.__infoFail = true;
  const r = await report(X);
  assert.equal(r.st, "lost"); assert.match(r.modal, /沒送出/); assert.match(r.modal, /請再檢舉一次/); assert.doesNotMatch(r.modal, /已從手機送出|會自動再試/);
  assert.deepEqual(queueOf(X), []); assert.deepEqual(J(X.store.get("lbRep", {})), {}, "可以馬上再檢舉");
  X.__infoFail = false; X.modals.length = 0; const r2 = await report(X); assert.equal(r2.st, "sent"); assert.match(r2.modal, /已從手機送出/);
});
test("佇列滿了：排隊中的刪除請求、檢舉不會被後面 40 則意見回饋擠掉；一般回饋照舊最多 30 則", async () => {
  const d = await S.deleteSqueezed(); assert.equal(d.queued, true); assert.match(d.line, /排隊中/); assert.doesNotMatch(d.line, /已從手機送出/);
  assert.equal(queueOf(d.X).filter(q => !q.rid).length, 30);
  const k = await S.reportSqueezed(); assert.equal(k.queued, true); assert.equal(k.st, "q");
  /* 恢復連線：兩種都補送，狀態變已送出 */
  k.X.net.onLine = true; k.X.net.beacon = true; await k.X.T.flushFeedback(); assert.equal(k.X.T.lbsMineState(k.X.T.lbsMine()[0]), "sent"); assert.deepEqual(queueOf(k.X), []);
  d.X.net.onLine = true; d.X.net.beacon = true; await d.X.T.flushFeedback(); assert.match(d.X.T.srvDelLine(), /已從手機送出/);
});
test("重要請求多到真的被擠掉（超過 60 筆）：最舊的明確標「沒送出」並跳提示，不默默消失、不說已送出", async () => {
  const X = phone({ onLine: false });
  const r = await X.T.srvDelSend(Date.UTC(2026, 10, 28, 1, 0));
  for (let i = 0; i < 60; i++)await X.T.sendRecord({ type: "🚩 檢舉", text: "[x]", rid: "R-1128-" + ("AAAA" + i).slice(-4) });
  assert.equal(queueOf(X).filter(q => q.rid).length, 60);
  assert.ok(!queueOf(X).some(q => q.rid === r.rid), "最舊的刪除請求被擠掉");
  assert.equal(X.T.srvDelState(X.T.srvDelList()[0]), "lost"); assert.match(X.T.srvDelLine(), /沒送出/); assert.match(X.T.srvDelLine(), /請再申請一次/); assert.doesNotMatch(X.T.srvDelLine(), /已從手機送出|30 天內處理/);
  assert.ok(X.toasts.some(t => /擠掉/.test(t)), "跳提示：" + X.toasts.join("｜"));
  /* 被擠掉的檢舉：我的檢舉標沒送出 */
  const Y = phone({ onLine: false }); const k = await report(Y);
  for (let i = 0; i < 60; i++)await Y.T.sendRecord({ type: "🚩 檢舉", text: "[x]", rid: "R-1128-" + ("BBBB" + i).slice(-4) });
  assert.equal(Y.T.lbsMineState(Y.T.lbsMine().find(x => x.rid === k.rid)), "lost");
});
test("不在佇列裡又沒記送出（例如被別的程式清掉）＝沒送出；舊版紀錄照實說不確定", () => {
  const X = phone(); X.store.set("srvDelReq", [{ rid: "D-1128-AAAA", at: 1, st: "w", forgot: true }]);
  assert.equal(X.T.srvDelState(X.T.srvDelList()[0]), "lost"); assert.doesNotMatch(X.T.srvDelLine(), /已從手機送出/);
  X.store.set("srvDelReq", [{ rid: "D-1128-BBBB", at: 1, st: "q", forgot: true }]);
  assert.equal(X.T.srvDelState(X.T.srvDelList()[0]), "?"); assert.match(X.T.srvDelLine(), /不確定/); assert.doesNotMatch(X.T.srvDelLine(), /已從手機送出/);
  X.store.set("fbQueue", [{ rid: "D-1128-BBBB" }]); assert.equal(X.T.srvDelState(X.T.srvDelList()[0]), "q");
});
test("補送的時候又排進新的一筆：寫回佇列不會把它蓋掉", async () => {
  const X = phone({ onLine: false, beacon: false, fetch: "fail" }); await X.T.sendRecord({ type: "🐞", text: "舊的" }); assert.equal(queueOf(X).length, 1);
  X.net.onLine = true; let added = false;
  X.navigator.sendBeacon = (u, b) => { if (!added) { added = true; const q = X.store.get("fbQueue", []); q.push({ type: "🚩 檢舉", text: "[R-1128-NEWW]", rid: "R-1128-NEWW" }); X.store.set("fbQueue", q) } return true };
  await X.T.flushFeedback();
  assert.deepEqual(queueOf(X).map(q => q.rid), ["R-1128-NEWW"], "新排進來的還在");
});
test("成功才顯示成功：有網路、sendBeacon 收下 → 檢舉回條「已從手機送出」、刪除請求「已申請刪除」", async () => {
  const X = phone({ onLine: true }), r = await report(X);
  assert.equal(r.st, "sent"); assert.match(r.modal, /已從手機送出/); assert.deepEqual(queueOf(X), []); assert.equal(X.fetches.length, 0);
  const Y = phone({ onLine: true }); await Y.T.srvDelGo();
  assert.match(Y.modals[0], /已申請刪除/); assert.match(Y.T.srvDelLine(), /已從手機送出/);
  /* 一般意見回饋照舊：sendBeacon 被拒、fetch 有回（no-cors 讀不到內容）算送出 */
  const Z = phone({ onLine: true, beacon: false, fetch: "ok" }); assert.equal(await Z.T.sendRecord({ type: "🐞", text: "x" }), true);
});

/* ---------- 改壞驗證：把修正換回原寫法，同一套情境要露出假成功 ---------- */
test("改壞驗證：postForm 拿掉 rid 判斷 → 傳輸全部失敗時檢舉、刪除請求又顯示已從手機送出", async () => {
  const a = await S.reportTransportFail(BAD.postForm); assert.equal(a.okShown, true, "壞版本應該露出假成功"); assert.equal(a.queued, false);
  const b = await S.deleteTransportFail(BAD.postForm); assert.match(b.line, /已從手機送出/);
});
test("改壞驗證：佇列換回 slice(-30) → 刪除請求、檢舉被擠掉", async () => {
  const d = await S.deleteSqueezed(BAD.trim); assert.equal(d.queued, false); assert.doesNotMatch(d.line, /排隊中/);
  const k = await S.reportSqueezed(BAD.trim); assert.equal(k.queued, false);
});
test("改壞驗證：srvDelState 換回「不在佇列就算已送出」＋舊佇列 → 被擠掉的刪除請求顯示已從手機送出", async () => {
  const d = await S.deleteSqueezed({ SET: swap(BAD.state.SET, 'store.set("fbQueue",fbqTrim(q))', 'store.set("fbQueue",q.slice(-30))', "一起換回 slice") });
  assert.equal(d.queued, false); assert.match(d.line, /已從手機送出/, "壞版本的假成功");
});
test("改壞驗證：回條換回只看 ok → 沒送出的檢舉講成「會自動再試」", async () => {
  const X = phone({ onLine: true }, BAD.done); X.__infoFail = true; const r = await report(X);
  assert.equal(r.st, "lost"); assert.doesNotMatch(r.modal, /請再檢舉一次/); assert.match(r.modal, /會自動再試/);
});
