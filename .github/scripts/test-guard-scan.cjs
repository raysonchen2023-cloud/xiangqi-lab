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

/* ===== W69 流程盤點中 16（2026-11-23；PR #68 審查後重寫）：中風險也擋、放行清單收緊、行內放行標記要登記、圖片用檔頭判斷 ===== */
const IM = require("./image-meta.cjs"), SC = require("./scan-changed.cjs");
const PEM = "-----BEGIN " + "RSA PRIVATE KEY-----\nMIIEpAIBAAKCAQEA" + "x".repeat(60) + "\n-----END " + "RSA PRIVATE KEY-----\n";
const MAIL = "player.one" + "@" + "gmail.com";   /* 假信箱：用拼的，這支檔自己不會被掃到 */
const scanA = (d, items, inline = []) => { const f = path.join(d, ".allow-test.json"); fs.writeFileSync(f, JSON.stringify({ items, inline }));
  return spawnSync(process.execPath, [SCAN, "HEAD~1", path.join(d, ".scan-tmp")], { cwd: d, encoding: "utf8", env: { ...process.env, OSS_SCAN: OSS, OSS_ALLOW: f } }) };
const RISKS = (() => { const O = require(OSS), r = {}; for (const x of O.RULES.concat(O.NAME_RULES)) r[x.id] = x.risk; return r })();
/* 測試用的 TIFF（EXIF 本體）：make＝相機廠牌、gps＝GPS 區、owner＝拍攝者、xp＝XPAuthor */
function tiffBuf({ make, gps, owner, xp } = {}) {
  const E = [];
  if (make) E.push([0x010f, 2, 6, 0]);
  if (owner) E.push([0x013b, 2, 4, 0]);
  if (xp) E.push([0x9c9d, 1, 4, 0]);
  if (gps) E.push([0x8825, 4, 1, -1]);
  const n = E.length, g = 8 + 2 + n * 12 + 4, b = Buffer.alloc(g + (gps ? 2 + 12 + 4 : 0));
  b.write("II", 0, "latin1"); b.writeUInt16LE(42, 2); b.writeUInt32LE(8, 4); b.writeUInt16LE(n, 8);
  E.forEach(([t, ty, c, v], i) => { const o = 10 + i * 12; b.writeUInt16LE(t, o); b.writeUInt16LE(ty, o + 2); b.writeUInt32LE(c, o + 4); b.writeUInt32LE(v < 0 ? g : v, o + 8) });
  if (gps) { b.writeUInt16LE(1, g); b.writeUInt16LE(2, g + 2); b.writeUInt16LE(5, g + 4); b.writeUInt32LE(3, g + 6) }
  return b;
}
const seg = (m, d) => { const h = Buffer.from([0xff, m, 0, 0]); h.writeUInt16BE(d.length + 2, 2); return Buffer.concat([h, d]) };
const jpegOf = (...s) => Buffer.concat([Buffer.from([0xff, 0xd8]), ...s, Buffer.from([0xff, 0xda, 0, 2, 0xff, 0xd9])]);   /* 要走到 SOS 才算讀得懂（第二輪審查③） */
const H = (x) => require("crypto").createHash("sha256").update(String(x), "utf8").digest("hex");
const jpeg = (t) => jpegOf(seg(0xe1, Buffer.concat([Buffer.from("Exif\0\0", "latin1"), t])));
const chunk = (type, d) => { const h = Buffer.alloc(8); h.writeUInt32BE(d.length, 0); h.write(type, 4, "latin1"); return Buffer.concat([h, d, Buffer.alloc(4)]) };
const png = (...c) => Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), ...c, chunk("IEND", Buffer.alloc(0))]);
const webp = (cc, d) => { const h = Buffer.alloc(8); h.write(cc, 0, "latin1"); h.writeUInt32LE(d.length, 4); const body = Buffer.concat([Buffer.from("WEBP", "latin1"), h, d, Buffer.alloc(d.length & 1)]);
  const r = Buffer.alloc(8); r.write("RIFF", 0, "latin1"); r.writeUInt32LE(body.length, 4); return Buffer.concat([r, body]) };
const ftyp = (brand) => { const b = Buffer.alloc(24); b.writeUInt32BE(24, 0); b.write("ftyp" + brand + "\0\0\0\0mif1" + brand, 4, "latin1"); return b };
const XMP_GPS = "<x:xmpmeta><rdf:Description exif:GPSLatitude=\"25,2.5N\"/></x:xmpmeta>";
const zlib = require("zlib");

