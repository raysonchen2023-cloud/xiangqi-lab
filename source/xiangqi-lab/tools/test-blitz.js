// 第 12 輪 F3「快棋模式、動畫最短化、預走」的自動測試，不開瀏覽器：
//   ① 預走落點（pmvReach）：60 個固定局面＋開局，每顆子真正合法的步都排得到；不會排到自己的子上
//   ② 預走流程：vm 載入 m/07pm-premove.js，配 blitz-measure.js 的假對局畫面（照 08b 掛勾寫）＋core.js 真棋規：
//      電腦思考中先排預走 → 電腦落子 → 合法就自動走出／被擋住就取消並提示／那顆子被吃就取消；取消、換選、悔棋、換盤、畫面忙著要重試、開關關掉、3D 園子
//   ③ 畫面標記：pmvPaint 畫出虛線框、淡色箭頭、「預」字；對方剛走那步的灰色虛線
//   ④ 快棋：設定開關 blitzSw／premoveSw 存檔與套用；01-board 的開局名稱、將軍印章、開局特效、吃子水墨在 vm 實跑，快棋時一個畫面元素都不建；
//      電腦節奏 cpuPace() 快棋時一律「快速」；blzTab 的一般毫秒數跟原始碼對得上
//   ⑤ 接線與文件：08b、01-board、local.js、m.html 的掛勾；blitz.md 兩份逐字一樣、LF
// 用法：node --test xiangqi-lab/tools/test-blitz.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const MZ = require("./blitz-measure.js"), { C, load, game, flush } = MZ;
const LAB = path.join(__dirname, ".."), DB = path.join(LAB, "..", "xiangqi-db"), M = path.join(DB, "m");
const rd = f => fs.readFileSync(f, "utf8");
const sq = s => C.parseSq(s);
const wait = ms => new Promise(r => setTimeout(r, ms));

/* 開一盤：fen 從黑方（電腦）走開始時 turn 給 "b" */
async function open(R, o) { const g = game(R, o); await g.open(); return g }
/* 從開局：玩家先走炮二平五，電腦開始想 */
async function afterCannon(R) { const g = await open(R, { id: "s1" }); g.tap(sq("h2")); g.tap(sq("e2")); await flush(); assert.equal(g.B.moves.length, 1); assert.equal(g.st.turn, "b"); return g }

// ====================== ① 預走落點 ======================
test("預走落點包含所有真正合法的步（60 個固定局面＋開局，紅黑兩方每顆子），而且不會落在自己的子上", () => {
  const R = load(), POS = require("./fixtures/ai-batch-positions.json").positions.map(p => p.fen.split(" ")[0]).concat([C.START.split(" ")[0]]);
  let n = 0;
  for (const f of POS) { const b = C.parseFen(f);
    for (const side of ["r", "b"]) for (const [a, t] of C.legal(b, side)) { assert.ok(R.X.pmvReach(b, a).includes(t), `${f} ${C.iccs(a, t)} 要排得到`); n++ }
    for (let i = 0; i < 90; i++) if (b[i]) for (const t of R.X.pmvReach(b, i)) assert.ok(!b[t] || C.sideOf(b[t]) !== C.sideOf(b[i]), "不能排到自己的子上") }
  assert.ok(n > 2000, "檢查的合法步數 " + n);
});
test("預走落點：車不被對方的子擋（對方可能讓開）、被自己的子擋；炮可以隔自己的子；象不過河；帥不出九宮；兵過河才能橫走", () => {
  const R = load(), P = (b, i) => JSON.parse(JSON.stringify(R.X.pmvReach(b, i)));   /* vm 裡的陣列換成這邊的，deepEqual 才比得了 */
  /* 紅車 a0，a2 有黑卒、a5 有紅兵 */
  let b = C.parseFen("4k4/9/9/9/P8/9/9/p8/9/R3K4");
  let r = P(b, sq("a0"));
  assert.ok(r.includes(sq("a1")) && r.includes(sq("a2")) && r.includes(sq("a3")) && r.includes(sq("a4")), "穿過黑卒");
  assert.ok(!r.includes(sq("a5")) && !r.includes(sq("a6")), "被自己的兵擋住");
  b = C.parseFen("4k4/9/9/9/P8/9/9/9/9/C3K4"); r = P(b, sq("a0"));
  assert.ok(r.includes(sq("a7")) && r.includes(sq("a4")) && !r.includes(sq("a5")), "炮隔自己的兵（炮架）可以排，落點不能是自己的兵");
  b = C.parseFen("4k4/9/9/9/9/9/9/9/9/2B1K4"); r = P(b, sq("c0"));
  assert.deepEqual(r.slice().sort((x, y) => x - y), [sq("a2"), sq("e2")].sort((x, y) => x - y));
  b = C.parseFen("4k4/9/9/9/2B6/9/9/9/9/4K4"); r = P(b, sq("c5"));
  assert.ok(!r.includes(sq("a7")) && !r.includes(sq("e7")), "象不過河");
  b = C.parseFen("4k4/9/9/9/9/9/9/9/9/3K5"); r = P(b, sq("d0"));
  assert.ok(!r.includes(sq("c0")) && r.includes(sq("e0")) && r.includes(sq("d1")), "帥在九宮裡");
  b = C.parseFen("4k4/9/9/9/9/9/4P4/9/9/4K4"); assert.deepEqual(P(b, sq("e3")), [sq("e4")], "沒過河只能前進");
  b = C.parseFen("4k4/9/9/9/4P4/9/9/9/9/4K4"); assert.deepEqual(P(b, sq("e5")).sort((x, y) => x - y), [sq("e6"), sq("d5"), sq("f5")].sort((x, y) => x - y), "過河可以橫走");
});

