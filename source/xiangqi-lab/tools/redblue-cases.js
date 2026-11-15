// 象棋千秋：紅藍隊攻擊重現案例庫（評比第 16 輪改善清單第 3 項、第 17 輪 F1：公開紅藍隊與名稱安全測試）
// Copyright (c) 2026 陳泓昇 (Chen Hung-Sheng)．SPDX-License-Identifier: GPL-3.0-or-later（見倉庫根目錄 LICENSE）
//
// 每一案都有：攻擊輸入（attack）、正常對照（control）、預期（expect）。
//   expect "blocked"：已經修好，攻擊要被擋住。攻擊成功＝回歸（壞掉了）。
//   expect "open"   ：還沒修（或只修一部分）的漏洞。程式照實跑攻擊，攻擊成功＝「預期失敗」：漏洞還在，照實列出來，不用文件敘述代替。
//                     哪天攻擊被擋住了＝「預期失敗卻通過」：可能修好了，要把這一案改成 blocked（redblue-run.js 會以代碼 3 提醒）。
//   對照（control）一定要過：證明攻擊被擋不是因為整個功能壞了（例如老實玩家照常下、正常名字照常顯示）。
// 跑的是這個資料夾往上的 src/net.js、xiangqi-db/m/*.js：在公開倉庫用 source/run-tests.js 或 redblue-run.js --repo 跑，就是發布版那一份。
// 不連正式或測試伺服器（假 MQTT 伺服器＋假時鐘，tools/net-harness.js）、不開瀏覽器、不呼叫外部 API、不需要千秋盃裁判台程式。
// 來源：xiangqi-db/tools/review_loop/rounds/r15/redblue/ 的 report.md 與 repro-*.js（R01、R02、R03、R05），威脅模型 data/docs/threat-model.md 的 T9、T11、S8、I5、I6。
// 11/13 評比第 16 輪第 5 項（棋鐘不可信＝四方一致不計分、千秋盃棋客由裁判台代簽 sv 2、簽署前關閉計分入口）後：R02-A 的判定改成「四方一致 ns、老實那方積分不變」，R02-A2、R02-B、R01-bot 改 blocked，加 R01-sv1；詳細測試在 test-noscore.js。
"use strict";
const fs = require("fs"), path = require("path"), vm = require("vm"), crypto = require("crypto"), { webcrypto } = crypto;
const M_DIR = process.env.XQ_M_DIR || path.join(__dirname, "..", "..", "xiangqi-db", "m");
const MIN = 60000;
const rdM = f => fs.readFileSync(path.join(M_DIR, f), "utf8").split("\r\n").join("\n");
const cut = (s, a, b) => { const i = s.indexOf(a), j = s.indexOf(b, i + 1); if (i < 0 || j < i) throw new Error("找不到區段 " + a); return s.slice(i, j) };
let H = null;
const harness = () => H || (H = require("./net-harness.js"));

/* ================= R02（威脅模型 T11）：改過的 App 自報剩餘時間 lft、不扣自己的鐘 ================= */
/* 11/13 評比第 16 輪第 5 項（net.js 的 NS 區段）起，「擋住」＝這盤一致改為「不計分」：紅、黑、觀眾、伺服器保留的狀態都帶同一個 ns 標記，
   老實那方（黑方）的正式積分（rating()、hist()）回到這盤之前。「攻擊成功」＝這盤照樣計分，或四方不一致（同 rounds/r15/redblue/repro-lft-override.js）。
   以前的「黑方保有勝場」被刻意改掉了（不計分取代保留勝場）。 */
const forgedMove = (P, u, lft) => P.net.update(n => { n.moves.push(typeof u === "string" ? H.MV(u) : u); n.lft = lft; n.lfN = n.moves.length; n.draw = null });
function pick(moves, k) {
  const C = H.C, at = mv => { const st = { moves: [] }; C.stateRebuild(st); for (const [a, b] of mv) C.stateApply(st, a, b); return st };
  const st = at(moves), L = C.legal(st.board, st.turn).filter(m => { const T = at(moves.concat([m])); return !C.judgeState(T) && C.legal(T.board, T.turn).length > 0 });
  return L[(k * 7919 + 13) % L.length];
}
const score = P => { const r = P.net.rating(); return JSON.stringify({ pts: r.pts, w: r.w, l: r.l, d: r.d, n: P.hist().length }) };
async function arena() {
  const { S, B } = harness().world(), g = await H.startGame(S, B);
  const V = H.phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp" }); V.net.start(); await S.run(2000); V.net.watch(g.gid); await S.run(2000);
  H.move(g.red, "h2e2"); await S.run(2000); H.move(g.black, "h7e7"); await S.run(2000);
  return Object.assign({ S, B, V }, g);
}
const nsOf = W => [W.red.net.game(), W.black.net.game(), W.V.net.game(), W.B.game(W.gid)].map(g => H.J(g && g.ns || null));
const nsBlocked = (W, s0) => { const v = nsOf(W); return !!v[0] && v.every(x => JSON.stringify(x) === JSON.stringify(v[0])) && score(W.black) === s0 };
async function lateOverride(lft) {
  const W = await arena(), s0 = score(W.black);
  W.red.offline(); await W.S.run(12 * MIN);
  const flagged = W.black.net.game().result;
  forgedMove(W.red, "h0g2", lft); W.red.online(); W.red.fire("online"); await W.S.run(3 * MIN);
  /* 之後紅方（攻擊的人）「贏」：黑方認輸 */
  W.black.net.update(n => { n.result = { w: "r", why: "黑方認輸" }; n.draw = null }); await W.S.run(10000);
  const v = nsOf(W), ok = nsBlocked(W, s0);
  return { flaggedTimeout: !!(flagged && flagged.timeout), ns: v[1], fourPartiesSame: new Set(v.map(x => JSON.stringify(x))).size === 1,
    blackScore: { before: JSON.parse(s0), after: JSON.parse(score(W.black)) }, attackSucceeded: !ok };
}
async function honestLate() {
  /* 對照：沒改過的 App 落子後斷線 2 分鐘（這步晚到約 2 分鐘），黑方先判超時、被推翻：不會變成不計分，照規則撤回黑方勝場、棋盤收斂 */
  const W = await arena();
  W.red.offline(); await W.S.run(2 * MIN); H.move(W.red, "h0g2"); await W.S.run(2 * MIN);
  const before = W.black.hist().filter(h => h.gid === W.gid).map(h => h.res);
  W.red.online(); W.red.fire("online"); await W.S.run(2 * MIN);
  const after = W.black.hist().filter(h => h.gid === W.gid).map(h => h.res), g = W.black.net.game();
  return { blackRecordBefore: before, blackRecordAfter: after, moves: g.moves.length, ns: H.J(g.ns || null), ok: before.includes("w") && !after.includes("w") && g.moves.length === 3 && !g.result && !g.ns };
}
async function noClock() {
  /* 每步都想 150 秒、自己的鐘一毫秒都不扣；一直下到紅方實際想了 50 分鐘（這盤每方 30 分鐘） */
  const W = await arena(), s0 = score(W.black), red0 = H.J(W.black.net.game().clk);
  let k = 0, nsAt = null;
  for (; k < 20; k++) {
    await W.S.run(150000); forgedMove(W.red, pick(W.red.net.game().moves, k), 30000); await W.S.run(3000);
    if (W.black.net.game().ns) { nsAt = k + 1; break }
    W.black.net.update(n => { if (W.black.net.tickMove(n, "b") === false) return; n.moves.push(pick(n.moves, k + 101)); n.draw = null }); await W.S.run(3000);
  }
  const g = W.black.net.game();
  W.black.net.update(n => { n.result = { w: "r", why: "黑方認輸" }; n.draw = null }); await W.S.run(10000);
  const ok = nsBlocked(W, s0);
  return { redClockStart: red0 && red0.r, redClockWhenCaught: g.clk && g.clk.r, caughtAtRedMove: nsAt, redThoughtSec: (nsAt || k) * 150, ns: nsOf(W)[1],
    blackScore: { before: JSON.parse(s0), after: JSON.parse(score(W.black)) }, attackSucceeded: !ok };
}
async function honestClock() {
  /* 對照：老實地每步想 20 秒，紅方的鐘照實扣，不會被當成棋鐘不可信 */
  const W = await arena(), r0 = W.black.net.game().clk.r;
  for (let k = 0; k < 4; k++) { await W.S.run(20000); W.red.net.update(n => { if (W.red.net.tickMove(n, "r") === false) return; n.moves.push(pick(n.moves, k)); n.draw = null }); await W.S.run(2000); W.black.net.update(n => { if (W.black.net.tickMove(n, "b") === false) return; n.moves.push(pick(n.moves, k + 101)); n.draw = null }); await W.S.run(2000) }
  const g = W.black.net.game(), r1 = g.clk.r;
  return { redClockStart: r0, redClockAfter: r1, ns: H.J(g.ns || null), ok: r1 <= r0 - 60000 && !g.ns };
}

