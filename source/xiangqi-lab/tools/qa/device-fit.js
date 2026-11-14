// 裝置支援檢查（11/13 hspx 1097「iPad 所有尺寸和最新的 iPhone Duo 也要支援」）
//
// 做什麼：用「一個」無頭 Chrome（Playwright，channel:chrome），依清單 DEVICES 每個尺寸（直／橫、iPad 分割畫面與小視窗）開一個全新分頁，
//   逐頁（PAGES）拍一張畫面，同時量：
//   ① 防爆版：沿用 evidence-shots.js 的 COLLECT（頁面裡量）＋ judgeOverflow（判斷），整頁左右捲、文字截斷、超出畫面、重疊
//   ② 版面利用：棋盤（.boardbox svg）佔畫面寬高多少、有沒有被切到；主要內容欄寬佔畫面多少（大螢幕留白太多）；
//      可點元素小於 44×44 的數量（Apple 人機介面建議的最小點擊範圍）
//   產出 <outdir>/shots/<裝置>-<頁面>.png、<outdir>/device-fit.json、<outdir>/device-fit.md（裝置 × 頁面表＋逐項問題）
//
// 尺寸來源（CSS 像素＝點）：iPhone 17／Air／17 Pro Max、iPad mini（A17 Pro）、iPad（A16）／Air 11、Pro 11（M4/M5）、Air 13、Pro 13（M4/M5）；
//   iPhone Duo 摺疊機的 466×678（闔起）、890×626（攤開）是第三方估計值（Apple 還沒公布網頁視窗尺寸），拿到實機要再對。
//   iPad 一律用 iPadOS Safari 的 UA（自稱 Mac＋觸控點 5），App 的 MY_KIND 會判成 iPad。
//
// 安全：每個分頁開頁前 localStorage 設 xq_netRoot="xq_test"（只連測試房）；全新、用完即丟的瀏覽器設定；只開 1 個瀏覽器，結束（含出錯）一定關閉。
//
// 用法（在 <專案根目錄> 下）：
//   node xiangqi-lab/tools/qa/device-fit.js --url http://localhost:8810/xiangqi-lab/     （本機候選版；預設線上版）
//   node xiangqi-lab/tools/qa/device-fit.js --local                                         （本機 m.html 組好的版本，自己開本機伺服器，埠 --port 預設 8842）
//   node xiangqi-lab/tools/qa/device-fit.js --dev ipad13p,duoU --page home,cpu            （只跑某幾個裝置／頁面）
//   node xiangqi-lab/tools/qa/device-fit.js --outdir <資料夾>                              （預設 xiangqi-db/tools/review_loop/rounds/r15/devices）
"use strict";
const IPHONE_UA = "Mozilla/5.0 (iPhone; CPU iPhone OS 26_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Mobile/15E148 Safari/604.1";
const IPAD_UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.1 Safari/605.1.15";
const PH = { top: 62, bottom: 34, left: 0, right: 0 }, PHL = { top: 0, bottom: 21, left: 62, right: 62 }, PAD = { top: 24, bottom: 20, left: 0, right: 0 };
// kind：phone／fold／pad；est＝估計值
const DEVICES = [
  { id: "se", name: "iPhone SE", kind: "phone", w: 375, h: 667, inset: { top: 20, bottom: 0, left: 0, right: 0 } },
  { id: "i17", name: "iPhone 17／17 Pro", kind: "phone", w: 402, h: 874, inset: PH },
  { id: "air", name: "iPhone Air", kind: "phone", w: 420, h: 912, inset: { top: 68, bottom: 34, left: 0, right: 0 } },
  { id: "pm", name: "iPhone 17 Pro Max", kind: "phone", w: 440, h: 956, inset: PH },
  { id: "pmL", name: "iPhone 17 Pro Max 橫向", kind: "phone", w: 956, h: 440, inset: PHL },
  { id: "duoF", name: "iPhone Duo 闔起（估計）", kind: "fold", w: 466, h: 678, inset: PH, est: true },
  { id: "duoU", name: "iPhone Duo 攤開直拿（估計）", kind: "fold", w: 626, h: 890, inset: PH, est: true },
  { id: "duoUL", name: "iPhone Duo 攤開橫拿（估計）", kind: "fold", w: 890, h: 626, inset: PHL, est: true },
  { id: "mini", name: "iPad mini", kind: "pad", w: 744, h: 1133, inset: PAD },
  { id: "miniL", name: "iPad mini 橫向", kind: "pad", w: 1133, h: 744, inset: PAD },
  { id: "ipad", name: "iPad／iPad Air 11 吋", kind: "pad", w: 820, h: 1180, inset: PAD },
  { id: "ipadL", name: "iPad／iPad Air 11 吋 橫向", kind: "pad", w: 1180, h: 820, inset: PAD },
  { id: "pro11", name: "iPad Pro 11 吋", kind: "pad", w: 834, h: 1210, inset: PAD },
  { id: "pro11L", name: "iPad Pro 11 吋 橫向", kind: "pad", w: 1210, h: 834, inset: PAD },
  { id: "air13", name: "iPad Air 13 吋", kind: "pad", w: 1024, h: 1366, inset: PAD },
  { id: "air13L", name: "iPad Air 13 吋 橫向", kind: "pad", w: 1366, h: 1024, inset: PAD },
  { id: "pro13", name: "iPad Pro 13 吋", kind: "pad", w: 1032, h: 1376, inset: PAD },
  { id: "pro13L", name: "iPad Pro 13 吋 橫向", kind: "pad", w: 1376, h: 1032, inset: PAD },
  { id: "split", name: "iPad 13 吋 橫向分割一半", kind: "pad", w: 678, h: 1024, inset: PAD },
  // 11/13 開發者「這兩種電腦解析度有支援嗎」：意見回饋管理頁看到的兩位真人玩家（Windows 瀏覽器實際可用範圍）；kind:"pc"＝桌機身分（沒觸控、不是手機 UA）
  { id: "pc1600", name: "Windows 電腦 1600×1073", kind: "pc", w: 1600, h: 1073, inset: { top: 0, bottom: 0, left: 0, right: 0 } },
  { id: "pc1920", name: "Windows 電腦 1920×911", kind: "pc", w: 1920, h: 911, inset: { top: 0, bottom: 0, left: 0, right: 0 } },
  { id: "win", name: "iPad 小視窗（iPadOS 視窗模式）", kind: "pad", w: 500, h: 700, inset: { top: 0, bottom: 0, left: 0, right: 0 } },
  { id: "slim", name: "iPad 最窄側欄", kind: "pad", w: 320, h: 1000, inset: { top: 0, bottom: 0, left: 0, right: 0 } },
];
const PAGES = [
  { id: "home", name: "首頁", hash: "#/" },
  { id: "cpu", name: "對局（挑戰電腦）", hash: "#/cpu", board: true },
  { id: "settings", name: "設定", hash: "#/settings" },
  { id: "db", name: "大師對局庫", hash: "#/db" },
  { id: "lobby", name: "線上大廳", hash: "#/lobby" },
  { id: "journey", name: "棋路（冒險地圖）", hash: "#/journey" },
  { id: "canju", name: "一盞茶殘局", hash: "#/canju" },
  { id: "daily", name: "每日同題", hash: "#/daily" },
];
/* 第 17 輪（11/13）：新內容的頁面，只在 --extra 時加量（舊版沒有這些頁，新舊對照只用上面 8 頁）。觀星臺要先打贏過黑洞才開：加 --store '{"bhWin":1}' */
const EXTRA_PAGES = [
  { id: "guanxing", name: "觀星臺", hash: "#/guanxing" },
  { id: "ximarket", name: "西市", hash: "#/ximarket" },
];
/* 21 種行動裝置尺寸（第 15、16 輪的對照組；不含後來加的兩種 Windows 電腦） */
const DEV21 = DEVICES.filter(d => d.kind !== "pc").map(d => d.id);
// 一頁的版面判斷：m＝頁面裡量到的 {vw, vh, board:{x,y,w,h}|null, col:{w}|null, small:n, smallSample:[]}；回傳問題陣列（文字）
function judgeLayout(m, dev, page) {
  const out = [], vw = m.vw, vh = m.vh, big = Math.min(vw, vh) >= 600;
  if (page.board) {
    const b = m.board;
    if (!b) out.push("找不到棋盤");
    else {
      if (b.x < -1 || b.x + b.w > vw + 1 || b.y + b.h > vh + 1) out.push(`棋盤被切到（${Math.round(b.x)}～${Math.round(b.x + b.w)} × ${Math.round(b.y)}～${Math.round(b.y + b.h)}，畫面 ${vw}×${vh}）`);
      const fill = Math.max(b.w / vw, b.h / vh);
      if (big && fill < 0.55) out.push(`大螢幕棋盤太小：棋盤 ${Math.round(b.w)}×${Math.round(b.h)}，只佔畫面 ${Math.round(fill * 100)}%`);
    }
  }
  if (m.col && vw >= 900 && m.col.w / vw < 0.5) out.push(`內容欄只有 ${Math.round(m.col.w)}px，佔畫面寬 ${Math.round(m.col.w / vw * 100)}%（兩側大片空白）`);
  if (m.scene) {
    const s = m.scene, gap = s.vw - s.w;
    if (gap > 24 && !s.bg && !/r07-side/.test(s.mode)) out.push(`滿版場景兩側空白：圖寬 ${Math.round(s.w)}／畫面 ${Math.round(s.vw)}（${s.mode || "—"}）`);
    if (s.cut && s.cut.length) out.push(`入口標籤被裁到看不到：${s.cut.slice(0, 4).join("、")}`);
  }
  if (m.small > 0) out.push(`可點元素小於 44×44 點：${m.small} 個（例：${m.smallSample.slice(0, 4).join("、")}）`);
  return out;
}
// 量測誤報排除（11/13 第 16 輪）：「文字超出元素框／文字被截斷」是拿 Range 量元素裡「所有」文字的範圍，看不見的字也算進去。
//   左上時辰鐘（07w8 .clk-dial）的 SVG 裡有一個 <text class="clk-big" x="0" y="0" opacity="0">（例「辰時」），基線在圓盤左上角、
//   字身往上伸出圓盤 16px，可是它 opacity 0、又被圓形 clip-path 裁掉，畫面上看不到；看得到的十二地支都在 56×56 的圓盤裡。
//   規則：在頁面裡重量一次（TEXTVIS），只有「看得到的字（祖先沒有 opacity 0、visibility hidden）都在框內，超框的全是看不見的字」才排除，寫進 fp（附理由），不算問題
//   chk[k]＝第 k 個問題的重量結果 {visOut, hidOut, hidTxt} 或 null（找不到元素就照舊算問題）
function splitFalsePos(fit, chk) {
  const keep = [], fp = [];
  fit.forEach((f, k) => { const c = chk && chk[k]; if ((f.type === "box" || f.type === "cut") && c && !c.visOut && c.hidOut) fp.push({ type: f.type, text: f.text, detail: f.detail, why: `超出框的只有看不見的字（${(c.hidTxt || []).join("、") || "—"}：opacity 0 或 visibility hidden），看得到的字都在框內` }); else keep.push(f) });
  return { keep, fp };
}
/* 第 17 輪：同一次量測同時算「舊規則（第 15 輪）」和「新規則（第 16 輪三條）」，新舊版本才能用同一套判定器比。
   x＝R.res[裝置][頁面]（device-fit.json 的一格）；回傳 {now:[問題], old:[問題], ex:{r1,r2,r3}}，問題＝{key, kind:"fit"|"lay", type, text, detail}
   r1＝時辰鐘等「只有看不見的字超框」（splitFalsePos 的 fp）；r2＝外觀小於 44、但 9 點都點得到（hitBig）；r3＝只給讀屏的隱藏清單（.sci-sr 這類）
   舊資料（第 17 輪以前的 json）沒有 smallOld，就當舊規則＝新規則（記 legacy:true） */
