// 評比第 15 輪 X4（評審 P22.1、P22.2、P22.5、P31.3）：連線威脅模型與弱網長測。
//   ① 縮短版弱網長測（tools/net-longrun.js 同一套程式，時數縮短）：高延遲、丟包 40%、反覆斷線、單邊長時間離線、手機時鐘偏差、全部一起，
//      每種都要：每盤四方一致、沒有誤判超時、戰績一致、沒有可疑事件、計時器和 localStorage 沒有越跑越多。
//   ② 長測抓到、這輪修好的 6 個 net.js 問題，各一個針對性的小測試（反向驗證：換回修之前的寫法會失敗，見 threat-model.md「弱網長測」）。
//   ③ threat-model.md 跟程式、測試對照：兩份逐字相同；表裡寫的每個 net.js 函式名稱都真的存在、每個測試檔都真的存在；殘餘風險都有寫。
//   全部用假 MQTT 伺服器＋假時鐘、vm 載入真正的 src/net.js；不連正式或測試伺服器、不開瀏覽器。
// 用法：node --test xiangqi-lab/tools/test-threat-weaknet.js（完整長測：node xiangqi-lab/tools/net-longrun.js）
"use strict";
const { assert, test, fs, path, J, world, phone, move, startGame, noErrors, ROOT, LAB } = require("./net-harness.js");
const { SCENARIOS, longRun, verdict, skewable, MIN } = require("./net-longrun.js");

/* ================= ① 縮短版弱網長測 ================= */
const SHORT = [["高延遲", 0.08], ["丟包 40%", 0.12], ["反覆斷線重連", 0.06], ["單邊長時間離線", 0.2], ["手機時鐘偏差", 0.2], ["全部一起", 0.08]];
for (const [key, scale] of SHORT) {
  const sc = SCENARIOS.find(s => s.name.startsWith(key));
  test(`① 弱網長測（縮短版 ×${scale}）${sc.name}：每盤四方一致、沒有誤判超時、戰績一致、沒有可疑事件、計時器和存檔不會越跑越多`, async () => {
    const r = await longRun(sc, { scale }), why = verdict(r);
    assert.deepEqual(why, [], `種子 ${r.seed}：` + why.join("；"));
    assert.ok(r.games >= 1 && r.consistent === r.games, "每盤都要收斂");
    assert.ok(r.plies >= 20, "至少下了 20 步（實際 " + r.plies + "）");
    assert.ok(r.simH >= sc.hours * scale * 0.9, "模擬時數夠長（" + r.simH + " 小時）");
    if (sc.chaos && sc.chaos.drop) assert.ok(r.chaosN.drop > 0, "真的有掉包");
    if (sc.flap) assert.ok(r.ev.flaps >= 3, "真的有反覆斷線（" + r.ev.flaps + " 次）");
    if (sc.off) assert.ok(r.ev.offs >= 1, "真的有長時間離線");
    if (sc.skew && sc.skew.jump) assert.equal(r.ev.jumps, 1, "真的有中途調時間");
    assert.ok(r.lagOpp.max < 15 * MIN, "對方最慢也在 15 分鐘內收到每一步（實際 " + Math.round(r.lagOpp.max / 1000) + " 秒）");
  });
}

/* ================= ② 這輪修好的問題 ================= */
const offEach = (P, ms) => { P.offline(); return ms };
test("② 手機時鐘偏差 3 分鐘也開得了局（以前邀請、接受只收對方手機時間 2 分鐘內的，慢的那支送的全被丟掉）；同一則邀請重複送只跳一次", async () => {
  const { S, B } = world();
  const A = phone(S, B, { id: "aaaa1111", name: "甲" }), K = phone(S, B, { id: "bbbb2222", name: "乙" });
  skewable(A); skewable(K); A.skew(3 * MIN); K.skew(-40000);
  A.net.start(); K.net.start(); await S.run(2000);
  const invs = []; K.net.on("invite", x => invs.push(x));
  A.net.invite({ id: K.id, name: "乙" }); await S.run(1000);
  assert.equal(invs.length, 1, "乙收到邀請");
  const raw = B.log.filter(l => l.topic === `${ROOT}/i/${K.id}`).pop(); B.publish(raw.topic, raw.payload, false); await S.run(1000);
  assert.equal(invs.length, 1, "同一則邀請（同一個 gid）再送一次不會再跳");
  K.net.respond(invs[0], true); await S.run(2000);
  assert.ok(A.net.game() && K.net.game(), "雙方都拿到對局（甲手機快 3 分 40 秒，乙的接受照收）");
  assert.equal(A.net.signState(), "signed");
  noErrors(S);
});

