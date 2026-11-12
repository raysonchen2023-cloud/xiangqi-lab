// 11/12 無障礙第 4 輪（評比循環：無障礙專家、UIUX 專家 P16.4／P16.5／P21.3）的自動測試，不開瀏覽器：
//   ① 立體聲方位（m/11c-a11ysnd.js axsPan）：紅方視角最左一欄＝九路＝左聲道、一路＝右聲道、中路置中；翻轉棋盤左右對調；跟 11b axmPos 念的路數一致
//   ② 用假的 AudioContext 跑 axsCue／axsMove：StereoPannerNode 的 pan 值對到那一格；各動作提示音都不一樣；開關、靜音、App 在背景都不發聲
//   ③ 棋鐘提示音（axsClockCue／axsClockTick）：60／30／10 秒、超時各只響一次；時間加回去才會再響；對手那一方只響超時
//   ④ 換頁頁名、載入提示的狀態機（axsPageName、axsLoadStep）、園子地點清單（axsPlaces）
//   ⑤ 接線：01-board 叫 axsMove／axsCue／axsTapCue；m.html 有 include；11b ? 鍵叫 axsHelp；XQDOC 有 tour；a11y-tour.md 兩邊一樣
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SND = rd(path.join(M, "11c-a11ysnd.js")), AX = rd(path.join(M, "11b-a11y.js")), B = rd(path.join(M, "01-board.js")), S = rd(path.join(M, "05-settings.js"));
/* vm 裡建的陣列、物件原型不同，比內容就好 */
const J = x => JSON.parse(JSON.stringify(x)), deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const sect = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b); assert.ok(i > 0 && j > i, "找不到 " + a); return src.slice(src.indexOf("\n", i) + 1, j) };

// 假的 AudioContext：記下建了哪些節點、怎麼接
function fakeAC() {
  const log = { osc: [], pan: [], gain: [] };
  const param = v => ({ value: v, setValueAtTime(x) { this.value = x }, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = extra => Object.assign({ to: [], connect(n) { this.to.push(n); return n } }, extra);
  const ac = {
    currentTime: 1, destination: node({ dest: true }), log,
    createStereoPanner() { const n = node({ kind: "pan", pan: param(0) }); log.pan.push(n); return n },
    createGain() { const n = node({ kind: "gain", gain: param(1) }); log.gain.push(n); return n },
    createOscillator() { const n = node({ kind: "osc", type: "sine", frequency: param(440), started: 0, start(t) { this.started = t }, stop() {} }); log.osc.push(n); return n }
  };
  return ac;
}
function load(opt) {
  opt = opt || {};
  const st = Object.assign({ capSound: true, mvSound: false }, opt.store || {});
  const ctx = {
    console, Map, Set,
    store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } },
    document: { hidden: !!opt.hidden },
    AC: opt.noAC ? null : fakeAC(),
    withAudio: f => f(),
    axmOn: () => !!opt.ax,
    sideOf: p => (p ? (p === p.toUpperCase() ? "r" : "b") : null),
    XQCore: opt.XQCore || { legal: () => [1] }
  };
  vm.createContext(ctx);
  const src = sect(SND, "#AXS-PURE-BEGIN", "/* #AXS-PURE-END */") + "\n" + sect(SND, "#AXS-CORE-BEGIN", "/* #AXS-CORE-END */");
  vm.runInContext(src + "\nthis.R={axsCol,axsFile,axsPan,axsTone,axsSig,AXS_KINDS,axsSpatialOn,axsMuted,axsClockCue,axsPageName,axsLoadStep,axsPlaces,axsOn,axsCue,axsMove,axsTapCue,axsClockTick,axsBusy,axsSt}", ctx, { filename: "11c-a11ysnd(純函式＋核心)" });
  ctx.R.ctx = ctx; ctx.R.st = st;
  return ctx.R;
}
/* f：a～i＝0～8（紅方看出去由左到右），r：0＝紅方底線 */
const sq = (f, r) => (9 - r) * 9 + f;
const panOf = osc => { let n = osc; for (let i = 0; i < 4 && n; i++) { const nx = n.to[0]; if (!nx) return null; if (nx.kind === "pan") return nx.pan.value; if (nx.dest) return 0; n = nx } return null };

