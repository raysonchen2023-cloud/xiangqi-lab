// 可重現畫面證據包（評比循環第 15 輪 F1「補可重現畫面證據包」、F2「英文介面截圖與防爆版證明」、X2「連線小卡與星槎說明卡截圖」；
//   評審細項 P41.1、P64.1、P21.2、P45.2、P22.5、P06.3）
//
// 做什麼：用「一個」無頭 Chrome（Playwright，channel:chrome），依清單 SHOTS 在兩種手機尺寸（iPhone 17 Pro Max 440×956 @3x、iPhone SE 375×667 @2x）拍畫面：
//   ① 英文介面（真的走「設定 → 頂欄 🌐 → English」切換，App 自己重新載入）：首頁、挑戰電腦開新局選單、對局頁（走兩步）、結果視窗（認輸）、設定頁、
//      螢幕報讀模式下的走棋播報（#axLive 是給讀屏軟體的隱藏區，腳本把它「當下的文字」另外寫在截圖下方的附註欄，附註不是 App 畫的）
//   ② 繁中：連線狀態小卡（兩個瀏覽器分頁在「測試房」自己邀請自己、真的下一步，再點訊號膠囊；失敗才改用 07hs 的 nsgDbgSpec 畫一張「示意」）、
//      星槎「🌀 立體」說明卡、每日同題成績頁＋分享文字、色弱模式、左撇子模式、預走標記
//   ③ 英文防爆版檢查：英文模式下各主要頁面所有看得到的按鈕、標籤、標題，量 scrollWidth>clientWidth、文字範圍超出自己的框、超出父容器、超出畫面、互相重疊，
//      判斷規則是這支檔案匯出的純函式 judgeOverflow（test-evidence-shots.js 測它）；有問題的頁面另存一張紅框標註圖。
//   每張圖下方加一條附註欄：「無頭 Chrome 模擬・不是實機・不是真人操作」、裝置尺寸、版本號、時間、這張要證明什麼；manifest.json 記檔名、像素尺寸、
//   版本號（XQ_BUILD）、網址、時間、SHA-256、要證明什麼、實拍或示意。
//
// 安全：每個分頁開頁前 localStorage 設 xq_netRoot="xq_test"（只連測試房；App 偵測到自動化瀏覽器 navigator.webdriver 也一律只進測試房），
//   絕不在正式房發訊息；全新、用完即丟的瀏覽器設定（不碰開發者存檔）；只開 1 個瀏覽器（裡面可有多個分頁），結束（含出錯）一定關閉瀏覽器和本機伺服器。
//
// 用法（在 <專案根目錄> 下）：
//   node xiangqi-lab/tools/qa/evidence-shots.js                      （預設拍線上版 https://raysonchen2023-cloud.github.io/xiangqi-lab/，任何人都能重拍；約 6～10 分鐘）
//   node xiangqi-lab/tools/qa/evidence-shots.js --local              （拍本機組好的版本：xiangqi-db/tools/mhtml.js 組 m.html，自己開本機伺服器，埠 --port 預設 8841）
//   node xiangqi-lab/tools/qa/evidence-shots.js --url <網址>          （換受測網址，例如別人自己架的副本）
//   node xiangqi-lab/tools/qa/evidence-shots.js --size pm            （只拍一種尺寸：pm＝iPhone 17 Pro Max、se＝iPhone SE，可用逗號接）
//   node xiangqi-lab/tools/qa/evidence-shots.js --only en,fit        （只跑某幾段：en 英文截圖、fit 防爆版檢查、net 連線小卡、zh 其他繁中功能）
//   node xiangqi-lab/tools/qa/evidence-shots.js --outdir <資料夾>     （預設 xiangqi-db/tools/review_loop/rounds/r15；圖放 <outdir>/shots，manifest 與表格放 <outdir>/evidence）
// 產出：<outdir>/shots/B60～B79-*.png（逐張）、A30～A32-*.png（拼圖）、B8x-enfit-*.png（防爆版問題紅框圖）；
//       <outdir>/evidence/manifest.json、overflow.json（原始量測）、overflow-table.md（頁面 × 尺寸 × 問題數，逐項列元素與文字）
// 檔名刻意不用 test- 開頭：不會被一般測試套件撈去跑。純函式的測試：node --test xiangqi-lab/tools/test-evidence-shots.js
"use strict";
const crypto = require("crypto");

// ================= 純函式與清單（測試直接 require；不開瀏覽器） =================
const LIVE_URL = "https://raysonchen2023-cloud.github.io/xiangqi-lab/";
const DISCLAIMER = "無頭 Chrome（Playwright）模擬・不是實機・不是真人操作";
const SIZES = [
  { id: "pm", name: "iPhone 17 Pro Max（440×956）", w: 440, h: 956, dsf: 3, inset: { top: 62, bottom: 34, left: 0, right: 0 } },
  { id: "se", name: "iPhone SE（375×667）", w: 375, h: 667, dsf: 2, inset: { top: 20, bottom: 0, left: 0, right: 0 } },
];
// 清單：no＝檔名編號（同一項兩種尺寸共用編號，檔名尾巴加 -pm／-se）；part＝哪一段（en／net／zh）；rubric＝回應的評審細項
const SHOTS = [
  { no: 60, id: "zh-lang-sheet", part: "en", lang: "zh", name: "設定 → 頂欄 🌐 語言選單", proves: "英文介面的入口：設定頁頂欄 🌐 打開「繁體／簡體／English」選單（切換前的繁中畫面）", rubric: ["P41.1"] },
  { no: 61, id: "en-home", part: "en", lang: "en", name: "英文：首頁", proves: "選 English 後 App 重新載入，首頁標籤、按鈕是英文", rubric: ["P41.1", "P45.2"] },
  { no: 62, id: "en-cpunew", part: "en", lang: "en", name: "英文：挑戰電腦・開新局選單", proves: "開新局選單（執子、對手、難度、開始鍵）英文、文字不爆框", rubric: ["P41.1", "P45.2", "P21.2"] },
  { no: 63, id: "en-cpu", part: "en", lang: "en", name: "英文：對局頁（走兩步）", proves: "對局頁狀態列、工具列英文；走兩步後著法用 WXF 記譜", rubric: ["P41.1", "P45.2", "P21.2"] },
  { no: 64, id: "en-result", part: "en", lang: "en", name: "英文：結果視窗（認輸）", proves: "認輸確認框與結果視窗英文、按鈕不爆框", rubric: ["P41.1", "P45.2"] },
  { no: 65, id: "en-settings", part: "en", lang: "en", name: "英文：設定頁（整頁）", proves: "設定頁整頁英文、各開關與按鈕不超出框", rubric: ["P41.1", "P45.2", "P21.2"], full: true },
  { no: 66, id: "en-sr", part: "en", lang: "en", name: "英文：螢幕報讀模式的走棋播報", proves: "螢幕報讀與鍵盤模式下，每步播報（#axLive，讀屏軟體念的隱藏區）是英文；附註欄是腳本讀出的當下內容", rubric: ["P41.1", "P64.1"] },
  { no: 70, id: "zh-netcard", part: "net", lang: "zh", name: "連線狀態小卡（線上對局點訊號格）", proves: "線上對局（測試房、兩個分頁自己對自己）點棋盤右下訊號膠囊，打開「📶 連線狀態」小卡：延遲、雙方局面雜湊、對局簽名、金鑰、同步事件", rubric: ["P22.5", "P64.1"] },
  { no: 71, id: "zh-shiptilt", part: "zh", lang: "zh", name: "星槎「🌀 立體」說明卡", proves: "雲河星槎按「🌀 立體」先跳說明卡、按「繼續」才問動作權限（iOS 行為；無頭 Chrome 用 init script 補上 requestPermission 模擬 iOS）", rubric: ["P06.3", "P64.1"] },
  { no: 72, id: "zh-daily", part: "zh", lang: "zh", name: "每日同題成績頁＋分享文字", proves: "每日同題解完後的成績頁（方格、統計、分享鍵）；附註欄是 App 的 dqText() 產生的分享文字", rubric: ["P64.1"], full: true },
  { no: 73, id: "zh-cb", part: "zh", lang: "zh", name: "色弱模式（對局中選子）", proves: "色弱模式打開：棋子外圈、可走點、上一步改用形狀與記號區分，不只靠紅綠", rubric: ["P64.1"] },
  { no: 74, id: "zh-lefty", part: "zh", lang: "zh", name: "左撇子模式（對局頁）", proves: "左撇子單手模式：返回、更多改到左下拇指鍵", rubric: ["P64.1", "P21.2"] },
  { no: 75, id: "zh-premove", part: "zh", lang: "zh", name: "預走標記（電腦思考中）", proves: "電腦還在想時先點子、再點落點：紫色虛線框、虛線箭頭、「預」字小牌，狀態列「⏳ 已預走」", rubric: ["P64.1"] },
];
// 防爆版檢查的頁面（英文模式）
const FIT_PAGES = [
  { id: "home", name: "首頁", shot: "en-home" },
  { id: "cpuNew", name: "挑戰電腦・開新局選單", shot: "en-cpunew" },
  { id: "cpu", name: "對局頁", shot: "en-cpu" },
  { id: "result", name: "結果視窗", shot: "en-result" },
  { id: "settings", name: "設定頁", shot: "en-settings" },
  { id: "canju", name: "一盞茶殘局（茶單）", hash: "#/canju" },
  { id: "daily", name: "每日同題", hash: "#/daily" },
];
const shotFile = (s, sizeId) => `B${s.no}-${s.id}-${sizeId}.png`;
const r1 = v => Math.round(v * 10) / 10;

