"use strict";
// 弱網長測（評比第 15 輪 X4，評審 P22.1、P22.2、P22.5、P31.3）：用 tools/net-harness.js 的假 MQTT 伺服器＋假時鐘，vm 載入真正的 src/net.js，
//   兩支手機（加一位觀眾）連續下好幾個小時（下完一盤就「再來一局」交換紅黑），中間照設定加上：高延遲、掉包、重複、亂序、反覆斷線重連、
//   單邊長時間離線又回來、手機時鐘偏差（含中途被調時間）。每支手機由一個「棋手」照自己畫面上的局面下棋（每步想幾秒、挑合法著法、
//   下到一定步數就認輸或提和，對方看到提和就同意），所以網路造成的分岔、補步、競逐都是真的照 net.js 的規則跑出來的。
// 量的東西：每盤最後四方（紅、黑、觀眾、伺服器保留的）是否一字不差（一致率）、對方落子到這支手機收到的時間分佈（補步時間）、
//   超時判負分成「被判的那方正好斷線中（規則內）」和「被判的那方一直在線（誤判）」、戰績是否雙方一致各記一次、可疑事件數，
//   以及每 30 分鐘抽樣一次的計時器數、localStorage 大小、除錯事件數、伺服器保留訊息數、Node 記憶體（看有沒有越跑越多）。
// 亂數全部用固定種子（網路、棋手、手機裡的 Math.random、手機裡的 Date 都接假時鐘），同一個種子的結果可重現。
//   11/13 起 net-harness.js 照呼叫的順序交回 WebCrypto 的結果：以前要看電腦當下忙不忙（單獨跑和旁邊有別的程式在跑，「反覆斷線」一次全過、一次有一盤沒收斂），
//   現在結果只看種子，單獨跑或同時跑都一樣；那次沒收斂是 net.js 真的有的分岔（revTie 的 _pm、revPick 的判超時順位），已修。
// 不連正式或測試伺服器、不發任何真的訊息、不開瀏覽器。
// 用法：
//   node xiangqi-lab/tools/net-longrun.js                 完整長測（6 種情境，各模擬 2～6 小時；約幾分鐘）
//   node xiangqi-lab/tools/net-longrun.js --only 斷線      只跑名稱含「斷線」的情境
//   node xiangqi-lab/tools/net-longrun.js --scale 0.25    每種情境的模擬時數乘 0.25（快速版）
//   node xiangqi-lab/tools/net-longrun.js --json          每種情境印一行原始數字（JSON）
// 測試 tools/test-threat-weaknet.js 只跑縮短版（同一套程式、時數較短）。
const { C, phone, seeded, J, world } = require("./net-harness.js");
const vm = require("vm");

const MIN = 60000, HOUR = 60 * MIN, TURN_MS = 3 * MIN;
/* 情境：hours＝模擬多久；lat＝每段（手機↔伺服器）的基本延遲；chaos＝對局、上線、邀請等 PUBLISH 封包的掉包／重複／亂序／再加 0～jitter 毫秒；
   flap＝每隔 every 分鐘（範圍）某支手機斷網 down 毫秒；off＝單邊長時間離線（who、次數、分鐘範圍）；skew＝甲、乙兩支手機的時鐘偏差（毫秒）、jump＝中途某支手機的時間被調多少；
   think＝每步想幾秒（範圍）；plies＝每盤下到幾步開始收尾（範圍） */
const SCENARIOS = [
  { name: "高延遲：每段 0.5 秒＋0～2 秒（端到端約 1～5 秒）", hours: 4, seed: 1501, lat: 500, chaos: { drop: 0, dup: 0, reorder: 0.2, jitter: 2000 } },
  { name: "丟包 40%＋重複 15%＋亂序 30%＋0～1.5 秒", hours: 3, seed: 1502, lat: 100, chaos: { drop: 0.4, dup: 0.15, reorder: 0.3, jitter: 1500 } },
  { name: "反覆斷線重連：每 2～6 分鐘斷網 30 秒＋丟包 10%", hours: 6, seed: 1503, lat: 150, chaos: { drop: 0.1, dup: 0.05, reorder: 0.1, jitter: 600 }, flap: { every: [2, 6], down: 30000 } },
  { name: "單邊長時間離線又回來：乙那支手機斷 5 次、每次 4～9 分鐘", hours: 3, seed: 1504, lat: 150, chaos: { drop: 0.1, dup: 0.05, reorder: 0.1, jitter: 600 }, off: { who: "K", n: 5, mins: [4, 9] } },
  { name: "手機時鐘偏差：甲快 7 分 13 秒、乙慢 4 分 40 秒，中途乙被調快 2 小時", hours: 2, seed: 1505, lat: 150, chaos: { drop: 0.1, dup: 0.05, reorder: 0.1, jitter: 600 }, skew: { A: 433000, K: -280000, jump: { at: 0.5, who: "K", by: 2 * HOUR } } },
  { name: "全部一起：高延遲＋丟包 25%＋反覆斷線＋長時間離線＋時鐘偏差", hours: 6, seed: 1506, lat: 400, chaos: { drop: 0.25, dup: 0.1, reorder: 0.25, jitter: 1600 }, flap: { every: [3, 8], down: 30000 }, off: { who: "A", n: 3, mins: [4, 8] }, skew: { A: -150000, K: 95000, jump: { at: 0.6, who: "A", by: -10 * MIN } } }
];

