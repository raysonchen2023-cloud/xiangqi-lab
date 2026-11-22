#!/usr/bin/env node
/* wir.js：透過 iOS 模擬器的 Web Inspector（webinspectord_sim.socket）在 App 的 WKWebView 執行 JS，取回結果。
   用途：P0-3D 自動腳本「進場、讀狀態、算落點座標」。點擊不走這裡（走 XCUITest 真實觸控）。
   不改 App、不需要 XQTMP 鉤子；App 的 WebView 要是可檢查的（Capacitor Debug 版預設可以）。
   用法：node wir.js [--bundle com.raysonchen.xiangqiqianqiu.dev] '<JS 運算式>'   → 印 JSON 結果（Promise 會等）
   當模組：const {evaluate}=require('./wir.js'); await evaluate(expr,{bundle}) */
"use strict";
const net = require("net"), fs = require("fs"), crypto = require("crypto"), cp = require("child_process");

/* ---------- binary plist（只做這個協定用得到的型別） ---------- */
function bplistEncode(root) {
  const objs = [], refs = new Map();
  const add = (v) => {
    const key = typeof v === "object" && v !== null && !Buffer.isBuffer(v) ? null : (Buffer.isBuffer(v) ? null : typeof v + ":" + String(v));
    if (key && refs.has(key)) return refs.get(key);
    const idx = objs.length; objs.push(null); if (key) refs.set(key, idx);
    if (v !== null && typeof v === "object" && !Buffer.isBuffer(v)) {
      const ks = Object.keys(v); objs[idx] = { t: "dict", k: ks.map(add), v: ks.map((k) => add(v[k])) };
    } else objs[idx] = { t: "val", v };
    return idx;
  };
  add(root);
  const n = objs.length, refSize = n < 256 ? 1 : 2;
  const intBytes = (x, sz) => { const b = Buffer.alloc(sz); if (sz === 1) b.writeUInt8(x); else if (sz === 2) b.writeUInt16BE(x); else if (sz === 4) b.writeUInt32BE(x); else b.writeBigUInt64BE(BigInt(x)); return b; };
  const lenMarker = (type, len) => len < 15 ? Buffer.from([type | len]) : Buffer.concat([Buffer.from([type | 15]), encInt(len)]);
  const encInt = (x) => x < 256 ? Buffer.concat([Buffer.from([0x10]), intBytes(x, 1)]) : x < 65536 ? Buffer.concat([Buffer.from([0x11]), intBytes(x, 2)]) : x < 2 ** 32 ? Buffer.concat([Buffer.from([0x12]), intBytes(x, 4)]) : Buffer.concat([Buffer.from([0x13]), intBytes(x, 8)]);
  const parts = [], offsets = []; let off = 8;
  for (const o of objs) {
    let b;
    if (o.t === "dict") {
      b = Buffer.concat([lenMarker(0xd0, o.k.length), ...o.k.map((r) => intBytes(r, refSize)), ...o.v.map((r) => intBytes(r, refSize))]);
    } else {
      const v = o.v;
      if (v === true) b = Buffer.from([0x09]); else if (v === false) b = Buffer.from([0x08]);
      else if (typeof v === "number") b = encInt(v);
      else if (Buffer.isBuffer(v)) b = Buffer.concat([lenMarker(0x40, v.length), v]);
      else { const s = String(v); if (/^[\x00-\x7f]*$/.test(s)) b = Buffer.concat([lenMarker(0x50, s.length), Buffer.from(s, "ascii")]); else { const u = Buffer.from(s, "utf16le").swap16(); b = Buffer.concat([lenMarker(0x60, s.length), u]); } }
    }
    offsets.push(off); parts.push(b); off += b.length;
  }
  const offSize = off < 256 ? 1 : off < 65536 ? 2 : 4;
  const table = Buffer.concat(offsets.map((o) => intBytes(o, offSize)));
  const trailer = Buffer.alloc(32); trailer.writeUInt8(offSize, 6); trailer.writeUInt8(refSize, 7);
  trailer.writeBigUInt64BE(BigInt(n), 8); trailer.writeBigUInt64BE(0n, 16); trailer.writeBigUInt64BE(BigInt(off), 24);
  return Buffer.concat([Buffer.from("bplist00"), ...parts, table, trailer]);
}
function bplistDecode(buf) {
  const t = buf.subarray(buf.length - 32), offSize = t[6], refSize = t[7];
  const num = Number(t.readBigUInt64BE(8)), top = Number(t.readBigUInt64BE(16)), tbl = Number(t.readBigUInt64BE(24));
  const rd = (p, sz) => { let x = 0; for (let i = 0; i < sz; i++) x = x * 256 + buf[p + i]; return x; };
  const offs = []; for (let i = 0; i < num; i++) offs.push(rd(tbl + i * offSize, offSize));
  const parse = (i) => {
    let p = offs[i]; const m = buf[p], hi = m >> 4, lo = m & 15;
    const len = () => { if (lo !== 15) { p += 1; return lo; } const im = buf[p + 1], sz = 1 << (im & 15); const v = rd(p + 2, sz); p += 2 + sz; return v; };
    switch (hi) {
      case 0: return lo === 9 ? true : lo === 8 ? false : null;
      case 1: { const sz = 1 << lo; return rd(p + 1, sz); }
      case 2: { const sz = 1 << lo; return sz === 8 ? buf.readDoubleBE(p + 1) : buf.readFloatBE(p + 1); }
      case 3: return buf.readDoubleBE(p + 1);
      case 4: { const l = len(); return buf.subarray(p, p + l); }
      case 5: { const l = len(); return buf.toString("ascii", p, p + l); }
      case 6: { const l = len(); return Buffer.from(buf.subarray(p, p + l * 2)).swap16().toString("utf16le"); }
      case 8: { return rd(p + 1, lo + 1); }
      case 10: { const l = len(); const a = []; for (let k = 0; k < l; k++) a.push(parse(rd(p + k * refSize, refSize))); return a; }
      case 13: { const l = len(); const o = {}; for (let k = 0; k < l; k++) o[parse(rd(p + k * refSize, refSize))] = parse(rd(p + (l + k) * refSize, refSize)); return o; }
      default: return undefined;
    }
  };
  return parse(top);
}