const normKey = s => String(s || "").replace(/\(\d+×\d+\)/g, "").replace(/\d+(\.\d+)?/g, "#").replace(/\s+/g, " ").trim().slice(0, 80);
function rulesBoth(x, dev, page) {
  if (!x) return null;
  const fitNow = (x.fit || []).map(f => ({ key: "fit:" + f.type + ":" + normKey(f.text), kind: "fit", type: f.type, text: f.text, detail: f.detail }));
  const fpL = (x.fp || []).map(f => ({ key: "fit:" + f.type + ":" + normKey(f.text), kind: "fit", type: f.type, text: f.text, detail: f.detail, rule: "r1" }));
  const m = x.m || {}, legacy = !Array.isArray(m.smallOld);
  const layLine = t => ({ key: "lay:" + (/^可點元素小於/.test(t) ? "small" : normKey(t)), kind: "lay", type: /^可點元素小於/.test(t) ? "small" : "layout", text: t, detail: "" });
  const layNow = (x.lay || []).map(layLine);
  let layOld = layNow, r2 = [], r3 = [];
  if (!legacy) {
    const so = m.smallOld || [], all = so.map(s => s.t);
    r2 = so.filter(s => s.why === "hit").map(s => s.t); r3 = so.filter(s => s.why === "sr").map(s => s.t);
    layOld = judgeLayout(Object.assign({}, m, { small: all.length, smallSample: all }), dev, page).map(layLine);
  }
  return { legacy, now: fitNow.concat(layNow), old: fitNow.concat(fpL).concat(layOld), small: (m.smallSample || []).slice(), ex: { r1: fpL, r2, r3 } };
}
module.exports = { DEVICES, PAGES, EXTRA_PAGES, DEV21, judgeLayout, splitFalsePos, rulesBoth, normKey, IPHONE_UA, IPAD_UA };
if (require.main !== module) return;

