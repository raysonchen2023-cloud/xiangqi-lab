// 11/12 無障礙（評比循環第 3 輪「無障礙專家」P16）的自動測試，不開瀏覽器：
//   ① 棋盤格 aria-label（m/11b-a11y.js axmCellLabel）：「紅方 炮，八路，第三排」，跟著法的路數一致（紅炮在 h2＝炮二）
//   ② 每步念法（axmMoveLine）：「你走 炮二平五」「電腦走 馬8進7；輪到你」，吃子、將軍、將死
//   ③ 對比計算（app 的 axmContrast、稽核的 contrast）跟 WCAG 範例一致；高對比主題每一組色碼 7:1 以上，m.css 那段跟 axmHcv() 一樣
//   ④ 稽核腳本（a11y-audit.js）在乾淨範例上 0 個問題，髒範例每一類都抓得到；整個 App 的問題數不比修前多
//   ⑤ 字級（超大、最大、跟著系統）、棋鐘提醒、圖示按鈕名字、模組有 include、螢幕報讀模式會讓 focusOn() 打開
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const AX = rd(path.join(M, "11b-a11y.js")), S = rd(path.join(M, "05-settings.js")), B = rd(path.join(M, "01-board.js")), CSS = rd(path.join(DB, "m.css"));
const C = require("../site/core.js"), A = require("./a11y-audit.js");
function load() {
  const i = AX.indexOf("#AXM-PURE-BEGIN"), j = AX.indexOf("/* #AXM-PURE-END */");
  assert.ok(i > 0 && j > i, "找不到 #AXM-PURE 區段");
  const src = AX.slice(AX.indexOf("\n", i) + 1, j), fz = S.match(/const FZ_STEPS=\[[^\n]*?\]\];/);
  assert.ok(fz, "找不到 FZ_STEPS");
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(src + "\n" + fz[0] + ";this.R={axmCellLabel,axmPcName,axmPos,axmMoveLine,axmContrast,axmLum,axmHcv,axmHcb,axmSysScale,axmFzNear,axmClockSec,axmClockSay,axmIconName,FZ_STEPS}", ctx, { filename: "11b-a11y(純函式)" });
  return ctx.R;
}
const R = load(), sq = C.parseSq;

// ====================== ① 棋盤格 aria-label ======================
test("axmCellLabel：紅方 炮，八路，第三排；空格；黑子", () => {
  assert.equal(R.axmCellLabel("C", 7 * 9 + 1), "紅方 炮，八路，第三排");
  assert.equal(R.axmCellLabel(null, 7 * 9 + 1), "八路，第三排，空");
  assert.equal(R.axmCellLabel("n", 0), "黑方 馬，九路，第十排");
  assert.equal(R.axmCellLabel("K", 89 - 4), "紅方 帥，五路，第一排");
});
test("棋盤格念的路數跟著法一致：開局紅炮在 h2＝炮二、紅傌在 b0＝傌八", () => {
  const b = C.parseFen(C.START.split(" ")[0]);
  assert.equal(R.axmCellLabel(b[sq("h2")], sq("h2")), "紅方 炮，二路，第三排");
  assert.equal(R.axmCellLabel(b[sq("b0")], sq("b0")), "紅方 傌，八路，第一排");
  assert.match(C.notate(b, sq("h2"), sq("e2")), /^炮二/);
  assert.match(C.notate(b, sq("b0"), sq("c2")), /^傌八/);
});
test("〔原始碼〕01-board 的格子說明用 axmCellLabel（翻轉時用畫面上的格子編號 k）", () => {
  assert.match(B, /typeof axmCellLabel==="function"\?axmCellLabel\(p,k\)/);
  assert.match(B, /typeof axmMoveLine==="function"/);
  assert.match(B, /axmRing\(svg\)/);
});

