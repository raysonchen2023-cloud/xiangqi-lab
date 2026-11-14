// 評比第 16 輪第 5 項（開發者選「先隔離無法驗證的競技結果」）：
//   ①棋鐘可信度不足時，雙方一致轉為「不計分」（威脅模型 T11；src/net.js 的 NS 區段：ns 標記、nsClock、nsAdd、record 的 scoreGate）
//   ②虛擬棋客改由可信端（裁判台）簽署；簽署完成前，相關計分入口一律關閉（威脅模型 T9、S8；tools/cup-host.js 的 botSigner、lobby-bots.js 的 cupSign）
// 證據要求：情境 A、A2、B（照 rounds/r15/redblue/repro-lft-override.js 的命名）、冒充棋客、重放攻擊都不能改動正式積分（每支手機的 xq_rate＝rating()、hist()），
//   另附誠實弱網對照（老實玩家不會被誤判成不計分）。完整弱網長測見 tools/net-longrun.js（不計分也要四方一致、誤判 0）。
// 全部用 tools/net-harness.js 的假 MQTT 伺服器＋假時鐘，vm 載入真正的 src/net.js；裁判台是真正的 cup-host.js（測試自己臨時產生一把裁判台金鑰，不碰開發者電腦上的金鑰）。
// 不連正式或測試伺服器、不開瀏覽器、不呼叫外部 API。
// 用法：node --test xiangqi-lab/tools/test-noscore.js
"use strict";
const { assert, test, fs, path, NET_SRC, C, ROOT, Sched, Broker, phone, J, MV, move, world, startGame, noErrors } = require("./net-harness.js");
const os = require("os"), crypto = require("crypto"), { webcrypto } = crypto;
/* 11/13 第 17 輪：公開的 source/ 沒有千秋盃裁判台 cup-host.js、大廳角色 lobby-bots.js（營運程式），那幾項標「略過」並寫原因；其他項（不計分、冒用角色代號）照跑 */
const CK = require("./cup-key.js"), startCup = (() => { try { return require("./cup-host.js") } catch (e) { if (e && e.code === "MODULE_NOT_FOUND") return null; throw e } })();
const PRIV = { skip: startCup && fs.existsSync(path.join(__dirname, "lobby-bots.js")) ? false : "要千秋盃裁判台 cup-host.js 和 lobby-bots.js（營運程式，不公開；開發者電腦上照跑）" };
const MIN = 60000;

/* ---------- 共用 ---------- */
/* 改過的 App 落子：跳過 tickMove（不扣自己的鐘），自己填 lft */
const forged = (P, m, lft) => P.net.update(n => { n.moves.push(typeof m === "string" ? MV(m) : m); n.lft = lft; n.lfN = n.moves.length; n.draw = null });
/* 照局面挑一步合法、不會直接結束的棋（固定挑法，可重現） */
function pick(moves, k) {
  const at = mv => { const st = { moves: [] }; C.stateRebuild(st); for (const [a, b] of mv) C.stateApply(st, a, b); return st };
  const st = at(moves), L = C.legal(st.board, st.turn).filter(m => { const T = at(moves.concat([m])); return !C.judgeState(T) && C.legal(T.board, T.turn).length > 0 });
  return L[(k * 7919 + 13) % L.length];
}
/* 正式積分＝這支手機的 rating()（積分、勝負和場數）＋戰績 hist() 的盤數 */
const score = P => { const r = P.net.rating(); return JSON.stringify({ pts: r.pts, w: r.w, l: r.l, d: r.d, n: P.hist().length }) };
/* 先正常下完一盤（計分，證明一般對局照常記），再「再來一局」（紅黑交換）；回傳新的紅、黑和一位觀眾 */
async function arena(o) {
  const { S, B } = world(), g = await startGame(S, B, o);
  const V = phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); V.net.start(); await S.run(2000); V.net.watch(g.gid); await S.run(2000);
  move(g.red, "h2e2"); await S.run(2000); move(g.black, "h7e7"); await S.run(2000);
  g.black.net.update(n => { n.result = { w: "r", why: "黑方認輸" }; n.draw = null }); await S.run(3000);
  assert.deepEqual([g.red.hist().length, g.black.hist().length], [1, 1], "第一盤（老實下完）照常計分");
  g.red.net.update(n => { const t = n.red; n.red = n.black; n.black = t; n.moves = []; n.result = null; n.draw = null; n.id = "rm001" }); await S.run(3000);
  const red = g.A.net.side() === "r" ? g.A : g.K, black = red === g.A ? g.K : g.A;
  assert.equal(black.net.side(), "b"); assert.equal(V.net.game().id, "rm001", "觀眾跟到再來一局");
  return { S, B, V, red, black, gid: g.gid };
}
async function opening(W) { move(W.red, "h2e2"); await W.S.run(2000); move(W.black, "h7e7"); await W.S.run(2000) }
const four = W => [W.red.net.game(), W.black.net.game(), W.V.net.game(), W.B.game(W.gid)];
function sameNs(W, why) {
  const v = four(W), z = J(v[1].ns || null);
  assert.ok(z && z.why === why, "黑方這盤是不計分（" + why + "）：" + JSON.stringify(z));
  for (const g of v) assert.deepEqual(J(g.ns || null), z, "紅、黑、觀眾、伺服器保留的都是同一個不計分標記");
  assert.equal(new Set(v.map(g => JSON.stringify([g.id, g.moves, g.result || null]))).size, 1, "四方棋局一字不差");
  return z;
}

