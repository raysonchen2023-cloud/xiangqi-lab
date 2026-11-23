// W74～W76（11/23，開發者看外部評論後選「步驟 7 移到網頁上線前」「P0 加回退與開關測項」）：
//   CDN 三平台共用又沒分版，網頁一上線現行 App 就讀到新資料；所以要在網頁上線前，讓模擬器裡的 App 改讀這版要上線的資料。
//   這裡驗改向工具 cdn-route.js 與 check-scenes.js 新加的參數「怎麼判」：不開模擬器、不連網、不裝 App。
//   重點：要改向卻沒證明攔截生效（探測檔讀不到）＝測不成立 2，不能當成「新 CDN 沒問題」。
// 用法：node --test xiangqi-lab/tools/test-cdn-route-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const AND = path.join(__dirname, "..", "..", "xiangqi-android", "scripts");
const R = require(path.join(AND, "cdn-route.js"));
const SC = path.join(AND, "check-scenes.js");
const { finalCode, routeBadOf, routeArgError } = require(SC);
const { decide, routeCdn, summarize, CDN, FLAGS_URL, PROBE, PROBE_BODY } = R;

/* 假的 CDN 資料夾（跟 cdn-deploy --stage 一樣的結構） */
function stage() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-cdnroute-"));
  fs.mkdirSync(path.join(d, "data", "home"), { recursive: true });
  fs.writeFileSync(path.join(d, "data", "home", "a.webp"), Buffer.from([1, 2, 3, 4]));
  fs.writeFileSync(path.join(d, "data", "home", "長卷.json"), "{\"v\":2}");
  fs.writeFileSync(path.join(path.dirname(d), path.basename(d) + "-外面.txt"), "不該被讀到");
  return d;
}

test("改向判斷：探測檔一律回固定內容；沒給目標就不動；網址目標保留查詢字串、不多斜線；不是 CDN 的請求不動", () => {
  const p = decide(CDN + PROBE + "?t=1", {});
  assert.equal(p.action, "fulfill"); assert.equal(p.body.toString(), PROBE_BODY); assert.equal(p.probe, true);
  assert.equal(decide(CDN + "data/x.webp", {}).action, "continue", "沒給 --cdn-to（W75）＝讀正式 CDN");
  const r = decide(CDN + "data/x.webp?v=3", { to: "https://pre.xiangqi-cdn.pages.dev" });
  assert.deepEqual([r.action, r.url], ["redirect", "https://pre.xiangqi-cdn.pages.dev/data/x.webp?v=3"]);
  assert.equal(decide(CDN + "data/x.webp", { to: "https://pre.example/" }).url, "https://pre.example/data/x.webp", "目標結尾有斜線也不重複");
  assert.equal(decide("https://localhost/data/x.webp", { to: "https://pre.example/" }).action, "continue", "App 自己包裡的檔不改向");
  assert.equal(decide("https://example.com/data/x.webp", { to: "https://pre.example/" }).action, "continue");
});

test("改向判斷：本機資料夾目標照 CDN 結構讀檔；中文檔名要解碼；找不到、跑出資料夾外都回 404（等於新 CDN 沒有這個檔）", () => {
  const d = stage();
  const a = decide(CDN + "data/home/a.webp", { to: d });
  assert.deepEqual([a.action, a.status, a.type, [...a.body]], ["fulfill", 200, "image/webp", [1, 2, 3, 4]]);
  const j = decide(CDN + "data/home/" + encodeURIComponent("長卷.json") + "?t=9", { to: d });
  assert.equal(j.status, 200); assert.equal(j.body.toString(), "{\"v\":2}"); assert.equal(j.type, "application/json");
  const m = decide(CDN + "data/home/b.webp", { to: d }); assert.deepEqual([m.status, m.miss], [404, "data/home/b.webp"]);
  const out = decide(CDN + "data/..%2F..%2F" + encodeURIComponent(path.basename(d) + "-外面.txt"), { to: d });
  assert.equal(out.status, 404, "用 ../ 跑出資料夾：不能讀到外面的檔"); assert.ok(!out.body.length);
  assert.equal(decide(CDN + "data/home", { to: d }).status, 404, "資料夾不是檔");
  assert.equal(decide(CDN + "data/%E0%A4%A", { to: d }).status, 400, "壞掉的網址編碼");
});

