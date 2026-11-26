/* W87-2（11/26）地底迷宮換層（m/07z9m-maze.js 的 jhMzLayer、jhMzLvN、jhMzDeep、jhMzPick、過關「往下走」；m/07z9m-fall.js 的層數標題與下樓也播；m/07z9m-central2.js 中炮門第二層示範）：
   用 vm 跑真的程式（共用程式、碑刻、十派第一層、第二層示範、下墜轉場）配假的 DOM：
   登記多層不動第一層、第二層照第一層的欄位、存檔分層、最深層（含舊存檔沒有層數）、選層鎖住、門內頁入口、網址、轉場什麼時候播、標題第幾層。
   Windows Claude 1 分派；207 號文案「換層與共用機制設計」。
   「改壞驗證」：同一組檢查拿去跑改壞的程式（第二層蓋掉第一層、最深層不看舊存檔、選層不鎖），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const M = path.join(ROOT, "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const FILES = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js", "07z9m-central2.js", "07z9m-fall.js"];
const SIDS = ["central", "cross_palace", "pawn", "elephant", "screen", "horse", "same_cannon", "opposite_cannon", "advisor_corner", "palace_horse"];

function load(o = {}) {
  const mem = Object.assign({}, o.mem), xp = [], gone = [], appended = [], listeners = {};
  const el = (tag) => { const e = { tagName: tag, className: "", style: {}, dataset: {}, attrs: {}, listeners: {}, isConnected: false,
    classList: { add: (...c) => { e.className = (e.className + " " + c.join(" ")).trim() }, contains: (c) => e.className.split(" ").includes(c) },
    setAttribute(k, v) { this.attrs[k] = v }, addEventListener(t, f) { (this.listeners[t] = this.listeners[t] || []).push(f) }, remove() { this.isConnected = false }, querySelector() { return null } };
    Object.defineProperty(e, "innerHTML", { set(v) { e._html = v }, get() { return e._html } }); return e };
  const c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh, en) => (o.en ? en : zh), esc: (s) => String(s), addXP: (n, why, key) => xp.push([n, key]), xqFlag: () => true, vibrate: () => {}, jhGo: (h) => gone.push(h), jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: el, head: { append() {} }, body: { append: (e) => { e.isConnected = true; appended.push(e) } } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: (t, f) => { (listeners[t] = listeners[t] || []).push(f) }, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false });
  c.location = { href: "http://x/index.html" + (o.start || "#/"), get hash() { const i = this.href.indexOf("#"); return i < 0 ? "" : this.href.slice(i) } };
  vm.createContext(c); for (const f of FILES) vm.runInContext((o.patch && o.patch[f]) ? o.patch[f](rd(f)) : rd(f), c);
  if (o.after) vm.runInContext(o.after, c);
  return { c, mem, xp, gone, appended };
}
const LV = (c) => vm.runInContext("JH_MZ_LV", c);
const K = (c, n) => vm.runInContext(n, c);   /* const 宣告的（jhMzLv、jhMzUrl、jhMzLayerOf、jhMzSidOf）不在 vm 的全域物件上，用名字取 */

