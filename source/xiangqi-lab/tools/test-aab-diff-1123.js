// W79 新舊 AAB 產物比對（開發者 11/23 選單「新舊 AAB 產物比對」）：xiangqi-android/scripts/aab-diff.js
//   在測試裡自己組 zip（不壓縮），跑真的 readZipIndex／diffIndex 和命令列。
//   檢查：完全相同沒有紅項；少檔是紅、--expect-removed 可放行；變成 0 位元組是紅；多了 debug 檔是紅；新增 0 位元組素材是紅；
//   大小暴增是黃不是紅；讀不到檔、不是 zip 時結束代碼 2（沒驗到不能算通過）；有紅項結束代碼 1 並寫出報告。
// 用法：node --test xiangqi-lab/tools/test-aab-diff-1123.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process"), zlib = require("zlib");
const ROOT = path.join(__dirname, "../..");
const TOOL = path.join(ROOT, "xiangqi-android/scripts/aab-diff.js");
const AD = require(TOOL);
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "aabdiff-"));
test.after(() => { try { fs.rmSync(TMP, { recursive: true, force: true }) } catch (e) {} });

/* 組一個不壓縮的 zip：entries＝{名稱: Buffer 或字串}；名稱以 / 結尾的是資料夾 */
function makeZip(name, entries) {
  const locals = [], cds = []; let off = 0;
  const list = Array.isArray(entries) ? entries : Object.entries(entries);
  for (const [n, v] of list) {
    const data = Buffer.isBuffer(v) ? v : Buffer.from(String(v)), nb = Buffer.from(n, "utf8"), crc = zlib.crc32(data);
    const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6);
    lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(data.length, 18); lh.writeUInt32LE(data.length, 22); lh.writeUInt16LE(nb.length, 26);
    const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(0x0800, 8);
    ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(data.length, 20); ch.writeUInt32LE(data.length, 24); ch.writeUInt16LE(nb.length, 28); ch.writeUInt32LE(off, 42);
    locals.push(lh, nb, data); cds.push(ch, nb); off += 30 + nb.length + data.length;
  }
  const cd = Buffer.concat(cds), e = Buffer.alloc(22); const count = list.length;
  e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(count, 8); e.writeUInt16LE(count, 10); e.writeUInt32LE(cd.length, 12); e.writeUInt32LE(off, 16);
  const f = path.join(TMP, name); fs.writeFileSync(f, Buffer.concat([...locals, cd, e])); return f;
}
const P = "base/assets/public/";
const BASE = { "base/": "", [P + "index.html"]: "<html>", "base/manifest/AndroidManifest.xml": "<manifest/>", [P + "data/yunhe/pano.webp"]: Buffer.alloc(5000, 7), [P + "data/park/a.webp"]: Buffer.alloc(3000, 3), "BundleConfig.pb": "cfg" };
const run = (...a) => cp.spawnSync(process.execPath, [TOOL, ...a], { encoding: "utf8" });

test("讀 zip 中央目錄：檔名、大小、CRC32 都對（資料夾不算檔）；CRC 是內容的真實 CRC32", () => {
  const I = AD.readZipIndex(makeZip("a.zip", BASE));
  assert.equal(I.size, 5); assert.ok(!I.has("base/"));
  assert.equal(I.get(P + "data/yunhe/pano.webp").size, 5000);
  assert.equal(I.get(P + "index.html").crc, zlib.crc32(Buffer.from("<html>")));
});

test("新舊每個檔都一樣、或是同一個檔：多半是拿錯檔，結束代碼 2（沒驗到）；diffIndex 本身沒有紅項", () => {
  const a = makeZip("same-a.zip", BASE), b = makeZip("same-b.zip", BASE);
  const r = AD.diffIndex(AD.readZipIndex(a), AD.readZipIndex(b));
  assert.deepEqual([r.red.length, r.yellow.length, r.info.same], [0, 0, 5]);
  const c = run(a, b); assert.equal(c.status, 2); assert.match(c.stderr, /一模一樣/);
  const d = run(a, a); assert.equal(d.status, 2); assert.match(d.stderr, /同一個檔/);
});

test("不是 AAB（少了 BundleConfig.pb、AndroidManifest.xml 或 index.html）：結束代碼 2，不能當成沒問題", () => {
  const r1 = makeZip("readme1.zip", { "README.md": "a" }), r2 = makeZip("readme2.zip", { "README.md": "b" });
  const c = run(r1, r2); assert.equal(c.status, 2); assert.match(c.stderr, /不是 AAB/);
  const half = Object.assign({}, BASE); delete half["BundleConfig.pb"];
  const d = run(makeZip("ok-old.zip", BASE), makeZip("half.zip", half)); assert.equal(d.status, 2); assert.match(d.stderr, /新版不是 AAB.*BundleConfig\.pb/);
  for (const n of AD.AAB_MUST) assert.ok(n in BASE, "測試用的包要有 " + n);
});

test("新版少了使用中的圖（0804 少了 yunhe/pano.webp 的情況）：紅項、結束代碼 1；列在 --expect-removed 就放行", () => {
  const a = makeZip("rm-a.zip", BASE), nb = Object.assign({}, BASE); delete nb[P + "data/yunhe/pano.webp"]; const b = makeZip("rm-b.zip", nb);
  const r = AD.diffIndex(AD.readZipIndex(a), AD.readZipIndex(b));
  assert.equal(r.red.length, 1); assert.match(r.red[0].f, /yunhe\/pano\.webp$/); assert.match(r.red[0].why, /少了/);
  const md = path.join(TMP, "rm.md"), js = path.join(TMP, "rm.json"), c = run(a, b, "--md=" + md, "--json=" + js);
  assert.equal(c.status, 1); assert.match(fs.readFileSync(md, "utf8"), /不能送審/); assert.equal(JSON.parse(fs.readFileSync(js, "utf8")).red.length, 1);
  assert.equal(run(a, b, "--expect-removed=yunhe/pano\\.webp$").status, 0, "預期移除的放行");
});

test("素材大幅縮小（300 KB 的圖換成 130 位元組的 Git LFS 指標檔）：紅項；一般縮小（壓得更好）不算", () => {
  const big = Object.assign({}, BASE, { [P + "data/park/b.webp"]: Buffer.alloc(300 * 1024, 5), [P + "data/park/c.webp"]: Buffer.alloc(300 * 1024, 6) });
  const lfs = ["version https://git-lfs.github.com/spec/v1", "oid sha256:" + "0".repeat(64), "size 307200", ""].join(String.fromCharCode(10));
  const nb = Object.assign({}, big, { [P + "data/park/b.webp"]: lfs, [P + "data/park/c.webp"]: Buffer.alloc(200 * 1024, 6) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("lfs-a.zip", big)), AD.readZipIndex(makeZip("lfs-b.zip", nb)));
  assert.equal(r.red.length, 1); assert.match(r.red[0].f, /\/b\.webp$/); assert.match(r.red[0].why, /大幅縮小/);
});

test("原本有內容、新版變成 0 位元組：紅項", () => {
  const nb = Object.assign({}, BASE, { [P + "data/park/a.webp"]: Buffer.alloc(0) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("z-a.zip", BASE)), AD.readZipIndex(makeZip("z-b.zip", nb)));
  assert.equal(r.red.length, 1); assert.match(r.red[0].why, /0 位元組/);
});

test("新版多了 debug／開發用的檔（.map、.log、evidence、.DS_Store）或新增 0 位元組素材：紅項；一般新檔不算紅", () => {
  const nb = Object.assign({}, BASE, { [P + "core.js.map"]: "{}", [P + "build.log"]: "x", [P + "data/evidence/a.png"]: "x", [P + ".DS_Store"]: "x", [P + "data/new0.webp"]: Buffer.alloc(0), [P + "data/zmhall/horse.webp"]: Buffer.alloc(900, 1) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("d-a.zip", BASE)), AD.readZipIndex(makeZip("d-b.zip", nb)));
  const fs_ = r.red.map((x) => x.f.replace(P, "")).sort();
  assert.deepEqual(fs_, [".DS_Store", "build.log", "core.js.map", "data/evidence/a.png", "data/new0.webp"]);
  assert.equal(r.info.added, 6);
});

test("大小暴增是黃項（要人看）不是紅項：單檔變 5 倍以上又超過 1 MB、整包增加超過 20%、新增超過 20 MB 的單檔", () => {
  const MB = 1024 * 1024, nb = Object.assign({}, BASE, { [P + "data/park/a.webp"]: Buffer.alloc(2 * MB, 1), [P + "data/big.bin"]: Buffer.alloc(21 * MB, 2) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("y-a.zip", BASE)), AD.readZipIndex(makeZip("y-b.zip", nb)));
  assert.equal(r.red.length, 0);
  assert.deepEqual(r.yellow.map((x) => x.why.slice(0, 4)).sort(), ["壓縮前總", "新增超過", "變成 69"].sort().map((s) => s.slice(0, 4)));
});

test("建置工具自己的檔（BUNDLE-METADATA/ 的 proguard.map、pikafish-src 的 build.log）不算 debug 檔；--expect-added 放行的檔列在報告裡；--strict 時黃項也算失敗", () => {
  const nb = Object.assign({}, BASE, { "BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map": "x", [P + "pikafish-src/full/rebuild-evidence/build.log"]: "x", [P + "debug.log"]: "x" });
  const a = makeZip("bm-a.zip", BASE), b = makeZip("bm-b.zip", nb);
  const r = AD.diffIndex(AD.readZipIndex(a), AD.readZipIndex(b));
  assert.deepEqual(r.red.map((x) => x.f), [P + "debug.log"]);
  /* #102 第九輪：debug 檔任何放行參數都放不過（原本這裡示範用 --expect-added 放行 debug.log） */
  const md = path.join(TMP, "ea.md"), c = run(a, b, "--expect-added=debug\\.log$", "--md=" + md);
  assert.equal(c.status, 1, "debug.log 放不過"); assert.match(fs.readFileSync(md, "utf8"), /debug\.log[^\n]*新版多了 debug／開發用的檔（任何放行參數都不放過）/);
  /* 放行的檔列在報告：改用可以放行的（不在現行包位置的根目錄說明檔） */
  const nc = Object.assign({}, BASE, { [P + "NOTES-x.md"]: "x" }), md2 = path.join(TMP, "ea2.md"), c2 = run(a, makeZip("bm-c.zip", nc), "--expect-added=NOTES-x\\.md$", "--md=" + md2);
  assert.equal(c2.status, 0); assert.match(fs.readFileSync(md2, "utf8"), /放行（照參數預期的改動[\s\S]*NOTES-x\.md/);
  const MB = 1024 * 1024, yb = Object.assign({}, BASE, { [P + "data/park/a.webp"]: Buffer.alloc(2 * MB, 1) }), y = makeZip("st-b.zip", yb);
  assert.equal(run(a, y).status, 0, "黃項預設不擋"); assert.equal(run(a, y, "--strict").status, 1, "--strict 黃項也擋");
});

test("沒驗到不能算通過：檔案不存在、不是 zip、空 zip、參數不對、寫不出報告，結束代碼都是 2", () => {
  assert.equal(run(makeZip("e-a.zip", BASE), makeZip("empty.zip", {})).status, 2, "空 zip");
  const nb = Object.assign({}, BASE); delete nb[P + "data/park/a.webp"];
  const w = run(makeZip("w-a.zip", BASE), makeZip("w-b.zip", nb), "--md=" + path.join(TMP, "沒有這個資料夾", "x.md"));
  assert.equal(w.status, 2, "寫不出報告"); assert.match(w.stderr, /寫不出報告/);
  const a = makeZip("ok.zip", BASE), bad = path.join(TMP, "bad.aab"); fs.writeFileSync(bad, "這不是 zip");
  assert.equal(run(a, path.join(TMP, "沒有這個檔.aab")).status, 2);
  assert.equal(run(a, bad).status, 2);
  assert.equal(run(a).status, 2);
  assert.match(run(a, bad).stderr, /沒驗到/);
});

/* ---- 第二輪審查（iMac Claude 1，71c1dba）：非素材截斷、參數白名單、5 種放水的邊界 ---- */
const KB = 1024, big = (n, v) => Buffer.alloc(n, v);