/* ---------- socket ---------- */
function findSocket() {
  if (process.env.WIR_SOCKET) return process.env.WIR_SOCKET;
  const out = cp.execSync("lsof -U 2>/dev/null | grep webinspectord_sim.socket | head -1 || true").toString();
  const m = out.match(/(\/\S*webinspectord_sim\.socket)/);
  if (!m) throw new Error("找不到 webinspectord_sim.socket（模擬器開機了嗎？）");
  return m[1];
}

class WIR {
  constructor() { this.buf = Buffer.alloc(0); this.waiters = []; this.conn = crypto.randomUUID().toUpperCase(); this.sender = crypto.randomUUID().toUpperCase(); this.apps = {}; this.listing = {}; this.msgs = []; }
  open() {
    return new Promise((res, rej) => {
      this.s = net.createConnection(findSocket(), () => res()); this.s.on("error", rej);
      this.s.on("data", (d) => { this.buf = Buffer.concat([this.buf, d]); this.pump(); });
    });
  }
  pump() {
    while (this.buf.length >= 4) {
      const l = this.buf.readUInt32BE(0); if (this.buf.length < 4 + l) break;
      const msg = bplistDecode(this.buf.subarray(4, 4 + l)); this.buf = this.buf.subarray(4 + l); this.onMsg(msg);
    }
  }
  onMsg(m) {
    const sel = m.__selector, a = m.__argument || {};
    if (sel === "_rpc_reportConnectedApplicationList:") Object.assign(this.apps, a.WIRApplicationDictionaryKey || {});
    if (sel === "_rpc_applicationConnected:") this.apps[a.WIRApplicationIdentifierKey] = a;
    if (sel === "_rpc_applicationSentListing:") this.listing[a.WIRApplicationIdentifierKey] = a.WIRListingKey || {};
    if (sel === "_rpc_applicationSentData:") { try { this.msgs.push(JSON.parse(Buffer.from(a.WIRMessageDataKey).toString("utf8"))); } catch (e) {} }
    this.waiters = this.waiters.filter((w) => !w());
  }
  until(fn, ms, what) {
    return new Promise((res, rej) => {
      const t = setTimeout(() => rej(new Error("逾時：" + what)), ms);
      const w = () => { const v = fn(); if (v) { clearTimeout(t); res(v); return true; } return false; };
      if (!w()) this.waiters.push(w);
    });
  }
  send(sel, arg) { const b = bplistEncode({ __selector: sel, __argument: Object.assign({ WIRConnectionIdentifierKey: this.conn }, arg) }); const h = Buffer.alloc(4); h.writeUInt32BE(b.length); this.s.write(Buffer.concat([h, b])); }
  close() { try { this.s.end(); this.s.destroy(); } catch (e) {} }
}

