// 公開原始碼的暫存資料夾產生器（開發者 11/13：原始碼公開，程式 GPL-3.0、自製素材 CC BY-NC-SA 4.0）
// 用法：node xiangqi-lab/tools/oss-stage.js [--ref origin/main] [--out xiangqi-lab/opensource-stage]
//   1. 從公開倉庫（xiangqi-lab/site 的 git，只讀、不動工作區和索引）取出 --ref 那一版的 index.html，
//      照 m.html 的 //#include 順序把每支模組切出來 → source/xiangqi-db/m/*.js（公開的是「線上已發布的版本」，
//      本機還沒發布的修改不會跟著公開；線上沒有的新模組也不放，m.html 裡那一行 include 拿掉）
//   2. src/ 的自寫程式（net.js、park3d.js…）也取線上那一版；sw.js 把版本號還原成 __VERSION__
//   3. m.css、mhtml.js、建置與測試工具、裁判程式（core.js 的來源）照本機複製
//   4. 寫 source/STAGE-MANIFEST.json：每個檔的來源（線上／本機）、跟本機不同的模組
// 只寫 --out 資料夾，其他地方一律不動。產生後要跑 node xiangqi-lab/tools/oss-scan.js <out> 做機密掃描，
// 再把 source/ 複製到公開倉庫的一份副本裡跑 node source/check-build.js、node source/run-tests.js（新加的測試若測還沒發布的功能會失敗，加進 TEST_SKIP）。
"use strict";
const fs = require("fs"), path = require("path"), cp = require("child_process");
const ROOT = path.join(__dirname, "..", ".."), DB = path.join(ROOT, "xiangqi-db"), LAB = path.join(ROOT, "xiangqi-lab"), SITE = path.join(LAB, "site");
const argv = process.argv.slice(2), opt = k => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null };
const REF = opt("--ref") || "origin/main", OUT = path.resolve(opt("--out") || path.join(LAB, "opensource-stage")), SRC_OUT = path.join(OUT, "source");
const LF = s => s.split("\r\n").join("\n");
const git = (...a) => cp.execFileSync("git", ["-C", SITE, ...a], { maxBuffer: 256e6 });
const liveFile = f => { try { return git("show", REF + ":" + f) } catch (e) { return null } };

/* 自寫的 src 檔（三方函式庫 three.min.js、opencc、jsQR、qrcode、GLTFLoader 等和圖示，倉庫根目錄已經有原檔，不重複放） */
const SRC_OWN = ["bot3d.js", "engine.js", "local.js", "map3d.js", "net.js", "park3d.js", "sw.js", "zh.js", "manifest.json",
  "bossfx3d.js", "three-shim.mjs"];   /* 11/14 1209 同版發布補：太虛星尊 3D 特效（11/14 上線，test-bhfx.js 要讀）、GLTFLoader 用的 three 轉接層（自寫） */
/* 建置、驗證、測試需要的工具（照 build-site.js、verify-release.js、testkinds.js、test-*.js 的 require 與讀檔整理）。
   不放：mqtt-config.json（密碼）、.last-version.json（本機狀態）、lobby-bots.js／qa-players.js／ban.js（營運用連線程式）、
   cdn-deploy.js／announce-version.js／watch-feedback.js／feedback-api.gs（發布、通知、回饋表單營運）、MQTT 申請與搬家筆記 */
const TOOLS_EXCLUDE = new Set(["mqtt-config.json", ".last-version.json", ".gitignore", "lobby-bots.js", "lobby-bots-live.ps1", "qa-players.js", "ban.js",
  "cup-host.js",   /* 11/13 0825 重產時補：千秋盃裁判台（營運程式）不公開；0452、0540 兩版的 source/ 曾誤帶 */
  "cdn-deploy.js", "cdn-partial.js",   /* cdn-partial.js：11/14 開發者決定跟 cdn-deploy.js 一樣不公開（CDN 部分上傳的營運工具） */
  "announce-version.js", "watch-feedback.js", "feedback-api.gs", "MQTT搬家步驟.md", "MQTT申請步驟_手機版.md", "serve.js",
  "calibrate-grades.js", "stuck-report.js", "__pycache__",
  "test-home-focus.js"]);   /* 會開無頭 Chrome、要開發者電腦上的 playwright 路徑（testkinds.js 本來就不跑它） */