/* 手機時鐘偏差：這支手機的 Date.now()、new Date() 都是「假時鐘＋偏差」（偏差可以中途改：P.skew(ms)，記在 P.jumps）；
   performance.now() 是單調的假時鐘（不受偏差影響，跟瀏覽器一樣），net.js 拿它發現「牆上時間被往回調」 */
function skewable(P) {
  P.ctx.__SK = 0; P.jumps = [];
  vm.runInContext("(function(){const D=Date,N=()=>__S.now+(__SK||0);class F extends D{constructor(...a){if(a.length)super(...a);else super(N())}static now(){return N()}}globalThis.Date=F;globalThis.performance={now:()=>__S.now-1.7e12}})()", P.ctx);
  P.skew = ms => { if (P.ctx.__SK !== ms) P.jumps.push([P.ctx.__S.now, ms - P.ctx.__SK]); P.ctx.__SK = ms };
}
const pct = (a, p) => { if (!a.length) return null; const s = a.slice().sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(p * s.length))] };
const dist = a => ({ n: a.length, p50: pct(a, .5), p90: pct(a, .9), p99: pct(a, .99), max: a.length ? Math.max(...a) : null });
const coreOf = g => g && JSON.stringify([g.id, g.red && g.red.id, g.black && g.black.id, g.moves, g.result || null, g.draw || null]);

/* 一個棋手：只看自己這支手機畫面上的局面（P.net.game()），輪到自己就想一下再走；下到 target 步以後：一半認輸、一半走完這步再提和；看到對方提和就同意 */
function player(S, P, seed, ctl) {
  const rnd = seeded(seed), think = ctl.think || [2000, 20000];
  let wait = null;
  const keyOf = g => g.id + "|" + g.moves.length + "|" + (g.draw || "") + "|" + (g.result ? 1 : 0);
  function act(k) {
    wait = null; if (ctl.stop) return;
    const g = P.net.game(), sd = P.net.side(); if (!g || !sd || g.result || keyOf(g) !== k) return look();
    const opp = sd === "r" ? "b" : "r", n = g.moves.length, turn = n % 2 ? "b" : "r";
    if (g.draw === opp) { P.net.update(x => { x.result = { w: null, why: "雙方同意和棋" }; x.draw = null }); ctl.acts++; return }
    if (turn !== sd) return;
    const st = { moves: [] }; C.stateRebuild(st); for (const [a, b] of g.moves) C.stateApply(st, a, b);
    const end = n >= ctl.target(g.id);
    const L = C.legal(st.board, st.turn).filter(([f, t]) => { const T = { moves: [] }; C.stateRebuild(T); for (const [a, b] of g.moves) C.stateApply(T, a, b); C.stateApply(T, f, t); return !C.judgeState(T) && C.legal(T.board, T.turn).length > 0 });
    if (!L.length || (end && rnd() < .5)) { P.net.update(x => { x.result = { w: opp, why: (sd === "r" ? "紅方" : "黑方") + "認輸" }; x.draw = null }); ctl.acts++; return }
    const m = L[Math.floor(rnd() * L.length)];
    let flagged = false;
    P.net.update(x => { if (P.net.tickMove(x, sd) === false) { flagged = true; return } x.moves.push(m); x.draw = null });
    ctl.acts++; if (flagged) { ctl.selfFlag++; return }
    if (end) P.net.update(x => { x.draw = sd });
  }
  function look() {
    if (ctl.stop) return;
    const g = P.net.game(), sd = P.net.side(); if (!g || !sd || g.result) return;
    const opp = sd === "r" ? "b" : "r", turn = g.moves.length % 2 ? "b" : "r";
    if (!(g.draw === opp || turn === sd)) return;
    const k = keyOf(g); if (wait && wait.k === k) return;
    if (wait) S.clear(wait.id);
    wait = { k, id: S.add(() => act(k), Math.round(think[0] + rnd() * (think[1] - think[0])), 0, "bot:" + P.tag) };
  }
  P.net.on("game", () => look());
  S.add(look, 2000, 2000, "bot:" + P.tag);
  return { look };
}

