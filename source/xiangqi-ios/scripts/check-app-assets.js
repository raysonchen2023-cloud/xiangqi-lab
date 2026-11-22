#!/usr/bin/env node
/* 象棋千秋 iOS：送審前的安裝包素材檢查（W69②，2026-11-22；對應 Android 的 xiangqi-android/scripts/check-aab-assets.js）
   Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later

   為什麼：程式碼沒錯、測試全過，安裝包卻可能缺東西或放到舊圖（Android 封測 W21、W30 都是這樣）。
   這支直接看「玩家拿到的成品」：.app 資料夾或 .ipa 裡的 public/（網頁成品），不看原始碼。
   iOS 原生版沒有向 CDN 補抓的程式（127.0.0.1 本機伺服器只讀包內 public/），設計上整包離線可用，所以：
     ✘ 首頁離線必要素材（xiangqi-android/scripts/bundle-home-assets.js 的 required，三平台共用一份）不在包裡
     ✘ data/preload.json（＋big、big-books.json）列的檔：在包裡但 SHA-1 前 8 碼對不上＝顯示舊內容
     ✘ 上面列的圖片／音樂／模型、CDN 切塊的大檔不在包裡：離線時直接破圖（連線時只能靠網頁程式自己改抓 CDN，不算數）
     △ 上面列的 JSON 不在包裡：網頁程式會自己改抓 CDN（00-util.js），列出來但不擋
     ✘ 加 --cdn（或 --manifest 本機檔）：包裡 data/、engine/ 的檔跟 CDN 的 cdn-manifest.json 比大小與 SHA-1 前 12 碼，對不上＝包跟玩家在網頁版拿到的不是同一份
   用法：node scripts/check-app-assets.js --app <App.app 或 .ipa> [--cdn | --manifest <cdn-manifest.json>] [--gate] [--home <bundle-home-assets.js>] [--out 報告.json]
     --gate＝送審閘門用：沒加 --cdn（或 --manifest）就直接結束代碼 2，不會被誤當成通過；報告 JSON 的 p0img 欄寫 pass／fail／缺驗
     首頁必要素材清單預設讀同一個倉庫的 ../../xiangqi-android/scripts/bundle-home-assets.js；只複製 xiangqi-ios 出去時用 --home 指定
   結束代碼：0＝沒有 ✘；1＝有 ✘；2＝用法或環境錯誤；3＝要核對 CDN 卻抓不到清單（缺驗，不能送審）
   P0-IMG（iOS 包內素材）通過條件＝加 --gate --cdn 且結束代碼 0 */
"use strict";
const fs = require("fs"), path = require("path"), os = require("os"), cp = require("child_process"), crypto = require("crypto");

const CDN = "https://xiangqi-cdn.pages.dev/";
const MEDIA = /\.(webp|png|jpe?g|gif|svg|mp3|ogg|m4a|wav|glb|gltf|bin|mp4|webm)$/i;
const SPLIT = 20 * 1024 * 1024;   /* tools/cdn-deploy.js：超過 20 MB 的檔在 CDN 上切塊 */
const sha1 = b => crypto.createHash("sha1").update(b).digest("hex");

/* 結束代碼：有 ✘＝1；要核對 CDN 卻缺驗＝3；其餘＝0 */
function exitCode({ red, unknown }) { return red ? 1 : unknown ? 3 : 0 }

/* 找出 public/：.app 直接用；.ipa 解到暫存資料夾、找 Payload/<名>.app/public */
function openApp(p, tmp) {
  if (fs.statSync(p).isDirectory()) { const pub = path.join(p, "public"); return fs.existsSync(pub) ? pub : null }
  cp.execFileSync("unzip", ["-q", "-o", p, "-d", tmp], { stdio: ["ignore", "ignore", "pipe"], maxBuffer: 1e8 });
  const pay = path.join(tmp, "Payload");
  const app = fs.existsSync(pay) ? fs.readdirSync(pay).find(n => n.endsWith(".app")) : null;
  const pub = app ? path.join(pay, app, "public") : null;
  return pub && fs.existsSync(pub) ? pub : null;
}
function walk(root) {
  const m = new Map();
  (function w(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name);
    if (e.isDirectory()) w(f); else m.set(path.relative(root, f).split(path.sep).join("/"), f) } })(root);
  return m;
}
function homeRequired(homeArg) {
  const f = homeArg || path.join(__dirname, "..", "..", "xiangqi-android", "scripts", "bundle-home-assets.js");
  if (!fs.existsSync(f)) return null;
  return require(path.resolve(f)).required.map(x => "data/" + x);
}

