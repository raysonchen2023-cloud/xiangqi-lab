// 第 11 輪 X2「觸覺回饋」（評審：觸覺回饋設計師）的自動測試，不開瀏覽器：
//   ① 節奏：落子、吃子、將軍、走不了、勝、敗、和、將死各一種，彼此都不一樣；長短合理（越重要越長）
//   ② 用 vm 載入 m/07hp-haptics.js，假的 navigator.vibrate 記下每次的節奏：hapMove（落子／吃子／將軍／將死）、hapTap（點了不能走的地方）、xq-result（勝／敗／和）
//   ③ 開關 store haptic＝false：全部不震，00-util 的 vibrate() 也不震；App 在背景、還沒點過畫面、連點太快不震
//   ④ 不支援（iPhone Safari 沒有 navigator.vibrate）、vibrate 丟錯：不出錯、回 false，說明寫 iPhone 不會震
//   ⑤ 接線：01-board 叫 hapMove／hapTap、00-util vibrate 問 hapHush、m.html 有 include、沒撞名、sound.md 兩邊一樣
// 用法：node --test xiangqi-lab/tools/test-haptics.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const C = require("../site/core.js");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const HP = rd(path.join(M, "07hp-haptics.js")), B = rd(path.join(M, "01-board.js")), U = rd(path.join(M, "00-util.js"));
const J = x => JSON.parse(JSON.stringify(x)), deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);

/* 載入：假的時鐘、計時器、navigator、store、document；opt.vib＝false 表示瀏覽器沒有 vibrate（iPhone Safari） */
function load(opt) {
  opt = opt || {};
  const st = Object.assign({}, opt.store || {}), calls = [], toasts = [], winL = {}, docL = {}, timers = [];
  let now = 1e6;
  const nav = { userActivation: { hasBeenActive: opt.active !== false } };
  if (opt.vib !== false) nav.vibrate = opt.throws ? () => { throw new Error("blocked") } : p => { calls.push(J(p)); return true };
  const ctx = {
    console, JSON, Math, Object, Array,
    Date: { now: () => now },
    setTimeout: (f, ms) => { const t = { f, at: now + (ms || 0), id: timers.length + 1 }; timers.push(t); return t.id },
    clearTimeout: id => { const t = timers.find(x => x.id === id); if (t) t.f = null },
    navigator: nav,
    store: { get: (k, d) => (k in st ? st[k] : d), set: (k, v) => { st[k] = v } },
    document: { hidden: !!opt.hidden, addEventListener: (t, f) => { docL[t] = f } },
    addEventListener: (t, f) => { winL[t] = f },
    toast: m => toasts.push(m),
    sideOf: p => (p ? (p === p.toUpperCase() ? "r" : "b") : null),
    XQCore: C
  };
  ctx.window = ctx; vm.createContext(ctx);
  /* 00-util 的 vibrate 那一行一起放進來，驗證開關連按鈕小震動也停 */
  const vl = U.split("\n").find(l => l.startsWith("const vibrate="));
  vm.runInContext(HP + "\n" + vl + "\nthis.vibrate=vibrate;", ctx, { filename: "07hp-haptics.js" });
  const tick = ms => { now += ms; for (const t of timers.slice()) if (t.f && t.at <= now) { const f = t.f; t.f = null; f() } };
  return { X: ctx, calls, toasts, st, winL, docL, tick, nav, setNow: v => { now = v } };
}
const P = load().X.hapPats();
const pat = k => J(P[k]);

// ---------- 盤面：照真的規則（site/core.js）擺 ----------
const fen = f => C.parseFen(f);
/* 黑將在 d9 被紅俥沿底線將軍，但可以往下走：將軍不是將死 */
const CHECK = fen("3k5/9/9/9/9/9/9/9/9/3R1K3");
/* 兩隻紅俥：底線將軍＋第二線封住，黑將無路可走＝將死 */
const MATE = fen("R2k5/R8/9/9/9/9/9/9/9/5K3");

