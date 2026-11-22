// guard-release-files.cjs 與 scan-changed.cjs 的自我測試（W36 第二輪審查）：在暫存 git 倉庫放各種改動，確認擋得住、不誤擋。
// 用法：node --test .github/scripts/test-guard-scan.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), os = require("os"), path = require("path");
const GUARD = path.join(__dirname, "guard-release-files.cjs"), SCAN = path.join(__dirname, "scan-changed.cjs");
const OSS = path.join(__dirname, "..", "..", "source", "xiangqi-lab", "tools", "oss-scan.js");
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }); });

function repo(change) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-guard-")); made.push(d);
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "core.autocrlf=false", ...a], { cwd: d });
  const put = (f, s) => { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.writeFileSync(path.join(d, f), s); };
  git("init", "-q");
  for (const f of ["index.html", "sw.js", "release.json", "source/a.js", "data/x.json"]) put(f, "base\n");
  git("add", "-A"); git("commit", "-q", "-m", "base");
  change({ put, rm: f => fs.rmSync(path.join(d, f)), mv: (a, b) => { fs.mkdirSync(path.dirname(path.join(d, b)), { recursive: true }); git("mv", a, b); } });
  git("add", "-A"); git("commit", "-q", "-m", "change");
  return d;
}
const guard = d => spawnSync(process.execPath, [GUARD, "HEAD~1"], { cwd: d, encoding: "utf8" });
const scan = d => spawnSync(process.execPath, [SCAN, "HEAD~1", path.join(d, ".scan-tmp")], { cwd: d, encoding: "utf8", env: { ...process.env, OSS_SCAN: OSS } });

test("守門：只改 source/、.github/、releases/（含中文檔名）→ 通過", () => {
  const r = guard(repo(({ put }) => { put("source/a.js", "改了\n"); put(".github/x.yml", "a: 1\n"); put("releases/說明.md", "紀錄\n"); }));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /✔ 沒有動到會直接上線的網站檔/);
});
test("守門：改 index.html、sw.js、release.json、data/ → 擋下並逐一列出", () => {
  const r = guard(repo(({ put }) => { put("source/a.js", "改了\n"); put("index.html", "偷改\n"); put("sw.js", "偷改\n"); put("release.json", "{}\n"); put("data/x.json", "{}\n"); }));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  for (const f of ["index.html", "sw.js", "release.json", "data/x.json"]) assert.match(r.stdout, new RegExp("\\n  " + f.replace(".", "\\.")));
  assert.doesNotMatch(r.stdout, /\n  source\/a\.js/);
});
test("守門：刪除網站檔、把原始碼改名成網站檔、根目錄新增中文檔 → 都擋下", () => {
  for (const [name, ch, hit] of [
    ["刪除", ({ rm }) => rm("sw.js"), "sw.js"],
    ["改名搬到網站資料夾", ({ mv }) => mv("source/a.js", "engine/a.js"), "engine/a.js"],
    ["中文檔", ({ put }) => put("說明.md", "x\n"), "說明.md"],
  ]) { const r = guard(repo(ch)); assert.equal(r.status, 1, name + "：" + r.stdout); assert.match(r.stdout, new RegExp("\\n  " + hit.replace(".", "\\."))); }
});
test("守門：根目錄的 AGENTS.md（給 Codex 的審查規則，W70）→ 通過；只准這一個固定檔名，換大小寫、副檔名、放到網站資料夾都擋", () => {
  const ok = guard(repo(({ put }) => { put("AGENTS.md", "# 規則\n"); put("source/a.js", "改了\n"); }));
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /✔ 沒有動到會直接上線的網站檔/);
  for (const name of ["agents.md", "AGENTS.md.bak", "AGENTS.mdx", "data/AGENTS.md", "engine/AGENTS.md", "x-AGENTS.md"]) {
    const r = guard(repo(({ put }) => put(name, "x\n")));
    assert.equal(r.status, 1, name + "：" + r.stdout);
    assert.match(r.stdout, new RegExp("\\n  " + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "(\\n|$)"), name);
  }
});
test("私密掃描補強：PR 改到的 source/ 以外的檔有私鑰 → 擋下；乾淨 → 通過；沒改檔 → 略過", () => {
  const key = "-----BEGIN " + "RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA" + "x".repeat(60) + "\n-----END " + "RSA PRIVATE KEY-----\n";
  const bad = scan(repo(({ put }) => put("releases/筆記.txt", key)));
  assert.equal(bad.status, 1, bad.stdout + bad.stderr);
  const ok = scan(repo(({ put }) => put("releases/筆記.txt", "沒有機密\n")));
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  const none = scan(repo(({ rm }) => rm("data/x.json")));
  assert.equal(none.status, 0, none.stdout + none.stderr);
  assert.match(none.stdout, /沒有新增或修改的檔，略過/);
});

