// 資料保留期限（開發者 11/11 核准，說明 xiangqi-db/story/91_資料保留期限與清理.md）的自動測試，不開瀏覽器、不連網路：
//   ① tools/collect-anon.js：KEEP 期限（fun／tal／作答 365 天、stk 90 天、cpu 365 天）、pruneFile 刪掉過期和看不懂的行
//   ② 「📈 匿名送出學習進度」開關：05b-save.js 的 lrnAnonType／lrnAnonOn／XQ_ANON_OK ＋ src/net.js 的 shareIRT、dropIRT（vm 載入真正的程式）
//   ③ 申請刪除伺服器資料：05-settings.js 的 srvDel* 段（編號 D-月日-四碼、送出內容、沒網路排隊、XQNet.forget、手機記住請求）
//   ④ tools/mqtt-prune.js 的過期判斷純函式 judge（h 90 天、g 30 天、刪除請求 --id）
//   ⑤ tools/sheet-retention.gs 的判斷（假的試算表）：預覽不刪、APPLY 整列清空、停權名單、玩家登記看最後一次、刪除請求
// 用法：node --test xiangqi-lab/tools/test-retention.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), os = require("os");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const J = x => x === undefined ? x : JSON.parse(JSON.stringify(x));
function cut(src, a, b, name, inclEnd) { const i = src.indexOf(a), j = src.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + name); return src.slice(i, inclEnd ? j + b.length : j) }
const DAY = 864e5;

/* ---------- ① collect-anon.js ---------- */
test("collect-anon：KEEP 期限照核准的表", () => {
  const CA = require("./collect-anon.js"), K = Object.fromEntries(CA.KEEP.map(([f, d]) => [path.basename(f), d]));
  for (const n of ["onboard-funnel.jsonl", "onboard-funnel.test.jsonl", "talent-responses.jsonl", "irt-responses.jsonl", "irt-responses.test.jsonl", "cpu-games.jsonl", "cpu-games.test.jsonl"]) assert.equal(K[n], 365, n);
  for (const n of ["stuck-signals.jsonl", "stuck-signals.test.jsonl"]) assert.equal(K[n], 90, n);
  assert.equal(K["talent-responses.test.jsonl"], undefined, "at:1 的手工測試資料不能列進來");
  for (const [f] of CA.KEEP) assert.equal(path.dirname(f), path.resolve(DB), "都在 xiangqi-db 底下");
});
test("collect-anon：pruneFile 刪掉超過期限、沒有 at、看不懂的行，其他原樣留著", () => {
  const CA = require("./collect-anon.js"), dir = fs.mkdtempSync(path.join(os.tmpdir(), "xqret-")), f = path.join(dir, "irt-responses.jsonl"), now = Date.UTC(2026, 10, 11);
  const L = [{ at: now - 366 * DAY, t: "cj" }, { at: now - 365 * DAY, t: "rd" }, { at: now - 364 * DAY, t: "quiz" }, { t: "fun" }, { at: now, t: "tal" }].map(x => JSON.stringify(x));
  fs.writeFileSync(f, L.join("\n") + "\n壞掉的一行\n");
  assert.equal(CA.pruneFile(f, 365, now), 3);
  assert.deepEqual(fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map(l => JSON.parse(l).t), ["rd", "quiz", "tal"], "剛好 365 天的留著");
  assert.equal(CA.pruneFile(f, 365, now), 0, "第二次沒有要刪的");
  assert.equal(CA.pruneFile(path.join(dir, "沒有這個檔.jsonl"), 365, now), 0);
  const g = path.join(dir, "stuck-signals.jsonl"); fs.writeFileSync(g, [JSON.stringify({ at: now - 91 * DAY }), JSON.stringify({ at: now - 89 * DAY })].join("\n") + "\n");
  CA.prune([[g, 90]], now); assert.equal(fs.readFileSync(g, "utf8").split("\n").filter(Boolean).length, 1);
  fs.rmSync(dir, { recursive: true, force: true });
});