// ====================== ② 預走流程 ======================
test("電腦思考中排預走 → 電腦落子 → 預走自動走出（不用再點）；排著的時候有標記、狀態列寫「已預走」、有震動和螢幕報讀提示", async () => {
  const R = load(), g = await afterCannon(R);
  g.tap(sq("b0"));
  assert.equal(g.o.sel, sq("b0"), "預走選子：棋盤上照樣拿起來");
  assert.ok(g.o.targets.includes(sq("c2")) && g.o.targets.includes(sq("a2")), "畫出可以排的落點");
  g.tap(sq("c2"));
  assert.deepEqual(JSON.parse(JSON.stringify(g.o.pre)), { f: sq("b0"), t: sq("c2") }, "排好的預走畫在棋盤上（o.pre）");
  assert.ok(!(g.o.sel >= 0), "排好以後不再拿著子");
  assert.match(R.X.pmvLabel(g.st), /⏳ 已預走「傌八進七」/);
  assert.ok(R.vibs.length >= 2, "選子、排好都有小震動");
  assert.ok(R.says.some(s => /預走「傌八進七」/.test(s)), "螢幕報讀念出排了什麼");
  assert.ok(R.toasts.some(t => /排好預走/.test(t)), "第一次排預走有一句說明");
  g.cpu(sq("h9"), sq("g7")); await flush();
  assert.equal(g.B.moves.length, 3, "電腦一步＋預走一步");
  assert.deepEqual([g.B.moves[2].f, g.B.moves[2].t], [sq("b0"), sq("c2")]);
  assert.equal(g.B.turn, "b", "又輪到電腦想");
  assert.equal(R.X.pmvSt().q, null, "預走用掉了");
  const S = R.X.pmvStats(); assert.equal(S.n, 1); assert.ok(S.last >= 0 && S.last < 100, "從電腦落子到送出 " + S.last + " 毫秒");
  assert.deepEqual(JSON.parse(JSON.stringify(g.o.pmOpp)), { f: sq("h9"), t: sq("g7") }, "電腦剛剛那一步用灰色虛線標著");
  R.X.pmvSt().fired.until = Date.now() - 1; g.render(g.stateOf()); assert.equal(g.o.pmOpp, undefined, "2.5 秒後拿掉");
});
test("預走被擋住（電腦把子走到路線上）：自動取消、輕提示一句、不會亂走，輪到你自己下", async () => {
  const R = load(), g = await open(R, { id: "s2", fen: "3k5/9/9/9/9/9/9/1r7/9/R3K4", turn: "b" });
  g.tap(sq("a0")); g.tap(sq("a5")); assert.ok(R.X.pmvSt().q, "排好 俥九進五");
  g.cpu(sq("b2"), sq("a2")); await flush();
  assert.equal(g.B.moves.length, 1, "沒有多走");
  assert.equal(g.B.turn, "r");
  assert.equal(R.X.pmvSt().q, null);
  assert.ok(R.toasts.some(t => /預走「俥九進五」現在走不了，已取消/.test(t)), R.toasts.join("｜"));
  assert.equal(g.o.pre, undefined, "標記拿掉");
  g.tap(sq("a0")); g.tap(sq("a2")); await flush(); assert.equal(g.B.moves.length, 2, "自己照常下（吃掉擋路的車）");
});
test("預走的那顆子被電腦吃掉：取消並說明", async () => {
  const R = load(), g = await open(R, { id: "s3", fen: "3k5/9/9/9/9/9/9/9/r8/R3K4", turn: "b" });
  g.tap(sq("a0")); g.tap(sq("a1")); assert.ok(R.X.pmvSt().q);
  g.cpu(sq("a1"), sq("a0")); await flush();
  assert.equal(g.B.moves.length, 1); assert.equal(R.X.pmvSt().q, null);
  assert.ok(R.toasts.some(t => /被吃掉了/.test(t)), R.toasts.join("｜"));
});
test("取消：排好後點空白＝取消；點自己另一顆子＝取消並改選；選了子再點同一顆＝不選", async () => {
  const R = load(), g = await afterCannon(R);
  g.tap(sq("b0")); g.tap(sq("c2")); assert.ok(R.X.pmvSt().q);
  g.tap(sq("e5")); assert.equal(R.X.pmvSt().q, null, "點空白取消"); assert.equal(g.o.pre, undefined); assert.ok(R.says.includes("已取消預走"));
  g.tap(sq("b0")); g.tap(sq("c2")); g.tap(sq("h0")); assert.equal(R.X.pmvSt().q, null); assert.equal(g.o.sel, sq("h0"), "改選右馬");
  g.tap(sq("h0")); assert.ok(!(g.o.sel >= 0), "再點同一顆＝不選");
  g.tap(sq("b0")); g.tap(sq("e9")); assert.equal(R.X.pmvSt().q, null, "點到不能排的地方＝不選、不排"); assert.ok(!(g.o.sel >= 0));
  g.cpu(sq("h9"), sq("g7")); await flush(); assert.equal(g.B.moves.length, 2, "什麼都沒排，電腦走完就輪到你"); assert.equal(g.B.turn, "r");
});
test("悔棋（步數變少）清掉預走；換到另一盤不會走進另一盤，回來也不會亂走", async () => {
  const R = load(), g = await afterCannon(R);
  g.tap(sq("b0")); g.tap(sq("c2")); assert.ok(R.X.pmvSt().q);
  g.undo(1); await flush(); assert.equal(R.X.pmvSt().q, null, "悔棋後清掉"); assert.equal(g.B.moves.length, 0); g.close();
  const g1 = await afterCannon(R); g1.tap(sq("b0")); g1.tap(sq("c2")); const q = R.X.pmvSt().q; assert.ok(q);
  g1.close(); const g2 = await open(R, { id: "other", fen: "3k5/9/9/9/9/9/9/9/9/R3K4", turn: "r" });
  assert.equal(R.X.pmvSt().q, q, "別盤的畫面不動這一盤的預走"); assert.equal(g2.o.pre, undefined, "也不畫在別盤上");
  assert.equal(R.X.pmvLabel(g2.st), "");
  g2.tap(sq("a0")); g2.tap(sq("a5")); await flush(); assert.equal(g2.B.moves.length, 1, "別盤照常下");
  assert.equal(R.X.pmvSt().q, q);
});
test("輪到你那一刻畫面正忙（上一個請求還沒回來）：25 毫秒後重試，忙完就走出", async () => {
  const R = load(), g = await afterCannon(R);
  g.tap(sq("b0")); g.tap(sq("c2"));
  g.busy = true; g.cpu(sq("h9"), sq("g7")); await flush();
  g.render(g.stateOf()); assert.ok(g.fires.includes("retry")); assert.equal(g.B.moves.length, 2, "忙著先不走");
  await wait(10); g.busy = false; await wait(60); await flush();
  assert.equal(g.B.moves.length, 3, "忙完走出"); assert.ok(g.fires.includes("fire"));
});
test("預走開關關掉（store premove＝false）、或畫面指定不開預走（ex.flat＝false）：電腦思考時點棋盤照舊沒反應（3D 園子第 13 輪起可以排，見 test-premove-online3d.js）", async () => {
  for (const [R, flat] of [[load({ store: { premove: false } }), true], [load(), false]]) {
    const g = await open(R, { id: "s5", flat }); g.tap(sq("h2")); g.tap(sq("e2")); await flush();
    g.tap(sq("b0")); assert.ok(!(g.o.sel >= 0)); g.tap(sq("c2")); assert.equal(R.X.pmvSt().q, null); assert.equal(g.o.pre, undefined);
    g.cpu(sq("h9"), sq("g7")); await flush(); assert.equal(g.B.moves.length, 2) }
});
test("量測：400 回合隨機對局，每回合都有結果（走出／不合法取消／被吃取消），走出的從電腦落子到套上盤面都在 50 毫秒內", async () => {
  const P = await MZ.premoveRun(400, 2024);
  assert.equal(P.kinds.fire + P.kinds.illegal + P.kinds.gone + P.kinds.stale, 400);
  assert.ok(P.kinds.fire > 200 && P.kinds.illegal > 10, JSON.stringify(P.kinds));
  assert.ok(P.put.max < 50 && P.lat.max < 50, JSON.stringify(P.put));
});

