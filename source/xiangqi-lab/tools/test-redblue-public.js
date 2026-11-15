// 紅藍隊攻擊重現的 node:test 版（評比第 17 輪 F1：公開紅藍隊與名稱安全測試；案例在 redblue-cases.js，表格版是 redblue-run.js）
// 已修好的（blocked）：攻擊要被擋住，一般測試。
// 還沒修的（open）：斷言照「修好以後」寫，現在會失敗，用 node:test 的 todo 標記＝「預期失敗」：TAP 印 not ok … # TODO，不讓整批變紅，
//   testkinds.js 另外統計；哪天變成通過（ok … # TODO）＝漏洞可能修好了，testkinds.js 會當成失敗，提醒把那一案改成 blocked。
// 每一案的正常對照另外是一般測試：對照壞了一定會紅，不會被 todo 蓋掉。
// 評比第 19 輪第 3 項：R05-bypass、R05-wire 修好，從預期失敗（todo）改成一般測試（現在沒有 open 的案例；以後再有還沒修的，照上面的 todo 寫法加回來）。
//   後半另外補：最初 18 個繞過逐一檢查、正常名字照舊、送出端和顯示端同一套規則、舊存檔和舊版 App 相容。
// 不連網、不開瀏覽器、不需要千秋盃裁判台程式。用法：node --test xiangqi-lab/tools/test-redblue-public.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict"), fs = require("fs"), path = require("path");
const { CASES, runCase, NAME_BYPASS, NAME_BYPASS_MORE, NAME_KNOWN_BAD, NAME_GOOD, NAME_GOOD_MORE, WIRE_BAD, nameSafe } = require("./redblue-cases.js");

for (const c of CASES) {
  const name = `${c.id}（${c.threat}）${c.title}`;
  if (c.expect === "blocked") {
    test(`${name}：攻擊要被擋住`, async () => { const r = await runCase(c); assert.equal(r.attackSucceeded, false, "攻擊成功（回歸）：" + JSON.stringify(r.detail)) });
  } else {
    test(`${name}：修好後攻擊要被擋住（還沒修，預期失敗）`, { todo: "還沒修：" + c.why }, async () => { const r = await runCase(c); assert.equal(r.attackSucceeded, false, "漏洞還在：" + JSON.stringify(r.detail)) });
  }
  test(`${c.id} 正常對照：${c.control}`, async () => { const r = await runCase(c); assert.equal(r.controlOk, true, "對照不正常：" + JSON.stringify(r.control)) });
}
test("案例表：每一案都有攻擊、對照、預期；還沒修的寫了為什麼；R05-bypass、R05-wire 已修（blocked），預期裡照實寫了擋不住的部分", () => {
  for (const c of CASES) {
    assert.ok(c.id && c.title && c.attack && c.control && c.expected, c.id);
    assert.ok(c.expect === "blocked" || c.expect === "open", c.id);
    if (c.expect === "open") assert.ok(c.why && c.why.length > 10, c.id + " 要寫為什麼還沒修");
  }
  for (const id of ["R05-bypass", "R05-wire"]) {
    const c = CASES.find(x => x.id === id); assert.ok(c, id);
    assert.equal(c.expect, "blocked", id + " 第 19 輪第 3 項已修");
    assert.match(c.expected, /擋不住的（照實列）/, id + " 修好了也要寫還擋不住什麼");
  }
});

/* ================= 評比第 19 輪第 3 項：名字送出與繞過（R05-bypass、R05-wire）補充測試 ================= */
const h = require("./net-harness.js"), T = nameSafe();
const M_DIR = process.env.XQ_M_DIR || path.join(__dirname, "..", "..", "xiangqi-db", "m");
const SAFE_SRC = fs.readFileSync(path.join(M_DIR, "07x4-lobbysafe.js"), "utf8"), NET_SRC = h.NET_SRC;
const ret = (B, k, id) => JSON.parse(B.retained.get(`${h.ROOT}/${k}/${id}`) || "{}");
const isTitle = nm => !!nm && T.lbnPick("zz", nm, { kid: true }) === nm;   /* 兒童在看時只有系統稱號照原樣 */