/* ---------- ② 學習進度開關＋net.js ---------- */
const SAVE = rd(path.join(DB, "m/05b-save.js")), SET = rd(path.join(DB, "m/05-settings.js"));
const LRN_SRC = cut(SAVE, "function lrnAnonType(", "window.XQ_ANON_OK=x=>!lrnAnonType(x)||lrnAnonOn();", "05b-save.js 的學習進度開關", true);
function memStorage() { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)) }, removeItem: k => { m.delete(k) }, map: m } }
function netPhone() {
  const ctx = { console, URL, URLSearchParams, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, clearInterval() { }, localStorage: memStorage(),
    location: { href: "http://localhost/", hash: "", pathname: "/", search: "", hostname: "localhost" }, history: { replaceState() { } }, navigator: { onLine: true },
    Event: class { constructor(t) { this.type = t } }, CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d && d.detail } },
    addEventListener() { }, removeEventListener() { }, dispatchEvent() { return true }, document: { hidden: false, addEventListener() { } }, atob: s => Buffer.from(s, "base64").toString("binary") };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(rd(path.join(LAB, "site/core.js")), ctx, { filename: "core.js" });
  vm.runInContext(rd(path.join(LAB, "src/net.js")), ctx, { filename: "net.js" });
  /* store 照 00-util.js：localStorage 的 m_ 前綴 */
  vm.runInContext('var store={get(k,d){const v=localStorage.getItem("m_"+k);if(v==null)return d;try{return JSON.parse(v)}catch(e){return d}},set(k,v){localStorage.setItem("m_"+k,JSON.stringify(v))}};\n' + LRN_SRC, ctx, { filename: "05b-save.js（切出來的）" });
  const q = () => J(JSON.parse(ctx.localStorage.getItem("xq_irtQ") || "[]")).map(x => x.t || "quiz");
  return { ctx, net: ctx.XQNet, q, off: v => ctx.localStorage.setItem("m_learnAnonOff", JSON.stringify(v)) };
}
const LEARN = [{ t: "fun", v: 1, iid: "abc123", s: { open: 0 } }, { t: "tal", v: 2, pts: [] }, { v: 1, th: 0.5, r: [["q1", 1, 3]] }, { t: "cj", v: 2, r: [] }, { t: "rd", v: 2, r: [] }];
test("學習進度開關：lrnAnonType 只把 stk、cpu 以外的算成學習資料", () => {
  const P = netPhone(), T = x => P.ctx.lrnAnonType(x);
  for (const x of LEARN) assert.equal(T(x), true, JSON.stringify(x));
  assert.equal(T({ t: "stk" }), false); assert.equal(T({ t: "cpu" }), false);
  assert.equal(P.ctx.lrnAnonOn(), true, "預設開");
});
test("學習進度開關：開著時照常排隊；關掉後 fun／tal／quiz／cj／rd 都不排隊，stk、cpu 不受影響", () => {
  const P = netPhone();
  for (const x of LEARN) P.net.shareIRT(x);
  assert.deepEqual(P.q(), ["fun", "tal", "quiz", "cj", "rd"]);
  P.ctx.localStorage.removeItem("xq_irtQ"); P.off(true);
  for (const x of LEARN) P.net.shareIRT(x);
  P.net.shareIRT({ t: "stk", sid: "s1" }); P.net.shareIRT({ t: "cpu", aid: "a1" });
  assert.deepEqual(P.q(), ["stk", "cpu"], "關掉後只剩卡關、對局評分（它們各有自己的開關）");
  P.off(false); P.net.shareIRT(LEARN[0]); assert.deepEqual(P.q(), ["stk", "cpu", "fun"], "再打開又會送");
});
test("學習進度開關：dropIRT(lrnAnonType) 丟掉排隊中的學習資料，留下 stk、cpu；dropIRT(\"cpu\") 舊用法照舊", () => {
  const P = netPhone();
  for (const x of LEARN) P.net.shareIRT(x);
  P.net.shareIRT({ t: "stk", sid: "s1" }); P.net.shareIRT({ t: "cpu", aid: "a1" });
  P.net.dropIRT(P.ctx.lrnAnonType); assert.deepEqual(P.q(), ["stk", "cpu"]);
  P.net.dropIRT("cpu"); assert.deepEqual(P.q(), ["stk"]);
  P.net.dropIRT(() => { throw new Error("壞掉的判斷") }); assert.deepEqual(P.q(), ["stk"], "判斷函式出錯時不亂丟");
});
test("〔原始碼〕設定頁：隱私段有「📈 匿名送出學習進度」開關，關掉時用 dropIRT(lrnAnonType)", () => {
  assert.match(SET, /📈 匿名送出學習進度（新手引導、作答、成長曲線）/);
  assert.match(SET, /id="lrnS"/);
  assert.match(SET, /store\.set\("learnAnonOff",!lr\.checked\);if\(!lr\.checked\)try\{XQNet\.dropIRT\(lrnAnonType\)\}/);
  const i = SET.indexOf('id="cpaS"'), j = SET.indexOf('id="lrnS"'); assert.ok(i > 0 && j > i, "放在「📊 匿名送出對局評分」後面");
});

