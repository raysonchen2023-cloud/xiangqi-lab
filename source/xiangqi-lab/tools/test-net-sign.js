// 評審 P22（開發者 11/11「肯定要做」）：線上對局狀態簽名的自動測試。用 tools/net-harness.js 的假伺服器、假時鐘、vm 載入真正的 src/net.js。
//   金鑰：每支手機一把 ECDSA P-256，私鑰不可匯出、存 IndexedDB；在線狀態、邀請、接受帶公開金鑰；開局綁在這盤（gid＋代號）。
//   ① 正常對局是簽名局，雙方、觀眾都驗得過；重開 App 用同一把金鑰
//   ② 第三者冒充（沒簽名、自己的金鑰簽、把金鑰換成自己的）：認輸、同意和、判超時、落子都不收，記可疑事件，伺服器上被蓋掉的保留訊息會被補回真的
//   ③ 對手用自己的金鑰冒充「對方認輸」、亂判超時、接在別的局面後面（拼接）都不收
//   ④ 重放：舊訊息照原樣重送不影響、還會補回最新的；改 rev／改 gid 重送不收
//   ⑤ 斷線重連時伺服器上是偽造的保留訊息：不收，補回真的以後照常接上
//   ⑥ 舊版相容：對方是舊版 App（簽名以前的 net.js，tools/fixtures/net-legacy-1111.js）或這支不能用 WebCrypto＝照舊規則下、標 legacy、這支不計積分；簽名局不能降級
//   ⑦ 積分防謊報（11/12）：改 localStorage 謊報積分，對方核對場數上限、在線狀態，不採信、用保守值算、戰績記「未驗證」；誠實的對手照常採信
//   ⑧ 驗「自稱勝」照這盤的棋規（11/12，authOk 帶 rc）：臺灣規程（原型）盤裡長將只提示不判負，對手簽「長將判負、我贏」雙方和觀眾都不收
// 用法：node --test xiangqi-lab/tools/test-net-sign.js
"use strict";
const { assert, test, fs, path, phone, memStorage, J, move, core, world, noErrors, startGame, ROOT } = require("./net-harness.js");
const { webcrypto } = require("node:crypto");
const LEGACY = fs.readFileSync(path.join(__dirname, "fixtures/net-legacy-1111.js"), "utf8");

/* ---------- 在測試這邊照 net.js 同一套格式造訊息（冒充用） ---------- */
const hcStr = g => { const o = {}; for (const k in g) if (k !== "rev" && k !== "at" && k !== "sg" && k !== "rl") o[k] = g[k]; return JSON.stringify(o) };
const u64 = b => Buffer.from(b).toString("base64url");
const sha = async s => u64(await webcrypto.subtle.digest("SHA-256", Buffer.from(s)));
async function sealAs(x, s, a, priv, p) {
  const h = await sha(hcStr(x)), e = { v: 1, s, a, r: x.rev, h, p: p || "" };
  e.k = u64(await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, priv, Buffer.from(["xq-act1", x.gid, x.id, e.r, e.s, e.a, e.h, e.p].join("|"))));
  x.sg = e; delete x.rl; return x;
}
const attackerKey = () => webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
const keyOf = P => P.idb.dbs.get("xqlab-sign").k.get("me");
const topic = gid => `${ROOT}/g/${gid}/s`;
const live = (B, gid) => JSON.parse(B.retained.get(topic(gid)));
/* 開一盤簽名局，下兩步，加一位觀眾 */
async function signedGame() {
  const w = world(), g = await startGame(w.S, w.B);
  const W = phone(w.S, w.B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); W.net.start(); await w.S.run(1500); W.net.watch(g.gid); await w.S.run(1500);
  move(g.red, "h2e2"); await w.S.run(1000); move(g.black, "h7e7"); await w.S.run(1000);
  return { ...w, ...g, W };
}
/* 三支手機的棋局都沒被改、伺服器保留的是真的（有簽名、內容跟玩家手上一樣） */
async function intact(t, want, why) {
  for (const P of [t.red, t.black, t.W]) assert.deepEqual(core(P.net.game()), want, why + "：" + P.tag + " 不能被改");
  const r = live(t.B, t.gid); assert.ok(r.sg && typeof r.sg.k === "string", why + "：伺服器保留的要是有簽名的真訊息"); assert.deepEqual(core(r), want, why + "：伺服器保留的內容要是真的");
}
const susWhy = P => P.net.suspicious().map(x => x.why);

