#!/usr/bin/env node
/* 把《象棋千秋》網頁成品複製進 Capacitor 的 www/（iOS 安裝檔裡的網頁資源）。
   來源（全部唯讀，不改 xiangqi-lab/site 的工作區、不改 git 索引）：
     1. 程式與 git 追蹤的檔：取「已發布的 commit」（預設 origin/main；--ref 可改），用 git ls-tree／cat-file 讀出來，不 checkout。
        原因：site/ 工作區常是別人沒發布的本機建置（11/13 查到工作區 sw.js 是 20261110-2302，線上是 20261113-0330）。
     2. git 沒追蹤的大檔（data/ 底下的圖、音樂、3D 模型、棋譜，engine/ 的神經網路）：讀 site/ 工作區。
        這些檔玩家實際是從 Cloudflare CDN 拿的；加 --cdn-check 會抓 CDN 的 cdn-manifest.json 比對大小和 sha1，
        加 --cdn-fetch 會把對不上的檔直接從 CDN 下載進 www/（確保跟玩家拿到的一模一樣）。
   不包進安裝檔：.git、.github、點開頭的檔、data/_rekey_backup/（備份）、data/tripo_anim/（App 沒用到、沒發布）、
     data/evidence/（開發測試錄影）、AGENTS.md、releases/、data/docs/verification-log.txt（開發用文件）、檔名有 .old 的檔、data/banlist.json（停權名單要即時，App 一律上網抓，見 native-bridge.js）。
   會改的：只有 www/index.html 在 <meta charset> 後面插一行 <script src="native-bridge.js"></script>（原生橋接，見 src/native-bridge.js）。
   用法：
     node scripts/copy-www.js                 照預設複製（只抄有變的檔；www/ 裡多的檔會刪掉）
     node scripts/copy-www.js --dry           只算要複製什麼、多大，不寫檔
     node scripts/copy-www.js --ref <commit>  指定已發布的 commit（預設 origin/main）
     node scripts/copy-www.js --site <資料夾>   網頁來源改用這個公開倉庫的本機 git（重建用，見 REBUILD.md）
     node scripts/copy-www.js --cdn-check     另外比對 CDN 上的版本（要網路）
     node scripts/copy-www.js --cdn-fetch     比對後把不一樣的檔從 CDN 下載進 www/（要網路）
     node scripts/copy-www.js --exclude data/tour-,data/gmgames.json   額外不包某些路徑（例如授權待查的比賽對局；App 要用時會去 CDN 抓）
   輸出：www/、www/native-build.json（版本、大小摘要）、scripts/.www-files.json（每個檔的大小與 sha1，給 check-www.js 用，不放進安裝檔） */
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), cp = require("child_process");

const HERE = path.join(__dirname, "..");
/* W32-B：--site <公開倉庫的本機 git> 指定網頁來源（重建時用）；沒給就照舊用並排的 ../xiangqi-lab/site */
const SITE = (() => { const a = process.argv.slice(2), i = a.indexOf("--site"); return i >= 0 && a[i + 1] ? path.resolve(a[i + 1]) : path.resolve(HERE, "..", "xiangqi-lab", "site"); })();
const WWW = path.join(HERE, "www");
const BRIDGE_SRC = path.join(HERE, "src", "native-bridge.js");
const LIST_OUT = path.join(__dirname, ".www-files.json");
const CDN = "https://xiangqi-cdn.pages.dev/";

const args = process.argv.slice(2), has = f => args.includes(f);
const DRY = has("--dry"), CDN_CHECK = has("--cdn-check") || has("--cdn-fetch"), CDN_FETCH = has("--cdn-fetch");
const REF = (() => { const i = args.indexOf("--ref"); return i >= 0 && args[i + 1] ? args[i + 1] : "origin/main"; })();

