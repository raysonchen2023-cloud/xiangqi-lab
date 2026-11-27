// W190（11/27）：Android P0 開跑前的模擬器預檢 emu-ready.js 的判斷規則
//   這支不開模擬器：adb、CDP、啟動 App、重開模擬器都用假的。驗的是「怎麼判」——
//   每一項壞掉都要擋在那一項、後面不再跑；健康的不誤擋；不合格時照 --retries 重開再檢查；用法錯誤回 2。
//   實際在模擬器上「故意弄壞要擋下、正常不誤判」的驗收，由 Windows Claude 1 另外在模擬器上做（寫、驗分開）。
// 用法：node --test xiangqi-lab/tools/test-emu-ready-1127.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const AND = path.join(__dirname, "..", "..", "xiangqi-android", "scripts"), FILE = path.join(AND, "emu-ready.js");
const SRC = fs.readFileSync(FILE, "utf8");
const made = [];
test.after(() => { for (const d of made) fs.rmSync(d, { recursive: true, force: true }) });

/* 載入一份 emu-ready.js（可以先改壞）：寫到 scripts 資料夾旁邊，才 require 得到 device-guard.js、apk-bind.js */
function load(src) {
  if (src === undefined) return require(FILE);
  const f = path.join(AND, ".emu-ready-mut-" + process.pid + "-" + made.length + ".js");
  fs.writeFileSync(f, src); made.push(f);
  return require(f);
}

/* 健康的假模擬器；bad 指定要弄壞哪一項 */
function env(bad = {}, extra = {}) {
  const calls = [];
  const timeout = () => { const e = new Error("spawnSync adb ETIMEDOUT"); e.timedOut = true; return e };
  const E = {
    calls,
    adb: (args) => {
      calls.push(args.join(" "));
      const a = args.filter((x, i) => !(args[0] === "-s" && i < 2)).join(" ");
      /* 真的卡死時，get-state 還是 device，但每一個 shell 指令都逾時（11/27 用 emu avd pause 實測） */
      if (bad.shell === "timeout" && a.startsWith("shell")) throw timeout();
      if (a === "version") { if (bad.adb === "missing") throw new Error("spawnSync adb ENOENT"); if (bad.adb === "garbage") return "hello"; return "Android Debug Bridge version 1.0.41" }
      if (a === "get-state") { if (bad.online === "offline") throw new Error("error: device offline"); if (bad.online === "bootloader") return "bootloader"; return "device" }
      if (a.startsWith("shell getprop ro.")) { if (bad.emulator) return ""; return a.endsWith("ro.kernel.qemu") ? "1" : "" }
      if (a === "shell echo ok") { if (bad.shell === "timeout") throw timeout(); if (bad.shell === "weird") return "okay"; return "ok" }
      if (a === "shell getprop sys.boot_completed") { if (bad.boot) return bad.boot === "empty" ? "" : "0"; return "1" }
      if (a === "shell dumpsys webviewupdate") {
        if (bad.webview === "none") return "Current WebView Update Service state\n  Fallback logic enabled: false\n  WebView package dirty: false\n";
        if (bad.webview === "nullpkg") return "Current WebView Update Service state\n  Current WebView package (name, version): (null, null)\n";
        if (bad.webview === "fail") throw new Error("dumpsys 失敗");
        return "Current WebView Update Service state\n  Current WebView package (name, version): (com.google.android.webview, 136.0.7103.125)\n  Minimum targetSdkVersion: 33\n";
      }
      throw new Error("假 adb 不認得：" + a);
    },
    bindApk: (f) => { calls.push("bindApk " + f); return bad.apk ? { ok: false, retryable: false, msg: "APK 不是 aab-apk.json 記的那一個" } : { ok: true, msg: "手機上的 App 就是送審 AAB 產生的 APK" } },
    appStart: async () => { calls.push("appStart"); return bad.start ? { ok: false, msg: "App 開不起來（15 秒內沒有程序）" } : { ok: true, msg: "" } },
    cdpProbe: async (port, build) => { calls.push("cdp " + port + " " + build); if (bad.cdp) return { ok: false, msg: "CDP 約 60 秒內沒就緒：socket hang up" }; if (bad.build) return { ok: false, retryable: false, msg: "App 版號是 20261126-0626，不是要驗的 " + build }; return { ok: true, msg: "CDP 就緒" } },
    restart: null,
    ...extra,
  };
  return E;
}
const OPT = { serial: "emulator-5554", aabApk: "aab-apk.json", build: "20261127-1200", port: 9333, retries: 2, allowReal: false };

