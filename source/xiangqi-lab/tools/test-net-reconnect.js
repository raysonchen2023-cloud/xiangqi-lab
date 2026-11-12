// 評審 P22（連線與雲端架構師）＋P19.3（中斷恢復）：線上大廳的斷線、重連、狀態同步自動測試。
//   用 vm 載入 App 真正的 src/net.js（連 MQTT 用戶端那一段也是真的），只把 WebSocket 換成假的，背後接一台「記憶體裡的假 MQTT 伺服器」
//   （會處理 CONNECT／SUBSCRIBE／PUBLISH／保留訊息／遺囑／心跳），時鐘和計時器也換成測試控制的假時鐘。不連正式或測試伺服器、不發任何真的訊息。
//   ① 斷線→重連：重新訂閱、在線狀態重發、遺囑清掉在線狀態；irt 匿名資料排隊、補送；送到一半又斷線，沒送出的放回排隊。
//   ② 線上對局中斷線：對手看到離線、自己畫面「棋步連上後送出」；重連後補同步（以伺服器保留的對局狀態為準）、不重複落子；App 被關掉重開也接得回來。
//   ③ 棋鐘競逐 flagRace／flagTie：一邊判對方超時、一邊同時落子，兩支手機最後只承認同一個結果，積分只記一次、不會互相一直重送。
//   ④ 重連風暴：伺服器掛掉、或連上就被踢，重試間隔會加倍（最多 60 秒）；網路恢復事件會關掉舊連線，不會一則邀請收兩次。
//   ⑤ 同一個 rev 的兩份不同狀態（落子 vs 提和、落子 vs 悔棋、認輸 vs 落子、同意和棋 vs 落子、兩邊同時判超時）：兩支手機、觀眾、伺服器收斂到同一份，不會雙方都記勝。
//   ⑥ 切到背景主動下線（11/12）：閒置滿 60 秒、下棋中滿 5 分鐘才下線，先清在線狀態；背景中不重連；切回前景馬上重連、補同步；下棋中短暫切走不會被判輸。
//   混沌網路（掉包、重複、亂序、延遲）下的整盤對局另見 tools/test-net-chaos.js。
//   共用的假伺服器、假時鐘、手機在 tools/net-harness.js（tools/test-net-sign.js 也用）。
// 用法：node --test xiangqi-lab/tools/test-net-reconnect.js
"use strict";
const { assert, test, Sched, Broker, phone, memStorage, J, MV, move, core, T0, world, noErrors, startGame, ROOT } = require("./net-harness.js");

/* ================= ① 斷線→重連 ================= */
test("① 網路斷掉：看門狗判斷線、伺服器發遺囑清上線狀態；恢復後重新訂閱、上線狀態重發、排隊的匿名資料補送", async () => {
  const { S, B } = world();
  const A = phone(S, B, { id: "aaaa1111", name: "甲" }), O = phone(S, B, { id: "cccc3333", name: "丙" });
  A.net.start(); O.net.start(); await S.run(3000);
  assert.equal(A.net.status(), "up");
  const subs0 = B.subsOf(A).sort();
  for (const t of [`${ROOT}/i/aaaa1111`, `${ROOT}/sys/+`, `${ROOT}/cup/+`, `${ROOT}/u/+`]) assert.ok(subs0.includes(t), "連上要訂 " + t);
  assert.ok(B.retained.get(`${ROOT}/u/aaaa1111`), "連上要發保留的在線狀態");
  assert.ok(O.net.people().some(x => x.id === "aaaa1111"), "別人看得到甲");

  A.offline();                                   // 搭捷運：WebSocket 卡住，不會觸發 close
  await S.run(50000);
  assert.notEqual(A.net.status(), "up", "看門狗 36～39 秒內要判定斷線");
  assert.ok(A.net.downFor() > 0);
  assert.equal(B.retained.has(`${ROOT}/u/aaaa1111`), false, "伺服器 45 秒沒收到心跳，照遺囑清掉在線狀態");
  assert.equal(O.net.people().some(x => x.id === "aaaa1111"), false, "別人看到甲離線");

  for (let k = 0; k < 3; k++) A.net.shareIRT({ t: "quiz", r: [["q" + k, 1, 5]] });
  assert.equal(A.irtQ().length, 3, "斷線中先排隊（存在手機）");
  assert.equal(B.log.filter(x => x.topic === `${ROOT}/irt`).length, 0);

  A.online();
  assert.ok(await S.until(() => A.net.status() === "up", 90000), "網路回來後自動重連");
  await S.run(3000);
  const subs1 = B.subsOf(A);
  for (const t of subs0) assert.ok(subs1.includes(t), "重連後要重新訂 " + t);
  const u = JSON.parse(B.retained.get(`${ROOT}/u/aaaa1111`) || "null");
  assert.ok(u && u.v === 2 && u.id === "aaaa1111", "重連後重發在線狀態");
  assert.ok(O.net.people().some(x => x.id === "aaaa1111"), "別人又看得到甲");
  const irt = B.log.filter(x => x.topic === `${ROOT}/irt`).map(x => JSON.parse(x.payload).r[0][0]);
  assert.deepEqual(irt, ["q0", "q1", "q2"], "排隊的匿名資料照順序補送、各一次");
  assert.deepEqual(A.irtQ(), [], "送完排隊清空");
  assert.equal(B.connsOf(A).length, 1, "伺服器上只剩一條甲的連線");
  noErrors(S);
});

