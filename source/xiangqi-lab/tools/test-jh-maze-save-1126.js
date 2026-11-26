/* W87-2（11/26 開發者選單「修，跟旅程走」，Windows Claude 1 轉）：地底迷宮的存檔跟旅程走（m/05b-save.js 的 JOURNEY_KEYS 加進 jhMaze、jhMaze_<派>、各層 _L2／_L3、題目指標 …Ptr）。
   用 vm 跑真的程式：05b-save.js 的 JOURNEY_KEYS、saveSnap、saveApply（從原始碼切出來）＋迷宮共用程式和十派、第二層（jhMzGet、jhMzSave），兩邊共用同一個假 localStorage。
   守住：每一派每一層的存檔鍵、題目指標都在清單裡（加派、加層忘了補會紅）；兩段旅程互不影響；舊存檔升上來，現有的迷宮進度歸給當時正在玩的那段旅程、別格從頭開始、帳號層的鍵不動。
   「改壞驗證」：同一組檢查拿去跑改壞的清單（拿掉迷宮那一行、漏掉題目指標、少一派），一定要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const M = path.join(__dirname, "..", "..", "xiangqi-db", "m"), rd = (f) => fs.readFileSync(path.join(M, f), "utf8");
const SAVE = rd("05b-save.js");
const MAZE = ["07z9m-maze.js", "07z9m-lore.js", "07z9m-cross.js", "07z9m-pawn.js", "07z9m-elephant.js", "07z9m-screen.js", "07z9m-horse.js", "07z9m-same.js", "07z9m-opp.js", "07z9m-corner.js", "07z9m-palace.js", "07z9m-central2.js"];

/* 05b-save.js 的 JOURNEY_KEYS 那一段（到 const JK 之前）＋ saveSnap、saveApply 兩行 */
function saveCode(src) {
  const a = src.indexOf("const JOURNEY_KEYS="), b = src.indexOf("const JK=new Set(JOURNEY_KEYS)");
  assert.ok(a > 0 && b > a, "找得到 JOURNEY_KEYS 那一段");
  const line = (k) => { const l = src.split("\n").find((x) => x.startsWith(k)); assert.ok(l, k); return l };
  return src.slice(a, b) + "\nconst JK=new Set(JOURNEY_KEYS);\n" + line("function saveSnap(") + "\n" + line("function saveApply(") + "\nthis.JOURNEY_KEYS=JOURNEY_KEYS;";
}
function load(src) {
  const LS = new Map(), localStorage = { getItem: (k) => (LS.has(k) ? LS.get(k) : null), setItem: (k, v) => LS.set(k, String(v)), removeItem: (k) => LS.delete(k) };
  const c = {
    localStorage, store: { get: (k, d) => { const v = localStorage.getItem("m_" + k); return v == null ? d : JSON.parse(v) }, set: (k, v) => localStorage.setItem("m_" + k, JSON.stringify(v)) },
    jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array,
  };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/" }) });
  vm.createContext(c); vm.runInContext(saveCode(src || SAVE), c); for (const f of MAZE) vm.runInContext(rd(f), c);
  return { c, LS };
}

/* 清單檢查：回傳不符合的地方（空陣列＝都符合）。同一組檢查也拿去跑改壞的清單 */
function keysProblems(src) {
  const bad = [], { c } = load(src), K = new Set(Array.from(c.JOURNEY_KEYS)), LV = vm.runInContext("JH_MZ_LV", c);
  for (const sid of Object.keys(LV)) {
    const B = LV[sid], layers = [B].concat(Object.values(B.layers || {}));
    for (const L of layers) for (const k of ["m_" + L.key, "m_" + L.key + "Ptr"]) if (!K.has(k)) bad.push("沒跟旅程走：" + sid + " 第 " + L.layer + " 層 " + k);
    /* 還沒做的層（做到第三層）也先列好：第二層以後的鍵 */
    for (const n of [2, 3]) { const k = "m_" + B.key + "_L" + n; if (!K.has(k) || !K.has(k + "Ptr")) bad.push("第 " + n + " 層的鍵要先列好：" + k) }
  }
  if (!K.has("m_jhMzDeep")) bad.push("最深層 m_jhMzDeep 要跟旅程走");
  for (const k of ["m_lang", "m_slotCur", "m_saveMig1"]) if (K.has(k)) bad.push("帳號層的鍵不能跟旅程走：" + k);
  if (Array.from(c.JOURNEY_KEYS).length !== K.size) bad.push("清單有重複的鍵");
  return bad;
}

