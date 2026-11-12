#!/usr/bin/env node
// 象棋千秋：一個指令重跑全部核對，留一份純文字紀錄（評比第 14 輪 F3／X3 可重現驗證包）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 依序跑四步，每一步都只讀本機檔案、不連網、不開瀏覽器：
//   1. check-build     node source/check-build.js：從 source/ 組出 index.html，跟倉庫根目錄的逐字比對
//   2. release-verify  release-verify.js --dir <倉庫>：index.html、sw.js 的雜湊和版本號跟 release.json 一致
//   3. pikafish-verify pikafish-verify.js --dir <倉庫> --record <build-record.json>：引擎檔跟建置紀錄比對
//                      （找不到建置紀錄就「略過」並寫明原因，不當成通過）
//   4. run-tests       node source/run-tests.js：重跑 source/ 裡的自動測試
// 紀錄寫：執行時間（UTC 和臺灣時間）、Node 版本、作業系統、這支工具和各步工具的 SHA-256、倉庫的 commit（是 git 檢出才有）、
//         release.json 的版本和指紋、主要成品（index.html、sw.js、core.js、引擎）的 SHA-256、source/ 整個資料夾的雜湊，
//         以及每一步的指令、耗時、結束代碼、完整輸出。倉庫資料夾的路徑換成「<倉庫資料夾>」、使用者資料夾換成「<使用者資料夾>」。
//
// 用法（在公開倉庫根目錄）：
//   node source/xiangqi-lab/tools/verify-all.js                         倉庫＝這支檔案往上三層（source/ 的上一層）
//   node source/xiangqi-lab/tools/verify-all.js --out 紀錄.txt           紀錄另存一份檔案（LF、UTF-8）
//   node xiangqi-lab/tools/verify-all.js --repo <公開倉庫資料夾>          開發者電腦上指定倉庫（例如 git archive 解開的一份）
//   其他選項：--record <build-record.json>  --only check-build,run-tests  --skip run-tests  --timeout <秒，每一步，預設 1800>
//             --note <文字>（寫進紀錄開頭，例如倉庫是怎麼取得的）
// Windows 注意：git 設了 core.autocrlf=true 時 clone 下來的文字檔是 CRLF，雜湊會對不上；用 git -c core.autocrlf=false clone。
// 結束代碼：全部通過（可以有「略過」）0；有一步失敗 1；用法錯誤或找不到倉庫 2。
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process"), crypto = require("crypto");

const STEPS = ["check-build", "release-verify", "pikafish-verify", "run-tests"];
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const sha1_12 = b => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
const fileSha = p => { try { return sha256(fs.readFileSync(p)) } catch (e) { return null } };
const exists = p => { try { return fs.statSync(p).isFile() } catch (e) { return false } };

/* 使用者資料夾的路徑換成佔位字（反斜線、斜線、/磁碟代號小寫/... 三種寫法），拿掉 CR 和其他控制字元（保留換行、tab） */
function scrubber(home, extra = []) {
  const variants = (p, label) => {
    const fwd = p.split("\\").join("/"), posix = fwd.replace(/^([A-Za-z]):/, (m, d) => "/" + d.toLowerCase());
    return [[p.split("\\").join("\\\\"), label], [p, label], [fwd, label], [posix, label]];
  };
  /* 先換比較長的（倉庫資料夾常在使用者資料夾底下），再換使用者資料夾 */
  const pairs = [...extra.flatMap(([p, label]) => variants(p, label)), ...variants(home, "<使用者資料夾>")]
    .filter(p => p[0] && p[0].length > 3);
  return s => {
    let t = String(s).split("\r\n").join("\n").split("\r").join("\n");
    for (const [a, b] of pairs) t = t.split(a).join(b);
    return t.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "");
  };
}

/* source/ 整個資料夾的雜湊：每個檔「相對路徑＋NUL＋SHA-256＋換行」照路徑排序後再算一次 SHA-256 */
function treeHash(dir) {
  const list = [];
  const walk = (d, rel) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const r = rel ? rel + "/" + e.name : e.name, p = path.join(d, e.name);
      if (e.isDirectory()) walk(p, r); else if (e.isFile()) list.push([r, sha256(fs.readFileSync(p))]);
    }
  };
  try { walk(dir, "") } catch (e) { return null }
  list.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  return { files: list.length, sha256: sha256(list.map(([r, h]) => r + "\0" + h + "\n").join("")) };
}

/* 找倉庫：--repo，或這支檔案在 <倉庫>/source/xiangqi-lab/tools/ 時往上三層 */
function findRepo(argRepo) {
  if (argRepo) return path.resolve(argRepo);
  const up = path.resolve(__dirname, "..", "..", "..");
  if (path.basename(path.resolve(__dirname, "..", "..")) === "source" && exists(path.join(up, "release.json"))) return up;
  return null;
}

