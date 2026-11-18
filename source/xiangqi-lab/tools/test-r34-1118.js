// 11/18 下一版（0556 之後）：七星串門子改成「你去下一盤，我在旁邊看」＋本命子提示；稱呼照「隨行」那位（ptyLook）；「帶誰出門」全站改叫「隨行」；
//   夥伴加入卡關掉後到回星槎頁之間的小轉場（07pty ptyJoinTrans）。
// 不開瀏覽器：vm 跑 07j-visit.js 整檔、07pty 轉場片段、07i18n PURE 區段（只用內建，不靠外掛字典），假 DOM、假時鐘。實際畫面、引擎提示的手感要測試員實機看。
// 用法：node --test xiangqi-lab/tools/test-r34-1118.js
"use strict";
const assert = require("node:assert/strict"), test = skipMissing(require("node:test")), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
/* 公開副本（ROOT 有 STAGE-MANIFEST.json）缺檔的子測試照實標略過；開發者電腦上缺檔照樣失敗（同 test-r33-1118.js） */
const PUB = fs.existsSync(path.join(ROOT, "STAGE-MANIFEST.json"));
function skipMissing(t0) {
  const w = (name, opt, fn) => { if (typeof opt === "function") { fn = opt; opt = undefined }
    const run = async t => { try { return await fn(t) } catch (e) { if (PUB && e && e.code === "ENOENT") { t.skip("缺檔（公開副本不含）：" + e.path); return } throw e } };
    return opt ? t0(name, opt, run) : t0(name, run) };
  return Object.assign(w, t0) }
const rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const M = f => rd("xiangqi-db/m/" + f);
const between = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "切不到：" + a.slice(0, 40)); return s.slice(i, j) };
const ALL = ["x_swordboy", "x_spiritgirl", "x_martialgirl", "x_miaogirl", "x_shuai", "x_shi", "x_bing"];
const WX = { x_swordboy: { n: "齊轍", nk: "阿轍", sx: "m", pc: "俥" }, x_spiritgirl: { n: "田飛燕", nk: "燕子", sx: "f", pc: "相" }, x_martialgirl: { n: "雷借花", nk: "花兒", sx: "f", pc: "炮" },
  x_miaogirl: { n: "駱躍梅", nk: "小梅", sx: "f", pc: "傌" }, x_shuai: { n: "沈方庭", nk: "方庭", sx: "m", pc: "帥" }, x_shi: { n: "鐵連城", nk: "城子", sx: "m", pc: "仕" }, x_bing: { n: "步越溪", nk: "溪兒", sx: "f", pc: "兵" } };

/* 假時鐘 */
function clock() { const C = { t: 1e12, q: [], id: 0 };
  C.set = (f, ms) => { const id = ++C.id; C.q.push({ id, at: C.t + (+ms || 0), f }); return id };
  C.clear = id => { C.q = C.q.filter(x => x.id !== id) };
  C.tick = ms => { const end = C.t + ms; for (;;) { C.q.sort((a, b) => a.at - b.at || a.id - b.id); const x = C.q[0]; if (!x || x.at > end) break; C.q.shift(); C.t = x.at; x.f() } C.t = end };
  return C }
/* 假 DOM：夠 07j 泡泡、07pty 轉場用就好 */
function dom() {
  class El { constructor(tag) { this.tag = tag; this.children = []; this.parent = null; this.style = {}; this.attrs = {}; this.id = ""; this._cls = new Set(); this.textContent = ""; this._html = ""; this.rect = null;
      const me = this; this.classList = { add: (...a) => a.forEach(x => me._cls.add(x)), remove: (...a) => a.forEach(x => me._cls.delete(x)), contains: x => me._cls.has(x), toggle: (x, on) => (on ?? !me._cls.has(x)) ? me._cls.add(x) : me._cls.delete(x) } }
    set className(v) { this._cls = new Set(String(v).split(/\s+/).filter(Boolean)) } get className() { return [...this._cls].join(" ") }
    set innerHTML(v) { this._html = String(v) } get innerHTML() { return this._html }
    get offsetHeight() { return 60 } get offsetWidth() { return 200 }
    get isConnected() { let e = this; while (e.parent) e = e.parent; return e === D.root }
    append(...a) { for (const c of a) { if (c.parent) c.remove(); c.parent = this; this.children.push(c) } }
    remove() { if (!this.parent) return; this.parent.children = this.parent.children.filter(x => x !== this); this.parent = null }
    setAttribute(k, v) { this.attrs[k] = String(v); if (k === "id") this.id = String(v) } getAttribute(k) { return this.attrs[k] ?? null }
    getBoundingClientRect() { return this.rect || { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 } }
    *walk() { for (const c of this.children) { yield c; yield* c.walk() } }
    match(sel) { return sel.split(",").some(s => { s = s.trim(); const last = s.split(/\s+/).pop(); return last[0] === "#" ? this.id === last.slice(1) : last[0] === "." ? last.slice(1).split(".").every(c => this._cls.has(c)) : this.tag === last }) }
    querySelector(sel) { for (const e of this.walk()) if (e.match(sel)) return e; return null }
    querySelectorAll(sel) { return [...this.walk()].filter(e => e.match(sel)) }
    click() { if (this.onclick) this.onclick({ stopPropagation() {} }) } }
  const D = {}; D.root = new El("html"); D.head = new El("head"); D.body = new El("body"); D.root.append(D.head, D.body);
  D.doc = { head: D.head, body: D.body, documentElement: D.root, createElement: t => new El(t), getElementById: id => D.root.querySelector("#" + id), querySelector: s => D.root.querySelector(s), querySelectorAll: s => D.root.querySelectorAll(s) };
  D.El = El; return D }