// ====================== ② 每步念法 ======================
test("axmMoveLine：你走／電腦走；輪到你；吃子、將軍、將死；看棋譜用紅方黑方", () => {
  let b = C.parseFen(C.START.split(" ")[0]);
  const cn1 = C.notate(b, sq("h2"), sq("e2")); b = C.make(b, sq("h2"), sq("e2"));
  const cn2 = C.notate(b, sq("h9"), sq("g7"));
  assert.equal(R.axmMoveLine({ side: "r", me: "r", cn: cn1 }), "你走 炮二平五");
  assert.equal(R.axmMoveLine({ side: "b", me: "r", cn: cn2, opp: "電腦" }), "電腦走 馬8進7；輪到你");
  assert.equal(R.axmMoveLine({ side: "b", me: "r", cn: "車1平2", cap: "P", check: true, opp: "電腦" }), "電腦走 車1平2，吃紅方 兵，將軍；輪到你");
  assert.equal(R.axmMoveLine({ side: "r", me: "r", cn: "炮五進四", cap: "p" }), "你走 炮五進四，吃黑方 卒");
  assert.equal(R.axmMoveLine({ side: "b", me: "r", cn: "車2進9", check: true, mate: true }), "對方走 車2進9，將死");
  assert.equal(R.axmMoveLine({ side: "r", cn: "炮二平五" }), "紅方走 炮二平五");
  assert.equal(R.axmMoveLine({ side: "r", me: "b", cn: "炮二平五", over: true }), "對方走 炮二平五");
});

// ====================== ③ 對比 ======================
test("對比計算：黑白 21:1、#777 對白 4.48:1、同色 1:1（app 與稽核腳本一致）", () => {
  for (const f of [R.axmContrast, A.contrast]) {
    assert.ok(Math.abs(f("#000000", "#FFFFFF") - 21) < 1e-9);
    assert.ok(Math.abs(f("#777777", "#FFFFFF") - 4.478) < .01);
    assert.ok(Math.abs(f("#B5452B", "#B5452B") - 1) < 1e-9);
  }
  assert.ok(Math.abs(A.contrast("#fff", "rgba(0,0,0,.5)", "#000") - A.contrast("#fff", "#000")) < 1e-9, "半透明黑疊在黑上＝黑");
  assert.deepEqual(A.parseColor("#abc"), [170, 187, 204, 1]);
  assert.deepEqual(A.parseColor("rgba(10,20,30,.5)"), [10, 20, 30, .5]);
});
test("高對比主題：文字、按鈕、棋盤線、棋子字都 7:1 以上", () => {
  const V = R.axmHcv(), H = R.axmHcb(), k = (a, b) => R.axmContrast(a, b);
  for (const c of ["ink", "muted", "accent", "accent2", "red", "blk", "warn", "info", "line"]) assert.ok(k(V[c], V.bg) >= 7, c + " 對底色 " + k(V[c], V.bg).toFixed(2));
  assert.ok(k("#FFFFFF", V.btn) >= 7, "主按鈕白字");
  assert.ok(k(V.barink, V.bar) >= 7, "頂欄");
  assert.ok(k(H.grid, H.bg[0]) >= 7, "棋盤線");
  assert.ok(k(H.r, H.piece) >= 7, "紅子字");
  assert.ok(k("#FFFFFF", "#111111") >= 7, "黑子反白字");
  assert.ok(k(H.mv, H.bg[0]) >= 7, "上一步記號");
});
test("〔混合〕m.css 的高對比段跟 axmHcv() 同一組色碼，而且標註 11/12 無障礙", () => {
  const i = CSS.indexOf("11/12 無障礙");
  assert.ok(i > 0, "m.css 沒有 11/12 無障礙 段");
  const m = CSS.slice(i).match(/html\[data-hct\]\{([^}]*)\}/); assert.ok(m, "找不到 html[data-hct]{…}");
  const vars = Object.fromEntries(m[1].split(";").map(x => x.split(":")).filter(x => x.length === 2).map(([a, b]) => [a.trim(), b.replace("!important", "").trim()]));
  const map = { bg: "--bg", card: "--card", ink: "--ink", muted: "--muted", line: "--line", accent: "--accent", accent2: "--accent2", red: "--red", blk: "--blk", warn: "--warn", info: "--info", bar: "--bar", barink: "--barink", btn: "--btn-main" };
  for (const [k, v] of Object.entries(map)) assert.equal(vars[v], R.axmHcv()[k], v);
});

