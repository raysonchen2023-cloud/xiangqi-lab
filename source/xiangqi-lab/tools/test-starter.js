// 新手練習「先走再學」（m/07stq-starter.js，開發者 11/15 定案）的自動測試，不開瀏覽器：
//   vm 載入 07stq（沒有 window／document：頂層的計時器不跑），配上 site/core.js 的 XQCore 和假的 store，測純函式；另外比對 05b、07mnq、m.html 的接點原始碼。
//   ① 六個任務的題目都合法、目標句 ≤20 字；俥走格、吃子照順序一步走得到；② 將軍題每一步的判斷都跟 XQCore 一致；
//   ③ 第 4、5 題：確實有一步殺、判斷用規則（每一個合法著法都跟 XQCore 的將死判斷一致，不是比對答案格），有「將軍了但黑將還能逃」的錯步、逃點被封住；第 5 題兩題落點不同、也跟第 4 題不同；不用本命棋子、不出相仕帥的題；
//   ④ 跳過補齊獎勵不重複、經驗合計＝成長表 Lv1→2；⑤ 老玩家判定；⑥ 存檔版本；⑦ 電腦的規則內建著法一定合法、四個回合走得完；⑧ 原始碼接點。
// 用法：node --test xiangqi-lab/tools/test-starter.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path"), vm = require("vm");
const ROOT = path.join(__dirname, "..", ".."), M = path.join(ROOT, "xiangqi-db", "m");
const rd = f => fs.readFileSync(f, "utf8").replace(/\r\n/g, "\n");
const SRC = rd(path.join(M, "07stq-starter.js")), LEG = rd(path.join(M, "07-legend.js")), SAVE = rd(path.join(M, "05b-save.js")), MNQ = rd(path.join(M, "07mnq-mainquest.js"));
const HTML = rd(path.join(ROOT, "xiangqi-db", "m.html"));
const C = require(path.join(ROOT, "xiangqi-lab", "site", "core.js"));

function load(init) {
  const mem = Object.assign({}, init || {});
  const ctx = { XQCore: C, console, store: { get: (k, d) => (k in mem ? JSON.parse(JSON.stringify(mem[k])) : d), set: (k, v) => { mem[k] = JSON.parse(JSON.stringify(v)) } } };
  vm.createContext(ctx);
  const names = ["STQ_T", "STQ_XP", "STQ_V", "STQ_C0", "STQ_TX", "STQ_ON", "stqJudge", "stqEsc", "stqHintMv", "stqBotMv", "stqOpenHint", "stqPay", "stqOldOf", "stqSt0", "stqSt", "stqMig", "stqCount", "stqHome", "stqHold"];
  const o = vm.runInContext(SRC + "\n;({" + names.join(",") + "})", ctx);
  return { o, mem };
}
/* vm 裡的陣列、物件換成外面的（deepEqual 比原型） */
const J = x => JSON.parse(JSON.stringify(x));
const chars = s => [...String(s)].length;
const rook = B => B.indexOf("R");
/* 成長表：從 07-legend 切出 xpNeed、xpInfo */
function xpLoad() {
  const a = LEG.indexOf("const XP_TITLES="), b = LEG.indexOf("function xpChip(");
  assert.ok(a > 0 && b > a, "07-legend 找不到成長表");
  const ctx = { store: { get: (k, d) => d } }; vm.createContext(ctx);
  return vm.runInContext(LEG.slice(a, b) + ";({xpNeed,xpInfo})", ctx);
}

