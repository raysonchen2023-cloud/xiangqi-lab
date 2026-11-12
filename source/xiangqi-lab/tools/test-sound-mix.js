// 第 6 輪 F3（評比 P24.1／P24.2／P24.4、ChatGPT 第 5 輪第 8 項）音量分類、靜音、提示音節流、長聽舒適的自動測試，不開瀏覽器：
//   ① 四類音量（m/11c-a11ysnd.js SXM-PURE 段）：預設值、平方曲線、壞資料、靜音、全部靜音
//   ② 匯流排（m/01-board.js SXM-BUS 段）：用假的 AudioContext 真的跑，看每類接到哪裡、提示音那條有低通和限幅器、拉滑桿平滑換音量、背景音樂音量
//   ③ 提示音節流（sxmThrottle）＋ 11c axsCue 整段實際播放：同一種 250ms 內只響一次、走不了 600ms、將軍 1500ms、一秒最多 6 個
//   ④ 舒適性的數字：淡入淡出包絡、峰值上限、基頻上限；音效圖鑑的音源、聲像對路數照實際音色產生
//   ⑤ 接線與文件：05-settings 叫 sxmMount、XQDOC 有 sound、sound.md 兩邊一樣、文件數字跟程式一樣
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SND = rd(path.join(M, "11c-a11ysnd.js")), B = rd(path.join(M, "01-board.js")), S = rd(path.join(M, "05-settings.js"));
const DOC = rd(path.join(DB, "art/docs/sound.md"));
const J = x => JSON.parse(JSON.stringify(x)), deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
/* 兩個標記中間（不含開頭那段註解；SXM 的開頭註解有好幾行） */
const blk = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a); return src.slice(src.indexOf("*/", i) + 2, j) };

