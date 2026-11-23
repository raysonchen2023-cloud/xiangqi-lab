#!/usr/bin/env node
/* iOS P0-IMG 金絲雀（AGENTS.md「P0 出口驗證要難作假」，開發者 2026-11-23：「ios金絲雀也要做」「壞樣本能自己製作，包含媒體缺檔之類的，然後加入金絲雀比較深層的判斷（避免P0)」）
   做法：把要送審的包裡那份 public（或 www）整個複製一份（macOS 用 APFS 複製，幾秒、不佔空間），在副本上真的弄壞一處，
     再用同一支 check-www.js（--dir 指向副本）檢查。每一個壞樣本都必須被判失敗，而且錯誤裡要有那一處的檔名和原因；乾淨的那份必須全過。
     壞樣本走的是正式檢查的同一條路（同一支程式、真的檔案），不是在讀檔那一層假裝缺檔。
   挑哪個檔：每一類固定測「頭、中、尾」三個，再加一個用種子挑的隨機檔（PR #67 審查：只挑一個、隨機挑，正式檢查只查第一首背景音樂也會有幾次照樣過）。
     同一個種子挑到的檔一樣；沒給種子就隨機產生一個，收據記下來，要重現就照那個種子再跑。
   壞樣本（每一種都是一個會讓玩家看到 P0 的情況）：
     home     拿掉一個首頁素材（data/preload.json 列的）            → 開 App 首頁破圖
     bgm      拿掉一首背景音樂（data/bgm/index.json 列的）          → 媒體缺檔
     engine   拿掉一個引擎檔（pikafish.js／.wasm／.nnue）           → 電腦棋手不能下
     core     拿掉一個核心程式（capacitor.js、native-bridge.js…）  → 開不起來或原生功能失效
     big      前幾大的檔挑一個只留一半（不挑引擎檔）                → 切塊大檔沒接回、下載中斷（W30 類）
     swap     同樣大小、內容被換掉（清單有記 sha1 的檔）            → 雜湊不符
     bridge   index.html 裡 native-bridge.js 移到 App 程式後面      → 原生功能全部失效
     cdnstale App 會要的檔換成舊副本、清單也照舊副本改（加 --cdn 才跑） → 包跟 CDN 現行版不同（W42）：只有跟 CDN 比才抓得到
     cdnmiss  CDN 清單拿掉一個 App 會要的檔（加 --cdn 才跑）     → 要回 3：沒跟 CDN 比到不能當驗過
     cdnfail  CDN 清單讀不到（加 --cdn 才跑）                  → 要回 3：加了 --cdn 卻沒驗到 W42
     ctrl     程式檔插一個控制字元（清單照改）                  → 程式壞掉
     bigpre   拿掉 preload.json 的 big 列的大檔（清單也拿掉）    → 開 App 要先下載的大檔缺
     capord   index.html 裡 native-bridge.js 移到 capacitor.js 前面（清單照改） → 原生橋接載入順序錯（原生能力偵測不到）
   swap 除了頭、中、尾、隨機，另外固定測最大的兩個記了 sha1 的檔（W30：大小對、內容壞的切塊大檔）
   用法（送審）：node scripts/canary-www.js --pkg <要送審的 .ipa 或 .app> --cdn [--list <清單>] [--seed <種子>] --out <收據.json>
     --pkg 時檢查的就是包裡那份 Payload/*.app/public（.ipa 會先解開），不能再另外給 --dir（PR #67 審查：收據的包跟檢查的資料夾要是同一份）。
     沒有安裝包時可以用 --dir <www 資料夾> 先試，但那種收據 full＝false，送審不能用。
   結束代碼：0 乾淨的全過、每個壞樣本都被抓到；4 有壞樣本沒被抓到（檢查本身失靈，結果不可信）；2 測試不成立（乾淨的沒過、找不到可以弄壞的檔、解不開安裝包）；
     3 乾淨的沒錯、但加了 --cdn 卻讀不到 CDN 清單（缺驗）
   送審用的收據要 full＝true，五個條件都要成立（PR #67 第五次審查）：
     給了 --pkg 而且是 .ipa（收據的 SHA-256 才對得到送審的檔）、加了 --cdn（正式 CDN；--cdn-manifest 給的本機檔不算）、沒有 --only、
     用的清單跟 origin/main 的 source/xiangqi-ios/scripts/.www-files.json 一模一樣（不能拿包重產清單來比包）、
     清單的 siteVersion 跟包裡 public/release.json 的 version 一樣。
   金絲雀叫 check-www.js 的參數跟正式用法一樣（不加 --all）。 */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto"), cp = require("child_process");