/* ---------- 07j-visit.js 整檔丟進 vm ---------- */
function visit(o) { o = o || {}; const C = clock(), D = dom(), db = Object.assign({}, o.db || {}), says = [], calls = [], shows = [];
  const ctx = { WX_CHARS: WX, store: { get: (k, d) => (k in db ? JSON.parse(JSON.stringify(db[k])) : d), set: (k, v) => { db[k] = JSON.parse(JSON.stringify(v)) } },
    myChar: () => o.my || "x_swordboy", ptyLook: () => o.look || "x_swordboy", ptyHas: c => !o.joined || o.joined.includes(c), localDay: () => "d1",
    CHAR_ERA: {}, SHIP_STOP: {}, shipDocked: () => ["qin", "nanbei", "song", "yuan", "ming", "tang", "qing"], journey: () => ({}), shipAppr: () => false,
    document: D.doc, innerWidth: 390, innerHeight: 844, esc: s => String(s), vibrate() {}, toast: s => says.push(["toast", s]), axSay: s => says.push(["ax", s]),
    setTimeout: C.set, clearTimeout: C.clear, Date: { now: () => C.t }, Math: Object.assign(Object.create(Math), { random: o.rnd || (() => 0) }),
    window: { XQCore: { parseSq: s => ("abcdefghi".indexOf(s[0])) + (9 - +s[1]) * 9 } },
    api: async (p, b) => { calls.push([p, b]); if (o.apiFail) throw new Error("x"); return o.api ? o.api(b) : { lines: [] } } };
  vm.createContext(ctx); vm.runInContext(M("07j-visit.js") + ";this.X={V7,V7_CALL,v7Txt,v7Call,v7Mate,v7Pick,v7HGrade,v7HMode,v7HPre,v7HJudge,v7HWho,v7Watch,v7Say,V7H_PC,V7H_P,V7H_MAX,V7H_GAP,V7H_MIN,V7H_SHOW,V7H_DLY,set rnd(f){V7H_RND=f}}", ctx);
  return { X: ctx.X, ctx, C, D, db, says, calls, shows } }
const flush = () => new Promise(r => setImmediate(r));

test("稱呼照「隨行」那位（ptyLook）：小梅隨行＝「小梅」／妳；齊轍隨行＝「阿轍」／你；換隨行後馬上跟著換；小梅叫燕子「燕子姊姊」、大家叫方庭「方庭」", () => {
  let E = visit({ look: "x_miaogirl", my: "x_swordboy" });
  assert.equal(E.X.v7Mate(), "x_miaogirl", "隨行＝ptyLook，不是 myChar");
  assert.equal(E.X.v7Txt("{名}，{你}好", "x_swordboy"), "小梅，妳好");
  assert.equal(E.X.v7Txt("{名}，{你}好", "x_shi"), "小梅，妳好");
  E = visit({ look: "x_swordboy" });
  for (const c of ALL.filter(x => x !== "x_swordboy")) assert.equal(E.X.v7Txt("{名}，{你}好", c), "阿轍，你好", c);
  E = visit({ look: "x_spiritgirl" }); assert.equal(E.X.v7Txt("{名}，{你}好", "x_miaogirl"), "燕子姊姊，妳好"); assert.equal(E.X.v7Txt("{名}", "x_bing"), "燕子", "表裡沒有的叫小名");
  E = visit({ look: "x_shuai" }); assert.equal(E.X.v7Txt("{名}，{你}", "x_shi"), "方庭，你");
  /* 換隨行：同一個環境裡 ptyLook 換人，下一句就換 */
  let look = "x_swordboy"; E = visit({}); E.ctx.ptyLook = () => look;
  const q = E.X.V7.x_shi.q.find(x => x.t === "play");
  const a = E.X.v7Txt(q.hi, "x_shi"); look = "x_miaogirl"; const b = E.X.v7Txt(q.hi, "x_shi");
  assert.ok(a.startsWith("阿轍") && a.includes("看你下棋"), a); assert.ok(b.startsWith("小梅") && b.includes("看妳下棋"), b);
});

