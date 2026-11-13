// 紅藍隊 r15 R03（威脅模型 I5）：換手機轉移碼 v4 的自動測試。不開瀏覽器、不連伺服器、不用任何帳號或金鑰。
//   把 xiangqi-db/m/05-settings.js 的 XFER 區段、m/05b-save.js 的 XFER2、XFER4 區段一起切出來放進 vm，換上假的 XQNet（記憶體裡的保留訊息）、
//   假的 IndexedDB、node 內建的 WebCrypto／CompressionStream；每個 vm 環境＝一支手機。
//   要擋的：錯碼、過期、重放、竄改其中一段（改字、調換、拿別次上傳的段）、竄改說明（段數、期限、密文、整份換掉）；
//   要過的：正常轉移、舊 v3 的 8 碼照收但帶警告、期限過了舊碼拒收；主題 id 不能再用一次 SHA-256 反推。
// 用法：node --test xiangqi-lab/tools/test-xfer4.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), nodeCrypto = require("node:crypto");
const M_DIR = path.join(__dirname, "../../xiangqi-db/m");
const SET = fs.readFileSync(path.join(M_DIR, "05-settings.js"), "utf8").replace(/\r\n/g, "\n");
const SAVE = fs.readFileSync(path.join(M_DIR, "05b-save.js"), "utf8").replace(/\r\n/g, "\n");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(i, j) };
const BLOCK1 = cut(SET, "/* XFER:BEGIN", "/* XFER:END */"), BLOCK2 = cut(SAVE, "/* XFER2:BEGIN", "/* XFER2:END */"), BLOCK4 = cut(SAVE, "/* XFER4:BEGIN", "/* XFER4:END */");
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
const server = () => ({ ret: new Map(), gets: new Map(), puts: [], up: true, clock: { now: 0 } });
function phone(S, o) {
  const store = new Map(Object.entries(o.ls || {}));
  const localStorage = { getItem: k => store.has(k) ? store.get(k) : null, setItem: (k, v) => { store.set(k, String(v)) }, removeItem: k => { store.delete(k) } };
  const ctx = {
    console, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream, btoa, atob, structuredClone, localStorage,
    crypto: nodeCrypto.webcrypto, indexedDB: fakeIDB(o.games), __clock: S.clock, setTimeout: f => setImmediate(f),   /* 重試的等待不用真的等 */
    XQSave: { dump: () => Object.fromEntries(store) }, slotAll: async () => J(o.slots || {}),
    XQNet: {
      root: () => ROOT, status: () => S.up ? "up" : "connecting",
      putRetained: async (t, s) => { S.puts.push({ t, s }); if (!S.up) return false; if (s === "") S.ret.delete(t); else S.ret.set(t, s); return true },
      getRetained: async t => { S.gets.set(t, (S.gets.get(t) || 0) + 1); if (!S.up) return null; return S.ret.has(t) ? S.ret.get(t) : null }
    }
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext("Date.now=()=>__clock.now?__clock.now:new Date().getTime();", ctx);
  vm.runInContext(BLOCK1 + "\n" + BLOCK2 + "\n" + BLOCK4 + "\nglobalThis.__X={xfUpload,xfDownload,xf2Upload,xf2Download,xf2Check,xf4Upload,xf4Download,xf4Keys,xf4Code,xfWipe,XF_TTL,XF4_IT,XF4_V3_UNTIL,XF4_USED};", ctx, { filename: "05-settings+05b-save(XFER/XFER2/XFER4)" });
  return { ctx, X: ctx.__X, store };
}
const xTopics = S => [...S.ret.keys()].filter(t => t.startsWith(ROOT + "/x/"));
const OLD_LS = { xq_me: JSON.stringify({ id: "OLDphone12345", name: "小明" }), m_xp: "1234", xq_rate: JSON.stringify({ pts: 320, w: 5, l: 2, d: 1, hist: [] }) };
const BIG = () => ({ "games:play": Array.from({ length: 4000 }, (_, i) => ({ id: "big-" + i, moves: nodeCrypto.randomBytes(40).toString("hex") })) });
const CODE = "ABCDE23456", CODE2 = "WXYZ789KMN";
const mt = U => `${ROOT}/x/${U.K.id}/m`, pt = (U, i) => `${ROOT}/x/${U.K.id}/${i}`;
const flip = (s, at) => s.slice(0, at) + (s[at] === "A" ? "B" : "A") + s.slice(at + 1);
const snap = S => new Map(S.ret);
const restore = (S, m) => { S.ret.clear(); for (const [k, v] of m) S.ret.set(k, v) };

test("正常轉移：10 碼往返一致；說明裡看不到段雜湊、iv、sid；收完只剩回條、舊手機收到「已轉到新手機」", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  const U = await A.X.xf4Upload(CODE);
  assert.ok(U.n >= 2, "要切成好幾段（實際 " + U.n + " 段）");
  assert.match(U.K.id, /^[0-9a-f]{20}$/, "主題 id 長度照舊（mqtt-prune、xf2Check 看得懂）");
  const M = JSON.parse(S.ret.get(mt(U)));
  assert.deepEqual(Object.keys(M).sort(), ["c", "exp", "n", "v"], "說明只剩版本、段數、期限（都綁在 AAD）和密文");
  assert.equal(M.v, 4); assert.equal(M.n, U.n);
  const order = S.puts.filter(p => p.s !== "").map(p => p.t.split("/").pop());
  assert.equal(order[order.length - 1], "m", "說明最後才放");
  assert.equal((await A.X.xf2Check()).st, "pending", "v4 說明沒有 iv，舊手機還是看得出在等");
  assert.ok(!A.store.get("xq_xfOut").includes(CODE), "舊手機不記碼本身");
  const D = await B.X.xf4Download("abcde-23456");
  const d = J(D.data); assert.match(d.xq_xfUsed, /^\{"[0-9a-f]{32}":\d+\}$/, "收過的 sid 跟著資料走（XQSave.load 取代後還在）"); delete d.xq_xfUsed;
  assert.deepEqual(d, OLD_LS);
  assert.equal(D.games.play.length, 4000); assert.equal(D.xfWarn, undefined, "v4 不帶警告");
  assert.deepEqual(xTopics(S), [mt(U)], "分段清掉，只剩回條");
  const R = JSON.parse(S.ret.get(mt(U)));
  assert.ok(R.done > 0 && R.ah === U.K.ah && R.iv === undefined && R.c === undefined);
  const r = await A.X.xf2Check(); assert.equal(r.st, "moved");
  await assert.rejects(phone(S, { ls: {} }).X.xf4Download(CODE), /已經用過了/, "第二支手機再輸入：已經用過了");
});

