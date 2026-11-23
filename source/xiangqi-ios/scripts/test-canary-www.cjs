// iOS P0-IMG 金絲雀 canary-www.js 與 check-www.js 的自我測試（AGENTS.md「P0 出口驗證要難作假」，2026-11-23）
//   在暫存資料夾做一個小的假 www（index.html、首頁素材、背景音樂、引擎、大檔、清單）和一份假的 CDN 清單，用真的 check-www.js 檢查：
//   乾淨的要全過；8 種壞樣本都要被抓到；再把 check-www.js 的判斷一條一條改壞（放在副本），金絲雀要回 4（檢查失靈）。
// 用法：node --test source/xiangqi-ios/scripts/test-canary-www.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), cp = require("child_process");
const HERE = __dirname, CHECK = path.join(HERE, "check-www.js"), CANARY = path.join(HERE, "canary-www.js");
const { toolSha, treeSha } = require("./canary-www.js");
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });
const tmp = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); made.push(d); return d };
const sha1 = (b) => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const env = (o) => { const e = { ...process.env, ...o }; for (const k of Object.keys(o)) if (o[k] == null) delete e[k]; return e };

/* 假 www：每個檔都進清單（小檔記 sha1、大檔不記），結構跟 copy-www.js 產生的一樣；data/ 的檔另外寫成假的 CDN 清單（跟包裡一樣＝乾淨） */
function fakeWww() {
  const D = tmp("xq-fakewww-"), files = {};
  const put = (rel, body, withSha = true) => { const p = path.join(D, ...rel.split("/")); fs.mkdirSync(path.dirname(p), { recursive: true }); const b = Buffer.isBuffer(body) ? body : Buffer.from(body); fs.writeFileSync(p, b); files[rel] = [b.length, withSha ? sha1(b) : null] };
  put("index.html", '<!doctype html><meta charset="utf-8"><script src="capacitor.js"></script><script src="native-bridge.js"></script><script src="core.js"></script><body>象棋千秋</body>\n');
  for (const f of ["capacitor.js", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js", "zh.js"]) put(f, "/* " + f + " */\nvar x = 1;\n");
  for (const n of ["han", "qin", "tang"]) put("data/home/" + n + ".webp", Buffer.alloc(200 + n.length, n.length));
  put("data/preload.json", JSON.stringify({ items: [["data/home/han.webp", 203], ["data/home/qin.webp", 203], ["data/home/tang.webp", 204]], big: [] }));
  put("data/big-books.json", "[]");
  put("data/bgm/index.json", JSON.stringify({ han: ["zheng_1.mp3", "zheng_2.mp3"] }));
  put("data/bgm/han/zheng_1.mp3", Buffer.alloc(400, 1)); put("data/bgm/han/zheng_2.mp3", Buffer.alloc(420, 2));
  put("engine/pikafish.js", "var Pikafish = 1;\n"); put("engine/pikafish.wasm", Buffer.alloc(500, 3)); put("engine/pikafish.nnue", Buffer.alloc(6000, 4), false);
  put("data/gmgames.json", Buffer.alloc(5000, 5), false);   /* 不是引擎檔裡最大的，沒記 sha1（照 copy-www.js：大檔不算 sha1） */
  const L = path.join(tmp("xq-fakelist-"), ".www-files.json");
  fs.writeFileSync(L, JSON.stringify({ commit: "test", siteVersion: "test", files }, null, 1));
  const man = {};
  for (const [rel] of Object.entries(files)) if (rel.startsWith("data/")) man[rel] = [files[rel][0], sha1(fs.readFileSync(path.join(D, ...rel.split("/"))))];
  const M = path.join(tmp("xq-fakecdn-"), "cdn-manifest.json");
  fs.writeFileSync(M, JSON.stringify({ at: "test", n: Object.keys(man).length, files: man }));
  return { D, L, M };
}
const runCheck = (dir, list, ...more) => cp.spawnSync(process.execPath, [CHECK, "--dir", dir, "--list", list, ...more], { encoding: "utf8" });
const runCanary = (canary, args, o = {}) => cp.spawnSync(process.execPath, [canary, ...args], { encoding: "utf8", env: env(o) });

test("check-www.js：乾淨的假 www 全過；同大小換內容抓得到；--cdn 時 App 會要的檔跟 CDN 現行版不同會擋；讀不到 CDN 清單回 3（缺驗）", () => {
  const { D, L, M } = fakeWww();
  let r = runCheck(D, L, "--cdn-manifest", M); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /跟 CDN 現行版比了 \d+ 個檔/);
  r = runCheck(D, L, "--cdn-manifest", path.join(D, "沒有.json")); assert.equal(r.status, 3, r.stdout + r.stderr); assert.match(r.stderr, /讀不到 CDN 清單/);
  const man = JSON.parse(fs.readFileSync(M, "utf8")); man.files["data/home/qin.webp"][1] = "000000000000"; fs.writeFileSync(M, JSON.stringify(man));
  r = runCheck(D, L, "--cdn-manifest", M); assert.equal(r.status, 1); assert.match(r.stderr, /跟 CDN 現行版不同 data\/home\/qin\.webp/);
  const p = path.join(D, "zh.js"), b = fs.readFileSync(p); b[3] ^= 0xff; fs.writeFileSync(p, b);
  r = runCheck(D, L); assert.equal(r.status, 1); assert.match(r.stderr, /內容跟清單不同 zh\.js/);
});

test("canary-www.js：8 種壞樣本都被抓到；收據記下每一種、候選數、工具雜湊、整個 www 的樹雜湊、IPA 雜湊；不會改到原本那份", () => {
  const { D, L, M } = fakeWww();
  const before = treeSha(D), out = path.join(tmp("xq-canaryout-"), "r.json"), ipa = path.join(tmp("xq-ipa-"), "App.ipa"); fs.writeFileSync(ipa, "假的 IPA");
  const r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest", M, "--pkg", ipa, "--out", out], { XQ_CANARY_PICK: "first" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.pass, true); assert.equal(R.platform, "ios");
  assert.equal(R.full, false, "固定挑檔（XQ_CANARY_PICK）的收據不能送審");
  assert.deepEqual(R.results.map((x) => x.kind), ["home", "bgm", "engine", "core", "big", "swap", "bridge", "cdnstale"]);
  for (const x of R.results) { assert.equal(x.caught, true, x.kind); assert.equal(x.exit, 1, x.kind) }
  const by = Object.fromEntries(R.results.map((x) => [x.kind, x]));
  assert.equal(by.home.candidates, 3); assert.equal(by.engine.candidates, 3); assert.equal(by.core.candidates, 7);
  assert.equal(by.big.file, "data/gmgames.json", "前幾大的檔，不挑引擎檔");
  assert.equal(R.sample.treeSha256, before); assert.equal(R.pkg.sha256, sha256(fs.readFileSync(ipa)));
  assert.equal(R.toolPins["source/xiangqi-ios/scripts/check-www.js"], toolSha(CHECK));
  assert.equal(treeSha(D), before, "原本那份一個位元組都沒變");
});

test("隨機挑檔：沒設 XQ_CANARY_PICK 時，跑幾次會挑到不同的檔；收據 full＝true 要加 --cdn、不能 --only", () => {
  const { D, L, M } = fakeWww(), seen = new Set();
  for (let i = 0; i < 12 && seen.size < 2; i++) {
    const out = path.join(tmp("xq-canaryout-"), "r.json");
    const r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest", M, "--only", "home", "--out", out], { XQ_CANARY_PICK: null });
    assert.equal(r.status, 0, r.stdout + r.stderr); seen.add(JSON.parse(fs.readFileSync(out, "utf8")).results[0].file);
  }
  assert.ok(seen.size >= 2, "12 次都挑到同一個首頁檔：" + [...seen]);
  const out = path.join(tmp("xq-canaryout-"), "r.json");
  let r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest", M, "--out", out], { XQ_CANARY_PICK: null });
  assert.equal(r.status, 0, r.stdout + r.stderr); assert.equal(JSON.parse(fs.readFileSync(out, "utf8")).full, true);
  r = runCanary(CANARY, ["--dir", D, "--list", L, "--out", out], { XQ_CANARY_PICK: null });
  assert.equal(r.status, 0); const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.full, false, "沒加 --cdn 不能送審"); assert.ok(!R.kinds.includes("cdnstale"));
});