/* 換層規則檢查：回傳不符合的地方（空陣列＝都符合）。同一組檢查也拿去跑改壞的程式（改壞驗證） */
function layerProblems(T) {
  const bad = [], { c } = T, L = LV(c), B = L.central, L2 = c.jhMzLvN("central", 2);
  if (B.layer !== 1 || B.map !== vm.runInContext("JH_MZ_MAP", c)) bad.push("第一層被蓋掉：JH_MZ_LV.central 要還是第一層（layer 1、JH_MZ_MAP）");
  if (!L2 || L2 === B || L2.layer !== 2) bad.push("第二層沒登記到");
  if (c.jhMzLayers("central") !== 2) bad.push("中炮門要有兩層");
  for (const s of SIDS.slice(1)) if (c.jhMzLayers(s) !== 1) bad.push(s + " 只有一層");
  /* 最深層 */
  const fresh = load({ ...T.opt }).c; if (fresh.jhMzDeep("central") !== 1) bad.push("最深層：沒有存檔是第一層");
  const old = load({ ...T.opt, mem: { jhMaze: JSON.stringify({ clear: 3, best: 40 }) } }).c;
  if (old.jhMzDeep("central") !== 2) bad.push("最深層：舊存檔（第一層走完過、沒有 jhMzDeep）要算到過第二層");
  const one = load({ ...T.opt, mem: { jhMaze_pawn: JSON.stringify({ clear: 2 }), jhMzDeep: JSON.stringify({ pawn: 3 }) } }).c;
  if (one.jhMzDeep("pawn") !== 1) bad.push("最深層：只有一層的派永遠是 1（存檔寫 3 也一樣）");
  /* 選層：沒到過的鎖住 */
  const P = load({ ...T.opt }), o = P.c.jhMzPick("central"), h = String(o && o._html || "");
  const btn = (n) => (h.match(new RegExp(`<button type="button" data-n="${n}"([^>]*)>`)) || [])[1];
  if (btn(1) == null || /disabled/.test(btn(1))) bad.push("選層：第一層要能選");
  if (btn(2) == null || !/disabled/.test(btn(2))) bad.push("選層：沒到過的第二層要鎖住");
  /* 新地形：自動走不主動踩 avoid 的格子（終點是它可以）；繞得過去就繞 */
  const A = c.jhMzNew(L2); A.grid = ["#######", "#.....#", "#.###.#", "#.~~~.#", "#######"].map((r) => r.split("")); A.W = 7; A.H = 5; A.lv = Object.assign({}, L2, { avoid: "~" });
  for (let y = 0; y < 5; y++) for (let x = 0; x < 7; x++) A.seen.add(y * 7 + x); A.player.x = 1; A.player.y = 3;
  const pa = c.jhMzPath(A, 5, 3), path = pa ? Array.from(pa, (q) => q.join(",")) : [];
  if (!pa || path.some((q) => ["2,3", "3,3", "4,3"].includes(q))) bad.push("自動走：要繞過水窪，不主動踩（實際 " + path.join(" ") + "）");
  const pb = c.jhMzPath(A, 2, 3); if (!pb || Array.from(pb, (q) => q.join(",")).join(" ") !== "2,3") bad.push("自動走：點的終點就是水窪可以走");
  return bad;
}

test("登記多層：jhMzLayer 不動第一層；第二層照第一層的寶箱、回門派、入口、材質、擋路字元，存檔鍵、修為鍵分開；say 疊在第一層上面；層數不對回 null", () => {
  const T = load(), { c } = T, B = LV(c).central, L2 = c.jhMzLvN("central", 2);
  assert.deepEqual(layerProblems({ c, opt: {} }), []);
  assert.equal(L2.sid, "central"); assert.equal(L2.layer, 2);
  for (const k of ["rew", "back", "hall", "tex", "solid", "opaque", "jump"]) assert.equal(L2[k], B[k], "第二層照第一層：" + k);
  assert.equal(L2.key, "jhMaze_L2"); assert.equal(L2.xpKey, "maze:central:2"); assert.equal(L2.xp, 40, "修為：第二層 +40（開發者 11/26 選單）");
  const L3 = c.jhMzLayer("central", 3, { map: ["###", "#@#", "###"], title: ["三", "3"] }); assert.equal(L3.xp, 60, "第三層 +60"); assert.equal(L3.xpKey, "maze:central:3", "去重鍵一律 maze:<派>:<層>");
  assert.equal(c.jhMzLayers("central"), 3); assert.equal(B.xp, 30, "第一層照舊 30"); assert.equal(B.xpKey, "maze:1", "中炮門第一層的去重鍵不動（舊存檔）");
  assert.notEqual(L2.map, B.map); assert.notEqual(L2.pool, undefined); assert.equal(L2.lore, undefined, "碑刻不照第一層");
  assert.deepEqual(Array.from(L2.say.done), ["石階還往下延伸，第三層之後再開。", "The steps go on down. Level 3 opens later."], "第二層自己的 done");
  assert.equal(L2.say.spot, B.say.spot, "沒寫的 say 照第一層");
  assert.equal(typeof L2.onStep, "function", "第二層也包了碑刻 L、暗門 H（在 07z9m-lore.js 後面登記）");
  assert.equal(c.jhMzLayer("central", 1, {}), null); assert.equal(c.jhMzLayer("nope", 2, {}), null); assert.equal(c.jhMzLayer("central", "x", {}), null);
  assert.equal(c.jhMzLvN("central", 9), B, "沒登記的層＝第一層"); assert.equal(c.jhMzLvN("central", 1), B); assert.equal(K(c, "jhMzLv")(L2), L2, "jhMzLv 收層物件就直接用");
  /* 十派第一層的登記都還在、都是第一層 */
  for (const s of SIDS) { const lv = LV(c)[s]; assert.ok(lv, s); assert.equal(lv.layer, 1, s + " 是第一層"); assert.equal(lv.sid, s) }
});

