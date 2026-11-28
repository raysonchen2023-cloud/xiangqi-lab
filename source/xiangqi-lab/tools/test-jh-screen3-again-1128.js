/* W196（11/28，外部審核第 9 項）屏風馬第三層「再走一次」留著上一趟轉過的石鼓方向（m/07z9m-screen3.js 包住 jhMzReset）。
   用 vm 跑真的程式（m.html 裡全部 07z9m-*，含排最後的 07z9m-vault.js），照迷宮畫面「再走一次」的真實做法 Object.assign(S, jhMzNew(...)) 開新的一趟。
   檢查：新的一趟石鼓全部回到地圖原本的方向（JH_MZ_SCREEN3_DRUM0），而且之後轉石鼓不會改到原始表；被拖回入口（jhMzReset 不完整重建）照舊保留轉過的方向；
   其他派、其他層不會多出 drum3；中炮、飛相第二層的密室包裝照樣有效（兩支包裝疊在一起不互相吃掉）。
   「改壞驗證」：拿掉這次的包裝、只在被拖回時也重設、重設時直接拿原始表（之後轉石鼓會改到原始表），都要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), M = path.join(ROOT, "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const HTML = fs.readFileSync(path.join(ROOT, "xiangqi-db", "m.html"), "utf8");
const FILES = [...HTML.matchAll(/^\/\/#include m\/(07z9m-[\w-]+\.js)$/gm)].map((m) => m[1]);
const MAZE = rd("07z9m-maze.js");

function load(patch) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, vibrate: () => {}, jhGo: () => {}, jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: () => ({ style: {}, dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {} }), head: { append() {} }, body: { append() {} } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false }); c.location = { href: "http://x/index.html#/", hash: "#/jianghu/maze/screen?l=3" };
  vm.createContext(c);
  for (const f of FILES) vm.runInContext(f === "07z9m-screen3.js" && patch ? patch(rd(f)) : rd(f), c);
  return c;
}
const G = (c, n) => vm.runInContext(n, c);   /* const 宣告的全域，vm 外拿不到 */
const P = (from, to) => (s) => { assert.ok(s.includes(from), "改壞點不存在：" + from.slice(0, 60)); return s.replace(from, to) };

/* 照迷宮畫面「再走一次」的做法開新的一趟（07z9m-maze.js：const n2=jhMzNew(LV,R.G.clear,jhMzPtrGet(LV));Object.assign(S,n2)） */
const again = (c, S) => { const n2 = c.jhMzNew(S.lv, 1, {}); Object.assign(S, n2); return S };
/* 把每一顆石鼓都轉一下（模擬上一趟轉過） */
const turnAll = (c, S) => { const D0 = G(c, "JH_MZ_SCREEN3_DRUM0"), D = G(c, "jhMzScreen3Drum")(S); for (const k of Object.keys(D0)) D[k] = (D0[k] + 1) % 4; return S };

function chkAgain(c) {   /* 再走一次：石鼓全部回到原本方向；之後再轉也不會改到原始表 */
  const D0 = JSON.stringify(G(c, "JH_MZ_SCREEN3_DRUM0")), S = turnAll(c, c.jhMzNew(c.jhMzLvN("screen", 3)));
  if (JSON.stringify(S.drum3) === D0) return false;   /* 要真的轉過了才算測到 */
  again(c, S); if (JSON.stringify(S.drum3) !== D0) return false;
  turnAll(c, S); return JSON.stringify(G(c, "JH_MZ_SCREEN3_DRUM0")) === D0;
}
function chkDragKeeps(c) {   /* 被拖回入口（不完整重建）：轉過的方向照舊 */
  const S = turnAll(c, c.jhMzNew(c.jhMzLvN("screen", 3))), before = JSON.stringify(S.drum3);
  c.jhMzReset(S, false); return JSON.stringify(S.drum3) === before;
}

test("〔原始碼〕登記：石鼓原始表有石鼓；07z9m-screen3.js 排在 07z9m-vault.js 前面；迷宮畫面的「再走一次」還是 Object.assign(S, jhMzNew(...))", () => {
  const c = load(); assert.ok(Object.keys(G(c, "JH_MZ_SCREEN3_DRUM0")).length >= 2, "原始表要有石鼓");
  assert.ok(FILES.indexOf("07z9m-screen3.js") >= 0 && FILES.indexOf("07z9m-screen3.js") < FILES.indexOf("07z9m-vault.js"));
  assert.ok(/data-a="again"\]'\)\.onclick=\(\)=>\{shut\(o\);const n2=jhMzNew\(LV,R\.G\.clear,jhMzPtrGet\(LV\)\);Object\.assign\(S,n2\)/.test(MAZE), "這支測試照抄的「再走一次」做法要跟迷宮畫面一樣；畫面改了要一起改測試");
});
test("再走一次：上一趟轉過的石鼓全部回到地圖原本的方向；之後再轉也不會改到原始表", () => { assert.ok(chkAgain(load())) });
test("被拖回入口：轉過的石鼓照舊是那個方向（原本的規則）", () => { assert.ok(chkDragKeeps(load())) });
test("其他派、其他層不受影響：新開局沒有 drum3；中炮第二層的密室包裝照樣有效（新開局有銅鎖門）", () => {
  const c = load();
  for (const [sid, n] of [["screen", 2], ["screen", 1], ["central", 2], ["horse", 3]]) { const L = c.jhMzLvN(sid, n); if (!L || L.layer !== n) continue; assert.equal(c.jhMzNew(L).drum3, undefined, sid + " 第 " + n + " 層") }
  const S = c.jhMzNew(c.jhMzLvN("central", 2)); assert.equal(S.grid[2][8], "N", "中炮第二層的密室門要在");
  assert.equal(typeof c.jhMzReset, "function"); assert.equal(c.jhMzReset.vault, 1, "密室的包裝在最外層");
});
test("改壞驗證：拿掉包裝、被拖回也重設、重設時直接拿原始表，上面的檢查都要抓得到", () => {
  assert.equal(chkAgain(load(P("if (typeof jhMzReset === \"function\" && !jhMzReset.screen3) {", "if (false) {"))), false, "拿掉包裝");
  assert.equal(chkDragKeeps(load(P("if (full && S && S.lv && S.lv.sid === \"screen\"", "if (S && S.lv && S.lv.sid === \"screen\""))), false, "被拖回也重設");
  assert.equal(chkAgain(load(P("S.drum3 = Object.assign({}, JH_MZ_SCREEN3_DRUM0)", "S.drum3 = JH_MZ_SCREEN3_DRUM0"))), false, "重設時直接拿原始表");
});
