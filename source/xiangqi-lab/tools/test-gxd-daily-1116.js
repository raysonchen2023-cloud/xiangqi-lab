// 開發者 11/16：觀星臺「今日異象」「自由擺陣」開張（xiangqi-db/m/07gxd-daily.js；入口在 m/07gxt-guanxing.js 的圭表、石棋桌）。
// 定案 story/新手體驗定案_141_兩輪討論.md：今日異象＝每天所有人同一題的變體陣容、可重玩；自由擺陣＝16 子點數預算自己擺、跟電腦下。
// 不開瀏覽器：模組丟進 vm，規則引擎直接 require src/varengine.js（XQVar 放進 vm，模組的 gxdCall 就不開 worker），實際跑：
//   同一天陣容固定、隔天換（臺灣日期）；擺陣點選與送出前的 validateSetup 驗證；jStart 參數（棋盤 FEN 不帶 " w"、級數、journey）；結算與修為；存檔鍵在 JOURNEY_KEYS；接線。
// 用法：node --test xiangqi-lab/tools/test-gxd-daily-1116.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = f => fs.readFileSync(path.join(ROOT, f), "utf8").replace(/\r\n/g, "\n");
const XQVar = require("../src/varengine.js"), CORE = require("../site/core.js");
const GXD = rd("xiangqi-db/m/07gxd-daily.js"), GXT = rd("xiangqi-db/m/07gxt-guanxing.js"), SAVE = rd("xiangqi-db/m/05b-save.js"), LEG = rd("xiangqi-db/m/07-legend.js"),
  GAME = rd("xiangqi-db/m/08b-cpugame.js"), HTML = rd("xiangqi-db/m.html");
const J = x => JSON.parse(JSON.stringify(x));

function load(o) {
  o = o || {}; const st = Object.assign({}, o.st || {}), log = { jStart: [], toast: [], xp: [], modal: [], hash: [] };
  const ctx = vm.createContext({ console, Math, Date, JSON, Object, String, Array, Promise, Map, setTimeout: () => 0, clearTimeout() { }, addEventListener() { }, removeEventListener() { },
    XQVar, store: { get: (k, d) => (k in st ? J(st[k]) : d), set: (k, v) => { st[k] = J(v) } }, toast: x => log.toast.push(x), esc: s => String(s), vibrate() { },
    location: { set hash(h) { log.hash.push(h) }, get hash() { return "#/guanxing" } },
    jStart: (id, b, go, force) => log.jStart.push({ id, b: J(b), force }),
    addXP: (n, why, key) => { const K = st.xpKeys || {}; if (key && K[key]) return; if (key) { K[key] = 1; st.xpKeys = K } log.xp.push([n, why, key]) },
    modal: (h, btns, cls) => log.modal.push({ h, btns: btns.map(b => b[0]), cls }), sheet() { }, bhLevel: () => (o.lv == null ? 8 : o.lv) });
  vm.runInContext(GXD + ";this.__X={GXD_STD,GXD_OK,GXD_XP,GXD_MEM,gxdDate,gxdKind,gxdIs,gxdFen,gxdFreeId,gxdLx,gxdArgs,gxdTap,gxdCall,gxdDaily,gxdOmenGo,gxdFreePick,gxdFreeStart,gxdOppSetup,gxdSettle,gxdResultModal,gxdOmenRec,gxdRecTxt,gxdCompTxt,gxdParkEx}", ctx);
  return Object.assign(ctx.__X, { st, log });
}

