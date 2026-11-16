// 七星加入過場（開發者 hspx 11/16；m/07pjc-joincut.js＋07pty-party.js ptyOnSolve）單元測試。不開瀏覽器：
//   用 vm 載 07pty-party.js＋07pjc-joincut.js，假的 document、Image、setTimeout（手動推時鐘），驗：
//   有過場資料的站先播再出加入卡、沒資料照舊；略過只叫一次加入卡；圖 404／一直載不到不卡住；第 2 張畫那一題的棋盤（拿不到題目也不壞）；前綴沒撞名；m.html 有 include。
// 用法：node --test xiangqi-lab/tools/test-pjc-joincut-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const PTY_SRC = rd("xiangqi-db/m/07pty-party.js"), PJC_SRC = rd("xiangqi-db/m/07pjc-joincut.js");

/* ---------- 假 DOM ---------- */
class El {
  constructor(tag, doc) { this.tagName = String(tag).toUpperCase(); this.doc = doc; this.children = []; this.parentNode = null; this.attrs = {}; this.ls = {}; this.id = ""; this.textContent = ""; this._cls = new Set();
    const st = {}; st.setProperty = (k, v) => { st[k] = v }; this.style = st;
    const me = this; this.classList = { add: (...c) => c.forEach(x => me._cls.add(x)), remove: (...c) => c.forEach(x => me._cls.delete(x)), contains: c => me._cls.has(c), toggle: (c, on) => { if (on === undefined) on = !me._cls.has(c); on ? me._cls.add(c) : me._cls.delete(c); return on } } }
  get className() { return [...this._cls].join(" ") } set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)) }
  get clientWidth() { return 0 } get clientHeight() { return 0 }
  append(...xs) { for (const x of xs) { if (x.parentNode) x.remove(); x.parentNode = this; this.children.push(x) } }
  insertBefore(x, ref) { if (x.parentNode) x.remove(); const i = this.children.indexOf(ref); x.parentNode = this; if (i < 0) this.children.push(x); else this.children.splice(i, 0, x) }
  remove() { const p = this.parentNode; if (!p) return; const i = p.children.indexOf(this); if (i >= 0) p.children.splice(i, 1); this.parentNode = null }
  get isConnected() { let e = this; while (e.parentNode) e = e.parentNode; return e === this.doc.root }
  setAttribute(k, v) { this.attrs[k] = String(v) } getAttribute(k) { return this.attrs[k] } hasAttribute(k) { return k in this.attrs }
  addEventListener(t, f) { (this.ls[t] = this.ls[t] || []).push(f) } removeEventListener(t, f) { this.ls[t] = (this.ls[t] || []).filter(x => x !== f) }
  focus() { }
  click() { let stop = false; const ev = { target: this, stopPropagation() { stop = true }, preventDefault() { } };
    for (let e = this; e && !stop; e = e.parentNode) { if (e.onclick) e.onclick(ev); for (const f of e.ls.click || []) if (!stop) f(ev) } }
  *walk() { for (const c of this.children) { yield c; yield* c.walk() } }
}
function mkDoc() {
  const doc = { ls: {} }; doc.root = new El("html", doc); doc.head = new El("head", doc); doc.body = new El("body", doc); doc.root.append(doc.head, doc.body);
  doc.createElement = t => new El(t, doc);
  doc.all = () => [...doc.root.walk()];
  doc.getElementById = id => doc.all().find(e => e.id === id) || null;
  doc.querySelector = sel => { if (!sel.startsWith(".")) throw new Error("假 DOM 只支援 .class：" + sel); const c = sel.slice(1); return doc.all().find(e => e._cls.has(c)) || null };
  doc.byCls = c => doc.all().filter(e => e._cls.has(c));
  doc.addEventListener = (t, f) => { (doc.ls[t] = doc.ls[t] || []).push(f) }; doc.removeEventListener = (t, f) => { doc.ls[t] = (doc.ls[t] || []).filter(x => x !== f) };
  return doc;
}
/* ---------- 假時鐘 ---------- */
function mkClock() {
  let now = 0, seq = 0; const q = new Map();
  const setTimeout = (f, ms) => { const id = ++seq; q.set(id, { at: now + Math.max(0, +ms || 0), f, id }); return id };
  const clearTimeout = id => { q.delete(id) };
  const tick = ms => { const end = now + ms; for (;;) { let nx = null; for (const t of q.values()) if (t.at <= end && (!nx || t.at < nx.at || (t.at === nx.at && t.id < nx.id))) nx = t; if (!nx) break; q.delete(nx.id); now = nx.at; nx.f() } now = end };
  return { setTimeout, clearTimeout, tick, get now() { return now } };
}
const flush = () => new Promise(r => setImmediate(r));

