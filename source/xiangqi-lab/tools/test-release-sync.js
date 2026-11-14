// 同版閘門 release-sync-check.js 的測試（評比第 17 輪 F1）：用假的小倉庫（暫存資料夾）逐項弄壞，確認每一種不一致都會擋、結束代碼是 1；
// 刻意不發布的程式行用測試自己編的一行當指紋（不碰真的指紋檔、不印任何真的程式行）。不連網、不開瀏覽器。
// 用法：node --test xiangqi-lab/tools/test-release-sync.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process"), crypto = require("crypto");
const RS = require("./release-sync-check.js");
const TOOL = path.join(__dirname, "release-sync-check.js");
const sha1_12 = b => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12), sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const V = "20261113-2000", SECRET = "const fakePrivateBridge = makeBridge({ hidden: true, reason: 'test-only' });";

/* 一份「全部同版」的假倉庫；o 可以改掉某一處 */
function repo(o = {}) {
  const D = fs.mkdtempSync(path.join(os.tmpdir(), "xq-rs-test-")); TMP.push(D); const w = (rel, s) => { const p = path.join(D, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s) };
  const html = `<!doctype html><script>window.XQ_BUILD="${V}";</script>`, sw = `const VERSION="${V}";`;
  w("index.html", html); w("sw.js", sw);
  w("release.json", JSON.stringify({ version: V, html: sha1_12(html), sw: sha1_12(sw) }));
  w("source/STAGE-MANIFEST.json", JSON.stringify({ commit: "0".repeat(40), version: o.manifestV || V, indexSha1: sha1_12(html) }));
  w("source/check-build.js", `process.exit(${o.buildFail ? 1 : 0})`);
  const lv = o.logV || V;
  w(`source/verification-log-${lv}.txt`, `release.json：版本 ${lv}、html x\n  index.html  ${o.logSha || sha256(html)}  (x)\n第 1 步 check-build：通過（結束代碼 0）\n第 2 步 run-tests：${o.stepFail ? "失敗" : "通過"}（結束代碼 0）\n`);
  if (o.extraLog) w("source/verification-log-20261113-1345.txt", "舊的");
  w("data/docs/evidence.md", `# 驗證紀錄（版本 ${o.evTitleV || V}）\n\n- 測試對象：公開倉庫的 \`source/\`，對應的發布版：\`${o.evV || V}\`。\n`);
  w("data/docs/foss.md", o.fossNoMark ? "# 開源\n公開原始碼對應線上發布版。\n" : `# 開源\n**這一頁和 \`source/\` 對應的發布版：\`${o.fossV || V}\`**\n`);
  w("source/xiangqi-db/m/07y-hubmap.js", "const ok = 1;\n" + (o.leak ? "    " + SECRET.replace(/ /g, "  ") + "\n" : ""));
  if (o.cupHost) w("source/xiangqi-lab/tools/cup-host.js", "// 裁判台");
  if (o.keystore) w("source/xiangqi-android/android/app/upload.jks", "x");
  if (o.signing) w("source/xiangqi-android/signing.properties", "storePassword=x");
  return D;
}
const TMP = [];
test.after(() => { for (const d of TMP) fs.rmSync(d, { recursive: true, force: true }) });
const PF = (() => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-rs-pf-")); TMP.push(d); const base = path.join(d, "base.js"), from = path.join(d, "from.js"), out = path.join(d, "private.json");
  fs.writeFileSync(base, "const ok = 1;\n"); fs.writeFileSync(from, "const ok = 1;\n" + SECRET + "\n"); RS.makePrivate(from, base, out, "測試用"); return out })();
const run = (D, extra = {}) => RS.checkAll(Object.assign({ dir: D, privateFile: PF, requirePrivate: true, skip: ["secrets"] }, extra));
const failed = r => r.checks.filter(c => !c.ok).map(c => c.id);

