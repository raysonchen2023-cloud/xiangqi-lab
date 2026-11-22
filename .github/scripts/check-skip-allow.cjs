#!/usr/bin/env node
// 象棋千秋 CI：略過白名單本身的檢查（W69 流程盤點高 7，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：.github/test-skip-allow.json 有 151 條，很多寫「公開副本不含」，可是 iOS 專案、隱私頁其實都在倉庫裡；
//   白名單只比對「這次的略過有沒有登記」，不管「登記的理由還成不成立」，也不管它越長越多。
// 檢查（check-test-skips.cjs 照舊比對這次的略過；這支只看白名單本身，不用跑測試）：
//   ① 每一條都要在 missing 寫出缺的檔（倉庫根目錄起算的路徑，至少一個）；
//      每個路徑在倉庫裡都要真的不存在（沒被 git 追蹤、磁碟上也沒有），
//      而且檔名（最後一段；或去掉副檔名、至少 4 個字的主檔名）要出現在那支測試的原始碼裡：寫一個不存在的路徑交差，抓得到
//   ② missing 裡不能有白名單沒有的條目（舊的要一起刪）
//   ③ 只能減、不能增：跟基準（main）那一版比，總數不能變多；基準還沒有的測試檔（新的檔）不能有略過
//      （改寫原因、把原本沒驗的條件式拆成明列的略過可以，但總數要靠別處真的跑起來補回來）
// 用法：node .github/scripts/check-skip-allow.cjs --base <git 參照，例如 origin/main> [--allow .github/test-skip-allow.json] [--tests source/xiangqi-lab/tools]
// 結束代碼：0 都對；1 有條目不成立或變多；2 用法錯誤、讀不到檔、格式不對、讀不到基準
"use strict";
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");

/* 條目「檔名：項目（原因）」的檔名 */
const fileOf = (e) => { const m = /^(test-[^：]+\.js)：/.exec(String(e)); return m ? m[1] : null };
const tally = (list) => { const o = {}; for (const e of list) { const f = fileOf(e) || "（看不出檔名）"; o[f] = (o[f] || 0) + 1 } return o };

/* 純函式：allow＝這一版的條目；missing＝{條目: [路徑…]}；baseAllow＝基準那一版的條目；
   baseHas(檔名)＝基準有沒有這支測試檔；tracked(p)＝倉庫有沒有追蹤這個路徑（含資料夾底下有檔）；onDisk(p)＝磁碟上有沒有；src(檔名)＝測試原始碼（讀不到回 null） */
function judge({ allow, missing, baseAllow, baseHas, tracked, onDisk, src }) {
  const bad = [];
  for (const e of allow) {
    const f = fileOf(e), ps = missing && Object.prototype.hasOwnProperty.call(missing, e) ? missing[e] : null;
    if (!f) { bad.push(`看不出是哪支測試檔：${e}`); continue }
    if (!Array.isArray(ps) || !ps.length || ps.some((p) => typeof p !== "string" || !p.trim())) { bad.push(`沒寫缺哪個檔（missing）：${e}`); continue }
    const S = src(f);
    if (S == null) { bad.push(`找不到測試檔 ${f}：${e}`); continue }
    for (const p of ps) {
      const q = p.replace(/\\/g, "/").replace(/\/+$/, "");
      if (/^\/|^[A-Za-z]:|(^|\/)\.\.(\/|$)/.test(q)) { bad.push(`缺檔路徑要從倉庫根目錄寫起、不能有 ..：${p}（${e}）`); continue }
      if (tracked(q) || onDisk(q)) { bad.push(`說缺 ${q}，可是倉庫裡有：這項應該真的跑（${e}）`); continue }
      const base = q.split("/").pop(), stem = base.replace(/\.[^.]+$/, "");   /* 測試常用程式拼檔名（"x_" + 名字 + ".glb"）：主檔名（去掉副檔名、至少 4 個字）出現也算 */
      if (!S.includes(base) && !(stem.length >= 4 && S.includes(stem))) bad.push(`缺檔 ${q} 的檔名「${base}」沒出現在 ${f} 裡：看不出測試真的要讀它（${e}）`);
    }
  }
  const A = new Set(allow);
  for (const k of Object.keys(missing || {})) if (!A.has(k)) bad.push(`missing 有、白名單沒有（舊的要一起刪）：${k}`);
  const grew = [];
  if (allow.length > baseAllow.length) grew.push(`總數 ${baseAllow.length} → ${allow.length}`);
  for (const [f, n] of Object.entries(tally(allow))) if (!baseHas(f)) grew.push(`${f}：基準還沒有這支檔，這一版就有 ${n} 條略過（新的測試檔不能靠略過過關）`);
  return { bad, grew, ok: !bad.length && !grew.length };
}