test("① 正常對局：簽名局，雙方和觀眾都驗得過；金鑰不可匯出、存在 IndexedDB；上線狀態帶公開金鑰", async () => {
  const t = await signedGame();
  for (const P of [t.red, t.black, t.W]) assert.equal(P.net.signState(), "signed", P.tag);
  const r = live(t.B, t.gid);
  assert.equal(r.moves.length, 2); assert.equal(r.sg.s, "b"); assert.equal(r.sg.a, "move"); assert.equal(r.sg.r, r.rev);
  assert.match(r.red.pk, /^[A-Za-z0-9_-]{87}$/); assert.match(r.black.pk, /^[A-Za-z0-9_-]{87}$/); assert.notEqual(r.red.pk, r.black.pk);
  const kp = keyOf(t.red); assert.equal(kp.privateKey.extractable, false, "私鑰不可匯出"); assert.equal(kp.privateKey.algorithm.namedCurve, "P-256");
  const u = JSON.parse(t.B.retained.get(`${ROOT}/u/${t.red.id}`)); assert.equal(u.pk, r[t.red.net.side() === "r" ? "red" : "black"].pk, "在線狀態的公開金鑰就是開局綁的那把");
  for (const P of [t.red, t.black, t.W]) assert.deepEqual(J(P.net.suspicious()), []);
  move(t.red, "h0g2"); await t.S.run(1000); t.black.net.update(n => { n.result = { w: "r", why: "黑方認輸" } }); await t.S.run(1000);
  const e = core(t.red.net.game()); assert.equal(e.result.w, "r");
  for (const P of [t.black, t.W]) assert.deepEqual(core(P.net.game()), e);
  assert.deepEqual(t.red.hist().map(h => h.res), ["w"]); assert.deepEqual(t.black.hist().map(h => h.res), ["l"]);
  noErrors(t.S);
});

test("② 第三者冒充（沒簽名／自己的金鑰簽／把黑方金鑰換成自己的）：認輸、同意和、判超時、落子都不收，記可疑事件，伺服器上的保留訊息補回真的", async () => {
  const t = await signedGame(), want = core(t.red.net.game()), evil = await attackerKey();
  const evilPk = u64(await webcrypto.subtle.exportKey("raw", evil.publicKey));
  const kinds = [
    ["認輸", "b", "resign", x => { x.result = { w: "r", why: "黑方認輸" } }],
    ["同意和", "b", "drawok", x => { x.result = { w: null, why: "雙方同意和棋" } }],
    ["判超時", "r", "flag", x => { x.result = { w: "r", timeout: true, why: "黑方超過 3 分鐘沒走，超時判負" } }],
    ["落子", "b", "move", x => { x.moves.push([MVsq("h9"), MVsq("g7")]) }]
  ];
  function MVsq(s) { return require("../site/core.js").parseSq(s) }
  let n = 0;
  for (const [name, s, a, edit] of kinds) {
    for (const how of ["沒簽名", "自己的金鑰簽", "換掉金鑰再簽"]) {
      const x = live(t.B, t.gid); x.rev += 1; x.at = t.S.now; edit(x); delete x.sg; delete x.rl;
      if (how === "換掉金鑰再簽") x[s === "r" ? "red" : "black"].pk = evilPk;
      if (how !== "沒簽名") await sealAs(x, s, a, evil.privateKey, await sha(hcStr(live(t.B, t.gid))));
      t.B.publish(topic(t.gid), JSON.stringify(x), true);
      await t.S.run(6000); n++;
      await intact(t, want, `冒充${name}（${how}）`);
      assert.ok(susWhy(t.red).length >= n && susWhy(t.black).length >= n && susWhy(t.W).length >= n, `冒充${name}（${how}）要記可疑事件`);
    }
  }
  assert.ok(susWhy(t.red).includes("沒有簽名") && susWhy(t.red).includes("簽名不對") && susWhy(t.red).includes("雙方金鑰跟開局時不一樣"), susWhy(t.red).join("、"));
  assert.deepEqual(t.red.hist(), []); assert.deepEqual(t.black.hist(), []);
  const late = phone(t.S, t.B, { id: "llll8888", name: "晚來的觀眾", hash: "#/pvp" }); late.net.start(); await t.S.run(1500); late.net.watch(t.gid); await t.S.run(1500);
  assert.deepEqual(core(late.net.game()), want, "後來的觀眾拿到的是真的");
  noErrors(t.S);
});