test("台詞不寫死稱呼：V7 每一句（閒聊、請託各欄、本命子提示）沒有「妳」、沒有直接叫小名（要叫人一律 {名}）", () => {
  const { X } = visit({}), NK = ["阿轍", "燕子", "花兒", "小梅", "方庭", "城子", "溪兒", "燕子姊姊", "齊轍", "駱躍梅"];
  const voc = new RegExp("(^|[。！？……—])(" + NK.join("|") + ")[，！。]");
  let n = 0;
  for (const c of ALL) { const V = X.V7[c], all = V.l.map(x => x[0]).concat(V.h || []);
    for (const q of V.q) for (const k of ["hi", "ask", "yes", "no", "wait", "thx"]) if (q[k]) all.push(q[k]);
    for (const s of all) { n++; assert.ok(!s.includes("妳"), c + "：寫死「妳」：" + s); assert.ok(!voc.test(s), c + "：直接叫小名（要用 {名}）：" + s) } }
  assert.ok(n > 100, "句數 " + n);
});

test("「去下一盤，我在旁邊看」：七位都有 play 請託（問候 hi、邀約 ask、答應 yes、婉拒 no、wait、thx 齊全）、邀約都說「在旁邊看」；本命子提示每位至少 2 句；問候、邀約有叫人", () => {
  const { X } = visit({});
  for (const c of ALL) { const q = X.V7[c].q.find(x => x.t === "play"); assert.ok(q, c + " 沒有 play 請託");
    for (const k of ["hi", "ask", "yes", "no", "wait", "thx"]) assert.ok(q[k] && q[k].length > 1, c + " 缺 " + k);
    assert.ok(/旁邊/.test(q.ask) && /看/.test(q.ask) && /^去下一盤/.test(q.ask), c + " 邀約：" + q.ask); assert.ok(q.hi.includes("{名}"), c + " 問候要叫隨行的人");
    assert.ok((X.V7[c].h || []).length >= 2, c + " 提示句"); assert.ok(!/陪我下一盤/.test(q.ask), "不再是「陪我下一盤」") }
  /* 本命子提示只講自己那顆子、不說落點（不寫「到／進到／第幾路」之類） */
  for (const c of ALL) for (const h of X.V7[c].h) { assert.ok(h.includes(WX[c].pc) || h.includes({ 傌: "馬", 俥: "車" }[WX[c].pc] || "\u0000"), c + " 提示要講本命子「" + WX[c].pc + "」：" + h); assert.ok(!/[一二三四五六七八九]路|進到|走到[^了]/.test(h), "不說落點：" + h) }
});

test("來串門子的人永遠不是隨行那位（換誰隨行都一樣）；myChar 跟 ptyLook 不同時照 ptyLook", () => {
  for (const look of ALL) for (let k = 0; k < 30; k++) {
    const seq = [0, k / 30, (k * 7 % 30) / 30, 0.5]; let i = 0;
    const E = visit({ look, my: "x_swordboy", rnd: () => seq[i++ % seq.length] });
    const P = E.X.v7Pick({ day: {}, last: 0, seen: {}, n: {}, done: {} }, "han", "");
    if (P) assert.notEqual(P.c, look, "隨行 " + look + " 自己來串門子");
  }
  const E = visit({ look: "x_miaogirl", my: "x_swordboy", rnd: () => 0 }); const seen = new Set();
  for (let k = 0; k < 7; k++) { E.ctx.Math.random = (() => { let n = 0; return () => (n++ === 0 ? 0 : k / 7) })(); const P = E.X.v7Pick({ day: {}, last: 0, seen: {}, n: {}, done: {} }, "han", ""); if (P) seen.add(P.c) }
  assert.ok(seen.has("x_swordboy"), "齊轍不是隨行時也會來：" + [...seen]); assert.ok(!seen.has("x_miaogirl"));
});

test("答應、婉拒那一句：toast「城子：「嗯。我站旁邊。」」，稱呼照隨行；沒寫就不說", () => {
  const E = visit({ look: "x_miaogirl" }); const q = E.X.V7.x_martialgirl.q.find(x => x.t === "play");
  E.X.v7Say("x_martialgirl", q.yes); E.X.v7Say("x_shi", ""); E.X.v7Say("x_shi", E.X.V7.x_shi.q.find(x => x.t === "play").yes);
  assert.deepEqual(E.says, [["toast", "花兒：「好！我站妳後面，不吵——盡量不吵！」"], ["toast", "城子：「嗯。我站旁邊。」"]]);
  const S = M("07j-visit.js"); assert.ok(S.includes("closeSheet();v7Say(c,nx.yes);setTimeout(()=>v7Go(nx),240)") && S.includes('on("#v7No",()=>{closeSheet();v7Say(c,nx.no)})'), "接了說 yes、下次吧說 no");
  assert.ok(S.includes("nq&&nq.hi?nq.hi:v7Line(c,S,here)"), "這趟要請下棋的：泡泡先問候 hi");
});

