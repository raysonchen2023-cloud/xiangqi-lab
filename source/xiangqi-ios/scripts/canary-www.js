#!/usr/bin/env node
/* iOS P0-IMG 金絲雀（AGENTS.md「P0 出口驗證要難作假」，開發者 2026-11-23：「ios金絲雀也要做」「壞樣本能自己製作，包含媒體缺檔之類的，然後加入金絲雀比較深層的判斷（避免P0)」）
   做法：把要送審的 www（或 ios/App/App/public）整個複製一份（macOS 用 APFS 複製，幾秒、不佔空間），在副本上真的弄壞一處，
     再用同一支 check-www.js（--dir 指向副本）檢查。每一個壞樣本都必須被判失敗，而且錯誤裡要有那一處的檔名和原因；乾淨的那份必須全過。
     壞樣本走的是正式檢查的同一條路（同一支程式、真的檔案），不是在讀檔那一層假裝缺檔。
   每次從所有候選裡隨機挑一個來弄壞（PR #67 審查：固定挑第一個，正式檢查只查第一個也照樣過），收據記下挑了哪個。
   壞樣本（每一種都是一個會讓玩家看到 P0 的情況）：
     home     拿掉一個首頁素材（data/preload.json 列的）            → 開 App 首頁破圖
     bgm      拿掉一首背景音樂（data/bgm/index.json 列的）          → 媒體缺檔
     engine   拿掉一個引擎檔（pikafish.js／.wasm／.nnue）           → 電腦棋手不能下
     core     拿掉一個核心程式（capacitor.js、native-bridge.js…）  → 開不起來或原生功能失效
     big      前幾大的檔挑一個只留一半（不挑引擎檔）                → 切塊大檔沒接回、下載中斷（W30 類）
     swap     同樣大小、內容被換掉（清單有記 sha1 的檔）            → 雜湊不符
     bridge   index.html 裡 native-bridge.js 移到 App 程式後面      → 原生功能全部失效
     cdnstale App 會要的檔換成舊副本、清單也照舊副本改（加 --cdn 才跑） → 包跟 CDN 現行版不同（W42）：只有跟 CDN 比才抓得到
   用法：node scripts/canary-www.js --dir <www 資料夾> [--list <清單>] [--cdn | --cdn-manifest <網址或檔>] [--pkg <IPA 檔>] [--out <收據.json>] [--only home,bgm]
   結束代碼：0 乾淨的全過、每個壞樣本都被抓到；4 有壞樣本沒被抓到（檢查本身失靈，結果不可信）；2 測試不成立（乾淨的沒過、找不到可以弄壞的檔、複製失敗）；
     3 乾淨的沒錯、但加了 --cdn 卻讀不到 CDN 清單（缺驗）
   送審用的收據要 full＝true：加了 --cdn、沒有 --only、隨機挑檔。
   自我測試用：環境變數 XQ_CANARY_PICK＝first／last 固定挑第一個／最後一個（正式跑不要設，預設隨機） */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto"), cp = require("child_process");
