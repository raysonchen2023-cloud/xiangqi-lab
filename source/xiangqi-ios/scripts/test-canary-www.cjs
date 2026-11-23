// iOS P0-IMG 金絲雀 canary-www.js 與 check-www.js 的自我測試（AGENTS.md「P0 出口驗證要難作假」，2026-11-23）
//   在暫存資料夾做一個小的假 www（index.html、首頁素材、背景音樂、引擎、大檔、清單）和一份假的 CDN 清單，用真的 check-www.js 檢查：
//   乾淨的要全過；25 種壞樣本都要被抓到；再把 check-www.js 的判斷一條一條改壞（放在副本），金絲雀要回 4（檢查失靈）。
// 用法：node --test source/xiangqi-ios/scripts/test-canary-www.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), cp = require("child_process");
const HERE = __dirname, CHECK = path.join(HERE, "check-www.js"), CANARY = path.join(HERE, "canary-www.js");
const { toolSha, treeSha, picks, rng, run, OFFICIAL_CDN, KINDS, hit, runtimeTaint, cleanEnv } = require("./canary-www.js");
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
  /* PR #67 第八次審查：做得像真包——首頁素材很多（照字母排背景音樂會落在中間）、背景音樂分好幾個朝代、大檔也有雜湊 */
  const homeX = [];
  /* PR #67 第九次審查：首頁素材分在好幾個目錄（真包有 data/homemap/、data/icons/…），根目錄也有 3D 場景程式；homemap 放在 items 前段，不分層的話頭、中、尾都挑不到 */
  for (let i = 0; i < 12; i++) { const r = "data/homemap/m" + String(i).padStart(2, "0") + ".webp"; put(r, Buffer.alloc(170 + i, 30 + i)); homeX.push([r, 170 + i]) }
  for (let i = 0; i < 60; i++) { const r = "data/home/x" + String(i).padStart(2, "0") + ".webp"; put(r, Buffer.alloc(100 + i, 100 + i)); homeX.push([r, 100 + i]) }
  /* PR #67 第十一次審查：三層目錄（data/pset/<朝代>/、data/icons/<朝代>/），而且同一個目錄裡混著 .png、.svg */
  for (const era of ["han", "ming", "tang"]) for (let i = 0; i < 8; i++) { const ext = i === 3 ? "png" : i === 5 ? "svg" : "webp", r = "data/pset/" + era + "/p" + i + "." + ext; put(r, Buffer.alloc(90 + i, era.length * 7 + i)); homeX.push([r, 90 + i]) }
  for (const era of ["han", "tang"]) for (let i = 0; i < 10; i++) put("data/icons/" + era + "/i" + i + ".webp", Buffer.alloc(110 + i, era.length * 3 + i));
  /* PR #67 第十次審查：零星的副檔名（首頁有 2 張 .png、場景目錄有 2 個 .glb 混在一堆 .webp 裡、音效 .wav） */
  for (const n of ["p1", "p2"]) { const r = "data/home/" + n + ".png"; put(r, Buffer.alloc(150, n.length + 40)); homeX.splice(30, 0, [r, 150]) }
  for (let i = 0; i < 20; i++) put("data/scene/s" + String(i).padStart(2, "0") + ".webp", Buffer.alloc(120 + i, 60 + i));
  for (const n of ["m1", "m2"]) put("data/scene/" + n + ".glb", Buffer.alloc(130, n.length + 70));
  for (const n of ["w1", "w2"]) put("data/sfx/" + n + ".wav", Buffer.alloc(140, n.length + 80));
  for (const f of ["three.min.js", "park3d.js", "map3d.js", "bot3d.js", "GLTFLoader.mjs"]) put(f, "/* " + f + " */\nvar y = 2;\n");
  put("data/preload.json", JSON.stringify({ items: [["data/home/han.webp", 203], ["data/home/qin.webp", 203], ["data/home/tang.webp", 204], ...homeX], big: [["data/gmgames.json", 5000]] }));
  put("release.json", JSON.stringify({ version: "test" }));
  for (let i = 0; i < 40; i++) put("data/misc/m" + String(i).padStart(2, "0") + ".json", JSON.stringify({ i, pad: "x".repeat(20 + i) }));   /* 一堆小檔：swap 只靠頭中尾＋隨機，幾乎挑不到最大的那個 */   /* 包裡的版號，要跟清單的 siteVersion 一樣 */
  put("data/big-books.json", "[]");
  put("data/bgm/index.json", JSON.stringify({ han: ["zheng_1.mp3", "zheng_2.mp3"], tang: ["pipa_1.mp3", "pipa_2.mp3"], song: ["qin_1.mp3", "qin_2.mp3", "qin_3.mp3"], ming: ["sx_1.mp3", "sx_2.mp3"], qing: ["eh_1.mp3", "eh_2.mp3"], sui: ["dz_1.mp3", "dz_2.mp3"] }));
  /* 朝代多一點：只靠頭、中、尾挑不到每個朝代（PR #67 第九次審查） */
  for (const [era, fs2] of [["ming", ["sx_1", "sx_2"]], ["qing", ["eh_1", "eh_2"]], ["sui", ["dz_1", "dz_2"]]]) fs2.forEach((n, i) => put("data/bgm/" + era + "/" + n + ".mp3", Buffer.alloc(300 + i, era.length + i)));
  put("data/bgm/song/qin_1.mp3", Buffer.alloc(410, 8)); put("data/bgm/song/qin_2.mp3", Buffer.alloc(411, 9)); put("data/bgm/song/qin_3.mp3", Buffer.alloc(412, 10));
  put("data/bgm/han/zheng_1.mp3", Buffer.alloc(400, 1)); put("data/bgm/han/zheng_2.mp3", Buffer.alloc(420, 2));
  put("data/bgm/tang/pipa_1.mp3", Buffer.alloc(430, 6)); put("data/bgm/tang/pipa_2.mp3", Buffer.alloc(440, 7));
  put("engine/pikafish.js", "var Pikafish = 1;\n"); put("engine/pikafish.wasm", Buffer.alloc(500, 3)); put("engine/pikafish.nnue", Buffer.alloc(6000, 4));
  put("data/gmgames.json", Buffer.alloc(5000, 5));   /* 不是引擎檔裡最大的，沒記 sha1（照 copy-www.js：大檔不算 sha1） */
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
/* 假的 origin/main：清單給 listBuf，兩支工具給目前的檔（over 可以換掉其中一個），@commit 給一個假的提交 */
const mainOf = (listBuf, over = {}) => (rel) => (rel in over ? over[rel] : rel === "@commit" ? "c0ffee" : rel.endsWith(".www-files.json") ? (typeof listBuf === "function" ? listBuf() : listBuf) : fs.readFileSync(path.join(HERE, path.basename(rel))));
/* 「check-www 自己 --cdn」的替身：真的跑 check-www，只把網址換成金絲雀下載好的那份本機清單（PR #67 第十二次審查：要比對「比了幾個檔」，不能只回 0） */
const okCdn = (d, lf, ctx) => cp.spawnSync(process.execPath, [CHECK, "--dir", d, "--list", lf, "--cdn-manifest", ctx.cdnFile], { encoding: "utf8" });
const runCheck = (dir, list, ...more) => cp.spawnSync(process.execPath, [CHECK, "--dir", dir, "--list", list, ...more], { encoding: "utf8" });
/* PR #67 第十六次審查①：base-guard 每一步都帶 NODE_OPTIONS=--require assert-count.cjs；叫金絲雀時預設拿掉（只有測「環境被動過」那一項自己帶），不然在 guard-base 會回 2 */
const runCanary = (canary, args, o = {}) => cp.spawnSync(process.execPath, [canary, ...args], { encoding: "utf8", env: env({ NODE_OPTIONS: null, ...o }) });