// PNG 檔頭讀寬高（IHDR）
function pngSize(buf) {
  if (!buf || buf.length < 24 || buf.readUInt32BE(0) !== 0x89504e47 || buf.toString("ascii", 12, 16) !== "IHDR") return null;
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}
const sha256 = buf => crypto.createHash("sha256").update(buf).digest("hex");

// 兩個框的交集
function inter(a, b) {
  const x0 = Math.max(a.x, b.x), y0 = Math.max(a.y, b.y), x1 = Math.min(a.x + a.w, b.x + b.w), y1 = Math.min(a.y + a.h, b.y + b.h);
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;
}
// 防爆版判斷：snap＝頁面裡 COLLECT 量到的 {vw, vh, docW, items:[{i, tag, text, r, sw, cw, ovx, tr, pr, prScroll, inScroller, fixed, anc}]}
//   r／tr／pr：元素框、文字範圍框、父容器框（視窗座標 {x,y,w,h}）；sw／cw：scrollWidth／clientWidth（行內元素 cw＝0 不比）；ovx：overflow-x；
//   prScroll：父容器本身可以左右捲（auto／scroll）；inScroller：在可以左右捲的容器裡（超出畫面不算）；anc：祖先裡也被收進來的元素編號（互相包住不算重疊）
// 回傳問題陣列 [{type, i, text, tag, detail, r}]；容許誤差 tol（預設 1px，次像素捨入不算）
const FIT_TYPES = { cut: "文字被截斷", box: "文字超出元素框", parent: "超出父容器", screen: "超出畫面", overlap: "文字互相重疊", tapOverlap: "按鈕框互相重疊", page: "整頁可左右捲動" };
//   規則（誤差 tol＝1px；文字上下超出用 vtol＝4px，字型的上下留白常常比行高大，不算爆版）：
//   ① 文字範圍（Range 的 getClientRects 聯集）左右超出元素框 >1px、或上下 >4px：元素 overflow 是 hidden／clip＝「文字被截斷」，否則＝「文字超出元素框」
//   ② text-overflow:ellipsis 而且 scrollWidth>clientWidth：「文字被截斷」（出現 …）。單純 scrollWidth>clientWidth 不算（裝飾用的 ::after 也會撐大 scrollWidth）
//   ③ 元素左右超出父容器（父容器本身可左右捲、元素是 absolute／fixed／sticky 的不算）；④ 元素左右超出畫面（在可左右捲的容器裡不算）
//   ⑤ 兩個元素（互相包住的不算）的文字範圍交疊 >2×2px＝「文字互相重疊」；文字沒疊到、但兩個可點元素的框交疊 >4×4px＝「按鈕框互相重疊」（會點錯）
//   hide＝只給讀屏軟體的隱藏區，全部跳過
function judgeOverflow(snap, tol = 1, vtol = 4) {
  const out = [], vw = snap && snap.vw, items = ((snap && snap.items) || []).filter(e => !e.hide);
  if (snap && snap.docW > vw + tol) out.push({ type: "page", i: -1, text: "", tag: "html", detail: `document 寬 ${snap.docW}px > 視窗 ${vw}px`, r: null });
  for (const e of items) {
    const r = e.r, R = r.x + r.w, t = e.tr, clip = /hidden|clip/.test(e.ovx || "");
    const tx = t && (t.x < r.x - tol || t.x + t.w > R + tol), ty = t && (t.y < r.y - vtol || t.y + t.h > r.y + r.h + vtol);
    if (tx || ty) out.push({ type: clip ? "cut" : "box", i: e.i, text: e.text, tag: e.tag, detail: `文字範圍 ${r1(t.x)}～${r1(t.x + t.w)} × ${r1(t.y)}～${r1(t.y + t.h)}，元素框 ${r1(r.x)}～${r1(R)} × ${r1(r.y)}～${r1(r.y + r.h)}（scrollWidth ${e.sw}／clientWidth ${e.cw}）`, r });
    else if (/ellipsis/.test(e.ovx || "") && e.cw > 0 && e.sw > e.cw + tol) out.push({ type: "cut", i: e.i, text: e.text, tag: e.tag, detail: `出現省略號：scrollWidth ${e.sw} > clientWidth ${e.cw}`, r });
    if (e.pr && !e.prScroll && !e.fixed && (r.x < e.pr.x - tol || R > e.pr.x + e.pr.w + tol))
      out.push({ type: "parent", i: e.i, text: e.text, tag: e.tag, detail: `元素 ${r1(r.x)}～${r1(R)}，父容器 ${r1(e.pr.x)}～${r1(e.pr.x + e.pr.w)}`, r });
    if (vw && !e.inScroller && (r.x < -tol || R > vw + tol))
      out.push({ type: "screen", i: e.i, text: e.text, tag: e.tag, detail: `元素 ${r1(r.x)}～${r1(R)}，畫面 0～${vw}`, r });
  }
  const leaf = items.filter(a => !items.some(b => b !== a && (b.anc || []).includes(a.i)));
  for (let x = 0; x < leaf.length; x++) for (let y = x + 1; y < leaf.length; y++) {
    const a = leaf[x], b = leaf[y];
    if ((a.anc || []).includes(b.i) || (b.anc || []).includes(a.i)) continue;
    const q = a.tr && b.tr ? inter(a.tr, b.tr) : null;
    if (q && q.w > 2 && q.h > 2) { out.push({ type: "overlap", i: a.i, j: b.i, text: a.text + " ⟷ " + b.text, tag: a.tag + " ⟷ " + b.tag, detail: `文字交疊 ${r1(q.w)}×${r1(q.h)} px`, r: q }); continue }
    const q2 = a.act && b.act ? inter(a.r, b.r) : null;
    if (q2 && q2.w > 4 && q2.h > 4) out.push({ type: "tapOverlap", i: a.i, j: b.i, text: a.text + " ⟷ " + b.text, tag: a.tag + " ⟷ " + b.tag, detail: `框交疊 ${r1(q2.w)}×${r1(q2.h)} px`, r: q2 });
  }
  return out;
}
// 統計表（markdown）：R.fit[page][size] = {issues, n, cjk}
function fitTable(R) {
  const L = ["| 頁面 | " + R.sizes.map(s => s.name + " 問題數（檢查元素數）").join(" | ") + " |", "|---|" + R.sizes.map(() => "---|").join("")];
  for (const P of FIT_PAGES) {
    const row = R.sizes.map(s => { const f = R.fit[P.id] && R.fit[P.id][s.id]; return !f ? "沒量到" : f.err ? "沒量到（" + f.err + "）" : `**${f.issues.length}**（${f.n}）` });
    L.push(`| ${P.name} | ${row.join(" | ")} |`);
  }
  const det = [];
  for (const P of FIT_PAGES) for (const s of R.sizes) {
    const f = R.fit[P.id] && R.fit[P.id][s.id]; if (!f || !f.issues || !f.issues.length) continue;
    det.push(`\n#### ${P.name}・${s.name}${f.marked ? `（紅框圖 ${f.marked}）` : ""}\n`, "| # | 問題 | 元素 | 文字 | 量到的數字 |", "|---|---|---|---|---|");
    f.issues.forEach((q, k) => det.push(`| ${k + 1} | ${FIT_TYPES[q.type] || q.type} | ${q.tag} | ${String(q.text || "").replace(/\|/g, "／").slice(0, 80)} | ${q.detail} |`));
  }
  return L.join("\n") + (det.length ? "\n\n### 逐項\n" + det.join("\n") : "\n\n（全部頁面都沒有問題）");
}
// manifest 檢查（測試用，也在寫檔前自我檢查）
const KINDS = ["實拍", "示意", "拼圖", "標註"];
function validateManifest(m) {
  const err = [];
  if (!m || typeof m !== "object") return ["不是物件"];
  for (const k of ["tool", "command", "build", "url", "createdAt", "browser", "disclaimer", "files"]) if (!(k in m)) err.push("少了 " + k);
  if (m.disclaimer && !/不是實機/.test(m.disclaimer)) err.push("disclaimer 要寫「不是實機」");
  const seen = new Set();
  for (const f of m.files || []) {
    const tag = f && f.file || "?";
    if (!f || typeof f.file !== "string" || !/^[AB]\d{2}-[a-z0-9-]+\.png$/.test(f.file)) err.push(tag + "：檔名格式不對");
    if (seen.has(tag)) err.push(tag + "：檔名重複"); seen.add(tag);
    if (!/^[0-9a-f]{64}$/.test(f.sha256 || "")) err.push(tag + "：sha256 不對");
    if (!(f.px && f.px.w > 0 && f.px.h > 0)) err.push(tag + "：沒有像素尺寸");
    if (!KINDS.includes(f.kind)) err.push(tag + "：kind 要是 " + KINDS.join("／"));
    if (!f.proves || typeof f.proves !== "string") err.push(tag + "：沒寫要證明什麼");
    if (!f.takenAt || isNaN(Date.parse(f.takenAt))) err.push(tag + "：時間不對");
    if (typeof f.build !== "string" || !f.build) err.push(tag + "：沒有版本號");
    if (typeof f.url !== "string" || !/^https?:\/\//.test(f.url)) err.push(tag + "：網址不對");
    if (f.kind === "實拍" || f.kind === "示意") { if (!f.size || !SIZES.some(s => s.id === f.size)) err.push(tag + "：尺寸代號不對") }
  }
  return err;
}
module.exports = { SIZES, SHOTS, FIT_PAGES, FIT_TYPES, KINDS, LIVE_URL, DISCLAIMER, shotFile, pngSize, sha256, inter, judgeOverflow, fitTable, validateManifest };
if (require.main !== module) return;

// ================= 以下才開瀏覽器 =================
const fs = require("fs"), path = require("path"), http = require("http");
const HOME = path.join(__dirname, "..", "..", "..");
const { chromium } = require(path.join(HOME, "claude-desktop-tools", "node_modules", "playwright"));
const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const LOCAL = argv.includes("--local"), PORT = +arg("--port", 8841);
const URL0 = LOCAL ? `http://127.0.0.1:${PORT}/xiangqi-lab/` : arg("--url", LIVE_URL);
const OUTDIR = path.resolve(arg("--outdir", path.join(HOME, "xiangqi-db", "tools", "review_loop", "rounds", "r15")));
const SHOTDIR = path.join(OUTDIR, "shots"), EVDIR = path.join(OUTDIR, "evidence");
const USE_SIZES = SIZES.filter(s => !arg("--size") || arg("--size").split(",").includes(s.id));
const ONLY = arg("--only") ? arg("--only").split(",") : ["en", "fit", "net", "zh"];
fs.mkdirSync(SHOTDIR, { recursive: true }); fs.mkdirSync(EVDIR, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString("zh-TW", { hour12: false }), ...a);
const twTime = d => new Date(d.getTime() + 8 * 36e5).toISOString().replace("T", " ").slice(0, 16) + "（臺灣）";

// ---------- 本機模式：組 m.html、開靜態伺服器（跟 colorblind-scan.js 同一套） ----------
const SITE = path.join(HOME, "xiangqi-lab", "site"), SRC = path.join(HOME, "xiangqi-lab", "src"), PRE = "/xiangqi-lab/";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".wasm": "application/wasm", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".md": "text/markdown; charset=utf-8", ".woff2": "font/woff2", ".nnue": "application/octet-stream" };
function localHtml(build) {
  const { assemble } = require(path.join(HOME, "xiangqi-db", "tools", "mhtml.js"));
  let html = assemble();
  html = html.split(`<link rel="manifest" href="/m/manifest.json"><link rel="icon" href="/m/icon.svg"><link rel="apple-touch-icon" href="/m/icon-180.png">`).join(`<link rel="manifest" href="manifest.json"><link rel="icon" href="icon.svg"><link rel="apple-touch-icon" href="icon-180.png">`);
  html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, "");
  if (!html.includes(`<script>\n"use strict";`)) throw new Error("組好的頁面找不到主程式開頭，build-site.js 的替換規則可能改了");
  return html.split(`<script>\n"use strict";`).join(`<script>window.XQ_OFFLINE=true;window.XQ_BUILD="${build}";</script>\n<script src="core.js"></script>\n<script src="engine.js"></script>\n<script src="local.js"></script>\n<script src="net.js"></script>\n<script src="zh.js"></script>\n<script>\n"use strict";`);
}
// 跨來源隔離標頭（跟 src/sw.js 的 isolate() 一樣），引擎才能開多執行緒
const COI = { "Cross-Origin-Embedder-Policy": "require-corp", "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Resource-Policy": "same-origin", "Cache-Control": "no-store" };
function serve(html) {
  return new Promise((res, rej) => {
    const srv = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split("?")[0]);
      if (!u.startsWith(PRE)) { r.writeHead(404); return r.end() }
      u = u.slice(PRE.length) || "index.html";
      if (u === "index.html") { r.writeHead(200, Object.assign({ "Content-Type": MIME[".html"] }, COI)); return r.end(html) }
      let f = path.join(SITE, u);
      if (!u.includes("/") && fs.existsSync(path.join(SRC, u))) f = path.join(SRC, u);
      if (!path.resolve(f).startsWith(path.resolve(SITE)) && !path.resolve(f).startsWith(path.resolve(SRC))) { r.writeHead(403); return r.end() }
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end() } r.writeHead(200, Object.assign({ "Content-Type": MIME[path.extname(f)] || "application/octet-stream" }, COI)); r.end(b) });
    });
    srv.on("error", rej); srv.listen(PORT, "127.0.0.1", () => res(srv));
  });
}