/* ================= 棋鐘可信度不足 → 雙方一致「不計分」 ================= */
test("情境 A：改過的 App 斷線 12 分鐘、回來自報 lft 2 分鐘推翻判超時——紅、黑、觀眾、伺服器一致不計分；黑方先記的勝場撤回，雙方正式積分都沒變", async () => {
  const W = await arena(); await opening(W);
  const s0 = [score(W.red), score(W.black)];
  W.red.offline(); await W.S.run(12 * MIN);
  assert.ok(W.black.net.game().result && W.black.net.game().result.timeout, "黑方照規則判紅方超時"); assert.notEqual(score(W.black), s0[1], "黑方先記了這盤的勝場");
  forged(W.red, "h0g2", 2 * MIN); W.red.online(); W.red.fire("online"); await W.S.run(2 * MIN);
  const z = sameNs(W, "late"); assert.equal(z.s, "b", "等的那一方（黑方）宣告"); assert.equal(z.n, 3);
  assert.equal(W.black.net.game().result, null, "棋盤照 flagTie 收斂（不分岔），棋照樣下");
  assert.deepEqual([score(W.red), score(W.black)], s0, "雙方正式積分回到這盤之前");
  /* 之後不管怎麼結束都不計分：紅方（攻擊的人）「贏」了也一樣 */
  move(W.black, "h9g7"); await W.S.run(3000); W.black.net.update(n => { n.result = { w: "r", why: "黑方認輸" }; n.draw = null }); await W.S.run(5000);
  for (const g of four(W)) assert.ok(g.result && g.result.w === "r" && g.ns, "結果、不計分標記四方一致");
  assert.deepEqual([score(W.red), score(W.black)], s0, "紅方『贏了』也不改積分");
  assert.deepEqual(J(W.black.net.notes()).map(e => e.k), ["ns"], "黑方的對局紀錄寫「不計分」"); assert.equal(J(W.red.net.notes())[0].by, "opp");
  for (const P of [W.red, W.black, W.V]) assert.equal(P.net.suspicious().length, 0, P.tag + " 沒有可疑事件");
  noErrors(W.S);
});

test("情境 A2：同上，但自報 lft 只填 5 秒（晚到不到 10 分鐘，以前只提示）——照樣一致不計分、積分不變", async () => {
  const W = await arena(); await opening(W);
  const s0 = [score(W.red), score(W.black)];
  W.red.offline(); await W.S.run(12 * MIN);
  forged(W.red, "h0g2", 5000); W.red.online(); W.red.fire("online"); await W.S.run(2 * MIN);
  const z = sameNs(W, "late"); assert.ok(z.v >= 500 && z.v < 600, "量到這步比每步 3 分鐘晚了 " + z.v + " 秒");
  assert.deepEqual([score(W.red), score(W.black)], s0);
  /* A2 的變形：只晚到剛好超過門檻（離線 6.5 分鐘）也一樣 */
  const W2 = await arena(); await opening(W2); const t0 = [score(W2.red), score(W2.black)];
  W2.red.offline(); await W2.S.run(6.5 * MIN); forged(W2.red, "h0g2", 5000); W2.red.online(); W2.red.fire("online"); await W2.S.run(2 * MIN);
  sameNs(W2, "late"); assert.deepEqual([score(W2.red), score(W2.black)], t0);
  noErrors(W.S); noErrors(W2.S);
});

/* 黑方（老實的一方）照局面挑一步走 */
const honest = (P, k) => P.net.update(n => { if (P.net.tickMove(n, P.net.side()) === false) return; n.moves.push(pick(n.moves, k)); n.draw = null });
async function runB(W, think, deduct, maxMoves) {
  let k = 0;
  for (; k < maxMoves && !W.black.net.game().ns; k++) {
    await W.S.run(think);
    const m = pick(W.red.net.game().moves, k);
    W.red.net.update(n => { if (deduct && n.clk) n.clk.r = Math.max(1, n.clk.r - Math.round(think * deduct)); n.moves.push(m); n.lft = 30000; n.lfN = n.moves.length; n.draw = null });
    await W.S.run(3000); if (W.black.net.game().ns) break;
    honest(W.black, k + 101); await W.S.run(3000);
  }
  return k + 1;
}

test("情境 B（每方 5 分鐘）：改過的 App 每步想 150 秒、鐘一毫秒都不扣——照黑方自己量的，紅方的時間早用完了：一致不計分、積分不變", async () => {
  const W = await arena({ tc: 5 }); await opening(W);
  const s0 = [score(W.red), score(W.black)], clk0 = W.black.net.game().clk.r;
  const n = await runB(W, 150000, 0, 12);
  assert.equal(W.black.net.game().clk.r, clk0, "紅方的鐘真的一毫秒都沒扣（攻擊照做）");
  const z = sameNs(W, "clock"); assert.ok(n <= 5, "第 " + n + " 步就發現"); assert.ok(z.v > 180, "照黑方量的，紅方超時 " + z.v + " 秒");
  W.black.net.update(n => { n.result = { w: "r", why: "黑方認輸" }; n.draw = null }); await W.S.run(5000);
  assert.deepEqual([score(W.red), score(W.black)], s0, "紅方『贏了』也不改積分");
  noErrors(W.S);
});

