// 評比第 12 輪 X11（評審「連線與雲端架構師」P22.1 斷線重連與狀態同步、P22.2 連線對戰延遲與容錯）：src/net.js LINK 區段（對局連線同步頻道 g/<對局>/k）的自動測試。
//   用 tools/net-harness.js：vm 載入 App 真正的 src/net.js，WebSocket 接記憶體裡的假 MQTT 伺服器、假時鐘；不連正式或測試伺服器、不開瀏覽器。
//   ① 延遲：ping／pong 量來回時間、訊號格；對手收訊慢，格數跟著掉
//   ② 重連補步：伺服器保留的那份被舊的蓋掉時，重連後靠「步數＋局面雜湊」比對，3 秒內由對方直接補（舊版要等 20 秒以上的重抓）
//   ③ 重複、亂序：同一則 k 訊息收兩次只算一次、晚到的舊心跳丟掉；混沌網路（重複＋亂序＋延遲）下照樣收斂
//   ④ 跳號：漏了中間一份（對方悔棋那份）又收到下一份，先暫放、跟對方要中間那份，補齊後照 rev 套用（舊版卡住不動）
//   ⑤ 對方沒回應：30 秒「slow」、90 秒「gone」，可以判和（中止、不計分）；判超時規則照舊；自己斷線時是「self」
//   ⑥ 跟舊版 App 相容：舊版（tools/fixtures/net-pre-x11-1113.js＝這輪改之前的 net.js）收到 k 訊息直接忽略、照常下完；新版改用伺服器心跳量延遲
//   ⑦ 畫面（m/07hs-netsig.js）：訊號膠囊、對方沒回應視窗的內容
// 用法：node --test xiangqi-lab/tools/test-net-link.js
"use strict";
const { assert, test, fs, path, vm, J, world, phone, move, core, startGame, noErrors, ROOT } = require("./net-harness.js");
/* vm 裡的陣列、物件跟這邊不是同一個原型：先轉成 JSON 再比 */
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const OLD = fs.readFileSync(path.join(__dirname, "fixtures/net-pre-x11-1113.js"), "utf8");
const kLog = (B, gid, from) => B.log.filter(x => x.topic === `${ROOT}/g/${gid}/k` && (!from || x.from === from.tag)).map(x => JSON.parse(x.payload));
/* 伺服器上這盤的保留狀態換成比較舊的那一份（模擬伺服器重開、或被晚到的舊訊息蓋掉） */
const staleRetained = (B, gid, nMoves) => { const old = B.log.filter(x => x.topic === `${ROOT}/g/${gid}/s` && JSON.parse(x.payload).moves.length === nMoves).pop(); B.retained.set(`${ROOT}/g/${gid}/s`, old.payload) };

/* ================= ① 延遲 ================= */
test("① 延遲：每 15 秒 ping／pong，來回時間用自己的時鐘算（約 4 段 × 20 毫秒）、4 格；對手收訊慢 1.2 秒，格數掉到 2 格；兩邊局面一致", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(20000);
  const L = red.net.latency();
  assert.equal(L.src, "peer", "跟新版對手：量對手手機的來回");
  assert.ok(L.ms >= 60 && L.ms <= 200, "來回 " + L.ms + " 毫秒");
  assert.equal(L.bars, 4);
  assert.ok(red.net.syncInfo().ok && black.net.syncInfo().ok, "rev＋雜湊對得上");
  assert.equal(red.net.syncInfo().kpeer, true);
  const st = red.net.linkStats(); assert.ok(st.pings >= 1 && st.pongs >= 1);
  black.lag = 1200; await S.run(60000);
  const L2 = red.net.latency();
  assert.ok(L2.ms >= 1200 && L2.ms < 1500, "來回 " + L2.ms + " 毫秒"); assert.equal(L2.bars, 2);
  assert.equal(black.net.latency().bars, 2, "黑方自己量也看得出慢");
  assert.ok(kLog(B, gid).every(x => x.v === 1 && x.id && x.ss && Number.isInteger(x.sq) && x.gid === gid), "每則都有版本、送的人、序號");
  black.lag = 0; noErrors(S);
});