// ====================== ① 方位對路數 ======================
test("axsPan：紅方視角 九路（最左）＝左聲道 -0.8、一路（最右）＝右 +0.8、五路置中；每一路一樣寬", () => {
  const R = load({ ax: true });
  assert.equal(R.axsPan(sq(0, 0), false), -0.8);
  assert.equal(R.axsPan(sq(8, 0), false), 0.8);
  assert.equal(R.axsPan(sq(4, 5), false), 0);
  for (let f = 0; f < 9; f++) assert.equal(R.axsPan(sq(f, 3), false), Math.round((f - 4) / 4 * 0.8 * 1000) / 1000);
  assert.equal(R.axsPan(-1, false), 0); assert.equal(R.axsPan(null, false), 0); assert.equal(R.axsPan(90, false), 0);
});
test("axsPan：翻轉棋盤（執黑）左右對調；路數跟 11b axmPos 念的一樣（一路在右）", () => {
  const R = load({ ax: true });
  for (let i = 0; i < 90; i++) assert.equal(R.axsPan(i, true), -R.axsPan(i, false) || 0);
  assert.equal(R.axsFile(sq(8, 0), false), 1); assert.equal(R.axsFile(sq(0, 0), false), 9);
  assert.equal(R.axsFile(sq(8, 0), true), 9);
  // 11b 的 axmPos(k)：k＝畫面格號，九路在最左（k%9＝0）
  const i = AX.indexOf("#AXM-PURE-BEGIN"), j = AX.indexOf("/* #AXM-PURE-END */"), c = { console }; vm.createContext(c);
  vm.runInContext(AX.slice(AX.indexOf("\n", i) + 1, j) + "\nthis.P=axmPos", c);
  for (let k = 0; k < 90; k++) { const file = "一二三四五六七八九".indexOf(c.P(k)[0][0]) + 1; assert.equal(file, R.axsFile(k, false), "格 " + k) }
});

