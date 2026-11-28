// W158②（11/28，App Store 1.2、5.1）：換手機轉移碼「換機兩端一致」＋兒童模式產碼要家長確認。
//   ① 新手機按「取消」：碼不用掉、分段不清、不寫回條、不記收過，舊手機不會顯示「已轉到新手機」；按「取代」、資料寫完（XQSave.load＋存檔格）後才用掉、才寫回條。
//   ② 產生的碼（xfSend 顯示 5-5）＝輸入端收得下＝書箱（07s4）重新打開時認得出、券上照 5＋5 切。
//   ③ 兒童模式產碼要過家長確認題（07x4 包 xfSend 那層叫 fmGate）；xf4Upload 沒有許可就不上傳；開機 9 秒查回條，沒有家長確認的那筆不連線。
// 把 05-settings.js 的 XFER 區段和 xfSend／xfRecv、05b-save.js 從 XFER2 到開機 9 秒那行、07x4 包 xfSend 那段一起放進 vm，換上假的 XQNet、IndexedDB、localStorage、畫面。
// 不開瀏覽器、不連伺服器。用法：node --test xiangqi-lab/tools/test-w158b-xfer-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), nodeCrypto = require("node:crypto");
const M_DIR = path.join(__dirname, "../../xiangqi-db/m");
const rd = f => fs.readFileSync(path.join(M_DIR, f), "utf8").replace(/\r\n/g, "\n");
const SET = rd("05-settings.js"), SAVE = rd("05b-save.js"), X4 = rd("07x4-lobbysafe.js"), S4 = rd("07s4-passmap.js");
const cut = (src, a, b, incl) => { const i = src.indexOf(a), j = src.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j + (incl ? b.length : 0)) };
const SRC0 = { SET, SAVE, X4, S4 };
const ROOT = "xqlab-test/v1";
const J = x => JSON.parse(JSON.stringify(x));
/* 07s4 書箱認碼的那個正規式（從原始碼抓出來，壞版本也一樣抓） */
const hqRe = s4 => { const m = /\.find\(d=>(\/\^\[A-Z0-9\][^\n]*?\$\/)\.test\(d\.textContent\.trim\(\)\)\)/.exec(s4); assert.ok(m, "07s4 要有認碼的正規式"); return new Function("return " + m[1])() };