/* 開一盤：甲邀請乙，收不到就重邀（記次數） */
async function open(S, B, A, K) {
  for (let i = 1; i <= 20; i++) {
    let inv = null; const off = K.net.on("invite", x => { inv = x });
    A.net.invite({ id: K.id, name: "乙" }); await S.until(() => !!inv, 15000); off();
    if (inv) { K.net.respond(inv, true); if (await S.until(() => !!(A.net.game() && K.net.game()), 20000)) return i }
  }
  return 0;
}

async function longRun(sc, o) {
  o = o || {};
  const hours = sc.hours * (o.scale || 1), seed = sc.seed + (o.seedAdd || 0);
  const { S, B } = world(); B.lat = sc.lat || 20;
  const rnd = seeded(seed * 13 + 7);
  const A = phone(S, B, { id: "aaaa1111", name: "甲", seed: seed * 7 + 1 }), K = phone(S, B, { id: "bbbb2222", name: "乙", seed: seed * 7 + 2 });
  const W = phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp", seed: seed * 7 + 3 });
  for (const P of [A, K, W]) skewable(P);
  if (sc.skew) { A.skew(sc.skew.A || 0); K.skew(sc.skew.K || 0) }
  const PH = { A, K, W };
  /* 斷網紀錄：[開始, 結束]（結束＝null 表示還沒回來） */
  const OFF = new Map([[A, []], [K, []], [W, []]]);
  const goOff = (P, ms, fire) => { if (!P.netOk) return; P.offline(); const r = [S.now, null]; OFF.get(P).push(r); S.add(() => { P.online(); r[1] = S.now; if (fire) P.fire("online") }, ms, 0, "sim") };
  A.net.start(); K.net.start(); W.net.start(); await S.run(3000);
  const tries = await open(S, B, A, K);
  if (!tries) return { name: sc.name, seed, fatal: "開不了局（重邀 20 次都失敗）", errors: S.errors.slice(0, 5) };
  const gid = A.net.game().gid; W.net.watch(gid); await S.run(3000);
  const t0 = S.now, END = t0 + hours * HOUR;
  if (sc.chaos) B.setChaos({ ...sc.chaos, seed });
  /* 網路事件排程 */
  const ev = { flaps: 0, offs: 0, jumps: 0 };
  if (sc.flap) {
    const next = () => { const [a, b] = sc.flap.every; S.add(() => { if (S.now >= END) return; const P = rnd() < .5 ? A : K; if (P.netOk) { ev.flaps++; goOff(P, sc.flap.down, rnd() < .5) } next() }, Math.round((a + rnd() * (b - a)) * MIN), 0, "sim") };
    next();
  }
  if (sc.off) for (let i = 0; i < sc.off.n; i++) {
    const at = (i + 0.3 + rnd() * 0.4) * (hours * HOUR) / sc.off.n, [a, b] = sc.off.mins, ms = Math.round((a + rnd() * (b - a)) * MIN);
    S.add(() => { ev.offs++; const P = PH[sc.off.who]; if (P.netOk) goOff(P, ms, rnd() < .5); else S.add(() => goOff(P, ms, true), 60000, 0, "sim") }, Math.round(at), 0, "sim");
  }
  if (sc.skew && sc.skew.jump) { const j = sc.skew.jump; S.add(() => { ev.jumps++; const P = PH[j.who]; P.skew(P.ctx.__SK + j.by) }, Math.round(j.at * hours * HOUR), 0, "sim") }
  /* 每支手機每盤每一步第一次出現在畫面上的時間；每盤第一次出現結果的時間 */
  const seen = new Map(), firstRes = new Map(), mover = new Map();
  for (const P of [A, K, W]) P.net.on("game", () => {
    const g = P.net.game(); if (!g || !g.id) return;
    const k = P.tag + "|" + g.id, have = seen.get(k) || 0;
    for (let i = have + 1; i <= g.moves.length; i++) { seen.set(P.tag + "|" + g.id + "|" + i, S.now); const sd = (i - 1) % 2 ? "b" : "r"; if (P !== W && P.net.side() === sd && !mover.has(g.id + "|" + i)) mover.set(g.id + "|" + i, { P, at: S.now }) }
    if (g.moves.length > have) seen.set(k, g.moves.length);
    if (g.result) { const rk = g.id + "|" + JSON.stringify(g.result) + "|" + g.moves.length; if (!firstRes.has(rk)) firstRes.set(rk, S.now) }   /* 同一盤可能先出現一個結果、後來被改判（斷線中落的子送到）：照最後那個結果第一次出現的時間算 */
  });
  const ctl = { stop: false, acts: 0, selfFlag: 0, think: sc.think || [2000, 20000] };
  const tgt = new Map(); ctl.target = id => { if (!tgt.has(id)) { const [a, b] = sc.plies || [40, 140]; tgt.set(id, a + Math.floor(rnd() * (b - a))) } return tgt.get(id) };
  player(S, A, seed * 17 + 1, ctl); player(S, K, seed * 17 + 2, ctl);
  /* 抽樣：每 30 分鐘 */
  const mem = [];
  const sample = () => {
    const tm = P => { let n = 0; for (const t of S.T.values()) if (t.owner === P.tag) n++; return n };
    const lsB = P => { let n = 0; for (const [k, v] of P.storage.map) n += k.length + v.length; return n };
    const dbg = A.net.linkDebug();
    mem.push({ t: Math.round((S.now - t0) / MIN), timers: [tm(A), tm(K), tm(W)], ls: [lsB(A), lsB(K), lsB(W)], ev: dbg ? dbg.ev.length : null, sus: [A, K, W].reduce((s, P) => s + P.net.suspicious().length, 0), retained: B.retained.size, conns: B.conns.size, heapMB: Math.round(process.memoryUsage().heapUsed / 1048576) });
    B.log.splice(0, B.log.length);   /* 假伺服器自己的紀錄，不是 App 的；清掉免得長測吃記憶體 */
  };
  sample(); S.add(sample, 30 * MIN, 30 * MIN, "sim");
  const games = []; let stuck = 0, rematchFail = 0, k = 0;
  const views = () => [A.net.game(), K.net.game(), W.net.game(), B.game(gid)];
  const agree = () => { const v = views(); if (v.some(g => !g)) return false; const c = coreOf(v[0]); return !!v[0].result && v.every(g => coreOf(g) === c) };
  for (;;) {
    const id0 = A.net.game().id;
    const ok = await S.until(() => agree(), Math.max(45 * MIN, END - S.now + 45 * MIN));
    const g = A.net.game();
    if (!ok) { stuck++; games.push({ id: id0, ok: false, views: views().map(x => x ? { id: x.id, n: x.moves.length, res: x.result || null } : null) }); break }
    await S.run(15000);
    if (!agree() || A.net.game().id !== g.id) continue;   /* 還在變（例如斷線中落的子剛送到、改判）：繼續等 */
    const r = g.result, tr = firstRes.get(g.id + "|" + JSON.stringify(r) + "|" + g.moves.length) || S.now;
    const row = { id: g.id, ok: true, plies: g.moves.length, res: r.timeout ? "timeout" : r.abort ? "abort" : r.w == null ? "draw" : "resign", conv: S.now - 15000 - tr };
    if (r.timeout) {
      const loser = r.w === "r" ? "b" : "r", lid = loser === "r" ? g.red.id : g.black.id, LP = lid === A.id ? A : K;
      const offNear = OFF.get(LP).some(([s, e]) => s <= tr && (e == null || e >= tr - TURN_MS - 60000));
      const jumpNear = (LP.jumps || []).some(([t, by]) => by > 0 && t <= tr && t >= tr - TURN_MS - 60000);   /* 被判的那支手機時間剛被往前調（net.js 刻意不補，見 threat-model.md） */
      row.flag = offNear ? "rule" : jumpNear ? "clock" : "misjudge"; row.flagWho = LP === A ? "A" : "K"; row.tr = Math.round((tr - t0) / 1000);
    }
    /* 威脅模型 T11：影子鐘（第一版只記錄）這盤雙方各量到的對方用時 sh、對方棋鐘自己扣的 cl、單步最大差 max（校準用） */
    row.sh = [A, K].map(P => { const x = P.net.shadow(); return { n: x.n, sh: x.sh, cl: x.cl, ncl: x.ncl, max: x.max } });
    games.push(row);
    if (S.now >= END) break;
    await S.run(Math.round(5000 + rnd() * 15000));
    if (!agree()) continue;
    k++; const R = rnd() < .5 ? A : K;
    R.net.update(n => { const t = n.red; n.red = n.black; n.black = t; n.moves = []; n.result = null; n.draw = null; n.id = "rm" + String(k).padStart(3, "0") });
    if (!(await S.until(() => [A, K].every(P => { const x = P.net.game(); return x && x.id === "rm" + String(k).padStart(3, "0") }), 20 * MIN))) { rematchFail++; break }
  }
  ctl.stop = true; sample();
  /* 補步時間：對方（或觀眾）收到這一步的時間 − 下這步的那支手機畫面上出現的時間 */
  const lagO = [], lagW = [];
  for (const [key, m] of mover) {
    const [id, i] = [key.slice(0, key.lastIndexOf("|")), key.slice(key.lastIndexOf("|") + 1)];
    const O = m.P === A ? K : A, to = seen.get(O.tag + "|" + id + "|" + i), tw = seen.get(W.tag + "|" + id + "|" + i);
    if (to != null) lagO.push(to - m.at); if (tw != null) lagW.push(tw - m.at);
  }
  /* 戰績：每盤（不是中止的）兩支手機各記一筆、結果互補 */
  let histBad = 0; const ha = A.hist(), hk = K.hist();
  for (const x of games.filter(x => x.ok && x.res !== "abort")) {
    const a = ha.filter(h => h.rid === x.id), b = hk.filter(h => h.rid === x.id);
    const okp = a.length === 1 && b.length === 1 && ((a[0].res === "d" && b[0].res === "d") || (a[0].res === "w" && b[0].res === "l") || (a[0].res === "l" && b[0].res === "w"));
    if (!okp) histBad++;
  }
  const done = games.filter(x => x.ok), flags = done.filter(x => x.res === "timeout");
  return {
    name: sc.name, seed, simH: +((S.now - t0) / HOUR).toFixed(2), tries, games: games.length, consistent: done.length, stuck, rematchFail,
    plies: done.reduce((s, x) => s + x.plies, 0), ends: done.reduce((o, x) => (o[x.res] = (o[x.res] || 0) + 1, o), {}),
    flagRule: flags.filter(x => x.flag === "rule").length, flagMis: flags.filter(x => x.flag === "misjudge").length, flagClock: flags.filter(x => x.flag === "clock").length, selfFlag: ctl.selfFlag,
    histBad, late: (() => { const L = [A, K].flatMap(P => P.net.lateLog()); return { n: L.length, keep: L.filter(e => e.keep).length, max: L.length ? Math.max(...L.map(e => e.late || 0)) : 0 } })(),
    shadow: (() => { const R = done.flatMap(x => x.sh || []); return { moves: R.reduce((s, x) => s + x.n, 0), maxGap: R.length ? Math.max(...R.map(x => x.max)) : 0, sh: R.reduce((s, x) => s + x.sh, 0), cl: R.reduce((s, x) => s + x.cl, 0) } })(),
    sus: [A, K, W].reduce((s, P) => s + P.net.suspicious().length, 0), keyBad: [A, K].reduce((s, P) => s + P.net.keyBad().n, 0),
    lagOpp: dist(lagO), lagWatch: dist(lagW), conv: dist(done.map(x => x.conv)), ev, chaosN: { ...B.chaosN },
    k: (() => { const s = A.net.linkStats(); return { dup: s.dup, old: s.old, replay: s.replay, win: s.win, bad: s.bad, nosig: s.nosig, stOut: s.stOut, gapFix: s.gapFix } })(),
    mem, errors: S.errors.slice(0, 5), signed: [A, K, W].every(P => P.net.signState() === "signed"), bad: games.filter(x => !x.ok), rows: games,
    off: { A: OFF.get(A).map(([s, e]) => [Math.round((s - t0) / 1000), e == null ? null : Math.round((e - t0) / 1000)]), K: OFF.get(K).map(([s, e]) => [Math.round((s - t0) / 1000), e == null ? null : Math.round((e - t0) / 1000)]) }, t0
  };
}