// ====================== ② 假 AudioContext ======================
test("axsCue：StereoPannerNode 的 pan 值＝那一格的方位；翻轉就反過來；sq＝-1 不接方位", () => {
  const R = load({ ax: true }), ac = R.ctx.AC;
  assert.equal(R.axsCue("move", sq(1, 0), false), true);
  assert.equal(ac.log.pan.length, 1); assert.equal(ac.log.pan[0].pan.value, R.axsPan(sq(1, 0), false));
  assert.ok(ac.log.pan[0].pan.value < 0, "八路在左邊");
  assert.ok(ac.log.pan[0].to.includes(ac.destination), "方位接到喇叭");
  assert.equal(panOf(ac.log.osc[0]), ac.log.pan[0].pan.value, "振盪器一路接到這個方位");
  R.axsCue("move", sq(1, 0), true);
  assert.equal(ac.log.pan[1].pan.value, -ac.log.pan[0].pan.value);
  const n = ac.log.pan.length; R.axsCue("turn", -1, false); assert.equal(ac.log.pan.length, n, "輪到你置中，不建方位節點");
});
test("各動作提示音都不一樣（選子、落子、吃子、將軍、走不了、輪到你、對方走完、時間快到、超時）", () => {
  const R = load({ ax: true });
  const kinds = ["select", "move", "capture", "check", "illegal", "turn", "opp", "timelow", "timeout"];
  deq([...R.AXS_KINDS], kinds);
  const sig = kinds.map(k => R.axsSig(k));
  assert.ok(sig.every(Boolean)); assert.equal(new Set(sig).size, kinds.length, "每一種都不同");
  // 真的播出來的振盪器頻率、波形也不同
  const heard = kinds.map(k => { const r = load({ ax: true }); r.axsCue(k, sq(4, 0), false); return r.ctx.AC.log.osc.map(o => o.type + o.frequency.value).join(",") });
  assert.equal(new Set(heard).size, kinds.length);
  for (const k of kinds) for (const [f, , d, v] of R.axsTone(k).n) assert.ok(f > 100 && f < 2000 && d > 0 && d < .6 && v > 0 && v <= 1, k);
});
test("開關：沒選過＝跟著螢幕報讀模式；勾了一般模式也開、取消了螢幕報讀模式也關", () => {
  assert.equal(load({ ax: true }).axsOn(), true);
  assert.equal(load({ ax: false }).axsOn(), false);
  assert.equal(load({ ax: false, store: { axSnd: true } }).axsOn(), true);
  assert.equal(load({ ax: true, store: { axSnd: false } }).axsOn(), false);
  const off = load({ ax: false });
  assert.equal(off.axsCue("move", 0, false), false); assert.equal(off.ctx.AC.log.osc.length, 0);
  assert.equal(off.axsMove({ to: 0, side: "r", me: "r" }), false, "一般模式交回原本的 moveSound");
});
test("靜音：走子音效、吃子音效都關＝不響；App 在背景不響；只開其中一個照響", () => {
  const m = load({ ax: true, store: { capSound: false, mvSound: false } });
  assert.equal(m.axsCue("move", 0, false), false); assert.equal(m.axsMove({ to: 0, side: "r", me: "r" }), false); assert.equal(m.ctx.AC.log.osc.length, 0);
  const h = load({ ax: true, hidden: true });
  assert.equal(h.axsCue("move", 0, false), false); assert.equal(h.ctx.AC.log.osc.length, 0);
  const a = load({ ax: true, store: { capSound: false, mvSound: true } }); a.axsCue("move", 0, false); assert.ok(a.ctx.AC.log.osc.length > 0);
  const na = load({ ax: true, noAC: true }); assert.doesNotThrow(() => na.axsCue("move", 0, false));
  assert.equal(load({ ax: true }).axsMuted(() => false), true);
});
test("axsMove：自己走＝落子／吃子；對方走＝對方走完＋輪到你；將軍在被將的那一格響；將死不再說輪到你", () => {
  const types = r => r.ctx.AC.log.osc.map(o => o.type + o.frequency.value);
  const tone = (r, k) => r.axsTone(k).n.map(x => r.axsTone(k).w + x[0]);
  let r = load({ ax: true }); assert.equal(r.axsMove({ to: sq(2, 2), flip: false, side: "r", me: "r", ck: -1 }), true);
  deq(types(r), tone(r, "move")); assert.equal(r.ctx.AC.log.pan[0].pan.value, r.axsPan(sq(2, 2), false));
  r = load({ ax: true }); r.axsMove({ to: sq(2, 2), side: "r", me: "r", cap: true, ck: -1 }); deq(types(r), tone(r, "capture"));
  r = load({ ax: true }); r.axsMove({ to: sq(7, 7), side: "b", me: "r", ck: -1 }); deq(types(r), [...tone(r, "opp"), ...tone(r, "turn")]);
  r = load({ ax: true }); r.axsMove({ to: sq(7, 7), side: "b", me: "r", cap: true, ck: sq(3, 0), board: [] });
  deq(types(r), [...tone(r, "opp"), ...tone(r, "capture"), ...tone(r, "check"), ...tone(r, "turn")]);
  assert.equal(r.ctx.AC.log.pan[2].pan.value, r.axsPan(sq(3, 0), false), "將軍在帥那一格（帥在六路＝偏左）");
  assert.ok(r.ctx.AC.log.pan[2].pan.value < 0 && r.ctx.AC.log.pan[0].pan.value > 0, "對方走到右邊、帥在左邊");
  const b = []; b[sq(4, 0)] = "K";
  r = load({ ax: true, XQCore: { legal: () => [] } }); r.axsMove({ to: sq(4, 1), side: "b", me: "r", ck: sq(4, 0), board: b });
  assert.ok(!types(r).join().includes(tone(r, "turn").join()), "將死不念輪到你");
  r = load({ ax: true }); r.axsMove({ to: sq(0, 9), side: "b", me: null, ck: -1 }); deq(types(r), tone(r, "move"), "看棋譜：只有落子聲");
  // 提示音一個接一個，不疊在同一時間
  r = load({ ax: true }); r.axsMove({ to: sq(7, 7), side: "b", me: "r", cap: true, ck: sq(4, 0), board: [] });
  const t = r.ctx.AC.log.osc.map(o => o.started); for (let i = 1; i < t.length; i++) assert.ok(t[i] >= t[i - 1], "時間照順序");
});
test("axsTapCue：選了子之後點不能走的空格、對方的子＝走不了；點可走的點、自己另一顆、同一顆都不響", () => {
  const b = []; b[sq(1, 2)] = "C"; b[sq(7, 2)] = "C"; b[sq(1, 9)] = "r";
  const o = { sel: sq(1, 2), targets: [sq(1, 3), sq(1, 9)] };
  let r = load({ ax: true }); assert.equal(r.axsTapCue(sq(5, 5), b, o, false), true);
  assert.equal(r.ctx.AC.log.pan[0].pan.value, r.axsPan(sq(5, 5), false));
  const ill = r.axsTone("illegal").n.map(x => r.axsTone("illegal").w + x[0]); deq(r.ctx.AC.log.osc.map(o => o.type + o.frequency.value), ill);
  for (const t of [sq(1, 3), sq(1, 9), sq(7, 2), sq(1, 2)]) { r = load({ ax: true }); assert.equal(r.axsTapCue(t, b, o, false), false, "格 " + t); assert.equal(r.ctx.AC.log.osc.length, 0) }
  r = load({ ax: true }); assert.equal(r.axsTapCue(sq(5, 5), b, {}, false), false, "還沒選子不響");
});