function fakeIDB() {
  const dbs = new Map(), later = f => setImmediate(f);
  return { open(name) { const r = {}; later(() => { let fresh = false; if (!dbs.has(name)) { dbs.set(name, {}); fresh = true } const st0 = dbs.get(name);
    const db = { createObjectStore(s) { st0[s] = st0[s] || new Map() }, close() { },
      transaction(s) { const t = {}; let pending = 0, done = false; const st = st0[s] || (st0[s] = new Map());
        const fin = () => later(() => { if (!pending && !done) { done = true; t.oncomplete && t.oncomplete() } });
        const req = op => { const q = {}; pending++; later(() => { q.result = op(); q.onsuccess && q.onsuccess(); pending--; fin() }); return q };
        t.objectStore = () => ({ get: k => req(() => st.get(k)), put: (v, k) => req(() => { st.set(k, structuredClone(v)); return k }), getAllKeys: () => req(() => [...st.keys()]) }); fin(); return t } };
    r.result = db; if (fresh) r.onupgradeneeded && r.onupgradeneeded(); r.onsuccess && r.onsuccess() }); return r } };
}
const server = () => ({ ret: new Map(), log: [], up: true });
/* 一支手機。o.ls＝localStorage、o.cfg＝store 的 fmCfg（兒童模式） */
function phone(S, o, src) {
  src = Object.assign({}, SRC0, src || {}); o = o || {};
  const ls = new Map(Object.entries(o.ls || {})), ui = { modals: [], toasts: [], gates: [], sheets: [], timers: [], loads: 0, reload: 0 };
  const localStorage = { getItem: k => ls.has(k) ? ls.get(k) : null, setItem: (k, v) => ls.set(k, String(v)), removeItem: k => ls.delete(k) };
  const net = op => async (t, s) => { S.log.push([op, t, s]); if (!S.up) return op === "put" ? false : null; if (op === "put") { if (s === "") S.ret.delete(t); else S.ret.set(t, s); return true } return S.ret.has(t) ? S.ret.get(t) : null };
  const mkB = () => ({ innerHTML: "", els: {}, querySelector(q) { return this.els[q] || (this.els[q] = { value: "", textContent: "", onclick: null, addEventListener() { } }) } });
  const ctx = { console, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream, btoa, atob, structuredClone, localStorage, crypto: nodeCrypto.webcrypto, indexedDB: fakeIDB(),
    setTimeout: (f, ms) => { ui.timers.push({ f, ms }); if ((ms | 0) < 9000) setImmediate(f);   /* 重試的等待、重開不用真的等；開機 9 秒、45 秒、30 分鐘的由測試自己叫 */ return ui.timers.length }, clearTimeout: () => { },
    XQSave: { dump: () => Object.fromEntries(ls), load: (d, done) => { ui.loads++; ui.atLoad = new Map(S.ret); ls.clear(); for (const k in d) ls.set(k, String(d[k])); ui.loadP = Promise.resolve(done && done()) } },
    slotAll: async () => ({}), slotPutAll: async () => { }, OFF: true,
    store: { get: (k, d) => k === "fmCfg" ? (o.cfg ? J(o.cfg) : d) : d },
    XQNet: { root: () => ROOT, status: () => S.up ? "up" : "connecting", putRetained: net("put"), getRetained: net("get") },
    location: { pathname: "/m.html", replace() { }, reload() { ui.reload++ } },
    toast: t => ui.toasts.push(t), sheet: (t, f) => { const B = mkB(); ui.sheets.push(B); ui.B = B; ui.shP = f(B) }, closeSheet() { }, modal: (h, btns) => ui.modals.push({ h, btns }),
    fmGate: (why, ok) => ui.gates.push({ why, ok }), esc: s => String(s), fmtAt: t => String(t), meInfo: () => ({ id: "NEWphone0000" }), vibrate() { } };
  ctx.window = ctx; vm.createContext(ctx);
  const code = cut(src.SET, "/* XFER:BEGIN", "/* XFER:END */") + "\n" + cut(src.SET, "async function xfSend(", "\n/* 意見回饋 491（開發者）") + "\n"
    + cut(src.SAVE, "/* XFER2:BEGIN", "},9000);", true) + "\n"
    + cut(src.X4, 'if(typeof xfSend==="function"&&!xfSend.__ask)', "xfSend.__ask=1}", true)
    + "\nglobalThis.__X={xfSend:(...a)=>xfSend(...a),xfRecv:(...a)=>xfRecv(...a),xfUpload:(...a)=>xfUpload(...a),xf4Recv,xf4Code,xf4Upload,xf4Fetch,xf2Check,xfNorm,XF4_KIDMSG,XF4_ACKQ};";
  vm.runInContext(code, ctx, { filename: "05-settings+05b-save+07x4(W158②)" });
  return { X: ctx.__X, ls, ui, ctx };
}
const xTopics = S => [...S.ret.keys()].filter(t => t.startsWith(ROOT + "/x/"));
const OLD = { m_xp: "1234", xq_me: JSON.stringify({ id: "OLDphone1234", name: "小明" }), xq_rate: JSON.stringify({ pts: 320 }) };
const NEW = { m_xp: "5", xq_me: JSON.stringify({ id: "NEWphone0000", name: "小新" }) };
const tick = () => new Promise(r => setImmediate(r));
/* 新手機從畫面輸入碼：回跳出的取代確認 */
async function enter(N, shown) {
  await N.X.xfRecv(); N.ui.B.querySelector("#xfC").value = shown; await N.ui.B.querySelector("#xfGo").onclick();
  const md = N.ui.modals[N.ui.modals.length - 1]; assert.ok(md && /取代這支手機/.test(md.h), "要跳取代確認：" + N.ui.B.querySelector("#xfM").textContent); return md }
const btn = (md, re) => { const b = md.btns.find(x => re.test(x[0])); assert.ok(b, "找不到按鈕 " + re); return b[1] };
async function press(N, md, re) { const r = btn(md, re)(); await r; await tick(); if (N.ui.loadP) await N.ui.loadP; await tick() }

