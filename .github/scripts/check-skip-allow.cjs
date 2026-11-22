#!/usr/bin/env node
// 象棋千秋 CI：略過白名單本身的檢查（W69 流程盤點高 7，2026-11-23）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later
//
// 為什麼：.github/test-skip-allow.json 有 151 條，很多寫「公開副本不含」，可是 iOS 專案、隱私頁其實都在倉庫裡；
//   白名單只比對「這次的略過有沒有登記」，不管「登記的理由還成不成立」，也不管它越長越多。
// 檢查（check-test-skips.cjs 照舊比對這次的略過；這支只看白名單本身，不用跑測試）：
//   ① 每一條都要寫出缺的檔，至少一個：
//      missing＝倉庫裡的路徑（倉庫根目錄起算，第一段要是倉庫真的有的頂層資料夾，例如 source/、data/），在倉庫裡都要真的不存在（沒被 git 追蹤、磁碟上也沒有）；
//      outside＝倉庫外的路徑（開發者電腦暫存區之類，照實寫；第一段不能是倉庫的頂層資料夾）。
//      路徑不能是空的（"/"、"//"）、絕對路徑或有 . ..；兩種的檔名（最後一段；或去掉副檔名、至少 4 個字的主檔名）要出現在那支測試的程式碼或字串裡（註解不算）：寫一個不存在的路徑交差，抓得到
//   ② missing、outside 裡不能有白名單沒有的條目（舊的要一起刪）
//   ③ 只能減、不能增：跟基準（main）那一版比，總數不能變多；基準還沒有的測試檔（新的檔）不能有略過
//      （改寫原因、把原本沒驗的條件式拆成明列的略過可以，但總數要靠別處真的跑起來補回來）
// 用法：node .github/scripts/check-skip-allow.cjs --base <git 參照，例如 origin/main> [--allow .github/test-skip-allow.json] [--tests source/xiangqi-lab/tools]
// 結束代碼：0 都對；1 有條目不成立或變多；2 用法錯誤、讀不到檔、格式不對、讀不到基準
"use strict";
const fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");

/* 條目「檔名：項目（原因）」的檔名 */
const fileOf = (e) => { const m = /^(test-[^：]+\.js)：/.exec(String(e)); return m ? m[1] : null };
const tally = (list) => { const o = {}; for (const e of list) { const f = fileOf(e) || "（看不出檔名）"; o[f] = (o[f] || 0) + 1 } return o };

/* 一條缺檔路徑的共同檢查：正規化後不能是空的、不能是絕對路徑、不能有 . 或 ..；回傳 { q } 或 { err } */
function norm(p) {
  if (typeof p !== "string") return { err: "不是字串" };
  const t = p.trim();
  if (/^[\\/]|^[A-Za-z]:/.test(t)) return { err: "要寫相對路徑，不能是絕對路徑" };
  const q = t.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/+$/, "");
  if (!q) return { err: "路徑是空的（像 \"/\"、\"//\" 這種）" };
  if (q.split("/").some((x) => x === "." || x === "..")) return { err: "不能有 . 或 .." };
  return { q };
}

/* 拿掉 JS 原始碼裡的註解（雙斜線到行尾、斜線星號到星號斜線），字串、樣板字串、regex 字面值裡的照留：
   缺檔的檔名只寫在註解裡不算（PR #62 Codex 審查）。斜線前面是運算子、括號、逗號或 return 之類的關鍵字，就當成 regex 字面值開頭。
   自我測試會把倉庫裡每一支測試檔拿掉註解後再編譯一次，確認沒有掃錯 */