// ================= 以下才開瀏覽器 =================
const fs = require("fs"), path = require("path");
const HOME = path.join(__dirname, "..", "..", "..");
const { chromium } = require(path.join(HOME, "claude-desktop-tools", "node_modules", "playwright"));
const EV = require("./evidence-shots.js");
// COLLECT 只寫在 evidence-shots.js 的瀏覽器段，沒匯出：直接從原始碼取出同一個函式（判斷規則只有一份）
const COLLECT_SRC = (() => { const s = fs.readFileSync(path.join(__dirname, "evidence-shots.js"), "utf8").replace(/\r\n/g, "\n"), a = s.indexOf("function COLLECT() {"), b = s.indexOf("\n}\n", a); if (a < 0 || b < 0) throw new Error("evidence-shots.js 裡找不到 COLLECT"); return s.slice(a, b + 2) })();
const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
// --local：拍本機組好的版本（xiangqi-db/m.html＋m/*.js），跟 evidence-shots.js --local 同一套 localHtml()／serve()（直接從它的原始碼取出，規則只有一份），埠 --port 預設 8842
const LOCAL = argv.includes("--local"), PORT = +arg("--port", 8842), http = require("http");
const LOCAL_FN = (() => { if (!LOCAL) return null; const s = fs.readFileSync(path.join(__dirname, "evidence-shots.js"), "utf8").replace(/\r\n/g, "\n"), a = s.indexOf("// ---------- 本機模式"), b = s.indexOf("// ---------- 頁面裡量測"); if (a < 0 || b < 0) throw new Error("evidence-shots.js 裡找不到本機模式那段"); return eval(s.slice(a, b) + "\n;({ localHtml, serve })") })();
/* 第 17 輪 --git <ref>：量公開倉庫某一版「已發布檔」（xiangqi-lab/site 的 git，例 origin/main＝正式站最新、854ff3c＝0931），本機伺服器原封不動送出，
   git 裡沒有的大檔（data/ 圖片、音樂）用本機 site/ 工作區的；不連正式站。跟 p0-regress.js --git 同一個做法 */
