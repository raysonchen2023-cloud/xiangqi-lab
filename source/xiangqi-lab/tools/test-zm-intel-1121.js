// W48（11/21）十派門內玩法首發：案 4「掌門暗樁」＋案 9「師徒復盤」
//   案 4：贏了某派的門下棋友，打聽到那派掌門今天走主修還是副修；引擎端 src/local.js zmLeanOrd 跟 App 端 07z9b jhIntelLean 同一套算法，情報才是真的。
//   案 9：掌門盤沒贏時，結算的主要按鈕換成「看懂這盤最關鍵的一步」，接挑戰電腦同一套關鍵步重練（08b mflOpen）。
//   都不改掌門強度、不改棋局、不加修為。
// 用法：node --test xiangqi-lab/tools/test-zm-intel-1121.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "../..");
const rd = (p) => fs.readFileSync(path.join(ROOT, p), "utf8");
const UTIL = rd("xiangqi-db/m/00-util.js"), STILL = (() => { const a = UTIL.indexOf("function stillHere("), b = UTIL.indexOf("\n", a); assert.ok(a > 0 && b > a, "抓得到 00-util.js 的 stillHere"); return UTIL.slice(a, b) })();   /* 11/25 W120：悄悄話改走 stillHere，抽真的那一行進沙箱 */
const JH = rd("xiangqi-db/m/07z9b-jianghu.js"), OS = rd("xiangqi-db/m/07z9-school.js"), LOCAL = rd("xiangqi-lab/src/local.js"), CG = rd("xiangqi-db/m/08b-cpugame.js");
const SCH = ["central", "screen", "palace_horse", "same_cannon", "opposite_cannon", "pawn", "elephant", "horse", "cross_palace", "advisor_corner"];

/* 載入 osc-core 與 07z9b 從風向標到檔尾（含掌門暗樁）；旅程結算、棋友判斷、提示都用假的 */
function load(env = {}) {
  const mem = {}, toasts = [], ended = [];
  const c = {
    store: { get: (k, d) => (k in mem ? mem[k] : d), set: (k, v) => { mem[k] = v } },
    jhL: (zh) => zh, jhT: (s) => s, esc: (s) => String(s),
    jhSch: (id) => ({ nm: id + "門", op: id + "開局" }),
    toast: (m) => toasts.push(m), setTimeout: (f) => f(), addXP: () => {},
    oscNpcKey: () => "", journeyGameEnd: (st) => { ended.push(st && st.id) },
    ROUTE_N: 0, location: { hash: "#/journey/play" }, console,   /* stillHere 用的換頁計數與網址（00-util.js、02-shell.js 的 route()） */
    ...env,
  };
  vm.createContext(c);
  vm.runInContext(STILL + ";\n" + OS.slice(OS.indexOf("const OSC=(()=>{"), OS.indexOf("/* ===== END osc-core")) + ";this.OSC=OSC;\n" + JH.slice(JH.indexOf("/* ---------- W45 風向標")), c);
  return { c, mem, toasts, ended };
}
const engineLean = () => { const c = {}; vm.createContext(c); const a = LOCAL.indexOf("function zmLeanOrd"); vm.runInContext(LOCAL.slice(a, LOCAL.indexOf("\n", a)), c); return c.zmLeanOrd };

test("案 4：引擎端與 App 端算出的「今天走主修或副修」完全一致（120 天 × 十派）", () => {
  const { c } = load(), eng = engineLean();
  let sec = 0, n = 0;
  for (let k = 0; k < 120; k++) for (const s of SCH) { const d = new Date(2026, 10, 1 + k, 9); const a = eng("inn:zm_" + s, d), b = c.jhIntelLean(s, d); assert.equal(a, b, s + " " + d.toDateString()); sec += a; n++ }
  assert.ok(sec / n > 0.2 && sec / n < 0.5, "副修約三分之一：" + (sec / n).toFixed(2));
});

test("案 4：同一天固定，換一天會變；打聽到的棋路是主修或副修那一派", () => {
  const { c } = load();
  const d = new Date(2026, 10, 21, 8), d2 = new Date(2026, 10, 21, 23);
  for (const s of SCH) {
    assert.equal(c.jhIntelLean(s, d), c.jhIntelLean(s, d2), "同一天上午晚上一樣");
    const m = c.OSC.MST.find((x) => x.sid === s), got = c.jhIntelSch(s, d);
    assert.ok(got === m.sid || got === m.sec, s + " → " + got);
  }
  const seen = new Set(); for (let k = 0; k < 30; k++) seen.add(c.jhIntelLean("central", new Date(2026, 10, 1 + k)));
  assert.equal(seen.size, 2, "一個月內主修、副修都會輪到");
});

test("〔原始碼〕案 4：引擎端只有十派掌門改成依日期固定，其他棋友照舊 75%／25% 隨機", () => {
  assert.match(LOCAL, /if\(P\.npcOrd==null\)P\.npcOrd=\/\^inn:zm_\/\.test\(nk\)\?zmLeanOrd\(nk\):\(Math\.random\(\)<\.75\?0:1\);/);
});