/* 建一個環境：img＝每張圖的結果（"ok"｜"404"｜"hang"），預設全 ok；pz＝cjData 給什麼（null＝沒有這題；"throw"＝抓不到） */
function env(o) {
  o = o || {};
  const doc = mkDoc(), clk = mkClock(), log = [], modals = [], boards = [];
  const img = o.img || {};
  class FakeImage { set src(u) { this._u = u; log.push("img:" + u); const k = Object.keys(img).find(n => u.includes(n)), r = k ? img[k] : "ok"; if (r === "hang") return; clk.setTimeout(() => { if (r === "ok") this.onload && this.onload(); else this.onerror && this.onerror() }, 20) } get src() { return this._u } }
  const party = { v: 1, m: { x_swordboy: { xp: 0, at: 0, how: "start" } }, pool: 0, lead: "x_swordboy", look: o.look || "x_swordboy", seen: { x_swordboy: 1 }, hint: {} };
  const db = { party };
  const store = { get: (k, d) => (k in db ? JSON.parse(JSON.stringify(db[k])) : d), set: (k, v) => { db[k] = JSON.parse(JSON.stringify(v)) } };
  const WX = { x_swordboy: { n: "齊轍", sx: "m", pc: "俥" }, x_miaogirl: { n: "駱躍梅", sx: "f", pc: "傌" }, x_shuai: { n: "沈方庭", sx: "m", pc: "帥" }, x_shi: { n: "鐵連城", sx: "m", pc: "仕" },
    x_spiritgirl: { n: "田飛燕", sx: "f", pc: "相" }, x_bing: { n: "步越溪", sx: "f", pc: "兵" }, x_martialgirl: { n: "雷借花", sx: "f", pc: "炮" } };
  const pzData = o.pz === undefined ? { "xs-han-0": { id: "xs-han-0", fen: "4ka3/4a4/9/2N6/2N6/9/8p/9/9/4K4", side: "r" } } : o.pz;
  const ctx = {
    console, Math, JSON, Date, Promise, Object, Array, String, Number, Set, Map,
    document: doc, Image: FakeImage, setTimeout: clk.setTimeout, clearTimeout: clk.clearTimeout,
    addEventListener() { }, removeEventListener() { }, innerWidth: 390, innerHeight: 844,
    matchMedia: () => ({ matches: !!o.rm }),
    store, WX_CHARS: WX, xpInfo: () => ({ L: 5, need: 100, rest: 0 }),
    esc: s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])),
    modal: (html, btns, cls) => { modals.push({ html, at: clk.now }); log.push("modal") },
    vibrate() { },
    cjData: () => pzData === "throw" ? Promise.reject(new Error("offline")) : Promise.resolve({ byId: pzData || {} }),
    parseFen: f => { const b = Array(90).fill(null); let r = 0, c = 0; for (const ch of f) { if (ch === "/") { r++; c = 0 } else if (ch >= "0" && ch <= "9") c += +ch; else { b[r * 9 + c] = ch; c++ } } return b },
    Board: (tap) => { const svg = new El("svg", doc); return { svg, draw: (b, O) => boards.push(b) } },
  };
  vm.createContext(ctx);
  vm.runInContext(PTY_SRC + "\n" + (o.noPjc ? "" : PJC_SRC) + "\n;this.__X={PTY,ptyOnSolve,ptyGet,ptyHas:typeof ptyHas==='function'?ptyHas:null,pjcPlay:typeof pjcPlay==='function'?pjcPlay:null,PJC_SC:typeof PJC_SC!=='undefined'?PJC_SC:null,pjcMeet:typeof pjcMeet==='function'?pjcMeet:null,pjcSay:typeof pjcSay==='function'?pjcSay:null};", ctx, { filename: "pty+pjc.js" });
  const X = ctx.__X;
  const pg = () => doc.getElementById("pjcPg");
  return { doc, clk, log, modals, boards, X, db, pg, sub: () => { const p = pg(); return p ? [...p.walk()].find(e => e._cls.has("pjc-sub")) : null } };
}