// ---------- 頁面裡量測（防爆版） ----------
function COLLECT() {
  const vw = innerWidth, vh = innerHeight;
  const vis = e => { try { if (e.checkVisibility && !e.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false } catch (x) { } const r = e.getBoundingClientRect(); return r.width > 1 && r.height > 1 };
  const box = q => ({ x: Math.round(q.left * 10) / 10, y: Math.round(q.top * 10) / 10, w: Math.round(q.width * 10) / 10, h: Math.round(q.height * 10) / 10 });
  const modals = [...document.querySelectorAll(".modal")].filter(vis), sheets = [...document.querySelectorAll("#sheet.sheet, .xqs-sheet.on, #stmOv:not([hidden])")].filter(vis);
  const root = modals.length ? modals[modals.length - 1] : sheets.length ? sheets[sheets.length - 1] : document.body;
  const SEL = "button,[role=button],[role=tab],a[href],label,h1,h2,h3,h4,summary,th,.sec-t,.sh-t,.chip,.tab,.pill,.badge";
  const els = [...root.querySelectorAll(SEL)].filter(e => !e.closest("svg,canvas,#axLive,.ax-sr,[data-evx]") && vis(e)).filter(e => {
    const q = e.getBoundingClientRect(); return !(q.right <= 0 || q.left >= vw) });   // 整個在畫面外（收起來的抽屜）不算看得到
  const txt = e => ((e.innerText || e.getAttribute("aria-label") || "") + "").replace(/\s+/g, " ").trim().slice(0, 70);
  const items = [];
  els.forEach((e, i) => {
    const cs = getComputedStyle(e), q = e.getBoundingClientRect();
    let tr = null; try { const rg = document.createRange(); rg.selectNodeContents(e); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, n = 0;
      for (const c of rg.getClientRects()) { if (c.width < .5 || c.height < .5) continue; n++; x0 = Math.min(x0, c.left); y0 = Math.min(y0, c.top); x1 = Math.max(x1, c.right); y1 = Math.max(y1, c.bottom) }
      if (n) tr = box({ left: x0, top: y0, width: x1 - x0, height: y1 - y0 }) } catch (x) { }
    let p = e.parentElement; while (p && p !== document.body && /^(inline|contents)$/.test(getComputedStyle(p).display)) p = p.parentElement;
    let pr = null, prScroll = false;
    if (p && p !== document.body && p !== document.documentElement) { pr = box(p.getBoundingClientRect()); prScroll = /auto|scroll/.test(getComputedStyle(p).overflowX) }
    let inScroller = false, fixed = /fixed|absolute|sticky/.test(cs.position);
    for (let a = e.parentElement; a && a !== document.documentElement; a = a.parentElement) { const s = getComputedStyle(a); if (/auto|scroll/.test(s.overflowX) && a.scrollWidth > a.clientWidth + 1) inScroller = true }
    const inline = /^inline$/.test(cs.display);
    // 只給讀屏軟體的隱藏區（祖先寬或高 ≤2px、或 clip／clip-path 裁掉）：畫面上看不到，不算
    let hide = false; for (let a = e; a && a !== document.body; a = a.parentElement) { const s = getComputedStyle(a), b = a.getBoundingClientRect(); if ((b.width <= 2 || b.height <= 2) || (s.clip && s.clip !== "auto") || /inset\(50%|inset\(100%/.test(s.clipPath || "")) { hide = true; break } }
    const act = /^(button|a)$/i.test(e.tagName) || /^(button|tab)$/.test(e.getAttribute("role") || "");
    items.push({ hide, act, i, tag: e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") + (e.classList.length ? "." + [...e.classList].slice(0, 2).join(".") : ""), text: txt(e), r: box(q),
      sw: inline ? 0 : e.scrollWidth, cw: inline ? 0 : e.clientWidth, ovx: cs.overflowX + (cs.textOverflow === "ellipsis" ? " ellipsis" : ""), tr, pr, prScroll, inScroller, fixed,
      anc: els.map((a, k) => k !== i && a.contains(e) ? k : -1).filter(k => k >= 0) });
  });
  // 還沒翻的中文（看得到的文字節點；棋盤 svg、語言名稱 data-nocc 除外）
  const cj = /[\u3400-\u9fff\uf900-\ufaff]/, sample = []; let n = 0;
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let t = w.nextNode(); t; t = w.nextNode()) { const v = t.nodeValue.trim(); if (!v || !cj.test(v)) continue; const pe = t.parentElement; if (!pe || pe.closest("svg,canvas,script,style,[data-nocc],#axLive,.ax-sr,[data-evx]") || !vis(pe)) continue; n++; if (sample.length < 15 && !sample.includes(v.slice(0, 40))) sample.push(v.slice(0, 40)) }
  return { vw, vh, docW: document.documentElement.scrollWidth, root: root === document.body ? "body" : (root.id ? "#" + root.id : "." + root.className.split(" ")[0]), items, cjk: { n, sample } };
}

// ---------- App 裡的小工具 ----------
async function waitReady(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const on = await page.evaluate(() => { const o = document.getElementById("preov"); return !!(o && getComputedStyle(o).display !== "none" && o.getBoundingClientRect().height > 0) }).catch(() => false); if (!on) return; await sleep(700) }
  await page.evaluate(() => { const b = document.querySelector("#preov .pre-skip"); if (b) b.click() }).catch(() => { }); await sleep(1500);
}
async function gotoHash(page, h, wait = 3000) {
  await page.evaluate(h => { try { if (typeof closeSheet === "function") closeSheet() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()); if (location.hash === h && typeof route === "function") route(); else location.hash = h }, h);
  await sleep(800); await waitReady(page); await sleep(wait);
}
async function boardPt(page, c, r) {
  return page.evaluate(([c, r]) => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620" && s.getBoundingClientRect().width > 50); if (!svg) return null; const m = svg.getScreenCTM(); const f = !!(svg._o && svg._o.flip); const X = 40 + (f ? 8 - c : c) * 60, Y = 40 + (f ? 9 - r : r) * 60; return { x: m.a * X + m.c * Y + m.e, y: m.b * X + m.d * Y + m.f } }, [c, r]);
}
const boardSig = page => page.evaluate(() => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return svg && svg._b ? JSON.stringify(svg._b) : "" });
async function tapAt(page, p) { if (!p) return false; await page.touchscreen.tap(p.x, p.y); return true }
async function tapSel(page, sel) { const b = await page.locator(sel).first().boundingBox().catch(() => null); if (!b) return false; await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2); return true }
// 依文字（或 aria-label）找看得到的按鈕，回傳中心點
async function findText(page, re, scope) {
  return page.evaluate(([src, fl, scope]) => { const re = new RegExp(src, fl); const R = scope ? document.querySelector(scope) : document; if (!R) return null;
    const el = [...R.querySelectorAll("button,[role=button],a,label,.btn")].find(e => { const q = e.getBoundingClientRect(); return q.width > 1 && q.height > 1 && (re.test((e.innerText || "").trim()) || re.test(e.getAttribute("aria-label") || "")) });
    if (!el) return null; const q = el.getBoundingClientRect(); return { x: q.left + q.width / 2, y: q.top + q.height / 2, t: (el.innerText || "").trim().slice(0, 40) } }, [re.source, re.flags, scope || null]);
}
async function tapText(page, re, scope) { const p = await findText(page, re, scope); if (p) await page.touchscreen.tap(p.x, p.y); return p }
async function move(page, a, b) { await tapAt(page, await boardPt(page, a[0], a[1])); await sleep(350); await tapAt(page, await boardPt(page, b[0], b[1])) }
async function waitTurn(page, ms = 20000) {   // 等電腦回一步（盤面變了、而且不在思考）
  const s0 = await boardSig(page), t0 = Date.now();
  while (Date.now() - t0 < ms) { await sleep(500); const s = await boardSig(page); if (s && s !== s0) { await sleep(1200); return true } }
  return false;
}
// 著法說明泡泡（01-board tmxBub，第一次走錯時自動跳、幾秒後自己消失）：記下文字再收掉，免得蓋住棋盤
async function bubbles(page) { return page.evaluate(() => { const t = [...document.querySelectorAll(".tmx-bub")].map(b => b.innerText.replace(/\s+/g, " ").trim()); document.querySelectorAll(".tmx-bub").forEach(b => b.remove()); return t }).catch(() => []) }
async function closeAll(page) { await page.evaluate(() => { try { if (typeof closeSheet === "function") closeSheet() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()) }).catch(() => { }); await sleep(500) }

