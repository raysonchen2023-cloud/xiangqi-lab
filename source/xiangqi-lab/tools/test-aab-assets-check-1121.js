// W41①（11/21）：送審前的安裝包內容檢查 xiangqi-android/scripts/check-aab-assets.js
//   封測 P0-IMG（大破圖）兩次都是「程式碼沒錯、安裝包壞掉」：W21 安裝包缺素材且原生不會補抓；W30 CDN 切塊大檔原生接不回。
//   這支用假 AAB 重現這幾種成品，確認檢查會亮紅燈、正常包會綠燈。反測必紅：用有問題的成品測，抓不到就是放水。
//   全部用假 AAB（不壓縮 ZIP），不連網（不加 --cdn）、不開模擬器。用法：node --test xiangqi-lab/tools/test-aab-assets-check-1121.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process"), crypto = require("crypto"), zlib = require("zlib");
const AND = path.join(__dirname, "..", "..", "xiangqi-android", "scripts");
const CHECK = path.join(AND, "check-aab-assets.js");
const { required: HOME } = require(path.join(AND, "bundle-home-assets.js"));
const sha8 = s => crypto.createHash("sha1").update(s).digest("hex").slice(0, 8);
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });

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

/* 假 AAB：dex＝原生帶的特徵字串；home＝要不要放首頁離線必要素材；x＝data/a/x.webp 的內容（null＝不放進包）；gm＝大檔放不放進包 */
function aab({ dex = [], home = true, x = "abc", gm = false }) {
  const P = "base/assets/public/";
  const preload = { v: "t", items: [["data/a/x.webp", 3, sha8("abc"), 1], ["data/a/y.json", 2, sha8("{}"), 1]], big: [["data/gm.json", 30 * 1024 * 1024, sha8("[]")]], pages: {} };
  const f = {
    [P + "native-build.json"]: JSON.stringify({ siteVersion: "20261121-0000", sharedWebCommit: "0".repeat(40) }),
    [P + "data/preload.json"]: JSON.stringify(preload),
    [P + "data/big-books.json"]: "[]",
    "base/dex/classes.dex": "dex\n035\0" + dex.join("\0") + "\0",
  };
  if (home) for (const h of HOME) f[P + "data/" + h] = "w";
  if (x != null) f[P + "data/a/x.webp"] = x;
  if (gm) f[P + "data/gm.json"] = "[]";
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-aabt-")); made.push(d);
  const file = path.join(d, "t.aab"); fs.writeFileSync(file, zip(f)); return file;
}
const run = file => cp.spawnSync(process.execPath, [CHECK, "--aab", file], { encoding: "utf8" });
/* 26112103 起（W30）的 dex 四個字串都有；26112102 只有前兩個（.parts.json 來自一起打包的 XQOfflineAssets），11/21 從真的 AAB 量出來的 */
const W30 = ["X-XQ-Cdn-Cache", ".parts.json", "[A-Za-z0-9._-]+", "SHA-1"];
const W29 = ["X-XQ-Cdn-Cache", ".parts.json"];
const { exitCode, PARTS_MARKER } = require(CHECK);

test("正常的小包（CDN 補抓＋切塊接回、首頁素材隨包、指紋一致）→ 綠燈", () => {
  const r = run(aab({ dex: W30 }));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /CDN 補抓 有｜切塊接回 有/);
  assert.match(r.stdout, /✔ 安裝包本身沒有問題/);
});

test("W21 型（1406）：原生不會補抓、首頁素材沒隨包、圖片不在包裡 → 紅燈，圖片算破、JSON 只警告", () => {
  const r = run(aab({ dex: [], home: false, x: null }));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`✘ ${HOME.length} 項｜首頁離線必要素材不在安裝包裡`));
  assert.match(r.stdout, /✘ 1 項｜不在安裝包裡，原生又不會向 CDN 補抓：圖片／音樂直接破（W21）\n    例：data\/a\/x\.webp/);
  assert.match(r.stdout, /✘ 1 項｜CDN 上切塊的大檔不在安裝包裡，原生也不會補抓/);
  assert.match(r.stdout, /△ 1 項｜不在安裝包裡、原生不會補抓；網頁程式會自己改抓 CDN\n    例：data\/a\/y\.json/);
});

test("W30 型（26112102）：有 CDN 補抓、dex 也有 .parts.json（來自 XQOfflineAssets），但沒有切塊接回 → 大檔不在包裡要紅燈", () => {
  const r = run(aab({ dex: W29 }));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /CDN 補抓 有｜切塊接回 沒有/);
  assert.match(r.stdout, /✘ 1 項｜CDN 上切塊的大檔不在安裝包裡，原生補抓不會接回切塊（W30）\n    例：data\/gm\.json/);
});

test("11/21 反測抓到的誤放行：小包帶著全離線版的 XQOfflineAssets，大檔不在包裡仍要紅燈", () => {
  const r = run(aab({ dex: ["X-XQ-Cdn-Cache", "xq-offline.json"] }));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, /CDN 上切塊的大檔不在安裝包裡，原生補抓不會接回切塊（W30）/);
});

test("舊檔：安裝包裡的素材跟清單指紋不符 → 紅燈並列出兩邊的 SHA-1", () => {
  const r = run(aab({ dex: W30, x: "abd" }));
  assert.equal(r.status, 1, r.stdout + r.stderr);
  assert.match(r.stdout, new RegExp(`✘ 1 項｜安裝包裡的檔跟清單不符（SHA-1 前 8 碼 ${sha8("abd")}，清單 ${sha8("abc")}）`));
});

