// 第 13 輪 F2：F-Droid 缺口的「可建置證據」工具
//   pikafish-verify.js：發布的 Pikafish 網頁版跟建置紀錄（雜湊、內嵌編譯器字串和日期、記憶體旗標）比對
//   release-verify.js：發布後的 index.html、sw.js 跟 release.json 的雜湊、版本號比對
// 用假的成品、改過一個位元的成品、雜湊不符的紀錄驗；不連網（--url 模式用本機 127.0.0.1 的伺服器）。
// 用法：node --test xiangqi-lab/tools/test-fdroid-evidence.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process"), crypto = require("crypto"), http = require("http");
const PV = require("./pikafish-verify.js"), RV = require("./release-verify.js");
const LAB = path.join(__dirname, ".."), ROOT = path.join(LAB, ".."), DB = path.join(ROOT, "xiangqi-db");
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex"), sha1_12 = b => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "xqfdroid-"));
const clean = d => fs.rmSync(d, { recursive: true, force: true });
const put = (d, files) => { for (const [f, c] of Object.entries(files)) { const p = path.join(d, f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, c) } return d };
const run = (script, args) => cp.spawnSync(process.execPath, [path.join(__dirname, script), ...args], { encoding: "utf8" });
const flip = (b, i) => { const c = Buffer.from(b); c[i] ^= 1; return c };

/* 手做一個最小的 wasm：匯入共用記憶體（初始 pages、上限 maxp），資料區段放「編譯器字串＋日期」 */
const leb = n => { const o = []; do { let x = n & 127; n = Math.floor(n / 128); if (n) x |= 128; o.push(x) } while (n); return o };
const vec = bytes => [...leb(bytes.length), ...bytes];
function wasm({ pages = 3072, maxp = 32768, text = "Clang 24.0.0git (https://github.com/llvm/llvm-project 83ee077) Oct 30 2026 tail" } = {}) {
  const imp = [1, ...vec([0x61]), ...vec([0x61]), 2, 3, ...leb(pages), ...leb(maxp)];
  const dat = [1, 0, 0x41, 0, 0x0b, ...vec([...Buffer.from(text, "latin1")])];
  return Buffer.from([0, 0x61, 0x73, 0x6d, 1, 0, 0, 0, 2, ...vec(imp), 11, ...vec(dat)]);
}
const JS = "var PikafishModule=(()=>{var _emscripten_x=1;return async function(){var f='pikafish.wasm';var _uci_command=1}})();";
const BUILD = "#!/usr/bin/env bash\n./emsdk install latest\nem++ -O3 -pthread -flto -sINITIAL_MEMORY=192MB -sMAXIMUM_MEMORY=2GB\n";
function fakeSite() {
  const f = { "engine/pikafish.wasm": wasm(), "engine/pikafish.js": JS, "pikafish-src/uci.cpp": "// uci\n", "pikafish-src/build-wsl.sh": BUILD, "LICENSE-Pikafish-GPL3.txt": "GPL" };
  const rec = {
    toolchain: { clangVersion: "Clang 24.0.0git (https://github.com/llvm/llvm-project 83ee077)", emscripten: "6.0.13" },
    originalBuild: { dateMacro: "Oct 30 2026" }, exportName: "PikafishModule", memory: { shared: true, initialBytes: 192 * 1048576, maximumBytes: 2048 * 1048576 },
    flags: ["-O3", "-pthread", "-flto", "-sINITIAL_MEMORY=192MB", "-sMAXIMUM_MEMORY=2GB"],
    modified: { "src/uci.cpp": { sha256: sha256(Buffer.from(f["pikafish-src/uci.cpp"])) } }, buildScript: { sha256: sha256(Buffer.from(BUILD)) },
    artifacts: { "pikafish.wasm": { sha256: sha256(f["engine/pikafish.wasm"]) }, "pikafish.js": { sha256: sha256(Buffer.from(JS)) } }
  };
  return { f, rec };
}
const failed = r => r.checks.filter(c => !c.ok && c.level === "fail").map(c => c.id);

test("Pikafish：假的成品跟紀錄一致 → 只剩「沒釘版本」的提醒，指令以代碼 0 結束；檔頭、內嵌字串讀得出來", () => {
  const d = tmp();
  try {
    const { f, rec } = fakeSite(); put(d, f); put(d, { "rec.json": JSON.stringify(rec) });
    const W = PV.inspectWasm(f["engine/pikafish.wasm"]);
    assert.equal(W.magic, true); assert.equal(W.version, 1); assert.equal(W.valid, true, W.validError);
    assert.deepEqual(W.memory, { import: "a.a", shared: true, initialBytes: 192 * 1048576, maximumBytes: 2048 * 1048576 });
    assert.equal(W.compiler, rec.toolchain.clangVersion); assert.equal(W.date, "Oct 30 2026");
    const R = PV.verify({ read: PV.dirReader(d), record: rec });
    assert.deepEqual(failed(R), []); assert.deepEqual(R.checks.filter(c => !c.ok).map(c => c.id), ["pin"], "公開腳本沒釘版本要照實列出");
    const r = run("pikafish-verify.js", ["--dir", d, "--record", path.join(d, "rec.json")]);
    assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /全部符合/); assert.match(r.stdout, /△ 公開的 build-wsl\.sh 裝的是 latest/);
  } finally { clean(d) }
});