/* ---------- ③ 申請刪除伺服器資料 ---------- */
const SAFE = rd(path.join(DB, "m/07x4-lobbysafe.js"));
const FB_SRC = cut(SET, "const FEEDBACK_FORM=", "// 走棋音效選單", "05-settings.js 的意見回饋送出");
const RID_SRC = cut(SAFE, "/* ---------- 檢舉追蹤編號（", "/* ---------- 檢舉追蹤編號：以上", "07x4-lobbysafe.js 的檢舉追蹤編號（包 postForm 那段）");
const DEL_SRC = cut(SET, "/* ---------- 申請刪除伺服器資料（", "/* ---------- 申請刪除伺服器資料：以上", "05-settings.js 的申請刪除伺服器資料");
function delPhone(opt) {
  opt = opt || {}; const ls = new Map(), beacons = [], bells = [], forgets = [];
  const store = { get(k, d) { const v = ls.get("m_" + k); if (v == null) return d; try { return JSON.parse(v) } catch (e) { return d } }, set(k, v) { ls.set("m_" + k, JSON.stringify(v)) } };
  const navigator = { onLine: opt.onLine !== false, sendBeacon: (u, body) => { beacons.push(String(body)); return true } };
  const ctx = { store, navigator, crypto: require("crypto").webcrypto, TextEncoder, URLSearchParams, Uint8Array, Math, Date, Set, Object, Array, String, Error, Promise, JSON,
    meInfo: () => ({ id: "dev12345abcd", name: "長安小棋童" }), XQ_BUILD: "20261111-2200",
    XQNet: { bell: x => bells.push(x), forget: () => { forgets.push(1); return opt.forget !== false } }, fetch: async () => { throw new Error("不該用 fetch") }, ls, beacons, bells, forgets };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(FB_SRC + "\n" + RID_SRC + "\n" + DEL_SRC + "\n;this.T={FEEDBACK_FORM,sendRecord,flushFeedback,srvDelRid,srvDelRec,srvDelList,srvDelState,srvDelLine,srvDelSend,SRV_DEL_RE,SRV_DEL_ABC,srvKey,srvKeyV};", ctx);
  for (const k of Object.keys(ctx.T)) if (typeof ctx.T[k] === "function") { const f = ctx.T[k]; ctx.T[k] = (...a) => { const r = f(...a); return r && typeof r.then === "function" ? Promise.resolve(r).then(J) : J(r) } }
  return ctx;
}
const form = (X, body) => { const p = new URLSearchParams(body), E = X.T.FEEDBACK_FORM.entries, o = {}; for (const k in E) if (p.has(E[k])) o[k] = p.get(E[k]); return o };
test("刪除請求編號：D-月日-四碼，四碼不含 0 O 1 I L", () => {
  const X = delPhone(), d = new Date(2026, 10, 11, 9, 30);
  for (let i = 0; i < 300; i++) { const r = X.T.srvDelRid(d); assert.match(r, X.T.SRV_DEL_RE); assert.ok(r.startsWith("D-1111-"), r); assert.doesNotMatch(r.slice(7), /[01OIL]/) }
  assert.equal(X.T.srvDelRid(new Date(2026, 0, 5), () => 0), "D-0105-2222");
  assert.equal(X.T.srvDelRid(new Date(2026, 11, 31), () => -1), "D-1231-ZZZZ");
  assert.equal(X.T.SRV_DEL_ABC, "23456789ABCDEFGHJKMNPQRSTUVWXYZ", "字表跟檢舉編號一樣");
  assert.ok(!X.T.SRV_DEL_RE.test("R-1111-7K3Q") && !X.T.SRV_DEL_RE.test("D-1111-7K3O") && !X.T.SRV_DEL_RE.test("D-111-7K3Q"));
});
test("刪除請求：送一筆「🗑 刪除請求」（編號＋裝置代號）、清掉大廳上線狀態與戰績摘要、關掉玩家登記、手機記住編號", async () => {
  const X = delPhone(), now = Date.UTC(2026, 10, 11, 6, 5);
  const r = await X.T.srvDelSend(now);
  assert.match(r.rid, X.T.SRV_DEL_RE); assert.equal(r.ok, true); assert.equal(r.forgot, true); assert.equal(r.id, "dev12345abcd");
  assert.equal(X.forgets.length, 1, "立刻呼叫 XQNet.forget");
  assert.equal(X.beacons.length, 1); const f = form(X, X.beacons[0]);
  assert.equal(f.type, "🗑 刪除請求"); assert.equal(f.id, "dev12345abcd"); assert.equal(f.role, "玩家"); assert.equal(f.ver, "20261111-2200");
  assert.ok(f.text.startsWith("[" + r.rid + "] 🗑 申請刪除伺服器上的資料"), f.text);
  assert.match(f.text, /裝置代號：dev12345abcd/); assert.match(f.text, new RegExp("請求編號：" + r.rid)); assert.match(f.text, /時間：2026-11-11 14:05（臺灣時間）/);
  assert.match(f.text, /意見回饋、檢舉、玩家登記/); assert.match(f.text, /手機已經自己清掉/);
  const key = JSON.parse(X.ls.get("m_srvKey")); assert.match(key, /^[0-9a-f]{32}$/, "本人證明的祕密值存在這支手機");
  assert.ok(f.text.endsWith("\n本人證明：" + key), "刪除請求附本人證明（11/14 防冒名）");
  assert.equal(X.T.srvKey(), key, "同一支手機一直用同一組");
  assert.equal(await X.T.srvKeyV(key), require("crypto").createHash("sha256").update("xqkey:" + key).digest("hex").slice(0, 16), "驗證碼＝管理頁 delCheck_ 的算法");
  assert.equal(f.name, "", "不送名字"); assert.ok(!/rid/.test(X.beacons[0]) || !new URLSearchParams(X.beacons[0]).has("rid"), "rid 不是表單欄位、不送");
  assert.deepEqual(X.bells.map(b => b.type), ["🗑 刪除請求"], "大廳送不含內容的提醒");
  assert.equal(JSON.parse(X.ls.get("m_repOff")), true, "關掉玩家登記");
  assert.deepEqual(X.T.srvDelList(), [{ rid: r.rid, at: now, st: "sent", forgot: true }]);
  const line = X.T.srvDelLine(); assert.match(line, new RegExp(r.rid)); assert.match(line, /已從手機送出/); assert.match(line, /30 天內處理/);
});
test("刪除請求：沒網路先排隊（顯示排隊中），有網路補送後變成已送出；沒連上大廳就請開發者清", async () => {
  const X = delPhone({ onLine: false, forget: false }), r = await X.T.srvDelSend(Date.UTC(2026, 10, 11, 6, 5));
  assert.equal(r.ok, false); assert.equal(X.beacons.length, 0, "沒網路時 sendBeacon 會騙說成功，所以要先丟錯、進 fbQueue");
  assert.equal(J(X.store.get("fbQueue", [])).length, 1); assert.match(X.T.srvDelLine(), /排隊中/);
  X.navigator.onLine = true; await X.T.flushFeedback();
  assert.equal(X.beacons.length, 1); const f = form(X, X.beacons[0]); assert.equal(f.type, "🗑 刪除請求"); assert.match(f.text, /沒清到，請開發者清/);
  assert.match(X.T.srvDelLine(), /已從手機送出/);
  const r2 = await X.T.srvDelSend(Date.UTC(2026, 10, 12)); assert.notEqual(r2.rid, r.rid); assert.equal(X.T.srvDelList().length, 2, "再申請一次也記得住");
});

