// 色覺模擬掃描（評比循環第 11 輪 F3：P16.3、P55.1「色盲專用高對比樣式，並用工具模擬色覺障礙做掃描」）
//
// 做什麼：用「一個」無頭 Chrome（Playwright，channel:chrome），以 CDP Emulation.setEmulatedVisionDeficiency
//   模擬 protanopia（紅色盲）、deuteranopia（綠色盲）、tritanopia（藍色盲）、achromatopsia（全色盲）、blurredVision（視力模糊），
//   每一種都把「色弱模式」（store cbMode，m/07cb-colorblind.js）關／開各拍一次：
//   ① 固定盤面（同一盤棋，App 自己的 Board() 畫在頁面最上層）：截圖後在圖上取樣，量棋子字、紅黑兩方外圈、可走的點、上一步箭頭、
//      電腦建議箭頭的顏色，算 WCAG 對比與色差 ΔE（模擬後的像素是 Chrome 真的畫出來的，不是自己換算的）；
//      另外用同一組 Machado 2009 矩陣（m/07cb-colorblind.js cbSim）從「正常視覺」的取樣換算，跟 Chrome 的結果對照，證明換算可信。
//   ② 主要頁面（首頁、對局中、殘局、設定、雲河星槎）：各模擬截圖拼成一張；頁面上看得到的文字（按鈕、標籤）取 computed style 的字色／底色，
//      用 cbSim 換算各模擬下的 WCAG 對比，統計低於 4.5:1 的數量。
//   ③ 評語、勝負、形勢條等樣式樣本（App 的 renderStrip 畫的著法條＋報告的評語列）：各模擬截圖。
//
// 安全：開頁前 localStorage 設 xq_netRoot="xq_test"（只連測試房）；全新、用完即丟的瀏覽器設定（不碰開發者存檔）；
//   自己開本機靜態伺服器（預設埠 8822），/xiangqi-lab/ 對應 xiangqi-lab/site/，index.html 換成這次用 xiangqi-db/tools/mhtml.js 組的，
//   根目錄的 .js（local.js 等）用 xiangqi-lab/src/ 版；只開 1 個瀏覽器，結束（含出錯）一定關閉瀏覽器和伺服器。
//
// 用法（在 <專案根目錄> 下）：
//   node xiangqi-lab/tools/qa/colorblind-scan.js                （全部，約 4～6 分鐘）
//   node xiangqi-lab/tools/qa/colorblind-scan.js --no-pages     （只做固定盤面與樣式樣本，約 1 分鐘）
//   node xiangqi-lab/tools/qa/colorblind-scan.js --port 8822 --outdir xiangqi-db/tools/review_loop/rounds/r11
// 產出：<outdir>/colorblind-scan.json（原始數字）、<outdir>/colorblind-tables.md（報告用的表）、
//       <outdir>/shots/A21-colorblind-compare.png（同一盤面，紅色盲／綠色盲模擬下，色弱模式關 vs 開並排）、<outdir>/shots/B40-cb-*.png
// 檔名刻意不用 test- 開頭：不會被一般測試套件撈去跑。
"use strict";
const fs = require("fs"), path = require("path"), http = require("http"), os = require("os"), vm = require("vm");
const HOME = path.join(__dirname, "..", "..", "..");
const { chromium } = require(path.join(HOME, "claude-desktop-tools", "node_modules", "playwright"));
const { assemble } = require(path.join(HOME, "xiangqi-db", "tools", "mhtml.js"));
const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const PORT = +arg("--port", 8822), NOPAGES = argv.includes("--no-pages");
const OUTDIR = path.resolve(arg("--outdir", path.join(HOME, "xiangqi-db", "tools", "review_loop", "rounds", "r11"))), SHOTS = path.join(OUTDIR, "shots");
fs.mkdirSync(SHOTS, { recursive: true });
const URL0 = `http://127.0.0.1:${PORT}/xiangqi-lab/`;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString("zh-TW", { hour12: false }), ...a);

// ---------- 色彩公式：直接載入 App 模組裡的純函式（跟 App 同一份） ----------
const CBSRC = fs.readFileSync(path.join(HOME, "xiangqi-db", "m", "07cb-colorblind.js"), "utf8").replace(/\r\n/g, "\n");
const CB = (() => { const i = CBSRC.indexOf("#CB-PURE-BEGIN"), j = CBSRC.indexOf("/* #CB-PURE-END */"); const ctx = {}; vm.createContext(ctx);
  vm.runInContext(CBSRC.slice(CBSRC.indexOf("\n", i) + 1, j) + ";this.R={cbRgb,cbHex,cbLum,cbContrast,cbSim,CB_SIM,CB_Q,CB_COL}", ctx); return ctx.R })();