test("情境 B（每方 30 分鐘，repro 原本的設定）：每步想 150 秒、鐘不扣，想到超過 30 分鐘＋3 分鐘時不計分；鐘只扣一半的改法也一樣", async () => {
  for (const deduct of [0, 0.5]) {
    const W = await arena(); await opening(W);
    const s0 = [score(W.red), score(W.black)];
    const n = await runB(W, 150000, deduct, 40);
    const z = sameNs(W, "clock"); const real = n * 150;
    assert.ok(real > 30 * 60 && real < 30 * 60 + 12 * 60, (deduct ? "扣一半：" : "不扣：") + "紅方實際想了 " + real + " 秒才被發現（30 分鐘＋寬限）");
    assert.ok(W.black.net.shadow().ex > 0, "影子鐘有記");
    W.red.net.update(n => { n.result = { w: "b", why: "紅方認輸" }; n.draw = null }); await W.S.run(5000);
    assert.deepEqual([score(W.red), score(W.black)], s0, "結束後雙方積分都沒變");
    noErrors(W.S);
  }
});

test("對照：老實的一方用掉大部分時間（每方 5 分鐘、每步想 45 秒、每段多 1.5 秒延遲）不會被當成棋鐘不可信；時間用完照規則判負、照常計分", async () => {
  const W = await arena({ tc: 5 }); W.red.lag = 1500; W.black.lag = 1500; await opening(W);
  const s0 = [score(W.red), score(W.black)];
  for (let k = 0; k < 12 && !W.black.net.game().result; k++) { await W.S.run(45000); honest(W.red, k); await W.S.run(4000); if (W.black.net.game().result) break; honest(W.black, k + 101); await W.S.run(4000) }
  await W.S.run(10000);
  const g = W.black.net.game(); assert.ok(g.result && g.result.timeout && g.result.w === "b", "紅方自己的鐘用完：照規則判負 " + JSON.stringify(g.result));
  for (const x of four(W)) assert.equal(x.ns || null, null, "沒有不計分");
  assert.notDeepEqual([score(W.red), score(W.black)], s0, "照常計分"); assert.equal(W.black.hist()[0].res, "w"); assert.equal(W.red.hist()[0].res, "l");
  noErrors(W.S);
});

test("誠實弱網對照：落子後斷線、這步 4 分鐘或 5.5 分鐘才送到（黑方已判超時、被推翻）都不會不計分，照常下完、照常計分；超過 6 分鐘才到＝不計分（不算輸、誰都不扣分）", async () => {
  for (const off of [4, 5.5]) {
    const W = await arena(); await opening(W);
    W.red.offline(); await W.S.run(10000); move(W.red, "h0g2"); await W.S.run(off * MIN - 10000);
    W.red.online(); W.red.fire("online"); await W.S.run(2 * MIN);
    for (const x of four(W)) { assert.equal(x.ns || null, null, "斷線 " + off + " 分鐘：沒有不計分"); assert.equal(x.moves.length, 3) }
    move(W.black, "h9g7"); await W.S.run(3000); W.red.net.update(n => { n.result = { w: "b", why: "紅方認輸" }; n.draw = null }); await W.S.run(5000);
    assert.equal(W.black.hist()[0].res, "w", "照常計分"); assert.equal(W.red.hist()[0].res, "l"); assert.equal(W.black.hist()[0].rid, "rm001");
    noErrors(W.S);
  }
  /* 老實玩家落子後斷線 7 分鐘才送到：照規則本來可以算他超時輸；現在是整盤一致不計分（兩邊積分都不動） */
  const W = await arena(); await opening(W); const s0 = [score(W.red), score(W.black)];
  W.red.offline(); await W.S.run(10000); move(W.red, "h0g2"); await W.S.run(7 * MIN - 10000); W.red.online(); W.red.fire("online"); await W.S.run(2 * MIN);
  sameNs(W, "late"); assert.deepEqual([score(W.red), score(W.black)], s0);
  noErrors(W.S);
});

