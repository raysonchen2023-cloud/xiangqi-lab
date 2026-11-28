// W198／W128／W162（外部審核第 12 項、第 22 輪 Apple、11/26 外部複審）：迷宮殘局棋盤對報讀器是一張圖，90 格不能逐格聚焦落子；屏風馬女塾兩顆箭頭鈕沒有名稱。
// 檢查：用 vm 跑真的 07z9m-maze.js 殘局那段畫棋盤的程式（假的 DOM 換成字串），90 格都是 role=button、有各自的名稱、一次只有一格 tabindex=0；
// 格線、棋子、虛線框 aria-hidden；鍵盤：方向鍵移焦點、Enter 送點選；屏風馬女塾 ‹ › 有 aria-label；改壞驗證。
// 用法 node --test xiangqi-lab/tools/test-jh-maze-a11y-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const M = (f) => fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m", f), "utf8").replace(/\r\n/g, "\n");
const MAZE = M("07z9m-maze.js"), SCR = M("07z9c-screen.js"), A11Y = M("11b-a11y.js");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "找不到 " + a.slice(0, 40)); return src.slice(i, j + b.length) };

/* 從 draw() 抽出「組 SVG 字串」那段，在假的環境裡跑：回傳 SVG 字串 */
function drawSvg(src, st) {
  const body = cut(src, "const draw=()=>{const Z=40", 'bd.innerHTML=s+"</svg>";');
  const fn = new Function("pcs", "sel", "last", "axK", "S", "id", "won", "now", "jhMzSq", "jhMzGrid", "JH_MZ_PN", "jhL", "esc", "o", "axmCellLabel", "AX_SUF", "i18nLang", "document",
    body.replace("const draw=()=>{", "").replace('bd.innerHTML=s+"</svg>";', 'return s+"</svg>";'));
  /* 只抽念格子名稱要用的那幾個函式（整支 11b 頂層會碰 DOM） */
  const fns = ["axmCN", "axmPN", "axmSide", "axmPcName", "axmPos", "axmCellLabel"].map((n) => { const m = A11Y.match(new RegExp("^function " + n + "\\([^\\n]*$", "m")); assert.ok(m, "11b 找不到 " + n); return m[0] }).join("\n");
  const A = new Function("NAMES", fns + "\nreturn{axmCellLabel};")(undefined);
  const sq = (s) => ({ c: s.charCodeAt(0) - 97, r: 9 - +s[1] });
  const box = { contains: () => false };
  return fn(st.pcs, st.sel || null, st.last || null, st.axK == null ? 85 : st.axK, { hintOn: st.hint ? "door" : null }, "door", false, () => "e0e1", sq, () => "<path d=\"grid\"/>",
    { r: { K: "帥", R: "俥", P: "兵", C: "炮", N: "傌", B: "相", A: "仕" }, b: { k: "將", r: "車", p: "卒", c: "砲", n: "馬", b: "象", a: "士" } }, (z) => z, (x) => String(x).replace(/"/g, "&quot;"),
    { querySelector: () => box }, (p, k) => A.axmCellLabel(p, k), [["，已選取", "", "", "", "", "，剛走到這裡"], [", selected", "", "", "", "", ", just moved here"]], () => "zh", { activeElement: null });
}
const attrs = (svg) => [...svg.matchAll(/<rect [^>]*role="button"[^>]*>/g)].map((m) => m[0]);
const lbl = (r) => (r.match(/aria-label="([^"]*)"/) || [])[1];

function checkBoard(src) {
  const pcs = [{ p: "K", c: 4, r: 9 }, { p: "R", c: 0, r: 9 }, { p: "k", c: 4, r: 0 }];
  const svg = drawSvg(src, { pcs, sel: { c: 0, r: 9 }, last: [{ c: 3, r: 0 }, { c: 4, r: 0 }] });
  assert.match(svg, /^<svg [^>]*role="group"/, "整盤是可以點選的 group，不是一張圖");
  assert.doesNotMatch(svg.slice(0, 200), /role="img"/);
  const R = attrs(svg);
  assert.equal(R.length, 90, "90 格都是 role=button");
  assert.equal(new Set(R.map(lbl)).size, 90, "90 格的名稱都不一樣");
  assert.equal(R.filter((r) => /tabindex="0"/.test(r)).length, 1, "一次只有一格 tabindex=0");
  assert.equal(lbl(R.find((r) => /tabindex="0"/.test(r))), "紅方 帥，五路，第一排", "預設焦點在帥");
  assert.equal(lbl(R.find((r) => /data-c="0" data-r="9"/.test(r))), "紅方 俥，九路，第一排，已選取", "選取的格子加後綴");
  assert.equal(lbl(R.find((r) => /data-c="4" data-r="0"/.test(r))), "黑方 將，五路，第十排，剛走到這裡", "剛走到的格子加後綴");
  assert.equal(lbl(R.find((r) => /data-c="1" data-r="5"/.test(r))), "八路，第五排，空", "空格有位置名稱");
  assert.match(svg, /<g aria-hidden="true"><path d="grid"\/><\/g>/, "格線 aria-hidden");
  for (const g of svg.matchAll(/<g data-c="\d" data-r="\d"[^>]*>/g)) assert.match(g[0], /aria-hidden="true"/, "棋子 aria-hidden");
  for (const r of svg.matchAll(/<rect [^>]*stroke-dasharray[^>]*>/g)) assert.match(r[0], /aria-hidden="true"/, "虛線框 aria-hidden");
}
test("迷宮殘局棋盤：90 格是 role=button、名稱各不相同、一次一格 tabindex=0、選取和剛走到有後綴；格線、棋子、虛線框 aria-hidden", () => checkBoard(MAZE));

test("迷宮殘局棋盤：提示亮起時，那顆子的名稱說要動它；焦點照 axK", () => {
  const svg = drawSvg(MAZE, { pcs: [{ p: "K", c: 4, r: 9 }, { p: "R", c: 4, r: 8 }], hint: true, axK: 13 });
  const R = attrs(svg);
  assert.match(lbl(R.find((r) => /data-c="4" data-r="9"/.test(r))), /提示要動這顆/, "now() 回 e0e1：e0＝(4,9) 那顆");
  assert.match(R.find((r) => /tabindex="0"/.test(r)), /data-c="4" data-r="1"/, "axK＝13 → 第 1 列第 4 欄");
});

function checkKeys(src) {
  const blk = cut(src, 'sv.addEventListener("keydown"', "if(n)n.focus()});");
  assert.match(blk, /ev\.key==="Enter"\|\|ev\.key===" "/, "Enter／空白鍵＝點這一格");
  assert.match(blk, /ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9/, "方向鍵移焦點");
  assert.match(blk, /k%9===0\)\|\|\(d===1&&k%9===8\)\|\|k\+d<0\|\|k\+d>89/, "邊界不跨行");
  assert.match(src, /if\(fo\)\{const n=sv\.querySelector\(`rect\[data-c="\$\{axK%9\}"\]\[data-r="\$\{axK\/9\|0\}"\]`\);if\(n\)n\.focus\(\)\}/, "重畫後焦點回到剛才那一格");
}
test("〔原始碼〕迷宮殘局棋盤的鍵盤：方向鍵移焦點、Enter／空白鍵點選、不跨行、重畫後焦點回來", () => checkKeys(MAZE));