const SIMS = [["none", "正常視覺"], ["protanopia", "紅色盲"], ["deuteranopia", "綠色盲"], ["tritanopia", "藍色盲"], ["achromatopsia", "全色盲"], ["blurredVision", "視力模糊"]];
const MODES = [[false, "關"], [true, "開"]];
const r2 = v => v == null ? null : Math.round(v * 100) / 100;
const lab = c => { const l = c.map(v => { v /= 255; return v <= .04045 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4) });
  const X = (l[0] * .4124 + l[1] * .3576 + l[2] * .1805) / .95047, Y = l[0] * .2126 + l[1] * .7152 + l[2] * .0722, Z = (l[0] * .0193 + l[1] * .1192 + l[2] * .9505) / 1.08883;
  const f = t => t > .008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116; return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))] };
const dE = (a, b) => { const A = lab(a), B = lab(b); return Math.hypot(A[0] - B[0], A[1] - B[1], A[2] - B[2]) };   // CIE76 色差：≥10 一眼分得出，<5 很難分
const median = arr => { if (!arr.length) return null; const ch = k => { const s = arr.map(c => c[k]).sort((a, b) => a - b); return s[s.length >> 1] }; return [ch(0), ch(1), ch(2)] };
const L = c => CB.cbLum(c);

// ---------- 本機靜態伺服器 ----------
const SITE = path.join(HOME, "xiangqi-lab", "site"), SRC = path.join(HOME, "xiangqi-lab", "src"), PRE = "/xiangqi-lab/";
const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".css": "text/css", ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".glb": "model/gltf-binary", ".wasm": "application/wasm", ".mp3": "audio/mpeg", ".wav": "audio/wav", ".md": "text/markdown; charset=utf-8", ".woff2": "font/woff2", ".nnue": "application/octet-stream" };
function serve(html) {
  return new Promise((res, rej) => {
    const srv = http.createServer((q, r) => {
      let u = decodeURIComponent(q.url.split("?")[0]);
      if (!u.startsWith(PRE)) { r.writeHead(404); return r.end() }
      u = u.slice(PRE.length) || "index.html";
      if (u === "index.html") { r.writeHead(200, { "Content-Type": MIME[".html"], "Cache-Control": "no-store" }); return r.end(html) }
      let f = path.join(SITE, u);
      if (!u.includes("/") && fs.existsSync(path.join(SRC, u))) f = path.join(SRC, u);
      if (!path.resolve(f).startsWith(path.resolve(SITE)) && !path.resolve(f).startsWith(path.resolve(SRC))) { r.writeHead(403); return r.end() }
      fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); return r.end() } r.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream", "Cache-Control": "no-store" }); r.end(b) });
    });
    srv.on("error", rej); srv.listen(PORT, "127.0.0.1", () => res(srv));
  });
}