test("主題 id、回條不能再用一次 SHA-256 反推：跟 v3 算法不同，而且是 PBKDF2-SHA512 30 萬次以上導出", async () => {
  const S = server(), A = phone(S, {});
  const K = await A.X.xf4Keys(CODE);
  const v3 = nodeCrypto.createHash("sha256").update("xqlab-xfer-id:" + CODE).digest().subarray(0, 10).toString("hex");
  assert.notEqual(K.id, v3);
  assert.ok(A.X.XF4_IT >= 300000);
  const bits = nodeCrypto.pbkdf2Sync(CODE, "xqlab-xfer-v4", A.X.XF4_IT, 64, "sha512");
  assert.equal(K.id, bits.subarray(32, 42).toString("hex"), "主題 id＝PBKDF2 輸出後半");
  assert.equal(K.ah, bits.subarray(42, 64).toString("hex"), "回條 ah 也從同一次 PBKDF2 來，不再是 SHA-256(碼)");
  assert.equal((await A.X.xf4Keys("abcde-23456")).id, K.id, "大小寫、連字號不影響");
});

test("xf4Code：10 碼、只用避開易混字的字元集、不偏向前幾個字", async () => {
  const A = phone(server(), {}), cnt = {};
  for (let k = 0; k < 6200; k++) { const c = A.X.xf4Code(); assert.match(c, /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{10}$/); for (const ch of c) cnt[ch] = (cnt[ch] || 0) + 1 }
  const v = Object.values(cnt), mean = 62000 / 31;
  assert.equal(v.length, 31);
  assert.ok(Math.max(...v) < mean * 1.12 && Math.min(...v) > mean * 0.88, "每個字出現次數差不多（" + Math.min(...v) + "～" + Math.max(...v) + "）");
});

test("錯碼：別的 10 碼找不到；長度不對直接拒", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS }), B = phone(S, { ls: {} });
  await A.X.xf4Upload(CODE);
  await assert.rejects(B.X.xf4Download(CODE2), /找不到這組轉移碼/);
  await assert.rejects(B.X.xf4Download("ABCDE2345"), /10 碼/);
  await assert.rejects(A.X.xf4Upload("ABCD2345"), /10 碼/, "v4 上傳只收 10 碼");
});

