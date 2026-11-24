// W69 流程盤點第 3 項（11/22）：P0 證據要綁住「實際送審的 AAB」，建包腳本收進倉庫。
//   aab-to-apk.js（從送審 AAB 產 P0 用 APK）、p0-gate.js（三份 P0 報告都綁同一個 AAB 才能送審）、
//   check-aab-assets.js（包裡素材跟 CDN 現行版交叉核對、報告帶 AAB 雜湊）、check-upgrade.js／check-3d.js（--aab-apk：自己算實際 APK 的雜湊比 aab-apk.json）、build-variant.js（建包步驟寫死）。
//   不連網、不開模擬器、不跑 gradle：測純函式與報告格式；實際建包與產 APK 的實測寫在 PR 說明。
// 用法：node --test xiangqi-lab/tools/test-p0-aab-bound-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path");
const AND = path.join(__dirname, "..", "..", "xiangqi-android", "scripts");
const rd = (f) => fs.readFileSync(path.join(AND, f), "utf8");
const { gate, validWaiver, WAIVABLE } = require(path.join(AND, "p0-gate.js"));
const { priorAttempts, roundPass } = require(path.join(AND, "check-3d.js"));
const { staleVsCdn } = require(path.join(AND, "check-aab-assets.js"));
const { cdnStale } = require(path.join(AND, "build-variant.js"));
const { readSigning, buildApksArgs } = require(path.join(AND, "aab-to-apk.js"));
const AB = require(path.join(AND, "apk-bind.js"));
const TP = require(path.join(AND, "tool-pin.js"));
/* 2026-11-23 工具鎖定：假報告記的是目前這一份工具的雜湊；假的 origin/main 也回同一份（等於工具沒改過） */
const MAIN = (p) => TP.normSha(fs.readFileSync(path.join(AND, path.basename(p))));
/* #102：閘門自己重算產物比對的結果（合格的樣子：沒有紅、沒有沒確認的黃、金絲雀都抓到）；舊版雜湊跟報告記的一樣 */
/* #102 第三輪複審：重算結果一定帶兩包的雜湊與 manifest 裡實際的 versionCode（從檔案重算時 recomputeFromFiles 會填），跟假報告 ad() 一致 */
const OLDSHA = "d".repeat(64), OKRE = { red: [], yellow: [], acked: [], allowed: 0, canaryOk: true, newSha256: "a".repeat(64), oldSha256: OLDSHA, oldCode: 26112104, newCode: 26112401, canary: { ok: true, home: { ok: true }, zeroJs: { ok: true }, jks: { ok: true }, yellow: { ok: true } }, changed: 99 };
const G = (a, b, c, w) => gate(a, b, c, w, { mainSha: MAIN, diffRe: Object.assign({}, OKRE, { newSha256: a }), oldSha: OLDSHA });
const A = "a".repeat(64), B = "b".repeat(64), K = "c".repeat(64);
const V = "20261122-0804";
const d3 = (sha, android) => ({ file: "3d-" + android + ".json", json: { tool: "P0-3D", aabSha256: sha, apkSha256: K, apkBound: true, pass: true, build: V, android, full: true, rounds: 2, roundsPassed: 2, knownFile: { fromRepo: true }, toolPins: TP.pinsFor("P0-3D") } });
/* P0-3D 金絲雀：check-3d.js --self-test 的報告（2026-11-23） */
const c3 = (sha, android) => ({ file: "3d-canary-" + android + ".json", json: { tool: "P0-3D", selfTest: true, aabSha256: sha, apkSha256: K, apkBound: true, pass: true, build: V, android, full: false, toolPins: TP.pinsFor("P0-3D") } });
/* W91（11/24）：產物比對報告（aab-diff.js --strict --old-code --json），合格的樣子 */
const ad = (sha = A, o = {}) => ({ file: "aab-diff.json", json: Object.assign({ tool: "AAB-DIFF", strict: true, newSha256: sha, oldSha256: "d".repeat(64), oldCode: "26112104", newCode: "26112401", red: [], yellow: [], acked: [], allowed: [], exitCode: 0, pass: true, args: {}, canary: { home: { ok: true }, zeroJs: { ok: true }, jks: { ok: true }, yellow: { ok: true }, ok: true }, toolPins: TP.pinsFor("AAB-DIFF") }, o) });
const ok3 = (sha = A) => [
  { file: "img.json", json: { tool: "P0-IMG", aabSha256: sha, pass: true, cdnChecked: true, exitCode: 0, siteVersion: V, red: 0, unknown: 0, redItems: [], canary: { home: true, stale: true, cdn404: true, ok: true, deep: { w21: { ok: true }, w30: { ok: true }, home: { ok: true }, hash: { ok: true }, w42: { ok: true } } }, toolPins: TP.pinsFor("P0-IMG") } },
  { file: "upd.json", json: { tool: "P0-UPD", aabSha256: sha, apkSha256: K, apkBound: true, pass: true, oldWorker: true, new: { build: V }, canary: { dialog: true }, toolPins: TP.pinsFor("P0-UPD") } },
  d3(sha, "12"), d3(sha, "16"), c3(sha, "12"), c3(sha, "16"), ad(sha)];
