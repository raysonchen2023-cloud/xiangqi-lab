// check-verify-log.cjs 的自我測試（W69 流程盤點第 12 項）：驗證紀錄要跟 evidence.md 同一次 CI 執行、版本對、內容跟重跑一致
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const fs = require("fs"), os = require("os"), path = require("path"), cp = require("child_process");
const { check } = require("./check-verify-log.cjs");

const V = "20261123-1200";
const log = (id, { ver = V, time = "2026-11-23T04:00:00.000Z", commit = "a".repeat(40), body = "總結：4 步，通過 4、失敗 0、略過 0" } = {}) =>
  `《象棋千秋》可重現驗證紀錄（verify-all.js）\n========================================\n執行時間：${time}\n執行編號：${id}\nNode.js：v24.0.0\n倉庫 commit：${commit}\nrelease.json：版本 ${ver}、html c80365ce9fd8、sw ca6aef96a177\n----------------------------------------\n${body}\n✔ 全部通過\n`;
const ev = (id) => `# 驗證紀錄（版本 ${V}）\n\n- 執行編號：${id}（Node.js v24.0.0；…）\n- 產生時間：t\n`;
const ci = log("gh-900-1", { time: "2026-11-23T05:00:00.000Z", commit: "b".repeat(40) });
const ok = (o) => check({ version: V, logText: log("gh-100-1"), evidenceText: ev("gh-100-1"), ciText: ci, ...o });

test("同一次 CI（gh- 同號）、版本對、只差時間／編號／commit：通過；CRLF 與結尾空行不算不同", () => {
  assert.deepEqual(ok({}), { ok: true, errors: [] });
  assert.equal(ok({ logText: log("gh-100-1").replace(/\n/g, "\r\n") + "\r\n\r\n" }).ok, true);
});

test("#59 審查：每一步耗時秒數、Node.js／作業系統那行每次不同，不算不同；結束代碼不同照擋", () => {
  const step = (code, sec) => `第 4 步 run-tests：通過（結束代碼 ${code}，${sec} 秒）\n`;
  const L = (sec, node, code = 0) => log("gh-100-1").replace("Node.js：v24.0.0", node) + step(code, sec);
  const C = (sec, node, code = 0) => ci.replace("Node.js：v24.0.0", node) + step(code, sec);
  assert.equal(ok({ logText: L("274.0", "Node.js：v24.22.3；作業系統：linux 7.0.0-1020-azure x64"), ciText: C("220.5", "Node.js：v24.23.0；作業系統：linux 7.0.0-1021-azure x64") }).ok, true, "#57 兩次 CI：274.0 秒對 220.5 秒");
  assert.match(ok({ logText: L("274.0", "Node.js：v24.0.0", 0), ciText: C("274.0", "Node.js：v24.0.0", 1) }).errors.join(), /第 \d+ 行起/, "結束代碼不同要擋");
});

test("本機跑的（local-）、手改沒編號的、跟 evidence.md 不同號的：都擋", () => {
  assert.match(ok({ logText: log("local-20261123T040000Z-1"), evidenceText: ev("local-20261123T040000Z-1") }).errors.join(), /要用 GitHub Actions 產生的/);
  assert.match(ok({ logText: log("gh-100-1").replace(/^執行編號：.*\n/m, "") }).errors.join(), /（沒有）/);
  assert.match(ok({ evidenceText: ev("gh-101-1") }).errors.join(), /不是同一次執行/);
  assert.match(ok({ evidenceText: "# 沒有編號\n" }).errors.join(), /evidence\.md 沒有執行編號/);
});

test("版本不對、內容不同（通過數、多一行）、缺檔、source/ 還留舊紀錄：都擋", () => {
  assert.match(ok({ logText: log("gh-100-1", { ver: "20261122-0804" }) }).errors.join(), /不是 release\.json 的 20261123-1200/);
  assert.match(ok({ version: "" }).errors.join(), /讀不到 release\.json 的版本/);
  assert.match(ok({ logText: log("gh-100-1", { body: "總結：4 步，通過 3、失敗 1、略過 0" }) }).errors.join(), /第 \d+ 行起/);
  assert.match(ok({ logText: log("gh-100-1") + "多出來的一行\n" }).errors.join(), /（沒有這一行）/);
  assert.match(ok({ logText: null }).errors.join(), /缺 data\/docs\/verification-log\.txt/);
  assert.match(ok({ oldLogs: ["verification-log-20261122-0804.txt"] }).errors.join(), /source\/ 底下還有舊做法的驗證紀錄/);
});

test("命令列：讀倉庫的 release.json、data/docs 兩份、source/ 舊紀錄；結束代碼 0／1／2", () => {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), "xq-vlog-"));
  const run = (...a) => cp.spawnSync(process.execPath, [path.join(__dirname, "check-verify-log.cjs"), ...a], { encoding: "utf8" });
  try {
    fs.mkdirSync(path.join(d, "data", "docs"), { recursive: true }); fs.mkdirSync(path.join(d, "source"));
    fs.writeFileSync(path.join(d, "release.json"), JSON.stringify({ version: V }));
    fs.writeFileSync(path.join(d, "data", "docs", "verification-log.txt"), log("gh-100-1"));
    fs.writeFileSync(path.join(d, "data", "docs", "evidence.md"), ev("gh-100-1"));
    fs.writeFileSync(path.join(d, "ci.txt"), ci);
    assert.equal(run(d, path.join(d, "ci.txt")).status, 0);
    fs.writeFileSync(path.join(d, "source", "verification-log-20261122-0804.txt"), "舊");
    assert.equal(run(d, path.join(d, "ci.txt")).status, 1, "source/ 留舊紀錄要擋");
    assert.equal(run(d).status, 2, "缺參數＝用法錯誤");
  } finally { fs.rmSync(d, { recursive: true, force: true }) }
});