test("① 觀眾不送也不回 k 訊息；斷線時訊號 0 格", async () => {
  const { S, B } = world(), { red, gid } = await startGame(S, B);
  const W = phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); W.net.start(); await S.run(1500); W.net.watch(gid); await S.run(40000);
  assert.ok(W.net.game());
  assert.equal(kLog(B, gid, W).length, 0, "觀眾不送");
  assert.equal(W.net.syncInfo(), null); assert.equal(W.net.peer(), null);
  red.offline(); await S.run(45000);
  deq(red.net.latency(), { ms: null, bars: 0, src: null });
  noErrors(S);
});

/* ================= ② 重連補步 ================= */
async function staleRejoin(src) {
  const o = src ? { A: { src }, K: { src } } : null;
  const { S, B } = world(), { red, black, gid } = await startGame(S, B, o);
  move(red, "h2e2"); await S.run(1000); move(black, "h7e7"); await S.run(1000);
  black.offline(); await S.run(45000);
  move(red, "h0g2"); await S.run(1000);
  assert.equal(B.game(gid).moves.length, 3);
  staleRetained(B, gid, 2);                          // 伺服器上這盤的保留狀態被舊的（2 步）蓋掉
  black.online(); black.fire("online");
  assert.ok(await S.until(() => black.net.status() === "up", 5000));
  const t0 = S.now, ok = await S.until(() => black.net.game().moves.length === 3, 5000);
  return { S, B, red, black, gid, ok, ms: S.now - t0 };
}
test("② 重連補步：伺服器保留的那份是舊的，重連後 ping 帶「步數＋局面雜湊」，對方發現我落後、直接把缺的那份送過來，3 秒內補上；伺服器上的也順手補回新的", async () => {
  const t = await staleRejoin();
  assert.ok(t.ok, "5 秒內要補上");
  assert.ok(t.ms <= 3000, "補上花了 " + t.ms + " 毫秒");
  assert.ok(t.red.net.linkStats().stOut >= 1, "紅方用 st 補狀態");
  assert.ok(t.black.net.linkStats().stIn >= 1);
  await t.S.run(15000);
  deq(core(t.black.net.game()), core(t.red.net.game()));
  assert.equal(t.B.game(t.gid).moves.length, 3, "伺服器上的保留狀態補回最新的（黑方 netHeal 發現伺服器是舊的就補送）");
  assert.ok(t.black.net.syncInfo().ok && t.red.net.syncInfo().ok, "雙方 rev＋雜湊一致");
  assert.equal(t.black.net.signState(), "signed", "直接送來的也照樣驗簽");
  deq(t.black.net.suspicious(), []);
  move(t.black, "h9g7"); await t.S.run(1500);
  assert.equal(t.red.net.game().moves.length, 4, "接著下");
  noErrors(t.S);
});
test("② 反向驗證：這輪改之前的 net.js（兩邊都是舊版）同樣情況，5 秒內補不上（要等 20 秒沒動靜的重抓）", async () => {
  const t = await staleRejoin(OLD);
  assert.equal(t.ok, false, "舊版 5 秒內補不上");
  noErrors(t.S);
});