// ====================== ④ 稽核腳本 ======================
const CLEAN_HTML = `<!doctype html><html><body>
<div class="topbar"><button class="ib" aria-label="返回">‹</button><h1>標題</h1></div>
<button>開始下棋</button><button aria-label="關閉">✕</button><button><span class="ic" aria-hidden="true">🏠</span>首頁</button>
<img src="a.webp" alt="棋盤"><img src="b.webp" alt="">
<div class="card" role="button" tabindex="0" style="cursor:pointer">點我</div>
<script>const b=document.createElement("button");b.textContent="✕";b.setAttribute("aria-label","關閉");
const t=\`<button data-k="\${k}">\${l}</button><span style="color:#000;background:#fff">字</span>\`;</script>
</body></html>`;
const CLEAN_CSS = `:root{--bg:#FFFFFF;--ink:#111111}
.a{color:var(--ink);background:var(--bg)}
.b{color:#fff;background:#8A1C00}
.c{color:#B5452B;background:#B5452B22}
.c{color:#7A2A16}
.d{color:#fff;background:rgba(0,0,0,.5)}
@keyframes k{0%{color:#eee;background:#fff}}`;
test("稽核腳本：乾淨範例 0 個問題", () => {
  const mk = A.auditMarkup(CLEAN_HTML, { file: "clean.html" }), cs = A.auditCss(CLEAN_CSS);
  assert.deepEqual(mk.issues, [], JSON.stringify(mk.issues));
  assert.deepEqual(cs.issues, [], JSON.stringify(cs.issues));
  assert.equal(cs.over.length, 1, "半透明底列為待實機量，不算問題");
});
test("稽核腳本：髒範例每一類都抓得到", () => {
  const dirty = `<button class="x">✕</button><img src="a.webp"><div class="card" style="cursor:pointer">點</div><span role="button" aria-label="看">i</span>
<span style="color:#999;background:#fff">淡字</span>
<script>const q=document.createElement("button");q.textContent="⚙";</script>`;
  const mk = A.auditMarkup(dirty, { file: "dirty.html" }), kinds = mk.issues.map(x => x.kind).sort();
  assert.deepEqual(kinds, ["click-norole", "contrast", "icon-button", "img-alt", "js-icon-button", "role-notab"]);
  const cs = A.auditCss(`.a{color:#fff;background:#D4A017}.b{color:#fff;font-size:28px;background:#B5452B}`);
  assert.deepEqual(cs.issues.map(x => x.sel), [".a"], "大字 3:1 就夠");
});
test("整個 App：稽核跑得完，問題數不比修前多", () => {
  const Rr = A.runAudit();
  assert.ok(Rr.total >= 0 && Rr.css.checked > 50);
  const base = path.join(__dirname, "a11y-baseline.json");
  if (fs.existsSync(base)) { const Bs = JSON.parse(fs.readFileSync(base, "utf8")); assert.ok(Rr.total <= Bs.total, `修前 ${Bs.total}、現在 ${Rr.total}`) }
  assert.equal(Rr.count.contrast, 0, JSON.stringify(Rr.issues.filter(x => x.kind === "contrast")));
});

