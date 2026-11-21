// W43（11/21）：Cloudflare PR 預覽的建置步驟 source/preview-build.js
//   版號要換對（跟 sw.js 一致，不然預覽站會跳更新提示）、超過 25 MB 的檔要刪（Pages 上限）、要有 404.html（不然找不到的檔回首頁 200）。
//   不跑 check-build（--skip-build），不連網。用法：node --test xiangqi-lab/tools/test-preview-build-1121.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const PB = path.join(__dirname, "..", "site", "source", "preview-build.js");   /* run-tests 把倉庫根目錄連成 xiangqi-lab/site */
const { stampBuild, bigFiles, LIMIT } = require(PB);
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });
const tmp = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-pvb-")); made.push(d); return d };
const HTML = '<script>window.XQ_OFFLINE=true;window.XQ_BUILD="__BUILD__";</script>';

test("版號：把 __BUILD__ 換成 release.json 的版號", () => {
  assert.equal(stampBuild(HTML, "20261121-0643"), '<script>window.XQ_OFFLINE=true;window.XQ_BUILD="20261121-0643";</script>');
});

test("版號：找不到佔位字、版號格式不對都要停，不部署版號錯的預覽", () => {
  assert.throws(() => stampBuild('window.XQ_BUILD="20261121-0643"', "20261121-0643"), /找不到/);
  assert.throws(() => stampBuild(HTML, "__BUILD__"), /版號不對/);
  assert.throws(() => stampBuild(HTML, ""), /版號不對/);
});

test("大檔：Pages 單檔上限 25 MB；挑出超過上限的檔，不進 .git", () => {
  assert.equal(LIMIT, 25 * 1024 * 1024);
  const d = tmp();
  fs.mkdirSync(path.join(d, "engine")); fs.mkdirSync(path.join(d, ".git"));
  fs.writeFileSync(path.join(d, "engine", "big.nnue"), "x".repeat(50));
  fs.writeFileSync(path.join(d, "small.js"), "x".repeat(5));
  fs.writeFileSync(path.join(d, ".git", "pack"), "x".repeat(50));
  assert.deepEqual(bigFiles(d, 10), ["engine/big.nnue"]);
});

test("整套（不組版）：換好版號、寫 404.html；sw.js 版號不一致就失敗", () => {
  const d = tmp();
  fs.writeFileSync(path.join(d, "index.html"), HTML);
  fs.writeFileSync(path.join(d, "release.json"), JSON.stringify({ version: "20261121-0643" }));
  fs.writeFileSync(path.join(d, "sw.js"), 'const VERSION="20261121-0643";');
  const ok = cp.spawnSync(process.execPath, [PB, "--root", d, "--skip-build"], { encoding: "utf8" });
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(fs.readFileSync(path.join(d, "index.html"), "utf8"), /XQ_BUILD="20261121-0643"/);
  assert.equal(fs.readFileSync(path.join(d, "404.html"), "utf8"), "Not found\n");
  const e = tmp();
  fs.writeFileSync(path.join(e, "index.html"), HTML);
  fs.writeFileSync(path.join(e, "release.json"), JSON.stringify({ version: "20261121-0643" }));
  fs.writeFileSync(path.join(e, "sw.js"), 'const VERSION="20261121-0133";');
  const bad = cp.spawnSync(process.execPath, [PB, "--root", e, "--skip-build"], { encoding: "utf8" });
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  assert.match(bad.stderr, /sw\.js 的 VERSION（20261121-0133）跟 release\.json（20261121-0643）不一致/);
});