/* ================= ③ 重複、亂序 ================= */
test("③ 重複、亂序：同一則 k 訊息再送一次＝冪等丟掉；晚到的舊 ping 丟掉；補狀態重送也不會重複落子", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(20000);
  const pings = B.log.filter(x => x.topic === `${ROOT}/g/${gid}/k` && x.from === red.tag && JSON.parse(x.payload).t === "p");
  assert.ok(pings.length >= 2);
  const d0 = black.net.linkStats().dup, o0 = black.net.linkStats().old;
  const last = pings[pings.length - 1].payload; B.publish(`${ROOT}/g/${gid}/k`, last, false); B.publish(`${ROOT}/g/${gid}/k`, last, false);
  await S.run(500);
  assert.equal(black.net.linkStats().dup, d0 + 2, "重複的兩則都丟掉");
  /* 第 13 輪 X2 起 k 訊息有簽名：改序號＝簽名不對，丟掉（以前這裡直接改 sq 當「新的」）；晚到的舊心跳改用真的訊息測：紅方下一則 ping 先扣住，等再下一則到了才放出來 */
  const b0 = black.net.linkStats().bad, forged = JSON.parse(last); forged.sq += 100; B.publish(`${ROOT}/g/${gid}/k`, JSON.stringify(forged), false); await S.run(200);
  assert.equal(black.net.linkStats().bad, b0 + 1, "改過序號的＝簽名不對，丟掉");
  const dv0 = B.deliver; let held = null;
  B.deliver = (c, bytes) => { if (c.P === black && !held) { const e = B.log[B.log.length - 1]; if (e && e.topic === `${ROOT}/g/${gid}/k` && e.from === red.tag && JSON.parse(e.payload).t === "p" && (bytes[0] >> 4) === 3 && Buffer.from(bytes).toString("utf8").endsWith(e.payload)) { held = e.payload; return } } dv0(c, bytes) };
  assert.ok(await S.until(() => held, 20000)); B.deliver = dv0; await S.run(16000);
  B.publish(`${ROOT}/g/${gid}/k`, held, false); await S.run(200);
  assert.equal(black.net.linkStats().old, o0 + 1, "序號比收過的小的 ping＝晚到的舊心跳，丟掉");
  /* 紅方送給黑方的補狀態（st）原封不動再送兩次：黑方的棋譜不變 */
  const st = { v: 1, t: "st", id: red.id, ss: "replay", sq: 1, gid, to: black.id, list: B.log.filter(x => x.topic === `${ROOT}/g/${gid}/s` && x.from === red.tag).map(x => x.payload) };
  const before = core(black.net.game());
  B.publish(`${ROOT}/g/${gid}/k`, JSON.stringify(st), false); await S.run(300); st.ss = "replay2"; B.publish(`${ROOT}/g/${gid}/k`, JSON.stringify(st), false); await S.run(3000);
  deq(core(black.net.game()), before, "舊的、一樣的狀態不會重複套用");
  deq(black.net.suspicious(), [], "真的舊狀態不算可疑");
  move(black, "h7e7"); await S.run(1500); assert.equal(red.net.game().moves.length, 2);
  noErrors(S);
});

test("③ 混沌網路（30% 重複、50% 亂序、0～1.5 秒延遲）下整盤 12 步：k 頻道照常、兩邊和伺服器一致、沒有可疑事件、有冪等丟掉的重複", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  B.setChaos({ dup: 0.3, reorder: 0.5, jitter: 1500, seed: 1113 });
  const seq = ["h2e2", "h7e7", "h0g2", "h9g7", "i0h0", "i9h9", "b2c2", "b7c7", "b0a2", "b9a7", "a0b0", "a9b9"];
  for (let i = 0; i < seq.length; i++) { const P = i % 2 ? black : red; assert.ok(await S.until(() => P.net.game().moves.length === i, 60000), "第 " + (i + 1) + " 步前要先收到上一步"); move(P, seq[i]); await S.run(2500) }
  B.setChaos(null); await S.run(40000);
  deq(core(red.net.game()), core(black.net.game())); assert.equal(red.net.game().moves.length, 12);
  deq(core(B.game(gid)), core(red.net.game()));
  assert.ok(red.net.syncInfo().ok && black.net.syncInfo().ok);
  assert.ok(red.net.linkStats().dup + black.net.linkStats().dup > 0, "混沌有重送 k 訊息，被冪等丟掉");
  deq(red.net.suspicious(), []); deq(black.net.suspicious(), []);
  assert.equal(red.net.game().result, null, "沒有人被判超時");
  noErrors(S);
});

