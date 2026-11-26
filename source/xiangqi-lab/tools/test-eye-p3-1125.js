/* 11/25「真人視角」自動截圖第一輪找到的 3 個 P3（output/human-eye/W121_第一輪報告.md）：
   W121-2 隨行小人站上棋盤：開新局卡片／開打前的卡片關掉後，小人停在卡片上緣右邊（＝棋盤右側），1 秒後才走出棋盤
          → src/bot3d.js：卡片上緣那個位置會蓋到棋盤就先藏；卡片關掉或剛出現棋盤時直接站到棋盤外（dodgeTick(1)）
   W121-3 狀態列慢一拍：自己剛走完，local.js 的 thinking 還沒變真，狀態列寫「輪到你」
          → m/08b-cpugame.js：輪到電腦（turn!==human）就寫思考中
   W121-5 評等說明泡泡壓住棋子：tmxFirst 自己跳出來時往上讓狀態列，結果蓋到棋盤
          → m/01-board.js：tmxBub 多一個 av（不能蓋的區塊），tmxFirst 傳棋盤、狀態列、工具列；兩邊都蓋到就不跳 */
"use strict";
const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..", ".."), rd = f => fs.readFileSync(path.join(ROOT, f), "utf8");
const BD = rd("xiangqi-db/m/01-board.js"), CG = rd("xiangqi-db/m/08b-cpugame.js"), BOT = rd("xiangqi-lab/src/bot3d.js");

/* ---------------- W121-2：bot3d.js 的 dodgeTick＋棋盤／卡片計時器，抽出來用假的環境跑 ---------------- */
const botSrc = (() => { const i0 = BOT.indexOf("    const baseK=()=>"), i1 = BOT.indexOf("},250);", i0); return i0 > 0 && i1 > i0 ? BOT.slice(i0, i1 + 7) : null })();
const BOARD = { left: 8, right: 367, top: 133, bottom: 527, width: 359, height: 394 };
function botRig({ x, y, boardMode = false, sheetMode = false, board = BOARD } = {}) {
  const S = { sheet: null, board, modal: false, wander: 0 };
  const ov = (l, t, r, b, q) => Math.max(0, Math.min(r, q.right) - Math.max(l, q.left)) * Math.max(0, Math.min(b, q.bottom) - Math.max(t, q.top));
  const E = {
    bVis: () => true, koScan: () => {}, bodyCost: (bx, by, w, h) => S.board ? ov(bx, by, bx + w, by + h, S.board) : 0,
    spots: (w, h) => [[375 - w, 812 - h - 64], [0, 560]].filter(p => !S.board || !ov(p[0], p[1], p[0] + w, p[1] + h, S.board)),
    nearest: (L, px, py) => L.slice().sort((a, b) => Math.hypot(a[0] - px, a[1] - py) - Math.hypot(b[0] - px, b[1] - py))[0],
    store: { get: () => null }, bub: { style: {} }, box: { style: {} }, hit: { style: {} },
    bigBoard: () => S.board, sheetRect: () => S.sheet, wander: () => { S.wander++ }, applySize: () => {},
    document: { querySelector: q => q === ".modal .box" && S.modal ? {} : null },
    innerWidth: 375, innerHeight: 812, W0: 40, H0: 60, SC: 1, cb: null
  };
  E.window = { bgpEvery: f => { E.cb = f; return 1 } };
  const body = `let {bVis,koScan,bodyCost,spots,nearest,store,bub,box,hit,bigBoard,sheetRect,wander,applySize,document,innerWidth,innerHeight,W0,H0,SC,window}=E;
    let x=E.x,y=E.y,tx=E.x,ty=E.y,W=E.W,H=E.H,hid=false,dim=false,drag=null,userHold=false,boardDrag=false,boardMode=E.boardMode,sheetMode=E.sheetMode,parked=false,celeb=0,act=null,dodge=false,bubT=0,shrink=1,szK=1;
    const bounds=()=>({x0:0,x1:innerWidth-W,y0:20,y1:innerHeight-H});
    let dodgeN=0;
    ${botSrc}
    return {get:()=>({x,y,tx,ty,boardMode,sheetMode,hid,dodge})}`;
  Object.assign(E, { x, y, W: boardMode ? 24 : 40, H: boardMode ? 36 : 60, boardMode, sheetMode });
  const api = new Function("E", body)(E);
  return { S, E, get: api.get, tick: () => E.cb() };
}