test("健康的模擬器：8 項全過、照順序、就緒；帶 --aab-apk 會核對 APK、帶 --build 會傳給 CDP 檢查", async () => {
  const M = load(), E = env(), R = await M.checkOnce(OPT, E);
  assert.deepEqual(R.map((r) => r.step), M.STEPS);
  assert.ok(R.every((r) => r.ok), JSON.stringify(R));
  assert.deepEqual(M.verdict(R), { ready: true, failed: null, why: "", retryable: false });
  assert.ok(E.calls.includes("bindApk aab-apk.json"));
  assert.ok(E.calls.includes("cdp 9333 20261127-1200"));
  assert.match(R.find((r) => r.step === "webview").msg, /136\.0/);
});

test("每一項單獨壞掉：擋在那一項、原因寫得出來、後面的檢查不再跑", async () => {
  const M = load();
  const CASES = [
    [{ adb: "missing" }, "adb", /adb 不能執行/], [{ adb: "garbage" }, "adb", /看不懂/],
    [{ online: "offline" }, "online", /不在線/], [{ online: "bootloader" }, "online", /不是 device/],
    [{ emulator: true }, "emulator", /不是模擬器/],
    [{ shell: "timeout" }, "shell", /15 秒內 shell 沒回應/], [{ shell: "weird" }, "shell", /不是 ok/],
    [{ boot: "0" }, "boot", /還沒開機完成/], [{ boot: "empty" }, "boot", /還沒開機完成/],
    [{ webview: "none" }, "webview", /沒有可用的 WebView/], [{ webview: "nullpkg" }, "webview", /沒有可用的 WebView/], [{ webview: "fail" }, "webview", /讀不到 WebView/],
    [{ apk: true }, "apk", /不是 aab-apk\.json 記的那一個/],
    [{ start: true }, "cdp", /App 開不起來/], [{ cdp: true }, "cdp", /socket hang up/], [{ build: true }, "cdp", /不是要驗的/],
  ];
  for (const [bad, step, why] of CASES) {
    const E = env(bad), R = await M.checkOnce(OPT, E), v = M.verdict(R);
    assert.equal(v.ready, false, JSON.stringify(bad) + " 要判不就緒");
    assert.equal(v.failed, step, JSON.stringify(bad) + " 要擋在 " + step);
    assert.match(v.why, why, JSON.stringify(bad));
    assert.equal(R[R.length - 1].step, step, JSON.stringify(bad) + "：擋下之後不能再往下檢查");
    const idx = M.STEPS.indexOf(step);
    assert.deepEqual(R.map((r) => r.step), M.STEPS.slice(0, idx + 1), JSON.stringify(bad));
    if (idx < M.STEPS.indexOf("cdp")) assert.ok(!E.calls.includes("appStart"), JSON.stringify(bad) + "：前面沒過就不能啟動 App");
  }
});

test("模擬器卡死（每個 shell 指令都逾時）：擋在 shell、可以重開；不能被誤判成「不是模擬器」而不重開（11/27 實測抓到的）", async () => {
  const M = load(), v = M.verdict(await M.checkOnce(OPT, env({ shell: "timeout" })));
  assert.equal(v.failed, "shell"); assert.equal(v.retryable, true); assert.match(v.why, /卡死/);
  assert.ok(M.STEPS.indexOf("shell") < M.STEPS.indexOf("emulator"), "shell 要排在 emulator 前面");
});

test("沒帶 --aab-apk：不核對 APK、那一項照樣算過但寫明沒核對；沒帶 --build 時 CDP 不比版號", async () => {
  const M = load(), E = env(), R = await M.checkOnce({ ...OPT, aabApk: null, build: null }, E);
  assert.equal(M.verdict(R).ready, true);
  assert.ok(!E.calls.some((c) => c.startsWith("bindApk")));
  assert.match(R.find((r) => r.step === "apk").msg, /沒帶 --aab-apk/);
  assert.ok(E.calls.includes("cdp 9333 null"));
});