module.exports = { judge, fileOf, tally };
if (require.main !== module) return;

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d };
const BASE = opt("--base"), ALLOW = opt("--allow", path.join(".github", "test-skip-allow.json")), TESTS = opt("--tests", path.join("source", "xiangqi-lab", "tools"));
if (!BASE) { console.error("用法：node .github/scripts/check-skip-allow.cjs --base <git 參照> [--allow 白名單] [--tests 測試資料夾]"); process.exit(2) }
const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8", maxBuffer: 64e6, stdio: ["ignore", "pipe", "pipe"] });
const parse = (s, what) => { const j = JSON.parse(s); if (!Array.isArray(j.allow)) throw new Error(what + " 缺 allow 陣列"); if (j.missing != null && (typeof j.missing !== "object" || Array.isArray(j.missing))) throw new Error(what + " 的 missing 要是物件"); return j };
let cur, baseAllow, files;
try { cur = parse(fs.readFileSync(ALLOW, "utf8"), ALLOW) } catch (e) { console.error("✘ 讀不到白名單或格式不對：" + e.message); process.exit(2) }
try { baseAllow = parse(git("show", `${BASE}:${ALLOW.replace(/\\/g, "/")}`), BASE + " 的白名單").allow } catch (e) { console.error("✘ 讀不到基準 " + BASE + " 的白名單（不能當成沒有變多）：" + String(e.message).split("\n")[0]); process.exit(2) }
try { files = git("ls-files", "-z").split("\0").filter(Boolean) } catch (e) { console.error("✘ 讀不到 git 追蹤的檔案清單"); process.exit(2) }
const T = new Set(files), tracked = (p) => T.has(p) || files.some((f) => f.startsWith(p + "/"));
let baseFiles; try { baseFiles = new Set(git("ls-tree", "-r", "--name-only", "-z", BASE, "--", TESTS.replace(/\\/g, "/")).split("\0").filter(Boolean).map((p) => p.split("/").pop())) } catch (e) { console.error("✘ 讀不到基準 " + BASE + " 的測試檔清單"); process.exit(2) }
const r = judge({ allow: cur.allow, missing: cur.missing || {}, baseAllow, baseHas: (f) => baseFiles.has(f), tracked, onDisk: (p) => fs.existsSync(p), src: (f) => { try { return fs.readFileSync(path.join(TESTS, f), "utf8") } catch (e) { return null } } });
console.log(`略過白名單檢查：這一版 ${cur.allow.length} 條（基準 ${BASE} ${baseAllow.length} 條）`);
if (r.bad.length) console.error(`✘ ${r.bad.length} 條不成立：\n` + r.bad.map((x) => "  － " + x).join("\n"));
if (r.grew.length) console.error("✘ 白名單只能減、不能增（W69 盤點高 7）：\n" + r.grew.map((x) => "  － " + x).join("\n") + "\n  要嘛讓測試真的跑；確定跑不了，總數也不能比基準多。");
if (r.ok) console.log("✔ 每一條都寫了缺哪個檔、那些檔在倉庫裡真的沒有；條數沒有變多");
process.exit(r.ok ? 0 : 1);
