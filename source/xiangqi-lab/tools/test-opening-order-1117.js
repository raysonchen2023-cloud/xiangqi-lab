// 11/17 晚「新玩家開場順序」的自動測試（不開瀏覽器、不開無頭瀏覽器）：
//   開發者決定：App 一進去是開頭畫面（新的旅程／讀檔）；新的旅程＝開場電影〈天河初裂〉→ 黑洞序局 → 後續（星盤暫合、第 2 段電影、降落星槎、說書人序幕）→ 新手練習 → 回首頁；
//   主角一律齊轍、沒有選角畫面；「我會下棋，直接開始」只跳過練習；沒看過開場的舊存檔讀檔後補播一次（只播一次）；「🎬 重看開場」不改進度。
// 做法：vm 載入整支 m/07stq-starter.js，05b-save.js 的 prologue、開頭畫面按鈕的處理函式從原始碼切出來在同一個 vm 裡跑；07bh 黑洞序局那一段用假的（照 07bh 的順序記步驟），
//   另外比對 07bh 原始碼確認那一條鏈（電影 → 邀局 → 序局 → 星盤暫合 → 第 2 段電影 → journeyStart → 降落 → 序幕）還接得上。
// 用法：node xiangqi-lab/tools/test-opening-order-1117.js（或 node --test 同一支）
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), M = path.join(ROOT, "xiangqi-db", "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const STQ = rd(path.join(M, "07stq-starter.js")), SAVE = rd(path.join(M, "05b-save.js")), BH = rd(path.join(M, "07bh-blackhole.js"));
const MNQ = rd(path.join(M, "07mnq-mainquest.js")), I18N = rd(path.join(M, "07i18n.js")), CSS = rd(path.join(ROOT, "xiangqi-db", "m.css"));
const HTML = rd(path.join(ROOT, "xiangqi-db", "m.html")), GX = rd(path.join(M, "07gx-galaxy.js")), LEG = rd(path.join(M, "07-legend.js"));
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));
const cut = (s, a, b) => { const i = s.indexOf(a); assert.ok(i >= 0, "找不到：" + a); const j = s.indexOf(b, i + a.length); assert.ok(j > i, "找不到結尾：" + b); return s.slice(i, j) };
const J = x => JSON.parse(JSON.stringify(x));

/* 05b 切出來的幾段 */
const PROLOGUE = cut(SAVE, "function prologue(){", "\n\n/* ---------- 新的旅程");
const XU_BTN = (() => { const a = 'b.querySelector("#tXu").onclick='; const s = cut(SAVE, a, "};   /*"); return s.slice(a.length) + "}" })();
const GO_BTN = (() => { const a = 'on("#tGo",'; const s = cut(SAVE, a, ');on("#tCont"'); return s.slice(a.length) })();
const PICK_NEW = 'if(opt.mode==="new"&&typeof bhxNewJourney==="function"){try{if(typeof stqXuArm==="function")stqXuArm()}catch(e){}bhxNewJourney(opt.slot||1);return}';

/* 一個 App：假的 store／localStorage／計時器，載入 07stq＋05b prologue；07bh 用假的，照 07bh 的順序記在 log */
function app(init, o) {
  o = o || {};
  const mem = J(init || {}), ls = Object.assign({}, o.ls || {}), Q = [], log = [];
  const ctx = {
    console, XQCore: C, Board: function () {}, SAVE_OLD: false, FW_PLAYED: [], TITLE: o.title ? {} : null,
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { if (v === undefined) delete mem[k]; else mem[k] = J(v) } },
    localStorage: { getItem: k => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v) }, removeItem: k => { delete ls[k] } },
    sessionStorage: { getItem: k => (o.ss && k in o.ss ? o.ss[k] : null), setItem: (k, v) => { if (o.ss) o.ss[k] = String(v) }, removeItem: k => { if (o.ss) delete o.ss[k] } },
    navigator: { webdriver: false }, location: { hash: o.hash || "#/" },
    document: { visibilityState: "visible", querySelector: s => (o.busy && o.busy.test(s) ? {} : null), getElementById: () => null },
    setTimeout: f => { Q.push(f); return Q.length }, clearTimeout() {}, matchMedia: () => ({ matches: !!o.rm }),
    WX_CHARS: { x_swordboy: { n: "齊轍", nk: "阿轍", sx: "m", pc: "俥", say: "" }, x_miaogirl: { n: "駱躍梅", sx: "f", pc: "傌", say: "" } },
    curSlot: () => 1, slotMetaAll: () => ({}), jHomePick: () => "qin", applyEra() {}, myName: () => "測試", defaultName: () => "測試", setMyName() {},
    saveNow: () => { log.push("save") }, vibrate() {}, navClear() {}, fnStep() {}, esc: s => String(s), eraLabel: k => k,
    addXP: (n, w, k) => log.push("xp:" + k), mnqGrant: k => log.push("grant:" + k), mnqHomeSync() {}, mnqSt: () => ({ gift: {}, seg: {}, lamp: {} }),
    tsmProgNow: () => ({ any: false, game: false }), obCarousel: () => log.push("PICK-SCREEN"), obPicks: () => [], journeyRepick: c => log.push("repick:" + c),
    route: () => log.push("route"), goHome: () => log.push("home"), titleClose: () => { log.push("title-close"); ctx.TITLE = null }, titlePaint: v => log.push("paint:" + v),
    api: () => Promise.resolve({}), bgmForce() {}, opPre() {}, ptyFresh() {},
  };
  ctx.window = ctx;
  ctx.journey = () => ctx.store.get("journey", null);
  ctx.myChar = () => (ctx.journey() ? ctx.store.get("pChar", "") || ctx.journey().c : "");
  ctx.bhxNeed = () => !ctx.store.get("bhXuDone", null);
  ctx.modal = (h, btns) => { ctx.lastModal = btns; log.push(/星槎靠了岸/.test(h) ? "prologue" : "modal") };
  /* 07bh 新的旅程（bhxNewJourney → bhXuStart(false) → 電影 → 邀局「入局」→ 序局 → 星盤暫合「循著茶香」→ 第 2 段電影 → journeyStart → bhxLandNew → prologue）的替身 */
  ctx.bhxNewJourney = slot => {
    if (ctx.journey()) for (const k of ["xq_play", "xq_play2", "xq_playPrev"]) delete ls[k];
    ctx.store.set("bhxFresh", 1); ctx.store.set("bhxSlot", slot || 1); ctx.store.set("bhxPick", null); ctx.store.set("bhxLand", null);
    log.push("vortex"); if (ctx.TITLE) ctx.titleClose(); ctx.location.hash = "#/adventure";
    ctx.holdDuringFilm = ctx.stqHold();
    log.push(o.skipFilm ? "film-skip" : "film");   /* 07bh bhxFilm 的略過鈕：finish() → done＝bhxIntro（邀局卡） */
    if (!o.skipFilm) ctx.store.set("bhxPick", "x_swordboy");   /* 07bh bhxPick：紅色那顆（齊轍）自己落下，不讓玩家點 */
    log.push("invite"); log.push("xu-game"); ctx.store.set("bhXuDone", Date.now());
    if (!ctx.store.get("bhxPick", null)) ctx.store.set("bhxPick", "x_swordboy");   /* 07bh bhxAfter：略過電影也補記 bhxPick */
    log.push("film2"); ctx.journeyStart(ctx.store.get("bhxSlot", 1), ctx.store.get("bhxPick", null));
  };
  ctx.journeyStart = (n, c) => {   /* 05b journeyStart：c 一律換成 x_swordboy、saveApply({}) 清掉存檔鍵（含 opSeen）、建旅程；had＝重開 App 後 saveBoot 再 bhxLandNew */
    c = "x_swordboy"; delete mem.opSeen; ctx.store.set("pChar", c);
    ctx.store.set("journey", { c, sx: "m", born: Date.now(), v: 1, era: 2, home: "qin" }); log.push("journey:" + c);
    ctx.store.set("bhxLand", Date.now()); ctx.store.set("bhxFresh", 0); log.push("land"); ctx.prologue();
  };
  ctx.bhXuStart = old => { log.push(old ? "replay-xu" : "xu"); if (old) { ctx.store.set("bhXuOld", 1) } };
  vm.createContext(ctx);
  vm.runInContext(STQ, ctx, { filename: "07stq-starter.js" });
  vm.runInContext(PROLOGUE, ctx, { filename: "05b prologue" });
  ctx.stqOpen = () => { log.push("practice") };   /* 練習畫面本身（#stqPg）test-starter.js 另外測 */
  Q.length = 0;   /* 載入時排的 stqAuto、補播檢查不自動跑，測試自己叫 */
  const flush = () => { let n = 0; while (Q.length && n++ < 50) Q.shift()() };
  const run = code => vm.runInContext(code, ctx);
  return { ctx, mem, ls, log, Q, flush, run };
}
/* 練習畢業（stqGrad）要一個最小的練習畫面 */
function fakeUI(A) {
  A.run(`STQ_UI={pg:{innerHTML:"",querySelector:()=>({onclick:null,focus(){},className:""}),querySelectorAll:()=>[],classList:{add(){},remove(){}},remove(){}},gid:0,peek:false,busy:false,end:false}`);
}