test("清單：十派每一層（含第二層示範、還沒做的第三層）的通關紀錄和題目指標、最深層都跟旅程走；帳號層的鍵沒放進去；沒有重複", () => {
  assert.deepEqual(keysProblems(), []);
  const { c } = load(), K = new Set(Array.from(c.JOURNEY_KEYS));
  for (const k of ["m_jhMaze", "m_jhMazePtr", "m_jhMaze_L2", "m_jhMaze_L2Ptr", "m_jhMaze_palace_horse", "m_jhMaze_palace_horse_L3Ptr"]) assert.ok(K.has(k), k);
  assert.equal(Object.keys(vm.runInContext("JH_MZ_LV", c)).length, 10, "十派");
});

test("兩段旅程互不影響：旅程 A 的迷宮進度存在 A 格；開新旅程 B 從頭開始；B 走的不會跑進 A；讀回 A 是 A 的進度", () => {
  const { c, LS } = load(), get = (s, n) => c.jhMzGet(n ? vm.runInContext(`jhMzLvN(${JSON.stringify(s)},${n})`, c) : s);
  LS.set("m_lang", '"zh"');
  const A = c.jhMzNew("pawn"); A.turn = 30; A.bag.gong = 2; c.jhMzSave(A); c.jhMzDeepSet("central", 2); c.jhMzPtrSet("pawn", { door: 3, trap: 1 });
  const L2 = c.jhMzNew(vm.runInContext('jhMzLvN("central",2)', c)); L2.turn = 12; c.jhMzSave(L2);
  assert.equal(get("pawn").clear, 1); assert.equal(get("central", 2).clear, 1);
  const snapA = c.saveSnap(); assert.ok("m_jhMaze_pawn" in snapA && "m_jhMaze_pawnPtr" in snapA && "m_jhMaze_L2" in snapA && "m_jhMzDeep" in snapA, "A 格存到迷宮進度");
  c.saveApply({});   /* 開新旅程 B */
  assert.equal(get("pawn").clear, 0, "B：起馬門從頭開始"); assert.equal(get("central", 2).clear, 0); assert.equal(c.jhMzDeep("central"), 1, "B：最深層從第一層");
  assert.deepEqual({ ...c.jhMzPtrGet("pawn") }, { door: 0, trap: 0 }, "B：題目指標也從頭");
  assert.equal(LS.get("m_lang"), '"zh"', "帳號層的鍵不動");
  const B = c.jhMzNew("pawn"); B.turn = 50; c.jhMzSave(B); c.jhMzSave(B); const snapB = c.saveSnap();
  c.saveApply(snapA);   /* 讀回 A */
  assert.equal(get("pawn").clear, 1, "讀回 A：A 的一次"); assert.equal(get("pawn").best, 30); assert.equal(get("pawn").gong, 2); assert.equal(c.jhMzDeep("central"), 2);
  assert.deepEqual({ ...c.jhMzPtrGet("pawn") }, { door: 3, trap: 1 });
  c.saveApply(snapB); assert.equal(get("pawn").clear, 2, "讀回 B：B 的兩次"); assert.equal(get("central", 2).clear, 0);
});