/* 長測有沒有出問題：一致率 100%、沒有誤判超時、戰績一致、沒有可疑事件、計時器和 localStorage 沒有越跑越多 */
function verdict(r) {
  const why = [];
  if (r.fatal) why.push(r.fatal);
  if (r.stuck || r.rematchFail) why.push(`有 ${r.stuck} 盤沒收斂、${r.rematchFail} 次再來一局沒開成`);
  if (r.flagMis) why.push(`誤判超時 ${r.flagMis} 次`);
  if (r.histBad) why.push(`戰績不一致 ${r.histBad} 盤`);
  if (r.late && r.late.keep) why.push(`晚到推翻時保留勝場 ${r.late.keep} 次（老實玩家被當成晚到太久）`);
  if (r.sus || r.keyBad) why.push(`可疑事件 ${r.sus}、擋下的邀請 ${r.keyBad}（真訊息被當成偽造）`);
  if (r.errors && r.errors.length) why.push("程式丟錯：" + r.errors[0]);
  if (r.mem && r.mem.length > 2) {
    const tmax = Math.max(...r.mem.map(m => Math.max(...m.timers)));
    if (tmax > 60) why.push("計時器最多 " + tmax + " 個（應該固定在十幾個）");
    const ls0 = r.mem[1].ls, ls1 = r.mem[r.mem.length - 1].ls; if (ls1.some((v, i) => v > Math.max(ls0[i] * 3, 200000))) why.push("localStorage 一直變大：" + JSON.stringify([ls0, ls1]));
  }
  if (r.signed === false) why.push("不是簽名局");
  return why;
}

