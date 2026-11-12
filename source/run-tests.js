#!/usr/bin/env node
// 象棋千秋：重跑自動測試
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 用法（在倉庫根目錄，需要 Node.js 20 以上；不用裝任何套件、不連網、不開瀏覽器）：
//   node source/run-tests.js                     全部跑一遍，印出每個檔三類（行為／混合／原始碼比對）各幾項、通過幾項
//   node source/run-tests.js test-ruleset.js ... 只跑指定的檔（node --test 的原始輸出）
//
// 測試原本寫在開發者電腦的資料夾配置上（xiangqi-db/、xiangqi-lab/src、xiangqi-lab/tools、xiangqi-lab/site＝這個倉庫的根目錄）。
// 這支會在系統暫存資料夾組出同樣的配置：source/ 底下的檔案複製過去，xiangqi-lab/site 與 xiangqi-db/art/docs
// 用目錄連結指回這個倉庫（只讀用；測試不會寫進倉庫），跑完把暫存資料夾刪掉。
// 千秋盃金鑰測試用的金鑰一律放暫存資料夾（XQ_CUP_KEY_DIR），不會碰你使用者資料夾裡的任何檔。
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const SRC = __dirname, REPO = path.resolve(SRC, "..");
const WS = fs.mkdtempSync(path.join(os.tmpdir(), "xqoss-")), KEYS = fs.mkdtempSync(path.join(os.tmpdir(), "xqoss-key-"));
const links = [];
const link = (target, at) => { fs.mkdirSync(path.dirname(at), { recursive: true }); fs.symlinkSync(target, at, process.platform === "win32" ? "junction" : "dir"); links.push(at) };
let code = 0;
try {
  fs.cpSync(path.join(SRC, "xiangqi-db"), path.join(WS, "xiangqi-db"), { recursive: true });
  fs.cpSync(path.join(SRC, "xiangqi-lab"), path.join(WS, "xiangqi-lab"), { recursive: true });
  fs.copyFileSync(path.join(SRC, "xiangqi-referee.js"), path.join(WS, "xiangqi-referee.js"));
  link(REPO, path.join(WS, "xiangqi-lab", "site"));
  if (fs.existsSync(path.join(REPO, "data", "docs"))) link(path.join(REPO, "data", "docs"), path.join(WS, "xiangqi-db", "art", "docs"));
  const env = { ...process.env, XQ_CUP_KEY_DIR: KEYS, XQ_CUP_LEGACY_DIR: KEYS };
  const T = path.join(WS, "xiangqi-lab", "tools"), files = process.argv.slice(2);
  const r = files.length
    ? cp.spawnSync(process.execPath, ["--test", ...files], { cwd: T, env, stdio: "inherit" })
    : cp.spawnSync(process.execPath, [path.join(T, "testkinds.js")], { cwd: T, env, stdio: "inherit" });
  code = r.status == null ? 1 : r.status;
} finally {
  for (const l of links) { try { fs.unlinkSync(l) } catch (e) { try { fs.rmdirSync(l) } catch (e2) { } } }   // 先拆連結，才不會刪到倉庫本身
  if (!links.some(l => fs.existsSync(l))) fs.rmSync(WS, { recursive: true, force: true });
  fs.rmSync(KEYS, { recursive: true, force: true });
}
process.exit(code);
