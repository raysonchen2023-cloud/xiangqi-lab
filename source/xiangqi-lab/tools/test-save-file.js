// 評審 P22.3（資料存儲與無縫轉移，11/12）：「存檔與讀檔」匯出檔案的完整性自動測試。
//   不開瀏覽器：從 xiangqi-db/m/05b-save.js 切出「匯出、讀入檔案」那一段（SAVE_FILE_V、saveFileSha、saveFilePack、saveFileRead、saveSanitize）放進 vm，
//   crypto.subtle 用 node 內建的 WebCrypto（也測沒有 crypto.subtle 的瀏覽器）。
//   往返一致；檔案裡 slot 那一段改任何一個字元都不會被當成驗證過的照收；截斷的拒收；比這版新的拒收；v1 舊檔照收但標未驗證；不能算雜湊的瀏覽器照收但標未驗證。
// 用法：node --test xiangqi-lab/tools/test-save-file.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm"), { webcrypto } = require("node:crypto");
const SAVE = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/05b-save.js"), "utf8").replace(/\r\n/g, "\n");
function cut(src, a, b, name) { const i = src.indexOf(a), j = src.indexOf(b, i + 1); assert.ok(i >= 0 && j > i, "找不到 " + name); return src.slice(i, j) }
const JK_SRC = cut(SAVE, "const JOURNEY_KEYS=", "\nconst JK=new Set", "05b-save.js 的 JOURNEY_KEYS");
const FILE_SRC = cut(SAVE, "/* ---------- 匯出、讀入檔案", "\nfunction slotImportPick(", "05b-save.js 的匯出、讀入檔案");
const J = x => JSON.parse(JSON.stringify(x));

/* 一支手機：noCrypto＝這支瀏覽器沒有 crypto.subtle */
function load(o) {
  const ctx = { TextEncoder, JSON, Object, Array, String, Number, Math, Date, Set, Promise, Uint8Array, crypto: o && o.noCrypto ? undefined : webcrypto };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(JK_SRC + "\nconst JK=new Set(JOURNEY_KEYS);\n" + FILE_SRC + "\n;this.F={SAVE_FILE_V,saveFileSha,saveFilePack,saveFileRead,saveSanitize,JK:[...JK]};", ctx);
  const F = ctx.F;
  return { V: F.SAVE_FILE_V, keys: F.JK, pack: (S, at) => F.saveFilePack(S, at), read: async t => J(await F.saveFileRead(t)), sanitize: x => J(F.saveSanitize(x)) };
}
const P = load(), NC = load({ noCrypto: true });
/* 一格存檔：幾個存檔鍵（值都是字串，含中文、引號、反斜線、換行） */
const K = P.keys;
const SLOT = { v: 1, at: 1762900000000, meta: { c: "x_yun", nm: "小明", pc: "兵", lv: 7, lt: "入門2", rk: "業1", st: 3, sec: 5400, born: 1762000000000, at: 1762900000000 },
  data: { [K[0]]: "1", [K[1]]: JSON.stringify({ a: [1, 2, 3], s: "雲河「七星」\\ \"引號\"\n換行" }), [K[2]]: "x_yun", [K[K.length - 1]]: JSON.stringify({ moves: [[1, 2], [3, 4]], result: null }) } };

test("〔存檔檔案〕往返一致：v2 帶 64 位 16 進位的 SHA-256 檢查碼，讀回來跟原本一字不差、標「已驗證」", async () => {
  assert.equal(P.V, 2);
  const text = await P.pack(SLOT, 1762900001234), o = JSON.parse(text);
  assert.equal(o.kind, "xqsave"); assert.equal(o.v, 2); assert.match(o.sha, /^[0-9a-f]{64}$/); assert.deepEqual(o.slot, SLOT);
  const want = require("node:crypto").createHash("sha256").update(JSON.stringify(SLOT)).digest("hex");
  assert.equal(o.sha, want, "檢查碼就是 slot 那段 JSON 的 SHA-256（別的工具也算得出來）");
  const R = await P.read(text);
  assert.equal(R.ok, true); assert.equal(R.verified, true); assert.equal(R.note, "");
  assert.deepEqual(R.S.data, SLOT.data, "進度一字不差"); assert.deepEqual(R.S.meta, SLOT.meta);
  assert.deepEqual(R.S, P.sanitize(o), "讀進來的跟原本那套白名單整理的一樣");
});