test("PR #11 審查：通用字串只出現一部分不算切塊接回；原生加了專用標記就直接認", () => {
  for (const dex of [["X-XQ-Cdn-Cache", "[A-Za-z0-9._-]+"], ["X-XQ-Cdn-Cache", ".parts.json", "[A-Za-z0-9._-]+"]]) {
    const r = run(aab({ dex }));
    assert.equal(r.status, 1, dex.join("、") + "\n" + r.stdout);
    assert.match(r.stdout, /切塊接回 沒有/);
  }
  const ok = run(aab({ dex: ["X-XQ-Cdn-Cache", PARTS_MARKER] }));
  assert.equal(ok.status, 0, ok.stdout + ok.stderr);
  assert.match(ok.stdout, /切塊接回 有/);
});

test("PR #11 審查：缺驗不能送審——結束代碼 有 ✘＝1、加 --cdn 有沒確認到的＝3、沒加 --cdn 不算缺驗＝0，並提醒要加 --cdn", () => {
  assert.equal(exitCode({ red: 2, unknown: 5, cdn: true }), 1);
  assert.equal(exitCode({ red: 0, unknown: 1, cdn: true }), 3);
  assert.equal(exitCode({ red: 0, unknown: 0, cdn: true }), 0);
  assert.equal(exitCode({ red: 0, unknown: 0, cdn: false }), 0);
  const r = run(aab({ dex: W30 }));
  assert.match(r.stdout, /送審前還要加 --cdn 核對 CDN（P0-IMG 通過條件＝--cdn 且結束代碼 0）/);
});

test("大檔放進包裡（全離線版）就不需要切塊接回 → 綠燈", () => {
  const r = run(aab({ dex: [], gm: true }));
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

/* W66c（11/26 #221 審查發現，main 本來就有的缺口）：主流程把 CDN 的 404／410 推進 R.red（realMiss 那一行），刪掉或改錯原本沒有測試會紅。
   這一項真的跑整支工具（加 --cdn），用 --require 把 fetch 換成假的 CDN（不連網）：圖片 data/a/x.webp 不在包裡、CDN 回 404，要算 ✘、結束代碼 1；
   對照組 CDN 回 200 時，報告的 redItems 不能有它。改壞驗證：把 realMiss 那行改成不推進 R.red，同一組檢查一定抓得到。 */
function cdnRun(tool, plan) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-w66c-")); made.push(d);
  const stub = path.join(d, "fake-cdn.js"), out = path.join(d, "out.json");
  fs.writeFileSync(stub, `const plan = ${JSON.stringify(plan)};
globalThis.fetch = async (url) => { const u = new URL(String(url)).pathname.slice(1); let st = 200;
  for (const k in plan) if (u === k || u === k + ".parts.json") st = plan[k];
  if (u.includes("__xq_p0_canary_")) st = 404;
  return { status: st, ok: st === 200, json: async () => { throw new Error("假 CDN 不給 JSON") }, text: async () => "" } };\n`);
  const r = cp.spawnSync(process.execPath, ["--require", stub, tool, "--aab", aab({ dex: W30, x: null }), "--cdn", "--out", out], { encoding: "utf8" });
  return { status: r.status, log: r.stdout + r.stderr, rep: fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf8")) : null };
}
function mainMissProblems(tool) {
  const bad = [], miss = cdnRun(tool, { "data/a/x.webp": 404 }), ok = cdnRun(tool, {});
  /* 假 CDN 或工具本身當掉也會回 1，所以先確認兩次都真的跑完、寫出報告 */
  for (const [nm, r] of [["CDN 回 404", miss], ["對照組", ok]]) if (!r.rep || !/金絲雀：/.test(r.log)) bad.push(nm + "：工具要真的跑完並寫出報告（" + r.log.slice(0, 200) + "）");
  if (miss.status !== 1) bad.push("CDN 回 404：結束代碼要是 1（實際 " + miss.status + "）");
  if (!miss.rep || !miss.rep.redItems.some((x) => x.f === "data/a/x.webp" && /CDN 上沒有（HTTP 404）/.test(x.why))) bad.push("CDN 回 404：報告的 redItems 要有 data/a/x.webp");
  if (!/✘ 1 項｜CDN 上沒有（HTTP 404）/.test(miss.log)) bad.push("CDN 回 404：畫面要印 ✘");
  if (!ok.rep || ok.rep.redItems.some((x) => x.f === "data/a/x.webp")) bad.push("對照組 CDN 回 200：redItems 不能有 data/a/x.webp");
  if (miss.rep && miss.rep.redItems.some((x) => /__xq_p0_canary_/.test(x.f))) bad.push("金絲雀探測檔不能算進 redItems");
  return bad;
}
test("W66c：加 --cdn 跑整支工具，CDN 回 404 的圖要算 ✘、結束代碼 1；改壞驗證：主流程不把 404 推進 R.red 一定抓得到", () => {
  assert.deepEqual(mainMissProblems(CHECK), []);
  const src = fs.readFileSync(CHECK, "utf8"), line = "R.red.push(...realMiss);";
  assert.equal(src.split(line).length, 2, "找得到 realMiss 那一行");
  const mut = path.join(AND, ".w66c-mut-" + crypto.randomBytes(4).toString("hex") + ".js");
  try { fs.writeFileSync(mut, src.replace(line, "void realMiss;")); assert.ok(mainMissProblems(mut).some((s) => s.includes("redItems 要有")), "改壞（404 沒推進 R.red）要被抓到") }
  finally { fs.rmSync(mut, { force: true }) }
});
