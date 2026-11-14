// 紅藍隊攻擊重現的 node:test 版（評比第 17 輪 F1：公開紅藍隊與名稱安全測試；案例在 redblue-cases.js，表格版是 redblue-run.js）
// 已修好的（blocked）：攻擊要被擋住，一般測試。
// 還沒修的（open）：斷言照「修好以後」寫，現在會失敗，用 node:test 的 todo 標記＝「預期失敗」：TAP 印 not ok … # TODO，不讓整批變紅，
//   testkinds.js 另外統計；哪天變成通過（ok … # TODO）＝漏洞可能修好了，testkinds.js 會當成失敗，提醒把那一案改成 blocked。
// 每一案的正常對照另外是一般測試：對照壞了一定會紅，不會被 todo 蓋掉。
// 不連網、不開瀏覽器、不需要千秋盃裁判台程式。用法：node --test xiangqi-lab/tools/test-redblue-public.js
"use strict";
const test = require("node:test"), assert = require("node:assert/strict");
const { CASES, runCase } = require("./redblue-cases.js");

for (const c of CASES) {
  const name = `${c.id}（${c.threat}）${c.title}`;
  if (c.expect === "blocked") {
    test(`${name}：攻擊要被擋住`, async () => { const r = await runCase(c); assert.equal(r.attackSucceeded, false, "攻擊成功（回歸）：" + JSON.stringify(r.detail)) });
  } else {
    test(`${name}：修好後攻擊要被擋住（還沒修，預期失敗）`, { todo: "還沒修：" + c.why }, async () => { const r = await runCase(c); assert.equal(r.attackSucceeded, false, "漏洞還在：" + JSON.stringify(r.detail)) });
  }
  test(`${c.id} 正常對照：${c.control}`, async () => { const r = await runCase(c); assert.equal(r.controlOk, true, "對照不正常：" + JSON.stringify(r.control)) });
}
test("案例表：每一案都有攻擊、對照、預期；還沒修的寫了為什麼", () => {
  for (const c of CASES) {
    assert.ok(c.id && c.title && c.attack && c.control && c.expected, c.id);
    assert.ok(c.expect === "blocked" || c.expect === "open", c.id);
    if (c.expect === "open") assert.ok(c.why && c.why.length > 10, c.id + " 要寫為什麼還沒修");
  }
  assert.ok(CASES.some(c => c.expect === "open"), "還有沒修的漏洞就要列出來");
});