const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
const VAL_FLAGS = ["--pkg", "--dir", "--list", "--cdn-manifest", "--only", "--seed", "--out"];
const missingVal = (a) => VAL_FLAGS.find((k) => { const i = a.indexOf(k); return i >= 0 && (i + 1 >= a.length || String(a[i + 1]).startsWith("--")) });
const CHECK = path.join(__dirname, "check-www.js");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const sha1_12 = (b) => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
/* 工具雜湊：CRLF 換成 LF、單獨的 CR 保留（跟 Android tool-pin.js 同一種算法；單獨 CR 在 JS 裡算換行，不能忽略） */
const toolSha = (p) => sha256(Buffer.from(fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"), "utf8"));
/* 整個資料夾的雜湊：每個檔「相對路徑＋NUL＋SHA-256＋換行」照路徑排序後再算（收據綁住檢查的是哪一份內容） */
function treeSha(dir) {
  const out = [];
  /* 符號連結也算進去（記連到哪裡），.app 裡的 Frameworks 常有（PR #67 第三次審查） */
  const walk = (d, pre) => { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n), r = pre ? pre + "/" + n : n, st = fs.lstatSync(p); if (st.isSymbolicLink()) out.push(r + "\0L:" + fs.readlinkSync(p) + "\n"); else if (st.isDirectory()) walk(p, r); else if (st.isFile()) out.push(r + "\0" + sha256(fs.readFileSync(p)) + "\n") } };
  walk(dir, ""); return sha256(out.sort().join(""));
}
/* 挑檔：頭、中、尾，再加一個用種子挑的（mulberry32），去掉重複 */
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }
function picks(list, rand) {
  if (!list.length) return [];
  const idx = [0, Math.floor((list.length - 1) / 2), list.length - 1, Math.floor(rand() * list.length)];
  return [...new Set(idx)].map((i) => list[i]);
}
const at = (D, rel) => path.join(D, ...rel.split("/"));
const rewrite = (p, b) => { fs.rmSync(p); fs.writeFileSync(p, b) };   /* 先刪再寫：APFS 複製或硬連結都不會改到原本那份 */
const ENGINE = ["engine/pikafish.js", "engine/pikafish.wasm", "engine/pikafish.nnue"];
const CORE = ["capacitor.js", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js", "zh.js"];
const CTRL = ["index.html", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js"];   /* check-www.js 第 5 項檢查控制字元的檔 */
const TAG_CAP = '<script src="capacitor.js"></script>', TAG_BR = '<script src="native-bridge.js"></script>';
/* 清單照改過的檔更新（只讓要測的那一條判斷抓得到，別的判斷不會順便抓到） */
const relist = (L, f, b) => ({ ...L, [f]: [b.length, sha1_12(b)] });
const preloadItems = (D) => (JSON.parse(fs.readFileSync(at(D, "data/preload.json"), "utf8")).items || []).map((x) => x[0]).filter((f) => fs.existsSync(at(D, f)));
const bgmFiles = (D) => { const B = JSON.parse(fs.readFileSync(at(D, "data/bgm/index.json"), "utf8")), o = []; for (const [era, list] of Object.entries(B)) for (const f of Array.isArray(list) ? list : []) if (typeof f === "string" && fs.existsSync(at(D, "data/bgm/" + era + "/" + f))) o.push("data/bgm/" + era + "/" + f); return o };

/* 每一種壞樣本：cands 列出所有可以弄壞的檔；break 在副本上真的弄壞（需要時回傳改過的清單）；expect 是 check-www 錯誤裡要出現的字 */
const KINDS = {
  home: { cands: (D) => preloadItems(D), break: (D, f) => fs.rmSync(at(D, f)), expect: (f) => "preload.json 列了但沒有：" + f },
  bgm: { cands: (D) => bgmFiles(D), break: (D, f) => fs.rmSync(at(D, f)), expect: (f) => "背景音樂清單有但沒有檔：" + f },
  engine: { cands: (D) => ENGINE.filter((f) => fs.existsSync(at(D, f))), break: (D, f) => fs.rmSync(at(D, f)), expect: (f) => "缺引擎 " + f },
  core: { cands: (D) => CORE.filter((f) => fs.existsSync(at(D, f))), break: (D, f) => fs.rmSync(at(D, f)), expect: (f) => "缺 " + f },
  big: {
    cands: (D, L) => Object.entries(L).filter(([rel, [sz]]) => sz > 1024 && rel !== "index.html" && !rel.startsWith("engine/") && fs.existsSync(at(D, rel))).sort((a, b) => b[1][0] - a[1][0]).slice(0, 5).map((x) => x[0]),
    break: (D, f) => { const b = fs.readFileSync(at(D, f)); rewrite(at(D, f), b.subarray(0, Math.floor(b.length / 2))) },
    expect: (f) => "大小不對 " + f,
  },
  swap: {
    cands: (D, L) => Object.entries(L).filter(([rel, [sz, h]]) => h && sz >= 16 && rel !== "index.html" && fs.existsSync(at(D, rel))).map((x) => x[0]),
    always: (D, L) => Object.entries(L).filter(([rel, [sz, h]]) => h && sz >= 16 && rel !== "index.html" && fs.existsSync(at(D, rel))).sort((a, b) => b[1][0] - a[1][0] || (a[0] < b[0] ? -1 : 1)).slice(0, 2).map((x) => x[0]),   /* PR #67 第五次審查：W30 那種大檔一定要測到 */
    break: (D, f) => { const b = Buffer.from(fs.readFileSync(at(D, f))); b[Math.floor(b.length / 2)] ^= 0xff; rewrite(at(D, f), b) },
    expect: (f) => "內容跟清單不同 " + f,
  },
  bridge: {
    cands: (D) => { const h = fs.readFileSync(at(D, "index.html"), "utf8"); return h.includes('<script src="native-bridge.js"></script>') && h.includes('<script src="core.js"></script>') ? ["index.html"] : [] },
    break: (D, f) => { const tag = '<script src="native-bridge.js"></script>'; let h = fs.readFileSync(at(D, f), "utf8").replace(tag, ""); h = h.replace('<script src="core.js"></script>', '<script src="core.js"></script>' + tag); rewrite(at(D, f), Buffer.from(h, "utf8")) },
    expect: () => "index.html 裡 native-bridge.js 的位置不對",
  },
  cdnstale: {
    needsCdn: true,
    cands: (D, L, M) => { const need = new Set([...preloadItems(D), ...bgmFiles(D)]); return Object.keys(M || {}).filter((rel) => need.has(rel) && Array.isArray(M[rel]) && M[rel][1] && L[rel] && fs.existsSync(at(D, rel))).sort() },
    /* 模擬 W42：包裡放的是舊副本，清單也是照舊副本產生的（所以第 4 項比不出來），只有跟 CDN 比才抓得到 */
    break: (D, f, L) => { const b = Buffer.from(fs.readFileSync(at(D, f))); b[Math.floor(b.length / 2)] ^= 0xff; rewrite(at(D, f), b); return { list: relist(L, f, b) } },
    expect: (f) => "跟 CDN 現行版不同 " + f,
  },
  cdnmiss: {
    needsCdn: true, exit: 3,
    cands: (D, L, M) => { const need = new Set([...preloadItems(D), ...bgmFiles(D)]); return Object.keys(M || {}).filter((rel) => need.has(rel) && Array.isArray(M[rel]) && M[rel][1] && fs.existsSync(at(D, rel))).sort() },
    break: (D, f, L, M) => { const M2 = { ...M }; delete M2[f]; return { cdn: M2 } },
    expect: (f) => "沒跟 CDN 比到",
  },
  cdnfail: {
    needsCdn: true, exit: 3,
    cands: () => ["cdn-manifest.json"],
    break: (D) => ({ cdnPath: path.join(D, "沒有這個-cdn-manifest.json") }),
    expect: () => "讀不到 CDN 清單",
  },
  ctrl: {
    cands: (D, L) => CTRL.filter((f) => L[f] && fs.existsSync(at(D, f))),
    break: (D, f, L) => { const b = Buffer.concat([fs.readFileSync(at(D, f)), Buffer.from("\x01")]); rewrite(at(D, f), b); return { list: relist(L, f, b) } },
    expect: (f) => f + " 有控制字元",
  },
  bigpre: {
    cands: (D) => { const P = JSON.parse(fs.readFileSync(at(D, "data/preload.json"), "utf8")); return (P.big || []).map((x) => x[0]).filter((f) => fs.existsSync(at(D, f))) },
    break: (D, f, L) => { fs.rmSync(at(D, f)); const L2 = { ...L }; delete L2[f]; return { list: L2 } },
    expect: (f) => "preload.json 列了但沒有：" + f,
  },
  capord: {
    cands: (D) => { const h = fs.readFileSync(at(D, "index.html"), "utf8"); return h.includes(TAG_CAP) && h.includes(TAG_BR) ? ["index.html"] : [] },
    break: (D, f, L) => { const h = fs.readFileSync(at(D, f), "utf8").replace(TAG_BR, "").replace(TAG_CAP, TAG_BR + TAG_CAP), b = Buffer.from(h, "utf8"); rewrite(at(D, f), b); return { list: relist(L, f, b) } },
    expect: () => "index.html 裡 native-bridge.js 的位置不對",
  },
};

function cloneDir(src, dst) {
  if (process.platform === "darwin") { const r = cp.spawnSync("cp", ["-cR", src, dst], { stdio: "ignore" }); if (r.status === 0) return }
  fs.cpSync(src, dst, { recursive: true });
}
const OFFICIAL_CDN = "https://xiangqi-cdn.pages.dev/cdn-manifest.json";   /* 送審用（full＝true）只認這個 */
const readManifest = (cdn) => /^https?:\/\//.test(cdn)
  ? cp.execFileSync(process.execPath, ["-e", "fetch(process.argv[1]).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}).then(t=>process.stdout.write(t)).catch(e=>{console.error(e.message);process.exit(1)})", cdn], { encoding: "utf8", maxBuffer: 256e6, timeout: 120000, stdio: ["ignore", "pipe", "pipe"] })
  : fs.readFileSync(cdn, "utf8");
/* 安裝包 → 包裡那份 public：.app 直接用 <.app>/public；.ipa 解開 Payload/*.app/public/ 到暫存資料夾 */
function pkgPublic(pkg, tmp) {
  const st = fs.statSync(pkg);
  if (st.isDirectory()) { const p = path.join(pkg, "public"); if (!fs.existsSync(path.join(p, "index.html"))) throw new Error(pkg + " 裡沒有 public/index.html"); return { dir: p, kind: "app", sha256: treeSha(pkg) } }
  const d = fs.mkdtempSync(path.join(tmp, "xq-canary-ipa-"));
  const r = cp.spawnSync("unzip", ["-q", "-o", pkg, "Payload/*.app/public/*", "-d", d], { encoding: "utf8" });
  if (r.status !== 0) throw new Error("unzip 解不開 " + pkg + "：" + String(r.stderr || r.error || "").split("\n")[0]);
  const P = path.join(d, "Payload"), app = fs.existsSync(P) ? fs.readdirSync(P).filter((n) => n.endsWith(".app")) : [];
  if (app.length !== 1) throw new Error(pkg + " 的 Payload/ 裡要正好一個 .app，找到 " + app.length + " 個");
  const p = path.join(P, app[0], "public"); if (!fs.existsSync(path.join(p, "index.html"))) throw new Error(pkg + " 裡沒有 public/index.html");
  return { dir: p, kind: "ipa", sha256: sha256(fs.readFileSync(pkg)), cleanup: d };
}

/* 結束代碼（純函式）：全抓到 0；有任何一個「做出來了卻沒被抓到」就是 4（檢查失靈，優先，不能被「不成立」蓋掉）；其餘沒過的是 2 */
/* origin/main 上那份清單（收據要綁住倉庫的清單，不能拿包重產）；讀不到就回 null，full 一律 false */
function mainListFromGit() {
  const root = path.join(__dirname, "..", "..", "..");
  const r = cp.spawnSync("git", ["-C", root, "show", "origin/main:source/xiangqi-ios/scripts/.www-files.json"], { maxBuffer: 64e6 });
  return r.status === 0 ? r.stdout : null;
}
const exitOf = (results, pass) => (pass ? 0 : results.some((x) => !x.unfit && x.caught !== true) ? 4 : 2);

/* 主流程（自我測試直接呼叫）：回傳 { code, receipt } */
function run({ dir = null, list = null, cdn = null, pkg = null, only = null, seed = null, tmp = os.tmpdir(), log = console.log, readM = readManifest, mainList = mainListFromGit }) {   /* readM、mainList 只給自我測試換掉下載和讀 main；命令列一律用真的 */
  const unfit = (why, code = 2) => ({ code, receipt: { tool: "P0-IMG-canary", platform: "ios", unfit: true, why } });
  if (pkg && dir) return unfit("給了 --pkg 就不要再給 --dir：檢查的就是包裡那份 public");
  let P = null;
  if (pkg) { try { P = pkgPublic(pkg, tmp); dir = P.dir } catch (e) { return unfit("安裝包：" + e.message) } }
  try {
    if (!dir || !fs.existsSync(path.join(dir, "index.html"))) return unfit("找不到要檢查的資料夾（--pkg 或 --dir）：" + dir);
    const LF = list ? path.resolve(list) : path.join(__dirname, ".www-files.json");
    let LJ; try { LJ = JSON.parse(fs.readFileSync(LF, "utf8")) } catch (e) { return unfit("讀不到清單 " + LF) }
    const L = LJ.files || {};
    const base = fs.mkdtempSync(path.join(tmp, "xq-canary-www-"));
    try {
      const check = (d, lf, cdnArg) => cp.spawnSync(process.execPath, [CHECK, "--dir", d, "--list", lf, ...(cdnArg ? ["--cdn-manifest", cdnArg] : [])], { encoding: "utf8", maxBuffer: 256e6 });   /* 跟正式用法一樣，不加 --all（PR #67 第五次審查） */
      /* CDN 清單只下載一次，乾淨的那份和每個壞樣本都用同一份，收據記下它的雜湊（PR #67 審查：分兩次下載，兩份可能不同） */
      let M = null, cdnFile = null, cdnSha = null;
      /* PR #67 第四次審查：先驗乾淨的樣本（不連 CDN），再讀 CDN。乾淨的有錯就回 2，不會被「CDN 讀不到」蓋成 3 */
      const pre = check(dir, LF, null);
      if (pre.status !== 0) return unfit("乾淨的樣本沒過 check-www.js（先修好再跑金絲雀）：" + String(pre.stderr).split("\n")[0]);
      if (cdn) { try { const txt = readM(cdn); M = JSON.parse(txt).files; cdnFile = path.join(base, "cdn-manifest.json"); fs.writeFileSync(cdnFile, txt); cdnSha = sha256(Buffer.from(txt, "utf8")) } catch (e) { return unfit("金絲雀讀不到 CDN 清單：" + cdn, 3) } }
      const clean = check(dir, LF, cdnFile);
      if (clean.status === 3) return unfit("乾淨的樣本沒錯，但 CDN 清單沒能比對（缺驗）：" + String(clean.stderr).split("\n")[0], 3);
      if (clean.status !== 0) return unfit("乾淨的樣本沒過 check-www.js（先修好再跑金絲雀）：" + String(clean.stderr).split("\n")[0]);
      const want = only ? only.split(",").map((s) => s.trim()).filter(Boolean) : Object.keys(KINDS).filter((k) => cdn || !KINDS[k].needsCdn);
      for (const k of want) { if (!KINDS[k]) return unfit("不認得的壞樣本：" + k + "（可用：" + Object.keys(KINDS).join(" ") + "）"); if (KINDS[k].needsCdn && !cdn) return unfit(k + " 要加 --cdn 才能跑") }
      const SEED = seed != null && seed !== "" ? Number(seed) >>> 0 : crypto.randomInt(2 ** 31), rand = rng(SEED);
      const results = [];
      for (const k of want) {
        const K = KINDS[k];
        let cands = []; try { cands = K.cands(dir, L, M) } catch (e) { cands = [] }
        const chosen = [...new Set([...picks(cands, rand), ...(K.always ? K.always(dir, L, M) : [])])];
        if (!chosen.length) { results.push({ kind: k, caught: false, unfit: true, why: "乾淨的樣本裡找不到可以弄壞的檔" }); continue }
        for (const f of chosen) {
          const D = path.join(base, k + "-" + results.length);
          let lf = LF, cf = cdnFile;
          try {
            cloneDir(dir, D); const B = K.break(D, f, L, M) || {};
            if (B.list) { lf = path.join(base, k + "-" + results.length + "-list.json"); fs.writeFileSync(lf, JSON.stringify({ ...LJ, files: B.list })) }
            if (B.cdn) { cf = path.join(base, k + "-" + results.length + "-cdn.json"); fs.writeFileSync(cf, JSON.stringify({ files: B.cdn })) }
            if (B.cdnPath) cf = B.cdnPath;
          }
          catch (e) { results.push({ kind: k, file: f, caught: false, unfit: true, why: "做壞樣本失敗：" + e.message }); continue }
          const r = check(D, lf, cf), out = String(r.stdout) + String(r.stderr), exp = K.expect(f), want = K.exit || 1;
          const caught = r.status === want && out.includes(exp);
          results.push({ kind: k, file: f, candidates: cands.length, expect: exp, exit: r.status, caught });
          log((caught ? "✔ " : "✘ ") + k + "：" + f + "（候選 " + cands.length + " 個）" + (caught ? " 被抓到" : " 沒被抓到（結束代碼 " + r.status + "，錯誤裡" + (out.includes(exp) ? "有" : "沒有") + "「" + exp + "」）"));
          fs.rmSync(D, { recursive: true, force: true });
        }
      }
      const listSha = sha256(fs.readFileSync(LF)), mainBuf = (() => { try { return mainList() } catch (e) { return null } })();
      const listMainSha256 = mainBuf ? sha256(mainBuf) : null, listBound = !!listMainSha256 && listMainSha256 === listSha;
      let releaseVersion = null; try { releaseVersion = JSON.parse(fs.readFileSync(path.join(dir, "release.json"), "utf8")).version || null } catch (e) { }
      const verBound = !!releaseVersion && releaseVersion === LJ.siteVersion;
      const receipt = {
        tool: "P0-IMG-canary", platform: "ios", at: new Date().toISOString(),
        sample: { dir: P ? "（安裝包裡的 public）" : path.basename(path.resolve(dir)), treeSha256: treeSha(dir), indexSha256: sha256(fs.readFileSync(path.join(dir, "index.html"))), listSha256: listSha, siteVersion: LJ.siteVersion || null, commit: LJ.commit || null, releaseVersion },
        bind: { listMainSha256, listBound, verBound },   /* PR #67 第五次審查：清單要是 origin/main 那份、版號要跟包對得上 */
        pkg: P ? { file: path.basename(pkg), kind: P.kind, sha256: P.sha256 } : null,
        cdn: cdn ? { manifest: cdn, sha256: cdnSha } : null,
        /* 工具自己算、自己寫進收據：只抓得到本機不小心改過（例如忘了切回 main）；故意偽造要靠之後的 CI 用 main 版工具重跑（Android PR③） */
        toolPins: { "source/xiangqi-ios/scripts/check-www.js": toolSha(CHECK), "source/xiangqi-ios/scripts/canary-www.js": toolSha(__filename) },
        seed: SEED, kinds: want, results,
        full: !only && cdn === OFFICIAL_CDN && !!P && P.kind === "ipa" && listBound && verBound,   /* 只認正式 CDN（第四次審查）；要 .ipa、清單是 main 那份、版號對得上（第五次審查） */
        pass: want.every((k) => results.some((x) => x.kind === k)) && results.every((x) => x.caught === true),
      };
      return { code: exitOf(results, receipt.pass), receipt };
    } finally { fs.rmSync(base, { recursive: true, force: true }) }
  } finally { if (P && P.cleanup) fs.rmSync(P.cleanup, { recursive: true, force: true }) }
}

module.exports = { run, KINDS, toolSha, treeSha, picks, rng, exitOf, OFFICIAL_CDN };
if (require.main === module) {
  const mv = missingVal(argv); if (mv) { console.error("✘ 測試不成立：" + mv + " 後面要接值"); process.exit(2) }
  const cdn = opt("--cdn-manifest") || (argv.includes("--cdn") ? OFFICIAL_CDN : null);
  const { code, receipt } = run({ dir: opt("--dir"), list: opt("--list"), cdn, pkg: opt("--pkg"), only: opt("--only"), seed: opt("--seed") });
  if (receipt.unfit) console.error((code === 3 ? "△ 缺驗：" : "✘ 測試不成立：") + receipt.why);
  if (opt("--out")) fs.writeFileSync(opt("--out"), JSON.stringify(receipt, null, 1) + "\n");
  if (!receipt.unfit) console.log(receipt.pass
    ? `✔ 金絲雀：${receipt.results.length} 個壞樣本（${receipt.kinds.length} 種）都被 check-www.js 抓到；種子 ${receipt.seed}` + (receipt.full ? "" : "（full＝false，送審不能用：要 --pkg .ipa、--cdn、不加 --only、清單是 origin/main 那份、版號跟包一樣）")
    : "✘ 金絲雀沒過：" + [...new Set(receipt.results.filter((x) => !x.caught).map((x) => x.kind))].join("、") + (code === 4 ? "——檢查本身失靈，這一輪的 P0-IMG 結果不可信" : ""));
  process.exit(code);
}