/* ================= ④ 跳號 ================= */
async function gapGame(src) {
  const o = src ? { A: { src }, K: { src } } : null;
  const { S, B } = world(), { red, black, gid } = await startGame(S, B, o);
  move(red, "h2e2"); await S.run(1000); move(black, "h7e7"); await S.run(1000); move(red, "h0g2"); await S.run(1500);
  const R = red.net.game().rev, d0 = B.deliver, re = new RegExp(`"rev":${R + 1}[,}]`);
  /* 黑方收不到 rev R+1 那份（紅方悔掉自己那步）：live 和保留訊息都擋 */
  B.deliver = (c, bytes) => { if (c.P === black) { const s = Buffer.from(bytes).toString("utf8"); if (s.includes(`/g/${gid}/s`) && re.test(s)) return } d0(c, bytes) };
  red.net.update(n => { n.moves.pop(); n.draw = null }); await S.run(300);
  move(red, "b0c2"); await S.run(300);
  const ok = await S.until(() => black.net.game().moves.length === 3 && black.net.game().moves[2][0] === red.net.game().moves[2][0] && black.net.game().rev === red.net.game().rev, 8000);
  return { S, B, red, black, gid, ok, R };
}
test("④ 跳號：黑方漏了紅方悔棋那份（rev R+1）又收到下一份（R+2），接不上就先暫放、用 nd 跟紅方要中間那份，補齊後照 rev 由小到大套用", async () => {
  const t = await gapGame();
  assert.ok(t.ok, "8 秒內補齊");
  deq(core(t.black.net.game()), core(t.red.net.game()));
  assert.ok(t.black.net.linkStats().gap >= 1 && t.black.net.linkStats().nd >= 1, "有暫放、有跟對方要");
  deq(t.black.net.suspicious(), [], "中間那份照樣驗簽（接得上 p 雜湊），不是可疑事件");
  move(t.black, "h9g7"); await t.S.run(1500); assert.equal(t.red.net.game().moves.length, 4, "接著下");
  noErrors(t.S);
});
test("④ 反向驗證：這輪改之前的 net.js 同樣情況，黑方卡在舊的那份不動（30 秒後還是）", async () => {
  const t = await gapGame(OLD);
  assert.equal(t.ok, false); await t.S.run(30000);
  assert.notEqual(t.black.net.game().rev, t.red.net.game().rev, "舊版補不上");
  noErrors(t.S);
});

/* ================= ⑤ 對方沒回應 ================= */
test("⑤ 對方關掉 App：30 秒 slow、90 秒 gone（輪到他、還剩多久會照規則判超時）；按判和＝中止、不計分；對方的手機也收（abort）", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(1000);
  const ev = []; red.net.on("peer", p => ev.push(p && p.st));
  black.close();
  await S.run(20000); assert.equal(red.net.peer().st, "ok");
  assert.equal(red.net.peerAbort("draw"), false, "還沒到 gone 不能判和");
  await S.run(20000); assert.equal(red.net.peer().st, "slow");
  await S.run(55000); const P = red.net.peer();
  assert.equal(P.st, "gone"); assert.equal(P.oppTurn, true); assert.equal(P.kpeer, true); assert.equal(P.canAbort, true);
  assert.ok(Math.abs(P.winIn - (180000 - 95000)) < 4000, "再 " + P.winIn + " 毫秒會判他超時");
  deq(ev, ["slow", "gone"]);
  assert.equal(red.net.peerAbort("draw"), true);
  const g = red.net.game(); assert.equal(g.result.abort, true); assert.equal(g.result.w, null); assert.match(g.result.why, /判和（不計分）/);
  deq(red.hist(), [], "不計積分");
  assert.equal(red.net.peer(), null, "結束了就不再問");
  await S.run(2000); assert.equal(JSON.parse(B.retained.get(`${ROOT}/g/${gid}/s`)).result.abort, true);
  noErrors(S);
});
test("⑤ 判負規則沒改：對方不回來、也沒按判和，輪到他滿 3 分鐘照舊判他超時負、計分", async () => {
  const { S, B } = world(), { red, black } = await startGame(S, B);
  move(red, "h2e2"); await S.run(1000); black.close();
  await S.run(185000);
  const g = red.net.game(); assert.equal(g.result.timeout, true); assert.equal(g.result.w, "r");
  deq(red.hist().map(h => h.res), ["w"]);
  noErrors(S);
});
test("⑤ 自己斷線時是 self（不是對方的錯，不給判和）；連回來重新計時，不會一連上就說對方沒回應", async () => {
  const { S, B } = world(), { red } = await startGame(S, B);
  move(red, "h2e2"); await S.run(1000);
  red.offline(); await S.run(150000);
  assert.equal(red.net.peer().st, "self"); assert.equal(red.net.peer().canAbort, false); assert.equal(red.net.peerAbort("draw"), false);
  red.online(); red.fire("online"); assert.ok(await S.until(() => red.net.status() === "up", 5000)); await S.run(3000);
  assert.equal(red.net.peer().st, "ok");
  noErrors(S);
});