test("六個任務：順序（走格→吃子→將軍→封退路→換擺法→跟電腦四回合）、目標句 ≤20 字、每個局面合法（紅方沒被將軍、雙方都有將帥、紅方有棋可走）", () => {
  const { o } = load();
  assert.deepEqual(J(o.STQ_T.map(T => T.k)), ["walk", "eat", "check", "mate", "mate", "game"]);
  assert.deepEqual(J(o.STQ_T.map(o.stqCount)), [3, 3, 2, 1, 2, 4]);
  assert.equal(o.STQ_T[5].n, 4, "各走四步＝4 個雙方回合");
  for (const T of o.STQ_T) {
    assert.ok(chars(T.g) <= 20 && chars(T.g) >= 4, "目標句太長：" + T.g);
    assert.ok(!/客官|老朽|在下/.test(T.g), "不用說書腔：" + T.g);
    for (const f of (T.fen ? [T.fen] : T.ps || [])) {
      const B = C.parseFen(f);
      assert.equal(B.length, 90, f);
      assert.ok(C.kingSq(B, "r") >= 0 && C.kingSq(B, "b") >= 0, "要有帥和將：" + f);
      assert.equal(C.inCheck(B, "r"), false, "一開始紅方不能被將軍：" + f);
      assert.equal(C.inCheck(B, "b"), false, "一開始黑方也不能已經被將軍：" + f);
      assert.ok(C.legal(B, "r").length > 0, f);
    }
  }
  for (const s of Object.values(o.STQ_TX)) assert.ok(chars(s) <= 20, "回饋句太長：" + s);
});

test("任務 1、2：俥照順序一步走到每一個亮格、吃到每一顆亮著的黑子；走錯格、動帥、吃錯子都不算", () => {
  const { o } = load();
  for (const T of o.STQ_T.slice(0, 2)) {
    let B = C.parseFen(T.fen);
    T.tg.forEach((t, step) => {
      const r = rook(B); assert.ok(r >= 0);
      assert.ok(C.legal(B, "r").some(([a, b]) => a === r && b === t), T.k + " 第 " + (step + 1) + " 格俥走不到");
      if (T.k === "eat") assert.ok(B[t] && /[a-z]/.test(B[t]), "亮格上要有黑子");
      else assert.equal(B[t], null, "走格任務的亮格要是空格");
      assert.equal(o.stqJudge(T, B, r, t, step).ok, true);
      /* 其他每一個合法著法都不算 */
      for (const [a, b] of C.legal(B, "r")) {
        if (a === r && b === t) continue;
        const j = o.stqJudge(T, B, a, b, step);
        assert.equal(j.ok, false); assert.ok(o.STQ_TX[j.why], "錯步要有一句話：" + j.why);
        if (B[a] === "K") assert.equal(j.why, "king");
        else if (T.k === "eat" && B[b]) assert.equal(j.why, "eatOther");
      }
      const h = J(o.stqHintMv(T, B, step)); assert.deepEqual(h, [r, t], "提示＝俥和亮格");
      B = C.make(B, r, t);
    });
  }
  /* 吃子任務有一顆吃得到、但不是指定的黑子（吃錯會說「不是這顆」） */
  const T = o.STQ_T[1]; let B = C.parseFen(T.fen), other = false;
  T.tg.forEach((t, step) => { const r = rook(B); if (C.legal(B, "r").some(([a, b]) => a === r && B[b] && b !== t)) other = true; B = C.make(B, r, t) });
  assert.ok(other, "要有一顆可以吃、但不是指定的黑子");
  /* 不合法的走法（俥斜走）不算 */
  assert.equal(o.stqJudge(o.STQ_T[0], C.parseFen(o.STQ_T[0].fen), 81, 73, 0).ok, false);
});

test("任務 3 將軍：每一題都有將軍的走法，判斷跟 XQCore 一致（每一個合法著法都比一次），也有沒將到的錯步", () => {
  const { o } = load(), T = o.STQ_T[2];
  for (const f of T.ps) {
    const B = C.parseFen(f); let yes = 0, no = 0;
    for (const [a, b] of C.legal(B, "r")) {
      const ck = C.inCheck(C.make(B, a, b), "b"), j = o.stqJudge(T, B, a, b, 0);
      assert.equal(j.ok, ck, f + " " + C.notate(B, a, b)); if (ck) yes++; else { no++; assert.equal(j.why, "noCheck") }
    }
    assert.ok(yes >= 1 && no >= 5, f);
    const h = J(o.stqHintMv(T, B, 0)); assert.ok(C.inCheck(C.make(B, h[0], h[1]), "b"), "提示要是將軍");
  }
});