test("節奏：八種都有、彼此不一樣；走不了最輕、落子最短、對局結束比走棋長", () => {
  const { X } = load(), K = X.hapKinds();
  deq(K, ["move", "capture", "check", "illegal", "win", "lose", "draw", "mate"]);
  const sig = new Set(K.map(k => JSON.stringify(X.hapPat(k))));
  assert.equal(sig.size, K.length, "每一種節奏都不一樣");
  for (const k of K) { const p = X.hapPat(k); assert.ok(Array.isArray(p) && p.length % 2 === 1 && p.every(x => x > 0), k + " 是 [震, 停, 震…]，最後一段是震"); assert.ok(X.hapLen(p) <= 500, k + " 不超過半秒") }
  deq(X.hapPat("move"), [15]); assert.equal(X.hapPat("capture").filter((_, i) => i % 2 === 0).length, 2, "吃子＝雙短");
  assert.equal(X.hapPat("illegal").filter((_, i) => i % 2 === 0).length, 3, "走不了＝三下"); assert.ok(Math.max(...X.hapPat("illegal")) <= 30, "走不了每一下都很輕");
  assert.ok(Math.max(...X.hapPat("check")) > Math.max(...X.hapPat("capture")), "將軍有一下比吃子長");
  for (const k of ["win", "lose", "draw", "mate"]) assert.ok(X.hapLen(X.hapPat(k)) > X.hapLen(X.hapPat("capture")), k + " 比吃子長");
  assert.equal(X.hapPat("nope"), null); const a = X.hapPat("move"); a.push(99); deq(X.hapPat("move"), [15], "拿到的是副本，改了不影響");
  deq(X.hapDex().map(d => d[0]), K, "圖鑑八種照順序");
});

test("走完一步：落子短一下、吃子雙短、將軍兩短一長；看到將死等 0.3 秒震「將死」", () => {
  const L = load(), X = L.X, start = fen(C.START);
  assert.equal(X.hapMove(false, -1, start), true); deq(L.calls.pop(), pat("move"));
  L.tick(100); assert.equal(X.hapMove(true, -1, start), true); deq(L.calls.pop(), pat("capture"));
  const ck = CHECK.indexOf("k"); assert.ok(C.legal(CHECK, "b").length > 0, "前提：黑將還有路");
  L.tick(100); X.hapMove(false, ck, CHECK); deq(L.calls.pop(), pat("check"));
  L.tick(1000); X.hapMove(true, ck, CHECK); deq(L.calls.pop(), pat("check"), "吃子又將軍＝將軍");
  const mk = MATE.indexOf("k"); assert.equal(C.legal(MATE, "b").length, 0, "前提：黑將無路可走");
  L.tick(2000); assert.equal(X.hapMove(false, mk, MATE), true); assert.equal(L.calls.length, 0, "將死先等一下");
  L.tick(299); assert.equal(L.calls.length, 0); L.tick(1); deq(L.calls.pop(), pat("mate"));
});

test("將死後 0.3 秒內收到 xq-result：改震勝／敗，不震「將死」；震過將死 1.5 秒內的結果不再疊", () => {
  const L = load(), X = L.X, mk = MATE.indexOf("k");
  X.hapMove(false, mk, MATE); L.tick(100); L.winL["xq-result"]({ detail: "win" }); deq(L.calls, [pat("win")]);
  L.tick(1000); deq(L.calls, [pat("win")], "等著的將死已取消");
  L.calls.length = 0; L.tick(5000); X.hapMove(false, mk, MATE); L.tick(300); deq(L.calls, [pat("mate")]);
  L.tick(500); L.winL["xq-result"]({ detail: "lose" }); deq(L.calls, [pat("mate")], "剛震過將死，不再疊");
  L.tick(3000); L.winL["xq-result"]({ detail: "lose" }); deq(L.calls.pop(), pat("lose"));
});

test("對局結束 xq-result：win／lose／draw 各自的節奏；不認得的 detail 不震", () => {
  const L = load();
  for (const d of ["win", "lose", "draw"]) { L.tick(5000); L.winL["xq-result"]({ detail: d }); deq(L.calls.pop(), pat(d), d) }
  L.tick(5000); L.winL["xq-result"]({ detail: "x" }); L.winL["xq-result"]({}); L.winL["xq-result"](null); assert.equal(L.calls.length, 0);
});

test("點了不能走的地方：選了子、點到空格或對方不能吃的子＝走不了；可走的點、自己的子（換選）、同一顆、沒選子都不震", () => {
  const L = load(), X = L.X, b = fen(C.START);
  const sel = b.indexOf("C"), o = { sel, targets: C.legal(b, "r").filter(([f]) => f === sel).map(([, t]) => t) };
  const empty = b.findIndex((p, i) => !p && !o.targets.includes(i)), own = b.indexOf("R"), enemyNo = b.findIndex((p, i) => p && p === p.toLowerCase() && !o.targets.includes(i));
  assert.equal(X.hapTap(empty, b, o), true); deq(L.calls.pop(), pat("illegal"));
  L.tick(500); assert.equal(X.hapTap(enemyNo, b, o), true); deq(L.calls.pop(), pat("illegal"), "點對方吃不到的子");
  L.tick(500);
  for (const [sq, oo, why] of [[o.targets[0], o, "可以走的點"], [own, o, "自己另一顆子"], [sel, o, "同一顆（取消）"], [empty, { sel: -1 }, "沒選子"], [-1, o, "點到棋盤外"], [empty, null, "沒有狀態"]])
    assert.equal(X.hapTap(sq, b, oo), false, why);
  assert.equal(L.calls.length, 0);
  // 純函式判斷跟 11c axsTapCue 一樣
  assert.equal(X.hapIsIllegal(empty, b, o, null), true); assert.equal(X.hapIsIllegal(own, b, o, null), true, "沒有 sideOf 時自己的子也算不能走");
});

