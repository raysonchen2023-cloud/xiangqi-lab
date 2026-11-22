// 評比循環第 12 輪 F4「純淨畫面」、X10「老闆鍵＋中斷恢復」的自動測試（不開瀏覽器）：
//   ① 純函式（m/07fm-focus.js 的 FCM-PURE 段）：被打斷時記什麼（fcmMarkOf）、開 App 時能不能直接回去（fcmBackOk／fcmBootPick）、Esc 連按兩下、三指點一下、試算表內容
//   ② 用 vm 把 07fm-focus.js 整支載進一個小小的假 DOM：🎬 按鈕、純淨畫面開關／著法／Esc 還原、園子 3D 換平面時重畫、老闆鍵（標題、圖示、靜音、棋鐘、鍵盤擋住、換回原狀）、
//      三指點一下、長按 A1、切到背景時記號與棋鐘、冷啟動直接回那一盤、設定頁勾選框
//   ③ 把 xiangqi-lab/src/local.js 整支跑起來（假時鐘）：同機限時局 XQ_pvpPause 真的停錶、記進存檔、回來接著走、已經落旗不救
//   ④ 接線：m.html include、02-shell route() 掛勾、沒撞名、文件兩份一樣
// 用法：node --test xiangqi-lab/tools/test-focus-modes.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SRC = rd(path.join(M, "07fm-focus.js")), SHELL = rd(path.join(M, "02-shell.js")), LOCAL = rd(path.join(LAB, "src", "local.js"));
const J = x => x === undefined ? x : JSON.parse(JSON.stringify(x));

