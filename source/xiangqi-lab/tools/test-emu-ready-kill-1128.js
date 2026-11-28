/* W218（11/28）emu-ready.js --restart-avd 遇到卡死的模擬器：emu kill 之後這個 AVD 的程序還在，就強制結束；結束不掉就照實失敗、不開新的。
   起因：11/27 晚上 Android 候選 26112701 跑 P0-3D Android 12，模擬器卡死（shell 沒回應），emu kill 關不掉，新開的被「同一個 AVD 不能開兩台」擋下。
   用假的依賴（不開模擬器、不動真的程序）跑 makeRestart；挑程序的純函式 avdPidsFrom 用假的程序清單。
   「改壞驗證」：拿掉強制結束、AVD 名字只比前綴、不看執行檔名、關不掉照樣開新的，都要抓得到。 */
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const FILE = path.join(__dirname, "..", "..", "xiangqi-android", "scripts", "emu-ready.js"), SRC = fs.readFileSync(FILE, "utf8");
function load(patch) {
  let src = SRC.replace(/^#![^\n]*\n/, "\n");   /* 第一行的 #!/usr/bin/env node 包進函式會語法錯，換成空行（行號不變） */
  if (patch) { assert.ok(src.includes(patch[0]), "改壞點不存在：" + patch[0].slice(0, 60)); src = src.replace(patch[0], patch[1]) }
  const mod = { exports: {} };
  vm.runInThisContext("(function (exports, require, module, __filename, __dirname) {" + src + "\n})", { filename: FILE })(mod.exports, require("module").createRequire(FILE), mod, FILE, path.dirname(FILE));
  return mod.exports;
}
const AVD = "xq_p0_exp_m05", RO = { serial: "emulator-5580", avd: AVD, emulator: "C:/sdk/emulator/emulator.exe" };
const PROCS = [
  { pid: "11", name: "qemu-system-x86_64.exe", cmd: "C:/sdk/emulator/qemu/windows-x86_64/qemu-system-x86_64.exe -avd xq_p0_exp_m05 -port 5580" },
  { pid: "12", name: "emulator.exe", cmd: "emulator.exe -avd xq_p0_exp_m05 -port 5580 -no-snapshot-load" },
  { pid: "13", name: "emulator.exe", cmd: "emulator.exe -avd xq_p0_exp_m05_b -port 5582" },
  { pid: "14", name: "bash.exe", cmd: "bash -c emulator.exe -avd xq_p0_exp_m05" },
  { pid: "15", name: "qemu-system-aarch64", cmd: "/sdk/emulator/qemu-system-aarch64 -avd \"xq.a12\" -port 5584" },
  { pid: "16", name: "/Users/x/sdk/emulator/emulator", cmd: "/Users/x/sdk/emulator/emulator -avd xq_p0_exp_m05" },
];
/* 假依賴：pidsSeq＝每次查程序的結果（用完就一直回最後一個）；記下有沒有強制結束、有沒有開新的 */
function deps(o = {}) {
  const D = { killed: [], spawned: 0, asked: 0, logs: [] }, seq = o.pidsSeq || [[]];
  D.d = {
    exists: () => true, listAvds: () => [AVD], sleep: async () => {}, log: (s) => D.logs.push(s),
    adb: (args) => { if (args.includes("get-state")) return "offline"; if (args.includes("getprop")) return "1"; return "" },
    spawn: () => { D.spawned++; return { error: "", exited: () => false, tail: () => "" } },
    avdPids: o.noPids ? undefined : (avd) => { if (o.throws) throw new Error("PowerShell 不能執行"); assert.equal(avd, AVD); const r = seq[Math.min(D.asked, seq.length - 1)]; D.asked++; return r.slice() },
    killPids: (p) => D.killed.push(...p),
  };
  if (o.noPids) { delete D.d.avdPids; delete D.d.killPids }
  return D;
}

function chkPick(M) {   /* 只挑剛好這個 AVD、而且是 emulator／qemu-system 的程序；名字相近的、bash 不挑；引號包住的名字照樣挑得到 */
  const a = M.avdPidsFrom(PROCS, AVD).sort((x, y) => x - y).join(), b = M.avdPidsFrom(PROCS, "xq.a12").join(), c = M.avdPidsFrom(PROCS, "xq_p0_exp").join();
  return a === "11,12,16" && b === "15" && c === "";
}
async function chkKill(M) {   /* emu kill 後程序還在：強制結束那幾個，確定沒了才開新的 */
  const D = deps({ pidsSeq: [[11, 12], []] }), r = await M.makeRestart(RO, D.d)();
  return r.ok === true && D.killed.join() === "11,12" && D.spawned === 1;
}
async function chkStuck(M) {   /* 強制結束後還在：失敗、說是哪幾個、不開新的 */
  const D = deps({ pidsSeq: [[11]] }), r = await M.makeRestart(RO, D.d)();
  return r.ok === false && /關不掉/.test(r.msg) && /11/.test(r.msg) && D.spawned === 0;
}
async function chkClean(M) {   /* emu kill 就關掉了：不強制結束，照常開新的；查程序失敗：不開新的 */
  const D = deps({ pidsSeq: [[]] }), r = await M.makeRestart(RO, D.d)();
  if (!(r.ok === true && D.killed.length === 0 && D.spawned === 1)) return false;
  const E = deps({ throws: true }), r2 = await M.makeRestart(RO, E.d)();
  return r2.ok === false && /查不到/.test(r2.msg) && E.spawned === 0;
}

test("挑程序：只挑剛好這個 AVD 的 emulator／qemu-system；名字相近的 AVD、命令列提到 AVD 的 bash 都不挑", () => { assert.ok(chkPick(load())) });
test("卡死的模擬器：emu kill 後程序還在就強制結束，確定沒了才開新的", async () => { assert.ok(await chkKill(load())) });
test("強制結束也關不掉：照實失敗、說是哪幾個程序、不開新的", async () => { assert.ok(await chkStuck(load())) });
test("emu kill 就關掉了：不強制結束、照常開；查程序失敗就不開新的；沒提供查程序的依賴（舊的注入）照原本流程", async () => {
  assert.ok(await chkClean(load()));
  const D = deps({ noPids: true }), r = await load().makeRestart(RO, D.d)(); assert.equal(r.ok, true); assert.equal(D.spawned, 1);
});
test("改壞驗證：拿掉強制結束、名字只比前綴、不看執行檔名、關不掉照樣開，上面的檢查都要抓得到", async () => {
  assert.equal(await chkKill(load(["        try { d.killPids(pids) } catch (e) { }\n", ""])), false, "拿掉強制結束");
  assert.equal(chkPick(load(['"\\"?(\\\\s|$)");', '"");'])), false, "名字只比前綴");
  assert.equal(chkPick(load(["/(^|[\\\\/])(emulator|qemu-system[\\w.-]*)(\\.exe)?$/i.test(String(p.name || \"\"))", "true"])), false, "不看執行檔名");
  assert.equal(await chkStuck(load(['        if (pids.length) return { ok: false, msg: "舊的模擬器程序關不掉', '        if (false) return { ok: false, msg: "舊的模擬器程序關不掉'])), false, "關不掉照樣開");
});
