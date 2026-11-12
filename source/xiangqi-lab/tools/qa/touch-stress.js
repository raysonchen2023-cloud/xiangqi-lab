// 小螢幕觸控壓力測試（第 9 輪外部評審 ChatGPT 要求：邊緣按鈕、單手熱區、誤觸復原、手勢衝突；證據＝自動化點選座標矩陣＋失敗案例截圖）
//
// 做什麼：用「一個」無頭 Chrome（Playwright，channel:chrome），依序模擬三種手機尺寸（isMobile＋hasTouch），
//   ① 點選目標尺寸：各主要頁面上看得到、點得到的可點元素量 getBoundingClientRect，列出小於 44×44 CSS px 的、相鄰間距小於 8px 的
//   ② 邊緣熱區：離左右邊緣 16px 內的小目標；用 CDP Emulation.setSafeAreaInsetsOverride 模擬瀏海／Home 條安全區，列出被蓋到的
//   ③ 單手拇指熱區：每頁主要動作落在畫面上／中／下三分之一的統計
//   ④ 座標矩陣：首頁與對局棋盤每 24px 一點，用 elementsFromPoint 記錄每點命中誰（靜態，三種尺寸都做）；
//      iPhone SE 尺寸再對首頁每 48px 真的點一下（touchscreen.tap）、對棋盤的己方棋子做偏移點選，記錄反應
//   ⑤ 誤觸復原：認輸、離開對局、新局、看答案、刪除全部資料等破壞性動作有沒有確認框（實測＋原始碼對照）
//   ⑥ 手勢衝突：拖曳棋子 vs 捲動、左右緣滑入、雙指縮放（2D 棋盤、首頁水墨圖）、3D 場景（能載就測）
//
// 安全：開頁前 localStorage 設 xq_netRoot="xq_test"（只會連測試房，絕不進正式大廳）；每個尺寸用全新、用完即丟的瀏覽器設定
//   （不碰開發者真正的存檔）；受測網址是本機，App 在本機與 navigator.webdriver 時不送玩家紀錄。只開 1 個瀏覽器，結束一定關閉。
//
// 用法（在 <專案根目錄> 下）：
//   node xiangqi-lab/tools/qa/touch-stress.js                 （三種尺寸全跑，約 8～12 分鐘）
//   node xiangqi-lab/tools/qa/touch-stress.js --size se       （只跑 iPhone SE；se／pm／and 可用逗號接）
//   node xiangqi-lab/tools/qa/touch-stress.js --url http://localhost:8803/xiangqi-lab/   （換受測網址，預設就是這個）
//   node xiangqi-lab/tools/qa/touch-stress.js --no3d          （不載 3D 場景）
//   node xiangqi-lab/tools/qa/touch-stress.js --no-tap        （不做真點選矩陣，只做靜態量測，約 3 分鐘）
//   node xiangqi-lab/tools/qa/touch-stress.js --outdir xiangqi-db/tools/review_loop/rounds/r11 --shot-tag after
//                                                             （第 11 輪修正後重跑：結果寫到 r11，截圖叫 B30～B36-touch-after-*.png）
//   node xiangqi-lab/tools/qa/touch-stress.js --outdir xiangqi-db/tools/review_loop/rounds/r12 --shot-tag after --shot-num 50 --lefty
//                                                             （第 12 輪：截圖 B50～B56；--lefty 另開左撇子模式（m_lefty=true）重量一次，
//                                                              主要動作算右手／左手拇指熱區（thumb()），出 A22-lefty-thumb.png 對照圖與 B57～B59 左撇子細節圖；
//                                                              --only-lefty 只跑左撇子那一段；--shot-num 改 B 開頭的編號）
// 產出：xiangqi-db/tools/review_loop/rounds/r10/touch-stress.json（原始結果）、touch-stress-tables.md（統計表，報告引用）、
//       shots/B20～B25-touch-*.png（失敗案例紅框截圖）、shots/A10-touch-matrix.png（座標矩陣熱點圖）
// 檔名刻意不用 test- 開頭：不會被一般測試套件撈去跑。
"use strict";
// ---------- 第 12 輪：單手拇指熱區模型（左右手對稱） ----------
// 拇指根部（轉軸）在螢幕下緣外 40px、右手在右緣、左手在左緣。距離＝√((橫向差×1.25)²＋縱向差²)，橫向乘 1.25 是因為拇指往掌心那側（橫越螢幕）比往上伸吃力。
// ≤450 CSS px＝易及、≤620＝尚可、其餘＝難及。CSS px 在手機上大約是固定的實體長度，所以大手機上方會變難及（符合實際）。
// 參考 Steven Hoober 的拇指熱區圖（下方中間最好按、對角的上方角落最難），係數是估的，不是量測手掌的結果。
function thumb(cx, cy, W, H, hand) {
  const px = hand === "L" ? 0 : W, py = H + 40, d = Math.hypot(Math.abs(cx - px) * 1.25, py - cy);
  return { d: Math.round(d), z: d <= 450 ? "易及" : d <= 620 ? "尚可" : "難及" };
}
module.exports = { thumb };
if (require.main !== module) return;
const fs = require("fs"), path = require("path");
const HOME = path.join(__dirname, "..", "..", "..");
const { chromium } = require(path.join(HOME, "claude-desktop-tools", "node_modules", "playwright"));
const argv = process.argv.slice(2), arg = (k, d) => argv.includes(k) ? argv[argv.indexOf(k) + 1] : d;
const URL0 = arg("--url", "http://localhost:8803/xiangqi-lab/");
const NO3D = argv.includes("--no3d"), NOTAP = argv.includes("--no-tap");
const OUTDIR = arg("--outdir") ? path.resolve(arg("--outdir")) : path.join(HOME, "xiangqi-db", "tools", "review_loop", "rounds", "r10"), SHOTS = path.join(OUTDIR, "shots");
const TAG = arg("--shot-tag", "");   // 修正後重跑：截圖改名 B30～B36-touch-<TAG>-*.png（不蓋掉第 10 輪的 B20～B25、A10）
const SHOTNUM = +arg("--shot-num", 30);   // 第 12 輪：--shot-num 50 → B50～B56
const ONLY_LEFTY = argv.includes("--only-lefty"), LEFTY = ONLY_LEFTY || argv.includes("--lefty"), LEFTY_SHOT = arg("--lefty-shot", "A22-lefty-thumb");   // 第 12 輪：另開「左撇子模式」（m_lefty=true）重量一次，比左右手拇指熱區
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toLocaleTimeString("zh-TW", { hour12: false }), ...a);

// ---------- 三種尺寸（安全區：iPhone 以加到主畫面的 PWA 全螢幕模式估計；Android 瀏覽器內為 0） ----------
const SIZES = [
  { id: "se", name: "iPhone SE（375×667）", w: 375, h: 667, dsf: 2, inset: { top: 20, bottom: 0, left: 0, right: 0 } },
  { id: "pm", name: "iPhone 17 Pro Max（440×956）", w: 440, h: 956, dsf: 3, inset: { top: 62, bottom: 34, left: 0, right: 0 } },
  { id: "and", name: "Android 小機（360×740）", w: 360, h: 740, dsf: 3, inset: { top: 0, bottom: 0, left: 0, right: 0 } },
].filter(s => !arg("--size") || arg("--size").split(",").includes(s.id));

// ---------- 受測頁面；prim＝這頁的主要動作（按文字比對），拇指熱區統計用 ----------
const PAGES0 = [
  { id: "home", name: "首頁", hash: "#/", prim: [/快速對局/, /雲河星槎/] },
  { id: "cpu", name: "挑戰電腦（對局中）", hash: "#/cpu", setup: "move", prim: [/^[＋+]?\s*新局/, /^認輸$/, /^更多/, /^‹|回首頁|走回雅間|^返回/] },
  { id: "canju", name: "一盞茶殘局（茶單）", hash: "#/canju", prim: [/^一口$/, /^一盞$/, /^一壺$/] },
  { id: "canjuPz", name: "殘局（解題中）", hash: "#/canju", setup: "#cjm_sip", prim: [/提示/, /看答案/, /^‹|回殘局|^返回/] },
  { id: "settings", name: "設定（水墨場景）", hash: "#/settings", prim: [/系統・隱私・家長/, /朝代配色/, /語音報棋/] },
  { id: "settingsSys", name: "設定（系統面板）", hash: "#/settings", setup: "#smLock", prim: [/^收起$|^✕$/, /螢幕報讀與鍵盤模式/, /高對比主題/] },
  { id: "ship", name: "雲河星槎", hash: "#/adventure", prim: [/千秋殘局/, /起航/] },
  { id: "db", name: "棋譜庫（藏譜石窟）", hash: "#/db", prim: [/瀏覽大師棋譜/, /繼續研究/] },
  { id: "gmList", name: "大師對局清單", hash: "#/db", setup: "#lbGm", prim: [/下一頁/, /回到書閣|^✕$/, /臧如意/] },
  { id: "gmView", name: "大師對局（看譜）", hash: "#/db/gmgames/gm00001", prim: [/下一步/, /上一步/, /^分析$/] },
  { id: "pvp", name: "同機對下", hash: "#/pvp", setup: "move", prim: [/^[＋+]?\s*新局/, /^認輸$/, /翻轉/, /^‹|回棋譜庫|回首頁|^返回/] },
];
const PAGES = arg("--pages") ? PAGES0.filter(p => arg("--pages").split(",").includes(p.id)) : PAGES0;   // 第 12 輪：--pages gmList,settingsSys 只量這幾頁（除錯用）
// 失敗案例截圖（iPhone SE），檔名順序 B20～
const SHOT_PAGES = [["cpu", "B20-touch-cpu-bar"], ["home", "B21-touch-home-labels"], ["db", "B22-touch-db-scrolls"], ["gmList", "B23-touch-gmlist-close"], ["settings", "B24-touch-settings-edge"], ["pvp", "B25-touch-pvp-bar"]]
  .map(([p, n], k) => [p, TAG ? "B" + (SHOTNUM + k) + "-touch-" + TAG + "-" + n.replace(/^B2\d-touch-/, "") : n]);
