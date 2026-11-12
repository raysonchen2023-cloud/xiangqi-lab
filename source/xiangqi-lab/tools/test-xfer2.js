// 評比第 12 輪 X11（評審「連線與雲端架構師」P22.3 資料存儲與無縫轉移）：換手機轉移碼補強的自動測試。不開瀏覽器、不連伺服器、不用任何帳號或金鑰。
//   把 xiangqi-db/m/05-settings.js 的 XFER 區段和 m/05b-save.js 的 XFER2 區段一起切出來放進 vm，換上假的 XQNet（記憶體裡的保留訊息，可以讓它掉、壞、斷）、
//   假的 IndexedDB、node 內建的 WebCrypto／CompressionStream；兩個 vm 環境＝舊手機和新手機。
//   ① 完整性：說明 v3 帶每段雜湊、整份雜湊；分段先上傳、說明最後才放；伺服器上某段壞掉會被抓出來、自動重抓
//   ② 可以重試：上傳、下載每段自動再試；下載停在第幾段，再按一次從那段接著下（前面的不再抓）
//   ③ 用過、過期、作廢、偽造回條、兩台同時輸入同一組碼
//   ④ 舊手機收到「已轉到新手機」的回條；不記轉移碼本身
//   ⑤ 跟舊版相容：舊版新手機收新版的、新版新手機收舊版的
// 用法：node --test xiangqi-lab/tools/test-xfer2.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), nodeCrypto = require("node:crypto");
const M_DIR = path.join(__dirname, "../../xiangqi-db/m");
const SET = fs.readFileSync(path.join(M_DIR, "05-settings.js"), "utf8").replace(/\r\n/g, "\n");
const SAVE = fs.readFileSync(path.join(M_DIR, "05b-save.js"), "utf8").replace(/\r\n/g, "\n");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j) };
const BLOCK1 = cut(SET, "/* XFER:BEGIN", "/* XFER:END */"), BLOCK2 = cut(SAVE, "/* XFER2:BEGIN", "/* XFER2:END */");
const ROOT = "xqlab-r7k2q/v1";
const J = x => JSON.parse(JSON.stringify(x));

/* 假 IndexedDB（轉移碼只用到棋譜庫 xqlab/kv 的 getAllKeys、get、put） */
function fakeIDB(seed) {
  const dbs = new Map(); if (seed) dbs.set("xqlab", { kv: new Map(Object.entries(seed).map(([k, v]) => [k, structuredClone(v)])) });
  const later = f => setImmediate(f);
  return { dbs, open(name) { const r = {}; later(() => { let fresh = false; if (!dbs.has(name)) { dbs.set(name, {}); fresh = true } const stores = dbs.get(name);
    const db = { createObjectStore(s) { stores[s] = stores[s] || new Map() }, close() { },
      transaction(s) { const t = {}; let pending = 0, done = false; const st = stores[s];
        const fin = () => later(() => { if (!pending && !done) { done = true; t.oncomplete && t.oncomplete() } });
        const req = op => { const q = {}; pending++; later(() => { q.result = op(); q.onsuccess && q.onsuccess(); pending--; fin() }); return q };
        t.objectStore = () => ({ get: k => req(() => st.has(k) ? structuredClone(st.get(k)) : undefined), put: (v, k) => req(() => { st.set(k, structuredClone(v)); return k }), getAllKeys: () => req(() => [...st.keys()]) });
        fin(); return t } };
    r.result = db; if (fresh) r.onupgradeneeded && r.onupgradeneeded(); r.onsuccess && r.onsuccess() }); return r } };
}
/* 假伺服器（保留訊息）：getHook(topic, 第幾次讀) 可以回 undefined＝照常、null＝這次收不到、字串＝這次收到壞掉的；putHook(topic, 第幾次寫) 回 false＝這次寫失敗 */
const server = () => ({ ret: new Map(), gets: new Map(), puts: [], up: true, getHook: null, putHook: null, clock: { now: 0 } });
function phone(S, o) {
  const store = new Map(Object.entries(o.ls || {}));
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => { store.set(k, String(v)) }, removeItem: k => { store.delete(k) } };
  const ctx = {
    console, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream, btoa, atob, structuredClone, localStorage,
    crypto: nodeCrypto.webcrypto, indexedDB: fakeIDB(o.games), __clock: S.clock, setTimeout: f => setImmediate(f),   /* 重試的等待不用真的等 */
    XQSave: { dump: () => Object.fromEntries(store) }, slotAll: async () => J(o.slots || {}),
    XQNet: {
      root: () => ROOT, status: () => S.up ? "up" : "connecting",
      putRetained: async (t, s) => { const n = S.puts.filter(p => p.t === t).length + 1; S.puts.push({ t, s }); if (!S.up) return false; if (S.putHook && S.putHook(t, n, s) === false) return false; if (s === "") S.ret.delete(t); else S.ret.set(t, s); return true },
      getRetained: async t => { const n = (S.gets.get(t) || 0) + 1; S.gets.set(t, n); if (!S.up) return null; const h = S.getHook ? S.getHook(t, n) : undefined; if (h !== undefined) return h; return S.ret.has(t) ? S.ret.get(t) : null }
    }
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext("Date.now=()=>__clock.now?__clock.now:new Date().getTime();", ctx);
  vm.runInContext(BLOCK1 + "\n" + BLOCK2 + "\nglobalThis.__X={xfUpload,xfDownload,xf2Upload,xf2Download,xf2Check,xfWipe,xfKeys,xfLocalize,XF_TTL,XF_CH};", ctx, { filename: "05-settings+05b-save(XFER)" });
  return { ctx, X: ctx.__X, store };
}
const xTopics = S => [...S.ret.keys()].filter(t => t.startsWith(ROOT + "/x/"));
const OLD_LS = { xq_me: JSON.stringify({ id: "OLDphone12345", name: "小明" }), m_xp: "1234", xq_rate: JSON.stringify({ pts: 320, w: 5, l: 2, d: 1, hist: [] }) };
const BIG = () => ({ "games:play": Array.from({ length: 4000 }, (_, i) => ({ id: "big-" + i, moves: nodeCrypto.randomBytes(40).toString("hex") })) });
const metaOf = (S, U) => JSON.parse(S.ret.get(`${ROOT}/x/${U.K.id}/m`));

