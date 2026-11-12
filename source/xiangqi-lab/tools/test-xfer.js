// 評審 P22 缺陷 e、f、g（11/11）：換手機轉移碼的自動測試。不開瀏覽器、不連伺服器。
//   把 xiangqi-db/m/05-settings.js 的 XFER:BEGIN～XFER:END 那段切出來放進 vm，換上假的 XQNet（記憶體裡的保留訊息）、假的 IndexedDB、
//   node 內建的 WebCrypto／CompressionStream，兩個 vm 環境＝舊手機和新手機：
//   f 往返一致：localStorage、三格存檔、棋譜庫（games:play／pvp／study／peek）上傳再下載一字不差；棋譜大到要切好幾段也一樣；新手機合併棋譜（同 id 不重複、原有的不刪）
//   e 清除：新手機解開後伺服器上的說明和分段全部清掉（第二次輸入找不到）；過期的碼會被拒收而且順手清掉；上傳到一半失敗會把已上傳的清掉；
//     tools/mqtt-prune.js 的 judgeX：過期、沒有期限、只剩分段的整組清，還在期限內的不動
//   g 新手機用自己的裝置代號（舊的留給舊手機），不帶「正在下哪一盤」和舊代號的刪除請求
// 用法：node --test xiangqi-lab/tools/test-xfer.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), nodeCrypto = require("node:crypto");
const SET = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/05-settings.js"), "utf8").replace(/\r\n/g, "\n");
const a = SET.indexOf("/* XFER:BEGIN"), b = SET.indexOf("/* XFER:END */");
const BLOCK = SET.slice(a, b);
const ROOT = "xqlab-r7k2q/v1";
const J = x => JSON.parse(JSON.stringify(x));