test("非素材檔被截斷（index.html、core.js、json、dex）：base/assets/public/ 底下任何檔從 1 KB 以上縮成原本 10% 以下就是紅；--expect-shrunk 可放行並列在報告", () => {
  const old = Object.assign({}, BASE, { [P + "index.html"]: big(20 * KB, 60), [P + "core.js"]: big(30 * KB, 61), [P + "data/a.json"]: big(8 * KB, 62), "base/dex/classes.dex": big(40 * KB, 63) });
  const nw = Object.assign({}, old, { [P + "index.html"]: big(50, 60), [P + "core.js"]: big(2 * KB, 61), [P + "data/a.json"]: big(7 * KB, 62), "base/dex/classes.dex": big(0, 63) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("tr-a.zip", old)), AD.readZipIndex(makeZip("tr-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f).sort(), ["base/dex/classes.dex", P + "core.js", P + "index.html"].sort(), "json 只縮到 7/8 不算；dex 變 0 位元組也是紅");
  const r2 = AD.diffIndex(AD.readZipIndex(makeZip("tr-a2.zip", old)), AD.readZipIndex(makeZip("tr-b2.zip", nw)), { expectShrunk: /core\.js$/ });
  assert.ok(!r2.red.some((x) => /core\.js$/.test(x.f))); assert.ok(r2.allowed.some((x) => /core\.js$/.test(x.f)), "放行的列在報告");
});

test("縮小門檻的邊界：剛好 10% 以下算紅、10% 以上不算；原本不到 1 KB 的小檔不套用", () => {
  const old = Object.assign({}, BASE, { [P + "data/p/a.webp"]: big(20000, 1), [P + "data/p/b.webp"]: big(20000, 2), [P + "data/p/c.webp"]: big(63, 3), [P + "data/p/d.webp"]: big(900, 4) });
  const nw = Object.assign({}, old, { [P + "data/p/a.webp"]: big(1999, 1), [P + "data/p/b.webp"]: big(2001, 2), [P + "data/p/c.webp"]: big(5, 3), [P + "data/p/d.webp"]: big(5, 4) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("bd-a.zip", old)), AD.readZipIndex(makeZip("bd-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f), [P + "data/p/a.webp", P + "data/p/d.webp"], "第六輪：素材下限 64 位元組，63 不看、900 要看");
});

test("整包增加的門檻邊界：多 19% 不算黃、多 21% 才是黃", () => {
  const old = Object.assign({}, BASE, { [P + "data/p/x.webp"]: big(100 * KB, 1) }), tot = (o) => Object.values(o).reduce((s, v) => s + (Buffer.isBuffer(v) ? v.length : Buffer.byteLength(String(v))), 0), T = tot(old);
  const add = (pct, name) => Object.assign({}, old, { [P + "data/p/" + name]: big(Math.round(T * pct), 9) });
  const y19 = AD.diffIndex(AD.readZipIndex(makeZip("g-a.zip", old)), AD.readZipIndex(makeZip("g19.zip", add(0.19, "n19.webp"))));
  const y21 = AD.diffIndex(AD.readZipIndex(makeZip("g-a2.zip", old)), AD.readZipIndex(makeZip("g21.zip", add(0.21, "n21.webp"))));
  assert.ok(!y19.yellow.some((x) => x.f === "（整包）"), "19%"); assert.ok(y21.yellow.some((x) => x.f === "（整包）"), "21%");
});

test("只比大小不比內容會漏：大小一樣、內容不同（CRC 不同）要算「內容改變」，不能算相同", () => {
  const nw = Object.assign({}, BASE, { [P + "data/park/a.webp"]: big(3000, 4) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("crc-a.zip", BASE)), AD.readZipIndex(makeZip("crc-b.zip", nw)));
  assert.equal(r.info.changed, 1); assert.equal(r.info.same, 4);
  assert.equal(run(makeZip("crc-a2.zip", BASE), makeZip("crc-b2.zip", nw)).status, 0, "內容不同就不是「拿錯檔」");
});

test("可能含金鑰的檔（.env、.pem、.jks、local.properties）新增就是紅，放在 BUNDLE-METADATA 底下也一樣", () => {
  const nw = Object.assign({}, BASE, { [P + ".env"]: "K=1", [P + "data/a.pem"]: "x", "BUNDLE-METADATA/x/release.jks": "x", [P + "local.properties"]: "x" });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("sec-a.zip", BASE)), AD.readZipIndex(makeZip("sec-b.zip", nw)));
  assert.equal(r.red.length, 4);
});

test("參數白名單：不認得、大小寫不對、多給值、沒有值、重複、正規式寫錯，一律結束代碼 2；正確的照常", () => {
  const a = makeZip("arg-a.zip", BASE), nb = Object.assign({}, BASE); delete nb[P + "data/park/a.webp"]; const b = makeZip("arg-b.zip", nb);
  for (const bad of [["--Strict"], ["--strict=1"], ["--foo=bar"], ["--expect-removed"], ["--expect-removed="], ["--strict", "--strict"], ["--md=a.md", "--md=b.md"], ["--expect-added=("]]) {
    const c = run(a, b, ...bad); assert.equal(c.status, 2, bad.join(" ")); assert.match(c.stderr, /沒驗到/);
  }
  assert.equal(run(a, b, "--expect-removed=park/a\\.webp$").status, 0);
  assert.equal(run(a, b, "--expect-removed=park/a\\.webp$", "--strict").status, 1, "有放行就至少是黃，--strict 要擋");
  assert.equal(typeof AD.parseArgs(["x", "y", "--json=o.json"]), "object");
});

test("第三輪審查①：整包的檔被截斷都要紅（dex、Manifest、resources.pb、native-bridge.js），只有 BUNDLE-METADATA／META-INF 不看縮小", () => {
  const big = Buffer.alloc(800 * 1024, 9), mid = Buffer.alloc(4000, 5);
  const old = Object.assign({}, BASE, { "base/dex/classes.dex": big, "base/manifest/AndroidManifest.xml": mid, "base/resources.pb": mid, [P + "native-bridge.js"]: mid, "BUNDLE-METADATA/com.android.tools/x.bin": mid, "META-INF/BNDLTOOL.SF": mid });
  const nw = Object.assign({}, old, { "base/dex/classes.dex": Buffer.alloc(100, 9), "base/manifest/AndroidManifest.xml": "<m/>", "base/resources.pb": Buffer.alloc(200, 5), [P + "native-bridge.js"]: "x", "BUNDLE-METADATA/com.android.tools/x.bin": "y", "META-INF/BNDLTOOL.SF": "z" });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("tr-a.zip", old)), AD.readZipIndex(makeZip("tr-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f).sort(), ["base/dex/classes.dex", "base/manifest/AndroidManifest.xml", "base/resources.pb", P + "native-bridge.js"].sort());
  const c = run(makeZip("tr-c.zip", old), makeZip("tr-d.zip", Object.assign({}, old, { "base/dex/classes.dex": Buffer.alloc(100, 9) })));
  assert.equal(c.status, 1, "dex 從 800 KB 截到 100 位元組，命令列要回 1");
});

test("第三輪審查②：--expect-added=.* 也放不掉金鑰類檔案（.env、.jks 一律紅）；#102 第九輪起 debug 檔（.map）也放不掉", () => {
  const nw = Object.assign({}, BASE, { [P + ".env"]: "K=1", "base/root/release.jks": "x", "base/root/x.map": "m" });
  const A = AD.readZipIndex(makeZip("ea-a.zip", BASE)), B = AD.readZipIndex(makeZip("ea-b.zip", nw));
  const r = AD.diffIndex(A, B, { expectAdded: /.*/ });
  assert.deepEqual(r.red.map((x) => x.f).sort(), [P + ".env", "base/root/release.jks", "base/root/x.map"].sort());
  assert.ok(!r.allowed.some((x) => /x\.map$/.test(x.f)), "debug 檔不在放行清單");
  assert.equal(run(makeZip("ea-c.zip", BASE), makeZip("ea-d.zip", nw), "--expect-added=.*").status, 1);
});

test("第三輪審查③：放行參數寫太寬——有放行就黃（--strict 擋）；放行超過 50 個第七輪起是黃並標出「超過」（不加 --strict 回 0、加了回 1）", () => {
  const many = Object.assign({}, BASE); for (let i = 0; i < 60; i++) many[P + "data/m/" + i + ".webp"] = Buffer.alloc(2000, i);
  const less = Object.assign({}, BASE); for (const k of Object.keys(BASE)) if (k.startsWith(P + "data/")) delete less[k];
  const A = AD.readZipIndex(makeZip("al-a.zip", BASE)), L = AD.readZipIndex(makeZip("al-b.zip", less));
  const r1 = AD.diffIndex(A, L, { expectRemoved: /./ });
  assert.equal(r1.red.length, 0); assert.equal(r1.allowed.length, 2); assert.ok(r1.yellow.some((y) => y.f === "（放行參數）"));
  assert.equal(run(makeZip("al-c.zip", BASE), makeZip("al-d.zip", less), "--expect-removed=.", "--strict").status, 1);
  const r2 = AD.diffIndex(AD.readZipIndex(makeZip("al-e.zip", many)), A, { expectRemoved: /./ });
  assert.equal(r2.red.length, 0); assert.match(r2.yellow.find((y) => y.f === "（放行參數）").why, /放行了 60 個檔，超過 50 個/);
  assert.equal(run(makeZip("al-f.zip", many), makeZip("al-g.zip", BASE), "--expect-removed=.").status, 0);
  assert.equal(run(makeZip("al-f2.zip", many), makeZip("al-g2.zip", BASE), "--expect-removed=.", "--strict").status, 1);
});

test("第四輪審查①：每一種金鑰／帳號設定檔新增都是紅，--expect-added=.* 也一樣", () => {
  const names = ["base/root/AuthKey_ABC123.p8", "base/root/id_rsa", "base/root/id_ed25519", "base/root/id_ecdsa", "google-services.json", "base/root/google-services.json", P + "GoogleService-Info.plist",
    "keystore.properties", "gradle.properties", P + ".npmrc", P + ".netrc", P + "service-account-prod.json", P + "credentials.json", "base/root/x.pfx", "base/root/x.p12"];
  const A = AD.readZipIndex(makeZip("s4-a.zip", BASE));
  for (const n of names) {
    const r = AD.diffIndex(A, AD.readZipIndex(makeZip("s4-b.zip", Object.assign({}, BASE, { [n]: "secret" }))), { expectAdded: /.*/ });
    assert.deepEqual(r.red.map((x) => x.f), [n], n);
  }
  for (const n of [P + "data/keystone.json", P + "id_rsa_note.md", P + "credential-help.html", P + "gradle.properties.md", P + "data/xgoogle-services.json", P + "data/myid_rsa", P + "data/my.npmrc"]) {
    const r = AD.diffIndex(A, AD.readZipIndex(makeZip("s4-c.zip", Object.assign({}, BASE, { [n]: "ok" }))));
    assert.equal(r.red.length, 0, "名字像但不是金鑰檔：" + n);
  }
});

test("第四輪審查②：pikafish-src 只放行 base/assets/public/pikafish-src/ 開頭；藏在別的位置叫 pikafish-src 的 debug 檔要紅", () => {
  const A = AD.readZipIndex(makeZip("pk-a.zip", BASE));
  const ok = AD.diffIndex(A, AD.readZipIndex(makeZip("pk-b.zip", Object.assign({}, BASE, { [P + "pikafish-src/full/rebuild-evidence/build.log"]: "log" }))));
  assert.equal(ok.red.length, 0);
  for (const n of [P + "data/pikafish-src/evidence/shot.png.map", "base/pikafish-src/x.log", "x/base/assets/public/pikafish-src/a.map"]) {
    const r = AD.diffIndex(A, AD.readZipIndex(makeZip("pk-c.zip", Object.assign({}, BASE, { [n]: "x" }))));
    assert.deepEqual(r.red.map((x) => x.f), [n], n);
  }
});

test("第四輪審查③：程式與結構檔縮到 60% 以下就紅（core.js 截到 50%、index.html 截到 15%）；素材縮到 60% 以下是黃、10% 以下是紅", () => {
  const old = Object.assign({}, BASE, { [P + "index.html"]: Buffer.alloc(10000, 60), [P + "core.js"]: Buffer.alloc(20000, 61), [P + "data/x.json"]: Buffer.alloc(5000, 62), "base/lib/arm64-v8a/libx.so": Buffer.alloc(9000, 63), [P + "data/m/a.webp"]: Buffer.alloc(10000, 64), [P + "data/m/b.webp"]: Buffer.alloc(10000, 65), [P + "release.json"]: Buffer.alloc(7000, 66) });
  const nw = Object.assign({}, old, { [P + "index.html"]: Buffer.alloc(1500, 60), [P + "core.js"]: Buffer.alloc(10000, 61), [P + "data/x.json"]: Buffer.alloc(2900, 62), "base/lib/arm64-v8a/libx.so": Buffer.alloc(5000, 63), [P + "data/m/a.webp"]: Buffer.alloc(5000, 64), [P + "data/m/b.webp"]: Buffer.alloc(900, 65), [P + "release.json"]: Buffer.alloc(4760, 66) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("c4-a.zip", old)), AD.readZipIndex(makeZip("c4-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f).sort(), [P + "index.html", P + "core.js", P + "data/x.json", "base/lib/arm64-v8a/libx.so", P + "data/m/b.webp"].sort());
  assert.deepEqual(r.yellow.map((x) => x.f).sort(), [P + "data/m/a.webp", P + "release.json"].sort(), "素材縮到 50% 是黃；release.json 7000→4760（68%，真包實例）第六輪起是黃（程式檔縮到 90% 以下），不是紅");
});

test("第四輪審查④：只看比例不看絕對大小——1100→1000 位元組不紅；1024 的下限邊界；1 KB 以下的檔縮小不看、變 0 位元組照樣紅", () => {
  const old = Object.assign({}, BASE, { "lic/a.txt": Buffer.alloc(1100, 1), "lic/b.txt": Buffer.alloc(1098, 2), "lic/c.txt": Buffer.alloc(1023, 3), "lic/d.txt": Buffer.alloc(1024, 4), "lic/e.txt": Buffer.alloc(500, 5) });
  const nw = Object.assign({}, old, { "lic/a.txt": Buffer.alloc(1000, 1), "lic/b.txt": Buffer.alloc(1000, 2), "lic/c.txt": Buffer.alloc(10, 3), "lic/d.txt": Buffer.alloc(10, 4), "lic/e.txt": "" });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("s5-a.zip", old)), AD.readZipIndex(makeZip("s5-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f).sort(), ["lic/d.txt", "lic/e.txt"]);
  assert.equal(r.yellow.length, 0);
});

test("單檔暴增 5 倍門檻：剛好 5 倍不黃、超過 5 倍且大於 1 MB 才黃；5 倍以上但不到 1 MB 不黃", () => {
  const MB = 1024 * 1024, old = Object.assign({}, BASE, { "g/a.bin": Buffer.alloc(300 * 1024, 1), "g/b.bin": Buffer.alloc(300 * 1024, 2), "g/c.bin": Buffer.alloc(100 * 1024, 3) });
  const nw = Object.assign({}, old, { "g/a.bin": Buffer.alloc(1500 * 1024, 1), "g/b.bin": Buffer.alloc(1500 * 1024 + 1, 2), "g/c.bin": Buffer.alloc(900 * 1024, 3) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("g-a.zip", old)), AD.readZipIndex(makeZip("g-b.zip", nw)));
  assert.deepEqual(r.yellow.filter((y) => y.f.startsWith("g/")).map((y) => y.f), ["g/b.bin"]); assert.ok(MB);
});

test("AAB 必有的檔：少了 Manifest 或 index.html 都算不是 AAB（結束代碼 2）", () => {
  for (const k of ["base/manifest/AndroidManifest.xml", P + "index.html", "BundleConfig.pb"]) {
    const nb = Object.assign({}, BASE); delete nb[k];
    const c = run(makeZip("m-a.zip", BASE), makeZip("m-b.zip", nb)); assert.equal(c.status, 2, k); assert.match(c.stderr, /不是 AAB/);
  }
});

test("報告路徑：--json／--md 指到輸入的 AAB 要拒絕（結束代碼 2、候選包不被蓋掉）；報告寫出放行參數的原始正規式", () => {
  const a = makeZip("o-a.zip", BASE), nb = Object.assign({}, BASE); delete nb[P + "data/park/a.webp"]; const b = makeZip("o-b.zip", nb), size = fs.statSync(b).size;
  for (const bad of ["--json=" + b, "--md=" + b, "--md=" + a, "--md=" + path.join(path.dirname(b), ".", path.basename(b))]) {
    const c = run(a, b, bad); assert.equal(c.status, 2, bad); assert.equal(fs.statSync(b).size, size, "候選包沒被蓋掉");
  }
  const md = path.join(TMP, "o.md"), js = path.join(TMP, "o.json");
  assert.equal(run(a, b, "--md=" + md, "--json=" + md).status, 2, "json 和 md 同一個檔");
  const c = run(a, b, "--expect-removed=|", "--md=" + md, "--json=" + js); assert.equal(c.status, 0);
  assert.match(fs.readFileSync(md, "utf8"), /放行參數（原始正規式）：`--expect-removed=\|`/);
  assert.deepEqual(JSON.parse(fs.readFileSync(js, "utf8")).args, { "expect-removed": "|" });
});

test("參數：大小寫錯（--JSON=）、多給一個位置參數，都回 2", () => {
  const a = makeZip("p-a.zip", BASE), b = makeZip("p-b.zip", Object.assign({}, BASE, { x: "1" }));
  for (const bad of [["--JSON=o.json"], ["--Md=o.md"], [a]]) { const c = run(a, b, ...bad); assert.equal(c.status, 2, bad.join(" ")); assert.match(c.stderr, /沒驗到/) }
});

test("第五輪審查①：1 KB 以下的程式與設定檔截斷也紅（sw.js、capacitor.config.json、BundleConfig.pb、res 底下的 xml）；64 位元組以下不看；剛好 60% 不紅、少 1 位元組才紅", () => {
  const old = Object.assign({}, BASE, { [P + "sw.js"]: Buffer.alloc(775, 1), "base/assets/capacitor.config.json": Buffer.alloc(481, 2), "BundleConfig.pb": Buffer.alloc(628, 3), "base/res/layout/x.xml": Buffer.alloc(900, 4), "base/res/y.xml": Buffer.alloc(63, 5), "base/res/v.xml": Buffer.alloc(64, 8), "base/res/z.css": Buffer.alloc(1000, 6), "base/res/w.css": Buffer.alloc(1000, 7) });
  const nw = Object.assign({}, old, { [P + "sw.js"]: Buffer.alloc(300, 1), "base/assets/capacitor.config.json": Buffer.alloc(100, 2), "BundleConfig.pb": Buffer.alloc(300, 3), "base/res/layout/x.xml": Buffer.alloc(400, 4), "base/res/y.xml": Buffer.alloc(5, 5), "base/res/v.xml": Buffer.alloc(5, 8), "base/res/z.css": Buffer.alloc(600, 6), "base/res/w.css": Buffer.alloc(599, 7) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("q1-a.zip", old)), AD.readZipIndex(makeZip("q1-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f).sort(), [P + "sw.js", "base/assets/capacitor.config.json", "BundleConfig.pb", "base/res/layout/x.xml", "base/res/w.css", "base/res/v.xml"].sort());
  assert.deepEqual(r.yellow.map((x) => x.f), ["base/res/z.css"], "y.xml 63 位元組不看；z.css 剛好 60% 不紅、但第六輪起算黃");
  const c = run(makeZip("q1-c.zip", old), makeZip("q1-d.zip", Object.assign({}, old, { [P + "sw.js"]: Buffer.alloc(300, 1) })), "--strict"); assert.equal(c.status, 1);
});

test("第五輪審查②：新增 0 位元組的 js／json／html 是紅；其他新增 0 位元組的檔是黃", () => {
  const nw = Object.assign({}, BASE, { [P + "m/new.js"]: "", [P + "new.json"]: "", [P + "new.html"]: "", [P + "readme.txt"]: "", [P + "cordova.js"]: "", [P + "cordova_plugins.js"]: "", [P + "m/cordova.js"]: "" });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("q2-a.zip", BASE)), AD.readZipIndex(makeZip("q2-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f).sort(), [P + "m/new.js", P + "new.json", P + "new.html", P + "m/cordova.js"].sort(), "Capacitor 空殼只認根目錄那兩個");
  assert.deepEqual(r.yellow.map((x) => x.f).sort(), [P + "readme.txt", P + "cordova.js", P + "cordova_plugins.js"].sort());
});

test("第五輪審查③④：金鑰檔加備份副檔名照樣紅，--expect-added=. 也放不掉；補上的檔名都紅；.git/、.ssh/ 底下都紅", () => {
  const names = ["base/root/release.jks.bak", "base/root/upload.pem.orig", P + ".env~", "base/root/release.keystore.tmp", "base/root/x.p8.swp", "key.properties", "secrets.properties", P + ".dev.vars",
    P + "client_secret_123.apps.json", P + "firebase-adminsdk-abc.json", P + ".git-credentials", P + "credentials", P + ".ssh/config", P + "secrets.json", "base/root/a.ppk", "base/root/a.mobileprovision", "base/root/a.asc", P + ".git/config", P + ".htpasswd"];
  const A = AD.readZipIndex(makeZip("q3-a.zip", BASE));
  for (const n of names) {
    const r = AD.diffIndex(A, AD.readZipIndex(makeZip("q3-b.zip", Object.assign({}, BASE, { [n]: "s" }))), { expectAdded: /./ });
    assert.deepEqual(r.red.map((x) => x.f), [n], n);
  }
  const c = run(makeZip("q3-c.zip", BASE), makeZip("q3-d.zip", Object.assign({}, BASE, { "base/root/release.jks.bak": "s" })), "--expect-added=.");
  assert.equal(c.status, 1);
  for (const n of [P + "data/credentials-help.md", P + "keys.properties.md", P + "data/secretsauce.json"]) {
    const r = AD.diffIndex(A, AD.readZipIndex(makeZip("q3-e.zip", Object.assign({}, BASE, { [n]: "ok" }))));
    assert.equal(r.red.length, 0, "名字像但不是：" + n);
  }
});

test("第五輪審查（不擋）：舊版就帶著金鑰檔、新版照帶也是紅", () => {
  const bad = Object.assign({}, BASE, { [P + ".env"]: "K=1" }), nw = Object.assign({}, bad, { [P + "data/park/a.webp"]: Buffer.alloc(3000, 9) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("q4-a.zip", bad)), AD.readZipIndex(makeZip("q4-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f), [P + ".env"]); assert.match(r.red[0].why, /還帶著/);
});

test("第五輪審查⑤：pikafish-src 只放行 rebuild-evidence/build.log；同資料夾的 .git/config、x.map、node_modules、debug.log 都紅；被放行的列在報告", () => {
  const PK = P + "pikafish-src/full/";
  const A = AD.readZipIndex(makeZip("q5-a.zip", BASE));
  const ok = AD.diffIndex(A, AD.readZipIndex(makeZip("q5-b.zip", Object.assign({}, BASE, { [PK + "rebuild-evidence/build.log"]: "log" }))));
  assert.equal(ok.red.length, 0); assert.deepEqual(ok.noted.map((x) => x.f), [PK + "rebuild-evidence/build.log"]);
  assert.match(AD.renderMd(ok, "a", "b"), /照規則不算 debug 的新增檔[\s\S]*rebuild-evidence\/build\.log/);
  for (const n of [PK + ".git/config", PK + "x.map", PK + "node_modules/a.js", PK + "debug.log", PK + "data/evidence/shot.png", PK + "rebuild-evidence/other.log", PK + "a.swp"]) {
    const r = AD.diffIndex(A, AD.readZipIndex(makeZip("q5-c.zip", Object.assign({}, BASE, { [n]: "x" }))));
    assert.deepEqual(r.red.map((x) => x.f), [n], n);
  }
});

test("第五輪審查⑥：wasm、nnue、glb 截到 55% 是紅", () => {
  const old = Object.assign({}, BASE, { [P + "engine/pikafish.wasm"]: Buffer.alloc(10000, 1), [P + "engine/a.nnue"]: Buffer.alloc(10000, 2), [P + "data/3d/k_pika2.glb"]: Buffer.alloc(10000, 3) });
  const nw = Object.assign({}, old, { [P + "engine/pikafish.wasm"]: Buffer.alloc(5500, 1), [P + "engine/a.nnue"]: Buffer.alloc(5500, 2), [P + "data/3d/k_pika2.glb"]: Buffer.alloc(5500, 3) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("q6-a.zip", old)), AD.readZipIndex(makeZip("q6-b.zip", nw)));
  assert.equal(r.red.length, 3); assert.equal(r.yellow.length, 0);
});

test("門檻邊界：放行剛好 50 個是黃、51 個是紅；META-INF 不看縮小但 base/res 要看", () => {
  const mk = (k) => { const o = Object.assign({}, BASE); for (let i = 0; i < k; i++) o[P + "data/n/" + i + ".webp"] = Buffer.alloc(2000, i % 250); return o };
  const r50 = AD.diffIndex(AD.readZipIndex(makeZip("b-a.zip", mk(50))), AD.readZipIndex(makeZip("b-b.zip", BASE)), { expectRemoved: /data\/n\// });
  assert.equal(r50.red.length, 0); assert.ok(r50.yellow.some((y) => y.f === "（放行參數）"));
  const r51 = AD.diffIndex(AD.readZipIndex(makeZip("b-c.zip", mk(51))), AD.readZipIndex(makeZip("b-d.zip", BASE)), { expectRemoved: /data\/n\// });
  assert.equal(r51.red.length, 0, "第七輪：超過 50 個改成黃，不是紅"); const y51 = r51.yellow.find((y) => y.f === "（放行參數）"); assert.match(y51.why, /超過 50 個/);
  assert.doesNotMatch(r50.yellow.find((y) => y.f === "（放行參數）").why, /超過/, "剛好 50 個不標「超過」");
  const r51b = AD.diffIndex(AD.readZipIndex(makeZip("b-c2.zip", mk(51))), AD.readZipIndex(makeZip("b-d2.zip", BASE)), { expectRemoved: /data\/n\//, ack: new Set([y51.ack]) });
  assert.equal(r51b.yellow.length, 0, "看過、寫進確認清單就能過");
  const old = Object.assign({}, BASE, { "META-INF/A.SF": Buffer.alloc(5000, 1), "base/res/raw/a.txt": Buffer.alloc(5000, 2) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("b-e.zip", old)), AD.readZipIndex(makeZip("b-f.zip", Object.assign({}, old, { "META-INF/A.SF": "x", "base/res/raw/a.txt": "x" }))));
  assert.deepEqual(r.red.map((x) => x.f), ["base/res/raw/a.txt"]);
});

test("確認清單 --ack：黃項寫進清單就不再讓 --strict 擋；內容一變確認碼就失效；紅項不能確認；清單格式不對回 2", () => {
  const old = Object.assign({}, BASE, { [P + "data/m/a.webp"]: Buffer.alloc(10000, 4) });
  const nw = Object.assign({}, old, { [P + "data/m/a.webp"]: Buffer.alloc(5000, 4) }), a = makeZip("k-a.zip", old), b = makeZip("k-b.zip", nw);
  const r = AD.diffIndex(AD.readZipIndex(a), AD.readZipIndex(b)); assert.equal(r.yellow.length, 1);
  const key = r.yellow[0].ack; assert.match(key, /^base\/assets\/public\/data\/m\/a\.webp@[0-9a-f]+:5000$/);
  const ackF = path.join(TMP, "ack.json"); fs.writeFileSync(ackF, JSON.stringify([key]));
  assert.equal(run(a, b, "--strict").status, 1); assert.equal(run(a, b, "--strict", "--ack=" + ackF).status, 0);
  const ra = AD.diffIndex(AD.readZipIndex(a), AD.readZipIndex(b), { ack: new Set([key]) });
  assert.equal(ra.yellow.length, 0); assert.deepEqual(ra.acked.map((y) => y.ack), [key]);
  assert.match(AD.renderMd(ra, "a", "b"), /已確認的黃項[\s\S]*a\.webp@/);
  const b2 = makeZip("k-c.zip", Object.assign({}, old, { [P + "data/m/a.webp"]: Buffer.alloc(5000, 5) }));
  assert.equal(run(a, b2, "--strict", "--ack=" + ackF).status, 1, "內容不同、確認碼不同");
  const rr = AD.diffIndex(AD.readZipIndex(a), AD.readZipIndex(makeZip("k-d.zip", Object.assign({}, nw, { [P + "x.map"]: "m" }))), { ack: new Set([key, P + "x.map@0"]) });
  assert.equal(rr.red.length, 1, "紅項不能確認");
  const RB = AD.readZipIndex(makeZip("k-e.zip", Object.assign({}, nw, { [P + "x.map"]: "m" }))), mc = (RB.get(P + "x.map").crc >>> 0).toString(16);
  const real = [P + "x.map@" + mc, P + "x.map@" + mc + ":1", P + "x.map@removed", P + "x.map"];
  const rr2 = AD.diffIndex(AD.readZipIndex(a), RB, { ack: new Set(real) });
  assert.deepEqual(rr2.red.map((x) => x.f), [P + "x.map"], "拿紅項自己的檔名＋真的 CRC＋大小去確認也不行（第六輪審查②）"); assert.ok(!rr2.acked.some((y) => y.f === P + "x.map"));
  for (const bad of ["{}", "[1]", "[\"沒有小老鼠\"]", "不是 json"]) { fs.writeFileSync(ackF, bad); assert.equal(run(a, b, "--ack=" + ackF).status, 2, bad) }
  assert.equal(run(a, b, "--ack=" + path.join(TMP, "沒有這個檔.json")).status, 2);
});

test("報告路徑用硬連結指到輸入的 AAB 也拒絕；zip 裡有重複檔名回 2", () => {
  const a = makeZip("h-a.zip", BASE), b = makeZip("h-b.zip", Object.assign({}, BASE, { x: "1" })), link = path.join(TMP, "h-link.zip"), size = fs.statSync(b).size;
  fs.linkSync(b, link);
  assert.equal(run(a, b, "--md=" + link).status, 2); assert.equal(fs.statSync(b).size, size);
  const dup = makeZip("h-e.zip", [["BundleConfig.pb", "a"], ["base/manifest/AndroidManifest.xml", "m"], [P + "index.html", "i"], ["dup.txt", "1"], ["dup.txt", "2"]]);
  assert.throws(() => AD.readZipIndex(dup), /重複的檔名/);
  const c = run(a, dup); assert.equal(c.status, 2); assert.match(c.stderr, /重複的檔名/);
});

test("第六輪審查①：放行參數與整包的確認碼綁住內容——沿用舊的 --expect-shrunk 和 --ack，這版 core.js 被截得更短就要再擋", () => {
  const old = Object.assign({}, BASE, { [P + "core.js"]: Buffer.alloc(20000, 1) });
  const v1 = Object.assign({}, old, { [P + "core.js"]: Buffer.alloc(9000, 1) }), v2 = Object.assign({}, old, { [P + "core.js"]: Buffer.alloc(100, 1) });
  const A = AD.readZipIndex(makeZip("a6-a.zip", old)), o = { expectShrunk: /core[.]js$/ };
  const r1 = AD.diffIndex(A, AD.readZipIndex(makeZip("a6-b.zip", v1)), o), k1 = r1.yellow.find((y) => y.f === "（放行參數）").ack;
  const r2 = AD.diffIndex(A, AD.readZipIndex(makeZip("a6-c.zip", v2)), Object.assign({ ack: new Set([k1]) }, o));
  assert.ok(r2.yellow.some((y) => y.f === "（放行參數）"), "放行的檔內容不同，舊確認碼失效");
  const big1 = Object.assign({}, old, { [P + "data/x.bin"]: Buffer.alloc(30000, 2) }), big2 = Object.assign({}, old, { [P + "data/x.bin"]: Buffer.alloc(30000, 3) });
  const g1 = AD.diffIndex(A, AD.readZipIndex(makeZip("a6-d.zip", big1))), gk = g1.yellow.find((y) => y.f === "（整包）").ack;
  const g2 = AD.diffIndex(A, AD.readZipIndex(makeZip("a6-e.zip", big2)), { ack: new Set([gk]) });
  assert.ok(g2.yellow.some((y) => y.f === "（整包）"), "總大小一樣、內容不同，整包確認碼也失效");
  const g3 = AD.diffIndex(A, AD.readZipIndex(makeZip("a6-f.zip", big1)), { ack: new Set([gk]) });
  assert.ok(!g3.yellow.some((y) => y.f === "（整包）"), "同一份內容，確認碼有效");
});

test("第六輪審查③：程式檔縮到 90% 以下是黃（index.html 70%）；nnue、wasm、glb 大小一變就黃；素材下限 64 位元組（res 的 png 截到 100 位元組是紅）", () => {
  const old = Object.assign({}, BASE, { [P + "index.html"]: Buffer.alloc(10000, 1), [P + "engine/a.nnue"]: Buffer.alloc(10000, 2), [P + "engine/p.wasm"]: Buffer.alloc(10000, 3), [P + "data/k.glb"]: Buffer.alloc(10000, 4), "base/res/drawable/i.png": Buffer.alloc(2000, 5), "base/res/drawable/j.png": Buffer.alloc(900, 7), [P + "m/x.js"]: Buffer.alloc(10000, 6) });
  const nw = Object.assign({}, old, { [P + "index.html"]: Buffer.alloc(7000, 1), [P + "engine/a.nnue"]: Buffer.alloc(7000, 2), [P + "engine/p.wasm"]: Buffer.alloc(10001, 3), [P + "data/k.glb"]: Buffer.alloc(9999, 4), "base/res/drawable/i.png": Buffer.alloc(100, 5), "base/res/drawable/j.png": Buffer.alloc(100, 7), [P + "m/x.js"]: Buffer.alloc(9000, 6) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("c6-a.zip", old)), AD.readZipIndex(makeZip("c6-b.zip", nw)));
  assert.deepEqual(r.red.map((x) => x.f), ["base/res/drawable/i.png"]);
  assert.deepEqual(r.yellow.map((x) => x.f).sort(), [P + "index.html", P + "engine/a.nnue", P + "engine/p.wasm", P + "data/k.glb", "base/res/drawable/j.png"].sort(), "x.js 剛好 90% 不黃；j.png 900→100（11%）是黃");
  const nw2 = Object.assign({}, nw, { [P + "m/x.js"]: Buffer.alloc(8999, 6) });
  assert.ok(AD.diffIndex(AD.readZipIndex(makeZip("c6-c.zip", old)), AD.readZipIndex(makeZip("c6-d.zip", nw2))).yellow.some((y) => y.f === P + "m/x.js"), "少 1 位元組就黃");
});

test("第六輪審查④：金鑰檔名補齊（.backup、.jks.1、upload-keystore.properties、secrets.yml、.aws/、.gnupg/、.gpg、.crt、.der、.p7b）", () => {
  const A = AD.readZipIndex(makeZip("s6-a.zip", BASE));
  for (const n of ["base/root/release.jks.backup", "base/root/release.jks.1", "upload-keystore.properties", P + "secrets.yml", P + "secrets.yaml", P + ".aws/credentials", P + ".aws/config", P + ".gnupg/pubring.kbx", "base/root/a.gpg", "base/root/a.crt", "base/root/a.cer", "base/root/a.der", "base/root/a.p7b"]) {
    const r = AD.diffIndex(A, AD.readZipIndex(makeZip("s6-b.zip", Object.assign({}, BASE, { [n]: "s" }))), { expectAdded: /./ });
    assert.deepEqual(r.red.map((x) => x.f), [n], n);
  }
  for (const n of [P + "data/v1.2.json", P + "secretsauce.yml", P + "data/crt-help.md"]) assert.equal(AD.diffIndex(A, AD.readZipIndex(makeZip("s6-c.zip", Object.assign({}, BASE, { [n]: "ok" })))).red.length, 0, "不是金鑰：" + n);
});

test("第七輪審查①：素材縮到 90% 以下是黃（pano.webp 61%／70%、res 的 png 70%、wav 65%）；剛好 90% 不黃", () => {
  const old = Object.assign({}, BASE, { [P + "data/yunhe/p1.webp"]: Buffer.alloc(10000, 1), [P + "data/yunhe/p2.webp"]: Buffer.alloc(10000, 2), "base/res/drawable/a.png": Buffer.alloc(10000, 3), [P + "data/bgm/a.wav"]: Buffer.alloc(10000, 4), [P + "data/m/b.webp"]: Buffer.alloc(10000, 5) });
  const nw = Object.assign({}, old, { [P + "data/yunhe/p1.webp"]: Buffer.alloc(6100, 1), [P + "data/yunhe/p2.webp"]: Buffer.alloc(7000, 2), "base/res/drawable/a.png": Buffer.alloc(7000, 3), [P + "data/bgm/a.wav"]: Buffer.alloc(6500, 4), [P + "data/m/b.webp"]: Buffer.alloc(9000, 5) });
  const r = AD.diffIndex(AD.readZipIndex(makeZip("m7-a.zip", old)), AD.readZipIndex(makeZip("m7-b.zip", nw)));
  assert.equal(r.red.length, 0); assert.deepEqual(r.yellow.map((y) => y.f).sort(), [P + "data/yunhe/p1.webp", P + "data/yunhe/p2.webp", "base/res/drawable/a.png", P + "data/bgm/a.wav"].sort());
  assert.match(r.yellow[0].why, /素材縮小到/);
  const c = run(makeZip("m7-c.zip", old), makeZip("m7-d.zip", nw), "--strict"); assert.equal(c.status, 1);
});

test("〔原始碼〕aab-diff.js：LF、沒有行內 // 註解吃掉程式", () => {
  const s = fs.readFileSync(TOOL, "utf8");
  assert.ok(!s.includes("\r"));
  for (const line of s.split("\n")) { const code = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/(?:[^/\\\n]|\\.)+\/[gimsuy]*/g, ""); assert.ok(!/;\s*\/\/\s*\S/.test(code), "行內 // 註解：" + line.slice(0, 80)) }
});

/* W91（11/24）：aab-diff 接進送審閘門 */
const W91 = Object.assign({}, BASE, { [P + "core.js"]: "var a=1;".repeat(40), [P + "data/homemap/home.webp"]: Buffer.alloc(4000, 9) });
const idx = (o) => AD.readZipIndex(makeZip("w91-" + Math.random().toString(36).slice(2) + ".zip", o));

test("W91：驗證紀錄、證據頁、說明文件、releases/ 進了安裝包 → 紅（#102 第九輪起，--expect-added 也放不掉）；根目錄其他說明檔 → 黃，可放行；在 data/、pikafish-src/、licenses/、根目錄程式檔 → 不報", () => {
  const A = idx(W91);
  const B = idx(Object.assign({}, W91, { [P + "AGENTS.md"]: "x".repeat(500), [P + "releases/android.md"]: "y".repeat(500), [P + "data/docs/verification-log.txt"]: "z".repeat(500), [P + "NOTES-x.md"]: "n".repeat(500),
    [P + "data/flags.json"]: "{}", [P + "pikafish-src/full/build/build.sh"]: "echo", [P + "licenses/MIT.txt"]: "MIT", [P + "three-shim.mjs"]: "export{}" }));
  const r = AD.diffIndex(A, B), rd = r.red.map((x) => x.f).sort(), y = r.yellow.map((x) => x.f).sort();
  assert.deepEqual(rd, [P + "AGENTS.md", P + "data/docs/verification-log.txt", P + "releases/android.md"].sort(), "這三個紅：" + rd);
  assert.deepEqual(y, [P + "NOTES-x.md"], "只有根目錄其他說明檔亮黃：" + y);
  const r2 = AD.diffIndex(A, B, { expectAdded: new RegExp("AGENTS|releases|verification|NOTES") });
  assert.deepEqual(r2.red.map((x) => x.f).sort(), rd, "放行參數放不掉那三個");
  assert.ok(!r2.yellow.some((x) => x.f === P + "NOTES-x.md") && r2.allowed.some((x) => x.f === P + "NOTES-x.md"), "其他說明檔放行的不算黃、但列在放行");
  assert.ok(r2.yellow.some((x) => x.f === "（放行參數）"), "有放行就要人看");
});
test("#102 第九輪：舊版本來就帶著說明文件、新版繼續帶 → 也紅（原本只看新增的，26112301 漏的就是這一類）；舊版帶著、新版拿掉 → 不紅，列在照規則不算", () => {
  const withDoc = Object.assign({}, W91, { [P + "AGENTS.md"]: "x".repeat(500), [P + "releases/android.md"]: "y".repeat(500) });
  const keep = AD.diffIndex(idx(withDoc), idx(withDoc));
  assert.deepEqual(keep.red.map((x) => x.f).sort(), [P + "AGENTS.md", P + "releases/android.md"].sort(), "新版繼續帶著：紅");
  assert.match(keep.red[0].why, /新版還帶著/);
  const drop = AD.diffIndex(idx(withDoc), idx(W91));
  assert.equal(drop.red.length, 0, "拿掉是好事，不算紅：" + JSON.stringify(drop.red)); assert.ok(drop.noted.some((x) => x.f === P + "AGENTS.md" && /拿掉了不該進安裝包/.test(x.why)));
});
test("#102 第九輪：首頁素材比照金鑰檔——拿掉、大幅縮小一律紅，--expect-removed／--expect-shrunk 不管多窄都放不過；非首頁素材照舊可以放行", () => {
  const H2 = Object.assign({}, W91, { [P + "data/homemap/home_spring.webp"]: Buffer.alloc(5000, 4) }), A = idx(H2);
  const lost = Object.assign({}, H2); delete lost[P + "data/homemap/home_spring.webp"];
  const r1 = AD.diffIndex(A, idx(lost), { expectRemoved: new RegExp("homemap/home_spring[.]webp$") });
  assert.ok(r1.red.some((x) => x.f === P + "data/homemap/home_spring.webp" && /首頁素材任何放行參數都不放過/.test(x.why)), "窄的 --expect-removed 放不掉（第九輪代理人實跑的漏洞）"); assert.equal(r1.allowed.length, 0);
  const lfs = Object.assign({}, H2, { [P + "data/homemap/home_spring.webp"]: "version https://git-lfs.github.com/spec/v1" });
  const r2 = AD.diffIndex(A, idx(lfs), { expectShrunk: new RegExp("homemap/home_") });
  assert.ok(r2.red.some((x) => x.f === P + "data/homemap/home_spring.webp" && /首頁素材大幅縮小/.test(x.why)), "換成 LFS 指標檔配窄的 --expect-shrunk 也放不掉"); assert.equal(r2.allowed.length, 0);
  const park = Object.assign({}, H2); delete park[P + "data/park/a.webp"];
  const r3 = AD.diffIndex(A, idx(park), { expectRemoved: new RegExp("data/park/a[.]webp$") });
  assert.equal(r3.red.length, 0); assert.ok(r3.allowed.some((x) => x.f === P + "data/park/a.webp"), "非首頁素材照舊可以放行");
});
test("#102 第十輪：首頁硬規則用 P0-IMG 的首頁離線必要素材名單（bundle-home-assets.js required）——homemap 以外的 icons、canying 拿掉或縮小也放不過；名單外的 icons 照舊可以放行", () => {
  const REQ = require(path.join(ROOT, "xiangqi-android/scripts/bundle-home-assets.js")).required;
  assert.ok(REQ.includes("icons/qin/feedback.webp") && REQ.includes("canying/ming.webp"), "名單上有各朝代的 icons、canying");
  assert.equal(REQ.filter((r) => !r.startsWith("homemap/")).length, 52, "homemap 以外 52 張（13 朝代 × 4）");
  const H3 = Object.assign({}, W91, { [P + "data/icons/qin/feedback.webp"]: Buffer.alloc(4000, 1), [P + "data/canying/ming.webp"]: Buffer.alloc(4000, 2), [P + "data/icons/qin/other.webp"]: Buffer.alloc(4000, 3) }), A = idx(H3);
  const lost = Object.assign({}, H3); delete lost[P + "data/icons/qin/feedback.webp"];
  const r1 = AD.diffIndex(A, idx(lost), { expectRemoved: new RegExp("icons/qin/feedback[.]webp$") });
  assert.ok(r1.red.some((x) => x.f === P + "data/icons/qin/feedback.webp" && /首頁素材任何放行參數都不放過/.test(x.why)), "名單上的 icons 拿掉，窄參數放不過"); assert.equal(r1.allowed.length, 0);
  const sm = Object.assign({}, H3, { [P + "data/canying/ming.webp"]: "version https://git-lfs.github.com/spec/v1" });
  const r2 = AD.diffIndex(A, idx(sm), { expectShrunk: new RegExp("canying/") });
  assert.ok(r2.red.some((x) => x.f === P + "data/canying/ming.webp" && /首頁素材大幅縮小/.test(x.why)), "名單上的 canying 換成指標檔，窄參數放不過");
  const o3 = Object.assign({}, H3); delete o3[P + "data/icons/qin/other.webp"];
  const r3 = AD.diffIndex(A, idx(o3), { expectRemoved: new RegExp("icons/qin/other[.]webp$") });
  assert.equal(r3.red.length, 0, "名單外的 icons 照舊可以放行"); assert.ok(r3.allowed.some((x) => x.f === P + "data/icons/qin/other.webp"));
  const c = AD.canaryRun(A, A);
  assert.ok(![c.media.f, c.shrink.f].some((f) => REQ.includes(String(f).replace(P + "data/", ""))), "media、shrink 金絲雀避開整份名單：" + c.media.f);
});
test("#102 第十輪：工具鎖定 AAB-DIFF 也鎖 bundle-home-assets.js（首頁硬規則的名單被改小會被擋）", () => {
  const TP = require(path.join(ROOT, "xiangqi-android/scripts/tool-pin.js")), pins = TP.pinsFor("AAB-DIFF");
  assert.ok(Object.keys(pins).some((k) => /bundle-home-assets\.js$/.test(k)), JSON.stringify(Object.keys(pins)));
});

test("W91 金絲雀：從候選包自己做四種壞樣本（刪首頁素材、js 縮成 0、多帶 .jks、多一個沒確認的 AGENTS.md），同一套參數判斷；參數放太寬、包裡找不到檔就判失靈", () => {
  const A = idx(W91), B = idx(W91);
  const c = AD.canaryRun(A, B);
  assert.equal(c.ok, true, JSON.stringify(c));
  assert.equal(c.home.f, P + "data/homemap/home.webp"); assert.equal(c.zeroJs.f, P + "core.js");
  const wide = AD.canaryRun(A, B, { expectRemoved: new RegExp(".") });
  /* #102 第九輪：首頁素材改由硬規則擋，--expect-removed=. 也放不掉，所以 home 照樣抓到；放太寬改由 media（刪一張非首頁素材）失靈 */
  assert.equal(wide.home.ok, true, "首頁素材硬規則：--expect-removed=. 也放不掉");
  assert.equal(wide.media.ok, false, "--expect-removed=. 放行所有拿掉的檔：刪非首頁素材那個壞樣本就不紅，金絲雀要判失靈");
  assert.equal(wide.ok, false);
  assert.ok(!A.has(c.yellow.f) && !B.has(c.yellow.f) && !A.has(c.jks.f) && !B.has(c.jks.f), "#102 審查①：壞樣本的檔名新舊兩包都沒有");
  const ackAll = AD.canaryRun(A, B, { ack: new Set([c.yellow.f + "@5a5a5a5a:4096"]) });
  assert.equal(ackAll.yellow.ok, false, "確認清單剛好含壞樣本的確認碼，黃項被確認掉就判失靈");
  assert.equal(ackAll.ok, false, "#102 第四輪複審：第④種失靈，總結也要是失靈（out.ok 要看四種）");
  const bare = AD.canaryRun(idx(BASE), idx(BASE));
  assert.equal(bare.ok, false, "包裡沒有首頁素材、沒有根目錄 js：做不出壞樣本＝失靈，不能當通過");
  assert.equal(bare.zeroJs.f, null);
});
test("#102 第八、九輪：shrink（一張非首頁素材縮成 131 位元組）、debug（多帶 .map）、media（刪一張非首頁素材）都要紅；首頁素材與 debug 檔改由硬規則擋，金絲雀測的是放太寬的參數", () => {
  const A = idx(W91), B = idx(W91), c = AD.canaryRun(A, B);
  assert.deepEqual([...AD.CANARY_KINDS], ["home", "zeroJs", "jks", "yellow", "shrink", "debug", "media"]);
  assert.equal(c.ok, true, JSON.stringify(c));
  assert.equal(c.shrink.f, P + "data/park/a.webp", "shrink 挑非首頁素材"); assert.match(c.shrink.hit, /大幅縮小（3000 → 131/);
  assert.equal(c.media.f, P + "data/park/a.webp", "media 挑非首頁素材"); assert.match(c.media.hit, /新版少了這個檔/);
  assert.match(c.debug.f, /^base\/assets\/public\/canary-debug-[0-9a-f]+\.js\.map$/); assert.ok(!A.has(c.debug.f) && !B.has(c.debug.f), "壞樣本檔名新舊兩包都沒有");
  const sh = AD.canaryRun(A, B, { expectShrunk: new RegExp(".") });
  assert.equal(sh.shrink.ok, false, "--expect-shrunk=.：一般素材換成指標檔也被放行，金絲雀要失靈"); assert.equal(sh.ok, false);
  assert.equal(AD.canaryRun(A, B, { expectShrunk: new RegExp("data/") }).ok, false, "只要蓋到一般素材就失靈");
  assert.equal(AD.canaryRun(A, B, { expectShrunk: new RegExp("homemap/") }).ok, true, "只蓋到首頁素材：首頁硬規則擋，放行參數沒用，金絲雀照樣成立");
  assert.equal(AD.canaryRun(A, B, { expectShrunk: new RegExp("data/park/b[.]webp$") }).ok, true, "窄的放行參數不影響");
  const ad = AD.canaryRun(A, B, { expectAdded: new RegExp(".") });
  assert.equal(ad.debug.ok, true, "debug 硬規則：--expect-added=. 也放不掉 .map");
  assert.equal(ad.yellow.ok, false, "--expect-added=. 會放掉沒確認的說明檔：yellow 金絲雀失靈"); assert.equal(ad.ok, false);
  assert.equal(AD.canaryRun(A, B, { expectAdded: new RegExp("[.]map$") }).ok, true, "只蓋到 debug 檔：硬規則擋，放行參數沒用");
});

test("W91 報告：tool＝AAB-DIFF、strict、兩個 AAB 的 SHA-256、舊版本碼、工具雜湊、金絲雀；pass 要結束代碼 0＋--strict＋金絲雀都抓到；版本碼不是數字回 2", () => {
  const a = makeZip("w91-old.zip", W91), b = makeZip("w91-new.zip", Object.assign({}, W91, { [P + "data/new.webp"]: Buffer.alloc(100, 1) }));
  const out = path.join(TMP, "w91.json"), crypto = require("crypto"), sh = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  let c = run(a, b, "--strict", "--old-code=26112104", "--new-code=26112401", "--json=" + out);
  assert.equal(c.status, 0, c.stdout + c.stderr);
  let j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(j.tool, "AAB-DIFF"); assert.equal(j.strict, true); assert.equal(j.oldCode, "26112104"); assert.equal(j.newCode, "26112401");
  assert.equal(j.oldSha256, sh(a)); assert.equal(j.newSha256, sh(b)); assert.equal(j.exitCode, 0); assert.equal(j.canary.ok, true); assert.equal(j.pass, true);
  const TP = require(path.join(ROOT, "xiangqi-android/scripts/tool-pin.js"));
  assert.deepEqual(j.toolPins, TP.pinsFor("AAB-DIFF"));
  c = run(a, b, "--old-code=26112104", "--json=" + out); j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(c.status, 0); assert.equal(j.strict, false); assert.equal(j.pass, false, "沒加 --strict 不算通過");
  const a0 = makeZip("w91-bare-a.zip", BASE), b0 = makeZip("w91-bare-b.zip", Object.assign({}, BASE, { [P + "data/new.webp"]: Buffer.alloc(100, 1) }));
  c = run(a0, b0, "--strict", "--old-code=1", "--json=" + out); j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(c.status, 0, "結束代碼照舊只看紅黃"); assert.equal(j.canary.ok, false); assert.equal(j.pass, false, "金絲雀做不出來就不算通過");
  assert.equal(run(a, b, "--old-code=abc").status, 2);
});

test("#102 審查①：舊版帶著 AGENTS.md、新版正確拿掉（照參數放行）時，金絲雀照樣成立（壞樣本不再寫死這個檔名）", () => {
  const A = idx(Object.assign({}, W91, { [P + "AGENTS.md"]: "x".repeat(400) })), B = idx(W91);
  const o = { expectRemoved: new RegExp("AGENTS[.]md$") }, r = AD.diffIndex(A, B, o), c = AD.canaryRun(A, B, o);
  assert.equal(r.red.length, 0); assert.equal(c.ok, true, JSON.stringify(c));
});

test("#102 審查②＋建議⑥＋第九輪：證據資料夾 data/docs/evidence/、檔名大小寫不同、不論在哪一層的 AGENTS.md、CLAUDE.md、releases/ 都紅（第九輪起從黃改紅）", () => {
  const A = idx(W91), extra = ["data/docs/evidence/01_a.png", "data/docs/Verification-Log.txt", "data/docs/EVIDENCE.md", "data/AGENTS.md", "data/x/releases/a.md", "data/CLAUDE.md", "data/x/claude.md"];   /* #102 第十輪：補 CLAUDE.md（大小寫不分） */
  const B0 = Object.assign({}, W91); for (const f of extra) B0[P + f] = "z".repeat(200); B0["base/root/AGENTS.md"] = "z".repeat(200);
  const y = new Set(AD.diffIndex(A, idx(B0)).red.map((x) => x.f));
  for (const f of extra) assert.ok(y.has(P + f), f + " 要紅");
  assert.ok(y.has("base/root/AGENTS.md"), "base/root/ 底下的 AGENTS.md 也要");
  assert.ok(!AD.NEW_SUSPECT.test(P + "data/docs/privacy.md"), "一般說明文件照舊不報");
});

test("#102 審查③：命令列實跑時，金絲雀用的是同一套參數——--expect-removed=. 讓刪非首頁素材的壞樣本不紅，報告 canary.media.ok＝false、pass＝false（第九輪起首頁素材由硬規則擋，home 照樣抓到）", () => {
  const a = makeZip("c102-old.zip", W91), b = makeZip("c102-new.zip", Object.assign({}, W91, { [P + "data/new.webp"]: Buffer.alloc(100, 1) })), out = path.join(TMP, "c102.json");
  const c = run(a, b, "--strict", "--old-code=1", "--new-code=2", "--expect-removed=.", "--json=" + out);
  const j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(j.canary.home.ok, true, "首頁素材硬規則"); assert.equal(j.canary.media.ok, false, c.stdout); assert.equal(j.canary.ok, false); assert.equal(j.pass, false);
  const c2 = run(a, b, "--strict", "--old-code=1", "--new-code=2", "--json=" + out), j2 = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(j2.canary.media.ok, true, "沒放寬的照常抓到"); assert.equal(c2.status, 0);
});

test("#102 複審：閘門從兩個檔重算（recomputeFromFiles）——新版少了首頁素材要重算出紅項、兩個雜湊照實回報；新舊同一個檔、只差 zip 註解（每個檔都一樣）、不是 AAB，一律丟例外（閘門判沒驗到）", () => {
  const G = require(path.join(ROOT, "xiangqi-android/scripts/p0-gate.js")), crypto = require("crypto"), sh = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  const old = makeZip("rf-old.zip", W91), lost = Object.assign({}, W91); delete lost[P + "data/homemap/home.webp"]; const neu = makeZip("rf-new.zip", lost);
  const r = G.recomputeFromFiles(AD, old, neu, {}, new Set());
  assert.ok(r.red.some((x) => x.f === P + "data/homemap/home.webp"), "新版少了首頁素材：重算要有紅項（新舊讀錯檔就抓不到）");
  assert.equal(r.oldSha256, sh(old)); assert.equal(r.newSha256, sh(neu)); assert.notEqual(r.oldSha256, r.newSha256);
  assert.throws(() => G.recomputeFromFiles(AD, neu, neu, {}, new Set()), /同一個檔/, "新舊同一個檔");
  const withComment = path.join(TMP, "rf-comment.zip"), buf = fs.readFileSync(neu), c = Buffer.from("x".repeat(9)); const z = Buffer.concat([buf, c]); z.writeUInt16LE(c.length, buf.length - 2); fs.writeFileSync(withComment, z);
  assert.notEqual(sh(withComment), sh(neu), "加了 zip 註解，雜湊不同");
  assert.throws(() => G.recomputeFromFiles(AD, withComment, neu, {}, new Set()), /一模一樣/, "只差 zip 註解：每個檔都一樣，多半拿錯檔");
  assert.throws(() => G.recomputeFromFiles(AD, makeZip("rf-x.zip", { "README.md": "a" }), neu, {}, new Set()), /不是 AAB/, "不是 AAB");
});

/* ---------- #102 第三輪複審（iMac Claude 1 的新代理人）：閘門讀兩包 manifest 裡實際的 versionCode；main 的串接抽成 prepareDiff，用真 zip 測 ---------- */
/* 假 manifest：照 aapt2 protobuf 的樣子，屬性名稱 versionCode 後面接字串值（中間夾幾個欄位位元組） */
/* 假 manifest：照 aapt2 的 protobuf 結構（XmlNode.element → XmlElement.name＝manifest、attribute＝XmlAttribute{name, value 字串, compiled_item.prim.int_decimal_value}） */
const pbV = (n) => { const o = []; n = n >>> 0; do { let b = n & 127; n = Math.floor(n / 128); if (n) b |= 128; o.push(b) } while (n); return Buffer.from(o) };
const pbL = (f, b) => { b = Buffer.isBuffer(b) ? b : Buffer.from(String(b)); return Buffer.concat([pbV(f * 8 + 2), pbV(b.length), b]) };
const pbI = (f, n) => Buffer.concat([pbV(f * 8), pbV(n)]);
const ATTR = (name, str, num) => pbL(4, Buffer.concat([pbL(1, "http://schemas.android.com/apk/res/android"), pbL(2, name), pbL(3, str), num == null ? Buffer.alloc(0) : pbL(6, pbL(7, pbI(6, num)))]));
const MFX = (...attrs) => pbL(1, Buffer.concat([pbL(3, "manifest"), ...attrs]));
const MF = (code, str = String(code)) => MFX(ATTR("versionCode", str, code), ATTR("versionName", "0528"));
const W91V = (code, more = {}) => Object.assign({}, W91, { "base/manifest/AndroidManifest.xml": MF(code) }, more);
test("#102 第三、四輪：versionCodeOf 照 protobuf 讀編譯過的整數；字串跟整數不一致（只改字串的假舊包）、空字串、abc、0x10、前導 0、11 位數都丟例外；versionCodeMajor 不算；兩個 versionCode、沒有整數、找不到也丟例外；readEntry 核對 CRC", () => {
  const z = (n, mf) => makeZip("vc-" + n + ".zip", W91V(0, { "base/manifest/AndroidManifest.xml": mf }));
  assert.equal(AD.versionCodeOf(makeZip("vc-1.zip", W91V(26112401))), 26112401);
  assert.throws(() => AD.versionCodeOf(z("atk", MF(26112401, "26112301"))), /不一致/, "代理人的攻擊：字串改成 26112301、整數照舊 26112401");
  for (const [k, s] of [["e", ""], ["abc", "abc"], ["hex", "0x10"], ["lead0", "026112401"], ["11", "26112401000"]]) assert.throws(() => AD.versionCodeOf(z(k, MF(26112401, s))), /不一致/, "字串「" + s + "」");
  assert.equal(AD.versionCodeOf(z("major", MFX(ATTR("versionCodeMajor", "7", 7), ATTR("versionCode", "26112301", 26112301)))), 26112301, "versionCodeMajor 不算");
  assert.throws(() => AD.versionCodeOf(z("two", MFX(ATTR("versionCode", "1", 1), ATTR("versionCode", "2", 2)))), /2 個 versionCode/);
  assert.throws(() => AD.versionCodeOf(z("noint", MFX(ATTR("versionCode", "26112401", null)))), /沒有編譯過的整數/);
  assert.throws(() => AD.versionCodeOf(z("none", MFX(ATTR("versionName", "x", null)))), /找不到 versionCode/);
  assert.throws(() => AD.versionCodeOf(z("raw", Buffer.from("versionCode\x22\x0826112401"))), /protobuf|根/, "不是 protobuf 的字串搜尋寫法不收");
  assert.throws(() => AD.versionCodeOf(makeZip("vc-4.zip", W91)), /protobuf|根/, "<manifest/> 文字檔");
  const f = makeZip("vc-5.zip", W91V(26112401)), b = fs.readFileSync(f), i = b.indexOf(Buffer.from("26112401")); b[i] = 0x39; fs.writeFileSync(f, b);
  assert.throws(() => AD.versionCodeOf(f), /CRC/, "內容被改過、CRC 對不起來");
});

test("#102 第三輪：prepareDiff（main 的串接）——舊＝--old-aab、新＝--aab、版本碼從兩包 manifest 讀；確認清單只用閘門收的 --ack；缺檔、ack 格式錯丟例外；閘門擋假舊包、假版本碼、缺雜湊", () => {
  const G = require(path.join(ROOT, "xiangqi-android/scripts/p0-gate.js")), crypto = require("crypto"), sh = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  const old = makeZip("pd-old.zip", W91V(26112301)), neu = makeZip("pd-new.zip", W91V(26112401, { [P + "NOTES-dev.md"]: "x", [P + "index.html"]: "<html>v2", [P + "core.js"]: "var a=2;".repeat(40) }));
  const rep = (o = {}) => ({ file: "aab-diff.json", json: Object.assign({ tool: "AAB-DIFF", strict: true, newSha256: sh(neu), oldSha256: sh(old), oldCode: "26112301", newCode: "26112401", red: [], yellow: [], acked: [], allowed: [], exitCode: 0, pass: true, args: {} }, o) });
  let re = G.prepareDiff({ oldPath: old, aabPath: neu, reports: [rep()] });
  assert.deepEqual([re.oldCode, re.newCode, re.oldSha256, re.newSha256], [26112301, 26112401, sh(old), sh(neu)], "版本碼、雜湊都照兩個檔實際的");
  assert.equal(re.yellow.length, 1, "多一個 NOTES-dev.md：黃項（沒給 --ack；第九輪起 AGENTS.md 是紅，改用一般說明檔）");
  const ackOfReport = re.yellow[0].ack;
  /* #102 第十輪：報告的 acked 用真報告的形狀（物件陣列 {f, why, ack}），args.ack 指到一份真的、含確認碼的清單檔——原本用字串陣列和不存在的檔名，閘門真的去讀報告也不會對上，守不住 */
  const ackF = path.join(TMP, "pd-ack.json"); fs.writeFileSync(ackF, JSON.stringify([ackOfReport]));
  const y0 = re.yellow[0];
  re = G.prepareDiff({ oldPath: old, aabPath: neu, reports: [rep({ acked: [{ f: y0.f, why: y0.why, ack: ackOfReport }], args: { ack: ackF } })] });
  assert.equal(re.yellow.length, 1, "報告自己寫的確認清單（真報告形狀、清單檔真的存在）不算：還是黃項");
  re = G.prepareDiff({ oldPath: old, aabPath: neu, ackPath: ackF, reports: [rep()] }); assert.equal(re.yellow.length, 0, "閘門收的 --ack 才算");
  fs.writeFileSync(ackF, "{}"); assert.throws(() => G.prepareDiff({ oldPath: old, aabPath: neu, ackPath: ackF, reports: [rep()] }), /--ack/);
  assert.throws(() => G.prepareDiff({ oldPath: path.join(TMP, "nope.zip"), aabPath: neu, reports: [rep()] }), /找不到 --old-aab/);
  assert.equal(G.prepareDiff({ aabPath: neu, reports: [] }), null, "沒給 --old-aab：不重算（閘門會擋「沒有自己重算」）");
  /* 把重算結果交給閘門裡 AAB-DIFF 那一段，只看那一段的問題 */
  const problems = (r, R) => G.gate(sh(neu), "20261124-0528", [R || rep()], [], { mainSha: () => "", diffRe: r }).problems.filter((p) => /^AAB-DIFF：/.test(p) && !/工具雜湊|toolPins|金絲雀沒抓到（home/.test(p));   /* 只看閘門重算那幾條；假報告沒帶 toolPins、canary，那兩條不算 */
  const good = G.prepareDiff({ oldPath: old, aabPath: neu, ackPath: (fs.writeFileSync(ackF, JSON.stringify([ackOfReport])), ackF), reports: [rep()] });
  assert.deepEqual(problems(good).filter((p) => /versionCode|舊版|新版|重算/.test(p)), [], "正常：版本碼、雜湊都對得上：" + problems(good).join("；"));
  /* 代理人實跑的攻擊 1：從候選包改出來的假舊包（版本碼跟候選包一樣） */
  const fake = makeZip("pd-fake.zip", W91V(26112401, { [P + "index.html"]: "<html><!-- 改一行 -->" }));
  const rf = G.prepareDiff({ oldPath: fake, aabPath: neu, ackPath: ackF, reports: [rep({ oldSha256: sh(fake) })] });
  assert.ok(problems(rf, rep({ oldSha256: sh(fake) })).some((p) => /manifest 的 versionCode 是 26112401，報告寫 26112301/.test(p)), "假舊包：版本碼跟報告不符");
  assert.ok(problems(rf, rep({ oldSha256: sh(fake), oldCode: "26112401", newCode: "26112402" })).some((p) => /沒有比 --old-aab 那一包（26112401）大/.test(p)), "就算報告照假包寫，新版不比舊版大也擋");
  /* 攻擊 2：報告的版本碼改成假的 */
  assert.ok(problems(good, rep({ oldCode: "20000000", newCode: "99999999" })).filter((p) => /manifest 的 versionCode/.test(p)).length === 2, "假的 oldCode、newCode 都擋");
  /* 缺值不放行：沒有雜湊、沒有版本碼（讀不到 manifest）、新版雜湊不是送審這包 */
  for (const [k, re2] of [["newSha256", { newSha256: undefined }], ["oldSha256", { oldSha256: undefined }], ["codes", { oldCode: null, newCode: null, codeErr: "讀不到" }], ["別包", { newSha256: "e".repeat(64) }]])
    assert.ok(problems(Object.assign({}, good, re2)).length > 0, "缺 " + k + " 要擋");
  const noMf = G.recomputeFromFiles(AD, makeZip("pd-nomf-old.zip", W91), makeZip("pd-nomf-new.zip", W91V(0, { [P + "core.js"]: "var b=2;" })), {}, new Set());
  assert.ok(noMf.codeErr && noMf.oldCode === null, "manifest 讀不到版本碼：記原因、不猜");
});

test("#102 第三輪：aab-diff 命令列的 --old-code／--new-code 跟 manifest 讀到的不一樣就不驗（結束代碼 2）；一樣就照常，報告記下 manifest 讀到的", () => {
  const a = makeZip("cl-old.zip", W91V(26112301)), b = makeZip("cl-new.zip", W91V(26112401)), out = path.join(TMP, "cl.json");
  let c = run(a, b, "--strict", "--old-code=26112301", "--new-code=26112401", "--json=" + out);
  assert.equal(c.status, 0, c.stdout + c.stderr); const j = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.deepEqual([j.oldCodeManifest, j.newCodeManifest], [26112301, 26112401]);
  c = run(a, b, "--strict", "--old-code=20000000", "--new-code=26112401"); assert.equal(c.status, 2); assert.match(c.stderr, /--old-code=20000000 跟 AAB manifest 裡的 versionCode（26112301）不一樣/);
  c = run(a, b, "--strict", "--old-code=26112301", "--new-code=99999999"); assert.equal(c.status, 2);
});

test("#102 第四輪：閘門逐項核對四種金絲雀（總結說都抓到、但第④種沒抓到也擋）；新舊兩包不到 3 個檔不同就擋；--diff-receipt 指到輸入檔結束代碼 2", () => {
  const G = require(path.join(ROOT, "xiangqi-android/scripts/p0-gate.js")), A = "a".repeat(64), D = "d".repeat(64);
  const rep = { file: "aab-diff.json", json: { tool: "AAB-DIFF", strict: true, newSha256: A, oldSha256: D, oldCode: "26112301", newCode: "26112401", red: [], yellow: [], acked: [], allowed: [], exitCode: 0, pass: true, args: {} } };
  const RE = (o = {}) => Object.assign({ red: [], yellow: [], acked: [], allowed: 0, canaryOk: true, canary: { ok: true, home: { ok: true, f: "h.webp", hit: "拿掉" }, zeroJs: { ok: true, f: "a.js", hit: "0 位元組" }, jks: { ok: true, f: "x.jks", hit: "金鑰" }, yellow: { ok: true, f: "A.md", hit: "不在" }, shrink: { ok: true, f: "h.webp", hit: "大幅縮小" }, debug: { ok: true, f: "c.js.map", hit: "debug" }, media: { ok: true, f: "p.webp", hit: "少了" } }, newSha256: A, oldSha256: D, oldCode: 26112301, newCode: 26112401, changed: 40 }, o);
  const PB = (re) => G.gate(A, "20261124-0528", [rep], [], { mainSha: () => "", diffRe: re }).problems.filter((p) => /^AAB-DIFF：/.test(p) && !/工具雜湊|toolPins|金絲雀沒抓到（home/.test(p));
  assert.deepEqual(PB(RE()), [], "全部正常");
  assert.ok(PB(RE({ canary: { ok: true, home: { ok: true, f: "h.webp", hit: "拿掉" }, zeroJs: { ok: true, f: "a.js", hit: "0 位元組" }, jks: { ok: true, f: "x.jks", hit: "金鑰" }, yellow: { ok: false, f: "A.md", hit: null } } })).some((p) => /金絲雀「yellow」沒抓到/.test(p)), "第④種失靈：就算總結 canaryOk 是 true 也擋");
  assert.ok(PB(RE({ canary: undefined })).some((p) => /金絲雀「home」沒抓到/.test(p)), "沒有逐項結果也擋");
  for (const n of [0, 1, 2]) assert.ok(PB(RE({ changed: n })).some((p) => new RegExp("只差 " + n + " 個檔").test(p)), "只差 " + n + " 個檔");
  assert.ok(PB(RE({ changed: undefined })).some((p) => /只差/.test(p)), "沒算變動檔數也擋");
  const old = makeZip("rc-old.zip", W91V(26112301)), neu = makeZip("rc-new.zip", W91V(26112401, { [P + "index.html"]: "<html>v2", [P + "core.js"]: "var a=3;" }));
  const re = G.recomputeFromFiles(AD, old, neu, {}, new Set()); assert.equal(re.changed, 3, "manifest、index.html、core.js 三個檔不同");
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, "xiangqi-android/scripts/p0-gate.js"), "--aab", neu, "--build", "20261124-0528", "--diff-receipt", neu, "--reports", neu], { encoding: "utf8" });
  assert.equal(r.status, 2); assert.match(r.stderr, /--diff-receipt 不能指到輸入檔/); assert.ok(fs.statSync(neu).size > 1000, "AAB 沒被蓋掉");
});

test("#102 第五輪：四種金絲雀各自要有壞樣本檔名和比對抓到的原因（hit），而且跟 diffIndex 獨立重算一致；閘門少了 f 或 hit 就擋", () => {
  const A = new Map(Object.entries(W91).filter(([k]) => !k.endsWith("/")).map(([k, v]) => { const b = Buffer.isBuffer(v) ? v : Buffer.from(String(v)); return [k, { size: b.length, csize: b.length, crc: zlib.crc32(b) }] }));
  const c = AD.canaryRun(A, new Map(A), {});
  const want = { home: ["red", (M, f) => M.delete(f)], zeroJs: ["red", (M, f) => M.set(f, { size: 0, csize: 0, crc: 0 })], jks: ["red", (M, f) => M.set(f, { size: 2048, csize: 2000, crc: 0x1234abcd })], yellow: ["yellow", (M, f) => M.set(f, { size: 4096, csize: 1500, crc: 0x5a5a5a5a })],
    shrink: ["red", (M, f) => M.set(f, { size: 131, csize: 131, crc: 0x7f13ab01 })], debug: ["red", (M, f) => M.set(f, { size: 5120, csize: 1400, crc: 0x3c3c3c3c })], media: ["red", (M, f) => M.delete(f)] };   /* #102 第八、九輪補的三種也跟獨立重算比 */
  for (const [k, [where, mut]] of Object.entries(want)) {
    assert.equal(c[k].ok, true, k); assert.equal(typeof c[k].f, "string", k + " 有壞樣本檔名"); assert.equal(typeof c[k].hit, "string", k + " 有抓到的原因");
    const B2 = new Map(A); mut(B2, c[k].f); const h = AD.diffIndex(A, B2, {})[where].find((x) => x.f === c[k].f);
    assert.ok(h, k + "：獨立重算也抓得到"); assert.equal(c[k].hit, h.why, k + "：原因跟獨立重算一樣（不是寫死的 ok）");
  }
  assert.ok(/.jks$/.test(c.jks.f) && /金鑰/.test(c.jks.hit)); assert.ok(/.js$/.test(c.zeroJs.f) && /0 位元組/.test(c.zeroJs.hit)); assert.ok(/homemap/.test(c.home.f));
  assert.ok(!/homemap/.test(c.media.f) && !/homemap/.test(c.shrink.f), "media、shrink 挑非首頁素材（#102 第九輪）");
  const wd = AD.canaryRun(A, new Map(A), { expectRemoved: /./ });
  assert.equal(wd.home.ok, true, "首頁素材硬規則：放行參數蓋不掉 home"); assert.equal(wd.media.ok, false, "media 被放行參數蓋掉時要失靈");
  const G = require(path.join(ROOT, "xiangqi-android/scripts/p0-gate.js")), A64 = "a".repeat(64), D64 = "d".repeat(64);
  const rep = { file: "aab-diff.json", json: { tool: "AAB-DIFF", strict: true, newSha256: A64, oldSha256: D64, oldCode: "26112301", newCode: "26112401", red: [], yellow: [], acked: [], allowed: [], exitCode: 0, pass: true, args: {} } };
  const base = { red: [], yellow: [], acked: [], allowed: 0, canaryOk: true, newSha256: A64, oldSha256: D64, oldCode: 26112301, newCode: 26112401, changed: 40 };
  const PB = (can) => G.gate(A64, "20261124-0528", [rep], [], { mainSha: () => "", diffRe: Object.assign({}, base, { canary: can }) }).problems.filter((p) => /金絲雀「/.test(p));
  assert.deepEqual(PB(c), [], "真的金絲雀結果：不擋");
  for (const k of ["home", "zeroJs", "jks", "yellow"]) {
    assert.ok(PB(Object.assign({}, c, { [k]: { ok: true } })).some((p) => p.includes("「" + k + "」")), k + "：只寫 ok:true、沒有檔名和原因，擋");
    assert.ok(PB(Object.assign({}, c, { [k]: Object.assign({}, c[k], { hit: "" }) })).some((p) => p.includes("「" + k + "」")), k + "：原因是空的，擋");
  }
});

test("#102 第五輪：收據位置已經有檔案（一般檔、指到 AAB 的硬連結）就在一開始結束代碼 2，AAB 不會被蓋掉；寫收據用 flag wx", () => {
  const neu = makeZip("rx-new.zip", W91V(26112401)), size = fs.statSync(neu).size, hl = path.join(TMP, "rx-hardlink.json");
  try { fs.unlinkSync(hl) } catch (e) {} fs.linkSync(neu, hl);
  const run2 = (rc) => cp.spawnSync(process.execPath, [path.join(ROOT, "xiangqi-android/scripts/p0-gate.js"), "--aab", neu, "--build", "20261124-0528", "--diff-receipt", rc, "--reports", neu], { encoding: "utf8" });
  let r = run2(hl); assert.equal(r.status, 2); assert.match(r.stderr, /已經有檔案/); assert.equal(fs.statSync(neu).size, size, "硬連結指到的 AAB 沒被蓋掉");
  const ex = path.join(TMP, "rx-exists.json"); fs.writeFileSync(ex, "{}"); r = run2(ex); assert.equal(r.status, 2); assert.equal(fs.readFileSync(ex, "utf8"), "{}");
  const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-android/scripts/p0-gate.js"), "utf8");
  assert.ok(SRC.includes('JSON.stringify(aabDiffReceipt(sha, reports, diffRe), null, 1) + "\\n", { flag: "wx" })'), "寫收據用 wx：就算檢查之後才冒出檔案也不蓋");
});

test("〔原始碼〕#102 第五輪：main 的串接——prepareDiff 參數照順序、重算結果原樣交給閘門（沒有改 red／yellow）、印出放行參數", () => {
  const SRC = fs.readFileSync(path.join(ROOT, "xiangqi-android/scripts/p0-gate.js"), "utf8"), M = SRC.slice(SRC.indexOf("async function main()"));
  assert.ok(M.includes("diffRe = prepareDiff({ oldPath: OLD, aabPath: AAB, ackPath: ACK, reports })"), "舊＝--old-aab、新＝--aab、確認清單＝--ack");
  assert.ok(!/diffRe\.(red|yellow|acked|canary|canaryOk|changed|oldCode|newCode|oldSha256|newSha256)\s*=[^=]/.test(M), "main 沒有改寫重算結果");
  assert.deepEqual((M.match(/diffRe\s*=[^=>][^\n]{0,14}/g) || []), ["diffRe = null, oldSha =", "diffRe = prepareDiff({ "], "main 裡 diffRe 只有宣告和 prepareDiff 兩次指定，沒有換成別的東西");
  assert.ok(M.includes("const r = gate(sha, BUILD, reports, fromRepo ? waivers : [], { mainSha, cdnProbe, diffRe, oldSha });"), "重算結果原樣交給閘門");
  assert.ok(M.includes('放行參數 ${args.length ? args.join(" ") : "沒有"}'), "印出放行參數");
});

/* #102 第六、七輪複審（iMac Claude 1 的新代理人）：main 的串接要真的跑——在暫存資料夾搭一個 git 倉庫（origin/main 指向自己，工具鎖定讀得到），
   執行 p0-gate.js 本身，配齊 P0-IMG、P0-UPD、P0-3D（12、16）與金絲雀、產物比對的報告。不靠比對原始碼字串：
   main 在 gate 之前用任何寫法換掉、清空重算結果（解構賦值、換新物件），或不印、亂印放行參數、不寫收據，下面某一種情況就會紅 */
function e2eRun({ oldF, newF, args = {}, ack = null, extra = [] }) {
  const crypto = require("crypto"), sh = (f) => crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex");
  const T = fs.mkdtempSync(path.join(os.tmpdir(), "p0e2e-")), SD = path.join(T, "source", "xiangqi-android", "scripts");
  fs.cpSync(path.join(ROOT, "xiangqi-android", "scripts"), SD, { recursive: true });
  const git = (...a) => cp.execFileSync("git", ["-C", T, ...a], { stdio: ["ignore", "pipe", "pipe"] }).toString();
  git("init", "-q"); git("checkout", "-q", "-b", "main"); git("-c", "user.name=t", "-c", "user.email=t@t", "add", "-A"); git("-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "e2e");
  git("remote", "add", "origin", T); git("fetch", "-q", "origin");
  const TP = require(path.join(SD, "tool-pin.js")), A = sh(newF), K = "c".repeat(64), V = "20261124-0528", RD = path.join(T, "rep");
  fs.mkdirSync(RD);
  const reps = {
    "img.json": { tool: "P0-IMG", aabSha256: A, pass: true, cdnChecked: true, exitCode: 0, siteVersion: V, red: 0, unknown: 0, redItems: [], canary: { home: true, stale: true, cdn404: true, ok: true, deep: { w21: { ok: true }, w30: { ok: true }, home: { ok: true }, hash: { ok: true }, w42: { ok: true } } }, toolPins: TP.pinsFor("P0-IMG") },
    "upd.json": { tool: "P0-UPD", aabSha256: A, apkSha256: K, apkBound: true, pass: true, oldWorker: true, new: { build: V }, canary: { dialog: true }, toolPins: TP.pinsFor("P0-UPD") },
    "aab-diff.json": { tool: "AAB-DIFF", strict: true, newSha256: A, oldSha256: sh(oldF), oldCode: "26112301", newCode: "26112401", red: [], yellow: [], acked: [], allowed: [], exitCode: 0, pass: true, args, canary: { ok: true, home: { ok: true }, zeroJs: { ok: true }, jks: { ok: true }, yellow: { ok: true }, shrink: { ok: true }, debug: { ok: true }, media: { ok: true } }, toolPins: TP.pinsFor("AAB-DIFF") },
  };
  for (const an of ["12", "16"]) {
    reps["3d-" + an + ".json"] = { tool: "P0-3D", aabSha256: A, apkSha256: K, apkBound: true, pass: true, build: V, android: an, full: true, rounds: 2, roundsPassed: 2, knownFile: { fromRepo: true }, toolPins: TP.pinsFor("P0-3D") };
    reps["3d-canary-" + an + ".json"] = { tool: "P0-3D", selfTest: true, aabSha256: A, apkSha256: K, apkBound: true, pass: true, build: V, android: an, full: false, toolPins: TP.pinsFor("P0-3D") };
  }
  for (const [n, j] of Object.entries(reps)) fs.writeFileSync(path.join(RD, n), JSON.stringify(j));
  const rc = path.join(T, "receipt.json"), argv = [path.join(SD, "p0-gate.js"), "--aab", newF, "--build", V, "--old-aab", oldF, "--diff-receipt", rc, ...extra];
  if (ack) { const af = path.join(T, "ack.json"); fs.writeFileSync(af, JSON.stringify(ack)); argv.push("--ack", af) }
  argv.push("--reports", ...Object.keys(reps).map((n) => path.join(RD, n)));
  const r = cp.spawnSync(process.execPath, argv, { encoding: "utf8", cwd: T, timeout: 120000 }), out = r.stdout + r.stderr;
  const sum = /閘門重算：紅 (\d+)、沒確認的黃 (\d+)、金絲雀(都抓到|沒抓到)、照參數放行 (\d+) 個/.exec(out);
  const res = { status: r.status, out, sum: sum ? { red: +sum[1], yellow: +sum[2], canary: sum[3], allowed: +sum[4] } : null, receipt: fs.existsSync(rc) ? JSON.parse(fs.readFileSync(rc, "utf8")) : null, A, oldSha: sh(oldF) };
  fs.rmSync(T, { recursive: true, force: true });
  return res;
}
test("#102 第六、七輪：端到端真跑 p0-gate.js——好包（帶非空的 --expect-removed）通過、逐字印放行參數、寫出完整收據；三種壞包（少首頁圖＋假報告、多一個沒確認的文件、--expect-removed=.）都擋", () => {
  const G = require(path.join(ROOT, "xiangqi-android/scripts/p0-gate.js"));
  const old = makeZip("e2e-old.zip", W91V(26112301)), base = W91V(26112401, { [P + "index.html"]: "<html>v2", [P + "core.js"]: "var a=9;".repeat(40) });
  /* 好包：照預期拿掉一張公園圖，報告的放行參數寫 --expect-removed */
  const goodM = Object.assign({}, base); delete goodM[P + "data/park/a.webp"]; const good = makeZip("e2e-good.zip", goodM), RX = "data/park/a\\.webp$";
  /* #102 第八輪（中）：好包三種放行參數都帶非空值（窄的、不會蓋到首頁素材或 debug 檔），三種都要逐字印出、收據 args 三種都對上 */
  const GA = { "expect-removed": RX, "expect-shrunk": "data/park/b\\.webp$", "expect-added": "data/park/c\\.webp$" };
  /* 放行參數本身也是黃項（要人看過、寫進 --ack）；確認碼照閘門同一支程式算，人寫的清單就是這幾筆 */
  const ACK = G.recomputeFromFiles(AD, old, good, GA, new Set()).yellow.map((y) => y.ack);
  assert.ok(ACK.length >= 1 && ACK.every((k) => /@/.test(k)), "放行參數要人確認：" + ACK.join("、"));
  const g = e2eRun({ oldF: old, newF: good, args: GA, ack: ACK });
  assert.equal(g.status, 0, "好包要通過：" + g.out.split("\n").filter((l) => /✘|⚠|問題|不能/.test(l)).join(" ／ ").slice(0, 900));
  assert.deepEqual(g.sum, { red: 0, yellow: 0, canary: "都抓到", allowed: 1 });
  for (const [k, v] of Object.entries(GA)) assert.ok(g.out.includes("--" + k + "=" + v), "逐字印出放行參數 --" + k);
  assert.ok(g.receipt, "通過時寫出收據");
  assert.equal(g.receipt.tool, "AAB-DIFF"); assert.equal(g.receipt.aabSha256, g.A); assert.equal(g.receipt.oldSha256, g.oldSha); assert.equal(g.receipt.oldCode, "26112301"); assert.equal(g.receipt.newCode, "26112401");
  assert.deepEqual(g.receipt.args, GA); assert.equal(g.receipt.allowed, 1); assert.equal(g.receipt.recomputed, true); assert.ok(g.receipt.toolPins);
  /* #102 第八輪（不擋，照做）：收據另外記閘門自己的 aab-diff.js、p0-gate.js 雜湊 */
  const shf = (f) => require("crypto").createHash("sha256").update(fs.readFileSync(path.join(ROOT, "xiangqi-android/scripts", f))).digest("hex");
  assert.deepEqual(g.receipt.gatePins, { "aab-diff.js": shf("aab-diff.js"), "p0-gate.js": shf("p0-gate.js") });
  /* 壞包一：少了首頁圖，報告手改成沒有紅項 */
  const lost = Object.assign({}, base); delete lost[P + "data/homemap/home.webp"];
  const b1 = e2eRun({ oldF: old, newF: makeZip("e2e-bad1.zip", lost) });
  assert.notEqual(b1.status, 0); assert.ok(b1.sum && b1.sum.red >= 1, "閘門重算出紅項：" + JSON.stringify(b1.sum)); assert.match(b1.out, /閘門重算有紅項（[^）]*homemap\/home\.webp/); assert.equal(b1.receipt, null, "沒通過不寫收據");
  assert.doesNotMatch(b1.out, /不是要送審的這個 AAB|不是 --old-aab 這一包|工具雜湊|跟 origin\/main 不一樣/, "新舊沒讀反、工具鎖定正確（不然測不到東西）");
  /* 壞包二：多一個沒確認的說明文件（報告寫沒有黃項） */
  const b2 = e2eRun({ oldF: old, newF: makeZip("e2e-bad2.zip", Object.assign({}, base, { [P + "NOTES-dev.md"]: "內部筆記" })) });
  assert.notEqual(b2.status, 0); assert.ok(b2.sum && b2.sum.yellow >= 1, "閘門重算出沒確認的黃項：" + JSON.stringify(b2.sum)); assert.match(b2.out, /閘門重算有沒確認的黃項（[^）]*NOTES-dev\.md/);
  /* 壞包三：放行參數寫成全部放行（--expect-removed=.），金絲雀要失靈 */
  const b3 = e2eRun({ oldF: old, newF: good, args: { "expect-removed": "." } });
  assert.notEqual(b3.status, 0); assert.ok(b3.sum && b3.sum.canary === "沒抓到", "金絲雀失靈：" + JSON.stringify(b3.sum)); assert.match(b3.out, /閘門重算的金絲雀沒抓到/); assert.ok(b3.out.includes("放行參數 --expect-removed=."));
  /* 壞包四（#102 第八輪代理人實跑的漏洞）：首頁圖換成 131 位元組（像 Git LFS 指標檔），--expect-shrunk=. 加上把黃項全確認掉。
     第八輪：靠 shrink 金絲雀失靈擋下；第九輪起首頁素材由硬規則直接判紅（放行參數放不掉），shrink 金絲雀也照樣失靈（「.」蓋到一般素材） */
  const lfsM = Object.assign({}, goodM, { [P + "data/homemap/home.webp"]: "version https://git-lfs.github.com/spec/v1\noid sha256:" + "0".repeat(64) + "\nsize 279784\n" });
  const lfs = makeZip("e2e-bad4.zip", lfsM), LA = { "expect-removed": RX, "expect-shrunk": "." };
  assert.ok(fs.statSync(lfs).size > 0 && Buffer.byteLength(lfsM[P + "data/homemap/home.webp"]) < 140, "壞樣本像 LFS 指標檔（約 130 位元組）");
  const b4 = e2eRun({ oldF: old, newF: lfs, args: LA, ack: G.recomputeFromFiles(AD, old, lfs, LA, new Set()).yellow.map((y) => y.ack) });
  assert.notEqual(b4.status, 0, "LFS 指標檔＋--expect-shrunk=. 不能送審"); assert.ok(b4.sum && b4.sum.red >= 1, "首頁硬規則：重算出紅項，放行參數放不掉：" + JSON.stringify(b4.sum));
  assert.match(b4.out, /閘門重算有紅項（[^）]*homemap\/home\.webp/);
  assert.equal(b4.sum.canary, "沒抓到"); assert.match(b4.out, /金絲雀「shrink」沒抓到/, "--expect-shrunk=. 蓋到一般素材，shrink 金絲雀也失靈"); assert.equal(b4.receipt, null);
  /* 情境五（#102 第八輪，低）：確認清單只用閘門自己收的 --ack——報告的 args 偷塞一份真的、含確認碼的清單，閘門沒給 --ack，要擋 */
  const ackF = path.join(os.tmpdir(), "p0e2e-sneak-ack-" + process.pid + ".json"); fs.writeFileSync(ackF, JSON.stringify(ACK));
  try {
    const b5 = e2eRun({ oldF: old, newF: good, args: Object.assign({}, GA, { ack: ackF }) });
    assert.notEqual(b5.status, 0, "報告裡的 ack 不算數"); assert.ok(b5.sum && b5.sum.yellow >= 1, "放行參數那個黃項沒人確認：" + JSON.stringify(b5.sum)); assert.equal(b5.receipt, null);
  } finally { fs.rmSync(ackF, { force: true }) }
  /* 情境六（#102 第八輪，不擋，照做）：參數值塞換行偽造一行「✔ 可以送審」——印出時要轉成跳脫字元，輸出裡不能多出那一行 */
  const BS = String.fromCharCode(92), NL = "\n", fake = RX + NL + "✔ 可以送審";
  const b6 = e2eRun({ oldF: old, newF: good, args: { "expect-removed": fake } });
  assert.notEqual(b6.status, 0); assert.ok(b6.out.includes("--expect-removed=" + RX + BS + "u000a✔ 可以送審"), "換行印成跳脫字元");
  assert.ok(!b6.out.split(NL).some((l) => l.trim() === "✔ 可以送審"), "輸出裡沒有一行單獨的「✔ 可以送審」");
  /* #102 第九輪（低）：參數的「鍵名」也跳脫（原本只跳脫值） */
  const b6k = e2eRun({ oldF: old, newF: good, args: { ["expect-removed" + NL + "✔ 可以送審" + NL + "x"]: "y", "expect-removed": RX } });
  assert.notEqual(b6k.status, 0); assert.ok(!b6k.out.split(NL).some((l) => l.trim() === "✔ 可以送審"), "鍵名塞換行也偽造不出一行「✔ 可以送審」");
  /* 情境七（#102 第九輪代理人用真 AAB 實跑的 P0）：用的都是「窄的」放行參數，不靠萬用字元 */
  const oldS = makeZip("e2e-old-s.zip", W91V(26112301, { [P + "data/homemap/home_spring.webp"]: Buffer.alloc(6000, 8) }));
  const sL = Object.assign({}, base, { [P + "data/homemap/home_spring.webp"]: Buffer.alloc(6000, 8) }); delete sL[P + "data/homemap/home_spring.webp"];
  const s7 = makeZip("e2e-bad7.zip", sL), A7 = { "expect-removed": "homemap/home_spring\\.webp$" };
  const b7 = e2eRun({ oldF: oldS, newF: s7, args: A7, ack: G.recomputeFromFiles(AD, oldS, s7, A7, new Set()).yellow.map((y) => y.ack) });
  assert.notEqual(b7.status, 0, "刪掉第二張首頁素材＋窄的 --expect-removed，不能送審"); assert.match(b7.out, /閘門重算有紅項（[^）]*home_spring\.webp/); assert.equal(b7.receipt, null);
  const m8 = makeZip("e2e-bad8.zip", Object.assign({}, base, { [P + "data/core.js.map"]: "{\"version\":3}" })), A8 = { "expect-added": "data/core\\.js\\.map$" };
  const b8 = e2eRun({ oldF: old, newF: m8, args: A8, ack: G.recomputeFromFiles(AD, old, m8, A8, new Set()).yellow.map((y) => y.ack) });
  assert.notEqual(b8.status, 0, "多帶 core.js.map＋窄的 --expect-added，不能送審"); assert.match(b8.out, /閘門重算有紅項（[^）]*core\.js\.map/); assert.equal(b8.receipt, null);
  /* 收據必填 */
  const r = cp.spawnSync(process.execPath, [path.join(ROOT, "xiangqi-android/scripts/p0-gate.js"), "--aab", good, "--build", "20261124-0528", "--reports", good], { encoding: "utf8" });
  assert.equal(r.status, 2); assert.match(r.stderr, /要給 --diff-receipt/);
  /* 深凍結：prepareDiff 的結果改不動 */
  const re = G.prepareDiff({ oldPath: old, aabPath: makeZip("e2e-bad1b.zip", lost), reports: [] });
  assert.ok(Object.isFrozen(re) && Object.isFrozen(re.red) && Object.isFrozen(re.canary));
  assert.throws(() => { "use strict"; re.red.length = 0 }); assert.ok(re.red.length > 0);
});