test("任務 4、5 一步殺：確實一步殺；判斷照規則不是答案格（每一個合法著法都跟 XQCore 將死判斷一致）；有「將軍了但還能逃」的錯步；先標的逃點解開後全被封住；第 5 題兩題落點不同、也跟第 4 題不同；只用俥和帥", () => {
  const { o } = load(), land = [];
  for (const T of o.STQ_T.slice(3, 5)) {
    assert.ok(T.esc, "解題前要標出逃點");
    const L5 = [];
    for (const f of T.ps) {
      const B = C.parseFen(f), esc = J(o.stqEsc(B));
      assert.ok(esc.length >= 1, f + " 黑將要有逃點可以標");
      assert.ok(!/[BbAa]/.test(f.split(" ")[0].replace(/[^A-Za-z]/g, "").replace(/[Kk]/g, "")), "不出相、仕（「把相走開才將死」那種題）：" + f);
      assert.ok(!/[NnCcPp]/.test(f), "第 4、5 題只用俥、帥：" + f);
      const mates = [], escapes = [];
      for (const [a, b] of C.legal(B, "r")) {
        const nb = C.make(B, a, b), ck = C.inCheck(nb, "b"), mate = ck && C.legal(nb, "b").length === 0, j = o.stqJudge(T, B, a, b, 0);
        assert.equal(j.ok, mate, f + " " + C.notate(B, a, b));
        if (mate) { mates.push([a, b]); assert.equal(B[a], "R", "殺棋是俥走的，不是帥、相、仕") }
        else if (ck) { escapes.push([a, b]); assert.equal(j.why, "escape") } else assert.equal(j.why, "noCheck");
      }
      assert.ok(mates.length >= 1, f + " 要有一步殺"); assert.ok(escapes.length >= 1, f + " 要有「將軍了但黑將還能逃」的錯步，才看得出判斷不是背答案");
      for (const [a, b] of mates) {
        const nb = C.make(B, a, b), k = C.kingSq(nb, "b");
        assert.equal(C.legal(nb, "b").filter(([x]) => x === k).length, 0, "封住退路：黑將走不出去");
        for (const e of esc) assert.ok(!C.legal(nb, "b").some(([, t]) => t === e), "逃點還能去：" + e);
      }
      const h = J(o.stqHintMv(T, B, 0)); assert.ok(mates.some(([a, b]) => a === h[0] && b === h[1]), "提示要是一步殺");
      L5.push(mates.map(x => x[1]).sort().join(","));
    }
    land.push(L5);
  }
  const [four, five] = land;
  assert.equal(five.length, 2); assert.notEqual(five[0], five[1], "第 5 題兩題的落點要不同");
  for (const x of five) assert.notEqual(x, four[0], "第 5 題跟第 4 題落點不同");
  /* 方向不同：第 4 題俥橫走（同一列），第 5 題俥直走（同一行） */
  const dir = f => { const B = C.parseFen(f), [a, b] = C.legal(B, "r").find(([x, y]) => { const nb = C.make(B, x, y); return C.inCheck(nb, "b") && !C.legal(nb, "b").length }); return (a / 9 | 0) === (b / 9 | 0) ? "橫" : "直" };
  assert.equal(dir(o.STQ_T[3].ps[0]), "橫"); assert.deepEqual(J(o.STQ_T[4].ps.map(dir)), ["直", "直"]);
});

test("〔原始碼〕題目不用本命棋子決定：STQ_T 是固定資料，載入題目（stqLoad）跟判斷都不讀 myChar／WX_CHARS 的棋子", () => {
  const T0 = SRC.indexOf("const STQ_T="), T1 = SRC.indexOf("const STQ_TX=");
  assert.ok(T0 > 0 && T1 > T0);
  assert.ok(!/myChar|WX_CHARS|botPiece|\.pc\b/.test(SRC.slice(T0, T1)));
  for (const fn of ["function stqLoad(", "function stqJudge(", "function stqHintMv(", "function stqNext("]) {
    const a = SRC.indexOf(fn), b = SRC.indexOf("\nfunction ", a + 5); assert.ok(a > 0, fn);
    assert.ok(!/myChar|WX_CHARS|botPiece/.test(SRC.slice(a, b)), fn + " 不能看本命棋子");
  }
});