test("〔行為〕W121-2 開新局卡片開著、卡片上緣右邊會蓋到棋盤：小人先藏起來，不跑到棋盤上", () => {
  assert.ok(botSrc, "bot3d.js 找不到 baseK～boardT 那一段");
  const R = botRig({ x: 349, y: 712, boardMode: true });
  R.S.sheet = { top: 300 };   /* 卡片上緣在棋盤中間：上緣右邊那一格在棋盤上 */
  R.tick();
  assert.strictEqual(R.E.box.style.opacity, "0", "要藏起來");
  assert.strictEqual(R.E.hit.style.pointerEvents, "none");
  assert.deepStrictEqual([R.get().tx, R.get().ty], [349, 712], "不能把目標設到卡片上緣（棋盤上）");
});
test("〔行為〕W121-2 卡片上緣在棋盤下面（不蓋到棋盤）：照舊站到卡片上緣、看得到", () => {
  const R = botRig({ x: 349, y: 712, boardMode: true });
  R.S.sheet = { top: 640 };
  R.tick();
  assert.strictEqual(R.E.box.style.opacity, "");
  assert.deepStrictEqual([R.get().tx, R.get().ty], [375 - 24 - 4, 640 - 36]);
});
test("〔行為〕W121-2 卡片關掉、背後是棋盤：同一格直接站到棋盤外（右下角），不從棋盤上走出去", () => {
  const R = botRig({ x: 331, y: 240, boardMode: true, sheetMode: true });   /* 舊流程留下的位置：棋盤右側 */
  R.S.sheet = null; R.tick();
  const g = R.get();
  assert.deepStrictEqual([g.x, g.y], [375 - 24 - 2, 812 - 36 - 64], "要直接換位置");
  assert.strictEqual(g.dodge, false, "不是走過去");
  assert.notStrictEqual(R.E.box.style.opacity, "0", "站好以後看得到");
});
test("〔行為〕W121-2 古戰場開打：棋盤剛出現時小人站在棋盤區域，也直接站到棋盤外", () => {
  const R = botRig({ x: 300, y: 260, boardMode: false });
  R.tick();
  const g = R.get();
  assert.strictEqual(g.boardMode, true);
  assert.ok(g.x >= BOARD.right || g.y >= BOARD.bottom, `換位置後要在棋盤外：${g.x},${g.y}`);
  assert.strictEqual(g.dodge, false);
});
test("〔行為〕W121-2 對照：一直在棋盤畫面、沒有卡片開關時照舊（每兩格閃一次、用走的）", () => {
  const R = botRig({ x: 300, y: 260, boardMode: true });
  R.tick(); assert.deepStrictEqual([R.get().x, R.get().y], [300, 260], "第一格不動");
  R.tick(); const g = R.get();
  assert.deepStrictEqual([g.x, g.y], [300, 260], "第二格只設目標，不瞬移");
  assert.strictEqual(g.dodge, true, "快步走開");
});
test("〔行為〕W121-2 對照：沒有棋盤的頁面卡片關掉，照舊散步、不瞬移", () => {
  const R = botRig({ x: 100, y: 300, boardMode: false, sheetMode: true, board: null });
  R.tick(); const g = R.get();
  assert.deepStrictEqual([g.x, g.y], [100, 300]);
  assert.strictEqual(R.S.wander, 1);
});

