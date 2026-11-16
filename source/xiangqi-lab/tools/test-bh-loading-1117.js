// 11/17 iPhone 模擬器測試第 4 項：按「⚡ 接受急襲」（星槎偏航）後整頁米白色約 8 秒，沒有任何載入提示，之後才出現「黑洞・星樞棋局」。
//   修法（07bh-blackhole.js）：偏航直接開局（bhStart → 07sg2 sg2Drift → 07bhg gsvStart → jStart）前先蓋載入畫面 #bhLd
//   （樣式照 09b 走進新頁的等待畫面：米色底、墨點暈開、「正在進入星渦…」），對局頁的棋盤出來（3D 星盤建好，或這盤用平面棋盤）才淡掉；
//   跳出新的視窗、換到別頁、25 秒到了也收；gsvStart 被鎖擋下（沒寫新的 bhRet＝沒開局）馬上收。
// 不開瀏覽器：bhLdDone 純判斷直接測；bhStart 連同 bhLd 切出來，用假的 document、時鐘跑整段。用法：node --test xiangqi-lab/tools/test-bh-loading-1117.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const BH = rd("xiangqi-db/m/07bh-blackhole.js");
const a = BH.indexOf("const BH_LD_MAX="), b = BH.indexOf("function bhStart("), c = BH.indexOf("const bhIs=");
assert.ok(a > 0 && b > a && c > b, "07bh 找得到 bhLd 那段和 bhStart");
const SRC = BH.slice(a, c);

/* 假 DOM：只做這段用到的 */
function kit(W) {
  let now = 0; const Q = [], reg = new Set(), log = { select: 0, drift: 0, toast: [] };
  const el = tag => { const cls = new Set(); const e = { tag, id: "", style: {}, attrs: {}, onclick: null, _in: false,
    classList: { add: x => cls.add(x), remove: x => cls.delete(x), contains: x => cls.has(x) }, setAttribute(k, v) { this.attrs[k] = v }, set innerHTML(h) { this._h = h }, get innerHTML() { return this._h || "" },
    get isConnected() { return this._in }, remove() { this._in = false; reg.delete(this) } }; return e };
  const add = e => { e._in = true; reg.add(e) };
  const document = { body: { append: add }, head: { append: add }, createElement: el,
    getElementById: id => { if (id === "bbox") return W.board && W.board(now) ? {} : null; for (const e of reg) if (e.id === id) return e; return null },
    querySelector: s => s === "#bbox .park3d" ? (W.p3d && W.p3d(now) ? {} : null) : null,
    querySelectorAll: s => s === ".modal" ? (W.modals ? W.modals(now) : []) : [] };
  const location = { get hash() { return W.hash(now) } };
  const st = {}; const store = { get: (k, d) => k in st ? st[k] : d, set: (k, v) => { st[k] = v } };
  const env = { document, location, store, Date: { now: () => now }, setTimeout: (f, ms) => Q.push({ at: now + ms, f }),
    parkOn: () => W.park !== false, SG2G: {}, gsvSelect: () => { log.select++ }, toast: t => log.toast.push(t),
    sg2Drift: () => { log.drift++; if (W.lock) return true; if (W.noDrift) return false; store.set("bhRet", { k: "han", cover: true, at: now, first: false }); return true } };
  const names = Object.keys(env);
  const o = new Function(...names, SRC + ";return{bhLd,bhLdOff,bhLdDone,bhStart}")(...names.map(k => env[k]));
  const ov = () => { for (const e of reg) if (e.id === "bhLd") return e; return null };
  const runTo = t => { while (Q.length) { Q.sort((x, y) => x.at - y.at); if (Q[0].at > t) break; const q = Q.shift(); now = q.at; q.f() } now = t };
  const shown = () => { const e = ov(); return !!e && e.isConnected && !e.classList.contains("out") };
  return Object.assign(o, { log, ov, runTo, shown, store, st, setNow: t => { now = t } });
}
const PLAY = "#/journey/play";