test("改向判斷：遠端開關檔（W76）可以換成指定內容、或讓它讀不到；沒給就不動；網址帶 ?t= 也認得", () => {
  const f = decide(FLAGS_URL + "?t=123", { flags: { v: 1, off: { halls8: "W76" } } });
  assert.equal(f.action, "fulfill"); assert.deepEqual(JSON.parse(f.body.toString()), { v: 1, off: { halls8: "W76" } });
  assert.equal(decide(FLAGS_URL + "?t=1", { flags: "fail" }).action, "fail");
  assert.equal(decide(FLAGS_URL + "?t=1", {}).action, "continue");
  assert.equal(decide(FLAGS_URL.replace("main", "dev") + "?t=1", { flags: "fail" }).action, "continue", "別的分支的檔不是 App 讀的那份");
});

/* 假的 CDP：記下送出的指令，手動觸發 requestPaused */
function fakeCdp(failOn) {
  const sent = [], hs = [];
  return { sent, fire: async (url, id = "r" + sent.length) => { for (const h of hs) await h({ method: "Fetch.requestPaused", params: { requestId: id, request: { url } } }) },
    on: (h) => hs.push(h), send: async (m, p) => { sent.push([m, p]); if (failOn && m === failOn) throw new Error("假的 CDP 錯誤") } };
}

test("攔截：開 Fetch 攔 CDN（有開關時多攔開關檔）；每種處理送對的 CDP 指令；送失敗要記下來，不能吞掉", async () => {
  const d = stage();
  let c = fakeCdp(); let log = await routeCdn(c, { to: d });
  assert.deepEqual(c.sent[0], ["Fetch.enable", { patterns: [{ urlPattern: CDN + "*", requestStage: "Request" }] }]);
  await c.fire(CDN + "data/home/a.webp"); await c.fire(CDN + "data/home/zz.webp"); await c.fire(CDN + PROBE);
  const [, ok] = c.sent[1], [, nf] = c.sent[2], [, pr] = c.sent[3];
  assert.equal(c.sent[1][0], "Fetch.fulfillRequest"); assert.equal(ok.responseCode, 200); assert.equal(Buffer.from(ok.body, "base64").length, 4);
  assert.ok(ok.responseHeaders.some((h) => h.name === "Access-Control-Allow-Origin" && h.value === "*"), "跨網域讀取要有 CORS 標頭，不然 App 拿不到");
  assert.equal(nf.responseCode, 404); assert.equal(Buffer.from(pr.body, "base64").toString(), PROBE_BODY);
  assert.deepEqual(log.map((r) => r.action), ["fulfill", "fulfill", "fulfill"]); assert.equal(log[1].miss, "data/home/zz.webp");
  c = fakeCdp(); log = await routeCdn(c, { to: "https://pre.example/", flags: "fail" });
  assert.equal(c.sent[0][1].patterns.length, 2); assert.equal(c.sent[0][1].patterns[1].urlPattern, FLAGS_URL + "*");
  await c.fire(CDN + "data/a.json"); await c.fire(FLAGS_URL + "?t=5"); await c.fire("https://localhost/x.js");
  assert.deepEqual(c.sent.slice(1).map(([m]) => m), ["Fetch.continueRequest", "Fetch.failRequest", "Fetch.continueRequest"]);
  assert.equal(c.sent[1][1].url, "https://pre.example/data/a.json"); assert.equal(c.sent[3][1].url, undefined, "不改向的照原網址");
  c = fakeCdp("Fetch.fulfillRequest"); log = await routeCdn(c, { to: d }); await c.fire(CDN + "data/home/a.webp");
  assert.match(log[0].error, /假的 CDP 錯誤/);
});

test("摘要：探測檔不算進攔到的數；缺的檔去重；送 CDP 失敗的列出來；開關檔怎麼處理的也記下", () => {
  const log = [{ url: CDN + PROBE, action: "fulfill", status: 200, probe: true }, { url: CDN + "data/a", action: "fulfill", status: 200 },
    { url: CDN + "data/b", action: "fulfill", status: 404, miss: "data/b" }, { url: CDN + "data/b?x", action: "fulfill", status: 404, miss: "data/b" },
    { url: CDN + "data/c", action: "redirect", to: "https://p/data/c", error: "斷了" }, { url: FLAGS_URL + "?t=1", action: "fail" }];
  const s = summarize(log, true);
  assert.deepEqual([s.probeOk, s.intercepted, s.redirected, s.missing, s.flags], [true, 5, 2, ["data/b"], ["fail"]]);
  assert.equal(s.errors.length, 1);
  assert.equal(summarize(log, false).probeOk, false); assert.equal(summarize(log, "xq-route-ok").probeOk, false, "只認 true，不認字串");
});