/* ---------------- W121-3：08b-cpugame.js 狀態列的「思考中／輪到你」兩行，抽出來跑 ---------------- */
const statSrc = (CG.match(/\n    else if\(st\.thinking[^\n]*\n    else\{S2\.textContent=[^\n]*\n/) || [])[0];
function stat(st) {
  const S2 = { textContent: "", classList: { toggle() {} } };
  new Function("st", "S2", "cgT", "pmvLabel", "evt", "if(false){}" + statSrc)(st, S2, (k, d) => d, s => s.pm ? "・⏳ 已預走" : "", () => "均勢");
  return S2.textContent;
}
test("〔行為〕W121-3 玩家剛走完（輪到電腦、引擎還沒開算）：狀態列寫思考中，不寫「輪到你」", () => {
  assert.ok(statSrc, "08b-cpugame.js 找不到狀態列那兩行");
  const t = stat({ turn: "b", human: "r", thinking: false, check: -1, eval: { v: 0 } });
  assert.strictEqual(t, "🤔 思考中…");
  assert.ok(!t.includes("輪到你"));
  assert.strictEqual(stat({ turn: "r", human: "b", thinking: false, check: -1 }), "🤔 思考中…", "執黑也一樣");
});
test("〔行為〕W121-3 預走照舊：輪到電腦時排了預走，狀態列接「已預走」", () => {
  assert.strictEqual(stat({ turn: "b", human: "r", thinking: false, check: -1, pm: 1 }), "🤔 思考中…・⏳ 已預走");
  assert.strictEqual(stat({ turn: "b", human: "r", thinking: true, check: -1, pm: 1 }), "🤔 思考中…・⏳ 已預走");
});
test("〔行為〕W121-3 對照：真的輪到玩家照舊寫「輪到你」、被將軍照舊", () => {
  assert.strictEqual(stat({ turn: "r", human: "r", thinking: false, check: -1, eval: { v: 0 } }), "👉 輪到你・均勢");
  assert.strictEqual(stat({ turn: "r", human: "r", thinking: false, check: 4 }), "⚠ 被將軍！");
});
test("〔原始碼〕W121-3 預走的判斷沒改：tap 照舊在「輪到電腦或思考中」時交給 pmvTap", () => {
  assert.ok(CG.includes('function tap(i){if(st&&!st.result&&(st.turn!==st.human||st.thinking)&&typeof pmvTap==="function"&&pmvTap(st,st.human,i,'));
});

/* ---------------- W121-5：01-board.js 的 tmxBub，用假的畫面跑 ---------------- */
const bubSrc = (BD.match(/function tmxBub\(el,html,ms,av\)\{[\s\S]*?return true\}catch\(e\)\{return false\}\}/) || [])[0];
const rect = (left, top, right, bottom) => ({ left, top, right, bottom, width: right - left, height: bottom - top });
function bubRig({ vh = 812, strip = rect(10, 645, 120, 688), acts = rect(0, 733, 375, 812), av } = {}) {
  const mk = r => ({ getBoundingClientRect: () => r, contains: o => o === mkd, offsetParent: {}, isConnected: true });
  let mkd = null;
  const el = { getBoundingClientRect: () => strip, contains: o => o === el, isConnected: true };
  const E = { "#stat": mk(rect(0, 585, 375, 615)), "#bbox": mk(rect(8, 133, 367, 527)), "#acts": mk(acts) };
  for (const k in E) E[k].contains = o => o === E[k];
  const made = [], body = { append: b => { b.isConnected = true; made.push(b) } };
  const document = {
    body, querySelectorAll: s => s === ".tmx-bub" ? [] : s.split(",").map(q => E[q.trim()]).filter(Boolean),
    createElement: () => { const b = { className: "", dataset: {}, style: { setProperty() {} }, offsetWidth: 300, offsetHeight: 85, isConnected: false, cls: [],
      classList: { add: (...a) => b.cls.push(...a) }, setAttribute() {}, remove() { b.isConnected = false } }; return b }
  };
  const g = { document, innerWidth: 375, innerHeight: vh, addEventListener() {}, removeEventListener() {}, setTimeout: () => 0, clearTimeout() {} };
  const fn = new Function(...Object.keys(g), bubSrc + "\nreturn tmxBub;")(...Object.values(g));
  const ok = fn(el, "說明", 7000, av);
  const b = made[0];
  return { ok, b, top: b && parseFloat(b.style.top), shown: !!(b && b.isConnected) };
}
const AV = (BD.match(/const TMX_AV="([^"]+)"/) || [])[1];
test("〔行為〕W121-5 手機 375×812（截圖那個版面）：自己跳出來的評等說明上下都會蓋到棋盤／狀態列／工具列 → 不跳", () => {
  assert.ok(bubSrc, "01-board.js 找不到 tmxBub");
  assert.ok(AV && /#bbox/.test(AV) && /#stat/.test(AV) && /#acts/.test(AV), "TMX_AV 要含棋盤、狀態列、工具列");
  const r = bubRig({ av: AV });
  assert.strictEqual(r.ok, false);
  assert.strictEqual(r.shown, false, "不能留在畫面上");
});
test("〔行為〕W121-5 對照：不傳 av（點了才出的說明）照舊顯示，位置跟原本一樣（移到狀態列上面）", () => {
  const r = bubRig({});
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.top, 585 - 85 - 8);
});
test("〔行為〕W121-5 下面放得下（工具列更下面）：改放著法條下方，不蓋棋盤、不蓋工具列", () => {
  const r = bubRig({ av: AV, vh: 1000, acts: rect(0, 921, 375, 1000) });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.top, 688 + 10);
  assert.ok(r.b.cls.includes("dn"));
  assert.ok(r.top >= 527 && r.top + 85 <= 921, "在棋盤下緣和工具列上緣之間");
});
test("〔行為〕W121-5 上面空間夠、不蓋任何東西：照舊放上面", () => {
  const r = bubRig({ av: AV, vh: 1000, strip: rect(10, 800, 120, 830), acts: rect(0, 921, 375, 1000) });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.top, 800 - 85 - 10);
  assert.ok(r.b.cls.includes("up"));
});
test("〔行為〕W121-5 往上會蓋到工具列、往下放得下：換到下面", () => {
  const r = bubRig({ av: AV, vh: 1100, strip: rect(10, 820, 120, 850), acts: rect(0, 700, 375, 780) });
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.top, 850 + 10);
  assert.ok(r.b.cls.includes("dn"));
});
test("〔原始碼〕W121-5 只有 tmxFirst（自己跳出來的那個）傳 TMX_AV；其他 tmxBub 呼叫不變", () => {
  assert.ok(BD.includes('著法條上的評等字，點一下可以再看說明</small>`,7000,TMX_AV)){'));
  assert.strictEqual((BD.match(/TMX_AV\)/g) || []).length, 1);
});