test("案 4：贏了門下棋友（至少 10 步）才打聽得到；同一天只打聽一次；原本的結算照跑", () => {
  const { c, mem, toasts, ended } = load({ oscNpcKey: () => "inn:tea" });
  const tea = c.OSC.NPC["inn:tea"];
  const st = (w, n) => ({ id: "g" + n + w, human: "r", result: { w }, moves: Array(n).fill({}) });
  c.journeyGameEnd(st("b", 20));
  assert.equal(c.jhIntelOn(tea[0]), false, "輸了不給");
  c.journeyGameEnd(st("r", 6));
  assert.equal(c.jhIntelOn(tea[0]), false, "太短（少於 10 步）不給");
  c.journeyGameEnd(st("r", 20));
  assert.equal(c.jhIntelOn(tea[0]), true, "贏了給");
  assert.equal(toasts.length, 1); assert.match(toasts[0], /悄悄說：掌門.+今天打算走/);
  c.journeyGameEnd(st("r", 22));
  assert.equal(toasts.length, 1, "同一天不重複提示");
  assert.equal(ended.length, 4, "包裝後原本的結算每一盤都照跑");
  mem.jhIntel = { d: "2000-01-01", s: [tea[0]] };
  assert.equal(c.jhIntelOn(tea[0]), false, "隔天要重新打聽");
});

test("案 4（W120）：悄悄話 2.6 秒後才冒；到時換了頁就不冒，但情報已經存好；沒換頁就照常冒", () => {
  const q = [], { c, toasts } = load({ oscNpcKey: () => "inn:tea", setTimeout: (f, ms) => { q.push([f, ms]); return q.length } });
  const tea = c.OSC.NPC["inn:tea"], st = (n) => ({ id: "g" + n, human: "r", result: { w: "r" }, moves: Array(n).fill({}) });
  c.journeyGameEnd(st(20));
  assert.equal(c.jhIntelOn(tea[0]), true, "贏了當下就存好情報");
  assert.deepEqual(q.map(x => x[1]), [2600], "排一個 2.6 秒的悄悄話");
  assert.equal(toasts.length, 0, "還沒到時間不冒");
  c.ROUTE_N++; c.location.hash = "#/journey";   /* 玩家在 2.6 秒內離開對局頁 */
  q.shift()[0]();
  assert.equal(toasts.length, 0, "換了頁就不冒");
  assert.equal(c.jhIntelOn(tea[0]), true, "情報照樣留著");
  const b = load({ oscNpcKey: () => "inn:tea", setTimeout: (f, ms) => { q.push([f, ms]); return q.length } });
  b.c.journeyGameEnd(st(20));
  assert.deepEqual(q.map(x => x[1]), [2600]);
  q.shift()[0]();
  assert.equal(b.toasts.length, 1, "沒換頁照常冒"); assert.match(b.toasts[0], /悄悄說：掌門.+今天打算走/);
});

test("案 4：掌門盤本身、沒有對應門派的對局都不會解鎖", () => {
  const { c } = load({ oscNpcKey: () => "zm:zm_central" });
  c.journeyGameEnd({ id: "z", human: "r", result: { w: "r" }, moves: Array(30).fill({}) });
  assert.equal(c.jhIntelGot().length, 0);
  const b = load({ oscNpcKey: () => "" });
  b.c.journeyGameEnd({ id: "x", human: "r", result: { w: "r" }, moves: Array(30).fill({}) });
  assert.equal(b.c.jhIntelGot().length, 0);
});

test("案 4：駐地小卡——打聽到了寫出今天的棋路；還沒有就說要贏哪幾位門人；沒有門人就不寫", () => {
  const { c, mem } = load();
  const m = c.OSC.MST.find((x) => x.sid === "screen");
  assert.match(c.jhIntelHTML("screen", m, ["甲", "乙", "丙", "丁"]), /先贏一位門下棋友（甲、乙、丙）/);
  assert.equal(c.jhIntelHTML("screen", m, []), "");
  mem.jhIntel = { d: c.jhWindDay(new Date()), s: ["screen"] };
  const h = c.jhIntelHTML("screen", m, ["甲"]);
  assert.match(h, /class="jh-intel"/); assert.match(h, new RegExp("打聽到了：" + m.nm + "今天打算走.+開局"));
});

test("〔原始碼〕案 4：小卡接上暗樁那一段；包裝只做一次", () => {
  assert.match(JH, /\$\{m\?jhIntelHTML\(sid,m,mates\):""\}/);
  assert.match(JH, /if\(typeof journeyGameEnd==="function"&&!journeyGameEnd\.jhIntel\)/);
});

test("〔原始碼〕案 9：掌門盤沒贏、自己下了 3 手以上，主要按鈕是關鍵步重練；中英都有", () => {
  assert.match(CG, /if\(\/\^inn:zm_\/\.test\(String\(j\|\|""\)\)&&!win&&st\.moves\.filter\(m=>m\.by===st\.human\)\.length>=3\)\{const gid=st\.id,hu=st\.human,lx=mflLx\(st\);return resBtns\(\[cgT\("res\.keyMoveZm","🔎 復盤：看懂這盤最關鍵的一步 ›"\),\(\)=>mflOpen\(gid,hu,lx\)\],again,false,bk\)\}/);
  assert.match(rd("xiangqi-db/m/07i18n.js"), /"res\.keyMoveZm":"🔎 Review: the key move of this game ›"/);
});