test("網址：第一層照舊，第二層以後加 ?l=；路由認得出派；層數讀得出來（沒寫、亂寫＝第一層）", () => {
  const { c } = load();
  assert.equal(K(c, "jhMzUrl")("central", 1), "#/jianghu/maze"); assert.equal(K(c, "jhMzUrl")("central", 2), "#/jianghu/maze?l=2"); assert.equal(K(c, "jhMzUrl")("pawn", 1), "#/jianghu/maze/pawn"); assert.equal(K(c, "jhMzUrl")("pawn", 3), "#/jianghu/maze/pawn?l=3");
  assert.equal(K(c, "jhMzSidOf")("#/jianghu/maze?l=2"), "central"); assert.equal(K(c, "jhMzSidOf")("#/jianghu/maze/pawn?l=2"), "pawn");
  assert.equal(K(c, "jhMzLayerOf")("#/jianghu/maze?l=2"), 2); assert.equal(K(c, "jhMzLayerOf")("#/jianghu/maze"), 1); assert.equal(K(c, "jhMzLayerOf")("#/jianghu/maze?l=x"), 1); assert.equal(K(c, "jhMzLayerOf")("#/jianghu/maze?l=0"), 1);
});

test("存檔分層：第二層走完存在 jhMaze_L2、不動第一層；第一次走完給第二層的修為與去重鍵；建狀態、題目指標都收層物件", () => {
  const T = load(), { c, mem, xp } = T, L2 = c.jhMzLvN("central", 2);
  const S = c.jhMzNew(L2, 0, c.jhMzPtrGet(L2)); assert.equal(S.lv, L2); assert.equal(S.sid, "central"); assert.equal(S.W, L2.map[0].length);
  S.turn = 20; S.bag.gong = 2; let R = c.jhMzSave(S); assert.equal(R.first, true);
  assert.ok("jhMaze_L2" in mem && !("jhMaze" in mem), "存在 jhMaze_L2，第一層 jhMaze 沒動");
  assert.deepEqual(xp, [[40, "maze:central:2"]]);
  R = c.jhMzSave(S); assert.equal(R.first, false); assert.equal(xp.length, 1, "第二次不再給修為");
  c.jhMzPtrSet(L2, { door: 2, trap: 1 }); assert.ok("jhMaze_L2Ptr" in mem, "題目指標也分層");
  assert.equal(c.jhMzGet(L2).clear, 2); assert.equal(c.jhMzGet("central").clear, 0);
  assert.equal(c.jhMzMerit(S), c.jhMzGet(L2).gong + (S.bag.gong || 0), "提示花的貢獻看這一層");
});