/* ================= 重放、偽造、事後亂宣告 ================= */
test("重放：不計分以後，攻擊者把沒有不計分標記的舊狀態（他自己那步、黑方的判超時）換更大的 rev、附上自己的轉送簽名再送——黑方、觀眾、伺服器保留的都還是不計分", async () => {
  const W = await arena(); await opening(W);
  const s0 = [score(W.red), score(W.black)], T = `${ROOT}/g/${W.gid}/s`, msgs = [];
  W.B.publish = (orig => (t, p, r, from) => { if (t === T && p) msgs.push(p); return orig(t, p, r, from) })(W.B.publish);
  W.red.offline(); await W.S.run(12 * MIN); forged(W.red, "h0g2", 2 * MIN); W.red.online(); W.red.fire("online"); await W.S.run(2 * MIN);
  sameNs(W, "late");
  const old = msgs.map(s => JSON.parse(s)).filter(x => x.id === "rm001" && !x.ns);
  const mine = old.filter(x => x.moves.length === 3).pop(), flag = old.filter(x => x.result && x.result.timeout).pop();
  assert.ok(mine && flag, "抓得到舊的兩份");
  const keyR = W.red.idb.dbs.get("xqlab-sign").k.get("me");
  const hc = g => { const o = {}; for (const k in g) if (k !== "rev" && k !== "at" && k !== "sg" && k !== "rl") o[k] = g[k]; return JSON.stringify(o) };
  for (const x0 of [mine, flag]) {
    const x = J(x0), rev = W.B.game(W.gid).rev + 3; x.rev = rev; const l = { s: "r", r: rev, h: crypto.createHash("sha256").update(hc(x)).digest("base64url") };
    l.k = Buffer.from(await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, keyR.privateKey, Buffer.from(["xq-rel1", x.gid, x.id, l.r, l.s, l.h].join("|")))).toString("base64url"); x.rl = l;
    W.B.publish(T, JSON.stringify(x), true); await W.S.run(15000);
    for (const g of [W.black.net.game(), W.V.net.game(), W.B.game(W.gid)]) { assert.ok(g.ns && g.ns.why === "late", "還是不計分"); assert.equal(g.moves.length, 3) }
  }
  assert.deepEqual([score(W.red), score(W.black)], s0);
  noErrors(W.S);
});

test("偽造與事後亂宣告：第三者偽造的不計分（沒簽名、自己的金鑰冒簽）不收；認輸以後才宣告不計分不收——一般對局照常計分", async () => {
  const W = await arena(); await opening(W);
  const T = `${ROOT}/g/${W.gid}/s`;
  move(W.red, "h0g2"); await W.S.run(3000);
  /* ① 第三者：沒簽名 / 自己的金鑰冒簽成黑方 */
  const evil = await webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
  for (const signIt of [false, true]) {
    const x = J(W.B.game(W.gid)); x.rev += 2; x.ns = { s: "b", n: 3, why: "late", v: 999 }; delete x.rl;
    if (signIt) { const h = crypto.createHash("sha256").update((g => { const o = {}; for (const k in g) if (k !== "rev" && k !== "at" && k !== "sg" && k !== "rl") o[k] = g[k]; return JSON.stringify(o) })(x)).digest("base64url"); const e = { v: 1, s: "b", a: "ns", r: x.rev, h, p: x.sg.h }; e.k = Buffer.from(await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, evil.privateKey, Buffer.from(["xq-act1", x.gid, x.id, e.r, e.s, e.a, e.h, e.p].join("|")))).toString("base64url"); x.sg = e }
    W.B.publish(T, JSON.stringify(x), true); await W.S.run(10000);
  }
  for (const g of [W.red.net.game(), W.black.net.game(), W.V.net.game()]) assert.equal(g.ns || null, null, "偽造的不收");
  assert.ok(W.red.net.suspicious().length >= 2 && W.V.net.suspicious().length >= 2, "記成可疑事件");
  /* ② 黑方認輸以後，改過的 App 才宣告不計分（想把輸棋改成不計分） */
  W.black.net.update(n => { n.result = { w: "r", why: "黑方認輸" }; n.draw = null }); await W.S.run(5000);
  assert.equal(W.red.hist()[0].res, "w", "紅方記勝");
  W.black.net.update(n => { n.ns = { s: "b", n: 3, why: "late", v: 700 } }); await W.S.run(15000);
  assert.equal(W.red.net.game().ns || null, null, "紅方不收"); assert.equal(W.V.net.game().ns || null, null, "觀眾不收（這個動作不是他能做的）");
  assert.equal(W.red.hist()[0].res, "w", "紅方的勝場照算"); assert.equal(W.red.hist()[0].rid, "rm001");
  noErrors(W.S);
});

test("改過的 App 假裝舊版（邀請／接受不帶 nv）想躲掉不計分：這盤從頭就不計分，A 攻擊改不了老實那方的積分", async () => {
  const OLD = NET_SRC.split(",nv:ok&&PK?1:undefined}").join("}").split(",nv:PK?1:undefined}").join("}");
  assert.notEqual(OLD, NET_SRC);
  const { S, B } = world(), g = await startGame(S, B, { K: { src: OLD } });
  const honestP = g.A, cheat = g.K, s0 = score(honestP);
  assert.equal(honestP.net.signState(), "signed", "照樣是簽名局");
  const hr = honestP.net.side() === "r";
  if (hr) { move(honestP, "h2e2"); await S.run(2000) }
  const cs = cheat.net.side(); move(cheat, cs === "r" ? "h2e2" : "h7e7"); await S.run(2000);
  if (!hr) { move(honestP, "h7e7"); await S.run(2000) } else { move(honestP, "h9g7"); await S.run(2000) }
  cheat.offline(); await S.run(12 * MIN); forged(cheat, cs === "r" ? "h0g2" : "b9c7", 2 * MIN); cheat.online(); cheat.fire("online"); await S.run(2 * MIN);
  honestP.net.update(n => { n.result = { w: cs, why: "認輸" }; n.draw = null }); await S.run(5000);
  assert.equal(score(honestP), s0, "老實那方的積分沒變（對方不支援不計分標記＝這盤本來就不計分）");
  noErrors(S);
});