test("③ 對手用自己的金鑰冒充「紅方認輸」、亂判超時、接在別的局面後面：都不收", async () => {
  const t = await signedGame(), want = core(t.red.net.game()), bk = keyOf(t.black).privateKey, base = live(t.B, t.gid);
  const C = require("../site/core.js");
  let x = J(base); x.rev += 1; x.result = { w: "b", why: "紅方認輸" };
  await sealAs(x, "b", "resign", bk, await sha(hcStr(base))); t.B.publish(topic(t.gid), JSON.stringify(x), true); await t.S.run(6000);
  await intact(t, want, "黑方簽「紅方認輸」（認輸只能輸的那方簽）");
  x = J(base); x.rev += 1; x.result = { w: "b", why: "紅方認輸" };
  await sealAs(x, "b", "claim", bk, await sha(hcStr(base))); t.B.publish(topic(t.gid), JSON.stringify(x), true); await t.S.run(6000);
  await intact(t, want, "黑方簽「我贏了」但棋規判不出來");
  assert.ok(susWhy(t.red).filter(w => w === "這個動作不是簽名的那一方能做的").length >= 2, susWhy(t.red).join("、"));
  x = J(base); x.rev += 1; x.result = { w: "b", timeout: true, why: "紅方超過 3 分鐘沒走，超時判負" };
  await sealAs(x, "b", "flag", bk, await sha(hcStr(base))); t.B.publish(topic(t.gid), JSON.stringify(x), true); await t.S.run(6000);
  assert.deepEqual(core(t.red.net.game()), want, "紅方用自己的棋鐘核對：才剛輪到紅方，不收（黑方自己的手機和觀眾無從核對，見 architecture.md）");
  noErrors(t.S);
});

test("③ 拼接：黑方把自己的一步簽在「兩步以前」那份後面，雙方都不收", async () => {
  const t = await signedGame(), bk = keyOf(t.black).privateKey, base = live(t.B, t.gid), C = require("../site/core.js");
  move(t.red, "h0g2"); await t.S.run(1000);
  const now = live(t.B, t.gid), x = J(now); x.rev += 1; x.moves.push([C.parseSq("h9"), C.parseSq("g7")]);
  await sealAs(x, "b", "move", bk, await sha(hcStr(base)));   // 簽在「兩步以前」那份後面
  t.B.publish(topic(t.gid), JSON.stringify(x), true); await t.S.run(6000);
  assert.equal(t.red.net.game().moves.length, 3, "拼接的那步不收");
  assert.ok(susWhy(t.red).includes("接在別的局面後面（拼接）"), susWhy(t.red).join("、"));
  noErrors(t.S);
});

test("④ 重放：舊訊息照原樣重送不影響（還會補回最新的）；改 rev、改 gid 重送都不收", async () => {
  const t = await signedGame(), old = t.B.log.filter(l => l.topic === topic(t.gid) && JSON.parse(l.payload).moves.length === 1).pop().payload;
  const want = core(t.red.net.game());
  t.B.publish(topic(t.gid), old, true); await t.S.run(6000);
  await intact(t, want, "照原樣重放上一步");
  let x = JSON.parse(old); x.rev = live(t.B, t.gid).rev + 1; t.B.publish(topic(t.gid), JSON.stringify(x), true); await t.S.run(6000);
  await intact(t, want, "改 rev 重放");
  assert.ok(susWhy(t.red).includes("舊訊息重放"));
  const t2 = await signedGame(), other = live(t2.B, t2.gid);
  x = J(other); x.gid = t.gid; x.rev = live(t.B, t.gid).rev + 1; t.B.publish(topic(t.gid), JSON.stringify(x), true); await t.S.run(6000);
  await intact(t, want, "別盤的訊息改 gid 拼過來");
  noErrors(t.S);
});

test("⑤ 黑方斷線時伺服器上的保留訊息被換成「黑方認輸」：黑方重連不收，補回真的以後照常接著下", async () => {
  const t = await signedGame(), want = core(t.red.net.game());
  t.red.offline(); t.black.offline(); await t.S.run(50000);
  const x = live(t.B, t.gid); x.rev += 1; x.result = { w: "r", why: "黑方認輸" }; delete x.sg;
  t.B.publish(topic(t.gid), JSON.stringify(x), true);
  t.black.online(); assert.ok(await t.S.until(() => t.black.net.status() === "up", 90000)); await t.S.run(8000);
  assert.deepEqual(core(t.black.net.game()), want, "重連拿到的是偽造的保留訊息：不收");
  assert.ok(susWhy(t.black).includes("沒有簽名"));
  assert.ok(live(t.B, t.gid).sg, "黑方把真的補回伺服器");
  t.red.online(); assert.ok(await t.S.until(() => t.red.net.status() === "up", 90000)); await t.S.run(3000);
  move(t.red, "h0g2"); await t.S.run(1000);
  assert.equal(t.black.net.game().moves.length, 3); assert.equal(t.W.net.game().moves.length, 3);
  noErrors(t.S);
});

