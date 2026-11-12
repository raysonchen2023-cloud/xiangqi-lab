// 第 9 輪外部評審（Gemini：千秋盃的報名與賽程廣播也要納入 WebCrypto 簽名驗證）的自動測試。
//   用 tools/net-harness.js 的假 MQTT 伺服器、假時鐘、vm 載入真正的 src/net.js；裁判台是真正的 tools/cup-host.js（接在同一個假伺服器上，不開計時器）。
//   金鑰：測試自己臨時產生一把裁判台金鑰，App 內建的公開金鑰在 vm 載入前換成這把（不碰開發者真正的金鑰、不連任何真的伺服器）。
//   ① 正常：報名、取消、再報名、點將，名單照常更新；送出的報名帶公開金鑰和簽名
//   ② 偽造的報名、取消、點將（沒簽名、別人的金鑰、竄改內容、別的大廳的簽名、冒用別人的公開金鑰）裁判台都不受理
//   ③ 重放舊的報名／取消，超過 10 分鐘的，都不受理
//   ④ 偽造或被竄改的賽程廣播、貼錯頻道、別的大廳的、重放舊的（含重開 App 以後）、過期的，App 都不顯示、不改狀態，並計數
//   ⑤ 千秋盃對局：裁判台開的照常下；不是裁判台開的、換掉對陣、沒有裁判台簽名的棄擂判決都不收；裁判台判的棄擂照收
//   ⑥ 金鑰檔：私鑰放使用者資料夾（測試用暫存資料夾代替）、沒有就產生、舊位置的搬過來公開金鑰不變；跟 App 內建的對不上裁判台就不開賽
// 用法：node --test xiangqi-lab/tools/test-cup-sign.js
"use strict";
const { assert, test, fs, path, NET_SRC, C, ROOT, Sched, Broker, phone, memStorage, J, MV, noErrors } = require("./net-harness.js");
const os = require("os"), crypto = require("crypto"), { webcrypto } = crypto;
const CK = require("./cup-key.js");
const startCup = require("./cup-host.js");

/* ---------- 測試用的裁判台金鑰；App 內建的公開金鑰換成這把 ---------- */
const HOST = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey, HPUB = CK.pubOf(HOST);
const LIVEK = CK.appKey(true);
assert.ok(LIVEK && NET_SRC.includes(LIVEK.x) && NET_SRC.includes(LIVEK.y), "前提：讀得到 App 內建的正式大廳公開金鑰");
const SRC = NET_SRC.split(LIVEK.x).join(HPUB.x).split(LIVEK.y).join(HPUB.y);