test("過期：新手機拒收、順手清掉；舊手機查＝作廢", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS }), B = phone(S, { ls: {} });
  S.clock.now = Date.UTC(2026, 10, 13, 8); await A.X.xf4Upload(CODE);
  S.clock.now += A.X.XF_TTL + 1000;
  await assert.rejects(B.X.xf4Download(CODE), /過期/);
  assert.deepEqual(xTopics(S), []);
  assert.equal((await A.X.xf2Check()).st, "gone");
});

test("竄改說明：改期限（想延長）、改段數、改密文、拿別組碼做的說明整份換掉，都拒收", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  S.clock.now = Date.UTC(2026, 10, 13, 8);
  const U = await A.X.xf4Upload(CODE), good = S.ret.get(mt(U)), M = JSON.parse(good);
  const cases = [
    ["期限延長", { ...M, exp: M.exp + 864e5 }],
    ["段數少一段（截短）", { ...M, n: M.n - 1 }],
    ["密文改一個字", { ...M, c: flip(M.c, 30) }],
    ["版本改成 3", { ...M, v: 3 }],
    ["沒有密文", { v: 4, n: M.n, exp: M.exp }],
  ];
  for (const [why, bad] of cases) {
    S.ret.set(mt(U), JSON.stringify(bad));
    await assert.rejects(B.X.xf4Download(CODE), /說明對不上|資料不完整/, why);
  }
  /* 用另一組碼（攻擊的人自己的碼）上傳一份假資料，再把它的說明和分段搬到這組碼的主題 */
  const S2 = server(); S2.clock.now = S.clock.now; const E = phone(S2, { ls: { m_xp: "999999" } });
  const U2 = await E.X.xf4Upload(CODE2);
  S.ret.set(mt(U), S2.ret.get(mt(U2))); for (let i = 0; i < U2.n; i++) S.ret.set(pt(U, i), S2.ret.get(pt(U2, i)));
  await assert.rejects(B.X.xf4Download(CODE), /說明對不上/, "整份換成別人做的");
  /* 期限過了才延長：還是拒 */
  S.ret.set(mt(U), good); for (let i = 0; i < U.n; i++) S.ret.delete(pt(U, i));
  const U3 = await A.X.xf4Upload(CODE);
  S.clock.now = M.exp + 1000; S.ret.set(mt(U3), JSON.stringify({ ...JSON.parse(S.ret.get(mt(U3))), exp: M.exp + 864e5 }));
  await assert.rejects(B.X.xf4Download(CODE), /說明對不上/);
  assert.equal(B.store.has("xq_xfUsed"), false, "都沒收下");
});

test("竄改其中一段：改一個字、兩段對調、拿別次上傳的段，都拒收並說是第幾段；改回來可以從那段接著下", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  const U = await A.X.xf4Upload(CODE);
  assert.ok(U.n >= 2);
  const p0 = S.ret.get(pt(U, 0)), p1 = S.ret.get(pt(U, 1));
  S.ret.set(pt(U, 1), flip(p1, 200));
  await assert.rejects(B.X.xf4Download(CODE), e => new RegExp(`第 2／${U.n} 段對不上`).test(e.message));
  assert.equal(S.gets.get(pt(U, 1)), 3, "自動重抓 3 次");
  S.ret.set(pt(U, 1), p0);
  await assert.rejects(B.X.xf4Download(CODE), /第 2／\d+ 段對不上/, "第 1 段放到第 2 段的位置");
  /* 同一組碼重新上傳一次（新的 sid），拿新的第 2 段混進舊的那份 */
  const keep = snap(S), U2 = await A.X.xf4Upload(CODE), mixed = S.ret.get(pt(U2, 1));
  restore(S, keep); S.ret.set(pt(U, 1), mixed);
  const C = phone(S, { ls: {} });
  await assert.rejects(C.X.xf4Download(CODE), /第 2／\d+ 段對不上/, "別次上傳的段");
  S.ret.set(pt(U, 1), p1);
  const before = S.gets.get(pt(U, 0));
  const D = await C.X.xf4Download(CODE);
  assert.equal(D.games.play.length, 4000);
  assert.equal(S.gets.get(pt(U, 0)), before, "第 1 段已經收好，第二次不再抓");
});