test("有過場資料的站（漢）：解開那一題 → 先播過場（三張、有字幕）→ 播完才出加入卡，只出一次", async () => {
  const E = env();
  E.X.ptyOnSolve("han", "xs-han-0");
  assert.ok(E.db.party.m.x_miaogirl, "加入的資料邏輯照舊：解開當下就加入");
  E.clk.tick(2400); assert.equal(E.pg(), null, "跟加入卡一樣先等 2.5 秒"); assert.equal(E.modals.length, 0);
  E.clk.tick(200); assert.ok(E.pg(), "2.5 秒後開始播過場"); assert.equal(E.modals.length, 0, "過場播的時候還沒出加入卡");
  await flush();
  const seen = new Set(), subs = [];
  for (let t = 0; t < 12000; t += 100) { E.clk.tick(100); await flush(); const p = E.pg(); if (!p) break;
    for (const e of p.walk()) if (e._cls.has("pjc-im")) seen.add(e.style.backgroundImage);
    const s = E.sub(); if (s && s.textContent && subs[subs.length - 1] !== s.textContent) subs.push(s.textContent);
    if (E.modals.length && p.classList.contains("on")) assert.fail("過場還在播就出了加入卡（淡出時才可以）") }
  assert.deepEqual([...seen], ["url(data/ptyjoin/han_j1.webp)", "url(data/ptyjoin/han_j2.webp)", "url(data/ptyjoin/han_j3.webp)"], "三張依序播");
  assert.deepEqual(subs, ["沙暴快來了，驛卒卻把她扣了下來。", "一起解開了這盤棋。", "駱躍梅：「我找不到回去的路……星槎真的會停靠元朝？那我跟你們走。」"], "三張的字幕");
  E.clk.tick(3000); await flush();
  assert.equal(E.pg(), null, "播完拿掉");
  assert.equal(E.modals.length, 1, "加入卡出一次"); assert.ok(E.modals[0].html.includes("駱躍梅加入了"), "是原本的加入卡");
  assert.ok(E.modals[0].at >= 2500 + 8000 && E.modals[0].at <= 2500 + 9500, "全長約 8 秒（加入卡在 " + E.modals[0].at + "ms）");
  E.clk.tick(30000); await flush(); assert.equal(E.modals.length, 1, "不會再出第二張");
});

test("沒有過場資料的站照舊（11/16 五個加入站都有過場了：測試時先拿掉魏晉的資料）：2.5 秒後直接出加入卡，不播過場；沒載入過場模組也照舊", async () => {
  for (const noPjc of [false, true]) {
    const E = env({ noPjc });
    if (E.X.PJC_SC) delete E.X.PJC_SC.weijin;
    E.X.ptyOnSolve("weijin", "xs-weijin-0");
    assert.ok(E.db.party.m.x_spiritgirl, "田飛燕加入");
    E.clk.tick(2600); await flush();
    assert.equal(E.pg(), null, "沒播過場"); assert.equal(E.modals.length, 1); assert.ok(E.modals[0].html.includes("田飛燕加入了"));
  }
  const E = env({ noPjc: true }); E.X.ptyOnSolve("han", "xs-han-0"); E.clk.tick(2600); await flush();
  assert.equal(E.modals.length, 1, "沒載入 07pjc：漢朝也照舊直接出加入卡");
});

test("解題結果視窗（.modal）還開著：過場先等，視窗關了才播", async () => {
  const E = env(); const m = E.doc.createElement("div"); m.className = "modal"; E.doc.body.append(m);
  E.X.ptyOnSolve("han", "xs-han-0"); E.clk.tick(6000); await flush();
  assert.equal(E.pg(), null, "視窗開著不播"); m.remove(); E.clk.tick(1600); await flush();
  assert.ok(E.pg(), "視窗關了開始播");
});

test("略過：直接結束，加入卡只叫一次（連按兩下、再點畫面也不重複）", async () => {
  const E = env();
  E.X.ptyOnSolve("han", "xs-han-0"); E.clk.tick(2600); await flush(); E.clk.tick(500); await flush();
  const p = E.pg(), k = [...p.walk()].find(e => e._cls.has("pjc-k"));
  assert.ok(k, "右上有略過鍵"); assert.equal(k.textContent, "略過");
  k.click(); k.click(); p.click(); E.clk.tick(2000); await flush();
  assert.equal(E.pg(), null, "略過後拿掉"); assert.equal(E.modals.length, 1, "加入卡只出一次");
  E.clk.tick(20000); await flush(); assert.equal(E.modals.length, 1);
});

