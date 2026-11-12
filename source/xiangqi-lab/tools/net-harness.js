"use strict";
// 線上大廳測試共用的假環境（tools/test-net-reconnect.js、tools/test-net-sign.js、tools/test-net-chaos.js 用）：
//   假時鐘 Sched（計時器照時間先後跑；每跑一個就等 WebCrypto、假 IndexedDB 這些非同步工作做完，假時間不會前進）、
//   假 MQTT 伺服器 Broker（CONNECT／SUBSCRIBE／PUBLISH／保留訊息／遺囑／心跳）、一支手機 phone（vm 載入真正的 src/net.js，WebSocket 接假伺服器）。
//   不連正式或測試伺服器、不發任何真的訊息。
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, "..");
const NET_SRC = fs.readFileSync(process.env.XQ_NET_SRC || path.join(LAB, "src/net.js"), "utf8")   /* XQ_NET_SRC：反向驗證時換成改壞的 net.js */, webcrypto = require("node:crypto").webcrypto;
const CORE_SRC = fs.readFileSync(path.join(LAB, "site/core.js"), "utf8");
const CHECK_LINE = (fs.readFileSync(path.join(LAB, "src/local.js"), "utf8").match(/^\s*window\.XQ_netCheck=.*$/m) || [])[0];
const C = require("../site/core.js");
const ROOT = "xqlab-r7k2q/v1";
const te = new TextEncoder(), td = new TextDecoder();

/* ---------- 非同步工作計數：WebCrypto、假 IndexedDB 每開始一件 +1、做完 -1；settle() 等到歸零（中間會冒出的新工作也等） ---------- */
const PEND = { n: 0 };
const track = p => { PEND.n++; return Promise.resolve(p).finally(() => { PEND.n-- }) };
const tick = () => new Promise(r => setImmediate(r));
async function settle() { for (let i = 0; i < 100000; i++) { await tick(); if (!PEND.n) { await tick(); if (!PEND.n) return } } throw new Error("非同步工作一直做不完") }
const subtle = new Proxy(webcrypto.subtle, { get(t, k) { const f = t[k]; return typeof f === "function" ? (...a) => track(f.apply(t, a)) : f } });
const cryptoT = { subtle, getRandomValues: a => webcrypto.getRandomValues(a), randomUUID: () => webcrypto.randomUUID() };
/* 假 IndexedDB（只做 net.js 簽章金鑰用到的：open＋upgrade、transaction、get／put／add、oncomplete）；值用 structuredClone 存（CryptoKey 也可以） */
function fakeIDB() {
  const dbs = new Map(), later = f => { PEND.n++; setImmediate(() => { try { f() } finally { PEND.n-- } }) };
  return {
    dbs, open(name) {
      const r = {}; later(() => {
        let fresh = false; if (!dbs.has(name)) { dbs.set(name, {}); fresh = true } const stores = dbs.get(name);
        const db = {
          createObjectStore(n) { stores[n] = stores[n] || new Map() }, close() { },
          transaction(n, mode) {
            const t = {}, st = stores[n]; let pending = 0, done = false, failed = null;
            const fin = () => later(() => { if (!pending && !done) { done = true; if (failed) { t.error = failed; t.onerror && t.onerror() } else t.oncomplete && t.oncomplete() } });
            const req = op => { const q = {}; pending++; later(() => { try { q.result = op() } catch (e) { failed = e; q.error = e } if (!failed) q.onsuccess && q.onsuccess(); pending--; fin() }); return q };
            t.objectStore = () => ({
              get: k => req(() => st.has(k) ? structuredClone(st.get(k)) : undefined),
              put: (v, k) => req(() => { st.set(k, structuredClone(v)); return k }),
              add: (v, k) => req(() => { if (st.has(k)) throw new Error("ConstraintError"); st.set(k, structuredClone(v)); return k })
            });
            fin(); return t;
          }
        };
        r.result = db; if (fresh) r.onupgradeneeded && r.onupgradeneeded(); r.onsuccess && r.onsuccess();
      }); return r;
    }
  };
}