/* 在「公開倉庫＋source/」裡跑不過的測試先不放（11/13 用 source/run-tests.js 實測；在開發者電腦上全部通過）。
   下次發布後重產、重跑 run-tests.js，第三類通過的就可以從這裡拿掉。--skip-tests a.js,b.js 可以再多排除 */
const WHY_PRIVATE = "要讀不公開的開發資料（story/ 規劃稿、tools/review_loop、style_loop 評比資料）";
const WHY_ASSET = "要讀只在開發者電腦的素材原始資料（art/*.json、tools/canju、出圖腳本）或只放 CDN 的大檔";
const WHY_NEWER = "測的是比線上版新、還沒發布的程式或說明文件";
const TEST_SKIP = {
  "test-a11y-p16.js": WHY_PRIVATE, "test-ai-levels.js": WHY_PRIVATE, "test-stat-policy.js": WHY_PRIVATE, "test-style-loop.js": WHY_PRIVATE, "test-ui-chatgpt.js": WHY_PRIVATE, "test-zh-lint.js": WHY_PRIVATE,
  "test-beidou-lines.js": WHY_ASSET, "test-coach.js": WHY_ASSET, "test-galaxy.js": WHY_ASSET, "test-grade-wording.js": WHY_ASSET, "test-scene-poems.js": WHY_ASSET, "test-simul3d.js": WHY_ASSET,
  "test-zhanggui.js": WHY_ASSET, "test-story0.js": WHY_ASSET, "test-blackhole.js": WHY_ASSET,
  /* 11/14 1209 同版發布：對 1209 公開副本實測通過、拿掉排除的：test-premove-online3d、test-park3d-cbfx、test-blitz、test-colorblind、test-park3d-colorblind、
     test-touch-fixes、test-askbot-city、test-fdroid-evidence、test-health-funnel、test-health、test-a11y-emoji、test-xsm-dark、test-bhtd-rules、test-dgl */
  "test-daily.js": "有一項要讀不公開的 xiangqi-ios/capacitor.config.json（iOS 打包暫緩，沒有公開）；開發者電腦上 29/29", "test-net-linksig.js": WHY_NEWER, "test-net-link.js": WHY_NEWER,
  "test-focus-modes.js": "有一項〔原始碼〕檢查過時（02-shell route() 第一個呼叫已改成 dglRouteGate，開發者電腦上同樣 16/17），待開發者修測試",
  "test-fb-reply.js": "要讀不公開的回饋表單營運程式 feedback-api.gs（開發者電腦上 12/12）",
  "test-android-roadmap.js": "有一項要讀開發者電腦上 opensource-stage/ 的舊驗證紀錄（0452）；xiangqi-android 骨架 11/13 第 17 輪起已經公開在 source/xiangqi-android/",   /* 11/13 第 14 輪 F3 */
  "test-net-sign.js": "要用 fixtures/net-legacy-1111.js（舊版 net.js），那個檔頭寫「不要發布」，先一起不放",
  "test-net-pin.js": "要接千秋盃裁判台 cup-host.js（營運程式，不公開）",   /* 11/13 第 14 輪：公開副本裡 0/1 */
  "test-cup-sign.js": "要 require 千秋盃裁判台 cup-host.js（營運程式，不公開）",   /* 11/13 0825 重產：cup-host.js 移出 source/ 後一起拿掉 */
  /* test-android-build.js：11/13 第 17 輪起 xiangqi-android 建置鏈也匯出到 source/xiangqi-android/（含 Service Worker 修法截圖），對 1942 公開副本 19/19，拿掉排除 */
  "test-redblue.js": "要 require 千秋盃裁判台 cup-host.js（營運程式，不公開）；公開的攻擊重現改用 test-redblue-public.js（R01 用測試自己產生的裁判台金鑰，不需要 cup-host.js）",   /* 11/13 第 17 輪 F1 */
  "test-net-notes.js": "要 require 千秋盃裁判台 cup-host.js（營運程式，不公開）",
  /* 11/14 開發者決定（1209 同版發布）：紅藍隊重現工具先不公開；新 net.js（NS／scoreGate）隨 App 發布那一版再一起放回 */
  ...Object.fromEntries(["redblue-cases.js", "redblue-run.js", "test-redblue-public.js"].map(f => [f,
    "1209 線上 net.js 還沒有 NS／scoreGate 修法，公開等於公開對線上版的攻擊腳本；等新 net.js 隨 App 發布後同版公開"])),   /* 11/13 第 17 輪對 1942 實測：公開副本 0/1 */
  "test-varengine.js": "測的新引擎 src/varengine.js 還沒發布（不放）", "var-train.js": "新引擎的訓練工具（還沒發布，不放）", "var-budget.js": "新引擎的訓練工具（還沒發布，不放）",
  "test-ximarket.js": WHY_ASSET + "（西市圖 art/ximarket 原圖、data/ximarket 只放 CDN；1209 公開副本 8/11）",
  "test-home-wide.js": WHY_ASSET + "（首頁寬版圖只放 CDN）", "test-mainquest.js": WHY_ASSET + "（主線電影配樂只放 CDN）", "test-guanxing.js": WHY_ASSET + "（觀星臺圖只放 CDN）",
  "test-classic-sky.js": WHY_NEWER + "（park3d.js 水墨雲）；也要讀 xiangqi-db/park 的修圖備份",   /* 11/13 0825 重產：公開副本裡 2/9 */
  "test-threat-weaknet.js": "threat-model.md 對照表要找 test-net-sign.js（上面已排除，見該行）",   /* 11/13 0825 重產：公開副本裡 14/15 */
  "test-ui-redundancy.js": "有一項檢查開發者刻意不發布的 07y-hubmap.js 段落",
  "test-foss-audit.js": "倉庫多了 source/ 以後，foss-audit.js 會把 source/ 裡的規則文字當成追蹤 SDK（要先讓它跳過 source/）",
};
/* --skip-tests a.js,b.js=原因：等號後面是原因（寫進 STAGE-MANIFEST.json；原因裡用全形逗號） */
for (const s of String(opt("--skip-tests") || "").split(",").filter(Boolean)) { const [f, ...w] = s.split("="); TEST_SKIP[f] = w.length ? "指令排除：" + w.join("=") : "指令排除" }
const TEST_EXCLUDE = new Set(Object.keys(TEST_SKIP));