// ---------- App 裡的小工具 ----------
async function waitReady(page) {
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const on = await page.evaluate(() => { const o = document.getElementById("preov"); return !!(o && getComputedStyle(o).display !== "none" && o.getBoundingClientRect().height > 0) }).catch(() => false); if (!on) return; await sleep(700) }
  await page.evaluate(() => { const b = document.querySelector("#preov .pre-skip"); if (b) b.click() }).catch(() => { }); await sleep(1500);
}
async function gotoHash(page, h, wait = 3000) {
  await page.evaluate(h => { try { if (typeof closeSheet === "function") closeSheet() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()); const o = document.getElementById("cbScanOv"); if (o) o.remove(); document.querySelectorAll(".tmx-bub").forEach(x => x.remove()); if (location.hash === h && typeof route === "function") route(); else location.hash = h }, h);
  await sleep(800); await waitReady(page); await sleep(wait);
}
const setMode = (page, on) => page.evaluate(on => { store.set("cbMode", on); return { ret: cbApply(), attr: document.documentElement.hasAttribute("data-cbm"), marks: document.querySelectorAll("[data-cbx]").length } }, on);
async function boardPt(page, c, r) {
  return page.evaluate(([c, r]) => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620" && s.getBoundingClientRect().width > 50); if (!svg) return null; const m = svg.getScreenCTM(); const f = !!(svg._o && svg._o.flip); const X = 40 + (f ? 8 - c : c) * 60, Y = 40 + (f ? 9 - r : r) * 60; return { x: m.a * X + m.c * Y + m.e, y: m.b * X + m.d * Y + m.f } }, [c, r]);
}

// ---------- 固定盤面（頁面內執行）：App 自己的 Board() 畫在最上層 ----------
// sel：炮二平五之後，黑方選起 b7 的砲（可走空格＋可吃 b0 的傌）、電腦建議 馬2進3（b9→c7）
// check：炮二平五、士4進5、炮五進四（吃中卒，將軍）
async function harness(page, scn) {
  return page.evaluate(async scn => {
    const old = document.getElementById("cbScanOv"); if (old) old.remove();
    const ov = document.createElement("div"); ov.id = "cbScanOv";
    ov.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:var(--bg,#F3E7D7);display:flex;justify-content:center;align-items:flex-start;padding-top:12px";
    const C = window.XQCore, b0 = C.parseFen(C.START.split(" ")[0]), mk = C.make;
    let board, o;
    if (scn === "sel") { board = mk(b0, 70, 67); const sel = 19; o = { last: { f: 70, t: 67 }, sel, targets: C.legal(board, "b").filter(m => m[0] === sel).map(m => m[1]), sugg: [{ f: 1, t: 20 }], anim: false } }
    else { board = mk(mk(mk(b0, 70, 67), 3, 13), 67, 31); o = { last: { f: 67, t: 31 }, check: 4, anim: false } }
    const B = Board(sq => { }); B.svg.style.cssText = "width:370px;height:auto;display:block";
    const box = document.createElement("div"); box.id = "cbScanBd"; box.style.cssText = "background:var(--bg,#F3E7D7);padding:4px"; box.append(B.svg); ov.append(box); document.body.append(ov);
    B.draw(board, o);
    await Promise.all([...B.svg.querySelectorAll("image")].map(im => { const i = new Image(); i.src = im.getAttribute("href"); return i.decode().catch(() => { }) }));
    await new Promise(r => setTimeout(r, 400));
    const m = B.svg.getScreenCTM(), rb = box.getBoundingClientRect();
    return { ctm: [m.a, m.b, m.c, m.d, m.e, m.f], clip: { x: Math.floor(rb.left), y: Math.floor(rb.top), width: Math.ceil(rb.width), height: Math.ceil(rb.height) }, o: { last: o.last, sel: o.sel, targets: o.targets || [], check: o.check }, board,
      marks: document.querySelectorAll("#cbScanOv [data-cbx]").length, cbs: [...document.querySelectorAll("#cbScanOv [data-cbs]")].map(g => g.getAttribute("data-cbs")).join("") };
  }, scn);
}
// 取樣點（CSS px）：以棋盤格中心為圓心的圓盤／圓環、沿線段的帶狀
function samplePts(H) {
  const [a, b, c, d, e, f] = H.ctm, P = (x, y) => [a * x + c * y + e - H.clip.x, b * x + d * y + f - H.clip.y];
  const XY = i => [40 + (i % 9) * 60, 40 + (i / 9 | 0) * 60], st = .7, out = {};
  const disc = (i, r0, r1, skipAxis) => { const [cx, cy] = XY(i), pts = []; for (let y = -r1; y <= r1; y += st) for (let x = -r1; x <= r1; x += st) { const r = Math.hypot(x, y); if (r < r0 || r > r1) continue; if (skipAxis && (Math.abs(x) < 3.5 || Math.abs(y) < 3.5)) continue; pts.push(P(cx + x, cy + y)) } return pts };
  const band = (i, j, off0, off1, t0 = .38, t1 = .62) => { const [x1, y1] = XY(i), [x2, y2] = XY(j), len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len, pts = [];
    for (let t = t0; t <= t1; t += .01) for (let s = off0; s <= off1; s += st) for (const sg of off0 ? [-1, 1] : [1]) pts.push(P(x1 + (x2 - x1) * t - uy * s * sg, y1 + (y2 - y1) * t + ux * s * sg)); return pts };
  out.redDisc = disc(89, 0, 18); out.blkDisc = disc(8, 0, 18);
  out.redRim = disc(89, 25.5, 29.5); out.blkRim = disc(8, 25.5, 29.5);   // 黑環畫在棋子圖外緣（整顆是圖的棋子半徑 30）
  if (H.o.sel != null) {
    const dot = H.o.targets.find(t => !H.board[t] && t === 28) ?? H.o.targets.find(t => !H.board[t]);
    out.dot = disc(dot, 0, 5); out.dotBg = disc(dot, 15, 24, true);
    out.lastArrow = band(H.o.last.f, H.o.last.t, 0, 2.5); out.lastBg = band(H.o.last.f, H.o.last.t, 13, 16);
    out.lastEdgeK = band(H.o.last.f, H.o.last.t, 6, 7); out.lastEdgeW = band(H.o.last.f, H.o.last.t, 8, 8.7);   // 色弱模式：箭頭外的黑邊、白邊
    out.suggArrow = band(1, 20, 0, 2, .45, .62);
  }
  return out;
}
const ANALYZE = async ([b64, specs, dsf]) => {
  const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const D = g.getImageData(0, 0, c.width, c.height).data, out = {};
  for (const k in specs) out[k] = specs[k].map(([x, y]) => { const X = Math.min(c.width - 1, Math.max(0, Math.round(x * dsf))), Y = Math.min(c.height - 1, Math.max(0, Math.round(y * dsf))), i = (Y * c.width + X) * 4; return [D[i], D[i + 1], D[i + 2]] });
  return out;
};
// 棋子字／棋面分群：用「正常視覺」那張，亮度比棋面暗一半以上的點＝字，亮度在棋面 85% 以上＝棋面（模擬後的圖用同一批點）
function inkFace(norm) { const l = norm.map(L), s = l.slice().sort((a, b) => a - b), face = s[Math.floor(s.length * .8)]; const ink = [], fc = []; l.forEach((v, i) => { if (v < face * .5) ink.push(i); else if (v > face * .85) fc.push(i) }); return { ink, fc } }
function boardMetrics(raw, norm) {
  const M = {}, pick = (arr, idx) => idx.map(i => arr[i]);
  const R = inkFace(norm.redDisc), K = inkFace(norm.blkDisc);
  M.redInk = median(pick(raw.redDisc, R.ink)); M.redFace = median(pick(raw.redDisc, R.fc));
  M.blkInk = median(pick(raw.blkDisc, K.ink)); M.blkFace = median(pick(raw.blkDisc, K.fc));
  M.redRim = median(raw.redRim); M.blkRim = median(raw.blkRim);
  if (raw.dot) { M.dot = median(raw.dot); M.dotBg = median(raw.dotBg); M.last = median(raw.lastArrow); M.lastBg = median(raw.lastBg); M.sugg = median(raw.suggArrow);
    const K = median(raw.lastEdgeK), Wh = median(raw.lastEdgeW); M.lastEdge = CB.cbContrast(K, M.lastBg) >= CB.cbContrast(Wh, M.lastBg) ? K : Wh }
  return M;
}
const PAIRS = [
  ["redInk", "redFace", "紅子字 vs 棋面", "c"], ["blkInk", "blkFace", "黑子字 vs 棋面", "c"],
  ["redInk", "blkInk", "紅字 vs 黑字（只靠字色分紅黑）", "cd"], ["redRim", "blkRim", "紅子外圈 vs 黑子外圈（色弱模式的黑環）", "cd"],
  ["dot", "dotBg", "可走的點 vs 棋盤", "c"], ["last", "lastBg", "上一步箭頭 vs 棋盤", "c"], ["lastEdge", "lastBg", "上一步箭頭外緣 vs 棋盤（黑邊、白邊取高者）", "c"],
  ["last", "sugg", "上一步箭頭 vs 電腦建議箭頭", "cd"], ["dot", "last", "可走的點 vs 上一步箭頭", "cd"],
];

// ---------- 頁面文字：computed style 的字色／底色（頁面內執行） ----------
function textColorsInPage() {
  const W = innerWidth, H = innerHeight, rgb = s => { const m = /rgba?\(([^)]+)\)/.exec(s || ""); if (!m) return null; const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1] };
  const out = [], seen = new Set();
  const els = [...document.querySelectorAll("button,.btn,a,.chip,.q,h1,h2,h3,.sec-t,label,.tab,.nm b,.muted,p,span,b")];
  for (const e of els) {
    if (out.length >= 80) break; if (e.closest("svg") || e.closest("#cbScanOv")) continue;
    const t = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.nodeValue).join("").trim(); if (!t || t.length < 1) continue;
    const r = e.getBoundingClientRect(); if (r.width < 4 || r.height < 6 || r.bottom < 0 || r.top > H || r.right < 0 || r.left > W) continue;
    const cs = getComputedStyle(e); if (cs.visibility === "hidden" || +cs.opacity < .5) continue;
    let srOnly = false; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if ((s.clipPath && s.clipPath !== "none") || (s.clip && s.clip !== "auto") || +s.opacity < .3) { srOnly = true; break } }
    if (srOnly) continue;   // 只給螢幕報讀念的隱藏文字（.ax-sr、.sci-sr：clip-path 裁成 1 像素）不在畫面上，不算
    const fg = rgb(cs.color); if (!fg || fg[3] < .3) continue;
    let bg = null, img = false;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); if (s.backgroundImage && s.backgroundImage !== "none") { img = true; break } const c = rgb(s.backgroundColor); if (c && c[3] > .9) { bg = c; break } }
    if (img || !bg) continue;   // 圖片或漸層底：無法單用色碼算對比，略過（截圖另看）
    const key = t.slice(0, 12) + fg.join() + bg.join(); if (seen.has(key)) continue; seen.add(key);
    out.push({ t: t.slice(0, 16), fg, bg, fs: parseFloat(cs.fontSize), fw: +cs.fontWeight || 400, btn: !!e.closest("button,.btn") });
  }
  return out;
}
function textStats(list) {
  const res = {};
  for (const [sim] of SIMS) {
    if (sim === "blurredVision") continue;
    const cs = list.map(x => { const a = x.fg[3], fg = [0, 1, 2].map(k => x.fg[k] * a + x.bg[k] * (1 - a)), F = CB.cbSim(fg, sim), B = CB.cbSim(x.bg.slice(0, 3), sim); const large = x.fs >= 24 || (x.fs >= 18.66 && x.fw >= 700); return { c: CB.cbContrast(F, B), need: large ? 3 : 4.5, t: x.t } });
    const s = cs.map(x => x.c).sort((a, b) => a - b);
    res[sim] = { n: cs.length, min: r2(s[0]), p10: r2(s[Math.floor(s.length * .1)]), med: r2(s[s.length >> 1]), fail: cs.filter(x => x.c < x.need).length, worst: cs.filter(x => x.c < x.need).sort((a, b) => a.c - b.c).slice(0, 3).map(x => `${x.t}（${r2(x.c)}）`) };
  }
  return res;
}

