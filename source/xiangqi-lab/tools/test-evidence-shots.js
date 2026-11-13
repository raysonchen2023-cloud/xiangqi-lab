// 第 15 輪 F1／F2／X2「可重現畫面證據包＋英文防爆版檢查」（tools/qa/evidence-shots.js）的自動測試，不開瀏覽器：
//   行為：require 腳本匯出的純函式，真的跑清單、檔名、PNG 尺寸、manifest 檢查、防爆版判斷 judgeOverflow、統計表 fitTable。
//   原始碼：腳本只開一個瀏覽器、一定在 finally 關掉、每個分頁都設測試房 xq_test。
// 用法：node --test xiangqi-lab/tools/test-evidence-shots.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const E = require("./qa/evidence-shots.js");
const SRC = fs.readFileSync(path.join(__dirname, "qa", "evidence-shots.js"), "utf8").replace(/\r\n/g, "\n");

/* ---------- 清單 ---------- */
test("清單齊全：英文六個畫面＋繁中六個功能、編號不重複、每項都寫要證明什麼與評審細項", () => {
  const ids = E.SHOTS.map(s => s.id);
  for (const id of ["en-home", "en-cpunew", "en-cpu", "en-result", "en-settings", "en-sr", "zh-netcard", "zh-shiptilt", "zh-daily", "zh-cb", "zh-lefty", "zh-premove", "zh-lang-sheet"]) assert.ok(ids.includes(id), "少了 " + id);
  assert.equal(new Set(E.SHOTS.map(s => s.no)).size, E.SHOTS.length, "編號重複");
  assert.equal(new Set(ids).size, ids.length, "id 重複");
  for (const s of E.SHOTS) {
    assert.ok(s.proves && s.proves.length > 8, s.id + " 沒寫要證明什麼");
    assert.ok(Array.isArray(s.rubric) && s.rubric.length && s.rubric.every(r => /^P\d{2}\.\d$/.test(r)), s.id + " 評審細項格式不對");
    assert.ok(["en", "net", "zh"].includes(s.part) && ["en", "zh"].includes(s.lang), s.id + " part／lang 不對");
    assert.ok(s.no >= 60 && s.no < 80, s.id + " 編號要在 B60～B79");
  }
  for (const r of ["P41.1", "P64.1", "P21.2", "P45.2", "P22.5", "P06.3"]) assert.ok(E.SHOTS.some(s => s.rubric.includes(r)), "沒有回應 " + r);
});
test("兩種尺寸：iPhone 17 Pro Max 440×956 @3x、iPhone SE 375×667", () => {
  const pm = E.SIZES.find(s => s.id === "pm"), se = E.SIZES.find(s => s.id === "se");
  assert.deepEqual([pm.w, pm.h, pm.dsf], [440, 956, 3]);
  assert.deepEqual([se.w, se.h], [375, 667]);
});
test("檔名：B<編號>-<id>-<尺寸>.png，符合 manifest 的檔名規則；防爆版頁面都有名字", () => {
  for (const s of E.SHOTS) for (const z of E.SIZES) { const f = E.shotFile(s, z.id); assert.match(f, /^B\d{2}-[a-z0-9-]+-(pm|se)\.png$/) }
  assert.equal(E.shotFile(E.SHOTS.find(s => s.id === "en-cpu"), "pm"), "B63-en-cpu-pm.png");
  for (const p of E.FIT_PAGES) assert.ok(p.name && (p.shot || p.hash), p.id);
  for (const p of E.FIT_PAGES.filter(p => p.shot)) assert.ok(E.SHOTS.some(s => s.id === p.shot), p.id + " 對不到清單");
});