test("check-www.js：乾淨的假 www 全過；同大小換內容抓得到；--cdn 時 App 會要的檔跟 CDN 現行版不同會擋；讀不到 CDN 清單回 3（缺驗）", () => {
  const { D, L, M } = fakeWww();
  let r = runCheck(D, L, "--cdn-manifest", M); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /跟 CDN 現行版比了 \d+ 個檔/);
  r = runCheck(D, L, "--cdn-manifest", path.join(D, "沒有.json")); assert.equal(r.status, 3, r.stdout + r.stderr); assert.match(r.stderr, /讀不到 CDN 清單/);
  const man = JSON.parse(fs.readFileSync(M, "utf8")); man.files["data/home/qin.webp"][1] = "000000000000"; fs.writeFileSync(M, JSON.stringify(man));
  r = runCheck(D, L, "--cdn-manifest", M); assert.equal(r.status, 1); assert.match(r.stderr, /跟 CDN 現行版不同 data\/home\/qin\.webp/);
  const p = path.join(D, "zh.js"), b = fs.readFileSync(p); b[3] ^= 0xff; fs.writeFileSync(p, b);
  r = runCheck(D, L); assert.equal(r.status, 1); assert.match(r.stderr, /內容跟清單不同 zh\.js/);
});


test("canary-www.js：--pkg 給 .app，檢查的就是包裡那份 public；25 種壞樣本、每類頭中尾＋一個種子挑的都被抓到；收據綁住安裝包、不會改到原本那份", () => {
  const { D, L, M } = fakeWww(), A = fakeApp(D), before = treeSha(A), out = path.join(tmp("xq-canaryout-"), "r.json");
  const r = runCanary(CANARY, ["--pkg", A, "--list", L, "--cdn-manifest", M, "--seed", "7", "--out", out]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.pass, true); assert.equal(R.full, false, "--cdn-manifest 給的本機清單不算正式 CDN，送審不能用（PR #67 第四次審查：本機清單可能是拿包自己算的）"); assert.equal(R.seed, 7);
  assert.deepEqual(R.kinds, ["home", "casehome", "bgm", "casebgm", "caselist", "casedir", "nodata", "rmdir", "mani", "engine", "core", "big", "swap", "bridge", "nocap", "nobridge", "cmtcap", "cdnstale", "cdnmiss", "cdnfail", "ctrl", "nohash", "listmiss", "bigpre", "capord"]);
  for (const x of R.results) { assert.equal(x.caught, true, x.kind + " " + x.file); assert.equal(x.exit, x.kind === "(乾淨重跑)" ? 0 : ["cdnmiss", "cdnfail", "nohash"].includes(x.kind) ? 3 : 1, x.kind) }   /* 乾淨重跑要回 0（PR #67 第十六次審查②） */
  assert.ok(R.results.some((x) => x.kind === "swap" && x.file === "engine/pikafish.nnue"), "swap 固定測最大的記了 sha1 的檔（PR #67 第五次審查）");
  const files = (k) => R.results.filter((x) => x.kind === k).map((x) => x.file);
  for (const era of ["han", "tang", "song", "ming", "qing", "sui"]) assert.ok(files("bgm").some((f) => f.startsWith("data/bgm/" + era + "/")), "背景音樂每個朝代都要測到：" + era);
  for (const k of ["cdnstale", "cdnmiss"]) { assert.ok(files(k).some((f) => f.startsWith("data/bgm/")), k + " 要測到背景音樂（PR #67 第八次審查）"); assert.ok(files(k).includes("data/gmgames.json"), k + " 要測到 preload big") }
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
    /* PR #67 第五次審查：下面這些改壞，原本的金絲雀都回 0 */
    ["cdnmiss", "if (notCmp.length) unverified.push(", "if (false) unverified.push("],
    ["cdnfail", '} catch (e) { unverified.push("讀不到 CDN 清單 "', '} catch (e) { warn.push("讀不到 CDN 清單 "'],
    ["ctrl", 'if (m) bad.push(f + " 有控制字元', 'if (false) bad.push(f + " 有控制字元'],
    ["bigpre", "for (const it of [...(P.items || []), ...(P.big || [])]) {", "for (const it of [...(P.items || [])]) {"],
    ["capord", "else if (!(iCap < iBr && (iCore < 0 || iBr < iCore))) bad.push(", "else if (!((iCore < 0 || iBr < iCore))) bad.push("],
    ["swap", "    else if (h && crypto", "    else if (h && size(rel) < 450 && crypto"],
    ["home", "if (bad.length) {", "if (bad.length && ALL) {"],
    /* PR #67 第十次審查：只對某種副檔名、某一支檔放水 */
    ["swap", "    else if (h && crypto", '    else if (h && !rel.endsWith(".glb") && crypto'],
    ["home", 'if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]);', 'if (!exists(it[0]) && !it[0].endsWith(".png")) bad.push("preload.json 列了但沒有：" + it[0]);'],
    ["ctrl", 'for (const f of ["index.html", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js"]) {', 'for (const f of ["index.html", "native-bridge.js", "core.js", "engine.js", "net.js"]) {'],
    ["core", '"local.js", "net.js", "zh.js"]) if (!exists(f)) bad.push("缺 " + f);', '"local.js", "zh.js"]) if (!exists(f)) bad.push("缺 " + f);'],
    /* PR #67 第六次審查 */
    ["listmiss", 'if (!exists(rel)) bad.push("少了 " + rel);', "if (!exists(rel)) {}"],
    /* PR #67 第八次審查 */
    ["cdnstale", "n++; need.add(it[0]);", "n++; if ((P.items || []).includes(it)) need.add(it[0]);"],
    ["cdnmiss", "n++; need.add(it[0]);", "n++; if ((P.items || []).includes(it)) need.add(it[0]);"],
    ["cdnmiss", "const r = \"data/bgm/\" + era + \"/\" + f; need.add(r);", "const r = \"data/bgm/\" + era + \"/\" + f;"],
    ["nohash", "if (noHash.length) unverified.push(", "if (false) unverified.push("],
    /* PR #67 第十一次審查：只對某個三層目錄、某種副檔名失靈；capacitor 標籤；大小寫；控制字元只看檔尾 */
    ["cdnstale", "    if (need.has(rel)) bad.push(", '    if (need.has(rel) && !rel.endsWith(".png")) bad.push('],
    ["cdnstale", "    if (need.has(rel)) bad.push(", '    if (need.has(rel) && !rel.startsWith("data/pset/ming/")) bad.push('],
    ["home", 'if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]);', 'if (!exists(it[0]) && !it[0].startsWith("data/pset/ming/")) bad.push("preload.json 列了但沒有：" + it[0]);'],
    ["swap", "    else if (h && crypto", '    else if (h && !rel.startsWith("data/icons/tang/") && crypto'],
    ["nocap", 'if (iCap < 0 || iBr < 0) bad.push("index.html 沒有插', 'if (false) bad.push("index.html 沒有插'],
    ["nobridge", 'if (iCap < 0 || iBr < 0) bad.push("index.html 沒有插', 'if (iCap < 0) bad.push("index.html 沒有插'],
    /* 大小寫的改壞要在 Linux（本來就分大小寫）也失靈：改成拿目錄列表做「不分大小寫」比對，不能只換成 fs.existsSync（PR #67 第十三次審查後 CI 發現） */
    ["casehome", "const exists = rel => { let d = ROOT;", "const exists = (rel) => { let d = ROOT; for (const seg of rel.split(\"/\")) { const s = listDir(d), m = s && [...s].find((x) => x.toLowerCase() === seg.toLowerCase()); if (!m) return false; d = path.join(d, m) } return true }; const _x = rel => { let d = ROOT;"],
    ["ctrl", "m = s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/)", "m = s.slice(-64).match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/)"],
    /* PR #67 第九次審查：只對某個目錄／某幾個檔放水 */
    ["listmiss", 'if (!exists(rel)) bad.push("少了 " + rel);', 'if (!exists(rel) && !/3d|three|GLTF/.test(rel)) bad.push("少了 " + rel);'],
    ["listmiss", 'if (!exists(rel)) bad.push("少了 " + rel);', 'if (!exists(rel) && !rel.startsWith("data/misc/")) bad.push("少了 " + rel);'],
    ["cdnstale", "    if (need.has(rel)) bad.push(", '    if (need.has(rel) && !rel.startsWith("data/homemap/")) bad.push('],
    ["home", 'if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]);', 'if (!exists(it[0]) && !it[0].startsWith("data/homemap/")) bad.push("preload.json 列了但沒有：" + it[0]);'],
    ["nohash", 'if (!h && (rel.startsWith("engine/") || need.has(rel) || sz > 20 * 1048576)) noHash.push(rel);', 'if (!h && rel.startsWith("engine/")) noHash.push(rel);'],
    ["ctrl", "s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/)", "s.match(/[\\x01]/)"],
    ["ctrl", "s.match(/[\\x00-\\x08\\x0B\\x0C\\x0E-\\x1F\\x7F]/)", "s.match(/[\\x01-\\x08]/)"],
    /* PR #67 第十二次審查：背景音樂、清單檔的大小寫判斷改回不分大小寫；HTML 註解裡的標籤也算有插 */
    ["casebgm", 'if (!exists(r)) bad.push("背景音樂清單有但沒有檔：" + r);', 'if (!((rel) => { let d = ROOT; for (const seg of rel.split("/")) { const s = listDir(d), m = s && [...s].find((x) => x.toLowerCase() === seg.toLowerCase()); if (!m) return false; d = path.join(d, m) } return true })(r)) bad.push("背景音樂清單有但沒有檔：" + r);'],
    ["caselist", 'if (!exists(rel)) bad.push("少了 " + rel);', 'if (!((rel) => { let d = ROOT; for (const seg of rel.split("/")) { const s = listDir(d), m = s && [...s].find((x) => x.toLowerCase() === seg.toLowerCase()); if (!m) return false; d = path.join(d, m) } return true })(rel)) bad.push("少了 " + rel);'],
    /* PR #67 第十五次審查：整批缺檔、清單檔缺 */
    ["nodata", 'bad.push("讀不到 data/preload.json：" + e.message);', "{}"],
    ["nodata", 'if (!fs.existsSync(ROOT)) { console.error("✘ 找不到 " + ROOT); process.exit(1); }', 'if (!fs.existsSync(ROOT)) { console.error("✘ 找不到 " + ROOT); process.exit(1); } if (!fs.existsSync(path.join(ROOT, "data"))) { console.log("✔ 沒問題"); process.exit(0) }'],
    ["rmdir", "if (bad.length) {", "if (bad.length && bad.length < 30) {"],
    ["mani", 'if (!exists(rel)) bad.push("少了 " + rel);', 'if (!exists(rel) && rel !== "release.json") bad.push("少了 " + rel);'],
    ["mani", 'bad.push("讀不到 data/big-books.json");', "{}"],
    /* PR #67 第十三次審查：目錄名不分大小寫、只有最後一段（檔名）照列表比對 */
    ["casedir", "if (!s || !s.has(seg)) return false; d = path.join(d, seg) }", "const last = seg === rel.split(\"/\").pop(), m = s && (last ? (s.has(seg) ? seg : null) : [...s].find((x) => x.toLowerCase() === seg.toLowerCase())); if (!m) return false; d = path.join(d, m) }"],
    ["cmtcap", '.toString("utf8").replace(/<!--[\\s\\S]*?-->/g, "");', '.toString("utf8");'],
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

test("full＝true 只認正式 CDN：同一份清單從正式網址來才算，本機檔、別的網址都不算；乾淨的有錯時先回 2，不會被「CDN 讀不到」蓋成 3（PR #67 第四次審查）", () => {
  const { D, L, M } = fakeWww(), A = fakeApp(D), ipa = fakeIpa(A), txt = fs.readFileSync(M, "utf8"), quiet = () => {}, mainFile = mainOf(() => fs.readFileSync(L));
  const from = (want) => (u) => { assert.equal(u, want, "只下載指定的那個網址"); return txt };
  let r = run({ pkg: ipa, list: L, cdn: OFFICIAL_CDN, readM: from(OFFICIAL_CDN), mainFile, selfCdn: okCdn, log: quiet });
  assert.equal(r.code, 0); assert.equal(r.receipt.full, true, "正式 CDN＋--pkg＋沒有 --only（清單和版號也綁住，見下一項測試）");
  r = run({ pkg: ipa, list: L, cdn: M, seed: 7, readM: from(M), mainFile, log: quiet });
  assert.equal(r.code, 0); assert.equal(r.receipt.full, false, "本機清單：拿包比包，不能送審");
  const other = "https://example.invalid/cdn-manifest.json";
  r = run({ pkg: ipa, list: L, cdn: other, seed: 7, readM: from(other), mainFile, log: quiet });
  assert.equal(r.receipt.full, false, "別的網址也不算");
  assert.equal(OFFICIAL_CDN, "https://xiangqi-cdn.pages.dev/cdn-manifest.json");
  assert.doesNotMatch(fs.readFileSync(CANARY, "utf8").split("module.exports")[1], /readM/, "命令列不能換掉下載");
  /* 乾淨的少一個首頁素材，CDN 又讀不到：要回 2（乾淨的沒過），不是 3 */
  fs.rmSync(path.join(A, "public", "data", "home", "qin.webp"));
  r = run({ pkg: A, list: L, cdn: OFFICIAL_CDN, readM: () => { throw new Error("斷線") }, log: quiet });
  assert.equal(r.code, 2, "乾淨的有錯先回 2"); assert.match(JSON.stringify(r.receipt || r), /乾淨的樣本沒過/);
});

test("送審收據要綁住倉庫的清單和包的版號、而且要 .ipa：拿包重產的清單、版號不同、.app 都不算 full（PR #67 第五次審查）", () => {
  const { D, L, M } = fakeWww(), A = fakeApp(D), ipa = fakeIpa(A), txt = fs.readFileSync(M, "utf8"), quiet = () => {};
  const listBuf = fs.readFileSync(L), base = { list: L, cdn: OFFICIAL_CDN, readM: () => txt, selfCdn: okCdn, log: quiet };
  let r = run({ ...base, pkg: ipa, mainFile: mainOf(listBuf) });
  assert.equal(r.code, 0, JSON.stringify(r.receipt).slice(0, 300)); assert.equal(r.receipt.full, true, ".ipa＋正式 CDN＋清單是 main 那份＋版號一樣");
  assert.equal(r.receipt.bind.listBound, true); assert.equal(r.receipt.bind.verBound, true); assert.equal(r.receipt.bind.listMainSha256, sha256(listBuf));
  r = run({ ...base, pkg: A, mainFile: mainOf(listBuf) }); assert.equal(r.code, 0); assert.equal(r.receipt.full, false, ".app 的雜湊對不到送審的 .ipa");
  r = run({ ...base, pkg: ipa, mainFile: mainOf(Buffer.from(listBuf.toString("utf8") + " ")) }); assert.equal(r.receipt.full, false, "清單跟 main 不同（拿包重產）");
  r = run({ ...base, pkg: ipa, mainFile: mainOf(null) }); assert.equal(r.receipt.full, false, "讀不到 main 的清單");
  r = run({ ...base, pkg: ipa, mainFile: () => { throw new Error("沒有 git") } }); assert.equal(r.receipt.full, false, "git 出錯");
  const LJ = JSON.parse(listBuf.toString("utf8")); LJ.siteVersion = "other"; const L2 = path.join(tmp("xq-l2-"), "l.json"); fs.writeFileSync(L2, JSON.stringify(LJ));
  r = run({ ...base, list: L2, pkg: ipa, mainFile: mainOf(fs.readFileSync(L2)) }); assert.equal(r.code, 0); assert.equal(r.receipt.full, false, "清單版號跟包裡的 release.json 不同");
  assert.doesNotMatch(fs.readFileSync(CANARY, "utf8").split("module.exports")[1], /mainFile/, "命令列不能換掉讀 main");
  r = run({ ...base, pkg: ipa, mainFile: mainOf(listBuf, { "source/xiangqi-ios/scripts/check-www.js": Buffer.from(fs.readFileSync(CHECK, "utf8") + "\n/* 改過 */\n") }) });
  assert.equal(r.code, 0); assert.equal(r.receipt.full, false, "check-www.js 跟 main 那版不同（PR #67 第六次審查：工具也要綁 main）"); assert.equal(r.receipt.bind.toolsBound, false);
  r = run({ ...base, pkg: ipa, mainFile: mainOf(listBuf, { "source/xiangqi-ios/scripts/canary-www.js": null }) }); assert.equal(r.receipt.full, false, "讀不到 main 的 canary-www.js");
  r = run({ ...base, pkg: ipa, mainFile: mainOf(listBuf) }); assert.equal(r.receipt.bind.toolsBound, true); assert.equal(r.receipt.bind.mainCommit, "c0ffee");
});

test("check-www.js：清單讀不到（--list 打錯）回 3、不是只警告；參數放最後沒給值回 1；金絲雀參數沒給值回 2（PR #67 第五次審查）", () => {
  const { D, L, M } = fakeWww();
  let r = runCheck(D, path.join(D, "沒有.json")); assert.equal(r.status, 3, r.stdout + r.stderr); assert.match(r.stderr, /讀不到檔案清單/);
  const empty = path.join(tmp("xq-emptylist-"), "l.json"); fs.writeFileSync(empty, '{"files":{}}');
  r = runCheck(D, empty); assert.equal(r.status, 3, "清單是空的也算沒驗到");
  r = runCheck(D, L, "--cdn-manifest"); assert.equal(r.status, 1); assert.match(r.stderr, /--cdn-manifest 後面要接值/);
  r = cp.spawnSync(process.execPath, [CHECK, "--dir", D, "--list"], { encoding: "utf8" }); assert.equal(r.status, 1); assert.match(r.stderr, /--list 後面要接值/);
  r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest"]); assert.equal(r.status, 2); assert.match(r.stderr, /--cdn-manifest 後面要接值/);
  r = runCanary(CANARY, ["--dir", D, "--list", L, "--seed", "--cdn"]); assert.equal(r.status, 2);
  assert.doesNotMatch(fs.readFileSync(CANARY, "utf8"), /"--all"/, "金絲雀叫 check-www 跟正式用法一樣，不加 --all");
});

test("swap 每個種子都固定測最大的兩個記了 sha1 的檔（PR #67 第五次審查：W30 那種大小對、內容壞的大檔）", () => {
  const { D, L, M } = fakeWww(), od = tmp("xq-swapout-");
  for (const seed of ["1", "2", "3", "4", "5"]) {
    const out = path.join(od, seed + ".json"), r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "swap", "--seed", seed, "--out", out]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const got = JSON.parse(fs.readFileSync(out, "utf8")).results.map((x) => x.file);
    for (const f of ["engine/pikafish.nnue", "data/gmgames.json"]) assert.ok(got.includes(f), "種子 " + seed + " 要測到 " + f + "：" + got.join(","));
  }
});

test("正式 CDN 網址只定義在 check-www.js 一個地方，金絲雀從那裡讀；控制字元 30 個都插過（PR #67 第六、七次審查）", () => {
  const src = fs.readFileSync(CHECK, "utf8"), can = fs.readFileSync(CANARY, "utf8");
  assert.equal((src.match(/xiangqi-cdn\.pages\.dev/g) || []).length, 2, "check-www.js 裡只有說明和常數兩處");
  assert.match(src, /^const OFFICIAL_CDN = "https:\/\/xiangqi-cdn\.pages\.dev\/cdn-manifest\.json";/m);
  assert.doesNotMatch(can, /xiangqi-cdn\.pages\.dev/, "canary-www.js 不能自己再寫一份網址");
  assert.match(src, /argv\.includes\("--cdn"\) \? OFFICIAL_CDN/, "check-www --cdn 用的就是那個常數");
  const { D, L, M } = fakeWww(), out = path.join(tmp("xq-ctrlout-"), "r.json");
  const r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "ctrl", "--seed", "1", "--out", out]); assert.equal(r.status, 0, r.stdout + r.stderr);
  const got = JSON.parse(fs.readFileSync(out, "utf8")).results.map((x) => x.file.split("|")[1]);
  const all = [...Array(32).keys(), 127].filter((c) => ![9, 10, 13].includes(c)).map((c) => c.toString(16).padStart(2, "0"));
  assert.equal(all.length, 30);
  for (const c of all) assert.ok(got.includes(c), "要插過 \\x" + c + "（PR #67 第七次審查：check-www 認的每一個都要插）");
});

