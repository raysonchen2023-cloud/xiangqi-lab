// 第 13 輪 F2：Pikafish（GPL-3.0）網頁版的「可建置證據」核對
// 拿發布出去的 engine/pikafish.wasm、pikafish.js、pikafish-src/uci.cpp、pikafish-src/build-wsl.sh，對照建置紀錄 xiangqi-wasm/build-record.json：
//   1. 檔案都在（含 GPL 授權全文）
//   2. wasm 檔頭：魔數與版本、能被 WebAssembly 編譯（不執行）、共用記憶體的初始／上限 = 編譯旗標的 192MB／2GB
//   3. wasm 內嵌字串：編譯器 __VERSION__（clang 版本＋LLVM commit）、__DATE__（編譯日期）要跟紀錄一致
//   4. pikafish.js：Emscripten 載入程式、匯出名 PikafishModule、有 _uci_command
//   5. SHA-256：wasm、js、uci.cpp、build-wsl.sh 跟紀錄一致；紀錄的每個旗標都出現在公開的 build-wsl.sh
//   6. --rebuilt <資料夾>：自己重編的 pikafish.wasm／pikafish.js 跟發布的逐位元比對
// 用法：
//   node xiangqi-lab/tools/pikafish-verify.js                         讀公開倉庫 xiangqi-lab/site 的 origin/main（本機最後一次 fetch 的狀態，不連網、不動工作區）
//   node xiangqi-lab/tools/pikafish-verify.js --dir <網站資料夾>       讀資料夾（例如自己下載的一份）
//   node xiangqi-lab/tools/pikafish-verify.js --git <倉庫> --ref <分支或 commit>
//   其他選項：--record <build-record.json>  --rebuilt <資料夾>  --json
// 有任何一項「✘」就以代碼 1 結束；用法或讀檔錯誤代碼 2
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), cp = require("child_process");
const ROOT = path.join(__dirname, "..", "..");
const DEF_RECORD = path.join(ROOT, "xiangqi-wasm", "build-record.json"), DEF_GIT = path.join(ROOT, "xiangqi-lab", "site");
const sha256 = b => crypto.createHash("sha256").update(b).digest("hex");
const FILES = { wasm: "engine/pikafish.wasm", js: "engine/pikafish.js", uci: "pikafish-src/uci.cpp", build: "pikafish-src/build-wsl.sh", gpl: "LICENSE-Pikafish-GPL3.txt" };

/* 讀檔來源：資料夾或 git 的某個版本；回傳 rel → Buffer|null */
function dirReader(dir) { return rel => { try { return fs.readFileSync(path.join(dir, rel)) } catch (e) { return null } } }
function gitReader(repo, ref) {
  return rel => { try { return cp.execFileSync("git", ["-C", repo, "show", ref + ":" + rel], { maxBuffer: 200e6, stdio: ["ignore", "pipe", "ignore"] }) } catch (e) { return null } };
}

/* 解析 wasm：區段、匯入的記憶體、內嵌字串 */
function inspectWasm(buf) {
  const r = { magic: false, version: null, sections: [], custom: [], memory: null, exports: 0, compiler: null, date: null, valid: null, error: null };
  if (!buf || buf.length < 8) { r.error = "檔案太短"; return r }
  r.magic = buf[0] === 0 && buf[1] === 0x61 && buf[2] === 0x73 && buf[3] === 0x6d;
  r.version = buf.readUInt32LE(4);
  if (!r.magic) { r.error = "不是 WebAssembly（開頭不是 \\0asm）"; return r }
  let p = 8;
  const u = () => { let v = 0, s = 0, x; do { if (p >= buf.length) throw new Error("讀到檔尾"); x = buf[p++]; v += (x & 127) * 2 ** s; s += 7 } while (x & 128); return v };
  const name = () => { const l = u(), s = buf.slice(p, p + l).toString("utf8"); p += l; return s };
  let data = null;
  try {
    while (p < buf.length) {
      const id = buf[p++], n = u(), st = p;
      if (st + n > buf.length) throw new Error(`區段 ${id} 超出檔尾`);
      r.sections.push(id);
      if (id === 0) r.custom.push(name());
      else if (id === 2) {
        for (let c = u(), i = 0; i < c; i++) {
          const mod = name(), fld = name(), k = buf[p++];
          if (k === 0) u(); else if (k === 1) { p++; const fl = buf[p++]; u(); if (fl & 1) u() }
          else if (k === 2) { const fl = buf[p++], mn = u(), mx = fl & 1 ? u() : null; r.memory = { import: mod + "." + fld, shared: !!(fl & 2), initialBytes: mn * 65536, maximumBytes: mx == null ? null : mx * 65536 } }
          else if (k === 3) p += 2; else if (k === 4) { p++; u() }
        }
      } else if (id === 5 && !r.memory) {
        if (u() > 0) { const fl = buf[p++], mn = u(), mx = fl & 1 ? u() : null; r.memory = { import: null, shared: !!(fl & 2), initialBytes: mn * 65536, maximumBytes: mx == null ? null : mx * 65536 } }
      } else if (id === 7) r.exports = u();
      else if (id === 11) data = buf.slice(st, st + n);
      p = st + n;
    }
  } catch (e) { r.error = "區段解析失敗：" + e.message }
  /* 內嵌字串：Pikafish 的 misc.cpp 把 __VERSION__ 和 __DATE__ 編進資料區段 */
  const txt = (data || buf).toString("latin1");
  const mc = txt.match(/Clang \d+\.\d+\.\d+[^\x00-\x1f]*?\([^()\x00]*\)/);
  if (mc) r.compiler = mc[0];
  const md = txt.match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) [ \d]\d \d{4}/);
  if (md) r.date = md[0];
  try { new WebAssembly.Module(buf); r.valid = true } catch (e) { r.valid = false; r.validError = String(e.message).slice(0, 200) }
  return r;
}

