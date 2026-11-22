// 評比第 13 輪 X2／X5（評審「連線與雲端架構師」P22.1、P22.2、P22.5，P31.3 除錯畫面）：src/net.js LINK 區段的連線同步頻道（g/<對局>/k）簽名、防重放、相容、除錯資料。
//   用 tools/net-harness.js：vm 載入 App 真正的 src/net.js，WebSocket 接記憶體裡的假 MQTT 伺服器、假時鐘；不連正式或測試伺服器、不開瀏覽器、不碰任何金鑰檔
//   （手機的對局金鑰是測試當下在記憶體裡產生的；「攻擊者」的金鑰也是）。
//   ① 新版對新版：每則 k 都有簽名（格式跟 architecture.md 寫的一樣，用綁定的公開金鑰驗得過）、邀請／接受帶 kv:2、延遲和局面比對都標「已驗簽」
//   ② 偽造：沒簽名、用別把金鑰簽、照抄真 ping 的 nc 假造 pong——一律丟掉並計數；拖不住「對方沒回應」、假造不了訊號格；偽造的序號污染不了真訊息
//   ③ 重放：同一連線的原封重送＝重複；App 重開後重放舊訊息＝比收過最新的還舊／時間窗外；舊 pong＝不是回我這次的 ping；綁定紀錄沒有 kv 的，收到一則驗過的就升級成一律要簽
//   ④ 時鐘差：對方手機快 90 秒照常驗過；「對方有回應」記在他送出的那一刻，他時鐘快也不會讓他看起來比較新
//   ⑤ 新舊互下：對上一輪（X11，k 不簽）照常下完、延遲標未驗證、未驗證的訊息拖不住「對方沒回應」；對上更舊的（沒有 k）照常、版本顯示舊版
//   ⑥ 除錯畫面（m/07hs-netsig.js 的連線狀態小卡）：欄位齊全、複製的文字不含金鑰、代號、名字、對局代號、連線亂數
// 用法：node --test xiangqi-lab/tools/test-net-linksig.js
"use strict";
const { assert, test, fs, path, vm, J, world, phone, move, startGame, noErrors, ROOT } = require("./net-harness.js");
const { webcrypto } = require("node:crypto");
const X11 = fs.readFileSync(path.join(__dirname, "fixtures/net-x11-1113.js"), "utf8");      /* 上一輪（第 12 輪 X11）的 net.js：有 k 頻道、不簽 */
const PRE = fs.readFileSync(path.join(__dirname, "fixtures/net-pre-x11-1113.js"), "utf8");  /* 更舊：沒有 k 頻道 */
const deq = (a, b, m) => assert.deepEqual(J(a), J(b), m);
const kTopic = gid => `${ROOT}/g/${gid}/k`;
const kRaw = (B, gid, P) => B.log.filter(x => x.topic === kTopic(gid) && (!P || x.from === P.tag));
const kLog = (B, gid, P) => kRaw(B, gid, P).map(x => JSON.parse(x.payload));
/* 簽名內容（跟 net.js 的 lkSigStr、architecture.md 寫的一樣） */
const LKF = ["v", "t", "id", "ss", "sq", "gid", "ts", "to", "nc", "ets", "rev", "n", "h", "hi", "after", "list"];
const sigStr = x => "xq-lk1|" + ROOT + "|" + JSON.stringify(LKF.map(k => x[k] === undefined ? null : x[k]));
const b64u = s => Buffer.from(s, "base64url");
async function verifyWith(pk, x) { const k = await webcrypto.subtle.importKey("raw", b64u(pk), { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]); return webcrypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, k, b64u(x.sg), new TextEncoder().encode(sigStr(x))) }
const evilKey = () => webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
async function evilSign(kp, x) { return Buffer.from(await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, kp.privateKey, new TextEncoder().encode(sigStr(x)))).toString("base64url") }
const bindOf = (P, gid) => (JSON.parse(P.storage.getItem("xq_netBind") || "{}") || {})[gid] || {};