/* ================= 大廳角色（S8）：冒用角色代號的盤不計分 ================= */
test("冒用大廳角色的代號（sys/bots 名單上的）用自己的金鑰開簽名局：不計分（角色簽不了名，先關掉這個計分入口）；真人對真人照常", async () => {
  const { S, B } = world();
  B.publish(`${ROOT}/sys/bots`, JSON.stringify({ up: true, ids: ["botk0001"] }), true);
  const A = phone(S, B, { id: "botk0001", name: "冒充的角色" }), K = phone(S, B, { id: "bbbb2222", name: "乙" });
  A.net.start(); K.net.start(); await S.run(2000);
  let inv = null; K.net.on("invite", x => { inv = x }); A.net.invite({ id: K.id, name: "乙" }); await S.run(1000); assert.ok(inv); K.net.respond(inv, true); await S.run(2000);
  const red = A.net.side() === "r" ? A : K, black = red === A ? K : A;
  move(red, "h2e2"); await S.run(2000); move(black, "h7e7"); await S.run(2000);
  A.net.update(n => { n.result = { w: A.net.side() === "r" ? "b" : "r", why: "認輸" }; n.draw = null }); await S.run(4000);
  assert.ok(K.net.game().result, "這盤照樣下完"); assert.equal(K.hist().length, 0, "老實那方不記（對手是角色代號）");
  /* 對照：同一套流程、對手換成不在角色名單上的代號＝照常計分 */
  const A2 = phone(S, B, { id: "cccc3333", name: "丙" }); A2.net.start(); await S.run(2000);
  K.net.leave(); await S.run(1000); inv = null; A2.net.invite({ id: K.id, name: "乙" }); await S.run(1000); assert.ok(inv); K.net.respond(inv, true); await S.run(2000);
  const r2 = A2.net.side() === "r" ? A2 : K, b2 = r2 === A2 ? K : A2;
  move(r2, "h2e2"); await S.run(2000); move(b2, "h7e7"); await S.run(2000);
  A2.net.update(n => { n.result = { w: A2.net.side() === "r" ? "b" : "r", why: "認輸" }; n.draw = null }); await S.run(4000);
  assert.equal(K.hist().length, 1, "真人對真人照常計分"); assert.equal(K.hist()[0].oid, "cccc3333");
  noErrors(S);
});