function stripComments(src) {
  const s = String(src).replace(/^#![^\n]*/, ""); let out = "", i = 0;
  const regexOk = () => { const t = out.replace(/\s+$/, ""), c = t[t.length - 1]; return !c || /[(,=:[!&|?{};+\-*%<>~^]/.test(c) || /(^|[^\w$])(return|typeof|instanceof|in|of|new|delete|void|throw|case|do|else|yield|await)$/.test(t) };
  while (i < s.length) {
    const c = s[i], d = s[i + 1];
    if (c === "/" && d === "/") { while (i < s.length && s[i] !== "\n") i++; continue }
    if (c === "/" && d === "*") { const j = s.indexOf("*/", i + 2); i = j < 0 ? s.length : j + 2; out += " "; continue }
    if (c === "'" || c === '"' || c === "`") {
      let j = i + 1, depth = 0;
      for (; j < s.length; j++) {
        if (s[j] === "\\") { j++; continue }
        if (c === "`" && s[j] === "$" && s[j + 1] === "{") { depth++; j++; continue }
        if (c === "`" && depth && s[j] === "}") { depth--; continue }
        if (!depth && s[j] === c) break;
        if (c !== "`" && s[j] === "\n") break;
      }
      out += s.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === "/" && regexOk()) {
      let j = i + 1, cls = false;
      for (; j < s.length && s[j] !== "\n"; j++) { if (s[j] === "\\") { j++; continue } if (s[j] === "[") cls = true; else if (s[j] === "]") cls = false; else if (s[j] === "/" && !cls) break }
      out += s.slice(i, j + 1); i = j + 1; continue;
    }
    out += c; i++;
  }
  return out;
}

/* 純函式：allow＝這一版的條目；missing＝{條目: [倉庫裡的路徑…]}；outside＝{條目: [倉庫外的路徑…]}（開發者電腦暫存區之類，照實寫）；
   baseAllow＝基準那一版的條目；baseHas(檔名)＝基準有沒有這支測試檔；top＝倉庫的頂層資料夾（git ls-files 的第一段）；
   tracked(p)＝倉庫有沒有追蹤這個路徑（含資料夾底下有檔）；onDisk(p)＝磁碟上有沒有；src(檔名)＝測試原始碼（讀不到回 null） */
function judge({ allow, missing, outside, baseAllow, baseHas, top, tracked, onDisk, src }) {
  const bad = [], own = (o, k) => !!o && Object.prototype.hasOwnProperty.call(o, k);
  /* 測試常用程式拼檔名（"x_" + 名字 + ".glb"）：主檔名（去掉副檔名、至少 4 個字）出現也算；沒出現回檔名 */
  const notInTest = (S, q) => { const base = q.split("/").pop(), stem = base.replace(/\.[^.]+$/, ""); return S.includes(base) || (stem.length >= 4 && S.includes(stem)) ? null : base };
  for (const e of allow) {
    const f = fileOf(e), ps = own(missing, e) ? missing[e] : [], os = own(outside, e) ? outside[e] : [];
    if (!f) { bad.push(`看不出是哪支測試檔：${e}`); continue }
    if (!Array.isArray(ps) || !Array.isArray(os) || ps.length + os.length === 0) { bad.push(`沒寫缺哪個檔（missing 或 outside）：${e}`); continue }
    const S0 = src(f), S = S0 == null ? null : stripComments(S0);   /* 只看程式碼和字串，不看註解（PR #62 Codex 審查） */
    if (S == null) { bad.push(`找不到測試檔 ${f}：${e}`); continue }
    for (const p of ps) {
      const n = norm(p); if (n.err) { bad.push(`missing 的 ${JSON.stringify(p)}：${n.err}（${e}）`); continue }
      const q = n.q, seg = q.split("/")[0];
      if (!top.has(seg)) { bad.push(`missing 的 ${q}：第一段「${seg}」不是倉庫裡的頂層資料夾；倉庫外的檔請照實寫進 outside（${e}）`); continue }
      if (tracked(q) || onDisk(q)) { bad.push(`說缺 ${q}，可是倉庫裡有：這項應該真的跑（${e}）`); continue }
      const m = notInTest(S, q); if (m) bad.push(`缺檔 ${q} 的檔名「${m}」沒出現在 ${f} 裡：看不出測試真的要讀它（${e}）`);
    }
    for (const p of os) {
      const n = norm(p); if (n.err) { bad.push(`outside 的 ${JSON.stringify(p)}：${n.err}（${e}）`); continue }
      const q = n.q, seg = q.split("/")[0];
      if (top.has(seg)) { bad.push(`outside 的 ${q}：第一段「${seg}」是倉庫裡的資料夾，要寫進 missing 讓 CI 核對（${e}）`); continue }
      const m = notInTest(S, q); if (m) bad.push(`倉庫外的 ${q} 檔名「${m}」沒出現在 ${f} 裡：看不出測試真的要讀它（${e}）`);
    }
  }
  const A = new Set(allow);
  for (const [name, o] of [["missing", missing], ["outside", outside]]) for (const k of Object.keys(o || {})) if (!A.has(k)) bad.push(`${name} 有、白名單沒有（舊的要一起刪）：${k}`);
  const grew = [];
  if (allow.length > baseAllow.length) grew.push(`總數 ${baseAllow.length} → ${allow.length}`);
  for (const [f, n] of Object.entries(tally(allow))) if (!baseHas(f)) grew.push(`${f}：基準還沒有這支檔，這一版就有 ${n} 條略過（新的測試檔不能靠略過過關）`);
  const B = new Set(baseAllow), added = allow.filter((e) => !B.has(e)), removed = baseAllow.filter((e) => !A.has(e));
  return { bad, grew, added, removed, ok: !bad.length && !grew.length };
}

module.exports = { judge, fileOf, tally, norm, stripComments };
if (require.main !== module) return;

const args = process.argv.slice(2), opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d };
const BASE = opt("--base"), ALLOW = opt("--allow", path.join(".github", "test-skip-allow.json")), TESTS = opt("--tests", path.join("source", "xiangqi-lab", "tools"));
if (!BASE) { console.error("用法：node .github/scripts/check-skip-allow.cjs --base <git 參照> [--allow 白名單] [--tests 測試資料夾]"); process.exit(2) }
const git = (...a) => execFileSync("git", ["-c", "core.quotePath=false", ...a], { encoding: "utf8", maxBuffer: 64e6, stdio: ["ignore", "pipe", "pipe"] });
const parse = (s, what) => { const j = JSON.parse(s); if (!Array.isArray(j.allow)) throw new Error(what + " 缺 allow 陣列"); for (const k of ["missing", "outside"]) if (j[k] != null && (typeof j[k] !== "object" || Array.isArray(j[k]))) throw new Error(what + " 的 " + k + " 要是物件"); return j };
let cur, baseAllow, files;
try { cur = parse(fs.readFileSync(ALLOW, "utf8"), ALLOW) } catch (e) { console.error("✘ 讀不到白名單或格式不對：" + e.message); process.exit(2) }
try { baseAllow = parse(git("show", `${BASE}:${ALLOW.replace(/\\/g, "/")}`), BASE + " 的白名單").allow } catch (e) { console.error("✘ 讀不到基準 " + BASE + " 的白名單（不能當成沒有變多）：" + String(e.message).split("\n")[0]); process.exit(2) }
try { files = git("ls-files", "-z").split("\0").filter(Boolean) } catch (e) { console.error("✘ 讀不到 git 追蹤的檔案清單"); process.exit(2) }
const T = new Set(files), top = new Set(files.filter((f) => f.includes("/")).map((f) => f.split("/")[0])), tracked = (p) => T.has(p) || files.some((f) => f.startsWith(p + "/"));
let baseFiles; try { baseFiles = new Set(git("ls-tree", "-r", "--name-only", "-z", BASE, "--", TESTS.replace(/\\/g, "/")).split("\0").filter(Boolean).map((p) => p.split("/").pop())) } catch (e) { console.error("✘ 讀不到基準 " + BASE + " 的測試檔清單"); process.exit(2) }
const r = judge({ allow: cur.allow, missing: cur.missing || {}, outside: cur.outside || {}, top, baseAllow, baseHas: (f) => baseFiles.has(f), tracked, onDisk: (p) => fs.existsSync(p), src: (f) => { try { return fs.readFileSync(path.join(TESTS, f), "utf8") } catch (e) { return null } } });
console.log(`略過白名單檢查：這一版 ${cur.allow.length} 條（基準 ${BASE} ${baseAllow.length} 條；這次刪 ${r.removed.length} 條、新增 ${r.added.length} 條）`);
if (r.added.length) console.log("這次新增的條目（審查者請逐條看）：\n" + r.added.map((x) => "  ＋ " + x).join("\n"));
if (r.bad.length) console.error(`✘ ${r.bad.length} 條不成立：\n` + r.bad.map((x) => "  － " + x).join("\n"));
if (r.grew.length) console.error("✘ 白名單只能減、不能增（W69 盤點高 7）：\n" + r.grew.map((x) => "  － " + x).join("\n") + "\n  要嘛讓測試真的跑；確定跑不了，總數也不能比基準多。");
if (r.ok) console.log("✔ 每一條都寫了缺哪個檔、那些檔在倉庫裡真的沒有；條數沒有變多");
process.exit(r.ok ? 0 : 1);
