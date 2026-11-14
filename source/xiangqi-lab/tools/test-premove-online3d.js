// 11/13 評比循環第 13 輪 F3「線上對局預走」、F4「3D 園子預走＋快棋 3D 動畫縮短」的自動測試，不開瀏覽器：
//   ① 線上對局：把 m/09b-preload.js 的 PvpGame 原樣切出來，用 with＋Proxy 給假的 DOM、假的線上對局（照 local.js netPvp 的規則：只有輪到你才收、照棋規驗步）、
//      m/07pm-premove.js 用 blitz-measure.js 的 load() 真的載入：對方在想時排預走 → 對方落子 → 預走自動送出（走同一條 /pvp/move，帶 seat）、
//      不合法／子被吃取消並提示、觀戰與同一支手機輪流下不開、3D 園子的點選（parkDraw 的 ex.tap）也排得了、快棋模式略過線上將死動畫
//   ② 3D 園子：park3d.js PKCB 區塊的 pkcbPre（預走標記）抽出來跑；markAdd 用假的 THREE 實跑（紫框、箭頭三角形、「預」字牌）；
//      動畫推進那一行實跑（快棋 k 倍）；06-cpu 的 parkDraw 帶 ex.blitz、pkSwTap 排預走不冒「點偏」提示；08b 不再擋 3D
//   ③ 原始碼與文件
// 用法：node --test xiangqi-lab/tools/test-premove-online3d.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const MZ = require("./blitz-measure.js"), { C, load, flush } = MZ;
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const PRE = rd(path.join(M, "09b-preload.js")), P3 = rd(path.join(LAB, "src/park3d.js")), CPU = rd(path.join(M, "06-cpu.js")), B8 = rd(path.join(M, "08b-cpugame.js")), PM = rd(path.join(M, "07pm-premove.js"));
const sq = s => C.parseSq(s), J = x => JSON.parse(JSON.stringify(x));
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + a.length); assert.ok(i >= 0 && j > i, "找不到 " + a); return s.slice(i, j) };
const wait = ms => new Promise(r => setTimeout(r, ms));