// ---------- 開分頁 ----------
// 線上版：照真人手機的路走——讓 App 的 sw.js 接手（大檔從 CDN 拿、加上跨來源隔離標頭，引擎才能多執行緒），App 第一次會自己重新整理一次；
//   不擋 service worker 也是為了不對 GitHub Pages 狂送請求（擋掉的話每個圖檔都直接問 GitHub，幾分鐘就被暫時封鎖 Rate limit exceeded，同一個 IP 的真人手機也會打不開）。
// 本機版：擋 service worker，本機伺服器自己加同樣的 COOP／COEP／CORP 標頭（跟 sw.js 的 isolate() 一樣）。
let RATE_LIMITED = false;
async function rateCheck(page) {
  if (await page.evaluate(() => /Rate limit exceeded/i.test(document.body ? document.body.innerText : "")).catch(() => false)) RATE_LIMITED = true;
  if (RATE_LIMITED) throw new Error("GitHub Pages 回「Rate limit exceeded」，停止；過幾分鐘再跑");
}
async function settle(page) {   // 等 App 就緒：線上版等 sw.js 接手、跨來源隔離生效（App 會自己重整），再等水墨等待畫面消失
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { await sleep(1000); await rateCheck(page); const ok = await page.evaluate(() => !!(self.crossOriginIsolated && document.getElementById("view"))).catch(() => false); if (ok) break }
  await sleep(2000); await waitReady(page); await sleep(2500);
}
async function reloadApp(page) { await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 }); await settle(page) }
async function openCtx(browser, S, R, o) {
  o = o || {};
  if (RATE_LIMITED) throw new Error("GitHub Pages 擋了（Rate limit exceeded），不再開新分頁");
  const ctx = await browser.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dsf, isMobile: true, hasTouch: true, serviceWorkers: LOCAL ? "block" : "allow", locale: "zh-TW" });
  await ctx.addInitScript(o => {
    try {
      localStorage.setItem("xq_netRoot", JSON.stringify("xq_test"));   // 測試房：絕不進正式大廳
      const S = (k, v) => { if (localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(v)) };
      S("m_onboard1", true); S("m_firstWin", true); S("m_langHint", true); S("m_focusBoard", true);
      S("xq_me", { id: "qaev" + Math.random().toString(36).slice(2, 8), name: o.name || "證據測試" });
      // 模擬 iOS：DeviceOrientationEvent.requestPermission 存在（星槎「🌀 立體」才會先跳說明卡）；回 denied，不會真的開陀螺儀
      if (o.iosPerm && typeof DeviceOrientationEvent !== "undefined" && !DeviceOrientationEvent.requestPermission) DeviceOrientationEvent.requestPermission = () => Promise.resolve("denied");
    } catch (e) { }
  }, o);
  const page = await ctx.newPage(); page.setDefaultTimeout(10000);
  page.on("pageerror", e => R.errors.push({ size: S.id, where: o.tag || "", msg: "頁面錯誤：" + String(e.message).slice(0, 200) }));
  page.on("dialog", d => d.dismiss().catch(() => { }));
  const cdp = await ctx.newCDPSession(page);
  try { await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: S.inset }) } catch (e) { }
  await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded", timeout: 90000 });
  try { await settle(page) } catch (e) { await ctx.close(); throw e }
  if (!R.build) R.build = await page.evaluate(() => window.XQ_BUILD || "").catch(() => "");
  const coi = await page.evaluate(() => self.crossOriginIsolated).catch(() => false);
  if (!coi) R.notes.push(`${S.id}/${o.tag}：跨來源隔離沒生效（crossOriginIsolated=false），電腦引擎可能不會走棋`);
  return { ctx, page };
}