/* ---------- 假 IndexedDB（只做轉移碼用到的：open＋upgrade、transaction、get／put／getAllKeys、oncomplete） ---------- */
function fakeIDB(seed) {
  const dbs = new Map();
  if (seed) dbs.set("xqlab", { kv: new Map(Object.entries(seed).map(([k, v]) => [k, structuredClone(v)])) });
  const later = f => setImmediate(f);
  return {
    dbs, open(name) {
      const r = {}; later(() => {
        let fresh = false; if (!dbs.has(name)) { dbs.set(name, {}); fresh = true }
        const stores = dbs.get(name);
        const db = {
          createObjectStore(s) { stores[s] = stores[s] || new Map() }, close() { },
          transaction(s, mode) {
            const t = {}; let pending = 0, done = false; const st = stores[s];
            const fin = () => later(() => { if (!pending && !done) { done = true; t.oncomplete && t.oncomplete() } });
            const req = op => { const q = {}; pending++; later(() => { q.result = op(); q.onsuccess && q.onsuccess(); pending--; fin() }); return q };
            t.objectStore = () => ({
              get: k => req(() => st.has(k) ? structuredClone(st.get(k)) : undefined),
              put: (v, k) => { if (mode !== "readwrite") throw new Error("唯讀交易不能寫"); return req(() => { st.set(k, structuredClone(v)); return k }) },
              getAllKeys: () => req(() => [...st.keys()])
            });
            fin(); return t;
          }
        };
        r.result = db; if (fresh) r.onupgradeneeded && r.onupgradeneeded(); r.onsuccess && r.onsuccess();
      }); return r;
    }
  };
}
/* ---------- 一支手機：XFER 那段＋假 XQNet（伺服器的保留訊息是兩支手機共用的 Map） ---------- */
function phone(server, o) {
  const store = new Map(Object.entries(o.ls || {}));
  const ctx = {
    console, TextEncoder, TextDecoder, Blob, Response, CompressionStream, DecompressionStream, btoa, atob, structuredClone,
    crypto: nodeCrypto.webcrypto, indexedDB: fakeIDB(o.games), __clock: server.clock, setTimeout,
    XQSave: { dump: () => Object.fromEntries(store) }, slotAll: async () => J(o.slots || {}),
    XQNet: {
      root: () => ROOT,
      putRetained: async (t, s) => { server.puts++; if (server.failAfter != null && server.puts > server.failAfter && s !== "") return false; if (s === "") server.ret.delete(t); else server.ret.set(t, s); return true },
      getRetained: async t => server.ret.has(t) ? server.ret.get(t) : null
    }
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext("Date.now=()=>__clock.now?__clock.now:new Date().getTime();", ctx);
  vm.runInContext(BLOCK + "\nglobalThis.__X={xfUpload,xfDownload,xfLocalize,xfGamesAll,xfGamesPut,xfWipe,xfKeys,XF_TTL,XF_CH};", ctx, { filename: "05-settings.js(XFER)" });
  return { ctx, X: ctx.__X, store, idb: ctx.indexedDB, games: () => { const d = ctx.indexedDB.dbs.get("xqlab"); return d && d.kv ? Object.fromEntries([...d.kv].map(([k, v]) => [k, J(v)])) : {} } };
}
const server = () => ({ ret: new Map(), puts: 0, failAfter: null, clock: { now: 0 } });
const xTopics = S => [...S.ret.keys()].filter(t => t.startsWith(ROOT + "/x/"));
const g = (id, n) => ({ id, date: id.slice(0, 10), red: "甲", black: "乙", moves: Array.from({ length: n || 4 }, (_, i) => ({ f: i, t: i + 9, cn: "炮二平五" })), result: { w: "r" } });
const OLD_LS = { xq_me: JSON.stringify({ id: "OLDphone12345", name: "小明" }), xq_net: JSON.stringify({ gid: "abc" }), m_srvDelReq: JSON.stringify({ id: "D-1111-7K3Q" }),
  m_xp: "1234", xq_netBind: JSON.stringify({ g1: { t: 1, legacy: true } }), xq_rate: JSON.stringify({ pts: 320, w: 5, l: 2, d: 1, hist: [] }), m_anonId: JSON.stringify("anon-xyz") };
const OLD_GAMES = { "games:play": [g("2026-11-01-a"), g("2026-11-02-b"), g("2026-11-03-c")], "games:pvp": [g("2026-11-04-d")], "games:study": [g("2026-11-05-e", 12)], "games:peek": [g("2026-11-06-f")], "ana:xyz": { cache: 1 } };
const SLOTS = { 1: { v: 1, at: 1, meta: { nm: "小明" }, data: { m_xp: "1234" } } };

test("f 往返一致：localStorage、三格存檔、棋譜庫上傳再下載一字不差；分析快取不帶", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: OLD_GAMES, slots: SLOTS }), B = phone(S, { ls: {}, games: {} });
  const U = await A.X.xfUpload("ABCD2345");
  assert.equal(U.games, 6, "六盤棋譜");
  assert.ok(S.ret.has(`${ROOT}/x/${U.K.id}/m`) && S.ret.has(`${ROOT}/x/${U.K.id}/0`));
  assert.ok(!xTopics(S).some(t => S.ret.get(t).includes("小明")), "伺服器上只有密文");
  const D = await B.X.xfDownload("abcd-2345");
  assert.deepEqual(J(D.data), OLD_LS, "localStorage 全部帶到");
  assert.deepEqual(J(D.slots), SLOTS, "三格存檔");
  assert.deepEqual(J(D.games), { play: OLD_GAMES["games:play"], pvp: OLD_GAMES["games:pvp"], study: OLD_GAMES["games:study"], peek: OLD_GAMES["games:peek"] }, "棋譜庫四類都帶到，分析快取（ana:）不帶");
});

test("f 棋譜很多（壓縮後還超過一段）：切成好幾段，照樣一字不差", async () => {
  const S = server(), many = Array.from({ length: 3000 }, (_, i) => ({ id: "big-" + i, moves: nodeCrypto.randomBytes(40).toString("hex") }));
  const A = phone(S, { ls: OLD_LS, games: { "games:play": many } }), B = phone(S, { ls: {} });
  const U = await A.X.xfUpload("WXYZ6789");
  assert.ok(U.n >= 2, "要切成 2 段以上（實際 " + U.n + " 段）");
  const D = await B.X.xfDownload("WXYZ6789");
  assert.deepEqual(J(D.games.play), many);
  assert.deepEqual(xTopics(S), [], "收下後全部清掉");
});