test("圖片中繼資料（image-meta）：各格式、各種寫法的 GPS、相機、拍攝者、註解都認得出；HEIC／AVIF 回 null（讀不懂）", () => {
  const K = (b) => { const r = IM.imageMeta(b); return r && r.kinds };
  /* JPEG */
  assert.deepEqual(K(jpeg(tiffBuf({ gps: true }))), ["gps"]);
  assert.deepEqual(K(jpeg(tiffBuf({ make: true, owner: true }))), ["camera", "owner"]);
  assert.deepEqual(K(jpeg(tiffBuf({ xp: true }))), ["owner"], "EXIF 的 XPAuthor");
  assert.deepEqual(K(jpeg(tiffBuf({}))), [], "有 EXIF 但沒有個資欄位＝乾淨");
  assert.deepEqual(K(jpegOf(seg(0xe1, Buffer.from("http://ns.adobe.com/xap/1.0/\0" + XMP_GPS)))), ["gps"], "JPEG 的 XMP（審查⑨：原本改壞照樣過）");
  assert.deepEqual(K(jpegOf(seg(0xe1, Buffer.from("http://ns.adobe.com/xmp/extension/\0" + "x".repeat(40) + XMP_GPS)))), ["gps"], "延伸 XMP");
  assert.deepEqual(K(jpegOf(seg(0xed, Buffer.concat([Buffer.from("Photoshop 3.0\x008BIM", "latin1"), Buffer.from([0x04, 0x04, 0, 0, 0, 0, 0, 8, 0x1c, 0x02, 0x50, 0, 2, 0x41, 0x42])])))), ["owner"], "IPTC By-line");
  assert.deepEqual(K(jpegOf(seg(0xfe, Buffer.from("拍攝者 某某")))), ["comment"], "JPEG COM 註解");
  /* PNG */
  assert.deepEqual(K(png(chunk("eXIf", tiffBuf({ make: true, gps: true })))), ["camera", "gps"]);
  assert.deepEqual(K(png(chunk("tEXt", Buffer.from("Author\0某某", "utf8")))), ["owner"]);
  assert.deepEqual(K(png(chunk("zTXt", Buffer.concat([Buffer.from("Copyright\0\0", "latin1"), zlib.deflateSync(Buffer.from("某某"))])))), ["owner"], "壓縮的 zTXt");
  assert.deepEqual(K(png(chunk("iTXt", Buffer.from("XML:com.adobe.xmp\0\0\0\0\0" + XMP_GPS, "utf8")))), ["gps"]);
  { const h2 = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiffBuf({ gps: true })]).toString("hex");
    assert.deepEqual(K(png(chunk("zTXt", Buffer.concat([Buffer.from("Raw profile type exif\0\0", "latin1"), zlib.deflateSync(Buffer.from("\nexif\n" + (h2.length / 2) + "\n" + h2 + "\n"))])))), ["gps"], "壓縮的 zTXt 要解開才看得到的 GPS"); }
  assert.deepEqual(K(png(chunk("iTXt", Buffer.concat([Buffer.from("XML:com.adobe.xmp\0\x01\0\0\0", "latin1"), zlib.deflateSync(Buffer.from(XMP_GPS))])))), ["gps"], "壓縮的 iTXt XMP");
  const hex = Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiffBuf({ gps: true })]).toString("hex");
  assert.deepEqual(K(png(chunk("tEXt", Buffer.from("Raw profile type exif\0\nexif\n" + (hex.length / 2) + "\n" + hex + "\n", "latin1")))), ["gps"], "Raw profile type exif");
  assert.deepEqual(K(png(chunk("iTXt", Buffer.from("XML:com.adobe.xmp\0\0\0\0\0<x dc:creator=\"某某\"/>", "utf8")))), ["owner"], "XMP 的 dc:creator");
  assert.deepEqual(K(png(chunk("IDAT", Buffer.from("x")))), []);
  /* WebP、TIFF、GIF、BMP */
  assert.deepEqual(K(webp("EXIF", tiffBuf({ gps: true }))), ["gps"]);
  assert.deepEqual(K(webp("XMP ", Buffer.from("<x tiff:Model=\"iPhone\"/>"))), ["camera"]);
  assert.deepEqual(K(webp("VP8L", Buffer.from("xx"))), []);
  assert.deepEqual(K(tiffBuf({ gps: true })), ["gps"], "TIFF 本體");
  assert.deepEqual(K(Buffer.concat([Buffer.from("GIF89a", "latin1"), Buffer.from("……XMP DataXMP" + XMP_GPS)])), ["gps"], "GIF 的 XMP");
  assert.deepEqual(K(Buffer.from("BM" + "\0".repeat(20), "latin1")), []);
  /* 讀不懂、不是圖片 */
  assert.equal(IM.imageMeta(ftyp("heic")), null, "HEIC 讀不懂"); assert.equal(IM.sniff(ftyp("heic")), "heif");
  assert.equal(IM.imageMeta(ftyp("avif")), null, "AVIF 讀不懂"); assert.equal(IM.sniff(ftyp("avif")), "avif");
  assert.equal(IM.imageMeta(Buffer.from("不是圖片")), null); assert.equal(IM.sniff(Buffer.from("不是圖片")), null);
  assert.equal(IM.imageMeta(Buffer.from([0xff, 0xd8, 0xff, 0xe1, 0, 4, 0x45, 0x78])), null, "壞掉、截斷的 JPEG 不丟錯，回 null（讀不懂、會被擋；第二輪審查③）");
});