test("本命子提示・判斷（純函式）：評等、本命子、40% 機率、一盤 3 次、隔 4 步、開局先 3 步", () => {
  const { X } = visit({});
  assert.deepEqual({ ...X.V7H_PC }, { 帥: "K", 仕: "A", 相: "B", 傌: "N", 俥: "R", 炮: "C", 兵: "P" });
  assert.equal(X.V7H_P, .4); assert.equal(X.V7H_MAX, 3); assert.equal(X.V7H_GAP, 4); assert.equal(X.V7H_MIN, 3); assert.equal(X.V7H_SHOW, 4000);
  const L = (a, b) => [{ pvm: ["h2e2"], vr: a, mate: null }].concat(b == null ? [] : [{ pvm: ["b0c2"], vr: b, mate: null }]);
  assert.equal(X.v7HGrade(L(30, -200)), "妙著"); assert.equal(X.v7HGrade(L(30, 0)), "正著"); assert.equal(X.v7HGrade(L(30)), "正著");
  assert.equal(X.v7HGrade([]), null); assert.equal(X.v7HGrade([{ pvm: [] }]), null);
  assert.equal(X.v7HGrade([{ pvm: ["a0a1"], mate: 3 }, { pvm: ["b0b1"], vr: 50, mate: null }]), "妙著", "只有這步殺得到");
  const ok = { ok: true, n: 5, k: 0, at: null, r: .1, q: "正著", pc: "A", want: "A" };
  assert.ok(X.v7HJudge(ok)); assert.ok(X.v7HJudge({ ...ok, q: "妙著" }));
  for (const [d, why] of [[{ q: "穩著" }, "穩著不提示"], [{ q: null }, "算不出"], [{ pc: "R" }, "不是本命子"], [{ pc: "" }, "空格"], [{ r: .4 }, "40% 以外"], [{ r: .99 }, "沒抽中"],
    [{ n: 2 }, "開局先走滿 3 步"], [{ k: 3 }, "一盤最多 3 次"], [{ at: 3 }, "隔不到 4 步（5-3）"], [{ ok: false }, "這種盤不行"]]) assert.equal(X.v7HJudge({ ...ok, ...d }), false, why);
  assert.ok(X.v7HJudge({ ...ok, n: 7, at: 3 }), "隔 4 步就可以"); assert.ok(X.v7HJudge({ ...ok, r: .399 }));
  assert.ok(X.v7HPre({ ok: true, n: 3, k: 2, at: null, r: 0 }) && !X.v7HPre({ ok: true, n: 3, k: 2, at: null, r: .5 }), "先抽再問引擎（省電）");
  /* 模式：練功房、快速對局（挑戰電腦不算段位）、園子；晉級賽、錯棋重練、擂台、盲棋、其他旅程都不行 */
  assert.ok(X.v7HMode({ kind: "cpu" }) && X.v7HMode({}) && X.v7HMode({ journey: "park" }));
  for (const st of [{ ranked: true }, { kind: "cpu", ranked: 1 }, { practice: true }, { arena: "tang" }, { blind: true }, { journey: "bh:x" }, { journey: "char:x_shi" }, { journey: "inn" }, { kind: "practice" }, { result: "1-0" }, null])
    assert.equal(X.v7HMode(st), false, JSON.stringify(st));
});

/* 對局：城子（仕）接了請託、齊轍隨行 */
const ST = (o) => Object.assign({ id: "g1", human: "r", turn: "r", moves: ["a", "b", "c", "d"], board: (() => { const b = Array(90).fill(null); b[86] = "A"; b[85] = "R"; return b })(), kind: "cpu" }, o || {});
const DB = (q) => ({ visit7: { n: {}, day: {}, seen: {}, done: {}, q: Object.assign({ c: "x_shi", id: "play", t: "play", k: null, tail: "g:old", at: 1 }, q || {}) }, xpKeys: { "g:old": 1 } });
const LINES = mv => () => ({ lines: [{ pvm: [mv], vr: 20, mate: null }, { pvm: ["a0a1"], vr: 10, mate: null }] });

