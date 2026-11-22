// 發布 PR 產物守門 guard-release-pr.cjs 的自我測試（W69 流程盤點第 2 項）
//   用假的查詢函式（src、素材原始資料、CDN 清單）逐條驗判斷規則；不連網、不讀倉庫。
// 用法：node --test .github/scripts/test-release-guard.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const { judgeOne, judge, parseNameStatus } = require("./guard-release-pr.cjs");
const NUL = String.fromCharCode(0);

/* 假的倉庫：src 有 park3d.js（同一份）與 net.js（不同）；art 有 zmhall/screen-errata.json（同）與 zmhall/screen-abacus.json（不同）；
   CDN 清單有 data/canju/a.json（大小 10、sha12 aaaaaaaaaaaa）與 engine/pikafish.wasm */
const ctx = {
  manifest: { "data/canju/a.json": [10, "aaaaaaaaaaaa"], "engine/pikafish.wasm": [99, "bbbbbbbbbbbb"] },
  srcHas: (f) => f === "park3d.js" || f === "net.js",
  srcSame: (f) => f === "park3d.js",
  artHas: (r) => r === "zmhall/screen-errata.json" || r === "zmhall/screen-abacus.json",
  artSame: (r) => r === "zmhall/screen-errata.json",
  info: (f) => f === "data/canju/a.json" ? { size: 10, sha12: "aaaaaaaaaaaa" } : { size: 99, sha12: "cccccccccccc" },
};
const ok = (status, p) => assert.equal(judgeOne({ status, path: p }, ctx).ok, true, status + " " + p + " 應該放行");
const no = (status, p) => assert.equal(judgeOne({ status, path: p }, ctx).ok, false, status + " " + p + " 應該擋");

test("發布產物放行；驗證紀錄可以以新換舊，其他發布產物不能刪", () => {
  for (const p of ["index.html", "sw.js", "release.json", "data/docs/evidence.md", "data/docs/foss.md", "source/STAGE-MANIFEST.json", "source/verification-log-20261122-0804.txt"]) ok("M", p);
  ok("A", "source/verification-log-20261123-1200.txt");
  ok("D", "source/verification-log-20261121-0643.txt");
  for (const p of ["index.html", "release.json", "data/docs/evidence.md", "source/STAGE-MANIFEST.json"]) no("D", p);
});

test("根目錄 js 要跟 source/xiangqi-lab/src 同一份；src 沒有的根目錄檔不准", () => {
  ok("M", "park3d.js");
  no("M", "net.js");
  no("A", "evil.js");
  no("M", "core.js");
  no("D", "park3d.js");
});

test("data 有素材原始資料就要跟原始資料同一份；CDN 有登記就要大小與雜湊都一樣", () => {
  ok("A", "data/zmhall/screen-errata.json");
  no("A", "data/zmhall/screen-abacus.json");
  ok("M", "data/canju/a.json");
  no("M", "engine/pikafish.wasm");
});

test("只放 GitHub 的小檔放行；CDN 沒有、也沒有原始資料的 data 檔要擋；刪 data 檔放行（列給審查）", () => {
  for (const p of ["data/preload.json", "data/big-books.json", "data/banlist.json", "data/docs/evidence/01_首頁.png"]) ok("M", p);
  no("A", "data/canju/new-unknown.json");
  no("A", "engine/other.bin");
  ok("D", "data/canju/old.json");
});

test("source/ 的程式、.github/、其他路徑一律擋（要走功能 PR）", () => {
  for (const p of ["source/xiangqi-db/m/02-shell.js", "source/xiangqi-lab/tools/testkinds.js", ".github/scripts/check-test-skips.cjs", ".github/workflows/verify.yml",
    ".github/test-skip-allow.json", "README.md", "releases/android.md", "source/xiangqi-db/art/zmhall/screen-errata.json"]) no("M", p);
  const R = judge([{ status: "M", path: "index.html" }, { status: "M", path: ".github/workflows/verify.yml" }], ctx);
  assert.deepEqual(R.map((x) => x.ok), [true, false]);
  assert.ok(R[1].why.includes("功能 PR"));
});

test("讀 git diff --name-status -z：狀態取第一個字、路徑照原樣（含中文）", () => {
  const z = ["M", "index.html", "A", "data/docs/evidence/02_中文.png", "D", "source/verification-log-x.txt", ""].join(NUL);
  assert.deepEqual(parseNameStatus(z), [{ status: "M", path: "index.html" }, { status: "A", path: "data/docs/evidence/02_中文.png" }, { status: "D", path: "source/verification-log-x.txt" }]);
});

test("verify.yml 在發布模式跑這支、分支名不直接嵌進指令", () => {
  const y = fs.readFileSync(path.join(__dirname, "..", "workflows", "verify.yml"), "utf8");
  const i = y.indexOf("guard-release-pr.cjs");
  assert.ok(i > 0, "verify.yml 要跑 guard-release-pr.cjs");
  const block = y.slice(y.lastIndexOf("- name:", i), i + 60);
  assert.match(block, /if: steps\.mode\.outputs\.mode == 'release'/);
  assert.match(block, /run: node \.github\/scripts\/guard-release-pr\.cjs "origin\/\$BASE_REF"/);
});