/* ================= ⑥ 跟舊版相容 ================= */
for (const [name, o] of [["新版開局、舊版接受", { K: { src: OLD } }], ["舊版開局、新版接受", { A: { src: OLD } }]]) {
  test("⑥ 相容（" + name + "）：舊版收到 k 訊息直接忽略（不會變成空白表情）、照常下完；新版改用伺服器心跳量延遲、3 次沒回就放慢 ping；對方沒回應改看在線狀態", async () => {
    const { S, B } = world(), g = await startGame(S, B, o), { red, black, gid } = g;
    const NEW = o.K ? g.A : g.K, OLDP = NEW === g.A ? g.K : g.A;
    move(red, "h2e2"); await S.run(1500); move(black, "h7e7"); await S.run(1500); move(red, "h0g2"); await S.run(1500);
    await S.run(40000);
    assert.ok(kLog(B, gid, NEW).length >= 2, "新版有送 ping");
    assert.equal(kLog(B, gid, OLDP).length, 0, "舊版不送");
    deq(OLDP.net.chatLog(), []); deq(OLDP.net.emotes(), [], "舊版沒把 k 當成表情");
    deq(core(OLDP.net.game()), core(NEW.net.game()));
    assert.equal(NEW.net.signState(), "signed"); assert.equal(OLDP.net.signState(), "signed");
    const L = NEW.net.latency(); assert.equal(L.src, "server", "沒有 pong：改用跟伺服器的心跳來回"); assert.ok(L.ms >= 30 && L.ms <= 100, L.ms + " 毫秒"); assert.equal(L.bars, 4);
    assert.equal(NEW.net.syncInfo().kpeer, false);
    const n0 = kLog(B, gid, NEW).length;
    for (const u of ["h9g7", "i0h0", "i9h9", "b2c2"]) { await S.run(58000); move(NEW.net.game().moves.length % 2 ? black : red, u); await S.run(1500) }   /* 4 分鐘裡照常每分鐘走一步（不然會被判超時） */
    const nk = kLog(B, gid, NEW).length - n0;
    assert.ok(nk <= 6, "對方是舊版：4 分鐘只送 " + nk + " 則（每 60 秒；新版對新版是每 15 秒＝16 則）");
    deq(core(OLDP.net.game()), core(NEW.net.game()), "照常接著下");
    assert.equal(NEW.net.game().moves.length, 7); assert.equal(NEW.net.game().result, null);
    OLDP.close(); await S.run(100000);
    const P = NEW.net.peer(); assert.equal(P.st, "gone", "舊版對手離線 90 秒以上＝gone（看在線狀態）"); assert.equal(P.kpeer, false);
    noErrors(S);
  });
}