/* ================= ① 新版對新版 ================= */
test("① 新版對新版：邀請／接受帶 kv:2、綁定記 kv:2；每則 k（ping、pong）都帶 sg、ts，ping 帶 nc、pong 照抄；簽名用開局綁定的公開金鑰驗得過；延遲、局面比對標已驗簽", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(1000); move(black, "h7e7"); await S.run(40000);
  const inv = B.log.filter(x => /\/i\//.test(x.topic)).map(x => JSON.parse(x.payload)).filter(x => x.type === "invite" || x.type === "accept");
  assert.ok(inv.length >= 2 && inv.every(x => x.from.kv === 2), "邀請、接受都帶 kv:2");
  assert.equal(bindOf(red, gid).kv, 2); assert.equal(bindOf(black, gid).kv, 2);
  const g = red.net.game(), L = kLog(B, gid);
  assert.ok(L.length >= 8);
  assert.ok(L.every(x => x.v === 1 && typeof x.sg === "string" && Number.isFinite(x.ts)), "每則都有簽名、送出時間");
  assert.ok(L.filter(x => x.t === "p").every(x => typeof x.nc === "string" && x.nc.length >= 6), "ping 帶 nc");
  const pings = L.filter(x => x.t === "p"), pongs = L.filter(x => x.t === "q");
  assert.ok(pongs.length >= 2 && pongs.every(q => pings.some(p => p.nc === q.nc && p.id === q.to)), "pong 照抄對方 ping 的 nc");
  for (const x of L.slice(0, 6)) { const pk = x.id === g.red.id ? g.red.pk : g.black.pk; assert.ok(await verifyWith(pk, x), "用開局綁定的公開金鑰驗得過（" + x.t + " #" + x.sq + "）") }
  const other = L.find(x => x.id === g.red.id); assert.equal(await verifyWith(g.black.pk, other), false, "用另一方的金鑰驗不過");
  for (const P of [red, black]) {
    const D = P.net.linkDebug(), st = D.stats;
    assert.equal(D.peerVer, "new"); assert.equal(D.req, true); assert.equal(D.sign, "signed"); assert.equal(D.clk, true, "從 pong 學到雙方時鐘差");
    assert.ok(st.sigOk >= 4); assert.equal(st.unv, 0); assert.equal(st.bad + st.nosig + st.replay + st.win, 0, "沒有被丟的");
    assert.equal(D.lat.src, "peer"); assert.equal(D.lat.ver, true); assert.equal(P.net.latency().ver, true);
    assert.ok(D.lat.last.length >= 2 && D.lat.avg >= 60 && D.lat.avg <= 200, "最近幾次 " + D.lat.last + "、平均 " + D.lat.avg); assert.ok(D.lat.jit >= 0 && D.lat.jit < 60, "抖動 " + D.lat.jit);
    assert.equal(D.sync.ok, true); assert.equal(D.sync.ver, true); deq(D.sync.me, { rev: P.net.game().rev, n: 2, h: D.sync.me.h }); deq(D.sync.peer, { rev: D.sync.me.rev, n: 2, h: D.sync.me.h }, "雙方 rev、步數、雜湊一致");
    assert.ok(D.ev.length > 0 && D.ev.length <= 20 && D.ev.every(e => e.d === "out" ? e.ok === true : e.ok === true && e.why === ""), "最近事件都驗過、都收下");
    assert.equal(D.recon, 0);
  }
  noErrors(S);
});