/* ---------- 情境（壞版本也跑同一套，要失敗） ---------- */
async function scCancel(src) {
  const S = server(), A = phone(S, { ls: OLD }, src), N = phone(S, { ls: NEW }, src), code = A.X.xf4Code();
  await A.X.xf4Upload(code); const before = new Map(S.ret);
  const md = await enter(N, code.slice(0, 5) + "-" + code.slice(5));
  assert.match(md.h, /按「取消」不會用掉/, "確認框要說清楚：取消不會用掉");
  assert.deepEqual(new Map(S.ret), before, "下載、跳確認時伺服器上的東西一個都不動（分段還在、沒有回條）");
  await press(N, md, /取消/);
  assert.deepEqual(new Map(S.ret), before, "按取消：碼沒有用掉");
  assert.equal(N.ls.get("xq_xfUsed"), undefined, "按取消：新手機不記「收過了」"); assert.equal(N.ls.get("m_xp"), "5", "新手機的存檔不動"); assert.equal(N.ui.loads, 0);
  assert.notEqual((await A.X.xf2Check()).st, "moved", "舊手機不會顯示已搬完");
  assert.equal((await A.X.xf2Check()).st, "pending", "舊手機：還在等新手機");
  const md2 = await enter(N, code); assert.ok(md2, "取消後同一組碼還能再輸入");
  return { S, A, N, md2 };
}
async function scConfirm(src) {
  const { S, A, N, md2 } = await scCancel(src);
  await press(N, md2, /取代並重新開啟/);
  assert.equal(N.ui.loads, 1, "按取代才寫資料");
  const atLoad = [...N.ui.atLoad].filter(([t]) => t.startsWith(ROOT + "/x/")), metaAt = atLoad.find(([t]) => t.endsWith("/m"));
  assert.ok(atLoad.length > 1 && metaAt && JSON.parse(metaAt[1]).v === 4 && !JSON.parse(metaAt[1]).done, "寫資料那一刻碼還沒用掉（分段、說明都在，沒有回條）");
  assert.equal(N.ls.get("m_xp"), "1234", "新手機拿到舊手機的進度"); assert.match(N.ls.get("xq_xfUsed") || "", /^\{"[0-9a-f]{32}":\d+\}$/, "寫完才記收過");
  assert.equal(N.ls.get("xq_xfAckQ"), undefined, "回條送出了就不留待補");
  assert.equal(xTopics(S).length, 1, "寫完才清分段、只剩回條"); assert.ok(JSON.parse([...S.ret.values()][0]).done > 0);
  assert.equal((await A.X.xf2Check()).st, "moved", "舊手機這時才看到已轉到新手機");
  assert.equal(N.ui.reload, 1);
}
async function scFormat(src) {
  const S = server(), A = phone(S, { ls: OLD }, src), N = phone(S, { ls: NEW }, src);
  A.X.xfSend(); const ok = btn(A.ui.modals[0], /產生轉移碼/); await ok(); await A.ui.shP;
  const m = />([A-Z0-9]+-[A-Z0-9]+)</.exec(A.ui.B.innerHTML); assert.ok(m, "產碼畫面要顯示碼"); const shown = m[1];
  assert.match(shown, /^[A-Z0-9]{5}-[A-Z0-9]{5}$/, "顯示 5-5");
  assert.ok(hqRe(src && src.S4 || S4).test(shown), "書箱（07s4）認得出產碼畫面顯示的碼：" + shown);
  assert.equal(A.X.xfNorm(shown).length, 10, "輸入端收得下");
  await enter(N, shown);
}
async function scKid(src) {
  const S = server(), kid = { kid: true }, A = phone(S, { ls: OLD, cfg: kid }, src);
  await assert.rejects(A.X.xf4Upload(A.X.xf4Code()), e => e.message === A.X.XF4_KIDMSG, "沒過家長確認，xf4Upload 不上傳");
  assert.deepEqual(S.log, [], "一個字都沒送");
  A.X.xfSend(); await btn(A.ui.modals[0], /產生轉移碼/)();
  assert.equal(A.ui.gates.length, 1, "兒童模式按產生轉移碼：先跳家長確認題"); assert.match(A.ui.gates[0].why, /兒童模式/);
  assert.equal(A.ui.sheets.length, 0, "家長答對之前不產生"); assert.deepEqual(S.log, [], "家長答對之前沒有連線");
  await A.ui.gates[0].ok(); await A.ui.shP;
  assert.ok(xTopics(S).length >= 2, "家長答對才上傳"); assert.equal(JSON.parse(A.ls.get("xq_xfOut")).pg, 1, "記下這筆是家長確認過的");
  /* 一般模式：不用家長確認 */
  const S2 = server(), G = phone(S2, { ls: OLD }, src); G.X.xfSend(); await btn(G.ui.modals[0], /產生轉移碼/)(); await G.ui.shP;
  assert.equal(G.ui.gates.length, 0); assert.ok(xTopics(S2).length >= 2);
}
async function scBoot9(src) {
  const out = (pg) => JSON.stringify(Object.assign({ id: "0123456789abcdef0123", ah: "ab".repeat(22), exp: Date.now() + 6e5, at: Date.now() }, pg ? { pg: 1 } : {}));
  const run = async (o) => { const S = server(), P = phone(S, o, src), t = P.ui.timers.find(x => x.ms === 9000); assert.ok(t, "開機 9 秒的計時要在"); t.f(); await tick(); await tick(); return { S, P } };
  { const { S, P } = await run({ ls: { xq_xfOut: out(false) }, cfg: { kid: true } });
    assert.deepEqual(S.log, [], "兒童模式、沒有家長確認的那筆：開機 9 秒不連線"); assert.equal(P.ls.get("xq_xfOut"), undefined, "那筆清掉") }
  { const { S } = await run({ ls: { xq_xfOut: out(false) }, cfg: { net: false } }); assert.deepEqual(S.log, [], "家長關掉大廳也一樣") }
  { const { S } = await run({ ls: { xq_xfOut: out(true) }, cfg: { kid: true } }); assert.ok(S.log.some(x => x[0] === "get"), "家長確認過的照樣查回條") }
  { const { S } = await run({ ls: { xq_xfOut: out(false) } }); assert.ok(S.log.some(x => x[0] === "get"), "一般模式照舊查回條") }
}