/* ---------- 假時鐘：所有手機和假伺服器共用；計時器照時間先後一個一個跑 ---------- */
function Sched(t0) {
  const S = { now: t0, T: new Map(), seq: 0, errors: [] };
  S.add = (fn, ms, every, owner) => { const id = ++S.seq; S.T.set(id, { id, at: S.now + Math.max(0, +ms || 0), seq: id, fn, every, owner }); return id };
  S.clear = id => { S.T.delete(id) };
  S.kill = owner => { for (const [id, t] of S.T) if (t.owner === owner) S.T.delete(id) };
  const first = end => { let b = null; for (const t of S.T.values()) if (t.at <= end && (!b || t.at < b.at || (t.at === b.at && t.seq < b.seq))) b = t; return b };
  const fire = t => {
    S.now = Math.max(S.now, t.at);
    if (t.every) { t.at = S.now + t.every; t.seq = ++S.seq } else S.T.delete(t.id);
    try { t.fn() } catch (e) { S.errors.push(String(e && e.stack || e)) }
  };
  /* 每跑一個計時器就等非同步工作做完（假時間停在那一刻） */
  S.run = async ms => { const end = S.now + ms; await settle(); for (let t; (t = first(end));) { fire(t); await settle() } S.now = end };
  /* 一個計時器一個計時器跑，pred 成立就停在那一刻（回 true）；max 毫秒內沒成立回 false */
  S.until = async (pred, max) => { const end = S.now + max; await settle(); if (pred()) return true; for (let t; (t = first(end));) { fire(t); await settle(); if (pred()) return true } S.now = end; return false };
  return S;
}