/* ================= ② 偽造 ================= */
test("② 偽造：對方關掉 App 後，第三者每 10 秒冒他的名義送 ping／pong（沒簽名、用自己的金鑰簽、照抄真 ping 的 nc）：全部丟掉並計數，90 秒照樣出現「對方沒回應」，訊號格不會被假造", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(20000);
  const ss = kLog(B, gid, black).pop().ss, kp = await evilKey(); let sq = 5000;
  /* 先拿真的連線亂數 ss、很大的序號送一則沒簽名的：丟掉，而且污染不了序號表（之後真的 ping 照收） */
  const old0 = red.net.linkStats().old, ok0 = red.net.linkStats().sigOk, h = red.net.linkDebug().sync.me.h;
  B.publish(kTopic(gid), JSON.stringify({ v: 1, t: "p", id: black.id, ss, sq: 99999, gid, ts: S.now, nc: "zzzz", rev: red.net.game().rev, n: 1, h }), false);
  await S.run(20000);
  assert.ok(red.net.linkStats().sigOk > ok0, "真的 ping 照收"); assert.equal(red.net.linkStats().old, old0, "沒有被當成舊心跳");
  black.close(); const t0 = S.now, ev = []; red.net.on("peer", p => ev.push(p && p.st));
  const s0 = red.net.linkStats();
  for (let k = 0; k < 11; k++) {
    await S.run(10000);
    const g = red.net.game(), base = { v: 1, id: black.id, ss, gid, ts: S.now, rev: g.rev, n: g.moves.length, h };
    const rp = kLog(B, gid, red).filter(x => x.t === "p").pop();   /* 紅方最近一則真的 ping（第三者在伺服器上看得到） */
    B.publish(kTopic(gid), JSON.stringify({ ...base, t: "p", sq: ++sq, nc: "a" + k }), false);                          /* 沒簽名 */
    const p2 = { ...base, t: "p", sq: ++sq, nc: "b" + k }; p2.sg = await evilSign(kp, p2); B.publish(kTopic(gid), JSON.stringify(p2), false);   /* 用自己的金鑰簽 */
    const q = { ...base, t: "q", sq: ++sq, to: red.id, ets: rp.ts, nc: rp.nc }; q.sg = await evilSign(kp, q); B.publish(kTopic(gid), JSON.stringify(q), false);   /* 假 pong，照抄真 nc */
    B.publish(kTopic(gid), JSON.stringify({ ...base, t: "q", sq: ++sq, to: red.id, ets: S.now - 30, nc: rp.nc }), false);   /* 假 pong，沒簽名、假裝來回只要 30 毫秒 */
    if (red.net.peer().st === "gone" && !ev.goneAt) ev.goneAt = S.now - t0;
  }
  await S.run(1000);
  const st = red.net.linkStats(), P = red.net.peer();
  assert.equal(P.st, "gone", "照樣判定對方沒回應"); assert.ok(ev.goneAt >= 90000 && ev.goneAt <= 100000, "關掉後 " + ev.goneAt + " 毫秒出現 gone（沒被拖延）");
  assert.equal(st.nosig - s0.nosig, 22, "沒簽名的 22 則都丟"); assert.equal(st.bad - s0.bad, 22, "別把金鑰簽的 22 則都丟");
  assert.equal(st.sigOk, s0.sigOk, "沒有一則被當成真的"); assert.equal(st.pongs, s0.pongs);
  assert.notEqual(red.net.latency().src, "peer", "訊號格不是用假 pong 算的（改回伺服器心跳）");
  const D = red.net.linkDebug(), bad = D.ev.filter(e => e.d === "in" && e.ok === false);
  assert.ok(bad.some(e => /沒有簽名/.test(e.why)) && bad.some(e => /簽名不對/.test(e.why)), "除錯事件寫得出丟掉的原因");
  deq(red.net.suspicious(), [], "k 頻道的偽造不算對局狀態的可疑事件");
  assert.equal(red.net.peerAbort("draw"), true, "可以照常判和（不計分）");
  noErrors(S);
});