test("② 再來一局：雙方棋鐘重設成時制（以前沿用上一盤剩下的，連下幾盤就一開局被判時間用完）", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  for (const [P, u] of [[red, "h2e2"], [black, "h7e7"], [red, "h0g2"], [black, "h9g7"]]) { await S.run(40000); move(P, u); await S.run(2000) }
  const c0 = red.net.clocks(); assert.ok(c0.r < 30 * MIN - 60000 && c0.b < 30 * MIN - 60000, "兩邊都用掉一些時間");
  red.net.update(n => { n.result = { w: "b", why: "紅方認輸" }; n.draw = null }); await S.run(3000);
  black.net.update(n => { const t = n.red; n.red = n.black; n.black = t; n.moves = []; n.result = null; n.draw = null; n.id = "rm-test-1" }); await S.run(3000);
  for (const P of [red, black]) { const g = P.net.game(); assert.equal(g.id, "rm-test-1"); assert.deepEqual(J(g.clk), { r: 30 * MIN, b: 30 * MIN }, P.tag + " 新的一盤棋鐘重設") }
  assert.deepEqual(J(B.game(gid).clk), { r: 30 * MIN, b: 30 * MIN }, "伺服器上的也是");
  noErrors(S);
});

test("② 自己落子時連線其實已經斷了：5 分鐘後連回來，不會一連上就判對方超時（對方一步都沒看到）；對方從真正收到那一刻起算", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(2000); move(black, "h7e7"); await S.run(2000);
  let wrong = 0; red.net.on("game", () => { const g = red.net.game(); if (g && g.result && g.result.w === "r") wrong++ });
  red.offline(); await S.run(3000); move(red, "h0g2");   /* 看門狗還沒發現斷線：這步送出去就掉了 */
  await S.run(5 * MIN); red.online(); red.fire("online");
  assert.ok(await S.until(() => black.net.game().moves.length === 3, 60000), "黑方收到紅方那步");
  await S.run(20000);
  assert.equal(wrong, 0, "紅方的手機沒有判黑方超時");
  const g = black.net.game(); assert.ok(!g.result || g.result.w !== "r", "黑方沒有被判超時");
  if (!g.result) { move(black, "h9g7"); await S.run(3000); assert.equal(red.net.game().moves.length, 4, "接著下") }
  assert.deepEqual(J({ m: red.net.game().moves, r: red.net.game().result }), J({ m: black.net.game().moves, r: black.net.game().result }), "雙方一致");
  noErrors(S);
});

test("② 手機時間被往回調 10 分鐘：照樣在 3 分鐘左右判對方超時（以前要多等 10 分鐘），對方也收", async () => {
  const { S, B } = world(), { red, black } = await startGame(S, B);
  skewable(red); skewable(black); await S.run(3000);
  const t0 = S.now; move(red, "h2e2"); await S.run(60000); red.skew(-10 * MIN);   /* 輪到黑方；黑方不走。1 分鐘後紅方的手機時間被往回調 10 分鐘 */
  const ok = await S.until(() => { const g = red.net.game(); return !!(g && g.result) }, 6 * MIN);
  assert.ok(ok, "紅方判得出黑方超時");
  const dt = S.now - t0; assert.ok(dt >= 3 * MIN && dt < 3 * MIN + 15000, "大約 3 分鐘（實際 " + Math.round(dt / 1000) + " 秒）");
  assert.equal(red.net.game().result.w, "r");
  assert.ok(await S.until(() => !!black.net.game().result, 30000)); assert.equal(black.net.game().result.w, "r", "黑方自己的鐘也同意");
  noErrors(S);
});

