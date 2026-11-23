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
const G = (reps, w = [], mainSha = MAIN) => gate(A, V, reps, w, { mainSha });
const d3 = (android, o = {}) => ({ file: "3d-" + android, json: Object.assign({ tool: "P0-3D", aabSha256: A, apkSha256: K, apkBound: true, pass: true, build: V, android, full: true, rounds: 2, roundsPassed: 2, knownFile: { fromRepo: true }, toolPins: TP.pinsFor("P0-3D") }, o) });
const c3 = (android, o = {}) => ({ file: "3dc-" + android, json: Object.assign({ tool: "P0-3D", selfTest: true, aabSha256: A, apkSha256: K, apkBound: true, pass: true, build: V, android, full: false, toolPins: TP.pinsFor("P0-3D") }, o) });
const img = (o = {}) => ({ file: "img", json: Object.assign({ tool: "P0-IMG", aabSha256: A, pass: true, cdnChecked: true, exitCode: 0, siteVersion: V, canary: { home: true, stale: true, cdn404: true, ok: true }, toolPins: TP.pinsFor("P0-IMG") }, o) });
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
  L = all(); L[0].json.canary = { home: true, stale: true, cdn404: false, cdn: "沒確認到（CDN 連不上）" };
  assert.ok(has(G(L), /CDN 不存在的檔沒被判成沒有（沒確認到（CDN 連不上））/));
  r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, true, "CDN 連不上那一條照舊可以豁免"); assert.equal(r.waived.length, 1);
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
  assert.deepEqual(CA.cdnCanary(P, [{ f: P }], []), { cdn404: true, cdn: "判成沒有" });
  assert.equal(CA.cdnCanary(P, [], [{ f: P, st: -1 }]).cdn404, false); assert.match(CA.cdnCanary(P, [], [{ f: P, st: -1 }]).cdn, /連不上/);
  for (const st of [429, 503]) assert.match(CA.cdnCanary(P, [], [{ f: P, st }]).cdn, /連不上或暫時出錯/, "限流、伺服器錯誤歸缺驗：" + st);
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
  assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: false, cdn: "沒確認到（CDN 連不上）" }, true), true, "CDN 連不上歸缺驗 3，不是 4");
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