// ====================== ① 線上對局（09b PvpGame 實跑） ======================
function fakeEl() {
  const cls = new Set();
  return { style: {}, dataset: {}, innerHTML: "", textContent: "", children: [], isConnected: true, disabled: false, hidden: false,
    classList: { add: (...a) => a.forEach(x => cls.add(x)), remove: (...a) => a.forEach(x => cls.delete(x)), toggle: (k, on) => { if (on === undefined ? !cls.has(k) : on) cls.add(k); else cls.delete(k) }, contains: k => cls.has(k) },
    append(...x) { this.children.push(...x) }, after() {}, setAttribute(k, v) { this[k] = v }, querySelector: () => null, querySelectorAll: () => [] };
}
/* 假的線上對局：規則照 local.js netPvp（還沒輪到你、不合法、下完都丟錯）；opp() 模擬對方落子後 XQNet 發 game 事件 */
function server(opt) {
  const S = { board: C.parseFen(opt.fen || C.START), turn: opt.turn || "r", moves: [], result: null, log: [], ev: [] };
  const out = () => ({ id: "net1", red: "甲", black: "乙", board: S.board.slice(), turn: S.turn, moves: S.moves.map(m => ({ ...m })), result: S.result, draw: null, tcKey: "none", clocks: null, running: false,
    legal: S.result ? [] : C.legal(S.board, S.turn), check: -1, eval: null, net: true, mySide: opt.seat, watchers: 0, link: "up", emotes: [], online: { r: true, b: true } });
  const apply = (f, t) => { const by = S.turn, cn = C.notate(S.board, f, t); S.board = C.make(S.board, f, t); S.moves.push({ f, t, by, cn }); S.turn = C.opp(by);
    if (!C.legal(S.board, S.turn).length) S.result = { w: by, why: (by === "r" ? "紅方" : "黑方") + "將死" } };
  S.api = async (u, b) => { await null; b = b || {}; S.log.push({ u, f: b.f, t: b.t, seat: b.seat });
    if (u === "/pvp/move") { if (S.result) throw new Error("這局已經結束"); if (b.seat && S.turn !== b.seat) throw new Error("還沒輪到你");   /* 同一支手機輪流下：seat＝null，兩邊都收 */
      if (!C.legal(S.board, S.turn).some(([x, y]) => x === +b.f && y === +b.t)) throw new Error("這步不合法"); apply(+b.f, +b.t) }
    return out() };
  S.opp = (f, t) => { apply(f, t); for (const cb of S.ev) cb() };
  return S;
}
/* 開一盤線上對局畫面。opt：seat（r／b／w）、net（預設 true）、fen、turn、park（3D 園子開著）、store（07pm 的存檔） */
async function pvp(opt) {
  opt = opt || {};
  const R = load({ store: opt.store }), seat = opt.seat || "r", srv = server({ seat, fen: opt.fen, turn: opt.turn });
  const els = {}, v = { querySelector: s => els[s] || (els[s] = fakeEl()) }, H = { draws: [], parks: [], toasts: [], modals: [], kills: [], tap: null };
  const XQNet = { active: () => opt.net !== false, side: () => seat === "w" ? null : seat, game: () => ({ gid: "G1", red: { id: "A", name: "甲" }, black: { id: "B", name: "乙" } }),
    on: (k, cb) => { if (k === "game") srv.ev.push(cb); return () => {} }, oppOnline: () => true, leave() {} };
  const stubs = { OFF: true, XQNet, store: { get: (k, d) => k === "pvpSeat" && opt.net === false ? null : d, set() {} }, setTabs() {}, gameLayout() {},
    Board: cb => { H.tap = cb; return { svg: fakeEl(), draw: (b, o) => H.draws.push({ b, o }) } },
    setTop() {}, parkBtn: () => [], vcOn: () => false, DEVMODE: () => false, $: () => null, actionBar: (el, defs) => { H.acts = defs; return { undo: fakeEl(), flip: fakeEl(), new: fakeEl(), draw: fakeEl(), resign: fakeEl(), setup: fakeEl() } },
    poller: fn => { fn(); return () => {} }, api: (u, b) => srv.api(u, b), toast: m => H.toasts.push(m), vibrate() {},
    parkDraw: (h, bd, b, o, ex) => H.parks.push({ o, ex }), parkOn: () => !!opt.park,
    openingCue: () => null, PLAYER: { r: "紅方", b: "黑方" }, playerHTML: () => '<div class="clk"></div>', evPct: () => 50, evMark() {}, ruleNote() {}, renderStrip() {},
    modal: h => H.modals.push(h), killFx: (...a) => H.kills.push(a), itemDrop: () => null, ptsLv: () => 1, meInfo: () => ({ id: "A" }), isCloud: () => false,
    opp: s => s === "r" ? "b" : "r", START: C.START, parseFen: C.parseFen, esc: s => String(s),
    pmvTap: R.X.pmvTap, pmvOpts: R.X.pmvOpts, pmvFire: R.X.pmvFire, pmvLabel: R.X.pmvLabel, pmvArrive: R.X.pmvArrive, blzSkip: R.X.blzSkip,
    MODAL_HOLD: 0, KJ_LAST: null, setInterval: (f, ms) => { const h = setInterval(f, ms); h.unref(); return h } };   /* 棋鐘的 setInterval 不卡住測試結束 */
  stubs.window = stubs;
  const env = new Proxy(stubs, { has: (t, k) => typeof k === "string", get: (t, k) => k === Symbol.unscopables ? undefined : k in t ? t[k] : globalThis[k], set: (t, k, x) => { t[k] = x; return true } });
  const PvpGame = new Function("env", "with(env){" + MZ.fnSrc(PRE, "PvpGame") + "\nreturn PvpGame}")(env);
  const g = PvpGame(v); await flush();
  return Object.assign(H, { R, srv, g, stubs, stat: () => v.querySelector("#stat").textContent, o: () => H.draws[H.draws.length - 1].o, end: () => g.stop() });
}