test("〔純判斷〕bhLdDone：棋盤出來（3D 建好或平面）、新視窗、換到別頁、25 秒到才收", () => {
  const K = kit({ hash: () => "" }), D = K.bhLdDone, base = { ms: 1000, hash: "#/adventure", h0: "#/adventure", board: false, p3d: false, park: true, newModal: false };
  assert.equal(D(base), false, "還在星槎頁等開局");
  assert.equal(D({ ...base, hash: PLAY }), false, "換到對局頁、棋盤還沒畫");
  assert.equal(D({ ...base, hash: PLAY, board: true }), false, "棋盤框有了、3D 還在載（三維程式、模型）");
  assert.equal(D({ ...base, hash: PLAY, board: true, p3d: true }), true, "3D 星盤建好（過場的黑洞畫面跟著出來）");
  assert.equal(D({ ...base, hash: PLAY, board: true, park: false }), true, "這盤用平面棋盤：棋盤框有了就收");
  assert.equal(D({ ...base, newModal: true }), true, "跳出新視窗（例如還有一盤沒下完）");
  assert.equal(D({ ...base, hash: "#/" }), true, "換到別頁");
  assert.equal(D({ ...base, ms: 25000 }), true, "最多 25 秒");
});

test("〔行為〕接受急襲：載入畫面馬上出現，換頁、載 3D 這 8 秒都在，星盤建好才淡掉", () => {
  const K = kit({ hash: t => t < 300 ? "#/ship/sail" : PLAY, board: t => t >= 1200, p3d: t => t >= 8000 });
  K.bhStart("han", true); assert.equal(K.log.drift, 1); assert.ok(K.shown(), "一按就有");
  const e = K.ov(); assert.equal(e.attrs.role, "status"); assert.match(e.innerHTML, /正在進入星渦…/); assert.ok(!/上限/.test(e.innerHTML));
  K.runTo(7900); assert.ok(K.shown(), "3D 還沒好：還蓋著");
  K.runTo(8300); assert.ok(!K.shown(), "星盤建好就淡掉"); assert.equal(K.log.select, 0, "沒有開選關");
});

test("〔行為〕這盤用平面棋盤：棋盤框一出來就收", () => {
  const K = kit({ hash: t => t < 500 ? "#/adventure" : PLAY, board: t => t >= 900, park: false });
  K.bhStart("han", true); K.runTo(800); assert.ok(K.shown()); K.runTo(1300); assert.ok(!K.shown());
});

test("〔行為〕沒開成局：被鎖擋下（沒寫新的 bhRet）馬上收；不偏航直接開選關也收", () => {
  const K = kit({ hash: () => "#/adventure", lock: true }); K.st.bhRet = { k: "han", cover: true, at: -5 };
  K.bhStart("han", true); assert.ok(!K.shown(), "gsvStart 擋下：不留著空等");
  const K2 = kit({ hash: () => "#/adventure", noDrift: true }); K2.bhStart("han", true); assert.ok(!K2.shown()); assert.equal(K2.log.select, 1, "照舊開選關");
  const K3 = kit({ hash: () => "#/guanxing" }); K3.bhStart("han", false); assert.equal(K3.ov(), null, "不是偏航（觀星臺 cover:false）：不蓋"); assert.equal(K3.log.select, 1);
});

test("〔行為〕跳出新視窗就收、25 秒到了也收、3 秒後點一下能先收", () => {
  const box = {}; const K = kit({ hash: () => "#/adventure", modals: t => t >= 2000 ? [box] : [] });
  K.bhStart("han", true); K.runTo(1900); assert.ok(K.shown()); K.runTo(2300); assert.ok(!K.shown(), "新視窗");
  const K2 = kit({ hash: () => "#/adventure" }); K2.bhStart("han", true); K2.runTo(24000); assert.ok(K2.shown()); K2.runTo(25300); assert.ok(!K2.shown(), "25 秒");
  const K3 = kit({ hash: () => "#/adventure" }); K3.bhStart("han", true); K3.runTo(1000); K3.ov().onclick(); assert.ok(K3.shown(), "1 秒內點不掉（免得誤觸）");
  K3.runTo(3500); K3.ov().onclick(); assert.ok(!K3.shown(), "3 秒後點一下收");
});

test("〔原始碼〕樣式照 09b 等待畫面（米色底、墨點）；不擋預載的等待畫面（#pgate 9998 在上面）", () => {
  const P = rd("xiangqi-db/m/09b-preload.js");
  assert.ok(P.includes("#pgate{position:fixed;inset:0;z-index:9998") && P.includes("background:#F3ECDD"), "09b 的等待畫面");
  assert.ok(SRC.includes("#bhLd{position:fixed;inset:0;z-index:9990") && SRC.includes("background:#F3ECDD") && SRC.includes("rgba(42,31,21,.78)"), "同一套米色底、墨點");
  assert.ok(SRC.includes("prefers-reduced-motion:reduce"), "減少動態：墨點不動");
});
