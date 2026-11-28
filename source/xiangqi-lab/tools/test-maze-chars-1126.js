/* 迷宮地圖字元不跨檔撞名（11/26 Windows Claude 2 發現；iMac Claude 1 審 #239 後補強）：
   每一層用 JH_MZ_OBJ／JH_MZ_TILE[字元] 登記這格的 3D 物件與平面畫法；全部迷宮檔共用同一張表。
   兩種撞法都會畫錯：直接寫入＝m.html 排在後面的檔蓋掉前面；if(!…) 守衛寫法＝先到先贏，後面那派自己的畫法沒生效。
   當時撞到的：起馬第三層驛門 J、K（反宮馬）、仙人指路竹林 Z（過宮炮）、仙人指路的河 ~（列炮）、飛相第二層淤泥 U（反宮馬第二層墨池）、
   起馬第二層瓦片 V（屏風馬第二層地裂）、順炮鹽灶 Z（過宮炮）、列炮戲箱 X（飛相考箱）、飛相第三層水坑 Q（中炮第二層）、仙人指路第三層流水 F（列炮第二層）。
   做法：照 m.html 的 //#include 順序載入全部 m/07z9m-*.js（不在 m.html 的接在最後）；每個檔載入前先把兩張表暫時清空，
   記下這個檔自己登記了哪些字元（守衛擋掉的那次也看得到），再把表還原。同一個字元被兩個檔登記＝撞名（不看原始碼一不一樣：同樣的程式、閉包值不同照樣畫錯）；只有白名單 ALLOW 例外。
   另外照 m.html 順序整串載入一次（不清表）：每載完一個檔，之前已有的字元都要還是同一個函式、不能少；白名單的字元最後要是正本那份。
   另有地圖字元檢查（每層地圖只能用共用字元、說明碑、自己或同派前幾層登記的）。都含改壞驗證。 */
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