test("〔行為〕今日異象：臺灣日期當題號；同一天陣容固定（換一支手機、重開 App 都一樣）、隔天換一套；跟引擎 dailySetup 同一題", async () => {
  const K = load();
  assert.equal(K.gxdDate(Date.UTC(2026, 10, 15, 16, 0)), "2026-11-16", "臺灣 11/16 00:00");
  assert.equal(K.gxdDate(Date.UTC(2026, 10, 16, 15, 59)), "2026-11-16", "臺灣 11/16 23:59");
  assert.equal(K.gxdDate(Date.UTC(2026, 10, 16, 16, 0)), "2026-11-17", "臺灣過午夜換一天");
  const a = await K.gxdDaily("2026-11-16"), b = await load().gxdDaily("2026-11-16"), c = await load().gxdDaily("2026-11-17");
  assert.equal(a.fen, b.fen, "同一天（不同的 App）同一套"); assert.equal(a.fen, XQVar.dailySetup("2026-11-16").fen, "就是引擎的 dailySetup");
  assert.notEqual(a.fen, c.fen, "隔天換");
  assert.ok(XQVar.validateSetup(a.fen).ok, "今日陣容合法");
  assert.ok(/^今日異象：紅方.+ 對 黑方.+$/.test(a.title), a.title);
  assert.ok(K.gxdCompTxt(a.red, "r").length > 0 && /[車馬砲士象卒]/.test(K.gxdCompTxt(a.black, "b")), "陣容卡寫得出紅黑各是什麼");
  const seen = new Set(); for (let d = 1; d <= 10; d++) seen.add((await K.gxdDaily("2026-12-" + String(d).padStart(2, "0"))).fen);
  assert.ok(seen.size >= 9, "十天幾乎每天不一樣");
});

test("〔行為〕自由擺陣點選：仕相只能放綠點、帥只能搬不能拿掉、16 子滿了要先拿掉、同一種再點一次＝拿掉", () => {
  const K = load(), L = K.GXD_STD;
  assert.match(K.gxdTap(L, "a1", "A").msg, /仕/); assert.match(K.gxdTap(L, "b1", "B").msg, /相/);
  assert.match(K.gxdTap(L, "e0", "x").msg, /帥不能拿掉/); assert.match(K.gxdTap(L, "a1", "K").msg, /九宮/);
  assert.match(K.gxdTap(L, "a1", "R").msg, /16 子/, "標準陣已經 16 子");
  const r1 = K.gxdTap(L, "a3", "P"); assert.ok(!r1.msg && !r1.L.a3 && Object.keys(r1.L).length === 15, "兵再點一次＝拿掉");
  const r2 = K.gxdTap(r1.L, "a1", "R"); assert.equal(r2.L.a1, "R");
  const r3 = K.gxdTap(L, "e1", "K"); assert.ok(r3.L.e1 === "K" && !r3.L.e0 && Object.keys(r3.L).length === 16, "帥搬到 e1");
  const r4 = K.gxdTap(L, "a0", "N"); assert.equal(r4.L.a0, "N", "換成別的子＝取代、子數不變"); assert.equal(Object.keys(r4.L).length, 16);
  assert.deepEqual(J(L), J(K.GXD_STD), "不改到原本的陣");
});

test("〔行為〕自由擺陣送出前一律問 validateSetup：標準陣 47.5 分可以開戰；超過預算、少子、仕不在仕位都擋下來（錯誤訊息照引擎）", async () => {
  const K = load();
  const ok = await K.gxdCall("validateSetup", { side: "r", pieces: K.GXD_STD }); assert.ok(ok.ok); assert.equal(ok.cost.r, 47.5); assert.equal(ok.budget, 48);
  const rook = Object.assign({}, K.GXD_STD, { a3: "R", c3: "R", e3: "R" });
  const v1 = await K.gxdCall("validateSetup", { side: "r", pieces: rook }); assert.ok(!v1.ok); assert.ok(v1.errors.some(e => /超過預算 48 分/.test(e)), v1.errors.join("|"));
  const few = Object.assign({}, K.GXD_STD); delete few.a3;
  const v2 = await K.gxdCall("validateSetup", { side: "r", pieces: few }); assert.ok(v2.errors.some(e => /要剛好 16 子/.test(e)));
  const badA = Object.assign({}, K.GXD_STD); delete badA.d0; badA.a1 = "A";
  const v3 = await K.gxdCall("validateSetup", { side: "r", pieces: badA }); assert.ok(v3.errors.some(e => /仕只能擺在九宮/.test(e)));
  for (const v of [ok, v1, v2, v3]) for (const e of v.errors) assert.ok(!/上限/.test(e), "錯誤訊息不寫上限：" + e);
  assert.equal(await K.gxdFreePick(rook), null, "超過預算不抽電腦的陣、不開局"); assert.equal(K.log.jStart.length, 0); assert.match(K.log.toast[0], /超過預算/);
  assert.equal(K.gxdFreeStart(rook, "std", null), false, "沒有電腦的陣不開局"); assert.equal(K.log.jStart.length, 0);
});

