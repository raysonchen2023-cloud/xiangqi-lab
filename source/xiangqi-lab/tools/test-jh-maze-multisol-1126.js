/* W87-2（11/26 開發者選單「放寬到不是唯一解，只要走的那步仍是最快殺就算對」）：地底迷宮殘局接受所有最快殺法。
   m/07z9m-maze.js：題目有 alt（{紅方可以走的著法: 0 將死 或 [黑方應著, 下一層]}）就照 alt 判斷（jhMzTry），黑方應著照分支（jhMzReply），提示照現在這一層（jhMzNow）；沒有 alt 的舊題照舊只認主變。
   xiangqi-lab/tools/maze-puzzles.js --multi 預先收錄每一步所有最快殺的著法（不加 --multi 照舊只收唯一解）。
   這支：① vm 跑真的 jhMzTry：第二種殺法也算對、不是最快殺的不算、走錯分支不算、舊題相容；
         ② core.js 獨立重算 alt 樹：每一層收齊所有最快殺、只收最快殺、黑方照撐最久的方式應、終點將死；
         ③ 改壞驗證：同一組檢查拿去跑改壞的程式和改壞的 alt 樹，一定要抓得到。
   題目用工具 --multi 對古譜《夢入神機》mr018c5（兩步殺，兩種殺法）產生的結果。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", "..");
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const rd = (f) => fs.readFileSync(path.join(ROOT, "xiangqi-db", "m", f), "utf8");
const MZ = rd("07z9m-maze.js"), TOOL = fs.readFileSync(path.join(__dirname, "maze-puzzles.js"), "utf8");
const FX = { id: "mr018c5", src: { book: "夢入神機", title: "退一步勝" }, zh: ["題", "兩步殺"], en: ["P", "Mate in 2"], fen: "2ba1a3/3k5/3NP4/9/9/2p6/4C4/5K3/4p2p1/9",
  line: ["e3e5", "e1e0", "e5d5"], alt: { e3e5: ["e1e0", { e5d5: 0 }], e3e6: ["c4b4", { e6d6: 0 }] } };

function load(src) {
  const mem = {}, c = { store: { get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d), set: (k, v) => { mem[k] = JSON.stringify(v) } }, jhL: (zh) => zh, esc: (s) => String(s), addXP: () => {}, xqFlag: () => true, Math, JSON, Set, Map, Number, String, Array, Object, Float32Array };
  Object.defineProperty(c, "location", { get: () => ({ hash: "#/jianghu/maze" }) });
  vm.createContext(c); vm.runInContext(src || MZ, c); return c;
}
const K = (c, n) => vm.runInContext(n, c);
function state(c, P) { const S = c.jhMzNew("central"); S.lv = Object.assign({}, S.lv, { pool: { door: [P], trap: [P] } }); S.cur = { door: 0, trap: 0 }; return S }

function tryProblems(c) {
  const bad = [], now = (P, S) => K(c, "jhMzNow")(P, S.pz), reply = (P, S) => K(c, "jhMzReply")(P, S.pz);
  let S = state(c, FX);
  if (c.jhMzTry(S, "door", "e3e5") !== "next" || reply(FX, S) !== "e1e0") bad.push("主變第一手：算對、黑方照主變應 e1e0");
  if (c.jhMzTry(S, "door", "e5d5") !== "ok") bad.push("主變第二手將死");
  S = state(c, FX);
  if (c.jhMzTry(S, "door", "e3e6") !== "next") bad.push("第二種殺法也算對（第一手 e3e6）");
  else { if (reply(FX, S) !== "c4b4") bad.push("走第二種殺法：黑方照那一條的應著 c4b4（實際 " + reply(FX, S) + "）");
    if (now(FX, S) !== "e6d6") bad.push("走第二種殺法：提示照那一條（e6d6）");
    if (c.jhMzTry(S, "door", "e6d6") !== "ok") bad.push("第二種殺法走完將死") }
  S = state(c, FX); c.jhMzTry(S, "door", "e3e6"); if (c.jhMzTry(S, "door", "e5d5") === "ok") bad.push("走錯分支不算：走了 e3e6 再走主變的 e5d5 不算將死");
  S = state(c, FX); if (c.jhMzTry(S, "door", "e3e4") !== "bad") bad.push("不是最快殺的不算（e3e4）");
  if (now(FX, state(c, FX)) !== "e3e5") bad.push("一開始的提示照主變");
  const OLD = Object.assign({}, FX); delete OLD.alt;
  S = state(c, OLD); if (c.jhMzTry(S, "door", "e3e6") !== "bad") bad.push("沒有 alt 的舊題照舊只認主變");
  S = state(c, OLD); if (c.jhMzTry(S, "door", "e3e5") !== "next" || reply(OLD, S) !== "e1e0" || c.jhMzTry(S, "door", "e5d5") !== "ok") bad.push("舊題照主變走得通");
  return bad;
}

/* core.js 獨立重算 alt 樹 */
const mv = (b, u) => C.make(b, C.parseSq(u.slice(0, 2)), C.parseSq(u.slice(2, 4)));
const ucis = (b, s) => C.legal(b, s).map(([f, t]) => "abcdefghi"[f % 9] + (9 - ((f / 9) | 0)) + "abcdefghi"[t % 9] + (9 - ((t / 9) | 0)));
const mated = (b, s) => C.inCheck(b, s) && C.legal(b, s).length === 0;
function mateIn(b, k) { return C.legal(b, "r").some(([f, t]) => { const b1 = C.make(b, f, t), R = C.legal(b1, "b"); if (!R.length) return C.inCheck(b1, "b"); if (k === 1) return false; return R.every(([f2, t2]) => mateIn(C.make(b1, f2, t2), k - 1)) }) }
const winsIn = (b, u, k) => { const b1 = mv(b, u); if (mated(b1, "b")) return true; if (k <= 1) return false; return C.legal(b1, "b").every(([f, t]) => mateIn(C.make(b1, f, t), k - 1)) };
function altProblems(P) {
  const bad = [], n = (P.line.length + 1) / 2;
  if (!P.alt) return ["沒有 alt"];
  (function walk(node, b, left, tag) {
    const legal = ucis(b, "r"), fast = legal.filter((u) => winsIn(b, u, left));
    for (const u of Object.keys(node)) { if (!legal.includes(u)) { bad.push(tag + u + " 不合法"); continue } if (!fast.includes(u)) bad.push(tag + u + " 不是 " + left + " 步內殺（不是最快殺）"); else if (left > 1 && winsIn(b, u, left - 1)) bad.push(tag + u + " 有更短的殺法") }
    for (const u of fast) if (!(u in node)) bad.push(tag + "少收了最快殺 " + u);
    for (const [u, v] of Object.entries(node)) { if (!legal.includes(u)) continue; const b1 = mv(b, u);
      if (left === 1) { if (v !== 0) bad.push(tag + u + " 是最後一步，值要是 0"); if (!mated(b1, "b")) bad.push(tag + u + " 走完要將死"); continue }
      if (!Array.isArray(v) || v.length !== 2) { bad.push(tag + u + " 要有黑方應著和下一層"); continue }
      const [r, sub] = v; if (!ucis(b1, "b").includes(r)) { bad.push(tag + u + " 黑方應著 " + r + " 不合法"); continue }
      const b2 = mv(b1, r); if (!mateIn(b2, left - 1)) bad.push(tag + u + "/" + r + " 之後 " + (left - 1) + " 步內殺不了"); if (left > 2 && mateIn(b2, left - 2)) bad.push(tag + u + "/" + r + " 黑方沒有撐最久");
      walk(sub, b2, left - 1, tag + u + "/" + r + "：") } })(P.alt, C.parseFen(P.fen), n, "");
  let node = P.alt; for (let i = 0; i < P.line.length; i += 2) { const v = node && node[P.line[i]]; if (v === undefined) { bad.push("主變第 " + (i + 1) + " 手不在 alt 裡"); break } if (v === 0) break; if (v[0] !== P.line[i + 1]) bad.push("主變的黑方應著不一樣"); node = v[1] }
  return bad;
}