test("重放：收完以後有人把錄下來的訊息再放回去，同一支手機不收第二次（存檔取代後也記得）；過期後重放誰都不收", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS }), B = phone(S, { ls: {} });
  S.clock.now = Date.UTC(2026, 10, 13, 8);
  const U = await A.X.xf4Upload(CODE), rec = snap(S);
  const D = await B.X.xf4Download(CODE);
  restore(S, rec);
  await assert.rejects(B.X.xf4Download(CODE), /已經收過了/);
  const B2 = phone(S, { ls: D.data });   /* XQSave.load 用 D.data 整個取代 localStorage 之後 */
  await assert.rejects(B2.X.xf4Download(CODE), /已經收過了/);
  assert.equal(xTopics(S).length, U.n + 1, "拒收重放時不動伺服器上的東西");
  S.clock.now = U.exp + 1000; restore(S, rec);
  await assert.rejects(phone(S, { ls: {} }).X.xf4Download(CODE), /過期/);
});

test("舊 v3 的 8 碼：期限內照收、帶「安全性較低，建議重新產生」；期限過了拒收並請對方更新", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: BIG() }), B = phone(S, { ls: {} });
  S.clock.now = Date.UTC(2026, 10, 13, 8);
  await A.X.xf2Upload("ABCD2345");   /* 舊版 App 的舊手機 */
  const D = await B.X.xf4Download("abcd-2345");   /* 畫面用的 xfDownload 在 05b-save 最後換成 xf4Download（原始碼測試檢查） */
  assert.deepEqual(J(D.data), OLD_LS); assert.equal(D.games.play.length, 4000);
  assert.match(D.xfWarn, /安全性較低/); assert.match(D.xfWarn, /重新產生/);
  const S2 = server(), A2 = phone(S2, { ls: OLD_LS }), B2 = phone(S2, { ls: {} });
  S2.clock.now = A2.X.XF4_V3_UNTIL - 60000; await A2.X.xf2Upload("WXYZ6789");
  S2.clock.now = A2.X.XF4_V3_UNTIL + 1000;
  await assert.rejects(B2.X.xf4Download("WXYZ6789"), /停止支援/);
});

test("回條偽造（沒有碼就做不出 ah）：舊手機不當成已轉移", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS });
  const U = await A.X.xf4Upload(CODE);
  S.ret.set(mt(U), JSON.stringify({ v: 4, done: 1, ah: "0".repeat(44), exp: Date.now() + 864e5 }));
  assert.notEqual((await A.X.xf2Check()).st, "moved");
});

test("〔原始碼〕畫面接線：xfSend 產生 10 碼（5-5 顯示）、xfRecv 收 10 碼和舊 8 碼並顯示警告；05b-save 最後把 xfUpload／xfDownload 換成 v4；PBKDF2 用 deriveBits 512", () => {
  const send = SET.slice(SET.indexOf("async function xfSend"), SET.indexOf("async function xfRecv"));
  assert.match(send, /const code=xf4Code\(\),shown=code\.slice\(0,5\)\+"-"\+code\.slice\(5\)/);
  assert.doesNotMatch(send, /Uint8Array\(8\)/);
  const recv = SET.slice(SET.indexOf("async function xfRecv"), SET.indexOf("/* 意見回饋 491（開發者）"));
  assert.match(recv, /code\.length!==10&&code\.length!==8/); assert.match(recv, /D\.xfWarn\?/); assert.match(recv, /maxlength="11"/);
  const i2 = SAVE.indexOf("{xfUpload=xf2Upload;xfDownload=xf2Download}"), i4 = SAVE.indexOf("{xfUpload=xf4Upload;xfDownload=xf4Download}");
  assert.ok(i2 > 0 && i4 > i2, "v4 換在 v3 後面（最後生效的是 v4）");
  assert.match(BLOCK4, /deriveBits\(\{name:"PBKDF2",salt:te\.encode\(XF4_SALT\),iterations:XF4_IT,hash:"SHA-512"\},base,512\)/);
  assert.doesNotMatch(BLOCK4, /digest\("SHA-256"/, "v4 不再用一次 SHA-256 算主題");
  assert.doesNotMatch(BLOCK4, /sheet\(|modal\(|toast\(/, "XFER4 那段不碰畫面");
});
