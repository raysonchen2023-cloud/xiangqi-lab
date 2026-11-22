/* W69②（11/22）：iOS 送審前的安裝包素材檢查 xiangqi-ios/scripts/check-app-assets.js（對應 Android 的 test-aab-assets-check-1121.js）
   用假的 .app 資料夾和假的 .ipa（不壓縮 ZIP）重現幾種壞包，確認檢查會亮紅燈、正常包會綠燈。反測必紅：用有問題的成品測，抓不到就是放水。
   不連網（CDN 清單用 --manifest 給本機檔）、不開模擬器。用法：node --test xiangqi-lab/tools/test-app-assets-check-1122.js */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process"), crypto = require("crypto"), zlib = require("zlib");
const ROOT = path.join(__dirname, "..", "..");
const CHECK = path.join(ROOT, "xiangqi-ios", "scripts", "check-app-assets.js");
const HOMEJS = path.join(ROOT, "xiangqi-android", "scripts", "bundle-home-assets.js");
const { required: HOME } = require(HOMEJS);
const M = require(CHECK);
const sha = (s, n) => crypto.createHash("sha1").update(s).digest("hex").slice(0, n);
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });
const tmpdir = () => { const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-appchk-t-")); made.push(d); return d };

/* 一個正常的包：首頁必要素材、一張一般圖、一份 JSON、一個切塊大檔都在，清單和 CDN 清單都對得上 */
function goodFiles() {
  const f = { "index.html": '<script>window.XQ_BUILD="20261122-0804"</script>' };
  for (const h of HOME) f["data/" + h] = "img:" + h;
  f["data/park/a.webp"] = "park-a"; f["data/quiz.json"] = '{"q":1}'; f["data/gmgames.json"] = "big-book";
  f["engine/pikafish.js"] = "engine";
  const items = Object.keys(f).filter(k => k.startsWith("data/") && k !== "data/gmgames.json").map(k => [k, Buffer.byteLength(f[k]), sha(f[k], 8)]);
  f["data/preload.json"] = JSON.stringify({ v: 1, items, big: [["data/gmgames.json", 21e6, sha(f["data/gmgames.json"], 8)]] });
  return f;
}
function manifestOf(files) {
  const m = {}; for (const [k, v] of Object.entries(files)) if (/^(data|engine)\//.test(k) && k !== "data/preload.json") m[k] = [Buffer.byteLength(v), sha(v, 12)];
  return m;
}
function makeApp(files) {
  const d = tmpdir(), pub = path.join(d, "App.app", "public");
  for (const [k, v] of Object.entries(files)) { const p = path.join(pub, k); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, v) }
  return path.join(d, "App.app");
}
function writeManifest(m) { const f = path.join(tmpdir(), "cdn-manifest.json"); fs.writeFileSync(f, JSON.stringify({ at: "test", n: Object.keys(m).length, files: m })); return f }
/* 不壓縮的 ZIP：files＝{路徑: 內容} */
function zip(files) {
  const locals = [], central = []; let off = 0;
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
function makeIpa(files) {
  const z = {}; for (const [k, v] of Object.entries(files)) z["Payload/App.app/public/" + k] = v;
  const f = path.join(tmpdir(), "App.ipa"); fs.writeFileSync(f, zip(z)); return f;
}
function run(app, ...more) {
  const r = cp.spawnSync(process.execPath, [CHECK, "--app", app, ...more], { encoding: "utf8" });
  return { code: r.status, out: r.stdout + r.stderr };
}

test("正常的 .app：清單、首頁必要素材、CDN 清單都對得上 → 結束代碼 0", () => {
  const f = goodFiles(), r = run(makeApp(f), "--manifest", writeManifest(manifestOf(f)));
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /XQ_BUILD 20261122-0804/);
  assert.match(r.out, /✔ 安裝包素材沒有發現/);
});

test("反測：拿掉一張首頁圖 → ✘、結束代碼 1", () => {
  const f = goodFiles(); delete f["data/" + HOME[0]];
  const r = run(makeApp(f), "--manifest", writeManifest(manifestOf(goodFiles())));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /首頁離線必要素材不在安裝包裡/);
  assert.ok(r.out.includes("data/" + HOME[0]));
});