const SKIP = [
  /^\.git(\/|$)/, /^\.github(\/|$)/, /(^|\/)\./,
  /^data\/_rekey_backup\//, /^data\/tripo_anim\//, /^data\/evidence\//,
  /\.old/, /^data\/banlist\.json$/,
  /^data\/docs\/android\.md$/,   /* 11/17 iMac H：iOS 包不放 Android 的安裝說明（網頁版照舊有；這裡只管 iOS 的 www） */
  /^AGENTS\.md$/, /^releases\//, /^data\/docs\/verification-log\.txt$/,   /* 11/23 iMac Claude 1 #80 iOS 預驗：給 Claude 的規則檔、發布說明（releases/android.md）、CI 驗證紀錄是開發用文件，App 不讀，不放進 iOS 包（網頁版照舊公開） */
  /^(support|privacy)\.html$/,
  /^data\/voice\//,   /* 11/18 iMac R2 驗 1041 的 P1（準則 5.2）：12 個 Windows 語音檔已改用手機系統語音朗讀、程式不再讀，不放進 iOS 包（公開倉庫與 CDN 的舊檔下次發布時另外清） */
  /^source(\/|$)/,   /* 11/17 iMac K P3-4：原生包不放 source/（裡面有 xiangqi-lab/tools/test-*.js 這類開發檔）；GPL 原始碼由關於頁連到的公開倉庫（github …/tree/main/source）提供，App 內沒有任何地方讀本機的 source/ */   /* 11/17：App Store Connect 填的支援網址、隱私權政策網址用的公開網頁，App 裡用不到，不包進 iOS */
];
/* --exclude data/tour-,data/gmgames.json：額外不包的路徑前綴（授權台帳標「待查／先排除」的素材，開發者決定先拿掉時用） */
const EXTRA = (() => { const i = args.indexOf("--exclude"); return i >= 0 && args[i + 1] ? args[i + 1].split(",").map(s => s.trim()).filter(Boolean) : []; })();
const skip = rel => SKIP.some(r => r.test(rel)) || EXTRA.some(p => rel.startsWith(p));
const MB = b => (b / 1048576).toFixed(1) + " MB";
const sha1 = b => crypto.createHash("sha1").update(b).digest("hex");
const git = (a, opt) => cp.spawnSync("git", ["-C", SITE, ...a], { maxBuffer: 1 << 30, ...(opt || {}) });

function die(msg) { console.error("✘ " + msg); process.exit(1); }

/* ---------- 1. 已發布 commit 的檔 ---------- */
function fromGit() {
  const rev = git(["rev-parse", "--verify", REF + "^{commit}"]);
  if (rev.status !== 0) die("找不到 " + REF + "（先在 xiangqi-lab/site 跑 git fetch？這支腳本不會幫你 fetch）");
  const commit = rev.stdout.toString().trim();
  const ls = git(["ls-tree", "-r", "-l", "-z", commit]);
  if (ls.status !== 0) die("git ls-tree 失敗：" + ls.stderr);
  const ents = [];
  for (const rec of ls.stdout.toString("utf8").split("\0")) {
    if (!rec) continue;
    const tab = rec.indexOf("\t"), meta = rec.slice(0, tab).split(/\s+/), rel = rec.slice(tab + 1);
    if (meta[1] !== "blob") continue;
    if (skip(rel)) continue;
    ents.push({ rel, oid: meta[2], size: +meta[3] });
  }
  /* 一次把所有 blob 讀出來（git cat-file --batch：「<oid> blob <size>\n<內容>\n」） */
  const r = git(["cat-file", "--batch"], { input: ents.map(e => e.oid).join("\n") + "\n" });
  if (r.status !== 0) die("git cat-file 失敗：" + r.stderr);
  const out = r.stdout; let o = 0;
  for (const e of ents) {
    const nl = out.indexOf(10, o), head = out.slice(o, nl).toString().split(" ");
    if (head[0] !== e.oid || head[1] !== "blob") die("讀 blob 失敗：" + e.rel);
    const n = +head[2]; e.buf = out.subarray(nl + 1, nl + 1 + n); o = nl + 1 + n + 1;
  }
  return { commit, ents };
}

/* ---------- 2. 工作區裡 git 沒追蹤的 data/、engine/ 大檔 ---------- */
function fromWorktree(tracked) {
  const out = [];
  const walk = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name), r = rel + "/" + e.name;
      if (skip(r)) continue;
      if (e.isDirectory()) { walk(p, r); continue; }
      if (tracked.has(r)) continue;          // git 有的一律用已發布的那份
      const st = fs.statSync(p);
      out.push({ rel: r, src: p, size: st.size, mtime: st.mtime });
    }
  };
  for (const d of ["data", "engine"]) if (fs.existsSync(path.join(SITE, d))) walk(path.join(SITE, d), d);
  return out;
}

/* ---------- 3. 插入原生橋接 ---------- */
function injectBridge(buf) {
  let html = buf.toString("utf8");
  const tag = '<script src="capacitor.js"></script>\n<script src="native-bridge.js"></script>';
  if (html.includes('<script src="native-bridge.js"></script>')) return Buffer.from(html, "utf8");
  const m = html.match(/<meta charset="utf-8">/i);
  if (!m) die("index.html 找不到 <meta charset=\"utf-8\">，沒辦法插入 native-bridge.js");
  html = html.replace(m[0], m[0] + "\n" + tag);
  return Buffer.from(html, "utf8");
}