const GIT_REF = arg("--git", ""), GITM = !!GIT_REF, cp = require("child_process");
function gitServe(ref) {
  const SITE = path.join(HOME, "xiangqi-lab", "site"), git = a => cp.execFileSync("git", ["-C", SITE, ...a], { maxBuffer: 400e6, windowsHide: true });
  const commit = git(["rev-parse", ref]).toString().trim(), tree = new Map();
  for (const line of git(["-c", "core.quotePath=false", "ls-tree", "-r", ref]).toString("utf8").split(/\r?\n/)) { const x = /^\d+ blob ([0-9a-f]{40})\t(.+)$/.exec(line); if (x) tree.set(x[2], x[1]) }
  const cache = new Map(), blob = p => { if (!tree.has(p)) return null; if (!cache.has(p)) cache.set(p, git(["cat-file", "blob", tree.get(p)])); return cache.get(p) };
  const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".wasm": "application/wasm", ".mp3": "audio/mpeg", ".woff2": "font/woff2" };
  const COI = { "Cross-Origin-Embedder-Policy": "require-corp", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Resource-Policy": "same-origin", "Cache-Control": "no-store" };
  return new Promise((res, rej) => {
    const srv = http.createServer((q, r) => {
      let u = ""; try { u = decodeURIComponent(q.url.split("?")[0]) } catch (e) { r.writeHead(400); return r.end() }
      if (!u.startsWith("/xiangqi-lab/")) { r.writeHead(404); return r.end() }
      u = u.slice(13) || "index.html"; if (u.includes("..") || u === "sw.js") { r.writeHead(404); return r.end() }
      let b = blob(u); if (!b) { const f = path.join(SITE, u); try { b = fs.readFileSync(f) } catch (e) { b = null } }
      if (!b) { r.writeHead(404); return r.end() }
      r.writeHead(200, Object.assign({ "Content-Type": MIME[path.extname(u)] || "application/octet-stream" }, COI)); r.end(b);
    });
    srv.on("error", rej); srv.listen(PORT, "127.0.0.1", () => res({ srv, commit }));
  });
}
const URL0 = LOCAL || GITM ? `http://127.0.0.1:${PORT}/xiangqi-lab/` : arg("--url", EV.LIVE_URL);
const OUTDIR = path.resolve(arg("--outdir", path.join(HOME, "xiangqi-db", "tools", "review_loop", "rounds", "r15", "devices"))), SHOTDIR = path.join(OUTDIR, "shots");
/* --dev 21＝第 15、16 輪那 21 種行動裝置尺寸；--extra＝再加新內容的頁面（EXTRA_PAGES） */
const DEVSEL = arg("--dev") === "21" ? DEV21 : arg("--dev") ? arg("--dev").split(",") : null;
const USE_DEV = DEVICES.filter(d => !DEVSEL || DEVSEL.includes(d.id)), USE_PAGE = PAGES.concat(argv.includes("--extra") ? EXTRA_PAGES : []).filter(p => !arg("--page") || arg("--page").split(",").includes(p.id));
// --store '{"sw7Wx":false,"shipAt":"song"}'：開頁前多寫幾個 App 設定（store 的鍵，自動加 m_ 前綴；值照 JSON）。11/13 首頁寬版圖要在「宋代原圖、關掉場景節氣天氣」才看得到，驗證時用
const STORE0 = (() => { const s = arg("--store", ""); if (!s) return {}; try { return JSON.parse(s) } catch (e) { throw new Error("--store 要是 JSON 物件：" + e.message) } })();
fs.mkdirSync(SHOTDIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString("zh-TW", { hour12: false }), ...a);

