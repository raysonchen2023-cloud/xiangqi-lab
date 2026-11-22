#!/usr/bin/env node
// 象棋千秋 CI：預期失敗（todo）稽核——這次跑出來的每一條 todo 都要在白名單裡，白名單只能減不能加（W69 流程盤點第 9 項，2026-11-22）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：testkinds.js 把 node:test 的 todo（「預期失敗」，給還沒修的漏洞用）另外計，todo 失敗不算失敗、也不進略過清單。
//   所以任何一項會失敗的測試，只要加上 { todo: true } 就從紅燈變綠燈，是略過白名單以外的第二個逃生口。
// 做法：讀完整驗證的逐項結果（verify-all.js --tally-out 的 JSON），跟 .github/test-todo-allow.json 比：
//   - 有一條 todo 不在白名單 → 紅燈（要嘛修好、要嘛當一般測試讓它紅）
//   - 白名單比比較基準（main）那一版多出條目 → 紅燈：白名單只能減不能加（盤點第 9 項「數量不准增加」）；要放寬得改這支規則，改 .github/ 要逐行審
//   - 讀不到逐項結果、或逐項 todo 條數跟總結對不上 → 測不成立（結束代碼 2），不能當成通過
//   - 白名單裡有、這次沒出現的 → 只提醒（漏洞修好了，白名單可以刪）
//   「預期失敗卻通過」本來就由 testkinds.js 判失敗，這裡不重複。
// 用法：node .github/scripts/check-test-todos.cjs <tally.json> [--base origin/main] [--allow .github/test-todo-allow.json]
// 結束代碼：0 全部在白名單、白名單沒變多；1 有新的 todo 或白名單變多；2 讀不到、格式不對、條數對不上、比較基準讀不到
"use strict";
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const ALLOW = ".github/test-todo-allow.json";

/* 逐項結果 → todo 清單（每條「檔名：項目」）；格式不對回 null；條數跟總結對不上回 {mismatch} */
function todoItems(t) {
  if (!t || !Array.isArray(t.files) || !t.total || !t.total.todo || typeof t.total.todo.all !== "number") return null;
  const items = t.files.flatMap((f) => (Array.isArray(f.items) ? f.items : []).filter((x) => x && x.todo).map((x) => `${f.file}：${x.name}`));
  return items.length === t.total.todo.all ? { items, total: t.total.todo.all } : { mismatch: true, items, total: t.total.todo.all };
}

function readAllow(text) {
  const o = JSON.parse(text);
  if (!o || !Array.isArray(o.allow) || !o.allow.every((x) => typeof x === "string")) throw new Error("缺 allow 字串陣列");
  return o.allow;
}

/* added＝這次的 todo 不在白名單；gone＝白名單有、這次沒出現；grew＝白名單比基準多出的條目 */
function compare(items, allow, baseAllow) {
  const A = new Set(allow), S = new Set(items), B = new Set(baseAllow);
  return { added: [...new Set(items.filter((x) => !A.has(x)))], gone: allow.filter((x) => !S.has(x)), grew: allow.filter((x) => !B.has(x)) };
}

/* 主流程（可注入讀檔與 git，自我測試用）：回傳結束代碼 */
function run({ tallyFile, base = "origin/main", allowFile = ALLOW, read = (f) => fs.readFileSync(f, "utf8"), git, log = console.log, err = console.error }) {
  let t, allow, baseAllow;
  try { t = JSON.parse(read(tallyFile)) } catch (e) { err("讀不到逐項結果：" + tallyFile + "（測試可能沒跑，不能當成通過）"); return 2 }
  const td = todoItems(t);
  if (!td) { err("逐項結果格式不對（缺 files 或 total.todo）：不能當成通過"); return 2 }
  if (td.mismatch) { err(`逐項 todo ${td.items.length} 條跟總結 ${td.total} 條對不上：格式可能變了，不能當成通過`); return 2 }
  try { allow = readAllow(read(allowFile)) } catch (e) { err("白名單讀不到或格式不對：" + allowFile + "（" + e.message + "）"); return 2 }
  /* 比較基準那一版的白名單：基準還沒有這個檔（本規則第一次上線）就當空的；其他 git 錯誤一律缺驗 */
  let has = true;
  try { git("cat-file", "-e", `${base}:${allowFile}`) } catch (e) { has = false }
  try { baseAllow = has ? readAllow(git("show", `${base}:${allowFile}`)) : [] } catch (e) { err("讀不到比較基準 " + base + " 的白名單：" + e.message); return 2 }
  const r = compare(td.items, allow, baseAllow);
  log(`todo 稽核：這次預期失敗 ${td.total} 項，白名單 ${allow.length} 項（${base} 那一版 ${baseAllow.length} 項）`);
  if (r.gone.length) log(`提醒：白名單有 ${r.gone.length} 項這次沒出現（漏洞修好了，可以從白名單刪掉）：\n` + r.gone.map((x) => "  ＋ " + x).join("\n"));
  let bad = 0;
  if (r.grew.length) { bad = 1; err(`todo 白名單只能減不能加：比 ${base} 多了 ${r.grew.length} 條：\n` + r.grew.map((x) => "  － " + x).join("\n")) }
  if (r.added.length) {
    bad = 1;
    err(`todo 稽核：${r.added.length} 項預期失敗不在白名單（todo 不算失敗，不能拿來把紅燈藏起來）：\n` + r.added.map((x) => "  － " + x).join("\n"));
    err("要嘛修好，要嘛拿掉 todo 讓它照實失敗；todo 白名單只能減不能加（W69 流程盤點第 9 項）。");
  }
  return bad;
}

module.exports = { todoItems, readAllow, compare, run, ALLOW };
if (require.main !== module) return;

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d };
const tallyFile = args.find((x, i) => !x.startsWith("--") && !["--base", "--allow"].includes(args[i - 1]));
if (!tallyFile) { console.error("用法：node .github/scripts/check-test-todos.cjs <tally.json> [--base origin/main] [--allow 白名單]"); process.exit(2) }
const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
process.exit(run({ tallyFile, base: opt("--base", "origin/main"), allowFile: opt("--allow", ALLOW), git }));