test("連點太快只震一次：落子 80 毫秒、走不了 400 毫秒、將軍 1 秒；時間倒退當作沒震過", () => {
  const L = load(), X = L.X;
  assert.equal(X.hapFx("move"), true); assert.equal(X.hapFx("move"), false); L.tick(79); assert.equal(X.hapFx("move"), false); L.tick(1); assert.equal(X.hapFx("move"), true);
  assert.equal(X.hapFx("illegal"), true); L.tick(399); assert.equal(X.hapFx("illegal"), false); L.tick(1); assert.equal(X.hapFx("illegal"), true);
  assert.equal(X.hapFx("check"), true); L.tick(999); assert.equal(X.hapFx("check"), false); L.tick(1); assert.equal(X.hapFx("check"), true);
  assert.equal(X.hapFx("capture"), true, "不同種不互相擋");
  const S = { last: { move: 5000 } }; assert.equal(X.hapGate(S, "move", 4000), true, "時間倒退");
  assert.equal(X.hapFx("capture", true), true, "force（試震）不受節流");
});

test("開關 haptic＝false：落子、將軍、走不了、結束、按鈕小震動 vibrate() 全部不震；預設是開", () => {
  const on = load(); assert.equal(on.X.hapOn(), true, "沒設過＝開");
  const L = load({ store: { haptic: false } }), X = L.X, b = fen(C.START), sel = b.indexOf("C");
  assert.equal(X.hapMove(false, -1, b), false); assert.equal(X.hapMove(true, CHECK.indexOf("k"), CHECK), false);
  assert.equal(X.hapTap(b.findIndex(p => !p), b, { sel, targets: [] }), false);
  L.winL["xq-result"]({ detail: "win" }); X.vibrate(5); X.vibrate([25, 30, 25]); assert.equal(X.hapDemo(), false);
  assert.equal(L.calls.length, 0, "完全沒有呼叫 navigator.vibrate");
  L.st.haptic = true; X.vibrate(5); deq(L.calls.pop(), 5, "打開以後按鈕小震動照舊");
});

test("剛震過這裡的節奏 0.45 秒內，舊的 vibrate()（將軍印章、殺棋動畫）不蓋掉；之後照常", () => {
  const L = load(), X = L.X;
  X.hapMove(false, CHECK.indexOf("k"), CHECK); deq(L.calls, [pat("check")]);
  L.tick(200); X.vibrate([25, 30, 25]); deq(L.calls, [pat("check")], "checkFx 0.2 秒後的 vibrate 被擋");
  L.tick(250); X.vibrate(5); deq(L.calls.pop(), 5, "0.45 秒後照常");
});

test("App 在背景、還沒點過畫面（瀏覽器規定）都不震；navigator.vibrate 丟錯也不出錯", () => {
  for (const o of [{ hidden: true }, { active: false }, { throws: true }]) {
    const L = load(o); assert.equal(L.X.hapFx("move"), false, JSON.stringify(o)); assert.doesNotThrow(() => { L.X.hapMove(true, -1, fen(C.START)); L.winL["xq-result"]({ detail: "win" }) });
    assert.equal(L.calls.length, 0, JSON.stringify(o)); assert.doesNotThrow(() => L.X.vibrate(5), "舊的 vibrate 也不出錯");
    if (!o.hidden) assert.equal(L.calls.length, 0, "還沒點過畫面、丟錯：舊的 vibrate 也沒震");
  }
});

test("不支援震動（iPhone Safari 沒有 navigator.vibrate）：每個入口都不出錯、回 false；說明照實寫 iPhone 不會震", () => {
  const L = load({ vib: false }), X = L.X;
  assert.equal(X.hapSupport(), "none"); assert.match(X.hapNote(), /iPhone 不會震/); assert.ok([...X.hapNote()].length <= 40, "說明 40 字內");
  assert.doesNotThrow(() => {
    assert.equal(X.hapFx("move"), false); assert.equal(X.hapMove(true, CHECK.indexOf("k"), CHECK), false); assert.equal(X.hapTry("win"), false);
    X.hapMove(false, MATE.indexOf("k"), MATE); L.tick(1000); X.vibrate(5); L.winL["xq-result"]({ detail: "lose" });
  });
  assert.equal(X.hapDemo(), false); assert.match(L.toasts.pop(), /不支援震動/);
  const Y = load().X; assert.equal(Y.hapSupport(), "vibrate"); assert.match(Y.hapNote(), /落子、吃子、將軍/); assert.ok([...Y.hapNote()].length <= 40);
});