/* ---------- 把裁判台接到假伺服器上（跟 lobby-bots.js 給的共用連線同一個介面：up、onup、onmsg、pub、sub、unsub） ---------- */
const td = new TextDecoder();
function match(f, t) { const F = f.split("/"), T = t.split("/"); for (let i = 0; i < F.length; i++) { if (F[i] === "#") return true; if (i >= T.length) return false; if (F[i] !== "+" && F[i] !== T[i]) return false } return F.length === T.length }
function hostMqtt(S, B) {
  return () => {
    const me = { up: false, onup: null, onmsg: null, ondown: null };
    const c = {
      id: "host", P: { netOk: true, lag: 0, tag: "host" }, subs: new Set(), alive: true, nextAt: 0, lastRx: Infinity, keepalive: 1e9,
      ws: {
        readyState: 1, onmessage: e => {
          const u = new Uint8Array(e.data); if ((u[0] >> 4) !== 3) return; let i = 1, d; do { d = u[i++] } while (d & 128);
          const L = (u[i] << 8) | u[i + 1], topic = td.decode(u.subarray(i + 2, i + 2 + L)); me.onmsg && me.onmsg(topic, td.decode(u.subarray(i + 2 + L)));
        }
      }
    };
    me.pub = (t, p, r) => { B.publish(t, p, r, c); return true };
    me.sub = ts => { for (const f of ts) { c.subs.add(f); for (const [t, p] of B.retained) if (match(f, t)) S.add(() => me.onmsg && me.onmsg(t, p), B.lat, 0, "host") } };
    me.unsub = ts => { for (const f of ts) c.subs.delete(f) };
    S.add(() => { B.conns.add(c); me.up = true; me.onup && me.onup() }, B.lat, 0, "host");
    return me;
  };
}
let tmpN = 0;
const tmpDir = () => fs.mkdtempSync(path.join(os.tmpdir(), "xq-cup-sign-" + (++tmpN) + "-"));
/* 一個世界：假時鐘從「現在」開始（裁判台用真的 Date.now 檢查 10 分鐘），裁判台用快速測試賽制（--cup-fast）開一屆 */
async function cupWorld(o) {
  o = o || {};
  const S = Sched(Date.now()), B = Broker(S), logs = [], people = {};
  const H = startCup({ ROOT, URL: "fake", mqtt: hostMqtt(S, B), BOTS: [], people, isHuman: id => !/^bot/.test(id), alive: x => !!x, C, log: (...a) => logs.push(a.join(" ")), LIVE: false, DBDIR: tmpDir(), argv: ["--cup-fast"], hex: n => crypto.randomBytes(n).toString("hex"), key: o.key || HOST, noTimers: true });
  await S.run(100); H.tick(); await S.run(500);
  const W = { S, B, H, logs, people };
  /* 一支手機：上線、等名單；裁判台的在線名單照 lobby-bots.js 一樣從 u/<id> 抄 */
  W.phone = async (id, name, extra) => {
    const P = phone(S, B, { id, name, src: SRC, hash: "#/cup", ...(extra || {}) }); P.net.start(); await S.run(2500);
    const u = B.retained.get(`${ROOT}/u/${id}`); if (u) people[id] = JSON.parse(u);
    P.cupEv = []; P.net.on("cup", k => P.cupEv.push(k)); return P;
  };
  return W;
}
const regIds = W => W.H.state().reg.map(r => r.id);
const reqs = W => W.B.log.filter(l => l.topic === `${ROOT}/cup/req`).map(l => JSON.parse(l.payload));
const evilKey = () => webcrypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, false, ["sign", "verify"]);
const u64 = b => Buffer.from(b).toString("base64url");
async function evilReq(x, key) { const pk = u64(await webcrypto.subtle.exportKey("raw", key.publicKey)); x.pk = x.pk || pk; x.sg = u64(await webcrypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key.privateKey, Buffer.from(CK.reqMsg(x.room || ROOT, x)))); delete x.room; return x }
const sendReq = (W, x) => W.B.publish(`${ROOT}/cup/req`, typeof x === "string" ? x : JSON.stringify(x), false);
const bad = P => P.net.cupBad();

test("① 正常：報名、取消、再報名、點將都受理；送出的報名帶公開金鑰和簽名，名單同步到每支手機", async () => {
  const W = await cupWorld(), A = await W.phone("aaaa1111", "甲"), K = await W.phone("bbbb2222", "乙");
  assert.ok(A.net.cup() && A.net.cup().ph === "reg", "手機收到裁判台簽名的名單（報名中）");
  assert.equal(A.net.cupReq("reg"), true); await W.S.run(1500);
  assert.equal(K.net.cupReq("reg"), true); await W.S.run(1500);
  assert.deepEqual(regIds(W), ["aaaa1111", "bbbb2222"]);
  for (const P of [A, K]) assert.deepEqual(J(P.net.cup().reg.map(r => r.id)), ["aaaa1111", "bbbb2222"], P.tag + " 看到兩位報名");
  const r = reqs(W)[0]; assert.equal(r.t, "reg"); assert.equal(r.id, "aaaa1111"); assert.match(r.pk, /^[A-Za-z0-9_-]{87}$/); assert.equal(typeof r.sg, "string");
  assert.equal(r.pk, W.people.aaaa1111.pk, "簽名用的就是在線狀態裡那把公開金鑰");
  assert.deepEqual(CK.verifyReq(ROOT, r), { ok: true });
  A.net.cupReq("unreg"); await W.S.run(1500); assert.deepEqual(regIds(W), ["bbbb2222"], "取消報名");
  A.net.cupReq("reg"); await W.S.run(1500); assert.deepEqual(regIds(W), ["bbbb2222", "aaaa1111"], "再報名");
  W.H.state().ph = "ck"; W.H.publish(); await W.S.run(1000);
  A.net.cupReq("ck"); await W.S.run(1500); assert.deepEqual(W.H.state().ck, ["aaaa1111"], "點將");
  assert.equal(A.net.cup().ph, "ck"); assert.deepEqual(J(A.net.cup().ck), ["aaaa1111"]);
  assert.equal(W.H.reqBad().n, 0, "沒有被擋的請求");
  for (const P of [A, K]) assert.equal(bad(P).n, 0, P.tag + " 沒有被擋的公告");
  noErrors(W.S);
});