test("線上對局：對方在想時排預走 → 對方落子 → 自動送出（跟一般點選同一條 /pvp/move、帶 seat），狀態列寫「已預走」、對方那步灰色虛線、記到反應時間", async () => {
  const P = await pvp({ seat: "r" });
  P.tap(sq("h2")); P.tap(sq("e2")); await flush();
  assert.equal(P.srv.moves.length, 1, "先照常走一步炮二平五"); assert.equal(P.srv.turn, "b");
  P.tap(sq("b0")); assert.equal(P.o().sel, sq("b0"), "對方在想：照樣拿起自己的子"); assert.ok(P.o().targets.includes(sq("c2")));
  P.tap(sq("c2")); assert.deepEqual(J(P.o().pre), { f: sq("b0"), t: sq("c2") }, "棋盤上畫出預走");
  assert.match(P.stat(), /^⏳ 等對方走…・⏳ 已預走「傌八進七」/);
  assert.equal(P.srv.log.filter(x => x.u === "/pvp/move").length, 1, "排的時候沒有送任何東西");
  P.srv.opp(sq("h9"), sq("g7")); await flush();
  assert.equal(P.srv.moves.length, 3, "對方一步＋預走一步"); assert.deepEqual([P.srv.moves[2].f, P.srv.moves[2].t, P.srv.moves[2].by], [sq("b0"), sq("c2"), "r"]);
  const mv = P.srv.log.filter(x => x.u === "/pvp/move");
  assert.deepEqual(mv.map(x => x.seat), ["r", "r"], "一般點選和預走走的是同一條送步路徑（net.js 簽名、驗證不變）");
  assert.equal(P.R.X.pmvSt().q, null); assert.equal(P.R.X.pmvStats().n, 1, "pmvArrive 記了對方落子時間，量到一次反應時間");
  assert.deepEqual(J(P.o().pmOpp), { f: sq("h9"), t: sq("g7") }, "對方剛走那步用灰色虛線標著");
  P.end();
});
test("線上對局：預走被擋住、那顆子被吃掉＝自動取消並提示，不會送出不合法的步", async () => {
  let P = await pvp({ seat: "r", fen: "3k5/9/9/9/9/9/9/1r7/9/R3K4", turn: "b" });
  P.tap(sq("a0")); P.tap(sq("a5")); assert.ok(P.R.X.pmvSt().q);
  P.srv.opp(sq("b2"), sq("a2")); await flush();
  assert.equal(P.srv.moves.length, 1); assert.equal(P.srv.log.filter(x => x.u === "/pvp/move").length, 0, "沒有送");
  assert.ok(P.R.toasts.some(t => /預走「俥九進五」現在走不了，已取消/.test(t)), P.R.toasts.join("｜")); assert.equal(P.o().pre, undefined);
  assert.match(P.stat(), /^👉 輪到你/, "輪到你自己下"); P.end();
  P = await pvp({ seat: "r", fen: "3k5/9/9/9/9/9/9/9/r8/R3K4", turn: "b" });
  P.tap(sq("a0")); P.tap(sq("a1")); P.srv.opp(sq("a1"), sq("a0")); await flush();
  assert.ok(P.R.toasts.some(t => /被吃掉了/.test(t))); assert.equal(P.srv.log.filter(x => x.u === "/pvp/move").length, 0); P.end();
});
test("線上對局：黑方也行（翻盤）；觀戰、同一支手機輪流下都不開預走", async () => {
  let P = await pvp({ seat: "b" });
  P.srv.opp(sq("h2"), sq("e2")); await flush(); P.tap(sq("h9")); P.tap(sq("g7")); await flush(); assert.equal(P.srv.moves.length, 2);
  P.tap(sq("b9")); P.tap(sq("c7")); assert.ok(P.R.X.pmvSt().q, "黑方排預走");
  P.srv.opp(sq("h0"), sq("g2")); await flush(); assert.equal(P.srv.moves.length, 4); assert.equal(P.srv.moves[3].by, "b"); P.end();
  P = await pvp({ seat: "w" });
  P.tap(sq("b0")); assert.ok(P.toasts.includes("你在觀戰")); assert.equal(P.R.X.pmvSt().sel, null); P.end();
  P = await pvp({ seat: "r", net: false });   /* 同一支手機輪流下：seat＝null */
  P.tap(sq("h2")); P.tap(sq("e2")); await flush(); P.tap(sq("b0")); assert.equal(P.R.X.pmvSt().sel, null, "不進預走"); assert.equal(P.o().sel, -1, "黑方的回合點紅子＝不選"); P.end();
});
test("線上對局在 3D 園子：點選從 parkDraw 的 ex.tap 進來一樣排得了，標記放在給 3D 的 o.pre", async () => {
  const P = await pvp({ seat: "r", park: true });
  const tap3 = i => P.parks[P.parks.length - 1].ex.tap(i);
  tap3(sq("h2")); tap3(sq("e2")); await flush();
  tap3(sq("b0")); tap3(sq("c2"));
  const last = P.parks[P.parks.length - 1]; assert.deepEqual(J(last.o.pre), { f: sq("b0"), t: sq("c2") }, "3D 拿到預走");
  P.srv.opp(sq("h9"), sq("g7")); await flush(); assert.equal(P.srv.moves.length, 3); P.end();
});
test("快棋模式：線上下完的將死動畫略過（不擋結果視窗）；一般模式照播", async () => {
  const fen = "3k5/9/9/4P4/9/9/9/8r/r8/4K4";
  for (const [blitz, n] of [[false, 1], [true, 0]]) {
    const P = await pvp({ seat: "r", fen, turn: "r", store: { blitz } });
    P.tap(sq("e6")); P.tap(sq("e7")); await flush(); P.srv.opp(sq("i2"), sq("i0")); await flush();
    assert.ok(P.srv.result && /將死/.test(P.srv.result.why));
    assert.equal(P.kills.length, n, "killFx 呼叫次數 blitz=" + blitz); assert.equal(P.stubs.MODAL_HOLD > 0, !blitz, "MODAL_HOLD");
    assert.equal(P.modals.length, 1, "結果視窗照出"); P.end();
  }
});
test("線上對局：輪到你那一刻畫面正忙（提和的請求還沒回來）＝先不送、25 毫秒後再試，忙完就走出", async () => {
  const P = await pvp({ seat: "r" });
  P.tap(sq("h2")); P.tap(sq("e2")); await flush(); P.tap(sq("b0")); P.tap(sq("c2")); assert.ok(P.R.X.pmvSt().q);
  const api0 = P.stubs.api; let hold = null; P.stubs.api = (u, b) => u === "/pvp/draw" ? new Promise(r => { hold = () => r(api0(u, b)) }) : api0(u, b);
  P.acts.find(d => d[0] === "draw")[3](); await flush(); assert.ok(hold, "提和送出、等回應中（busy）");
  P.srv.opp(sq("h9"), sq("g7")); await flush();
  assert.equal(P.srv.moves.length, 2, "忙著：輪詢不重畫、預走還沒送");
  hold(); await flush(); assert.equal(P.srv.moves.length, 2, "提和的回應在 busy 裡重畫：預走拿到「忙」，排 25 毫秒後重試");
  await wait(60); await flush();
  assert.equal(P.srv.moves.length, 3, "忙完走出"); assert.equal(P.R.X.pmvSt().q, null); P.end();
});