test("② 兩邊都判了超時的分岔（乙斷線中、甲落子後判乙超時；乙一連上、還沒收到就判甲超時）：兩邊收斂到同一份、不會雙方都記勝", async () => {
  const { S, B } = world(), { red, black, gid } = await startGame(S, B);
  move(red, "h2e2"); await S.run(2000); move(black, "h7e7"); await S.run(2000);
  black.offline(); await S.run(1000);   /* 黑方斷線 */
  move(red, "h0g2");                     /* 紅方落子（伺服器收到了，黑方收不到） */
  await S.run(5 * MIN);                  /* 紅方等了 5 分鐘，判黑方超時（規則內：黑方斷線） */
  assert.ok(red.net.game().result && red.net.game().result.w === "r", "紅方判了黑方超時");
  black.lag = 4000; black.online(); black.fire("online");   /* 黑方連回來、收訊很慢：還沒收到紅方那步和判決，自己的鐘看紅方已經 5 分鐘沒走，先判紅方超時 */
  const same = () => { const a = red.net.game(), b = black.net.game(), c = B.game(gid); return JSON.stringify([a.moves, a.result]) === JSON.stringify([b.moves, b.result]) && JSON.stringify([a.moves, a.result]) === JSON.stringify([c.moves, c.result]) };
  assert.ok(await S.until(same, 10 * MIN), "兩邊、伺服器收斂到同一份");
  black.lag = 0; await S.run(60000); assert.ok(same(), "收斂後不再變");
  const rh = red.hist().filter(h => h.gid === gid).map(h => h.res), bh = black.hist().filter(h => h.gid === gid).map(h => h.res);
  assert.ok(!(rh.includes("w") && bh.includes("w")), "不會雙方都記勝：" + JSON.stringify([rh, bh]));
  noErrors(S);
});

/* ================= ③ 威脅模型文件跟程式、測試對照 ================= */
const DOC = path.join(LAB, "site", "data", "docs", "threat-model.md"), DOC2 = path.join(LAB, "..", "xiangqi-db", "art", "docs", "threat-model.md");
const NET = fs.readFileSync(path.join(LAB, "src", "net.js"), "utf8");
test("〔原始碼〕threat-model.md：兩份逐字相同、LF、沒有控制字元和三個反引號的程式碼框", () => {
  const a = fs.readFileSync(DOC), b = fs.readFileSync(DOC2);
  assert.ok(a.equals(b), "art/docs 和 site/data/docs 兩份要一樣");
  const s = a.toString("utf8");
  assert.ok(!s.includes("\r"), "要 LF"); assert.ok(!/[\x00-\x08\x0b-\x1f\x7f]/.test(s), "不能有控制字元"); assert.ok(!s.includes("```"));
});
/* 公開倉庫 CI：要接不公開營運程式（千秋盃裁判台 cup-host.js，開發者 11/22 選不公開）的測試不在 tools/，
   但一定要列在 STAGE-MANIFEST.json 的 excludedTests 並寫原因，才算「存在」；隨便寫一個檔名還是會擋（W69 第 8 項） */