/* ---------- ④ mqtt-prune.js ---------- */
test("mqtt-prune：戰績摘要 90 天、棋譜 30 天（at 和 tk 取較晚），沒有時間不清", () => {
  const M = require("./mqtt-prune.js"), now = Date.UTC(2026, 10, 11), h = (d, x) => JSON.stringify({ v: 1, id: "p1", at: now - d * DAY, list: [], ...(x || {}) });
  assert.equal(M.H_DAYS, 90); assert.equal(M.G_DAYS, 30);
  assert.equal(M.judge("h/p1", h(91), now).expire, true); assert.equal(M.judge("h/p1", h(90), now).expire, false); assert.equal(M.judge("h/p1", h(10), now).expire, false);
  const g = (a, t) => JSON.stringify({ gid: "g1", at: now - a * DAY, ...(t != null ? { tk: now - t * DAY } : {}), red: { id: "p1" }, black: { id: "p2" }, moves: [] });
  assert.equal(M.judge("g/g1/s", g(31), now).expire, true); assert.equal(M.judge("g/g1/s", g(29), now).expire, false);
  assert.equal(M.judge("g/g1/s", g(45, 29), now).expire, false, "最後一步 29 天前，還沒過期"); assert.equal(M.judge("g/g1/s", g(45, 31), now).expire, true);
  const nt = M.judge("h/p1", JSON.stringify({ v: 1, id: "p1" }), now); assert.equal(nt.expire, false); assert.match(nt.why, /看不出時間/);
  assert.equal(M.judge("h/p1", "不是 JSON", now).expire, false); assert.equal(M.judge("h/p1", "", now).expire, false, "已經是空的");
  assert.equal(M.judge("g/g1/e", g(99), now).kind, null, "表情頻道不管"); assert.equal(M.judge("u/p1", h(999), now).expire, false, "在線狀態不在這裡清");
  assert.equal(M.kindOf("h/p1"), "h"); assert.equal(M.kindOf("g/abc/s"), "g"); assert.equal(M.kindOf("h/p1/x"), null);
});
test("mqtt-prune：刪除請求 --id 不看期限，只清這個人的戰績摘要和他下過的棋", () => {
  const M = require("./mqtt-prune.js"), now = Date.UTC(2026, 10, 11), o = { id: "p1" };
  assert.equal(M.judge("h/p1", JSON.stringify({ id: "p1", at: now }), now, o).expire, true);
  assert.equal(M.judge("h/p1", JSON.stringify({ id: "p1" }), now, o).expire, true, "沒有時間也清");
  assert.equal(M.judge("h/p2", JSON.stringify({ id: "p2", at: 1 }), now, o).expire, false, "別人的不清（就算很舊）");
  const g = (r, b) => JSON.stringify({ gid: "g", at: now, red: { id: r }, black: { id: b } });
  assert.equal(M.judge("g/g/s", g("p1", "p2"), now, o).expire, true); assert.equal(M.judge("g/g/s", g("p3", "p1"), now, o).expire, true); assert.equal(M.judge("g/g/s", g("p2", "p3"), now, o).expire, false);
});
test("mqtt-prune：房間名稱", () => {
  const M = require("./mqtt-prune.js");
  assert.equal(M.rootOf(null), M.LIVE_ROOT); assert.equal(M.rootOf("live"), M.LIVE_ROOT); assert.equal(M.rootOf("citytest"), "xqlab-test-citytest/v1");
  assert.throws(() => M.rootOf("a/b")); assert.throws(() => M.rootOf("x"));
  assert.doesNotMatch(rd(path.join(__dirname, "mqtt-prune.js")), /password\s*[:=]\s*["'][^"']+["']|console\.log\([^)]*(CFG\.password|CFG\.username)/, "不印、不寫死帳密");
});