test("不合格時重開再檢查：重開後好了就放行；一直壞就在 --retries 次後停；重開失敗也停；沒給重開就不重試", async () => {
  const M = load();
  /* 第一次 shell 卡死，重開一次就好 */
  let n = 0; const E1 = env({}, { restart: async () => { n++; return { ok: true, msg: "" } } });
  const adb0 = E1.adb; let broken = true;
  E1.adb = (args) => { if (broken && args.join(" ").endsWith("shell echo ok")) { const e = new Error("ETIMEDOUT"); e.timedOut = true; throw e } return adb0(args) };
  E1.restart = async () => { n++; broken = false; return { ok: true, msg: "" } };
  const R1 = await M.checkReady(OPT, E1);
  assert.equal(R1.ready, true); assert.equal(R1.restarted, 1); assert.equal(n, 1); assert.equal(R1.rounds.length, 2);
  assert.equal(R1.rounds[0].verdict.failed, "shell");
  /* 一直壞：重開 retries 次後放棄，不就緒 */
  let m = 0; const E2 = env({ cdp: true }, { restart: async () => { m++; return { ok: true, msg: "" } } });
  const R2 = await M.checkReady({ ...OPT, retries: 2 }, E2);
  assert.equal(R2.ready, false); assert.equal(m, 2); assert.equal(R2.restarted, 2); assert.equal(R2.rounds.length, 3);
  assert.equal(R2.rounds[2].verdict.failed, "cdp");
  /* 重開本身失敗 */
  const E3 = env({ boot: "0" }, { restart: async () => ({ ok: false, msg: "重開後 5 分鐘內沒開機完成" }) });
  const R3 = await M.checkReady(OPT, E3);
  assert.equal(R3.ready, false); assert.equal(R3.rounds[R3.rounds.length - 1].verdict.failed, "restart");
  /* 沒給 restart：只檢查一次 */
  const R4 = await M.checkReady(OPT, env({ boot: "0" }));
  assert.equal(R4.ready, false); assert.equal(R4.restarted, 0); assert.equal(R4.rounds.length, 1);
  /* retries＝0：就算有 restart 也不重開 */
  let k = 0; const R5 = await M.checkReady({ ...OPT, retries: 0 }, env({ boot: "0" }, { restart: async () => { k++; return { ok: true } } }));
  assert.equal(R5.ready, false); assert.equal(k, 0);
});

test("重開也不會好的（adb 不能用、不是模擬器、裝錯 APK、版號不對）不重開、直接判不就緒；模擬器卡住的（shell、開機、CDP）照樣重開", async () => {
  const M = load();
  for (const bad of [{ adb: "missing" }, { emulator: true }, { apk: true }, { build: true }]) {
    let n = 0; const R = await M.checkReady(OPT, env(bad, { restart: async () => { n++; return { ok: true } } }));
    assert.equal(R.ready, false, JSON.stringify(bad)); assert.equal(n, 0, JSON.stringify(bad) + " 不該重開");
    assert.equal(R.rounds[0].verdict.retryable, false, JSON.stringify(bad));
  }
  for (const bad of [{ shell: "timeout" }, { boot: "0" }, { cdp: true }, { online: "offline" }, { webview: "nullpkg" }]) {
    let n = 0; const R = await M.checkReady({ ...OPT, retries: 1 }, env(bad, { restart: async () => { n++; return { ok: true } } }));
    assert.equal(n, 1, JSON.stringify(bad) + " 要重開一次"); assert.equal(R.rounds[0].verdict.retryable, true, JSON.stringify(bad));
  }
});

/* 假的重開工具：記下有沒有關模擬器、怎麼開 */
function rdeps(o = {}) {
  const D = { killed: false, spawned: null, booted: o.booted !== undefined ? o.booted : 2, n: 0 };
  D.d = {
    emuDefault: "C:\\sdk\\emulator\\emulator.exe",
    exists: (f) => o.exists !== undefined ? o.exists : true,
    listAvds: () => { if (o.listFail) throw new Error("emulator: 列不出來"); return o.avds || ["xq_pixel9_api36", "xq_a12"] },
    adb: (args) => { const a = args.slice(2).join(" "); if (a === "emu kill") { D.killed = true; return "OK" } if (a === "get-state") throw new Error("not found"); if (a === "shell getprop sys.boot_completed") { D.n++; if (o.neverBoot) return "0"; return D.n >= D.booted ? "1" : "0" } return "" },
    spawn: (exe, args) => { D.spawned = { exe, args }; let k = 0; return { error: o.spawnError || "", exited: () => !!o.dies && ++k >= 1, tail: () => o.dies ? "ERROR | Unknown AVD name" : "" } },
    sleep: async () => { }, log: () => { },
  };
  return D;
}
const RO = { serial: "emulator-5580", avd: "xq_pixel9_api36", emulator: null };