test("〔混合〕經驗值：六個任務合計＝成長表 Lv1→2 要的量（xpNeed(1)），做完六個（加上當天第一次 +20）升到 Lv 2；跳過只補還沒領的、再按不重複", () => {
  const { o } = load(), X = xpLoad();
  const sum = o.STQ_XP.reduce((a, b) => a + b, 0);
  assert.equal(o.STQ_XP.length, 6); assert.equal(sum, X.xpNeed(1)); assert.equal(sum, 80);
  assert.equal(X.xpInfo(sum).L, 2); assert.equal(X.xpInfo(sum + 20).L, 2, "加上當天第一次練習 +20 也還是 Lv 2，不會一口氣跳級");
  assert.equal(X.xpInfo(sum - 1).L, 1);
  /* 做了前兩個再跳過：補 15×4＝60；再按一次 0 */
  const S = { got: { 0: 1, 1: 1 } };
  const p1 = o.stqPay(S, 5); assert.equal(p1, 60); assert.deepEqual(Object.keys(S.got).sort(), ["0", "1", "2", "3", "4", "5"]);
  assert.equal(S.got[0], 1, "已領的時間不改"); assert.equal(S.got[2], 5);
  assert.equal(o.stqPay(S, 9), 0, "再跳一次不重發");
  const S2 = {}; assert.equal(o.stqPay(S2, 1), 80, "一開始就跳過＝補齊 80");
  /* 跳過不點亮任務格、不寫別的紀錄 */
  const g = SRC.slice(SRC.indexOf("function stqGrad("), SRC.indexOf("function stqPickView("));
  assert.ok(g.includes("stqPay(S,now)") && !g.includes("S.done["), "跳過不點亮沒做的任務格");
  assert.ok(!/quizBest|quizLog|cjState|campStars|shipMark|xq_record|study/.test(SRC), "不假造測驗、殘局、訓練營、學習紀錄");
  assert.ok(g.includes('addXP(sum,"新手練習","stq:skip")') && SRC.includes('addXP(STQ_XP[n],"新手練習","stq:"+(n+1))'), "經驗都帶 key，同一個 key 只發一次");
});

test("〔混合〕老玩家判定：選過角、存檔格、舊玩家過渡、秒開局、玩過的鍵、任何進度、主線進度、黑洞序局、剛還原——任何一樣就是老玩家；什麼都沒有＝新玩家", () => {
  const { o } = load();
  assert.equal(o.stqOldOf({}), false);
  for (const k of ["J", "slots", "old", "fw", "played", "prog", "mnq", "bh", "restored"]) assert.equal(o.stqOldOf({ [k]: k === "slots" ? 1 : true }), true, k);
  assert.equal(o.stqOldOf({ slots: 0, J: false }), false);
  /* 環境收集：選過角＝有旅程、有對局紀錄＝tsmProgNow().any（xq_record）、做過第一章＝mnq 的 seg、領過授印禮 */
  const E = SRC.slice(SRC.indexOf("function stqEnvNow("), SRC.indexOf("function stqCan("));
  for (const s of ["journey()", "slotMetaAll()", "SAVE_OLD", "firstWin", "FW_PLAYED", "tsmProgNow().any", "M.gift.a1", "M.seg", "bhXuDone", "xqRestored"]) assert.ok(E.includes(s), "沒看 " + s);
  /* 開機：已經有存檔紀錄（不論做完、跳過、老玩家）就不再開練習；老玩家記成 old */
  const B = SRC.slice(SRC.indexOf("function stqBoot("), SRC.indexOf("function stqJourney("));
  assert.ok(B.includes('if(S&&S.st==="run")') && B.includes("if(S)return false;") && B.includes('stqSave({v:STQ_V,st:"old",at:Date.now()})'));
  assert.ok(B.includes("fwSaved().then"), "先確定 IndexedDB 沒有存檔才當新玩家");
});