// ====================== ③ 畫面標記 ======================
test("pmvPaint：預走畫起點、落點兩個虛線框（落點淡淡塗色）、半透明虛線箭頭、「預」字小牌；對方剛走那步是灰色虛線；沒有預走什麼都不畫", () => {
  const R = load(), made = [], el = (t, a, txt) => { const e = { t, a, txt, childNodes: [], append(...x) { this.childNodes.push(...x) } }; made.push(e); return e };
  const svg = { kids: [], append(g) { this.kids.push(g) } }, X = i => 40 + (i % 9) * 60, Y = i => 40 + (i / 9 | 0) * 60;
  R.X.pmvPaint(svg, el, X, Y, {}); assert.equal(svg.kids.length, 0);
  R.X.pmvPaint(svg, el, X, Y, { pre: { f: sq("b0"), t: sq("c2") } });
  const g = svg.kids[0], k = t => g.childNodes.filter(x => x.t === t);
  assert.equal(g.a["pointer-events"], "none", "不擋點選");
  assert.equal(k("rect").length, 2); assert.ok(k("rect").every(r => r.a["stroke-dasharray"]), "虛線框");
  assert.equal(k("rect")[0].a.x, X(sq("b0")) - 29); assert.equal(k("rect")[1].a.fill, "rgba(122,63,209,.14)");
  assert.equal(k("line")[0].a.opacity, .45, "淡色箭頭"); assert.ok(k("line")[0].a["stroke-dasharray"]); assert.equal(k("polygon").length, 1);
  assert.equal(k("text")[0].txt, "預");
  R.X.pmvPaint(svg, el, X, Y, { pmOpp: { f: sq("h9"), t: sq("g7") } });
  const h = svg.kids[1]; assert.ok(h.childNodes.every(x => x.a.stroke === "#6B6B6B" && x.a["stroke-dasharray"]), "灰色虛線");
});

