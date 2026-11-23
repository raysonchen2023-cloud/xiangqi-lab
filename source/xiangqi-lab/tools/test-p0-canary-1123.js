// 2026-11-23 AGENTS.md「P0 出口驗證要難作假」：P0 工具鎖定（tool-pin.js）＋三項金絲雀（故意弄壞的要被抓到）＋送審閘門收金絲雀。
//   不連網、不開模擬器：測純函式與報告格式；實機上的金絲雀（3D 遮罩、假更新視窗、CDN 404）在送審前的實跑裡做。
// 用法：node --test xiangqi-lab/tools/test-p0-canary-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const AND = path.join(__dirname, "..", "..", "xiangqi-android", "scripts");
const rd = (f) => fs.readFileSync(path.join(AND, f), "utf8");
const TP = require(path.join(AND, "tool-pin.js"));
const { gate } = require(path.join(AND, "p0-gate.js"));
const CA = require(path.join(AND, "check-aab-assets.js"));
const { verdict, canaryVerdict } = require(path.join(AND, "check-upgrade.js"));
const { required: HOME_REQUIRED } = require(path.join(AND, "bundle-home-assets.js"));

const A = "a".repeat(64), K = "c".repeat(64), V = "20261123-0900";
const MAIN = (p) => TP.normSha(fs.readFileSync(path.join(AND, path.basename(p))));
const G = (reps, w = [], mainSha = MAIN, cdnProbe = null) => gate(A, V, reps, w, { mainSha, cdnProbe });
const DOWN = { reachable: false, detail: "假：閘門也連不上" }, UP = { reachable: true, detail: "假：閘門連得上" };
const d3 = (android, o = {}) => ({ file: "3d-" + android, json: Object.assign({ tool: "P0-3D", aabSha256: A, apkSha256: K, apkBound: true, pass: true, build: V, android, full: true, rounds: 2, roundsPassed: 2, knownFile: { fromRepo: true }, toolPins: TP.pinsFor("P0-3D") }, o) });
const c3 = (android, o = {}) => ({ file: "3dc-" + android, json: Object.assign({ tool: "P0-3D", selfTest: true, aabSha256: A, apkSha256: K, apkBound: true, pass: true, build: V, android, full: false, toolPins: TP.pinsFor("P0-3D") }, o) });
const img = (o = {}) => ({ file: "img", json: Object.assign({ tool: "P0-IMG", aabSha256: A, pass: true, cdnChecked: true, exitCode: 0, siteVersion: V, red: 0, unknown: 0, redItems: [], canary: { home: true, stale: true, cdn404: true, ok: true }, toolPins: TP.pinsFor("P0-IMG") }, o) });
/* 正確的工具在「CDN 沒驗到」時寫出的報告：結束代碼 3、沒通過、沒有 ✘、有沒驗到的項目（PR #66 第八次複審） */
/* 第九次複審：金絲雀③也要是 CDN 全斷時的樣子（探測檔沒拿到 404、工具說連不上） */
/* 第十次複審：照正確的工具在 CDN 全斷時寫的逐項清單（探測檔也在缺驗清單裡）；金絲雀③那塊用工具裡真的 cdnCanary 產生，不自己捏欄位 */
const PROBE_F = "data/__xq_p0_canary_test.webp";
const downItems = () => [{ f: "data/a.webp", st: -1, why: "CDN 沒確認到（連不上，請稍後重跑 --cdn）" }, { f: PROBE_F, st: -1, why: "CDN 沒確認到（連不上，請稍後重跑 --cdn）" }];
const miss = (L) => {
  const { cdnCanary } = require(path.join(AND, "check-aab-assets.js")), unk = downItems();
  const warnItems = [...unk, { f: "cdn-manifest.json", why: "讀不到 CDN 的 cdn-manifest.json（缺驗）" }];   /* 第十二次：不帶狀態的只有 manifest 那筆 */
  Object.assign(L[0].json, { exitCode: 3, pass: false, red: 0, unknown: unk.length + 1, redItems: [], warn: warnItems.length, warnItems, cdnCompared: 0, viaCdn: unk.length - 1, inPack: 5, need: 5 + unk.length - 1, native: { cdnFallback: true, partsJoin: true, assetPacks: [] } });   /* 第十一次：viaCdn＝要向 CDN 補抓的檔（探測檔不算），need＝包裡＋補抓 */
  const c = { ...L[0].json.canary, ...cdnCanary(PROBE_F, [], unk, { ok200: 0, manOk: false }) }; c.ok = c.home === true && c.stale === true && c.cdn404 === true;
  L[0].json.canary = c; return L };
const upd = (o = {}) => ({ file: "upd", json: Object.assign({ tool: "P0-UPD", aabSha256: A, apkSha256: K, apkBound: true, pass: true, oldWorker: true, new: { build: V }, canary: { dialog: true }, toolPins: TP.pinsFor("P0-UPD") }, o) });
const all = () => [img(), upd(), d3("12"), d3("16"), c3("12"), c3("16")];
const has = (r, re) => r.problems.some((p) => re.test(p));
const W = (code) => [{ code, aabSha256: A, reason: "測試用豁免", decidedBy: "開發者", decidedAt: "2026-11-23" }];

