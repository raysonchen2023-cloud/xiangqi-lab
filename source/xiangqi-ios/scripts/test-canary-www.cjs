// iOS P0-IMG 金絲雀 canary-www.js 與 check-www.js 的自我測試（AGENTS.md「P0 出口驗證要難作假」，2026-11-23）
//   在暫存資料夾做一個小的假 www（index.html、首頁素材、背景音樂、引擎、大檔、清單）和一份假的 CDN 清單，用真的 check-www.js 檢查：
//   乾淨的要全過；8 種壞樣本都要被抓到；再把 check-www.js 的判斷一條一條改壞（放在副本），金絲雀要回 4（檢查失靈）。
// 用法：node --test source/xiangqi-ios/scripts/test-canary-www.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), cp = require("child_process");
const HERE = __dirname, CHECK = path.join(HERE, "check-www.js"), CANARY = path.join(HERE, "canary-www.js");
const { toolSha, treeSha, picks, rng } = require("./canary-www.js");
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
  put("data/bgm/index.json", JSON.stringify({ han: ["zheng_1.mp3", "zheng_2.mp3"], tang: ["pipa_1.mp3", "pipa_2.mp3"] }));
  put("data/bgm/han/zheng_1.mp3", Buffer.alloc(400, 1)); put("data/bgm/han/zheng_2.mp3", Buffer.alloc(420, 2));
  put("data/bgm/tang/pipa_1.mp3", Buffer.alloc(430, 6)); put("data/bgm/tang/pipa_2.mp3", Buffer.alloc(440, 7));
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
function fakeApp(D) {
  const A = path.join(tmp("xq-fakeapp-"), "App.app"); fs.mkdirSync(A); fs.cpSync(D, path.join(A, "public"), { recursive: true });
  for (const f of ["cordova.js", "cordova_plugins.js"]) fs.writeFileSync(path.join(A, "public", f), "/* " + f + " */\n");
  fs.writeFileSync(path.join(A, "App"), "假的執行檔");
  return A;
}
function fakeIpa(A) {
  const ipa = path.join(tmp("xq-fakeipa-"), "App.ipa");
  const py = "import os,sys,zipfile\nz=zipfile.ZipFile(sys.argv[2],'w')\nfor r,_,fs in os.walk(sys.argv[1]):\n  for f in fs:\n    p=os.path.join(r,f);z.write(p,os.path.join('Payload','App.app',os.path.relpath(p,sys.argv[1])))\nz.close()";
  const r = cp.spawnSync("python3", ["-c", py, A, ipa], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr);
  return ipa;
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


test("canary-www.js：--pkg 給 .app，檢查的就是包裡那份 public；8 種壞樣本、每類頭中尾＋一個種子挑的都被抓到；收據綁住安裝包、不會改到原本那份", () => {
  const { D, L, M } = fakeWww(), A = fakeApp(D), before = treeSha(A), out = path.join(tmp("xq-canaryout-"), "r.json");
  const r = runCanary(CANARY, ["--pkg", A, "--list", L, "--cdn-manifest", M, "--seed", "7", "--out", out]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.pass, true); assert.equal(R.full, true, "--pkg＋--cdn、沒有 --only 才是送審用的收據"); assert.equal(R.seed, 7);
  assert.deepEqual(R.kinds, ["home", "bgm", "engine", "core", "big", "swap", "bridge", "cdnstale"]);
  for (const x of R.results) { assert.equal(x.caught, true, x.kind + " " + x.file); assert.equal(x.exit, 1, x.kind) }
  const files = (k) => R.results.filter((x) => x.kind === k).map((x) => x.file);
  assert.deepEqual(files("bgm").slice(0, 3), ["data/bgm/han/zheng_1.mp3", "data/bgm/han/zheng_2.mp3", "data/bgm/tang/pipa_2.mp3"], "背景音樂測頭、中、尾");
  assert.deepEqual(files("engine").slice(0, 3), ["engine/pikafish.js", "engine/pikafish.wasm", "engine/pikafish.nnue"], "三個引擎檔都測");
  assert.ok(files("core").includes("capacitor.js") && files("core").includes("zh.js"));
  assert.equal(R.pkg.kind, "app"); assert.equal(R.pkg.sha256, before);
  assert.equal(R.sample.treeSha256, treeSha(path.join(A, "public")), "收據記的就是包裡那份 public");
  assert.equal(R.toolPins["source/xiangqi-ios/scripts/check-www.js"], toolSha(CHECK));
  assert.equal(treeSha(A), before, "原本那份一個位元組都沒變");
});

test("canary-www.js：--pkg 給 .ipa 會解開 Payload/*.app/public 來檢查；給了 --pkg 又給 --dir 回 2；IPA 解不開回 2", () => {
  const { D, L, M } = fakeWww(), ipa = fakeIpa(fakeApp(D)), out = path.join(tmp("xq-canaryout-"), "r.json");
  let r = runCanary(CANARY, ["--pkg", ipa, "--list", L, "--cdn-manifest", M, "--seed", "3", "--only", "home,engine", "--out", out]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.pkg.kind, "ipa"); assert.equal(R.pkg.sha256, sha256(fs.readFileSync(ipa))); assert.equal(R.full, false, "--only 不能送審");
  r = runCanary(CANARY, ["--pkg", ipa, "--dir", D, "--list", L]); assert.equal(r.status, 2); assert.match(r.stderr, /給了 --pkg 就不要再給 --dir/);
  const bad = path.join(tmp("xq-badipa-"), "x.ipa"); fs.writeFileSync(bad, "不是 zip");
  r = runCanary(CANARY, ["--pkg", bad, "--list", L]); assert.equal(r.status, 2); assert.match(r.stderr, /安裝包/);
});

test("只給 --dir（沒有安裝包）、沒加 --cdn 的收據 full＝false；同一個種子挑到的檔一樣，換種子會換", () => {
  const { D, L, M } = fakeWww(), od = tmp("xq-canaryout-"), out = (n) => path.join(od, n + ".json");
  let r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest", M, "--out", out("a")]); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(fs.readFileSync(out("a"), "utf8")).full, false, "沒有安裝包不能送審");
  r = runCanary(CANARY, ["--dir", D, "--list", L, "--out", out("b")]); assert.equal(r.status, 0);
  const B = JSON.parse(fs.readFileSync(out("b"), "utf8")); assert.equal(B.full, false); assert.ok(!B.kinds.includes("cdnstale"));
  const pick = (seed) => picks(Array.from({ length: 50 }, (_, i) => "f" + i), rng(seed));
  assert.deepEqual(pick(11), pick(11), "同一個種子挑到的一樣");
  assert.deepEqual(pick(11).slice(0, 3), ["f0", "f24", "f49"], "頭、中、尾固定");
  assert.ok([1, 2, 3, 4, 5, 6].some((s) => pick(s)[3] !== pick(11)[3]), "換種子，第四個會換");
});

/* 把 check-www.js 的某一條判斷改壞（放在副本旁邊，用同一個金絲雀流程），金絲雀要判出「檢查失靈」——每一種都不靠運氣，任何種子都要抓到 */
function blindCanary(from, to) {
  const d = tmp("xq-blind-"), s = fs.readFileSync(CHECK, "utf8");
  assert.ok(s.includes(from), "測試要改的那一行還在：" + from.slice(0, 40));
  fs.writeFileSync(path.join(d, "check-www.js"), s.replace(from, to)); fs.copyFileSync(CANARY, path.join(d, "canary-www.js"));
  fs.copyFileSync(path.join(HERE, ".www-files.json"), path.join(d, ".www-files.json"));
  return path.join(d, "canary-www.js");
}
test("check-www.js 的判斷一條一條改壞（含只查第一個、只查 .js、需求清單不收背景音樂、W42 不比）：不管種子是多少，金絲雀都回 4", () => {
  const cases = [
    ["home", 'if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]);', "if (false) {}"],
    ["home", "for (const it of [...(P.items || []), ...(P.big || [])]) {", "for (const it of [...(P.items || []).slice(0, 1), ...(P.big || [])]) {"],
    ["bgm", 'if (!exists(r)) bad.push("背景音樂清單有但沒有檔：" + r);', "if (false) {}"],
    ["bgm", "for (const [era, list] of Object.entries(B)) for (const f of (Array.isArray(list) ? list : [])) {", "for (const [era, list] of Object.entries(B).slice(0, 1)) for (const f of (Array.isArray(list) ? list.slice(0, 1) : [])) {"],
    ["engine", 'if (!exists(f)) bad.push("缺引擎 " + f);', "if (false) {}"],
    ["engine", 'for (const f of ["engine/pikafish.js", "engine/pikafish.wasm", "engine/pikafish.nnue"])', 'for (const f of ["engine/pikafish.js"])'],
    ["core", 'if (!exists(f)) bad.push("缺 " + f);', "if (false) {}"],
    ["big", 'else if (size(rel) !== sz) bad.push("大小不對 " + rel);', "else if (false) {}"],
    ["swap", '!== h) bad.push("內容跟清單不同 " + rel);', '!== h && false) bad.push("內容跟清單不同 " + rel);'],
    ["swap", "    else if (h && crypto", "    else if (h && /\\.js$/.test(rel) && crypto"],
    ["bridge", "else if (!(iCap < iBr && (iCore < 0 || iBr < iCore))) bad.push(", "else if (false) bad.push("],
    ["cdnstale", "    if (need.has(rel)) bad.push(", "    if (false) bad.push("],
    ["cdnstale", "const r = \"data/bgm/\" + era + \"/\" + f; need.add(r);", "const r = \"data/bgm/\" + era + \"/\" + f;"],
  ];
  for (const [kind, from, to] of cases) for (const seed of ["1", "2", "3"]) {
    const { D, L, M } = fakeWww(), C = blindCanary(from, to);
    const r = runCanary(C, ["--dir", D, "--list", L, "--cdn-manifest", M, "--only", kind, "--seed", seed]);
    assert.equal(r.status, 4, kind + "（種子 " + seed + "）改成「" + to.slice(0, 50) + "」：" + r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp("✘ " + kind + "："), kind + " 要被列成沒抓到");
    assert.match(r.stdout, /檢查本身失靈/);
  }
});

test("工具雜湊：CRLF 換成 LF 後一樣；多一個單獨的 CR 就不同（單獨 CR 在 JS 裡算換行）", () => {
  const d = tmp("xq-toolsha-"), a = path.join(d, "a.js"), b = path.join(d, "b.js"), c = path.join(d, "c.js");
  fs.writeFileSync(a, "function f(r){\n  return r ? 1 : 0\n}\n"); fs.writeFileSync(b, "function f(r){\r\n  return r ? 1 : 0\r\n}\r\n"); fs.writeFileSync(c, "function f(r){\n  return\r r ? 1 : 0\n}\n");
  assert.equal(toolSha(a), toolSha(b)); assert.notEqual(toolSha(a), toolSha(c));
});


test("測試不成立回 2、缺驗回 3：找不到資料夾、乾淨的就沒過、清單讀不到、不認得的壞樣本、cdnstale 沒加 --cdn；CDN 清單讀不到、是空的、files 是 null 都回 3", () => {
  const { D, L, M } = fakeWww(), run = (...a) => runCanary(CANARY, a), d = tmp("xq-badcdn-");
  assert.equal(run("--dir", path.join(D, "沒有"), "--list", L).status, 2);
  assert.equal(run("--dir", D, "--list", path.join(D, "沒有.json")).status, 2);
  assert.equal(run("--dir", D, "--list", L, "--only", "home,亂寫").status, 2);
  assert.equal(run("--dir", D, "--list", L, "--only", "cdnstale").status, 2);
  for (const [n, body] of [["missing", null], ["empty", '{"files":{}}'], ["null", '{"files":null}'], ["array", '{"files":[1]}'], ["nomatch", '{"files":{"data/沒有.webp":[1,"aaaaaaaaaaaa"]}}']]) {
    const p = path.join(d, n + ".json"); if (body != null) fs.writeFileSync(p, body);
    assert.equal(run("--dir", D, "--list", L, "--cdn-manifest", p).status, 3, "CDN 清單 " + n + " 要回 3");
    assert.equal(runCheck(D, L, "--cdn-manifest", p).status, 3, "check-www 對 CDN 清單 " + n + " 也要回 3");
  }
  fs.rmSync(path.join(D, "data", "home", "qin.webp"));
  const r = run("--dir", D, "--list", L, "--cdn-manifest", M); assert.equal(r.status, 2); assert.match(r.stderr, /乾淨的樣本沒過/);
});

test("check-www.js：App 會要的檔只要有一個沒跟 CDN 比到（CDN 清單沒有、雜湊是 null）就回 3，並列出是哪個；清單只放無關的檔也回 3（PR #67 第三次審查）", () => {
  const { D, L, M } = fakeWww(), man = JSON.parse(fs.readFileSync(M, "utf8")), d = tmp("xq-cdnpart-");
  const w = (n, files) => { const p = path.join(d, n + ".json"); fs.writeFileSync(p, JSON.stringify({ files })); return p };
  const drop = { ...man.files }; delete drop["data/home/qin.webp"];
  let r = runCheck(D, L, "--cdn-manifest", w("drop", drop)); assert.equal(r.status, 3, r.stdout + r.stderr); assert.match(r.stderr, /沒跟 CDN 比到.*data\/home\/qin\.webp/);
  const nul = JSON.parse(JSON.stringify(man.files)); nul["data/bgm/tang/pipa_1.mp3"][1] = null;
  r = runCheck(D, L, "--cdn-manifest", w("null", nul)); assert.equal(r.status, 3, r.stdout + r.stderr); assert.match(r.stderr, /data\/bgm\/tang\/pipa_1\.mp3/);
  r = runCheck(D, L, "--cdn-manifest", w("only", { "data/gmgames.json": man.files["data/gmgames.json"] || [5000, "000000000000"] })); assert.equal(r.status, 3, r.stdout + r.stderr);
  r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest", w("drop2", drop), "--only", "home"]); assert.equal(r.status, 3, "乾淨的就沒比全，金絲雀回 3");
});

test("結束代碼：有任何一個做出來了卻沒被抓到，就回 4，不會被「測試不成立」蓋成 2；收據記 CDN 清單的雜湊；符號連結算進樹雜湊", () => {
  const { exitOf } = require("./canary-www.js");
  assert.equal(exitOf([{ caught: true }], true), 0);
  assert.equal(exitOf([{ caught: false, unfit: true }, { caught: false }], false), 4, "失靈優先");
  assert.equal(exitOf([{ caught: false, unfit: true }, { caught: true }], false), 2);
  const { D, L, M } = fakeWww(), out = path.join(tmp("xq-canaryout-"), "r.json");
  const r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest", M, "--only", "home", "--out", out]); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(JSON.parse(fs.readFileSync(out, "utf8")).cdn.sha256, sha256(fs.readFileSync(M)));
  const a = tmp("xq-link-"); fs.writeFileSync(path.join(a, "x"), "1"); const t0 = treeSha(a); fs.symlinkSync("x", path.join(a, "y"));
  assert.notEqual(treeSha(a), t0, "多一個符號連結，樹雜湊要變");
});
