// W48-S2 屏風馬門兩套題庫資料（開發者 11/22 選單：屏風馬門要有中炮門沒有的玩法——課堂挑錯著、算盤算帳）：
//   xiangqi-db/art/zmhall/screen-errata.json（20 題）、screen-abacus.json（30 題）的格式與棋規檢查。
//   這兩個檔是素材原始資料（功能 PR 不能改網站 data/），發布時帶到網站 data/zmhall/；網站上已有那一份時，要跟原始資料逐位元一樣。
//   每一手都用 core.js 重走一遍；不跑引擎（引擎分數由 xiangqi-lab/tools/screen-quiz-build.js 產生，--check 可重跑比對）。
// 用法：node --test xiangqi-lab/tools/test-zm-screen-data-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "../..");
const SITE = path.join(ROOT, "xiangqi-lab", "site");
const C = require(path.join(SITE, "core.js"));
const ART = path.join(ROOT, "xiangqi-db", "art", "zmhall");
/* 公開倉庫（有 .github）一定要有這兩個檔；開發者電腦還沒放進素材資料夾時才略過 */
const PUBLIC = fs.existsSync(path.join(SITE, ".github"));
/* 沒有檔案時回 null，由 need() 決定：公開倉庫直接失敗，開發者電腦才 t.skip */
const rdj = (p) => { const f = path.join(ART, p); return fs.existsSync(f) ? { raw: fs.readFileSync(f, "utf8"), j: JSON.parse(fs.readFileSync(f, "utf8")) } : null };
const E = rdj("screen-errata.json"), A = rdj("screen-abacus.json");
const S = JSON.parse(fs.readFileSync(path.join(SITE, "data", "opening-school", "screen.json"), "utf8"));
const need = (t, x, name) => { if (x) return true; assert.ok(!PUBLIC, "公開倉庫少了 " + name); t.skip("這台的網站資料夾沒有 " + name); return false };

const isMove = (b, s, u) => { const f = C.parseSq(u.slice(0, 2)), t = C.parseSq(u.slice(2, 4)); return !!b[f] && C.sideOf(b[f]) === s && C.legal(b, s).some(([x, y]) => x === f && y === t) };
const mvOf = (u) => [C.parseSq(u.slice(0, 2)), C.parseSq(u.slice(2, 4))];
const UCI = /^[a-i]\d[a-i]\d$/;
const SCORE_WORDS = /厘兵|分數|引擎|cp|\d+\s*分/;

test("兩個檔的外框：v、題數、id 依序不重複、檔案小於 100 KB、沒有 CRLF", (t) => {
  if (!need(t, E, "screen-errata.json") || !need(t, A, "screen-abacus.json")) return;
  for (const [x, n, p] of [[E, 20, "e"], [A, 30, "a"]]) {
    assert.equal(x.j.v, "1122");
    assert.ok(Array.isArray(x.j.items));
    assert.equal(x.j.items.length, n);
    assert.deepEqual(x.j.items.map((i) => i.id), Array.from({ length: n }, (_, k) => p + String(k + 1).padStart(2, "0")));
    assert.ok(Buffer.byteLength(x.raw) < 100 * 1024);
    assert.ok(!x.raw.includes("\r"));
  }
});

test("網站 data/zmhall/ 已經有這兩個檔時，要跟素材原始資料一模一樣", (t) => {
  if (!need(t, E, "screen-errata.json") || !need(t, A, "screen-abacus.json")) return;
  let n = 0;
  for (const [x, f] of [[E, "screen-errata.json"], [A, "screen-abacus.json"]]) {
    const w = path.join(SITE, "data", "zmhall", f);
    if (fs.existsSync(w)) { n++; assert.equal(fs.readFileSync(w, "utf8"), x.raw, "data/zmhall/" + f + " 跟 xiangqi-db/art/zmhall/ 的不一樣") }
  }
  if (!n) return t.skip("網站還沒有 data/zmhall/ 題庫（還沒發布）；原始資料由上一項驗");   /* W69 第 10 項（11/22）：原本只印 diagnostic 就算通過，一次斷言都沒做 */
});

test("課堂挑錯著：欄位齊全、課程存在、整串 6～14 手每手合法", (t) => {
  if (!need(t, E, "screen-errata.json")) return;
  const lessons = new Set(S.lessons.map((L) => L.id));
  for (const q of E.j.items) {
    assert.deepEqual(Object.keys(q).sort(), ["best", "drop", "id", "lesson", "mv", "ok", "why", "wrong"], q.id);
    assert.ok(lessons.has(q.lesson), q.id + " 課程 " + q.lesson);
    assert.ok(q.mv.length >= 6 && q.mv.length <= 14, q.id + " 手數 " + q.mv.length);
    let b = C.parseFen(C.START), s = "r";
    q.mv.forEach((u, i) => {
      assert.match(u, UCI, q.id + " 第 " + i + " 手格式");
      assert.ok(isMove(b, s, u), q.id + " 第 " + i + " 手 " + u + " 不合法");
      b = C.make(b, ...mvOf(u)); s = C.opp(s);
    });
  }
});