test("最深層：沒存檔＝1；記了只會往深、不會變淺；壞值當沒有；舊存檔（沒有 jhMzDeep）照各層通關推；只有一層的派永遠 1；跟旅程走（JOURNEY_KEYS 有 m_jhMzDeep）", () => {
  let T = load(), { c, mem } = T;
  assert.equal(c.jhMzDeep("central"), 1);
  c.jhMzDeepSet("central", 2); assert.equal(c.jhMzDeep("central"), 2); assert.deepEqual(JSON.parse(mem.jhMzDeep), { central: 2 });
  c.jhMzDeepSet("central", 1); assert.equal(c.jhMzDeep("central"), 2, "不會變淺");
  c.jhMzDeepSet("central", 7); assert.equal(c.jhMzDeep("central"), 2, "超過層數＝最深那層");
  for (const bad of ['"x"', "[2]", "null", "5", '{"central":"abc"}', '{"central":-3}']) { T = load({ mem: { jhMzDeep: bad } }); assert.equal(T.c.jhMzDeep("central"), 1, "壞值：" + bad) }
  T = load({ mem: { jhMaze: JSON.stringify({ clear: 1 }) } }); assert.equal(T.c.jhMzDeep("central"), 2, "舊存檔：第一層走完過");
  T = load({ mem: { jhMaze: JSON.stringify({ clear: 0 }) } }); assert.equal(T.c.jhMzDeep("central"), 1, "舊存檔：第一層沒走完");
  T = load({ mem: { jhMaze_pawn: JSON.stringify({ clear: 5 }) } }); assert.equal(T.c.jhMzDeep("pawn"), 1, "只有一層");
  assert.equal(T.c.jhMzDeep("nope"), 1);
  assert.ok(/JOURNEY_KEYS\.push\("m_jhMzDeep"\)/.test(rd("05b-save.js")), "05b-save 的 JOURNEY_KEYS 要有 m_jhMzDeep");
});

test("選層：列出每一層的名字；沒到過的鎖住、點了沒反應；到過的點了就換到那一層的網址；點外面或「先不下去」關掉", () => {
  let T = load({ mem: { jhMzDeep: JSON.stringify({ central: 2 }) } }), o = T.c.jhMzPick("central"), h = o._html;
  assert.match(h, /第一層：地底漕倉/); assert.match(h, /第二層：漕底淤廊/); assert.ok(!/disabled/.test(h), "兩層都到過：都能選"); assert.equal(T.appended.length, 1);
  const click = (o, n, dis) => o.listeners.click[0]({ target: { closest: () => ({ disabled: !!dis, dataset: { n: String(n) } }) } });
  click(o, 2); assert.deepEqual(T.gone, ["#/jianghu/maze?l=2"]); assert.equal(o.isConnected, false, "選了就關掉");
  o = T.c.jhMzPick("central"); click(o, 1); assert.equal(T.gone[1], "#/jianghu/maze", "第一層的網址沒有 ?l");
  o = T.c.jhMzPick("central"); click(o, 0); assert.equal(T.gone.length, 2, "先不下去：不換頁"); assert.equal(o.isConnected, false);
  o = T.c.jhMzPick("central"); o.listeners.click[0]({ target: o }); assert.equal(o.isConnected, false, "點外面關掉"); assert.equal(T.gone.length, 2);
  T = load(); o = T.c.jhMzPick("central"); assert.match(o._html, /data-n="2" disabled/); assert.match(o._html, /🔒/);
  click(o, 2, true); assert.equal(T.gone.length, 0, "鎖住的點了沒反應"); assert.equal(o.isConnected, true);
  T = load({ en: true, mem: { jhMzDeep: JSON.stringify({ central: 2 }) } }); assert.match(T.c.jhMzPick("central")._html, /Level 2: Silted culvert/);
});

test("門內頁入口：只有一層、或還沒到過第二層＝直接進第一層（跟以前一樣）；到過第二層＝先跳選層", () => {
  const hall = (T, sid) => { let b = null; const P = { querySelector: () => null, insertBefore(x) { b = x } }; T.c.jhMzHall({ querySelector: () => P }, sid); return b };
  let T = load(), b = hall(T, "central"); b.onclick({ stopPropagation() {} }); assert.deepEqual(T.gone, ["#/jianghu/maze"]); assert.equal(T.appended.length, 0);
  T = load({ mem: { jhMaze_pawn: JSON.stringify({ clear: 3 }) } }); b = hall(T, "pawn"); b.onclick({ stopPropagation() {} }); assert.deepEqual(T.gone, ["#/jianghu/maze/pawn"], "只有一層的派照舊");
  T = load({ mem: { jhMaze: JSON.stringify({ clear: 1 }) } }); b = hall(T, "central"); b.onclick({ stopPropagation() {} });
  assert.equal(T.gone.length, 0); assert.equal(T.appended.length, 1); assert.match(T.appended[0].className, /jh-mz-pick/, "舊存檔走完過第一層：跳選層");
});

