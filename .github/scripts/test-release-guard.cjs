// 發布 PR 產物守門 guard-release-pr.cjs 的自我測試（W69 流程盤點第 2 項）
//   用假的查詢函式（src、素材原始資料、CDN 清單、preload、evidence.md）逐條驗判斷規則，主流程用假的 git 與 CDN 跑；不連網、不讀倉庫。
// 用法：node --test .github/scripts/test-release-guard.cjs
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const { judgeOne, judge, parseNameStatus, preloadMismatch, runReleaseGuard } = require("./guard-release-pr.cjs");
const { STEPS } = require("./base-guard.cjs");
const NUL = String.fromCharCode(0);

/* 假的倉庫：src 有 park3d.js（同一份）與 net.js（不同）；art 有 zmhall/screen-errata.json（同）與 zmhall/screen-abacus.json（不同）；
   CDN 清單有 data/canju/a.json（大小 10、sha12 aaaaaaaaaaaa）與 engine/pikafish.wasm；preload 有沒有對不上由 preBad 決定；evidence.md 只引用 01_首頁.png */
function mkCtx(o = {}) {
  return {
    manifest: { "data/canju/a.json": [10, "aaaaaaaaaaaa"], "engine/pikafish.wasm": [99, "bbbbbbbbbbbb"] },
    srcHas: (f) => f === "park3d.js" || f === "net.js",
    srcSame: (f) => f === "park3d.js",
    artHas: (r) => r === "zmhall/screen-errata.json" || r === "zmhall/screen-abacus.json",
    artSame: (r) => r === "zmhall/screen-errata.json",
    info: (f) => f === "data/canju/a.json" ? { size: 10, sha12: "aaaaaaaaaaaa" } : { size: 99, sha12: "cccccccccccc" },
    preloadBad: () => o.preBad || [],
    evidenceRefs: (name) => name === "01_首頁.png",
  };
}
const ctx = mkCtx();
const J1 = (status, p, c = ctx) => judgeOne({ status, path: p }, c);
const ok = (status, p, c) => assert.equal(J1(status, p, c).ok, true, status + " " + p + " 應該放行");
const no = (status, p, c) => assert.equal(J1(status, p, c).ok, false, status + " " + p + " 應該擋");