test("〔原始碼〕工具鎖定：清單跟三支工具實際 require 的共用模組一致（工具改了 require 而清單沒跟上，這項會紅）", () => {
  for (const [tool, file] of [["P0-IMG", "check-aab-assets.js"], ["P0-UPD", "check-upgrade.js"], ["P0-3D", "check-3d.js"]]) {
    const reqs = [...rd(file).matchAll(/require\("\.\/([^"]+)"\)/g)].map((m) => m[1]);
    const want = [...new Set([file, ...reqs])].sort();
    assert.deepEqual([...TP.TOOL_FILES[tool]].sort(), want, tool);
    for (const f of want) assert.ok(fs.existsSync(path.join(AND, f)), f + " 存在");
  }
});

test("工具鎖定：雜湊去掉 CR 才算（CRLF 工作區沒改過不誤判）；缺雜湊、跟 main 不同、讀不到 main、多記檔 → 都擋", () => {
  assert.equal(TP.normSha("a\r\nb\r\n"), TP.normSha("a\nb\n"));
  assert.notEqual(TP.normSha("a\nb\n"), TP.normSha("a\nc\n"));
  const pins = TP.pinsFor("P0-IMG");
  assert.deepEqual(TP.checkPins("P0-IMG", pins, MAIN), []);
  assert.match(TP.checkPins("P0-IMG", null, MAIN)[0], /沒有記工具雜湊/);
  const p2 = { ...pins, [TP.DIR + "check-aab-assets.js"]: "f".repeat(64) };
  assert.match(TP.checkPins("P0-IMG", p2, MAIN).join(), /跟 origin\/main 那一版不一樣/);
  assert.match(TP.checkPins("P0-IMG", pins, () => null).join(), /讀不到 origin\/main/);
  const p3 = { ...pins }; delete p3[TP.DIR + "bundle-home-assets.js"];
  assert.match(TP.checkPins("P0-IMG", p3, MAIN).join(), /沒有記 .*bundle-home-assets\.js/);
  assert.match(TP.checkPins("P0-IMG", { ...pins, [TP.DIR + "x.js"]: "e".repeat(64) }, MAIN).join(), /多記了/);
});

test("閘門：三項正式報告＋Android 12、16 兩份 3D 金絲雀、工具都跟 main 一樣 → 可以送審", () => {
  assert.deepEqual(G(all()), { ok: true, problems: [], waived: [], notes: [] });
});

test("閘門（反測必紅）：用改過的工具跑的報告不收，而且不能豁免；讀不到 origin/main 也不收", () => {
  const L = all(); L[1].json.toolPins = { ...L[1].json.toolPins, [TP.DIR + "check-upgrade.js"]: "f".repeat(64) };
  let r = G(L, W("P0-UPD/old-worker")); assert.equal(r.ok, false); assert.ok(has(r, /P0-UPD：.*check-upgrade\.js 跟 origin\/main 那一版不一樣/));
  r = G(all(), [], () => null); assert.equal(r.ok, false); assert.equal(r.problems.filter((p) => /讀不到 origin\/main/.test(p)).length > 0, true);
  const M = all(); delete M[2].json.toolPins; assert.ok(has(G(M), /P0-3D（Android 12）：報告沒有記工具雜湊/));
});

test("閘門（反測必紅）：P0-3D 金絲雀缺一份、自我反測沒照預期、驗的是另一個 AAB 或版號 → 不能送審", () => {
  assert.ok(has(G(all().slice(0, 5)), /缺 Android 16 的 P0-3D 金絲雀/));
  let L = all(); L[4].json.pass = false; assert.ok(has(G(L), /P0-3D 金絲雀（Android 12）：自我反測沒有照預期/));
  L = all(); L[5].json.aabSha256 = "b".repeat(64); assert.ok(has(G(L), /P0-3D 金絲雀（Android 16）：金絲雀要用同一個送審 AAB/));
  L = all(); L[4].json.build = "20261122-0804"; assert.ok(has(G(L), /P0-3D 金絲雀（Android 12）：驗的版號/));
  L = all(); L[4].json.apkBound = false; assert.ok(has(G(L), /P0-3D 金絲雀（Android 12）：沒核對實際測的 APK/));
  L = [...all(), c3("12")]; assert.ok(has(G(L), /P0-3D 金絲雀（Android 12） 有兩份報告/));
  /* 金絲雀報告不能拿來充當正式報告：只交金絲雀、不交正式的，照樣缺 */
  assert.ok(has(G([img(), upd(), c3("12"), c3("16")]), /缺 Android 12 的 P0-3D 報告/));
});

test("閘門（反測必紅）：P0-IMG 金絲雀①②沒抓到不能豁免；③CDN 沒回 404 歸在可豁免的 P0-IMG/cdn；P0-UPD 假視窗沒抓到不能豁免", () => {
  let L = all(); L[0].json.canary = { home: false, stale: true, cdn404: true };
  let r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, false); assert.ok(has(r, /P0-IMG：金絲雀沒被抓到/));
  L = all(); L[0].json.canary = { home: true, stale: false, cdn404: true }; assert.ok(has(G(L), /改掉包裡檔的雜湊 ✘/));
  L = all(); delete L[0].json.canary; assert.ok(has(G(L), /P0-IMG：金絲雀沒被抓到/), "沒記金絲雀＝沒抓到");
  L = miss(all()); L[0].json.canary = { ...L[0].json.canary, home: true, stale: true, cdn404: false, cdnUnreachable: true, cdn: "沒確認到（CDN 連不上）" };
  assert.ok(has(G(L), /CDN 不存在的檔沒被判成沒有（沒確認到（CDN 連不上））/));
  r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, false, "閘門沒有自己探測：不能豁免");
  r = G(L, W("P0-IMG/cdn"), MAIN, UP); assert.equal(r.ok, false, "閘門連得上、報告說連不上：工具失靈"); assert.ok(has(r, /閘門自己連得上 CDN.*工具失靈/));
  r = G(L, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, true, "報告說連不上、閘門也連不上：才可以豁免"); assert.equal(r.waived.length, 2, "正確的報告是結束代碼 3：「要加 --cdn」和金絲雀③兩條都掛 P0-IMG/cdn（第八次複審後）");
  L = miss(all()); L[0].json.canary = { ...L[0].json.canary, home: true, stale: true, cdn404: false, cdn: "沒確認到（CDN 連不上）" }; delete L[0].json.canary.cdnUnreachable;
  r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, false, "訊息寫「連不上」但沒有 cdnUnreachable 布林：不能豁免（不看文字）");
  L = all(); L[0].json.canary = { ...L[0].json.canary, cdn404: false, cdn: "被當成有（CDN 核對失靈）" };
  r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, false, "不存在的檔被當成有＝工具失靈，不能豁免"); assert.ok(has(r, /CDN 核對可能失靈，不能豁免/));
  L = all(); L[1].json.canary = { dialog: false }; r = G(L, W("P0-UPD/old-worker")); assert.equal(r.ok, false); assert.ok(has(r, /P0-UPD：金絲雀（假的「有新版本」視窗）沒被抓到/));
  L = all(); delete L[1].json.canary; assert.ok(has(G(L), /P0-UPD：金絲雀/));
});