const MATRIX_SHOT = TAG ? "B" + (SHOTNUM + 6) + "-touch-" + TAG + "-matrix" : "A10-touch-matrix";
// 第 12 輪：左撇子模式對照圖要用的頁面（iPhone SE，一般模式與左撇子模式各截一張）
const HAND_SHOT_PAGES = ["cpu", "settingsSys", "gmList"];

// 可點元素選擇器（App 多用 button；棋盤格是 SVG rect role=button）
const SEL = 'button,a[href],a[onclick],[role=button],[role=link],[role=tab],[role=switch],[role=checkbox],[onclick],input:not([type=hidden]),select,textarea,summary,label[for],[data-go],[tabindex]:not([tabindex="-1"])';

// ---------- 頁面內執行：收集可點元素 ----------
function collectInPage(SEL) {
  const W = innerWidth, H = innerHeight;
  const isBoard = e => !!(e.closest && e.closest('svg[viewBox="0 0 560 620"]')) && e.tagName.toLowerCase() !== "svg";
  const effOpacity = e => { let o = 1; for (let x = e; x && x.nodeType === 1; x = x.parentElement) { const s = getComputedStyle(x); o *= +s.opacity; if (s.visibility === "hidden" || s.display === "none") return 0 } return o };
  const txt = e => ((e.getAttribute && e.getAttribute("aria-label")) || e.innerText || e.textContent || e.value || e.title || "").trim().replace(/\s+/g, " ").slice(0, 30);
  const all = [...document.querySelectorAll(SEL)];
  const set = new Set(all);
  const out = [];
  all.forEach((e0, i) => {
    let e = e0;
    if (e0.tagName === "INPUT" && e0.closest("label")) e = e0.closest("label");   // 開關：真正可點的是包著它的 label
    const r = e.getBoundingClientRect();
    if (r.width <= 2 || r.height <= 2) return;   // 螢幕報讀專用（1×1）
    const cs = getComputedStyle(e0);
    if (cs.pointerEvents === "none" && !isBoard(e0)) return;   // 棋盤格 rect 本身不接事件，由整個 svg 換算格子（01-board.js sqAt）
    if (effOpacity(e) < 0.05) return;
    const x1 = Math.max(0, r.left), y1 = Math.max(0, r.top), x2 = Math.min(W, r.right), y2 = Math.min(H, r.bottom);
    if (x2 - x1 < 1 || y2 - y1 < 1) return;   // 不在畫面內（要捲動才看得到）
    const pts = [[.5, .5], [.25, .25], [.75, .25], [.25, .75], [.75, .75]];
    let hit = 0; const bsvg = isBoard(e0) ? e0.closest("svg") : null;   // 棋盤格上面疊著棋子圖，點到棋子圖也是由整個 svg 換算格子
    for (const [fx, fy] of pts) { const px = x1 + (x2 - x1) * fx, py = y1 + (y2 - y1) * fy; const t = document.elementFromPoint(px, py); if (t && (t === e || e.contains(t) || t === e0 || e0.contains(t) || (t.contains && t.contains(e0) && t.tagName === "LABEL") || (bsvg && bsvg.contains(t)))) hit++ }
    // 第 11 輪加：實際觸控範圍（hw×hh）。外框（getBoundingClientRect）量不到 ::before 撐大的透明點選範圍，所以從可見框中心往四個方向逐 px 探 elementFromPoint，
    // 命中自己（或自己的子元素）就算；最多往外探 70px。中心點不是自己（被蓋住）就照外框算
    let hw = x2 - x1, hh = y2 - y1;
    if (!isBoard(e0)) {
      const own = t => !!t && (t === e || t === e0 || e.contains(t) || e0.contains(t));
      const cx = Math.round((x1 + x2) / 2), cy = Math.round((y1 + y2) / 2);
      if (own(document.elementFromPoint(cx, cy))) {
        let a = cy, b = cy, l = cx, rr = cx;
        while (a > 0 && cy - a < 70 && own(document.elementFromPoint(cx, a - 1))) a--;
        while (b < H - 1 && b - cy < 70 && own(document.elementFromPoint(cx, b + 1))) b++;
        while (l > 0 && cx - l < 70 && own(document.elementFromPoint(l - 1, cy))) l--;
        while (rr < W - 1 && rr - cx < 70 && own(document.elementFromPoint(rr + 1, cy))) rr++;
        hh = Math.max(hh, b - a + 1); hw = Math.max(hw, rr - l + 1);
      }
    }
    let anc = null; for (let p = e.parentElement; p; p = p.parentElement) if (set.has(p)) { anc = p; break }
    e0.__tsI = i;
    out.push({ i, tag: e0.tagName.toLowerCase(), id: e0.id || "", cls: String(e0.getAttribute("class") || "").slice(0, 40), text: txt(e0), vt: ((e0.innerText || "").trim().replace(/\s+/g, " ")).slice(0, 30), board: isBoard(e0),
      x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height),
      vx: Math.round(x1), vy: Math.round(y1), vw: Math.round(x2 - x1), vh: Math.round(y2 - y1), hw: Math.round(hw), hh: Math.round(hh), hit, nested: anc ? (anc.id ? "#" + anc.id : anc.tagName.toLowerCase() + "." + String(anc.getAttribute("class") || "").split(" ")[0]) : "", handler: typeof e0.onclick === "function" || e0.hasAttribute("onclick") });
  });
  return { W, H, list: out };
}

// ---------- 頁面內執行：靜態座標矩陣（每 step px 一點） ----------
function matrixInPage([SEL, step]) {
  const W = innerWidth, H = innerHeight, pts = [];
  const act = t => { if (!t || !t.closest) return null; let a = t.closest(SEL); if (a && a.tagName === "INPUT" && a.closest("label")) a = a.closest("label"); return a };
  for (let y = step / 2; y < H; y += step) for (let x = step / 2; x < W; x += step) {
    const st = document.elementsFromPoint(x, y), top = st[0]; const a = act(top);
    let k = "none", lab = "", sz = 0, n2 = 0;
    const bsvg = top && top.closest && top.closest('svg[viewBox="0 0 560 620"]');
    if (bsvg) {   // 棋盤：照 svg 座標換算最近的交叉點（跟 01-board.js 的 sqAt 一樣是整個 svg 接事件）
      const m = bsvg.getScreenCTM().inverse(), X = m.a * x + m.c * y + m.e, Y = m.b * x + m.d * y + m.f, c = Math.round((X - 40) / 60), r = Math.round((Y - 40) / 60);
      const inb = c >= 0 && c <= 8 && r >= 0 && r <= 9 && Math.abs(X - 40 - c * 60) <= 30 && Math.abs(Y - 40 - r * 60) <= 30;
      pts.push([Math.round(x), Math.round(y), inb ? "board" : "none", inb ? c + "," + r : "棋盤框", inb ? Math.round(bsvg.getScreenCTM().a * 60) : 0, 0]); continue }
    if (a) {
      const r = a.getBoundingClientRect(); sz = Math.round(Math.min(r.width, r.height));
      lab = ((a.getAttribute("aria-label") || a.innerText || "").trim().replace(/\s+/g, " ")).slice(0, 16);
      const inBoard = !!a.closest('svg[viewBox="0 0 560 620"]');
      // 事件冒泡路徑上有幾個掛了 onclick 的元素（≥2＝一點可能同時觸發兩個）
      for (let p = top; p; p = p.parentElement) if (typeof p.onclick === "function" || (p.hasAttribute && p.hasAttribute("onclick"))) n2++;
      const anc = a.parentElement && a.parentElement.closest(SEL);
      k = inBoard ? "board" : (anc && n2 >= 2) ? "nested" : (r.width < 44 || r.height < 44) ? "small" : "ok";
    }
    pts.push([Math.round(x), Math.round(y), k, lab, sz, n2]);
  }
  return { W, H, step, pts };
}