test("直接叫 pjcPlay：onDone 只呼叫一次；點畫面跳下一張；最後一張再點就結束", async () => {
  const E = env(); let n = 0, r = null;
  const C = E.X.pjcPlay("han", ["x_miaogirl"], x => { n++; r = x });
  E.clk.tick(100); await flush(); assert.equal(C.i, 0);
  E.pg().click(); E.clk.tick(50); await flush(); assert.equal(C.i, 1, "點一下跳第 2 張");
  E.pg().click(); E.clk.tick(50); await flush(); assert.equal(C.i, 2, "再點跳第 3 張");
  E.pg().click(); E.clk.tick(1000); await flush();
  assert.equal(n, 1); assert.equal(r.skipped, false, "點完三張＝播完（不是略過）");
  C.skip(); C.next(); E.clk.tick(1000); assert.equal(n, 1, "結束後再按也不重複");
  let m = 0; assert.equal(E.X.pjcPlay("nowhere", ["x_bing"], () => m++), null, "沒有資料回 null"); E.clk.tick(10); assert.equal(m, 1, "沒有資料也會叫 onDone 一次");
});

test("圖 404：那一張跳過；三張都 404 直接結束，加入卡照出、不卡住", async () => {
  let E = env({ img: { han_j2: "404" } }); const seen = new Set(); let n = 0;
  E.X.pjcPlay("han", ["x_miaogirl"], () => n++);
  for (let t = 0; t < 12000 && E.pg(); t += 100) { E.clk.tick(100); await flush(); const p = E.pg(); if (p) for (const e of p.walk()) if (e._cls.has("pjc-im")) seen.add(e.style.backgroundImage) }
  assert.ok(!seen.has("url(data/ptyjoin/han_j2.webp)"), "第 2 張 404 不顯示"); assert.ok(seen.has("url(data/ptyjoin/han_j3.webp)"), "接著播第 3 張"); assert.equal(n, 1);

  E = env({ img: { han_j1: "404", han_j2: "404", han_j3: "404" } });
  E.X.ptyOnSolve("han", "xs-han-0"); E.clk.tick(2600); await flush(); E.clk.tick(1000); await flush();
  assert.equal(E.pg(), null, "全部 404：一秒內就結束"); assert.equal(E.modals.length, 1, "加入卡照出");

  E = env({ img: { han_j1: "hang", han_j2: "hang", han_j3: "hang" } });
  E.X.ptyOnSolve("han", "xs-han-0"); E.clk.tick(2600 + 3 * 4000 + 1000); await flush();
  assert.equal(E.pg(), null, "圖一直載不到：每張最多等 4 秒，等不到就跳過、結束"); assert.equal(E.modals.length, 1);
});

test("第 2 張：推近案面後浮出那一題（xs-han-0）起始局面的棋盤；拿不到題目就只推鏡、不壞", async () => {
  let E = env(); E.X.pjcPlay("han", ["x_miaogirl"], () => { }); await flush();
  E.clk.tick(2600 + 900); await flush(); assert.equal(E.doc.byCls("pjc-bd").length, 0, "推鏡頭的時候棋盤還沒出來");
  E.clk.tick(800); await flush();
  assert.equal(E.doc.byCls("pjc-bd").length, 1, "推近後浮出棋盤"); assert.equal(E.boards.length, 1);
  const b = E.boards[0]; assert.equal(b[4], "k"); assert.equal(b[5], "a"); assert.equal(b[13], "a"); assert.equal(b[29], "N"); assert.equal(b[38], "N"); assert.equal(b[62], "p"); assert.equal(b[85], "K");
  assert.equal(b.filter(Boolean).length, 7, "就是那一題的七顆子");
  const who = E.doc.byCls("pjc-who").map(e => e.style.backgroundImage);
  assert.ok(who.includes("url(data/xs/prev_x_miaogirl.webp)") && who.includes("url(data/xs/prev_x_swordboy.webp)"), "左下駱躍梅、右下陪你走的齊轍");

  for (const pz of [null, "throw"]) {
    E = env({ pz }); let n = 0; E.X.pjcPlay("han", ["x_miaogirl"], () => n++); await flush();
    E.clk.tick(4500); await flush(); assert.equal(E.doc.byCls("pjc-bd").length, 0, "沒有題目：不畫棋盤"); assert.ok(E.pg(), "照樣在播");
    E.clk.tick(8000); await flush(); assert.equal(n, 1, "照樣播完");
  }
});

