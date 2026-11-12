// 評審 P22.1／P22.2（連線與雲端架構師）：混沌網路下的線上對局容錯實測。
//   用 tools/net-harness.js 的假 MQTT 伺服器、假時鐘、vm 載入真正的 src/net.js；假伺服器開「混沌模式」（B.setChaos）：
//   雙向的 PUBLISH 封包照設定的機率掉包、重複、插隊（亂序），再加隨機延遲；亂數全部用固定種子，同一個種子每次跑出一模一樣的結果（可重現）。
//   每種設定下跑好幾盤隨機合法對局（用 site/core.js 產生合法著法、每步隨機想 0～8 秒），最後一方認輸或雙方同意和棋；加一位觀眾。
//   斷言：紅黑兩支手機、觀眾、伺服器保留的對局狀態最後一字不差；棋步跟實際走的一步不多、一步不少；不會雙方都記勝；積分結果跟對局結果一致、各記一次。
//   不連正式或測試伺服器、不發任何真的訊息、不開瀏覽器。
// 用法：node --test xiangqi-lab/tools/test-net-chaos.js
"use strict";
const { assert, test, C, phone, seeded, J, core, world, noErrors, startGame, ROOT } = require("./net-harness.js");

/* 混沌設定：名稱、參數、跑幾盤 */
const CONFIGS = [
  ["10% 掉包＋10% 重複＋10% 亂序＋0～0.3 秒延遲", { drop: .10, dup: .10, reorder: .10, jitter: 300 }, 6],
  ["30% 掉包＋20% 重複＋20% 亂序＋0～0.8 秒延遲", { drop: .30, dup: .20, reorder: .20, jitter: 800 }, 6],
  ["不掉包、30% 重複＋50% 亂序＋0～2 秒延遲", { drop: 0, dup: .30, reorder: .50, jitter: 2000 }, 4],
  ["30% 掉包＋0～3 秒延遲（又慢又掉）", { drop: .30, dup: 0, reorder: .30, jitter: 3000 }, 4]
];
const SUMMARY = [];

/* 一盤：開局（混沌關著，邀請和接受先送到），開混沌，隨機合法地下 plies 步，最後認輸或和棋，等收斂 */
async function chaosGame(cfg, seed) {
  const { S, B } = world();
  const g = await startGame(S, B, { A: { seed: seed * 7 + 1 }, K: { seed: seed * 7 + 2 } }), { red, black, gid } = g;
  const W = phone(S, B, { id: "wwww9999", name: "觀眾", hash: "#/pvp", seed: seed * 7 + 3 }); W.net.start(); await S.run(1500); W.net.watch(gid); await S.run(1500);
  assert.ok(W.net.game(), "觀眾要拿到對局");
  B.setChaos({ ...cfg, seed });
  const rnd = seeded(seed * 31 + 5), plies = 16 + Math.floor(rnd() * 25);
  const st = { moves: [] }; C.stateRebuild(st);
  const made = [], t0 = S.now; let maxWait = 0;
  const seat = i => i % 2 ? black : red;
  for (let i = 0; i < plies; i++) {
    const P = seat(i), sd = i % 2 ? "b" : "r";
    const w0 = S.now, ok = await S.until(() => { const x = P.net.game(); return !!x && (!!x.result || x.moves.length === made.length) }, 15 * 60000);
    maxWait = Math.max(maxWait, S.now - w0);   /* 對方落子那一刻到這一方收到為止（純網路，不含想棋時間） */
    assert.ok(ok, `第 ${i + 1} 步：輪到的那一方 15 分鐘內要收到對方上一步`);
    if (P.net.game().result) break;
    await S.run(Math.round(rnd() * 8000));
    if (P.net.game().result || P.net.game().moves.length !== made.length) break;
    /* 不走會直接結束這盤的棋（將死、困斃、長將…），結束一律由下面的認輸／和棋來做 */
    const L = C.legal(st.board, st.turn).filter(([f, t]) => { const T = { moves: [] }; C.stateRebuild(T); for (const [a, b] of made) C.stateApply(T, a, b); C.stateApply(T, f, t); return !C.judgeState(T) && C.legal(T.board, T.turn).length > 0 });
    if (!L.length) break;
    const m = L[Math.floor(rnd() * L.length)];
    P.net.update(n => { if (P.net.tickMove(n, sd) === false) return; n.moves.push(m); n.draw = null });
    C.stateApply(st, m[0], m[1]); made.push(m);
  }
  /* 收尾：還沒結果的話，隨機一方認輸、或一方提和另一方同意 */
  let how = "timeout";
  if (!red.net.game().result && !black.net.game().result) {
    const sync = P => S.until(() => { const x = P.net.game(); return !!x && (!!x.result || x.moves.length === made.length) }, 15 * 60000);
    if (rnd() < .6) {
      const L = rnd() < .5 ? red : black, sd = L === red ? "r" : "b"; assert.ok(await sync(L));
      if (!L.net.game().result) { L.net.update(n => { n.result = { w: sd === "r" ? "b" : "r", why: (sd === "r" ? "紅方" : "黑方") + "認輸" }; n.draw = null }); how = "resign" }
    } else {
      const O = rnd() < .5 ? red : black, A = O === red ? black : red, so = O === red ? "r" : "b"; assert.ok(await sync(O));
      if (!O.net.game().result) {
        O.net.update(n => { n.draw = so });
        const seen = await S.until(() => { const x = A.net.game(); return !!x && (!!x.result || (x.moves.length === made.length && x.draw === so)) }, 15 * 60000);
        assert.ok(seen, "對方 15 分鐘內要看到提和");
        if (!A.net.game().result) { A.net.update(n => { n.result = { w: null, why: "雙方同意和棋" }; n.draw = null }); how = "draw" }
      }
    }
  }
  /* 等收斂（混沌一直開著） */
  const same = () => { const r = J(core(red.net.game())); return r.result && JSON.stringify(core(black.net.game())) === JSON.stringify(r) && JSON.stringify(core(W.net.game())) === JSON.stringify(r) && JSON.stringify(core(B.game(gid))) === JSON.stringify(r) };
  const tEnd = S.now, conv = await S.until(same, 20 * 60000), convAt = S.now - tEnd, dur = S.now - t0;
  await S.run(60000);
  return { S, B, red, black, W, gid, made, how, conv, convAt, dur, maxWait };
}