/* ================= 千秋盃：虛擬棋客由裁判台代簽 ================= */
const HOST = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey, HPUB = CK.pubOf(HOST), LIVEK = CK.appKey(true);
const SRC = NET_SRC.split(LIVEK.x).join(HPUB.x).split(LIVEK.y).join(HPUB.y), td = new TextDecoder();
function match(f, t) { const F = f.split("/"), T = t.split("/"); for (let i = 0; i < F.length; i++) { if (F[i] === "#") return true; if (i >= T.length) return false; if (F[i] !== "+" && F[i] !== T[i]) return false } return F.length === T.length }
function hostMqtt(S, B) {
  return () => {
    const me = { up: false, onup: null, onmsg: null, ondown: null };
    const c = { id: "host", P: { netOk: true, lag: 0, tag: "host" }, subs: new Set(), alive: true, nextAt: 0, lastRx: Infinity, keepalive: 1e9,
      ws: { readyState: 1, onmessage: e => { const u = new Uint8Array(e.data); if ((u[0] >> 4) !== 3) return; let i = 1, d; do { d = u[i++] } while (d & 128); const L = (u[i] << 8) | u[i + 1]; me.onmsg && me.onmsg(td.decode(u.subarray(i + 2, i + 2 + L)), td.decode(u.subarray(i + 2 + L))) } } };
    me.pub = (t, p, r) => { B.publish(t, p, r, c); return true };
    me.sub = ts => { for (const f of ts) { c.subs.add(f); for (const [t, p] of B.retained) if (match(f, t)) S.add(() => me.onmsg && me.onmsg(t, p), B.lat, 0, "host") } };
    me.unsub = ts => { for (const f of ts) c.subs.delete(f) };
    S.add(() => { B.conns.add(c); me.up = true; me.onup && me.onup() }, B.lat, 0, "host");
    return me;
  };
}
/* 虛擬棋客：照 lobby-bots.js 的 update／pubGame（新動作先拿掉 sg、rl、hs，記上一份 _b，交給裁判台給的 cupSign 簽；簽不出來就不送） */
function fakeBot(W, id, name) {
  const b = { id, name, on: true, cli: { up: true }, d: { pts: 300 }, cupBusy: true, cupSign: null, G: null, gid: null,
    cupEnter(gid, sign) { this.gid = gid; this.cupSign = typeof sign === "function" ? sign : null },
    update(fn) {
      const T = `${ROOT}/g/${this.gid}/s`; this.G = JSON.parse(W.B.retained.get(T));
      const n = JSON.parse(JSON.stringify(this.G)); fn(n); delete n.sg; delete n.rl; delete n.hs; Object.defineProperty(n, "_b", { value: this.G, configurable: true });
      n.rev = Math.max(this.G.rev, W.H.priv().games[this.gid].G.rev) + 1; n.at = W.S.now;
      const s = this.cupSign && this.cupSign.gid === n.gid ? this.cupSign(n) : null; if (s != null) W.B.publish(T, s, true); this.G = n; return s
    } };
  return b;
}
let tmpN = 0;
async function cupWorld() {
  const S = Sched(Date.now()), B = Broker(S), logs = [], people = {}, BOTS = [];
  const W = { S, B, logs, people, BOTS };
  BOTS.push(fakeBot(W, "botq0001", "棋客甲"), fakeBot(W, "botq0002", "棋客乙"));
  W.H = startCup({ ROOT, URL: "fake", mqtt: hostMqtt(S, B), BOTS, people, isHuman: id => !/^bot/.test(id), alive: x => !!x, C, log: (...a) => logs.push(a.join(" ")), LIVE: false, DBDIR: fs.mkdtempSync(path.join(os.tmpdir(), "xq-noscore-" + (++tmpN) + "-")), argv: ["--cup-fast"], hex: n => crypto.randomBytes(n).toString("hex"), key: HOST, noTimers: true });
  await S.run(100); W.H.tick(); await S.run(500);
  W.phone = async (id, name) => { const P = phone(S, B, { id, name, src: SRC, hash: "#/cup" }); P.net.start(); await S.run(2500); const u = B.retained.get(`${ROOT}/u/${id}`); if (u) people[id] = JSON.parse(u); return P };
  return W;
}
/* 真人 P 對棋客 b 開一盤（mk 場次）；回傳 gid、主題、雙方座位 */
async function cupVsBot(W, P, b, mk) {
  const S0 = W.H.state(); S0.ph = "play"; S0.m = S0.m || {}; S0.order = S0.order || [];
  S0.m[mk] = { id: mk, r: 1, i: +mk.split("-")[1], a: { id: P.id, name: "甲", pts: 0, bot: false, seed: 1 }, b: { id: b.id, name: b.name, pts: 300, bot: true, seed: 16 }, g: [], sc: [0, 0], st: "wait", w: null, why: "", gid: null, done: 0 }; S0.order.push(mk);
  W.H.startGame(S0.m[mk], false); await W.S.run(1000);
  const gid = W.H.state().m[mk].gid, T = `${ROOT}/g/${gid}/s`, G0 = JSON.parse(W.B.retained.get(T));
  return { gid, T, G0, ps: G0.red.id === P.id ? "r" : "b", bs: G0.red.id === b.id ? "r" : "b" };
}
const cmv = (P, k) => P.net.update(n => { P.net.tickMove(n, P.net.side()); n.moves.push(pick(n.moves, k)); n.draw = null });
const actBad = P => P.net.cupBad().act;

test("千秋盃虛擬棋客由裁判台代簽：開局寫棋客座位的一次性公開金鑰（sv 2）；棋客的棋步、認輸有簽名，真人、觀眾、裁判台都收；簽好名的盤照常計分", PRIV, async () => {
  const W = await cupWorld(), A = await W.phone("aaaa1111", "甲"), V = await W.phone("wwww9999", "觀眾"), bot = W.BOTS[0];
  A.net.cupReq("reg"); await W.S.run(1500);
  const { gid, T, G0, ps, bs } = await cupVsBot(W, A, bot, "1-0");
  assert.equal(G0.cup.sv, 2, "簽名版本 2：棋客座位也有金鑰"); const bpk = G0[bs === "r" ? "red" : "black"].pk;
  assert.ok(bpk && bpk === W.H.botPk(gid, bot.id), "棋客座位的公開金鑰是裁判台這盤產生的"); assert.ok(typeof bot.cupSign === "function" && bot.cupSign.gid === gid, "裁判台把代簽函式交給棋客");
  const z = W.H.state().m["1-0"].g[0]; assert.equal(z[bs === "r" ? "rpk" : "bpk"], bpk, "名單也寫（中途才進來的觀眾照這個認證）");
  assert.ok(!W.logs.some(l => /PRIVATE|BEGIN|privateKey/.test(l)), "日誌沒有印出私鑰");
  for (const P of [A, V]) { P.net.watch(gid); await W.S.run(1500) }
  for (let k = 0; k < 6; k++) { const g = A.net.game(), turn = g.moves.length % 2 ? "b" : "r"; if (turn === ps) cmv(A, k); else bot.update(n => { n.moves.push(pick(n.moves, k)); n.draw = null }); await W.S.run(1500) }
  for (const P of [A, V]) assert.equal(P.net.game().moves.length, 6, P.tag + "：棋客簽好名的棋步照收");
  assert.ok(JSON.parse(W.B.retained.get(T)).sg, "保留的狀態有簽名");
  bot.update(n => { n.result = { w: ps, why: "棋客認輸" }; n.draw = null }); await W.S.run(2000);
  for (const P of [A, V]) assert.equal(P.net.game().result && P.net.game().result.w, ps, P.tag + " 收到棋客認輸");
  assert.equal(W.H.state().m["1-0"].w, A.id, "裁判台記真人勝"); assert.equal(W.H.actBad().n, 0, JSON.stringify(W.H.actBad()));
  for (const P of [A, V]) { assert.equal(actBad(P), 0, P.tag); assert.equal(P.net.suspicious().length, 0, P.tag) }
  assert.equal(A.hist().length, 1, "雙方座位都有裁判台認證的金鑰＝照常計分"); assert.equal(A.hist()[0].res, "w");
  noErrors(W.S);
});