test("① v3 往返一致：分段先上傳、說明最後才放；說明帶每段雜湊和整份雜湊；舊手機只記碼的雜湊、不記碼本身", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  const U = await A.X.xf2Upload("ABCD2345");
  assert.ok(U.n >= 2, "要切成好幾段（實際 " + U.n + " 段）");
  const order = S.puts.filter(p => p.s !== "").map(p => p.t.split("/").pop());
  assert.equal(order[order.length - 1], "m", "說明最後才放（說明在＝分段都到齊）");
  const M = metaOf(S, U);
  assert.equal(M.v, 3); assert.equal(M.h.length, U.n); assert.match(M.ha, /^[0-9a-f]{64}$/); assert.ok(M.h.every(x => /^[0-9a-f]{24}$/.test(x)));
  assert.ok(typeof M.iv === "string" && M.n === U.n && M.exp > 0, "舊版看得懂的欄位（n、iv、gz、exp）照樣有");
  const O = JSON.parse(A.store.get("xq_xfOut"));
  assert.equal(O.id, U.K.id); assert.match(O.ah, /^[0-9a-f]{64}$/);
  assert.ok(!JSON.stringify(O).includes("ABCD2345"), "舊手機不記轉移碼本身");
  assert.deepEqual((await A.X.xf2Check()).st, "pending", "新手機還沒收：等著");
  const D = await B.X.xf2Download("abcd-2345");
  assert.deepEqual(J(D.data), OLD_LS); assert.equal(D.games.play.length, 4000);
});

test("④ 新手機收下後：分段清掉、說明換成回條；舊手機查到回條＝「已轉到新手機」，回條清掉；第二次查＝沒有在等的", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  const U = await A.X.xf2Upload("ABCD2345"); await B.X.xf2Download("ABCD2345");
  assert.deepEqual(xTopics(S), [`${ROOT}/x/${U.K.id}/m`], "只剩說明那則（已經換成回條）");
  const R = metaOf(S, U);
  assert.ok(R.done > 0 && R.ah === JSON.parse(A.store.get("xq_xfOut")).ah, "回條帶收下時間和 ah");
  assert.equal(R.iv, undefined, "回條裡沒有密文線索");
  assert.ok(R.exp - R.done >= 864e5 - 1000, "回條留 24 小時（mqtt-prune 照 exp 清）");
  const r = await A.X.xf2Check();
  assert.equal(r.st, "moved"); assert.equal(r.at, R.done);
  assert.equal(A.store.has("xq_xfOut"), false, "收掉等待中的紀錄");
  assert.ok(JSON.parse(A.store.get("xq_xfMoved")).at > 0, "記下已轉移（設定頁可以顯示）");
  await new Promise(r2 => setImmediate(r2));
  assert.deepEqual(xTopics(S), [], "回條讀完就清掉");
  assert.equal((await A.X.xf2Check()).st, "none");
});

