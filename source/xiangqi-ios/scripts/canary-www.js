#!/usr/bin/env node
/* iOS P0-IMG 金絲雀（AGENTS.md「P0 出口驗證要難作假」，開發者 2026-11-23：「ios金絲雀也要做」「壞樣本能自己製作，包含媒體缺檔之類的，然後加入金絲雀比較深層的判斷（避免P0)」）
   做法：把要送審的 www（或 ios/App/App/public）整個複製一份（macOS 用 APFS 複製，幾秒、不佔空間），在副本上真的弄壞一處，
     再用同一支 check-www.js（--dir 指向副本）檢查。每一個壞樣本都必須被判失敗，而且錯誤裡要有那一處的檔名和原因；
     乾淨的那份必須全過。壞樣本走的是正式檢查的同一條路（同一支程式、真的檔案），不是在讀檔那一層假裝缺檔。
   壞樣本（每一種都是一個會讓玩家看到 P0 的情況）：
     home   拿掉首頁素材（data/preload.json 列的第一個檔）        → 開 App 首頁破圖
     bgm    拿掉一首背景音樂（data/bgm/index.json 列的）          → 媒體缺檔
     engine 拿掉引擎權重 engine/pikafish.nnue                   → 電腦棋手不能下
     big    最大的檔只留一半（清單裡最大的一個檔）                 → 切塊大檔沒接回、下載中斷
     swap   同樣大小、內容被換掉（清單有記 sha1 的檔）           → 包跟發布版不同（W42 類）
     bridge index.html 裡 native-bridge.js 移到 App 程式後面     → 原生功能全部失效
   用法：node scripts/canary-www.js --dir <www 資料夾> [--list <清單，預設 scripts/.www-files.json>] [--out <收據.json>] [--only home,bgm]
   結束代碼：0 乾淨的全過、每個壞樣本都被抓到；4 有壞樣本沒被抓到（檢查本身失靈，結果不可信）；2 測試不成立（乾淨的沒過、找不到可以弄壞的檔、複製失敗） */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), crypto = require("crypto"), cp = require("child_process");
const argv = process.argv.slice(2), opt = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
const CHECK = path.join(__dirname, "check-www.js");
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");

/* 每一種壞樣本：pick 從乾淨的樣本挑要弄壞的檔（挑不到回 null）；break 在副本上真的弄壞；expect 是 check-www 錯誤裡要出現的字 */
const KINDS = {
  home: {
    pick: (D) => { const P = JSON.parse(fs.readFileSync(path.join(D, "data", "preload.json"), "utf8")); const it = (P.items || []).find((x) => fs.existsSync(path.join(D, x[0]))); return it ? it[0] : null },
    break: (D, f) => fs.rmSync(path.join(D, f)),
    expect: (f) => "preload.json 列了但沒有：" + f,
  },
  bgm: {
    pick: (D) => { const B = JSON.parse(fs.readFileSync(path.join(D, "data", "bgm", "index.json"), "utf8")); for (const [era, list] of Object.entries(B)) for (const f of Array.isArray(list) ? list : []) { const r = "data/bgm/" + era + "/" + f; if (typeof f === "string" && fs.existsSync(path.join(D, r))) return r } return null },
    break: (D, f) => fs.rmSync(path.join(D, f)),
    expect: (f) => "背景音樂清單有但沒有檔：" + f,
  },
  engine: {
    pick: (D) => (fs.existsSync(path.join(D, "engine", "pikafish.nnue")) ? "engine/pikafish.nnue" : null),
    break: (D, f) => fs.rmSync(path.join(D, f)),
    expect: (f) => "缺引擎 " + f,
  },
  big: {
    pick: (D, L) => { let best = null; for (const [rel, [sz]] of Object.entries(L)) if (sz > 1024 && rel !== "index.html" && !rel.startsWith("engine/") && fs.existsSync(path.join(D, rel)) && (!best || sz > L[best][0])) best = rel; return best },   /* 清單裡最大的檔（通常是切塊下載的大檔；引擎檔交給 engine 那一種） */
    break: (D, f) => { const p = path.join(D, f), n = fs.statSync(p).size, b = Buffer.alloc(Math.floor(n / 2)); const fd = fs.openSync(p, "r"); fs.readSync(fd, b, 0, b.length, 0); fs.closeSync(fd); fs.rmSync(p); fs.writeFileSync(p, b) },
    expect: (f) => "大小不對 " + f,
  },
  swap: {
    pick: (D, L) => { for (const [rel, [sz, h]] of Object.entries(L)) if (h && sz >= 16 && /\.(json|webp|png|jpg|mp3|js)$/.test(rel) && rel !== "index.html" && fs.existsSync(path.join(D, rel))) return rel; return null },
    break: (D, f) => { const p = path.join(D, f), b = fs.readFileSync(p); b[Math.floor(b.length / 2)] ^= 0xff; fs.rmSync(p); fs.writeFileSync(p, b) },
    expect: (f) => "內容跟清單不同 " + f,
  },
  bridge: {
    pick: (D) => { const h = fs.readFileSync(path.join(D, "index.html"), "utf8"); return h.includes('<script src="native-bridge.js"></script>') && h.includes('<script src="core.js"></script>') ? "index.html" : null },
    break: (D, f) => { const p = path.join(D, f); let h = fs.readFileSync(p, "utf8"); const tag = '<script src="native-bridge.js"></script>'; h = h.replace(tag, ""); h = h.replace('<script src="core.js"></script>', '<script src="core.js"></script>' + tag); fs.rmSync(p); fs.writeFileSync(p, h) },
    expect: () => "index.html 裡 native-bridge.js 的位置不對",
  },
};

