/* W153～W155（11/26 外部複審）迷宮文案與題目：
   W153 過關那句話：有下一層時一律說「石階往下通到〈下一層〉」，不再出現「之後再開」（jhMzDoneText）；沒有下一層才用該層自己的 say.done。
   W154 飛相第二層石門「飛相掩護、馬收尾」：每一題紅方都要有相。
   W155 有其他收錄正解（alt）的題，提示不能寫死「最後一步由某子將死」（沒有 alt 的題照舊可以寫）；反宮馬第一層石門不再標「馬後炮」（實際是馬收尾）。
   用 vm 跑真的程式（共用程式、碑刻、十派第一層、十派第二層），含改壞驗證。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const L1 = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js"];
const L2 = fs.readdirSync(M).filter((f) => /^07z9m-[a-z]+2\.js$/.test(f)).sort();
const SIDS = ["central", "cross_palace", "pawn", "elephant", "screen", "horse", "same_cannon", "opposite_cannon", "advisor_corner", "palace_horse"];

function load(patch = {}) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, vibrate: () => {}, jhGo: () => {}, jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: () => ({ style: {}, dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {} }), head: { append() {} }, body: { append() {} } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false }); c.location = { href: "http://x/index.html#/", hash: "#/" };
  vm.createContext(c); for (const f of [...L1, ...L2]) vm.runInContext(patch[f] ? patch[f](rd(f)) : rd(f), c);
  return c;
}
const done = (c) => vm.runInContext("jhMzDoneText", c);

function doneProblems(c) {
  const bad = [], D = done(c);
  for (const sid of SIDS) {
    const n = c.jhMzLayers(sid);
    for (let k = 1; k <= n; k++) {
      const LV = c.jhMzLvN(sid, k), nx = k < n ? c.jhMzLvN(sid, k + 1) : null, own = LV.say && LV.say.done ? LV.say.done[0] : "";
      const t = D(LV, nx, own);
      if (nx && /之後再開/.test(t)) bad.push(`${sid} 第${k}層：有下一層卻說「之後再開」`);
      if (nx && !t.includes(nx.lvName[0])) bad.push(`${sid} 第${k}層：要說通到「${nx.lvName[0]}」`);
      if (!nx && own && t !== own) bad.push(`${sid} 第${k}層：沒有下一層要用自己的 say.done`);
    }
  }
  return bad;
}

test("W153 過關那句話：有下一層就說通到下一層、沒有才用自己的", () => {
  assert.deepEqual(doneProblems(load()), []);
});

test("W154 飛相第二層石門：每一題紅方都要有相", () => {
  const c = load(), P = c.jhMzLvN("elephant", 2).pool;
  assert.equal(P.door.length, 3);
  for (const q of P.door) assert.ok(/B/.test(q.fen.split(" ")[0]), "紅方沒有相：" + q.fen);
});

test("W155 有其他正解的題，題面不寫死「最後一步」；反宮馬不標「馬後炮」", () => {
  const c = load(); let n = 0;
  for (const sid of SIDS) for (let k = 1; k <= c.jhMzLayers(sid); k++) {
    const P = c.jhMzLvN(sid, k).pool || {};
    for (const q of [...(P.door || []), ...(P.trap || [])]) {
      if (!q.alt) continue; n++;
      assert.ok(!/最後一步/.test(q.zh[1]), sid + " 第" + k + "層 " + q.id + " 有其他正解，題面卻寫死「最後一步」");
      assert.ok(!/(delivers the final blow|gives the final mate|final mate)/.test(q.en[1]), sid + " 第" + k + "層 " + q.id + " 英文題面寫死最後一步");
    }
  }
  assert.ok(n > 0, "要真的有多解題被檢查到");
  assert.ok(!/石門機關：馬後炮/.test(rd("07z9m-palace.js")), "反宮馬第一層還標「馬後炮」");
});

test("改壞驗證：過關那句話回到「有寫就用自己的」時要抓得到", () => {
  const p = { "07z9m-maze.js": (s) => s.replace("function jhMzDoneText(LV,nx,own){if(nx){", "function jhMzDoneText(LV,nx,own){if(nx&&!own){") };
  assert.notEqual(p["07z9m-maze.js"](rd("07z9m-maze.js")), rd("07z9m-maze.js"));
  assert.ok(doneProblems(load(p)).length > 0);
});