/* 把 check-www.js 的某一條判斷改壞（放在副本旁邊，用同一個金絲雀流程），金絲雀要判出「檢查失靈」 */
function blindCanary(from, to) {
  const d = tmp("xq-blind-"), s = fs.readFileSync(CHECK, "utf8");
  assert.ok(s.includes(from), "測試要改的那一行還在：" + from.slice(0, 40));
  fs.writeFileSync(path.join(d, "check-www.js"), s.replace(from, to)); fs.copyFileSync(CANARY, path.join(d, "canary-www.js"));
  fs.copyFileSync(path.join(HERE, ".www-files.json"), path.join(d, ".www-files.json"));
  return path.join(d, "canary-www.js");
}
test("check-www.js 的判斷一條一條改壞（含只查第一個檔、W42 不比）：金絲雀回 4，指出是哪一種沒抓到", () => {
  const cases = [
    ["home", "first", 'if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]);', "if (false) {}"],
    ["home", "last", "for (const it of [...(P.items || []), ...(P.big || [])]) {", "for (const it of [...(P.items || []).slice(0, 1), ...(P.big || [])]) {"],   /* 只查第一個首頁檔：固定挑第一個的金絲雀抓不到，挑別的就抓到 */
    ["bgm", "first", 'if (!exists(r)) bad.push("背景音樂清單有但沒有檔：" + r);', "if (false) {}"],
    ["engine", "last", 'if (!exists(f)) bad.push("缺引擎 " + f);', "if (false) {}"],
    ["core", "first", 'if (!exists(f)) bad.push("缺 " + f);', "if (false) {}"],
    ["big", "first", 'else if (size(rel) !== sz) bad.push("大小不對 " + rel);', "else if (false) {}"],
    ["swap", "first", '!== h) bad.push("內容跟清單不同 " + rel);', '!== h && false) bad.push("內容跟清單不同 " + rel);'],
    ["bridge", "first", "else if (!(iCap < iBr && (iCore < 0 || iBr < iCore))) bad.push(", "else if (false) bad.push("],
    ["cdnstale", "first", "    if (need.has(rel)) bad.push(", "    if (false) bad.push("],
  ];
  for (const [kind, pick, from, to] of cases) {
    const { D, L, M } = fakeWww(), C = blindCanary(from, to);
    const r = runCanary(C, ["--dir", D, "--list", L, "--cdn-manifest", M, "--only", kind], { XQ_CANARY_PICK: pick });
    assert.equal(r.status, 4, kind + "／" + pick + "：" + r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp("✘ " + kind + "："), kind + " 要被列成沒抓到");
    assert.match(r.stdout, /檢查本身失靈/);
  }
});

