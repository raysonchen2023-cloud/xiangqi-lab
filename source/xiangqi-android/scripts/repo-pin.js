// 象棋千秋 Android：送審用的設定檔要跟 origin/main 那份一模一樣（W69 流程盤點第 5 項，PR #58 審查，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：p0-gate.js 認倉庫 .github/p0-waivers.json、check-3d.js 認 .github/p0-known.json，原本只比路徑；
//   在本機工作區直接改這兩份、不開 PR，豁免和已知問題照樣算數，等於繞過逐行審（iMac Claude 2 審 #58）。
// 做法：先 git fetch origin main，再拿 git show origin/main:<路徑> 跟本機檔逐位元組比；不一樣、抓不到、不在 git 倉庫裡都不算數。
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");

const realGit = (args, cwd) => cp.execFileSync("git", args, { cwd, stdio: ["ignore", "pipe", "pipe"], timeout: 60000, maxBuffer: 20e6 });

/* file＝本機檔的路徑；git(args, cwd) 回傳 Buffer（測試可注入）。回傳 { ok, msg } */
function sameAsMain(file, git = realGit) {
  const dir = path.dirname(path.resolve(file));
  let root;
  try { root = String(git(["rev-parse", "--show-toplevel"], dir)).trim() } catch (e) { return { ok: false, msg: `${file} 不在 git 倉庫裡，沒辦法確認它跟 origin/main 一樣` } }
  const rel = path.relative(root, path.resolve(file)).split(path.sep).join("/");
  try { git(["fetch", "-q", "origin", "main"], root) } catch (e) { return { ok: false, msg: "git fetch origin main 失敗（連不上？）：沒辦法確認 " + rel + " 是審過的那一份" } }
  let main;
  try { main = Buffer.from(git(["show", "origin/main:" + rel], root)) } catch (e) { return { ok: false, msg: `origin/main 沒有 ${rel}：本機這份沒經過 PR 審查` } }
  let local;
  try { local = fs.readFileSync(file) } catch (e) { return { ok: false, msg: "讀不到 " + file } }
  if (!local.equals(main)) return { ok: false, msg: `${rel} 跟 origin/main 那份不一樣：本機改過、沒經過 PR 逐行審的不算數（要改請開 PR）` };
  return { ok: true, msg: `${rel} 跟 origin/main 一模一樣` };
}

module.exports = { sameAsMain };