function MEASURE() {
  const vw = innerWidth, vh = innerHeight, box = q => ({ x: q.left, y: q.top, w: q.width, h: q.height });
  const vis = e => { const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false; const s = getComputedStyle(e); return s.visibility !== "hidden" && s.display !== "none" && +s.opacity > 0.05 };
  const sv = [...document.querySelectorAll(".boardbox svg")].filter(vis).sort((a, b) => b.getBoundingClientRect().width - a.getBoundingClientRect().width)[0];
  const top = document.querySelector(".modal") || document.querySelector("#sheet.sheet") ? null : [...document.querySelectorAll("#view > *")].filter(vis)[0];
  // 主要內容欄：#view 底下最寬、而且有文字的區塊（滿版地圖算滿版）
  let col = null; if (top) { const r = top.getBoundingClientRect(); let inner = [...top.querySelectorAll(".home,.lib,.st-wrap,.set,.box,section,main")].filter(vis).map(e => e.getBoundingClientRect().width); col = { w: Math.max(r.width > vw * 0.98 && inner.length ? Math.max(...inner) : r.width, 0) } }
  // 11/13 第 16 輪：外觀小、但用透明的 ::before／::after 把點選範圍擴大的元素（例：大廳亮燈、殘影），照「手指實際點得到」算：
  //   以元素中心為準，上下左右各 ±21px 共 9 個點（44×44 的方格）用 elementFromPoint 點點看，每一點都點到它自己（或它裡面的東西）才算夠大；
  //   畫面外的點不算（貼邊的按鈕手指本來就點不到外面）；被別的入口、標籤蓋住的點＝點不到它＝還是太小。只看框的話，擴大的點選範圍量不到
  const hitOK = (e, r) => { const cx = r.left + r.width / 2, cy = r.top + r.height / 2; for (const dx of [-21, 0, 21]) for (const dy of [-21, 0, 21]) { const x = cx + dx, y = cy + dy; if (x < 0 || y < 0 || x >= vw || y >= vh) continue; const h = document.elementFromPoint(x, y); if (!h || !(h === e || e.contains(h))) return false } return true };
  // 只給讀屏軟體的隱藏清單（祖先寬或高 ≤2px、或 clip／clip-path 裁掉；跟 evidence-shots COLLECT 的 hide 同一個規則）：畫面上看不到、手指點不到，不算「太小的可點元素」。
  //   例：07w6 場景器物的 .sci-sr（「棋盒、腳踏、硯台…」各 30×23，給旁白念「畫裡可以點的東西」）；手指點的是圖上器物本身的多邊形範圍
  const srOnly = e => { for (let a = e; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a), b = a.getBoundingClientRect(); if (b.width <= 2 || b.height <= 2 || (s.clip && s.clip !== "auto") || /inset\(50%|inset\(100%/.test(s.clipPath || "")) return true } return false };
  const small = [], seen = new Set(), hitBig = [];
  for (const e of document.querySelectorAll("button,[role=button],a[href],[role=tab],input[type=checkbox],select")) {
    if (!vis(e) || e.closest("svg,#axLive,.ax-sr") || srOnly(e)) continue; const r = e.getBoundingClientRect();
    if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh) continue;
    if (r.width < 44 && r.height < 44 && hitOK(e, r)) { hitBig.push(((e.innerText || e.getAttribute("aria-label") || e.title || e.tagName) + "").replace(/\s+/g, " ").trim().slice(0, 12) + `(${Math.round(r.width)}×${Math.round(r.height)})`); continue }
    if (r.width < 44 && r.height < 44) { const t = ((e.innerText || e.getAttribute("aria-label") || e.title || e.tagName) + "").replace(/\s+/g, " ").trim().slice(0, 12); if (!seen.has(t)) { seen.add(t); small.push(t + `(${Math.round(r.width)}×${Math.round(r.height)})`) } }
  }
  /* 第 17 輪：同一頁也照「舊規則」（第 15 輪：只看框、讀屏隱藏清單也算）再數一次，每個標上被哪條新規則排除：why＝"hit"（9 點都點得到）、"sr"（讀屏隱藏清單）、""（新規則也算太小） */
  const smallOld = [], seenOld = new Set();
  for (const e of document.querySelectorAll("button,[role=button],a[href],[role=tab],input[type=checkbox],select")) {
    if (!vis(e) || e.closest("svg,#axLive,.ax-sr")) continue; const r = e.getBoundingClientRect();
    if (r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh || !(r.width < 44 && r.height < 44)) continue;
    const t = ((e.innerText || e.getAttribute("aria-label") || e.title || e.tagName) + "").replace(/\s+/g, " ").trim().slice(0, 12); if (seenOld.has(t)) continue; seenOld.add(t);
    smallOld.push({ t: t + `(${Math.round(r.width)}×${Math.round(r.height)})`, why: srOnly(e) ? "sr" : hitOK(e, r) ? "hit" : "", x: Math.round(r.left), y: Math.round(r.top) });
  }
  /* 第 17 輪：場景頁的入口標籤、首頁「下一步」的座標（Duo 闔起首頁重疊要逐個看位置） */
  const spots = [...document.querySelectorAll("#view .shp-spot, #mnqNext, #view .hm-go")].filter(vis).map(e => { const r = e.getBoundingClientRect(); return { id: e.id || "", t: (e.innerText || e.getAttribute("aria-label") || "").replace(/\s+/g, " ").trim().slice(0, 12), x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) } });
  // 滿版場景（11/13 07fl）：圖的框、#view 看得到的範圍、有沒有模糊底；入口標籤有沒有被裁到看不到的地方
  let scene = null; const SP = document.querySelector("#view .shp-page.cq"), V = document.getElementById("view");
  if (SP && V && vis(SP)) { const pr = SP.getBoundingClientRect(), vr = V.getBoundingClientRect(), vb = Math.min(vr.top + V.clientHeight, vh), bg = document.getElementById("xflBg");
    const cut = V.scrollHeight > V.clientHeight + 2 ? [] : [...SP.querySelectorAll(".shp-spot")]   /* #view 可以捲（手機直向圖比畫面高、橫放側欄）＝捲得到，不算裁掉 */.filter(vis).filter(e => { const r = e.getBoundingClientRect(); return r.top < Math.max(pr.top, vr.top) - 1 || r.bottom > Math.min(pr.bottom, vb) + 1 || r.left < Math.max(pr.left, vr.left) - 1 || r.right > Math.min(pr.right, vr.right) + 1 }).map(e => (e.innerText || "").replace(/\s+/g, " ").trim().slice(0, 10));
    scene = { x: pr.left - vr.left, w: pr.width, vw: vr.width, bg: !!(bg && !bg.hidden && bg.getBoundingClientRect().width > 0), mode: ["xfl-port", "r07-fit", "r07-side", "tt-fillx"].filter(c => V.classList.contains(c)).join(" "), cut } }
  return { vw, vh, board: sv ? box(sv.getBoundingClientRect()) : null, col, small: small.length, smallSample: small, hitBig, smallOld, spots, kind: typeof MY_KIND !== "undefined" ? MY_KIND : "", scene };
}
// 頁面裡重量「文字超框」：list＝[{x,y,w,h}]（COLLECT 量到的元素框）；用同一組選擇器找回框一樣的元素，逐個文字節點分「看得到／看不見」量（容許誤差跟 judgeOverflow 一樣：左右 1px、上下 4px）
function TEXTVIS(list) {
  const SEL = "button,[role=button],[role=tab],a[href],label,h1,h2,h3,h4,summary,th,.sec-t,.sh-t,.chip,.tab,.pill,.badge", all = [...document.querySelectorAll(SEL)];
  const near = (q, r) => Math.abs(q.left - r.x) < .6 && Math.abs(q.top - r.y) < .6 && Math.abs(q.width - r.w) < .6 && Math.abs(q.height - r.h) < .6;
  const out = (c, r) => c.left < r.x - 1 || c.right > r.x + r.w + 1 || c.top < r.y - 4 || c.bottom > r.y + r.h + 4;
  return list.map(r => {
    const e = all.find(x => near(x.getBoundingClientRect(), r)); if (!e) return null;
    let visOut = false, hidOut = false; const hidTxt = [];
    const w = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let t = w.nextNode(); t; t = w.nextNode()) {
      if (!t.nodeValue.trim()) continue; const p = t.parentElement, seen = !p || !p.checkVisibility || p.checkVisibility({ opacityProperty: true, visibilityProperty: true });
      const rg = document.createRange(); rg.selectNodeContents(t);
      for (const c of rg.getClientRects()) { if (c.width < .5 || c.height < .5 || !out(c, r)) continue; if (seen) visOut = true; else { hidOut = true; const s = t.nodeValue.trim().slice(0, 10); if (!hidTxt.includes(s)) hidTxt.push(s) } }
    }
    return { visOut, hidOut, hidTxt };
  });
}
async function waitReady(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const on = await page.evaluate(() => { const o = document.getElementById("preov"); return !!(o && getComputedStyle(o).display !== "none" && o.getBoundingClientRect().height > 0) }).catch(() => false); if (!on) return; await sleep(700) }
  await page.evaluate(() => { const b = document.querySelector("#preov .pre-skip"); if (b) b.click() }).catch(() => { }); await sleep(1500);
}
async function settle(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { await sleep(1000); const ok = await page.evaluate(() => !!(self.crossOriginIsolated && document.getElementById("view"))).catch(() => false); if (ok) break }
  await sleep(2000); await waitReady(page); await sleep(2000);
}
async function gotoHash(page, h, wait) {
  await page.evaluate(h => { try { if (typeof closeSheet === "function") closeSheet() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()); if (location.hash === h && typeof route === "function") route(); else location.hash = h }, h);
  await sleep(800); await waitReady(page); await sleep(wait);
  await page.evaluate(() => { try { if (typeof closeSheet === "function") closeSheet() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()) }).catch(() => { }); await sleep(500);
}

