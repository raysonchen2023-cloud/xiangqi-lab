/* 迷宮地圖字元不跨檔撞名（11/26 Windows Claude 2 發現）：
   每一層用 JH_MZ_OBJ／JH_MZ_TILE[字元] 登記這格的 3D 物件與平面畫法；全部迷宮檔共用同一張表，m.html 排在後面的檔會默默蓋掉前面的。
   當時撞到的：起馬第三層驛門 J、K 蓋掉反宮馬第一層廢墨池 K、第二層墨閘 J；仙人指路第二層竹林 Z 蓋掉過宮炮第一層 Z；
   仙人指路第一層的河 ~ 跟列炮第一層撞；飛相第三層水坑 Q 撞中炮第二層；仙人指路第三層流水 F 撞列炮第二層。
   做法：依序載入全部迷宮檔，每載完一個就比對兩張表；已經有人登記的字元被換成別的函式＝撞字元。點號、中括號、迴圈哪種寫法都抓得到。
   新增迷宮檔不用改這支測試（自動讀 m/07z9m-*.js）。含改壞驗證。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");

function mazeFiles() {
  const skip = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-fall.js"];
  return ["07z9m-maze.js", "07z9m-lore.js", ...fs.readdirSync(M).filter((f) => /^07z9m-[a-z]+\d?\.js$/.test(f) && !skip.includes(f)).sort()];
}
function clashes(patch = {}) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, vibrate: () => {}, jhGo: () => {}, jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: () => ({ style: {}, dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {} }), head: { append() {} }, body: { append() {} } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false }); c.location = { href: "http://x/index.html#/", hash: "#/" };
  vm.createContext(c);
  const own = { OBJ: {}, TILE: {} }, bad = [];
  for (const f of mazeFiles()) {
    vm.runInContext(patch[f] ? patch[f](rd(f)) : rd(f), c);
    for (const k of ["OBJ", "TILE"]) {
      const cur = vm.runInContext("JH_MZ_" + k, c);
      for (const ch of Object.keys(cur)) {
        const prev = own[k][ch];
        if (prev && prev.fn !== cur[ch]) bad.push(`JH_MZ_${k}["${ch}"]：${prev.f} 登記的被 ${f} 蓋掉`);
        if (!prev || prev.fn !== cur[ch]) own[k][ch] = { f, fn: cur[ch] };
      }
    }
  }
  return bad;
}

test("迷宮地圖字元不跨檔撞名（JH_MZ_OBJ／JH_MZ_TILE 沒有被後面的檔蓋掉）", () => {
  assert.ok(mazeFiles().length >= 12, "要真的載入全部迷宮檔");
  assert.deepEqual(clashes(), []);
});

test("改壞驗證：仙人指路第二層竹林換回 Z（跟過宮炮第一層撞）時要抓得到", () => {
  const p = { "07z9m-pawn2.js": (s) => s.split('JH_MZ_OBJ["z"]=').join('JH_MZ_OBJ["Z"]=') };
  assert.notEqual(p["07z9m-pawn2.js"](rd("07z9m-pawn2.js")), rd("07z9m-pawn2.js"));
  assert.ok(clashes(p).some((m) => m.includes('["Z"]')));
});