test("全新玩家：開頭畫面「⚔ 新的旅程」→ 電影 → 黑洞序局 → 後續（第 2 段電影、建齊轍的旅程、降落、序幕）→ 新手練習 → 回首頁；沒有選角畫面", () => {
  const A = app({}, { title: true });
  A.run("(" + XU_BTN + ")()");
  assert.equal(J(A.mem.stq).st, "wait", "按下去先記：開場跑完要接新手練習");
  assert.equal(A.ctx.holdDuringFilm, true, "電影播放中 stqHold＝true（02-shell 加到主畫面、07mnq 授印禮都先不跳）");
  assert.deepEqual(A.log.filter(x => x !== "save"), ["vortex", "title-close", "film", "invite", "xu-game", "film2", "journey:x_swordboy", "land", "prologue"]);
  assert.equal(A.ctx.journey().c, "x_swordboy", "主角一律齊轍");
  /* 序幕按「入局」 */
  A.ctx.lastModal[0][1]();
  assert.equal(A.mem.opSeen, 1, "序幕看完記「看過開場」");
  A.flush();
  const L = A.log.filter(x => x !== "save");
  assert.deepEqual(L.slice(L.indexOf("prologue")), ["prologue", "route", "practice"], "序幕之後才是新手練習");
  assert.equal(J(A.mem.stq).st, "run");
  assert.ok(!A.log.includes("PICK-SCREEN") && !A.log.some(x => /^repick:/.test(x)), "沒有選角畫面、沒有換角色");
  /* 練習做完六個任務 → 畢業 → 出發（齊轍）→ 回首頁 */
  fakeUI(A); A.run('stqGrad("all")');
  assert.equal(J(A.mem.stq).st, "done"); assert.ok(A.log.includes("grant:a1"));
  A.run('stqPick(STQ_C0)');
  assert.ok(A.log.includes("route") && !A.log.includes("PICK-SCREEN"));
  assert.equal(A.ctx.journey().c, "x_swordboy");
  assert.equal(A.run("stqXuNeedOf(stqXuEnv())"), "", "畢業後不會再補播開場");
  assert.equal(A.run("stqHold()"), false);
});

test("按「我會下棋，直接開始」：電影和黑洞序局照樣看，只少了練習（補齊經驗、領入門物品、回首頁）", () => {
  const A = app({}, { title: true });
  A.run("(" + XU_BTN + ")()"); A.ctx.lastModal[0][1](); A.flush();
  const L = A.log.filter(x => x !== "save");
  assert.ok(L.indexOf("film") >= 0 && L.indexOf("xu-game") > L.indexOf("film") && L.indexOf("practice") > L.indexOf("xu-game"), "先電影、序局，才到練習");
  fakeUI(A); A.run('stqGrad("skip")');
  const S = J(A.mem.stq); assert.equal(S.st, "done"); assert.equal(S.how, "skip");
  assert.ok(A.log.includes("xp:stq:skip") && A.log.includes("grant:a1"));
  A.run('stqPick(STQ_C0)');
  assert.ok(!A.log.slice(A.log.indexOf("xp:stq:skip")).some(x => /^(film|xu|replay-xu|vortex)$/.test(x)), "跳過練習不會再播一次開場");
  assert.equal(A.mem.opSeen, 1);
});