/* ================= R03（威脅模型 I5）：轉移碼頻道名反推轉移碼 ================= */
function xferCtx() {
  const SET = rdM("05-settings.js"), SAVE = rdM("05b-save.js");
  const net = { calls: 0 }, hit = () => { net.calls++; return Promise.resolve(null) };   /* 假的 XQNet：記 App 有沒有去讀、寫、訂閱任何主題 */
  const ctx = { TextEncoder, TextDecoder, crypto: webcrypto, XQNet: { root: () => "ROOT", getRetained: hit, putRetained: hit, sub: hit, subscribe: hit }, localStorage: { getItem: () => null, setItem: () => { }, removeItem: () => { } }, setTimeout };
  ctx.window = ctx; vm.createContext(ctx);
  vm.runInContext(cut(SET, "/* XFER:BEGIN", "/* XFER:END */") + cut(SAVE, "/* XFER2:BEGIN", "/* XFER2:END */") + cut(SAVE, "/* XFER4:BEGIN", "/* XFER4:END */")
    + "\nglobalThis.__X={xfKeys,xf4Keys,xf4Code,xf4Download,XF4_IT,XF4_LEN,XF4_SALT,XF_ABC,XF_TTL,XF4_OLD};", ctx);
  ctx.__X.net = net; return ctx.__X;
}
const v3fast = c => crypto.createHash("sha256").update("xqlab-xfer-id:" + c).digest().subarray(0, 10).toString("hex");
async function xferV4() {
  const X = xferCtx(), code = X.xf4Code(), target = (await X.xf4Keys(code)).id, pre = code.slice(0, X.XF4_LEN - 3);
  const nodeId = c => crypto.pbkdf2Sync(c, X.XF4_SALT, X.XF4_IT, 64, "sha512").subarray(32, 42).toString("hex");
  if (nodeId(code) !== target) throw new Error("重現腳本的 PBKDF2 算法跟 App 的 xf4Keys 對不上");
  let found = null; for (const a of X.XF_ABC) for (const b of X.XF_ABC) for (const c of X.XF_ABC) if (!found && v3fast(pre + a + b + c) === target) found = pre + a + b + c;
  let n = 0; const t0 = process.hrtime.bigint();
  while (Number(process.hrtime.bigint() - t0) / 1e9 < 1.5) { nodeId(pre + X.XF_ABC[n % 31] + X.XF_ABC[(n / 31 | 0) % 31] + "A"); n++ }
  const rate = n / (Number(process.hrtime.bigint() - t0) / 1e9), space = Math.pow(X.XF_ABC.length, X.XF4_LEN), gpuPerSec = 1e10 / X.XF4_IT, worstYears = space / gpuPerSec / 3.15e7;
  return { codeLength: X.XF4_LEN, pbkdf2Iterations: X.XF4_IT, fastAttackFound: !!found, nodeCodesPerSec: +rate.toFixed(1), gpuWorstYears: +worstYears.toExponential(2),
    attackSucceeded: !!found || worstYears < 100 };
}
async function xferV4Roundtrip() {
  /* 對照：同一組 10 碼兩次導出的頻道 id 一樣（新手機輸入正確的碼找得到資料） */
  const X = xferCtx(), code = X.xf4Code(), a = (await X.xf4Keys(code)).id, b = (await X.xf4Keys(code)).id;
  return { ok: a === b && code.length === X.XF4_LEN };
}
async function xferLegacy8() {
  const X = xferCtx(), code = Array.from({ length: 8 }, () => X.XF_ABC[crypto.randomInt(X.XF_ABC.length)]).join("");
  const K = await X.xfKeys(code), pre = code.slice(0, 5), t0 = Date.now();
  let found = null; for (const a of X.XF_ABC) for (const b of X.XF_ABC) for (const c of X.XF_ABC) if (!found && v3fast(pre + a + b + c) === K.id) found = pre + a + b + c;
  /* 評比第 18 輪第 4 項起 8 碼停收：反推出碼也沒用，App 的下載（畫面用的 xfDownload＝xf4Download）看到 8 碼就丟停用提示，不讀不寫任何主題 */
  let refused = "";
  try { await X.xf4Download(code) } catch (e) { refused = String(e && e.message || e) }
  const accepted = !(refused === X.XF4_OLD && X.net.calls === 0);
  return { codeLength: 8, knownPrefix: 5, recovered: found === code, ms: Date.now() - t0, appRefuses: refused, appNetCalls: X.net.calls, appStillAccepts: accepted,
    attackSucceeded: found === code && accepted };
}

