// 11/27 Android 12 P0-3D bhx-back「十字鍵移完，落子按不下去」（iMac Claude 1 查，#116）：
// ① 07bh 的 #bhxTurn（輪到你／Your move）會攔下 pointerdown／click，搖桿出來時原本固定 bottom:150px，壓住 ▲ 上緣；改成照搖桿實際上緣擺（bhxTurnPos），搖桿出現／收起時馬上重擺。
// ② 英文介面的十字鍵：中間「落子」翻成「Place a piece」在 54×44 的圓鈕裡溢出三行，提示「可以走這裡／移到要去的格子」沒翻；內建字典補上（外掛字典 data/i18n-en.json 不能蓋過內建）。
// 不開瀏覽器。用法 node --test xiangqi-lab/tools/test-bhx-pad-turn-1128.js
"use strict";
const assert = require("node:assert/strict"), test = require("node:test"), fs = require("fs"), path = require("path");
const rd = p => fs.readFileSync(path.join(__dirname, "..", "..", p), "utf8").replace(/\r\n/g, "\n");
const BH = rd("xiangqi-db/m/07bh-blackhole.js"), I18N = rd("xiangqi-db/m/07i18n.js");

function posFn(innerHeight) {
  const src = BH.slice(BH.indexOf("function bhxTurnPos("), BH.indexOf("function bhxFullSync("));
  return new Function("getComputedStyle", "innerHeight", src + "\nreturn bhxTurnPos;")((e) => ({ display: e._disp || "grid" }), innerHeight);
}
const tag = () => { const c = new Set(); return { style: { bottom: "" }, classList: { toggle: (k, on) => (on ? c.add(k) : c.delete(k)) }, _c: c } };

test("bhxTurnPos：搖桿出來時，標籤下緣放在搖桿上緣上面 8px（Android 12 量到搖桿上緣 593、視窗高 751 → bottom 166px），不再壓住 ▲", () => {
  const f = posFn(751), tn = tag(), gp = { _disp: "grid", getBoundingClientRect: () => ({ top: 593, height: 140 }) };
  f(tn, gp);
  assert.ok(tn._c.has("up")); assert.equal(tn.style.bottom, "166px");
  /* 標籤下緣＝751−166＝585，比 ▲ 上緣 593 高 8px */
  assert.equal(751 - parseInt(tn.style.bottom), 593 - 8);
});

test("bhxTurnPos：搖桿收起就拿掉 .up、bottom 還原；量不到（高 0、假 DOM）就照舊用 .up 的 150px", () => {
  const f = posFn(751), tn = tag();
  f(tn, { _disp: "grid", getBoundingClientRect: () => ({ top: 593, height: 140 }) });
  f(tn, { _disp: "none", getBoundingClientRect: () => ({ top: 0, height: 0 }) });
  assert.ok(!tn._c.has("up")); assert.equal(tn.style.bottom, "");
  f(tn, null); assert.ok(!tn._c.has("up")); assert.equal(tn.style.bottom, "");
  const t2 = tag(); f(t2, { _disp: "grid", getBoundingClientRect: () => ({ top: 0, height: 0 }) });
  assert.ok(t2._c.has("up"), "還是有 .up（CSS 的 150px 當退路）"); assert.equal(t2.style.bottom, "");
});

test("bhxFullSync 用 bhxTurnPos 擺標籤，並在搖桿 style 變的時候重擺（MutationObserver），不等下一次同步", () => {
  const i = BH.indexOf("function bhxFullSync("), body = BH.slice(i, BH.indexOf("\nfunction ", i + 10));
  assert.match(body, /bhxTurnPos\(tn,gp\);if\(gp&&!gp\._bhxTo&&typeof MutationObserver==="function"\)\{gp\._bhxTo=new MutationObserver\(\(\)=>\{const t=document\.getElementById\("bhxTurn"\);if\(t\)bhxTurnPos\(t,gp\)\}\);gp\._bhxTo\.observe\(gp,\{attributes:true,attributeFilter:\["style"\]\}\)\}/);
  assert.doesNotMatch(body, /tn\.classList\.toggle\("up",!!gp&&getComputedStyle\(gp\)\.display!=="none"\)/, "舊的只切 class、不量位置的寫法拿掉了");
});

test("英文字典：十字鍵的「落子」用短字 Move（54×44 圓鈕放得下），提示三句都有英文；放在內建字典（外掛字典蓋不過）", () => {
  const i = I18N.indexOf("const I18N_EN={"), j = I18N.indexOf("\n};", i), D = I18N.slice(i, j);
  for (const [zh, en] of [["落子", "Move"], ["可以走這裡", "You can move here"], ["移到要去的格子", "Move to your target"], ["這裡不能走", "Can't move here"]])
    assert.ok(D.includes(`"${zh}":"${en.replace(/'/g, "\\'")}"`) || D.includes(`"${zh}":"${en}"`), zh + " → " + en);
  assert.equal((D.match(/"落子":/g) || []).length, 1, "落子只登記一次");
});