test("冒充棋客、重放：沒簽名的棋客認輸、用自己的金鑰冒簽、把棋客在別盤的真簽名搬過來、把棋客舊的那步換更大的 rev 重送——真人、觀眾、裁判台都不收，積分和賽果都不變", PRIV, async () => {
  const W = await cupWorld(), A = await W.phone("aaaa1111", "甲"), K = await W.phone("bbbb2222", "乙"), V = await W.phone("wwww9999", "觀眾"), bot = W.BOTS[0], bot2 = W.BOTS[1];
  A.net.cupReq("reg"); await W.S.run(1500); K.net.cupReq("reg"); await W.S.run(1500);
  const g1 = await cupVsBot(W, A, bot, "1-0"), g2 = await cupVsBot(W, K, bot2, "1-1");
  for (const P of [A, V]) { P.net.watch(g1.gid); await W.S.run(1500) } K.net.watch(g2.gid); await W.S.run(1500);
  for (let k = 0; k < 4; k++) { const g = A.net.game(), turn = g.moves.length % 2 ? "b" : "r"; if (turn === g1.ps) cmv(A, k); else bot.update(n => { n.moves.push(pick(n.moves, k)); n.draw = null }); await W.S.run(1500) }
  const oldBot = JSON.parse(JSON.stringify(W.B.log.filter(e => e.topic === g1.T && /"s":"/.test(e.payload) && JSON.parse(e.payload).sg && JSON.parse(e.payload).sg.s === g1.bs).map(e => JSON.parse(e.payload))[0]));
  const s0 = score(A), m0 = J(W.H.state().m["1-0"]), live = () => JSON.parse(W.B.retained.get(g1.T)), next = () => Math.max(live().rev, W.H.priv().games[g1.gid].G.rev) + 1;
  const quiet = why => { for (const P of [A, V]) { const g = P.net.game(); assert.equal(g.result, null, P.tag + " " + why); assert.equal(g.moves.length, 4, P.tag + " " + why) } assert.equal(W.H.priv().games[g1.gid].G.result, null, "裁判台 " + why); assert.equal(W.H.state().m["1-0"].st, "live") };
  const resign = () => { const x = live(); x.rev = next(); x.result = { w: g1.ps, why: "棋客認輸" }; x.draw = null; delete x.hs; delete x.rl; return x };
  const hb = W.H.actBad().n, vb = actBad(V);
  /* ① 沒簽名（以前沒金鑰的座位就是這樣收的） */
  { const x = resign(); delete x.sg; W.B.publish(g1.T, JSON.stringify(x), true); await W.S.run(1500); quiet("沒簽名的棋客認輸") }
  /* ② 自己的金鑰冒簽成棋客座位 */
  { const evil = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey, x = resign(), hc = CK.hcCup ? null : null;
    const h = crypto.createHash("sha256").update((g => { const o = {}; for (const k in g) if (k !== "rev" && k !== "at" && k !== "sg" && k !== "rl") o[k] = g[k]; return JSON.stringify(o) })(x)).digest("base64url");
    const e = { v: 1, s: g1.bs, a: "resign", r: x.rev, h, p: live().sg ? live().sg.h : "" }; e.k = crypto.sign("sha256", Buffer.from(["xq-cupa1", ROOT, x.cup.wk, x.cup.m, x.cup.g, x.gid, x.id, e.r, e.s, e.a, e.h, e.p].join("|")), { key: evil, dsaEncoding: "ieee-p1363" }).toString("base64url"); x.sg = e;
    W.B.publish(g1.T, JSON.stringify(x), true); await W.S.run(1500); quiet("冒簽的棋客認輸") }
  /* ③ 棋客在別盤（乙對棋客乙那盤）真的認輸了，把那份的簽名搬過來 */
  { bot2.update(n => { n.result = { w: g2.ps, why: "棋客認輸" }; n.draw = null }); await W.S.run(1500); assert.equal(K.net.game().result && K.net.game().result.w, g2.ps, "別盤的棋客認輸是真的");
    const y = JSON.parse(W.B.retained.get(g2.T)), x = resign(); x.sg = Object.assign({}, y.sg, { r: x.rev }); W.B.publish(g1.T, JSON.stringify(x), true); await W.S.run(1500); quiet("搬過來的簽名") }
  /* ④ 棋客舊的那步原封不動、換更大的 rev 重送（棋局倒退） */
  { const x = J(oldBot); x.rev = next(); W.B.publish(g1.T, JSON.stringify(x), true); await W.S.run(1500); quiet("重放棋客舊的那步") }
  assert.equal(W.H.priv().games[g1.gid].G.moves.length, 4, "裁判台沒有倒退（舊的那步棋步變少，照「不合法的狀態」改回）"); assert.ok(W.H.actBad().n >= hb + 3, "裁判台擋下 " + (W.H.actBad().n - hb) + " 則：" + JSON.stringify(W.H.actBad())); assert.ok(actBad(V) >= vb + 3, "觀眾擋下 " + (actBad(V) - vb) + " 則");
  assert.equal(score(A), s0, "真人的正式積分沒變"); assert.deepEqual(J(W.H.state().m["1-0"]).w, m0.w, "賽果沒變");
  /* 對照：棋客自己（裁判台代簽）認輸才收 */
  bot.update(n => { n.result = { w: g1.ps, why: "棋客認輸" }; n.draw = null }); await W.S.run(2000);
  assert.equal(A.net.game().result.w, g1.ps); assert.equal(W.H.state().m["1-0"].w, A.id);
  noErrors(W.S);
});

test("簽署完成前禁止計分入口：舊裁判台（sv 1）開的盤、棋客座位沒有金鑰——棋客沒簽名的認輸照舊收（相容），但這盤不進正式積分", PRIV, async () => {
  const W = await cupWorld(), A = await W.phone("aaaa1111", "甲"), bot = W.BOTS[0];
  A.net.cupReq("reg"); await W.S.run(1500);
  const pk = W.people[A.id].pk, now = W.S.now, gid = "cup" + crypto.randomBytes(6).toString("hex") + now.toString(36), T = `${ROOT}/g/${gid}/s`;
  const G = { rules: C.REP_RULES.id, gid, id: "old-sv1", rev: 1, red: { id: A.id, name: "甲", pts: 0, pk }, black: { id: bot.id, name: bot.name, pts: 300 }, moves: [], result: null, draw: null, at: now, tc: 3, inc: 2000, clk: { r: 180000, b: 180000 }, tk: now, tkN: 0, cup: { wk: W.H.state().wk, m: "1-7", g: 0, tb: false, rn: "兵卒過河", fast: true, sv: 1 } };
  W.B.publish(T, JSON.stringify(CK.sealGame(HOST, ROOT, G)), true); A.net.watch(gid); await W.S.run(1500);
  assert.equal(A.net.signState(), "cup");
  cmv(A, 0); await W.S.run(1500);
  const unsigned = f => { const x = JSON.parse(W.B.retained.get(T)); f(x); x.rev++; delete x.sg; delete x.rl; delete x.hs; W.B.publish(T, JSON.stringify(x), true) };
  unsigned(x => { x.moves.push(pick(x.moves, 1)); x.draw = null }); await W.S.run(1500); assert.equal(A.net.game().moves.length, 2, "棋客沒簽名的棋步照收（舊盤相容）");
  cmv(A, 2); await W.S.run(1500);
  unsigned(x => { x.result = { w: "r", why: "黑方認輸" }; x.draw = null }); await W.S.run(1500);
  assert.equal(A.net.game().result && A.net.game().result.w, "r", "結果照收");
  assert.equal(A.hist().length, 0, "棋客座位沒有金鑰（沒簽署）＝不計分");
  noErrors(W.S);
});

test("〔原始碼〕棋客程式交給裁判台代簽；裁判台開局寫 sv 2、棋客金鑰只在記憶體；App 的計分入口有三道門", PRIV, () => {
  const BOT = fs.readFileSync(path.join(__dirname, "lobby-bots.js"), "utf8"), HOSTSRC = fs.readFileSync(path.join(__dirname, "cup-host.js"), "utf8");
  assert.match(BOT, /cupEnter\(gid, sign\)/); assert.match(BOT, /this\.cupSign = typeof sign === "function" \? sign : null/);
  assert.match(BOT, /const s = this\.G\.cup \? \(this\.cupSign && this\.cupSign\.gid === this\.G\.gid \? this\.cupSign\(this\.G\) : null\) : JSON\.stringify\(this\.G\)/, "千秋盃簽不出來就不送");
  assert.match(BOT, /if \(n\.cup\) \{ delete n\.sg; delete n\.rl; delete n\.hs; Object\.defineProperty\(n, "_b"/);
  assert.match(HOSTSRC, /b\.cupEnter\(gid, botSigner\(gid, p === red \? "r" : "b", p\.id\)\)/); assert.match(HOSTSRC, /sv: 2 \} \};/);
  assert.ok(!/BOTK[^\n]*(writeFileSync|save\(\)|log\()/.test(HOSTSRC), "棋客金鑰不存檔、不寫日誌");
  assert.match(NET_SRC, /function nsRec\(\)\{if\(G\.ns\)\{nsSeen\(G\);if\(side\(\)\)unrecord\(G\);return true\}/); assert.match(NET_SRC, /function record\(\)\{if\(!G\|\|badG\.has\(G\.gid\)\|\|sgLegacy\(G\)\|\|nsRec\(\)\|\|/);
  assert.match(NET_SRC, /const s=side\(\);if\(!s\|\|!scoreGate\(G\)\)return;/);
  assert.match(NET_SRC, /if\(B\.cup\)return cupKeyed\(g,B\);const s=side\(\),o=s==="r"\?g\.black:g\.red;return!!\(B\.nv&&!botSys\(o\.id\)\)/);
});