test("工具雜湊：CRLF 換成 LF 後一樣；多一個單獨的 CR 就不同（單獨 CR 在 JS 裡算換行）", () => {
  const d = tmp("xq-toolsha-"), a = path.join(d, "a.js"), b = path.join(d, "b.js"), c = path.join(d, "c.js");
  fs.writeFileSync(a, "function f(r){\n  return r ? 1 : 0\n}\n"); fs.writeFileSync(b, "function f(r){\r\n  return r ? 1 : 0\r\n}\r\n"); fs.writeFileSync(c, "function f(r){\n  return\r r ? 1 : 0\n}\n");
  assert.equal(toolSha(a), toolSha(b)); assert.notEqual(toolSha(a), toolSha(c));
});

test("測試不成立回 2、缺驗回 3：找不到 www、乾淨的就沒過、清單讀不到、不認得的壞樣本、cdnstale 沒加 --cdn；CDN 清單讀不到回 3", () => {
  const { D, L, M } = fakeWww(), run = (...a) => runCanary(CANARY, a);
  assert.equal(run("--dir", path.join(D, "沒有"), "--list", L).status, 2);
  assert.equal(run("--dir", D, "--list", path.join(D, "沒有.json")).status, 2);
  assert.equal(run("--dir", D, "--list", L, "--only", "home,亂寫").status, 2);
  assert.equal(run("--dir", D, "--list", L, "--only", "cdnstale").status, 2);
  assert.equal(run("--dir", D, "--list", L, "--cdn-manifest", path.join(D, "沒有.json")).status, 3);
  fs.rmSync(path.join(D, "data", "home", "qin.webp"));
  const r = run("--dir", D, "--list", L, "--cdn-manifest", M); assert.equal(r.status, 2); assert.match(r.stderr, /乾淨的樣本沒過/);
});