test("課堂挑錯著：壞著是黑方第 3 手以後、後面接 2～4 手、ok 含 best 且都合法、壞著不在 ok 裡、drop ≥150", (t) => {
  if (!need(t, E, "screen-errata.json")) return;
  for (const q of E.j.items) {
    assert.ok(Number.isInteger(q.wrong) && q.wrong >= 3 && q.wrong < q.mv.length, q.id + " wrong " + q.wrong);
    const tail = q.mv.length - q.wrong - 1;
    assert.ok(tail >= 2 && tail <= 4, q.id + " 壞著後面接 " + tail + " 手");
    let b = C.parseFen(C.START), s = "r";
    for (const u of q.mv.slice(0, q.wrong)) { b = C.make(b, ...mvOf(u)); s = C.opp(s) }
    assert.equal(s, "b", q.id + " 壞著要是黑方（屏風馬方）走的");
    assert.equal(C.sideOf(b[mvOf(q.mv[q.wrong])[0]]), "b", q.id);
    assert.ok(Array.isArray(q.ok) && q.ok.length >= 1 && q.ok.includes(q.best), q.id + " ok 要含 best");
    assert.equal(new Set(q.ok).size, q.ok.length, q.id + " ok 重複");
    for (const u of q.ok) assert.ok(UCI.test(u) && isMove(b, "b", u), q.id + " ok 的 " + u + " 在壞著前的局面不合法");
    assert.ok(!q.ok.includes(q.mv[q.wrong]), q.id + " 壞著不能算對");
    assert.ok(Number.isInteger(q.drop) && q.drop >= 150, q.id + " drop " + q.drop);
  }
});

test("課堂挑錯著：why 是一句繁中說明、不寫引擎分數；同一課同一個壞著不出兩次", (t) => {
  if (!need(t, E, "screen-errata.json")) return;
  const seen = new Set();
  for (const q of E.j.items) {
    assert.ok(typeof q.why === "string" && q.why.length >= 6 && q.why.length <= 60, q.id + " why 長度");
    assert.ok(/[一-鿿]/.test(q.why) && !SCORE_WORDS.test(q.why), q.id + " why：" + q.why);
    const k = q.mv.slice(0, q.wrong + 1).join(" ");
    assert.ok(!seen.has(k), q.id + " 跟前面的題目重複");
    seen.add(k);
  }
});

const MV = { R: 9, N: 4, C: 4.5, A: 2, B: 2, P: 1 };
function material(b) {
  const m = { r: 0, b: 0 };
  b.forEach((p, i) => { if (!p) return; const s = C.sideOf(p), T = p.toUpperCase(); if (T === "K") return; m[s] += T === "P" && (s === "r" ? (i / 9 | 0) <= 4 : (i / 9 | 0) >= 5) ? 2 : MV[T] });
  return m;
}

test("算盤算帳：FEN 完整、局面合法（雙方有將帥、不在輪走方吃將的狀態）、src 每盤棋只一題", (t) => {
  if (!need(t, A, "screen-abacus.json")) return;
  const src = new Set();
  for (const q of A.j.items) {
    assert.deepEqual(Object.keys(q).sort(), ["ans", "cp", "fen", "id", "mat", "src", "why"], q.id);
    const f = q.fen.split(" ");
    assert.equal(f.length, 6, q.id + " FEN 要六段");
    assert.ok(f[1] === "w" || f[1] === "b", q.id + " 輪走方");
    const b = C.parseFen(f[0]), s = f[1] === "w" ? "r" : "b";
    assert.equal(C.fen(b, s), f[0] + " " + f[1], q.id + " FEN 讀寫一致");
    assert.ok(C.kingSq(b, "r") >= 0 && C.kingSq(b, "b") >= 0, q.id + " 將帥");
    assert.ok(!C.inCheck(b, C.opp(s)), q.id + " 沒輪到的一方不能正被將軍");
    assert.ok(C.legal(b, s).length > 0, q.id + " 輪走方要有棋可走");
    assert.match(q.src, /^gm\d+@(2\d|3\d|40)$/, q.id + " src");
    const [g, ply] = q.src.split("@");
    assert.equal(s, +ply % 2 ? "b" : "r", q.id + " 輪走方要跟手數一致（走完偶數手輪紅）");
    assert.ok(!src.has(g), q.id + " 同一盤棋出兩題");
    src.add(g);
  }
});

test("算盤算帳：答案跟分數門檻一致、三種各約 10 題、子力照規則算、why 照規則寫", (t) => {
  if (!need(t, A, "screen-abacus.json")) return;
  const n = { r: 0, b: 0, "=": 0 };
  for (const q of A.j.items) {
    assert.ok(Number.isInteger(q.cp), q.id);
    const want = q.cp > 150 ? "r" : q.cp < -150 ? "b" : Math.abs(q.cp) <= 60 ? "=" : null;
    assert.ok(want, q.id + " 分數 " + q.cp + " 落在不出題的中間帶");
    assert.equal(q.ans, want, q.id);
    n[q.ans]++;
    assert.deepEqual(q.mat, material(C.parseFen(q.fen.split(" ")[0])), q.id + " 子力");
    const dm = q.mat.r - q.mat.b;
    const why = q.ans === "=" ? "even" : Math.abs(dm) >= 3 && (q.ans === "r" ? dm > 0 : dm < 0) ? "material" : "position";
    assert.equal(q.why, why, q.id + " why");
  }
  for (const k of ["r", "b", "="]) assert.ok(n[k] >= 8 && n[k] <= 12, "答案 " + k + " 有 " + n[k] + " 題");
});

test("〔原始碼〕Pikafish 盤整 P2（11/24）：建置腳本有「最佳跟第二好差超過 100（只有一步能維持）不出」的條件（原 a20；重建後的題庫跟網站 data/zmhall 一起在發布 PR 帶上）", () => {
  const B = fs.readFileSync(path.join(__dirname, "screen-quiz-build.js"), "utf8");
  assert.match(B, /r2\[0\]\.cp - r2\[1\]\.cp > 100\) continue/);
});