test("私密掃描補強（中 16）：改到的檔有中風險 → 擋；放行要寫完整路徑、個資用 sha256 指定是哪一筆", () => {
  const d = repo(({ put }) => { put("releases/筆記.txt", "聯絡 " + MAIL + "\n"); put("releases/metadata/docs/privacy.md", "聯絡 " + MAIL + "\n") });
  const bad = scan(d);
  assert.equal(bad.status, 1, bad.stdout + bad.stderr); assert.match(bad.stdout, /中風險沒被放行/);
  const A = (f, s = H(MAIL)) => ({ rule: "email", file: f, sha256: s, reason: "測試用的假信箱" });
  const ok = scanA(d, [A("releases/筆記.txt"), A("releases/metadata/docs/privacy.md")]);
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.equal(scanA(d, [A("releases/筆記.txt"), A("metadata/docs/privacy.md")]).status, 1, "只寫路徑結尾不算（第二輪審查⑤）");
  assert.equal(scanA(d, [A("releases/筆記.txt"), A("privacy.md")]).status, 1, "只寫檔名不算");
  assert.equal(scanA(d, [A("releases/筆記.txt"), A("releases/metadata/docs/privacy.md", H("別的" + MAIL))]).status, 1, "sha256 對不上那一筆不算");
});

test("私密掃描補強（中 16）：放行清單格式不對 → 結束代碼 2（整條規則全放行、沒理由、不認得的規則、高風險、match 太短、file 開頭是 /）", () => {
  const d = repo(({ put }) => put("releases/筆記.txt", "乾淨\n"));
  for (const [why, a] of [["整條規則全放行", { rule: "email", reason: "全部放行看看" }], ["沒理由", { rule: "email", file: "releases/筆記.txt", reason: "" }],
    ["不認得的規則", { rule: "nope", match: "xxxxxxxx", reason: "不認得的規則" }], ["高風險", { rule: "openai-key", match: "sk-proj-", reason: "想放行高風險" }],
    ["match 太短", { rule: "ntfy-topic", match: "ntfy.", reason: "五個字也收嗎" }], ["file 開頭是 /", { rule: "ntfy-topic", file: "/releases/筆記.txt", reason: "絕對路徑" }],
    ["理由只有 3 個字", { rule: "ntfy-topic", file: "releases/筆記.txt", reason: "測試用" }], ["個資沒用 sha256", { rule: "email", file: "releases/筆記.txt", reason: "限定檔案就好嗎" }],
    ["file 用萬用字元", { rule: "ntfy-topic", file: "releases/*.txt", reason: "萬用字元看看" }]]) {
    const r = scanA(d, [a]); assert.equal(r.status, 2, why + "：" + r.stdout); assert.match(r.stdout, /放行清單 .* 格式不對/, why);
  }
  assert.equal(scanA(d, [], [{ file: "a.js", sha256: "abc", reason: "雜湊不對" }]).status, 2, "inline 的 sha256 要 64 碼");
  assert.equal(scanA(d, [], [{ file: "a.js", sha256: "a".repeat(64), reason: "" }]).status, 2, "inline 要寫理由（第二輪審查⑥）");
  assert.equal(scanA(d, [{ rule: "ntfy-topic", match: "ntfy.s", reason: "六個字可以" }]).status, 0, "match 剛好 6 個字可以（下限是 6，不是更多）");
});