const has = (r, re) => r.problems.some((p) => re.test(p));

test("閘門：P0-IMG、P0-UPD、P0-3D（Android 12、16）都綁在要送審的 AAB 與版號上、都通過＝可以送審", () => {
  assert.deepEqual(G(A, V, ok3()), { ok: true, problems: [], waived: [], notes: [] });
});

test("閘門（反測必紅）：驗的是另一個 AAB、少一份、沒記雜湊、沒通過、交兩份、壞 JSON——都不能送審", () => {
  let r = G(A, V, ok3(B)); assert.equal(r.ok, false); assert.equal(r.problems.filter((p) => /另一個 AAB/.test(p)).length, 4);
  r = G(A, V, ok3().slice(0, 3)); assert.equal(r.ok, false); assert.ok(has(r, /缺 Android 16 的 P0-3D/), "P0-3D 只交 Android 12 不行");
  r = G(A, V, ok3().slice(1)); assert.ok(has(r, /缺 P0-IMG/));
  const L = ok3(); delete L[2].json.aabSha256; r = G(A, V, L); assert.ok(has(r, /沒有記 AAB 的 SHA-256/));
  const M = ok3(); M[0].json.pass = false; r = G(A, V, M); assert.ok(has(r, /P0-IMG：沒有通過/));
  r = G(A, V, [...ok3(), ok3()[2]]); assert.ok(has(r, /P0-3D（Android 12） 有兩份報告/), "同一項交兩份不行（挑過的那份）");
  r = G(A, V, [{ file: "x.json", json: null }, ...ok3()]); assert.ok(has(r, /讀不到 JSON/));
});

test("閘門：每份的版號都要等於送審版號（P0-IMG siteVersion、P0-UPD new.build、P0-3D build）", () => {
  const r = G(A, "20261123-0900", ok3());
  assert.equal(r.problems.filter((p) => /不是要送審的 20261123-0900/.test(p)).length, 6, "4 份正式報告＋2 份 P0-3D 金絲雀（2026-11-23）都要擋");
});

test("閘門：P0-IMG 要 --cdn 且 0；P0-UPD 不能 --no-old-worker；P0-3D 要完整跑、已知問題清單要用倉庫那份（PR #42 審查）", () => {
  let L = ok3(); L[0].json.cdnChecked = false; assert.ok(has(G(A, V, L), /要加 --cdn/));
  L = ok3(); L[0].json.exitCode = 3; assert.ok(has(G(A, V, L), /要加 --cdn 且結束代碼 0/));
  L = ok3(); L[1].json.oldWorker = false; assert.ok(has(G(A, V, L), /--no-old-worker/));
  L = ok3(); L[3].json.full = false; assert.ok(has(G(A, V, L), /P0-3D（Android 16）：不是完整跑/));
  L = ok3(); L[2].json.knownFile = { fromRepo: false }; assert.ok(has(G(A, V, L), /P0-3D（Android 12）：已知問題清單不是倉庫的/));
  L = ok3(); delete L[2].json.knownFile; assert.ok(has(G(A, V, L), /已知問題清單不是倉庫的/));
});