const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
const CHECK = path.join(__dirname, "check-www.js");
const sha256 = (b) => crypto.createHash("sha256").update(b).digest("hex");
const sha1_12 = (b) => crypto.createHash("sha1").update(b).digest("hex").slice(0, 12);
/* 工具雜湊：CRLF 換成 LF、單獨的 CR 保留（跟 Android tool-pin.js 同一種算法；單獨 CR 在 JS 裡算換行，不能忽略） */
const toolSha = (p) => sha256(Buffer.from(fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n"), "utf8"));
/* 整個資料夾的雜湊：每個檔「相對路徑＋NUL＋SHA-256＋換行」照路徑排序後再算（收據綁住檢查的是哪一份內容） */
function treeSha(dir) {
  const out = [];
  const walk = (d, pre) => { for (const n of fs.readdirSync(d).sort()) { const p = path.join(d, n), r = pre ? pre + "/" + n : n, st = fs.lstatSync(p); if (st.isDirectory()) walk(p, r); else if (st.isFile()) out.push(r + "\0" + sha256(fs.readFileSync(p)) + "\n") } };
  walk(dir, ""); return sha256(out.sort().join(""));
}
const choose = (list) => { if (!list.length) return null; const m = process.env.XQ_CANARY_PICK; return m === "first" ? list[0] : m === "last" ? list[list.length - 1] : list[crypto.randomInt(list.length)] };
const at = (D, rel) => path.join(D, ...rel.split("/"));
const rewrite = (p, b) => { fs.rmSync(p); fs.writeFileSync(p, b) };   /* 先刪再寫：APFS 複製或硬連結都不會改到原本那份 */
const ENGINE = ["engine/pikafish.js", "engine/pikafish.wasm", "engine/pikafish.nnue"];
const CORE = ["capacitor.js", "native-bridge.js", "core.js", "engine.js", "local.js", "net.js", "zh.js"];
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
    cands: (D, L, M) => { const need = new Set([...preloadItems(D), ...bgmFiles(D)]); return Object.keys(M || {}).filter((rel) => need.has(rel) && Array.isArray(M[rel]) && M[rel][1] && L[rel] && fs.existsSync(at(D, rel))) },
    /* 模擬 W42：包裡放的是舊副本，清單也是照舊副本產生的（所以第 4 項比不出來），只有跟 CDN 比才抓得到 */
    break: (D, f, L) => { const b = Buffer.from(fs.readFileSync(at(D, f))); b[Math.floor(b.length / 2)] ^= 0xff; rewrite(at(D, f), b); const L2 = JSON.parse(JSON.stringify(L)); L2[f] = [b.length, sha1_12(b)]; return L2 },
    expect: (f) => "跟 CDN 現行版不同 " + f,
  },
};

function cloneDir(src, dst) {
  if (process.platform === "darwin") { const r = cp.spawnSync("cp", ["-cR", src, dst], { stdio: "ignore" }); if (r.status === 0) return }
  fs.cpSync(src, dst, { recursive: true });
}
const readManifest = (cdn) => /^https?:\/\//.test(cdn)
  ? cp.execFileSync(process.execPath, ["-e", "fetch(process.argv[1]).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.text()}).then(t=>process.stdout.write(t)).catch(e=>{console.error(e.message);process.exit(1)})", cdn], { encoding: "utf8", maxBuffer: 256e6, timeout: 120000, stdio: ["ignore", "pipe", "pipe"] })
  : fs.readFileSync(cdn, "utf8");