for (const [name, cfg, games] of CONFIGS) {
  const N = games * Math.max(1, +process.env.XQ_CHAOS_X || 1);   /* XQ_CHAOS_X＝加長版：每種設定跑幾倍的盤數（種子接著往下編） */
  test(`〔混沌網路〕${name}：${N} 盤隨機合法對局，雙方、觀眾、伺服器收斂到同一份，步數不重不漏、不會雙方都記勝`, async () => {
    const row = { name, games: N, ok: 0, plies: 0, drop: 0, dup: 0, reorder: 0, pubs: 0, maxConv: 0, ends: {} };
    for (let k = 0; k < N; k++) {
      const seed = 1000 + CONFIGS.findIndex(c => c[0] === name) * 100 + k;
      const t = await chaosGame(cfg, seed), tag = `（種子 ${seed}）`;
      if (!t.conv && process.env.XQ_CHAOS_DUMP) for (const l of t.B.log.filter(l => l.topic === `${ROOT}/g/${t.gid}/s`)) { const x = JSON.parse(l.payload); console.log(Math.round((l.at - t.B.log[0].at) / 1000) + "s", l.from, "rev", x.rev, x.moves.length + "步", x.result ? JSON.stringify(x.result) : "", x.sg ? x.sg.a + "@" + x.sg.r : "") }
      const brief = x => x ? `rev ${x.rev}・${x.moves.length} 步・${x.result ? JSON.stringify(x.result) : "未結束"}・提和 ${x.draw || "-"}` : "沒有";
      assert.ok(t.conv, "20 分鐘內要收斂" + tag + "：紅 " + brief(t.red.net.game()) + "；黑 " + brief(t.black.net.game()) + "；觀眾 " + brief(t.W.net.game()) + "；伺服器 " + brief(t.B.game(t.gid)) + "；實際走了 " + t.made.length + " 步（" + t.how + "）");
      const r = core(t.red.net.game());
      assert.ok(r.result, "要有結果" + tag);
      for (const [who, P] of [["黑方", t.black], ["觀眾", t.W]]) assert.deepEqual(core(P.net.game()), r, who + "跟紅方要是同一份" + tag);
      assert.deepEqual(core(t.B.game(t.gid)), r, "伺服器保留的也是這份" + tag);
      assert.deepEqual(r.moves, J(t.made), "棋步跟實際走的一樣：不重複、不漏" + tag);
      const rh = t.red.hist().map(h => h.res), bh = t.black.hist().map(h => h.res);
      assert.ok(!(rh.includes("w") && bh.includes("w")), "不能雙方都記勝" + tag);
      const want = r.result.abort ? [[], []] : r.result.w === "r" ? [["w"], ["l"]] : r.result.w === "b" ? [["l"], ["w"]] : [["d"], ["d"]];
      assert.deepEqual([rh, bh], want, "積分跟對局結果一致、各記一次" + tag);
      for (const P of [t.red, t.black, t.W]) assert.equal(P.net.signState(), "signed", "混沌下仍是簽名局" + tag);
      noErrors(t.S);
      row.ok++; row.plies += t.made.length; row.maxConv = Math.max(row.maxConv, t.convAt); row.sim = (row.sim || 0) + t.dur;
      row.maxWait = Math.max(row.maxWait || 0, t.maxWait); assert.ok(!t.red.net.game().result.timeout, "網路再亂，這幾盤都不該有人因為收不到棋而被判超時" + tag);
      row.sus = (row.sus || 0) + [t.red, t.black, t.W].reduce((a, P) => a + P.net.suspicious().length, 0);
      for (const k2 of ["drop", "dup", "reorder", "pubs"]) row[k2] += t.B.chaosN[k2];
      const e = t.red.net.game().result; const kind = e.timeout ? "timeout" : t.how; row.ends[kind] = (row.ends[kind] || 0) + 1;
    }
    SUMMARY.push(row);
  });
}

test("〔混沌網路〕彙總（寫進 architecture.md「容錯實測」用）", () => {
  if (process.env.XQ_CHAOS_REPORT) for (const r of SUMMARY) console.log(JSON.stringify(r));
  assert.ok(SUMMARY.length === CONFIGS.length, "每種設定都要跑完");
});
