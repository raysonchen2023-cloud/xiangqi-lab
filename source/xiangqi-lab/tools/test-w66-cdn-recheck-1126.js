/* W66（11/22 登記，P2）：P0-IMG 送審前安裝包檢查 xiangqi-android/scripts/check-aab-assets.js 問 CDN 時，
   全部問完後，沒確認到的（連不上、429、5xx）再低並行問一輪；只有 404／410 才算 ✘，重問還是沒確認到的照樣是 △（結束代碼 3）。
   起因：11/22 26112201 閘門九次重跑都有 1～41 項偶發連不上（Node fetch），單次拿不到結束代碼 0。
   這支用假的 head（回 HTTP 狀態、丟例外＝連不上）跑工具裡真的 askCdn，不連網路；sleep 換成不等。
   反測：CDN 全部連不上時，重問一輪後仍全部是 △、結束代碼 3（不會被當成通過）；改壞驗證：拿掉重問、把連不上當成有、把連不上當成沒有，檢查一定抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const CHECK = path.join(__dirname, "..", "..", "xiangqi-android", "scripts", "check-aab-assets.js");
const SRC = fs.readFileSync(CHECK, "utf8");
const CA = require(CHECK);
const noWait = { sleep: async () => {} };

/* 假的 CDN：plan[檔名] 是一串狀態，依序回（-1＝丟例外，連不上）；用完就一直回最後一個。記錄每檔被問幾次、同時最多幾個請求 */
function fakeCdn(plan) {
  const asked = {}, live = { now: 0, max: 0 };
  const head = async (u) => { asked[u] = (asked[u] || 0) + 1; live.now++; live.max = Math.max(live.max, live.now);
    await new Promise((r) => setImmediate(r)); live.now--;
    const seq = plan[u] || [200], st = seq[Math.min(asked[u] - 1, seq.length - 1)]; if (st === -1) throw new Error("連不上"); return st };
  return { head, asked, live };
}

/* 照工具的 exitCode 算結束代碼（不算金絲雀） */
const codeOf = (r) => CA.exitCode({ red: r.miss.length, unknown: r.unknown.length, cdn: true });

/* 規則檢查（回傳不符合的地方），同一組拿去跑改壞的 askCdn */
async function recheckProblems(askCdn) {
  const bad = [];
  /* ① 第一輪 4 次都連不上、重問一輪連上：算有，不留在 △，結束代碼 0 */
  let C = fakeCdn({ "data/a.webp": [-1, -1, -1, -1, 200], "data/b.webp": [200] });
  let r = await askCdn([["data/a.webp", false], ["data/b.webp", false]], C.head, noWait);
  if (r.unknown.length !== 0 || r.miss.length !== 0 || r.ok200 !== 2) bad.push("① 偶發連不上、重問連上：要算有（實際 unknown " + r.unknown.length + "、miss " + r.miss.length + "、ok " + r.ok200 + "）");
  if (codeOf(r) !== 0) bad.push("① 重問連上：結束代碼 0");
  if (!r.recheck || r.recheck.asked !== 1 || r.recheck.ok !== 1) bad.push("① 重問紀錄：第一輪沒確認到 1、重問連上 1");
  if (C.asked["data/a.webp"] !== 5) bad.push("① 第一輪問 4 次、重問第 1 次就連上（實際問了 " + C.asked["data/a.webp"] + " 次）");
  /* ② 重問一輪拿到 404：算確定沒有（✘），結束代碼 1 */
  C = fakeCdn({ "data/c.json.parts.json": [503, 503, 503, 503, 404] });
  r = await askCdn([["data/c.json", true]], C.head, noWait);
  if (r.miss.length !== 1 || r.unknown.length !== 0 || codeOf(r) !== 1) bad.push("② 重問拿到 404：要算 ✘（實際 miss " + r.miss.length + "、unknown " + r.unknown.length + "）");
  if (!C.asked["data/c.json.parts.json"]) bad.push("② 切塊檔問 .parts.json");
  /* ③ 反測：CDN 全部連不上（重問也是）：全部留在 △，結束代碼 3，不算通過 */
  const all = Array.from({ length: 30 }, (_, i) => ["data/x" + i + ".webp", false]), down = {}; for (const [f] of all) down[f] = [-1];
  C = fakeCdn(down); r = await askCdn(all, C.head, noWait);
  if (r.unknown.length !== 30 || r.miss.length !== 0 || r.ok200 !== 0) bad.push("③ 全部連不上：30 項都要留在 △（實際 unknown " + r.unknown.length + "、miss " + r.miss.length + "、ok " + r.ok200 + "）");
  if (codeOf(r) !== 3) bad.push("③ 全部連不上：結束代碼 3（實際 " + codeOf(r) + "）");
  if (r.unknown.some((x) => !/連不上/.test(x.why) || x.st !== -1)) bad.push("③ △ 寫明連不上、記狀態 -1");
  if (Object.values(C.asked).some((n) => n !== 7)) bad.push("③ 每檔第一輪 4 次＋重問 3 次＝7 次");
  /* ④ 429、5xx 重問還是一樣：留在 △，狀態照記 */
  C = fakeCdn({ "data/d.webp": [429], "data/e.webp": [502] });
  r = await askCdn([["data/d.webp", false], ["data/e.webp", false]], C.head, noWait);
  if (r.unknown.map((x) => x.st).sort().join() !== "429,502" || codeOf(r) !== 3) bad.push("④ 429、502 重問還是一樣：留在 △、記狀態");
  /* ⑤ 第一輪就確定 404（照舊每檔最多問 4 次，拿到 200 才停）：直接 ✘，不進重問那一輪 */
  C = fakeCdn({ "data/f.webp": [404] });
  r = await askCdn([["data/f.webp", false]], C.head, noWait);
  if (r.miss.length !== 1 || C.asked["data/f.webp"] !== 4 || r.recheck.asked !== 0) bad.push("⑤ 第一輪 404：直接 ✘、第一輪問 4 次、不進重問（實際問了 " + C.asked["data/f.webp"] + " 次）");
  /* ⑥ 重問是低並行：第一輪最多 6 個、重問最多 2 個同時 */
  const many = Array.from({ length: 20 }, (_, i) => ["data/m" + i + ".webp", false]), flaky = {}; for (const [f] of many) flaky[f] = [-1, -1, -1, -1, 200];
  C = fakeCdn(flaky); const live2 = { now: 0, max: 0 };
  /* 第 5 次以後的請求＝重問那一輪，只數這些同時有幾個 */
  const head2 = async (u) => { const re = (C.asked[u] || 0) >= 4; if (re) { live2.now++; live2.max = Math.max(live2.max, live2.now) } try { return await C.head(u) } finally { if (re) live2.now-- } };
  r = await askCdn(many, head2, noWait);
  if (C.live.max > 6) bad.push("⑥ 第一輪最多 6 個同時（實際 " + C.live.max + "）");
  if (live2.max > 2 || live2.max < 1) bad.push("⑥ 重問最多 2 個同時（實際 " + live2.max + "）");
  if (r.ok200 !== 20 || r.unknown.length) bad.push("⑥ 20 項重問後都連上");
  /* ⑦ 重問前有等一下（等 CDN 限流退掉） */
  const waits = []; C = fakeCdn({ "data/g.webp": [-1, -1, -1, -1, 200] });
  await askCdn([["data/g.webp", false]], C.head, { sleep: async (ms) => { waits.push(ms) } });
  if (!waits.some((ms) => ms >= 3000)) bad.push("⑦ 重問前要等至少 3 秒（實際等過 " + waits.join("、") + "）");
  return bad;
}