/* ================= R01（威脅模型 T9、S8）：千秋盃虛擬棋客的座位 ================= */
/* 11/13 評比第 16 輪第 5 項起，裁判台開的盤寫簽名版本 sv 2：棋客座位也有一把裁判台這盤產生的一次性金鑰，棋客的動作都由裁判台代簽。
   這裡不需要裁判台程式（cup-host.js 不公開）：測試自己產生裁判台金鑰（替換 net.js 裡的公鑰）、棋客座位金鑰、真人座位金鑰，照 net.js 公開的格式蓋章和簽名。
   攻擊（第三者，不是裁判台也不是棋客）：①沒簽名的棋客落子 ②用自己的金鑰冒簽 ③把棋客在別盤的真簽名搬過來 ④把棋客舊的那步換更大的 rev 重送。
   對照：裁判台代簽的棋客落子、真人簽名的落子照收。任何一個攻擊被觀眾收下＝攻擊成功。 */
async function cupBotSeat() {
  const h = harness(), { S, B } = h.world(), sub = webcrypto.subtle, te = new TextEncoder();
  const u64 = b => Buffer.from(b).toString("base64url"), gen = () => sub.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const host = await gen(), jwk = await sub.exportKey("jwk", host.publicKey);
  const src = h.NET_SRC.replace(/const CUP_KEY=[^;]*;/, () => `const CUP_KEY={x:"${jwk.x}",y:"${jwk.y}"};`);
  if (src === h.NET_SRC) throw new Error("net.js 裡找不到 CUP_KEY（裁判台公鑰），重現無效");
  const V = h.phone(S, B, { id: "wwww9999", name: "觀眾", src }); V.net.start(); await S.run(2500);
  const pkOf = async k => u64(await sub.exportKey("raw", k.publicKey)), sign = async (k, msg) => u64(await sub.sign({ name: "ECDSA", hash: "SHA-256" }, k.privateKey, te.encode(msg)));
  const sha = async s => u64(await sub.digest("SHA-256", te.encode(s)));
  const hcStr = g => { const o = {}; for (const k in g) if (k !== "rev" && k !== "at" && k !== "sg" && k !== "rl") o[k] = g[k]; return JSON.stringify(o) };
  const hcCup = g => { const o = {}; for (const k in g) if (k !== "rev" && k !== "at" && k !== "sg" && k !== "rl" && k !== "hs") o[k] = g[k]; return JSON.stringify(o) };
  const actMsg = (x, e) => ["xq-cupa1", h.ROOT, x.cup.wk, x.cup.m, x.cup.g, x.gid, x.id, e.r, e.s, e.a, e.h, e.p || ""].join("|");
  const now = S.now, human = await gen(), evil = await gen();
  /* 兩盤：紅方＝棋客（裁判台給的一次性金鑰）、黑方＝有報名金鑰的真人 */
  const mk = async (gid, m) => { const bot = await gen(); const g = { rules: "asian-direct-v2", gid, id: "cup-" + m, rev: 1, red: { id: "botq0001", name: "棋客", pts: 300, pk: await pkOf(bot) }, black: { id: "aaaa1111", name: "甲", pts: 0, pk: await pkOf(human) },
    moves: [], result: null, draw: null, at: now, tc: 30, clk: { r: 1800000, b: 1800000 }, tk: now, tkN: 0, cup: { wk: "2026-W46", m, g: 0, sv: 2 } };
    g.hs = { k: await sign(host, "xq-cupg1|" + h.ROOT + "|" + gid + "|" + hcCup(g)) }; return { g, bot, T: `${h.ROOT}/g/${gid}/s` } };
  const G1 = await mk("cup" + crypto.randomBytes(6).toString("hex"), "1-0"), G2 = await mk("cup" + crypto.randomBytes(6).toString("hex"), "1-1");
  /* 下一份狀態：prev 加一步、換 rev，用 key 照座位 s 簽（key 是 null＝不簽） */
  const step = async (G, prev, u, rev, s, key, over) => { const x = h.J(prev); delete x.hs; delete x.sg; delete x.rl; x.rev = rev; x.moves.push(h.MV(u));
    if (key) { const e = { v: 1, s, a: "move", r: rev, h: await sha(hcStr(x)), p: await sha(hcStr(prev)) }; e.k = await sign(key, actMsg(over || x, e)); x.sg = e } return x };
  for (const G of [G1, G2]) B.publish(G.T, JSON.stringify(G.g), true);
  await S.run(500); V.net.watch(G1.g.gid); await S.run(2000);
  const shown = !!(V.net.game() && V.net.game().gid === G1.g.gid && V.net.game().moves.length === 0), n = () => V.net.game().moves.length, bad0 = V.net.cupBad().act;
  const tried = {};
  /* ① 沒簽名 */
  B.publish(G1.T, JSON.stringify(await step(G1, G1.g, "h2e2", 2, "r", null)), true); await S.run(1500); tried.unsigned = n() > 0;
  /* ② 自己的金鑰冒簽成棋客座位 */
  B.publish(G1.T, JSON.stringify(await step(G1, G1.g, "h2e2", 3, "r", evil)), true); await S.run(1500); tried.evilKey = n() > 0;
  /* ③ 棋客在別盤（G2）真的簽了同一步，把那份簽名搬過來 */
  const y = await step(G2, G2.g, "h2e2", 2, "r", G2.bot); B.publish(G2.T, JSON.stringify(y), true); await S.run(500);
  { const x = await step(G1, G1.g, "h2e2", 4, "r", null); x.sg = Object.assign({}, y.sg, { r: 4 }); B.publish(G1.T, JSON.stringify(x), true); await S.run(1500); tried.transplant = n() > 0 }
  /* 對照 1：裁判台代簽的棋客落子（棋客座位的金鑰） */
  const ok1 = await step(G1, G1.g, "h2e2", 5, "r", G1.bot); B.publish(G1.T, JSON.stringify(ok1), true); await S.run(1500); const botOk = n() === 1;
  /* 對照 2：真人（黑方）自己簽名落子 */
  const ok2 = await step(G1, ok1, "h7e7", 6, "b", human); B.publish(G1.T, JSON.stringify(ok2), true); await S.run(1500); const humanOk = n() === 2;
  /* ④ 棋客舊的那步（rev 5、一步）原封不動、換更大的 rev 重送：棋局倒退 */
  { const x = h.J(ok1); x.rev = 7; B.publish(G1.T, JSON.stringify(x), true); await S.run(1500); tried.replay = n() !== 2 }
  const blocked = V.net.cupBad().act - bad0;
  return { hostSealedGameShown: shown, accepted: tried, blockedCount: blocked, signedBotMoveAccepted: botOk, signedHumanMoveAccepted: humanOk,
    attackSucceeded: Object.values(tried).some(Boolean), controlOk: shown && botOk && humanOk && blocked >= 3 };
}