test("跳過電影：照樣接到邀局、黑洞序局、後續、練習（07bh 的略過鈕原始碼確認）", () => {
  const A = app({}, { title: true, skipFilm: true });
  A.run("(" + XU_BTN + ")()"); A.ctx.lastModal[0][1](); A.flush();
  const L = A.log.filter(x => x !== "save");
  assert.deepEqual(L.slice(0, 4), ["vortex", "title-close", "film-skip", "invite"]);
  assert.ok(L.includes("journey:x_swordboy") && L[L.length - 1] === "practice");
  /* 07bh：電影的「略過」→ finish() → done（新玩家＝bhxIntro 邀局卡）；減少動態＝兩頁分鏡 p1、p5 也接 bhxIntro */
  const F = cut(BH, "function bhxFilm(F,done){", "\nfunction bhxFilmMeteor(");
  assert.ok(F.includes('o.querySelector(".bx-k").onclick=e=>{e.stopPropagation();vibrate(5);if(S&&S.meteor!=null&&!fired.met){opSeek(S.meteor);return}finish()}'));
  assert.ok(F.includes("if(done)setTimeout(done,350)"));
  assert.ok(BH.includes('if(rm){bhxVortex(c,()=>bhxPages(["p1","p5"],bhxIntro,true));return}bhxFilm(OP_FILM1,bhxIntro);bhxVortex(c,null)}'));
  assert.ok(BH.includes('if(!old&&(store.get("bhxFresh",0)||!journey())&&!store.get("bhxPick",null))store.set("bhxPick","x_swordboy")'), "略過電影也記齊轍");
});

test("黑洞序局不給略過（開發者 11/17 晚選單：照 11/16「打完 boss 才能繼續」）：邀局卡只有「入局」；電影本身照舊能略過", () => {
  const IN = cut(BH, "function bhxIntro(){", "\nfunction bhxGo(){");
  assert.ok(IN.includes('[["入局",bhxGo]],"prolog")}'), "邀局卡只有一顆「入局」");
  assert.ok(!/略過|跳過|bhxSkip/.test(IN), "邀局卡沒有略過");
  assert.ok(!/function bhxSkip\(/.test(BH));
  assert.ok(cut(BH, "function bhxFilm(F,done){", "\nfunction bhxFilmMeteor(").includes('<button class="bx-k" type="button">略過</button>'), "電影的略過鈕還在");
});

test("07bh 那一條鏈還接得上：新的旅程 → 電影〈天河初裂〉→ 邀局 → 序局（bh:xu）→ 星盤暫合 → 第 2 段電影 → journeyStart（齊轍）→ 降落 → 序幕", () => {
  assert.ok(BH.includes('store.set("bhxFresh",1);store.set("bhxSlot",slot||1);store.set("bhxPick",null);store.set("bhxLand",null);'));
  assert.ok(BH.includes('try{opPre()}catch(e){}bhXuStart(false);if(typeof titleClose==="function")titleClose();location.hash="#/adventure"}'), "先蓋星渦、再關開頭畫面");
  assert.ok(BH.includes("bhxFilm(OP_FILM1,bhxIntro)"));
  assert.ok(cut(BH, "function bhxIntro(){", "\nfunction bhxGo(){").includes('[["入局",bhxGo]]'));
  assert.ok(cut(BH, "function bhxGo(){", "\nconst BHX_CAM=").includes("jStart(BHX_ID,{human:\"r\",lx:1,journey:BHX_ID,lv:{fen:BHX_FEN"));
  assert.ok(BH.includes("function bhResultModal(st,win,draw0,XPR){if(st&&st.journey===BHX_ID){bhxAfter();return}"));
  assert.ok(BH.includes("function bhGameEnd(st){if(st&&st.journey===BHX_ID){bhxEnd();return}"));
  assert.ok(LEG.includes('if(String(P.id).startsWith("bh:")){if(typeof bhGameEnd==="function")bhGameEnd(st,P);return}'));
  const AF = cut(BH, "function bhxAfter(){", "\n/* 星渦裡的七顆紅星");
  assert.ok(AF.includes("bhxFilm(OP_FILM2,d)") && AF.includes('journeyStart(store.get("bhxSlot",1)||1,pk,nm,2)') && AF.includes("prologue()"));
  assert.ok(SAVE.includes('async function journeyStart(n,c,nm,df){c="x_swordboy";'), "journeyStart 一律齊轍");
  assert.ok(SAVE.includes('if(typeof bhxLandNew==="function"&&bhxLandNew())return;'));
  assert.ok(cut(BH, "function bhxLandNew(){", "\n/* ===== 序章配樂").includes("prologue()"));
  /* 流星：紅色那顆（齊轍）自己落下（bhxPick），點星選角（bhxPickChoose）留著不呼叫 */
  assert.ok(BH.includes('function bhxPick(o,cap,cb){const k="x_swordboy";'));
  assert.equal((BH.match(/bhxPickChoose\(/g) || []).length, 1, "bhxPickChoose 只有宣告、沒人叫");
  assert.ok(/bhxPick\(o,cap,k=>/.test(BH) && /bhxPick\(o,cap,cb/.test(BH));
});

test("沒有任何選角畫面：開頭畫面「新的旅程」、存檔格、破關卡預選同伴（opt.c）都走開場；練習畢業直接用齊轍", () => {
  /* 05b pick 頁：mode new 一律 bhxNewJourney（拿掉 !opt.c），不出 obCarousel */
  assert.ok(SAVE.includes(PICK_NEW));
  const A = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "done" } });
  A.run("(function(opt){" + PICK_NEW + ';obCarousel()})({mode:"new",slot:2,c:"x_miaogirl"})');
  assert.ok(!A.log.includes("PICK-SCREEN"), "帶預選同伴也不出選角輪播");
  assert.equal(A.ctx.journey().c, "x_swordboy");
  /* 存檔清單「開新旅程」、開頭畫面「新的旅程」都進 pick（mode new） */
  assert.ok(SAVE.includes('else if(a==="new"){if(inTitle)titlePaint("pick",{mode:"new",slot:n});else{closeSheet();titleScreen({view:"pick",mode:"new",slot:n})}}'));
  assert.ok(SAVE.includes('on("#tNew",()=>{if(J)titlePaint("slots",{mode:"new"});else{const e=[1,2,3].find(n=>!M[n])||1;titlePaint("pick",{mode:"new",slot:e})}});'));
  /* 練習畢業：出發＝stqPick(STQ_C0)，stqPickView（輪播）留著不呼叫 */
  assert.ok(STQ.includes('b.onclick=()=>{try{vibrate(8)}catch(e){}stqPick(STQ_C0)}'));
  assert.equal((STQ.match(/stqPickView\(/g) || []).length, 1, "stqPickView 只有宣告");
  /* 改選（news／repick）頁沒有入口 */
  assert.ok(!/titlePaint\("news"|view:"news"/.test(SAVE));
});

test("舊存檔（做完練習、沒有看過開場）：讀檔回首頁後補播一次電影＋黑洞序局（下完回首頁、不重做練習）；第二次打開不再播", () => {
  const init = { journey: { c: "x_swordboy", born: 1, stq: 1 }, pChar: "x_swordboy", stq: { v: 1, st: "done", how: "all" } };
  const A = app(init);
  A.run("stqXuTick()");
  assert.ok(A.log.includes("replay-xu"), "補播（bhXuStart(true)＝舊玩家模式，下完回首頁）");
  assert.equal(A.mem.opSeen, 1, "一開始播就記，只播一次");
  assert.ok(A.mem.bhXuAsk, "07bh 那張「大更新」問卷不再跳");
  assert.equal(A.ctx.location.hash, "#/adventure", "背後換到星槎頁，首頁的小視窗不會疊到電影上");
  assert.equal(J(A.mem.stq).st, "done", "不重做新手練習");
  assert.ok(!A.log.includes("practice"));
  assert.equal(A.run("stqHold()"), true, "補播中：加到主畫面、授印禮先不跳");
  /* 序局下完（07bh bhxEnd 記 bhXuDone）、星盤暫合按了（bhXuOld 歸 0）＝補播結束 */
  A.mem.bhXuDone = Date.now() + 1; A.mem.bhXuOld = 0;
  assert.equal(A.run("stqHold()"), false);
  /* 第二次打開：不再播 */
  const B = app(Object.assign({}, A.mem));
  B.run("stqXuTick()");
  assert.ok(!B.log.includes("replay-xu"));
  /* 中途關掉（序局沒下完）也不再自動播 */
  const D = app(Object.assign({}, init, { opSeen: 1 }));
  D.run("stqXuTick()"); assert.ok(!D.log.includes("replay-xu"));
});

test("讀檔進來：已看過開場的存檔直接進首頁；這支手機下完過序局的舊存檔只補記旗標；開頭畫面還在、別的視窗開著就等", () => {
  const seen = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "done" }, opSeen: 1 });
  seen.run("stqXuTick()"); assert.ok(!seen.log.includes("replay-xu"));
  const done = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "old" }, bhXuDone: 123 });
  done.run("stqXuTick()"); assert.ok(!done.log.includes("replay-xu")); assert.equal(done.mem.opSeen, 1, "補記看過");
  /* 開頭畫面還蓋著：先不播，等「▶ 繼續」關掉開頭畫面 */
  const t = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "done" } }, { title: true });
  t.run("stqXuTick()"); assert.ok(!t.log.includes("replay-xu")); assert.equal(t.Q.length, 1, "排下一次檢查");
  t.ctx.TITLE = null; t.flush(); assert.ok(t.log.includes("replay-xu"));
  /* 有別的視窗（.modal 等）：等 */
  const m = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "done" } }, { busy: /\.modal/ });
  m.run("stqXuTick()"); assert.ok(!m.log.includes("replay-xu"));
  /* 在對局頁：等（回到首頁或星槎頁才播） */
  const g = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "done" } }, { hash: "#/cpu" });
  g.run("stqXuTick()"); assert.ok(!g.log.includes("replay-xu"));
  /* 有下到一半的石桌往事類對局：先不補播（07-legend jStart 會先問要不要接那盤），也不記旗標 */
  const j = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "done" } }, { ls: { xq_play: JSON.stringify({ journey: "park", moves: [{ f: 1, t: 2 }] }) } });
  j.run("stqXuTick()"); assert.ok(!j.log.includes("replay-xu")); assert.equal(j.mem.opSeen, undefined);
  /* 練習做到一半的舊存檔：先接著練（▶ 繼續 → stqXuResume），畢業後下次打開才補播 */
  const r = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "run", n: 2, done: {}, got: {} } });
  r.run("stqXuResume()"); r.flush(); assert.ok(r.log.includes("practice")); assert.ok(!r.log.includes("replay-xu"));
  /* 開頭畫面「▶ 繼續」會叫 stqXuResume */
  assert.ok(GO_BTN.includes('stqXuResume()'));
  /* 純函式 */
  const p = app().run("stqXuNeedOf");
  assert.equal(p({ on: true, J: true, need: true, can: true }), "play");
  assert.equal(p({ on: true, J: true, need: false, can: true }), "mark");
  for (const x of [{ J: false }, { seen: true }, { fresh: true }, { st: "run" }, { st: "wait" }, { game: true }, { can: false }, { on: false }])
    assert.equal(p(Object.assign({ on: true, J: true, need: true, can: true }, x)), "", JSON.stringify(x));
});