test("本命子提示・對局中：接了請託的那盤、輪到你、評為正著而且動的是本命子 → 只亮那顆子（不給落點）＋小頭像泡泡＋讀螢幕；4 秒淡出、點一下關", async () => {
  /* 仕在 86（e0 → parseSq("e0")=4+81=85? 這裡用 f0：5+81=86） */
  const E = visit({ look: "x_swordboy", db: DB(), api: LINES("f0e1") }); E.X.rnd = () => 0;
  const st = ST(), shows = [];
  E.X.v7Watch(st, () => null, h => { shows.push(h); return true });
  assert.equal(E.calls.length, 0, "先錯開電腦思考（延遲）才問引擎"); E.C.tick(E.X.V7H_DLY); await flush(); await flush();
  assert.equal(E.calls.length, 1); assert.equal(E.calls[0][0], "/an/engine"); assert.ok(E.calls[0][1].ms <= 1000 && E.calls[0][1].multipv === 2, "短時間、兩條");
  assert.deepEqual(shows.map(x => ({ ...x })), [{ id: "g1", f: 86, t: null, n: 4 }], "只給本命子那格，不給落點");
  const el = E.D.doc.querySelector(".v7h"); assert.ok(el, "泡泡"); assert.ok(el.innerHTML.includes("prev_x_shi.webp") && el.innerHTML.includes("城子"), "小頭像＋名字");
  assert.ok(E.says.some(([k, s]) => k === "ax" && /^城子：「/.test(s)), "讀螢幕念一次");
  assert.ok(E.X.V7.x_shi.h.some(h => el.innerHTML.includes(h.replace("{名}", "阿轍"))), "台詞照隨行（阿轍）叫");
  E.C.tick(4000); assert.ok(el._cls.has("out"), "4 秒淡出"); E.C.tick(500); assert.equal(E.D.doc.querySelector(".v7h"), null);
  assert.deepEqual(E.db.v7h, { id: "g1", k: 1, at: 4 }, "記這盤提示過幾次、上次在第幾步");
  /* 點一下就關 */
  const E2 = visit({ look: "x_swordboy", db: DB(), api: LINES("f0e1") }); E2.X.rnd = () => 0; E2.X.v7Watch(ST(), () => null, () => true); E2.C.tick(800); await flush(); await flush();
  const b = E2.D.doc.querySelector(".v7h"); b.click(); assert.ok(b._cls.has("out"), "點一下關");
});

test("本命子提示・不出聲的情況：不是本命子、沒抽中、晉級賽、沒接請託、請託做完了、請託人就是隨行、輪到電腦、分析失敗、同一局面不重問；一盤最多 3 次、隔 4 步", async () => {
  const run = async (o, st, rnd) => { const E = visit(Object.assign({ look: "x_swordboy", db: DB(), api: LINES("f0e1") }, o)); E.X.rnd = rnd || (() => 0); const S = [];
    E.X.v7Watch(ST(st), () => null, h => { S.push(h); return true }); E.C.tick(800); await flush(); await flush(); return { E, S } };
  assert.equal((await run({ api: LINES("g0g1") })).S.length, 0, "動的是俥（85? g0＝6+81=87 空格）不是仕");
  assert.equal((await run({ api: LINES("e0e1") })).S.length, 0, "e0 是俥：不是本命子");
  let r = await run({}, {}, () => .5); assert.equal(r.S.length, 0); assert.equal(r.E.calls.length, 0, "沒抽中就不問引擎");
  r = await run({}, { ranked: true }); assert.equal(r.S.length + r.E.calls.length, 0, "晉級賽");
  r = await run({}, { practice: true }); assert.equal(r.S.length + r.E.calls.length, 0, "錯棋重練");
  r = await run({}, { journey: "park" }); assert.equal(r.S.length, 1, "園子可以");
  r = await run({ db: { visit7: { n: {}, day: {}, seen: {}, done: {} } } }); assert.equal(r.E.calls.length, 0, "沒接請託");
  r = await run({ db: Object.assign(DB(), { xpKeys: { "g:old": 1, "g:new": 1 } }) }); assert.equal(r.E.calls.length, 0, "請託已經做到（下完一盤）");
  r = await run({ db: DB({ t: "pz" }) }); assert.equal(r.E.calls.length, 0, "接的是解題請託");
  r = await run({ look: "x_shi" }); assert.equal(r.E.calls.length, 0, "請託人就是隨行那位");
  r = await run({}, { turn: "b" }); assert.equal(r.E.calls.length, 0, "輪到電腦");
  r = await run({}, { moves: ["a", "b"] }); assert.equal(r.E.calls.length, 0, "開局還沒走滿 3 步");
  r = await run({ apiFail: true }); assert.equal(r.S.length, 0, "分析失敗＝不提示"); assert.equal(r.E.D.doc.querySelector(".v7h"), null);
  /* 局面已經變了（show 回 false）＝不說、不記 */
  { const E = visit({ look: "x_swordboy", db: DB(), api: LINES("f0e1") }); E.X.rnd = () => 0; E.X.v7Watch(ST(), () => null, () => false); E.C.tick(800); await flush(); await flush();
    assert.equal(E.D.doc.querySelector(".v7h"), null); assert.equal(E.db.v7h, undefined) }
  /* 同一局面只問一次；次數、間隔 */
  const E = visit({ look: "x_swordboy", db: DB(), api: LINES("f0e1") }); E.X.rnd = () => 0; const S = [];
  const go = async n => { E.X.v7Watch(ST({ moves: Array(n).fill("m") }), () => null, h => { S.push(h.n); return true }); E.C.tick(800); await flush(); await flush() };
  await go(4); await go(4); assert.deepEqual(S, [4], "同一局面不重問"); assert.equal(E.calls.length, 1);
  await go(6); assert.deepEqual(S, [4], "隔 2 步不行"); await go(8); await go(10); await go(12); await go(16); await go(20);
  assert.deepEqual(S, [4, 8, 12], "隔 4 步、一盤最多 3 次");
  await go(24); assert.deepEqual(S, [4, 8, 12]);
  E.X.v7Watch(ST({ id: "g2", moves: Array(4).fill("m") }), () => null, h => { S.push(h.n); return true }); E.C.tick(800); await flush(); await flush(); assert.deepEqual(S, [4, 8, 12, 4], "新的一盤重新算");
});

