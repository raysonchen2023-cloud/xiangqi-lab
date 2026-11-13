// 開局那一方（接到「接受」、自己建立對局的那支手機）第一步之前的「每步 3 分鐘」計時（11/13，Android 三方實測 P2 之後發現）。
//   以前開局那方沒記這一手從什麼時候起算（net.js 的 arr），turnAt 一直回「現在」：
//     自己是紅方（先走）＝每步剩餘一直停在 3:00，對方合理判紅方超時，這支手機用自己的鐘核對不收 → 兩邊分岔；
//     自己是黑方＝紅方一直不走，這支手機永遠判不了他超時。
//   現在開局就記（arr＝開局時間），自己是黑方時再照開局那份的回音往後挪（ackTurn 的 myStart）；只有自己開的盤才算，對方那支手機重抓保留訊息不會往後挪。
//   假 MQTT 伺服器＋假時鐘、vm 載入真正的 src/net.js；不連任何伺服器、不開瀏覽器。
// 用法：node --test xiangqi-lab/tools/test-net-start.js
"use strict";
const { assert, test, J, world, startGame, move, noErrors } = require("./net-harness.js");
const MIN = 60000;
/* 找一個讓開局的甲坐紅（或坐黑）的種子：紅黑是開局那支手機用 Math.random 抽的 */
async function as(color) {
  for (let sd = 1; sd <= 40; sd++) { const w = world(), g = await startGame(w.S, w.B, { A: { seed: sd } }); if ((g.red === g.A) === (color === "r")) return { ...w, ...g } }
  throw new Error("找不到讓甲坐" + color + "的種子");
}
const res = P => J(P.net.game().result);

test("開局的甲坐紅：第一步之前自己的每步剩餘照走（跟乙看到的一樣）；3 分鐘不走，乙判超時、甲自己也收（不分岔）", async () => {
  const { S, A, K } = await as("r");
  await S.run(MIN);
  const a = A.net.turnLeft(), k = K.net.turnLeft();
  assert.ok(a < 125000 && Math.abs(a - k) < 2000, "1 分鐘後：甲 " + a + "、乙 " + k + "（以前甲一直是 180000）");
  await S.run(2.5 * MIN);
  assert.ok(res(K) && res(K).timeout && res(K).w === "b", "乙判紅方超時");
  assert.deepEqual(res(A), res(K), "甲自己的鐘也同意");
  noErrors(S);
});

test("開局的甲坐黑：紅方（乙）一直不走，甲 3 分鐘判他超時（以前永遠判不了）；乙也收", async () => {
  const { S, A, K } = await as("b");
  await S.run(MIN); assert.ok(Math.abs(A.net.turnLeft() - K.net.turnLeft()) < 2000, "甲看到紅方的每步剩餘跟乙一樣");
  const t0 = S.now, ok = await S.until(() => !!res(A), 3 * MIN);
  assert.ok(ok, "甲判得出紅方超時"); assert.ok(S.now - t0 + MIN >= 3 * MIN && S.now - t0 + MIN < 3 * MIN + 10000, "大約 3 分鐘（" + Math.round((S.now - t0 + MIN) / 1000) + " 秒）");
  assert.equal(res(A).w, "b"); assert.ok(await S.until(() => !!res(K), 30000)); assert.deepEqual(res(K), res(A));
  noErrors(S);
});

test("對方那支手機（乙坐黑、不是開局的那方）重抓保留訊息時，紅方這一手的起算時間不會往後挪", async () => {
  const { S, A, K } = await as("r");
  await S.run(100000);   /* 中間會有好幾次「沒動靜就重抓」（每 20 秒），伺服器重送一樣的開局那份 */
  const a = A.net.turnLeft(), k = K.net.turnLeft();
  assert.ok(Math.abs(a - k) < 2000 && k < 85000, "甲 " + a + "、乙 " + k);
  noErrors(S);
});

test("再來一局（開的人坐黑）：新的一盤一步都還沒走，紅方 3 分鐘不走照樣判得出超時", async () => {
  const { S, A, K } = await as("r");
  move(A, "h2e2"); await S.run(2000); K.net.update(n => { n.result = { w: "r", why: "黑方認輸" }; n.draw = null }); await S.run(3000);
  A.net.update(n => { const t = n.red; n.red = n.black; n.black = t; n.moves = []; n.result = null; n.draw = null; n.id = "rm-start-1" }); await S.run(3000);   /* 甲開再來一局、改坐黑 */
  assert.equal(A.net.side(), "b"); assert.equal(K.net.side(), "r");
  await S.run(MIN); assert.ok(Math.abs(A.net.turnLeft() - K.net.turnLeft()) < 2000, "雙方看到的一樣");
  assert.ok(await S.until(() => !!res(A), 2.5 * MIN), "甲判得出紅方超時"); assert.equal(res(A).w, "b");
  noErrors(S);
});