/* ===== W69 流程盤點中 16（2026-11-23）：中風險也擋、放行清單、新加的 oss-scan:allow 列出、圖片中繼資料 ===== */
const IM = require("./image-meta.cjs"), SC = require("./scan-changed.cjs");
const scanA = (d, allow) => { const f = path.join(d, ".allow-test.json"); fs.writeFileSync(f, JSON.stringify({ items: allow }));
  return spawnSync(process.execPath, [SCAN, "HEAD~1", path.join(d, ".scan-tmp")], { cwd: d, encoding: "utf8", env: { ...process.env, OSS_SCAN: OSS, OSS_ALLOW: f } }) };
/* 測試用的 TIFF（EXIF 本體）：make＝有相機廠牌、gps＝有 GPS 區、owner＝有拍攝者 */
function tiffBuf({ make, gps, owner } = {}) {
  const E = [];
  if (make) E.push([0x010f, 2, 6, 0]);
  if (owner) E.push([0x013b, 2, 4, 0]);
  if (gps) E.push([0x8825, 4, 1, -1]);
  const n = E.length, g = 8 + 2 + n * 12 + 4, b = Buffer.alloc(g + (gps ? 2 + 12 + 4 : 0));
  b.write("II", 0, "latin1"); b.writeUInt16LE(42, 2); b.writeUInt32LE(8, 4); b.writeUInt16LE(n, 8);
  E.forEach(([t, ty, c, v], i) => { const o = 10 + i * 12; b.writeUInt16LE(t, o); b.writeUInt16LE(ty, o + 2); b.writeUInt32LE(c, o + 4); b.writeUInt32LE(v < 0 ? g : v, o + 8) });
  if (gps) { b.writeUInt16LE(1, g); b.writeUInt16LE(2, g + 2); b.writeUInt16LE(5, g + 4); b.writeUInt32LE(3, g + 6) }
  return b;
}
const jpeg = (t) => { const s = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), t]), h = Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 0]); h.writeUInt16BE(s.length + 2, 4); return Buffer.concat([h, s, Buffer.from([0xff, 0xd9])]) };
const chunk = (type, d) => { const h = Buffer.alloc(8); h.writeUInt32BE(d.length, 0); h.write(type, 4, "latin1"); return Buffer.concat([h, d, Buffer.alloc(4)]) };
const png = (...c) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...c, chunk("IEND", Buffer.alloc(0))]);
const webp = (cc, d) => { const h = Buffer.alloc(8); h.write(cc, 0, "latin1"); h.writeUInt32LE(d.length, 4); const body = Buffer.concat([Buffer.from("WEBP", "latin1"), h, d, Buffer.alloc(d.length & 1)]);
  const r = Buffer.alloc(8); r.write("RIFF", 0, "latin1"); r.writeUInt32LE(body.length, 4); return Buffer.concat([r, body]) };

test("圖片中繼資料（image-meta）：JPEG／PNG／WebP 的 GPS、相機型號、拍攝者都認得出；乾淨的圖、看不懂的格式分開回報", () => {
  assert.deepEqual(IM.imageMeta(jpeg(tiffBuf({ gps: true }))).kinds, ["gps"]);
  assert.deepEqual(IM.imageMeta(jpeg(tiffBuf({ make: true, owner: true }))).kinds, ["camera", "owner"]);
  assert.deepEqual(IM.imageMeta(jpeg(tiffBuf({}))).kinds, [], "有 EXIF 但沒有個資欄位＝乾淨");
  assert.deepEqual(IM.imageMeta(png(chunk("eXIf", tiffBuf({ make: true, gps: true })))).kinds, ["camera", "gps"]);
  assert.deepEqual(IM.imageMeta(png(chunk("tEXt", Buffer.from("Author\0某某", "utf8")))).kinds, ["owner"]);
  assert.deepEqual(IM.imageMeta(png(chunk("iTXt", Buffer.from("XML:com.adobe.xmp\0\0\0\0\0<x exif:GPSLatitude=\"25,2.5N\"/>", "utf8")))).kinds, ["gps"]);
  assert.deepEqual(IM.imageMeta(png(chunk("IDAT", Buffer.from("x")))).kinds, []);
  assert.deepEqual(IM.imageMeta(webp("EXIF", tiffBuf({ gps: true }))).kinds, ["gps"]);
  assert.deepEqual(IM.imageMeta(webp("XMP ", Buffer.from("<x tiff:Model=\"iPhone\"/>"))).kinds, ["camera"]);
  assert.deepEqual(IM.imageMeta(webp("VP8L", Buffer.from("xx"))).kinds, []);
  assert.equal(IM.imageMeta(Buffer.from("GIF89a……")), null, "看不懂的格式回 null，不當作乾淨");
  assert.deepEqual(IM.imageMeta(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 4, 0x45, 0x78])).kinds, [], "壞掉的 EXIF 不丟錯");
});