// ---------- 拼圖 ----------
async function composite(ana, file, title, rows, cols, cells, cellW) {
  const html = `<html><body style="margin:0;background:#fff;font:14px/1.4 'Microsoft JhengHei','Noto Sans TC',sans-serif;color:#111">
    <div style="padding:10px 12px;background:#1b1b1b;color:#fff;font-weight:700;font-size:16px">${title}</div>
    <table style="border-collapse:collapse;margin:8px"><tr><td></td>${cols.map(c => `<td style="text-align:center;font-weight:700;padding:4px">${c}</td>`).join("")}</tr>
    ${rows.map((r, i) => `<tr><td style="font-weight:700;padding:4px 8px;white-space:nowrap;vertical-align:middle">${r}</td>${cols.map((c, j) => `<td style="padding:4px;vertical-align:top"><img src="data:image/png;base64,${cells[i][j]}" style="width:${cellW}px;display:block;border:1px solid #999"></td>`).join("")}</tr>`).join("")}
    </table></body></html>`;
  await ana.setViewportSize({ width: 40 + cols.length * (cellW + 10) + 120, height: 400 });
  await ana.setContent(html); await sleep(400); await ana.screenshot({ path: file, fullPage: true });
}

// ================= 主程式 =================
(async () => {
  const R = { tool: "xiangqi-lab/tools/qa/colorblind-scan.js", startedAt: new Date().toISOString(), url: URL0, browser: "", sims: SIMS, board: {}, crossCheck: {}, pages: {}, labels: {}, toggles: [], errors: [] };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "xq-cbscan-"));
  // 跟 build-site.js 第 4 步一樣把手機版轉成離線版：相對路徑圖示、拿掉 Google 字型、前面插 core.js／engine.js／local.js／net.js／zh.js
  let html = assemble();
  html = html.split(`<link rel="manifest" href="/m/manifest.json"><link rel="icon" href="/m/icon.svg"><link rel="apple-touch-icon" href="/m/icon-180.png">`).join(`<link rel="manifest" href="manifest.json"><link rel="icon" href="icon.svg"><link rel="apple-touch-icon" href="icon-180.png">`);
  html = html.replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\n?/, "");
  if (!html.includes(`<script>\n"use strict";`)) throw new Error("組好的頁面找不到主程式開頭，build-site.js 的替換規則可能改了");
  html = html.split(`<script>\n"use strict";`).join(`<script>window.XQ_OFFLINE=true;window.XQ_BUILD="cbscan";</script>\n<script src="core.js"></script>\n<script src="engine.js"></script>\n<script src="local.js"></script>\n<script src="net.js"></script>\n<script src="zh.js"></script>\n<script>\n"use strict";`);
  fs.writeFileSync(path.join(tmp, "index.html"), html);
  const srv = await serve(html); log("伺服器", URL0);
  let browser = null;
  try {
    browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
    R.browser = "Chrome " + browser.version() + "（headless）";
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, serviceWorkers: "block", locale: "zh-TW", reducedMotion: "reduce" });
    await ctx.addInitScript(() => {
      try {
        localStorage.setItem("xq_netRoot", JSON.stringify("xq_test"));   // 測試房：絕不進正式大廳
        const S = (k, v) => { if (localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(v)) };
        S("m_onboard1", true); S("m_firstWin", true); S("xq_me", { id: "qacb" + Math.random().toString(36).slice(2, 8), name: "色覺測試" });
        S("m_focusBoard", true); S("m_cbMode", false);   // 平面棋盤（色弱記號只做在平面棋盤）；色弱模式先關
      } catch (e) { }
    });
    const page = await ctx.newPage(); page.setDefaultTimeout(10000);
    page.on("pageerror", e => R.errors.push(String(e.message).slice(0, 200)));
    page.on("dialog", d => d.dismiss().catch(() => { }));
    const cdp = await ctx.newCDPSession(page);
    const ana = await ctx.newPage();   // 分析／拼圖用（不設色覺模擬）
    const sim = async t => { await cdp.send("Emulation.setEmulatedVisionDeficiency", { type: t }); await sleep(180) };
    await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded", timeout: 60000 }); await sleep(3000); await waitReady(page); await sleep(3000);
    R.version = await page.evaluate(() => window.XQ_BUILD || "").catch(() => "");
    R.hasModule = await page.evaluate(() => typeof cbApply === "function" && !!document.getElementById("cbCss"));

    // ① 固定盤面
    const shotsSel = {}, shotsChk = {};
    for (const [on, ml] of MODES) {
      R.toggles.push({ on, ...(await setMode(page, on)) });
      for (const scn of ["sel", "check"]) {
        const H = await harness(page, scn); const specs = scn === "sel" ? samplePts(H) : null;
        R.board[scn + "_" + ml] = { marks: H.marks, sides: H.cbs };
        const raw = {};
        for (const [t] of SIMS) {
          await sim(t); const buf = await page.screenshot({ clip: H.clip }); const b64 = buf.toString("base64");
          (scn === "sel" ? shotsSel : shotsChk)[t + ml] = b64;
          if (specs) raw[t] = await ana.evaluate(ANALYZE, [b64, specs, 2]);
        }
        await sim("none");
        if (!specs) continue;
        const per = {};
        for (const [t] of SIMS) per[t] = boardMetrics(raw[t], raw.none);
        const rows = {};
        for (const [a, b, name, kind] of PAIRS) {
          rows[name] = {};
          for (const [t] of SIMS) { const A = per[t][a], B = per[t][b]; rows[name][t] = A && B ? { c: r2(CB.cbContrast(A, B)), dE: kind.includes("d") ? Math.round(dE(A, B)) : undefined, a: CB.cbHex(A), b: CB.cbHex(B) } : null }
        }
        R.board["sel_" + ml].pairs = rows;
        // 換算對照：正常視覺取樣 → cbSim 矩陣 vs Chrome 真的模擬
        const diffs = [];
        for (const [t] of SIMS.slice(1, 5)) for (const [a, b] of PAIRS) { const A0 = per.none[a], B0 = per.none[b], A = per[t][a], B = per[t][b]; if (!A0 || !B0 || !A || !B) continue; diffs.push(Math.abs(CB.cbContrast(CB.cbSim(A0, t), CB.cbSim(B0, t)) - CB.cbContrast(A, B))) }
        R.crossCheck[ml] = { n: diffs.length, maxAbs: r2(Math.max(...diffs)), meanAbs: r2(diffs.reduce((s, v) => s + v, 0) / diffs.length) };
      }
    }
    await page.evaluate(() => { const o = document.getElementById("cbScanOv"); if (o) o.remove() });
    log("固定盤面完成", JSON.stringify(R.crossCheck));
    // A21：紅色盲／綠色盲 × 關／開
    await composite(ana, path.join(SHOTS, "A21-colorblind-compare.png"),
      "同一盤面：紅綠色盲模擬（Chrome setEmulatedVisionDeficiency）下，色弱模式 關 vs 開。開：黑子加黑環、可走點＝黃點黑邊、可吃＝四角框、上一步改朱橘並描黑白邊（電腦建議維持藍）",
      ["紅色盲 protanopia", "綠色盲 deuteranopia"], ["色弱模式 關", "色弱模式 開"],
      [[shotsSel.protanopia關, shotsSel.protanopia開], [shotsSel.deuteranopia關, shotsSel.deuteranopia開]], 380);
    await composite(ana, path.join(SHOTS, "B40-cb-board-allsims.png"), "固定盤面（選子、可走、可吃、上一步、電腦建議）：六種視覺 × 色弱模式關／開",
      MODES.map(m => "色弱模式 " + m[1]), SIMS.map(s => s[1]), MODES.map(([, ml]) => SIMS.map(([t]) => shotsSel[t + ml])), 250);
    await composite(ana, path.join(SHOTS, "B40-cb-check.png"), "將軍盤面（炮五進四將軍）：六種視覺 × 色弱模式關／開。開：被將軍的將右上角黃底「將」字牌、外圈加粗",
      MODES.map(m => "色弱模式 " + m[1]), SIMS.map(s => s[1]), MODES.map(([, ml]) => SIMS.map(([t]) => shotsChk[t + ml])), 250);

    // ③ 評語、勝負等樣式樣本
    {
      const cells = [[], []];
      for (const [on, ml] of MODES) {
        await setMode(page, on);
        const info = await page.evaluate(() => {
          const old = document.getElementById("cbScanOv"); if (old) old.remove();
          const ov = document.createElement("div"); ov.id = "cbScanOv"; ov.style.cssText = "position:fixed;inset:0;z-index:2147483000;background:var(--bg);padding:12px;color:var(--ink);font-family:var(--sans)";
          ov.innerHTML = `<div class="sec-t">著法條評語</div><div class="strip" id="cbS1" style="flex-wrap:wrap"></div>
            <div class="sec-t">報告評語統計</div><div class="card"><div class="rp-q">${["妙著", "正著", "穩著", "緩著", "失著", "敗著"].map((q, i) => `<span style="color:${QC[q]}"><b>${[1, 9, 4, 3, 2, 1][i]}</b>${q}</span>`).join("")}</div>
            <div class="rp-t good"><b>第 12 步</b>好棋：抓到對方空門</div><div class="rp-t bad"><b>第 21 步</b>失誤：漏看對方炮</div></div>
            <div class="sec-t">形勢條（紅方佔優）</div><div class="evline" style="margin:8px 0"><div style="width:68%"></div></div>
            <div class="sec-t">戰績</div><div class="card st"><span class="w">勝 12</span>・<span class="l">負 5</span>・<span class="d">和 2</span></div>`;
          document.body.append(ov);
          renderStrip(ov.querySelector("#cbS1"), ["炮二平五", "馬8進7", "傌二進三", "車9平8", "俥一平二", "砲8進4"].map((cn, i) => ({ cn, q: ["妙著", "正著", "穩著", "緩著", "失著", "敗著"][i], by: i % 2 ? "b" : "r" })), -1);
          const rgb = s => (/rgba?\(([^)]+)\)/.exec(s) || [, ""])[1].split(/[ ,/]+/).filter(Boolean).slice(0, 3).map(Number);
          const qs = [...ov.querySelectorAll(".chip .q")].map(e => ({ q: e.textContent, fg: rgb(getComputedStyle(e).color), bg: rgb(getComputedStyle(e.closest(".chip")).backgroundColor), before: getComputedStyle(e, "::before").content }));
          return { qs };
        });
        await sleep(300);
        R.labels[ml] = {};
        for (const [t] of SIMS) { await sim(t); cells[on ? 1 : 0].push((await page.screenshot({ clip: { x: 0, y: 0, width: 390, height: 420 } })).toString("base64")) }
        await sim("none");
        for (const [t] of SIMS) { if (t === "blurredVision") continue; const Q = {}; for (const x of info.qs) { const F = CB.cbSim(x.fg, t), B = CB.cbSim(x.bg, t); Q[x.q] = { c: r2(CB.cbContrast(F, B)), sym: x.before && x.before !== "none" && x.before !== "normal" ? x.before.replace(/"/g, "") : "" } }
          const g = info.qs.find(x => x.q === "正著"), b = info.qs.find(x => x.q === "失著");
          R.labels[ml][t] = { q: Q, goodBadDE: g && b ? Math.round(dE(CB.cbSim(g.fg, t), CB.cbSim(b.fg, t))) : null } }
      }
      await page.evaluate(() => { const o = document.getElementById("cbScanOv"); if (o) o.remove(); document.querySelectorAll(".tmx-bub").forEach(x => x.remove()) });   // 著法條第一次出現評語會冒白話泡泡（01-board tmxFirst），樣本拆掉時一起拿掉
      await composite(ana, path.join(SHOTS, "B40-cb-labels.png"), "評語（妙著～敗著）、好壞提示、形勢條、勝負：六種視覺 × 色弱模式關／開。開：評語加 ★✓○△✗✗✗ 符號、好＝藍、壞＝橘，形勢條與失誤長條加斜紋",
        MODES.map(m => "色弱模式 " + m[1]), SIMS.map(s => s[1]), cells, 250);
      log("樣式樣本完成");
    }

    // ② 主要頁面
    if (!NOPAGES) {
      const PAGES = [["home", "首頁", "#/"], ["cpu", "對局中（挑戰電腦，紅方炮二平五之後）", "#/cpu", "move"], ["canju", "殘局（一盞茶）", "#/canju", "#cjm_sip"], ["settings", "設定", "#/settings"], ["ship", "雲河星槎", "#/adventure"]];
      for (const [id, name, hash, setup] of PAGES) {
        try {
          const cells = [[], []]; R.pages[id] = { name, hash, modes: {} };
          for (const [on, ml] of MODES) {
            await setMode(page, on);
            await gotoHash(page, hash, 3000);
            if (setup === "move") {
              const a = await boardPt(page, 7, 7), b = await boardPt(page, 4, 7);
              if (a && b) { await page.mouse.click(a.x, a.y); await sleep(500); await page.mouse.click(b.x, b.y); await sleep(6000) }
            } else if (setup) { const el = page.locator(setup).first(); const bb = await el.boundingBox().catch(() => null); if (bb) { await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(3500) } }
            const st = await page.evaluate(() => ({ marks: document.querySelectorAll("[data-cbx]").length, boards: [...document.querySelectorAll("svg")].filter(s => s._b && s.getBoundingClientRect().width > 50).length, attr: document.documentElement.hasAttribute("data-cbm") }));
            const tx = await page.evaluate(textColorsInPage);
            R.pages[id].modes[ml] = { ...st, text: textStats(tx) };
            for (const [t] of SIMS) { await sim(t); cells[on ? 1 : 0].push((await page.screenshot()).toString("base64")) }
            await sim("none");
          }
          await composite(ana, path.join(SHOTS, `B40-cb-${id}.png`), `${name}：六種視覺 × 色弱模式關／開（390×844）`, MODES.map(m => "色弱模式 " + m[1]), SIMS.map(s => s[1]), cells, 180);
          log("頁面完成", id, JSON.stringify(R.pages[id].modes.開 && R.pages[id].modes.開.text.deuteranopia));
        } catch (e) { R.errors.push(id + "：" + e.message.slice(0, 160)) }
      }
    }
    await setMode(page, false);
  } catch (e) { R.errors.push("主流程：" + (e.stack || e.message).slice(0, 400)); console.error(e) }
  finally {
    if (browser) await browser.close().catch(() => { });
    await new Promise(r => srv.close(r));
    try { fs.rmSync(tmp, { recursive: true, force: true }) } catch (e) { }
    log("瀏覽器與伺服器已關閉");
  }
  R.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUTDIR, "colorblind-scan.json"), JSON.stringify(R, null, 1));
  fs.writeFileSync(path.join(OUTDIR, "colorblind-tables.md"), tables(R));
  log("寫好", path.join(OUTDIR, "colorblind-scan.json"), "錯誤", R.errors.length);
})();