test("R05-bypass 最初的 18 個繞過寫法，一個一個檢查：都判不合格、顯示成系統稱號（照代號算）", () => {
  assert.equal(NAME_BYPASS.length, 18, "最初那 18 個不增不減");
  const want = { "淦你娘": "rude", "干你娘": "rude", "ㄍㄢˋ你娘": "rude", "phuck": "rude", "fuk u": "rude", "sh1t": "rude", "a$$hole": "rude", "b1tch": "rude", "賴我": "contact", "ㄌㄞˊ我": "contact",
    "賴：abc": "contact", "電報小明": "contact", "TG小明": "contact", "Iine小明": "contact", "1ine小明": "contact", "管里員": "imp", "Adm1n": "imp", "4dmin": "imp" };
  NAME_BYPASS.forEach((nm, i) => {
    assert.equal(T.lbnBad(nm), want[nm], JSON.stringify(nm) + " 要判成 " + want[nm]);
    const shown = T.lbnPick("p" + i, nm, {}); assert.notEqual(shown, nm); assert.ok(isTitle(shown), nm + " 要換成稱號（實際 " + shown + "）");
  });
});
test("R05-bypass 同一類的其他寫法 " + NAME_BYPASS_MORE.length + " 個（數字符號代字母、注音、賴、形近字、諧音；不在最初 18 個裡）也都擋", () => {
  assert.ok(NAME_BYPASS_MORE.length >= 60);
  assert.ok(!NAME_BYPASS_MORE.some(n => NAME_BYPASS.includes(n)), "不能跟最初那 18 個重複");
  const miss = NAME_BYPASS_MORE.filter(n => !T.lbnBad(n));
  assert.deepEqual(miss, [], "沒擋到：" + miss.join("、"));
});
test("正常名字照舊：R05 的正常名字 " + NAME_GOOD.length + " 個＋容易被新規則誤擋的 " + NAME_GOOD_MORE.length + " 個，判定和顯示都照原樣（0 誤擋）", () => {
  assert.ok(NAME_GOOD_MORE.length >= 200);
  const wrong = NAME_GOOD.concat(NAME_GOOD_MORE).filter(n => T.lbnBad(n) || T.lbnPick("p1", n, {}) !== n).map(n => n + "→" + T.lbnBad(n));
  assert.deepEqual(wrong, [], "誤擋：" + wrong.join("、"));
  /* 幾組一定要分得開的：左邊擋、右邊不擋 */
  for (const [bad, good] of [["賴我", "信賴我"], ["賴ID小明", "賴Ida"], ["賴：abc", "賴小明"], ["fuk u", "Fuk Wing"], ["phuk", "Phuket"], ["a55hole", "A55"], ["sh1t", "Sh1rt"], ["c0ck", "C0ckpit"],
    ["4dmin", "D4vid"], ["TG小明", "TGIF"], ["Iine小明", "Ivan"], ["1ine小明", "L1n"], ["管里員", "里長伯"], ["宮方", "上官芳"], ["ㄍㄢˋ你娘", "ㄍㄢ"], ["ㄌㄞˊ我", "ㄌㄞ"], ["干你娘", "干貝"], ["淦你", "江淦"], ["電報小明", "電視報"]]) {
    assert.ok(T.lbnBad(bad), bad + " 要擋"); assert.equal(T.lbnBad(good), "", good + " 不能擋");
  }
});
test("送出端和顯示端同一套規則：" + (NAME_KNOWN_BAD.length + NAME_BYPASS.length + NAME_GOOD.length + 12) + " 個名字各用一支手機上線，net.js 送上大廳的名字＝顯示端 lbnPick 給的名字", async () => {
  const names = [...NAME_KNOWN_BAD, ...NAME_BYPASS, ...NAME_GOOD, ...NAME_BYPASS_MORE.slice(0, 6), ...NAME_GOOD_MORE.slice(0, 6)].filter(n => n !== "");
  const { S, B } = h.world(), P = names.map((nm, i) => h.phone(S, B, { id: "n" + String(i).padStart(3, "0") + "abcd", name: nm }));
  for (const p of P) p.net.start(); await S.run(3000);
  let bad = 0, good = 0;
  names.forEach((nm, i) => {
    const sent = ret(B, "u", P[i].id).name, shown = T.lbnPick(P[i].id, nm, {});
    assert.equal(sent, shown, JSON.stringify(nm) + "：送出 " + sent + "，顯示端 " + shown);
    if (T.lbnBad(nm)) { bad++; assert.ok(isTitle(sent), nm + " 送出的要是稱號"); assert.ok(!B.log.some(l => l.from === P[i].tag && l.payload.includes(nm)), nm + " 不能出現在這支手機送的任何訊息裡") }
    else { good++; assert.equal(sent, nm, nm + " 正常名字照原樣送") }
  });
  assert.ok(bad >= 30 && good >= 15, "不合格 " + bad + "、正常 " + good);
  h.noErrors(S);
});
test("〔原始碼〕同一個函式：net.js 對外的名字（me、開局寫進對局的對方名字、戰績摘要的對手名字）都過 outNm→XQ_NAMESAFE；07x4 的 XQ_NAMESAFE 就是 lbnBad、lbnPick；XQ_PUBNAME、lbnShow 也是它們", () => {
  assert.ok(/const outNm=\(id,nm\)=>/.test(NET_SRC), "net.js 有 outNm");
  assert.ok(/const me=\(\)=>\{[^\n]*name:outNm\(m\.id,pubNm\(m\)\|\|m\.name\)\}\};/.test(NET_SRC), "me() 最後一道");
  assert.ok(/name:outNm\(x\.from\.id,x\.from\.name\)/.test(NET_SRC), "開局時對方的名字");
  assert.ok(/opp:h\.opp\?outNm\(h\.oid,h\.opp\):h\.opp/.test(NET_SRC), "戰績摘要的對手名字");
  assert.ok(/const N=window\.XQ_NAMESAFE;/.test(NET_SRC) && /N\.pick\(id,nm,\{\}\)/.test(NET_SRC), "outNm 問 XQ_NAMESAFE");
  /* 收到的名字（x.from.name）只剩交給畫面的事件（emit，畫面走 lbnShow）和除錯紀錄用；要送出去的物件裡沒有原樣的。
     name:m.name 的 m 都是 me() 的回傳（已經過 outNm）；name:to.name 是自己手機記的邀請對象，不送出去 */
  const rest = NET_SRC.split("\n").filter(l => /name:x\.from\.name\b/.test(l.replace(/emit\([^{}()]*\{[^{}]*\}\)/g, "")));
  assert.deepEqual(rest.map(l => l.trim().slice(0, 60)), [], "沒有把收到的名字原樣放進要送出去的物件");
  for (const m of NET_SRC.matchAll(/name:m\.name\b/g)) { const pre = NET_SRC.slice(Math.max(0, m.index - 700), m.index); assert.ok(/(?:const |[,;{(])m=me\(\)/.test(pre), "name:m.name 的 m 要是 me()：" + pre.slice(-80)) }
  assert.ok(/^window\.XQ_NAMESAFE=\{bad:lbnBad,pick:lbnPick\};\r?$/m.test(SAFE_SRC), "07x4 的 XQ_NAMESAFE 就是 lbnBad、lbnPick");
  assert.ok(/function lbsSelfBad\(nm\)\{[^\n]*return lbnBad\(nm\)/.test(SAFE_SRC), "XQ_PUBNAME 判斷自己的名字用 lbnBad");
  assert.ok(/function lbnShow\(a,b\)\{[\s\S]{0,300}lbnPick\(id,nm,/.test(SAFE_SRC), "顯示端 lbnShow 用 lbnPick");
  assert.ok(/function lbnPick\([\s\S]{0,300}lbnBad\(nm\)/.test(SAFE_SRC), "lbnPick 用 lbnBad");
});

/* ---------- 舊版相容：舊存檔裡的名字、舊版 App 送來的名字都不會壞；資料不改，只在送出和顯示的當下判斷 ---------- */
test("相容：舊存檔裡的名字（舊規則當時可以用、新規則不合格：淦你娘、sh1t、賴我）——存檔一個字都不改，自己畫面照常顯示自己取的名字，對外送稱號；合格的舊名字完全照舊", async () => {
  for (const [nm, ok] of [["淦你娘", false], ["sh1t", false], ["賴我", false], ["阿嬤愛下棋", true], ["Messi10", true], ["棋友28AB", true]]) {
    const { S, B } = h.world(), saved = JSON.stringify({ id: "eeee5555", name: nm }), st = h.memStorage([["xq_me", saved]]);
    const P = h.phone(S, B, { id: "eeee5555", name: nm, storage: st, ctx: { meInfo: () => JSON.parse(st.getItem("xq_me")) } }), K = h.phone(S, B, { id: "bbbb2222", name: "乙" });
    P.net.start(); K.net.start(); await S.run(2500);
    let inv = null; K.net.on("invite", x => { inv = x }); P.net.invite({ id: K.id, name: "乙" }); await S.run(500); assert.ok(inv, nm + "：邀請送得出去");
    K.net.respond(inv, true); await S.run(1500);
    const mine = g => g.red.id === P.id ? g.red : g.black, pub = ret(B, "u", P.id).name;
    assert.equal(st.getItem("xq_me"), saved, nm + "：存檔（xq_me）不改");
    assert.equal(mine(P.net.game()).name, nm, nm + "：自己畫面上的對局顯示自己取的名字");
    if (ok) { assert.equal(pub, nm, nm + "：照舊送自己的名字"); assert.equal(mine(B.game(P.net.gid())).name, nm); assert.equal(inv.from.name, nm) }
    else { assert.ok(isTitle(pub), nm + "：對外送稱號（實際 " + pub + "）"); assert.equal(mine(B.game(P.net.gid())).name, pub); assert.equal(inv.from.name, pub);
      assert.ok(!B.log.some(l => l.from === P.tag && l.payload.includes(nm)), nm + "：不出現在送出去的訊息裡") }
    h.move(P.net.side() === "r" ? P : K, "h2e2"); await S.run(2000);
    assert.equal(P.net.game().moves.length, 1, nm + "：照常下棋"); assert.equal(K.net.game().moves.length, 1);
    h.noErrors(S);
  }
});
test("相容：舊存檔裡的戰績（xq_rate，舊版存的對手名字，有不合格的、有更舊沒存對手代號的）——載入不壞、存檔不改、自己看到的照舊，公開的戰績摘要裡不合格的換稱號、合格的照原樣", async () => {
  const hist = [{ gid: "g1", rid: "r1", opp: WIRE_BAD, oid: "cccc3333", res: "w", d: 12, pts: 12, why: "黑方認輸", n: 30, at: h.T0 - 86400000, sd: "r" },
    { gid: "g2", rid: "r2", opp: "阿華", oid: "dddd4444", res: "l", d: -8, pts: 0, why: "紅方認輸", n: 22, at: h.T0 - 2 * 86400000, sd: "b" },
    { gid: "g3", opp: "淦你娘", res: "d", d: 0, pts: 8, why: "和棋", n: 60, at: h.T0 - 3 * 86400000 },
    { gid: "g4", opp: "老王", res: "w", d: 8, pts: 8, why: "", n: 41, at: h.T0 - 4 * 86400000 }];
  const saved = JSON.stringify({ pts: 12, w: 2, l: 1, d: 1, hist }), st = h.memStorage([["xq_rate", saved]]);
  const { S, B } = h.world(), P = h.phone(S, B, { id: "ffff6666", name: "小明", storage: st });
  P.net.start(); await S.run(2500); P.net.pubProf(); await S.run(1000);
  assert.equal(st.getItem("xq_rate"), saved, "存檔（xq_rate）不改");
  assert.deepEqual(h.J(P.net.rating().hist.map(x => x.opp)), [WIRE_BAD, "阿華", "淦你娘", "老王"], "自己讀到的戰績照舊（畫面顯示時另外走 lbnShow）");
  assert.equal(P.net.rating().pts, 12);
  const L = ret(B, "h", P.id).list; assert.equal(L.length, 4);
  assert.equal(L[0].opp, T.lbnPick("cccc3333", WIRE_BAD, {}), "不合格：換成照對手代號算的稱號（跟顯示端一樣）"); assert.equal(L[0].oid, "cccc3333");
  assert.equal(L[1].opp, "阿華"); assert.equal(L[3].opp, "老王", "更舊的紀錄（沒有對手代號）合格名字照原樣");
  assert.equal(L[2].opp, T.lbnPick("", "淦你娘", {}), "沒有代號就用名字算稱號"); assert.ok(isTitle(L[2].opp));
  assert.deepEqual(L.map(x => [x.gid, x.res, x.n]), hist.map(x => [x.gid, x.res, x.n]), "其他欄位照舊");
  assert.ok(!B.log.some(l => l.from === P.tag && (l.payload.includes(WIRE_BAD) || l.payload.includes("淦你娘"))));
  h.noErrors(S);
});
test("相容：舊版 App 送來的在線狀態（舊格式：沒有 v、ts）——照收、資料不改；顯示端合格的照原樣、不合格的換稱號；新舊格式一起在名冊裡", async () => {
  const { S, B } = h.world(), P = h.phone(S, B, { id: "ffff6666", name: "小明" }), K = h.phone(S, B, { id: "bbbb2222", name: "乙" });
  P.net.start(); K.net.start(); await S.run(2500);
  const old = (id, name) => B.publish(`${h.ROOT}/u/${id}`, JSON.stringify({ id, name, st: "idle", gid: null, pts: 100, tc: 30, w: 3, l: 2, d: 1, at: S.now }), true);
  old("aaaa0001", "阿嬤愛下棋"); old("aaaa0002", WIRE_BAD); old("aaaa0003", "sh1t"); old("aaaa0004", "棋友28AB"); old("aaaa0005", "長安小棋童"); old("aaaa0006", "<img src=x onerror=1>");
  await S.run(1500);
  const by = Object.fromEntries(h.J(P.net.people()).map(x => [x.id, x.name]));
  assert.deepEqual([by.aaaa0001, by.aaaa0002, by.aaaa0003, by.aaaa0004, by.aaaa0005, by.bbbb2222], ["阿嬤愛下棋", WIRE_BAD, "sh1t", "棋友28AB", "長安小棋童", "乙"], "名冊資料照收、不改別人送來的內容");
  const show = id => P.ctx.XQ_NAMESAFE.pick(id, by[id], {});
  assert.equal(show("aaaa0001"), "阿嬤愛下棋"); assert.equal(show("aaaa0004"), "棋友28AB"); assert.equal(show("aaaa0005"), "長安小棋童"); assert.equal(show("bbbb2222"), "乙");
  for (const id of ["aaaa0002", "aaaa0003", "aaaa0006"]) { assert.ok(isTitle(show(id)), by[id] + " 顯示成稱號"); assert.equal(show(id), T.lbnPick(id, by[id], {})) }
  h.noErrors(S);
});
test("相容：新 net.js 配到還沒更新的 07x4（只有 XQ_PUBNAME、沒有 XQ_NAMESAFE）——照舊聽 XQ_PUBNAME：回空字串送自己的名字、回稱號送稱號；兩個都沒有才改送「棋友＋代號」", async () => {
  const { S, B } = h.world();
  const A = h.phone(S, B, { id: "aaaa1111", name: "阿嬤愛下棋", noNameSafe: true, ctx: { XQ_PUBNAME: () => "" } });
  const K = h.phone(S, B, { id: "bbbb2222", name: "小華", noNameSafe: true, ctx: { XQ_PUBNAME: () => "洛陽小棋士" } });
  const N = h.phone(S, B, { id: "cccc3333", name: "小明", noNameSafe: true }), E = h.phone(S, B, { id: "dddd4444", name: "", noNameSafe: true });
  for (const p of [A, K, N, E]) p.net.start(); await S.run(2500);
  assert.equal(ret(B, "u", A.id).name, "阿嬤愛下棋"); assert.equal(ret(B, "u", K.id).name, "洛陽小棋士");
  assert.equal(ret(B, "u", N.id).name, "棋友cccc", "沒有任何名字檢查在場：自由名字不送"); assert.equal(ret(B, "u", E.id).name, "棋友dddd", "沒取名字：照舊");
  assert.equal(N.ctx.meInfo().name, "小明", "自己的名字還在（只是對外不送）");
  h.noErrors(S);
});
/* 舊版 net.js 的複本（fixtures/net-x2-1113.js）公開倉庫不放（oss-stage.js），那裡沒有就不跑這一項 */
const OLD_NET = (() => { try { return fs.readFileSync(path.join(__dirname, "fixtures", "net-x2-1113.js"), "utf8") } catch (e) { return null } })();
if (OLD_NET) for (const [name, o, oldIs] of [["新版開局、舊版接受", { K: { src: OLD_NET } }, "K"], ["舊版開局、新版接受", { A: { src: OLD_NET } }, "A"]]) {
  test("相容：跟舊版 App（11/13 的 net.js，沒有送出端檢查）互通——" + name + "：正常名字兩邊都照原樣寫進對局、照常下棋", async () => {
    const { S, B } = h.world(), g = await h.startGame(S, B, o), G = B.game(g.gid);
    assert.deepEqual([G.red.name, G.black.name].sort(), ["乙", "甲"].sort());
    h.move(g.red, "h2e2"); await S.run(2000); h.move(g.black, "h7e7"); await S.run(2000);
    assert.equal(g.red.net.game().moves.length, 2); assert.equal(g.black.net.game().moves.length, 2); assert.deepEqual(h.core(g.red.net.game()), h.core(g.black.net.game()));
    h.noErrors(S);
  });
  test("相容：舊版 App 的名字不合格（舊版原樣送出）——" + name + "：新版自己開的對局不寫那個名字（換稱號），舊版開的對局資料不改、新版顯示端換稱號；兩種都照常下棋、收斂", async () => {
    const who = oldIs, oo = { A: Object.assign({}, o.A || {}), K: Object.assign({}, o.K || {}) }; oo[who].name = WIRE_BAD;
    const { S, B } = h.world(), g = await h.startGame(S, B, oo), G = B.game(g.gid), oldP = g[who], newP = who === "A" ? g.K : g.A;
    const his = G.red.id === oldP.id ? G.red : G.black, shown = T.lbnPick(oldP.id, WIRE_BAD, {});
    assert.equal(ret(B, "u", oldP.id).name, WIRE_BAD, "舊版原樣送出（這個擋不了，照實驗證）");
    if (who === "K") assert.equal(his.name, shown, "新版開局：對局狀態裡是稱號");
    else assert.equal(his.name, WIRE_BAD, "舊版自己開的局：它寫什麼就是什麼（簽名算到名字，新版不改）");
    assert.equal(newP.ctx.XQ_NAMESAFE.pick(his.id, his.name, {}), shown, "新版顯示端看到的都是同一個稱號");
    h.move(g.red, "h2e2"); await S.run(2000); h.move(g.black, "h7e7"); await S.run(2000);
    assert.equal(g.red.net.game().moves.length, 2); assert.equal(g.black.net.game().moves.length, 2); assert.deepEqual(h.core(g.red.net.game()), h.core(g.black.net.game()), "名字換不換都不影響下棋");
    h.noErrors(S);
  });
}
