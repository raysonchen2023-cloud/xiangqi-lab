/* 象棋千秋：同時跑測試檔的工作池（W189 第二步，11/28 Windows Claude 2）
   Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later

   為什麼：testkinds.js 把約 380 支測試檔一支一支跑（execFileSync），CI 的完整驗證大半時間只用到一個核心。
   這支只負責「同時跑、結果照原本順序排回」，怎麼跑一支檔、怎麼解析 TAP、怎麼分類都由呼叫的人（testkinds.js）傳進來，
   計數規則照 testkinds.js 的 tally() 抄一份（todo 另計、略過不算通過），兩邊要一致（test-test-pool-1128.js 拿同一份項目比對）。
   拆 PR 的順序（AGENTS.md「guard-base 紅燈不越過」：改守門程式又有測試要靠新版才會過，要拆成依序合併的 PR）：
     ① 這支模組＋它自己的測試（testkinds.js 還沒接上，行為不變）
     ② testkinds.js 直接執行時改用 runPool
     ③ 把這支加進 .github/scripts/base-guard.cjs 的 GUARD 清單
   用法：const { runPool, testJobs } = require("./test-pool.js");
     await runPool({ list, jobs, run: async (file, env) => [{name, ok, skip, todo, why}], kindOf, KINDS, env })
     ・list：測試檔名，結果照這個順序。
     ・jobs：同時跑幾支（正整數）；testJobs(env) 照環境變數 XQ_TEST_JOBS 或 CPU 核心數算。
     ・env：要給每支檔的環境變數底稿（預設 process.env）。有 XQ_CUP_KEY_DIR 的話，每支檔在它底下各開一個子資料夾當
       XQ_CUP_KEY_DIR（有 XQ_CUP_LEGACY_DIR 就一起指過去），跑完刪掉——千秋盃金鑰測試同時跑會互相蓋掉同一個檔。
   回傳 { files:[{file, items:[{...項目, kind}], n, ms}], total }，格式跟 testkinds.js 的 tally("run") 一樣。 */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os");

/* 同時跑幾支：XQ_TEST_JOBS（正整數）；沒給就照 CPU 核心數，至少 1 */
function testJobs(env = process.env) {
  const v = env.XQ_TEST_JOBS;
  if (v != null && v !== "") { const n = Number(v); if (!Number.isInteger(n) || n < 1) throw new Error("XQ_TEST_JOBS 要是正整數：" + v); return n }
  return Math.max(1, typeof os.availableParallelism === "function" ? os.availableParallelism() : os.cpus().length);
}

async function runPool({ list, jobs, run, kindOf, KINDS, env = process.env }) {
  if (!Array.isArray(list) || typeof run !== "function" || typeof kindOf !== "function" || !Array.isArray(KINDS)) throw new Error("runPool 參數不齊");
  if (!Number.isInteger(jobs) || jobs < 1) throw new Error("jobs 要是正整數：" + jobs);
  const z = () => Object.assign(Object.fromEntries(KINDS.map((k) => [k, { all: 0, pass: 0, skip: 0 }])), { todo: { all: 0, xpass: 0 } });
  const out = new Array(list.length), keyBase = env.XQ_CUP_KEY_DIR, legBase = env.XQ_CUP_LEGACY_DIR;
  let next = 0;
  const one = async (i) => {
    const file = list[i], e = { ...env };
    let own = null;
    if (keyBase) { own = fs.mkdtempSync(path.join(keyBase, "f" + i + "-")); e.XQ_CUP_KEY_DIR = own; if (legBase) e.XQ_CUP_LEGACY_DIR = own }
    const t0 = Date.now();
    try { const items = (await run(file, e)).map((x) => ({ ...x, kind: kindOf(file, x.name) })); out[i] = { file, items, ms: Date.now() - t0 } }
    finally { if (own) fs.rmSync(own, { recursive: true, force: true }) }
  };
  const worker = async () => { while (next < list.length) await one(next++) };
  await Promise.all(Array.from({ length: Math.min(jobs, list.length) }, worker));
  /* 計數：跟 testkinds.js tally() 同一套規則（todo 另計；略過不算通過） */
  const total = z(), files = [];
  for (const r of out) {
    const n = z();
    for (const it of r.items) for (const o of [n, total]) { if (it.todo) { o.todo.all++; if (it.ok) o.todo.xpass++; continue } o[it.kind].all++; if (it.skip) o[it.kind].skip++; else if (it.ok) o[it.kind].pass++ }
    files.push({ file: r.file, items: r.items, n, ms: r.ms });
  }
  return { files, total };
}
module.exports = { runPool, testJobs };
