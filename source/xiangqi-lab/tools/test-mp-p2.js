// Android 三方實測（xiangqi-android/verify/multiplayer-20261113/report.md）的三個 P2：
//   P2-1 訊號膠囊不再壓在棋盤右下角那顆子上（m/07hs-netsig.js 的 nsgPos／nsgPlace：放進棋盤下面的名牌列、時鐘左邊）——幾何測試，各種手機寬度都不重疊。
//   P2-2 網路恢復後 5 秒內連回（src/net.js 的 netBack、FAST_WIN、連線逾時 ctimeout）；伺服器掛掉時照舊加倍間隔，不會一直敲。
//   P2-3 觀眾剛進來時棋鐘跟雙方一樣（net.js 的 obsTk），不是從自己進來那一刻起算。
//   假 MQTT 伺服器＋假時鐘、vm 載入真正的 src/net.js；不連任何伺服器、不開瀏覽器。
// 用法：node --test xiangqi-lab/tools/test-mp-p2.js
"use strict";
const { assert, test, fs, path, vm, NET_SRC, J, phone, move, world, startGame, noErrors } = require("./net-harness.js");
const { DEVICES } = require("./qa/device-fit.js");
const MIN = 60000;

/* ================= P2-2 重連 ================= */
const upIn = async (S, P, max) => { const t0 = S.now; return (await S.until(() => P.net.status() === "up", max)) ? S.now - t0 : null };

test("P2-2：斷網 60 秒、手機先說「網路恢復」但路由 1 秒後才真的通——5 秒內連回（以前斷線期間的重試間隔已經拉長，要等二、三十秒）", async () => {
  const { S, B, red } = await (async () => { const w = world(), g = await startGame(w.S, w.B); return { ...w, ...g } })();
  red.offline(); await S.run(60000); assert.notEqual(red.net.status(), "up", "斷線中");
  red.fire("online"); await S.run(1000);   /* online 事件先到，這時網路其實還不通（那一次一定失敗） */
  red.online(); const ms = await upIn(S, red, 30000);
  assert.ok(ms != null && ms <= 5000, "網路通了以後 " + ms + " 毫秒才連上");
  noErrors(S);
});

test("P2-2：沒有 online 事件、只看到 navigator.onLine 從 false 變 true——也是 5 秒內連回", async () => {
  const w = world(), g = await startGame(w.S, w.B), S = w.S, P = g.red;
  P.ctx.navigator.onLine = false; P.offline(); await S.run(60000);
  P.ctx.navigator.onLine = true; P.online(); const ms = await upIn(S, P, 30000);
  assert.ok(ms != null && ms <= 5000, ms + " 毫秒");
  noErrors(S);
});

test("P2-2：網路恢復後連線卡住（WebSocket 開了一直沒有回應）——10 秒就放棄、1 秒多再試，不用等系統的 TCP 逾時", async () => {
  const w = world(), g = await startGame(w.S, w.B), S = w.S, B = w.B, P = g.red, att = B.attempt;
  P.offline(); await S.run(45000);   /* 看門狗發現斷線、開始重試 */
  B.attempt = ws => { if (ws.P === P) { B.attempts.push({ at: S.now, P: P.tag, hang: 1 }); return } att(ws) };   /* 這支手機的連線送出去就沒下文 */
  const n0 = B.attempts.length; P.online(); P.fire("online"); await S.run(25000);
  const hangs = B.attempts.slice(n0).filter(a => a.P === P.tag);
  assert.ok(hangs.length >= 2, "卡住的連線會被放棄、再試（" + hangs.length + " 次）");
  B.attempt = att; const ms = await upIn(S, P, 15000); assert.ok(ms != null && ms <= 12000, "不卡以後連得上（" + ms + "）");
  noErrors(S);
});

test("P2-2：伺服器掛掉（手機網路一直是通的、沒有 online 事件）——照舊加倍間隔，3 分鐘內最多試十來次", async () => {
  const w = world(), g = await startGame(w.S, w.B), S = w.S, B = w.B, P = g.red;
  B.down(); const n0 = B.attempts.length; await S.run(3 * MIN);
  const n = B.attempts.slice(n0).filter(a => a.P === P.tag).length; assert.ok(n >= 3 && n <= 12, "試了 " + n + " 次");
  B.up = true; const ms = await upIn(S, P, 90000); assert.ok(ms != null, "伺服器回來後連得上");
  noErrors(S);
});