/* ---------- 假 MQTT 伺服器（MQTT 3.1.1、只用 QoS 0，跟 net.js 用到的一樣多） ---------- */
const vlen = n => { const a = []; do { let d = n % 128; n = Math.floor(n / 128); if (n > 0) d |= 128; a.push(d) } while (n > 0); return a };
const mstr = s => { const b = te.encode(s); return [b.length >> 8, b.length & 255, ...b] };
const pkt = (h, body) => new Uint8Array([h, ...vlen(body.length), ...body]);
function match(f, t) { const F = f.split("/"), T = t.split("/"); for (let i = 0; i < F.length; i++) { if (F[i] === "#") return true; if (i >= T.length) return false; if (F[i] !== "+" && F[i] !== T[i]) return false } return F.length === T.length }
/* 固定種子的亂數（mulberry32）：混沌網路、手機裡的 Math.random 都用它，同一個種子每次跑出一模一樣的結果（可重現） */
function seeded(seed) { let a = (seed >>> 0) || 1; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function Broker(S) {
  const B = { up: true, lat: 20, conns: new Set(), retained: new Map(), log: [], attempts: [], flapMs: 0, n: 0 };
  /* 混沌網路（tools/test-net-chaos.js）：B.setChaos({drop, dup, reorder, jitter, seed}) 之後，雙向的 PUBLISH 封包（連線、訂閱、心跳這些控制封包不動）
       drop＝掉包機率（模擬 QoS 0 在伺服器端被丟掉）、dup＝重複送一次的機率、reorder＝不排隊、可能比前面的先到的機率、jitter＝每則多加 0～jitter 毫秒的隨機延遲。
     B.setChaos(null) 關掉。B.chaosN 記實際丟了、重複了、插隊了幾則 */
  B.chaos = null; B.chaosN = { drop: 0, dup: 0, reorder: 0, pubs: 0 };
  B.setChaos = o => { B.chaos = o ? { drop: 0, dup: 0, reorder: 0, jitter: 0, ...o, rnd: seeded(o.seed || 1) } : null };
  const isPub = u => (u[0] >> 4) === 3;
  B.connsOf = P => [...B.conns].filter(c => c.P === P);
  B.attempt = ws => {
    B.attempts.push({ at: S.now, P: ws.P.tag });
    S.add(() => {
      if (!B.up || !ws.P.netOk) { ws.readyState = 3; ws.onerror && ws.onerror({}); ws.onclose && ws.onclose({}); return }
      const c = { id: ++B.n, ws, P: ws.P, subs: new Set(), alive: true, lastRx: S.now, keepalive: 30, nextAt: 0 };
      ws.conn = c; B.conns.add(c); ws.readyState = 1; ws.onopen && ws.onopen({});
    }, B.lat, 0, "broker");
  };
  /* 伺服器送給手機：同一條連線照順序到（FIFO），P.lag 可以加大這支手機的收訊延遲 */
  B.deliver = (c, bytes) => {
    if (!c.alive || c.broken || !c.P.netOk) return;
    const put = at => S.add(() => { if (c.alive && !c.broken && c.P.netOk && c.ws.readyState === 1 && c.ws.onmessage) c.ws.onmessage({ data: bytes.buffer }) }, at - S.now, 0, "broker");
    const X = B.chaos;
    if (X && isPub(bytes)) {
      B.chaosN.pubs++;
      if (X.rnd() < X.drop) { B.chaosN.drop++; return }
      const base = S.now + B.lat + (c.P.lag || 0) + Math.round(X.rnd() * X.jitter);
      if (X.rnd() < X.reorder) { B.chaosN.reorder++; put(base) } else { const at = Math.max(base, c.nextAt); c.nextAt = at; put(at) }
      if (X.rnd() < X.dup) { B.chaosN.dup++; put(base + 50 + Math.round(X.rnd() * 2 * X.jitter)) }
      return;
    }
    const at = Math.max(S.now + B.lat + (c.P.lag || 0), c.nextAt); c.nextAt = at; put(at);
  };
  B.route = (topic, payload, from) => { for (const c of B.conns) for (const f of c.subs) if (match(f, topic)) { B.deliver(c, pkt(0x30, [...mstr(topic), ...te.encode(payload)])); break } };
  B.publish = (topic, payload, retain, from) => {
    B.log.push({ at: S.now, topic, payload, retain: !!retain, from: from ? from.P.tag : "broker" });
    if (retain) { if (payload === "") B.retained.delete(topic); else B.retained.set(topic, payload) }
    B.route(topic, payload, from);
  };
  /* 連線斷了：不是正常 DISCONNECT 就發遺囑；notify＝讓手機那頭知道（TCP 斷開）。手機網路不通時它收不到 */
  B.drop = (c, notify) => {
    if (!c.alive) return; c.alive = false; B.conns.delete(c);
    if (!c.graceful && c.will) B.publish(c.will.topic, c.will.payload, c.will.retain, c);
    if (notify && !c.broken && c.P.netOk) S.add(() => { if (c.ws.readyState !== 3) { c.ws.readyState = 3; c.ws.onclose && c.ws.onclose({}) } }, B.lat, 0, "broker");
  };
  B.handle = (c, u) => {
    c.lastRx = S.now;
    for (let off = 0; off < u.length;) {
      const t = u[off]; let i = off + 1, mul = 1, n = 0, d; do { d = u[i++]; n += (d & 127) * mul; mul *= 128 } while (d & 128);
      const b = u.subarray(i, i + n); off = i + n; let p = 0;
      const rs = () => { const L = (b[p] << 8) | b[p + 1]; const s = td.decode(b.subarray(p + 2, p + 2 + L)); p += 2 + L; return s };
      const type = t >> 4;
      if (type === 1) {
        rs(); p += 1; const fl = b[p++]; c.keepalive = (b[p] << 8) | b[p + 1]; p += 2; c.clientId = rs();
        if (fl & 4) { const topic = rs(), L = (b[p] << 8) | b[p + 1], payload = td.decode(b.subarray(p + 2, p + 2 + L)); p += 2 + L; c.will = { topic, payload, retain: !!(fl & 0x20) } }
        if (fl & 0x80) { c.user = rs(); c.hasPass = !!(fl & 0x40) }
        B.deliver(c, new Uint8Array([0x20, 2, 0, 0]));
        if (B.flapMs) S.add(() => B.drop(c, true), B.flapMs, 0, "broker");
      } else if (type === 3) { const topic = rs(); B.publish(topic, td.decode(b.subarray(p)), !!(t & 1), c) }
      else if (type === 8) {
        const pid = [b[0], b[1]]; p = 2; const fs2 = []; while (p < b.length) { fs2.push(rs()); p++ }
        fs2.forEach(f => c.subs.add(f)); B.deliver(c, pkt(0x90, [...pid, ...fs2.map(() => 0)]));
        for (const f of fs2) for (const [topic, payload] of B.retained) if (match(f, topic)) B.deliver(c, pkt(0x31, [...mstr(topic), ...te.encode(payload)]));
      } else if (type === 10) { p = 2; while (p < b.length) c.subs.delete(rs()) }
      else if (type === 12) B.deliver(c, new Uint8Array([0xD0, 0]));
      else if (type === 14) { c.graceful = true; B.drop(c, false) }
    }
  };
  B.fromClient = (ws, data) => {
    const c = ws.conn; if (!c || !c.alive || c.broken || !ws.P.netOk) return; const u = new Uint8Array(data);
    const put = ms => S.add(() => { if (c.alive && !c.broken) B.handle(c, u) }, ms, 0, "broker");
    const X = B.chaos;
    if (X && isPub(u)) {
      B.chaosN.pubs++;
      if (X.rnd() < X.drop) { B.chaosN.drop++; return }
      let d = B.lat + Math.round(X.rnd() * X.jitter); if (X.rnd() < X.reorder) { B.chaosN.reorder++; d += Math.round(X.rnd() * X.jitter) } put(d);   /* 上行本來就不排隊：各自的延遲不同就可能插隊 */
      if (X.rnd() < X.dup) { B.chaosN.dup++; put(d + 50 + Math.round(X.rnd() * 2 * X.jitter)) }
      return;
    }
    put(B.lat);
  };
  B.clientClosed = ws => { const c = ws.conn; if (!c || c.broken || !ws.P.netOk) return; S.add(() => B.drop(c, false), B.lat, 0, "broker") };
  /* 伺服器的心跳檢查：1.5 倍 keepalive 沒收到東西就當斷線（發遺囑） */
  S.add(() => { for (const c of [...B.conns]) if (S.now - c.lastRx > c.keepalive * 1500) B.drop(c, true) }, 1000, 1000, "broker");
  B.down = () => { B.up = false; for (const c of [...B.conns]) B.drop(c, true) };
  B.kick = P => B.connsOf(P).forEach(c => B.drop(c, true));
  B.subsOf = P => { const c = B.connsOf(P); return c.length ? [...c[c.length - 1].subs] : [] };
  B.game = gid => { const s = B.retained.get(`${ROOT}/g/${gid}/s`); return s ? JSON.parse(s) : null };
  return B;
}

/* ---------- 一支手機＝一個 vm 環境：自己的 window、localStorage；WebSocket 接假伺服器 ---------- */
function memStorage(init) { const m = new Map(init || []); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)) }, removeItem: k => { m.delete(k) }, map: m } }
let tagN = 0;
function phone(S, B, o) {
  const P = { tag: "p" + (++tagN) + ":" + o.id, netOk: true, lag: 0, sockets: [], win: {}, doc: {}, events: [] };
  class FakeWS {
    constructor(url, prot) { this.url = url; this.prot = prot; this.readyState = 0; this.P = P; P.sockets.push(this); B.attempt(this) }
    send(d) { if (this.readyState !== 1) return; B.fromClient(this, d) }
    close() { if (this.readyState >= 2) return; this.readyState = 2; B.clientClosed(this); S.add(() => { if (this.readyState !== 3) { this.readyState = 3; this.onclose && this.onclose({}) } }, 5, 0, P.tag) }
  }
  const ctx = {
    console: { log() { }, info() { }, warn() { }, error: (...a) => S.errors.push(P.tag + " " + a.map(String).join(" ")) },
    TextEncoder, TextDecoder, URL, crypto: o.noCrypto ? undefined : cryptoT, indexedDB: o.noCrypto ? undefined : (o.idb || fakeIDB()), btoa: s => Buffer.from(s, "binary").toString("base64"), atob: s => Buffer.from(s, "base64").toString("binary"), __S: S,
    setTimeout: (fn, ms) => S.add(fn, ms, 0, P.tag), clearTimeout: id => S.clear(id), setInterval: (fn, ms) => S.add(fn, ms, ms, P.tag), clearInterval: id => S.clear(id),
    localStorage: o.storage || memStorage(), location: { hash: o.hash || "#/lobby", href: "http://localhost/", pathname: "/", search: "" }, navigator: { onLine: true },
    document: { hidden: false, addEventListener: (t, f) => (P.doc[t] = P.doc[t] || []).push(f) },
    addEventListener: (t, f) => (P.win[t] = P.win[t] || []).push(f), removeEventListener() { }, dispatchEvent: e => { P.events.push(e.type); return true },
    CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d && d.detail } }, Event: class { constructor(t) { this.type = t } },
    meInfo: () => ({ id: o.id, name: o.name }), WebSocket: FakeWS, ...(o.ctx || {})   /* o.ctx：額外的全域（例如 XQ_rulePref 選棋規） */
  };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext("Date.now=()=>__S.now;", ctx);
  if (o.seed) { ctx.__rnd = seeded(o.seed); vm.runInContext("Math.random=__rnd;", ctx) }   /* o.seed：這支手機的 Math.random 用固定種子（紅黑、gid、重連亂數都可重現） */
  vm.runInContext(CORE_SRC, ctx, { filename: "core.js" });
  vm.runInContext("(function(){const{legal,stateRebuild,stateApply,judgeState}=XQCore;" + CHECK_LINE + "})();", ctx, { filename: "local.js(XQ_netCheck)" });
  vm.runInContext(o.src || NET_SRC, ctx, { filename: o.src ? "net-legacy.js" : "net.js" });
  P.ctx = ctx; P.net = ctx.XQNet; P.storage = ctx.localStorage; P.id = o.id; P.idb = ctx.indexedDB;
  P.fire = t => (P.win[t] || []).forEach(f => f({}));
  /* 網路斷掉（進隧道、換基地台）：當下的 TCP 連線就算壞了，網路回來也不會復活（兩頭都不知道，要靠手機的看門狗、伺服器的心跳逾時發現） */
  P.offline = () => { P.netOk = false; B.connsOf(P).forEach(c => { c.broken = true }) };
  P.online = () => { P.netOk = true };
  /* 切到背景／切回前景（document.hidden＋visibilitychange） */
  P.hide = () => { ctx.document.hidden = true; (P.doc.visibilitychange || []).forEach(f => f({})) };
  P.show = () => { ctx.document.hidden = false; (P.doc.visibilitychange || []).forEach(f => f({})) };
  /* App 被滑掉：計時器全停、連線斷掉（伺服器看到斷線，發遺囑） */
  P.close = () => { S.kill(P.tag); for (const ws of P.sockets) if (ws.readyState < 2) { B.clientClosed(ws); ws.readyState = 3; ws.onmessage = ws.onclose = null } };
  P.irtQ = () => JSON.parse(P.storage.getItem("xq_irtQ") || "[]");
  P.hist = () => (JSON.parse(P.storage.getItem("xq_rate") || "null") || { hist: [] }).hist;
  return P;
}
const J = x => JSON.parse(JSON.stringify(x));
const sq = C.parseSq, MV = u => [sq(u.slice(0, 2)), sq(u.slice(2, 4))];
/* 照 local.js netPvp 的走法：先 tickMove（扣時、記 lft），再把這步推進棋譜 */
function move(P, u) { const sd = P.net.side(); assert.ok(sd, P.tag + " 不是對局的一方"); P.net.update(n => { if (P.net.tickMove(n, sd) === false) return; n.moves.push(MV(u)); n.draw = null }) }
const core = g => g && J({ moves: g.moves, result: g.result, draw: g.draw || null });
const T0 = Date.UTC(2026, 10, 11, 2, 0, 0);
function world() { tagN = 0; const S = Sched(T0), B = Broker(S); return { S, B } }
function noErrors(S) { assert.deepEqual(S.errors, [], "計時器、訊息處理不應該丟錯") }
/* 兩支手機上線、甲邀請乙、乙接受，開一盤（紅黑隨機），回傳紅方、黑方 */
/* o.tc＝雙方時制；o.A、o.K＝給甲、乙的手機額外設定（例如 src：用舊版 net.js） */
async function startGame(S, B, o) {
  const st = () => o && o.tc ? memStorage([["xq_tc", String(o.tc)], ["xq_tcV", "2"]]) : undefined;
  const A = phone(S, B, { id: "aaaa1111", name: "甲", storage: st(), ...(o && o.A || {}) }), K = phone(S, B, { id: "bbbb2222", name: "乙", storage: st(), ...(o && o.K || {}) });
  A.net.start(); K.net.start(); await S.run(2000);
  let inv = null; K.net.on("invite", x => { inv = x });
  A.net.invite({ id: K.id, name: "乙" }); await S.run(500); assert.ok(inv, "乙要收到邀請");
  K.net.respond(inv, true); await S.run(1500);
  const g = A.net.game(); assert.ok(g && K.net.game(), "雙方都要拿到對局");
  const red = g.red.id === A.id ? A : K, black = red === A ? K : A;
  assert.equal(red.net.side(), "r"); assert.equal(black.net.side(), "b");
  return { A, K, red, black, gid: g.gid };
}

module.exports = { assert, test, fs, path, vm, LAB, NET_SRC, C, ROOT, Sched, Broker, phone, seeded, memStorage, fakeIDB, settle, PEND, J, MV, move, core, T0, world, noErrors, startGame };