test("「看過開場」旗標跟存檔走：在 JOURNEY_KEYS（存檔格）裡；換手機轉移碼帶整份 localStorage", () => {
  assert.ok(SAVE.includes('JOURNEY_KEYS.push("m_opSeen");'));
  assert.ok(SAVE.includes("function saveSnap(){const d={};for(const k of JOURNEY_KEYS)"), "存檔格的快照照 JOURNEY_KEYS");
  assert.ok(SAVE.includes("const dump=XQSave.dump();") && HTML.includes("dump:function(){var o={};for(var i=0;i<localStorage.length;i++)"), "轉移碼帶整份 localStorage");
  assert.ok(!/store\.set\("opSeen"/.test(BH), "07bh 不碰這個旗標");
});

test("老玩家「新的旅程」：一樣走開場、主角齊轍、序幕後接新手練習（全新、老玩家按下去都一樣）；新旅程不帶舊旅程的旗標", () => {
  const A = app({ journey: { c: "x_swordboy", born: 1 }, pChar: "x_swordboy", stq: { v: 1, st: "done", how: "skip" }, opSeen: 1, bhXuDone: 5 });
  A.run("(function(opt){" + PICK_NEW + '})({mode:"new",slot:2})');
  assert.equal(J(A.mem.stq).st, "wait");
  assert.ok(A.log.includes("film") && A.log.includes("xu-game") && A.log.includes("journey:x_swordboy"));
  assert.ok(A.log.includes("prologue"));
  assert.equal(A.mem.opSeen, undefined, "journeyStart 的 saveApply({}) 清掉了舊旅程的旗標");
  A.ctx.lastModal[0][1](); A.flush();
  assert.equal(A.mem.opSeen, 1); assert.ok(A.log.includes("practice"));
  /* 開場還在跑（wait、bhxFresh）時，補播檢查不會插進來 */
  const W = app({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "wait", at: 10 }, bhxFresh: 1 });
  W.run("stqXuTick()"); assert.ok(!W.log.includes("replay-xu")); assert.equal(W.run("stqHold()"), true);
});

