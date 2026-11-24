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
/* #102：閘門自己重算產物比對的結果（合格的樣子：沒有紅、沒有沒確認的黃、金絲雀都抓到）；舊版雜湊跟報告記的一樣 */
/* #102 第三輪複審：重算結果一定帶兩包的雜湊與 manifest 裡實際的 versionCode（從檔案重算時 recomputeFromFiles 會填），跟假報告 ad() 一致 */
const OLDSHA = "d".repeat(64), OKRE = { red: [], yellow: [], acked: [], allowed: 0, canaryOk: true, newSha256: "a".repeat(64), oldSha256: OLDSHA, oldCode: 26112104, newCode: 26112401, canary: { ok: true, home: { ok: true }, zeroJs: { ok: true }, jks: { ok: true }, yellow: { ok: true } }, changed: 99 };
const FILE = (re, old = OLDSHA) => re && Object.assign({ newSha256: "a".repeat(64), oldSha256: old, oldCode: 26112104, newCode: 26112401, changed: 99 }, re);
const G = (reps, w = [], mainSha = MAIN, cdnProbe = null, diffRe = OKRE) => gate(A, V, reps, w, { mainSha, cdnProbe, diffRe, oldSha: OLDSHA });
const DOWN = { reachable: false, detail: "假：閘門也連不上" }, UP = { reachable: true, detail: "假：閘門連得上" };
const d3 = (android, o = {}) => ({ file: "3d-" + android, json: Object.assign({ tool: "P0-3D", aabSha256: A, apkSha256: K, apkBound: true, pass: true, build: V, android, full: true, rounds: 2, roundsPassed: 2, knownFile: { fromRepo: true }, toolPins: TP.pinsFor("P0-3D") }, o) });
const c3 = (android, o = {}) => ({ file: "3dc-" + android, json: Object.assign({ tool: "P0-3D", selfTest: true, aabSha256: A, apkSha256: K, apkBound: true, pass: true, build: V, android, full: false, toolPins: TP.pinsFor("P0-3D") }, o) });
const img = (o = {}) => ({ file: "img", json: Object.assign({ tool: "P0-IMG", aabSha256: A, pass: true, cdnChecked: true, exitCode: 0, siteVersion: V, red: 0, unknown: 0, redItems: [], canary: { home: true, stale: true, cdn404: true, ok: true, deep: { w21: { ok: true }, w30: { ok: true }, home: { ok: true }, hash: { ok: true }, w42: { ok: true } } }, toolPins: TP.pinsFor("P0-IMG") }, o) });
/* 正確的工具在「CDN 沒驗到」時寫出的報告：結束代碼 3、沒通過、沒有 ✘、有沒驗到的項目（PR #66 第八次複審） */
/* 第九次複審：金絲雀③也要是 CDN 全斷時的樣子（探測檔沒拿到 404、工具說連不上） */
/* 第十次複審：照正確的工具在 CDN 全斷時寫的逐項清單（探測檔也在缺驗清單裡）；金絲雀③那塊用工具裡真的 cdnCanary 產生，不自己捏欄位 */
const PROBE_F = "data/__xq_p0_canary_0123456789ab.webp";   /* 跟工具產生的格式一樣（12 個十六進位字元） */
const downItems = () => [{ f: "data/a.webp", st: -1, why: "CDN 沒確認到（連不上，請稍後重跑 --cdn）" }, { f: PROBE_F, st: -1, why: "CDN 沒確認到（連不上，請稍後重跑 --cdn）" }];
const miss = (L) => {
  const { cdnCanary } = require(path.join(AND, "check-aab-assets.js")), unk = downItems();
  const warnItems = [...unk, { f: "cdn-manifest.json", why: CA.MAN_MISS_WHY }];   /* 第十二次：不帶狀態的只有 manifest 那筆；第十五次：原因照工具常數 */
  Object.assign(L[0].json, { exitCode: 3, pass: false, red: 0, unknown: unk.length + 1, redItems: [], warn: warnItems.length, warnItems, cdnCompared: 0, viaCdn: unk.length - 1, inPack: 5, need: 5 + unk.length - 1, native: { cdnFallback: true, partsJoin: true, assetPacks: [] } });   /* 第十一次：viaCdn＝要向 CDN 補抓的檔（探測檔不算），need＝包裡＋補抓 */
  const c = { ...L[0].json.canary, ...cdnCanary(PROBE_F, [], unk, { ok200: 0, manOk: false }) }; c.ok = c.home === true && c.stale === true && c.cdn404 === true;
  c.homeFile = "data/homemap/home_classic.webp"; c.staleFile = "data/a/x.webp";   /* 第十五次：金絲雀①②真的弄壞過包裡的檔 */
  c.deep = { ...c.deep, w42: { ok: false, skip: "沒有 CDN manifest" } };   /* PR②：manifest 讀不到時，深層的 W42 做不出來、標沒驗 */
  L[0].json.canary = c; return L };
const upd = (o = {}) => ({ file: "upd", json: Object.assign({ tool: "P0-UPD", aabSha256: A, apkSha256: K, apkBound: true, pass: true, oldWorker: true, new: { build: V }, canary: { dialog: true }, toolPins: TP.pinsFor("P0-UPD") }, o) });
/* W91（11/24）：產物比對報告（aab-diff.js --strict --old-code --json），合格的樣子 */
const ad = (sha = A, o = {}) => ({ file: "aab-diff.json", json: Object.assign({ tool: "AAB-DIFF", strict: true, newSha256: sha, oldSha256: "d".repeat(64), oldCode: "26112104", newCode: "26112401", red: [], yellow: [], acked: [], allowed: [], exitCode: 0, pass: true, args: {}, canary: { home: { ok: true }, zeroJs: { ok: true }, jks: { ok: true }, yellow: { ok: true }, ok: true }, toolPins: TP.pinsFor("AAB-DIFF") }, o) });
const all = () => [img(), upd(), d3("12"), d3("16"), c3("12"), c3("16"), ad()];
const has = (r, re) => r.problems.some((p) => re.test(p));
const W = (code) => [{ code, aabSha256: A, reason: "測試用豁免", decidedBy: "開發者", decidedAt: "2026-11-23" }];