test("讀不到正式 CDN 網址不能算 full；check-www 自己的 --cdn 沒回 0 也不算；空的 --only 回 2（PR #67 第七次審查）", () => {
  const { D, L, M } = fakeWww(), ipa = fakeIpa(fakeApp(D)), txt = fs.readFileSync(M, "utf8"), quiet = () => {};
  const base = { pkg: ipa, list: L, cdn: OFFICIAL_CDN, readM: () => txt, mainFile: mainOf(fs.readFileSync(L)), log: quiet };
  let r = run({ ...base, selfCdn: okCdn }); assert.equal(r.receipt.full, true); assert.equal(r.receipt.cdnViaCheck.exit, 0); assert.ok(r.receipt.cdnViaCheck.n > 0); assert.equal(r.receipt.cdnViaCheck.n, r.receipt.cdnViaCheck.want);
  r = run({ ...base, selfCdn: () => ({ status: 3, stderr: "讀不到 CDN 清單" }) }); assert.equal(r.code, 0); assert.equal(r.receipt.full, false, "check-www --cdn 回 3");
  r = run({ ...base, selfCdn: () => ({ status: 1, stderr: "x" }) }); assert.equal(r.receipt.full, false, "check-www --cdn 回 1");
  let called = false; r = run({ ...base, cdn: M, selfCdn: () => { called = true; return { status: 0 } } }); assert.equal(called, false, "不是正式 CDN 就不跑"); assert.equal(r.receipt.cdnViaCheck, null);
  /* 正式網址讀不到（null）：用替身，check-www 的常數那一行換成 null */
  const d = tmp("xq-nocdn-"); fs.writeFileSync(path.join(d, "check-www.js"), fs.readFileSync(CHECK, "utf8").replace(/^const OFFICIAL_CDN = .*$/m, "const OFFICIAL_CDN = null;")); fs.copyFileSync(CANARY, path.join(d, "canary-www.js"));
  const C2 = require(path.join(d, "canary-www.js")); assert.equal(C2.OFFICIAL_CDN, null);
  r = C2.run({ ...base, cdn: null, selfCdn: okCdn }); assert.equal(r.receipt.full, false, "null 不能等於 null 就算正式");
  assert.equal(runCanary(CANARY, ["--dir", D, "--list", L, "--only", ""]).status, 2);
  assert.equal(runCanary(CANARY, ["--dir", D, "--list", L, "--only", " , "]).status, 2);
  assert.doesNotMatch(fs.readFileSync(CANARY, "utf8").split("module.exports")[1], /selfCdn/, "命令列不能換掉 check-www 自己的 --cdn");
});

