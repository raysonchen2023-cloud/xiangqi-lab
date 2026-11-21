// 私密掃描補強（W36 第二輪審查 2，iMac Claude 2）：source/ 全掃之外，把本 PR 新增或修改後的所有檔（不限資料夾）
// 複製到暫存資料夾（保留相對路徑），用 oss-scan 再掃一次。沒有改到的檔就略過。
// 用法：node .github/scripts/scan-changed.cjs <比較基準> <暫存資料夾>
//   掃描工具位置可用環境變數 OSS_SCAN 指定（預設 source/xiangqi-lab/tools/oss-scan.js，自我測試會用到）
"use strict";
const { execFileSync, spawnSync } = require("child_process");
const fs = require("fs"), path = require("path");
const [base = "origin/main", out] = process.argv.slice(2);
if (!out) { console.log("用法：node scan-changed.cjs <比較基準> <暫存資料夾>"); process.exit(2); }
const scanner = path.resolve(process.env.OSS_SCAN || "source/xiangqi-lab/tools/oss-scan.js");
const files = execFileSync("git", ["-c", "core.quotePath=false", "diff", "--name-only", "-z", "--no-renames", "--diff-filter=AM", `${base}...HEAD`])
  .toString().split("\0").filter(f => f && fs.existsSync(f) && fs.statSync(f).isFile());
if (!files.length) { console.log("本 PR 沒有新增或修改的檔，略過"); process.exit(0); }
fs.rmSync(out, { recursive: true, force: true });
for (const f of files) { const d = path.join(out, f); fs.mkdirSync(path.dirname(d), { recursive: true }); fs.copyFileSync(f, d); }
console.log(`複製 ${files.length} 個改到的檔到暫存資料夾，交給 oss-scan 掃`);
const r = spawnSync(process.execPath, [scanner, out], { stdio: "inherit" });
fs.rmSync(out, { recursive: true, force: true });
process.exit(r.status === null ? 1 : r.status);