test("〔原始碼〕工具鎖定：清單跟三支工具實際 require 的共用模組一致（工具改了 require 而清單沒跟上，這項會紅）", () => {
  for (const [tool, file] of [["P0-IMG", "check-aab-assets.js"], ["P0-UPD", "check-upgrade.js"], ["P0-3D", "check-3d.js"], ["AAB-DIFF", "aab-diff.js"]]) {
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
  let L = all(); L[0].json.canary = { ...L[0].json.canary, home: false, stale: true, cdn404: true };
  let r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, false); assert.ok(has(r, /P0-IMG：金絲雀沒被抓到/));
  L = all(); L[0].json.canary = { ...L[0].json.canary, home: true, stale: false, cdn404: true }; assert.ok(has(G(L), /改掉包裡檔的雜湊 ✘/));
  L = all(); delete L[0].json.canary; assert.ok(has(G(L), /P0-IMG：金絲雀沒被抓到/), "沒記金絲雀＝沒抓到");
  L = miss(all()); L[0].json.canary = { ...L[0].json.canary, home: true, stale: true, cdn404: false, cdnUnreachable: true };   /* 第十五次：cdn 文字留工具算的，不能自己寫 */
  assert.ok(has(G(L), /CDN 不存在的檔沒被判成沒有（沒確認到（CDN 連不上或暫時出錯/));
  r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, false, "閘門沒有自己探測：不能豁免");
  r = G(L, W("P0-IMG/cdn"), MAIN, UP); assert.equal(r.ok, false, "閘門連得上、報告說連不上：工具失靈"); assert.ok(has(r, /閘門自己連得上 CDN.*工具失靈/));
  r = G(L, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, true, "報告說連不上、閘門也連不上：才可以豁免"); assert.equal(r.waived.length, 3, "正確的報告是結束代碼 3：「要加 --cdn」、金絲雀③、深層 W42 沒驗三條都掛 P0-IMG/cdn");
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
  assert.ok(caa.includes("cdnCanary(cdnRun.probeF, cdnRun.miss, cdnRun.unknown, { ok200: cdnRun.ok200, manOk: manHasFiles(man) })"), "第十五次複審：manOk 跟閘門同一個定義（manHasFiles）");
  assert.equal(CA.manHasFiles({ files: {} }), false, "{files:{}} 算讀不到"); assert.equal(CA.manHasFiles({ files: [] }), false); assert.equal(CA.manHasFiles({ files: { "a": 1 } }), true);
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
  const ok = miss(all()); const r = G(ok, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, true, "CDN 全斷的真報告照樣能豁免"); assert.equal(r.waived.length, 3);
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
  const add = (j, it) => { if ("st" in it && !it.why) it.why = CA.unknownWhy(it.st); j.warnItems.push(it); j.warn = j.warnItems.length; if ("st" in it) { j.unknown++; j.viaCdn++; j.need++ } };   /* 第十四次：加的缺驗帶上工具會寫的原因文字，擋下來的才是要測的那條 */   /* 像真的報告：多一個沒確認到的補抓檔 */
  for (const [why, f, re] of [
    ["混一筆 404（真的缺檔）", (j) => add(j, { f: "data/x.webp", st: 404 }), /不是「連不上」/], ["混一筆 200", (j) => add(j, { f: "data/x.webp", st: 200 }), /不是「連不上」/],
    ["狀態是字串", (j) => add(j, { f: "data/x.webp", st: "-1" }), /不是「連不上」/], ["狀態 600", (j) => add(j, { f: "data/x.webp", st: 600 }), /不是「連不上」/], ["狀態 403（第十一次）", (j) => add(j, { f: "data/x.webp", st: 403 }), /不是「連不上」/],
    ["viaCdn 多記（第十一次：拿到 200 的漏算）", (j) => { j.viaCdn++; j.need++ }, /補抓的檔數/], ["viaCdn 不是整數", (j) => { j.viaCdn = 1.5 }, /補抓的檔數/],
    ["need 對不起來", (j) => { j.need++ }, /need/], ["沒記 inPack", (j) => { delete j.inPack }, /need/],
    ["多一筆 W21 提醒（第十二次）", (j) => { j.warnItems.push({ f: "data/c.webp", why: "不在安裝包裡、原生不會補抓" }); j.warn++ }, /CDN 以外的提醒/],
    ["原生不會補抓（第十二次）", (j) => { j.native.cdnFallback = false }, /原生不會向 CDN 補抓/], ["沒記 native（第十二次）", (j) => { delete j.native }, /原生不會向 CDN 補抓/],
    ["比對過 CDN", (j) => { j.cdnCompared = 1 }, /比對過/], ["探測狀態 200", (j) => { j.canary.cdnStatus = 200 }, /探測狀態|重算/], ["金絲雀全過", (j) => { j.canary.ok = true }, /探測狀態/],
    ["unknown 少算", (j) => { j.unknown-- }, /unknown/], ["unknown 多算", (j) => { j.unknown++ }, /unknown/], ["warn 對不起來", (j) => { j.warn++ }, /warn/],
    ["沒有 manifest 那筆", (j) => { j.warnItems = j.warnItems.filter((w) => w.f !== "cdn-manifest.json"); j.warn = j.warnItems.length; j.unknown-- }, /cdn-manifest/],
    ["兩筆 manifest", (j) => add(j, { f: "cdn-manifest.json", why: "x" }), /cdn-manifest/], ["沒有逐項清單", (j) => { delete j.warnItems }, /逐項清單/],
    ["只有 manifest 那筆", (j) => { j.warnItems = j.warnItems.filter((w) => !("st" in w)); j.warn = j.warnItems.length; j.unknown = 1 }, /探測檔不是剛好一筆/]]) {
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
  assert.ok(pg.includes('for (const f of ["p0-gate.js", "tool-pin.js", "repo-pin.js", "check-aab-assets.js", "bundle-home-assets.js", "aab-diff.js"])'), "第十四次複審：閘門讀 check-aab-assets.js 的規則，它和 bundle-home-assets.js 也要列進自我鎖定（#102：閘門自己用 aab-diff 重算，它也要）");
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
test("閘門（PR #66 第十一、十三次複審，端對端）：真的 check-aab-assets.js 在 CDN 全斷下寫的報告直接進閘門：會補抓的包、不補抓只缺 JSON 的包都能豁免；不補抓又缺媒體的包擋；同一份報告 viaCdn 多記、混一筆 403、多一筆 W21 提醒也擋", { timeout: 240000 }, () => {
  const os = require("os"), cp = require("child_process"), crypto = require("crypto");
  const sha8 = (x) => crypto.createHash("sha1").update(x).digest("hex").slice(0, 8), P = "base/assets/public/";
  const FULL = ["X-XQ-Cdn-Cache", ".parts.json", "[A-Za-z0-9._-]+", "SHA-1"];
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-e2e66-")), down = path.join(d, "down.js");
  fs.writeFileSync(down, "globalThis.fetch = async () => { throw new Error(\"假：CDN 全斷\") };\n");
  /* 第十五次複審：manifest 回 {"files":{}}、其他請求全斷。工具和閘門都要把空的 manifest 當成讀不到 */
  const emptyMan = path.join(d, "empty-man.js");
  fs.writeFileSync(emptyMan, "globalThis.fetch = async (u) => { if (String(u).endsWith(\"cdn-manifest.json\")) return { ok: true, status: 200, json: async () => ({ files: {} }) }; throw new Error(\"假：CDN 全斷\") };\n");
  const { onlyCdnDown } = require(path.join(AND, "p0-gate.js"));
  const put = (j) => { const L = all(); L[0].json = { ...j, aabSha256: A, siteVersion: V }; return L };
  /* 做一個假包、CDN 全斷下跑真工具，回傳 { status, report }。dex＝原生帶的特徵字串；has＝放進包的檔（x＝data/a/x.webp、y＝data/a/y.json、gm＝大檔）；big＝preload 要不要列大檔 */
  let n = 0;
  const runReal = ({ dex, has, big = true, net = down }) => {
    const preload = { v: "t", items: [["data/a/x.webp", 3, sha8("abc"), 1], ["data/a/y.json", 2, sha8("{}"), 1]], big: big ? [["data/gm.json", 30 * 1024 * 1024, sha8("[]")]] : [], pages: {} };
    const f = { [P + "native-build.json"]: JSON.stringify({ siteVersion: V, sharedWebCommit: "0".repeat(40) }), [P + "data/preload.json"]: JSON.stringify(preload),
      [P + "data/big-books.json"]: "[]", "base/dex/classes.dex": "dex\n035\0" + dex.join("\0") + "\0" };
    if (has.includes("x")) f[P + "data/a/x.webp"] = "abc";
    if (has.includes("y")) f[P + "data/a/y.json"] = "{}";
    if (has.includes("gm")) f[P + "data/gm.json"] = "[]";
    for (const h of HOME_REQUIRED) f[P + "data/" + h] = "w";
    const aab = path.join(d, "t" + ++n + ".aab"), out = path.join(d, "img" + n + ".json");
    fs.writeFileSync(aab, zipOf(f));
    const r = cp.spawnSync(process.execPath, ["--require", net, path.join(AND, "check-aab-assets.js"), "--aab", aab, "--cdn", "--out", out], { encoding: "utf8", timeout: 100000 });
    return { status: r.status, err: (r.stderr || "").slice(0, 300), report: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : null };
  };
  const waive = (rep, why) => { const g = G(put(rep), W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(g.ok, true, why + "：" + JSON.stringify(g.problems || g).slice(0, 300)); assert.equal(g.waived.length, 3, why + "：「要加 --cdn」、金絲雀③、深層 W42 沒驗三條") };
  const block = (rep, why) => assert.equal(G(put(rep), W("P0-IMG/cdn"), MAIN, DOWN).ok, false, why);
  try {
    /* ① 會補抓、會接回切塊，缺一個 JSON 和一個大檔 */
    const a = runReal({ dex: FULL, has: ["x"] });
    assert.equal(a.status, 3, "CDN 全斷＝缺驗 3：" + a.err); assert.equal(a.report.viaCdn, 2); assert.equal(a.report.canary.cdnUnreachable, true);
    assert.equal(onlyCdnDown(a.report), null, "真工具的全斷報告要算「單純 CDN 連不上」");
    waive(a.report, "會補抓的包，閘門也連不上：可以豁免");
    assert.equal(G(put(a.report), W("P0-IMG/cdn"), MAIN, UP).ok, false, "閘門連得上：不能豁免");
    const more = JSON.parse(JSON.stringify(a.report)); more.viaCdn++; more.need++; block(more, "viaCdn 多記一個（拿到 200 的被漏算）");
    const f403 = JSON.parse(JSON.stringify(a.report)); f403.warnItems.find((w) => "st" in w).st = 403; block(f403, "混一筆 403");
    const w21 = JSON.parse(JSON.stringify(a.report)); w21.warnItems.push({ f: "data/c.webp", why: "不在安裝包裡、原生不會補抓" }); w21.warn++; block(w21, "多一筆不帶狀態的 W21 提醒");
    /* 不帶狀態的提醒是媒體檔，就算同名有一筆帶狀態的缺驗也不行（只有 JSON 這類網頁程式會改抓的才算 CDN 的問題） */
    const mNote = JSON.parse(JSON.stringify(a.report)); mNote.warnItems.find((w) => w.f === "data/a/y.json" && "st" in w).f = "data/a/y.webp";
    mNote.warnItems.push({ f: "data/a/y.webp", why: "不在安裝包裡、原生不會補抓" }); mNote.warn++;
    assert.match(String(onlyCdnDown(mNote)), /CDN 以外的提醒/); block(mNote, "同名的不帶狀態提醒是媒體檔");
    /* 第十四次複審：會補抓的真報告多加一筆同檔名、不帶狀態的提醒（原因寫別的），以前會放行 */
    const fake30 = JSON.parse(JSON.stringify(a.report)); fake30.warnItems.push({ f: "data/a/y.json", why: "CDN 上切塊的大檔不在安裝包裡（W30）" }); fake30.warn++;
    assert.match(String(onlyCdnDown(fake30)), /原生會補抓時不該有提醒/); block(fake30, "會補抓卻多一筆同名提醒");
    const dupP = JSON.parse(JSON.stringify(a.report)); const p0 = dupP.warnItems.find((w) => /__xq_p0_canary_/.test(w.f));
    dupP.warnItems.push({ ...p0, f: "data/__xq_p0_canary_ffffffffffff.webp" }); dupP.warn++; dupP.unknown++; dupP.viaCdn++; dupP.need++;
    assert.match(String(onlyCdnDown(dupP)), /探測檔不是剛好一筆/); block(dupP, "兩筆探測檔");
    const why1 = JSON.parse(JSON.stringify(a.report)); why1.warnItems.find((w) => w.f === "data/a/y.json").why = CA.unknownWhy(503);
    assert.match(String(onlyCdnDown(why1)), /原因文字跟狀態碼對不起來/); block(why1, "狀態 -1 卻寫 HTTP 503");
    /* 第十五次複審：欄位互相矛盾的報告 */
    const cp1 = (f) => { const j = JSON.parse(JSON.stringify(a.report)); f(j); return j };
    for (const [why, j, re] of [
      ["探測檔 -1、金絲雀卻記 503", cp1((j) => { j.canary.cdnStatus = 503 }), /重算/],
      ["金絲雀寫「判成沒有」、cdn404 卻是 false", cp1((j) => { j.canary.cdn = "判成沒有" }), /重算/],
      ["同一個檔兩筆缺驗", cp1((j) => { const y = j.warnItems.find((w) => w.f === "data/a/y.json"); j.warnItems.push({ ...y }); j.warn++; j.unknown++; j.viaCdn++; j.need++ }), /出現兩次/],
      ["檔名不是字串", cp1((j) => { j.warnItems.find((w) => w.f === "data/a/y.json").f = 123 }), /不是字串/],
      ["首頁金絲雀寫「本來就缺」", cp1((j) => { j.canary.homeFile = "（包裡本來就缺，真實結果已判出）" }), /沒有真的弄壞/],
      ["manifest 那筆原因亂寫", cp1((j) => { j.warnItems.find((w) => w.f === "cdn-manifest.json").why = "隨便寫" }), /原因文字不是工具寫的/]]) {
      assert.match(String(onlyCdnDown(j)), re, why); block(j, why);
    }
    /* 第十五次複審：manifest 回 {"files":{}}、其他全斷：工具回 3（不是 4），閘門照樣豁免 */
    const em = runReal({ dex: FULL, has: ["x"], net: emptyMan });
    assert.equal(em.status, 3, "空的 manifest＝讀不到，缺驗 3：" + em.err); assert.equal(em.report.canary.cdnUnreachable, true);
    assert.equal(onlyCdnDown(em.report), null); waive(em.report, "空的 manifest、其他全斷");
    /* PR②（#66 第十二、十六次複審建議）：CDN 正常時的端對端。之前只在 CDN 全斷下跑過真工具，worker「拿到 200」那條路沒驗。
       假的 CDN：每個檔都回 200、探測檔回 404，manifest 放包裡檔案的正確雜湊（深層 W42 才做得出來）。真工具要回 0、金絲雀全抓到；閘門一條都不用豁免 */
    const s12 = (x) => crypto.createHash("sha1").update(x).digest("hex").slice(0, 12);
    const MAN = { files: { "data/a/x.webp": [3, s12("abc")], "data/a/y.json": [2, s12("{}")], "data/gm.json": [2, s12("[]")] } };
    const okNet = path.join(d, "ok-net.js");
    fs.writeFileSync(okNet, "const MAN = " + JSON.stringify(MAN) + ";\nglobalThis.fetch = async (u) => { u = String(u); if (u.endsWith(\"cdn-manifest.json\")) return { ok: true, status: 200, json: async () => MAN }; if (u.includes(\"__xq_p0_canary_\")) return { ok: false, status: 404 }; return { ok: true, status: 200 } };\n");
    const ok = runReal({ dex: FULL, has: ["x"], net: okNet });
    assert.equal(ok.status, 0, "CDN 正常：真工具回 0：" + ok.err);
    assert.equal(ok.report.canary.cdn404, true, "探測檔被判成 CDN 上沒有"); assert.equal(ok.report.canary.ok, true, "淺層、深層金絲雀全抓到：" + JSON.stringify(ok.report.canary.deep));
    assert.equal(ok.report.canary.deep.w42.ok, true, "有 manifest：深層 W42 做得出來，也抓到"); assert.ok(ok.report.cdnCompared > 0, "有跟 CDN 比對過");
    const g0 = G(put(ok.report), [], MAIN, null); assert.equal(g0.ok, true, "CDN 正常的真報告：閘門不用豁免就過：" + JSON.stringify(g0.problems || g0).slice(0, 300)); assert.equal(g0.waived.length, 0);
    /* ② 第十三次複審：原生不會補抓、只缺 JSON（正確的包；網頁程式會自己改抓 CDN）：上一輪誤擋，現在要能豁免 */
    const b = runReal({ dex: [], has: ["x", "gm"] });   /* PR②：包裡要有切塊大檔，深層 W30 才做得出來（真的候選包一定有）；缺的只有 JSON */
    assert.equal(b.status, 3, "不補抓只缺 JSON，CDN 全斷＝缺驗 3：" + b.err); assert.equal(b.report.native.cdnFallback, false);
    assert.equal(onlyCdnDown(b.report), null, "不補抓只缺 JSON：算單純 CDN 連不上"); waive(b.report, "不補抓只缺 JSON 的正確包");
    /* 第十四次複審：不補抓時，提醒要跟缺驗一對一、原因文字要是工具那句 */
    const bWhy = JSON.parse(JSON.stringify(b.report)); bWhy.warnItems.find((w) => !("st" in w) && w.f === "data/a/y.json").why = "別的原因";
    assert.match(String(onlyCdnDown(bWhy)), /提醒跟缺驗對不起來/); block(bWhy, "提醒的原因不是工具那句");
    const bDup = JSON.parse(JSON.stringify(b.report)); bDup.warnItems.push({ f: "data/a/y.json", why: CA.NOTE_VIA_WEB }); bDup.warn++;
    assert.match(String(onlyCdnDown(bDup)), /提醒跟缺驗對不起來/); block(bDup, "同一個檔兩筆提醒");
    const bLess = JSON.parse(JSON.stringify(b.report)); bLess.warnItems = bLess.warnItems.filter((w) => !(!("st" in w) && w.f === "data/a/y.json")); bLess.warn = bLess.warnItems.length;
    assert.match(String(onlyCdnDown(bLess)), /提醒跟缺驗對不起來/); block(bLess, "不補抓卻少了提醒");
    /* ③ 第十三次複審：只有接回切塊的標記、不會補抓，缺的是大的 JSON：也要能豁免 */
    const c = runReal({ dex: [CA.PARTS_MARKER], has: ["x", "y"] });
    assert.equal(c.status, 3, "只有標記、缺大 JSON，CDN 全斷＝缺驗 3：" + c.err); assert.equal(c.report.native.cdnFallback, false); assert.equal(c.report.native.partsJoin, true);
    waive(c.report, "只有標記、不補抓、缺大 JSON 的正確包");
    /* 第十四次複審：素材全在包裡（viaCdn＝0），CDN 全斷時只有探測檔和 manifest 沒確認到：也要能豁免（之前沒有這種包，「viaCdn 小於 1 就擋」的改壞抓不到） */
    const z = runReal({ dex: FULL, has: ["x", "y", "gm"] });
    assert.equal(z.status, 3, "素材全在包裡，CDN 全斷＝缺驗 3：" + z.err); assert.equal(z.report.viaCdn, 0);
    assert.equal(onlyCdnDown(z.report), null, "素材全在包裡：算單純 CDN 連不上"); waive(z.report, "素材全在包裡的正確包");
    /* ④ 不補抓又缺媒體（W21）：工具自己就判 ✘，閘門一定擋，不會因為上面放寬而放過 */
    const e = runReal({ dex: [], has: ["y"], big: false });
    assert.equal(e.status, 1, "不補抓又缺媒體：工具判 ✘ 回 1：" + e.err); assert.ok(e.report.red > 0);
    block(e.report, "不補抓又缺媒體");
    /* 手改：缺的改成媒體檔、原生又不補抓；不帶狀態的那筆提醒拿掉，這樣擋下來的一定是媒體規則，不是「對不到缺驗的提醒」那條 */
    const eFake = JSON.parse(JSON.stringify(b.report));
    eFake.warnItems = eFake.warnItems.filter((w) => !(w.f === "data/a/y.json" && !("st" in w))); eFake.warn = eFake.warnItems.length;
    eFake.warnItems.find((w) => w.f === "data/a/y.json" && "st" in w).f = "data/a/y.webp";
    assert.match(String(onlyCdnDown(eFake)), /要補抓的檔裡有媒體檔/); block(eFake, "手改成缺的是媒體檔、原生又不補抓");
    /* 多一筆不帶狀態、但對不到任何缺驗項目的 JSON 提醒：不是 CDN 的問題 */
    const orphan = JSON.parse(JSON.stringify(b.report)); orphan.warnItems.push({ f: "data/z.json", why: "不在安裝包裡、原生不會補抓；網頁程式會自己改抓 CDN" }); orphan.warn++;
    assert.match(String(onlyCdnDown(orphan)), /CDN 以外的提醒/); block(orphan, "對不到缺驗的提醒");
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

/* ---- 深層金絲雀（2026-11-23「壞樣本自己做、測深層判斷」）：在真的資料夾上動手，用同一個 analyzeTree 重判 ---- */
const os = require("os"), crypto = require("crypto"), zlib = require("zlib"), cp = require("child_process");
const sha1h = (b) => crypto.createHash("sha1").update(b).digest("hex");
const W30M = ["X-XQ-Cdn-Cache", ".parts.json", "[A-Za-z0-9._-]+", "SHA-1"];
const made = []; test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });
/* 假的「解開後的安裝包」：x.webp（媒體，在包裡）、y.json、gm.json（切塊大檔，不在包裡）、首頁素材、dex 有 W30 四個特徵 */
function tree(files) { const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-deep-")); made.push(d); for (const [n, v] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(d, n)), { recursive: true }); fs.writeFileSync(path.join(d, n), v) } return d }
function goodFiles() {
  const P = "base/assets/public/", s8 = (s) => sha1h(s).slice(0, 8);
  const f = { [P + "native-build.json"]: JSON.stringify({ siteVersion: V, sharedWebCommit: "0".repeat(40) }),
    [P + "data/preload.json"]: JSON.stringify({ v: "t", items: [["data/a/x.webp", 3, s8("abc"), 1], ["data/a/y.json", 2, s8("{}"), 1]], big: [["data/gm.json", 30 * 1024 * 1024, s8("[]")]], pages: {} }),
    [P + "data/big-books.json"]: "[]", [P + "data/a/x.webp"]: "abc", "base/dex/classes.dex": "dex\n035\0" + W30M.join("\0") + "\0" };
  for (const h of HOME_REQUIRED) f[P + "data/" + h] = "w";
  return f;
}
const snap = (d) => { const o = {}; (function w(p) { for (const e of fs.readdirSync(p, { withFileTypes: true })) { const q = path.join(p, e.name); if (e.isDirectory()) w(q); else o[path.relative(d, q)] = sha1h(fs.readFileSync(q)) } })(d); return o };

test("深層金絲雀：正常的安裝包上，W21、W30、首頁真的刪、內容被改都抓到；沒有 manifest 時 W42 標沒驗；跑完資料夾一個位元組都沒變", () => {
  const d = tree(goodFiles()), before = snap(d);
  const A = CA.analyzeTree(d, {}); assert.equal(A.R.red.length, 0, "正常包沒有 ✘");
  const r = CA.deepCanaries(d, A, {});
  for (const k of ["w21", "w30", "home", "hash"]) assert.equal(r[k].ok, true, k + "：" + JSON.stringify(r[k]));
  assert.equal(r.w21.file, "data/a/x.webp"); assert.equal(r.w30.file, "data/gm.json");
  assert.match(r.w21.note, /偵測到「沒有 CDN 補抓」/); assert.match(r.w30.note, /偵測到「不會接回切塊」/);
  assert.equal(r.w42.ok, false); assert.ok(r.w42.skip);
  assert.deepEqual(snap(d), before, "壞樣本都還原了");
  assert.equal(CA.deepOk(r, false), true); assert.equal(CA.deepOk(r, true), true, "W42 沒 manifest＝缺驗，不算失靈");
});

test("深層金絲雀：有 CDN manifest 時，W42 改掉包裡一個跟 CDN 一樣的素材，要判出「跟 CDN 現行版不同」", () => {
  const d = tree(goodFiles()), man = { files: { "data/a/x.webp": [3, sha1h("abc").slice(0, 12)] } };
  const A = CA.analyzeTree(d, { man }); assert.equal(A.R.red.length, 0);
  const r = CA.deepCanaries(d, A, { man }); assert.equal(r.w42.ok, true, JSON.stringify(r.w42)); assert.equal(r.w42.file, "data/a/x.webp");
});

test("深層金絲雀（#84 第二輪審查）：W42 只靠「跟 CDN 比」那條判斷抓到；那條失靈時要報沒抓到，不能被「跟清單不符」頂替", () => {
  const d = tree(goodFiles()), man = { files: { "data/a/x.webp": [3, sha1h("abc").slice(0, 12)] } }, before = snap(d);
  const A = CA.analyzeTree(d, { man });
  /* W42 壞樣本只動 manifest 副本，包裡的檔不動：「跟清單不符」不會出現 */
  let seen = null; const spy = (t, o) => { const r = CA.analyzeTree(t, o); if (o.man && o.man !== man) seen = r.R.red.map((x) => x.why); return r };
  assert.equal(CA.deepCanaries(d, A, { man }, spy).w42.ok, true);
  assert.ok(seen && seen.some((w) => /跟 CDN 現行版不同/.test(w)) && !seen.some((w) => /跟清單不符/.test(w)), "W42 壞樣本只觸發「跟 CDN 比」：" + JSON.stringify(seen));
  assert.deepEqual(snap(d), before, "包裡的檔一個位元組都沒動");
  /* 「跟 CDN 比」那條判斷失靈（結果被丟掉）：W42 要報沒抓到 */
  const blind = (t, o) => { const r = CA.analyzeTree(t, o); r.R.red = r.R.red.filter((x) => !/跟 CDN 現行版不同/.test(x.why)); return r };
  const rb = CA.deepCanaries(d, A, { man }, blind); assert.equal(rb.w42.ok, false, "W42 判斷失靈：沒抓到"); assert.equal(rb.w42.missed, "data/a/x.webp");
  /* 改成「抓到哪條都算」：同一個檔被「跟清單不符」抓到也不能算 W42 */
  const wrong = (t, o) => { const r = CA.analyzeTree(t, o); r.R.red = r.R.red.map((x) => /跟 CDN 現行版不同/.test(x.why) ? { ...x, why: x.why + "；跟清單不符" } : x); return r };
  assert.equal(CA.deepCanaries(d, A, { man }, wrong).w42.ok, false, "同時判出「跟清單不符」＝不是乾淨的 W42 抓到");
});

test("深層金絲雀（#84 第二輪審查）：壞樣本跑不起來（判斷丟例外）時，每一項都要判沒抓到，不能算過", () => {
  const d = tree(goodFiles()), man = { files: { "data/a/x.webp": [3, sha1h("abc").slice(0, 12)] } }, before = snap(d);
  const A = CA.analyzeTree(d, { man });
  const boom = () => { throw new Error("假的判斷壞掉") };
  const r = CA.deepCanaries(d, A, { man }, boom);
  for (const k of ["w21", "w30", "home", "hash", "w42"]) { assert.equal(r[k].ok, false, k + "：" + JSON.stringify(r[k])); assert.match(String(r[k].note), /壞樣本跑不起來：假的判斷壞掉/, k) }
  assert.equal(CA.deepOk(r, true), false); assert.deepEqual(snap(d), before, "丟例外也要把壞樣本還原");
});

test("深層金絲雀報警（反測必紅）：判斷被改壞（不看檔、不看 dex、不看清單雜湊）時，對應的金絲雀要報「沒抓到」", () => {
  const d = tree(goodFiles()), A = CA.analyzeTree(d, {});
  const frozen = () => A;   /* 判斷一律回原本的結果＝什麼都看不到 */
  let r = CA.deepCanaries(d, A, {}, frozen); for (const k of ["w21", "w30", "home", "hash"]) assert.equal(r[k].ok, false, k);
  const noDex = (t, o) => { const x = CA.analyzeTree(t, o); x.native.cdnFallback = true; x.native.partsJoin = true; x.R.red = CA.classify(x.need, (f) => x.inPack.has(f), x.sha1Of, x.native).red; return x };
  r = CA.deepCanaries(d, A, {}, noDex); assert.equal(r.w21.ok, false, "原生能力偵測壞掉：W21 報警"); assert.equal(r.w30.ok, false, "W30 報警"); assert.equal(r.home.ok, true);
  assert.equal(CA.deepOk(r, false), false);
  assert.deepEqual(snap(d), snap(d));
});

test("深層金絲雀：找不到可以弄壞的對象時，真實結果已判出同一類才算成立，否則不成立", () => {
  const f = goodFiles(); delete f["base/assets/public/data/a/x.webp"];   /* 包裡沒有媒體檔可藏 */
  const d = tree(f), A = CA.analyzeTree(d, {});
  const r = CA.deepCanaries(d, A, {});
  assert.equal(r.w21.ok, false, "沒有媒體在包裡、真實結果也沒判出（有 CDN 補抓）：不成立"); assert.match(r.w21.note, /不成立/);
});

test("閘門：深層金絲雀 W21／W30／首頁／內容沒抓到不能豁免；W42 沒驗歸 P0-IMG/cdn 可豁免", () => {
  let L = all(); L[0].json.canary = { ...L[0].json.canary, deep: { ...L[0].json.canary.deep, w30: { ok: false } } };
  let r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, false); assert.ok(has(r, /深層金絲雀沒抓到（w30）/));
  L = all(); delete L[0].json.canary.deep; assert.ok(has(G(L), /深層金絲雀沒抓到（w21、w30、home、hash）/), "沒記深層＝都沒抓到");
  L = all(); L[0].json.canary = { ...L[0].json.canary, deep: { ...L[0].json.canary.deep, w42: { ok: false, skip: "沒有 CDN manifest" } } };
  assert.ok(has(G(L), /W42.*沒驗/)); r = G(L, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, false, "報告其他地方都說 CDN 讀得到、卻說 W42 沒 manifest：矛盾，不能豁免（#66 第五次起豁免要單純缺驗）");
  L = miss(all()); r = G(L, W("P0-IMG/cdn"), MAIN, DOWN); assert.equal(r.ok, true, "單純缺驗、閘門也連不上：W42 沒驗可以豁免"); assert.ok(r.waived.some((x) => /W42/.test(x)));
  r = G(L, W("P0-IMG/cdn"), MAIN, UP); assert.equal(r.ok, false, "閘門連得上：W42 沒驗不能豁免");
  L = all(); L[0].json.canary = { ...L[0].json.canary, deep: { ...L[0].json.canary.deep, w42: { ok: false } } };
  r = G(L, W("P0-IMG/cdn")); assert.equal(r.ok, false, "W42 驗了卻沒抓到：不能豁免");
});

test("深層金絲雀實跑：用假 AAB 跑真的 check-aab-assets.js，正常包綠燈、五隻都列出；dex 沒有切塊特徵的包照樣紅燈（不被金絲雀蓋掉）", () => {
  function zip(files) { const L = [], C = []; let off = 0;
    for (const [n, v] of Object.entries(files)) { const data = Buffer.from(v), name = Buffer.from(n, "utf8"), crc = zlib.crc32(data) >>> 0;
      const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(name.length, 26);
      const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(name.length, 28); ch.writeUInt32LE(off, 42);
      L.push(lh, name, data); C.push(ch, name); off += 30 + name.length + data.length }
    const cd = Buffer.concat(C), end = Buffer.alloc(22); end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(C.length / 2, 8); end.writeUInt16LE(C.length / 2, 10); end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(off, 16);
    return Buffer.concat([...L, cd, end]) }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "xq-deepaab-")); made.push(dir);
  const ok = path.join(dir, "ok.aab"); fs.writeFileSync(ok, zip(goodFiles()));
  let r = cp.spawnSync(process.execPath, [path.join(AND, "check-aab-assets.js"), "--aab", ok], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  for (const label of ["W21 媒體缺檔＋原生不會補抓：✔ 抓到", "W30 切塊大檔接不回：✔ 抓到", "首頁素材缺（真的刪檔）：✔ 抓到", "包裡檔內容被改：✔ 抓到"]) assert.ok(r.stdout.includes("深層金絲雀 " + label), label);
  const g = goodFiles(); g["base/dex/classes.dex"] = "dex\n035\0X-XQ-Cdn-Cache\0"; const bad = path.join(dir, "w30.aab"); fs.writeFileSync(bad, zip(g));
  r = cp.spawnSync(process.execPath, [path.join(AND, "check-aab-assets.js"), "--aab", bad], { encoding: "utf8" });
  assert.equal(r.status, 1, "真的 W30 包：✘ 優先回 1"); assert.match(r.stdout, /切塊的大檔不在安裝包裡/);
  /* 包裡沒有媒體檔可藏、原生又會補抓（真實結果沒有 ✘）：W21 深層金絲雀不成立 → 看起來全過、其實沒驗到 → 4 */
  const g2 = goodFiles(); delete g2["base/assets/public/data/a/x.webp"]; const nomedia = path.join(dir, "nomedia.aab"); fs.writeFileSync(nomedia, zip(g2));
  r = cp.spawnSync(process.execPath, [path.join(AND, "check-aab-assets.js"), "--aab", nomedia], { encoding: "utf8" });
  assert.equal(r.status, 4, r.stdout + r.stderr); assert.match(r.stdout, /深層金絲雀 W21 媒體缺檔＋原生不會補抓：✘ 沒抓到/);
});

test("P0-UPD 深層金絲雀：用 App 自己的 modal() 跳「有新版本」、在正式的觀察迴圈期間跳；觀察迴圈 coldWatch 要數到、verdict 要判出", async () => {
  const UP = require(path.join(AND, "check-upgrade.js"));
  assert.match(UP.CANARY_JS, /^setTimeout\(\(\)=>\{try\{modal\('[^']*<h2>有新版本<\/h2>/, "用 App 的 modal()、跟真的更新提示同一個標題");
  assert.ok(UP.CANARY_AT_SEC > 0 && UP.CANARY_AT_SEC < UP.DIALOG_WATCH_SEC, "在觀察期間內跳出");
  /* build：測試沒帶命令列參數，coldWatch 裡的 verdict 預期版號是 --new-build 的預設值 null */
  const ok = { build: null, raw: "kept", setting: "kept", regs: 0, controller: false, oldKeys: [], webUpdate: false, notify: "undefined", manual: "由 Google Play 更新" };
  /* 假連線：第 3 秒起畫面上有 1 個更新視窗（模擬 modal 跳出），PROBE 回正常狀態 */
  const fake = (from) => { let t = 0; return { ev: async (js) => js === UP.DIALOGS ? (t++ >= from ? 1 : 0) : { ...ok, dialogs: 0 } } };
  let row = await UP.coldWatch(fake(3), 5, async () => {});
  assert.equal(row.dialogs, 1, "觀察期間跳出的視窗要被記到（即使 PROBE 那一刻沒有）");
  assert.ok(row.bad.some((b) => /更新提示視窗/.test(b))); assert.equal(UP.canaryVerdict(row.dialogs, row.bad).dialog, true);
  row = await UP.coldWatch(fake(99), 5, async () => {});
  assert.equal(row.dialogs, 0); assert.equal(row.pass, true, "沒跳出＝正常狀態通過"); assert.equal(UP.canaryVerdict(row.dialogs, row.bad).dialog, false, "金絲雀沒被看到＝報警");
});

test("〔原始碼〕P0-UPD：正式冷啟與金絲雀都走 coldWatch；金絲雀先確認 App 有 modal()", () => {
  const up = rd("check-upgrade.js");
  assert.match(up, /const row = await coldWatch\(c2\); row\.screenshot = snap\("after-cold-" \+ i\);/);
  assert.match(up, /await c3\.ev\(CANARY_JS\);\n\s+const row = await coldWatch\(c3\);/);
  assert.match(up, /typeof modal==="function"/);
});

test("P0-IMG：深層金絲雀沒抓到＝結束代碼 4（沒 ✘ 時）、報告 pass 也要看深層", () => {
  const okDeep = { w21: { ok: true }, w30: { ok: true }, home: { ok: true }, hash: { ok: true }, w42: { ok: false, skip: "沒 manifest" } };
  assert.equal(CA.canaryExitOk({ home: true, stale: true, deep: okDeep }, false), true);
  assert.equal(CA.canaryExitOk({ home: true, stale: true, deep: { ...okDeep, w21: { ok: false } } }, false), false, "深層沒抓到＝失靈");
  /* #84 審查①：加了 --cdn 時要帶 cdn404，不然不管深層怎樣都回 false，等於沒測到 W42 */
  assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: true, deep: { ...okDeep, w42: { ok: true } } }, true), true, "對照組：W42 抓到＝成立");
  assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: true, deep: { ...okDeep, w42: { ok: false } } }, true), false, "W42 驗了卻沒抓到＝失靈");
  assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: true, deep: okDeep }, true), true, "W42 沒 manifest（skip）＝缺驗，不算失靈");
  /* #84 審查②：五項逐一沒抓到，都要判失靈（之前只有 w21 有測試，拿掉 w30 照樣綠） */
  for (const k of ["w21", "w30", "home", "hash"]) {
    assert.equal(CA.deepOk({ ...okDeep, [k]: { ok: false } }, false), false, k + " 沒抓到");
    assert.equal(CA.deepOk({ ...okDeep, [k]: undefined }, false), false, k + " 沒記");
    assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: true, deep: { ...okDeep, [k]: { ok: false } } }, true), false, k + " 沒抓到＝結束代碼看成失靈");
  }
  assert.equal(CA.deepOk(okDeep, false), true); assert.equal(CA.deepOk(okDeep, true), true, "W42 skip＝缺驗");
  assert.equal(CA.deepOk({ ...okDeep, w42: { ok: false } }, true), false, "要 W42、驗了卻沒抓到");
  assert.equal(CA.deepOk({ ...okDeep, w42: undefined }, true), false, "要 W42、卻沒記");
  assert.equal(CA.deepOk({ ...okDeep, w42: { ok: false } }, false), true, "不要 W42 時不看它");
  assert.equal(CA.deepOk(null, false), false);
  assert.match(rd("check-aab-assets.js"), /canary\.ok = canary\.home === true && canary\.stale === true && canary\.cdn404 === true && deepOk\(canary\.deep, true\);/);
});