test("〔混合〕存檔有版本：stqSt0 沒有 v 的當成沒有；stqMig 補欄位、n 夾在 0～6；練習中 stqHold＝true、首頁鈕＝接著練，其他＝更多玩法", () => {
  const { o, mem } = load();
  assert.equal(o.STQ_V, 1);
  assert.equal(o.stqSt0(), null); assert.equal(J(o.stqSt()).v, 1);
  mem.stq = { st: "run" }; assert.equal(o.stqSt0(), null, "沒有版本號的不認");
  mem.stq = { v: 1, st: "run", n: 99 }; const s = J(o.stqSt0()); assert.equal(s.n, 6); assert.deepEqual(s.done, {}); assert.deepEqual(s.got, {});
  assert.equal(o.stqHold(), true); assert.equal(J(o.stqHome()).k, "run");
  mem.stq = { v: 1, st: "done" }; assert.equal(o.stqHold(), false); assert.deepEqual(J(o.stqHome()), { k: "more", t: "更多玩法" });
  mem.stq = { v: 1, st: "old" }; assert.equal(o.stqHold(), false); assert.equal(J(o.stqHome()).k, "more");
  /* 存檔鍵不跟存檔格走（做過一次，開新旅程也不重來） */
  const JK = SAVE.slice(SAVE.indexOf("const JOURNEY_KEYS="), SAVE.indexOf("const JK=new Set"));
  assert.ok(!/"stq"/.test(JK));
  assert.equal(o.STQ_C0, "x_swordboy", "預設角色＝本命棋子是俥的齊轍");
  assert.ok(/x_swordboy:\{n:"齊轍"[^}]*pc:"俥"/.test(rd(path.join(M, "06-cpu.js"))), "齊轍的本命棋子是俥");
});

test("第六個任務：規則內建的電腦著法一定合法（引擎沒載好時的退路）；隨便走也走得完四個雙方回合；提示著法合法", () => {
  const { o } = load();
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let g = 0; g < 30; g++) {
    let B = C.parseFen(C.START), rounds = 0;
    for (let ply = 0; ply < 8; ply++) {
      if (ply % 2 === 0) {
        const L = C.legal(B, "r"); assert.ok(L.length);
        const h = J(o.stqOpenHint(B)); assert.ok(L.some(([a, b]) => a === h[0] && b === h[1]), "提示要合法");
        const [a, b] = L[Math.floor(rnd() * L.length)]; B = C.make(B, a, b);
      } else {
        const m = J(o.stqBotMv(B, rnd)); assert.ok(m && C.legal(B, "b").some(([a, b]) => a === m[0] && b === m[1]), "電腦著法要合法");
        B = C.make(B, m[0], m[1]); rounds++;
      }
      if (!C.legal(B, ply % 2 === 0 ? "b" : "r").length) break;
    }
    assert.ok(rounds >= 3);
  }
  /* 有子可吃時會吃（一半機會）；沒有合法著法回 null */
  const B2 = C.parseFen("4k4/9/9/9/9/9/9/9/4r1P2/R2K5"); let cap = 0;
  for (let i = 0; i < 40; i++) { const m = J(o.stqBotMv(B2, rnd)); if (B2[m[1]]) cap++ }
  assert.ok(cap > 0);
  const dead = C.make(C.parseFen(o.STQ_T[3].ps[0]), 6 * 9 + 8, 6 * 9 + 3);   /* 第 4 題的一步殺走完：黑方沒有合法著法 */
  assert.equal(C.legal(dead, "b").length, 0); assert.equal(o.stqBotMv(dead, rnd), null);
});