// ====================== ② 3D 園子 ======================
const blk = P3.match(/\/\*PKCB\{[\s\S]*?\/\*\}PKCB\*\//)[0], bz = P3.match(/\/\*PKBZ\{[\s\S]*?\/\*\}PKBZ\*\//)[0];
const K = new Function(blk + bz + ";return{PKCB,pkcbPre,pkcbArc,pkcbPreTag,pkcbDash,PKBZ,pkbzK}")();
const POS = flip => i => { const c = i % 9, r = i / 9 | 0; return flip ? [4 - c, 4.5 - r] : [c - 4, r - 4.5] };
const tris = p => { const o = []; for (let k = 0; k < p.length; k += 2) o.push([p[k], p[k + 1]]); return o };

test("3D 預走標記 pkcbPre：起點、落點紫色虛線框（白邊襯底）、落點淡淡塗色、淡色箭頭（從起點指向落點、箭頭尖在落點前 .4）、落點「預」字牌", () => {
  assert.deepEqual(K.pkcbPre({}, POS(false)), []); assert.deepEqual(K.pkcbPre(null, POS(false)), []);
  assert.deepEqual(K.pkcbPre({ pre: { f: 5, t: 5 } }, POS(false)), [], "原地不算");
  const f = sq("b0"), t = sq("c2"), L = K.pkcbPre({ pre: { f, t } }, POS(false)), C = K.PKCB;
  assert.ok(L.every(d => d.m === "pre" && d.ro > 0), "新記號（不經色調映射、照順序疊）");
  const fr = L.filter(d => d.k === "bars" && d.col === C.pre && d.op === 1); assert.deepEqual(fr.map(d => d.i), [f, t]); assert.equal(fr[0].b.length, 16, "虛線框 16 段");
  assert.equal(C.pre, 0x7A3FD1, "跟平面 pmvPaint 同一個紫色");
  const wh = L.filter(d => d.k === "bars" && d.col === C.white); assert.deepEqual(wh.map(d => d.i), [f, t]); assert.ok(wh[0].ro < fr[0].ro, "白邊先畫");
  const fill = L.find(d => d.k === "bars" && d.op < .3); assert.equal(fill.i, t, "落點塗色");
  const ar = L.find(d => d.k === "tris"); assert.equal(ar.i, f); assert.equal(ar.op, .5, "淡色"); assert.equal(ar.p.length % 6, 0, "三角形");
  const [ax, az] = POS(false)(f), [bx, bzz] = POS(false)(t), dx = bx - ax, dz = bzz - az, Ln = Math.hypot(dx, dz), ux = dx / Ln, uz = dz / Ln;
  const proj = tris(ar.p).map(([x, z]) => x * ux + z * uz), side = tris(ar.p).map(([x, z]) => Math.abs(-x * uz + z * ux));
  assert.ok(Math.abs(Math.max(...proj) - (Ln - .4)) < 1e-9, "箭頭尖在落點前 .4"); assert.ok(Math.min(...proj) >= .23 - 1e-9, "從起點 .23 開始");
  assert.ok(Math.max(...side) <= .217 + 1e-9, "最寬是箭頭半寬 .217");
  const segs = (ar.p.length - 6) / 12; assert.ok(segs >= 3, "身是虛線（好幾段） " + segs);
  const tag = L.find(d => d.k === "tag"); assert.deepEqual([tag.i, tag.tx], [t, "pre"]); assert.ok(tag.ro > fr[1].ro, "字牌疊在最上面");
  /* 翻盤（執黑）：同一步的箭頭方向跟著 pos 反過來 */
  const Lf = K.pkcbPre({ pre: { f, t } }, POS(true)), af = Lf.find(d => d.k === "tris");
  const r6 = v => Math.round(v * 1e6) / 1e6 || 0; assert.deepEqual(af.p.map(v => r6(-v)), ar.p.map(r6), "翻盤：同一步的箭頭整個反過來");
});
test("3D 預走走出後：對方那一步灰色虛線（起點小圈、落點大圈、虛線連線），不畫紫框", () => {
  const L = K.pkcbPre({ pmOpp: { f: sq("h9"), t: sq("g7") } }, POS(false)), C = K.PKCB;
  assert.equal(L.length, 3); assert.ok(L.every(d => d.col === C.preOpp && d.k === "tris"));
  const r = d => Math.max(...tris(d.p).map(([x, z]) => Math.hypot(x, z)));
  assert.ok(Math.abs(r(L[0]) - .33) < 1e-9 && Math.abs(r(L[1]) - .53) < 1e-9, "半徑照平面 20／32 像素");
  const arc = K.pkcbArc(.5, .05, 8, .5), ang = tris(arc).map(([x, z]) => Math.atan2(z, x));
  assert.ok(ang.every(a => { const u = ((a % (Math.PI / 4)) + Math.PI / 4) % (Math.PI / 4); return u <= Math.PI / 8 + 1e-6 || u >= Math.PI / 4 - 1e-6 }), "每段只佔一半＝虛線");
  const both = K.pkcbPre({ pre: { f: 1, t: 20 }, pmOpp: { f: 70, t: 61 } }, POS(false)); assert.ok(both.some(d => d.tx === "pre") && both.some(d => d.col === C.preOpp));
});
test("「預」字牌貼圖：白底、紫邊、紫字「預」（跟平面一樣）", () => {
  const ops = [], g = { clearRect() {}, beginPath() {}, arc() {}, fill() { ops.push(["fill", g.fillStyle]) }, stroke() { ops.push(["stroke", g.strokeStyle]) }, fillText(s) { ops.push(["text", g.fillStyle, s]) } };
  K.pkcbPreTag(g, 128); assert.deepEqual(ops, [["fill", "#FFFFFF"], ["stroke", "#7A3FD1"], ["text", "#7A3FD1", "預"]]);
});
/* markAdd 用假的 THREE 實跑：記號真的變成網格／貼圖，位置在格子上 */
function fakeT() {
  const T = {}; T.DoubleSide = 2;
  T.MeshBasicMaterial = function (o) { Object.assign(this, o); this.dispose = () => {} }; T.SpriteMaterial = T.MeshBasicMaterial;
  T.BufferGeometry = function () { this.attr = {}; this.setAttribute = (k, v) => { this.attr[k] = v }; this.dispose = () => {} };
  T.Float32BufferAttribute = function (a, n) { this.array = a; this.itemSize = n };
  T.CircleGeometry = function (r) { this.r = r; this.dispose = () => {} }; T.RingGeometry = function (a, b) { this.r = b; this.dispose = () => {} };
  const obj = function (geo, mat) { this.geometry = geo; this.material = mat; this.position = { set: (x, y, z) => { this.position.v = [x, y, z] } }; this.rotation = {}; this.scale = { set: (...a) => { this.scale.v = a } }; this.userData = {} };
  T.Mesh = obj; T.Sprite = function (mat) { obj.call(this, null, mat); this.isSprite = true };
  return T;
}
function markKit(giant) {
  const src = cut(P3, "let tagT=null,preT=null,BLZ=false;", "let selI=-1,checkRing=null;");
  const markG = { children: [], add(m) { this.children.push(m) }, clear() { this.children = [] } };
  const mk = new Function("T", "pos", "TOP", "GIANT", "GNT_H", "markG", "cv", "pkcbTag", "pkcbPreTag", "PI", src + ";return{markAdd,markClr,preTex,tagTex,triGeo}");
  const tex = [];
  const api = mk(fakeT(), POS(false), .56, !!giant, 1.55, markG, (w, h, fn) => { const t = { fn }; tex.push(t); return t }, () => {}, () => {}, Math.PI);
  return { api, markG, tex };
}
test("3D markAdd（假的 THREE 實跑）：預走記號變成網格，箭頭是三角形網格、放在起點格上；「預」字牌用自己的貼圖、巨盤時浮在角色頭上", () => {
  const { api, markG } = markKit(false), L = K.pkcbPre({ pre: { f: sq("b0"), t: sq("c2") } }, POS(false));
  for (const d of L) api.markAdd(d);
  assert.equal(markG.children.length, L.length);
  const tri = markG.children.find(m => m.geometry && m.geometry.attr && m.geometry.attr.position && m.material.opacity === .5);
  assert.ok(tri, "箭頭網格"); assert.equal(tri.geometry.attr.position.array.length, L.find(d => d.k === "tris").p.length / 2 * 3, "每個頂點 x,0,z");
  assert.deepEqual(tri.position.v, [POS(false)(sq("b0"))[0], .56 + .018, POS(false)(sq("b0"))[1]]);
  assert.equal(tri.material.toneMapped, false); assert.equal(tri.material.color, 0x7A3FD1);
  const sp = markG.children.find(m => m.isSprite); assert.equal(sp.material.map, api.preTex(), "「預」字牌貼圖"); assert.notEqual(api.preTex(), api.tagTex(), "跟「將」字牌分開");
  assert.ok(Math.abs(sp.position.v[1] - (.56 + .66)) < 1e-9);
  const G = markKit(true); G.api.markAdd(L.find(d => d.k === "tag")); assert.ok(Math.abs(G.markG.children[0].position.v[1] - (.56 + 1.55 * 1.3)) < 1e-9, "巨盤：浮在角色頭上");
  G.api.markAdd({ k: "tag", i: 4, ro: 20 }); assert.ok(Math.abs(G.markG.children[1].position.v[1] - (.56 + .66)) < 1e-9, "「將」字牌位置不變");
  api.markClr(); assert.equal(markG.children.length, 0);
});
test("快棋 3D 動畫：加快倍數＝平面走子滑動 280→90 毫秒的比例（跟 07pm blzTab 一致）；動畫推進那一行實跑，k 倍的走子動畫快 3.1 倍播完", () => {
  const T = load().X.blzTab();
  assert.deepEqual(K.PKBZ.slide, [T.slide[1], T.slide[2]]); assert.equal(K.pkbzK(false), 1); assert.ok(Math.abs(K.pkbzK(true) - 280 / 90) < 1e-12);
  const line = cut(P3, "{const cur=anims;anims=[];const keep=cur.filter(a=>{a.t+=(a.rt", "anims=keep.concat(anims)}") + "anims=keep.concat(anims)}";
  const step = new Function("anims", "t", "ETS", "let A=anims;" + line.replace(/\banims\b/g, "A") + ";return A");
  const run = k => { let A = [{ t: 0, d: .42, k, f() {}, end() {} }], n = 0; while (A.length && n < 999) { A = step(A, 1 / 60, 1); n++ } return n };
  const n0 = run(undefined), n1 = run(K.pkbzK(true));
  assert.equal(n0, 26, "一般 0.42 秒＝26 幀"); assert.equal(n1, Math.ceil(.42 / (1 / 60 * 280 / 90)), "快棋 " + n1 + " 幀");
  assert.ok(n0 / n1 > 2.8, "快 3 倍左右");
  const rt = new Function("anims", "t", "ETS", "let A=anims;" + line.replace(/\banims\b/g, "A") + ";return A")([{ t: 0, d: 1, rt: 1, f() {}, end() {} }], .5, 0);
  assert.equal(rt[0].t, .5, "rt（不受停格影響）的動畫照舊");
});
test("06-cpu parkDraw 把快棋模式帶給 3D（ex.blitz＝blzOn()）；pkSwTap：3D 裡排預走、取消預走都不冒「先點你的棋子」提示", () => {
  /* parkDraw：照 test-fb871 的跑法 */
  const fn = cut(CPU, "function parkDraw(", "\n/* =");
  for (const on of [true, false, null]) {
    const drawn = [], el = () => ({ style: {}, hidden: false, children: [], querySelector: () => null, append() {}, prepend() {} }), host = el();
    const pv = { el: {}, say() {}, oppSay() {}, intro() {}, show() {}, draw: (b, o, ex) => drawn.push(ex), destroy() {}, hide() {} }, P = { create: () => pv };
    const env = { parkOn: () => true, window: { XQPark3D: P }, XQPark3D: P, parkLoad: () => Promise.resolve(), toast() {}, store: { get: (k, d) => k === "era" ? "classic" : k === "parkView" ? "" : d, set() {} },
      pkIntroKey: () => "k", parkQuote: () => null, pkGateWatch() {}, parkUi() {}, BOTN: () => "小帥", getComputedStyle: () => ({ position: "relative" }), eraLabel: k => k, PW: {},
      document: { body: { contains: () => true }, createElement: el, querySelector: () => null }, botVis() {}, parkLook: () => ({}), oppFig: x => x, remoteLook: x => x, myLook: () => ({}),
      parkCrowd: () => ({}), pkSwUi() {}, pkGateEat: () => false, pkSwTap() {}, parkInfo() {}, setTimeout() {} };
    if (on !== null) env.blzOn = () => on;
    const names = Object.keys(env), api = new Function(...names, "let PARK=null;" + fn + ";return{parkDraw}")(...names.map(k => env[k]));
    api.parkDraw(host, { svg: { style: {} } }, [], {}, { tap() {} });
    assert.equal(drawn[0].blitz, on === true, "blzOn=" + on);
  }
  /* pkSwTap：用 blitz-measure 的假挑戰電腦畫面（照 08b 掛勾；3D 不再傳 flat:false）當 ex.tap */
  const R = load(), g = MZ.game(R, { id: "p3" }), tips = [];
  const sw = cut(CPU, "let PKSW_T=0;", "\n// 意見回饋 241");
  const host = { querySelector: s => s === ".pk2d" ? { hidden: false, classList: { remove() {}, add() {} }, offsetWidth: 1 } : null, append: x => tips.push(x) };
  const PARK = { host, last: null }, store = { v: {}, get(k, d) { return k in this.v ? this.v[k] : d }, set(k, x) { this.v[k] = x } };
  const doc = { createElement: () => ({ setAttribute() {}, classList: { add() {} }, remove() {} }) };
  const S = new Function("PARK", "store", "document", "setTimeout", sw + ";return{pkSwTap}")(PARK, store, doc, () => {});
  const ex = { tap: i => { g.tap(i); PARK.last = { o: g.o } } };
  return (async () => {
    await g.open(); PARK.last = { o: g.o };
    g.tap(sq("h2")); g.tap(sq("e2")); await flush(); PARK.last = { o: g.o };
    S.pkSwTap(ex, sq("b0")); S.pkSwTap(ex, sq("c2"));
    assert.deepEqual(J(g.o.pre), { f: sq("b0"), t: sq("c2") }, "3D 點兩下排好預走（08b 掛勾不再擋 3D）");
    S.pkSwTap(ex, sq("e5")); assert.equal(R.X.pmvSt().q, null, "再點一下取消");
    assert.equal(tips.length, 0, "排預走、取消預走都不算點偏");
    S.pkSwTap(ex, sq("e5")); assert.equal(tips.length, 1, "真的點空（沒選子、沒預走）照舊提示");
  })();
});

// ====================== ③ 原始碼與文件 ======================
test("〔原始碼〕09b 四個掛勾＋pmvArrive＋線上將死動畫問 blzSkip；送出走 post(\"/pvp/move\")；net.js、07hs-netsig.js 沒有被動到預走", () => {
  for (const s of ['if(pmMe()&&st.turn!==seat&&typeof pmvTap==="function"&&pmvTap(st,seat,i,{redraw:()=>{if(st)render(st)}}))return;',
    'if(pmMe()&&typeof pmvOpts==="function")pmvOpts(st,seat,o);', 'post("/pvp/move",{f,t});return true},pmFire)',
    'pmvLabel(st):""', 'if(seat!=="w")pmFire();', 'if(typeof pmvArrive==="function")pmvArrive()', '&&!(typeof blzSkip==="function"&&blzSkip("killFx"))){const loser='])
    assert.ok(PRE.includes(s), s);
  const NET = rd(path.join(LAB, "src/net.js")), SIG = rd(path.join(M, "07hs-netsig.js"));
  assert.ok(!/pmv|premove/.test(NET) && !/pmv|premove/.test(SIG), "連線、簽名程式不知道預走這回事");
  assert.ok(PM.includes("function pmvArrive(){pmvSt().evAt=pmvNow()}"));
});
test("〔原始碼〕park3d：draw 畫 pkcbPre、帶 BLZ；走子、被吃飛走、黑洞專屬走法與吃子放大縮回都有 k；動畫推進乘 k；markAdd 認得 tris、「預」字牌", () => {
  assert.ok(P3.includes("for(const d of pkcbPre(o,pos))markAdd(d);"));
  assert.ok(P3.includes("gxSet(ex.gx);BLZ=!!ex.blitz;"));
  for (const s of ["anims.push({t:0,d:.42,k:pkbzK(BLZ),", "anims.push({t:0,d:.55,k:pkbzK(BLZ),", "const go=(d,f,end)=>anims.push({t:0,d,k:pkbzK(BLZ),", "anims.push({t:0,d:.22,k:pkbzK(BLZ),", "anims.push({t:0,d:.7,k:pkbzK(BLZ),", "a.t+=(a.rt?t:t*ETS)*(a.k||1);", 'else if(d.k==="tris")', 'd.tx==="pre"?preTex():tagTex()'])
    assert.ok(P3.includes(s), s);
  assert.ok(P3.includes('o.pre?o.pre.f+">"+o.pre.t:""'), "省電判斷：預走變了也算畫面在動");
  assert.ok(P3.includes("const HILL_P=[[-.2,-.06],[4,-.9],[12,-3.6],[26,-9],[46,-18],[76,-32],[120,-52]];"), "雲雨山坡沒動");
  assert.ok(CPU.includes('ex.blitz=typeof blzOn==="function"&&blzOn();'));
});
test("〔原始碼〕blitz.md 兩份逐字一樣、LF；寫了線上對局、3D 園子、千秋盃、3D 動畫縮短與限制", () => {
  const a = fs.readFileSync(path.join(DB, "art/docs/blitz.md"), "utf8"), b = fs.readFileSync(path.join(LAB, "site/data/docs/blitz.md"), "utf8");
  assert.equal(a, b); assert.ok(!a.includes("\r"));
  for (const w of ["線上對局", "3D 園子", "朝代擂台", "千秋盃", "不是作弊", "/pvp/move", "3.1 倍", "pkcbPre"]) assert.ok(a.includes(w), w);
  assert.ok(!/線上對局還沒有預走|3D 園子不做預走/.test(a), "舊的限制拿掉了");
});