test("② 偽造的報名、取消、點將：沒簽名、竄改內容、冒用別人的公開金鑰、別人的金鑰冒名、別的大廳的簽名，裁判台都不受理", async () => {
  const W = await cupWorld(), A = await W.phone("aaaa1111", "甲"), V = await W.phone("vvvv7777", "受害者"), E = await evilKey();
  const wk = W.H.state().wk, now = () => W.S.now;
  /* 沒簽名（舊格式）幫甲報名 */
  sendReq(W, { t: "reg", wk, id: "aaaa1111", name: "甲", pts: 0, at: now() }); await W.S.run(500);
  assert.deepEqual(regIds(W), [], "沒簽名的報名不受理");
  /* 受害者自己報名 */
  V.net.cupReq("reg"); await W.S.run(1500); assert.deepEqual(regIds(W), ["vvvv7777"]);
  const real = reqs(W).filter(r => r.id === "vvvv7777").pop();
  /* 竄改受害者的真報名：改名字、改成取消 */
  sendReq(W, { ...real, name: "我是笨蛋", at: real.at + 1 }); await W.S.run(500);
  sendReq(W, { ...real, t: "unreg", at: real.at + 2 }); await W.S.run(500);
  assert.equal(W.H.state().reg[0].name, "受害者", "名字沒被改"); assert.deepEqual(regIds(W), ["vvvv7777"], "沒被取消");
  /* 冒用受害者的公開金鑰，但用自己的金鑰簽（簽名對不上） */
  sendReq(W, await evilReq({ t: "unreg", wk, id: "vvvv7777", name: "受害者", pts: 0, at: now(), pk: real.pk }, E)); await W.S.run(500);
  assert.deepEqual(regIds(W), ["vvvv7777"], "冒用公開金鑰的取消不受理");
  /* 用自己的金鑰冒名取消（簽名本身對，但金鑰跟受害者在線狀態、跟這一屆第一次報名的都不一樣） */
  sendReq(W, await evilReq({ t: "unreg", wk, id: "vvvv7777", name: "受害者", pts: 0, at: now() }, E)); await W.S.run(500);
  delete W.people.vvvv7777;   /* 受害者下線了（裁判台的名單裡沒有他的在線狀態），只剩這一屆綁的金鑰擋 */
  sendReq(W, await evilReq({ t: "unreg", wk, id: "vvvv7777", name: "受害者", pts: 0, at: now() + 1 }, E)); await W.S.run(500);
  assert.deepEqual(regIds(W), ["vvvv7777"], "別人的金鑰冒名取消不受理");
  /* 冒名幫甲報名（甲在線、在線狀態裡有甲的公開金鑰） */
  sendReq(W, await evilReq({ t: "reg", wk, id: "aaaa1111", name: "甲", pts: 0, at: now() }, E)); await W.S.run(500);
  assert.deepEqual(regIds(W), ["vvvv7777"], "冒名報名不受理");
  /* 測試房（別的大廳）簽的請求拿到這裡：簽名字串裡有大廳，驗不過 */
  W.H.state().ph = "ck"; W.H.publish(); await W.S.run(1000);
  const k2 = await evilKey(); const other = await evilReq({ t: "ck", wk, id: "zzzz5555", name: "丙", pts: 0, at: now(), room: "xqlab-test-x/v1" }, k2);
  sendReq(W, other); await W.S.run(500);
  assert.deepEqual(W.H.state().ck, [], "別的大廳簽的點將不受理");
  const why = W.H.reqBad().why, n = W.H.reqBad().n;
  assert.ok(n >= 8, "累計擋下 " + n + " 則"); assert.ok(why["沒有簽名（舊版 App 或偽造）"] >= 1 && why["簽名不對（內容被改過、或不是這把金鑰簽的）"] >= 3 && why["金鑰跟他在線狀態裡的不一樣"] >= 2 && why["金鑰跟這一屆第一次報名時的不一樣"] >= 1, JSON.stringify(why));
  for (const P of [A, V]) assert.deepEqual(J(P.net.cup().reg.map(r => r.id)), ["vvvv7777"]);
  noErrors(W.S);
});