/* 控制字元檢查（記憶：Bash 會把反斜線吃成控制字元，11/11 整個打不開） */
function ctlCheck(rel, buf) {
  if (!/\.(html|js|mjs|json|css|md)$/.test(rel)) return null;
  const s = buf.toString("utf8"), m = s.match(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/);
  return m ? `${rel}：有控制字元 U+${m[0].charCodeAt(0).toString(16).padStart(4, "0")}（位置 ${m.index}）` : null;
}

/* ---------- 4. CDN 比對 ---------- */
async function cdnManifest() {
  const r = await fetch(CDN + "cdn-manifest.json?t=" + Date.now());
  if (!r.ok) throw new Error("抓不到 cdn-manifest.json（" + r.status + "）");
  return (await r.json()).files;   // { rel: [size, sha1 前 12 碼] }
}
async function cdnGet(rel) {
  const enc = rel.split("/").map(encodeURIComponent).join("/");
  let r = await fetch(CDN + enc);
  if (r.ok) return Buffer.from(await r.arrayBuffer());
  r = await fetch(CDN + enc + ".parts.json");
  if (!r.ok) throw new Error("CDN 沒有 " + rel);
  const P = await r.json(), dir = path.posix.dirname(rel), bs = [];
  for (const p of P.parts) { const q = await fetch(CDN + dir.split("/").map(encodeURIComponent).join("/") + "/" + encodeURIComponent(p.f)); if (!q.ok) throw new Error("CDN 塊 " + p.f + " " + q.status); bs.push(Buffer.from(await q.arrayBuffer())); }
  const b = Buffer.concat(bs); if (b.length !== P.size || sha1(b) !== P.sha1) throw new Error("CDN 拼回來的 " + rel + " 大小或 sha1 不對");
  return b;
}