test("Pikafish：wasm 改一個位元 → SHA-256 不符，指令以代碼 1 結束；改在日期字串上連內嵌日期也抓到", () => {
  const d = tmp();
  try {
    const { f, rec } = fakeSite(), w = f["engine/pikafish.wasm"], at = w.indexOf(Buffer.from("Oct 30"));
    put(d, { ...f, "engine/pikafish.wasm": flip(w, w.length - 3), "rec.json": JSON.stringify(rec) });
    assert.deepEqual(failed(PV.verify({ read: PV.dirReader(d), record: rec })), ["sha.wasm"]);
    const r = run("pikafish-verify.js", ["--dir", d, "--record", path.join(d, "rec.json")]);
    assert.equal(r.status, 1); assert.match(r.stdout, /✘ pikafish\.wasm SHA-256 .*不一致/); assert.match(r.stdout, /1 項不符/);
    put(d, { "engine/pikafish.wasm": flip(w, at) });   /* 'O' → 'N'：Nct 30 2026 */
    assert.deepEqual(failed(PV.verify({ read: PV.dirReader(d), record: rec })).sort(), ["sha.wasm", "wasm.date"]);
    put(d, { "engine/pikafish.wasm": w, "pikafish-src/uci.cpp": flip(Buffer.from(f["pikafish-src/uci.cpp"]), 0) });
    assert.deepEqual(failed(PV.verify({ read: PV.dirReader(d), record: rec })), ["sha.uci"], "改過的 uci.cpp 不是紀錄那份也要抓到");
  } finally { clean(d) }
});

test("Pikafish：紀錄的雜湊、編譯器、記憶體、旗標跟成品不符 → 各自列出；缺 GPL 授權檔、不是 wasm 也抓到", () => {
  const d = tmp();
  try {
    const { f, rec } = fakeSite(); put(d, f);
    const bad = JSON.parse(JSON.stringify(rec));
    bad.artifacts["pikafish.js"].sha256 = "0".repeat(64); bad.toolchain.clangVersion = "Clang 23.0.0 (x)"; bad.memory.maximumBytes = 4096 * 1048576; bad.flags.push("-sWASM_BIGINT");
    assert.deepEqual(failed(PV.verify({ read: PV.dirReader(d), record: bad })).sort(), ["flags", "sha.js", "wasm.compiler", "wasm.memory"]);
    fs.rmSync(path.join(d, "LICENSE-Pikafish-GPL3.txt")); fs.writeFileSync(path.join(d, "engine/pikafish.wasm"), "not wasm");
    const R = PV.verify({ read: PV.dirReader(d), record: rec }), F = failed(R);
    assert.ok(F.includes("files") && F.includes("wasm.header") && F.includes("sha.wasm"), F.join());
    assert.match(R.checks.find(c => c.id === "files").msg, /LICENSE-Pikafish-GPL3\.txt/);
  } finally { clean(d) }
});

test("Pikafish：--rebuilt 自己重編的檔逐位元相同 → 通過；差一個位元 → 不通過", () => {
  const d = tmp(), rb = tmp();
  try {
    const { f, rec } = fakeSite(); put(d, f); put(rb, { "pikafish.wasm": f["engine/pikafish.wasm"], "pikafish.js": JS });
    let R = PV.verify({ read: PV.dirReader(d), record: rec, rebuilt: rb });
    assert.deepEqual(failed(R), []); assert.match(R.checks.find(c => c.id === "rebuilt.wasm").msg, /逐位元相同/);
    put(rb, { "pikafish.wasm": flip(f["engine/pikafish.wasm"], 20) });
    R = PV.verify({ read: PV.dirReader(d), record: rec, rebuilt: rb });
    assert.deepEqual(failed(R), ["rebuilt.wasm"]); assert.match(R.checks.find(c => c.id === "rebuilt.wasm").msg, /不同（大小相同）/);
  } finally { clean(d); clean(rb) }
});

/* 假的發布：index.html、sw.js、release.json */
function fakeRelease(v = "20261113-0330") {
  const html = `<html><script>window.XQ_BUILD="${v}";</script></html>`, sw = `const VERSION="${v}";`;
  return { "index.html": html, "sw.js": sw, "release.json": JSON.stringify({ version: v, html: sha1_12(html), sw: sha1_12(sw), modules: {}, differsFromSource: [] }) };
}