test("③ 重放：取消以後重送舊的報名、再報名以後重送舊的取消、超過 10 分鐘的請求，裁判台都不受理", async () => {
  const W = await cupWorld(), A = await W.phone("aaaa1111", "甲");
  A.net.cupReq("reg"); await W.S.run(1500); A.net.cupReq("unreg"); await W.S.run(1500);
  const [reg1, unreg1] = reqs(W).map(J);
  assert.deepEqual(regIds(W), []);
  sendReq(W, reg1); await W.S.run(500); assert.deepEqual(regIds(W), [], "重放舊的報名不受理");
  A.net.cupReq("reg"); await W.S.run(1500); assert.deepEqual(regIds(W), ["aaaa1111"]);
  sendReq(W, unreg1); await W.S.run(500); assert.deepEqual(regIds(W), ["aaaa1111"], "重放舊的取消不受理");
  assert.equal(W.H.reqBad().why["重放（不比上一則新）"], 2);
  await W.S.run(11 * 60000);   /* 假時鐘往前 11 分鐘：手機送的 at 比裁判台的時間快 11 分鐘 */
  A.net.cupReq("unreg"); await W.S.run(1500); assert.deepEqual(regIds(W), ["aaaa1111"], "時間差超過 10 分鐘不受理");
  assert.equal(W.H.reqBad().why["時間不對（超過 10 分鐘，可能是重放）"], 1);
  noErrors(W.S);
});

