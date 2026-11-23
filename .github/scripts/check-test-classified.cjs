#!/usr/bin/env node
// 象棋千秋 CI：新增的測試檔一定要分類（W60 第 1 期 A3，2026-11-21）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// testkinds.js 把測試分成行為／混合／原始碼比對三類，交接單與評比都引用這三個數字。
// 沒列進 CLASSIFIED 的檔全部算「待分類」，第 21 輪評比時約四成測試沒分類，三類數字就不可信。
// 既有的待分類檔另開工單慢慢清；這支只管「這個 PR 新加的測試檔」：沒列進 CLASSIFIED（或同時列在 PENDING）就紅燈。
// 用法：node .github/scripts/check-test-classified.cjs <比較基準，例如 origin/main>
// 結束代碼：0 新增的都分類了（或沒有新增）；1 有新增的沒分類；2 git 或 testkinds.js 讀不到
"use strict";
const path = require("path"), cp = require("child_process");
const TOOLS = path.join("source", "xiangqi-lab", "tools");

/* 2026-11-23（#95，W60 A3 漏洞）：原本用正規式掃 testkinds.js 原文，註解裡、if (false) 裡、之後被 .delete 或 .filter 拿掉的檔名都算「已登記」。
   iMac Claude 2 審 #85 時發現（#74 一行註解結尾少一個 /，後面整段登記被吃掉，CI 照樣綠）；#95 複審也指出掃原文怎麼補都會漏。
   現在照工單：在子程序裡真的 require testkinds.js（verify 和 base-guard 本來就會執行它，不多出風險），取出它匯出的 CLASSIFIED、PENDING，
   跟 testkinds 自己統計時同一個判定：CLASSIFIED.has(f) 而且 !PENDING.has(f)。
   防冒充：兩個都要是真正的內建 Set（原型是 Set.prototype、物件上沒有自己加的屬性，例如蓋掉 has），內容用 Set.prototype.values 取，每一項都要是 test-*.js 字串。
   讀不到、逾時、匯出不對、格式不對：一律回 null＝讀不懂，結束碼 2，不能當通過。 */
const LOADER = `
const m = require(process.argv[1]);
const real = (s) => s != null && Object.getPrototypeOf(s) === Set.prototype && Object.getOwnPropertyNames(s).length === 0 && Object.getOwnPropertySymbols(s).length === 0;
if (!m || !real(m.CLASSIFIED) || !real(m.PENDING)) { process.stdout.write("null"); process.exit(0) }
const take = (s) => Array.from(Set.prototype.values.call(s));
process.stdout.write(JSON.stringify({ classified: take(m.CLASSIFIED), pending: take(m.PENDING) }));
`;
function loadKinds(file, run = (args) => cp.spawnSync(process.execPath, args, { encoding: "utf8", timeout: 30000, env: { ...process.env, NODE_TEST_CONTEXT: "" } })) {
  const r = run(["-e", LOADER, path.resolve(file)]);
  if (!r || r.error || r.status !== 0 || typeof r.stdout !== "string") return null;
  let o;
  try { o = JSON.parse(r.stdout) } catch (e) { return null }
  const ok = (a) => Array.isArray(a) && a.every((x) => typeof x === "string" && /^test-[^/\\]+\.js$/.test(x));
  if (!o || !ok(o.classified) || !ok(o.pending)) return null;
  return { classified: new Set(o.classified), pending: new Set(o.pending) };
}

/* 已登記＝跟 testkinds 統計時一樣：在 CLASSIFIED 裡、而且不在 PENDING */
function registered(k) { return new Set([...k.classified].filter((f) => !k.pending.has(f))) }

/* 這個 PR 新增的測試檔（只算新加的，改名、修改不算） */
function addedTests(base, git = (...a) => cp.execFileSync("git", a, { encoding: "utf8" })) {
  /* --no-renames：PR #19 審查（iMac）——把已分類的檔改名成新名字，原本會被當成「改名」而不算新增，可以繞過分類檢查 */
  const out = git("diff", "--name-only", "--no-renames", "--diff-filter=A", base + "...HEAD", "--", TOOLS.split(path.sep).join("/"));
  return out.split("\n").map(s => s.trim()).filter(f => /\/test-[^/]+\.js$/.test(f)).map(f => f.split("/").pop());
}

function check(added, set) { return added.filter(f => !set.has(f)) }

if (require.main === module) {
  const base = process.argv[2];
  if (!base) { console.error("用法：node .github/scripts/check-test-classified.cjs <比較基準>"); process.exit(2) }
  let added;
  const k = loadKinds(path.join(TOOLS, "testkinds.js"));
  if (!k || !k.classified.size) { console.error("載入 testkinds.js 取不到 CLASSIFIED／PENDING（讀不到、逾時、匯出格式變了或不是內建 Set）：不能當成通過"); process.exit(2) }
  const set = registered(k);
  try { added = addedTests(base) } catch (e) { console.error("git diff 失敗：" + e.message); process.exit(2) }
  const bad = check(added, set);
  console.log(`測試分類：這個 PR 新增 ${added.length} 支測試檔，已分類清單有 ${set.size} 支（CLASSIFIED ${k.classified.size}、PENDING ${k.pending.size}）`);
  if (bad.length) {
    console.error(`新增的測試檔沒分類（${bad.length} 支）：\n` + bad.map(f => "  － " + f).join("\n"));
    console.error("請在 source/xiangqi-lab/tools/testkinds.js 的 CLASSIFIED 加一行（不要同時放在 PENDING），並把每一項的名稱照規則標〔原始碼〕或〔混合〕（行為的不用標），註明各幾項。");
    process.exit(1);
  }
  process.exit(0);
}
module.exports = { loadKinds, registered, addedTests, check };