/* R01-sv1（威脅模型 S8）：舊裁判台（sv 1）開的盤、棋客座位沒有金鑰——第三者偽造「棋客認輸」，App 為了相容照收，但這盤不能進真人的正式積分（簽署完成前關閉計分入口） */
async function cupSv1Score() {
  const h = harness(), { S, B } = h.world(), sub = webcrypto.subtle, te = new TextEncoder();
  const u64 = b => Buffer.from(b).toString("base64url");
  const host = await sub.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]), jwk = await sub.exportKey("jwk", host.publicKey);
  const src = h.NET_SRC.replace(/const CUP_KEY=[^;]*;/, () => `const CUP_KEY={x:"${jwk.x}",y:"${jwk.y}"};`);
  if (src === h.NET_SRC) throw new Error("net.js 裡找不到 CUP_KEY（裁判台公鑰），重現無效");
  const A = h.phone(S, B, { id: "aaaa1111", name: "甲", src, hash: "#/cup" }); A.net.start(); await S.run(2500);
  const pkA = JSON.parse(B.retained.get(`${h.ROOT}/u/aaaa1111`)).pk, s0 = score(A), now = S.now;
  const hcCup = g => { const o = {}; for (const k in g) if (k !== "rev" && k !== "at" && k !== "sg" && k !== "rl" && k !== "hs") o[k] = g[k]; return JSON.stringify(o) };
  const gid = "cup" + crypto.randomBytes(6).toString("hex"), T = `${h.ROOT}/g/${gid}/s`;
  const g = { rules: "asian-direct-v2", gid, id: "cup-1-0", rev: 1, red: { id: "aaaa1111", name: "甲", pts: 0, pk: pkA }, black: { id: "botq0001", name: "棋客", pts: 300 },
    moves: [], result: null, draw: null, at: now, tc: 30, clk: { r: 1800000, b: 1800000 }, tk: now, tkN: 0, cup: { wk: "2026-W46", m: "1-0", g: 0, sv: 1 } };
  g.hs = { k: u64(await sub.sign({ name: "ECDSA", hash: "SHA-256" }, host.privateKey, te.encode("xq-cupg1|" + h.ROOT + "|" + gid + "|" + hcCup(g)))) };
  B.publish(T, JSON.stringify(g), true); await S.run(500); A.net.watch(gid); await S.run(2000);
  const shown = !!(A.net.game() && A.net.game().gid === gid), seat = A.net.side();
  /* 甲（紅方）照常落子（自己簽名）；第三者偽造：棋客走一步、再「棋客認輸」，都沒有簽名 */
  A.net.update(n => { A.net.tickMove(n, A.net.side()); n.moves.push(h.MV("h2e2")); n.draw = null }); await S.run(1500);
  const unsigned = f => { const x = JSON.parse(B.retained.get(T)); f(x); x.rev++; delete x.sg; delete x.rl; delete x.hs; B.publish(T, JSON.stringify(x), true) };
  unsigned(x => { x.moves.push(h.MV("h7e7")); x.draw = null }); await S.run(1500);
  unsigned(x => { x.result = { w: "r", why: "黑方認輸" }; x.draw = null }); await S.run(3000);
  const r = A.net.game().result, s1 = score(A);
  return { seat, gameShown: shown, forgedResignShown: !!(r && r.w === "r"), scoreBefore: JSON.parse(s0), scoreAfter: JSON.parse(s1),
    attackSucceeded: s1 !== s0, controlOk: shown && seat === "r" };
}

/* ================= R05（威脅模型 I6）：別人的名字 ================= */
function nameSafe() {
  const SAFE = rdM("07x4-lobbysafe.js"), UTIL = rdM("00-util.js"), line = (s, h) => { const l = s.split("\n").find(x => x.startsWith(h)); if (!l) throw new Error("找不到 " + h); return l };
  const PURE = [line(UTIL, "const esc="), line(SAFE, "const LBS_PLACE="), line(SAFE, "const LBS_ROLE="), line(SAFE, "function lbsHash("), line(SAFE, "const lbsTitleAt="),
    cut(SAFE, "/* ---------- 紅藍隊 R05", "/* ---------- 名字安全顯示：以上")].join("\n");
  const ctx = {}; vm.createContext(ctx); vm.runInContext(PURE + "\n;this.T={esc,lbnBad,lbnPick};", ctx); return ctx.T;
}
/* 攻擊輸入：諧音、注音、拆字、數字代字母、形近字。評比第 19 輪第 3 項以前 lbnBad 沒有諧音字典，這 18 個都照原樣顯示；
   第 19 輪起 lbnBad 會先把注音、數字符號換回字再比一次，詞表加了諧音、形近字、拆字的詞組（m/07x4-lobbysafe.js 的 lbnAlt、LBN_BAD_WORDS、LBN_RE）。這 18 個一個字都沒改 */