test("〔原始碼〕第六個任務不會卡在「電腦想一下」：引擎沒載好不等下載、用規則內建著法；引擎有載好也有 2.5 秒時限；4 個回合過關後可以接著下", () => {
  const P = SRC.slice(SRC.indexOf("async function stqBotPlay("), SRC.indexOf("async function stqGameHint("));
  assert.ok(P.includes("XQEngine.ready") && P.includes("setTimeout(()=>j(new Error(\"tmo\")),2500)") && P.includes("return stqBotMv(B)}"));
  assert.ok(P.includes("{depth:1},10") && P.includes("margin:700"), "最弱一級：深度 1、10 條、差 700 內隨機");
  const G = SRC.slice(SRC.indexOf("function stqGameMove("), SRC.indexOf("function stqGoalCount("));
  assert.ok(G.includes("if(U.rounds>=T.n&&!U.passed){U.passed=true;stqDone(U.n)") && G.includes("STQ_TX.pass"));
  assert.ok(SRC.includes('if(T.k==="game"&&(U.turn!=="r"||U.end))return;'), "過關後還沒結束可以接著下");
});

test("〔原始碼〕接點：m.html 在 07mnq 前面 include；05b titleScreen 先問 stqBoot；07mnq 首頁鈕問 stqHome／stqHomeGo、mnqTick 練習中不自動跳授印禮、mnqIdle 認得 #stqPg；畢業領 a1、選角用 journeyRepick", () => {
  const inc = [...HTML.matchAll(/^\/\/#include (m\/[\w.-]+\.js)$/gm)].map(m => m[1]);
  const i = inc.indexOf("m/07stq-starter.js"); assert.ok(i > 0, "m.html 沒 include");
  assert.ok(i < inc.indexOf("m/07mnq-mainquest.js") && i > inc.indexOf("m/05b-save.js") && i > inc.indexOf("m/01-board.js"));
  assert.ok(SAVE.includes('if(!opt.view&&typeof stqBoot==="function"&&stqBoot(opt))return;'));
  assert.ok(SAVE.indexOf("stqBoot(opt)") < SAVE.indexOf("if(!opt.view&&fwNeed()){titlePaint(\"wait\",opt);"), "要在新手秒開局之前");
  assert.ok(MNQ.includes('if(typeof stqHomeGo==="function"&&stqHomeGo())return;mnqGo()'));
  assert.ok(MNQ.includes('const sh=typeof stqHome==="function"?stqHome():null;'));
  assert.ok(MNQ.includes('if(typeof stqHold==="function"&&stqHold()){'));
  assert.ok(MNQ.includes(".rfx,.qp-ov,#stqPg\")"));
  const G = SRC.slice(SRC.indexOf("function stqGrad("), SRC.indexOf("function stqPickView("));
  assert.ok(G.includes('mnqGrant("a1")'), "一次領授印禮的入門物品");
  /* 11/15 更多玩法清單（stqMore）多了一顆玩家自己按才開的「第一章」入口；練習流程本身（清單以外的程式）照樣不演、不播 */
  /* 11/16 首頁那顆在第一章還沒看完時寫「📖 第一章」（stqC1／stqHome／stqHomeGo），也是玩家自己按才開 */
  const FLOW = SRC.slice(0, SRC.indexOf("/* 11/16 開發者「如果一開始沒選第一章")) + SRC.slice(SRC.indexOf("function stqAuto("));
  assert.ok(!/mnqGift\(|mnqChapter\(|mnfPlay\(|bhXuStart\(|prologue\(/.test(FLOW), "不演授印禮儀式、不播第一章電影、不走黑洞序局");
  assert.equal((SRC.match(/mnqChapter\(/g) || []).length, 2, "整支只有更多玩法清單那一顆、首頁那顆（第一章還沒看完）會開第一章");
  assert.ok(SRC.includes("journeyRepick(c)") && SRC.includes("obCarousel(box,L,"), "選角用現有的 obCarousel、換人用 journeyRepick");
  assert.ok(SRC.includes("我會下棋，直接開始"), "右上角跳過鈕");
  const MORE = SRC.slice(SRC.indexOf("function stqMore("), SRC.indexOf("function stqAuto("));
  for (const s of ["對弈電腦", "一盞茶殘局", "棋力測驗", "新手訓練營"]) assert.ok(MORE.includes(s), s);
  assert.ok(!/黑洞|塔防|guanxing|bhtd/.test(MORE), "更多玩法先不放黑洞塔防");
  /* 11/15 第一章入口：首頁「下一步」打開的更多玩法清單也有一顆（原本只在設定 → 氛圍）；有角色或看過才放，看完叫「再看第一章」，按了關清單再開第一章 */
  assert.ok(MORE.includes('if(lit||M.gift.a1||MNQ_SEGS.classic.some(id=>M.seg[id])||mnqEnv().hasChar)c1=lit?"再看第一章":"看第一章"'), "第一章入口的條件與文字");
  assert.ok(MORE.includes('data-k="c1"') && MORE.includes("河圖初渡") && MORE.includes('closeSheet();setTimeout(()=>{try{mnqChapter("classic")}catch(e){}},250)'), "按了開第一章");
  /* 07mnf 第一章電影、授印禮儀式的程式還在（只是不再是必經路線） */
  assert.ok(MNQ.includes("function mnqGift(") && MNQ.includes('classic:{segs:["c1o","c1m","c1e"]'));
});

test("〔原始碼〕模組規矩：前綴 stq／STQ 只在這支宣告；長行沒有 // 行內註解；沒有反斜線控制字元", () => {
  const top = s => [...s.matchAll(/^(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm)].map(m => m[1])
    .concat([...s.matchAll(/^const [^\n]*?,([A-Za-z_$][\w$]*)=/gm)].map(m => m[1]));
  const mine = top(SRC);
  assert.ok(mine.length > 20 && mine.every(n => /^(stq|STQ)/.test(n)), "名字都要 stq／STQ 開頭：" + mine.filter(n => !/^(stq|STQ)/.test(n)).join(","));
  for (const f of fs.readdirSync(M).filter(f => /\.js$/.test(f) && f !== "07stq-starter.js")) {
    const s = rd(path.join(M, f));
    assert.ok(!/^(?:const|let|var|function|async function)\s+(stq|STQ)/m.test(s), f + " 也用了 stq 前綴");
  }
  assert.ok(!/[^:"'\\]\/\/ /.test(SRC.split("\n").filter(l => l.length > 300).join("\n")), "長行中間不要有 // 註解");
  assert.ok(!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(SRC), "有控制字元");
});

test("〔行為〕11/16 開發者「如果一開始沒選第一章 這邊要顯示第一章讓玩家知道」：首頁那顆在第一章還沒看完時寫「📖 第一章」、看過一部分寫「接著看」、看完回「更多玩法」，按了開第一章", () => {
  const a = SRC.indexOf("function stqC1("), b = SRC.indexOf("function stqMore(");
  const mk = M => { const log = []; const o = new Function("STQ_ON", "stqSt0", "mnqSt", "MNQ_SEGS", "mnqChapter", "stqCan", "stqOpen", "stqMore", SRC.slice(a, b) + ";return{stqHome,stqHomeGo}")(true, () => ({ st: "done" }), () => M, { classic: ["s1", "s2"] }, e => log.push(e), () => true, () => { }, () => log.push("more")); return { o, log } };
  let K = mk({ seg: {}, lamp: {} }); assert.deepEqual(K.o.stqHome(), { k: "c1", t: "📖 第一章" }); K.o.stqHomeGo(); assert.deepEqual(K.log, ["classic"]);
  K = mk({ seg: { s1: 1 }, lamp: {} }); assert.equal(K.o.stqHome().t, "📖 接著看第一章");
  K = mk({ seg: { s1: 1, s2: 1 }, lamp: {} }); assert.deepEqual(K.o.stqHome(), { k: "more", t: "更多玩法" }); K.o.stqHomeGo(); assert.deepEqual(K.log, ["more"]);
  K = mk({ seg: {}, lamp: { classic: 1 } }); assert.equal(K.o.stqHome().k, "more", "看完（點過燈）");
});
