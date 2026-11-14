#!/usr/bin/env node
// 象棋千秋：紅藍隊攻擊重現，逐案列「攻擊、正常對照、預期、實際」（案例在 redblue-cases.js；node:test 版是 test-redblue-public.js）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 用法：
//   node source/xiangqi-lab/tools/redblue-run.js --repo .        在公開倉庫根目錄：對發布版的 source/ 跑（照 run-tests.js 在暫存資料夾組出開發時的資料夾配置）
//   node xiangqi-lab/tools/redblue-run.js                        開發者電腦：對工作區跑（可能含還沒發布的修改）
//   其他：--only R02-A,R05-wire  --json  --strict
// 判定：通過（已修、攻擊被擋）／預期失敗（還沒修，攻擊照樣成功，照實列出）／預期失敗卻通過（可能修好了，要把那一案改成 blocked）／回歸（已修的又被打穿）／對照失敗（功能本身壞了）
// 結束代碼：0＝每一案都跟預期一樣（還沒修的照樣失敗也算 0，表格會列出來）；1＝有回歸或對照失敗；3＝有「預期失敗卻通過」；
//           加 --strict：只要還有沒修的漏洞就是 1（給「全部修好才算數」的檢查用）；2＝用法錯誤
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process");
const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };

if (opt("--repo")) {
  /* 在暫存資料夾組出開發時的資料夾配置（跟 source/run-tests.js 一樣），再用那裡的這支程式跑 */
  const REPO = path.resolve(opt("--repo")), SRC = path.join(REPO, "source");
  if (!fs.existsSync(path.join(SRC, "xiangqi-lab", "tools", "redblue-cases.js"))) { console.log("找不到 " + path.join(SRC, "xiangqi-lab", "tools", "redblue-cases.js")); process.exit(2) }
  const WS = fs.mkdtempSync(path.join(os.tmpdir(), "xqrb-")), links = [];
  const link = (t, at) => { fs.mkdirSync(path.dirname(at), { recursive: true }); fs.symlinkSync(t, at, process.platform === "win32" ? "junction" : "dir"); links.push(at) };
  let code = 2;
  try {
    fs.cpSync(path.join(SRC, "xiangqi-db"), path.join(WS, "xiangqi-db"), { recursive: true });
    fs.cpSync(path.join(SRC, "xiangqi-lab"), path.join(WS, "xiangqi-lab"), { recursive: true });
    fs.copyFileSync(path.join(SRC, "xiangqi-referee.js"), path.join(WS, "xiangqi-referee.js"));
    link(REPO, path.join(WS, "xiangqi-lab", "site"));
    const rest = a.filter((x, i) => x !== "--repo" && a[i - 1] !== "--repo");
    const r = cp.spawnSync(process.execPath, [path.join(WS, "xiangqi-lab", "tools", "redblue-run.js"), ...rest, "--label", "發布版 source/（" + (JSON.parse(fs.readFileSync(path.join(REPO, "release.json"), "utf8")).version || "?") + "）"], { stdio: "inherit" });
    code = r.status == null ? 1 : r.status;
  } finally {
    for (const l of links) { try { fs.unlinkSync(l) } catch (e) { try { fs.rmdirSync(l) } catch (e2) { } } }   /* 先拆連結，才不會刪到倉庫本身 */
    if (!links.some(l => fs.existsSync(l))) fs.rmSync(WS, { recursive: true, force: true });
  }
  process.exit(code);
}

const { CASES, runCase } = require("./redblue-cases.js");
(async () => {
  const only = String(opt("--only") || "").split(",").filter(Boolean), list = only.length ? CASES.filter(c => only.includes(c.id)) : CASES;
  if (!list.length) { console.log("沒有這些案例：" + only.join("、")); process.exit(2) }
  const out = [];
  for (const c of list) { try { out.push(Object.assign({ title: c.title, threat: c.threat }, await runCase(c))) } catch (e) { out.push({ id: c.id, title: c.title, expect: c.expect, status: "對照失敗", error: String(e && e.stack || e).split("\n").slice(0, 3).join(" ") }) } }
  const label = opt("--label") || "工作區";
  if (a.includes("--json")) console.log(JSON.stringify({ target: label, node: process.version, cases: out }, null, 1));
  else {
    console.log(`紅藍隊攻擊重現（對象：${label}；Node ${process.version}；不連網、假伺服器＋假時鐘）\n`);
    for (const r of out) {
      const c = CASES.find(x => x.id === r.id);
      const mark = { "通過": "✔", "預期失敗": "⚠", "預期失敗卻通過": "？", "回歸": "✘", "對照失敗": "✘" }[r.status] || "✘";
      console.log(`${mark} ${r.id}（威脅模型 ${c.threat}）${c.title}`);
      console.log(`    攻擊：${c.attack}`);
      console.log(`    對照：${c.control}${r.control ? "　→ " + (r.controlOk ? "正常" : "不正常") : ""}`);
      console.log(`    預期：${c.expect === "blocked" ? "擋住" : "還沒修（攻擊會成功）"}；${c.expected}`);
      console.log(`    實際：${r.error ? "執行錯誤 " + r.error : r.attackSucceeded ? "攻擊成功" : "擋住"}　判定：${r.status}${r.ms != null ? "（" + r.ms + " 毫秒）" : ""}`);
      if (r.detail) console.log(`    紀錄：${JSON.stringify(r.detail)}`);
      if (c.why && r.status !== "通過") console.log(`    為什麼還沒修：${c.why}`);
      console.log("");
    }
    const n = k => out.filter(r => r.status === k).length;
    console.log(`合計 ${out.length} 案：通過 ${n("通過")}、預期失敗（還沒修）${n("預期失敗")}、預期失敗卻通過 ${n("預期失敗卻通過")}、回歸 ${n("回歸")}、對照失敗 ${n("對照失敗")}`);
  }
  const bad = out.some(r => r.status === "回歸" || r.status === "對照失敗"), xpass = out.some(r => r.status === "預期失敗卻通過"), open = out.some(r => r.status === "預期失敗");
  process.exit(bad ? 1 : xpass ? 3 : a.includes("--strict") && open ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1) });