test("P0-IMG 金絲雀：用同一個 classify 判，拿掉首頁素材、改掉雜湊都要被判 ✘；找不到可以弄壞的對象＝不成立（寧可擋）", () => {
  const need = new Map([["data/a.webp", { size: 10, h: "aaaaaaaa" }], ["data/b.json", { size: 10 }]]);
  const pack = new Set(["data/a.webp", ...HOME_REQUIRED.map((x) => "data/" + x)]);
  const native = { cdnFallback: true, partsJoin: true }, sha = (f) => (f === "data/a.webp" ? "aaaaaaaa" : "x");
  assert.equal(CA.classify(need, (f) => pack.has(f), sha, native).red.length, 0, "真實狀態沒有 ✘");
  const c = CA.canaryChecks(need, (f) => pack.has(f), sha, native);
  assert.equal(c.home, true); assert.equal(c.stale, true); assert.equal(c.staleFile, "data/a.webp");
  const none0 = () => ({ red: [], warn: [], ok: { inPack: 0, viaCdn: 0 }, viaCdn: [] });
  /* 找不到正常的檔可以弄壞：真實結果已判出同一類 ✘＝判斷有在運作，算成立；判斷壞掉（判不出）＝不成立 */
  assert.equal(CA.canaryChecks(need, (f) => f === "data/a.webp", sha, native).home, true, "包裡本來就缺首頁素材，而且真實結果判出了");
  assert.equal(CA.canaryChecks(need, (f) => f === "data/a.webp", sha, native, none0).home, false, "包裡本來就缺、判斷又壞掉：不成立");
  assert.equal(CA.canaryChecks(new Map([["data/b.json", { size: 10 }]]), (f) => pack.has(f), sha, native).stale, false, "清單沒有雜湊、也沒有真實不符：金絲雀②不成立");
  assert.equal(CA.canaryChecks(need, (f) => pack.has(f), () => "zzzzzzzz", native).stale, true, "包裡的檔本來就跟清單不符，而且真實結果判出了");
  assert.equal(CA.canaryChecks(need, (f) => pack.has(f), () => "zzzzzzzz", native, none0).stale, false, "本來就不符、判斷又壞掉：不成立");
  /* 金絲雀存在的意義：判斷被改壞時要報警。拿三種壞掉的判斷進去，金絲雀都要報「沒抓到」 */
  const none = () => ({ red: [], warn: [], ok: { inPack: 0, viaCdn: 0 }, viaCdn: [] });
  const noHome = (n, h, s, nat) => { const r = CA.classify(n, h, s, nat); r.red = r.red.filter((x) => !/首頁離線必要素材/.test(x.why)); return r };
  const noHash = (n, h, s, nat) => { const r = CA.classify(n, h, s, nat); r.red = r.red.filter((x) => !/跟清單不符/.test(x.why)); return r };
  let b = CA.canaryChecks(need, (f) => pack.has(f), sha, native, none); assert.equal(b.home, false); assert.equal(b.stale, false, "判斷一律放行：兩隻都報警");
  b = CA.canaryChecks(need, (f) => pack.has(f), sha, native, noHome); assert.equal(b.home, false, "拿掉首頁素材的檢查：①報警"); assert.equal(b.stale, true);
  b = CA.canaryChecks(need, (f) => pack.has(f), sha, native, noHash); assert.equal(b.home, true); assert.equal(b.stale, false, "拿掉雜湊比對：②報警");
});

test("P0-IMG 結束代碼：沒有 ✘ 但金絲雀沒抓到＝4（優先於缺驗 3）；有 ✘ 回 1（本來就不能送審）；舊的呼叫（沒給 canaryOk）照舊", () => {
  assert.equal(CA.exitCode({ red: 0, unknown: 0, cdn: true, canaryOk: false }), 4, "看起來全過、其實失靈");
  assert.equal(CA.exitCode({ red: 0, unknown: 2, cdn: true, canaryOk: false }), 4, "失靈優先於缺驗");
  assert.equal(CA.exitCode({ red: 3, unknown: 2, cdn: true, canaryOk: false }), 1, "有 ✘ 本來就擋");
  assert.equal(CA.exitCode({ red: 1, unknown: 0, cdn: true, canaryOk: true }), 1);
  assert.equal(CA.exitCode({ red: 0, unknown: 1, cdn: true }), 3);
  assert.equal(CA.exitCode({ red: 0, unknown: 0, cdn: true }), 0);
});

test("P0-UPD 金絲雀：假視窗要被數到、而且真的 verdict 要因此判出「更新提示視窗」；數到了但 verdict 沒判出也不算", () => {
  const row = { build: V, raw: "kept", setting: "kept", regs: 0, controller: false, oldKeys: [], webUpdate: false, notify: "undefined", dialogs: 1, manual: "由 Google Play 更新" };
  const bad = verdict(row, V);
  assert.ok(bad.some((b) => /更新提示視窗/.test(b)), "真的 verdict 對 dialogs＝1 要判出更新提示視窗");
  assert.equal(canaryVerdict(1, bad).dialog, true);
  assert.equal(canaryVerdict(0, bad).dialog, false, "沒數到");
  assert.equal(canaryVerdict(1, []).dialog, false, "verdict 沒判出（判斷被改鬆）");
  assert.deepEqual(verdict({ ...row, dialogs: 0 }, V), [], "沒有視窗的正常狀態不擋（金絲雀不是靠一律判失敗）");
});