test("① 匿名資料一則一則送到一半又斷線：沒送出的放回排隊，下次連上補送，不重複", async () => {
  const { S, B } = world();
  const st = memStorage([["xq_irtQ", JSON.stringify(Array.from({ length: 10 }, (_, k) => ({ t: "quiz", r: [["n" + k, 1, 3]], at: T0 })))]]);
  const A = phone(S, B, { id: "aaaa1111", name: "甲", storage: st });
  A.net.start();
  const sent = () => B.log.filter(x => x.topic === `${ROOT}/irt`).map(x => JSON.parse(x.payload).r[0][0]);
  assert.ok(await S.until(() => sent().length >= 3, 10000));
  B.kick(A);                                       // 伺服器那頭斷線（手機收得到 close）
  await S.run(600);
  assert.ok(sent().length < 10, "斷在中間");
  assert.ok(A.irtQ().length > 0, "沒送出的要放回排隊");
  await S.run(30000);
  assert.equal(A.net.status(), "up");
  const all = sent();
  assert.deepEqual([...all].sort(), Array.from({ length: 10 }, (_, k) => "n" + k).sort(), "十筆都送到、沒有重複");
  assert.deepEqual(A.irtQ(), []);
  noErrors(S);
});

/* ================= ② 線上對局中斷線 ================= */
test("② 對局中斷線：對手看到離線；斷線時走的棋連上後補送，對方只多一步；對方趁我斷線走的棋，重連後以保留狀態補上", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(1000);
  assert.equal(black.net.game().moves.length, 1);

  black.offline();                                  // 黑方進隧道
  await S.run(50000);
  assert.equal(red.net.oppOnline(), false, "紅方畫面：⚪ 對方暫時離線");
  assert.notEqual(black.net.status(), "up", "黑方畫面：⚠ 重新連線中…");
  move(black, "h7e7");                              // 斷線中照樣可以走
  assert.equal(black.net.pendingSend(), true, "黑方畫面：（棋步連上後送出）");
  assert.equal(black.net.game().moves.length, 2);
  assert.equal(red.net.game().moves.length, 1);

  black.online();
  assert.ok(await S.until(() => black.net.status() === "up", 90000));
  await S.run(3000);
  assert.equal(black.net.pendingSend(), false);
  assert.deepEqual(core(red.net.game()), core(black.net.game()), "兩邊棋譜一致");
  assert.equal(red.net.game().moves.length, 2, "紅方只多一步，不重複落子");
  assert.deepEqual(core(B.game(gid)), core(red.net.game()), "伺服器保留的就是這一份");
  assert.equal(red.net.oppOnline(), true, "黑方回來後紅方看到在線");

  move(red, "h0g2"); await S.run(1000);                    // 輪到黑方；這次換紅方斷線
  red.offline(); await S.run(1000);
  move(black, "h9g7"); await S.run(1000);                 // 紅方斷線時黑方走了（伺服器保留這份）
  assert.equal(red.net.game().moves.length, 3, "紅方斷線中還不知道");
  red.online();
  assert.ok(await S.until(() => red.net.game().moves.length === 4, 120000), "紅方重連後從保留訊息補上黑方那步");
  await S.run(3000);
  assert.deepEqual(core(red.net.game()), core(B.game(gid)), "以伺服器保留的對局狀態為準");
  assert.deepEqual(core(red.net.game()), core(black.net.game()));
  move(red, "i0h0"); await S.run(1000);
  assert.equal(black.net.game().moves.length, 5, "接著下，沒有重複也沒有漏步");
  assert.equal(B.log.filter(x => x.topic === `${ROOT}/g/${gid}/s` && JSON.parse(x.payload).moves.length === 4).length >= 1, true);
  noErrors(S);
});

