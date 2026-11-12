// 11/12 無障礙證據包（評比第 6 輪 F1）：高對比主題每一組前景／背景色碼與對比值，全部從程式算，不手打。
//   色碼來源：m/11b-a11y.js 的 axmHcv()（頁面）、axmHcb()（棋盤）；m.css 的高對比規則與焦點框；m/01-board.js 的高對比棋子。
//   對比算式：m/11b-a11y.js 的 axmContrast（WCAG 2.x 相對亮度），用 vm 載入 #AXM-PURE 那段，跟 App 用的是同一份程式。
//   對比值一律「無條件捨去到小數 2 位」，不會四捨五入成剛好過門檻。
// 用法：
//   node tools/a11y-contrast-table.js          → 印出 Markdown 表格，貼進 xiangqi-db/art/docs/a11y.md「高對比色碼與對比值」那段
//   node tools/a11y-contrast-table.js --json   → 印出 JSON
// test-a11y-p16.js 會核對文件裡的表格跟這支算出來的一字不差。
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm");
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "../xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const A = require("./a11y-audit.js");

/* 11b 的純函式段：axmHcv、axmHcb、axmContrast */
function loadAx() {
  const src = rd(path.join(M, "11b-a11y.js")), i = src.indexOf("#AXM-PURE-BEGIN"), j = src.indexOf("/* #AXM-PURE-END */");
  if (!(i > 0 && j > i)) throw new Error("11b-a11y.js 找不到 #AXM-PURE 區段");
  const ctx = { console }; vm.createContext(ctx);
  vm.runInContext(src.slice(src.indexOf("\n", i) + 1, j) + "\nthis.R={axmHcv,axmHcb,axmContrast}", ctx, { filename: "11b-a11y(純函式)" });
  return ctx.R;
}
/* m.css 某一條規則（選擇器完全一樣、不在 @media 裡）的宣告；後寫的蓋前面 */
function cssRule(css, sel) {
  const r = A.parseCss(css).filter(x => x.sel.replace(/\s+/g, " ").trim() === sel && !x.media.length);
  if (!r.length) throw new Error("m.css 找不到 " + sel);
  return Object.fromEntries(r.flatMap(x => x.decls).map(d => [d[0], d[1]]));
}
const hexIn = (v, what) => { const m = String(v || "").match(/#[0-9A-Fa-f]{6}\b/); if (!m) throw new Error(what + " 沒有 6 碼色碼：" + v); return m[0].toUpperCase() };
const floor2 = x => Math.floor(x * 100 + 1e-9) / 100;

/* 每一組：[項目, 前景, 背景, 門檻種類（text＝文字 7:1、ui＝非文字 3:1）, 色碼出處] */
function pairs() {
  const R = loadAx(), V = R.axmHcv(), H = R.axmHcb(), css = rd(path.join(DB, "m.css")), B = rd(path.join(M, "01-board.js"));
  const btn = cssRule(css, "html[data-hct] .btn:not(.ghost)"), opt = cssRule(css, "html[data-hct] .opt button.on");
  const clk = cssRule(css, "html[data-hct] .player .clk"), clkOn = cssRule(css, "html[data-hct] .player.on .clk");
  const ring = cssRule(css, "html[data-axm] :focus-visible,html[data-hct] :focus-visible"), fv = cssRule(css, ":focus-visible");
  const rootL = cssRule(css, ":root"), rootD = cssRule(css, ":root[data-theme=dark]");
  /* 01-board 高對比棋子：黑子＝黑底（fill）白字（txt）；紅子＝白底、字用 hc（高對比主題時是 axmHcb 的 r） */
  const pf = B.match(/fill:inv\?"(#[0-9A-Fa-f]{6})":"(#[0-9A-Fa-f]{6})"/), pt = B.match(/txt\(inv\?"(#[0-9A-Fa-f]{6})":hc/), hcR = B.match(/HTp\?"(#[0-9A-Fa-f]{6})"/);
  if (!pf || !pt || !hcR) throw new Error("01-board.js 找不到高對比棋子的色碼");
  const L = [
    ["主要文字", V.ink, V.bg, "text", "axmHcv ink／bg"],
    ["次要文字（灰字）", V.muted, V.bg, "text", "axmHcv muted／bg"],
    ["強調字（朱紅）", V.accent, V.bg, "text", "axmHcv accent／bg"],
    ["強調字（綠）", V.accent2, V.bg, "text", "axmHcv accent2／bg"],
    ["紅字", V.red, V.bg, "text", "axmHcv red／bg"],
    ["黑字", V.blk, V.bg, "text", "axmHcv blk／bg"],
    ["警告字", V.warn, V.bg, "text", "axmHcv warn／bg"],
    ["連結、資訊字", V.info, V.bg, "text", "axmHcv info／bg"],
    ["頂欄字", V.barink, V.bar, "text", "axmHcv barink／bar"],
    ["主按鈕白字", hexIn(btn.color, "主按鈕字"), hexIn(btn.background, "主按鈕底"), "text", "m.css html[data-hct] .btn:not(.ghost)"],
    ["選中的選項", hexIn(opt.color, "選項字"), hexIn(opt.background, "選項底"), "text", "m.css html[data-hct] .opt button.on"],
    ["棋鐘數字", hexIn(clk.color, "棋鐘字"), hexIn(clk.background, "棋鐘底"), "text", "m.css html[data-hct] .player .clk"],
    ["輪到的一方棋鐘", hexIn(clkOn.color, "棋鐘字"), hexIn(clkOn.background, "棋鐘底"), "text", "m.css html[data-hct] .player.on .clk"],
    ["紅子字（白底）", hcR[1].toUpperCase(), pf[2].toUpperCase(), "text", "01-board 高對比棋子（＝axmHcb r／piece）"],
    ["黑子字（反白）", pt[1].toUpperCase(), pf[1].toUpperCase(), "text", "01-board 高對比棋子"],
    ["框線", V.line, V.bg, "ui", "axmHcv line／bg"],
    ["棋盤線", H.grid, H.bg[0], "ui", "axmHcb grid／bg"],
    ["上一步記號", H.mv, H.bg[0], "ui", "axmHcb mv／bg"],
    ["螢幕報讀、高對比焦點框：黃框對黑外圈", hexIn(ring.outline, "焦點框"), hexIn(ring["box-shadow"], "焦點外圈"), "ui", "m.css html[data-hct] :focus-visible"],
    ["螢幕報讀、高對比焦點框：黑外圈對白底", hexIn(ring["box-shadow"], "焦點外圈"), V.bg, "ui", "m.css 同上／axmHcv bg"],
    ["一般模式焦點框：藍框對淺色底", hexIn(fv.outline, "焦點框"), hexIn(rootL["--bg"], "淺色底"), "ui", "m.css :focus-visible／:root --bg"],
    ["一般模式焦點框：藍框對深色底", hexIn(fv.outline, "焦點框"), hexIn(rootD["--bg"], "深色底"), "ui", "m.css :focus-visible／:root[data-theme=dark] --bg"]
  ];
  if (hcR[1].toUpperCase() !== H.r || pf[2].toUpperCase() !== H.piece) throw new Error("01-board 高對比紅子跟 axmHcb 不一樣");
  return L.map(([name, fg, bg, kind, src]) => { const ratio = R.axmContrast(fg, bg); return { name, fg, bg, kind, need: kind === "text" ? 7 : 3, ratio, shown: floor2(ratio), src } });
}
const NEED = { text: "文字 7:1", ui: "非文字 3:1" };
function markdown(P) {
  P = P || pairs();
  const L = ["| 項目 | 前景 | 背景 | 對比 | 門檻 | 色碼出處 |", "|---|---|---|---:|---|---|"];
  for (const p of P) L.push(`| ${p.name} | \`${p.fg}\` | \`${p.bg}\` | ${p.shown.toFixed(2)}:1 | ${NEED[p.kind]} | ${p.src} |`);
  return L.join("\n");
}
function summary(P) {
  P = P || pairs();
  const t = P.filter(p => p.kind === "text"), u = P.filter(p => p.kind === "ui"), lo = a => a.reduce((m, p) => (p.ratio < m.ratio ? p : m));
  const fail = P.filter(p => p.ratio < p.need);
  return `共 ${P.length} 組：文字 ${t.length} 組，最低 ${lo(t).shown.toFixed(2)}:1（${lo(t).name}）；非文字 ${u.length} 組，最低 ${lo(u).shown.toFixed(2)}:1（${lo(u).name}）；沒過門檻 ${fail.length} 組。`;
}
module.exports = { pairs, markdown, summary, loadAx };
if (require.main === module) {
  const P = pairs();
  if (process.argv.includes("--json")) console.log(JSON.stringify(P, null, 1));
  else console.log(markdown(P) + "\n\n" + summary(P));
}
