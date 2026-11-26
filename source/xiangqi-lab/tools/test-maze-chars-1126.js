/* 迷宮地圖字元不跨檔撞名（11/26 Windows Claude 2 發現；iMac Claude 1 審 #239 後補強）：
   每一層用 JH_MZ_OBJ／JH_MZ_TILE[字元] 登記這格的 3D 物件與平面畫法；全部迷宮檔共用同一張表。
   兩種撞法都會畫錯：直接寫入＝m.html 排在後面的檔蓋掉前面；if(!…) 守衛寫法＝先到先贏，後面那派自己的畫法沒生效。
   當時撞到的：起馬第三層驛門 J、K（反宮馬）、仙人指路竹林 Z（過宮炮）、仙人指路的河 ~（列炮）、飛相第二層淤泥 U（反宮馬第二層墨池）、
   起馬第二層瓦片 V（屏風馬第二層地裂）、順炮鹽灶 Z（過宮炮）、列炮戲箱 X（飛相考箱）、飛相第三層水坑 Q（中炮第二層）、仙人指路第三層流水 F（列炮第二層）。
   做法：照 m.html 的 //#include 順序載入全部 m/07z9m-*.js（不在 m.html 的接在最後）；每個檔載入前先把兩張表暫時清空，
   記下這個檔自己登記了哪些字元（守衛擋掉的那次也看得到），再把表還原。同一個字元被兩個檔登記、而且畫法（函式原始碼）不同＝撞名。
   畫法一字不差的重複登記（例如第二層照抄第一層同一個東西）不算撞。含三種改壞驗證。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const DB = path.join(__dirname, "..", "..", "xiangqi-db"), M = path.join(DB, "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const SKIP = ["07z9m-fall.js"];

/* 照 m.html 的載入順序；m.html 沒列到的迷宮檔接在最後 */
function mazeFiles() {
  const html = fs.readFileSync(path.join(DB, "m.html"), "utf8");
  const inc = [...html.matchAll(/^\/\/#include m\/(07z9m-[^\s]+\.js)\s*$/gm)].map((m) => m[1]).filter((f) => !SKIP.includes(f));
  const rest = fs.readdirSync(M).filter((f) => /^07z9m-[a-z]+\d?\.js$/.test(f) && !SKIP.includes(f) && !inc.includes(f)).sort();
  return [...inc, ...rest];
}

function regs(patch = {}) {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, vibrate: () => {}, jhGo: () => {}, jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: () => ({ style: {}, dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {} }), head: { append() {} }, body: { append() {} } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false }); c.location = { href: "http://x/index.html#/", hash: "#/" };
  vm.createContext(c);
  const files = mazeFiles(), out = [];   /* out：{ f, k, ch, src } 每個檔自己登記的字元 */
  for (const f of files) {
    const src = patch[f] ? patch[f](rd(f)) : rd(f);
    if (f === "07z9m-maze.js") { vm.runInContext(src, c); for (const k of ["OBJ", "TILE"]) { const T = vm.runInContext("JH_MZ_" + k, c); for (const ch of Object.keys(T)) out.push({ f, k, ch, src: String(T[ch]) }) } continue }
    const saved = {};
    for (const k of ["OBJ", "TILE"]) { const T = vm.runInContext("JH_MZ_" + k, c); saved[k] = Object.assign({}, T); for (const ch of Object.keys(T)) delete T[ch] }
    vm.runInContext(src, c);
    for (const k of ["OBJ", "TILE"]) {
      const T = vm.runInContext("JH_MZ_" + k, c), mine = Object.assign({}, T);
      for (const ch of Object.keys(mine)) if (typeof mine[ch] === "function") out.push({ f, k, ch, src: String(mine[ch]) });
      for (const ch of Object.keys(T)) delete T[ch];
      Object.assign(T, mine, saved[k]);   /* 還原：已經有的保持原樣（先到先贏），新的加進去；撞名由上面的記錄判斷 */
    }
  }
  return { files, out };
}

/* 刻意沿用（白名單，要寫理由）：同一個東西、只是有備援畫法，不是兩派搶同一個字元 */
const ALLOW = {
  /* 說明碑 L、牆上暗格 H：07z9m-lore.js 是正本（m.html 排在全部門派前面，先載入）；
     07z9m-cross.js 用 if(!…) 留一份備援，lore.js 沒載入時才用，兩邊代表同一個東西 */
  "OBJ:L": ["07z9m-lore.js", "07z9m-cross.js"], "OBJ:H": ["07z9m-lore.js", "07z9m-cross.js"],
  "TILE:L": ["07z9m-lore.js", "07z9m-cross.js"], "TILE:H": ["07z9m-lore.js", "07z9m-cross.js"],
};

function clashes(patch = {}) {
  const { out } = regs(patch), by = {}, bad = [];
  for (const key of Object.keys(ALLOW)) { const [k, ch] = key.split(":"), ok = ALLOW[key]; for (let i = out.length - 1; i >= 0; i--) if (out[i].k === k && out[i].ch === ch && ok.includes(out[i].f) && out[i].f !== ok[0]) out.splice(i, 1) }
  for (const r of out) (by[r.k + ":" + r.ch] = by[r.k + ":" + r.ch] || []).push(r);
  for (const key of Object.keys(by)) {
    const list = by[key], first = list[0];
    for (const r of list.slice(1)) if (r.f !== first.f && r.src !== first.src) bad.push(`JH_MZ_${r.k}["${r.ch}"]：${first.f} 跟 ${r.f} 都登記、畫法不同`);
  }
  return bad;
}

test("載入順序照 m.html（迷宮檔都有載到）", () => {
  const { files } = regs();
  assert.ok(files.length >= 20, "要真的載入全部迷宮檔：" + files.length);
  assert.equal(files[0], "07z9m-maze.js");
  assert.ok(files.indexOf("07z9m-palace2.js") < files.indexOf("07z9m-elephant2.js"), "照 m.html：反宮馬第二層在飛相第二層前面");
});

test("迷宮地圖字元不跨檔撞名（直接寫入、if(!…) 守衛兩種都算）", () => {
  assert.deepEqual(clashes(), []);
});

test("改壞驗證：三種撞法都要抓得到", () => {
  const cases = [
    ["竹林換回 Z（直接寫入，撞過宮炮第一層）", "07z9m-pawn2.js", (s) => s.split('JH_MZ_OBJ["z"]=').join('JH_MZ_OBJ["Z"]='), '["Z"]'],
    ["列炮戲箱換回 X（if(!…) 守衛，撞飛相考箱）", "07z9m-opp.js", (s) => s.split('if(!JH_MZ_OBJ["o"])JH_MZ_OBJ["o"]=').join('if(!JH_MZ_OBJ["X"])JH_MZ_OBJ["X"]='), '["X"]'],
    ["飛相第二層淤泥換回 U（照 m.html 順序才看得出來，撞反宮馬第二層墨池）", "07z9m-elephant2.js", (s) => s.split('JH_MZ_OBJ["m"]').join('JH_MZ_OBJ["U"]'), '["U"]'],
  ];
  for (const [name, f, fn, key] of cases) {
    const p = { [f]: fn };
    assert.notEqual(fn(rd(f)), rd(f), name + "：改壞的程式要真的有改到");
    assert.ok(clashes(p).some((m) => m.includes(key)), name + "：要抓得到");
  }
});
