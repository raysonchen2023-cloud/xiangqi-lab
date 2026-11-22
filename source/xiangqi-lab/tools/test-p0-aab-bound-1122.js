// W69 流程盤點第 3 項（11/22）：P0 證據要綁住「實際送審的 AAB」，建包腳本收進倉庫。
//   aab-to-apk.js（從送審 AAB 產 P0 用 APK）、p0-gate.js（三份 P0 報告都綁同一個 AAB 才能送審）、
//   check-aab-assets.js（包裡素材跟 CDN 現行版交叉核對、報告帶 AAB 雜湊）、check-upgrade.js（--aab-sha）、build-variant.js（建包步驟寫死）。
//   不連網、不開模擬器、不跑 gradle：測純函式與報告格式；實際建包與產 APK 的實測寫在 PR 說明。
// 用法：node --test xiangqi-lab/tools/test-p0-aab-bound-1122.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path");
const AND = path.join(__dirname, "..", "..", "xiangqi-android", "scripts");
const rd = (f) => fs.readFileSync(path.join(AND, f), "utf8");
const { gate } = require(path.join(AND, "p0-gate.js"));
const { staleVsCdn } = require(path.join(AND, "check-aab-assets.js"));
const { cdnStale } = require(path.join(AND, "build-variant.js"));
const { readSigning, buildApksArgs } = require(path.join(AND, "aab-to-apk.js"));
const A = "a".repeat(64), B = "b".repeat(64);
const V = "20261122-0804";
const d3 = (sha, android) => ({ file: "3d-" + android + ".json", json: { tool: "P0-3D", aabSha256: sha, pass: true, build: V, android, full: true, knownFile: { fromRepo: true } } });
const ok3 = (sha = A) => [
  { file: "img.json", json: { tool: "P0-IMG", aabSha256: sha, pass: true, cdnChecked: true, exitCode: 0, siteVersion: V } },
  { file: "upd.json", json: { tool: "P0-UPD", aabSha256: sha, pass: true, oldWorker: true, new: { build: V } } },
  d3(sha, "12"), d3(sha, "16")];
const has = (r, re) => r.problems.some((p) => re.test(p));

test("閘門：P0-IMG、P0-UPD、P0-3D（Android 12、16）都綁在要送審的 AAB 與版號上、都通過＝可以送審", () => {
  assert.deepEqual(gate(A, V, ok3()), { ok: true, problems: [] });
});

test("閘門（反測必紅）：驗的是另一個 AAB、少一份、沒記雜湊、沒通過、交兩份、壞 JSON——都不能送審", () => {
  let r = gate(A, V, ok3(B)); assert.equal(r.ok, false); assert.equal(r.problems.filter((p) => /另一個 AAB/.test(p)).length, 4);
  r = gate(A, V, ok3().slice(0, 3)); assert.equal(r.ok, false); assert.ok(has(r, /缺 Android 16 的 P0-3D/), "P0-3D 只交 Android 12 不行");
  r = gate(A, V, ok3().slice(1)); assert.ok(has(r, /缺 P0-IMG/));
  const L = ok3(); delete L[2].json.aabSha256; r = gate(A, V, L); assert.ok(has(r, /沒有記 AAB 的 SHA-256/));
  const M = ok3(); M[0].json.pass = false; r = gate(A, V, M); assert.ok(has(r, /P0-IMG：沒有通過/));
  r = gate(A, V, [...ok3(), ok3()[2]]); assert.ok(has(r, /P0-3D（Android 12） 有兩份報告/), "同一項交兩份不行（挑過的那份）");
  r = gate(A, V, [{ file: "x.json", json: null }, ...ok3()]); assert.ok(has(r, /讀不到 JSON/));
});

test("閘門：每份的版號都要等於送審版號（P0-IMG siteVersion、P0-UPD new.build、P0-3D build）", () => {
  const r = gate(A, "20261123-0900", ok3());
  assert.equal(r.problems.filter((p) => /不是要送審的 20261123-0900/.test(p)).length, 4);
});

test("閘門：P0-IMG 要 --cdn 且 0；P0-UPD 不能 --no-old-worker；P0-3D 要完整跑、已知問題清單要用倉庫那份（PR #42 審查）", () => {
  let L = ok3(); L[0].json.cdnChecked = false; assert.ok(has(gate(A, V, L), /要加 --cdn/));
  L = ok3(); L[0].json.exitCode = 3; assert.ok(has(gate(A, V, L), /要加 --cdn 且結束代碼 0/));
  L = ok3(); L[1].json.oldWorker = false; assert.ok(has(gate(A, V, L), /--no-old-worker/));
  L = ok3(); L[3].json.full = false; assert.ok(has(gate(A, V, L), /P0-3D（Android 16）：不是完整跑/));
  L = ok3(); L[2].json.knownFile = { fromRepo: false }; assert.ok(has(gate(A, V, L), /P0-3D（Android 12）：已知問題清單不是倉庫的/));
  L = ok3(); delete L[2].json.knownFile; assert.ok(has(gate(A, V, L), /已知問題清單不是倉庫的/));
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
  assert.match(up, /tool: "P0-UPD", aabSha256:/); assert.match(up, /R\.pass = !bad\.length/); assert.match(up, /aabSha: arg\("--aab-sha"\)/);
  assert.match(bv, /for \(const k of \["repo", "tag", "variant", "code", "name", "homeArt", "work"\]\)/, "--home-art 跟其他參數一樣必填");
  assert.match(bv, /"--home-art", path\.resolve\(O\.homeArt\)/, "make-www.js 一定帶 --home-art");
  assert.match(bv, /for \(const r of VM\.webRemove \|\| \[\]\)/);
  /* 開發者電腦／公開倉庫的 source/ 底下，或 run-tests 暫存配置裡掛在 xiangqi-lab/site（＝倉庫根目錄）底下；兩處都沒有就失敗（不略過） */
  const VMF = [path.join(__dirname, "..", "..", "xiangqi-android-variants"), path.join(__dirname, "..", "site", "source", "xiangqi-android-variants")]
    .map((d) => path.join(d, "mini-26112104", "VARIANT-MANIFEST.json")).find((f) => fs.existsSync(f));
  assert.ok(VMF, "找得到 mini-26112104 的 VARIANT-MANIFEST.json");
  const vm = JSON.parse(fs.readFileSync(VMF, "utf8"));
  assert.deepEqual(vm.webRemove, ["data/docs/evidence"]);
  for (const f of ["aab-to-apk.js", "p0-gate.js", "build-variant.js"]) assert.ok(!rd(f).includes("\r"), f + " 不能有 CR");
});
