// 11/13 開發者 iPhone 實測一批（hspx）：
//   ① P0「點下我的棋力沒反應，甚至出現第二張圖」：結果視窗的「看我的棋力 ›」改全域點擊委派；視窗還沒出來時 tick 繼續等
//   ② 「可以一行說完嗎，不要換行，換行機制你定個規矩吧」：toast 換行規矩（一行→縮字到 12px→才在標點處換行、兩行拉平均）
//   ③ 「這道裂，我算過，換個說法吧」；④「漂浮的譜，修正」：經典世界 3D 亭子裡的懸浮畫卷拿掉
// 不開瀏覽器：假元素跑 toastFit，其他看原始碼。用法：node --test xiangqi-lab/tools/test-ui-1113.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = p => fs.readFileSync(path.join(ROOT, p), "utf8").replace(/\r\n/g, "\n");
const UTIL = rd("xiangqi-db/m/00-util.js"), GAME = rd("xiangqi-db/m/08b-cpugame.js"), CSS = rd("xiangqi-db/m.css"), BH = rd("xiangqi-db/m/07bh-blackhole.js"), P3 = rd("xiangqi-lab/src/park3d.js");

/* 假 toast 元素：每個字 fontSize 寬（CJK 全形），一行可用 cw px；whiteSpace normal 時才不會溢出 */
function fakeToast(text, cw) {
  const t = { style: { whiteSpace: "", fontSize: "" }, get clientWidth() { return cw },
    get scrollWidth() { const fs = parseFloat(this.style.fontSize) || 14; return this.style.whiteSpace === "normal" ? cw : Math.ceil([...text].length * fs) } };
  return t;
}
const fit = new Function("getComputedStyle", UTIL.split("\n").filter((l, i, a) => l.startsWith("function toastFit(") || (i > 0 && a.slice(0, i).some(x => x.startsWith("function toastFit(")) && !a.slice(0, i).some(x => /^\s*if\(t\.scrollWidth>t\.clientWidth\+1\)t\.style\.whiteSpace="normal"\}catch/.test(x)))).join("\n") + ";return toastFit")(() => ({ fontSize: "14px" }));