test("④ 賽程廣播：偽造的、被竄改的、沒簽名的、貼錯頻道的、別的大廳的、重放舊的、過期的，App 都不顯示、不改狀態，並計數", async () => {
  const W = await cupWorld(), A = await W.phone("aaaa1111", "甲"), E = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey;
  A.net.cupReq("reg"); await W.S.run(1500);
  const T = `${ROOT}/cup/state`, good = W.B.retained.get(T), want = J(A.net.cup());
  assert.deepEqual(want.reg.map(r => r.id), ["aaaa1111"]);
  const ev0 = A.cupEv.length, fake = { ...W.H.state(), reg: [], champ: { id: "evil", name: "冒牌擂主" }, n: 999, at: Date.now() + 60000 };
  const tries = [
    ["別的金鑰簽", CK.envelope(E, "state", ROOT, fake), "sig"],
    ["簽好以後竄改內容", (() => { const x = JSON.parse(CK.envelope(HOST, "state", ROOT, fake)); x.d = x.d.replace("冒牌擂主", "另一個冒牌"); return JSON.stringify(x) })(), "sig"],
    ["沒簽名", JSON.stringify(fake), "sig"],
    ["擂主碑貼到名單頻道", CK.envelope(HOST, "hall", ROOT, { v: 1, list: [], at: Date.now() + 60000 }), "scope"],
    ["別的大廳（測試房）的公告", CK.envelope(HOST, "state", "xqlab-test-x/v1", fake), "scope"],
    ["舊格式（沒有 k、rt）", (() => { const d = JSON.stringify(fake); return JSON.stringify({ d, s: CK.sign(HOST, d) }) })(), "scope"],
    ["過期（4 天前發的）", CK.envelope(HOST, "state", ROOT, { ...fake, at: W.S.now - 4 * 864e5 }), "stale"]
  ];
  for (const [name, payload, k] of tries) {
    const b0 = bad(A)[k]; W.B.publish(T, payload, true); await W.S.run(800);
    assert.deepEqual(J(A.net.cup()), want, name + "：名單不變"); assert.equal(bad(A)[k], b0 + 1, name + "：記在 " + k);
  }
  assert.equal(A.cupEv.length, ev0, "被擋的公告不會通知畫面更新");
  /* 重放：裁判台再發兩次（新的），把舊的那份重貼回伺服器 */
  W.H.publish(); await W.S.run(800); W.H.publish(); await W.S.run(800);
  const latest = J(A.net.cup()); assert.ok(latest.n > want.n);
  W.B.publish(T, good, true); await W.S.run(800);
  assert.deepEqual(J(A.net.cup()), latest, "重放舊的名單：不收"); assert.ok(bad(A).replay >= 1);
  /* 重開 App（同一份 localStorage）：伺服器上留的是被重放的舊的，也不收（不顯示舊名單） */
  A.close(); const A2 = await W.phone("aaaa1111", "甲", { storage: A.storage });
  assert.equal(A2.net.cup(), null, "重開 App 以後伺服器上是舊的：不顯示"); assert.equal(bad(A2).replay, 1);
  /* 裁判台再發一次：照常收 */
  W.H.publish(); await W.S.run(800); assert.ok(A2.net.cup() && A2.net.cup().n > latest.n, "新的照收");
  /* 同一份重送（重新訂閱時伺服器會再送一次保留訊息）不算重放 */
  const b1 = bad(A2).n; W.B.publish(T, W.B.retained.get(T), true); await W.S.run(800); assert.equal(bad(A2).n, b1);
  /* 擂主碑：竄改的不收，真的照收 */
  const H = `${ROOT}/cup/hall`, hall0 = J(A2.net.cupHall());
  W.B.publish(H, CK.envelope(E, "hall", ROOT, { v: 1, list: [{ id: "evil", name: "冒牌擂主", at: Date.now() }], at: Date.now() }), true); await W.S.run(800);
  assert.deepEqual(J(A2.net.cupHall()), hall0, "偽造的擂主碑不收"); assert.ok(!A2.net.cupChamp(), "沒有冒牌擂主");
  W.H.publishHall(); await W.S.run(800); assert.ok(A2.net.cupHall(), "裁判台的擂主碑照收");
  noErrors(W.S);
});