test("〔存檔檔案〕被改過：slot 那一段任何一個位置改一個字元，都不會被當成驗證過的照收；改內容（格式還對）的明說「被改過」", async () => {
  const text = await P.pack(SLOT), a = text.indexOf('"slot":') + 7;
  let tamper = 0, broken = 0;
  for (let i = a; i < text.length - 1; i++) {
    const c = text[i], r = c === "1" ? "2" : /[0-9]/.test(c) ? "1" : c === "a" ? "b" : "a";
    const R = await P.read(text.slice(0, i) + r + text.slice(i + 1));
    assert.equal(R.ok, false, `第 ${i} 個字「${c}」改成「${r}」要拒收`);
    if (/被改過/.test(R.why)) tamper++; else broken++;
  }
  assert.ok(tamper > 100, "大部分是格式還對、內容被改：檢查碼擋下（" + tamper + "）");
  const one = text.replace("小明", "小華"), R = await P.read(one);
  assert.equal(R.ok, false); assert.match(R.why, /被改過或已經損壞（檢查碼對不上）/); assert.match(R.why, /不讀入/);
  const lv = JSON.parse(text); lv.slot.meta.lv = 99; const R2 = await P.read(JSON.stringify(lv));
  assert.equal(R2.ok, false, "把等級改成 99 也擋下");
  assert.ok(tamper + broken === text.length - 1 - a, "每個位置都試過");
});

test("〔存檔檔案〕截斷（沒下載完）：拒收，訊息說檔案不完整", async () => {
  const text = await P.pack(SLOT);
  for (const n of [text.length - 1, text.length - 2, Math.floor(text.length / 2), 40, 1, 0]) {
    const R = await P.read(text.slice(0, n));
    assert.equal(R.ok, false, "截到 " + n + " 個字要拒收"); assert.match(R.why, /不完整或已經損壞/);
  }
});

test("〔存檔檔案〕v1 舊檔（沒有檢查碼）照收，但標「未驗證」；不是存檔、比這版新的拒收", async () => {
  const v1 = JSON.stringify({ app: "象棋千秋", kind: "xqsave", v: 1, at: 1762900000000, slot: SLOT });
  const R = await P.read(v1);
  assert.equal(R.ok, true); assert.equal(R.verified, false); assert.match(R.note, /舊版存檔/); assert.deepEqual(R.S.data, SLOT.data);
  const noV = JSON.parse(v1); delete noV.v; assert.equal((await P.read(JSON.stringify(noV))).ok, true, "更早、沒寫 v 的也當 v1 收");
  const v3 = JSON.parse(await P.pack(SLOT)); v3.v = 3; const R3 = await P.read(JSON.stringify(v3));
  assert.equal(R3.ok, false); assert.match(R3.why, /請先更新 App/);
  const other = await P.read(JSON.stringify({ kind: "pgn", v: 2 })); assert.equal(other.ok, false); assert.match(other.why, /不是象棋千秋的存檔/);
  const empty = await P.read(JSON.stringify({ app: "象棋千秋", kind: "xqsave", v: 1, slot: { data: { not_a_key: "1" } } }));
  assert.equal(empty.ok, false, "白名單外的鍵照舊不收");
  const noSha = JSON.parse(await P.pack(SLOT)); noSha.sha = null; const R4 = await P.read(JSON.stringify(noSha));
  assert.equal(R4.ok, true); assert.equal(R4.verified, false); assert.match(R4.note, /沒有檢查碼/);
});

test("〔存檔檔案〕不能算 SHA-256 的瀏覽器：匯出時 sha 寫 null、讀入照收但標未驗證；它匯出的檔案到能驗的手機也照收（未驗證）", async () => {
  const text = await NC.pack(SLOT), o = JSON.parse(text);
  assert.equal(o.v, 2); assert.equal(o.sha, null);
  const R = await NC.read(text); assert.equal(R.ok, true); assert.equal(R.verified, false);
  const R2 = await NC.read(await P.pack(SLOT)); assert.equal(R2.ok, true); assert.equal(R2.verified, false); assert.match(R2.note, /不能核對檢查碼/);
  const R3 = await P.read(text); assert.equal(R3.ok, true); assert.equal(R3.verified, false);
});

test("〔原始碼〕〔存檔檔案〕匯出用 saveFilePack、讀入用 saveFileRead，讀入失敗用視窗說原因", () => {
  const ex = cut(SAVE, "async function slotExport(", "\nfunction saveSanitize(", "slotExport"), im = cut(SAVE, "function slotImportPick(", "\n/* ---------- 存檔與讀檔", "slotImportPick");
  assert.match(ex, /new File\(\[await saveFilePack\(S\)\]/); assert.doesNotMatch(ex, /v:1,at:Date\.now\(\),slot:S/);
  assert.match(im, /saveFileRead\(await f\.text\(\)\)/); assert.match(im, /if\(!R\.ok\)return modal\(/); assert.doesNotMatch(im, /JSON\.parse\(await f\.text\(\)\)/);
});