test("〔行為〕jStart 參數：玩家執紅、紅先；lv.fen 只留棋盤（local.js parseFen 剛好 90 格）；今日異象標準級、自由擺陣三檔；journey 名稱", async () => {
  const K = load({ lv: 8 }), D = await K.gxdDaily("2026-11-16");
  K.gxdOmenGo(D); const a = K.log.jStart[0];
  assert.equal(a.id, "gxd:2026-11-16"); assert.equal(a.force, false, "同一天沒下完的那盤接著下");
  assert.deepEqual(a.b, { human: "r", lx: 8, journey: "gxd:2026-11-16", lv: { fen: D.fen.split(" ")[0], turn: "r" } });
  assert.ok(!/\s/.test(a.b.lv.fen)); assert.equal(CORE.parseFen(a.b.lv.fen).length, 90, "帶著 \" w\" 會變 92 格、整盤退回標準開局");
  assert.equal(K.gxdKind(a.id), "omen");
  const O = await K.gxdFreePick(K.GXD_STD); assert.ok(O && O.black && O.fen && O.sty); assert.equal(K.log.jStart.length, 1, "先抽電腦的陣給玩家看，還沒開局");
  assert.equal(K.gxdFreeStart(K.GXD_STD, "hard", O), true); const f = K.log.jStart[1]; assert.equal(f.b.lv.fen, O.fen.split(" ")[0], "開的就是預覽的那一盤");
  assert.match(f.id, /^gxd:f[0-9a-z]+$/); assert.equal(K.gxdKind(f.id), "free"); assert.equal(f.b.journey, f.id); assert.equal(f.b.lx, 10, "挑戰＝實力 +2"); assert.equal(f.b.human, "r");
  const sp = XQVar.fenToSetups(f.b.lv.fen + " w"); assert.deepEqual(J(sp.red.pieces), J(K.GXD_STD), "紅方就是玩家擺的陣");
  assert.ok(XQVar.validateSetup(f.b.lv.fen + " w").ok, "電腦擺的黑方合法、開局不將軍、將帥不照面"); assert.equal(Object.keys(sp.black.pieces).length, 16);
  assert.equal(f.id, K.gxdFreeId(f.b.lv.fen), "同一陣同一個 journey（沒下完可以接著下）");
  const F = K.st.gxdFree; assert.deepEqual(F.lay, J(K.GXD_STD)); assert.equal(F.m, "hard"); assert.ok(F.opp && /陣|鐵壁|兵海/.test(F.opp), "記下電腦的陣名");
  assert.equal(K.gxdLx("easy", 8), 6); assert.equal(K.gxdLx("std", 8), 8); assert.equal(K.gxdLx("easy", 2), 1, "夾在 1～18"); assert.equal(K.gxdLx("hard", 17), 18);
  assert.equal(K.gxdKind("gx:taisu"), null, "幻譜星門不算"); assert.equal(K.gxdKind("bh:xu"), null);
});