// ====================== ⑤ 字級、棋鐘、圖示、接線 ======================
test("字級：多超大 1.6、最大 2.0；系統字級換算與最接近的檔位", () => {
  const Z = Object.fromEntries(R.FZ_STEPS.map(x => [x[0], x[2]]));
  assert.equal(Z.xxl, 1.6); assert.equal(Z.max, 2); assert.equal(R.FZ_STEPS.find(x => x[0] === "max")[1], "最大");
  assert.equal(R.axmSysScale(17, 17), 1); assert.equal(R.axmSysScale(23, 17), 1.35); assert.equal(R.axmSysScale(53, 17), 2); assert.equal(R.axmSysScale(12, 17), .9); assert.equal(R.axmSysScale(0, 17), 1);
  assert.equal(R.axmFzNear(1.35, R.FZ_STEPS), "xl"); assert.equal(R.axmFzNear(1.7, R.FZ_STEPS), "xxl"); assert.equal(R.axmFzNear(2, R.FZ_STEPS), "max");
  assert.match(S, /fzSysOn\(\)&&typeof axmSysFz==="function"/);
  assert.match(S, /\["l","xl","xxl","max"\]\.includes\(r\.dataset\.fz\)/);
});
test("〔混合〕跟著系統字級（11/12 開發者：自動跟著）：沒選過字級、沒動過開關就算開著；選了字級或關掉就照玩家的", () => {
  const src = (S.match(/function fzSysOn\(\)\{[^\n]*\}/) || [])[0];
  assert.ok(src, "05-settings.js 找不到 fzSysOn");
  const on = st => new Function("store", src + ";return fzSysOn()")({ get: (k, d) => k in st ? st[k] : d });
  assert.equal(on({}), true, "新玩家：自動跟著手機字級");
  assert.equal(on({ fontSize: "l" }), false, "自己在 App 選過字級：照選的");
  assert.equal(on({ fontSize: "n" }), false, "選過標準也算選過");
  assert.equal(on({ fzSys: false }), false, "自己關掉開關");
  assert.equal(on({ fzSys: true, fontSize: "l" }), true, "自己打開開關：跟著系統");
  assert.doesNotMatch(AX, /store\.get\("fzSys",false\)/, "11b 不能再直接讀 fzSys 預設關");
  assert.match(AX, /closest\("button\[data-fz\]"\);if\(!b\)return;store\.set\("fzSys",false\)/, "按字級按鈕就關掉跟著系統");
});
test("〔原始碼〕放大後貼邊的場景標籤推回畫面內（11/12 iPhone 實測官階、棋子聲被切掉；已在正式站注入驗證 440 寬、最大字級全在 2～438px）", () => {
  assert.match(S, /function fzPull\(L,P\)\{const pr=P\.getBoundingClientRect\(\),l=Math\.max\(pr\.left,0\)\+2,rr=Math\.min\(pr\.right,innerWidth\)-2/);
  assert.match(S, /for\(let n=0;n<5;n\+\+\)\{fzPull\(L,P\);/, "每輪檢查疊到之前先推回");
  assert.match(S, /document\.querySelectorAll\("\.shp-page"\)\.forEach\(P=>\{const L=\[\.\.\.P\.querySelectorAll\("\.shp-spot,\.shp-hs"\)\][^\n]*if\(L\.length\)fzPull\(L,P\)\}\);return\}/, "標準字級也把貼邊標籤推回（第 5 輪 B10 段位牌被切；fzPull 會先把上次推的拿掉再量）");
  assert.match(S, /const go=\(\)=>\{if\(t\)return;/, "標準字級換頁、轉向也要重量（不再只在放大字級時）");
  assert.doesNotMatch(S.match(/function fzPull[^\n]*\n[^\n]*\n[^\n]*/)[0], /style\.translate/, "translate 被港口視差、角色讓位用掉，不能拿來推");
});
test("棋鐘：跨過 5 分、1 分、30 秒、10 秒才念", () => {
  assert.equal(R.axmClockSec("4:59"), 299); assert.equal(R.axmClockSec("0:09"), 9); assert.equal(R.axmClockSec("1:02:03"), 3723); assert.equal(R.axmClockSec("—"), null);
  assert.equal(R.axmClockSay(301, 300), "你的時間剩 5 分鐘");
  assert.equal(R.axmClockSay(61, 59, "對手"), "對手的時間剩 1 分鐘");
  assert.equal(R.axmClockSay(31, 30), "你的時間剩 30 秒");
  assert.equal(R.axmClockSay(11, 10), "你的時間剩 10 秒");
  assert.equal(R.axmClockSay(45, 44), ""); assert.equal(R.axmClockSay(10, 15), ""); assert.equal(R.axmClockSay(null, 9), "");
});
test("圖示按鈕名字：title 優先、常見圖示有名字、看不懂的不亂取", () => {
  assert.equal(R.axmIconName("✕"), "關閉"); assert.equal(R.axmIconName(" ⚙️ "), "設定"); assert.equal(R.axmIconName("🔇", "聲音"), "聲音");
  assert.equal(R.axmIconName("🦄"), null); assert.equal(R.axmIconName(""), null);
});
test("〔原始碼〕接線：m.html include 11b-a11y.js；螢幕報讀模式讓 focusOn() 打開；設定頁有開關；名稱不撞", () => {
  assert.match(rd(path.join(DB, "m.html")), /^\/\/#include m\/11b-a11y\.js$/m);
  assert.match(S, /function focusOn\(\)\{try\{return!!store\.get\("focusBoard",false\)\|\|!!store\.get\("axMode",false\)/);
  assert.match(S, /typeof axmSetRows==="function"\?axmSetRows\(\):""/);
  assert.match(S, /typeof axmFzSysRow==="function"\?axmFzSysRow\(\):""/);
  const others = fs.readdirSync(M).filter(f => /\.js$/.test(f) && f !== "11b-a11y.js").map(f => rd(path.join(M, f))).join("\n");
  const decl = [...AX.matchAll(/^(?:const|let|function)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1]);
  for (const n of decl) assert.ok(!new RegExp("(?:const|let|var|function)\\s+" + n.replace(/\$/g, "\\$") + "\\b").test(others), "撞名：" + n);
});
