// W45（11/21）十州棋館「風向標」：m/07z9b-jianghu.js 照共用天氣讓 2～3 派順風，旗號發金光、掛大字「順風」；在順風的派上課、挑戰掌門修為多給
//   第一次完成的修為照原本的 1.5 倍；已經拿過的，每派每天多給一次 10 修為（addXP 的 key 去重）。不扣修為、畫面不寫倍率。
// 用法：node --test xiangqi-lab/tools/test-jianghu-wind-1121.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const JH = rd("xiangqi-db/m/07z9b-jianghu.js"), OS = rd("xiangqi-db/m/07z9-school.js");
const WIND = JH.slice(JH.indexOf("/* ---------- W45 風向標"));
const SCH_IDS = ["central", "screen", "palace_horse", "same_cannon", "opposite_cannon", "pawn", "elephant", "horse", "cross_palace", "advisor_corner"];

/* 載入 osc-core 與風向標那一段；天氣、addXP 都用假的 */
function load(env = {}) {
  const xp = [], toasts = [], mem = {};
  const c = {
    store: { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v } },
    jhL: (zh) => zh, jhSch: (id) => ({ nm: id + "門" }), toast: (m) => toasts.push(m),
    addXP: (n, why, key) => xp.push({ n, why, key }), ...env,
  };
  vm.createContext(c);
  vm.runInContext(OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n" + WIND, c);
  return { c, xp, toasts, mem };
}

test("候選門派：四種天氣的候選都是真的派，十派每一派至少在一種天氣裡會順風", () => {
  const { c } = load();
  const W = vm.runInContext("JH_WIND", c), seen = new Set();
  assert.deepEqual(Object.keys(W).sort(), ["night", "rain", "snow", "sun"]);
  for (const ids of Object.values(W)) for (const id of ids) { assert.ok(SCH_IDS.includes(id), id); seen.add(id) }
  assert.deepEqual([...seen].sort(), SCH_IDS.slice().sort());
});

test("挑派：每段 2～3 派、不重複、都在那種天氣的候選裡；同一天同一段結果固定", () => {
  const { c } = load();
  const W = vm.runInContext("JH_WIND", c);
  for (const st of Object.keys(W)) for (let day = 1; day <= 20; day++) for (const h of [1, 5, 9, 13, 17, 21]) {
    const d = new Date(2026, 10, day, h, 30), ids = c.jhWindPick(st, d);
    assert.ok(ids.length >= 2 && ids.length <= 3, st + " " + ids);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.ok(W[st].includes(id), st + " " + id);
    assert.deepEqual(c.jhWindPick(st, new Date(2026, 10, day, h - (h % 4), 0)), ids, "同一段（4 小時）要一樣");
  }
});

test("挑派會輪替：晴天一週下來，候選的五派每一派都輪得到，也不是每段都同一組", () => {
  const { c } = load();
  const got = new Set(), combos = new Set();
  for (let day = 1; day <= 7; day++) for (const h of [9, 13]) { const ids = c.jhWindPick("sun", new Date(2026, 10, day, h)); ids.forEach((x) => got.add(x)); combos.add(ids.slice().sort().join()) }
  assert.equal(got.size, 5);
  assert.ok(combos.size >= 4, String(combos.size));
});

test("天氣判斷：下雪、下雨照共用天氣；沒下雨雪時入夜算夜、白天算晴", () => {
  const base = { SW7_PAGES: [{ k: "home" }], sw7TermFor: () => "小雪", sw7Rg: () => "s", sw7SeaNow: () => "winter" };
  const st = (p, night) => load({ ...base, sw7Precip: () => p, sw7HomeNightA: () => (night ? 1 : 0) }).c.jhWindState(new Date(2026, 10, 21, 12));
  assert.equal(st({ t: "snow", a: 1 }, true), "snow");
  assert.equal(st({ t: "rain", a: 1 }, false), "rain");
  assert.equal(st(null, true), "night");
  assert.equal(st(null, false), "sun");
  /* 季節天氣程式沒載到：照時鐘猜夜晚，不能整個壞掉 */
  const bare = load().c;
  assert.equal(bare.jhWindState(new Date(2026, 10, 21, 22)), "night");
  assert.equal(bare.jhWindState(new Date(2026, 10, 21, 10)), "sun");
});