test("⑤ 千秋盃對局：裁判台開的照常下、觀眾看得到；不是裁判台開的、換掉對陣、沒有裁判台簽名的棄擂判決都不收；裁判台判的棄擂照收", async () => {
  const W = await cupWorld(), A = await W.phone("aaaa1111", "甲"), K = await W.phone("bbbb2222", "乙"), V = await W.phone("wwww9999", "觀眾");
  A.net.cupReq("reg"); await W.S.run(1500); K.net.cupReq("reg"); await W.S.run(1500);
  const S0 = W.H.state(), pa = { id: "aaaa1111", name: "甲", pts: 0, bot: false, seed: 1 }, pb = { id: "bbbb2222", name: "乙", pts: 0, bot: false, seed: 16 };
  S0.ph = "play"; S0.m = { "1-0": { id: "1-0", r: 1, i: 0, a: pa, b: pb, g: [], sc: [0, 0], st: "wait", w: null, why: "", gid: null, done: 0 } }; S0.order = ["1-0"];
  W.H.startGame(S0.m["1-0"], false); await W.S.run(1000);
  const gid = W.H.state().m["1-0"].gid, T = `${ROOT}/g/${gid}/s`, G0 = JSON.parse(W.B.retained.get(T));
  assert.ok(G0.hs && typeof G0.hs.k === "string", "裁判台開的對局帶裁判台的章");
  for (const P of [A, K, V]) { P.net.watch(gid); await W.S.run(1500) }
  const red = G0.red.id === A.id ? A : K, black = red === A ? K : A;
  for (const P of [A, K, V]) { assert.equal(P.net.signState(), "cup", P.tag); assert.ok(P.net.game() && P.net.game().gid === gid, P.tag + " 拿到對局") }
  assert.equal(red.net.side(), "r"); assert.equal(black.net.side(), "b");
  const mv = (P, u) => P.net.update(n => { P.net.tickMove(n, P.net.side()); n.moves.push(MV(u)) });
  mv(red, "h2e2"); await W.S.run(1000); mv(black, "h7e7"); await W.S.run(1000);
  for (const P of [A, K, V]) assert.equal(P.net.game().moves.length, 2, P.tag + " 照常下");
  assert.equal(W.H.priv().games[gid].G.moves.length, 2, "裁判台也收到");
  const want = J(V.net.game().moves), live = () => JSON.parse(W.B.retained.get(T));
  /* 換掉對陣（紅方換成冒牌的人） */
  let x = live(); x.rev += 1; x.red = { id: "evil0000", name: "冒牌" }; delete x.hs; W.B.publish(T, JSON.stringify(x), true); await W.S.run(1000);
  assert.equal(V.net.game().red.id, red.id, "觀眾：對陣沒被換掉");
  /* 沒有裁判台簽名的棄擂判決（判紅方棄擂），舊的章留著也沒用（內容不一樣） */
  x = live(); x.rev += 5; x.result = { w: "r", forfeit: true, timeout: true, why: "黑方沒有入座，棄擂" }; W.B.publish(T, JSON.stringify(x), true); await W.S.run(1000);
  for (const P of [A, K, V]) { assert.equal(P.net.game().result, null, P.tag + "：沒有裁判台簽名的棄擂不收"); assert.deepEqual(J(P.net.game().moves), want) }
  assert.ok(bad(V).game >= 2, "觀眾記下 " + bad(V).game + " 則");
  /* 不是裁判台開的千秋盃對局（名單裡沒有、也沒有章）：新來的觀眾看不到 */
  const fg = "cupfake" + Date.now().toString(36), F = { ...G0, gid: fg, rev: 1, moves: [] }; delete F.hs;
  const V2 = await W.phone("xxxx3333", "新觀眾"); V2.net.watch(fg); await W.S.run(500);
  W.B.publish(`${ROOT}/g/${fg}/s`, JSON.stringify(F), true); await W.S.run(1500);
  assert.equal(V2.net.game(), null, "偽造的千秋盃對局不收"); assert.equal(bad(V2).game, 1);
  /* 拿掉 cup 欄位、想當一般對局塞給新觀眾：名單裡是千秋盃的 gid，不收 */
  /* （直接換掉伺服器上保留的那份、不轉送：裁判台看到會馬上改回來，這裡要測的是新觀眾第一次拿到的就是假的） */
  const V3 = await W.phone("yyyy4444", "觀眾三"), keep = W.B.retained.get(T); x = live(); delete x.cup; delete x.hs; x.rev += 9; x.result = { w: "b", why: "紅方認輸" };
  W.B.retained.set(T, JSON.stringify(x)); V3.net.watch(gid); await W.S.run(1500);
  assert.equal(V3.net.game(), null, "拿掉 cup 的不收"); assert.equal(bad(V3).game, 1);
  W.B.retained.set(T, keep);
  /* 裁判台判紅方棄擂（有章；輪到紅方）：黑方、觀眾、後來的觀眾都收，裁判台記勝負（紅方自己的手機用自己的棋鐘核對，見 architecture.md） */
  W.H.setRes(gid, { w: "b", forfeit: true, timeout: true, why: "紅方沒有入座，棄擂" }); await W.S.run(1500);
  for (const P of [black, V, V3]) { const r = P.net.game() && P.net.game().result; assert.ok(r && r.forfeit && r.w === "b", P.tag + " 收到裁判台的棄擂判決") }
  assert.equal(W.H.state().m["1-0"].w, black.id); assert.equal(W.H.state().m["1-0"].st, "done");
  for (const P of [black, V]) assert.equal(P.net.cup().m["1-0"].w, black.id, P.tag + " 名單上的成績同步");
  noErrors(W.S);
});