const report = { ref: REF, commit: git("rev-parse", REF).toString().trim(), madeAt: new Date().toISOString(), files: {}, liveDiffers: [], absentModules: [], excludedTests: TEST_SKIP };
/* 第 17 輪 F1 同版：記下這份 source/ 是哪一版切出來的（release.json 的版本、index.html 的 SHA-1 前 12 碼），release-sync-check.js 拿來核對 */
{ let R = null; try { R = JSON.parse(liveFile("release.json").toString("utf8")) } catch (e) { } const h = liveFile("index.html"); report.version = R && R.version || null; report.indexSha1 = h ? require("crypto").createHash("sha1").update(h).digest("hex").slice(0, 12) : null }
/* 本機路徑換成佔位字（工具註解裡的「在 <專案根目錄> 下執行」之類；不寫死使用者名稱） */
const HOME = require("os").homedir(), HOME_FWD = HOME.split("\\").join("/"), HOME_POSIX = HOME_FWD.replace(/^([A-Za-z]):/, (m, d) => "/" + d.toLowerCase());
const PATHS = [[HOME + "\\myClaude", "<專案根目錄>"], [HOME_FWD + "/myClaude", "<專案根目錄>"], [HOME_POSIX + "/myClaude", "<專案根目錄>"], [HOME.split("\\").join("\\\\") + "\\\\myClaude", "<專案根目錄>"],
  [HOME.split("\\").join("\\\\"), "<使用者資料夾>"], [HOME, "<使用者資料夾>"], [HOME_FWD, "<使用者資料夾>"], [HOME_POSIX, "<使用者資料夾>"]];