test("〔原始碼〕屏風馬女塾課堂的 ‹ › 有用途名稱（上一步／下一步，中英）", () => {
  assert.match(SCR, /id="jhEp" aria-label="\$\{esc\(jhL\("上一步","Previous move"\)\)\}">‹<\/button>/);
  assert.match(SCR, /id="jhEx" aria-label="\$\{esc\(jhL\("下一步","Next move"\)\)\}">›<\/button>/);
});

test("改壞驗證：退回一張圖、格子共用名稱、全部 tabindex=0、棋子沒藏、拿掉方向鍵，都會被抓到", () => {
  const bad = [
    ["退回一張圖", MAZE.replace('role="group" aria-label="${esc(jhL("象棋殘局棋盤', 'role="img" aria-label="${esc(jhL("象棋殘局棋盤'), checkBoard],
    ["格子共用名稱", MAZE.replace('aria-label="${esc(lab(c,r))}"', 'aria-label="格子"'), checkBoard],
    ["全部 tabindex=0", MAZE.replace('tabindex="${r*9+c===axK?0:-1}"', 'tabindex="0"'), checkBoard],
    ["棋子沒藏", MAZE.replace('data-r="${q.r}" aria-hidden="true"><circle', 'data-r="${q.r}"><circle'), checkBoard],
    ["拿掉方向鍵", MAZE.replace("ArrowLeft:-1,ArrowRight:1,ArrowUp:-9,ArrowDown:9", "ArrowLeft:-1"), checkKeys],
  ];
  for (const [why, f, fn] of bad) { assert.notEqual(f, MAZE, why + "：改壞沒套上"); assert.throws(() => fn(f), why) }
});