test("check-www.js：清單沒記雜湊的引擎、App 會要的檔、大於 20 MB 的檔回 3；不重要的小檔沒記雜湊照樣只比大小（PR #67 第八次審查）", () => {
  const { D, L } = fakeWww(), J = JSON.parse(fs.readFileSync(L, "utf8")), d = tmp("xq-nohash-");
  const w = (n, f) => { const j = JSON.parse(JSON.stringify(J)); j.files[f][1] = null; const p = path.join(d, n + ".json"); fs.writeFileSync(p, JSON.stringify(j)); return p };
  for (const f of ["engine/pikafish.nnue", "data/home/x30.webp", "data/bgm/song/qin_2.mp3", "data/gmgames.json"]) { const r = runCheck(D, w(f.replace(/\W/g, "_"), f)); assert.equal(r.status, 3, f + "：" + r.stdout + r.stderr); assert.match(r.stderr, /清單沒記雜湊的重要檔/) }
  const r = runCheck(D, w("misc", "data/misc/m05.json")); assert.equal(r.status, 0, "不重要的小檔沒記雜湊不擋：" + r.stderr);
});

test("回 4（檢查失靈）或回 2（找不到可弄壞的檔）時 full 一定是 false；收據記結束代碼（PR #67 第九次審查）", () => {
  const { D, L, M } = fakeWww(), ipa = fakeIpa(fakeApp(D)), txt = fs.readFileSync(M, "utf8"), quiet = () => {};
  const base = { pkg: ipa, list: L, cdn: OFFICIAL_CDN, readM: () => txt, mainFile: mainOf(fs.readFileSync(L)), selfCdn: okCdn, log: quiet };
  let r = run(base); assert.equal(r.code, 0); assert.equal(r.receipt.full, true); assert.equal(r.receipt.code, 0);
  /* 回 4：check-www 的首頁判斷改壞（替身），工具雜湊另外給替身那份，其他條件都成立 */
  const d = tmp("xq-blind4-"), src = fs.readFileSync(CHECK, "utf8").replace('if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]);', "if (false) {}");
  fs.writeFileSync(path.join(d, "check-www.js"), src); fs.copyFileSync(CANARY, path.join(d, "canary-www.js"));
  const C2 = require(path.join(d, "canary-www.js"));
  r = C2.run({ ...base, mainFile: mainOf(fs.readFileSync(L), { "source/xiangqi-ios/scripts/check-www.js": Buffer.from(src) }) });
  assert.equal(r.code, 4); assert.equal(r.receipt.pass, false); assert.equal(r.receipt.full, false, "回 4 不能是 full"); assert.equal(r.receipt.code, 4);
  /* 回 2：找不到可以弄壞的檔（preload big 清空） */
  const D2 = tmp("xq-nobig-"); fs.cpSync(D, D2, { recursive: true }); const pj = path.join(D2, "data", "preload.json"), P = JSON.parse(fs.readFileSync(pj, "utf8")); P.big = []; fs.writeFileSync(pj, JSON.stringify(P));
  const LJ = JSON.parse(fs.readFileSync(L, "utf8")); LJ.files["data/preload.json"] = [fs.statSync(pj).size, sha1(fs.readFileSync(pj))]; const L2 = path.join(tmp("xq-l2b-"), "l.json"); fs.writeFileSync(L2, JSON.stringify(LJ));
  r = run({ ...base, pkg: fakeIpa(fakeApp(D2)), list: L2, mainFile: mainOf(fs.readFileSync(L2)) });
  assert.equal(r.code, 2, JSON.stringify(r.receipt.results.filter((x) => x.unfit))); assert.equal(r.receipt.full, false, "回 2 不能是 full");
});