test("下墜轉場：標題照層數（地底・第二層／Level 2）；從大廳來、或同一派從淺的層換到深的層才播；同層、變淺、換派、從別處都不播", () => {
  let T = load(), o = T.c.jhFallPlay(T.c.jhMzLvN("central", 2)); assert.match(o._html, /地底・第二層/); assert.match(o._html, /<b>漕底淤廊<\/b>/);
  o = T.c.jhFallPlay(K(T.c, "jhMzLv")("central")); assert.match(o._html, /地底・第一層/);
  T = load({ en: true }); assert.match(T.c.jhFallPlay(T.c.jhMzLvN("central", 2))._html, /Underground · Level 2/);
  const W = (from, cur) => T.c.jhFallWant({ from, n: 99 }, cur);
  assert.equal(W("#/jianghu/hall/central", "#/jianghu/maze?l=2"), true, "從大廳選層");
  assert.equal(W("#/jianghu/maze", "#/jianghu/maze?l=2"), true, "第一層往下走");
  assert.equal(W("#/jianghu/maze/pawn", "#/jianghu/maze/pawn?l=3"), true);
  assert.equal(W("#/jianghu/maze?l=2", "#/jianghu/maze?l=2"), false, "同一層");
  assert.equal(W("#/jianghu/maze?l=2", "#/jianghu/maze"), false, "變淺");
  assert.equal(W("#/jianghu/maze/pawn", "#/jianghu/maze?l=2"), false, "換派");
  assert.equal(W("#/jianghu/map", "#/jianghu/maze?l=2"), false, "從江湖地圖");
  assert.equal(T.c.jhFallWant({ from: "#/jianghu/hall/central", n: -5 }, "#/jianghu/maze"), false, "這次換頁已經播過");
});

test("新地形停下（原始碼）：走到 avoid 的格子、或機關回傳 stop，自動走和按住搖桿都停；第二層照第一層的 avoid", () => {
  const S = rd("07z9m-maze.js"), a = S.indexOf("const act=(dx,dy)=>{"), f = S.slice(a, S.indexOf("if(r.card&&", a));
  assert.match(f, /if\(r\.stop\|\|\(S\.player\.x!==x0\|\|S\.player\.y!==y0\)&&jhMzAvoid\(S,S\.player\.x,S\.player\.y\)\)\{path=\[\];held=null\}/);
  const { c } = load(); assert.equal(c.jhMzLvN("central", 2).avoid, LV(c).central.avoid); assert.equal(LV(c).central.avoid, "", "第一層沒有新地形");
  const A = c.jhMzNew("central"); A.lv = Object.assign({}, A.lv, { avoid: "~" }); A.grid[1][1] = "~"; assert.equal(c.jhMzAvoid(A, 1, 1), true); assert.equal(c.jhMzAvoid(A, 99, 99), false, "地圖外不算");
});