for (const [name, o] of [["舊版開局、新版接受", { A: { src: LEGACY } }], ["新版開局、舊版接受", { K: { src: LEGACY } }], ["新版對新版，但一支不能用 WebCrypto", { K: { noCrypto: true } }]]) {
  test("⑥ 舊版相容（" + name + "）：照舊規則下得完，新版標 legacy、這盤不計積分", async () => {
    const w = world(), g = await startGame(w.S, w.B, o), { red, black, A } = g, NEW = name.startsWith("舊版開局") ? g.K : A;
    move(red, "h2e2"); await w.S.run(1000); move(black, "h7e7"); await w.S.run(1000);
    assert.equal(red.net.game().moves.length, 2); assert.equal(black.net.game().moves.length, 2);
    assert.equal(NEW.net.signState(), "legacy", "新版那支要標「對方版本較舊，無法驗證」");
    const loser = NEW === red ? black : red, sd = loser.net.side();
    loser.net.update(n => { n.result = { w: sd === "r" ? "b" : "r", why: "認輸" } }); await w.S.run(1000);
    assert.ok(NEW.net.game().result, "結果照收");
    assert.deepEqual(NEW.hist(), [], "新版不計這盤積分");
    assert.deepEqual(J(NEW.net.suspicious()), []);
    noErrors(w.S);
  });
}

test("⑥ 簽名局不能降級：有人送沒簽名的狀態（看起來像舊版）一律不收", async () => {
  const t = await signedGame(), want = core(t.red.net.game());
  const x = live(t.B, t.gid); x.rev += 1; x.result = { w: "r", why: "黑方認輸" }; delete x.sg; delete x.red.pk; delete x.black.pk;
  t.B.publish(topic(t.gid), JSON.stringify(x), true); await t.S.run(6000);
  await intact(t, want, "拿掉金鑰和簽名");
  for (const P of [t.red, t.black, t.W]) assert.equal(P.net.signState(), "signed");
  noErrors(t.S);
});

/* ---------- ⑦ 積分防謊報（評審 P22.5，11/12） ---------- */
/* 乙的手機 localStorage 放 rate，甲邀乙、下兩步，乙認輸；回傳甲記的那一筆戰績、甲名單上看到的乙 */
async function rateGame(rate) {
  const w = world(), g = await startGame(w.S, w.B, { K: { storage: memStorage([["xq_rate", JSON.stringify(rate)]]) } }), { A, K, red, black } = g;
  move(red, "h2e2"); await w.S.run(1000); move(black, "h7e7"); await w.S.run(1000);
  const sd = K.net.side(); K.net.update(n => { n.result = { w: sd === "r" ? "b" : "r", why: (sd === "r" ? "紅方" : "黑方") + "認輸" } }); await w.S.run(3000);
  assert.equal(A.net.signState(), "signed");
  noErrors(w.S);
  return { h: A.hist(), seen: J(A.net.people().find(x => x.id === K.id)) };
}
test("⑦ 謊報積分：乙改 localStorage 把自己改成 1700 分（0 場），甲不採信——用保守值 0 分算加減分（+24，信了會是 +48）、戰績記「未驗證」、名單顯示保守值；誠實的對手照常採信", async () => {
  const lie = await rateGame({ pts: 1700, w: 0, l: 0, d: 0, hist: [] });
  assert.equal(lie.h.length, 1); assert.equal(lie.h[0].res, "w");
  assert.equal(lie.h[0].ov, 0, "戰績標「未驗證」"); assert.match(lie.h[0].ow, /上限/); assert.equal(lie.h[0].op, 0, "採用的對手分數是保守值");
  assert.equal(lie.h[0].d, 24, "照 0 分的對手算：期望勝率 0.5、K＝48 → +24");
  /* 乙記完這盤輸棋後在線狀態變成 1652 分、1 場：1 場最多 48 分 */
  assert.equal(lie.seen.pts, 48, "名單上顯示保守值（1 場的上限）"); assert.equal(lie.seen.ptsRaw, 1652, "原本報的留著"); assert.match(lie.seen.ptsUnv, /上限/);
  const big = await rateGame({ pts: 99999, w: 400, l: 0, d: 0, hist: [] });
  assert.equal(big.h[0].ov, 0); assert.equal(big.h[0].op, 3000, "超出範圍的夾到 3000"); assert.equal(big.seen.pts, 3000);
  const ok = await rateGame({ pts: 40, w: 1, l: 0, d: 0, hist: [] });
  assert.equal(ok.h[0].ov, 1, "40 分、1 場（上限 48）：採信"); assert.equal(ok.h[0].op, 40); assert.equal(ok.h[0].ow, undefined);
  assert.equal(ok.h[0].d, Math.round(48 * (1 - 1 / (1 + Math.pow(10, 40 / 400)))));
  assert.equal(ok.seen.ptsUnv, undefined, "誠實的在線狀態不標未驗證"); assert.equal(ok.seen.ptsRaw, undefined);
});