test("重開：確認開得回來（執行檔在、AVD 在清單）才關舊的；正常時用 -avd、-port、冷開機重開並等到開機完成", async () => {
  const M = load();
  for (const [o, why] of [[{ exists: false }, /找不到 emulator 執行檔/], [{ avds: ["別台"] }, /找不到 AVD「xq_pixel9_api36」/], [{ listFail: true }, /列不出 AVD/]]) {
    const D = rdeps(o), r = await M.makeRestart(RO, D.d)();
    assert.equal(r.ok, false, JSON.stringify(o)); assert.match(r.msg, why); assert.match(r.msg, /沒有關掉模擬器/);
    assert.equal(D.killed, false, JSON.stringify(o) + "：開不回來就不能先關"); assert.equal(D.spawned, null);
  }
  const D = rdeps(), r = await M.makeRestart(RO, D.d)();
  assert.equal(r.ok, true, r.msg); assert.equal(D.killed, true);
  assert.deepEqual(D.spawned.args, ["-avd", "xq_pixel9_api36", "-port", "5580", "-no-snapshot-load"]);
  assert.equal(D.spawned.exe, "C:\\sdk\\emulator\\emulator.exe");
  const D2 = rdeps(), r2 = await M.makeRestart({ ...RO, emulator: "D:\\emu\\emulator.exe" }, D2.d)();
  assert.equal(r2.ok, true); assert.equal(D2.spawned.exe, "D:\\emu\\emulator.exe", "有給 --emulator 就用它");
});

test("重開：模擬器一啟動就結束要馬上判失敗、附上輸出；開不了、一直沒開機完成也判失敗", async () => {
  const M = load();
  const D1 = rdeps({ dies: true }), r1 = await M.makeRestart(RO, D1.d)();
  assert.equal(r1.ok, false); assert.match(r1.msg, /一啟動就結束/); assert.match(r1.msg, /Unknown AVD name/); assert.equal(D1.n, 0, "結束了就不用再等開機");
  const r2 = await M.makeRestart(RO, rdeps({ spawnError: "spawn ENOENT" }).d)();
  assert.equal(r2.ok, false); assert.match(r2.msg, /開不了模擬器/);
  const D3 = rdeps({ neverBoot: true }), r3 = await M.makeRestart(RO, D3.d)();
  assert.equal(r3.ok, false); assert.match(r3.msg, /5 分鐘內沒開機完成/); assert.equal(D3.n, 150);
  /* 先確認再關的順序要鎖住：改壞成不查 AVD，測試要抓得到 */
  const from = 'if (!avds.includes(opt.avd)) return', to = 'if (false) return';
  assert.ok(SRC.includes(from));
  const Mb = load(SRC.replace(from, to)), Db = rdeps({ avds: ["別台"] }); await Mb.makeRestart(RO, Db.d)();
  assert.equal(Db.killed, true, "改壞版會先關掉（上面的測試靠這個抓到）");
});

test("參數：用法錯誤要回 err；預設值合理；--restart-avd 只准模擬器", () => {
  const M = load();
  for (const bad of [["--bogus"], ["--serial"], ["--port", "80"], ["--port", "x"], ["--retries", "9", "--restart-avd", "A12"], ["--build", "2026-11-27"],
    ["--retries", "2"], ["--emulator", "x"], ["--restart-avd", "A12", "--serial", "R5CT1234"], ["--out", "--build"]]) assert.ok(M.parseArgs(bad).err, "要報錯：" + bad.join(" "));
  const d = M.parseArgs([]).opt;
  assert.equal(d.port, 9333); assert.equal(d.retries, 2); assert.equal(d.avd, null); assert.equal(d.allowReal, false);
  const o = M.parseArgs(["--serial", "emulator-5556", "--restart-avd", "Pixel_A12", "--retries", "1", "--build", "20261127-1200", "--allow-real-device"]).opt;
  assert.equal(o.serial, "emulator-5556"); assert.equal(o.avd, "Pixel_A12"); assert.equal(o.retries, 1); assert.equal(o.allowReal, true);
});

test("命令列實跑：用法錯誤回 2；adb 找不到回 1（不就緒），不會回 0", () => {
  const r1 = cp.spawnSync(process.execPath, [FILE, "--bogus"], { encoding: "utf8", timeout: 30000 });
  assert.equal(r1.status, 2, r1.stdout + r1.stderr); assert.match(r1.stderr, /不認得的參數/);
  const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "xq-emu-ready-t-")), "r.json"); made.push(path.dirname(out));
  const r2 = cp.spawnSync(process.execPath, [FILE, "--out", out], { encoding: "utf8", timeout: 60000, env: { ...process.env, ADB: path.join(os.tmpdir(), "no-such-adb-" + process.pid) } });
  assert.equal(r2.status, 1, r2.stdout + r2.stderr); assert.match(r2.stdout, /✘ adb/); assert.match(r2.stdout, /模擬器不就緒：卡在 adb/);
  const J = JSON.parse(fs.readFileSync(out, "utf8"));
  assert.equal(J.tool, "emu-ready"); assert.equal(J.ready, false); assert.equal(J.rounds[0].verdict.failed, "adb");
});