const NAME_BYPASS = ["淦你娘", "干你娘", "ㄍㄢˋ你娘", "phuck", "fuk u", "sh1t", "a$$hole", "b1tch", "賴我", "ㄌㄞˊ我", "賴：abc", "電報小明", "TG小明", "Iine小明", "1ine小明", "管里員", "Adm1n", "4dmin"];
/* 同一類的其他寫法（不在最初那 18 個裡：修的是規則，不是只背那 18 個） */
const NAME_BYPASS_MORE = ["sh!t", "5hit", "b!tch", "8itch", "@sshole", "a55hole", "f4ggot", "n1gga", "p0rn", "s3x", "t1ts", "b00bs", "c0ck", "s.h.1.t", "S H 1 T", "ｓｈ１ｔ", "SH1T",
  "ㄍㄢˋ妳", "ㄍㄢ ㄋㄧˇ ㄋㄧㄤˊ", "ㄎㄠˋㄅㄟˇ", "ㄐㄧ ㄅㄞ", "ㄘㄠˋ你媽", "加ㄌㄞˋ", "ㄐㄧㄚ我", "ㄌㄞˋ我abc",
  "賴ID小明", "賴id:abc", "我的賴", "+賴", "＋賴 abc", "賴＝abc", "賴 : abc", "加我賴",
  "@dmin", "adm!n", "0fficial", "Offic1al", "m0derator", "deve1oper", "L1NE小明", "l1ne abc", "|ine小明", "T.G 小明", "tg:abc", "電報abc",
  "管裡員", "管哩員", "開発者", "係統公告", "公吿欄", "宮方", "倌方客服",
  "淦你", "淦林娘", "干妳娘", "贛你娘", "靠腰", "靠邀喔", "草尼馬", "艹你", "弓雖女干", "phuk", "phuq u", "fuq", "fuk  u", "fuk.u", "fuk ya", "fukyou", "fuk off", "Fuk U"];
/* 容易被這些新規則誤擋的正常名字：姓賴的、信賴、上官芳、日本和泰國地名、型號和背號、字母數字混寫的英文名、I 開頭的英文名、注音暱稱、有「干」「靠」「草」的正常詞 */
const NAME_GOOD_MORE = ["賴小明", "賴Kevin", "賴清德", "賴Ida", "小賴", "阿賴", "賴皮鬼", "信賴我", "依賴", "耍賴我最行", "別賴我", "無賴", "賴床大王", "賴在家", "姓賴",
  "上官芳", "官芳", "里長伯", "管家", "管樂團", "理員外", "發者", "開發區", "系列", "統一", "告白", "公雞", "公主", "宮廷", "客人", "服務生", "站台", "長官",
  "電力公司", "報紙", "電視報", "發電廠", "報到", "TGIF", "Tgood", "Stg", "MTG玩家", "tgv",
  "Fukuoka", "Fukushima", "Fuku", "Fuk Wing", "Fukui", "Phuket", "Phuc", "Phuong", "Tofu King", "Kungfu", "Fuka",
  "A55", "F4", "2B", "R2D2", "C3PO", "H2O", "O2", "U2", "3Q", "B612", "7-11", "No1", "K1", "F1賽車", "MP3", "PS5", "X1", "4ever", "2pac", "Mr.3", "E.T", "S.H.E", "5G", "4G", "1G", "A4", "B4", "3M",
  "Messi10", "Kobe24", "Curry30", "LeBron23", "Tom2", "Amy07", "阿明88", "小華99", "棋王007", "Leo7", "Sam5", "Max1", "Ben10", "Ace1", "Neo1",
  "Le0", "M4ria", "J0hn", "S1mon", "N1ck", "D4vid", "Tim3", "Ch3ss", "Xiangq1", "L1n", "Ch1n", "An1ta", "T1ger", "As1a", "Gr4ss", "P4ss", "B4ss", "Cl4ss", "Mass1mo", "T1tan", "T1to",
  "H1tch", "B1t", "B1tcoin", "R1ch", "Sh1p", "Sh1rt", "Sc0tt", "C0co", "C0ckpit", "P!nk", "Ke$ha", "A$AP", "Hello!", "Wow!!", "Go!Go!", "Yes!", "Hi!", "OK!", "Nice1", "Cool5", "Class5", "Bass5", "Pass3",
  "Ian", "Iris", "Ivy", "Ivan", "Isaac", "Ida", "III", "AI棋手", "IU", "MIT", "NIKE", "TITAN", "IBM", "ICE", "Irene", "Ike", "Illinois", "Iowa", "Inter", "IKEA", "Idol", "IQ180",
  "LG粉絲", "LGBT", "lg", "Olga", "Algae", "Lily", "Bill", "Will", "Milk", "Silk", "Film", "Golf", "Wolf", "Elf", "Half", "Self", "Alf", "Ralf", "Milford", "Milfoil",
  "ㄅㄆㄇ", "ㄏㄏ", "ㄎㄎ", "ㄅ一ㄤˋ", "好ㄘ", "ㄌㄞ", "ㄍㄢ", "ㄋㄧ好", "ㄇㄚ麻", "ㄨㄛ愛棋", "ㄐㄧ排", "ㄎㄠ肉", "ㄅㄟ極熊", "ㄅㄞ託", "ㄌㄧㄣ先生", "ㄐㄧㄚ油", "ㄉㄧㄠ魚", "ㄘㄠ莓",
  "干貝", "干杯", "不干我事", "若干", "餅干", "淦", "江淦", "贛州", "贛江", "靠山", "靠得住", "可靠", "腰果", "邀請", "草莓", "小草", "馬尼拉", "尼馬", "弓箭手", "女王", "美女", "干將莫邪",
  "將軍", "車馬炮", "老帥", "小卒過河", "象棋高手", "飛相局", "仙人指路", "中炮對屏風馬"];
