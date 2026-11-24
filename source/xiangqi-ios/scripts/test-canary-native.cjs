// iOS 原生檢查金絲雀 canary-native.js 的自我測試（AGENTS.md「P0 出口驗證要難作假」，2026-11-23）
//   乾淨的副本要全過、每個壞樣本都要被抓到；再把 check-native.js 的判斷一條一條改成恆真（放在整份副本裡），對應的壞樣本要回 4（檢查失靈）。
// 用法：node --test source/xiangqi-ios/scripts/test-canary-native.cjs
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const HERE = __dirname, IOS = path.join(HERE, ".."), REPO = path.join(IOS, "..", "..");
const CHECK = path.join(HERE, "check-native.js"), CANARY = path.join(HERE, "canary-native.js");
const { KINDS, exitOf, toolSha, run } = require("./canary-native.js");
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });
const tmp = (p) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), p)); made.push(d); return d };
const runCanary = (canary, args = []) => cp.spawnSync(process.execPath, [canary, ...args], { encoding: "utf8" });

/* 整份副本（跟金絲雀一樣：source/xiangqi-ios 不含 node_modules，加上 check-native 讀的兩支網頁檔），回傳副本裡的 canary-native.js */
function repoCopy() {
  const R = tmp("xq-cnrepo-");
  fs.cpSync(IOS, path.join(R, "source", "xiangqi-ios"), { recursive: true, filter: (s) => !/[\\/](node_modules|Pods|DerivedData|build)([\\/]|$)/.test(path.relative(IOS, s)) });
  for (const f of ["source/xiangqi-db/m/07gc-native.js", "source/xiangqi-db/m/01-board.js"]) { const a = path.join(REPO, ...f.split("/")); if (fs.existsSync(a)) { const b = path.join(R, ...f.split("/")); fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b) } }
  return { R, canary: path.join(R, "source", "xiangqi-ios", "scripts", "canary-native.js"), check: path.join(R, "source", "xiangqi-ios", "scripts", "check-native.js") };
}

test("乾淨的全過、每一種壞樣本都被 check-native.js 抓到；收據記兩支工具的雜湊", () => {
  const out = path.join(tmp("xq-cnout-"), "r.json"), r = runCanary(CANARY, ["--out", out]);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const R = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(R.pass, true); assert.equal(R.code, 0); assert.equal(R.full, true);
  assert.deepEqual(R.kinds, Object.keys(KINDS));
  for (const x of R.results) { assert.equal(x.caught, true, x.kind); assert.equal(x.exit, 1, x.kind) }
  assert.equal(R.toolPins["source/xiangqi-ios/scripts/check-native.js"], toolSha(CHECK));
  assert.ok(Object.keys(KINDS).length >= 70, "壞樣本至少 70 種");
});