// ====================== ③ 棋鐘 ======================
test("axsClockCue：60／30／10 秒各響一次 timelow，0 秒 timeout；一秒一秒走、跳過好幾個門檻都只響一次", () => {
  const R = load({ ax: true }), f = new Set(), got = [];
  let prev = 65; for (let s = 64; s >= 0; s--) { const c = R.axsClockCue(prev, s, f); if (c) got.push(c.kind + c.t); prev = s }
  deq(got, ["timelow60", "timelow30", "timelow10", "timeout0"]);
  assert.equal(R.axsClockCue(0, 0, f), null, "停在 0 不再響");
  const g = new Set(); deq(R.axsClockCue(40, 5, g), { kind: "timelow", t: 10 }); deq([...g].sort((a, b) => a - b), [10, 30]);
  assert.equal(R.axsClockCue(9, 8, g), null, "已經響過");
  assert.equal(R.axsClockCue(null, 8, g), null); assert.equal(R.axsClockCue(8, null, g), null);
});
test("axsClockCue：時間加回去（下一盤、加秒）才清掉比現在少的門檻，之後再跨過會再響", () => {
  const R = load({ ax: true }), f = new Set();
  R.axsClockCue(11, 10, f); assert.ok(f.has(10));
  assert.equal(R.axsClockCue(10, 25, f), null); assert.ok(!f.has(10), "加到 25 秒，10 秒的門檻清掉");
  deq(R.axsClockCue(11, 10, f), { kind: "timelow", t: 10 });
  R.axsClockCue(70, 61, f); R.axsClockCue(61, 60, f); assert.ok(f.has(60));
  assert.equal(R.axsClockCue(60, 900, f), null); assert.equal(f.size, 0, "新的一盤全部清掉");
});
test("axsClockTick：你（pBot）響時間快到和超時；對手（pTop）只響超時；同一門檻只發一次聲", () => {
  const R = load({ ax: true }), ac = R.ctx.AC;
  R.axsClockTick("pBot", 31); const c = R.axsClockTick("pBot", 30); assert.equal(c.kind, "timelow");
  const n = ac.log.osc.length; assert.equal(n, R.axsTone("timelow").n.length);
  R.axsClockTick("pBot", 30); R.axsClockTick("pBot", 29); assert.equal(ac.log.osc.length, n, "30 秒那聲只響一次");
  R.axsClockTick("pTop", 31); assert.equal(R.axsClockTick("pTop", 30), null, "對手的時間快到不響");
  R.axsClockTick("pTop", 1); assert.equal(R.axsClockTick("pTop", 0).kind, "timeout");
  assert.equal(ac.log.osc.length, n + R.axsTone("timeout").n.length);
  const off = load({ ax: false }); off.axsClockTick("pBot", 11); off.axsClockTick("pBot", 10); assert.equal(off.ctx.AC.log.osc.length, 0, "沒開不響");
});