/* ---------- ⑧ authOk 照這盤的棋規（評審 P22.5，11/12） ---------- */
/* 從開局走到一個「紅方每步都將軍、一來一回」的局面，再循環兩圈（第三次重複）：千秋休閒規則判「紅方長將判負」，臺灣規程（原型）只提示、不判 */
const PERP_PRE = ["d0e1", "b7f7", "b2b5", "h7h3", "e3e4", "f7d7", "b5b6", "d7g7", "h2e2", "g7g3", "b6e6", "h3c3"], PERP_CYC = ["e6f6", "c9e7", "f6e6", "e7c9"];
test("⑧ 驗「自稱勝」照這盤的棋規：臺灣規程（原型）盤裡長將只提示不判負，黑方用自己的金鑰簽「紅方長將判負、我贏」，紅方、黑方自己、觀眾都不收（以前觀眾和黑方會收）", async () => {
  const Cr = require("../site/core.js"), seq = [...PERP_PRE, ...PERP_CYC, ...PERP_CYC], mv = seq.map(u => [Cr.parseSq(u.slice(0, 2)), Cr.parseSq(u.slice(2))]);
  const judge = rc => { const S = { moves: [], rc }; Cr.stateRebuild(S); for (const [f, t] of mv) Cr.stateApply(S, f, t); return Cr.judgeState(S) };
  assert.equal(judge(null).w, "b", "前提：千秋休閒規則判紅方長將判負"); assert.equal(judge(Cr.ruleConfig("tw_proto", "casual")), null, "前提：臺灣規程（原型）不判");
  const tw = { ctx: { XQ_rulePref: () => "tw_proto" } };
  const w = world(), g = await startGame(w.S, w.B, { A: tw, K: tw }), { red, black, gid } = g;
  const W = phone(w.S, w.B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); W.net.start(); await w.S.run(1500); W.net.watch(gid); await w.S.run(1500);
  assert.equal(red.net.game().rc.rulesetId, "tw_proto"); assert.equal(red.net.game().rc.mode, "casual");
  for (let i = 0; i < seq.length; i++) { move(i % 2 ? black : red, seq[i]); await w.S.run(1000) }
  const want = core(red.net.game()); assert.equal(want.moves.length, 20); assert.equal(want.result, null);
  const base = live(w.B, gid), x = J(base); x.rev += 1; x.result = { w: "b", why: "紅方長將判負" };
  await sealAs(x, "b", "claim", keyOf(black).privateKey, await sha(hcStr(base)));
  w.B.publish(topic(gid), JSON.stringify(x), true); await w.S.run(6000);
  for (const P of [red, black, W]) assert.deepEqual(core(P.net.game()), want, P.tag + "：照這盤的棋規判不出黑勝，不收");
  for (const P of [red, W]) assert.ok(susWhy(P).includes("這個動作不是簽名的那一方能做的"), P.tag + "：記可疑事件 " + susWhy(P).join("、"));
  assert.ok(live(w.B, gid).sg && live(w.B, gid).result === null, "伺服器上補回真的");
  noErrors(w.S);
});

test("〔原始碼〕原始碼：簽名區段 SIGN:BEGIN～END、私鑰不可匯出、金鑰存 IndexedDB xqlab-sign、舊版局不計分", () => {
  const src = fs.readFileSync(path.join(__dirname, "../src/net.js"), "utf8");
  const a = src.indexOf("SIGN:BEGIN"), b = src.indexOf("SIGN:END"); assert.ok(a > 0 && b > a);
  const blk = src.slice(a, b);
  assert.match(blk, /generateKey\(\{name:"ECDSA",namedCurve:"P-256"\},false,\["sign","verify"\]\)/);
  assert.match(blk, /indexedDB\.open\("xqlab-sign",1\)/);
  assert.match(src, /function record\(\)\{if\(!G\|\|badG\.has\(G\.gid\)\|\|sgLegacy\(G\)\|\|/);
  assert.doesNotMatch(src, /\/\/[^\n]*\r?\n[^\n]*sgVet/, "沒有一行長程式中間插 // 註解");
});