/* ================= ③ 重放 ================= */
test("③ 重放：原封重送＝重複丟掉；App 重開後重放 40 秒前的 ping＝比收過最新的還舊、100 秒前的＝時間窗外、舊 pong＝不是回我這次的 ping；綁定少了 kv 的，收到一則驗過的就升級、之後沒簽名的一律丟", async () => {
  const { S, B } = world(), g = await startGame(S, B), { red, black, gid } = g;
  const seq = ["h2e2", "h7e7", "h0g2", "h9g7"];
  for (let i = 0; i < seq.length; i++) { move(i % 2 ? black : red, seq[i]); await S.run(30000) }
  const bp = kRaw(B, gid, black), pings = bp.filter(x => JSON.parse(x.payload).t === "p"), pongs = bp.filter(x => { const y = JSON.parse(x.payload); return y.t === "q" && y.to === red.id });
  /* a) 同一條連線原封重送 */
  const d0 = red.net.linkStats().dup;
  B.publish(kTopic(gid), pings[pings.length - 1].payload, false); B.publish(kTopic(gid), pongs[pongs.length - 1].payload, false); await S.run(300);
  assert.equal(red.net.linkStats().dup, d0 + 2, "最近一則 ping、pong 原封重送：重複，丟掉");
  /* b) 紅方 App 重開（序號表在記憶體裡，重開就沒了）；綁定紀錄故意拿掉 kv（像是更早以前的綁定） */
  const bind = JSON.parse(red.storage.getItem("xq_netBind")); delete bind[gid].kv; red.storage.setItem("xq_netBind", JSON.stringify(bind));
  assert.ok(JSON.parse(red.storage.getItem("xq_lkClk")).kt > 0, "對方最新的送出時間存在手機裡");
  red.close(); await S.run(500);
  const R2 = phone(S, B, { id: red.id, name: red === g.A ? "甲" : "乙", storage: red.storage, idb: red.idb, hash: "#/pvp" }); R2.net.start();
  /* 重開後一拿到這盤（還沒收到對方任何一則新的 k）就重放：序號表是空的，只能靠存在手機裡的「對方最新的送出時間」和時間窗擋 */
  assert.ok(await S.until(() => R2.net.game() && R2.net.side() === "r", 20000), "重開後接回這盤");
  assert.equal(R2.net.linkDebug().stats.sigOk, 0, "還沒收到對方新的 k");
  const now = S.now, ago = ms => pings.map(x => JSON.parse(x.payload)).filter(y => now - y.ts >= ms).pop();
  const p40 = ago(40000), p100 = ago(100000);
  assert.ok(p40 && p100 && now - p40.ts < 60000, "找得到 40～60 秒前、100 秒前的真 ping");
  B.publish(kTopic(gid), JSON.stringify(p40), false); B.publish(kTopic(gid), JSON.stringify(p100), false); B.publish(kTopic(gid), pongs[0].payload, false); await S.run(100);
  const s1 = R2.net.linkStats();
  assert.equal(s1.replay, 2, "40 秒前的 ping（比收過最新的還舊）、舊 pong（不是回我這次的 ping）＝重放");
  assert.equal(s1.win, 1, "100 秒前的 ping＝時間窗外");
  assert.equal(s1.sigOk, 0, "重放的都沒有被當成新的");
  const why = R2.net.linkDebug().ev.filter(e => e.ok === true && e.why).map(e => e.why).join("｜");
  assert.match(why, /比收過最新的那則還舊/); assert.match(why, /不是回我這次的 ping/); assert.match(why, /時間窗/);
  assert.ok(await S.until(() => R2.net.linkDebug().stats.sigOk > 0, 20000), "之後收到真的 k");
  assert.equal(bindOf(R2, gid).kv, 2, "收到一則驗過的就升級成一律要簽（存回手機）");
  assert.equal(R2.net.linkDebug().peerVer, "new");
  /* c) 升級後沒簽名的一律丟 */
  const n0 = R2.net.linkStats().nosig, G2 = R2.net.game();
  B.publish(kTopic(gid), JSON.stringify({ v: 1, t: "p", id: black.id, ss: "evil", sq: 1, gid, ts: S.now, nc: "q1", rev: G2.rev, n: G2.moves.length, h: "x" }), false); await S.run(300);
  assert.equal(R2.net.linkStats().nosig, n0 + 1);
  /* 照常接著下 */
  move(R2, "i0h0"); await S.run(1500); assert.equal(black.net.game().moves.length, 5);
  assert.equal(R2.net.peer().st, "ok"); assert.equal(R2.net.linkDebug().recon, 0);
  noErrors(S);
});