// ====================== ④ 頁名、載入、園子清單 ======================
test("axsPageName：頂欄標題去掉圖示；沒標題用網址對照；首頁", () => {
  const R = load({ ax: true }), place = h => ({ "#/db": "棋譜" })[h] || "";
  assert.equal(R.axsPageName("📚 棋譜庫", "#/db", place), "棋譜庫");
  assert.equal(R.axsPageName("  ⚔  觀星閣 ", "#/hub/battle", place), "觀星閣");
  assert.equal(R.axsPageName("", "#/db", place), "棋譜");
  assert.equal(R.axsPageName("象棋千秋", "#/db", place), "棋譜");
  assert.equal(R.axsPageName("象棋千秋", "#/", place), "首頁");
  assert.equal(R.axsPageName("", "#/zzz", place), "象棋千秋");
});
test("axsLoadStep：超過 0.8 秒才念「載入中…」，好了念「載入完成」；很快就好不念；標籤跟著工作", () => {
  const R = load({ ax: true }), S = { since: 0, said: false, label: "" };
  assert.equal(R.axsLoadStep(S, true, 1000), ""); assert.equal(R.axsLoadStep(S, true, 1500), "");
  assert.equal(R.axsLoadStep(S, true, 1800), "載入中…"); assert.equal(R.axsLoadStep(S, true, 5000), "", "只念一次");
  assert.equal(R.axsLoadStep(S, false, 6000), "載入完成"); assert.equal(R.axsLoadStep(S, false, 6400), "");
  assert.equal(R.axsLoadStep(S, true, 7000), ""); assert.equal(R.axsLoadStep(S, false, 7300), "", "0.3 秒就好：都不念");
  assert.equal(R.axsLoadStep(S, true, 8000, "象棋引擎下載"), ""); assert.equal(R.axsLoadStep(S, true, 9000, "象棋引擎下載"), "象棋引擎下載中…");
  assert.equal(R.axsLoadStep(S, false, 20000), "象棋引擎下載完成");
});
test("axsBusy：工作進行中算忙，完成或失敗都移掉", async () => {
  const R = load({ ax: true }), S = R.axsSt();
  let ok, no; const p1 = new Promise(r => { ok = r }), p2 = new Promise((r, j) => { no = j });
  assert.equal(R.axsBusy("象棋引擎載入", p1), p1); R.axsBusy("x", p2).catch(() => {});
  deq([...S.tasks.values()], ["象棋引擎載入", "x"]);
  ok(); no(new Error("x")); await new Promise(r => setTimeout(r, 5));
  assert.equal(S.tasks.size, 0);
  assert.equal(R.axsBusy("y", null), null);
});
test("axsPlaces：照由近到遠，附在哪裡；名字照那一朝（PARK_INFO）", () => {
  const R = load({ ax: true }), src = rd(path.join(M, "06-cpu.js")), m = src.match(/const PARK_INFO=(\{.*?\});\n/s);
  assert.ok(m, "06-cpu 有 PARK_INFO"); const P = vm.runInNewContext("(" + m[1] + ")");
  const L = R.axsPlaces(P.classic);
  deq(L.map(x => x.k), ["mate", "table", "cup", "opp", "stool", "bench", "lantern", "tree1", "tree2", "bg"]);
  assert.equal(L.find(x => x.k === "table").name, P.classic.table[0]); assert.equal(L.find(x => x.k === "table").where, "正中間，下棋的桌子");
  for (const e of Object.keys(P)) { const l = R.axsPlaces(P[e]); assert.equal(l.length, 10, e); for (const x of l) assert.ok(x.name && x.where, e + " " + x.k) }
  deq(R.axsPlaces(null).map(x => x.k), ["mate", "opp"]);
});