test("② App 被關掉再打開（P19.3 中斷恢復）：記得在下哪一盤，連上後從保留訊息接回棋局、還是同一方", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(1000); move(black, "h7e7"); await S.run(1000);
  const storage = black.storage, want = core(black.net.game());
  black.close(); await S.run(1000);
  move(red, "h0g2"); await S.run(1000);                    // 黑方關著 App 時紅方走了
  const again = phone(S, B, { id: black.id, name: "乙", storage, idb: black.idb, hash: "#/pvp" });   // 同一支手機：localStorage、IndexedDB（簽章金鑰）都還在
  assert.equal(again.net.game(), null);
  again.net.start();
  assert.ok(await S.until(() => !!again.net.game(), 10000), "重開後拿回對局");
  assert.equal(again.net.side(), "b", "還是黑方");
  assert.equal(again.net.game().moves.length, want.moves.length + 1, "包含關著時對方走的那一步");
  assert.deepEqual(core(again.net.game()), core(red.net.game()));
  move(again, "h9g7"); await S.run(1000);
  assert.equal(red.net.game().moves.length, 4);
  noErrors(S);
});

/* ================= ③ 棋鐘競逐 ================= */
/* 紅方走第一步；黑方走第二步時把「黑→紅」的傳送延遲 lag 毫秒（紅方比較晚收到、紅方自己的鐘晚開始算）。
   黑方的手機滿 3 分鐘判紅方超時的那一刻，紅方剛好落子：兩份狀態 rev 一樣、在路上交錯 */
async function flagRace(lag) {
  const { S, B } = world(), g = await startGame(S, B), { red, black, gid } = g;
  move(red, "h2e2"); await S.run(1000);
  red.lag = lag; move(black, "h7e7"); await S.run(100); red.lag = 0;
  assert.ok(await S.until(() => red.net.game().moves.length === 2, lag + 2000));
  assert.ok(await S.until(() => !!(black.net.game() && black.net.game().result), 200000), "黑方的手機要判紅方超時");
  assert.equal(black.net.game().result.timeout, true);
  assert.equal(red.net.game().result, null, "紅方還沒收到");
  move(red, "h0g2");                                 // 同一毫秒紅方落子
  await S.run(5000);
  const pubs = () => B.log.filter(x => x.topic === `${ROOT}/g/${gid}/s`).length, n0 = pubs();
  await S.run(60000);
  return { S, B, red, black, gid, pubs: pubs() - n0 };
}
test("③ flagRace：紅方落子時自己還剩 ≥5 秒（黑方手機收訊慢、判早了）→ 雙方都承認落子、撤回黑方記的勝場", async () => {
  const { S, B, red, black, gid, pubs } = await flagRace(9000);
  const r = core(red.net.game()), b = core(black.net.game());
  assert.deepEqual(r, b, "兩支手機同一個結果");
  assert.equal(r.result, null, "落子算數，棋局繼續");
  assert.equal(r.moves.length, 3);
  assert.deepEqual(core(B.game(gid)), r, "伺服器保留的也是這份");
  assert.equal(black.hist().length, 0, "黑方先記的超時勝要撤回");
  assert.equal(red.hist().length, 0);
  assert.equal(pubs, 0, "收斂後不會互相一直重送");
  noErrors(S);
});
test("③ flagRace：紅方落子時只剩不到 5 秒 → 落旗優先，雙方都判紅方超時負，積分各記一次", async () => {
  const { S, B, red, black, gid, pubs } = await flagRace(1000);
  const r = core(red.net.game()), b = core(black.net.game());
  assert.deepEqual(r, b, "兩支手機同一個結果");
  assert.equal(r.result && r.result.timeout, true);
  assert.equal(r.result.w, "b");
  assert.equal(r.moves.length, 2, "超時後那一步不算");
  assert.deepEqual(core(B.game(gid)), r);
  assert.deepEqual(red.hist().map(h => h.res), ["l"]);
  assert.deepEqual(black.hist().map(h => h.res), ["w"]);
  assert.equal(pubs, 0, "收斂後不會互相一直重送");
  noErrors(S);
});