test("取消取代：碼不用掉、分段不清、不寫回條、新手機不記收過，舊手機不顯示搬完；取消後同一組碼還能再輸入", () => scCancel());
test("確認取代：資料寫完（XQSave.load）之後才用掉碼、寫回條，舊手機這時才看到「已轉到新手機」", () => scConfirm());
test("兩支新手機同時下載：先按取代的拿到；另一支再按取代時發現已經轉走，這支手機不改動", async () => {
  const S = server(), A = phone(S, { ls: OLD }), N = phone(S, { ls: NEW }), C = phone(S, { ls: { m_xp: "9" } }), code = A.X.xf4Code();
  await A.X.xf4Upload(code); const mN = await enter(N, code), mC = await enter(C, code);
  await press(C, mC, /取代並重新開啟/); assert.equal(C.ls.get("m_xp"), "1234");
  await press(N, mN, /取代並重新開啟/);
  assert.equal(N.ui.loads, 0, "沒有寫資料"); assert.equal(N.ls.get("m_xp"), "5"); assert.ok(N.ui.toasts.some(t => /另一支手機/.test(t)));
});
test("資料寫完、回條送不出（斷線）：留待補，下次開機 9 秒補送，舊手機才看到搬完；碼本身不記在新手機", async () => {
  const S = server(), A = phone(S, { ls: OLD }), N = phone(S, { ls: NEW }), code = A.X.xf4Code();
  await A.X.xf4Upload(code); const md = await enter(N, code);
  const orig = N.ctx.XQNet.putRetained; N.ctx.XQNet.putRetained = async () => false;   /* 只有新手機寫不出去 */
  await press(N, md, /取代並重新開啟/); N.ctx.XQNet.putRetained = orig;
  assert.equal(N.ls.get("m_xp"), "1234"); const q = N.ls.get("xq_xfAckQ"); assert.ok(q, "留待補"); assert.ok(!q.includes(code), "不記碼本身");
  assert.equal((await A.X.xf2Check()).st, "pending", "回條還沒送到：舊手機不顯示搬完");
  const N2 = phone(S, { ls: Object.fromEntries(N.ls) }); N2.ui.timers.find(x => x.ms === 9000).f(); for (let i = 0; i < 6; i++) await tick();
  assert.equal(N2.ls.get("xq_xfAckQ"), undefined); assert.equal((await A.X.xf2Check()).st, "moved");
});
test("產碼格式＝輸入可收的格式＝書箱認得出：xfSend 顯示 5-5，07s4 認碼、新手機照顯示的字輸入收得到", () => scFormat());
test("兒童模式產碼要家長確認：沒答對不連線不上傳；答對才上傳並記 pg；一般模式不用", () => scKid());
test("兒童模式開機 9 秒：沒有家長確認的 xq_xfOut 不連線並清掉；確認過的、一般模式照舊查回條", () => scBoot9());