// ====================== ⑤ 接線 ======================
test("〔原始碼〕01-board：選子叫 axsCue、走完一步先問 axsMove（沒接手才 moveSound）、點選叫 axsTapCue；11b ? 鍵叫 axsHelp", () => {
  assert.match(B, /axsCue\(n\?"select":"illegal",o\.sel,flip\)/);
  assert.match(B, /if\(!\(typeof axsMove==="function"&&axsMove\(\{to:L\.t,flip,cap:!!prevB\[L\.t\],side:sideOf\(board\[L\.t\]\),me:[^}]*ck:o\.check>=0\?o\.check:-1,board\}\)\)\)moveSound\(!!prevB\[L\.t\]\)/);
  assert.match(B, /if\(typeof axsTapCue==="function"\)axsTapCue\(sq,lastBoard,lastO,flip\);onTap\(sq\)/);
  assert.match(AX, /typeof axsHelp==="function"\)axsHelp\(\)/);
  assert.match(AX, /typeof axsSetRow==="function"\?axsSetRow\(\):""/);
  assert.match(rd(path.join(DB, "m.html")), /\/\/#include m\/11b-a11y\.js\n\/\/#include m\/11c-a11ysnd\.js/);
});
test("〔原始碼〕空間導覽：XQDOC 有 tour；a11y-tour.md 兩邊一樣、寫到首頁、茶肆、大廳、棋譜庫、園子和園子地點清單；不含會被當成載入提示的字", () => {
  assert.match(S, /tour:\["a11y-tour","🧭 空間導覽"\]/);
  const A = rd(path.join(DB, "art/docs/a11y-tour.md")), Bm = rd(path.join(LAB, "site/data/docs/a11y-tour.md"));
  assert.equal(A, Bm, "art/docs 和 site/data/docs 要同步");
  for (const w of ["首頁", "茶肆", "大廳", "棋譜庫", "園子", "園子地點清單", "Tab", "左", "右", "**G**", "實機"]) assert.ok(A.includes(w), "導覽要寫到「" + w + "」");
  assert.ok(!/載入中|讀取中|下載中/.test(A), "導覽打開時不能被當成還在載入");
  assert.ok(!/載入中|讀取中|下載中/.test(sect(SND, "/* ---------- 以下接到畫面", "/* P21.3 長時間載入")), "自己的說明卡、清單也不能");
});
test("〔原始碼〕11c 只有長行裡沒有 // 註解、名字都是 axs 開頭、不跟其他模組撞名", () => {
  for (const ln of SND.split("\n")) if (ln.length > 120) assert.ok(!/(^|[^:"'\\])\/\/[^#]/.test(ln.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "")), "長行有 // 註解：" + ln.slice(0, 60));
  const names = [...SND.matchAll(/^(?:function|const|var|let) ([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  /* 第 6 輪 F3：音量分類（sxm 開頭，01-board 的匯流排也是 sxm）放在 11c，允許 sxm 前綴；一樣要不撞名 */
  assert.ok(names.length > 10); for (const n of names) assert.match(n, /^(axs|AXS|sxm)/, n);
  const others = fs.readdirSync(M).filter(f => /\.js$/.test(f) && f !== "11c-a11ysnd.js").map(f => rd(path.join(M, f))).join("\n");
  for (const n of names) assert.ok(!new RegExp("(?:function|const|let|var)\\s+" + n.replace(/\$/g, "\\$") + "\\b").test(others), "撞名：" + n);
});