test("② toast 換行規矩：放得下就一行；放不下先縮字（最小 12px）；還是放不下才換行", () => {
  const a = fakeToast("已存檔", 300); fit(a); assert.equal(a.style.whiteSpace, "nowrap"); assert.equal(a.style.fontSize, "", "放得下：不縮字、一行");
  const b = fakeToast("🌀 去搭星槎，找裂痕的另一端。", 15 * 13); fit(b);   /* 15 個字：14px 放不下（210）、13px 剛好（195） */
  assert.equal(b.style.whiteSpace, "nowrap", "縮到 13px 就放得下：維持一行"); assert.equal(b.style.fontSize, "13px");
  const c = fakeToast("這是一句非常非常長、怎麼縮都放不進一行的提示訊息，只好換行", 200); fit(c);
  assert.equal(c.style.fontSize, "12px", "先縮到最小 12px"); assert.equal(c.style.whiteSpace, "normal", "還是放不下才換行");
  assert.match(UTIL, /function toast\(msg\)\{[^\n]*t\.hidden=false;toastFit\(t\);/, "每次顯示都套規矩");
  assert.match(CSS, /\.toast\{[^}]*word-break:keep-all;overflow-wrap:anywhere;text-wrap:balance\}/, "換行時只在標點、空白處斷，兩行拉平均");
});
test("① P0 看我的棋力：全域點擊委派（不靠事後綁定）；結果視窗還沒出來時 tick 繼續等", () => {
  assert.match(GAME, /document\.addEventListener\("click",e=>\{const g=e\.target&&e\.target\.closest&&e\.target\.closest\("\.modal \.rg-go"\);/);
  assert.match(GAME, /store\.set\("statsTab","all"\);location\.hash="#\/stats"\},true\);/, "按了就去我的棋力（捕獲階段）");
  assert.match(GAME, /scrollTop=0;window\.scrollTo\(0,0\)/, "把被捲走的頁面捲回頂（第二張圖的空白）");
  assert.match(GAME, /tick=\(\)=>\{n\+\+;const b=box\(\);if\(b\)seen=true;else if\(!seen\)\{if\(n<40\)setTimeout\(tick,700\);return\}/);
  assert.ok(!/g\.onclick=\(\)=>\{const m=g\.closest\("\.modal"\)/.test(GAME), "舊的事後綁定拿掉");
  /* 行為：tick 開頭那段，視窗還沒出來時會再排一次、不會去查狀態 */
  const line = GAME.split("\n").find(l => l.includes("tick=()=>{n++;const b=box();"));
  const head = line.slice(line.indexOf("tick=()=>{") + 10, line.indexOf("return}") + 7);
  let sched = 0, api = 0;
  const run = new Function("box", "setTimeout", "api", "let n=0,seen=false;const tick=()=>{" + head + "api()};tick();return()=>({n,seen})")(() => null, () => sched++, () => api++);
  assert.equal(sched, 1, "視窗還沒出來：0.7 秒後再等"); assert.equal(api, 0, "還沒出來不去查狀態（以前查完就結束）");
});
test("③ 幻影棋客的台詞換掉；④ 經典世界的懸浮畫卷拿掉", () => {
  assert.ok(!/say:"這道裂，我算過。"/.test(BH)); assert.match(BH, /const BH_ORB=\{say:"天上這道裂痕，通往另一盤棋。",/);
  assert.match(P3, /if\(0\)use\("scroll",im=>/, "懸浮畫卷不再放");
  assert.match(P3, /use\("ghost",im=>/, "淡墨幻影棋客照舊");
});

/* ⑤ hspx「今日推薦還是會左右抖一下」：首頁的左右貼邊有四支程式在管（07z hmClamp 用 marginLeft、05 fzPull 先清 marginLeft 再推、07t3 r07Push 和 07f shpFit 改 left），
   互相蓋來蓋去。改成首頁只歸 hmClamp 管：它在頁面上標 data-hmc，其他三支看到就不碰左右（fzPull 只管上下） */
test("⑤ 首頁左右貼邊只歸 hmClamp 管，其他三支看到 data-hmc 就不碰左右", () => {
  const HM = rd("xiangqi-db/m/07z-homemap.js"), TT = rd("xiangqi-db/m/07t3-tabtube.js"), SH = rd("xiangqi-db/m/07f-ship.js"), ST = rd("xiangqi-db/m/05-settings.js");
  assert.match(HM, /function hmClamp\(P\)\{if\(P\.dataset\)P\.dataset\.hmc="1";/);
  assert.match(TT, /function r07Push\(V,P\)\{requestAnimationFrame\(\(\)=>\{if\(!P\.isConnected\|\|P\.dataset\.hmc\)return;/);
  assert.match(SH, /const P=v\.querySelector\("\.shp-page\.cq"\);if\(!P\|\|P\.dataset\.hmc\)return;/);
  /* 行為：fzPull 在 data-hmc 的頁面不動 marginLeft（只推上下） */
  const src = ST.split("\n"), i = src.findIndex(l => l.startsWith("function fzPull(")), body = src.slice(i, i + 3).join("\n").replace(/\/\*[\s\S]*?\*\/\s*$/, "");
  const el = (x, y) => ({ classList: { add() {}, remove() {} }, style: { marginLeft: "23px", marginTop: "" }, getBoundingClientRect: () => ({ left: x, right: x + 80, top: y, bottom: y + 30 }) });
  const fzUnpull = e => { e.style.marginLeft = ""; e.style.marginTop = "" };
  const run = new Function("fzUnpull", "innerWidth", body + ";return fzPull")(fzUnpull, 400);
  const P = H => ({ dataset: H ? { hmc: "1" } : {}, getBoundingClientRect: () => ({ left: 0, right: 400, top: 0, bottom: 800 }) });
  const a = el(-10, 790); run([a], P(true)); assert.equal(a.style.marginLeft, "23px", "首頁：hmClamp 的 marginLeft 不被清掉、也不被蓋成 0");
  assert.equal(a.style.marginTop, "-22px", "上下照樣推回來");
  const b = el(-10, 100); run([b], P(false)); assert.equal(b.style.marginLeft, "12px", "其他頁照舊左右推回");
});

/* ⑥ hspx「點兩下，角色會快速移動到那個點上，又再度發生」→ 開發者選「只留出口的跳過」 */
test("⑥ 空地上走路途中再點同一處不再瞬間到達；往出口走時再點一下＝直接換頁照舊", () => {
  const W = rd("xiangqi-db/m/07w-shipwalk.js");
  assert.match(W, /const SHW_FF_ON=false;/, "空地點兩下跳過關掉");
  assert.match(W, /if\(SHW_FF_ON&&g&&g\.free&&!g\.win&&!g\.ex&&g\.tap/, "跳過那條要先過開關");
  assert.match(W, /if\(g&&g\.ex\)\{e\.stopPropagation\(\);e\.preventDefault\(\);shwExitDo\(S\);return\}/, "出口的跳過照舊");
});