const scrub = (rel, buf) => { if (!/\.(js|mjs|json|md|txt|py|gs|sh)$/.test(rel) || buf.includes(0)) return buf; let s = buf.toString("utf8"), n = 0;
  for (const [a, b] of PATHS) if (s.includes(a)) { n += s.split(a).length - 1; s = s.split(a).join(b) }
  if (n) report.scrubbed.push(rel.split(path.sep).join("/") + "（" + n + " 處）");
  if (s.includes("\r\n")) { s = s.split("\r\n").join("\n"); n++; report.toLF.push(rel.split(path.sep).join("/")) }   /* 公開的檔一律 LF */
  return n ? Buffer.from(s) : buf };
report.toLF = [];
report.scrubbed = [];
const put = (rel, buf, from) => { if (!/^live/.test(from)) buf = scrub(rel, buf); const p = path.join(SRC_OUT, rel); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); report.files[rel.split(path.sep).join("/")] = from };

/* 只重產 source/（README.md、run-tests.js、check-build.js 這三個手寫檔先留著再放回去）；根目錄的 LICENSE、NOTICE.md 等手寫檔不動 */
const KEEP = ["README.md", "run-tests.js", "check-build.js"], kept = {};
for (const f of KEEP) { const p = path.join(SRC_OUT, f); if (fs.existsSync(p)) kept[f] = fs.readFileSync(p) }
/* --out 指到新資料夾時，手寫的三個檔從預設的 opensource-stage/source/ 拿（第 17 輪 F1） */
for (const f of KEEP) { const p = path.join(LAB, "opensource-stage", "source", f); if (!kept[f] && fs.existsSync(p)) kept[f] = fs.readFileSync(p) }
if (fs.existsSync(SRC_OUT)) fs.rmSync(SRC_OUT, { recursive: true, force: true });
fs.mkdirSync(SRC_OUT, { recursive: true });
for (const f in kept) fs.writeFileSync(path.join(SRC_OUT, f), kept[f]);

// ---------- 1. 模組：從線上 index.html 切出來 ----------
const { parts } = require(path.join(DB, "tools", "mhtml.js"));
const H = LF(liveFile("index.html").toString("utf8"));
const P0 = parts(), local = f => LF(fs.readFileSync(path.join(DB, f), "utf8")).replace(/\n$/, "");
const absent = P0.filter(f => !H.includes(local(f).split("\n")[0]));
report.absentModules = absent;
const P = P0.filter(f => !absent.includes(f)), src = P.map(local);
const pos = src.map(s => { const i = H.indexOf(s); return i >= 0 && H.indexOf(s, i + 1) < 0 ? i : -1 });
const mods = [];
for (let i = 0; i < P.length; i++) {
  if (pos[i] >= 0) { mods.push(src[i]); continue }
  if (i === 0 || pos[i - 1] < 0) throw new Error("切不出 " + P[i] + "（前一支的位置不明）");
  const start = pos[i - 1] + src[i - 1].length + 1;
  let next;
  if (i === P.length - 1) next = H.indexOf("\n</script></body></html>", start) + 1;
  else if (pos[i + 1] >= 0) next = pos[i + 1];
  else { const first = "\n" + src[i + 1].split("\n")[0], k = H.indexOf(first, start); if (k < 0) throw new Error("找不到 " + P[i + 1] + " 的開頭"); next = k + 1 }
  const text = H.slice(start, next - 1);
  mods.push(text); src[i] = text; pos[i] = start;
  report.liveDiffers.push(P[i]);
}
if (H.indexOf(mods.join("\n")) < 0) throw new Error("切出來的模組接回去，跟線上 index.html 對不起來");
P.forEach((f, i) => put(path.join("xiangqi-db", f), mods[i] + "\n", report.liveDiffers.includes(f) ? "live" : "local=live"));
// m.html：本機版（含新的授權聲明），拿掉線上沒有的模組
let mh = LF(fs.readFileSync(path.join(DB, "m.html"), "utf8"));
for (const f of absent) mh = mh.split("//#include " + f + "\n").join("");
put("xiangqi-db/m.html", mh, absent.length ? "local（拿掉線上沒有的 include）" : "local");
const css = fs.readFileSync(path.join(DB, "m.css"), "utf8");
if (!H.includes(LF(css).replace(/^\/\*[\s\S]*?\*\/\n/, ""))) console.log("⚠ m.css 跟線上版不同（照本機複製，請確認）");
put("xiangqi-db/m.css", css, "local");
if (fs.existsSync(path.join(DB, "m", "README.md"))) put("xiangqi-db/m/README.md", fs.readFileSync(path.join(DB, "m", "README.md")), "local（各模組說明）");
put("xiangqi-db/tools/mhtml.js", fs.readFileSync(path.join(DB, "tools", "mhtml.js")), "local");
put("xiangqi-db/fonts/charset.txt", fs.readFileSync(path.join(DB, "fonts", "charset.txt")), "local");