function inspectJs(s) {
  return {
    exportName: (s.match(/^\s*var (\w+)\s*=\s*\(\s*\(\s*\)\s*=>/) || s.match(/var (\w+)\s*=\s*\(\s*\(\s*\)\s*=>/) || [])[1] || null,
    uciCommand: /_uci_command/.test(s),
    wasmName: /pikafish\.wasm/.test(s),
    emscripten: /emscripten_/.test(s)
  };
}

/* 核對：回傳 { checks:[{id, ok, level:"fail"|"warn"|"info", msg}], facts } */
function verify({ read, record, rebuilt }) {
  const C = [], add = (id, ok, msg, level) => C.push({ id, ok: !!ok, level: ok ? "info" : (level || "fail"), msg });
  const B = {}; for (const [k, rel] of Object.entries(FILES)) B[k] = read(rel);
  const miss = Object.entries(FILES).filter(([k]) => !B[k]).map(([, rel]) => rel);
  add("files", !miss.length, miss.length ? "缺檔：" + miss.join("、") : "引擎、載入程式、改過的 uci.cpp、建置腳本、GPL 授權全文都在");
  const facts = { sha256: {}, bytes: {} };
  for (const k of ["wasm", "js", "uci", "build"]) if (B[k]) { facts.sha256[k] = sha256(B[k]); facts.bytes[k] = B[k].length }
  const R = record || {};
  if (B.wasm) {
    const W = facts.wasm = inspectWasm(B.wasm);
    add("wasm.header", W.magic && W.version === 1 && !W.error, W.error || `WebAssembly 第 ${W.version} 版，${W.sections.length} 個區段、匯出 ${W.exports} 個`);
    add("wasm.valid", W.valid, W.valid ? "WebAssembly.Module 編譯通過（只驗證、不執行）" : "WebAssembly 編譯失敗：" + (W.validError || ""));
    const m = W.memory, em = R.memory;
    add("wasm.memory", m && em && m.shared === em.shared && m.initialBytes === em.initialBytes && m.maximumBytes === em.maximumBytes,
      m ? `共用記憶體 ${m.shared ? "是" : "否"}、初始 ${m.initialBytes / 1048576} MB、上限 ${m.maximumBytes == null ? "無" : m.maximumBytes / 1048576 + " MB"}` + (em ? `（紀錄：${em.initialBytes / 1048576} MB／${em.maximumBytes / 1048576} MB，對應 -pthread -sINITIAL_MEMORY=192MB -sMAXIMUM_MEMORY=2GB）` : "（沒有紀錄可比）") : "找不到記憶體宣告");
    const ec = R.toolchain && R.toolchain.clangVersion;
    add("wasm.compiler", W.compiler && W.compiler === ec, W.compiler ? `內嵌編譯器字串：${W.compiler}` + (W.compiler === ec ? "（跟紀錄一致）" : `（紀錄：${ec || "沒有"}）`) : "wasm 裡找不到編譯器字串");
    const ed = R.originalBuild && R.originalBuild.dateMacro;
    add("wasm.date", W.date && W.date === ed, W.date ? `內嵌編譯日期 __DATE__：${W.date}` + (W.date === ed ? "（跟紀錄一致）" : `（紀錄：${ed || "沒有"}）`) : "wasm 裡找不到編譯日期");
    add("wasm.custom", true, W.custom.length ? "自訂區段：" + W.custom.join("、") : "沒有自訂區段（沒有 producers／除錯資訊；編譯器版本只能從上面的內嵌字串看）");
  }
  if (B.js) {
    const J = facts.js = inspectJs(B.js.toString("utf8"));
    add("js.loader", J.exportName === (R.exportName || "PikafishModule") && J.uciCommand && J.wasmName && J.emscripten,
      `Emscripten 載入程式：匯出名 ${J.exportName || "?"}、${J.uciCommand ? "有" : "沒有"} _uci_command、${J.wasmName ? "會" : "不會"}載入 pikafish.wasm`);
  }
  const A = R.artifacts || {};
  for (const [k, nm] of [["wasm", "pikafish.wasm"], ["js", "pikafish.js"]]) if (B[k]) {
    const e = A[nm] && A[nm].sha256;
    add("sha." + k, e && e === facts.sha256[k], `${nm} SHA-256 ${facts.sha256[k]}` + (e ? (e === facts.sha256[k] ? "（跟建置紀錄一致）" : `（紀錄是 ${e}，不一致）`) : "（紀錄裡沒有）"));
  }
  if (B.uci) {
    const e = R.modified && R.modified["src/uci.cpp"] && R.modified["src/uci.cpp"].sha256;
    add("sha.uci", e && e === facts.sha256.uci, `pikafish-src/uci.cpp SHA-256 ${facts.sha256.uci}` + (e === facts.sha256.uci ? "（跟建置紀錄一致）" : `（紀錄是 ${e || "沒有"}）`));
  }
  if (B.build) {
    const e = R.buildScript && R.buildScript.sha256, s = B.build.toString("utf8");
    add("sha.build", e && e === facts.sha256.build, `pikafish-src/build-wsl.sh SHA-256 ${facts.sha256.build}` + (e === facts.sha256.build ? "（跟建置紀錄一致）" : `（紀錄是 ${e || "沒有"}）`));
    const fl = (R.flags || []).filter(f => !s.split(/\s+/).includes(f));
    add("flags", R.flags && R.flags.length && !fl.length, fl.length ? "紀錄裡的旗標在 build-wsl.sh 找不到：" + fl.join(" ") : `紀錄的 ${(R.flags || []).length} 個編譯／連結旗標都在公開的 build-wsl.sh 裡`);
    const pinned = /emsdk install (?!latest)\d/.test(s);
    add("pin", pinned, pinned ? "公開的 build-wsl.sh 有釘 Emscripten 版本" : `公開的 build-wsl.sh 裝的是 latest，沒有釘版本（紀錄：Emscripten ${(R.toolchain && R.toolchain.emscripten) || "?"}；釘版本的是本機的 build-pinned.sh）`, "warn");
  }
  if (rebuilt) {
    for (const [k, nm] of [["wasm", "pikafish.wasm"], ["js", "pikafish.js"]]) {
      let b = null; try { b = fs.readFileSync(path.join(rebuilt, nm)) } catch (e) { }
      if (!b) { add("rebuilt." + k, false, `重編資料夾裡沒有 ${nm}`); continue }
      const h = sha256(b);
      add("rebuilt." + k, B[k] && h === facts.sha256[k], `重編的 ${nm} SHA-256 ${h}` + (B[k] && h === facts.sha256[k] ? "：跟發布的逐位元相同" : `：跟發布的不同${B[k] && b.length === B[k].length ? "（大小相同）" : ""}`));
    }
  }
  for (const rb of (R.rebuilds || [])) add("record.rebuild", true, `紀錄裡的重編：${rb.when}，${rb.toolchain}，${rb.result}`);
  return { checks: C, facts };
}

module.exports = { inspectWasm, inspectJs, verify, dirReader, gitReader, FILES, sha256 };

if (require.main === module) {
  const a = process.argv.slice(2), opt = k => { const i = a.indexOf(k); return i >= 0 ? a[i + 1] : null };
  const dir = opt("--dir"), repo = opt("--git"), ref = opt("--ref") || "origin/main", recF = opt("--record") || DEF_RECORD, rebuilt = opt("--rebuilt");
  let record = null;
  try { record = JSON.parse(fs.readFileSync(recF, "utf8")) } catch (e) { console.log("讀不到建置紀錄 " + recF + "：" + e.message); process.exit(2) }
  let read, src;
  if (dir) { read = dirReader(dir); src = dir }
  else { const g = repo || DEF_GIT; read = gitReader(g, ref); src = `${g}（git ${ref}）` }
  const out = verify({ read, record, rebuilt });
  if (a.includes("--json")) console.log(JSON.stringify({ source: src, ...out }, null, 1));
  else {
    console.log(`Pikafish 網頁版核對：${src}\n建置紀錄：${recF}`);
    for (const c of out.checks) console.log(`  ${c.ok ? "✔" : c.level === "warn" ? "△" : "✘"} ${c.msg}`);
  }
  const bad = out.checks.filter(c => !c.ok && c.level === "fail");
  if (!a.includes("--json")) console.log(bad.length ? `\n✘ ${bad.length} 項不符` : "\n✔ 全部符合（△ 是照實列出的缺口，不算失敗）");
  process.exit(bad.length ? 1 : 0);
}