/* ================= ⑦ 畫面 ================= */
const SIG = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/07hs-netsig.js"), "utf8");
function sigCtx() { const ctx = { setInterval() { }, window: {}, document: {}, location: { hash: "" } }; vm.createContext(ctx); vm.runInContext(SIG + "\nglobalThis.__S={nsgView,nsgAskSpec,nsgSec};", ctx); return ctx.__S }
test("⑦ 訊號膠囊：格數＋毫秒（不只靠顏色）、斷線、量測中、同步中、對方沒回應都寫得出來", () => {
  const { nsgView } = sigCtx(), now = 1e6;
  let v = nsgView({ ms: 85, bars: 4, src: "peer" }, { st: "ok", ms: 0 }, { ok: true, at: now }, now);
  assert.equal(v.bars, 4); assert.equal(v.txt, "85 ms"); assert.match(v.tip, /跟對方手機來回一趟/); assert.match(v.tip, /4／4 格/); assert.match(v.tip, /棋局跟對方一致/);
  v = nsgView({ ms: null, bars: 0, src: null }, { st: "self", ms: 5000 }, null, now); assert.equal(v.bars, 0); assert.equal(v.txt, "斷線"); assert.match(v.tip, /連上後會自動送出/);
  v = nsgView({ ms: null, bars: null, src: null }, null, null, now); assert.equal(v.txt, "—"); assert.match(v.tip, /正在量/);
  v = nsgView({ ms: 900, bars: 2, src: "server" }, { st: "slow", ms: 41000 }, { ok: false, at: now - 5000 }, now);
  assert.equal(v.txt, "900 ms 🔄 同步中 ⏳ 對方 41 秒沒回應"); assert.match(v.tip, /跟伺服器來回一趟/); assert.match(v.tip, /正在自動補齊/);
  assert.equal(nsgView({ ms: 900, bars: 2 }, null, { ok: false, at: now - 2000 }, now).txt, "900 ms", "剛對不上（訊息可能還在路上）不顯示同步中");
});
test("⑦ 對方沒回應的視窗：三個選項（繼續等／判和／離開，判和和離開都寫不計分）；輪到對方時寫再幾秒會照規則判超時；千秋盃只有繼續等和回大廳", () => {
  const { nsgAskSpec } = sigCtx();
  let A = nsgAskSpec({ st: "gone", ms: 95000, kpeer: true, oppTurn: true, winIn: 85000, canAbort: true });
  deq(A.opts.map(o => o.k), ["wait", "draw", "leave"]);
  assert.match(A.opts[1].label, /判和（不計分）/); assert.match(A.opts[2].label, /不計分/);
  assert.match(A.html, /已經 95 秒沒收到/); assert.match(A.html, /再過 85 秒他還沒走，會照原本的規則判他超時/);
  A = nsgAskSpec({ st: "gone", ms: 130000, kpeer: false, oppTurn: false, winIn: null, canAbort: true });
  assert.match(A.html, /2 分 10 秒/); assert.match(A.html, /對方顯示離線/); assert.match(A.html, /現在輪到你/);
  A = nsgAskSpec({ st: "gone", ms: 95000, kpeer: true, oppTurn: true, winIn: 85000, canAbort: false });
  deq(A.opts.map(o => o.k), ["wait", "lobby"]); assert.match(A.html, /千秋盃沒有中止/);
});
test("〔原始碼〕m.html 在 07hp-haptics 後面 include 07hs-netsig；net.js 有 LINK 區段、k 頻道在 onMsg 裡；舊版的 onMsg 只認 s、e（收到 k 會忽略）", () => {
  const H = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m.html"), "utf8");
  assert.match(H, /\/\/#include m\/07hp-haptics\.js\n\/\/#include m\/07hs-netsig\.js\n/);
  const N = fs.readFileSync(path.join(__dirname, "../src/net.js"), "utf8");
  assert.ok(N.includes("LINK:BEGIN") && N.includes("LINK:END")); assert.match(N, /else if\(p\[2\]==="k"\)lkIn\(msg\)/);
  assert.doesNotMatch(OLD, /p\[2\]==="k"/);
});