/* check-native 裡每一條「check(條件, "訊息…")」：找到訊息裡有某個壞樣本 expect 的那一行，把條件改成恆真 */
function blindLine(src, expect) {
  const lines = src.split("\n"), hits = lines.map((l, i) => [l, i]).filter(([l]) => /^\s*check\(/.test(l) && l.includes(JSON.stringify(expect).slice(1, -1)));
  return hits.map(([, i]) => i);
}
test("check-native.js 每一條判斷改成恆真，對應的壞樣本都要回 4（檢查失靈），不會被當成通過", () => {
  const { canary, check } = repoCopy(), orig = fs.readFileSync(check, "utf8");
  let tried = 0;
  for (const [k, K] of Object.entries(KINDS)) {
    const idx = blindLine(orig, K.expect);
    if (!idx.length) continue;   /* 訊息是組出來的（兩份相同、沒有收尾、某檔沒有控制字元）：下一項另外測 */
    const lines = orig.split("\n"); for (const i of idx) lines[i] = lines[i].replace(/^(\s*)check\(/, "$1check(true || ");
    fs.writeFileSync(check, lines.join("\n"));
    const r = runCanary(canary, ["--only", k]);
    assert.equal(r.status, 4, k + "（" + K.expect + "）改成恆真後金絲雀要回 4：" + r.stdout + r.stderr);
    assert.match(r.stdout, /check-native 本身失靈/);
    tried++;
  }
  fs.writeFileSync(check, orig);
  console.log("盲測：" + tried + " 條判斷改成恆真，都判出失靈");
  assert.ok(tried >= 55, "至少 55 條判斷有對應的壞樣本並測過（實際 " + tried + "）");
});

test("訊息是組出來的那幾條也測：兩份相同、括號沒收尾、控制字元、外掛不連網、install-native", () => {
  const { canary, check } = repoCopy(), orig = fs.readFileSync(check, "utf8");
  const cases = [
    ["copyDiff", 'else check(rd(b) === sa, f + " 兩份相同', 'else check(true, f + " 兩份相同'],
    ["brace", 'for (const [c, l] of stack) bad.push(', 'for (const [c, l] of stack) if (false) bad.push('],
    ["ctrl", "  check(!m, f + \" 沒有控制字元\");", "  check(true, f + \" 沒有控制字元\");"],
    ["gcNetwork", 'check(!/URLSession|URLRequest|https?:\\/\\//.test(c), p.file + "：沒有網路程式', 'check(true, p.file + "：沒有網路程式'],
    /* 回到 11/23 前只數 verifyNow( 次數的寫法（#127 之後的結構比對前面加一個「舊寫法成立就放行」）：「true || verifyNow(…)」、else、guard、case、區域 func、func ok() 都繞得過 */
    ...["establish", "establishElse", "establishGuard", "establishCase", "establishLocalFunc", "establishHelper"].map((k) => [k, "check(vBlocks.length >= 2 && vTok === vBlocks.length", "check(count(est, \"verifyNow(\") >= 2 && est.includes(\"return .verified\") || vBlocks.length >= 2 && vTok === vBlocks.length"]),
  ];
  for (const [k, from, to] of cases) {
    assert.ok(orig.includes(from), "測試要改的那一行還在：" + from.slice(0, 50));
    fs.writeFileSync(check, orig.replace(from, to));
    const r = runCanary(canary, ["--only", k]);
    assert.equal(r.status, 4, k + " 改壞後金絲雀要回 4：" + r.stdout + r.stderr);
  }
  fs.writeFileSync(check, orig);
});

test("測試不成立回 2：不認得的壞樣本、空的 --only、不認得的參數、參數沒給值、乾淨的副本就沒過", () => {
  assert.equal(runCanary(CANARY, ["--only", "亂寫"]).status, 2);
  assert.equal(runCanary(CANARY, ["--only", ""]).status, 2);
  assert.equal(runCanary(CANARY, ["--only", " , "]).status, 2);
  assert.equal(runCanary(CANARY, ["--olny", "port"]).status, 2);
  assert.equal(runCanary(CANARY, ["--only"]).status, 2);
  const { canary, R } = repoCopy(), p = path.join(R, "source", "xiangqi-ios", "native", "ios", "XQLoopbackServer.swift");
  fs.writeFileSync(p, fs.readFileSync(p, "utf8").replace("static let port: UInt16 = 47821", "static let port: UInt16 = 1"));
  const r = runCanary(canary, ["--only", "port"]); assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stderr, /乾淨的副本沒過/);
  assert.equal(exitOf([{ caught: true }], true), 0);
  assert.equal(exitOf([{ caught: false, unfit: true }, { caught: false }], false), 4, "失靈優先");
  assert.equal(exitOf([{ caught: false, unfit: true }], false), 2);
  const x = run({ only: "port", log: () => {} }); assert.equal(x.code, 0); assert.equal(x.receipt.full, false, "--only 不算完整");
});

test("壞樣本做失敗（要改的那段不見了）不會被當成通過：回 2", () => {
  const { canary, R } = repoCopy(), p = path.join(R, "source", "xiangqi-ios", "native", "ios", "XQBridgeViewController.swift");
  /* 把「Close other apps」改掉、check-native 那條也同步改掉（乾淨的還是全過），guidance 這個壞樣本就找不到要改的字 */
  for (const f of [p, path.join(R, "source", "xiangqi-ios", "ios", "App", "App", "XQBridgeViewController.swift")]) fs.writeFileSync(f, fs.readFileSync(f, "utf8").split("Close other apps").join("Quit other apps"));
  const c = path.join(R, "source", "xiangqi-ios", "scripts", "check-native.js"); fs.writeFileSync(c, fs.readFileSync(c, "utf8").split("Close other apps").join("Quit other apps"));
  const r = runCanary(canary, ["--only", "guidance"]); assert.equal(r.status, 2, r.stdout + r.stderr); assert.match(r.stdout, /做壞樣本失敗/);
});