/* 各步要用的工具：優先用倉庫自己 source/ 裡的那一份（外部的人跑的就是它），沒有才用這支旁邊的 */
function toolPath(repo, name) {
  const inRepo = path.join(repo, "source", "xiangqi-lab", "tools", name);
  return exists(inRepo) ? inRepo : path.join(__dirname, name);
}
function findRecord(repo, argRecord) {
  const c = argRecord ? [path.resolve(argRecord)] : [
    path.join(repo, "pikafish-src", "build-record.json"),
    path.join(__dirname, "..", "..", "xiangqi-wasm", "build-record.json"),
  ];
  return c.find(exists) || null;
}

/* 規劃四步：回傳 [{ id, cmd:[檔案, ...參數], skip:原因|null }] */
function plan(repo, o = {}) {
  const only = o.only ? new Set(o.only) : null, skip = new Set(o.skip || []);
  const rec = findRecord(repo, o.record);
  const S = [
    { id: "check-build", cmd: [path.join(repo, "source", "check-build.js")] },
    { id: "release-verify", cmd: [toolPath(repo, "release-verify.js"), "--dir", repo] },
    { id: "pikafish-verify", cmd: [toolPath(repo, "pikafish-verify.js"), "--dir", repo, "--record", rec || ""],
      skip: rec ? null : "找不到 Pikafish 建置紀錄 build-record.json（倉庫的 pikafish-src/ 還沒放；可以用 --record 指定）" },
    { id: "run-tests", cmd: [path.join(repo, "source", "run-tests.js")] },
  ];
  for (const s of S) {
    if (only && !only.has(s.id)) s.skip = "指令只跑 " + [...only].join("、");
    else if (skip.has(s.id)) s.skip = "指令要求略過（--skip）";
    else if (!s.skip && !exists(s.cmd[0])) s.missing = "找不到 " + s.cmd[0];
  }
  return { steps: S, record: rec };
}

function runStep(s, repo, timeoutSec) {
  const t0 = Date.now();
  if (s.skip) return { ...s, status: "略過", code: null, ms: 0, out: "" };
  if (s.missing) return { ...s, status: "失敗", code: 2, ms: 0, out: s.missing };
  const r = cp.spawnSync(process.execPath, s.cmd, { cwd: repo, encoding: "utf8", timeout: timeoutSec * 1000, maxBuffer: 256e6, env: { ...process.env, FORCE_COLOR: "0", NO_COLOR: "1" } });
  const out = (r.stdout || "") + (r.stderr ? (r.stdout ? "\n" : "") + r.stderr : "") + (r.error ? "\n[錯誤] " + r.error.message : "");
  const code = r.status == null ? 1 : r.status;
  return { ...s, status: code === 0 ? "通過" : "失敗", code, ms: Date.now() - t0, out, signal: r.signal || null };
}