test("〔原始碼〕三支工具的報告都寫 toolPins；P0-IMG、P0-UPD 寫 canary，P0-3D 寫 selfTest；P0-UPD 金絲雀沒抓到就不算通過", () => {
  const caa = rd("check-aab-assets.js"), up = rd("check-upgrade.js"), c3d = rd("check-3d.js");
  /* PR #66 審查：工具雜湊在啟動時就算（記的是實際載入、跑這一次的那一份），不是跑完才算 */
  for (const [src, tool] of [[caa, "P0-IMG"], [up, "P0-UPD"], [c3d, "P0-3D"]]) assert.match(src, new RegExp('^const TOOL_PINS = require\\("\\./tool-pin\\.js"\\)\\.pinsFor\\("' + tool + '"\\);', "m"), tool + " 啟動就算");
  assert.match(caa, /pass: CDN_CHECK && code === 0 && canary\.ok, canary, toolPins: TOOL_PINS,/);
  assert.match(caa, /canaryOk: canaryExitOk\(canary, CDN_CHECK\)/, "審查②：沒加 --cdn 也要看金絲雀①②");
  assert.match(caa, /const queue = \[\.\.\.viaCdn, \[probeF, false\]\];/, "審查③：金絲雀檔排進正式 worker 的同一個佇列");
  assert.match(up, /R\.toolPins = TOOL_PINS;/);
  assert.match(up, /R\.pass = !bad\.length && R\.canary\.dialog === true/);
  assert.match(c3d, /selfTest: !!O\.selfTest, toolPins: TOOL_PINS \};/);
  assert.match(c3d, /S\.pass = selfTestOk\(a, b\);/, "審查④：自我反測用 selfTestOk 判");
});

test("P0-3D 金絲雀（PR #66 審查④）：遮罩那次要真的點到落點、而且是被遮罩接走才算抓到；放遮罩之前就失敗不算", () => {
  const { selfTestOk } = require(path.join(AND, "check-3d.js"));
  const a = { pass: true }, hitMask = { pass: false, moved: false, startTap: { x: 1, y: 1 }, targetTap: { x: 2, y: 2 }, targetHit: { id: "xq3dInject", tag: "DIV" } };
  assert.equal(selfTestOk(a, hitMask), true);
  /* PR #66 第二次複審的反例：別的落點被蓋住（pass＝false），遮罩沒擋住、棋也走成了（moved＝true）——不能算抓到 */
  assert.equal(selfTestOk(a, { ...hitMask, moved: true, covered: [{ t: 3, by: "BUTTON" }] }), false, "棋走成了就不算抓到");
  assert.equal(selfTestOk(a, { ...hitMask, moved: undefined }), false, "沒記 moved 也不算");
  assert.equal(selfTestOk(a, { pass: false, error: "鏡頭 10 秒內沒停穩" }), false, "放遮罩之前就失敗");
  assert.equal(selfTestOk(a, { pass: false, startTap: { x: 1, y: 1 }, misses: [1] }), false, "起點沒選中");
  assert.equal(selfTestOk(a, { ...hitMask, targetHit: { id: "", tag: "BUTTON" } }), false, "落點被別的東西蓋住，不是遮罩");
  assert.equal(selfTestOk(a, { ...hitMask, pass: true }), false, "遮罩那次竟然過了");
  assert.equal(selfTestOk({ pass: false }, hitMask), false, "正常那次沒過");
});

test("P0-IMG 金絲雀③與結束代碼（PR #66 審查②③）：③看正式 worker 的判斷；沒加 --cdn 時①②沒抓到照樣回 4", () => {
  const P = "data/__xq_p0_canary_x.webp";
  assert.deepEqual(CA.cdnCanary(P, [{ f: P }], []), { cdn404: true, cdnUnreachable: false, cdn: "判成沒有" });
  assert.equal(CA.cdnCanary(P, [], [{ f: P, st: -1 }]).cdn404, false); assert.equal(CA.cdnCanary(P, [], [{ f: P, st: -1 }]).cdnUnreachable, true, "沒有反證：真的連不上");
  /* PR #66 第四次複審：同一輪有檔拿到 200、或 manifest 讀得到＝CDN 連得上，探測檔卻記成 -1／429／503 → 失靈 */
  for (const ev of [{ ok200: 1 }, { manOk: true }]) for (const st of [-1, 429, 503]) {
    const c = CA.cdnCanary(P, [], [{ f: P, st }], ev); assert.equal(c.cdnUnreachable, false, JSON.stringify({ st, ev })); assert.match(c.cdn, /同一輪 CDN 連得上.*失靈/);
    assert.equal(CA.canaryExitOk({ home: true, stale: true, ...c }, true), false, "＝結束代碼 4");
  }
  assert.match(CA.cdnCanary(P, [], [{ f: P, st: 403 }]).cdn, /403（拒絕存取）.*失靈/);
  for (const st of [429, 503]) { const c = CA.cdnCanary(P, [], [{ f: P, st }]); assert.match(c.cdn, /連不上或暫時出錯/, "限流、伺服器錯誤歸缺驗：" + st); assert.equal(c.cdnUnreachable, true) }
  /* PR #66 第三次複審：worker 被改壞、把 404 放進 unknown，不能被歸成「連不上」 */
  for (const u of [{ f: P, st: 404 }, { f: P, st: 410 }, { f: P }]) {
    const c = CA.cdnCanary(P, [], [u]); assert.doesNotMatch(c.cdn, /連不上/, JSON.stringify(u)); assert.match(c.cdn, /失靈/);
    assert.equal(CA.canaryExitOk({ home: true, stale: true, ...c }, true), false, "失靈＝結束代碼 4：" + JSON.stringify(u));
  }
  assert.match(CA.cdnCanary(P, [], []).cdn, /被當成有/, "worker 把不存在的檔當成有＝失靈");
  assert.equal(CA.canaryExitOk({ home: false, stale: true }, false), false, "沒加 --cdn：①沒抓到也要回 4");
  assert.equal(CA.canaryExitOk({ home: true, stale: false }, false), false);
  assert.equal(CA.canaryExitOk({ home: true, stale: true }, false), true);
  assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: false, cdn: "被當成有（CDN 核對失靈）" }, true), false, "③被當成有＝4");
  assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: false, cdnUnreachable: true, cdn: "沒確認到（CDN 連不上）" }, true), true, "CDN 連不上歸缺驗 3，不是 4");
  assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: false, cdn: "沒確認到（CDN 連不上）" }, true), false, "只有文字、沒有布林：不算連不上");
  assert.equal(CA.exitCode({ red: 0, unknown: 0, cdn: false, canaryOk: CA.canaryExitOk({ home: false, stale: true }, false) }), 4);
});