/* ---------- iMac I P3：開新旅程走到一半關掉 App ---------- */
const SAVEBOOT = cut(SAVE, "function saveBoot(){", "\nsetTimeout(()=>{try{saveBoot()}");
/* 冷開機一次：新的 sessionStorage（真的關掉 App 再開）、網址停在 hash；回 log */
function launch(mem, hash, ss) {
  const A = app(mem, { hash, ss: ss || {} });
  Object.assign(A.ctx, { SAVE_OLD: null, CHAR_ERA: {}, lockFix() {}, titleScreen: () => A.log.push("TITLE"), bhxResume: () => { A.log.push("bhxResume"); return true }, bhxBack() {}, bhxLandNew: () => { A.log.push("land"); return true } });
  A.run(SAVEBOOT + "\nsaveBoot()");
  return A;
}
/* 測試員 I 的情境：第 2 格有舊旅程，「新的旅程」選第 3 格 → 開場 → 序局下到一半就關掉 App（網址停在序局頁） */
const I_CASE = () => ({ journey: { c: "x_swordboy", born: 5 }, pChar: "x_swordboy", slotCur: 2, stq: { v: 1, st: "wait", at: Date.now() - 60000, prev: { v: 1, st: "done", how: "all" } }, bhxFresh: 1, bhxSlot: 3, bhxPick: "x_swordboy", bhxLand: null, opSeen: 1 });
const I_LS = { xq_play: JSON.stringify({ journey: "bh:xu", moves: [], result: null }) };

test("開新旅程走到哪一段（stqXuMid）：電影／序局＝xu、旅程建好還沒降落＝land、序幕＝pro、練習＝run；其他＝沒有", () => {
  const f = app().run("stqXuMidOf");
  assert.equal(f({ on: true, fresh: true }), "xu");
  assert.equal(f({ on: true, fresh: true, nj: true, done: true }), "land");
  assert.equal(f({ on: true, fresh: true, land: true, st: "wait", nj: true }), "pro");
  assert.equal(f({ on: true, st: "wait", nj: true }), "pro");
  assert.equal(f({ on: true, st: "wait", nj: false }), "", "舊旅程還在、開場沒開始＝不算");
  assert.equal(f({ on: true, st: "run" }), "run");
  assert.equal(f({ on: true, st: "done" }), "");
  assert.equal(f({ on: false, fresh: true }), "");
  const A = app(I_CASE(), { ls: I_LS }); assert.equal(A.run("stqXuMid()"), "xu"); assert.equal(A.run("stqXuSlot()"), 3);
});

test("測試員 I 情境：第 3 格開新旅程、序局下到一半關掉 App——連續重開兩次都先出開頭畫面，不直接掉進序局；主按鈕「▶ 繼續」寫第 3 格、接回同一盤", () => {
  const mem = I_CASE();
  for (const n of [1, 2]) {
    const A = launch(mem, "#/journey/play", {});
    assert.deepEqual(A.log, ["TITLE"], "第 " + n + " 次重開：先出開頭畫面（不管網址停在序局頁），也不直接被 bhxResume 拉進去");
  }
  /* 開頭畫面的按鈕：主按鈕換成這一趟（xm），舊旅程第 2 格的「繼續」不放；新的旅程、存檔與讀檔照舊 */
  const A = app(mem, { ls: I_LS, hash: "#/journey/play" });
  assert.deepEqual(J(A.run('stqXuMenu(["go","new","save"],stqXuMid())')), ["xm", "new", "save"]);
  assert.deepEqual(J(A.run('stqXuMenu(["new","later"],"xu")')), ["xm", "new"], "全新玩家開場途中");
  assert.deepEqual(J(A.run('stqXuMenu(["cont","story","im"],"land")')), ["xm", "new", "im"]);
  assert.deepEqual(J(A.run('stqXuMenu(["go","new","save"],"run")')), ["go", "new", "save"], "練習中：新旅程已經落地，照常「▶ 繼續」第 3 格");
  assert.ok(SAVE.includes('if(k==="xm"){const n=typeof stqXuSlot==="function"?stqXuSlot():1;') && SAVE.includes("<small>新的旅程・第 ${n} 格</small>"), "卡片寫正在開的那一格");
  assert.ok(SAVE.includes('if(!opt.view&&typeof stqXuMid==="function"&&/^(xu|land)$/.test(stqXuMid())){titlePaint("menu",opt);return}'), "開場途中直接出選單（全新玩家也不會變回「⚔ 新的旅程」那一頁）");
  /* 「▶ 繼續」＝回同一盤序局 */
  assert.equal(A.run("stqXuMidGo()"), "xu-game"); assert.equal(A.ctx.location.hash, "#/journey/play");
  assert.ok(!A.log.includes("vortex"), "不重頭播開場");
  /* 同一次開 App 裡被重新載入（sessionStorage 還在）＝照 11/16 P0 直接接回，不出開頭畫面 */
  const S = launch(mem, "#/journey/play", { xqTitleShown: "1" });
  assert.deepEqual(S.log, ["bhxResume"]);
});

test("開新旅程每一段關掉 App 再開都先出開頭畫面，「▶ 繼續」接回那一段", () => {
  const born = Date.now();
  /* 電影、邀局途中（xq_play 沒有序局）＝07bh bhxResume 接回邀局卡 */
  let A = app(I_CASE()); A.ctx.bhxResume = () => { A.log.push("bhxResume"); return true };
  assert.equal(launch(I_CASE(), "#/adventure").log[0], "TITLE");
  assert.equal(A.run("stqXuMidGo()"), "xu-resume");
  /* 旅程建好、還沒降落＝降落經典星槎再出序幕（07bh bhxLandNew） */
  const L = Object.assign(I_CASE(), { journey: { c: "x_swordboy", born }, bhXuDone: 1, slotCur: 3 });
  assert.equal(launch(L, "#/").log[0], "TITLE");
  A = app(L); A.ctx.bhxLandNew = () => { A.log.push("land"); return true }; assert.equal(A.run("stqXuMidGo()"), "land");
  /* 降落了、序幕沒按＝回星槎頁接序幕；序幕卡多一顆「回開頭畫面」 */
  const P = Object.assign(I_CASE(), { journey: { c: "x_swordboy", born }, bhXuDone: 1, slotCur: 3, bhxFresh: 0, bhxLand: born });
  assert.equal(launch(P, "#/adventure").log[0], "TITLE");
  A = app(P); assert.equal(A.run("stqXuMid()"), "pro");
  A.run("stqXuResume()"); A.flush();
  assert.equal(A.ctx.location.hash, "#/adventure"); assert.ok(A.log.includes("prologue"));
  assert.equal(A.ctx.lastModal.length, 2); assert.equal(A.ctx.lastModal[1][0], "回開頭畫面");
  A.ctx.titleScreen = () => A.log.push("TITLE"); A.ctx.lastModal[1][1]();
  assert.ok(A.log.includes("TITLE")); assert.equal(J(A.mem.stq).st, "wait", "離開不改進度，下次「▶ 繼續」再接序幕");
  /* 練習中＝接著練 */
  const R = Object.assign(I_CASE(), { journey: { c: "x_swordboy", born }, bhxFresh: 0, bhxLand: born, stq: { v: 1, st: "run", at: born, n: 3, done: {}, got: {} } });
  assert.equal(launch(R, "#/adventure").log[0], "TITLE");
  A = app(R); A.run("stqXuResume()"); A.flush(); assert.ok(A.log.includes("practice"));
  /* 都不是（一般存檔）＝照原本：網址停在別頁就不出開頭畫面 */
  const N = launch({ journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "done" }, opSeen: 1 }, "#/cpu");
  assert.ok(!N.log.includes("TITLE"));
});