test("全部同版：每一項都過（private-lines 用測試自己的指紋）", () => {
  const r = run(repo());
  assert.equal(r.ok, true, JSON.stringify(r.checks, null, 1)); assert.equal(r.version, V);
  assert.deepEqual(r.checks.map(c => c.id), ["release", "stage-manifest", "check-build", "verification-log", "evidence", "foss", "forbidden-files", "private-lines", "secrets"]);
});
test("evidence.md 還是舊版（標題、標記）：擋", () => {
  assert.deepEqual(failed(run(repo({ evTitleV: "20261113-0825" }))), ["evidence"]);
  assert.deepEqual(failed(run(repo({ evV: "20261113-0825" }))), ["evidence"]);
});
test("foss.md 沒有對應發布版的標記、或標的是別版：擋", () => {
  assert.deepEqual(failed(run(repo({ fossNoMark: true }))), ["foss"]);
  assert.deepEqual(failed(run(repo({ fossV: "20261113-1345" }))), ["foss"]);
});
test("source/ 是別版切的（STAGE-MANIFEST 版本不同）、組不出發布的 index.html：擋", () => {
  assert.deepEqual(failed(run(repo({ manifestV: "20261113-1345" }))), ["stage-manifest"]);
  assert.deepEqual(failed(run(repo({ buildFail: true }))), ["check-build"]);
});
test("驗證紀錄：別版的、雜湊不對、有一步失敗、多留一份舊的：擋", () => {
  assert.deepEqual(failed(run(repo({ logV: "20261113-1345" }))), ["verification-log"]);
  assert.deepEqual(failed(run(repo({ logSha: "f".repeat(64) }))), ["verification-log"]);
  assert.deepEqual(failed(run(repo({ stepFail: true }))), ["verification-log"]);
  assert.deepEqual(failed(run(repo({ extraLog: true }))), ["verification-log"]);
});
test("刻意不發布的程式行（縮排、空白改過也一樣）出現在公開的檔：擋，訊息只有檔名行號、沒有內容", () => {
  const r = run(repo({ leak: true })), c = r.checks.find(x => x.id === "private-lines");
  assert.deepEqual(failed(r), ["private-lines"]);
  assert.match(c.msg, /source\/xiangqi-db\/m\/07y-hubmap\.js 第 2 行/);
  assert.ok(!c.msg.includes("fakePrivateBridge") && !c.msg.includes("makeBridge"), "不能印出內容");
  const pj = JSON.parse(fs.readFileSync(PF, "utf8"));
  assert.equal(pj.hashes.length, 1); assert.ok(!JSON.stringify(pj).includes("fakePrivateBridge"), "指紋檔只存雜湊");
});
test("沒有指紋檔：外部核對時略過（不算通過也不擋）；開發者發布加 --require-private 就擋", () => {
  const D = repo(), none = path.join(os.tmpdir(), "沒有這個檔-" + Date.now() + ".json");
  const a = RS.checkAll({ dir: D, privateFile: none, skip: ["secrets"] }), b = RS.checkAll({ dir: D, privateFile: none, requirePrivate: true, skip: ["secrets"] });
  assert.equal(a.ok, true); assert.equal(a.checks.find(c => c.id === "private-lines").skipped, true);
  assert.deepEqual(failed(b), ["private-lines"]);
});
test("裁判台 cup-host.js、簽章金鑰、簽章設定檔出現在公開的檔：擋", () => {
  for (const o of [{ cupHost: true }, { keystore: true }, { signing: true }]) {
    const r = run(repo(o)); assert.deepEqual(failed(r), ["forbidden-files"], JSON.stringify(o));
  }
});
test("指令列：一致 0、不一致 1、讀不到 2；--stamp 把 foss.md 的標記改成指定版本", () => {
  const ok = cp.spawnSync(process.execPath, [TOOL, "--dir", repo(), "--private", PF, "--require-private", "--skip", "secrets"], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stdout);
  const bad = cp.spawnSync(process.execPath, [TOOL, "--dir", repo({ evTitleV: "20261113-0825" }), "--private", PF, "--skip", "secrets"], { encoding: "utf8" });
  assert.equal(bad.status, 1); assert.match(bad.stdout, /不准發布/);
  assert.equal(cp.spawnSync(process.execPath, [TOOL, "--dir", path.join(os.tmpdir(), "沒有這個資料夾-" + Date.now())], { encoding: "utf8" }).status, 2);
  const D = repo({ fossV: "20261113-1345" }), f = path.join(D, "data/docs/foss.md");
  assert.equal(cp.spawnSync(process.execPath, [TOOL, "--stamp", V, f], { encoding: "utf8" }).status, 0);
  assert.match(fs.readFileSync(f, "utf8"), new RegExp("對應的發布版：`" + V + "`"));
  assert.equal(run(D).ok, true);
});