// ---------- 小工具 ----------
// 等「水墨等待畫面」（#preov，09b-preload.js 先下載這頁要的圖）消失；45 秒還在就按「略過」並記下來
const PRE_SKIPS = [];
async function waitReady(page, tag) {
  const t0 = Date.now();
  while (Date.now() - t0 < 45000) { const on = await page.evaluate(() => { const o = document.getElementById("preov"); return !!(o && getComputedStyle(o).display !== "none" && o.getBoundingClientRect().height > 0) }).catch(() => false); if (!on) return Date.now() - t0; await sleep(700) }
  PRE_SKIPS.push(tag); await page.evaluate(() => { const b = document.querySelector("#preov .pre-skip"); if (b) b.click() }).catch(() => { }); await sleep(1500); return -1;
}
async function gotoHash(page, h, wait = 3500) {
  await page.evaluate(h => { try { if (typeof closeSheet === "function") closeSheet() } catch (e) { } document.querySelectorAll(".modal").forEach(m => m.remove()); if (location.hash === h && typeof route === "function") route(); else location.hash = h }, h);
  await sleep(800); await waitReady(page, h); await sleep(wait);
}
async function boardPt(page, c, r) {   // 棋盤第 c 行、第 r 列（盤面座標：第 0 列＝黑方底線；畫面翻轉時自動換算）
  return page.evaluate(([c, r]) => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); if (!svg) return null; const m = svg.getScreenCTM(); const f = !!(svg._o && svg._o.flip); const X = 40 + (f ? 8 - c : c) * 60, Y = 40 + (f ? 9 - r : r) * 60; return { x: m.a * X + m.c * Y + m.e, y: m.b * X + m.d * Y + m.f } }, [c, r]);
}
const boardSig = page => page.evaluate(() => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return svg && svg._b ? JSON.stringify(svg._b) : "" });
const boardSel = page => page.evaluate(() => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return svg && svg._o ? (svg._o.sel == null ? null : svg._o.sel) : undefined });
async function touchDrag(cdp, page, a, b, n = 10, two = null) {
  const T = (type, touchPoints) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  await T("touchStart", [{ x: a.x, y: a.y, id: 1 }]);
  for (let i = 1; i <= n; i++) { await T("touchMove", [{ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n, id: 1 }]); await sleep(16) }
  await T("touchEnd", []);
}
async function pinch(cdp, c, d0, d1) {
  const T = (type, touchPoints) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  await T("touchStart", [{ x: c.x - d0, y: c.y, id: 1 }, { x: c.x + d0, y: c.y, id: 2 }]);
  for (let i = 1; i <= 12; i++) { const d = d0 + (d1 - d0) * i / 12; await T("touchMove", [{ x: c.x - d, y: c.y, id: 1 }, { x: c.x + d, y: c.y, id: 2 }]); await sleep(16) }
  await T("touchEnd", []);
}
async function stateSig(page) {
  return page.evaluate(() => ({ hash: location.hash, modal: document.querySelectorAll(".modal").length, kids: document.body.children.length,
    sheet: !!document.querySelector(".xqs-ov.on, .xqs-sheet.on, .sheet.on, #stmOv:not([hidden])"),
    view: ((document.querySelector("#view") || {}).innerHTML || "").length, modalText: [...document.querySelectorAll(".modal h2")].map(x => x.innerText).join("｜").slice(0, 60) }));
}
// 紅框標註截圖
async function annotate(page, boxes, file, title) {
  await page.evaluate(([boxes, title]) => {
    const ov = document.createElement("div"); ov.id = "__ts_ov"; ov.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;font:bold 11px sans-serif";
    for (const b of boxes) { const d = document.createElement("div"); d.style.cssText = `position:fixed;left:${b.x - 1}px;top:${b.y - 1}px;width:${b.w + 2}px;height:${b.h + 2}px;border:2px solid ${b.c || "#e00"};box-sizing:border-box;background:${b.c === "#f80" ? "rgba(255,136,0,.12)" : b.c === "#1a9e3a" ? "rgba(26,158,58,.10)" : "rgba(255,0,0,.12)"}`;
      if (b.n) { const l = document.createElement("span"); l.textContent = b.n; l.style.cssText = `position:absolute;left:-2px;top:-14px;background:${b.c || "#e00"};color:#fff;padding:0 3px;border-radius:3px;line-height:13px`; d.append(l) } ov.append(d) }
    document.body.append(ov);
  }, [boxes, title]);
  const buf = await page.screenshot(), vp = page.viewportSize();
  await page.evaluate(() => { const o = document.getElementById("__ts_ov"); if (o) o.remove() });
  // 說明文字放在截圖下方（不蓋住畫面），另開一頁排版
  const pg = await page.context().newPage(); await pg.setViewportSize({ width: vp.width, height: vp.height + 60 });
  await pg.setContent(`<html><body style="margin:0;background:#fff;width:${vp.width}px"><img src="data:image/png;base64,${buf.toString("base64")}" style="width:${vp.width}px;display:block"><div style="background:#8a0000;color:#fff;padding:6px 8px;font:bold 12px sans-serif;line-height:1.45">${title.replace(/</g, "&lt;")}</div></body></html>`);
  await sleep(300); await pg.screenshot({ path: file, fullPage: true }); await pg.close();
}
function gapOf(a, b) { const dx = Math.max(0, Math.max(a.vx, b.vx) - Math.min(a.vx + a.vw, b.vx + b.vw)), dy = Math.max(0, Math.max(a.vy, b.vy) - Math.min(a.vy + a.vh, b.vy + b.vh)); return Math.max(dx, dy) === 0 ? 0 : Math.hypot(dx, dy) }
function inside(a, b) { return a.vx >= b.vx && a.vy >= b.vy && a.vx + a.vw <= b.vx + b.vw && a.vy + a.vh <= b.vy + b.vh }

// ---------- 分析一頁 ----------
function analyze(raw, S) {
  const W = raw.W, H = raw.H, L = raw.list.filter(t => t.hit > 0), ui = L.filter(t => !t.board), board = L.filter(t => t.board);
  const smallHit = ui.filter(t => (t.hw == null ? t.vw : t.hw) < 44 || (t.hh == null ? t.vh : t.hh) < 44);
  const small = ui.filter(t => t.vw < 44 || t.vh < 44).map(t => ({ ...t, sev: Math.min(t.vw, t.vh) < 24 ? "嚴重（<24）" : "不足（24～43）" }));
  const pairs = [];
  for (let i = 0; i < ui.length; i++) for (let j = i + 1; j < ui.length; j++) {
    const a = ui[i], b = ui[j]; if (inside(a, b) || inside(b, a)) continue;
    const g = gapOf(a, b); if (g < 8) pairs.push({ a: a.text || a.cls, b: b.text || b.cls, gap: Math.round(g * 10) / 10, overlap: g === 0 && !(a.vx + a.vw <= b.vx || b.vx + b.vw <= a.vx || a.vy + a.vh <= b.vy || b.vy + b.vh <= a.vy), ra: [a.vx, a.vy, a.vw, a.vh], rb: [b.vx, b.vy, b.vw, b.vh] });
  }
  const E = 16, edge = ui.filter(t => (t.vx < E || t.vx + t.vw > W - E)), edgeSmall = edge.filter(t => t.vw < 44 || t.vh < 44 || t.vw < 120);
  const I = S.inset, safe = ui.filter(t => (I.top && t.vy < I.top) || (I.bottom && t.vy + t.vh > H - I.bottom));
  const zone = t => { const cy = t.vy + t.vh / 2, cx = t.vx + t.vw / 2; if (cy < H / 3) return (cx < W * .3 || cx > W * .7) ? "頂端角落（難及）" : "上 1/3（難及）"; if (cy < H * 2 / 3) return "中段（尚可）"; return "下 1/3（易及）" };
  const zoneCount = {}; for (const t of ui) { const z = zone(t); zoneCount[z] = (zoneCount[z] || 0) + 1 }
  return { W, H, nAll: raw.list.length, nHit: L.length, nUi: ui.length, nBoard: board.length, boardCell: board.length ? [Math.min(...board.map(t => t.vw)), Math.min(...board.map(t => t.vh))] : null,
    smallHit, small, pairs, edge: edge.map(t => ({ text: t.text, x: t.vx, w: t.vw, h: t.vh, small: t.vw < 44 || t.vh < 44 })), edgeSmall: edgeSmall.length, safe: safe.map(t => ({ text: t.text, y: t.vy, h: t.vh })), zoneCount,
    nested: ui.filter(t => t.nested && t.handler).map(t => ({ text: t.text, in: t.nested })), occluded: raw.list.filter(t => t.hit === 0).length, zone, ui };
}