test("參數：--dir=X 的寫法要認；打錯的旗標報錯；--seed 不是數字回 2；大小寫要完全一樣；.ipa 有重複項目回 2（PR #67 第九次審查）", () => {
  const { D, L } = fakeWww();
  let r = cp.spawnSync(process.execPath, [CHECK, "--dir=" + D, "--list=" + L], { encoding: "utf8" }); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, new RegExp("檢查 " + D.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  r = cp.spawnSync(process.execPath, [CHECK, "--dir", D, "--list", L, "--cnd"], { encoding: "utf8" }); assert.equal(r.status, 1); assert.match(r.stderr, /不認得的參數 --cnd/);
  r = cp.spawnSync(process.execPath, [CHECK, "--dir=", "--list", L], { encoding: "utf8" }); assert.equal(r.status, 1, "--dir= 空的不能退回預設");
  assert.equal(runCanary(CANARY, ["--dir", D, "--list", L, "--cnd"]).status, 2);
  assert.equal(runCanary(CANARY, ["--dir", D, "--list", L, "--seed", "abc"]).status, 2);
  assert.equal(runCanary(CANARY, ["--dir=" + D, "--list=" + L, "--only=home"]).status, 0);
  /* 大小寫：preload 列 H3.webp、實際是 h3.webp（macOS 預設不分大小寫，iPhone 分） */
  const C = tmp("xq-case-"); fs.cpSync(D, C, { recursive: true }); fs.renameSync(path.join(C, "data", "home", "qin.webp"), path.join(C, "data", "home", "Qin.webp"));
  r = runCheck(C, L); assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stderr, /preload\.json 列了但沒有：data\/home\/qin\.webp/);
  /* .ipa 有兩筆同名項目 */
  const A = fakeApp(D), ipa = fakeIpa(A), dup = path.join(tmp("xq-dupipa-"), "d.ipa");
  const py = "import sys,zipfile\nz=zipfile.ZipFile(sys.argv[1]);o=zipfile.ZipFile(sys.argv[2],'w')\nfor i in z.infolist(): o.writestr(i, z.read(i))\ni=[x for x in z.infolist() if x.filename.endswith('public/zh.js')][0]; o.writestr(i.filename, b'/* other */')\no.close()";
  const q = cp.spawnSync("python3", ["-W", "ignore", "-c", py, ipa, dup], { encoding: "utf8" }); assert.equal(q.status, 0, q.stderr);
  r = runCanary(CANARY, ["--pkg", dup, "--list", L, "--only", "home"]); assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stderr, /重複的檔名項目/);
});

test("分層真的有作用：每個種子 home 都測到 data/homemap/；listmiss 每次都測到全部根目錄程式檔（PR #67 第九次審查）", () => {
  const { D, L, M } = fakeWww(), od = tmp("xq-strata-");
  for (const seed of ["1", "2", "3", "4", "5"]) {
    const out = path.join(od, seed + ".json"), r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest", M, "--only", "home,listmiss,cdnstale,cdnmiss", "--seed", seed, "--out", out]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const R = JSON.parse(fs.readFileSync(out, "utf8")).results, f = (k) => R.filter((x) => x.kind === k).map((x) => x.file);
    for (const k of ["home", "cdnstale", "cdnmiss"]) assert.ok(f(k).some((x) => x.startsWith("data/homemap/")), "種子 " + seed + "：" + k + " 要測到 data/homemap/：" + f(k).join(","));
    for (const js of ["three.min.js", "park3d.js", "map3d.js", "bot3d.js", "GLTFLoader.mjs"]) assert.ok(f("listmiss").includes(js), "種子 " + seed + "：listmiss 要測到 " + js);
  }
});

test("背景音樂分朝代：每個種子每個朝代都測到（PR #67 第九次審查）", () => {
  const { D, L } = fakeWww(), od = tmp("xq-bgmera-");
  for (const seed of ["1", "2", "3", "4", "5"]) {
    const out = path.join(od, seed + ".json"), r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "bgm", "--seed", seed, "--out", out]); assert.equal(r.status, 0, r.stdout + r.stderr);
    const got = JSON.parse(fs.readFileSync(out, "utf8")).results.map((x) => x.file);
    for (const era of ["han", "tang", "song", "ming", "qing", "sui"]) assert.ok(got.some((f) => f.startsWith("data/bgm/" + era + "/")), "種子 " + seed + " 要測到 " + era + "：" + got.join(","));
  }
});