test("私密掃描補強（中 16）：行內放行標記沒登記 → 擋；登記了（檔名＋那一行的雜湊）→ 過；CRLF、標成 binary、開頭是「++ 」、U+2028 都繞不過", () => {
  const line = 'const k = "x"; /* ' + SC.TOK + ' 測試用的假資料 */';
  const cases = [
    ["一般", ({ put }) => put("source/b.js", line + "\n")],
    ["CRLF", ({ put }) => put("source/b.js", "a\r\n" + line + "\r\nz\r\n")],
    ["標成 binary", ({ put }) => { put(".gitattributes", "*.js binary\n"); put("source/b.js", line + "\n") }],
    ["開頭是 ++ ", ({ put }) => put("source/b.js", "++ " + line + "\n")],
    ["U+2028", ({ put }) => put("source/b.js", "a " + line + "\n")],
  ];
  for (const [why, ch] of cases) {
    const d = repo(ch), r = scan(d);
    assert.equal(r.status, 1, why + "：沒登記要擋：" + r.stdout); assert.match(r.stdout, /✘ source\/b\.js:\d+[^]*?沒登記/, why);
    const sha = SC.markerLines(fs.readFileSync(path.join(d, "source/b.js"), "utf8"))[0].sha256;
    const ok = scanA(d, [], [{ file: "source/b.js", sha256: sha, reason: "測試用的假資料" }]);
    assert.equal(ok.status, 0, why + "：登記了要過：" + ok.stdout); assert.match(ok.stdout, /△ source\/b\.js:\d+[^]*?已登記/, why);
    assert.equal(scanA(d, [], [{ file: "source/c.js", sha256: sha, reason: "登記到別的檔" }]).status, 1, why + "：登記到別的檔不算");
  }
  assert.deepEqual(SC.markerLines("a\r\n" + line + "\r\n").map((m) => [m.line, m.sha256]), [[2, SC.lineSha(line)]], "行尾 \\r 不影響雜湊");
  assert.deepEqual(SC.markerLines("a\u2028" + line + "\n").map((m) => [m.line, m.sha256]), [[1, SC.lineSha("a\u2028" + line)]], "照 oss-scan 只認 \\n 切行：U+2028 前後算同一行（那一整行都不掃）");
  assert.deepEqual(SC.unregistered([{ file: "a.js", marks: [{ line: 1, sha256: "x" }] }], [{ file: "a.js", sha256: "x" }]), []);
});

test("私密掃描補強（中 16）：圖片用檔頭判斷——GPS、相機型號擋；HEIC（不管叫 .heic 還是改成 .jpg）、讀不懂的擋；webp、沒有副檔名的圖也看；乾淨的過", () => {
  const S = (f, b) => scan(repo(({ put }) => put(f, b)));
  let r = S("source/art/照片.jpg", jpeg(tiffBuf({ gps: true, make: true }))); assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /照片\.jpg：有.*拍攝地點/);
  r = S("source/art/圖.webp", webp("EXIF", tiffBuf({ gps: true }))); assert.equal(r.status, 1, "webp 要看（審查⑨：原本拿掉 webp 照樣過）：" + r.stdout);
  r = S("source/art/改名.jpg", ftyp("heic")); assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /改名\.jpg：HEIF 格式讀不懂/);
  r = S("source/art/手機.heic", ftyp("heic")); assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /看了 1 張/);
  r = S("source/art/壞掉.png", Buffer.from("不是圖片")); assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /內容卻不是看得懂的圖/);
  r = S("source/art/壞掉.webp", Buffer.from("不是圖片")); assert.equal(r.status, 1, "副檔名是 webp、內容壞掉也擋：" + r.stdout);
  r = S("source/art/沒副檔名", jpeg(tiffBuf({ gps: true }))); assert.equal(r.status, 1, "檔頭是 JPEG 就要看：" + r.stdout);
  r = S("source/art/圖.png", png(chunk("IDAT", Buffer.from("x")))); assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /看了 1 張/);
});

test("私密掃描補強（中 16，既有漏洞）：原生程式碼的金鑰、開頭有 NUL 的檔、型別改變（符號連結換成一般檔）都要掃到", () => {
  for (const f of ["source/xiangqi-android/app/Main.kt", "source/xiangqi-ios/App/AppDelegate.swift", "source/x/Build.gradle", "source/x/key.properties", "source/x/Info.plist", "source/x/project.pbxproj", "source/x/a.jsx"]) {
    const r = scan(repo(({ put }) => put(f, PEM))); assert.equal(r.status, 1, f + " 的私鑰要擋：" + r.stdout);
  }
  const n = scan(repo(({ put }) => put("source/nul.js", "\0" + PEM))); assert.equal(n.status, 1, "開頭有 NUL 的 .js 照樣掃：" + n.stdout);
  /* 型別改變：基準版是符號連結，這次換成一般檔、內容有私鑰 */
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-guard-")); made.push(d);
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "core.autocrlf=false", ...a], { cwd: d });
  git("init", "-q"); fs.writeFileSync(path.join(d, "x.txt"), "x\n"); fs.symlinkSync("x.txt", path.join(d, "link.txt")); git("add", "-A"); git("commit", "-q", "-m", "base");
  fs.rmSync(path.join(d, "link.txt")); fs.writeFileSync(path.join(d, "link.txt"), PEM); git("add", "-A"); git("commit", "-q", "-m", "type change");
  assert.match(execFileSync("git", ["diff", "--name-status", "HEAD~1", "HEAD"], { cwd: d }).toString(), /^T\tlink\.txt/m, "前提：git 判成型別改變");
  const t = scan(d); assert.equal(t.status, 1, "型別改變的檔也要掃（--diff-filter 要含 T）：" + t.stdout);
});