// ====================== ④ 快棋 ======================
test("設定開關：勾 blitzSw 存 blitz、html 加 blz 樣式、提示；勾掉 premoveSw 存 premove＝false 並清掉排著的預走", async () => {
  const R = load(); assert.ok(!R.cls.has("blz")); assert.ok(R.elems.blzCss, "樣式先放好");
  assert.match(R.elems.blzCss.textContent, /html\.blz \.modal \.box\{animation-duration:\.06s!important\}/);
  R.docL.change({ target: { id: "blitzSw", checked: true } });
  assert.equal(R.st.blitz, true); assert.ok(R.cls.has("blz")); assert.match(R.toasts.pop(), /快棋模式：開/);
  assert.equal(R.X.blzSkip("capFx"), true); assert.equal(R.X.blzSkip("slide"), false, "走子動畫只縮短、不略過");
  R.docL.change({ target: { id: "blitzSw", checked: false } }); assert.equal(R.st.blitz, false); assert.ok(!R.cls.has("blz")); assert.equal(R.X.blzSkip("capFx"), false);
  const g = await afterCannon(R); g.tap(sq("b0")); g.tap(sq("c2")); assert.ok(R.X.pmvSt().q);
  R.docL.change({ target: { id: "premoveSw", checked: false } }); assert.equal(R.st.premove, false); assert.equal(R.X.pmvSt().q, null);
  R.docL.change({ target: { id: "別的", checked: true } }); assert.equal(R.st.blitz, false, "別的勾選框不管");
  assert.equal(load({ store: { blitz: true } }).cls.has("blz"), true, "打開 App 時照存檔套用");
});
test("01-board 特效在 vm 實跑：一般時開局名稱、將軍印章、開局特效、吃子水墨照常（長度照原本）；快棋時一個畫面元素都不建", () => {
  const T = load().X.blzTab();
  for (const [k, name, args, delay] of [["openFx", "openFx", ["中炮", "紅方開局"], 350], ["checkFx", "checkFx", ["臥槽馬"], 200], ["kaiju", "kaijuFx", ["r"], 0]]) {
    const a = MZ.fxRun(name, args), b = MZ.fxRun(name, args, { blitz: true });
    assert.ok(a.made >= 1, name + " 一般時有建畫面"); assert.equal(delay + Math.max(...a.timers), T[k][1], name + " 一般長度跟 blzTab 一樣");
    assert.equal(b.made, 0, name + " 快棋時不建"); assert.equal(b.timers.length, 0) }
  assert.equal(MZ.fxRun("capFx", [280, 310, 40], { stopAtRect: true }).rect, 1, "吃子水墨一般時往下跑");
  assert.equal(MZ.fxRun("capFx", [280, 310, 40], { stopAtRect: true, blitz: true }).rect, 0, "快棋時開頭就返回");
  /* 原本的開關照舊：關掉將軍特效（ckFx）時一般模式也不畫 */
  assert.equal(MZ.fxRun("checkFx", [""], { store: { ckFx: false } }).made, 0);
});
test("電腦節奏：快棋模式打開時 cpuPace() 一律「快速」（不管設定頁選擬真）；關掉照設定；快速＝1～1.5 秒", () => {
  const { TP, cpuPaceWith } = MZ.pace();
  assert.equal(cpuPaceWith({}), "real"); assert.equal(cpuPaceWith({ m_cpuPace: '"fast"' }), "fast");
  assert.equal(cpuPaceWith({ m_blitz: "true" }), "fast"); assert.equal(cpuPaceWith({ m_blitz: "true", m_cpuPace: '"real"' }), "fast");
  assert.equal(cpuPaceWith({ m_blitz: "false", m_cpuPace: '"real"' }), "real"); assert.equal(cpuPaceWith({ m_blitz: "{壞掉" }), "real", "存檔壞掉照舊");
  const Q = MZ.paceRun(7); assert.ok(Q.blitz.max < 1500 && Q.blitz.avg >= 1000, JSON.stringify(Q.blitz)); assert.ok(Q.real.avg > Q.blitz.avg * 2, "擬真平均比快棋久一倍以上");
  void TP;
});
test("〔混合〕blzTab 的一般／快棋毫秒數跟原始碼一致（01-board 的 transition、08b 的 MODAL_HOLD、m.css 的結果視窗）", () => {
  for (const r of MZ.animRun()) { assert.equal(r.normal, r.table[0], r.name + " 一般"); assert.equal(r.blitz, r.table[1], r.name + " 快棋"); assert.ok(r.blitz < r.normal) }
});