function mkCtx() {
  const mem = {}, c = {
    store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, vibrate: () => {}, jhGo: () => {}, jhHallPc: () => "",
    document: { getElementById: () => ({}), createElement: () => ({ style: {}, dataset: {}, classList: { add() {} }, setAttribute() {}, addEventListener() {} }), head: { append() {} }, body: { append() {} } },
    setTimeout: () => 0, clearTimeout: () => {}, addEventListener: () => {}, removeEventListener: () => {},
    Image: function () { return { dataset: {} } }, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  c.window = c; c.window.matchMedia = () => ({ matches: false }); c.location = { href: "http://x/index.html#/", hash: "#/" };
  vm.createContext(c);
  return c;
}

/* 列鍵一律用 Reflect.ownKeys（含不可列舉、Symbol 鍵；#239 第四輪複審）；snap 記下每個自有屬性的描述 */
const keysOf = (T) => Reflect.ownKeys(T);
const snap = (T) => { const o = new Map(); for (const ch of keysOf(T)) o.set(ch, Object.getOwnPropertyDescriptor(T, ch)); return o };
/* 兩張表的形狀：原型是 context 自己的 Object.prototype（擋 setPrototypeOf），每個自有屬性都可列舉、而且是函式 */
function shapeProblems(c, f) {
  const bad = [], OP = vm.runInContext("Object.getPrototypeOf({})", c);
  for (const k of ["OBJ", "TILE"]) {
    const T = vm.runInContext("JH_MZ_" + k, c);
    if (Object.getPrototypeOf(T) !== OP) bad.push(`載完 ${f}：JH_MZ_${k} 的原型被換掉`);
    for (const ch of keysOf(T)) {
      const d = Object.getOwnPropertyDescriptor(T, ch);
      if (!d.enumerable) bad.push(`載完 ${f}：JH_MZ_${k}["${String(ch)}"] 不可列舉`);
      if (!("value" in d) || typeof d.value !== "function") bad.push(`載完 ${f}：JH_MZ_${k}["${String(ch)}"] 不是函式`);
    }
  }
  return bad;
}

function regs(patch = {}) {
  const c = mkCtx();
  const files = mazeFiles(), out = [], owner = {};   /* out：{ f, k, ch, src } 每個檔自己登記的字元；owner：每一層是哪個檔加的 */
  for (const f of files) {
    const src = patch[f] ? patch[f](rd(f)) : rd(f);
    if (f === "07z9m-maze.js") { vm.runInContext(src, c); for (const k of ["OBJ", "TILE"]) { const T = vm.runInContext("JH_MZ_" + k, c); for (const ch of keysOf(T)) out.push({ f, k, ch: String(ch), src: String(T[ch]) }) } continue }
    const saved = {};
    for (const k of ["OBJ", "TILE"]) { const T = vm.runInContext("JH_MZ_" + k, c); saved[k] = snap(T); for (const ch of keysOf(T)) delete T[ch] }
    vm.runInContext(src, c);
    for (const k of ["OBJ", "TILE"]) {
      const T = vm.runInContext("JH_MZ_" + k, c), mine = snap(T);
      for (const [ch, d] of mine) out.push({ f, k, ch: String(ch), src: String(d.value) });   /* 不管是不是函式、可不可列舉都記；形狀另外由 shapeProblems 擋 */
      for (const ch of keysOf(T)) delete T[ch];
      /* 還原：已經有的保持原樣（先到先贏），新的加進去；撞名由上面的記錄判斷 */
      for (const [ch, d] of mine) if (!saved[k].has(ch)) Object.defineProperty(T, ch, d);
      for (const [ch, d] of saved[k]) Object.defineProperty(T, ch, d);
    }
    /* 這個檔載完之後才出現的層＝這個檔的層（sid:第幾層） */
    const LV = vm.runInContext("JH_MZ_LV", c);
    for (const sid of Object.keys(LV)) {
      const n = typeof c.jhMzLayers === "function" ? c.jhMzLayers(sid) : 1;
      for (let k = 1; k <= n; k++) if (!(sid + ":" + k in owner)) owner[sid + ":" + k] = { f, sid, k, map: (c.jhMzLvN ? c.jhMzLvN(sid, k) : LV[sid]).map };
    }
  }
  return { files, out, owner: Object.values(owner) };
}

/* 地圖字元（#239 複審）：共用程式（07z9m-maze.js）認得的格子，加上說明碑模組（07z9m-lore.js）的 L、H */
const SHARED = "#.DCTSP>@", LORE = "LH";
/* 漕運密室（W172，11/27，07z9m-vault.js）的 N（銅鎖門）、p（殘譜架）：只准由 07z9m-vault.js 登記，只准用在有密室的那幾層。
   名單寫死在這裡（不從 07z9m-vault.js 讀）：加派要連這支測試一起改、一起審 */
const VAULT = "Np", VAULT_FILE = "07z9m-vault.js", VAULT_AT = new Set(["central:2", "elephant:2", "horse:2", "pawn:2"]);
function mapProblems(patch = {}) {
  const { out, owner } = regs(patch), bad = [], mine = {};
  for (const r of out) (mine[r.f] = mine[r.f] || new Set()).add(r.ch);
  for (const r of out) if (r.f !== "07z9m-maze.js" && SHARED.includes(r.ch)) bad.push(`${r.f} 登記了共用字元 "${r.ch}"（會改掉全部迷宮的 ${r.ch}）`);
  for (const r of out) if (VAULT.includes(r.ch) && r.f !== VAULT_FILE) bad.push(`${r.f} 登記了密室字元 "${r.ch}"（只准 ${VAULT_FILE} 登記）`);
  for (const L of owner) {
    const ok = new Set([...SHARED, ...LORE, ...(mine[L.f] || []), ...(VAULT_AT.has(L.sid + ":" + L.k) ? VAULT : "")]);
    if (L.f !== VAULT_FILE) for (const ch of mine[VAULT_FILE] || []) if (!VAULT_AT.has(L.sid + ":" + L.k)) ok.delete(ch);
    for (const P of owner) if (P.sid === L.sid && P.k < L.k) for (const ch of mine[P.f] || []) ok.add(ch);
    const used = new Set((L.map || []).join(""));
    for (const ch of used) if (!ok.has(ch)) bad.push(`${L.sid} 第 ${L.k} 層（${L.f}）地圖用了 "${ch}"：不是共用字元、也不是自己或同派前幾層登記的`);
  }
  return bad;
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
    for (const r of list.slice(1)) if (r.f !== first.f) bad.push(`JH_MZ_${r.k}["${r.ch}"]：${first.f} 跟 ${r.f} 都登記`);   /* 不看原始碼一不一樣：同樣的程式、閉包值不同照樣畫錯（#239 第三輪複審） */
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

test("每層地圖只用共用字元、說明碑 L／H、自己或同派前幾層登記的字元；門派檔不准登記共用字元", () => {
  const { owner } = regs();
  assert.ok(owner.length >= 20, "要真的看到全部的層：" + owner.length);
  assert.deepEqual(mapProblems(), []);
});

test("改壞驗證：地圖借別派字元、門派檔登記共用字元，都要抓得到", () => {
  const cases = [
    ["仙人指路第二層地圖借列炮的 ~", "07z9m-pawn2.js", (s) => s.replace('"#rrrrrrrrrrrrr#"', '"#~~~~~~~~~~~~~#"'), "地圖用了 \"~\""],
    ["列炮第一層地圖借飛相的 X", "07z9m-opp.js", (s) => s.replace('"#..o.......o..#"', '"#..X.......o..#"'), "地圖用了 \"X\""],
    ["仙人指路第二層登記共用的寶箱 C", "07z9m-pawn2.js", (s) => s + "\nJH_MZ_OBJ.C=H=>null;\n", "登記了共用字元 \"C\""],
  ];
  for (const [name, f, fn, key] of cases) {
    assert.notEqual(fn(rd(f)), rd(f), name + "：改壞的程式要真的有改到");
    assert.ok(mapProblems({ [f]: fn }).some((m) => m.includes(key)), name + "：要抓得到");
  }
});

/* 整串載入（#239 第三輪複審）：照 m.html 順序、不清表，模擬真的網頁。
   每載完一個檔，之前已有的字元都要還是同一個函式（===）、不能少；白名單的字元最後要是正本（ALLOW 第一個檔）登記的那份。 */
function fullLoad(patch = {}) {
  const c = mkCtx(), bad = [], first = {};   /* first：每個字元第一次出現時的函式與檔名 */
  for (const f of mazeFiles()) {
    const before = {};
    if (f !== "07z9m-maze.js") for (const k of ["OBJ", "TILE"]) before[k] = snap(vm.runInContext("JH_MZ_" + k, c));
    vm.runInContext(patch[f] ? patch[f](rd(f)) : rd(f), c);
    bad.push(...shapeProblems(c, f));
    for (const k of ["OBJ", "TILE"]) {
      const T = vm.runInContext("JH_MZ_" + k, c);
      for (const [ch, d] of before[k] || new Map()) {
        const now = Object.getOwnPropertyDescriptor(T, ch), nm = String(ch);
        if (!now) bad.push(`載完 ${f}：JH_MZ_${k}["${nm}"] 不見了`);
        else if (now.value !== d.value) bad.push(`載完 ${f}：JH_MZ_${k}["${nm}"] 被換掉（原本是 ${first[k + ":" + nm]}）`);
      }
      for (const ch of keysOf(T)) if (!(k + ":" + String(ch) in first)) first[k + ":" + String(ch)] = f;
    }
  }
  for (const key of Object.keys(ALLOW)) if (first[key] !== ALLOW[key][0]) bad.push(`${key} 最後不是正本 ${ALLOW[key][0]} 那份（是 ${first[key]}）`);
  return bad;
}

test("整串載入：已登記的字元不會被後面的檔換掉或弄丟；說明碑 L、H 是 lore.js 那份", () => {
  assert.deepEqual(fullLoad(), []);
});

test("改壞驗證：過宮炮拿掉守衛、真的蓋掉說明碑；或門派檔直接蓋掉別人的字元，都要抓得到", () => {
  const cases = [
    ["過宮炮第一層說明碑 L 拿掉 if(!…)", "07z9m-cross.js", (s) => s.replace("if(!JH_MZ_OBJ.L)JH_MZ_OBJ.L=", "JH_MZ_OBJ.L="), '["L"] 被換掉'],
    ["列炮第一層直接蓋掉飛相的考箱 X", "07z9m-opp.js", (s) => s + "\nJH_MZ_OBJ.X=H=>null;\n", '["X"] 被換掉'],
  ];
  for (const [name, f, fn, key] of cases) {
    assert.notEqual(fn(rd(f)), rd(f), name + "：改壞的程式要真的有改到");
    assert.ok(fullLoad({ [f]: fn }).some((m) => m.includes(key)), name + "：要抓得到");
  }
  /* 同樣的原始碼、不同的檔再登記一次也算撞（不再用「畫法一字不差」豁免） */
  const same = (s) => s + '\nJH_MZ_OBJ["y"]=H=>null;\n', dup = { "07z9m-pawn2.js": same, "07z9m-horse2.js": same };
  assert.ok(clashes(dup).some((m) => m.includes('["y"]')), "兩個檔登記一模一樣的程式也要抓得到");
});

test("改壞驗證：不可列舉的新鍵、非函式的值、改原型，都要抓得到（#239 第四輪 e4a、e4c、e7a、e7b）", () => {
  const add = (line) => (s) => s + "\n" + line + "\n";
  const hidden = 'Object.defineProperty(JH_MZ_OBJ,"y",{value:H=>null,enumerable:false,writable:true,configurable:true});';
  const cases = [
    ["e4a 仙人指路第二層加一個不可列舉的新鍵 y", { "07z9m-pawn2.js": add(hidden) }, "不可列舉"],
    ["e4c 不可列舉的 y 之後，起馬第二層直接寫 y 蓋掉", { "07z9m-pawn2.js": add(hidden), "07z9m-horse2.js": add("JH_MZ_OBJ.y=H=>1;") }, '["y"] 被換掉'],
    ["e7a 仙人指路第二層寫入非函式 y=1", { "07z9m-pawn2.js": add("JH_MZ_OBJ.y=1;") }, "不是函式"],
    ["e7b y=1 之後，起馬第二層用 if(!…) 守衛寫 y（自己的沒生效）", { "07z9m-pawn2.js": add("JH_MZ_OBJ.y=1;"), "07z9m-horse2.js": add("if(!JH_MZ_OBJ.y)JH_MZ_OBJ.y=H=>null;") }, "不是函式"],
    ["改原型：仙人指路第二層把 y 藏在原型上", { "07z9m-pawn2.js": add("Object.setPrototypeOf(JH_MZ_OBJ,{y:H=>null});") }, "原型被換掉"],
  ];
  for (const [name, patch, key] of cases) {
    for (const f of Object.keys(patch)) assert.notEqual(patch[f](rd(f)), rd(f), name + "：改壞的程式要真的有改到");
    assert.ok(fullLoad(patch).some((m) => m.includes(key)), name + "：要抓得到（" + key + "）");
  }
  /* e4c、e7b 在 regs 這邊也要記成兩個檔都登記 y */
  assert.ok(clashes({ "07z9m-pawn2.js": add(hidden), "07z9m-horse2.js": add("JH_MZ_OBJ.y=H=>1;") }).some((m) => m.includes('["y"]')), "e4c：撞名檢查也要看得到不可列舉的 y");
  assert.ok(clashes({ "07z9m-pawn2.js": add("JH_MZ_OBJ.y=1;"), "07z9m-horse2.js": add("if(!JH_MZ_OBJ.y)JH_MZ_OBJ.y=H=>null;") }).some((m) => m.includes('["y"]')), "e7b：撞名檢查也要看得到非函式的 y");
});