test("序局、序幕、練習中都有「回開頭畫面」：序局頁頂欄（手機收在「⋯」）、序幕卡、練習頁右上「⋯」；只是暫時離開，序局照樣不給略過", () => {
  const CPU = rd(path.join(M, "08b-cpugame.js"));
  assert.ok(CPU.includes('...(typeof bhxLocked==="function"&&bhxLocked(st)&&typeof stqXuLeave==="function"?[["🚪",()=>{try{stqXuLeave()}catch(e){}},"回開頭畫面"]]:[])'), "序局鎖著時頂欄多一顆「回開頭畫面」");
  assert.ok(rd(path.join(M, "02-shell.js")).includes("if(right&&right.length>=2&&innerWidth<520&&/^#\\/(cpu|arena|pvp|journey\\/play|redo\\/play)(\\/|$)/.test(location.hash||\"\"))topMore(tr,right)"), "對局頁兩顆以上、手機寬度＝收進「⋯」");
  assert.ok(STQ.includes('<button type="button" class="stq-mo" aria-label="更多" aria-expanded="false">⋯</button>') && STQ.includes('<button type="button" class="stq-lv">回開頭畫面</button>') && STQ.includes('pg.querySelector(".stq-lv").onclick=()=>{try{vibrate(6)}catch(e){}stqXuLeave()}'));
  /* stqXuLeave：關練習頁、出開頭畫面；不改練習紀錄、不記「看過開場」、不動序局 */
  const A = app(I_CASE(), { ls: I_LS }); const before = J(A.mem);
  A.ctx.titleScreen = () => A.log.push("TITLE"); A.run("stqXuLeave()");
  assert.ok(A.log.includes("TITLE")); assert.deepEqual(J(A.mem), before);
  assert.equal(A.run("stqXuMid()"), "xu", "回開頭畫面後還是同一趟，「▶ 繼續」接得回來");
  /* 序局本身照開發者決定不給略過 */
  assert.ok(!/略過|跳過/.test(cut(BH, "function bhxIntro(){", "\nfunction bhxGo(){")));
});

test("開新旅程途中改讀別格存檔＝放棄那一趟：還原原本的練習紀錄、拿掉 bhxFresh，重新載入後不會又被拉回序局", () => {
  assert.ok(SAVE.includes('try{if(typeof stqXuCancel==="function")stqXuCancel()}catch(e){}SAVE_LOCK=true;store.set("slotCur",n);saveApply(S.data);'), "05b slotLoad 讀檔前先放棄");
  const A = app(I_CASE(), { ls: I_LS }); A.run("stqXuCancel()");
  assert.equal(A.mem.bhxFresh, 0); assert.deepEqual(J(A.mem.stq), { v: 1, st: "done", how: "all" }, "還原開新旅程前的練習紀錄");
  assert.equal(A.run("stqXuMid()"), "");
  const F = app({ stq: { v: 1, st: "wait", at: 1, prev: null }, bhxFresh: 1 }); F.run("stqXuCancel()"); assert.equal(F.run("stqSt0()"), null, "全新玩家：回到沒有練習紀錄");
  /* stqXuArm 記下原本的紀錄（不會一層包一層） */
  const R = app({ stq: { v: 1, st: "done", how: "skip" } }); R.run("stqXuArm()"); R.run("stqXuArm()");
  const pv = J(R.mem.stq.prev); assert.equal(pv.st, "done"); assert.equal(pv.how, "skip"); assert.equal(pv.prev, undefined);
});

test("「🎬 重看開場」：只重播電影，不開對局、不動進度、不發獎勵；更多玩法、設定 → 聲音 → 氛圍都有，英文有字", () => {
  const init = { journey: { c: "x_swordboy", born: 1 }, stq: { v: 1, st: "done" }, opSeen: 1, bhXuDone: 9, xp: { L: 3 }, bhxPick: null, bhxFresh: 0 };
  const A = app(init); let done = null;
  A.ctx.bhxFilm = (F, d) => { A.log.push("film:" + F.n); A.ctx.store.set("bhxPick", "x_swordboy"); done = d };   /* 電影裡流星會記 bhxPick */
  A.ctx.OP_FILM1 = { n: 1 }; A.ctx.opPlay = n => A.log.push("op:" + n); A.ctx.opStop = () => A.log.push("op-stop"); A.ctx.bhxBack = on => A.log.push("back:" + on);
  A.run("OP_FILM1=this.OP_FILM1");
  assert.equal(A.run("stqXuReplayOk()"), true);
  const before = J(A.mem);
  assert.equal(A.run("stqXuReplay()"), true);
  assert.deepEqual(A.log, ["back:true", "op:1", "film:1"]);
  assert.equal(A.run("stqHold()"), true, "重看中也不跳加到主畫面");
  assert.equal(A.run("stqXuReplay()"), false, "播放中再按不會疊第二部");
  done();
  assert.deepEqual(J(A.mem), before, "播完存檔一個鍵都沒變（bhxPick 還原）");
  assert.ok(!A.log.some(x => /^xp:|^grant:|xu|practice/.test(x)), "不開對局、不發獎勵、不開練習");
  assert.equal(A.run("stqHold()"), false);
  /* 減少動態：兩頁分鏡 */
  const R = app(init, { rm: true }); let pg = null;
  R.ctx.bhxPages = (k, d, first) => { pg = [J(k), first]; d() }; R.ctx.bhxFilm = () => R.log.push("FILM"); R.ctx.OP_FILM1 = { n: 1 }; R.ctx.opPlay = () => {}; R.ctx.opStop = () => {}; R.ctx.bhxBack = () => {};
  R.run("OP_FILM1=this.OP_FILM1"); R.run("stqXuReplay()");
  assert.deepEqual(pg, [["p1", "p5"], true]); assert.ok(!R.log.includes("FILM"));
  /* 入口 */
  const MORE = cut(STQ, "function stqMore(", "\n/* 重新整理");
  assert.ok(MORE.includes('data-k="op"') && MORE.includes("<b>重看開場</b>") && MORE.includes("setTimeout(stqXuReplay,250)"));
  const SND = cut(MNQ, "function mnqSndRow(box){", "\n/*");
  assert.ok(SND.includes("🎬 重看開場") && SND.includes("stqXuReplay()") && SND.includes("if(!S.music.length&&!ch&&!op)return;"));
  assert.ok(I18N.includes('"重看開場":"Rewatch the opening"') && I18N.includes('"天河初裂":"The Sky River Splits"'));
});