function gitCommit(repo) {
  try {
    const top = cp.execFileSync("git", ["-C", repo, "rev-parse", "--show-toplevel"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    if (path.resolve(top) !== path.resolve(repo)) return null;
    return cp.execFileSync("git", ["-C", repo, "rev-parse", "HEAD"], { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch (e) { return null }
}

const twTime = d => new Date(d.getTime() + 8 * 3600e3).toISOString().replace("T", " ").slice(0, 19) + "（臺灣時間）";

/* 跑全部，回傳 { code, text, results, facts } */
function verifyAll(o = {}) {
  const repo = o.repo, scrub = scrubber(o.home || os.homedir(), [[path.resolve(repo), "<倉庫資料夾>"]]), now = o.now ? new Date(o.now) : new Date();
  const timeoutSec = o.timeout || 1800;
  let rel = null;
  try { rel = JSON.parse(fs.readFileSync(path.join(repo, "release.json"), "utf8")) } catch (e) { rel = null }
  const { steps, record } = plan(repo, o);
  const H = (rel_) => ({ path: rel_, sha256: fileSha(path.join(repo, rel_)) });
  const facts = {
    version: rel && rel.version || null, releaseHtml: rel && rel.html || null, releaseSw: rel && rel.sw || null,
    commit: gitCommit(repo),
    hashes: ["index.html", "sw.js", "release.json", "core.js", "engine.js", "engine/pikafish.wasm", "engine/pikafish.js", "engine/pikafish.nnue"].map(H).filter(h => h.sha256),
    source: treeHash(path.join(repo, "source")),
    record: record ? { path: record, sha256: fileSha(record) } : null,
    self: { path: __filename, sha256: fileSha(__filename) },
  };
  const results = steps.map(s => runStep(s, repo, timeoutSec));
  const failed = results.filter(r => r.status === "失敗"), skipped = results.filter(r => r.status === "略過");
  const L = [];
  L.push("《象棋千秋》可重現驗證紀錄（verify-all.js）");
  L.push("=".repeat(40));
  L.push(`執行時間：${now.toISOString()}（UTC）＝ ${twTime(now)}`);
  L.push(`Node.js：${process.version}；作業系統：${os.platform()} ${os.release()} ${os.arch()}`);
  L.push(`倉庫資料夾：${repo}`);
  L.push(`倉庫 commit：${facts.commit || "（不是 git 檢出；用下面的雜湊對照）"}`);
  if (o.note) L.push(`說明：${o.note}`);
  L.push(`release.json：版本 ${facts.version || "（讀不到）"}、html ${facts.releaseHtml || "?"}、sw ${facts.releaseSw || "?"}`);
  L.push(`verify-all.js SHA-256：${facts.self.sha256}`);
  L.push("");
  L.push("成品 SHA-256（SHA-1 前 12 碼）：");
  for (const h of facts.hashes) L.push(`  ${h.path}  ${h.sha256}  (${sha1_12(fs.readFileSync(path.join(repo, h.path)))})`);
  L.push(facts.source ? `source/ 資料夾：${facts.source.files} 個檔，樹雜湊 SHA-256 ${facts.source.sha256}` : "source/ 資料夾：找不到");
  L.push(facts.record ? `Pikafish 建置紀錄：${facts.record.path}  SHA-256 ${facts.record.sha256}` : "Pikafish 建置紀錄：找不到");
  L.push("（樹雜湊＝每個檔「相對路徑＋NUL＋SHA-256＋換行」照路徑排序後再算 SHA-256）");
  L.push("");
  results.forEach((r, i) => {
    L.push("-".repeat(40));
    L.push(`第 ${i + 1} 步 ${r.id}：${r.status}` + (r.code != null ? `（結束代碼 ${r.code}，${(r.ms / 1000).toFixed(1)} 秒）` : ""));
    const disp = a => { if (!path.isAbsolute(a)) return a; const rr = path.relative(repo, a); return rr === "" ? "." : rr.startsWith("..") ? a : rr.split(path.sep).join("/") };
    L.push(`指令（在倉庫資料夾執行）：node ${r.cmd.map(disp).map(a => /^[^\s"']+$/.test(a) ? a : JSON.stringify(a)).join(" ")}`);
    if (r.cmd[0] && exists(r.cmd[0])) L.push(`工具 SHA-256：${fileSha(r.cmd[0])}`);
    if (r.skip) L.push(`略過原因：${r.skip}`);
    if (r.signal) L.push(`被中止：${r.signal}（逾時 ${timeoutSec} 秒？）`);
    if (r.out) { L.push("輸出："); for (const line of r.out.replace(/\s+$/, "").split(/\r?\n/)) L.push("  " + line) }
  });
  L.push("-".repeat(40));
  let crlf = false;
  try { crlf = fs.readFileSync(path.join(repo, "index.html")).includes("\r\n") } catch (e) { crlf = false }
  if (failed.length && crlf) L.push("提示：index.html 是 CRLF 換行。Windows 的 git 設了 core.autocrlf=true 時，clone 下來的文字檔會被轉成 CRLF，雜湊就對不上；請用 git -c core.autocrlf=false clone 重新取一份再跑。");
  L.push(`總結：${results.length} 步，通過 ${results.filter(r => r.status === "通過").length}、失敗 ${failed.length}、略過 ${skipped.length}`
    + (failed.length ? `（失敗：${failed.map(r => r.id).join("、")}）` : "") + (skipped.length ? `（略過：${skipped.map(r => r.id).join("、")}）` : ""));
  L.push(failed.length ? "✘ 有核對沒通過" : skipped.length ? "✔ 跑了的都通過；有略過的步驟，見上面原因" : "✔ 全部通過");
  const text = scrub(L.join("\n")) + "\n";
  return { code: failed.length ? 1 : 0, text, results, facts };
}

module.exports = { verifyAll, plan, treeHash, scrubber, findRepo, STEPS };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  const list = k => (opt(k) || "").split(",").map(s => s.trim()).filter(Boolean);
  const bad = [...list("--only"), ...list("--skip")].filter(s => !STEPS.includes(s));
  if (bad.length) { console.log("不認得的步驟：" + bad.join("、") + "（可用：" + STEPS.join("、") + "）"); process.exit(2) }
  const repo = findRepo(opt("--repo"));
  if (!repo || !fs.existsSync(path.join(repo, "source"))) {
    console.log("找不到公開倉庫（要有 source/ 和 release.json）。在倉庫根目錄跑 node source/xiangqi-lab/tools/verify-all.js，或加 --repo <資料夾>");
    process.exit(2);
  }
  const r = verifyAll({ repo, record: opt("--record"), note: opt("--note"), only: opt("--only") ? list("--only") : null, skip: list("--skip"), timeout: Number(opt("--timeout")) || 1800 });
  process.stdout.write(r.text);
  const out = opt("--out");
  if (out) { fs.writeFileSync(out, r.text); console.log("紀錄寫到：" + out) }
  process.exit(r.code);
}