/* 對照：已經擋得住的惡意名字（要換成稱號）、正常名字（要照原樣） */
const NAME_KNOWN_BAD = ["加我LINE 12345", "www.xx.com", "abc@gmail", "0912345678", "官方客服", "幹你娘", "fuck", "<img src=x>", "小​明"];
const NAME_GOOD = ["小明", "阿嬤愛下棋", "楚河漢界", "能幹", "體操", "assassin", "Scunthorpe", "Dickens", "Hello Kitty", "棋聖"];
async function nameBypass() {
  const T = nameSafe(), all = NAME_BYPASS.concat(NAME_BYPASS_MORE), pass = all.filter((n, i) => !T.lbnBad(n) || T.lbnPick("p" + i, n, {}) === n);
  return { tried: all.length, first18: NAME_BYPASS.length, shownAsIs: pass, attackSucceeded: pass.length > 0 };
}
async function nameBypassControl() {
  /* 對照：R05-display 的正常名字＋容易被新規則誤擋的正常名字，都要照原樣（0 誤擋） */
  const T = nameSafe(), all = NAME_GOOD.concat(NAME_GOOD_MORE), wrong = all.filter(n => T.lbnBad(n) || T.lbnPick("p1", n, {}) !== n).map(n => n + "→" + T.lbnBad(n));
  return { good: all.length, goodBlocked: wrong, ok: !wrong.length };
}
async function nameControl() {
  const T = nameSafe(), missed = NAME_KNOWN_BAD.filter(n => !T.lbnBad(n)), wrong = NAME_GOOD.filter(n => T.lbnBad(n));
  return { knownBad: NAME_KNOWN_BAD.length, knownBadMissed: missed, good: NAME_GOOD.length, goodBlocked: wrong, ok: !missed.length && !wrong.length };
}
/* R05-wire：送出端。評比第 19 輪第 3 項以前，net.js 只問外層（07x4 的 XQ_PUBNAME）；外層沒擋（或根本沒有外層）時，meInfo 給什麼名字就送什麼。
   第 19 輪起 net.js 的 me()、開局、戰績摘要都過 outNm（07x4 的 XQ_NAMESAFE＝顯示端同一個 lbnBad、lbnPick）。
   這裡跑的手機都是真正的 src/net.js。「改過的 App」用「沒有名字檢查、外層說名字沒問題」的手機模擬（它原樣送出不合格的名字）。
   伺服器是公開的 MQTT、不檢查內容：改過的 App 自己送什麼，別人的 App 擋不了它送，只能不幫它轉送、顯示時換掉（見每一段的紀錄和案例表的說明） */
const WIRE_BAD = "加我LINE 12345";
const wireLeaks = (B, P, bad) => [...new Set(B.log.filter(l => l.from === P.tag && String(l.payload).includes(bad)).map(l => l.topic.split("/")[2]))];
const wireRet = (h, B, k, id) => JSON.parse(B.retained.get(`${h.ROOT}/${k}/${id}`) || "{}");
async function wireStart(S, A, K) {
  let inv = null; K.net.on("invite", x => { inv = x });
  A.net.invite({ id: K.id, name: "" }); await S.run(500); if (!inv) return null;
  const from = H.J(inv.from); K.net.respond(inv, true); await S.run(1500);
  const g = A.net.game(); return g ? { gid: g.gid, from } : null;
}
async function wireResign(S, loser, winner) {   /* 各走一步（沒走滿兩步的盤不計分、不進戰績摘要），再由 loser 認輸 */
  const red = loser.net.side() === "r" ? loser : winner, black = red === loser ? winner : loser;
  H.move(red, "h2e2"); await S.run(2000); H.move(black, "h7e7"); await S.run(2000);
  const w = winner.net.side(); loser.net.update(n => { n.result = { w, why: (w === "r" ? "黑" : "紅") + "方認輸" }; n.draw = null }); await S.run(5000); winner.net.pubProf(); await S.run(1500) }
async function nameWire() {
  const h = harness(), T = nameSafe(), bad = WIRE_BAD, out = {};
  { /* ① 正式 App 的組合（net.js＋07x4 的名字檢查），外層沒擋（沒有 XQ_PUBNAME，meInfo 直接給不合格的名字）：上線、邀請、開局、聊天、戰績摘要，這支手機送出去的每一則都不能有那個名字 */
    const { S, B } = h.world(), P = h.phone(S, B, { id: "eeee5555", name: bad }), K = h.phone(S, B, { id: "bbbb2222", name: "乙" });
    P.net.start(); K.net.start(); await S.run(2500);
    const u = wireRet(h, B, "u", P.id), g = await wireStart(S, P, K);
    if (!g) throw new Error("①開不了局，重現無效");
    P.net.say(P.net.side(), "你好"); await S.run(500); await wireResign(S, K, P);
    const G = B.game(g.gid), mine = G.red.id === P.id ? G.red : G.black;
    out.app = { presence: u.name, sameAsDisplay: u.name === T.lbnPick(P.id, bad, {}), inviteFrom: g.from.name, inGame: mine.name, summary: wireRet(h, B, "h", P.id).name, leakedOn: wireLeaks(B, P, bad) };
  }
  { /* ② 只有 net.js（沒有 07x4 的名字檢查、也沒有 XQ_PUBNAME）：沒有人檢查，自由名字一律不送，改送「棋友＋代號」 */
    const { S, B } = h.world(), P = h.phone(S, B, { id: "eeee5555", name: bad, noNameSafe: true }); P.net.start(); await S.run(2500);
    out.bare = { presence: wireRet(h, B, "u", P.id).name, leakedOn: wireLeaks(B, P, bad) };
  }
  { /* ③ 改過的 App（X）原樣送出不合格的名字、接受小明的邀請：小明的手機開局時不把那個名字寫進公開的對局狀態，戰績摘要也不帶 */
    const { S, B } = h.world(), X = h.phone(S, B, { id: "cccc3333", name: bad, noNameSafe: true, ctx: { XQ_PUBNAME: () => "" } }), P = h.phone(S, B, { id: "ffff6666", name: "小明" });
    X.net.start(); P.net.start(); await S.run(2500);
    const sent = wireRet(h, B, "u", X.id).name === bad, g = await wireStart(S, P, X);
    if (!sent || !g) throw new Error("③改過的 App 沒有原樣送出、或開不了局，重現無效");
    await wireResign(S, X, P);
    const G = B.game(g.gid), his = G.red.id === X.id ? G.red : G.black, L = wireRet(h, B, "h", P.id).list || [];
    out.relay = { attackerSentAsIs: sent, nameInGame: his.name, sameAsDisplay: his.name === T.lbnPick(X.id, bad, {}), oppInSummary: L[0] && L[0].opp, leakedOn: wireLeaks(B, P, bad) };
  }
  { /* ④ 改過的 App 當邀請的人（對局狀態是它開的，裡面它自己的名字是它寫的）：小明的戰績摘要不帶那個名字。
       擋不了的照實記在 stateRelayed：小明每走一步、結束時會把整份對局狀態重送，裡面有對方自己寫的名字（簽名和雜湊鏈算到名字，不能改） */
    const { S, B } = h.world(), X = h.phone(S, B, { id: "cccc3333", name: bad, noNameSafe: true, ctx: { XQ_PUBNAME: () => "" } }), P = h.phone(S, B, { id: "ffff6666", name: "小明" });
    X.net.start(); P.net.start(); await S.run(2500);
    const g = await wireStart(S, X, P); if (!g) throw new Error("④開不了局，重現無效");
    await wireResign(S, X, P);
    const L = wireRet(h, B, "h", P.id).list || [], lk = wireLeaks(B, P, bad), saved = P.hist()[0] || {};
    out.relay2 = { savedOppUnchanged: saved.opp === bad, oppInSummary: L[0] && L[0].opp, summaryLeaked: lk.includes("h") || lk.includes("u") || lk.includes("i"), stateRelayed: lk.includes("g") };
  }
  const leaked = out.app.presence === bad || out.app.leakedOn.length > 0 || out.bare.leakedOn.length > 0 || out.relay.leakedOn.length > 0 || out.relay2.summaryLeaked || !out.relay2.oppInSummary;
  return Object.assign(out, { attackSucceeded: leaked });
}
async function nameWireControl() {
  /* 對照：正常名字照樣上線、邀請、開局、進戰績摘要；選了稱號照樣送稱號；沒取名字照舊是「棋友＋代號」；
     舊版外層（只有 XQ_PUBNAME、沒有 XQ_NAMESAFE：新 net.js 配到還沒更新的 07x4）正常名字照舊送 */
  const h = harness(), { S, B } = h.world();
  const P = h.phone(S, B, { id: "ffff6666", name: "小明" }), K = h.phone(S, B, { id: "bbbb2222", name: "乙" });
  const Tt = h.phone(S, B, { id: "dddd4444", name: "小華", ctx: { XQ_PUBNAME: () => "長安小棋童" } }), E = h.phone(S, B, { id: "9abc0000", name: "" });
  const O = h.phone(S, B, { id: "aaaa7777", name: "阿嬤愛下棋", noNameSafe: true, ctx: { XQ_PUBNAME: () => "" } });
  for (const x of [P, K, Tt, E, O]) x.net.start(); await S.run(2500);
  const g = await wireStart(S, P, K); if (!g) return { ok: false, why: "開不了局" };
  await wireResign(S, K, P);
  const G = B.game(g.gid), L = wireRet(h, B, "h", P.id).list || [];
  const r = { presence: wireRet(h, B, "u", P.id).name, inviteFrom: g.from.name, inGame: [G.red.name, G.black.name].sort(), oppInSummary: L[0] && L[0].opp,
    titled: wireRet(h, B, "u", Tt.id).name, noName: wireRet(h, B, "u", E.id).name, oldShell: wireRet(h, B, "u", O.id).name };
  r.ok = r.presence === "小明" && r.inviteFrom === "小明" && JSON.stringify(r.inGame) === JSON.stringify(["乙", "小明"].sort()) && r.oppInSummary === "乙"
    && r.titled === "長安小棋童" && r.noName === "棋友9abc" && r.oldShell === "阿嬤愛下棋";
  return r;
}