/* ---------- PNG、SHA-256 ---------- */
test("pngSize 讀 IHDR 寬高；不是 PNG 回 null；sha256 是 64 位十六進位", () => {
  const b = Buffer.alloc(33); b.writeUInt32BE(0x89504e47, 0); b.writeUInt32BE(0x0d0a1a0a, 4); b.writeUInt32BE(13, 8); b.write("IHDR", 12, "ascii"); b.writeUInt32BE(1320, 16); b.writeUInt32BE(3100, 20);
  assert.deepEqual(E.pngSize(b), { w: 1320, h: 3100 });
  assert.equal(E.pngSize(Buffer.from("not a png at all, really not")), null);
  assert.equal(E.pngSize(null), null);
  assert.match(E.sha256(b), /^[0-9a-f]{64}$/);
  assert.equal(E.sha256(Buffer.from("abc")), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
});

/* ---------- manifest ---------- */
const good = () => ({ tool: "x", command: "node x", build: "20261113-0540", url: "https://raysonchen2023-cloud.github.io/xiangqi-lab/", createdAt: "2026-11-13T06:00:00.000Z", browser: "Chrome（headless）", disclaimer: E.DISCLAIMER,
  files: [{ file: "B63-en-cpu-pm.png", kind: "實拍", size: "pm", px: { w: 1320, h: 3000 }, build: "20261113-0540", url: "https://raysonchen2023-cloud.github.io/xiangqi-lab/#/cpu", takenAt: "2026-11-13T06:01:00.000Z", sha256: "a".repeat(64), proves: "對局頁英文" },
    { file: "A30-en-ui-two-sizes.png", kind: "拼圖", size: "", px: { w: 1600, h: 900 }, build: "20261113-0540", url: "https://raysonchen2023-cloud.github.io/xiangqi-lab/", takenAt: "2026-11-13T06:09:00.000Z", sha256: "b".repeat(64), proves: "英文拼圖" }] });
test("validateManifest：格式正確的通過；聲明一定要寫「不是實機」", () => {
  assert.deepEqual(E.validateManifest(good()), []);
  assert.match(E.DISCLAIMER, /無頭/); assert.match(E.DISCLAIMER, /不是實機/);
  const m = good(); m.disclaimer = "headless"; assert.ok(E.validateManifest(m).some(e => /不是實機/.test(e)));
});
test("validateManifest：抓得到缺欄位、檔名、重複、SHA-256、種類、時間、網址、尺寸代號", () => {
  const cases = [
    [m => { delete m.build }, /少了 build/], [m => { m.files[0].file = "shot.png" }, /檔名格式/], [m => { m.files[1].file = m.files[0].file }, /重複/],
    [m => { m.files[0].sha256 = "xyz" }, /sha256/], [m => { m.files[0].kind = "實機" }, /kind/], [m => { m.files[0].takenAt = "昨天" }, /時間/],
    [m => { m.files[0].url = "file:///c:/x" }, /網址/], [m => { m.files[0].size = "ipad" }, /尺寸代號/], [m => { m.files[0].proves = "" }, /證明/], [m => { m.files[0].px = null }, /像素/],
  ];
  for (const [f, re] of cases) { const m = good(); f(m); const e = E.validateManifest(m); assert.ok(e.some(x => re.test(x)), re + " 沒抓到：" + JSON.stringify(e)) }
  assert.deepEqual(E.validateManifest(null), ["不是物件"]);
});

/* ---------- 防爆版判斷 ---------- */
const it = (i, o) => Object.assign({ i, tag: "button", text: "T" + i, r: { x: 10, y: 10, w: 100, h: 40 }, sw: 100, cw: 100, ovx: "visible", tr: { x: 20, y: 20, w: 60, h: 20 }, pr: { x: 0, y: 0, w: 375, h: 600 }, prScroll: false, inScroller: false, fixed: false, anc: [], act: true, hide: false }, o);
const snap = items => ({ vw: 375, vh: 667, docW: 375, items });
const types = s => E.judgeOverflow(s).map(q => q.type).sort();
test("judgeOverflow：沒問題的版面回空陣列", () => {
  assert.deepEqual(E.judgeOverflow(snap([it(0), it(1, { r: { x: 10, y: 60, w: 100, h: 40 }, tr: { x: 20, y: 70, w: 60, h: 20 } })])), []);
  assert.deepEqual(E.judgeOverflow(snap([])), []); assert.deepEqual(E.judgeOverflow(null), []);
});
test("judgeOverflow：文字左右超出元素框＝文字超出元素框；overflow 隱藏時＝文字被截斷", () => {
  assert.deepEqual(types(snap([it(0, { tr: { x: 20, y: 20, w: 120, h: 20 } })])), ["box"]);
  assert.deepEqual(types(snap([it(0, { tr: { x: 5, y: 20, w: 60, h: 20 } })])), ["box"]);
  assert.deepEqual(types(snap([it(0, { tr: { x: 20, y: 20, w: 120, h: 20 }, ovx: "hidden" })])), ["cut"]);
  assert.deepEqual(types(snap([it(0, { tr: { x: 20, y: 20, w: 90.8, h: 20 } })])), [], "0.8px 次像素誤差不算");
});
test("judgeOverflow：上下只超出 3px（字型留白）不算，超出 6px 才算", () => {
  assert.deepEqual(types(snap([it(0, { tr: { x: 20, y: 7, w: 60, h: 20 } })])), []);
  assert.deepEqual(types(snap([it(0, { tr: { x: 20, y: 20, w: 60, h: 36 } })])), ["box"]);
});
test("judgeOverflow：只有 scrollWidth>clientWidth（裝飾撐大）不算；有省略號才算截斷", () => {
  assert.deepEqual(types(snap([it(0, { sw: 105, cw: 100 })])), []);
  assert.deepEqual(types(snap([it(0, { sw: 140, cw: 100, ovx: "hidden ellipsis" })])), ["cut"]);
  assert.deepEqual(types(snap([it(0, { sw: 140, cw: 0, ovx: "hidden ellipsis" })])), [], "行內元素 clientWidth＝0 不比");
});
test("judgeOverflow：超出父容器；父容器可左右捲、元素浮動定位都不算", () => {
  const out = { r: { x: 300, y: 10, w: 100, h: 40 }, tr: { x: 310, y: 20, w: 60, h: 20 }, pr: { x: 0, y: 0, w: 350, h: 600 } };
  assert.deepEqual(types(snap([it(0, out)])), ["parent", "screen"]);
  assert.deepEqual(types(snap([it(0, Object.assign({}, out, { prScroll: true, inScroller: true }))])), []);
  assert.deepEqual(types(snap([it(0, Object.assign({}, out, { fixed: true }))])), ["screen"]);
});
test("judgeOverflow：超出畫面；在可左右捲的容器裡不算；整頁寬過視窗＝整頁可左右捲動", () => {
  assert.deepEqual(types(snap([it(0, { r: { x: -6, y: 10, w: 100, h: 40 }, tr: { x: 0, y: 20, w: 60, h: 20 }, pr: null })])), ["screen"]);
  assert.deepEqual(types(snap([it(0, { r: { x: 340, y: 10, w: 100, h: 40 }, tr: { x: 350, y: 20, w: 60, h: 20 }, pr: null, inScroller: true })])), []);
  assert.deepEqual(types({ vw: 375, docW: 420, items: [] }), ["page"]);
});
test("judgeOverflow：文字互相重疊；互相包住、只碰到邊（≤2px）不算", () => {
  const a = it(0, { r: { x: 10, y: 10, w: 120, h: 40 }, tr: { x: 20, y: 20, w: 100, h: 20 } }), b = it(1, { r: { x: 100, y: 15, w: 120, h: 40 }, tr: { x: 105, y: 22, w: 100, h: 20 } });
  const q = E.judgeOverflow(snap([a, b]));
  assert.deepEqual(q.map(x => x.type), ["overlap"]); assert.match(q[0].text, /T0 ⟷ T1/); assert.deepEqual([q[0].r.w, q[0].r.h], [15, 18]);
  assert.deepEqual(types(snap([a, Object.assign({}, b, { anc: [0] })])), [], "b 在 a 裡面");
  assert.deepEqual(types(snap([it(0), it(1, { r: { x: 70, y: 10, w: 100, h: 40 }, tr: { x: 78, y: 20, w: 60, h: 20 }, act: false })])), [], "文字只疊 2px");
});
test("judgeOverflow：文字沒疊到、兩個可點元素框交疊 >4px＝按鈕框互相重疊；不是可點的不算", () => {
  const a = it(0, { r: { x: 10, y: 10, w: 100, h: 40 }, tr: { x: 20, y: 20, w: 40, h: 20 } }), b = it(1, { r: { x: 90, y: 20, w: 100, h: 40 }, tr: { x: 130, y: 30, w: 40, h: 20 } });
  assert.deepEqual(types(snap([a, b])), ["tapOverlap"]);
  assert.deepEqual(types(snap([a, Object.assign({}, b, { act: false })])), []);
});
test("judgeOverflow：只給讀屏軟體的隱藏區（hide）整個跳過", () => {
  assert.deepEqual(types(snap([it(0, { hide: true, r: { x: 135, y: 0, w: 30, h: 20 }, pr: { x: 0, y: 0, w: 1, h: 1 }, tr: { x: 135, y: 0, w: 60, h: 20 } })])), []);
});
test("fitTable：每個防爆版頁面一列、沒量到要寫出來、逐項列元素與文字（| 換掉）", () => {
  const R = { sizes: E.SIZES.map(s => ({ id: s.id, name: s.name })), fit: { home: { pm: { n: 20, issues: [] }, se: { n: 21, issues: [{ type: "overlap", tag: "button ⟷ button", text: "Board preview ⟷ Font|language", detail: "文字交疊 10×10 px" }], marked: "B80-enfit-home-se.png" } }, cpu: { pm: { err: "逾時" } } } };
  const t = E.fitTable(R);
  for (const p of E.FIT_PAGES) assert.ok(t.includes("| " + p.name + " |"), p.name);
  assert.match(t, /\*\*0\*\*（20）/); assert.match(t, /\*\*1\*\*（21）/); assert.match(t, /沒量到（逾時）/);
  assert.match(t, /文字互相重疊 \| button ⟷ button \| Board preview ⟷ Font／language/); assert.match(t, /B80-enfit-home-se\.png/);
  assert.match(E.fitTable({ sizes: R.sizes, fit: {} }), /全部頁面都沒有問題/);
});

/* ---------- 原始碼 ---------- */
test("〔原始碼〕只開一個瀏覽器、finally 一定關、每個分頁都設測試房 xq_test、檔名不是 test- 開頭", () => {
  assert.equal((SRC.match(/chromium\.launch\(/g) || []).length, 1);
  assert.match(SRC, /finally \{[\s\S]{0,300}browser\.close\(\)/);
  assert.match(SRC, /localStorage\.setItem\("xq_netRoot", JSON\.stringify\("xq_test"\)\)/);
  assert.ok(!/xqlab-r7k2q/.test(SRC), "不准寫死正式大廳");
  assert.ok(fs.existsSync(path.join(__dirname, "qa", "evidence-shots.js")));
});