test("迷宮殘局接受所有最快殺法：主變、第二種殺法都算對；走第二種殺法時黑方照那一條應、提示照那一條；走錯分支、不是最快殺都不算；沒有 alt 的舊題照舊只認主變", () => {
  assert.deepEqual(tryProblems(load()), []);
});

test("alt 樹用 core.js 獨立重算：每一層收齊所有最快殺、只收最快殺、沒有更短殺法、黑方應著合法而且撐最久、終點將死、主變在樹裡", () => {
  assert.deepEqual(altProblems(FX), []);
  assert.deepEqual(Object.keys(FX.alt).sort(), ["e3e5", "e3e6"], "這一題第一手有兩種最快殺法");
});

test("改壞驗證（程式）：不看 alt、走了分支不往下、黑方應著照主變、提示照主變，檢查一定抓得到", () => {
  const P1 = MZ.replace("if(P.alt&&typeof P.alt===\"object\"){", "if(false){");
  const P2 = MZ.replace("S.pz={id,i:i+2,node:v[1],reply:v[0]}", "S.pz={id,i:i+2,node:node,reply:v[0]}");
  const P3 = MZ.replace("const jhMzReply=(P,pz)=>pz&&pz.reply||jhMzLine(P)[pz?pz.i-1:0];", "const jhMzReply=(P,pz)=>jhMzLine(P)[pz?pz.i-1:0];");
  const P4 = MZ.replace("return k.includes(L[pz.i])?L[pz.i]:k[0]", "return L[pz.i]");
  for (const P of [P1, P2, P3, P4]) assert.notEqual(P, MZ, "改壞的字串要真的找得到");
  assert.ok(tryProblems(load(P1)).some((s) => s.includes("第二種殺法")), "不看 alt");
  assert.ok(tryProblems(load(P2)).some((s) => s.includes("將死") || s.includes("分支")), "走了分支不往下");
  assert.ok(tryProblems(load(P3)).some((s) => s.includes("c4b4")), "黑方應著照主變");
  assert.ok(tryProblems(load(P4)).some((s) => s.includes("提示")), "提示照主變");
});