test("設定頁的開關 #hapSw：勾選＝存 haptic true 並試震一次；取消＝存 false、不震", () => {
  const L = load({ store: { haptic: false } });
  L.docL.change({ target: { id: "hapSw", checked: true } }); assert.equal(L.st.haptic, true); L.tick(60); deq(L.calls.pop(), pat("capture"), "試震");
  assert.match(L.toasts.join(""), /震動回饋：開/);
  L.docL.change({ target: { id: "hapSw", checked: false } }); assert.equal(L.st.haptic, false); L.tick(60); assert.equal(L.calls.length, 0);
  L.docL.change({ target: { id: "other", checked: true } }); assert.equal(L.st.haptic, false, "別的勾選框不管");
});

test("〔混合〕接線：01-board 能下的棋盤走完一步叫 hapMove、tapGo 叫 hapTap；00-util vibrate 先問 hapHush；m.html 有 include", () => {
  assert.match(B, /\n    if\(fresh&&o\.anim!==false&&onTap&&!onSwipe&&typeof hapMove==="function"\)hapMove\(!!prevB\[L\.t\],o\.check,board\);/);
  assert.match(B, /\n    if\(typeof hapTap==="function"\)hapTap\(sq,lastBoard,lastO\);[^\n]*\n    pendSq=-1;/, "tapGo 裡、落子前");
  assert.match(B, /^function Board\(onTap,onSwipe\)\{/m, "onTap／onSwipe 是 Board 的參數");
  assert.match(U, /^const vibrate=n=>\{try\{const U=navigator\.userActivation;if\(U&&!U\.hasBeenActive\)return;if\(typeof hapHush==="function"&&hapHush\(\)\)return;/m);
  assert.match(rd(path.join(DB, "m.html")), /^\/\/#include m\/07hp-haptics\.js$/m);
  // 用真的 01-board 那一行算一次：看棋譜（onSwipe）不震、能下的棋盤會震
  const ln = B.split("\n").find(l => l.includes("typeof hapMove===")).replace(/\/\*[\s\S]*?\*\//g, "");
  for (const [onSwipe, want] of [[null, 1], [() => {}, 0]]) {
    let n = 0; const f = new Function("fresh", "o", "onTap", "onSwipe", "hapMove", "prevB", "L", "board", ln);
    f(true, { check: -1 }, () => {}, onSwipe, () => n++, [], { t: 0 }, []); assert.equal(n, want, onSwipe ? "看棋譜" : "能下的棋盤");
  }
});

test("〔原始碼〕沒撞名：07hp 宣告的名字別的模組都沒有；長行沒有 // 註解；文件 sound.md 兩邊一樣、照實寫 iPhone 不會震", () => {
  const names = [...HP.matchAll(/^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  assert.ok(names.length >= 15 && names.every(n => /^(hap|HAP_)/.test(n)), "前綴都是 hap／HAP_：" + names.join(","));
  for (const f of fs.readdirSync(M).filter(f => /\.js$/.test(f) && f !== "07hp-haptics.js")) {
    const s = rd(path.join(M, f)); for (const n of names) assert.ok(!new RegExp("(?:function|const|let|var)\\s+" + n.replace(/\$/g, "\\$") + "\\b").test(s), "撞名：" + n + "（" + f + "）");
  }
  for (const ln of HP.split("\n")) if (ln.length > 120) assert.ok(!/(^|[^:"'\\])\/\/[^#]/.test(ln.replace(/"[^"]*"|'[^']*'|`[^`]*`/g, "")), "長行有 // 註解：" + ln.slice(0, 60));
  const doc = rd(path.join(DB, "art/docs/sound.md"));
  assert.equal(doc, rd(path.join(LAB, "site/data/docs/sound.md")), "兩份文件逐字一樣");
  assert.match(doc, /## 九、觸覺回饋（震動）/); assert.match(doc, /iPhone[^\n]*不會震/); assert.ok(doc.includes("test-haptics.js"));
  const X = load().X; for (const [k, nm] of X.hapDex()) assert.ok(doc.includes("| " + nm + " |") && doc.includes(JSON.stringify(X.hapPat(k)).replace(/,/g, ", ")), "文件表格寫到 " + nm + " 的節奏");
});