test("反測：包裡的圖是舊版（跟 preload.json 的 SHA-1 對不上）→ 結束代碼 1", () => {
  const f = goodFiles(); f["data/park/a.webp"] = "park-a-old";
  const r = run(makeApp(f));
  assert.equal(r.code, 1, r.out);
  assert.match(r.out, /跟清單不符/);
});

test("反測：清單上的圖片、切塊大檔不在包裡 → 結束代碼 1；只缺 JSON → △、結束代碼 0", () => {
  const a = goodFiles(); delete a["data/park/a.webp"];
  let r = run(makeApp(a)); assert.equal(r.code, 1, r.out); assert.match(r.out, /離線時直接破圖/);
  const b = goodFiles(); delete b["data/gmgames.json"];
  r = run(makeApp(b)); assert.equal(r.code, 1, r.out); assert.match(r.out, /切塊的大檔不在安裝包裡/);
  const c = goodFiles(); delete c["data/quiz.json"];
  r = run(makeApp(c)); assert.equal(r.code, 0, r.out); assert.match(r.out, /△ 1 項｜不在安裝包裡；網頁程式會自己改抓 CDN/);
});

test("反測：包裡的檔跟 CDN 清單不同（大小、SHA-1 各一種）→ 結束代碼 1；CDN 沒列的檔不比", () => {
  const f = goodFiles(), m = manifestOf(f);
  m["data/park/a.webp"] = [m["data/park/a.webp"][0] + 1, m["data/park/a.webp"][1]];
  let r = run(makeApp(f), "--manifest", writeManifest(m)); assert.equal(r.code, 1, r.out); assert.match(r.out, /跟 CDN 不是同一份/);
  const m2 = manifestOf(f); m2["engine/pikafish.js"] = [m2["engine/pikafish.js"][0], "000000000000"];
  r = run(makeApp(f), "--manifest", writeManifest(m2)); assert.equal(r.code, 1, r.out);
  const m3 = manifestOf(f); delete m3["data/quiz.json"];
  r = run(makeApp(f), "--manifest", writeManifest(m3)); assert.equal(r.code, 0, r.out);
});

test(".ipa 也能檢查：正常包 0、拿掉首頁圖 1，暫存資料夾會清掉", () => {
  const f = goodFiles(), man = writeManifest(manifestOf(f));
  const before = fs.readdirSync(os.tmpdir()).filter(n => n.startsWith("xq-ipachk-")).length;
  assert.equal(run(makeIpa(f), "--manifest", man).code, 0);
  const g = goodFiles(); delete g["data/" + HOME[1]];
  assert.equal(run(makeIpa(g), "--manifest", man).code, 1);
  assert.equal(fs.readdirSync(os.tmpdir()).filter(n => n.startsWith("xq-ipachk-")).length, before);
});

test("壞的輸入：沒有 preload.json → 1；沒有 public/ 或沒給 --app → 2；要核對 CDN 卻缺驗 → 3", () => {
  const f = goodFiles(); delete f["data/preload.json"];
  assert.equal(run(makeApp(f)).code, 1);
  const d = tmpdir(); fs.mkdirSync(path.join(d, "Empty.app"));
  assert.equal(run(path.join(d, "Empty.app")).code, 2);
  assert.equal(cp.spawnSync(process.execPath, [CHECK], { encoding: "utf8" }).status, 2);
  assert.equal(M.exitCode({ red: 0, unknown: 1 }), 3);
  assert.equal(M.exitCode({ red: 2, unknown: 1 }), 1);
  assert.equal(M.exitCode({ red: 0, unknown: 0 }), 0);
});

test("〔原始碼〕首頁必要素材跟 Android 共用同一份清單（bundle-home-assets.js），不另抄一份；註解都是 /* */", () => {
  const src = fs.readFileSync(CHECK, "utf8");
  assert.match(src, /xiangqi-android", "scripts", "bundle-home-assets\.js"/);
  assert.deepEqual(M.homeRequired(), HOME.map(x => "data/" + x));
  for (const l of src.split("\n")) if (/[;})]\s*\/\/(?!#)/.test(l) && !/https?:\/\//.test(l)) assert.fail("一行程式後面接 // 註解會吃掉後面的程式：" + l.slice(0, 80));
});