test("改壞驗證（題庫）：少收一種最快殺、多收一步不是最快殺、黑方應著不合法、主變不在樹裡、最後一步不是將死，檢查一定抓得到", () => {
  const clone = () => JSON.parse(JSON.stringify(FX));
  let P = clone(); delete P.alt.e3e6; assert.ok(altProblems(P).some((s) => s.includes("少收了最快殺 e3e6")), "少收一種");
  P = clone(); P.alt.e3e4 = ["e1e0", { e5d5: 0 }]; assert.ok(altProblems(P).some((s) => s.includes("e3e4") && s.includes("不是")), "多收不是最快殺的");
  P = clone(); P.alt.e3e6[0] = "a1a2"; assert.ok(altProblems(P).some((s) => s.includes("不合法")), "黑方應著不合法");
  P = clone(); P.line = ["e3e4", "e1e0", "e5d5"]; assert.ok(altProblems(P).some((s) => s.includes("主變")), "主變不在樹裡");
  P = clone(); P.alt.e3e5[1] = { e5d5: ["e0e1", {}] }; assert.ok(altProblems(P).some((s) => s.includes("值要是 0")), "最後一步不是將死");
});

/* 所有門派題庫（m/07z9m-*.js 裡每一段 JH_MZ_POOL） */
function pools() { const D = path.join(ROOT, "xiangqi-db", "m"), o = [];
  for (const f of fs.readdirSync(D).filter((f) => /^07z9m-.*\.js$/.test(f))) { const s = fs.readFileSync(path.join(D, f), "utf8");
    for (const m of s.matchAll(/\/\* ==JH_MZ_POOL:(\w+)== \*\//g)) { const nm = m[1], a = m.index, b = s.indexOf(`/* ==/JH_MZ_POOL:${nm}== */`); const ctx = {}; vm.createContext(ctx); vm.runInContext(s.slice(a, b) + `;this.v=${nm};`, ctx); o.push({ f, nm, items: [...ctx.v.door, ...ctx.v.trap] }) } }
  return o }
/* 第二層被抓題的題號重複（開發者 11/26 允許不同派重用；同樣收尾的派錯開，免得三派選到同一組題） */
function dupProblems(P) { const seen = {}, bad = [];
  for (const p of P.filter((p) => /2_TRAP$/.test(p.nm))) for (const x of p.items) { if (seen[x.id]) bad.push(x.id + "：" + seen[x.id] + " 和 " + p.nm); else seen[x.id] = p.nm }
  return bad }

test("題庫裡每一棵 alt 樹（--multi 出的多解，遊戲照它判斷對錯）都用 core.js 獨立重算：收齊所有最快殺、只收最快殺、黑方應著合法而且撐最久、終點將死、主變在樹裡", () => {
  const all = pools().flatMap((p) => p.items.filter((x) => x.alt).map((x) => [p.nm, x]));
  assert.ok(all.length >= 1, "題庫裡至少有一題多解（不然這一項沒驗到東西）");
  for (const [nm, x] of all) assert.deepEqual(altProblems(x), [], nm + "：" + x.id);
});

test("七派第二層的被抓題彼此不重複（同收尾的派錯開）；改壞驗證：塞一題重複一定抓得到", () => {
  const P = pools(); assert.ok(P.filter((p) => /2_TRAP$/.test(p.nm)).length >= 7, "七派第二層的被抓題庫都讀到");
  assert.deepEqual(dupProblems(P), []);
  const Q = JSON.parse(JSON.stringify(P)), a = Q.find((p) => p.nm === "JH_MZ_POOL_CENTRAL2_TRAP"), b = Q.find((p) => p.nm === "JH_MZ_POOL_PALACE2_TRAP"); b.items[0].id = a.items[0].id;
  assert.ok(dupProblems(Q).length === 1, "塞一題重複要被抓到");
});

test("〔原始碼〕maze-puzzles.js：有 --multi；不加 --multi 照舊用唯一解的 verify（既有題庫 --check 逐字相同）；只有真的有第二種殺法才寫 alt；07z9m-maze.js LF、沒有控制字元", () => {
  assert.match(TOOL, /const MULTI = process\.argv\.includes\("--multi"\);/);
  assert.match(TOOL, /const r = MULTI \? await verifyMulti\(E, x\) : await verify\(E, x\);/);
  assert.match(TOOL, /if \(win\.length !== 1 \|\| win\[0\] !== x\.line\[k\]\) res = \{ ok: false/, "唯一解的檢查還在");
  assert.match(TOOL, /res = fork \? \{ ok: true, why: "", alt \} : \{ ok: true, why: "" \}/, "沒分岔就不寫 alt");
  assert.match(TOOL, /x\.alt \? \{ alt: x\.alt \} : \{\}/);
  assert.ok(!MZ.includes("\r")); assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(MZ));
});