// 量一頁：可點元素、間距、主要動作（含第 12 輪的左右手拇指熱區：同一個動作畫面上有好幾個入口時，取那隻手最好按的那個）
async function measurePage(page, P, S, R) {
  const raw = await page.evaluate(collectInPage, SEL); R.clicks.static += raw.list.length;
  const A = analyze(raw, S);
  const prim = [];
  const hands = (list) => { const o = {}; for (const h of ["R", "L"]) { let b = null; for (const t of list) { const cx = t.vx + t.vw / 2, cy = t.vy + t.vh / 2, z = thumb(cx, cy, A.W, A.H, h); if (!b || z.d < b.d) b = { d: z.d, z: z.z, text: t.text, cx: cx | 0, cy: cy | 0 } } o[h] = b } return o };
  for (const re of P.prim || []) { const all = A.ui.filter(t => re.test(t.text) || re.test(t.vt)), t = all[0];
    if (t) prim.push({ want: String(re), text: t.text, zone: A.zone(t), cx: t.vx + t.vw / 2 | 0, cy: t.vy + t.vh / 2 | 0, w: t.vw, h: t.vh, n: all.length, ...hands(all) }); else prim.push({ want: String(re), text: "（這個尺寸畫面上沒看到）", zone: "—", n: 0 }) }
  if (P.setup === "move") { const c = await boardPt(page, 4, 5); if (c) prim.push({ want: "棋盤中心", text: "棋盤中心（走棋）", zone: A.zone({ vx: c.x, vy: c.y, vw: 0, vh: 0 }), cx: c.x | 0, cy: c.y | 0, n: 1, ...hands([{ vx: c.x, vy: c.y, vw: 0, vh: 0, text: "棋盤中心" }]) }) }
  const pg = { name: P.name, hash: await page.evaluate(() => location.hash), nAll: A.nAll, nHit: A.nHit, nUi: A.nUi, nBoard: A.nBoard, boardCell: A.boardCell, occluded: A.occluded,
    smallHit: A.smallHit.map(t => ({ text: t.text, sel: (t.id ? "#" + t.id : t.tag + (t.cls ? "." + t.cls.split(" ").join(".") : "")), w: t.hw, h: t.hh, x: t.vx, y: t.vy })),
    small: A.small.map(t => ({ hw: t.hw, hh: t.hh, text: t.text, sel: (t.id ? "#" + t.id : t.tag + (t.cls ? "." + t.cls.split(" ").join(".") : "")), x: t.vx, y: t.vy, w: t.vw, h: t.vh, sev: t.sev })),
    pairs: A.pairs, edge: A.edge, edgeSmall: A.edgeSmall, safe: A.safe, zoneCount: A.zoneCount, prim, nested: A.nested };
  return { A, pg };
}
async function setupPage(page, cdp, P) {
  await gotoHash(page, P.hash, 3500);
  if (P.setup === "move") {   // 先走一步（炮二平五，用拖曳），變成「對局中」
    const a = await boardPt(page, 7, 7), b = await boardPt(page, 4, 7);
    if (a && b) { await touchDrag(cdp, page, a, b); await sleep(P.id === "cpu" ? 4000 : 1500) }
  } else if (P.setup) { await waitReady(page, P.id); const el = page.locator(P.setup).first(); const bb = await el.boundingBox().catch(() => null); if (bb) await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await sleep(3500) }
}

// 開一個手機尺寸的瀏覽器設定＋分頁（lefty＝先把左撇子模式 m_lefty 打開）
async function openCtx(browser, S, R, lefty) {
  const ctx = await browser.newContext({ viewport: { width: S.w, height: S.h }, deviceScaleFactor: S.dsf, isMobile: true, hasTouch: true, serviceWorkers: "block", locale: "zh-TW" });
  await ctx.addInitScript((lefty) => {
    try {
      localStorage.setItem("xq_netRoot", JSON.stringify("xq_test"));   // 測試房：絕不進正式大廳
      const S = (k, v) => { if (localStorage.getItem(k) == null) localStorage.setItem(k, JSON.stringify(v)) };
      S("m_onboard1", true); S("m_firstWin", true); S("xq_me", { id: "qatouch" + Math.random().toString(36).slice(2, 8), name: "觸控測試" });   // 跳過新手開頭、名字
      if (lefty) localStorage.setItem("m_lefty", "true");
    } catch (e) { }
  }, !!lefty);
  const page = await ctx.newPage(); page.setDefaultTimeout(8000);
  page.on("pageerror", e => R.errors.push({ size: S.id + (lefty ? "（左撇子）" : ""), msg: String(e.message).slice(0, 200) }));
  page.on("dialog", d => { R.errors.push({ size: S.id, msg: "原生對話框：" + d.message().slice(0, 80) }); d.dismiss().catch(() => { }) });
  const cdp = await ctx.newCDPSession(page);
  try { await cdp.send("Emulation.setSafeAreaInsetsOverride", { insets: S.inset }) } catch (e) { R.errors.push({ size: S.id, msg: "安全區模擬失敗：" + e.message }) }
  await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded", timeout: 60000 }); await sleep(3000); await waitReady(page, S.id + " 開 App"); await sleep(4000);
  return { ctx, page, cdp };
}

// 第 12 輪：主要動作的左右手易及／尚可／難及數（pages＝某尺寸的逐頁結果，hand＝R／L）
function handCount(pages, hand) { const c = { 易及: 0, 尚可: 0, 難及: 0 }; for (const pid in pages || {}) for (const pr of pages[pid].prim || []) if (pr[hand]) c[pr[hand].z]++; return c }
// 第 12 輪 A22：一般模式右手／一般模式左手／左撇子模式左手，三欄並排，底色是拇指熱區（綠易及、黃尚可、紅難及），圓圈是這頁的主要動作
async function handShot(browser, R) {
  const se = R.sizes.se, le = R.lefty && R.lefty.se; if (!le) return;
  const W = 375, H = 667, K = .62, col = { 易及: "#1a9e3a", 尚可: "#e0a800", 難及: "#d42020" };
  const zoneSvg = (hand) => { let o = ""; for (let y = 0; y < H; y += 8) for (let x = 0; x < W; x += 8) { const z = thumb(x + 4, y + 4, W, H, hand).z; o += `<rect x="${x}" y="${y}" width="8" height="8" fill="${col[z]}"/>` } return `<g opacity=".17">${o}</g>` };
  const zs = { R: zoneSvg("R"), L: zoneSvg("L") };
  const panel = (img, prim, hand, title) => {
    const marks = (prim || []).map((pr, k) => { const q = pr[hand]; if (!q) return ""; return `<circle cx="${q.cx}" cy="${q.cy}" r="17" fill="none" stroke="${col[q.z]}" stroke-width="4"/><circle cx="${q.cx}" cy="${q.cy}" r="9" fill="${col[q.z]}"/><text x="${q.cx}" y="${q.cy + 4.5}" font-size="12" font-weight="bold" fill="#fff" text-anchor="middle">${k + 1}</text>` }).join("");
    const c = { 易及: 0, 尚可: 0, 難及: 0 }; for (const pr of prim || []) if (pr[hand]) c[pr[hand].z]++;
    return `<div style="width:${W * K}px"><div style="font-weight:bold;font-size:12px;height:18px">${title}</div><div style="position:relative;width:${W * K}px;height:${H * K}px;border:1px solid #888;overflow:hidden">${img ? `<img src="data:image/png;base64,${img}" style="width:100%;height:100%;display:block">` : '<div style="padding:20px">（沒有截圖）</div>'}<svg viewBox="0 0 ${W} ${H}" style="position:absolute;inset:0;width:100%;height:100%">${zs[hand]}${marks}</svg></div><div style="font-size:12px;margin-top:2px"><b style="color:${col.易及}">易及 ${c.易及}</b>・<b style="color:${col.尚可}">尚可 ${c.尚可}</b>・<b style="color:${col.難及}">難及 ${c.難及}</b></div></div>`;
  };
  const rows = HAND_SHOT_PAGES.map(pid => { const n = se && se.pages[pid], l = le.pages[pid]; if (!n && !l) return "";
    const names = ((n || l).prim || []).map((pr, k) => `${k + 1} ${pr.text}`).join("　");
    return `<div style="margin:8px 0 2px;font-weight:bold">${(n || l).name}　<span style="font-weight:normal;font-size:12px;color:#444">主要動作：${names}</span></div><div style="display:flex;gap:14px">` +
      panel(R._hand["n:" + pid], n && n.prim, "R", "① 一般模式・右手") + panel(R._hand["n:" + pid], n && n.prim, "L", "② 一般模式・左手") + panel(R._hand["l:" + pid], l && l.prim, "L", "③ 左撇子模式・左手") + "</div>" }).join("");
  const sum = Object.keys(R.lefty).map(sid => { const a = handCount((R.sizes[sid] || {}).pages, "R"), b = handCount((R.sizes[sid] || {}).pages, "L"), c = handCount(R.lefty[sid].pages, "L");
    const f = x => `易及 ${x.易及}／尚可 ${x.尚可}／難及 ${x.難及}`; return `<tr><td>${R.lefty[sid].name}</td><td>${f(a)}</td><td>${f(b)}</td><td><b>${f(c)}</b></td></tr>` }).join("");
  const ctx = await browser.newContext({ viewport: { width: 760, height: 900 }, deviceScaleFactor: 2 }); const pg = await ctx.newPage();
  await pg.setContent(`<html><body style="margin:0;padding:10px 14px;background:#fff;color:#222;font:13px sans-serif;width:732px"><div style="font-size:16px;font-weight:bold">左撇子單手模式：前後對照＋左右手拇指熱區（iPhone SE 375×667）</div>
    <div style="font-size:12px;color:#444;margin:2px 0 4px">底色＝拇指熱區模型（轉軸在下緣外 40px 的左／右角；√((橫差×1.25)²＋縱差²) ≤450 綠＝易及、≤620 黃＝尚可、其餘紅＝難及）。圓圈＝主要動作，同一動作有兩個入口時取那隻手最好按的。</div>${rows}
    <table style="border-collapse:collapse;margin-top:10px;font-size:12px" border="1" cellpadding="4"><tr style="background:#eee"><th>主要動作（全部 11 頁）</th><th>① 一般模式・右手</th><th>② 一般模式・左手</th><th>③ 左撇子模式・左手</th></tr>${sum}</table>
    <div style="font-size:11px;color:#666;margin-top:4px">象棋千秋 ${R.version}｜touch-stress.js --lefty｜無頭 Chrome 模擬，不是實機手掌量測</div></body></html>`);
  await sleep(500); await pg.screenshot({ path: path.join(SHOTS, LEFTY_SHOT + ".png"), fullPage: true }); await ctx.close();
}