/* 主流程（自我測試直接呼叫）：回傳 { code, receipt } */
function run({ dir, list = null, cdn = null, pkg = null, only = null, tmp = os.tmpdir(), log = console.log }) {
  const unfit = (why, code = 2) => ({ code, receipt: { tool: "P0-IMG-canary", platform: "ios", unfit: true, why } });
  if (!dir || !fs.existsSync(path.join(dir, "index.html"))) return unfit("找不到要檢查的 www（--dir）：" + dir);
  const LF = list ? path.resolve(list) : path.join(__dirname, ".www-files.json");
  let LJ; try { LJ = JSON.parse(fs.readFileSync(LF, "utf8")) } catch (e) { return unfit("讀不到清單 " + LF) }
  const L = LJ.files || {};
  const cdnArgs = cdn ? ["--cdn-manifest", cdn] : [];
  const check = (d, lf) => cp.spawnSync(process.execPath, [CHECK, "--dir", d, "--list", lf, "--all", ...cdnArgs], { encoding: "utf8", maxBuffer: 256e6 });
  const clean = check(dir, LF);
  if (clean.status === 3) return unfit("乾淨的樣本沒錯，但讀不到 CDN 清單（缺驗）：" + String(clean.stderr).split("\n")[0], 3);
  if (clean.status !== 0) return unfit("乾淨的樣本沒過 check-www.js（先修好再跑金絲雀）：" + String(clean.stderr).split("\n")[0]);
  /* 金絲雀自己也讀一份 CDN 清單，只用來挑 cdnstale 要弄壞哪個檔；判斷照樣交給 check-www.js */
  let M = null;
  if (cdn) { try { M = JSON.parse(readManifest(cdn)).files } catch (e) { return unfit("金絲雀讀不到 CDN 清單：" + cdn, 3) } }
  const want = only ? only.split(",").map((s) => s.trim()).filter(Boolean) : Object.keys(KINDS).filter((k) => cdn || !KINDS[k].needsCdn);
  for (const k of want) { if (!KINDS[k]) return unfit("不認得的壞樣本：" + k + "（可用：" + Object.keys(KINDS).join(" ") + "）"); if (KINDS[k].needsCdn && !cdn) return unfit(k + " 要加 --cdn 才能跑") }
  const results = [], base = fs.mkdtempSync(path.join(tmp, "xq-canary-www-"));
  try {
    for (const k of want) {
      const K = KINDS[k];
      let cands = []; try { cands = K.cands(dir, L, M) } catch (e) { cands = [] }
      const f = choose(cands);
      if (!f) { results.push({ kind: k, caught: false, unfit: true, why: "乾淨的樣本裡找不到可以弄壞的檔" }); continue }
      const D = path.join(base, k);
      let lf = LF;
      try { cloneDir(dir, D); const L2 = K.break(D, f, L); if (L2) { lf = path.join(base, k + "-list.json"); fs.writeFileSync(lf, JSON.stringify({ ...LJ, files: L2 })) } }
      catch (e) { results.push({ kind: k, file: f, caught: false, unfit: true, why: "做壞樣本失敗：" + e.message }); continue }
      const r = check(D, lf), out = String(r.stdout) + String(r.stderr), exp = K.expect(f);
      const caught = r.status === 1 && out.includes(exp);
      results.push({ kind: k, file: f, candidates: cands.length, expect: exp, exit: r.status, caught });
      log((caught ? "✔ " : "✘ ") + k + "：" + f + "（候選 " + cands.length + " 個）" + (caught ? " 被抓到" : " 沒被抓到（結束代碼 " + r.status + "，錯誤裡" + (out.includes(exp) ? "有" : "沒有") + "「" + exp + "」）"));
      fs.rmSync(D, { recursive: true, force: true });
    }
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
  const receipt = {
    tool: "P0-IMG-canary", platform: "ios", at: new Date().toISOString(),
    sample: { dir: path.basename(path.resolve(dir)), treeSha256: treeSha(dir), indexSha256: sha256(fs.readFileSync(path.join(dir, "index.html"))), listSha256: sha256(fs.readFileSync(LF)), siteVersion: LJ.siteVersion || null, commit: LJ.commit || null },
    pkg: pkg ? { file: path.basename(pkg), sha256: sha256(fs.readFileSync(pkg)) } : null,
    cdn: cdn ? { manifest: cdn } : null,
    /* 工具自己算、自己寫進收據：只抓得到本機不小心改過（例如忘了切回 main）；故意偽造要靠之後的 CI 用 main 版工具重跑（Android PR③） */
    toolPins: { "source/xiangqi-ios/scripts/check-www.js": toolSha(CHECK), "source/xiangqi-ios/scripts/canary-www.js": toolSha(__filename) },
    pick: process.env.XQ_CANARY_PICK || "random",
    kinds: want, results, full: !only && !!cdn && !process.env.XQ_CANARY_PICK,
    pass: results.length === want.length && results.every((x) => x.caught === true),
  };
  const anyUnfit = results.some((x) => x.unfit);
  return { code: receipt.pass ? 0 : anyUnfit ? 2 : 4, receipt };
}

module.exports = { run, KINDS, toolSha, treeSha };
if (require.main === module) {
  const cdn = opt("--cdn-manifest") || (argv.includes("--cdn") ? "https://xiangqi-cdn.pages.dev/cdn-manifest.json" : null);
  const { code, receipt } = run({ dir: opt("--dir"), list: opt("--list"), cdn, pkg: opt("--pkg"), only: opt("--only") });
  if (receipt.unfit) console.error((code === 3 ? "△ 缺驗：" : "✘ 測試不成立：") + receipt.why);
  if (opt("--out")) fs.writeFileSync(opt("--out"), JSON.stringify(receipt, null, 1) + "\n");
  if (!receipt.unfit) console.log(receipt.pass
    ? `✔ 金絲雀：${receipt.results.length} 個壞樣本都被 check-www.js 抓到` + (receipt.full ? "" : "（沒加 --cdn、只跑部分或固定挑檔，送審不能用）")
    : "✘ 金絲雀沒過：" + receipt.results.filter((x) => !x.caught).map((x) => x.kind).join("、") + (code === 4 ? "——檢查本身失靈，這一輪的 P0-IMG 結果不可信" : ""));
  process.exit(code);
}