/* 複製整個資料夾：macOS 先用 APFS 複製（cp -c），不行再用一般複製。壞樣本一律先刪再寫，不會改到原本那份 */
function cloneDir(src, dst) {
  if (process.platform === "darwin") { const r = cp.spawnSync("cp", ["-cR", src, dst], { stdio: "ignore" }); if (r.status === 0) return }
  fs.cpSync(src, dst, { recursive: true });
}
const check = (dir, list) => cp.spawnSync(process.execPath, [CHECK, "--dir", dir, ...(list ? ["--list", list] : [])], { encoding: "utf8", maxBuffer: 64e6 });

/* 主流程（自我測試直接呼叫）：回傳 { code, receipt } */
function run({ dir, list = null, only = null, tmp = os.tmpdir(), log = console.log }) {
  const unfit = (why) => ({ code: 2, receipt: { tool: "P0-IMG-canary", platform: "ios", unfit: true, why } });
  if (!dir || !fs.existsSync(path.join(dir, "index.html"))) return unfit("找不到要檢查的 www（--dir）：" + dir);
  const LF = list ? path.resolve(list) : path.join(__dirname, ".www-files.json");
  let L; try { L = JSON.parse(fs.readFileSync(LF, "utf8")).files } catch (e) { return unfit("讀不到清單 " + LF) }
  const clean = check(dir, list);
  if (clean.status !== 0) return unfit("乾淨的樣本沒過 check-www.js（先修好再跑金絲雀）：" + String(clean.stderr).split("\n")[0]);
  const want = only ? only.split(",").map((s) => s.trim()).filter(Boolean) : Object.keys(KINDS);
  for (const k of want) if (!KINDS[k]) return unfit("不認得的壞樣本：" + k + "（可用：" + Object.keys(KINDS).join(" ") + "）");
  const results = [], base = fs.mkdtempSync(path.join(tmp, "xq-canary-www-"));
  try {
    for (const k of want) {
      const K = KINDS[k];
      let f; try { f = K.pick(dir, L) } catch (e) { f = null }
      if (!f) { results.push({ kind: k, caught: false, unfit: true, why: "乾淨的樣本裡找不到可以弄壞的檔" }); continue }
      const D = path.join(base, k);
      try { cloneDir(dir, D); K.break(D, f) } catch (e) { results.push({ kind: k, file: f, caught: false, unfit: true, why: "做壞樣本失敗：" + e.message }); continue }
      const r = check(D, list), out = String(r.stdout) + String(r.stderr), exp = K.expect(f);
      const caught = r.status === 1 && out.includes(exp);
      results.push({ kind: k, file: f, expect: exp, exit: r.status, caught });
      log((caught ? "✔ " : "✘ ") + k + "：" + f + (caught ? " 被抓到" : "沒被抓到（結束代碼 " + r.status + "，錯誤裡" + (out.includes(exp) ? "有" : "沒有") + "「" + exp + "」）"));
      fs.rmSync(D, { recursive: true, force: true });
    }
  } finally { fs.rmSync(base, { recursive: true, force: true }) }
  const receipt = {
    tool: "P0-IMG-canary", platform: "ios", at: new Date().toISOString(),
    sample: { dir: path.basename(path.resolve(dir)), indexSha256: sha256(path.join(dir, "index.html")), listSha256: sha256(LF) },
    toolPins: { "source/xiangqi-ios/scripts/check-www.js": sha256(CHECK), "source/xiangqi-ios/scripts/canary-www.js": sha256(__filename) },
    kinds: want, results, full: !only,
    pass: results.length === want.length && results.every((x) => x.caught === true),
  };
  const anyUnfit = results.some((x) => x.unfit);
  return { code: receipt.pass ? 0 : anyUnfit ? 2 : 4, receipt };
}

module.exports = { run, KINDS };
if (require.main === module) {
  const { code, receipt } = run({ dir: opt("--dir"), list: opt("--list"), only: opt("--only") });
  if (receipt.unfit) console.error("✘ 測試不成立：" + receipt.why);
  if (opt("--out")) fs.writeFileSync(opt("--out"), JSON.stringify(receipt, null, 1) + "\n");
  if (!receipt.unfit) console.log(receipt.pass ? `✔ 金絲雀：${receipt.results.length} 個壞樣本都被 check-www.js 抓到` + (receipt.full ? "" : "（只跑部分，送審不能用）") : "✘ 金絲雀沒過：" + receipt.results.filter((x) => !x.caught).map((x) => x.kind).join("、") + (code === 4 ? "——檢查本身失靈，這一輪的 P0-IMG 結果不可信" : ""));
  process.exit(code);
}