test("改壞驗證：做壞的版本要被上面的情境抓到", async () => {
  const bad = (f, a, b) => { const s = SRC0[f]; assert.equal(s.split(a).length, 2, "改壞的錨點要剛好一處：" + a); return { [f]: s.replace(a, () => b) } };
  const cases = [
    ["下載完就用掉（原本的毛病）", scCancel, bad("SAVE", "  XF4_GOT.delete(K.id);\n  return{D,id:K.id", "  XF4_GOT.delete(K.id);await xf4Commit({id:K.id,ah:K.ah,n,sid:I.sid,exp});\n  return{D,id:K.id")],
    ["寫資料之前就用掉", scConfirm, bad("SAVE", "try{await xfGamesPut(P.D.games||{})}catch(e){}\n  XQSave.load(", "try{await xfGamesPut(P.D.games||{})}catch(e){}await xf4Commit(P);\n  XQSave.load(")],
    ["畫面沒換成新版 xfRecv", scCancel, bad("SAVE", 'if(typeof xfRecv==="function"&&typeof xf4Recv==="function")xfRecv=xf4Recv;', "")],
    ["書箱只認 4-4", scFormat, bad("S4", "/^[A-Z0-9]{5}-[A-Z0-9]{5}$/", "/^[A-Z0-9]{4}-[A-Z0-9]{4}$/")],
    ["xf4Upload 不擋兒童模式", scKid, bad("SAVE", "if(kid&&!pg)throw new Error(XF4_KIDMSG);", "")],
    ["07x4 不叫家長確認", scKid, bad("X4", "if(typeof xf4KidOff===\"function\"&&xf4KidOff()){", "if(false){")],
    ["開機查回條不看兒童模式", scBoot9, bad("SAVE", "if(xf4KidOff()&&!O.pg){", "if(false){")],
  ];
  for (const [why, sc, src] of cases) await assert.rejects(sc(src), assert.AssertionError, why);
});

test("〔原始碼〕書箱券上、重新打開的轉移碼照 5＋5 切；畫面最後換成 xf4Recv；XFER4 那段不碰畫面；xf4Download 舊介面照舊＝xf4Fetch＋xf4Commit", () => {
  assert.ok(S4.includes("${esc(A.code.slice(0,5))}</b><b class=\"code\">${esc(A.code.slice(5))}") && S4.includes("A.code.slice(0,5)+\"-\"+A.code.slice(5)"));
  assert.doesNotMatch(S4, /A\.code\.slice\(0,4\)|\{4\}-\[A-Z0-9\]\{4\}/);
  const B4 = cut(SAVE, "/* XFER4:BEGIN", "/* XFER4:END */"); assert.doesNotMatch(B4, /sheet\(|modal\(|toast\(/);
  assert.match(B4, /async function xf4Download\(code,prog\)\{const P=await xf4Fetch\(code,prog\);P\.D\.data\[XF4_USED\]=xf4UsedWith\(P\);await xf4Commit\(P\);return P\.D\}/);
  const fetch = cut(SAVE, "async function xf4Fetch(", "\nfunction xf4UsedWith"); assert.doesNotMatch(fetch, /putRetained|xf2Put|setItem/, "xf4Fetch 不寫伺服器、不寫 localStorage");
  assert.ok(SAVE.indexOf("xfRecv=xf4Recv") > SAVE.indexOf("{xfUpload=xf4Upload;xfDownload=xf4Download}"));
});