test("閘門（PR #66 審查建議）：同一個 Android 版本，3D 金絲雀和正式報告要測同一個 APK", () => {
  const L = all(); L[4].json.apkSha256 = "d".repeat(64);
  assert.ok(has(G(L), /P0-3D 金絲雀（Android 12）：測的 APK.*跟正式報告.*不是同一個/));
  assert.equal(G(all()).ok, true);
});

test("〔混合〕PR #66 複審：單獨的 CR 會改變程式意義，雜湊要不同；pinsFor 不接受指定資料夾；金絲雀①②要因為對的那條原因判出", () => {
  const CR = String.fromCharCode(13), LF = String.fromCharCode(10);
  assert.equal(TP.normSha("a" + CR + LF + "b"), TP.normSha("a" + LF + "b"), "CRLF 跟 LF 一樣");
  assert.notEqual(TP.normSha("return" + CR + " red ? 1 : 0"), TP.normSha("return red ? 1 : 0"), "單獨的 CR 保留：雜湊要不同");
  assert.match(rd("tool-pin.js"), /\nfunction pinsFor\(tool\) \{/, "pinsFor 只收工具名稱，不能指到別的資料夾（有預設值的參數不算進 length，所以比對原始碼）");
  assert.match(rd("tool-pin.js"), /readFileSync\(path\.join\(__dirname, f\)\)/);
  /* 首頁檢查壞掉、但媒體那條把同一個首頁檔判成「直接破」：金絲雀①不能算抓到 */
  const need = new Map([["data/a.webp", { size: 10, h: "aaaaaaaa" }]]);
  const pack = new Set(["data/a.webp", ...HOME_REQUIRED.map((x) => "data/" + x)]);
  const sha = (f) => (f === "data/a.webp" ? "aaaaaaaa" : "x"), native = { cdnFallback: false, partsJoin: true };
  const wrongReason = (n, h, s, nat) => { const r = CA.classify(n, h, s, nat); r.red = r.red.map((x) => /首頁離線必要素材/.test(x.why) ? { ...x, why: "不在安裝包裡，原生又不會向 CDN 補抓：圖片／音樂直接破（W21）" } : x); return r };
  assert.equal(CA.canaryChecks(need, (f) => pack.has(f), sha, native, wrongReason).home, false);
  const wrongStale = (n, h, s, nat) => { const r = CA.classify(n, h, s, nat); r.red = r.red.map((x) => /跟清單不符/.test(x.why) ? { ...x, why: "別的原因" } : x); return r };
  assert.equal(CA.canaryChecks(need, (f) => pack.has(f), sha, native, wrongStale).stale, false);
});

test("〔原始碼〕P0-IMG 金絲雀③（PR #66 第四次複審）：worker 要數拿到 200 的項數，連同 manifest 讀得到沒，一起交給 cdnCanary 當反證", () => {
  const caa = rd("check-aab-assets.js");
  assert.match(caa, /\n\s+if \(st === 200\) ok200\+\+;\n/);
  assert.match(caa, /cdnCanary\(cdnRun\.probeF, cdnRun\.miss, cdnRun\.unknown, \{ ok200: cdnRun\.ok200, manOk: !!\(man && man\.files\) \}\)/);
});

test("閘門自己探測 CDN（PR #66 第五次複審，開發者選）：CDN 正常＝連得上；真斷線＝連不上；manifest 空的不算連得上；亂數檔 HEAD 回 404 也算連得上", async () => {
  const { probeCdn } = require(path.join(AND, "p0-gate.js"));
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  /* PR #66 第七次複審：假 fetch 要看網址。manifest 只認 <base>cdn-manifest.json、HEAD 只認 <base>data/__xq_gate_probe_<亂數>.webp；路徑不對時 manifest 回 404、HEAD 回 200（存在的檔），測試就會紅 */
  const fake = (man, head) => async (url, o) => {
    if (o && o.method === "HEAD") { if (url !== "https://cdn/data/__xq_gate_probe_r.webp") return res(200); if (head === "throw") throw new Error("斷線"); return res(head) }
    if (url !== "https://cdn/cdn-manifest.json") return res(404, null);
    if (man === "throw") throw new Error("斷線"); return man };
  const ok = await probeCdn(fake(res(200, { files: { "data/a.webp": [1, "x"] } }), 404), "https://cdn/", () => "r");
  assert.equal(ok.reachable, true, "正常 CDN"); assert.equal(ok.manOk, true); assert.equal(ok.head, 404);
  const down = await probeCdn(fake("throw", "throw"), "https://cdn/", () => "r");
  assert.equal(down.reachable, false, "真斷線"); assert.match(down.detail, /連不上/);
  const empty = await probeCdn(fake(res(200, { files: {} }), "throw"), "https://cdn/", () => "r");
  assert.equal(empty.reachable, false, "manifest 空的、HEAD 也連不上：不能算連得上"); assert.match(empty.detail, /空的/);
  const nullFiles = await probeCdn(fake(res(200, { files: null }), 503), "https://cdn/", () => "r");
  assert.equal(nullFiles.reachable, false, "files 是 null、HEAD 503：不算連得上");
  const badJson = await probeCdn(fake({ ok: true, status: 200, json: async () => { throw new SyntaxError("x") } }, "throw"), "https://cdn/", () => "r");
  assert.equal(badJson.reachable, false); assert.match(badJson.detail, /不是合法的 JSON/, "第八次複審：manifest 壞掉不能寫成連不上");
  const headOnly = await probeCdn(fake(res(500, null), 404), "https://cdn/", () => "r");
  assert.equal(headOnly.reachable, true, "manifest 壞了但亂數檔回 404：CDN 有在回應");
  /* 閘門把探測結果用在豁免上：連得上＝不准豁免；連不上才准 */
  const L = miss(all()); L[0].json.canary = { ...L[0].json.canary, cdn404: false, cdnUnreachable: true, cdn: "沒確認到（CDN 連不上或暫時出錯，沒拿到 HTTP 狀態）" };
  assert.equal(G(L, W("P0-IMG/cdn"), MAIN, ok).ok, false);
  assert.equal(G(L, W("P0-IMG/cdn"), MAIN, down).ok, true);
  assert.equal(G(L, W("P0-IMG/cdn"), MAIN, empty).ok, true, "閘門也只看到空的 manifest、連不上：照樣准豁免（缺驗）");
});

test("閘門（PR #66 第六次複審）：「要加 --cdn 且結束代碼 0」那條的豁免，同樣要閘門自己也連不上 CDN；結束代碼 3＋金絲雀③抓到＋閘門連得上 → 不能豁免", () => {
  const L = miss(all());
  assert.equal(G(L, W("P0-IMG/cdn")).ok, false, "閘門沒探測：不能豁免");
  const r = G(L, W("P0-IMG/cdn"), MAIN, UP); assert.equal(r.ok, false, "閘門連得上：不能豁免（可能是工具的 manifest 讀取壞了）"); assert.ok(has(r, /閘門自己連得上 CDN.*不能豁免/));
  assert.equal(G(L, W("P0-IMG/cdn"), MAIN, DOWN).ok, true, "閘門也連不上：才可以豁免");
  const M = all(); M[0].json.cdnChecked = false; assert.equal(G(M, W("P0-IMG/cdn"), MAIN, DOWN).ok, false, "沒加 --cdn 不管閘門怎樣都不能豁免");
});

test("閘門（PR #66 第七次複審）：只有單純缺驗（結束代碼 3、redItems 是空陣列）才能豁免；結束代碼 1、4，或有 ✘、或沒記 redItems，閘門連不上也不行", () => {
  for (const [code, red] of [[1, []], [4, []], [3, [{ f: "data/x.webp", why: "不在安裝包裡" }]], [3, undefined]]) {
    const N = miss(all()); N[0].json.exitCode = code; N[0].json.redItems = red;
    const r = G(N, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, false, JSON.stringify({ code, red })); assert.ok(has(r, /不是單純缺驗/), JSON.stringify({ code, red }));
  }
  const ok = miss(all()); assert.equal(G(ok, W("P0-IMG/cdn"), MAIN, DOWN).ok, true, "單純缺驗＋閘門連不上：照樣可以豁免");
});

test("閘門（PR #66 第八次複審）：單純缺驗還要 red＝0、unknown＞0、pass＝false、加了 --cdn；金絲雀③的豁免也要單純缺驗", () => {
  for (const [why, o] of [["red 5", { red: 5 }], ["unknown 0", { unknown: 0 }], ["沒記 unknown", { unknown: undefined }], ["pass true", { pass: true }], ["沒記 red", { red: undefined }]]) {
    const N = miss(all()); Object.assign(N[0].json, o);
    const r = G(N, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, false, why); assert.ok(has(r, /不是單純缺驗/), why);
  }
  /* cdnChecked＝false：結束代碼 3、沒有 ✘ 也不行（拿掉 cdnChecked 條件這項就會紅） */
  const C = miss(all()); C[0].json.cdnChecked = false; assert.equal(G(C, W("P0-IMG/cdn"), MAIN, DOWN).ok, false, "沒加 --cdn 的單純缺驗也不能豁免");
  /* 金絲雀③：報告結束代碼 0、通過，卻說探測檔連不上＝前後矛盾（正確的工具做不出來），閘門連不上也不能豁免 */
  const K = all(); K[0].json.canary = { home: true, stale: true, cdn404: false, cdnUnreachable: true, cdn: "沒確認到（CDN 連不上）" };
  const r = G(K, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, false, "exit 0＋金絲雀③連不上：不能豁免"); assert.ok(has(r, /報告跟「CDN 連不上」對不起來/));
});

test("閘門（PR #66 第九次複審）：工具同一輪拿到過 CDN 的 404（cdn404＝true）、或沒說連不上、或 unknown 不是整數，閘門這邊離線也不能豁免", () => {
  for (const [why, c, o] of [["工具拿到 404（CDN 連得上，例如限流）", { cdn404: true, cdnUnreachable: false }, {}],
    ["矛盾：拿到 404 又說連不上", { cdn404: true, cdnUnreachable: true }, {}],
    ["沒說連不上", { cdn404: false, cdnUnreachable: undefined }, {}], ["沒有金絲雀", null, {}],
    ["unknown 1.5", {}, { unknown: 1.5 }], ["unknown 是字串", {}, { unknown: "2" }]]) {
    const N = miss(all()); Object.assign(N[0].json, o); if (c === null) delete N[0].json.canary; else N[0].json.canary = { ...N[0].json.canary, ...c };
    const r = G(N, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, false, why); assert.equal(r.waived.length, 0, why);
  }
  const ok = miss(all()); const r = G(ok, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, true, "CDN 全斷的真報告照樣能豁免"); assert.equal(r.waived.length, 2);
});

test("閘門探測（PR #66 第九次複審）：manifest 正常就算連得上，亂數檔 HEAD 斷線、500 也一樣", async () => {
  const { probeCdn } = require(path.join(AND, "p0-gate.js"));
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const man = res(200, { files: { "data/a.webp": [1, "x"] } });
  for (const h of ["throw", 500, 403, 200]) {
    const f = async (url, o) => { if (o && o.method === "HEAD") { if (h === "throw") throw new Error("斷線"); return res(h) } return url === "https://cdn/cdn-manifest.json" ? man : res(404, null) };
    const p = await probeCdn(f, "https://cdn/", () => "r"); assert.equal(p.reachable, true, String(h)); assert.equal(p.manOk, true);
  }
});

test("閘門（PR #66 第十次複審）：從逐項清單重算；混一筆 404、200、比對過 CDN、探測狀態不是連不上、筆數對不起來，閘門連不上也不能豁免", () => {
  const { onlyCdnDown } = require(path.join(AND, "p0-gate.js"));
  assert.equal(onlyCdnDown(miss(all())[0].json), null, "正確工具在 CDN 全斷時的報告");
  const add = (j, it) => { j.warnItems.push(it); j.warn = j.warnItems.length; if ("st" in it) { j.unknown++; j.viaCdn++; j.need++ } };   /* 像真的報告：多一個沒確認到的補抓檔 */
  for (const [why, f, re] of [
    ["混一筆 404（真的缺檔）", (j) => add(j, { f: "data/x.webp", st: 404 }), /不是「連不上」/], ["混一筆 200", (j) => add(j, { f: "data/x.webp", st: 200 }), /不是「連不上」/],
    ["狀態是字串", (j) => add(j, { f: "data/x.webp", st: "-1" }), /不是「連不上」/], ["狀態 600", (j) => add(j, { f: "data/x.webp", st: 600 }), /不是「連不上」/], ["狀態 403（第十一次）", (j) => add(j, { f: "data/x.webp", st: 403 }), /不是「連不上」/],
    ["viaCdn 多記（第十一次：拿到 200 的漏算）", (j) => { j.viaCdn++; j.need++ }, /補抓的檔數/], ["viaCdn 不是整數", (j) => { j.viaCdn = 1.5 }, /補抓的檔數/],
    ["need 對不起來", (j) => { j.need++ }, /need/], ["沒記 inPack", (j) => { delete j.inPack }, /need/],
    ["多一筆 W21 提醒（第十二次）", (j) => { j.warnItems.push({ f: "data/c.webp", why: "不在安裝包裡、原生不會補抓" }); j.warn++ }, /CDN 以外的提醒/],
    ["原生不會補抓（第十二次）", (j) => { j.native.cdnFallback = false }, /原生不會向 CDN 補抓/], ["沒記 native（第十二次）", (j) => { delete j.native }, /原生不會向 CDN 補抓/],
    ["比對過 CDN", (j) => { j.cdnCompared = 1 }, /比對過/], ["探測狀態 200", (j) => { j.canary.cdnStatus = 200 }, /探測狀態/], ["金絲雀全過", (j) => { j.canary.ok = true }, /探測狀態/],
    ["unknown 少算", (j) => { j.unknown-- }, /unknown/], ["unknown 多算", (j) => { j.unknown++ }, /unknown/], ["warn 對不起來", (j) => { j.warn++ }, /warn/],
    ["沒有 manifest 那筆", (j) => { j.warnItems = j.warnItems.filter((w) => w.f !== "cdn-manifest.json"); j.warn = j.warnItems.length; j.unknown-- }, /cdn-manifest/],
    ["兩筆 manifest", (j) => add(j, { f: "cdn-manifest.json", why: "x" }), /cdn-manifest/], ["沒有逐項清單", (j) => { delete j.warnItems }, /逐項清單/],
    ["只有 manifest 那筆", (j) => { j.warnItems = j.warnItems.filter((w) => !("st" in w)); j.warn = j.warnItems.length; j.unknown = 1 }, /少於 2/]]) {
    const N = miss(all()); f(N[0].json);
    assert.match(String(onlyCdnDown(N[0].json)), re, why);
    const r = G(N, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, false, why); assert.equal(r.waived.length, 0, why);
  }
  for (const st of [429, 500, 503]) { const N = miss(all()); add(N[0].json, { f: "data/y.webp", st }); assert.equal(G(N, W("P0-IMG/cdn"), MAIN, DOWN).ok, true, "暫時出錯 " + st + " 照樣算 CDN 的問題") }
});

test("閘門探測（PR #66 第十次複審）：manifest 的 files 不是空的就算連得上（不限 data/ 開頭）；files 是陣列不算", async () => {
  const { probeCdn } = require(path.join(AND, "p0-gate.js"));
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const f = (man) => async (url, o) => (o && o.method === "HEAD" ? res(403) : url === "https://cdn/cdn-manifest.json" ? res(200, man) : res(404, null));
  assert.equal((await probeCdn(f({ files: { "img/a.webp": [1, "x"] } }), "https://cdn/", () => "r")).reachable, true, "只有別的鍵＋HEAD 403：連得上");
  assert.equal((await probeCdn(f({ files: ["data/a.webp"] }), "https://cdn/", () => "r")).reachable, false, "files 是陣列：不算");
});

test("閘門探測（開發者 11/23 選「維持現狀」）：manifest 不能用時，亂數檔 HEAD 只有 404／410 算連得上；200、301、403、500 都算連不上", async () => {
  const { probeCdn } = require(path.join(AND, "p0-gate.js"));
  const res = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const f = (st) => async (url, o) => (o && o.method === "HEAD" ? res(st) : res(500, null));
  for (const st of [404, 410]) assert.equal((await probeCdn(f(st), "https://cdn/", () => "r")).reachable, true, String(st));
  for (const st of [200, 204, 301, 403, 500, 503]) assert.equal((await probeCdn(f(st), "https://cdn/", () => "r")).reachable, false, String(st));
});

test("〔原始碼〕閘門：自己用的 CDN 網址跟破圖工具一樣；報告結束代碼不是 0、或說連不上時就探測；探測有逾時、有時間", () => {
  const pg = rd("p0-gate.js"), caa = rd("check-aab-assets.js");
  const g = /const GATE_CDN = "([^"]+)";/.exec(pg), c = /\nconst CDN = "([^"]+)";/.exec(caa);
  assert.ok(g && c); assert.equal(g[1], c[1], "閘門與工具的 CDN 網址要相同");
  assert.match(pg, /async function main\(\) \{\n  process\.exitCode = 2;/, "PR #66 第八次複審：main 一開始就把結束代碼設成 2，探測卡住提早結束時不會變成 0");
  assert.match(pg, /json\.tool === "P0-IMG" && \(json\.exitCode !== 0 \|\| \(json\.canary && json\.canary\.cdnUnreachable === true\)\)\)\) \{ cdnProbe = await probeCdn\(\);/);
  assert.match(pg, /AbortSignal\.timeout\(15000\)/); assert.match(pg, /at: new Date\(\)\.toISOString\(\)/);
});

/* PR #66 第十一次複審：「正確的工具在 CDN 全斷時能豁免」要端對端驗，不能只靠手組的 miss()。
   做一個假 AAB（首頁素材在、一個小檔和一個大檔不在包裡、原生會向 CDN 補抓），子程序先載入一律斷線的假 fetch，
   跑真的 check-aab-assets.js --cdn，寫出的報告直接丟進閘門 */
function zipOf(files) {
  const zlib = require("zlib"), locals = [], central = []; let off = 0;
  for (const [n, v] of Object.entries(files)) {
    const data = Buffer.from(v), name = Buffer.from(n, "utf8"), crc = zlib.crc32(data) >>> 0;
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, name, data); central.push(ch, name); off += 30 + name.length + data.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
  return Buffer.concat([...locals, cd, end]);
}
test("閘門（PR #66 第十一次複審，端對端）：真的 check-aab-assets.js 在 CDN 全斷下寫的報告，閘門連不上就能豁免；同一份報告 viaCdn 多記、或混一筆 403，就不能", { timeout: 120000 }, () => {
  const os = require("os"), cp = require("child_process"), crypto = require("crypto");
  const sha8 = (x) => crypto.createHash("sha1").update(x).digest("hex").slice(0, 8), P = "base/assets/public/";
  const preload = { v: "t", items: [["data/a/x.webp", 3, sha8("abc"), 1], ["data/a/y.json", 2, sha8("{}"), 1]], big: [["data/gm.json", 30 * 1024 * 1024, sha8("[]")]], pages: {} };
  const f = { [P + "native-build.json"]: JSON.stringify({ siteVersion: V, sharedWebCommit: "0".repeat(40) }), [P + "data/preload.json"]: JSON.stringify(preload),
    [P + "data/big-books.json"]: "[]", "base/dex/classes.dex": "dex\n035\0" + ["X-XQ-Cdn-Cache", ".parts.json", "[A-Za-z0-9._-]+", "SHA-1"].join("\0") + "\0", [P + "data/a/x.webp"]: "abc" };
  for (const h of HOME_REQUIRED) f[P + "data/" + h] = "w";
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-e2e66-")), aab = path.join(d, "t.aab"), out = path.join(d, "img.json"), down = path.join(d, "down.js");
  try {
    fs.writeFileSync(aab, zipOf(f));
    fs.writeFileSync(down, "globalThis.fetch = async () => { throw new Error(\"假：CDN 全斷\") };\n");
    const r = cp.spawnSync(process.execPath, ["--require", down, path.join(AND, "check-aab-assets.js"), "--aab", aab, "--cdn", "--out", out], { encoding: "utf8", timeout: 100000 });
    assert.equal(r.status, 3, "CDN 全斷＝缺驗 3：" + (r.stderr || "").slice(0, 300));
    const real = JSON.parse(fs.readFileSync(out, "utf8"));
    assert.equal(real.viaCdn, 2, "假包裡有兩個檔要向 CDN 補抓"); assert.equal(real.canary.cdnUnreachable, true);
    const { onlyCdnDown } = require(path.join(AND, "p0-gate.js"));
    assert.equal(onlyCdnDown(real), null, "真工具的全斷報告要算「單純 CDN 連不上」");
    const put = (j) => { const L = all(); L[0].json = { ...j, aabSha256: A, siteVersion: V }; return L };
    const ok = G(put(real), W("P0-IMG/cdn"), MAIN, DOWN);
    assert.equal(ok.ok, true, "閘門也連不上：可以豁免：" + JSON.stringify(ok.problems || ok).slice(0, 300)); assert.equal(ok.waived.length, 2);
    assert.equal(G(put(real), W("P0-IMG/cdn"), MAIN, UP).ok, false, "閘門連得上：不能豁免");
    const more = JSON.parse(JSON.stringify(real)); more.viaCdn++; more.need++;
    assert.equal(G(put(more), W("P0-IMG/cdn"), MAIN, DOWN).ok, false, "viaCdn 多記一個（拿到 200 的被漏算）：不能豁免");
    const f403 = JSON.parse(JSON.stringify(real)); f403.warnItems.find((w) => "st" in w).st = 403;
    assert.equal(G(put(f403), W("P0-IMG/cdn"), MAIN, DOWN).ok, false, "混一筆 403：不能豁免");
    const noFb = JSON.parse(JSON.stringify(real)); noFb.native.cdnFallback = false;
    assert.equal(G(put(noFb), W("P0-IMG/cdn"), MAIN, DOWN).ok, false, "第十二次：原生不會補抓：不能豁免");
    const w21 = JSON.parse(JSON.stringify(real)); w21.warnItems.push({ f: "data/c.webp", why: "不在安裝包裡、原生不會補抓" }); w21.warn++;
    assert.equal(G(put(w21), W("P0-IMG/cdn"), MAIN, DOWN).ok, false, "第十二次：多一筆不帶狀態的 W21 提醒：不能豁免");
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});