test("私密掃描補強（中 16）：改到的檔有中風險 → 擋；放行清單限定檔案就過；放行清單格式不對 → 結束代碼 2", () => {
  const d = repo(({ put }) => put("releases/筆記.txt", "聯絡 player.one@gmail.com\n"));
  const bad = scan(d);
  assert.equal(bad.status, 1, bad.stdout + bad.stderr); assert.match(bad.stdout, /中風險沒被放行/);
  const ok = scanA(d, [{ rule: "email", file: "releases/筆記.txt", reason: "測試用的假信箱" }]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr); assert.match(ok.stdout, /白名單略過 1 筆/);
  assert.equal(scanA(d, [{ rule: "email", file: "releases/別的.txt", reason: "測試用的假信箱" }]).status, 1, "放行清單限定的是別的檔：照擋");
  for (const [why, a] of [["整條規則全放行", { rule: "email", reason: "全部放行看看" }], ["沒理由", { rule: "email", file: "releases/筆記.txt", reason: "" }], ["不認得的規則", { rule: "nope", match: "x", reason: "不認得的規則" }]]) {
    const r = scanA(d, [a]); assert.equal(r.status, 2, why + "：" + r.stdout); assert.match(r.stdout, /放行清單 .* 格式不對/, why);
  }
});

test("私密掃描補強（中 16）：這個 PR 新加的 oss-scan:allow 一條一條列出來；沒寫理由的擋", () => {
  const ok = scan(repo(({ put }) => put("source/b.js", 'const k = "x"; /* oss-scan:allow 測試用的假資料 */\n')));
  assert.equal(ok.status, 0, ok.stdout); assert.match(ok.stdout, /新加的 oss-scan:allow.*1 條/); assert.match(ok.stdout, /△ source\/b\.js:1/);
  const bad = scan(repo(({ put }) => put("source/b.js", 'const k = "x"; /* oss-scan:allow */\n')));
  assert.equal(bad.status, 1, bad.stdout); assert.match(bad.stdout, /✘ source\/b\.js:1.*沒寫理由/);
  assert.deepEqual(SC.addedAllows("+++ b/a.js\n@@ -0,0 +5,2 @@\n+x\n+y // oss-scan:allow 公開的帳號\n").map((a) => [a.file, a.line, a.reason]), [["a.js", 6, "公開的帳號"]]);
  assert.deepEqual(SC.addedAllows("+++ b/a.js\n@@ -1 +1 @@\n-z // oss-scan:allow 舊的\n+z\n"), [], "刪掉的行不算");
});

test("私密掃描補強（中 16）：新增的圖有 GPS 或相機型號 → 擋；乾淨的圖 → 通過", () => {
  const bad = scan(repo(({ put }) => put("source/art/照片.jpg", jpeg(tiffBuf({ gps: true, make: true })))));
  assert.equal(bad.status, 1, bad.stdout); assert.match(bad.stdout, /照片\.jpg：有.*拍攝地點/);
  const ok = scan(repo(({ put }) => put("source/art/圖.png", png(chunk("IDAT", Buffer.from("x"))))));
  assert.equal(ok.status, 0, ok.stdout); assert.match(ok.stdout, /看了 1 張/);
});

test("〔資料〕倉庫的 .github/oss-allow.json：每筆都齊全、不准整條規則放行；不把信箱、電話本身寫進去", () => {
  const items = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "oss-allow.json"), "utf8")).items, O = require(OSS);
  assert.deepEqual(SC.checkAllow(items, O.RULES.map((r) => r.id).concat(O.NAME_RULES.map((r) => r.id))), []);
  for (const a of items) { assert.doesNotMatch(String(a.match || ""), /@|09\d{8}/, "match 不寫個資：" + a.match); assert.ok(a.file || a.match) }
  assert.equal(SC.judge({ findings: [{ risk: "medium", allowed: null }], images: [], allows: [] }).ok, false, "沒放行的中風險要擋");
  assert.equal(SC.judge({ findings: [{ risk: "medium", allowed: "理由" }, { risk: "low", allowed: null }], images: [], allows: [] }).ok, true, "放行的中風險、低風險不擋");
});

test("私密掃描補強（中 16）：掃描工具沒跑完或沒寫出結果 → 不能當沒問題（結束代碼 1）", () => {
  const d = repo(({ put }) => put("releases/筆記.txt", "乾淨\n")), fake = path.join(d, ".fake-scan.js");
  fs.writeFileSync(fake, "module.exports={RULES:[],NAME_RULES:[]};if(require.main===module)process.exit(0)\n");
  const r = spawnSync(process.execPath, [SCAN, "HEAD~1", path.join(d, ".scan-tmp")], { cwd: d, encoding: "utf8", env: { ...process.env, OSS_SCAN: fake } });
  assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /沒有跑完或沒有寫出結果/);
});