test("CDN 偶發連不上：全部問完後低並行再問一輪；重問連上算有、拿到 404 算 ✘、還是連不上照樣 △；CDN 全斷仍是結束代碼 3", async () => {
  assert.equal(typeof CA.askCdn, "function", "check-aab-assets.js 匯出 askCdn");
  assert.deepEqual(await recheckProblems(CA.askCdn), []);
});

test("改壞驗證：拿掉重問、連不上當成有、連不上當成沒有、重問全開 6 個並行，檢查一定抓得到", async () => {
  const Mod = require("module"), fn = (src) => { const m = new Mod(CHECK, module); m.filename = CHECK; m.paths = Mod._nodeModulePaths(path.dirname(CHECK)); m._compile(src, CHECK); return m.exports.askCdn };
  const V = [
    ["拿掉重問", (s) => s.replace("  if (first.length) { await sleep(reWait);", "  for (const [f, split] of first) unknown.push({ f, st: -1, why: unknownWhy(-1) });\n  if (false) { await sleep(reWait);"), "①"],
    ["連不上當成有", (s) => s.replace("else notYet(st) };", "else ok200++ };"), "③"],
    ["連不上當成沒有", (s) => s.replace("else if (st === 404 || st === 410) miss.push", "else if (st !== 200) miss.push"), "③"],
    ["重問全開 6 個並行", (s) => s.replace("reConc = 2, reWait = 5000", "reConc = 6, reWait = 5000"), "⑥"],
  ];
  for (const [nm, patch, key] of V) { const s = patch(SRC); assert.notEqual(s, SRC, nm + "：改壞有改到"); const bad = await recheckProblems(fn(s)); assert.ok(bad.some((x) => x.startsWith(key)), nm + "：要被抓到（" + key + "），實際 " + JSON.stringify(bad)) }
  assert.deepEqual(await recheckProblems(fn(SRC)), [], "沒改壞的原檔用同一個載入方式也全過");
});

test("〔原始碼〕主流程用 askCdn 問 CDN（同一個金絲雀探測檔排在同一個佇列）、報告寫進 cdnRecheck；LF、沒有控制字元", () => {
  assert.match(SRC, /const queue = \[\.\.\.viaCdn, \[probeF, false\]\];\n\s+const \{ miss, unknown, ok200, recheck \} = await askCdn\(queue, /, "主流程走 askCdn，探測檔在同一個佇列");
  assert.ok(SRC.includes("cdnRecheck: R.cdnRecheck || null"), "報告 JSON 有 cdnRecheck");
  assert.ok(!SRC.includes("\r") && !/[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(SRC), "LF、沒有控制字元");
});