// ====================== ⑤ 接線與文件 ======================
test("〔原始碼〕08b、01-board、local.js、m.html 的掛勾都在，而且都用 typeof 保護", () => {
  const B8 = rd(path.join(M, "08b-cpugame.js")), B = rd(path.join(M, "01-board.js")), L = rd(path.join(LAB, "src", "local.js")), H = rd(path.join(DB, "m.html"));
  /* 第 13 輪 F4：3D 園子也排得了預走，08b 不再傳 flat:!parkOn() */
  assert.ok(B8.includes('function tap(i){if(st&&!st.result&&(st.turn!==st.human||st.thinking)&&typeof pmvTap==="function"&&pmvTap(st,st.human,i,{redraw:()=>{if(st)render(st)}}))return;'));
  assert.ok(B8.includes('const pmFire=()=>{if(typeof pmvFire==="function"&&st)pmvFire(st,st.human,(f,t)=>{if(busy)return false;sel=f;tap(t);return true},pmFire)};'));
  assert.ok(B8.includes('if(typeof pmvOpts==="function")pmvOpts(st,st.human,o);'));
  assert.ok(!B8.includes("flat:!parkOn()"), "3D 不再擋預走");
  assert.ok(B8.includes("draw();try{lvWatch(st,v)}catch(e){}pmFire();"));
  assert.ok(B8.includes('cgT("game.thinking","🤔 思考中…")+(typeof pmvLabel==="function"?pmvLabel(st):"")'), "第 15 輪 X3：思考中改用鍵值（cgT），預走標籤照接");
  assert.ok(B8.includes('if(st.result.w&&/將死|困斃/.test(st.result.why||"")&&!(typeof blzSkip==="function"&&blzSkip("killFx"))){'), "快棋略過將死動畫（含黑洞局）");
  for (const k of ["openFx", "checkFx", "kaiju", "capFx", "killFx"]) assert.ok(B.includes(`typeof blzSkip==="function"&&blzSkip("${k}")`), k);
  assert.ok(B.includes('if((o.pre||o.pmOpp)&&typeof pmvPaint==="function")pmvPaint(svg,el,X,Y,o);'));
  assert.ok(B.includes('const BZ=typeof blzOn==="function"&&blzOn();'));
  assert.ok(L.includes('if(JSON.parse(localStorage.getItem("m_blitz"))===true)return"fast"'));
  assert.match(H, /\/\/#include m\/07pm-premove\.js\n/);
  assert.ok(H.indexOf("//#include m/07pm-premove.js") > H.indexOf("//#include m/07hp-haptics.js"));
  const PM = rd(path.join(M, "07pm-premove.js"));
  for (const n of [...PM.matchAll(/^function (\w+)\(/gm)].map(m => m[1])) assert.ok(/^(pmv|blz)/.test(n), "前綴 " + n);
  for (const f of fs.readdirSync(M).filter(f => f.endsWith(".js") && f !== "07pm-premove.js")) { const s = rd(path.join(M, f)); assert.ok(!/^(?:function|const|let|var) (pmv|blz)\w*/m.test(s), f + " 沒有撞名") }
});
test("〔原始碼〕blitz.md 兩份逐字一樣、LF 換行；寫了開關名稱、預走規則、量測數字、限制", () => {
  const a = rd(path.join(DB, "art", "docs", "blitz.md")), b = rd(path.join(LAB, "site", "data", "docs", "blitz.md"));
  assert.equal(a, b); assert.ok(!a.includes("\r")); assert.ok(!/```/.test(a), "不用程式碼框");
  for (const w of ["⚡ 快棋模式", "blitzSw", "premoveSw", "預走", "不合法", "取消", "毫秒", "blitz-measure.js", "3D 園子", "線上對局", "pmvStats"]) assert.ok(a.includes(w), w);
});
test("〔原始碼〕設定頁有「⚡ 快棋模式」（預設關）、「⏳ 預走」（預設開）兩個開關，說明清單有 blitz.md",()=>{
  const SET=require("fs").readFileSync(require("path").join(__dirname,"../../xiangqi-db/m/05-settings.js"),"utf8");
  assert.ok(SET.includes('<b>⚡ 快棋模式</b>')&&SET.includes('id="blitzSw" aria-label="快棋模式"'));
  assert.ok(SET.includes('<b>⏳ 預走</b>')&&SET.includes('id="premoveSw" aria-label="預走"'));
  assert.ok(SET.includes('const bz=v.querySelector("#blitzSw");if(bz)bz.checked=!!store.get("blitz",false);'));
  assert.ok(SET.includes('const pm=v.querySelector("#premoveSw");if(pm)pm.checked=store.get("premove",true)!==false'));
  assert.ok(SET.includes('blitz:["blitz","⚡ 快棋與預走"]'));
});