test("③ 重連次數：自己斷線再連上，除錯資料的這盤重連次數加 1；重連後的打招呼 ping 照樣驗簽", async () => {
  const { S, B } = world(), { red, black } = await startGame(S, B);
  move(red, "h2e2"); await S.run(20000);
  red.offline(); await S.run(50000); red.online(); red.fire("online");
  assert.ok(await S.until(() => red.net.status() === "up", 5000)); await S.run(20000);
  const D = red.net.linkDebug(); assert.equal(D.recon, 1); assert.equal(D.sync.ok, true); assert.equal(D.stats.bad + D.stats.nosig + D.stats.replay + D.stats.win, 0);
  assert.equal(black.net.linkDebug().stats.bad + black.net.linkDebug().stats.nosig, 0);
  noErrors(S);
});

/* ================= ④ 時鐘差 ================= */
test("④ 時鐘差：乙的手機快 90 秒——照常驗過（時間窗換算時鐘差）；乙關掉 App 後，甲照樣在 90～100 秒內看到 gone（不會因為他的時鐘快就多撐 90 秒）", async () => {
  const { S, B } = world(), skew = { get now() { return S.now + 90000 } };
  const g = await startGame(S, B, { K: { ctx: { __S: skew } } }), { A, K, red, black } = g;
  move(red, "h2e2"); await S.run(1000); move(black, "h7e7"); await S.run(40000);
  for (const P of [A, K]) {
    const D = P.net.linkDebug(); assert.equal(D.clk, true); assert.equal(D.sync.ok, true); assert.equal(D.peer, "ok");
    assert.ok(D.stats.sigOk >= 4); assert.equal(D.stats.win + D.stats.replay + D.stats.bad, 0, JSON.stringify(D.stats));
  }
  K.close(); const t0 = S.now;
  assert.ok(await S.until(() => A.net.peer() && A.net.peer().st === "gone", 120000));
  const ms = S.now - t0; assert.ok(ms >= 85000 && ms <= 100000, "關掉後 " + ms + " 毫秒 gone");
  noErrors(S);
});