// ================= 主程式 =================
(async () => {
  const R = { tool: "xiangqi-lab/tools/qa/touch-stress.js", url: URL0, startedAt: new Date().toISOString(), version: "", browser: "", sizes: {}, matrix: {}, taps: {}, boardTaps: {}, destructive: [], gestures: [], clicks: { static: 0, real: 0 }, errors: [] };
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--mute-audio"] });
  R.browser = "Chrome " + browser.version() + "（headless）";
  try {
    for (const S of (ONLY_LEFTY ? [] : SIZES)) {
      log("=== 尺寸", S.name);
      const { ctx, page, cdp } = await openCtx(browser, S, R, false);
      if (!R.version) R.version = await page.evaluate(() => window.XQ_BUILD || "").catch(() => "");
      R.sizes[S.id] = { name: S.name, w: S.w, h: S.h, dsf: S.dsf, inset: S.inset, pages: {} };

      for (const P of PAGES) {
        try {
          await setupPage(page, cdp, P);
          const { A, pg } = await measurePage(page, P, S, R);
          R.sizes[S.id].pages[P.id] = pg;
          if (S.id === "se" && HAND_SHOT_PAGES.includes(P.id)) R._hand = Object.assign(R._hand || {}, { ["n:" + P.id]: (await page.screenshot()).toString("base64") });
          log(`  ${P.name}：可點 ${A.nUi}（棋盤格 ${A.nBoard}），<44 ${pg.small.length}（觸控範圍 <44 ${pg.smallHit.length}），間距<8 ${pg.pairs.length} 對，邊緣 ${pg.edge.length}，安全區 ${pg.safe.length}`);
          // 失敗案例截圖（只在 iPhone SE）
          const sp = SHOT_PAGES.find(x => x[0] === P.id);
          if (S.id === "se" && sp) {
            // 第 11 輪：外框小於 44、但實際觸控範圍（::before 撐大）已達 44 的畫綠框，標「觸控 寬×高」
            const boxes = pg.small.map((t, k) => { const ok = t.hw >= 44 && t.hh >= 44; return { x: t.x, y: t.y, w: t.w, h: t.h, n: ok ? `觸控${t.hw}×${t.hh}` : `${t.w}×${t.h}`, c: ok ? "#1a9e3a" : "#e00" } });
            for (const p of pg.pairs.filter(p => p.gap < 2).slice(0, 12)) { boxes.push({ x: p.ra[0], y: p.ra[1], w: p.ra[2], h: p.ra[3], c: "#f80" }) }
            await annotate(page, boxes, path.join(SHOTS, sp[1] + ".png"), `${P.name}｜${S.name}｜${TAG ? TAG + "｜" : ""}紅框＝觸控範圍小於 44×44（標 寬×高）｜綠框＝外框小但觸控範圍已達 44｜橘框＝與鄰近按鈕間距 <2px｜外框 <44：${pg.small.length} 個、觸控範圍 <44：${pg.smallHit.length} 個、間距 <8px：${pg.pairs.length} 對`);
          }
          // 靜態座標矩陣：首頁、對局（cpu）
          if (P.id === "home" || P.id === "cpu") {
            const M = await page.evaluate(matrixInPage, [SEL, 24]); R.clicks.static += M.pts.length;
            R.matrix[S.id + ":" + P.id] = M;
            if (S.id === "se") { await page.evaluate(() => { }); R["_shot_" + P.id] = (await page.screenshot()).toString("base64") }
          }
          // iPhone SE：棋盤偏移點選（同機對下已走炮二平五＝輪黑；點黑方棋子中心＋偏移，看有沒有選到同一顆；點己方另一顆只會換選取，不會走棋）
          if (S.id === "se" && P.id === "pvp" && !NOTAP) {
            const res = []; const cells = [[0, 0], [8, 0], [4, 0], [1, 0], [2, 0], [3, 0], [0, 3], [8, 3], [2, 3]];
            const cellPx = await page.evaluate(() => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return svg.getScreenCTM().a * 60 });
            const offs = [[0, 0], [.4, 0], [-.4, 0], [0, .4], [0, -.4], [.45, .45]];
            const sq0 = await boardSig(page);
            for (const [c, r] of cells) for (const [ox, oy] of offs) {
              const p = await boardPt(page, c, r); if (!p) continue;
              if ((await boardSel(page)) === r * 9 + c) {   // 已經選著這顆：再點一下會取消選取，所以先點另一顆己方棋子（車 / 將）換掉選取
                const [rc, rr] = c === 0 && r === 0 ? [4, 0] : [0, 0]; const q = await boardPt(page, rc, rr); await page.touchscreen.tap(q.x, q.y); R.clicks.real++; await sleep(300) }
              await page.touchscreen.tap(p.x + ox * cellPx, p.y + oy * cellPx); R.clicks.real++; await sleep(350);
              const sel = await boardSel(page); const o = { c, r, ox: Math.round(ox * cellPx), oy: Math.round(oy * cellPx), sel, want: r * 9 + c, ok: sel === r * 9 + c };
              if (!o.ok) {   // 沒選到：記下那一點最上層是什麼，等 0.6 秒同一點再點一次，分辨是位置問題還是時序問題
                o.stack = await page.evaluate(([x, y]) => document.elementsFromPoint(x, y).slice(0, 3).map(e => e.tagName.toLowerCase() + "." + String(e.className && e.className.baseVal != null ? e.className.baseVal : e.className).split(" ")[0]).join(" > "), [p.x + ox * cellPx, p.y + oy * cellPx]);
                await sleep(600); if ((await boardSel(page)) !== o.want) { await page.touchscreen.tap(p.x + ox * cellPx, p.y + oy * cellPx); R.clicks.real++; await sleep(400) } o.retryOk = (await boardSel(page)) === o.want }
              res.push(o);
            }
            const moved = (await boardSig(page)) !== sq0;
            R.boardTaps = { cellPx: Math.round(cellPx * 10) / 10, n: res.length, ok: res.filter(x => x.ok).length, selReadable: res.some(x => x.sel !== undefined), movedByAccident: moved, res };
            log(`  棋盤偏移點選：${R.boardTaps.ok}/${res.length} 選對（格距 ${R.boardTaps.cellPx}px），沒選到的再點一次成功 ${res.filter(x => !x.ok && x.retryOk).length}，誤走棋：${moved}`);
          }
        } catch (e) { R.errors.push({ size: S.id, page: P.id, msg: String(e.message).slice(0, 200) }); log("  ！", P.id, e.message.slice(0, 120)) }
      }

      // ---------- iPhone SE：首頁真點選矩陣（每 48px） ----------
      if (S.id === "se" && !NOTAP) {
        log("  首頁真點選矩陣…");
        const taps = [];
        await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded" }); await sleep(2000); await waitReady(page, "真點選"); await sleep(3000);
        // 冷啟動回首頁時，07m4-resume 會問「上次的棋還沒下完，要繼續嗎？」——先記下來再拿掉（不按放棄），點選矩陣量的是首頁本身
        const clearModal = async () => { const t = await page.evaluate(() => { const ms = [...document.querySelectorAll(".modal")]; const tx = ms.map(m => m.innerText.replace(/\s+/g, " ").slice(0, 50)).join("｜"); ms.forEach(m => m.remove()); return tx }); if (t) R.tapNotes = [...new Set([...(R.tapNotes || []), "重開 App 時先跳：" + t])]; await sleep(300) };
        await clearModal();
        await page.evaluate(() => { window.__tsClicks = []; document.addEventListener("click", e => { const path = e.composedPath().filter(x => x.nodeType === 1); window.__tsClicks.push({ tag: (path[0].id ? "#" + path[0].id : path[0].tagName), n: path.filter(x => typeof x.onclick === "function").length, lab: ((path.find(x => x.matches && x.matches("button,[data-go],[role=button],a")) || {}).innerText || "").trim().replace(/\s+/g, " ").slice(0, 16) }) }, true) });
        for (let y = 24; y < S.h; y += 48) for (let x = 24; x < S.w; x += 48) {
          const s0 = await stateSig(page);
          await page.evaluate(() => { window.__tsClicks = [] });
          await page.touchscreen.tap(x, y); R.clicks.real++; await sleep(1900);
          const s1 = await stateSig(page), ck = await page.evaluate(() => window.__tsClicks.slice());
          const eff = [];
          if (s1.hash !== s0.hash) eff.push("換頁 " + s1.hash);
          if (s1.modal > s0.modal) eff.push("跳出視窗：" + s1.modalText);
          if (s1.modal < s0.modal) eff.push("關掉視窗");
          if (s1.sheet && !s0.sheet) eff.push("打開面板");
          if (s1.kids > s0.kids && !eff.length) eff.push("多了浮層");
          if (s1.view !== s0.view && !eff.length) eff.push("畫面內容改變（角色走路等）");
          const c = ck[0] || null;
          taps.push([x, y, c ? c.lab || c.tag : "", c ? c.n : 0, eff.join("；")]);
          if (eff.some(e => /換頁|視窗|面板|浮層/.test(e))) { await page.goto(URL0 + "#/", { waitUntil: "domcontentloaded" }); await sleep(2000); await waitReady(page, "真點選"); await sleep(2500); await clearModal();
            await page.evaluate(() => { window.__tsClicks = []; document.addEventListener("click", e => { const path = e.composedPath().filter(x => x.nodeType === 1); window.__tsClicks.push({ tag: (path[0].id ? "#" + path[0].id : path[0].tagName), n: path.filter(x => typeof x.onclick === "function").length, lab: ((path.find(x => x.matches && x.matches("button,[data-go],[role=button],a")) || {}).innerText || "").trim().replace(/\s+/g, " ").slice(0, 16) }) }, true) }) }
        }
        R.taps["se:home"] = taps;
        log(`  首頁真點選 ${taps.length} 點：有反應 ${taps.filter(t => t[4]).length}、按到有標籤的目標卻沒反應 ${taps.filter(t => t[2] && t[3] && !t[4]).length}、一點冒泡經過 ≥2 個 onclick ${taps.filter(t => t[3] >= 2).length}`);
      }

      // ---------- iPhone SE：誤觸復原 ----------
      if (S.id === "se") {
        const D = R.destructive, rec = (o) => { D.push(o); log("  誤觸：", o.action, "→", o.result) };
        const tapText = async (re, scope = "body") => { const h = await page.evaluateHandle(([re, scope]) => { const R = new RegExp(re); return [...document.querySelectorAll(scope + " button, " + scope + " [role=button], " + scope + " summary")].find(b => { const r = b.getBoundingClientRect(); return r.width > 2 && R.test((b.innerText || b.getAttribute("aria-label") || "").trim()) }) || null }, [re.source, scope]); const el = h.asElement(); if (!el) return null; await el.scrollIntoViewIfNeeded().catch(() => { }); const bb = await el.boundingBox(); if (!bb) return null; await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); R.clicks.real++; return bb };
        const modalInfo = () => page.evaluate(() => { const m = [...document.querySelectorAll(".modal")].pop(); if (!m) return null; return { text: m.innerText.replace(/\s+/g, " ").slice(0, 80), btns: [...m.querySelectorAll("button")].map(b => { const r = b.getBoundingClientRect(); return { t: b.innerText.trim(), x: r.x | 0, y: r.y | 0, w: r.width | 0, h: r.height | 0, ghost: b.classList.contains("ghost") } }) } });
        const overlap = (a, b) => !!(a && b && a.x < b.x + b.w && b.x < a.x + a.width && a.y < b.y + b.h && b.y < a.y + a.height);
        try {
          // 1 挑戰電腦：認輸 → 確認框 → 取消
          await gotoHash(page, "#/cpu", 3500); let sig0 = await boardSig(page);
          let bb = await tapText(/^認輸$/); await sleep(900); let mi = await modalInfo();
          const cancel = mi && mi.btns.find(b => /取消/.test(b.t)); const yes = mi && mi.btns.find(b => /認輸/.test(b.t));
          rec({ action: "挑戰電腦：點「認輸」", page: "#/cpu", confirm: !!mi, dialog: mi, dangerOnTop: !!(yes && overlap(bb, yes)), result: mi ? `跳確認框「${mi.text.slice(0, 20)}」，按鈕：${mi.btns.map(b => b.t + "(" + b.w + "×" + b.h + ")").join("、")}；確認鈕${yes && overlap(bb, yes) ? "疊在" : "不在"}原按鈕位置（連點不會直接認輸）` : "沒有確認框" });
          if (cancel) { await page.touchscreen.tap(cancel.x + cancel.w / 2, cancel.y + cancel.h / 2); await sleep(600) }
          const stillOn = (await boardSig(page)) === sig0 && !(await modalInfo());
          D[D.length - 1].afterCancel = stillOn ? "按取消後棋局照舊" : "按取消後狀態有變";
          // 1b 連點兩下「認輸」（間隔 120ms）
          bb = await tapText(/^認輸$/); await sleep(120); if (bb) { await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); R.clicks.real++ } await sleep(900); mi = await modalInfo();
          rec({ action: "挑戰電腦：120ms 內連點兩下「認輸」", page: "#/cpu", confirm: !!mi, result: mi && /確定認輸/.test(mi.text) ? "第二下落在暗幕上，確認框還在，沒有認輸" : "注意：" + (mi ? mi.text : "確認框不見了") });
          if (mi) { const c = mi.btns.find(b => /取消/.test(b.t)); if (c) { await page.touchscreen.tap(c.x + c.w / 2, c.y + c.h / 2); await sleep(500) } }
          // 1c 點暗幕能不能關確認框
          await tapText(/^認輸$/); await sleep(800); await page.touchscreen.tap(10, 300); await sleep(600); mi = await modalInfo();
          rec({ action: "確認框：點框外暗幕", page: "#/cpu", confirm: true, result: mi ? "點暗幕不會關（只能按取消；也不會誤確認）" : "點暗幕會關掉確認框（等同取消）" });
          if (mi) { const c = mi.btns.find(b => /取消/.test(b.t)); if (c) await page.touchscreen.tap(c.x + c.w / 2, c.y + c.h / 2); await sleep(500) }
          // 2 新局（對局中）
          sig0 = await boardSig(page); await tapText(/新局/); await sleep(1200); mi = await modalInfo();
          const sheetOpen = await page.evaluate(() => !!document.querySelector(".sheet.on, .sheet:not([hidden]) , #sheet.on, .bsheet.on"));
          rec({ action: "挑戰電腦對局中：點「新局」", page: "#/cpu", confirm: !!mi || sheetOpen, result: mi ? "跳視窗：" + mi.text.slice(0, 40) : sheetOpen ? "先開出新局選單（要再選才會開新局），棋盤沒被清掉：" + ((await boardSig(page)) === sig0) : ((await boardSig(page)) === sig0 ? "沒有直接清掉棋盤" : "直接開了新局（沒有確認）") });
          await gotoHash(page, "#/cpu", 3000);
          // 3 離開對局（走回雅間）再回來
          sig0 = await boardSig(page); { const bk = await page.locator("#back").first().boundingBox().catch(() => null); if (bk) { await page.touchscreen.tap(bk.x + bk.width / 2, bk.y + bk.height / 2); R.clicks.real++ } } await sleep(5000); const h1 = await page.evaluate(() => location.hash);
          mi = await modalInfo(); await gotoHash(page, "#/cpu", 4000); const sig1 = await boardSig(page);
          rec({ action: "挑戰電腦對局中：點左上「‹」返回鍵離開，再回來", page: "#/cpu", confirm: !!mi, result: `返回到 ${h1}（返回鍵＝回上一頁）${mi ? "（先跳視窗：" + mi.text.slice(0, 30) + "）" : "（不問）"}；回來時盤面${sig1 === sig0 ? "原封不動（自動保存，可復原）" : "不一樣了"}` });
          // 4 殘局：看答案
          await gotoHash(page, "#/canju", 3000); { const el = page.locator("#cjm_sip").first(); const b2 = await el.boundingBox().catch(() => null); if (b2) await page.touchscreen.tap(b2.x + b2.width / 2, b2.y + b2.height / 2); await sleep(3500) }
          await tapText(/看答案/); await sleep(900); mi = await modalInfo();
          rec({ action: "殘局解題：點「看答案」", page: "#/canju/…", confirm: !!mi, dialog: mi, result: mi ? "跳確認框：" + mi.text.slice(0, 40) : "沒有確認框（直接看答案）" });
          if (mi) { const c = mi.btns.find(b => /取消|不要|先不/.test(b.t)) || mi.btns[mi.btns.length - 1]; await page.touchscreen.tap(c.x + c.w / 2, c.y + c.h / 2); await sleep(500) }
          // 5 設定：刪除這支手機的全部資料（只看第一層確認，按「不要刪／取消」）
          // 「授權與資料」面板在設定的水墨場景裡藏得深，這裡直接呼叫按鈕背後同一個函式 aboutLicSheet() 打開面板，再用真點選按「刪除」
          await gotoHash(page, "#/settings", 3500); await page.evaluate(() => { if (typeof aboutLicSheet === "function") aboutLicSheet() }); await sleep(1500);
          const wb = await page.evaluate(() => { const b = document.querySelector("#alWipe,#xqDocWipe"); if (!b) return null; b.scrollIntoView({ block: "center" }); const r = b.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, t: b.innerText } });
          if (wb) { await sleep(500); const r2 = await page.evaluate(() => { const r = document.querySelector("#alWipe,#xqDocWipe").getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } }); await page.touchscreen.tap(r2.x + r2.w / 2, r2.y + r2.h / 2); R.clicks.real++; await sleep(900); mi = await modalInfo();
            rec({ action: "設定：點「🗑 刪除這支手機的全部資料」", page: "#/settings", confirm: !!mi, dialog: mi, result: mi ? "跳確認框：" + mi.text.slice(0, 40) + "（原始碼：第二層 wipeAsk2「真的要刪除嗎？」）" : "沒有確認框" });
            if (mi) { const c = mi.btns.find(b => /不要|取消|先不/.test(b.t)) || mi.btns.find(b => b.ghost) || mi.btns[mi.btns.length - 1]; await page.touchscreen.tap(c.x + c.w / 2, c.y + c.h / 2); await sleep(500) }
          } else rec({ action: "設定：刪除全部資料按鈕", page: "#/settings", confirm: null, result: "「授權與資料」面板裡找不到按鈕（改用原始碼對照：05-settings.js wipeAsk 兩次確認）" });
          // 6 同機對下：認輸
          await gotoHash(page, "#/pvp", 3500); await tapText(/^認輸$/); await sleep(900); mi = await modalInfo();
          rec({ action: "同機對下：點「認輸」", page: "#/pvp", confirm: !!mi, dialog: mi, result: mi ? "跳確認框：" + mi.text.slice(0, 40) : "沒有確認框" });
          if (mi) { const c = mi.btns.find(b => /取消/.test(b.t)); if (c) await page.touchscreen.tap(c.x + c.w / 2, c.y + c.h / 2); await sleep(500) }
        } catch (e) { R.errors.push({ size: S.id, page: "destructive", msg: String(e.message).slice(0, 200) }); log("  ！誤觸", e.message.slice(0, 120)) }
      }

      // ---------- 手勢衝突（SE、Pro Max） ----------
      if (S.id === "se" || S.id === "pm") {
        const G = (o) => { R.gestures.push({ size: S.id, ...o }); log("  手勢：", o.test, "→", o.result) };
        try {
          // 拖曳棋子用「同機對下」（兩邊都由手來下；挑戰電腦在無頭瀏覽器裡引擎可能不回應，輪不到己方）。輪到哪方就拖哪方的馬
          await gotoHash(page, "#/pvp", 3500);
          let sig0 = await boardSig(page), sc0 = await page.evaluate(() => [scrollY, document.querySelector("#view").scrollTop]);
          const blackTurn = await page.evaluate(() => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return !!(svg && svg._b && svg._b[67] === "C" && svg._b[70] == null) });   // 已走過炮二平五＝輪黑
          let a = await boardPt(page, 1, blackTurn ? 0 : 9), b = await boardPt(page, 2, blackTurn ? 2 : 7);
          const pc = await page.evaluate(() => { const svg = [...document.querySelectorAll(".view svg")].find(s => s.getAttribute("viewBox") === "0 0 560 620"); return svg && svg._b ? [svg._b[82], svg._b[65], svg._o && svg._o.me] : null });
          await touchDrag(cdp, page, a, b); await sleep(1500); const selAfter = await boardSel(page);
          let sc1 = await page.evaluate(() => [scrollY, document.querySelector("#view").scrollTop]);
          G({ test: "同機對下：棋盤上拖曳輪到的一方的馬（" + (blackTurn ? "馬2進3" : "傌八進七") + "）", result: `棋子${(await boardSig(page)) !== sig0 ? "走了" : "沒動（起點 " + JSON.stringify(pc) + "，放下後選取 " + selAfter + "）"}；頁面捲動 ${sc1[0] - sc0[0]}/${sc1[1] - sc0[1]}px`, ok: (await boardSig(page)) !== sig0 && sc1[1] === sc0[1] });
          await sleep(3500);
          // 從棋盤空格往上滑（想捲頁面）
          sig0 = await boardSig(page); sc0 = await page.evaluate(() => [document.querySelector("#view").scrollTop, document.querySelector("#view").scrollHeight - document.querySelector("#view").clientHeight]);
          a = await boardPt(page, 4, 5); await touchDrag(cdp, page, a, { x: a.x, y: a.y - 200 }); await sleep(800);
          sc1 = await page.evaluate(() => [document.querySelector("#view").scrollTop]);
          G({ test: "從棋盤空格往上滑 200px（像要捲頁面）", result: `盤面${(await boardSig(page)) !== sig0 ? "被改了（誤走棋）" : "沒變"}；頁面可捲範圍 ${sc0[1]}px，捲了 ${sc1[0] - sc0[0]}px`, ok: (await boardSig(page)) === sig0 });
          await page.evaluate(() => { document.querySelector("#view").scrollTop = 0 });
          // 左緣、右緣滑入（對局頁、首頁）
          for (const h of ["#/cpu", "#/"]) {
            await gotoHash(page, h, 3500);
            for (const side of ["左", "右"]) {
              const s0 = await stateSig(page), b0 = await boardSig(page);
              const x0 = side === "左" ? 2 : S.w - 2, x1 = side === "左" ? 160 : S.w - 160;
              await touchDrag(cdp, page, { x: x0, y: S.h * .55 }, { x: x1, y: S.h * .55 }, 12); await sleep(1500);
              const s1 = await stateSig(page), b1 = await boardSig(page);
              const what = [s1.hash !== s0.hash ? "換頁到 " + s1.hash : "", s1.modal > s0.modal ? "跳視窗" : "", s1.sheet !== s0.sheet ? "面板開關" : "", s1.kids !== s0.kids ? "浮層變化" : "", b1 !== b0 ? "盤面改變" : ""].filter(Boolean).join("、") || "App 沒反應";
              G({ test: `${h === "#/" ? "首頁" : "對局"}：從${side}緣 2px 往內滑 158px`, result: what + (side === "左" ? "（真機 iOS Safari／Android 手勢導覽會被系統當成「返回」，無頭瀏覽器模擬不到系統手勢）" : ""), ok: !/盤面改變/.test(what) });
              if (s1.hash !== s0.hash || s1.modal > s0.modal) await gotoHash(page, h, 3000);
            }
          }
          // 雙指縮放：首頁水墨圖（07x-zoom 應放大）、2D 棋盤（應不縮放整頁）
          await gotoHash(page, "#/", 3500);
          const zs = () => page.evaluate(() => { const e = document.querySelector(".zm-wrap > *, .shp-in, .shp-page.cq"); const t = e ? getComputedStyle(e).transform : ""; return { vv: visualViewport.scale, t: t.slice(0, 40) } });
          let z0 = await zs(); await pinch(cdp, { x: S.w / 2, y: S.h * .45 }, 40, 120); await sleep(800); let z1 = await zs();
          G({ test: "首頁水墨圖雙指張開", result: `整頁縮放 ${z0.vv}→${z1.vv}；圖層 transform ${z0.t || "none"} → ${z1.t || "none"}`, ok: z1.vv === 1 });
          await gotoHash(page, "#/cpu", 3500); sig0 = await boardSig(page);
          const c = await boardPt(page, 4, 4); z0 = await zs(); await pinch(cdp, c, 30, 110); await sleep(800); z1 = await zs();
          G({ test: "2D 棋盤上雙指張開", result: `整頁縮放 ${z0.vv}→${z1.vv}；盤面${(await boardSig(page)) !== sig0 ? "被改了" : "沒變"}`, ok: z1.vv === 1 && (await boardSig(page)) === sig0 });
          // 3D 場景
          if (!NO3D && S.id === "se") {
            const bb = await tapText3D(page); await sleep(9000);
            const st = await page.evaluate(() => { const cv = [...document.querySelectorAll("canvas")].filter(c => { const r = c.getBoundingClientRect(); return r.width > 200 && r.height > 200 }); return { n: cv.length, gl: cv.map(c => !!(c.getContext && (c.__gl || true))).length, hash: location.hash } });
            if (bb && st.n) {
              const cc = { x: S.w / 2, y: S.h * .45 };
              const e0 = R.errors.length; await touchDrag(cdp, page, cc, { x: cc.x + 120, y: cc.y }); await sleep(600); await pinch(cdp, cc, 40, 110); await sleep(800);
              G({ test: "3D 場景：單指橫拖＋雙指張開", result: `載到 ${st.n} 個大畫布；手勢後頁面錯誤 ${R.errors.length - e0} 個、整頁縮放 ${await page.evaluate(() => visualViewport.scale)}（3D 鏡頭是否轉動、縮放要看實機，無頭瀏覽器是軟體繪圖）`, ok: R.errors.length === e0 });
            } else G({ test: "3D 場景", result: bb ? "按了「3D 場景」但 9 秒內沒有出現大畫布（無頭瀏覽器 WebGL 可能不支援），沒測到" : "畫面上找不到「3D 場景」按鈕", ok: null });
          }
        } catch (e) { R.errors.push({ size: S.id, page: "gesture", msg: String(e.message).slice(0, 200) }); log("  ！手勢", e.message.slice(0, 120)) }
      }
      async function tapText3D(page) { const el = page.locator("button", { hasText: "3D 場景" }).first(); const bb = await el.boundingBox().catch(() => null); if (bb) { await page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); R.clicks.real++ } return bb }

      await ctx.close();
    }

    // ---------- 第 12 輪：左撇子模式（m_lefty=true）重量一次：只做靜態量測與主要動作的左右手熱區 ----------
    if (LEFTY) {
      R.lefty = {};
      for (const S of SIZES) {
        log("=== 左撇子模式", S.name);
        const { ctx, page, cdp } = await openCtx(browser, S, R, true);
        if (!R.version) R.version = await page.evaluate(() => window.XQ_BUILD || "").catch(() => "");
        R.lefty[S.id] = { name: S.name, w: S.w, h: S.h, on: await page.evaluate(() => document.documentElement.hasAttribute("data-lefty")).catch(() => false), pages: {} };
        for (const P of PAGES) {
          try {
            await setupPage(page, cdp, P);
            const { pg } = await measurePage(page, P, S, R);
            R.lefty[S.id].pages[P.id] = pg;
            log(`  ${P.name}：可點 ${pg.nUi}，觸控範圍 <44 ${pg.smallHit.length}，間距<8 ${pg.pairs.length} 對（重疊 ${pg.pairs.filter(x => x.overlap).length}），安全區 ${pg.safe.length}；左手：${pg.prim.map(x => x.L ? x.L.z : "—").join("、")}`);
            if (S.id === "se" && HAND_SHOT_PAGES.includes(P.id)) R._hand = Object.assign(R._hand || {}, { ["l:" + P.id]: (await page.screenshot()).toString("base64") });
            if (S.id === "se") {   // 左撇子模式細節截圖（觸控範圍仍 <44 的紅框）
              const k = HAND_SHOT_PAGES.indexOf(P.id); if (k >= 0) { const boxes = pg.small.map(t => { const ok = t.hw >= 44 && t.hh >= 44; return { x: t.x, y: t.y, w: t.w, h: t.h, n: ok ? `觸控${t.hw}×${t.hh}` : `${t.w}×${t.h}`, c: ok ? "#1a9e3a" : "#e00" } });
                await annotate(page, boxes, path.join(SHOTS, "B" + (SHOTNUM + 7 + k) + "-touch-lefty-" + P.id + ".png"), `${P.name}｜${S.name}｜左撇子模式｜紅框＝觸控範圍小於 44×44｜綠框＝外框小但觸控範圍已達 44｜觸控範圍 <44：${pg.smallHit.length} 個、間距 <8px：${pg.pairs.length} 對`) }
            }
          } catch (e) { R.errors.push({ size: S.id + "（左撇子）", page: P.id, msg: String(e.message).slice(0, 200) }); log("  ！", P.id, e.message.slice(0, 120)) }
        }
        await ctx.close();
      }
      if (R._hand && SIZES.some(s => s.id === "se")) await handShot(browser, R).catch(e => R.errors.push({ page: "A22", msg: String(e.message).slice(0, 200) }));
    }

    // ---------- A10 座標矩陣熱點圖（iPhone SE：首頁＋對局） ----------
    if (R._shot_home && R._shot_cpu && R.matrix["se:home"] && R.matrix["se:cpu"]) {
      const ctx = await browser.newContext({ viewport: { width: 860, height: 760 }, deviceScaleFactor: 2 });
      const pg = await ctx.newPage();
      const col = { ok: "#1a9e3a", small: "#f2b705", nested: "#e00000", board: "#1e5bd8", none: "rgba(90,90,90,.55)" };
      const svgOf = (M) => M.pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="${p[2] === "none" ? 2.5 : 4.5}" fill="${col[p[2]]}" stroke="#fff" stroke-width="${p[2] === "none" ? 0 : 1}"/>`).join("");
      const cnt = M => { const c = {}; for (const p of M.pts) c[p[2]] = (c[p[2]] || 0) + 1; return c };
      const ch = cnt(R.matrix["se:home"]), cc = cnt(R.matrix["se:cpu"]);
      const lab = c => `綠 ≥44px ${c.ok || 0}・黃 <44px ${c.small || 0}・紅 巢狀 ${c.nested || 0}・藍 棋盤格 ${c.board || 0}・灰 不可點 ${c.none || 0}`;
      await pg.setContent(`<html><body style="margin:0;background:#fff;font:13px sans-serif;color:#222"><div style="display:flex;gap:20px;padding:10px 20px">` +
        [["首頁", R._shot_home, R.matrix["se:home"], ch], ["挑戰電腦對局中", R._shot_cpu, R.matrix["se:cpu"], cc]].map(([t, img, M, c]) =>
          `<div><div style="font-weight:bold;margin-bottom:4px">${t}（iPhone SE 375×667，每 24px 一點，共 ${M.pts.length} 點）</div><div style="position:relative;width:375px;height:667px;border:1px solid #999"><img src="data:image/png;base64,${img}" style="width:375px;height:667px;opacity:.55;display:block"><svg width="375" height="667" style="position:absolute;left:0;top:0">${svgOf(M)}</svg></div><div style="margin-top:4px;font-size:12px">${lab(c)}</div></div>`).join("") +
        `</div><div style="padding:0 20px;font-size:12px;color:#555">象棋千秋 ${R.version}｜touch-stress.js｜elementsFromPoint 命中最上層可點元素：綠＝夠大、黃＝小於 44×44、紅＝點下去冒泡經過 ≥2 個 onclick、藍＝棋盤格（整個棋盤 svg 依座標換算最近的交叉點）、灰＝沒有可點元素</div></body></html>`);
      await sleep(500); await pg.screenshot({ path: path.join(SHOTS, MATRIX_SHOT + ".png"), fullPage: true });
      await ctx.close();
    }
  } finally {
    await browser.close();   // 一定關掉瀏覽器，不留背景程序
  }
  delete R._shot_home; delete R._shot_cpu; delete R._hand;
  R.preSkips = PRE_SKIPS;
  R.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(OUTDIR, "touch-stress.json"), JSON.stringify(R, null, 1));
  fs.writeFileSync(path.join(OUTDIR, "touch-stress-tables.md"), tables(R));
  log(`完成：靜態量測 ${R.clicks.static} 個元素／點，真點選 ${R.clicks.real} 次；頁面錯誤 ${R.errors.length}`);
})().catch(e => { console.error(e); process.exitCode = 1 });

// ---------- 統計表（Markdown） ----------
function tables(R) {
  const L = [];
  L.push(`<!-- touch-stress.js 自動產生：${R.finishedAt}，版本 ${R.version}，${R.browser} -->`);
  for (const sid in R.sizes) {
    const S = R.sizes[sid]; L.push(`\n#### ${S.name}（DPR ${S.dsf}，模擬安全區 上 ${S.inset.top}／下 ${S.inset.bottom}px）\n`);
    L.push("| 頁面 | 可點元素 | 棋盤格（最小） | <44×44 | 觸控範圍 <44 | 其中 <24 | 間距 <8px（對） | 其中重疊 | 左右 16px 內 | 安全區內 | 上 1/3 | 中段 | 下 1/3 |");
    L.push("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|");
    for (const pid in S.pages) { const p = S.pages[pid], z = p.zoneCount || {};
      L.push(`| ${p.name} | ${p.nUi} | ${p.nBoard ? p.nBoard + "（" + p.boardCell.join("×") + "）" : "—"} | ${p.small.length} | ${(p.smallHit || p.small).length} | ${p.small.filter(t => /嚴重/.test(t.sev)).length} | ${p.pairs.length} | ${p.pairs.filter(x => x.overlap).length} | ${p.edge.length} | ${p.safe.length} | ${(z["上 1/3（難及）"] || 0) + (z["頂端角落（難及）"] || 0)} | ${z["中段（尚可）"] || 0} | ${z["下 1/3（易及）"] || 0} |`) }
  }
  L.push("\n#### 主要動作的拇指熱區\n");
  L.push("| 頁面 | 主要動作 | " + Object.keys(R.sizes).map(s => R.sizes[s].name.split("（")[0]).join(" | ") + " |");
  L.push("|---|---|" + Object.keys(R.sizes).map(() => "---").join("|") + "|");
  const first = Object.keys(R.sizes)[0];
  for (const pid in (first ? R.sizes[first].pages : {})) { const ps = R.sizes[first].pages[pid];
    ps.prim.forEach((pr, k) => { L.push(`| ${ps.name} | ${pr.text} | ` + Object.keys(R.sizes).map(s => { const q = (R.sizes[s].pages[pid] || { prim: [] }).prim[k]; return q ? q.zone : "—" }).join(" | ") + " |") }) }
  if (R.lefty) {   // 第 12 輪：左右手拇指熱區（主要動作；一般模式右手／一般模式左手／左撇子模式左手）
    L.push("\n#### 主要動作的左右手拇指熱區（第 12 輪）\n");
    L.push("| 尺寸 | ① 一般模式・右手 | ② 一般模式・左手 | ③ 左撇子模式・左手 |"); L.push("|---|---|---|---|");
    const f = x => `易及 ${x.易及}／尚可 ${x.尚可}／難及 ${x.難及}`;
    for (const sid in R.lefty) L.push(`| ${R.lefty[sid].name} | ${f(handCount((R.sizes[sid] || {}).pages, "R"))} | ${f(handCount((R.sizes[sid] || {}).pages, "L"))} | ${f(handCount(R.lefty[sid].pages, "L"))} |`);
    for (const sid0 in R.lefty) {
      L.push(`\n逐項（${R.lefty[sid0].name}；括號是到拇指轉軸的加權距離 px）：\n`); L.push("| 頁面 | 主要動作 | ① 一般・右手 | ② 一般・左手 | ③ 左撇子・左手 |"); L.push("|---|---|---|---|---|");
      for (const pid in R.lefty[sid0].pages) { const l = R.lefty[sid0].pages[pid], n = (R.sizes[sid0] || { pages: {} }).pages[pid];
        l.prim.forEach((pr, k) => { const q = n && n.prim[k]; const z = x => x ? x.z + "（" + x.d + "）" : "—"; L.push(`| ${l.name} | ${pr.text} | ${z(q && q.R)} | ${z(q && q.L)} | ${z(pr.L)} |`) }) }
    }
    L.push("\n#### 左撇子模式的觸控統計\n");
    L.push("| 尺寸 | 可點元素 | 觸控範圍 <44 | 間距 <8px（對） | 其中重疊 | 安全區內 |"); L.push("|---|---:|---:|---:|---:|---:|");
    for (const sid in R.lefty) { const P = Object.values(R.lefty[sid].pages), sum = g => P.reduce((a, p) => a + g(p), 0);
      L.push(`| ${R.lefty[sid].name} | ${sum(p => p.nUi)} | ${sum(p => p.smallHit.length)} | ${sum(p => p.pairs.length)} | ${sum(p => p.pairs.filter(x => x.overlap).length)} | ${sum(p => p.safe.length)} |`) }
  }
  return L.join("\n") + "\n";
}
