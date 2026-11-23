// W72 遠端開關（開發者 11/23 選單「先做遠端開關，分版先盤點」）：m/00f-flags.js
//   vm 跑真的 00f：假 fetch、假 localStorage、假計時器。檢查：
//   沒列＝開著；設定檔到了就關；抓不到用上一次成功的；從來沒抓到就全開；格式不對不採用；請求不帶玩家資料、不走快取；倉庫根目錄 data/flags.json 合法而且預設全開。
// 用法：node --test xiangqi-lab/tools/test-flags-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-db/m/00f-flags.js"), "utf8");
const tick = () => new Promise((r) => setImmediate(r));

function load({ store = {}, reply, throws = false } = {}) {
  const calls = [], events = [], timers = [];
  const c = {
    localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v) } },
    setTimeout: (f, ms) => { timers.push({ f, ms }); return timers.length },
    AbortController: class { constructor() { this.signal = { aborted: false } } abort() { this.signal.aborted = true } },
    CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail } },
    fetch: (u, o) => { calls.push({ u, o }); if (throws) return Promise.reject(new Error("離線")); return Promise.resolve(reply) },
    Date, JSON, Object, String, Array, Promise,
  };
  c.window = { dispatchEvent: (e) => events.push(e) };
  vm.createContext(c);
  vm.runInContext(SRC + "\n;this.xqFlag=xqFlag;", c);
  return { c, calls, events, timers, store };
}
const ok = (j) => ({ ok: true, json: () => Promise.resolve(j) });

test("沒有設定檔（main 還沒有 flags.json，回 404）：全部開著、也不寫進手機", async () => {
  const L = load({ reply: { ok: false, json: () => Promise.reject(new Error("不該讀")) } });
  await tick(); await tick();
  assert.equal(L.c.xqFlag("halls8"), true); assert.equal(L.c.xqFlag("anything"), true);
  assert.equal(L.store.xqFlags, undefined);
});

test("設定檔列了 halls8：xqFlag 變關、發 xqflags 事件、存進手機；沒列的照樣開著", async () => {
  const L = load({ reply: ok({ v: 1, off: { halls8: "列炮門破圖，先關" } }) });
  assert.equal(L.c.xqFlag("halls8"), true, "設定檔還沒回來前照舊開著");
  await tick(); await tick();
  assert.equal(L.c.xqFlag("halls8"), false); assert.equal(L.c.xqFlag("maze"), true);
  assert.deepEqual(L.events.at(-1).detail.off, ["halls8"]); assert.equal(L.events.at(-1).type, "xqflags");
  assert.deepEqual(JSON.parse(L.store.xqFlags).off, { halls8: "列炮門破圖，先關" });
});

test("抓不到（離線）：用這支手機上一次成功抓到的那份；從來沒抓到過就全開", async () => {
  const A = load({ store: { xqFlags: JSON.stringify({ v: 1, off: { halls8: "x" } }) }, throws: true });
  await tick(); await tick();
  assert.equal(A.c.xqFlag("halls8"), false, "上一次說關，離線時照樣關");
  const B = load({ throws: true }); await tick(); await tick();
  assert.equal(B.c.xqFlag("halls8"), true, "沒抓到過＝全開，不會因為離線就把功能關掉");
});

test("後來重新打開：設定檔把 halls8 拿掉＝重新開啟，手機裡的舊紀錄也更新", async () => {
  const L = load({ store: { xqFlags: JSON.stringify({ v: 1, off: { halls8: "x" } }) }, reply: ok({ v: 1, off: {} }) });
  assert.equal(L.c.xqFlag("halls8"), false);
  await tick(); await tick();
  assert.equal(L.c.xqFlag("halls8"), true); assert.deepEqual(JSON.parse(L.store.xqFlags).off, {});
});

test("格式不對（off 不是物件、整份不是 JSON 物件、手機裡存壞的）：不採用，維持原狀，不當掉", async () => {
  for (const bad of [{ v: 1, off: ["halls8"] }, { v: 1 }, null, "halls8", { off: null }]) {
    const L = load({ reply: ok(bad) }); await tick(); await tick();
    assert.equal(L.c.xqFlag("halls8"), true, JSON.stringify(bad));
  }
  const S = load({ store: { xqFlags: "{壞掉" }, throws: true }); await tick(); await tick();
  assert.equal(S.c.xqFlag("halls8"), true);
  const K = load({ reply: ok({ off: { "../壞": "x", ok_1: "y" } }) }); await tick(); await tick();
  assert.equal(K.c.xqFlag("ok_1"), false); assert.equal(K.c.xqFlag("../壞"), true, "代號只收英數、底線、減號");
});

test("請求：只向 raw.githubusercontent.com 的 main 版抓、網址只帶時間、不走快取、不帶身分；5 秒逾時", async () => {
  const L = load({ reply: ok({ off: {} }) }); await tick();
  assert.equal(L.calls.length, 1);
  const { u, o } = L.calls[0];
  assert.match(u, /^https:\/\/raw\.githubusercontent\.com\/raysonchen2023-cloud\/xiangqi-lab\/main\/data\/flags\.json\?t=\d+$/);
  assert.equal(o.cache, "no-store"); assert.equal(o.credentials, "omit"); assert.equal(o.mode, "cors"); assert.equal(o.method, undefined);
  assert.ok(L.timers.some((t) => t.ms === 5000), "5 秒逾時");
});

test("〔原始碼〕倉庫根目錄 data/flags.json：合法 JSON、預設全開；m.html 在 00-util 後面、01-board 前面載入 00f；沒有行內 // 註解、LF", () => {
  const j = JSON.parse(fs.readFileSync(path.join(ROOT, "../data/flags.json"), "utf8"));
  assert.equal(typeof j.off, "object"); assert.deepEqual(j.off, {}, "這版預設全部開著");
  const mh = fs.readFileSync(path.join(ROOT, "xiangqi-db/m.html"), "utf8"), at = (f) => mh.indexOf(`//#include m/${f}.js`);
  assert.ok(at("00-util") > 0 && at("00-util") < at("00f-flags") && at("00f-flags") < at("01-board"));
  assert.ok(!SRC.includes("\r") && !/[^:]\/\/ /.test(SRC.replace(/https?:\/\//g, "")));
});