let seq = 1, SESSION = null;
/* 連一次、整個流程共用（webinspectord 對同一 App 連續開新連線時，偶爾不回 App 清單） */
async function connect(bundle, timeout) {
  const w = new WIR(); await w.open();
  try {
    let appId = null;
    for (let k = 0; k < 3 && !appId; k++) {
      w.send("_rpc_reportIdentifier:", {});
      appId = await w.until(() => Object.keys(w.apps).find((k) => w.apps[k].WIRApplicationBundleIdentifierKey === bundle), 4000, "app").catch(() => null);
    }
    if (!appId) throw new Error("找不到 App（" + bundle + "）；App 開著嗎？WebView 可檢查嗎？");
    w.send("_rpc_forwardGetListing:", { WIRApplicationIdentifierKey: appId });
    const page = await w.until(() => { const L = w.listing[appId]; if (!L) return null; const ks = Object.keys(L); const k = ks.find((k) => /127\.0\.0\.1|localhost|capacitor/.test(L[k].WIRURLKey || "")) || ks[0]; return k ? L[k] : null; }, 8000, "App 沒有可檢查的頁面");
    const pageId = page.WIRPageIdentifierKey;
    w.send("_rpc_forwardSocketSetup:", { WIRApplicationIdentifierKey: appId, WIRPageIdentifierKey: pageId, WIRSenderKey: w.sender, WIRAutomaticallyPause: false });
    const rawSend = (obj) => w.send("_rpc_forwardSocketData:", { WIRApplicationIdentifierKey: appId, WIRPageIdentifierKey: pageId, WIRSenderKey: w.sender, WIRSocketDataKey: Buffer.from(JSON.stringify(obj), "utf8") });
    /* 新版 WebKit 走 Target 網域：先等 Target.targetCreated 拿到 targetId；舊版直接送 */
    let target = null;
    try { const tc = await w.until(() => w.msgs.find((m) => m.method === "Target.targetCreated"), 2500, "target"); target = tc.params.targetInfo.targetId; } catch (e) {}
    const call = async (method, params, to) => {
      const id = seq++, inner = { id, method, params };
      if (target) rawSend({ id: 900000 + id, method: "Target.sendMessageToTarget", params: { targetId: target, message: JSON.stringify(inner) } });
      else rawSend(inner);
      const resp = await w.until(() => {
        for (const m of w.msgs) {
          if (m.id === id) return m;
          if (m.method === "Target.dispatchMessageFromTarget") { try { const x = JSON.parse(m.params.message); if (x.id === id) return x; } catch (e) {} }
        }
        return null;
      }, to || timeout, "JS 執行沒回應（" + method + "）");
      w.msgs = w.msgs.filter((m) => m.method !== "Target.dispatchMessageFromTarget" || !/"id":/.test(m.params.message || ""));
      if (resp.error) throw new Error("Inspector 錯誤：" + JSON.stringify(resp.error));
      return resp.result || {};
    };
    return { call, close: () => w.close(), dead: () => w.s.destroyed };
  } catch (e) { w.close(); throw e; }
}
async function evaluate(expr, opt = {}) {
  const bundle = opt.bundle || process.env.P03D_BUNDLE || "com.raysonchen.xiangqiqianqiu.dev", timeout = opt.timeout || 30000;
  for (let attempt = 0; ; attempt++) {
    try {
      if (!SESSION || SESSION.dead()) SESSION = await connect(bundle, timeout);
      const call = (m, p) => SESSION.call(m, p, timeout);
      /* WebKit 的 Runtime.evaluate 不等 Promise：先不取值拿到物件 id，是 Promise 就再呼叫 Runtime.awaitPromise；
         其他物件用 callFunctionOn 取值（避免同一段 JS 執行兩次） */
      let r = await call("Runtime.evaluate", { expression: expr, returnByValue: false });
      const o = r.result || {};
      if (!r.wasThrown && o.type === "object" && o.objectId) {
        if (o.className === "Promise") r = await call("Runtime.awaitPromise", { promiseObjectId: o.objectId, returnByValue: true });
        else r = await call("Runtime.callFunctionOn", { objectId: o.objectId, functionDeclaration: "function(){return this}", returnByValue: true });
      }
      if (r.wasThrown || (r.result && r.result.subtype === "error")) { const e = new Error("JS 例外：" + (r.result && (r.result.description || r.result.value))); e.js = true; throw e; }
      return r.result ? r.result.value : undefined;
    } catch (e) {
      if (e.js || attempt >= 2) throw e;
      try { SESSION && SESSION.close(); } catch (x) {} SESSION = null;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}
function closeAll() { try { SESSION && SESSION.close(); } catch (e) {} SESSION = null; }
module.exports = { evaluate, closeAll, bplistEncode, bplistDecode };

if (require.main === module) {
  const a = process.argv.slice(2); let bundle;
  if (a[0] === "--bundle") { bundle = a[1]; a.splice(0, 2); }
  evaluate(a.join(" "), { bundle }).then((v) => { console.log(JSON.stringify(v)); closeAll(); process.exit(0); }, (e) => { console.error("✘ " + e.message); process.exit(1); });
}