/* ================= ⑤ 新舊互下 ================= */
for (const [name, o] of [["新版開局、上一版接受", { K: { src: X11 } }], ["上一版開局、新版接受", { A: { src: X11 } }]]) {
  test("⑤ 跟上一版（X11，k 不簽）互下（" + name + "）：照常下完、雙方都量得到延遲；新版標未驗證、對方版本 old-k；上一版關掉後第三者冒名送沒簽名的 ping，拖不住「對方沒回應」（改看在線狀態）", async () => {
    const { S, B } = world(), g = await startGame(S, B, o), { red, black, gid } = g;
    const NEW = o.K ? g.A : g.K, OLD = NEW === g.A ? g.K : g.A;
    const seq = ["h2e2", "h7e7", "h0g2", "h9g7"];
    for (let i = 0; i < seq.length; i++) { move(i % 2 ? black : red, seq[i]); await S.run(20000) }
    assert.equal(NEW.net.game().moves.length, 4); deq(NEW.net.game().moves, OLD.net.game().moves);
    assert.equal(NEW.net.signState(), "signed", "對局狀態照樣雙方簽名");
    const D = NEW.net.linkDebug();
    assert.equal(D.peerVer, "old-k"); assert.equal(D.req, false); assert.ok(D.stats.unv >= 4); assert.equal(D.stats.nosig + D.stats.bad, 0, "上一版沒簽名的照收（未驗證）");
    assert.equal(D.lat.src, "peer"); assert.equal(D.lat.ver, false, "延遲標未驗證"); assert.equal(D.sync.ok, true); assert.equal(D.sync.ver, false);
    assert.equal(NEW.net.peer().kpeer, false, "未驗證的 k 不算「對方有回應」的依據");
    assert.equal(OLD.net.syncInfo().kpeer, true, "上一版照樣收新版的 ping（多出來的 sg、nc 不理）"); assert.equal(OLD.net.latency().src, "peer");
    assert.ok(kLog(B, gid, NEW).every(x => typeof x.sg === "string"), "新版送的照樣簽名");
    const sig = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/07hs-netsig.js"), "utf8"), ctx = { setInterval() { }, window: {}, document: {}, location: { hash: "" } };
    vm.createContext(ctx); vm.runInContext(sig + "\nglobalThis.__S={nsgView};", ctx);
    assert.match(ctx.__S.nsgView(NEW.net.latency(), NEW.net.peer(), NEW.net.syncInfo(), S.now).tip, /未驗證/);
    /* 上一版關掉 App；第三者每 10 秒冒他的名義送沒簽名的 ping（這盤沒強制簽名，會被當成未驗證收下），但未驗證的不更新「對方多久沒回應」 */
    const ss = kLog(B, gid, OLD).pop().ss; OLD.close(); const t0 = S.now; let sq = 9000, gone = 0;
    for (let k = 0; k < 12 && !gone; k++) {
      await S.run(10000); const G = NEW.net.game();
      B.publish(kTopic(gid), JSON.stringify({ v: 1, t: "p", id: OLD.id, ss, sq: ++sq, gid, ts: S.now, rev: G.rev, n: G.moves.length, h: NEW.net.linkDebug().sync.me.h }), false);
      await S.run(100); if (NEW.net.peer().st === "gone") gone = S.now - t0;
    }
    assert.ok(gone > 0 && gone <= 110000, "上一版關掉後 " + gone + " 毫秒 gone（看在線狀態，冒名的 ping 拖不住）");
    assert.ok(NEW.net.linkStats().unv > D.stats.unv, "冒名的 ping 是當成未驗證收下的");
    noErrors(S);
  });
}
test("⑤ 跟更舊的版本（沒有 k 頻道）互下：照常下、新版照樣簽名送 ping（舊版不理），對方版本顯示 old", async () => {
  const { S, B } = world(), g = await startGame(S, B, { K: { src: PRE } }), { red, black } = g;
  move(red, "h2e2"); await S.run(1500); move(black, "h7e7"); await S.run(60000);
  const D = g.A.net.linkDebug(); assert.equal(D.peerVer, "old"); assert.equal(D.lat.src, "server"); assert.equal(D.sync.ok, null);
  deq(g.A.net.game().moves, g.K.net.game().moves);
  noErrors(S);
});