/* 核對：pub＝public/ 路徑；manifest＝CDN 清單的 files（null＝不核對 CDN）；home＝首頁必要素材 */
function check(pub, { manifest = null, home = [] } = {}) {
  const inPack = walk(pub), R = { red: [], warn: [], inPack: 0, viaWeb: 0, cdnChecked: 0 };
  const readJson = f => inPack.has(f) ? JSON.parse(fs.readFileSync(inPack.get(f), "utf8")) : null;
  let build = null;
  if (!inPack.has("index.html")) R.red.push({ f: "index.html", why: "包裡沒有首頁 index.html" });
  else { const m = fs.readFileSync(inPack.get("index.html"), "utf8").match(/XQ_BUILD="([0-9-]+)"/); build = m ? m[1] : null }
  for (const f of home) if (!inPack.has(f)) R.red.push({ f, why: "首頁離線必要素材不在安裝包裡（第一次離線開啟就破圖）" });
  const preload = readJson("data/preload.json");
  if (!preload || !Array.isArray(preload.items)) R.red.push({ f: "data/preload.json", why: "包裡沒有素材清單 data/preload.json（不能確認素材齊不齊）" });
  const need = new Map();
  for (const [f, size, h] of (preload && preload.items) || []) need.set(f, { size, h });
  for (const [f, size, h] of (preload && preload.big) || []) need.set(f, { size, h, big: true });
  for (const b of readJson("data/big-books.json") || []) need.set("data/" + b.key + ".json", { size: b.size, h: b.h, big: true });
  for (const [f, n] of need) {
    if (inPack.has(f)) {
      const h = n.h ? sha1(fs.readFileSync(inPack.get(f))).slice(0, 8) : null;
      if (h && h !== n.h) R.red.push({ f, why: `安裝包裡的檔跟清單不符（SHA-1 前 8 碼 ${h}，清單 ${n.h}）：會顯示舊內容` });
      else R.inPack++;
      continue;
    }
    if (n.big || n.size > SPLIT) R.red.push({ f, why: "CDN 上切塊的大檔不在安裝包裡，iOS 原生不會補抓：讀不到" });
    else if (MEDIA.test(f)) R.red.push({ f, why: "不在安裝包裡，iOS 原生不會向 CDN 補抓：離線時直接破圖" });
    else { R.warn.push({ f, why: "不在安裝包裡；網頁程式會自己改抓 CDN（離線時讀不到）" }); R.viaWeb++ }
  }
  if (manifest) for (const [f, file] of inPack) {
    if (!/^(data|engine)\//.test(f)) continue;
    const m = manifest[f]; if (!m) continue;   /* CDN 沒有的（例如 preload.json、big-books.json 只在 GitHub）不比 */
    R.cdnChecked++;
    const st = fs.statSync(file);
    if (st.size !== m[0]) { R.red.push({ f, why: `跟 CDN 不是同一份（大小 ${st.size}，CDN ${m[0]}）` }); continue }
    const h = sha1(fs.readFileSync(file)).slice(0, 12);
    if (h !== m[1]) R.red.push({ f, why: `跟 CDN 不是同一份（SHA-1 前 12 碼 ${h}，CDN ${m[1]}）` });
  }
  return { build, files: inPack.size, need: need.size, ...R };
}

async function main() {
  const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null };
  const die = (m, c = 2) => { console.error("✘ " + m); process.exit(c) };
  const APP = arg("--app"), OUT = arg("--out"), MAN = arg("--manifest"), CDN_CHECK = process.argv.includes("--cdn"), GATE = process.argv.includes("--gate");
  if (!APP || !fs.existsSync(APP)) die("用法：node scripts/check-app-assets.js --app <App.app 或 .ipa> [--cdn | --manifest <cdn-manifest.json>] [--gate] [--home <bundle-home-assets.js>] [--out 報告.json]");
  const home = homeRequired(arg("--home"));
  if (!home) die("找不到首頁必要素材清單 bundle-home-assets.js：在公開倉庫裡跑，或用 --home 指定");
  if (GATE && !CDN_CHECK && !MAN) die("--gate（送審閘門）一定要核對 CDN：請加 --cdn");
  /* .ipa 的暫存資料夾一開始就建、一定清（PR #41 審查 c：解壓失敗或找不到 public/ 時原本沒清） */
  const cleanup = fs.statSync(APP).isDirectory() ? null : fs.mkdtempSync(path.join(os.tmpdir(), "xq-ipachk-"));
  try {
    let pub = null;
    try { pub = openApp(APP, cleanup) } catch (e) { console.error("✘ 讀不到安裝包：" + String(e.stderr || e.message).slice(0, 200)); process.exitCode = 2; return }
    if (!pub) { console.error("✘ 安裝包裡找不到 public/（.app 要有 public/；.ipa 要有 Payload/<名>.app/public/）"); process.exitCode = 2; return }
    let manifest = null, unknown = 0, cdnAt = null;
    if (MAN) { const j = JSON.parse(fs.readFileSync(MAN, "utf8")); manifest = j.files || j; cdnAt = j.at || null }
    else if (CDN_CHECK) {
      for (let t = 0; t < 4 && !manifest; t++) {
        if (t) await new Promise(r => setTimeout(r, 800 * t));
        try { const r = await fetch(CDN + "cdn-manifest.json?t=" + Date.now()); if (r.ok) { const j = await r.json(); manifest = j.files; cdnAt = j.at || null } } catch (e) {}
      }
      if (!manifest) unknown = 1;
    }
    const R = check(pub, { manifest, home });
    const code = exitCode({ red: R.red.length, unknown });
    const p0img = !manifest && !unknown ? "沒核對 CDN" : code === 0 ? "pass" : code === 3 ? "缺驗" : "fail";   /* PR #41 審查 b：送審報告直接寫 P0-IMG 結果 */
    console.log(`安裝包：${path.basename(APP)}（XQ_BUILD ${R.build || "讀不到"}，public/ 共 ${R.files} 個檔）`);
    console.log(`首頁必要素材 ${home.length} 項；素材清單 ${R.need} 項：在包裡 ${R.inPack}、靠網頁改抓 CDN ${R.viaWeb}`);
    console.log(manifest ? `CDN 清單（${cdnAt || "時間不明"}）：核對了 ${R.cdnChecked} 個檔` : unknown ? "△ 抓不到 CDN 的 cdn-manifest.json：沒核對" : "沒核對 CDN（加 --cdn 才會比對 cdn-manifest.json）");
    const group = list => { const g = new Map(); for (const x of list) g.set(x.why.replace(/（.*）/, ""), (g.get(x.why.replace(/（.*）/, "")) || []).concat(x.f)); return g };
    for (const [why, fs_] of group(R.red)) console.log(`✘ ${fs_.length} 項｜${why}\n    例：${fs_.slice(0, 5).join("、")}`);
    for (const [why, fs_] of group(R.warn)) console.log(`△ ${fs_.length} 項｜${why}\n    例：${fs_.slice(0, 5).join("、")}`);
    console.log(code === 1 ? `✘ 不能送審：${R.red.length} 項`
      : code === 3 ? "△ 還不能送審：CDN 清單沒抓到（缺驗），請稍後重跑 --cdn"
      : manifest ? "✔ 安裝包素材沒有發現會破圖、放錯版或跟 CDN 不同的問題"
      : "✔ 安裝包本身沒有問題；送審前還要加 --cdn 核對 CDN（P0-IMG 通過條件＝--cdn 且結束代碼 0）");
    if (OUT) fs.writeFileSync(OUT, JSON.stringify({ app: path.basename(APP), build: R.build, files: R.files, need: R.need, inPack: R.inPack, viaWeb: R.viaWeb,
      cdnChecked: R.cdnChecked, cdnAt, unknown, gate: GATE, p0img, exitCode: code, redItems: R.red, warnItems: R.warn }, null, 1) + "\n");
    process.exitCode = code;
  } finally { if (cleanup) fs.rmSync(cleanup, { recursive: true, force: true }) }
}
module.exports = { check, exitCode, homeRequired };
if (require.main === module) main().catch(e => { console.error("✘ " + (e.stack || e)); process.exit(2) });