/* ================= 案例表 ================= */
const CASES = [
  { id: "R02-A", threat: "T11", expect: "blocked", title: "改過的 App 斷線 12 分鐘、回來自報剩餘 2 分鐘推翻已判的超時",
    attack: "紅方不收訊息 12 分鐘（黑方判紅方超時），回來送一步、lft 自填 120000、鐘不扣；之後黑方認輸（紅方「贏」）", control: "老實玩家落子後斷線 2 分鐘（這步晚到約 2 分鐘）回來：不會不計分，照規則撤回黑方勝場",
    expected: "紅、黑、觀眾、伺服器保留的狀態一致帶「不計分」標記 ns，老實那方（黑方）正式積分不變（以前的「黑方保有勝場」11/13 起改成不計分）", run: () => lateOverride(2 * MIN), control_run: honestLate },
  { id: "R02-A2", threat: "T11", expect: "blocked", title: "同上，但自報剩餘只填 5 秒（較聰明的改法）",
    attack: "紅方不收訊息 12 分鐘，回來送一步、lft 自填 5000；之後黑方認輸", control: "同 R02-A 的老實對照",
    expected: "四方一致不計分、黑方積分不變（11/13 評比第 16 輪第 5 項修好）", run: () => lateOverride(5000), control_run: honestLate },
  { id: "R02-B", threat: "T11", expect: "blocked", title: "改過的 App 每步想 150 秒、自己的鐘一毫秒都不扣",
    attack: "每方 30 分鐘的盤，紅方每步等 150 秒後送出、lft 自填 30000（不呼叫 tickMove），最多 20 步；之後黑方認輸", control: "老實地每步想 20 秒：紅方的鐘照實扣、不會被當成棋鐘不可信",
    expected: "黑方量到紅方用時超過時限＋寬限時，四方一致不計分、黑方積分不變（11/13 修好）", run: noClock, control_run: honestClock },
  { id: "R03-v4", threat: "I5", expect: "blocked", title: "從公開的轉移碼頻道名反推 10 碼轉移碼（v4）",
    attack: "已知前 7 碼，用一次 SHA-256（舊算法）試後 3 碼全部 29,791 組；再量 PBKDF2-SHA512 30 萬次的速度推估 GPU 窮舉", control: "同一組 10 碼兩次導出的頻道 id 相同（新手機打對碼找得到）",
    expected: "快速攻擊找不到；一張 GPU 窮舉最壞 100 年以上", run: xferV4, control_run: xferV4Roundtrip },
  { id: "R03-legacy8", threat: "I5", expect: "blocked", title: "舊版 App 產生的 8 碼轉移碼（v3）：頻道名一次 SHA-256，可以快速反推",
    attack: "隨機 8 碼，已知前 5 碼，用 SHA-256 試後 3 碼；反推出來的碼拿去 App 的下載", control: "同 R03-v4 的對照",
    expected: "已修（評比第 18 輪第 4 項，開發者選「現在就停收」）：8 碼不收，App 不讀不寫任何主題、直接提示重新產生；反推得出碼也拿不到資料",
    run: xferLegacy8, control_run: xferV4Roundtrip },
  { id: "R01-bot", threat: "T9", expect: "blocked", title: "千秋盃虛擬棋客的座位：第三者冒充棋客（sv 2，裁判台代簽）",
    attack: "裁判台開的一盤（簽名版本 sv 2；紅方棋客有裁判台的一次性金鑰、黑方有金鑰的真人），第三者送：①沒簽名的棋客落子 ②自己的金鑰冒簽 ③棋客在別盤的真簽名搬過來 ④棋客舊的那步換更大的 rev 重送",
    control: "裁判台代簽的棋客落子、真人自己簽的落子：觀眾照收；四種攻擊至少擋下 3 則記進可疑事件",
    expected: "四種都不收（11/13 起 sv 2：棋客座位有金鑰、所有動作由裁判台代簽；舊裁判台 sv 1 開的盤不進正式積分，見 R01-sv1）。注意：App 這端對「有金鑰的座位」本來就驗簽，所以 1942 發布版跑這一案也是擋住；sv 2 真正的改動是裁判台（cup-host.js，不公開）給棋客座位金鑰並代簽", run: cupBotSeat, control_run: null },
  { id: "R01-sv1", threat: "S8", expect: "blocked", title: "舊裁判台（sv 1）開的盤、棋客座位沒有金鑰：第三者偽造「棋客認輸」改真人積分",
    attack: "sv 1 的盤（紅方是這支手機、黑方棋客沒有金鑰），甲照常走一步後，第三者送沒簽名的「棋客走一步」再送「棋客認輸」", control: "這支手機照常看到這盤、坐紅方",
    expected: "為了相容照收、照顯示，但這盤不進正式積分（rating()、hist() 不變；簽署完成前關閉計分入口，11/13 起）", run: cupSv1Score, control_run: null },
  { id: "R05-display", threat: "I6", expect: "blocked", title: "大廳顯示別人的名字：聯絡方式、網址、冒充官方、不雅字、看不見的字",
    attack: NAME_KNOWN_BAD.length + " 個惡意名字（例如 加我LINE 12345、www.xx.com、官方客服、零寬字元）", control: NAME_GOOD.length + " 個正常名字（含 能幹、體操、assassin、Scunthorpe 這類容易誤擋的）",
    expected: "惡意的全部換成系統稱號、正常的照原樣（完整案例庫 64＋70＋32＋576 組在 test-name-safe.js）", run: async () => { const r = await nameControl(); return { knownBadMissed: r.knownBadMissed, attackSucceeded: r.knownBadMissed.length > 0 } },
    control_run: async () => { const r = await nameControl(); return { goodBlocked: r.goodBlocked, ok: !r.goodBlocked.length } } },
  { id: "R05-bypass", threat: "I6", expect: "blocked", title: "諧音、注音、拆字、數字代字母的名字繞過檢查",
    attack: (NAME_BYPASS.length + NAME_BYPASS_MORE.length) + " 個：最初的 " + NAME_BYPASS.length + " 個（" + NAME_BYPASS.join("、") + "）＋同一類的其他寫法 " + NAME_BYPASS_MORE.length + " 個（sh!t、ㄎㄠˋㄅㄟˇ、賴ID小明、Offic1al、管裡員、fuk ya…）",
    control: "R05-display 的正常名字＋容易被新規則誤擋的 " + NAME_GOOD_MORE.length + " 個（賴小明、信賴我、上官芳、Fukuoka、Fuk Wing、A55、Messi10、M4ria、Ivan、LG粉絲、ㄍㄢ、干貝…）",
    expected: "已修（評比第 19 輪第 3 項）：全部換成稱號，正常名字 0 誤擋。lbnBad 先把注音、數字符號換回字再比一次，詞表加諧音、形近字、拆字的詞組。"
      + "擋不住的（照實列）：字典不可能列完，沒列到的諧音、小寫 l 冒充大寫 I（LlNE）、圖片字還是照原樣顯示，靠預設稱號、兒童模式一律稱號、檢舉、封鎖",
    run: nameBypass, control_run: nameBypassControl },
  { id: "R05-wire", threat: "I6", expect: "blocked", title: "送出端：不合格的名字不經外層檢查，直接交給 net.js 送上大廳",
    attack: "真正的 src/net.js：①名字是「" + WIRE_BAD + "」、外層沒擋（沒有 XQ_PUBNAME）的手機上線、邀請、開局、聊天、送戰績摘要 ②同一支手機連 07x4 的名字檢查都沒有（只有 net.js）"
      + " ③改過的 App 原樣送出那個名字、接受小明的邀請（小明的手機開局） ④改過的 App 邀請小明（它開局）、下完",
    control: "名字「小明」照常上線、邀請、開局、進戰績摘要；選稱號的照樣送稱號；沒取名字照舊「棋友＋代號」；新 net.js 配到舊版外層（只有 XQ_PUBNAME）正常名字照舊送",
    expected: "已修（評比第 19 輪第 3 項）：①②這支手機送出去的每一則都沒有那個名字（①送的是顯示端會給他的同一個稱號，②送「棋友＋代號」）；③④小明的手機不把那個名字寫進它開的對局、戰績摘要。"
      + "擋不住的（照實列）：伺服器是公開的 MQTT、不檢查內容，改過的 App 自己送的在線狀態、邀請、它開的對局狀態裡的名字照樣在伺服器上（④的紀錄 stateRelayed：對手重送整份對局狀態時也帶著，簽名算到名字、不能改）；"
      + "還沒更新的舊版 App 會照原樣顯示那些，新版（20261113-1345 起）顯示時換成稱號。要從源頭擋，得有自己的伺服器或伺服器端的主題權限",
    run: nameWire, control_run: nameWireControl },
];

/* 跑一案（同一個行程裡只跑一次，test 檔和表格共用） */
const memo = new Map();
function runCase(c) {
  if (!memo.has(c.id)) memo.set(c.id, (async () => {
    const t0 = Date.now(), r = await c.run(), ctl = c.control_run ? await c.control_run() : { ok: r.controlOk !== false };
    const st = r.attackSucceeded ? (c.expect === "open" ? "預期失敗" : "回歸") : (c.expect === "open" ? "預期失敗卻通過" : "通過");
    return { id: c.id, expect: c.expect, attackSucceeded: !!r.attackSucceeded, controlOk: !!ctl.ok, status: ctl.ok ? st : "對照失敗", detail: r, control: ctl, ms: Date.now() - t0 };
  })());
  return memo.get(c.id);
}
module.exports = { CASES, runCase, NAME_BYPASS, NAME_BYPASS_MORE, NAME_KNOWN_BAD, NAME_GOOD, NAME_GOOD_MORE, WIRE_BAD, nameSafe };