test("結束代碼：要改向卻沒證明攔截生效＝2（測不成立）；有紅燈照樣 1；沒改向時不受影響", () => {
  const ok = [{ mode: "online", route: { probeOk: true } }], no = [{ mode: "online", route: { probeOk: false } }], none = [{ mode: "online" }];
  assert.equal(routeBadOf(ok, true), false); assert.equal(routeBadOf(no, true), true); assert.equal(routeBadOf(none, true), true, "這輪沒有改向摘要＝沒證明");
  assert.equal(routeBadOf([], true), true, "一輪都沒掃＝沒證明"); assert.equal(routeBadOf(no, false), false, "沒要改向就不看");
  assert.equal(finalCode({ bad: 0, noStatus: false, routeBad: true }), 2); assert.equal(finalCode({ bad: 3, routeBad: true }), 1);
  assert.equal(finalCode({ bad: 0, noStatus: false, routeBad: false }), 0); assert.equal(finalCode({ bad: 0, noStatus: false }), 0, "舊的呼叫照舊");
});

test("改向參數：只能連線輪；目標要是 https 或存在的資料夾；開關檔要有 off、兩種開關參數只能擇一", () => {
  const d = stage(), j = path.join(d, "f.json"), bad = path.join(d, "g.json");
  fs.writeFileSync(j, JSON.stringify({ v: 1, off: { halls8: "W76" } })); fs.writeFileSync(bad, JSON.stringify({ v: 1, off: [] }));
  assert.equal(routeArgError({ mode: "online", cdnTo: d }), null); assert.equal(routeArgError({ mode: "online", cdnTo: "https://p/" }), null);
  assert.match(routeArgError({ mode: "both", cdnTo: d }), /只能配 --mode online/);
  assert.match(routeArgError({ mode: "offline", flagsFail: true }), /只能配 --mode online/);
  assert.match(routeArgError({ mode: "online", cdnTo: "http://p/" }), /https 網址或存在的資料夾/);
  assert.match(routeArgError({ mode: "online", cdnTo: path.join(d, "沒有") }), /https 網址或存在的資料夾/);
  assert.match(routeArgError({ mode: "online", cdnTo: j }), /https 網址或存在的資料夾/, "給檔案不行，要資料夾");
  assert.match(routeArgError({ mode: "online", flagsFile: j, flagsFail: true }), /擇一/);
  assert.match(routeArgError({ mode: "online", flagsFile: bad }), /要有 "off"/);
  assert.match(routeArgError({ mode: "online", flagsFile: path.join(d, "沒有.json") }), /讀不到或不是 JSON/);
  assert.equal(routeArgError({ mode: "online", flagsFile: j }), null); assert.equal(routeArgError({ mode: "both" }), null);
});

test("命令列：參數不對直接結束代碼 2，不會開始掃（不用模擬器）", () => {
  for (const a of [["--cdn-to", "https://p/"], ["--cdn-to", "https://p/", "--mode", "both"], ["--mode", "online", "--flags-fail", "--flags-file", "x.json"]]) {
    const r = cp.spawnSync(process.execPath, [SC, ...a], { encoding: "utf8", timeout: 20000 });
    assert.equal(r.status, 2, a.join(" ")); assert.match(r.stderr, /✘/);
  }
});