test("陪你走的人：ptyLook；就是加入的那位時改用齊轍", async () => {
  let E = env({ look: "x_spiritgirl" }); E.db.party.m.x_spiritgirl = { xp: 0, at: 0, how: "old" };
  E.X.pjcPlay("han", ["x_miaogirl"], () => { }); E.clk.tick(2700); await flush();
  assert.ok(E.doc.byCls("pjc-who").some(e => e.style.backgroundImage.includes("x_spiritgirl")), "陪你走的是田飛燕");
  E = env(); E.X.pjcPlay("han", ["x_miaogirl"], () => { }); E.clk.tick(2700); await flush();
  assert.ok(E.doc.byCls("pjc-who").some(e => e.style.backgroundImage.includes("x_swordboy")));
});

test("減少動態：不推鏡頭（不設 transform），照樣播完", async () => {
  const E = env({ rm: true }); let n = 0; E.X.pjcPlay("han", ["x_miaogirl"], () => n++);
  for (let t = 0; t < 12000 && E.pg(); t += 100) { E.clk.tick(100); await flush(); for (const e of E.doc.byCls("pjc-im")) assert.ok(!e.style.transform, "沒有推拉") }
  assert.equal(n, 1);
});

test("字幕：第 1 張沒寫 say1 時取 PTY_MEET 最後一句（太長截短）；第 3 張是「名字：「加入那句」」", () => {
  const E = env();
  assert.equal(E.X.pjcMeet("han"), "沙暴快來了，驛卒卻把她扣了下來。");
  const m = E.X.pjcMeet("sanguo"); assert.ok(m.length > 0 && m.length <= 24, "三國：" + m);
  assert.equal(E.X.pjcSay("x_shi"), "鐵連城：「那我跟著。」");
});