test("nohash 也測「大於 20 MB、不是 App 會要的檔」：check-www 把這條拿掉，金絲雀要回 4（PR #67 第十次審查）", () => {
  const { D, L } = fakeWww(), J = JSON.parse(fs.readFileSync(L, "utf8"));
  const big = Buffer.alloc(21 * 1048576, 9); fs.mkdirSync(path.join(D, "data", "huge"), { recursive: true }); fs.writeFileSync(path.join(D, "data", "huge", "pack.bin"), big);
  J.files["data/huge/pack.bin"] = [big.length, sha1(big)]; const L2 = path.join(tmp("xq-biglist-"), "l.json"); fs.writeFileSync(L2, JSON.stringify(J));
  const out = path.join(tmp("xq-bigout-"), "r.json");
  let r = runCanary(CANARY, ["--dir", D, "--list", L2, "--only", "nohash", "--seed", "1", "--out", out]); assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(JSON.parse(fs.readFileSync(out, "utf8")).results.some((x) => x.file === "data/huge/pack.bin"), "大檔那一層要測到");
  const C = blindCanary('if (!h && (rel.startsWith("engine/") || need.has(rel) || sz > 20 * 1048576)) noHash.push(rel);', 'if (!h && (rel.startsWith("engine/") || need.has(rel))) noHash.push(rel);');
  r = runCanary(C, ["--dir", D, "--list", L2, "--only", "nohash", "--seed", "1"]); assert.equal(r.status, 4, r.stdout + r.stderr);
  assert.ok(fs.existsSync(path.join(D, "data", "huge", "pack.bin")) && fs.statSync(path.join(D, "data", "huge", "pack.bin")).size === big.length, "nohash 不複製也不改原本那份");
});

test("送審用的種子不能自己挑：有安裝包時由安裝包雜湊＋origin/main 提交推出來，重跑一樣；給了 --seed 的收據不算送審用（PR #67 第十一次審查）", () => {
  const { D, L, M } = fakeWww(), ipa = fakeIpa(fakeApp(D)), txt = fs.readFileSync(M, "utf8"), quiet = () => {};
  const base = { pkg: ipa, list: L, cdn: OFFICIAL_CDN, readM: () => txt, mainFile: mainOf(fs.readFileSync(L)), selfCdn: okCdn, log: quiet };
  const a = run(base), b = run(base);
  assert.equal(a.receipt.full, true); assert.equal(a.receipt.seedFrom, "pkg+mainCommit");
  const want = parseInt(sha256(sha256(fs.readFileSync(ipa)) + "|c0ffee").slice(0, 8), 16) >>> 0;
  assert.equal(a.receipt.seed, want, "種子＝安裝包 SHA-256＋origin/main 提交推出來的"); assert.equal(b.receipt.seed, a.receipt.seed, "重跑一樣");
  const g = run({ ...base, seed: 7 }); assert.equal(g.code, 0); assert.equal(g.receipt.seedFrom, "given"); assert.equal(g.receipt.full, false, "自己給 --seed 不算送審用");
  assert.equal(run({ ...base, seed: String(want) }).receipt.full, false, "就算給的剛好是推出來的那個也不算");
});

test("每一層（完整父目錄＋副檔名）都測到：三層目錄、零星副檔名每個種子都測到（PR #67 第十一次審查）", () => {
  const { D, L, M } = fakeWww(), od = tmp("xq-allstrata-");
  for (const seed of ["1", "2", "3"]) {
    const out = path.join(od, seed + ".json"), r = runCanary(CANARY, ["--dir", D, "--list", L, "--cdn-manifest", M, "--only", "home,cdnstale,cdnmiss,swap,casehome", "--seed", seed, "--out", out]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const R = JSON.parse(fs.readFileSync(out, "utf8")).results, f = (k) => R.filter((x) => x.kind === k).map((x) => x.file);
    for (const k of ["home", "cdnstale", "cdnmiss", "casehome"]) for (const [pre, ext] of [["data/pset/ming/", ".png"], ["data/pset/ming/", ".svg"], ["data/pset/tang/", ".webp"], ["data/home/", ".png"]]) assert.ok(f(k).some((x) => x.startsWith(pre) && x.endsWith(ext)), "種子 " + seed + "：" + k + " 要測到 " + pre + "*" + ext);
    for (const pre of ["data/icons/han/", "data/icons/tang/", "data/pset/ming/"]) assert.ok(f("swap").some((x) => x.startsWith(pre)), "種子 " + seed + "：swap 要測到 " + pre);
    assert.ok(R.some((x) => x.batch > 1), "檔多的壞樣本一次弄壞好幾個");
  }
});

test("一次弄壞好幾個時，只出警告的那一個不能當成抓到（要在 ✘／△ 那一行）", () => {
  const { hit } = require("./canary-www.js");
  const out = "⚠ 清單外的檔跟 CDN 現行版不同 data/bgm/a.mp3（…）\n✘ 跟 CDN 現行版不同 data/home/b.webp（…）";
  assert.equal(hit(out, "跟 CDN 現行版不同 data/bgm/a.mp3", "✘"), false);
  assert.equal(hit(out, "跟 CDN 現行版不同 data/home/b.webp", "✘"), true);
  assert.equal(hit("△ 清單沒記雜湊的重要檔 2 個：x、y", ["清單沒記雜湊的重要檔", "y"], "△"), true);
  assert.equal(hit("△ 清單沒記雜湊的重要檔 2 個：x、y", ["清單沒記雜湊的重要檔", "z"], "△"), false);
});

test("執行環境被動過（NODE_OPTIONS、node 參數）命令列回 2；check-www 用乾淨的環境跑；收據記 node 版本（PR #67 第十二次審查）", () => {
  const { D, L } = fakeWww(), d = tmp("xq-evil-"), evil = path.join(d, "evil.cjs");
  /* 審查者的手法：--require 一支小程式，把 check-www 的 --dir 換成好的副本 */
  fs.writeFileSync(evil, "/* 測試用 */\n");
  let r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "home", "--seed", "1"], { NODE_OPTIONS: "--require " + evil });
  assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stderr, /執行環境被動過/);
  r = cp.spawnSync(process.execPath, ["--require", evil, CANARY, "--dir", D, "--list", L, "--only", "home", "--seed", "1"], { encoding: "utf8", env: env({ NODE_OPTIONS: null }) });
  assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stderr, /node 參數/);
  r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "home", "--seed", "1"], { NODE_OPTIONS: null });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.deepEqual(runtimeTaint({ NODE_OPTIONS: " " }, []), []); assert.equal(runtimeTaint({ NODE_OPTIONS: "--require x" }, []).length, 1); assert.equal(runtimeTaint({}, ["--import", "x"]).length, 1);
  const save = process.env.NODE_OPTIONS; process.env.NODE_OPTIONS = "--require " + evil; process.env.NODE_XQ_TEST = "1";
  try { const e = cleanEnv(); assert.equal(e.NODE_OPTIONS, undefined); assert.equal(e.NODE_XQ_TEST, undefined); assert.ok(e.PATH !== undefined || e.Path !== undefined) }
  finally { if (save === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = save; delete process.env.NODE_XQ_TEST }
  const x = run({ dir: D, list: L, only: "home", seed: 1, log: () => {} }); assert.equal(x.receipt.runtime.node, process.version); assert.ok(Array.isArray(x.receipt.runtime.execArgv));
  assert.match(fs.readFileSync(CANARY, "utf8"), /env: cleanEnv\(\)/, "叫 check-www 要帶乾淨的環境");
});

