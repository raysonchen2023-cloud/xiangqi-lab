// iOS P0-IMG 金絲雀 canary-www.js 與 check-www.js 的自我測試（AGENTS.md「P0 出口驗證要難作假」，2026-11-23）
//   在暫存資料夾做一個小的假 www（index.html、preload、背景音樂、引擎、大檔、清單），用真的 check-www.js 檢查：
//   乾淨的要全過；6 種壞樣本都要被抓到；再把 check-www.js 的判斷一條一條改壞（放在副本），金絲雀要回 4（檢查失靈）。
// 用法：node --test source/xiangqi-ios/scripts/test-canary-www.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path"), crypto = require("crypto"), cp = require("child_process");
const HERE = __dirname, CHECK = path.join(HERE, "check-www.js"), CANARY = path.join(HERE, "canary-www.js");
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });
const tmp = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); made.push(d); return d };
const sha1 = (b) => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);

/* 假 www：每個檔都進清單（小檔記 sha1、大檔不記），結構跟 copy-www.js 產生的一樣 */
function fakeWww() {
  const D = tmp("xq-fakewww-"), files = {};
  const put = (rel, body, withSha = true) => { const p = path.join(D, ...rel.split("/")); fs.mkdirSync(path.dirname(p), { recursive: true }); const b = Buffer.isBuffer(body) ? body : Buffer.from(body); fs.writeFileSync(p, b); files[rel] = [b.length, withSha ? sha1(b) : null] };
  put("index.html", '<!doctype html><meta charset="utf-8"><script src="capacitor.js"></script><script src="native-bridge.js"></script><script src="core.js"></script><body>象棋千秋</body>\n');
  for (const f of ["capacitor.js", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js", "zh.js"]) put(f, "/* " + f + " */\nvar x = 1;\n");
  put("data/home/han.webp", Buffer.alloc(300, 7));
  put("data/home/qin.webp", Buffer.alloc(200, 9));
  put("data/preload.json", JSON.stringify({ items: [["data/home/han.webp", 300], ["data/home/qin.webp", 200]], big: [] }));
  put("data/big-books.json", "[]");
  put("data/bgm/index.json", JSON.stringify({ han: ["zheng_1.mp3", "zheng_2.mp3"] }));
  put("data/bgm/han/zheng_1.mp3", Buffer.alloc(400, 1)); put("data/bgm/han/zheng_2.mp3", Buffer.alloc(420, 2));
  put("engine/pikafish.js", "var Pikafish = 1;\n"); put("engine/pikafish.wasm", Buffer.alloc(500, 3)); put("engine/pikafish.nnue", Buffer.alloc(600, 4), false);
  put("data/gmgames.json", Buffer.alloc(5000, 5), false);   /* 最大的檔，沒記 sha1（照 copy-www.js：大檔不算 sha1） */
  const L = path.join(tmp("xq-fakelist-"), ".www-files.json");
  fs.writeFileSync(L, JSON.stringify({ commit: "test", siteVersion: "test", files }, null, 1));
  return { D, L };
}
const runCheck = (dir, list, checker = CHECK) => cp.spawnSync(process.execPath, [checker, "--dir", dir, "--list", list], { encoding: "utf8" });

test("check-www.js：乾淨的假 www 全過；同樣大小、內容被換掉的檔會被抓到（W69 新增的內容比對）", () => {
  const { D, L } = fakeWww();
  let r = runCheck(D, L); assert.equal(r.status, 0, r.stdout + r.stderr); assert.match(r.stdout, /✔ 沒問題/);
  const p = path.join(D, "zh.js"), b = fs.readFileSync(p); b[3] ^= 0xff; fs.writeFileSync(p, b);
  r = runCheck(D, L); assert.equal(r.status, 1); assert.match(r.stderr, /內容跟清單不同 zh\.js/);
});

test("canary-www.js：6 種壞樣本都被抓到，收據記下每一種、檢查工具的雜湊、樣本的 index.html 雜湊；不會改到原本那份", () => {
  const { D, L } = fakeWww();
  const before = fs.readdirSync(D, { recursive: true }).sort().join("|"), idx = fs.readFileSync(path.join(D, "index.html"));
  const out = path.join(tmp("xq-canaryout-"), "r.json");
  const r = cp.spawnSync(process.execPath, [CANARY, "--dir", D, "--list", L, "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.pass, true); assert.equal(R.full, true); assert.equal(R.platform, "ios");
  assert.deepEqual(R.results.map((x) => x.kind), ["home", "bgm", "engine", "big", "swap", "bridge"]);
  const by = Object.fromEntries(R.results.map((x) => [x.kind, x]));
  assert.equal(by.home.file, "data/home/han.webp"); assert.equal(by.bgm.file, "data/bgm/han/zheng_1.mp3");
  assert.equal(by.engine.file, "engine/pikafish.nnue"); assert.equal(by.big.file, "data/gmgames.json", "最大的檔，不挑引擎檔");
  for (const x of R.results) { assert.equal(x.caught, true, x.kind); assert.equal(x.exit, 1, x.kind) }
  assert.equal(R.toolPins["source/xiangqi-ios/scripts/check-www.js"], crypto.createHash("sha256").update(fs.readFileSync(CHECK)).digest("hex"));
  assert.equal(R.sample.indexSha256, crypto.createHash("sha256").update(idx).digest("hex"));
  assert.equal(fs.readdirSync(D, { recursive: true }).sort().join("|"), before, "原本那份一個檔都沒少");
  assert.ok(fs.readFileSync(path.join(D, "index.html")).equals(idx), "原本那份的 index.html 沒被改");
});

/* 把 check-www.js 的某一條判斷改壞（放在副本旁邊，用同一個金絲雀流程），金絲雀要判出「檢查失靈」 */
function blindChecker(from, to) {
  const d = tmp("xq-blind-"), s = fs.readFileSync(CHECK, "utf8");
  assert.ok(s.includes(from), "測試要改的那一行還在：" + from.slice(0, 40));
  fs.writeFileSync(path.join(d, "check-www.js"), s.replace(from, to)); fs.copyFileSync(CANARY, path.join(d, "canary-www.js"));
  fs.copyFileSync(path.join(HERE, ".www-files.json"), path.join(d, ".www-files.json"));
  return path.join(d, "canary-www.js");
}
test("check-www.js 的判斷一條一條改壞：金絲雀回 4，指出是哪一種沒抓到", () => {
  const cases = [
    ["home", 'if (!exists(it[0])) bad.push("preload.json 列了但沒有：" + it[0]);', "if (false) {}"],
    ["bgm", 'if (!exists(r)) bad.push("背景音樂清單有但沒有檔：" + r);', "if (false) {}"],
    ["engine", 'if (!exists(f)) bad.push("缺引擎 " + f);', "if (false) {}"],
    ["big", 'else if (size(rel) !== sz) bad.push("大小不對 " + rel);', "else if (false) {}"],
    ["swap", '!== h) bad.push("內容跟清單不同 " + rel);', '!== h && false) bad.push("內容跟清單不同 " + rel);'],
    ["bridge", 'else if (!(iCap < iBr && (iCore < 0 || iBr < iCore))) bad.push(', "else if (false) bad.push("],
  ];
  for (const [kind, from, to] of cases) {
    const { D, L } = fakeWww(), C = blindChecker(from, to);
    const r = cp.spawnSync(process.execPath, [C, "--dir", D, "--list", L], { encoding: "utf8" });
    assert.equal(r.status, 4, kind + "：" + r.stdout + r.stderr);
    assert.match(r.stdout, new RegExp("✘ " + kind + "："), kind + " 要被列成沒抓到");
    assert.match(r.stdout, /檢查本身失靈/);
  }
});

test("測試不成立回 2：找不到 www、乾淨的就沒過、清單讀不到、不認得的壞樣本", () => {
  const { D, L } = fakeWww(), run = (...a) => cp.spawnSync(process.execPath, [CANARY, ...a], { encoding: "utf8" });
  assert.equal(run("--dir", path.join(D, "沒有"), "--list", L).status, 2);
  assert.equal(run("--dir", D, "--list", path.join(D, "沒有.json")).status, 2);
  assert.equal(run("--dir", D, "--list", L, "--only", "home,亂寫").status, 2);
  fs.rmSync(path.join(D, "data", "home", "qin.webp"));
  const r = run("--dir", D, "--list", L); assert.equal(r.status, 2); assert.match(r.stderr, /乾淨的樣本沒過/);
});

test("只跑部分壞樣本（--only）：收據 full＝false，送審不能用", () => {
  const { D, L } = fakeWww(), out = path.join(tmp("xq-canaryout-"), "r.json");
  const r = cp.spawnSync(process.execPath, [CANARY, "--dir", D, "--list", L, "--only", "home", "--out", out], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stdout + r.stderr); const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.full, false); assert.match(r.stdout, /只跑部分，送審不能用/);
});
