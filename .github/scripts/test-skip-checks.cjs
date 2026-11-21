// 自我測試：假略過檢查 check-fake-skip.cjs 與略過稽核 check-test-skips.cjs（W57，2026-11-21）
//   這兩支是「防放水」的檢查，本身也要防放水：每一種該抓的都要抓到、不該抓的不能誤抓，測不成立要回 2 而不是 0。
// 用法：node --test .github/scripts/test-skip-checks.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const { scanText, scanDir } = require("./check-fake-skip.cjs");
const { parseSkips, compare } = require("./check-test-skips.cjs");
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-skipchk-")); made.push(d); return d };

test("假略過：空測試、缺檔直接 return 都要抓到", () => {
  assert.equal(scanText('test("外掛字典沒有：略過",()=>{});').length, 1);
  assert.equal(scanText('test("x", async () => { });').length, 1);
  assert.equal(scanText('  if (!fs.existsSync(rec)) return;').length, 1);
  assert.equal(scanText('  if(!fs.existsSync(path.join(A,"ring3d.json")))return;   /* 註解 */').length, 1);
});

test("假略過：正確的略過寫法不能誤抓", () => {
  for (const ok of [
    'test("外掛字典沒有：略過",{skip:"只放 CDN"},()=>{});',
    'if (!fs.existsSync(EXT)) return t.skip(SKIP);',
    'if (!fs.existsSync(LF) || !fs.existsSync(BF)) return t.skip("沒有地圖資料");',
    'if(!fs.existsSync(MXC))return t.skip(NO_MXC);const X=require(MXC),K=X.loadMXS(),G=GOOD().map((g,i)=>{if(i%4)return g.cpu;return g})',
    'test("真的有斷言",()=>{assert.ok(true)});',
  ]) assert.deepEqual(scanText(ok), [], ok);
});

test("假略過：倉庫裡現在的測試檔一處都沒有（W57 修完的狀態要守住）", () => {
  const dir = path.join(__dirname, "..", "..", "source", "xiangqi-lab", "tools");
  assert.deepEqual(scanDir(dir), []);
});

const OUT = (n, items) => `…\n四欄合計：通過 10、失敗 0、略過 ${n}、預期失敗 0（其中預期失敗卻通過 0）；三類項數合計 ${10 + n}（含略過），預期失敗另計。\n`
  + (items.length ? "略過的項目（這個環境跑不了、沒有執行，不算通過）：\n" + items.map(x => "  ﹣ " + x).join("\n") + "\n" : "") + "說明：…\n";

test("略過稽核：解析逐條清單；找不到測試總結回 null（測不成立）", () => {
  assert.equal(parseSkips("沒有跑測試"), null);
  const s = parseSkips(OUT(2, ["test-a.js：甲（沒有檔）", "test-b.js：乙"]));
  assert.equal(s.total, 2); assert.deepEqual(s.items, ["test-a.js：甲（沒有檔）", "test-b.js：乙"]);
});

test("略過稽核：新的略過、消失的略過、總數對不上都分得出來", () => {
  const r = compare(parseSkips(OUT(2, ["A", "B"])), ["A", "C"]);
  assert.deepEqual(r.added, ["B"]); assert.deepEqual(r.gone, ["C"]); assert.equal(r.countMismatch, false);
  assert.equal(compare(parseSkips(OUT(3, ["A", "B"])), ["A", "B"]).countMismatch, true);
});

test("略過稽核（實際執行）：全在白名單 0；有新的略過 1；沒有測試總結、白名單壞掉、總數對不上都是 2", () => {
  const d = tmp(), allow = path.join(d, "allow.json"), out = path.join(d, "out.txt"), S = path.join(__dirname, "check-test-skips.cjs");
  const run = () => cp.spawnSync(process.execPath, [S, out, allow], { encoding: "utf8" });
  fs.writeFileSync(allow, JSON.stringify({ allow: ["test-a.js：甲（沒有檔）"] }));
  fs.writeFileSync(out, OUT(1, ["test-a.js：甲（沒有檔）"])); assert.equal(run().status, 0);
  fs.writeFileSync(out, OUT(2, ["test-a.js：甲（沒有檔）", "test-b.js：新的"])); const r = run(); assert.equal(r.status, 1); assert.match(r.stderr, /test-b\.js：新的/);
  fs.writeFileSync(out, "測試沒有跑"); assert.equal(run().status, 2);
  fs.writeFileSync(out, OUT(5, ["test-a.js：甲（沒有檔）"])); assert.equal(run().status, 2);
  fs.writeFileSync(allow, "{壞掉"); fs.writeFileSync(out, OUT(1, ["test-a.js：甲（沒有檔）"])); assert.equal(run().status, 2);
});

test("白名單本身：每一行都要寫原因（結尾是全形括號裡的說明）", () => {
  const A = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "test-skip-allow.json"), "utf8")).allow;
  assert.ok(A.length > 0);
  const bad = A.filter(x => !/（.+）$/.test(x));   /* 原因裡常有一層括號：「（沒有…（只放 CDN））」 */
  assert.deepEqual(bad, [], "沒寫原因的略過不能進白名單");
});