test("開頭畫面淡出到電影之間不會先畫首頁：新的旅程先蓋黑洞底幕（z 8990，在開頭畫面 9998 底下）才關開頭畫面；07stq 不再自己關開頭畫面開練習", () => {
  /* 05b「⚔ 新的旅程」：先記 wait、交給 bhxNewJourney（它先 bhXuStart 再 titleClose） */
  assert.ok(XU_BTN.indexOf("stqXuArm()") < XU_BTN.indexOf("bhxNewJourney(1)"));
  const XS = cut(BH, "function bhXuStart(old){", "\nfunction bhxIntro(){");
  assert.ok(XS.indexOf("bhxBack(true)") >= 0 && XS.indexOf("bhxBack(true)") < XS.indexOf("bhxFilm(OP_FILM1"), "星渦、電影之前先蓋底幕");
  assert.ok(BH.includes('d.style.cssText="position:fixed;inset:0;z-index:8990;background:#05060d url(data/park/bh_far2.webp) center/cover no-repeat"'), "底幕一放上去就是不透明（沒有淡入、不用等下一個畫格）");
  assert.ok(/#xqTitle\{[^}]*z-index:9998/.test(CSS), "開頭畫面在底幕上面，淡出時露出的是底幕");
  /* 07stq 開機：不再 titleClose()+stqBegin()（11/17 F P2-1 的來源：先淡掉開頭畫面，主執行緒建旅程、練習頁等下一個畫格才淡入，中間露出首頁「還沒登船」） */
  const B = cut(STQ, "function stqBoot(opt){", "\n/* 預設角色的旅程");
  assert.ok(!B.includes("stqBegin(") && !B.includes("fwSaved("));
  assert.ok((B.match(/titleClose\(\)/g) || []).length === 1 && B.includes("if(pk){titleClose();stqOpen({peek:true});return true}"), "只剩開發者預覽會關開頭畫面");
  /* 實際跑：全新玩家 stqBoot 不接手、不關開頭畫面 */
  const A = app({}, { title: true });
  assert.equal(A.run("stqBoot({})"), false);
  assert.ok(!A.log.includes("title-close") && !A.log.includes("practice"));
});

test("不會重複播開場：新的旅程、練習畢業、補播三條路不互相觸發第二次", () => {
  const A = app({}, { title: true });
  A.run("(" + XU_BTN + ")()"); A.ctx.lastModal[0][1](); A.flush();
  fakeUI(A); A.run('stqGrad("all")'); A.run("stqPick(STQ_C0)");
  A.run("stqXuTick()"); A.flush();
  const n = A.log.filter(x => /^(film|film-skip|replay-xu|xu)$/.test(x)).length;
  assert.equal(n, 1, "整趟只播一次：" + A.log.join(","));
  /* stqAuto 只接練習中（run），不會在開場途中（wait）把練習蓋上去 */
  const W = app({ journey: { c: "x_swordboy", born: 9e15 }, stq: { v: 1, st: "wait", at: 1 } });
  W.run("stqAuto()"); assert.ok(!W.log.includes("practice"));
  /* 序幕「入局」：不是新的旅程來的（stq 不是 wait）＝只記旗標，不開練習 */
  const P = app({ journey: { c: "x_swordboy", born: 1 }, pChar: "x_swordboy", stq: { v: 1, st: "done" }, bhXuDone: 7 });
  P.ctx.prologue(); P.ctx.lastModal[0][1](); P.flush();
  assert.ok(!P.log.includes("practice")); assert.equal(P.mem.opSeen, 1);
});

/* 十三星系（07gx gxOpen）＋觀星臺（07gxt gxtOpen）放進同一個 vm */
function galaxy(mem) {
  const GXT = rd(path.join(M, "07gxt-guanxing.js"));
  const ctx = { store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = J(v) } } };
  vm.createContext(ctx);
  vm.runInContext("const GXT_ON=true;" + cut(GXT, "const gxtWon=", "\n/* 直幅") + "\n" + GX.slice(GX.indexOf("const gxOpen="), GX.indexOf("\n", GX.indexOf("const gxOpen="))) + "\n;this.R={gxOpen,gxtOpen}", ctx);
  return ctx.R;
}
test("十三星系（K P1-5，開發者選 B）：打贏星門圍城就開，跟觀星臺同一個條件；bhCount 與偏航設計都不動", () => {
  /* 新存檔：序局下完（bhXuDone）、bhCount 還是 0 → 還沒開 */
  let G = galaxy({ bhXuDone: 1 });
  assert.equal(G.gxOpen(), false, "只下完序局還不開");
  /* 打贏星門圍城（07sg2 sg2End 記在 gsv.v2[關][難度].w）→ 觀星臺、十三星系一起開 */
  G = galaxy({ bhXuDone: 1, gsv: { c: {}, h: {}, v2: { 1: { 1: { w: 1, l: 0, d: 0 } } }, g: [] } });
  assert.equal(G.gxtOpen(), true); assert.equal(G.gxOpen(), true, "打贏星門圍城後十三星系能開");
  /* 只輸過：不開 */
  G = galaxy({ gsv: { v2: { 1: { 1: { w: 0, l: 2 } } } } }); assert.equal(G.gxOpen(), false);
  /* 舊存檔有 bhCount 的照舊開 */
  G = galaxy({ bhCount: 2 }); assert.equal(G.gxOpen(), true);
  /* 開發者測試台全部解鎖照舊（DEVMODE 不在這個 vm 裡＝關） */
  G = galaxy({ dvtGxAll: 1 }); assert.equal(G.gxOpen(), false);
  /* bhCount、偏航設計沒動：序局、星門圍城都不加 bhCount */
  assert.ok(BH.includes("function bhGameEnd(st){if(st&&st.journey===BHX_ID){bhxEnd();return}"), "序局只記 bhXuDone");
  assert.ok(cut(BH, "function bhGameEnd(st){", "\nfunction bhResultModal(").includes('if(typeof gsvIs==="function"&&gsvIs(st)){try{gsvEnd(st)}catch(e){console.warn("[gsv]",e)}return}'), "星門圍城也不加");
  assert.ok(BH.includes('const fst=!((+store.get("bhCount",0)||0)>0);return Math.max(1,Math.min(18,s+(fst?-1:1)))}'), "第一次偏航星樞未醒（−1）照舊");
});