test("改壞驗證：判斷改鬆了，上面的測試要抓得到", async () => {
  const MUT = [
    ["結論一律就緒", "return { ready: !fail && results.length > 0,", "return { ready: true,"],
    ["shell 逾時不擋", 'if (!add("shell", sh.ok && sh.s === "ok",', 'if (!add("shell", true,'],
    ["開機沒完成不擋", 'if (!add("boot", bt.ok && bt.s === "1",', 'if (!add("boot", true,'],
    ["APK 不符照樣過", 'if (!add("apk", b.ok, b.msg, b.retryable)) return out;', 'add("apk", true, b.msg);'],
    ["CDP 沒就緒照樣過", 'add("cdp", c.ok, c.msg, c.retryable);', 'add("cdp", true, c.msg);'],
    ["不合格也不重開", "if (vd.ready || !vd.retryable || !env.restart || i >= opt.retries)", "if (true)"],
    ["不是模擬器也放行", 'if (!add("emulator", g.ok,', 'if (!add("emulator", true,'],
    ["WebView 沒有也放行", 'if (!add("webview", !!wm,', 'if (!add("webview", true,'],
  ];
  /* 另一種改壞：重開也不會好的照樣重開（浪費時間，而且「重開後版號就對了」不可能發生） */
  const from2 = "if (vd.ready || !vd.retryable || !env.restart", to2 = "if (vd.ready || !env.restart";
  assert.ok(SRC.includes(from2));
  { const M = load(SRC.replace(from2, to2)); let n = 0; await M.checkReady(OPT, env({ build: true }, { restart: async () => { n++; return { ok: true } } })); assert.ok(n > 0, "改壞版要會重開（測試才抓得到這種改壞）") }
  for (const [what, from, to] of MUT) {
    assert.ok(SRC.includes(from), "改壞點不存在：" + what);
    const M = load(SRC.replace(from, to));
    let caught = false;
    try {
      /* 不只看「變成就緒」：擋錯項目、該重開的變成不重開，也算抓到（卡死被誤判成「不是模擬器」就是這種） */
      for (const [bad, step, retry] of [[{ shell: "timeout" }, "shell", true], [{ boot: "0" }, "boot", true], [{ apk: true }, "apk", false], [{ cdp: true }, "cdp", true],
        [{ emulator: true }, "emulator", false], [{ webview: "nullpkg" }, "webview", true]]) {
        const v = M.verdict(await M.checkOnce(OPT, env(bad)));
        if (v.ready || v.failed !== step || v.retryable !== retry) { caught = true; break }
      }
      if (!caught) {
        let broken = true; const E = env({}, {}); const a0 = E.adb;
        E.adb = (args) => { if (broken && args.join(" ").endsWith("shell echo ok")) { const e = new Error("ETIMEDOUT"); e.timedOut = true; throw e } return a0(args) };
        E.restart = async () => { broken = false; return { ok: true } };
        const R = await M.checkReady(OPT, E); if (!R.ready) caught = true;
      }
    } catch (e) { caught = true }
    assert.ok(caught, "改壞了卻抓不到：" + what);
  }
});

test("〔原始碼〕emu-ready.js：LF、沒有控制字元；只檢查、不改 P0 工具（不 require、不寫 p0-gate／check-3d）", () => {
  assert.doesNotMatch(SRC, /\r/); assert.doesNotMatch(SRC, /[\x00-\x08\x0b\x0c\x0e-\x1f]/);
  assert.doesNotMatch(SRC, /require\(["']\.\/(p0-gate|check-3d)/, "預檢不能跟 P0 判斷綁在一起");
  assert.doesNotMatch(SRC, /writeFileSync\([^)]*(p0|summary|upgrade)/i, "預檢不寫任何 P0 報告");
  assert.match(SRC, /require\("\.\/device-guard\.js"\)/, "模擬器判斷要跟 check-3d 用同一支");
  assert.match(SRC, /require\("\.\/apk-bind\.js"\)/, "APK 綁定要跟 check-3d 用同一支");
});