test("發布產物放行；驗證紀錄可以以新換舊，其他發布產物不能刪", () => {
  for (const p of ["index.html", "sw.js", "release.json", "data/docs/evidence.md", "data/docs/foss.md", "source/STAGE-MANIFEST.json", "source/verification-log-20261122-0804.txt"]) ok("M", p);
  ok("A", "source/verification-log-20261123-1200.txt");
  ok("M", "data/docs/verification-log.txt");   /* W69 流程盤點第 12 項：驗證紀錄改放 data/docs（CI 版，跟 evidence.md 同號） */
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

test("只放 GitHub 的小檔各有核對：preload 每筆要對得上；證據截圖要 evidence.md 有引用；banlist 標要逐行看；刪 data 標會影響 P0-IMG", () => {
  ok("M", "data/preload.json", mkCtx({ preBad: [] }));
  const pb = J1("M", "data/preload.json", mkCtx({ preBad: ["data/xs/a.webp", "data/xs/b.webp"] }));
  assert.equal(pb.ok, false); assert.match(pb.why, /preload\.json 有 2 筆跟素材對不上/);
  ok("A", "data/docs/evidence/01_首頁.png");
  no("A", "data/docs/evidence/99_沒人引用.png");
  ok("M", "data/big-books.json");
  const bl = J1("M", "data/banlist.json"); assert.equal(bl.ok, true); assert.match(bl.why, /停權名單.*要逐行看/);
  const dl = J1("D", "data/canju/old.json"); assert.equal(dl.ok, true); assert.match(dl.why, /會影響 P0-IMG/);
  no("A", "data/canju/new-unknown.json");
  no("A", "engine/other.bin");
});

test("preload 逐筆核對：倉庫有那個檔就比大小與雜湊前 8 碼；只在 CDN 就比 CDN；兩邊都沒有算對不上", () => {
  const info = (f) => f === "data/a.webp" ? { size: 5, sha12: "1234567890ab" } : null;
  const man = { "data/b.webp": [7, "abcdef012345"] };
  const pre = { items: [["data/a.webp", 5, "12345678", 0], ["data/b.webp", 7, "abcdef01", 1]], big: [] };
  assert.deepEqual(preloadMismatch(pre, info, man), []);
  assert.deepEqual(preloadMismatch({ items: [["data/a.webp", 5, "99999999", 0]] }, info, man), ["data/a.webp"], "倉庫的檔雜湊不同");
  assert.deepEqual(preloadMismatch({ items: [["data/b.webp", 8, "abcdef01", 1]] }, info, man), ["data/b.webp"], "CDN 的大小不同");
  assert.deepEqual(preloadMismatch({ big: [["data/c.json", 1, "00000000"]] }, info, man), ["data/c.json"], "兩邊都沒有");
});

test("source/ 的程式、.github/、releases/ 等一律擋（要走功能 PR）", () => {
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

/* 主流程（PR #46 審查 A）：用假的 git、CDN 跑 runReleaseGuard */
const fakeGit = (pairs, throws) => (...a) => { if (throws) throw new Error("沒有基準"); if (a[0] !== "diff") throw new Error("沒預期的 git"); return pairs.flat().join(NUL) + NUL };
async function run(pairs, { manifest = {}, throws = false, c } = {}) {
  let asked = 0;
  const code = await runReleaseGuard({ base: "origin/main", git: fakeGit(pairs, throws), getManifest: async () => { asked++; return manifest }, makeCtx: (m) => ({ ...(c || ctx), manifest: m || {} }), log: () => {} });
  return { code, asked };
}

test("主流程：改到 data／engine 卻抓不到 CDN 清單回 3（缺驗，不當通過）", async () => {
  const r = await run([["M", "data/canju/a.json"]], { manifest: null });
  assert.equal(r.code, 3);
});

test("主流程：只刪檔、只改發布產物時不用抓 CDN 清單，照常判斷", async () => {
  const r = await run([["D", "data/canju/old.json"], ["M", "index.html"], ["D", "source/verification-log-20261121-0643.txt"]], { manifest: null });
  assert.equal(r.code, 0);
  assert.equal(r.asked, 0, "沒改到 data／engine 就不抓清單");
});

test("主流程：有一個檔對不到來源回 1；全部對得到回 0；讀不到差異回 2", async () => {
  const man = { "data/canju/a.json": [10, "aaaaaaaaaaaa"] };
  assert.equal((await run([["M", "index.html"], ["M", "data/canju/a.json"]], { manifest: man })).code, 0);
  assert.equal((await run([["M", "index.html"], ["A", "data/canju/new.json"]], { manifest: man })).code, 1);
  assert.equal((await run([["M", "index.html"], ["M", "source/xiangqi-db/m/02-shell.js"]], { manifest: man })).code, 1);
  assert.equal((await run([], { throws: true })).code, 2);
});

test("verify.yml 在發布模式跑這支、分支名不直接嵌進指令；基準版守門的發布那一組也跑這支", () => {
  const y = fs.readFileSync(path.join(__dirname, "..", "workflows", "verify.yml"), "utf8");
  const i = y.indexOf("guard-release-pr.cjs");
  assert.ok(i > 0, "verify.yml 要跑 guard-release-pr.cjs");
  const block = y.slice(y.lastIndexOf("- name:", i), i + 60);
  assert.match(block, /if: steps\.mode\.outputs\.mode == 'release'/);
  assert.match(block, /run: node \.github\/scripts\/guard-release-pr\.cjs "origin\/\$BASE_REF"/);
  assert.ok(STEPS("origin/main", "release").some(([, c]) => c.join(" ") === "node .github/scripts/guard-release-pr.cjs origin/main"), "base-guard 發布組要有這支（PR #46 審查⑥）");
  assert.ok(!STEPS("origin/main", "feature").some(([, c]) => c.join(" ").includes("guard-release-pr")), "功能組不用");
});