// ---------- 存圖：下方加附註欄；boxes＝紅框（防爆版標註，{x,y,w,h,n}） ----------
let ANA = {};
async function anaPage(browser, dsf) { if (!ANA[dsf]) { const c = await browser.newContext({ viewport: { width: 500, height: 400 }, deviceScaleFactor: dsf }); ANA[dsf] = { c, p: await c.newPage() } } return ANA[dsf].p }
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
async function compose(browser, S, buf, lines, boxes) {
  const pg = await anaPage(browser, S.dsf), px = pngSize(buf), W = px.w / S.dsf, H = px.h / S.dsf;
  const bx = (boxes || []).filter(b => b.y < H && b.y + b.h > 0).map(b => `<div style="position:absolute;left:${b.x - 2}px;top:${Math.max(0, b.y - 2)}px;width:${b.w + 4}px;height:${Math.min(b.h + 4, H - Math.max(0, b.y - 2))}px;border:2px solid #e00;box-sizing:border-box;background:rgba(255,0,0,.10)"><span style="position:absolute;left:-2px;top:${b.y < 16 ? 0 : -15}px;background:#e00;color:#fff;font:bold 11px sans-serif;padding:0 3px;border-radius:3px;line-height:14px">${b.n}</span></div>`).join("");
  await pg.setViewportSize({ width: Math.ceil(W), height: 300 });
  await pg.setContent(`<html><body style="margin:0;background:#fff;width:${W}px"><div style="position:relative;width:${W}px;height:${H}px;overflow:hidden"><img src="data:image/png;base64,${buf.toString("base64")}" style="width:${W}px;height:${H}px;display:block">${bx}</div>
    <div style="border-top:3px dashed #c00;background:#fff8e6;color:#222;font:12px/1.45 'Microsoft JhengHei',sans-serif;padding:6px 8px;width:${W}px;box-sizing:border-box;word-break:break-all">${lines.map((l, k) => `<div${k === 0 ? ' style="font-weight:bold;color:#b00"' : ""}>${esc(l).replace(/\n/g, "<br>")}</div>`).join("")}</div></body></html>`);
  await sleep(250);
  return pg.screenshot({ fullPage: true });
}