test("舊存檔升上來：迷宮鍵原本整支手機共用；升級後第一次存檔，現有進度歸給當時正在玩的那段旅程；舊的別格沒有迷宮鍵＝從頭開始；切回來進度還在", () => {
  /* 升級前：清單沒有迷宮鍵（拿掉這次加的那一行）存出來的舊存檔格 */
  const OLD = SAVE.replace(/^for\(const s of JH_MZ_SAVE_SIDS\)[^\n]*\n/m, "");
  assert.notEqual(OLD, SAVE, "切得出升級前的清單");
  const before = load(OLD), up = load();
  for (const [k, v] of [["m_jhMaze", JSON.stringify({ clear: 2, best: 40, gong: 3 })], ["m_jhMaze_screen", JSON.stringify({ clear: 1, best: 22 })], ["m_jhMazePtr", JSON.stringify({ door: 4, trap: 2 })], ["m_lang", '"zh"']]) { before.LS.set(k, v); up.LS.set(k, v) }
  before.LS.set("m_xp", "120"); up.LS.set("m_xp", "120");
  const oldSlot2 = { m_xp: "5" };   /* 別格的舊存檔：沒有迷宮鍵 */
  assert.ok(!("m_jhMaze" in before.c.saveSnap()), "升級前：存檔不帶迷宮鍵");
  const { c, LS } = up;
  assert.equal(c.jhMzGet("central").clear, 2, "升級後：進度照舊讀得到");
  const cur = c.saveSnap(); assert.equal(cur.m_jhMaze, LS.get("m_jhMaze"), "第一次存檔：現有進度存進正在玩的這一格"); assert.ok("m_jhMaze_screen" in cur && "m_jhMazePtr" in cur);
  c.saveApply(oldSlot2); assert.equal(c.jhMzGet("central").clear, 0, "讀舊的別格：迷宮從頭開始"); assert.equal(c.jhMzGet("screen").clear, 0); assert.equal(LS.get("m_lang"), '"zh"');
  c.saveApply(cur); assert.equal(c.jhMzGet("central").clear, 2, "切回來：進度還在"); assert.equal(c.jhMzGet("screen").best, 22); assert.deepEqual({ ...c.jhMzPtrGet("central") }, { door: 4, trap: 2 });
  assert.equal(c.jhMzDeep("central"), 2, "舊存檔沒有 jhMzDeep：第一層走完過＝到過第二層");
});

test("讀檔、開新旅程之前都先存目前這一格（舊玩家第一次切換時，現有迷宮進度才會先存進正在玩的那段旅程）", () => {
  const fn = (name) => { const a = SAVE.indexOf("async function " + name + "("); assert.ok(a > 0, name); return SAVE.slice(a, SAVE.indexOf("\n", SAVE.indexOf("SAVE_LOCK=true", a))) };
  assert.match(fn("slotLoad"), /if\(journey\(\)&&curSlot\(\)&&curSlot\(\)!==n\)await saveNow\(true\);[^\n]*SAVE_LOCK=true;store\.set\("slotCur",n\);saveApply\(S\.data\)/);
  assert.match(fn("journeyStart"), /if\(had&&cur&&cur!==n\)await saveNow\(true\);SAVE_LOCK=true;/);
  assert.match(SAVE, /function saveSnap\(\)\{const d=\{\};for\(const k of JOURNEY_KEYS\)/, "存檔照 JOURNEY_KEYS 抓");
});

test("改壞驗證：拿掉迷宮那一行、漏掉題目指標、少一派、帳號層混進來，清單檢查一定抓得到", () => {
  const P1 = SAVE.replace(/^for\(const s of JH_MZ_SAVE_SIDS\)[^\n]*\n/m, "");
  const P2 = SAVE.replace("JOURNEY_KEYS.push(k,k+\"Ptr\")", "JOURNEY_KEYS.push(k)");
  const P3 = SAVE.replace('"advisor_corner","palace_horse"],JH_MZ_SAVE_LAYERS', '"advisor_corner"],JH_MZ_SAVE_LAYERS');
  const P4 = SAVE.replace('JOURNEY_KEYS.push("m_jhMzDeep");', 'JOURNEY_KEYS.push("m_jhMzDeep","m_lang");');
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P, SAVE, "改壞的字串要真的找得到");
  assert.ok(keysProblems(P1).some((s) => s.includes("沒跟旅程走")), "拿掉迷宮那一行");
  assert.ok(keysProblems(P2).some((s) => s.includes("Ptr")), "漏掉題目指標");
  assert.ok(keysProblems(P3).some((s) => s.includes("palace_horse")), "少一派");
  assert.ok(keysProblems(P4).some((s) => s.includes("帳號層")), "帳號層混進來");
});

test("〔原始碼〕05b-save.js：LF、沒有控制字元；迷宮那一段的全域名稱有 JH_MZ_SAVE 前綴、別的檔沒有同名", () => {
  assert.ok(!SAVE.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SAVE));
  for (const n of ["JH_MZ_SAVE_SIDS", "JH_MZ_SAVE_LAYERS"]) for (const f of fs.readdirSync(M).filter((f) => f.endsWith(".js") && f !== "05b-save.js")) assert.ok(!new RegExp("\\b" + n + "\\b").test(rd(f)), f + " 不能也有 " + n);
});