// ---------- 報告用的表 ----------
function tables(R) {
  const S = SIMS.map(s => s[1]), out = [];
  const sel = k => R.board["sel_" + k] && R.board["sel_" + k].pairs;
  out.push("### 固定盤面：各模擬下的對比（關 → 開；括號是 ΔE 色差）", "", "| 項目 | " + S.join(" | ") + " |", "|---|" + S.map(() => "---").join("|") + "|");
  if (sel("關") && sel("開")) for (const [, , name, kind] of PAIRS) {
    const cell = t => { const a = sel("關")[name][t], b = sel("開")[name][t]; const f = x => x ? x.c + (kind.includes("d") ? `（${x.dE}）` : "") : "—"; return `${f(a)} → ${f(b)}` };
    out.push(`| ${name} | ${SIMS.map(([t]) => cell(t)).join(" | ")} |`);
  }
  out.push("", "### 評語文字（著法條）對比與符號（關 → 開）", "", "| 評等 | " + S.slice(0, 5).join(" | ") + " | 開：符號 |", "|---|" + S.slice(0, 5).map(() => "---").join("|") + "|---|");
  for (const q of ["妙著", "正著", "穩著", "緩著", "失著", "敗著"]) { const g = (m, t) => R.labels[m] && R.labels[m][t] && R.labels[m][t].q[q]; out.push(`| ${q} | ${SIMS.slice(0, 5).map(([t]) => `${(g("關", t) || {}).c ?? "—"} → ${(g("開", t) || {}).c ?? "—"}`).join(" | ")} | ${(g("開", "none") || {}).sym || "—"} |`) }
  out.push(`| 正著 vs 失著 色差 ΔE | ${SIMS.slice(0, 5).map(([t]) => `${(R.labels.關 && R.labels.關[t] || {}).goodBadDE ?? "—"} → ${(R.labels.開 && R.labels.開[t] || {}).goodBadDE ?? "—"}`).join(" | ")} | |`);
  if (Object.keys(R.pages).length) {
    out.push("", "### 主要頁面文字（computed style 換算；低於 AA 的數量／最低對比，關 → 開）", "", "| 頁面 | 取樣數 | " + S.slice(0, 5).join(" | ") + " |", "|---|---|" + S.slice(0, 5).map(() => "---").join("|") + "|");
    for (const id in R.pages) { const P = R.pages[id], a = P.modes.關, b = P.modes.開; if (!a || !b) continue;
      out.push(`| ${P.name} | ${a.text.none.n}／${b.text.none.n} | ${SIMS.slice(0, 5).map(([t]) => `${a.text[t].fail}（${a.text[t].min}）→ ${b.text[t].fail}（${b.text[t].min}）`).join(" | ")} |`) }
  }
  out.push("", `換算對照（正常視覺取樣用 Machado 矩陣換算 vs Chrome 實際模擬）：關 平均差 ${R.crossCheck.關 && R.crossCheck.關.meanAbs}、最大差 ${R.crossCheck.關 && R.crossCheck.關.maxAbs}；開 平均差 ${R.crossCheck.開 && R.crossCheck.開.meanAbs}、最大差 ${R.crossCheck.開 && R.crossCheck.開.maxAbs}（對比值的絕對差，${R.crossCheck.關 && R.crossCheck.關.n} 組）。`);
  return out.join("\n") + "\n";
}