test("oss-scan 信箱規則：AppIcon@2x.png 這類圖檔名不是信箱（審查⑨：原本拿掉排除照樣過）；真的信箱照抓", () => {
  const O = require(OSS), d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-mail-")); made.push(d);
  fs.writeFileSync(path.join(d, "Contents.json"), '{"filename":"AppIcon-20@2x.png"}\n{"x":"' + MAIL + '"}\n');
  const f = O.scan(d).findings.filter((x) => x.rule === "email");
  assert.deepEqual(f.map((x) => x.line), [2], "只抓第 2 行的真信箱");
});

test("oss-scan：檔頭不是圖片的檔（就算叫 .png、開頭塞 NUL）當文字掃；真的 PNG 也照樣掃到金鑰（第二輪審查①⑦、第三輪審查①）", () => {
  const O = require(OSS), d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-fakepng-")); made.push(d);
  const KEY = "AIza" + "S".repeat(35);
  fs.writeFileSync(path.join(d, "fake.png"), Buffer.concat([Buffer.from([0, 1, 2]), Buffer.from(KEY)]));
  fs.writeFileSync(path.join(d, "real.png"), Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.from(KEY)]));
  assert.deepEqual(O.scan(d).findings.map((f) => f.rule + " " + f.file).sort(), ["google-api-key fake.png", "google-api-key real.png"]);
});

test("〔資料〕倉庫的 .github/oss-allow.json：items、inline 都齊全、只放行中低風險、不把信箱電話本身寫進去", () => {
  const L = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "oss-allow.json"), "utf8"));
  assert.deepEqual(SC.checkAllow(L, RISKS), []);
  for (const a of L.items) { assert.doesNotMatch(String(a.match || ""), /@[a-z0-9-]+\.|09\d{8}/i, "match 不寫個資：" + a.match); assert.notEqual(RISKS[a.rule], "high") }
  assert.ok(L.inline.length >= 1 && L.inline.every((a) => /^[0-9a-f]{64}$/.test(a.sha256)));
  assert.equal(SC.judge({ findings: [{ risk: "medium", allowed: null }], images: [], unreg: [] }).ok, false, "沒放行的中風險要擋");
  assert.equal(SC.judge({ findings: [], images: [{ file: "a.heic", meta: null }], unreg: [] }).ok, false, "讀不懂的圖要擋（審查③）");
  assert.equal(SC.judge({ findings: [], images: [], unreg: [{ file: "a.js" }] }).ok, false, "沒登記的行內標記要擋（審查②）");
  assert.equal(SC.judge({ findings: [{ risk: "medium", allowed: "理由" }, { risk: "low", allowed: null }], images: [{ meta: { kinds: [] } }], unreg: [] }).ok, true);
});

test("私密掃描補強（中 16）：掃描工具沒跑完或沒寫出結果 → 不能當沒問題（結束代碼 1）", () => {
  const d = repo(({ put }) => put("releases/筆記.txt", "乾淨\n")), fake = path.join(d, ".fake-scan.js");
  fs.writeFileSync(fake, "module.exports={RULES:[],NAME_RULES:[]};if(require.main===module)process.exit(0)\n");
  const r = spawnSync(process.execPath, [SCAN, "HEAD~1", path.join(d, ".scan-tmp")], { cwd: d, encoding: "utf8", env: { ...process.env, OSS_SCAN: fake } });
  assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /沒有跑完或沒有寫出結果/);
});

test("私密掃描補強（中 16 第二輪①⑦）：不看副檔名——.bak .sql .go .rb .pub、沒副檔名、點開頭的檔、開頭塞 NUL、UTF-16 的私鑰都擋", () => {
  for (const f of ["releases/x.bak", "releases/x.sql", "source/x.go", "source/x.rb", "source/id.pub", "source/x.patch", "source/notes", "source/CHANGES", "source/.secrets"]) {
    const r = scan(repo(({ put }) => put(f, PEM))); assert.equal(r.status, 1, f + "：" + r.stdout);
  }
  for (const f of ["source/notes", "source/.secrets", "source/x.java"]) { const r = scan(repo(({ put }) => put(f, Buffer.concat([Buffer.from([0, 0, 0]), Buffer.from(PEM)])))); assert.equal(r.status, 1, f + " 開頭塞 NUL：" + r.stdout) }
  const u16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(PEM, "utf16le")]);
  assert.equal(scan(repo(({ put }) => put("source/x.txt", u16))).status, 1, "UTF-16 的私鑰");
  assert.equal(scan(repo(({ put }) => put("source/x.txt", Buffer.from(PEM, "utf16le")))).status, 1, "UTF-16 沒有 BOM 的私鑰");
});