test("08b 接點：畫好棋盤後叫 v7Watch；亮子只給 f（t:null）、局面不對回 false；完成條件、修為不動", () => {
  const B = M("08b-cpugame.js");
  assert.ok(B.includes('try{if(typeof v7Watch==="function")v7Watch(st,()=>bd.svg,h=>{if(!st||st.id!==h.id||st.moves.length!==h.n||st.result||st.turn!==st.human)return false;pHint={f:h.f,t:null,n:h.n};draw();return true})}catch(e){}'));
  const S = M("07j-visit.js"); assert.ok(S.includes('const V7_PFX={play:["g:"],pz:["cj:","ship:"]}') && S.includes("addXP(V7_XP,\"羈絆\",`v7:${c}:${id}`)"), "完成條件、謝禮照舊");
  assert.ok(!/v7Watch[\s\S]{0,4000}addXP\(/.test(between(S, "function v7Watch(", "function v7HLine(")), "提示不加修為");
});

/* ---------- 英文（只用內建，不靠外掛字典） ---------- */
function i18n() { const S = M("07i18n.js"), a = S.indexOf("#I18N-PURE-BEGIN"), b = S.indexOf("/* #I18N-PURE-END */"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(S.slice(S.indexOf("\n", a) + 1, b) + ";this.R={i18nText}", ctx); return ctx.R }
const CJK = /[㐀-鿿]/;
test("英文同步（內建）：七位每一句新台詞（問候、邀約、答應、婉拒、wait、thx、提示）× 隨行的七種叫法 × 你／妳 都翻得出；toast、讀螢幕「名字：「…」」、包在「」裡也翻得出", () => {
  const R = i18n(), { X } = visit({}), NK = ["阿轍", "燕子", "花兒", "小梅", "方庭", "城子", "溪兒", "燕子姊姊"]; let n = 0;
  for (const c of ALL) { const q = X.V7[c].q.find(x => x.t === "play"), L = ["hi", "ask", "yes", "no", "wait", "thx"].map(k => q[k]).concat(X.V7[c].h);
    for (const s of L) for (const nm of NK) for (const you of ["你", "妳"]) { const z = s.replace(/\{名\}/g, nm).replace(/\{你\}/g, you);
      for (const w of [z, "「" + z + "」", WX[c].nk + "：「" + z + "」"]) { const e = R.i18nText(w); assert.ok(e != null && !CJK.test(e), w + " → " + e); assert.ok(!/[“”‘’]/.test(e), "不用彎引號：" + e); n++ } } }
  assert.ok(n > 2000, "句數 " + n);
  assert.equal(R.i18nText("阿轍，這一步，讓俥直直走出去。"), "A-Zhe, this move: send the Chariot straight out.");
  assert.equal(R.i18nText("城子：「嗯。我站旁邊。」"), "Chengzi: \"Mm. I'll stand beside you.\"");
  assert.equal(R.i18nText("👀 城子"), "👀 Chengzi");
});

test("「帶誰出門」全站改叫「隨行」：卡冊按鈕、標籤、toast、說明、加入卡、設定頁那句；英文內建；畫面上的字不再有「陪你走」「帶他／她出門」", () => {
  const P = M("07pty-party.js"), S5 = M("05-settings.js"), R = i18n();
  assert.ok(P.includes('<span class="pty-tag look">隨行中</span>') && P.includes('data-a="look">設為隨行</button>'));
  assert.ok(P.includes('toast(WX_CHARS[c].n+"現在跟著你")') && P.includes('[["設為隨行",') && P.includes('toast("🚶 "+ptyNm(c)+"現在跟著你")'));
  assert.ok(P.includes("「隨行」是首頁上跟著你的那一位；來串門子的人也會找他說話。") && P.includes("卡冊可以換隨行的人"));
  assert.ok(S5.includes("跟著首頁的隨行夥伴（現在是"));
  const vis = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/[^\n]*/g, "$1");
  for (const [f, s] of [["07pty-party.js", P], ["05-settings.js", S5], ["07j-visit.js", M("07j-visit.js")]]) assert.ok(!/陪你走|帶[他她]出門|帶他們出門|帶"\+ptyTa\(L\)\+"出門|帶\$\{ptyTa\(c\)\}出門/.test(vis(s)), f + " 畫面上還有舊說法");
  const W = { 駱躍梅: "Luo Yuemei", 齊轍: "Qi Zhe", 沈方庭: "Shen Fangting", 鐵連城: "Tie Liancheng", 田飛燕: "Tian Feiyan", 步越溪: "Bu Yuexi", 雷借花: "Lei Jiehua" };
  for (const [zh, en] of Object.entries(W)) { assert.equal(R.i18nText(zh + "現在跟著你"), en + " is with you now"); assert.equal(R.i18nText("🚶 " + zh + "現在跟著你"), "🚶 " + en + " is with you now") }
  assert.equal(R.i18nText("設為隨行"), "Set as companion"); assert.equal(R.i18nText("隨行中"), "Your companion");
  assert.ok(/companion/.test(R.i18nText("下棋、解題、黑洞過關得到的修為，一半自動分給隊上每一位，另一半變成星輝，由你分給想練的人。黑洞裡全隊已學會的招都會帶上場；「隨行」是首頁上跟著你的那一位；來串門子的人也會找他說話。")));
  for (const pc of ["俥", "傌", "炮", "相", "帥", "仕", "兵"]) for (const nm of Object.keys(W)) assert.ok(!CJK.test(R.i18nText("本命棋子「" + pc + "」跟著首頁的隨行夥伴（現在是" + nm + "）。") || "中"));
  for (const t of ["他", "她", "他們"]) assert.ok(!CJK.test(R.i18nText(t + "的招式黑洞裡就能帶；在「雲河七星」卡冊可以換隨行的人，也可以分星輝給" + t + "。") || "中"), "加入卡下面那行");
});

/* ---------- 07pty 加入後的小轉場 ---------- */
function trans(o) { o = o || {}; const C = clock(), D = dom(), says = [], loc = { hash: o.hash || "#/canju/s/han/xs-han-0" };
  const view = new D.El("div"); view.id = "view"; D.body.append(view); const page = new D.El("div"); page.className = "shp-page cq"; page.rect = { left: 0, top: 100, width: 390, height: 500, right: 390, bottom: 600 }; view.append(page);
  const bot = new D.El("div"); bot.className = "xqbot"; bot.rect = { left: 300, top: 600, width: 60, height: 100, right: 360, bottom: 700 }; D.body.append(bot);
  const ctx = { document: D.doc, location: loc, setTimeout: C.set, clearTimeout: C.clear, Date: { now: () => C.t }, innerWidth: 390, innerHeight: 844, esc: s => String(s), axSay: s => says.push(s),
    matchMedia: q => ({ matches: !!o.rm && /reduced-motion/.test(q) }), MODAL_HOLD: 0,
    PTY_SAY: { x_miaogirl: "我找不到回去的路……星槎真的會停靠元朝？那我跟你們走。" }, ptyNm: c => ({ x_miaogirl: "駱躍梅" })[c] || c };
  vm.createContext(ctx); vm.runInContext("var MODAL_HOLD=0;" + between(M("07pty-party.js"), "const PTY_TR=", "/* ③ 起航閘門") + ";this.X={ptyJoinTrans,ptyTrBusy,PTY_TR,get on(){return PTY_TR_ON}}", ctx);
  return { X: ctx.X, ctx, C, D, loc, says, ov: () => D.doc.getElementById("ptyTr"), fx: () => D.doc.querySelectorAll(".ptr-star,.ptr-say") } }

test("轉場：加入卡兩顆按鈕關掉都會叫 ptyJoinTrans（設為隨行帶 look）；07mnq 自動跳授印禮會等 #ptyTr", () => {
  const P = M("07pty-party.js");
  assert.ok(P.includes('[["設為隨行",()=>{const ok=ptySetLook(c);if(ok)try{toast("🚶 "+ptyNm(c)+"現在跟著你")}catch(e){}ptyJoinTrans(c,{look:ok})}],["好",()=>ptyJoinTrans(c,{look:false}),true]],"prolog")'));
  assert.ok(M("07mnq-mainquest.js").includes(".qp-ov,#stqPg,#ptyTr,.ptr-say\")"), "mnqIdle 看 #ptyTr");
});

test("轉場・完整播：0.4 秒蓋上（開頭畫面同色、蓋著時 xqt-on）→ 換到星槎頁 → 0.6 秒淡開 → 星光＋加入那句泡泡（2.5 秒淡出）→ 約 1.5 秒結束、確實在星槎頁；播放中 modal 排隊", () => {
  const E = trans(); let done = null; const R = E.X.ptyJoinTrans("x_miaogirl", { look: false, done: r => { done = r } });
  assert.ok(E.ov() && E.D.body._cls.has("xqt-on"), "蓋上、開頭畫面記號（其他視窗都等這個）"); assert.ok(E.ctx.MODAL_HOLD >= E.C.t + 1500, "整段 modal 排隊"); assert.ok(E.X.ptyTrBusy());
  assert.equal(E.X.ptyJoinTrans("x_miaogirl"), R, "播放中再叫不重播");
  E.C.tick(30); assert.ok(E.ov()._cls.has("on"), "開始淡成底色"); assert.equal(E.loc.hash, "#/canju/s/han/xs-han-0", "還沒蓋滿不換頁");
  E.C.tick(370); assert.equal(E.loc.hash, "#/adventure", "0.4 秒蓋滿換到星槎頁"); assert.ok(!E.D.body._cls.has("xqt-on"));
  E.C.tick(120); assert.ok(E.ov()._cls.has("in"), "淡開"); assert.equal(R.fx, true);
  const st = E.D.doc.querySelector(".ptr-star"), sy = E.D.doc.querySelector(".ptr-say"); assert.ok(st && sy, "星光＋泡泡");
  assert.equal(st.style.left, "195px", "沒設隨行：在星槎圖中間"); assert.ok(sy.innerHTML.includes("我找不到回去的路") && sy.innerHTML.includes("駱躍梅") && sy.innerHTML.includes("prev_x_miaogirl"));
  assert.ok(E.says.some(s => s.startsWith("駱躍梅：「我找不到")), "讀螢幕念加入那句");
  E.C.tick(980); assert.equal(E.ov(), null, "約 1.5 秒結束"); assert.ok(done && done.end && !done.skip); assert.equal(E.X.ptyTrBusy(), false); assert.equal(E.loc.hash, "#/adventure");
  assert.ok(E.D.doc.querySelector(".ptr-say"), "泡泡還在（2.5 秒）"); E.C.tick(1550); assert.ok(E.D.doc.querySelector(".ptr-say")._cls.has("out"), "2.5 秒淡出"); E.C.tick(500); assert.equal(E.D.doc.querySelector(".ptr-say"), null);
  /* 已經在星槎頁：不重設網址 */
  const E2 = trans({ hash: "#/adventure" }); let set = 0; Object.defineProperty(E2.loc, "hash", { get: () => "#/adventure", set: () => { set++ } });
  E2.X.ptyJoinTrans("x_miaogirl"); E2.C.tick(1600); assert.equal(set, 0, "已在星槎頁不換頁");
});

test("轉場・設為隨行：星光和泡泡在首頁小人（.xqbot）那裡", () => {
  const E = trans(); E.X.ptyJoinTrans("x_miaogirl", { look: true }); E.C.tick(530);
  const st = E.D.doc.querySelector(".ptr-star"); assert.equal(st.style.left, "330px"); assert.equal(st.style.top, "630px");
});

test("轉場・點一下跳過：馬上結束、到星槎頁、不放特效", () => {
  const E = trans(); let done = null; const R = E.X.ptyJoinTrans("x_miaogirl", { done: r => { done = r } }); E.C.tick(100);
  E.ov().click(); assert.ok(done && done.skip && done.end); assert.equal(E.ov(), null); assert.equal(E.loc.hash, "#/adventure"); assert.ok(!E.D.body._cls.has("xqt-on"));
  E.C.tick(3000); assert.equal(R.fx, false); assert.equal(E.fx().length, 0, "跳過後不再冒星光、泡泡");
  /* 淡開途中點：特效收掉 */
  const E2 = trans(); E2.X.ptyJoinTrans("x_miaogirl"); E2.C.tick(600); assert.ok(E2.fx().length >= 1); E2.ov().click(); assert.equal(E2.fx().length, 0, "點了就收");
});

test("轉場・減少動態：只淡入淡出，沒有星光和泡泡；照樣到星槎頁（系統設定 matchMedia 或 o.rm）", () => {
  for (const E of [trans({ rm: true })]) { let done = null; E.X.ptyJoinTrans("x_miaogirl", { look: true, done: r => { done = r } });
    E.C.tick(30); assert.ok(E.ov()._cls.has("on"), "照樣淡入"); E.C.tick(500); assert.ok(E.ov()._cls.has("in"), "照樣淡出");
    E.C.tick(1200); assert.equal(E.fx().length, 0); assert.equal(done.fx, false); assert.equal(done.rm, true); assert.equal(E.loc.hash, "#/adventure"); assert.equal(E.says.length, 0) }
  const E = trans(); E.X.ptyJoinTrans("x_miaogirl", { rm: true }); E.C.tick(1600); assert.equal(E.fx().length, 0);
  assert.ok(/prefers-reduced-motion:reduce\)\{#ptyTr,#ptyTr\.in\{transition-duration:\.2s\}\.ptr-star,\.ptr-say\{display:none\}/.test(M("07pty-party.js")), "CSS 也擋");
});