test("③ 兩台同時（或事後）輸入同一組碼：第二台說「已經用過了、幾點轉到另一支手機」，拿不到半套", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS }), B = phone(S, { ls: {} }), C = phone(S, { ls: {} });
  S.clock.now = Date.UTC(2026, 10, 13, 6, 30);   // 臺灣 14:30
  await A.X.xf2Upload("ABCD2345"); await B.X.xf2Download("ABCD2345");
  await assert.rejects(C.X.xf2Download("ABCD2345"), e => /已經用過了/.test(e.message) && /轉到另一支手機/.test(e.message) && /\d\d:\d\d/.test(e.message));
  await assert.rejects(C.X.xf2Download("ZZZZ9999"), /找不到這組轉移碼/, "打錯碼照舊");
});

test("① 伺服器上某一段壞掉：核對檢查碼抓得出來、自動重抓；一直壞就停在「第 2 段對不上」，已收好的留著；修好後再按一次從第 2 段接著下", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  const U = await A.X.xf2Upload("ABCD2345"), t1 = `${ROOT}/x/${U.K.id}/1`, t0 = `${ROOT}/x/${U.K.id}/0`, good = S.ret.get(t1);
  assert.ok(U.n >= 3, "至少三段（實際 " + U.n + " 段）");
  S.ret.set(t1, good.slice(0, 50) + (good[50] === "A" ? "B" : "A") + good.slice(51));   // 中間改一個字（AES-GCM 也會擋，但以前只能說「解不開」）
  await assert.rejects(B.X.xf2Download("ABCD2345"), e => new RegExp(`第 2／${U.n} 段對不上檢查碼`).test(e.message) && /接著下/.test(e.message));
  assert.equal(S.gets.get(t1), 3, "同一次下載裡自動重抓了 3 次");
  assert.ok(xTopics(S).length === U.n + 1, "失敗時伺服器上的資料不清（還能重試）");
  S.ret.set(t1, good);
  const D = await B.X.xf2Download("ABCD2345");
  assert.equal(D.games.play.length, 4000);
  assert.equal(S.gets.get(t0), 1, "第 1 段已經收好、核對過，第二次不再抓（從斷掉那段接著下）");
  assert.equal(S.gets.get(t1), 4);
});

test("② 網路抖一下（某段第一次收不到）：同一次下載自動再試，不用重按", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  const U = await A.X.xf2Upload("ABCD2345"), t0 = `${ROOT}/x/${U.K.id}/0`;
  S.getHook = (t, n) => t === t0 && n === 1 ? null : undefined;
  const D = await B.X.xf2Download("ABCD2345");
  assert.deepEqual(J(D.data), OLD_LS); assert.equal(S.gets.get(t0), 2);
});

test("② 上傳中斷：某段寫失敗一次會自動再試、照樣成功；一直失敗就把已上傳的清掉、說明根本沒放出去、舊手機也不記在等", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() });
  S.putHook = (t, n) => !(t.endsWith("/1") && n === 1);
  const U = await A.X.xf2Upload("ABCD2345");
  assert.equal(metaOf(S, U).n, U.n); assert.equal(S.puts.filter(p => p.t.endsWith("/1")).length, 2, "第 2 段寫了兩次");
  const S2 = server(), A2 = phone(S2, { ls: OLD_LS, games: BIG() });
  S2.putHook = (t, n, s) => !(t.endsWith("/1") && s !== "");
  await assert.rejects(A2.X.xf2Upload("WXYZ6789"), /斷線/);
  await new Promise(r => setImmediate(r));
  assert.deepEqual(xTopics(S2), [], "已上傳的分段清掉、說明沒放出去");
  assert.equal(A2.store.has("xq_xfOut"), false);
});