test("⑥ 金鑰檔：私鑰放使用者資料夾；沒有就產生、舊位置的搬過來（公開金鑰不變）；跟 App 內建的對不上，裁判台不開賽", async () => {
  const dir = tmpDir(), leg = tmpDir(), was = { k: process.env.XQ_CUP_KEY_DIR, l: process.env.XQ_CUP_LEGACY_DIR };
  try {
    process.env.XQ_CUP_KEY_DIR = dir; process.env.XQ_CUP_LEGACY_DIR = leg;
    assert.equal(CK.keyFile(true), path.join(dir, ".xiangqi-cup-key.json")); assert.equal(CK.keyFile(false), path.join(dir, ".xiangqi-cup-key.test.json"));
    const a = CK.ensureKey(false); assert.equal(a.how, "made"); assert.ok(fs.existsSync(CK.keyFile(false)));
    const b = CK.ensureKey(false); assert.equal(b.how, "found"); assert.deepEqual(b.pub, a.pub, "第二次讀到同一把");
    /* 舊位置（tools/.cup-key.json 那種格式）搬過來 */
    const old = crypto.generateKeyPairSync("ec", { namedCurve: "P-256" }).privateKey, oj = old.export({ format: "jwk" });
    fs.writeFileSync(path.join(leg, ".cup-key.json"), JSON.stringify({ note: "舊的", priv: oj, pub: { x: oj.x, y: oj.y } }));
    const c = CK.ensureKey(true); assert.equal(c.how, "migrated"); assert.deepEqual(c.pub, { x: oj.x, y: oj.y }, "搬過來公開金鑰不變"); assert.equal(c.legacy, path.join(leg, ".cup-key.json"));
    /* 跟 App 內建的公開金鑰對不上：裁判台不開賽（log 寫原因） */
    const S = Sched(Date.now()), B = Broker(S), logs = [];
    const h = startCup({ ROOT, URL: "fake", mqtt: hostMqtt(S, B), BOTS: [], people: {}, isHuman: () => true, alive: x => !!x, C, log: (...m) => logs.push(m.join(" ")), LIVE: false, DBDIR: tmpDir(), argv: ["--cup-fast"], hex: n => crypto.randomBytes(n).toString("hex"), noTimers: true });
    assert.equal(h, undefined, "不開賽"); assert.ok(logs.some(l => /對不上/.test(l)), logs.join("\n"));
  } finally { for (const [k, v] of [["XQ_CUP_KEY_DIR", was.k], ["XQ_CUP_LEGACY_DIR", was.l]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v } }
});

test("〔原始碼〕裁判台不再讀專案資料夾裡的私鑰；cup-key.js 不印私鑰；net.js 沒有一行長程式中間插 // 註解；兩邊的簽名字串一樣", () => {
  const host = fs.readFileSync(path.join(__dirname, "cup-host.js"), "utf8"), key = fs.readFileSync(path.join(__dirname, "cup-key.js"), "utf8"), net = NET_SRC;
  assert.doesNotMatch(host, /\.cup-key\.json"/, "cup-host.js 不直接讀 tools/.cup-key.json");
  assert.match(host, /CK\.ensureKey\(LIVE/); assert.match(key, /os\.homedir\(\)/); assert.match(key, /\.xiangqi-cup-key\.json/);
  assert.doesNotMatch(key, /console\.log\([^)]*\.d\b/, "不印私鑰的 d");
  assert.doesNotMatch(net, /\/\/[^\n]*\r?\n[^\n]*cupIn/, "沒有一行長程式中間插 // 註解");
  /* 簽名字串：App（net.js）和裁判台（cup-key.js）同一套（行為上 ①～⑤ 已經互相驗過，這裡只防有人只改一邊） */
  assert.ok(net.includes('"xq-cupreq1"+JSON.stringify([ROOT,x.wk,x.t,x.id,x.name,x.pts,x.at,x.pk])')); assert.ok(key.includes('"xq-cupreq1" + JSON.stringify([ROOT, x.wk, x.t, x.id, x.name, x.pts, x.at, x.pk])'));
  assert.ok(net.includes('"xq-cupg1|"+ROOT+"|"+x.gid+"|"+hcCup(x)')); assert.ok(key.includes('"xq-cupg1|" + ROOT + "|" + g.gid + "|" + hcCup(g)'));
});