test("私密掃描補強（中 16 第二輪②）：改到 .gitattributes 加 working-tree-encoding 或 filter= → 擋；一般設定照過", () => {
  for (const a of ["*.txt working-tree-encoding=UTF-16LE\n", "*.js filter=lfs diff=lfs\n", "sub/** filter = x\n"]) {
    const r = scan(repo(({ put }) => put(".gitattributes", a))); assert.equal(r.status, 1, a + "：" + r.stdout); assert.match(r.stdout, /working-tree-encoding／filter/);
  }
  assert.equal(scan(repo(({ put }) => put(".gitattributes", "*.png binary\n# filter=lfs 只是註解\n"))).status, 0, "binary、註解不擋");
  assert.deepEqual(SC.badAttrs("a\n*.x filter=y\n").map((x) => x.line), [2]);
});

test("私密掃描補強（中 16 第二輪③④）：JPEG 標記前多塞 FF 照樣讀得到 GPS；走不到 SOS 的擋；PNG Comment、GIF 註解裡的信箱交給規則抓", () => {
  const fill = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), seg(0xe1, Buffer.concat([Buffer.from("Exif\0\0", "latin1"), tiffBuf({ gps: true })])), Buffer.from([0xff, 0xda, 0, 2, 0xff, 0xd9])]);
  assert.deepEqual(IM.imageMeta(fill).kinds, ["gps"], "APP1 前面多一個填充 FF");
  assert.equal(IM.imageMeta(Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from("JFIF\0"))])), null, "沒有 SOS＝讀不懂");
  assert.equal(scan(repo(({ put }) => put("source/a.jpg", Buffer.concat([Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from("JFIF\0"))])))).status, 1, "讀不懂的 JPEG 擋");
  let r = scan(repo(({ put }) => put("source/a.png", png(chunk("tEXt", Buffer.from("Comment\0聯絡 " + MAIL, "utf8")))))); assert.equal(r.status, 1, "PNG Comment 的信箱：" + r.stdout); assert.match(r.stdout, /a\.png\.meta\.txt/);
  const gif = Buffer.concat([Buffer.from("GIF89a", "latin1"), Buffer.alloc(7), Buffer.from([0x21, 0xfe, MAIL.length + 3]), Buffer.from("by " + MAIL, "latin1"), Buffer.from([0, 0x3b])]);
  assert.ok(IM.imageMeta(gif).texts.some((x) => x.includes(MAIL)), "GIF 註解解得出來");
  r = scan(repo(({ put }) => put("source/a.gif", gif))); assert.equal(r.status, 1, "GIF 註解的信箱：" + r.stdout);
  assert.deepEqual(IM.imageMeta(jpegOf(seg(0xed, Buffer.concat([Buffer.from("Photoshop 3.0\x008BIM", "latin1"), Buffer.from([0x04, 0x04, 0, 0, 0, 0, 0, 5, 0x1c, 0x02, 0x74, 0, 1, 0x41])])))).kinds, ["owner"], "IPTC Copyright（2:116）");
  assert.deepEqual(IM.imageMeta(Buffer.concat([tiffBuf({ owner: true })])).kinds, ["owner"], "TIFF 的 Artist");
});

test("行內放行標記的判斷跟 oss-scan 一樣：冒號後面有空白也算（第二輪審查⑥）", () => {
  assert.equal(SC.markerLines("x // oss-scan" + ":  allow 理由\n").length, 1);
  const O = require(OSS), d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-mk-")); made.push(d);
  fs.writeFileSync(path.join(d, "a.js"), "k = 1 // oss-scan" + ": allow 測試\n" + PEM);
  assert.ok(O.scan(d).findings.some((f) => f.rule === "pem-private"), "標記只放過它自己那一行");
});

test("私密掃描補強（中 16 第二輪②）：掃的是 git 裡存的內容——工作區被換成乾淨的（像 filter、working-tree-encoding 那樣）也照擋", () => {
  const d = repo(({ put }) => put("source/k.txt", PEM));
  fs.writeFileSync(path.join(d, "source/k.txt"), "乾淨\n");   /* 工作區跟倉庫不同 */
  const r = scan(d); assert.equal(r.status, 1, "倉庫裡存的是私鑰：" + r.stdout);
});