/* ================= ⑥ 除錯畫面 ================= */
const SIG = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/m/07hs-netsig.js"), "utf8");
function sigCtx() { const ctx = { setInterval() { }, window: {}, document: {}, location: { hash: "" } }; vm.createContext(ctx); vm.runInContext(SIG + "\nglobalThis.__S={nsgView,nsgDbgSpec};", ctx); return ctx.__S }
test("⑥ 連線狀態小卡：真的對局資料 → 延遲（最近幾次、平均、抖動）、雙方 rev／步數／雜湊、簽名和版本、重連、計數、最近事件；複製的文字不含金鑰、代號、名字、對局代號、連線亂數", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(40000);
  const { nsgDbgSpec, nsgView } = sigCtx(), N = red.net, tip = nsgView(N.latency(), N.peer(), N.syncInfo(), S.now).tip, D = N.linkDebug();
  const A = nsgDbgSpec(D, tip, S.now);
  for (const k of ["延遲", "最近幾次", "平均／抖動", "我這邊", "對方報的", "雙方局面", "對局簽名", "對方版本", "這盤重連", "丟掉的", "同步事件"]) assert.ok(A.html.includes(k), "卡片有「" + k + "」");
  assert.match(A.html, /✅ 一致/); assert.match(A.html, /已驗簽/); assert.match(A.html, /新版（同步訊息有簽名）/); assert.match(A.html, /nsg-cp/);
  assert.match(A.text, /^象棋千秋 連線除錯/); assert.match(A.text, /雙方局面：✅ 一致/); assert.match(A.text, /這盤重連：0 次/);
  const evLines = A.text.split("\n").filter(l => /^\d\d:\d\d:\d\d /.test(l)); assert.ok(evLines.length >= 4 && evLines.length <= 20, evLines.length + " 則事件");
  assert.match(evLines[0], / (送|收) (ping|pong) #\d+ ✓ (送出|收下)$/);
  const g = N.game(), dump = JSON.stringify(D) + A.text + A.html, sss = new Set(kLog(B, gid).map(x => x.ss));
  for (const s of [red.id, black.id, "甲", "乙", gid, g.red.pk, g.black.pk, g.red.pk.slice(0, 20), ...sss]) assert.ok(!dump.includes(s), "不能含有「" + s.slice(0, 12) + "…」");
  noErrors(S);
});
test("⑥ 小卡純函式：沒有資料、未驗證、不一致、丟掉的事件（紅字）、原因裡的 HTML 會被跳脫", () => {
  const { nsgDbgSpec } = sigCtx(), now = Date.UTC(2026, 10, 13, 4, 0, 0);
  assert.match(nsgDbgSpec(null, "", now).text, /不在線上對局裡/);
  const D = { lat: { ms: 900, bars: 2, src: "peer", ver: false, last: [880, 900, 950], avg: 910, jit: 35, server: 60 },
    sync: { ok: false, ver: false, at: now - 5000, me: { rev: 7, n: 6, h: "aaaa1111" }, peer: { rev: 6, n: 5, h: "bbbb2222" } },
    ev: [{ at: now - 2000, d: "in", t: "p", sq: 3, ok: false, why: "簽名不對<b>x</b>" }, { at: now - 1000, d: "in", t: "q", sq: 4, ok: null, why: "" }],
    recon: 2, peerVer: "old-k", sign: "signed", req: false, peer: "slow", clk: false, stats: { sigOk: 0, unv: 5, bad: 1, nosig: 0, replay: 0, win: 0, dup: 1, old: 0, flood: 0, stOut: 1, stIn: 0, nd: 0, gap: 0, gapFix: 0 } };
  const A = nsgDbgSpec(D, "提示", now);
  assert.match(A.html, /跟對方手機來回・未驗證/); assert.match(A.html, /⚠️ 不一致（自動補齊中）（對方的報告未驗證）/); assert.match(A.html, /上一版（同步訊息沒簽名，未驗證）/);
  assert.match(A.html, /rev 7・6 步・雜湊 aaaa1111/); assert.match(A.html, /rev 6・5 步・雜湊 bbbb2222/); assert.match(A.html, /這盤重連<\/th><td>2 次・對方慢/);
  assert.match(A.html, /<tr class="bad">/); assert.ok(!A.html.includes("<b>x</b>") && A.html.includes("&lt;b&gt;x&lt;/b&gt;"), "原因裡的 HTML 跳脫");
  assert.match(A.text, /880、900、950 ms/); assert.match(A.text, /910 ms／35 ms・伺服器心跳 60 ms/);
  assert.match(A.text, /收 pong #4 未驗證 收下/);
});
test("〔原始碼〕net.js 的 k 訊息簽名、驗簽、防重放都在 LINK 區段；07hs 點一下／長按打開小卡、有複製按鈕；兩份 architecture.md 寫了簽名格式", () => {
  const N = fs.readFileSync(path.join(__dirname, "../src/net.js"), "utf8"), L = N.slice(N.indexOf("LINK:BEGIN"), N.indexOf("LINK:END"));
  for (const k of ["lkSigStr", "lkVet", "lkUse", "linkDebug", '"xq-lk1|"', "LK_WIN0", "LK_BACK"]) assert.ok(L.includes(k), k);
  assert.match(SIG, /pointerdown/); assert.match(SIG, /nsgDbgOpen\(\)/); assert.match(SIG, /複製除錯資訊/);
  const a = fs.readFileSync(path.join(__dirname, "../site/data/docs/architecture.md"), "utf8"), b = fs.readFileSync(path.join(__dirname, "../../xiangqi-db/art/docs/architecture.md"), "utf8");
  assert.equal(a, b, "兩份 architecture.md 逐字相同"); assert.ok(!a.includes("\r"));
  assert.match(a, /xq-lk1\|ROOT\|/); assert.match(a, /連線狀態小卡/);
});