test("深層金絲雀 W21：小包裡只剩首頁素材是媒體時，退而藏首頁的（不能因為挑不到對象誤擋小包）", () => {
  const f = goodFiles(), P = "base/assets/public/", h0 = "data/" + HOME_REQUIRED[0];
  delete f[P + "data/a/x.webp"];
  const pre = JSON.parse(f[P + "data/preload.json"]); pre.items = pre.items.filter((x) => x[0] !== "data/a/x.webp"); pre.items.push([h0, 1, sha1h("w").slice(0, 8), 1]);
  f[P + "data/preload.json"] = JSON.stringify(pre);
  const d = tree(f), A = CA.analyzeTree(d, {}); assert.equal(A.R.red.length, 0);
  const r = CA.deepCanaries(d, A, {}); assert.equal(r.w21.ok, true, JSON.stringify(r.w21)); assert.equal(r.w21.file, h0);
});

test("深層金絲雀：每一類挑頭、中、尾三個檔都要抓到；正式判斷只查第一個檔時要報警（PR #67 審查同一類弱點）", () => {
  const P = "base/assets/public/", s8 = (s) => sha1h(s).slice(0, 8), f = goodFiles();
  const pre = JSON.parse(f[P + "data/preload.json"]);
  for (const n of ["b", "c", "d", "e"]) { pre.items.push(["data/a/" + n + ".webp", 3, s8(n + "bc"), 1]); f[P + "data/a/" + n + ".webp"] = n + "bc" }
  f[P + "data/preload.json"] = JSON.stringify(pre);
  const d = tree(f), A = CA.analyzeTree(d, {});
  const r = CA.deepCanaries(d, A, {});
  assert.equal(r.w21.ok, true); assert.equal(r.w21.files.length, 3, "挑了三個：" + JSON.stringify(r.w21.files));
  assert.deepEqual(r.w21.files, ["data/a/x.webp", "data/a/c.webp", "data/a/e.webp"], "頭、中、尾");
  /* 正式判斷被改成「只查第一個媒體檔」：其他檔缺了也不判 */
  const firstOnly = (t, o) => { const x = CA.analyzeTree(t, o); x.R.red = x.R.red.filter((y) => !/圖片／音樂直接破|跟清單不符/.test(y.why) || y.f === "data/a/x.webp"); return x };
  const b = CA.deepCanaries(d, A, {}, firstOnly);
  assert.equal(b.w21.ok, false, "只查第一個檔：W21 要報警"); assert.equal(b.w21.missed, "data/a/c.webp");
  assert.equal(b.hash.ok, false, "只查第一個檔：內容被改要報警");
});