/* ---- PR #68 第三輪審查（iMac Claude 2）：比 main 版退步的兩項與其他五項 ---- */
const SIG = { png: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), gif: Buffer.from("GIF89a"), bmp: Buffer.concat([Buffer.from("BM"), Buffer.alloc(30)]),
  jpg: Buffer.from([0xff, 0xd8, 0xff, 0xda]), webp: Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBP")]), tif: Buffer.from("II*\0") };
const KEY3 = "AIza" + "Q".repeat(35), MAIL3 = "someone.real" + "@" + "mail-host.com.tw";
test("第三輪①：檔頭像圖片（BM、PNG、GIF89a、FF D8 FF DA、WEBP、TIFF）後面接金鑰，不管叫什麼名字都擋；真圖片裡的長信箱也抓", () => {
  for (const [k, head] of Object.entries(SIG)) for (const name of ["a.js", "a." + k, "noext"]) {
    const r = scan(repo(({ put }) => put("source/" + name, Buffer.concat([head, Buffer.from(" " + KEY3 + " ")]))));
    assert.equal(r.status, 1, k + " " + name + "\n" + r.stdout); assert.match(r.stdout, /Google／Gemini API 金鑰/, k + " " + name);
  }
  const O = require(OSS), d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-img3-")); made.push(d);
  fs.writeFileSync(path.join(d, "a.png"), Buffer.concat([SIG.png, Buffer.from("\0" + MAIL3 + "\0 v" + "@" + "z.Xl\0")]));
  fs.writeFileSync(path.join(d, "b.js"), Buffer.concat([SIG.png, Buffer.from("\0 v" + "@" + "z.Xl\0")]));
  assert.deepEqual(O.scan(d).findings.map((f) => f.file + " " + f.shown).sort(), ["a.png s***@mail-host.com.tw", "b.js v***@z.Xl"],
    "真的圖片（副檔名＋檔頭）：中風險只看 12 字以上的連續字（壓縮資料湊出來的短字串不算）；不是圖片副檔名的照全文掃");
});
test("第三輪②：oss-scan:<控制字元>allow 這種標記也要登記（找標記用 oss-scan 換過控制字元的文字）；登記之後才過", () => {
  for (const c of ["\x01", "\x0b", "\x0c", "\x1f", "\0", " \t "]) {
    const line = KEY3 + " // oss-scan:" + c + "allow";
    const d = repo(({ put }) => put("source/m.js", "x\n" + line + "\n"));
    const r = scanA(d, []); assert.equal(r.status, 1, JSON.stringify(c) + "\n" + r.stdout); assert.match(r.stdout, /沒登記/);
    const O = require(OSS), h = SC.lineSha(O.textsOf(Buffer.from(line))[0]);
    if (c !== "\0") assert.equal(scanA(d, [], [{ file: "source/m.js", sha256: h, reason: "測試用假金鑰" }]).status, 0, "登記換過的那一行就過：" + JSON.stringify(c));
    else {   /* 有 NUL 的檔會多解幾種文字（textsOf），每一種裡的標記行都要登記 */
      const all = SC.markerLines(O.textsOf(Buffer.from("x\n" + line + "\n")), O.MARK);
      assert.ok(all.length >= 2, "NUL 拿掉後的那一種也算標記");
      assert.equal(scanA(d, [], [{ file: "source/m.js", sha256: h, reason: "測試用假金鑰" }]).status, 1, "只登記一種不夠");
      assert.equal(scanA(d, [], all.map((m) => ({ file: "source/m.js", sha256: m.sha256, reason: "測試用假金鑰" }))).status, 0);
    }
  }
});
test("第三輪③：UTF-16BE 奇數長度、沒有 BOM 以中文為主的 UTF-16LE／BE、UTF-32LE／BE 裡的金鑰與信箱都抓到", () => {
  const zh = "這是一段很長的中文說明，用來讓判斷式以為不是 UTF-16。".repeat(20);
  const enc = {
    "be-odd": (t) => Buffer.concat([Buffer.from(t, "utf16le").swap16(), Buffer.from([0x41])]),
    "le-zh": (t) => Buffer.from(zh + t + zh, "utf16le"),
    "be-zh": (t) => Buffer.from(zh + t + zh, "utf16le").swap16(),
    "le-odd-start": (t) => Buffer.concat([Buffer.from([0x41]), Buffer.from(zh + t, "utf16le")]),
    "u32le": (t) => { const b = Buffer.alloc(t.length * 4); [...t].forEach((ch, i) => b.writeUInt32LE(ch.codePointAt(0), i * 4)); return b },
    "u32be": (t) => { const b = Buffer.alloc(t.length * 4); [...t].forEach((ch, i) => b.writeUInt32BE(ch.codePointAt(0), i * 4)); return b },
  };
  const O = require(OSS);
  for (const [k, f] of Object.entries(enc)) {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-enc3-")); made.push(d);
    fs.writeFileSync(path.join(d, "k.txt"), f(" " + KEY3 + " ")); fs.writeFileSync(path.join(d, "m.txt"), f(" " + MAIL3 + " "));
    const rules = O.scan(d).findings.map((x) => x.file + " " + x.rule).sort();
    assert.deepEqual([...new Set(rules)], ["k.txt google-api-key", "m.txt email"], k);
  }
});
test("第三輪④：scan-changed 連 node_modules、.git 開頭以外的資料夾都掃（oss-scan --all）；平常全掃 source/ 才跳過 node_modules", () => {
  const r = scan(repo(({ put }) => put("source/node_modules/x/i.js", "k=" + KEY3 + "\n")));
  assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /node_modules\/x\/i\.js/);
  const O = require(OSS), d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-nm3-")); made.push(d);
  fs.mkdirSync(path.join(d, "node_modules")); fs.writeFileSync(path.join(d, "node_modules", "i.js"), KEY3);
  assert.equal(O.scan(d).findings.length, 0); assert.equal(O.scan(d, { all: true }).findings.length, 1);
});
test("第三輪⑤：圖裡解出來的文字不會蓋掉倉庫裡同名的 .meta.txt（蓋掉的話那個檔就沒掃到）", () => {
  const taken = new Set(["a.png", "a.png.meta.txt", "a.png.meta-1.txt"]);
  assert.equal(SC.freeName("a.png", taken), "a.png.meta-2.txt"); assert.equal(SC.freeName("b.png", taken), "b.png.meta.txt"); assert.equal(SC.freeName("b.png", taken), "b.png.meta-1.txt");
  const zlib = require("zlib"), crc = (b) => { let c, t = -1; for (const x of b) { c = (t ^ x) & 255; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t = (t >>> 8) ^ c } return (t ^ -1) >>> 0 };
  const chunk = (type, data) => { const len = Buffer.alloc(4), td = Buffer.concat([Buffer.from(type), data]), c = Buffer.alloc(4); len.writeUInt32BE(data.length); c.writeUInt32BE(crc(td)); return Buffer.concat([len, td, c]) };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(1, 0); ihdr.writeUInt32BE(1, 4); ihdr[8] = 8;
  const png = Buffer.concat([SIG.png, chunk("IHDR", ihdr), chunk("tEXt", Buffer.from("Comment\0hello")), chunk("IDAT", zlib.deflateSync(Buffer.from([0, 0]))), chunk("IEND", Buffer.alloc(0))]);
  const r = scan(repo(({ put }) => { put("source/p.png", png); put("source/p.png.meta.txt", "k=" + KEY3 + "\n") }));
  assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /Google／Gemini API 金鑰/, "倉庫裡同名的檔沒被圖裡解出來的文字蓋掉");
});
test("第三輪⑥：符號連結指向的路徑字串也掃（例如指到本機使用者資料夾）", () => {
  const d = repo(({ put }) => put("source/a.js", "改了\n"));
  fs.symlinkSync("/Us" + "ers/realperson/secret-dir/" + KEY3, path.join(d, "source", "lnk"));
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "add", "-A"], { cwd: d });
  execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@example.com", "commit", "-q", "-m", "lnk"], { cwd: d });
  const r = spawnSync(process.execPath, [SCAN, "HEAD~2", path.join(d, ".scan-tmp")], { cwd: d, encoding: "utf8", env: { ...process.env, OSS_SCAN: OSS } });
  assert.equal(r.status, 1, r.stdout); assert.match(r.stdout, /lnk/); assert.match(r.stdout, /Google／Gemini API 金鑰/);
});
test("第三輪⑦：放行清單的 match 要跟掃到的字一模一樣；只寫開頭的一段，後面換了別的密碼就不放行", () => {
  const O = require(OSS), d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-m3-")); made.push(d);
  const PA = "pa" + "ss:", US = "us" + "er:";
  fs.writeFileSync(path.join(d, "net.js"), "c={" + US + '"xqapp",' + PA + '"xqapp-other-secret"}\n');
  const pa = (allow) => O.scan(d, { allow }).findings.find((f) => f.rule === "password-assign").allowed;
  assert.equal(pa([{ rule: "password-assign", match: PA + '"xqapp', reason: "只寫開頭" }]), null);
  assert.equal(pa([{ rule: "password-assign", match: PA + '"xqapp-other-secret"', reason: "完整的" }]), "完整的");
});