// ---------- 2. src：線上版 ----------
for (const f of SRC_OWN) {
  let b = liveFile(f), from = "live";
  if (!b) { b = fs.readFileSync(path.join(LAB, "src", f)); from = "local（線上沒有）" }
  if (f === "sw.js") b = Buffer.from(b.toString("utf8").replace(/const VERSION="\d{8}-\d{4}";/, 'const VERSION="__VERSION__";'));
  const loc = fs.readFileSync(path.join(LAB, "src", f));
  if (!loc.equals(b)) report.liveDiffers.push("src/" + f);
  put(path.join("xiangqi-lab", "src", f), b, from);
}

// ---------- 3. 工具 ----------
const T = path.join(LAB, "tools");
for (const f of fs.readdirSync(T)) {
  if (TOOLS_EXCLUDE.has(f) || TEST_EXCLUDE.has(f)) continue;
  const p = path.join(T, f), st = fs.statSync(p);
  /* fixtures/net-*.js：各版 net.js 的複本，只給排除了的網路測試用（net-legacy-1111.js 檔頭寫「不要發布」） */
  if (st.isDirectory()) { for (const g of fs.readdirSync(p)) { if (f === "fixtures" && /^net-.*\.js$/.test(g)) continue; put(path.join("xiangqi-lab", "tools", f, g), fs.readFileSync(path.join(p, g)), "local") } continue }
  put(path.join("xiangqi-lab", "tools", f), fs.readFileSync(p), "local");
}
put("xiangqi-referee.js", fs.readFileSync(path.join(ROOT, "xiangqi-referee.js")), "local（core.js 的來源）");

// ---------- 4. Android 公開建置鏈（第 17 輪 X6／評比第 16 輪改善清單第 8 項）：xiangqi-android 會進版本控制的檔，逐位元照抄（PNG、gradle-wrapper.jar 是二進位） ----------
{ const AND = path.join(ROOT, "xiangqi-android"), EXP = path.join(AND, "scripts", "export-public.js");
  if (fs.existsSync(EXP) && !argv.includes("--no-android")) {
    const M = require(EXP).exportTo(path.join(SRC_OUT, "xiangqi-android"));
    for (const f of Object.keys(M.hashes)) report.files["xiangqi-android/" + f] = "local（Android 建置鏈，逐位元照抄）";
    report.files["xiangqi-android/EXPORT-MANIFEST.json"] = "產生（每個檔的 SHA-256、樹雜湊、排除了什麼）";
    report.android = { files: M.files, treeSha256: M.treeSha256, excluded: M.excluded };
    console.log(`Android 建置鏈：${M.files} 個檔，樹雜湊 ${M.treeSha256.slice(0, 12)}…`);
  } }
fs.writeFileSync(path.join(SRC_OUT, "STAGE-MANIFEST.json"), JSON.stringify(report, null, 1) + "\n");
console.log(`暫存資料夾：${OUT}\n對應公開倉庫 ${REF}（${report.commit.slice(0, 7)}）\n檔案 ${Object.keys(report.files).length} 個`);
console.log("取線上版（本機有還沒發布的修改）：" + (report.liveDiffers.join("、") || "無"));
console.log("線上沒有、不公開的模組：" + (absent.join("、") || "無"));