/* #84 第三輪審查①：「抓到」要同時看檔名和原因。假包放兩個在包裡的媒體、兩個包外的媒體（原生 CDN 補抓特徵弄壞後，包外的也會被判 W21） */
function pairFiles() {
  const P = "base/assets/public/", s8 = (s) => sha1h(s).slice(0, 8), f = goodFiles();
  const pre = JSON.parse(f[P + "data/preload.json"]);
  pre.items.push(["data/a/b.webp", 3, s8("bbc"), 1]); f[P + "data/a/b.webp"] = "bbc";
  for (const n of ["o1", "o2"]) pre.items.push(["data/out/" + n + ".webp", 3, s8(n), 1]);   /* 不在包裡 */
  f[P + "data/preload.json"] = JSON.stringify(pre);
  return f;
}
test("深層金絲雀（#84 第三輪審查①）：抓到的是別的檔、或同一個檔但原因是別條，都要判沒抓到", () => {
  const d = tree(pairFiles()), A = CA.analyzeTree(d, {}), before = snap(d);
  assert.equal(A.R.red.length, 0, "正常包沒有 ✘：" + JSON.stringify(A.R.red));
  const r = CA.deepCanaries(d, A, {}); for (const k of ["w21", "w30", "home", "hash"]) assert.equal(r[k].ok, true, k + "：" + JSON.stringify(r[k]));
  /* 正式判斷局部失靈：包裡的媒體缺了不判 W21，只剩包外的（o1、o2）照判 → 拿掉檔名條件時會被「別的檔」頂替 */
  const partial = (t, o) => { const x = CA.analyzeTree(t, o); x.R.red = x.R.red.filter((y) => !(/圖片／音樂直接破/.test(y.why) && y.f.startsWith("data/a/"))); return x };
  const rp = CA.deepCanaries(d, A, {}, partial);
  assert.equal(rp.w21.ok, false, "W21 只抓到包外的別的檔，不算：" + JSON.stringify(rp.w21));
  /* 每一筆 ✘ 都記到別的檔上：四類都要判沒抓到 */
  const otherFile = (t, o) => { const x = CA.analyzeTree(t, o); x.R.red = x.R.red.map((y) => ({ ...y, f: "data/zz/other.webp" })); return x };
  const ro = CA.deepCanaries(d, A, {}, otherFile);
  for (const k of ["w21", "w30", "home", "hash"]) assert.equal(ro[k].ok, false, "抓到別的檔（" + k + "）：" + JSON.stringify(ro[k]));
  /* 同一個檔、但原因換成別類：四類都要判沒抓到（正規式改成 /./ 或拿掉原因條件時，這項會紅） */
  const swap = (w) => /跟清單不符/.test(w) ? "首頁離線必要素材不在安裝包裡（W21）" : "安裝包裡的檔跟清單不符（SHA-1 前 8 碼 x，清單 y）：會顯示舊內容";
  const otherWhy = (t, o) => { const x = CA.analyzeTree(t, o); x.R.red = x.R.red.map((y) => ({ ...y, why: swap(y.why) })); return x };
  const rw = CA.deepCanaries(d, A, {}, otherWhy);
  for (const k of ["w21", "w30", "home", "hash"]) assert.equal(rw[k].ok, false, "原因是別條（" + k + "）：" + JSON.stringify(rw[k]));
  assert.equal(CA.deepOk(rp, false), false); assert.deepEqual(snap(d), before, "壞樣本都還原了");
});