/* ================= ④ 重連風暴 ================= */
test("④ 伺服器掛掉 10 分鐘：重試間隔加倍、最多 60 秒（以前每 3 秒一次＝200 次）；恢復後 72 秒內連回；穩定後再斷，約 0.8 秒就重連", async () => {
  const { S, B } = world(), A = phone(S, B, { id: "aaaa1111", name: "甲" });
  A.net.start(); await S.run(120000); assert.equal(A.net.status(), "up");
  const a0 = B.attempts.length;
  B.down(); await S.run(600000);
  const at = B.attempts.slice(a0).map(x => x.at), gaps = at.slice(1).map((t, i) => t - at[i]);
  assert.ok(at.length >= 8 && at.length <= 18, "10 分鐘重試 " + at.length + " 次（應在 8～18 次）");
  assert.ok(at[0] - (T0 + 120000) <= 800 * 1.2 + 100, "穩定連線後第一次斷線很快重連");
  for (let i = 1; i < gaps.length; i++) assert.ok(gaps[i] >= gaps[i - 1] * 0.6, "間隔大致越來越長：" + gaps.join(","));
  assert.ok(Math.max(...gaps) <= 60000 * 1.2 + 100, "最長不超過 72 秒：" + gaps.join(","));
  B.up = true; const t1 = S.now;
  assert.ok(await S.until(() => A.net.status() === "up", 75000), "伺服器恢復後 72 秒內連回");
  await S.run(90000);                                      // 穩定連線 60 秒以上：失敗次數歸零
  const a1 = B.attempts.length, t2 = S.now; B.kick(A);
  assert.ok(await S.until(() => B.attempts.length > a1, 5000));
  assert.ok(await S.until(() => A.net.status() === "up", 5000));
  assert.ok(B.attempts[a1].at - t2 <= 800 * 1.2 + 100, "穩定連線後斷線，照舊約 0.8 秒重連");
  assert.ok(t1 > 0);
  noErrors(S);
});

test("④ 連上就被踢（伺服器限流、帳號被擋）：5 分鐘內不會重連幾百次", async () => {
  const { S, B } = world(), A = phone(S, B, { id: "aaaa1111", name: "甲" });
  B.flapMs = 200; A.net.start(); await S.run(300000);
  assert.ok(B.attempts.length <= 12, "5 分鐘連了 " + B.attempts.length + " 次（以前約 300 次）");
  B.flapMs = 0; assert.ok(await S.until(() => A.net.status() === "up" && S.now, 80000));
  noErrors(S);
});

test("④ 手機說「網路恢復」（online 事件）：舊連線真的關掉，伺服器上只剩一條，邀請不會跳兩次", async () => {
  const { S, B } = world();
  const A = phone(S, B, { id: "aaaa1111", name: "甲" }), O = phone(S, B, { id: "cccc3333", name: "丙" });
  A.net.start(); O.net.start(); await S.run(3000);
  const old = A.sockets[A.sockets.length - 1];
  A.fire("online"); await S.run(3000);
  assert.equal(old.readyState, 3, "舊的 WebSocket 要關掉");
  assert.equal(A.net.status(), "up");
  assert.equal(B.connsOf(A).length, 1, "伺服器上只剩一條甲的連線");
  let n = 0; A.net.on("invite", () => n++);
  O.net.invite({ id: "aaaa1111", name: "甲" }); await S.run(1000);
  assert.equal(n, 1, "邀請只跳一次");
  assert.ok(B.retained.get(`${ROOT}/u/aaaa1111`), "舊連線的遺囑清掉在線狀態後要自己補回來");
  noErrors(S);
});