/* ---------- 小小的假 DOM（只做這個模組用到的：元素樹、屬性、innerHTML 解析、簡單選擇器、事件、MutationObserver） ---------- */
const VOID = new Set(["input", "img", "br", "meta", "link", "hr"]);
function parseCompound(s) {
  const m = { tag: null, id: null, cls: [], attrs: [] }; let r = s; const t = /^[a-zA-Z][\w-]*/.exec(r); if (t) { m.tag = t[0].toUpperCase(); r = r.slice(t[0].length) }
  while (r) { let x; if ((x = /^#([\w-]+)/.exec(r))) m.id = x[1]; else if ((x = /^\.([\w-]+)/.exec(r))) m.cls.push(x[1]); else if ((x = /^\[([\w-]+)(?:(~?=)"?([^"\]]*)"?)?\]/.exec(r))) m.attrs.push([x[1], x[2], x[3]]); else throw new Error("假 DOM 不認得選擇器：" + s); r = r.slice(x[0].length) }
  return m
}
function matches(el, m) {
  if (m.tag && el.tagName !== m.tag) return false; if (m.id && el.id !== m.id) return false; const cl = el.className.split(/\s+/); if (m.cls.some(c => !cl.includes(c))) return false;
  for (const [k, op, v] of m.attrs) { const a = el.getAttribute(k); if (a == null) return false; if (op === "=" && a !== v) return false; if (op === "~=" && !a.split(/\s+/).includes(v)) return false }
  return true
}
const desc = el => el.children.flatMap(c => [c, ...desc(c)]);
function qsa(root, sel) {
  const out = []; for (let part of sel.split(",")) {
    part = part.trim(); let scope = false; if (part.startsWith(":scope>")) { scope = true; part = part.slice(7) }
    const steps = part.split(/\s+/).map(parseCompound), cands = scope ? root.children : desc(root);
    for (const el of cands) {
      if (!matches(el, steps[steps.length - 1])) continue; let ok = true, a = el.parentNode;
      for (let i = steps.length - 2; i >= 0; i--) { while (a && !matches(a, steps[i])) a = a.parentNode; if (!a) { ok = false; break } a = a.parentNode }
      if (ok && !out.includes(el)) out.push(el)
    }
  } return out
}
class El {
  constructor(tag, doc) { this.tagName = tag.toUpperCase(); this.doc = doc; this.attrs = new Map(); this.children = []; this.parentNode = null; this.L = {}; this.style = {}; this._t = "" }
  get id() { return this.attrs.get("id") || "" } set id(v) { this.attrs.set("id", String(v)) }
  get className() { return this.attrs.get("class") || "" } set className(v) { this.attrs.set("class", String(v)) }
  setAttribute(k, v) { this.attrs.set(k, String(v)) } getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null } hasAttribute(k) { return this.attrs.has(k) } removeAttribute(k) { this.attrs.delete(k) }
  toggleAttribute(k, f) { const on = f === undefined ? !this.attrs.has(k) : !!f; if (on) this.attrs.set(k, ""); else this.attrs.delete(k); return on }
  get textContent() { return this._t + this.children.map(c => c.textContent).join("") } set textContent(v) { this.children = []; this._t = String(v) }
  get innerHTML() { return this._h || "" }
  set innerHTML(h) {
    this.children = []; this._t = ""; this._h = h; const st = [this]; const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g; let x;
    while ((x = re.exec(h))) {
      const cur = st[st.length - 1]; if (x[4]) { cur._t += x[4]; continue } if (x[1]) { if (st.length > 1) st.pop(); continue }
      const e = new El(x[2], this.doc); const ar = /([\w-]+)(?:="([^"]*)")?/g; let a; while ((a = ar.exec(x[3]))) e.attrs.set(a[1], a[2] == null ? "" : a[2]);
      e.parentNode = cur; cur.children.push(e); if (!VOID.has(x[2].toLowerCase()) && !/\/\s*$/.test(x[3])) st.push(e)
    }
  }
  append(...cs) { for (const c of cs) { if (c.parentNode) c.remove(); c.parentNode = this; this.children.push(c) } this.doc._mut(this) }
  remove() { const p = this.parentNode; if (!p) return; p.children = p.children.filter(x => x !== this); this.parentNode = null; this.doc._mut(p) }
  get isConnected() { let e = this; while (e) { if (e === this.doc.documentElement) return true; e = e.parentNode } return false }
  addEventListener(t, f) { (this.L[t] = this.L[t] || []).push(f) }
  fire(t, ev) { ev = Object.assign({ type: t, target: this, preventDefault() { this.dp = true } }, ev || {}); for (const f of this.L[t] || []) f(ev); return ev }
  focus() { this.doc.activeElement = this }
  querySelector(s) { return qsa(this, s)[0] || null } querySelectorAll(s) { return qsa(this, s) }
}
function mkDoc() {
  const doc = { L: {}, hidden: false, title: "象棋千秋", activeElement: null, obs: [] };
  doc._mut = t => { for (const o of doc.obs) if (o.t === t) o.cb([]) };
  doc.documentElement = new El("html", doc); doc.head = new El("head", doc); doc.body = new El("body", doc); doc.documentElement.append(doc.head, doc.body);
  doc.createElement = t => new El(t, doc); doc.getElementById = id => desc(doc.documentElement).find(e => e.id === id) || null;
  doc.querySelector = s => doc.documentElement.querySelector(s); doc.querySelectorAll = s => doc.documentElement.querySelectorAll(s);
  doc.addEventListener = (t, f) => { (doc.L[t] = doc.L[t] || []).push(f) };
  doc.fire = (t, ev) => { ev = Object.assign({ type: t, target: doc, preventDefault() { this.dp = true }, stopImmediatePropagation() { this.sip = true } }, ev || {}); for (const f of doc.L[t] || []) f(ev); return ev };
  doc.head.innerHTML = '<link rel="icon" href="/m/icon.svg"><meta name="theme-color" content="#3B2A1A">';
  doc.body.innerHTML = '<div class="app"><div class="topbar" id="topbar"><span id="topRight"></span></div><div class="view" id="view"></div><nav class="tabbar" id="tabbar"></nav></div>';
  return doc
}
function fakeLS(init) {
  const m = new Map(Object.entries(init || {}).map(([k, v]) => [k, typeof v === "string" ? v : JSON.stringify(v)]));
  return { m, getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => { m.set(k, String(v)) }, removeItem: k => { m.delete(k) }, key: i => [...m.keys()][i] ?? null, get length() { return m.size } }
}
/* 載入 07fm-focus.js：opt.ls＝localStorage 初值，opt.hash，opt.ss＝sessionStorage 初值，opt.page＝"board" 先畫一個對局頁 */
function load(opt) {
  opt = opt || {}; const doc = mkDoc(), ls = fakeLS(opt.ls), ss = new Map(Object.entries(opt.ss || {})), timers = [], winL = {}, log = { toast: [], route: 0, nav: [], ask: [], pause: [], apply: 0 };
  let now = opt.now || 1e12;
  if (opt.page === "board") doc.getElementById("view").innerHTML = '<div class="player" id="pTop"></div><div class="evline"></div><div class="boardbox" id="bbox"></div><div class="player" id="pBot"></div><div class="status" id="stat"></div><div class="strip" id="strip"></div><div class="actions" id="acts"></div>';
  const store = { get(k, d) { const v = ls.getItem("m_" + k); if (v == null) return d; try { return JSON.parse(v) } catch (e) { return d } }, set(k, v) { ls.setItem("m_" + k, JSON.stringify(v)) } };
  const ctx = {
    console, document: doc, localStorage: ls, store,
    sessionStorage: { getItem: k => ss.has(k) ? ss.get(k) : null, setItem: (k, v) => { ss.set(k, String(v)) }, removeItem: k => { ss.delete(k) } },
    location: { hash: opt.hash == null ? "#/" : opt.hash, replace(h) { this.hash = h } },
    navigator: { webdriver: !!opt.webdriver },
    Date: { now: () => now },
    setTimeout: (f, ms) => { const t = { f, at: now + (ms || 0), id: timers.length + 1 }; timers.push(t); return t.id },
    clearTimeout: id => { const t = timers.find(x => x.id === id); if (t) t.f = null },
    addEventListener: (t, f) => { (winL[t] = winL[t] || []).push(f) },
    MutationObserver: class { constructor(cb) { this.cb = cb } observe(t) { doc.obs.push({ t, cb: this.cb }) } },
    toast: m => log.toast.push(m), vibrate: () => { }, route: () => { log.route++ },
    navReplace: h => { log.nav.push(h); ctx.location.hash = h }, rsAsk: id => log.ask.push(id),
    XQ_pvpPause: on => { log.pause.push(on); return opt.pauseRet !== false },
    sxmMix: () => ({ v: { bgm: 80 } }), sxmApply: () => { log.apply++ }, hapOn: () => true, focusOn: () => false, speechSynthesis: { cancel() { log.speech = (log.speech || 0) + 1 } }
  };
  ctx.parkOn = () => !ctx.focusOn();   /* 跟 06-cpu parkOn 一樣：專注（focusOn）時一律平面 */
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext('"use strict";\n' + SRC, ctx, { filename: "07fm-focus.js" });
  const tick = ms => { now += ms || 0; for (let k = 0; k < 50; k++) { const due = timers.filter(t => t.f && t.at <= now); if (!due.length) break; for (const t of due) { const f = t.f; t.f = null; f() } } };
  const key = (k, o) => { const ev = Object.assign({ type: "keydown", key: k, repeat: false, preventDefault() { this.dp = true }, stopImmediatePropagation() { this.sip = true } }, o || {}); for (const f of winL.keydown || []) f(ev); return ev };
  const touch = (type, n, x, y) => doc.fire(type, { touches: Array.from({ length: n }, () => ({ clientX: x || 100, clientY: y || 100 })), changedTouches: [{ clientX: x || 100, clientY: y || 100 }] });
  return { X: ctx, doc, ls, ss, log, tick, key, touch, winL, store, html: doc.documentElement, setNow: v => { now = v }, now: () => now }
}
const G = (n, extra) => ({ id: "2026-11-13T01-00-00", human: "r", result: null, moves: Array.from({ length: n }, (_, i) => ({ f: i, t: i + 9 })), ...(extra || {}) });
const P = load().X;   /* 純函式從這裡拿 */
const getOf = init => { const L = fakeLS(init); return k => L.getItem(k) };

/* ---------- ① 純函式 ---------- */
test("被打斷時記什麼：對電腦的棋、同機對下、殘局／關卡；下完的、線上的、連線的、不在對局頁的都是 null", () => {
  const T = 5e12;
  assert.deepEqual(J(P.fcmMarkOf("#/cpu", getOf({ xq_play: G(6) }), T)), { h: "#/cpu", k: "play", id: G(0).id, n: 6, at: T });
  for (const h of ["#/arena", "#/journey/play", "#/redo/play"]) assert.equal(P.fcmMarkOf(h, getOf({ xq_play: G(3) }), T).k, "play", h);
  assert.equal(P.fcmMarkOf("#/cpu", getOf({ xq_play: G(6, { result: { w: "r" } }) }), T), null, "下完了");
  assert.equal(P.fcmMarkOf("#/cpu", getOf({ xq_play: G(0) }), T), null, "還沒走");
  assert.equal(P.fcmMarkOf("#/cpu", getOf({ xq_play: "{壞掉" }), T), null, "壞掉的 JSON 不出錯");
  assert.deepEqual(J(P.fcmMarkOf("#/pvp", getOf({ xq_pvp: G(4) }), T)), { h: "#/pvp", k: "pvp", id: G(0).id, n: 4, at: T });
  assert.equal(P.fcmMarkOf("#/pvp", getOf({ xq_pvp: G(4) }), T, true), null, "線上對局不記");
  assert.equal(P.fcmMarkOf("#/pvp", getOf({ xq_pvp: G(4), m_pvpSeat: "\"r\"" }), T), null, "連線對戰不記");
  assert.equal(P.fcmMarkOf("#/pvp", getOf({ xq_pvp: G(4), xq_pvpOnline: true }), T), null);
  const cj = { m_resumeLast: { r: { t: "cj", rk: "cjRun", id: "c7", h: "#/canju/c7", n: 2 } }, m_cjRun: { id: "c7", path: [[1, 2], [3, 4]] } };
  assert.deepEqual(J(P.fcmMarkOf("#/canju/c7", getOf(cj), T)), { h: "#/canju/c7", k: "pg", t: "cj", id: "c7", n: 2, at: T });
  assert.equal(P.fcmMarkOf("#/canju/c8", getOf(cj), T), null, "網址對不上");
  assert.equal(P.fcmMarkOf("#/canju/c7", getOf({ ...cj, m_cjRun: { id: "c7", path: [[1, 2]], ans: true } }), T), null, "看過答案＝做完了");
  assert.equal(P.fcmMarkOf("#/", getOf({ xq_play: G(6) }), T), null, "停在首頁");
  assert.equal(P.fcmMarkOf("#/settings", getOf({ xq_play: G(6) }), T), null);
});

test("開 App 時能不能直接回去：6 小時內、同一盤還在還沒下完；過期、換盤、下完、已過關、網址怪的都不行", () => {
  const T = 5e12, mk = (o) => ({ h: "#/cpu", k: "play", id: G(0).id, n: 6, at: T - 60000, ...(o || {}) }), ok = (m, init, t) => P.fcmBackOk(m, getOf(init), t || T);
  assert.equal(ok(mk(), { xq_play: G(6) }), true);
  assert.equal(ok(mk({ at: T - 6 * 36e5 + 1000 }), { xq_play: G(6) }), true, "6 小時內");
  assert.equal(ok(mk({ at: T - 6 * 36e5 - 1000 }), { xq_play: G(6) }), false, "超過 6 小時");
  assert.equal(ok(mk({ at: T + 5 * 60000 }), { xq_play: G(6) }), false, "時間在未來（手機時鐘被調過）");
  assert.equal(ok(mk(), { xq_play: G(6, { id: "另一盤" }) }), false, "桌上已經換成別盤（換存檔格、開新局）");
  assert.equal(ok(mk(), { xq_play: G(6, { result: { w: "b" } }) }), false, "那盤下完了");
  assert.equal(ok(mk(), { xq_play: G(6), m_resumeLast: { x: [G(0).id] } }), false, "「撐過 N 步」已經過關");
  assert.equal(ok(mk({ h: "javascript:alert(1)" }), { xq_play: G(6) }), false);
  assert.equal(ok(mk({ h: "#/settings" }), { xq_play: G(6) }), false, "play 只回對局頁");
  assert.equal(ok(null, {}), false); assert.equal(ok("壞", {}), false);
  const pv = { h: "#/pvp", k: "pvp", id: G(0).id, n: 4, at: T - 1000 };
  assert.equal(ok(pv, { xq_pvp: G(4) }), true); assert.equal(ok(pv, { xq_pvp: G(4), m_pvpSeat: "\"b\"" }), false); assert.equal(ok(pv, { xq_pvp: G(4, { result: { w: "r" } }) }), false);
  const R = (t, rk, run) => ({ m_resumeLast: { r: { t, rk, id: "x1", h: "#/p/x1" } }, ["m_" + (rk || { tm: "jpRun", qz: "quizRun" }[t])]: run }), pg = t => ({ h: "#/p/x1", k: "pg", t, id: "x1", at: T - 1000 });
  assert.equal(ok(pg("cj"), R("cj", "cjRunZ", { id: "x1", path: [1] })), true);
  assert.equal(ok(pg("lv"), R("lv", "jRunB", { id: "x1", k: 2 })), true); assert.equal(ok(pg("lv"), R("lv", "jRunB", { id: "x1", k: 2, done: 1 })), false, "關卡過完了");
  assert.equal(ok(pg("tm"), R("tm", null, { id: "x1", ids: [1, 2, 3], k: 1 })), true); assert.equal(ok(pg("tm"), R("tm", null, { id: "x1", ids: [1, 2], k: 2 })), false);
  assert.equal(ok(pg("qz"), R("qz", null, { sid: "x1", a: [] })), true);
  assert.equal(ok(pg("cj"), { m_resumeLast: { r: { t: "cj", rk: "cjRun", id: "x2", h: "#/p/x1" } }, m_cjRun: { id: "x2", path: [1] } }), false, "最新一份已經是別題");
});

test("冷啟動要不要直接回去：只在這個分頁第一次打開、網址是首頁、不是自動化瀏覽器", () => {
  const T = 5e12, m = { h: "#/cpu", k: "play", id: G(0).id, n: 6, at: T - 1000 }, get = getOf({ xq_play: G(6) }), o = x => P.fcmBootPick({ first: true, wd: false, hash: "#/", mark: m, get, now: T, ...x });
  assert.equal(o().h, "#/cpu"); assert.equal(o({ hash: "" }).h, "#/cpu"); assert.equal(o({ hash: "#/home" }).h, "#/cpu");
  assert.equal(o({ first: false }), null, "同一個分頁重新整理"); assert.equal(o({ wd: true }), null, "自動化瀏覽器");
  assert.equal(o({ hash: "#/canju" }), null, "深連結照深連結"); assert.equal(o({ mark: null }), null);
});

test("Esc：連按兩下（0.45 秒內）＝老闆鍵；純淨畫面單按一下先等第二下；有卡片時不還原；老闆鍵關掉時單按就還原", () => {
  const S = { last: 0 }, on = { on: true };
  assert.equal(P.fcmEscStep(S, 1000, on), "none"); assert.equal(P.fcmEscStep(S, 1300, on), "boss", "0.3 秒內第二下");
  assert.equal(P.fcmEscStep(S, 1400, on), "none", "觸發後重新算，不會三連發");
  assert.equal(P.fcmEscStep(S, 5000, on), "none"); assert.equal(P.fcmEscStep(S, 5600, on), "none", "隔 0.6 秒不算連按");
  const C = { last: 0 };
  assert.equal(P.fcmEscStep(C, 1000, { clean: true, on: true }), "wait"); assert.equal(P.fcmEscStep(C, 1200, { clean: true, on: true }), "boss");
  assert.equal(P.fcmEscStep({ last: 0 }, 1000, { clean: true, card: true, on: true }), "none", "有卡片時 Esc 先關卡片");
  assert.equal(P.fcmEscStep({ last: 0 }, 1000, { clean: true, on: false }), "clean", "老闆鍵關掉：不用等，馬上還原");
  const B = { last: 0 }; assert.equal(P.fcmEscStep(B, 1000, { boss: true, on: true }), "none", "老闆畫面上單按一下不回去"); assert.equal(P.fcmEscStep(B, 1200, { boss: true, on: true }), "boss");
  const D = { last: 0 }; P.fcmEscStep(D, 1000, { on: false }); assert.equal(P.fcmEscStep(D, 1200, { on: false }), "none", "老闆鍵關掉：連按兩下也沒事");
});

test("三指點一下：正好 3 根、0.6 秒內放開、沒拖動才算；1、2、4 根、拖動、按太久、被取消都不算", () => {
  const run = evs => { const S = {}; let hit = 0; for (const e of evs) if (P.fcmT3Step(S, e)) hit++; return hit };
  const tap = (n, dt, mv) => { const e = []; for (let i = 1; i <= n; i++) e.push({ t: "start", n: i, at: 1000 + i * 10, x: 100, y: 100 }); if (mv) e.push({ t: "move", n, at: 1100, x: 100 + mv, y: 100 }); for (let i = n - 1; i >= 0; i--) e.push({ t: "end", n: i, at: 1000 + dt, x: 100, y: 100 }); return e };
  assert.equal(run(tap(3, 200)), 1); assert.equal(run(tap(3, 200).concat(tap(3, 250).map(e => ({ ...e, at: e.at + 2000 })))), 2, "連點兩次各算一次");
  assert.equal(run(tap(1, 100)), 0); assert.equal(run(tap(2, 100)), 0, "兩指縮放棋盤不算"); assert.equal(run(tap(4, 100)), 0);
  assert.equal(run(tap(3, 900)), 0, "按太久"); assert.equal(run(tap(3, 200, 60)), 0, "拖動（三指捲動）"); assert.equal(run(tap(3, 200, 10)), 1, "小小晃動可以");
  assert.equal(run([{ t: "start", n: 1, at: 0, x: 0, y: 0 }, { t: "start", n: 2, at: 5, x: 0, y: 0 }, { t: "start", n: 3, at: 9, x: 0, y: 0 }, { t: "cancel", n: 0, at: 100, x: 0, y: 0 }]), 0, "被系統取消");
});

test("老闆畫面的試算表：合計算得對、執行率對、沒有真實公司名稱、圖示是 data 網址", () => {
  const R = P.fcmSheetRows(), h = P.fcmBossHTML(), sb = R.reduce((a, r) => a + r[2], 0), ss = R.reduce((a, r) => a + r[3], 0);
  assert.ok(R.length >= 10 && R.every(r => r[3] <= r[2]), "已支出不超過預算");
  assert.ok(h.includes(P.fcmNum(sb)) && h.includes(P.fcmNum(ss)) && h.includes(P.fcmNum(sb - ss)), "合計三欄");
  assert.ok(h.includes(Math.round(ss / sb * 100) + "%"));
  assert.equal(P.fcmNum(1234567), "1,234,567"); assert.equal(P.fcmNum(999), "999");
  assert.ok(!/google|excel|microsoft|office|sheets|apple|numbers|wps|libre|象棋|千秋|棋/i.test(h + P.fcmBossTitle()), "沒有品牌字，也沒有洩漏是下棋");
  assert.match(h, /id="fcmNb"[^>]*>A1</); assert.match(P.fcmIcon(), /^data:image\/svg\+xml,/);
});

/* ---------- ② 整支載進假 DOM ---------- */
test("純淨畫面：對局頁右上角有 🎬；點了只留棋盤、名字棋鐘、著法；著法可收；✕ 還原；不是對局頁不套用", () => {
  const E = load({ page: "board", hash: "#/cpu" }), b = E.doc.getElementById("fcmBtn");
  assert.ok(b && b.parentNode === E.doc.getElementById("topRight"), "🎬 在頂欄右邊"); assert.ok(E.doc.getElementById("fcmCss").textContent.includes("data-fcmclean"));
  b.onclick(); assert.equal(E.store.get("cleanUI"), true); assert.ok(E.html.hasAttribute("data-fcmclean"));
  assert.match(E.log.toast.pop(), /純淨畫面/);
  const bar = E.doc.getElementById("fcmBar"); assert.ok(bar); const mv = bar.querySelector('[data-fcm="mv"]');
  assert.equal(mv.getAttribute("aria-pressed"), "true"); mv.onclick(); assert.ok(E.html.hasAttribute("data-fcmnomv"), "著法收起來"); assert.equal(E.store.get("cleanMoves"), false);
  assert.equal(E.doc.getElementById("fcmBar").querySelector('[data-fcm="mv"]').getAttribute("aria-pressed"), "false"); mv.onclick(); assert.ok(!E.html.hasAttribute("data-fcmnomv"));
  bar.querySelector('[data-fcm="x"]').onclick(); assert.equal(E.store.get("cleanUI"), false); assert.ok(!E.html.hasAttribute("data-fcmclean")); assert.ok(!E.doc.getElementById("fcmBar"));
  /* 設定開著，換到不是對局頁（route 換掉 #view 內容 → MutationObserver） */
  E.store.set("cleanUI", true); E.doc.getElementById("view").innerHTML = '<div class="home"></div>'; E.doc._mut(E.doc.getElementById("view")); E.tick(1);
  assert.ok(!E.html.hasAttribute("data-fcmclean"), "首頁不套用"); assert.ok(!E.doc.getElementById("fcmBtn"), "首頁沒有 🎬");
  E.doc.getElementById("view").innerHTML = '<div id="pTop"></div><div id="bbox"></div><div id="acts"></div>'; E.doc._mut(E.doc.getElementById("view")); E.tick(1);
  assert.ok(E.html.hasAttribute("data-fcmclean"), "設定開著：下一盤直接是純淨畫面");
});

test("純淨畫面：CSS 只留 #pTop、#bbox、#pBot、#strip，結果視窗、卡片、螢幕報讀文字、老闆畫面不收", () => {
  const css = load().X.fcmCssText();
  assert.match(css, /#view>:not\(#pTop\):not\(#bbox\):not\(#pBot\):not\(#strip\)\{display:none!important\}/);
  for (const k of [".modal", "#sheet", "#toast", ".ax-sr", "[role=dialog]", "#fcmBoss"]) assert.ok(css.includes(":not(" + k + ")"), k);
  for (const k of ["#topbar", "#tabbar", ".xqbot", ".tmx-bub", ".emo", ".player .av img"]) assert.ok(css.includes(k), k);
});

test("純淨畫面：在對局頁打開時園子 3D 換平面（重畫一次），關掉換回；Esc 單按 0.46 秒後還原，有卡片時不還原", () => {
  const E = load({ page: "board", hash: "#/cpu" });
  assert.equal(E.X.parkOn(), true, "原本是園子 3D");
  E.doc.getElementById("fcmBtn").onclick(); assert.equal(E.X.parkOn(), false, "focusOn 被包起來：純淨畫面一律平面"); assert.equal(E.log.route, 1, "重畫一次");
  E.X.location.hash = "#/settings"; assert.equal(E.X.parkOn(), true, "不是對局頁不影響"); E.X.location.hash = "#/cpu";
  const sh = E.doc.createElement("div"); sh.id = "sheet"; sh.className = "sheet show"; E.doc.body.append(sh);
  E.key("Escape"); E.tick(600); assert.equal(E.store.get("cleanUI"), true, "Esc 先關卡片"); sh.remove();
  E.setNow(E.now() + 5000); E.key("Escape"); E.tick(300); assert.equal(E.store.get("cleanUI"), true, "還在等第二下"); E.tick(200);
  assert.equal(E.store.get("cleanUI"), false, "單按一下＝還原"); assert.equal(E.log.route, 2, "換回 3D 再重畫");
});

test("老闆鍵（電腦）：連按兩下 Esc 換成試算表；標題、圖示、狀態列顏色換掉、靜音、不震、棋鐘停、快捷鍵擋住；再兩下全部換回", () => {
  const E = load({ page: "board", hash: "#/pvp" }), app = E.doc.querySelector(".app"), ic = E.doc.querySelector('link[rel~="icon"]');
  const sb = E.doc.createElement("button"); E.doc.getElementById("view").append(sb); sb.focus();
  E.key("Escape"); E.setNow(E.now() + 200); const ev = E.key("Escape");
  assert.ok(ev.sip && ev.dp, "第二下不再往下傳"); const o = E.doc.getElementById("fcmBoss"); assert.ok(o, "試算表蓋上來");
  assert.equal(E.doc.title, "第四季部門預算追蹤 - 試算表"); assert.match(ic.getAttribute("href"), /^data:image\/svg/); assert.equal(E.doc.querySelector('meta[name="theme-color"]').getAttribute("content"), "#ffffff");
  assert.ok(E.html.hasAttribute("data-fcmboss") && app.hasAttribute("inert") && app.getAttribute("aria-hidden") === "true");
  assert.equal(E.X.sxmMix().all, true, "音量分類當成全部靜音"); assert.equal(E.X.sxmMix().v.bgm, 80, "使用者的設定還在"); assert.equal(E.store.get("sndMix", null), null, "沒有寫進存檔");
  assert.ok(E.log.apply >= 1 && E.log.speech >= 1, "套用音量、停語音"); assert.equal(E.X.hapOn(), false, "不震動"); assert.deepEqual(E.log.pause, [true], "同機限時局棋鐘暫停");
  const kb = E.key("b"); assert.ok(kb.sip && kb.dp, "B（跳到棋盤）不會傳到底下"); const kc = E.key("c", { ctrlKey: true }); assert.ok(kc.sip && !kc.dp, "Ctrl 組合鍵不擋瀏覽器");
  E.setNow(E.now() + 2000); E.key("Escape"); E.tick(1000); assert.ok(E.doc.getElementById("fcmBoss"), "單按一下不回去");
  E.setNow(E.now() + 2000); E.key("Escape"); E.setNow(E.now() + 300); E.key("Escape");
  assert.ok(!E.doc.getElementById("fcmBoss")); assert.equal(E.doc.title, "象棋千秋"); assert.equal(ic.getAttribute("href"), "/m/icon.svg"); assert.equal(E.doc.querySelector('meta[name="theme-color"]').getAttribute("content"), "#3B2A1A");
  assert.ok(!app.hasAttribute("inert") && !app.hasAttribute("aria-hidden") && !E.html.hasAttribute("data-fcmboss"));
  assert.equal(E.X.sxmMix().all, undefined, "聲音回來"); assert.equal(E.X.hapOn(), true); assert.deepEqual(E.log.pause, [true, false], "棋鐘接著走"); assert.ok(E.doc.activeElement === sb, "焦點回到原本的地方");
});

test("老闆鍵（手機）：三根手指點一下換畫面；再三指點一下或長按 A1 0.8 秒換回；兩指不算；設定關掉就不換", () => {
  const E = load({ page: "board", hash: "#/cpu" }), t3 = () => { E.touch("touchstart", 1); E.touch("touchstart", 2); E.touch("touchstart", 3); E.setNow(E.now() + 150); E.touch("touchend", 2); E.touch("touchend", 1); E.touch("touchend", 0) };
  E.touch("touchstart", 1); E.touch("touchstart", 2); E.touch("touchend", 1); E.touch("touchend", 0); assert.ok(!E.doc.getElementById("fcmBoss"), "兩指不算");
  E.setNow(E.now() + 1000); t3(); assert.ok(E.doc.getElementById("fcmBoss"));
  E.setNow(E.now() + 1000); t3(); assert.ok(!E.doc.getElementById("fcmBoss"), "再三指點一下換回");
  E.setNow(E.now() + 1000); t3(); const nb = E.doc.getElementById("fcmNb"); assert.ok(nb);
  nb.fire("pointerdown"); E.tick(500); nb.fire("pointerup"); E.tick(1000); assert.ok(E.doc.getElementById("fcmBoss"), "按 0.5 秒放開不算");
  nb.fire("pointerdown"); E.tick(850); assert.ok(!E.doc.getElementById("fcmBoss"), "長按 A1 0.8 秒換回");
  E.store.set("bossKey", false); E.setNow(E.now() + 1000); t3(); assert.ok(!E.doc.getElementById("fcmBoss"), "老闆鍵關掉");
  E.setNow(E.now() + 1000); E.key("Escape"); E.setNow(E.now() + 100); E.key("Escape"); assert.ok(!E.doc.getElementById("fcmBoss"));
});

test("中斷恢復：切到背景時記下那盤、棋鐘停；回到畫面棋鐘接著走；停在首頁時清掉記號", () => {
  const E = load({ page: "board", hash: "#/cpu", ls: { xq_play: G(8) }, now: 7e12 });
  E.doc.hidden = true; E.doc.fire("visibilitychange");
  assert.deepEqual(E.store.get("fcmBack"), { h: "#/cpu", k: "play", id: G(0).id, n: 8, at: 7e12 }); assert.deepEqual(E.log.pause, [true]);
  E.doc.hidden = false; E.doc.fire("visibilitychange"); assert.deepEqual(E.log.pause, [true, false]);
  E.X.location.hash = "#/"; for (const f of E.winL.pagehide) f({}); assert.equal(E.store.get("fcmBack"), null, "最後停在首頁");
  const F = load({ hash: "#/cpu", ls: { xq_play: G(8) }, pauseRet: false }); F.doc.hidden = true; F.doc.fire("visibilitychange"); F.doc.hidden = false; F.doc.fire("visibilitychange");
  assert.deepEqual(F.log.pause, [true], "沒停到（沒有限時局）就不去解除");
});

test("中斷恢復：分頁第一次打開、網址是首頁、6 小時內被打斷的那盤還在 → 直接回去、不再問；同分頁重開、過期、深連結都不動", () => {
  const T = 9e12, mark = { h: "#/cpu", k: "play", id: G(0).id, n: 7, at: T - 30 * 60000 };
  const E = load({ hash: "#/", now: T, ls: { xq_play: G(7), m_fcmBack: mark } });
  assert.deepEqual(E.log.nav, ["#/cpu"], "直接換到那一盤（02-shell 的掛勾沒在這裡，模組最後補叫的那次）"); assert.deepEqual(E.log.ask, [G(0).id], "記成問過了，不跳續局小卡");
  assert.equal(E.ss.get("fcmBoot"), "1"); E.tick(1000); assert.match(E.log.toast.join(), /已接回剛才那一盤（第 4 回合）/);
  E.X.location.hash = "#/"; assert.equal(E.X.fcmBootGo(), false, "同一個分頁不再拉第二次"); assert.deepEqual(E.log.nav, ["#/cpu"]);
  assert.deepEqual(load({ hash: "#/", now: T, ss: { fcmBoot: "1" }, ls: { xq_play: G(7), m_fcmBack: mark } }).log.nav, [], "同分頁重新整理");
  assert.deepEqual(load({ hash: "#/", now: T + 6 * 36e5, ls: { xq_play: G(7), m_fcmBack: mark } }).log.nav, [], "超過 6 小時：照舊出開頭畫面");
  assert.deepEqual(load({ hash: "#/canju", now: T, ls: { xq_play: G(7), m_fcmBack: mark } }).log.nav, [], "深連結");
  assert.deepEqual(load({ hash: "#/", now: T, webdriver: true, ls: { xq_play: G(7), m_fcmBack: mark } }).log.nav, [], "自動化瀏覽器");
  const pv = load({ hash: "", now: T, ls: { xq_pvp: G(5), m_fcmBack: { h: "#/pvp", k: "pvp", id: G(0).id, n: 5, at: T - 1000 } } });
  assert.deepEqual(pv.log.nav, ["#/pvp"], "同機對下也接得回"); assert.deepEqual(pv.log.ask, [], "同機對下沒有續局小卡，不用記");
  const cj = load({ hash: "#/", now: T, ls: { m_resumeLast: { r: { t: "cj", rk: "cjRun", id: "c7", h: "#/canju/c7" } }, m_cjRun: { id: "c7", path: [1, 2, 3] }, m_fcmBack: { h: "#/canju/c7", k: "pg", t: "cj", id: "c7", n: 3, at: T - 1000 } } });
  assert.deepEqual(cj.log.nav, ["#/canju/c7"], "殘局接回那一題"); cj.tick(1000); assert.match(cj.log.toast.join(), /已接回剛才那一題/);
});

test("設定頁勾選框：#cleanSw、#bossSw 的 change 事件由這裡存檔並套用；進設定頁時勾選狀態跟著存檔", () => {
  const E = load({ hash: "#/settings" }), mk = (id, ck) => { const i = E.doc.createElement("input"); i.id = id; i.checked = ck; E.doc.getElementById("view").append(i); return i };
  const c = mk("cleanSw", true), b = mk("bossSw", false); E.tick(1);
  assert.equal(c.checked, false, "照存檔（預設關）"); assert.equal(b.checked, true, "老闆鍵預設開");
  c.checked = true; E.doc.fire("change", { target: c }); assert.equal(E.store.get("cleanUI"), true); assert.match(E.log.toast.pop(), /已打開純淨畫面/);
  b.checked = false; E.doc.fire("change", { target: b }); assert.equal(E.store.get("bossKey"), false); assert.match(E.log.toast.pop(), /已關閉老闆鍵/);
  c.checked = false; E.doc.fire("change", { target: c }); assert.equal(E.store.get("cleanUI"), false); assert.match(E.log.toast.pop(), /已關閉純淨畫面/);
});

/* ---------- ③ local.js 同機限時局：真的停錶 ---------- */
const CORE_SRC = rd(path.join(LAB, "site", "core.js"));
class FD extends Date { constructor(...a) { if (a.length) super(...a); else super(FD.t) } static now() { return FD.t } }
function openLocal() {
  const ls = fakeLS(), ctx = {
    console, URL, URLSearchParams, setImmediate, Date: FD, setTimeout: () => 0, clearTimeout() { }, setInterval: () => 0, clearInterval() { },
    localStorage: ls, sessionStorage: { getItem: () => null, setItem() { }, removeItem() { } }, indexedDB: { open() { return {} } },
    location: { href: "http://localhost/", hash: "", pathname: "/", search: "" }, history: { replaceState() { } }, navigator: { onLine: true },
    Event: class { constructor(t) { this.type = t } }, CustomEvent: class { constructor(t, d) { this.type = t; this.detail = d && d.detail } },
    addEventListener() { }, removeEventListener() { }, dispatchEvent: () => true, document: { hidden: false, addEventListener() { } }, atob: s => Buffer.from(s, "base64").toString("binary"),
    XQEngine: { ready: false }
  };
  ctx.window = ctx; vm.createContext(ctx); vm.runInContext(CORE_SRC, ctx, { filename: "core.js" }); vm.runInContext(LOCAL, ctx, { filename: "local.js" });
  return { ctx, ls, api: async (u, b) => J(await ctx.XQ.api(u, b)) }
}
test("local.js XQ_pvpPause：同機 10+5 局，背景 10 分鐘鐘不動、這手已用的時間記進存檔、回來接著走；沒在走、不限時、已落旗都不動", async () => {
  FD.t = Date.parse("2026-11-13T02:00:00Z"); const L = openLocal(), X = L.ctx;
  assert.equal(typeof X.XQ_pvpPause, "function");
  assert.equal(X.XQ_pvpPause(true), false, "還沒有同機對局");
  let s = await L.api("/pvp/new", { tc: "10+5" }); assert.equal(s.running, false);
  assert.equal(X.XQ_pvpPause(true), false, "第一手還沒走、鐘還沒開始，不用停");
  s = await L.api("/pvp/move", { f: s.legal[0][0], t: s.legal[0][1] }); assert.equal(s.running, true); assert.equal(s.turn, "b");
  FD.t += 5000; assert.equal(X.XQ_pvpPause(true), true);
  assert.equal(JSON.parse(L.ls.getItem("xq_pvp")).clocks.b, 595000, "這手想了 5 秒，記進存檔");
  FD.t += 600000; s = await L.api("/pvp/state"); assert.equal(s.running, false); assert.equal(s.clocks.b, 595000, "背景 10 分鐘鐘不動"); assert.equal(s.result, null, "沒有超時判負");
  assert.equal(X.XQ_pvpPause(true), false, "已經停了"); assert.equal(X.XQ_pvpPause(false), true);
  FD.t += 2000; s = await L.api("/pvp/state"); assert.equal(s.running, true); assert.equal(s.clocks.b, 593000, "從回來那一刻接著走");
  assert.equal(X.XQ_pvpPause(false), false, "沒停過的不動");
  /* 停著時有人落子（跟重新打開 App 後的第一手一樣：不扣時、不加秒）：那一步本來就會替對方起鐘，解除時不再動 */
  X.XQ_pvpPause(true); s = await L.api("/pvp/state"); s = await L.api("/pvp/move", { f: s.legal[0][0], t: s.legal[0][1] }); FD.t += 1000;
  assert.equal(X.XQ_pvpPause(false), false); s = await L.api("/pvp/state");
  assert.equal(s.clocks.b, 593000, "黑方：停著時走的那一手不扣時、不加秒"); assert.equal(s.clocks.r, 600000 - 1000, "紅方：從那一步起走了 1 秒");
  /* 已經落旗：不救 */
  FD.t += 700000; assert.equal(X.XQ_pvpPause(true), false); s = await L.api("/pvp/state"); assert.match(s.result.why, /超時/);
  /* 不限時的局：沒有鐘可停 */
  await L.api("/pvp/new", {}); s = await L.api("/pvp/state"); await L.api("/pvp/move", { f: s.legal[0][0], t: s.legal[0][1] }); assert.equal(X.XQ_pvpPause(true), false);
});

/* ---------- ④ 接線 ---------- */
test("〔原始碼〕m.html 在 07hp-haptics 後面 include；02-shell route() 家長時段之後第一個呼叫 fcmBootGo；local.js 掛 XQ_pvpPause", () => {
  const H = rd(path.join(DB, "m.html")), a = H.indexOf("//#include m/07hp-haptics.js"), b = H.indexOf("//#include m/07fm-focus.js");
  assert.ok(a > 0 && b > a, "include 在 07hp 後面");
  const r = SHELL.slice(SHELL.indexOf("function route(){")), L = r.split("\n");
  assert.match(L[1], /fmRouteGate/);
  /* 11/13 平日體力的 dglRouteGate（定軌力用完、人間的頁先關著）排在家長時段後面、中斷恢復前面：體力用完時不拉回對局；之後第一個就是 fcmBootGo */
  assert.match(L[2], /^  try\{if\(typeof dglRouteGate==="function"&&dglRouteGate\(\)\)return\}catch\(e\)\{\}/);
  assert.match(L[3], /^  try\{if\(typeof fcmBootGo==="function"&&fcmBootGo\(\)\)return\}catch\(e\)\{\}/);
  assert.match(LOCAL, /window\.XQ_pvpPause=on=>/);
});

test("〔原始碼〕沒撞名、route() 會在這個檔載入前叫到的那一串只用 function；長行沒有 // 註解；文件兩份一樣、LF", () => {
  const names = [...SRC.matchAll(/^(?:function|var|const|let)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  assert.ok(names.length > 20 && names.every(n => /^(fcm|FCM)/.test(n)), "全部 fcm 開頭：" + names.filter(n => !/^(fcm|FCM)/.test(n)));
  for (const f of fs.readdirSync(M).filter(f => f.endsWith(".js") && f !== "07fm-focus.js")) {
    const s = rd(path.join(M, f)); for (const n of names) assert.ok(!new RegExp("(?:function|const|let|var)\\s+" + n + "\\b").test(s), "撞名：" + n + "（" + f + "）")
  }
  const boot = SRC.slice(SRC.indexOf("function fcmLsGet("), SRC.indexOf("/* ---------- 狀態"));
  assert.ok(!/\bFCM\b/.test(boot), "fcmBootGo 不碰 FCM（route 第一次叫時還沒初始化）");
  for (const l of SRC.split("\n")) if (l.length > 200) assert.ok(!/[;})]\s*\/\/ /.test(l), "長行有 // 註解：" + l.slice(0, 60));
  assert.ok(!/\r/.test(fs.readFileSync(path.join(M, "07fm-focus.js"), "utf8")));
  for (const d of ["focus-modes.md", "resume-state.md"]) {
    const a = fs.readFileSync(path.join(DB, "art", "docs", d), "utf8"), b = fs.readFileSync(path.join(LAB, "site", "data", "docs", d), "utf8");
    assert.equal(a, b, d + " 兩份一樣"); assert.ok(!/\r/.test(a), d + " 是 LF")
  }
  const F = rd(path.join(LAB, "site", "data", "docs", "focus-modes.md")); for (const k of ["Esc", "三根手指", "6 小時", "cleanUI", "bossKey", "限制"]) assert.ok(F.includes(k), "focus-modes.md 寫了 " + k);
  assert.match(rd(path.join(LAB, "site", "data", "docs", "resume-state.md")), /## 10\. 被打斷後回來/);
});