test("③ 過期：新手機拒收、順手清掉；舊手機查＝作廢、安靜收掉等待紀錄（不跳「已轉移」）", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS }), B = phone(S, { ls: {} });
  S.clock.now = Date.UTC(2026, 10, 13, 8); await A.X.xf2Upload("ABCD2345");
  S.clock.now += A.X.XF_TTL + 1000;
  await assert.rejects(B.X.xf2Download("ABCD2345"), /過期/);
  assert.deepEqual(xTopics(S), []);
  assert.equal((await A.X.xf2Check()).st, "gone"); assert.equal(A.store.has("xq_xfOut"), false); assert.equal(A.store.has("xq_xfMoved"), false);
});

test("③ 舊手機按「作廢這組碼」（原本的 xfWipe）：查回條＝作廢，不跳已轉移；碼還在等時沒連上網＝這次不確定、紀錄留著下次再查", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS });
  const U = await A.X.xf2Upload("ABCD2345");
  S.up = false; assert.equal((await A.X.xf2Check()).st, "unknown"); assert.ok(A.store.has("xq_xfOut"), "沒連上：紀錄留著"); S.up = true;
  await A.X.xfWipe(U.K, U.n);
  assert.equal((await A.X.xf2Check()).st, "gone"); assert.equal(A.store.has("xq_xfMoved"), false);
});

test("③ 回條偽造（不知道轉移碼，做不出 ah）：舊手機不當成「已轉到新手機」", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS });
  const U = await A.X.xf2Upload("ABCD2345");
  S.ret.set(`${ROOT}/x/${U.K.id}/m`, JSON.stringify({ v: 3, done: 1, ah: "0".repeat(64), exp: Date.now() + 864e5 }));
  const r = await A.X.xf2Check();
  assert.notEqual(r.st, "moved"); assert.equal(A.store.has("xq_xfMoved"), false);
});

test("⑤ 相容：舊版 App 的新手機（05-settings 原本的 xfDownload）收得了新版舊手機傳的 v3；新版新手機收得了舊版舊手機傳的 v2", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  await A.X.xf2Upload("ABCD2345");
  const D = await B.X.xfDownload("ABCD2345");
  assert.deepEqual(J(D.data), OLD_LS); assert.equal(D.games.play.length, 4000);
  assert.deepEqual(xTopics(S), [], "舊版收下照樣清光（只是沒留回條）");
  assert.equal((await A.X.xf2Check()).st, "gone", "舊手機安靜收掉，不誤報");
  const S2 = server(), A2 = phone(S2, { ls: OLD_LS }), B2 = phone(S2, { ls: {} });
  const U2 = await A2.X.xfUpload("WXYZ6789");
  assert.equal(metaOf(S2, U2).v, 2);
  const D2 = await B2.X.xf2Download("WXYZ6789");
  assert.deepEqual(J(D2.data), OLD_LS);
});

test("④ 搬過去的資料不帶舊手機的「等回條」「已轉移」紀錄", async () => {
  const S = server(), A = phone(S, { ls: { ...OLD_LS, xq_xfOut: JSON.stringify({ id: "a".repeat(20), ah: "x", exp: 1 }), xq_xfMoved: JSON.stringify({ at: 1 }) } }), B = phone(S, { ls: {} });
  await A.X.xf2Upload("ABCD2345"); const D = await B.X.xf2Download("ABCD2345");
  assert.equal("xq_xfOut" in D.data, false); assert.equal("xq_xfMoved" in D.data, false);
  assert.equal(D.data.m_xp, "1234");
});

test("〔原始碼〕畫面接線：05b-save 把畫面用的 xfUpload／xfDownload 換成 xf2 版本；m.html 先載 05-settings 再載 05b-save；打開 App 會查回條", () => {
  assert.match(SAVE, /if\(typeof xfUpload==="function"&&typeof xfDownload==="function"\)\{xfUpload=xf2Upload;xfDownload=xf2Download\}/);
  const H = fs.readFileSync(path.join(M_DIR, "../m.html"), "utf8");
  assert.ok(H.indexOf("//#include m/05-settings.js") < H.indexOf("//#include m/05b-save.js"));
  assert.match(SAVE, /localStorage\.getItem\("xq_xfOut"\)\)xf2Watch\(\)/);
  assert.match(SET, /const U=await xfUpload\(code\)/, "xfSend 呼叫時才找 xfUpload（拿到換過的）");
});