/* ---------- ⑤ sheet-retention.gs（假的試算表） ---------- */
const GS = rd(path.join(__dirname, "sheet-retention.gs"));
const HEAD = ["時間戳記", "類型", "內容", "聯絡方式", "線上ID", "名字", "段位", "版本", "裝置", "畫面", "截圖", "身分", "已修復", "處理說明", "開發者決定", "優先度"];
function fakeSheet(name, rows) {
  const sh = { name, data: rows };
  const set = (r, c, v) => { while (sh.data.length < r) sh.data.push([]); sh.data[r - 1][c - 1] = v };
  const width = () => Math.max(0, ...sh.data.map(r => r.length));
  Object.assign(sh, { getName: () => name, clear() { sh.data = [] },
    getDataRange: () => ({ getValues: () => { const w = width(); return sh.data.map(r => Array.from({ length: w }, (_, j) => r[j] === undefined ? "" : r[j])) } }),
    getLastColumn: () => width(),
    getRange: (r, c, nr, nc) => ({ getValue: () => (sh.data[r - 1] || [])[c - 1], setValue: v => set(r, c, v), setValues: vs => vs.forEach((row, i) => row.forEach((v, j) => set(r + i, c + j, v))),
      clearContent: () => { for (let i = 0; i < (nr || 1); i++) for (let j = 0; j < (nc || 1); j++) set(r + i, c + j, "") } }) });
  return sh;
}
function gsRun(rows, opt) {
  opt = opt || {}; const main = fakeSheet("表單回應 1", [HEAD.slice()].concat(rows.map(r => HEAD.map(h => r[h] === undefined ? "" : r[h])))), sheets = [main];
  const ss = { getSheets: () => sheets, getSheetByName: n => sheets.find(s => s.name === n) || null, insertSheet: n => { const s = fakeSheet(n, []); sheets.push(s); return s } };
  const ctx = { console: { log() { } }, Date, JSON, Math, Object, Array, String, RegExp, isNaN,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss },
    Utilities: { formatDate: (d, tz, f) => { const s = new Date(d.getTime() + 8 * 3600e3).toISOString(); return f.replace("yyyy", s.slice(0, 4)).replace("MM", s.slice(5, 7)).replace("dd", s.slice(8, 10)).replace("HH", s.slice(11, 13)).replace("mm", s.slice(14, 16)) } },
    UrlFetchApp: { fetch: () => opt.ban === null ? { getResponseCode: () => 500 } : { getResponseCode: () => 200, getContentText: () => JSON.stringify({ v: 1, ids: opt.ban || {} }) } } };
  vm.createContext(ctx);
  let src = GS; if (opt.apply) src = src.replace("const RET_APPLY = false;", "const RET_APPLY = true;"); if (opt.device) src = src.replace("const RET_DEVICE_ID = '';", "const RET_DEVICE_ID = '" + opt.device + "';");
  vm.runInContext(src, ctx, { filename: "sheet-retention.gs" });
  const n = opt.device ? ctx.retentionDeleteDevice() : ctx.retentionDaily(), pv = ss.getSheetByName("待刪預覽");
  const col = k => main.data[0].indexOf(k);
  return { n, main, pv, rowOf: i => main.data[i + 1], col, preview: pv ? pv.data.slice(1).map(r => r[0]) : [] };
}
const ymd = t => { const d = new Date(t); return "" + d.getFullYear() + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0") + "-1200：修好了" };
function sampleRows() {
  const now = Date.now(), ago = d => new Date(now - d * DAY);
  return [
    { 時間戳記: ago(500), 類型: "🐞 問題", 內容: "舊的、處理完很久", 線上ID: "a1", 已修復: true, 處理說明: ymd(now - 400 * DAY) },    // 第 2 列：清
    { 時間戳記: ago(200), 類型: "🐞 問題", 內容: "處理完不到一年", 線上ID: "a1", 已修復: true, 處理說明: ymd(now - 100 * DAY) },  // 第 3 列：留
    { 時間戳記: ago(800), 類型: "💡 建議", 內容: "還沒處理", 線上ID: "a2" },                                                     // 第 4 列：留
    { 時間戳記: ago(800), 類型: "💡 建議", 內容: "不處理，沒寫日期", 線上ID: "a2", 開發者決定: "不處理" },                          // 第 5 列：留（今天起算）
    { 時間戳記: ago(500), 類型: "🚩 檢舉", 內容: "[R-0101-2222] 🚩 檢舉線上玩家\n對方 ID：badguy", 線上ID: "a3", 已修復: true, 處理說明: ymd(now - 400 * DAY) },  // 第 6 列：對方停權中，留
    { 時間戳記: ago(500), 類型: "🚩 檢舉", 內容: "[R-0101-3333] 🚩 檢舉線上玩家\n對方 ID：okguy", 線上ID: "a3", 已修復: true, 處理說明: ymd(now - 400 * DAY) },   // 第 7 列：清
    { 時間戳記: ago(500), 類型: "👤 玩家", 內容: "", 線上ID: "p1" },                                                           // 第 8 列：p1 最近又登記，留
    { 時間戳記: ago(30), 類型: "👤 玩家", 內容: "", 線上ID: "p1" },                                                            // 第 9 列：留
    { 時間戳記: ago(400), 類型: "👤 玩家", 內容: "", 線上ID: "p2", 畫面: "🌐 大廳上線" },                                       // 第 10 列：清
    { 時間戳記: ago(5), 類型: "🗑 刪除請求", 內容: "[D-1111-7K3Q] 🗑 申請刪除伺服器上的資料\n裝置代號：dd1", 線上ID: "dd1" },       // 第 11 列
    { 時間戳記: ago(50), 類型: "🐞 問題", 內容: "dd1 寫的回饋", 線上ID: "dd1" },                                                 // 第 12 列
    { 時間戳記: ago(20), 類型: "👤 玩家", 內容: "", 線上ID: "dd1" },                                                           // 第 13 列
    { 時間戳記: ago(20), 類型: "🚩 檢舉", 內容: "[R-1101-4444]\n對方 ID：dd1", 線上ID: "zz" },                                  // 第 14 列：別人檢舉 dd1，刪除請求不清
  ];
}
test("sheet-retention.gs：預設只預覽（不動原資料），列出該清的列；補「處理完成日」", () => {
  const R = gsRun(sampleRows(), { ban: { badguy: { t: "2025-01-01", r: "名字不當" } } });
  assert.deepEqual(R.preview, [2, 7, 10]); assert.equal(R.n, 3);
  assert.equal(R.rowOf(0)[R.col("內容")], "舊的、處理完很久", "預覽不刪");
  const dc = R.col("處理完成日"); assert.ok(dc > 0, "自動加「處理完成日」欄");
  assert.ok(R.rowOf(3)[dc], "不處理的那列補上日期（今天）"); assert.ok(Math.abs(new Date(R.rowOf(3)[dc]).getTime() - Date.now()) < 60000);
  assert.equal(R.rowOf(2)[dc], "", "還沒處理的不補");
  assert.match(String(R.pv.data[0][1]), /預覽，還沒清/);
});
test("sheet-retention.gs：RET_APPLY＝true 整列清空（列號不動）；停權名單讀不到就不清檢舉", () => {
  const R = gsRun(sampleRows(), { apply: true, ban: { badguy: {} } });
  assert.deepEqual(R.preview, [2, 7, 10]);
  assert.equal(R.main.data.length, 1 + sampleRows().length, "列數不變");
  for (const i of [0, 5, 8]) assert.ok(R.rowOf(i).every(v => v === ""), "第 " + (i + 2) + " 列整列清空");
  assert.equal(R.rowOf(1)[R.col("內容")], "處理完不到一年");
  const N = gsRun(sampleRows(), { ban: null }); assert.deepEqual(N.preview, [2, 10], "讀不到停權名單：檢舉一律留著");
});
test("sheet-retention.gs：刪除請求依裝置代號清（刪除請求那列留著、標成處理完；別人檢舉他的不清）", () => {
  const P = gsRun(sampleRows(), { device: "dd1" }); assert.deepEqual(P.preview, [12, 13]); assert.equal(P.rowOf(10)[P.col("內容")], "dd1 寫的回饋", "預覽不刪");
  const A = gsRun(sampleRows(), { device: "dd1", apply: true });
  assert.ok(A.rowOf(10).every(v => v === "") && A.rowOf(11).every(v => v === ""));
  const req = A.rowOf(9); assert.equal(req[A.col("已修復")], true); assert.match(String(req[A.col("處理說明")]), /^\d{8}-\d{4}：已清空這個裝置代號送過的 2 列/); assert.ok(req[A.col("處理完成日")]);
  assert.match(String(A.rowOf(12)[A.col("內容")]), /對方 ID：dd1/, "別人檢舉他的列不在這裡清");
  assert.throws(() => gsRun(sampleRows(), { device: "x" }), /RET_DEVICE_ID/);
});