/* ================= ⑤ 同一個 rev、內容不同（缺陷 d 已修） ================= */
/* 開一盤（加一位觀眾），pre 先下幾步，act 讓紅黑兩邊在同一毫秒各改一次，然後等收斂 */
async function sameTime(o) {
  const { S, B } = world(), g = await startGame(S, B, o.tc ? { tc: o.tc } : null), { red, black, gid } = g;
  const W = phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); W.net.start(); await S.run(1500); W.net.watch(gid); await S.run(1500);
  assert.ok(W.net.game(), "觀眾要拿到對局");
  if (o.pre) await o.pre(g, S);
  const n0 = B.log.length;
  await o.act(g, S); await S.run(o.settle || 10000);
  return { S, B, red, black, W, gid, n0 };
}
/* 兩支手機、觀眾、伺服器保留的都是同一份；不會雙方都記勝；收斂後一分鐘內不再重送 */
async function agreed(t) {
  const r = core(t.red.net.game());
  for (const P of [t.red, t.black, t.W]) assert.equal(P.net.signState(), "signed", "這幾盤都是簽名局：裁決、轉送都要過驗簽");
  assert.deepEqual(core(t.black.net.game()), r, "紅黑兩支手機同一份");
  assert.deepEqual(core(t.W.net.game()), r, "觀眾也是同一份");
  assert.deepEqual(core(t.B.game(t.gid)), r, "伺服器保留的也是這份");
  assert.ok(!(t.red.hist().some(h => h.res === "w") && t.black.hist().some(h => h.res === "w")), "不能雙方都記勝");
  const pubs = () => t.B.log.filter(x => x.topic === `${ROOT}/g/${t.gid}/s`).length, k = pubs(); await t.S.run(60000);
  assert.equal(pubs(), k, "收斂後不會互相一直重送");
  return core(t.red.net.game());
}
const opening = async (g, S) => { move(g.red, "h2e2"); await S.run(1000); move(g.black, "h7e7"); await S.run(1000) };

test("⑤ 落子 vs 提和（同一毫秒）：落子優先，提和作廢，棋局繼續；之後照常判超時，只有一方記勝", async () => {
  const t = await sameTime({ pre: opening, act: g => { move(g.red, "h0g2"); g.black.net.update(n => { n.draw = "b" }) } });
  const r = await agreed(t);
  assert.equal(r.moves.length, 3); assert.equal(r.draw, null); assert.equal(r.result, null);
  await t.S.run(200000);                                     // 黑方一直不走：紅方的手機判黑方超時
  const e = await agreed(t);
  assert.equal(e.result && e.result.w, "r");
  assert.deepEqual(t.red.hist().map(h => h.res), ["w"]); assert.deepEqual(t.black.hist().map(h => h.res), ["l"]);
  noErrors(t.S);
});
test("⑤ 落子 vs 悔棋（黑方悔自己上一步的同時紅方已經回應）：落子優先，悔棋不算", async () => {
  const t = await sameTime({ pre: opening, act: g => { move(g.red, "h0g2"); g.black.net.update(n => { n.moves.pop(); n.draw = null }) } });
  const r = await agreed(t);
  assert.equal(r.moves.length, 3, "三步都在"); assert.equal(r.result, null);
  noErrors(t.S);
});
test("⑤ 認輸 vs 落子：有結果的優先，雙方都判黑方認輸，積分各記一次", async () => {
  const t = await sameTime({ pre: opening, act: g => { move(g.red, "h0g2"); g.black.net.update(n => { n.result = { w: "r", why: "黑方認輸" } }) } });
  const r = await agreed(t);
  assert.equal(r.result.w, "r"); assert.equal(r.moves.length, 2, "認輸那一刻的棋步為準");
  assert.deepEqual(t.red.hist().map(h => h.res), ["w"]); assert.deepEqual(t.black.hist().map(h => h.res), ["l"]);
  noErrors(t.S);
});
test("⑤ 同意和棋 vs 落子：紅方提和後又落子、黑方同時按同意 → 和棋成立（有結果的優先），雙方都記和", async () => {
  const t = await sameTime({ pre: async (g, S) => { await opening(g, S); g.red.net.update(n => { n.draw = "r" }); await S.run(1000) },
    act: g => { move(g.red, "h0g2"); g.black.net.update(n => { n.result = { w: null, why: "雙方同意和棋" }; n.draw = null }) } });
  const r = await agreed(t);
  assert.equal(r.result.w, null); assert.equal(r.moves.length, 2);
  assert.deepEqual(t.red.hist().map(h => h.res), ["d"]); assert.deepEqual(t.black.hist().map(h => h.res), ["d"]);
  noErrors(t.S);
});
test("⑤ 兩邊同時判超時（5 分鐘棋鐘用完：紅方自己落子時發現、黑方的手機也判）：只有一個結果，紅負黑勝各記一次", async () => {
  const t = await sameTime({ tc: 5, settle: 15000, act: async (g, S) => {
    assert.equal(g.red.net.game().tc, 5);
    await S.run(170000); move(g.red, "h2e2"); await S.run(1000); move(g.black, "h7e7"); await S.run(500);
    g.red.lag = 3000; g.black.lag = 3000;                // 兩邊都收得慢：各自判，訊息在路上交錯
    assert.ok(await S.until(() => g.red.net.clocks().r <= 0, 140000));
    move(g.red, "h0g2");                               // 紅方的手機：時間已用完，這步不算、直接判自己超時
  } });
  t.red.lag = 0; t.black.lag = 0;
  const r = await agreed(t);
  assert.equal(r.result.timeout, true); assert.equal(r.result.w, "b"); assert.equal(r.moves.length, 2);
  assert.deepEqual(t.red.hist().map(h => h.res), ["l"]); assert.deepEqual(t.black.hist().map(h => h.res), ["w"]);
  noErrors(t.S);
});