test("成品：雜湊和版本號都一致 → 代碼 0；index.html 改一個位元 → 代碼 1、指出 html 不一致", () => {
  const d = tmp();
  try {
    const f = fakeRelease(); put(d, f);
    let r = run("release-verify.js", ["--dir", d]);
    assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /index\.html SHA-1 前 12 碼 [0-9a-f]{12}，跟 release\.json 一致/); assert.match(r.stdout, /三個一樣/);
    put(d, { "index.html": flip(Buffer.from(f["index.html"]), 3) });
    const C = RV.check(RV.fromDir(d));
    assert.equal(C.ok, false); assert.deepEqual(C.checks.filter(c => !c.ok).map(c => c.id), ["hash.html"]);
    r = run("release-verify.js", ["--dir", d]); assert.equal(r.status, 1); assert.match(r.stdout, /✘ index\.html .*不一致/);
  } finally { clean(d) }
});

test("成品：release.json 的 sw 雜湊不符、版本號不一樣、不是 JSON、缺檔 → 各回報正確（缺檔代碼 2）", () => {
  const d = tmp();
  try {
    const f = fakeRelease(), J = JSON.parse(f["release.json"]);
    put(d, { ...f, "release.json": JSON.stringify({ ...J, sw: "0123456789ab" }) });
    assert.deepEqual(RV.check(RV.fromDir(d)).checks.filter(c => !c.ok).map(c => c.id), ["hash.sw"]);
    put(d, { "release.json": JSON.stringify({ ...J, version: "20261113-0331" }) });
    assert.deepEqual(RV.check(RV.fromDir(d)).checks.filter(c => !c.ok).map(c => c.id), ["version"]);
    put(d, { "release.json": "{壞掉" }); assert.deepEqual(RV.check(RV.fromDir(d)).checks.filter(c => !c.ok).map(c => c.id), ["release.json", "version"]);
    fs.rmSync(path.join(d, "sw.js")); const r = run("release-verify.js", ["--dir", d]); assert.equal(r.status, 2); assert.match(r.stdout, /讀不到：sw\.js/);
    assert.equal(run("release-verify.js", []).status, 2, "沒給來源要印用法");
  } finally { clean(d) }
});

test("成品：--url 模式從網站下載三個檔（用本機 127.0.0.1 假網站，不連外網）", async () => {
  const f = fakeRelease();
  const srv = http.createServer((q, s) => { const n = decodeURIComponent(new URL(q.url, "http://x").pathname.replace(/^\/site\//, "")); if (f[n]) { s.end(f[n]) } else { s.statusCode = 404; s.end() } });
  await new Promise(r => srv.listen(0, "127.0.0.1", r));
  try {
    const base = `http://127.0.0.1:${srv.address().port}/site`;
    const C = RV.check(await RV.fromUrl(base)); assert.equal(C.ok, true, JSON.stringify(C.checks));
    f["sw.js"] += " ";
    const C2 = RV.check(await RV.fromUrl(base + "/")); assert.deepEqual(C2.checks.filter(c => !c.ok).map(c => c.id), ["hash.sw"]);
    await assert.rejects(RV.fromUrl("file:///etc/passwd"), /http/);
  } finally { srv.close() }
});

test("真的公開倉庫（本機 git origin/main，不連網）：成品跟 release.json 一致、Pikafish 跟建置紀錄一致", { skip: !fs.existsSync(path.join(LAB, "site", ".git")) && "沒有 site/.git" }, () => {
  const r = run("release-verify.js", ["--git", path.join(LAB, "site"), "--ref", "origin/main"]);
  assert.equal(r.status, 0, r.stdout);
  const rec = path.join(ROOT, "xiangqi-wasm", "build-record.json");
  if (!fs.existsSync(rec)) return;
  const p = run("pikafish-verify.js", []); assert.equal(p.status, 0, p.stdout); assert.match(p.stdout, /Oct 30 2026（跟紀錄一致）/);
  const R = JSON.parse(fs.readFileSync(rec, "utf8")); assert.ok(R.rebuilds.length >= 1 && /逐位元相同/.test(R.rebuilds[0].result), "紀錄裡有實際重編的結果");
});

test("〔原始碼〕foss.md 兩份逐字相同、LF；缺口分「做不到／可以補但還沒做／這輪補了」三類並附重跑指令", () => {
  const a = fs.readFileSync(path.join(DB, "art/docs/foss.md"), "utf8");
  assert.equal(fs.readFileSync(path.join(LAB, "site/data/docs/foss.md"), "utf8"), a); assert.ok(!a.includes("\r"));
  for (const h of ["做不到", "可以補但還沒做", "這輪補了"]) assert.match(a, new RegExp("### .*" + h));
  assert.match(a, /pikafish-verify\.js/); assert.match(a, /release-verify\.js/); assert.match(a, /build-pinned\.sh/);
});