// ---------- 主程式 ----------
(async () => {
  const startedAt = new Date();
  const R = { tool: "xiangqi-lab/tools/qa/evidence-shots.js", command: "node xiangqi-lab/tools/qa/evidence-shots.js " + argv.join(" "), url: URL0, local: LOCAL, build: "", browser: "", createdAt: startedAt.toISOString(),
    disclaimer: DISCLAIMER + "；截圖下方虛線以下的附註欄是腳本加的，不是 App 畫面", netRoot: "xq_test（測試房）", sizes: USE_SIZES.map(s => ({ id: s.id, name: s.name, w: s.w, h: s.h, dsf: s.dsf, inset: s.inset })),
    files: [], fit: {}, notes: [], errors: [] };
  let srv = null, browser = null, B = null;
  if (LOCAL) { const b = "local-" + new Date(startedAt.getTime() + 8 * 36e5).toISOString().replace(/\D/g, "").slice(0, 12); srv = await serve(localHtml(b)); log("本機伺服器", URL0, b) }
  const SHOT = Object.fromEntries(SHOTS.map(s => [s.id, s]));
  // 存一張：raw＝App 截圖；kind 實拍／示意；extra＝附註欄多寫的幾行
  async function save(S, id, raw, o) {
    o = o || {}; const s = SHOT[id], file = shotFile(s, S.id), now = new Date();
    const lines = [DISCLAIMER + (o.kind === "示意" ? "・⚠ 這張是示意（見下）" : ""), `${S.name} @${S.dsf}x｜象棋千秋 ${R.build || "?"}｜${twTime(now)}｜${file}`, "證明：" + (o.proves || s.proves)].concat(o.extra || []);
    const out = await compose(browser, S, raw, lines, null);
    fs.writeFileSync(path.join(SHOTDIR, file), out);
    const old = R.files.findIndex(f => f.file === file); if (old >= 0) R.files.splice(old, 1);
    R.files.push({ file, kind: o.kind || "實拍", size: S.id, device: S.name, viewport: { w: S.w, h: S.h, dsf: S.dsf }, px: pngSize(out), build: R.build, url: o.url || URL0, takenAt: now.toISOString(),
      sha256: sha256(out), proves: o.proves || s.proves, rubric: s.rubric, lang: s.lang, note: o.note || "" });
    log("  存", file, o.kind || "實拍");
  }
  const shotOf = (page, full) => page.screenshot({ fullPage: !!full });
  const urlOf = page => page.url();
  async function fit(page, S, pid) {
    try {
      const snap = await page.evaluate(COLLECT); const issues = judgeOverflow(snap);
      const lang = await page.evaluate(() => document.documentElement.lang);
      (R.fit[pid] = R.fit[pid] || {})[S.id] = { n: snap.items.filter(e => !e.hide).length, hidden: snap.items.filter(e => e.hide).length, root: snap.root, lang, issues, cjk: snap.cjk, url: urlOf(page) };
      log(`  防爆版 ${pid}/${S.id}：元素 ${snap.items.length}、問題 ${issues.length}、未翻中文 ${snap.cjk.n}（lang=${lang}）`);
      if (lang !== "en") R.notes.push(`${S.id}：防爆版 ${pid} 量的時候 html lang＝${lang}，不是英文`);
      if (issues.length) {   // 紅框標註圖（視窗截圖；視窗外的只在表裡）
        const P = FIT_PAGES.find(p => p.id === pid), file = `B${80 + FIT_PAGES.indexOf(P)}-enfit-${pid.toLowerCase()}-${S.id}.png`;
        const raw = await page.screenshot(); const boxes = issues.map((q, k) => q.r ? Object.assign({ n: k + 1 }, q.r) : null).filter(Boolean);
        const inView = boxes.filter(b => b.y < S.h && b.y + b.h > 0).length;
        const lines = [DISCLAIMER, `${S.name} @${S.dsf}x｜象棋千秋 ${R.build || "?"}｜${twTime(new Date())}｜${file}`, `英文防爆版檢查：${P.name}，${issues.length} 個問題（紅框編號＝evidence/overflow-table.md 的順序；視窗內 ${inView} 個，其餘在畫面外只列在表裡）`]
          .concat(issues.slice(0, 14).map((q, k) => `${k + 1}. ${FIT_TYPES[q.type]}：${String(q.text).slice(0, 46)}（${q.detail.slice(0, 60)}）`)).concat(issues.length > 14 ? [`…其餘 ${issues.length - 14} 個見表`] : []);
        const out = await compose(browser, S, raw, lines, boxes); fs.writeFileSync(path.join(SHOTDIR, file), out);
        R.files.push({ file, kind: "標註", size: S.id, device: S.name, viewport: { w: S.w, h: S.h, dsf: S.dsf }, px: pngSize(out), build: R.build, url: urlOf(page), takenAt: new Date().toISOString(), sha256: sha256(out), proves: `英文防爆版檢查問題位置：${P.name}（${issues.length} 個）`, rubric: ["P45.2", "P21.2"], lang: "en", note: "" });
        R.fit[pid][S.id].marked = file;
      }
    } catch (e) { (R.fit[pid] = R.fit[pid] || {})[S.id] = { err: String(e.message).slice(0, 80) }; R.errors.push({ size: S.id, where: "fit " + pid, msg: e.message }) }
  }
  const step = async (S, name, fn) => { if (RATE_LIMITED) return; try { await fn() } catch (e) { R.errors.push({ size: S.id, where: name, msg: String(e.message).slice(0, 240) }); log("  ✗", name, e.message.slice(0, 160)) } };
  const langOf = page => page.evaluate(() => ({ lang: document.documentElement.lang, m: localStorage.getItem("m_lang") })).catch(() => ({}));
  async function ensureEn(page, S, after) {   // 英文設定還在嗎？不在就記下來（可能是 App 的問題）並補設
    const st = await langOf(page); (R.langTrace = R.langTrace || []).push(`${S.id}｜${after}｜html lang=${st.lang}｜m_lang=${st.m}`);
    if (st.lang === "en" && st.m === '"en"') return;
    R.notes.push(`⚠ ${S.id}：「${after}」之後 html lang＝${st.lang}、localStorage m_lang＝${st.m}（英文設定不見了${st.lang === "en" ? "；畫面還是英文，但下次開 App 會變回中文" : ""}），腳本重設 m_lang＝"en" 再重新載入`);
    await page.evaluate(() => localStorage.setItem("m_lang", JSON.stringify("en"))); await reloadApp(page);
  }
  const newCpu = closeAll;   // 上一盤已經下完，App 一進挑戰電腦就自己開新局（08b-cpugame.js），這裡只要關掉跳出來的視窗

  try {
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
    R.browser = "Chrome " + browser.version() + "（headless）"; log("瀏覽器", R.browser, "網址", URL0);
    for (const S of USE_SIZES) {
      if (RATE_LIMITED) { R.errors.push({ size: S.id, where: "main", msg: "GitHub Pages 擋了（Rate limit exceeded），這個尺寸沒拍" }); continue }
      log("=== 尺寸", S.name);
      let M;
      try { M = await openCtx(browser, S, R, { tag: "main", iosPerm: true }) } catch (e) { R.errors.push({ size: S.id, where: "開分頁", msg: e.message }); log("  ✗ 開分頁", e.message); continue }
      const page = M.page;
      // ---------- ① 英文介面＋防爆版 ----------
      if (ONLY.includes("en") || ONLY.includes("fit")) {
        const EN = ONLY.includes("en"), FIT = ONLY.includes("fit");
        await step(S, "切換英文", async () => {
          await gotoHash(page, "#/settings", 3000);
          const p = await findText(page, /語言 Language/, "#topbar") || await findText(page, /語言 Language/);
          if (!p) throw new Error("設定頁頂欄找不到 🌐（aria-label「語言 Language」）");
          await page.touchscreen.tap(p.x, p.y); await sleep(1500);
          if (EN) await save(S, "zh-lang-sheet", await shotOf(page), { url: urlOf(page) });
          const en = await tapText(page, /^English$/, "#sheet") || await tapText(page, /^English$/);
          if (!en) throw new Error("語言選單找不到 English");
          await page.waitForEvent("load", { timeout: 30000 }).catch(() => { }); await settle(page);
          const st = await langOf(page);
          if (st.lang !== "en") throw new Error("切換後 html lang 不是 en：" + JSON.stringify(st));
          R.notes.push(`${S.id}：真的點「設定 → 頂欄 🌐 → English」切換，App 重新載入後 html lang＝${st.lang}、m_lang＝${st.m}`);
        });
        await step(S, "英文首頁", async () => {
          await gotoHash(page, "#/", 3500);
          if (EN) await save(S, "en-home", await shotOf(page), { url: urlOf(page) });
          if (FIT) await fit(page, S, "home");
        });
        await step(S, "英文開新局選單", async () => {
          await ensureEn(page, S, "英文首頁");
          await gotoHash(page, "#/cpu", 4500); await closeAll(page);
          if (!(await tapSel(page, "#acts button.pri"))) throw new Error("找不到開新局按鈕（#acts button.pri）");
          await sleep(1800);
          if (EN) await save(S, "en-cpunew", await shotOf(page), { url: urlOf(page) });
          if (FIT) await fit(page, S, "cpuNew");
          if (await page.$("#sheet #go")) { await tapSel(page, "#sheet #go"); await sleep(3500) } else await closeAll(page);
        });
        await step(S, "英文對局", async () => {
          await ensureEn(page, S, "英文開新局選單");
          await closeAll(page);
          await move(page, [7, 7], [4, 7]); if (!(await waitTurn(page))) R.notes.push(S.id + "：英文對局第 1 步後 20 秒內沒看到電腦回應");
          await move(page, [7, 9], [6, 7]); if (!(await waitTurn(page))) R.notes.push(S.id + "：英文對局第 2 步後 20 秒內沒看到電腦回應");
          await sleep(800); const bub = await bubbles(page);
          if (bub.length) R.notes.push(`${S.id}：英文對局頁自動跳出的著法說明泡泡（截圖前收掉）：${bub.join("｜")}`);
          if (EN) await save(S, "en-cpu", await shotOf(page), { url: urlOf(page), extra: bub.length ? ["截圖前收掉了自動跳出的著法說明泡泡（第一次走錯時出現，內容還是中文，原文記在 manifest notes）"] : [] });
          if (FIT) await fit(page, S, "cpu");
        });
        await step(S, "英文結果視窗", async () => {
          await ensureEn(page, S, "英文對局");
          await closeAll(page);
          if (!(await tapText(page, /(Resign|認輸)$/, "#acts"))) throw new Error("找不到認輸鍵");
          await sleep(1200); if (!(await page.$(".modal .mb .btn:not(.ghost)"))) throw new Error("沒有認輸確認框");
          await tapSel(page, ".modal .mb .btn:not(.ghost)");
          for (let k = 0; k < 20; k++) { await sleep(600); if (await page.$(".modal")) break }
          await sleep(2500);
          if (EN) await save(S, "en-result", await shotOf(page), { url: urlOf(page) });
          if (FIT) await fit(page, S, "result");
        });
        await step(S, "英文設定", async () => {
          await ensureEn(page, S, "英文結果視窗");
          await gotoHash(page, "#/settings", 3500);
          if (EN) await save(S, "en-settings", await shotOf(page, true), { url: urlOf(page) });
          if (FIT) await fit(page, S, "settings");
        });
        if (FIT) for (const P of FIT_PAGES.filter(p => p.hash)) await step(S, "防爆版 " + P.id, async () => { await ensureEn(page, S, "進「" + P.name + "」之前"); await gotoHash(page, P.hash, 4000); await closeAll(page); await fit(page, S, P.id) });
        if (EN) await step(S, "英文讀屏播報", async () => {
          await ensureEn(page, S, "防爆版各頁");
          // 先回首頁再重新載入：停在 #/daily 重新載入（冷開每日同題連結）時，App 開機會丟 ReferenceError（DQ 還沒初始化），後面的模組（英文介面、讀屏模式）都不會載入
          await gotoHash(page, "#/", 2000);
          await page.evaluate(() => localStorage.setItem("m_axMode", "true")); await reloadApp(page);
          await ensureEn(page, S, "打開讀屏模式（m_axMode）並重新載入");
          if (!(await page.evaluate(() => document.documentElement.hasAttribute("data-axm")))) { R.notes.push(`⚠ ${S.id}：設 m_axMode＝true 重新載入後 html 沒有 data-axm（讀屏模式沒打開），腳本再設一次`); await page.evaluate(() => localStorage.setItem("m_axMode", "true")); await reloadApp(page) }
          await gotoHash(page, "#/cpu", 4500); await closeAll(page);
          await page.evaluate(() => { const r = document.getElementById("axLive"); if (r) r.innerHTML = "" });   // 只看這一步之後的播報
          await move(page, [7, 7], [4, 7]); if (!(await waitTurn(page))) R.notes.push(S.id + "：讀屏模式走棋後 20 秒內沒看到電腦回應");
          await sleep(1500);
          const live = await page.evaluate(() => { const r = document.getElementById("axLive"); return { t: r ? [...r.children].map(d => d.textContent) : [], ax: document.documentElement.hasAttribute("data-axm"), lang: document.documentElement.lang } });
          await save(S, "en-sr", await shotOf(page), { url: urlOf(page), extra: ["#axLive（讀屏播報區，畫面上隱藏）走一步後的內容，舊→新："].concat(live.t.length ? live.t.map((t, k) => `  ${k + 1}. ${t}`) : ["  （空的）"]).concat([`html[data-axm]＝${live.ax}、lang＝${live.lang}`]) });
          R.notes.push(`${S.id}：讀屏播報 ${JSON.stringify(live.t)}（data-axm=${live.ax}, lang=${live.lang}）`);
        });
        await step(S, "切回繁中", async () => {
          await page.evaluate(() => { localStorage.removeItem("m_lang"); localStorage.setItem("m_axMode", "false") }); await reloadApp(page);
          const st = await langOf(page); if (st.lang === "en") throw new Error("切回繁中失敗");
        });
      }
      // ---------- ② 其他繁中功能 ----------
      if (ONLY.includes("zh")) {
        await step(S, "預走", async () => {
          await gotoHash(page, "#/cpu", 4500); await newCpu(page);
          let ok = false;
          const plan = [[[7, 7], [4, 7], [1, 9], [2, 7]], [[7, 9], [6, 7], [0, 9], [0, 8]], [[1, 7], [1, 3], [8, 9], [8, 8]]];
          for (const [a, b, c, d] of plan) {
            await move(page, a, b); await sleep(150);
            await tapAt(page, await boardPt(page, c[0], c[1])); await sleep(150); await tapAt(page, await boardPt(page, d[0], d[1])); await sleep(250);
            const q = await page.evaluate(() => typeof PMV_S !== "undefined" && PMV_S && PMV_S.q ? { cn: PMV_S.q.cn || "" } : null).catch(() => null);
            if (q) { await save(S, "zh-premove", await shotOf(page), { url: urlOf(page), extra: [`電腦思考中截圖；預走排的是「${q.cn}」`] }); ok = true; break }
            await waitTurn(page);
          }
          if (!ok) throw new Error("三次都沒在電腦回應前排進預走（電腦回得太快）");
          await waitTurn(page);
        });
        await step(S, "色弱模式", async () => {
          await page.evaluate(() => { store.set("cbMode", true); if (typeof cbApply === "function") cbApply() });
          await gotoHash(page, "#/cpu", 4000); await closeAll(page);
          for (const s of [[1, 7], [7, 7], [0, 9], [8, 9], [0, 6], [2, 6]]) { await tapAt(page, await boardPt(page, s[0], s[1])); await sleep(700); const on = await page.evaluate(() => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return !!(svg && svg._o && svg._o.sel != null) }); if (on) break }
          const m = await page.evaluate(() => ({ attr: document.documentElement.hasAttribute("data-cbm"), marks: document.querySelectorAll("[data-cbx]").length }));
          await save(S, "zh-cb", await shotOf(page), { url: urlOf(page), extra: [`html[data-cbm]＝${m.attr}、色弱記號元素 [data-cbx] ${m.marks} 個（選起一顆己方棋子）`] });
          await page.evaluate(() => { store.set("cbMode", false); if (typeof cbApply === "function") cbApply() });
        });
        await step(S, "左撇子", async () => {
          await page.evaluate(() => localStorage.setItem("m_lefty", "true")); await reloadApp(page);
          await gotoHash(page, "#/cpu", 4500); await closeAll(page);
          const m = await page.evaluate(() => ({ attr: document.documentElement.hasAttribute("data-lefty") }));
          await save(S, "zh-lefty", await shotOf(page), { url: urlOf(page), extra: [`html[data-lefty]＝${m.attr}`] });
          await page.evaluate(() => localStorage.setItem("m_lefty", "false")); await reloadApp(page);
        });
        await step(S, "星槎立體說明卡", async () => {
          await gotoHash(page, "#/adventure", 6000); await closeAll(page);
          if (!(await page.$(".shp-gy"))) { const info = await page.evaluate(() => ({ coarse: matchMedia("(pointer: coarse)").matches, ok: typeof shpTiltOk === "function" ? shpTiltOk() : null, hash: location.hash })); throw new Error("星槎頁沒有「🌀 立體」：" + JSON.stringify(info)) }
          await sleep(900); await tapSel(page, ".shp-gy"); await sleep(1500);
          const card = await page.evaluate(() => { const m = [...document.querySelectorAll(".modal")].pop(); return m ? m.innerText.replace(/\s+/g, " ").slice(0, 80) : "" });
          if (!/動作與方向|傾斜/.test(card)) throw new Error("按了沒跳說明卡：" + card);
          await save(S, "zh-shiptilt", await shotOf(page), { url: urlOf(page), extra: ["真的觸控點「🌀 立體」；無頭 Chrome 沒有 iOS 的 DeviceOrientationEvent.requestPermission，腳本在載入前補一個回 denied 的假函式模擬 iOS，說明卡本身是 App 畫的"] });
          await closeAll(page);
        });
        await step(S, "每日同題", async () => {
          await gotoHash(page, "#/daily", 6000); await closeAll(page);
          const k = await page.evaluate(() => dqToday());
          const info = await page.evaluate(k => { const id = typeof dqPickId === "function" ? dqPickId(k) : ""; const A = dqAll(); A.d[k] = { id: String(id || ""), n: 4, sq: "gygg", m: 1, h: 0, a: 0, w: 1, l: 0, at: Date.now(), s: 95 }; store.set(DQ.KEY, A); return { id } }, k);
          await gotoHash(page, "#/daily/" + k, 5000);
          const txt = await page.evaluate(k => dqText(k), k);
          await save(S, "zh-daily", await shotOf(page, true), { url: urlOf(page), note: "成績是腳本寫入的示範紀錄", extra: ["⚠ 成績紀錄是腳本寫進存檔的示範（4 步、走錯 1 次、沒看提示；題號 " + info.id + "），沒有真的解題；成績頁與下面的分享文字是 App 實際產生的", "分享文字（App 的 dqText()，按「📤 分享成績」送出的就是這段）：", txt] });
          R.notes.push(`${S.id}：每日同題分享文字 ${JSON.stringify(txt)}`);
          // 冷開分享連結（停在 #/daily/<日期> 重新載入）：記下開機時的頁面錯誤（只記錄，不改 App）
          const e0 = R.errors.length; await page.reload({ waitUntil: "domcontentloaded", timeout: 90000 }); await sleep(9000);
          const errs = R.errors.slice(e0).map(e => e.msg), cold = await page.evaluate(() => ({ lang: document.documentElement.lang, view: ((document.getElementById("view") || {}).innerText || "").replace(/\s+/g, " ").slice(0, 60) })).catch(() => ({}));
          R.notes.push(`${S.id}：冷開每日同題連結 #/daily/${k}：開機頁面錯誤 ${errs.length} 個${errs.length ? "（" + [...new Set(errs)].join("；") + "）" : ""}；畫面開頭「${cold.view || ""}」`);
          await gotoHash(page, "#/", 1500); await reloadApp(page);
        });
      }
      // ---------- ③ 連線狀態小卡：這個分頁（A）和另一個分頁（B）在測試房自己對自己 ----------
      if (ONLY.includes("net")) await step(S, "連線小卡", async () => {
        let real = false, why = "";
        try {
          if (!B) B = await openCtx(browser, SIZES[1], R, { tag: "netB", name: "證據對手" });
          await gotoHash(page, "#/", 2500); await gotoHash(B.page, "#/", 1500);
          const up = async pg => { for (let k = 0; k < 40; k++) { if (await pg.evaluate(() => window.XQNet && XQNet.status && XQNet.status() === "up").catch(() => false)) return true; await sleep(500) } return false };
          if (!(await up(page)) || !(await up(B.page))) throw new Error("測試房連不上（XQNet.status 不是 up）");
          const bId = await B.page.evaluate(() => { window.__evInv = null; if (!window.__evHook) { window.__evHook = 1; XQNet.on("invite", x => { window.__evInv = x }) } return XQNet.me() });
          await page.evaluate(b => XQNet.invite(b), bId);
          let inv = false; for (let k = 0; k < 30 && !inv; k++) { await sleep(500); inv = await B.page.evaluate(() => !!window.__evInv) }
          if (!inv) throw new Error("B 分頁沒收到邀請");
          await B.page.evaluate(() => { document.querySelectorAll(".modal").forEach(m => m.remove()); XQNet.respond(window.__evInv, true) });
          let both = false; for (let k = 0; k < 40 && !both; k++) { await sleep(500); both = await page.evaluate(() => !!(XQNet.active() && XQNet.side() && XQNet.game())) && await B.page.evaluate(() => !!(XQNet.active() && XQNet.side() && XQNet.game())) }
          if (!both) throw new Error("對局沒建立");
          for (const pg of [page, B.page]) await pg.evaluate(() => { document.querySelectorAll(".modal").forEach(m => m.remove()); if (!/^#\/pvp/.test(location.hash)) location.hash = "#/pvp" });
          await sleep(4000); await waitReady(page); await waitReady(B.page); await sleep(1500);
          const redPg = (await page.evaluate(() => XQNet.side())) === "r" ? page : B.page;
          await closeAll(redPg); await move(redPg, [7, 7], [4, 7]); await sleep(9000);
          await closeAll(page);
          if (!(await tapSel(page, "#nsg button.nsg-p"))) throw new Error("A 分頁的對局頁沒有訊號膠囊");
          await sleep(2500);
          if (!(await page.$(".modal.nsg-dbg"))) throw new Error("點了訊號膠囊沒有打開連線狀態小卡");
          const sd = await page.evaluate(() => { document.querySelectorAll(".modal.nsg-dbg, .modal.nsg-dbg .box").forEach(x => { x.scrollTop = 0 }); if (document.activeElement && document.activeElement.blur) document.activeElement.blur(); return XQNet.side() });
          await sleep(400);
          await save(S, "zh-netcard", await shotOf(page), { url: urlOf(page), extra: [`實拍：同一個無頭瀏覽器裡兩個分頁（各自全新的瀏覽器設定）在測試房 xq_test 互相邀請，紅方走了「炮二平五」；這張是坐${sd === "r" ? "紅" : "黑"}方的分頁點訊號膠囊後的小卡`] });
          real = true;
        } catch (e) { why = e.message; log("  連線小卡實拍失敗：", why) }
        for (const pg of [page, B && B.page].filter(Boolean)) await pg.evaluate(() => { try { XQNet.leave() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()) }).catch(() => { });
        await sleep(1500);
        if (!real) {   // 示意：07hs 的 nsgDbgSpec 用假資料畫
          await gotoHash(page, "#/", 2500);
          await page.evaluate(() => {
            const now = Date.now(), D = { lat: { ms: 86, src: "peer", ver: true, bars: 3, last: [92, 81, 86, 77, 95], avg: 86, jit: 7, server: 41 }, sync: { ok: true, ver: true, me: { rev: 12, n: 6, h: "3fa9c2" }, peer: { rev: 12, n: 6, h: "3fa9c2" } },
              sign: "signed", peerVer: "new", req: true, recon: 0, peer: "ok", stats: { sigOk: 18, unv: 0, bad: 0, nosig: 0, replay: 0, win: 0, dup: 1, old: 0, flood: 0, stOut: 1, stIn: 1, nd: 0, gap: 0, gapFix: 0 },
              ev: [{ at: now - 9000, d: "out", t: "mv", sq: 5, ok: true }, { at: now - 6000, d: "in", t: "mv", sq: 6, ok: true }, { at: now - 2000, d: "in", t: "pg", sq: 7, ok: true }] };
            nsgCss(); const X = nsgDbgSpec(D, "示意資料", now, { st: "first", fp: "A1B2-C3D4-E5F6", mine: "9F8E-7D6C-5B4A" }); modal(X.html, [["關閉", null]], "nsg-dbg");
          });
          await sleep(1200);
          await save(S, "zh-netcard", await shotOf(page), { kind: "示意", url: urlOf(page), note: "實拍失敗：" + why, proves: "連線狀態小卡的版面（⚠ 示意：用 App 的 nsgDbgSpec 畫、資料是腳本編的，不是真的線上對局）", extra: ["⚠ 示意：實拍失敗（" + why + "），改用 App 的渲染函式 nsgDbgSpec 帶假資料畫出；數字是編的"] });
        }
      });
      await M.ctx.close().catch(() => { });
    }
    // ---------- 拼圖：A30 英文（兩種尺寸）、A31 連線小卡＋星槎說明卡、A32 繁中其他功能 ----------
    const pick = ids => USE_SIZES.flatMap(S => ids.map(id => R.files.find(f => f.file === shotFile(SHOT[id], S.id)))).filter(Boolean);
    async function montage(file, title, list, cols, proves, rubric) {
      if (!list.length) return;
      const ctx = await browser.newContext({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 }); const pg = await ctx.newPage();
      const cellW = Math.floor((1600 - 20 - (cols - 1) * 10) / cols);
      const cells = list.map(f => { const b = fs.readFileSync(path.join(SHOTDIR, f.file)).toString("base64"); return `<div style="width:${cellW}px"><div style="max-height:${Math.round(cellW * 2.6)}px;overflow:hidden;border:1px solid #999"><img src="data:image/png;base64,${b}" style="width:${cellW}px;display:block"></div><div style="font:11px sans-serif;color:#333;margin-top:2px">${esc(f.file)}（${esc(f.kind)}）</div></div>` }).join("");
      await pg.setContent(`<html><body style="margin:0;padding:10px;background:#fff;font:13px 'Microsoft JhengHei',sans-serif;width:1580px"><div style="font-size:18px;font-weight:bold">${esc(title)}</div>
        <div style="color:#b00;font-weight:bold;margin:2px 0 8px">${esc(DISCLAIMER)}｜象棋千秋 ${esc(R.build)}｜${esc(URL0)}｜${esc(twTime(new Date()))}｜每張下方虛線以下是腳本加的附註；太長的圖只露出上半</div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start">${cells}</div></body></html>`);
      await sleep(600); const out = await pg.screenshot({ fullPage: true }); await ctx.close();
      fs.writeFileSync(path.join(SHOTDIR, file), out);
      R.files.push({ file, kind: "拼圖", size: "", device: USE_SIZES.map(s => s.name).join("＋"), viewport: null, px: pngSize(out), build: R.build, url: URL0, takenAt: new Date().toISOString(), sha256: sha256(out), proves, rubric, lang: "", note: "由 " + list.map(f => f.file).join("、") + " 拼成", parts: list.map(f => f.file) });
      log("拼圖", file, list.length, "張");
    }
    await montage("A30-en-ui-two-sizes.png", "英文介面（設定 → 🌐 → English）：首頁、開新局選單、對局、結果視窗、設定、讀屏播報 × 兩種尺寸", pick(["en-home", "en-cpunew", "en-cpu", "en-result", "en-settings", "en-sr"]), 6,
      "英文介面主流程六個畫面、iPhone 17 Pro Max 與 iPhone SE 兩種尺寸（上排 Pro Max、下排 SE）；防爆版檢查數字見 evidence/overflow-table.md", ["P41.1", "P45.2", "P21.2"]);
    await montage("A31-net-card-ship-tilt.png", "連線狀態小卡（線上對局點訊號格）＋星槎「🌀 立體」說明卡 × 兩種尺寸", pick(["zh-netcard", "zh-shiptilt"]), 4,
      "連線狀態小卡與星槎傾斜說明卡的畫面（實拍或示意見各張 kind 與附註）", ["P22.5", "P06.3", "P64.1"]);
    await montage("A32-zh-features.png", "每日同題成績頁、色弱模式、左撇子模式、預走標記 × 兩種尺寸", pick(["zh-daily", "zh-cb", "zh-lefty", "zh-premove"]), 8,
      "第 11～13 輪新功能的畫面（每日同題的成績是腳本寫入的示範紀錄）", ["P64.1"]);
  } catch (e) { R.errors.push({ where: "main", msg: String(e.stack || e.message).slice(0, 400) }); log("主程式出錯", e.message) }
  finally {
    if (B) await B.ctx.close().catch(() => { });
    for (const k in ANA) try { await ANA[k].c.close() } catch (e) { }
    if (browser) await browser.close().catch(() => { });
    if (srv) await new Promise(r => srv.close(r));
    log("瀏覽器與伺服器已關閉");
  }
  // ---------- 寫 manifest、防爆版表 ----------
  R.finishedAt = new Date().toISOString();
  const M = { tool: R.tool, command: R.command, build: R.build, url: R.url, local: R.local, createdAt: R.createdAt, finishedAt: R.finishedAt, browser: R.browser, disclaimer: R.disclaimer, netRoot: R.netRoot, rateLimited: RATE_LIMITED, sizes: R.sizes,
    checklist: SHOTS.map(s => ({ id: s.id, name: s.name, proves: s.proves, rubric: s.rubric, files: R.files.filter(f => f.file.startsWith(`B${s.no}-${s.id}-`)).map(f => f.file + "（" + f.kind + "）") })),
    files: R.files, notes: R.notes, langTrace: R.langTrace || [], errors: R.errors };
  M.selfCheck = validateManifest(M);
  fs.writeFileSync(path.join(EVDIR, "manifest.json"), JSON.stringify(M, null, 1) + "\n");
  if (Object.keys(R.fit).length) {
    fs.writeFileSync(path.join(EVDIR, "overflow.json"), JSON.stringify({ build: R.build, url: R.url, createdAt: R.createdAt, browser: R.browser, disclaimer: R.disclaimer, sizes: R.sizes, fit: R.fit }, null, 1) + "\n");
    const cj = FIT_PAGES.map(P => `| ${P.name} | ` + R.sizes.map(s => { const f = R.fit[P.id] && R.fit[P.id][s.id]; return f && f.cjk ? `${f.cjk.n}：${f.cjk.sample.slice(0, 6).join("／").replace(/\|/g, "／")}` : "—" }).join(" | ") + " |").join("\n");
    fs.writeFileSync(path.join(EVDIR, "overflow-table.md"), `# 英文介面防爆版檢查（第 15 輪 F2）\n\n- 受測：象棋千秋 ${R.build}，${R.url}；${R.browser}；${twTime(new Date(R.createdAt))}\n- ${DISCLAIMER}\n- 指令：\`${R.command.trim()}\`（原始量測 overflow.json）\n- 怎麼量：英文模式（真的點「設定 → 頂欄 🌐 → English」）下，每頁看得到的 button、[role=button]、a、label、h1～h4、th、summary、.sec-t、.sh-t 等元素（有視窗或卡片開著時只量最上層那一個；只給讀屏軟體的隱藏區不算）。\n  判斷規則是 evidence-shots.js 的 judgeOverflow（test-evidence-shots.js 測它）：文字範圍左右超出元素框 >1px（上下 >4px）＝文字超出元素框，元素 overflow 隱藏時＝文字被截斷；出現省略號＝文字被截斷；\n  元素超出父容器（父容器可左右捲、元素是浮動定位的不算）；超出畫面（在可左右捲容器裡不算）；兩個元素文字交疊 >2×2px＝文字互相重疊；文字沒疊、但兩個可點元素的框交疊 >4×4px＝按鈕框互相重疊。\n- 有問題的頁面另有紅框標註圖 shots/B80～B86-enfit-*.png（視窗截圖，紅框編號＝下表順序；整頁的設定頁在視窗外的問題只列在表裡）。\n- 這支只檢查和回報，不改 App。\n\n## 頁面 × 尺寸 × 問題數\n\n` + fitTable(R) +
      `\n\n## 附帶：英文模式下頁面裡還有的中文（文字節點數：前幾個；含只給讀屏軟體的隱藏標籤，例如「畫裡可以點的東西：」那串；棋盤棋子字不算）\n\n| 頁面 | ${R.sizes.map(s => s.name).join(" | ")} |\n|---|${R.sizes.map(() => "---|").join("")}\n${cj}\n`);
  }
  log(`完成：${R.files.length} 張，錯誤 ${R.errors.length}，manifest 自我檢查 ${M.selfCheck.length ? M.selfCheck.join("；") : "通過"}`);
  if (R.notes.length) console.log(R.notes.join("\n"));
  if (R.errors.length) console.log(JSON.stringify(R.errors, null, 1));
})();