/* 07bh bhxAfter（星盤暫合）在 vm 裡跑：補播（舊玩家模式）只播電影＋序局，按「循著茶香」直接回首頁；新的旅程照舊播第 2 段電影 */
function after(mem) {
  const log = [], Q = [];
  const ctx = {
    store: { get: (k, d) => (k in mem ? J(mem[k]) : d), set: (k, v) => { mem[k] = J(v) } }, MODAL_HOLD: 0, BHX_TXT: { win: "勝" }, esc: s => s,
    opVol() {}, opPlay: n => log.push("op:" + n), opStop: n => log.push("stop:" + n), bhxBack: on => log.push("back:" + on), toast: t => log.push("toast"),
    bhxFilm: (F, d) => { log.push("film2"); d() }, bhxPages: (k, d) => { log.push("pages2"); d() }, OP_FILM2: { n: 3 },
    journey: () => mem.journey || null, shipEra() {}, applyEra() {}, matchMedia: () => ({ matches: false }), location: { hash: "#/journey/play" },
    setTimeout: f => { Q.push(f) }, journeyStart: () => { log.push("journeyStart"); return Promise.resolve() }, myName: () => "x", defaultName: () => "x", prologue: () => log.push("prologue"),
  };
  ctx.modal = (h, b) => { ctx.btns = b };
  vm.createContext(ctx);
  vm.runInContext(cut(BH, "function bhxEnd(){", "\n/* 星渦裡的七顆紅星"), ctx);
  ctx.bhxAfter(); ctx.btns[0][1](); let n = 0; while (Q.length && n++ < 20) Q.shift()();
  return { log, ctx, mem };
}
test("補播只播電影和黑洞對戰（開發者 11/17 晚選單）：舊玩家模式按「循著茶香」不播第 2 段電影、不接第 3 首，收底幕、淡出、回首頁；新的旅程照舊播", () => {
  const O = after({ bhXuOld: 1, journey: { c: "x_swordboy" } });
  assert.deepEqual(O.log, ["back:false", "stop:2", "toast"]);
  assert.equal(O.ctx.location.hash, "#/"); assert.equal(O.mem.bhXuOld, 0); assert.ok(O.mem.bhXuDone, "序局記下完了");
  const N = after({ bhXuOld: 0, bhxFresh: 1, bhxPick: "x_swordboy", bhxSlot: 1 });
  assert.ok(N.log.includes("op:3") && N.log.includes("film2"), "新的旅程：第 3 首、第 2 段電影照播");
  assert.equal(N.ctx.location.hash, "#/adventure");
  const AF = cut(BH, "function bhxAfter(){", "\n/* 星渦裡的七顆紅星");
  assert.ok(AF.indexOf('if(old){bhxBack(false);opStop(2);location.hash="#/";') < AF.indexOf("opPlay(3,"), "舊玩家模式在第 3 首、第 2 段電影之前就回首頁");
});

test("統一齊轍：破關卡、旅程鎖定、一步殺頁的文字不再暗示可以選主角；英文用內建字典", () => {
  const Q7 = rd(path.join(M, "07q-chardiff.js"));
  assert.ok(!/b1:"(用.{1,3}再走一次|換一位再起航)"/.test(Q7) && (Q7.match(/b1:"再開一段旅程"/g) || []).length === 8, "破關卡按鈕：再開一段旅程");
  assert.ok(!/換一位同行|換小梅走一趟/.test(Q7));
  assert.ok(!/想用別人的身分|選一位角色|請你選一位/.test(SAVE), "05b journeyLock、一步殺頁");
  assert.ok(SAVE.includes("每段旅程都由齊轍出發，其他六位在星槎旅程中陸續加入。") && SAVE.includes('sk.textContent=L("踏上旅程 ›","Set out ›")') && SAVE.includes('"不練了，踏上旅程 ›"'));
  /* 11/17 晚開發者選單「拿掉這個選項」：一步殺頁不再有「🤖 下一盤簡單的棋」「先逛逛」，結果卡只留「踏上旅程 ›」（第一題另有「🧩 再練一題」）；說明字、xqFwNext 都不再寫 */
  const FW = cut(SAVE, "function fwPaint(box,more){", "\n/* ---------- ").replace(/\/\*[\s\S]*?\*\//g, "");   /* 只看程式，不看註解 */
  assert.ok(!/下一盤簡單的棋|先逛逛|練功房第 1 級|nx\("cpu"\)|setItem\("xqFwNext"/.test(FW), "一步殺頁拿掉下一盤簡單的棋");
  assert.equal((FW.match(/\[\[L\("踏上旅程 ›","Set out ›"\),\(\)=>nx\("home"\)\]/g) || []).length, 2, "兩張結果卡的主按鈕都是踏上旅程（11/17 D 第 29 輪 Y2：英文介面直接用英文那份）");
  assert.ok(!I18N.includes("下的那一盤是練功房第 1 級"), "英文字典那句也清掉");
  const i = I18N.indexOf("#I18N-PURE-BEGIN"), j = I18N.indexOf("/* #I18N-PURE-END */"), ctx = {}; vm.createContext(ctx);
  vm.runInContext(I18N.slice(I18N.indexOf("\n", i) + 1, j) + ";this.T=i18nText", ctx);
  for (const s of ["再開一段旅程", "踏上旅程 ›", "不練了，踏上旅程 ›", "⚔ 新的旅程", "🎬 重看開場", "每段旅程都由齊轍出發，其他六位在星槎旅程中陸續加入。想從頭再走一次，請回開頭畫面開始「新的旅程」——可以存到另一格，不會蓋掉這段。"]) {
    const t = ctx.T(s); assert.ok(t && !/[㐀-鿿]/.test(t), "英文：" + s + " → " + t);
  }
});