test("〔原始碼〕掃描流程：先開攔截、再重新載入、等首頁掛好，才等預載；報告記探測結果；掃完再摘要一次", () => {
  const s = fs.readFileSync(SC, "utf8");
  const i = s.indexOf("routeLog = await routeCdn(c"), j = s.indexOf('await c.send("Page.reload"'), k = s.indexOf("await waitHome(c)"), l = s.indexOf("await waitPreload(c, 180000)");
  assert.ok(i > 0 && i < j && j < k && k < l, "攔截 → 重新載入 → 等首頁 → 等預載");
  assert.match(s, /rep\.route = summarize\(routeLog, await probeOk\(c\)\)/);
  assert.match(s, /if \(routeLog\) \{ rep\.route = summarize\(routeLog, rep\.route\.probeOk\);/);
  /* #74 Android 12 實跑後補：--cdn-to 時掃完畫面要跑包外檔讀取輪；判成 1 要進紅燈清單 */
  const o = s.indexOf("outside = await c.ev(OUTSIDE_JS())"), cl = s.indexOf("c.close();\n  rep.badRoutes");
  assert.ok(o > l && o < cl, "包外檔讀取輪在掃完畫面之後、關掉連線之前");
  assert.match(s, /if \(routeLog && O\.cdnTo\) \{ try \{ outside = await c\.ev\(OUTSIDE_JS\(\)\) \}/);
  assert.match(s, /outsideJudge\.code === 1\) rep\.badRoutes\.push\(/);
  assert.match(s, /routeBadOf\(R\.sweeps, O\.routing && \{ cdnTo: O\.cdnTo, flags: !!\(O\.flagsFile \|\| O\.flagsFail\) \}\)/);
});

/* ---- #74 Android 12 實跑後補（iMac Claude 2，2026-11-23）：現行 App 只在包裡讀不到才補抓，光掃畫面可能一個 CDN 請求都沒有 ---- */
const vm = require("vm"), crypto = require("crypto");
const sha12 = (b) => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
/* 模擬 App 頁面：pack＝包裡有的檔；cdn＝攔截後新 CDN 回的檔（含 cdn-manifest.json）；wrap＝App 把 fetch 包成「包裡讀不到就改問 CDN」 */
function page({ pack = {}, cdn = {}, wrap = false, subtle = true, spa = null }) {
  const XQ_CDN = "https://xiangqi-cdn.pages.dev/", seen = [];
  const hdr = (t) => ({ get: (k) => String(k).toLowerCase() === "content-type" ? t : null });
  const res = (url, body, t = "application/json") => body === undefined ? { ok: false, status: 404, url, headers: hdr("text/plain"), arrayBuffer: async () => new ArrayBuffer(0), json: async () => { throw new Error("404") } }
    : { ok: true, status: 200, url, headers: hdr(t), arrayBuffer: async () => { const b = Buffer.from(body); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length) }, json: async () => JSON.parse(String(body)) };
  /* spa＝本機伺服器對不存在的路徑回這一頁（像單頁 App 回 index.html），狀態照樣 200 */
  const raw = async (u) => { const p = String(u).split("?")[0]; seen.push(p); if (p.startsWith(XQ_CDN)) return res(p, cdn[p.slice(XQ_CDN.length)]);
    if (pack[p] === undefined && spa != null) return res("https://localhost/" + p, spa, "text/html"); return res("https://localhost/" + p, pack[p]) };
  const fetch = wrap ? async (u, o) => { const r = await raw(u, o); if (!r.ok && !String(u).startsWith(XQ_CDN)) return raw(XQ_CDN + String(u).split("?")[0], o); return r } : raw;
  const ctx = { XQ_CDN, fetch, Date, Object, Array, Uint8Array, String, Math, Buffer, crypto: subtle ? crypto.webcrypto : {} };
  /* vm 裡的陣列、物件屬於另一個執行環境，轉成這邊的 JSON 再比 */
  return { run: async () => JSON.parse(JSON.stringify(await vm.runInNewContext(R.OUTSIDE_JS(), ctx))), seen };
}
const man = (files) => JSON.stringify({ files: Object.fromEntries(Object.entries(files).map(([f, b]) => [f, [Buffer.byteLength(b), sha12(b)]])) });

test("包外檔讀取輪：包裡有的跳過、包外的經由 CDN 讀，大小和 SHA-1 都對才算驗到；判定 0", async () => {
  const F = { "data/a.json": "{\"a\":1}", "data/b.json": "{\"b\":2}", "data/c.webp": "ccc", "data/d.json": "{\"d\":4}" };
  const p = page({ pack: { "data/a.json": F["data/a.json"], "data/c.webp": F["data/c.webp"] }, cdn: { "cdn-manifest.json": man(F), ...F } });
  const o = await p.run();
  assert.equal(o.manifest, 200); assert.deepEqual(o.checked.sort(), ["data/b.json", "data/d.json"]); assert.deepEqual(o.bad, []); assert.equal(o.hash, true);
  assert.deepEqual(R.judgeOutside(o), { code: 0, why: "2 個包外才有的檔都從新 CDN 讀到，大小和 SHA-1 都跟清單對得上" });
  assert.ok(!p.seen.includes("https://xiangqi-cdn.pages.dev/data/a.json"), "包裡有的不去 CDN 讀");
});

test("包外檔讀取輪（反測必紅）：改向到空資料夾（清單 404）、包外檔讀不到、內容或大小不對＝1；全部都在包裡＝2；跑不起來＝2", async () => {
  const F = { "data/a.json": "{\"a\":1}", "data/b.json": "{\"b\":2}" };
  let o = await page({ cdn: {} }).run();
  assert.equal(o.manifest, 404); assert.equal(R.judgeOutside(o).code, 1, "空資料夾一定要回 1，才證明 App 經由攔截讀資料"); assert.match(R.judgeOutside(o).why, /cdn-manifest\.json 讀不到/);
  o = await page({ cdn: { "cdn-manifest.json": man(F), "data/a.json": F["data/a.json"] } }).run();
  assert.equal(R.judgeOutside(o).code, 1); assert.match(R.judgeOutside(o).why, /data\/b\.json（狀態 404）/);
  o = await page({ cdn: { "cdn-manifest.json": man(F), "data/a.json": F["data/a.json"], "data/b.json": "{\"b\":3}" } }).run();
  assert.equal(R.judgeOutside(o).code, 1, "同樣大小、內容不同：SHA-1 抓得到"); assert.match(R.judgeOutside(o).why, /data\/b\.json（SHA-1 /);
  o = await page({ cdn: { "cdn-manifest.json": man(F), "data/a.json": F["data/a.json"], "data/b.json": "{\"b\":22}" } }).run();
  assert.match(R.judgeOutside(o).why, /data\/b\.json（大小 8，清單 7）/);
  o = await page({ pack: F, cdn: { "cdn-manifest.json": man(F), ...F } }).run();
  assert.deepEqual(o.checked, []); assert.equal(R.judgeOutside(o).code, 2, "全部都在包裡＝驗不到"); assert.match(R.judgeOutside(o).why, /找不到包外才有的檔/);
  for (const x of [null, undefined, "x", { error: "逾時" }]) assert.equal(R.judgeOutside(x).code, 2, JSON.stringify(x));
});

test("包外檔讀取輪：App 把 fetch 包成「包裡讀不到改問 CDN」時，照樣認得出包外的檔；沒有 crypto.subtle 時只比大小、照實寫出來", async () => {
  const F = { "data/a.json": "{\"a\":1}", "data/b.json": "{\"b\":2}" };
  const o = await page({ pack: { "data/a.json": F["data/a.json"] }, cdn: { "cdn-manifest.json": man(F), ...F }, wrap: true }).run();
  assert.deepEqual(o.checked, ["data/b.json"], "回應網址是 CDN 的＝包外");
  const n = await page({ cdn: { "cdn-manifest.json": man(F), ...F }, subtle: false }).run();
  assert.equal(n.hash, false); assert.equal(n.checked.length, 2); assert.match(R.judgeOutside(n).why, /只比大小/);
  /* 只挑 data/ 底下、2 MB 以內，探測檔不算 */
  const big = { files: { "data/x.json": [3 * 1024 * 1024, "0"], "engine/e.bin": [3, "0"], "data/__xq_route_probe.txt": [11, "0"], "data/y.json": [7, sha12("{\"y\":1}")] } };
  const y = await page({ cdn: { "cdn-manifest.json": JSON.stringify(big), "data/y.json": "{\"y\":1}" } }).run();
  assert.equal(y.candidates, 1); assert.deepEqual(y.checked, ["data/y.json"]);
});

test("包外檔讀取輪（#74 Android 12 重跑）：本機伺服器對不存在的路徑回 200 的 index.html 時，要比內容，不能全判成在包裡；判成在包裡的、內容不對的都記前幾筆", async () => {
  const F = { "data/a.json": "{\"a\":1}", "data/b.json": "{\"b\":2}", "data/c.json": "{\"c\":3}" }, html = "<!doctype html><title>象棋千秋</title>";
  const o = await page({ pack: { "data/a.json": F["data/a.json"] }, cdn: { "cdn-manifest.json": man(F), ...F }, spa: html }).run();
  assert.deepEqual(o.checked.sort(), ["data/b.json", "data/c.json"], "回 index.html 的不算在包裡");
  assert.deepEqual(o.inPack, [{ f: "data/a.json", size: 7, want: 7, type: "application/json" }]);
  assert.equal(o.localOddCount, 2); assert.deepEqual(o.localOdd[0], { f: "data/b.json", size: Buffer.byteLength(html), want: 7, type: "text/html" });
  assert.equal(R.judgeOutside(o).code, 0);
  /* 沒有 crypto.subtle（只能比大小）時，回 index.html 的照樣不算在包裡：鎖住「比大小」那一條 */
  const n = await page({ pack: { "data/a.json": F["data/a.json"] }, cdn: { "cdn-manifest.json": man(F), ...F }, spa: html, subtle: false }).run();
  assert.deepEqual(n.checked.sort(), ["data/b.json", "data/c.json"], "只比大小也要擋下 index.html");
  /* 包裡那份大小一樣、內容不同（舊版）：SHA-1 比得出來，當成包外去 CDN 讀 */
  const p = await page({ pack: { "data/a.json": "{\"a\":9}" }, cdn: { "cdn-manifest.json": man({ "data/a.json": F["data/a.json"] }), "data/a.json": F["data/a.json"] } }).run();
  assert.deepEqual(p.checked, ["data/a.json"]); assert.equal(p.localOddCount, 1);
  /* 全部都在包裡：說明要附前幾個判成在包裡的檔，方便查 */
  const q = await page({ pack: F, cdn: { "cdn-manifest.json": man(F), ...F } }).run();
  assert.match(R.judgeOutside(q).why, /判成在包裡的前幾個：data\/a\.json（7 位元組、application\/json）/);
});

test("結束代碼（#74 實跑後補）：--cdn-to 沒有包外檔讀取輪、或一個包外檔都沒驗到＝2；判定 1 不算測不成立（由紅燈擋）；換開關檔卻沒攔到開關檔＝2", () => {
  const s = (route) => [{ mode: "online", route: { probeOk: true, ...route } }], cdn = { cdnTo: "https://x/" }, fl = { flags: true };
  assert.equal(routeBadOf(s({}), cdn), true, "沒有包外檔讀取輪");
  assert.equal(routeBadOf(s({ outside: { manifest: 200, checked: [], bad: [], candidates: 3, probed: 3 } }), cdn), true, "一個都沒驗到");
  assert.equal(routeBadOf(s({ outside: { error: "逾時" } }), cdn), true);
  assert.equal(routeBadOf(s({ outside: { manifest: 200, checked: ["data/b.json"], bad: [] } }), cdn), false);
  assert.equal(routeBadOf(s({ outside: { manifest: 404 } }), cdn), false, "判定 1 由紅燈擋，不是測不成立");
  assert.equal(routeBadOf(s({ flags: [] }), fl), true, "開關檔一次都沒攔到"); assert.equal(routeBadOf(s({ flags: ["fulfill"] }), fl), false);
  assert.equal(routeBadOf(s({}), true), false, "舊的呼叫（只給 true）照舊只看探測檔");
});

test("〔原始碼〕工具寫死的網址跟 App 一樣（App 改了網址、工具沒跟上，攔截就攔不到）；回前景等待預設超過 App 不重抓的間隔", () => {
  const M = path.join(__dirname, "..", "..", "xiangqi-db", "m");
  const flags = fs.readFileSync(path.join(M, "00f-flags.js"), "utf8"), util = fs.readFileSync(path.join(M, "00-util.js"), "utf8");
  assert.equal(/XQ_FLAGS_URL="([^"]+)"/.exec(flags)[1], FLAGS_URL, "開關檔網址");
  assert.equal(/const XQ_CDN="([^"]+)"/.exec(util)[1], CDN, "CDN 網址");
  const gap = Number(/now-XQ_FLAGS_AT<(\d+)/.exec(flags)[1]), fg = Number(/arg\("--fg-wait", (\d+)\)/.exec(fs.readFileSync(path.join(AND, "check-flags.js"), "utf8"))[1]);
  assert.ok(fg * 1000 > gap, `回前景等待 ${fg} 秒要超過 App 不重抓的 ${gap / 1000} 秒`);
});