test("閘門（PR #44 審查）：P0-UPD、P0-3D 要核對過實際測的 APK（apkBound＋apkSha256）；只照抄 AAB 雜湊的不收", () => {
  let L = ok3(); delete L[1].json.apkBound; assert.ok(has(G(A, V, L), /P0-UPD：沒核對實際測的 APK/));
  L = ok3(); L[2].json.apkBound = "true"; assert.ok(has(G(A, V, L), /P0-3D（Android 12）：沒核對實際測的 APK/), "字串 true 不算");
  L = ok3(); delete L[3].json.apkSha256; assert.ok(has(G(A, V, L), /P0-3D（Android 16）：沒核對實際測的 APK/));
  L = ok3(); delete L[0].json.apkBound; assert.equal(G(A, V, L).ok, true, "P0-IMG 直接檢查 AAB，不需要 apkBound");
});

test("apk-bind：實際 APK 的 SHA-256 要等於 aab-apk.json 記的 apkSha256；不符、格式錯、檔案讀不到都不成立", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-bind-"));
  try {
    const apk = path.join(d, "x.apk"), other = path.join(d, "y.apk"), js = path.join(d, "aab-apk.json");
    fs.writeFileSync(apk, "APK-1"); fs.writeFileSync(other, "APK-2");
    fs.writeFileSync(js, JSON.stringify({ aab: "app.aab", aabSha256: A, apk: "x.apk", apkSha256: AB.sha256File(apk) }));
    const rb = AB.readBind(js); assert.ok(rb.ok);
    const ok = AB.bind(rb.rec, AB.sha256File(apk), "--new");
    assert.deepEqual(ok.fields, { aabSha256: A, apkSha256: AB.sha256File(apk), apkBound: true, aabApk: "app.aab" });
    const bad = AB.bind(rb.rec, AB.sha256File(other), "--new"); assert.equal(bad.ok, false); assert.match(bad.msg, /不是從要送審的 AAB 產生的/);
    assert.equal(AB.bind(rb.rec, "xyz").ok, false);
    assert.equal(AB.readBind(null).ok, false); assert.equal(AB.readBind(path.join(d, "none.json")).ok, false);
    fs.writeFileSync(js, JSON.stringify({ aabSha256: A })); assert.match(AB.readBind(js).msg, /缺 aabSha256／apkSha256/);
    /* 手機上拉回的 APK：pm path 只能有一個 base.apk（拆分安裝比不出來）；拉回來算雜湊 */
    const fakeAdb = (lines) => (args) => { if (args[1] === "pm") return lines; fs.copyFileSync(apk, args[2]); return "" };
    const ia = AB.installedApkSha(fakeAdb("package:/data/app/x/base.apk\n"), "pkg", d); assert.deepEqual(ia, { ok: true, sha: AB.sha256File(apk) });
    assert.equal(AB.installedApkSha(fakeAdb("package:/a/base.apk\npackage:/a/split_x.apk\n"), "pkg", d).ok, false);
    assert.ok(!fs.existsSync(path.join(d, "installed-base.apk")), "拉回的暫存 APK 要刪掉");
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("包裡素材跟 CDN 現行版交叉核對（W42）：清單內的素材不同＝✘；清單外的檔不同＝△；相同不列", () => {
  const pack = new Map([["data/a.webp", "1111111111110000"], ["data/b.json", "2222222222220000"], ["data/docs/x.md", "3333333333330000"], ["data/c.webp", "4444444444440000"]]);
  const man = { "data/a.webp": [10, "999999999999"], "data/b.json": [10, "222222222222"], "data/docs/x.md": [10, "888888888888"], "data/c.webp": [10, "444444444444"] };
  const need = new Set(["data/a.webp", "data/b.json", "data/c.webp"]);
  const r = staleVsCdn(pack, man, need);
  assert.deepEqual(r.red.map((x) => x.f), ["data/a.webp"]);
  assert.deepEqual(r.warn.map((x) => x.f), ["data/docs/x.md"]);
});

test("建包：只把「需求清單內、CDN 有、SHA-1 不同」的檔換成 CDN 現行版", () => {
  const www = new Map([["data/a.webp", "111111111111ff"], ["data/b.json", "222222222222ff"], ["data/docs/x.md", "333333333333ff"], ["data/new.webp", "555555555555ff"]]);
  const man = { "data/a.webp": [1, "999999999999"], "data/b.json": [1, "222222222222"], "data/docs/x.md": [1, "888888888888"] };
  const need = new Set(["data/a.webp", "data/b.json", "data/new.webp"]);
  assert.deepEqual(cdnStale(www, man, need), [{ f: "data/a.webp", was: "111111111111", cdn: "999999999999" }]);
});

test("aab-to-apk：簽章檔四個欄位都要有；密碼只用 file: 交給 bundletool，不出現在命令列", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-sign-"));
  try {
    const f = path.join(d, "s.properties");
    fs.writeFileSync(f, "storeFile=up.jks\nstorePassword=SECRET1\nkeyAlias=upload\nkeyPassword=SECRET2\n");
    const S = readSigning(f);
    assert.equal(S.storeFile, path.join(d, "up.jks"), "相對路徑照 properties 檔所在資料夾解析");
    const args = buildApksArgs({ jar: "bt.jar", aab: "x.aab", apks: "o.apks", signing: S, passFile: "/t/ks.pass", keyPassFile: "/t/key.pass" });
    assert.ok(!args.join(" ").includes("SECRET"), "密碼不能出現在命令列");
    assert.ok(args.includes("--mode=universal") && args.includes("--ks-pass=file:/t/ks.pass") && args.includes("--key-pass=file:/t/key.pass"));
    fs.writeFileSync(f, "storeFile=up.jks\nkeyAlias=upload\n");
    assert.throws(() => readSigning(f), /少了 storePassword/);
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("〔原始碼〕三支 P0 工具的報告都帶 tool／aabSha256／pass；建包腳本 --home-art 必填、webRemove 照變體設定", () => {
  const caa = rd("check-aab-assets.js"), up = rd("check-upgrade.js"), bv = rd("build-variant.js");
  assert.match(caa, /tool: "P0-IMG", \.\.\.sum,/); assert.match(caa, /aabSha256: crypto\.createHash\("sha256"\)/); assert.match(caa, /pass: CDN_CHECK && code === 0/);
  assert.match(up, /tool: "P0-UPD", aabSha256: null, apkSha256: null, apkBound: false,/); assert.match(up, /R\.pass = !bad\.length/);
  /* PR #44 審查：--aab-sha 只會照抄，停用；兩支都用 apk-bind 算實際 APK（check-upgrade 算 --new 檔、check-3d 拉回手機上的 base.apk） */
  const c3 = rd("check-3d.js");
  for (const [nm, t] of [["check-upgrade", up], ["check-3d", c3]]) { assert.match(t, /aabApk: arg\("--aab-apk"\)/, nm); assert.match(t, /--aab-sha 已停用/, nm); assert.ok(!/O\.aabSha\b/.test(t), nm + " 不能再用 --aab-sha 的值") }
  assert.match(up, /AB\.bind\(rb\.rec, AB\.sha256File\(O\.neu\)/); assert.match(c3, /AB\.installedApkSha\(/); assert.match(c3, /\.\.\.BIND, known:/);
  assert.match(bv, /for \(const k of \["repo", "tag", "variant", "code", "name", "homeArt", "work"\]\)/, "--home-art 跟其他參數一樣必填");
  assert.match(bv, /"--home-art", path\.resolve\(O\.homeArt\)/, "make-www.js 一定帶 --home-art");
  assert.match(bv, /for \(const r of VM\.webRemove \|\| \[\]\)/);
  /* 開發者電腦／公開倉庫的 source/ 底下，或 run-tests 暫存配置裡掛在 xiangqi-lab/site（＝倉庫根目錄）底下；兩處都沒有就失敗（不略過） */
  const VMF = [path.join(__dirname, "..", "..", "xiangqi-android-variants"), path.join(__dirname, "..", "site", "source", "xiangqi-android-variants")]
    .map((d) => path.join(d, "mini-26112104", "VARIANT-MANIFEST.json")).find((f) => fs.existsSync(f));
  assert.ok(VMF, "找得到 mini-26112104 的 VARIANT-MANIFEST.json");
  const vm = JSON.parse(fs.readFileSync(VMF, "utf8"));
  assert.deepEqual(vm.webRemove, ["data/docs/evidence"]);
  for (const f of ["aab-to-apk.js", "p0-gate.js", "build-variant.js", "apk-bind.js", "check-upgrade.js", "check-3d.js"]) assert.ok(!rd(f).includes("\r"), f + " 不能有 CR");
});

/* ===== W69 流程盤點第 5 項（11/23）：P0-3D 同一次連續 2 輪全過、嘗試紀錄、倉庫豁免檔 ===== */
test("閘門：P0-3D 要同一次執行連續 2 輪全過（只跑 1 輪、第 2 輪沒過、沒寫 rounds 的都不收）", () => {
  let L = ok3(); L[2].json.rounds = 1; L[2].json.roundsPassed = 1; assert.ok(has(G(A, V, L), /P0-3D（Android 12）：要同一次執行連續 2 輪全過/));
  L = ok3(); L[3].json.roundsPassed = 1; assert.ok(has(G(A, V, L), /P0-3D（Android 16）：要同一次執行連續 2 輪全過/));
  L = ok3(); delete L[2].json.rounds; delete L[2].json.roundsPassed; assert.ok(has(G(A, V, L), /連續 2 輪/));
  L = ok3(); L[2].json.rounds = 3; L[2].json.roundsPassed = 3; assert.equal(G(A, V, L).ok, true, "跑 3 輪全過也行");
});

test("閘門：之前失敗過的嘗試照實列出（notes），不擋", () => {
  const L = ok3(); L[2].json.failedBefore = 2; L[2].json.attempt = 3;
  const r = G(A, V, L); assert.equal(r.ok, true); assert.deepEqual(r.notes, ["P0-3D（Android 12）：這個 AAB 之前失敗過 2 次（這份是第 3 次嘗試）"]);
});

test("check-3d：每一輪都要全過；嘗試紀錄只算同一個 AAB＋同一個 Android 版本", () => {
  assert.equal(roundPass([{ pass: true }, { pass: null, known: "W12" }]), true);
  assert.equal(roundPass([{ pass: true }, { pass: false }]), false);
  assert.equal(roundPass([{ pass: null }]), false, "沒列在已知清單的 null 不算過");
  assert.equal(roundPass([]), false);
  const lines = [{ aabSha256: A, android: "12", pass: false }, { aabSha256: A, android: "12", pass: true }, { aabSha256: A, android: "16", pass: false }, { aabSha256: B, android: "12", pass: false }]
    .map((x) => JSON.stringify(x)).concat(["壞掉的一行"]);
  assert.deepEqual(priorAttempts(lines, A, "12"), { before: 2, failedBefore: 1 });
  assert.deepEqual(priorAttempts(lines, A, "16"), { before: 1, failedBefore: 1 });
  assert.deepEqual(priorAttempts([], A, "12"), { before: 0, failedBefore: 0 });
});

test("豁免：只認齊全、綁同一個 AAB、在可豁免清單裡的；轉述或缺欄位的不算", () => {
  const W = (o = {}) => ({ code: "P0-IMG/cdn", aabSha256: A, reason: "CDN 維護中無法交叉核對", decidedBy: "開發者（Windows Claude 1）", decidedAt: "2026-11-23", ...o });
  assert.ok(validWaiver(W(), A));
  assert.ok(!validWaiver(W(), B), "別的 AAB 不行");
  assert.ok(!validWaiver(W({ reason: "可" }), A), "原因太短");
  assert.ok(!validWaiver(W({ decidedBy: "" }), A), "沒寫決定人");
  assert.ok(!validWaiver(W({ decidedAt: "11/23" }), A), "日期格式");
  assert.ok(!validWaiver(W({ code: "P0-UPD/pass" }), A), "不在可豁免清單");
  assert.deepEqual(WAIVABLE, ["P0-IMG/cdn", "P0-UPD/old-worker", "P0-3D/partial", "P0-3D/rounds"]);
});

test("豁免：P0-IMG 缺驗（結束代碼 3）有倉庫豁免就放行並列出；沒有就擋；不可豁免的照擋", () => {
  const L = ok3(); Object.assign(L[0].json, { exitCode: 3, pass: false, unknown: 2, warn: 2, cdnCompared: 0, viaCdn: 0, inPack: 1, need: 1, warnItems: [{ f: "data/__xq_p0_canary_0123456789ab.webp", st: -1, why: "CDN 沒確認到（連不上，請稍後重跑 --cdn）" }, { f: "cdn-manifest.json", why: "讀不到 CDN 的 cdn-manifest.json，沒能核對包裡的檔是不是 CDN 現行版（缺驗）" }] });
  L[0].json.canary = { ...L[0].json.canary, cdn404: false, cdnUnreachable: true, cdnStatus: -1, ok: false, cdn: "沒確認到（CDN 連不上或暫時出錯，沒拿到 HTTP 狀態）", homeFile: "data/homemap/home_classic.webp", staleFile: "data/a/x.webp", deep: { w21: { ok: true }, w30: { ok: true }, home: { ok: true }, hash: { ok: true }, w42: { ok: false, skip: "沒有 CDN manifest" } } };   /* 第九、十次複審：CDN 全斷時的真報告（逐項清單） */
  let r = G(A, V, L); assert.equal(r.ok, false); assert.ok(has(r, /P0-IMG：要加 --cdn 且結束代碼 0/)); assert.ok(!has(r, /P0-IMG：沒有通過/), "缺驗歸在可豁免那一條");
  const w = { code: "P0-IMG/cdn", aabSha256: A, reason: "CDN 維護中無法交叉核對", decidedBy: "開發者", decidedAt: "2026-11-23" };
  /* PR #66 第六次複審：缺驗的豁免要閘門自己也連不上 CDN（cdnProbe.reachable＝false）；沒探測或連得上都不放行 */
  r = G(A, V, L, [w]); assert.equal(r.ok, false, "閘門沒自己探測 CDN：不放行");
  const DOWN = { reachable: false, detail: "假：閘門也連不上" };
  r = gate(A, V, L, [w], { mainSha: MAIN, cdnProbe: DOWN, diffRe: OKRE, oldSha: OLDSHA }); assert.equal(r.ok, true); assert.equal(r.waived.length, 3, "CDN 全斷的真報告：「要加 --cdn」、金絲雀③、深層 W42 沒驗三條都掛 P0-IMG/cdn"); assert.match(r.waived[0], /已豁免：CDN 維護中/);
  r = gate(A, V, L, [w], { mainSha: MAIN, cdnProbe: { reachable: true, detail: "假：連得上" }, diffRe: OKRE, oldSha: OLDSHA }); assert.equal(r.ok, false, "閘門連得上：不放行");
  r = gate(A, V, L, [{ ...w, aabSha256: B }], { mainSha: MAIN, cdnProbe: DOWN, diffRe: OKRE, oldSha: OLDSHA }); assert.equal(r.ok, false, "綁別的 AAB 的豁免不算");
  const M = ok3(); M[0].json.pass = false; M[0].json.exitCode = 1;
  r = G(A, V, M, [w]); assert.ok(has(r, /P0-IMG：沒有通過/), "真的沒過（結束代碼 1）不能豁免");
  const N = ok3(B); r = G(A, V, N, [w, { ...w, code: "P0-3D/rounds" }]); assert.equal(r.problems.filter((p) => /另一個 AAB/.test(p)).length, 4, "AAB 不符不能豁免");
});

test("豁免：P0-3D 的豁免可以只針對一個 Android 版本", () => {
  const L = ok3(); L[2].json.rounds = 1; L[2].json.roundsPassed = 1; L[3].json.rounds = 1; L[3].json.roundsPassed = 1;
  const w = { code: "P0-3D/rounds", android: "12", aabSha256: A, reason: "Android 12 模擬器第二輪逾時", decidedBy: "開發者", decidedAt: "2026-11-23" };
  const r = G(A, V, L, [w]);
  assert.equal(r.waived.length, 1); assert.ok(has(r, /P0-3D（Android 16）：要同一次執行連續 2 輪/)); assert.ok(!has(r, /P0-3D（Android 12）：要同一次執行連續 2 輪/));
});

test("〔原始碼〕check-3d 預設跑 2 輪、每次嘗試都寫 attempts.jsonl；p0-gate 只認倉庫 .github/p0-waivers.json；豁免檔是空的", () => {
  const c3 = rd("check-3d.js"), pg = rd("p0-gate.js");
  assert.match(c3, /rounds: Number\(arg\("--rounds", 2\)\)/); assert.match(c3, /fs\.appendFileSync\(AF, JSON\.stringify\(/); assert.match(c3, /if \(!roundPass\(RR\)\) break;/);
  assert.match(c3, /\}\)\(\)\.catch\(\(e\) => \{ logAttempt\(\{ pass: false, unfit: e instanceof Unfit/, "環境不成立、例外結束也寫嘗試紀錄（PR #58 審查）");
  assert.match(pg, /const r = gate\(sha, BUILD, reports, fromRepo \? waivers : \[\], \{ mainSha, cdnProbe, diffRe, oldSha \}\);/);   /* #102：閘門自己重算產物比對的結果也傳進去 */
  const WF = [path.join(__dirname, "..", "..", "..", ".github", "p0-waivers.json"), path.join(__dirname, "..", "site", ".github", "p0-waivers.json")].find((f) => fs.existsSync(f));
  assert.ok(WF, "倉庫有 .github/p0-waivers.json");
  const wj = JSON.parse(fs.readFileSync(WF, "utf8")); assert.ok(Array.isArray(wj.items));
  for (const it of wj.items) assert.ok(it.aabSha256 && it.reason && it.decidedBy && it.decidedAt, "每筆豁免都要齊全");
});

/* ===== PR #58 審查（iMac Claude 2）：豁免檔、已知問題清單要跟 origin/main 逐位元組一樣，本機改過的不算 ===== */
test("repo-pin：本機檔跟 origin/main 一樣才算；不一樣、main 沒有、fetch 失敗、不在 git 裡都不算", () => {
  const { sameAsMain } = require(path.join(AND, "repo-pin.js"));
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-pin-"));
  try {
    const f = path.join(d, ".github", "p0-waivers.json"); fs.mkdirSync(path.dirname(f)); fs.writeFileSync(f, '{"items":[]}\n');
    /* PR #58 複審：比 blob id（hash-object --path 會照倉庫換行設定轉換），不比位元組——autocrlf 工作區是 CRLF 也不誤判 */
    const B1 = "1".repeat(40), B2 = "2".repeat(40);
    const calls = [];
    const fake = ({ main = B1, local = B1, fetchFail = false, showFail = false, notRepo = false } = {}) => (args, cwd) => {
      calls.push(args[0] + (args[1] === "--show-toplevel" ? ":top" : ""));
      if (args[0] === "rev-parse" && args[1] === "--show-toplevel") { if (notRepo) throw new Error("not a git repo"); return Buffer.from(d + "\n") }
      if (args[0] === "fetch") { if (fetchFail) throw new Error("offline"); return Buffer.from("") }
      if (args[0] === "rev-parse") { assert.equal(args[1], "origin/main:.github/p0-waivers.json"); if (showFail) throw new Error("no such path"); return Buffer.from(main + "\n") }
      if (args[0] === "hash-object") { assert.equal(args[1], "--path=.github/p0-waivers.json"); return local + "\n" }
      throw new Error("unexpected " + args[0]);
    };
    assert.equal(sameAsMain(f, fake()).ok, true);
    assert.ok(calls.indexOf("fetch") >= 0 && calls.indexOf("fetch") < calls.lastIndexOf("rev-parse"), "先 fetch 再查 origin/main");
    assert.match(sameAsMain(f, fake({ local: B2 })).msg, /跟 origin\/main 那份不一樣/, "內容改過＝blob 不同");
    fs.writeFileSync(f, '{"items":[]}\r\n'); assert.equal(sameAsMain(f, fake()).ok, true, "工作區 CRLF、轉換後 blob 一樣＝沒改過，不誤擋");
    assert.match(sameAsMain(f, fake({ main: "xyz" })).msg, /blob id 格式不對/);
    assert.match(sameAsMain(f, fake({ showFail: true })).msg, /origin\/main 沒有/);
    assert.match(sameAsMain(f, fake({ fetchFail: true })).msg, /fetch origin main 失敗/);
    assert.match(sameAsMain(f, fake({ notRepo: true })).msg, /不在 git 倉庫裡/);
    assert.equal(sameAsMain(path.join(d, ".github", "none.json"), fake()).ok, false, "讀不到本機檔");
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});

test("〔原始碼〕p0-gate 用倉庫豁免檔、check-3d 用倉庫已知問題清單時，都先跟 origin/main 比，不一樣就結束代碼 2", () => {
  const pg = rd("p0-gate.js"), c3 = rd("check-3d.js");
  assert.match(pg, /if \(fromRepo\) \{ const pin = require\("\.\/repo-pin\.js"\)\.sameAsMain\(REPO_W\); if \(!pin\.ok\) \{ console\.error\("✘ " \+ pin\.msg\); process\.exit\(2\) \} \}/);
  assert.match(c3, /if \(KNOWN_FROM_REPO\) \{ const pin = require\("\.\/repo-pin\.js"\)\.sameAsMain\(REPO_KNOWN\); if \(!pin\.ok\) \{ console\.error\("測試不成立：" \+ pin\.msg\); process\.exit\(2\) \} \}/);
  assert.ok(!rd("repo-pin.js").includes("\r"));
});