const PRIV_TESTS = (() => {
  for (let d = __dirname, i = 0; i < 6; i++, d = path.dirname(d)) for (const f of [path.join(d, "STAGE-MANIFEST.json"), path.join(d, "source", "STAGE-MANIFEST.json")]) {
    try { const e = JSON.parse(fs.readFileSync(f, "utf8")).excludedTests || {}; const o = {}; for (const [k, why] of Object.entries(e)) if (String(why).trim().length >= 4) o[k] = why; return o } catch (e2) { }
  }
  return {};
})();
test("〔原始碼〕threat-model.md 的對照表：每一列都有編號、寫到的 net.js 名稱都存在、測試檔都存在", () => {
  const s = fs.readFileSync(DOC, "utf8"), rows = s.split("\n").filter(l => /^\| [STRIDE]\d+ \|/.test(l));
  assert.ok(rows.length >= 20, "至少 20 個威脅（實際 " + rows.length + "）");
  const kinds = new Set(rows.map(l => l[2])); for (const k of "STRIDE") assert.ok(kinds.has(k), "STRIDE 六類都要有：缺 " + k);
  const ids = new Set();
  for (const l of rows) {
    const id = l.split("|")[1].trim(); assert.ok(!ids.has(id), "編號重複 " + id); ids.add(id);
    const cells = l.split("|").map(c => c.trim()); assert.ok(cells.length >= 8, id + " 欄位不夠");
    const names = [...l.matchAll(/`([A-Za-z_$][\w$]*)`/g)].map(m => m[1]);
    for (const n of names) assert.ok(new RegExp("(function |const |let |[,{ ;])" + n.replace(/\$/g, "\\$") + "\\b").test(NET), id + "：net.js 裡找不到 " + n);
    for (const t of l.matchAll(/(test-[\w-]+\.js|net-longrun\.js)/g)) assert.ok(fs.existsSync(path.join(__dirname, t[1])) || PRIV_TESTS[t[1]], id + "：找不到測試 " + t[1]);
    assert.ok(cells[6] && cells[6] !== "-", id + " 要寫殘餘風險（沒有就寫「低」並說明）");
  }
});
test("〔原始碼〕threat-model.md 照實寫擋不住的：第一次見面冒充、上線狀態不簽、千秋盃每步不簽、改過的 App 捏造戰績、時鐘往前跳、伺服器營運者看得到全部", () => {
  const s = fs.readFileSync(DOC, "utf8");
  for (const k of ["第一次見面", "上線狀態本身沒有簽名", "千秋盃", "捏造", "往前調", "伺服器營運者", "沒有端對端加密", "婉拒、取消", "棋鐘"]) assert.ok(s.includes(k), "要寫到：" + k);
  for (const k of ["net-longrun.js", "test-threat-weaknet.js", "STRIDE"]) assert.ok(s.includes(k), k);
});

/* T4（開發者 11/13 選「現在修」）：改過的 App 簽一份只改棋鐘的狀態——以前對方手機照收、下一步就被判超時；修好後 okNext 的 clkOk／clkFresh 擋下 */
test("② T4 棋鐘竄改：改我的鐘、偷加自己的鐘、改時制或加秒都不收；照常落子、判超時照舊", async () => {
  const { S, B } = world(), { red, black } = await startGame(S, B);
  move(red, "h2e2"); await S.run(2000); move(black, "h7e7"); await S.run(2000);
  const real = black.net.game().clk.b;
  red.net.update(n => { n.clk.b = 1000; n.clk.r = 3 * 3600e3 }); await S.run(3000);
  assert.ok(Math.abs(black.net.game().clk.b - real) < 1, "黑方的鐘沒被改成 1 秒（實際 " + black.net.game().clk.b + "）");
  assert.ok(black.net.game().clk.r < 31 * MIN, "紅方偷加成 3 小時的鐘也不收");
  move(red, "h0g2"); await S.run(7000);
  assert.equal(black.net.game().result, null, "紅方（改過的 App）自己判黑方超時，黑方不收");
  /* 時制、加秒開局後不能改 */
  const { S: S2, B: B2 } = world(), g2 = await startGame(S2, B2);
  move(g2.red, "h2e2"); await S2.run(2000);
  const tc0 = g2.black.net.game().tc;
  g2.red.net.update(n => { n.inc = 600000 }); await S2.run(3000);
  assert.ok(!(+g2.black.net.game().inc > 0), "加秒不能偷改");
  g2.red.net.update(n => { n.tc = 999 }); await S2.run(3000);
  assert.equal(g2.black.net.game().tc, tc0, "時制不能偷改");
  /* 被擋之後，沒竄改的黑方自己照常可以走（竄改的紅方 App 本機留著假加秒，它之後送的每一步本來就該被擋；正常對局不被誤擋由上面 ① 六種弱網長測涵蓋） */
  move(g2.black, "h7e7"); await S2.run(2000);
  assert.equal(g2.black.net.game().moves.length, 2, "黑方照常落子");
  const N = fs.readFileSync(path.join(LAB, "src", "net.js"), "utf8");
  assert.match(N, /if\(!clkOk\(a,b,me\)\)return false;/, "okNext 一定要核對棋鐘");
  assert.match(N, /&&!b\.moves\.length&&clkFresh\(a,b\);/, "再來一局要是全新的棋鐘");
});