test("f 新手機合併棋譜：同一盤 id 不重複，新手機原有的不刪，回傳新增幾盤", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: OLD_GAMES });
  const own = g("2026-11-09-own"), B = phone(S, { ls: {}, games: { "games:play": [own, g("2026-11-01-a")], "ana:keep": { x: 1 } } });
  await A.X.xfUpload("ABCD2345"); const D = await B.X.xfDownload("ABCD2345");
  const n = await B.X.xfGamesPut(D.games);
  assert.equal(n, 5, "play 多 2 盤（1 盤重複）＋pvp、study、peek 各 1");
  const G = B.games();
  assert.deepEqual(G["games:play"].map(x => x.id), ["2026-11-09-own", "2026-11-01-a", "2026-11-02-b", "2026-11-03-c"]);
  assert.equal(G["games:study"][0].moves.length, 12);
  assert.deepEqual(G["ana:keep"], { x: 1 }, "其他資料不動");
  assert.equal(await B.X.xfGamesPut(D.games), 0, "再合併一次不會重複");
});

test("e 新手機解開後馬上清掉伺服器上的資料；第二次輸入同一組碼找不到", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS, games: OLD_GAMES }), B = phone(S, { ls: {} });
  await A.X.xfUpload("ABCD2345");
  assert.ok(xTopics(S).length >= 2);
  await B.X.xfDownload("ABCD2345");
  assert.deepEqual(xTopics(S), [], "說明和分段都清了（不用等使用者按確認、也不靠舊手機的計時器）");
  await assert.rejects(B.X.xfDownload("ABCD2345"), /找不到這組轉移碼/);
  await assert.rejects(B.X.xfDownload("ZZZZ9999"), /找不到這組轉移碼/, "打錯碼");
});

test("e 過期的碼：新手機拒收，而且順手把伺服器上的清掉", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS }), B = phone(S, { ls: {} });
  S.clock.now = Date.UTC(2026, 10, 11, 8); await A.X.xfUpload("ABCD2345");
  S.clock.now += A.X.XF_TTL + 1000;
  await assert.rejects(B.X.xfDownload("ABCD2345"), /過期/);
  assert.deepEqual(xTopics(S), [], "過期的也清掉");
});

test("e 上傳到一半斷線：已經上傳的說明和分段清掉，不留半套", async () => {
  const S = server(), many = Array.from({ length: 3000 }, (_, i) => ({ id: "big-" + i, moves: nodeCrypto.randomBytes(40).toString("hex") }));
  const A = phone(S, { ls: OLD_LS, games: { "games:play": many } });
  S.failAfter = 2;                                   // 說明＋第 0 段上傳成功，第 1 段失敗
  await assert.rejects(A.X.xfUpload("ABCD2345"), /斷線/);
  await new Promise(r => setImmediate(r));
  assert.deepEqual(xTopics(S), []);
});