(async () => {
  const R = { url: URL0, createdAt: new Date().toISOString(), browser: "", build: "", devices: USE_DEV, pages: USE_PAGE, res: {}, errors: [] };
  let browser, srv = null;
  try {
    if (LOCAL) { const b = "local-" + new Date(Date.now() + 8 * 36e5).toISOString().replace(/\D/g, "").slice(0, 12); srv = await LOCAL_FN.serve(LOCAL_FN.localHtml(b)); log("本機伺服器", URL0, b) }
    if (GITM) { const g = await gitServe(GIT_REF); srv = g.srv; R.git = { ref: GIT_REF, commit: g.commit }; log("公開倉庫已發布檔", GIT_REF, g.commit.slice(0, 10), URL0) }
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
    R.browser = "Chrome（headless）" + browser.version();
    for (const D of USE_DEV) {
      const ctx = await browser.newContext(D.kind === "pc" ? { viewport: { width: D.w, height: D.h }, deviceScaleFactor: 1, locale: "zh-TW" } : { viewport: { width: D.w, height: D.h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true, userAgent: D.kind === "pad" ? IPAD_UA : IPHONE_UA, locale: "zh-TW" });
      try {
        await ctx.addInitScript(ST0 => {
          try {
            localStorage.setItem("xq_netRoot", JSON.stringify("xq_test"));
            const S = (k, v) => { if (localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(v)) };
            S("m_onboard1", true); S("m_firstWin", true); S("m_langHint", true); S("m_focusBoard", true); S("instAsk", { no: true, at: Date.now() });
            S("xq_me", { id: "qadv" + Math.random().toString(36).slice(2, 8), name: "裝置測試" });
            for (const k in ST0) localStorage.setItem("m_" + k, JSON.stringify(ST0[k]));
          } catch (e) { }
        }, STORE0);
        const page = await ctx.newPage(); page.setDefaultTimeout(10000);
        page.on("pageerror", e => R.errors.push({ dev: D.id, msg: String(e.message).slice(0, 200) }));
        page.on("dialog", d => d.dismiss().catch(() => { }));
        const cdp = await ctx.newCDPSession(page);
        try { await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: D.inset }) } catch (e) { }
        await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded", timeout: 90000 }); await settle(page);
        if (!R.build) R.build = await page.evaluate(() => window.XQ_BUILD || "").catch(() => "");
        for (const P of USE_PAGE) {
          try {
            await gotoHash(page, P.hash, P.board ? 4000 : 3000);
            const snap = await page.evaluate(`(${COLLECT_SRC})()`), fit0 = EV.judgeOverflow(snap), m = await page.evaluate(MEASURE), lay = judgeLayout(m, D, P);
            const chk = await page.evaluate(TEXTVIS, fit0.map(f => (f.type === "box" || f.type === "cut") && f.r ? f.r : { x: -1e4, y: -1e4, w: 0, h: 0 })).catch(() => null), { keep: fit, fp } = splitFalsePos(fit0, chk);
            const file = `${D.id}-${P.id}.png`; await page.screenshot({ path: path.join(SHOTDIR, file) });
            (R.res[D.id] = R.res[D.id] || {})[P.id] = { file, fit: fit.map(f => ({ type: f.type, text: f.text, detail: f.detail })), lay, m, fp };
            log(D.id, P.id, "爆版", fit.length, "版面", lay.length);
          } catch (e) { R.errors.push({ dev: D.id, page: P.id, msg: String(e.message).slice(0, 200) }); log(D.id, P.id, "出錯", e.message) }
        }
      } finally { await ctx.close().catch(() => { }) }
    }
  } finally { if (browser) await browser.close().catch(() => { }); if (srv) srv.close() }
  fs.writeFileSync(path.join(OUTDIR, "device-fit.json"), JSON.stringify(R, null, 1));
  const cell = x => !x ? "—" : (x.fit.length + x.lay.length) === 0 ? "✅" : `⚠️${x.fit.length + x.lay.length}`;
  let md = `# 裝置支援檢查（iPad 全尺寸＋iPhone Duo）\n\n- 受測：象棋千秋 ${R.build}，${R.url}；${R.browser}；${R.createdAt}\n- 無頭 Chrome 模擬・不是實機；iPhone Duo 尺寸是第三方估計值\n- ✅＝沒有爆版與版面問題；⚠️n＝問題數（逐項見下）\n\n| 裝置 | 尺寸 | ` + USE_PAGE.map(p => p.name).join(" | ") + " |\n|---|---|" + USE_PAGE.map(() => "---").join("|") + "|\n";
  for (const D of USE_DEV) md += `| ${D.name} | ${D.w}×${D.h} | ` + USE_PAGE.map(p => cell(R.res[D.id] && R.res[D.id][p.id])).join(" | ") + " |\n";
  md += "\n## 逐項問題\n";
  for (const D of USE_DEV) for (const P of USE_PAGE) { const x = R.res[D.id] && R.res[D.id][P.id]; if (!x || !(x.fit.length + x.lay.length)) continue; md += `\n### ${D.name} ・ ${P.name}（shots/${x.file}）\n` + x.lay.map(t => `- 版面：${t}`).join("\n") + (x.lay.length ? "\n" : "") + x.fit.map(f => `- ${EV.FIT_TYPES[f.type] || f.type}：${(f.text || "").replace(/\|/g, "／")}（${f.detail}）`).join("\n") + "\n" }
  { const FP = {}, HB = {}; for (const D of USE_DEV) for (const P of USE_PAGE) { const x = R.res[D.id] && R.res[D.id][P.id]; if (!x) continue; for (const f of x.fp || []) { const k = f.text.slice(0, 40) + "｜" + f.why; (FP[k] = FP[k] || []).push(D.id + "／" + P.id) } for (const h of (x.m && x.m.hitBig) || []) { const k = h.replace(/\(\d+×\d+\)$/, ""); (HB[k] = HB[k] || new Set()).add(P.name) } }
    if (Object.keys(FP).length) md += "\n## 排除的量測誤報（不算在上表）\n\n" + Object.entries(FP).map(([k, l]) => `- ${k.split("｜")[0]}：${k.split("｜")[1]}。共 ${l.length} 處（例 ${l.slice(0, 3).join("、")}）`).join("\n") + "\n";
    if (Object.keys(HB).length) md += "\n## 外觀小於 44×44、但點選範圍已經擴到 44×44（elementFromPoint 9 點都點得到它，不算太小）\n\n" + Object.entries(HB).map(([k, s]) => `- ${k}：${[...s].join("、")}`).join("\n") + "\n" }
  if (R.errors.length) md += "\n## 錯誤\n" + R.errors.map(e => `- ${e.dev}${e.page ? "／" + e.page : ""}：${e.msg}`).join("\n") + "\n";
  fs.writeFileSync(path.join(OUTDIR, "device-fit.md"), md);
  log(`完成：${USE_DEV.length} 個尺寸 × ${USE_PAGE.length} 頁，錯誤 ${R.errors.length}；${path.join(OUTDIR, "device-fit.md")}`);
})();