/* 假的 AudioContext：每個參數記下怎麼排程（set／lin／exp／tgt），每個節點記下接到哪裡 */
function fakeAC() {
  const log = { osc: [], pan: [], gain: [], lp: [], lim: [] };
  const param = v => ({ value: v, ev: [], setValueAtTime(x, t) { this.value = x; this.ev.push(["set", x, t]) }, linearRampToValueAtTime(x, t) { this.ev.push(["lin", x, t]) },
    exponentialRampToValueAtTime(x, t) { this.ev.push(["exp", x, t]) }, setTargetAtTime(x, t, c) { this.target = x; this.ev.push(["tgt", x, t, c]) }, cancelScheduledValues() {} });
  const node = extra => Object.assign({ to: [], connect(n) { this.to.push(n); return n } }, extra);
  return {
    currentTime: 1, state: "running", destination: node({ kind: "dest" }), log,
    createStereoPanner() { const n = node({ kind: "pan", pan: param(0) }); log.pan.push(n); return n },
    createGain() { const n = node({ kind: "gain", gain: param(1) }); log.gain.push(n); return n },
    createBiquadFilter() { const n = node({ kind: "biquad", type: "lowpass", frequency: param(350), Q: param(1) }); log.lp.push(n); return n },
    createDynamicsCompressor() { const n = node({ kind: "comp", threshold: param(-24), knee: param(30), ratio: param(12), attack: param(.003), release: param(.25) }); log.lim.push(n); return n },
    createOscillator() { const n = node({ kind: "osc", type: "sine", frequency: param(440), started: 0, start(t) { this.started = t }, stop() {} }); log.osc.push(n); return n },
    resume() { return Promise.resolve() }
  };
}
/* 載入：11c 的 SXM 純函式段＋AXS 純函式段＋AXS 核心段，01-board 的 withAudio 和 SXM 匯流排段；store、時鐘、背景音樂都是假的 */
function load(opt) {
  opt = opt || {};
  const st = Object.assign({ capSound: true, mvSound: false, axSnd: true }, opt.store || {}), clock = { t: 10000 }, calls = { bgm: 0, cancel: 0 };
  const ctx = {
    console, Map, Set, Date, Math,
    store: { get: (k, d) => (k in st ? J(st[k]) : d), set: (k, v) => { st[k] = J(v) } },
    performance: { now: () => clock.t },
    document: { hidden: false },
    AC: fakeAC(),
    BGM: { a: opt.bgmA ? { volume: 1 } : null },
    bgmSync: () => { calls.bgm++ },
    speechSynthesis: { cancel: () => { calls.cancel++ } },
    axmOn: () => true,
    sideOf: p => (p ? (p === p.toUpperCase() ? "r" : "b") : null), XQCore: { legal: () => [1] },
    toast() {}, axSay() {}, unlockAudio() {}
  };
  vm.createContext(ctx);
  const wa = B.match(/^function withAudio\(play\)\{.*$/m); assert.ok(wa, "01-board 有 withAudio");
  const src = [blk(SND, "#SXM-PURE-BEGIN", "/* #SXM-PURE-END */"), blk(SND, "#AXS-PURE-BEGIN", "/* #AXS-PURE-END */"), blk(SND, "#AXS-CORE-BEGIN", "/* #AXS-CORE-END */"),
    wa[0], blk(B, "#SXM-BUS-BEGIN", "/* #SXM-BUS-END */")].join("\n");
  vm.runInContext(src + "\nthis.R={sxmCats,sxmK,sxmPct,sxmNorm,sxmLevel,sxmDb,sxmSetVol,sxmMute,sxmBgmVol,sxmCuePeak,sxmTxt,sxmGapOf,sxmThrottle,sxmEnv,sxmWave,sxmSrc,sxmFeel,sxmPanRow,sxmPieceMats,sxmDexMore,"
    + "sxmMix,sxmGain,sxmAllOff,sxmNow,sxmThr,sxmBus,sxmDst,sxmApply,withAudio,axsTone,axsCue,axsMove,axsTapCue,axsSt,AXS_KINDS,axsPan,axsFile}", ctx, { filename: "sxm（11c＋01-board）" });
  Object.assign(ctx.R, { ctx, st, clock, calls });
  return ctx.R;
}
/* 從一個節點一路往下走到喇叭，回傳經過的節點種類 */
const path2dest = n => { const k = []; for (let i = 0; i < 12 && n; i++) { k.push(n.kind); if (n.kind === "dest") break; n = n.to[0] } return k };
const sq = (f, r) => (9 - r) * 9 + f;

// ====================== ① 四類音量 ======================
test("四類音量：背景音樂與鼓聲 80%、棋子音效 100%、提示音 80%、語音報棋 100%；沒存過＝預設", () => {
  const R = load();
  deq(R.sxmCats().map(c => [c[0], c[2]]), [["bgm", 80], ["piece", 100], ["cue", 80], ["voice", 100]]);
  deq(R.sxmNorm(null), { v: { bgm: 80, piece: 100, cue: 80, voice: 100 }, m: { bgm: false, piece: false, cue: false, voice: false }, all: false });
  deq(["bgm", "piece", "cue", "voice"].map(k => R.sxmLevel(null, k)), [0.64, 1, 0.64, 1]);
  assert.equal(R.sxmLevel(null, "別的"), 1, "不認得的類別不受控");
  assert.equal(R.sxmBgmVol(null), 0.352, "背景音樂預設＝0.55 × 0.64");
  assert.equal(R.sxmCuePeak(null), 0.269, "提示音預設峰值＝0.42 × 0.64");
});
test("音量：壞資料照預設、超出範圍夾到 0～100、四捨五入", () => {
  const R = load();
  deq(R.sxmNorm({ v: { bgm: "abc", piece: 150, cue: -5, voice: 33.6 }, m: "壞掉", all: "yes" }).v, { bgm: 80, piece: 100, cue: 0, voice: 34 });
  deq(R.sxmNorm({ v: { bgm: null, piece: "" } }).v, { bgm: 80, piece: 100, cue: 80, voice: 100 }, "null、空字串＝預設，不是 0");
  assert.equal(R.sxmNorm({ all: "yes" }).all, false, "只有 true 才算全部靜音");
  assert.equal(R.sxmNorm([1, 2]).v.bgm, 80); assert.equal(R.sxmNorm("x").v.cue, 80);
});
test("平方曲線：50%＝0.25（約 -12 dB）、80%≈-3.9 dB、0%＝靜音；越拉越大聲", () => {
  const R = load(), at = p => R.sxmLevel({ v: { piece: p } }, "piece");
  assert.equal(at(50), 0.25); assert.equal(at(0), 0); assert.equal(at(100), 1);
  assert.equal(R.sxmDb(0.25), "-12 dB"); assert.equal(R.sxmDb(0.64), "-3.9 dB"); assert.equal(R.sxmDb(0), "靜音"); assert.equal(R.sxmDb(1), "0 dB");
  let prev = -1; for (let p = 0; p <= 100; p += 5) { const g = at(p); assert.ok(g > prev, p + "% 要比前一格大"); prev = g }
});
test("靜音：一類靜音只關那一類、百分比留著；再按恢復原本大小；拉滑桿到大於 0 自動解除靜音", () => {
  const R = load();
  let m = R.sxmSetVol(null, "cue", 45); m = R.sxmMute(m, "cue");
  assert.equal(R.sxmLevel(m, "cue"), 0); assert.equal(R.sxmLevel(m, "piece"), 1); assert.equal(m.v.cue, 45, "百分比留著");
  assert.equal(R.sxmTxt(m, "cue"), "靜音"); assert.equal(R.sxmTxt(m, "piece"), "100%");
  m = R.sxmMute(m, "cue"); assert.equal(R.sxmLevel(m, "cue"), 0.203, "恢復成 45%");
  m = R.sxmMute(m, "voice", true); m = R.sxmSetVol(m, "voice", 0); assert.equal(m.m.voice, true, "拉到 0 不解除");
  m = R.sxmSetVol(m, "voice", 30); assert.equal(m.m.voice, false, "拉到 30 解除"); assert.equal(R.sxmLevel(m, "voice"), 0.09);
  deq(R.sxmSetVol(m, "不認得", 10).v, m.v, "不認得的類別不動");
});
test("全部靜音：四類都是 0、字寫「全部靜音中」；再按一次恢復，各類原本的設定都還在", () => {
  const R = load();
  let m = R.sxmMute(R.sxmSetVol(null, "bgm", 30), "piece", true); m = R.sxmMute(m, "all");
  for (const [k] of R.sxmCats()) { assert.equal(R.sxmLevel(m, k), 0, k); assert.equal(R.sxmTxt(m, k), "全部靜音中") }
  assert.equal(R.sxmLevel(m, "別的"), 0, "全部靜音連不認得的也是 0");
  m = R.sxmMute(m, "all"); assert.equal(m.all, false); assert.equal(m.v.bgm, 30); assert.equal(m.m.piece, true, "棋子音效原本就靜音，還是靜音");
  assert.equal(R.sxmMute(m, "all", true).all, true); assert.equal(R.sxmMute(m, "all", false).all, false);
});

// ====================== ② 匯流排（01-board） ======================
test("匯流排：每類一條 GainNode 接喇叭，增益＝那類的音量；同一個 AudioContext 重用、換新的 AC 重建", () => {
  const R = load({ store: { sndMix: { v: { piece: 50 } } } }), ac = R.ctx.AC;
  const p = R.sxmDst("piece"); assert.equal(p.kind, "gain"); assert.equal(p.gain.value, 0.25); deq(path2dest(p), ["gain", "dest"]);
  assert.equal(R.sxmDst("piece"), p, "重用"); assert.equal(R.sxmDst("bgm").gain.value, 0.64); assert.equal(R.sxmDst("voice").gain.value, 1);
  deq(Object.keys(ac._sxm).sort(), ["bgm", "piece", "voice"]);
  R.ctx.AC = fakeAC(); assert.notEqual(R.sxmDst("piece"), p, "AC 換新就重建");
  R.ctx.AC = null; assert.equal(R.sxmBus("piece"), null, "沒有 AC 不建");
});
test("提示音那條：增益 → 3800Hz 低通 → 限幅器（-12 dB、12:1、3ms／150ms）→ 喇叭", () => {
  const R = load(), K = R.sxmK(), c = R.sxmDst("cue");
  deq(path2dest(c), ["gain", "biquad", "comp", "dest"]);
  const lp = c.to[0], lm = lp.to[0];
  assert.equal(lp.type, "lowpass"); assert.equal(lp.frequency.value, 3800); assert.equal(lp.Q.value, K.lpQ);
  deq([lm.threshold.value, lm.knee.value, lm.ratio.value, lm.attack.value, lm.release.value], [-12, 6, 12, 0.003, 0.15]);
  assert.equal(R.sxmDst("piece").to[0].kind, "dest", "其他類不加濾波，原本的音色不變");
});
test("拉滑桿（sxmApply）：每條匯流排平滑換到新音量（setTargetAtTime 15ms）、背景音樂播放器音量跟著、語音 0 就停念", () => {
  const R = load({ bgmA: true }), ac = R.ctx.AC;
  R.sxmDst("piece"); R.sxmDst("cue"); R.sxmDst("voice");
  R.st.sndMix = R.sxmSetVol(R.sxmSetVol(R.sxmSetVol(null, "piece", 50), "bgm", 100), "voice", 0);
  R.sxmApply();
  const tg = k => ac._sxm[k].gain.ev.filter(e => e[0] === "tgt").pop();
  deq(tg("piece"), ["tgt", 0.25, 1, 0.015]); deq(tg("cue"), ["tgt", 0.64, 1, 0.015]); deq(tg("voice"), ["tgt", 0, 1, 0.015]);
  assert.equal(R.ctx.BGM.a.volume, 0.55, "背景音樂 100%＝0.55（原本的固定值，是上限）");
  assert.ok(R.calls.bgm >= 1, "叫 bgmSync（0 或靜音就暫停）"); assert.ok(R.calls.cancel >= 1, "語音 0：停掉正在念的");
});
test("全部靜音：withAudio 不播、sxmAllOff＝true；恢復後照播", () => {
  const R = load(); let n = 0;
  R.withAudio(() => n++); assert.equal(n, 1);
  R.st.sndMix = R.sxmMute(null, "all"); assert.equal(R.sxmAllOff(), true);
  R.withAudio(() => n++); assert.equal(n, 1, "全部靜音不播");
  R.st.sndMix = R.sxmMute(R.st.sndMix, "all"); R.withAudio(() => n++); assert.equal(n, 2);
});

// ====================== ③ 節流 ======================
test("sxmThrottle：同一種 250ms 內只響一次；不同種互不影響；剛好 250ms 可以再響", () => {
  const R = load(), S = {};
  assert.equal(R.sxmThrottle(S, "move", 0), true); assert.equal(R.sxmThrottle(S, "move", 249), false); assert.equal(R.sxmThrottle(S, "move", 250), true);
  assert.equal(R.sxmThrottle(S, "select", 251), true, "不同種");
  assert.equal(R.sxmThrottle(null, "move", 0), true, "沒有狀態＝不節流");
  assert.equal(R.sxmThrottle(S, "move", 300, 0), true, "gap 0＝不節流");
});
test("sxmThrottle：連續走不了 600ms 一次、連續將軍 1500ms 一次；時間倒退當作沒響過", () => {
  const R = load();
  assert.equal(R.sxmGapOf("illegal"), 600); assert.equal(R.sxmGapOf("check"), 1500); assert.equal(R.sxmGapOf("move"), 250); assert.equal(R.sxmGapOf("toString"), 250, "原型上的名字不算特例");
  let S = {}, got = [];
  for (let t = 0; t < 2000; t += 100) if (R.sxmThrottle(S, "illegal", t)) got.push(t);
  deq(got, [0, 600, 1200, 1800], "每 100ms 點一下走不了，兩秒只響 4 次");
  S = {}; got = []; for (let t = 0; t < 5000; t += 400) if (R.sxmThrottle(S, "check", t)) got.push(t);
  deq(got, [0, 1600, 3200, 4800], "棋譜快轉每 0.4 秒將一次，只在間隔 1.5 秒以上才響");
  S = {}; R.sxmThrottle(S, "move", 5000); assert.equal(R.sxmThrottle(S, "move", 100), true, "時鐘倒退不卡住");
});
test("sxmThrottle：所有提示音加起來一秒最多 6 個，過了一秒再放行", () => {
  const R = load(), S = {}, K = ["select", "move", "capture", "check", "illegal", "turn", "opp", "timelow"];
  const ok = K.map((k, i) => R.sxmThrottle(S, k, i * 10));
  deq(ok, [true, true, true, true, true, true, false, false]);
  assert.equal(R.sxmThrottle(S, "timeout", 999), false); assert.equal(R.sxmThrottle(S, "timeout", 1000), true, "最早那個滿一秒就讓出來");
});
test("axsCue 實際播放：250ms 內同一種第二次不播、紀錄寫「太密，略過」；過了間隔再播；節流不影響別種", () => {
  const R = load(), ac = R.ctx.AC;
  assert.equal(R.axsCue("move", sq(2, 2), false), true); const n = ac.log.osc.length; assert.ok(n > 0);
  R.clock.t += 100; assert.equal(R.axsCue("move", sq(3, 2), false), false); assert.equal(ac.log.osc.length, n, "沒有多建振盪器");
  assert.equal(R.axsSt().log.pop().st, "沒播（太密，略過）");
  assert.equal(R.axsCue("capture", sq(3, 2), false), true, "別種照播");
  R.clock.t += 200; assert.equal(R.axsCue("move", sq(3, 2), false), true, "過了 250ms");
  const S2 = load(); let played = 0; for (let i = 0; i < 20; i++) { if (S2.axsCue("illegal", sq(5, 5), false)) played++; S2.clock.t += 100 }
  assert.equal(played, 4, "連點 20 下走不了（每 0.1 秒），只響 4 次");
});
test("axsMove：一步棋的提示音（對方走完＋吃子＋將軍＋輪到你）不會被節流吃掉；提示音靜音就交回一般落子聲", () => {
  const R = load();
  assert.equal(R.axsMove({ to: sq(7, 7), side: "b", me: "r", cap: true, ck: sq(4, 0), board: [] }), true);
  deq(R.axsSt().log.map(e => e.st), ["已播放", "已播放", "已播放", "已播放"]);
  const m = load({ store: { sndMix: { m: { cue: true } } } });
  assert.equal(m.axsMove({ to: sq(2, 2), side: "r", me: "r", ck: -1 }), false, "交回 moveSound"); assert.equal(m.ctx.AC.log.osc.length, 0);
  assert.equal(m.axsCue("move", sq(2, 2), false), false); assert.equal(m.axsSt().log.pop().st, "沒播（提示音靜音）");
  const z = load({ store: { sndMix: { v: { cue: 0 } } } }); assert.equal(z.axsCue("move", 0, false), false, "音量 0 跟靜音一樣");
});

// ====================== ④ 舒適性 ======================
test("提示音的包絡：從 -80 dB 開始、8ms 線性淡入到峰值、指數淡出回 -80 dB；每個音的峰值 ≤ 0.42", () => {
  const R = load(), ac = R.ctx.AC, K = R.sxmK();
  assert.equal(K.attack, 0.008); assert.equal(K.floor, 0.0001); assert.ok(20 * Math.log10(K.floor) <= -80);
  deq(R.sxmEnv(0.6, 0.06), [[0, 0.0001], [0.008, 0.6], [0.06, 0.0001]]);
  deq(R.sxmEnv(1, 0.001)[2], [0.018, 0.0001], "太短的音也留 10ms 淡出");
  R.axsCue("check", sq(4, 0), false);
  const T = R.axsTone("check"), env = ac.log.gain.filter(g => g.gain.ev.length === 3);
  assert.equal(env.length, T.n.length, "每個音一組包絡");
  env.forEach((g, i) => {
    const [s, l, e] = g.gain.ev, at = T.n[i][1], t0 = ac.currentTime + 0.02;
    deq([s[0], s[1]], ["set", 0.0001]); deq([l[0], l[1]], ["lin", T.n[i][3]]); deq([e[0], e[1]], ["exp", 0.0001]);
    assert.ok(Math.abs(l[2] - (t0 + at + 0.008)) < 1e-9, "8ms 淡入"); assert.ok(Math.abs(e[2] - (t0 + at + T.n[i][2])) < 1e-9, "長度照 axsTone");
  });
  const g0 = env[0].to[0]; assert.equal(g0.kind, "gain"); assert.equal(g0.gain.value, 0.42, "包絡後面的總音量＝cueMax");
  for (const k of R.AXS_KINDS) for (const n of R.axsTone(k).n) assert.ok(n[3] <= 1, k + " 相對音量 ≤ 1");
});
test("提示音一路接到提示音匯流排（方位 → 增益 → 低通 → 限幅器 → 喇叭），不再直接進喇叭", () => {
  const R = load(), ac = R.ctx.AC;
  R.axsCue("move", sq(0, 0), false);
  deq(path2dest(ac.log.osc[0]), ["osc", "gain", "gain", "pan", "gain", "biquad", "comp", "dest"]);
  assert.equal(ac.log.pan[0].pan.value, -0.8, "九路在最左");
  R.clock.t += 1000; R.axsCue("turn", -1, false);
  deq(path2dest(ac.log.osc[ac.log.osc.length - 1]), ["osc", "gain", "gain", "gain", "biquad", "comp", "dest"], "置中的不建方位節點，一樣過匯流排");
});
test("刺耳高頻：九種提示音的基頻都 ≤ 1100Hz；方波、鋸齒波都過 3800Hz 低通；限幅器門檻 ≤ -6 dB", () => {
  const R = load(), K = R.sxmK();
  assert.equal(K.maxHz, 1100);
  for (const k of R.AXS_KINDS) for (const n of R.axsTone(k).n) assert.ok(n[0] <= K.maxHz, k + " " + n[0] + "Hz");
  assert.ok(K.lp <= 4000 && K.lim.threshold <= -6 && K.lim.ratio >= 10);
  assert.ok(K.bgmMax <= 0.55 && K.cueMax <= 0.42, "上限不比原本大聲");
});
test("〔原始碼〕01-board：將軍「鏘」淡入、過低通、接棋子音效匯流排、1.5 秒內只響一次；落子、鼓聲、語音、背景音樂都接到自己那類", () => {
  const ck = B.slice(B.indexOf("function checkFx("), B.indexOf("/* 意見回饋 416"));
  assert.match(ck, /sxmThrottle\(sxmThr\(\),"ckfx",sxmNow\(\),sxmGapOf\("check"\)\)/);
  assert.match(ck, /lp\.type="lowpass";lp\.frequency\.value=K\.lp/); assert.match(ck, /linearRampToValueAtTime\(\.12,t\+at\+K\.attack\)/); assert.match(ck, /lp\.connect\(sxmDst\("piece"\)\)/);
  assert.ok(!/AC\.destination/.test(ck), "不再直接進喇叭");
  for (const f of ["drumHit", "gongHit", "cymHit", "bellHit"]) { const s = B.slice(B.indexOf("function " + f + "("), B.indexOf("\nfunction", B.indexOf("function " + f + "(") + 5)); assert.match(s, /sxmDst\("bgm"\)/, f); assert.ok(!/AC\.destination/.test(s), f) }
  for (const f of ["matSound", "playSfx", "moveSound0", "kaijuFx"]) { const i = B.indexOf("function " + f + "("), s = B.slice(i, B.indexOf("\nfunction", i + 5)); assert.match(s, /sxmDst\("piece"\)/, f); assert.ok(!/AC\.destination/.test(s), f) }
  assert.match(B, /s\.connect\(sxmDst\("voice"\)\)/); assert.match(B, /u\.volume=Math\.min\(1,vg\)/);
  assert.match(B, /BGM\.a\.volume=sxmBgmVol\(sxmMix\(\)\)/); assert.match(B, /const on=!!store\.get\("bgm",true\)&&!document\.hidden&&sxmGain\("bgm"\)>0/);
});

// ====================== ⑤ 音效圖鑑、設定、文件 ======================
test("音效圖鑑：音源照 axsTone 產生（波形、頻率）、每種都有聽感比喻；聲像九路 -0.8 到一路 +0.8、每路差 0.2", () => {
  const R = load();
  assert.equal(R.sxmSrc("check"), "合成方波 660→990Hz"); assert.equal(R.sxmSrc("timelow"), "合成正弦波 1046Hz ×2"); assert.equal(R.sxmSrc("move"), "合成三角波 420Hz");
  for (const k of R.AXS_KINDS) { const T = R.axsTone(k), s = R.sxmSrc(k); assert.ok(s.includes(R.sxmWave(T.w)), k); for (const n of T.n) assert.ok(s.includes(String(n[0])), k + " " + n[0]); assert.ok(R.sxmFeel(k), k) }
  const P = R.sxmPanRow(); deq(P.map(x => x[0]), [9, 8, 7, 6, 5, 4, 3, 2, 1]); assert.equal(P[0][1], -0.8); assert.equal(P[4][1], 0); assert.equal(P[8][1], 0.8);
  for (let i = 1; i < 9; i++) assert.ok(Math.abs(P[i][1] - P[i - 1][1] - 0.2) < 1e-9);
  const h = R.sxmDexMore(); for (const w of ["九路 -0.8", "五路 0", "一路 +0.8", "實木（即時合成）", "不是實物錄音", "3800Hz", "1.5 秒內只響一次", "不是真人演奏"]) assert.ok(h.includes(w), w);
  assert.ok(!/3D\s*環繞|真實錄音|實木錄音/.test(h), "不誇大");
});
test("〔混合〕設定列：滑桿 0～100（每格 5）、aria-valuetext、label 對到滑桿、🔊／🔇 靜音鍵 aria-pressed、全部靜音鍵", () => {
  const ctx = { console, store: { get: (k, d) => (k === "sndMix" ? { v: { cue: 45 }, m: { cue: true } } : d) } }; vm.createContext(ctx);
  const ui = SND.slice(SND.indexOf("function sxmRow("), SND.indexOf("function sxmMount("));
  vm.runInContext(blk(SND, "#SXM-PURE-BEGIN", "/* #SXM-PURE-END */") + "\nfunction sxmMix(){return store.get(\"sndMix\",null)}\n" + ui + "\nthis.R={sxmRow,sxmAllBtn}", ctx);
  const h = ctx.R.sxmRow("cue");
  assert.match(h, /<label for="sxmS-cue"><b>🎧 提示音<\/b><\/label>/); assert.match(h, /<input type="range" id="sxmS-cue" class="sxm-s" min="0" max="100" step="5" value="45" aria-valuetext="靜音">/);
  assert.match(h, /<button type="button" class="sxm-m" aria-pressed="true" aria-label="提示音靜音">🔇<\/button>/); assert.match(h, /class="sxm-r sxm-mu"/);
  assert.match(ctx.R.sxmRow("bgm"), /aria-pressed="false" aria-label="背景音樂與鼓聲靜音">🔊/);
  assert.equal(ctx.R.sxmRow("沒有"), ""); assert.match(ctx.R.sxmAllBtn(), /class="btn ghost sxm-all" aria-pressed="false">🔇 全部靜音</);
  assert.match(SND, /\.sxm-m\{flex:none;width:44px;height:44px/, "靜音鍵 44px"); assert.match(SND, /\.sxm-s\{flex:1;min-width:0;height:44px/, "滑桿 44px 高");
});
test("〔原始碼〕接線：05-settings 畫完聲音頁叫 sxmMount；三張卡片（#snd／#snd2／#snd3）各放自己那類；XQDOC 有 sound、按鈕字 7 字內", () => {
  assert.match(S, /\[\.\.\.sdB\.children\]\.slice\(1\)[^\n]*\n\s*if\(typeof sxmMount==="function"\)sxmMount\(v\);/);
  const mt = SND.slice(SND.indexOf("function sxmMount("), SND.indexOf("/* 畫面上所有滑桿"));
  assert.match(mt, /querySelector\("#snd"\)[\s\S]*sxmRow\("piece"\)\+sxmRow\("cue"\)/); assert.match(mt, /querySelector\("#snd2"\)[\s\S]*sxmRow\("voice"\)/); assert.match(mt, /querySelector\("#snd3"\)[\s\S]*sxmRow\("bgm"\)/);
  assert.match(mt, /class="btn ghost axs-dx">🎼 音效圖鑑</); assert.match(mt, /data-xqdoc="sound">🔊 音效設計</);
  const sm = rd(path.join(M, "07s2-setmap.js")); for (const k of ["smBell:[\"sec:#snd\"]", "smQin:[\"sec:#snd2\"]", "smInc:[\"sec:#snd3\"]"]) assert.ok(sm.includes(k), "設定房間入口整段搬 " + k);
  const m = S.match(/sound:\["sound","([^"]+)"\]/); assert.ok(m, "XQDOC 有 sound"); assert.ok([...m[1].replace(/^\S+\s/, "")].length <= 7, "標題 7 字內");
});
test("〔原始碼〕文件：sound.md 兩邊一樣；分類預設、節流、舒適性數字跟程式一樣；照實寫沒有真人實聽紀錄、iPhone 限制", () => {
  assert.equal(DOC, rd(path.join(LAB, "site/data/docs/sound.md")), "art/docs 和 site/data/docs 要同步");
  const R = load(), K = R.sxmK();
  for (const [, n, d] of R.sxmCats()) assert.ok(new RegExp("\\| " + n + " \\|[^\\n]*\\| " + d + "% \\|").test(DOC), "表格寫到 " + n + " " + d + "%");
  for (const w of [K.gap + " 毫秒", K.gaps.illegal + " 毫秒", K.gaps.check + " 毫秒", "一秒最多 " + K.burst + " 個", K.lp + "Hz", K.maxHz + "Hz", String(K.cueMax), String(K.bgmMax), K.attack * 1000 + " 毫秒", K.lim.threshold + " dB", K.lim.ratio + ":1", "-80 dB"])
    assert.ok(DOC.includes(w), "文件要寫「" + w + "」");
  for (const a of R.AXS_KINDS) assert.ok(DOC.includes(R.sxmSrc(a)), "圖鑑音源：" + a);
  for (const w of ["沒有真人實聽紀錄", "iPhone", "不是實物錄音", "test-sound-mix.js"]) assert.ok(DOC.includes(w), w);
  assert.ok(!/3D\s*環繞|已通過|完整支援/.test(DOC), "不誇大");
});