test("check-www 自己 --cdn 那次比的檔數要跟本機清單那次一樣，不一樣就不算 full；加 --cdn 卻讀不到正式網址回 2（PR #67 第十二次審查）", () => {
  const { D, L, M } = fakeWww(), ipa = fakeIpa(fakeApp(D)), txt = fs.readFileSync(M, "utf8"), quiet = () => {};
  const base = { pkg: ipa, list: L, cdn: OFFICIAL_CDN, readM: () => txt, mainFile: mainOf(fs.readFileSync(L)), log: quiet };
  let r = run({ ...base, selfCdn: (d, lf, c) => { const o = okCdn(d, lf, c); return { ...o, stdout: String(o.stdout).replace(/比了 \d+ 個檔/, "比了 0 個檔") } } });
  assert.equal(r.receipt.full, false, "--cdn 那條路少比了也回 0，不能算 full"); assert.equal(r.receipt.cdnViaCheck.n, 0);
  r = run({ ...base, selfCdn: () => ({ status: 0, stdout: "", stderr: "" }) }); assert.equal(r.receipt.full, false, "看不到比了幾個檔");
  const d = tmp("xq-nocdn2-"); fs.writeFileSync(path.join(d, "check-www.js"), fs.readFileSync(CHECK, "utf8").replace(/^const OFFICIAL_CDN = .*$/m, 'const OFFICIAL_CDN = "http://x.invalid/m.json";')); fs.copyFileSync(CANARY, path.join(d, "canary-www.js")); fs.copyFileSync(path.join(HERE, ".www-files.json"), path.join(d, ".www-files.json"));
  const c = runCanary(path.join(d, "canary-www.js"), ["--dir", D, "--list", L, "--cdn"]); assert.equal(c.status, 2, c.stdout + c.stderr); assert.match(c.stderr, /讀不到 check-www\.js 裡的正式 CDN 網址/);
});

test("比對錯誤訊息要精確：檔名是另一個檔名的前段不算抓到；控制字元 U+1 不被 U+1f 那行當成抓到（PR #67 第十二次審查）", () => {
  assert.equal(hit("✘ 少了 park3d.json", "少了 park3d.js", "✘"), false);
  assert.equal(hit("✘ 少了 park3d.js", "少了 park3d.js", "✘"), true);
  assert.equal(hit("✘ 少了 park3d.js\n✘ 少了 park3d.json", "少了 park3d.js", "✘"), true);
  assert.equal(hit("✘ core.js 有控制字元 U+1f", "core.js 有控制字元 U+1", "✘"), false);
  assert.equal(hit("△ App 會要的檔有 2 個沒跟 CDN 比到（CDN 清單沒有、或沒記雜湊）：data/a.webp、data/b.webp", ["沒跟 CDN 比到", "data/a.webp"], "△"), true);
  assert.equal(hit("△ …沒跟 CDN 比到（…）：data/a.webpx", ["沒跟 CDN 比到", "data/a.webp"], "△"), false);
  /* 實際做：check-www 只對 park3d.js 不報「少了」，假 www 多放 park3d.json（也拿掉） */
  const { D, L } = fakeWww(); const LJ = JSON.parse(fs.readFileSync(L, "utf8")); fs.writeFileSync(path.join(D, "park3d.json"), "{}"); LJ.files["park3d.json"] = [2, null]; fs.writeFileSync(L, JSON.stringify(LJ));
  const C = blindCanary('if (!exists(rel)) bad.push("少了 " + rel);', 'if (!exists(rel) && rel !== "park3d.js") bad.push("少了 " + rel);');
  const r = runCanary(C, ["--dir", D, "--list", L, "--only", "listmiss", "--seed", "1"]); assert.equal(r.status, 4, r.stdout + r.stderr);
});

test("說明裡寫的壞樣本種數跟實際一樣（verify.yml、這支測試的開頭、REBUILD.md）（PR #67 第十二次審查）", () => {
  const n = Object.keys(KINDS).length, REPO = path.join(HERE, "..", "..", "..");
  for (const [f, re] of [[path.join(REPO, ".github", "workflows", "verify.yml"), /做 (\d+) 種壞樣本/], [__filename, /；(\d+) 種壞樣本都要被抓到/], [path.join(HERE, "..", "REBUILD.md"), /在副本上做 (\d+) 種壞樣本/]]) {
    const m = re.exec(fs.readFileSync(f, "utf8")); assert.ok(m, f + " 要寫種數"); assert.equal(Number(m[1]), n, path.basename(f) + " 寫 " + m[1] + " 種，實際 " + n + " 種");
  }
});

test("標籤中間隔了換行（真包的寫法）也做得出 cmtcap 壞樣本，而且被抓到（PR #67 第十二次審查）", () => {
  const { D, L } = fakeWww(), p = path.join(D, "index.html"), h = fs.readFileSync(p, "utf8").replace('</script><script src="native-bridge.js">', '</script>\n<script src="native-bridge.js">');
  fs.writeFileSync(p, h); const LJ = JSON.parse(fs.readFileSync(L, "utf8")); LJ.files["index.html"] = [Buffer.byteLength(h), sha1(Buffer.from(h))]; fs.writeFileSync(L, JSON.stringify(LJ));
  const r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "cmtcap", "--seed", "1"]); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /✔ cmtcap：index\.html/);
});

test("W30：大於 20 MB、記了雜湊的檔每個種子都全測（不只最大的兩個）；只對 20～30 MB 放水，金絲雀要回 4（PR #67 第十三次審查）", () => {
  const { D, L } = fakeWww(), LJ = JSON.parse(fs.readFileSync(L, "utf8")), MB = 1048576;
  /* 跟真包一樣：最大的兩個（nnue、gmgames）之外，還有三個 21～26 MB 的 tour-*.json */
  const big = [["engine/pikafish.nnue", 40 * MB], ["data/gmgames.json", 33 * MB], ["data/tour-a.json", 26 * MB], ["data/tour-b.json", 24 * MB], ["data/tour-c.json", 21 * MB]];
  for (const [rel, n] of big) { const b = Buffer.alloc(n, rel.length); fs.writeFileSync(path.join(D, ...rel.split("/")), b); LJ.files[rel] = [n, sha1(b)] }
  fs.writeFileSync(L, JSON.stringify(LJ));
  for (const seed of ["1", "2", "3"]) {
    const out = path.join(tmp("xq-w30-"), "r.json"), r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "swap,nohash", "--seed", seed, "--out", out]);
    assert.equal(r.status, 0, r.stdout + r.stderr);
    const R = JSON.parse(fs.readFileSync(out, "utf8"));
    for (const k of ["swap", "nohash"]) for (const [rel] of big) assert.ok(R.results.some((x) => x.kind === k && x.file === rel), k + "（種子 " + seed + "）要測到 " + rel);
  }
  for (const [kind, from, to] of [["swap", "    else if (h && crypto", "    else if (h && !(sz > 20 * 1048576 && sz < 30 * 1048576) && crypto"], ["nohash", "|| sz > 20 * 1048576)) noHash.push(rel);", "|| sz >= 30 * 1048576)) noHash.push(rel);"]]) {
    const C = blindCanary(from, to), r = runCanary(C, ["--dir", D, "--list", L, "--only", kind, "--seed", "1"]);
    assert.equal(r.status, 4, kind + " 只對 20～30 MB 放水：" + r.stdout + r.stderr);
  }
});

test("check-www、canary-www：不是 -- 開頭、也不是參數值的多餘參數（-cdn、—cdn、cdn）直接報錯（PR #67 第十三次審查）", () => {
  const { D, L } = fakeWww();
  for (const x of ["-cdn", "—cdn", "cdn"]) {
    const r = runCheck(D, L, x); assert.equal(r.status, 1, x + "：" + r.stdout + r.stderr); assert.match(r.stderr, /不認得的參數/);
    assert.equal(runCanary(CANARY, ["--dir", D, "--list", L, x]).status, 2, "金絲雀 " + x);
  }
  assert.equal(runCheck(D, L).status, 0, "參數值（--dir、--list 後面那個）照樣認得");
});

test("casedir：目錄名改成不同大小寫，首頁素材、背景音樂、清單其他檔的目錄都測到；在 Linux 也成立（PR #67 第十三次審查）", () => {
  const { D, L } = fakeWww(), out = path.join(tmp("xq-cdir-"), "r.json");
  const r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "casedir", "--seed", "1", "--out", out]); assert.equal(r.status, 0, r.stdout + r.stderr);
  const files = JSON.parse(fs.readFileSync(out, "utf8")).results.map((x) => x.file);
  for (const t of ["p", "b", "l"]) assert.ok(files.some((f) => f.endsWith("|" + t)), "要測到 " + t + " 類目錄");
  assert.ok(files.some((f) => f.startsWith("data/homemap|")), "首頁素材的目錄");
});