test("深層金絲雀（#84 第三輪審查②）：manifest 有內容、但沒有一個檔對得上時，W42 不成立，金絲雀要判失靈（結束代碼 4）", () => {
  const d = tree(goodFiles()), man = { files: { "data/nowhere/q.webp": [3, sha1h("zzz").slice(0, 12)], "data/a/x.webp": [3, "f".repeat(12)] } };
  const A = CA.analyzeTree(d, { man });
  const r = CA.deepCanaries(d, A, { man });
  assert.equal(r.w42.ok, false, JSON.stringify(r.w42)); assert.ok(!r.w42.skip, "有 manifest 就不是缺驗"); assert.match(r.w42.note, /不成立/);
  assert.equal(CA.deepOk(r, true), false);
  assert.equal(CA.canaryExitOk({ home: true, stale: true, cdn404: true, deep: r }, true), false, "＝結束代碼 4");
});

test("深層金絲雀（#84 第三輪審查③）：W21、W30 的紅燈照出，但原生能力偵測還判成有補抓／會接回，要判沒抓到", () => {
  const d = tree(goodFiles()), A = CA.analyzeTree(d, {});
  const keepFb = (t, o) => { const x = CA.analyzeTree(t, o); x.native = { ...x.native, cdnFallback: true }; return x };
  const r1 = CA.deepCanaries(d, A, {}, keepFb);
  assert.equal(r1.w21.ok, false, "偵測失靈（cdnFallback 還是 true）：" + JSON.stringify(r1.w21)); assert.match(r1.w21.note, /原生能力偵測失靈/);
  const keepJoin = (t, o) => { const x = CA.analyzeTree(t, o); x.native = { ...x.native, partsJoin: true }; return x };
  const r2 = CA.deepCanaries(d, A, {}, keepJoin);
  assert.equal(r2.w30.ok, false, "偵測失靈（partsJoin 還是 true）：" + JSON.stringify(r2.w30)); assert.match(r2.w30.note, /原生能力偵測失靈/);
  assert.equal(r2.home.ok, true); assert.equal(r2.hash.ok, true);
});

