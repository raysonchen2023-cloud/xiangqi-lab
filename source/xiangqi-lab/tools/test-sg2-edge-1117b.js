// 第 3 輪（11/17）星門圍城：
//   N3-1（P3，測試員 B，390×844、難 1）：敵車在 71（最右一路），點我方相 87：預覽「防19→13」是 x 353～410（畫面到 390）只看得到「防19→1」；
//     打下去跳字「打不動・防 19→13」也貼右緣、蓋住旁邊的炮。
//     原因：預覽一律掛在棋子右上（CSS margin 往右 .46 格）；跳字以棋子正中為中心，只照整個畫面收邊（07bht bhtdFloat）。
//     修法：07sg2 sg2PvXY 讓預覽掛在往棋盤中間那一側的上方、收進棋盤框（sg2Box：平面＝棋盤外框∩#bbox∩畫面、3D＝#bbox∩畫面）；07bhg gsvFrame 平面、3D 都走它；
//       跳字 sg2Float：浮在那顆子上方 .58 格（3D 用頭頂），太靠上改到下方，收進棋盤框。
//   P3（測試員 D，English 375×812）：頂欄「Star Gate Siege · Prologue A1」只剩「Star」。對局中標題可以換兩行、字小一點；英文 480px 以下返回鈕只留「‹」、視角鈕只留 👁。
// 不開瀏覽器：vm 載 07bhg＋07sg2，用回報的座標推（390 寬、棋盤 0～390、格距約 41.8）。用法：node --test xiangqi-lab/tools/test-sg2-edge-1117b.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const SG2SRC = rd("xiangqi-db/m/07sg2-siege2.js"), GSVSRC = rd("xiangqi-db/m/07bhg-gatesiege.js");
const noCm = s => s.replace(/\/\*[\s\S]*?\*\//g, "");
const SCSS = noCm(SG2SRC.slice(SG2SRC.indexOf("function sg2Css(){"), SG2SRC.indexOf("`;document.head.append(s)}", SG2SRC.indexOf("function sg2Css(){"))));

/* 390×844 直式量到的版面：#bbox 0～390、139～654；棋盤 k＝.696（格距 41.8），第 0 列 y≈208、第 0 行 x≈27.9 */
const K_ = .6964, OX = 0, OY = 139 + (515 - 620 * K_) / 2, CELL = 60 * K_;
const xyFlat = q => ({ x: OX + (40 + q % 9 * 60) * K_, y: OY + (40 + (q / 9 | 0) * 60) * K_ });
function kit(o) {
  o = o || {}; const els = [];
  const mkEl = () => ({ className: "", style: {}, textContent: "", offsetWidth: o.fw || 130, offsetHeight: 22, remove() { } });
  const document = { getElementById: id => id === "bbox" ? { getBoundingClientRect: () => ({ left: 0, right: 390, top: 139, bottom: 654, width: 390 }) } : null,
    createElement: () => { const e = mkEl(); els.push(e); return e }, body: { append() { } } };
  const ctx = { console, Math, JSON, Date, store: { get: (k, d) => d, set() { } }, toast() { }, vibrate() { }, esc: s => String(s), setTimeout: () => 0,
    innerWidth: 390, innerHeight: 844, bhtdXY: xyFlat, document };
  vm.createContext(ctx);
  vm.runInContext(GSVSRC + "\n" + SG2SRC + "\n;this.__X={sg2Box,sg2Fit,sg2PvXY,sg2Float,sg2Ev};", ctx);
  return { X: ctx.__X, els };
}

test("〔N3-1〕棋盤框：直式平面＝棋盤外框（0～390）", () => {
  const B = kit().X.sg2Box(false);
  assert.ok(B.l >= 0 && B.l < 1 && B.r <= 390 && B.r > 389, JSON.stringify(B)); assert.ok(B.t > 139 && B.b < 654, "上下是棋盤外框，不是整個 #bbox");
});

test("〔N3-1〕回報的那顆：敵車在 71（最右一路），預覽寬 57px 不再超出 390；掛在左上（往棋盤中間）", () => {
  const { X } = kit(), B = X.sg2Box(false), p = xyFlat(71), w = 57, h = 15, P = X.sg2PvXY(p, CELL, w, h, B);
  assert.ok(p.x + CELL * .46 + w / 2 > 390, "改之前（一律掛右上）會超出畫面：" + (p.x + CELL * .46 + w / 2));
  assert.ok(P.x + w / 2 <= 390 && P.x - w / 2 >= 0, "左右都在畫面內：" + (P.x - w / 2) + "～" + (P.x + w / 2));
  assert.ok(P.x < p.x, "掛在那顆子的左邊"); assert.ok(P.y < p.y, "掛在上方");
});

test("〔N3-1〕左緣也一樣：最左一路掛右上；很寬的標籤（合力防119→100）也收進棋盤", () => {
  const { X } = kit(), B = X.sg2Box(false);
  for (const q of [63, 0, 81]) { const p = xyFlat(q), P = X.sg2PvXY(p, CELL, 57, 15, B); assert.ok(P.x > p.x && P.x - 28.5 >= B.l, q + ""); }
  for (let q = 0; q < 90; q++) { const P = X.sg2PvXY(xyFlat(q), CELL, 90, 15, B); assert.ok(P.x - 45 >= B.l - .01 && P.x + 45 <= B.r + .01 && P.y - 7.5 >= B.t - .01, "第 " + q + " 格") }
  const N = X.sg2Fit(100, 100, 300, 10, { l: 0, r: 390, t: 0, b: 800 }); assert.equal(N.x, 195, "比棋盤還寬就置中");
});

test("〔N3-1〕跳字：浮在那顆子上方（不蓋左右的子）、收進棋盤；最上排改到下方", () => {
  const K = kit(), p = xyFlat(71);
  assert.equal(K.X.sg2Float("打不動・防 19→13", 71, "info sg2no"), true); const d = K.els.pop();
  const x = parseFloat(d.style.left), y = parseFloat(d.style.top), hw = 130 * 1.15 / 2;
  assert.ok(x + hw <= 390, "右緣不超出：" + (x + hw)); assert.ok(x < p.x, "往內收");
  assert.ok(Math.abs(y - (p.y - CELL * .58)) < .01, "在那顆子上方 .58 格"); assert.equal(d.className, "bt-fl info sg2no");
  K.X.sg2Float("−12", 4, "dmg"); const d2 = K.els.pop(); assert.ok(parseFloat(d2.style.top) > xyFlat(4).y, "第 0 排上面放不下就放下方");
});

test("〔N3-1〕接線：07bhg gsvFrame 平面、3D 的預覽都走 sg2PvXY；預覽 CSS 不再用 margin 往右偏；sg2Ev 落在棋子上的跳字都走 sg2Float", () => {
  assert.ok(GSVSRC.includes('if(el.classList.contains("pv")&&typeof sg2PvXY==="function"){if(!PB)PB=sg2Box(g3);'), "在分平面／3D 之前");
  assert.ok(SCSS.includes(".gsv-mk.pv{font-size:11px;line-height:1.3;padding:0 4px;border-radius:6px;color:#fff;margin:0;"));
  assert.ok(SG2SRC.includes("F=(t,p,c)=>p&&p.q!=null?(sg2Float(t,p.q,c)||bhtdFloat(t,bhtdXY(p.q),c)):bhtdFloat(t,p,c)"));
});

test("〔D 頂欄〕對局中標題可以換兩行、字小一點；英文窄螢幕兩側鈕只留圖示（中文不受影響）", () => {
  assert.ok(SCSS.includes("html body.gsv-on #title{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden;"), "蓋過 07i18n 的 html[lang=en] #title nowrap");
  assert.ok(SCSS.includes("font-size:calc(16px * min(var(--fz,1),1.3));line-height:1.15"));
  const m = SCSS.match(/@media \(max-width:480px\)\{(html\[lang=en\][^\n]*)\}/); assert.ok(m, "舊版英文窄螢幕規則");
  assert.ok(m[1].includes("html[lang=en] body.gsv-on #back{font-size:0;padding:0 6px}html[lang=en] body.gsv-on #back b{font-size:28px}"));
  assert.ok(m[1].includes("html[lang=en] body.gsv-on #gsvView small{display:none}"));
  const sels = m[1].split("}").map(x => x.split("{")[0].trim()).filter(Boolean);
  assert.ok(sels.length >= 4 && sels.every(x => x.startsWith("html[lang=en] ")), "只限英文：" + sels.join(" | "));
  assert.match(SCSS, /@media \(max-width:480px\)\{\s+html body\.gsv-v2 #back\{font-size:0/);
  assert.match(SCSS, /html body\.gsv-v2 #gsvView small\{display:none/);
  /* 第 7 輪 P3-2 起 aria-label 由 gsvVwLb 算（中文照舊、英文直接給英文），每次都對一次（test-r4-1117 P3-2） */
  assert.ok(GSVSRC.includes('const a="視角："+BHTD_VW[v]+"（點一下換下一種）"') && GSVSRC.includes('const L=gsvVwLb(v);if(b.getAttribute("aria-label")!==L[0])b.setAttribute("aria-label",L[0])'), "視角鈕的字留在 aria-label");
});