/* ================= ⑥ 切到背景主動下線（評審 P22.1，11/12） ================= */
test("⑥ 切到背景：短暫切走不下線；滿 60 秒主動下線（上線狀態馬上清掉、伺服器上不留連線、背景中不一直重連）；切回前景馬上重連、補回上線狀態", async () => {
  const { S, B } = world();
  const A = phone(S, B, { id: "aaaa1111", name: "甲" }), O = phone(S, B, { id: "cccc3333", name: "丙" });
  A.net.start(); O.net.start(); await S.run(3000);
  A.hide(); await S.run(30000);
  assert.equal(A.net.status(), "up", "切走 30 秒還連著");
  assert.ok(O.net.people().some(x => x.id === "aaaa1111"));
  await S.run(32000);
  assert.notEqual(A.net.status(), "up", "滿 60 秒主動下線");
  assert.equal(B.connsOf(A).length, 0, "伺服器上不留甲的連線");
  assert.equal(B.retained.has(`${ROOT}/u/aaaa1111`), false, "自己先清掉在線狀態");
  assert.equal(O.net.people().some(x => x.id === "aaaa1111"), false, "別人馬上看到甲離線（不用等伺服器 45 秒心跳逾時）");
  const a0 = B.attempts.length; await S.run(300000);
  assert.equal(B.attempts.length, a0, "背景中不會自己一直重連");
  A.show(); assert.ok(await S.until(() => A.net.status() === "up", 3000), "切回前景馬上重連");
  await S.run(3000);
  assert.ok(B.retained.get(`${ROOT}/u/aaaa1111`), "在線狀態補回");
  assert.ok(O.net.people().some(x => x.id === "aaaa1111"), "別人又看得到甲");
  noErrors(S);
});

test("⑥ 對局中切到背景：5 分鐘內不下線、照收對方的棋，回來接著下、不會被判輸；觀眾切走滿 60 秒下線，回來從保留訊息補上漏掉的棋步", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  const W = phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); W.net.start(); await S.run(1500); W.net.watch(gid); await S.run(1500);
  move(red, "h2e2"); await S.run(1000); move(black, "h7e7"); await S.run(1000);
  black.hide(); W.hide(); await S.run(50000);
  move(red, "h0g2"); await S.run(20000);
  assert.equal(black.net.status(), "up", "下棋中切走 70 秒仍連著");
  assert.equal(black.net.game().moves.length, 3, "背景中照收對方的棋");
  assert.equal(red.net.oppOnline(), true, "紅方看到黑方還在");
  assert.notEqual(W.net.status(), "up", "觀眾（沒在下棋）滿 60 秒下線");
  black.show(); await S.run(1000); move(black, "h9g7"); await S.run(2000);
  assert.equal(red.net.game().moves.length, 4); assert.equal(red.net.game().result, null, "沒有人被判輸");
  W.show(); assert.ok(await S.until(() => W.net.status() === "up" && W.net.game().moves.length === 4, 5000), "觀眾回來補上背景中漏掉的兩步");
  assert.deepEqual(core(W.net.game()), core(red.net.game()));
  black.hide(); await S.run(4 * 60000);
  assert.equal(black.net.status(), "up", "輪到紅方時黑方在背景 4 分鐘：還連著");
  await S.run(70000);
  assert.notEqual(black.net.status(), "up", "下棋中在背景滿 5 分鐘才下線");
  assert.equal(B.connsOf(black).length, 0);
  black.show(); assert.ok(await S.until(() => black.net.status() === "up", 3000));
  await S.run(3000);
  assert.deepEqual(core(black.net.game()), core(red.net.game()), "回來以後跟紅方同一份（紅方 3 分鐘沒走，黑方的手機照規則判超時；以保留狀態為準）");
  noErrors(S);
});