test("前綴 pjc／PJC 沒撞名：只有 07pjc-joincut.js 用；這支檔的頂層名字都是 pjc／PJC 開頭", () => {
  const dir = path.join(ROOT, "xiangqi-db", "m"), hit = [];
  const strip = s => s.replace(/data:[a-z/+]+;base64,[A-Za-z0-9+/=]+/g, "");
  for (const f of fs.readdirSync(dir)) { if (!f.endsWith(".js") || f === "07pjc-joincut.js") continue; const s = strip(rd("xiangqi-db/m/" + f));
    if (/(^|[^A-Za-z0-9_$])(pjc|PJC)/.test(s.replace(/07pjc-joincut|pjcPlay|PJC_SC/g, ""))) hit.push(f) }
  assert.deepEqual(hit, [], "別的模組不該有 pjc／PJC 開頭的名字（07pty-party 只能叫 pjcPlay、PJC_SC）");
  const css = strip(rd("xiangqi-db/m.css")); assert.ok(!/pjc/i.test(css), "m.css 沒有 pjc");
  const tops = [...PJC_SRC.matchAll(/^(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  assert.ok(tops.length >= 5); for (const n of tops) assert.ok(/^(pjc|PJC)/.test(n), "頂層名字要有前綴：" + n);
  assert.ok(PTY_SRC.includes('typeof pjcPlay==="function"&&typeof PJC_SC!=="undefined"&&PJC_SC[k]'), "ptyOnSolve 先問有沒有過場");
});

test("m.html 在 07pty-party 後面 include 07pjc-joincut；規則：不寫 // 註解、畫面不出現「上限」", () => {
  const H = rd("xiangqi-db/m.html"), a = H.indexOf("//#include m/07pty-party.js"), b = H.indexOf("//#include m/07pjc-joincut.js");
  assert.ok(a >= 0 && b > a, "07pjc 在 07pty 之後"); assert.equal(H.split("//#include m/07pjc-joincut.js").length, 2, "只 include 一次");
  assert.ok(!PJC_SRC.includes("//"), "07pjc 沒有 // （一行程式插 // 會吃掉後面）");
  assert.ok(!PJC_SRC.includes("上限"), "畫面上不寫「上限」");
  /* 公開副本沒有過場圖（只在 CDN）：有 art/ptyjoin 資料夾才檢查圖檔 */
  if (fs.existsSync(path.join(ROOT, "xiangqi-db", "art", "ptyjoin"))) for (const n of ["han_j1", "han_j2", "han_j3"]) {
    assert.ok(fs.existsSync(path.join(ROOT, "xiangqi-db", "art", "ptyjoin", n + ".webp")), "art/ptyjoin/" + n + ".webp");
    assert.ok(fs.existsSync(path.join(ROOT, "xiangqi-lab", "site", "data", "ptyjoin", n + ".webp")), "site/data/ptyjoin/" + n + ".webp");
  }
  const I = rd("xiangqi-db/m/07i18n.js");
  for (const s of ["沙暴快來了，驛卒卻把她扣了下來。", "一起解開了這盤棋。", "我找不到回去的路……星槎真的會停靠元朝？那我跟你們走。", "七星加入過場"]) assert.ok(I.includes(JSON.stringify(s) + ":"), "英文字典有：" + s);
});

test("〔行為〕11/16 開發者選單「三國：兩位新夥伴主導」：PJC_SC.who 決定每張站誰（L0、L1、陪你走的人），沒寫照舊；三國資料齊全", () => {
  const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07pjc-joincut.js"), "utf8").replace(/\r\n/g, "\n");
  const a = SRC.indexOf("function pjcLook("), b = SRC.indexOf("const pjcSays=");
  const mk = look => new Function("ptyLook", SRC.slice(a, b) + ";return{pjcLook,pjcWho}")(() => look);
  const S = { who: [["L1", "L0"], ["L1", "L0"], ["L1", "L0", "mate"]] }, L = ["x_shuai", "x_shi"];
  let o = mk("x_miaogirl");
  assert.deepEqual(o.pjcWho(S, 0, "x_shuai", L), ["x_shi", "x_shuai"], "第 1 張：鐵連城擋在沈方庭前");
  assert.deepEqual(o.pjcWho(S, 2, "x_shuai", L), ["x_shi", "x_shuai", "x_miaogirl"], "第 3 張：兩人＋陪你走的人");
  o = mk("x_shi"); assert.deepEqual(o.pjcWho(S, 2, "x_shuai", L), ["x_shi", "x_shuai", "x_swordboy"], "陪你走的人剛好是新加入的：換齊轍");
  assert.equal(o.pjcWho({}, 0, "x_miaogirl", ["x_miaogirl"]), null, "沒寫 who 照舊");
  assert.ok(/sanguo:\{c:"x_shuai",img:\["sg_j1","sg_j2","sg_j3"\],say1:"赤壁火光連天，軍漢把他們當成了北邊的探子。"/.test(SRC));
  assert.ok(SRC.includes('who:pjcWho(S,2,c,L)||[c,mate],ly:LY[2],say:S.who?pjcSays(L):pjcSay(c)'), "第 3 張字幕：兩位新夥伴各一句");
  assert.ok(SRC.includes("white-space:pre-line;"), "兩句分行");
  if (fs.existsSync(path.join(__dirname, "..", "..", "xiangqi-db", "art", "ptyjoin"))) for (const n of ["sg_j1", "sg_j2", "sg_j3"]) assert.ok(fs.existsSync(path.join(__dirname, "..", "..", "xiangqi-db", "art", "ptyjoin", n + ".webp")), n);
});

test("〔原始碼〕11/16 五個加入站（漢、三國、魏晉、隋、五代）都有三張過場與第 1 張字幕，英文字幕都在", () => {
  const SRC = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07pjc-joincut.js"), "utf8");
  const I18 = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07i18n.js"), "utf8");
  for (const [k, c, p] of [["han", "x_miaogirl", "han"], ["sanguo", "x_shuai", "sg"], ["weijin", "x_spiritgirl", "wj"], ["sui", "x_bing", "sui"], ["wudai", "x_martialgirl", "wd"]]) {
    const pre = k + ':{c:"' + c + '",img:["' + p + '_j1","' + p + '_j2","' + p + '_j3"],say1:"', at = SRC.indexOf(pre);
    const m = at < 0 ? null : [null, SRC.slice(at + pre.length, SRC.indexOf('"', at + pre.length))];
    assert.ok(m, k + " 三張與字幕"); assert.ok(I18.includes('"' + m[1] + '":'), k + " 第 1 張字幕有英文");
    if (fs.existsSync(path.join(__dirname, "..", "..", "xiangqi-db", "art", "ptyjoin"))) for (const n of [1, 2, 3]) assert.ok(fs.existsSync(path.join(__dirname, "..", "..", "xiangqi-db", "art", "ptyjoin", p + "_j" + n + ".webp")), p + "_j" + n);
  }
});