module.exports = { SCENARIOS, longRun, verdict, skewable, HOUR, MIN };

if (require.main === module) {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
  const only = arg("--only"), scale = +(arg("--scale") || 1), json = process.argv.includes("--json");
  (async () => {
    let bad = 0; const s1 = s => (s / 1000).toFixed(1) + " 秒";
    for (const sc of SCENARIOS.filter(s => !only || s.name.includes(only))) {
      const t = Date.now(), r = await longRun(sc, { scale }), why = verdict(r);
      if (json) console.log(JSON.stringify(r));
      else {
        console.log(`\n■ ${r.name}（種子 ${r.seed}，模擬 ${r.simH} 小時，實跑 ${((Date.now() - t) / 1000).toFixed(0)} 秒）`);
        if (r.fatal) { console.log("  ✖ " + r.fatal); bad++; continue }
        console.log(`  盤數 ${r.games}（一致 ${r.consistent}）、總步數 ${r.plies}、結局 ${JSON.stringify(r.ends)}、開局邀請 ${r.tries} 次`);
        console.log(`  超時：規則內 ${r.flagRule}、誤判 ${r.flagMis}、手機時間往前跳 ${r.flagClock}、自己落旗 ${r.selfFlag}；戰績不一致 ${r.histBad}；可疑事件 ${r.sus}；擋下的邀請 ${r.keyBad}`);
        console.log(`  晚到推翻（T11）：超過 3 分鐘 ${r.late.n} 次、保留勝場 ${r.late.keep} 次、最晚 ${s1(r.late.max)}；影子鐘：${r.shadow.moves} 步、對方用時合計 ${s1(r.shadow.sh)}（棋鐘自己扣 ${s1(r.shadow.cl)}）、單步最大差 ${s1(r.shadow.maxGap)}`);
        console.log(`  對方收到這一步：中位 ${s1(r.lagOpp.p50)}、90% ${s1(r.lagOpp.p90)}、99% ${s1(r.lagOpp.p99)}、最慢 ${s1(r.lagOpp.max)}（${r.lagOpp.n} 步）；觀眾最慢 ${s1(r.lagWatch.max || 0)}`);
        console.log(`  結果出現到四方一致：中位 ${s1(r.conv.p50 || 0)}、最慢 ${s1(r.conv.max || 0)}；網路事件 ${JSON.stringify(r.ev)}；混沌 ${JSON.stringify(r.chaosN)}`);
        const m0 = r.mem[0], m1 = r.mem[r.mem.length - 1];
        console.log(`  抽樣 ${r.mem.length} 次：計時器 ${m0.timers}→${m1.timers}（最多 ${Math.max(...r.mem.map(m => Math.max(...m.timers)))}）、localStorage ${m0.ls}→${m1.ls} 字、除錯事件 ${m1.ev}、保留訊息 ${m0.retained}→${m1.retained}、Node 記憶體 ${m0.heapMB}→${m1.heapMB} MB`);
        console.log(why.length ? "  ✖ " + why.join("；") : "  ✔ 通過");
      }
      if (why.length) bad++;
    }
    process.exitCode = bad ? 1 : 0;
  })().catch(e => { console.error(e); process.exitCode = 1 });
}