test("〔混合〕P0-3D 星門圍城：檢查用的視角名稱 App 要認得（以前寫 iso，App 只認 top／tilt／flat，斜看情境其實一直是俯視）；開局前先選好 3D 視角", () => {
  const { siegeView } = require(path.join(AND, "check-3d.js"));
  const src = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07bhg-gatesiege.js"), "utf8");
  const m = /const gsvVwOk=(v=>[^;]+);/.exec(src); assert.ok(m, "App 的 gsvVwOk 找得到");
  const ok = eval(m[1]);
  for (const n of ["siege-top", "siege-iso"]) { assert.equal(ok(siegeView(n)), true, n + " → " + siegeView(n)); assert.notEqual(siegeView(n), "flat") }
  assert.notEqual(siegeView("siege-top"), siegeView("siege-iso"), "兩個情境要是不同視角");
  assert.match(rd("check-3d.js"), /if \(kind === "siege"\) await c\.ev\(`gsvSetView\(\$\{JSON\.stringify\(siegeView\(name\)\)\}\)`\);\n\s+await c\.ev\(START\[/, "開局前先選視角");
});

test("〔原始碼〕P0-3D：模擬器還連著但卡死（adb 逾時、shell 沒回應）要判測試不成立（2），不能算成情境沒過（11/23 第一次實跑發現）", () => {
  const c3d = rd("check-3d.js");
  assert.match(c3d, /function responsive\(\) \{ try \{ return cp\.execFileSync\(ADB, \["-s", O\.serial, "shell", "echo", "ok"\]/);
  assert.match(c3d, /OFFLINE\.test\(String\(e\.message\)\) \|\| \/ETIMEDOUT\/\.test\(String\(e\.code \|\| e\.message\)\) \|\| !online\(\) \|\| !responsive\(\)\) throw new Unfit\(/);
});

test("W91 閘門收產物比對（AAB-DIFF）：合格的才能送審；缺報告、比的不是送審 AAB、舊版同一個檔、沒寫舊版本碼、沒 --strict、有紅項、有沒確認的黃項、沒通過、金絲雀沒抓到、交兩份、工具改過——都擋，而且不能豁免", () => {
  const P0 = require(path.join(AND, "p0-gate.js"));
  assert.equal(G(all()).ok, true, "合格的一份就能送審：" + G(all()).problems.join("；"));
  const without = all().filter((r) => r.json.tool !== "AAB-DIFF");
  assert.ok(has(G(without), /缺 AAB-DIFF 的報告/), "缺報告");
  const bad = (o, re, why) => { const L = [...without, ad(A, o)], r = G(L); assert.equal(r.ok, false, why); assert.ok(has(r, re), why + "：" + r.problems.join("；"));
    const all4 = ["P0-IMG/cdn", "P0-UPD/old-worker", "P0-3D/partial", "P0-3D/rounds"].map((code) => ({ code, aabSha256: A, reason: "測試用豁免", decidedBy: "開發者", decidedAt: "2026-11-24" }));
    assert.equal(G(L, all4).ok, false, why + "：給了所有能豁免的代碼也不能放行") };
  bad({ newSha256: "e".repeat(64) }, /比對的新版.*不是要送審的這個 AAB/, "比的不是送審 AAB");
  bad({ newSha256: undefined }, /沒有記新版 AAB 的 SHA-256/, "沒記新版雜湊");
  bad({ oldSha256: A }, /舊版 AAB 的 SHA-256 沒記、或跟送審的是同一個/, "舊版同一個檔");
  bad({ oldCode: null }, /沒寫舊版是 Play 上的哪一版/, "沒寫舊版本碼");
  bad({ strict: false }, /要用 --strict 跑/, "沒 --strict");
  bad({ red: [{ f: "base/assets/public/data/homemap/home.webp", why: "少了" }] }, /有紅項.*home\.webp/, "有紅項");
  bad({ yellow: [{ f: "base/assets/public/AGENTS.md", why: "黃" }] }, /有沒確認的黃項.*AGENTS\.md/, "有沒確認的黃項");
  bad({ exitCode: 1 }, /沒有通過（exitCode＝1/, "結束代碼不是 0");
  bad({ pass: false }, /沒有通過/, "pass 不是 true");
  for (const k of ["home", "zeroJs", "jks", "yellow"]) bad({ canary: { home: { ok: true }, zeroJs: { ok: true }, jks: { ok: true }, yellow: { ok: true }, [k]: { ok: false }, ok: false } }, new RegExp("金絲雀沒抓到（" + k), "金絲雀 " + k + " 沒抓到");
  let r = G([...all(), ad()]); assert.ok(has(r, /AAB-DIFF 有兩份報告/), "交兩份");
  r = gate(A, V, all(), [], { mainSha: (p) => (p.endsWith("aab-diff.js") ? "f".repeat(64) : MAIN(p)), diffRe: OKRE, oldSha: OLDSHA });
  assert.ok(has(r, /AAB-DIFF：.*aab-diff\.js 跟 origin\/main 那一版不一樣/), "用改過的 aab-diff 跑的報告不算：" + r.problems.join("；"));
  const info = P0.aabDiffInfo([...without, ad(A, { args: { "expect-shrunk": "^x$", ack: "ack.json" }, acked: [{ ack: "a@1" }], allowed: [{ f: "x" }] })]);
  assert.deepEqual(info, { file: "aab-diff.json", oldCode: "26112104", oldSha256: "d".repeat(64), args: { "expect-shrunk": "^x$", ack: "ack.json" }, acked: ["a@1"], allowed: 1 }, "放行參數、確認過的黃項原樣帶出來（收據要記）");
  assert.equal(P0.aabDiffInfo(without), null);
});

test("#102 審查建議①：閘門自己重算產物比對——報告手改成 red:[]、pass:true 也騙不了；沒確認的黃、放行參數太寬（金絲雀沒抓到）、沒重算、舊版不是 --old-aab、新版本碼沒比舊版大都擋；收據記確認碼逐筆", () => {
  const P0 = require(path.join(AND, "p0-gate.js")), AD = require(path.join(AND, "aab-diff.js"));
  const P = "base/assets/public/", M = (o) => new Map(Object.entries(o).map(([k, [size, crc]]) => [k, { size, csize: size, crc }]));
  const base = { "BundleConfig.pb": [10, 1], "base/manifest/AndroidManifest.xml": [20, 2], [P + "index.html"]: [300, 3], [P + "core.js"]: [900, 4], [P + "data/homemap/home.webp"]: [4000, 5] };
  const Aidx = M(base), ok = P0.recomputeDiff(AD, Aidx, M(base), {}, new Set());
  assert.equal(ok.red.length + ok.yellow.length, 0); assert.equal(ok.canaryOk, true, JSON.stringify(ok.canary));
  const g = (re, o = {}, oldSha = OLDSHA) => gate(A, V, [...all().filter((r) => r.json.tool !== "AAB-DIFF"), ad(A, o)], [], { mainSha: MAIN, diffRe: FILE(re, oldSha), oldSha });
  assert.equal(g(ok).ok, true, g(ok).problems.join("；"));
  const lost = Object.assign({}, base); delete lost[P + "data/homemap/home.webp"];
  let r = g(P0.recomputeDiff(AD, Aidx, M(lost), {}, new Set()), { red: [], pass: true, exitCode: 0 });
  assert.ok(has(r, /閘門重算有紅項.*home\.webp/), "報告說沒有紅項也沒用：" + r.problems.join("；"));
  const more = Object.assign({}, base, { [P + "AGENTS.md"]: [500, 9] }), Y = P0.recomputeDiff(AD, Aidx, M(more), {}, new Set());
  assert.ok(has(g(Y), /閘門重算有沒確認的黃項.*AGENTS\.md/), "沒確認的黃");
  const Y2 = P0.recomputeDiff(AD, Aidx, M(more), {}, new Set([Y.yellow[0].ack])); assert.equal(g(Y2).ok, true, "確認清單（閘門自己的 --ack）寫了就過");
  assert.deepEqual(JSON.parse(JSON.stringify(Y2.acked)), [Y.yellow[0].ack]);
  const W2 = P0.recomputeDiff(AD, Aidx, M(base), { "expect-removed": "." }, new Set());
  assert.equal(W2.canaryOk, false); assert.ok(has(g(W2), /閘門重算的金絲雀沒抓到/), "放行參數太寬");
  assert.ok(has(g(null), /閘門沒有自己重算產物比對/), "沒給 --old-aab");
  assert.ok(has(g(ok, {}, "9".repeat(64)), /不是 --old-aab 這一包/), "報告比的舊版跟閘門拿到的不同");
  assert.ok(has(g(ok, { newCode: "26112104" }), /新版的 versionCode 沒寫、或沒有比舊版/), "新版本碼不比舊版大");
  assert.ok(has(g(ok, { oldCode: "0" }), /沒寫舊版是 Play 上的哪一版/), "舊版本碼是 0");
  const rc = P0.aabDiffReceipt(A, [ad(A, { args: { "expect-shrunk": "^x$", ack: "ack.json" } })], Y2);
  assert.deepEqual(JSON.parse(JSON.stringify(rc)), { tool: "AAB-DIFF", aabSha256: A, oldCode: "26112104", newCode: "26112401", oldSha256: OLDSHA, args: { "expect-shrunk": "^x$" }, acked: [Y.yellow[0].ack], allowed: 0, recomputed: true, toolPins: TP.pinsFor("AAB-DIFF") }, "收據：放行參數原樣（不含 ack 路徑）、確認碼逐筆、有重算");
});