test("swap 每次都測 index.html、核心程式、根目錄程式檔；只對它們放水金絲雀要回 4；git 不認 replace 物件、收據記 git／unzip 路徑（PR #67 第十四次審查）", () => {
  for (const [nm, to] of [["index.html", '    else if (h && rel !== "index.html" && crypto'], ["core.js", '    else if (h && rel !== "core.js" && crypto'], ["park3d.js", '    else if (h && rel !== "park3d.js" && crypto']]) for (const seed of ["1", "2"]) {
    const { D, L } = fakeWww(), C = blindCanary("    else if (h && crypto", to), out = path.join(tmp("xq-swapfix-"), "r.json");
    const r = runCanary(C, ["--dir", D, "--list", L, "--only", "swap", "--seed", seed, "--out", out]); assert.equal(r.status, 4, nm + "（種子 " + seed + "）：" + r.stdout + r.stderr);
    assert.ok(JSON.parse(fs.readFileSync(out, "utf8")).results.some((x) => x.file === nm && !x.caught), nm + " 要被測到、而且判成沒抓到");
  }
  const src = fs.readFileSync(CANARY, "utf8");
  assert.match(src, /\["--no-replace-objects", \.\.\.args\]/); assert.doesNotMatch(src, /spawnSync\("git"(?!, \["--no-replace-objects")/, "叫 git 都要經過 GIT()");
  const { D, L } = fakeWww(), x = run({ dir: D, list: L, only: "home", seed: 1, log: () => {} });
  assert.ok("git" in x.receipt.runtime && "unzip" in x.receipt.runtime);
});

test("每一次檢查都在一樣形狀的副本路徑上跑：check-www 只對 .app/public（或 public、或真包路徑）失靈，金絲雀要回 4（PR #67 第十五次審查）", () => {
  for (const to of ['if (/\\.app[\\\\/]public$/.test(ROOT)) { console.log("✔ 沒問題"); process.exit(0) }', 'if (/[\\\\/]public$/.test(ROOT)) { console.log("✔ 沒問題"); process.exit(0) }']) {
    const { D, L } = fakeWww(), A = fakeApp(D);
    const C = blindCanary('if (!fs.existsSync(ROOT)) { console.error("✘ 找不到 " + ROOT); process.exit(1); }', 'if (!fs.existsSync(ROOT)) { console.error("✘ 找不到 " + ROOT); process.exit(1); } ' + to);
    fs.rmSync(path.join(A, "public", "data", "home", "qin.webp"));   /* 真包是壞的 */
    const r = runCanary(C, ["--pkg", A, "--list", L, "--only", "home,listmiss", "--seed", "1"]);
    assert.notEqual(r.status, 0, "壞掉的真包不能被放行：" + to + "\n" + r.stdout + r.stderr);
    assert.equal(r.status, 4, "每個壞樣本也走同樣形狀的路徑，要判出失靈：" + r.stdout + r.stderr);
  }
  const src = fs.readFileSync(CANARY, "utf8");
  assert.match(src, /const pre = check\(cleanD, LF, null\)/); assert.match(src, /const clean = check\(cleanD, LF, cdnFile\)/);
  assert.doesNotMatch(src, /path\.join\(base, tag\)/, "壞樣本路徑不能帶種類名稱");
});

test("在 base-guard 的環境（NODE_OPTIONS=--require assert-count.cjs）下跑這支自我測試，叫金絲雀照樣不會被判成環境被動過（PR #67 第十六次審查①）", () => {
  const { D, L } = fakeWww(), save = process.env.NODE_OPTIONS;
  const AC = path.join(HERE, "..", "..", "..", ".github", "scripts", "assert-count.cjs");
  process.env.NODE_OPTIONS = ((save || "") + " --require " + AC).trim();
  try { const r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "home", "--seed", "1"]); assert.equal(r.status, 0, r.stdout + r.stderr) }
  finally { if (save === undefined) delete process.env.NODE_OPTIONS; else process.env.NODE_OPTIONS = save }
  const bg = fs.readFileSync(path.join(HERE, "..", "..", "..", ".github", "scripts", "base-guard.cjs"), "utf8");
  assert.match(bg, /NODE_OPTIONS: \(\(process\.env\.NODE_OPTIONS \|\| ""\) \+ " --require "/, "base-guard 的 assertEnv 還是這樣帶 NODE_OPTIONS（改了就要重看這項）");
});

test("乾淨的那次在中間和最後各用全新副本再跑一次；check-www 只有第一次放水（看順序）時判成失靈（PR #67 第十六次審查②）", () => {
  const { D, L } = fakeWww(), out = path.join(tmp("xq-again-"), "r.json");
  const r = runCanary(CANARY, ["--dir", D, "--list", L, "--only", "home,mani", "--seed", "3", "--out", out]); assert.equal(r.status, 0, r.stdout + r.stderr);
  const R = JSON.parse(fs.readFileSync(out, "utf8")); assert.deepEqual(R.results.filter((x) => x.kind === "(乾淨重跑)").map((x) => x.file).sort(), ["中間", "最後"].sort());
  /* 審查的攻擊：真包是壞的；改壞的 check-www 用記號檔記「跑過幾次」，最前面兩次（乾淨那次）說謊回 ✔，之後照實檢查——
     壞樣本都抓得到，沒有乾淨重跑的話會回 0、放行壞真包；有乾淨重跑就判失靈（4） */
  fs.rmSync(path.join(D, "data", "home", "qin.webp"));
  const mark = path.join(tmp("xq-mark-"), "n");
  const C = blindCanary('if (!fs.existsSync(ROOT)) { console.error("✘ 找不到 " + ROOT); process.exit(1); }', 'if (!fs.existsSync(ROOT)) { console.error("✘ 找不到 " + ROOT); process.exit(1); } { const M = ' + JSON.stringify(mark) + '; const n = fs.existsSync(M) ? +fs.readFileSync(M, "utf8") : 0; fs.writeFileSync(M, String(n + 1)); if (n < 2) { console.log("✔ 沒問題"); process.exit(0) } }');
  const r2 = runCanary(C, ["--dir", D, "--list", L, "--only", "home", "--seed", "3"]); assert.equal(r2.status, 4, r2.stdout + r2.stderr); assert.match(r2.stdout, /✘ 乾淨的再跑一次/);
  const src = fs.readFileSync(CANARY, "utf8"); assert.match(src, /fs\.mkdtempSync\(path\.join\(tmp, "xq-"\)\)/, "每次檢查各自 mkdtemp");
});

test("always 丟例外不當掉；.ipa 解不開不留暫存（PR #67 第十六次審查③④）", () => {
  const { D, L } = fakeWww(); fs.rmSync(path.join(D, "data", "preload.json"));
  const C = blindCanary('bad.push("讀不到 data/preload.json：" + e.message);', "{}");   /* 失靈的 check-www：preload 讀不到也不報，乾淨那次就會過 */
  const r = runCanary(C, ["--dir", D, "--list", L, "--only", "rmdir,casedir", "--seed", "1"]); assert.notEqual(r.status, 1, "不能當掉回 1：" + r.stdout + r.stderr);
  const T = tmp("xq-ipatmp-"), bad = path.join(tmp("xq-badipa-"), "x.ipa"); fs.writeFileSync(bad, "不是 zip");
  const x = run({ pkg: bad, list: L, tmp: T, log: () => {} }); assert.equal(x.code, 2); assert.deepEqual(fs.readdirSync(T).filter((n) => n.startsWith("xq-canary-ipa-")), [], "解不開時暫存要清掉");
});