/* ================= P2-3 觀眾剛進來的棋鐘 ================= */
test("P2-3：開局 40 秒、還沒人走時觀眾才進來——觀眾看到的紅方棋鐘、每步剩餘跟雙方一樣（差不到 3 秒）；走一步之後也一樣", async () => {
  const w = world(), g = await startGame(w.S, w.B), S = w.S, B = w.B;
  await S.run(40000);
  const V = phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); V.net.start(); await S.run(1500); V.net.watch(g.gid); await S.run(1500);
  assert.ok(V.net.game() && !V.net.side(), "觀眾拿到對局");
  /* 對照組用乙（收到開局狀態的那一方；開局的甲自己這一手的「每步剩餘」從畫面打開才算，另案） */
  const d = () => ({ clk: Math.abs(V.net.clocks().r - g.K.net.clocks().r), turn: Math.abs(V.net.turnLeft() - g.K.net.turnLeft()) });
  let x = d(); assert.ok(x.clk < 3000 && x.turn < 3000, "剛進來：" + JSON.stringify(x) + "（以前差約 40 秒）");
  move(g.red, "h2e2"); await S.run(30000);
  const V2 = phone(S, B, { id: "xxxx3333", name: "觀眾二", hash: "#/pvp" }); V2.net.start(); await S.run(1500); V2.net.watch(g.gid); await S.run(1500);
  x = { clk: Math.abs(V2.net.clocks().b - g.black.net.clocks().b), turn: Math.abs(V2.net.turnLeft() - g.black.net.turnLeft()) };
  assert.ok(x.clk < 3000 && x.turn < 3000, "走一步後才進來：" + JSON.stringify(x));
  noErrors(S);
});
test("P2-3：走棋那支手機的時鐘快很多（寫的 tk 比觀眾的現在還晚）——觀眾不採用，照舊從自己進來那一刻算，不會顯示負的", async () => {
  const w = world(), g = await startGame(w.S, w.B), S = w.S, B = w.B;
  await S.run(20000);
  const raw = JSON.parse(B.retained.get(`xqlab-r7k2q/v1/g/${g.gid}/s`)); assert.equal(typeof raw.tk, "number");
  const V = phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); V.ctx.__SK = 0;
  vm.runInContext("Date.now=()=>__S.now-10*60000;", V.ctx);   /* 觀眾的手機慢 10 分鐘＝走棋那方的 tk 對觀眾來說在未來 */
  V.net.start(); await S.run(1500); V.net.watch(g.gid); await S.run(1500);
  const c = V.net.clocks().r; assert.ok(c > 0 && c <= 30 * MIN, "觀眾的紅方棋鐘 " + c);
  noErrors(S);
});

/* ================= P2-1 訊號膠囊的位置（幾何） ================= */
const SIG = fs.readFileSync(path.join(__dirname, "..", "..", "xiangqi-db", "m", "07hs-netsig.js"), "utf8");
const nsgPos = (() => { const i = SIG.indexOf("function nsgPos("), j = SIG.indexOf("\nfunction nsgPlace(", i); assert.ok(i > 0 && j > i); const ctx = {}; vm.createContext(ctx); vm.runInContext(SIG.slice(i, j) + ";this.f=nsgPos", ctx); return ctx.f })();
const R = (l, t, w, h) => ({ left: l, top: t, right: l + w, bottom: t + h, width: w, height: h });
const hit = (a, b) => a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
test("P2-1：各種手機寬度、時鐘寬度、名牌高度，膠囊都在棋盤外（名牌列裡）、不壓時鐘、不壓頭像，右下角那顆子點得到", () => {
  let n = 0;
  for (const dv of DEVICES) for (const clkW of [64, 88, 120]) for (const rowH of [28, 36, 48]) for (const capW of [60, 86, 120]) {
    const W = Math.min(dv.w, 720), boardTop = 120, boardH = Math.round((W - 16) * 615 / 560), box = R(0, boardTop, W, boardH + 10);
    const board = R(8, boardTop + 6, W - 16, boardH), e = R(0, box.bottom, W, 0), p = R(0, box.bottom, W, rowH), clk = R(W - 12 - clkW, box.bottom + (rowH - 26) / 2, clkW, 26), av = R(12, box.bottom + (rowH - 36) / 2, 36, 36);
    const r = nsgPos(e, p, clk, capW, 22), w = Math.min(capW, r.max), cap = R(e.right - r.right - w, e.top + r.top, w, 22);
    const last = R(board.right - board.width / 9, board.bottom - board.height / 10, board.width / 9, board.height / 10);   /* 右下角那一格 */
    assert.ok(!hit(cap, board) && !hit(cap, last), dv.id + "：壓到棋盤 " + JSON.stringify(cap));
    assert.ok(!hit(cap, clk), dv.id + "：壓到時鐘"); assert.ok(cap.left >= av.right, dv.id + "：壓到頭像");
    assert.ok(cap.top >= p.top && cap.bottom <= p.bottom + Math.max(0, 22 - rowH), dv.id + "：不在名牌列裡");
    assert.ok(r.pad >= capW, "名字那欄留出膠囊寬度"); n++;
  }
  assert.ok(n >= 100, "量了 " + n + " 種");
});
test("〔原始碼〕P2-1／P2-2：膠囊不再往上提 28px；每秒重新量位置；online、navigator.onLine、切回前景都開 20 秒快速重試；連線 10 秒逾時", () => {
  assert.doesNotMatch(SIG, /top:-28px/); assert.match(SIG, /right:var\(--nsgr,6px\);top:var\(--nsgt,2px\)/); assert.match(SIG, /\n  nsgPlace\(NSG\.el\);/);
  assert.match(SIG, /#view\.nsg-on #pBot \.nm\{padding-right:var\(--nsgw,0px\)\}/);
  assert.match(NET_SRC, /window\.addEventListener\("online",\(\)=>\{if\(cli&&cli\.kill\)cli\.kill\(\);netBack\(\)\}\)/);
  assert.match(NET_SRC, /if\(!document\.hidden\)\{fastTill=Date\.now\(\)\+FAST_WIN;kick\(\)\}/); assert.match(NET_SRC, /o\.ctimeout\|\|10000/);
  assert.match(NET_SRC, /if\(Date\.now\(\)<fastTill\)\{fails\+\+;return Math\.round\(1000\+Math\.random\(\)\*500\)\}/);
});