test("e mqtt-prune judgeX：過期（加 10 分鐘寬限）、沒有期限、只剩分段的整組清；期限內的、其他主題不動", () => {
  const M = require("./mqtt-prune.js"), now = Date.UTC(2026, 10, 11, 8), id = n => n.repeat(20).slice(0, 20);
  const meta = exp => JSON.stringify({ v: 2, n: 2, iv: "x", gz: true, ...(exp != null ? { exp } : {}) });
  const rows = M.judgeX([
    [`x/${id("a")}/m`, meta(now - M.X_GRACE - 60000)], [`x/${id("a")}/0`, "AAA"], [`x/${id("a")}/1`, "BBB"],
    [`x/${id("b")}/m`, meta(now + 60000)], [`x/${id("b")}/0`, "CCC"],
    [`x/${id("c")}/m`, meta(now - 60000)],                                // 剛過期、還在寬限內
    [`x/${id("d")}/0`, "DDD"], [`x/${id("d")}/1`, "EEE"],                  // 只剩分段
    [`x/${id("e")}/m`, meta(null)], [`x/${id("e")}/0`, "FFF"],             // 沒有期限
    [`x/${id("f")}/m`, ""],                                              // 已經清掉的
    ["h/p1", "{}"], ["x/not-hex/m", meta(1)]
  ], now);
  const kill = rows.filter(r => r.expire).map(r => r.rel).sort(), keep = rows.filter(r => !r.expire).map(r => r.rel).sort();
  assert.deepEqual(kill, [`x/${id("a")}/0`, `x/${id("a")}/1`, `x/${id("a")}/m`, `x/${id("d")}/0`, `x/${id("d")}/1`, `x/${id("e")}/0`, `x/${id("e")}/m`].sort());
  assert.deepEqual(keep, [`x/${id("b")}/0`, `x/${id("b")}/m`, `x/${id("c")}/m`].sort());
  assert.ok(rows.every(r => r.kind === "x"));
  const src = fs.readFileSync(path.join(__dirname, "mqtt-prune.js"), "utf8");
  assert.match(src, /"\/x\/\+\/\+"/, "清理工具要訂閱 x/+/+");
  assert.match(src, /if \(!ID\) rows\.push\(\.\.\.judgeX\(/, "刪除請求模式以外都要判 x");
});

test("g 新手機用自己的裝置代號，舊的留給舊手機；不帶正在下的那盤和舊代號的刪除請求", async () => {
  const S = server(), A = phone(S, { ls: OLD_LS }), B = phone(S, { ls: {} });
  await A.X.xfUpload("ABCD2345"); const D = await B.X.xfDownload("ABCD2345");
  const L = B.X.xfLocalize(D.data, "NEWphone67890");
  assert.equal(L.old, "OLDphone12345"); assert.equal(L.id, "NEWphone67890");
  assert.deepEqual(JSON.parse(L.data.xq_me), { id: "NEWphone67890", name: "小明" }, "名字照舊、代號換成新手機的");
  assert.equal("xq_net" in L.data, false, "不帶正在下的那盤（新代號不是那盤的一方）");
  assert.equal("m_srvDelReq" in L.data, false, "舊代號的刪除請求紀錄不帶");
  assert.equal("xq_netBind" in L.data, false, "對局簽名的金鑰綁定是舊手機的，不帶");
  assert.equal(L.data.xq_rate, OLD_LS.xq_rate, "線上戰績、積分照樣帶");
  assert.equal(L.data.m_xp, "1234");
  assert.equal(JSON.parse(D.data.xq_me).id, "OLDphone12345", "原始資料不被改");
  const same = B.X.xfLocalize(D.data, "OLDphone12345");   // 新手機剛好跟舊手機同一個代號（以前用舊版搬過）
  assert.notEqual(same.id, "OLDphone12345", "一樣就產生新的");
  assert.match(same.id, /^[A-Za-z0-9]{3,40}$/);
  const none = B.X.xfLocalize({ m_xp: "1" }, "");
  assert.match(none.id, /^[A-Za-z0-9]{3,40}$/); assert.equal(JSON.parse(none.data.xq_me).id, none.id);
});

test("〔原始碼〕畫面接線：xfRecv 取代前先換代號、合併棋譜；xfSend 走 xfUpload／xfWipe", () => {
  const recv = SET.slice(SET.indexOf("async function xfRecv"), SET.indexOf("/* 意見回饋 491（開發者）"));
  assert.match(recv, /const L=xfLocalize\(D\.data,meInfo\(\)\.id\);try\{await xfGamesPut\(D\.games\|\|\{\}\)\}catch\(e\)\{\}XQSave\.load\(L\.data,/);
  assert.match(recv, /xfDownload\(code,/);
  const send = SET.slice(SET.indexOf("async function xfSend"), SET.indexOf("async function xfRecv"));
  assert.match(send, /xfUpload\(code\)/); assert.match(send, /xfWipe\(U\.K,U\.n\)/);
  assert.doesNotMatch(BLOCK, /sheet\(|modal\(|toast\(/, "XFER 那段不碰畫面");
});