(async () => {
  if (!fs.existsSync(SITE)) die("找不到網頁成品 " + SITE);
  if (!fs.existsSync(BRIDGE_SRC)) die("找不到 " + BRIDGE_SRC);
  const t0 = Date.now();
  const { commit, ents } = fromGit();
  const tracked = new Set(ents.map(e => e.rel));
  const wt = fromWorktree(tracked);

  /* 已發布版本號（sw.js 的 VERSION） */
  const swE = ents.find(e => e.rel === "sw.js");
  const siteVersion = swE ? ((swE.buf.toString("utf8").match(/const VERSION="([^"]+)"/) || [])[1] || "?") : "?";
  let wtVersion = "?"; try { wtVersion = (fs.readFileSync(path.join(SITE, "sw.js"), "utf8").match(/const VERSION="([^"]+)"/) || [])[1] || "?"; } catch (e) {}

  /* 要寫的清單 */
  const plan = new Map();   // rel → {size, buf?|src?, mtime?}
  for (const e of ents) plan.set(e.rel, { size: e.buf.length, buf: e.rel === "index.html" ? injectBridge(e.buf) : e.buf });
  for (const f of wt) plan.set(f.rel, { size: f.size, src: f.src, mtime: f.mtime });
  const br = fs.readFileSync(BRIDGE_SRC); plan.set("native-bridge.js", { size: br.length, buf: br });
  const CORE = path.join(HERE, "node_modules", "@capacitor", "core", "dist", "capacitor.js");
  if (!fs.existsSync(CORE)) die("找不到 " + CORE + "（先在 xiangqi-ios 跑 npm install）");
  const core = fs.readFileSync(CORE); plan.set("capacitor.js", { size: core.length, buf: core });
  if (plan.has("capacitor.js") && tracked.has("capacitor.js")) die("網站本身也有 capacitor.js，檔名撞到了");
  for (const [rel, p] of plan) if (p.buf) p.size = p.buf.length;

  /* 檢查：控制字元、CR（橋接檔） */
  const bad = [];
  for (const [rel, p] of plan) if (p.buf) { const c = ctlCheck(rel, p.buf); if (c) bad.push(c); }
  if (br.includes(13)) bad.push("native-bridge.js：有 CR（\\r）");

  /* 大小摘要（--cdn-fetch 換檔後要重算，見下方寫 native-build.json 前） */
  const summarize = () => {
    const byDir = {}; let total = 0;
    for (const [rel, p] of plan) { const top = rel.includes("/") ? rel.split("/").slice(0, rel.startsWith("data/") ? 2 : 1).join("/") : "(根目錄)"; byDir[top] = (byDir[top] || 0) + p.size; total += p.size; }
    return { total, top: Object.entries(byDir).sort((a, b) => b[1] - a[1]) };
  };
  let { total, top } = summarize();

  console.log(`來源：${SITE}`);
  console.log(`已發布 commit：${REF} = ${commit.slice(0, 10)}（版本 ${siteVersion}）；工作區 sw.js 版本 ${wtVersion}${wtVersion !== siteVersion ? "（工作區不是已發布版，程式一律取已發布的）" : ""}`);
  console.log(`git 追蹤的檔 ${ents.length} 個；工作區補的大檔 ${wt.length} 個；共 ${plan.size} 個、${MB(total)}`);
  console.log("最大的幾個資料夾：" + top.slice(0, 12).map(([k, v]) => `${k} ${MB(v)}`).join("、"));
  if (bad.length) { console.error("✘ 不能用：\n  " + bad.join("\n  ")); process.exit(1); }

  /* CDN 比對（選用） */
  let cdnDiff = [];
  if (CDN_CHECK) {
    const M = await cdnManifest();
    for (const [rel, p] of plan) {
      if (!/^(data|engine)\//.test(rel)) continue;
      const m = M[rel]; if (!m) continue;   // CDN 沒有的（例如 preload.json、big-books.json 只在 GitHub）不比
      if (m[0] !== p.size) { cdnDiff.push(rel); continue; }
      const h = p.buf ? sha1(p.buf) : sha1(fs.readFileSync(p.src));
      if (h.slice(0, 12) !== m[1]) cdnDiff.push(rel);
    }
    const missing = Object.keys(M).filter(k => !plan.has(k) && !skip(k));
    console.log(`CDN 比對：${cdnDiff.length} 個檔跟 CDN 不同${cdnDiff.length ? "：" + cdnDiff.slice(0, 15).join("、") + (cdnDiff.length > 15 ? "…" : "") : ""}`);
    if (missing.length) console.log(`CDN 有、這裡沒有：${missing.length} 個（例如 ${missing.slice(0, 8).join("、")}）`);
    if (CDN_FETCH) {
      for (const rel of [...cdnDiff, ...missing]) { const b = await cdnGet(rel); plan.set(rel, { size: b.length, buf: b }); console.log("  ⬇ 從 CDN 換成 " + rel); }
      cdnDiff = [];
    }
  }

  if (DRY) { console.log("（--dry：沒有寫任何檔）"); return; }

  /* 寫進 www/：只抄有變的；多的刪掉 */
  fs.mkdirSync(WWW, { recursive: true });
  let wrote = 0, same = 0;
  const list = {};
  for (const [rel, p] of plan) {
    const dst = path.join(WWW, ...rel.split("/"));
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    if (p.buf) {
      let eq = false; try { eq = fs.statSync(dst).size === p.buf.length && fs.readFileSync(dst).equals(p.buf); } catch (e) {}
      if (!eq) { fs.writeFileSync(dst, p.buf); wrote++; } else same++;
      list[rel] = [p.buf.length, sha1(p.buf).slice(0, 12)];
    } else {
      let eq = false; try { const st = fs.statSync(dst); eq = st.size === p.size && Math.floor(st.mtimeMs) === Math.floor(p.mtime.getTime()); } catch (e) {}
      if (!eq) { fs.copyFileSync(p.src, dst); fs.utimesSync(dst, p.mtime, p.mtime); wrote++; } else same++;
      list[rel] = [p.size, null];   // 大檔不算 sha1（太慢）；check-www.js 只比大小
    }
  }
  let removed = 0;
  const clean = (dir, rel) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name), r = rel ? rel + "/" + e.name : e.name;
      if (e.isDirectory()) { clean(p, r); if (!fs.readdirSync(p).length) fs.rmdirSync(p); }
      else if (!plan.has(r) && r !== "native-build.json") { fs.unlinkSync(p); removed++; }
    }
  };
  clean(WWW, "");
  ({ total, top } = summarize());   // 含 --cdn-fetch 從 CDN 換進來的檔（2026-11-22 之前 bytes 少算了這些）
  const info = { app: "象棋千秋", ref: REF, commit, siteVersion, generatedAt: new Date().toISOString(), files: plan.size + 1, bytes: total, byDir: Object.fromEntries(top.map(([k, v]) => [k, v])), cdnChecked: CDN_CHECK, cdnDiff };
  fs.writeFileSync(path.join(WWW, "native-build.json"), JSON.stringify(info, null, 1) + "\n");
  fs.writeFileSync(LIST_OUT, JSON.stringify({ commit, siteVersion, files: list }) + "\n");
  console.log(`✔ www/ 完成：寫入 ${wrote} 個、沒變 ${same} 個、刪掉 ${removed} 個；共 ${plan.size + 1} 個檔、${MB(total)}（${((Date.now() - t0) / 1000).toFixed(1)} 秒）`);
  console.log("下一步（iMac 上）：npx cap sync ios");
})().catch(e => die(e.message));