test("上課修為：順風的派第一次完成照 1.5 倍給，不順風照舊；已拿過的每派每天多給一次 10 修為", () => {
  const { c, xp } = load();
  c.jhWindNow = () => ({ st: "sun", ids: ["central", "horse"], key: "k" });
  const pass = { ok: true, pass: true, grad: 0 };
  assert.equal(c.OSC.reward({}, "central", 1, pass, 1), 15);
  assert.equal(c.OSC.reward({}, "central", 1, { ok: true, pass: true, grad: 1 }, 1), 75, "完成一個階段 10＋40 → 75");
  assert.equal(c.OSC.reward({}, "screen", 1, pass, 1), 10, "不順風的派照舊 10");
  assert.equal(xp.length, 0, "第一次完成的加成走原本的修為，不另外給");
  const claim = { central_01: 1 };
  assert.equal(c.OSC.reward(claim, "central", 1, { ok: true, pass: false, grad: 0 }, 1), 0, "已拿過：原本的修為仍是 0");
  assert.equal(xp.length, 1);
  assert.equal(xp[0].n, 10);
  assert.match(xp[0].key, /^jhw:\d{4}-\d\d-\d\d:central$/, "每派每天一次（addXP 用 key 去重）");
  c.OSC.reward(claim, "screen", 1, { ok: true }, 1);
  assert.equal(xp.length, 1, "不順風的派不多給");
  c.OSC.reward(claim, "horse", 1, { ok: false }, 1);
  assert.equal(xp.length, 1, "看示範、沒有獨立完成的例子不多給");
});

test("掌門修為：順風的派第一次贏照 1.5 倍；再下（輸、和、贏都算下完一盤）每派每天多給一次", () => {
  const { c, xp } = load();
  c.jhWindNow = () => ({ st: "rain", ids: ["screen", "pawn"], key: "k" });
  const m = c.OSC.MST.find((x) => x.sid === "screen"), m2 = c.OSC.MST.find((x) => x.sid === "central");
  assert.equal(c.OSC.zmReward({}, m, "w", 1), 45);
  assert.equal(c.OSC.zmReward({}, m2, "w", 1), 30, "不順風的掌門照舊 30");
  assert.equal(c.OSC.zmReward({ ["zm:" + m.id]: 1 }, m, "l", 1), 0);
  assert.equal(xp.length, 1);
  assert.match(xp[0].key, /:screen$/);
  assert.equal(c.OSC.zmReward({}, m2, "l", 1), 0);
  assert.equal(xp.length, 1);
});

test("包一次就好：包住 07z9 那段再跑一次，也不會把加成疊兩層", () => {
  const { c } = load();
  c.jhWindNow = () => ({ st: "sun", ids: ["central"], key: "k" });
  vm.runInContext(WIND.slice(WIND.indexOf("/* 包住 07z9")), c);
  assert.equal(c.OSC.reward({}, "central", 1, { ok: true, pass: true, grad: 0 }, 1), 15);
});

test("進長卷的提示：同一段時間只跳一次，寫出順風的派名、不寫倍率", () => {
  const { c, toasts } = load();
  c.jhWindNow = () => ({ st: "snow", ids: ["elephant", "advisor_corner"], key: "2026-11-21|3|snow" });
  c.jhWindToast(); c.jhWindToast();
  assert.equal(toasts.length, 1);
  assert.match(toasts[0], /雪・順風：elephant門、advisor_corner門/);
  assert.doesNotMatch(toasts[0], /倍|1\.5|%/);
});

test("〔原始碼〕長卷與駐地小卡：順風的旗號加 wind、掛「順風」大字；小卡只寫「修為多給」，畫面上不寫倍率；減少動態時不閃", () => {
  assert.match(JH, /\(wd\?" wind":""\)/);
  assert.match(JH, /<em class="wd" aria-hidden="true">\$\{esc\(jhL\("順風","Fair wind"\)\)\}<\/em>/);
  assert.match(JH, /眼下順風：在這一派上課、挑戰掌門，修為多給。/);
  const ui = JH.slice(0, JH.indexOf("/* ---------- W45 風向標"));
  assert.doesNotMatch(ui, /1\.5 倍|倍率|雙倍/);
  assert.match(JH, /prefers-reduced-motion:reduce\)\{\.jh-spot\.wind \.bn\{animation:none\}/);
});