test("〔行為〕自由擺陣開局前先看到（11/16 開發者選單）：「換一種」一定換一種風格重抽、每次都合法；按「確定開戰」才 jStart", async () => {
  const K = load(), seq = [0.01, 0.5, 0.99, 0.3, 0.7]; let i = 0; const rnd = () => seq[i++ % seq.length];
  let prev = null;
  for (let n = 0; n < 8; n++) { const O = await K.gxdOppSetup(K.GXD_STD, rnd, prev ? prev.sty : undefined); assert.ok(O, "抽得到");
    if (prev) assert.notEqual(O.sty, prev.sty, "換一種＝換風格"); assert.ok(XQVar.validateSetup(O.fen).ok, "合法"); prev = O }
  assert.equal(K.log.jStart.length, 0, "抽陣、換一種都不開局");
  const src = GXD.slice(GXD.indexOf("function gxdFree(){"), GXD.indexOf("/* ---------- 接到既有流程"));
  for (const k of ["go", "re", "bk"]) assert.ok(src.includes(`data-pv="${k}"`), "預覽三顆鍵：" + k);
  assert.equal((src.match(/gxdFreeStart\(/g) || []).length, 1, "只有「確定開戰」會開局"); assert.ok(/data-pv="go"\]'\)\.onclick=\(\)=>\{[^}]*gxdFreeStart\(/.test(src));
  assert.ok(/O2=await gxdFreePick\(L,O\.sty\)/.test(src), "換一種帶著上一盤的風格（要避開）");
  assert.ok(src.includes("確定開戰") && src.includes("換一種") && src.includes("回去改陣") && !/上限/.test(src));
});

test("〔行為〕結算：今日異象記當天成績（盤數、贏、最快幾回合）；每天第一次贏另給 40 修為、同一盤只算一次；隔天重算；午夜後下完的舊題不蓋掉今天", () => {
  const K = load(), mv = n => Array.from({ length: n }, () => ({}));
  const g1 = { id: "a1", journey: "gxd:2026-11-16", human: "r", result: { w: "b", why: "將死" }, moves: mv(30) };
  let r = K.gxdSettle(g1); assert.ok(r.lost); assert.deepEqual(J(K.st.gxdOmen), { d: "2026-11-16", n: 1, w: 0, best: 0 }); assert.equal(K.log.xp.length, 0);
  const g2 = { id: "a2", journey: "gxd:2026-11-16", human: "r", result: { w: "r", why: "將死" }, moves: mv(41) };
  r = K.gxdSettle(g2); assert.ok(r.won && r.first); assert.equal(r.rounds, 21); assert.deepEqual(J(K.log.xp), [[K.GXD_XP, "今日異象", "gxd:2026-11-16"]]); assert.equal(K.GXD_XP, 40);
  K.gxdSettle(g2); assert.equal(K.st.gxdOmen.n, 2, "同一盤只算一次");
  const g3 = { id: "a3", journey: "gxd:2026-11-16", human: "r", result: { w: "r" }, moves: mv(25) };
  r = K.gxdSettle(g3); assert.ok(!r.first); assert.equal(K.log.xp.length, 1, "第二次贏不再另給"); assert.deepEqual(J(K.st.gxdOmen), { d: "2026-11-16", n: 3, w: 2, best: 13 });
  assert.match(K.gxdRecTxt(K.st.gxdOmen), /今天下了 3 盤、贏 2 盤；最快 13 回合破解/);
  K.gxdSettle({ id: "b1", journey: "gxd:2026-11-17", human: "r", result: { w: null }, moves: mv(80) }); assert.deepEqual(J(K.st.gxdOmen), { d: "2026-11-17", n: 1, w: 0, best: 0 }, "隔天重算");
  K.gxdSettle({ id: "a4", journey: "gxd:2026-11-16", human: "r", result: { w: "r" }, moves: mv(20) }); assert.equal(K.st.gxdOmen.d, "2026-11-17", "舊題不蓋掉今天");
  K.gxdSettle({ id: "f1", journey: "gxd:fabc", human: "r", result: { w: "r" }, moves: mv(20) }); assert.deepEqual([K.st.gxdFree.n, K.st.gxdFree.w], [1, 1]);
  assert.equal(K.gxdSettle({ id: "x", journey: "gx:taisu", result: { w: "r" } }), null, "別的玩法不碰");
});

test("〔行為〕結果視窗與 3D：今日異象「再玩一次／回觀星臺」、自由擺陣「同一陣再下／重新擺陣／回觀星臺」；3D 是星空背景，點遠方有自己的說明", () => {
  const K = load();
  K.gxdResultModal({ id: "m1", journey: "gxd:2026-11-16", human: "r", level: 8, start: "x", result: { w: "r", why: "將死" }, moves: [] }, true, false, "");
  K.gxdResultModal({ id: "m2", journey: "gxd:fabc", human: "r", level: 8, start: "x", result: { w: "b", why: "將死" }, moves: [] }, false, false, "");
  assert.deepEqual(J(K.log.modal.map(m => m.btns)), [["再玩一次", "回觀星臺"], ["同一陣再下", "重新擺陣", "回觀星臺"]]);
  for (const m of K.log.modal) assert.ok(!/上限/.test(m.h) && /不計積分/.test(m.h));
  const ex = K.gxdParkEx({ journey: "gxd:2026-11-16" }); assert.ok(ex && ex.gate && ex.gxd.k === "omen" && /^data\/gxground\/\w+\.webp$/.test(ex.ground) && ex.bg === "data/park/blackhole_360.webp");
  assert.equal(K.gxdParkEx({ journey: "park" }), null);
});

test("〔原始碼〕存檔鍵：模組寫的三個鍵都在 JOURNEY_KEYS（05b 另一行 push，清單字面不動）", () => {
  const s = SAVE.slice(SAVE.indexOf("const JOURNEY_KEYS="), SAVE.indexOf("const JK="));
  const ctx = vm.createContext({}); vm.runInContext(s + ";this.K=JOURNEY_KEYS", ctx); const K = Array.from(ctx.K);
  const used = [...new Set([...GXD.matchAll(/store\.set\("(gxd\w+)"/g)].map(m => m[1]))].sort();
  assert.deepEqual(used, ["gxdDone", "gxdFree", "gxdOmen"]);
  for (const k of used) assert.ok(K.includes("m_" + k), k + " 要在 JOURNEY_KEYS");
  assert.ok(SAVE.includes('JOURNEY_KEYS.push("m_gxdOmen","m_gxdFree","m_gxdDone");'));
});

test("〔原始碼〕接線：include 在觀星臺之後；觀星臺兩個入口開張、各有短過場；返回鈕回觀星臺；08b 結果視窗；包 journeyGameEnd／jName／gxParkEx／gxParkInfo；沒有行內 // 註解", () => {
  const order = [...HTML.matchAll(/\/\/#include m\/([\w-]+\.js)/g)].map(m => m[1]);
  for (const f of ["07-legend.js", "07gx-galaxy.js", "07gxt-guanxing.js"]) assert.ok(order.includes(f) && order.indexOf(f) < order.indexOf("07gxd-daily.js"), f + " 要在前面（載入時就要包好它們的函式）");   /* 08b 是對局時才叫 gxdResultModal，先後不拘 */
  assert.ok(order.includes("07gxd-daily.js"));
  assert.ok(LEG.includes('String(j||"").startsWith("gxd:")?"#/guanxing":') && LEG.includes('String(j||"").startsWith("gxd:")?"觀星臺":'), "jBack／jPlace");
  assert.ok(GAME.includes('if(String(j||"").startsWith("gxd:")&&typeof gxdResultModal==="function"){gxdResultModal(st,win,draw0,XPR);return}'));
  for (const w of ["journeyGameEnd", "jName", "gxParkEx", "gxParkInfo"]) assert.ok(GXD.includes(`if(typeof ${w}==="function"){const f`), w);
  for (const ln of GXD.split("\n")) assert.ok(!/[;{}]\s*\/\/[^#]/.test(ln.replace(/"[^"]*"|`[^`]*`/g, "")), "行內 // 註解：" + ln.slice(0, 60));
  /* 觀星臺入口：開張、點了先播過場再開；沒有模組時照舊星軌未通 */
  const log = { fx: [], toast: [], open: [] };
  const ctx = vm.createContext({ console, Math, Object, String, JSON, store: { get: (k, d) => d, set() { } }, toast: x => log.toast.push(x), vibrate() { }, esc: String, setTimeout, clearTimeout, addEventListener() { }, removeEventListener() { },
    document: { getElementById: () => null, querySelector: () => null, createElement: () => ({}), head: { append() { } }, body: {} }, sessionStorage: { getItem: () => null, setItem() { }, removeItem() { } }, matchMedia: () => ({ matches: false }) });
  vm.runInContext(GXT + ";this.__X={GXT_SPOTS,GXT_ACT,GXT_OFF}", ctx); const X = ctx.__X;
  for (const id of ["gxtOmen", "gxtFree"]) { const s = Array.from(X.GXT_SPOTS).find(z => z[0] === id); assert.ok(s && !s[6], id + " 開張"); assert.ok(!/[（(]|・|：/.test(s[1]) && s[1].length <= 5, "只放大字") }
  X.GXT_ACT.gxtOmen(); X.GXT_ACT.gxtFree(); assert.deepEqual(log.toast, ["🌌 " + X.GXT_OFF, "🌌 " + X.GXT_OFF], "沒有 07gxd 時不會壞");
  ctx.gxdOmen = () => log.open.push("omen"); ctx.gxdFree = () => log.open.push("free"); X.GXT_ACT.gxtOmen(); X.GXT_ACT.gxtFree();
  assert.deepEqual(Array.from(log.open), ["omen", "free"], "沒有場景可播時直接開");
});