test("過關畫面（原始碼）：有下一層就記到過下一層、多一顆「往下走・第N層」換到下一層的網址；標題寫第幾層；沒有下一層照舊回門派", () => {
  const S = rd("07z9m-maze.js"), a = S.indexOf("const finish=()=>{"), f = S.slice(a, S.indexOf("o.querySelector('[data-a=\"out\"]')", a));
  assert.ok(a > 0); assert.match(f, /jhMzLayers\(LV\.sid\)>n/); assert.match(f, /jhMzDeepSet\(LV\.sid,n\+1\)/);
  assert.match(f, /data-a="down"/); assert.match(f, /jhGo\(jhMzUrl\(LV\.sid,n\+1\)\)/); assert.match(f, /第\$\{jhMzCn\(n\)\}層走完了/);
  assert.match(S, /function JhMaze\(v,sid,n\)\{[^\n]*const LV=jhMzLvN\(sid,n\|\|jhMzLayerOf\(location\.hash\)\)/, "JhMaze 照網址的層數");
  assert.match(S, /const S=jhMzNew\(LV,jhMzGet\(LV\)\.clear,jhMzPtrGet\(LV\)\)/, "建狀態、存檔、題目指標都用這一層");
});

test("第二層示範地圖：走得完、有不被抓的路、先踩踏板再到石門", () => {
  const { c } = load(), L2 = c.jhMzLvN("central", 2), at = (S, x, y) => { S.player.x = x; S.player.y = y; S.player.fx = x; S.player.fy = y };
  const M = L2.map, W = M[0].length; for (const r of M) assert.equal(r.length, W);
  const cnt = (ch) => M.join("").split(ch).length - 1; for (const ch of "@DP>") assert.equal(cnt(ch), 1, ch); assert.equal(cnt("C"), 3);
  const S0 = c.jhMzNew(L2); assert.ok(!c.jhMzCaught(S0));
  const clone = (T) => { const U = c.jhMzNew(L2); U.guards.forEach((G, i) => Object.assign(G, T.guards[i])); at(U, T.player.x, T.player.y); U.plate = T.plate; U.grid = T.grid.map((r) => r.slice()); U.chests = new Set(T.chests); return U };
  const key = (T) => T.player.x + "," + T.player.y + "," + (T.plate ? 1 : 0) + "," + T.guards.map((G) => [G.x, G.y, G.dx, G.stun || 0].join(":")).join("|");
  let q = [S0], seen = new Set([key(S0)]), door = null;
  for (let st = 0; st < 200 && q.length && !door; st++) { const nq = []; for (const T of q) for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const U = clone(T), r = c.jhMzStep(U, dx, dy);
    if (r.ev === "door") { door = U; break } if (["trap", "wall", "locked", "spot"].includes(r.ev)) continue; const k = key(U); if (seen.has(k)) continue; seen.add(k); nq.push(U) } q = nq }
  assert.ok(door && door.plate);
});

test("改壞驗證：第二層蓋掉第一層、最深層不看舊存檔、選層不鎖、自動走踩水窪，規則檢查一定抓得到", () => {
  const mk = (patch) => { const T = load({ patch }); return layerProblems({ c: T.c, opt: { patch } }) };
  const P1 = { "07z9m-maze.js": (s) => s.replace("(B.layers||(B.layers={}))[n]=L;", "(B.layers||(B.layers={}))[n]=L;JH_MZ_LV[sid]=L;") };
  assert.ok(mk(P1).some((s) => s.includes("第一層被蓋掉")), "第二層蓋掉第一層要被抓到");
  const P2 = { "07z9m-maze.js": (s) => s.replace("for(let k=1;k<N;k++)if(jhMzGet(jhMzLvN(sid,k)).clear>0)d=Math.max(d,k+1);", "") };
  assert.ok(mk(P2).some((s) => s.includes("舊存檔")), "不看舊存檔要被抓到");
  const P3 = { "07z9m-maze.js": (s) => s.replace("lock=n>D;", "lock=false;") };
  assert.ok(mk(P3).some((s) => s.includes("鎖住")), "選層不鎖要被抓到");
  const P4 = { "07z9m-maze.js": (s) => s.replace("if(!end&&jhMzAvoid(S,nx,ny))continue;", "") };
  assert.ok(mk(P4).some((s) => s.includes("繞過水窪")), "自動走踩水窪要被抓到");
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P["07z9m-maze.js"](rd("07z9m-maze.js")), rd("07z9m-maze.js"), "改壞的字串要真的找得到");
});

test("〔原始碼〕LF、沒有控制字元；07z9m-central2.js 全域名稱有 JH_MZ_CENTRAL2 前綴、排在 07z9m-lore.js 後面（碑刻才包得到）、07z9m-fall.js 前面", () => {
  for (const f of ["07z9m-maze.js", "07z9m-fall.js", "07z9m-central2.js", "05b-save.js"]) { const s = rd(f); assert.ok(!s.includes("\r"), f + " LF"); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(s), f + " 控制字元") }
  const C2 = rd("07z9m-central2.js"), tops = [...C2.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map((m) => m[1]);
  for (const n of tops) assert.ok(/^JH_MZ_CENTRAL2/.test(n), "全域名稱要有前綴：" + n);
  const H = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8"), i = (f) => H.indexOf("//#include m/" + f);
  assert.ok(i("07z9m-lore.js") > 0 && i("07z9m-central2.js") > i("07z9m-lore.js") && i("07z9m-fall.js") > i("07z9m-central2.js"));
});
